import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const baseURL = process.env.HORTALAB_URL || "http://127.0.0.1:4173";
const candidates = [process.env.CHROME_PATH, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean);
const executablePath = candidates.find(existsSync);
if (!executablePath) throw new Error("Nenhum Chromium instalado foi encontrado.");

const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR", acceptDownloads: true });
const page = await context.newPage();
const errors = [];
const warnings = [];
const externalRequests = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); if (message.type() === "warning") warnings.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => { const url = new URL(request.url()); if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) externalRequests.push(request.url()); });
const check = (condition, message) => { if (!condition) throw new Error(message); };

await page.goto(`${baseURL}/index-v2.html`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
check((await page.title()).includes("layout isométrico"), "A versão enxuta não carregou.");
check(await page.locator("#v2Essentials").isVisible(), "A etapa essencial não está visível.");
await page.locator("[data-v2-next]").first().click();
await page.locator('[data-v2-scenario="expanded"]').click();
await page.locator('[data-v2-panel="2"] [data-v2-next]').click();
check((await page.locator("#v2CompositionArea").textContent()).includes("50,0 de 50,0"), "O cenário de 50 m² não totaliza 50 m².");
check(await page.locator("#v2ComponentList .v2-component-row").count() === 11, "A composição expandida deveria ter 11 componentes.");
await page.locator('[data-v2-panel="3"] [data-v2-next]').click();
check(await page.locator("#v2IsoCanvas").isVisible(), "O canvas isométrico não está visível.");
check(await page.locator("#v2IsoCanvas .iso-hit").count() === 11, "A cena isométrica não renderizou todos os componentes.");
await page.locator('[data-v2-layout-select]').first().click();
await page.locator('[data-v2-nudge="ArrowRight"]').click();
await page.locator("#v2Rotate").click();
check((await page.locator("#v2Live").textContent()).includes("Vista girada"), "A rotação não atualizou o feedback.");
await page.locator('[data-v2-panel="4"] [data-v2-next]').click();
await page.locator("#v2Activities input").first().check();
await page.locator("#v2Note").fill("Acompanhar germinação e registrar medidas.");
await page.locator('[data-v2-panel="5"] [data-v2-next]').click();
check(await page.locator("#v2Summary").isVisible(), "O resumo não foi gerado.");
check((await page.locator("#v2Summary").textContent()).includes("50 m²"), "O resumo não preservou o cenário.");
const downloadPromise = page.waitForEvent("download");
await page.locator("#v2Export").click();
const download = await downloadPromise;
const exportedPath = join(tmpdir(), "hortalab-v2-e2e.json");
await download.saveAs(exportedPath);
const exported = JSON.parse(await readFile(exportedPath, "utf8"));
check(exported.state.scenarioId === "expanded", "A exportação não preservou o cenário expandido.");
check(exported.state.components.reduce((sum, item) => sum + item.area, 0).toFixed(1) === "50.0", "A exportação não totaliza 50 m².");

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

check(errors.length === 0, `Erros de console: ${errors.join(" | ")}`);
check(warnings.length === 0, `Avisos de console: ${warnings.join(" | ")}`);
check(externalRequests.length === 0, `Requisições externas detectadas: ${externalRequests.join(" | ")}`);
await mkdir(resolve(".qa"), { recursive: true });
await page.screenshot({ path: join(resolve(".qa"), "v2-layout-desktop.png"), fullPage: false });
await page.setViewportSize({ width: 360, height: 800 });
await page.screenshot({ path: join(resolve(".qa"), "v2-layout-mobile.png"), fullPage: false });
console.log(JSON.stringify({ ok: true, viewports: [360, 768, 1024, 1440], consoleErrors: errors.length, consoleWarnings: warnings.length, externalRequests: externalRequests.length, screenshots: [".qa/v2-layout-desktop.png", ".qa/v2-layout-mobile.png"] }, null, 2));
await browser.close();
