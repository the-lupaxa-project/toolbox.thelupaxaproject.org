"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TOOL = "../../mkdocs/assets/javascript/tools/workflow-inspector.js";

describe("workflow inspector", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaGithub;
  });

  afterEach(() => {
    globalThis.LupaxaGithub = previous;
    delete require.cache[require.resolve(TOOL)];
  });

  it("returns the outline in the output box", () => {
    globalThis.LupaxaGithub = {
      inspectWorkflow: (input) => {
        assert.equal(input, "on: push\n");
        return "Triggers\npush";
      },
    };
    const { run } = require(TOOL);
    assert.deepEqual(run("check", "on: push\n"), {
      ok: true,
      output: "Triggers\npush",
    });
  });

  it("rejects an unknown action", () => {
    const { run } = require(TOOL);
    assert.deepEqual(run("encode", "on: push\n"), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
