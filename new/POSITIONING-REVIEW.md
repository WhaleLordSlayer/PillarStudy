# Positioning revision — October 7, 2026

Review URL: http://127.0.0.1:8765/new/?review=positioning

Following PM review, the user explicitly authorized publishing this revision under https://www.cultivatestudy.com/new/. Publication uses the existing `gh-pages` deployment branch. The production homepage and existing deep pages have no source changes.

## Changes

- Study, Together, and Teach use the same primary section layout and comparable visual weight. Teach is no longer the disproportionately large top-level section.
- Study emphasizes understanding, personal tools, and offline discovery. Together describes a persistent private Study Space. Teach introduces reusable lessons, responses, Channels, and invite-only Live.
- Four substantial showcases follow the pillars: Explorer with scripture evidence; persistent Study Spaces; Lesson Channels with Seminary, Sunday School, and distributed Family Home Evening examples; Live Classes with host/participant device views.
- The six-step workflow explains how discoveries become saved material, lessons, sharing, and asynchronous or live teaching. Smaller feature depth remains secondary. Mobile workflow cards use two columns to limit length.
- Existing cream/sage/terracotta colors, typography, actual logo, hero composition, spacing language, and legal footer remain. The dark sage Live section uses an existing palette color for emphasis.

## Accuracy and placeholders

The user's current product checkpoint is authoritative: lessons, Channels, Study Spaces, Explorer, and supporting tools are available. Removed the homepage's old “in development” claims. Only Live is restricted to invite-only Early Access. Kept the distinction between shared thoughts in Study Spaces and lessons published through their own links or Channels; no claim of identical sharing mechanisms.

The Early Access button opens an accessible native dialog explaining that the request form is not connected. It collects no data and submits no request. Escape and Close dismiss it and return focus to the trigger. The existing beta download is available from that dialog. Wire the button to a real approved signup destination when one exists.

The existing concept UI approach continues, with explicit captions, no fabricated member activity, no fake responses, and real scripture references. New Explorer, Channel, and Live views can be replaced with real exports through `ProductVisual`. The illustrated response field is not an input or working product interaction. Detailed legacy deep-page copy was intentionally left outside this pass; those pages should be aligned in a subsequent content pass.

## Files changed

- `new/home.tsx`
- `new/components.tsx`
- `new/showcases.tsx` (new)
- `new/editorial.css`
- `new/tsconfig.json`
- `new/qa/editorial.cjs`
- `new/CODEX-BRIEF.md`
- `new/QA.md`
- `new/POSITIONING-REVIEW.md` (this file)

## Validation

Published from commit `7ee8e71` on October 7, 2026. Cloudflare build succeeded. Live browser QA passes at all four widths, including the four showcases, Early Access dialog, direct load/refresh, links, images, and console/network checks. All eight original production routes and eight detail routes pass. The main homepage matches the pre-publication snapshot after excluding hosting-injected analytics. Live evidence: `../PillarStudy-QA/positioning-live/`.

Production build and the homepage TypeScript check pass. Lint completes without errors, retaining existing warnings. Real Edge browser checks pass at 390, 768, 1440, and 1920px: direct load/refresh, navigation, keyboard skip link, mobile menu, overflow and bounds, three hero devices, four showcases, six workflow steps, feature depth, Early Access dialog behavior/focus restoration, internal links, images, and console/network checks. All eight original production routes and eight `/new/` detail routes return 200; original production route HTML matches the built output after hosting/line-ending normalization.

Evidence: `../PillarStudy-QA/positioning-built/`, including full pages, heroes, all primary/showcase sections, and `results.json`. Visually reviewed the desktop full page, mobile Channels and Live, and mobile/tablet Study and Explorer.
