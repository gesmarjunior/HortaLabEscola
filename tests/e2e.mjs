import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const baseURL = process.env.HORTALAB_URL || "http://127.0.0.1:4173";
const candidates = [process.env.CHROME_PATH, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean);
const executablePath = candidates.find(existsSync);
if (!executablePath) throw new Error("Nenhum Chromium instalado foi encontrado.");

const qaDir = join(tmpdir(), "hortalab-escola-qa");
await mkdir(qaDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR", acceptDownloads: true });
const page = await context.newPage();
const errors = [];
const warnings = [];
const externalRequests = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); if (message.type() === "warning") warnings.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => { const url = new URL(request.url()); if (!["127.0.0.1", "localhost"].includes(url.hostname) && !["data:", "blob:"].includes(url.protocol)) externalRequests.push(request.url()); });
page.on("dialog", (dialog) => dialog.accept());
const check = (condition, message) => { if (!condition) throw new Error(message); };
const text = async (selector) => (await page.locator(selector).textContent()) || "";
const expectText = async (selector, expected) => { await page.waitForFunction(({ selector, expected }) => document.querySelector(selector)?.textContent.includes(expected), { selector, expected }); check((await text(selector)).includes(expected), `Esperava "${expected}" em ${selector}.`); };

await page.goto(`${baseURL}/index.html`, { waitUntil: "networkidle" });
await page.evaluate(() => new Promise((resolve) => { const request = indexedDB.deleteDatabase("hortalab-escola-device"); request.onsuccess = request.onerror = request.onblocked = () => resolve(); }));
await page.reload({ waitUntil: "networkidle" });
check((await page.title()).includes("planejamento visual"), "A entrada oficial não carregou.");
check(await page.locator("#v2Essentials").isVisible(), "A etapa essencial não está visível.");
await expectText("#v2StorageStatus", "SQLite local · salvo");

await page.locator("[data-v2-next]").first().click();
await page.locator('[data-v2-scenario="expanded"]').click();
await page.locator('[data-v2-panel="2"] [data-v2-next]').click();
check((await text("#v2CompositionArea")).includes("50,0 de 50,0"), "O cenário de 50 m² não totaliza 50 m².");
check(await page.locator("#v2PlotGrid .v2-plot-item").count() === 11, "A composição expandida deveria ter 11 zonas.");
const firstCompositionId = await page.locator("#v2PlotGrid .v2-plot-item").first().getAttribute("data-v2-component-id");
await page.locator("#v2PlotGrid [data-v2-select]").first().click();
check(await page.locator("#v2ComponentEditor").isVisible(), "O editor da zona selecionada não abriu.");
await page.locator('[data-v2-add="signage"]').click();
check((await text("#v2Live")).includes("Não há área livre"), "A composição cheia deveria explicar por que não aceita outro componente.");
check(await page.locator("#v2PlotGrid .v2-plot-item").count() === 11, "Um componente impossível foi adicionado ao cenário cheio.");
await page.locator("#v2CompositionAreaInput").fill("100");
await page.locator("#v2CompositionAreaInput").press("Tab");
check((await text("#v2CompositionArea")).includes("50,0 de 50,0"), "A edição de área permitiu ultrapassar o cenário.");
await page.locator('[data-v2-move="1"]').click();
check((await page.locator("#v2PlotGrid .v2-plot-item").first().getAttribute("data-v2-component-id")) !== firstCompositionId, "O controle acessível não reordenou a composição.");
await page.locator('[data-v2-history="undo"]').click();
check((await page.locator("#v2PlotGrid .v2-plot-item").first().getAttribute("data-v2-component-id")) === firstCompositionId, "Desfazer não restaurou a ordem anterior.");
await page.locator('[data-v2-plot-view="list"]').click();
check(await page.locator("#v2PlotGrid").getAttribute("data-view") === "list", "A visualização em lista não foi ativada.");
await page.locator('[data-v2-plot-view="map"]').click();
await page.locator("[data-v2-grid-toggle]").click();
check(await page.locator("#v2PlotGrid").evaluate((node) => node.classList.contains("is-grid-hidden")), "O controle de grade não ocultou a grade.");
await page.locator("[data-v2-grid-toggle]").click();
check(!(await page.locator("#v2PlotGrid").evaluate((node) => node.classList.contains("is-grid-hidden"))), "O controle de grade não restaurou a grade.");
await page.locator("#v2PlotGrid .v2-plot-item").first().dragTo(page.locator("#v2PlotGrid .v2-plot-item").nth(2));
check((await page.locator("#v2PlotGrid .v2-plot-item").first().getAttribute("data-v2-component-id")) !== firstCompositionId, "Arrastar não reordenou a composição.");
await page.locator('[data-v2-history="undo"]').click();
check((await page.locator("#v2PlotGrid .v2-plot-item").first().getAttribute("data-v2-component-id")) === firstCompositionId, "Desfazer não restaurou a ordem após arrastar.");
await page.locator("#v2Library").evaluate((node) => { node.scrollTop = 0; });
await page.locator("#v2PlotGrid").scrollIntoViewIfNeeded();
await page.screenshot({ path: join(qaDir, "composition-desktop.png"), fullPage: false });
await page.locator('[data-v2-panel="3"] [data-v2-next]').click();
check(await page.locator("#v2IsoCanvas").isVisible(), "O layout isométrico não está visível.");
check(await page.locator("#v2IsoCanvas .iso-hit").count() === 11, "A cena não renderizou todos os componentes.");
await page.locator('[data-v2-layout-select]').first().click();
await page.locator('[data-v2-nudge="ArrowRight"]').click();
await page.locator("#v2Rotate").click();
check((await text("#v2Live")).includes("Vista girada"), "A rotação não atualizou o feedback.");

