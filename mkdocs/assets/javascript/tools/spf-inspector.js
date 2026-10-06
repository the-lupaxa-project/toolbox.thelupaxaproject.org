"use strict";

(function () {
  const QUALIFIERS = { "+": "pass", "-": "fail", "~": "softfail", "?": "neutral" };

  function spfOutput(record) {
    return record.trim().split(/\s+/).slice(1).map((term) => {
      const qualifier = QUALIFIERS[term[0]] || "pass";
      const rest = QUALIFIERS[term[0]] ? term.slice(1) : term;
      return `${qualifier} ${rest}`;
    }).join("\n");
  }

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
      type: "TXT",
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
    const spfRecords = result.answers.filter((answer) =>
      String(answer.data).startsWith("v=spf1"),
    );
    if (spfRecords.length === 0) {
      return { ok: true, output: { result: "No SPF record." } };
    }
    if (spfRecords.length > 1) {
      return { ok: true, output: { result: "More than one SPF record." } };
    }
    return { ok: true, output: { result: spfOutput(spfRecords[0].data) } };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["spf-inspector"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
