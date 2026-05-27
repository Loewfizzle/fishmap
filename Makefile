# Fishmap Makefile — PR 1 bootstrap targets
# Run `make help` for overview

PYTHON := python
PIP := pip
NPM := npm
DOCKER := docker

.PHONY: help etl-sample etl-validate fmt lint clean frontend-dev

help:
	@echo "Fishmap targets (PR 1 foundation):"
	@echo "  etl-sample     - Run minimal ETL producing validated sample data + manifest (the key deliverable)"
	@echo "  etl-validate   - Validate existing processed sample against schema + citation rules"
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
	rm -rf data/raw/* data/processed/*.tmp
	@echo "Cleaned transient ETL artifacts (sample data preserved)"
