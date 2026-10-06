"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TOOL = "../../mkdocs/assets/javascript/tools/json-formatter.js";

describe("json formatter", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaData;
  });

  afterEach(() => {
    globalThis.LupaxaData = previous;
    delete require.cache[require.resolve(TOOL)];
  });

  it("returns formatted json", () => {
    globalThis.LupaxaData = {
      formatJson: (input) => {
        assert.equal(input, "{\"a\":1}");
        return "{\n  \"a\": 1\n}\n";
      },
    };
    const { run } = require(TOOL);
    assert.deepEqual(run("format", "{\"a\":1}"), { ok: true, output: "{\n  \"a\": 1\n}\n" });
  });

  it("returns minified json", () => {
    globalThis.LupaxaData = { minifyJson: () => "{\"a\":1}" };
    const { run } = require(TOOL);
    assert.deepEqual(run("minify", "{\n}"), { ok: true, output: "{\"a\":1}" });
  });

  it("rejects an unknown action", () => {
    const { run } = require(TOOL);
    assert.deepEqual(run("check", "{}"), { ok: false, error: "Unknown action." });
  });
});
