import { DOWNLOADS } from '../config.mjs';
import { html, icon, plural, raw } from '../lib/html.mjs';
import { KIND, KINDS, displayName } from '../lib/model.mjs';
import { abs, page } from './layout.mjs';
import { resolveSpans } from './scriptures.mjs';

const DIMS = { 'lesson-builder.webp': [600, 417], 'reader.webp': [300, 652], 'mastery.webp': [420, 913], 'explorer-connections.webp': [369, 802], 'lesson-template.webp': [538, 374], 'explorer-map.webp': [280, 608], 'live-host.webp': [280, 608], 'reading-plans.webp': [660, 1434] };
const shot = (src, alt, cls = '', eager = false) => html`<div class="device ${cls}"><img src="/assets/site/img/screens/${src}" alt="${alt}" width="${DIMS[src][0]}" height="${DIMS[src][1]}" ${eager ? '' : raw('loading="lazy" decoding="async"')}></div>`;
const ticks = items => html`<ul class="ticks">${items.map(t => html`<li>${icon('chevron-forward')}<span>${t}</span></li>`)}</ul>`;

/** A few real verses with their real Explorer links, rendered like the app's Reader. */
function readerExcerpt(ctx, bookName, chapter, from, to) {
  const book = ctx.scripture.books.find(b => b.name === bookName);
  const key = `${bookName} ${chapter}`;
  const ms = ctx.snapshot.mentions[key] ?? [];
  const rows = [];
  for (let v = from; v <= to; v++) {
    const text = book.chapters[chapter - 1][v - 1].t;
    const spans = resolveSpans(text, ms.filter(m => m[0] === v));
    let out = '', at = 0;
    for (const s of spans) {
      const e = ctx.E[s.id];
      out += html`${text.slice(at, s.s).replace(/--/g, '—')}<a class="m k-${e.kind}" href="${e.url}">${text.slice(s.s, s.e)}</a>`;
      at = s.e;
    }
    out += html`${text.slice(at).replace(/--/g, '—')}`;
    rows.push(`<p class="verse" style="margin-bottom:12px"><span class="verse-num" style="line-height:31px">${v}</span><span class="verse-text">${out}</span></p>`);
  }
  const url = `/scriptures/book-of-mormon/${book.slug}/${chapter}/`;
  const present = [...new Set(ms.filter(m => m[0] >= from && m[0] <= to).map(m => m[1]))].map(id => ctx.E[id]);
  return html`<div class="surface reader-demo">
    <p class="eyebrow" style="text-align:center">Book of Mormon</p>
    <p class="display" style="text-align:center;font-size:28px;margin:6px 0 20px">${key}</p>
    ${raw(rows.join(''))}
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;padding-top:14px;border-top:1px solid var(--separator)">
      ${present.map(e => html`<a class="chip k-${e.kind}" href="${e.url}"><span class="mark" style="--size:18px">${icon(KIND[e.kind].icon)}</span>${displayName(e)}</a>`)}
      <a class="chip" href="${url}">Read the chapter ${icon('arrow-forward')}</a>
    </div>
  </div>`;
}

