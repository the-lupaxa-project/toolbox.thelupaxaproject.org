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
  "base-85.js",
));

describe("base-85", () => {
  it("encodes four zero bytes as z", () => {
    assert.deepEqual(run("encode", "\0\0\0\0"), { ok: true, output: "z" });
  });

  it("does not use z for a short group of zero bytes", () => {
    assert.deepEqual(run("encode", "\0"), { ok: true, output: "!!" });
  });

  it("decodes z to four zero bytes", () => {
    assert.deepEqual(run("decode", "z"), { ok: true, output: "\0\0\0\0" });
  });

  it("encodes a short final group", () => {
    assert.deepEqual(run("encode", "hello"), { ok: true, output: "BOu!rDZ" });
  });

  it("decodes a short final group", () => {
    assert.deepEqual(run("decode", "BOu!rDZ"), { ok: true, output: "hello" });
  });

  it("encodes a full group", () => {
    assert.deepEqual(run("encode", "Man "), { ok: true, output: "9jqo^" });
  });

  it("decodes text with space, tab, and newline", () => {
    assert.deepEqual(run("decode", "BOu! rDZ\n\t"), { ok: true, output: "hello" });
  });

  it("rejects a final group of one character", () => {
    assert.deepEqual(run("decode", "!"), {
      ok: false,
      error: "That is not valid Base 85.",
    });
  });

  it("rejects the Ascii85 frame", () => {
    assert.deepEqual(run("decode", "<~BOu!rDZ~>"), {
      ok: false,
      error: "That is not valid Base 85.",
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
    assert.deepEqual(run("decode", "rr"), {
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
