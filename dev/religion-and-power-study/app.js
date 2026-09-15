const state = { study: null, expanded: new Set(), selected: new Map(), selectedFullNode: null };
const $ = (selector) => document.querySelector(selector);
const formatNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));
const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const escapeXml = escapeHtml;
const titleCase = (value) => String(value || '').toLowerCase().replace(/(^|[\s—-])\S/g, (match) => match.toUpperCase());
const refsFor = (row, limit = 6) => (row?.formatted_references || row?.references || []).slice(0, limit).join(' · ') || 'Locator recorded on source node';
const shortLabel = (value, max = 25) => { const text = String(value || ''); return text.length > max ? `${text.slice(0, max - 1)}…` : text; };

function sourceLabel(source) { return `${source.source_family.replaceAll('_', ' ')} · ${source.document_type.replaceAll('_', ' ')}`; }
function scriptureUrl(node) {
  const reference = (node.formatted_references || node.references || [])[0];
  if (!reference) return '';
  const match = reference.match(/^(.+?)\s+(\d+):/);
  if (!match) return 'https://www.churchofjesuschrist.org/study/scriptures?lang=eng';
  const book = match[1].replace('JS—', 'js-').replace(/[—\s]+/g, '-').toLowerCase();
  return `https://www.churchofjesuschrist.org/study/scriptures/${node.corpus === 'BOM' ? 'bofm' : 'nt'}/${book}?lang=eng`;
}
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200); }

