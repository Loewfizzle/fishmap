"""
scripts/enrich.py

PR 6 richer enrichment for expanded 40-mile dataset (Ottawa + Allegan sites added).
Species/regulations tailored per waterbody (Lake Michigan vs Grand River vs inland).
Follows PR1 patterns + DESIGN enrich_species_and_regs sketch exactly.
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
    # PR 6 Ottawa + Allegan richer entries (species tuned to Lake Michigan / river mouth)
    "ottawa-ghstate-005": {
        "parking": {"has": True, "capacity": "200+", "surface": "paved"},
        "facilities": ["restroom", "trash", "showers", "beach"],
        "hours": "24h access (state park)",
        "ada": "yes",
        "species": ["yellow perch", "chinook salmon", "coho", "lake trout", "brown trout"],
        "regulations": {
            "summary": "Lake Michigan special regs + salmon rules; check current DNR",
            "url": "https://www.michigan.gov/dnr/things-to-do/fishing/fishing-regulations",
        },
        "notes": "Popular Lake Michigan shore fishing. Strong currents; wading caution advised. Ottawa County priority site.",
    },
    "ottawa-pigeon-006": {
        "parking": {"has": True, "capacity": "40+", "surface": "gravel"},
        "facilities": ["restroom", "trails"],
        "hours": "Dawn to dusk",
        "ada": "partial",
        "species": ["smallmouth bass", "northern pike", "perch", "bluegill"],
        "regulations": {
            "summary": "Standard warmwater + Lake MI tributary rules",
            "url": "https://www.michigan.gov/dnr/things-to-do/fishing/fishing-regulations",
        },
        "notes": "County park with creek + Lake Michigan confluence access. Good wade fishing.",
    },
    "allegan-saug-007": {
        "parking": {"has": True, "capacity": "30+", "surface": "paved/gravel"},
        "facilities": ["restroom", "trails"],
        "hours": "Park hours",
        "ada": "partial",
        "species": ["chinook", "coho", "steelhead", "yellow perch"],
        "regulations": {
            "summary": "Kalamazoo River / Lake MI mouth regs (trout/salmon emphasis)",
            "url": "https://www.michigan.gov/dnr/things-to-do/fishing/fishing-regulations",
        },
        "notes": "Scenic Allegan County dune/shore access near Saugatuck. High day-trip value from GR.",
    },
    "allegan-douglas-008": {
        "parking": {"has": True, "capacity": "20+"},
        "facilities": ["none noted"],
        "hours": "Public access",
        "ada": "no",
        "species": ["smallmouth bass", "northern pike", "walleye"],
        "regulations": {
            "summary": "River mouth standard regs; Eat Safe Fish advisory for Kalamazoo",
            "url": "https://www.michigan.gov/dnr/things-to-do/fishing/fishing-regulations",
        },
        "notes": "Natural river mouth shore access in Allegan. Informal but public; verify boundaries.",
    },
    "ottawa-ruralend-009": {
        "parking": {"has": False},
        "facilities": [],
        "hours": "No posted restrictions (verify locally)",
        "ada": "no",
        "species": ["perch", "salmon (seasonal)"],
        "regulations": {
            "summary": "Standard Lake MI shore regs",
            "url": "https://www.michigan.gov/dnr/things-to-do/fishing/fishing-regulations",
        },
        "notes": "Informal road-end access (flagged needs_review per DESIGN road-end heuristic). Use caution; private land nearby.",
    },
    "kent-ada-010": {
        "parking": {"has": True, "capacity": "25+", "surface": "gravel"},
        "facilities": ["trails"],
        "hours": "Dawn to dusk",
        "ada": "partial",
        "species": ["smallmouth bass", "channel catfish", "carp"],
        "regulations": {
            "summary": "Upper Grand River warmwater regs",
            "url": "https://www.michigan.gov/dnr/things-to-do/fishing/fishing-regulations",
        },
        "notes": "Township park river shore. Good eastern coverage in 40-mile radius.",
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

    # PR 6: county-specific sources for Ottawa/Allegan expanded coverage (richer provenance)
    if "ottawa" in sid:
        sources.append(
            {
                "name": "Ottawa County GIS / Parks Open Data + Michigan DNR",
                "url": "https://www.miottawa.org/ (GIS Hub search) + https://gis-midnr.opendata.arcgis.com/",
                "retrieved": "2026-05-26",
            }
        )
    if "allegan" in sid:
        sources.append(
            {
                "name": "Allegan County GIS / Parks + Saugatuck area public access data",
                "url": "https://www.allegancounty.org/ (open data) + DNR portals",
                "retrieved": "2026-05-26",
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
