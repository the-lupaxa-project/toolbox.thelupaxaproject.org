"use strict";

(function () {
  function run(action, input) {
    if (action !== "check") {
      return { ok: false, error: "Unknown action." };
    }
    return { ok: true, output: globalThis.LupaxaGithub.checkWorkflow(input) };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["actions-yaml-validator"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
