"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const TOOLS_DIR = path.join(__dirname, "..", "..", "mkdocs", "assets", "javascript", "tools");

// mkdocs.yml extra_javascript order.
const FILES = [
  "base-n.js",
  "url-encode-decode.js",
  "hex.js",
  "binary.js",
  "octal.js",
  "jwt-decoder.js",
  "hash-generator.js",
  "certificate-generator.js",
  "csr-generator.js",
  "certificate-inspector.js",
  "pem-der-converter.js",
];
const IDS = [
  "base-n",
  "url-encode-decode",
  "hex",
  "binary",
  "octal",
  "jwt-decoder",
  "hash-generator",
  "certificate-generator",
  "csr-generator",
  "certificate-inspector",
  "pem-der-converter",
];

describe("classic script scope", () => {
  it("registers every codec in one shared realm", () => {
    const context = vm.createContext({
      TextEncoder,
      TextDecoder,
      btoa,
      atob,
    });
    for (const file of FILES) {
      const code = fs.readFileSync(path.join(TOOLS_DIR, file), "utf8");
      vm.runInContext(code, context, { filename: file });
    }
    const tools = vm.runInContext("globalThis.LupaxaTools", context);
    assert.deepEqual(Object.keys(tools), IDS);
    for (const id of IDS) {
      assert.equal(typeof tools[id].run, "function");
    }
  });
});
