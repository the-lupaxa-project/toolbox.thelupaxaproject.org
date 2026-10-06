"use strict";

const { afterEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { gateInput } = require(path.join(
  __dirname,
  "..",
  "..",
  "mkdocs",
  "assets",
  "javascript",
  "toolbox.js",
));

const TOOLBOX_PATH = require.resolve(
  path.join(__dirname, "..", "..", "mkdocs", "assets", "javascript", "toolbox.js"),
);

function makeElement(attrs = {}, classes = [], value = "") {
  return {
    attrs,
    classes,
    value,
    disabled: false,
    textContent: "",
    dataset: {},
    listeners: {},
    getAttribute(name) {
      return Object.hasOwn(this.attrs, name) ? this.attrs[name] : null;
    },
    addEventListener(type, handler) {
      (this.listeners[type] ||= []).push(handler);
    },
  };
}

function matches(element, selector) {
  const notMatch = selector.match(/^\.([\w-]+):not\(\[([\w-]+)\]\)$/);
  if (notMatch) {
    return element.classes.includes(notMatch[1]) && !Object.hasOwn(element.attrs, notMatch[2]);
  }
  const classMatch = selector.match(/^\.([\w-]+)$/);
  if (classMatch) {
    return element.classes.includes(classMatch[1]);
  }
  const valueMatch = selector.match(/^\[([\w-]+)="([^"]*)"\]$/);
  if (valueMatch) {
    return element.attrs[valueMatch[1]] === valueMatch[2];
  }
  const attrMatch = selector.match(/^\[([\w-]+)\]$/);
  if (attrMatch) {
    return Object.hasOwn(element.attrs, attrMatch[1]);
  }
  throw new Error(`Unsupported selector: ${selector}`);
}

function makeWidget(toolId, children) {
  const widget = makeElement({ "data-tool": toolId }, ["tool-widget"]);
  widget.querySelectorAll = (selector) => children.filter((child) => matches(child, selector));
  widget.querySelector = (selector) => widget.querySelectorAll(selector)[0] || null;
  return widget;
}

function bootWidget(widget, tool) {
  let subscribed;
  globalThis.document = {
    readyState: "complete",
    querySelector: (selector) => (selector === ".tool-widget" ? widget : null),
  };
  globalThis.document$ = {
    subscribe(callback) {
      subscribed = callback;
    },
  };
  globalThis.LupaxaTools = { [widget.attrs["data-tool"]]: tool };
  delete require.cache[TOOLBOX_PATH];
  require(TOOLBOX_PATH);
  return subscribed;
}

function cleanupGlobals() {
  delete globalThis.document;
  delete globalThis.document$;
  delete globalThis.LupaxaTools;
  delete require.cache[TOOLBOX_PATH];
}

async function click(button) {
  for (const handler of button.listeners.click) {
    handler();
  }
  await new Promise((resolve) => setImmediate(resolve));
}

describe("boot", () => {
  afterEach(cleanupGlobals);

  it("builds the form value, fills each output, and enables the matching copy", async () => {
    const fieldA = makeElement({ "data-field": "a" }, [], "one");
    const fieldB = makeElement({ "data-field": "b" }, [], "two");
    const action = makeElement({ "data-action": "go" });
    const outX = makeElement({ "data-output": "x" }, [], "stale");
    const outY = makeElement({ "data-output": "y" }, [], "stale");
    const copyX = makeElement({ "data-copy": "x" });
    const copyY = makeElement({ "data-copy": "y" });
    copyX.disabled = true;
    copyY.disabled = false;
    const error = makeElement({}, ["tool-error"]);
    error.textContent = "old";
    const widget = makeWidget("form-tool", [
      fieldA, fieldB, action, outX, outY, copyX, copyY, error,
    ]);
    const calls = [];
    const boot = bootWidget(widget, {
      run(actionId, value) {
        calls.push([actionId, value]);
        return { ok: true, output: { x: "hello", y: "" } };
      },
    });

    boot();
    await click(action);

    assert.deepEqual(calls, [["go", { a: "one", b: "two" }]]);
    assert.equal(outX.value, "hello");
    assert.equal(outY.value, "");
    assert.equal(copyX.disabled, false);
    assert.equal(copyY.disabled, true);
    assert.equal(error.textContent, "");
    assert.equal(action.disabled, false);
  });

  it("clears every output and disables every copy on a failed result", async () => {
    const field = makeElement({ "data-field": "a" }, [], "one");
    const action = makeElement({ "data-action": "go" });
    const outX = makeElement({ "data-output": "x" }, [], "stale");
    const outY = makeElement({ "data-output": "y" }, [], "stale");
    const copyX = makeElement({ "data-copy": "x" });
    const copyY = makeElement({ "data-copy": "y" });
    const error = makeElement({}, ["tool-error"]);
    const widget = makeWidget("form-tool", [field, action, outX, outY, copyX, copyY, error]);
    const boot = bootWidget(widget, {
      run: () => ({ ok: false, error: "Bad input." }),
    });

    boot();
    await click(action);

    assert.equal(error.textContent, "Bad input.");
    assert.equal(outX.value, "");
    assert.equal(outY.value, "");
    assert.equal(copyX.disabled, true);
    assert.equal(copyY.disabled, true);
  });

  it("fills .tool-output and enables .tool-copy for a string result", async () => {
    const input = makeElement({}, ["tool-input"], "text");
    const action = makeElement({ "data-action": "encode" });
    const output = makeElement({}, ["tool-output"]);
    const copy = makeElement({}, ["tool-copy"]);
    copy.disabled = true;
    const error = makeElement({}, ["tool-error"]);
    const widget = makeWidget("text-tool", [input, action, output, copy, error]);
    const calls = [];
    const boot = bootWidget(widget, {
      run(actionId, value) {
        calls.push([actionId, value]);
        return { ok: true, output: "result" };
      },
    });

    boot();
    await click(action);

    assert.deepEqual(calls, [["encode", "text"]]);
    assert.equal(output.value, "result");
    assert.equal(copy.disabled, false);
    assert.equal(error.textContent, "");
  });

  it("passes the paste text and the choice to run", async () => {
    const base = makeElement({ "data-field": "base" }, [], "64");
    const input = makeElement({}, ["tool-input"], "hi");
    const action = makeElement({ "data-action": "encode" });
    const output = makeElement({}, ["tool-output"]);
    const copy = makeElement({}, ["tool-copy"]);
    const error = makeElement({}, ["tool-error"]);
    const widget = makeWidget("base-n", [base, input, action, output, copy, error]);
    const calls = [];
    const boot = bootWidget(widget, {
      run(actionId, value) {
        calls.push([actionId, value]);
        return { ok: true, output: "aGk=" };
      },
    });

    boot();
    await click(action);

    assert.deepEqual(calls, [["encode", { text: "hi", base: "64" }]]);
    assert.equal(output.value, "aGk=");
  });


  it("shows Unknown action. when run rejects", async () => {
    const input = makeElement({}, ["tool-input"], "text");
    const action = makeElement({ "data-action": "encode" });
    const output = makeElement({}, ["tool-output"], "stale");
    const copy = makeElement({}, ["tool-copy"]);
    const error = makeElement({}, ["tool-error"]);
    const widget = makeWidget("text-tool", [input, action, output, copy, error]);
    const boot = bootWidget(widget, {
      run: () => Promise.reject(new Error("boom")),
    });

    boot();
    await click(action);

    assert.equal(error.textContent, "Unknown action.");
    assert.equal(output.value, "");
    assert.equal(copy.disabled, true);
    assert.equal(action.disabled, false);
  });

  it("binds the widget once", () => {
    const input = makeElement({}, ["tool-input"], "text");
    const action = makeElement({ "data-action": "encode" });
    const output = makeElement({}, ["tool-output"]);
    const copy = makeElement({}, ["tool-copy"]);
    const error = makeElement({}, ["tool-error"]);
    const widget = makeWidget("text-tool", [input, action, output, copy, error]);
    const boot = bootWidget(widget, { run: () => ({ ok: true, output: "" }) });

    boot();
    boot();

    assert.equal(widget.dataset.bound, "true");
    assert.equal(action.listeners.click.length, 1);
    assert.equal(copy.listeners.click.length, 1);
  });
});

describe("gateInput", () => {
  it("asks for text when the input is blank", () => {
    assert.deepEqual(gateInput("  \n"), {
      ok: false,
      error: "Enter some text.",
    });
  });

  it("keeps surrounding spaces", () => {
    assert.deepEqual(gateInput(" a "), { ok: true, value: " a " });
  });

  it("exports gateInput after the widget binder is in the file", () => {
    assert.equal(typeof gateInput, "function");
  });
});
