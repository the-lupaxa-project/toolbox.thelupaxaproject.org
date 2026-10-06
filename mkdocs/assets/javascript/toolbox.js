"use strict";

function gateInput(input) {
  const text = String(input);
  if (text.trim().length === 0) {
    return { ok: false, error: "Enter some text." };
  }
  return { ok: true, value: text };
}

function boot() {
  const widget = document.querySelector(".tool-widget");
  if (!widget || widget.dataset.bound === "true") {
    return;
  }
  widget.dataset.bound = "true";
  const toolId = widget.getAttribute("data-tool");
  const tool = (globalThis.LupaxaTools || {})[toolId];
  const input = widget.querySelector(".tool-input");
  const error = widget.querySelector(".tool-error");
  const actions = [...widget.querySelectorAll("[data-action]")];
  const outputNodes = [...widget.querySelectorAll("[data-output]")];
  const singleOutput = widget.querySelector(".tool-output:not([data-output])");
  const singleCopy = widget.querySelector(".tool-copy:not([data-copy])");

  function outputs() {
    return singleOutput ? [singleOutput, ...outputNodes] : outputNodes;
  }

  function copies() {
    const nodes = [...widget.querySelectorAll("[data-copy]")];
    return singleCopy ? [singleCopy, ...nodes] : nodes;
  }

  function showError(message) {
    error.textContent = message;
    for (const node of outputs()) {
      node.value = "";
    }
    for (const button of copies()) {
      button.disabled = true;
    }
  }

  function showOutput(value) {
    error.textContent = "";
    if (typeof value === "string") {
      singleOutput.value = value;
      singleCopy.disabled = value.length === 0;
      return;
    }
    for (const node of outputNodes) {
      const id = node.getAttribute("data-output");
      const text = String(value[id] ?? "");
      node.value = text;
      widget.querySelector(`[data-copy="${id}"]`).disabled = text.length === 0;
    }
  }

  async function onAction(action) {
    for (const button of actions) {
      button.disabled = true;
    }
    try {
      let value;
      if (input) {
        const gated = gateInput(input.value);
        if (!gated.ok) {
          showError(gated.error);
          return;
        }
        value = gated.value;
      } else {
        value = {};
        for (const field of widget.querySelectorAll("[data-field]")) {
          value[field.getAttribute("data-field")] = field.value;
        }
      }
      if (!tool || typeof tool.run !== "function") {
        showError("Unknown action.");
        return;
      }
      let result;
      try {
        result = await Promise.resolve(tool.run(action, value));
      } catch (_err) {
        showError("Unknown action.");
        return;
      }
      if (!result.ok) {
        showError(result.error);
        return;
      }
      showOutput(result.output);
    } finally {
      for (const button of actions) {
        button.disabled = false;
      }
    }
  }

  function copyText(text, button) {
    if (button.disabled) {
      return;
    }
    const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
    if (!clipboard || typeof clipboard.writeText !== "function") {
      error.textContent = "Could not copy.";
      return;
    }
    clipboard.writeText(text).then(
      () => {
        error.textContent = "";
      },
      () => {
        error.textContent = "Could not copy.";
      },
    );
  }

  for (const button of actions) {
    button.addEventListener("click", () => {
      void onAction(button.getAttribute("data-action"));
    });
  }
  if (singleCopy) {
    singleCopy.addEventListener("click", () => {
      copyText(singleOutput.value, singleCopy);
    });
  }
  for (const button of widget.querySelectorAll("[data-copy]")) {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-copy");
      const node = widget.querySelector(`[data-output="${id}"]`);
      copyText(node.value, button);
    });
  }
}

function start() {
  if (typeof document === "undefined") {
    return;
  }
  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(boot);
    return;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
    return;
  }
  boot();
}

start();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { gateInput };
}
