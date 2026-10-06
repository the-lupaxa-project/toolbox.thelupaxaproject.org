"use strict";

(function () {
  function run(action, input) {
    if (action === "to-yaml") {
      return { ok: true, output: globalThis.LupaxaData.jsonToYaml(input) };
    }
    if (action === "to-json") {
      return { ok: true, output: globalThis.LupaxaData.yamlToJson(input) };
    }
    return { ok: false, error: "Unknown action." };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["json-yaml"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
