"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { checkName, checkAddress, reverseName, dnsStatusError, query } = require("../../mkdocs/assets/javascript/dns.js");

describe("dns name and address", () => {
  it("trims a name and drops one trailing dot", () => {
    assert.deepEqual(checkName("  Example.COM. "), { ok: true, value: "example.com" });
  });

  it("rejects an empty or illegal name", () => {
    assert.deepEqual(checkName("  "), { ok: false, error: "Enter a name." });
    assert.deepEqual(checkName("bad name"), { ok: false, error: "Enter a valid name." });
    assert.deepEqual(checkName("-a.example"), { ok: false, error: "Enter a valid name." });
    assert.deepEqual(checkName("exämple.com"), { ok: false, error: "Enter a valid name." });
    assert.deepEqual(checkName(`${"a".repeat(64)}.example`), { ok: false, error: "Enter a valid name." });
    assert.deepEqual(checkName(`${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}`), {
      ok: false,
      error: "Enter a valid name.",
    });
  });

  it("allows a leading underscore on one label only", () => {
    assert.deepEqual(checkName("_dmarc.example.com"), { ok: true, value: "_dmarc.example.com" });
    assert.deepEqual(checkName("a_b.example"), { ok: false, error: "Enter a valid name." });
    assert.deepEqual(checkName("example.com.."), { ok: false, error: "Enter a valid name." });
    assert.deepEqual(checkName("."), { ok: false, error: "Enter a valid name." });
    assert.deepEqual(checkName("_" + "a".repeat(62)), { ok: true, value: "_" + "a".repeat(62) });
    assert.deepEqual(checkName("_" + "a".repeat(63)), { ok: false, error: "Enter a valid name." });
  });

  it("accepts punycode and builds reverse names", () => {
    assert.deepEqual(checkName("xn--bcher-kva.example"), { ok: true, value: "xn--bcher-kva.example" });
    assert.deepEqual(checkAddress(""), { ok: false, error: "Enter an address." });
    assert.deepEqual(checkAddress("1.2.3.4"), { ok: true, value: "1.2.3.4" });
    assert.equal(reverseName("1.2.3.4"), "4.3.2.1.in-addr.arpa");
    assert.deepEqual(checkAddress("::ffff:1.2.3.4"), { ok: false, error: "Enter a valid address." });
    assert.deepEqual(checkAddress("2001:db8::1"), { ok: true, value: "2001:db8::1" });
    assert.equal(
      reverseName("2001:db8::1"),
      "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa",
    );
  });
});

describe("dns query", () => {
  it("maps status codes and leaves zero as success", () => {
    assert.equal(dnsStatusError(0), null);
    assert.equal(dnsStatusError(2), "The resolver could not answer.");
    assert.equal(dnsStatusError(3), "Name does not exist.");
    assert.equal(dnsStatusError(5), "The resolver refused the query.");
    assert.equal(dnsStatusError(1), "The resolver returned an error.");
  });

  it("calls Cloudflare without do=1 and unquotes TXT", async () => {
    const calls = [];
    const fetch = async (url, options) => {
      calls.push({ url, options });
      const signal = options.signal;
      assert.equal(signal.aborted, false);
      return {
        ok: true,
        json: async () => ({
          Status: 0,
          AD: false,
          Answer: [{ name: "example.com", type: 16, TTL: 30, data: '"v=spf1" "mx"' }],
        }),
      };
    };
    const result = await query({
      name: "example.com",
      type: "TXT",
      resolver: "cloudflare",
      fetch,
    });
    assert.equal(calls[0].url, "https://cloudflare-dns.com/dns-query?name=example.com&type=TXT");
    assert.equal(calls[0].options.headers.Accept, "application/dns-json");
    assert.deepEqual(result, {
      ok: true,
      status: 0,
      authenticated: false,
      answers: [{ name: "example.com", type: 16, ttl: 30, data: "v=spf1mx" }],
    });
  });

  it("sets do=1 for Google and Quad9 only when asked", async () => {
    const urls = [];
    const fetch = async (url) => {
      urls.push(url);
      return { ok: true, json: async () => ({ Status: 0, AD: true, Answer: [] }) };
    };
    const validated = await query({ name: "example.com", type: "SOA", resolver: "google", validate: true, fetch });
    const plain = await query({ name: "example.com", type: "A", resolver: "quad9", fetch });
    assert.equal(urls[0], "https://dns.google/resolve?name=example.com&type=SOA&do=1");
    assert.equal(urls[1], "https://dns.quad9.net/dns-query?name=example.com&type=A");
    assert.deepEqual(validated, { ok: true, status: 0, authenticated: true, answers: [] });
    assert.deepEqual(plain, { ok: true, status: 0, authenticated: true, answers: [] });
  });

  it("passes a fetch AbortSignal that aborts at 10 seconds", async (t) => {
    t.mock.timers.enable({ apis: ["Date", "setTimeout"] });
    t.mock.method(AbortSignal, "timeout", (ms) => {
      assert.equal(ms, 10000);
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    });
    let signal;
    const fetch = async (_url, options) => {
      signal = options.signal;
      assert.equal(signal.aborted, false);
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    };
    const resultPromise = query({
      name: "example.com",
      type: "A",
      resolver: "cloudflare",
      fetch,
    });
    await Promise.resolve();
    assert.ok(signal);
    assert.equal(signal.aborted, false);
    t.mock.timers.tick(9999);
    assert.equal(signal.aborted, false);
    t.mock.timers.tick(1);
    assert.equal(signal.aborted, true);
    assert.deepEqual(await resultPromise, { ok: false, error: "The resolver did not answer." });
    t.mock.timers.reset();
  });

  it("reports a transport failure and an HTTP error", async () => {
    assert.deepEqual(
      await query({
        name: "example.com",
        type: "A",
        resolver: "cloudflare",
        fetch: async () => {
          throw new Error("down");
        },
      }),
      { ok: false, error: "The resolver did not answer." },
    );
    assert.deepEqual(
      await query({
        name: "example.com",
        type: "A",
        resolver: "nope",
        fetch: async () => ({ ok: true, json: async () => ({}) }),
      }),
      { ok: false, error: "The resolver did not answer." },
    );
    assert.deepEqual(
      await query({
        name: "example.com",
        type: "A",
        resolver: "cloudflare",
        fetch: async () => ({ ok: false, json: async () => ({}) }),
      }),
      { ok: false, error: "The resolver did not answer." },
    );
  });
});
