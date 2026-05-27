#!/usr/bin/env python3
"""
scripts/aoi.py

Generate the exact committed AOI: 40-mile (geodesic-approximated) buffer around
Grand Rapids center (42.9634, -85.6681) as Polygon in EPSG:4326.

Per DESIGN.md "AOI Definition (Exact, Reproducible)" section.
The output data/aoi.geojson is the authority for all clipping/sjoins.

Modern pyproj (Transformer) used for compatibility; original DESIGN pseudocode
used the now-deprecated pyproj.Proj + transform pair (documented in comments).
"""

from __future__ import annotations

import json
from functools import partial
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import Point, mapping
from shapely.ops import transform

CENTER_LON = -85.6681
CENTER_LAT = 42.9634
RADIUS_MILES = 40.0
RADIUS_M = RADIUS_MILES * 1609.344  # 1609.344 m per mile


def build_aoi_geojson() -> dict:
    """Return GeoJSON FeatureCollection with the AOI Polygon."""
    center = Point(CENTER_LON, CENTER_LAT)

    # DESIGN pseudocode (for reference, not runnable on pyproj>=3):
    #   project = partial(pyproj.transform, pyproj.Proj('epsg:4326'), pyproj.Proj('epsg:3857'))
    #   project_back = partial(pyproj.transform, pyproj.Proj('epsg:3857'), pyproj.Proj('epsg:4326'))
    #   buffered = transform(project_back, transform(project, center).buffer(radius_m))

    # Modern equivalent (always_xy for lon/lat order safety)
    transformer_to_m = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
    transformer_back = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)

    project = partial(transformer_to_m.transform)
    project_back = partial(transformer_back.transform)

    # Buffer in Web Mercator meters (good approximation for regional 40mi; note
    # DESIGN mentions 40-mile geodesic vs Euclidean documented here)
    buffered = transform(project_back, transform(project, center).buffer(RADIUS_M))

    # As simple Polygon Feature (no holes)
    feature = {
        "type": "Feature",
        "properties": {
            "name": "Grand Rapids 40-mile AOI",
            "center": [CENTER_LON, CENTER_LAT],
            "radius_miles": RADIUS_MILES,
            "notes": "Authority for all ETL clipping and spatial joins. Generated from DESIGN.md AOI construction logic.",
        },
        "geometry": mapping(buffered),
    }

    return {
        "type": "FeatureCollection",
        "name": "aoi_40mi_grand_rapids",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::4326"}},
        "features": [feature],
    }


def main() -> None:
    out_path = Path(__file__).resolve().parents[1] / "data" / "aoi.geojson"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    fc = build_aoi_geojson()
    out_path.write_text(json.dumps(fc, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out_path} (AOI polygon, EPSG:4326, {RADIUS_MILES}mi buffer)")


if __name__ == "__main__":
    main()
