"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TOOL_PATH = "../../mkdocs/assets/javascript/tools/spf-inspector.js";

function stubDns(queryImpl) {
  return {
    checkName: (name) => ({ ok: true, value: name }),
    dnsStatusError: () => null,
    query: queryImpl,
  };
}

describe("spf inspector", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaDns;
  });

  afterEach(() => {
    globalThis.LupaxaDns = previous;
    delete require.cache[require.resolve(TOOL_PATH)];
  });

  it("formats include and all qualifiers", async () => {
    globalThis.LupaxaDns = stubDns(async (request) => {
      assert.equal(request.type, "TXT");
      assert.equal(request.validate, false);
      return {
        ok: true,
        status: 0,
        authenticated: false,
        answers: [{ name: "example.com", type: 16, ttl: 60, data: "v=spf1 include:example.net -all" }],
      };
    });
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "google" }), {
      ok: true,
      output: { result: "pass include:example.net\nfail all" },
    });
  });

  it("formats redirect and exp without following redirect", async () => {
    globalThis.LupaxaDns = stubDns(async (request) => {
      assert.equal(request.type, "TXT");
      assert.equal(request.validate, false);
      return {
        ok: true,
        status: 0,
        authenticated: false,
        answers: [{
          name: "example.com",
          type: 16,
          ttl: 60,
          data: "v=spf1 redirect=_spf.example.com exp=explain.example.com",
        }],
      };
    });
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "cloudflare" }), {
      ok: true,
      output: {
        result: "pass redirect=_spf.example.com\npass exp=explain.example.com",
      },
    });
  });

  it("rejects more than one SPF record", async () => {
    globalThis.LupaxaDns = stubDns(async () => ({
      ok: true,
      status: 0,
      authenticated: false,
      answers: [
        { name: "example.com", type: 16, ttl: 60, data: "v=spf1 ~all" },
        { name: "example.com", type: 16, ttl: 60, data: "v=spf1 -all" },
      ],
    }));
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "quad9" }), {
      ok: true,
      output: { result: "More than one SPF record." },
    });
  });

  it("rejects when no SPF record is present", async () => {
    globalThis.LupaxaDns = stubDns(async () => ({
      ok: true,
      status: 0,
      authenticated: false,
      answers: [{ name: "example.com", type: 16, ttl: 60, data: "google-site-verification=abc" }],
    }));
    const { run } = require(TOOL_PATH);
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "google" }), {
      ok: true,
      output: { result: "No SPF record." },
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
    assert.deepEqual(await run("look-up", { name: "example.com", resolver: "google" }), {
      ok: true,
      output: { result: "No SPF record." },
    });
  });
});
