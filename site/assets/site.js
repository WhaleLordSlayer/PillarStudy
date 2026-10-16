// Progressive enhancements only. Every page works without this file.
(() => {
  const root = document.documentElement;
  const btn = document.querySelector('[data-theme-toggle]');
  if (btn) {
    btn.hidden = false;
    const current = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    btn.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('cv-theme', next); } catch (e) {}
    });
  }
  // Close the mobile menu after choosing a link or pressing Escape.
  const menu = document.querySelector('details.menu');
  if (menu) {
    menu.addEventListener('click', e => { if (e.target.closest('a')) menu.open = false; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') menu.open = false; });
  }
})();
