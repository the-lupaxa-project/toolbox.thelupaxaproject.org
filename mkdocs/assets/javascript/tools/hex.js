"use strict";

(function () {
  const BAD = "That is not valid hex.";
  const BAD_UTF8 = "The decoded value is not valid UTF-8 text.";

  function run(action, input) {
    if (action === "encode") {
      const bytes = new TextEncoder().encode(input);
      let output = "";
      for (const byte of bytes) {
        output += byte.toString(16).padStart(2, "0");
      }
      return { ok: true, output };
    }
    if (action === "decode") {
      const cleaned = input.replace(/[ \t\n\r\f\v]/g, "");
      if (cleaned.length % 2 !== 0 || /[^0-9a-fA-F]/.test(cleaned)) {
        return { ok: false, error: BAD };
      }
      const bytes = new Uint8Array(cleaned.length / 2);
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
      }
      try {
        return {
          ok: true,
          output: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        };
      } catch (_err) {
        return { ok: false, error: BAD_UTF8 };
      }
    }
    return { ok: false, error: "Unknown action." };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools.hex = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
