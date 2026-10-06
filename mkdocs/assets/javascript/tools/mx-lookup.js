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
      type: "MX",
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
    const rows = result.answers.filter((answer) => answer.type === 15).map((answer, index) => {
      const [preference, host] = String(answer.data).split(/\s+/, 2);
      return { preference: Number(preference), host, index };
    });
    rows.sort((left, right) => left.preference - right.preference || left.index - right.index);
    const resultText = rows.length === 0
      ? "No records."
      : rows.map((row) => `${row.preference} ${row.host}`).join("\n");
    return { ok: true, output: { result: resultText } };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["mx-lookup"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
