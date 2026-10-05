# /new/ website steering brief

## Goal
Create a sharper Cultivate marketing page that communicates the product in about 20 seconds and uses real app screenshots as the primary proof.

## Positioning
Cultivate is not differentiated by having the longest scripture-app feature list. The story is:
1. Focused scripture reading.
2. Private Study Spaces that let people study together without making study feel like social media.
3. Scripture Explorer that makes people, places, events, groups, and source passages easier to follow.

## Voice
- Calm, confident, concise.
- Avoid generic phrases like "transform your gospel study."
- Do not over-explain.
- Avoid feature-dump sections.
- Let screenshots carry the page.

## Visual direction
- Editorial, warm, modern.
- Light paper background with a dark Explorer section.
- Literata for major display headings, DM Sans for UI/body.
- Large real screenshots.
- Do not simulate fake app UI when a real screenshot exists.
- Keep screenshot rendering crisp: use normal <img>, height:auto, object-fit:contain for hero/feature phones, and avoid CSS scale transforms/filters.
- Slight depth through shadows and layered layout is okay.
- Mobile must remain visually strong, not merely stack everything into tiny cards.

## Current screenshot assets
Reuse the existing assets under ../new-site/assets/:
- study-space.jpg
- shared-thought.jpg
- journey.jpg
- explorer-map.jpg
- reader.jpg
- topics.jpg
- plans.jpg

## Page hierarchy
1. Hero: "Read in your own way. Study with your people."
2. Short positioning statement: not another longer feature list.
3. Study Spaces: strongest differentiator, private by default.
4. Explorer: connected scripture context.
5. Reader: one verse for focus, chapter for context.
6. Small supporting-tools strip.
7. Simple CTA/footer.

## Constraints
- Build only under /new/ for now.
- Do not replace the live root page.
- Keep existing /new-site/ untouched.
- Do not claim iOS is live until it actually is.
- Android beta can link to ../beta/.
- Preserve the Church non-affiliation footer language.
- Avoid introducing a framework or JS unless there is a clear user-facing reason.

## Next iteration targets
When refining this pass, prioritize:
1. Visual balance and screenshot scale.
2. Mobile hero composition.
3. Copy reduction.
4. Stronger Study Spaces storytelling.
5. Crisp screenshots at all breakpoints.
6. Lighthouse/accessibility basics.