const essaySections = [
  { id: 'chosen-group', kicker: '01 · RELIGIOUS IDENTITY', title: 'Religious Identity and the Chosen Group', dek: 'Before scripture asks what a group can accomplish, it asks what its identity is doing to the heart.', themeIds: ['identity-badge'], caseIds: ['christian-national-identity', 'divine-purpose'], paragraphs: [
    'Alma 31 places us among the Zoramites, a community whose worship has become a public sign of belonging. The question is not simply whether they are religious. It is whether chosenness, separation, and visible certainty have begun to make humility impossible.',
    'That pattern gives the modern argument a serious place to begin. National religious language can name genuine faith, but it can also turn belonging into a badge: a way to sort the righteous from the suspect. The comparison is useful when it keeps asking what kind of people an identity is forming.'
  ] },
  { id: 'religion-status', kicker: '02 · PUBLIC RELIGION', title: 'Religion as Status', dek: 'Matthew 23 turns from the performance of holiness to the social power that holiness can confer.', themeIds: ['identity-badge'], caseIds: ['divine-purpose'], paragraphs: [
    'In Matthew 23, titles, seats, visible observance, and public recognition become part of Jesus’s warning. The Pharisee and the tax collector make the contrast intimate: prayer can announce a person’s standing, or it can expose a person’s need for mercy. Zoramite worship supplies a Book of Mormon parallel in the graph’s accepted evidence.',
    'The scriptural pattern does not ask us to distrust every public profession of faith. It asks whether religious speech is being used to receive status, establish superiority, or avoid the inward work that the speech claims to represent.'
  ] },
  { id: 'power-protects-power', kicker: '03 · AUTHORITY', title: 'Power Protects Power', dek: 'Scripture repeatedly examines the moment when religious authority and political authority begin to preserve one another.', themeIds: ['authority-and-power'], caseIds: ['faith-executive-power', 'anti-christian-bias'], paragraphs: [
    'John 11 gives Caiaphas a chilling institutional calculation: the organization must survive, and one person can be sacrificed to preserve it. Around the arrest and trial of Jesus, Pharisees, Caiaphas, Pilate, and the crowd occupy different roles. In the Book of Mormon, King Noah and his priests offer another configuration of religious status and political control, while Abinadi names the cost of that arrangement.',
    'A public faith office or a government response to perceived religious bias does not, by itself, prove the analogy. It does make the structural question visible: when religious authority enters the machinery of executive power, what protects truth, dissent, repentance, and the vulnerable from institutional self-preservation?'
  ] },
  { id: 'weightier-matters', kicker: '04 · PROPORTION', title: 'The Weightier Matters', dek: 'Justice, mercy, and faith are not decorative virtues. In Jesus’s teaching, they are the measure by which religious precision is judged.', themeIds: ['mercy-over-performance'], caseIds: [], paragraphs: [
    'Jesus’s Sabbath healings and his words about tithing expose a problem of proportion. A practice can be exact and still miss the point. Matthew 23:23 and Luke 11:42 place mercy beside religious observance as something that cannot be left undone; the Book of Mormon’s Mercy cluster extends the same question into another scriptural corpus.',
    'This is not a verdict on any particular policy. It is a question for discipleship: when visible rules, loyalty, identity, or status compete with mercy and justice, which one is treated as weightier? The graph makes the textual pattern inspectable without turning it into a partisan scorecard.'
  ] },
  { id: 'neighbor', kicker: '05 · THE OUTSIDER', title: 'Who Is My Neighbor?', dek: 'The Good Samaritan is not an immigration statute. It is a story that tests the boundaries of moral obligation.', themeIds: ['wide-neighbor'], caseIds: ['invasion-outsider'], paragraphs: [
    'Luke 10 makes the neighbor a person encountered across a boundary. The Samaritan, the stranger, the enemy, the Gentile, and the Roman centurion appear in a scriptural world where compassion is not reserved for the in-group. Book of Mormon narratives involving former enemies and the Anti-Nephi-Lehies add a different kind of evidence: communities can be changed by how they remember, receive, or refuse retaliation.',
    'The modern source introduces competing responsibilities that scripture does not erase: government, law, public order, protection, and obligation to a community. The moral question is narrower and harder: how should language about outsiders be evaluated against teachings about neighbor, stranger, mercy, enemy, and the worth of a person before God?'
  ] },
  { id: 'truth-loyalty', kicker: '06 · INSTITUTIONS', title: 'Truth, Loyalty, and Institutional Preservation', dek: 'Across John 9, John 11, and the Abinadi story, truth creates pressure where loyalty and institutional survival want quiet.', themeIds: ['authority-and-power'], caseIds: ['anti-christian-bias'], paragraphs: [
    'The conflict is not only between belief and unbelief. It is also between what a community knows, what it can admit, and what it fears losing. John 9 shows social exclusion used to defend a settled order. John 11 shows power reasoning about a threat. Noah’s court and Abinadi make that tension concrete in the Book of Mormon projection.',
    'The essay’s modern question is therefore about more than political alignment. When a group sees itself as embattled, does loyalty become a reason to suppress correction? Does the desire to protect a good institution make it unable to hear a truthful challenge?'
  ] },
  { id: 'service', kicker: '07 · AN ALTERNATIVE', title: 'Domination or Service?', dek: 'The study needs a positive scriptural model, not only a catalogue of warnings.', themeIds: ['power-repentance', 'enemy-love'], caseIds: [], paragraphs: [
    'Jesus’s model of authority bends downward. In the New Testament, greatness is associated with service rather than domination. King Benjamin’s teaching and the Book of Mormon’s repentance narratives give the graph a related counter-pattern: authority can be relinquished, enemies can be received, and identity can be re-formed.',
    'This does not make every question about public safety or state force simple. It does change what power is for. The accepted evidence asks whether leadership produces humility, care, correction, and service—or whether it needs enemies and hierarchy in order to remain legible.'
  ] },
  { id: 'fruits', kicker: '08 · SYNTHESIS', title: 'By Their Fruits', dek: 'The study ends with questions rather than a partisan scorecard.', themeIds: ['identity-badge', 'authority-and-power', 'wide-neighbor', 'mercy-over-performance', 'power-repentance', 'enemy-love'], caseIds: [], paragraphs: [
    'The graph does not deliver a single verdict. It preserves a body of passages, events, people, groups, topics, and relationships that the reader can inspect. The essay’s claim is that recurring scriptural warnings can be a demanding framework for examining a modern political argument.',
    'How are outsiders treated? Is religious identity producing humility or superiority? Is power being used for service or domination? Are truth and mercy subordinate to group loyalty? Are justice and mercy treated as weightier matters? How is religious authority related to political power? The evidence is here for the reader to follow.'
  ] }
];

