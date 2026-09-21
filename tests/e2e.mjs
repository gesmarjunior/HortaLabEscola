import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const baseURL = process.env.HORTALAB_URL || "http://127.0.0.1:4173";
const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
].filter(Boolean);
const executablePath = chromeCandidates.find(existsSync);
if (!executablePath) throw new Error("Nenhum navegador Chromium instalado foi encontrado.");

const screenshotDir = resolve("screenshots");
await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR", acceptDownloads: true });
const page = await context.newPage();
const errors = [];
const warnings = [];
const externalRequests = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
  if (message.type() === "warning") warnings.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  const url = new URL(request.url());
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) externalRequests.push(request.url());
});

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectText(selector, text) {
  await page.waitForFunction(({ selector, text }) => document.querySelector(selector)?.textContent.includes(text), { selector, text });
  const value = await page.locator(selector).textContent();
  check(value.includes(text), `Esperava "${text}" em ${selector}; recebido: ${value}`);
}

await page.goto(baseURL, { waitUntil: "networkidle" });
check((await page.title()).includes("HortaLab Escola"), "Título da página inicial incorreto.");
check(await page.locator("#hero-title").isVisible(), "A apresentação principal não está visível.");
check(await page.locator(".hero-figure img").evaluate((img) => img.complete && img.naturalWidth > 0), "A ilustração principal não carregou.");
await page.screenshot({ path: join(screenshotDir, "desktop-inicio.png"), fullPage: false });

await page.keyboard.press("Tab");
check((await page.evaluate(() => document.activeElement?.textContent || "")).includes("Pular para o conteúdo"), "O skip link não recebe o primeiro foco.");

await page.locator("#heroStart").click();
await page.locator('[data-step="1"] [data-next-step]').click();
await page.selectOption('[name="purpose"]', "learning");
await page.fill('[name="availableArea"]', "60");
await page.selectOption('[name="areaShape"]', "rectangular");
await page.selectOption('[name="sunlight"]', "high");
await page.selectOption('[name="water"]', "regular");
await page.selectOption('[name="soil"]', "known");
await page.fill('[name="responsibles"]', "4");
await page.selectOption('[name="vacation"]', "covered");
await page.selectOption('[name="budget"]', "medium");
await page.selectOption('[name="tools"]', "enough");
await page.selectOption('[name="accessibility"]', "required");
await page.selectOption('[name="experience"]', "some");
await page.check('[name="curricular"][value="science"]');
await page.check('[name="curricular"][value="math"]');
await page.check('[name="curricular"][value="governance"]');
await page.check('[name="limitations"][value="vacation"]');
await page.locator('[data-step="2"] [data-next-step]').click();

for (const [scenarioId, expected] of [["micro", "12,0 de 12,0"], ["compact", "25,0 de 25,0"], ["expanded", "50,0 de 50,0"]]) {
  await page.locator(`.scenario-card:has([name="scenario"][value="${scenarioId}"])`).click();
  await page.locator('[data-step="3"] [data-next-step]').click();
  await expectText("#plotAreaText", expected);
  await page.locator('[data-step="4"] [data-prev-step]').click();
}
await page.locator('.scenario-card:has([name="scenario"][value="expanded"])').click();
await page.locator('[data-step="3"] [data-next-step]').click();
await expectText("#plotAreaText", "50,0 de 50,0");
check((await page.locator("#plotGrid .plot-item").count()) === 11, "A composição inicial de 50 m² deveria ter 11 componentes.");

await page.locator('[data-add-component="signage"]').click();
await expectText("#appLive", "Não há 0,1 m² livres");
await page.locator("#plotGrid .plot-item").first().locator("button").click();
await page.fill("#componentAreaInput", "6.5");
await page.locator("#componentAreaInput").press("Enter");
await page.locator('[data-add-component="signage"]').click();
await expectText("#plotAreaText", "50,0 de 50,0");
await page.locator("#moveEarlier").click();
await page.locator('[data-step="4"]').scrollIntoViewIfNeeded();
await page.screenshot({ path: join(screenshotDir, "desktop-simulador.png"), fullPage: false });

await page.locator('[data-step="4"] [data-next-step]').click();
await page.check('.activity-option input[value="germination"]');
await page.check('.activity-option input[value="measure"]');
await page.check('.activity-option input[value="roles"]');
await page.fill("#pedagogyNote", "Acompanhar germinação por seis semanas, medir áreas e produzir um diário coletivo para revisão do projeto.");
await page.locator('[data-step="5"] [data-next-step]').click();

