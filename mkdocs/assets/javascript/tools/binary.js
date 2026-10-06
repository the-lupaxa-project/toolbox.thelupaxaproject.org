"use strict";

(function () {
  const BAD = "That is not valid binary.";
  const BAD_UTF8 = "The decoded value is not valid UTF-8 text.";

  function run(action, input) {
    if (action === "encode") {
      const bytes = new TextEncoder().encode(input);
      let output = "";
      for (const byte of bytes) {
        output += byte.toString(2).padStart(8, "0");
      }
      return { ok: true, output };
    }
    if (action === "decode") {
      const cleaned = input.replace(/[ \t\n]/g, "");
      if (cleaned.length % 8 !== 0 || /[^01]/.test(cleaned)) {
        return { ok: false, error: BAD };
      }
      const bytes = new Uint8Array(cleaned.length / 8);
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Number.parseInt(cleaned.slice(i * 8, i * 8 + 8), 2);
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
  globalThis.LupaxaTools.binary = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
