#!/usr/bin/env python3
"""
scripts/download_raw.py (skeleton for PR 1+)

In full ETL: downloads DNR MiBFF (item 3eaf9804bf6f4bafb8e03aea660c9fce),
hydro, county parks/parcels via REST or direct zips into data/raw/YYYY-MM-DD/.

For PR 1 bootstrap: this is a no-op stub. Sample data is 100% hand-curated
(4 real verified public shore sites) inside classify.py + enrich.py so that
`make etl-sample` delivers the independently valuable artifact immediately
without external network calls or large downloads.

See DESIGN.md "Data Acquisition Reality & Implementation Notes" and "Primary Source Layer Identifiers".
"""

from __future__ import annotations

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Download raw GIS sources (stub in PR 1)")
    parser.add_argument("--date", default="latest", help="Date partition (YYYY-MM-DD)")
    parser.add_argument("--aoi", default="data/aoi.geojson", help="AOI for spatial filter (future)")
    args = parser.parse_args()

    out_dir = Path("data/raw") / args.date
    out_dir.mkdir(parents=True, exist_ok=True)

    print("[download_raw] PR 1 stub — no downloads performed.")
    print(f"  Output dir ready: {out_dir}")
    print("  Real downloads + pagination + AOI clip implemented in later PRs per DESIGN.")


if __name__ == "__main__":
    main()
