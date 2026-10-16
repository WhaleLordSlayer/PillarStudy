// Server-rendered SVG charts. No client JavaScript: hover shows a native
// <title> tooltip, each bar is focusable, and a data table sits beside it.
import { esc, html, raw } from './html.mjs';
import { BOOKS } from './books.mjs';
import { KIND, displayName } from './model.mjs';

/** Verse mentions per book: one series, thin bars, value labels on the top bars only. */
export function bookBars(counts, { label }) {
  const data = BOOKS.map(b => ({ name: b.name, n: counts[b.name] ?? 0 }));
  const max = Math.max(1, ...data.map(d => d.n));
  const W = 640, H = 200, padL = 4, padB = 46, top = 18;
  const bw = (W - padL) / data.length;
  const barW = Math.min(22, bw - 8);
  const top3 = new Set([...data].sort((a, b) => b.n - a.n).slice(0, 3).filter(d => d.n > 0).map(d => d.name));
  const bars = data.map((d, i) => {
    const h = d.n ? Math.max(4, ((H - padB - top) * d.n) / max) : 0;
    const x = padL + i * bw + (bw - barW) / 2;
    const y = H - padB - h;
    const r = Math.min(4, barW / 2, h / 2);
    const path = h ? `M${x},${H - padB} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${H - padB} Z` : '';
    return `<g tabindex="${d.n ? 0 : -1}" role="img" aria-label="${esc(d.name)}: ${d.n}"><title>${esc(d.name)}: ${d.n} verse ${d.n === 1 ? 'mention' : 'mentions'}</title>`
      + (path ? `<path class="bar" d="${path}"/>` : '')
      + (top3.has(d.name) ? `<text class="val" x="${x + barW / 2}" y="${y - 6}" text-anchor="middle">${d.n}</text>` : '')
      + `<text x="${x + barW / 2}" y="${H - padB + 12}" text-anchor="end" transform="rotate(-40 ${x + barW / 2} ${H - padB + 12})">${esc(d.name.replace('Words of Mormon', 'W. of Mormon'))}</text></g>`;
  }).join('');
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(label)}"><line class="axis" x1="0" x2="${W}" y1="${H - padB}" y2="${H - padB}"/>${bars}</svg>`;
  const rows = data.filter(d => d.n).map(d => `<tr><td>${esc(d.name)}</td><td>${d.n}</td></tr>`).join('');
  return html`<figure class="chart" style="margin:0">${raw(svg)}<details><summary>Show as table</summary><table><thead><tr><th>Book</th><th>Verse mentions</th></tr></thead><tbody>${raw(rows)}</tbody></table></details></figure>`;
}

/**
 * A small radial map of direct links: the record in the middle, linked
 * records around it, colored and labelled by kind (color is never the only
 * cue — every node has its name, and the legend names each kind).
 */
export function connectionGraph(center, neighbors) {
  const nodes = neighbors.slice(0, 14);
  if (nodes.length < 5) return '';
  const W = 780, H = 360, cx = W / 2, cy = H / 2;
  const placed = nodes.map((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return { n, x: cx + Math.cos(a) * 200, y: cy + Math.sin(a) * 128 };
  });
  const trunc = s => (s.length > 22 ? `${s.slice(0, 21)}…` : s);
  const edges = placed.map(p => `<line class="edge" x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}"/>`).join('');
  const dots = placed.map(p => {
    const anchor = p.x < cx - 20 ? 'end' : p.x > cx + 20 ? 'start' : 'middle';
    const dx = anchor === 'end' ? -12 : anchor === 'start' ? 12 : 0;
    const dy = anchor === 'middle' ? (p.y < cy ? -14 : 22) : 4;
    return `<a href="${esc(p.n.url)}" class="node k-${p.n.kind}"><title>${esc(displayName(p.n))} (${KIND[p.n.kind].one})</title><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="8" style="fill:var(--k)"/><text x="${(p.x + dx).toFixed(1)}" y="${(p.y + dy).toFixed(1)}" text-anchor="${anchor}">${esc(trunc(displayName(p.n)))}</text></a>`;
  }).join('');
  const c = `<g class="node k-${center.kind}"><circle cx="${cx}" cy="${cy}" r="14" style="fill:var(--k)"/><text x="${cx}" y="${cy + 34}" text-anchor="middle">${esc(trunc(displayName(center)))}</text></g>`;
  return raw(`<div class="graph"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${displayName(center)} and ${nodes.length} directly linked records`)}">${edges}${dots}${c}</svg></div>`);
}
