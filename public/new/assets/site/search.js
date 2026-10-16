// Explorer search: loads the small published search index once and filters
// it in the browser. The index is built from the same release as the pages.
(() => {
  const KIND = { person: 'Person', place: 'Place', event: 'Event', group: 'Group' };
  let index;
  const load = () => (index ??= fetch('/new/explorer/search-index.json').then(r => r.json()).then(d => d.items));
  const norm = s => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function score(item, q) {
    const n = norm(item.n);
    if (n === q) return 100;
    if (n.startsWith(q)) return 80;
    if (n.split(/[^a-z0-9]+/).some(w => w.startsWith(q))) return 60;
    if (item.a.some(a => norm(a).startsWith(q))) return 50;
    if (n.includes(q)) return 30;
    return 0;
  }
  async function find(q, limit = 8) {
    q = norm(q.trim());
    if (!q) return [];
    const items = await load();
    return items.map(i => [score(i, q) + Math.min(10, Math.log2(1 + i.m)), i]).filter(([s]) => s >= 30).sort((a, b) => b[0] - a[0]).slice(0, limit).map(([, i]) => i);
  }
  const row = i => `<a class="result k-${i.k}" role="option" href="${esc(i.u)}">${i.i ? `<img class="avatar" src="${esc(i.i)}" alt="" width="36" height="36" style="--size:36px">` : `<span class="mark" style="--size:36px" aria-hidden="true"></span>`}<span><strong>${esc(i.n)}</strong><small>${KIND[i.k]}${i.s && i.s !== KIND[i.k] ? ` · ${esc(i.s)}` : ''}</small></span></a>`;

  for (const form of document.querySelectorAll('[data-search]')) {
    const input = form.querySelector('input');
    const box = form.querySelector('.search-results');
    let sel = -1, last = [];
    const render = list => {
      last = list; sel = -1;
      box.innerHTML = list.length ? list.map(row).join('') : (input.value.trim() ? '<p class="note" style="padding:10px 12px">No matches. Try a shorter name.</p>' : '');
      box.classList.toggle('open', !!input.value.trim());
      input.setAttribute('aria-expanded', box.classList.contains('open'));
    };
    input.addEventListener('focus', load, { once: true });
    input.addEventListener('input', async () => render(await find(input.value)));
    input.addEventListener('keydown', e => {
      const opts = [...box.querySelectorAll('.result')];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        sel = Math.max(0, Math.min(opts.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1)));
        opts.forEach((o, i) => o.setAttribute('aria-selected', i === sel));
      } else if (e.key === 'Enter' && sel >= 0 && opts[sel]) { e.preventDefault(); location.href = opts[sel].href; }
      else if (e.key === 'Escape') { box.classList.remove('open'); }
    });
    document.addEventListener('click', e => { if (!form.contains(e.target)) box.classList.remove('open'); });
    form.addEventListener('submit', async e => {
      const list = await find(input.value, 1);
      const pageResults = document.getElementById('search-page-results');
      if (!pageResults && list[0] && norm(list[0].n) === norm(input.value.trim())) { e.preventDefault(); location.href = list[0].u; }
    });
  }

  // Full results on /explorer/search/?q=
  const pageResults = document.getElementById('search-page-results');
  if (pageResults) {
    const input = document.querySelector('#page-search');
    const q = new URLSearchParams(location.search).get('q') || '';
    input.value = q;
    const show = async v => {
      const list = await find(v, 50);
      pageResults.hidden = !v.trim();
      pageResults.querySelector('ul').innerHTML = list.length ? list.map(i => `<li>${row(i).replace('class="result', 'class="row result')}</li>`).join('') : `<li class="note" style="padding:14px">No matches for “${esc(v)}”.</li>`;
    };
    show(q);
    input.addEventListener('input', () => show(input.value));
  }
})();
