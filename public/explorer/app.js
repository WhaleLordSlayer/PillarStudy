// Full Book of Mormon Graph Explorer - Client-Facing Card & Traversal Engine
(() => {
  const state = {
    bundle: null,
    nodes: new Map(),
    edges: new Map(),
    adj: new Map(), // nodeId -> [{ edge, targetNode, role }]
    searchIndex: [],
    currentEntityId: "nephi",
    currentTab: "overview",
    filterCategory: "ALL",
    history: ["nephi"]
  };

  const STARTER_KEYS = [
    "nephi",
    "lehi",
    "alma-the-younger",
    "abinadi",
    "captain-moroni",
    "mormon",
    "king-benjamin",
    "ammon-son-of-mosiah",
    "samuel-the-lamanite",
    "zarahemla-city",
    "lamanites",
    "nephites",
    "title-of-liberty",
    "brass-plates"
  ];

  const CHAPTER_DATA = {
    "1ne1": {
      title: "1 Nephi 1",
      summary: "Nephi introduces his sacred record, and his father Lehi experiences a divine pillar of fire and a heavenly vision of God warning of Jerusalem's destruction.",
      moments: [
        { num: 1, title: "Nephi's Introduction and Purpose", verses: "1–3", desc: "Nephi introduces his heritage, his learning in Egyptian and Hebrew, and his solemn purpose in making a record of God's goodness.", entity: "nephi" },
        { num: 2, title: "Lehi's Prophetic Call and Pillar of Fire", verses: "4–6", desc: "Lehi prays fervently for his people in Jerusalem. A pillar of fire rests upon a rock before him, causing him to quake.", entity: "lehi" },
        { num: 3, title: "Vision of the Heavenly Host & Book of Prophecy", verses: "7–15", desc: "Carried away in the Spirit, Lehi sees God on His throne surrounded by angels. He receives a book foretelling Jerusalem's fall.", entity: "lehi" },
        { num: 4, title: "Lehi Preaches and is Rejected by Jerusalem", verses: "16–20", desc: "Lehi testifies of Christ and the coming destruction. The Jews mock him and seek his life, fulfilling the pattern of prophets.", entity: "lehi" }
      ]
    },
    "1ne3": {
      title: "1 Nephi 3–4 (Brass Plates)",
      summary: "Nephi and his brothers return to Jerusalem to obtain the records of the Jews and their genealogy contained on the plates of brass from Laban.",
      moments: [
        { num: 1, title: "The Divine Command to Return", verses: "3:1–7", desc: "Nephi responds with faith: 'I will go and do the things which the Lord hath commanded.'", entity: "nephi" },
        { num: 2, title: "First Attempts and Laban's Threat", verses: "3:8–27", desc: "Laman draws lots, is threatened by Laban, and the brothers offer their gold and silver in exchange for the plates.", entity: "laman" },
        { num: 3, title: "Nephi Led by the Spirit into Jerusalem", verses: "4:1–18", desc: "Nephi is led by the Spirit, not knowing beforehand what he should do, and finds Laban fallen in the street.", entity: "nephi" },
        { num: 4, title: "Securing the Plates and Zoram's Oath", verses: "4:19–38", desc: "Nephi puts on Laban's armor, commands Zoram to bring the plates, and invites Zoram to join their journey into the wilderness.", entity: "zoram" }
      ]
    },
    "1ne11": {
      title: "1 Nephi 11–14 (Vision of the Tree)",
      summary: "Nephi desires to know the interpretation of his father's dream and receives an expanded vision of the condescension of God, the Savior's ministry, and the destinies of nations.",
      moments: [
        { num: 1, title: "The Tree of Life & Mary of Nazareth", verses: "11:1–23", desc: "Nephi sees the virgin bearing the Son of God, learning that the tree represents the love of God.", entity: "nephi" },
        { num: 2, title: "The Ministry & Crucifixion of Christ", verses: "11:24–36", desc: "Nephi beholds the Twelve Apostles, the Savior's baptism, healing miracles, and His suffering on the cross.", entity: "nephi" },
        { num: 3, title: "Destiny of Nephi's Seed & the Promised Land", verses: "12:1–23", desc: "Nephi sees future generations, battles between Nephites and Lamanites, and the destruction of his posterity.", entity: "nephites" },
        { num: 4, title: "The Coming Forth of the Book of Mormon", verses: "13:1–42", desc: "Plain and precious truths are restored through the stick of Joseph to convince Jew and Gentile that Jesus is the Christ.", entity: "nephi" }
      ]
    },
    "mosiah2": {
      title: "Mosiah 2–5 (King Benjamin)",
      summary: "King Benjamin gathers the entire nation to the temple in Zarahemla, preaches from his tower on service and the Atonement of Jesus Christ, and puts his people under covenant.",
      moments: [
        { num: 1, title: "King Benjamin Addresses the Multitudes", verses: "2:1–19", desc: "The aging king speaks from a tower: 'When ye are in the service of your fellow beings ye are only in the service of your God.'", entity: "king-benjamin" },
        { num: 2, title: "The Angel's Declaration of the Messiah", verses: "3:1–27", desc: "Benjamin reveals the name of Jesus Christ, His coming among mortals, His bleeding from every pore, and the power of His blood.", entity: "king-benjamin" },
        { num: 3, title: "The People Fall to the Earth in Awe", verses: "4:1–10", desc: "The multitude cries for mercy and receives a remission of sins and peace of conscience.", entity: "king-benjamin" },
        { num: 4, title: "The Covenant to Take Upon Them Christ's Name", verses: "5:1–15", desc: "Having no more disposition to do evil, the people are spiritually begotten as sons and daughters of Christ.", entity: "king-benjamin" }
      ]
    },
    "mosiah17": {
      title: "Mosiah 17 (Abinadi & Alma)",
      summary: "Abinadi seals his divine message with his life by fire before King Noah, while a young priest named Alma believes his words and flees.",
      moments: [
        { num: 1, title: "Alma Pleads for Abinadi's Life", verses: "17:1–4", desc: "Alma the Elder repents, begs the king to spare the prophet, and is cast out and pursued by the royal guard.", entity: "alma-the-elder" },
        { num: 2, title: "Abinadi Refuses to Recant His Message", verses: "17:5–10", desc: "Noah gives Abinadi a chance to recall his prophecies; Abinadi stands firm: 'I will suffer even until death.'", entity: "abinadi" },
        { num: 3, title: "Abinadi is Martyred by Fire", verses: "17:11–20", desc: "Scourged with bundles of faggots, Abinadi prophesies Noah's death by fire and yields his spirit unto God.", entity: "abinadi" }
      ]
    },
    "alma46": {
      title: "Alma 46 (Title of Liberty)",
      summary: "Amalickiah conspires to be king, and Captain Moroni tears his coat to raise the Title of Liberty in defense of God, religion, freedom, peace, and family.",
      moments: [
        { num: 1, title: "Amalickiah's Flattery and Conspiracy", verses: "46:1–10", desc: "Lower judges seek power through Amalickiah, threatening the free government of the Nephites.", entity: "captain-moroni" },
        { num: 2, title: "Moroni Raises the Title of Liberty", verses: "46:11–22", desc: "Moroni writes upon his torn coat: 'In memory of our God, our religion, and freedom, and our peace, our wives, and our children.'", entity: "captain-moroni" },
        { num: 3, title: "The People Covenant with God", verses: "46:23–41", desc: "The Nephites rend their garments in covenant to maintain their liberty, and Amalickiah flees to the Lamanites.", entity: "captain-moroni" }
      ]
    },
    "3ne11": {
      title: "3 Nephi 11 (Christ Appears)",
      summary: "The resurrected Lord Jesus Christ descends out of heaven at the temple in Bountiful, invites the multitude to feel the prints in His hands and side, and ordains twelve disciples.",
      moments: [
        { num: 1, title: "The Still Small Voice from Heaven", verses: "11:1–7", desc: "The gathering at the temple hears a small, piercing voice: 'Behold my Beloved Son, in whom I am well pleased.'", entity: "nephi" },
        { num: 2, title: "The Savior Descends in White", verses: "11:8–17", desc: "Christ shows His hands and feet, saying: 'I have drunk out of that bitter cup which the Father hath given me.'", entity: "nephi" },
        { num: 3, title: "The Multitude Feels the Wounds One by One", verses: "11:14–17", desc: "Two thousand five hundred souls go forth one by one and thrust their hands into His side.", entity: "nephi" },
        { num: 4, title: "Christ Calls the Twelve and Teaches Baptism", verses: "11:18–41", desc: "Nephi and the disciples are given authority to baptize, and Christ teaches His true doctrine with clarity.", entity: "nephi" }
      ]
    }
  };

  async function init() {
    try {
      const res = await fetch("./data/graph-bundle.json");
      if (!res.ok) throw new Error("Failed to load graph bundle");
      const bundle = await res.json();
      state.bundle = bundle;

      // Index nodes
      (bundle.nodes || []).forEach(n => {
        state.nodes.set(n.id, n);
        state.adj.set(n.id, []);
      });

      // Index edges & build bidirectional adjacency
      (bundle.edges || []).forEach(e => {
        state.edges.set(e.id, e);
        if (state.nodes.has(e.source) && state.nodes.has(e.target)) {
          const sNode = state.nodes.get(e.source);
          const tNode = state.nodes.get(e.target);
          state.adj.get(e.source).push({ edge: e, targetNode: tNode, role: "target" });
          state.adj.get(e.target).push({ edge: e, targetNode: sNode, role: "source" });
        }
      });

      state.searchIndex = bundle.search_index || [];

      // Update header counts
      document.getElementById("meta-entities-count").textContent = `${state.nodes.size.toLocaleString()} Entities`;
      document.getElementById("meta-edges-count").textContent = `${state.edges.size.toLocaleString()} Verified Connections`;

      // Populate path finder selects
      populatePathSelects();

      // Render Starters
      renderStarterList();

      // Check URL param or default
      const params = new URLSearchParams(window.location.search);
      const urlEntity = params.get("entity");
      if (urlEntity && state.nodes.has(urlEntity)) {
        selectEntity(urlEntity, false);
      } else {
        selectEntity("nephi", false);
      }

      // Bind UI handlers
      bindEvents();

      // Render Chapter Showcase
      renderChapter("1ne1");

    } catch (err) {
      console.error("Explorer init error:", err);
    }
  }

  function getEntityKindBadgeClass(type) {
    switch (type) {
      case "PERSON": return "badge-person";
      case "PLACE": return "badge-place";
      case "EVENT": return "badge-event";
      case "GROUP": return "badge-group";
      default: return "badge-person";
    }
  }

  function renderStarterList() {
    const listEl = document.getElementById("starter-list");
    listEl.innerHTML = "";

    // Show starters matching current category
    const validNodes = [];
    if (state.filterCategory === "ALL") {
      STARTER_KEYS.forEach(k => {
        if (state.nodes.has(k)) validNodes.push(state.nodes.get(k));
      });
    } else {
      for (const node of state.nodes.values()) {
        if (node.type === state.filterCategory && (node.phase1_classification === "MVP_MAJOR" || node.mention_count > 10)) {
          validNodes.push(node);
          if (validNodes.length >= 16) break;
        }
      }
    }

    validNodes.forEach(node => {
      const item = document.createElement("div");
      item.className = `entity-nav-item ${node.id === state.currentEntityId ? 'selected' : ''}`;
      item.innerHTML = `
        <div>
          <div>${node.display_name || node.label || node.id}</div>
          <small style="color: #8c9794; font-size: 0.68rem;">${node.first_locator || ''}</small>
        </div>
        <span class="type-badge ${getEntityKindBadgeClass(node.type)}">${node.type}</span>
      `;
      item.onclick = () => selectEntity(node.id);
      listEl.appendChild(item);
    });
  }

  function selectEntity(id, pushHistory = true) {
    if (!state.nodes.has(id)) {
      // Try alias match
      const hit = state.searchIndex.find(s => s.id === id || s.aliases.includes(id));
      if (hit && state.nodes.has(hit.id)) id = hit.id;
      else return;
    }

    state.currentEntityId = id;
    if (pushHistory && state.history[state.history.length - 1] !== id) {
      state.history.push(id);
      if (state.history.length > 8) state.history.shift();
    }

    renderBreadcrumbs();
    renderProfile();
    renderStarterList();
  }

  function renderBreadcrumbs() {
    const trailEl = document.getElementById("breadcrumbs");
    trailEl.innerHTML = '<span onclick="window.historyBack()">‹ Back</span>';
    state.history.forEach((histId, idx) => {
      const node = state.nodes.get(histId);
      if (!node) return;
      const isCurrent = idx === state.history.length - 1;
      const span = document.createElement("span");
      span.className = isCurrent ? "current" : "";
      span.textContent = node.display_name || node.id;
      if (!isCurrent) span.onclick = () => selectEntity(histId);
      trailEl.appendChild(span);
      if (!isCurrent) {
        const sep = document.createElement("b");
        sep.textContent = "→";
        trailEl.appendChild(sep);
      }
    });
  }

  window.historyBack = () => {
    if (state.history.length > 1) {
      state.history.pop();
      const prev = state.history[state.history.length - 1];
      selectEntity(prev, false);
    }
  };

  function renderProfile() {
    const node = state.nodes.get(state.currentEntityId);
    if (!node) return;

    // Type Badge & Title
    const badgeEl = document.getElementById("profile-type-badge");
    badgeEl.className = `type-badge ${getEntityKindBadgeClass(node.type)}`;
    badgeEl.textContent = node.type;

    document.getElementById("profile-name").textContent = node.display_name || node.label || node.id;
    
    const locatorsEl = document.getElementById("profile-locators");
    if (node.first_locator && node.last_locator) {
      locatorsEl.textContent = node.first_locator === node.last_locator ? node.first_locator : `${node.first_locator} – ${node.last_locator}`;
      locatorsEl.style.display = "inline-block";
    } else {
      locatorsEl.style.display = "none";
    }

    // Neighbors collection
    const connections = state.adj.get(node.id) || [];
    const people = [];
    const events = [];
    const places = [];
    const groups = [];
    const verses = new Set();

    connections.forEach(conn => {
      const t = conn.targetNode;
      if (t.type === "PERSON") people.push(conn);
      else if (t.type === "EVENT") events.push(conn);
      else if (t.type === "PLACE") places.push(conn);
      else if (t.type === "GROUP") groups.push(conn);

      if (conn.edge.scripture_locators) {
        conn.edge.scripture_locators.forEach(l => verses.add(l));
      }
    });

    // Update stats counters
    document.getElementById("stat-people").textContent = people.length;
    document.getElementById("stat-events").textContent = events.length;
    document.getElementById("stat-places").textContent = places.length;
    document.getElementById("stat-groups").textContent = groups.length;
    document.getElementById("stat-verses").textContent = verses.size || (node.mention_count || 1);

    // Render active tab content
    renderTabContent(node, { people, events, places, groups, verses: Array.from(verses) });
  }

  function renderTabContent(node, lists) {
    const container = document.getElementById("tab-content");
    container.innerHTML = "";

    if (state.currentTab === "overview") {
      container.innerHTML = `
        <div class="card-section-heading">
          <h4>Narrative Overview & Key Connections</h4>
          <span>${lists.people.length} People · ${lists.events.length} Events</span>
        </div>
        <div style="background: #fbfdfc; border: 1px solid #e2e8e5; border-radius: 20px; padding: 22px; margin-bottom: 24px;">
          <p style="font: 500 1.15rem/1.6 Literata, Georgia, serif; color: #172421; margin: 0 0 12px;">
            ${node.display_name} appears in the sacred record across <b>${lists.verses.length || (node.mention_count || 1)} passages</b>, directly participating in <b>${lists.events.length} narrative events</b>.
          </p>
          <div style="font-size: 0.8rem; color: #6e7a76;">
            Classification: <b>${node.phase1_classification || 'Documented Entity'}</b> · Identity Status: <b>${node.identity_status || 'VERIFIED'}</b>
          </div>
        </div>
        
        <div class="card-section-heading">
          <h4>Immediate Key Connections</h4>
          <span style="cursor: pointer; color: var(--brand2); font-weight: 800;" onclick="window.setTab('people')">View all people →</span>
        </div>
        <div class="connected-grid" style="margin-bottom: 24px;">
          ${lists.people.slice(0, 4).map(conn => createConnectionCardHtml(conn)).join('') || '<div style="color: var(--muted); font-size: 0.84rem;">No direct interpersonal connections recorded.</div>'}
        </div>

        <div class="card-section-heading">
          <h4>Prominent Narrative Events</h4>
          <span style="cursor: pointer; color: var(--brand2); font-weight: 800;" onclick="window.setTab('events')">View full timeline →</span>
        </div>
        <div class="timeline-stream">
          ${lists.events.slice(0, 3).map(conn => createTimelineCardHtml(conn)).join('') || '<div style="color: var(--muted); font-size: 0.84rem;">No direct event moments recorded.</div>'}
        </div>
      `;
    } else if (state.currentTab === "people") {
      container.innerHTML = `
        <div class="card-section-heading">
          <h4>All Connected People (${lists.people.length})</h4>
          <span>Click any character to open their record</span>
        </div>
        <div class="connected-grid">
          ${lists.people.map(conn => createConnectionCardHtml(conn)).join('') || '<div style="color: var(--muted); font-size: 0.84rem;">No connected people.</div>'}
        </div>
      `;
    } else if (state.currentTab === "events") {
      container.innerHTML = `
        <div class="card-section-heading">
          <h4>Chronological Narrative Events (${lists.events.length})</h4>
          <span>Click any event to explore its participants</span>
        </div>
        <div class="timeline-stream">
          ${lists.events.map(conn => createTimelineCardHtml(conn)).join('') || '<div style="color: var(--muted); font-size: 0.84rem;">No chronological events recorded.</div>'}
        </div>
      `;
    } else if (state.currentTab === "places") {
      container.innerHTML = `
        <div class="card-section-heading">
          <h4>Associated Places & Geography (${lists.places.length})</h4>
          <span>Lands, cities, waters, and sacred locations</span>
        </div>
        <div class="connected-grid">
          ${lists.places.map(conn => createConnectionCardHtml(conn)).join('') || '<div style="color: var(--muted); font-size: 0.84rem;">No associated geographic locations.</div>'}
        </div>
      `;
    } else if (state.currentTab === "groups") {
      container.innerHTML = `
        <div class="card-section-heading">
          <h4>Connected Groups & Peoples (${lists.groups.length})</h4>
          <span>Tribes, religious bodies, and factions</span>
        </div>
        <div class="connected-grid">
          ${lists.groups.map(conn => createConnectionCardHtml(conn)).join('') || '<div style="color: var(--muted); font-size: 0.84rem;">No group affiliations recorded.</div>'}
        </div>
      `;
    } else if (state.currentTab === "verses") {
      container.innerHTML = `
        <div class="card-section-heading">
          <h4>Scripture References (${lists.verses.length})</h4>
          <span>Passages grounding these connections</span>
        </div>
        <div class="scripture-list">
          ${lists.verses.map(v => `<div class="scripture-badge">${v}</div>`).join('') || '<div class="scripture-badge">' + (node.first_locator || '1 Nephi') + '</div>'}
        </div>
      `;
    }
  }

  function createConnectionCardHtml(conn) {
    const t = conn.targetNode;
    const edge = conn.edge;
    const relLabel = edge.ui_label || edge.relationship_type || (edge.canonical_claim ? 'canonical claim' : 'scripture context');
    return `
      <div class="connection-card" onclick="window.selectEntityById('${t.id}')">
        <div>
          <div class="connection-card-top">
            <strong>${t.display_name || t.id}</strong>
            <span class="type-badge ${getEntityKindBadgeClass(t.type)}">${t.type}</span>
          </div>
          <div class="connection-reason">${relLabel}</div>
        </div>
        <div class="connection-locators">
          ${edge.scripture_locators && edge.scripture_locators.length ? edge.scripture_locators.slice(0, 2).join(', ') : (t.first_locator || 'Passage reference')}
        </div>
      </div>
    `;
  }

  function createTimelineCardHtml(conn) {
    const t = conn.targetNode;
    const edge = conn.edge;
    const locators = edge.scripture_locators && edge.scripture_locators.length ? edge.scripture_locators.join(', ') : (t.first_locator || 'Scripture locator');
    return `
      <div class="timeline-moment-card" onclick="window.selectEntityById('${t.id}')">
        <small>${locators}</small>
        <strong>${t.display_name || t.id}</strong>
        <p>${edge.meaning || 'Direct participation in narrative moment.'}</p>
      </div>
    `;
  }

  window.selectEntityById = (id) => selectEntity(id);
  window.setTab = (tab) => {
    state.currentTab = tab;
    document.querySelectorAll("#profile-tabs button").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    document.querySelectorAll(".stat-box").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    renderProfile();
  };

  function bindEvents() {
    // Search input
    const searchInput = document.getElementById("search-input");
    const searchDropdown = document.getElementById("search-dropdown");

    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        searchDropdown.classList.remove("open");
        return;
      }

      const hits = state.searchIndex.filter(item => {
        if (state.filterCategory !== "ALL" && item.type !== state.filterCategory) return false;
        return item.tokens.some(tok => tok.includes(q)) || (item.display_name && item.display_name.toLowerCase().includes(q));
      }).slice(0, 10);

      if (hits.length === 0) {
        searchDropdown.innerHTML = '<div style="padding: 12px 16px; color: #8c9794; font-size: 0.84rem;">No matching entities found.</div>';
      } else {
        searchDropdown.innerHTML = hits.map(hit => `
          <div class="search-result-item" onclick="window.selectFromSearch('${hit.id}')">
            <b>${hit.display_name || hit.id}</b>
            <span class="type-badge ${getEntityKindBadgeClass(hit.type)}">${hit.type}</span>
          </div>
        `).join('');
      }
      searchDropdown.classList.add("open");
    });

    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.classList.remove("open");
      }
    });

    window.selectFromSearch = (id) => {
      searchInput.value = "";
      searchDropdown.classList.remove("open");
      selectEntity(id);
    };

    // Filter pills
    document.querySelectorAll("#filter-pills button").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#filter-pills button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.filterCategory = btn.getAttribute("data-filter");
        renderStarterList();
      });
    });

    // Profile tabs
    document.querySelectorAll("#profile-tabs button").forEach(btn => {
      btn.addEventListener("click", () => {
        window.setTab(btn.getAttribute("data-tab"));
      });
    });

    // Stat boxes
    document.querySelectorAll(".stat-box").forEach(box => {
      box.addEventListener("click", () => {
        window.setTab(box.getAttribute("data-tab"));
      });
    });

    // Path Finder
    document.getElementById("find-path-btn").addEventListener("click", computePath);

    // Chapter selector buttons
    document.querySelectorAll(".chapter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".chapter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderChapter(btn.getAttribute("data-chapter"));
      });
    });
  }

  function populatePathSelects() {
    const fromSelect = document.getElementById("path-from-select");
    const toSelect = document.getElementById("path-to-select");
    
    const prominent = ["nephi", "lehi", "abinadi", "alma-the-elder", "alma-the-younger", "captain-moroni", "king-benjamin", "ammon-son-of-mosiah", "zarahemla-city", "lamanites", "nephites"];
    
    fromSelect.innerHTML = prominent.map(id => {
      const n = state.nodes.get(id);
      return `<option value="${id}">${n ? n.display_name : id}</option>`;
    }).join('');

    toSelect.innerHTML = prominent.map(id => {
      const n = state.nodes.get(id);
      return `<option value="${id}" ${id === 'zarahemla-city' ? 'selected' : ''}>${n ? n.display_name : id}</option>`;
    }).join('');
  }

  function computePath() {
    const fromId = document.getElementById("path-from-select").value;
    const toId = document.getElementById("path-to-select").value;
    if (fromId === toId) return;

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

      const neighbors = state.adj.get(curr) || [];
      for (const conn of neighbors) {
        const nextId = conn.targetNode.id;
        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push([...path, nextId]);
        }
      }
    }

    const resArea = document.getElementById("path-results-area");
    const trail = document.getElementById("path-trail-items");
    resArea.style.display = "block";

    if (pathFound) {
      trail.innerHTML = pathFound.map((id, idx) => {
        const n = state.nodes.get(id);
        const name = n ? n.display_name : id;
        return `<span onclick="window.selectEntityById('${id}')">${name}</span>${idx < pathFound.length - 1 ? '<b>→</b>' : ''}`;
      }).join('');
    } else {
      trail.innerHTML = '<div style="color: var(--muted); font-size: 0.84rem;">No direct path found within active dataset bounds.</div>';
    }
  }

  function renderChapter(chapterKey) {
    const data = CHAPTER_DATA[chapterKey] || CHAPTER_DATA["1ne1"];
    const box = document.getElementById("chapter-content-box");
    box.innerHTML = `
      <div style="border-bottom: 1px solid #e7ebe9; padding-bottom: 20px; margin-bottom: 24px;">
        <span class="mini-kicker">CHAPTER STUDY</span>
        <h3 style="font-size: 1.8rem; letter-spacing: -0.03em; margin: 6px 0 10px;">${data.title}</h3>
        <p style="font: 500 1.12rem/1.6 Literata, Georgia, serif; color: #233430; margin: 0;">
          ${data.summary}
        </p>
      </div>
      <div style="font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 800; color: var(--sage); margin-bottom: 16px;">
        Narrative Timeline · ${data.moments.length} Story Moments
      </div>
      <div class="timeline-stream">
        ${data.moments.map(m => `
          <div class="timeline-moment-card" onclick="window.selectEntityById('${m.entity}')">
            <small>Verses ${m.verses} · Focus: ${state.nodes.get(m.entity)?.display_name || m.entity}</small>
            <strong>${m.num}. ${m.title}</strong>
            <p>${m.desc}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  window.addEventListener("DOMContentLoaded", init);
})();
