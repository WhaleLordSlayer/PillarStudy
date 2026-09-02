/* BGV2-009R Bible Graph QA - Node-RED style SVG relationship explorer with auto-spacing & drag-and-drop */
(() => {
  const EXPAND_CAP = 24;
  const WARN_NODES = 120;
  const REFUSE_NODES = 200;

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
    hiddenRemainder: new Map(),
    positions: new Map(),
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
    { id: "candbgrp_75d3419f7585b78364ac", name: "Israelites", type: "GROUP", cls: "chip-group" },
    { id: "candbgrp_7c9da7b2a64c585c544e", name: "Pharisees", type: "GROUP", cls: "chip-group" },
    { id: "candbgrp_a33118933068e2ee2a10", name: "Sadducees", type: "GROUP", cls: "chip-group" },
    { id: "candbgrp_b2569f2e3a17e08929eb", name: "Romans", type: "GROUP", cls: "chip-group" },
    { id: "candbevt_00083426993e8e0f833e", name: "Saul in David's power", type: "EVENT", cls: "chip-event" },
    { id: "BGV2-009-D-002", name: "Paul journey thin (Finding)", type: "FINDING", cls: "chip-finding" },
    { id: "BGV2-009-D-001", name: "Elijah journey thin (Finding)", type: "FINDING", cls: "chip-finding" },
  ];

  const BIBLE_BOOK_ORDER = {
    "genesis": 1, "exodus": 2, "leviticus": 3, "numbers": 4, "deuteronomy": 5,
    "joshua": 6, "judges": 7, "ruth": 8, "1-samuel": 9, "2-samuel": 10,
    "1-kings": 11, "2-kings": 12, "1-chronicles": 13, "2-chronicles": 14,
    "ezra": 15, "nehemiah": 16, "esther": 17, "job": 18, "psalms": 19,
    "proverbs": 20, "ecclesiastes": 21, "song-of-solomon": 22, "isaiah": 23,
    "jeremiah": 24, "lamentations": 25, "ezekiel": 26, "daniel": 27,
    "hosea": 28, "joel": 29, "amos": 30, "obadiah": 31, "jonah": 32,
    "micah": 33, "nahum": 34, "habakkuk": 35, "zephaniah": 36, "haggai": 37,
    "zechariah": 38, "malachi": 39,
    "matthew": 40, "mark": 41, "luke": 42, "john": 43, "acts": 44,
    "romans": 45, "1-corinthians": 46, "2-corinthians": 47, "galatians": 48,
    "ephesians": 49, "philippians": 50, "colossians": 51, "1-thessalonians": 52,
    "2-thessalonians": 53, "1-timothy": 54, "2-timothy": 55, "titus": 56,
    "philemon": 57, "hebrews": 58, "james": 59, "1-peter": 60, "2-peter": 61,
    "1-john": 62, "2-john": 63, "3-john": 64, "jude": 65, "revelation": 66
  };

  function parseBibleRef(ref) {
    if (!ref || typeof ref !== "string") return [999, 999, 999];
    const clean = ref.replace(/^(ot|nt):/, "").toLowerCase();
    const parts = clean.split(":");
    const book = parts[0];
    const ch = parseInt(parts[1], 10) || 0;
    const v = parseInt(parts[2], 10) || 0;
    const rank = BIBLE_BOOK_ORDER[book] || 900;
    return [rank, ch, v];
  }

  function compareEventsByScripture(aId, bId) {
    const aNode = state.nodes.get(aId) || {};
    const bNode = state.nodes.get(bId) || {};
    const aLoc = aNode.first_locator || (aNode.scripture_ranges && aNode.scripture_ranges[0]) || "";
    const bLoc = bNode.first_locator || (bNode.scripture_ranges && bNode.scripture_ranges[0]) || "";
    const [aB, aC, aV] = parseBibleRef(aLoc);
    const [bB, bC, bV] = parseBibleRef(bLoc);
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

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
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

  function neighborsOf(id) {
    const out = [];
    const seen = new Set();
    state.edges.forEach((e) => {
      if (e.source === id || e.target === id) {
        const otherId = e.source === id ? e.target : e.source;
        if (!seen.has(otherId) && state.nodes.has(otherId)) {
          const otherNode = state.nodes.get(otherId);
          if (nodePassesFilter(otherNode)) {
            seen.add(otherId);
            out.push({ node: otherNode, edge: e });
          }
        }
      }
    });
    return out;
  }

  function nodePassesFilter(node) {
    if (!node) return false;
    if (!state.filters.node[node.type]) return false;
    const corpus = node.corpus_membership || "BOTH";
    if (!state.filters.corpus[corpus]) return false;
    const status = node.review_status || "ACCEPTED";
    if (!state.filters.status[status]) return false;
    return true;
  }

  function seedGraph(nodeId) {
    if (!state.nodes.has(nodeId)) {
      const hit = state.search.find(s => s.id === nodeId || s.display_name.toLowerCase() === nodeId.toLowerCase());
      if (hit && state.nodes.has(hit.id)) nodeId = hit.id;
      else return;
    }

    state.seed = nodeId;
    state.visible = new Set([nodeId]);
    state.expanded = new Set([nodeId]);
    state.pinned = new Set();
    state.hiddenRemainder = new Map();
    state.hudNotice = "";

    expandNode(nodeId, state.hop);

    state.selection = { kind: "node", id: nodeId };
    layoutAll(true);
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
          state.hudNotice = `Refusing to add more nodes (cap ${REFUSE_NODES}). Visual QA bounds respected.`;
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
  }

  /* Auto-spacing tiered layout engine matching Book of Mormon QA viewer */
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

    // Person / Entity tiered layout
    const yGap = 260;
    const spacing = 190;

    for (let h = 1; h <= maxHop; h += 1) {
      const nodesAtHop = byHop.get(h) || [];
      if (!nodesAtHop.length) continue;

      const peopleNodes = nodesAtHop.filter((id) => (state.nodes.get(id) || {}).type === "PERSON");
      const eventNodes = nodesAtHop.filter((id) => (state.nodes.get(id) || {}).type === "EVENT");
      const placeNodes = nodesAtHop.filter((id) => (state.nodes.get(id) || {}).type === "PLACE");
      const groupNodes = nodesAtHop.filter((id) => (state.nodes.get(id) || {}).type === "GROUP");

      const tiers = [];
      if (peopleNodes.length) tiers.push({ type: "PERSON", ids: peopleNodes });
      if (eventNodes.length) tiers.push({ type: "EVENT", ids: eventNodes });
      if (placeNodes.length) tiers.push({ type: "PLACE", ids: placeNodes });
      if (groupNodes.length) tiers.push({ type: "GROUP", ids: groupNodes });

      let currentTierY = seedPos.y + (h - 1) * yGap + (tiers.length > 1 ? 210 : yGap);

      tiers.forEach((tier) => {
        const ids = tier.ids;
        if (tier.type === "EVENT") {
          ids.sort(compareEventsByScripture);
        } else {
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
      if (!state.visible.has(edge.source) || !state.visible.has(edge.target)) return;
      const a = state.nodes.get(edge.source);
      const b = state.nodes.get(edge.target);
      if (!a || !b || !nodePassesFilter(a) || !nodePassesFilter(b)) return;
      out.push(edge);
    });
    return out;
  }

  function shapeFor(node, x, y, selected) {
    const seed = node.id === state.seed;
    const isRev = node.review_status === "REVIEW_REQUIRED";
    const cls = [
      "node-shape",
      `node-${node.type.toLowerCase()}`,
      seed ? "node-seed" : "",
      selected ? "node-selected" : "",
      isRev ? "node-review" : "",
    ].filter(Boolean).join(" ");

    if (node.type === "PERSON") return `<circle class="${cls}" cx="${x}" cy="${y}" r="18" data-id="${node.id}"></circle>`;
    if (node.type === "GROUP") return `<polygon class="${cls}" data-id="${node.id}" points="${hex(x, y, 20)}"></polygon>`;
    if (node.type === "PLACE") return `<rect class="${cls}" data-id="${node.id}" x="${x - 16}" y="${y - 14}" width="32" height="28" rx="6"></rect>`;
    if (node.type === "EVENT") return `<polygon class="${cls}" data-id="${node.id}" points="${x},${y - 20} ${x + 16},${y} ${x},${y + 20} ${x - 16},${y}"></polygon>`;
    return `<rect class="${cls}" data-id="${node.id}" x="${x - 16}" y="${y - 12}" width="32" height="24" rx="4"></rect>`;
  }

  function hex(x, y, r) {
    const pts = [];
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
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

    // Render Edges with SVG lines & markers
    el.edges.innerHTML = edges.map((edge) => {
      const isPrimary = (edge.source === focusNodeId || edge.target === focusNodeId);
      const isSecondary = !isPrimary;
      if (isSecondary && state.secondaryMode === "hide") return "";

      const a = state.positions.get(edge.source);
      const b = state.positions.get(edge.target);
      if (!a || !b) return "";
      const selected = edge.id === selectedEdge;
      const isRev = edge.review_status === "REVIEW_REQUIRED";
      const isPart = edge.relationship_type && edge.relationship_type.includes("PARTICIPATED");

      const marker = isRev
        ? "url(#arrow-review)"
        : (isPrimary ? "url(#arrow-canonical)" : "url(#arrow-canonical-dim)");

      const showLabel = (isPrimary || selected || state.secondaryMode === "show");
      const label = showLabel ? edge.ui_label : "";
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;

      const cls = [
        "edge-line",
        isPart ? "edge-participation" : "edge-canonical",
        isRev ? "edge-review" : "",
        isPrimary ? "edge-primary" : "edge-secondary",
        selected ? "edge-selected" : "",
      ].filter(Boolean).join(" ");

      return `<g class="edge-g" data-id="${edge.id}">
        <line class="${cls}" data-id="${edge.id}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" marker-end="${marker}"></line>
        ${label ? `<text class="edge-label ${isPrimary ? "edge-label-primary" : "edge-label-secondary"}" x="${mx}" y="${my - 5}" text-anchor="middle">${escapeHtml(label)}</text>` : ""}
      </g>`;
    }).join("");

    // Render Nodes with shape, badge, and label
    el.nodes.innerHTML = [...state.visible].map((id) => {
      const node = state.nodes.get(id);
      const pos = state.positions.get(id) || { x: 0, y: 0 };
      if (!nodePassesFilter(node)) return "";
      const rem = (state.hiddenRemainder.get(id) || []).length;
      const badge = rem ? `+${rem}` : (node.audit_findings && node.audit_findings.length > 0 ? "⚠️" : node.type);
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
    el.hud.textContent = state.hudNotice || `${nCount} drawn nodes (${hopLabel}) · ${drawnEdges.length} connections (focus: ${truncate(focusName, 20)}) · BGV2-009R dataset`;

    bindCanvasEvents();
    renderInspectors();
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

  /* Interactive Canvas Drag & Drop and Pan Event Handlers */
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

    el.svg.onmousedown = (evt) => handleStart(evt.clientX, evt.clientY, evt.target);
    window.onmousemove = (evt) => handleMove(evt.clientX, evt.clientY);
    window.onmouseup = (evt) => handleEnd(evt.clientX, evt.clientY);

    el.svg.ondblclick = (evt) => {
      const target = evt.target.closest("[data-id]");
      if (target && state.nodes.has(target.getAttribute("data-id"))) {
        const id = target.getAttribute("data-id");
        seedGraph(id);
      }
    };
  }

  function selectNode(id) {
    state.selection = { kind: "node", id };
    document.querySelectorAll(".inspector-tabs .tab").forEach(t => {
      t.classList.toggle("active", t.getAttribute("data-tab") === "node");
    });
    ["insp-node", "insp-edge", "insp-evidence", "insp-findings"].forEach(d => {
      document.getElementById(d).hidden = d !== "insp-node";
    });
    renderInspectors();
    render();
  }

  function selectEdge(id) {
    state.selection = { kind: "edge", id };
    document.querySelectorAll(".inspector-tabs .tab").forEach(t => {
      t.classList.toggle("active", t.getAttribute("data-tab") === "edge");
    });
    ["insp-node", "insp-edge", "insp-evidence", "insp-findings"].forEach(d => {
      document.getElementById(d).hidden = d !== "insp-edge";
    });
    renderInspectors();
    render();
  }

  function renderInspectors() {
    if (state.selection.kind === "node" && state.selection.id) {
      renderNodeInspector(state.selection.id);
    } else if (state.selection.kind === "edge" && state.selection.id) {
      renderEdgeInspector(state.selection.id);
    }
  }

  function renderNodeInspector(id) {
    const node = state.nodes.get(id);
    if (!node) return;

    const isRev = node.review_status === "REVIEW_REQUIRED";
    const findings = node.audit_findings || [];

    const famRels = [];
    const eventParts = [];
    state.edges.forEach(e => {
      if (e.source === id || e.target === id) {
        const otherId = e.source === id ? e.target : e.source;
        const otherNode = state.nodes.get(otherId);
        if (e.relationship_type && e.relationship_type.includes("OF")) {
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
      layoutAll(false);
      render();
    }
    selectNode(id);
  };

  window.reseed = (id) => seedGraph(id);

  function bindEvents() {
    // Autocomplete Search
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

    // Hop depth dropdown
    document.getElementById("hop-depth").addEventListener("change", (e) => {
      state.hop = parseInt(e.target.value, 10);
      if (state.seed) {
        state.visible = new Set([state.seed]);
        expandNode(state.seed, state.hop);
        layoutAll(true);
        render();
        fitGraph();
      }
    });

    // Toolbar buttons
    document.getElementById("btn-zoom-in").addEventListener("click", () => {
      state.scale *= 1.25;
      applyView();
    });
    document.getElementById("btn-zoom-out").addEventListener("click", () => {
      state.scale *= 0.8;
      applyView();
    });
    document.getElementById("btn-fit").addEventListener("click", fitGraph);
    document.getElementById("btn-recenter").addEventListener("click", fitGraph);
    document.getElementById("btn-zoom-sel").addEventListener("click", zoomToSelection);
    document.getElementById("btn-reset").addEventListener("click", () => {
      if (state.seed) seedGraph(state.seed);
    });

    // Secondary edges radio mode
    document.querySelectorAll("input[name='secondary-mode']").forEach(radio => {
      radio.addEventListener("change", (e) => {
        state.secondaryMode = e.target.value;
        render();
      });
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

    // Inspector tabs
    document.querySelectorAll(".inspector-tabs .tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".inspector-tabs .tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const tabName = tab.getAttribute("data-tab");
        ["insp-node", "insp-edge", "insp-evidence", "insp-findings"].forEach(id => {
          document.getElementById(id).hidden = id !== `insp-${tabName}`;
        });
      });
    });

    // Filters checkboxes
    document.querySelectorAll("#filters-bar input[type='checkbox']").forEach(chk => {
      chk.addEventListener("change", () => {
        if (chk.dataset.nodeType) state.filters.node[chk.dataset.nodeType] = chk.checked;
        if (chk.dataset.corpusFilter) state.filters.corpus[chk.dataset.corpusFilter] = chk.checked;
        if (chk.dataset.statusFilter) state.filters.status[chk.dataset.statusFilter] = chk.checked;
        if (chk.dataset.edgeClass) state.filters.edge[chk.dataset.edgeClass] = chk.checked;
        if (state.seed) {
          state.visible = new Set([state.seed]);
          expandNode(state.seed, state.hop);
          layoutAll(true);
          render();
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

      const neighbors = neighborsOf(curr).map(item => item.node.id);
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

      pathFound.forEach(id => state.visible.add(id));
      layoutAll(false);
      render();
    } else {
      el.pathResult.textContent = "No path found between selected entities within active canonical graph bounds.";
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    loadBundle();
  });
})();
