// Builds small Explorer release databases with the same tables and columns
// the published mobile artifact has, so tests can publish "release A",
// then "release B", without network access or the 80 MB production file.
import { gzipSync } from 'node:zlib';
import initSqlJs from 'sql.js';
import { sha256 } from '../../site/lib/release.mjs';

const SCHEMA = `
CREATE TABLE build_manifest (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE entities (entity_id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, display_name TEXT NOT NULL, slug TEXT, corpus TEXT NOT NULL, corpus_key TEXT NOT NULL, record_json TEXT NOT NULL, source_checkpoint TEXT NOT NULL);
CREATE TABLE relationships (relationship_id TEXT PRIMARY KEY, relationship_type TEXT NOT NULL, predicate TEXT NOT NULL, subject_id TEXT NOT NULL, object_id TEXT NOT NULL, approval_basis TEXT, review_status TEXT, source_supported_status TEXT, evidence_ids_json TEXT NOT NULL, source_ids_json TEXT NOT NULL, notes TEXT, evidence_refs_json TEXT NOT NULL, support_count INTEGER NOT NULL DEFAULT 0, corpus TEXT NOT NULL, corpus_key TEXT NOT NULL, provenance_json TEXT, record_json TEXT, canonical_claim INTEGER);
CREATE TABLE entity_enrichment (entity_id TEXT NOT NULL, source TEXT NOT NULL, entity_kind TEXT NOT NULL, summary TEXT NOT NULL, summary_status TEXT NOT NULL, source_warning_json TEXT, source_entry_id TEXT NOT NULL, identity_resolution_json TEXT NOT NULL, scripture_references_json TEXT NOT NULL, provenance_json TEXT NOT NULL, PRIMARY KEY (entity_id, source));
CREATE TABLE reader_entity_mentions (reference TEXT NOT NULL, entity_id TEXT NOT NULL, entity_kind TEXT NOT NULL, surface_text TEXT NOT NULL, start_char INTEGER NOT NULL, end_char INTEGER NOT NULL, resolution_method TEXT NOT NULL, confidence TEXT NOT NULL, PRIMARY KEY (reference, start_char, end_char));
CREATE TABLE explorer_derived_connections (source_entity_id TEXT NOT NULL, target_entity_id TEXT NOT NULL, target_entity_kind TEXT NOT NULL, connection_type TEXT NOT NULL, path_count INTEGER NOT NULL, via_event_count INTEGER NOT NULL, via_event_ids_json TEXT NOT NULL, intermediary_kinds_json TEXT NOT NULL);
CREATE TABLE search_index (entity_id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, display_name TEXT NOT NULL, corpus TEXT NOT NULL, corpus_key TEXT NOT NULL, mention_count INTEGER NOT NULL, safe_aliases_json TEXT NOT NULL, first_locator TEXT, last_locator TEXT);
`;

const ref = (book, sc, sv, ec, ev) => ({ book, start_chapter: sc, start_verse: sv, end_chapter: ec, end_verse: ev, end_book: null, display: `${book} ${sc}:${sv}–${ev}` });

/** The baseline content of "release A". Tests mutate a copy for later releases. */
export function baseContent() {
  return {
    entities: [
      { id: 'alma-the-younger', type: 'person', name: 'Alma the Younger', slug: 'alma-the-younger', mentions: 3,
        record: { events: [{ id: 'p1evt:zoramite-mission', role: 'leader' }], related_people: [{ id: 'alma-the-elder', predicate: 'father_of' }], places: [{ id: 'place:000100', via_events: ['p1evt:zoramite-mission'] }], groups: [], scriptures: [ref('Alma', 31, 1, 34, 41)] } },
      { id: 'alma-the-elder', type: 'person', name: 'Alma the Elder', slug: 'alma-the-elder', mentions: 1,
        record: { events: [], related_people: [{ id: 'alma-the-younger', predicate: 'father_of' }], places: [], groups: [], scriptures: [ref('Mosiah', 18, 1, 18, 35)] } },
      { id: 'place:000100', type: 'place', name: 'Antionum, Land of', slug: 'antionum-land-of', mentions: 1,
        record: { place_type: 'land', events: [{ id: 'p1evt:zoramite-mission' }], people: [{ id: 'alma-the-younger', via_event: 'p1evt:zoramite-mission' }], key_people: [], groups: [], scriptures: [ref('Alma', 31, 3, 31, 3)] } },
      { id: 'p1evt:zoramite-mission', type: 'event', name: 'Alma and companions minister to the Zoramites at Antionum', slug: 'alma-and-companions-minister-to-the-zoramites-at-antionum', mentions: 0,
        record: { people: [{ id: 'alma-the-younger', role: 'leader' }], places: [{ id: 'place:000100' }], groups: [], related_events: [], scriptures: [ref('Alma', 31, 1, 34, 41)] } },
    ],
    relationships: [
      // Accepted canonical relationship: must render.
      { id: 'rel:accepted', type: 'SPOUSE_OF', predicate: 'spouse_of', s: 'alma-the-elder', o: 'alma-the-younger', status: 'ACCEPTED', canonical: 1 },
      // Unreviewed: must never render anywhere.
      { id: 'rel:draft', type: 'KILLED', predicate: 'killed', s: 'alma-the-younger', o: 'alma-the-elder', status: 'REVIEW_REQUIRED', canonical: 1 },
    ],
    enrichment: [
      { id: 'place:000100', status: 'ACCEPT', summary: 'Antionum was a land east of Zarahemla where the Zoramites lived.' },
      { id: 'alma-the-elder', status: 'REJECT', summary: 'UNPUBLISHED-SUMMARY-SENTINEL should never appear.' },
    ],
    mentions: [
      { ref: 'Alma 32:4', id: 'alma-the-younger', surface: 'Alma', s: 8, e: 12, confidence: 'DETERMINISTIC_HIGH' },
      { ref: 'Alma 32:5', id: 'alma-the-younger', surface: 'Alma', s: 19, e: 23, confidence: 'DETERMINISTIC_HIGH' },
      { ref: 'Alma 32:6', id: 'alma-the-elder', surface: 'Alma', s: 13, e: 17, confidence: 'LOW' },
    ],
  };
}

