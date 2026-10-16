#!/usr/bin/env node
// Static site generator for cultivatestudy.com.
//
//   node site/build.mjs [--out dist] [--write-ledgers]
//
// Renders the marketing site, the public Explorer and the scripture reader
// to plain HTML from (a) the published Explorer release pinned in
// site/data/explorer-release.json and (b) the public-domain scripture text in
// site/content/. Runs after `vite build` (which builds /join/, /lesson/ and
// the other existing pages) and writes into the same output directory.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPLORER, SCRIPTURES, SITE } from './config.mjs';
import { loadSnapshot } from './lib/snapshot-store.mjs';
import { KIND, KINDS, artwork, assignUrls, chaptersOf, displayName, subtitle } from './lib/model.mjs';
import { aboutPage, browsePage, explorerHome, profilePage, searchPage } from './templates/explorer.mjs';
import { bookPage, chapterPage, scripturesIndex, worksIndex } from './templates/scriptures.mjs';
import { connectPage, downloadPage, homePage, notFoundPage, studyPage, teachPage } from './templates/marketing.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_DIR = join(ROOT, 'site');
const DATA_DIR = join(SITE_DIR, 'data');

const CANONICAL_LABELS = {
  forward: { CHILD_OF: 'Parent', PARENT_OF: 'Child', SIBLING_OF: 'Sibling', SPOUSE_OF: 'Spouse', COUSIN_OF: 'Cousin', KILLED: 'Killed', PERSON_PARTICIPATED_IN_EVENT: 'Event', EVENT_MENTIONS_PLACE: 'Place mentioned', EVENT_OCCURRED_AT_PLACE: 'Where it happened', GROUP_PARTICIPATED_IN_EVENT: 'Event' },
  inverse: { CHILD_OF: 'Child', PARENT_OF: 'Parent', SIBLING_OF: 'Sibling', SPOUSE_OF: 'Spouse', COUSIN_OF: 'Cousin', KILLED: 'Killed by', PERSON_PARTICIPATED_IN_EVENT: 'Participant', EVENT_MENTIONS_PLACE: 'Event that mentions it', EVENT_OCCURRED_AT_PLACE: 'Event that happened here', GROUP_PARTICIPATED_IN_EVENT: 'Group involved' },
};

const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
const mainHash = html => createHash('sha256').update((/<main id="main">([\s\S]*)<\/main>/.exec(html)?.[1] ?? html).replace(/release [\w-]+/g, '')).digest('hex').slice(0, 16);

// Routes that live at the site root and are not part of the generated site.
const ROOT_ROUTES = ['/join/', '/lesson/', '/privacy/', '/account-deletion/', '/beta/', '/topical-guide/'];

/** Prefix generated-site links (relative and absolute) with `base`; leave root routes alone. */
export function makeRebase(base) {
  if (!base) return s => s;
  const keep = p => ROOT_ROUTES.some(r => p.startsWith(r)) || p.startsWith(`${base}/`);
  const origin = SITE.origin.replace(/[.]/g, '\\.');
  return html => html
    .replace(/((?:href|src|action)=")(\/[^"]*)/g, (m, a, p) => (keep(p) ? m : `${a}${base}${p}`))
    .replace(new RegExp(`${origin}(\\/[^"\\s<]*)`, 'g'), (m, p) => (keep(p) ? m : `${SITE.origin}${base}${p}`));
}

