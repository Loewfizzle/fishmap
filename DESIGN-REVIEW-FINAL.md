# Design Document Review (Re-Review): Fishmap: Accurate Interactive Shore & Dock Fishing Map for the Grand Rapids, Michigan Area

**Reviewer:** Senior Staff Engineer (via Grok Build subagent)  
**Re-Review Date:** 2026-05-26 (after writer revisions)  
**Original Review Date:** 2026-05-26  
**Design Doc Version:** 1.0 (post-revision)  
**Design File:** /tmp/grok-design-doc-1d59ef14.md  
**Updated Review File (with writer responses):** /tmp/grok-design-review-1d59ef14.md (read in full)  
**Writer's Summary:** /tmp/grok-design-summary-1d59ef14.md  
**Workspace Verified (unchanged):** C:\Users\benja\Documents\fishmap (empty working tree, only `.git` with 0 commits — greenfield)

---

## Summary

**Verdict: Approved for execution. 0 open issues.**

All seven prior issues (including the three major blockers) have been properly and thoroughly addressed in the revised design document. The writer added a substantial new "Data Acquisition Reality & Implementation Notes" subsection containing exactly the requested concrete artifacts (layer IDs, attribute tables, full pseudocode for classification and shore inference, AOI construction code with `data/aoi.geojson`, JSON Schema, MapLibre filter/paint expressions, script contracts, validation rules, automation caveats, and contact fallback). The PR Plan was consolidated from 11 to 8 realistic PRs with explicit "independently valuable deliverables" for each, early foundational elements (CI workflow, Dockerfile.etl + justfile for tippecanoe/GDAL, LFS vs. R2 decision record, aoi/schema in PR 1), and an updated 6–9 month part-time timeline. Additional targeted improvements resolved the four minor/nit issues without introducing scope drift, contradictions, or new problems.

The three major issues are now resolved to the point that an engineer can begin coding from the document (particularly PR 1 and PR 2). The PR Plan is practical and well-ordered for a greenfield effort. Key Decisions remain sound and reinforced. The strict 40-mile Grand Rapids shore/dock fishing focus is unchanged and even more clearly supported by the new Data Sources Inventory table and ETL Reality notes.

No new issues were identified in the revisions. The document is now a complete, unambiguous, executable blueprint.

---

## Previously Addressed Issues (Not Re-Listed)

All issues from the initial review (Issues 1–7) have been marked "addressed" by the writer with detailed responses. Re-reading the revised design document confirms each was resolved with precise, sufficient additions:

- Issues 1 & 3 (ETL claims, specificity, pseudocode, layer IDs, attributes, AOI, schema, MapLibre expressions, script contracts): Fully addressed by the new comprehensive "Data Acquisition Reality & Implementation Notes" subsection (see citations below).
- Issue 2 (PR Plan): Fully addressed by the complete rewrite to 8 PRs with deliverables and foundations.
- Issues 4–7 (offline sizing, Kent/surrounding counties, terminology, missing Alternative 4): Fully addressed with targeted expansions (PMTiles notes + dry-run example, full Data Sources Inventory table, terminology normalization, new Alternative 4 with pros/cons/rejection rationale).

No re-listing is required as all were properly addressed. No residual gaps remain in these areas.

---

## New Issues Identified in Re-Review

None.

The revisions are additive, consistent with the original architecture and goals, and introduce no contradictions, scope creep, or new problems.

---

## Confirmation of the Three Major Issues (Now Resolved)

**Major Issue 1 (ETL specificity + classification + AOI + layer details) — Resolved.**

The new subsection "Data Acquisition Reality & Implementation Notes (Addresses Issues 1 & 3)" (immediately after Core Data Products) directly supplies:
- Exact DNR layer: "Item ID `3eaf9804bf6f4bafb8e03aea660c9fce`" with sample Python/geopandas REST query code and download patterns.
- Full "Attribute Table for Classification (Key Fields Used)" covering DNR MiBFF (`NAME`, `OWNERSHIP`, `TYPE`, `RAMP_CODE`, `AMENITIES`, etc.), county parks/parcels, and hydro (`FType`/`FCODE`).
- "AOI Definition (Exact, Reproducible)": Committed `data/aoi.geojson` (EPSG:4326 Polygon) + complete working Python code using shapely + pyproj for the 40-mile buffer around 42.9634, -85.6681 (with explicit great-circle vs. projected CRS handling and edge-case notes).
- Detailed pseudocode for `classify_access_point(row, parks_gdf, hydro_gdf, parcels_gdf)`, `infer_shore_segments(...)`, `enrich_species_and_regs(...)`, and `validate_and_export(...)` (including 30m hydro buffer + park intersection + private parcel exclusion logic, road-end detection, and manual override patterns).
- "Required Output JSON Schema (Draft; enforced in export/validate)" with required fields, `access_type` enum, geometry rules, and citation requirements.
- Explicit automation reality check: "full end-to-end automation of 'shore access classification' is **not** a simple one-script download-and-clip operation. Significant maintainer judgment, spatial heuristics, and at least one round of manual verification per refresh are required."
- Contact fallback, CRS/simplification/citation rules, and `DATA-VERIFICATION.md` expectation.

An engineer can now implement the ETL pipeline starting from these artifacts.

**Major Issue 2 (PR Plan consolidation + realism + foundations) — Resolved.**

