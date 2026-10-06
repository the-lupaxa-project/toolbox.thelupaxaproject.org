"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vendor = require("../../mkdocs/assets/javascript/vendor/js-yaml.js");

describe("js-yaml vendor script", () => {
  it("exports load at the pinned version's object", () => {
    assert.equal(typeof vendor.load, "function");
  });

  it("names the pinned version and the MIT licence", () => {
    const text = fs.readFileSync(
      path.join(__dirname, "..", "..", "mkdocs", "assets", "javascript", "vendor", "js-yaml.js"),
      "utf8",
    );
    assert.match(text, /js-yaml 5\.4\.3/);
    assert.match(text, /MIT/);
    assert.match(text, /https:\/\/github\.com\/nodeca\/js-yaml/);
    assert.equal(typeof require("../../mkdocs/assets/javascript/vendor/js-yaml.js").load, "function");
  });
});
