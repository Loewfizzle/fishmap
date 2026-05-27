# Changelog

All notable changes to Fishmap are documented here. Data changes follow the quarterly cadence described below.

See DESIGN.md for full architecture and PR history.

## [Unreleased / PR 7] - 2026-05

### Added (PR 7: Production Deployment, Observability, Legal Disclaimers, Launch Prep, and Sustainment Automation)
- Production static hosting config: `vercel.json` with strict CSP headers, security headers, preview deploy support (Vercel primary per DESIGN).
- Production R2 bucket + CORS documented and configured (reference: docs/ASSET-HOSTING.md updated with exact bucket/CORS steps for PR7+).
- Disclaimers made prominent **everywhere**: persistent app shell banner, detail panels, saved spots panel, footer (UI); bold section in README; repeated in every feature context. Canonical wording: "Data is compiled from public sources. Always verify current conditions, property boundaries, and regulations on site. Fishmap does not grant legal access."
- Basic privacy-respecting analytics placeholder (Vercel/Cloudflare pageviews + CWV; no user tracking). Documented in index.html + README.
- GitHub issue templates: `data-report.md`, `suggest-access.md` (for triage into ETL).
- Expanded `/docs/`:
  - `ETL-RUNBOOK.md`: exact portal navigation steps (DNR/GRData/Ottawa/Allegan), full verification checklist, dry-run instructions, PR scaffolding notes.
  - `DATA-SCHEMA.md`: complete human + example documentation of AccessSite + manifest schema.
  - Enhanced `CONTRIBUTING.md` with dedicated data PR process + links to runbook.
- GitHub Action: `etl-dry-run.yml` — on-demand + quarterly schedule reminder; runs ETL, produces manifest diff artifact, generates copy-paste draft data PR body scaffolding.
- `CHANGELOG.md` (this file) + data update cadence documentation.
- Launch prep: simple checklist in `docs/LAUNCH-CHECKLIST.md`.

### Changed
- Updated DATA_DISCLAIMER const + all UI surfaces + README for production (removed "prototype" language).
- README status and legal sections expanded for PR7 hygiene.

### Infrastructure / Ops
- `npm run build` remains clean.
- All changes follow existing patterns (no core map/ETL logic changes).

## Data Update Cadence (PR 7+)

- **Quarterly** authoritative refreshes via scripted ETL + PR (see DESIGN.md Rollout + "5. Data Update Cadence").
- Trigger: Maintainer dispatch of ETL dry-run workflow, or material portal updates (DNR releases, county GIS).
- Every data PR **must** include (enforced via runbook checklist):
  - Fresh `manifest.json`
  - `DATA-VERIFICATION.md` updates + evidence
  - Before/after stats + citations
  - Portal links + screenshots
  - Link to `docs/ETL-RUNBOOK.md` + this changelog entry
- Automation: `.github/workflows/etl-dry-run.yml` produces diff + PR template.
- Rollback: Git revert + Vercel instant redeploy (R2 objects versioned).
- See `docs/ETL-RUNBOOK.md`, `docs/DATA-SCHEMA.md`, `CONTRIBUTING.md` (data section), GitHub data issue templates.

Future entries will be added under dated versions on each merge.

---

**Initial project bootstrap (PR 1-6)**: See git history + DESIGN.md for prior artifacts (sample ETL, map, PWA, full 40-mi curated dataset).
