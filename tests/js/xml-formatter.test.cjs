"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TOOL = "../../mkdocs/assets/javascript/tools/xml-formatter.js";

describe("xml formatter", () => {
  let previous;

  beforeEach(() => {
    previous = globalThis.LupaxaData;
  });

  afterEach(() => {
    globalThis.LupaxaData = previous;
    delete require.cache[require.resolve(TOOL)];
  });

  it("returns formatted xml", () => {
    globalThis.LupaxaData = {
      formatXml: (input) => {
        assert.equal(input, "<a/>");
        return "<a />\n";
      },
    };
    const { run } = require(TOOL);
    assert.deepEqual(run("format", "<a/>"), { ok: true, output: "<a />\n" });
  });

  it("returns minified xml", () => {
    globalThis.LupaxaData = { minifyXml: () => "<a/>" };
    const { run } = require(TOOL);
    assert.deepEqual(run("minify", "<a />\n"), { ok: true, output: "<a/>" });
  });

  it("rejects an unknown action", () => {
    const { run } = require(TOOL);
    assert.deepEqual(run("check", "<a/>"), { ok: false, error: "Unknown action." });
  });
});
