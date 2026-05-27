# How to Add New Fishing Spots

This guide helps you add real public shore/dock fishing locations to Fishmap without needing to do a full quarterly data refresh.

> **Goal**: Make it easy for you (or contributors) to expand the map with good, verified locations.

## When to Use This Guide

Use this when you find a new good public fishing spot and want to add it to the map.

For a complete refresh of many locations, see the full [ETL Runbook](./ETL-RUNBOOK.md) instead.

## Step-by-Step: Adding a New Spot

### 1. Find and Verify a Real Location

- Use official sources:
  - Michigan DNR maps and reports
  - County or city park websites
  - Google Maps + Street View (for initial scouting only)
- Confirm it is **public** access (not private property).
- Take note of:
  - Exact name / location
  - Access type (bank, pier, dock, wade, etc.)
  - Parking situation
  - Any facilities (restrooms, etc.)
  - Known species if available

### 2. Add the Spot to the Curated Data

Currently the data lives in a curated list inside the scripts.

Open this file:
scripts/classify.py

Look for the SAMPLE_SITES list and add a new entry following the existing pattern.

Example structure:
`python
{
    "id": "your-unique-id",
    "name": "Spot Name",
    "lat": 42.1234,
    "lon": -85.5678,
    "raw_type": "bank",           # or "pier", "dock", etc.
    "county": "Kent",             # or Ottawa, Allegan, etc.
    "notes": "Good wade fishing here...",
}
`

### 3. Add Better Information (Enrichment)

Open scripts/enrich.py and add details for your new spot:

- Parking info
- Facilities
- Target species
- Regulations notes
- Good sources (DNR page, county park page, etc.)

### 4. Regenerate the Data

Run:
`powershell
npm run etl-sample
`

This will rebuild the ccess_points_sample.geojson and manifest.json with your new spot included.

### 5. Verify Your Changes

Run:
`powershell
npm run etl-validate
`

Make sure there are no errors.

### 6. Test in the App

`powershell
npm run dev
`

- Check that your new spot appears on the map
- Open the detail panel and verify the information looks good
- Test the filters (does it show up under the correct access type?)

### 7. Commit and Open a PR

- Commit your changes (usually just the updated scripts/ files and the regenerated data in data/processed/)
- Write a clear PR description with:
  - Name and location of the new spot
  - Why you believe it's good public access
  - Links to your sources
  - Screenshots if possible

## Tips for Good Contributions

- Prioritize spots that are **well documented** publicly.
- One well-verified spot is better than five questionable ones.
- Always include sources — this is non-negotiable for trust.
- If you're unsure about access type or quality, mark it conservatively.

## Next Level: Full Data Refresh

When you want to do a bigger update across many locations, follow the complete process in [docs/ETL-RUNBOOK.md](./ETL-RUNBOOK.md).

That guide covers downloading fresh data from the portals, running proper classification, and doing a full review.

## Questions?

Open a GitHub issue with the label data or question. Include any sources you're working from.

---

**Thank you** for helping make Fishmap more useful for local shore anglers!
