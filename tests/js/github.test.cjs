"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseYaml, checkWorkflow, checkDependabot, inspectWorkflow } = require("../../mkdocs/assets/javascript/github.js");

describe("parse yaml", () => {
  it("keeps on as a string key and keeps a block scalar", () => {
    const parsed = parseYaml("on: push\njobs:\n  build:\n    run: |\n      npm test\n");
    assert.equal(parsed.ok, true);
    assert.equal(Object.hasOwn(parsed.value, "on"), true);
    assert.equal(parsed.value.on, "push");
    assert.equal(parsed.value.jobs.build.run, "npm test\n");
  });

  it("rejects a duplicate key and other broken yaml", () => {
    assert.deepEqual(parseYaml("a: 1\na: 2\n"), {
      ok: false,
      error: "That is not valid YAML.",
    });
    assert.deepEqual(parseYaml("a: [\n"), {
      ok: false,
      error: "That is not valid YAML.",
    });
  });
});

describe("check workflow", () => {
  it("accepts a job with runs-on and a reusable job", () => {
    const text = [
      "on: push",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "  call:",
      "    uses: org/repo/.github/workflows/ci.yml@main",
    ].join("\n");
    assert.equal(checkWorkflow(text), "Valid.");
  });

  it("accepts a job with runs-on and no steps", () => {
    const text = [
      "on: push",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
    ].join("\n");
    assert.equal(checkWorkflow(text), "Valid.");
  });

  it("lists every shape problem", () => {
    const text = [
      "name: demo",
      "jobs:",
      "  bad: []",
      "  empty: {}",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - name: only a name",
      "      - nope",
    ].join("\n");
    assert.equal(checkWorkflow(text), [
      "A workflow needs on.",
      "Job bad must be a mapping.",
      "Job empty needs runs-on or uses.",
      "Step 1 in build needs uses or run.",
      "Step 2 in build must be a mapping.",
    ].join("\n"));
  });

  it("rejects a list, missing jobs, and broken yaml", () => {
    assert.equal(checkWorkflow("- just a list\n"), "A workflow must be a mapping.");
    assert.equal(checkWorkflow("on: push\njobs: []\n"), "A workflow needs jobs.");
    assert.equal(checkWorkflow("on: push\n"), "A workflow needs jobs.");
    assert.equal(checkWorkflow("on: push\njobs: {}\n"), "A workflow needs jobs.");
    assert.equal(checkWorkflow("a: [\n"), "That is not valid YAML.");
  });
});

