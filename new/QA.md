# Full marketing site QA — October 6, 2026

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
