# Cultivate marketing site direction

Publication authorization — October 7, 2026: the user explicitly approved pushing the reviewed site to the real site under `/new/`. This supersedes the earlier deployment restriction below. Keep the production homepage and existing production routes intact.

Current homepage direction — October 7, 2026: the user's pasted Stitch brief supersedes the earlier homepage layout, palette, and no-concept-mockup instruction below. Implement only the `/new/` homepage and reusable design system in this pass. Stitch is the visual reference, not the product source. Study / Together / Teach lead the cream/sage/terracotta editorial page. Conceptual product views are authorized, must use real Cultivate concepts, and must be labelled. Shared participation and Live need cautious availability language. Do not merge, deploy, replace production, or build new deep pages. See STITCH-REVIEW.md for current implementation, deviations, validation, and PM review items. Earlier notes below document the previous iteration and existing detail pages.

User direction — October 6, 2026.

The site’s goal is to bring people into the app. Homepage priorities:
1. Connect families, friends, and classes through Study groups and Shared lessons. Lesson Builder is a supporting tool, not the lead product story.
2. Deep, offline scripture discovery with no AI in the app: Scripture Explorer and source-backed references.
3. Shared lessons for Live and self-paced participation; keep Reading Study Spaces and Lesson Channels distinct.
4. Modern reader: Chapter and Scroller
5. Topical Guide

Deeper product and Labs pages support the homepage; they do not crowd it. Current deployment remains under /new/ on gh-pages. The user permits a complete redesign. Root, legal pages, and existing Labs research pages remain available.

Public feature name is always Topical Guide. Its construction history belongs in background documentation and Labs, not its public name or homepage positioning.

Emphasize offline study and no AI in the app. Scripture, packaged discovery data, and personal lesson creation work offline. Sharing, sync, group updates, and Live need a connection; do not promise offline collaboration.

Reading Study Spaces and Lesson Channels are distinct. A one-off lesson can be shared through its own link/code without a Channel. Public copy follows the October 5 Notion sharing and Live checkpoints, including private teacher notes and static question prompts.

Use real valid product screenshots. New screenshots are pending; keep honest screenshot slots rather than creating fake UI. See SCREENSHOTS.md for slot identifiers and requested captures. No video. Preserve the Church non-affiliation disclaimer.

Download flow uses the verified existing iOS TestFlight invitation and Android signup / closed-testing links. Do not invent public App Store listings or call iOS coming soon while its beta is accessible.

Run npm run build and npm run lint. Run python new/qa/check-assets.py and node new/qa/site.cjs with Playwright. Test both built output and deployed pages at all six widths. Review the actual screenshots and compare fetched asset bytes with audited sources.
