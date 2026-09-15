#!/usr/bin/env python3
"""Build the compact, provenance-preserving data bundle for the study page.

The page is intentionally a projection of the accepted Cultivate exports.  This
script resolves labels and event locators against the full source bundles and
fails closed if a selected node, edge, topic, or topic relationship disappears.

Example:
  python dev/religion-and-power-study/build-study-data.py \
    --pillar-root C:/dev/PillarStudy \
    --app-root C:/dev/Tik-tok-scriptures
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


STUDY_VERSION = "religion-and-power-study-1"
OUTPUT_NAME = "study.json"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def canonical_ref(raw: str) -> bool:
    """Validate the accepted canonical locator shape without inventing text."""
    if re.fullmatch(r"(?:nt|bom|pgp):[a-z0-9_-]+:\d+:\d+(?:-\d+)?", raw):
        return True
    return False


def supported_reference(raw: str) -> bool:
    """Accept canonical graph IDs plus the BOM viewer's human locators."""
    if canonical_ref(raw):
        return True
    return bool(re.fullmatch(r"(?:[1-3] )?[A-Z][A-Za-z'— -]+ \d+:\d+(?:–\d+|-\d+)?", raw))


def format_canonical_ref(raw: str) -> str:
    if not canonical_ref(raw):
        return raw
    corpus, book, chapter, verse = raw.split(":", 3)
    del corpus
    book = book.replace("_", "-")
    if book == "js-matthew":
        label = "JS—Matthew"
    else:
        label = book.replace("-", " ")
        label = re.sub(r"^(\d)\s", r"\1 ", label)
        label = " ".join(part.upper() if len(part) == 1 else part.capitalize() for part in label.split())
    return f"{label} {chapter}:{verse.replace('-', '–')}"


def node_corpus(node: dict[str, Any], default: str) -> str:
    details = node.get("type_details") or {}
    return str(details.get("corpus") or details.get("corpus_membership") or default)


def node_refs(node: dict[str, Any], corpus: str) -> list[str]:
    details = node.get("type_details") or {}
    if corpus == "NT" or corpus == "OT" or corpus == "PGP" or corpus == "BOTH":
        ranges = details.get("scripture_ranges")
        if isinstance(ranges, list):
            return [str(item) for item in ranges]
        return []
    locators = details.get("scripture_locators")
    if isinstance(locators, list):
        return [str(item) for item in locators]
    first_locator = node.get("first_locator")
    if first_locator and supported_reference(str(first_locator)):
        return [str(first_locator)]
    return []


def select_unique_node(
    nodes: list[dict[str, Any]],
    *,
    label: str,
    node_type: str,
    reference_hint: str | None = None,
    corpus: str | None = None,
) -> dict[str, Any]:
    candidates = [
        node
        for node in nodes
        if node.get("type") == node_type and node.get("display_name") == label
    ]
    if corpus:
        candidates = [node for node in candidates if node_corpus(node, corpus) in {corpus, "BOTH"}]
    if reference_hint:
        candidates = [node for node in candidates if reference_hint in node_refs(node, corpus or "")]
    if len(candidates) != 1:
        ids = ", ".join(str(node.get("id")) for node in candidates)
        hint = f" with reference {reference_hint}" if reference_hint else ""
        raise RuntimeError(f"Expected one {node_type} named {label!r}{hint}; found {len(candidates)} ({ids})")
    return candidates[0]


def select_topic(entries: list[dict[str, Any]], topic_id: str) -> dict[str, Any]:
    matches = [entry for entry in entries if entry.get("id") == topic_id and entry.get("role") == "TOPIC"]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one accepted TOPIC {topic_id}; found {len(matches)}")
    return matches[0]


def choose_event(
    nodes: list[dict[str, Any]],
    *,
    corpus: str,
    label: str,
    reference_hint: str,
) -> dict[str, Any]:
    if corpus == "NT":
        return select_unique_node(nodes, label=label, node_type="EVENT", reference_hint=reference_hint, corpus="NT")
    return select_unique_node(nodes, label=label, node_type="EVENT", reference_hint=reference_hint)


def compact_node(node: dict[str, Any], corpus: str, role: str) -> dict[str, Any]:
    details = node.get("type_details") or {}
    refs = node_refs(node, corpus)
    result: dict[str, Any] = {
        "id": node["id"],
        "name": node.get("display_name", ""),
        "type": node.get("type", ""),
        "corpus": corpus,
        "role": role,
        "references": refs,
        "formatted_references": [format_canonical_ref(ref) for ref in refs],
    }
    if node.get("first_locator") and str(node["first_locator"]).lower().startswith(("alma ", "mosiah ", "helaman ", "mormon ", "jacob ", "2 nephi ", "3 nephi ", "ether ")):
        result["first_locator"] = node["first_locator"]
    if node.get("last_locator") and str(node["last_locator"]).lower().startswith(("alma ", "mosiah ", "helaman ", "mormon ", "jacob ", "2 nephi ", "3 nephi ", "ether ")):
        result["last_locator"] = node["last_locator"]
    for key in ("grounding_status", "source_status"):
        if node.get(key):
            result[key] = node[key]
    for key in ("corpus_membership", "review_status", "identity_status", "phase1_classification"):
        if details.get(key):
            result[key] = details[key]
    return result


