const state = { study: null, activeCaseId: null, selectedCaseNode: null, selectedFullNode: null };

const $ = (selector) => document.querySelector(selector);
const formatNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));
const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const escapeXml = escapeHtml;
const titleCase = (value) => String(value || '').toLowerCase().replace(/(^|[\s—-])\S/g, (match) => match.toUpperCase());

function refsFor(row, limit = 7) {
  return (row?.formatted_references || row?.references || []).slice(0, limit).join(' · ') || 'Locator recorded on source node';
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2400);
}

function whyIMap(caseData) {
  const copy = {
    'divine-purpose': 'This source explicitly joins divine purpose with restoring American greatness. I mapped it against scripture’s warnings about pride, humility, and claims of favor.',
    'christian-national-identity': 'These proclamations put Christian faith, prayer, and national belonging in the same frame. I mapped that frame against scripture’s treatment of public religious identity.',
    'invasion-outsider': 'The executive order makes invasion the governing frame for its policy. I mapped that language against scripture’s treatment of strangers, neighbors, enemies, and mercy.',
    'anti-christian-bias': 'The order turns a claim about anti-Christian bias into a federal task force. I mapped the move from perceived persecution to power against scripture’s accounts of authority and retaliation.',
    'faith-executive-power': 'The Faith Office makes religious coordination part of the executive branch. I mapped that convergence against scripture’s portraits of religious and political authority.',
  };
  return copy[caseData.id] || caseData.interpretation;
}

function sourceLabel(source) {
  return `${source.source_family.replaceAll('_', ' ')} · ${source.document_type.replaceAll('_', ' ')}`;
}

function renderHeroMetrics(study) {
  const values = [
    [study.cases.length, 'claims'],
    [study.stats.modern_source_layer.primary_sources, 'receipts'],
    [study.stats.study_projection.nodes, 'scripture nodes'],
  ];
  $('#hero-metrics').innerHTML = values.map(([value, label]) => `<span><b>${formatNumber(value)}</b> ${escapeHtml(label)}</span>`).join('');
}

function renderClaimSelector(study) {
  $('#claim-selector').innerHTML = study.cases.map((item) => `<button class="claim-tab" type="button" role="tab" aria-selected="${item.id === state.activeCaseId}" data-case-select="${escapeHtml(item.id)}"><b>${escapeHtml(item.number)}</b><span>${escapeHtml(item.label)}</span></button>`).join('');
}

