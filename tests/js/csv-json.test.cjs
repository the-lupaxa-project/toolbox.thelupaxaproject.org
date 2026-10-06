"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TOOL = "../../mkdocs/assets/javascript/tools/csv-json.js";

describe("csv json", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaData;
  });

  afterEach(() => {
    globalThis.LupaxaData = previous;
    delete require.cache[require.resolve(TOOL)];
  });

  it("returns json from csv", () => {
    globalThis.LupaxaData = {
      csvToJson: (input) => {
        assert.equal(input, "a\n1");
        return "[{\"a\":\"1\"}]\n";
      },
    };
    const { run } = require(TOOL);
    assert.deepEqual(run("to-json", "a\n1"), { ok: true, output: "[{\"a\":\"1\"}]\n" });
  });

  it("returns csv from json", () => {
    globalThis.LupaxaData = {
      jsonToCsv: (input) => {
        assert.equal(input, "[{\"a\":\"1\"}]");
        return "a\n1\n";
      },
    };
    const { run } = require(TOOL);
    assert.deepEqual(run("to-csv", "[{\"a\":\"1\"}]"), { ok: true, output: "a\n1\n" });
  });

  it("rejects an unknown action", () => {
    const { run } = require(TOOL);
    assert.deepEqual(run("check", "x"), { ok: false, error: "Unknown action." });
  });
});
