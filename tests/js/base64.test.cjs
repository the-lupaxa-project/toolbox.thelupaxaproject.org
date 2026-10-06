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
  "base64.js",
));

describe("base64", () => {
  it("encodes plain text", () => {
    assert.deepEqual(run("encode", "hi"), { ok: true, output: "aGk=" });
  });

  it("decodes plain text", () => {
    assert.deepEqual(run("decode", "aGk="), { ok: true, output: "hi" });
  });

  it("round-trips Unicode text", () => {
    const encoded = run("encode", "héllo");
    assert.equal(encoded.ok, true);
    const decoded = run("decode", encoded.output);
    assert.equal(decoded.ok, true);
    assert.equal(decoded.output, "héllo");
  });

  it("decodes Base64 with omitted padding", () => {
    assert.deepEqual(run("decode", "YQ"), { ok: true, output: "a" });
  });

  it("rejects invalid padding", () => {
    assert.deepEqual(run("decode", "YQ="), {
      ok: false,
      error: "That is not valid Base64.",
    });
  });

  it("rejects invalid characters", () => {
    assert.deepEqual(run("decode", "@@@"), {
      ok: false,
      error: "That is not valid Base64.",
    });
  });

  it("rejects invalid UTF-8 after decode", () => {
    assert.deepEqual(run("decode", "/w=="), {
      ok: false,
      error: "The decoded value is not valid UTF-8 text.",
    });
  });

  it("rejects unknown actions", () => {
    assert.deepEqual(run("nope", "hi"), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
