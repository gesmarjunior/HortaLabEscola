(function () {
  "use strict";

  const icon = (paths) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;

  const COMPONENT_TYPES = {
    bed: {
      label: "Canteiro",
      short: "Canteiro",
      defaultArea: 2,
      color: "#4D8B43",
      soft: "#DDEBD5",
      icon: icon('<path d="M4 8h16v10H4zM7 8V5m10 3V5M8 13h8m-5-3v6"/>'),
      resource: "canteiro, terra adequada e proteção do solo"
    },
    container: {
      label: "Recipiente de cultivo",
      short: "Recipiente",
      defaultArea: 0.8,
      color: "#9A603A",
      soft: "#F1E1D5",
      icon: icon('<path d="M5 7h14l-2 12H7L5 7Zm-1-3h16v3H4z"/>'),
      resource: "recipiente com saída de água e terra adequada"
    },
    paths: {
      label: "Caminhos",
      short: "Caminhos",
      defaultArea: 2,
      color: "#9A7D4A",
      soft: "#F2E6C9",
      icon: icon('<path d="M5 20c7-4 2-12 14-16M7 18l3 2m-2-6 4 2m-1-6 4 2m-1-6 3 2"/>'),
      resource: "piso estável, drenagem e bordas seguras"
    },
    maneuver: {
      label: "Circulação e manobra",
      short: "Manobra",
      defaultArea: 2,
      color: "#657D74",
      soft: "#E1E7E4",
      icon: icon('<path d="M7 7h10v10H7zM7 10H4V4h6M17 14h3v6h-6"/>'),
      resource: "faixa livre para circulação, giro e aproximação"
    },
    water: {
      label: "Ponto de água",
      short: "Água",
      defaultArea: 0.5,
      color: "#327FAF",
      soft: "#DCECF6",
      icon: icon('<path d="M12 3s6 7 6 12a6 6 0 1 1-12 0c0-5 6-12 6-12Z"/>'),
      resource: "fonte segura, mangueira ou regador e rotina de uso"
    },
    seedlings: {
      label: "Área de mudas",
      short: "Mudas",
      defaultArea: 0.5,
      color: "#69A84F",
      soft: "#E4F0DE",
      icon: icon('<path d="M12 21v-8m0 1c-5 0-7-3-7-7 5 0 7 2 7 7Zm0-3c1-5 4-7 8-7 0 5-3 8-8 8Z"/>'),
      resource: "bandejas, proteção, identificação e calendário"
    },
    tools: {
      label: "Ferramentas e apoio",
      short: "Ferramentas",
      defaultArea: 0.5,
      color: "#B05D35",
      soft: "#F4E1D7",
      icon: icon('<path d="m14 6 4-3 3 3-3 4m-2-2L8 20l-4-4L16 8ZM6 14l4 4"/>'),
      resource: "ferramentas adequadas e armazenamento seguro"
    },
    compost: {
      label: "Compostagem",
      short: "Compostagem",
      defaultArea: 1,
      color: "#6D7140",
      soft: "#E8E8D5",
      icon: icon('<path d="M8 7h8l1 13H7L8 7Zm-2 0h12M9 4h6v3m-5 5c3 0 4 2 4 4-3 0-4-1-4-4Z"/>'),
      resource: "recipiente ou área controlada, matéria seca e responsável"
    },
    pedagogy: {
      label: "Área pedagógica",
      short: "Pedagogia",
      defaultArea: 1.5,
      color: "#D18A26",
      soft: "#FFF0C9",
      icon: icon('<path d="M4 6c4-2 6 0 8 2 2-2 4-4 8-2v13c-4-2-6 0-8 2-2-2-4-4-8-2V6Zm8 2v13"/>'),
      resource: "apoio para medição, conversa, desenho e registros"
    },
    observation: {
      label: "Área de observação",
      short: "Observação",
      defaultArea: 1,
      color: "#7A6197",
      soft: "#ECE4F3",
      icon: icon('<path d="M3 12s3-5 9-5 9 5 9 5-3 5-9 5-9-5-9-5Zm9 2a2 2 0 1 0 0 -4a2 2 0 0 0 4 0Z"/>'),
      resource: "banco ou ponto de parada sem obstruir caminhos"
    },
    signage: {
      label: "Placas de identificação",
      short: "Placas",
      defaultArea: 0.1,
      color: "#A04D3D",
      soft: "#F5E2DE",
      icon: icon('<path d="M5 5h14v9H5zM12 14v7M8 9h8"/>'),
      resource: "placas resistentes, legíveis e sem arestas perigosas"
    }
  };

  const SCENARIOS = [
    {
      id: "micro",
      area: 12,
      name: "Micro-horta",
      summary: "Opção pequena para começar com uma rotina simples.",
      bestFor: "Pode atender uma equipe pequena, pouco espaço ou água limitada.",
      notes: ["Recipientes ou 1 a 2 canteiros", "Circulação essencial", "Atividades em pequenos grupos"],
      seed: [
        ["bed", 2], ["bed", 2], ["paths", 2.5], ["maneuver", 1.5],
        ["water", 0.5], ["seedlings", 0.5], ["tools", 0.5], ["pedagogy", 1.5], ["observation", 1]
      ]
    },
    {
      id: "compact",
      area: 25,
      name: "Horta compacta",
      summary: "Opção intermediária para trabalhar com uma turma ou um projeto definido.",
      bestFor: "Pode atender uma turma e uma equipe que divide os cuidados.",
      notes: ["2 a 3 canteiros", "Ponto de água e apoio", "Espaço pedagógico preservado"],
      seed: [
        ["bed", 3], ["bed", 3], ["bed", 3], ["paths", 5], ["maneuver", 3],
        ["water", 1], ["seedlings", 0.5], ["tools", 0.5], ["compost", 1], ["pedagogy", 3], ["observation", 2]
      ]
    },
    {
      id: "expanded",
      area: 50,
      name: "Horta de aprendizagem ampliada",
      summary: "Maior opção do simulador. Exige água, equipe e cuidado contínuo.",
      bestFor: "Só deve ser escolhida quando a escola consegue manter esse tamanho.",
      notes: ["19,8 m² de canteiros", "17,2 m² de caminhos e manobra", "13 m² de apoio e pedagogia"],
      seed: [
        ["bed", 6.6], ["bed", 6.6], ["bed", 6.6], ["paths", 11.2], ["maneuver", 6],
        ["water", 1.5], ["seedlings", 1.2], ["tools", 1.3], ["compost", 3], ["pedagogy", 4], ["observation", 2]
      ]
    }
  ];

  const CURRICULAR = {
    science: "Ciências",
    math: "Matemática",
    geography: "Geografia",
    language: "Língua Portuguesa",
    arts: "Artes",
    environmental: "Educação ambiental",
    governance: "Organização"
  };

  const ACTIVITIES = [
    { id: "science", name: "Ciências", description: "Germinação, solo, água e biodiversidade", options: [
      ["germination", "Diário de germinação", "Comparar tempo, umidade e nascimento das plantas."],
      ["soil", "Investigação do solo", "Observar textura, infiltração e cobertura sem substituir análise técnica."],
      ["biodiversity", "Inventário de biodiversidade", "Registrar organismos observados e relações no ambiente."]
    ]},
    { id: "math", name: "Matemática", description: "Medidas, áreas, proporções e registros", options: [
      ["measure", "Medir e representar", "Fazer um desenho em escala e comparar cultivo e circulação."],
      ["proportion", "Proporções do espaço", "Calcular percentuais ocupados por cada função."],
      ["records", "Série de registros", "Organizar tabelas simples de observações ao longo do tempo."]
    ]},
    { id: "geography", name: "Geografia", description: "Clima, território e sistemas alimentares", options: [
      ["sunmap", "Mapa de sol e sombra", "Observar o território escolar em horários diferentes."],
      ["foodsystems", "Caminhos dos alimentos", "Relacionar produção, distribuição, consumo e resíduos."]
    ]},
    { id: "language", name: "Língua Portuguesa", description: "Diário, relatórios e comunicação", options: [
      ["fieldjournal", "Diário de campo", "Registrar perguntas, decisões, evidências e revisões."],
      ["report", "Relatório para a comunidade", "Comunicar objetivos, limites, recursos e resultados."]
    ]},
    { id: "arts", name: "Artes", description: "Desenho de observação e sinalização", options: [
      ["drawing", "Desenho de observação", "Representar formas, texturas, ciclos e mudanças."],
      ["signage", "Sistema de sinalização", "Criar placas legíveis, inclusivas e resistentes."]
    ]},
    { id: "environmental", name: "Educação ambiental", description: "Resíduos, compostagem e consumo", options: [
      ["waste", "Mapa de resíduos", "Identificar fluxos, possibilidades e limites de compostagem."],
      ["watercare", "Plano de cuidado da água", "Discutir uso eficiente, perdas e responsabilidades."]
    ]},
    { id: "governance", name: "Organização da equipe", description: "Responsáveis, orçamento e continuidade", options: [
      ["roles", "Quadro de responsabilidades", "Distinguir responsáveis principais, substitutos e pessoas de apoio."],
      ["budget", "Registro do orçamento", "Anotar prioridades, gastos estimados e escolhas de compra."],
      ["continuity", "Plano de continuidade", "Definir rotina, férias, pausa e retomada segura."]
    ]}
  ];

  const EVENTS = [
    {
      id: "vacation", title: "Férias escolares", problem: "A rotina de cuidado ficará interrompida por várias semanas.",
      options: [
        { id: "rotation", label: "Combinar dias de cuidado com responsáveis e substitutos", feedback: "Dividir os dias de cuidado reduz a dependência de uma única pessoa.", impact: { governance: 10, social: 3 } },
        { id: "reduce", label: "Reduzir cultivos antes do recesso e manter apenas o essencial", feedback: "Reduzir a demanda é uma decisão prudente quando a equipe é pequena.", impact: { governance: 6, environmental: 3 } },
        { id: "hope", label: "Manter tudo e verificar apenas na volta", feedback: "Sem cuidados combinados, aumentam as chances de perdas e abandono.", impact: { governance: -12, environmental: -7 } }
      ]
    },
    {
      id: "waterRestriction", title: "Restrição de água", problem: "A escola passa a ter acesso irregular à água.",
      options: [
        { id: "adapt", label: "Reduzir o tamanho, proteger o solo e escolher plantas que usem menos água", feedback: "A mudança aproxima a necessidade de água da quantidade realmente disponível.", impact: { environmental: 10, governance: 4 } },
        { id: "capture", label: "Avaliar captação e armazenamento com orientação técnica", feedback: "Essa alternativa pode ajudar, mas depende de segurança, regras locais e manutenção.", impact: { environmental: 6, governance: 2 } },
        { id: "unchanged", label: "Manter o plano sem alterações", feedback: "Diversidade ou área ampla não compensam uma fonte hídrica incerta.", impact: { environmental: -14, governance: -5 } }
      ]
    },
    {
      id: "volunteers", title: "Perda de voluntários", problem: "Metade da equipe deixa de participar da manutenção.",
      options: [
        { id: "resize", label: "Diminuir o plano e dividir novamente as tarefas", feedback: "O tamanho da horta passa a combinar melhor com a equipe disponível.", impact: { governance: 9, social: 4 } },
        { id: "recruit", label: "Buscar novos apoios antes de manter o tamanho", feedback: "A continuidade depende de pessoas que confirmem sua participação.", impact: { social: 7, governance: 3 } },
        { id: "overload", label: "Concentrar todas as tarefas em uma pessoa", feedback: "A sobrecarga fragiliza continuidade, participação e segurança.", impact: { social: -12, governance: -9 } }
      ]
    },
    {
      id: "pests", title: "Aparecimento de pragas", problem: "Folhas apresentam danos e a causa ainda não foi confirmada.",
      options: [
        { id: "observe", label: "Observar, registrar e buscar orientação para um cuidado agroecológico", feedback: "Observar antes de agir evita decisões apressadas e pode virar uma atividade de aprendizagem.", impact: { environmental: 8, pedagogical: 5 } },
        { id: "remove", label: "Separar as plantas afetadas e revisar as condições do cultivo", feedback: "A medida ajuda mais quando a equipe também registra o que aconteceu.", impact: { environmental: 5, governance: 2 } },
        { id: "chemical", label: "Aplicar produto químico sem orientação", feedback: "Aplicações sem orientação trazem riscos sanitários e contrariam o uso educacional seguro.", impact: { environmental: -16, social: -10 } }
      ]
    },
    {
      id: "budgetCut", title: "Redução de orçamento", problem: "O recurso disponível foi reduzido antes da implantação.",
      options: [
        { id: "phase", label: "Começar por etapas e priorizar segurança, água e caminhos", feedback: "Começar aos poucos preserva o essencial e facilita o controle dos gastos.", impact: { governance: 9, social: 2 } },
        { id: "reuse", label: "Reavaliar materiais locais seguros e reduzir o tamanho", feedback: "Reutilizar materiais pode ajudar quando segurança e durabilidade são verificadas.", impact: { environmental: 4, governance: 5 } },
        { id: "cutaccess", label: "Eliminar caminhos e itens de acessibilidade", feedback: "Economizar retirando acesso compromete participação e segurança.", impact: { social: -16, governance: -6 } }
      ]
    },
    {
      id: "teamChange", title: "Mudança da equipe", problem: "A coordenação do projeto muda no meio do ano.",
      options: [
        { id: "handover", label: "Entregar os registros, o calendário e os critérios de pausa", feedback: "Os registros tornam o plano menos dependente de uma única pessoa.", impact: { governance: 11, pedagogical: 2 } },
        { id: "meeting", label: "Rever objetivos e responsabilidades com a nova equipe", feedback: "A conversa evita que a nova equipe receba um plano sem conhecer suas razões.", impact: { governance: 8, social: 5 } },
        { id: "implicit", label: "Confiar em orientações informais", feedback: "Informações dispersas aumentam ambiguidades e perda de continuidade.", impact: { governance: -11 } }
      ]
    },
    {
      id: "accessDifficulty", title: "Dificuldade de acessibilidade", problem: "O percurso previsto não atende parte da comunidade escolar.",
      options: [
        { id: "redesign", label: "Ampliar os caminhos e rever o alcance com usuários e profissionais", feedback: "A adaptação precisa ser confirmada no local com a participação das pessoas afetadas.", impact: { social: 12, governance: 3 } },
        { id: "alternate", label: "Criar atividades equivalentes enquanto o espaço é revisto", feedback: "A medida reduz exclusão imediata, mas não encerra a necessidade de adequação física.", impact: { social: 6, pedagogical: 3 } },
        { id: "separate", label: "Manter o espaço e afastar quem não consegue acessá-lo", feedback: "Separar as pessoas não resolve a barreira e reduz a participação.", impact: { social: -18, pedagogical: -5 } }
      ]
    },
    {
      id: "overload", title: "Itens demais para cuidar", problem: "O plano reúne mais espaços e rotinas do que a equipe consegue cuidar.",
      options: [
        { id: "simplify", label: "Remover alguns itens e manter o que é mais importante", feedback: "Simplificar aumenta a chance de continuidade e permite aprender por etapas.", impact: { governance: 9, environmental: 3 } },
        { id: "phase", label: "Começar aos poucos e só ampliar quando a equipe estiver pronta", feedback: "A ampliação passa a depender da capacidade de cuidado já demonstrada.", impact: { governance: 8, pedagogical: 3 } },
        { id: "keep", label: "Manter todos os itens para não perder oportunidades", feedback: "Ter muitos itens não garante aprendizagem e pode aumentar o risco de abandono.", impact: { governance: -12, environmental: -5 } }
      ]
    }
  ];

  const LIMITATION_LABELS = {
    water: "disponibilidade de água", team: "equipe", budget: "orçamento", space: "espaço",
    vacation: "férias e recessos", access: "acessibilidade", security: "segurança"
  };

  // Direções na tela isométrica. Cada movimento combina os dois eixos da
  // grade para que as setas correspondam à direção visual percebida.
  const VISUAL_NUDGE_DELTAS = {
    0: {
      ArrowUp: [-1, -1], ArrowDown: [1, 1],
      ArrowLeft: [-1, 1], ArrowRight: [1, -1]
    },
    1: {
      ArrowUp: [-1, -1], ArrowDown: [1, 1],
      ArrowLeft: [1, -1], ArrowRight: [-1, 1]
    }
  };

  window.HortaLab = window.HortaLab || {};
  Object.assign(window.HortaLab, {
    APP_VERSION: "2.4.1",
    COMPONENT_TYPES,
    SCENARIOS,
    CURRICULAR,
    ACTIVITIES,
    EVENTS,
    LIMITATION_LABELS,
    VISUAL_NUDGE_DELTAS
  });
}());
