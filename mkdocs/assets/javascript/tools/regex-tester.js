"use strict";

(function () {
  const VALID_FLAGS = new Set(["g", "i", "m", "s", "u"]);
  const INVALID_MESSAGE = "That is not a valid regular expression.";

  function parsePattern(pattern) {
    let source;
    let flags;

    if (pattern.startsWith("/")) {
      const lastSlash = pattern.lastIndexOf("/");
      if (lastSlash > 0) {
        source = pattern.slice(1, lastSlash);
        const suffix = pattern.slice(lastSlash + 1);
        const seen = new Set();
        for (const flag of suffix) {
          if (!VALID_FLAGS.has(flag) || seen.has(flag)) {
            return { invalid: true };
          }
          seen.add(flag);
        }
        flags = suffix;
      } else {
        source = pattern;
        flags = "g";
      }
    } else {
      source = pattern;
      flags = "g";
    }

    if (source === "") {
      return { invalid: true };
    }

    try {
      new RegExp(source, flags);
    } catch {
      return { invalid: true };
    }

    return { source, flags };
  }

  function formatMatch(index, match) {
    const lines = [`Match ${index}`, `  full: ${match[0]}`];
    for (let i = 1; i < match.length; i += 1) {
      const group = match[i];
      lines.push(`  ${i}: ${group === undefined ? "" : group}`);
    }
    return lines.join("\n");
  }

  function buildResult(regex, sample) {
    const blocks = [];
    let matchIndex = 0;

    if (regex.global) {
      let match = regex.exec(sample);
      while (match !== null) {
        matchIndex += 1;
        blocks.push(formatMatch(matchIndex, match));
        if (match[0].length === 0) {
          let advance = 1;
          if (
            regex.unicode &&
            match.index < sample.length &&
            sample.codePointAt(match.index) > 0xffff
          ) {
            advance = 2;
          }
          regex.lastIndex = match.index + advance;
        }
        match = regex.exec(sample);
      }
    } else {
      const match = regex.exec(sample);
      if (match !== null) {
        matchIndex = 1;
        blocks.push(formatMatch(matchIndex, match));
      }
    }

    if (blocks.length === 0) {
      return "No matches.\n";
    }
    return `${blocks.join("\n\n")}\n`;
  }

  function run(action, fields) {
    if (action !== "test") {
      return { ok: false, error: "Unknown action." };
    }

    const pattern = String(fields.pattern ?? "");
    const sample = String(fields.sample ?? "");

    if (pattern === "") {
      return { ok: false, error: "Enter a pattern." };
    }

    const parsed = parsePattern(pattern);
    if (parsed.invalid) {
      return { ok: true, output: { result: INVALID_MESSAGE } };
    }

    const regex = new RegExp(parsed.source, parsed.flags);
    const result = buildResult(regex, sample);
    return { ok: true, output: { result } };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["regex-tester"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
