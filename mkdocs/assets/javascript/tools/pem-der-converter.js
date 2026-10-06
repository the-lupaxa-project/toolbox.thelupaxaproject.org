"use strict";

(function () {
  function certificates() {
    if (globalThis.LupaxaCertificates) {
      return globalThis.LupaxaCertificates;
    }
    return require("../certificates.js");
  }

  async function run(action, input) {
    if (action === "to-der") {
      return certificates().certificateToDer(input);
    }
    if (action === "to-pem") {
      return certificates().derToCertificate(input);
    }
    return { ok: false, error: "Unknown action." };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["pem-der-converter"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
