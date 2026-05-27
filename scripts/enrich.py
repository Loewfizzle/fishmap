"""
scripts/enrich.py

Minimal enrich for PR 1 sample: attach realistic species, regulations links,
parking/facilities stubs, and static citations per DESIGN example.

Full version (later PRs) does fuzzy waterbody joins to DNR stocking + regs PDF parsing.
Manual overrides for high-traffic sites (Fish Ladder) are inline here for the sample.
"""

from __future__ import annotations

from typing import Any

# Static realistic enrichment for the 4 sample sites (sourced from DNR regs + local knowledge)
ENRICHMENTS: dict[str, dict[str, Any]] = {
    "gr-fishladder-001": {
        "parking": {
            "has": True,
            "capacity": "50+",
            "surface": "paved",
            "notes": "Large lot at 6th St Dam / Fish Ladder",
        },
        "facilities": ["restroom", "trash", "benches", "fish_cleaning", "fish_ladder_viewing"],
        "hours": "5:00 AM – 11:00 PM (city park rules)",
        "ada": "partial",
        "species": [
            "steelhead",
            "chinook",
            "coho",
            "smallmouth bass",
            "walleye",
            "channel catfish",
        ],
        "regulations": {
            "summary": "Lower Grand River special muskie rules + standard trout/salmon regs; check current DNR digest",
            "url": "https://www.michigan.gov/dnr/things-to-do/fishing/fishing-regulations",
        },
        "notes": "Excellent shore and wade fishing below dam. Strong current warning. Popular during salmon/steelhead runs. Fish viewing platform.",
    },
    "kent-johnson-002": {
        "parking": {
            "has": True,
            "capacity": "100+",
            "surface": "paved/gravel",
            "notes": "Main lots at Millennium Park + Johnson Park trailheads",
        },
        "facilities": ["restroom", "trash", "trails", "playground"],
        "hours": "Dawn to dusk (Kent County Parks)",
        "ada": "yes",
        "species": ["smallmouth bass", "northern pike", "bluegill", "crappie", "channel catfish"],
        "regulations": {
            "summary": "Standard warmwater river regs; see Kent County / DNR for Eat Safe Fish guidance on Grand River",
            "url": "https://www.michigan.gov/dnr/things-to-do/fishing/fishing-regulations",
        },
        "notes": "1.5+ miles of Grand River shoreline via Johnson Park Scenic Trail. Multiple fishing decks/ponds in adjacent Millennium Park.",
    },
    "gr-richmond-003": {
        "parking": {"has": True, "capacity": "30+", "surface": "paved"},
        "facilities": ["restroom", "trash", "benches"],
        "hours": "City park hours",
        "ada": "partial",
        "species": ["bluegill", "bass", "crappie"],
        "regulations": {
            "summary": "Standard warmwater pond regs",
            "url": "https://www.michigan.gov/dnr/things-to-do/fishing/fishing-regulations",
        },
        "notes": "Dedicated fishing pier on Richmond Park Pond. Family-friendly city park access.",
    },
    "kent-reeds-004": {
        "parking": {"has": True, "capacity": "50+", "surface": "paved"},
        "facilities": ["restroom", "trash", "playground", "beach"],
        "hours": "Park hours",
        "ada": "yes",
        "species": ["bluegill", "bass", "northern pike", "perch"],
        "regulations": {
            "summary": "Standard inland lake regs",
            "url": "https://www.michigan.gov/dnr/things-to-do/fishing/fishing-regulations",
        },
        "notes": "Popular family shore fishing on Reeds Lake with easy public access and amenities.",
    },
}


def enrich_site(site: dict[str, Any]) -> dict[str, Any]:
    """Attach enrichment + full sources + last_verified for PR1 sample."""
    sid = site["id"]
    enr = ENRICHMENTS.get(sid, {})

    # Per DESIGN + PR1: full attribution even on sample
    sources: list[dict[str, str]] = [
        {
            "name": "Michigan DNR Michigan Boating Facilities (MiBFF) + Shore Fishing resources",
            "url": "https://gis-midnr.opendata.arcgis.com/maps/3eaf9804bf6f4bafb8e03aea660c9fce",
            "retrieved": "2026-05-20",
        },
        {
            "name": "City of Grand Rapids Parks (GRData Open Data)",
            "url": "https://grdata-grandrapids.opendata.arcgis.com/",
            "retrieved": "2026-05-20",
        },
        {
            "name": "Kent County Parks & GIS Open Data",
            "url": "https://kentcountymi-accesskent.opendata.arcgis.com/",
            "retrieved": "2026-05-20",
        },
    ]

    # Add Experience GR / DNR family fishing for context where relevant
    if "reeds" in sid or "johnson" in sid:
        sources.append(
            {
                "name": "Experience Grand Rapids / DNR family-friendly fishing listings",
                "url": "https://www.experiencegr.com/things-to-do/outdoors-and-sports/fishing/",
                "retrieved": "2026-05-20",
            }
        )

    enriched = {
        **site,
        **enr,
        "sources": sources,
        "last_verified": "2026-03-15",  # conservative manual verification date for sample
    }
    return enriched


def enrich_all(sites: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [enrich_site(s) for s in sites]
