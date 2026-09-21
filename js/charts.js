(function () {
  "use strict";
  const HL = window.HortaLab;
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const list = (items, empty) => `<ul>${(items.length ? items : [empty]).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`;

  function renderViability(container, evaluation) {
    if (!container) return;
    container.innerHTML = Object.values(evaluation.dimensions).map((dimension) => `
      <section class="viability-card" style="--dimension-color:${dimension.color};--score:${dimension.score}%" aria-labelledby="dimension-${dimension.key}">
        <header><h3 id="dimension-${dimension.key}"><span class="dimension-mark"></span>${dimension.label}</h3><span class="score-value">${dimension.score}/100</span></header>
        <div class="score-bar" role="img" aria-label="Indicador ${dimension.label}: ${dimension.score} de 100, ${dimension.label}"><span></span></div>
        <p class="score-label">${dimension.statusLabel}</p>
        <div class="evidence-block"><h4>O que contribuiu</h4>${list(dimension.contributions, "Nenhuma contribuição registrada ainda.")}</div>
        <div class="evidence-block"><h4>Riscos identificados</h4>${list(dimension.risks, "Nenhum risco adicional sinalizado pelas regras atuais.")}</div>
        <div class="evidence-block"><h4>O que melhorar</h4>${list(dimension.improvements, "Manter os registros e revisar o plano com a comunidade escolar.")}</div>
        <div class="evidence-block"><h4>Confirmar no local</h4>${list(dimension.confirmations, "Conferir as condições com profissionais competentes.")}</div>
      </section>`).join("");
  }

  function renderRules(container) {
    if (!container) return;
    container.innerHTML = `<p>Todos os indicadores começam em 35 pontos. Somam ou subtraem valores fixos conforme as escolhas; o resultado é limitado entre 0 e 100. Não há números aleatórios.</p><div class="table-scroll"><table class="rules-table"><thead><tr><th>Dimensão</th><th>Regra</th><th>Efeito</th><th>Interpretação</th></tr></thead><tbody>${HL.RULE_DESCRIPTIONS.map((row) => `<tr>${row.map((cell) => `<td>${escapeHTML(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  Object.assign(HL, { escapeHTML, renderViability, renderRules });
}());
