(function (global) {
  "use strict";

  const IDB_NAME = "hortalab-escola-device";
  const IDB_STORE = "sqlite-files";
  const IDB_KEY = "main";
  const SCHEMA = `
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      schema_version INTEGER NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `;

  let sql = null;
  let database = null;
  let readyPromise = null;
  let writeQueue = Promise.resolve();

  function openStore() {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error("IndexedDB não está disponível neste navegador."));
        return;
      }
      const request = global.indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(IDB_STORE)) request.result.createObjectStore(IDB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Não foi possível abrir o armazenamento local."));
    });
  }

  async function readBytes() {
    const store = await openStore();
    return new Promise((resolve, reject) => {
      const request = store.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(IDB_KEY);
      request.onsuccess = () => {
        store.close();
        resolve(request.result ? new Uint8Array(request.result) : null);
      };
      request.onerror = () => { store.close(); reject(request.error); };
    });
  }

  async function writeBytes(bytes) {
    const store = await openStore();
    return new Promise((resolve, reject) => {
      const request = store.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).put(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), IDB_KEY);
      request.onsuccess = () => { store.close(); resolve(); };
      request.onerror = () => { store.close(); reject(request.error || new Error("Não foi possível salvar o banco local.")); };
    });
  }

  function stateFromRow(row) {
    if (!row || typeof row.payload !== "string") return null;
    try {
      const parsed = JSON.parse(row.payload);
      if (!parsed || typeof parsed !== "object" || !parsed.scenarioId || !Array.isArray(parsed.components)) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function stateRow() {
    const result = database.exec("SELECT schema_version, payload, updated_at FROM app_state WHERE id = 1 LIMIT 1");
    if (!result.length || !result[0].values.length) return null;
    const [schemaVersion, payload, updatedAt] = result[0].values[0];
    return { schemaVersion, payload, updatedAt };
  }

  async function persist() {
    const bytes = database.export();
    await writeBytes(new Uint8Array(bytes));
  }

  async function ensure() {
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
      if (typeof global.initSqlJs !== "function") throw new Error("O motor SQLite local não foi carregado.");
      sql = await global.initSqlJs({ locateFile: (file) => `assets/vendor/${file}` });
      const bytes = await readBytes();
      database = bytes ? new sql.Database(bytes) : new sql.Database();
      database.run(SCHEMA);
      if (!bytes) await persist();
      return database;
    })();
    try {
      return await readyPromise;
    } catch (error) {
      readyPromise = null;
      throw error;
    }
  }

  async function loadState() {
    await ensure();
    return stateFromRow(stateRow());
  }

  function saveState(state) {
    writeQueue = writeQueue.catch(() => undefined).then(async () => {
      await ensure();
      const payload = JSON.stringify(state);
      database.run("INSERT OR REPLACE INTO app_state (id, schema_version, payload, updated_at) VALUES (1, ?, ?, ?)", [Number(state.schemaVersion || 1), payload, String(state.updatedAt || new Date().toISOString())]);
      await persist();
    });
    return writeQueue;
  }

  async function exportSqlite() {
    await ensure();
    await writeQueue;
    return new Blob([new Uint8Array(database.export())], { type: "application/vnd.sqlite3" });
  }

  async function importSqlite(bytes) {
    await ensure();
    await writeQueue;
    let candidate;
    try {
      candidate = new sql.Database(new Uint8Array(bytes));
      candidate.run(SCHEMA);
      const result = candidate.exec("SELECT schema_version, payload, updated_at FROM app_state WHERE id = 1 LIMIT 1");
      if (!result.length || !result[0].values.length) throw new Error("O arquivo não contém um plano HortaLab.");
      const payload = result[0].values[0][1];
      const parsed = JSON.parse(payload);
      if (!parsed || typeof parsed !== "object" || !parsed.scenarioId || !Array.isArray(parsed.components)) throw new Error("O plano SQLite não tem uma estrutura reconhecida.");
      database.close();
      database = candidate;
      await persist();
      return parsed;
    } catch (error) {
      if (candidate) candidate.close();
      throw new Error(error.message || "Não foi possível importar o banco SQLite.");
    }
  }

  async function clear() {
    await ensure();
    await writeQueue;
    database.run("DELETE FROM app_state");
    await persist();
  }

  global.HortaLocalDB = Object.freeze({
    ready: ensure,
    loadState,
    saveState,
    exportSqlite,
    importSqlite,
    clear
  });
}(window));
