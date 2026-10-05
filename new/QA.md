# /new/ screenshot QA — October 5, 2026

## Changes

- Lessons 2.0 and Live Lessons are consecutive headline sections. Mastery retains a full, uncropped Quick Practice screenshot and all four practice modes.
- All product images are real screenshots. Replaced corrupt Study Space and Reader references with valid repository sources; replaced Home with a real reading-plan screenshot. Supporting “topics” was actually a reading-goal screen, so its caption now describes that screen accurately.
- Screenshots use intrinsic dimensions and their full aspect ratios. Labels sit outside the product UI. Removed absolute-positioned overlaps, hidden horizontal overflow, and screenshot crops.
- Visible text went from 533 to 383 words (28% less). Mobile navigation remains accessible. The Church disclaimer and beta links are retained. No video.
- Self-hosted the existing DM Sans and Literata fonts with their OFL licenses, avoiding third-party requests on this page.
- Root and `/new-site/` remain untouched.

## Source audit and remaining gap

Strict Pillow decoding failed for `new/assets/home.webp` and `new/assets/live-participant.webp`. Every historical version of these files also failed. Browser rendering recovered only partial content: Home showed damaged pixels at the bottom; participant showed severe corruption halfway down. Browser `decode()` nevertheless resolved, which is why strict byte decoding AND visual inspection are both required.

**Still needed: a fresh full-resolution wide Live Lesson participant/follower export.** The page currently shows the intact iPhone host screenshot, including its private teacher note. It does not claim to show the participant view. The corrupt participant and Home files were removed from `/new/`; Git history preserves them for diagnosis. Do not restore them or re-encode a partially decoded image. After the participant source arrives, add it beside the host and repeat both QA checks and visual inspection.

The current light-theme Home export is also unavailable. A valid actual reading-plan screenshot is used instead. The older dark-theme Study Space and plan sources are genuine product screenshots, but newer matching light-theme exports would improve consistency. Remaining light screenshots are relatively small (280–600px wide); higher-resolution originals would improve Retina sharpness.

Asset provenance:

| New asset | Repository source |
| --- | --- |
| `assets/study-space.webp` | `public/assets/IMG_0940.PNG`, strictly decoded and resized to 660px |
| `assets/reading-plans.webp` | `public/assets/IMG_0932.PNG`, strictly decoded and resized to 660px |
| `assets/reader.webp` | `assets/screens/reader.webp`, strictly decoded |
| `assets/reading-goal.webp` | `new-site/assets/topics.jpg`, strictly decoded; corrected caption |

Other Lesson, Live host, Explorer, and Mastery images pass strict decoding and are retained. Corrupt assets outside `/new/` were not changed.

## Verification

Fresh Edge browser contexts at 1440, 1280, 1024, 768, 430, and 390px:

- All 13 image elements load, decode, and receive HTTP 200.
- No document or element horizontal overflow; no screenshot height clipping.
- All navigation and hero anchors land at their section heading with 24px clearance.
- Root, beta, Explorer, and Privacy URLs return HTTP 200.
- No console errors, uncaught page errors, failed network requests, or non-200 responses.
- Self-hosted fonts load. No video or malformed text encoding.
- Full-page screenshots captured and visually inspected across desktop, tablet, and mobile layouts; further section inspections confirmed full host private note, Explorer Connections/Map, Reader, and Mastery controls remain visible.

Two layout iterations followed inspection: full screenshots replaced overlapping crops; font rendering, text encoding, and the mislabeled reading-goal image were corrected before the final checks.

## Repeatable checks

From the repository root, run a static server, for example `python -m http.server 8765 --bind 127.0.0.1`.

Run `python new/qa/check-assets.py` with Pillow installed. This refuses truncated bytes and validates every declared image dimension.

Run `node new/qa/browser.cjs` with Playwright available. `QA_BROWSER` can point to a local Chrome/Edge executable. `QA_URL` defaults to `http://127.0.0.1:8765/new/`; set it to the live URL for deployed verification. `QA_OUTPUT` chooses the directory for screenshots and `results.json`. The default output directory is outside the repository. Inspect the resulting screenshots; passing browser decoding alone cannot establish that an image is intact.
