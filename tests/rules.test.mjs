import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function loadApp() {
  const context = vm.createContext({ window: {}, console, setTimeout, clearTimeout });
  context.window.window = context.window;
  for (const file of ["js/data.js", "js/state.js", "js/rules.js", "js/storage.js"]) {
    const code = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    vm.runInContext(code, context, { filename: file });
  }
  return context.window.HortaLab;
}

test("os três cenários somam exatamente suas áreas", async () => {
  const HL = await loadApp();
  for (const scenario of HL.SCENARIOS) {
    const total = scenario.seed.reduce((sum, [, area]) => sum + area, 0);
    assert.equal(Math.round(total * 10) / 10, scenario.area, scenario.name);
  }
});

test("o cenário de 50 m² preserva as cinco parcelas acadêmicas", async () => {
  const HL = await loadApp();
  const scenario = HL.SCENARIOS.find((item) => item.area === 50);
  const sumTypes = (...types) => HL.round1(scenario.seed.filter(([type]) => types.includes(type)).reduce((sum, [, area]) => sum + area, 0));
  assert.equal(sumTypes("bed"), 19.8);
  assert.equal(sumTypes("paths", "maneuver"), 17.2);
  assert.equal(sumTypes("water", "seedlings", "tools"), 4);
  assert.equal(sumTypes("compost"), 3);
  assert.equal(sumTypes("pedagogy", "observation"), 6);
  assert.equal(scenario.seed.reduce((sum, [, area]) => sum + area, 0), 50);
});

test("a avaliação é determinística e limitada entre 0 e 100", async () => {
  const HL = await loadApp();
  const state = HL.defaultState();
  state.diagnosis = { ...state.diagnosis, water: "regular", sunlight: "high", soil: "known", responsibles: "3", vacation: "covered", budget: "medium", tools: "enough", accessibility: "desirable", curricular: ["science", "math", "governance"] };
  state.activities = ["germination", "measure", "roles"];
  state.pedagogyNote = "Investigar germinação, registrar medidas e revisar resultados coletivamente.";
  const first = HL.evaluatePlan(state);
  const second = HL.evaluatePlan(state);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  Object.values(first.dimensions).forEach((dimension) => assert.ok(dimension.score >= 0 && dimension.score <= 100));
});

test("uma resposta adaptativa à restrição de água melhora o resultado ambiental", async () => {
  const HL = await loadApp();
  const state = HL.defaultState();
  state.eventDecisions.waterRestriction = "unchanged";
  const unchanged = HL.evaluatePlan(state).dimensions.environmental.score;
  state.eventDecisions.waterRestriction = "adapt";
  const adapted = HL.evaluatePlan(state).dimensions.environmental.score;
  assert.equal(adapted - unchanged, 24);
});

test("a importação recusa composição maior que o cenário", async () => {
  const HL = await loadApp();
  const state = HL.defaultState();
  state.components = [{ id: "x", type: "bed", area: 7 }, { id: "y", type: "paths", area: 7 }];
  assert.throws(() => HL.validateAndNormalize(state), /ultrapassa a área/);
});
