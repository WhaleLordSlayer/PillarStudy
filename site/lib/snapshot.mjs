// Turns a verified, published Explorer release (the mobile SQLite artifact)
// into the website's public snapshot. Everything the site renders about
// Explorer comes from this function, so every publication rule lives here:
//
//  1. Only bytes from a published release. The pointer can only name a
//     release the Admin Worker reports as finalized/published; drafts and
//     Working Changes never leave D1, so they cannot appear here.
//  2. Corpus allowlist (Book of Mormon for now; extensible).
//  3. Canonical relationships: canonical_claim = 1 AND review_status = ACCEPTED.
//     REVIEW_REQUIRED (or any other status) never renders.
//  4. Summaries: entity_enrichment rows with summary_status ACCEPT or
//     ACCEPT_WITH_SOURCE_WARNING only, shown with attribution and warning.
//  5. Verse links: reader_entity_mentions with confidence DETERMINISTIC_HIGH.
//  6. Two-hop "derived" connections are kept apart and always labelled as
//     connected through shared events, never as a direct relationship.
//  7. Links to anything outside the published entity set are dropped.
import initSqlJs from 'sql.js';
import { BOOK_BY_NAME } from './books.mjs';

export const SNAPSHOT_SCHEMA = 1;
const REQUIRED_TABLES = ['build_manifest', 'entities', 'relationships', 'entity_enrichment', 'reader_entity_mentions', 'explorer_derived_connections', 'search_index'];
const ACCEPTED_SUMMARY = new Set(['ACCEPT', 'ACCEPT_WITH_SOURCE_WARNING']);
const KINDS = ['person', 'place', 'event', 'group'];

let SQL;
async function sql() {
  SQL ??= await initSqlJs();
  return SQL;
}

