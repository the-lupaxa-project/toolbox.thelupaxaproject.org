"use strict";

(function () {
  const BAD_64 = "That is not valid Base64.";
  const BAD_16 = "That is not valid Base 16.";
  const BAD_32 = "That is not valid Base 32.";
  const BAD_58 = "That is not valid Base 58.";
  const BAD_85 = "That is not valid Base 85.";
  const BAD_UTF8 = "The decoded value is not valid UTF-8 text.";
  const CHOOSE = "Choose Base 16, 32, 58, 64, or 85.";
  const BASE_32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const BASE_32_PAD = { 0: 0, 2: 6, 4: 4, 5: 3, 7: 1 };
  const BASE_58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

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
      return { ok: false, error: BAD_64 };
    }
    const padStart = cleaned.indexOf("=");
    const body = padStart === -1 ? cleaned : cleaned.slice(0, padStart);
    const padding = padStart === -1 ? "" : cleaned.slice(padStart);
    if (padding.length > 2 || (padStart !== -1 && /[^=]/.test(padding))) {
      return { ok: false, error: BAD_64 };
    }
    const expectedPad = body.length % 4 === 0 ? 0 : 4 - (body.length % 4);
    if (expectedPad === 3) {
      return { ok: false, error: BAD_64 };
    }
    if (padding.length !== 0 && padding.length !== expectedPad) {
      return { ok: false, error: BAD_64 };
    }
    const padded = body + "=".repeat(expectedPad);
    let binary;
    try {
      binary = atob(padded);
    } catch (_err) {
      return { ok: false, error: BAD_64 };
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

  function encodeBase16(input) {
    const bytes = new TextEncoder().encode(input);
    let output = "";
    for (const byte of bytes) {
      output += byte.toString(16).padStart(2, "0").toUpperCase();
    }
    return output;
  }

  function decodeBase16(input) {
    const cleaned = input.replace(/[ \t\n]/g, "");
    if (cleaned.length % 2 !== 0 || /[^0-9a-fA-F]/.test(cleaned)) {
      return { ok: false, error: BAD_16 };
    }
    const bytes = new Uint8Array(cleaned.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
    }
    try {
      return { ok: true, output: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
    } catch (_err) {
      return { ok: false, error: BAD_UTF8 };
    }
  }

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
        output += BASE_32[(value >> bits) & 31];
      }
    }
    if (bits > 0) {
      output += BASE_32[(value << (5 - bits)) & 31];
    }
    return output + "=".repeat([0, 6, 4, 3, 1][bytes.length % 5]);
  }

  function decodeBase32(input) {
    const cleaned = input.replace(/[ \t\n]/g, "");
    const padStart = cleaned.indexOf("=");
    const rawBody = padStart === -1 ? cleaned : cleaned.slice(0, padStart);
    const padding = padStart === -1 ? "" : cleaned.slice(padStart);
    if (/[^=]/.test(padding) || /[^A-Za-z2-7]/.test(rawBody)) {
      return { ok: false, error: BAD_32 };
    }
    const body = rawBody.toUpperCase();
    const expectedPad = BASE_32_PAD[body.length % 8];
    if (expectedPad === undefined || (padding.length !== 0 && padding.length !== expectedPad)) {
      return { ok: false, error: BAD_32 };
    }
    let value = 0;
    let bits = 0;
    const bytes = [];
    for (const character of body) {
      value = (value << 5) | BASE_32.indexOf(character);
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
      output += BASE_58[digits[i]];
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
      const value = BASE_58.indexOf(cleaned[i]);
      if (value === -1) {
        return { ok: false, error: BAD_58 };
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

  function encodeBase85(input) {
    const bytes = [...new TextEncoder().encode(input)];
    let output = "";
    for (let i = 0; i < bytes.length; i += 4) {
      const count = Math.min(4, bytes.length - i);
      const group = bytes.slice(i, i + count);
      if (count === 4 && group.every((byte) => byte === 0)) {
        output += "z";
        continue;
      }
      while (group.length < 4) {
        group.push(0);
      }
      let value = group[0] * 16777216 + group[1] * 65536 + group[2] * 256 + group[3];
      const characters = new Array(5);
      for (let index = 4; index >= 0; index -= 1) {
        characters[index] = String.fromCharCode((value % 85) + 33);
        value = Math.floor(value / 85);
      }
      output += characters.join("").slice(0, count === 4 ? 5 : count + 1);
    }
    return output;
  }

  function decodeBase85(input) {
    const cleaned = input.replace(/[ \t\n]/g, "");
    const bytes = [];
    let index = 0;
    while (index < cleaned.length) {
      if (cleaned[index] === "z") {
        bytes.push(0, 0, 0, 0);
        index += 1;
        continue;
      }
      const remaining = cleaned.length - index;
      if (remaining === 1) {
        return { ok: false, error: BAD_85 };
      }
      const take = Math.min(5, remaining);
      const chunk = cleaned.slice(index, index + take);
      for (const character of chunk) {
        const code = character.charCodeAt(0);
        if (code < 33 || code > 117) {
          return { ok: false, error: BAD_85 };
        }
      }
      const padded = chunk + "u".repeat(5 - take);
      let value = 0;
      for (const character of padded) {
        value = value * 85 + (character.charCodeAt(0) - 33);
      }
      if (value > 0xffffffff) {
        return { ok: false, error: BAD_85 };
      }
      const produced = take === 5 ? 4 : take - 1;
      for (let shift = 3; shift > 3 - produced; shift -= 1) {
        bytes.push((value >>> (shift * 8)) & 255);
      }
      index += take;
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

  function dispatch(action, text, base) {
    if (base === "64") {
      return action === "encode"
        ? { ok: true, output: encodeBase64(text) }
        : decodeBase64(text);
    }
    if (base === "16") {
      return action === "encode"
        ? { ok: true, output: encodeBase16(text) }
        : decodeBase16(text);
    }
    if (base === "32") {
      return action === "encode"
        ? { ok: true, output: encodeBase32(text) }
        : decodeBase32(text);
    }
    if (base === "58") {
      return action === "encode"
        ? { ok: true, output: encodeBase58(text) }
        : decodeBase58(text);
    }
    if (base === "85") {
      return action === "encode"
        ? { ok: true, output: encodeBase85(text) }
        : decodeBase85(text);
    }
    return { ok: false, error: CHOOSE };
  }

  function run(action, fields) {
    if (action !== "encode" && action !== "decode") {
      return { ok: false, error: "Unknown action." };
    }
    const value = fields && typeof fields === "object" ? fields : {};
    const text = typeof value.text === "string" ? value.text : "";
    return dispatch(action, text, value.base);
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["base-n"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
