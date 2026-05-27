#!/usr/bin/env python3
"""
scripts/validate_sample.py

Standalone validator for the PR1 sample outputs.
Used by `make etl-validate`, CI, and `make lint`.

Checks:
- GeoJSON loads + has features
- Every feature passes the same rules as etl_sample (required fields, enums, citations)
- manifest.json present with etl_run_date + sources + output sha
- All features inside rough AOI + have "sources" citations (core PR1 requirement)
"""

from __future__ import annotations

import json
import sys

from scripts.etl_sample import ACCESS_OUT, MANIFEST_OUT, validate_feature


def main(lint_only: bool = False) -> int:
    errors: list[str] = []

    if not ACCESS_OUT.exists():
        errors.append(f"Missing {ACCESS_OUT}")
    if not MANIFEST_OUT.exists():
        errors.append(f"Missing {MANIFEST_OUT}")

    if errors:
        print("VALIDATE FAIL (files missing):")
        for e in errors:
            print(" ", e)
        return 1

    try:
        fc = json.loads(ACCESS_OUT.read_text(encoding="utf-8"))
        manifest = json.loads(MANIFEST_OUT.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"JSON parse error: {e}")
        return 1

    if fc.get("type") != "FeatureCollection":
        errors.append("Top level must be FeatureCollection")

    features = fc.get("features", [])
    if len(features) < 3:
        errors.append(f"Expected ≥3 features (sample may grow in later PRs, e.g. PR6 10-site), got {len(features)}")  # Issue 8 fix: relax outdated 3-5 expectation

    for i, feat in enumerate(features):
        errs = validate_feature(feat)
        if errs:
            errors.extend(f"feat[{i}]: {e}" for e in errs)

    # Manifest sanity (provenance)
    if "etl_run_date" not in manifest:
        errors.append("manifest missing etl_run_date")
    if not manifest.get("sources"):
        errors.append("manifest sources[] empty (provenance required)")
    if "output" not in manifest or "access_points_sample" not in manifest["output"]:
        errors.append("manifest missing output.access_points_sample")

    if errors:
        print("VALIDATE FAIL:")
        for e in errors:
            print("  -", e)
        return 1

    print(f"OK: {len(features)} sample features validated + manifest provenance present.")
    print(
        f"  access_points_sample.geojson sha (from manifest): {manifest['output']['access_points_sample'].get('sha256', 'n/a')[:16]}..."
    )
    return 0


if __name__ == "__main__":
    lint = "--lint-only" in sys.argv
    sys.exit(main(lint_only=lint))
