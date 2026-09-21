(function () {
  "use strict";
  const HL = window.HortaLab;
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
  const round1 = (value) => Math.round((Number(value) + Number.EPSILON) * 10) / 10;
  const areaTotal = (components) => round1((components || []).reduce((sum, item) => sum + (Number(item.area) || 0), 0));
  const areaByType = (components, type) => round1((components || []).filter((item) => item.type === type).reduce((sum, item) => sum + (Number(item.area) || 0), 0));
  const scenarioFor = (state) => HL.SCENARIOS.find((item) => item.id === state.scenarioId) || HL.SCENARIOS[0];

  const RULE_DESCRIPTIONS = [
    ["Ambiental", "Água regular", "+12", "Água limitada, sazonal ou não confirmada reduz o indicador."],
    ["Ambiental", "Solo ou substrato conhecido", "+6 a +8", "Condição degradada ou desconhecida exige confirmação."],
    ["Ambiental", "Compostagem com equipe", "+7", "Sem responsáveis suficientes, a compostagem gera risco em vez de bônus."],
    ["Social", "Circulação e manobra", "+12", "Quando há necessidade de acessibilidade, ao menos 20% da área deve apoiar deslocamento; o valor ainda precisa ser validado no local."],
    ["Social", "Participação e espaço educativo", "+4 a +6", "Área pedagógica, observação e finalidade comunitária ampliam participação."],
    ["Governança", "Responsáveis definidos", "-12 a +12", "O efeito varia de nenhuma pessoa a três ou mais responsáveis."],
    ["Governança", "Plano para férias", "-10 a +12", "Cobertura parcial ajuda pouco; responsáveis e substitutos definidos fortalecem continuidade."],
    ["Pedagógica", "Atividades selecionadas", "+4 a +18", "O ganho cresce com atividades variadas e registradas."],
    ["Pedagógica", "Intenção pedagógica registrada", "+8", "Um registro com pelo menos 40 caracteres ajuda a explicitar propósito e evidência."],
    ["Todas", "Decisões diante de eventos", "-18 a +12", "Cada opção possui impacto fixo e visível; não há sorteio."]
  ];

  function choiceImpact(state, dimension) {
    let value = 0;
    HL.EVENTS.forEach((event) => {
      const selected = state.eventDecisions?.[event.id];
      const option = event.options.find((item) => item.id === selected);
      value += option?.impact?.[dimension] || 0;
    });
    return value;
  }

  function statusFor(score) {
    if (score >= 70) return { statusLabel: "Base consistente", tone: "positive" };
    if (score >= 45) return { statusLabel: "Em construção", tone: "moderate" };
    return { statusLabel: "Atenção prioritária", tone: "attention" };
  }

  function evaluatePlan(state) {
    const d = state.diagnosis || {};
    const scenario = scenarioFor(state);
    const total = areaTotal(state.components);
    const paths = areaByType(state.components, "paths") + areaByType(state.components, "maneuver");
    const compost = areaByType(state.components, "compost");
    const pedagogyArea = areaByType(state.components, "pedagogy");
    const observationArea = areaByType(state.components, "observation");
    const waterArea = areaByType(state.components, "water");
    const responsibleCount = Number(d.responsibles) || 0;
    const curricularCount = Array.isArray(d.curricular) ? d.curricular.length : 0;
    const activityCount = Array.isArray(state.activities) ? state.activities.length : 0;
    const eventCount = Object.keys(state.eventDecisions || {}).length;

    const dimensions = {
      environmental: { key: "environmental", label: "Ambiental", score: 35, color: "#4D8B43", contributions: [], risks: [], improvements: [], confirmations: [] },
      social: { key: "social", label: "Social", score: 35, color: "#327FAF", contributions: [], risks: [], improvements: [], confirmations: [] },
      governance: { key: "governance", label: "Governança", score: 35, color: "#C76A36", contributions: [], risks: [], improvements: [], confirmations: [] },
      pedagogical: { key: "pedagogical", label: "Pedagógica", score: 35, color: "#8A669F", contributions: [], risks: [], improvements: [], confirmations: [] }
    };
    const e = dimensions.environmental;
    const s = dimensions.social;
    const g = dimensions.governance;
    const p = dimensions.pedagogical;

    if (d.water === "regular") { e.score += 12; e.contributions.push("Fonte de água indicada como regular e próxima."); }
    else if (d.water === "limited") { e.score -= 3; e.risks.push("Água limitada ou distante pode tornar a escala difícil de manter."); e.improvements.push("Reduzir a demanda e confirmar uma rotina de irrigação."); }
    else if (d.water === "seasonal") { e.score -= 5; e.risks.push("A disponibilidade sazonal de água pode interromper o cuidado."); e.improvements.push("Planejar ciclos compatíveis e alternativas seguras para períodos secos."); }
    else { e.score -= 8; e.risks.push("A disponibilidade de água ainda não foi confirmada."); e.improvements.push("Verificar fonte, distância, segurança e responsável antes da implantação."); }

    if (d.sunlight === "high") { e.score += 10; e.contributions.push("Insolação informada acima de seis horas."); }
    else if (d.sunlight === "medium") { e.score += 7; e.contributions.push("Insolação entre quatro e seis horas foi considerada."); }
    else if (d.sunlight === "low") { e.score -= 6; e.risks.push("Menos de quatro horas de sol limita escolhas de cultivo."); }
    else { e.score -= 5; e.risks.push("A insolação não foi observada em horários diferentes."); }

    if (d.soil === "known") { e.score += 8; e.contributions.push("Condições gerais do solo foram observadas."); }
    else if (d.soil === "containers") { e.score += 6; e.contributions.push("O plano prevê substrato em recipientes, reduzindo dependência do solo local."); }
    else if (d.soil === "poor") { e.score -= 6; e.risks.push("Solo compactado, encharcado ou degradado exige solução técnica."); e.improvements.push("Avaliar drenagem, recuperação ou uso de recipientes/canteiros elevados."); }
    else { e.score -= 5; e.risks.push("Solo ou substrato ainda não foi avaliado."); }

    if (waterArea > 0) { e.score += 4; e.contributions.push("A composição reserva espaço para água."); }
    if (compost > 0 && responsibleCount >= 2) { e.score += 7; e.contributions.push("Compostagem foi incluída com equipe mínima indicada."); }
    else if (compost > 0) { e.score -= 5; e.risks.push("Compostagem sem equipe suficiente pode gerar odores, vetores ou abandono."); e.improvements.push("Definir responsável e controle de vetores, ou retirar a compostagem nesta fase."); }

    const circulationRatio = scenario.area ? paths / scenario.area : 0;
    if ((d.accessibility === "required" || d.accessibility === "desirable") && circulationRatio >= .2) {
      s.score += 12; s.contributions.push("O mapa reserva ao menos 20% para caminhos e manobra diante da necessidade de acesso.");
    } else if (d.accessibility === "required" && circulationRatio < .2) {
      s.score -= 10; s.risks.push("A circulação planejada pode ser insuficiente para a necessidade de acessibilidade indicada."); s.improvements.push("Ampliar caminhos e manobra e validar medidas com usuários e profissionais.");
    } else if (circulationRatio >= .2) { s.score += 6; s.contributions.push("A composição preserva circulação e manobra."); }
    if (pedagogyArea > 0) { s.score += 6; s.contributions.push("Há espaço destinado a atividades pedagógicas."); }
    if (observationArea > 0) { s.score += 4; s.contributions.push("Há área de observação no plano."); }
    if (d.purpose === "community") { s.score += 4; s.contributions.push("A finalidade inclui mobilização comunitária."); }
    if (responsibleCount >= 2) { s.score += 6; s.contributions.push("Há mais de uma pessoa responsável indicada."); }
    else { s.score -= 7; s.risks.push("Participação e cuidado podem ficar concentrados em uma pessoa."); s.improvements.push("Construir uma equipe mínima com responsabilidades explícitas."); }
    if (curricularCount >= 3) { s.score += 5; s.contributions.push("Três ou mais componentes curriculares foram relacionados."); }

    if (responsibleCount >= 3) { g.score += 12; g.contributions.push("Três ou mais responsáveis foram indicados."); }
    else if (responsibleCount === 2) { g.score += 8; g.contributions.push("Duas pessoas responsáveis foram indicadas."); }
    else if (responsibleCount === 1) { g.score -= 5; g.risks.push("Uma única pessoa concentra a continuidade do projeto."); }
    else { g.score -= 12; g.risks.push("Nenhuma pessoa responsável foi indicada."); }
    if (d.vacation === "covered") { g.score += 12; g.contributions.push("Férias contam com responsáveis e substitutos definidos."); }
    else if (d.vacation === "partial") { g.score += 2; g.risks.push("A cobertura de férias é apenas parcial."); g.improvements.push("Definir substitutos, frequência e critérios de pausa."); }
    else { g.score -= 10; g.risks.push("Não há plano de continuidade para férias e recessos."); g.improvements.push("Criar escala ou reduzir cultivos antes dos recessos."); }
    if (d.budget && d.budget !== "none") { g.score += 5; g.contributions.push("Uma faixa de orçamento foi considerada."); }
    else { g.score -= 3; g.risks.push("O orçamento ainda não foi definido."); }
    if (d.tools === "enough") { g.score += 6; g.contributions.push("Conjunto básico de ferramentas foi informado."); }
    else if (d.tools === "partial") { g.score += 2; g.improvements.push("Completar e organizar o conjunto de ferramentas essenciais."); }
    else { g.score -= 4; g.risks.push("Ferramentas e armazenamento seguro ainda não estão disponíveis."); }
    if (total <= scenario.area + .01) { g.score += 4; g.contributions.push("A composição respeita o limite de área do cenário."); }
    if (state.components.length > 10 && responsibleCount < 3) { g.score -= 8; g.risks.push("Há muitos componentes para uma equipe pequena."); g.improvements.push("Simplificar o arranjo ou ampliar a equipe antes de expandir."); }

    if (activityCount >= 5) { p.score += 18; p.contributions.push(`${activityCount} atividades pedagógicas foram selecionadas.`); }
    else if (activityCount >= 3) { p.score += 12; p.contributions.push(`${activityCount} atividades pedagógicas foram selecionadas.`); }
    else if (activityCount >= 1) { p.score += 4; p.contributions.push(`${activityCount} atividade(s) pedagógica(s) foi/foram selecionada(s).`); p.improvements.push("Ampliar a articulação curricular e os registros previstos."); }
    else { p.score -= 10; p.risks.push("Nenhuma atividade pedagógica foi selecionada."); p.improvements.push("Relacionar ao menos duas atividades com perguntas e registros."); }
    if ((state.pedagogyNote || "").trim().length >= 40) { p.score += 8; p.contributions.push("A intenção pedagógica foi registrada de forma descritiva."); }
    else { p.score -= 3; p.improvements.push("Registrar o que será investigado, por quanto tempo e com qual evidência."); }
    if (pedagogyArea > 0) { p.score += 5; p.contributions.push("A composição inclui área pedagógica."); }
    if (observationArea > 0) { p.score += 5; p.contributions.push("A composição inclui área de observação."); }
    if (curricularCount >= 2) { p.score += 6; p.contributions.push("O diagnóstico relaciona dois ou mais componentes curriculares."); }

    Object.values(dimensions).forEach((dimension) => {
      const eventDelta = choiceImpact(state, dimension.key);
      if (eventDelta !== 0) dimension.contributions.push(`Decisões nos eventos alteraram este indicador em ${eventDelta > 0 ? "+" : ""}${eventDelta} pontos.`);
      dimension.score = clamp(Math.round(dimension.score + eventDelta));
      Object.assign(dimension, statusFor(dimension.score));
    });

    e.confirmations.push("Insolação ao longo do dia e do ano.", "Qualidade do solo ou substrato, drenagem e espécies adequadas ao clima.", "Disponibilidade e segurança da fonte de água.");
    s.confirmations.push("Percurso, largura, piso, alcance e participação com as pessoas que usarão o espaço.", "Regras locais de segurança e supervisão.");
    g.confirmations.push("Nomes e disponibilidade dos responsáveis principais e substitutos.", "Custos, autorizações, manutenção e critérios de pausa.");
    p.confirmations.push("Alinhamento com currículo, calendário escolar e formas de registro.", "Tempo docente disponível e participação das turmas.");

    if (!eventCount) g.improvements.push("Responder aos eventos de simulação para testar a continuidade do plano.");
    return { scenario, totalArea: total, remainingArea: round1(scenario.area - total), circulationRatio, eventCount, dimensions };
  }

  Object.assign(HL, { clamp, round1, areaTotal, areaByType, scenarioFor, RULE_DESCRIPTIONS, evaluatePlan });
}());
