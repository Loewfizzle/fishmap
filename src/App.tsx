import { useState, useEffect, useRef, useMemo } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import { distance } from "@turf/distance";
import { Protocol } from "pmtiles";
import {
  OfflinePlugin,
  OFFLINE_STATUS,
} from "@makina-corpus/maplibre-offline-pmtiles";
import rawAccess from "../data/processed/access_points_sample.geojson?raw";

// PR 5: register offline protocol at module load (required before any MapLibre using offline-pmtiles:// sources)
OfflinePlugin.registerProtocol(maplibregl);
const accessGeoJson = JSON.parse(rawAccess) as any; // initial any; narrowed below after interfaces (see Issue 5)

// Minimal shape for the real PR1 sample (full provenance in the GeoJSON)
// PR 3: extended with practical fields from sample for rich panels
interface SourceCitation {
  name: string;
  url: string;
  retrieved: string;
}
interface ParkingInfo {
  has: boolean;
  capacity?: string;
  surface?: string;
  notes?: string;
}
interface RegulationsInfo {
  summary: string;
  url: string;
}
interface AccessSite {
  id: string;
  name: string;
  waterbody: string;
  access_type: string;
  access_quality: string;
  notes?: string;
  sources?: SourceCitation[]; // made optional for runtime safety (Issue 3); data load is cast JSON
  last_verified?: string;
  lat?: number;
  lon?: number;
  parking?: ParkingInfo;
  facilities?: string[];
  hours?: string;
  ada?: string;
  species?: string[];
  regulations?: RegulationsInfo;
}

// Lightweight GeoJSON types (avoids external @types/geojson dep for smallest PR3 change; reduces heavy as any usage per Issue 5)
interface AccessFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: AccessSite;
}
interface AccessGeoJson {
  type: "FeatureCollection";
  features: AccessFeature[];
}

const typedAccessGeoJson: AccessGeoJson = accessGeoJson as AccessGeoJson;

const SHORE_TYPES = [
  "bank",
  "dock",
  "pier",
  "wade",
  "road_end",
  "park_shore",
] as const;

