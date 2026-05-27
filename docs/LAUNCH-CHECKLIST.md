# Fishmap First Public Announcement / Launch Checklist (PR 7)

**Status**: Ready for controlled beta → public launch (post-PR7 merge). Site is production-hardened even if initially unadvertised.

Use this before any public posts. Tick items only when complete. Reference DESIGN.md "Rollout Plan" + "Public Launch (PR 7)".

## Pre-Launch Technical / Ops (PR 7 Deliverables)
- [ ] `vercel.json` deployed + CSP headers verified (use https://securityheaders.com or curl -I)
- [ ] Production R2 bucket created, CORS set exactly per docs/ASSET-HOSTING.md, Range requests tested (`curl -I -H "Range: bytes=0-1023" $URL`)
- [ ] PMTiles URLs in `src/App.tsx` point to R2 (or staged for first data PR)
- [ ] `npm run build` clean; preview deploy on Vercel works (mobile + desktop)
- [ ] Disclaimers visible and prominent: shell banner, every detail panel, saved panel, footer, README (test by loading app)
- [ ] Privacy analytics placeholder active or dashboard toggle enabled (Vercel Analytics / Cloudflare; confirm no PII)
- [ ] GitHub issue templates live (test by opening new issue)
- [ ] `docs/ETL-RUNBOOK.md`, `DATA-SCHEMA.md`, updated `CONTRIBUTING.md`, `CHANGELOG.md`, `LAUNCH-CHECKLIST.md` published in repo
- [ ] ETL dry-run Action works (manual dispatch test) + produces usable manifest diff + PR scaffold
- [ ] PWA install + offline region download tested on real mobile device(s)
- [ ] `make etl-sample && make etl-validate` green in clean clone
- [ ] All links in README / docs resolve; no broken references

## Legal / Hygiene
- [ ] Full disclaimer wording reviewed (matches DESIGN canonical)
- [ ] No over-promising language in UI or README ("authoritative" tempered with "verify on site")
- [ ] LICENSE + no warranty language intact
- [ ] (Optional) Quick attorney glance on recreational use disclaimer (Michigan) if public traffic expected

## Announcement Prep
- [ ] Short announcement draft ready (example below; customize):
  > "Fishmap is a free, mobile-first, offline-capable map of public shore, dock, and bank fishing access within 40 miles of Grand Rapids, MI. Built from DNR + county GIS data with full citations on every point. Works great in the field after one download. https://your-vercel-url  (Data is compiled from public sources — always verify on site. Not legal advice.) Feedback welcome via GitHub issues or the in-app saved spots."
- [ ] Target channels identified (examples): r/grandrapids, r/MichiganFishing, local Facebook fishing groups, Experience GR contacts, bait shops (paper flyer?), DNR education contacts. Start with closed beta invite list first.
- [ ] "Unlisted" or low-key initial share plan (per DESIGN private alpha → closed beta → public)
- [ ] QR code or shortlink for field use prepared (optional)
- [ ] Response plan for first feedback (use data-report + suggest-access templates)

## Post-Announcement (First 30 days)
- [ ] Monitor Vercel + R2 logs for usage / errors
- [ ] Triage incoming GitHub issues with templates
- [ ] Plan first quarterly data refresh (use etl-dry-run Action + runbook)
- [ ] Collect qualitative feedback (UX friction, data gaps)
- [ ] Update DESIGN.md or this checklist with lessons

## Rollback / Incident
- Vercel instant revert for code
- Git revert for data + redeploy
- R2: keep prior versioned objects

**Announcement is only after all above boxes are green.**

This checklist + the production artifacts (CSP, disclaimers everywhere, automation, docs) fulfill the "publicly accessible, production-hardened site ... Ready for controlled beta → public launch" PR 7 deliverable.
