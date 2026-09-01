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
      people: { MVP_MAJOR: true, MVP_SUPPORTING: true, RESOLVED: true, CROSSWALK_REVIEW: true, DEFERRED: false },
      edge: { canonical: true, context: false, provenance: false, advisory: false, attribution: false },
    },
    hop: 1,
    selection: { kind: null, id: null },
    secondaryMode: "dim", // "dim" | "hide" | "show"
    pan: { x: 0, y: 0 },
    scale: 1,
    dragging: null,
    panning: null,
  };

  const BOOK_ORDER = {
    "1 Nephi": 1, "2 Nephi": 2, "Jacob": 3, "Enos": 4, "Jarom": 5, "Omni": 6,
    "Words of Mormon": 7, "Mosiah": 8, "Alma": 9, "Helaman": 10, "3 Nephi": 11,
    "4 Nephi": 12, "Mormon": 13, "Ether": 14, "Moroni": 15,
  };

  function parseScriptureLoc(loc) {
    if (!loc || typeof loc !== "string") return [999, 999, 999];
    const m = loc.trim().match(/^(.*?)\s+(\d+)(?::(\d+))?/);
    if (m) {
      const book = m[1];
      const ch = parseInt(m[2], 10) || 0;
      const v = parseInt(m[3], 10) || 0;
      const bookRank = BOOK_ORDER[book] || 900;
      return [bookRank, ch, v];
    }
    return [999, 999, 999];
  }

  function compareEventsByScripture(aId, bId) {
    const aNode = state.nodes.get(aId) || {};
    const bNode = state.nodes.get(bId) || {};
    const aLoc = aNode.first_locator || (aNode.type_details || {}).scripture_start || "";
    const bLoc = bNode.first_locator || (bNode.type_details || {}).scripture_start || "";
    const [aB, aC, aV] = parseScriptureLoc(aLoc);
    const [bB, bC, bV] = parseScriptureLoc(bLoc);
    if (aB !== bB) return aB - bB;
    if (aC !== bC) return aC - bC;
    if (aV !== bV) return aV - bV;
    return (aNode.display_name || aId).localeCompare(bNode.display_name || bId);
  }

  function wrapEventName(name, maxLine1 = 18, maxLine2 = 24) {
    if (!name) return ["", ""];
    const words = name.split(" ");
    const line1 = [];
    const line2 = [];
    let curLen = 0;
    for (const w of words) {
      if (!line2.length && (curLen + w.length + (line1.length ? 1 : 0) <= maxLine1)) {
        line1.push(w);
        curLen += w.length + (line1.length > 1 ? 1 : 0);
      } else {
        line2.push(w);
      }
    }
    if (!line2.length) return [line1.join(" "), ""];
    let l2Str = line2.join(" ");
    if (l2Str.length > maxLine2) {
      l2Str = l2Str.slice(0, maxLine2 - 1) + "…";
    }
    return [line1.join(" "), l2Str];
  }

  function formatNodeLabel(node, x, y) {
    const name = node.display_name || node.id;
    if (node.type === "EVENT") {
      const [l1, l2] = wrapEventName(name, 18, 24);
      if (l2) {
        return `<text class="node-label node-label-event" x="${x}" y="${y + 28}" text-anchor="middle">
          <tspan x="${x}" dy="0">${escapeHtml(l1)}</tspan>
          <tspan x="${x}" dy="13">${escapeHtml(l2)}</tspan>
        </text>`;
      }
      return `<text class="node-label node-label-event" x="${x}" y="${y + 32}" text-anchor="middle">${escapeHtml(l1)}</text>`;
    }
    return `<text class="node-label" x="${x}" y="${y + 34}" text-anchor="middle">${escapeHtml(truncate(name, 26))}</text>`;
  }

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
      const p1Info = meta.phase1_people_count ? ` (${meta.phase1_people_count} Phase-1 People)` : "";
      el.counts.textContent = `${Object.values(meta.node_counts_by_type || {}).reduce((a, b) => a + b, 0)} nodes${p1Info} · ${Object.values(meta.edge_counts_by_class || {}).reduce((a, b) => a + b, 0)} edges`;
      
      const builtAt = meta.built_at || "";
      const commit = meta.source_commit && meta.source_commit !== "unknown" ? meta.source_commit.substring(0, 7) : "";
      const hash = meta.graph_sha256 ? meta.graph_sha256.substring(0, 8) : "";
      const bTime = document.getElementById("build-time");
      const bCommit = document.getElementById("build-commit");
      const bHash = document.getElementById("build-hash");
      if (bTime) bTime.textContent = builtAt ? builtAt : "";
      if (bCommit) bCommit.textContent = commit ? `Src: ${commit}` : "";
      if (bHash) bHash.textContent = hash ? `Graph: ${hash}` : "";
      state.currentGraphSha = meta.graph_sha256;

      renderQaChips(meta.qa_examples || {});
      const params = new URLSearchParams(window.location.search);
      const deep = params.get("entity");
      if (deep) seedEntity(deep);
      else renderInspectors();

      if (!state.autoReloadStarted) {
        state.autoReloadStarted = true;
        startAutoReloadWatcher();
      }
    } catch (err) {
      showError(err.message || String(err));
    }
  }

  function startAutoReloadWatcher() {
    let isChecking = false;
    setInterval(async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (
          data.ok &&
          data.graph_sha256 &&
          state.currentGraphSha &&
          data.graph_sha256 !== state.currentGraphSha
        ) {
          console.log("[VIEW-001] Graph update detected. Reloading...");
          if (el.hud) el.hud.textContent = "New graph build detected. Reloading...";
          setTimeout(() => {
            window.location.reload();
          }, 300);
        }
      } catch (err) {
        // Silently ignore transient network errors
      } finally {
        isChecking = false;
      }
    }, 1500);
  }

  function renderQaChips(examples) {
    const preferred = [
      ["lehi_patriarch", "Lehi (Patriarch)"],
      ["nephi_son_of_lehi", "Nephi (Son of Lehi)"],
      ["alma_the_elder", "Alma the Elder"],
      ["alma_the_younger", "Alma the Younger"],
      ["king_benjamin", "King Benjamin"],
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

  function nodePassesFilter(node) {
    if (!node) return false;
    if (!nodeTypeOn(node.type)) return false;
    if (node.type === "PERSON") {
      const isDeferred = (node.type_details || {}).is_deferred || node.is_deferred;
      if (isDeferred && !state.filters.people.DEFERRED) return false;
      const cls = node.phase1_classification || (node.type_details || {}).phase1_classification;
      if (cls === "MVP_MAJOR" && !state.filters.people.MVP_MAJOR) return false;
      if (cls === "MVP_SUPPORTING" && !state.filters.people.MVP_SUPPORTING) return false;
      const status = node.identity_status || (node.type_details || {}).identity_status;
      if (status === "RESOLVED" && !state.filters.people.RESOLVED) return false;
      if (status === "FORGE_CROSSWALK_REVIEW" && !state.filters.people.CROSSWALK_REVIEW) return false;
    }
    return true;
  }

  function neighborsOf(id) {
    const index = state.neighborhood[id] || { edge_ids: [], neighbors: [] };
    const out = [];
    (index.edge_ids || []).forEach((edgeId) => {
      const edge = state.edges.get(edgeId);
      if (!edge || !edgeClassOn(edge.relationship_class)) return;
      const other = edge.source === id ? edge.target : edge.source;
      const node = state.nodes.get(other);
      if (!node || !nodePassesFilter(node)) return;
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
    el.results.hidden = true;
    el.results.innerHTML = "";
    el.search.value = "";
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
        if (state.visible.has(item.node.id)) {
          if (!queued.has(item.node.id) && cur.depth + 1 < hops) {
            queued.add(item.node.id);
            queue.push({ id: item.node.id, depth: cur.depth + 1 });
          }
          continue;
        }
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
        if (!queued.has(item.node.id) && cur.depth + 1 < hops) {
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

  function refreshGraph(options = {}) {
    if (!state.seed) return;
    const resetPositions = !!options.resetPositions;

    state.visible = new Set([state.seed]);
    state.hiddenRemainder = new Map();
    state.hudNotice = "";

    expandNode(state.seed, state.hop);

    if (state.expanded) {
      state.expanded.forEach((eid) => {
        if (eid !== state.seed && state.visible.has(eid)) {
          showMore(eid);
        }
      });
    }

    if (state.selection.kind === "node") {
      const selNode = state.nodes.get(state.selection.id);
      if (!selNode || !nodePassesFilter(selNode) || !state.visible.has(state.selection.id)) {
        state.selection = { kind: "node", id: state.seed };
      }
    } else if (state.selection.kind === "edge") {
      const selEdge = state.edges.get(state.selection.id);
      if (
        !selEdge ||
        !edgeClassOn(selEdge.relationship_class) ||
        !state.visible.has(selEdge.source) ||
        !state.visible.has(selEdge.target) ||
        !nodePassesFilter(state.nodes.get(selEdge.source)) ||
        !nodePassesFilter(state.nodes.get(selEdge.target))
      ) {
        state.selection = { kind: "node", id: state.seed };
      }
    }

    layoutAll(resetPositions);
    render();
    if (options.fit) {
      fitGraph();
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
    const seedNode = state.nodes.get(state.seed);
    const isEventSeed = seedNode && seedNode.type === "EVENT";
    const seedPos = reset
      ? (isEventSeed ? { x: 0, y: 0 } : { x: 0, y: -240 })
      : state.positions.get(state.seed) || (isEventSeed ? { x: 0, y: 0 } : { x: 0, y: -240 });
    state.positions.set(state.seed, seedPos);

    const hopOf = new Map([[state.seed, 0]]);
    const parentsOf = new Map([[state.seed, []]]);
    const q = [state.seed];

    while (q.length) {
      const id = q.shift();
      neighborsOf(id).forEach((item) => {
        if (!state.visible.has(item.node.id)) return;
        if (!hopOf.has(item.node.id)) {
          hopOf.set(item.node.id, (hopOf.get(id) || 0) + 1);
          parentsOf.set(item.node.id, [id]);
          q.push(item.node.id);
        } else if (hopOf.get(item.node.id) === (hopOf.get(id) || 0) + 1) {
          if (!parentsOf.has(item.node.id)) parentsOf.set(item.node.id, []);
          parentsOf.get(item.node.id).push(id);
        }
      });
    }
    state.visible.forEach((id) => {
      if (!hopOf.has(id)) hopOf.set(id, 1);
    });

    const maxHop = Math.max(1, ...[...hopOf.values()]);
    const byHop = new Map();
    state.visible.forEach((id) => {
      if (id === state.seed) return;
      const hop = hopOf.get(id) || 1;
      if (!byHop.has(hop)) byHop.set(hop, []);
      byHop.get(hop).push(id);
    });

    if (isEventSeed) {
      // Event-centric layout
      const hop1 = byHop.get(1) || [];
      const people = hop1.filter((id) => (state.nodes.get(id) || {}).type === "PERSON");
      const places = hop1.filter((id) => (state.nodes.get(id) || {}).type === "PLACE");
      const groups = hop1.filter((id) => (state.nodes.get(id) || {}).type === "GROUP");
      const others = hop1.filter((id) => {
        const t = (state.nodes.get(id) || {}).type;
        return t !== "PERSON" && t !== "PLACE" && t !== "GROUP";
      });

      // Participating People on top shelf (y = -220)
      if (people.length) {
        people.sort((a, b) => (state.nodes.get(a)?.display_name || a).localeCompare(state.nodes.get(b)?.display_name || b));
        const spacing = 190;
        const totalW = (people.length - 1) * spacing;
        const startX = seedPos.x - totalW / 2;
        people.forEach((id, i) => {
          if (state.pinned.has(id) && state.positions.has(id) && !reset) return;
          state.positions.set(id, { x: startX + i * spacing, y: seedPos.y - 220 });
        });
      }

      // Places & Groups on bottom shelf (y = 220)
      const bottomNodes = [...places, ...groups, ...others];
      if (bottomNodes.length) {
        bottomNodes.sort((a, b) => (state.nodes.get(a)?.display_name || a).localeCompare(state.nodes.get(b)?.display_name || b));
        const spacing = 200;
        const totalW = (bottomNodes.length - 1) * spacing;
        const startX = seedPos.x - totalW / 2;
        bottomNodes.forEach((id, i) => {
          if (state.pinned.has(id) && state.positions.has(id) && !reset) return;
          state.positions.set(id, { x: startX + i * spacing, y: seedPos.y + 220 });
        });
      }

      // Hop 2+ nodes
      for (let h = 2; h <= maxHop; h += 1) {
        const nodesAtHop = byHop.get(h) || [];
        if (!nodesAtHop.length) continue;
        const spacing = 180;
        const totalW = (nodesAtHop.length - 1) * spacing;
        const startX = seedPos.x - totalW / 2;
        nodesAtHop.forEach((id, i) => {
          if (state.pinned.has(id) && state.positions.has(id) && !reset) return;
          state.positions.set(id, { x: startX + i * spacing, y: seedPos.y + 220 + (h - 1) * 200 });
        });
      }
      return;
    }

    // Person-centric / General tiered layout
    const yGap = 260;
    const spacing = 190;

    for (let h = 1; h <= maxHop; h += 1) {
      const nodesAtHop = byHop.get(h) || [];
      if (!nodesAtHop.length) continue;

      const peopleNodes = nodesAtHop.filter((id) => (state.nodes.get(id) || {}).type === "PERSON");
      const eventNodes = nodesAtHop.filter((id) => (state.nodes.get(id) || {}).type === "EVENT");
      const otherNodes = nodesAtHop.filter((id) => {
        const t = (state.nodes.get(id) || {}).type;
        return t !== "PERSON" && t !== "EVENT";
      });

      const tiers = [];
      if (peopleNodes.length) tiers.push({ type: "PERSON", ids: peopleNodes });
      if (eventNodes.length) tiers.push({ type: "EVENT", ids: eventNodes });
      if (otherNodes.length) tiers.push({ type: "OTHER", ids: otherNodes });

      let currentTierY = seedPos.y + (h - 1) * yGap + (tiers.length > 1 ? 210 : yGap);

      tiers.forEach((tier) => {
        const ids = tier.ids;
        if (tier.type === "EVENT") {
          // Sort events in scripture / narrative order!
          ids.sort(compareEventsByScripture);
        } else {
          // Sort people / others by parent X then display name
          ids.sort((aId, bId) => {
            const aPars = parentsOf.get(aId) || [];
            const bPars = parentsOf.get(bId) || [];
            const aParXs = aPars.map((p) => (state.positions.get(p) || {}).x).filter((x) => x !== undefined);
            const bParXs = bPars.map((p) => (state.positions.get(p) || {}).x).filter((x) => x !== undefined);
            const aAvgX = aParXs.length ? aParXs.reduce((sum, v) => sum + v, 0) / aParXs.length : 0;
            const bAvgX = bParXs.length ? bParXs.reduce((sum, v) => sum + v, 0) / bParXs.length : 0;
            if (Math.abs(aAvgX - bAvgX) > 1e-3) return aAvgX - bAvgX;

            const aNode = state.nodes.get(aId) || {};
            const bNode = state.nodes.get(bId) || {};
            return (aNode.display_name || aId).localeCompare(bNode.display_name || bId);
          });
        }

        const N = ids.length;
        const tierSpacing = tier.type === "EVENT" ? 220 : spacing;
        const totalW = (N - 1) * tierSpacing;
        const startX = seedPos.x - totalW / 2;

        ids.forEach((id, i) => {
          if (state.pinned.has(id) && state.positions.has(id) && !reset) return;
          const x = startX + i * tierSpacing;
          let curve = 0;
          if (N > 2) {
            const normPos = (i - (N - 1) / 2) / ((N - 1) / 2);
            curve = normPos * normPos * 25;
          }
          state.positions.set(id, { x, y: currentTierY + curve });
        });

        currentTierY += 240;
      });
    }
  }

  function visibleEdges() {
    const out = [];
    state.edges.forEach((edge) => {
      if (!edgeClassOn(edge.relationship_class)) return;
      if (!state.visible.has(edge.source) || !state.visible.has(edge.target)) return;
      const a = state.nodes.get(edge.source);
      const b = state.nodes.get(edge.target);
      if (!a || !b || !nodePassesFilter(a) || !nodePassesFilter(b)) return;
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
    const focusNodeId = selectedNode || state.seed;

    el.edges.innerHTML = edges.map((edge) => {
      const isPrimary = (edge.source === focusNodeId || edge.target === focusNodeId);
      const isSecondary = !isPrimary;
      if (isSecondary && state.secondaryMode === "hide") return "";

      const a = state.positions.get(edge.source);
      const b = state.positions.get(edge.target);
      if (!a || !b) return "";
      const selected = edge.id === selectedEdge;
      const marker = edge.relationship_class === "canonical" && edge.direction === "directed"
        ? (isPrimary ? "url(#arrow-canonical)" : "url(#arrow-canonical-dim)")
        : "";

      // Show label for primary canonical edges, or if selected, or if secondaryMode is "show"
      const showLabel = (isPrimary || selected || state.secondaryMode === "show") && edge.relationship_class === "canonical";
      const label = showLabel ? edge.ui_label : "";
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;

      const cls = [
        "edge-line",
        `edge-${edge.relationship_class}`,
        isPrimary ? "edge-primary" : "edge-secondary",
        selected ? "edge-selected" : "",
      ].filter(Boolean).join(" ");

      return `<g class="edge-g" data-id="${edge.id}">
        <line class="${cls}" data-id="${edge.id}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" marker-end="${marker}"></line>
        ${label ? `<text class="edge-label ${isPrimary ? "edge-label-primary" : "edge-label-secondary"}" x="${mx}" y="${my - 5}" text-anchor="middle">${escapeHtml(label)}</text>` : ""}
      </g>`;
    }).join("");

    el.nodes.innerHTML = [...state.visible].map((id) => {
      const node = state.nodes.get(id);
      const pos = state.positions.get(id) || { x: 0, y: 0 };
      if (!nodePassesFilter(node)) return "";
      const rem = (state.hiddenRemainder.get(id) || []).length;
      const badge = rem ? `+${rem}` : node.type;
      const isFocus = id === focusNodeId;
      const isSel = id === selectedNode;
      return `<g class="node-g ${isFocus ? "node-focused" : ""}" data-id="${id}" transform="translate(0,0)">
        <title>${escapeHtml(node.display_name)} (${node.id})</title>
        ${shapeFor(node, pos.x, pos.y, isSel || isFocus)}
        <text class="node-badge" x="${pos.x}" y="${pos.y - 24}" text-anchor="middle">${escapeHtml(badge)}</text>
        ${formatNodeLabel(node, pos.x, pos.y)}
      </g>`;
    }).join("");

    const nCount = [...state.visible].filter((id) => nodePassesFilter(state.nodes.get(id))).length;
    const hopLabel = `${state.hop} hop${state.hop > 1 ? "s" : ""}`;
    const drawnEdges = edges.filter((e) => {
      const isPrimary = (e.source === focusNodeId || e.target === focusNodeId);
      return isPrimary || state.secondaryMode !== "hide";
    });
    const focusName = state.nodes.get(focusNodeId)?.display_name || focusNodeId;
    el.hud.textContent = state.hudNotice || `${nCount} drawn nodes (${hopLabel}) · ${drawnEdges.length} edges (focus: ${truncate(focusName, 20)}) · ${state.bundle.meta.context_notice}`;
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

  let touchStartDist = 0;
  let touchStartScale = 1;

  function getTouchDist(touches) {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
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

    const handleStart = (clientX, clientY, targetEl) => {
      const target = targetEl.closest("[data-id]");
      if (target && target.tagName !== "line" && !target.classList.contains("edge-line")) {
        const id = target.getAttribute("data-id");
        if (state.nodes.has(id)) {
          state.dragging = {
            id,
            start: screenToWorld({ clientX, clientY }),
            orig: { ...state.positions.get(id) },
            screenStart: { x: clientX, y: clientY },
          };
          return true;
        }
      }
      if (target && target.classList.contains("edge-line")) {
        selectEdge(target.getAttribute("data-id"));
        return true;
      }
      state.panning = { x: clientX - state.pan.x, y: clientY - state.pan.y };
      el.viewport.classList.add("panning");
      return true;
    };

    const handleMove = (clientX, clientY) => {
      if (state.dragging) {
        const now = screenToWorld({ clientX, clientY });
        const orig = state.dragging.orig;
        const start = state.dragging.start;
        state.positions.set(state.dragging.id, { x: orig.x + now.x - start.x, y: orig.y + now.y - start.y });
        state.pinned.add(state.dragging.id);
        render();
        return true;
      }
      if (state.panning) {
        state.pan.x = clientX - state.panning.x;
        state.pan.y = clientY - state.panning.y;
        applyView();
        return true;
      }
      return false;
    };

    const handleEnd = (clientX, clientY) => {
      if (state.dragging) {
        const dx = clientX - (state.dragging.screenStart ? state.dragging.screenStart.x : clientX);
        const dy = clientY - (state.dragging.screenStart ? state.dragging.screenStart.y : clientY);
        if (Math.hypot(dx, dy) < 8) selectNode(state.dragging.id);
        state.dragging = null;
      }
      state.panning = null;
      el.viewport.classList.remove("panning");
    };

    // Mouse Fallback
    el.svg.onmousedown = (evt) => handleStart(evt.clientX, evt.clientY, evt.target);
    window.onmousemove = (evt) => handleMove(evt.clientX, evt.clientY);
    window.onmouseup = (evt) => handleEnd(evt.clientX, evt.clientY);

    // Touch Event Listeners (non-passive to allow preventDefault)
    el.svg.addEventListener("touchstart", (evt) => {
      if (evt.touches.length === 2) {
        evt.preventDefault();
        touchStartDist = getTouchDist(evt.touches);
        touchStartScale = state.scale;
        state.dragging = null;
        state.panning = null;
        return;
      }
      if (evt.touches.length === 1) {
        const t = evt.touches[0];
        if (handleStart(t.clientX, t.clientY, evt.target)) {
          evt.preventDefault();
        }
      }
    }, { passive: false });

    el.svg.addEventListener("touchmove", (evt) => {
      if (evt.touches.length === 2 && touchStartDist > 0) {
        evt.preventDefault();
        const dist = getTouchDist(evt.touches);
        const factor = dist / touchStartDist;
        state.scale = Math.min(4, Math.max(0.15, touchStartScale * factor));
        applyView();
        return;
      }
      if (evt.touches.length === 1) {
        const t = evt.touches[0];
        if (handleMove(t.clientX, t.clientY)) {
          evt.preventDefault();
        }
      }
    }, { passive: false });

    el.svg.addEventListener("touchend", (evt) => {
      touchStartDist = 0;
      if (evt.changedTouches.length) {
        const t = evt.changedTouches[0];
        handleEnd(t.clientX, t.clientY);
      }
    }, { passive: false });

    el.svg.ondblclick = (evt) => {
      const target = evt.target.closest("[data-id]");
      if (target && state.nodes.has(target.getAttribute("data-id"))) {
        const id = target.getAttribute("data-id");
        seedEntity(id);
      }
    };
  }

  function showInspector() {
    const insp = document.getElementById("inspector");
    const ws = document.querySelector(".workspace");
    const btnShow = document.getElementById("btn-show-inspector");
    if (insp) insp.classList.remove("collapsed", "minimized");
    if (ws) ws.classList.remove("inspector-collapsed");
    if (btnShow) btnShow.hidden = true;
  }

  function hideInspector() {
    const insp = document.getElementById("inspector");
    const ws = document.querySelector(".workspace");
    const btnShow = document.getElementById("btn-show-inspector");
    if (insp) insp.classList.add("collapsed");
    if (ws) ws.classList.add("inspector-collapsed");
    if (btnShow) btnShow.hidden = false;
  }

  function selectNode(id) {
    state.selection = { kind: "node", id };
    document.querySelector('.tab[data-tab="node"]').click();
    showInspector();
    renderInspectors();
    render();
  }
  function selectEdge(id) {
    state.selection = { kind: "edge", id };
    document.querySelector('.tab[data-tab="edge"]').click();
    showInspector();
    renderInspectors();
    render();
  }

  function badgeHtml(node) {
    return (node.semantic_badges || []).map((b) => {
      let cls = "";
      if (b.includes("MVP MAJOR") || b.includes("RESOLVED")) cls = "canonical";
      else if (b.includes("MVP SUPPORTING") || b.includes("SECONDARY")) cls = "secondary";
      else if (b.includes("CROSSWALK") || b.includes("REVIEW") || b.includes("UNRESOLVED")) cls = "review";
      else if (b.includes("DEFERRED") || b.includes("SOURCE")) cls = "source-only";
      else if (b.includes("ADVISORY")) cls = "advisory";
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

  function connectionBreakdownHtml(node) {
    const index = state.neighborhood[node.id] || { edge_ids: [] };
    const edgeIds = index.edge_ids || [];
    if (!edgeIds.length) return "";

    let canonicalVis = 0;
    let canonicalNodeFilterHid = 0;
    let canonicalClassHid = 0;
    let canonicalHopHid = 0;
    let contextVis = 0, contextHid = 0;
    let attribVis = 0, attribHid = 0;
    let provVis = 0, provHid = 0;
    let advVis = 0, advHid = 0;

    edgeIds.forEach((eid) => {
      const edge = state.edges.get(eid);
      if (!edge) return;
      const otherId = edge.source === node.id ? edge.target : edge.source;
      const otherNode = state.nodes.get(otherId);
      const isEdgeOn = edgeClassOn(edge.relationship_class);
      const isNodeOn = otherNode && nodePassesFilter(otherNode);
      const isDrawn = isEdgeOn && isNodeOn && state.visible.has(edge.source) && state.visible.has(edge.target);

      const cls = edge.relationship_class;
      if (cls === "canonical") {
        if (isDrawn) {
          canonicalVis += 1;
        } else if (!isEdgeOn) {
          canonicalClassHid += 1;
        } else if (!isNodeOn) {
          canonicalNodeFilterHid += 1;
        } else {
          canonicalHopHid += 1;
        }
      } else if (cls === "context") {
        if (isDrawn) contextVis += 1;
        else contextHid += 1;
      } else if (cls === "attribution") {
        if (isDrawn) attribVis += 1;
        else attribHid += 1;
      } else if (cls === "provenance") {
        if (isDrawn) provVis += 1;
        else provHid += 1;
      } else if (cls === "advisory") {
        if (isDrawn) advVis += 1;
        else advHid += 1;
      }
    });

    const lines = [];
    if (canonicalVis) lines.push(`<span class="conn-item conn-vis">${canonicalVis} canonical visible</span>`);
    if (canonicalNodeFilterHid) lines.push(`<span class="conn-item conn-hid">${canonicalNodeFilterHid} canonical hidden by node filter</span>`);
    if (canonicalClassHid) lines.push(`<span class="conn-item conn-hid">${canonicalClassHid} canonical hidden by edge filter</span>`);
    if (canonicalHopHid) lines.push(`<span class="conn-item conn-hid">${canonicalHopHid} canonical outside current hop</span>`);
    if (contextVis) lines.push(`<span class="conn-item conn-vis">${contextVis} context visible</span>`);
    if (contextHid) lines.push(`<span class="conn-item conn-hid">${contextHid} context hidden</span>`);
    if (attribVis) lines.push(`<span class="conn-item conn-vis">${attribVis} speaker/narrator visible</span>`);
    if (attribHid) lines.push(`<span class="conn-item conn-hid">${attribHid} speaker/narrator hidden</span>`);
    if (provVis) lines.push(`<span class="conn-item conn-vis">${provVis} provenance visible</span>`);
    if (provHid) lines.push(`<span class="conn-item conn-hid">${provHid} provenance hidden</span>`);
    if (advVis) lines.push(`<span class="conn-item conn-vis">${advVis} advisory visible</span>`);
    if (advHid) lines.push(`<span class="conn-item conn-hid">${advHid} advisory hidden</span>`);

    if (!lines.length) return "";
    return `
      <div class="why conn-summary">
        <div class="k">Connection Breakdown</div>
        <div class="conn-grid">
          ${lines.join("")}
        </div>
      </div>
    `;
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
      ${node.type === "PERSON" ? personBlock(node) : ""}
      ${node.type !== "PERSON" ? kv("Display name", node.display_name) : ""}
      ${node.type !== "PERSON" ? kv("Canonical ID", node.id) : ""}
      ${node.type !== "PERSON" ? kv("Aliases", node.aliases) : ""}
      ${node.type !== "PERSON" ? kv("Source status", node.source_status) : ""}
      ${node.type !== "PERSON" ? kv("Grounding / classification", node.grounding_status) : ""}
      ${node.type !== "PERSON" ? kv("Flags", node.flags) : ""}
      ${node.type !== "PERSON" ? kv("Source IDs", node.source_ids) : ""}
      ${node.type !== "PERSON" ? kv("Source record", `${node.source_record.path} · ${node.source_record.record_id}`) : ""}
      ${node.type !== "PERSON" ? kv("Mention count", node.mention_count) : ""}
      ${node.type !== "PERSON" ? kv("Scripture locators", [node.first_locator, node.last_locator].filter(Boolean).join(" → ")) : ""}
      ${connectionBreakdownHtml(node)}
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
      ${node.id !== state.seed ? `<button class="action" type="button" id="btn-seed">Make main root</button>` : ""}
      <button class="action" type="button" id="btn-expand">Expand 1 hop</button>
      <button class="action" type="button" id="btn-collapse">Collapse</button>
      ${remainder.length ? `<p class="warn">${remainder.length} extra neighbors hidden (cap ${EXPAND_CAP}). Show more reveals the next ${EXPAND_CAP}.</p><button class="action" type="button" id="btn-more">Show more</button>` : ""}
    `;
    const seedBtn = document.getElementById("btn-seed");
    if (seedBtn) seedBtn.onclick = () => seedEntity(node.id);
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

  function personBlock(node) {
    const d = node.type_details || {};
    const summary = node.neighborhood_summary || {};
    const dc = summary.domain_counts || { people: 0, places: 0, events: 0, groups: 0, scripture: 0 };
    const evList = d.primary_scripture_identity_evidence || [];
    const candMap = d.forge_candidate_records || {};
    const cands = d.candidate_forge_person_ids || [];

    let evHtml = "";
    if (evList.length) {
      evHtml = `
        <div class="evidence-list">
          ${evList.map((ev) => `
            <div class="evidence-card">
              <div class="ev-header">
                <strong>${escapeHtml(ev.scripture_locator || ev.research_locator || "")}</strong>
                <span class="badge ${ev.verified_in_corpus ? "canonical" : "review"}">${ev.verified_in_corpus ? "Verified" : "Unverified"}</span>
                ${ev.source ? `<span class="badge secondary">${escapeHtml(ev.source)}</span>` : ""}
              </div>
              ${ev.claim ? `<p class="ev-claim">${escapeHtml(ev.claim)}</p>` : ""}
              ${ev.verse_text ? `<blockquote class="ev-verse">${escapeHtml(ev.verse_text)}</blockquote>` : ""}
            </div>
          `).join("")}
        </div>
      `;
    } else {
      evHtml = '<p class="warn">No decisive scripture identity evidence committed.</p>';
    }

    let candHtml = "";
    if (cands.length) {
      candHtml = `
        <div class="candidate-box">
          <div class="k">Candidate Forge Person IDs (${cands.length})</div>
          ${cands.map((cid) => {
            const rec = candMap[cid] || {};
            const name = rec.display_name ? ` — ${escapeHtml(rec.display_name)}` : "";
            const aliases = rec.aliases && rec.aliases.length ? ` (aliases: ${rec.aliases.join(", ")})` : "";
            return `<div class="cand-row"><code>${escapeHtml(cid)}</code>${name}${aliases}</div>`;
          }).join("")}
        </div>
      `;
    }

    const gaps = [];
    if (!dc.people) gaps.push("DATA GAP: No People connections in current forge dataset.");
    if (!dc.places) gaps.push("DATA GAP: No direct Place connections in current forge dataset.");
    if (!dc.events) {
      gaps.push("DATA GAP: No Event connections in current forge dataset.");
    } else if (state.filters && !state.filters.node.EVENT) {
      gaps.push(`HIDDEN BY VIEW: ${dc.events} Event connection(s) exist in dataset, but Event node filter is OFF.`);
    } else if (state.filters && !state.filters.edge.canonical) {
      gaps.push(`HIDDEN BY VIEW: ${dc.events} Event connection(s) exist in dataset, but Canonical edge filter is OFF.`);
    }
    if (!dc.groups) gaps.push("DATA GAP: No direct Group connections in current forge dataset.");
    if (!summary.by_edge_class || !summary.by_edge_class.canonical) gaps.push("DATA GAP: No canonical relationships committed.");
    if (d.identity_status === "FORGE_CROSSWALK_REVIEW") gaps.push("DATA GAP: No safe forge crosswalk resolved (under crosswalk review).");

    return `
      <div class="why">
        <div class="k">Phase-1 Identity & Classification</div>
        ${kv("Preferred display name", d.preferred_display_name || node.display_name)}
        ${kv("Phase-1 key", d.phase1_key || node.id)}
        ${kv("Classification", d.phase1_classification)}
        ${kv("Identity status", d.identity_status)}
        ${kv("Forge match status", d.forge_match_status)}
        ${kv("Resolved forge ID", d.resolved_forge_person_id || "None — under crosswalk review")}
        ${d.superseded_duplicate_forge_person_ids && d.superseded_duplicate_forge_person_ids.length ? kv("Superseded forge IDs (normalized)", d.superseded_duplicate_forge_person_ids.join(", ")) : ""}
        ${cands.length && d.identity_status === "FORGE_CROSSWALK_REVIEW" ? candHtml : ""}
        ${d.internal_notes ? kv("Internal notes", d.internal_notes) : ""}
        ${d.crosswalk_reason ? kv("Crosswalk notes", d.crosswalk_reason) : ""}
      </div>

      <div class="why">
        <div class="k">Names & Surfaces</div>
        ${kv("Display aliases", d.display_aliases)}
        ${kv("Research surfaces", d.research_surfaces)}
        ${kv("Census surfaces", d.census_surfaces)}
      </div>

      <div class="why">
        <div class="k">Domain Connection Counts (Inspection Only)</div>
        <div class="domain-counts">
          <span class="count-chip">People: <strong>${dc.people}</strong></span>
          <span class="count-chip">Places: <strong>${dc.places}</strong></span>
          <span class="count-chip">Events: <strong>${dc.events}</strong></span>
          <span class="count-chip">Groups: <strong>${dc.groups}</strong></span>
          <span class="count-chip">Scripture: <strong>${dc.scripture}</strong></span>
        </div>
      </div>

      <div class="why">
        <div class="k">Scripture Identity Evidence (${evList.length})</div>
        ${evHtml}
      </div>

      ${gaps.length ? `
        <div class="why gaps-box">
          <div class="k">Data Gaps / Inspection Flags</div>
          ${gaps.map((g) => `<div class="gap-item">⚠️ ${escapeHtml(g)}</div>`).join("")}
        </div>
      ` : ""}
    `;
  }

  function eventBlock(node) {
    const d = node.type_details || {};
    if (d.is_phase1_event) {
      return `
        <div class="why">
          <div class="k">Phase-1 Curated Narrative Event</div>
          ${kv("Summary", d.summary)}
          ${kv("Boundary notes", d.boundary_notes)}
          ${kv("Scripture span", [d.scripture_start, d.scripture_end].filter(Boolean).join(" → "))}
          ${d.participants && d.participants.length ? kv("Participants", d.participants.join(", ")) : ""}
          ${d.places && d.places.length ? kv("Places", d.places.join(", ")) : ""}
          ${d.groups && d.groups.length ? kv("Groups", d.groups.join(", ")) : ""}
        </div>
      `;
    }
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
    const focusNodeId = (state.selection.kind === "node" && state.selection.id) ? state.selection.id : state.seed;
    const isPrimary = (edge.source === focusNodeId || edge.target === focusNodeId);
    return `
      <div class="badge ${edge.relationship_class}">${escapeHtml(edge.relationship_class.toUpperCase())}</div>
      ${edge.canonical_claim ? '<span class="badge canonical">CANONICAL</span>' : '<span class="badge context">NOT A CANONICAL CLAIM</span>'}
      <span class="badge ${isPrimary ? "canonical" : "secondary"}">${isPrimary ? "PRIMARY FOCUS EDGE" : "SECONDARY CONTEXT EDGE"}</span>
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
    if (node && node.type === "PERSON") {
      const d = node.type_details || {};
      const evList = d.primary_scripture_identity_evidence || [];
      if (evList.length) {
        parts.push('<div class="k">Primary Scripture Identity Evidence</div>');
        evList.forEach((ev) => {
          parts.push(`
            <div class="evidence-card" style="margin: 6px 0;">
              <strong>${escapeHtml(ev.scripture_locator || "")}</strong>
              <span class="badge ${ev.verified_in_corpus ? "canonical" : "review"}">${ev.verified_in_corpus ? "Verified" : "Unverified"}</span>
              ${ev.claim ? `<p class="ev-claim">${escapeHtml(ev.claim)}</p>` : ""}
              ${ev.verse_text ? `<blockquote class="ev-verse">${escapeHtml(ev.verse_text)}</blockquote>` : ""}
            </div>
          `);
        });
      }
    }
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

  function typeRank(row) {
    const t = row.type;
    if (t === "PERSON") {
      const c = row.phase1_classification;
      if (c === "MVP_MAJOR") return 0;
      if (c === "MVP_SUPPORTING") return 1;
      if (row.is_deferred) return 4;
      return 2;
    }
    if (t === "GROUP") return 5;
    if (t === "PLACE") return 6;
    if (t === "EVENT") return 7;
    return 8;
  }

  function runSearch(q) {
    const query = (q ?? el.search.value).trim().toLowerCase();
    if (!query) {
      el.results.hidden = true;
      el.results.innerHTML = "";
      return;
    }
    const hits = [];
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wordBoundaryRegex = new RegExp(`\\b${escapedQuery}\\b`, "i");

    for (const row of state.search) {
      const targetNode = state.nodes.get(row.id);
      if (targetNode && !nodePassesFilter(targetNode)) continue;
      if (row.optional && !nodeTypeOn(row.type)) continue;

      const id = (row.id || "").toLowerCase();
      const disp = (row.display_name || "").toLowerCase();
      const baseName = disp.replace(/\s*\(.*?\)\s*/g, "").trim();
      const aliases = (row.aliases || []).map((a) => (a || "").toLowerCase());
      const tokens = (row.tokens || []).map((t) => (t || "").toLowerCase());
      const p1Key = (row.phase1_key || "").toLowerCase();
      const hay = [id, disp, ...aliases, ...tokens, p1Key].join(" ").toLowerCase();

      if (!hay.includes(query) && id !== query) continue;

      let score = 100;
      // 1. Exact preferred display name or base name (e.g. "Lehi", "Lehi (Patriarch)")
      if (disp === query || baseName === query) {
        score = 0;
      }
      // 2. Exact alias
      else if (aliases.includes(query)) {
        score = 1;
      }
      // 3. Exact Phase-1 key or ID
      else if (id === query || p1Key === query) {
        score = 2;
      }
      // 4. Exact forge ID / superseded ID token
      else if (tokens.includes(query)) {
        score = 3;
      }
      // 5. Prefix match on display name or base name
      else if (disp.startsWith(query) || baseName.startsWith(query)) {
        score = 4;
      }
      // 6. Prefix match on alias
      else if (aliases.some((a) => a.startsWith(query))) {
        score = 5;
      }
      // 7. Prefix match on ID or key
      else if (id.startsWith(query) || p1Key.startsWith(query)) {
        score = 6;
      }
      // 8. Prefix match on token
      else if (tokens.some((t) => t.startsWith(query))) {
        score = 7;
      }
      // 9. Word boundary match in display name (e.g. "Son of Lehi")
      else if (wordBoundaryRegex.test(disp)) {
        score = 8;
      }
      // 10. Substring in display name or aliases
      else if (disp.includes(query) || aliases.some((a) => a.includes(query))) {
        score = 9;
      }
      // 11. General token substring match
      else {
        score = 10;
      }

      hits.push({ row, score, tRank: typeRank(row) });
    }
    hits.sort((a, b) => a.score - b.score || a.tRank - b.tRank || (a.row.display_name || "").localeCompare(b.row.display_name || "") || a.row.id.localeCompare(b.row.id));
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
        el.search.value = "";
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
      refreshGraph({ resetPositions: false });
    };
  });
  document.querySelectorAll("[data-people-filter]").forEach((box) => {
    box.onchange = () => {
      const key = box.getAttribute("data-people-filter");
      state.filters.people[key] = box.checked;
      refreshGraph({ resetPositions: false });
    };
  });
  document.querySelectorAll("[data-edge-class]").forEach((box) => {
    box.onchange = () => {
      state.filters.edge[box.getAttribute("data-edge-class")] = box.checked;
      refreshGraph({ resetPositions: false });
    };
  });
  document.querySelectorAll('input[name="secondary-mode"]').forEach((radio) => {
    radio.onchange = () => {
      state.secondaryMode = radio.value;
      render();
    };
  });
  document.getElementById("hop-depth").onchange = (evt) => {
    state.hop = Number(evt.target.value);
    refreshGraph({ resetPositions: true, fit: true });
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

  const btnFilters = document.getElementById("btn-toggle-filters");
  if (btnFilters) {
    btnFilters.onclick = () => {
      const fBar = document.getElementById("filters-bar");
      if (fBar) fBar.classList.toggle("open");
    };
  }

  const btnToggleLegend = document.getElementById("btn-toggle-legend");
  const btnShowLegend = document.getElementById("btn-show-legend");
  const legendBox = document.getElementById("legend");
  if (btnToggleLegend && legendBox) {
    btnToggleLegend.onclick = () => {
      legendBox.hidden = true;
      if (btnShowLegend) btnShowLegend.hidden = false;
    };
  }
  if (btnShowLegend && legendBox) {
    btnShowLegend.onclick = () => {
      legendBox.hidden = false;
      btnShowLegend.hidden = true;
    };
  }

  const btnToggleInspector = document.getElementById("btn-toggle-inspector");
  const btnShowInspector = document.getElementById("btn-show-inspector");
  if (btnToggleInspector) {
    btnToggleInspector.onclick = () => hideInspector();
  }
  if (btnShowInspector) {
    btnShowInspector.onclick = () => showInspector();
  }

  function startAutoReloadWatcher() {
    let currentSha = null;
    setInterval(async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.ok || !data.graph_sha256) return;
        if (currentSha === null) {
          currentSha = data.graph_sha256;
        } else if (currentSha !== data.graph_sha256) {
          currentSha = data.graph_sha256;
          // Dynamically re-fetch bundle and update state
          try {
            const bRes = await fetch("./data/graph-bundle.json", { cache: "no-store" });
            if (bRes.ok) {
              const bundle = await bRes.json();
              state.bundle = bundle;
              state.nodes = new Map(bundle.nodes.map((n) => [n.id, n]));
              state.edges = new Map(bundle.edges.map((e) => [e.id, e]));
              state.neighborhood = new Map(Object.entries(bundle.neighborhood_index || {}));
              state.search = bundle.search_index || [];
              render();
              if (el.hud) {
                el.hud.textContent = `[LIVE UPDATE] Refreshed to SHA: ${currentSha.slice(0, 8)}`;
              }
            }
          } catch {
            window.location.reload();
          }
        }
      } catch {
        // Dev server not reachable or offline
      }
    }, 2500);
  }

  startAutoReloadWatcher();
  loadBundle();
})();
