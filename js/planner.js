(function () {
  "use strict";

  const HL = window.HortaLab;
  const DB = window.HortaLocalDB;
  const STORAGE_VERSION = 3;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const formatArea = (value) => Number(value || 0).toFixed(1).replace(".", ",");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  let idCounter = 0;
  let state;
  let dbReady = false;
  let saveTimer = null;
  let pendingSave = Promise.resolve();
  let history = [];
  let future = [];
  let draggedId = null;

  const uid = (type) => `horta-${type}-${Date.now().toString(36)}-${(++idCounter).toString(36)}`;
  const areaTotal = (items) => Math.round(items.reduce((sum, item) => sum + Number(item.area || 0), 0) * 10) / 10;

  function positionFor(index, scenarioId) {
    const spots = scenarioId === "micro"
      ? [[0, 0], [2, 0], [1, 1], [3, 1], [0, 2], [2, 2], [1, 0], [3, 2], [1, 2]]
      : scenarioId === "compact"
        ? [[0, 0], [2, 0], [4, 0], [1, 2], [3, 2], [0, 4], [2, 4], [4, 4], [1, 1], [3, 1], [2, 3]]
        : [[1, 0], [3, 0], [5, 0], [0, 2], [2, 2], [4, 2], [6, 2], [1, 4], [3, 4], [5, 4], [3, 6]];
    const [x, y] = spots[index % spots.length];
    return { x, y };
  }

  function seedComponents(scenarioId) {
    const scenario = HL.SCENARIOS.find((item) => item.id === scenarioId) || HL.SCENARIOS[1];
    return scenario.seed.map(([type, area], index) => ({ id: uid(type), type, area: Math.round(area * 10) / 10, position: positionFor(index, scenario.id) }));
  }

  function defaultState() {
    return {
      schemaVersion: STORAGE_VERSION,
      step: 1,
      essentials: { purpose: "learning", availableArea: 25, water: "regular", responsibles: 2 },
      scenarioId: "compact",
      components: seedComponents("compact"),
      selectedId: null,
      activities: [],
      note: "",
      plotView: "map",
      showGrid: true,
      zoom: 1,
      rotation: 0,
      layoutVersion: 3,
      updatedAt: new Date().toISOString()
    };
  }

  function scenarioFor(id) { return HL.SCENARIOS.find((item) => item.id === id) || HL.SCENARIOS[1]; }

  function normalizeState(raw) {
    const base = defaultState();
    const scenario = HL.SCENARIOS.find((item) => item.id === raw?.scenarioId);
    if (!scenario || !Array.isArray(raw?.components)) return base;
    const components = raw.components
      .filter((item) => HL.COMPONENT_TYPES[item.type] && Number.isFinite(Number(item.area)) && Number(item.area) >= 0)
      .map((item, index) => ({
        id: String(item.id || uid(item.type)),
        type: item.type,
        area: Math.round(Number(item.area) * 10) / 10,
        position: Number.isFinite(Number(item.position?.x)) && Number.isFinite(Number(item.position?.y))
          ? { x: Number(item.position.x), y: Number(item.position.y) }
          : positionFor(index, scenario.id)
      }));
    if (areaTotal(components) > scenario.area + 0.01) return base;
    const selectedId = components.some((item) => item.id === raw.selectedId) ? raw.selectedId : null;
    return {
      ...base,
      ...raw,
      schemaVersion: STORAGE_VERSION,
      scenarioId: scenario.id,
      essentials: { ...base.essentials, ...(raw.essentials || {}) },
      components,
      selectedId,
      activities: Array.isArray(raw.activities) ? raw.activities.filter((item) => typeof item === "string") : [],
      note: typeof raw.note === "string" ? raw.note.slice(0, 400) : "",
      plotView: raw.plotView === "list" ? "list" : "map",
      showGrid: raw.showGrid !== false,
      step: clamp(Number(raw.step) || 1, 1, 6),
      zoom: clamp(Number(raw.zoom) || 1, 0.85, 1.15),
      rotation: Number(raw.rotation) === 1 ? 1 : 0,
      layoutVersion: 3
    };
  }

  state = defaultState();

  function scenario() { return scenarioFor(state.scenarioId); }
  function selected() { return state.components.find((item) => item.id === state.selectedId) || null; }
  function recordHistory() {
    history.push(clone(state));
    if (history.length > 40) history.shift();
    future = [];
  }
  function restoreSnapshot(snapshot, message) {
    state = normalizeState(snapshot);
    save(true);
    renderAll();
    announce(message);
  }
  function undo() {
    const snapshot = history.pop();
    if (!snapshot) return;
    future.push(clone(state));
    restoreSnapshot(snapshot, "Última mudança desfeita.");
  }
  function redo() {
    const snapshot = future.pop();
    if (!snapshot) return;
    history.push(clone(state));
    restoreSnapshot(snapshot, "Mudança refeita.");
  }
  function announce(message) { const live = $("#v2Live"); if (live) live.textContent = message; }
  function setStorageStatus(text, tone = "ready") { const element = $("#v2StorageStatus"); if (element) { element.textContent = text; element.dataset.tone = tone; } }

  function persistNow() {
    if (!dbReady) return Promise.resolve();
    clearTimeout(saveTimer);
    state.updatedAt = new Date().toISOString();
    pendingSave = pendingSave.catch(() => undefined).then(() => DB.saveState(clone(state)));
    pendingSave.then(() => setStorageStatus("SQLite local · salvo", "ready")).catch(() => setStorageStatus("SQLite local · erro ao salvar", "error"));
    return pendingSave;
  }

  function save(immediate = false) {
    if (!dbReady) return Promise.resolve();
    clearTimeout(saveTimer);
    if (immediate) return persistNow();
    saveTimer = setTimeout(() => { persistNow(); }, 140);
    return pendingSave;
  }

  function setStep(next) {
    state.step = clamp(Number(next) || 1, 1, 6);
    save();
    renderAll();
    const heading = $(`[data-v2-panel="${state.step}"] h2`);
    if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }
  }

  function selectScenario(id) {
    if (!HL.SCENARIOS.some((item) => item.id === id)) return;
    recordHistory();
    state.scenarioId = id;
    state.components = seedComponents(id);
    state.selectedId = null;
    save(true);
    renderAll();
    announce(`Cenário ${scenario().name} selecionado.`);
  }

  function scenarioHint(item) {
    const available = Number(state.essentials.availableArea || 0);
    const people = Number(state.essentials.responsibles || 0);
    const reasons = [];
    if (available && available < item.area) reasons.push(`a área informada é menor que ${item.area} m²`);
    if (item.area === 50 && people < 3) reasons.push("a escala ampliada costuma exigir ao menos três pessoas ativas");
    if (item.area >= 25 && state.essentials.water !== "regular") reasons.push("a água ainda precisa ser confirmada para uma escala maior");
    return reasons.length ? `Atenção: ${reasons.join("; ")}.` : `Boa hipótese para ${item.bestFor.toLowerCase()}`;
  }

  function renderProgress() {
    $$('[data-v2-step]').forEach((button) => {
      const step = Number(button.dataset.v2Step);
      if (step === state.step) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
      button.dataset.complete = step < state.step ? "true" : "false";
    });
    $$('[data-v2-panel]').forEach((panel) => { panel.hidden = Number(panel.dataset.v2Panel) !== state.step; });
  }

  function renderEssentials() {
    const form = $("#v2Essentials");
    if (!form) return;
    Object.entries(state.essentials).forEach(([name, value]) => { const input = form.elements[name]; if (input && String(input.value) !== String(value)) input.value = value; });
  }

  function renderScenarios() {
    const container = $("#v2Scenarios");
    if (!container) return;
    container.innerHTML = HL.SCENARIOS.map((item) => `<button type="button" class="v2-scenario${item.id === state.scenarioId ? " is-selected" : ""}" data-v2-scenario="${item.id}" aria-pressed="${item.id === state.scenarioId}">
      <header><div><div class="scenario-area">${item.area} <small>m²</small></div><h3>${item.name}</h3></div><span class="select-mark" aria-hidden="true"></span></header>
      <p>${item.summary}</p><ul>${item.notes.slice(0, 3).map((note) => `<li>${note}</li>`).join("")}</ul>
    </button>`).join("");
    $("#v2ScenarioHint").textContent = scenarioHint(scenario());
  }

  function renderLibrary() {
    const container = $("#v2Library");
    if (!container) return;
    container.innerHTML = Object.entries(HL.COMPONENT_TYPES).map(([type, item]) => `<button type="button" class="v2-library-button" data-v2-add="${type}" style="--item-color:${item.color};--item-soft:${item.soft}" aria-label="Adicionar ${item.label}">
      <span class="v2-library-icon" aria-hidden="true">${item.icon}</span><span class="v2-library-copy"><strong>${item.short}</strong><small>${formatArea(item.defaultArea)} m² · ${escapeHtml(item.resource)}</small></span><span class="v2-add-mark" aria-hidden="true">+</span>
    </button>`).join("");
  }

  function gridSize() {
    const area = scenario().area;
    return area === 12 ? { cols: 4, rows: 3 } : area === 25 ? { cols: 5, rows: 5 } : { cols: 7, rows: 7 };
  }

  function isoPoint(x, y, z = 0, zoom = state.zoom) {
    const tileW = 64 * zoom;
    const tileH = 34 * zoom;
    return [380 + (x - y) * tileW / 2, 150 + (x + y) * tileH / 2 - z * 22 * zoom];
  }

  function points(list) { return list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "); }
  function tilePolygon(x, y, z = 0) { return points([isoPoint(x, y, z), isoPoint(x + 1, y, z), isoPoint(x + 1, y + 1, z), isoPoint(x, y + 1, z)]); }

  function svgDefs(prefix) {
    return `<defs>
      <linearGradient id="${prefix}-terrain" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8edcf"/><stop offset="1" stop-color="#e7cf9f"/></linearGradient>
      <linearGradient id="${prefix}-soil" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#9b6741"/><stop offset="1" stop-color="#5d3728"/></linearGradient>
      <linearGradient id="${prefix}-wood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dea765"/><stop offset=".52" stop-color="#b8753f"/><stop offset="1" stop-color="#7d472d"/></linearGradient>
      <linearGradient id="${prefix}-wood-dark" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a76438"/><stop offset="1" stop-color="#663a29"/></linearGradient>
      <linearGradient id="${prefix}-water" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#86d5ec"/><stop offset=".45" stop-color="#42a8cf"/><stop offset="1" stop-color="#1f6f9a"/></linearGradient>
      <linearGradient id="${prefix}-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5f8f5"/><stop offset=".5" stop-color="#aabbb5"/><stop offset="1" stop-color="#6d827b"/></linearGradient>
      <linearGradient id="${prefix}-terracotta" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ef9a62"/><stop offset="1" stop-color="#a84f32"/></linearGradient>
      <linearGradient id="${prefix}-foliage" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9acc65"/><stop offset=".55" stop-color="#5c9f4a"/><stop offset="1" stop-color="#2f7142"/></linearGradient>
      <filter id="${prefix}-shadow" x="-45%" y="-45%" width="190%" height="210%"><feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="#27483b" flood-opacity=".24"/></filter>
      <filter id="${prefix}-soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>
    </defs>`;
  }

  function artFor(type, x, y, prefix) {
    const p = (dx, dy, z = 0) => isoPoint(x + dx, y + dy, z);
    const pList = (list) => points(list.map(([dx, dy, z]) => p(dx, dy, z)));
    const [cx, cy] = p(.72, .48, .02);
    const outline = `<polygon class="iso-outline" points="${tilePolygon(x, y, .01)}"/>`;
    const shadow = `<ellipse class="iso-ground-shadow" cx="${cx}" cy="${cy + 13}" rx="35" ry="10" fill="#28493b" opacity=".2" filter="url(#${prefix}-soft)"/>`;
    const wrap = (name, art, withShadow = true) => `${outline}<g class="iso-object iso-object-${name}">${withShadow ? shadow : ""}${art}</g>`;
    if (type === "bed") {
      const leaves = [[0.36,.37,-18],[.57,.24,16],[.76,.38,-12],[.95,.29,20],[.57,.54,-18],[.82,.56,12],[1.05,.48,-14]].map(([dx, dy, angle]) => { const [lx, ly] = p(dx, dy, .55); return `<g class="iso-crop"><path d="M${lx} ${ly + 7}v-10" stroke="#2f6b3c" stroke-width="2"/><ellipse cx="${lx - 5}" cy="${ly - 4}" rx="7" ry="4" fill="url(#${prefix}-foliage)" transform="rotate(${angle} ${lx - 5} ${ly - 4})"/><ellipse cx="${lx + 5}" cy="${ly - 5}" rx="7" ry="4" fill="#72b653" transform="rotate(${-angle} ${lx + 5} ${ly - 5})"/></g>`; }).join("");
      return wrap("bed", `<polygon points="${pList([[.08,.48,.08],[.72,.05,.08],[1.39,.45,.08],[.7,.9,.08]])}" fill="url(#${prefix}-wood-dark)" filter="url(#${prefix}-shadow)"/><polygon points="${pList([[.08,.48,.08],[.7,.9,.08],[.7,.9,.35],[.08,.48,.35]])}" fill="#8a4d2f"/><polygon points="${pList([[.7,.9,.08],[1.39,.45,.08],[1.39,.45,.35],[.7,.9,.35]])}" fill="#6f3e2c"/><polygon points="${pList([[.15,.46,.36],[.72,.1,.36],[1.3,.44,.36],[.7,.82,.36]])}" fill="url(#${prefix}-soil)" stroke="#e2aa69" stroke-width="3"/><path d="M${p(.3,.5,.39).join(" ")}L${p(1.13,.42,.39).join(" ")}M${p(.42,.59,.39).join(" ")}L${p(.88,.28,.39).join(" ")}" stroke="#c99465" stroke-width="1.4" opacity=".75"/>${leaves}`);
    }
    if (type === "container") return wrap("container", `<ellipse cx="${cx}" cy="${cy - 14}" rx="24" ry="9" fill="#f6aa70" stroke="#95452f" stroke-width="2"/><path d="M${cx - 22} ${cy - 13}L${cx - 15} ${cy + 17}Q${cx} ${cy + 27} ${cx + 15} ${cy + 17}L${cx + 22} ${cy - 13}Z" fill="url(#${prefix}-terracotta)" stroke="#95452f" stroke-width="2"/><ellipse cx="${cx}" cy="${cy - 14}" rx="18" ry="6" fill="#5f3b2b"/><path d="M${cx} ${cy - 14}V${cy - 42}" stroke="#357642" stroke-width="3"/><ellipse cx="${cx - 10}" cy="${cy - 34}" rx="12" ry="6" fill="url(#${prefix}-foliage)" transform="rotate(25 ${cx - 10} ${cy - 34})"/><ellipse cx="${cx + 10}" cy="${cy - 42}" rx="12" ry="6" fill="#70b653" transform="rotate(-25 ${cx + 10} ${cy - 42})"/><path d="M${cx - 16} ${cy + 8}Q${cx} ${cy + 15} ${cx + 17} ${cy + 7}" fill="none" stroke="#f7ba88" stroke-width="2" opacity=".7"/>`);
    if (type === "paths") {
      const stones = [[.3,.52],[.7,.45],[1.1,.38]].map(([dx, dy], index) => `<polygon class="iso-paver" points="${pList([[dx-.2,dy,.04],[dx,dy-.13,.04],[dx+.26,dy,.04],[dx+.04,dy+.14,.04]])}" fill="${index % 2 ? "#cbb37d" : "#dfc996"}" stroke="#aa9160" stroke-width="1.5"/>`).join("");
      return wrap("paths", `<polygon points="${pList([[.05,.5,.015],[.72,.07,.015],[1.4,.49,.015],[.72,.92,.015]])}" fill="#e5d4aa" opacity=".74"/>${stones}<path d="M${p(.2,.68,.06).join(" ")}Q${cx} ${cy + 9} ${p(1.24,.28,.06).join(" ")}" fill="none" stroke="#f7ecd3" stroke-width="2" opacity=".9"/>`, false);
    }
    if (type === "maneuver") return wrap("maneuver", `<polygon points="${pList([[.05,.5,.02],[.72,.07,.02],[1.4,.49,.02],[.72,.92,.02]])}" fill="#dbe4df" stroke="#91a79d" stroke-width="1.5"/><ellipse cx="${cx}" cy="${cy}" rx="29" ry="15" fill="#edf3f0" stroke="#4e8574" stroke-width="2"/><path class="iso-turning-arrow" d="M${cx - 19} ${cy + 3}A22 12 0 1 0 ${cx + 17} ${cy - 5}" fill="none" stroke="#26765c" stroke-width="3" stroke-linecap="round"/><path d="M${cx + 18} ${cy - 10}l8 6-9 3Z" fill="#26765c"/><g class="iso-access-symbol" fill="none" stroke="#397565" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="${cx - 2}" cy="${cy - 9}" r="3" fill="#397565"/><path d="M${cx - 2} ${cy - 4}l4 8h9M${cx - 3} ${cy - 3}l-6 7M${cx + 1} ${cy + 4}a9 9 0 1 1-12-7"/></g>`, false);
    if (type === "water") return wrap("water", `<g class="iso-water-tank" filter="url(#${prefix}-shadow)"><path d="M${cx - 23} ${cy - 38}V${cy + 7}C${cx - 23} ${cy + 14},${cx + 23} ${cy + 14},${cx + 23} ${cy + 7}V${cy - 38}Z" fill="url(#${prefix}-water)" stroke="#185e80" stroke-width="2"/><ellipse cx="${cx}" cy="${cy - 38}" rx="23" ry="9" fill="#9ce0ef" stroke="#185e80" stroke-width="2"/><ellipse cx="${cx}" cy="${cy - 39}" rx="11" ry="4" fill="#286e8d"/><path d="M${cx - 22} ${cy - 24}H${cx + 22}M${cx - 22} ${cy - 7}H${cx + 22}" stroke="#237a9f" stroke-width="2" opacity=".85"/><path d="M${cx - 14} ${cy - 32}V${cy + 3}" stroke="#c5f0f7" stroke-width="3" opacity=".52"/></g><g class="iso-water-stand" stroke="#536b62" stroke-width="4" stroke-linecap="round"><path d="M${cx - 16} ${cy + 11}v13M${cx + 16} ${cy + 11}v13M${cx - 22} ${cy + 23}h44"/></g><g class="iso-water-tap" fill="none" stroke="#536b62" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M${cx + 23} ${cy - 1}h12v9h8"/><path d="M${cx + 29} ${cy - 6}v10m-5-8h10"/></g><path class="iso-water-hose" d="M${cx + 43} ${cy + 8}q14 5 8 16q-8 12-24 4" fill="none" stroke="#2f7851" stroke-width="4" stroke-linecap="round"/><path class="iso-water-drop" d="M${cx + 43} ${cy + 12}q4 5 0 8q-4-3 0-8Z" fill="#4fbee0"/>`);
    if (type === "compost") return wrap("compost", `<g class="iso-compost-bin" filter="url(#${prefix}-shadow)"><polygon points="${pList([[.2,.45,.06],[.72,.14,.06],[1.23,.44,.06],[.72,.76,.06]])}" fill="#6c442d"/><polygon points="${pList([[.2,.45,.06],[.72,.76,.06],[.72,.76,.65],[.2,.45,.65]])}" fill="url(#${prefix}-wood)"/><polygon points="${pList([[.72,.76,.06],[1.23,.44,.06],[1.23,.44,.65],[.72,.76,.65]])}" fill="url(#${prefix}-wood-dark)"/><polygon points="${pList([[.24,.43,.67],[.72,.16,.67],[1.18,.43,.67],[.72,.71,.67]])}" fill="#5c3b27" stroke="#e1a969" stroke-width="2"/>${[.2,.36,.52].map((z) => `<path d="M${p(.24,.45,z).join(" ")}L${p(.72,.74,z).join(" ")}M${p(.72,.74,z).join(" ")}L${p(1.2,.44,z).join(" ")}" stroke="#73452c" stroke-width="2"/>`).join("")}<path d="M${p(.48,.36,.76).join(" ")}q8-13 16 0M${p(.72,.35,.75).join(" ")}q9-12 18 1" stroke="#82b84e" stroke-width="3" fill="none" stroke-linecap="round"/></g>`);
    if (type === "observation") return wrap("observation", `<g class="iso-observation-bench" filter="url(#${prefix}-shadow)"><polygon points="${pList([[.2,.48,.25],[.72,.16,.25],[1.22,.46,.25],[.7,.78,.25]])}" fill="url(#${prefix}-wood)" stroke="#75432d" stroke-width="1.5"/><polygon points="${pList([[.2,.37,.55],[.72,.06,.55],[1.22,.36,.55],[.7,.67,.55]])}" fill="#c8894d" stroke="#75432d" stroke-width="1.5"/><path d="M${p(.27,.42,.21).join(" ")}v18M${p(1.14,.41,.21).join(" ")}v18M${p(.3,.34,.28).join(" ")}v-16M${p(1.1,.32,.28).join(" ")}v-16" stroke="#69402d" stroke-width="3"/></g><g class="iso-observation-marker" transform="translate(${cx + 27} ${cy - 25})"><circle cx="0" cy="0" r="8" fill="#f5f8f4" stroke="#684f84" stroke-width="3"/><path d="M6 6l8 8" stroke="#684f84" stroke-width="4" stroke-linecap="round"/><path d="M-3 0h6M0-3v6" stroke="#8e74a8" stroke-width="1.5"/></g>`);
    if (type === "pedagogy") return wrap("pedagogy", `<g class="iso-learning-table" filter="url(#${prefix}-shadow)"><polygon points="${pList([[.16,.48,.3],[.72,.13,.3],[1.28,.47,.3],[.71,.82,.3]])}" fill="url(#${prefix}-wood)" stroke="#7a482e" stroke-width="2"/><path d="M${p(.36,.51,.29).join(" ")}v18M${p(1.08,.45,.29).join(" ")}v18" stroke="#6e412d" stroke-width="4"/><g class="iso-open-book"><path d="M${cx - 24} ${cy - 15}q13-6 24 2v17q-11-8-24-2Z" fill="#fff9e9" stroke="#c68638" stroke-width="1.5"/><path d="M${cx + 24} ${cy - 15}q-13-6-24 2v17q11-8 24-2Z" fill="#fff9e9" stroke="#c68638" stroke-width="1.5"/><path d="M${cx} ${cy - 13}v17M${cx - 18} ${cy - 8}l12 2M${cx + 18} ${cy - 8}l-12 2" stroke="#d4ad72" stroke-width="1.2"/></g></g><g class="iso-learning-stools"><ellipse cx="${cx - 36}" cy="${cy + 19}" rx="10" ry="5" fill="#dd9d4d" stroke="#9b622e"/><ellipse cx="${cx + 37}" cy="${cy + 2}" rx="10" ry="5" fill="#dd9d4d" stroke="#9b622e"/></g>`);
    if (type === "seedlings") {
      const sprouts = [[-17,-10],[-6,-7],[6,-12],[17,-8]].map(([dx, dy]) => `<g transform="translate(${cx + dx} ${cy + dy})"><path d="M0 6V-1" stroke="#367444" stroke-width="1.5"/><ellipse cx="-3" cy="-2" rx="4" ry="2.5" fill="#74b653" transform="rotate(25 -3 -2)"/><ellipse cx="3" cy="-3" rx="4" ry="2.5" fill="#559a48" transform="rotate(-25 3 -3)"/></g>`).join("");
      return wrap("seedlings", `<g class="iso-nursery-bench" filter="url(#${prefix}-shadow)"><path d="M${cx - 28} ${cy - 26}v42M${cx + 28} ${cy - 26}v42M${cx - 30} ${cy - 26}h60" stroke="#74624d" stroke-width="3"/><path d="M${cx - 34} ${cy - 26}Q${cx} ${cy - 48} ${cx + 34} ${cy - 26}L${cx + 28} ${cy - 17}Q${cx} ${cy - 35} ${cx - 28} ${cy - 17}Z" fill="#dff0e9" fill-opacity=".72" stroke="#8eb6a7" stroke-width="1.5"/><polygon points="${pList([[.18,.48,.22],[.72,.14,.22],[1.25,.46,.22],[.7,.8,.22]])}" fill="#805239" stroke="#60402e" stroke-width="2"/><polygon points="${pList([[.26,.45,.29],[.72,.18,.29],[1.16,.45,.29],[.7,.73,.29]])}" fill="#395943" stroke="#b7c58d" stroke-width="2"/>${sprouts}<path d="M${cx - 22} ${cy + 5}v18M${cx + 22} ${cy + 5}v18" stroke="#73513a" stroke-width="3"/></g>`);
    }
    if (type === "tools") return wrap("tools", `<g class="iso-tool-rack" filter="url(#${prefix}-shadow)"><polygon points="${cx - 29},${cy - 30} ${cx + 18},${cy - 41} ${cx + 30},${cy - 31} ${cx - 18},${cy - 20}" fill="#d9924d" stroke="#75442d" stroke-width="2"/><rect x="${cx - 24}" y="${cy - 30}" width="49" height="48" rx="3" fill="url(#${prefix}-wood)" stroke="#75442d" stroke-width="2"/><path d="M${cx - 20} ${cy - 18}h41M${cx - 20} ${cy + 4}h41" stroke="#8f5734" stroke-width="2"/><circle cx="${cx + 17}" cy="${cy - 7}" r="2" fill="#f0c784"/></g><g class="iso-tool-shapes" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M${cx - 14} ${cy - 22}v31M${cx - 20} ${cy - 20}h12M${cx - 19} ${cy - 16}h10" stroke="#456b5d" stroke-width="2.5"/><path d="M${cx} ${cy - 22}v29m-6 5q6-10 12 0Z" stroke="#476a5f" stroke-width="2.5" fill="#aebbb6"/><path d="M${cx + 14} ${cy - 21}v21m-6 5q6-9 12 0" stroke="#385d50" stroke-width="2.5"/></g><g class="iso-watering-can" transform="translate(${cx - 29} ${cy + 12})"><path d="M0 0h15v10H0zM15 2q10 0 10 7M0 2l-8-7" fill="#5d9d83" stroke="#2f6955" stroke-width="2"/><path d="M2 0q5-9 11 0" fill="none" stroke="#2f6955" stroke-width="2"/></g>`);
    if (type === "signage") return wrap("signage", `<g class="iso-signpost" filter="url(#${prefix}-shadow)"><path d="M${cx} ${cy + 17}V${cy - 35}" stroke="#72462f" stroke-width="5"/><path d="M${cx - 32} ${cy - 39}l49-11 15 11-49 11Z" fill="#dc7440" stroke="#87412b" stroke-width="2"/><path d="M${cx - 18} ${cy - 38}l27-6M${cx - 14} ${cy - 33}l18-4" stroke="#fff0cf" stroke-width="2" stroke-linecap="round"/></g>`);
    return `${outline}<g class="iso-object iso-object-generic">${shadow}</g>`;
  }

  function renderIsoInto(svg, interactive = true) {
    if (!svg) return;
    const size = gridSize();
    const prefix = svg.id === "v2CompositionCanvas" ? "composition" : "layout";
    const compactViewport = window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
    if (compactViewport) {
      const mobileView = scenario().area === 50 ? "140 110 480 300" : scenario().area === 25 ? "180 110 400 280" : "245 115 270 190";
      svg.setAttribute("viewBox", mobileView);
    } else {
      svg.setAttribute("viewBox", "100 95 560 350");
    }
    const terrain = [];
    for (let y = 0; y < size.rows; y += 1) for (let x = 0; x < size.cols; x += 1) {
      const fill = (x + y) % 2 ? "#eddcb7" : "#f8edcf";
      terrain.push(`<polygon points="${tilePolygon(x, y)}" fill="${fill}" stroke="#d3b982" stroke-width="1"/>`);
      if ((x + y) % 3 === 0) terrain.push(`<circle cx="${isoPoint(x + .5, y + .55, .02)[0]}" cy="${isoPoint(x + .5, y + .55, .02)[1]}" r="2.4" fill="#b49862" opacity=".55"/>`);
    }
    const boundaryCorners = [isoPoint(0, 0, .02), isoPoint(size.cols, 0, .02), isoPoint(size.cols, size.rows, .02), isoPoint(0, size.rows, .02)];
    const boundary = `<polygon points="${points(boundaryCorners)}" fill="url(#${prefix}-terrain)" opacity=".18" stroke="#2f7556" stroke-width="5"/>`;
    const objects = state.components.map((item, index) => {
      let x = Number(item.position?.x); let y = Number(item.position?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) { x = index % size.cols; y = Math.floor(index / size.cols); }
      if (state.rotation === 1) { const swap = x; x = y; y = swap; }
      x = clamp(x, 0, size.cols - 1); y = clamp(y, 0, size.rows - 1);
      const type = HL.COMPONENT_TYPES[item.type];
      const point = isoPoint(x, y, .03);
      const label = `${type.label}, ${formatArea(item.area)} m²`;
      const labelMarkup = interactive && item.id === state.selectedId ? `<text class="iso-label" x="${point[0]}" y="${point[1] - 32}" text-anchor="middle">${escapeHtml(type.short)}</text>` : "";
      return `<g class="iso-hit${interactive && item.id === state.selectedId ? " is-selected" : ""}" data-iso-id="${item.id}" data-iso-type="${item.type}"${interactive ? ' tabindex="0" role="button"' : ""} aria-label="${label}">${artFor(item.type, x, y, prefix)}${labelMarkup}</g>`;
    }).join("");
    svg.innerHTML = `${svgDefs(prefix)}<title id="${prefix === "layout" ? "v2IsoTitle" : "v2CompositionTitle"}">${interactive ? "Montagem isométrica da horta" : "Prévia da composição"}</title><desc id="${prefix === "layout" ? "v2IsoDesc" : "v2CompositionDesc"}">${scenario().name}, ${scenario().area} metros quadrados, com ${state.components.length} componentes.</desc><g class="iso-world">${terrain.join("")}${boundary}${objects}</g>`;
    if (!interactive) return;
    $$('[data-iso-id]', svg).forEach((node) => {
      node.addEventListener("click", () => selectComponent(node.dataset.isoId));
      node.addEventListener("keydown", (event) => {
        if (["Enter", " "].includes(event.key)) { event.preventDefault(); selectComponent(node.dataset.isoId); }
        if (node.dataset.isoId === state.selectedId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); nudgeSelected(event.key); }
      });
    });
  }

  function renderLayout() {
    const current = scenario();
    const total = areaTotal(state.components);
    const selectedItem = selected();
    $("#v2LayoutScenario").textContent = current.name;
    $("#v2LayoutArea").textContent = `${current.area} m²`;
    $("#v2LayoutPercent").textContent = `${Math.round((total / current.area) * 100)}%`;
    $("#v2LayoutMeter").style.width = `${Math.min(100, (total / current.area) * 100)}%`;
    $("#v2LayoutCount").textContent = `${state.components.length} ${state.components.length === 1 ? "item" : "itens"}`;
    $("#v2LayoutList").innerHTML = state.components.map((item) => { const type = HL.COMPONENT_TYPES[item.type]; return `<li><button type="button" class="${item.id === state.selectedId ? "is-selected" : ""}" data-v2-layout-select="${item.id}"><span class="v2-component-icon" style="color:${type.color}" aria-hidden="true">${type.icon}</span><span>${type.short}</span><small>${formatArea(item.area)} m²</small></button></li>`; }).join("");
    $("#v2SelectedTitle").textContent = selectedItem ? HL.COMPONENT_TYPES[selectedItem.type].label : "Selecione uma zona";
    $("#v2SelectedHelp").textContent = selectedItem ? "Use as setas para reposicionar no terreno." : "Clique em um item da cena ou da lista.";
    $("#v2RemoveSelected").disabled = !selectedItem;
    renderIsoInto($("#v2IsoCanvas"), true);
  }

  function renderActivities() {
    const choices = HL.ACTIVITIES.flatMap((group) => group.options.slice(0, 1).map(([id, name, description]) => ({ id, name, description, subject: group.name })));
    $("#v2Activities").innerHTML = choices.map((item) => `<label class="v2-activity"><input type="checkbox" value="${item.id}" ${state.activities.includes(item.id) ? "checked" : ""}><span><strong>${item.name}</strong><span>${item.subject} · ${item.description}</span></span></label>`).join("");
    $("#v2Note").value = state.note;
  }

  function renderSummary() {
    const current = scenario();
    const total = areaTotal(state.components);
    const grouped = state.components.reduce((acc, item) => { const label = HL.COMPONENT_TYPES[item.type].label; acc[label] = (acc[label] || 0) + Number(item.area); return acc; }, {});
    const activityNames = HL.ACTIVITIES.flatMap((group) => group.options).filter(([id]) => state.activities.includes(id)).map(([, name]) => name);
    $("#v2Summary").innerHTML = `<div class="v2-summary-hero"><div><strong>${current.area} m² · ${current.name}</strong><span> ${formatArea(total)} m² distribuídos · ${state.components.length} zonas</span></div><span>Uso orientativo, não validação técnica.</span></div>
      <section class="v2-summary-block"><h3>Composição</h3><ul>${Object.entries(grouped).map(([label, value]) => `<li>${escapeHtml(label)} — ${formatArea(value)} m²</li>`).join("")}</ul></section>
      <section class="v2-summary-block"><h3>Atividades</h3>${activityNames.length ? `<ul>${activityNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>` : "<p>Nenhuma atividade selecionada ainda.</p>"}</section>
      <section class="v2-summary-block"><h3>Condições anotadas</h3><p>${escapeHtml(state.essentials.responsibles)} pessoas · água ${escapeHtml(state.essentials.water)} · área disponível ${escapeHtml(state.essentials.availableArea)} m².</p>${state.note ? `<p><strong>Intenção:</strong> ${escapeHtml(state.note)}</p>` : ""}</section>
      <section class="v2-summary-block"><h3>Próximo passo</h3><p>Confirme no local o percurso, a segurança, a água, o solo, o alcance e a rotina de cuidado antes de qualquer implantação.</p></section>`;
  }

  function compositionCard(item, index, current) {
    const type = HL.COMPONENT_TYPES[item.type];
    const basis = Math.max(20, Math.min(100, (Number(item.area || 0) / current.area) * 160));
    return `<li class="v2-plot-item${item.id === state.selectedId ? " is-selected" : ""}" data-v2-component-id="${item.id}" style="--item-color:${type.color};--item-soft:${type.soft};--item-basis:${basis}%" draggable="true">
      <span class="v2-plot-icon" aria-hidden="true">${type.icon}</span><span class="v2-plot-copy"><strong>${type.label}</strong><span>${formatArea(item.area)} m² · posição ${index + 1}</span></span>
      <button type="button" class="v2-plot-select" data-v2-select="${item.id}" aria-label="Selecionar ${type.label}, ${formatArea(item.area)} metros quadrados, posição ${index + 1}"></button>
    </li>`;
  }

  function renderComposition() {
    const current = scenario();
    const total = areaTotal(state.components);
    const remaining = Math.round((current.area - total) * 10) / 10;
    const percent = current.area ? Math.min(100, (total / current.area) * 100) : 0;
    const grid = $("#v2PlotGrid");
    if (!grid) return;
    $("#v2CompositionScenario").textContent = `${current.area} m² — ${current.name}`;
    $("#v2CompositionArea").textContent = `${formatArea(total)} de ${formatArea(current.area)} m² utilizados`;
    $("#v2CompositionMeter").style.width = `${percent}%`;
    grid.dataset.view = state.plotView;
    grid.classList.toggle("is-grid-hidden", !state.showGrid);
    grid.innerHTML = state.components.length ? state.components.map((item, index) => compositionCard(item, index, current)).join("") : '<li class="v2-plot-empty">O mapa está vazio. Adicione um componente pela biblioteca.</li>';
    $("#v2CompositionMessage").textContent = remaining > 0 ? `${formatArea(remaining)} m² livres. Espaço livre também apoia segurança e adaptação.` : "A área está totalmente distribuída. Para adicionar algo, reduza ou remova outro componente.";
    $("#v2CompositionMessage").dataset.tone = remaining <= 0 ? "warning" : "info";
    $$('[data-v2-plot-view]').forEach((button) => {
      const active = button.dataset.v2PlotView === state.plotView;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const gridToggle = $("[data-v2-grid-toggle]");
    if (gridToggle) { gridToggle.setAttribute("aria-pressed", String(state.showGrid)); gridToggle.classList.toggle("is-active", state.showGrid); }
    $$('[data-v2-history]').forEach((button) => { button.disabled = button.dataset.v2History === "undo" ? history.length === 0 : future.length === 0; });
    const editor = $("#v2ComponentEditor");
    const item = selected();
    editor.hidden = !item;
    if (item) {
      const type = HL.COMPONENT_TYPES[item.type];
      const index = state.components.indexOf(item);
      $("#v2EditorIcon").innerHTML = type.icon;
      $("#v2EditorIcon").style.color = type.color;
      $("#v2EditorTitle").textContent = type.label;
      $("#v2EditorHelp").textContent = `Posição ${index + 1} de ${state.components.length}. ${type.resource}.`;
      const input = $("#v2CompositionAreaInput");
      input.value = item.area.toFixed(1);
      input.max = Math.max(0, Math.round((current.area - total + item.area) * 10) / 10);
      $$('[data-v2-move]').forEach((button) => { button.disabled = (button.dataset.v2Move === "-1" && index === 0) || (button.dataset.v2Move === "1" && index === state.components.length - 1); });
    }
  }

  function renderAll() { renderProgress(); renderEssentials(); renderScenarios(); renderLibrary(); renderComposition(); renderLayout(); renderActivities(); renderSummary(); }

  function addComponent(type) {
    const current = scenario();
    const remaining = Math.round((current.area - areaTotal(state.components)) * 10) / 10;
    const item = HL.COMPONENT_TYPES[type];
    if (!item || remaining <= 0) { announce("Não há área livre neste cenário."); return; }
    recordHistory();
    const area = Math.min(item.defaultArea, remaining);
    const id = uid(type);
    state.components.push({ id, type, area: Math.round(area * 10) / 10, position: positionFor(state.components.length, state.scenarioId) });
    state.selectedId = id;
    save(true); renderAll(); announce(`${item.label} adicionado.`);
  }

  function updateArea(id, value) {
    const item = state.components.find((entry) => entry.id === id);
    if (!item) return;
    const other = areaTotal(state.components.filter((entry) => entry.id !== id));
    const max = Math.max(0, Math.round((scenario().area - other) * 10) / 10);
    const nextArea = clamp(Math.round((Number(value) || 0) * 10) / 10, 0, max);
    if (nextArea === item.area) return;
    recordHistory();
    item.area = nextArea;
    save(); renderAll();
  }

  function removeComponent(id) {
    const item = state.components.find((entry) => entry.id === id);
    if (!item) return;
    recordHistory();
    state.components = state.components.filter((entry) => entry.id !== id);
    if (state.selectedId === id) state.selectedId = null;
    save(true); renderAll(); announce(item ? `${HL.COMPONENT_TYPES[item.type].label} removido.` : "Zona removida.");
  }

  function selectComponent(id) { if (!state.components.some((item) => item.id === id)) return; state.selectedId = id; save(); renderAll(); }

  function moveComponent(delta) {
    const index = state.components.findIndex((item) => item.id === state.selectedId);
    const target = index + Number(delta);
    if (index < 0 || target < 0 || target >= state.components.length) return;
    recordHistory();
    const next = [...state.components];
    [next[index], next[target]] = [next[target], next[index]];
    state.components = next;
    save(true); renderAll();
    announce(`Componente movido para ${target + 1} de ${next.length}.`);
  }

  function reorderComponent(sourceId, targetId) {
    const sourceIndex = state.components.findIndex((item) => item.id === sourceId);
    const targetIndex = state.components.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    recordHistory();
    const next = [...state.components];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    state.components = next;
    state.selectedId = moved.id;
    save(true); renderAll();
    announce(`${HL.COMPONENT_TYPES[moved.type].label} reposicionado na composição.`);
  }

  function toggleGrid() {
    recordHistory();
    state.showGrid = !state.showGrid;
    save(); renderComposition();
    announce(state.showGrid ? "Grade exibida." : "Grade ocultada.");
  }

  function nudgeSelected(key) {
    const item = selected();
    if (!item) return;
    const size = gridSize();
    const delta = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[key];
    if (!delta) return;
    recordHistory();
    item.position.x = clamp(Number(item.position.x || 0) + delta[0], 0, size.cols - 1);
    item.position.y = clamp(Number(item.position.y || 0) + delta[1], 0, size.rows - 1);
    save(true); renderLayout(); announce(`${HL.COMPONENT_TYPES[item.type].label} reposicionado.`);
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  async function exportPlan() {
    await persistNow();
    downloadBlob(new Blob([JSON.stringify({ app: "HortaLab Escola", version: "2.2.0", exportedAt: new Date().toISOString(), state: clone(state) }, null, 2)], { type: "application/json" }), "hortalab-plano.json");
    announce("Plano JSON exportado.");
  }

  async function exportSqlite() {
    try { await persistNow(); downloadBlob(await DB.exportSqlite(), "hortalab-escola.sqlite"); announce("Banco SQLite exportado."); }
    catch (error) { announce(`Não foi possível exportar o SQLite: ${error.message}`); }
  }

  function importedState(payload) {
    const candidate = payload?.state || payload;
    if (!candidate || !HL.SCENARIOS.some((item) => item.id === candidate.scenarioId) || !Array.isArray(candidate.components)) throw new Error("O arquivo não contém um plano HortaLab reconhecido.");
    const result = normalizeState(candidate);
    if (result.scenarioId !== candidate.scenarioId || areaTotal(result.components) > scenarioFor(candidate.scenarioId).area + .01) throw new Error("A composição do arquivo excede o cenário escolhido.");
    return result;
  }

  async function importFile(file) {
    if (!file) return;
    try {
      if (file.name.toLowerCase().endsWith(".json") || file.type.includes("json")) {
        state = importedState(JSON.parse(await file.text()));
        await persistNow();
      } else {
        state = normalizeState(await DB.importSqlite(await file.arrayBuffer()));
      }
      renderAll(); announce("Plano importado e salvo neste dispositivo.");
    } catch (error) { announce(`Importação não aplicada: ${error.message}`); }
  }

  async function reset() {
    if (!window.confirm("Apagar o plano salvo neste dispositivo e começar novamente?")) return;
    history = [];
    future = [];
    state = defaultState();
    try { await DB.clear(); await persistNow(); renderAll(); announce("Plano apagado e reiniciado."); }
    catch (error) { announce(`Não foi possível reiniciar o SQLite: ${error.message}`); }
  }

  function bindEvents() {
    $("#v2Essentials")?.addEventListener("input", (event) => { const field = event.target; if (field.name) { state.essentials[field.name] = field.type === "number" ? Number(field.value) : field.value; save(); if (state.step === 2) renderScenarios(); } });
    $("#v2Scenarios")?.addEventListener("click", (event) => { const button = event.target.closest("[data-v2-scenario]"); if (button) selectScenario(button.dataset.v2Scenario); });
    $("#v2Library")?.addEventListener("click", (event) => { const button = event.target.closest("[data-v2-add]"); if (button) addComponent(button.dataset.v2Add); });
    const plotGrid = $("#v2PlotGrid");
    plotGrid?.addEventListener("click", (event) => { const button = event.target.closest("[data-v2-select]"); if (button) selectComponent(button.dataset.v2Select); });
    plotGrid?.addEventListener("dragstart", (event) => {
      const item = event.target.closest("[data-v2-component-id]");
      if (!item) return;
      draggedId = item.dataset.v2ComponentId;
      item.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedId);
    });
    plotGrid?.addEventListener("dragover", (event) => {
      if (!draggedId || !event.target.closest("[data-v2-component-id]")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });
    plotGrid?.addEventListener("drop", (event) => {
      const target = event.target.closest("[data-v2-component-id]");
      if (!target || !draggedId) return;
      event.preventDefault();
      reorderComponent(draggedId, target.dataset.v2ComponentId);
      draggedId = null;
    });
    plotGrid?.addEventListener("dragend", () => {
      draggedId = null;
      $$(".is-dragging", plotGrid).forEach((item) => item.classList.remove("is-dragging"));
    });
    $("#v2ComponentEditor")?.addEventListener("change", (event) => { if (event.target.id === "v2CompositionAreaInput" && state.selectedId) updateArea(state.selectedId, event.target.value); });
    $("#v2ComponentEditor")?.addEventListener("click", (event) => { const move = event.target.closest("[data-v2-move]"); if (move) moveComponent(move.dataset.v2Move); if (event.target.closest("#v2RemoveComponent") && state.selectedId) removeComponent(state.selectedId); });
    $(".v2-view-switch")?.addEventListener("click", (event) => { const button = event.target.closest("[data-v2-plot-view]"); if (button) { state.plotView = button.dataset.v2PlotView === "list" ? "list" : "map"; save(); renderComposition(); } });
    $("[data-v2-grid-toggle]")?.addEventListener("click", toggleGrid);
    $$('[data-v2-history]').forEach((button) => button.addEventListener("click", () => button.dataset.v2History === "undo" ? undo() : redo()));
    $("#v2LayoutList")?.addEventListener("click", (event) => { const button = event.target.closest("[data-v2-layout-select]"); if (button) selectComponent(button.dataset.v2LayoutSelect); });
    $("#v2LayoutList")?.parentElement?.addEventListener("click", (event) => { const button = event.target.closest("[data-v2-nudge]"); if (button) nudgeSelected(button.dataset.v2Nudge); });
    $("#v2RemoveSelected")?.addEventListener("click", () => { if (state.selectedId) removeComponent(state.selectedId); });
    $("#v2Rotate")?.addEventListener("click", () => { recordHistory(); state.rotation = state.rotation ? 0 : 1; save(true); renderLayout(); announce("Vista girada."); });
    $("#v2ZoomIn")?.addEventListener("click", () => { recordHistory(); state.zoom = clamp(Math.round((state.zoom + .1) * 10) / 10, .85, 1.15); save(); renderLayout(); });
    $("#v2ZoomOut")?.addEventListener("click", () => { recordHistory(); state.zoom = clamp(Math.round((state.zoom - .1) * 10) / 10, .85, 1.15); save(); renderLayout(); });
    $("#v2Activities")?.addEventListener("change", (event) => { if (event.target.matches("input")) { state.activities = $$('input:checked', $("#v2Activities")).map((input) => input.value); save(); } });
    $("#v2Note")?.addEventListener("input", (event) => { state.note = event.target.value.slice(0, 400); save(); });
    $("#v2Print")?.addEventListener("click", () => window.print());
    $("#v2Export")?.addEventListener("click", exportPlan);
    $("#v2ExportSqlite")?.addEventListener("click", exportSqlite);
    $("#v2ImportFile")?.addEventListener("change", (event) => importFile(event.target.files[0]));
    $("#v2ResetTop")?.addEventListener("click", reset); $("#v2ResetBottom")?.addEventListener("click", reset);
    document.addEventListener("click", (event) => {
      const go = event.target.closest("[data-v2-step]"); if (go && go.dataset.v2Step) setStep(go.dataset.v2Step);
      const next = event.target.closest("[data-v2-next]"); if (next) setStep(state.step + 1);
      const prev = event.target.closest("[data-v2-prev]"); if (prev) setStep(state.step - 1);
    });
  }

  async function init() {
    bindEvents();
    renderAll();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./service-worker.js").catch(() => undefined);
    setStorageStatus("SQLite local · conectando", "loading");
    try {
      await DB.ready();
      const saved = await DB.loadState();
      state = saved ? normalizeState(saved) : defaultState();
      dbReady = true;
      renderAll();
      await persistNow();
      setStorageStatus("SQLite local · salvo", "ready");
    } catch (error) {
      setStorageStatus("SQLite local · indisponível", "error");
      announce(`O plano continua disponível nesta sessão, mas o SQLite local não abriu: ${error.message}`);
    }
  }

  init();
}());