function renderReceipt(caseData) {
  const source = caseData.primary_sources[0];
  const related = caseData.primary_sources.slice(1);
  $('#receipt-panel').innerHTML = `
    <p class="eyebrow">OFFICIAL PRIMARY SOURCE</p>
    <p class="receipt-issuer">${escapeHtml(sourceLabel(source))}</p>
    <h3>${escapeHtml(source.title)}</h3>
    <p class="receipt-date">${escapeHtml(source.published)} · WHITE HOUSE</p>
    <blockquote>“${escapeHtml(source.excerpt)}”</blockquote>
    <a class="source-button" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">VIEW ORIGINAL ↗</a>
    ${related.length ? `<div class="related-sources"><span>RELATED RECEIPTS</span>${related.map((item) => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)} ↗</a>`).join('')}</div>` : ''}
    <div class="why-block"><p class="eyebrow">WHY I MAPPED THIS</p><p>${escapeHtml(whyIMap(caseData))}</p></div>
  `;
}

function caseGraphNodes(caseData) {
  return caseData.graph.nodes.filter((node) => node.kind !== 'modern-root' && node.kind !== 'modern-branch');
}

function caseGraphLayout(nodes) {
  const positions = new Map();
  const sources = nodes.filter((node) => node.kind === 'modern-source');
  const sourceOffset = (sources.length - 1) * 78;
  sources.forEach((node, index) => positions.set(node.id, { x: 95, y: 295 - sourceOffset / 2 + index * 78 }));
  const concept = nodes.find((node) => node.kind === 'scriptural-question');
  if (concept) positions.set(concept.id, { x: 315, y: 295 });
  const anchors = nodes.filter((node) => node.kind === 'scriptural-anchor');
  anchors.forEach((node, index) => positions.set(node.id, { x: 555 + (index % 3) * 145, y: 82 + Math.floor(index / 3) * 108 }));
  return positions;
}

function shortLabel(value, max = 22) {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function nodeColor(node) {
  if (node.layer === 'MODERN_SOURCE') return '#ed8668';
  if (node.layer === 'SCRIPTURAL_QUESTION') return '#72cfc2';
  if (node.corpus === 'BOM') return '#ac9be5';
  if (node.type === 'GROUP') return '#ed8668';
  return '#e9bd76';
}

function graphNodeSvg(node, position, selected, compact = false) {
  if (!position) return '';
  const color = nodeColor(node);
  const selectedClass = selected ? ' selected' : '';
  const neighborhood = node.is_neighborhood ? ' neighborhood' : '';
  const label = node.layer === 'MODERN_SOURCE' ? shortLabel(node.label, compact ? 18 : 21) : shortLabel(node.label, compact ? 18 : 22);
  let shape;
  if (node.layer === 'MODERN_SOURCE') shape = `<rect x="${position.x - 62}" y="${position.y - 25}" width="124" height="50" rx="8" fill="#2b271e" stroke="${color}" stroke-width="1.8"/>`;
  else if (node.layer === 'SCRIPTURAL_QUESTION') shape = `<circle cx="${position.x}" cy="${position.y}" r="42" fill="#17262b" stroke="${color}" stroke-width="2"/>`;
  else if (node.type === 'PERSON') shape = `<circle cx="${position.x}" cy="${position.y}" r="18" fill="#17262b" stroke="${color}" stroke-width="1.5"/>`;
  else if (node.type === 'GROUP') shape = `<polygon points="${position.x},${position.y - 20} ${position.x + 18},${position.y - 10} ${position.x + 18},${position.y + 10} ${position.x},${position.y + 20} ${position.x - 18},${position.y + 10} ${position.x - 18},${position.y - 10}" fill="#2a2021" stroke="${color}" stroke-width="1.5"/>`;
  else shape = `<polygon points="${position.x},${position.y - 20} ${position.x + 20},${position.y} ${position.x},${position.y + 20} ${position.x - 20},${position.y}" fill="#2b271e" stroke="${color}" stroke-width="1.5"/>`;
  const labelY = node.layer === 'SCRIPTURAL_QUESTION' ? position.y + 57 : position.y + 38;
  const sublabel = node.layer === 'MODERN_SOURCE' ? 'PRIMARY SOURCE' : node.layer === 'SCRIPTURAL_QUESTION' ? 'QUESTION' : node.corpus;
  return `<g class="graph-node${selectedClass}${neighborhood}" data-case-node="${escapeXml(node.id)}" tabindex="0" role="button" aria-label="Inspect ${escapeXml(node.label)}">${shape}<text x="${position.x}" y="${labelY}">${escapeXml(label)}</text><text class="graph-corpus" x="${position.x}" y="${node.layer === 'SCRIPTURAL_QUESTION' ? position.y + 13 : position.y + 47}">${escapeXml(sublabel)}</text><title>${escapeXml(node.label)}</title></g>`;
}

function caseEdgeSvg(edge, positions) {
  const a = positions.get(edge.source); const b = positions.get(edge.target);
  if (!a || !b) return '';
  const kind = edge.layer === 'CANONICAL' ? 'canonical' : edge.layer === 'EDITORIAL_COMPARISON' ? 'comparison' : 'scriptural';
  const label = edge.layer === 'EDITORIAL_COMPARISON' ? 'comparison' : edge.layer === 'SCRIPTURAL_EVIDENCE' ? 'scripture data' : '';
  return `<line class="graph-edge ${kind}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>${label ? `<text class="graph-edge-label" x="${Math.round((a.x + b.x) / 2)}" y="${Math.round((a.y + b.y) / 2) - 4}">${label}</text>` : ''}`;
}

