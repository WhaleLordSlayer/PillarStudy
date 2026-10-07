# Homepage copy polish — October 7, 2026

Destination: https://www.cultivatestudy.com/new/

Applied the user's supplied copy throughout the hero, three-pillar introduction, Study/Together/Teach, four showcases, Early Access dialog, workflow, feature depth, trust section, final CTA, footer brand statement, metadata, and noscript fallback. The section order, composition, color, typography, and conceptual product visuals remain unchanged. No stylesheet or deep-page edits.

Live remains invite-only Early Access; the CTA retains its unconnected preview dialog and collects no details. Lessons and Lesson Channels remain available. Replaced the absolute “No AI in the app” statement with the requested, narrower claim about runtime scripture commentary. The requested wording does not conflict with the product evidence already used for this site; no feature claims were silently substituted. The Study headline uses natural wrapping rather than a forced break to avoid an isolated “yours” line at tablet width. Beta/TestFlight availability stays below CTAs.

Changed implementation: `new/home.tsx`, `new/showcases.tsx`, `new/index.html`. Updated `new/qa/editorial.cjs` for the dialog wording and metadata checks; this note records the pass.

Build and homepage TypeScript check pass. Lint completes without errors, retaining existing warnings. Browser checks cover 390, 768, 1440, and 1920px: direct load/refresh, overflow/bounds, navigation and keyboard access, all four showcases, images, Early Access dismissal/focus restoration, metadata, links, and console/network errors. Existing production and detail routes remain available. Local evidence: `../PillarStudy-QA/copy-built/`; live evidence is recorded after publication in `../PillarStudy-QA/copy-live/`.
