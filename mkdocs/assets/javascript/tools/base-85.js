"use strict";

(function () {
  const BAD = "That is not valid Base 85.";
  const BAD_UTF8 = "The decoded value is not valid UTF-8 text.";

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
        return { ok: false, error: BAD };
      }
      const take = Math.min(5, remaining);
      const chunk = cleaned.slice(index, index + take);
      for (const character of chunk) {
        const code = character.charCodeAt(0);
        if (code < 33 || code > 117) {
          return { ok: false, error: BAD };
        }
      }
      const padded = chunk + "u".repeat(5 - take);
      let value = 0;
      for (const character of padded) {
        value = value * 85 + (character.charCodeAt(0) - 33);
      }
      if (value > 0xffffffff) {
        return { ok: false, error: BAD };
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

  function run(action, input) {
    if (action === "encode") {
      return { ok: true, output: encodeBase85(input) };
    }
    if (action === "decode") {
      return decodeBase85(input);
    }
    return { ok: false, error: "Unknown action." };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["base-85"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
