import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("a jornada contém as nove etapas e os controles essenciais", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.equal((html.match(/class="step-panel" data-step=/g) || []).length, 9);
  for (const id of ["diagnosisForm", "scenarioCards", "plotGrid", "activityGroups", "eventList", "viabilityDashboard", "finalPlan", "exportPlan", "importPlan", "printPlan", "resetPlan"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /class="skip-link"/);
  assert.match(html, /aria-live="polite"/);
});

test("o produto não referencia scripts, fontes ou imagens remotas", async () => {
  const files = ["index.html", "cartilha.html", "css/styles.css", "css/simulator.css", "css/cartilha.css", "js/app.js"];
  for (const file of files) {
    const text = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /(?:src|href)=["']https?:\/\//i, file);
    assert.doesNotMatch(text, /@import\s+url\(https?:\/\//i, file);
  }
});

test("a cartilha cobre os tópicos obrigatórios", async () => {
  const html = await readFile(new URL("../cartilha.html", import.meta.url), "utf8");
  for (const id of ["como-usar", "antes", "horta-escolar", "pesquisa-acao", "composicao", "area", "cenarios", "agua", "acessibilidade", "seguranca", "pedagogia", "governanca", "ferias", "compostagem", "checklists", "limites", "glossario", "referencias"]) assert.match(html, new RegExp(`id="${id}"`));
});
