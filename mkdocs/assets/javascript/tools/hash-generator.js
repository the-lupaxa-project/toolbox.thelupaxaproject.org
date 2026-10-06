"use strict";

(function () {
  const NAMES = {
    "sha-256": "SHA-256",
    "sha-384": "SHA-384",
    "sha-512": "SHA-512",
  };

  async function run(action, input) {
    const name = NAMES[action];
    if (!name) {
      return { ok: false, error: "Unknown action." };
    }
    try {
      const bytes = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest(name, bytes);
      const output = [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      return { ok: true, output };
    } catch (_err) {
      return { ok: false, error: "Could not hash the text." };
    }
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["hash-generator"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
