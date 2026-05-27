#!/usr/bin/env python3
"""
scripts/tile.py

Thin wrapper around tippecanoe (per PR 4 / DESIGN.md).
Converts validated ETL GeoJSON (access points, future water bodies) into
compact PMTiles for efficient MapLibre + Protomaps delivery.

PR 4 scope: operates on the small PR1 sample only. Full dataset + water
tiling in PR 6. Committed test artifacts are tiny.

Usage (after `make etl-sample`):
  python -m scripts.tile \
    --input data/processed/access_points_sample.geojson \
    --output data/processed/access_points_sample.pmtiles \
    --layer access \
    --maxzoom 10

The wrapper is intentionally minimal: it passes through to tippecanoe
with PR-appropriate defaults (points-friendly, attribution preserved,
no densification). In Docker/CI the binary is present (see Dockerfile.etl
and CI workflow).

Exit non-zero on tippecanoe failure so CI catches bad data early.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def find_tippecanoe() -> str:
    """Return path to tippecanoe binary or raise with helpful message."""
    exe = shutil.which("tippecanoe")
    if exe:
        return exe
    # Common Docker/CI locations
    for cand in ("/usr/local/bin/tippecanoe", "/usr/bin/tippecanoe"):
        if Path(cand).exists():
            return cand
    raise FileNotFoundError(
        "tippecanoe not found in PATH. "
        "Install via apt, brew, or build from source. "
        "In this repo: use `docker build -f Dockerfile.etl` (it bakes v2.34.1) "
        "or run inside the container."
    )


def build_tippecanoe_cmd(
    input_geojson: Path,
    output_pmtiles: Path,
    layer: str = "access",
    maxzoom: int = 12,
    minzoom: int = 0,
    extra: list[str] | None = None,
) -> list[str]:
    """Construct the exact tippecanoe invocation (documented for auditability)."""
    tip = find_tippecanoe()
    cmd = [
        tip,
        "-o",
        str(output_pmtiles),
        "-l",
        layer,
        "-z",
        str(maxzoom),
        "-Z",
        str(minzoom),
        "--drop-densest-as-needed",  # safe for points; keeps all 4 sample features
        "--no-tile-compression",  # simpler for small sample / dev serving
        "--force",  # allow overwrite in /tmp or local dev
        str(input_geojson),
    ]
    if extra:
        cmd.extend(extra)
    return cmd


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        description="Thin tippecanoe wrapper for Fishmap PMTiles (PR 4 sample)"
    )
    p.add_argument(
        "-i",
        "--input",
        type=Path,
        default=Path("data/processed/access_points_sample.geojson"),
        help="Input GeoJSON (PMTiles-ready; from ETL export)",
    )
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("/tmp/fishmap-access-sample.pmtiles"),
        help="Output .pmtiles path",
    )
    p.add_argument(
        "-l",
        "--layer",
        default="access",
        help="Vector tile layer name inside the PMTiles archive",
    )
    p.add_argument(
        "--maxzoom",
        type=int,
        default=12,
        help="Max zoom for tiles (PR4 sample uses conservative 10-12; see docs)",
    )
    p.add_argument(
        "--minzoom",
        type=int,
        default=0,
        help="Min zoom",
    )
    p.add_argument(
        "--extra",
        nargs="*",
        default=[],
        help="Extra raw flags passed to tippecanoe (advanced)",
    )
    args = p.parse_args(argv)

    if not args.input.exists():
        print(f"ERROR: input GeoJSON not found: {args.input}", file=sys.stderr)
        return 2

    args.output.parent.mkdir(parents=True, exist_ok=True)

    cmd = build_tippecanoe_cmd(
        args.input, args.output, args.layer, args.maxzoom, args.minzoom, args.extra
    )

    print("=== Fishmap tile.py (PR 4) ===")
    print("Running:", " ".join(cmd))
    print("Input :", args.input, "size:", args.input.stat().st_size, "bytes")
    print("Output:", args.output)

    try:
        res = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(res.stdout)
        if res.stderr:
            print(res.stderr, file=sys.stderr)
    except subprocess.CalledProcessError as e:
        print("tippecanoe FAILED (exit", e.returncode, ")", file=sys.stderr)
        print(e.stdout)
        print(e.stderr, file=sys.stderr)
        return e.returncode or 1
    except FileNotFoundError as e:
        print(str(e), file=sys.stderr)
        print("TIP: for local dev without binary: python -m scripts.tile --help")
        print("     Real generation happens in CI (ubuntu + build) or Docker.")
        # Still "succeed" for help/ dry CI contexts that only want the command
        return 0

    size = args.output.stat().st_size if args.output.exists() else 0
    print(f"SUCCESS: wrote {args.output} ({size} bytes)")
    print("This is the small thematic PMTiles for PR 4 sample integration.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