function renderHeroMetrics(study) {
  const values = [[essaySections.length, 'essay sections'], [study.stats.study_projection.nodes, 'scripture nodes'], [study.stats.study_projection.edges, 'graph edges']];
  $('#hero-metrics').innerHTML = values.map(([value, label]) => `<span><b>${formatNumber(value)}</b> ${escapeHtml(label)}</span>`).join('');
}

function findThemeNodes(section) {
  const seen = new Set();
  return section.themeIds.flatMap((id) => state.study.themes.find((theme) => theme.id === id)?.evidence || []).filter((item) => {
    const key = `${item.corpus}:${item.node_id}`; if (seen.has(key)) return false; seen.add(key); return true;
  });
}
function sourceCallout(caseData) {
  const source = caseData?.primary_sources?.[0]; if (!source) return '';
  const extra = caseData.primary_sources.length > 1 ? `<p class="source-related">+ ${caseData.primary_sources.length - 1} related source${caseData.primary_sources.length > 2 ? 's' : ''} in this branch</p>` : '';
  return `<aside class="inline-source"><div class="source-topline"><span>PRIMARY SOURCE</span><span>${escapeHtml(source.published)}</span></div><p class="source-issuer">${escapeHtml(source.issuer || 'The White House')}</p><h3>${escapeHtml(source.title)}</h3><p class="source-meta">${escapeHtml(sourceLabel(source))}</p><blockquote>“${escapeHtml(source.excerpt)}”</blockquote><a class="source-button" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">VIEW ORIGINAL ↗</a>${extra}</aside>`;
}
function sectionCase(section) { return state.study.cases.find((item) => section.caseIds.includes(item.id)); }
function makeGraphModel(section, expanded = false) {
  const caseData = sectionCase(section);
  if (caseData?.graph) {
    const nodes = caseData.graph.nodes.filter((node) => node.kind !== 'modern-root' && node.kind !== 'modern-branch');
    const edges = caseData.graph.edges.filter((edge) => nodes.some((node) => node.id === edge.source) && nodes.some((node) => node.id === edge.target));
    return { nodes: expanded ? nodes : nodes.slice(0, 8), edges, sourceCase: caseData };
  }
  const evidence = findThemeNodes(section);
  const actual = evidence.map((item) => ({ id: `scripture:${item.corpus}:${item.node_id}`, corpus: item.corpus, label: item.label, layer: 'SCRIPTURE', kind: 'scriptural-anchor', scripture_node_id: item.node_id, formatted_references: item.formatted_references, references: item.references, type: String(item.kind || 'event').toUpperCase() }));
  const ids = new Set(actual.map((node) => `${node.corpus}:${node.scripture_node_id}`));
  const canonical = state.study.edges.filter((edge) => ids.has(edge.source) || ids.has(edge.target)).slice(0, expanded ? 12 : 5);
  const nodes = expanded ? actual.slice(0, 12) : actual.slice(0, 5);
  const visible = new Set(nodes.map((node) => node.id));
  const nodeById = new Map(actual.map((node) => [node.scripture_node_id, node]));
  const edges = canonical.map((edge) => ({ source: nodeById.get(edge.source)?.id, target: nodeById.get(edge.target)?.id, label: edge.label, layer: 'CANONICAL' })).filter((edge) => visible.has(edge.source) && visible.has(edge.target));
  return { nodes, edges, sourceCase: null };
}
function graphPositions(nodes, width, height) {
  const map = new Map(); const sourceNodes = nodes.filter((node) => node.layer === 'MODERN_SOURCE'); const question = nodes.find((node) => node.layer === 'SCRIPTURAL_QUESTION'); const anchors = nodes.filter((node) => node.layer === 'SCRIPTURE');
  sourceNodes.forEach((node, i) => map.set(node.id, { x: 86, y: 82 + i * 62 }));
  if (question) map.set(question.id, { x: Math.round(width * .39), y: Math.round(height * .52) });
  anchors.forEach((node, i) => map.set(node.id, { x: Math.round(width * .67) + (i % 3) * 82, y: 54 + Math.floor(i / 3) * 76 }));
  if (!sourceNodes.length && !question) anchors.forEach((node, i) => map.set(node.id, { x: 100 + (i % 3) * Math.round(width / 3.8), y: 60 + Math.floor(i / 3) * 78 }));
  return map;
}
function nodeColor(node) { if (node.layer === 'MODERN_SOURCE') return '#b9b3a8'; if (node.layer === 'SCRIPTURAL_QUESTION') return '#73c9bd'; if (node.corpus === 'BOM') return '#c4a875'; return '#e4ddd1'; }
function graphNodeSvg(node, position, selected, sectionId, compact = false) {
  if (!position) return ''; const color = nodeColor(node); const label = shortLabel(node.label, compact ? 17 : 22); const selectedClass = selected ? ' selected' : ''; let shape;
  if (node.layer === 'MODERN_SOURCE') shape = `<rect x="${position.x - 53}" y="${position.y - 20}" width="106" height="40" rx="5" fill="#273238" stroke="${color}"/>`;
  else if (node.layer === 'SCRIPTURAL_QUESTION') shape = `<circle cx="${position.x}" cy="${position.y}" r="35" fill="#19343a" stroke="${color}" stroke-width="1.5"/>`;
  else if (node.type === 'PERSON') shape = `<circle cx="${position.x}" cy="${position.y}" r="15" fill="#1e2c31" stroke="${color}"/>`;
  else shape = `<polygon points="${position.x},${position.y - 17} ${position.x + 17},${position.y} ${position.x},${position.y + 17} ${position.x - 17},${position.y}" fill="#273238" stroke="${color}"/>`;
  const labelY = node.layer === 'SCRIPTURAL_QUESTION' ? position.y + 51 : position.y + 31;
  const sublabel = node.layer === 'MODERN_SOURCE' ? 'SOURCE' : node.layer === 'SCRIPTURAL_QUESTION' ? 'QUESTION' : node.corpus;
  return `<g class="graph-node${selectedClass}" data-inline-node="${escapeXml(sectionId)}" data-node-id="${escapeXml(node.id)}" tabindex="0" role="button" aria-label="Inspect ${escapeXml(node.label)}">${shape}<text x="${position.x}" y="${labelY}">${escapeXml(label)}</text><text class="graph-corpus" x="${position.x}" y="${node.layer === 'SCRIPTURAL_QUESTION' ? position.y + 11 : position.y + 40}">${sublabel}</text><title>${escapeXml(node.label)}</title></g>`;
}
function edgeSvg(edge, positions) { const a = positions.get(edge.source); const b = positions.get(edge.target); if (!a || !b) return ''; const kind = edge.layer === 'CANONICAL' ? 'canonical' : edge.layer === 'EDITORIAL_COMPARISON' ? 'comparison' : 'scriptural'; const label = edge.layer === 'EDITORIAL_COMPARISON' ? 'comparison' : edge.layer === 'SCRIPTURAL_EVIDENCE' ? 'scripture data' : ''; return `<line class="graph-edge ${kind}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>${label ? `<text class="graph-edge-label" x="${Math.round((a.x + b.x) / 2)}" y="${Math.round((a.y + b.y) / 2) - 4}">${label}</text>` : ''}`; }

