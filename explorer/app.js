// Client-facing Explorer Workbench Interactivity
(() => {
  const ENTITIES = {
    nephi: {
      kind: "PERSON",
      name: "Nephi (Son of Lehi)",
      stats: { people: 10, events: 14, places: 7, groups: 3, refs: 14 },
      people: ["Lehi (Patriarch)", "Sariah", "Laman", "Lemuel", "Sam", "Zoram", "Jacob (Brother)"],
      places: ["Jerusalem", "Valley of Lemuel", "Shazer", "Bountiful (Old World)", "Land of First Inheritance", "City of Nephi"],
      events: [
        { title: "Lehi's family departs Jerusalem into the wilderness", ref: "1 Nephi 2:1–5" },
        { title: "Sons of Lehi obtain the brass plates from Laban", ref: "1 Nephi 3:1–4:38" },
        { title: "Nephi's expanded vision of the tree of life", ref: "1 Nephi 11:1–14:30" },
        { title: "Nephi constructs a ship according to the divine pattern", ref: "1 Nephi 17:7–18:4" },
        { title: "Nephites separate from Lamanites and settle Nephi", ref: "2 Nephi 5:1–18" }
      ]
    },
    abinadi: {
      kind: "PERSON · PROPHET",
      name: "Abinadi",
      stats: { people: 3, events: 5, places: 2, groups: 2, refs: 8 },
      people: ["King Noah", "Alma the Elder", "Gideon"],
      places: ["Land of Lehi-Nephi", "Waters of Mormon"],
      events: [
        { title: "Abinadi enters the city in disguise and prophesies", ref: "Mosiah 12:1–18" },
        { title: "Abinadi stands before King Noah and the priests", ref: "Mosiah 12:19–16:15" },
        { title: "Abinadi seals his testimony with his life by fire", ref: "Mosiah 17:1–20" }
      ]
    },
    zarahemla: {
      kind: "PLACE · CAPITAL CITY",
      name: "Zarahemla, City of",
      stats: { people: 24, events: 42, places: 6, groups: 5, refs: 88 },
      people: ["Mosiah I", "King Benjamin", "Mosiah II", "Alma the Younger", "Captain Moroni", "Helaman"],
      places: ["River Sidon", "Land of Zarahemla", "Manti", "Gideon"],
      events: [
        { title: "Mosiah discovers the people of Zarahemla", ref: "Omni 1:12–19" },
        { title: "King Benjamin gathers the people to the temple", ref: "Mosiah 2:1–6:7" },
        { title: "Alma the Younger is appointed first chief judge", ref: "Mosiah 29:41–44" },
        { title: "Pahoran flees to Gideon during the king-men revolt", ref: "Alma 61:1–8" }
      ]
    },
    moroni: {
      kind: "PERSON · CHIEF CAPTAIN",
      name: "Captain Moroni",
      stats: { people: 8, events: 19, places: 12, groups: 4, refs: 36 },
      people: ["Pahoran", "Lehi (Military Commander)", "Teancum", "Helaman", "Zerahemnah", "Amalickiah"],
      places: ["Zarahemla", "Land of Jershon", "Manti", "Mulek", "Bountiful"],
      events: [
        { title: "Moroni equips Nephites with armor and defeats Zerahemnah", ref: "Alma 43:1–44:24" },
        { title: "Moroni rends his coat and raises the Title of Liberty", ref: "Alma 46:11–28" },
        { title: "Moroni fortifies all Nephite cities with earthworks", ref: "Alma 50:1–15" },
        { title: "Moroni and Pahoran retake Nephite strongholds", ref: "Alma 62:1–32" }
      ]
    }
  };

  let currentEntity = "nephi";
  let currentTab = "overview";

  function renderEntity() {
    const data = ENTITIES[currentEntity] || ENTITIES.nephi;
    
    document.getElementById("entity-kind").textContent = data.kind;
    document.getElementById("entity-name").textContent = data.name;
    document.getElementById("stat-people").textContent = data.stats.people;
    document.getElementById("stat-events").textContent = data.stats.events;
    document.getElementById("stat-places").textContent = data.stats.places;
    document.getElementById("stat-groups").textContent = data.stats.groups;
    document.getElementById("stat-refs").textContent = data.stats.refs;

    const pillsArea = document.getElementById("entity-pills-area");
    const timelineArea = document.getElementById("entity-timeline-area");
    const viewLabel = document.getElementById("view-mode-label");

    if (currentTab === "overview") {
      viewLabel.textContent = "Overview & Key People";
      pillsArea.style.display = "grid";
      timelineArea.style.display = "block";
      pillsArea.innerHTML = data.people.slice(0, 3).map(p => `<div>${p}</div>`).join("");
      timelineArea.innerHTML = data.events.slice(0, 3).map(e => `
        <div>
          <i></i>
          <b>${e.title}</b>
          <small>${e.ref}</small>
        </div>
      `).join("");
    } else if (currentTab === "people") {
      viewLabel.textContent = "All Connected People";
      pillsArea.style.display = "grid";
      timelineArea.style.display = "none";
      pillsArea.innerHTML = data.people.map(p => `<div>${p}</div>`).join("");
    } else if (currentTab === "events") {
      viewLabel.textContent = "Chronological Events Timeline";
      pillsArea.style.display = "none";
      timelineArea.style.display = "block";
      timelineArea.innerHTML = data.events.map(e => `
        <div>
          <i></i>
          <b>${e.title}</b>
          <small>${e.ref}</small>
        </div>
      `).join("");
    } else if (currentTab === "places") {
      viewLabel.textContent = "Associated Places & Geography";
      pillsArea.style.display = "grid";
      timelineArea.style.display = "none";
      pillsArea.innerHTML = data.places.map(p => `<div>${p}</div>`).join("");
    }
  }

  // Bind Starters
  document.querySelectorAll(".starter-card").forEach(card => {
    card.addEventListener("click", () => {
      const entityKey = card.getAttribute("data-entity");
      if (ENTITIES[entityKey]) {
        currentEntity = entityKey;
        renderEntity();
        const frame = document.getElementById("entity-card-frame");
        frame.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  });

  // Bind Tabs
  document.querySelectorAll("#entity-tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#entity-tabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTab = btn.getAttribute("data-tab");
      renderEntity();
    });
  });

  // Bind Filter Pills
  document.querySelectorAll("#filter-pills button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filter-pills button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Search filter
  const searchInput = document.getElementById("interactive-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const val = e.target.value.toLowerCase().trim();
      if (val.includes("abinadi")) currentEntity = "abinadi";
      else if (val.includes("zarahemla")) currentEntity = "zarahemla";
      else if (val.includes("moroni")) currentEntity = "moroni";
      else if (val.includes("nephi")) currentEntity = "nephi";
      renderEntity();
    });
  }

  renderEntity();
})();
