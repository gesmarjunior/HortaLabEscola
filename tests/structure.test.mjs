import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("a versão oficial contém a jornada curta e Layout depois de Composição", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.equal((html.match(/class="v2-step" data-v2-panel=/g) || []).length, 6);
  assert.match(html, /data-v2-panel="3"[\s\S]*data-v2-panel="4"/);
  for (const id of ["v2CompositionCanvas", "v2IsoCanvas", "v2Export", "v2ExportSqlite", "v2ImportFile", "v2StorageStatus"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /data-v2-nudge="ArrowRight"/);
  assert.match(html, /sql-wasm\.js/);
  assert.match(html, /js\/local-db\.js/);
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
});

test("a cartilha cobre os tópicos obrigatórios", async () => {
  const html = await readFile(new URL("../cartilha.html", import.meta.url), "utf8");
  for (const id of ["como-usar", "antes", "horta-escolar", "pesquisa-acao", "composicao", "area", "cenarios", "agua", "acessibilidade", "seguranca", "pedagogia", "governanca", "ferias", "compostagem", "checklists", "limites", "glossario", "referencias"]) assert.match(html, new RegExp(`id="${id}"`));
});
