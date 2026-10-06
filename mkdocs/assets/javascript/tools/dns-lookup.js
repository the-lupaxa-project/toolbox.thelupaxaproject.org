"use strict";

(function () {
  async function run(action, value) {
    if (action !== "look-up") {
      return { ok: false, error: "Unknown action." };
    }
    const dns = globalThis.LupaxaDns;
    const checked = dns.checkName(value.name);
    if (!checked.ok) {
      return checked;
    }
    const result = await dns.query({
      name: checked.value,
      type: String(value["record-type"]).toUpperCase(),
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
      : result.answers.map((answer) => `${answer.name} ${answer.ttl} ${answer.data}`).join("\n");
    return { ok: true, output: { result: resultText } };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["dns-lookup"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
