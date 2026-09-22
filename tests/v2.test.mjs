import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function loadData() {
  const context = vm.createContext({ window: {}, console });
  context.window.window = context.window;
  const source = await readFile(new URL("../js/data.js", import.meta.url), "utf8");
  vm.runInContext(source, context, { filename: "js/data.js" });
  return context.window.HortaLab;
}

test("os cenários oficiais preservam a soma exata das áreas", async () => {
  const data = await loadData();
  for (const scenario of data.SCENARIOS) {
    const total = scenario.seed.reduce((sum, [, area]) => sum + area, 0);
    assert.equal(Math.round(total * 10) / 10, scenario.area, scenario.name);
  }
});

test("a composição de 50 m² preserva as cinco parcelas acadêmicas", async () => {
  const data = await loadData();
  const expanded = data.SCENARIOS.find((item) => item.id === "expanded");
  const grouped = expanded.seed.reduce((acc, [type, area]) => { acc[type] = (acc[type] || 0) + area; return acc; }, {});
  assert.equal(Math.round(grouped.bed * 10) / 10, 19.8);
  assert.equal(Math.round((grouped.paths + grouped.maneuver) * 10) / 10, 17.2);
  assert.equal(Math.round((grouped.water + grouped.seedlings + grouped.tools) * 10) / 10, 4);
  assert.equal(Math.round(grouped.compost * 10) / 10, 3);
  assert.equal(Math.round((grouped.pedagogy + grouped.observation) * 10) / 10, 6);
});

test("o layout usa componentes editáveis e controles acessíveis", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="v2PlotGrid"/);
  assert.match(html, /id="v2ComponentEditor"/);
  assert.match(html, /id="v2IsoCanvas"/);
  assert.match(html, /data-v2-nudge="ArrowUp"/);
  assert.match(html, /aria-label="Mover para a direita"/);
});
