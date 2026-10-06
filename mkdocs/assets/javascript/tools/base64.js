"use strict";

(function () {
  const BAD = "That is not valid Base64.";
  const BAD_UTF8 = "The decoded value is not valid UTF-8 text.";

  function encodeBase64(input) {
    const bytes = new TextEncoder().encode(input);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function decodeBase64(input) {
    const cleaned = input.replace(/[ \t\n\r\f\v]/g, "");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
      return { ok: false, error: BAD };
    }
    const padStart = cleaned.indexOf("=");
    const body = padStart === -1 ? cleaned : cleaned.slice(0, padStart);
    const padding = padStart === -1 ? "" : cleaned.slice(padStart);
    if (padding.length > 2 || (padStart !== -1 && /[^=]/.test(padding))) {
      return { ok: false, error: BAD };
    }
    const expectedPad = body.length % 4 === 0 ? 0 : 4 - (body.length % 4);
    if (expectedPad === 3) {
      return { ok: false, error: BAD };
    }
    if (padding.length !== 0 && padding.length !== expectedPad) {
      return { ok: false, error: BAD };
    }
    const padded = body + "=".repeat(expectedPad);
    let binary;
    try {
      binary = atob(padded);
    } catch (_err) {
      return { ok: false, error: BAD };
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    try {
      return { ok: true, output: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
    } catch (_err) {
      return { ok: false, error: BAD_UTF8 };
    }
  }

  function run(action, input) {
    if (action === "encode") {
      return { ok: true, output: encodeBase64(input) };
    }
    if (action === "decode") {
      return decodeBase64(input);
    }
    return { ok: false, error: "Unknown action." };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools.base64 = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
