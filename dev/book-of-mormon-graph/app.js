/**
 * Explorer QA Review Console - Frontend Controller
 * Pure client logic with review ledger write-back integration.
 */

// State
const state = {
  bundle: null,
  entitiesById: new Map(),
  entitiesByName: new Map(),
  entitiesList: [],
  flagshipPresets: [],
  currentTab: 'browser',
  reviews: {
    records: [],
    latestByTarget: {},
    historyByTarget: {},
    summary: {
      total_reviews: 0,
      distinct_targets: 0,
      entities_reviewed_count: 0,
      entities_by_judgment: {},
      pairs_reviewed_count: 0,
      associations_reviewed_count: 0,
      pm_flagged_count: 0,
      suspected_duplicates_count: 0,
      should_not_surface_count: 0,
    }
  },
  browser: {
    query: '',
    typeFilter: 'all',
    statusFilter: 'all',
    reviewFilter: 'all',
    sort: 'name_asc',
    page: 1,
    pageSize: 50,
  },
  inspector: {
    selectedEntityId: null,
    activeSubTab: 'scripture',
    activeNeighborKind: 'n-people',
  },
  compare: {
    entityIdA: null,
    entityIdB: null,
  },
  connections: {
    selectedEntityId: null,
    typeFilter: 'all',
    basisFilter: 'all',
    salienceFilter: 'all',
    sort: 'support_desc',
  },
};

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupTabNavigation();
  setupBrowserControls();
  setupInspectorControls();
  setupCompareControls();
  setupConnectionsControls();
  setupReviewModals();
  setupKeyboardShortcuts();
  window.addEventListener('hashchange', handleHashChange);

  try {
    await loadQABundle();
    populateDataLists();
    renderPresetsBar();
    await loadReviews();
    handleHashChange();
  } catch (err) {
    console.error('Failed to load QA bundle:', err);
    document.getElementById('meta-counts-badge').innerText = 'Error loading data';
    document.getElementById('meta-counts-badge').className = 'badge badge-warning';
  }
});

// Load QA Bundle
async function loadQABundle() {
  const resp = await fetch('./data/qa-bundle.json');
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} fetching bundle`);
  }
  const data = await resp.json();
  state.bundle = data;
  state.entitiesList = data.entities || [];
  state.flagshipPresets = data.flagship_presets || [];

  state.entitiesById.clear();
  state.entitiesByName.clear();
  for (const ent of state.entitiesList) {
    state.entitiesById.set(ent.entity_id, ent);
    state.entitiesByName.set(ent.display_name.toLowerCase(), ent);
  }

  const meta = data.meta || {};
  document.getElementById('meta-counts-badge').innerText = 
    `${meta.entity_count || state.entitiesList.length} Entities • ${meta.canonical_adjacency_count || 0} Canon • ${meta.derived_associations_count || 0} Derived`;
  document.getElementById('meta-counts-badge').className = 'badge badge-canonical';
}

// Load Review State
async function loadReviews() {
  // Read-only viewer mode: No review ledger server
  updateReviewProgressUI();
}

function updateReviewProgressUI() {
  const s = state.reviews.summary;
  const totalEnts = state.entitiesList.length || 1074;
  const totalAssocs = state.bundle?.meta?.derived_associations_count || 1285;

  document.getElementById('prog-entities').innerText = `${s.entities_reviewed_count || 0} / ${totalEnts}`;
  document.getElementById('prog-connections').innerText = `${s.associations_reviewed_count || 0} / ${totalAssocs}`;
  document.getElementById('prog-duplicates').innerText = s.suspected_duplicates_count || 0;
  document.getElementById('prog-suppress').innerText = s.should_not_surface_count || 0;
  document.getElementById('prog-pm').innerText = `🚩 ${s.pm_flagged_count || 0}`;
}

function populateDataLists() {
  const datalist = document.getElementById('entities-datalist');
  datalist.innerHTML = '';
  for (const ent of state.entitiesList) {
    const opt = document.createElement('option');
    opt.value = `${ent.display_name} (${ent.entity_id})`;
    datalist.appendChild(opt);
  }
}

// Preset Pills
function renderPresetsBar() {
  const bar = document.getElementById('presets-bar');
  bar.innerHTML = '<span class="presets-label">Flagship QA Presets:</span>';
  for (const preset of state.flagshipPresets) {
    const pill = document.createElement('button');
    pill.className = 'preset-pill';
    pill.innerText = preset.title;
    pill.title = preset.description || '';
    pill.addEventListener('click', () => applyPreset(preset));
    bar.appendChild(pill);
  }
}

function applyPreset(preset) {
  if (preset.category === 'flagship_single' && preset.primary_id) {
    switchTab('inspector');
    inspectEntity(preset.primary_id);
  } else if (preset.category === 'comparison_cluster') {
    switchTab('compare');
    const idA = preset.primary_id || preset.entity_ids?.[0];
    const idB = preset.secondary_id || preset.entity_ids?.[1];
    setCompareEntities(idA, idB);
  }
}

// Deep Linking / Routing
function handleHashChange() {
  const hash = window.location.hash.slice(1);
  if (!hash) {
    switchTab('browser');
    renderBrowserTable();
    return;
  }

  if (hash.startsWith('browser')) {
    switchTab('browser');
    renderBrowserTable();
  } else if (hash.startsWith('entity=')) {
    const id = hash.replace('entity=', '');
    switchTab('inspector');
    inspectEntity(id);
  } else if (hash.startsWith('compare=')) {
    const parts = hash.replace('compare=', '').split(',');
    switchTab('compare');
    setCompareEntities(parts[0], parts[1]);
  } else if (hash.startsWith('connections=')) {
    const id = hash.replace('connections=', '');
    switchTab('connections');
    inspectConnections(id);
  } else if (hash.startsWith('preset=')) {
    const presetId = hash.replace('preset=', '');
    const preset = state.flagshipPresets.find(p => p.id === presetId);
    if (preset) applyPreset(preset);
  }
}

function setUrlHash(newHash) {
  if (window.location.hash.slice(1) !== newHash) {
    history.pushState(null, '', `#${newHash}`);
  }
}

