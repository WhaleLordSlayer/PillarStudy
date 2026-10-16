# cultivatestudy.com — unified site, public Explorer and scripture reader

Static, server-rendered HTML built from the Cultivate app's design system
(Playfair Display / Source Serif 4 / Hanken Grotesk, the app's light and dark
tokens, Ionicons, the teal C-sprout mark).

```
npm ci
npm run build          # vite build (existing pages) + node site/build.mjs (everything below)
npm run preview:site   # http://localhost:4321 serving dist/
npm test               # propagation, privacy, SEO, links, contrast
```

## What is generated

| Route | Source |
| --- | --- |
| `/`, `/study/`, `/connect/`, `/teach/`, `/download/`, `/404.html` | `site/templates/marketing.mjs` |
| `/explorer/`, `/explorer/{people,places,events,groups}/`, profiles, `/explorer/search/`, `/explorer/about/` | `site/templates/explorer.mjs` + Explorer snapshot |
| `/scriptures/`, `/scriptures/book-of-mormon/<book>/<chapter>/` | `site/templates/scriptures.mjs` + `site/content/scriptures/book-of-mormon.json` + Explorer snapshot |
| `sitemap.xml` (+ `-pages`, `-explorer`, `-scriptures`), `robots.txt`, `_redirects`, `_headers`, `explorer/search-index.json`, `explorer/release.json` | `site/build.mjs` |

Vite still builds the existing pages unchanged: `/join/` (Study Space
invites), `/lesson/` (shared lesson links), `/privacy/`, `/account-deletion/`,
`/beta/`, `/topical-guide/`, `/new/…` (old preview) and `/labs/explorer-graph/`
(the previous `/explorer/` page, moved). The old root `index.html` is replaced
by the generated homepage. `tests/site.test.mjs` asserts the generator never
writes over a preserved route.

## Explorer data: how published changes reach the site

```
Cultivate Admin ──Publish──▶ D1 + R2 release artifact (explorer.db.gz, immutable)
                                   │
          GET /api/public/explorer/current   (public, read-only, R2 only)
                                   │
              scripts/explorer-sync.mjs  (GitHub job; manual for now)
   verify size + SHA-256 ▸ publication rules ▸ shrink guard ▸ full render check
                                   │  only if every step passed
                  site/data/explorer-snapshot.json  (+ lastmod / slug ledgers)
                                   │  git commit
                  Cloudflare build: npm run build ▸ atomic deploy
```

* **Admin stays the source of truth.** The site reads only finalized,
  published releases through the same public endpoints the mobile app uses.
  Drafts and Working Changes never leave D1. No CMS, no Supabase or D1 traffic
  from the website.
* **Publication rules** (`site/lib/snapshot.mjs`): corpus allowlist;
  relationships only when `canonical_claim = 1 AND review_status = 'ACCEPTED'`;
  summaries only `ACCEPT` / `ACCEPT_WITH_SOURCE_WARNING` (with attribution
  and warning); verse links only `DETERMINISTIC_HIGH`; two-hop connections
  always labelled as connected through shared events; links to unpublished
  records dropped.
* **Failure safety.** A download error, hash mismatch, failed SQLite check, a
  release that would drop more than 25 % of public records, or a render error
  stops the job before the snapshot is written (atomic rename). Git keeps every
  previous snapshot; Cloudflare keeps the previous deployment.
* **Selective updates.** Builds are fast (about a second for ~580 pages) and
  Cloudflare static-asset uploads are content-hashed, so only pages whose bytes
  changed are uploaded. `dist/.build/report.json` lists changed and removed
  paths; sitemap `lastmod` changes only for pages whose main content changed
  (`site/data/lastmod.json`). Renamed records keep working through generated
  301s (`site/data/slug-ledger.json`).
* **Bootstrap.** The committed snapshot was created from the Explorer
  database bundled in the app (`--from-db`, release id
  `app-bundled-baseline-…`). The first sync run replaces it with the current
  published release.

```
node scripts/explorer-sync.mjs --dry-run          # check what would change
node scripts/explorer-sync.mjs                    # follow Admin's current release
node scripts/explorer-sync.mjs --from-db <explorer.db> --source app-bundled-baseline
```

To turn on automatic updates later, uncomment `schedule` in
`.github/workflows/explorer-sync.yml`, or have Admin's publish step send a
`repository_dispatch` (`explorer-release-published`).

## SEO

Server-rendered HTML for all core content; descriptive URLs; unique titles and
descriptions; canonical URLs on `https://www.cultivatestudy.com`; Open Graph
and Twitter cards; JSON-LD (`WebSite`, `Organization`, `BreadcrumbList`,
`ProfilePage` with `Person`/`Place`/`Event`/`Organization`, `Chapter`,
`ItemList`, `MobileApplication`); visible breadcrumbs; chapter ⇄ profile
links; sitemap index with `lastmod`. Thin pages are rendered but `noindex` and
left out of sitemaps: profiles scoring under `EXPLORER.minIndexScore`,
chapters with fewer than `SCRIPTURES.minIndexEntities` linked records, and the
search page. `/new/`, `/dev/`, `/labs/`, `/join/`, `/lesson/` are disallowed in
`robots.txt`.

## Scripture text and rights

Verse text is the public-domain text from the lds-scriptures project
(scriptures.nephi.org) via the app's `assets/scriptures.db`
(`site/tools/import-scriptures.mjs`). Chapter headings, summaries and
footnotes are excluded. Speaker labels: Hilton & Hopkin (2012), CC BY 4.0,
credited on every chapter page and on `/explorer/about/`. Portraits are the
app's owner-approved illustrative artwork and are labelled as such.

## Advertising

`ADS` in `site/config.mjs` is `enabled: false`: no ad markup, script or
request is emitted (tested). When enabled, one placement appears on long
Explorer profiles/browse pages only, never in scripture text, never as a
pop-up, and separate from the app call-to-action. Providers: `adsense` (client
id) or a manually approved `sponsor`.

## Analytics

`assets/site/analytics.js` carries over the `/new/` PostHog project and CTA
events (`marketing_download_clicked`, `marketing_cta_clicked`, plus
`scripture_entity_link_clicked`), tagged `site_version: unified-v1` and
`site_environment` (production / preview). It does not run on localhost or for
automated browsers. `/new/posthog.js` is unchanged.
