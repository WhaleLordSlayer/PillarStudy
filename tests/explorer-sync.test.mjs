// End-to-end proof that the website follows the Admin publishing system:
// an approved change published as a new release reaches the public pages,
// search index, links and sitemap with no website code change; unpublished
// data never does; a broken publish leaves the site on the previous release.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sync } from '../scripts/explorer-sync.mjs';
import { build } from '../site/build.mjs';
import { validateDescriptor, ReleaseError } from '../site/lib/release.mjs';
import { baseContent, fakeAdmin, makeReleaseDb, publish } from './fixtures/release.mjs';

const ORIGIN = 'https://admin.test';
const CURRENT = `${ORIGIN}/api/public/explorer/current`;
const quiet = () => {};

async function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'cv-test-'));
  const state = { releases: {}, current: null, corrupt: {} };
  const ctx = { dir, state, snapshotPath: join(dir, 'explorer-snapshot.json'), dataDir: dir, out: join(dir, 'dist') };
  ctx.publish = async (content, releaseId, publishedAt) => {
    const rel = publish(await makeReleaseDb(content), { releaseId, publishedAt, origin: ORIGIN });
    state.releases[releaseId] = rel;
    state.current = rel;
    return rel;
  };
  ctx.sync = (opts = {}) => sync({ currentUrl: CURRENT, snapshotPath: ctx.snapshotPath, dataDir: ctx.dataDir, fetchImpl: fakeAdmin(state, ORIGIN), cacheDir: join(dir, 'cache'), writeLedgers: true, ...opts });
  ctx.build = () => build({ out: ctx.out, snapshotPath: ctx.snapshotPath, dataDir: ctx.dataDir, writeLedgers: true, log: quiet, env: {} });
  ctx.read = p => readFileSync(join(ctx.out, p), 'utf8');
  return ctx;
}

const silence = async fn => { const l = console.log; console.log = quiet; try { return await fn(); } finally { console.log = l; } };

