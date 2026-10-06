"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { run } = require("../../mkdocs/assets/javascript/tools/timestamp-converter.js");

describe("timestamp converter", () => {
  it("writes a utc date from seconds or milliseconds", () => {
    assert.deepEqual(run("to-date", "0"), { ok: true, output: "1970-01-01T00:00:00Z" });
    assert.deepEqual(run("to-date", "1"), { ok: true, output: "1970-01-01T00:00:01Z" });
    assert.deepEqual(run("to-date", "-1"), { ok: true, output: "1969-12-31T23:59:59Z" });
    assert.deepEqual(run("to-date", "0000000001001"), {
      ok: true,
      output: "1970-01-01T00:00:01.001Z",
    });
    assert.deepEqual(run("to-date", "10000000000"), {
      ok: true,
      output: "1970-04-26T17:46:40Z",
    });
    assert.deepEqual(run("to-date", "00000000001"), {
      ok: true,
      output: "1970-01-01T00:00:00.001Z",
    });
  });

  it("writes whole unix seconds and drops a fraction", () => {
    assert.deepEqual(run("to-timestamp", "1970-01-01T00:00:00Z"), { ok: true, output: "0" });
    assert.deepEqual(run("to-timestamp", "1970-01-01T00:00:01.900Z"), { ok: true, output: "1" });
    assert.deepEqual(run("to-timestamp", "1969-12-31T23:59:59Z"), { ok: true, output: "-1" });
    assert.deepEqual(run("to-timestamp", "1969-12-31T23:59:59.100Z"), { ok: true, output: "0" });
  });

  it("reports a value it cannot read", () => {
    assert.deepEqual(run("to-date", "2026-10-06T13:00:00Z"), {
      ok: true,
      output: "That is not a valid timestamp.",
    });
    assert.deepEqual(run("to-timestamp", "2026-02-31T00:00:00Z"), {
      ok: true,
      output: "That is not a valid UTC date.",
    });
    assert.deepEqual(run("to-timestamp", "2026-10-06"), {
      ok: true,
      output: "That is not a valid UTC date.",
    });
  });

  it("accepts utc years 0000 through 0099", () => {
    assert.deepEqual(run("to-timestamp", "0099-01-01T00:00:00Z"), {
      ok: true,
      output: "-59042995200",
    });
    assert.deepEqual(run("to-timestamp", "0000-01-01T00:00:00Z"), {
      ok: true,
      output: "-62167219200",
    });
    assert.deepEqual(run("to-timestamp", "0000-02-29T00:00:00Z"), {
      ok: true,
      output: "-62162121600",
    });
    assert.deepEqual(run("to-timestamp", "0100-01-01T00:00:00Z"), {
      ok: true,
      output: "-59011459200",
    });
    assert.deepEqual(run("to-timestamp", "0000-02-30T00:00:00Z"), {
      ok: true,
      output: "That is not a valid UTC date.",
    });
    assert.deepEqual(run("to-timestamp", "0000-02-31T00:00:00Z"), {
      ok: true,
      output: "That is not a valid UTC date.",
    });
  });

  it("rejects an unknown action", () => {
    assert.deepEqual(run("check", "0"), { ok: false, error: "Unknown action." });
  });
});