function renderCaseGraph(caseData) {
  const svg = $('#case-graph-svg');
  const nodes = caseGraphNodes(caseData);
  const ids = new Set(nodes.map((node) => node.id));
  const edges = caseData.graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  const positions = caseGraphLayout(nodes);
  svg.innerHTML = `<g>${edges.map((edge) => caseEdgeSvg(edge, positions)).join('')}</g><g>${nodes.map((node) => graphNodeSvg(node, positions.get(node.id), state.selectedCaseNode === node.id)).join('')}</g>`;
  svg.setAttribute('aria-label', `Scripture map for ${caseData.label}`);
  svg.querySelectorAll('[data-case-node]').forEach((node) => {
    node.addEventListener('click', () => selectCaseNode(node.dataset.caseNode));
    node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') selectCaseNode(node.dataset.caseNode); });
  });
}

function scriptureUrl(node) {
  const reference = (node.formatted_references || node.references || [])[0];
  if (!reference) return '';
  const match = reference.match(/^(.+?)\s+(\d+):/);
  if (!match) return 'https://www.churchofjesuschrist.org/study/scriptures?lang=eng';
  const book = match[1].replace('JS—', 'js-').replace(/[—\s]+/g, '-').toLowerCase();
  const corpus = node.corpus === 'BOM' ? 'bofm' : 'nt';
  return `https://www.churchofjesuschrist.org/study/scriptures/${corpus}/${book}?lang=eng`;
}

function caseInspectorDefault() {
  return '<div class="inspector-kicker">SELECT A NODE</div><h3 class="node-detail-name">The graph is ready.</h3><p>Choose the source, the question, or a Scripture node.</p>';
}

function renderTopicInspector(caseData, topic) {
  const links = topic.links.slice(0, 5).map((link) => `<li>${escapeHtml(link.reference)}</li>`).join('');
  $('#map-inspector').innerHTML = `<div class="inspector-kicker">TOPIC BRIDGE</div><h3 class="node-detail-name">${escapeHtml(titleCase(topic.label))}</h3><p>${formatNumber(topic.accepted_link_count)} accepted links.</p><div class="inspector-block"><b>RELEVANT PASSAGES</b><ul class="inspector-list">${links || '<li>See accepted topic links.</li>'}</ul></div><button class="quiet-button" type="button" data-case-question="${escapeHtml(caseData.id)}">BACK TO QUESTION</button>`;
}

function caseInspectorHtml(caseData, node) {
  if (node.layer === 'MODERN_SOURCE') {
    const source = caseData.primary_sources.find((item) => item.id === node.source_id) || caseData.primary_sources[0];
    return `<div class="inspector-kicker">PRIMARY SOURCE FACT</div><h3 class="node-detail-name">${escapeHtml(source.title)}</h3><p class="node-detail-type">${escapeHtml(source.published)} · ${escapeHtml(source.document_type.replaceAll('_', ' '))}</p><div class="inspector-block"><blockquote>“${escapeHtml(source.excerpt)}”</blockquote><a class="source-button" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">VIEW ORIGINAL ↗</a></div>`;
  }
  if (node.layer === 'SCRIPTURAL_QUESTION') {
    return `<div class="inspector-kicker">SCRIPTURAL QUESTION</div><h3 class="node-detail-name">${escapeHtml(caseData.scriptural_question)}</h3><div class="inspector-block"><b>TOPIC BRIDGES</b><div class="inspector-topics">${caseData.topics.map((topic) => `<button type="button" data-case-topic="${escapeHtml(topic.id)}">${escapeHtml(titleCase(topic.label))}<span>${formatNumber(topic.accepted_link_count)}</span></button>`).join('')}</div></div>`;
  }
  const actual = state.study.nodes.find((item) => item.id === node.scripture_node_id && item.corpus === node.corpus);
  if (!actual) return `<div class="inspector-kicker">SCRIPTURE DATA</div><h3 class="node-detail-name">${escapeHtml(node.label)}</h3>`;
  const relationships = caseData.canonical_edges.filter((edge) => edge.source === actual.id || edge.target === actual.id).slice(0, 5);
  const relationshipsHtml = relationships.map((edge) => `<li><b>${escapeHtml(edge.label)}</b><br>${escapeHtml(edge.source === actual.id ? `→ ${edge.target_name}` : `← ${edge.source_name}`)}</li>`).join('');
  return `<div class="inspector-kicker">${escapeHtml(actual.corpus)} · SCRIPTURE DATA</div><h3 class="node-detail-name">${escapeHtml(actual.name)}</h3><p>${escapeHtml(refsFor(actual, 8))}</p><div class="inspector-block"><b>CANONICAL RELATIONSHIPS</b><ul class="inspector-list">${relationshipsHtml || '<li>No selected relationship.</li>'}</ul></div>${scriptureUrl(actual) ? `<a class="source-button" href="${escapeHtml(scriptureUrl(actual))}" target="_blank" rel="noreferrer">OPEN SCRIPTURE ↗</a>` : ''}`;
}

