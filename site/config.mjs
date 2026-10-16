// Website configuration. Everything that might be switched per environment
// lives here; nothing in templates hard-codes it.
export const SITE = {
  origin: 'https://www.cultivatestudy.com',
  name: 'Cultivate',
  contactEmail: 'cultivatestudy@gmail.com',
  themeColor: { light: '#f8f9fa', dark: '#090f0a' },
};

export const DOWNLOADS = {
  ios: 'https://testflight.apple.com/join/VZycpDUV',
  androidSignup: 'https://forms.gle/A6kuA1KwafnrKeUP6',
  androidPlay: 'https://play.google.com/apps/testing/com.pillarapp.linebyline',
};

export const EXPLORER = {
  // Corpora published on the web. Add 'BIBLE', 'PGP' once their reader pages exist.
  corpora: ['BOM'],
  // The public snapshot the site is built from. Written only by
  // scripts/explorer-sync.mjs from a verified, published release.
  snapshot: new URL('./data/explorer-snapshot.json', import.meta.url),
  // Thin-page rule: profiles below this score are rendered (links keep
  // working) but marked noindex and left out of the sitemap.
  minIndexScore: 4,
};

export const SCRIPTURES = {
  works: ['book-of-mormon'],
  // Chapters with fewer distinct linked Explorer records stay noindex.
  minIndexEntities: 3,
};

// Advertising is prepared, not active. With enabled:false no ad markup,
// script or network request is emitted anywhere. Placements are allowed only
// on longer Explorer pages, never inside scripture text, never as pop-ups,
// and always apart from Cultivate's own app call-to-action.
export const ADS = {
  enabled: false,
  provider: null, // 'adsense' | 'sponsor'
  adsenseClient: null, // 'ca-pub-…' once approved
  placements: { explorerProfile: { minSections: 4 }, explorerBrowse: { minItems: 40 } },
  sponsor: null, // { label, href, image, alt } for manually approved sponsorships
};

export const ANALYTICS = {
  posthog: {
    token: 'phc_rntrDoju6uBdSp2k7H67VKMqDnyaohACtLXQFno8woY3',
    apiHost: 'https://us.i.posthog.com',
    uiHost: 'https://us.posthog.com',
  },
};
