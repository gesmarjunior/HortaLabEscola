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

test("a versão enxuta expõe a etapa Layout isométrico depois da composição", async () => {
  const html = await readFile(new URL("../index-v2.html", import.meta.url), "utf8");
  assert.equal((html.match(/class="v2-step" data-v2-panel=/g) || []).length, 6);
  assert.match(html, /data-v2-panel="3"[\s\S]*data-v2-panel="4"/);
  assert.match(html, /id="v2IsoCanvas"/);
  assert.match(html, /data-v2-nudge="ArrowRight"/);
});

test("a composição inicial da versão enxuta preserva os totais de 12, 25 e 50 m²", async () => {
  const data = await loadData();
  for (const scenario of data.SCENARIOS) {
    const total = scenario.seed.reduce((sum, [, area]) => sum + area, 0);
    assert.equal(Math.round(total * 10) / 10, scenario.area, scenario.name);
  }
});

test("a versão enxuta não adiciona dependências remotas", async () => {
  const files = ["index-v2.html", "css/v2.css", "js/v2-app.js"];
  for (const file of files) {
    const text = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /(?:src|href)=['"]https?:\/\//i, file);
    assert.doesNotMatch(text, /@import\s+url\(https?:\/\//i, file);
  }
});