const eventChoices = {
  vacation: "rotation", waterRestriction: "adapt", volunteers: "resize", pests: "observe",
  budgetCut: "phase", teamChange: "handover", accessDifficulty: "redesign", overload: "simplify"
};
for (const [eventId, optionId] of Object.entries(eventChoices)) await page.check(`[name="event-${eventId}"][value="${optionId}"]`);
check((await page.locator(".event-feedback:visible").count()) === 8, "Todos os eventos deveriam mostrar consequência.");
await page.locator('[data-step="6"] [data-next-step]').click();
check((await page.locator(".viability-card").count()) === 4, "O painel deveria mostrar quatro dimensões.");
for (const text of ["Ambiental", "Social", "Governança", "Pedagógica"]) await expectText("#viabilityDashboard", text);
await page.locator('[data-step="7"] [data-next-step]').click();
await expectText("#finalPlan", "Plano HortaLab Escola");
await expectText("#finalPlan", "50,0 m²");

const downloadPromise = page.waitForEvent("download");
await page.locator("#exportPlan").click();
const download = await downloadPromise;
check(download.suggestedFilename().endsWith(".json"), "A exportação não gerou um arquivo JSON.");
const exportedPath = join(tmpdir(), "hortalab-e2e-plan.json");
await download.saveAs(exportedPath);
const exported = JSON.parse(await readFile(exportedPath, "utf8"));
check(exported.scenarioId === "expanded", "O JSON exportado não preservou o cenário.");
check(exported.components.reduce((sum, item) => sum + item.area, 0).toFixed(1) === "50.0", "O JSON exportado não totaliza 50 m².");

await page.reload({ waitUntil: "networkidle" });
check(await page.locator('[data-step="8"]').isVisible(), "A etapa atual não foi restaurada após recarregar.");
await expectText("#finalPlan", "Plano HortaLab Escola");

await page.emulateMedia({ media: "print" });
check(await page.locator("#finalPlan").isVisible(), "O plano final não está visível no modo de impressão.");
await page.pdf({ path: join(tmpdir(), "hortalab-e2e-print.pdf"), format: "A4", printBackground: true });
await page.emulateMedia({ media: "screen" });

await page.locator("#resetPlan").click();
await page.locator('#confirmDialog button[value="confirm"]').click();
check(await page.locator('[data-step="1"]').isVisible(), "O reinício não voltou à apresentação.");
await page.setInputFiles("#importFile", exportedPath);
await page.waitForTimeout(150);
check(await page.locator('[data-step="8"]').isVisible(), "A importação não restaurou a etapa do plano.");
await expectText("#finalPlan", "50,0 m²");

for (const width of [360, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: width === 360 ? 800 : 900 });
  await page.evaluate(() => window.HortaLab.setStep(4));
  await page.locator('[data-step="4"]').scrollIntoViewIfNeeded();
  const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  if (metrics.scrollWidth > metrics.clientWidth + 1) {
    const offenders = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => el.scrollWidth > el.clientWidth + 2).slice(0, 12).map((el) => ({ tag: el.tagName, id: el.id, cls: el.className, sw: el.scrollWidth, cw: el.clientWidth })));
    throw new Error(`Overflow horizontal em ${width}px: ${metrics.scrollWidth} > ${metrics.clientWidth} :: ${JSON.stringify(offenders)}`);
  }
  check(await page.locator("#plotGrid").isVisible(), `Simulador não visível em ${width}px.`);
  if (width === 360) await page.screenshot({ path: join(screenshotDir, "mobile-simulador.png"), fullPage: false });
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${baseURL}/cartilha.html`, { waitUntil: "networkidle" });
check(await page.locator("#como-usar").isVisible(), "A cartilha não carregou.");
check((await page.locator(".guide-section").count()) === 18, "A cartilha deveria ter 18 seções.");
check(await page.locator(".guide-hero img").evaluate((img) => img.complete && img.naturalWidth > 0), "A imagem da cartilha não carregou.");
await page.screenshot({ path: join(screenshotDir, "desktop-cartilha.png"), fullPage: false });

check(errors.length === 0, `Erros de console: ${errors.join(" | ")}`);
check(warnings.length === 0, `Avisos de console: ${warnings.join(" | ")}`);
check(externalRequests.length === 0, `Requisições externas detectadas: ${externalRequests.join(" | ")}`);

console.log(JSON.stringify({
  ok: true,
  pageTitle: await page.title(),
  viewports: [360, 768, 1024, 1440],
  screenshots: ["desktop-inicio.png", "desktop-simulador.png", "mobile-simulador.png", "desktop-cartilha.png"],
  consoleErrors: errors.length,
  consoleWarnings: warnings.length,
  externalRequests: externalRequests.length,
  journey: "início → diagnóstico → 3 cenários → composição → pedagogia → 8 eventos → painel → plano → exportação → persistência → impressão → reinício → importação"
}, null, 2));

await browser.close();