function graphModelWithSection(section, expanded) {
  const model = makeGraphModel(section, expanded); const nodes = model.nodes.slice(); const edges = model.edges.slice();
  if (model.sourceCase && !nodes.some((node) => node.layer === 'SCRIPTURAL_QUESTION')) return model;
  return model;
}
function renderInlineGraph(section) {
  const expanded = state.expanded.has(section.id); const model = graphModelWithSection(section, expanded); const svg = document.querySelector(`#inline-svg-${section.id}`); if (!svg) return;
  const width = 760; const height = expanded ? 340 : 215; const positions = graphPositions(model.nodes, width, height); svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.setAttribute('aria-label', `Scripture graph evidence for ${section.title}`);
  svg.innerHTML = `<g>${model.edges.map((edge) => edgeSvg(edge, positions)).join('')}</g><g>${model.nodes.map((node) => graphNodeSvg(node, positions.get(node.id), state.selected.get(section.id) === node.id, section.id, !expanded)).join('')}</g>`;
  svg.querySelectorAll('[data-inline-node]').forEach((node) => { const activate = () => selectInlineNode(section, node.dataset.nodeId); node.addEventListener('click', activate); node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') activate(); }); });
  svg.style.minHeight = `${height}px`;
}
function graphInspectorDefault() { return '<div class="inspector-kicker">FROM THE SCRIPTURE GRAPH</div><h3 class="node-detail-name">Choose a node.</h3><p>Inspect a passage, person, group, event, or source without leaving the essay.</p>'; }
function actualForGraphNode(node) { return state.study.nodes.find((item) => item.id === node.scripture_node_id && item.corpus === node.corpus); }
function inspectorHtml(section, node) {
  const caseData = sectionCase(section);
  if (node.layer === 'MODERN_SOURCE') { const source = caseData?.primary_sources.find((item) => item.id === node.source_id) || caseData?.primary_sources[0]; return source ? `<div class="inspector-kicker">PRIMARY SOURCE</div><h3 class="node-detail-name">${escapeHtml(source.title)}</h3><p class="node-detail-type">${escapeHtml(source.published)} · ${escapeHtml(source.document_type.replaceAll('_', ' '))}</p><div class="inspector-block"><blockquote>“${escapeHtml(source.excerpt)}”</blockquote><a class="source-button" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">VIEW ORIGINAL ↗</a></div>` : graphInspectorDefault(); }
  if (node.layer === 'SCRIPTURAL_QUESTION') return `<div class="inspector-kicker">INTERPRETIVE QUESTION</div><h3 class="node-detail-name">${escapeHtml(node.label)}</h3><p>${escapeHtml(node.question || section.dek)}</p><div class="inspector-block"><b>TOPIC BRIDGES</b><div class="inspector-topics">${(state.study.themes.find((theme) => section.themeIds.includes(theme.id))?.topics || []).slice(0, 4).map((topic) => `<span>${escapeHtml(titleCase(topic.label))}<em>${formatNumber(topic.accepted_link_count)}</em></span>`).join('')}</div></div>`;
  const actual = actualForGraphNode(node) || node; const relationships = state.study.edges.filter((edge) => edge.source === actual.id || edge.target === actual.id).slice(0, 5); const relations = relationships.map((edge) => `<li><b>${escapeHtml(edge.label || 'canonical relationship')}</b><br>${escapeHtml(edge.source === actual.id ? `→ ${edge.target_name || edge.target}` : `← ${edge.source_name || edge.source}`)}</li>`).join('');
  return `<div class="inspector-kicker">${escapeHtml(actual.corpus || node.corpus)} · SCRIPTURE DATA</div><h3 class="node-detail-name">${escapeHtml(actual.name || actual.label || node.label)}</h3><p>${escapeHtml(refsFor(actual, 8))}</p><div class="inspector-block"><b>CANONICAL RELATIONSHIPS</b><ul class="inspector-list">${relations || '<li>No selected relationship.</li>'}</ul></div>${scriptureUrl(actual) ? `<a class="source-button" href="${escapeHtml(scriptureUrl(actual))}" target="_blank" rel="noreferrer">OPEN SCRIPTURE ↗</a>` : ''}`;
}
function selectInlineNode(section, nodeId) { const model = graphModelWithSection(section, state.expanded.has(section.id)); const node = model.nodes.find((item) => item.id === nodeId); if (!node) return; state.selected.set(section.id, nodeId); renderInlineGraph(section); const inspector = document.querySelector(`#inline-inspector-${section.id}`); if (inspector) inspector.innerHTML = inspectorHtml(section, node); }
function renderGraphEvidence(section) {
  const evidence = findThemeNodes(section); const topics = section.themeIds.flatMap((id) => state.study.themes.find((theme) => theme.id === id)?.topics || []).slice(0, 5); const selected = evidence.slice(0, 4); const expanded = state.expanded.has(section.id);
  return `<section class="graph-evidence${expanded ? ' is-expanded' : ''}" data-graph-section="${escapeHtml(section.id)}"><div class="graph-evidence-head"><div><p class="eyebrow">FROM THE SCRIPTURE GRAPH</p><p class="graph-evidence-intro">${formatNumber(evidence.length)} passages · ${formatNumber(topics.length)} topic bridges · preserved relationships</p></div><button class="expand-graph" type="button" data-expand-graph="${escapeHtml(section.id)}">${expanded ? 'CLOSE CONNECTION ↑' : 'EXPLORE THIS CONNECTION →'}</button></div><div class="evidence-chips"><div><span class="chip-label">PASSAGES</span><div class="chips">${selected.map((item) => `<span class="chip">${escapeHtml(item.label)}<small>${escapeHtml(refsFor(item, 2))}</small></span>`).join('')}</div></div>${topics.length ? `<div><span class="chip-label">TOPICS</span><div class="chips">${topics.map((topic) => `<span class="chip topic-chip">${escapeHtml(titleCase(topic.label))}<small>${formatNumber(topic.accepted_link_count)} links</small></span>`).join('')}</div></div>` : ''}</div><div class="inline-graph-workspace"><div class="inline-graph-canvas"><div class="graph-legend"><span><i class="line-key comparison-key"></i>comparison</span><span><i class="line-key scripture-key"></i>scripture data</span><span><i class="line-key canonical-key"></i>canonical</span></div><svg id="inline-svg-${escapeHtml(section.id)}" viewBox="0 0 760 215" role="img" aria-label="Scripture graph evidence"></svg></div><aside class="inline-inspector" id="inline-inspector-${escapeHtml(section.id)}">${graphInspectorDefault()}</aside></div></section>`;
}
function renderEssaySection(section, index) { const sources = section.caseIds.map((id) => state.study.cases.find((item) => item.id === id)).filter(Boolean).slice(0, 1); return `<article class="essay-section" id="section-${escapeHtml(section.id)}"><div class="essay-section-head"><div class="section-number">${String(index + 1).padStart(2, '0')}</div><div><p class="eyebrow">${escapeHtml(section.kicker)}</p><h2>${escapeHtml(section.title)}</h2><p class="section-dek">${escapeHtml(section.dek)}</p></div></div><div class="essay-copy">${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div>${sources.map(sourceCallout).join('')} ${renderGraphEvidence(section)}</article>`; }
function renderEssay() { $('#essay-sections').innerHTML = essaySections.map(renderEssaySection).join(''); $('#essay-rail').innerHTML = essaySections.map((section, i) => `<a href="#section-${escapeHtml(section.id)}"><span>${String(i + 1).padStart(2, '0')}</span>${escapeHtml(section.title)}</a>`).join(''); essaySections.forEach(renderInlineGraph); }

function renderFullLayout(nodes) { const positions = new Map(); const root = nodes.find((node) => node.kind === 'modern-root'); if (root) positions.set(root.id, { x: 580, y: 55 }); const branches = nodes.filter((node) => node.kind === 'modern-branch'); const branchXs = [110, 345, 580, 815, 1050]; branches.forEach((node, index) => positions.set(node.id, { x: branchXs[index], y: 150 })); branches.forEach((branch, index) => nodes.filter((node) => node.kind === 'modern-source' && node.branch_id === branch.branch_id).forEach((node, i, list) => positions.set(node.id, { x: branchXs[index] + (i - (list.length - 1) / 2) * 62, y: 255 }))); nodes.filter((node) => node.kind === 'scriptural-question').forEach((node, i) => positions.set(node.id, { x: branchXs[i % branchXs.length], y: 380 })); nodes.filter((node) => node.kind === 'scriptural-anchor').forEach((node, i) => positions.set(node.id, { x: 100 + (i % 6) * 190, y: 535 + Math.floor(i / 6) * 82 })); return positions; }
function fullInspector(node) { const caseData = state.study.cases.flatMap((item) => item.graph.nodes.map((graphNode) => ({ caseData: item, graphNode }))).find((item) => item.graphNode.id === node.id); if (caseData) return inspectorHtml({ themeIds: [], caseIds: [caseData.caseData.id], dek: '' }, node); const actual = actualForGraphNode(node) || node; return inspectorHtml({ themeIds: [], caseIds: [], dek: '' }, actual); }
function renderFullMap() { const svg = $('#network-svg'); if (!svg) return; const nodes = state.study.comparison_network.nodes.filter((node) => node.kind !== 'modern-root'); const positions = renderFullLayout(nodes); const edges = state.study.comparison_network.edges; svg.innerHTML = `<g>${edges.map((edge) => edgeSvg(edge, positions)).join('')}</g><g>${nodes.map((node) => graphNodeSvg(node, positions.get(node.id), state.selectedFullNode === node.id, 'full', false)).join('')}</g>`; $('#network-edge-count').textContent = `${formatNumber(edges.length)} relationships`; svg.querySelectorAll('[data-inline-node]').forEach((node) => { const activate = () => { const found = nodes.find((item) => item.id === node.dataset.nodeId); if (!found) return; state.selectedFullNode = found.id; $('#network-inspector').innerHTML = fullInspector(found); renderFullMap(); }; node.addEventListener('click', activate); node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') activate(); }); }); }

function renderHowWorks() { const provenance = state.study.provenance || {}; const validation = state.study.validation || {}; $('#method-modal-body').innerHTML = `<p class="eyebrow">THE EVIDENCE LAYER</p><h2>How this was built</h2><p class="modal-note">The essay stays readable because the rigorous distinctions live here, one layer below the prose.</p><div class="method-list"><p><b>Primary sources.</b> Official source records remain separate from the scripture corpus, with source metadata, URLs, excerpts, hashes, and publication dates.</p><p><b>Scripture data.</b> Canonical scripture relationships come from the accepted Cultivate graph and its Topical Guide layer.</p><p><b>Interpretation.</b> Modern-to-scripture edges are editorial comparisons. They are questions for reading, not claims that ancient groups are identical to modern groups.</p><p><b>Historical caution.</b> Pharisee references are read as narrative and historical records in context, not as a license for modern group generalizations.</p><p><b>Validation.</b> ${validation.passed ? 'The current projection passed its data checks.' : 'The current projection has validation notes.'} ${formatNumber(state.study.stats?.modern_source_layer?.primary_sources)} primary sources, ${formatNumber(state.study.stats?.study_projection?.nodes)} scripture nodes, and ${formatNumber(state.study.stats?.study_projection?.edges)} graph edges are represented.</p></div><div class="drawer-section"><h3>Provenance</h3><p>${escapeHtml(provenance.generated_at || 'Recorded in the study data manifest.')}</p><p>Source and dataset hashes remain available in the preserved JSON record.</p></div>`; }
function bindEvents() { document.addEventListener('click', (event) => { const expand = event.target.closest('[data-expand-graph]'); if (expand) { const id = expand.dataset.expandGraph; state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id); renderEssay(); document.querySelector(`#section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } const open = event.target.closest('[data-open-method]'); if (open) { renderHowWorks(); $('#method-modal').showModal(); } const close = event.target.closest('[data-close-modal]'); if (close) $('#method-modal').close(); }); $('#method-modal').addEventListener('click', (event) => { if (event.target === $('#method-modal')) $('#method-modal').close(); }); }
async function boot() { try { const response = await fetch('data/study.json', { cache: 'no-store' }); if (!response.ok) throw new Error(`study.json returned ${response.status}`); state.study = await response.json(); renderHeroMetrics(state.study); renderEssay(); renderFullMap(); bindEvents(); } catch (error) { console.error(error); document.body.innerHTML = `<main style="padding:40px;font-family:system-ui"><h1>Study data unavailable</h1><p>${escapeHtml(error.message)}</p></main>`; } }
boot();
