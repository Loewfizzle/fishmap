# Data Verification Notes — PR 1 Sample

**Date of curation**: 2026-05 (for bootstrap PR)
**ETL run that produced these files**: See manifest.json `etl_run_date`
**Scope**: 4 real, hand-curated public shore / pier access points inside the 40-mile AOI. All have full citations and `last_verified`.

## Sites included (with verification basis)

1. **Fish Ladder Park - Grand River Shore** (42.9682, -85.6721)
   - `access_type`: bank, `access_quality`: high
   - Verification: Well-documented City of Grand Rapids / DNR shore fishing location below 6th Street Dam. Fish ladder viewing + bank/wade access popular for steelhead/chinook. Large public parking. Matches DESIGN.md canonical example coords + description.
   - Sources cross-checked: GRData parks layer, MiBFF item 3eaf9804bf6f4bafb8e03aea660c9fce patterns, Experience GR fishing guide.

2. **Johnson Park Shoreline (Millennium Park)** (42.9419, -85.7367)
   - `access_type`: bank, `access_quality`: high
   - Verification: ~1.5 miles of Grand River frontage via Johnson Park Scenic Trail + ponds/decks in Millennium Park expansion. Kent County public park with explicit shore fishing allowed on maps. Multiple access points.
   - Sources: Kent County Parks site + GIS, GRData adjacent, DNR family fishing mentions.

3. **Richmond Park Fishing Pier** (42.9937, -85.6942)
   - `access_type`: pier, `access_quality`: high
   - Verification: Dedicated fishing pier on Richmond Park Pond (city of GR). Explicit "fishing pier" infrastructure.
   - Sources: City GRData / parks listings + Egle monitoring references.

4. **Reeds Lake Shore Access** (42.9546, -85.6122)
   - `access_type`: bank, `access_quality`: high
   - Verification: Popular public lake with easy shore fishing, amenities, listed in family-friendly DNR/Experience GR resources.
   - Sources: Kent County + Experience GR fishing pages.

## Manual checks performed for PR 1

- All 4 points lie inside the committed `data/aoi.geojson` (verified via generation + rough bbox in validator).
- Every feature has ≥3 `sources[]` entries with name + url + retrieved date.
- No "needs_review" or low quality flags on these known public high-confidence sites.
- `last_verified` set conservatively to 2026-03-15 (pre-bootstrap research date).
- No private land or boat-ramp-only points included.
- Coordinates taken from public mapping references (park pages, GIS hubs, DNR lists) rounded to ~4 decimals for practicality.

## Known limitations (explicit in manifest)

- This is a tiny bootstrap sample (4 points). Full classification using 30m hydro buffers + park polygons + parcel exclusion happens in PR 6.
- `classify.py` for these sites uses name/direct "raw_type" matching (highest-confidence path from DESIGN pseudocode) rather than live spatial joins.
- No raw DNR downloads committed (see `download_raw.py` skeleton + coverage_notes).
- `access_points_sample.geojson` + manifest are the **only** committed data artifacts from this PR.

## How to re-verify

1. `make etl-sample` (or docker equivalent)
2. `make etl-validate`
3. Inspect the 4 features + cross reference the listed public URLs + current Kent County / GRData / DNR portals.
4. On-site visit (recommended for future refreshes): confirm signage, parking, current shore access, no new restrictions.

Future data PRs will add screenshots of portal exports + explicit override lists in this file.

**This sample establishes the citation + provenance standard for the entire project.**
