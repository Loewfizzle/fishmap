# Asset Hosting Decision Record: PMTiles + Large Static Geospatial Assets

**PR:** 4  
**Date:** 2026-05-26  
**Status:** Accepted (PR 4)  
**Deciders:** Maintainer (per DESIGN.md mandate for PR4)  
**Related:** DESIGN.md (Hosting, PMTiles sizing, PR4/7), docs/pmtiles-extract-dryrun.txt

## Context

Fishmap delivers map data via PMTiles (Protomaps regional basemap extract + custom thematic layers for access points / water). 

- App shell + small assets: <300KB gzipped → fine on GitHub + Vercel / Cloudflare Pages (current primary).
- PMTiles: custom layers for full 40-mile will be 5-15 MB; Protomaps regional extract (z12-13) estimated 10-60 MB compressed depending on exact maxzoom and rural density (see dry-run).
- These are **large binary immutable assets** that benefit from HTTP Range requests (core to PMTiles / maplibre-gl vector tile loading).
- Git history must remain clean; no bloat from binary diffs on data refreshes (quarterly).

PR 1-3 used only tiny committed sample GeoJSON. PR4 introduces the first production-grade delivery mechanism (vector tiles) + requires an explicit decision record before any large asset lands.

## Options Considered

### Option 1: Git LFS (Git Large File Storage)
- Store .pmtiles (and future) in-repo with LFS pointers.
- **Pros**: Single repo; familiar GitHub UI; free for public repos up to quota (1GB?); simple `git lfs track "*.pmtiles"`.
- **Cons**:
  - GitHub LFS bandwidth quota very low for public projects (1GB/mo free; paid after). Map tile range requests would burn quota instantly on any traffic.
  - No native CDN / global edge caching for Range requests (slow cold loads for users far from GitHub).
  - Every data refresh (even small) creates new LFS objects; history grows.
  - CORS / Range header support is indirect and not guaranteed for high-traffic tile use.
  - Violates "zero ongoing server costs" and "<$10/month" goal in DESIGN.

### Option 2: GitHub Releases + raw.githubusercontent (or jsDelivr)
- Upload PMTiles as release assets; reference by tag URL.
- **Pros**: Simple, stays "in GitHub".
- **Cons**: Releases have bandwidth limits; no strong CDN for Range; 404s on old tags after GC; not designed for high-frequency tile range requests. CORS ok but performance poor for maplibre.

### Option 3: Cloudflare R2 (or equivalent S3-compatible: Backblaze B2, Wasabi) + public bucket
- Dedicated object storage bucket. PMTiles uploaded once per data PR (or via GH Action).
- **Pros**:
  - Extremely cheap egress + storage (R2: $0.015/GB-mo storage, first 10GB free? egress free or near-free with Workers).
  - Native excellent HTTP Range support + CDN edge (Cloudflare global).
  - Simple public bucket + signed or public objects.
  - CORS fully controllable via dashboard or API (one-time).
  - Decouples large assets from Git history (only manifest + pointers in repo).
  - Matches Simon Willison / Protomaps community patterns for regional PMTiles.
  - Cost for our scale: <$1-3/month even with moderate usage.
- **Cons**: One extra account/service (but zero-cost tier sufficient); requires CORS config + bucket policy.

### Option 4: Vercel / Cloudflare Pages static hosting for PMTiles
- Put .pmtiles in the frontend deploy.
- **Pros**: No extra service.
- **Cons**: Same bandwidth/egress costs as app hosting (Vercel hobby has limits); not optimized for Range + millions of tile requests; bloats deploy.

## Decision

**Use Cloudflare R2 (public bucket) for all PMTiles (basemap regional extracts + custom thematic layers).**

- Small sample artifacts (if any) may stay in-repo temporarily under `data/processed/*.pmtiles` for PR4 demo.
- Full / production assets: uploaded to R2, referenced by stable public HTTPS URLs in `src/` (or config / manifest).
- Git LFS **rejected** for the reasons above (bandwidth + cost + performance anti-pattern for tiles).

This satisfies:
- DESIGN "R2 [Cloudflare R2 / S3] (PMTiles files)" architecture diagram.
- "sustainable ... <$10/month".
- "static-first JAMstack" + "excellent offline performance".

Fallback if R2 unavailable: Backblaze B2 (similar economics + S3 compat).

## Consequences

- **Repo stays small**: only code + manifest + tiny samples + decision docs.
- **Data PRs** (PR6+): CI or manual step uploads fresh .pmtiles to R2 (using `wrangler` or AWS CLI compat), updates manifest with new URLs + etag/sha.
- **CORS setup (mandatory for browser Range + pmtiles.js)**: one-time bucket config (documented here for future maintainers):

  Example R2 CORS (via dashboard or `wrangler`):

  ```json
  [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges"],
      "MaxAgeSeconds": 86400
    }
  ]
  ```

  - `AllowedOrigins: "*"` acceptable (public data, no secrets).
  - Must allow HEAD + GET + Range semantics (R2 does by default once CORS set).
  - Test with: `curl -I -H "Range: bytes=0-1023" $PMTILES_URL`

- **Attribution / legal**: keep Protomaps + OSM attribution in map (already in source).
- **Offline**: PWA (PR5) will cache the R2 URLs via OPFS / SW; same URLs work offline once downloaded.
- **Cost monitoring**: R2 dashboard + simple alert on egress (rarely triggers at our scale).
- **Rollback**: revert manifest commit + redeploy (instant); old objects can stay or be lifecycle-deleted.

## Migration / Implementation Notes (PR 4 → PR 7)

- PR4: this record + dry-run + sample integration (public build.protomaps.com used in dev map for basemap demo).
- PR7 (prod deploy): create R2 bucket, set CORS, first real regional extract uploaded, map URLs point at `https://<r2-public>/<fishmap>/2026-06-gr-basemap.pmtiles` (or versioned path).
- Sample `.pmtiles` (if generated locally) never promoted to R2; they are demo-only.
- Update `vite.config` / env only if needed for preview (no change required).

## References
- DESIGN.md "Hosting & Deployment", "PMTiles Sizing", PR4/5/7 sections.
- Protomaps docs: https://docs.protomaps.com/pmtiles/hosting (R2 examples common).
- Cloudflare R2 + PMTiles patterns (community + Simon Willison "datasette" / static maps).
- pmtiles CLI: `pmtiles upload ...` or rclone / wrangler for automation.

This decision is binding for v1 and all future data refreshes.
