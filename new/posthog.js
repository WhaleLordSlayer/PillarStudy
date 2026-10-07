(() => {
  if (!window.location.pathname.startsWith('/new/')) return;

  const PROJECT_TOKEN = 'phc_rntrDoju6uBdSp2k7H67VKMqDnyaohACtLXQFno8woY3';
  const API_HOST = 'https://us.i.posthog.com';
  const UI_HOST = 'https://us.posthog.com';

  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2===o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset get_distinct_id onFeatureFlags isFeatureEnabled getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group".split(" ");for(n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  window.posthog.init(PROJECT_TOKEN, {
    api_host: API_HOST,
    ui_host: UI_HOST,
    defaults: '2026-05-30',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage',
    person_profiles: 'identified_only',
    disable_surveys: true,
  });

  window.posthog.register({
    site_surface: 'marketing_web',
    site_environment: 'preview',
    site_version: 'new',
  });

  const cleanLabel = (element) =>
    (element.getAttribute('aria-label') || element.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);

  const getHref = (element) => {
    if (!(element instanceof HTMLAnchorElement)) return null;
    try {
      return new URL(element.href, window.location.href).href;
    } catch {
      return element.getAttribute('href');
    }
  };

  document.addEventListener('click', (event) => {
    const element = event.target instanceof Element
      ? event.target.closest('a,button')
      : null;
    if (!element) return;

    const label = cleanLabel(element);
    const href = getHref(element);
    const isExplicitCta =
      element.matches('.button,.text-link,.nav-download,.join-primary-button,.join-copy-button') ||
      /download|early access|explore|join|open cultivate|testflight|android/i.test(label);

    if (!isExplicitCta) return;

    const properties = {
      cta_label: label || null,
      cta_href: href,
      page_path: window.location.pathname,
      page_title: document.title,
    };

    if (href?.includes('testflight.apple.com')) {
      window.posthog.capture('marketing_download_clicked', { ...properties, platform: 'ios' });
      return;
    }

    if (href?.includes('play.google.com') || href?.includes('forms.gle')) {
      window.posthog.capture('marketing_download_clicked', { ...properties, platform: 'android' });
      return;
    }

    if (/early access/i.test(label)) {
      window.posthog.capture('marketing_early_access_clicked', properties);
      return;
    }

    window.posthog.capture('marketing_cta_clicked', properties);
  }, { capture: true });
})();
