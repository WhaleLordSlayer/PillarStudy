/* VIEW-001 read-only relationship explorer. Vanilla SVG canvas. */
(() => {
  const EXPAND_CAP = 24;
  const WARN_NODES = 120;
  const REFUSE_NODES = 200;
  const TYPE_ARCS = ["PERSON", "GROUP", "PLACE", "EVENT", "SOURCE", "EVIDENCE", "VERSE"];

  const state = {
    bundle: null,
    nodes: new Map(),
    edges: new Map(),
    search: [],
    neighborhood: {},
    seed: null,
    visible: new Set(),
    expanded: new Set(),
    pinned: new Set(),
    hiddenRemainder: new Map(),
    positions: new Map(),
    hudNotice: "",
    filters: {
      node: { PERSON: true, GROUP: true, PLACE: true, EVENT: true, SOURCE: false, EVIDENCE: false, VERSE: false },
      edge: { canonical: true, context: true, provenance: false, advisory: false, attribution: false },
    },
    hop: 1,
    selection: { kind: null, id: null },
    pan: { x: 0, y: 0 },
    scale: 1,
    dragging: null,
    panning: null,
  };

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
    pathModal: document.getElementById("path-modal"),
    pathFrom: document.getElementById("path-from"),
    pathTo: document.getElementById("path-to"),
    pathResult: document.getElementById("path-result"),
  };

  function showError(message) {
    el.error.hidden = false;
    el.error.textContent = message;
    el.empty.hidden = true;
  }

  async function loadBundle() {
    try {
      const res = await fetch("data/graph-bundle.json", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Graph JSON failed to load (${res.status}). Run python tools/relationship-explorer/generate.py`);
      }
      const bundle = await res.json();
      if (!bundle.nodes || !bundle.edges || !bundle.search_index) {
        throw new Error("graph-bundle.json is missing nodes, edges, or search_index.");
      }
      state.bundle = bundle;
      bundle.nodes.forEach((node) => state.nodes.set(node.id, node));
      bundle.edges.forEach((edge) => state.edges.set(edge.id, edge));
      state.search = bundle.search_index;
      state.neighborhood = bundle.neighborhood_index || {};
      const meta = bundle.meta || {};
      el.counts.textContent = `${Object.values(meta.node_counts_by_type || {}).reduce((a, b) => a + b, 0)} nodes · ${Object.values(meta.edge_counts_by_class || {}).reduce((a, b) => a + b, 0)} edges`;
      renderQaChips(meta.qa_examples || {});
      const params = new URLSearchParams(window.location.search);
      const deep = params.get("entity");
      if (deep) seedEntity(deep);
      else renderInspectors();
    } catch (err) {
      showError(err.message || String(err));
    }
  }

  function renderQaChips(examples) {
    const preferred = [
      ["captain_moroni", "Captain Moroni"],
      ["mormon", "Mormon"],
      ["lamanites", "Lamanites"],
      ["nephites", "Nephites"],
      ["people_of_ammon", "People of Ammon"],
      ["zarahemla_land", "Zarahemla (land)"],
      ["cumorah_hill", "Cumorah"],
      ["christ_appears_bountiful", "Christ appears"],
      ["title_of_liberty", "Title of Liberty"],
    ];
    el.chips.innerHTML = "";
    preferred.forEach(([key, label]) => {
      const ex = examples[key];
      if (!ex) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = `${label} · ${ex.id}`;
      btn.addEventListener("click", () => seedEntity(ex.id));
      el.chips.appendChild(btn);
    });
  }

  function nodeTypeOn(type) {
    return !!state.filters.node[type];
  }
  function edgeClassOn(cls) {
    return !!state.filters.edge[cls];
  }

  function neighborsOf(id) {
    const index = state.neighborhood[id] || { edge_ids: [], neighbors: [] };
    const out = [];
    (index.edge_ids || []).forEach((edgeId) => {
      const edge = state.edges.get(edgeId);
      if (!edge || !edgeClassOn(edge.relationship_class)) return;
      const other = edge.source === id ? edge.target : edge.source;
      const node = state.nodes.get(other);
      if (!node || !nodeTypeOn(node.type)) return;
      out.push({ node, edge });
    });
    out.sort((a, b) => (b.edge.support_count || 0) - (a.edge.support_count || 0) || a.node.id.localeCompare(b.node.id));
    return out;
  }

  function seedEntity(id) {
    const node = state.nodes.get(id);
    if (!node) {
      el.search.value = id;
      runSearch(id);
      showError(`Unknown entity ${id}. No fake node was created.`);
      return;
    }
    el.error.hidden = true;
    state.hudNotice = "";
    state.seed = id;
    state.visible = new Set([id]);
    state.expanded = new Set([id]);
    state.pinned = new Set([id]);
    state.hiddenRemainder = new Map();
    state.positions = new Map();
    expandNode(id, state.hop);
    layoutAll(true);
    selectNode(id);
    el.empty.hidden = true;
    const url = new URL(window.location.href);
    url.searchParams.set("entity", id);
    history.replaceState({}, "", url);
    render();
    fitGraph();
  }

  function expandNode(id, hops) {
    const queue = [{ id, depth: 0 }];
    const queued = new Set([id]);
    while (queue.length) {
      const cur = queue.shift();
      if (cur.depth >= hops) continue;
      const neigh = neighborsOf(cur.id);
      let addedHere = 0;
      const remainder = [];
      for (const item of neigh) {
        if (state.visible.has(item.node.id)) continue;
        if (addedHere >= EXPAND_CAP) {
          remainder.push(item.node.id);
          continue;
        }
        if (state.visible.size >= REFUSE_NODES) {
          remainder.push(item.node.id);
          state.hudNotice = `Refusing to add more nodes (cap ${REFUSE_NODES}). Expand is navigation, not a community.`;
          continue;
        }
        state.visible.add(item.node.id);
        addedHere += 1;
        if (!queued.has(item.node.id)) {
          queued.add(item.node.id);
          queue.push({ id: item.node.id, depth: cur.depth + 1 });
        }
      }
      if (remainder.length) state.hiddenRemainder.set(cur.id, remainder);
      else state.hiddenRemainder.delete(cur.id);
    }
    state.expanded.add(id);
    if (state.visible.size >= WARN_NODES && !state.hudNotice) {
      state.hudNotice = `Drawn nodes: ${state.visible.size}. Neighborhood is navigation, not a historical community.`;
    }
  }

  function showMore(id) {
    let rem = (state.hiddenRemainder.get(id) || []).filter((nid) => !state.visible.has(nid));
    if (!rem.length) {
      rem = neighborsOf(id).map((item) => item.node.id).filter((nid) => !state.visible.has(nid));
    }
    let added = 0;
    const still = [];
    for (const nid of rem) {
      if (state.visible.has(nid)) continue;
      if (added >= EXPAND_CAP || state.visible.size >= REFUSE_NODES) {
        if (state.visible.size >= REFUSE_NODES) {
          state.hudNotice = `Refusing to add more nodes (cap ${REFUSE_NODES}). Expand is navigation, not a community.`;
        }
        still.push(nid);
        continue;
      }
      state.visible.add(nid);
      added += 1;
    }
    if (still.length) state.hiddenRemainder.set(id, still);
    else state.hiddenRemainder.delete(id);
    state.expanded.add(id);
  }

  function collapseNode(id) {
    if (id === state.seed) return;
    const keep = new Set([state.seed, ...state.pinned]);
    state.expanded.delete(id);
    const next = new Set([state.seed]);
    state.expanded.forEach((eid) => {
      neighborsOf(eid).forEach((item) => next.add(item.node.id));
    });
    next.forEach((nid) => keep.add(nid));
    state.visible = new Set([...state.visible].filter((nid) => keep.has(nid)));
    render();
  }

  function layoutAll(reset) {
    if (!state.seed) return;
    const seedPos = reset ? { x: 0, y: 0 } : state.positions.get(state.seed) || { x: 0, y: 0 };
    state.positions.set(state.seed, seedPos);
    const hopOf = new Map([[state.seed, 0]]);
    const q = [state.seed];
    while (q.length) {
      const id = q.shift();
      neighborsOf(id).forEach((item) => {
        if (!state.visible.has(item.node.id)) return;
        if (!hopOf.has(item.node.id)) {
          hopOf.set(item.node.id, (hopOf.get(id) || 0) + 1);
          q.push(item.node.id);
        }
      });
    }
    const byHopType = new Map();
    state.visible.forEach((id) => {
      if (id === state.seed) return;
      const node = state.nodes.get(id);
      const hop = Math.min(hopOf.get(id) || 1, 2);
      const key = `${hop}:${node.type}`;
      if (!byHopType.has(key)) byHopType.set(key, []);
      byHopType.get(key).push(id);
    });
    TYPE_ARCS.forEach((type, typeIdx) => {
      [1, 2].forEach((hop) => {
        const ids = byHopType.get(`${hop}:${type}`) || [];
        ids.sort();
        const radius = hop === 1 ? 280 : 520;
        const slice = (Math.PI * 2) / TYPE_ARCS.length;
        const start = -Math.PI / 2 + typeIdx * slice + 0.12;
        ids.forEach((id, i) => {
          if (state.pinned.has(id) && state.positions.has(id) && !reset) return;
          const t = ids.length === 1 ? 0.5 : i / (ids.length - 1);
          const angle = start + t * (slice - 0.24);
          state.positions.set(id, {
            x: seedPos.x + Math.cos(angle) * radius,
            y: seedPos.y + Math.sin(angle) * radius,
          });
        });
      });
    });
  }

  function visibleEdges() {
    const out = [];
    state.edges.forEach((edge) => {
      if (!edgeClassOn(edge.relationship_class)) return;
      if (!state.visible.has(edge.source) || !state.visible.has(edge.target)) return;
      const a = state.nodes.get(edge.source);
      const b = state.nodes.get(edge.target);
      if (!a || !b || !nodeTypeOn(a.type) || !nodeTypeOn(b.type)) return;
      out.push(edge);
    });
    return out;
  }

  function truncate(text, n) {
    if (!text) return "";
    return text.length > n ? `${text.slice(0, n - 1)}…` : text;
  }

  function shapeFor(node, x, y, selected) {
    const seed = node.id === state.seed;
    const cls = [
      "node-shape",
      `node-${node.type.toLowerCase()}`,
      seed ? "node-seed" : "",
      selected ? "node-selected" : "",
      node.grounding_status === "SOURCE_ONLY" ? "node-source-only" : "",
    ].join(" ");
    if (node.type === "PERSON") return `<circle class="${cls}" cx="${x}" cy="${y}" r="18" data-id="${node.id}"></circle>`;
    if (node.type === "GROUP") return `<polygon class="${cls}" data-id="${node.id}" points="${hex(x, y, 20)}"></polygon>`;
    if (node.type === "PLACE") return `<rect class="${cls}" data-id="${node.id}" x="${x - 16}" y="${y - 14}" width="32" height="28" rx="6"></rect>`;
    if (node.type === "EVENT") return `<polygon class="${cls}" data-id="${node.id}" points="${x},${y - 20} ${x + 16},${y} ${x},${y + 20} ${x - 16},${y}"></polygon>`;
    if (node.type === "SOURCE") return `<rect class="${cls}" data-id="${node.id}" x="${x - 16}" y="${y - 12}" width="32" height="24"></rect>`;
    if (node.type === "EVIDENCE") return `<polygon class="${cls}" data-id="${node.id}" points="${oct(x, y, 14)}"></polygon>`;
    return `<rect class="${cls}" data-id="${node.id}" x="${x - 18}" y="${y - 10}" width="36" height="20" rx="8"></rect>`;
  }

  function hex(x, y, r) {
    const pts = [];
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      pts.push(`${x + Math.cos(a) * r},${y + Math.sin(a) * r}`);
    }
    return pts.join(" ");
  }
  function oct(x, y, r) {
    const pts = [];
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI / 4) * i - Math.PI / 8;
      pts.push(`${x + Math.cos(a) * r},${y + Math.sin(a) * r}`);
    }
    return pts.join(" ");
  }

  function render() {
    if (!state.seed) return;
    el.empty.hidden = true;
    const edges = visibleEdges();
    const selectedEdge = state.selection.kind === "edge" ? state.selection.id : null;
    const selectedNode = state.selection.kind === "node" ? state.selection.id : null;
    el.edges.innerHTML = edges.map((edge) => {
      const a = state.positions.get(edge.source);
      const b = state.positions.get(edge.target);
      if (!a || !b) return "";
      const selected = edge.id === selectedEdge;
      const marker = edge.relationship_class === "canonical" && edge.direction === "directed" ? "url(#arrow-canonical)" : "";
      const label = edge.relationship_class === "canonical" ? edge.ui_label : "";
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      return `<g>
        <line class="edge-line edge-${edge.relationship_class} ${selected ? "edge-selected" : ""}" data-id="${edge.id}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" marker-end="${marker}"></line>
        ${label ? `<text class="edge-label" x="${mx}" y="${my - 6}">${escapeHtml(label)}</text>` : ""}
      </g>`;
    }).join("");

    el.nodes.innerHTML = [...state.visible].map((id) => {
      const node = state.nodes.get(id);
      const pos = state.positions.get(id) || { x: 0, y: 0 };
      if (!nodeTypeOn(node.type)) return "";
      const rem = (state.hiddenRemainder.get(id) || []).length;
      const badge = rem ? `+${rem}` : node.type;
      return `<g class="node-g" data-id="${id}" transform="translate(0,0)">
        ${shapeFor(node, pos.x, pos.y, id === selectedNode)}
        <text class="node-badge" x="${pos.x}" y="${pos.y - 24}" text-anchor="middle">${escapeHtml(badge)}</text>
        <text class="node-label" x="${pos.x}" y="${pos.y + 34}" text-anchor="middle">${escapeHtml(truncate(node.display_name, 28))}</text>
      </g>`;
    }).join("");

    const nCount = [...state.visible].filter((id) => nodeTypeOn(state.nodes.get(id).type)).length;
    el.hud.textContent = state.hudNotice || `${nCount} drawn nodes · ${edges.length} edges · ${state.bundle.meta.context_notice}`;
    bindCanvasEvents();
    renderInspectors();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function screenToWorld(evt) {
    const rect = el.svg.getBoundingClientRect();
    const x = (evt.clientX - rect.left - state.pan.x) / state.scale;
    const y = (evt.clientY - rect.top - state.pan.y) / state.scale;
    return { x, y };
  }

  function applyView() {
    el.viewport.setAttribute("transform", `translate(${state.pan.x} ${state.pan.y}) scale(${state.scale})`);
  }

  function fitGraph() {
    const pts = [...state.visible].map((id) => state.positions.get(id)).filter(Boolean);
    if (!pts.length) return;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs) - 80;
    const maxX = Math.max(...xs) + 80;
    const minY = Math.min(...ys) - 80;
    const maxY = Math.max(...ys) + 80;
    const rect = el.svg.getBoundingClientRect();
    const scale = Math.min(rect.width / (maxX - minX), rect.height / (maxY - minY), 1.8);
    state.scale = Math.max(0.2, scale * 0.9);
    state.pan.x = rect.width / 2 - ((minX + maxX) / 2) * state.scale;
    state.pan.y = rect.height / 2 - ((minY + maxY) / 2) * state.scale;
    applyView();
  }

  function zoomToSelection() {
    const id = state.selection.kind === "node" ? state.selection.id : state.seed;
    const pos = state.positions.get(id);
    if (!pos) return;
    const rect = el.svg.getBoundingClientRect();
    state.scale = Math.max(state.scale, 1.2);
    state.pan.x = rect.width / 2 - pos.x * state.scale;
    state.pan.y = rect.height / 2 - pos.y * state.scale;
    applyView();
  }

  function bindCanvasEvents() {
    el.svg.onwheel = (evt) => {
      evt.preventDefault();
      const before = screenToWorld(evt);
      const factor = evt.deltaY < 0 ? 1.12 : 0.9;
      state.scale = Math.min(4, Math.max(0.15, state.scale * factor));
      const after = screenToWorld(evt);
      state.pan.x += (after.x - before.x) * state.scale;
      state.pan.y += (after.y - before.y) * state.scale;
      applyView();
    };
    el.svg.onmousedown = (evt) => {
      const target = evt.target.closest("[data-id]");
      if (target && target.tagName !== "line" && !target.classList.contains("edge-line")) {
        const id = target.getAttribute("data-id");
        if (state.nodes.has(id)) {
          state.dragging = { id, start: screenToWorld(evt), orig: { ...state.positions.get(id) } };
          return;
        }
      }
      if (target && target.classList.contains("edge-line")) {
        selectEdge(target.getAttribute("data-id"));
        return;
      }
      state.panning = { x: evt.clientX - state.pan.x, y: evt.clientY - state.pan.y };
      el.viewport.classList.add("panning");
    };
    window.onmousemove = (evt) => {
      if (state.dragging) {
        const now = screenToWorld(evt);
        const orig = state.dragging.orig;
        const start = state.dragging.start;
        state.positions.set(state.dragging.id, { x: orig.x + now.x - start.x, y: orig.y + now.y - start.y });
        state.pinned.add(state.dragging.id);
        render();
      } else if (state.panning) {
        state.pan.x = evt.clientX - state.panning.x;
        state.pan.y = evt.clientY - state.panning.y;
        applyView();
      }
    };
    window.onmouseup = (evt) => {
      if (state.dragging) {
        const moved = Math.hypot(evt.movementX, evt.movementY);
        if (moved < 4) selectNode(state.dragging.id);
        state.dragging = null;
      }
      state.panning = null;
      el.viewport.classList.remove("panning");
    };
    el.svg.ondblclick = (evt) => {
      const target = evt.target.closest("[data-id]");
      if (target && state.nodes.has(target.getAttribute("data-id"))) {
        const id = target.getAttribute("data-id");
        expandNode(id, 1);
        layoutAll(false);
        render();
      }
    };
  }

  function selectNode(id) {
    state.selection = { kind: "node", id };
    document.querySelector('.tab[data-tab="node"]').click();
    renderInspectors();
    render();
  }
  function selectEdge(id) {
    state.selection = { kind: "edge", id };
    document.querySelector('.tab[data-tab="edge"]').click();
    renderInspectors();
    render();
  }

  function badgeHtml(node) {
    return (node.semantic_badges || []).map((b) => {
      const cls = b.includes("SOURCE") ? "source-only" : b.includes("SECONDARY") ? "secondary" : b.includes("REVIEW") || b.includes("FLAG") ? "review" : b.includes("ADVISORY") ? "advisory" : "";
      return `<span class="badge ${cls}">${escapeHtml(b)}</span>`;
    }).join("");
  }

  function kv(k, v) {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) {
      return `<div class="kv"><div class="k">${escapeHtml(k)}</div><div class="v">Not present in current artifacts.</div></div>`;
    }
    const text = Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v, null, 2) : String(v);
    return `<div class="kv"><div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(text)}</div></div>`;
  }

  function renderInspectors() {
    const node = state.selection.kind === "node" ? state.nodes.get(state.selection.id) : state.nodes.get(state.seed);
    if (!node) {
      el.inspNode.innerHTML = "<p>Select a search result to inspect an entity.</p>";
      el.inspEdge.innerHTML = "<p>Select an edge on the canvas to see why that line exists.</p>";
      el.inspEvidence.innerHTML = "<p>Evidence appears when a node or edge with locators is selected.</p>";
      return;
    }
    const summary = node.neighborhood_summary || {};
    const remainder = state.hiddenRemainder.get(node.id) || [];
    el.inspNode.innerHTML = `
      <div class="badge">${escapeHtml(node.type)}</div>
      ${badgeHtml(node)}
      ${kv("Display name", node.display_name)}
      ${kv("Canonical ID", node.id)}
      ${kv("Aliases", node.aliases)}
      ${kv("Source status", node.source_status)}
      ${kv("Grounding / classification", node.grounding_status)}
      ${kv("Flags", node.flags)}
      ${kv("Source IDs", node.source_ids)}
      ${kv("Source record", `${node.source_record.path} · ${node.source_record.record_id}`)}
      ${kv("Mention count", node.mention_count)}
      ${kv("Scripture locators", [node.first_locator, node.last_locator].filter(Boolean).join(" → "))}
      ${kv("Neighborhood degree", summary.degree)}
      ${kv("Default-visible neighbors", summary.default_visible_degree || summary.default_neighbor_count)}
      ${kv("Exact-mention context edges", summary.exact_mention_edge_count)}
      ${kv("Speaker/narrator attribution edges", summary.speaker_narrator_edge_count)}
      ${kv("Neighbors by type", summary.by_neighbor_type)}
      ${kv("Edges by class", summary.by_edge_class)}
      ${kv("Relationship types", summary.by_relationship_type)}
      ${node.type === "GROUP" ? kv("Connected events", summary.connected_event_count) : ""}
      ${node.type === "GROUP" ? kv("Books represented in connected events", summary.books_represented) : ""}
      ${node.type === "GROUP" ? `<p class="warn">${escapeHtml(summary.continuity_notice || "")}</p>` : ""}
      ${node.type === "PLACE" ? `<p class="warn">${escapeHtml((node.type_details || {}).place_notice || "")}</p>` : ""}
      ${node.type === "EVENT" ? eventBlock(node) : ""}
      <button class="action" type="button" id="btn-expand">Expand 1 hop</button>
      <button class="action" type="button" id="btn-collapse">Collapse</button>
      ${remainder.length ? `<p class="warn">${remainder.length} extra neighbors hidden (cap ${EXPAND_CAP}). Show more reveals the next ${EXPAND_CAP}.</p><button class="action" type="button" id="btn-more">Show more</button>` : ""}
    `;
    const exp = document.getElementById("btn-expand");
    if (exp) exp.onclick = () => { expandNode(node.id, 1); layoutAll(false); render(); };
    const col = document.getElementById("btn-collapse");
    if (col) col.onclick = () => collapseNode(node.id);
    const more = document.getElementById("btn-more");
    if (more) more.onclick = () => { showMore(node.id); layoutAll(false); render(); };

    const edge = state.selection.kind === "edge" ? state.edges.get(state.selection.id) : null;
    el.inspEdge.innerHTML = edge ? edgeBlock(edge) : "<p>Click a line on the canvas. The edge inspector answers why that line exists.</p>";
    el.inspEvidence.innerHTML = evidenceBlock(node, edge);
  }

  function eventBlock(node) {
    const d = node.type_details || {};
    const se = d.scripture_evidence || {};
    const te = d.temporal_evidence || {};
    return `
      <div class="why">
        <div class="k">Narrative time (not graph position)</div>
        ${kv("event_time_status", te.event_time_status)}
        ${kv("event_time_basis", te.event_time_basis)}
        ${kv("event_identity_from_time", te.event_identity_from_time)}
        ${kv("source secondary chronology", te.source_secondary_chronology)}
      </div>
      <div class="why">
        <div class="k">Textual / book location (separate from narrative time)</div>
        ${kv("books", (d.book_evidence || {}).books)}
        ${kv("book basis", (d.book_evidence || {}).basis)}
      </div>
      ${kv("Evidence classification", d.evidence_classification)}
      ${kv("Primary scripture status", se.primary_event_scripture_status)}
      <p class="warn">${escapeHtml(se.primary_event_scripture_notice || "No primary Event scripture evidence is currently committed.")}</p>
      ${kv("Primary locators", se.primary_event_scripture_locators)}
      ${kv("Secondary bounded locators", se.secondary_bounded_scripture_locators)}
      ${kv("Secondary basis", se.secondary_bound_basis)}
      ${kv("Scope warning", se.scope_warning)}
      ${kv("People continuity", d.people_continuity_conclusion)}
      ${kv("Place continuity", d.place_continuity_conclusion)}
      ${kv("Group continuity", d.group_continuity_conclusion)}
    `;
  }

  function edgeBlock(edge) {
    const a = state.nodes.get(edge.source);
    const b = state.nodes.get(edge.target);
    return `
      <div class="badge ${edge.relationship_class}">${escapeHtml(edge.relationship_class.toUpperCase())}</div>
      ${edge.canonical_claim ? '<span class="badge canonical">CANONICAL</span>' : '<span class="badge context">NOT A CANONICAL CLAIM</span>'}
      <div class="why">
        <strong>Why is this line here?</strong>
        ${kv("Edge class", edge.relationship_class)}
        ${kv("Edge type", edge.relationship_type)}
        ${kv("Meaning", edge.meaning)}
        ${kv("Does not mean", edge.does_not_mean)}
        ${kv("Derivation rule", (edge.derivation || {}).rule)}
        ${kv("Annotation kind", (edge.derivation || {}).annotation_kind)}
        ${kv("Source record", `${(edge.derivation || {}).source_path} · ${(edge.derivation || {}).source_record_id}`)}
      </div>
      ${kv("From", `${a ? a.display_name : "?"} (${edge.source})`)}
      ${kv("To", `${b ? b.display_name : "?"} (${edge.target})`)}
      ${kv("Direction", edge.direction)}
      ${kv("Evidence IDs", edge.evidence_ids)}
      ${kv("Scripture locators", edge.scripture_locators)}
      ${kv("Confidence / status", edge.confidence_status)}
      ${kv("Support count", edge.support_count)}
      ${kv("Default visible", edge.default_visible)}
      ${edge.relationship_type === "speaker_narrator_attribution" ? kv("Speaker IDs", (edge.derivation || {}).speaker_ids) : ""}
    `;
  }

  function evidenceBlock(node, edge) {
    const parts = [];
    if (node && node.type === "EVENT") {
      const se = (node.type_details || {}).scripture_evidence || {};
      parts.push(`<p class="warn">${escapeHtml(se.primary_event_scripture_notice || "No primary Event scripture evidence is currently committed.")}</p>`);
      parts.push(kv("Secondary bounded locators", se.secondary_bounded_scripture_locators));
      parts.push(kv("Scope warning", se.scope_warning));
    }
    if (node && node.type === "EVIDENCE") {
      const d = node.type_details || {};
      parts.push(kv("Evidence ID", node.id));
      parts.push(kv("Locator", d.locator));
      parts.push(kv("Quote (from committed artifact)", d.quote || "No redistributable support text is currently committed."));
      parts.push(kv("Source ID", d.source_id));
      parts.push(kv("Evidence type", d.evidence_type));
    }
    if (edge) {
      parts.push(kv("Edge evidence IDs", edge.evidence_ids && edge.evidence_ids.length ? edge.evidence_ids : "No evidence IDs on this edge."));
      parts.push(kv("Edge locators", edge.scripture_locators && edge.scripture_locators.length ? edge.scripture_locators : "No scripture locators on this edge."));
      if (edge.relationship_type === "event_secondary_verse_span") {
        parts.push('<p class="warn">These locators are secondary bounded context. They are not primary Event proof.</p>');
      }
      if (edge.relationship_type === "speaker_narrator_attribution") {
        parts.push('<p class="warn">Narration or speaker attribution does not establish historical presence or participation.</p>');
        parts.push(kv("Speaker IDs", (edge.derivation || {}).speaker_ids));
      }
      if (edge.relationship_type === "scripture_same_verse") {
        parts.push('<p class="warn">Exact mention in the same verse is not identity, interaction, or speaker attribution.</p>');
      }
    }
    if (!parts.length) parts.push("<p>No evidence payload attached to the current selection.</p>");
    return parts.join("");
  }

  function runSearch(q) {
    const query = (q ?? el.search.value).trim().toLowerCase();
    if (!query) {
      el.results.hidden = true;
      el.results.innerHTML = "";
      return;
    }
    const hits = [];
    for (const row of state.search) {
      if (row.optional && !nodeTypeOn(row.type)) continue;
      const hay = [row.id, row.display_name, ...(row.aliases || []), ...(row.tokens || [])].join(" ").toLowerCase();
      if (!hay.includes(query) && row.id.toLowerCase() !== query) continue;
      let score = 100;
      if (row.id.toLowerCase() === query) score = 0;
      else if ((row.display_name || "").toLowerCase() === query) score = 1;
      else if ((row.display_name || "").toLowerCase().startsWith(query)) score = 2;
      hits.push({ row, score });
    }
    hits.sort((a, b) => a.score - b.score || a.row.id.localeCompare(b.row.id));
    const top = hits.slice(0, 30);
    el.results.hidden = top.length === 0;
    el.results.innerHTML = top.map((hit, i) => `
      <div class="search-hit ${i === 0 ? "active" : ""}" data-id="${escapeHtml(hit.row.id)}">
        <span class="badge">${escapeHtml(hit.row.type)}</span>
        <span>${escapeHtml(hit.row.display_name)}</span>
        <span class="mono">${escapeHtml(hit.row.id)}</span>
      </div>
    `).join("");
    [...el.results.querySelectorAll(".search-hit")].forEach((hitEl) => {
      hitEl.onclick = () => {
        el.results.hidden = true;
        seedEntity(hitEl.getAttribute("data-id"));
      };
    });
  }

  function shortestPath(fromId, toId) {
    const q = [[fromId]];
    const seen = new Set([fromId]);
    while (q.length) {
      const path = q.shift();
      const last = path[path.length - 1];
      if (last === toId) return path;
      if (path.length > 7) continue;
      neighborsOf(last).forEach((item) => {
        if (seen.has(item.node.id)) return;
        seen.add(item.node.id);
        q.push([...path, item.node.id]);
      });
    }
    return null;
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.onclick = () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      el.inspNode.hidden = tab.dataset.tab !== "node";
      el.inspEdge.hidden = tab.dataset.tab !== "edge";
      el.inspEvidence.hidden = tab.dataset.tab !== "evidence";
    };
  });
  document.querySelectorAll("[data-node-type]").forEach((box) => {
    box.onchange = () => {
      state.filters.node[box.getAttribute("data-node-type")] = box.checked;
      if (state.seed) { layoutAll(false); render(); }
    };
  });
  document.querySelectorAll("[data-edge-class]").forEach((box) => {
    box.onchange = () => {
      state.filters.edge[box.getAttribute("data-edge-class")] = box.checked;
      if (state.seed) { layoutAll(false); render(); }
    };
  });
  document.getElementById("hop-depth").onchange = (evt) => {
    state.hop = Number(evt.target.value);
    if (state.seed) seedEntity(state.seed);
  };
  document.getElementById("btn-fit").onclick = fitGraph;
  document.getElementById("btn-recenter").onclick = () => { layoutAll(true); render(); fitGraph(); };
  document.getElementById("btn-zoom-in").onclick = () => { state.scale = Math.min(4, state.scale * 1.2); applyView(); };
  document.getElementById("btn-zoom-out").onclick = () => { state.scale = Math.max(0.15, state.scale / 1.2); applyView(); };
  document.getElementById("btn-zoom-sel").onclick = zoomToSelection;
  document.getElementById("btn-reset").onclick = () => {
    state.seed = null;
    state.visible = new Set();
    state.expanded = new Set();
    state.hiddenRemainder = new Map();
    state.hudNotice = "";
    el.hud.textContent = "";
    el.empty.hidden = false;
    el.nodes.innerHTML = "";
    el.edges.innerHTML = "";
    history.replaceState({}, "", window.location.pathname);
  };
  document.getElementById("btn-path").onclick = () => {
    el.pathFrom.value = state.seed || "";
    el.pathModal.hidden = false;
  };
  document.getElementById("path-close").onclick = () => { el.pathModal.hidden = true; };
  document.getElementById("path-run").onclick = () => {
    const path = shortestPath(el.pathFrom.value.trim(), el.pathTo.value.trim());
    if (!path) {
      el.pathResult.textContent = "No path under current filters. This is graph topology, not history.";
      return;
    }
    path.forEach((id) => state.visible.add(id));
    layoutAll(false);
    render();
    el.pathResult.textContent = `Graph path, ${path.length - 1} hops — not a historical relationship.\n${path.join(" → ")}`;
  };
  el.search.addEventListener("input", () => runSearch());
  el.search.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter") {
      const first = el.results.querySelector(".search-hit");
      if (first) seedEntity(first.getAttribute("data-id"));
    }
  });
  window.addEventListener("keydown", (evt) => {
    if (evt.key === "/" && document.activeElement !== el.search) {
      evt.preventDefault();
      el.search.focus();
    }
    if (evt.key === "Escape") {
      el.results.hidden = true;
      el.pathModal.hidden = true;
    }
    if (evt.key === "f" || evt.key === "F") fitGraph();
  });

  loadBundle();
})();
