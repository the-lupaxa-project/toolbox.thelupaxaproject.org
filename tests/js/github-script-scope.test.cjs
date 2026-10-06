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
  path.join(JS_DIR, "github.js"),
  path.join(TOOLS_DIR, "actions-yaml-validator.js"),
  path.join(TOOLS_DIR, "dependabot-validator.js"),
  path.join(TOOLS_DIR, "workflow-inspector.js"),
];
const IDS = [
  "actions-yaml-validator",
  "dependabot-validator",
  "workflow-inspector",
];

describe("github script scope", () => {
  it("registers github tools in one shared browser realm", () => {
    const context = vm.createContext({});
    for (const file of FILES) {
      const code = fs.readFileSync(file, "utf8");
      vm.runInContext(code, context, { filename: path.basename(file) });
    }
    const tools = vm.runInContext("globalThis.LupaxaTools", context);
    for (const id of IDS) {
      assert.equal(typeof tools[id].run, "function", id);
    }
    const sample = [
      "on: push",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "",
    ].join("\n");
    vm.runInContext(`globalThis.__sample = ${JSON.stringify(sample)}`, context);
    const result = vm.runInContext(
      'globalThis.LupaxaTools["actions-yaml-validator"].run("check", globalThis.__sample)',
      context,
    );
    assert.equal(result.ok, true);
    assert.equal(result.output, "Valid.");
  });
});
