"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { run } = require("../../mkdocs/assets/javascript/tools/regex-tester.js");

describe("regex tester", () => {
  it("lists every match and its groups", () => {
    assert.deepEqual(run("test", { pattern: "a(b)", sample: "ab ab" }), {
      ok: true,
      output: { result: "Match 1\n  full: ab\n  1: b\n\nMatch 2\n  full: ab\n  1: b\n" },
    });
  });

  it("uses flags between slashes and stops after one match without g", () => {
    assert.deepEqual(run("test", { pattern: "/ab/i", sample: "AB AB" }), {
      ok: true,
      output: { result: "Match 1\n  full: AB\n" },
    });
  });

  it("says when nothing matches", () => {
    assert.deepEqual(run("test", { pattern: "a", sample: "" }), {
      ok: true,
      output: { result: "No matches.\n" },
    });
  });

  it("rejects an empty pattern and an invalid pattern", () => {
    assert.deepEqual(run("test", { pattern: "", sample: "a" }), {
      ok: false,
      error: "Enter a pattern.",
    });
    assert.deepEqual(run("test", { pattern: "(", sample: "a" }), {
      ok: true,
      output: { result: "That is not a valid regular expression." },
    });
    assert.deepEqual(run("test", { pattern: "/foo/y", sample: "foo" }), {
      ok: true,
      output: { result: "That is not a valid regular expression." },
    });
  });



  it("steps one code unit past an unpaired high surrogate on empty matches", () => {
    assert.deepEqual(run("test", { pattern: "/a*/gu", sample: "\uD800a" }), {
      ok: true,
      output: {
        result:
          "Match 1\n  full: \n\nMatch 2\n  full: a\n\nMatch 3\n  full: \n",
      },
    });
  });

  it("advances past a Unicode code point on empty matches", () => {
    assert.deepEqual(run("test", { pattern: "/(?:)/gu", sample: "👍" }), {
      ok: true,
      output: { result: "Match 1\n  full: \n\nMatch 2\n  full: \n" },
    });
  });

  it("rejects an unknown action", () => {
    assert.deepEqual(run("check", { pattern: "a", sample: "a" }), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
