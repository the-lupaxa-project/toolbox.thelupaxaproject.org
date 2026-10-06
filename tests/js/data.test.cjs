"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { formatJson, minifyJson, formatYaml, minifyYaml, formatXml, minifyXml, csvToJson, jsonToCsv, jsonToYaml, yamlToJson, csvToYaml, yamlToCsv } = require("../../mkdocs/assets/javascript/data.js");

describe("json format", () => {
  it("pretty-prints and keeps key order", () => {
    assert.equal(formatJson('{"b":1,"a":2}'), '{\n  "b": 1,\n  "a": 2\n}\n');
  });

  it("keeps the last repeated key", () => {
    assert.equal(formatJson('{"a":1,"a":2}'), '{\n  "a": 2\n}\n');
  });

  it("reports broken json", () => {
    assert.equal(formatJson("{"), "That is not valid JSON.");
    assert.equal(minifyJson("{"), "That is not valid JSON.");
  });

  it("minifies onto one line", () => {
    assert.equal(minifyJson('{\n  "b": 1,\n  "a": 2\n}'), '{"b":1,"a":2}');
  });
});

describe("yaml format", () => {
  it("writes block style and keeps on as a string", () => {
    assert.equal(formatYaml("b: 1\na: 2\n"), "b: 1\na: 2\n");
    const parsed = formatYaml("on: push\n");
    assert.equal(parsed, "'on': push\n");
  });

  it("rejects a duplicate key", () => {
    assert.equal(formatYaml("a: 1\na: 2\n"), "That is not valid YAML.");
    assert.equal(minifyYaml("a: 1\na: 2\n"), "That is not valid YAML.");
  });

  it("minifies to flow style without a trailing newline", () => {
    assert.equal(minifyYaml("b: 1\na: 2\n"), "{b: 1, a: 2}");
  });

  it("does not throw on yaml anchors that cannot be dumped", () => {
    assert.equal(formatYaml("&a\nb: *a\n"), "That is not valid YAML.");
    assert.equal(minifyYaml("&a\nb: *a\n"), "That is not valid YAML.");
    assert.equal(yamlToJson("&a\nb: *a\n"), "That is not valid YAML.");
  });
});

const ELEMENT = 1;
const TEXT = 3;
const COMMENT = 8;

function xmlElement(name, children, attrs, namespaceURI) {
  return {
    nodeType: ELEMENT,
    nodeName: name,
    localName: name,
    namespaceURI: namespaceURI || null,
    attributes: (attrs || []).map((attr) => ({ name: attr.name, value: attr.value })),
    childNodes: children || [],
  };
}

function xmlText(value) {
  return { nodeType: TEXT, nodeValue: value, childNodes: [] };
}

function xmlComment(value) {
  return { nodeType: COMMENT, nodeValue: value, childNodes: [] };
}

function installXml(root) {
  globalThis.DOMParser = class {
    parseFromString() {
      return { documentElement: root };
    }
  };
}

describe("xml format", () => {
  it("indents tags and keeps text inside a tag", () => {
    installXml(xmlElement("root", [
      xmlText("\n"),
      xmlComment(" note "),
      xmlText("\n"),
      xmlElement("item", [xmlText(" hi ")], [{ name: "id", value: "a&b" }]),
      xmlText("\n"),
    ]));
    assert.equal(
      formatXml("<ignored/>"),
      "<root>\n  <!-- note -->\n  <item id=\"a&amp;b\"> hi </item>\n</root>\n",
    );
    assert.equal(
      minifyXml("<ignored/>"),
      "<root><!-- note --><item id=\"a&amp;b\"> hi </item></root>",
    );
  });

  it("reports a parser error", () => {
    installXml(xmlElement("parsererror", []));
    assert.equal(formatXml("nope"), "That is not valid XML.");
    assert.equal(minifyXml("nope"), "That is not valid XML.");
    delete globalThis.DOMParser;
    assert.equal(formatXml("<root/>"), "That is not valid XML.");
  });

  it("reports a parser error nested in the partial document", () => {
    const xhtml = "http://www.w3.org/1999/xhtml";
    installXml(xmlElement("root", [
      xmlElement("parsererror", [
        xmlElement("h3", [xmlText("This page contains the following errors:")], [], xhtml),
        xmlElement("div", [xmlText("error on line 1 at column 7: Premature end of data")], [], xhtml),
      ], [], xhtml),
    ]));
    assert.equal(formatXml("<root>"), "That is not valid XML.");
    assert.equal(minifyXml("<root>"), "That is not valid XML.");

    installXml(xmlElement("html", [
      xmlElement("body", [
        xmlElement("parsererror", [
          xmlElement("h3", [xmlText("This page contains the following errors:")], [], xhtml),
        ], [], xhtml),
      ], [], xhtml),
    ], [], xhtml));
    assert.equal(formatXml("nope"), "That is not valid XML.");
  });
});

