"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

describe("reverse dns", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaDns;
  });

  afterEach(() => {
    globalThis.LupaxaDns = previous;
    delete require.cache[require.resolve("../../mkdocs/assets/javascript/tools/reverse-dns.js")];
  });

  it("lists one PTR answer", async () => {
    globalThis.LupaxaDns = {
      checkAddress: () => ({ ok: true, value: "1.2.3.4" }),
      reverseName: (address) => {
        assert.equal(address, "1.2.3.4");
        return "4.3.2.1.in-addr.arpa";
      },
      dnsStatusError: () => null,
      query: async (request) => {
        assert.equal(request.type, "PTR");
        assert.equal(request.name, "4.3.2.1.in-addr.arpa");
        assert.equal(request.validate, false);
        return {
          ok: true,
          status: 0,
          authenticated: false,
          answers: [{ name: "4.3.2.1.in-addr.arpa", type: 12, ttl: 60, data: "mail.example.com." }],
        };
      },
    };
    const { run } = require("../../mkdocs/assets/javascript/tools/reverse-dns.js");
    assert.deepEqual(await run("look-up", { name: "1.2.3.4", resolver: "cloudflare" }), {
      ok: true,
      output: { result: "mail.example.com." },
    });
  });

  it("says when there are no records and when the address is invalid", async () => {
    let queryCalled = false;
    globalThis.LupaxaDns = {
      checkAddress: () => ({ ok: true, value: "1.2.3.4" }),
      reverseName: () => "4.3.2.1.in-addr.arpa",
      dnsStatusError: () => null,
      query: async () => {
        queryCalled = true;
        return { ok: true, status: 0, authenticated: false, answers: [] };
      },
    };
    const { run } = require("../../mkdocs/assets/javascript/tools/reverse-dns.js");
    assert.deepEqual(await run("look-up", { name: "1.2.3.4", resolver: "cloudflare" }), {
      ok: true,
      output: { result: "No records." },
    });
    assert.equal(queryCalled, true);

    queryCalled = false;
    globalThis.LupaxaDns = {
      checkAddress: () => ({ ok: false, error: "Enter a valid address." }),
      reverseName: () => assert.fail("reverseName should not be called"),
      dnsStatusError: () => null,
      query: async () => {
        queryCalled = true;
        return { ok: true, status: 0, authenticated: false, answers: [] };
      },
    };
    delete require.cache[require.resolve("../../mkdocs/assets/javascript/tools/reverse-dns.js")];
    const { run: runAgain } = require("../../mkdocs/assets/javascript/tools/reverse-dns.js");
    assert.deepEqual(await runAgain("look-up", { name: "not-an-ip", resolver: "cloudflare" }), {
      ok: false,
      error: "Enter a valid address.",
    });
    assert.equal(queryCalled, false);
  });
});
