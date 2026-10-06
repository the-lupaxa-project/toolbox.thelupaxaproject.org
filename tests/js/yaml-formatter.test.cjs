"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TOOL = "../../mkdocs/assets/javascript/tools/yaml-formatter.js";

describe("yaml formatter", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaData;
  });

  afterEach(() => {
    globalThis.LupaxaData = previous;
    delete require.cache[require.resolve(TOOL)];
  });

  it("returns formatted yaml", () => {
    globalThis.LupaxaData = {
      formatYaml: (input) => {
        assert.equal(input, "a: 1");
        return "a: 1\n";
      },
    };
    const { run } = require(TOOL);
    assert.deepEqual(run("format", "a: 1"), { ok: true, output: "a: 1\n" });
  });

  it("returns minified yaml", () => {
    globalThis.LupaxaData = { minifyYaml: () => "a: 1" };
    const { run } = require(TOOL);
    assert.deepEqual(run("minify", "a: 1\n"), { ok: true, output: "a: 1" });
  });

  it("rejects an unknown action", () => {
    const { run } = require(TOOL);
    assert.deepEqual(run("check", "a: 1"), { ok: false, error: "Unknown action." });
  });
});
