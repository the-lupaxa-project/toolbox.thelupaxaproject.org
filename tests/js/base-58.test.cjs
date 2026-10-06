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
  "base-58.js",
));

describe("base-58", () => {
  it("encodes plain text", () => {
    assert.deepEqual(run("encode", "a"), { ok: true, output: "2g" });
  });

  it("encodes a leading zero byte as 1", () => {
    assert.deepEqual(run("encode", "\0a"), { ok: true, output: "12g" });
  });

  it("decodes a leading 1 as a zero byte", () => {
    assert.deepEqual(run("decode", "12g"), { ok: true, output: "\0a" });
  });

  it("decodes text with space, tab, and newline", () => {
    assert.deepEqual(run("decode", "2 g\n\t"), { ok: true, output: "a" });
  });

  it("rejects a character outside the Bitcoin alphabet", () => {
    assert.deepEqual(run("decode", "0"), {
      ok: false,
      error: "That is not valid Base 58.",
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
    assert.deepEqual(run("decode", "5Q"), {
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
