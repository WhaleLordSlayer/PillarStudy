// PostHog, carried over from the /new/ preview (same project, same CTA
// events), now for the unified site. Environment is tagged so preview
// traffic stays separate from production.
(() => {
  const host = location.hostname;
  const environment = host === 'www.cultivatestudy.com' || host === 'cultivatestudy.com' ? 'production' : (host === 'localhost' || host === '127.0.0.1' ? 'local' : 'preview');
  if (environment === 'local' || navigator.webdriver) return;
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2===o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset get_distinct_id onFeatureFlags isFeatureEnabled getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group".split(" ");for(n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  window.posthog.init('phc_rntrDoju6uBdSp2k7H67VKMqDnyaohACtLXQFno8woY3', {
    api_host: 'https://us.i.posthog.com', ui_host: 'https://us.posthog.com', defaults: '2026-05-30',
    autocapture: true, capture_pageview: true, capture_pageleave: true,
    persistence: 'localStorage', person_profiles: 'identified_only', disable_surveys: true,
  });
  const section = location.pathname.split('/')[1] || 'home';
  window.posthog.register({ site_surface: 'marketing_web', site_environment: environment, site_version: 'unified-v1', site_section: section });
  const label = el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  document.addEventListener('click', ev => {
    const el = ev.target instanceof Element ? ev.target.closest('a,button') : null;
    if (!el) return;
    const href = el instanceof HTMLAnchorElement ? el.href : null;
    const props = { cta_label: label(el) || null, cta_href: href, page_path: location.pathname, page_title: document.title };
    if (href && href.includes('testflight.apple.com')) return window.posthog.capture('marketing_download_clicked', { ...props, platform: 'ios' });
    if (href && (href.includes('play.google.com') || href.includes('forms.gle'))) return window.posthog.capture('marketing_download_clicked', { ...props, platform: 'android' });
    if (el.matches('.btn')) return window.posthog.capture('marketing_cta_clicked', props);
    if (el.closest('.verse-text') && href) return window.posthog.capture('scripture_entity_link_clicked', props);
  }, { capture: true });
})();