function rows(db, query, params = []) {
  const stmt = db.prepare(query);
  stmt.bind(params);
  const out = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

const parse = (s, fallback) => {
  if (s == null) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
};

function normRef(s) {
  if (!s || typeof s !== 'object' || !s.book) return null;
  const sc = Number(s.start_chapter ?? s.chapter);
  const sv = s.start_verse == null ? null : Number(s.start_verse);
  const ec = Number(s.end_chapter ?? sc);
  const ev = s.end_verse == null ? null : Number(s.end_verse);
  if (!Number.isInteger(sc)) return null;
  return { book: s.book, endBook: s.end_book || s.book, sc, sv, ec, ev, display: s.display || s.reference || `${s.book} ${sc}${sv ? `:${sv}` : ''}` };
}

const reynoldsWarning = w => {
  if (!w?.required) return null;
  return (w.categories ?? []).some(c => String(c).includes('GEOGRAPHY'))
    ? "Includes George Reynolds' historical geographic interpretation."
    : 'Historical interpretation from George Reynolds.';
};

/** Open + validate a release database. Throws on anything structurally wrong. */
export async function openRelease(bytes) {
  const S = await sql();
  const db = new S.Database(bytes);
  const check = db.exec('PRAGMA quick_check')[0]?.values?.[0]?.[0];
  if (check !== 'ok') throw new Error(`release database failed quick_check: ${check}`);
  const tables = new Set(rows(db, "SELECT name FROM sqlite_master WHERE type IN ('table','view')").map(r => r.name));
  for (const t of REQUIRED_TABLES) if (!tables.has(t)) throw new Error(`release database is missing table ${t}`);
  return db;
}

export async function buildSnapshot(bytes, { release, corpora = ['BOM'] } = {}) {
  const db = await openRelease(bytes);
  try {
    const manifest = Object.fromEntries(rows(db, 'SELECT key, value FROM build_manifest').map(r => [r.key, r.value]));
    const corpusList = corpora.map(c => `'${c.replace(/[^A-Z_]/g, '')}'`).join(',');

    // ── entities ────────────────────────────────────────────────────────
    const entities = new Map();
    for (const r of rows(db, `SELECT e.entity_id, e.entity_type, e.display_name, e.slug, e.corpus, e.corpus_key, e.record_json,
                                     s.mention_count, s.safe_aliases_json, s.first_locator, s.last_locator
                              FROM entities e LEFT JOIN search_index s USING (entity_id)
                              WHERE e.corpus_key IN (${corpusList}) ORDER BY e.entity_id`)) {
      if (!KINDS.includes(r.entity_type)) continue;
      const rec = parse(r.record_json, {});
      entities.set(r.entity_id, {
        id: r.entity_id,
        kind: r.entity_type,
        name: r.display_name,
        slug: r.slug || null,
        corpus: r.corpus,
        corpusKey: r.corpus_key,
        title: rec.display_title || null,
        placeType: r.entity_type === 'place' ? rec.place_type || null : null,
        mentionCount: Number(r.mention_count) || 0,
        aliases: parse(r.safe_aliases_json, []).filter(a => typeof a === 'string'),
        firstLocator: r.first_locator || null,
        lastLocator: r.last_locator || null,
        _rec: rec,
      });
    }
    const has = id => entities.has(id);

    // ── links from the published projection records ─────────────────────
    for (const e of entities.values()) {
      const rec = e._rec;
      const viaList = x => [...new Set([...(x.via_events ?? []), ...(x.via_event ? [x.via_event] : [])])].filter(has);
      e.refs = (rec.scriptures ?? []).map(normRef).filter(Boolean);
      e.events = (rec.events ?? []).filter(x => has(x.id)).map(x => ({ id: x.id, role: x.role ?? null }));
      e.places = (rec.places ?? []).filter(x => has(x.id)).map(x => ({ id: x.id, via: viaList(x) }));
      e.groups = (rec.groups ?? []).filter(x => has(x.id)).map(x => ({ id: x.id, via: viaList(x), connection: x.connection ?? null }));
      e.people = [];
      if (e.kind === 'person') {
        e.family = (rec.related_people ?? []).filter(x => has(x.id)).map(x => ({ id: x.id, predicate: x.predicate }));
      } else {
        e.family = [];
        e.people = (rec.people ?? []).filter(x => has(x.id)).map(x => ({ id: x.id, role: x.role ?? null, via: viaList(x), connection: x.connection ?? null }));
      }
      e.keyPeople = (rec.key_people ?? []).filter(x => has(x.id)).map(x => x.id);
      e.relatedEvents = (rec.related_events ?? []).map(x => (typeof x === 'string' ? x : x?.id)).filter(has);
      delete e._rec;
    }

    // ── canonical relationships (accepted only) ─────────────────────────
    const relationships = rows(db, `SELECT relationship_id, relationship_type, predicate, subject_id, object_id, review_status, approval_basis, evidence_refs_json
                                    FROM relationships WHERE canonical_claim = 1 AND review_status = 'ACCEPTED' AND corpus_key IN (${corpusList})`)
      .filter(r => has(r.subject_id) && has(r.object_id))
      .map(r => ({ id: r.relationship_id, type: r.relationship_type, predicate: r.predicate, subject: r.subject_id, object: r.object_id,
        refs: parse(r.evidence_refs_json, []).map(normRef).filter(Boolean) }));
    const excludedRelationships = Number(rows(db, `SELECT count(*) AS n FROM relationships WHERE corpus_key IN (${corpusList}) AND NOT (canonical_claim = 1 AND review_status = 'ACCEPTED')`)[0].n);

    // ── accepted summaries ──────────────────────────────────────────────
    for (const r of rows(db, 'SELECT entity_id, source, summary, summary_status, source_warning_json, scripture_references_json FROM entity_enrichment')) {
      const e = entities.get(r.entity_id);
      if (!e || !ACCEPTED_SUMMARY.has(r.summary_status) || !String(r.summary ?? '').trim()) continue;
      e.summary = {
        text: String(r.summary).trim(),
        attribution: r.source === 'george_reynolds_dictionary' ? "From George Reynolds' Dictionary of the Book of Mormon (1891)" : null,
        warning: reynoldsWarning(parse(r.source_warning_json, null)),
        refs: parse(r.scripture_references_json, []).map(x => ({ reference: x.reference, book: x.book, chapter: x.chapter, sv: x.start_verse, ev: x.end_verse })).filter(x => x.reference),
      };
    }

    // ── two-hop derived connections (labelled, never canonical) ─────────
    for (const r of rows(db, 'SELECT source_entity_id, target_entity_id, path_count, via_event_ids_json FROM explorer_derived_connections ORDER BY path_count DESC')) {
      const e = entities.get(r.source_entity_id);
      if (!e || !has(r.target_entity_id) || r.target_entity_id === e.id) continue;
      (e.derived ??= []).push({ id: r.target_entity_id, pathCount: Number(r.path_count), via: parse(r.via_event_ids_json, []).filter(has) });
    }

    // ── verse-level mentions ────────────────────────────────────────────
    const mentions = {};
    for (const r of rows(db, "SELECT reference, entity_id, entity_kind, surface_text, start_char, end_char FROM reader_entity_mentions WHERE confidence = 'DETERMINISTIC_HIGH' ORDER BY reference, start_char")) {
      if (!has(r.entity_id)) continue;
      const m = /^(.+) (\d+):(\d+)$/.exec(r.reference);
      if (!m || !BOOK_BY_NAME.has(m[1])) continue;
      const chapterKey = `${m[1]} ${m[2]}`;
      (mentions[chapterKey] ??= []).push([Number(m[3]), r.entity_id, Number(r.start_char), Number(r.end_char), r.surface_text]);
      const e = entities.get(r.entity_id);
      e.chapters ??= {};
      e.chapters[chapterKey] = (e.chapters[chapterKey] ?? 0) + 1;
    }

    for (const e of entities.values()) {
      e.derived ??= [];
      e.chapters ??= {};
    }

    return {
      schemaVersion: SNAPSHOT_SCHEMA,
      release: { ...release, contractVersion: manifest.contract_version ?? null, schema: manifest.database_schema_version ?? null },
      corpora,
      entities: Object.fromEntries([...entities.entries()].sort(([a], [b]) => a.localeCompare(b))),
      relationships,
      mentions,
      stats: {
        entities: Object.fromEntries(KINDS.map(k => [k, [...entities.values()].filter(e => e.kind === k).length])),
        relationships: relationships.length,
        excludedRelationships,
        summaries: [...entities.values()].filter(e => e.summary).length,
        mentionChapters: Object.keys(mentions).length,
      },
    };
  } finally {
    db.close();
  }
}
