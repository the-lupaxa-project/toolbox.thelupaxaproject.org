"use strict";

(function () {
  function run(action, input) {
    if (action === "encode") {
      return { ok: true, output: encodeURIComponent(input) };
    }
    if (action === "decode") {
      try {
        return { ok: true, output: decodeURIComponent(input) };
      } catch (_err) {
        return { ok: false, error: "That is not valid URL encoding." };
      }
    }
    return { ok: false, error: "Unknown action." };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["url-encode-decode"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
