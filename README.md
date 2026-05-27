# Fishmap

Accurate, mobile-first interactive map of public **shore, bank, dock, pier, wade, and road-end fishing access** within a 40-mile radius of Grand Rapids, Michigan.

**Strict focus**: Only confirmed or high-likelihood public shore/dock access. Every feature carries full citations and `last_verified` dates. Static JAMstack + MapLibre + PMTiles for instant loads and full offline use after one regional download.

- **Target users**: Anglers without boats who want reliable "where can I fish from shore near me today?" answers in the field.
- **Data philosophy**: Python ETL (committed in-repo) is source of truth. Authoritative sources (Michigan DNR MiBFF, USGS hydro, Kent/GR/county GIS) + explicit manual verification. No user-generated content as primary.
- **Scope**: 40-mile geodesic buffer around 42.9634,-85.6681 (Grand Rapids). Shore-first; boat ramps secondary/filterable.

## Quick Start (ETL Sample)

```bash
# Native (requires Python 3.11+, deps)
make etl-sample
# or
python -m scripts.etl_sample

# Reproducible via Docker (recommended for GDAL/tippecanoe)
docker build -f Dockerfile.etl -t fishmap-etl .
docker run --rm -v $(pwd)/data:/data fishmap-etl make etl-sample
```

This produces:
- `data/processed/access_points_sample.geojson` (validated against schema, 4–5 real public shore sites)
- `data/processed/manifest.json` (full provenance, SHA256s, citations, etl_run_date)

The sample is the first committed authoritative data artifact.

## Development

See [DESIGN.md](./DESIGN.md) for full architecture, ETL Reality notes (pseudocode for classification, AOI construction), data sources, and the 8-PR plan.

### Frontend (stub in PR 1; full in PR 2)

```bash
npm install
npm run dev
```

Vite + React 18 + TS + Tailwind + MapLibre skeleton. Loads the PR1 sample GeoJSON. "Shore & Dock Only" filter and rich interactions land in later PRs.

### ETL

- `scripts/aoi.py` — generates committed `data/aoi.geojson` (exact 40-mile buffer)
- `scripts/classify.py`, `enrich.py` — implement shore classification heuristics from DESIGN (direct attrs + park/hydro buffer inference, private exclusion)
- `docs/ETL-SPEC.md` — contracts + JSON Schema
- `Makefile` — `etl-sample`, `etl-validate`, etc.
- `Dockerfile.etl` — pins Python + GDAL + tippecanoe for reproducibility

## Data

All features include:
- `access_type`: bank | dock | pier | wade | road_end | park_shore
- `access_quality`: high | medium-high | ...
- `sources[]` with name, url, retrieved
- `last_verified`

See `data/processed/DATA-VERIFICATION.md` for manual checks on the sample.

**Legal**: This is not legal advice. Always verify current property status, regulations (DNR Fishing Regulations PDF), and posted signs on-site. Public land access subject to Michigan recreational use statutes.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Data updates go through scripted ETL + PR with manifest diff + verification notes.

## License

MIT — see [LICENSE](./LICENSE).

## Status

PR 1 bootstrap complete. See DESIGN.md for roadmap.
