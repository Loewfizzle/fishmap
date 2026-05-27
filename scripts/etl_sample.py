#!/usr/bin/env python3
"""
scripts/etl_sample.py

PR 1 main entrypoint: `make etl-sample` or `python -m scripts.etl_sample`
(Always invoke via `python -m scripts.*` from repo root or `make` for reliable relative imports per Issue 15)

Produces the first independently valuable deliverable:
- data/processed/access_points_sample.geojson (4 real, fully attributed shore access points)
- data/processed/manifest.json (provenance, etl_run_date, source SHAs, citations)

Implements:
- AOI (via import, but committed)
- classify_access_point (minimal working version for curated sites, per DESIGN pseudocode)
- enrich (species, facilities, full sources[])
- Export + basic validation (required fields, access_type enum, citation presence, lat/lon in AOI bbox approx)

All per "Required Output JSON Schema (Draft)" and "manifest.json structure" in DESIGN.md.
No external downloads; hand-curated authoritative sample only.
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from scripts.classify import get_sample_sites
from scripts.enrich import enrich_all

PROCESSED_DIR = Path(__file__).resolve().parents[1] / "data" / "processed"
ACCESS_OUT = PROCESSED_DIR / "access_points_sample.geojson"
MANIFEST_OUT = PROCESSED_DIR / "manifest.json"

# Minimal draft schema keys (enforced here; full JSON Schema in docs/ETL-SPEC.md)
REQUIRED_FIELDS = [
    "id",
    "name",
    "waterbody",
    "access_type",
    "access_quality",
    "lat",
    "lon",
    "sources",
    "last_verified",
]
ACCESS_TYPE_ENUM = {"bank", "dock", "pier", "wade", "road_end", "park_shore"}
ACCESS_QUALITY_ENUM = {"high", "medium-high", "medium", "low"}


def _compute_sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _build_feature(site: dict[str, Any]) -> dict[str, Any]:
    """Convert enriched site dict to GeoJSON Feature (Point, EPSG:4326).
    Include lat/lon in properties (matches DESIGN.md example canonical feature).
    """
    props = {k: v for k, v in site.items()}  # keep lat/lon in props for convenience + schema
    # Ensure geometry is last-ish for readability
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [site["lon"], site["lat"]],
        },
        "properties": props,
    }


def validate_feature(feat: dict[str, Any]) -> list[str]:
    """Return list of validation errors (empty = valid)."""
    errs: list[str] = []
    props = feat.get("properties", {})
    geom = feat.get("geometry", {})

    for field in REQUIRED_FIELDS:
        if field not in props:
            errs.append(f"missing required: {field}")

    if props.get("access_type") not in ACCESS_TYPE_ENUM:
        errs.append(f"invalid access_type: {props.get('access_type')}")

    if props.get("access_quality") not in ACCESS_QUALITY_ENUM:
        errs.append(f"invalid access_quality: {props.get('access_quality')}")

    # Citation presence (core requirement)
    sources = props.get("sources", [])
    if not isinstance(sources, list) or len(sources) == 0:
        errs.append("sources[] must be non-empty array with citations")
    else:
        for s in sources:
            if not (s.get("name") and s.get("url") and s.get("retrieved")):
                errs.append("each source needs name+url+retrieved")

    # Basic geometry
    if geom.get("type") != "Point" or len(geom.get("coordinates", [])) != 2:
        errs.append("geometry must be Point [lon, lat]")

    # Guarded numeric checks (Issue 1 fix): never crash on missing/None lat/lon.
    # Collects all errors gracefully for CI/make etl-validate robustness.
    lat = props.get("lat")
    lon = props.get("lon")
    if lat is None or lon is None:
        errs.append("lat/lon missing (required numeric fields)")
    else:
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            errs.append("lat/lon out of range")
        # Rough AOI containment (40mi ~0.58 deg rough; real check uses aoi in full ETL)
        if not (42.3 < lat < 43.6 and -86.3 < lon < -85.0):
            errs.append("outside approximate 40-mile Grand Rapids AOI")
        # Issue 10 fix: basic consistency between duplicated lat/lon (per DESIGN example) and geometry
        coords = geom.get("coordinates", [])
        if len(coords) == 2 and (abs(lat - coords[1]) > 1e-6 or abs(lon - coords[0]) > 1e-6):
            errs.append("lat/lon in properties inconsistent with geometry.coordinates")

    return errs


def build_manifest(sites: list[dict[str, Any]], geojson_text: str) -> dict[str, Any]:
    etl_date = datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")

    # Provenance for the generated outputs (content hash of the geojson we emit)
    output_sha = _compute_sha256(geojson_text)

    # Sources in manifest record the origin of the *sample curation*
    source_entries = [
        {
            "name": "Michigan DNR MiBFF (item 3eaf9804bf6f4bafb8e03aea660c9fce) + Shore Fishing viewer",
            "url": "https://gis-midnr.opendata.arcgis.com/maps/3eaf9804bf6f4bafb8e03aea660c9fce",
            "downloaded": "2026-05-20 (manual verified extract for PR1 bootstrap)",
            "record_count": 4,  # sample only
            "sha256": "N/A-manual-curation-pr1-"
            + _compute_sha256("dnr+grdata+ kent-2026-05")[
                :12
            ],  # Issue 16: explicit N/A for hand-curated (no raw download artifacts in PR1)
            "notes": "Hand-curated from portal patterns + public park maps for 4 high-confidence shore sites. Full automation later.",
        },
        {
            "name": "City of Grand Rapids GRData + Kent County GIS",
            "url": "https://grdata-grandrapids.opendata.arcgis.com/ + https://kentcountymi-accesskent.opendata.arcgis.com/",
            "downloaded": "2026-05-20",
            "record_count": 4,
            "sha256": "N/A-manual-curation-pr1-"
            + _compute_sha256("grdata+kent-2026-05")[
                :12
            ],  # Issue 16: explicit N/A for hand-curated (no raw download artifacts in PR1)
        },
    ]

    return {
        "etl_run_date": etl_date,
        "aoi_center": [-85.6681, 42.9634],
        "aoi_radius_miles": 40.0,
        "aoi_file": "data/aoi.geojson",
        "script_version": "pr1-bootstrap-v1",
        "sources": source_entries,
        "output": {
            "access_points_sample": {
                "path": "data/processed/access_points_sample.geojson",
                "sha256": output_sha,
                "feature_count": len(sites),
            }
        },
        "coverage_notes": "PR 1 sample only — 4 verified public shore/bank/pier sites (Fish Ladder, Johnson/Millennium, Richmond Pier, Reeds Lake). Full 40-mile classified dataset in later PRs. All features have machine + human citations.",
        "known_limitations": [
            "Sample is tiny and hand-curated (no full spatial classification run yet)",
            "Private parcel exclusion / 30m hydro buffer heuristics stubbed for these known sites",
            "No water_bodies layer in PR1 sample",
        ],
    }


def main() -> None:
    print("=== Fishmap PR 1 ETL Sample ===")
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Classify (minimal working per DESIGN pseudocode for curated sites)
    raw_classified = get_sample_sites()
    print(f"Classified {len(raw_classified)} sites using DESIGN heuristics (name/direct attr path)")

    # 2. Enrich + citations
    enriched = enrich_all(raw_classified)
    print("Enriched with species, facilities, regulations, full provenance sources[]")

    # 3. Build GeoJSON FeatureCollection
    features = [_build_feature(s) for s in enriched]
    fc = {
        "type": "FeatureCollection",
        "name": "fishmap_access_points_sample_pr1",
        # "crs" removed per RFC 7946 (Issue 13 fix); EPSG:4326 implicit + documented elsewhere
        "features": features,
    }
    geojson_text = json.dumps(fc, indent=2, ensure_ascii=False) + "\n"

    # 4. Validate every feature (enforces schema contracts)
    all_errs: list[str] = []
    for i, feat in enumerate(features):
        errs = validate_feature(feat)
        if errs:
            all_errs.extend(f"{feat['properties'].get('id', i)}: {e}" for e in errs)
    if all_errs:
        print("VALIDATION FAILED:")
        for e in all_errs:
            print("  -", e)
        raise SystemExit(1)
    print(
        "Validation passed: all features have required fields, valid enums, citations, AOI containment"
    )

    # 5. Write outputs
    ACCESS_OUT.write_text(geojson_text, encoding="utf-8")
    print(f"Wrote {ACCESS_OUT}")

    # PR 4 (smallest export logic): the ACCESS_OUT GeoJSON written above is the
    # PMTiles-ready input for scripts/tile.py. Nested props ok (tippecanoe handles).
    # Future PR6: emit water_bodies FC for dedicated water.pmtiles layer here.

    manifest = build_manifest(enriched, geojson_text)
    MANIFEST_OUT.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {MANIFEST_OUT}")

    print("\n=== SUCCESS: etl-sample complete ===")
    print("First real authoritative shore access data artifact with full provenance.")
    print("Ready for CI, frontend integration (PR 2), and review.")


if __name__ == "__main__":
    main()
