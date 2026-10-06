"use strict";

const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TOOL = "../../mkdocs/assets/javascript/tools/uuid-generator.js";

function load() {
  delete require.cache[require.resolve(TOOL)];
  return require(TOOL);
}

describe("uuid generator", () => {
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const previousNow = Date.now;

  function stubCrypto(value) {
    Object.defineProperty(globalThis, "crypto", {
      value,
      configurable: true,
      writable: true,
      enumerable: true,
    });
  }

  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", cryptoDescriptor);
    Date.now = previousNow;
    delete require.cache[require.resolve(TOOL)];
  });

  it("writes one version 4 uuid per line", () => {
    stubCrypto({ randomUUID: () => "abababab-abab-4bab-abab-abababababab" });
    const { run } = load();
    assert.deepEqual(run("generate", { version: "4", count: "2" }), {
      ok: true,
      output: { result: "abababab-abab-4bab-abab-abababababab\nabababab-abab-4bab-abab-abababababab\n" },
    });
  });

  it("builds version 4 when randomUUID is missing", () => {
    stubCrypto({
      getRandomValues: (bytes) => {
        bytes.fill(0xab);
        return bytes;
      },
    });
    const { run } = load();
    assert.deepEqual(run("generate", { version: "4", count: "1" }), {
      ok: true,
      output: { result: "abababab-abab-4bab-abab-abababababab\n" },
    });
  });

  it("builds version 7 from the clock and random bytes", () => {
    Date.now = () => 0;
    stubCrypto({
      randomUUID: () => "not-used",
      getRandomValues: (bytes) => {
        bytes.fill(0xab);
        return bytes;
      },
    });
    const { run } = load();
    assert.deepEqual(run("generate", { version: "7", count: "1" }), {
      ok: true,
      output: { result: "00000000-0000-7bab-abab-abababababab\n" },
    });
  });

  it("builds version 7 from a non-zero clock and random bytes", () => {
    Date.now = () => 0x010203040506;
    stubCrypto({
      randomUUID: () => "not-used",
      getRandomValues: (bytes) => {
        bytes.fill(0xab);
        return bytes;
      },
    });
    const { run } = load();
    assert.deepEqual(run("generate", { version: "7", count: "1" }), {
      ok: true,
      output: { result: "01020304-0506-7bab-abab-abababababab\n" },
    });
  });

  it("rejects a bad count or version", () => {
    stubCrypto({ randomUUID: () => "x" });
    const { run } = load();
    assert.deepEqual(run("generate", { version: "4", count: "21" }), {
      ok: false,
      error: "Enter a count from 1 to 20.",
    });
    assert.deepEqual(run("generate", { version: "4", count: "01" }), {
      ok: false,
      error: "Enter a count from 1 to 20.",
    });
    assert.deepEqual(run("generate", { version: "5", count: "1" }), {
      ok: false,
      error: "Choose version 4 or 7.",
    });
  });

  it("reports a missing random source", () => {
    stubCrypto({});
    const { run } = load();
    assert.deepEqual(run("generate", { version: "4", count: "1" }), {
      ok: false,
      error: "Could not generate a UUID.",
    });
  });

  it("rejects an unknown action", () => {
    const { run } = load();
    assert.deepEqual(run("check", { version: "4", count: "1" }), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
