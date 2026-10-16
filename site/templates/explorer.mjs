import { EXPLORER } from '../config.mjs';
import { bookBars, connectionGraph } from '../lib/charts.mjs';
import { esc, html, icon, join, plural, raw, truncate } from '../lib/html.mjs';
import { KIND, KINDS, artwork, chapterUrl, connectionCount, displayName, entityOrder, familyLabel, indexScore, refOrder, roleLabel, subtitle } from '../lib/model.mjs';
import { abs, page } from './layout.mjs';
import { adSlot, appNudge, block, entityAvatar, entityRow, kindLegend, refChip } from './components.mjs';

/** First rows visible, the rest behind "Show all" (still in the HTML). */
function rowList(items, render, limit = 8) {
  if (items.length <= limit + 2) return html`<ul class="list">${items.map(render)}</ul>`;
  return html`<ul class="list">${items.slice(0, limit).map(render)}</ul><details class="more-rows"><summary>Show all ${items.length}</summary><ul class="list">${items.slice(limit).map(render)}</ul></details>`;
}

const SCHEMA_TYPE = { person: 'Person', place: 'Place', event: 'Event', group: 'Organization' };

function searchBox({ autofocus = false, id = 'explorer-search' } = {}) {
  return html`<form class="search" action="/explorer/search/" method="get" role="search" data-search>
    ${icon('search-outline')}
    <label class="sr-only" for="${id}">Search people, places, events and groups</label>
    <input id="${id}" name="q" type="search" autocomplete="off" placeholder="Search people, places, events" ${autofocus ? raw('autofocus') : ''} aria-controls="${id}-results" aria-autocomplete="list">
    <button class="btn btn-primary btn-sm" type="submit">Search</button>
    <div class="surface search-results" id="${id}-results" role="listbox" aria-label="Suggestions"></div>
  </form>`;
}