// Navigation Tabs
function setupTabNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
      if (tabName === 'browser') {
        setUrlHash('browser');
        renderBrowserTable();
      }
    });
  });
}

function switchTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.toggle('active', p.id === `pane-${tabName}`);
  });
}

// Helper: Resolve Entity ID from string
function resolveEntityId(input) {
  if (!input) return null;
  const str = input.trim();
  if (state.entitiesById.has(str)) return str;
  const idMatch = str.match(/\(([^)]+)\)$/);
  if (idMatch && state.entitiesById.has(idMatch[1])) {
    return idMatch[1];
  }
  const byName = state.entitiesByName.get(str.toLowerCase());
  if (byName) return byName.entity_id;
  return null;
}

// -------------------------------------------------------------
// TAB 1: ENTITY BROWSER
// -------------------------------------------------------------
function setupBrowserControls() {
  const searchInput = document.getElementById('browser-search');
  const typeFilter = document.getElementById('browser-type-filter');
  const statusFilter = document.getElementById('browser-status-filter');
  const reviewFilter = document.getElementById('browser-review-filter');
  const sortSelect = document.getElementById('browser-sort');
  const resetBtn = document.getElementById('browser-reset-btn');
  const prevBtn = document.getElementById('browser-prev-btn');
  const nextBtn = document.getElementById('browser-next-btn');

  const onFilterChange = () => {
    state.browser.query = searchInput.value.toLowerCase().trim();
    state.browser.typeFilter = typeFilter.value;
    state.browser.statusFilter = statusFilter.value;
    state.browser.reviewFilter = reviewFilter.value;
    state.browser.sort = sortSelect.value;
    state.browser.page = 1;
    renderBrowserTable();
  };

  searchInput.addEventListener('input', onFilterChange);
  typeFilter.addEventListener('change', onFilterChange);
  statusFilter.addEventListener('change', onFilterChange);
  reviewFilter.addEventListener('change', onFilterChange);
  sortSelect.addEventListener('change', onFilterChange);

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    typeFilter.value = 'all';
    statusFilter.value = 'all';
    reviewFilter.value = 'all';
    sortSelect.value = 'name_asc';
    onFilterChange();
  });

  prevBtn.addEventListener('click', () => {
    if (state.browser.page > 1) {
      state.browser.page--;
      renderBrowserTable();
    }
  });

  nextBtn.addEventListener('click', () => {
    state.browser.page++;
    renderBrowserTable();
  });
}

function getFilteredEntities() {
  const { query, typeFilter, statusFilter, reviewFilter, sort } = state.browser;
  
  let list = state.entitiesList.filter(ent => {
    if (typeFilter !== 'all' && ent.entity_type !== typeFilter) return false;

    if (statusFilter === 'scripture' && !ent.is_scripture_backed) return false;
    if (statusFilter === 'speaker' && !ent.is_speaker_only) return false;
    if (statusFilter === 'source_only' && !ent.is_source_only) return false;

    const rev = state.reviews.latestByTarget[ent.entity_id];
    if (reviewFilter === 'unreviewed' && rev) return false;
    if (reviewFilter === 'reviewed' && !rev) return false;
    if (reviewFilter === 'pm_flagged' && (!rev || !rev.flag_for_pm_review)) return false;
    if (reviewFilter === 'hide_recommended' && (!rev || rev.visibility_recommendation !== 'Hide')) return false;
    if (reviewFilter === 'presentation_issues' && (!rev || !rev.presentation_flags?.length)) return false;
    if (['Healthy', 'Suspected duplicate', 'Source artifact', 'Generic unnamed reference', 'Event-bounded distinct entity', 'Ambiguous'].includes(reviewFilter)) {
      if (!rev || rev.judgment !== reviewFilter) return false;
    }

    if (query) {
      const matchId = ent.entity_id.toLowerCase().includes(query);
      const matchName = ent.display_name.toLowerCase().includes(query);
      const matchAlias = ent.aliases?.some(a => a.toLowerCase().includes(query));
      if (!matchId && !matchName && !matchAlias) return false;
    }

    return true;
  });

  // Sort
  list.sort((a, b) => {
    if (sort === 'name_asc') return a.display_name.localeCompare(b.display_name);
    if (sort === 'id_asc') return a.entity_id.localeCompare(b.entity_id);
    if (sort === 'scripture_desc') return b.exact_scripture_count - a.exact_scripture_count;
    if (sort === 'derived_desc') return b.derived_neighbor_count - a.derived_neighbor_count;
    if (sort === 'canonical_desc') return b.canonical_neighbor_count - a.canonical_neighbor_count;
    return 0;
  });

  return list;
}

