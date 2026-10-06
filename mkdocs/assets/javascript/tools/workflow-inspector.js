"use strict";

(function () {
  function run(action, input) {
    if (action !== "check") {
      return { ok: false, error: "Unknown action." };
    }
    return { ok: true, output: globalThis.LupaxaGithub.inspectWorkflow(input) };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["workflow-inspector"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
