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
  "base-16.js",
));

describe("base-16", () => {
  it("encodes z as uppercase hex", () => {
    assert.deepEqual(run("encode", "z"), { ok: true, output: "7A" });
  });

  it("decodes lowercase hex", () => {
    assert.deepEqual(run("decode", "7a"), { ok: true, output: "z" });
  });

  it("decodes hex with space, tab, and newline", () => {
    assert.deepEqual(run("decode", "7 A\n\t"), { ok: true, output: "z" });
  });

  it("rejects odd-length text", () => {
    assert.deepEqual(run("decode", "7"), {
      ok: false,
      error: "That is not valid Base 16.",
    });
  });

  it("rejects characters outside hex", () => {
    assert.deepEqual(run("decode", "GG"), {
      ok: false,
      error: "That is not valid Base 16.",
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
    assert.deepEqual(run("decode", "FF"), {
      ok: false,
      error: "The decoded value is not valid UTF-8 text.",
    });
  });

  it("rejects unknown actions", () => {
    assert.deepEqual(run("nope", "z"), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
