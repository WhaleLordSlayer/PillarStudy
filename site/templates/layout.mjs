import { SITE } from '../config.mjs';
import { esc, html, icon, join, raw } from '../lib/html.mjs';

export const NAV = [
  { href: '/study/', label: 'Study', icon: 'book-outline', key: 'study' },
  { href: '/connect/', label: 'Connect', icon: 'people-outline', key: 'connect' },
  { href: '/teach/', label: 'Teach', icon: 'school-outline', key: 'teach' },
  { href: '/explorer/', label: 'Explorer', icon: 'compass-outline', key: 'explorer' },
  { href: '/scriptures/book-of-mormon/', label: 'Scriptures', icon: 'library-outline', key: 'scriptures' },
];

export const abs = path => new URL(path, SITE.origin).href;

function breadcrumbLd(crumbs) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, ...(c.href ? { item: abs(c.href) } : {}) })),
  };
}

export function breadcrumbs(crumbs) {
  if (!crumbs?.length) return '';
  return html`<nav class="crumbs wrap" aria-label="Breadcrumb"><ol>${crumbs.map((c, i) => html`<li>${i < crumbs.length - 1 && c.href ? html`<a href="${c.href}">${c.label}</a>` : html`<span aria-current="page">${c.label}</span>`}</li>`)}</ol></nav>`;
}

const ldScript = obj => raw(`<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`);

/**
 * Full HTML document. Core content is in the HTML; the only scripts are the
 * theme toggle, analytics and progressive search, all optional.
 */
export function page({ path, title, description, active, crumbs = [], body, jsonld = [], robots = 'index,follow', ogImage = '/assets/site/brand/og-default.png', ogType = 'website', scripts = [], release, preload = [] }) {
  const canonical = abs(path);
  const fullTitle = title.includes('Cultivate') ? title : `${title} | Cultivate`;
  const graph = [
    { '@type': 'WebSite', '@id': `${SITE.origin}/#website`, url: `${SITE.origin}/`, name: 'Cultivate', publisher: { '@id': `${SITE.origin}/#org` } },
    { '@type': 'Organization', '@id': `${SITE.origin}/#org`, name: 'Cultivate', url: `${SITE.origin}/`, logo: abs('/assets/site/brand/mark-512.png'), email: SITE.contactEmail },
    { '@type': 'WebPage', '@id': `${canonical}#page`, url: canonical, name: fullTitle, description, isPartOf: { '@id': `${SITE.origin}/#website` }, inLanguage: 'en' },
    ...(crumbs.length ? [breadcrumbLd(crumbs)] : []),
    ...jsonld,
  ];
  const navLinks = active => NAV.map(n => html`<a href="${n.href}"${n.key === active ? raw(' aria-current="page"') : ''}>${n.label}</a>`);
  const menuLinks = active => NAV.map(n => html`<a href="${n.href}"${n.key === active ? raw(' aria-current="page"') : ''}>${icon(n.icon)}${n.label}</a>`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="${esc(robots)}">
<meta name="theme-color" content="${SITE.themeColor.light}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="${SITE.themeColor.dark}" media="(prefers-color-scheme: dark)">
<meta property="og:site_name" content="Cultivate">
<meta property="og:type" content="${esc(ogType)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(abs(ogImage))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(abs(ogImage))}">
<link rel="icon" href="/assets/site/brand/cultivate-mark.svg" type="image/svg+xml">
<link rel="icon" href="/assets/site/brand/mark-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/site/brand/mark-180.png">
<link rel="preload" href="/assets/site/fonts/HankenGrotesk_400Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/site/fonts/PlayfairDisplay_600SemiBold.woff2" as="font" type="font/woff2" crossorigin>
${preload.map(p => `<link rel="preload" href="${esc(p.href)}" as="${esc(p.as)}" type="${esc(p.type)}" crossorigin>`).join('\n')}
<link rel="stylesheet" href="/assets/site/site.css">
<script>try{var t=localStorage.getItem('cv-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>
${ldScript({ '@context': 'https://schema.org', '@graph': graph })}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/" aria-label="Cultivate home"><img src="/assets/site/brand/cultivate-mark.svg" alt="" width="30" height="30">Cultivate</a>
    <nav class="nav" aria-label="Main">${join(navLinks(active))}</nav>
    <div class="header-actions">
      <button class="icon-btn theme-toggle" type="button" aria-label="Switch light or dark appearance" data-theme-toggle hidden>${icon('sunny-outline', 'ic-sun')}${icon('moon-outline', 'ic-moon')}</button>
      <a class="btn btn-primary btn-sm header-cta" href="/download/">Get the app</a>
      <details class="menu">
        <summary class="icon-btn" aria-label="Menu">${icon('menu-outline')}</summary>
        <div class="menu-panel" role="navigation" aria-label="Mobile">${join(menuLinks(active))}<a href="/download/">${icon('phone-portrait-outline')}Get the app</a></div>
      </details>
    </div>
  </div>
</header>
${breadcrumbs(crumbs)}
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a class="brand" href="/"><img src="/assets/site/brand/cultivate-mark.svg" alt="" width="28" height="28">Cultivate</a>
        <p style="margin-top:12px;max-width:30em">Scripture study for one, for families and for classrooms.</p>
      </div>
      <div><h2>Product</h2><ul><li><a href="/study/">Study</a></li><li><a href="/connect/">Connect</a></li><li><a href="/teach/">Teach</a></li><li><a href="/download/">Download</a></li></ul></div>
      <div><h2>Explore</h2><ul><li><a href="/explorer/">Scripture Explorer</a></li><li><a href="/explorer/people/">People</a></li><li><a href="/explorer/places/">Places</a></li><li><a href="/scriptures/book-of-mormon/">Book of Mormon</a></li></ul></div>
      <div><h2>Help</h2><ul><li><a href="mailto:${SITE.contactEmail}">Contact support</a></li><li><a href="/beta/">Beta testing</a></li><li><a href="/topical-guide/">Topical Guide</a></li></ul></div>
      <div><h2>Legal</h2><ul><li><a href="/privacy/">Privacy policy</a></li><li><a href="/account-deletion/">Delete your account</a></li><li><a href="/explorer/about/">Sources &amp; credits</a></li></ul></div>
    </div>
    <div class="footer-meta"><span>© ${new Date().getFullYear()} Cultivate</span>${release ? raw(`<span>Explorer data: release <a href="/explorer/release.json">${esc(release.releaseId)}</a></span>`) : ''}</div>
  </div>
</footer>
<script src="/assets/site/site.js" defer></script>
${scripts.map(s => `<script src="${esc(s)}" defer></script>`).join('\n')}
<script src="/assets/site/analytics.js" defer></script>
</body>
</html>
`;
}
