"use strict";

(function () {
  const BAD = "That is not valid octal.";
  const BAD_UTF8 = "The decoded value is not valid UTF-8 text.";

  function run(action, input) {
    if (action === "encode") {
      const bytes = new TextEncoder().encode(input);
      let output = "";
      for (const byte of bytes) {
        output += byte.toString(8).padStart(3, "0");
      }
      return { ok: true, output };
    }
    if (action === "decode") {
      const cleaned = input.replace(/[ \t\n]/g, "");
      if (cleaned.length % 3 !== 0 || /[^0-7]/.test(cleaned)) {
        return { ok: false, error: BAD };
      }
      const bytes = new Uint8Array(cleaned.length / 3);
      for (let i = 0; i < bytes.length; i += 1) {
        const value = Number.parseInt(cleaned.slice(i * 3, i * 3 + 3), 8);
        if (value > 255) {
          return { ok: false, error: BAD };
        }
        bytes[i] = value;
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
  globalThis.LupaxaTools.octal = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
