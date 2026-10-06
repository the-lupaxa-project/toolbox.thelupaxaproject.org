"use strict";

(function () {
  function bytesToUuid(bytes) {
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function randomBytes() {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }

  function version4() {
    const cryptoObj = globalThis.crypto;
    if (typeof cryptoObj.randomUUID === "function") {
      return cryptoObj.randomUUID();
    }
    const bytes = randomBytes();
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return bytesToUuid(bytes);
  }

  function version7() {
    const bytes = randomBytes();
    const now = Date.now();
    bytes[0] = Math.floor(now / 2 ** 40) & 0xff;
    bytes[1] = Math.floor(now / 2 ** 32) & 0xff;
    bytes[2] = Math.floor(now / 2 ** 24) & 0xff;
    bytes[3] = Math.floor(now / 2 ** 16) & 0xff;
    bytes[4] = Math.floor(now / 2 ** 8) & 0xff;
    bytes[5] = now & 0xff;
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return bytesToUuid(bytes);
  }

  function run(action, fields) {
    if (action !== "generate") {
      return { ok: false, error: "Unknown action." };
    }
    const version = String(fields.version ?? "").trim();
    if (version !== "4" && version !== "7") {
      return { ok: false, error: "Choose version 4 or 7." };
    }
    const countText = String(fields.count ?? "").trim();
    if (!/^(?:[1-9]|1[0-9]|20)$/.test(countText)) {
      return { ok: false, error: "Enter a count from 1 to 20." };
    }
    const cryptoObj = globalThis.crypto;
    const hasRandom = cryptoObj && (
      version === "7"
        ? typeof cryptoObj.getRandomValues === "function"
        : typeof cryptoObj.randomUUID === "function" || typeof cryptoObj.getRandomValues === "function"
    );
    if (!hasRandom) {
      return { ok: false, error: "Could not generate a UUID." };
    }
    const lines = [];
    const count = Number(countText);
    for (let i = 0; i < count; i += 1) {
      lines.push(version === "4" ? version4() : version7());
    }
    return { ok: true, output: { result: `${lines.join("\n")}\n` } };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["uuid-generator"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
