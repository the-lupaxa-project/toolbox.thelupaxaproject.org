"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const JS_DIR = path.join(__dirname, "..", "..", "mkdocs", "assets", "javascript");
const TOOLS_DIR = path.join(JS_DIR, "tools");

const FILES = [
  path.join(JS_DIR, "vendor", "js-yaml.js"),
  path.join(JS_DIR, "data.js"),
  path.join(TOOLS_DIR, "json-formatter.js"),
  path.join(TOOLS_DIR, "yaml-formatter.js"),
  path.join(TOOLS_DIR, "json-yaml.js"),
  path.join(TOOLS_DIR, "csv-json.js"),
  path.join(TOOLS_DIR, "csv-yaml.js"),
  path.join(TOOLS_DIR, "xml-formatter.js"),
];
const IDS = [
  "json-formatter",
  "yaml-formatter",
  "json-yaml",
  "csv-json",
  "csv-yaml",
  "xml-formatter",
];

describe("data script scope", () => {
  it("registers data tools in one shared browser realm", () => {
    const context = vm.createContext({});
    for (const file of FILES) {
      const code = fs.readFileSync(file, "utf8");
      vm.runInContext(code, context, { filename: path.basename(file) });
    }
    const tools = vm.runInContext("globalThis.LupaxaTools", context);
    for (const id of IDS) {
      assert.equal(typeof tools[id].run, "function", id);
    }
    const jsonResult = vm.runInContext(
      'globalThis.LupaxaTools["json-formatter"].run("format", "{\\"a\\":1}")',
      context,
    );
    assert.equal(jsonResult.ok, true);
    assert.equal(jsonResult.output, "{\n  \"a\": 1\n}\n");
    const yamlResult = vm.runInContext(
      'globalThis.LupaxaTools["yaml-formatter"].run("format", "a: 1\\n")',
      context,
    );
    assert.equal(yamlResult.ok, true);
    assert.equal(yamlResult.output, "a: 1\n");
  });
});