describe("inspect workflow", () => {
  it("outlines triggers, runs-on, uses, and prefers a step name", () => {
    const text = [
      "on:",
      "  push:",
      "  pull_request:",
      "jobs:",
      "  build:",
      "    runs-on: [ubuntu-latest, windows-latest]",
      "    steps:",
      "      - name: Install",
      "        uses: actions/setup-node@v4",
      "      - run: |",
      "          npm test",
      "          npm run lint",
      "  call:",
      "    uses: org/repo/.github/workflows/ci.yml@main",
    ].join("\n");
    assert.equal(inspectWorkflow(text), [
      "Triggers",
      "  push",
      "  pull_request",
      "",
      "Jobs",
      "  build",
      "    runs-on: ubuntu-latest, windows-latest",
      "    - Install",
      "    - npm test",
      "  call",
      "    uses: org/repo/.github/workflows/ci.yml@main",
    ].join("\n"));
  });

  it("says none when triggers or jobs are missing", () => {
    assert.equal(inspectWorkflow("name: demo\n"), [
      "Name",
      "  demo",
      "",
      "Triggers",
      "  None",
      "",
      "Jobs",
      "  None",
    ].join("\n"));
    assert.equal(inspectWorkflow("a: [\n"), "That is not valid YAML.");
  });

  it("shows permissions, concurrency, and what a job needs", () => {
    const text = [
      "name: CI",
      "on: push",
      "permissions:",
      "  contents: read",
      "  pull-requests: write",
      "concurrency:",
      "  group: ci",
      "  cancel-in-progress: true",
      "jobs:",
      "  lint:",
      "    runs-on: ubuntu-latest",
      "  build:",
      "    needs: [lint, test]",
      "    uses: org/repo/.github/workflows/build.yml@main",
    ].join("\n");
    assert.equal(inspectWorkflow(text), [
      "Name",
      "  CI",
      "",
      "Triggers",
      "  push",
      "",
      "Permissions",
      "  contents: read",
      "  pull-requests: write",
      "",
      "Concurrency",
      "  group: ci",
      "  cancel-in-progress: true",
      "",
      "Jobs",
      "  lint",
      "    runs-on: ubuntu-latest",
      "  build",
      "    needs: lint, test",
      "    uses: org/repo/.github/workflows/build.yml@main",
    ].join("\n"));
  });

  it("shows a string permission and a string concurrency group", () => {
    const text = [
      "on: push",
      "permissions: read-all",
      "concurrency: ci",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    needs: lint",
    ].join("\n");
    assert.equal(inspectWorkflow(text), [
      "Triggers",
      "  push",
      "",
      "Permissions",
      "  read-all",
      "",
      "Concurrency",
      "  group: ci",
      "",
      "Jobs",
      "  build",
      "    needs: lint",
      "    runs-on: ubuntu-latest",
    ].join("\n"));
  });

  it("leaves an empty trigger list empty", () => {
    const text = [
      "on: []",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
    ].join("\n");
    assert.equal(inspectWorkflow(text), [
      "Triggers",
      "",
      "Jobs",
      "  build",
      "    runs-on: ubuntu-latest",
    ].join("\n"));
  });

  it("shows only a job name when the job is not a mapping", () => {
    const text = [
      "on: push",
      "jobs:",
      "  bad: []",
      "  good:",
      "    runs-on: ubuntu-latest",
    ].join("\n");
    assert.equal(inspectWorkflow(text), [
      "Triggers",
      "  push",
      "",
      "Jobs",
      "  bad",
      "  good",
      "    runs-on: ubuntu-latest",
    ].join("\n"));
  });

  it("omits a step with no label", () => {
    const text = [
      "on: push",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - run: \"\"",
    ].join("\n");
    assert.equal(inspectWorkflow(text), [
      "Triggers",
      "  push",
      "",
      "Jobs",
      "  build",
      "    runs-on: ubuntu-latest",
      "    - actions/checkout@v4",
    ].join("\n"));
  });

  it("falls through to uses when runs-on is a list with no strings", () => {
    const text = [
      "on: push",
      "jobs:",
      "  call:",
      "    runs-on: [1, true]",
      "    uses: org/repo/.github/workflows/ci.yml@main",
    ].join("\n");
    assert.equal(inspectWorkflow(text), [
      "Triggers",
      "  push",
      "",
      "Jobs",
      "  call",
      "    uses: org/repo/.github/workflows/ci.yml@main",
    ].join("\n"));
  });
});

describe("check dependabot", () => {
  it("accepts version 2 as a number or a string", () => {
    const body = [
      "updates:",
      "  - package-ecosystem: npm",
      "    directory: /",
      "    schedule:",
      "      interval: weekly",
    ].join("\n");
    assert.equal(checkDependabot(`version: 2\n${body}`), "Valid.");
    assert.equal(checkDependabot(`version: "2"\n${body}`), "Valid.");
  });

  it("lists every update problem and skips a non-mapping", () => {
    const text = [
      "version: 1",
      "updates:",
      "  - no",
      "  - package-ecosystem: \" \"",
      "    directory: \"\"",
      "    schedule:",
      "      interval: hourly",
    ].join("\n");
    assert.equal(checkDependabot(text), [
      "version must be 2.",
      "Update 1 must be a mapping.",
      "Update 2 needs package-ecosystem.",
      "Update 2 needs directory.",
      "Update 2 needs schedule.interval of daily, weekly, or monthly.",
    ].join("\n"));
  });

  it("rejects a list and an empty updates list", () => {
    assert.equal(checkDependabot("- item\n"), "A Dependabot file must be a mapping.");
    assert.equal(checkDependabot("version: 2\n"), "updates must be a list.");
    assert.equal(checkDependabot("version: 2\nupdates: []\n"), "updates must be a list.");
    assert.equal(checkDependabot("a: [\n"), "That is not valid YAML.");
  });
});
