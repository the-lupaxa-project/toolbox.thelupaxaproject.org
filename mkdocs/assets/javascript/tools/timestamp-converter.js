"use strict";

(function () {
  const INVALID_TIMESTAMP = "That is not a valid timestamp.";
  const INVALID_UTC_DATE = "That is not a valid UTC date.";

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function pad3(n) {
    return String(n).padStart(3, "0");
  }

  function formatUtcFromMs(ms) {
    const date = new Date(ms);
    const year = String(date.getUTCFullYear()).padStart(4, "0");
    const month = pad2(date.getUTCMonth() + 1);
    const day = pad2(date.getUTCDate());
    const hours = pad2(date.getUTCHours());
    const minutes = pad2(date.getUTCMinutes());
    const seconds = pad2(date.getUTCSeconds());
    const remainder = ms % 1000;
    if (remainder === 0) {
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
    }
    const millis = remainder < 0 ? remainder + 1000 : remainder;
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${pad3(millis)}Z`;
  }

  function toDate(text) {
    const trimmed = String(text).trim();
    if (!/^-?\d{1,13}$/.test(trimmed)) {
      return INVALID_TIMESTAMP;
    }
    const digits = trimmed.replace(/^-/, "");
    let ms;
    if (digits.length <= 10) {
      const seconds = Number(trimmed);
      if (!Number.isFinite(seconds)) {
        return INVALID_TIMESTAMP;
      }
      ms = seconds * 1000;
    } else {
      ms = Number(trimmed);
      if (!Number.isFinite(ms)) {
        return INVALID_TIMESTAMP;
      }
    }
    return formatUtcFromMs(ms);
  }


  function utcMsFromFields(year, month, day, hour, minute, second, millis) {
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millis));
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(hour, minute, second, millis);
    return date.getTime();
  }

  function utcFieldsMatch(ms, year, month, day, hour, minute, second, millis) {
    const date = new Date(ms);
    return (
      date.getUTCFullYear() === year
      && date.getUTCMonth() + 1 === month
      && date.getUTCDate() === day
      && date.getUTCHours() === hour
      && date.getUTCMinutes() === minute
      && date.getUTCSeconds() === second
      && date.getUTCMilliseconds() === millis
    );
  }

  function toTimestamp(text) {
    const trimmed = String(text).trim();
    const wholeMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/.exec(trimmed);
    if (wholeMatch) {
      const year = Number(wholeMatch[1]);
      const month = Number(wholeMatch[2]);
      const day = Number(wholeMatch[3]);
      const hour = Number(wholeMatch[4]);
      const minute = Number(wholeMatch[5]);
      const second = Number(wholeMatch[6]);
      const ms = utcMsFromFields(year, month, day, hour, minute, second, 0);
      if (!utcFieldsMatch(ms, year, month, day, hour, minute, second, 0)) {
        return INVALID_UTC_DATE;
      }
      return String(Math.trunc(ms / 1000));
    }
    const fracMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/.exec(trimmed);
    if (fracMatch) {
      const year = Number(fracMatch[1]);
      const month = Number(fracMatch[2]);
      const day = Number(fracMatch[3]);
      const hour = Number(fracMatch[4]);
      const minute = Number(fracMatch[5]);
      const second = Number(fracMatch[6]);
      const millis = Number(fracMatch[7]);
      const ms = utcMsFromFields(year, month, day, hour, minute, second, millis);
      if (!utcFieldsMatch(ms, year, month, day, hour, minute, second, millis)) {
        return INVALID_UTC_DATE;
      }
      return String(Math.trunc(ms / 1000));
    }
    return INVALID_UTC_DATE;
  }

  function run(action, text) {
    if (action === "to-date") {
      return { ok: true, output: toDate(text) };
    }
    if (action === "to-timestamp") {
      return { ok: true, output: toTimestamp(text) };
    }
    return { ok: false, error: "Unknown action." };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["timestamp-converter"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
