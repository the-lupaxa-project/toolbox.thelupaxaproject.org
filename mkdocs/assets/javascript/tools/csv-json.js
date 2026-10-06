"use strict";

(function () {
  function run(action, input) {
    if (action === "to-json") {
      return { ok: true, output: globalThis.LupaxaData.csvToJson(input) };
    }
    if (action === "to-csv") {
      return { ok: true, output: globalThis.LupaxaData.jsonToCsv(input) };
    }
    return { ok: false, error: "Unknown action." };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["csv-json"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