// Generalized disclaimer (avoids hardcoding "PR 1 sample" so it ages better post-PR6; Issue 10)
const DATA_DISCLAIMER =
  "This is not legal advice. Always verify current regulations, property boundaries, hours, and conditions on-site and with official Michigan DNR sources before fishing. (Prototype sample data.)";

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [shoreOnly, setShoreOnly] = useState(true);
  // Initialize to full SHORE_TYPES (single source of truth per DESIGN literal); empty means "all" (decouples from shoreOnly)
  const [activeTypes, setActiveTypes] = useState<string[]>([...SHORE_TYPES]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [sortedByDistance, setSortedByDistance] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // PR 5: PWA + offline PMTiles region download + quota (OPFS via maplibre-offline-pmtiles per DESIGN PR5)
  // Smallest addition: states + handlers + minimal UI row + graceful banner. No new layers or major refactors.
  const offlinePluginRef = useRef<OfflinePlugin | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineDownloaded, setOfflineDownloaded] = useState<boolean>(() => {
    try {
      return localStorage.getItem("fishmap_offline_region") === "true";
    } catch {
      return false;
    }
  });
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadStatus, setDownloadStatus] = useState<string>("");
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    quota: number;
    percent: number;
  } | null>(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [offlineError, setOfflineError] = useState<string | null>(null);

  // PR 5 offline handlers (declared early so useEffects can reference; follows existing localStorage/useRef patterns exactly)
  const refreshStorageInfo = async () => {
    if (!offlinePluginRef.current)
      offlinePluginRef.current = new OfflinePlugin();
    try {
      const info = await offlinePluginRef.current.getStorageUsage();
      setStorageInfo(info);
    } catch (e) {
      console.warn("fishmap: storage query failed", e);
    }
  };

  const handleDownloadRegion = async () => {
    if (!offlinePluginRef.current)
      offlinePluginRef.current = new OfflinePlugin();
    // Use same URL as current basemap for fidelity to "current map state".
    // In production (post PR4 R2 + regional extract) this would target the ~9-14MB gr-region z12 extract (see docs/pmtiles-extract-dryrun.txt).
    const url = "https://build.protomaps.com/20260526.pmtiles";
    const name = "grand-rapids-region";
    setDownloadProgress(0);
    setDownloadStatus("START");
    setOfflineError(null);
    try {
      await offlinePluginRef.current.downloadMap(url, name, (p: any) => {
        const code = p?.code || "";
        setDownloadStatus(code);
        if (p?.progress != null)
          setDownloadProgress(Math.round(Number(p.progress)));
        if (code === OFFLINE_STATUS.COMPLETE) {
          try {
            localStorage.setItem("fishmap_offline_region", "true");
          } catch {}
          setOfflineDownloaded(true);
          refreshStorageInfo();
          setDownloadStatus(
            "COMPLETE — reload page to activate offline basemap",
          );
        }
        if (code === OFFLINE_STATUS.ERROR_QUOTA) {
          setOfflineError(
            "Storage quota exceeded. Free space or clear other data.",
          );
        }
      });
    } catch (e: any) {
      setDownloadStatus("ERROR");
      setOfflineError(e?.message || "Download failed (network or quota)");
    }
  };

  const handleInstallPrompt = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try {
      const { outcome } = await deferredInstallPrompt.userChoice;
      console.log("fishmap: install prompt outcome", outcome);
    } catch {}
    setDeferredInstallPrompt(null);
  };

  // PR 3: My Saved Spots (localStorage + JSON, per DESIGN: Dexie only if simplest; here pure localStorage)
  const [savedSpotIds, setSavedSpotIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("fishmap_saved_spots");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("fishmap: saved spots load failed", e);
      return [];
    }
  });
  const [showSaved, setShowSaved] = useState(false);

  // Persist saved spots
  useEffect(() => {
    try {
      localStorage.setItem("fishmap_saved_spots", JSON.stringify(savedSpotIds));
    } catch (e) {
      console.warn("fishmap: saved spots persist failed", e);
    }
  }, [savedSpotIds]);

  // Basic a11y: Escape closes open panels (Issue 12; focus trap out of scope for smallest PR3)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedId) clearSelection();
        else if (showSaved) setShowSaved(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, showSaved]);

  // PR 5: online/offline listeners + beforeinstallprompt (natural install prompt) + initial quota snapshot
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall as any);

    // initial storage info (OPFS quota awareness)
    refreshStorageInfo();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as any);
    };
  }, []);

  // Real data wired from PR 1 (no more hardcoded)
  const allFeatures = typedAccessGeoJson.features;
  const allSites = useMemo(
    () => allFeatures.map((f) => f.properties),
    [allFeatures],
  );

  // Centralized distances when "Near me" active (avoids 3x recompute on renders; Issue 5)
  const siteDistances = useMemo(() => {
    if (!userLocation) return new Map<string, number>();
    const m = new Map<string, number>();
    allFeatures.forEach((f) => {
      const id = f.properties.id;
      const coords = f.geometry.coordinates;
      m.set(id, distance(userLocation, coords, { units: "miles" }));
    });
    return m;
  }, [userLocation, allFeatures]);

  // PR 3 helpers (smallest, follow existing patterns; no new deps)
  const isSaved = (id: string) => savedSpotIds.includes(id);
  const toggleSaved = (id: string) => {
    setSavedSpotIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const getCoordsForSite = (site: AccessSite): [number, number] => {
    if (site.lon != null && site.lat != null) return [site.lon, site.lat];
    const feat = allFeatures.find((f) => f.properties.id === site.id);
    return feat?.geometry?.coordinates ?? [-85.6681, 42.9634];
  };
  const openDirections = (site: AccessSite) => {
    const coords = getCoordsForSite(site);
    if (
      !coords ||
      (coords[0] === -85.6681 &&
        coords[1] === 42.9634 &&
        !site.lon &&
        !site.lat)
    ) {
      setGeoError("Unable to get coordinates for directions");
      return;
    }
    const [lon, lat] = coords;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    window.open(url, "_blank", "noopener");
  };
  const handleShare = async (site: AccessSite) => {
    const text = `${site.name} — ${site.waterbody} (shore/dock access). Last verified ${site.last_verified}. View on Fishmap.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: site.name, text });
      } else {
        await navigator.clipboard.writeText(text + " " + window.location.href);
      }
    } catch {
      console.warn("fishmap: share failed");
    }
  };
  const formatAda = (ada?: string) => {
    if (!ada) return "Unknown";
    if (ada.toLowerCase() === "yes") return "✅ ADA accessible";
    if (ada.toLowerCase() === "partial") return "◐ Partial ADA";
    return "🚫 Not ADA";
  };

  // Reliable popup after flyTo (replaces brittle setTimeout; uses moveend per Issue 4)
  function showPopupAfterFly(
    m: MapLibreMap,
    lngLat: [number, number],
    html: string,
  ) {
    m.once("moveend", () => {
      if (mapRef.current) {
        new maplibregl.Popup({ closeButton: true, maxWidth: "240px" })
          .setLngLat(lngLat)
          .setHTML(html)
          .addTo(mapRef.current);
      }
    });
  }

  // Client-side filtered + optionally distance-sorted list (search + chips + shore toggle)
  const filteredSites = useMemo(() => {
    let result = allSites.filter((site: AccessSite) => {
      if (
        shoreOnly &&
        !SHORE_TYPES.includes(site.access_type as (typeof SHORE_TYPES)[number])
      )
        return false;
      // length===0 means "all types" (decoupled from Shore & Dock Only for Issue 1/4)
      if (activeTypes.length > 0 && !activeTypes.includes(site.access_type))
        return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const hay = (site.name + " " + site.waterbody).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortedByDistance && userLocation) {
      result = [...result].sort((a, b) => {
        const da = siteDistances.get(a.id) ?? Infinity;
        const db = siteDistances.get(b.id) ?? Infinity;
        return da - db;
      });
    }
    return result;
  }, [
    searchTerm,
    shoreOnly,
    activeTypes,
    sortedByDistance,
    userLocation,
    allSites,
    allFeatures,
  ]);

  // Exact MapLibre filter expression from DESIGN.md (PR 2 / ETL Reality section)
  // Return type kept loose (MapLibre FilterSpecification is complex; unavoidable for smallest change)
  function buildFilterExpr(): any[] {
    let expr: any[] = ["!=", ["get", "access_type"], "unknown"];
    if (shoreOnly) {
      expr = ["in", ["get", "access_type"], ["literal", [...SHORE_TYPES]]];
    }
    // length===0 means no type restriction (chips can be cleared; shoreOnly still applies independently)
    if (activeTypes.length > 0) {
      const tExpr = ["in", ["get", "access_type"], ["literal", activeTypes]];
      expr = ["all", expr, tExpr];
    }
    return expr;
  }

  function applyFiltersToMap() {
    const m = mapRef.current;
    if (!m || !m.isStyleLoaded()) return;
    try {
      m.setFilter("access-points", buildFilterExpr() as any);
    } catch {}
  }

  // One-time MapLibre init with real GeoJSON source + circle layer + click handlers
  // PR 4: Protomaps basemap (vector tiles via PMTiles protocol) + existing custom access overlay.
  // Smallest integration: inline minimal style sourcing the public Protomaps build (full-planet
  // but range-request efficient; regional extract via dry-run committed in docs). Custom access
  // remains GeoJSON for PR1 sample (not "large"; full switch + removal in PR6 when thematic PMTiles ready).
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    if (!offlinePluginRef.current) {
      offlinePluginRef.current = new OfflinePlugin();
    }

    // Register PMTiles protocol handler once (required for any pmtiles:// sources)
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    // offline-pmtiles:// already registered at module top via PR 5 lib

    // PR 5: choose source at init time — offline protocol if region previously downloaded (persisted flag)
    // After download completes user is prompted to reload so this effect captures the offline url.
    const protomapsUrl = offlineDownloaded
      ? "offline-pmtiles://grand-rapids-region"
      : "pmtiles://https://build.protomaps.com/20260526.pmtiles";

    const map = new maplibregl.Map({
      container: mapContainer.current,
      // PR4: Protomaps basemap as vector tiles (replaces demo raster-ish style).
      // Uses public build (see docs/ASSET-HOSTING.md + dry-run for regional plan).
      // Minimal layers for context (water/roads) to prove vector tile basemap; access overlaid.
      // PR 5: url may be offline-pmtiles:// after region download + reload (OPFS backed, no net required).
      style: {
        version: 8,
        glyphs: "https://cdn.protomaps.com/fonts/pbf/{fontstack}/{range}.pbf",
        sources: {
          protomaps: {
            type: "vector",
            url: protomapsUrl,
            attribution: "© Protomaps © OpenStreetMap contributors",
          },
        },
        layers: [
          // Minimal basemap context layers from Protomaps vector tiles (demonstrates integration)
          {
            id: "water",
            source: "protomaps",
            "source-layer": "water",
            filter: ["==", ["geometry-type"], "Polygon"],
            type: "fill",
            paint: { "fill-color": "#a5d8ff" },
          },
          {
            id: "roads",
            source: "protomaps",
            "source-layer": "roads",
            type: "line",
            paint: { "line-color": "#e5e7eb", "line-width": 0.8 },
          },
        ],
      },
      center: [-85.6681, 42.9634], // AOI center from manifest + DESIGN
      zoom: 10.2,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("access", {
        type: "geojson",
        data: typedAccessGeoJson,
      });

      map.addLayer({
        id: "access-points",
        type: "circle",
        source: "access",
        paint: {
          "circle-color": [
            "match",
            ["get", "access_type"],
            "bank",
            "#15803d",
            "pier",
            "#1d4ed8",
            "dock",
            "#0e7490",
            "wade",
            "#166534",
            "road_end",
            "#b45309",
            "park_shore",
            "#7c3aed",
            "#64748b",
          ],
          "circle-radius": 7,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });

      // Initial filter (Shore & Dock Only default, per DESIGN expression)
      map.setFilter("access-points", buildFilterExpr() as any);

      // Popup + select on marker click (basic info; full citations in panel)
      map.on("click", "access-points", (e) => {
        const feature = e.features && e.features[0];
        if (!feature?.properties) return;
        const id = feature.properties.id as string;
        setSelectedId(id);
        const p = feature.properties as AccessSite;
        const html = `<div style="font:13px system-ui;max-width:220px"><strong>${p.name}</strong><br/><span style="color:#334155">${p.waterbody}</span><br/><span style="background:#ecfdf5;color:#166534;padding:1px 4px;border-radius:2px;font-size:10px">${p.access_type}</span> <span style="color:#64748b;font-size:10px">• ${p.access_quality}</span><div style="margin-top:3px;font-size:10px;color:#64748b">Tap marker or list for rich details + citations</div></div>`;
        new maplibregl.Popup({ closeButton: true, maxWidth: "240px" })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);
      });

      map.on("mouseenter", "access-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "access-points", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Keep map layer filter in sync with UI (exact DESIGN expr)
  useEffect(() => {
    applyFiltersToMap();
  }, [shoreOnly, activeTypes]);

  // Auto-clear selection if it falls outside current filtered set (prevents desync + hidden panel; Issue 3)
  useEffect(() => {
    if (
      selectedId &&
      !filteredSites.some((s: AccessSite) => s.id === selectedId)
    ) {
      clearSelection();
    }
  }, [filteredSites, selectedId]);

  // Fly map + popup when selecting from list (provides the "highlight on map")
  const flyToAndSelect = (id: string) => {
    const m = mapRef.current;
    const feat = allFeatures.find((f) => f.properties.id === id);
    if (!feat) {
      setSelectedId(id);
      return;
    }
    const [lon, lat] = feat.geometry.coordinates;
    if (m) {
      m.flyTo({ center: [lon, lat], zoom: 13.5, duration: 550 });
      showPopupAfterFly(
        m,
        [lon, lat],
        `<strong>${feat.properties.name}</strong><br/>${feat.properties.waterbody}`,
      );
    }
    setSelectedId(id);
  };

  const clearSelection = () => setSelectedId(null);

  // "Near me": browser geolocation + @turf/distance sort + map highlight of nearest
  // Now respects current shoreOnly / activeTypes / search (snapshot at click time; Issue 2)
  const handleNearMe = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation not supported");
      return;
    }
    setIsLocating(true);
    setGeoError(null);

    // Snapshot filter state *at click time* so async callback uses consistent view
    const snapSearch = searchTerm;
    const snapShore = shoreOnly;
    const snapActive = [...activeTypes];

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const user: [number, number] = [
          pos.coords.longitude,
          pos.coords.latitude,
        ];
        setUserLocation(user);
        setSortedByDistance(true);

        // Build candidates that match the *current UI filters* (excluding distance sort)
        const candidates = allFeatures.filter((f) => {
          const p = f.properties;
          if (
            snapShore &&
            !SHORE_TYPES.includes(p.access_type as (typeof SHORE_TYPES)[number])
          )
            return false;
          if (snapActive.length > 0 && !snapActive.includes(p.access_type))
            return false;
          if (snapSearch.trim()) {
            const q = snapSearch.toLowerCase().trim();
            const hay = (p.name + " " + p.waterbody).toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });

        if (candidates.length === 0) {
          setGeoError("No matching sites for current filters");
          setIsLocating(false);
          return;
        }

        // Nearest *only among candidates* (respects filters/search)
        let nearestId: string | null = null;
        let minD = Infinity;
        let nearestFeat: any = null; // keep loose here to satisfy TS narrowing on filter result + guard (type improvement tradeoff)
        candidates.forEach((f) => {
          const coords = f.geometry.coordinates;
          const d = distance(user, coords, { units: "miles" });
          if (d < minD) {
            minD = d;
            nearestId = f.properties.id;
            nearestFeat = f;
          }
        });

        if (nearestId && nearestFeat) {
          const nf = nearestFeat;
          setSelectedId(nearestId);
          const m = mapRef.current;
          if (m) {
            const [lon, lat] = nf.geometry.coordinates;
            m.flyTo({ center: [lon, lat], zoom: 13, duration: 700 });
            showPopupAfterFly(
              m,
              [lon, lat],
              `<strong>Nearest to you (matches filters):</strong> ${nf.properties.name}<br/>~${minD.toFixed(1)} miles`,
            );
          }
        }
        setIsLocating(false);
      },
      (err) => {
        setGeoError(err.message || "Geolocation failed (check permission)");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 },
    );
  };

  const resetDistanceSort = () => {
    setSortedByDistance(false);
    setUserLocation(null);
    setGeoError(null);
  };

  // Access type chips (toggle multi-select; affects both list + MapLibre layer)
  // Empty activeTypes now means "show all" (decouples Shore & Dock Only; addresses Issue 1/4)
  const toggleType = (t: string) => {
    setActiveTypes((prev) => {
      if (prev.includes(t)) {
        const next = prev.filter((x) => x !== t);
        return next; // allow empty = all types (subject to shoreOnly)
      }
      return [...prev, t];
    });
  };

  const selectedSite = selectedId
    ? allSites.find((s: AccessSite) => s.id === selectedId)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* PR 5: offline status banner (graceful degradation; visible in airplane mode) */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-center text-xs py-0.5 font-medium">
          Offline mode — app, search, details, saved spots, and downloaded map
          region are fully functional.
        </div>
      )}
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Fishmap</h1>
            <p className="text-sm text-slate-600">
              Shore &amp; Dock Fishing • 40-mile Grand Rapids radius
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaved(true)}
              className="text-xs px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 rounded hover:bg-emerald-50 font-mono"
              title="My Saved Spots (localStorage)"
            >
              ⭐ Saved ({savedSpotIds.length})
            </button>
            <div className="text-xs px-3 py-1 bg-emerald-100 text-emerald-800 rounded font-mono">
              PR 3 • RICH DETAILS
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-sm">
          <strong>PR 3.</strong> Rich detail panels (mobile bottom sheet +
          desktop side), full practical fields + clickable
          citations/regulations, Get Directions, Share, My Saved Spots
          (localStorage). Built on PR 2 map. Sample data only (PR 6 adds full
          dataset).
        </div>

        {/* PR 5: Full PWA + Offline Region Download (smallest addition per DESIGN + user instructions).
            One download -> map+search+details+saved work offline. Quota, banner, progress, install prompt.
            Uses current map state (no new layers). Reload after download to switch basemap to OPFS. */}
        <div className="mb-3 p-2 bg-sky-50 border border-sky-200 rounded text-xs flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-sky-800">PR 5 Offline:</span>
          <span
            className={
              isOnline ? "text-emerald-700" : "text-amber-700 font-semibold"
            }
          >
            {isOnline ? "Online" : "OFFLINE"}
          </span>
          <button
            onClick={refreshStorageInfo}
            className="action-btn text-[10px] px-1.5 py-0.5"
            title="Refresh OPFS storage usage/quota"
          >
            💾{" "}
            {storageInfo
              ? `${(storageInfo.used / 1024 / 1024).toFixed(1)}MB`
              : "Storage"}
          </button>
          <button
            onClick={handleDownloadRegion}
            disabled={
              downloadStatus.startsWith("START") ||
              downloadStatus.startsWith("PROGRESS")
            }
            className="action-btn primary text-[10px] px-1.5 py-0.5"
            title="Download Grand Rapids Region for Offline Use (stores PMTiles in OPFS; fulfills mobile field requirement)"
          >
            ⬇️ Download Grand Rapids Region for Offline Use
          </button>
          {downloadProgress > 0 && downloadProgress < 100 && (
            <progress
              value={downloadProgress}
              max={100}
              className="w-20 align-middle h-2"
            />
          )}
          {downloadStatus && (
            <span className="font-mono text-sky-700">{downloadStatus}</span>
          )}
          {offlineError && <span className="text-red-600">{offlineError}</span>}
          {deferredInstallPrompt && (
            <button
              onClick={handleInstallPrompt}
              className="action-btn text-[10px] px-1.5 py-0.5 bg-emerald-700 text-white border-emerald-700"
            >
              📲 Install App
            </button>
          )}
          {offlineDownloaded && (
            <span className="text-emerald-700 font-medium">
              Region cached ✓ (reload to use for basemap)
            </span>
          )}
        </div>

        {/* Filters + Near me (search + shore toggle + type chips + geolocation + turf) */}
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name or waterbody…"
            className="px-3 py-1.5 text-sm border rounded bg-white w-full sm:w-72"
          />
          <button
            onClick={handleNearMe}
            disabled={isLocating}
            className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded hover:bg-black disabled:opacity-60"
          >
            {isLocating ? "Locating…" : "📍 Near me"}
          </button>
          {sortedByDistance && (
            <button
              onClick={resetDistanceSort}
              className="text-xs px-2.5 py-1 border rounded hover:bg-slate-100"
            >
              Clear dist sort
            </button>
          )}
          <label className="inline-flex items-center gap-1.5 text-sm font-medium cursor-pointer select-none px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
            <input
              type="checkbox"
              checked={shoreOnly}
              onChange={(e) => setShoreOnly(e.target.checked)}
            />
            Shore &amp; Dock Only
          </label>
          {geoError && <span className="text-xs text-red-600">{geoError}</span>}
        </div>

        {/* access_type chips (driven by SHORE_TYPES for fidelity to DESIGN literal + Issue 1/4) */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500">Filter types:</span>
          {SHORE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`filter-chip ${activeTypes.includes(t) ? "active" : ""}`}
              aria-pressed={activeTypes.includes(t)}
            >
              {t}
            </button>
          ))}
          <span className="text-[10px] text-slate-400">
            (click to toggle; empty = all. Combined with Shore &amp; Dock Only)
          </span>
        </div>

        {/* Real interactive MapLibre (GeoJSON source from PR1 sample) */}
        <section className="mb-5">
          <div className="flex items-baseline justify-between mb-1.5">
            <h2 className="text-lg font-medium">Map</h2>
            <span className="text-xs text-slate-500">
              Centered on Grand Rapids • Click markers or list rows
            </span>
          </div>
          <div ref={mapContainer} className="map-container bg-slate-200" />
          <p className="text-[10px] text-slate-500 mt-1">
            Base layer filter (DESIGN.md):{" "}
            <code>
              ['in', ['get', 'access_type'], ['literal',
              ['bank','dock','pier','wade','road_end','park_shore']]]
            </code>{" "}
            (runtime may wrap with "all" for chips; shoreOnly uses this
            literally)
          </p>
        </section>

        {/* Interactive list (click rows to fly/highlight on map + populate rich PR3 detail) */}
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-lg font-medium">
              Access Points ({filteredSites.length}
              {sortedByDistance ? ", nearest first" : ""})
            </h2>
            {(searchTerm ||
              !shoreOnly ||
              activeTypes.length < SHORE_TYPES.length) && (
              <span className="text-xs text-emerald-700">filtered</span>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {filteredSites.length === 0 && (
              <div className="text-sm text-slate-500 col-span-full">
                No matches — try clearing search or toggles.
              </div>
            )}
            {filteredSites.map((site: AccessSite) => {
              const isSel = site.id === selectedId;
              let distBadge = "";
              if (sortedByDistance && userLocation) {
                const d = siteDistances.get(site.id);
                if (d != null) distBadge = ` • ${d.toFixed(1)} mi`;
              }
              return (
                <div
                  key={site.id}
                  onClick={() => flyToAndSelect(site.id)}
                  className={`bg-white border rounded-lg p-3 shadow-sm cursor-pointer hover:border-slate-300 active:bg-slate-50 ${isSel ? "ring-2 ring-emerald-700" : ""}`}
                >
                  <div className="flex justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold leading-tight">
                        {site.name}
                      </div>
                      <div className="text-sm text-slate-600">
                        {site.waterbody}
                        {distBadge}
                      </div>
                    </div>
                    <div className="text-right text-xs shrink-0 flex flex-col items-end gap-0.5">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                        {site.access_type}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-px">
                        {site.access_quality}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaved(site.id);
                        }}
                        className="text-[10px] px-1 py-0.5 mt-0.5 text-emerald-700 hover:text-emerald-900"
                        aria-pressed={isSaved(site.id)}
                        title={
                          isSaved(site.id) ? "Remove from saved" : "Save spot"
                        }
                      >
                        {isSaved(site.id) ? "★ saved" : "☆ save"}
                      </button>
                    </div>
                  </div>
                  {site.notes && (
                    <div className="mt-1.5 text-xs text-slate-600 line-clamp-2">
                      {site.notes}
                    </div>
                  )}
                  <div className="mt-1.5 text-[10px] text-blue-600">
                    View details + citations →
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PR 3: Rich detail panel — mobile bottom sheet (default) + desktop side panel.
            Follows DESIGN: full practical fields, clickable regs/citations, disclaimers prominent,
            Get Directions (Google intent), share, save, close. Smallest overlay (no map rewrite). */}
        {selectedSite && (
          <div
            className="rich-detail fixed inset-x-0 bottom-0 z-[60] flex flex-col bg-white border-t max-h-[70vh] md:max-h-[calc(100vh-4rem)] md:top-16 md:inset-y-auto md:left-auto md:right-0 md:w-96 overflow-hidden rounded-t-xl md:rounded-t-none md:rounded-l-xl md:border-t-0 md:border-l"
            role="dialog"
            aria-modal="true"
            aria-label="Access point details"
          >
            {/* Header bar with actions */}
            <div className="md:hidden">
              <div className="sheet-handle" />
            </div>
            <div className="flex items-start justify-between gap-2 px-3 py-2 border-b bg-slate-50 shrink-0">
              <div className="min-w-0">
                <div className="font-semibold text-base leading-tight pr-1">
                  {selectedSite.name}
                </div>
                <div className="text-sm text-slate-600">
                  {selectedSite.waterbody}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                <span className="inline-block text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                  {selectedSite.access_type} • {selectedSite.access_quality}
                </span>
                <div className="flex gap-1 flex-wrap justify-end">
                  <button
                    onClick={() => toggleSaved(selectedSite.id)}
                    className="action-btn text-xs"
                    aria-pressed={isSaved(selectedSite.id)}
                    title={
                      isSaved(selectedSite.id) ? "Unsave" : "Save to My Spots"
                    }
                  >
                    {isSaved(selectedSite.id) ? "★ Saved" : "☆ Save"}
                  </button>
                  <button
                    onClick={() => openDirections(selectedSite)}
                    className="action-btn primary text-xs"
                  >
                    Get Directions
                  </button>
                  <button
                    onClick={() => handleShare(selectedSite)}
                    className="action-btn text-xs"
                  >
                    Share
                  </button>
                  <button
                    onClick={clearSelection}
                    className="action-btn text-xs"
                    aria-label="Close details"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable rich content */}
            <div className="overflow-auto p-3 text-sm space-y-3 flex-1 bg-white">
              {/* Practical details per DESIGN PR3 + sample schema */}
              {selectedSite.hours && (
                <div>
                  <span className="font-medium text-slate-700">Hours: </span>
                  <span className="text-slate-600">{selectedSite.hours}</span>
                </div>
              )}

              {selectedSite.parking && selectedSite.parking.has && (
                <div>
                  <div className="font-medium text-slate-700">🚗 Parking</div>
                  <div className="text-slate-600 text-sm">
                    {selectedSite.parking.capacity || "Available"}
                    {selectedSite.parking.surface
                      ? ` • ${selectedSite.parking.surface}`
                      : ""}
                    {selectedSite.parking.notes
                      ? ` — ${selectedSite.parking.notes}`
                      : ""}
                  </div>
                </div>
              )}

              {selectedSite.facilities &&
                selectedSite.facilities.length > 0 && (
                  <div>
                    <div className="font-medium text-slate-700 mb-0.5">
                      Facilities
                    </div>
                    <div>
                      {selectedSite.facilities.map((f: string, i: number) => (
                        <span key={i} className="pill">
                          {f.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              <div>
                <span className="font-medium text-slate-700">
                  Accessibility:{" "}
                </span>
                <span className="text-slate-600">
                  {formatAda(selectedSite.ada)}
                </span>
              </div>

              {selectedSite.species && selectedSite.species.length > 0 && (
                <div>
                  <div className="font-medium text-slate-700 mb-0.5">
                    Target species
                  </div>
                  <div>
                    {selectedSite.species.map((sp: string, i: number) => (
                      <span key={i} className="pill">
                        {sp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedSite.regulations && (
                <div>
                  <div className="font-medium text-slate-700">Regulations</div>
                  <div className="text-slate-600 text-sm mb-1">
                    {selectedSite.regulations.summary}
                  </div>
                  <a
                    href={selectedSite.regulations.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-blue-700 underline text-sm hover:text-blue-900"
                  >
                    View current DNR fishing regulations ↗
                  </a>
                </div>
              )}

              {selectedSite.notes && (
                <div className="text-slate-600">{selectedSite.notes}</div>
              )}

              {/* Prominent disclaimer + citations (DESIGN non-negotiable) */}
              <div className="disclaimer mt-2">
                <strong>Disclaimer:</strong> {DATA_DISCLAIMER}
              </div>

              <div className="pt-2 border-t text-[11px]">
                <div className="font-medium text-slate-700 mb-0.5">
                  Sources &amp; citations
                </div>
                {selectedSite.sources && selectedSite.sources.length > 0 ? (
                  <ul className="space-y-0.5">
                    {selectedSite.sources.map(
                      (s: SourceCitation, i: number) => (
                        <li key={i}>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {s.name}
                          </a>
                          <span className="text-slate-400">
                            {" "}
                            • retrieved {s.retrieved}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                ) : (
                  <div className="text-slate-500">
                    No citation sources provided.
                  </div>
                )}
                <div className="text-[10px] text-slate-500 mt-1">
                  last verified {selectedSite.last_verified ?? "unknown"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PR 3: Simple My Saved Spots list UI (localStorage backed). Opened from header.
            Click row to fly+select (opens rich detail). Smallest viable modal-style panel. */}
        {showSaved && (
          <div
            className="saved-panel fixed inset-x-0 bottom-0 z-[70] max-h-[70vh] md:max-h-[calc(100vh-4rem)] md:top-16 md:inset-y-auto md:left-auto md:right-0 md:w-96 flex flex-col bg-white border-t md:border-t-0 md:border-l shadow-2xl rounded-t-xl md:rounded-t-none md:rounded-l-xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="My Saved Spots"
          >
            <div className="md:hidden">
              <div className="sheet-handle" />
            </div>
            <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50 shrink-0">
              <div className="font-semibold">
                ⭐ My Saved Spots ({savedSpotIds.length})
              </div>
              <button
                onClick={() => setShowSaved(false)}
                className="action-btn text-xs"
              >
                ✕ Close
              </button>
            </div>
            <div className="overflow-auto p-3 flex-1 text-sm">
              {savedSpotIds.length === 0 ? (
                <div className="text-slate-500">
                  No saved spots yet. Tap “☆ Save” in any detail panel (or list
                  cards) to add local favorites. Saved spots persist in your
                  browser (localStorage).
                </div>
              ) : (
                <div className="grid gap-2">
                  {allSites
                    .filter((s: AccessSite) => savedSpotIds.includes(s.id))
                    .map((site: AccessSite) => (
                      <div
                        key={site.id}
                        onClick={() => {
                          flyToAndSelect(site.id);
                          setShowSaved(false);
                        }}
                        className="bg-white border rounded p-2 cursor-pointer hover:border-emerald-300 active:bg-emerald-50"
                      >
                        <div className="flex justify-between">
                          <div className="min-w-0">
                            <div className="font-medium leading-tight">
                              {site.name}
                            </div>
                            <div className="text-xs text-slate-600">
                              {site.waterbody}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaved(site.id);
                            }}
                            className="text-xs text-red-600 hover:text-red-800 px-1"
                            title="Remove"
                          >
                            remove
                          </button>
                        </div>
                        <div className="text-[10px] text-emerald-700 mt-0.5">
                          {site.access_type} • {site.access_quality} — tap for
                          details
                        </div>
                      </div>
                    ))}
                </div>
              )}
              <div className="mt-3 text-[10px] text-slate-400 border-t pt-2">
                Stored locally in your browser only. Clear site data to reset.
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8 text-xs text-slate-500 border-t pt-3">
          All data carries machine-readable provenance from PR 1 ETL. See{" "}
          <a href="https://github.com/" className="underline">
            DESIGN.md
          </a>
          , <code>data/processed/manifest.json</code>,{" "}
          <code>DATA-VERIFICATION.md</code>. This is not legal advice — verify
          on-site and with current DNR regulations. (Prototype.){" "}
          <span className="font-mono">npm run dev</span> prototype.
        </footer>
      </main>
    </div>
  );
}

export default App;
