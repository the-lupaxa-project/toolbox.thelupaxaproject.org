"use strict";

(function () {
  function run(action, input) {
    if (action === "format") {
      return { ok: true, output: globalThis.LupaxaData.formatJson(input) };
    }
    if (action === "minify") {
      return { ok: true, output: globalThis.LupaxaData.minifyJson(input) };
    }
    return { ok: false, error: "Unknown action." };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["json-formatter"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