await page.locator('[data-v2-panel="4"] [data-v2-next]').click();
await page.locator("#v2Activities input").first().check();
await page.locator("#v2Note").fill("Acompanhar germinação e registrar medidas.");
await page.locator('[data-v2-panel="5"] [data-v2-next]').click();
check(await page.locator("#v2Summary").isVisible(), "O resumo não foi gerado.");
check((await text("#v2Summary")).includes("50 m²"), "O resumo não preservou o cenário.");

const jsonDownloadPromise = page.waitForEvent("download");
await page.locator("#v2Export").click();
const jsonDownload = await jsonDownloadPromise;
const jsonPath = join(tmpdir(), "hortalab-plano-e2e.json");
await jsonDownload.saveAs(jsonPath);
const exported = JSON.parse(await readFile(jsonPath, "utf8"));
check(exported.state.scenarioId === "expanded", "O JSON não preservou o cenário.");
check(exported.state.components.reduce((sum, item) => sum + item.area, 0).toFixed(1) === "50.0", "O JSON exportado não totaliza 50 m².");

const sqliteDownloadPromise = page.waitForEvent("download");
await page.locator("#v2ExportSqlite").click();
const sqliteDownload = await sqliteDownloadPromise;
const sqlitePath = join(tmpdir(), "hortalab-escola-e2e.sqlite");
await sqliteDownload.saveAs(sqlitePath);
const sqliteBytes = await readFile(sqlitePath);
check(sqliteBytes.byteLength > 1000, "O backup SQLite parece incompleto.");
check(sqliteBytes.subarray(0, 15).toString("ascii") === "SQLite format 3", "O arquivo exportado não tem cabeçalho SQLite.");

await page.reload({ waitUntil: "networkidle" });
check(await page.locator('[data-v2-panel="6"]').isVisible(), "A etapa atual não foi restaurada pelo SQLite.");
await page.locator("#v2ResetBottom").click();
await expectText("#v2StorageStatus", "SQLite local · salvo");
check(await page.locator('[data-v2-panel="1"]').isVisible(), "O reinício não voltou ao início.");
await page.setInputFiles("#v2ImportFile", jsonPath);
await expectText("#v2Live", "Plano importado");
check(await page.locator('[data-v2-panel="6"]').isVisible(), "A importação JSON não restaurou o resumo.");
await page.locator("#v2ResetBottom").click();
await expectText("#v2StorageStatus", "SQLite local · salvo");
await page.setInputFiles("#v2ImportFile", sqlitePath);
await expectText("#v2Live", "Plano importado");
check(await page.locator('[data-v2-panel="6"]').isVisible(), "A importação SQLite não restaurou o resumo.");
check((await text("#v2Summary")).includes("50 m²"), "A importação SQLite perdeu o cenário.");

await page.emulateMedia({ media: "print" });
check(await page.locator("#v2Summary").isVisible(), "O resumo não aparece para impressão.");
await page.emulateMedia({ media: "screen" });

for (const width of [360, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: width === 360 ? 800 : 900 });
  await page.locator('[data-v2-step="4"]').click();
  const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  check(metrics.scrollWidth <= metrics.clientWidth + 1, `Overflow horizontal em ${width}px: ${metrics.scrollWidth} > ${metrics.clientWidth}`);
  check(await page.locator("#v2IsoCanvas").isVisible(), `Layout isométrico não visível em ${width}px.`);
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.locator("#v2IsoCanvas").scrollIntoViewIfNeeded();
await page.screenshot({ path: join(qaDir, "layout-desktop.png"), fullPage: false });
await page.setViewportSize({ width: 360, height: 800 });
await page.locator("#v2IsoCanvas").scrollIntoViewIfNeeded();
await page.screenshot({ path: join(qaDir, "layout-mobile.png"), fullPage: false });
await page.locator('[data-v2-step="3"]').click();
await page.locator("#v2PlotGrid").scrollIntoViewIfNeeded();
await page.screenshot({ path: join(qaDir, "composition-mobile.png"), fullPage: false });

check(errors.length === 0, `Erros de console: ${errors.join(" | ")}`);
check(warnings.length === 0, `Avisos de console: ${warnings.join(" | ")}`);
check(externalRequests.length === 0, `Requisições externas detectadas: ${externalRequests.join(" | ")}`);
console.log(JSON.stringify({ ok: true, page: "index.html", sqlite: true, jsonExport: true, jsonImport: true, viewports: [360, 768, 1024, 1440], consoleErrors: errors.length, consoleWarnings: warnings.length, externalRequests: externalRequests.length, screenshots: [join(qaDir, "composition-desktop.png"), join(qaDir, "composition-mobile.png"), join(qaDir, "layout-desktop.png"), join(qaDir, "layout-mobile.png")] }, null, 2));
await browser.close();
