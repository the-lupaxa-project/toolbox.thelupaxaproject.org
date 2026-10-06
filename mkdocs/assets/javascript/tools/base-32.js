"use strict";

(function () {
  const BAD = "That is not valid Base 32.";
  const BAD_UTF8 = "The decoded value is not valid UTF-8 text.";
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const PAD_BY_MOD = { 0: 0, 2: 6, 4: 4, 5: 3, 7: 1 };

  function encodeBase32(input) {
    const bytes = new TextEncoder().encode(input);
    let value = 0;
    let bits = 0;
    let output = "";
    for (const byte of bytes) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        output += ALPHABET[(value >> bits) & 31];
      }
    }
    if (bits > 0) {
      output += ALPHABET[(value << (5 - bits)) & 31];
    }
    return output + "=".repeat([0, 6, 4, 3, 1][bytes.length % 5]);
  }

  function decodeBase32(input) {
    const cleaned = input.replace(/[ \t\n]/g, "");
    const padStart = cleaned.indexOf("=");
    const rawBody = padStart === -1 ? cleaned : cleaned.slice(0, padStart);
    const padding = padStart === -1 ? "" : cleaned.slice(padStart);
    if (/[^=]/.test(padding) || /[^A-Za-z2-7]/.test(rawBody)) {
      return { ok: false, error: BAD };
    }
    const body = rawBody.toUpperCase();
    const expectedPad = PAD_BY_MOD[body.length % 8];
    if (expectedPad === undefined || (padding.length !== 0 && padding.length !== expectedPad)) {
      return { ok: false, error: BAD };
    }
    let value = 0;
    let bits = 0;
    const bytes = [];
    for (const character of body) {
      value = (value << 5) | ALPHABET.indexOf(character);
      bits += 5;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((value >> bits) & 255);
      }
    }
    try {
      return {
        ok: true,
        output: new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes)),
      };
    } catch (_err) {
      return { ok: false, error: BAD_UTF8 };
    }
  }

  function run(action, input) {
    if (action === "encode") {
      return { ok: true, output: encodeBase32(input) };
    }
    if (action === "decode") {
      return decodeBase32(input);
    }
    return { ok: false, error: "Unknown action." };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["base-32"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
