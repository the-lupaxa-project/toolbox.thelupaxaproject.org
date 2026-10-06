"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { run } = require("../../mkdocs/assets/javascript/tools/semver-calculator.js");

describe("semver calculator", () => {
  it("compares precedence and ignores build metadata", () => {
    assert.deepEqual(run("compare", { version: "1.2.3", other: "1.2.0", step: "patch" }), {
      ok: true,
      output: { result: "1.2.3 is newer than 1.2.0." },
    });
    assert.deepEqual(run("compare", { version: "1.2.0", other: "1.2.3", step: "patch" }), {
      ok: true,
      output: { result: "1.2.3 is newer than 1.2.0." },
    });
    assert.deepEqual(run("compare", { version: "1.0.0", other: "1.0.0-rc.1", step: "patch" }), {
      ok: true,
      output: { result: "1.0.0 is newer than 1.0.0-rc.1." },
    });
    assert.deepEqual(run("compare", { version: "1.0.0", other: "1.0.0+build.1", step: "patch" }), {
      ok: true,
      output: { result: "1.0.0 and 1.0.0+build.1 are equal." },
    });
  });

  it("steps major, minor, and patch, and releases a pre-release on patch", () => {
    assert.deepEqual(run("step", { version: "1.2.3", other: "", step: "major" }), {
      ok: true,
      output: { result: "2.0.0" },
    });
    assert.deepEqual(run("step", { version: "1.2.3", other: "nope", step: "minor" }), {
      ok: true,
      output: { result: "1.3.0" },
    });
    assert.deepEqual(run("step", { version: "1.2.3", other: "", step: "patch" }), {
      ok: true,
      output: { result: "1.2.4" },
    });
    assert.deepEqual(run("step", { version: "1.2.3-rc.1", other: "", step: "patch" }), {
      ok: true,
      output: { result: "1.2.3" },
    });
  });

  it("rejects an empty or invalid version", () => {
    assert.deepEqual(run("compare", { version: "  ", other: "1.0.0", step: "patch" }), {
      ok: false,
      error: "Enter a version.",
    });
    assert.deepEqual(run("compare", { version: "1.0.0", other: "", step: "patch" }), {
      ok: false,
      error: "Enter another version.",
    });
    assert.deepEqual(run("compare", { version: "v1.2.3", other: "1.2.3", step: "patch" }), {
      ok: true,
      output: { result: "That is not a valid version." },
    });
    assert.deepEqual(run("step", { version: "1.2", other: "", step: "build" }), {
      ok: false,
      error: "Choose a step of major, minor, or patch.",
    });
  });


  it("allows leading zeros in build metadata only", () => {
    assert.deepEqual(run("compare", { version: "1.0.0-alpha+001", other: "1.0.0-alpha", step: "patch" }), {
      ok: true,
      output: { result: "1.0.0-alpha+001 and 1.0.0-alpha are equal." },
    });
    assert.deepEqual(run("compare", { version: "1.0.0+01", other: "1.0.0", step: "patch" }), {
      ok: true,
      output: { result: "1.0.0+01 and 1.0.0 are equal." },
    });
    assert.deepEqual(run("compare", { version: "1.0.0-01", other: "1.0.0", step: "patch" }), {
      ok: true,
      output: { result: "That is not a valid version." },
    });
    assert.deepEqual(run("compare", { version: "1.0.0+", other: "1.0.0", step: "patch" }), {
      ok: true,
      output: { result: "That is not a valid version." },
    });
    assert.deepEqual(run("compare", { version: "1.0.0+build_1", other: "1.0.0", step: "patch" }), {
      ok: true,
      output: { result: "That is not a valid version." },
    });
  });

  it("rejects an unknown action", () => {
    assert.deepEqual(run("check", { version: "1.0.0", other: "1.0.0", step: "patch" }), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
