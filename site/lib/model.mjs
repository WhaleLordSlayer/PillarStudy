// Presentation model over a public snapshot: URLs, labels, ordering,
// indexing decisions. Pure functions; no I/O except the artwork registry.
import { BOOK_BY_NAME, BOOKS } from './books.mjs';
import { titleCase } from './html.mjs';

export const KINDS = ['person', 'place', 'event', 'group'];
export const KIND = {
  person: { path: 'people', one: 'Person', many: 'People', icon: 'person-outline' },
  place: { path: 'places', one: 'Place', many: 'Places', icon: 'location-outline' },
  event: { path: 'events', one: 'Event', many: 'Events', icon: 'sparkles-outline' },
  group: { path: 'groups', one: 'Group', many: 'Groups', icon: 'people-outline' },
};

const slugify = s => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'record';

/**
 * Display form of release names: "Zarahemla, City of" → "City of Zarahemla",
 * "Sidon, River" → "River Sidon", "jershon" → "Jershon". Presentation only;
 * the release name is kept for search and aliases.
 */
const DESCRIPTOR = /^(City|Land|Hill|Valley|Waters|Plains|Wilderness|River|Sea|Mount|Mountain|Borders|Place|Tower|Wall|Fort|Forest|Narrow Pass|Narrow Neck|Fountain|Tree|Seashore|Rock)( of)?$/i;
export function displayName(e) {
  let name = e.name;
  const m = /^(.+?), ([^,(]+?)( \(.+\))?$/.exec(name);
  if (m && DESCRIPTOR.test(m[2].trim())) name = `${m[2].trim()} ${m[1]}${m[3] ?? ''}`;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Assigns one URL per entity. Release slugs are used as-is; collisions within
 * a kind get a stable id suffix. The slug ledger (site/data/slug-ledger.json)
 * remembers every slug an entity has had so renamed records 301 to their new
 * URL instead of breaking.
 */
export function assignUrls(snapshot, ledger = {}) {
  const used = new Map();
  const redirects = [];
  const nextLedger = { ...ledger };
  for (const e of Object.values(snapshot.entities)) {
    // Places read better as "city-of-zarahemla" than the release's "zarahemla-city-of".
    let slug = e.kind === 'place' || !e.slug ? slugify(displayName(e)) : e.slug;
    const key = `${e.kind}/${slug}`;
    if (used.has(key)) slug = `${slug}-${slugify(e.id).slice(-8)}`;
    used.set(`${e.kind}/${slug}`, e.id);
    e.url = `/explorer/${KIND[e.kind].path}/${slug}/`;
    const prev = ledger[e.id];
    const history = new Set(prev?.history ?? []);
    if (prev && prev.url !== e.url) {
      history.add(prev.url);
    }
    for (const old of history) if (old !== e.url) redirects.push([old, e.url]);
    nextLedger[e.id] = { url: e.url, history: [...history].filter(u => u !== e.url).sort() };
  }
  return { redirects, ledger: nextLedger };
}

const PREDICATE = { father_of: 'Father and child', mother_of: 'Mother and child', sibling_of: 'Siblings', spouse_of: 'Spouses', killed: 'Slaying' };
export const familyLabel = p => PREDICATE[p] ?? titleCase(p);
export const roleLabel = r => (r ? titleCase(r) : null);
export const placeTypeLabel = t => (!t || t === 'place_unspecified' ? 'Place' : titleCase(t));

export function subtitle(e) {
  if (e.kind === 'place') return placeTypeLabel(e.placeType);
  if (e.kind === 'event') return e.refs[0]?.display ?? 'Event';
  if (e.title) return e.title;
  return KIND[e.kind].one;
}

/** Book order index for sorting references and events chronologically by text. */
export function refOrder(ref) {
  const b = BOOKS.findIndex(x => x.name === ref.book);
  return (b < 0 ? 99 : b) * 1e6 + (ref.sc || 0) * 1e3 + (ref.sv || 0);
}
export const entityOrder = e => (e.refs.length ? Math.min(...e.refs.map(refOrder)) : 9e9);

export function chapterUrl(book, chapter, verse) {
  const b = BOOK_BY_NAME.get(book);
  if (!b) return null;
  return `/scriptures/book-of-mormon/${b.slug}/${chapter}/${verse ? `#v${verse}` : ''}`;
}

/** Every chapter (book, chapter) a reference range touches. */
export function chaptersOf(ref) {
  const out = [];
  const b0 = BOOKS.findIndex(x => x.name === ref.book);
  const b1 = BOOKS.findIndex(x => x.name === (ref.endBook || ref.book));
  if (b0 < 0) return out;
  if (b1 !== b0 && b1 >= 0) return [[ref.book, ref.sc]];
  for (let c = ref.sc; c <= (ref.ec || ref.sc) && c < ref.sc + 40; c++) out.push([ref.book, c]);
  return out;
}

export function connectionCount(e) {
  return e.events.length + e.places.length + e.groups.length + e.people.length + e.family.length + e.keyPeople.length + e.relatedEvents.length;
}

/** Thin-content score: profiles below EXPLORER.minIndexScore are noindex. */
export function indexScore(e) {
  return (e.summary ? 4 : 0) + Math.min(connectionCount(e), 6) + Math.min(e.refs.length, 3) + Math.min(Object.keys(e.chapters).length, 3) + (e.mentionCount >= 5 ? 1 : 0);
}

/** Portrait artwork is not used on the web. Kept as a hook for future approved imagery. */
export function artwork() {
  return null;
}
