const CACHE_NAME = "hortalab-escola-v2-2-0";
const APP_SHELL = [
  "./", "./index.html", "./cartilha.html", "./manifest.webmanifest",
  "./css/styles.css", "./css/simulator.css", "./css/cartilha.css", "./css/print.css",
  "./js/data.js", "./js/state.js", "./js/rules.js", "./js/storage.js", "./js/charts.js",
  "./js/simulator.js", "./js/export.js", "./js/app.js", "./js/cartilha.js",
  "./index.html", "./css/planner.css?v=2.2.0", "./js/planner.js?v=2.2.0", "./js/local-db.js",
  "./assets/vendor/sql-wasm.js", "./assets/vendor/sql-wasm.wasm",
  "./assets/icons/favicon.svg", "./assets/images/hero-planejamento.jpg",
  "./assets/images/pesquisa-acao.jpg", "./assets/images/eventos-adaptacao.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(request).then((match) => match || caches.match("./index.html"))));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  })));
});