describe("csv and json", () => {
  it("reads a header and does not trim cells", () => {
    assert.equal(csvToJson("name,city\n Ada ,London\n"), [
      "[",
      "  {",
      '    "name": " Ada ",',
      '    "city": "London"',
      "  }",
      "]",
      "",
    ].join("\n"));
  });

  it("keeps a quoted comma and a short row", () => {
    assert.equal(csvToJson("name,city\nAda,\"London, UK\"\nBea\n"), [
      "[",
      "  {",
      '    "name": "Ada",',
      '    "city": "London, UK"',
      "  },",
      "  {",
      '    "name": "Bea",',
      '    "city": ""',
      "  }",
      "]",
      "",
    ].join("\n"));
  });

  it("accepts crlf and a header with no rows", () => {
    assert.equal(csvToJson("name\r\nAda\r\n"), '[\n  {\n    "name": "Ada"\n  }\n]\n');
    assert.equal(csvToJson("name\n"), "[]\n");
  });

  it("ignores a trailing blank line but keeps a quoted empty cell", () => {
    assert.equal(
      csvToJson("name,city\nAda,London\n\n"),
      '[\n  {\n    "name": "Ada",\n    "city": "London"\n  }\n]\n',
    );
    assert.equal(csvToJson("name\n\"\"\n"), '[\n  {\n    "name": ""\n  }\n]\n');
  });

  it("reports csv shape errors", () => {
    assert.equal(csvToJson("name,name\nAda,Bea\n"), "A header name is repeated.");
    assert.equal(csvToJson("name\nAda,extra\n"), "A row has more cells than the header.");
    assert.equal(csvToJson("\"Ada"), "That is not valid CSV.");
  });

  it("writes every key in first-seen order", () => {
    const json = '[{"city":"London"},{"name":"Ada","city":null}]';
    assert.equal(jsonToCsv(json), "city,name\nLondon,\n,Ada\n");
  });

  it("writes a nested value as json text", () => {
    assert.equal(jsonToCsv('[{"name":"Ada","tag":{"id":1}}]'), "name,tag\nAda,\"{\"\"id\"\":1}\"\n");
  });

  it("rejects a value that is not a list of objects", () => {
    assert.equal(jsonToCsv('{"name":"Ada"}'), "The value must be a list of objects.");
    assert.equal(jsonToCsv('["Ada"]'), "Each item must be an object.");
    assert.equal(jsonToCsv("[]"), "");
    assert.equal(jsonToCsv("{"), "That is not valid JSON.");
  });
});

describe("converters", () => {
  it("converts json and yaml in the formatted form", () => {
    assert.equal(jsonToYaml('{"b":1,"a":2}'), "b: 1\na: 2\n");
    assert.equal(yamlToJson("b: 1\na: 2\n"), '{\n  "b": 1,\n  "a": 2\n}\n');
    assert.equal(jsonToYaml("{"), "That is not valid JSON.");
    assert.equal(yamlToJson("a: 1\na: 2\n"), "That is not valid YAML.");
  });

  it("converts csv and yaml", () => {
    assert.equal(csvToYaml("name,age\nAda,1\n"), "- name: Ada\n  age: '1'\n");
    assert.equal(yamlToCsv("- name: Ada\n  city: London\n- city: Paris\n"), "name,city\nAda,London\n,Paris\n");
    assert.equal(csvToYaml("name,name\n"), "A header name is repeated.");
    assert.equal(yamlToCsv("name: Ada\n"), "The value must be a list of objects.");
    assert.equal(yamlToCsv("[]\n"), "");
  });
});

