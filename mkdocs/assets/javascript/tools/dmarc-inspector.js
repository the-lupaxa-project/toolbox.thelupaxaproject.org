"use strict";

(function () {
  const GLOSS = {
    v: "version",
    pct: "percent",
    rua: "aggregate reports",
    ruf: "failure reports",
    fo: "failure options",
    rf: "report format",
    ri: "report interval",
  };

  function dmarcOutput(record) {
    return record.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
      const splitAt = part.indexOf("=");
      const name = part.slice(0, splitAt).trim();
      const value = part.slice(splitAt + 1).trim();
      if (name === "p" || name === "sp") {
        const label = name === "p" ? "policy" : "subdomain policy";
        return `${name}: ${value} — ${label}: ${value}`;
      }
      if (name === "adkim" || name === "aspf") {
        const which = name === "adkim" ? "DKIM" : "SPF";
        const mode = value === "s" ? "strict" : "relaxed";
        return `${name}: ${value} — ${which} alignment: ${mode}`;
      }
      if (GLOSS[name]) {
        return `${name}: ${value} — ${GLOSS[name]}`;
      }
      return `${name}: ${value}`;
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
      name: `_dmarc.${checked.value}`,
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
    const dmarcRecords = result.answers.filter((answer) =>
      String(answer.data).startsWith("v=DMARC1"),
    );
    if (dmarcRecords.length === 0) {
      return { ok: true, output: { result: "No DMARC record." } };
    }
    if (dmarcRecords.length > 1) {
      return { ok: true, output: { result: "More than one DMARC record." } };
    }
    return { ok: true, output: { result: dmarcOutput(dmarcRecords[0].data) } };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["dmarc-inspector"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
