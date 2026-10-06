"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

describe("dns lookup", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaDns;
  });

  afterEach(() => {
    globalThis.LupaxaDns = previous;
    delete require.cache[require.resolve("../../mkdocs/assets/javascript/tools/dns-lookup.js")];
  });

  it("lists one A answer", async () => {
    globalThis.LupaxaDns = {
      checkName: (name) => ({ ok: true, value: name }),
      dnsStatusError: () => null,
      query: async (request) => {
        assert.equal(request.type, "A");
        assert.equal(request.resolver, "google");
        assert.equal(request.validate, false);
        return {
          ok: true,
          status: 0,
          authenticated: false,
          answers: [{ name: "example.com", type: 1, ttl: 60, data: "192.0.2.1" }],
        };
      },
    };
    const { run } = require("../../mkdocs/assets/javascript/tools/dns-lookup.js");
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "google", "record-type": "a" }), {
      ok: true,
      output: { result: "example.com 60 192.0.2.1" },
    });
  });

  it("says when there are no records and when the name is missing", async () => {
    globalThis.LupaxaDns = {
      checkName: () => ({ ok: true, value: "example.com" }),
      dnsStatusError: (status) => (status === 3 ? "Name does not exist." : null),
      query: async () => ({ ok: true, status: 0, authenticated: false, answers: [] }),
    };
    const { run } = require("../../mkdocs/assets/javascript/tools/dns-lookup.js");
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "cloudflare", "record-type": "aaaa" }), {
      ok: true,
      output: { result: "No records." },
    });
    globalThis.LupaxaDns.query = async () => ({ ok: true, status: 3, authenticated: false, answers: [] });
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "cloudflare", "record-type": "a" }), {
      ok: true,
      output: { result: "Name does not exist." },
    });
  });
});
