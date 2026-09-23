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
  assert.match(html, /aria-label="Mover visualmente para a direita"/);
});

test("as setas sempre correspondem à direção visual da vista isométrica", async () => {
  const data = await loadData();
  const projectDelta = ([dx, dy], rotation) => {
    const viewX = rotation ? dy : dx;
    const viewY = rotation ? dx : dy;
    return [viewX - viewY, viewX + viewY];
  };
  for (const rotation of [0, 1]) {
    const deltas = data.VISUAL_NUDGE_DELTAS[rotation];
    assert.deepEqual(projectDelta(deltas.ArrowUp, rotation), [0, -2]);
    assert.deepEqual(projectDelta(deltas.ArrowDown, rotation), [0, 2]);
    assert.deepEqual(projectDelta(deltas.ArrowLeft, rotation), [-2, 0]);
    assert.deepEqual(projectDelta(deltas.ArrowRight, rotation), [2, 0]);
  }
});

test("cada componente possui um PNG 3D transparente e otimizado", async () => {
  const source = await readFile(new URL("../js/planner.js", import.meta.url), "utf8");
  assert.match(source, /class="iso-sprite"/);
  for (const type of ["bed", "container", "paths", "maneuver", "water", "seedlings", "tools", "compost", "pedagogy", "observation", "signage"]) {
    const png = await readFile(new URL(`../assets/images/isometric/${type}.png`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG", type);
    assert.equal(png.readUInt32BE(16), 384, `${type}: largura`);
    assert.equal(png.readUInt32BE(20), 384, `${type}: altura`);
    assert.equal(png[25], 6, `${type}: PNG deve preservar canal alfa RGBA`);
    assert.ok(png.byteLength < 250000, `${type}: arquivo maior que 250 KB`);
  }
});
