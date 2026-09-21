(function () {
  "use strict";

  const HL = window.HortaLab;
  const STORAGE_KEY = "hortalab-escola-v2-state";
  const root = document.body;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const formatArea = (value) => Number(value || 0).toFixed(1).replace(".", ",");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  let idCounter = 0;
  const uid = (type) => `v2-${type}-${Date.now().toString(36)}-${(++idCounter).toString(36)}`;
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
    return scenario.seed.map(([type, area], index) => ({ id: uid(type), type, area, position: positionFor(index, scenario.id) }));
  }

  function defaultState() {
    return {
      schemaVersion: 2,
      step: 1,
      essentials: { purpose: "learning", availableArea: 25, water: "regular", responsibles: 2 },
      scenarioId: "compact",
      components: seedComponents("compact"),
      selectedId: null,
      activities: [],
      note: "",
      zoom: 1,
      rotation: 0,
      layoutVersion: 2,
      updatedAt: new Date().toISOString()
    };
  }

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const scenario = HL.SCENARIOS.find((item) => item.id === parsed.scenarioId);
      if (!scenario || !Array.isArray(parsed.components)) return defaultState();
      const components = parsed.components.filter((item) => HL.COMPONENT_TYPES[item.type] && Number.isFinite(Number(item.area)) && Number(item.area) >= 0).map((item, index) => ({
        id: String(item.id || uid(item.type)), type: item.type, area: Math.round(Number(item.area) * 10) / 10,
        position: parsed.layoutVersion === 2 && Number.isFinite(item.position?.x) && Number.isFinite(item.position?.y) ? { x: item.position.x, y: item.position.y } : positionFor(index, scenario.id)
      }));
      if (areaTotal(components) > scenario.area + .01) return defaultState();
      return { ...defaultState(), ...parsed, scenarioId: scenario.id, components, selectedId: null, layoutVersion: 2, zoom: clamp(Number(parsed.zoom) || 1, .85, 1.15), rotation: Number(parsed.rotation) === 1 ? 1 : 0 };
    } catch (error) {
      return defaultState();
    }
  }

  let state = readState();

  function save() {
    state.updatedAt = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { /* armazenamento local pode estar indisponível */ }
  }

  function scenario() { return HL.SCENARIOS.find((item) => item.id === state.scenarioId) || HL.SCENARIOS[1]; }
  function selected() { return state.components.find((item) => item.id === state.selectedId) || null; }
  function announce(message) { const live = $("#v2Live"); if (live) live.textContent = message; }

  function setStep(next) {
    state.step = clamp(Number(next) || 1, 1, 6);
    save();
    renderAll();
    const heading = $(`[data-v2-panel="${state.step}"] h2`);
    if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }
  }

  function selectScenario(id) {
    if (!HL.SCENARIOS.some((item) => item.id === id)) return;
    state.scenarioId = id;
    state.components = seedComponents(id);
    state.selectedId = null;
    save();
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
    $$("[data-v2-step]").forEach((button) => {
      const step = Number(button.dataset.v2Step);
      button.toggleAttribute("aria-current", step === state.step);
      if (step === state.step) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
      button.dataset.complete = step < state.step ? "true" : "false";
    });
    $$('[data-v2-panel]').forEach((panel) => { panel.hidden = Number(panel.dataset.v2Panel) !== state.step; });
  }

  function renderEssentials() {
    const form = $("#v2Essentials");
    if (!form) return;
    Object.entries(state.essentials).forEach(([name, value]) => {
      const input = form.elements[name];
      if (input && String(input.value) !== String(value)) input.value = value;
    });
  }

  function renderScenarios() {
    const container = $("#v2Scenarios");
    if (!container) return;
    container.innerHTML = HL.SCENARIOS.map((item) => `<button type="button" class="v2-scenario${item.id === state.scenarioId ? " is-selected" : ""}" data-v2-scenario="${item.id}" aria-pressed="${item.id === state.scenarioId}">
      <header><div><div class="scenario-area">${item.area} <small>m²</small></div><h3>${item.name}</h3></div><span class="select-mark" aria-hidden="true"></span></header>
      <p>${item.summary}</p><ul>${item.notes.slice(0, 3).map((note) => `<li>${note}</li>`).join("")}</ul>
    </button>`).join("");
    const selectedScenario = scenario();
    $("#v2ScenarioHint").textContent = scenarioHint(selectedScenario);
  }

  function renderLibrary() {
    const container = $("#v2Library");
    if (!container) return;
    container.innerHTML = Object.entries(HL.COMPONENT_TYPES).map(([type, item]) => `<button type="button" class="v2-library-button" data-v2-add="${type}" style="--item-color:${item.color};--item-soft:${item.soft}" aria-label="Adicionar ${item.label}">${item.icon}<span>${item.short}</span></button>`).join("");
  }

  function componentRow(item) {
    const type = HL.COMPONENT_TYPES[item.type];
    return `<div class="v2-component-row${item.id === state.selectedId ? " is-selected" : ""}" data-v2-row="${item.id}">
      <span class="v2-component-icon" style="color:${type.color}">${type.icon}</span>
      <button type="button" data-v2-select="${item.id}"><strong>${type.label}</strong><small>Zona editável</small></button>
      <label class="sr-only" for="v2-area-${item.id}">Área de ${type.label}</label><input class="v2-component-area" id="v2-area-${item.id}" data-v2-area="${item.id}" type="number" min="0" step="0.1" value="${item.area.toFixed(1)}" inputmode="decimal" aria-label="Área de ${type.label}"><button class="v2-remove" type="button" data-v2-remove="${item.id}" aria-label="Remover ${type.label}">×</button>
    </div>`;
  }

  function renderComposition() {
    const current = scenario();
    const total = areaTotal(state.components);
    $("#v2CompositionScenario").textContent = `${current.area} m² · ${current.name}`;
    $("#v2CompositionArea").textContent = `${formatArea(total)} de ${formatArea(current.area)} m² utilizados`;
    $("#v2CompositionMeter").style.width = `${Math.min(100, (total / current.area) * 100)}%`;
    $("#v2ComponentList").innerHTML = state.components.length ? state.components.map(componentRow).join("") : '<p class="v2-hint">Nenhum componente adicionado.</p>';
    const message = $("#v2CompositionMessage");
    message.textContent = total > current.area ? "A composição ultrapassa a área. Reduza ou remova um item antes de continuar." : `${formatArea(current.area - total)} m² livres para circulação, pausa ou expansão futura.`;
    message.style.borderLeftColor = total > current.area ? "#b44d3e" : "#d8753c";
  }

  function gridSize() {
    const area = scenario().area;
    return area === 12 ? { cols: 4, rows: 3 } : area === 25 ? { cols: 5, rows: 5 } : { cols: 7, rows: 7 };
  }

  function isoPoint(x, y, z = 0, zoom = state.zoom) {
    const tileW = 64 * zoom;
    const tileH = 34 * zoom;
    const originX = 380;
    const originY = 150;
    return [originX + (x - y) * tileW / 2, originY + (x + y) * tileH / 2 - z * 22 * zoom];
  }

  function points(list) { return list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "); }

  function tilePolygon(x, y, z = 0) {
    return points([isoPoint(x, y, z), isoPoint(x + 1, y, z), isoPoint(x + 1, y + 1, z), isoPoint(x, y + 1, z)]);
  }

  function artFor(type, x, y, selectedItem) {
    const p = (dx, dy, z = 0) => isoPoint(x + dx, y + dy, z);
    const pList = (list) => points(list.map(([dx, dy, z]) => p(dx, dy, z)));
    const outline = `<polygon class="iso-outline" points="${tilePolygon(x, y, .01)}"/>`;
    const soil = `<polygon points="${pList([[.16,.42,.12],[.78,.08,.12],[1.32,.43,.12],[.7,.8,.12]])}" fill="#6c432d"/>`;
    if (type === "bed") return `${outline}<polygon points="${pList([[.12,.44,.1],[.73,.06,.1],[1.35,.42,.1],[.68,.84,.1]])}" fill="#a8663a"/><polygon points="${pList([[.2,.43,.25],[.74,.1,.25],[1.27,.43,.25],[.69,.77,.25]])}" fill="#70442c"/>${[.34,.57,.8].map((offset) => `<circle cx="${p(offset,.34,.4)[0]}" cy="${p(offset,.34,.4)[1]}" r="5" fill="#69a84f"/><circle cx="${p(offset+.1,.52,.39)[0]}" cy="${p(offset+.1,.52,.39)[1]}" r="4" fill="#4d8b43"/>`).join("")}`;
    if (type === "container") return `${outline}<polygon points="${pList([[.28,.4,.08],[.72,.15,.08],[1.16,.4,.08],[.72,.66,.08]])}" fill="#a96a40"/><ellipse cx="${p(.72,.4,.42)[0]}" cy="${p(.72,.4,.42)[1]}" rx="20" ry="8" fill="#75472e"/><path d="M${p(.65,.39,.44).join(" ")} Q${p(.66,.2,.75).join(" ")} ${p(.72,.4,.8).join(" ")} M${p(.77,.39,.44).join(" ")} Q${p(.79,.2,.75).join(" ")} ${p(.72,.4,.8).join(" ")}" fill="none" stroke="#69a84f" stroke-width="3"/>`;
    if (type === "paths" || type === "maneuver") return `${outline}<polygon points="${pList([[.05,.5,.02],[.72,.08,.02],[1.42,.5,.02],[.72,.92,.02]])}" fill="${type === "paths" ? "#d9c18d" : "#c7d0c8"}"/><path d="M${p(.28,.5,.04).join(" ")}L${p(1.15,.5,.04).join(" ")}" stroke="${type === "paths" ? "#a7905f" : "#8d9d91"}" stroke-width="2" stroke-dasharray="4 5"/>`;
    if (type === "water") return `${outline}<ellipse cx="${p(.72,.48,.08)[0]}" cy="${p(.72,.48,.08)[1]}" rx="23" ry="10" fill="#327faf"/><path d="M${p(.49,.48,.1).join(" ")}v-22q0-6 6-6h33q6 0 6 6v22" fill="#4f9dd9"/><ellipse cx="${p(.72,.48,.1)[0]}" cy="${p(.72,.48,.1)[1]-22}" rx="23" ry="9" fill="#6db7e6"/>`;
    if (type === "compost") return `${outline}<polygon points="${pList([[.2,.4,.05],[.72,.1,.05],[1.24,.4,.05],[.72,.72,.05]])}" fill="#795235"/><polygon points="${pList([[.25,.37,.3],[.72,.12,.3],[1.18,.38,.3],[.72,.66,.3]])}" fill="#a2663d"/><path d="M${p(.55,.36,.42).join(" ")}q10-10 20 0" stroke="#69a84f" stroke-width="3" fill="none"/>`;
    if (type === "observation") return `${outline}<ellipse cx="${p(.72,.48,.08)[0]}" cy="${p(.72,.48,.08)[1]}" rx="25" ry="11" fill="#c39b68"/><ellipse cx="${p(.72,.48,.23)[0]}" cy="${p(.72,.48,.23)[1]}" rx="22" ry="9" fill="#a66f40"/><circle cx="${p(.72,.48,.3)[0]}" cy="${p(.72,.48,.3)[1]}" r="5" fill="#f2e6c9"/>`;
    if (type === "pedagogy") return `${outline}<ellipse cx="${p(.72,.48,.16)[0]}" cy="${p(.72,.48,.16)[1]}" rx="30" ry="12" fill="#c58f53"/><ellipse cx="${p(.72,.48,.28)[0]}" cy="${p(.72,.48,.28)[1]}" rx="25" ry="10" fill="#f2e6c9"/><path d="M${p(.65,.4,.3).join(" ")}q8-6 16 0v13q-8-6-16 0Z" fill="#fff" stroke="#4d8b43"/>`;
    if (type === "seedlings") return `${outline}${[.45,.7,.92].map((offset) => `<path d="M${p(offset,.48,.13).join(" ")}v-16" stroke="#4d8b43" stroke-width="2"/><ellipse cx="${p(offset-.08,.4,.3)[0]}" cy="${p(offset-.08,.4,.3)[1]}" rx="7" ry="4" fill="#69a84f" transform="rotate(-22 ${p(offset-.08,.4,.3).join(" ")})"/><ellipse cx="${p(offset+.08,.32,.31)[0]}" cy="${p(offset+.08,.32,.31)[1]}" rx="7" ry="4" fill="#4d8b43" transform="rotate(22 ${p(offset+.08,.32,.31).join(" ")})"/>`).join("")}`;
    if (type === "tools") return `${outline}<polygon points="${pList([[.35,.48,.08],[.72,.25,.08],[1.08,.48,.08],[.72,.7,.08]])}" fill="#b05d35"/><path d="M${p(.58,.47,.24).join(" ")}l24-15M${p(.72,.55,.25).join(" ")}l20-12M${p(.77,.43,.25).join(" ")}l28-15" stroke="#e8b64a" stroke-width="3" stroke-linecap="round"/>`;
    if (type === "signage") return `${outline}<path d="M${p(.72,.52,.05).join(" ")}v-29" stroke="#7f572f" stroke-width="3"/><path d="M${p(.25,.4,.45).join(" ")}h.9v.45h-.9z" fill="#d8753c"/>`;
    return `${soil}`;
  }

  function renderIso() {
    const svg = $("#v2IsoCanvas");
    if (!svg) return;
    const size = gridSize();
    const terrain = [];
    for (let y = 0; y < size.rows; y += 1) for (let x = 0; x < size.cols; x += 1) {
      const fill = (x + y) % 2 ? "#ebdbb8" : "#f2e6c9";
      terrain.push(`<polygon points="${tilePolygon(x, y)}" fill="${fill}" stroke="#d5bf91" stroke-width="1"/>`);
      if ((x + y) % 3 === 0) terrain.push(`<circle cx="${isoPoint(x+.5,y+.55,.02)[0]}" cy="${isoPoint(x+.5,y+.55,.02)[1]}" r="2.5" fill="#a58b62" opacity=".6"/>`);
    }
    const boundary = `<polygon points="${tilePolygon(0,0,.02)} ${tilePolygon(size.cols,0,.02)} ${tilePolygon(size.cols,size.rows,.02)} ${tilePolygon(0,size.rows,.02)}" fill="none" stroke="#4d8b43" stroke-width="4" opacity=".7"/>`;
    const objects = state.components.map((item, index) => {
      let x = Number(item.position?.x); let y = Number(item.position?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) { x = index % size.cols; y = Math.floor(index / size.cols); }
      if (state.rotation === 1) { const swap = x; x = y; y = swap; }
      x = clamp(x, 0, size.cols - 1); y = clamp(y, 0, size.rows - 1);
      const type = HL.COMPONENT_TYPES[item.type];
      const point = isoPoint(x, y, .03);
      const label = `${type.label}, ${formatArea(item.area)} m²`;
      const textX = point[0]; const textY = point[1] - 30;
      const labelMarkup = item.id === state.selectedId ? `<text class="iso-label" x="${textX}" y="${textY}" text-anchor="middle">${escapeHtml(type.short)}</text>` : "";
      return `<g class="iso-hit${item.id === state.selectedId ? " is-selected" : ""}" data-iso-id="${item.id}" tabindex="0" role="button" aria-label="${label}">${artFor(item.type, x, y, item)}${labelMarkup}</g>`;
    }).join("");
    svg.innerHTML = `<title id="v2IsoTitle">Montagem isométrica da horta</title><desc id="v2IsoDesc">${scenario().name}, ${scenario().area} metros quadrados, com ${state.components.length} componentes.</desc><g class="iso-world">${terrain.join("")}${boundary}${objects}</g>`;
    $$("[data-iso-id]", svg).forEach((node) => {
      node.addEventListener("click", () => selectComponent(node.dataset.isoId));
      node.addEventListener("keydown", (event) => {
        if (["Enter", " "].includes(event.key)) { event.preventDefault(); selectComponent(node.dataset.isoId); }
        if (node.dataset.isoId === state.selectedId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); nudgeSelected(event.key); }
      });
    });
  }

  function nudgeSelected(key) {
    const item = selected();
    if (!item) return;
    const size = gridSize();
    const delta = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[key];
    item.position.x = clamp(Number(item.position.x || 0) + delta[0], 0, size.cols - 1);
    item.position.y = clamp(Number(item.position.y || 0) + delta[1], 0, size.rows - 1);
    save(); renderLayout(); announce(`${HL.COMPONENT_TYPES[item.type].label} reposicionado.`);
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
    $("#v2LayoutList").innerHTML = state.components.map((item) => { const type = HL.COMPONENT_TYPES[item.type]; return `<li><button type="button" class="${item.id === state.selectedId ? "is-selected" : ""}" data-v2-layout-select="${item.id}"><span class="v2-component-icon" style="color:${type.color}">${type.icon}</span><span>${type.short}</span><small>${formatArea(item.area)} m²</small></button></li>`; }).join("");
    $("#v2SelectedTitle").textContent = selectedItem ? HL.COMPONENT_TYPES[selectedItem.type].label : "Selecione uma zona";
    $("#v2SelectedHelp").textContent = selectedItem ? "Use as setas do teclado para reposicionar no terreno." : "Clique em um item da cena ou da lista.";
    $("#v2RemoveSelected").disabled = !selectedItem;
    renderIso();
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
    $("#v2Summary").innerHTML = `<div class="v2-summary-hero"><div><strong>${current.area} m² · ${current.name}</strong><span> ${formatArea(total)} m² distribuídos · ${state.components.length} componentes</span></div><span>Uso orientativo, não validação técnica.</span></div>
      <section class="v2-summary-block"><h3>Composição</h3><ul>${Object.entries(grouped).map(([label, value]) => `<li>${escapeHtml(label)} — ${formatArea(value)} m²</li>`).join("")}</ul></section>
      <section class="v2-summary-block"><h3>Atividades</h3>${activityNames.length ? `<ul>${activityNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>` : "<p>Nenhuma atividade selecionada ainda.</p>"}</section>
      <section class="v2-summary-block"><h3>Condições anotadas</h3><p>${escapeHtml(state.essentials.responsibles)} pessoas · água ${escapeHtml(state.essentials.water)} · área disponível ${escapeHtml(state.essentials.availableArea)} m².</p>${state.note ? `<p><strong>Intenção:</strong> ${escapeHtml(state.note)}</p>` : ""}</section>
      <section class="v2-summary-block"><h3>Próximo passo</h3><p>Confirme no local o percurso, a segurança, a água, o solo, o alcance e a rotina de cuidado antes de qualquer implantação.</p></section>`;
  }

  function renderAll() {
    renderProgress(); renderEssentials(); renderScenarios(); renderLibrary(); renderComposition(); renderLayout(); renderActivities(); renderSummary();
  }

  function addComponent(type) {
    const current = scenario();
    const remaining = Math.round((current.area - areaTotal(state.components)) * 10) / 10;
    const item = HL.COMPONENT_TYPES[type];
    if (!item || remaining <= 0) { announce("Não há área livre neste cenário."); return; }
    const area = Math.min(item.defaultArea, remaining);
    const index = state.components.length;
    state.components.push({ id: uid(type), type, area, position: positionFor(index, state.scenarioId) });
    state.selectedId = state.components.at(-1).id;
    save(); renderAll(); announce(`${item.label} adicionado.`);
  }

  function updateArea(id, value) {
    const item = state.components.find((entry) => entry.id === id);
    if (!item) return;
    const current = scenario();
    const other = areaTotal(state.components.filter((entry) => entry.id !== id));
    const max = Math.max(0, Math.round((current.area - other) * 10) / 10);
    item.area = clamp(Math.round((Number(value) || 0) * 10) / 10, 0, max);
    save(); renderAll();
  }

  function removeComponent(id) {
    const item = state.components.find((entry) => entry.id === id);
    state.components = state.components.filter((entry) => entry.id !== id);
    if (state.selectedId === id) state.selectedId = null;
    save(); renderAll(); announce(item ? `${HL.COMPONENT_TYPES[item.type].label} removido.` : "Componente removido.");
  }

  function selectComponent(id) { if (!state.components.some((item) => item.id === id)) return; state.selectedId = id; save(); renderLayout(); }

  function exportPlan() {
    const payload = { app: "HortaLab Escola", version: "2.0.0", exportedAt: new Date().toISOString(), state: clone(state) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "hortalab-plano-v2.json"; link.click(); URL.revokeObjectURL(link.href);
  }

  function reset() {
    if (!window.confirm("Reiniciar a versão enxuta e apagar as escolhas salvas neste navegador?")) return;
    state = defaultState(); save(); renderAll(); announce("Versão enxuta reiniciada.");
  }

  $("#v2Essentials")?.addEventListener("input", (event) => {
    const field = event.target;
    if (field.name) { state.essentials[field.name] = field.type === "number" ? Number(field.value) : field.value; save(); if (state.step === 2) renderScenarios(); }
  });
  $("#v2Scenarios")?.addEventListener("click", (event) => { const button = event.target.closest("[data-v2-scenario]"); if (button) selectScenario(button.dataset.v2Scenario); });
  $("#v2Library")?.addEventListener("click", (event) => { const button = event.target.closest("[data-v2-add]"); if (button) addComponent(button.dataset.v2Add); });
  $("#v2ComponentList")?.addEventListener("click", (event) => { const select = event.target.closest("[data-v2-select]"); const remove = event.target.closest("[data-v2-remove]"); if (select) selectComponent(select.dataset.v2Select); if (remove) removeComponent(remove.dataset.v2Remove); });
  $("#v2ComponentList")?.addEventListener("change", (event) => { if (event.target.matches("[data-v2-area]")) updateArea(event.target.dataset.v2Area, event.target.value); });
  $("#v2LayoutList")?.addEventListener("click", (event) => { const button = event.target.closest("[data-v2-layout-select]"); if (button) selectComponent(button.dataset.v2LayoutSelect); });
  $("#v2LayoutList")?.parentElement?.addEventListener("click", (event) => { const button = event.target.closest("[data-v2-nudge]"); if (button) nudgeSelected(button.dataset.v2Nudge); });
  $("#v2RemoveSelected")?.addEventListener("click", () => { if (state.selectedId) removeComponent(state.selectedId); });
  $("#v2Rotate")?.addEventListener("click", () => { state.rotation = state.rotation ? 0 : 1; save(); renderLayout(); announce("Vista girada."); });
  $("#v2ZoomIn")?.addEventListener("click", () => { state.zoom = clamp(Math.round((state.zoom + .1) * 10) / 10, .85, 1.15); save(); renderIso(); });
  $("#v2ZoomOut")?.addEventListener("click", () => { state.zoom = clamp(Math.round((state.zoom - .1) * 10) / 10, .85, 1.15); save(); renderIso(); });
  $("#v2Activities")?.addEventListener("change", (event) => { if (event.target.matches("input")) { state.activities = $$('input:checked', $("#v2Activities")).map((input) => input.value); save(); } });
  $("#v2Note")?.addEventListener("input", (event) => { state.note = event.target.value.slice(0, 400); save(); });
  $("#v2Print")?.addEventListener("click", () => window.print());
  $("#v2Export")?.addEventListener("click", exportPlan);
  $("#v2ResetTop")?.addEventListener("click", reset); $("#v2ResetBottom")?.addEventListener("click", reset);
  document.addEventListener("click", (event) => {
    const go = event.target.closest("[data-v2-step]");
    if (go && go.dataset.v2Step) setStep(go.dataset.v2Step);
    const next = event.target.closest("[data-v2-next]"); if (next) setStep(state.step + 1);
    const prev = event.target.closest("[data-v2-prev]"); if (prev) setStep(state.step - 1);
  });

  renderAll();
}());
