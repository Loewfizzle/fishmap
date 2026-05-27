# Fishmap Data Schema (Full Documentation — PR 7)

**Version**: PR6 expanded 40-mile (curated) + PR7 production baseline  
**File**: `data/processed/access_points_sample.geojson` (FeatureCollection of Points)  
**Manifest**: `data/processed/manifest.json` (provenance + stats)  
**Validation**: `scripts/validate_sample.py` + `make etl-validate`

See also: docs/ETL-SPEC.md (draft contracts), docs/ETL-RUNBOOK.md, DESIGN.md "Required Output JSON Schema".

## GeoJSON Feature Structure (AccessSite)

Each feature:
- `type: "Feature"`
- `geometry: { type: "Point", coordinates: [lon, lat] }` (EPSG:4326, ~4 decimal precision)
- `properties`: AccessSite object (required fields below)

### Required Properties
- `id`: string (stable, e.g. "gr-fishladder-001")
- `name`: string
- `waterbody`: string
- `access_type`: enum ["bank", "dock", "pier", "wade", "road_end", "park_shore"]
- `access_quality`: enum ["high", "medium-high", "medium", "low"]
- `lat`, `lon`: number (redundant with geometry for convenience)
- `sources`: array (min 1) of `{ name: string, url: string (uri), retrieved: string (ISO-ish date) }`
- `last_verified`: string (YYYY-MM-DD or ISO)

### Optional / Extended Properties (PR 3+ / PR6)
- `notes`: string
- `parking`: { has: boolean, capacity?: string, surface?: string, notes?: string }
- `facilities`: string[]
- `hours`: string
- `ada`: string ("yes" | "partial" | "no" | "unknown")
- `species`: string[]
- `regulations`: { summary: string, url: string }
- `inferred`: boolean (true if from heuristic, not direct attr)
- `needs_review`: boolean (flagged for maintainer audit)
- `raw_type`: string (original source classification, for audit)

### Example Feature (from current sample)
(See `data/processed/access_points_sample.geojson` for live 10-site set.)

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [-85.6721, 42.9682] },
  "properties": {
    "id": "gr-fishladder-001",
    "name": "Fish Ladder Park - Grand River Shore",
    "waterbody": "Grand River",
    "access_type": "bank",
    "access_quality": "high",
    "lat": 42.9682,
    "lon": -85.6721,
    "sources": [
      {
        "name": "Michigan DNR MiBFF ...",
        "url": "https://gis-midnr.opendata.arcgis.com/maps/3eaf9804bf6f4bafb8e03aea660c9fce",
        "retrieved": "2026-05-20"
      }
    ],
    "last_verified": "2026-05-20",
    "parking": { "has": true, "notes": "Large public lot" },
    "ada": "yes",
    "species": ["steelhead", "chinook"],
    "inferred": false
  }
}
```

## manifest.json Schema
Top-level:
- `etl_run_date`: ISO
- `aoi_center`, `aoi_radius_miles`
- `aoi_file`
- `script_version`
- `sources[]`: array of source records with name, url, downloaded, record_count, sha256, notes
- `output.access_points_sample`: { path, sha256, feature_count }
- `coverage_notes`, `known_limitations[]`

## Validation Rules (enforced)
- Geometry valid Point in AOI bbox
- Required fields + non-empty sources
- Enum values
- `last_verified` present
- No duplicate IDs
- (Future full: shapely valid, spatial joins for inference)

## Evolution
- Add optional fields only (defensive access in TS/Python).
- Bump `script_version` + document in manifest + this file + CHANGELOG on breaking/added fields.
- Full machine schema (JSON Schema draft) lives in ETL-SPEC.md; this doc is the human + example reference for contributors.

## Usage in Code
- Frontend: `src/App.tsx` (typed loosely as AccessSite; defensive)
- ETL: `scripts/enrich.py`, `classify.py`, `etl_sample.py`, `validate_sample.py`

For contribution: see docs/ETL-RUNBOOK.md "Verification Checklist" and CONTRIBUTING.md.

This schema + provenance guarantees the "trustworthy" goal of the project.