The entire "PR Plan" section was rewritten:
- Consolidated to exactly **8 PRs** (down from 11).
- Timeline updated to "**Estimated timeline: 6–9 months part-time**".
- Every PR now explicitly lists an "**Independently valuable deliverable**" (e.g., PR 1: "`make etl-sample` ... produces a validated `manifest.json` + GeoJSON conforming to schema, and passes CI"; PR 2: "working local `npm run dev` map ... with real sample data + filters"; PR 5: "the entire app ... works completely offline on airplane mode").
- Early foundations added: PR 1 owns `.github/workflows/ci.yml` (lint + schema validation + sample ETL + tippecanoe dry-run), `Dockerfile.etl` + justfile/Makefile with tippecanoe/GDAL targets, `data/aoi.geojson` + schema + pseudocode, and sample provenance data. PR 4 owns explicit LFS vs. R2 decision record (`docs/ASSET-HOSTING.md` + CORS notes).
- Safe limited parallelism noted for PRs 1–2.
- Rollout Plan and success metrics realigned to the new 8-PRs numbering.
- "Key foundational elements added early" section at the top of the PR Plan.

The plan is now practical, lower-overhead, and executable for a part-time maintainer or small team.

**Major Issue 3 (Implementation gaps — schema, MapLibre expressions, script contracts, AOI) — Resolved.**

Same new ETL Reality subsection + supporting changes provide:
- Full script contracts ("All scripts live in `/scripts/`, invoked via `python -m scripts.cli ...` or a `justfile` / Makefile").
- Concrete MapLibre code in the subsection (and cross-referenced in Frontend Architecture): exact layer definition, `shoreDockFilter` array using the `access_type` enum, paint expressions with `match` on access_type, and "Shore & Dock Only" toggle pattern.
- AOI construction code (quoted above).
- JSON Schema draft with enforcement notes.
- Expanded sample feature (dates normalized to "— as of latest ETL run").

Combined with the PR 1/2 deliverables and the new Data Sources Inventory table, there are no remaining invention gaps for initial implementation.

---

## Confirmation Points (Special Attention Areas)

**PR Plan practicality**: Yes. 8 focused, ordered PRs with named concrete deliverables, early CI/reproducibility foundations, asset decision, and realistic timeline. Each slice provides standalone value and can be reviewed independently. Far superior to the original 11-PRs fragmentation.

**Key Decisions still hold**: Yes. All 8 (especially #1 static JAMstack/PMTiles, #2 strict 40-mile shore focus, #3 in-repo Python ETL, #4 PMTiles, #6 citations first-class, #7 PWA offline day-one, #8 incremental PRs) are reinforced by the new details. No contradictions. The added ETL pseudocode and asset decision record directly support Decisions 3 and 4.

**Shore-fishing 40-mile Grand Rapids focus remains crisp, no scope drift**: Yes. The target area, Goals/Non-Goals, "only or primarily confirmed or high-likelihood public shore/dock...", de-emphasis of boat launches, and all examples (Fish Ladder Park, Johnson Park) are identical. New additions (Data Sources Inventory table with shore-specific notes/gaps, ETL Reality emphasis on "shore-first value" via classification heuristics, updated Open Question #1 referencing the table) strengthen the focus without any broadening.

---

## Strengths (Updated for Re-Review)

- All original strengths preserved and enhanced (greenfield accuracy, architecture justification, provenance emphasis, verifiable external references, diagrams, and risk handling).
- **Dramatic improvement in implementability**: The new ETL Reality subsection + 8-PRs plan + concrete code snippets (pseudocode, AOI construction, MapLibre filters, schema) transform the document from "high-level blueprint with gaps" to "engineer-ready specification."
- **Honest realism about data work**: The explicit "Reality Check" language, manual verification expectations, and contact fallback prevent over-optimism while still providing actionable paths.
- **Data sources rigor**: The new Inventory table (with preferred REST/direct methods, explicit "JS-heavy site limitations" note, and surrounding-county prioritization/gaps) is an excellent addition that directly supports automation and quarterly refreshes.
- **No regression on focus or architecture**: The 40-mile shore/dock emphasis and static-first JAMstack choices are unchanged and better documented.

---

## Additional Checklist Notes (Post-Revision)

- **Completeness**: Now excellent. New subsections (ETL Reality, Data Sources Inventory, Alternative 4, PMTiles Sizing Notes) and PR Plan rewrite close all prior gaps. Only minor future niceties remain (e.g., a full risk register table or committed `docs/access-point-schema.json` file as a PR 1 artifact).
- **Correctness**: All claims remain accurate (verified previously); revisions add precise, current layer IDs, code patterns, and portal guidance that match real 2026 sources.
- **Feasibility**: Strongly improved. With the pseudocode, schema, CI foundations, and AOI details, a part-time engineer can execute PR 1 immediately and deliver the first valuable artifact.
- **Scalability / Security / Operability**: Unchanged and sound.
- **Alternatives**: Now stronger with the balanced new Alternative 4.
- **Risks / Clarity**: Significantly better. The ETL Reality notes and explicit deliverables reduce ambiguity to near-zero for initial implementation.
- **No new blocking or minor issues found**.

**End of Re-Review Notes**

**Recommendation**: The design document is **approved for execution**. Begin with PR 1 (repository bootstrap + CI + ETL dev environment + sample data). The three major concerns have been fully resolved with the exact artifacts requested. An engineer can implement from this document without further invention on the core hard problems (data classification logic, AOI handling, layer integration, or incremental delivery plan).

---

**Open Issues Count: 0**

**Approval Status: Approved for execution.** All prior issues (7 total, 3 major) properly addressed. No new issues introduced. The document is now ready for implementation as a greenfield project.