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
  "base-n.js",
));

function at(action, text, base) {
  return run(action, { text, base });
}

describe("base n", () => {
  it("encodes and decodes base 64", () => {
    assert.deepEqual(at("encode", "hi", "64"), { ok: true, output: "aGk=" });
    assert.deepEqual(at("decode", "aGk=", "64"), { ok: true, output: "hi" });
    assert.deepEqual(at("decode", "YQ", "64"), { ok: true, output: "a" });
    assert.deepEqual(at("decode", "YQ=", "64"), {
      ok: false,
      error: "That is not valid Base64.",
    });
    assert.deepEqual(at("decode", "@@@", "64"), {
      ok: false,
      error: "That is not valid Base64.",
    });
    assert.deepEqual(at("decode", "/w==", "64"), {
      ok: false,
      error: "The decoded value is not valid UTF-8 text.",
    });
    const encoded = at("encode", "héllo", "64");
    assert.equal(encoded.ok, true);
    assert.deepEqual(at("decode", encoded.output, "64"), {
      ok: true,
      output: "héllo",
    });
  });

  it("encodes and decodes base 16", () => {
    assert.deepEqual(at("encode", "z", "16"), { ok: true, output: "7A" });
    assert.deepEqual(at("decode", "7a", "16"), { ok: true, output: "z" });
    assert.deepEqual(at("decode", "7 A\n\t", "16"), { ok: true, output: "z" });
    assert.deepEqual(at("decode", "7", "16"), {
      ok: false,
      error: "That is not valid Base 16.",
    });
    assert.deepEqual(at("decode", "GG", "16"), {
      ok: false,
      error: "That is not valid Base 16.",
    });
    assert.deepEqual(at("decode", "FF", "16"), {
      ok: false,
      error: "The decoded value is not valid UTF-8 text.",
    });
    const encoded = at("encode", "héllo", "16");
    assert.equal(encoded.ok, true);
    assert.deepEqual(at("decode", encoded.output, "16"), {
      ok: true,
      output: "héllo",
    });
  });

  it("encodes and decodes base 32", () => {
    assert.deepEqual(at("encode", "foobar", "32"), {
      ok: true,
      output: "MZXW6YTBOI======",
    });
    assert.deepEqual(at("decode", "MZXW6YTBOI", "32"), {
      ok: true,
      output: "foobar",
    });
    assert.deepEqual(at("decode", "me======", "32"), { ok: true, output: "a" });
    assert.deepEqual(at("decode", "\uFB00", "32"), {
      ok: false,
      error: "That is not valid Base 32.",
    });
    assert.deepEqual(at("encode", "ab", "32"), { ok: true, output: "MFRA====" });
    assert.deepEqual(at("encode", "abc", "32"), { ok: true, output: "MFRGG===" });
    assert.deepEqual(at("encode", "abcd", "32"), { ok: true, output: "MFRGGZA=" });
    assert.deepEqual(at("encode", "abcde", "32"), { ok: true, output: "MFRGGZDF" });
    assert.deepEqual(at("decode", "ME ======\n\t", "32"), { ok: true, output: "a" });
    assert.deepEqual(at("decode", "1", "32"), {
      ok: false,
      error: "That is not valid Base 32.",
    });
    assert.deepEqual(at("decode", "ME=", "32"), {
      ok: false,
      error: "That is not valid Base 32.",
    });
    assert.deepEqual(at("decode", "74======", "32"), {
      ok: false,
      error: "The decoded value is not valid UTF-8 text.",
    });
    const encoded = at("encode", "héllo", "32");
    assert.equal(encoded.ok, true);
    assert.deepEqual(at("decode", encoded.output, "32"), {
      ok: true,
      output: "héllo",
    });
  });

  it("encodes and decodes base 58", () => {
    assert.deepEqual(at("encode", "a", "58"), { ok: true, output: "2g" });
    assert.deepEqual(at("encode", "\0a", "58"), { ok: true, output: "12g" });
    assert.deepEqual(at("decode", "12g", "58"), { ok: true, output: "\0a" });
    assert.deepEqual(at("decode", "2 g\n\t", "58"), { ok: true, output: "a" });
    assert.deepEqual(at("decode", "0", "58"), {
      ok: false,
      error: "That is not valid Base 58.",
    });
    assert.deepEqual(at("decode", "5Q", "58"), {
      ok: false,
      error: "The decoded value is not valid UTF-8 text.",
    });
    const encoded = at("encode", "héllo", "58");
    assert.equal(encoded.ok, true);
    assert.deepEqual(at("decode", encoded.output, "58"), {
      ok: true,
      output: "héllo",
    });
  });

  it("encodes and decodes base 85", () => {
    assert.deepEqual(at("encode", "\0\0\0\0", "85"), { ok: true, output: "z" });
    assert.deepEqual(at("encode", "\0", "85"), { ok: true, output: "!!" });
    assert.deepEqual(at("decode", "z", "85"), { ok: true, output: "\0\0\0\0" });
    assert.deepEqual(at("encode", "hello", "85"), { ok: true, output: "BOu!rDZ" });
    assert.deepEqual(at("decode", "BOu!rDZ", "85"), { ok: true, output: "hello" });
    assert.deepEqual(at("encode", "Man ", "85"), { ok: true, output: "9jqo^" });
    assert.deepEqual(at("decode", "BOu! rDZ\n\t", "85"), { ok: true, output: "hello" });
    assert.deepEqual(at("decode", "!", "85"), {
      ok: false,
      error: "That is not valid Base 85.",
    });
    assert.deepEqual(at("decode", "<~BOu!rDZ~>", "85"), {
      ok: false,
      error: "That is not valid Base 85.",
    });
    assert.deepEqual(at("decode", "rr", "85"), {
      ok: false,
      error: "The decoded value is not valid UTF-8 text.",
    });
    const encoded = at("encode", "héllo", "85");
    assert.equal(encoded.ok, true);
    assert.deepEqual(at("decode", encoded.output, "85"), {
      ok: true,
      output: "héllo",
    });
  });

  it("rejects an unknown base or action", () => {
    assert.deepEqual(at("encode", "hi", "2"), {
      ok: false,
      error: "Choose Base 16, 32, 58, 64, or 85.",
    });
    assert.deepEqual(run("encode", { text: "hi" }), {
      ok: false,
      error: "Choose Base 16, 32, 58, 64, or 85.",
    });
    assert.deepEqual(at("nope", "hi", "64"), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
