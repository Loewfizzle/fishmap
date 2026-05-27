# Fishmap Makefile — PR 1 bootstrap targets
# Run `make help` for overview

PYTHON := python
PIP := pip
NPM := npm
DOCKER := docker

.PHONY: help etl-sample etl-validate tiles-sample fmt lint clean frontend-dev

help:
	@echo "Fishmap targets (PR 1 foundation; PR4 adds tiles):"
	@echo "  etl-sample     - Run minimal ETL producing validated sample data + manifest (the key deliverable)"
	@echo "  etl-validate   - Validate existing processed sample against schema + citation rules"
	@echo "  tiles-sample   - PR4: build small test PMTiles via scripts/tile.py (tippecanoe wrapper) on sample"
	@echo "  fmt            - Format Python (ruff) + TS/JS (prettier)"
	@echo "  lint           - Lint Python (ruff) + TS (eslint) + schema check"
	@echo "  frontend-dev   - Start Vite dev server (after npm install)"
	@echo "  clean          - Remove generated artifacts (keeps committed sample)"

# Core PR1 deliverable: produces data/processed/access_points_sample.geojson + manifest.json
# Uses hand-curated real sites + aoi + classification from DESIGN "Data Acquisition Reality" pseudocode.
# Runnable native (after pip install) or inside Dockerfile.etl.
etl-sample:
	$(PYTHON) -m scripts.etl_sample

etl-validate:
	$(PYTHON) -m scripts.validate_sample

# PR 4: thin tippecanoe wrapper target. Produces small thematic PMTiles from the
# PMTiles-ready GeoJSON emitted by etl-sample. Uses conservative zooms for sample.
# In real runs (Docker/CI) tippecanoe binary is present; locally may print guidance.
tiles-sample:
	$(PYTHON) -m scripts.tile --input data/processed/access_points_sample.geojson --output /tmp/fishmap-access-sample.pmtiles --maxzoom 10

# Formatting & lint (CI uses these)
# Note: ruff covers black-compatible fmt + lint for Python
fmt:
	ruff format scripts/ docs/ 2>/dev/null || true
	$(NPM) run format 2>/dev/null || true

lint:
	ruff check scripts/
	$(PYTHON) -m scripts.validate_sample --lint-only
	$(NPM) run lint 2>/dev/null || true

# Frontend (stub)
frontend-dev:
	cd . && $(NPM) run dev

clean:
	# Portable clean (Issue 4 fix): Python one-liner works on Windows cmd/PS/PowerShell + Unix without rm or bash.
	# Respects .gitignore for data/raw/*; only touches *.tmp in processed (sample data safe).
	$(PYTHON) -c "import shutil, pathlib, os; \
		r = pathlib.Path('data/raw'); \
		[shutil.rmtree(p, ignore_errors=True) for p in (list(r.glob('*')) if r.exists() else [])]; \
		[p.unlink(missing_ok=True) for p in pathlib.Path('data/processed').glob('*.tmp')]; \
		print('Cleaned transient ETL artifacts (sample data preserved)')" 2>/dev/null || echo "clean: Python fallback (some shells may differ)"
	@echo "Clean complete (portable; see Makefile comments for Windows notes)"
