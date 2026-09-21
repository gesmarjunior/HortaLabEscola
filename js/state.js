(function () {
  "use strict";
  const HL = window.HortaLab;
  const listeners = new Set();
  let idCounter = 0;

  const createId = (prefix = "item") => `${prefix}-${Date.now().toString(36)}-${(++idCounter).toString(36)}`;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function componentsForScenario(scenarioId) {
    const scenario = HL.SCENARIOS.find((item) => item.id === scenarioId) || HL.SCENARIOS[0];
    return scenario.seed.map(([type, area]) => ({ id: createId(type), type, area }));
  }

  function defaultState() {
    return {
      schemaVersion: 1,
      appVersion: HL.APP_VERSION,
      updatedAt: new Date().toISOString(),
      currentStep: 1,
      completedSteps: [],
      diagnosis: {
        purpose: "", availableArea: "", areaShape: "", sunlight: "", water: "", soil: "",
        responsibles: "", vacation: "", budget: "", tools: "", accessibility: "", experience: "",
        curricular: [], limitations: []
      },
      scenarioId: "micro",
      components: componentsForScenario("micro"),
      selectedComponentId: null,
      plotView: "map",
      activities: [],
      pedagogyNote: "",
      eventDecisions: {},
      importedAt: null
    };
  }

  let state = defaultState();

  function emit(reason) {
    state.updatedAt = new Date().toISOString();
    listeners.forEach((listener) => listener(state, reason));
  }

  function getState() { return state; }
  function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }

  function setStep(step) {
    const next = Math.max(1, Math.min(9, Number(step) || 1));
    if (next > state.currentStep && !state.completedSteps.includes(state.currentStep)) {
      state.completedSteps.push(state.currentStep);
    }
    state.currentStep = next;
    emit("step");
  }

  function updateDiagnosis(patch) {
    state.diagnosis = { ...state.diagnosis, ...patch };
    emit("diagnosis");
  }

  function chooseScenario(scenarioId, resetComponents = true) {
    if (!HL.SCENARIOS.some((item) => item.id === scenarioId)) return;
    state.scenarioId = scenarioId;
    if (resetComponents) state.components = componentsForScenario(scenarioId);
    state.selectedComponentId = null;
    emit("scenario");
  }

  function setComponents(components, reason = "components") {
    state.components = components;
    emit(reason);
  }

  function selectComponent(id) {
    state.selectedComponentId = id;
    emit("selection");
  }

  function setPlotView(view) {
    state.plotView = view === "list" ? "list" : "map";
    emit("plotView");
  }

  function toggleActivity(id, checked) {
    const selected = new Set(state.activities);
    if (checked) selected.add(id); else selected.delete(id);
    state.activities = Array.from(selected);
    emit("activities");
  }

  function setPedagogyNote(value) {
    state.pedagogyNote = String(value || "").slice(0, 600);
    emit("pedagogyNote");
  }

  function decideEvent(eventId, optionId) {
    state.eventDecisions[eventId] = optionId;
    emit("events");
  }

  function replaceState(nextState) {
    state = clone(nextState);
    state.currentStep = Math.max(1, Math.min(9, Number(state.currentStep) || 1));
    state.selectedComponentId = null;
    emit("replace");
  }

  function reset() {
    state = defaultState();
    emit("reset");
  }

  Object.assign(HL, {
    createId, clone, defaultState, getState, subscribe, setStep, updateDiagnosis, chooseScenario,
    setComponents, selectComponent, setPlotView, toggleActivity, setPedagogyNote, decideEvent,
    replaceState, reset
  });
}());
