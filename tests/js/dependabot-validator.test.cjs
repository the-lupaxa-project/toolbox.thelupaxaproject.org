"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TOOL = "../../mkdocs/assets/javascript/tools/dependabot-validator.js";

describe("dependabot validator", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaGithub;
  });

  afterEach(() => {
    globalThis.LupaxaGithub = previous;
    delete require.cache[require.resolve(TOOL)];
  });

  it("returns the dependabot check in the output box", () => {
    globalThis.LupaxaGithub = {
      checkDependabot: (input) => {
        assert.equal(input, "version: 2\n");
        return "Valid.";
      },
    };
    const { run } = require(TOOL);
    assert.deepEqual(run("check", "version: 2\n"), { ok: true, output: "Valid." });
  });

  it("rejects an unknown action", () => {
    const { run } = require(TOOL);
    assert.deepEqual(run("encode", "version: 2\n"), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