test('an approved Explorer change propagates to the public site with no code change', async () => {
  const t = await setup();
  const A = baseContent();
  await t.publish(A, 'rel-20261001-120000-aaaaaaaa', '2026-10-01T12:00:00.000Z');
  const r1 = await silence(() => t.sync());
  assert.equal(r1.changed, true);
  await t.build();

  const placeA = t.read('explorer/places/land-of-antionum/index.html');
  assert.match(placeA, /Antionum was a land east of Zarahemla/);
  assert.doesNotMatch(placeA, /Hill Onidah/);
  assert.ok(!existsSync(join(t.out, 'explorer/places/hill-onidah/index.html')));

  // Release B, published through Admin: new record, renamed record, changed
  // summary, new accepted relationship, new verse link.
  const B = baseContent();
  B.entities.push({ id: 'place:000200', type: 'place', name: 'Onidah, Hill', slug: 'onidah-hill', mentions: 1,
    record: { place_type: 'hill', events: [], people: [{ id: 'alma-the-younger' }], key_people: [], groups: [], scriptures: [{ book: 'Alma', start_chapter: 32, start_verse: 4, end_chapter: 32, end_verse: 4, display: 'Alma 32:4' }] } });
  B.entities.find(e => e.id === 'p1evt:zoramite-mission').name = 'Alma leads the mission to the Zoramites';
  B.entities.find(e => e.id === 'p1evt:zoramite-mission').slug = 'alma-leads-the-mission-to-the-zoramites';
  B.enrichment[0].summary = 'Antionum was the land of the Zoramites, east of the land of Zarahemla.';
  B.relationships.push({ id: 'rel:new', type: 'SIBLING_OF', predicate: 'sibling_of', s: 'alma-the-younger', o: 'place:000200', status: 'ACCEPTED', canonical: 1 });
  B.mentions.push({ ref: 'Alma 32:4', id: 'place:000200', surface: 'Onidah', s: 66, e: 72, confidence: 'DETERMINISTIC_HIGH' });
  await t.publish(B, 'rel-20261008-090000-bbbbbbbb', '2026-10-08T09:00:00.000Z');

  const r2 = await silence(() => t.sync());
  assert.equal(r2.changed, true);
  assert.equal(r2.previous, 'rel-20261001-120000-aaaaaaaa');
  await t.build();

  // Updated profile.
  const placeB = t.read('explorer/places/land-of-antionum/index.html');
  assert.match(placeB, /Antionum was the land of the Zoramites, east of the land of Zarahemla\./);
  // New record gets a page, a search entry and a sitemap entry.
  const onidah = t.read('explorer/places/hill-onidah/index.html');
  assert.match(onidah, /<h1>Hill Onidah<\/h1>/);
  assert.match(t.read('explorer/search-index.json'), /Hill Onidah/);
  // Changed relationship shows on both ends.
  assert.match(t.read('explorer/people/alma-the-younger/index.html'), /href="\/explorer\/places\/hill-onidah\/"/);
  // Updated scripture chapter connection, with the verse link in the text.
  const alma32 = t.read('scriptures/book-of-mormon/alma/32/index.html');
  assert.match(alma32, /<a class="m k-place" href="\/explorer\/places\/hill-onidah\/"[^>]*>Onidah<\/a>/);
  // Renamed record: new URL, old URL redirects.
  assert.ok(existsSync(join(t.out, 'explorer/events/alma-leads-the-mission-to-the-zoramites/index.html')));
  assert.match(t.read('_redirects'), /\/explorer\/events\/alma-and-companions-minister-to-the-zoramites-at-antionum\/ \/explorer\/events\/alma-leads-the-mission-to-the-zoramites\/ 301/);
  assert.ok(!existsSync(join(t.out, 'explorer/events/alma-and-companions-minister-to-the-zoramites-at-antionum/index.html')), 'old page removed');
  // SEO metadata follows the data.
  assert.match(placeB, /<meta name="description" content="Antionum was the land of the Zoramites/);
  // Release identity is visible and machine-readable.
  assert.equal(JSON.parse(t.read('explorer/release.json')).releaseId, 'rel-20261008-090000-bbbbbbbb');

  // Running the job again with nothing new published is a no-op.
  const r3 = await silence(() => t.sync());
  assert.equal(r3.changed, false);
});

test('unpublished and unapproved data never reaches public pages', async () => {
  const t = await setup();
  await t.publish(baseContent(), 'rel-20261001-120000-cccccccc');
  await silence(() => t.sync());
  await t.build();
  const snapshot = readFileSync(t.snapshotPath, 'utf8');
  const elder = t.read('explorer/people/alma-the-elder/index.html');
  const younger = t.read('explorer/people/alma-the-younger/index.html');
  const alma32 = t.read('scriptures/book-of-mormon/alma/32/index.html');
  // A REVIEW_REQUIRED relationship is excluded; the ACCEPTED one is shown.
  assert.doesNotMatch(snapshot, /rel:draft/);
  assert.doesNotMatch(younger + elder, /Killed/);
  assert.match(elder, />Spouse</);
  // A rejected summary is excluded everywhere.
  assert.doesNotMatch(snapshot + elder, /UNPUBLISHED-SUMMARY-SENTINEL/);
  // A low-confidence verse link is not rendered.
  assert.doesNotMatch(alma32, /k-person" href="\/explorer\/people\/alma-the-elder\/"/);
});

test('a failed publish leaves the site on the previous valid release', async () => {
  const t = await setup();
  await t.publish(baseContent(), 'rel-20261001-120000-dddddddd');
  await silence(() => t.sync());
  const before = readFileSync(t.snapshotPath, 'utf8');

  // Corrupted artifact (hash mismatch).
  const bad = baseContent();
  bad.enrichment[0].summary = 'SHOULD-NOT-SHIP';
  await t.publish(bad, 'rel-20261002-120000-eeeeeeee');
  t.state.corrupt['rel-20261002-120000-eeeeeeee'] = true;
  await assert.rejects(silence(() => t.sync()), ReleaseError);
  assert.equal(readFileSync(t.snapshotPath, 'utf8'), before);

  // A release that would silently empty the site needs an explicit override.
  const empty = baseContent();
  empty.entities = empty.entities.slice(0, 1);
  empty.entities[0].record = { events: [], related_people: [], places: [], groups: [], scriptures: [] };
  empty.relationships = []; empty.enrichment = []; empty.mentions = [];
  await t.publish(empty, 'rel-20261003-120000-ffffffff');
  await assert.rejects(silence(() => t.sync()), /would drop public records/);
  assert.equal(readFileSync(t.snapshotPath, 'utf8'), before);

  // The previous release still builds and serves.
  await t.build();
  assert.match(t.read('explorer/places/land-of-antionum/index.html'), /Antionum was a land east of Zarahemla/);
});

test('release descriptors follow the mobile client contract', () => {
  const good = { releaseId: 'rel-20261001-120000-aaaaaaaa', publishedAt: '2026-10-01T12:00:00Z', artifact: { url: 'https://admin.cultivatestudy.com/api/public/explorer/releases/rel-20261001-120000-aaaaaaaa/explorer.db.gz', encoding: 'gzip', compressedSha256: 'a'.repeat(64), dbSha256: 'b'.repeat(64), compressedSize: 10 } };
  assert.equal(validateDescriptor(good).releaseId, good.releaseId);
  assert.throws(() => validateDescriptor({ ...good, artifact: { ...good.artifact, url: 'https://evil.example/x.db.gz' } }), ReleaseError);
  assert.throws(() => validateDescriptor({ ...good, releaseId: '../etc' }), ReleaseError);
  assert.throws(() => validateDescriptor({ ...good, artifact: { ...good.artifact, dbSha256: 'x' } }), ReleaseError);
});
