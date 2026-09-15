# When Faith Becomes Power

Standalone Cultivate Labs data study. This directory is intentionally isolated
from the Bible Explorer, Book of Mormon Explorer, Topical Guide, and normal
site navigation.

## Build the compact data artifact

Run from the PillarStudy checkout:

```powershell
python dev/religion-and-power-study/build-study-data.py `
  --pillar-root C:\dev\PillarStudy `
  --app-root C:\dev\Tik-tok-scriptures
```

The script resolves the selected labels and events against the complete source
bundles, extracts only the study projection, preserves source hashes, and runs
validation before writing `data/study.json`. Re-running with identical source
files produces identical data apart from `generated_at`.

## Current source manifest

The generated `data/study.json` is the source of truth for the exact hashes and
release metadata. The build currently uses:

- `PillarStudy/dev/bible-graph/data/graph-bundle.json`
- `PillarStudy/dev/book-of-mormon-graph/data/graph-bundle.json`
- `Tik-tok-scriptures/assets/historical_guide/historical_guide_v3.json`
- `Tik-tok-scriptures/assets/historical_guide/historical_guide_v3_provenance.json` for the accepted v3 source commit
- `Tik-tok-scriptures/assets/historical_guide/related_expansion_008_app_handoff.json` for accepted `SOURCE_ATTESTED` topic links
- `Tik-tok-scriptures/assets/historical_guide/enrichment_010_manifest.json` for current-layer provenance only; vector-related supplemental links are not used as direct evidence

## Evidence findings

The graph strongly supports a curated New Testament cluster around Jesus,
Pharisees, Sabbath healing, public religious status, Samaritan and Gentile
encounters, Caiaphas, Pilate, and the Passion narratives. The Book of Mormon
projection supports separate structural parallels through the Zoramite mission,
Nehor and Amlici, Noah and his priests, Alma’s relinquishing of the judgment
seat, Gadianton-government overlap, and the Anti-Nephi-Lehies’ covenant and
refusal of resistance.

The accepted Guide’s taxonomy is not symmetrical. It provides direct New
Testament links for topics such as Faith, Persecution, Repentance, Judgment,
Authority in the Ministry, and Tithes and Offerings. Pride, Mercy, Riches,
Humility, Love, Enemies, Charity, and Government contribute direct Book of
Mormon links. Expected labels such as Hypocrisy, Neighbor, Compassion, and
Contention are not all present as accepted topic labels; the page therefore
uses graph/event evidence for those ideas rather than manufacturing topic
memberships.

## Validation snapshot

The checked-in artifact records the complete validation result. The current
build uses 38 nodes, 31 canonical edges, 16 accepted topics, 493 distinct
scripture locators, and has zero broken or unresolved references.
