const paths = {
  lessons: ['Shared Lessons', 'One lesson.<br>Everyone invited.', 'Bring family or classmates into a shared lesson with a link or code. Follow along live, read at your own pace, and return to the lesson after the session.', 'Explore Shared lessons'],
  groups: ['Study Spaces', 'A shared direction.<br>A little encouragement.', 'Choose a reading plan with family, friends, or your class. See collective progress and share selected thoughts, with their scripture references close by.', 'Explore Study groups'],
  explorer: ['Scripture Explorer', 'Follow a name.<br>Find a whole story.', 'Discover source-backed connections between people, places, events, and scripture. Explore the packaged data offline, with no AI-generated commentary in the app.', 'Explore Scripture Explorer'],
  reader: ['Chapter & Scroller', 'Make a little space<br>for the text.', 'Read the whole chapter or focus on one verse at a time. Keep notes, highlights, and related scripture within reach as you read.', 'Explore the Reader'],
  'topical-guide': ['Topical Guide', 'A question can open<br>another way in.', 'Begin with a topic, open its scripture references, and follow related passages across the standard works. Keep the text at the heart of your discovery.', 'Explore Topical Guide'],
};
const tabs = [...document.querySelectorAll('[data-path]')];
function select(tab, focus = false) {
  const key = tab.dataset.path;
  const [label, title, copy, link] = paths[key];
  tabs.forEach(item => { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; });
  document.querySelector('#path-panel').setAttribute('aria-labelledby', tab.id);
  document.querySelector('.wayfinder').dataset.selected = key;
  document.querySelector('[data-path-label]').textContent = label;
  document.querySelector('[data-path-title]').innerHTML = title;
  document.querySelector('[data-path-copy]').textContent = copy;
  const anchor = document.querySelector('[data-path-link]');
  anchor.href = `./${key}/`;
  anchor.innerHTML = `${link} <span aria-hidden="true">↗</span>`;
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => select(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); select(tabs[next], true); }
  });
});