export async function makeReleaseDb(content) {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(SCHEMA);
  db.run("INSERT INTO build_manifest VALUES ('contract_version','test-fixture'),('database_schema_version','fixture-1')");
  for (const e of content.entities) {
    const record = { id: e.id, kind: e.type, name: e.name, display_title: null, summary: null, artwork: null, ...e.record };
    db.run('INSERT INTO entities VALUES (?,?,?,?,?,?,?,?)', [e.id, e.type, e.name, e.slug, 'Book of Mormon', 'BOM', JSON.stringify(record), 'fixture']);
    db.run('INSERT INTO search_index VALUES (?,?,?,?,?,?,?,?,?)', [e.id, e.type, e.name, 'Book of Mormon', 'BOM', e.mentions, '[]', null, null]);
  }
  for (const r of content.relationships) {
    db.run('INSERT INTO relationships (relationship_id, relationship_type, predicate, subject_id, object_id, review_status, evidence_ids_json, source_ids_json, evidence_refs_json, corpus, corpus_key, canonical_claim) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [r.id, r.type, r.predicate, r.s, r.o, r.status, '[]', '[]', '[]', 'Book of Mormon', 'BOM', r.canonical]);
  }
  for (const x of content.enrichment) {
    db.run('INSERT INTO entity_enrichment VALUES (?,?,?,?,?,?,?,?,?,?)', [x.id, 'george_reynolds_dictionary', 'place', x.summary, x.status, null, 'fixture', '{}', '[]', '{}']);
  }
  for (const m of content.mentions) {
    db.run('INSERT INTO reader_entity_mentions VALUES (?,?,?,?,?,?,?,?)', [m.ref, m.id, 'person', m.surface, m.s, m.e, 'DETERMINISTIC_EXACT_UNIQUE', m.confidence]);
  }
  const bytes = Buffer.from(db.export());
  db.close();
  return bytes;
}

/** Wraps DB bytes as a published release with the Admin Worker's contract. */
export function publish(dbBytes, { releaseId, publishedAt = '2026-10-01T12:00:00.000Z', origin = 'https://admin.test' }) {
  const gz = gzipSync(dbBytes);
  return {
    gz,
    descriptor: {
      releaseId, publishedAt,
      artifact: { url: `${origin}/api/public/explorer/releases/${releaseId}/explorer.db.gz`, encoding: 'gzip', compressedSha256: sha256(gz), dbSha256: sha256(dbBytes), compressedSize: gz.length },
    },
  };
}

/** A fake Admin Worker: /current names `state.current`; artifacts served by id. */
export function fakeAdmin(state, origin = 'https://admin.test') {
  return async url => {
    const u = new URL(url);
    if (u.origin !== origin) throw new Error(`unexpected host ${u.origin}`);
    if (u.pathname === '/api/public/explorer/current') {
      return new Response(JSON.stringify(state.current.descriptor), { headers: { 'content-type': 'application/json' } });
    }
    const m = /^\/api\/public\/explorer\/releases\/([^/]+)\/explorer\.db\.gz$/.exec(u.pathname);
    const rel = m && state.releases[m[1]];
    if (!rel) return new Response('not found', { status: 404 });
    if (state.corrupt?.[m[1]]) {
      const bytes = Buffer.from(rel.gz);
      bytes[bytes.length >> 1] ^= 0xff; // a corrupted transfer: same size, different bytes
      return new Response(bytes);
    }
    return new Response(rel.gz);
  };
}
