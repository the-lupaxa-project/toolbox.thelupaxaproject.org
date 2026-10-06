"use strict";

(function () {
  function section(result) {
    if (!result.ok || result.status !== 0 || result.answers.length === 0) {
      return "None";
    }
    return result.answers.map((answer) => `${answer.name} ${answer.ttl} ${answer.data}`).join("\n");
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
    const soa = await dns.query({
      name: checked.value,
      type: "SOA",
      resolver: value.resolver,
      validate: true,
    });
    if (!soa.ok) {
      return { ok: true, output: { result: soa.error } };
    }
    if (soa.status !== 0 && soa.status !== 2 && soa.status !== 3) {
      return { ok: true, output: { result: dns.dnsStatusError(soa.status) } };
    }
    const verdict = soa.status === 2
      ? "Validation failed"
      : soa.status === 3
        ? "Name does not exist"
        : soa.authenticated
          ? "Authenticated"
          : "No DNSSEC";
    const dnskey = await dns.query({
      name: checked.value,
      type: "DNSKEY",
      resolver: value.resolver,
      validate: true,
    });
    const ds = await dns.query({
      name: checked.value,
      type: "DS",
      resolver: value.resolver,
      validate: true,
    });
    return {
      ok: true,
      output: { result: `${verdict}\nDNSKEY\n${section(dnskey)}\nDS\n${section(ds)}` },
    };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["dnssec-inspector"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
