"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TOOL_PATH = "../../mkdocs/assets/javascript/tools/dnssec-inspector.js";
const DNS_PATH = "../../mkdocs/assets/javascript/dns.js";

function makeQueryHandler(config) {
  const calls = [];
  const handler = async (request) => {
    calls.push(request);
    if (request.type === "SOA") {
      assert.equal(request.validate, true);
      return config.soa(request);
    }
    if (request.type === "DNSKEY") {
      assert.equal(request.validate, true);
      return config.dnskey(request);
    }
    if (request.type === "DS") {
      assert.equal(request.validate, true);
      return config.ds(request);
    }
    throw new Error(`unexpected query type ${request.type}`);
  };
  return { calls, handler };
}

describe("dnssec inspector", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaDns;
  });

  afterEach(() => {
    globalThis.LupaxaDns = previous;
    delete require.cache[require.resolve(TOOL_PATH)];
  });

  for (const [status, authenticated, firstLine] of [
    [0, true, "Authenticated"],
    [0, false, "No DNSSEC"],
    [2, false, "Validation failed"],
    [3, false, "Name does not exist"],
  ]) {
    it(`verdict for SOA status ${status} AD ${authenticated}`, async () => {
      const { calls, handler } = makeQueryHandler({
        soa: async () => ({
          ok: true,
          status,
          authenticated,
          answers: [{ name: "example.com", ttl: 3600, data: "ns.example.com. host.example.com. 1 7200 900 1209600 3600" }],
        }),
        dnskey: async () => ({ ok: true, status: 0, authenticated: false, answers: [] }),
        ds: async () => ({ ok: true, status: 0, authenticated: false, answers: [] }),
      });
      globalThis.LupaxaDns = {
        checkName: (name) => ({ ok: true, value: name }),
        dnsStatusError: () => null,
        query: handler,
      };
      const { run } = require(TOOL_PATH);
      const result = await run("look-up", { name: "example.com", resolver: "google" });
      assert.equal(result.ok, true);
      assert.equal(result.output.result.split("\n")[0], firstLine);
      assert.equal(calls.length, 3);
      assert.equal(calls[0].type, "SOA");
      assert.equal(calls[1].type, "DNSKEY");
      assert.equal(calls[2].type, "DS");
    });
  }

  it("formats authenticated DNSKEY and empty DS", async () => {
    const { handler } = makeQueryHandler({
      soa: async () => ({
        ok: true,
        status: 0,
        authenticated: true,
        answers: [{ name: "example.com", ttl: 3600, data: "ns.example.com. host.example.com. 1 7200 900 1209600 3600" }],
      }),
      dnskey: async () => ({
        ok: true,
        status: 0,
        authenticated: true,
        answers: [{ name: "example.com", ttl: 3600, data: "257 3 13 abc" }],
      }),
      ds: async () => ({ ok: true, status: 0, authenticated: false, answers: [] }),
    });
    globalThis.LupaxaDns = {
      checkName: (name) => ({ ok: true, value: name }),
      dnsStatusError: () => null,
      query: handler,
    };
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "google" }), {
      ok: true,
      output: {
        result: "Authenticated\nDNSKEY\nexample.com 3600 257 3 13 abc\nDS\nNone",
      },
    });
  });

  it("keeps validation failed when DNSKEY errors and DS is empty", async () => {
    const { handler } = makeQueryHandler({
      soa: async () => ({
        ok: true,
        status: 2,
        authenticated: false,
        answers: [],
      }),
      dnskey: async () => ({ ok: false, error: "The resolver did not answer." }),
      ds: async () => ({ ok: true, status: 0, authenticated: false, answers: [] }),
    });
    globalThis.LupaxaDns = {
      checkName: (name) => ({ ok: true, value: name }),
      dnsStatusError: () => null,
      query: handler,
    };
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "google" }), {
      ok: true,
      output: {
        result: "Validation failed\nDNSKEY\nNone\nDS\nNone",
      },
    });
  });

  it("maps SOA status 5 without follow-up queries", async () => {
    const realDns = require(DNS_PATH);
    const calls = [];
    globalThis.LupaxaDns = {
      ...realDns,
      checkName: (name) => ({ ok: true, value: name }),
      query: async (request) => {
        calls.push(request);
        assert.equal(request.type, "SOA");
        assert.equal(request.validate, true);
        return { ok: true, status: 5, authenticated: false, answers: [] };
      },
    };
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "google" }), {
      ok: true,
      output: { result: "The resolver refused the query." },
    });
    assert.equal(calls.length, 1);
  });

  it("returns SOA transport error without follow-up queries", async () => {
    const calls = [];
    globalThis.LupaxaDns = {
      checkName: (name) => ({ ok: true, value: name }),
      dnsStatusError: () => null,
      query: async (request) => {
        calls.push(request);
        return { ok: false, error: "The resolver did not answer." };
      },
    };
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "google" }), {
      ok: true,
      output: { result: "The resolver did not answer." },
    });
    assert.equal(calls.length, 1);
  });
});
