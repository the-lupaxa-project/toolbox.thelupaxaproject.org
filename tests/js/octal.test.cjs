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
  "octal.js",
));

describe("octal", () => {
  it("encodes one byte as three digits", () => {
    assert.deepEqual(run("encode", "a"), { ok: true, output: "141" });
  });

  it("decodes three digits", () => {
    assert.deepEqual(run("decode", "141"), { ok: true, output: "a" });
  });

  it("decodes text with space, tab, and newline", () => {
    assert.deepEqual(run("decode", "141 \n\t"), { ok: true, output: "a" });
  });

  it("rejects a length that is not a multiple of 3", () => {
    assert.deepEqual(run("decode", "14"), {
      ok: false,
      error: "That is not valid octal.",
    });
  });

  it("rejects a digit outside octal", () => {
    assert.deepEqual(run("decode", "378"), {
      ok: false,
      error: "That is not valid octal.",
    });
  });

  it("rejects a group above 377", () => {
    assert.deepEqual(run("decode", "400"), {
      ok: false,
      error: "That is not valid octal.",
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
    assert.deepEqual(run("decode", "377"), {
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
