(function () {
  "use strict";
  const HL = window.HortaLab;
  let draggedId = null;

  function announce(message) {
    const live = document.getElementById("appLive");
    if (!live) return;
    live.textContent = "";
    window.setTimeout(() => { live.textContent = message; }, 20);
  }

  function addComponent(type) {
    const state = HL.getState();
    const scenario = HL.scenarioFor(state);
    const definition = HL.COMPONENT_TYPES[type];
    if (!definition) return;
    const remaining = HL.round1(scenario.area - HL.areaTotal(state.components));
    if (remaining < definition.defaultArea - .01) {
      announce(`Não há ${definition.defaultArea.toFixed(1).replace(".", ",")} m² livres para adicionar ${definition.label}. Reduza ou remova outro componente.`);
      return;
    }
    const item = { id: HL.createId(type), type, area: definition.defaultArea };
    HL.setComponents([...state.components, item], "componentAdded");
    HL.selectComponent(item.id);
    announce(`${definition.label} adicionado com ${definition.defaultArea.toFixed(1).replace(".", ",")} metros quadrados.`);
  }

  function removeSelected() {
    const state = HL.getState();
    const selected = state.components.find((item) => item.id === state.selectedComponentId);
    if (!selected) return;
    HL.setComponents(state.components.filter((item) => item.id !== selected.id), "componentRemoved");
    HL.selectComponent(null);
    announce(`${HL.COMPONENT_TYPES[selected.type].label} removido.`);
  }

  function changeSelectedArea(value) {
    const state = HL.getState();
    const area = HL.round1(Number(value));
    if (!Number.isFinite(area) || area < 0) { announce("Informe uma área igual ou maior que zero."); return; }
    const selected = state.components.find((item) => item.id === state.selectedComponentId);
    if (!selected) return;
    const scenario = HL.scenarioFor(state);
    const otherTotal = HL.round1(HL.areaTotal(state.components) - selected.area);
    if (HL.round1(otherTotal + area) > scenario.area) {
      const available = HL.round1(scenario.area - otherTotal);
      announce(`A área ultrapassaria o cenário. Para este componente, o máximo disponível é ${available.toFixed(1).replace(".", ",")} m².`);
      renderSimulator();
      return;
    }
    const next = state.components.map((item) => item.id === selected.id ? { ...item, area } : item);
    HL.setComponents(next, "componentArea");
    announce(`Área ajustada para ${area.toFixed(1).replace(".", ",")} metros quadrados.`);
  }

  function moveSelected(delta) {
    const state = HL.getState();
    const index = state.components.findIndex((item) => item.id === state.selectedComponentId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= state.components.length) return;
    const next = [...state.components];
    [next[index], next[target]] = [next[target], next[index]];
    HL.setComponents(next, "componentMoved");
    announce(`Componente movido para ${target + 1} de ${next.length}.`);
  }

  function reorder(dragId, targetId) {
    const state = HL.getState();
    const from = state.components.findIndex((item) => item.id === dragId);
    const to = state.components.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...state.components];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    HL.setComponents(next, "componentDragged");
    announce(`Componente movido para ${to + 1} de ${next.length}.`);
  }

  function renderSimulator() {
    const state = HL.getState();
    const scenario = HL.scenarioFor(state);
    const total = HL.areaTotal(state.components);
    const remaining = HL.round1(scenario.area - total);
    const percent = scenario.area ? Math.min(100, (total / scenario.area) * 100) : 0;
    const library = document.getElementById("componentLibrary");
    const grid = document.getElementById("plotGrid");
    if (!library || !grid) return;

    library.innerHTML = Object.entries(HL.COMPONENT_TYPES).map(([id, item]) => `
      <button class="library-item" type="button" data-add-component="${id}" style="--item-color:${item.color};--item-soft:${item.soft}" aria-label="Adicionar ${item.label}, área inicial ${item.defaultArea.toFixed(1).replace(".", ",")} metros quadrados">
        <span class="library-icon">${item.icon}</span><span><strong>${item.label}</strong><small>${item.defaultArea.toFixed(1).replace(".", ",")} m² iniciais</small></span><span class="library-add" aria-hidden="true">+</span>
      </button>`).join("");

    grid.dataset.view = state.plotView;
    grid.innerHTML = state.components.length ? state.components.map((component, index) => {
      const type = HL.COMPONENT_TYPES[component.type];
      const basis = Math.max(20, Math.min(100, (component.area / scenario.area) * 160));
      return `<li class="plot-item${state.selectedComponentId === component.id ? " is-selected" : ""}" draggable="true" data-component-id="${component.id}" style="--item-color:${type.color};--item-soft:${type.soft};--item-basis:${basis}%">
        <strong>${type.label}</strong><span>${component.area.toFixed(1).replace(".", ",")} m² · posição ${index + 1}</span>
        <button type="button" data-select-component="${component.id}" aria-label="Selecionar ${type.label}, ${component.area.toFixed(1).replace(".", ",")} metros quadrados, posição ${index + 1}"></button>
      </li>`;
    }).join("") : '<li class="plot-empty">O mapa está vazio. Adicione um componente pela biblioteca.</li>';

    document.getElementById("plotScenario").textContent = `${scenario.area} m² — ${scenario.name}`;
    document.getElementById("plotAreaText").textContent = `${total.toFixed(1).replace(".", ",")} de ${scenario.area.toFixed(1).replace(".", ",")} m² utilizados`;
    const meter = document.querySelector(".area-meter");
    const fill = document.getElementById("areaMeterFill");
    fill.style.width = `${percent}%`;
    meter.classList.toggle("is-full", Math.abs(remaining) < .01);
    meter.classList.toggle("is-over", remaining < 0);
    const message = document.getElementById("areaMessage");
    message.classList.toggle("is-warning", remaining <= 0);
    message.textContent = remaining > 0 ? `${remaining.toFixed(1).replace(".", ",")} m² permanecem livres. Espaço livre também pode apoiar segurança e adaptação.` : "A área está totalmente distribuída. Para adicionar algo, reduza ou remova outro componente.";

    document.querySelectorAll("[data-plot-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.plotView === state.plotView));
    const selected = state.components.find((item) => item.id === state.selectedComponentId);
    const editor = document.getElementById("componentEditor");
    editor.hidden = !selected;
    if (selected) {
      const index = state.components.indexOf(selected);
      document.getElementById("editorTitle").textContent = HL.COMPONENT_TYPES[selected.type].label;
      document.getElementById("editorHelp").textContent = `Posição ${index + 1} de ${state.components.length}. ${HL.COMPONENT_TYPES[selected.type].resource}.`;
      const input = document.getElementById("componentAreaInput");
      input.value = selected.area.toFixed(1);
      input.max = HL.round1(scenario.area - total + selected.area);
      document.getElementById("moveEarlier").disabled = index === 0;
      document.getElementById("moveLater").disabled = index === state.components.length - 1;
    }
  }

  function bindSimulator() {
    document.getElementById("componentLibrary")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-add-component]");
      if (button) addComponent(button.dataset.addComponent);
    });
    const grid = document.getElementById("plotGrid");
    grid?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-select-component]");
      if (button) HL.selectComponent(button.dataset.selectComponent);
    });
    grid?.addEventListener("dragstart", (event) => {
      const item = event.target.closest("[data-component-id]");
      if (!item) return;
      draggedId = item.dataset.componentId;
      item.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedId);
    });
    grid?.addEventListener("dragend", (event) => { event.target.closest("[data-component-id]")?.classList.remove("is-dragging"); draggedId = null; });
    grid?.addEventListener("dragover", (event) => { if (event.target.closest("[data-component-id]")) event.preventDefault(); });
    grid?.addEventListener("drop", (event) => {
      const target = event.target.closest("[data-component-id]");
      if (!target) return;
      event.preventDefault();
      reorder(draggedId || event.dataTransfer.getData("text/plain"), target.dataset.componentId);
    });
    document.getElementById("componentAreaInput")?.addEventListener("change", (event) => changeSelectedArea(event.target.value));
    document.getElementById("moveEarlier")?.addEventListener("click", () => moveSelected(-1));
    document.getElementById("moveLater")?.addEventListener("click", () => moveSelected(1));
    document.getElementById("removeComponent")?.addEventListener("click", removeSelected);
    document.querySelector(".view-switch")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-plot-view]");
      if (button) HL.setPlotView(button.dataset.plotView);
    });
  }

  Object.assign(HL, { announce, addComponent, changeSelectedArea, moveSelected, renderSimulator, bindSimulator });
}());
