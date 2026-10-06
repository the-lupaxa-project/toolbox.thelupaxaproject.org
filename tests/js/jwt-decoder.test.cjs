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
  "jwt-decoder.js",
));

const FIXTURE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

const EXPECTED_OUTPUT = [
  "Header",
  "{",
  '  "alg": "HS256",',
  '  "typ": "JWT"',
  "}",
  "",
  "Payload",
  "{",
  '  "sub": "1234567890",',
  '  "name": "John Doe",',
  '  "iat": 1516239022',
  "}",
  "",
  "Signature",
  "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
].join("\n");

describe("jwt-decoder", () => {
  it("decodes a JWT fixture", () => {
    assert.deepEqual(run("decode", FIXTURE), { ok: true, output: EXPECTED_OUTPUT });
  });

  it("rejects JWTs without three parts", () => {
    assert.deepEqual(run("decode", "a.b"), {
      ok: false,
      error: "A JWT has three parts separated by dots.",
    });
  });

  it("rejects invalid Base64url in a segment", () => {
    assert.deepEqual(run("decode", "@@.eyJ9.sig"), {
      ok: false,
      error: "That is not valid Base64url.",
    });
  });

  it("rejects invalid JSON in the payload", () => {
    assert.deepEqual(
      run(
        "decode",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.bm90LWpzb24.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      ),
      {
        ok: false,
        error: "The payload is not valid JSON.",
      },
    );
  });

  it("rejects invalid JSON in the header", () => {
    assert.deepEqual(
      run(
        "decode",
        "bm90LWpzb24.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      ),
      {
        ok: false,
        error: "The header is not valid JSON.",
      },
    );
  });

  it("rejects unknown actions", () => {
    assert.deepEqual(run("encode", FIXTURE), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
