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
  "url-encode-decode.js",
));

describe("url-encode-decode", () => {
  it("encodes plain text", () => {
    assert.deepEqual(run("encode", "a b"), { ok: true, output: "a%20b" });
  });

  it("decodes plain text", () => {
    assert.deepEqual(run("decode", "a%20b"), { ok: true, output: "a b" });
  });

  it("round-trips Unicode text", () => {
    const encoded = run("encode", "héllo");
    assert.equal(encoded.ok, true);
    const decoded = run("decode", encoded.output);
    assert.equal(decoded.ok, true);
    assert.equal(decoded.output, "héllo");
  });

  it("rejects invalid URL encoding", () => {
    assert.deepEqual(run("decode", "%ZZ"), {
      ok: false,
      error: "That is not valid URL encoding.",
    });
  });

  it("rejects unknown actions", () => {
    assert.deepEqual(run("nope", "a"), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
