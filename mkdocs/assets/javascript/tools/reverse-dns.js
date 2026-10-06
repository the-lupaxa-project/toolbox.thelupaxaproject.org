"use strict";

(function () {
  async function run(action, value) {
    if (action !== "look-up") {
      return { ok: false, error: "Unknown action." };
    }
    const dns = globalThis.LupaxaDns;
    const checked = dns.checkAddress(value.name);
    if (!checked.ok) {
      return checked;
    }
    const result = await dns.query({
      name: dns.reverseName(checked.value),
      type: "PTR",
      resolver: value.resolver,
      validate: false,
    });
    if (!result.ok) {
      return { ok: true, output: { result: result.error } };
    }
    const error = dns.dnsStatusError(result.status);
    if (error) {
      return { ok: true, output: { result: error } };
    }
    const resultText = result.answers.length === 0
      ? "No records."
      : result.answers.map((answer) => answer.data).join("\n");
    return { ok: true, output: { result: resultText } };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["reverse-dns"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
