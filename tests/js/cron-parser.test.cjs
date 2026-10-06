"use strict";

const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TOOL = "../../mkdocs/assets/javascript/tools/cron-parser.js";

function load() {
  delete require.cache[require.resolve(TOOL)];
  return require(TOOL);
}

describe("cron parser", () => {
  const previousNow = Date.now;
  const fixedNow = Date.parse("2026-10-06T13:00:00Z");

  afterEach(() => {
    Date.now = previousNow;
    delete require.cache[require.resolve(TOOL)];
  });

  function stubNow() {
    try {
      Date.now = () => fixedNow;
    } catch {
      Object.defineProperty(Date, "now", {
        value: () => fixedNow,
        configurable: true,
        writable: true,
      });
    }
  }

  it("explains a Monday-at-nine schedule with next runs", () => {
    stubNow();
    const { run } = load();
    const expected =
      "Minute\n" +
      "  0\n" +
      "\n" +
      "Hour\n" +
      "  9\n" +
      "\n" +
      "Day of month\n" +
      "  every day of the month\n" +
      "\n" +
      "Month\n" +
      "  every month\n" +
      "\n" +
      "Day of week\n" +
      "  Monday\n" +
      "\n" +
      "Next runs (UTC)\n" +
      "  2026-10-12T09:00:00Z\n" +
      "  2026-10-19T09:00:00Z\n" +
      "  2026-10-26T09:00:00Z\n" +
      "  2026-11-02T09:00:00Z\n" +
      "  2026-11-09T09:00:00Z\n";
    assert.deepEqual(run("explain", "0 9 * * 1"), { ok: true, output: expected });
  });

  it("explains every fifteen minutes with same-day next runs", () => {
    stubNow();
    const { run } = load();
    const expected =
      "Minute\n" +
      "  every 15 minutes from 0 through 59\n" +
      "\n" +
      "Hour\n" +
      "  every hour\n" +
      "\n" +
      "Day of month\n" +
      "  every day of the month\n" +
      "\n" +
      "Month\n" +
      "  every month\n" +
      "\n" +
      "Day of week\n" +
      "  every day of the week\n" +
      "\n" +
      "Next runs (UTC)\n" +
      "  2026-10-06T13:15:00Z\n" +
      "  2026-10-06T13:30:00Z\n" +
      "  2026-10-06T13:45:00Z\n" +
      "  2026-10-06T14:00:00Z\n" +
      "  2026-10-06T14:15:00Z\n";
    assert.deepEqual(run("explain", "*/15 * * * *"), { ok: true, output: expected });
  });

  it("explains day-of-month and day-of-week OR with mixed next runs", () => {
    stubNow();
    const { run } = load();
    const expected =
      "Minute\n" +
      "  0\n" +
      "\n" +
      "Hour\n" +
      "  0\n" +
      "\n" +
      "Day of month\n" +
      "  1\n" +
      "\n" +
      "Month\n" +
      "  every month\n" +
      "\n" +
      "Day of week\n" +
      "  Monday\n" +
      "\n" +
      "Next runs (UTC)\n" +
      "  2026-10-12T00:00:00Z\n" +
      "  2026-10-19T00:00:00Z\n" +
      "  2026-10-26T00:00:00Z\n" +
      "  2026-11-01T00:00:00Z\n" +
      "  2026-11-02T00:00:00Z\n";
    assert.deepEqual(run("explain", "0 0 1 * 1"), { ok: true, output: expected });
  });

  it("explains impossible February 31 with no runs in four years", () => {
    stubNow();
    const { run } = load();
    const result = run("explain", "0 0 31 2 *");
    assert.equal(result.ok, true);
    assert.match(result.output, /Minute\n/);
    assert.match(result.output, /Hour\n/);
    assert.match(result.output, /Day of month\n/);
    assert.match(result.output, /Month\n  February/);
    assert.match(result.output, /Day of week\n/);
    assert.match(result.output, /Next runs \(UTC\)\n  No run time in the next four years\./);
  });

  it("rejects invalid cron expressions", () => {
    stubNow();
    const { run } = load();
    const invalid = { ok: true, output: "That is not a valid cron expression." };
    assert.deepEqual(run("explain", "@daily"), invalid);
    assert.deepEqual(run("explain", "* * * *"), invalid);
  });

  it("rejects an unknown action", () => {
    stubNow();
    const { run } = load();
    assert.deepEqual(run("check", "* * * * *"), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