function renderBrowserTable() {
  const filtered = getFilteredEntities();
  const total = filtered.length;
  const { page, pageSize } = state.browser;
  const startIdx = (page - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);

  // Update Stats Bar
  document.getElementById('stat-total-matching').innerText = total;
  document.getElementById('stat-people-count').innerText = filtered.filter(e => e.entity_type === 'person').length;
  document.getElementById('stat-places-count').innerText = filtered.filter(e => e.entity_type === 'place').length;
  document.getElementById('stat-groups-count').innerText = filtered.filter(e => e.entity_type === 'group').length;
  document.getElementById('stat-events-count').innerText = filtered.filter(e => e.entity_type === 'event').length;
  document.getElementById('stat-scripture-count').innerText = filtered.filter(e => e.is_scripture_backed).length;
  document.getElementById('stat-sourceonly-count').innerText = filtered.filter(e => e.is_source_only).length;

  document.getElementById('browser-page-info').innerText = 
    total > 0 ? `Showing ${startIdx + 1} - ${Math.min(startIdx + pageSize, total)} of ${total}` : 'No matching entities';

  document.getElementById('browser-prev-btn').disabled = page <= 1;
  document.getElementById('browser-next-btn').disabled = startIdx + pageSize >= total;

  const tbody = document.getElementById('browser-table-body');
  if (pageItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">No matching entities found.</td></tr>';
    return;
  }

  tbody.innerHTML = pageItems.map(ent => {
    let statusBadge = '<span class="badge badge-canonical">Scripture-Backed</span>';
    if (ent.is_speaker_only) {
      statusBadge = '<span class="badge badge-derived">Speaker Only</span>';
    } else if (ent.is_source_only) {
      statusBadge = '<span class="badge badge-warning">⚠️ Source-Only / Chron</span>';
    }

    const locRange = ent.first_scripture_locator 
      ? `${ent.first_scripture_locator} → ${ent.last_scripture_locator}`
      : (ent.is_speaker_only ? `<span style="color: #60a5fa;">Speaker: ${ent.first_speaker_locator || 'Identified'}</span>` : '<span style="color: #f87171;">None (Source-Only)</span>');

    const aliasesSnippet = ent.aliases?.length 
      ? `<div style="color: var(--text-muted); font-size: 11px;">Aliases: ${ent.aliases.slice(0, 3).join(', ')}${ent.aliases.length > 3 ? '...' : ''}</div>`
      : '';

    // Review Badge
    const rev = state.reviews.latestByTarget[ent.entity_id];
    let reviewBadge = '<span class="badge badge-neutral">Unreviewed</span>';
    if (rev) {
      let bClass = 'badge-rev-healthy';
      if (rev.judgment === 'Suspected duplicate') bClass = 'badge-rev-duplicate';
      else if (rev.judgment === 'Source artifact') bClass = 'badge-rev-source';
      else if (rev.judgment === 'Ambiguous') bClass = 'badge-rev-ambiguous';

      const pmFlag = rev.flag_for_pm_review ? '<span class="badge badge-rev-pm">🚩 PM</span>' : '';
      reviewBadge = `<div style="display: flex; gap: 4px; align-items: center;"><span class="badge ${bClass}">${escapeHtml(rev.judgment)}</span>${pmFlag}</div>`;
    }

    return `
      <tr>
        <td>
          <span class="code-id" onclick="copyToClipboard('${ent.entity_id}')" title="Click to copy ID">
            ${ent.entity_id}
          </span>
        </td>
        <td><span class="badge badge-${ent.entity_type}">${ent.entity_type}</span></td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(ent.display_name)}</div>
          ${aliasesSnippet}
        </td>
        <td style="font-weight: 600; text-align: center;">${ent.exact_scripture_count}</td>
        <td style="font-size: 12px; font-family: var(--font-mono);">${locRange}</td>
        <td style="text-align: center;">
          <span class="badge badge-derived" title="Derived neighbors">${ent.derived_neighbor_count}</span>
          <span class="badge badge-canonical" title="Canonical relations">${ent.canonical_neighbor_count}</span>
        </td>
        <td>${statusBadge}</td>
        <td>${reviewBadge}</td>
        <td>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-sm btn-review" onclick="openEntityReviewModal('${ent.entity_id}')">Review</button>
            <button class="btn btn-sm" onclick="navigateToInspect('${ent.entity_id}')">Inspect</button>
            <button class="btn btn-sm" onclick="navigateToCompare('${ent.entity_id}')">Compare</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------
// TAB 2: ENTITY INSPECTOR
// -------------------------------------------------------------
function setupInspectorControls() {
  const input = document.getElementById('inspector-entity-input');
  const loadBtn = document.getElementById('inspector-load-btn');
  const reviewBtn = document.getElementById('inspector-review-btn');
  const copyLinkBtn = document.getElementById('inspector-copy-link-btn');
  const compareBtn = document.getElementById('inspector-compare-btn');
  const connBtn = document.getElementById('inspector-connections-btn');

  loadBtn.addEventListener('click', () => {
    const id = resolveEntityId(input.value);
    if (id) {
      inspectEntity(id);
      setUrlHash(`entity=${id}`);
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const id = resolveEntityId(input.value);
      if (id) {
        inspectEntity(id);
        setUrlHash(`entity=${id}`);
      }
    }
  });

  reviewBtn?.addEventListener('click', () => {
    if (state.inspector.selectedEntityId) {
      openEntityReviewModal(state.inspector.selectedEntityId);
    }
  });

  copyLinkBtn.addEventListener('click', () => {
    if (state.inspector.selectedEntityId) {
      const url = `${window.location.origin}${window.location.pathname}#entity=${state.inspector.selectedEntityId}`;
      copyToClipboard(url, 'Deep link copied to clipboard!');
    }
  });

  compareBtn.addEventListener('click', () => {
    if (state.inspector.selectedEntityId) {
      navigateToCompare(state.inspector.selectedEntityId);
    }
  });

  connBtn.addEventListener('click', () => {
    if (state.inspector.selectedEntityId) {
      navigateToConnections(state.inspector.selectedEntityId);
    }
  });

  // Evidence Subtabs
  document.querySelectorAll('.sub-tab-btn[data-subtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const subtab = btn.dataset.subtab;
      if (subtab.startsWith('n-')) {
        document.querySelectorAll('.sub-tab-btn[data-subtab^="n-"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.sub-pane[id^="subpane-n-"]').forEach(p => p.classList.remove('active'));
        document.getElementById(`subpane-${subtab}`)?.classList.add('active');
      } else {
        document.querySelectorAll('.sub-tab-btn:not([data-subtab^="n-"])').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.sub-pane:not([id^="subpane-n-"])').forEach(p => p.classList.remove('active'));
        document.getElementById(`subpane-${subtab}`)?.classList.add('active');
      }
    });
  });
}