function selectCaseNode(nodeId) {
  const caseData = state.study.cases.find((item) => item.id === state.activeCaseId);
  const node = caseData && caseGraphNodes(caseData).find((item) => item.id === nodeId);
  if (!caseData || !node) return;
  state.selectedCaseNode = nodeId;
  renderCaseGraph(caseData);
  $('#map-inspector').innerHTML = caseInspectorHtml(caseData, node);
}

function selectCaseTopic(topicId) {
  const caseData = state.study.cases.find((item) => item.id === state.activeCaseId);
  const topic = caseData?.topics.find((item) => item.id === topicId);
  if (caseData && topic) renderTopicInspector(caseData, topic);
}

function renderWorkspace(caseData) {
  state.selectedCaseNode = null;
  renderReceipt(caseData);
  $('#map-title').textContent = caseData.label;
  $('#map-inspector').innerHTML = caseInspectorDefault();
  renderCaseGraph(caseData);
}

function selectCase(caseId) {
  const caseData = state.study.cases.find((item) => item.id === caseId);
  if (!caseData) return;
  state.activeCaseId = caseId;
  renderClaimSelector(state.study);
  renderWorkspace(caseData);
}

function renderFullLayout(nodes) {
  const positions = new Map();
  const root = nodes.find((node) => node.kind === 'modern-root');
  if (root) positions.set(root.id, { x: 580, y: 55 });
  const branches = nodes.filter((node) => node.kind === 'modern-branch');
  const branchXs = [110, 345, 580, 815, 1050];
  branches.forEach((node, index) => positions.set(node.id, { x: branchXs[index], y: 150 }));
  branches.forEach((branch, index) => {
    const sources = nodes.filter((node) => node.kind === 'modern-source' && node.branch_id === branch.branch_id);
    const center = branchXs[index];
    sources.forEach((node, sourceIndex) => positions.set(node.id, { x: center + (sourceIndex - (sources.length - 1) / 2) * 62, y: 255 }));
  });
  nodes.filter((node) => node.kind === 'scriptural-question').forEach((node, index) => positions.set(node.id, { x: branchXs[index], y: 380 }));
  nodes.filter((node) => node.kind === 'scriptural-anchor').forEach((node, index) => positions.set(node.id, { x: 100 + (index % 6) * 190, y: 535 + Math.floor(index / 6) * 85 }));
  return positions;
}

function renderFullMap() {
  const network = state.study.comparison_network;
  const positions = renderFullLayout(network.nodes);
  const svg = $('#network-svg');
  svg.innerHTML = `<g>${network.edges.map((edge) => caseEdgeSvg(edge, positions)).join('')}</g><g>${network.nodes.map((node) => graphNodeSvg(node, positions.get(node.id), state.selectedFullNode === node.id, true).replace('data-case-node', 'data-full-node')).join('')}</g>`;
  $('#network-edge-count').textContent = `${formatNumber(network.edges.length)} relationships · ${formatNumber(state.study.stats.modern_source_layer.canonical_anchor_edges)} canonical`;
  svg.querySelectorAll('[data-full-node]').forEach((node) => {
    node.addEventListener('click', () => selectFullNode(node.dataset.fullNode));
    node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') selectFullNode(node.dataset.fullNode); });
  });
}

