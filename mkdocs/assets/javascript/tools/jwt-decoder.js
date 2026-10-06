"use strict";

(function () {
  const BAD_PARTS = "A JWT has three parts separated by dots.";
  const BAD_B64 = "That is not valid Base64url.";

  function decodeSegment(segment) {
    if (!/^[A-Za-z0-9_-]+$/.test(segment)) {
      return { ok: false, error: BAD_B64 };
    }
    const pad = segment.length % 4 === 0 ? "" : "=".repeat(4 - (segment.length % 4));
    const b64 = segment.replace(/-/g, "+").replace(/_/g, "/") + pad;
    let binary;
    try {
      binary = atob(b64);
    } catch (_err) {
      return { ok: false, error: BAD_B64 };
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    try {
      return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
    } catch (_err) {
      return { ok: false, error: BAD_B64 };
    }
  }

  function parseJson(text, error) {
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch (_err) {
      return { ok: false, error };
    }
  }

  function run(action, input) {
    if (action !== "decode") {
      return { ok: false, error: "Unknown action." };
    }
    const parts = input.split(".");
    if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
      return { ok: false, error: BAD_PARTS };
    }
    const headerSeg = decodeSegment(parts[0]);
    if (!headerSeg.ok) {
      return headerSeg;
    }
    const payloadSeg = decodeSegment(parts[1]);
    if (!payloadSeg.ok) {
      return payloadSeg;
    }
    const header = parseJson(headerSeg.text, "The header is not valid JSON.");
    if (!header.ok) {
      return header;
    }
    const payload = parseJson(payloadSeg.text, "The payload is not valid JSON.");
    if (!payload.ok) {
      return payload;
    }
    const output = [
      "Header",
      JSON.stringify(header.value, null, 2),
      "",
      "Payload",
      JSON.stringify(payload.value, null, 2),
      "",
      "Signature",
      parts[2],
    ].join("\n");
    return { ok: true, output };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["jwt-decoder"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
