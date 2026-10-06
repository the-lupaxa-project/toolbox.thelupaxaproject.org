"use strict";

(function () {
  const yaml = (typeof module !== "undefined" && module.exports)
    ? require("./vendor/js-yaml.js")
    : globalThis.jsyaml;

  function loadYaml(text) {
    try {
      return { ok: true, value: yaml.load(text, { json: false }) };
    } catch (_err) {
      return { ok: false, error: "That is not valid YAML." };
    }
  }

  function dumpBlock(value) {
    try {
      const dumped = yaml.dump(value, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        flowLevel: -1,
      });
      return dumped.endsWith("\n") ? dumped : dumped + "\n";
    } catch (_err) {
      return "That is not valid YAML.";
    }
  }

  function formatYaml(text) {
    const parsed = loadYaml(text);
    return parsed.ok ? dumpBlock(parsed.value) : parsed.error;
  }

  function minifyYaml(text) {
    const parsed = loadYaml(text);
    if (!parsed.ok) {
      return parsed.error;
    }
    try {
      const dumped = yaml.dump(parsed.value, {
        flowLevel: 0,
        condenseFlow: true,
        lineWidth: -1,
        noRefs: true,
      });
      return dumped.endsWith("\n") ? dumped.slice(0, -1) : dumped;
    } catch (_err) {
      return "That is not valid YAML.";
    }
  }

  function formatJson(text) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2) + "\n";
    } catch (_err) {
      return "That is not valid JSON.";
    }
  }

  function minifyJson(text) {
    try {
      return JSON.stringify(JSON.parse(text));
    } catch (_err) {
      return "That is not valid JSON.";
    }
  }

  const XML_ELEMENT = 1;
  const XML_TEXT = 3;
  const XML_CDATA = 4;
  const XML_COMMENT = 8;

  const XHTML_NS = "http://www.w3.org/1999/xhtml";

  function xmlLocalName(node) {
    return String(node.localName || node.nodeName || "").toLowerCase();
  }

  function xmlHasParserError(node, isRoot) {
    if (!node || node.nodeType !== XML_ELEMENT) {
      return false;
    }
    if (xmlLocalName(node) === "parsererror" && (isRoot || node.namespaceURI === XHTML_NS)) {
      return true;
    }
    const children = node.childNodes || [];
    for (let i = 0; i < children.length; i += 1) {
      if (xmlHasParserError(children[i], false)) {
        return true;
      }
    }
    return false;
  }

  function parseXml(text) {
    if (typeof globalThis.DOMParser !== "function") {
      return null;
    }
    const doc = new globalThis.DOMParser().parseFromString(text, "text/xml");
    const root = doc && doc.documentElement;
    if (!root || xmlHasParserError(root, true)) {
      return null;
    }
    return root;
  }

  function escapeXmlText(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escapeXmlAttr(value) {
    return escapeXmlText(value).replace(/"/g, "&quot;");
  }

  function xmlAttributes(node) {
    const attrs = node.attributes;
    if (!attrs || typeof attrs.length !== "number") {
      return [];
    }
    const list = [];
    for (let i = 0; i < attrs.length; i += 1) {
      list.push(typeof attrs.item === "function" ? attrs.item(i) : attrs[i]);
    }
    return list;
  }

  function xmlAttrText(node) {
    return xmlAttributes(node).map((attr) => {
      const name = attr.name || attr.nodeName;
      const value = attr.value !== undefined ? attr.value : attr.nodeValue;
      return ` ${name}="${escapeXmlAttr(String(value))}"`;
    }).join("");
  }

  function xmlChildren(node) {
    return Array.from(node.childNodes || []);
  }

  function xmlBlank(value) {
    return /^[\t\n\r ]*$/.test(value);
  }

  function xmlOpen(node) {
    return `<${node.nodeName}${xmlAttrText(node)}>`;
  }

  function xmlClose(node) {
    return `</${node.nodeName}>`;
  }

  function xmlHasInline(children) {
    return children.some((child) => {
      if (child.nodeType === XML_CDATA) {
        return true;
      }
      return child.nodeType === XML_TEXT && !xmlBlank(child.nodeValue || "");
    });
  }

  function xmlInline(node) {
    if (node.nodeType === XML_TEXT) {
      return escapeXmlText(node.nodeValue || "");
    }
    if (node.nodeType === XML_CDATA) {
      return `<![CDATA[${node.nodeValue || ""}]]>`;
    }
    if (node.nodeType === XML_COMMENT) {
      return `<!--${node.nodeValue || ""}-->`;
    }
    if (node.nodeType !== XML_ELEMENT) {
      return "";
    }
    const inner = xmlChildren(node).map((child) => xmlInline(child)).join("");
    return `${xmlOpen(node)}${inner}${xmlClose(node)}`;
  }

  function xmlBlock(node, depth) {
    const pad = "  ".repeat(depth);
    const children = xmlChildren(node);
    if (children.length === 0) {
      return `${pad}${xmlOpen(node)}${xmlClose(node)}`;
    }
    if (xmlHasInline(children)) {
      return `${pad}${xmlInline(node)}`;
    }
    const lines = [`${pad}${xmlOpen(node)}`];
    for (const child of children) {
      if (child.nodeType === XML_TEXT) {
        continue;
      }
      if (child.nodeType === XML_COMMENT) {
        lines.push(`${pad}  <!--${child.nodeValue || ""}-->`);
        continue;
      }
      if (child.nodeType === XML_ELEMENT) {
        lines.push(xmlBlock(child, depth + 1));
      }
    }
    lines.push(`${pad}${xmlClose(node)}`);
    return lines.join("\n");
  }

  function xmlMinifyNode(node) {
    if (node.nodeType === XML_TEXT) {
      return xmlBlank(node.nodeValue || "") ? "" : escapeXmlText(node.nodeValue);
    }
    if (node.nodeType === XML_CDATA) {
      return `<![CDATA[${node.nodeValue || ""}]]>`;
    }
    if (node.nodeType === XML_COMMENT) {
      return `<!--${node.nodeValue || ""}-->`;
    }
    if (node.nodeType !== XML_ELEMENT) {
      return "";
    }
    const inner = xmlChildren(node).map((child) => xmlMinifyNode(child)).join("");
    return `${xmlOpen(node)}${inner}${xmlClose(node)}`;
  }

  function formatXml(text) {
    const root = parseXml(text);
    if (!root) {
      return "That is not valid XML.";
    }
    return xmlBlock(root, 0) + "\n";
  }

  function minifyXml(text) {
    const root = parseXml(text);
    if (!root) {
      return "That is not valid XML.";
    }
    return xmlMinifyNode(root);
  }


  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    let closedQuote = false;
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          closedQuote = true;
          i += 1;
          continue;
        }
        field += ch;
        i += 1;
        continue;
      }
      if (ch === '"') {
        if (field !== "" || closedQuote) {
          return { ok: false, error: "That is not valid CSV." };
        }
        inQuotes = true;
        i += 1;
        continue;
      }
      if (ch === ",") {
        row.push(field);
        field = "";
        closedQuote = false;
        i += 1;
        continue;
      }
      if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") {
          i += 1;
        }
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        closedQuote = false;
        i += 1;
        continue;
      }
      if (closedQuote) {
        return { ok: false, error: "That is not valid CSV." };
      }
      field += ch;
      i += 1;
    }
    if (inQuotes) {
      return { ok: false, error: "That is not valid CSV." };
    }
    if (field !== "" || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    if (rows.length === 0) {
      return { ok: false, error: "That is not valid CSV." };
    }
    if (
      rows.length > 1
      && (/\n\n$/.test(text) || /\r\n\r\n$/.test(text) || /\n\r\n$/.test(text))
    ) {
      const trailing = rows[rows.length - 1];
      if (trailing.length === 1 && trailing[0] === "") {
        rows.pop();
      }
    }
    const headers = rows[0];
    const seen = new Set();
    for (const header of headers) {
      if (seen.has(header)) {
        return { ok: false, error: "A header name is repeated." };
      }
      seen.add(header);
    }
    const objects = [];
    for (const cells of rows.slice(1)) {
      if (cells.length > headers.length) {
        return { ok: false, error: "A row has more cells than the header." };
      }
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = index < cells.length ? cells[index] : "";
      });
      objects.push(obj);
    }
    return { ok: true, value: objects };
  }

  function quoteCsv(text) {
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function csvCell(value) {
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }

  function isObjectRow(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function objectsToCsv(value) {
    if (!Array.isArray(value)) {
      return "The value must be a list of objects.";
    }
    if (value.length === 0) {
      return "";
    }
    for (const item of value) {
      if (!isObjectRow(item)) {
        return "Each item must be an object.";
      }
    }
    const headers = [];
    const seen = new Set();
    for (const item of value) {
      for (const key of Object.keys(item)) {
        if (!seen.has(key)) {
          seen.add(key);
          headers.push(key);
        }
      }
    }
    const lines = [headers.map((header) => quoteCsv(header)).join(",")];
    for (const item of value) {
      const cells = headers.map((header) => {
        if (!Object.hasOwn(item, header) || item[header] === null) {
          return "";
        }
        return quoteCsv(csvCell(item[header]));
      });
      lines.push(cells.join(","));
    }
    return lines.join("\n") + "\n";
  }

  function csvToJson(text) {
    const parsed = parseCsv(text);
    if (!parsed.ok) {
      return parsed.error;
    }
    return JSON.stringify(parsed.value, null, 2) + "\n";
  }

  function jsonToCsv(text) {
    try {
      return objectsToCsv(JSON.parse(text));
    } catch (_err) {
      return "That is not valid JSON.";
    }
  }


  function jsonToYaml(text) {
    try {
      return dumpBlock(JSON.parse(text));
    } catch (_err) {
      return "That is not valid JSON.";
    }
  }

  function yamlToJson(text) {
    const parsed = loadYaml(text);
    if (!parsed.ok) {
      return parsed.error;
    }
    try {
      return JSON.stringify(parsed.value, null, 2) + "\n";
    } catch (_err) {
      return "That is not valid YAML.";
    }
  }

  function csvToYaml(text) {
    const parsed = parseCsv(text);
    if (!parsed.ok) {
      return parsed.error;
    }
    return dumpBlock(parsed.value);
  }

  function yamlToCsv(text) {
    const parsed = loadYaml(text);
    if (!parsed.ok) {
      return parsed.error;
    }
    try {
      return objectsToCsv(parsed.value);
    } catch (_err) {
      return "That is not valid YAML.";
    }
  }

  const api = { formatJson, minifyJson, formatYaml, minifyYaml, formatXml, minifyXml, csvToJson, jsonToCsv, jsonToYaml, yamlToJson, csvToYaml, yamlToCsv };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    globalThis.LupaxaData = api;
  }
})();
