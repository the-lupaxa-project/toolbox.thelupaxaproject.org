"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

describe("mx lookup", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaDns;
  });

  afterEach(() => {
    globalThis.LupaxaDns = previous;
    delete require.cache[require.resolve("../../mkdocs/assets/javascript/tools/mx-lookup.js")];
  });

  it("sorts MX answers by preference", async () => {
    globalThis.LupaxaDns = {
      checkName: (name) => ({ ok: true, value: name }),
      dnsStatusError: () => null,
      query: async (request) => {
        assert.equal(request.type, "MX");
        assert.equal(request.validate, false);
        return {
          ok: true,
          status: 0,
          authenticated: false,
          answers: [
            { name: "example.com", type: 15, ttl: 60, data: "10 mx2.example.com." },
            { name: "example.com", type: 15, ttl: 60, data: "10 mx1.example.com." },
            { name: "example.com", type: 15, ttl: 60, data: "0 mx0.example.com." },
          ],
        };
      },
    };
    const { run } = require("../../mkdocs/assets/javascript/tools/mx-lookup.js");
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "google" }), {
      ok: true,
      output: {
        result: "0 mx0.example.com.\n10 mx2.example.com.\n10 mx1.example.com.",
      },
    });
  });

  it("ignores non-MX answers such as CNAME", async () => {
    globalThis.LupaxaDns = {
      checkName: () => ({ ok: true, value: "example.com" }),
      dnsStatusError: () => null,
      query: async () => ({
        ok: true,
        status: 0,
        authenticated: false,
        answers: [
          { name: "example.com", type: 5, ttl: 60, data: "www.example.com." },
          { name: "example.com", type: 15, ttl: 60, data: "10 mail.example.com." },
        ],
      }),
    };
    const { run } = require("../../mkdocs/assets/javascript/tools/mx-lookup.js");
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "google" }), {
      ok: true,
      output: { result: "10 mail.example.com." },
    });
  });

  it("says when there are no records", async () => {
    globalThis.LupaxaDns = {
      checkName: () => ({ ok: true, value: "example.com" }),
      dnsStatusError: () => null,
      query: async () => ({ ok: true, status: 0, authenticated: false, answers: [] }),
    };
    const { run } = require("../../mkdocs/assets/javascript/tools/mx-lookup.js");
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "cloudflare" }), {
      ok: true,
      output: { result: "No records." },
    });
  });
});
