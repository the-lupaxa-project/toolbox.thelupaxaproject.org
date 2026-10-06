"use strict";

(function () {
  function run(action, input) {
    if (action === "format") {
      return { ok: true, output: globalThis.LupaxaData.formatXml(input) };
    }
    if (action === "minify") {
      return { ok: true, output: globalThis.LupaxaData.minifyXml(input) };
    }
    return { ok: false, error: "Unknown action." };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["xml-formatter"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
