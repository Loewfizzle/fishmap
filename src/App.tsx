import { useState, useEffect, useRef, useMemo } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import { distance } from "@turf/distance";
import rawAccess from "../data/processed/access_points_sample.geojson?raw";
const accessGeoJson = JSON.parse(rawAccess) as any;

// Minimal shape for the real PR1 sample (full provenance in the GeoJSON)
interface SourceCitation {
  name: string;
  url: string;
  retrieved: string;
}
interface AccessSite {
  id: string;
  name: string;
  waterbody: string;
  access_type: string;
  access_quality: string;
  notes?: string;
  sources: SourceCitation[];
  last_verified: string;
}

const SHORE_TYPES = [
  "bank",
  "dock",
  "pier",
  "wade",
  "road_end",
  "park_shore",
] as const;

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

  // Real data wired from PR 1 (no more hardcoded)
  const allFeatures = accessGeoJson.features;
  const allSites = useMemo(
    () => allFeatures.map((f: any) => f.properties as AccessSite),
    [allFeatures],
  );

  // Centralized distances when "Near me" active (avoids 3x recompute on renders; Issue 5)
  const siteDistances = useMemo(() => {
    if (!userLocation) return new Map<string, number>();
    const m = new Map<string, number>();
    allFeatures.forEach((f: any) => {
      const id = f.properties.id as string;
      const coords = f.geometry.coordinates as [number, number];
      m.set(id, distance(userLocation, coords, { units: "miles" }));
    });
    return m;
  }, [userLocation, allFeatures]);

  // Client-side filtered + optionally distance-sorted list (search + chips + shore toggle)
  const filteredSites = useMemo(() => {
    let result = allSites.filter((site: AccessSite) => {
      if (shoreOnly && !SHORE_TYPES.includes(site.access_type as any))
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
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [-85.6681, 42.9634], // AOI center from manifest + DESIGN
      zoom: 10.2,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("access", {
        type: "geojson",
        data: accessGeoJson as any,
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
        const p = feature.properties;
        const html = `<div style="font:13px system-ui;max-width:220px"><strong>${p.name}</strong><br/><span style="color:#334155">${p.waterbody}</span><br/><span style="background:#ecfdf5;color:#166534;padding:1px 4px;border-radius:2px;font-size:10px">${p.access_type}</span> <span style="color:#64748b;font-size:10px">• ${p.access_quality}</span><div style="margin-top:3px;font-size:10px;color:#64748b">See panel below for citations</div></div>`;
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
    const feat: any = allFeatures.find((f: any) => f.properties.id === id);
    if (!feat) {
      setSelectedId(id);
      return;
    }
    const [lon, lat] = feat.geometry.coordinates as [number, number];
    if (m) {
      m.flyTo({ center: [lon, lat], zoom: 13.5, duration: 550 });
      setTimeout(() => {
        if (mapRef.current) {
          new maplibregl.Popup({ closeButton: true, maxWidth: "240px" })
            .setLngLat([lon, lat])
            .setHTML(
              `<strong>${feat.properties.name}</strong><br/>${feat.properties.waterbody}`,
            )
            .addTo(mapRef.current);
        }
      }, 600);
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
        const candidates: any[] = allFeatures.filter((f: any) => {
          const p = f.properties;
          if (snapShore && !SHORE_TYPES.includes(p.access_type)) return false;
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
        let nearestFeat: any = null;
        candidates.forEach((f: any) => {
          const coords = f.geometry.coordinates as [number, number];
          const d = distance(user, coords, { units: "miles" });
          if (d < minD) {
            minD = d;
            nearestId = f.properties.id;
            nearestFeat = f;
          }
        });

        if (nearestId && nearestFeat) {
          setSelectedId(nearestId);
          const m = mapRef.current;
          if (m) {
            const [lon, lat] = nearestFeat.geometry.coordinates as [
              number,
              number,
            ];
            m.flyTo({ center: [lon, lat], zoom: 13, duration: 700 });
            setTimeout(() => {
              if (mapRef.current) {
                new maplibregl.Popup()
                  .setLngLat([lon, lat])
                  .setHTML(
                    `<strong>Nearest to you (matches filters):</strong> ${nearestFeat.properties.name}<br/>~${minD.toFixed(1)} miles`,
                  )
                  .addTo(mapRef.current);
              }
            }, 750);
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
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Fishmap</h1>
            <p className="text-sm text-slate-600">
              Shore &amp; Dock Fishing • 40-mile Grand Rapids radius
            </p>
          </div>
          <div className="text-xs px-3 py-1 bg-emerald-100 text-emerald-800 rounded font-mono">
            PR 2 • REAL SAMPLE DATA
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-sm">
          <strong>PR 2 prototype.</strong> Real{" "}
          <code>data/processed/access_points_sample.geojson</code> (4 sites with
          full citations from PR 1 ETL). Uses exact MapLibre shore filter
          expression from DESIGN.md. All client-side.
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

        {/* Basic detail panel/popup content (name, waterbody, access_type, access_quality, sources[] with citations) */}
        {selectedSite && (
          <div className="mb-5 detail-panel">
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{selectedSite.name}</div>
                <div className="text-sm text-slate-600">
                  {selectedSite.waterbody}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                  {selectedSite.access_type}
                </span>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {selectedSite.access_quality}
                </div>
              </div>
              <button
                onClick={clearSelection}
                className="text-xs text-slate-400 hover:text-slate-700 self-start"
              >
                close
              </button>
            </div>
            {selectedSite.notes && (
              <p className="mt-2 text-sm">{selectedSite.notes}</p>
            )}
            <div className="mt-3 pt-2 border-t text-[11px]">
              <div className="font-medium text-slate-700 mb-0.5">
                Sources (citations)
              </div>
              <ul className="space-y-0.5">
                {selectedSite.sources.map((s: SourceCitation, i: number) => (
                  <li key={i}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {s.name}
                    </a>
                    <span className="text-slate-400">
                      {" "}
                      • retrieved {s.retrieved}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="text-[10px] text-slate-400 mt-1">
                last verified {selectedSite.last_verified}
              </div>
            </div>
          </div>
        )}

        {/* Interactive list (click rows to fly/highlight on map + populate detail) */}
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
                    <div className="text-right text-xs shrink-0">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                        {site.access_type}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-px">
                        {site.access_quality}
                      </div>
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

        <footer className="mt-8 text-xs text-slate-500 border-t pt-3">
          All data carries machine-readable provenance from PR 1 ETL. See{" "}
          <a href="https://github.com/" className="underline">
            DESIGN.md
          </a>
          , <code>data/processed/manifest.json</code>,{" "}
          <code>DATA-VERIFICATION.md</code>. This is not legal advice — verify
          on-site and with current DNR regulations.{" "}
          <span className="font-mono">npm run dev</span> prototype.
        </footer>
      </main>
    </div>
  );
}

export default App;
