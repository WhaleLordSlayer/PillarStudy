# Subpage system review — October 7, 2026

## Scope completed

The /new/ website now fans out from the approved homepage into three first-class hub pages:

- /new/study/
- /new/together/
- /new/teach/

Two flagship teaching pages were added:

- /new/channels/
- /new/live/

Existing detail/utility pages were rebuilt into the same cream/sage/terracotta editorial system:

- /new/reader/
- /new/explorer/
- /new/groups/
- /new/lessons/
- /new/topical-guide/
- /new/more/
- /new/labs/
- /new/download/

The production root homepage remains untouched.

## Navigation

The /new/ homepage primary navigation now points to Study / Together / Teach hub pages. Hero in-page doors remain available for visitors who want to scan the homepage first.

Deep pages use a shared primary navigation: Study / Together / Teach / About / Download.

## Live Early Access

The website does not collect Live Early Access requests.

Current published guidance:

1. Open Cultivate.
2. Start a Live Session.
3. Complete the in-app Early Access request form.

Hosting remains invite-only Early Access.

## Screenshot strategy

Final screenshots are intentionally deferred until the page structure and copy are approved.

See SCREENSHOT-MANIFEST.md for canonical screenshot IDs, target pages, device/orientation, recommended states, and reuse guidance.

All conceptual screenshot slots are identified in-page with stable IDs.

## Validation performed

Direct GitHub source validation passed for all thirteen /new/ hub/detail routes:

- complete HTML documents
- shared editorial + subpage stylesheets
- canonical URLs
- Study / Together / Teach navigation
- no legacy styles.css dependency
- no old “screenshot coming soon” placeholders
- no “No AI in the app” absolute claim
- Church non-affiliation disclaimer retained
- Live route contains the correct in-app Early Access request flow
- Download page does not incorrectly mark Study as current
- homepage navigation and pillar CTAs point to the new hubs

The current execution environment could not resolve github.com for a local clone, so npm build/browser QA could not be rerun from this ChatGPT session. The repo's existing QA script has been expanded to include all thirteen /new/ routes and should be run from the normal project environment before final publication or replacement of /.

## Next PM pass

1. Review the whole /new/ site visually.
2. Adjust subpage hierarchy/copy where needed.
3. Freeze page layouts and copy.
4. Capture the screenshot manifest in one organized app session.
5. Replace placeholders with real product imagery.
6. Run full responsive/browser QA.
7. Decide when /new/ replaces the production homepage.
