const state = {
  study: null,
  corpus: 'ALL',
  topicId: null,
  nodeId: null,
};

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeXml(value) {
  return escapeHtml(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function titleCase(value) {
  return String(value || '').toLowerCase().replace(/(^|[\s—-])\S/g, (match) => match.toUpperCase());
}

function corpusLabel(corpus) {
  return corpus === 'NT' ? 'New Testament' : corpus === 'BOM' ? 'Book of Mormon' : 'Combined corpora';
}

function refsFor(row, limit = 7) {
  const refs = row.formatted_references || row.references || [];
  return refs.slice(0, limit).join(' · ') || 'Locator recorded on source node';
}

function topicMatchesCorpus(topic, corpus) {
  if (corpus === 'ALL') return true;
  return topic.links.some((link) => link.canonical_id.startsWith(`${corpus === 'NT' ? 'nt' : 'bom'}:`));
}

function themeMatches(theme) {
  if (state.topicId && !theme.topic_ids.includes(state.topicId)) return false;
  if (state.corpus === 'ALL') return true;
  return theme.evidence.some((item) => item.corpus === state.corpus) || theme.topics.some((topic) => topicMatchesCorpus(topic, state.corpus));
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
  const values = [projection.nodes, projection.edges, modern.primary_sources, modern.editorial_comparison_edges];
  document.querySelectorAll('#top-stats .stat-item strong').forEach((element, index) => {
    element.textContent = formatNumber(values[index]);
  });
}

function renderHistoricalCaution(study) {
  $('#historical-caution-list').innerHTML = study.historical_caution.map((item) => `<div>${escapeHtml(item)}</div>`).join('');
}

function renderModernLayer(study) {
  const modern = study.stats.modern_source_layer;
  $('#modern-root-card').innerHTML = `
    <div class="modern-root-mark">MAGA /<br>AMERICA FIRST</div>
    <div><p class="eyebrow">Modern source layer</p><h3>MAGA / AMERICA FIRST</h3><p>${escapeHtml(study.modern_scope_note)}</p></div>
    <div class="modern-root-stats"><span><b>${formatNumber(modern.primary_sources)}</b> primary sources</span><span><b>${formatNumber(modern.branches)}</b> evidence branches</span><span><b>${formatNumber(modern.editorial_comparison_edges)}</b> comparison edges</span></div>
  `;
  $('#modern-branch-grid').innerHTML = study.modern_branches.map((branch) => `
    <article class="modern-branch-card" id="modern-${escapeHtml(branch.id)}">
      <div class="modern-branch-head"><span class="modern-branch-number">${escapeHtml(branch.number)}</span><div><p class="modern-branch-label">${escapeHtml(branch.label)}</p><h3>${escapeHtml(branch.title)}</h3></div></div>
      <div class="modern-fact-block"><b>DOCUMENTED FACT</b><p>${escapeHtml(branch.sources.map((source) => source.fact).join(' '))}</p></div>
      <div class="modern-sources"><div class="evidence-label">Primary source receipts</div>${branch.sources.map((source) => `
        <div class="modern-source-row">
          <div><span class="source-meta">${escapeHtml(source.document_type.replaceAll('_', ' '))} · ${escapeHtml(source.published)}</span><strong>${escapeHtml(source.title)}</strong><span class="source-excerpt">“${escapeHtml(source.excerpt)}”</span></div>
          <div class="modern-source-actions"><button class="map-link" type="button" data-select-node="modern:source:${escapeHtml(source.id)}">Inspect map ↗</button><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">View official source ↗</a></div>
        </div>
      `).join('')}</div>
      <div class="modern-questions"><div class="evidence-label">Scriptural questions</div><div class="question-chips">${branch.questions.map((question) => `<span>${escapeHtml(question)}</span>`).join('')}</div></div>
      <div class="modern-comparison"><div class="reading-block interpretation"><b>THE COMPARISON</b><p>${escapeHtml(branch.comparison)}</p></div></div>
      <div class="modern-scripture"><div class="evidence-label">Scriptural evidence</div><div class="modern-scripture-links">${branch.scriptural_evidence.map((item) => `<button type="button" data-select-node="scripture:${escapeHtml(item.corpus)}:${escapeHtml(item.node_id)}">${escapeHtml(item.label)} <span>${escapeHtml(refsFor(item, 2))} ↗</span></button>`).join('')}</div></div>
    </article>
  `).join('');
}

function renderChapters(study) {
  $('#chapter-links').innerHTML = study.themes.map((theme) => `
    <button class="chapter-link" type="button" data-scroll-theme="${escapeHtml(theme.id)}">
      <b>${escapeHtml(theme.number)}</b><span>${escapeHtml(theme.kicker)}</span>
    </button>
  `).join('');
}

function renderThemes(study) {
  const container = $('#theme-list');
  container.innerHTML = study.themes.map((theme) => {
    const visibleEvidence = state.corpus === 'ALL' ? theme.evidence : theme.evidence.filter((item) => item.corpus === state.corpus);
    const matched = themeMatches(theme);
    const evidenceHtml = visibleEvidence.length ? visibleEvidence.map((item) => `
      <div class="evidence-row">
        <span class="corpus-tag ${item.corpus === 'NT' ? 'nt' : 'bom'}">${item.corpus === 'NT' ? 'NT' : 'BOM'}</span>
        <span class="evidence-name">${escapeHtml(item.label)}</span>
        <span class="ref-line">${escapeHtml(refsFor(item, 5))}</span>
      </div>
    `).join('') : `<p class="small-note">No direct event projection in this corpus; inspect the accepted topic links below.</p>`;
    const topicHtml = theme.topics.map((topic) => `
      <button class="topic-chip" type="button" data-topic-id="${escapeHtml(topic.id)}">${escapeHtml(titleCase(topic.label))} <span>${formatNumber(topic.accepted_link_count)}</span></button>
    `).join('');
    return `
      <article class="theme-card ${matched ? '' : 'is-dimmed'}" id="${escapeHtml(theme.id)}" ${matched ? '' : 'hidden'}>
        <div class="theme-top">
          <div><p class="theme-kicker">${escapeHtml(theme.kicker)}</p><h3>${escapeHtml(theme.title)}</h3></div>
          <span class="theme-number">${escapeHtml(theme.number)}</span>
        </div>
        <p class="theme-dek">${escapeHtml(theme.dek)}</p>
        <div class="theme-evidence">
          <div><div class="evidence-label">Data · selected evidence</div>${evidenceHtml}</div>
          <div><div class="evidence-label">Guide topic connections</div><div class="evidence-row">${topicHtml}</div><p class="ref-line">Source-attested links only · click a topic to filter the study.</p></div>
        </div>
        <div class="theme-lower">
          <div class="reading-block"><b>Observation</b><p>${escapeHtml(theme.observation)}</p></div>
          <div class="reading-block interpretation"><b>Interpretation</b><p>${escapeHtml(theme.interpretation)}</p></div>
        </div>
        <div class="theme-top"><span></span><button class="theme-open" type="button" data-open-evidence="${escapeHtml(theme.id)}">Open evidence drawer ↗</button></div>
      </article>
    `;
  }).join('');
}

function renderTopicSummary(study) {
  const projection = study.stats.study_projection;
  $('#topic-summary').innerHTML = state.topicId
    ? `<strong>1</strong><span>topic selected · ${escapeHtml(titleCase(study.topics.find((topic) => topic.id === state.topicId)?.label || ''))}</span>`
    : `<strong>${formatNumber(projection.topics)}</strong><span>accepted Guide topics · ${formatNumber(projection.accepted_topic_links)} New Testament / Book of Mormon links in this projection</span>`;
  $('#clear-topic').hidden = !state.topicId;
}

function renderTopics(study) {
  $('#topic-grid').innerHTML = study.topics.map((topic) => {
    const visible = topicMatchesCorpus(topic, state.corpus);
    const selected = state.topicId === topic.id;
    const nt = topic.links.filter((link) => link.canonical_id.startsWith('nt:')).length;
    const bom = topic.links.filter((link) => link.canonical_id.startsWith('bom:')).length;
    return `
      <button class="topic-card ${selected ? 'selected' : ''}" type="button" data-topic-id="${escapeHtml(topic.id)}" ${visible ? '' : 'hidden'}>
        <h3>${escapeHtml(titleCase(topic.label))}</h3>
        <div class="topic-card-meta"><span><strong>${formatNumber(topic.accepted_link_count)}</strong><br>accepted links</span><span>${nt ? `NT ${formatNumber(nt)}` : ''}${nt && bom ? ' · ' : ''}${bom ? `BOM ${formatNumber(bom)}` : ''}<br>source-attested</span></div>
      </button>
    `;
  }).join('');
  renderTopicSummary(study);
}

function renderTopicAudit(study) {
  const rows = study.topic_audit.map((row) => {
    const found = row.matched.length ? row.matched.map((match) => `${match.label} (${match.reference_count})`).join(', ') : 'not found';
    return `<div class="audit-item ${row.status === 'matched' ? '' : 'missing'}"><b>${escapeHtml(row.requested)}</b><br>${escapeHtml(found)}</div>`;
  }).join('');
  $('#topic-audit').innerHTML = `<details><summary>Taxonomy audit · what the accepted Guide did and did not call by these names</summary><div class="audit-grid">${rows}</div></details>`;
}

function renderCompare(study) {
  $('#compare-table').innerHTML = study.cross_corpus.map((row) => `
    <div class="compare-row">
      <strong>${escapeHtml(row.label)}</strong>
      <div><span>New Testament</span><p>${escapeHtml(row.nt_theme)}</p></div>
      <div><span>Book of Mormon</span><p>${escapeHtml(row.bom_theme)}</p></div>
    </div>
  `).join('');
}

function renderWarnings(study) {
  $('#warning-grid').innerHTML = study.application_warning_signs.map((warning) => `
    <div class="warning-card"><b>${escapeHtml(warning.label)}</b><p>${escapeHtml(warning.text)}</p><button type="button" data-scroll-theme="${escapeHtml(warning.theme_id)}">Read the scriptural pattern ↗</button></div>
  `).join('');
}

function renderMethodology(study) {
  const p = study.provenance;
  const cards = [
    { type: 'Bible graph', title: 'New Testament witness', source: p.bible_graph, detail: `${formatNumber(study.stats.source_graphs.bible.nodes.EVENT)} events · ${formatNumber(study.stats.source_graphs.bible.edges)} edges` },
    { type: 'Book of Mormon graph', title: 'Separate corpus, separate edges', source: p.book_of_mormon_graph, detail: `${formatNumber(study.stats.source_graphs.book_of_mormon.nodes.EVENT)} events · ${formatNumber(study.stats.source_graphs.book_of_mormon.canonical_edges)} canonical edges` },
    { type: 'Topical Guide', title: 'Accepted source-attested layer', source: p.topical_guide.base_export, detail: `${formatNumber(study.stats.topical_guide.topics)} topics · ${formatNumber(study.stats.topical_guide.accepted_source_attested_links)} source-attested links available` },
    { type: 'Modern source layer', title: 'White House primary records', source: { path: '9 official White House sources · URLs embedded in study.json', sha256: 'not applicable' }, detail: `${formatNumber(study.stats.modern_source_layer.primary_sources)} primary sources · ${formatNumber(study.stats.modern_source_layer.editorial_comparison_edges)} editorial comparison edges` },
  ];
  $('#methodology-grid').innerHTML = cards.map((card) => `
    <div class="method-card"><div class="method-type">${escapeHtml(card.type)}</div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.detail)}<br>${escapeHtml(card.source.path)}</p><div class="method-hash">sha ${escapeHtml(card.source.sha256)}</div></div>
  `).join('');
  const validation = study.validation;
  const badge = $('#validation-badge');
  badge.textContent = validation.passed ? `Validation passed · ${formatNumber(validation.nodes_used)} nodes / ${formatNumber(validation.edges_used)} edges` : 'Validation needs review';
  badge.classList.toggle('fail', !validation.passed);
  $('#generated-at').textContent = `Generated ${study.generated_at} · ${validation.broken_or_unresolved_references.length} broken references`;
  $('#method-modal-body').innerHTML = `
    <p class="modal-note">${escapeHtml(p.method.note)} ${escapeHtml(p.method.modern_layer_note)} This projection is deterministic apart from the generated-at timestamp. The page loads only this compact artifact, not the full graph bundles.</p>
    <div class="drawer-section"><h3>Source manifest</h3>${[p.bible_graph, p.book_of_mormon_graph, p.topical_guide.base_export, p.topical_guide.accepted_provenance_manifest, p.topical_guide.source_attested_relationships, p.topical_guide.current_supplemental_layer_manifest].map((source) => `
      <div class="modal-source"><b>${escapeHtml(source.path.split('/').slice(-1)[0])}</b><span>${escapeHtml(source.path)}</span><span>sha256 ${escapeHtml(source.sha256)}</span><span>${escapeHtml(source.source_commit || source.source_sha || source.release || source.gate || '')}${source.used_for_study === false ? ' · metadata only / excluded from evidence claims' : ''}</span></div>
    `).join('')}</div><div class="drawer-section"><h3>Modern primary sources</h3>${study.modern_sources.map((source) => `<div class="modal-source"><b>${escapeHtml(source.title)}</b><span>${escapeHtml(source.published)} · ${escapeHtml(source.document_type.replaceAll('_', ' '))}</span><span>${escapeHtml(source.source_family)} · ${escapeHtml(source.source_type)} · ${escapeHtml(source.administration)} administration</span><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">View official source ↗</a></div>`).join('')}</div>
    <div class="drawer-section"><h3>Validation report</h3><p class="modal-note">${formatNumber(validation.nodes_used)} nodes used · ${formatNumber(validation.edges_used)} edges used · ${formatNumber(validation.topics_used)} topics used · ${formatNumber(validation.scripture_references_used)} scripture references · zero broken or unresolved references.</p></div>
  `;
}

function openModal(dialog) {
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeModal(dialog) {
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

function openEvidence(themeId) {
  const theme = state.study.themes.find((item) => item.id === themeId);
  if (!theme) return;
  const allEdgeIds = [...new Set(theme.evidence.flatMap((item) => item.edge_ids))];
  const edgeRows = allEdgeIds.map((edgeId) => state.study.edges.find((edge) => edge.id === edgeId)).filter(Boolean);
  $('#evidence-modal-body').innerHTML = `
    <p class="eyebrow">Evidence drawer · ${escapeHtml(theme.number)}</p><h2>${escapeHtml(theme.title)}</h2><p class="modal-note">${escapeHtml(theme.dek)}</p>
    <div class="drawer-section"><h3>Data</h3>${theme.evidence.map((item) => `<div class="drawer-evidence"><b>${escapeHtml(item.label)}</b><span class="drawer-type">${escapeHtml(corpusLabel(item.corpus))} · ${escapeHtml(item.kind)}</span><span class="ref-line">${escapeHtml(refsFor(item, 20))}</span></div>`).join('')}</div>
    <div class="drawer-section"><h3>Observation</h3><p>${escapeHtml(theme.observation)}</p><h3>Interpretation</h3><p>${escapeHtml(theme.interpretation)}</p></div>
    <div class="drawer-section"><h3>Graph relationships</h3>${edgeRows.length ? edgeRows.map((edge) => `<div class="drawer-evidence"><b>${escapeHtml(edge.source_name)} → ${escapeHtml(edge.target_name)}</b><span class="drawer-type">${escapeHtml(edge.label)} · ${escapeHtml(edge.corpus)}</span><span class="ref-line">${escapeHtml(edge.formatted_references.join(' · ') || 'No locator on edge')}</span></div>`).join('') : '<p>No selected evidence edge; this is a node/range or topic-layer citation.</p>'}</div>
    <div class="drawer-section"><h3>Topic connections</h3><p>${theme.topics.map((topic) => `${titleCase(topic.label)} (${topic.accepted_link_count} accepted links)`).join(' · ')}</p></div>
  `;
  openModal($('#evidence-modal'));
}

function selectTopic(topicId) {
  state.topicId = state.topicId === topicId ? null : topicId;
  renderThemes(state.study);
  renderTopics(state.study);
  if (state.topicId) {
    const theme = state.study.themes.find((item) => item.topic_ids.includes(state.topicId));
    if (theme) window.setTimeout(() => document.getElementById(theme.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20);
  }
}

function shortLabel(label, max = 21) {
  const text = String(label || '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function nodeColor(node) {
  if (node.layer === 'MODERN_SOURCE') {
    if (node.type === 'MODERN_ROOT') return '#ed8668';
    if (node.type === 'MODERN_BRANCH') return '#e9bd76';
    return '#f2eee5';
  }
  if (node.layer === 'SCRIPTURAL_QUESTION') return '#72cfc2';
  if (node.layer === 'SCRIPTURE') return node.corpus === 'BOM' ? '#ac9be5' : '#72cfc2';
  if (node.type === 'PERSON') return '#72cfc2';
  if (node.type === 'GROUP') return '#ed8668';
  return '#e9bd76';
}

function graphLayout(nodes) {
  if (nodes.some((node) => node.layer === 'MODERN_SOURCE')) return comparisonGraphLayout(nodes);
  const positions = new Map();
  for (const corpus of ['NT', 'BOM']) {
    const corpusNodes = nodes.filter((node) => node.corpus === corpus);
    const entities = corpusNodes.filter((node) => node.type !== 'EVENT');
    const events = corpusNodes.filter((node) => node.type === 'EVENT');
    const entityX = corpus === 'NT' ? 105 : 755;
    const eventX = corpus === 'NT' ? 340 : 520;
    const entityStep = Math.min(80, 450 / Math.max(entities.length, 1));
    const eventStep = Math.min(56, 470 / Math.max(events.length, 1));
    entities.forEach((node, index) => positions.set(node.id, { x: entityX, y: 65 + index * entityStep }));
    events.forEach((node, index) => positions.set(node.id, { x: eventX, y: 46 + index * eventStep }));
  }
  return positions;
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
  const color = nodeColor(node);
  const selected = state.nodeId === node.id ? ' selected' : '';
  const labels = node.type === 'MODERN_ROOT' ? ['MAGA / AMERICA', 'FIRST'] : [shortLabel(node.label, node.type === 'EVENT' ? 18 : 21)];
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
  return `<g class="graph-node${layer}${selected}" data-node-id="${escapeXml(node.id)}" tabindex="0" role="button" aria-label="Inspect ${escapeXml(node.label)}">${shape}<text x="${position.x}" y="${labelStart}">${text}</text><text class="graph-corpus" x="${position.x}" y="${node.type === 'MODERN_ROOT' ? position.y + 19 : position.y + 44}">${escapeXml(node.layer === 'MODERN_SOURCE' ? 'MODERN SOURCE' : node.layer === 'SCRIPTURAL_QUESTION' ? 'SCRIPTURAL QUESTION' : node.corpus)}</text><title>${escapeXml(node.label)} · ${escapeXml(node.type)}</title></g>`;
}

function renderNetwork(study) {
  const svg = $('#network-svg');
  const network = study.comparison_network || study.visual_network;
  const visibleNodes = network.nodes.filter((node) => node.layer !== 'SCRIPTURE' || state.corpus === 'ALL' || node.corpus === state.corpus);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = network.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  const positions = graphLayout(visibleNodes);
  const selectedEdges = new Set(visibleEdges.filter((edge) => state.nodeId && (edge.source === state.nodeId || edge.target === state.nodeId)).map((edge) => edge.id));
  const lines = visibleEdges.map((edge) => {
    const a = positions.get(edge.source); const b = positions.get(edge.target);
    if (!a || !b) return '';
    const dim = state.nodeId && !selectedEdges.has(edge.id) ? ' dim' : '';
    const labelX = Math.round((a.x + b.x) / 2); const labelY = Math.round((a.y + b.y) / 2) - 3;
    const edgeClass = edge.layer === 'EDITORIAL_COMPARISON' ? ' comparison' : edge.layer === 'SCRIPTURAL_EVIDENCE' ? ' scriptural' : edge.layer === 'MODERN_SOURCE' ? ' modern-edge' : edge.layer === 'CANONICAL' ? ' canonical' : '';
    return `<line class="graph-edge ${edge.corpus === 'BOM' ? 'bom' : ''}${edgeClass}${dim}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/><text class="graph-edge-label" x="${labelX}" y="${labelY}">${escapeXml(shortLabel(edge.label, 19))}</text>`;
  }).join('');
  svg.innerHTML = `<defs><filter id="glow"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g>${lines}</g><g>${visibleNodes.map((node) => nodeSvg(node, positions.get(node.id))).join('')}</g>`;
  $('#network-filter-label').textContent = state.corpus === 'ALL' ? 'COMBINED · MODERN + SCRIPTURE' : `${corpusLabel(state.corpus).toUpperCase()} · MODERN + SCRIPTURE`;
  const modernEdges = visibleEdges.filter((edge) => edge.layer === 'MODERN_SOURCE').length;
  const comparisonEdges = visibleEdges.filter((edge) => edge.layer === 'EDITORIAL_COMPARISON' || edge.layer === 'SCRIPTURAL_EVIDENCE').length;
  const canonicalEdges = visibleEdges.filter((edge) => edge.layer === 'CANONICAL').length;
  $('#network-edge-count').textContent = `${formatNumber(modernEdges)} source · ${formatNumber(comparisonEdges)} interpretive · ${formatNumber(canonicalEdges)} canonical`;
  svg.querySelectorAll('[data-node-id]').forEach((node) => {
    node.addEventListener('click', () => selectNode(node.dataset.nodeId));
    node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') selectNode(node.dataset.nodeId); });
  });
}

