"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TOOL = "../../mkdocs/assets/javascript/tools/json-yaml.js";

describe("json yaml", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaData;
  });

  afterEach(() => {
    globalThis.LupaxaData = previous;
    delete require.cache[require.resolve(TOOL)];
  });

  it("returns yaml from json", () => {
    globalThis.LupaxaData = {
      jsonToYaml: (input) => {
        assert.equal(input, "{\"a\":1}");
        return "a: 1\n";
      },
    };
    const { run } = require(TOOL);
    assert.deepEqual(run("to-yaml", "{\"a\":1}"), { ok: true, output: "a: 1\n" });
  });

  it("returns json from yaml", () => {
    globalThis.LupaxaData = {
      yamlToJson: (input) => {
        assert.equal(input, "a: 1\n");
        return "{\"a\":1}\n";
      },
    };
    const { run } = require(TOOL);
    assert.deepEqual(run("to-json", "a: 1\n"), { ok: true, output: "{\"a\":1}\n" });
  });

  it("rejects an unknown action", () => {
    const { run } = require(TOOL);
    assert.deepEqual(run("check", "x"), { ok: false, error: "Unknown action." });
  });
});