function inspectEntity(entityId) {
  const entity = state.entitiesById.get(entityId);
  if (!entity) return;

  state.inspector.selectedEntityId = entityId;
  document.getElementById('inspector-entity-input').value = `${entity.display_name} (${entity.entity_id})`;

  // Header Card
  const typeBadge = document.getElementById('insp-type-badge');
  typeBadge.className = `badge badge-${entity.entity_type}`;
  typeBadge.innerText = entity.entity_type.toUpperCase();

  const statusBadge = document.getElementById('insp-status-badge');
  if (entity.is_scripture_backed) {
    statusBadge.className = 'badge badge-canonical';
    statusBadge.innerText = `Scripture-Backed (${entity.exact_scripture_count} verses)`;
  } else if (entity.is_speaker_only) {
    statusBadge.className = 'badge badge-derived';
    statusBadge.innerText = `Speaker-Only (${entity.speaker_attribution_count} verses)`;
  } else {
    statusBadge.className = 'badge badge-warning';
    statusBadge.innerText = '⚠️ Source-Only / Chronology';
  }

  // Review Status
  const rev = state.reviews.latestByTarget[entity.entity_id];
  const revBadge = document.getElementById('insp-review-badge');
  const pmBadge = document.getElementById('insp-pm-badge');

  if (rev) {
    let bClass = 'badge-rev-healthy';
    if (rev.judgment === 'Suspected duplicate') bClass = 'badge-rev-duplicate';
    else if (rev.judgment === 'Source artifact') bClass = 'badge-rev-source';
    else if (rev.judgment === 'Ambiguous') bClass = 'badge-rev-ambiguous';
    revBadge.className = `badge ${bClass}`;
    revBadge.innerText = `Review: ${rev.judgment}`;
    pmBadge.style.display = rev.flag_for_pm_review ? 'inline-flex' : 'none';
  } else {
    revBadge.className = 'badge badge-neutral';
    revBadge.innerText = 'Unreviewed';
    pmBadge.style.display = 'none';
  }

  document.getElementById('insp-id-badge').innerText = entity.entity_id;
  document.getElementById('insp-id-badge').onclick = () => copyToClipboard(entity.entity_id);
  document.getElementById('insp-display-name').innerText = entity.display_name;

  const aliasesText = entity.aliases?.length ? `Aliases & Safe Forms: ${entity.aliases.join(' • ')}` : 'No known aliases';
  document.getElementById('insp-aliases-row').innerText = aliasesText;

  // 1. Identity & Type Record
  const typeRec = entity.type_record || {};
  let recDetailsHtml = '<table style="width:100%; border-collapse: collapse;">';
  for (const [k, v] of Object.entries(typeRec)) {
    if (k === 'entity_id' || k === 'display_name') continue;
    const valStr = typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v);
    recDetailsHtml += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 4px 6px; font-weight: 600; color: var(--text-secondary); width: 35%; font-family: var(--font-mono); font-size: 11px;">${escapeHtml(k)}</td>
        <td style="padding: 4px 6px; font-family: var(--font-mono); font-size: 11px; word-break: break-all;">${escapeHtml(valStr)}</td>
      </tr>
    `;
  }
  recDetailsHtml += '</table>';
  document.getElementById('insp-identity-body').innerHTML = recDetailsHtml;

  // 2. Canonical Relationships
  const canonList = entity.canonical_relationships || [];
  document.getElementById('insp-canon-count-badge').innerText = `${canonList.length} Claims`;
  if (canonList.length === 0) {
    document.getElementById('insp-canonical-body').innerHTML = '<p style="color: var(--text-muted); font-size: 12px;">No canonical relationships recorded for this entity.</p>';
  } else {
    document.getElementById('insp-canonical-body').innerHTML = canonList.map(c => `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 8px 10px; border-radius: 6px; margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span class="badge badge-canonical">${escapeHtml(c.predicate)}</span>
            <span style="font-weight: 600; margin-left: 6px; cursor: pointer; color: #38bdf8;" onclick="inspectEntity('${c.neighbor_id}')">${escapeHtml(c.neighbor_name)}</span>
            <span class="code-id" onclick="copyToClipboard('${c.neighbor_id}')">${c.neighbor_id}</span>
          </div>
          <span style="font-size: 11px; color: var(--text-muted);">${c.direction} (${c.approval_basis})</span>
        </div>
      </div>
    `).join('');
  }

  // Render Review History
  const history = state.reviews.historyByTarget[entity.entity_id] || [];
  const historyBody = document.getElementById('insp-review-history-body');
  if (history.length === 0) {
    historyBody.innerHTML = '<p style="color: var(--text-muted);">No review records recorded yet.</p>';
  } else {
    historyBody.innerHTML = history.slice().reverse().map((h, idx) => `
      <div class="history-entry">
        <div style="display: flex; justify-content: space-between; font-weight: 600;">
          <span>${idx === 0 ? '🟢 Latest: ' : '⚪ Prior: '}<strong>${escapeHtml(h.judgment)}</strong> (${escapeHtml(h.visibility_recommendation || 'Show')})</span>
          <span style="color: var(--text-muted);">${new Date(h.reviewed_at).toLocaleTimeString()}</span>
        </div>
        ${h.presentation_flags?.length ? `<div style="color: #fbbf24; font-size: 11px;">Flags: ${h.presentation_flags.join(', ')}</div>` : ''}
        ${h.note ? `<div style="font-style: italic; color: var(--text-primary); margin-top: 2px;">"${escapeHtml(h.note)}"</div>` : ''}
        <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">By: ${escapeHtml(h.reviewer)} • ${h.review_id}</div>
      </div>
    `).join('');
  }

  // 3. Evidence Lists (Scripture, Speaker, Internal)
  const exactPassages = entity.exact_passages || [];
  const speakerPassages = entity.speaker_passages || [];
  const internalMentions = entity.internal_mentions || [];

  document.getElementById('subtab-btn-scripture').innerText = `Exact Scripture (${exactPassages.length})`;
  document.getElementById('subtab-btn-speaker').innerText = `Speaker Attributions (${speakerPassages.length})`;
  document.getElementById('subtab-btn-internal').innerText = `⚠️ Internal Locators (${internalMentions.length})`;

  // Scripture list
  if (exactPassages.length === 0) {
    document.getElementById('insp-scripture-list').innerHTML = '<p style="color: var(--text-muted); font-size: 12px;">No exact scripture passage annotations.</p>';
  } else {
    document.getElementById('insp-scripture-list').innerHTML = exactPassages.map(p => `
      <div class="verse-item">
        <div class="verse-header">
          <span>${escapeHtml(p.locator)}</span>
          <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${escapeHtml(p.source_id || '')}</span>
        </div>
        <div class="verse-quote">${p.matched_text ? `Matched Text: "${escapeHtml(p.matched_text)}"` : 'Exact Mention'}</div>
      </div>
    `).join('');
  }

  // Speaker list
  if (speakerPassages.length === 0) {
    document.getElementById('insp-speaker-list').innerHTML = '<p style="color: var(--text-muted); font-size: 12px;">No speaker attributions recorded.</p>';
  } else {
    document.getElementById('insp-speaker-list').innerHTML = speakerPassages.map(p => `
      <div class="verse-item">
        <div class="verse-header">
          <span>${escapeHtml(p.locator)}</span>
          <span style="font-size: 11px; color: #38bdf8;">Speaker: ${escapeHtml(p.speaker_id || '')}</span>
        </div>
        <div class="verse-quote">${p.speaker_segment_excerpt ? `"${escapeHtml(p.speaker_segment_excerpt)}..."` : 'Identified as speaker'}</div>
      </div>
    `).join('');
  }

  // Internal Locators list
  if (internalMentions.length === 0) {
    document.getElementById('insp-internal-list').innerHTML = '<p style="color: var(--text-muted); font-size: 12px;">No internal/source locators recorded.</p>';
  } else {
    document.getElementById('insp-internal-list').innerHTML = internalMentions.map(m => `
      <div class="verse-item" style="border-left: 3px solid #f87171;">
        <div class="verse-header" style="color: #f87171;">
          <span>${escapeHtml(m.source_locator || 'Internal')}</span>
          <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${escapeHtml(m.source_id || '')}</span>
        </div>
        <div style="font-size: 12px; margin-top: 4px;">
          ${m.matched_text ? `Matched: <strong>${escapeHtml(m.matched_text)}</strong>` : ''}
          ${m.provenance_pointer ? `<span style="color: var(--text-muted); margin-left: 8px;">(${escapeHtml(m.provenance_pointer)})</span>` : ''}
        </div>
      </div>
    `).join('');
  }

  // 4. Connected Entities by Kind
  const kinds = entity.connected_entities_by_kind || { person: [], place: [], group: [], event: [] };
  document.getElementById('subtab-btn-n-people').innerText = `People (${kinds.person?.length || 0})`;
  document.getElementById('subtab-btn-n-places').innerText = `Places (${kinds.place?.length || 0})`;
  document.getElementById('subtab-btn-n-groups').innerText = `Groups (${kinds.group?.length || 0})`;
  document.getElementById('subtab-btn-n-events').innerText = `Events (${kinds.event?.length || 0})`;
  document.getElementById('insp-deriv-count-badge').innerText = `${entity.total_neighbor_count} Neighbors`;

  const renderNeighborKindList = (items) => {
    if (!items || items.length === 0) return '<p style="color: var(--text-muted); font-size: 12px;">None.</p>';
    return items.map(item => `
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 6px 10px; border-radius: 6px; margin-bottom: 4px;">
        <div>
          <span style="font-weight: 600; cursor: pointer; color: #38bdf8;" onclick="inspectEntity('${item.neighbor_id}')">${escapeHtml(item.neighbor_name)}</span>
          <span class="code-id" onclick="copyToClipboard('${item.neighbor_id}')">${item.neighbor_id}</span>
        </div>
        <div>
          ${item.canonical 
            ? `<span class="badge badge-canonical">${escapeHtml(item.relation)}</span>` 
            : `<span class="badge badge-derived">${escapeHtml(item.relation)} (sup=${item.support_count || 1})</span>`}
        </div>
      </div>
    `).join('');
  };

  document.getElementById('insp-n-people-list').innerHTML = renderNeighborKindList(kinds.person);
  document.getElementById('insp-n-places-list').innerHTML = renderNeighborKindList(kinds.place);
  document.getElementById('insp-n-groups-list').innerHTML = renderNeighborKindList(kinds.group);
  document.getElementById('insp-n-events-list').innerHTML = renderNeighborKindList(kinds.event);
}

// -------------------------------------------------------------
// TAB 3: SIDE-BY-SIDE COMPARE & PAIR REVIEW
// -------------------------------------------------------------
function setupCompareControls() {
  const inputA = document.getElementById('compare-entity-a');
  const inputB = document.getElementById('compare-entity-b');
  const runBtn = document.getElementById('compare-run-btn');
  const swapBtn = document.getElementById('compare-swap-btn');
  const copyLinkBtn = document.getElementById('compare-copy-link-btn');
  const savePairBtn = document.getElementById('save-pair-review-btn');

  runBtn.addEventListener('click', () => {
    const idA = resolveEntityId(inputA.value);
    const idB = resolveEntityId(inputB.value);
    if (idA && idB) {
      setCompareEntities(idA, idB);
      setUrlHash(`compare=${idA},${idB}`);
    }
  });

  swapBtn.addEventListener('click', () => {
    const valA = inputA.value;
    inputA.value = inputB.value;
    inputB.value = valA;
    const idA = resolveEntityId(inputA.value);
    const idB = resolveEntityId(inputB.value);
    if (idA && idB) {
      setCompareEntities(idA, idB);
      setUrlHash(`compare=${idA},${idB}`);
    }
  });

  copyLinkBtn.addEventListener('click', () => {
    if (state.compare.entityIdA && state.compare.entityIdB) {
      const url = `${window.location.origin}${window.location.pathname}#compare=${state.compare.entityIdA},${state.compare.entityIdB}`;
      copyToClipboard(url, 'Compare deep link copied!');
    }
  });

  savePairBtn?.addEventListener('click', async () => {
    const idA = state.compare.entityIdA;
    const idB = state.compare.entityIdB;
    if (!idA || !idB) return;

    const judgment = document.querySelector('input[name="pair-judgment"]:checked')?.value || 'Keep distinct';
    const note = document.getElementById('pair-note-input').value.trim();
    const pmFlag = document.getElementById('pair-pm-flag').checked;

    const payload = {
      target_type: 'entity_pair',
      entity_ids: [idA, idB],
      judgment: judgment,
      note: note,
      flag_for_pm_review: pmFlag,
      reviewer: 'owner',
    };

    try {
      const resp = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        const res = await resp.json();
        state.reviews.latestByTarget = res.latest_by_target;
        state.reviews.summary = res.summary;
        updateReviewProgressUI();
        renderPairReviewState(idA, idB);
        alert('Pair review successfully recorded in append-only ledger!');
      } else {
        const err = await resp.json();
        alert(`Error saving pair review: ${err.error || 'Unknown error'}`);
      }
    } catch (e) {
      alert(`Failed to save review: ${e}`);
    }
  });
}

