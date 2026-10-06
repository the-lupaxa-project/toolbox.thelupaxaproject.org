"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vendor = require("../../mkdocs/assets/javascript/vendor/pkijs.js");

describe("pkijs vendor script", () => {
  it("exports pkijs and asn1js at the pinned versions' objects", () => {
    assert.equal(typeof vendor.pkijs.Certificate, "function");
    assert.equal(typeof vendor.asn1js.fromBER, "function");
  });

  it("names the pinned versions and the BSD-3-Clause licence", () => {
    const text = fs.readFileSync(
      path.join(__dirname, "..", "..", "mkdocs", "assets", "javascript", "vendor", "pkijs.js"),
      "utf8",
    );
    assert.match(text, /pkijs 3\.4\.1/);
    assert.match(text, /asn1js 3\.0\.10/);
    assert.match(text, /BSD-3-Clause/);
    assert.match(text, /https:\/\/github\.com\/PeculiarVentures\/PKI\.js/);
    assert.match(text, /https:\/\/github\.com\/PeculiarVentures\/ASN1\.js/);
  });
});
