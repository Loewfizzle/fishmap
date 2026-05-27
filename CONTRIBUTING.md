# Contributing to Fishmap

Thank you for helping build a trustworthy shore-fishing map for the Grand Rapids region.

## Code of Conduct

Be respectful. This project prioritizes data accuracy, citations, and legal clarity over features. Feedback on classification logic or missed public accesses is welcome when accompanied by sources.

## How to Contribute

### Small fixes / docs / code

1. Fork + branch from `main`.
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

See `docs/ETL-SPEC.md` and `scripts/classify.py` comments for the exact heuristics (direct DNR attrs > 30m hydro + public park intersection (private parcel exclusion) > road-end detection). `needs_review` flag is first-class.

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

## Questions?

Open a GitHub Discussion or issue linking the relevant DESIGN.md section. For data classification debates, include photos + portal screenshots.

We merge only when the change increases (or at minimum does not decrease) the trustworthiness of the shore-access data.