def compact_edge(edge: dict[str, Any], by_id: dict[str, dict[str, Any]], corpus: str) -> dict[str, Any]:
    refs = edge.get("evidence_refs") or edge.get("scripture_locators") or []
    result = {
        "id": edge["id"],
        "source": edge["source"],
        "target": edge["target"],
        "source_name": by_id[edge["source"]].get("display_name", edge["source"]),
        "target_name": by_id[edge["target"]].get("display_name", edge["target"]),
        "relationship_type": edge.get("relationship_type", ""),
        "relationship_class": edge.get("relationship_class", ""),
        "canonical_claim": edge.get("canonical_claim", edge.get("relationship_class") == "canonical"),
        "label": edge.get("ui_label") or edge.get("relationship_type", "").replace("_", " ").lower(),
        "references": [str(ref) for ref in refs],
        "formatted_references": [format_canonical_ref(str(ref)) for ref in refs],
        "corpus": corpus,
    }
    if edge.get("meaning"):
        result["meaning"] = edge["meaning"]
    if edge.get("does_not_mean"):
        result["does_not_mean"] = edge["does_not_mean"]
    if edge.get("derivation", {}).get("rule"):
        result["derivation_rule"] = edge["derivation"]["rule"]
    return result


def topic_row(
    entry: dict[str, Any],
    relationship: dict[str, Any] | None,
) -> tuple[dict[str, Any], set[str]]:
    base_refs = {str(ref) for ref in entry.get("scripture_refs", [])}
    source_refs = set((relationship or {}).get("source_attested_verse_ids", []))
    # This study is deliberately scoped to the New Testament and Book of
    # Mormon corpora. The accepted Guide also contains OT, PGP, and D&C links;
    # those remain in the source artifact but are not silently mixed into this
    # page's evidence layer.
    study_base_refs = {ref for ref in base_refs if ref.startswith(("nt:", "bom:"))}
    study_source_refs = {ref for ref in source_refs if ref.startswith(("nt:", "bom:"))}
    all_refs = sorted(study_base_refs | study_source_refs)
    links = []
    for raw in all_refs:
        links.append({
            "canonical_id": raw,
            "reference": format_canonical_ref(raw),
            "layer": "SOURCE_ATTESTED" if raw in source_refs else "GUIDE_SOURCE_ATTESTED",
        })
    row = {
        "id": entry["id"],
        "label": entry.get("display_label", ""),
        "links": links,
        "full_guide_link_count": len(base_refs),
        "guide_link_count": len(study_base_refs),
        "source_attested_link_count": len(study_source_refs),
        "accepted_link_count": len(all_refs),
        "browse_category": (entry.get("browse") or {}).get("category_label"),
        "provenance_status": (entry.get("provenance") or {}).get("entry_resolution_status"),
    }
    return row, set(all_refs)


def source_manifest(path: Path, *, label: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "path": label,
        "sha256": sha256_file(path),
        **(metadata or {}),
    }


