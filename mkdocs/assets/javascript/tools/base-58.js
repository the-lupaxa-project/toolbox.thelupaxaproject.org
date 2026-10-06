"use strict";

(function () {
  const BAD = "That is not valid Base 58.";
  const BAD_UTF8 = "The decoded value is not valid UTF-8 text.";
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

  function encodeBase58(input) {
    const bytes = [...new TextEncoder().encode(input)];
    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) {
      zeros += 1;
    }
    const digits = [0];
    for (let i = zeros; i < bytes.length; i += 1) {
      let carry = bytes[i];
      for (let j = 0; j < digits.length; j += 1) {
        carry += digits[j] * 256;
        digits[j] = carry % 58;
        carry = Math.floor(carry / 58);
      }
      while (carry > 0) {
        digits.push(carry % 58);
        carry = Math.floor(carry / 58);
      }
    }
    let output = "1".repeat(zeros);
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      if (output.length === zeros && digits[i] === 0) {
        continue;
      }
      output += ALPHABET[digits[i]];
    }
    return output;
  }

  function decodeBase58(input) {
    const cleaned = input.replace(/[ \t\n]/g, "");
    let zeros = 0;
    while (zeros < cleaned.length && cleaned[zeros] === "1") {
      zeros += 1;
    }
    const digits = [0];
    for (let i = zeros; i < cleaned.length; i += 1) {
      const value = ALPHABET.indexOf(cleaned[i]);
      if (value === -1) {
        return { ok: false, error: BAD };
      }
      let carry = value;
      for (let j = 0; j < digits.length; j += 1) {
        carry += digits[j] * 58;
        digits[j] = carry % 256;
        carry = Math.floor(carry / 256);
      }
      while (carry > 0) {
        digits.push(carry % 256);
        carry = Math.floor(carry / 256);
      }
    }
    const bytes = [];
    for (let i = 0; i < zeros; i += 1) {
      bytes.push(0);
    }
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      if (bytes.length === zeros && digits[i] === 0) {
        continue;
      }
      bytes.push(digits[i]);
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
      return { ok: true, output: encodeBase58(input) };
    }
    if (action === "decode") {
      return decodeBase58(input);
    }
    return { ok: false, error: "Unknown action." };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["base-58"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
