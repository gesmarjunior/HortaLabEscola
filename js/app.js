(function () {
  "use strict";
  const HL = window.HortaLab;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  const labels = {
    purpose: { learning: "Aprendizagem interdisciplinar", environment: "Educação ambiental", food: "Educação alimentar", community: "Mobilização comunitária", experiment: "Projeto-piloto" },
    areaShape: { rectangular: "Retangular", square: "Quadrado", narrow: "Comprido ou estreito", fragmented: "Fragmentado", containers: "Somente recipientes" },
    sunlight: { high: "Mais de 6 horas", medium: "Entre 4 e 6 horas", low: "Menos de 4 horas", unknown: "Ainda não observada" },
    water: { regular: "Regular e próxima", limited: "Limitada ou distante", seasonal: "Sazonal", unknown: "Precisa ser confirmada" },
    soil: { known: "Observado e aparentemente adequado", containers: "Substrato em recipientes", poor: "Compactado, encharcado ou degradado", unknown: "Ainda não avaliado" },
    vacation: { covered: "Responsáveis e substitutos definidos", partial: "Cobertura parcial", none: "Sem plano de continuidade" },
    budget: { none: "Sem orçamento definido", low: "Até R$ 300", medium: "R$ 301 a R$ 1.000", high: "Acima de R$ 1.000" },
    tools: { enough: "Conjunto básico disponível", partial: "Algumas ferramentas", none: "Ainda não há ferramentas" },
    accessibility: { required: "Adaptações necessárias", desirable: "Desejável ampliar participação", notIdentified: "Não identificada até o momento", unknown: "Precisa ser confirmada" },
    experience: { none: "Nenhuma", some: "Experiência pontual", ongoing: "Projeto anterior ou em andamento" }
  };

  function labelFor(group, value, fallback = "Não informado") { return labels[group]?.[value] || fallback; }
  function unique(items) { return Array.from(new Set(items.filter(Boolean))); }
  function formatArea(value) { return `${Number(value || 0).toFixed(1).replace(".", ",")} m²`; }
  function formatDate(iso = new Date().toISOString()) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(iso)); }

  function collectDiagnosis() {
    const form = $("#diagnosisForm");
    const data = new FormData(form);
    const patch = {};
    ["purpose", "availableArea", "areaShape", "sunlight", "water", "soil", "responsibles", "vacation", "budget", "tools", "accessibility", "experience"].forEach((key) => { patch[key] = String(data.get(key) || ""); });
    patch.curricular = data.getAll("curricular").map(String);
    patch.limitations = data.getAll("limitations").map(String);
    HL.updateDiagnosis(patch);
  }

  function hydrateDiagnosis(state) {
    const form = $("#diagnosisForm");
    Object.entries(state.diagnosis).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        $$(`[name="${key}"]`, form).forEach((input) => { input.checked = value.includes(input.value); });
      } else {
        const input = form.elements.namedItem(key);
        if (input && "value" in input) input.value = value;
      }
    });
  }

  function scenarioAdvice(state, scenario) {
    const area = Number(state.diagnosis.availableArea) || 0;
    const team = Number(state.diagnosis.responsibles) || 0;
    const reasons = [];
    if (area && area < scenario.area) reasons.push(`a área informada (${formatArea(area)}) é menor que o cenário`);
    if (scenario.area === 50 && team < 3) reasons.push("uma escala ampliada tende a exigir ao menos três responsáveis ativos");
    if (scenario.area >= 25 && state.diagnosis.water && state.diagnosis.water !== "regular") reasons.push("a água não foi indicada como regular e próxima");
    if (scenario.area === 50 && state.diagnosis.vacation !== "covered") reasons.push("a continuidade nas férias ainda não está assegurada");
    if (reasons.length) return `<strong>Revise antes de assumir esta escala:</strong> ${HL.escapeHTML(reasons.join("; "))}. Você pode continuar para explorar o cenário e depois reduzir.`;
    return `<strong>Hipótese compatível com os dados informados até aqui.</strong> A escolha ainda precisa ser validada no local e pode ser reduzida durante o planejamento.`;
  }

  function renderScenarios(state) {
    const container = $("#scenarioCards");
    container.innerHTML = HL.SCENARIOS.map((scenario) => `
      <label class="scenario-card${state.scenarioId === scenario.id ? " is-selected" : ""}">
        <input type="radio" name="scenario" value="${scenario.id}" ${state.scenarioId === scenario.id ? "checked" : ""}>
        <header><div><div class="scenario-area">${scenario.area} <small>m²</small></div><div class="scenario-name">${scenario.name}</div></div><span class="selection-dot" aria-hidden="true"></span></header>
        <div class="scenario-sketch" aria-hidden="true">${Array.from({ length: scenario.area === 12 ? 10 : scenario.area === 25 ? 15 : 20 }, () => "<span></span>").join("")}</div>
        <div><p>${scenario.summary}</p><ul>${scenario.notes.map((note) => `<li>${note}</li>`).join("")}</ul></div>
        <footer>${scenario.bestFor}</footer>
      </label>`).join("");
    $("#scenarioAdvice").innerHTML = scenarioAdvice(state, HL.scenarioFor(state));
  }

  function renderActivities(state) {
    const curricular = new Set(state.diagnosis.curricular || []);
    $("#activityGroups").innerHTML = HL.ACTIVITIES.map((group, index) => `
      <section class="activity-group"><details ${curricular.has(group.id) || index < 2 ? "open" : ""}>
        <summary>${group.name}<span>${group.description}</span></summary>
        <div class="activity-options">${group.options.map(([id, title, description]) => `<label class="activity-option"><input type="checkbox" value="${id}" ${state.activities.includes(id) ? "checked" : ""}><span><strong>${title}</strong><small>${description}</small></span></label>`).join("")}</div>
      </details></section>`).join("");
    const note = $("#pedagogyNote");
    if (note.value !== state.pedagogyNote) note.value = state.pedagogyNote;
    $("#pedagogyCount").textContent = state.pedagogyNote.length;
    $("#selectedActivitiesSummary").textContent = state.activities.length ? `${state.activities.length} atividade(s) selecionada(s). Elas serão incluídas no plano final.` : "Nenhuma atividade selecionada ainda.";
  }

  function renderEvents(state) {
    $("#eventList").innerHTML = HL.EVENTS.map((event, index) => {
      const selectedId = state.eventDecisions[event.id];
      const selected = event.options.find((option) => option.id === selectedId);
      return `<article class="event-card"><header><span class="event-number">${String(index + 1).padStart(2, "0")}</span><div><h3>${event.title}</h3><p>${event.problem}</p></div></header>
        <div class="event-options" role="radiogroup" aria-label="Decisão para ${event.title}">${event.options.map((option) => `<label><input type="radio" name="event-${event.id}" value="${option.id}" ${selectedId === option.id ? "checked" : ""}><span>${option.label}</span></label>`).join("")}</div>
        <div class="event-feedback" ${selected ? "" : "hidden"}><strong>Consequência:</strong> ${selected ? selected.feedback : ""}</div></article>`;
    }).join("");
  }

  function activityIndex() {
    const map = {};
    HL.ACTIVITIES.forEach((group) => group.options.forEach(([id, title, description]) => { map[id] = { group: group.name, title, description }; }));
    return map;
  }

  function renderFinalPlan(state, evaluation) {
    const d = state.diagnosis;
    const scenario = evaluation.scenario;
    const activities = activityIndex();
    const chosenActivities = state.activities.map((id) => activities[id]).filter(Boolean);
    const eventRows = HL.EVENTS.map((event) => {
      const option = event.options.find((item) => item.id === state.eventDecisions[event.id]);
      return option ? [event.title, option.label, option.feedback] : null;
    }).filter(Boolean);
    const risks = unique(Object.values(evaluation.dimensions).flatMap((item) => item.risks));
    const recommendations = unique(Object.values(evaluation.dimensions).flatMap((item) => item.improvements));
    const confirmations = unique(Object.values(evaluation.dimensions).flatMap((item) => item.confirmations));
    const resources = unique(state.components.map((item) => HL.COMPONENT_TYPES[item.type]?.resource));
    const curricularNames = (d.curricular || []).map((id) => HL.CURRICULAR[id]).filter(Boolean);
    const limitationNames = (d.limitations || []).map((id) => HL.LIMITATION_LABELS[id]).filter(Boolean);
    const minResponsibles = scenario.area === 50 ? "3 ou mais pessoas, com substitutos" : scenario.area === 25 ? "2 a 3 pessoas, com substitutos" : "Pelo menos 2 pessoas, com substituição prevista";
    const scoreSummary = Object.values(evaluation.dimensions).map((item) => `${item.label}: ${item.score}/100 (${item.statusLabel})`).join("; ");

    $("#finalPlan").innerHTML = `
      <header class="plan-cover"><div><h3>Plano HortaLab Escola</h3><p>Documento de apoio à conversa e à verificação local. Não representa autorização, certificação ou garantia de resultados.</p></div><span class="plan-date">Gerado em ${formatDate()}</span></header>
      <div class="plan-body">
        <div class="plan-summary-grid"><div><strong>${scenario.area} m²</strong><span>${scenario.name}</span></div><div><strong>${formatArea(evaluation.totalArea)}</strong><span>área distribuída</span></div><div><strong>${state.activities.length}</strong><span>atividades pedagógicas</span></div></div>

        <section class="plan-section"><h3>1. Diagnóstico resumido</h3><div class="table-scroll"><table class="plan-table"><tbody>
          <tr><th>Finalidade</th><td>${HL.escapeHTML(labelFor("purpose", d.purpose))}</td><th>Área informada</th><td>${d.availableArea ? formatArea(d.availableArea) : "Não informada"}</td></tr>
          <tr><th>Formato</th><td>${HL.escapeHTML(labelFor("areaShape", d.areaShape))}</td><th>Insolação</th><td>${HL.escapeHTML(labelFor("sunlight", d.sunlight))}</td></tr>
          <tr><th>Água</th><td>${HL.escapeHTML(labelFor("water", d.water))}</td><th>Solo</th><td>${HL.escapeHTML(labelFor("soil", d.soil))}</td></tr>
          <tr><th>Equipe informada</th><td>${HL.escapeHTML(d.responsibles || "Não informada")}</td><th>Férias</th><td>${HL.escapeHTML(labelFor("vacation", d.vacation))}</td></tr>
          <tr><th>Orçamento</th><td>${HL.escapeHTML(labelFor("budget", d.budget))}</td><th>Ferramentas</th><td>${HL.escapeHTML(labelFor("tools", d.tools))}</td></tr>
          <tr><th>Acessibilidade</th><td colspan="3">${HL.escapeHTML(labelFor("accessibility", d.accessibility))}</td></tr>
        </tbody></table></div><p><strong>Componentes curriculares:</strong> ${HL.escapeHTML(curricularNames.join(", ") || "não informados")}.</p><p><strong>Limitações declaradas:</strong> ${HL.escapeHTML(limitationNames.join(", ") || "nenhuma selecionada")}.</p></section>

        <section class="plan-section"><h3>2. Cenário e composição</h3><p><strong>${scenario.area} m² — ${scenario.name}.</strong> ${scenario.summary} A área produtiva não precisa ocupar todo o espaço disponível.</p><div class="table-scroll"><table class="plan-table"><thead><tr><th>Componente</th><th>Área</th><th>Participação no cenário</th></tr></thead><tbody>${state.components.map((item) => `<tr><td>${HL.COMPONENT_TYPES[item.type].label}</td><td>${formatArea(item.area)}</td><td>${((item.area / scenario.area) * 100).toFixed(1).replace(".", ",")}%</td></tr>`).join("")}<tr><th>Total distribuído</th><th>${formatArea(evaluation.totalArea)}</th><th>${((evaluation.totalArea / scenario.area) * 100).toFixed(1).replace(".", ",")}%</th></tr></tbody></table></div></section>

        <section class="plan-section"><h3>3. Planejamento pedagógico</h3><p>${state.pedagogyNote ? HL.escapeHTML(state.pedagogyNote) : "A intenção pedagógica ainda precisa ser descrita."}</p>${chosenActivities.length ? `<ul>${chosenActivities.map((item) => `<li><strong>${item.group} — ${item.title}:</strong> ${item.description}</li>`).join("")}</ul>` : "<p>Nenhuma atividade foi selecionada.</p>"}</section>

        <section class="plan-section"><h3>4. Responsabilidades e calendário sugerido</h3><p><strong>Equipe necessária para esta hipótese:</strong> ${minResponsibles}. A confirmação depende das rotinas reais da escola.</p><table class="plan-table"><thead><tr><th>Momento</th><th>Ação sugerida</th></tr></thead><tbody><tr><td>Semanas 1–2</td><td>Validar área, água, insolação, solo, acessibilidade, segurança e autorizações.</td></tr><tr><td>Semanas 3–4</td><td>Confirmar responsáveis, orçamento, ferramentas, circulação e critérios de pausa.</td></tr><tr><td>Primeiro ciclo</td><td>Implantar uma etapa manejável e iniciar registros pedagógicos.</td></tr><tr><td>Quinzenalmente</td><td>Revisar observações, tarefas, riscos e necessidade de reduzir ou ampliar.</td></tr><tr><td>Antes de recessos</td><td>Ativar escala de continuidade ou reduzir temporariamente a demanda.</td></tr></tbody></table></section>

        <section class="plan-section"><h3>5. Recursos previstos</h3><ul>${resources.map((item) => `<li>${HL.escapeHTML(item)}</li>`).join("")}</ul></section>

        <section class="plan-section"><h3>6. Eventos e decisões</h3>${eventRows.length ? `<div class="table-scroll"><table class="plan-table"><thead><tr><th>Evento</th><th>Decisão</th><th>Consequência educativa</th></tr></thead><tbody>${eventRows.map((row) => `<tr>${row.map((cell) => `<td>${HL.escapeHTML(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "<p>Nenhum evento foi respondido. Teste os desafios para revisar a continuidade do plano.</p>"}</section>

        <section class="plan-section"><h3>7. Viabilidade orientativa</h3><p>${HL.escapeHTML(scoreSummary)}.</p><p>Os valores resultam de regras fixas do simulador e servem para discussão, não para previsão científica.</p></section>

        <section class="plan-section"><h3>8. Riscos, recomendações e próximos passos</h3><h4>Riscos identificados</h4><ul>${(risks.length ? risks : ["Nenhum risco adicional foi sinalizado pelas respostas atuais; a verificação local permanece necessária."]).map((item) => `<li>${HL.escapeHTML(item)}</li>`).join("")}</ul><h4>Recomendações</h4><ul>${(recommendations.length ? recommendations : ["Manter registros e revisar o plano coletivamente."]).map((item) => `<li>${HL.escapeHTML(item)}</li>`).join("")}</ul><h4>Confirmar no local</h4><ul>${confirmations.map((item) => `<li>${HL.escapeHTML(item)}</li>`).join("")}</ul></section>

        <section class="plan-section"><h3>9. Referências essenciais</h3><ul><li>THIOLLENT, Michel. <em>Metodologia da pesquisa-ação</em>. São Paulo: Cortez, 2011.</li><li>TRIPP, David. Pesquisa-ação: uma introdução metodológica. <em>Educação e Pesquisa</em>, v. 31, n. 3, p. 443–466, 2005.</li><li>BARBIER, René. <em>A pesquisa-ação</em>. Brasília: Liber Livro, 2004.</li><li>CARR, Wilfred; KEMMIS, Stephen. <em>Becoming critical: education, knowledge and action research</em>. London: Falmer Press, 1986.</li><li>FAO. <em>Setting up and running a school garden: a manual for teachers, parents and communities</em>. 2005.</li><li>EMBRAPA. <em>Como plantar hortaliças</em>. 2006.</li></ul></section>

        <div class="plan-alert"><strong>Alerta de uso responsável:</strong> este plano não substitui avaliação agronômica, nutricional, sanitária, de acessibilidade ou de segurança, nem as normas e autorizações locais.</div>
      </div>`;
  }

  function renderProgress(state) {
    $$("#progressList button").forEach((button) => {
      const step = Number(button.dataset.goStep);
      if (step === state.currentStep) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
      button.classList.toggle("is-complete", state.completedSteps.includes(step));
    });
    $$(".step-panel").forEach((panel) => { panel.hidden = Number(panel.dataset.step) !== state.currentStep; });
  }

  function renderAll(state, reason) {
    renderProgress(state);
    renderScenarios(state);
    HL.renderSimulator();
    renderActivities(state);
    renderEvents(state);
    const evaluation = HL.evaluatePlan(state);
    HL.renderViability($("#viabilityDashboard"), evaluation);
    renderFinalPlan(state, evaluation);
    const saved = HL.saveLocal(state);
    $("#saveStatus").textContent = saved.ok ? `Salvo neste dispositivo · ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date())}` : saved.error;
    if (["step", "replace", "reset"].includes(reason)) {
      window.requestAnimationFrame(() => {
        const heading = $(`.step-panel[data-step="${state.currentStep}"] h2`);
        heading?.setAttribute("tabindex", "-1");
        heading?.focus({ preventScroll: true });
        document.getElementById("planejador")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      });
    }
  }

  function changeStep(delta) {
    const state = HL.getState();
    if (delta > 0 && state.currentStep === 2) {
      const form = $("#diagnosisForm");
      if (!form.checkValidity()) { form.reportValidity(); $(":invalid", form)?.focus(); return; }
    }
    HL.setStep(state.currentStep + delta);
  }

  function handleImport(file) {
    HL.importJSONFile(file).then((state) => {
      HL.replaceState(state);
      hydrateDiagnosis(state);
      HL.announce("Plano importado e validado com sucesso.");
    }).catch((error) => HL.announce(error.message || "Não foi possível importar o plano."));
  }

  function bindEvents() {
    $("#diagnosisForm")?.addEventListener("change", collectDiagnosis);
    $("#diagnosisForm")?.addEventListener("input", (event) => {
      if (event.target.matches('input[type="number"]')) collectDiagnosis();
    });
    $("#scenarioCards")?.addEventListener("change", (event) => {
      if (event.target.name === "scenario") { HL.chooseScenario(event.target.value, true); HL.announce(`Cenário ${HL.scenarioFor(HL.getState()).name} selecionado e composição inicial carregada.`); }
    });
    $("#activityGroups")?.addEventListener("change", (event) => { if (event.target.type === "checkbox") HL.toggleActivity(event.target.value, event.target.checked); });
    $("#pedagogyNote")?.addEventListener("input", (event) => HL.setPedagogyNote(event.target.value));
    $("#eventList")?.addEventListener("change", (event) => {
      if (!event.target.name?.startsWith("event-")) return;
      const eventId = event.target.name.replace("event-", "");
      HL.decideEvent(eventId, event.target.value);
      const definition = HL.EVENTS.find((item) => item.id === eventId);
      const option = definition?.options.find((item) => item.id === event.target.value);
      if (option) HL.announce(`${definition.title}: ${option.feedback}`);
    });
    document.addEventListener("click", (event) => {
      const next = event.target.closest("[data-next-step]");
      const prev = event.target.closest("[data-prev-step]");
      const go = event.target.closest("[data-go-step]");
      if (next) changeStep(1);
      if (prev) changeStep(-1);
      if (go) HL.setStep(Number(go.dataset.goStep));
    });
    $("#heroStart")?.addEventListener("click", () => HL.setStep(1));
    $("#printPlan")?.addEventListener("click", () => window.print());
    $("#exportPlan")?.addEventListener("click", () => HL.downloadJSON(HL.getState()));
    [$("#importPlan"), $("#openImport")].forEach((button) => button?.addEventListener("click", () => $("#importFile").click()));
    $("#importFile")?.addEventListener("change", (event) => { handleImport(event.target.files?.[0]); event.target.value = ""; });
    $("#resetPlan")?.addEventListener("click", () => {
      const dialog = $("#confirmDialog");
      if (typeof dialog.showModal === "function") dialog.showModal(); else if (window.confirm("Reiniciar e apagar o plano salvo?")) { HL.clearLocal(); HL.reset(); hydrateDiagnosis(HL.getState()); }
    });
    $("#confirmDialog")?.addEventListener("close", (event) => {
      if (event.target.returnValue === "confirm") { HL.clearLocal(); HL.reset(); hydrateDiagnosis(HL.getState()); HL.announce("Planejamento reiniciado."); }
    });
    HL.bindSimulator();
  }

  function init() {
    HL.renderRules($("#rulesExplanation"));
    bindEvents();
    HL.subscribe(renderAll);
    const loaded = HL.loadLocal();
    if (loaded.ok && loaded.state) HL.replaceState(loaded.state);
    else {
      hydrateDiagnosis(HL.getState());
      renderAll(HL.getState(), "init");
      if (!loaded.ok) HL.announce(loaded.error);
    }
    hydrateDiagnosis(HL.getState());
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
}());
