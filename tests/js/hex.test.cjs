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
  "hex.js",
));

describe("hex", () => {
  it("encodes plain text", () => {
    assert.deepEqual(run("encode", "AB"), { ok: true, output: "4142" });
  });

  it("decodes plain text", () => {
    assert.deepEqual(run("decode", "4142"), { ok: true, output: "AB" });
  });

  it("decodes hex with whitespace", () => {
    assert.deepEqual(run("decode", "41 42"), { ok: true, output: "AB" });
  });

  it("rejects odd-length hex", () => {
    assert.deepEqual(run("decode", "414"), {
      ok: false,
      error: "That is not valid hex.",
    });
  });

  it("rejects invalid hex characters", () => {
    assert.deepEqual(run("decode", "GG"), {
      ok: false,
      error: "That is not valid hex.",
    });
  });

  it("rejects 0x prefix", () => {
    assert.deepEqual(run("decode", "0x41"), {
      ok: false,
      error: "That is not valid hex.",
    });
  });

  it("round-trips Unicode text", () => {
    const encoded = run("encode", "héllo");
    assert.equal(encoded.ok, true);
    const decoded = run("decode", encoded.output);
    assert.equal(decoded.ok, true);
    assert.equal(decoded.output, "héllo");
  });

  it("rejects invalid UTF-8 after decode", () => {
    assert.deepEqual(run("decode", "ff"), {
      ok: false,
      error: "The decoded value is not valid UTF-8 text.",
    });
  });

  it("rejects unknown actions", () => {
    assert.deepEqual(run("nope", "A"), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
