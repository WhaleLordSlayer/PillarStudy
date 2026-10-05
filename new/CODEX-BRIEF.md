# /new/ website steering brief

## Goal
Create a sharper Cultivate marketing page that communicates the product in about 20 seconds and uses real app screenshots as the primary proof.

## Product hierarchy
This changed after Lessons 2.0 and the Mastery overhaul. Do NOT position Cultivate primarily as a reader with group features.

The marketing story is now:
1. **Lessons 2.0** — build reusable scripture lessons from scripture, personal study material, questions, saved quotes/images, and Explorer context.
2. **Study Spaces + Live Lessons** — share lessons to groups, run synchronized host-led sessions, or let the group work through material asynchronously.
3. **Scripture Explorer** — follow people, places, events, groups, source passages, and connected context.
4. **Reader** — one-verse focus with full-chapter context and integrated study tools.
5. **Mastery** — newly rebuilt guided recall that moves toward whole-passage memory.
6. Supporting tools such as Topical Guide, plans, and Library.

The most important workflow to communicate is:
**Read / collect → build a lesson → share to a Study Space → teach live or asynchronously.**

## Voice
- Calm, confident, concise.
- Avoid generic phrases like "transform your gospel study."
- Do not over-explain.
- Avoid feature-dump sections.
- Let screenshots carry the page.
- It should feel like a serious study/teaching product, not a gamified devotional app.

## Visual direction
- Editorial, warm, modern.
- Light paper background with a dark Explorer section.
- Literata for major display headings, DM Sans for UI/body.
- Large real screenshots.
- Do not simulate fake app UI when a real screenshot exists.
- Keep screenshot rendering crisp: normal <img>, height:auto, object-fit:contain, no scaling filters.
- Slight depth through shadows and layered layouts is okay.
- Mobile must remain visually strong.

## Current screenshot assets
Reuse existing assets under ../new-site/assets/:
- study-space.jpg
- shared-thought.jpg
- journey.jpg
- explorer-map.jpg
- reader.jpg
- topics.jpg
- plans.jpg

## Screenshot gaps that MUST be filled before launch
The website repo does not currently contain current screenshots for:
- Lesson Builder / lesson canvas — highest priority. Prefer iPad.
- Live Lesson participant/host experience — ideally one host and one participant view.
- New Mastery flow.

Do not invent fake product UI for those. The current /new/ page intentionally uses obvious temporary screenshot slots.

## Page hierarchy
1. Hero: read → build → study together.
2. Short workflow/positioning statement.
3. Lessons 2.0.
4. Study Spaces + Live Lessons.
5. Explorer.
6. Reader.
7. Mastery overhaul.
8. Small supporting-tools strip.
9. Simple CTA/footer.

## Constraints
- Build only under /new/ for now.
- Do not replace the live root page.
- Keep existing /new-site/ untouched.
- Do not claim iOS is live until it actually is.
- Android beta can link to ../beta/.
- Preserve the Church non-affiliation footer language.
- Avoid introducing a framework or JS unless there is a clear user-facing reason.
- Do not market runtime AI as a product feature.

## Next iteration targets
1. Replace the Lesson Builder, Live Lessons, and Mastery placeholders with real screenshots.
2. Use Lesson Builder as the biggest screenshot on the page.
3. Consider a paired host/participant image for live sessions.
4. Tighten hero once the lesson screenshots exist; a lesson image may become the primary hero visual.
5. Review mobile screenshot cropping and screenshot density.
6. Run Lighthouse/accessibility basics.