export function explorerHome(ctx) {
  const { all, byKind, release } = ctx;
  const featured = ctx.featuredPeople;
  const busiest = [...all].filter(e => e.kind !== 'person' && e.kind !== 'group').sort((a, b) => connectionCount(b) - connectionCount(a)).slice(0, 8);
  const places = byKind.place.filter(e => e.summary).sort((a, b) => b.mentionCount - a.mentionCount).slice(0, 6);
  const groups = [...byKind.group].sort((a, b) => b.mentionCount - a.mentionCount).slice(0, 6);
  const events = [...byKind.event].sort((a, b) => entityOrder(a) - entityOrder(b));
  const bookEvents = new Map();
  for (const e of events) { const b = e.refs[0]?.book; if (b) (bookEvents.get(b) ?? bookEvents.set(b, []).get(b)).push(e); }
  const body = html`
<section class="ex-hero wrap">
  <p class="eyebrow">Scripture Explorer · Book of Mormon</p>
  <h1>The people, places and events behind the text.</h1>
  <p class="lede" style="margin-bottom:24px">Follow who was there, where it happened and how it connects, with every link tied to the verses it comes from. Free to browse, no account needed.</p>
  ${searchBox({ id: 'hero-search' })}

</section>

<section class="section-tight wrap" aria-labelledby="kinds-h">
  <h2 id="kinds-h" class="sr-only">Browse by type</h2>
  <div class="kinds">
    ${KINDS.map(k => html`<a class="surface card-link kind-card k-${k}" href="/explorer/${KIND[k].path}/"><img src="/assets/site/img/explorer/${k}.webp" alt="" width="640" height="480" loading="lazy"><div><span class="kind-label">${KIND[k].many}</span><strong>Browse ${byKind[k].length} ${KIND[k].many.toLowerCase()}</strong></div></a>`)}
  </div>
</section>

<section class="section-tight wrap" aria-labelledby="people-h">
  <div class="section-head"><p class="eyebrow">People</p><h2 id="people-h">Start with a person</h2></div>
  <div class="people-grid">
    ${featured.map(e => html`<a class="surface card-link person-card k-person" href="${e.url}"><span class="mark" style="--size:44px">${icon('person-outline')}</span><span><strong>${displayName(e)}</strong><small>${plural(e.events.length, 'event')} · ${plural(Object.keys(e.chapters).length, 'chapter')}</small></span></a>`)}
  </div>
</section>

<section class="section-tight wrap cols-2">
  ${block('Most connected events and places', null, html`<ul class="list">${busiest.map(e => entityRow(e, `${KIND[e.kind].one} · ${plural(connectionCount(e), 'link')}`))}</ul>`)}
  <div>
    ${block('Places with dictionary entries', null, html`<ul class="list">${places.map(e => entityRow(e, truncate(e.summary.text, 90)))}</ul>`)}
    <div style="height:18px"></div>
    ${block('Groups', null, html`<ul class="list">${groups.map(e => entityRow(e, `${plural(e.mentionCount, 'verse mention')}`))}</ul>`)}
  </div>
</section>

<section class="section-tight wrap" aria-labelledby="time-h">
  <div class="section-head"><p class="eyebrow">Events</p><h2 id="time-h">Events in the order they appear</h2><p class="muted">Every event in the record, book by book. Select one to see who was involved and where.</p></div>
  <div class="cols-3">
    ${[...bookEvents.entries()].map(([book, list]) => html`<section class="surface block" aria-label="${book}"><div class="block-head"><h3 style="font:700 17px/1.3 var(--font-ui)">${book}</h3><span>${list.length}</span></div><ul class="list">${list.slice(0, 6).map(e => entityRow(e, e.refs[0]?.display))}</ul>${list.length > 6 ? html`<p class="note"><a href="/explorer/events/#${esc(book.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}">All ${list.length} events in ${book}</a></p>` : ''}</section>`)}
  </div>
</section>

<section class="section-tight wrap">
  <div class="surface cta-band">
    <div><h2>Read with Explorer beside the text.</h2><p class="muted">In the Cultivate app, Explorer opens from any verse, alongside your notes, highlights and study groups.</p></div>
    <div class="btn-row"><a class="btn btn-primary" href="/download/">Get the app</a><a class="btn btn-secondary" href="/scriptures/book-of-mormon/">Read on the web</a></div>
  </div>
  <p class="small muted" style="margin-top:16px">Data from published Explorer release ${release.releaseId}. <a href="/explorer/about/">How Explorer data is sourced</a>.</p>
</section>`;
  return page({
    path: '/explorer/', active: 'explorer', release,
    title: 'Book of Mormon Explorer: people, places and events',
    description: `Browse ${byKind.person.length} people, ${byKind.place.length} places, ${byKind.event.length} events and ${byKind.group.length} groups in the Book of Mormon, each linked to the verses it comes from.`,
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Explorer' }],
    body, scripts: ['/assets/site/search.js'],
    jsonld: [{ '@type': 'CollectionPage', '@id': abs('/explorer/#collection'), name: 'Book of Mormon Explorer', url: abs('/explorer/') }],
  });
}

export function browsePage(ctx, kind) {
  const list = [...ctx.byKind[kind]];
  const k = KIND[kind];
  let content;
  if (kind === 'event') {
    const books = new Map();
    for (const e of list.sort((a, b) => entityOrder(a) - entityOrder(b))) { const b = e.refs[0]?.book ?? 'Other'; (books.get(b) ?? books.set(b, []).get(b)).push(e); }
    content = html`<nav class="az" aria-label="Books">${[...books.keys()].map(b => html`<a href="#${b.toLowerCase().replace(/[^a-z0-9]+/g, '-')}" style="padding:0 10px">${b}</a>`)}</nav>
      ${[...books.entries()].map(([b, items]) => html`<h2 class="letter" id="${b.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${b}</h2><div class="surface rows-card"><ul class="list">${items.map(e => entityRow(e, `${e.refs[0]?.display ?? ''}${e.people.length ? ` · ${plural(e.people.length, 'person', 'people')}` : ''}`))}</ul></div>`)}`;
  } else {
    list.sort((a, b) => displayName(a).localeCompare(displayName(b)));
    const letters = new Map();
    for (const e of list) { const l = displayName(e)[0].toUpperCase(); (letters.get(l) ?? letters.set(l, []).get(l)).push(e); }
    content = html`<nav class="az" aria-label="Jump to letter">${[...letters.keys()].map(l => html`<a href="#letter-${l}">${l}</a>`)}</nav>
      ${[...letters.entries()].map(([l, items]) => html`<h2 class="letter" id="letter-${l}">${l}</h2><div class="surface rows-card"><ul class="list">${items.map(e => entityRow(e, `${subtitle(e)}${e.mentionCount ? ` · ${plural(e.mentionCount, 'verse mention')}` : ''}`))}</ul></div>`)}`;
  }
  const body = html`<section class="ex-hero wrap" style="padding-bottom:8px">
    <p class="eyebrow">Explorer · Book of Mormon</p>
    <h1>${k.many}</h1>
    <p class="lede">${list.length} ${k.many.toLowerCase()} in the Book of Mormon${kind === 'event' ? ', in the order they appear in the text' : ', A to Z'}. Each profile links to the verses behind it.</p>
    <nav class="filters" aria-label="Record types">${KINDS.map(x => html`<a class="chip" href="/explorer/${KIND[x].path}/"${x === kind ? raw(' aria-current="page"') : ''}>${KIND[x].many}</a>`)}</nav>
  </section>
  <section class="wrap" style="padding-bottom:40px">${content}${adSlot('explorerBrowse', { items: list.length })}</section>`;
  return page({
    path: `/explorer/${k.path}/`, active: 'explorer', release: ctx.release,
    title: `${k.many} in the Book of Mormon`,
    description: `All ${list.length} ${k.many.toLowerCase()} in the Book of Mormon, with the events, relationships and verses linked to each.`,
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Explorer', href: '/explorer/' }, { label: k.many }],
    body,
    jsonld: [{ '@type': 'ItemList', name: `${k.many} in the Book of Mormon`, numberOfItems: list.length, itemListElement: list.slice(0, 200).map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(e.url), name: displayName(e) })) }],
  });
}

