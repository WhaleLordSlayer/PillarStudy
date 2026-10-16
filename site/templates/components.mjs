import { ADS } from '../config.mjs';
import { esc, html, icon, join, raw } from '../lib/html.mjs';
import { KIND, artwork, chapterUrl, displayName, subtitle } from '../lib/model.mjs';

export function entityAvatar(e, size = 40) {
  const art = artwork(e);
  if (art) return html`<img class="avatar" src="${art.thumb}" alt="" width="${size}" height="${size}" loading="lazy" style="--size:${size}px">`;
  return html`<span class="mark k-${e.kind}" style="--size:${size}px">${icon(KIND[e.kind].icon)}</span>`;
}

export function entityRow(e, extra) {
  return html`<li><a class="row k-${e.kind}" href="${e.url}">${entityAvatar(e)}<span class="row-main"><strong>${displayName(e)}</strong><small>${extra ?? subtitle(e)}</small></span>${icon('chevron-forward', 'chev')}</a></li>`;
}

export function refChip(ref) {
  const url = chapterUrl(ref.book, ref.sc, ref.sv);
  return url ? html`<a class="chip" href="${url}">${icon('book-outline')}${ref.display}</a>` : html`<span class="chip">${ref.display}</span>`;
}

export function block(title, count, body, { id, note } = {}) {
  return html`<section class="surface block" ${id ? raw(`id="${esc(id)}"`) : ''} aria-labelledby="${id ?? ''}h">
    <div class="block-head"><h2 id="${id ?? ''}h">${title}</h2>${count != null ? html`<span>${count}</span>` : ''}</div>
    ${note ? html`<p class="note">${note}</p>` : ''}
    ${body}
  </section>`;
}

export function appNudge(text = 'Read with Explorer beside the text, save notes and highlights, and study with family or a class.') {
  return html`<div class="surface app-nudge"><strong>Study this in Cultivate</strong><p>${text}</p><a class="btn btn-secondary btn-sm" href="/download/">${icon('phone-portrait-outline')}Get the app</a></div>`;
}

/**
 * The single optional ad placement. Returns nothing unless ADS.enabled, so
 * the default build contains no ad markup, scripts or requests.
 */
export function adSlot(placement, { sections = 0, items = 0 } = {}) {
  if (!ADS.enabled) return '';
  const rule = ADS.placements[placement];
  if (!rule) return '';
  if (rule.minSections && sections < rule.minSections) return '';
  if (rule.minItems && items < rule.minItems) return '';
  if (ADS.provider === 'sponsor' && ADS.sponsor) {
    const s = ADS.sponsor;
    return html`<aside class="ad-slot" aria-label="Sponsor"><span>Sponsor</span><a href="${s.href}" rel="sponsored noopener">${s.image ? html`<img src="${s.image}" alt="${s.alt}">` : s.label}</a></aside>`;
  }
  if (ADS.provider === 'adsense' && ADS.adsenseClient) {
    return html`<aside class="ad-slot" aria-label="Advertisement" data-ad-provider="adsense" data-ad-client="${ADS.adsenseClient}" data-ad-placement="${placement}"><span>Advertisement</span></aside>`;
  }
  return '';
}

export function kindLegend(kinds) {
  return html`<div class="legend">${kinds.map(k => html`<span class="k-${k}"><i></i>${KIND[k].many}</span>`)}</div>`;
}

export { join, raw };
