// One-time import of the public-domain Book of Mormon verse text (and the
// CC BY 4.0 speaker attribution) from the Cultivate app's bundled
// assets/scriptures.db into a compact JSON file committed with the website.
//
//   node site/tools/import-scriptures.mjs <path-to-app>/assets/scriptures.db
//
// Provenance: the app builds scriptures.db from the scriptures.nephi.org
// (lds-scriptures) export, whose verse text is public domain. Chapter
// headings, summaries and footnotes are NOT part of that export and are never
// imported. Speaker data: Hilton & Hopkin, "Book of Mormon With Voices
// Identified" (2012), CC BY 4.0.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import initSqlJs from 'sql.js';
import { BOOKS } from '../lib/books.mjs';

const dbPath = process.argv[2];
if (!dbPath) throw new Error('usage: import-scriptures.mjs <scriptures.db>');
const SQL = await initSqlJs();
const bytes = readFileSync(dbPath);
const db = new SQL.Database(bytes);

// verses is an FTS5 table; read its content table directly (c0=text, c1=source,
// c2=app_book, c3=app_chapter, c4=verse) so no FTS module is needed.
const rows = db.exec("SELECT c0, c2, c3, c4 FROM verses_content WHERE c1 = 'Book of Mormon' ORDER BY id")[0].values;
const speakerRows = db.exec('SELECT app_book, app_chapter, verse, seq, speaker_id, speaker_label, text FROM verse_speakers ORDER BY app_book, app_chapter, verse, seq')[0].values;
const speakers = new Map();
for (const [book, ch, v, seq, id, label, text] of speakerRows) {
  const key = `${book} ${ch}:${v}`;
  if (!speakers.has(key)) speakers.set(key, []);
  speakers.get(key).push({ id, label, text });
}

const norm = s => s.replace(/—/g, '--');
const books = BOOKS.map(b => ({ name: b.name, slug: b.slug, chapters: [] }));
const byName = new Map(books.map(b => [b.name, b]));
for (const [text, book, chapter, verse] of rows) {
  const b = byName.get(book);
  if (!b) throw new Error(`unknown book ${book}`);
  const ci = Number(chapter) - 1;
  b.chapters[ci] ??= [];
  const key = `${book} ${Number(chapter)}:${Number(verse)}`;
  // Speaker segments → [offset, speakerId, label] at the offsets where each
  // segment starts in the canonical verse text.
  const segs = speakers.get(key) ?? [];
  const marks = [];
  let cursor = 0;
  const nt = norm(text);
  for (const seg of segs) {
    const probe = norm(seg.text).slice(0, 24);
    const at = nt.indexOf(probe, cursor);
    if (at < 0) continue;
    marks.push([at, seg.id, seg.label]);
    cursor = at + 1;
  }
  b.chapters[ci][Number(verse) - 1] = marks.length ? { t: text, s: marks } : { t: text };
}
for (const b of books) for (const [i, ch] of b.chapters.entries()) if (!ch || ch.some(v => !v)) throw new Error(`gap in ${b.name} ${i + 1}`);

const out = {
  schemaVersion: 1,
  work: 'Book of Mormon',
  slug: 'book-of-mormon',
  text: {
    source: 'scriptures.nephi.org (lds-scriptures project), via the Cultivate app assets/scriptures.db',
    rights: 'Public domain verse text. Chapter headings, summaries and footnotes are excluded.',
    url: 'https://scriptures.nephi.org/',
  },
  speakers: {
    source: 'John Hilton III and Shon D. Hopkin, Book of Mormon With Voices Identified (2012), BYU ScholarsArchive / WordCruncher',
    license: 'CC BY 4.0',
    url: 'https://scholarsarchive.byu.edu/wordcruncher/1/',
  },
  sourceSha256: createHash('sha256').update(bytes).digest('hex'),
  books,
};
writeFileSync(new URL('../content/scriptures/book-of-mormon.json', import.meta.url), JSON.stringify(out));
console.log(`wrote ${rows.length} verses, ${books.reduce((n, b) => n + b.chapters.length, 0)} chapters`);