function describe(e, ctx) {
  const n = displayName(e);
  const bits = [];
  if (e.kind === 'event') bits.push(`${n} (${e.refs[0]?.display ?? 'Book of Mormon'})`);
  else bits.push(`${n} in the Book of Mormon`);
  const parts = [];
  if (e.people.length) parts.push(plural(e.people.length, 'person', 'people'));
  if (e.events.length) parts.push(plural(e.events.length, 'event'));
  if (e.places.length) parts.push(plural(e.places.length, 'place'));
  if (e.groups.length) parts.push(plural(e.groups.length, 'group'));
  const chapters = Object.keys(e.chapters).length;
  let d = e.summary ? `${truncate(e.summary.text, 120)} ` : '';
  d += `${bits[0]}: ${parts.length ? `${parts.join(', ')}` : 'linked records'}${chapters ? ` and ${plural(chapters, 'chapter')} where the text names them` : ''}, with scripture references.`;
  return truncate(d, 300);
}

export function profilePage(ctx, e) {
  const { E } = ctx;
  const n = displayName(e);
  const k = KIND[e.kind];
  const get = id => E[id];
  const sections = [];
  const art = artwork(e);

  // Events
  if (e.events.length) {
    const evs = e.events.map(x => ({ ...x, e: get(x.id) })).sort((a, b) => entityOrder(a.e) - entityOrder(b.e));
    sections.push(block('Events', evs.length, rowList(evs, x => entityRow(x.e, [roleLabel(x.role), x.e.refs[0]?.display].filter(Boolean).join(' · '))), { id: 'events' }));
  }
  // People (non-person records)
  if (e.people.length) {
    const ppl = e.people.map(x => ({ ...x, e: get(x.id) }));
    sections.push(block(e.kind === 'event' ? 'Who was involved' : 'People', ppl.length, rowList(ppl, x => entityRow(x.e, x.role ? roleLabel(x.role) : x.via.length ? `Through ${plural(x.via.length, 'shared event')}` : 'Person')), { id: 'people' }));
  }
  if (e.keyPeople.length) sections.push(block('Key people', e.keyPeople.length, html`<ul class="list">${e.keyPeople.map(id => entityRow(get(id)))}</ul>`, { id: 'key-people' }));
  // Family
  if (e.family.length) {
    sections.push(block('Family and direct relationships', e.family.length, html`<ul class="list">${e.family.map(x => entityRow(get(x.id), familyLabel(x.predicate)))}</ul>`, { id: 'family', note: 'Relationships recorded between these two people in the published Explorer data.' }));
  }
  if (e.places.length) {
    const ps = e.places.map(x => ({ ...x, e: get(x.id) }));
    sections.push(block('Places', ps.length, rowList(ps, x => entityRow(x.e, [subtitle(x.e), x.via.length ? `in ${plural(x.via.length, 'event')}` : null].filter(Boolean).join(' · '))), { id: 'places' }));
  }
  if (e.groups.length) {
    const gs = e.groups.map(x => ({ ...x, e: get(x.id) }));
    sections.push(block('Groups', gs.length, rowList(gs, x => entityRow(x.e, x.connection === 'membership' ? 'Member' : x.via.length ? `in ${plural(x.via.length, 'event')}` : 'Group')), { id: 'groups' }));
  }
  if (e.relatedEvents.length) sections.push(block('Related events', e.relatedEvents.length, html`<ul class="list">${e.relatedEvents.map(id => entityRow(get(id), get(id).refs[0]?.display))}</ul>`, { id: 'related-events' }));

  // Canonical relationships (accepted) from the relationships table
  const rels = ctx.relsByEntity.get(e.id) ?? [];
  if (rels.length) sections.push(block('Relationships', rels.length, html`<ul class="list">${rels.map(r => entityRow(get(r.other), r.label))}</ul>`, { id: 'relationships' }));

  // Derived (two-hop) — always labelled
  const direct = new Set([...e.events.map(x => x.id), ...e.people.map(x => x.id), ...e.places.map(x => x.id), ...e.groups.map(x => x.id), ...e.family.map(x => x.id), ...e.keyPeople]);
  const derived = e.derived.filter(d => !direct.has(d.id) && get(d.id).kind !== 'event').slice(0, 12);
  if (derived.length) {
    sections.push(block('Connected through shared events', derived.length, html`<ul class="list">${derived.map(d => entityRow(get(d.id), `${KIND[get(d.id).kind].one} · via ${d.via.slice(0, 2).map(v => truncate(displayName(get(v)), 40)).join('; ')}${d.via.length > 2 ? ` +${d.via.length - 2}` : ''}`))}</ul>`, { id: 'shared', note: 'Not a direct relationship: these records appear in the same events.' }));
  }

  // Scripture
  const refs = [...e.refs].sort((a, b) => refOrder(a) - refOrder(b));
  const chapters = Object.entries(e.chapters).sort(([a], [b]) => refOrder({ book: a.replace(/ \d+$/, ''), sc: +a.split(' ').pop() }) - refOrder({ book: b.replace(/ \d+$/, ''), sc: +b.split(' ').pop() }));
  const byBook = {};
  for (const [c, cnt] of chapters) { const b = c.replace(/ \d+$/, ''); byBook[b] = (byBook[b] ?? 0) + cnt; }

  let glance = '';
  if (chapters.length) {
    const first = chapters[0][0], last = chapters[chapters.length - 1][0];
    glance = `Named in ${plural(chapters.length, 'chapter')}${chapters.length > 1 ? `, from ${first} to ${last}` : ` (${first})`}.`;
  }
  if (e.kind === 'event') {
    const who = e.people.slice(0, 3).map(x => displayName(get(x.id)));
    const where = e.places.slice(0, 2).map(x => displayName(get(x.id)));
    glance = [who.length ? `With ${who.join(', ')}${e.people.length > 3 ? ` and ${e.people.length - 3} more` : ''}.` : '', where.length ? `At ${where.join(' and ')}.` : ''].filter(Boolean).join(' ');
  }
  const graphNeighbors = [...new Map([...e.family.map(x => x.id), ...e.people.map(x => x.id), ...e.keyPeople, ...e.places.map(x => x.id), ...e.groups.map(x => x.id), ...e.events.map(x => x.id), ...e.relatedEvents].map(id => [id, get(id)])).values()];
  const graph = connectionGraph(e, graphNeighbors);
  const kindsInGraph = [...new Set([e.kind, ...graphNeighbors.slice(0, 18).map(x => x.kind)])];

  const asideBlocks = [];
  if (refs.length) asideBlocks.push(block('Scripture references', refs.length, html`<div class="refs">${refs.slice(0, 30).map(refChip)}</div>`, { id: 'scripture' }));
  if (chapters.length) {
    const top = [...chapters].sort((a, b) => b[1] - a[1]).slice(0, 10);
    asideBlocks.push(block('Named in these chapters', chapters.length, html`<ul class="list">${top.map(([c, cnt]) => { const [b, ch] = [c.replace(/ \d+$/, ''), c.split(' ').pop()]; return html`<li><a class="row" href="${chapterUrl(b, ch)}">${icon('book-outline')}<span class="row-main"><strong>${c}</strong><small>${plural(cnt, 'mention')}</small></span>${icon('chevron-forward', 'chev')}</a></li>`; })}</ul>`, { id: 'chapters' }));
  }

  const body = html`
<div class="wrap">
  <section class="profile-hero k-${e.kind}">
    ${art ? html`<figure class="profile-art" style="margin:0"><img src="${art.hero}" alt="Illustrative portrait of ${n}" width="560" height="700"><figcaption>Illustrative artwork</figcaption></figure>` : html`<span class="mark" style="--size:72px">${icon(k.icon)}</span>`}
    <div>
      <span class="kind-label">${k.one}${e.kind === 'place' && e.placeType && e.placeType !== 'place_unspecified' ? ` · ${subtitle(e)}` : ''}</span>
      <h1>${n}</h1>
      ${e.title ? html`<p class="lede">${e.title}</p>` : ''}
      ${e.kind === 'event' && e.refs[0] ? html`<p class="lede">${e.refs.map(r => r.display).join('; ')}</p>` : ''}
      ${glance ? html`<p class="glance">${glance}</p>` : ''}
      ${e.summary ? html`<div class="summary"><p>${e.summary.text}</p>${e.summary.attribution ? html`<p class="attr">${e.summary.attribution}</p>` : ''}${e.summary.warning ? html`<p class="warn">${icon('shield-checkmark-outline')}${e.summary.warning}</p>` : ''}</div>` : ''}
      <div class="profile-facts">
        ${e.events.length ? html`<a class="chip" href="#events">${plural(e.events.length, 'event')}</a>` : ''}
        ${e.people.length ? html`<a class="chip" href="#people">${plural(e.people.length, 'person', 'people')}</a>` : ''}
        ${e.family.length ? html`<a class="chip" href="#family">${plural(e.family.length, 'relationship')}</a>` : ''}
        ${e.places.length ? html`<a class="chip" href="#places">${plural(e.places.length, 'place')}</a>` : ''}
        ${e.groups.length ? html`<a class="chip" href="#groups">${plural(e.groups.length, 'group')}</a>` : ''}
        ${chapters.length ? html`<a class="chip" href="#chapters">${plural(chapters.length, 'chapter')}</a>` : ''}
        ${e.kind === 'event' && e.refs[0] ? html`<a class="btn btn-primary btn-sm" href="${chapterUrl(e.refs[0].book, e.refs[0].sc, e.refs[0].sv)}">${icon('book-outline')}Read ${e.refs[0].display}</a>` : ''}
      </div>
    </div>
  </section>
  <div class="profile-body">
    <div>
      ${graph ? block('Connections', null, html`${graph}${kindLegend(kindsInGraph)}`, { id: 'map' }) : ''}
      ${chapters.length >= 2 ? html`<div style="height:18px"></div>${block('Where the text names them', `${plural(chapters.reduce((s, [, c]) => s + c, 0), 'verse mention')}`, html`<div class="k-${e.kind}">${bookBars(byBook, { label: `Verse mentions of ${n} by book` })}</div>`, { id: 'distribution' })}` : ''}
      ${sections.map(s => html`<div style="height:18px"></div>${s}`)}
    </div>
    <aside>
      ${asideBlocks}
      ${appNudge(`Open ${n} beside the text in Cultivate, with your notes, highlights and study groups.`)}
      ${adSlot('explorerProfile', { sections: sections.length })}
    </aside>
  </div>
</div>`;

  const indexable = indexScore(e) >= EXPLORER.minIndexScore;
  const about = { '@type': SCHEMA_TYPE[e.kind], name: n, url: abs(e.url), ...(e.summary ? { description: truncate(e.summary.text, 300) } : {}), ...(art ? { image: abs(art.hero) } : {}) };
  if (e.kind === 'person') {
    about.subjectOf = { '@type': 'Book', name: 'Book of Mormon' };
    const fam = e.family.map(x => get(x.id));
    if (fam.length) about.knows = fam.map(f => ({ '@type': 'Person', name: displayName(f), url: abs(f.url) }));
  }
  return {
    indexable,
    html: page({
      path: e.url, active: 'explorer', release: ctx.release,
      title: e.kind === 'event' ? `${n} (${e.refs[0]?.display ?? 'Book of Mormon'})` : `${n} in the Book of Mormon`,
      description: describe(e, ctx),
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Explorer', href: '/explorer/' }, { label: k.many, href: `/explorer/${k.path}/` }, { label: n }],
      robots: indexable ? 'index,follow,max-image-preview:large' : 'noindex,follow',
      ogImage: art ? art.hero : `/assets/site/img/explorer/${e.kind}.webp`,
      ogType: 'article',
      body,
      jsonld: [{ '@type': 'ProfilePage', '@id': abs(`${e.url}#profile`), url: abs(e.url), name: n, mainEntity: about, dateModified: ctx.release.publishedAt }],
    }),
  };
}