export function homePage(ctx) {
  const { byKind, featuredPeople } = ctx;
  const body = html`
<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <p class="eyebrow">Scripture study app · iPhone, iPad and Android</p>
      <h1>Read closely. Study together. Teach live.</h1>
      <p class="lede">Cultivate is a calm place to read scripture, follow the people and places in the text, study with your family or class, and build lessons you can teach live.</p>
      <div class="btn-row"><a class="btn btn-primary" href="/download/">${icon('phone-portrait-outline')}Get the app</a><a class="btn btn-secondary" href="/explorer/">${icon('compass-outline')}Open Explorer on the web</a></div>
      <p class="hero-note">Free beta on TestFlight and Google Play.</p>
    </div>
    <div class="hero-visual" aria-label="Cultivate app screens">
      ${shot('reader.webp', 'The Cultivate reader showing 1 Nephi 2 with a highlighted phrase and related verses', '', true)}
      ${shot('explorer-connections.webp', 'An Explorer profile for Peter showing family and events in scripture', '', true)}
    </div>
  </div>
</section>

<section class="section band" aria-labelledby="pillars-h">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">What Cultivate does</p><h2 id="pillars-h">One app for personal study, shared study and teaching.</h2></div>
    <div class="pillars">
      <article class="surface pillar"><span class="ic-wrap">${icon('book-outline')}</span><h3>Study</h3><p class="muted">A reader built for attention, with Explorer one tap away.</p>
        <ul><li>One verse at a time, or the full chapter</li><li>Notes, highlights and bookmarks</li><li>People, places and events beside the text</li><li>Reading plans and scripture mastery</li></ul>
        <a class="more" href="/study/">See Study ${icon('arrow-forward')}</a></article>
      <article class="surface pillar"><span class="ic-wrap">${icon('people-outline')}</span><h3>Connect</h3><p class="muted">Private Study Spaces for families, friends and classes.</p>
        <ul><li>Read the same plan together</li><li>See shared progress, not a leaderboard</li><li>Share a thought, keep your notes private</li><li>Invite with a link or a code</li></ul>
        <a class="more" href="/connect/">See Connect ${icon('arrow-forward')}</a></article>
      <article class="surface pillar"><span class="ic-wrap">${icon('school-outline')}</span><h3>Teach</h3><p class="muted">Build a lesson from scripture and lead it live.</p>
        <ul><li>Lesson Builder with scripture, questions and images</li><li>Templates to start fast</li><li>Live Lessons that follow on every device</li><li>Lesson Channels for recurring classes</li></ul>
        <a class="more" href="/teach/">See Teach ${icon('arrow-forward')}</a></article>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="explorer-h">
  <div class="wrap feature">
    <div>
      <p class="eyebrow">Scripture Explorer · free on the web</p>
      <h2 id="explorer-h">Follow the people, places and events behind every chapter.</h2>
      <p class="lede">Explorer links ${byKind.person.length} people, ${byKind.place.length} places, ${byKind.event.length} events and ${byKind.group.length} groups in the Book of Mormon to the verses they come from. Use it in the app, or browse it here without an account.</p>
      <div class="stat-row" style="margin-bottom:24px">${KINDS.map(k => html`<a class="stat k-${k}" href="/explorer/${KIND[k].path}/"><strong>${byKind[k].length}</strong><span><span class="mark" style="--size:18px">${icon(KIND[k].icon)}</span>${KIND[k].many}</span></a>`)}</div>
      <div class="btn-row"><a class="btn btn-primary" href="/explorer/">Open Explorer</a><a class="btn btn-secondary" href="/scriptures/book-of-mormon/">Read the Book of Mormon</a></div>
    </div>
    <div class="people-grid" style="grid-template-columns:repeat(2,1fr)">
      ${featuredPeople.slice(0, 8).map(e => html`<a class="surface card-link person-card k-person" href="${e.url}"><span class="mark" style="--size:40px">${icon('person-outline')}</span><span><strong>${displayName(e)}</strong><small>${plural(e.events.length, 'event')} · ${plural(Object.keys(e.chapters).length, 'chapter')}</small></span></a>`)}
    </div>
  </div>
</section>

<section class="section band" aria-labelledby="reader-h">
  <div class="wrap feature reverse">
    <div>
      <p class="eyebrow">Study</p>
      <h2 id="reader-h">A reader that keeps the context close.</h2>
      <p class="lede">Names in the text open their Explorer profile. Speaker labels show who is talking. Your notes, highlights and saved passages stay with the verse.</p>
      ${ticks(['Switch between one-verse focus and the full chapter', 'Highlight a phrase, not just a verse', 'Topical Guide and related verses from any passage', 'Pick up exactly where you stopped'])}
      <a class="btn btn-secondary" href="/study/">More about Study</a>
    </div>
    ${readerExcerpt(ctx, 'Mosiah', 18, 8, 10)}
  </div>
</section>

<section class="section" aria-labelledby="connect-h">
  <div class="wrap feature">
    <div>
      <p class="eyebrow">Connect</p>
      <h2 id="connect-h">Study Spaces for the people you study with.</h2>
      <p class="lede">Make a private space for your family, friends or class. Read the same plan, see how everyone is moving through it, and share a thought from your notes when you want to.</p>
      ${ticks(['Works across iPhone, iPad and Android', 'Shared reading plans and cooperative progress', 'Personal notes stay private unless you share them', 'Join with an invite link or a six-character code'])}
      <a class="btn btn-secondary" href="/connect/">More about Connect</a>
    </div>
    <div class="shots">${shot('reading-plans.webp', 'Study plans: a family plan with today’s reading and lesson playlists')}</div>
  </div>
</section>

<section class="section band" aria-labelledby="teach-h">
  <div class="wrap feature reverse">
    <div>
      <p class="eyebrow">Teach</p>
      <h2 id="teach-h">Build a lesson, then teach it live.</h2>
      <p class="lede">Lesson Builder turns passages, questions, your own words and images into a lesson. Live Lessons put the same lesson on every participant’s device as you teach.</p>
      ${ticks(['Drag in scripture, questions, text and images', 'Start from a template or a week’s reading', 'Live Lessons with presenter-only notes', 'Lesson Channels for Sunday School, seminary and family'])}
      <a class="btn btn-secondary" href="/teach/">More about Teach</a>
    </div>
    <div class="shots" style="flex-direction:column;align-items:stretch">${shot('lesson-builder.webp', 'Lesson Builder on iPad with Section, Scripture, Text, Question and Image blocks', 'device-tablet')}</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="surface cta-band">
      <div><h2>Try Cultivate.</h2><p class="muted">The beta is free on iPhone, iPad and Android.</p></div>
      <div class="btn-row"><a class="btn btn-primary" href="${DOWNLOADS.ios}">${icon('logo-apple')}iPhone and iPad</a><a class="btn btn-secondary" href="/download/#android">${icon('logo-google-playstore')}Android</a></div>
    </div>
  </div>
</section>`;
  return page({
    path: '/', active: null, release: ctx.release,
    title: 'Cultivate | Scripture study app with Explorer, Study Spaces and Lessons',
    description: 'Read scripture closely, follow the people, places and events in the text, study with family or a class, and build lessons you can teach live. Free beta for iPhone, iPad and Android.',
    body,
    jsonld: [{ '@type': 'MobileApplication', name: 'Cultivate', operatingSystem: 'iOS, iPadOS, Android', applicationCategory: 'EducationApplication', url: abs('/'), offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }],
  });
}

