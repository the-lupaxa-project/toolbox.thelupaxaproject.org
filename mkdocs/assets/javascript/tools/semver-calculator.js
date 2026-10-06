"use strict";

(function () {
  const INVALID_VERSION = "That is not a valid version.";
  const CORE_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([^+]+))?(?:\+(.+))?$/;

  function parsePrereleaseIdentifiers(segment) {
    if (segment === "") {
      return null;
    }
    const parts = segment.split(".");
    for (const part of parts) {
      if (part === "") {
        return null;
      }
      if (/^\d+$/.test(part)) {
        if (part.length > 1 && part.startsWith("0")) {
          return null;
        }
      } else if (!/^[0-9A-Za-z-]+$/.test(part)) {
        return null;
      }
    }
    return parts;
  }

  function parseBuildIdentifiers(segment) {
    if (segment === "") {
      return null;
    }
    const parts = segment.split(".");
    for (const part of parts) {
      if (part === "") {
        return null;
      }
      if (!/^[0-9A-Za-z-]+$/.test(part)) {
        return null;
      }
    }
    return parts;
  }

  function parseVersion(text) {
    const trimmed = String(text).trim();
    const match = CORE_PATTERN.exec(trimmed);
    if (!match || match[0] !== trimmed) {
      return null;
    }
    let prerelease = null;
    if (match[4] !== undefined) {
      prerelease = parsePrereleaseIdentifiers(match[4]);
      if (prerelease === null) {
        return null;
      }
    }
    if (match[5] !== undefined) {
      if (parseBuildIdentifiers(match[5]) === null) {
        return null;
      }
    }
    return {
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
      prerelease,
      hadPrerelease: match[4] !== undefined,
      display: trimmed,
    };
  }

  function compareIdentifier(left, right) {
    const leftNumeric = /^\d+$/.test(left);
    const rightNumeric = /^\d+$/.test(right);
    if (leftNumeric && rightNumeric) {
      const leftValue = Number(left);
      const rightValue = Number(right);
      if (leftValue < rightValue) {
        return -1;
      }
      if (leftValue > rightValue) {
        return 1;
      }
      return 0;
    }
    if (leftNumeric && !rightNumeric) {
      return -1;
    }
    if (!leftNumeric && rightNumeric) {
      return 1;
    }
    if (left < right) {
      return -1;
    }
    if (left > right) {
      return 1;
    }
    return 0;
  }

  function comparePrerelease(left, right) {
    if (left === null && right === null) {
      return 0;
    }
    if (left === null) {
      return 1;
    }
    if (right === null) {
      return -1;
    }
    const maxLength = Math.max(left.length, right.length);
    for (let index = 0; index < maxLength; index += 1) {
      if (index >= left.length) {
        return -1;
      }
      if (index >= right.length) {
        return 1;
      }
      const compared = compareIdentifier(left[index], right[index]);
      if (compared !== 0) {
        return compared;
      }
    }
    return 0;
  }

  function compareVersions(left, right) {
    if (left.major !== right.major) {
      return left.major < right.major ? -1 : 1;
    }
    if (left.minor !== right.minor) {
      return left.minor < right.minor ? -1 : 1;
    }
    if (left.patch !== right.patch) {
      return left.patch < right.patch ? -1 : 1;
    }
    return comparePrerelease(left.prerelease, right.prerelease);
  }

  function compareAction(versionText, otherText) {
    const version = String(versionText ?? "").trim();
    const other = String(otherText ?? "").trim();

    if (version === "") {
      return { ok: false, error: "Enter a version." };
    }
    if (other === "") {
      return { ok: false, error: "Enter another version." };
    }

    const parsedVersion = parseVersion(version);
    const parsedOther = parseVersion(other);
    if (parsedVersion === null || parsedOther === null) {
      return { ok: true, output: { result: INVALID_VERSION } };
    }

    const compared = compareVersions(parsedVersion, parsedOther);
    if (compared === 0) {
      return {
        ok: true,
        output: { result: `${version} and ${other} are equal.` },
      };
    }
    if (compared > 0) {
      return {
        ok: true,
        output: { result: `${version} is newer than ${other}.` },
      };
    }
    return {
      ok: true,
      output: { result: `${other} is newer than ${version}.` },
    };
  }

  function stepAction(versionText, step) {
    if (step !== "major" && step !== "minor" && step !== "patch") {
      return { ok: false, error: "Choose a step of major, minor, or patch." };
    }

    const version = String(versionText ?? "").trim();
    if (version === "") {
      return { ok: false, error: "Enter a version." };
    }

    const parsed = parseVersion(version);
    if (parsed === null) {
      return { ok: true, output: { result: INVALID_VERSION } };
    }

    if (step === "major") {
      return { ok: true, output: { result: `${parsed.major + 1}.0.0` } };
    }
    if (step === "minor") {
      return { ok: true, output: { result: `${parsed.major}.${parsed.minor + 1}.0` } };
    }
    if (parsed.hadPrerelease) {
      return {
        ok: true,
        output: { result: `${parsed.major}.${parsed.minor}.${parsed.patch}` },
      };
    }
    return {
      ok: true,
      output: { result: `${parsed.major}.${parsed.minor}.${parsed.patch + 1}` },
    };
  }

  function run(action, fields) {
    const version = fields?.version;
    const other = fields?.other;
    const step = fields?.step;

    if (action === "compare") {
      return compareAction(version, other);
    }
    if (action === "step") {
      return stepAction(version, step);
    }
    return { ok: false, error: "Unknown action." };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["semver-calculator"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
