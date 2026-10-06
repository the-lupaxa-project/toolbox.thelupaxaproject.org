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
  "binary.js",
));

describe("binary", () => {
  it("encodes one byte as eight bits", () => {
    assert.deepEqual(run("encode", "a"), { ok: true, output: "01100001" });
  });

  it("decodes eight bits", () => {
    assert.deepEqual(run("decode", "01100001"), { ok: true, output: "a" });
  });

  it("decodes text with space, tab, and newline", () => {
    assert.deepEqual(run("decode", "01100001 \n\t"), { ok: true, output: "a" });
  });

  it("rejects a length that is not a multiple of 8", () => {
    assert.deepEqual(run("decode", "0110000"), {
      ok: false,
      error: "That is not valid binary.",
    });
  });

  it("rejects a digit other than 0 or 1", () => {
    assert.deepEqual(run("decode", "01100002"), {
      ok: false,
      error: "That is not valid binary.",
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
    assert.deepEqual(run("decode", "11111111"), {
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