def requested_topic_audit(entries: list[dict[str, Any]], requested: list[str]) -> list[dict[str, Any]]:
    topics = [entry for entry in entries if entry.get("role") == "TOPIC"]
    rows = []
    for requested_label in requested:
        matches = [entry for entry in topics if requested_label.lower() in str(entry.get("display_label", "")).lower()]
        rows.append({
            "requested": requested_label,
            "matched": [
                {
                    "id": entry["id"],
                    "label": entry["display_label"],
                    "reference_count": entry.get("scripture_ref_count", len(entry.get("scripture_refs", []))),
                    "new_testament_count": sum(str(ref).startswith("nt:") for ref in entry.get("scripture_refs", [])),
                    "book_of_mormon_count": sum(str(ref).startswith("bom:") for ref in entry.get("scripture_refs", [])),
                }
                for entry in matches[:6]
            ],
            "status": "matched" if matches else "not_found_in_accepted_taxonomy",
        })
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pillar-root", type=Path, required=True)
    parser.add_argument("--app-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("data") / OUTPUT_NAME)
    args = parser.parse_args()

    pillar = args.pillar_root.resolve()
    app = args.app_root.resolve()
    bible_path = pillar / "dev/bible-graph/data/graph-bundle.json"
    bom_path = pillar / "dev/book-of-mormon-graph/data/graph-bundle.json"
    guide_path = app / "assets/historical_guide/historical_guide_v3.json"
    guide_provenance_path = app / "assets/historical_guide/historical_guide_v3_provenance.json"
    relationship_path = app / "assets/historical_guide/related_expansion_008_app_handoff.json"
    enrichment_manifest_path = app / "assets/historical_guide/enrichment_010_manifest.json"
    for path in (bible_path, bom_path, guide_path, guide_provenance_path, relationship_path, enrichment_manifest_path):
        if not path.is_file():
            raise FileNotFoundError(path)

    bible = load_json(bible_path)
    bom = load_json(bom_path)
    guide = load_json(guide_path)
    guide_provenance = load_json(guide_provenance_path)
    relationship_layer = load_json(relationship_path)
    enrichment_manifest = load_json(enrichment_manifest_path)

    bible_nodes = bible["nodes"]
    bom_nodes = bom["nodes"]
    bible_by_id = {node["id"]: node for node in bible_nodes}
    bom_by_id = {node["id"]: node for node in bom_nodes}
    bible_edges = bible["edges"]
    bom_edges = bom["edges"]
    bible_edges_by_id = {edge["id"]: edge for edge in bible_edges}
    bom_edges_by_id = {edge["id"]: edge for edge in bom_edges}

    bible_entities = [
        select_unique_node(bible_nodes, label="Jesus", node_type="PERSON", corpus="BOTH"),
        select_unique_node(bible_nodes, label="Pharisees", node_type="GROUP", corpus="NT"),
        select_unique_node(bible_nodes, label="Samaritans", node_type="GROUP", corpus="NT"),
        select_unique_node(bible_nodes, label="Caiaphas", node_type="PERSON", corpus="NT"),
        select_unique_node(bible_nodes, label="Pilate", node_type="PERSON", corpus="NT"),
        select_unique_node(bible_nodes, label="Herodians", node_type="GROUP", corpus="NT"),
        select_unique_node(bible_nodes, label="Sadducees", node_type="GROUP", corpus="NT"),
    ]
    bible_events = [
        choose_event(bible_nodes, corpus="NT", label="Woes to Scribes and Pharisees", reference_hint="matthew:23:1-34"),
        choose_event(bible_nodes, corpus="NT", label="The Pharisee and the Tax Collector", reference_hint="luke:18:9-13"),
        choose_event(bible_nodes, corpus="NT", label="Jesus Heals on the Sabbath", reference_hint="luke:6:6-11"),
        choose_event(bible_nodes, corpus="NT", label="Before the Pharisees", reference_hint="john:9:13-41"),
        choose_event(bible_nodes, corpus="NT", label="Jesus Cleanses the Temple", reference_hint="matthew:21:12-17"),
        choose_event(bible_nodes, corpus="NT", label="The Parable", reference_hint="luke:10:25-37"),
        choose_event(bible_nodes, corpus="NT", label="Preaching the Gospel to the Samaritans", reference_hint="john:4:27-42"),
        choose_event(bible_nodes, corpus="NT", label="The Centurion", reference_hint="matthew:8:5-10"),
        choose_event(bible_nodes, corpus="NT", label="The Young Man", reference_hint="matthew:19:16-30"),
        choose_event(bible_nodes, corpus="NT", label="Jesus before Pilate", reference_hint="matthew:27:11-14"),
        choose_event(bible_nodes, corpus="NT", label="Jesus before the High Priest", reference_hint="john:18:19-24"),
        choose_event(bible_nodes, corpus="NT", label="The Crowd Chooses Barabbas", reference_hint="matthew:27:15-23"),
    ]

    bom_entities = [
        select_unique_node(bom_nodes, label="Zoramites", node_type="GROUP"),
        select_unique_node(bom_nodes, label="Nehor", node_type="PERSON"),
        select_unique_node(bom_nodes, label="Amlici", node_type="PERSON"),
        select_unique_node(bom_nodes, label="King Noah", node_type="PERSON"),
        select_unique_node(bom_nodes, label="priests of Noah", node_type="GROUP"),
        select_unique_node(bom_nodes, label="Gadianton robbers", node_type="GROUP"),
        select_unique_node(bom_nodes, label="Anti-Nephi-Lehies", node_type="GROUP"),
        select_unique_node(bom_nodes, label="Lamanites", node_type="GROUP"),
        select_unique_node(bom_nodes, label="Alma the Younger", node_type="PERSON"),
    ]
    bom_events = [
        select_unique_node(bom_nodes, label="Alma and companions minister to the Zoramites at Antionum", node_type="EVENT"),
        select_unique_node(bom_nodes, label="Nehor's trial and death", node_type="EVENT"),
        select_unique_node(bom_nodes, label="Amlicite rebellion and battle", node_type="EVENT"),
        select_unique_node(bom_nodes, label="Abinadi testifies before Noah and his priests", node_type="EVENT"),
        select_unique_node(bom_nodes, label="Noah succeeds Zeniff and establishes oppressive rule", node_type="EVENT"),
        select_unique_node(bom_nodes, label="Alma relinquishes the judgment seat to focus on preaching", node_type="EVENT"),
        select_unique_node(bom_nodes, label="Gadianton robbers infiltrate the Nephite government", node_type="EVENT"),
        select_unique_node(bom_nodes, label="Converted community settles in Jershon and becomes known as the people of Ammon", node_type="EVENT"),
        select_unique_node(bom_nodes, label="Anti-Nephi-Lehies covenant against bloodshed", node_type="EVENT"),
        select_unique_node(bom_nodes, label="Anti-Nephi-Lehies refuse resistance and attackers repent", node_type="EVENT"),
    ]

    bible_node_ids = {node["id"] for node in bible_entities + bible_events}
    bom_node_ids = {node["id"] for node in bom_entities + bom_events}
    selected_bible_edges = [edge for edge in bible_edges if edge["source"] in bible_node_ids and edge["target"] in bible_node_ids]
    selected_bom_edges = [edge for edge in bom_edges if edge["source"] in bom_node_ids and edge["target"] in bom_node_ids and edge.get("relationship_class") == "canonical"]

    relation_by_topic = {
        row["topic_id"]: row for row in relationship_layer.get("topics", [])
    }
    selected_topic_ids = [
        "ct_0075_faith",
        "ct_0134_persecution_the_heritage_of_the_faithful",
        "ct_0154_repentance_the_second_principle_of_the_gospel",
        "ct_0181_the_judgment",
        "ct_0185_tithes_and_offerings",
        "ct_0035_authority_in_the_ministry",
        "ct_0140_pride",
        "ct_0121_mercy",
        "ct_0116_love",
        "historical_topic_008:enemies",
        "ct_0156_riches",
        "ct_0099_humility",
        "ct_0133_persecution",
        "historical_topic_008:government",
        "ct_0050_charity",
        "ct_0081_forgiveness",
    ]
    topics: list[dict[str, Any]] = []
    topic_ref_sets: dict[str, set[str]] = {}
    for topic_id in selected_topic_ids:
        row, refs = topic_row(select_topic(guide["entries"], topic_id), relation_by_topic.get(topic_id))
        topics.append(row)
        topic_ref_sets[topic_id] = refs

    # The prose is original study scaffolding; every linked ID/ref below is
    # resolved from the source bundles before it is written to JSON.
    theme_blueprint = [
        {
            "id": "identity-badge",
            "number": "01",
            "kicker": "The visible self",
            "title": "When religion becomes a public identity badge",
            "dek": "Jesus repeatedly turns the reader’s attention from religious visibility to the condition of the heart.",
            "observation": "The selected New Testament cluster pairs public status warnings with a story in which humility, not religious display, is the measure of prayer.",
            "interpretation": "A modern application is strongest when it asks whether religious identity is forming a disciple—or merely announcing allegiance to a group.",
            "data_evidence": [
                {"corpus": "NT", "kind": "event", "node_label": "Woes to Scribes and Pharisees"},
                {"corpus": "NT", "kind": "event", "node_label": "The Pharisee and the Tax Collector"},
                {"corpus": "BOM", "kind": "event", "node_label": "Alma and companions minister to the Zoramites at Antionum"},
            ],
            "topic_ids": ["ct_0075_faith", "ct_0140_pride", "ct_0099_humility", "ct_0156_riches"],
            "modern_warning": "Christianity functioning mainly as a badge of belonging rather than a practice of inward discipleship.",
        },
        {
            "id": "authority-and-power",
            "number": "02",
            "kicker": "The power intersection",
            "title": "Religious authority can meet worldly power",
            "dek": "The graph keeps religious actors, political authorities, and narrative events distinct—then lets us see where their paths intersect.",
            "observation": "In the New Testament projection, Pharisees, Caiaphas, Pilate, and the crowd appear in different event relationships around Jesus’s arrest and trial. In the Book of Mormon projection, Noah’s priests and Gadianton robbers are linked to political control in different narratives.",
            "interpretation": "The data does not diagnose modern motives. It does invite a structural question: what happens when spiritual authority is treated as a route to status, control, or state power?",
            "data_evidence": [
                {"corpus": "NT", "kind": "network", "node_label": "Jesus Heals on the Sabbath"},
                {"corpus": "NT", "kind": "event", "node_label": "Jesus before the High Priest"},
                {"corpus": "NT", "kind": "event", "node_label": "Jesus before Pilate"},
                {"corpus": "BOM", "kind": "event", "node_label": "Noah succeeds Zeniff and establishes oppressive rule"},
                {"corpus": "BOM", "kind": "event", "node_label": "Gadianton robbers infiltrate the Nephite government"},
            ],
            "topic_ids": ["ct_0035_authority_in_the_ministry", "historical_topic_008:government", "ct_0185_tithes_and_offerings"],
            "modern_warning": "Pursuing worldly power in the name of religion, or treating national power as proof of divine approval.",
        },
        {
            "id": "wide-neighbor",
            "number": "03",
            "kicker": "The boundary",
            "title": "The neighbor is wider than the in-group",
            "dek": "The Good Samaritan, a Samaritan community, a Gentile woman, and a Roman centurion all complicate a simple insiders-versus-outsiders story.",
            "observation": "The graph links Jesus to a parable whose setting crosses the Jerusalem–Jericho road and Samaria, and to separate encounters involving Samaritans and a centurion. The accepted Guide also connects faith and welcome across the New Testament corpus.",
            "interpretation": "The Christian ethical question is not whether every border or policy disappears. It is whether outsiders are still treated as neighbors and as morally accountable persons before God.",
            "data_evidence": [
                {"corpus": "NT", "kind": "event", "node_label": "The Parable"},
                {"corpus": "NT", "kind": "event", "node_label": "Preaching the Gospel to the Samaritans"},
                {"corpus": "NT", "kind": "event", "node_label": "The Centurion"},
                {"corpus": "BOM", "kind": "event", "node_label": "Converted community settles in Jershon and becomes known as the people of Ammon"},
            ],
            "topic_ids": ["ct_0075_faith", "ct_0050_charity", "ct_0116_love"],
            "modern_warning": "Treating outsiders as morally lesser, or confusing national belonging with covenant worthiness.",
        },
        {
            "id": "mercy-over-performance",
            "number": "04",
            "kicker": "The weightier matter",
            "title": "Mercy is not a softer side quest",
            "dek": "Jesus’s conflicts around Sabbath, tithing, healing, and judgment expose the danger of precise religion without proportionate compassion.",
            "observation": "The source graph directly connects Jesus and the Pharisees to a Sabbath-healing event. The accepted Guide links Matthew 23:23 and Luke 11:42 under Tithes and Offerings, while the Book of Mormon topic layer gives Mercy a separate cluster of references.",
            "interpretation": "The comparison is not a verdict on a person’s position about taxation, immigration, criminal justice, defense, or any other policy. It is a discipleship test for whether rules are being used to serve love of God and neighbor.",
            "data_evidence": [
                {"corpus": "NT", "kind": "network", "node_label": "Jesus Heals on the Sabbath"},
                {"corpus": "NT", "kind": "event", "node_label": "Jesus Cleanses the Temple"},
                {"corpus": "BOM", "kind": "event", "node_label": "Alma and companions minister to the Zoramites at Antionum"},
            ],
            "topic_ids": ["ct_0185_tithes_and_offerings", "ct_0121_mercy", "ct_0133_persecution", "ct_0050_charity"],
            "modern_warning": "Selective emphasis on law while neglecting mercy, justice, compassion, and the dignity of the person affected.",
        },
        {
            "id": "power-repentance",
            "number": "05",
            "kicker": "The reversal",
            "title": "Repentance interrupts the pride cycle",
            "dek": "Across the two corpora, the most credible counter-pattern is not a cleaner group identity. It is a willingness to be corrected, to relinquish status, and to change.",
            "observation": "The Book of Mormon graph places Alma’s relinquishing of the judgment seat beside narratives about Zoramite status and Noah’s priests. Its accepted topic links connect Pride, Humility, Repentance, and Riches to distinct clusters of references.",
            "interpretation": "Religious certainty becomes dangerous when it makes a group incapable of repentance. The scriptural alternative is authority that can be surrendered and identity that can be re-formed.",
            "data_evidence": [
                {"corpus": "BOM", "kind": "event", "node_label": "Alma relinquishes the judgment seat to focus on preaching"},
                {"corpus": "BOM", "kind": "event", "node_label": "Nehor's trial and death"},
                {"corpus": "BOM", "kind": "event", "node_label": "Amlicite rebellion and battle"},
                {"corpus": "NT", "kind": "event", "node_label": "The Pharisee and the Tax Collector"},
            ],
            "topic_ids": ["ct_0140_pride", "ct_0099_humility", "ct_0154_repentance_the_second_principle_of_the_gospel", "ct_0156_riches"],
            "modern_warning": "Assuming one’s group possesses inherent righteousness, or treating criticism as persecution simply because it is uncomfortable.",
        },
        {
            "id": "enemy-love",
            "number": "06",
            "kicker": "The enemy",
            "title": "Enemy love changes what power is for",
            "dek": "The New Testament gives the moral teaching; the Book of Mormon supplies a graph-visible community narrative about refusing retaliation and receiving former enemies.",
            "observation": "The Anti-Nephi-Lehies are connected to both their own group and the Lamanites in the accepted event projection. The event record identifies covenantal refusal of bloodshed, attack, death, and subsequent repentance as a bounded narrative sequence.",
            "interpretation": "This does not settle questions of state force or public safety. It does make hostility toward an enemy a poor substitute for Christian formation, especially when hostility becomes a source of identity or domination.",
            "data_evidence": [
                {"corpus": "BOM", "kind": "network", "node_label": "Anti-Nephi-Lehies refuse resistance and attackers repent"},
                {"corpus": "BOM", "kind": "event", "node_label": "Anti-Nephi-Lehies covenant against bloodshed"},
                {"corpus": "NT", "kind": "event", "node_label": "The Centurion"},
                {"corpus": "NT", "kind": "event", "node_label": "Jesus before Pilate"},
            ],
            "topic_ids": ["historical_topic_008:enemies", "ct_0116_love", "ct_0081_forgiveness", "ct_0134_persecution_the_heritage_of_the_faithful"],
            "modern_warning": "Using religious identity to justify hostility, retaliation, or the moral erasure of an enemy.",
        },
    ]

    node_lookup = {
        "NT": {node["display_name"]: node for node in bible_entities + bible_events},
        "BOM": {node["display_name"]: node for node in bom_entities + bom_events},
    }
    compact_nodes = [
        compact_node(node, "NT", "study") for node in sorted(bible_entities + bible_events, key=lambda row: row["id"])
    ] + [
        compact_node(node, "BOM", "study") for node in sorted(bom_entities + bom_events, key=lambda row: row["id"])
    ]
    compact_edges = [
        compact_edge(edge, bible_by_id, "NT") for edge in sorted(selected_bible_edges, key=lambda row: row["id"])
    ] + [
        compact_edge(edge, bom_by_id, "BOM") for edge in sorted(selected_bom_edges, key=lambda row: row["id"])
    ]
    edge_lookup = {edge["id"]: edge for edge in compact_edges}

    def evidence_for(item: dict[str, Any]) -> dict[str, Any]:
        corpus = item["corpus"]
        node = node_lookup[corpus].get(item["node_label"])
        if node is None:
            raise RuntimeError(f"Study evidence node not found: {corpus}/{item['node_label']}")
        refs = node_refs(node, corpus)
        selected_edge_ids = [
            edge["id"]
            for edge in (selected_bible_edges if corpus == "NT" else selected_bom_edges)
            if node["id"] in {edge["source"], edge["target"]}
        ]
        return {
            "corpus": corpus,
            "kind": item["kind"],
            "node_id": node["id"],
            "label": node["display_name"],
            "references": refs,
            "formatted_references": [format_canonical_ref(ref) for ref in refs],
            "edge_ids": sorted(selected_edge_ids),
        }

    themes = []
    for blueprint in theme_blueprint:
        evidences = [evidence_for(item) for item in blueprint["data_evidence"]]
        themes.append({
            **{key: value for key, value in blueprint.items() if key != "data_evidence"},
            "evidence": evidences,
            "topics": [next(topic for topic in topics if topic["id"] == topic_id) for topic_id in blueprint["topic_ids"]],
        })

    all_node_ids = {node["id"] for node in compact_nodes}
    unresolved_node_ids = sorted(
        ({edge["source"] for edge in compact_edges} | {edge["target"] for edge in compact_edges}) - all_node_ids
    )
    unresolved_edge_ids = sorted(
        edge_id for theme in themes for evidence in theme["evidence"] for edge_id in evidence["edge_ids"] if edge_id not in edge_lookup
    )
    all_displayed_raw_refs: set[str] = set()
    for node in compact_nodes:
        all_displayed_raw_refs.update(ref for ref in node["references"] if supported_reference(ref))
    for edge in compact_edges:
        all_displayed_raw_refs.update(ref for ref in edge["references"] if supported_reference(ref))
    for topic in topics:
        all_displayed_raw_refs.update(link["canonical_id"] for link in topic["links"])

    invalid_references = sorted(ref for ref in all_displayed_raw_refs if not supported_reference(ref))
    topic_link_errors = []
    guide_entries_by_id = {entry["id"]: entry for entry in guide["entries"]}
    for topic in topics:
        raw_guide = set(guide_entries_by_id[topic["id"]].get("scripture_refs", []))
        raw_source = set(relation_by_topic.get(topic["id"], {}).get("source_attested_verse_ids", []))
        for link in topic["links"]:
            raw = link["canonical_id"]
            if raw not in raw_guide and raw not in raw_source:
                topic_link_errors.append(f"{topic['id']}->{raw}")

    def corpus_breakdown(corpus: str) -> dict[str, int]:
        rows = [node for node in compact_nodes if node["corpus"] == corpus]
        edges = [edge for edge in compact_edges if edge["corpus"] == corpus]
        refs = {ref for row in rows for ref in row["references"] if supported_reference(ref)} | {ref for edge in edges for ref in edge["references"] if supported_reference(ref)}
        return {
            "nodes": len(rows),
            "events": sum(row["type"] == "EVENT" for row in rows),
            "edges": len(edges),
            "scripture_references": len(refs),
        }

    relation_counts = relationship_layer.get("topics", [])
    relation_source_links = sum(len(row.get("source_attested_verse_ids", [])) for row in relation_counts)
    relation_high_links = sum(len(row.get("vector_related_high_verse_ids", [])) for row in relation_counts)
    selected_source_links = sum(topic["source_attested_link_count"] for topic in topics)
    stats = {
        "source_graphs": {
            "bible": {
                "nodes": bible["meta"].get("node_counts_by_type", {}),
                "edges": len(bible_edges),
                "new_testament_events": sum(node_corpus(node, "") == "NT" for node in bible_nodes if node.get("type") == "EVENT"),
            },
            "book_of_mormon": {
                "nodes": bom["meta"].get("node_counts_by_type", {}),
                "edges": len(bom_edges),
                "canonical_edges": sum(edge.get("relationship_class") == "canonical" for edge in bom_edges),
            },
        },
        "study_projection": {
            "nodes": len(compact_nodes),
            "edges": len(compact_edges),
            "topics": len(topics),
            "accepted_topic_links": sum(topic["accepted_link_count"] for topic in topics),
            "source_attested_topic_links": selected_source_links,
        },
        "topical_guide": {
            "entries": guide.get("manifest", {}).get("entry_count"),
            "topics": guide.get("manifest", {}).get("topic_count"),
            "entities": guide.get("manifest", {}).get("entity_count"),
            "browse_categories": guide.get("manifest", {}).get("browse_category_count"),
            "accepted_source_attested_links": relation_source_links,
            "accepted_vector_related_high_links_available_but_not_used": relation_high_links,
        },
    }

    validation = {
        "nodes_used": len(compact_nodes),
        "edges_used": len(compact_edges),
        "topics_used": len(topics),
        "scripture_references_used": len(all_displayed_raw_refs),
        "corpus_breakdown": {"NT": corpus_breakdown("NT"), "BOM": corpus_breakdown("BOM")},
        "broken_or_unresolved_references": invalid_references,
        "unresolved_node_ids": unresolved_node_ids,
        "unresolved_edge_ids": sorted(set(unresolved_edge_ids)),
        "topic_link_errors": sorted(set(topic_link_errors)),
        "source_attested_topic_links_only": True,
        "passed": not (invalid_references or unresolved_node_ids or unresolved_edge_ids or topic_link_errors),
    }

    source_provenance = {
        "bible_graph": source_manifest(
            bible_path,
            label="PillarStudy/dev/bible-graph/data/graph-bundle.json",
            metadata={"graph_sha256": bible["meta"].get("graph_sha256"), "source_commit": bible["meta"].get("source_commit"), "schema_version": bible["meta"].get("schema_version")},
        ),
        "book_of_mormon_graph": source_manifest(
            bom_path,
            label="PillarStudy/dev/book-of-mormon-graph/data/graph-bundle.json",
            metadata={"graph_sha256": bom["meta"].get("graph_sha256"), "source_commit": bom["meta"].get("source_commit"), "schema_version": bom["meta"].get("schema_version")},
        ),
        "topical_guide": {
            "base_export": source_manifest(
                guide_path,
                label="Tik-tok-scriptures/assets/historical_guide/historical_guide_v3.json",
                metadata={
                    "product_version": guide.get("product_version"),
                    "release_gate": guide.get("release_gate"),
                    "source_commit": guide_provenance.get("source_sha"),
                    "export_source_sha": (guide.get("provenance_summary") or {}).get("source_sha"),
                },
            ),
            "accepted_provenance_manifest": source_manifest(
                guide_provenance_path,
                label="Tik-tok-scriptures/assets/historical_guide/historical_guide_v3_provenance.json",
                metadata={"product_version": guide_provenance.get("product_version"), "source_commit": guide_provenance.get("source_sha")},
            ),
            "source_attested_relationships": source_manifest(
                relationship_path,
                label="Tik-tok-scriptures/assets/historical_guide/related_expansion_008_app_handoff.json",
                metadata={
                    "product": "Topical Guide",
                    "release": "RELATED-EXPANSION-008",
                    "source_commit": "6977d04a805752095abafc05140cb741dfd2735e",
                    "accepted_input_sha": relationship_layer.get("accepted_input_sha"),
                    "used_for_study": True,
                },
            ),
            "current_supplemental_layer_manifest": source_manifest(
                enrichment_manifest_path,
                label="Tik-tok-scriptures/assets/historical_guide/enrichment_010_manifest.json",
                metadata={
                    "gate": enrichment_manifest.get("gate_id"),
                    "source_commit": enrichment_manifest.get("source_commit_sha"),
                    "used_for_study": False,
                    "exclusion_reason": "The study uses only Guide/source-attested relationships; vector-related supplemental links are not treated as direct evidence.",
                },
            ),
        },
        "method": {
            "accepted_relationship_layer": "SOURCE_ATTESTED",
            "excluded_layers": ["VECTOR_RELATED_HIGH", "VECTOR_RELATED_SUPPLEMENTAL"],
            "note": "Graph relationships are source-derived/canonical records. Interpretive prose is original study framing and is not itself a graph claim.",
        },
    }

    visual_nodes = [
        {
            "id": node["id"],
            "label": node["name"],
            "type": node["type"],
            "corpus": node["corpus"],
        }
        for node in compact_nodes
        if node["type"] in {"PERSON", "GROUP", "EVENT"}
    ]
    visual_edges = [
        {
            "id": edge["id"],
            "source": edge["source"],
            "target": edge["target"],
            "label": edge["label"],
            "corpus": edge["corpus"],
            "references": edge["formatted_references"],
        }
        for edge in compact_edges
    ]

    payload = {
        "schema_version": STUDY_VERSION,
        "title": "When Faith Becomes Power",
        "subtitle": "A data-assisted scripture study of religious identity, power, outsiders, and the warnings of Jesus",
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "scope_note": "This study compares patterns in scripture. It does not assign motives or religious standing to individual modern voters, parties, or policy positions.",
        "historical_caution": [
            "Pharisees were a diverse Jewish movement, not a synonym for hypocrisy.",
            "The Gospel disputes occurred within first-century Judaism; Jesus and His earliest disciples were Jewish.",
            "This page discusses behaviors criticized in particular narratives, not Judaism or Jewish people.",
        ],
        "comparison_limits": [
            "Modern Christian nationalism is not synonymous with Christianity.",
            "The comparison does not equate Christian nationalism with conservative Christians, Republicans, Trump voters, or supporters of any particular policy.",
            "Immigration enforcement, taxation, criminal justice, national defense, elections, and similar questions involve legitimate policy disagreement.",
            "A person’s position on one policy cannot prove that the person rejects Christ.",
            "The comparison is strongest at the level of behavior and structure, not one-to-one historical identity.",
        ],
        "provenance": source_provenance,
        "stats": stats,
        "nodes": compact_nodes,
        "edges": compact_edges,
        "visual_network": {"nodes": visual_nodes, "edges": visual_edges},
        "topics": topics,
        "themes": themes,
        "topic_audit": requested_topic_audit(
            guide["entries"],
            ["Pride", "Hypocrisy", "Mercy", "Justice", "Love", "Enemies", "Poor", "Riches", "Persecution", "Humility", "Judgment", "Repentance", "Priestcraft", "Government", "Power", "Authority", "Neighbor", "Compassion", "Forgiveness", "Contention", "Unity"],
        ),
        "cross_corpus": [
            {"id": "public-religiosity", "label": "Public religiosity", "nt_theme": "Identity, display, and status", "bom_theme": "Zoramite status and pride", "supported": True},
            {"id": "authority-status", "label": "Status and authority", "nt_theme": "Religious and political actors remain distinct but intersect in the Passion narratives", "bom_theme": "Noah’s priests and Gadianton government overlap appear in separate accepted events", "supported": True},
            {"id": "outsiders", "label": "Treatment of outsiders", "nt_theme": "Samaritans, Gentiles, a centurion, and the neighbor command", "bom_theme": "Converted communities and former enemies are represented by bounded events", "supported": True},
            {"id": "mercy-performance", "label": "Mercy vs. performance", "nt_theme": "Sabbath healing and the Matthew 23:23 / Luke 11:42 Guide links", "bom_theme": "Mercy, charity, and Zoramite mission topic clusters", "supported": True},
            {"id": "enemy-love", "label": "Enemy love", "nt_theme": "Ethical teaching and non-retaliatory posture are distinct from state policy", "bom_theme": "Anti-Nephi-Lehies’ covenant and refusal of resistance", "supported": True},
            {"id": "symmetric-evidence", "label": "Symmetry check", "nt_theme": "The accepted Guide has richer direct NT links for faith, persecution, repentance, judgment, and tithes", "bom_theme": "The accepted Guide has richer direct BOM links for pride, mercy, riches, humility, love, and enemies", "supported": True},
        ],
        "application_warning_signs": [
            {"label": "Identity badge", "text": "Christianity functioning primarily as a badge of social belonging.", "theme_id": "identity-badge"},
            {"label": "Power shortcut", "text": "Pursuing worldly power in the name of religion.", "theme_id": "authority-and-power"},
            {"label": "Moral boundary", "text": "Treating outsiders as morally lesser or enemies by default.", "theme_id": "wide-neighbor"},
            {"label": "Selective law", "text": "Emphasizing law while neglecting mercy, justice, and compassion.", "theme_id": "mercy-over-performance"},
            {"label": "Group certainty", "text": "Assuming one’s group possesses inherent righteousness and cannot need correction.", "theme_id": "power-repentance"},
            {"label": "Hostility", "text": "Using religious identity to justify retaliation or hostility.", "theme_id": "enemy-love"},
        ],
        "validation": validation,
    }

    write_json(args.output, payload)
    print(json.dumps({"output": str(args.output), "validation": validation, "stats": stats}, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