function selectNode(nodeId) {
  state.nodeId = nodeId;
  renderNetwork(state.study);
  const network = state.study.comparison_network || state.study.visual_network;
  const node = network.nodes.find((item) => item.id === nodeId) || state.study.nodes.find((item) => item.id === nodeId);
  const actualNode = node?.scripture_node_id ? state.study.nodes.find((item) => item.id === node.scripture_node_id) : null;
  const canonicalEdgeIds = new Set(node?.canonical_edge_ids || []);
  const canonicalEdges = state.study.edges.filter((edge) => canonicalEdgeIds.has(edge.id) || (actualNode && (edge.source === actualNode.id || edge.target === actualNode.id)));
  const inspector = $('#network-inspector');
  if (!node) return;
  const source = node.source_id ? state.study.modern_sources.find((item) => item.id === node.source_id) : null;
  const branch = (source && state.study.modern_branches.find((item) => item.id === source.branch_id)) || (node.branch_id && state.study.modern_branches.find((item) => item.id === node.branch_id));
  const evidence = branch?.scriptural_evidence || [];
  const evidenceLinks = evidence.map((item) => `<button type="button" data-select-node="scripture:${escapeHtml(item.corpus)}:${escapeHtml(item.node_id)}">${escapeHtml(item.label)} <span>${escapeHtml(refsFor(item, 2))} ↗</span></button>`).join('');
  const edgeRows = canonicalEdges.slice(0, 8).map((edge) => `<div class="node-detail-item"><b>${escapeHtml(edge.label)}</b><span>${escapeHtml(edge.source === (actualNode?.id || nodeId) ? `→ ${edge.target_name}` : `← ${edge.source_name}`)}</span><small>${escapeHtml(edge.formatted_references.join(' · ') || 'No edge locator')}</small></div>`).join('');
  if (source && branch) {
    inspector.innerHTML = `<div class="inspector-kicker">MODERN SOURCE · PRIMARY</div><h3 class="node-detail-name">${escapeHtml(source.title)}</h3><p class="node-detail-type">${escapeHtml(source.published)} · ${escapeHtml(source.document_type.replaceAll('_', ' '))}</p><div class="inspector-block"><b>DOCUMENTED FACT</b><p>${escapeHtml(source.fact)}</p><blockquote>“${escapeHtml(source.excerpt)}”</blockquote><a class="source-button" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">VIEW OFFICIAL SOURCE ↗</a></div><div class="inspector-block"><b>SCRIPTURAL EVIDENCE</b><div class="inspector-links">${evidenceLinks}</div></div><div class="inspector-block"><b>THE COMPARISON</b><p>${escapeHtml(branch.comparison)}</p></div>`;
    return;
  }
  if (node.kind === 'modern-root' || node.kind === 'modern-branch' || node.kind === 'scriptural-question') {
    const root = node.kind === 'modern-root';
    const sourceText = root ? 'The modern source layer is grounded in official White House statements, proclamations, memoranda, and executive orders.' : branch?.sources.map((item) => item.fact).join(' ');
    const comparisonText = root ? state.study.modern_scope_note : branch?.comparison || node.question;
    const selectedEvidence = branch?.scriptural_evidence || state.study.modern_branches.flatMap((item) => item.scriptural_evidence).slice(0, 6);
    inspector.innerHTML = `<div class="inspector-kicker">${escapeHtml(root ? 'MODERN SOURCE LAYER' : node.kind === 'modern-branch' ? 'MODERN EVIDENCE BRANCH' : 'SCRIPTURAL QUESTION')}</div><h3 class="node-detail-name">${escapeHtml(node.label)}</h3><div class="inspector-block"><b>DOCUMENTED FACT</b><p>${escapeHtml(sourceText || 'This layer is a structured index of source records, not a claim about every individual in a movement.')}</p></div><div class="inspector-block"><b>SCRIPTURAL EVIDENCE</b><div class="inspector-links">${selectedEvidence.map((item) => `<button type="button" data-select-node="scripture:${escapeHtml(item.corpus)}:${escapeHtml(item.node_id)}">${escapeHtml(item.label)} <span>${escapeHtml(refsFor(item, 2))} ↗</span></button>`).join('')}</div></div><div class="inspector-block"><b>THE COMPARISON</b><p>${escapeHtml(comparisonText || '')}</p></div>`;
    return;
  }
  if (node.kind === 'scriptural-anchor' && actualNode) {
    const relatedBranches = state.study.modern_branches.filter((item) => item.scriptural_evidence.some((evidenceItem) => evidenceItem.node_id === actualNode.id && evidenceItem.corpus === actualNode.corpus));
    inspector.innerHTML = `<div class="inspector-kicker">${escapeHtml(actualNode.corpus)} · SCRIPTURAL EVIDENCE</div><h3 class="node-detail-name">${escapeHtml(actualNode.name)}</h3><div class="inspector-block"><b>DOCUMENTED FACT</b><p>Modern source records connect to this narrative only through an explicitly labeled interpretive comparison. No modern source is a canonical scripture relationship.</p></div><div class="inspector-block"><b>SCRIPTURAL EVIDENCE</b><p>${escapeHtml(refsFor(actualNode, 8))}</p><div class="node-detail-list">${edgeRows || '<div class="node-detail-item"><b>Selected node</b><span>No selected canonical edge in this curated neighborhood.</span></div>'}</div></div><div class="inspector-block"><b>THE COMPARISON</b>${relatedBranches.map((item) => `<p><strong>${escapeHtml(item.label)}</strong><br>${escapeHtml(item.comparison)}</p>`).join('') || '<p>This anchor is present as a bounded scriptural record; select a modern source or question to inspect an editorial connection.</p>'}</div>`;
    return;
  }
  const edges = state.study.edges.filter((edge) => edge.source === nodeId || edge.target === nodeId);
  inspector.innerHTML = `<div class="inspector-kicker">${escapeHtml(node.corpus || '')} · ${escapeHtml(node.type || '')}</div><h3 class="node-detail-name">${escapeHtml(node.name || node.label)}</h3><p>${node.references?.length ? escapeHtml(refsFor(node, 5)) : 'This node is represented through relationship edges and event context.'}</p><div class="node-detail-list">${edges.slice(0, 8).map((edge) => `<div class="node-detail-item"><b>${escapeHtml(edge.label)}</b><span>${escapeHtml(edge.source === nodeId ? `→ ${edge.target_name}` : `← ${edge.source_name}`)}</span><small>${escapeHtml(edge.formatted_references.join(' · ') || 'No edge locator')}</small></div>`).join('') || '<div class="node-detail-item"><b>Selected node</b><span>No selected edge in this curated network.</span></div>'}</div>`;
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    const openMethod = event.target.closest('[data-open-method]');
    if (openMethod) openModal($('#method-modal'));
    const close = event.target.closest('[data-close-modal]');
    if (close) closeModal(close.closest('dialog'));
    const evidence = event.target.closest('[data-open-evidence]');
    if (evidence) openEvidence(evidence.dataset.openEvidence);
    const selectedNode = event.target.closest('[data-select-node]');
    if (selectedNode) {
      selectNode(selectedNode.dataset.selectNode);
      document.querySelector('#network')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const topic = event.target.closest('[data-topic-id]');
    if (topic) selectTopic(topic.dataset.topicId);
    const scroll = event.target.closest('[data-scroll-theme]');
    if (scroll) document.getElementById(scroll.dataset.scrollTheme)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (event.target.closest('#clear-topic')) { state.topicId = null; renderThemes(state.study); renderTopics(state.study); }
    const share = event.target.closest('[data-share]');
    if (share) {
      const url = window.location.href.split('#')[0];
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(() => showToast('Study link copied.')).catch(() => showToast(url));
      else showToast(url);
    }
  });
  document.querySelectorAll('[data-corpus]').forEach((button) => button.addEventListener('click', () => {
    state.corpus = button.dataset.corpus;
    document.querySelectorAll('[data-corpus]').forEach((item) => item.classList.toggle('active', item === button));
    renderThemes(state.study); renderTopics(state.study); renderNetwork(state.study);
  }));
  ['method-modal', 'evidence-modal'].forEach((id) => $( `#${id}` ).addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeModal(event.currentTarget);
  }));
}

async function boot() {
  try {
    const response = await fetch('data/study.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`study.json returned ${response.status}`);
    state.study = await response.json();
    updateTopStats(state.study);
    renderHistoricalCaution(state.study);
    renderModernLayer(state.study);
    renderChapters(state.study);
    renderThemes(state.study);
    renderTopics(state.study);
    renderTopicAudit(state.study);
    renderCompare(state.study);
    renderWarnings(state.study);
    renderMethodology(state.study);
    renderNetwork(state.study);
    bindEvents();
  } catch (error) {
    console.error(error);
    document.body.innerHTML = `<main style="padding:40px;font-family:system-ui"><h1>Study data unavailable</h1><p>${escapeHtml(error.message)}</p></main>`;
  }
}

boot();