export async function build({ out = join(ROOT, 'dist'), env = process.env, writeLedgers = false, log = console.log, now = new Date(), snapshotOverride = null, snapshotPath, dataDir = DATA_DIR, base = '' } = {}) {
  // base: mount the generated site under a path prefix (e.g. '/new' for the
  // preview on the live domain). Preview mode is noindex and writes no root files.
  const preview = Boolean(base);
  const rebase = makeRebase(base);
  const t0 = Date.now();
  // 1. The public Explorer snapshot (committed; no network needed to build).
  const snapshot = snapshotOverride ?? await loadSnapshot({ env, ...(snapshotPath ? { path: snapshotPath } : {}) });
  const release = snapshot.release;
  log(`[site] release ${release.releaseId} (${release.source}) → ${JSON.stringify(snapshot.stats)}`);

  // 2. Stable URLs (+ redirects for renamed records).
  const slugLedgerPath = join(dataDir, 'slug-ledger.json');
  const { redirects, ledger: slugLedger } = assignUrls(snapshot, readJson(slugLedgerPath, {}));

  // 3. Scripture text.
  const scripture = JSON.parse(readFileSync(join(SITE_DIR, 'content/scriptures/book-of-mormon.json'), 'utf8'));

  // 4. Indexes the templates share.
  const E = snapshot.entities;
  const all = Object.values(E);
  const byKind = Object.fromEntries(KINDS.map(k => [k, all.filter(e => e.kind === k)]));
  const featuredPeople = [...byKind.person].sort((a, b) => b.mentionCount - a.mentionCount).slice(0, 12);
  const chapterEvents = new Map();
  for (const ev of byKind.event) for (const r of ev.refs) for (const [b, c] of chaptersOf(r)) {
    const key = `${b} ${c}`;
    const list = chapterEvents.get(key) ?? chapterEvents.set(key, []).get(key);
    if (!list.includes(ev)) list.push(ev);
  }
  const chapterEntities = new Map();
  for (const [key, ms] of Object.entries(snapshot.mentions)) chapterEntities.set(key, new Set(ms.map(m => m[1])));
  for (const [key, evs] of chapterEvents) { const s = chapterEntities.get(key) ?? chapterEntities.set(key, new Set()).get(key); evs.forEach(e => s.add(e.id)); }
  const relsByEntity = new Map();
  for (const r of snapshot.relationships) {
    (relsByEntity.get(r.subject) ?? relsByEntity.set(r.subject, []).get(r.subject)).push({ other: r.object, label: CANONICAL_LABELS.forward[r.type] ?? r.predicate });
    (relsByEntity.get(r.object) ?? relsByEntity.set(r.object, []).get(r.object)).push({ other: r.subject, label: CANONICAL_LABELS.inverse[r.type] ?? r.predicate });
  }
  const ctx = { snapshot, release, E, all, byKind, featuredPeople, scripture, chapterEvents, chapterEntities, relsByEntity };

  // 5. Render.
  const pages = new Map(); // path → { html, index, group }
  const add = (path, html, { index = true, group = 'pages' } = {}) => pages.set(path, { html, index, group });
  add('/', homePage(ctx));
  add('/study/', studyPage(ctx));
  add('/connect/', connectPage(ctx));
  add('/teach/', teachPage(ctx));
  add('/download/', downloadPage(ctx));
  pages.set('/404.html', { html: notFoundPage(ctx), index: false, group: 'pages', file: '404.html' });
  add('/explorer/', explorerHome(ctx), { group: 'explorer' });
  add('/explorer/about/', aboutPage(ctx), { group: 'explorer' });
  add('/explorer/search/', searchPage(ctx), { index: false, group: 'explorer' });
  for (const k of KINDS) add(`/explorer/${KIND[k].path}/`, browsePage(ctx, k), { group: 'explorer' });
  let indexedProfiles = 0;
  for (const e of all) {
    const p = profilePage(ctx, e);
    if (p.indexable) indexedProfiles++;
    add(e.url, p.html, { index: p.indexable, group: 'explorer' });
  }
  add('/scriptures/', worksIndex(ctx), { group: 'scriptures' });
  add('/scriptures/book-of-mormon/', scripturesIndex(ctx), { group: 'scriptures' });
  const chapterList = scripture.books.flatMap(b => b.chapters.map((_, i) => ({ b, i, url: `/scriptures/book-of-mormon/${b.slug}/${i + 1}/`, label: `${b.name} ${i + 1}` })));
  let indexedChapters = 0, linkedMentions = 0;
  for (const b of scripture.books) add(`/scriptures/book-of-mormon/${b.slug}/`, bookPage(ctx, b), { group: 'scriptures' });
  chapterList.forEach((c, n) => {
    const r = chapterPage(ctx, c.b, c.i, [chapterList[n - 1], chapterList[n + 1]]);
    if (r.indexable) indexedChapters++;
    linkedMentions += r.linked;
    add(c.url, r.html, { index: r.indexable, group: 'scriptures' });
  });

  // 6. Write pages; only touch files whose bytes changed.
  const lastmodPath = join(dataDir, 'lastmod.json');
  const prevLastmod = readJson(lastmodPath, {});
  const nextLastmod = {};
  const changed = [];
  for (const [path, p] of pages) {
    if (preview && p.file) continue;
    const file = p.file ? join(out, p.file) : join(out, path, 'index.html');
    mkdirSync(dirname(file), { recursive: true });
    let body = rebase(p.html);
    if (preview) body = body.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex,follow">');
    if (!existsSync(file) || readFileSync(file, 'utf8') !== body) writeFileSync(file, body);
    const hash = mainHash(p.html);
    const prev = prevLastmod[path];
    const lastmod = prev && prev.hash === hash ? prev.lastmod : now.toISOString();
    if (!prev || prev.hash !== hash) changed.push(path);
    nextLastmod[path] = { hash, lastmod };
    p.lastmod = lastmod;
  }
  // A record no longer in the release: its page must disappear, not linger
  // in an output directory that is reused between builds.
  const buildDir = preview ? join(dataDir, '.build-preview') : join(out, '.build');
  const manifestPath = join(buildDir, 'pages.json');
  const prevPages = readJson(manifestPath, []);
  const removed = prevPages.filter(p => !pages.has(p));
  for (const path of removed) rmSync(join(out, path, 'index.html'), { force: true });

  // 7. Assets, search index, release info, sitemaps, robots, redirects.
  cpSync(join(SITE_DIR, 'assets'), join(out, 'assets/site'), { recursive: true });
  if (preview) for (const f of ['site.css', 'search.js']) {
    const fp = join(out, 'assets/site', f);
    writeFileSync(fp, readFileSync(fp, 'utf8').replace(/(url\(["']?|fetch\(['"])\/(assets|explorer)\//g, `$1${base}/$2/`));
  }
  const searchIndex = {
    releaseId: release.releaseId,
    items: all.map(e => ({ n: displayName(e), k: e.kind, u: `${base}${e.url}`, s: subtitle(e), a: [...new Set([e.name, ...e.aliases].filter(x => x !== displayName(e)))], m: e.mentionCount })).sort((a, b) => b.m - a.m),
  };
  writeFileSync(join(out, 'explorer/search-index.json'), JSON.stringify(searchIndex));
  writeFileSync(join(out, 'explorer/release.json'), JSON.stringify({ releaseId: release.releaseId, publishedAt: release.publishedAt, dbSha256: release.dbSha256, source: release.source, builtAt: now.toISOString(), corpora: snapshot.corpora, stats: snapshot.stats }, null, 2));

  if (!preview) {
  const urlset = list => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map(([path, lastmod]) => `<url><loc>${SITE.origin}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
  const groups = { pages: [], explorer: [], scriptures: [] };
  for (const [path, p] of pages) if (p.index) groups[p.group].push([path, p.lastmod]);
  for (const path of ['/privacy/', '/beta/', '/topical-guide/']) groups.pages.push([path, null]);
  const maps = [];
  for (const [g, list] of Object.entries(groups)) {
    writeFileSync(join(out, `sitemap-${g}.xml`), urlset(list));
    maps.push([g, list.reduce((m, [, l]) => (l && l > m ? l : m), '')]);
  }
  writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${maps.map(([g, l]) => `<sitemap><loc>${SITE.origin}/sitemap-${g}.xml</loc>${l ? `<lastmod>${l}</lastmod>` : ''}</sitemap>`).join('\n')}\n</sitemapindex>\n`);
  writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /explorer/search/\nDisallow: /new/\nDisallow: /new-site/\nDisallow: /dev/\nDisallow: /labs/\nDisallow: /join/\nDisallow: /lesson/\n\nSitemap: ${SITE.origin}/sitemap.xml\n`);
  const redirectLines = [
    '# Generated by site/build.mjs. Renamed Explorer records keep working.',
    '/explorer/index.html /explorer/ 301',
    '/scriptures/book-of-mormon/index.html /scriptures/book-of-mormon/ 301',
    ...redirects.map(([from, to]) => `${from} ${to} 301`),
  ];
  writeFileSync(join(out, '_redirects'), `${redirectLines.join('\n')}\n`);
  writeFileSync(join(out, '_headers'), [
    '/assets/site/fonts/*', '  Cache-Control: public, max-age=31536000, immutable',
    '/assets/site/img/*', '  Cache-Control: public, max-age=2592000',
    '/explorer/search-index.json', '  Cache-Control: public, max-age=300',
    '/explorer/release.json', '  Cache-Control: public, max-age=60',
    '/*', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: strict-origin-when-cross-origin',
  ].join('\n') + '\n');
  writeFileSync(join(out, '.assetsignore'), '.build\n');
  }

  const report = {
    releaseId: release.releaseId, source: release.source, pages: pages.size, changed: changed.length, removed: removed.length,
    profiles: all.length, indexedProfiles, chapters: chapterList.length, indexedChapters, linkedMentions, redirects: redirects.length, ms: Date.now() - t0,
  };
  mkdirSync(buildDir, { recursive: true });
  writeFileSync(manifestPath, JSON.stringify([...pages.keys()]));
  writeFileSync(join(buildDir, 'report.json'), JSON.stringify({ ...report, changedPaths: changed, removedPaths: removed }, null, 2));
  if (writeLedgers) {
    writeFileSync(lastmodPath, `${JSON.stringify(nextLastmod, null, 1)}\n`);
    writeFileSync(slugLedgerPath, `${JSON.stringify(slugLedger, null, 1)}\n`);
  }
  log(`[site] ${JSON.stringify(report)}`);
  return { report, snapshot, pages, changed, removed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  build({ out: opt('--out') ? resolve(opt('--out')) : undefined, base: opt('--base') ?? '', writeLedgers: args.includes('--write-ledgers') }).catch(err => {
    console.error(`[site] build failed: ${err.stack || err}`);
    process.exit(1);
  });
}
