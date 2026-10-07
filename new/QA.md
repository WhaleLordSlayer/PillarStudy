# Full marketing site QA — October 6, 2026

Latest publication — October 7, 2026: the positioning revision is live at https://www.cultivatestudy.com/new/ from `7ee8e71`. Cloudflare build and browser QA at 390, 768, 1440, and 1920px pass. Early Access dialog behavior, all four showcases, existing routes, and unchanged production homepage content are verified. Evidence: `../PillarStudy-QA/positioning-live/`. The local-review note below records the checkpoint before publication approval.

Current positioning pass — October 7, 2026: local review at http://127.0.0.1:8765/new/?review=positioning. Equal primary pillars and four substantial showcase sections are verified at 390, 768, 1440, and 1920px. Build/typecheck pass; lint has no errors. Early Access opens an honest placeholder dialog, with dismissal and focus restoration checked. Evidence: `../PillarStudy-QA/positioning-built/`. This latest revision is not published; see POSITIONING-REVIEW.md. Publication notes below refer to the prior version.

Publication verification — October 7, 2026: approved redesign published under https://www.cultivatestudy.com/new/ from `e286b34`. Cloudflare build succeeded. Live editorial checks pass at 390, 768, 1440, and 1920px; all existing production and detail routes load successfully. Main homepage content matches the pre-publication snapshot, excluding Cloudflare's injected analytics beacon. Evidence: `../PillarStudy-QA/stitch-live/`. HTML comparisons account for line-ending normalization and hosting analytics.

Current homepage QA — October 7, 2026: the Stitch-based React homepage is verified with `node new/qa/editorial.cjs`, not the previous homepage's tab-based tests below. Build and `npx tsc --noEmit -p new/tsconfig.json` pass. Browser checks pass at 390, 768, 1440, and 1920px, including direct load/refresh, three visible device mockups, navigation, menu, skip link, overflow/bounds, internal links, content checks, and console/network. Eight existing production routes and eight existing detail routes load; production source is unchanged. Reviewed full desktop/mobile/tablet and per-section/footer screenshots in ../PillarStudy-QA/stitch-built/. STITCH-REVIEW.md contains the full current report. Everything below records earlier iterations.

## Botanical redesign follow-up

Positioning follow-up: families/classes, Study Spaces, and shared lessons now lead the hero, navigation, and homepage sections. Explorer follows with offline, source-backed discovery and no AI-generated commentary in the app. Removed the homepage Builder screenshot; sharing and Live precede Builder on the Lessons page. Production build, lint, and strict image audit pass (13 image elements); browser evidence for the revised hierarchy is in ../PillarStudy-QA/people-built.

Palette follow-up: inspected the actual published main site's screenshot and computed colors, then aligned /new/ to its navy, teal, paper, and neutral supporting palette. All page heroes, buttons, dark sections, decorative motifs, and footer colors follow that palette. Production evidence for this pass is in ../PillarStudy-QA/palette-built.

The new homepage introduces a botanical hero, an accessible interactive feature chooser, distinct feature compositions, and a shared visual update across all nine pages. Source notes are in DESIGN.md. The prior publication described below remains historical; this follow-up has not been deployed.

Production build and lint pass (lint retains pre-existing warnings in unrelated files). Strict Pillow audit passes for all 14 image elements. Production browser QA passes on all nine routes at 1440, 1280, 1024, 768, 430, and 390px: images, image hashes, links, overflow, skip link, mobile menus, section anchors, FAQ controls, console, and network. Added click and keyboard checks for all five homepage tabs, including wraparound, Home, End, selected state, and destination links. Image aspect-ratio measurement now uses computed dimensions because transformed bounding rectangles measure the rotation, not the image's proportions.

Evidence: ../PillarStudy-QA/garden-built. Visually reviewed desktop homepage and Lessons, mobile homepage, feature chooser, and Download. Removed decorative ring overflow and corrected whitespace when mobile paragraph line breaks disappear. No product screenshots were synthesized. Homepage group/topic illustrations replace its old pending screenshot slots; detail-page capture slots remain.

## Scope and outcome

Nine coherent static pages under /new/: Home, Lessons, Study groups, Explorer, Reader, Topical Guide, More to explore, Labs, and Download. Each page uses the shared editorial style, self-hosted fonts, navigation, conversion CTA, and legal footer. The build registers every route explicitly in vite.config.ts; direct links do not depend on an SPA fallback. No site JavaScript is needed for the menu or FAQ controls.

The homepage focuses on the five requested core features. Mastery and supporting tools move to More to explore. Labs links to existing research pages, keeping the homepage concise. Public wording is Topical Guide. Offline and no-AI messaging refers to the app; connected sharing and Live are explained accurately.

## Iterations

1. Rendered all nine authored pages at six widths. Reused real screenshots, replaced stale leaderboard imagery with screenshot slots, and checked menu / FAQ / link behavior.
2. Visual review showed an overly tall home hero. Removed its redundant second screenshot and message, making the download action visible earlier.
3. Built the production site, tested all direct routes, removed the unnecessary default outline around programmatically focused main content, and moved the QA pointer off links before captures.
4. Final built and deployed checks use fresh isolated Edge contexts. Evidence is saved outside Git in ../PillarStudy-QA/site-first, site-built, site-final, and site-live. Hero, full-page, and section captures support visual review.

## Checks

- npm run build succeeds and emits all nine marketing routes.
- npm run lint succeeds. Existing warnings are in unrelated React and graph-viewer files.
- Strict Pillow audit covers all 14 image elements and every local WebP. Intrinsic dimensions match declared dimensions. Seven unique screenshot files are used.
- Browser matrix: 1440x1000, 1280x1000, 1024x768, 768x1024, 430x844, 390x844, on all nine routes (54 page/viewport combinations per complete run).
- HTTP 200, image decoding, full aspect ratios, meaningful alt text, no horizontal overflow, no console/page errors, no failed network requests.
- Keyboard skip link, mobile menu (all seven links), section anchors, download FAQ controls, one h1 per route, non-affiliation footer, no video, no malformed encoding.
- All same-origin navigation, legal, and research destinations return HTTP 200. Fetched screenshot SHA-256 hashes match strictly audited local source files, including host-fingerprinted asset filenames. Fetched bytes are also strictly decoded with Pillow.
- The iOS TestFlight invitation returns HTTP 200 and identifies Cultivate Study, with no full/closed-beta notice. The Android signup form returns HTTP 200 and identifies Android App Beta Signup. The approved-user testing link correctly redirects to Google sign-in. No forms were submitted and no account actions were taken.

## Pending screenshots

See SCREENSHOTS.md. Current placeholders are intentional, labelled screenshot slots, not broken requests or fabricated UI. Pending: cooperative Study Space overview, Shared Thoughts, Lesson Channel, wide Live participant view, Chapter reader, Topical Guide overview and topic detail. Higher-resolution populated Builder and other product exports would improve sharpness and storytelling.

Every historical participant WebP audited in the prior pass was corrupt. No valid replacement original was found. Old leaderboard / plan screenshots are no longer used on the new site.

## Repeat

Run a static server at repo root for authored HTML or at dist for the production build. QA_URL chooses the /new/ base URL. QA_OUTPUT chooses an evidence directory outside Git. QA_BROWSER can point to Edge/Chrome. Run node new/qa/site.cjs with Playwright available through NODE_PATH; browser.cjs is a compatibility wrapper. Run python new/qa/check-assets.py with Pillow. Inspect the resulting screenshots rather than treating decode() alone as proof of valid source bytes.
