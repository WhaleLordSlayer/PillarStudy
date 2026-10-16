import { readFileSync } from 'node:fs';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);

/** Tagged template that escapes interpolations unless wrapped with raw(). */
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = s => new Raw(String(s ?? ''));
const render = v => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(render).join('') : esc(v));
export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => { out += s + (i < values.length ? render(values[i]) : ''); });
  return new Raw(out);
}
export const join = (items, sep = '') => raw(items.map(render).join(sep));

const ICON_DIR = new URL('../assets/icons/', import.meta.url);
const iconCache = new Map();
/** Inline Ionicons SVG (the app's icon set), sized by CSS, aria-hidden. */
export function icon(name, cls = '') {
  if (!iconCache.has(name)) {
    const svg = readFileSync(new URL(`${name}.svg`, ICON_DIR), 'utf8')
      .replace(/<svg /, '<svg aria-hidden="true" focusable="false" ')
      .replace(/fill:none;?|class="ionicon"/g, '');
    iconCache.set(name, svg);
  }
  return raw(iconCache.get(name).replace('<svg ', `<svg class="ic ${cls}" `));
}

export const plural = (n, one, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
export const titleCase = s => String(s ?? '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/(^|\s)\S/g, c => c.toUpperCase());
export const truncate = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);
