# Fishmap ETL Runbook (PR 7 Production)

**Owner**: Maintainer  
**Cadence**: Quarterly (or on material source updates)  
**Goal**: Reproducible, reviewable, citable data refresh for the 40-mile Grand Rapids AOI with full shore-first classification. Every change via PR + manifest.

See: DESIGN.md (ETL Reality, Data Sources Inventory, pseudocode), docs/ASSET-HOSTING.md, ETL-SPEC.md, CONTRIBUTING.md, scripts/*.py, Makefile.

## Prerequisites
- Docker (recommended) or native Python 3.11+ + GDAL + tippecanoe (see Dockerfile.etl + Makefile)
- `make` (or direct python -m)
- Git + GitHub access for PR
- Accounts: Michigan DNR open data (no login for most), Kent/GR/ Ottawa/Allegan county GIS portals (public)

## 1. Data Acquisition — Exact Portal Steps (Current as of PR7)

### Michigan DNR MiBFF + Shore Fishing (primary authoritative)
1. Open https://gis-midnr.opendata.arcgis.com/maps/3eaf9804bf6f4bafb8e03aea660c9fce (or the Experience ArcGIS "Michigan Boating Facility Finder" + Shore Fishing viewer at https://experience.arcgis.com/experience/cc091ec1b6a24d7a98010f8de57fd189)
2. In the map: filter to "Boat Access" + "Shore Fishing" flags where available. Zoom to 40-mi radius around Grand Rapids (approx. Kent + adjacent).
3. Use "Export" or "Download" (CSV / GeoJSON / Shapefile) for the filtered view. Note the item ID and download timestamp.
4. For REST query (advanced): use the layer query endpoint with `where=...` for county filters. Record the exact query URL + result count in manifest notes.
5. Cross-reference Shore Fishing viewer layers for explicit "shore" or "bank" attributes.
6. Archive a copy of the export (or note permalink) in the data PR description.

### Kent County / City of Grand Rapids GRData (parks, parcels, hydro)
1. GRData: https://grdata-grandrapids.opendata.arcgis.com/
   - Search "parks" or "recreation". Export park polygons + attributes as GeoJSON.
   - Filter by "fishing" mentions or name patterns if present.
2. Kent County AccessKent: https://kentcountymi-accesskent.opendata.arcgis.com/
   - Parcels + parks layers. Export relevant for AOI.
3. Record download dates + layer IDs. Use for park/hydro buffer inference validation.

### Ottawa County (PR6+ priority)
1. Ottawa GIS Hub: https://www.miottawa.org/ (search GIS / open data / parks)
2. Look for parks, trails, Lake Michigan access, creek mouths. Export GeoJSON or use ArcGIS REST.
3. Cross with DNR for state park shore (e.g. Grand Haven State Park).

### Allegan County (PR6+ priority)
1. Allegan County open data / parks pages: https://www.allegancounty.org/
2. Focus on Saugatuck Dunes, Douglas harbor, river mouths. Export or screenshot portal views.
3. Supplement with DNR viewer.

### USGS / NHD / Hydro (for buffers)
- National Hydrography or 3DHP downloads via USGS TNM or ScienceBase (bbox clip to AOI).
- Used in full spatial ETL (future live runs beyond curated).

**Always**:
- Note `retrieved` ISO date for every source entry.
- Prefer direct attributes over inference.
- Capture screenshots of portal filters/views for DATA-VERIFICATION.md in the PR.

## 2. Run the ETL (Dry-Run First)
```bash
# Full reproducible (Docker preferred)
docker build -f Dockerfile.etl -t fishmap-etl .
docker run --rm -v "$(pwd)/data:/data" fishmap-etl make etl-sample

# Or native (after pip -r scripts/requirements.txt)
make etl-sample
make etl-validate
make tiles-sample   # optional small PMTiles smoke
```

- This produces `data/processed/access_points_sample.geojson` + `manifest.json` (update in place for the PR).
- For full quarterly (non-sample): the scripts support expansion; update `etl_sample.py` entrypoint or add `make update-data` target in future if needed. Current is the 10-site curated baseline.

**Dry-run mode**: Run the above locally; do not commit until verification (see below). The GitHub Action (etl-dry-run.yml) automates this on dispatch + manifest diff.

## 3. Verification Checklist (Mandatory for every data PR)
- [ ] All features inside committed `data/aoi.geojson` (run validator)
- [ ] Every feature has ≥1 `sources[]` (name + url + retrieved) + `last_verified`
- [ ] `access_type` in allowed enum; `access_quality` in enum
- [ ] No private land, boat-ramp-only, or out-of-AOI points
- [ ] `manifest.json` updated: etl_run_date, all source shas/notes/record_counts, coverage_notes, known_limitations
- [ ] `DATA-VERIFICATION.md` updated with new sites + portal screenshots/links + manual notes
- [ ] `make etl-validate` passes (schema + citation rules)
- [ ] Before/after feature count + diff stats in PR description
- [ ] For inferred points (`inferred: true`): document the heuristic path (park/hydro buffer etc.)
- [ ] One maintainer + optional external spot-check (photos or portal links)
- [ ] Update CHANGELOG.md (or CHANGELOG-data.md per DESIGN) with summary
- [ ] If tiles change: upload new .pmtiles to R2 (per ASSET-HOSTING.md), update URLs + manifest
- [ ] PR title: "[DATA] Quarterly refresh YYYY-QX — X sites / Y changes"

## 4. Post-ETL: PMTiles + Hosting
- Run tippecanoe via `scripts/tile.py` (or make) for thematic layer.
- Upload to production R2 bucket (see ASSET-HOSTING.md for CORS + naming).
- Update `src/App.tsx` PMTiles URLs only if changing hosts (coordinate with Vercel deploy).
- Test Range requests + CORS from browser devtools + `curl -I -H "Range: ..."`

## 5. Draft Data PR Scaffolding
Use the GitHub Action output or manually include:
- Link to this runbook
- `git diff data/processed/manifest.json`
- Stats: added/updated/removed
- Portal evidence links + verification checklist items checked
- R2 upload confirmation (if applicable)

See `.github/workflows/etl-dry-run.yml` for automated diff + template.

## Rollback
Revert the data commit + redeploy (Vercel instant). Old R2 objects retained per lifecycle.

## Common Pitfalls
- Hand-editing GeoJSON (forbidden — always ETL).
- Missing `last_verified` or incomplete sources[].
- Forgetting to update manifest coverage_notes for county expansions.
- Skipping on-site or portal re-verify for "high" quality flags.

**Questions?** Open a GitHub Discussion linking this file + DESIGN.md section.

This runbook + the GitHub Action ensures sustainable quarterly refreshes post-PR7 launch.