function pillarPage(ctx, { path, key, title, description, eyebrow, h1, lede, sections }) {
  const body = html`<section class="hero" style="padding-bottom:24px"><div class="wrap"><p class="eyebrow">${eyebrow}</p><h1 class="display" style="font-size:clamp(40px,5.6vw,64px);line-height:1.04;margin:12px 0 18px;max-width:14em">${h1}</h1><p class="lede">${lede}</p></div></section>
  ${sections.map((s, i) => html`<section class="section ${i % 2 ? '' : 'band'}"><div class="wrap ${s.visual ? `feature ${i % 2 ? 'reverse' : ''}` : 'prose-feature'}"><div><p class="eyebrow">${s.eyebrow}</p><h2>${s.title}</h2><p class="lede">${s.text}</p>${s.ticks ? ticks(s.ticks) : ''}${s.cta ?? ''}</div>${s.visual ? html`<div class="shots">${s.visual}</div>` : ''}</div></section>`)}
  <section class="section"><div class="wrap"><div class="surface cta-band"><div><h2>Get Cultivate.</h2><p class="muted">Free beta on iPhone, iPad and Android.</p></div><div class="btn-row"><a class="btn btn-primary" href="/download/">Get the app</a></div></div></div></section>`;
  return page({ path, active: key, release: ctx.release, title, description, crumbs: [{ label: 'Home', href: '/' }, { label: eyebrow }], body });
}

