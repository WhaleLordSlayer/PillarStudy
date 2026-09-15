const state = { study: null, corpus: 'ALL', nodeId: null, caseNodes: {} };

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

const escapeXml = escapeHtml;
const formatNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));
const titleCase = (value) => String(value || '').toLowerCase().replace(/(^|[\s—-])\S/g, (match) => match.toUpperCase());
const corpusLabel = (corpus) => corpus === 'NT' ? 'New Testament' : corpus === 'BOM' ? 'Book of Mormon' : 'Combined corpora';

function refsFor(row, limit = 7) {
  const refs = row?.formatted_references || row?.references || [];
  return refs.slice(0, limit).join(' · ') || 'Locator recorded on source node';
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function updateTopStats(study) {
  const projection = study.stats.study_projection;
  const modern = study.stats.modern_source_layer;
  const values = [study.cases.length, modern.primary_sources, projection.nodes, modern.canonical_anchor_edges];
  document.querySelectorAll('#top-stats .stat-item strong').forEach((element, index) => { element.textContent = formatNumber(values[index]); });
}

function renderCaseNav(study) {
  $('#case-nav').innerHTML = study.cases.map((item) => `<a class="case-nav-link" href="#case-${escapeHtml(item.id)}"><b>${escapeHtml(item.number)}</b><span>${escapeHtml(item.label)}</span></a>`).join('');
}

function caseNodeLabel(node) {
  if (node.type === 'MODERN_SOURCE') return [shortLabel(node.label, 18)];
  if (node.type === 'SCRIPTURAL_CONCEPT') return [shortLabel(node.label, 20)];
  return [shortLabel(node.label, node.type === 'EVENT' ? 19 : 17)];
}

function caseGraphLayout(nodes) {
  const positions = new Map();
  const root = nodes.find((node) => node.kind === 'modern-root');
  if (root) positions.set(root.id, { x: 70, y: 176 });
  const branch = nodes.find((node) => node.kind === 'modern-branch');
  if (branch) positions.set(branch.id, { x: 205, y: 176 });
  const sources = nodes.filter((node) => node.kind === 'modern-source');
  sources.forEach((node, index) => positions.set(node.id, { x: 330, y: 105 + index * 66 }));
  const concept = nodes.find((node) => node.kind === 'scriptural-question');
  if (concept) positions.set(concept.id, { x: 485, y: 176 });
  const anchors = nodes.filter((node) => node.kind === 'scriptural-anchor');
  anchors.forEach((node, index) => positions.set(node.id, { x: 655 + (index % 2) * 132, y: 86 + Math.floor(index / 2) * 74 }));
  return positions;
}

function compactCaseLabel(node) {
  return node.type === 'MODERN_ROOT' ? ['TRUMP / MAGA'] : caseNodeLabel(node);
}

function caseNodeSvg(node, position, selected) {
  const color = nodeColor(node);
  const selectedClass = selected ? ' selected' : '';
  const labels = compactCaseLabel(node);
  let shape;
  if (node.type === 'MODERN_ROOT') shape = `<circle cx="${position.x}" cy="${position.y}" r="38" fill="#10171f" stroke="${color}" stroke-width="2"/>`;
  else if (node.type === 'MODERN_BRANCH') shape = `<rect x="${position.x - 55}" y="${position.y - 20}" width="110" height="40" rx="7" fill="#2a2021" stroke="${color}" stroke-width="1.5"/>`;
  else if (node.type === 'MODERN_SOURCE') shape = `<rect x="${position.x - 56}" y="${position.y - 21}" width="112" height="42" rx="7" fill="#2b271e" stroke="${color}" stroke-width="1.5"/>`;
  else if (node.type === 'SCRIPTURAL_CONCEPT') shape = `<circle cx="${position.x}" cy="${position.y}" r="31" fill="#17262b" stroke="${color}" stroke-width="1.8"/>`;
  else if (node.type === 'GROUP') shape = `<polygon points="${position.x},${position.y - 18} ${position.x + 16},${position.y - 9} ${position.x + 16},${position.y + 9} ${position.x},${position.y + 18} ${position.x - 16},${position.y + 9} ${position.x - 16},${position.y - 9}" fill="#2a2021" stroke="${color}" stroke-width="1.5"/>`;
  else shape = `<polygon points="${position.x},${position.y - 18} ${position.x + 18},${position.y} ${position.x},${position.y + 18} ${position.x - 18},${position.y}" fill="#2b271e" stroke="${color}" stroke-width="1.5"/>`;
  const labelStart = node.type === 'MODERN_ROOT' ? position.y - 4 : position.y + 31;
  const text = labels.map((label, index) => `<tspan x="${position.x}" dy="${index === 0 ? 0 : 10}">${escapeXml(label)}</tspan>`).join('');
  const layer = node.layer === 'MODERN_SOURCE' ? ' modern' : node.layer === 'SCRIPTURAL_QUESTION' ? ' concept' : ' scripture';
  return `<g class="graph-node case-graph-node${layer}${selectedClass}" data-case-node="${escapeXml(node.id)}" tabindex="0" role="button" aria-label="Inspect ${escapeXml(node.label)}">${shape}<text x="${position.x}" y="${labelStart}">${text}</text><text class="graph-corpus" x="${position.x}" y="${node.type === 'MODERN_ROOT' ? position.y + 16 : position.y + 42}">${escapeXml(node.layer === 'MODERN_SOURCE' ? 'PRIMARY SOURCE' : node.layer === 'SCRIPTURAL_QUESTION' ? 'QUESTION' : node.corpus)}</text><title>${escapeXml(node.label)} · ${escapeXml(node.type)}</title></g>`;
}

function renderCaseGraph(caseData) {
  const svg = $(`#case-svg-${caseData.id}`);
  if (!svg) return;
  const positions = caseGraphLayout(caseData.graph.nodes);
  const selected = state.caseNodes[caseData.id];
  const lines = caseData.graph.edges.map((edge) => {
    const a = positions.get(edge.source); const b = positions.get(edge.target);
    if (!a || !b) return '';
    const edgeClass = edge.layer === 'CANONICAL' ? ' canonical' : edge.layer === 'EDITORIAL_COMPARISON' ? ' comparison' : edge.layer === 'SCRIPTURAL_EVIDENCE' ? ' scriptural' : ' modern-edge';
    return `<line class="graph-edge${edgeClass}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/><text class="graph-edge-label" x="${Math.round((a.x + b.x) / 2)}" y="${Math.round((a.y + b.y) / 2) - 4}">${escapeXml(shortLabel(edge.label, 16))}</text>`;
  }).join('');
  svg.innerHTML = `<g>${lines}</g><g>${caseData.graph.nodes.map((node) => caseNodeSvg(node, positions.get(node.id), selected === node.id)).join('')}</g>`;
  svg.querySelectorAll('[data-case-node]').forEach((node) => {
    node.addEventListener('click', () => selectCaseNode(caseData.id, node.dataset.caseNode));
    node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') selectCaseNode(caseData.id, node.dataset.caseNode); });
  });
}

function caseInspectorDefault(caseData) {
  return `<div class="inspector-kicker">FOLLOW A CONNECTION</div><h3 class="node-detail-name">Run this case’s graph.</h3><p>Start with the receipt, then select a question or Scripture node.</p><div class="inspector-tip"><span>↘</span>${escapeHtml(caseData.interpretation)}</div>`;
}

function caseInspectorHtml(caseData, node) {
  const actual = node.scripture_node_id ? state.study.nodes.find((item) => item.id === node.scripture_node_id && item.corpus === node.corpus) : null;
  if (node.kind === 'modern-source') {
    const source = caseData.primary_sources.find((item) => item.id === node.source_id);
    return `<div class="inspector-kicker">PRIMARY SOURCE FACT</div><h3 class="node-detail-name">${escapeHtml(source.title)}</h3><p class="node-detail-type">${escapeHtml(source.published)} · ${escapeHtml(source.document_type.replaceAll('_', ' '))}</p><div class="inspector-block"><b>RECEIPT</b><blockquote>“${escapeHtml(source.excerpt)}”</blockquote><a class="source-button" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">VIEW ORIGINAL ↗</a></div><div class="inspector-block"><b>WHAT THIS ESTABLISHES</b><p>${escapeHtml(caseData.what_this_establishes)}</p></div>`;
  }
  if (node.kind === 'scriptural-question') return `<div class="inspector-kicker">SCRIPTURAL QUESTION</div><h3 class="node-detail-name">${escapeHtml(node.label)}</h3><div class="inspector-block"><b>QUESTION</b><p>${escapeHtml(caseData.scriptural_question)}</p></div><div class="inspector-block"><b>INTERPRETATION</b><p>${escapeHtml(caseData.interpretation)}</p></div>`;
  if (node.kind === 'scriptural-anchor' && actual) {
    const edges = caseData.canonical_edges.filter((edge) => edge.source === actual.id || edge.target === actual.id).slice(0, 6);
    return `<div class="inspector-kicker">${escapeHtml(actual.corpus)} · SCRIPTURE DATA</div><h3 class="node-detail-name">${escapeHtml(actual.name)}</h3><p>${escapeHtml(refsFor(actual, 8))}</p><div class="inspector-block"><b>CANONICAL NEIGHBORHOOD</b><div class="node-detail-list">${edges.map((edge) => `<div class="node-detail-item"><b>${escapeHtml(edge.label)}</b><span>${escapeHtml(edge.source === actual.id ? `→ ${edge.target_name}` : `← ${edge.source_name}`)}</span><small>${escapeHtml(edge.formatted_references.join(' · ') || 'No edge locator')}</small></div>`).join('') || '<div class="node-detail-item"><span>No selected canonical edge.</span></div>'}</div></div>`;
  }
  return `<div class="inspector-kicker">SCRIPTURE DATA</div><h3 class="node-detail-name">${escapeHtml(node.label)}</h3><p>${escapeHtml(node.formatted_references?.join(' · ') || 'This node is represented through the selected graph neighborhood.')}</p>`;
}

function selectCaseNode(caseId, nodeId) {
  const caseData = state.study.cases.find((item) => item.id === caseId);
  const node = caseData?.graph.nodes.find((item) => item.id === nodeId);
  if (!caseData || !node) return;
  state.caseNodes[caseId] = nodeId;
  renderCaseGraph(caseData);
  $(`#case-inspector-${caseId}`).innerHTML = caseInspectorHtml(caseData, node);
}

function selectCaseTopic(caseId, topicId) {
  const caseData = state.study.cases.find((item) => item.id === caseId);
  const topic = caseData?.topics.find((item) => item.id === topicId);
  if (!caseData || !topic) return;
  const concept = caseData.graph.nodes.find((item) => item.kind === 'scriptural-question');
  if (concept) state.caseNodes[caseId] = concept.id;
  renderCaseGraph(caseData);
  $(`#case-inspector-${caseId}`).innerHTML = `<div class="inspector-kicker">GUIDE BRIDGE NODE</div><h3 class="node-detail-name">${escapeHtml(titleCase(topic.label))}</h3><p>${formatNumber(topic.accepted_link_count)} accepted source-attested links in the Guide.</p><div class="inspector-block"><b>WHY IT IS HERE</b><p>This topic is a bridge into the accepted Scripture layer for this claim; it is not a modern-source claim and it is not a canonical edge by itself.</p></div><div class="inspector-block"><b>QUESTION</b><p>${escapeHtml(caseData.scriptural_question)}</p></div>`;
}

function renderCases(study) {
  $('#case-list').innerHTML = study.cases.map((item) => `
    <article class="case-chapter" id="case-${escapeHtml(item.id)}">
      <div class="case-header"><span class="case-number">${escapeHtml(item.number)}</span><div><p class="case-label">${escapeHtml(item.label)}</p><h3>${escapeHtml(item.claim)}</h3></div></div>
      <div class="case-receipt-grid">
        <div class="case-section-marker"><span>01</span><b>THE RECEIPT</b></div>
        <div class="receipt-stack">${item.primary_sources.map((source) => `<article class="receipt-card"><div class="receipt-top"><span>${escapeHtml(source.source_family.replaceAll('_', ' '))} · ${escapeHtml(source.document_type.replaceAll('_', ' '))}</span><span>${escapeHtml(source.published)}</span></div><h4>${escapeHtml(source.title)}</h4><p class="receipt-issuer">WHITE HOUSE · TRUMP ADMINISTRATION</p><blockquote>“${escapeHtml(source.excerpt)}”</blockquote><div class="receipt-bottom"><span>${escapeHtml(source.fact)}</span><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">VIEW ORIGINAL ↗</a></div></article>`).join('')}</div>
      </div>
      <div class="case-fact-grid"><div class="case-section-marker"><span>02</span><b>WHAT THIS ACTUALLY ESTABLISHES</b></div><p>${escapeHtml(item.what_this_establishes)}</p></div>
      <div class="case-question-grid"><div class="case-section-marker"><span>03</span><b>THE SCRIPTURAL QUESTION</b></div><div><p class="case-question">${escapeHtml(item.scriptural_question)}</p><div class="question-chips">${item.scriptural_questions.map((question) => `<span>${escapeHtml(question)}</span>`).join('')}</div></div></div>
      <div class="case-run"><div class="case-run-heading"><div><p class="eyebrow">04 · RUN THE GRAPH</p><h4>Follow the connection.</h4></div><span>${formatNumber(item.canonical_edges.length)} canonical edges in this neighborhood</span></div><div class="case-graph-workspace"><div class="case-graph-canvas"><svg id="case-svg-${escapeHtml(item.id)}" viewBox="0 0 860 340" role="img" aria-label="Graph for ${escapeHtml(item.label)}"></svg></div><aside class="case-inspector" id="case-inspector-${escapeHtml(item.id)}">${caseInspectorDefault(item)}</aside></div></div>
      <div class="case-follow-grid"><div class="case-section-marker"><span>05</span><b>FOLLOW A CONNECTION</b></div><div><p class="small-note">Organic bridge nodes from the accepted Guide and the selected canonical events.</p><div class="case-topic-row">${item.topics.map((topic) => `<button type="button" data-case-topic="${escapeHtml(item.id)}" data-topic-id="${escapeHtml(topic.id)}">${escapeHtml(titleCase(topic.label))}<span>${formatNumber(topic.accepted_link_count)} links</span></button>`).join('')}</div><div class="case-evidence-row">${item.passages.map((passage) => `<button type="button" data-case-evidence="${escapeHtml(item.id)}" data-select-node="scripture:${escapeHtml(passage.corpus)}:${escapeHtml(passage.node_id)}"><span class="corpus-tag ${passage.corpus === 'NT' ? 'nt' : 'bom'}">${passage.corpus}</span>${escapeHtml(passage.label)}<small>${escapeHtml(refsFor(passage, 2))}</small></button>`).join('')}</div></div></div>
      <details class="case-complicates"><summary>WHAT COMPLICATES THIS?</summary><div>${item.counter_evidence.map((entry) => `<div class="complication"><b>${escapeHtml(entry.label)}</b><p>${escapeHtml(entry.text)}</p><small>${escapeHtml(entry.evidence.label)} · ${escapeHtml(refsFor(entry.evidence, 3))}</small></div>`).join('')}</div></details>
    </article>`).join('');
  study.cases.forEach(renderCaseGraph);
}

function shortLabel(label, max = 21) { const text = String(label || ''); return text.length > max ? `${text.slice(0, max - 1)}…` : text; }
function nodeColor(node) {
  if (node.layer === 'MODERN_SOURCE') return node.type === 'MODERN_ROOT' ? '#ed8668' : node.type === 'MODERN_BRANCH' ? '#e9bd76' : '#f2eee5';
  if (node.layer === 'SCRIPTURAL_QUESTION') return '#72cfc2';
  if (node.layer === 'SCRIPTURE') return node.corpus === 'BOM' ? '#ac9be5' : '#72cfc2';
  if (node.type === 'PERSON') return '#72cfc2';
  if (node.type === 'GROUP') return '#ed8668';
  return '#e9bd76';
}

function comparisonGraphLayout(nodes) {
  const positions = new Map();
  const root = nodes.find((node) => node.kind === 'modern-root');
  if (root) positions.set(root.id, { x: 580, y: 58 });
  const branches = nodes.filter((node) => node.kind === 'modern-branch');
  const branchXs = [110, 345, 580, 815, 1050];
  branches.forEach((node, index) => positions.set(node.id, { x: branchXs[index] || 580, y: 157 }));
  branches.forEach((branch, index) => {
    const sources = nodes.filter((node) => node.kind === 'modern-source' && node.branch_id === branch.branch_id);
    const center = branchXs[index] || 580;
    const offset = (sources.length - 1) * 66;
    sources.forEach((node, sourceIndex) => positions.set(node.id, { x: center - offset / 2 + sourceIndex * 66, y: 270 }));
  });
  const concepts = nodes.filter((node) => node.kind === 'scriptural-question');
  concepts.forEach((node, index) => positions.set(node.id, { x: branchXs[index] || 580, y: 397 }));
  const anchors = nodes.filter((node) => node.kind === 'scriptural-anchor');
  anchors.forEach((node, index) => positions.set(node.id, { x: 105 + (index % 6) * 190, y: 548 + Math.floor(index / 6) * 90 }));
  return positions;
}

function nodeSvg(node, position) {
  const color = nodeColor(node); const selected = state.nodeId === node.id ? ' selected' : '';
  const labels = node.type === 'MODERN_ROOT' ? ['TRUMP / MAGA', 'CLAIMS'] : [shortLabel(node.label, node.type === 'EVENT' ? 18 : 21)];
  let shape;
  if (node.type === 'MODERN_ROOT') shape = `<circle cx="${position.x}" cy="${position.y}" r="52" fill="#10171f" stroke="${color}" stroke-width="2.2"/>`;
  else if (node.type === 'MODERN_BRANCH') shape = `<rect x="${position.x - 83}" y="${position.y - 20}" width="166" height="40" rx="8" fill="#2a2021" stroke="${color}" stroke-width="1.6"/>`;
  else if (node.type === 'MODERN_SOURCE') shape = `<rect x="${position.x - 60}" y="${position.y - 22}" width="120" height="44" rx="7" fill="#2b271e" stroke="${color}" stroke-width="1.5"/>`;
  else if (node.type === 'SCRIPTURAL_CONCEPT') shape = `<circle cx="${position.x}" cy="${position.y}" r="33" fill="#17262b" stroke="${color}" stroke-width="1.8"/>`;
  else if (node.type === 'PERSON') shape = `<circle cx="${position.x}" cy="${position.y}" r="17" fill="#17262b" stroke="${color}" stroke-width="1.5"/>`;
  else if (node.type === 'GROUP') shape = `<polygon points="${position.x},${position.y - 19} ${position.x + 17},${position.y - 9} ${position.x + 17},${position.y + 9} ${position.x},${position.y + 19} ${position.x - 17},${position.y + 9} ${position.x - 17},${position.y - 9}" fill="#2a2021" stroke="${color}" stroke-width="1.5"/>`;
  else shape = `<polygon points="${position.x},${position.y - 19} ${position.x + 19},${position.y} ${position.x},${position.y + 19} ${position.x - 19},${position.y}" fill="#2b271e" stroke="${color}" stroke-width="1.5"/>`;
  const labelStart = node.type === 'MODERN_ROOT' ? position.y - 4 : position.y + 33;
  const text = labels.map((label, index) => `<tspan x="${position.x}" dy="${index === 0 ? 0 : 11}">${escapeXml(label)}</tspan>`).join('');
  const layer = node.layer === 'MODERN_SOURCE' ? ' modern' : node.layer === 'SCRIPTURAL_QUESTION' ? ' concept' : node.layer === 'SCRIPTURE' ? ' scripture' : '';
  return `<g class="graph-node${layer}${selected}" data-node-id="${escapeXml(node.id)}" tabindex="0" role="button" aria-label="Inspect ${escapeXml(node.label)}">${shape}<text x="${position.x}" y="${labelStart}">${text}</text><text class="graph-corpus" x="${position.x}" y="${node.type === 'MODERN_ROOT' ? position.y + 19 : position.y + 44}">${escapeXml(node.layer === 'MODERN_SOURCE' ? 'PRIMARY SOURCE' : node.layer === 'SCRIPTURAL_QUESTION' ? 'SCRIPTURAL QUESTION' : node.corpus)}</text><title>${escapeXml(node.label)} · ${escapeXml(node.type)}</title></g>`;
}

function renderNetwork(study) {
  const svg = $('#network-svg');
  const network = study.comparison_network;
  const visibleNodes = network.nodes.filter((node) => node.layer !== 'SCRIPTURE' || state.corpus === 'ALL' || node.corpus === state.corpus);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = network.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  const positions = comparisonGraphLayout(visibleNodes);
  const selectedEdges = new Set(visibleEdges.filter((edge) => state.nodeId && (edge.source === state.nodeId || edge.target === state.nodeId)).map((edge) => edge.id));
  const lines = visibleEdges.map((edge) => { const a = positions.get(edge.source); const b = positions.get(edge.target); if (!a || !b) return ''; const dim = state.nodeId && !selectedEdges.has(edge.id) ? ' dim' : ''; const edgeClass = edge.layer === 'EDITORIAL_COMPARISON' ? ' comparison' : edge.layer === 'SCRIPTURAL_EVIDENCE' ? ' scriptural' : edge.layer === 'MODERN_SOURCE' ? ' modern-edge' : edge.layer === 'CANONICAL' ? ' canonical' : ''; return `<line class="graph-edge${edge.corpus === 'BOM' ? ' bom' : ''}${edgeClass}${dim}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/><text class="graph-edge-label" x="${Math.round((a.x + b.x) / 2)}" y="${Math.round((a.y + b.y) / 2) - 3}">${escapeXml(shortLabel(edge.label, 19))}</text>`; }).join('');
  svg.innerHTML = `<g>${lines}</g><g>${visibleNodes.map((node) => nodeSvg(node, positions.get(node.id))).join('')}</g>`;
  $('#network-filter-label').textContent = state.corpus === 'ALL' ? 'COMBINED · MODERN + SCRIPTURE' : `${corpusLabel(state.corpus).toUpperCase()} · MODERN + SCRIPTURE`;
  $('#network-edge-count').textContent = `${formatNumber(visibleEdges.filter((edge) => edge.layer === 'MODERN_SOURCE').length)} source · ${formatNumber(visibleEdges.filter((edge) => edge.layer === 'EDITORIAL_COMPARISON' || edge.layer === 'SCRIPTURAL_EVIDENCE').length)} interpretive · ${formatNumber(visibleEdges.filter((edge) => edge.layer === 'CANONICAL').length)} canonical`;
  svg.querySelectorAll('[data-node-id]').forEach((node) => { node.addEventListener('click', () => selectNode(node.dataset.nodeId)); node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') selectNode(node.dataset.nodeId); }); });
}

function selectNode(nodeId) {
  state.nodeId = nodeId; renderNetwork(state.study);
  const network = state.study.comparison_network; const node = network.nodes.find((item) => item.id === nodeId); if (!node) return;
  const actualNode = node.scripture_node_id ? state.study.nodes.find((item) => item.id === node.scripture_node_id && item.corpus === node.corpus) : null;
  const canonicalEdgeIds = new Set(node.canonical_edge_ids || []);
  const canonicalEdges = state.study.edges.filter((edge) => canonicalEdgeIds.has(edge.id) || (actualNode && (edge.source === actualNode.id || edge.target === actualNode.id)));
  const source = node.source_id ? state.study.modern_sources.find((item) => item.id === node.source_id) : null;
  const branch = (source && state.study.modern_branches.find((item) => item.id === source.branch_id)) || (node.branch_id && state.study.modern_branches.find((item) => item.id === node.branch_id));
  const inspector = $('#network-inspector');
  if (source && branch) { inspector.innerHTML = `<div class="inspector-kicker">PRIMARY SOURCE FACT</div><h3 class="node-detail-name">${escapeHtml(source.title)}</h3><p class="node-detail-type">${escapeHtml(source.published)} · ${escapeHtml(source.document_type.replaceAll('_', ' '))}</p><div class="inspector-block"><b>RECEIPT</b><p>${escapeHtml(source.fact)}</p><blockquote>“${escapeHtml(source.excerpt)}”</blockquote><a class="source-button" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">VIEW OFFICIAL SOURCE ↗</a></div><div class="inspector-block"><b>THE COMPARISON</b><p>${escapeHtml(branch.comparison)}</p></div>`; return; }
  if (node.kind === 'modern-root' || node.kind === 'modern-branch' || node.kind === 'scriptural-question') { const isRoot = node.kind === 'modern-root'; inspector.innerHTML = `<div class="inspector-kicker">${escapeHtml(isRoot ? 'SOURCE SPINE' : node.kind === 'modern-branch' ? 'CLAIM CHAPTER' : 'SCRIPTURAL QUESTION')}</div><h3 class="node-detail-name">${escapeHtml(node.label)}</h3><div class="inspector-block"><b>${isRoot ? 'WHAT THIS MAP DOES' : 'QUESTION'}</b><p>${escapeHtml(isRoot ? state.study.scope_note : node.question || branch?.question || '')}</p></div><div class="inspector-block"><b>INTERPRETATION</b><p>${escapeHtml(branch?.comparison || 'Select a source or Scripture node to inspect the relationship.')}</p></div>`; return; }
  if (node.kind === 'scriptural-anchor' && actualNode) { const related = state.study.cases.filter((item) => item.passages.some((entry) => entry.node_id === actualNode.id && entry.corpus === actualNode.corpus)); const edgeRows = canonicalEdges.slice(0, 8).map((edge) => `<div class="node-detail-item"><b>${escapeHtml(edge.label)}</b><span>${escapeHtml(edge.source === actualNode.id ? `→ ${edge.target_name}` : `← ${edge.source_name}`)}</span><small>${escapeHtml(edge.formatted_references.join(' · ') || 'No edge locator')}</small></div>`).join(''); inspector.innerHTML = `<div class="inspector-kicker">${escapeHtml(actualNode.corpus)} · SCRIPTURE DATA</div><h3 class="node-detail-name">${escapeHtml(actualNode.name)}</h3><p>${escapeHtml(refsFor(actualNode, 8))}</p><div class="inspector-block"><b>CANONICAL NEIGHBORHOOD</b><div class="node-detail-list">${edgeRows || '<div class="node-detail-item"><span>No selected canonical edge.</span></div>'}</div></div><div class="inspector-block"><b>CASES USING THIS NODE</b><p>${related.map((item) => escapeHtml(item.label)).join(' · ') || 'Bounded study anchor'}</p></div>`; return; }
  inspector.innerHTML = `<div class="inspector-kicker">${escapeHtml(node.corpus || '')} · SCRIPTURE DATA</div><h3 class="node-detail-name">${escapeHtml(node.name || node.label)}</h3><p>${escapeHtml(refsFor(node, 6))}</p>`;
}

function renderMethodology(study) {
  const p = study.provenance; const cards = [
    { type: 'PRIMARY SOURCE FACT', title: 'Official receipts', detail: `${formatNumber(study.stats.modern_source_layer.primary_sources)} White House records, cited as a distinct modern source layer.` },
    { type: 'SCRIPTURE DATA', title: 'Canonical graph', detail: `${formatNumber(study.stats.study_projection.nodes)} selected Bible + Book of Mormon nodes and ${formatNumber(study.stats.study_projection.edges)} accepted edges.` },
    { type: 'INTERPRETATION', title: 'Editorial connections', detail: `${formatNumber(study.stats.modern_source_layer.editorial_comparison_edges)} labeled comparison edges; none are presented as canonical.` },
  ];
  $('#methodology-grid').innerHTML = cards.map((card) => `<div class="method-card"><div class="method-type">${escapeHtml(card.type)}</div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.detail)}</p></div>`).join('');
  const validation = study.validation; const badge = $('#validation-badge'); badge.textContent = validation.passed ? `Validation passed · ${formatNumber(validation.nodes_used)} nodes / ${formatNumber(validation.edges_used)} edges` : 'Validation needs review'; badge.classList.toggle('fail', !validation.passed);
  $('#generated-at').textContent = `Generated ${study.generated_at} · ${validation.broken_or_unresolved_references.length} broken references`;
  $('#method-modal-body').innerHTML = `<p class="modal-note">${escapeHtml(p.method.note)} ${escapeHtml(p.method.modern_layer_note)} This projection is deterministic apart from the generated-at timestamp.</p><div class="drawer-section"><h3>Source manifest</h3>${[p.bible_graph, p.book_of_mormon_graph, p.topical_guide.base_export, p.topical_guide.accepted_provenance_manifest, p.topical_guide.source_attested_relationships, p.topical_guide.current_supplemental_layer_manifest].map((source) => `<div class="modal-source"><b>${escapeHtml(source.path.split('/').slice(-1)[0])}</b><span>${escapeHtml(source.path)}</span><span>sha256 ${escapeHtml(source.sha256)}</span></div>`).join('')}</div><div class="drawer-section"><h3>Modern primary sources</h3>${study.modern_sources.map((source) => `<div class="modal-source"><b>${escapeHtml(source.title)}</b><span>${escapeHtml(source.published)} · ${escapeHtml(source.document_type.replaceAll('_', ' '))}</span><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">View official source ↗</a></div>`).join('')}</div>`;
}

function openModal(dialog) { if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); }
function closeModal(dialog) { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); }

function bindEvents() {
  document.addEventListener('click', (event) => {
    const openMethod = event.target.closest('[data-open-method]'); if (openMethod) openModal($('#method-modal'));
    const close = event.target.closest('[data-close-modal]'); if (close) closeModal(close.closest('dialog'));
    const share = event.target.closest('[data-share]'); if (share) { const url = window.location.href.split('#')[0]; if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(() => showToast('Study link copied.')).catch(() => showToast(url)); else showToast(url); }
    const caseTopic = event.target.closest('[data-case-topic]'); if (caseTopic) { selectCaseTopic(caseTopic.dataset.caseTopic, caseTopic.dataset.topicId); return; }
    const caseEvidence = event.target.closest('[data-case-evidence]'); if (caseEvidence) { selectCaseNode(caseEvidence.dataset.caseEvidence, caseEvidence.dataset.selectNode); return; }
    const selectedNode = event.target.closest('[data-select-node]'); if (selectedNode) { selectNode(selectedNode.dataset.selectNode); $('#full-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  ['method-modal'].forEach((id) => $(`#${id}`).addEventListener('click', (event) => { if (event.target === event.currentTarget) closeModal(event.currentTarget); }));
}

async function boot() {
  try {
    const response = await fetch('data/study.json', { cache: 'no-store' }); if (!response.ok) throw new Error(`study.json returned ${response.status}`);
    state.study = await response.json(); updateTopStats(state.study); renderCaseNav(state.study); renderCases(state.study); renderMethodology(state.study); renderNetwork(state.study); bindEvents();
  } catch (error) { console.error(error); document.body.innerHTML = `<main style="padding:40px;font-family:system-ui"><h1>Study data unavailable</h1><p>${escapeHtml(error.message)}</p></main>`; }
}

boot();
