"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TOOL = "../../mkdocs/assets/javascript/tools/csv-yaml.js";

describe("csv yaml", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaData;
  });

  afterEach(() => {
    globalThis.LupaxaData = previous;
    delete require.cache[require.resolve(TOOL)];
  });

  it("returns yaml from csv", () => {
    globalThis.LupaxaData = {
      csvToYaml: (input) => {
        assert.equal(input, "a\n1");
        return "- a: \"1\"\n";
      },
    };
    const { run } = require(TOOL);
    assert.deepEqual(run("to-yaml", "a\n1"), { ok: true, output: "- a: \"1\"\n" });
  });

  it("returns csv from yaml", () => {
    globalThis.LupaxaData = {
      yamlToCsv: (input) => {
        assert.equal(input, "- a: 1\n");
        return "a\n1\n";
      },
    };
    const { run } = require(TOOL);
    assert.deepEqual(run("to-csv", "- a: 1\n"), { ok: true, output: "a\n1\n" });
  });

  it("rejects an unknown action", () => {
    const { run } = require(TOOL);
    assert.deepEqual(run("check", "x"), { ok: false, error: "Unknown action." });
  });
});
