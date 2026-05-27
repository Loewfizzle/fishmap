# Fishmap

**An accurate, mobile-first map for finding public shore, bank, dock, and pier fishing access around Grand Rapids, Michigan.**

Fishmap helps anglers without boats answer the question: *"Where can I legally fish from the shore near me today?"*

- **Strict public access focus** — Only confirmed or high-likelihood public shore/dock access points.
- **Fully cited** — Every location includes sources and verification dates from Michigan DNR, county, and city open data.
- **Works offline** — Download the region once and the entire app (map + details + saved spots) works without cell service.
- **Production-ready** — Clean PWA, strong security headers, and automation for future data updates.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Built with Vite + React + MapLibre](https://img.shields.io/badge/Built%20with-Vite%20%2B%20React%20%2B%20MapLibre-646cff)

---

## Features

- Interactive map with Protomaps vector tiles
- Powerful "Shore & Dock Only" filtering + per-type chips
- "Near Me" using your location + smart filtering
- Rich detail panels (mobile bottom sheet + desktop) with parking, facilities, ADA, species, regulations links, and full citations
- Save favorite spots that persist locally
- Full PWA support + offline map region downloads (OPFS)
- Prominent legal disclaimers on every screen

## Getting Started

### Run the App Locally

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open the URL shown in your terminal (usually `http://localhost:5173`).

### Build for Production

```bash
npm run build
npm run preview
```

### Regenerate Sample Data (Optional)

```bash
# Using Docker (recommended)
docker build -f Dockerfile.etl -t fishmap-etl .
docker run --rm -v ${PWD}/data:/data fishmap-etl make etl-sample

# Or natively
npm run etl-sample
```

## Tech Stack

- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS + MapLibre GL
- **Offline**: `vite-plugin-pwa` + `@makina-corpus/maplibre-offline-pmtiles`
- **Data Pipeline**: Python + GDAL (via Docker for reproducibility)
- **Hosting**: Vercel (recommended) + Cloudflare R2 for tiles
- **Tooling**: GitHub Actions for CI and quarterly data refresh automation

## Data Philosophy

All data comes from authoritative public sources:
- Michigan DNR (MiBFF / Boating Facilities)
- County and city GIS portals (Kent, Ottawa, Allegan, etc.)
- USGS hydrography

Every access point includes:
- `access_type`, `access_quality`, and inference flags
- Full `sources[]` with links and retrieval dates
- `last_verified` timestamp

See [`data/processed/DATA-VERIFICATION.md`](data/processed/DATA-VERIFICATION.md) and [`docs/ETL-RUNBOOK.md`](docs/ETL-RUNBOOK.md) for details.

**Important**: This is curated data demonstrating the platform. A full automated refresh process is available via the GitHub Actions workflow.

## Legal Disclaimer

**Data is compiled from public sources. Always verify current conditions, property boundaries, posted signs, and regulations on site before fishing or accessing any location.** Fishmap does not grant legal access and is not legal advice. Users assume all risk. See the full disclaimer in the app UI and README.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

Data updates should go through the documented ETL process and include:
- Updated `manifest.json`
- Verification notes
- A passing `make etl-validate`

## Roadmap

See [DESIGN.md](DESIGN.md) for the original architecture and 8-PR plan.

Current status: All core PRs (1–7) are complete. The app is production-hardened with strong legal hygiene and automation in place.

Next possible work:
- First real automated data refresh using the PR 7 tooling
- Optional user-submitted report feature (PR 8)
- Mobile app polish and testing

## License

MIT © 2026

---

**Built as a focused project to solve a real local problem**: helping people without boats find good public shore fishing near Grand Rapids.