export function studyPage(ctx) {
  return pillarPage(ctx, {
    path: '/study/', key: 'study', eyebrow: 'Study',
    title: 'Study: scripture reader, notes, highlights and Explorer',
    description: 'Cultivate’s scripture reader: one verse at a time or the full chapter, notes, highlights, bookmarks, Explorer, Topical Guide, reading plans and scripture mastery.',
    h1: 'A scripture reader made for paying attention.',
    lede: 'Read one verse at a time or the whole chapter. Mark what matters, and open the people, places and events in the text without losing your place.',
    sections: [
      { eyebrow: 'Reader', title: 'Focus on one verse, or see the whole chapter.', text: 'Scroll verse by verse for focus, then switch to the full chapter for context. Cultivate remembers exactly where you stopped.', ticks: ['Word-range highlights and notes on any verse', 'Bookmarks and saved passages', 'Speaker labels show who is talking', 'Related verses and Topical Guide from the passage'], visual: shot('reader.webp', 'The Cultivate reader with a highlighted phrase and related verses') },
      { eyebrow: 'Explorer', title: 'The people and places in the text, one tap away.', text: 'Every name links to a profile with family, events, places and the verses behind each connection.', cta: html`<a class="btn btn-secondary" href="/explorer/">Browse Explorer on the web</a>`, visual: html`${shot('explorer-connections.webp', 'An Explorer profile with family and events')}${shot('explorer-map.webp', 'Explorer map of places linked to a person')}` },
      { eyebrow: 'Plans and mastery', title: 'Keep a rhythm, and keep what you learn.', text: 'Follow a reading plan or build your own, then practice key passages until you know them.', ticks: ['Daily reading goals and plans', 'Fill-the-gaps, first-letter and ordering practice', 'Progress you can see over time'], visual: html`${shot('reading-plans.webp', 'Study Plans with a family plan and playlists')}${shot('mastery.webp', 'Scripture mastery practice for Genesis 2:24')}` },
    ],
  });
}

export function connectPage(ctx) {
  return pillarPage(ctx, {
    path: '/connect/', key: 'connect', eyebrow: 'Connect',
    title: 'Connect: Study Spaces for families, friends and classes',
    description: 'Create a private Study Space to read the same plan, follow shared progress and share thoughts, across iPhone, iPad and Android.',
    h1: 'Study together without turning scripture into a feed.',
    lede: 'Study Spaces are private groups for the people you already study with. Read together, see progress together, and share only what you choose.',
    sections: [
      { eyebrow: 'Study Spaces', title: 'A shared plan and a shared rhythm.', text: 'Pick a reading plan for the group. Everyone reads on their own time and sees how the group is moving through it.', ticks: ['Shared reading plans and schedules', 'Cooperative progress, not rankings', 'Gentle nudges with notification controls'], visual: null },
      { eyebrow: 'Shared thoughts', title: 'Share a thought, keep your notes.', text: 'Pick one entry from your notes to share with the space. The rest of your study stays private.', ticks: ['Thoughts attached to the verse they came from', 'Private by default'], visual: null },
      { eyebrow: 'Joining', title: 'Invite anyone, on any phone.', text: 'Send an invite link or read out a six-character code. Study Spaces work on iPhone, iPad and Android.', cta: html`<a class="btn btn-secondary" href="/download/">Get the app</a>`, visual: null },
    ],
  });
}

export function teachPage(ctx) {
  return pillarPage(ctx, {
    path: '/teach/', key: 'teach', eyebrow: 'Teach',
    title: 'Teach: Lesson Builder, Live Lessons and Lesson Channels',
    description: 'Build scripture lessons with passages, questions, notes and images, teach them live on every participant’s device, and keep recurring classes in Lesson Channels.',
    h1: 'From a passage to a lesson to a room that follows along.',
    lede: 'Lesson Builder puts scripture, questions and your own words in one place. Live Lessons bring everyone to the same slide.',
    sections: [
      { eyebrow: 'Lesson Builder', title: 'Build with blocks.', text: 'Add sections, scripture by reference, your own text, discussion questions and images. Rearrange by dragging.', ticks: ['Start from a template or this week’s reading', 'Bring in passages and notes you saved while studying', 'Preview before you teach'], visual: shot('lesson-builder.webp', 'Lesson Builder on iPad', 'device-tablet') },
      { eyebrow: 'Live Lessons · early access', title: 'Teach live, on every device.', text: 'Start a Live Lesson and participants follow on their own phones. Presenter-only notes stay on your screen.', ticks: ['Synchronized slides for the whole room', 'Questions and prompts for discussion', 'Early access is invite-only for now'], visual: shot('live-host.webp', 'A Live Lesson host view with a presenter-only note') },
      { eyebrow: 'Lesson Channels', title: 'A home for a class that meets every week.', text: 'Publish lessons to a channel for Sunday School, seminary or family, so people can find this week’s lesson and past ones.', visual: shot('lesson-template.webp', 'A lesson template', 'device-tablet') },
    ],
  });
}

