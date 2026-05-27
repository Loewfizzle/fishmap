# Contributing to Fishmap

**Default branch**: `master` (all references in docs/workflows use this; confirmed via `git show-ref --heads`).

Thank you for helping build a trustworthy shore-fishing map for the Grand Rapids region.

## Code of Conduct

Be respectful. This project prioritizes data accuracy, citations, and legal clarity over features. Feedback on classification logic or missed public accesses is welcome when accompanied by sources.

## How to Contribute

### Small fixes / docs / code

1. Fork + branch from `master`.
2. Follow existing patterns (see DESIGN.md "Key Decisions").
3. Run `make lint` / `make fmt` (or ruff/black + prettier) before PR.
4. PR description must reference which section of DESIGN.md it implements.

### Data updates / new access points (the important path)

- **Never hand-edit** `data/processed/*.geojson` or `manifest.json`.
- All changes go through the ETL pipeline (`make etl-sample` or full `make update-data` in later PRs).
- Update or add hand-curated overrides in `scripts/` only when justified by primary sources (DNR portal export + county park map + on-site verification note).
- Every PR that touches data **must** include:
  - Updated `manifest.json` (generated)
  - `DATA-VERIFICATION.md` additions or diff
  - Before/after stats + citation for each changed/added feature
  - Link to source portal export (or archived copy in PR if large)

See `docs/ETL-SPEC.md`, `docs/ETL-RUNBOOK.md` (exact portal steps + full PR7 verification checklist), and `scripts/classify.py` comments for the exact heuristics (direct DNR attrs > 30m hydro + public park intersection (private parcel exclusion) > road-end detection). `needs_review` flag is first-class.

### Local dev (ETL)

Preferred: Docker (see Dockerfile.etl + Makefile).

Native:
- Python 3.11+
- `pip install -r scripts/requirements.txt` (or `pip install -e .[etl]`)
- GDAL (via system or conda) for full runs; sample works with pure Python stack too.

### Frontend

- `npm install`
- `npm run dev`
- PRs touching UI must keep mobile-first, <3s load, offline-first principles.

## Style & Tooling

- Python: ruff + black (enforced in CI)
- TS/JS: prettier + eslint (via Vite template)
- Commits: conventional or clear descriptive
- Every data feature ships with citations — no exceptions, even in samples.

## Data PRs (PR 7+ Sustainment — Critical Path)

**Never hand-edit** processed GeoJSON or manifest. All changes via ETL.

Required in every data PR (see full checklist in `docs/ETL-RUNBOOK.md`):
- Run `make etl-sample` (or full) + `make etl-validate`
- Updated `manifest.json` with fresh etl_run_date, source shas, coverage notes
- Additions to `DATA-VERIFICATION.md` (portal links, screenshots, manual verification notes)
- Before/after stats + per-feature citation diffs
- Link to exact portal export(s) used
- Update to `docs/DATA-SCHEMA.md` or `CHANGELOG.md` if schema/cadence notes change
- Use GitHub issue templates ("Data Report" or "Suggest Access") for community input triage

**Dry-run + automation**: Use the "ETL Dry-Run" workflow (dispatch) for manifest diff scaffolding before opening the PR. See `.github/workflows/etl-dry-run.yml`.

**Contribution guide for data**:
1. Open (or respond to) a "Suggest Access" or "Data Report" issue with evidence.
2. Reproduce locally via ETL runbook steps (exact DNR/GRData/Ottawa/Allegan portal navigation).
3. Verify against the full checklist.
4. Open PR with title `[DATA] Quarterly refresh ...`, link this CONTRIBUTING + ETL-RUNBOOK.
5. Maintainer reviews + merges; triggers deploy + (future) R2 tile update.

See `docs/ETL-RUNBOOK.md` (portal steps + verification), `docs/DATA-SCHEMA.md`, `docs/ETL-SPEC.md`, and DESIGN.md for heuristics.

## Questions?

Open a GitHub Discussion or issue linking the relevant DESIGN.md section. For data classification debates, include photos + portal screenshots.

We merge only when the change increases (or at minimum does not decrease) the trustworthiness of the shore-access data.
