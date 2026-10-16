// Checks on the generated site built from the committed Explorer snapshot:
// SEO metadata, internal links, indexing rules, preserved routes, no ads,
// scripture rights, accessibility contrast.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { build } from '../site/build.mjs';

let out, result;
const pages = new Map(); // path → html

before(async () => {
  out = mkdtempSync(join(tmpdir(), 'cv-site-'));
  result = await build({ out, dataDir: mkdtempSync(join(tmpdir(), 'cv-data-')), log: () => {}, env: {} });
  const walk = dir => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (f === 'index.html') pages.set(`/${relative(out, dir)}${relative(out, dir) ? '/' : ''}`, readFileSync(p, 'utf8')); } };
  walk(out);
});

const meta = (html, re) => re.exec(html)?.[1];

test('every page has a unique title, a description, one h1, a canonical URL and valid JSON-LD', () => {
  const titles = new Map();
  for (const [path, html] of pages) {
    const title = meta(html, /<title>([^<]+)<\/title>/);
    assert.ok(title, `${path} has a title`);
    assert.ok(!titles.has(title), `${path} title duplicates ${titles.get(title)}: ${title}`);
    titles.set(title, path);
    const desc = meta(html, /<meta name="description" content="([^"]+)"/);
    assert.ok(desc && desc.length >= 50 && desc.length <= 320, `${path} description length ${desc?.length}`);
    assert.equal(meta(html, /<link rel="canonical" href="([^"]+)"/), `https://www.cultivatestudy.com${path}`);
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, `${path} has exactly one h1`);
    const ld = JSON.parse(meta(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/));
    assert.equal(ld['@context'], 'https://schema.org');
    assert.ok(html.includes('<main id="main">'), `${path} has main landmark`);
    assert.match(html, /property="og:title"/);
  }
});

test('core content is in the HTML (no client rendering needed)', () => {
  assert.match(pages.get('/explorer/people/alma-the-younger/'), /Conversion of Alma the Younger/);
  assert.match(pages.get('/scriptures/book-of-mormon/alma/32/'), /And now as I said concerning faith/);
  assert.match(pages.get('/explorer/'), /Browse \d+ people/);
});

test('internal links resolve', () => {
  const preserved = ['/join/', '/lesson/', '/privacy/', '/account-deletion/', '/beta/', '/topical-guide/', '/explorer/search-index.json', '/explorer/release.json'];
  const bad = [];
  for (const [path, html] of pages) {
    for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
      if (href.startsWith('/assets/')) { if (!existsSync(join(out, href))) bad.push(`${path} → ${href}`); continue; }
      if (pages.has(href) || preserved.includes(href)) continue;
      bad.push(`${path} → ${href}`);
    }
  }
  assert.deepEqual([...new Set(bad)].slice(0, 20), []);
});

test('scripture chapters link to Explorer and Explorer links back to chapters', () => {
  const ch = pages.get('/scriptures/book-of-mormon/1-nephi/2/');
  assert.match(ch, /class="m k-person" href="\/explorer\/people\/lehi-patriarch\/"/);
  assert.match(pages.get('/explorer/people/lehi-patriarch/'), /href="\/scriptures\/book-of-mormon\/1-nephi\/2\//);
});

test('sitemaps list only indexable pages, with lastmod', () => {
  const xml = ['pages', 'explorer', 'scriptures'].map(g => readFileSync(join(out, `sitemap-${g}.xml`), 'utf8')).join('');
  const locs = [...xml.matchAll(/<loc>https:\/\/www\.cultivatestudy\.com([^<]+)<\/loc>/g)].map(m => m[1]);
  for (const loc of locs) {
    const html = pages.get(loc);
    if (!html) continue; // preserved Vite pages
    assert.doesNotMatch(html, /name="robots" content="noindex/, `${loc} is in the sitemap but noindex`);
  }
  const noindex = [...pages].filter(([, h]) => /content="noindex/.test(h)).map(([p]) => p);
  for (const p of noindex) assert.ok(!locs.includes(p), `${p} noindex but in sitemap`);
  assert.ok(locs.includes('/explorer/people/alma-the-younger/'));
  assert.match(xml, /<lastmod>\d{4}-\d\d-\d\dT/);
  assert.match(readFileSync(join(out, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/www\.cultivatestudy\.com\/sitemap\.xml/);
});

test('advertising is disabled: no ad markup or scripts anywhere', () => {
  for (const [path, html] of pages) {
    assert.doesNotMatch(html, /ad-slot|adsbygoogle|googlesyndication|doubleclick/, path);
  }
});

test('scripture pages carry only public-domain verse text and attribution', () => {
  const ch = pages.get('/scriptures/book-of-mormon/alma/32/');
  assert.match(ch, /Verse text: public domain/);
  assert.equal((ch.match(/class="verse" id="v\d+"/g) ?? []).length, 43);
  // The 1981 chapter heading for Alma 32 is not reproduced.
  assert.doesNotMatch(ch, /Alma teaches the poor whose afflictions had humbled them/);
});

test('generated site never writes over preserved routes', () => {
  for (const p of ['/join/', '/lesson/', '/privacy/', '/account-deletion/', '/beta/', '/topical-guide/', '/new/']) {
    assert.ok(!pages.has(p), `generator must not render ${p}`);
  }
});

test('text colors meet WCAG AA on their grounds in both themes', () => {
  const lum = hex => { const c = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const n = parseInt(hex.slice(1), 16); return 0.2126 * c(n >> 16) + 0.7152 * c((n >> 8) & 255) + 0.0722 * c(n & 255); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const pairs = {
    light: { grounds: ['#f8f9fa', '#ffffff'], text: ['#111111', '#6e6e73', '#727276', '#4f7a57', '#846e3c', '#527c63', '#76619b', '#397a8c', '#966715', '#3d7b86'] },
    dark: { grounds: ['#090f0a', '#1c1c1f', '#0f1a10'], text: ['#ffffff', '#a1a1aa', '#83838b', '#84a388', '#e9c176', '#79a98b', '#a18bc5', '#61a4b5', '#ddaa45', '#94c8d1'] },
  };
  for (const [theme, { grounds, text }] of Object.entries(pairs)) for (const g of grounds) for (const t of text) assert.ok(ratio(t, g) >= 4.5, `${theme}: ${t} on ${g} is ${ratio(t, g).toFixed(2)}`);
  assert.ok(ratio('#000000', '#84a388') >= 4.5, 'primary button label');
  const css = readFileSync(join(out, 'assets/site/site.css'), 'utf8');
  for (const v of ['#727276', '#4f7a57', '#846e3c', '#83838b']) assert.ok(css.includes(v), `site.css uses ${v}`);
});
