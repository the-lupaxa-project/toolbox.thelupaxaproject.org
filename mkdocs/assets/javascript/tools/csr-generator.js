"use strict";

(function () {
  function certificates() {
    if (globalThis.LupaxaCertificates) {
      return globalThis.LupaxaCertificates;
    }
    return require("../certificates.js");
  }

  async function run(action, input) {
    if (action !== "generate") {
      return { ok: false, error: "Unknown action." };
    }
    return certificates().createCsr(input);
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["csr-generator"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
