import { SCRIPTURES } from '../config.mjs';
import { esc, html, icon, plural, raw, truncate } from '../lib/html.mjs';
import { KIND, KINDS, displayName, entityOrder } from '../lib/model.mjs';
import { abs, page } from './layout.mjs';
import { appNudge, block, entityRow } from './components.mjs';

const WORK = '/scriptures/book-of-mormon/';
const dash = s => esc(s).replace(/--/g, '—');

/** Place mention spans on the canonical verse text; never trust an offset blindly. */
export function resolveSpans(text, mentions) {
  const spans = [];
  for (const [, id, start, end, surface] of mentions) {
    let s = start;
    if (text.slice(start, end) !== surface) {
      // Fall back to the nearest whole-word occurrence of the surface text.
      const re = new RegExp(`\\b${surface.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      let best = -1, m;
      while ((m = re.exec(text))) if (best < 0 || Math.abs(m.index - start) < Math.abs(best - start)) best = m.index;
      if (best < 0) continue;
      s = best;
    }
    const e = s + surface.length;
    if (spans.some(x => s < x.e && e > x.s)) continue;
    spans.push({ s, e, id });
  }
  return spans.sort((a, b) => a.s - b.s);
}

function verseHtml(v, n, spans, E, prevSpeaker) {
  const text = v.t;
  const points = new Set([0, text.length]);
  for (const sp of spans) { points.add(sp.s); points.add(sp.e); }
  const speakerAt = new Map();
  let speaker = prevSpeaker;
  for (const [off, id, label] of v.s ?? []) {
    if (id !== speaker && !(off === 0 && id === prevSpeaker)) speakerAt.set(off, label);
    speaker = id;
    points.add(off);
  }
  const sorted = [...points].filter(p => p <= text.length).sort((a, b) => a - b);
  let out = '';
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (speakerAt.has(a)) out += `<span class="speaker">${esc(speakerAt.get(a))}</span>`;
    const sp = spans.find(x => x.s <= a && x.e >= b);
    const chunk = dash(text.slice(a, b));
    if (sp) {
      const e = E[sp.id];
      const first = sp.s === a;
      const last = sp.e === b;
      out += `${first ? `<a class="m k-${e.kind}" href="${esc(e.url)}" title="${esc(displayName(e))} · ${KIND[e.kind].one}">` : ''}${chunk}${last ? '</a>' : ''}`;
    } else out += chunk;
  }
  return { html: out, speaker };
}

export function scripturesIndex(ctx) {
  const body = html`<section class="ex-hero wrap">
    <p class="eyebrow">Scriptures</p>
    <h1>Book of Mormon</h1>
    <p class="lede">Read every chapter with the people, places and events in it linked to Explorer. Chapters with the most Explorer connections are marked.</p>
  </section>
  <section class="wrap" style="padding-bottom:48px"><div class="book-grid">
    ${ctx.scripture.books.map(b => { const linked = b.chapters.filter((_, i) => (ctx.chapterEntities.get(`${b.name} ${i + 1}`)?.size ?? 0) > 0).length; return html`<a class="surface card-link" href="${WORK}${b.slug}/"><strong>${b.name}</strong><span class="muted small">${plural(b.chapters.length, 'chapter')} · ${linked} with Explorer links</span></a>`; })}
  </div>
  <p class="attribution">Verse text: public domain (<a href="https://scriptures.nephi.org/">lds-scriptures project</a>). Chapter headings and footnotes are not reproduced. <a href="/explorer/about/">Sources and credits</a>.</p></section>`;
  return page({ path: WORK, active: 'scriptures', release: ctx.release, title: 'Read the Book of Mormon online with people, places and events', description: 'Read the Book of Mormon chapter by chapter, with the people, places, events and groups in each chapter linked to Cultivate Explorer.', crumbs: [{ label: 'Home', href: '/' }, { label: 'Scriptures', href: '/scriptures/' }, { label: 'Book of Mormon' }], body, jsonld: [{ '@type': 'Book', name: 'Book of Mormon', url: abs(WORK), hasPart: ctx.scripture.books.map(b => ({ '@type': 'Book', name: b.name, url: abs(`${WORK}${b.slug}/`) })) }] });
}

export function worksIndex(ctx) {
  const body = html`<section class="ex-hero wrap"><p class="eyebrow">Scriptures</p><h1>Read on the web</h1><p class="lede">Start with the Book of Mormon. More volumes will follow as their Explorer data is published.</p></section>
  <section class="wrap" style="padding-bottom:48px"><div class="book-grid"><a class="surface card-link" href="${WORK}"><strong>Book of Mormon</strong><span class="muted small">15 books · 239 chapters</span></a></div></section>`;
  return page({ path: '/scriptures/', active: 'scriptures', release: ctx.release, title: 'Scriptures', description: 'Read scripture on the web with Cultivate Explorer links to the people, places and events in each chapter.', crumbs: [{ label: 'Home', href: '/' }, { label: 'Scriptures' }], body });
}

export function bookPage(ctx, book) {
  const body = html`<section class="ex-hero wrap"><p class="eyebrow">Book of Mormon</p><h1>${book.name}</h1><p class="lede">${plural(book.chapters.length, 'chapter')}. Underlined chapters have Explorer links.</p></section>
  <section class="wrap" style="padding-bottom:48px"><div class="chapter-grid">
    ${book.chapters.map((_, i) => { const n = ctx.chapterEntities.get(`${book.name} ${i + 1}`)?.size ?? 0; return html`<a href="${WORK}${book.slug}/${i + 1}/" class="${n ? 'has' : ''}" aria-label="${book.name} ${i + 1}${n ? `, ${plural(n, 'Explorer record')}` : ''}">${i + 1}</a>`; })}
  </div></section>`;
  return page({ path: `${WORK}${book.slug}/`, active: 'scriptures', release: ctx.release, title: `${book.name} | Book of Mormon`, description: `Read ${book.name} in the Book of Mormon chapter by chapter, with linked people, places and events.`, crumbs: [{ label: 'Home', href: '/' }, { label: 'Scriptures', href: '/scriptures/' }, { label: 'Book of Mormon', href: WORK }, { label: book.name }], body });
}

export function chapterPage(ctx, book, ci, neighbors) {
  const chapter = ci + 1;
  const key = `${book.name} ${chapter}`;
  const verses = book.chapters[ci];
  const { E } = ctx;
  const mentions = ctx.snapshot.mentions[key] ?? [];
  const byVerse = new Map();
  for (const m of mentions) (byVerse.get(m[0]) ?? byVerse.set(m[0], []).get(m[0])).push(m);

  let speaker = null;
  let linked = 0;
  const verseRows = verses.map((v, i) => {
    const spans = resolveSpans(v.t, byVerse.get(i + 1) ?? []);
    linked += spans.length;
    const r = verseHtml(v, i + 1, spans, E, speaker);
    speaker = r.speaker;
    return `<p class="verse" id="v${i + 1}"><a class="verse-num" href="#v${i + 1}" aria-label="Verse ${i + 1}">${i + 1}</a><span class="verse-text">${r.html}</span></p>`;
  }).join('\n');

  // Who and what is in this chapter.
  const present = new Map();
  for (const [verse, id] of mentions) {
    const p = present.get(id) ?? { n: 0, first: verse };
    p.n++; p.first = Math.min(p.first, verse);
    present.set(id, p);
  }
  const events = ctx.chapterEvents.get(key) ?? [];
  for (const ev of events) if (!present.has(ev.id)) present.set(ev.id, { n: 0, first: null, event: true });
  const groups = Object.fromEntries(KINDS.map(k => [k, []]));
  for (const [id, p] of present) groups[E[id].kind].push({ e: E[id], ...p });
  for (const k of KINDS) groups[k].sort((a, b) => (k === 'event' ? entityOrder(a.e) - entityOrder(b.e) : b.n - a.n));

  // Direct links among records present in this chapter.
  const ids = new Set(present.keys());
  const links = [];
  for (const ev of events) for (const p of ev.people) if (ids.has(p.id)) links.push([ev, E[p.id], p.role]);
  const fam = [];
  for (const id of ids) for (const f of E[id].family) if (ids.has(f.id) && id < f.id) fam.push([E[id], E[f.id], f.predicate]);

  const distinct = [...present.keys()].filter(id => !present.get(id).event).length + events.length;
  const indexable = distinct >= SCRIPTURES.minIndexEntities;
  const namesForDesc = [...groups.person, ...groups.place, ...groups.group].slice(0, 5).map(x => displayName(x.e));
  const description = namesForDesc.length
    ? truncate(`Read ${key} with Explorer links to ${namesForDesc.join(', ')}${distinct > namesForDesc.length ? ` and ${distinct - namesForDesc.length} more` : ''}. ${verses.length} verses, public-domain text.`, 300)
    : `Read ${key} (${verses.length} verses), with links to people, places and events in Cultivate Explorer.`;

  const aside = html`
    ${KINDS.filter(k => groups[k].length).map(k => block(k === 'event' ? 'Events in this chapter' : `${KIND[k].many} in this chapter`, groups[k].length, html`<ul class="list">${groups[k].slice(0, 12).map(x => entityRow(x.e, k === 'event' ? x.e.refs[0]?.display : `${plural(x.n, 'mention')} · first in verse ${x.first}`))}</ul>`))}
    ${links.length || fam.length ? block('Connections in this chapter', links.length + fam.length, html`<ul class="list">${[
      ...fam.map(([a, b, p]) => html`<li class="row"><span class="row-main"><strong><a href="${a.url}">${displayName(a)}</a> · <a href="${b.url}">${displayName(b)}</a></strong><small>${p === 'father_of' ? 'Father and child' : p === 'mother_of' ? 'Mother and child' : p === 'sibling_of' ? 'Siblings' : p === 'spouse_of' ? 'Spouses' : 'Slaying'}</small></span></li>`),
      ...links.slice(0, 14).map(([ev, p, role]) => html`<li class="row"><span class="row-main"><strong><a href="${p.url}">${displayName(p)}</a></strong><small>${role ? `${role.replace(/_/g, ' ')} in ` : 'In '}<a href="${ev.url}">${truncate(displayName(ev), 60)}</a></small></span></li>`),
    ]}</ul>`) : ''}
    ${appNudge('Read verse by verse in Cultivate, with these Explorer links, your notes and highlights, and your study group.')}`;

  const [prev, next] = neighbors;
  const body = html`<div class="wrap">
  <div class="reader-layout">
    <article>
      <header class="chapter-head">
        <p class="eyebrow">Book of Mormon · ${book.name}</p>
        <h1>${key}</h1>
        <p>${plural(verses.length, 'verse')}${distinct ? ` · ${plural(distinct, 'Explorer record')}` : ''}</p>
      </header>
      <div class="verses">${raw(verseRows)}</div>
      <nav class="chapter-nav" aria-label="Chapters">
        ${prev ? html`<a class="btn btn-secondary btn-sm" href="${prev.url}" rel="prev">${icon('chevron-back')}${prev.label}</a>` : html`<span></span>`}
        <a class="btn btn-glass btn-sm" href="${WORK}${book.slug}/">All chapters</a>
        ${next ? html`<a class="btn btn-secondary btn-sm" href="${next.url}" rel="next">${next.label}${icon('chevron-forward')}</a>` : html`<span></span>`}
      </nav>
      <p class="attribution">Verse text: public domain (<a href="https://scriptures.nephi.org/">lds-scriptures project</a>). Chapter headings and footnotes are not reproduced. Speaker labels based in part on Hilton &amp; Hopkin, <em>Book of Mormon With Voices Identified</em> (2012), CC BY 4.0. Explorer links from release ${ctx.release.releaseId}.</p>
    </article>
    <aside aria-label="Explorer in this chapter">${aside}</aside>
  </div>
</div>`;

  const url = `${WORK}${book.slug}/${chapter}/`;
  return {
    indexable,
    linked,
    html: page({
      path: url, active: 'scriptures', release: ctx.release,
      title: `${key} | Book of Mormon`,
      description, robots: indexable ? 'index,follow' : 'noindex,follow', ogType: 'article',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Scriptures', href: '/scriptures/' }, { label: 'Book of Mormon', href: WORK }, { label: book.name, href: `${WORK}${book.slug}/` }, { label: `Chapter ${chapter}` }],
      body,
      jsonld: [{ '@type': 'Chapter', name: key, url: abs(url), position: chapter, isPartOf: { '@type': 'Book', name: `${book.name} (Book of Mormon)`, url: abs(`${WORK}${book.slug}/`) }, license: 'https://creativecommons.org/publicdomain/mark/1.0/', mentions: [...present.keys()].slice(0, 40).map(id => ({ '@type': 'Thing', name: displayName(E[id]), url: abs(E[id].url) })) }],
    }),
  };
}
