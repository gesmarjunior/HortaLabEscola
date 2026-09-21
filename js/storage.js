(function () {
  "use strict";
  const HL = window.HortaLab;
  const STORAGE_KEY = "hortalab-escola:plan:v1";

  function validateAndNormalize(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("O arquivo não contém um plano válido.");
    if (Number(input.schemaVersion) !== 1) throw new Error("Versão de arquivo incompatível.");
    const base = HL.defaultState();
    const scenario = HL.SCENARIOS.find((item) => item.id === input.scenarioId);
    if (!scenario) throw new Error("O cenário informado não é reconhecido.");

    const diagnosis = { ...base.diagnosis };
    Object.keys(diagnosis).forEach((key) => {
      if (key === "curricular" || key === "limitations") return;
      const value = input.diagnosis?.[key];
      if (typeof value === "string" || typeof value === "number") diagnosis[key] = String(value).slice(0, 120);
    });
    const curricularAllowed = new Set(Object.keys(HL.CURRICULAR));
    const limitationAllowed = new Set(Object.keys(HL.LIMITATION_LABELS));
    diagnosis.curricular = Array.isArray(input.diagnosis?.curricular) ? input.diagnosis.curricular.filter((value) => curricularAllowed.has(value)).slice(0, 20) : [];
    diagnosis.limitations = Array.isArray(input.diagnosis?.limitations) ? input.diagnosis.limitations.filter((value) => limitationAllowed.has(value)).slice(0, 20) : [];

    if (!Array.isArray(input.components) || input.components.length > 100) throw new Error("A composição do plano é inválida.");
    const components = input.components.map((item, index) => {
      if (!item || !HL.COMPONENT_TYPES[item.type]) throw new Error(`Componente inválido na posição ${index + 1}.`);
      const area = Number(item.area);
      if (!Number.isFinite(area) || area < 0 || area > scenario.area) throw new Error(`Área inválida no componente ${index + 1}.`);
      return { id: HL.createId(item.type), type: item.type, area: HL.round1(area) };
    });
    if (HL.areaTotal(components) > scenario.area + .01) throw new Error("A composição ultrapassa a área do cenário.");

    const activityAllowed = new Set(HL.ACTIVITIES.flatMap((group) => group.options.map((option) => option[0])));
    const activities = Array.isArray(input.activities) ? input.activities.filter((id) => activityAllowed.has(id)).slice(0, 50) : [];
    const eventDecisions = {};
    HL.EVENTS.forEach((event) => {
      const option = input.eventDecisions?.[event.id];
      if (event.options.some((item) => item.id === option)) eventDecisions[event.id] = option;
    });

    return {
      ...base,
      appVersion: HL.APP_VERSION,
      updatedAt: new Date().toISOString(),
      importedAt: new Date().toISOString(),
      currentStep: Math.max(1, Math.min(9, Number(input.currentStep) || 1)),
      completedSteps: Array.isArray(input.completedSteps) ? input.completedSteps.map(Number).filter((n) => n >= 1 && n <= 9) : [],
      diagnosis,
      scenarioId: scenario.id,
      components,
      plotView: input.plotView === "list" ? "list" : "map",
      activities,
      pedagogyNote: typeof input.pedagogyNote === "string" ? input.pedagogyNote.slice(0, 600) : "",
      eventDecisions
    };
  }

  function saveLocal(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: "O navegador não permitiu salvar localmente. Exporte o JSON para preservar o plano." };
    }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ok: true, state: null };
      return { ok: true, state: validateAndNormalize(JSON.parse(raw)) };
    } catch (error) {
      return { ok: false, state: null, error: "O plano salvo neste navegador não pôde ser lido e foi ignorado." };
    }
  }

  function clearLocal() {
    try { localStorage.removeItem(STORAGE_KEY); return { ok: true }; }
    catch (error) { return { ok: false, error: "Não foi possível limpar o armazenamento local." }; }
  }

  Object.assign(HL, { STORAGE_KEY, validateAndNormalize, saveLocal, loadLocal, clearLocal });
}());
