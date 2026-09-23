# PM Handoff: Cultivate EXP-EDIT-002B / EXP-EDIT-003A

**As of:** 2026-09-23  
**Status:** Production validation and parity fixes complete. Ready for the next phase; Bible Graph integration has not started.

## Product intent

Editorial staff can change app-facing Explorer content, including nested structured fields, while source/provenance values remain visible and unchanged. Saved edits must be revisioned and visible in Working Changes. Mobile controls must be practical to use. Bible Graph integration remains a separate next phase.

## Aaron data-parity finding and fix

The production `aaron-son-of-mosiah` row was compared across the accepted local source, D1 source/current payloads, the Worker API, and Admin. Admin was not dropping populated summary or relationship columns: both source and current `summary` are null in the imported record (source hash `b4dc90b54e55dc79289255334724a160a438886ba1eb469770ac9076f9a945d9`). The actual record still contains substantial nested app content: 10 events, 13 places, 1 embedded related-person reference (Mosiah II), 6 groups, and 10 scripture references. It has zero normalized relationship rows. Nephi likewise has a null summary in source/current payloads.

The presentation obscured that nested content and conflated embedded references with normalized relationship rows. The Admin now shows a compact source/current content overview and presents embedded people references separately from normalized relationships. It keeps an absent summary explicit rather than inventing one. Recursive editing continues to expose mutable nested record content, including arrays and structured values; stable identity and source/provenance payloads remain protected.

## Boolean and phone usability

The confusing “Edit anything boxers off” report was investigated as a Boolean-state clarity issue. The production source inventory contained no JSON Boolean leaves, so no incorrect persisted Boolean or API serialization was reproduced. In the unsaved editor preview, Boolean fields now clearly show current On/Off, source On/Off or absence, whether values differ, and the result of selecting the control. The draft preview was discarded without saving. The Chapter Understanding “Changed only” checkbox also works and has a larger touch target.

Phone-size validation at 390×844 covered authentication, the mobile menu, Explorer search/detail, Aaron and Nephi, Chapter Understanding and its filter, a chapter with beats, and Working Changes. No page-level horizontal overflow was found. Interactive controls were raised to at least 44px targets; the recursive Boolean control uses a 48px target. Desktop Working Changes also loaded without overflow. Relationship severance, beat deactivation, and reorder were not submitted. Confirmation guard behavior was reviewed in code; no destructive confirmation was accepted.

## Production rollout

- Worker/Admin: `https://admin.cultivatestudy.com`; active version `c73a91c6-65c9-4410-aa4e-013da6848b54` at 100% traffic.
- Authentication, Admin workspace, Explorer reads, Chapter Understanding reads, and Working Changes loaded in the authenticated browser session.
- Migrations 0001, 0002, and 0003 are applied; no migrations are pending.
- Final Explorer counts: 6,321 entities, 12,007 relationships, 11,610 evidence rows, 63 context/narrative records.
- Final Chapter Understanding counts: 2 packages, 1,441 chapters, 10,025 beats; chapter and beat orphan counts are zero.
- Expected package IDs and hashes were verified during the rollout: `NLV2-BETA-2026-09-15` and `BOM-CU-002R1`.
- Final global working revision: **8**. Before the three edit/restore canaries it was 2.
- Final Working Changes contains only the existing change to `BOM::1-nephi-7::beat:0001`; there are no canary edits or synthetic fixtures.

## Remote canary results

Each canary was edited once, reloaded and verified, then restored to its original current value:

| Record | Result | Item revision after restore | Source preserved |
|---|---|---:|---|
| Nephi Explorer display name | Save/reload/Working Changes verified; restored | 3 | Yes |
| `BOM::1-nephi-1` heading | Save/reload/Working Changes verified; restored | 3 | Yes |
| `BOM::1-nephi-1::beat:0001` title | Save/reload/Working Changes verified; restored | 3 | Yes |

The final source/current values match for all three records, source hashes are unchanged, and no canary residue remains. These were six Worker/Admin save requests total (edit plus restore for each record). No migrations, import, reseed, relationship disposition, or source-data mutation occurred in this validation task.

## D1 usage and write hygiene

Cloudflare exposed rolling 24-hour aggregate usage, not remaining quota/headroom or per-operation `rows_written`. At the final read, D1 reported 733 read queries, 128 write queries, 2,431,677 rows read, and 327,732 rows written. Before the canaries, the recorded aggregate was 559 read queries, 116 write queries, 1,730,782 rows read, and 327,714 rows written. These aggregates are not attributable solely to this task. Read-only SQL metadata checks reported `rows_written: 0`; the Worker mutation response does not return per-operation row counts. Database size reported 71,753,728 bytes.

No R2 operation, mobile-app change, or Forge change was made. The existing R2 binding appeared in Wrangler configuration/deploy output but was not operated.

## Verification notes

- `npm run build`: passed after the final UI changes.
- `npm run test:explorer-api`: passed, 12/12.
- `npx tsc --noEmit`: still reports the pre-existing `src/lib/supabase.ts:30` Supabase client type error for the `retry` option; no additional TypeScript errors were reported.
- Wrangler confirmed the latest production version and 100% traffic allocation.
- Admin authentication and the required read views were checked using the signed-in browser session; phone-size layout was checked at the viewport above.

## Acceptance gate

**Ready for next phase: YES.** Continue Admin completion, then integrate `https://cultivatestudy.com/dev/bible-graph` as a separate task. That integration has not begun in this rollout.
