# Stitch homepage review — October 7, 2026

## Review route

http://127.0.0.1:8765/new/?design=stitch

The production homepage is unchanged. Following review, the user explicitly authorized publication under https://www.cultivatestudy.com/new/. Publication uses the existing `gh-pages` deployment branch. No package change, build-config change, or new deep-page implementation was performed.

## Implementation

Inspected the existing static production homepage, React source, package scripts, Vite multipage inputs, shared assets, TypeScript configurations, and Wrangler build/deployment settings before editing. `/new/` was already an explicit Vite input. This pass uses the installed React/TypeScript stack for reusable homepage components and a separate CSS entry; existing production and `/new/` detail pages keep their own entries and styles. The app needs no Tailwind CDN, external fonts, or generated image URLs from Stitch.

Files authored or replaced in this pass:

- `new/index.html`: direct-load HTML entry, metadata, favicon, JavaScript-disabled fallback.
- `new/home.tsx`: homepage content, navigation, Study/Together/Teach, workflow, feature depth, About, download CTA, footer.
- `new/components.tsx`: actual Brand, buttons, section headings, replaceable product visuals, devices, Reader/Space/Builder concept views, participation view.
- `new/editorial.css`: scoped homepage design tokens, layouts, typography, device composition, responsive rules.
- `new/tsconfig.json`: typecheck for the homepage and its shared components.
- `new/qa/editorial.cjs`: browser and route regression checks with screenshot evidence.
- `new/DESIGN.md`, `new/CODEX-BRIEF.md`, and this review note: current direction and handoff.

Other changed files shown by Git belong to the earlier iterations in this chat. They were retained. Production `index.html`, `styles.css`, `src/`, package files, Vite config, and Wrangler config have no diff from the checked-in version.

## Stitch fidelity and deliberate deviations

Preserved cream/sage/terracotta, Literata headings, centered hero, layered tablet/phone composition, quiet surfaces, Study/Together/Teach hierarchy, alternating experience layouts, an emphasized Teach section, six workflow cards, secondary eight-category feature depth, and final download CTA. Added a concise About section for the requested navigation destination and the app's offline/no-AI/privacy message.

- Uses the actual existing teal Cultivate logo rather than Stitch's generated logo or a recolored brand mark.
- Uses self-hosted DM Sans alongside Literata instead of introducing externally hosted Inter. Both fonts are already available and licensed in this repo.
- Product UI is explicitly conceptual. Uses John 15 KJV scripture and actual Cultivate concepts, not unsupported translations or interlinears.
- No invented testimonials, member names, user counts, ratings, real-time answers, word clouds, or activity feed. The progress visual is illustrative and does not show real member activity.
- Removed macOS/Web availability and free-trial claims. The download destination stays the existing iOS TestFlight / Android beta flow.
- Shared participation and Live are marked in development. Detailed availability across beta builds needs PM confirmation before strengthening this language.
- Share step distinguishes chosen thoughts in Reading Study Spaces from lesson links/Channels; the prior product checkpoint explicitly keeps these participation models separate. This deliberately adapts the brief's “share a lesson through a Study Space” wording.
- On mobile/tablet the three devices rearrange into a central tablet and two phones below. They are not removed. No screenshot is baked into a CSS background.
- Removed the fabricated newsletter signup and avatar/profile affordance. Every visible actionable navigation or CTA has a real destination.

## Validation

- `npm run build`: passes, retains all existing Vite route inputs.
- `npx tsc --noEmit -p new/tsconfig.json`: passes.
- `npm run lint`: passes with pre-existing warnings in unrelated React and graph code.
- `node new/qa/editorial.cjs`: passes at 390, 768, 1440, and 1920px. Checks direct load and refresh, three visible devices, heading count, bounds/overflow, navigation, mobile menu, skip-link focus, six workflow steps, eight depth features, banned content patterns, developing-feature language, all internal link targets, and console/network failures.
- Eight production routes and eight existing `/new/` detail routes return HTTP 200. Production HTML responses match the built local HTML bytes; production source files remain unchanged.
- Visually reviewed full desktop page, mobile/tablet heroes, and Study, Together, Teach, and footer captures. Fixed mobile headline whitespace and the menu closing behavior after selecting a section.

Evidence: `../PillarStudy-QA/stitch-built/`. `390-full.png` and `1440-full.png` are the primary review captures. All four viewport hero/full captures and per-section captures are saved there, with `results.json`. Original Stitch export is preserved in `../PillarStudy-QA/stitch-source/` and the previous homepage HTML is preserved in `../PillarStudy-QA/pre-stitch-index.html` outside the repository.

## Placeholders and PM review

Reader, Study Space, Lesson Builder, and participant/Live treatments are concept views. `ProductVisual` accepts a screenshot object (`src`, `alt`, `width`, `height`) to replace these views cleanly. Hero devices can swap their content without changing the composition. Original real app screenshots remain available in `new/assets/`.

Review the concept treatment, Teach's visual emphasis, and exact availability language for shared lessons/Live. Existing deep-page styling and release claims were not revised in this pass and should be reviewed when the Study/Together/Teach deep pages are commissioned. This pass stops at the homepage/design system.