export function searchPage(ctx) {
  const body = html`<section class="ex-hero wrap">
    <p class="eyebrow">Explorer</p>
    <h1>Search Explorer</h1>
    ${searchBox({ autofocus: true, id: 'page-search' })}
    <div id="search-page-results" class="surface rows-card" style="margin-top:20px;max-width:640px" aria-live="polite" hidden><ul class="list"></ul></div>
    <noscript><p class="lede" style="margin-top:20px">Search needs JavaScript. You can browse <a href="/explorer/people/">people</a>, <a href="/explorer/places/">places</a>, <a href="/explorer/events/">events</a> and <a href="/explorer/groups/">groups</a> instead.</p></noscript>
  </section>`;
  return page({ path: '/explorer/search/', active: 'explorer', release: ctx.release, title: 'Search Explorer', description: 'Search people, places, events and groups in the Book of Mormon.', robots: 'noindex,follow', crumbs: [{ label: 'Home', href: '/' }, { label: 'Explorer', href: '/explorer/' }, { label: 'Search' }], body, scripts: ['/assets/site/search.js'] });
}

export function aboutPage(ctx) {
  const s = ctx.snapshot.stats;
  const body = html`<section class="wrap section-tight"><div class="prose">
    <p class="eyebrow">Explorer</p>
    <h1 class="display" style="font-size:clamp(34px,4.6vw,48px);margin:10px 0 18px">Sources and credits</h1>
    <p>Everything on Explorer pages comes from the same published Explorer release the Cultivate app downloads. This site is currently built from release <strong>${ctx.release.releaseId}</strong>, published ${new Date(ctx.release.publishedAt).toUTCString().replace(/ GMT$/, ' UTC')}. Drafts and unpublished edits never appear here.</p>
    <h2>What is included</h2>
    <p>${s.entities.person} people, ${s.entities.place} places, ${s.entities.event} events and ${s.entities.group} groups from the Book of Mormon, ${s.summaries} dictionary summaries, and verse-level mentions in ${s.mentionChapters} chapters. Only links the release marks as accepted are shown. Records connected only because they share events are labelled that way and are never presented as a direct relationship.</p>
    <h2>Scripture text</h2>
    <p>Verse text is the public-domain text distributed by the <a href="https://scriptures.nephi.org/">lds-scriptures project</a>. Chapter headings, summaries and footnotes are not reproduced.</p>
    <h2>Credits</h2>
    <p>Place, person and group summaries are from George Reynolds, <em>A Dictionary of the Book of Mormon</em> (1891). Where Reynolds offers a historical or geographic interpretation, the page says so.</p>
    <p>Speaker labels are based in part on John Hilton III and Shon D. Hopkin, <a href="https://scholarsarchive.byu.edu/wordcruncher/1/">Book of Mormon With Voices Identified</a> (2012), BYU ScholarsArchive / WordCruncher, licensed under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Cultivate transforms the source data into verse-level speaker attribution. The authors and institutions named here do not endorse Cultivate.</p>
    <p>Icons are <a href="https://ionic.io/ionicons">Ionicons</a> (MIT). Fonts are Playfair Display, Source Serif 4 and Hanken Grotesk (SIL Open Font License).</p>
  </div></section>`;
  return page({ path: '/explorer/about/', active: 'explorer', release: ctx.release, title: 'Explorer sources and credits', description: 'Where Cultivate Explorer data comes from, how it is published, and the sources and licenses behind it.', crumbs: [{ label: 'Home', href: '/' }, { label: 'Explorer', href: '/explorer/' }, { label: 'Sources and credits' }], body });
}