export function downloadPage(ctx) {
  const body = html`<section class="hero" style="padding-bottom:24px"><div class="wrap"><p class="eyebrow">Download</p><h1 class="display" style="font-size:clamp(40px,5.6vw,64px);line-height:1.04;margin:12px 0 18px">Get Cultivate.</h1><p class="lede">Cultivate is in beta on iPhone, iPad and Android. Choose your device to get started.</p></div></section>
  <section class="wrap" style="padding-bottom:48px">
    <div class="download-cards">
      <div class="surface" id="ios"><span class="pill" style="--pill-bg:var(--primary);--pill-ink:var(--accent-ink)"><i></i>iPhone and iPad</span><h2>Install with TestFlight</h2><p class="muted">Apple’s TestFlight app installs Cultivate and keeps it updated during the beta.</p><a class="btn btn-primary" href="${DOWNLOADS.ios}">${icon('logo-apple')}Get the iOS beta</a></div>
      <div class="surface" id="android"><span class="pill" style="--pill-bg:var(--primary);--pill-ink:var(--accent-ink)"><i></i>Android</span><h2>Join the Android test</h2><p class="muted">Sign up with the Google account on your device. Once approved, the Google Play testing link works.</p><div class="btn-row"><a class="btn btn-primary" href="${DOWNLOADS.androidSignup}">${icon('logo-google-playstore')}Sign up for Android</a><a class="btn btn-secondary" href="${DOWNLOADS.androidPlay}">Already approved? Open Google Play</a></div></div>
    </div>
    <div class="prose" style="margin-top:40px"><h2>What “beta” means</h2><p>You are using Cultivate before its wider release. Features may change, and updates arrive through TestFlight or Google Play.</p><h2>Does it work offline?</h2><p>Reading, Explorer, the Topical Guide and lesson building work offline. Sync, Study Spaces and Live Lessons need a connection.</p><h2>Questions</h2><p>Email <a href="mailto:cultivatestudy@gmail.com">cultivatestudy@gmail.com</a>. See also the <a href="/beta/">beta testing guide</a> and our <a href="/privacy/">privacy policy</a>.</p></div>
  </section>`;
  return page({ path: '/download/', active: null, release: ctx.release, title: 'Download Cultivate for iPhone, iPad and Android', description: 'Install the Cultivate beta with TestFlight on iPhone and iPad, or join the Google Play test on Android.', crumbs: [{ label: 'Home', href: '/' }, { label: 'Download' }], body });
}

export function notFoundPage(ctx) {
  const body = html`<section class="hero"><div class="wrap-read" style="text-align:center"><p class="eyebrow">Page not found</p><h1 class="display" style="font-size:clamp(36px,5vw,52px);margin:12px 0 16px">We couldn’t find that page.</h1><p class="lede" style="margin:0 auto 24px">It may have moved. Try Explorer search, or start from one of these.</p>
  <form class="search" action="/explorer/search/" method="get" role="search" style="margin:0 auto 24px"><label class="sr-only" for="nf-q">Search Explorer</label><input id="nf-q" name="q" type="search" placeholder="Search people, places, events"><button class="btn btn-primary btn-sm" type="submit">Search</button></form>
  <div class="btn-row" style="justify-content:center"><a class="btn btn-secondary" href="/">Home</a><a class="btn btn-secondary" href="/explorer/">Explorer</a><a class="btn btn-secondary" href="/scriptures/book-of-mormon/">Book of Mormon</a></div></div></section>`;
  return page({ path: '/404', active: null, release: ctx.release, title: 'Page not found', description: 'This page could not be found.', robots: 'noindex', body });
}
