"use strict";

(function () {
  function run(action, input) {
    if (action === "to-yaml") {
      return { ok: true, output: globalThis.LupaxaData.csvToYaml(input) };
    }
    if (action === "to-csv") {
      return { ok: true, output: globalThis.LupaxaData.yamlToCsv(input) };
    }
    return { ok: false, error: "Unknown action." };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["csv-yaml"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