function setCompareEntities(idA, idB) {
  const entA = state.entitiesById.get(idA);
  const entB = state.entitiesById.get(idB);
  if (!entA || !entB) return;

  state.compare.entityIdA = idA;
  state.compare.entityIdB = idB;

  document.getElementById('compare-entity-a').value = `${entA.display_name} (${entA.entity_id})`;
  document.getElementById('compare-entity-b').value = `${entB.display_name} (${entB.entity_id})`;

  // Calculate Overlap Metrics
  const passagesA = new Set(entA.exact_passage_locators || []);
  const passagesB = new Set(entB.exact_passage_locators || []);
  const sharedPassages = [...passagesA].filter(p => passagesB.has(p));

  const minPassages = Math.min(passagesA.size, passagesB.size);
  const unionPassages = new Set([...passagesA, ...passagesB]).size;
  const passageMinRatio = minPassages > 0 ? (sharedPassages.length / minPassages) : 0.0;
  const passageJaccard = unionPassages > 0 ? (sharedPassages.length / unionPassages) : 0.0;

  // Neighbors overlap
  const neighborsA = new Set(entA.connection_rows?.map(c => c.neighbor_id) || []);
  const neighborsB = new Set(entB.connection_rows?.map(c => c.neighbor_id) || []);
  const sharedNeighbors = [...neighborsA].filter(n => neighborsB.has(n));
  const unionNeighbors = new Set([...neighborsA, ...neighborsB]).size;
  const neighborJaccard = unionNeighbors > 0 ? (sharedNeighbors.length / unionNeighbors) : 0.0;

  // Update Metrics Banner
  document.getElementById('metric-shared-passages').innerText = sharedPassages.length;
  document.getElementById('metric-passage-min-ratio').innerText = passageMinRatio.toFixed(3);
  document.getElementById('metric-passage-jaccard').innerText = passageJaccard.toFixed(3);
  document.getElementById('metric-shared-neighbors').innerText = sharedNeighbors.length;
  document.getElementById('metric-neighbor-jaccard').innerText = neighborJaccard.toFixed(3);

  // Render Side-by-side details
  const renderCompareCard = (ent, labelColor) => `
    <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="badge badge-${ent.entity_type}">${ent.entity_type}</span>
        <span class="code-id" onclick="copyToClipboard('${ent.entity_id}')">${ent.entity_id}</span>
      </div>
      <h2 style="font-size: 18px; margin-top: 6px; color: ${labelColor};">${escapeHtml(ent.display_name)}</h2>
      <div style="font-size: 12px; color: var(--text-muted);">${ent.aliases?.length ? `Aliases: ${ent.aliases.join(', ')}` : 'No aliases'}</div>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <tr><td style="color: var(--text-muted); padding: 4px 0;">Evidence Status:</td><td style="font-weight: 600;">${ent.is_scripture_backed ? 'Scripture-Backed' : (ent.is_speaker_only ? 'Speaker-Only' : '⚠️ Source-Only / Chron')}</td></tr>
      <tr><td style="color: var(--text-muted); padding: 4px 0;">Scripture Passages:</td><td style="font-weight: 600;">${ent.exact_scripture_count}</td></tr>
      <tr><td style="color: var(--text-muted); padding: 4px 0;">First Locator:</td><td style="font-family: var(--font-mono);">${ent.first_scripture_locator || 'None'}</td></tr>
      <tr><td style="color: var(--text-muted); padding: 4px 0;">Last Locator:</td><td style="font-family: var(--font-mono);">${ent.last_scripture_locator || 'None'}</td></tr>
      <tr><td style="color: var(--text-muted); padding: 4px 0;">Internal Locators:</td><td>${ent.internal_mention_count}</td></tr>
      <tr><td style="color: var(--text-muted); padding: 4px 0;">Derived Neighbors:</td><td>${ent.derived_neighbor_count}</td></tr>
      <tr><td style="color: var(--text-muted); padding: 4px 0;">Canonical Relations:</td><td>${ent.canonical_neighbor_count}</td></tr>
    </table>
  `;

  document.getElementById('compare-body-a').innerHTML = renderCompareCard(entA, '#38bdf8');
  document.getElementById('compare-body-b').innerHTML = renderCompareCard(entB, '#c084fc');

  // Shared Passages List
  document.getElementById('compare-shared-p-badge').innerText = sharedPassages.length;
  if (sharedPassages.length === 0) {
    document.getElementById('compare-shared-passages-list').innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">No shared exact scripture passages.</p>';
  } else {
    document.getElementById('compare-shared-passages-list').innerHTML = sharedPassages.map(loc => `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 6px 10px; border-radius: 4px; margin-bottom: 4px; font-family: var(--font-mono); font-size: 12px; color: #4ade80;">
        ✓ ${escapeHtml(loc)}
      </div>
    `).join('');
  }

  // Shared Neighbors List
  document.getElementById('compare-shared-n-badge').innerText = sharedNeighbors.length;
  if (sharedNeighbors.length === 0) {
    document.getElementById('compare-shared-neighbors-list').innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">No overlapping connected neighbors.</p>';
  } else {
    document.getElementById('compare-shared-neighbors-list').innerHTML = sharedNeighbors.map(nId => {
      const nEnt = state.entitiesById.get(nId);
      const name = nEnt ? nEnt.display_name : nId;
      const type = nEnt ? nEnt.entity_type : 'unknown';
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 6px 10px; border-radius: 4px; margin-bottom: 4px;">
          <div>
            <span class="badge badge-${type}">${type}</span>
            <span style="font-weight: 600; margin-left: 6px; cursor: pointer; color: #38bdf8;" onclick="inspectEntity('${nId}')">${escapeHtml(name)}</span>
            <span class="code-id" onclick="copyToClipboard('${nId}')">${nId}</span>
          </div>
          <span class="badge badge-canonical">Shared</span>
        </div>
      `;
    }).join('');
  }

  renderPairReviewState(idA, idB);
}

function renderPairReviewState(idA, idB) {
  const sortedIds = [idA, idB].sort();
  const pairTargetId = `pair:${sortedIds[0]}:${sortedIds[1]}`;
  const latest = state.reviews.latestByTarget[pairTargetId];
  const history = state.reviews.historyByTarget[pairTargetId] || [];

  const badge = document.getElementById('pair-review-status-badge');
  if (badge) {
    if (latest) {
      badge.className = 'badge badge-rev-healthy';
      badge.innerText = `Reviewed: ${latest.judgment}`;
      const radio = document.querySelector(`input[name="pair-judgment"][value="${latest.judgment}"]`);
      if (radio) radio.checked = true;
      const noteInput = document.getElementById('pair-note-input');
      if (noteInput) noteInput.value = latest.note || '';
      const pmFlag = document.getElementById('pair-pm-flag');
      if (pmFlag) pmFlag.checked = Boolean(latest.flag_for_pm_review);
    } else {
      badge.className = 'badge badge-neutral';
      badge.innerText = 'Unreviewed Pair';
    }
  }

  const histPanel = document.getElementById('pair-history-body');
  if (histPanel) {
    if (history.length === 0) {
      histPanel.innerHTML = '<p style="color: var(--text-muted);">No prior reviews for this pair.</p>';
    } else {
      histPanel.innerHTML = history.slice().reverse().map((h, idx) => `
        <div class="history-entry">
          <div style="display: flex; justify-content: space-between; font-weight: 600;">
            <span>${idx === 0 ? '🟢 Latest: ' : '⚪ Prior: '}<strong>${escapeHtml(h.judgment)}</strong></span>
            <span style="color: var(--text-muted);">${new Date(h.reviewed_at).toLocaleTimeString()}</span>
          </div>
          ${h.note ? `<div style="font-style: italic; margin-top: 2px;">"${escapeHtml(h.note)}"</div>` : ''}
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">By: ${escapeHtml(h.reviewer)} • ${h.review_id}</div>
        </div>
      `).join('');
    }
  }
}

// -------------------------------------------------------------
// TAB 4: CONNECTION INSPECTOR
// -------------------------------------------------------------
function setupConnectionsControls() {
  const input = document.getElementById('connections-entity-input');
  const loadBtn = document.getElementById('connections-load-btn');
  const typeFilter = document.getElementById('connections-type-filter');
  const basisFilter = document.getElementById('connections-basis-filter');
  const salienceFilter = document.getElementById('connections-salience-filter');
  const sortSelect = document.getElementById('connections-sort');
  const copyLinkBtn = document.getElementById('connections-copy-link-btn');

  const onFilter = () => {
    state.connections.typeFilter = typeFilter.value;
    state.connections.basisFilter = basisFilter.value;
    state.connections.salienceFilter = salienceFilter.value;
    state.connections.sort = sortSelect.value;
    renderConnectionsTable();
  };

  loadBtn.addEventListener('click', () => {
    const id = resolveEntityId(input.value);
    if (id) {
      inspectConnections(id);
      setUrlHash(`connections=${id}`);
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const id = resolveEntityId(input.value);
      if (id) {
        inspectConnections(id);
        setUrlHash(`connections=${id}`);
      }
    }
  });

  typeFilter.addEventListener('change', onFilter);
  basisFilter.addEventListener('change', onFilter);
  salienceFilter.addEventListener('change', onFilter);
  sortSelect.addEventListener('change', onFilter);

  copyLinkBtn.addEventListener('click', () => {
    if (state.connections.selectedEntityId) {
      const url = `${window.location.origin}${window.location.pathname}#connections=${state.connections.selectedEntityId}`;
      copyToClipboard(url, 'Connections deep link copied!');
    }
  });
}

