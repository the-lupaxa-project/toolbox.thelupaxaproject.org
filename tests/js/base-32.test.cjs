"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { run } = require(path.join(
  __dirname,
  "..",
  "..",
  "mkdocs",
  "assets",
  "javascript",
  "tools",
  "base-32.js",
));

describe("base-32", () => {
  it("encodes foobar with RFC 4648 padding", () => {
    assert.deepEqual(run("encode", "foobar"), {
      ok: true,
      output: "MZXW6YTBOI======",
    });
  });

  it("decodes omitted padding", () => {
    assert.deepEqual(run("decode", "MZXW6YTBOI"), {
      ok: true,
      output: "foobar",
    });
  });

  it("decodes a lowercase body", () => {
    assert.deepEqual(run("decode", "me======"), { ok: true, output: "a" });
  });

  it("rejects a character that only becomes a letter after case mapping", () => {
    assert.deepEqual(run("decode", "\uFB00"), {
      ok: false,
      error: "That is not valid Base 32.",
    });
  });

  it("pads every leftover-byte length", () => {
    assert.deepEqual(run("encode", "ab"), { ok: true, output: "MFRA====" });
    assert.deepEqual(run("encode", "abc"), { ok: true, output: "MFRGG===" });
    assert.deepEqual(run("encode", "abcd"), { ok: true, output: "MFRGGZA=" });
    assert.deepEqual(run("encode", "abcde"), { ok: true, output: "MFRGGZDF" });
  });

  it("decodes text with space, tab, and newline", () => {
    assert.deepEqual(run("decode", "ME ======\n\t"), { ok: true, output: "a" });
  });

  it("rejects a character outside the alphabet", () => {
    assert.deepEqual(run("decode", "1"), {
      ok: false,
      error: "That is not valid Base 32.",
    });
  });

  it("rejects padding that does not match the table", () => {
    assert.deepEqual(run("decode", "ME="), {
      ok: false,
      error: "That is not valid Base 32.",
    });
  });

  it("round-trips a short phrase", () => {
    const encoded = run("encode", "héllo");
    assert.equal(encoded.ok, true);
    assert.deepEqual(run("decode", encoded.output), {
      ok: true,
      output: "héllo",
    });
  });

  it("rejects invalid UTF-8 after decode", () => {
    assert.deepEqual(run("decode", "74======"), {
      ok: false,
      error: "The decoded value is not valid UTF-8 text.",
    });
  });

  it("rejects unknown actions", () => {
    assert.deepEqual(run("nope", "a"), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
