/* BGV2-009R Bible Graph Visual QA Explorer. Node-RED style vanilla SVG canvas. */
(() => {
  const EXPAND_CAP = 30;
  const WARN_NODES = 140;
  const REFUSE_NODES = 240;

  const state = {
    bundle: null,
    nodes: new Map(),
    edges: new Map(),
    search: [],
    neighborhood: {},
    auditFindings: [],
    seed: null,
    visible: new Set(),
    expanded: new Set(),
    pinned: new Set(),
    positions: new Map(),
    velocities: new Map(),
    hudNotice: "",
    filters: {
      node: { PERSON: true, PLACE: true, GROUP: true, EVENT: true },
      corpus: { OT: true, NT: true, BOTH: true },
      status: { ACCEPTED: true, REVIEW_REQUIRED: true },
      edge: { canonical: true, family: true, participation: true },
    },
    hop: 1,
    selection: { kind: null, id: null },
    secondaryMode: "dim", // "dim" | "hide" | "show"
    pan: { x: 0, y: 0 },
    scale: 1,
    dragging: null,
    panning: null,
  };

  const QA_STARTERS = [
    { id: "candb_264ecdb186e5596797b5", name: "David", type: "PERSON", cls: "chip-person" },
    { id: "candb_611090afebb9d9c27696", name: "Paul", type: "PERSON", cls: "chip-person" },
    { id: "candb_b0a6a5756ecb79418f0a", name: "Elijah", type: "PERSON", cls: "chip-person" },
    { id: "candb_2673b6dee819a2125c7a", name: "Abraham", type: "PERSON", cls: "chip-person" },
    { id: "candb_1a679fddcb8aedc7976b", name: "Jacob", type: "PERSON", cls: "chip-person" },
    { id: "candb_0ae72ee82945943832ce", name: "Daniel", type: "PERSON", cls: "chip-person" },
    { id: "candb_0e77b0ad8939293d2295", name: "Ruth", type: "PERSON", cls: "chip-person" },
    { id: "candb_53a06e8b55a4b8b5d96f", name: "Samuel", type: "PERSON", cls: "chip-person" },
    { id: "candb_d6976ad1227da79b7ee5", name: "Esther", type: "PERSON", cls: "chip-person" },
    { id: "candb_00dec8e09abb7be8fed6", name: "Melchizedek", type: "PERSON", cls: "chip-person" },
    { id: "candbpl_3a3c12c0219fcb2c6a85", name: "Jerusalem", type: "PLACE", cls: "chip-place" },
    { id: "candbpl_007ad55822ce179d59c2", name: "Nazareth", type: "PLACE", cls: "chip-place" },
    { id: "candbpl_07bcf25d27c7f2fe12d9", name: "Bethlehem", type: "PLACE", cls: "chip-place" },
    { id: "candbpl_7a258a04aa3e7e2f6ece", name: "Capernaum", type: "PLACE", cls: "chip-place" },
    { id: "candbpl_67f14b367080a7692354", name: "Rome", type: "PLACE", cls: "chip-place" },
    { id: "candbpl_086e560f01a2e4c3c56f", name: "Antioch", type: "PLACE", cls: "chip-place" },
    { id: "candbpl_21cd1522b002ec3bdb3f", name: "Egypt", type: "PLACE", cls: "chip-place" },
    { id: "candbgrp_593cb83fc88f344bf679", name: "Israelites", type: "GROUP", cls: "chip-group" },
    { id: "candbgrp_7c9da7b2a64c585c544e", name: "Pharisees", type: "GROUP", cls: "chip-group" },
    { id: "candbgrp_a33118933068e2ee2a10", name: "Sadducees", type: "GROUP", cls: "chip-group" },
    { id: "candbgrp_b2569f2e3a17e08929eb", name: "Romans", type: "GROUP", cls: "chip-group" },
    { id: "candbevt_00083426993e8e0f833e", name: "Saul in David's power", type: "EVENT", cls: "chip-event" },
    { id: "BGV2-009-D-002", name: "Paul journey thin (Finding)", type: "FINDING", cls: "chip-finding" },
    { id: "BGV2-009-D-001", name: "Elijah journey thin (Finding)", type: "FINDING", cls: "chip-finding" },
  ];

  const el = {
    svg: document.getElementById("graph"),
    viewport: document.getElementById("viewport"),
    edges: document.getElementById("edges"),
    nodes: document.getElementById("nodes"),
    search: document.getElementById("search-input"),
    results: document.getElementById("search-results"),
    empty: document.getElementById("empty-state"),
    error: document.getElementById("load-error"),
    hud: document.getElementById("hud"),
    counts: document.getElementById("meta-counts"),
    chips: document.getElementById("qa-chips"),
    inspNode: document.getElementById("insp-node"),
    inspEdge: document.getElementById("insp-edge"),
    inspEvidence: document.getElementById("insp-evidence"),
    inspFindings: document.getElementById("insp-findings"),
    pathModal: document.getElementById("path-modal"),
    pathFrom: document.getElementById("path-from"),
    pathTo: document.getElementById("path-to"),
    pathResult: document.getElementById("path-result"),
    findingsModal: document.getElementById("findings-modal"),
    findingsList: document.getElementById("findings-list-container"),
    findingSevFilter: document.getElementById("finding-sev-filter"),
    findingAreaFilter: document.getElementById("finding-area-filter"),
  };

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function truncate(str, len) {
    if (!str) return "";
    return str.length > len ? str.slice(0, len - 1) + "…" : str;
  }

  async function loadBundle() {
    try {
      const res = await fetch("data/graph-bundle.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`Graph JSON failed to load (${res.status}).`);
      const bundle = await res.json();
      state.bundle = bundle;

      (bundle.nodes || []).forEach(n => {
        state.nodes.set(n.id, n);
      });

      (bundle.edges || []).forEach(e => {
        state.edges.set(e.id, e);
      });

      state.search = bundle.search_index || [];
      state.neighborhood = bundle.neighborhood_index || {};
      state.auditFindings = bundle.audit_findings || [];

      const totalNodes = state.nodes.size;
      const totalEdges = state.edges.size;
      const totalFindings = state.auditFindings.length;
      el.counts.textContent = `${totalNodes.toLocaleString()} entities · ${totalEdges.toLocaleString()} edges · ${totalFindings} findings`;

      renderQAChips();
      checkUrlParams();

    } catch (err) {
      console.error("Bible Graph QA error:", err);
      el.error.hidden = false;
      el.error.textContent = `Error loading Bible graph data: ${err.message}`;
      el.empty.hidden = true;
    }
  }

  function renderQAChips() {
    el.chips.innerHTML = "";
    QA_STARTERS.forEach(s => {
      const btn = document.createElement("button");
      btn.className = `qa-chip ${s.cls}`;
      btn.type = "button";
      btn.textContent = s.name;
      btn.onclick = () => {
        if (s.type === "FINDING") {
          showFindingDetails(s.id);
        } else {
          seedGraph(s.id);
        }
      };
      el.chips.appendChild(btn);
    });
  }

  function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const nodeParam = params.get("node");
    const findingParam = params.get("finding");
    if (findingParam) {
      showFindingDetails(findingParam);
    } else if (nodeParam && state.nodes.has(nodeParam)) {
      seedGraph(nodeParam);
    }
  }

  function seedGraph(nodeId) {
    if (!state.nodes.has(nodeId)) {
      // Find match in search index
      const hit = state.search.find(s => s.id === nodeId || s.display_name.toLowerCase() === nodeId.toLowerCase());
      if (hit && state.nodes.has(hit.id)) nodeId = hit.id;
      else return;
    }

    state.seed = nodeId;
    state.visible.clear();
    state.expanded.clear();
    state.pinned.clear();
    state.positions.clear();
    state.velocities.clear();

    state.visible.add(nodeId);
    state.expanded.add(nodeId);

    // Expand N hops
    expandNeighborhood(nodeId, state.hop);

    el.empty.hidden = true;
    selectEntity("node", nodeId);
    layoutAndRender();
  }

  function expandNeighborhood(centerId, hops) {
    const queue = [{ id: centerId, depth: 0 }];
    const visited = new Set([centerId]);

    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr.depth >= hops) continue;

      const neigh = state.neighborhood[curr.id] || { canonical_neighbors: [] };
      const rawList = neigh.canonical_neighbors || [];

      for (const nId of rawList) {
        if (!visited.has(nId) && state.nodes.has(nId)) {
          const nNode = state.nodes.get(nId);
          if (filterPasses(nNode)) {
            visited.add(nId);
            state.visible.add(nId);
            queue.push({ id: nId, depth: curr.depth + 1 });
            if (state.visible.size >= REFUSE_NODES) break;
          }
        }
      }
      if (state.visible.size >= REFUSE_NODES) break;
    }
  }

  function filterPasses(node) {
    if (!state.filters.node[node.type]) return false;
    const corpus = node.corpus_membership || "BOTH";
    if (!state.filters.corpus[corpus]) return false;
    const status = node.review_status || "ACCEPTED";
    if (!state.filters.status[status]) return false;
    return true;
  }

  function layoutAndRender() {
    const nodeIds = Array.from(state.visible);
    if (nodeIds.length === 0) return;

    // Arrange nodes on radial orbits
    const svgRect = el.svg.getBoundingClientRect();
    const cx = svgRect.width / 2 || 450;
    const cy = svgRect.height / 2 || 350;

    if (!state.positions.has(state.seed)) {
      state.positions.set(state.seed, { x: cx, y: cy });
    }

    const otherNodes = nodeIds.filter(id => id !== state.seed);
    const angleStep = (2 * Math.PI) / Math.max(otherNodes.length, 1);
    const radius = Math.min(260, 90 + otherNodes.length * 10);

    otherNodes.forEach((id, idx) => {
      if (!state.positions.has(id)) {
        const angle = idx * angleStep;
        state.positions.set(id, {
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle)
        });
      }
    });

    renderSvg();
  }

  function renderSvg() {
    el.edges.innerHTML = "";
    el.nodes.innerHTML = "";

    const visibleList = Array.from(state.visible);
    const visibleSet = state.visible;

    // Render Edges
    state.edges.forEach(e => {
      if (visibleSet.has(e.source) && visibleSet.has(e.target)) {
        const p1 = state.positions.get(e.source);
        const p2 = state.positions.get(e.target);
        if (!p1 || !p2) return;

        const isRev = e.review_status === "REVIEW_REQUIRED";
        const isPart = e.relationship_type && e.relationship_type.includes("PARTICIPATED");
        const cls = `edge-path ${isPart ? 'participation' : ''} ${isRev ? 'review' : ''}`;
        const marker = isRev ? "url(#arrow-review)" : "url(#arrow-canonical)";

        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`);
        pathEl.setAttribute("class", cls);
        pathEl.setAttribute("marker-end", marker);
        pathEl.onclick = (ev) => {
          ev.stopPropagation();
          selectEntity("edge", e.id);
        };
        el.edges.appendChild(pathEl);
      }
    });

    // Render Nodes
    visibleList.forEach(id => {
      const node = state.nodes.get(id);
      const pos = state.positions.get(id);
      if (!node || !pos) return;

      const isSeed = id === state.seed;
      const isSel = state.selection.id === id;
      const isRev = node.review_status === "REVIEW_REQUIRED";
      const hasFindings = node.audit_findings && node.audit_findings.length > 0;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", `node ${node.type.toLowerCase()} ${isSeed ? 'seed' : ''} ${isSel ? 'selected' : ''} ${isRev ? 'review' : ''}`);
      g.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);

      let shapeHtml = "";
      if (node.type === "PERSON") {
        shapeHtml = `<circle cx="0" cy="0" r="16" class="node-shape node-circle"></circle>`;
      } else if (node.type === "PLACE") {
        shapeHtml = `<rect x="-16" y="-13" width="32" height="26" rx="4" class="node-shape node-place"></rect>`;
      } else if (node.type === "GROUP") {
        shapeHtml = `<polygon points="0,-16 14,-8 14,8 0,16 -14,8 -14,-8" class="node-shape node-group"></polygon>`;
      } else if (node.type === "EVENT") {
        shapeHtml = `<polygon points="0,-16 16,0 0,16 -16,0" class="node-shape node-event"></polygon>`;
      }

      const label = truncate(node.display_name || node.id, 22);
      const labelHtml = `<text class="node-label ${node.type === 'EVENT' ? 'node-label-event' : ''}" x="0" y="28" text-anchor="middle">${escapeHtml(label)}</text>`;
      const findingBadge = hasFindings ? `<text class="node-badge-finding" x="12" y="-12">⚠️</text>` : "";

      g.innerHTML = shapeHtml + labelHtml + findingBadge;

      g.onclick = (ev) => {
        ev.stopPropagation();
        selectEntity("node", id);
      };

      g.ondblclick = (ev) => {
        ev.stopPropagation();
        seedGraph(id);
      };

      el.nodes.appendChild(g);
    });

    updateHud();
  }

  function selectEntity(kind, id) {
    state.selection = { kind, id };

    // Update active tabs
    document.querySelectorAll(".inspector-tabs .tab").forEach(t => {
      t.classList.toggle("active", t.getAttribute("data-tab") === kind);
    });
    ["insp-node", "insp-edge", "insp-evidence", "insp-findings"].forEach(d => {
      document.getElementById(d).hidden = d !== `insp-${kind}`;
    });

    if (kind === "node") {
      renderNodeInspector(id);
    } else if (kind === "edge") {
      renderEdgeInspector(id);
    }

    renderSvg();
  }

  function renderNodeInspector(id) {
    const node = state.nodes.get(id);
    if (!node) return;

    const isRev = node.review_status === "REVIEW_REQUIRED";
    const findings = node.audit_findings || [];

    // Find connected edges
    const famRels = [];
    const eventParts = [];
    state.edges.forEach(e => {
      if (e.source === id || e.target === id) {
        const otherId = e.source === id ? e.target : e.source;
        const otherNode = state.nodes.get(otherId);
        if (e.relationship_type.includes("OF")) {
          famRels.push({ edge: e, other: otherNode, role: e.ui_label });
        } else {
          eventParts.push({ edge: e, other: otherNode, role: e.ui_label });
        }
      }
    });

    el.inspNode.innerHTML = `
      <div class="insp-title-row">
        <div class="insp-title">${escapeHtml(node.display_name)}</div>
        <div class="insp-id">${escapeHtml(node.id)}</div>
      </div>
      <div class="tag-row">
        <span class="tag tag-${node.type.toLowerCase()}">${node.type}</span>
        <span class="tag ${isRev ? 'tag-review' : 'tag-accepted'}">${node.review_status}</span>
        <span class="tag">${node.corpus_membership || 'BOTH'}</span>
        ${node.map_suitability ? `<span class="tag ${node.map_suitability === 'SAFE_TO_MAP' ? 'tag-map-safe' : (node.map_suitability === 'MAP_WITH_UNCERTAINTY' ? 'tag-map-uncert' : 'tag-map-no')}">${node.map_suitability}</span>` : ''}
      </div>

      ${findings.length > 0 ? `
      <div class="insp-section">
        <h4>Applicable Audit Findings (${findings.length})</h4>
        ${findings.map(f => `
          <div class="finding-card severity-${f.severity}">
            <div class="finding-head">
              <span>[${f.severity}] ${escapeHtml(f.finding_id)}</span>
              <small>Area ${f.area}</small>
            </div>
            <div class="finding-desc">${escapeHtml(f.title)}: ${escapeHtml(f.description)}</div>
            <div class="finding-action">Action: ${escapeHtml(f.recommended_action)}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${node.scripture_ranges && node.scripture_ranges.length > 0 ? `
      <div class="insp-section">
        <h4>Scripture Ranges</h4>
        <div style="font-family: var(--mono); font-size: 11px; color: #7dd3fc;">${node.scripture_ranges.join(', ')}</div>
      </div>
      ` : ''}

      ${node.primary_source_id ? `
      <div class="insp-section">
        <h4>Source Grounding</h4>
        <div>Source: <b>${escapeHtml(node.primary_source_id)}</b></div>
        <div>Anchor: <code>${escapeHtml(node.primary_structural_anchor || 'N/A')}</code></div>
      </div>
      ` : ''}

      ${famRels.length > 0 ? `
      <div class="insp-section">
        <h4>Family Connections (${famRels.length})</h4>
        <div class="rel-list">
          ${famRels.map(r => `
            <div class="rel-item" onclick="window.inspectById('${r.other.id}')">
              <div>
                <div class="rel-name">${escapeHtml(r.other.display_name)}</div>
                <div class="rel-role">${escapeHtml(r.role)}</div>
              </div>
              <span class="tag tag-${r.other.type.toLowerCase()}">${r.other.type}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${eventParts.length > 0 ? `
      <div class="insp-section">
        <h4>Event Participation (${eventParts.length})</h4>
        <div class="rel-list">
          ${eventParts.map(r => `
            <div class="rel-item" onclick="window.inspectById('${r.other.id}')">
              <div>
                <div class="rel-name">${escapeHtml(r.other.display_name)}</div>
                <div class="rel-role">${escapeHtml(r.role)}</div>
              </div>
              <span class="tag tag-${r.other.type.toLowerCase()}">${r.other.type}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div class="insp-section">
        <button class="action" onclick="window.reseed('${node.id}')" style="width: 100%; padding: 8px;">Seed graph from this node</button>
      </div>
    `;

    renderEvidenceTab(node);
  }

  function renderEdgeInspector(id) {
    const edge = state.edges.get(id);
    if (!edge) return;

    const sNode = state.nodes.get(edge.source);
    const tNode = state.nodes.get(edge.target);

    el.inspEdge.innerHTML = `
      <div class="insp-title-row">
        <div class="insp-title">${escapeHtml(edge.relationship_type)}</div>
        <div class="insp-id">${escapeHtml(edge.id)}</div>
      </div>
      <div class="tag-row">
        <span class="tag ${edge.review_status === 'REVIEW_REQUIRED' ? 'tag-review' : 'tag-accepted'}">${edge.review_status}</span>
        <span class="tag">${edge.relationship_class}</span>
      </div>

      <div class="insp-section">
        <h4>Endpoints</h4>
        <div class="rel-item" onclick="window.inspectById('${edge.source}')" style="margin-bottom: 6px;">
          <div>Source: <b>${escapeHtml(sNode?.display_name || edge.source)}</b></div>
          <span class="tag tag-${sNode?.type?.toLowerCase() || 'person'}">${sNode?.type || 'NODE'}</span>
        </div>
        <div class="rel-item" onclick="window.inspectById('${edge.target}')">
          <div>Target: <b>${escapeHtml(tNode?.display_name || edge.target)}</b></div>
          <span class="tag tag-${tNode?.type?.toLowerCase() || 'person'}">${tNode?.type || 'NODE'}</span>
        </div>
      </div>

      ${edge.scripture_locators && edge.scripture_locators.length > 0 ? `
      <div class="insp-section">
        <h4>Scripture Citations</h4>
        <div style="font-family: var(--mono); font-size: 11px; color: #7dd3fc;">${edge.scripture_locators.join(', ')}</div>
      </div>
      ` : ''}
    `;
  }

  function renderEvidenceTab(node) {
    el.inspEvidence.innerHTML = `
      <div class="insp-title-row">
        <div class="insp-title">Evidence & Provenance</div>
        <div class="insp-id">${escapeHtml(node.id)}</div>
      </div>
      <div class="insp-section">
        <h4>Observation Count</h4>
        <p style="font-size: 13px; font-weight: 700; color: #38bdf8;">${node.evidence_observation_count || 0} source observations</p>
      </div>
      <div class="insp-section">
        <h4>Provenance Basis</h4>
        <p>Canonical Bible Graph V2 Certified Export (BGV2-009R).</p>
        <p style="color: var(--muted); font-size: 11px; margin-top: 4px;">Candidate A prior art is strictly excluded. All relationships are source-backed canonical claims.</p>
      </div>
    `;
  }

  function showFindingDetails(findingId) {
    const finding = state.auditFindings.find(f => f.finding_id === findingId);
    if (!finding) return;

    el.findingsModal.hidden = false;
    renderFindingsList(finding.severity, finding.area, findingId);
  }

  function renderFindingsList(filterSev = "ALL", filterArea = "ALL", highlightId = null) {
    el.findingsList.innerHTML = "";
    const list = state.auditFindings.filter(f => {
      if (filterSev !== "ALL" && f.severity !== filterSev) return false;
      if (filterArea !== "ALL" && f.area !== filterArea) return false;
      return true;
    });

    list.forEach(f => {
      const card = document.createElement("div");
      card.className = `finding-card severity-${f.severity}`;
      if (highlightId === f.finding_id) card.style.boxShadow = "0 0 0 2px #fbbf24";

      card.innerHTML = `
        <div class="findings-modal-header" style="margin-bottom: 6px;">
          <div>
            <span class="tag" style="background: ${f.severity === 'MEDIUM' ? '#b45309' : (f.severity === 'LOW' ? '#854d0e' : '#0369a1')}">${f.severity}</span>
            <b style="color: #fff; margin-left: 6px;">${escapeHtml(f.finding_id)}</b>: ${escapeHtml(f.title)}
          </div>
          <span class="tag">Area ${f.area}</span>
        </div>
        <div class="finding-desc">${escapeHtml(f.description)}</div>
        <div class="finding-action">Recommended Action: ${escapeHtml(f.recommended_action)}</div>
        <pre style="background: #0b1220; padding: 6px; border-radius: 4px; font-size: 10px; color: #94a3b8; margin-top: 6px; overflow-x: auto;">${escapeHtml(JSON.stringify(f.evidence, null, 2))}</pre>
        ${f.evidence && (f.evidence.person_id || f.evidence.place_key || f.evidence.group_key) ? `
          <button class="action" style="margin-top: 6px;" onclick="window.focusFindingTarget('${f.finding_id}')">Focus Target in Graph →</button>
        ` : ''}
      `;
      el.findingsList.appendChild(card);
    });
  }

  window.focusFindingTarget = (fid) => {
    el.findingsModal.hidden = true;
    const f = state.auditFindings.find(item => item.finding_id === fid);
    if (!f) return;
    const ev = f.evidence || {};
    let targetId = ev.person_id;
    if (!targetId && ev.place_key) {
      const pl = Array.from(state.nodes.values()).find(n => n.type === "PLACE" && n.display_name.toLowerCase() === ev.place_key.toLowerCase());
      if (pl) targetId = pl.id;
    }
    if (!targetId && ev.group_key) {
      const g = Array.from(state.nodes.values()).find(n => n.type === "GROUP" && n.display_name.toLowerCase() === ev.group_key.toLowerCase());
      if (g) targetId = g.id;
    }
    if (targetId) {
      seedGraph(targetId);
    }
  };

  window.inspectById = (id) => {
    if (!state.visible.has(id)) {
      state.visible.add(id);
      layoutAndRender();
    }
    selectEntity("node", id);
  };

  window.reseed = (id) => seedGraph(id);

  function updateHud() {
    el.hud.textContent = `Active nodes: ${state.visible.size} | Selection: ${state.selection.id || 'None'}`;
  }

  function bindEvents() {
    // Search
    el.search.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        el.results.hidden = true;
        return;
      }
      const hits = state.search.filter(s => {
        if (!state.filters.node[s.type]) return false;
        return s.tokens.some(tok => tok.includes(q)) || s.display_name.toLowerCase().includes(q);
      }).slice(0, 15);

      if (hits.length === 0) {
        el.results.innerHTML = '<div style="padding: 10px; color: var(--muted);">No matching entities found.</div>';
      } else {
        el.results.innerHTML = hits.map(hit => `
          <div class="search-hit" onclick="window.selectSearch('${hit.id}')">
            <span class="tag tag-${hit.type.toLowerCase()}">${hit.type}</span>
            <b>${escapeHtml(hit.display_name)}</b>
            <span class="tag ${hit.review_status === 'REVIEW_REQUIRED' ? 'tag-review' : 'tag-accepted'}">${hit.review_status}</span>
          </div>
        `).join('');
      }
      el.results.hidden = false;
    });

    document.addEventListener("click", (e) => {
      if (!el.search.contains(e.target) && !el.results.contains(e.target)) {
        el.results.hidden = true;
      }
    });

    window.selectSearch = (id) => {
      el.search.value = "";
      el.results.hidden = true;
      seedGraph(id);
    };

    // Keyboard shortcut /
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== el.search) {
        e.preventDefault();
        el.search.focus();
      }
    });

    // Hop depth
    document.getElementById("hop-depth").addEventListener("change", (e) => {
      state.hop = parseInt(e.target.value, 10);
      if (state.seed) {
        state.visible.clear();
        state.visible.add(state.seed);
        expandNeighborhood(state.seed, state.hop);
        layoutAndRender();
      }
    });

    // Zoom buttons
    document.getElementById("btn-zoom-in").addEventListener("click", () => {
      state.scale *= 1.25;
      el.viewport.setAttribute("transform", `translate(${state.pan.x}, ${state.pan.y}) scale(${state.scale})`);
    });
    document.getElementById("btn-zoom-out").addEventListener("click", () => {
      state.scale *= 0.8;
      el.viewport.setAttribute("transform", `translate(${state.pan.x}, ${state.pan.y}) scale(${state.scale})`);
    });
    document.getElementById("btn-fit").addEventListener("click", fitGraph);
    document.getElementById("btn-recenter").addEventListener("click", fitGraph);
    document.getElementById("btn-reset").addEventListener("click", () => {
      if (state.seed) seedGraph(state.seed);
    });

    // Findings button & modal
    document.getElementById("btn-findings").addEventListener("click", () => {
      el.findingsModal.hidden = false;
      renderFindingsList(el.findingSevFilter.value, el.findingAreaFilter.value);
    });
    document.getElementById("findings-close-btn").addEventListener("click", () => {
      el.findingsModal.hidden = true;
    });
    document.getElementById("tab-findings-btn").addEventListener("click", () => {
      el.findingsModal.hidden = false;
      renderFindingsList();
    });
    el.findingSevFilter.addEventListener("change", () => {
      renderFindingsList(el.findingSevFilter.value, el.findingAreaFilter.value);
    });
    el.findingAreaFilter.addEventListener("change", () => {
      renderFindingsList(el.findingSevFilter.value, el.findingAreaFilter.value);
    });

    // Legend toggle
    document.getElementById("btn-toggle-legend").addEventListener("click", () => {
      document.getElementById("legend").hidden = true;
      document.getElementById("btn-show-legend").hidden = false;
    });
    document.getElementById("btn-show-legend").addEventListener("click", () => {
      document.getElementById("legend").hidden = false;
      document.getElementById("btn-show-legend").hidden = true;
    });

    // Inspector toggle
    document.getElementById("btn-toggle-inspector").addEventListener("click", () => {
      document.getElementById("inspector").style.display = "none";
      document.getElementById("btn-show-inspector").hidden = false;
    });
    document.getElementById("btn-show-inspector").addEventListener("click", () => {
      document.getElementById("inspector").style.display = "flex";
      document.getElementById("btn-show-inspector").hidden = true;
    });

    // Filters
    document.querySelectorAll("#filters-bar input[type='checkbox']").forEach(chk => {
      chk.addEventListener("change", () => {
        if (chk.dataset.nodeType) state.filters.node[chk.dataset.nodeType] = chk.checked;
        if (chk.dataset.corpusFilter) state.filters.corpus[chk.dataset.corpusFilter] = chk.checked;
        if (chk.dataset.statusFilter) state.filters.status[chk.dataset.statusFilter] = chk.checked;
        if (chk.dataset.edgeClass) state.filters.edge[chk.dataset.edgeClass] = chk.checked;
        if (state.seed) {
          state.visible.clear();
          state.visible.add(state.seed);
          expandNeighborhood(state.seed, state.hop);
          layoutAndRender();
        }
      });
    });

    // Path modal
    document.getElementById("btn-path").addEventListener("click", () => {
      el.pathModal.hidden = false;
      if (state.selection.id) el.pathFrom.value = state.selection.id;
    });
    document.getElementById("path-close").addEventListener("click", () => {
      el.pathModal.hidden = true;
    });
    document.getElementById("path-run").addEventListener("click", runPathFinder);

    // Pan & Drag on SVG
    bindSvgPanAndDrag();
  }

  function fitGraph() {
    state.pan = { x: 0, y: 0 };
    state.scale = 1;
    el.viewport.setAttribute("transform", "translate(0, 0) scale(1)");
  }

  function bindSvgPanAndDrag() {
    let isPanning = false;
    let startPan = { x: 0, y: 0 };

    el.svg.addEventListener("mousedown", (e) => {
      if (e.target === el.svg || e.target === el.viewport) {
        isPanning = true;
        startPan = { x: e.clientX - state.pan.x, y: e.clientY - state.pan.y };
        el.viewport.classList.add("panning");
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (isPanning) {
        state.pan.x = e.clientX - startPan.x;
        state.pan.y = e.clientY - startPan.y;
        el.viewport.setAttribute("transform", `translate(${state.pan.x}, ${state.pan.y}) scale(${state.scale})`);
      }
    });

    window.addEventListener("mouseup", () => {
      isPanning = false;
      el.viewport.classList.remove("panning");
    });
  }

  function runPathFinder() {
    const fromVal = el.pathFrom.value.trim();
    const toVal = el.pathTo.value.trim();
    if (!fromVal || !toVal) return;

    let fromId = fromVal;
    let toId = toVal;
    const hitA = state.search.find(s => s.id === fromVal || s.display_name.toLowerCase() === fromVal.toLowerCase());
    if (hitA) fromId = hitA.id;
    const hitB = state.search.find(s => s.id === toVal || s.display_name.toLowerCase() === toVal.toLowerCase());
    if (hitB) toId = hitB.id;

    // BFS Shortest Path
    const queue = [[fromId]];
    const visited = new Set([fromId]);
    let pathFound = null;

    while (queue.length > 0) {
      const path = queue.shift();
      const curr = path[path.length - 1];
      if (curr === toId) {
        pathFound = path;
        break;
      }

      const neighbors = state.neighborhood[curr]?.canonical_neighbors || [];
      for (const nId of neighbors) {
        if (!visited.has(nId) && state.nodes.has(nId)) {
          visited.add(nId);
          queue.push([...path, nId]);
        }
      }
    }

    if (pathFound) {
      el.pathResult.textContent = pathFound.map((id, idx) => {
        const n = state.nodes.get(id);
        return `${idx + 1}. [${n?.type || 'NODE'}] ${n?.display_name || id}`;
      }).join("\n → ");

      // Add all to visible
      pathFound.forEach(id => state.visible.add(id));
      layoutAndRender();
    } else {
      el.pathResult.textContent = "No path found between selected entities within active canonical graph bounds.";
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    loadBundle();
  });
})();
