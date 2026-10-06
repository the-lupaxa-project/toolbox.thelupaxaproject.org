"use strict";

(function () {
  const yaml = (typeof module !== "undefined" && module.exports)
    ? require("./vendor/js-yaml.js")
    : globalThis.jsyaml;

  function parseYaml(text) {
    try {
      // json: false makes a duplicate key throw.
      return { ok: true, value: yaml.load(text, { json: false }) };
    } catch (_err) {
      return { ok: false, error: "That is not valid YAML." };
    }
  }

  function isMapping(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function checkWorkflow(text) {
    const parsed = parseYaml(text);
    if (!parsed.ok) {
      return "That is not valid YAML.";
    }
    if (!isMapping(parsed.value)) {
      return "A workflow must be a mapping.";
    }
    const problems = [];
    const doc = parsed.value;
    if (!Object.hasOwn(doc, "on")) {
      problems.push("A workflow needs on.");
    }
    if (!isMapping(doc.jobs) || Object.keys(doc.jobs).length === 0) {
      problems.push("A workflow needs jobs.");
      return problems.join("\n");
    }
    for (const [name, job] of Object.entries(doc.jobs)) {
      if (!isMapping(job)) {
        problems.push(`Job ${name} must be a mapping.`);
        continue;
      }
      if (!Object.hasOwn(job, "runs-on") && !Object.hasOwn(job, "uses")) {
        problems.push(`Job ${name} needs runs-on or uses.`);
      }
      if (!Array.isArray(job.steps)) {
        continue;
      }
      job.steps.forEach((step, index) => {
        const n = index + 1;
        if (!isMapping(step)) {
          problems.push(`Step ${n} in ${name} must be a mapping.`);
          return;
        }
        if (!Object.hasOwn(step, "uses") && !Object.hasOwn(step, "run")) {
          problems.push(`Step ${n} in ${name} needs uses or run.`);
        }
      });
    }
    return problems.length === 0 ? "Valid." : problems.join("\n");
  }

  function nonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "";
  }

  function checkDependabot(text) {
    const parsed = parseYaml(text);
    if (!parsed.ok) {
      return "That is not valid YAML.";
    }
    if (!isMapping(parsed.value)) {
      return "A Dependabot file must be a mapping.";
    }
    const problems = [];
    const doc = parsed.value;
    if (doc.version !== 2 && doc.version !== "2") {
      problems.push("version must be 2.");
    }
    if (!Array.isArray(doc.updates) || doc.updates.length === 0) {
      problems.push("updates must be a list.");
      return problems.join("\n");
    }
    doc.updates.forEach((update, index) => {
      const n = index + 1;
      if (!isMapping(update)) {
        problems.push(`Update ${n} must be a mapping.`);
        return;
      }
      if (!nonEmptyString(update["package-ecosystem"])) {
        problems.push(`Update ${n} needs package-ecosystem.`);
      }
      if (!nonEmptyString(update.directory)) {
        problems.push(`Update ${n} needs directory.`);
      }
      const interval = isMapping(update.schedule) ? update.schedule.interval : undefined;
      if (interval !== "daily" && interval !== "weekly" && interval !== "monthly") {
        problems.push(`Update ${n} needs schedule.interval of daily, weekly, or monthly.`);
      }
    });
    return problems.length === 0 ? "Valid." : problems.join("\n");
  }

  function triggerLines(on) {
    if (typeof on === "string") {
      return [on];
    }
    if (Array.isArray(on)) {
      return on.filter((item) => typeof item === "string");
    }
    if (isMapping(on)) {
      return Object.keys(on);
    }
    return ["None"];
  }

  function jobDetail(job) {
    if (typeof job["runs-on"] === "string") {
      return `runs-on: ${job["runs-on"]}`;
    }
    if (Array.isArray(job["runs-on"])) {
      const items = job["runs-on"].filter((item) => typeof item === "string");
      if (items.length > 0) {
        return `runs-on: ${items.join(", ")}`;
      }
    }
    if (typeof job.uses === "string") {
      return `uses: ${job.uses}`;
    }
    return null;
  }

  function needsLine(job) {
    if (typeof job.needs === "string" && job.needs !== "") {
      return `needs: ${job.needs}`;
    }
    if (Array.isArray(job.needs)) {
      const items = job.needs.filter((item) => typeof item === "string" && item !== "");
      if (items.length > 0) {
        return `needs: ${items.join(", ")}`;
      }
    }
    return null;
  }

  function permissionsLines(permissions) {
    if (typeof permissions === "string" && permissions.trim() !== "") {
      return [permissions.trim()];
    }
    if (!isMapping(permissions)) {
      return null;
    }
    const lines = [];
    for (const [key, value] of Object.entries(permissions)) {
      if (typeof value === "string" && value.trim() !== "") {
        lines.push(`${key}: ${value.trim()}`);
      }
    }
    return lines.length > 0 ? lines : null;
  }

  function concurrencyLines(concurrency) {
    if (typeof concurrency === "string" && concurrency.trim() !== "") {
      return [`group: ${concurrency.trim()}`];
    }
    if (!isMapping(concurrency)) {
      return null;
    }
    const lines = [];
    if (typeof concurrency.group === "string" && concurrency.group.trim() !== "") {
      lines.push(`group: ${concurrency.group.trim()}`);
    }
    const cancel = concurrency["cancel-in-progress"];
    if (typeof cancel === "boolean") {
      lines.push(`cancel-in-progress: ${cancel}`);
    } else if (typeof cancel === "string" && cancel.trim() !== "") {
      lines.push(`cancel-in-progress: ${cancel.trim()}`);
    }
    return lines.length > 0 ? lines : null;
  }

  function stepLabel(step) {
    if (!isMapping(step)) {
      return null;
    }
    if (typeof step.name === "string" && step.name.trim() !== "") {
      return step.name;
    }
    if (typeof step.uses === "string" && step.uses !== "") {
      return step.uses;
    }
    if (typeof step.run === "string") {
      const first = step.run.split("\n")[0].trim();
      return first === "" ? null : first;
    }
    return null;
  }

  function pushSection(lines, title, body) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(title);
    for (const line of body) {
      lines.push(`  ${line}`);
    }
  }

  function jobLines(jobs) {
    if (!isMapping(jobs) || Object.keys(jobs).length === 0) {
      return ["None"];
    }
    const lines = [];
    for (const [name, job] of Object.entries(jobs)) {
      lines.push(name);
      if (!isMapping(job)) {
        continue;
      }
      const needs = needsLine(job);
      if (needs) {
        lines.push(`  ${needs}`);
      }
      const detail = jobDetail(job);
      if (detail) {
        lines.push(`  ${detail}`);
      }
      if (!Array.isArray(job.steps)) {
        continue;
      }
      for (const step of job.steps) {
        const label = stepLabel(step);
        if (label) {
          lines.push(`  - ${label}`);
        }
      }
    }
    return lines;
  }

  function inspectWorkflow(text) {
    const parsed = parseYaml(text);
    if (!parsed.ok) {
      return "That is not valid YAML.";
    }
    const doc = isMapping(parsed.value) ? parsed.value : {};
    const lines = [];
    if (typeof doc.name === "string" && doc.name.trim() !== "") {
      pushSection(lines, "Name", [doc.name.trim()]);
    }
    pushSection(lines, "Triggers", triggerLines(doc.on));
    const permissions = permissionsLines(doc.permissions);
    if (permissions) {
      pushSection(lines, "Permissions", permissions);
    }
    const concurrency = concurrencyLines(doc.concurrency);
    if (concurrency) {
      pushSection(lines, "Concurrency", concurrency);
    }
    pushSection(lines, "Jobs", jobLines(doc.jobs));
    return lines.join("\n");
  }

  const api = { parseYaml, checkWorkflow, checkDependabot, inspectWorkflow };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    globalThis.LupaxaGithub = api;
  }
})();
