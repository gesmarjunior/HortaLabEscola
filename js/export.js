(function () {
  "use strict";
  const HL = window.HortaLab;

  function portableState(state) {
    const copy = HL.clone(state);
    delete copy.selectedComponentId;
    copy.exportedAt = new Date().toISOString();
    copy.product = "HortaLab Escola";
    return copy;
  }

  function downloadJSON(state) {
    const blob = new Blob([JSON.stringify(portableState(state), null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hortalab-plano-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
    HL.announce("Plano exportado em JSON. O arquivo foi salvo pelo navegador.");
  }

  function importJSONFile(file) {
    if (!file) return Promise.reject(new Error("Nenhum arquivo foi selecionado."));
    if (file.size > 2_000_000) return Promise.reject(new Error("O arquivo é grande demais para ser um plano do HortaLab."));
    return file.text().then((text) => {
      let parsed;
      try { parsed = JSON.parse(text); }
      catch (error) { throw new Error("O arquivo não contém JSON válido."); }
      return HL.validateAndNormalize(parsed);
    });
  }

  Object.assign(HL, { portableState, downloadJSON, importJSONFile });
}());
