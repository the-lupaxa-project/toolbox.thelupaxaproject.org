"use strict";

(function () {
  function certificates() {
    if (globalThis.LupaxaCertificates) {
      return globalThis.LupaxaCertificates;
    }
    return require("../certificates.js");
  }

  async function run(action, input) {
    if (action !== "inspect") {
      return { ok: false, error: "Unknown action." };
    }
    return certificates().inspectCertificate(input);
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["certificate-inspector"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