function selectFullNode(nodeId) {
  state.selectedFullNode = nodeId;
  renderFullMap();
  const node = state.study.comparison_network.nodes.find((item) => item.id === nodeId);
  if (!node) return;
  const caseData = state.study.cases.find((item) => item.id === node.branch_id);
  const source = node.source_id ? state.study.modern_sources.find((item) => item.id === node.source_id) : null;
  if (source) $('#network-inspector').innerHTML = `<div class="inspector-kicker">PRIMARY SOURCE FACT</div><h3 class="node-detail-name">${escapeHtml(source.title)}</h3><p>${escapeHtml(source.published)}</p><div class="inspector-block"><blockquote>“${escapeHtml(source.excerpt)}”</blockquote><a class="source-button" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">VIEW ORIGINAL ↗</a></div>`;
  else if (caseData) $('#network-inspector').innerHTML = `<div class="inspector-kicker">CLAIM BRANCH</div><h3 class="node-detail-name">${escapeHtml(caseData.label)}</h3><p>${escapeHtml(caseData.scriptural_question)}</p><a class="source-button" href="#case-${escapeHtml(caseData.id)}" data-case-select="${escapeHtml(caseData.id)}">OPEN THIS CLAIM ↗</a>`;
  else $('#network-inspector').innerHTML = `<div class="inspector-kicker">SCRIPTURE MAP</div><h3 class="node-detail-name">${escapeHtml(node.label)}</h3><p>${escapeHtml(node.formatted_references?.join(' · ') || node.question || '')}</p>`;
}

function renderHowWorks(study) {
  const validation = study.validation;
  const p = study.provenance;
  const manifests = [p.bible_graph, p.book_of_mormon_graph, p.topical_guide.base_export, p.topical_guide.accepted_provenance_manifest, p.topical_guide.source_attested_relationships, p.topical_guide.current_supplemental_layer_manifest];
  $('#method-modal-body').innerHTML = `<p class="modal-note">${escapeHtml(p.method.note)} ${escapeHtml(p.method.modern_layer_note)}</p><div class="method-list"><p><b>Primary sources</b> stay separate from Scripture data.</p><p><b>Modern-to-scripture links</b> are editorial comparisons.</p><p><b>Canonical edges</b> come from accepted Cultivate graph data.</p><p><b>Ancient groups</b> are not asserted to be identical to modern groups.</p><p><b>Validation</b>: ${formatNumber(validation.nodes_used)} nodes, ${formatNumber(validation.edges_used)} edges, ${formatNumber(validation.scripture_references_used)} references, ${validation.broken_or_unresolved_references.length} broken references.</p></div><div class="drawer-section"><h3>Historical caveat</h3>${study.historical_caution.map((item) => `<p>${escapeHtml(item)}</p>`).join('')}</div><div class="drawer-section"><h3>Source hashes / provenance</h3>${manifests.map((source) => `<div class="modal-source"><b>${escapeHtml(source.path.split('/').slice(-1)[0])}</b><span>${escapeHtml(source.path)}</span><code>${escapeHtml(source.sha256)}</code></div>`).join('')}</div>`;
}

function openModal() { const dialog = $('#method-modal'); if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); }
function closeModal() { const dialog = $('#method-modal'); if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); }

function bindEvents() {
  document.addEventListener('click', (event) => {
    const select = event.target.closest('[data-case-select]');
    if (select) { selectCase(select.dataset.caseSelect); if (select.tagName === 'A') event.preventDefault(); return; }
    const topic = event.target.closest('[data-case-topic]');
    if (topic) { selectCaseTopic(topic.dataset.caseTopic); return; }
    const question = event.target.closest('[data-case-question]');
    if (question) { const caseData = state.study.cases.find((item) => item.id === state.activeCaseId); const node = caseData?.graph.nodes.find((item) => item.kind === 'scriptural-question'); if (node) selectCaseNode(node.id); return; }
    if (event.target.closest('[data-open-method]')) { renderHowWorks(state.study); openModal(); return; }
    if (event.target.closest('[data-close-modal]')) { closeModal(); return; }
  });
  $('#method-modal').addEventListener('click', (event) => { if (event.target === event.currentTarget) closeModal(); });
}

async function boot() {
  try {
    const response = await fetch('data/study.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`study.json returned ${response.status}`);
    state.study = await response.json();
    state.activeCaseId = state.study.cases[0].id;
    renderHeroMetrics(state.study);
    renderClaimSelector(state.study);
    renderWorkspace(state.study.cases[0]);
    renderFullMap();
    bindEvents();
  } catch (error) {
    console.error(error);
    document.body.innerHTML = `<main style="padding:40px;font-family:system-ui"><h1>Study data unavailable</h1><p>${escapeHtml(error.message)}</p></main>`;
  }
}

boot();
