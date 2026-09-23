import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("a versão oficial contém a jornada orientada de sete etapas", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.equal((html.match(/class="v2-step" data-v2-panel=/g) || []).length, 7);
  for (const label of ["Sua escola", "Tamanho", "Espaços", "Organize", "Aulas e cuidados", "Teste o plano", "Plano final"]) assert.match(html, new RegExp(label));
  assert.match(html, /data-v2-panel="3"[\s\S]*data-v2-panel="4"/);
  for (const id of ["v2PlotGrid", "v2ComponentEditor", "v2IsoCanvas", "v2CarePlan", "v2EventPicker", "v2Feasibility", "v2Summary", "v2Export", "v2ExportSqlite", "v2ImportFile", "v2StorageStatus"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /data-v2-nudge="ArrowRight"/);
  assert.match(html, /sql-wasm\.js/);
  assert.match(html, /js\/local-db\.js/);
  assert.match(html, /js\/rules\.js/);
  assert.match(html, /css\/planner\.css\?v=2\.4\.0/);
  assert.match(html, /js\/planner\.js\?v=2\.4\.0/);
});

test("a linguagem principal evita termos de programação", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const visibleText = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  for (const term of ["SQLite", "JSON", "layout isométrico", "painel ESG", "banco de dados", "interface digital"]) {
    assert.doesNotMatch(visibleText, new RegExp(term, "i"), term);
  }
  assert.match(visibleText, /Sem cadastro e sem envio de dados/);
  assert.match(visibleText, /O plano fica salvo somente neste dispositivo/);
});

test("o SQLite local possui schema e não usa localStorage", async () => {
  const db = await readFile(new URL("../js/local-db.js", import.meta.url), "utf8");
  const app = await readFile(new URL("../js/planner.js", import.meta.url), "utf8");
  assert.match(db, /CREATE TABLE IF NOT EXISTS app_state/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS metadata/);
  assert.match(db, /indexedDB/);
  assert.doesNotMatch(db, /localStorage/);
  assert.doesNotMatch(app, /localStorage/);
});

test("o banco incorporado é local e a aplicação não referencia recursos remotos", async () => {
  const files = ["index.html", "css/planner.css", "js/planner.js", "js/local-db.js", "service-worker.js"];
  for (const file of files) {
    const text = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /(?:src|href)=['"]https?:\/\//i, file);
    assert.doesNotMatch(text, /@import\s+url\(https?:\/\//i, file);
  }
  const wasm = await readFile(new URL("../assets/vendor/sql-wasm.wasm", import.meta.url));
  assert.ok(wasm.byteLength > 500000, "o binário SQLite local parece incompleto");
  const worker = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
  for (const type of ["bed", "container", "paths", "maneuver", "water", "seedlings", "tools", "compost", "pedagogy", "observation", "signage"]) {
    assert.match(worker, new RegExp(`assets/images/isometric/${type}\\.png`), type);
  }
});

test("a cartilha cobre os tópicos obrigatórios", async () => {
  const html = await readFile(new URL("../cartilha.html", import.meta.url), "utf8");
  for (const id of ["como-usar", "antes", "horta-escolar", "pesquisa-acao", "composicao", "area", "cenarios", "agua", "acessibilidade", "seguranca", "pedagogia", "governanca", "ferias", "compostagem", "checklists", "limites", "glossario", "referencias"]) assert.match(html, new RegExp(`id="${id}"`));
});
