# BGV2-009 Visual QA Bundle

Self-contained deterministic JSON bundle for Explorer visual QA.

## Files

| File | Description |
|------|-------------|
| `visual_qa_bundle.json` | Primary bundle: people, places, groups, events, family relationships, participation edges, audit findings, map suitability |
| `schema.json` | Bundle schema metadata and constraints |

## Constraints

- No secrets or absolute machine paths
- Candidate A is excluded (comparison-only prior art)
- Forbidden interpretive predicates are excluded from passage relationships
- ACCEPTED and REVIEW_REQUIRED counts are summarized per layer

## Regeneration

```bash
python3 -m bgv2_forge.cli.bgv2_009_build --review-dir review/bgv2-009
```