function inspectConnections(entityId) {
  const entity = state.entitiesById.get(entityId);
  if (!entity) return;

  state.connections.selectedEntityId = entityId;
  document.getElementById('connections-entity-input').value = `${entity.display_name} (${entity.entity_id})`;
  renderConnectionsTable();
}

function renderConnectionsTable() {
  const entityId = state.connections.selectedEntityId;
  if (!entityId) return;
  const entity = state.entitiesById.get(entityId);
  if (!entity) return;

  const rows = entity.connection_rows || [];
  const { typeFilter, basisFilter, salienceFilter, sort } = state.connections;

  // Stats
  document.getElementById('conn-stat-total').innerText = rows.length;
  document.getElementById('conn-stat-canonical').innerText = rows.filter(r => r.is_canonical).length;
  document.getElementById('conn-stat-sameverse').innerText = rows.filter(r => r.evidence_category === 'scripture_same_verse').length;
  document.getElementById('conn-stat-containment').innerText = rows.filter(r => r.evidence_category === 'event_context_containment').length;

  let filtered = rows.filter(r => {
    if (typeFilter !== 'all' && r.neighbor_type !== typeFilter) return false;
    if (basisFilter !== 'all' && r.evidence_category !== basisFilter) return false;

    const rev = state.reviews.latestByTarget[r.connection_id];
    if (salienceFilter === 'unreviewed' && rev) return false;
    if (salienceFilter === 'reviewed' && !rev) return false;
    if (['Primary', 'Supporting', 'Background', 'Should not surface'].includes(salienceFilter)) {
      if (!rev || rev.judgment !== salienceFilter) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    if (sort === 'support_desc') return (b.support_count || 1) - (a.support_count || 1);
    if (sort === 'shared_p_desc') return (b.shared_passage_count || 0) - (a.shared_passage_count || 0);
    if (sort === 'min_ratio_desc') return (b.passage_min_ratio || 0) - (a.passage_min_ratio || 0);
    if (sort === 'jaccard_desc') return (b.passage_jaccard || 0) - (a.passage_jaccard || 0);
    if (sort === 'name_asc') return a.neighbor_name.localeCompare(b.neighbor_name);
    return 0;
  });

  const tbody = document.getElementById('connections-table-body');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: var(--text-muted);">No matching connections found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(row => {
    let catBadge = '<span class="badge badge-derived">Same-Verse</span>';
    if (row.is_canonical) {
      catBadge = '<span class="badge badge-canonical">Canonical Claim</span>';
    } else if (row.evidence_category === 'event_context_containment') {
      catBadge = '<span class="badge badge-event">Event Containment</span>';
    }

    const rev = state.reviews.latestByTarget[row.connection_id];
    let salienceBadge = '<span class="badge badge-neutral">Unreviewed</span>';
    if (rev) {
      let bClass = 'badge-rev-healthy';
      if (rev.judgment === 'Background') bClass = 'badge-amber';
      else if (rev.judgment === 'Should not surface') bClass = 'badge-rev-source';
      salienceBadge = `<span class="badge ${bClass}">${escapeHtml(rev.judgment)}</span>`;
    }

    return `
      <tr>
        <td style="font-weight: 600;">
          <a href="javascript:void(0)" onclick="inspectEntity('${row.neighbor_id}')" style="color: #38bdf8; text-decoration: none;">
            ${escapeHtml(row.neighbor_name)}
          </a>
        </td>
        <td>
          <span class="code-id" onclick="copyToClipboard('${row.neighbor_id}')">${row.neighbor_id}</span>
        </td>
        <td><span class="badge badge-${row.neighbor_type}">${row.neighbor_type}</span></td>
        <td>${catBadge}</td>
        <td style="font-family: var(--font-mono); font-size: 11px;">${escapeHtml(row.association_type)}</td>
        <td style="font-weight: 700; text-align: center;">${row.support_count || 1}</td>
        <td style="text-align: center; font-size: 12px;">${row.selected_occurrence_count} vs ${row.neighbor_occurrence_count}</td>
        <td style="text-align: center; font-weight: 600; color: #4ade80;">${row.shared_passage_count}</td>
        <td style="text-align: center; font-family: var(--font-mono); font-size: 11px;">${(row.passage_min_ratio || 0).toFixed(2)} / ${(row.passage_jaccard || 0).toFixed(2)}</td>
        <td>${salienceBadge}</td>
        <td>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-sm btn-review" onclick="openConnReviewModal('${escapeHtml(row.connection_id)}', '${row.neighbor_id}')">Review Salience</button>
            <button class="btn btn-sm" onclick="navigateToInspect('${row.neighbor_id}')">Inspect</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------
// REVIEW MODALS & SHORTCUTS (DISABLED IN READ-ONLY VIEWER)
// -------------------------------------------------------------
function setupReviewModals() {
  // Disabled in read-only viewer mode
}

function setupKeyboardShortcuts() {
  // Disabled in read-only viewer mode
}

function selectRadio(name, value) {
  const r = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (r) r.checked = true;
}

window.openEntityReviewModal = function(entityId) {
  // Disabled in read-only viewer mode
};

window.openConnReviewModal = function(connectionId, neighborId) {
  // Disabled in read-only viewer mode
};

function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}

window.closeModal = function(id) {
  document.getElementById(id)?.classList.remove('active');
};

// -------------------------------------------------------------
// NAVIGATION HELPERS
// -------------------------------------------------------------
window.navigateToInspect = function(entityId) {
  switchTab('inspector');
  inspectEntity(entityId);
  setUrlHash(`entity=${entityId}`);
};

window.navigateToCompare = function(entityIdA, entityIdB) {
  switchTab('compare');
  const targetB = entityIdB || (entityIdA.startsWith('group:') ? 'group:000078' : 'person:000038');
  setCompareEntities(entityIdA, targetB);
  setUrlHash(`compare=${entityIdA},${targetB}`);
};

window.navigateToConnections = function(entityId) {
  switchTab('connections');
  inspectConnections(entityId);
  setUrlHash(`connections=${entityId}`);
};

window.copyToClipboard = function(text, customMsg) {
  navigator.clipboard.writeText(text).then(() => {
    alert(customMsg || `Copied "${text}" to clipboard!`);
  }).catch(err => {
    prompt('Copy to clipboard:', text);
  });
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
