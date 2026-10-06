"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TOOL = "../../mkdocs/assets/javascript/tools/actions-yaml-validator.js";

describe("actions yaml validator", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaGithub;
  });

  afterEach(() => {
    globalThis.LupaxaGithub = previous;
    delete require.cache[require.resolve(TOOL)];
  });

  it("returns the workflow check in the output box", () => {
    globalThis.LupaxaGithub = {
      checkWorkflow: (input) => {
        assert.equal(input, "on: push\n");
        return "Valid.";
      },
    };
    const { run } = require(TOOL);
    assert.deepEqual(run("check", "on: push\n"), { ok: true, output: "Valid." });
  });

  it("rejects an unknown action", () => {
    const { run } = require(TOOL);
    assert.deepEqual(run("encode", "on: push\n"), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
