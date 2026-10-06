"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TOOL_PATH = "../../mkdocs/assets/javascript/tools/dmarc-inspector.js";
const DNS_PATH = "../../mkdocs/assets/javascript/dns.js";

const FULL_RECORD =
  "v=DMARC1; p=reject; sp=quarantine; adkim=r; aspf=s; pct=100; " +
  "rua=mailto:dmarc@example.com; ruf=mailto:fail@example.com; fo=1; rf=afrf; ri=86400; foo=bar";

const FULL_OUTPUT = [
  "v: DMARC1 — version",
  "p: reject — policy: reject",
  "sp: quarantine — subdomain policy: quarantine",
  "adkim: r — DKIM alignment: relaxed",
  "aspf: s — SPF alignment: strict",
  "pct: 100 — percent",
  "rua: mailto:dmarc@example.com — aggregate reports",
  "ruf: mailto:fail@example.com — failure reports",
  "fo: 1 — failure options",
  "rf: afrf — report format",
  "ri: 86400 — report interval",
  "foo: bar",
].join("\n");

function stubDns(queryImpl) {
  return {
    checkName: (name) => ({ ok: true, value: name }),
    dnsStatusError: () => null,
    query: queryImpl,
  };
}

describe("dmarc inspector", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaDns;
  });

  afterEach(() => {
    globalThis.LupaxaDns = previous;
    delete require.cache[require.resolve(TOOL_PATH)];
  });

  it("queries _dmarc.example.com for example.com", async () => {
    globalThis.LupaxaDns = stubDns(async (request) => {
      assert.equal(request.name, "_dmarc.example.com");
      assert.equal(request.type, "TXT");
      assert.equal(request.validate, false);
      return {
        ok: true,
        status: 0,
        authenticated: false,
        answers: [{ name: "_dmarc.example.com", type: 16, ttl: 60, data: FULL_RECORD }],
      };
    });
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "google" }), {
      ok: true,
      output: { result: FULL_OUTPUT },
    });
  });

  it("queries _dmarc._dmarc.example.com when the field is _dmarc.example.com", async () => {
    const realDns = require(DNS_PATH);
    globalThis.LupaxaDns = {
      ...realDns,
      query: async (request) => {
        assert.equal(request.name, "_dmarc._dmarc.example.com");
        assert.equal(request.type, "TXT");
        return {
          ok: true,
          status: 0,
          authenticated: false,
          answers: [{
            name: "_dmarc._dmarc.example.com",
            type: 16,
            ttl: 60,
            data: FULL_RECORD,
          }],
        };
      },
    };
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "_dmarc.example.com", resolver: "cloudflare" }), {
      ok: true,
      output: { result: FULL_OUTPUT },
    });
  });

  it("rejects example.com.. and a lone dot without querying", async () => {
    const realDns = require(DNS_PATH);
    let queried = false;
    globalThis.LupaxaDns = {
      ...realDns,
      query: async () => {
        queried = true;
        return { ok: true, status: 0, authenticated: false, answers: [] };
      },
    };
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "example.com..", resolver: "google" }), {
      ok: false,
      error: "Enter a valid name.",
    });
    assert.equal(queried, false);
    assert.deepEqual(await run("look-up", { name: ".", resolver: "google" }), {
      ok: false,
      error: "Enter a valid name.",
    });
    assert.equal(queried, false);
  });

  it("rejects a name with a space without querying", async () => {
    const realDns = require(DNS_PATH);
    let queried = false;
    globalThis.LupaxaDns = {
      ...realDns,
      query: async () => {
        queried = true;
        return { ok: true, status: 0, authenticated: false, answers: [] };
      },
    };
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "bad name.example.com", resolver: "google" }), {
      ok: false,
      error: "Enter a valid name.",
    });
    assert.equal(queried, false);
  });

  it("rejects when no DMARC record is present", async () => {
    globalThis.LupaxaDns = stubDns(async () => ({
      ok: true,
      status: 0,
      authenticated: false,
      answers: [{ name: "_dmarc.example.com", type: 16, ttl: 60, data: "v=spf1 -all" }],
    }));
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "google" }), {
      ok: true,
      output: { result: "No DMARC record." },
    });
  });

  it("rejects when there are no answers", async () => {
    globalThis.LupaxaDns = stubDns(async () => ({
      ok: true,
      status: 0,
      authenticated: false,
      answers: [],
    }));
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "quad9" }), {
      ok: true,
      output: { result: "No DMARC record." },
    });
  });

  it("rejects more than one DMARC record", async () => {
    globalThis.LupaxaDns = stubDns(async () => ({
      ok: true,
      status: 0,
      authenticated: false,
      answers: [
        { name: "_dmarc.example.com", type: 16, ttl: 60, data: "v=DMARC1; p=none" },
        { name: "_dmarc.example.com", type: 16, ttl: 60, data: "v=DMARC1; p=reject" },
      ],
    }));
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "google" }), {
      ok: true,
      output: { result: "More than one DMARC record." },
    });
  });
});
