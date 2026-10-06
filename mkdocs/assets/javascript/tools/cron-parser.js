"use strict";

(function () {
  const KINDS = ["minute", "hour", "day", "month", "weekday"];
  const LABELS = ["Minute", "Hour", "Day of month", "Month", "Day of week"];
  const STAR = {
    minute: "every minute",
    hour: "every hour",
    day: "every day of the month",
    month: "every month",
    weekday: "every day of the week",
  };
  const SINGULAR = {
    minute: "minute",
    hour: "hour",
    day: "day",
    month: "month",
    weekday: "weekday",
  };
  const PLURAL = {
    minute: "minutes",
    hour: "hours",
    day: "days",
    month: "months",
    weekday: "weekdays",
  };
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const BOUNDS = {
    minute: [0, 59],
    hour: [0, 23],
    day: [1, 31],
    month: [1, 12],
    weekday: [0, 6],
  };

  function tokenValue(token, kind) {
    if (/^\d+$/.test(token)) {
      return Number(token);
    }
    const name = token.toUpperCase();
    if (kind === "month") {
      const index = MONTHS.indexOf(name);
      return index < 0 ? null : index + 1;
    }
    if (kind === "weekday") {
      const index = DAYS.indexOf(name);
      return index < 0 ? null : index;
    }
    return null;
  }

  function shown(value, kind) {
    if (kind === "month") {
      return MONTH_NAMES[value - 1];
    }
    if (kind === "weekday") {
      return DAY_NAMES[value === 7 ? 0 : value];
    }
    return String(value);
  }

  function parseAtom(item, kind) {
    const match = /^(\*|[A-Za-z]{3}|\d+)(?:-([A-Za-z]{3}|\d+))?(?:\/(\d+))?$/.exec(item);
    if (!match) {
      return null;
    }
    const hasStep = match[3] !== undefined;
    const step = hasStep ? Number(match[3]) : 1;
    if (!Number.isInteger(step) || step < 1) {
      return null;
    }
    const [min, starMax] = BOUNDS[kind];
    const hardMax = kind === "weekday" ? 7 : starMax;
    if (match[1] === "*" && match[2] !== undefined) {
      return null;
    }
    let from;
    let to;
    if (match[1] === "*") {
      from = min;
      to = starMax;
    } else {
      from = tokenValue(match[1], kind);
      if (from === null) {
        return null;
      }
      if (match[2] === undefined) {
        to = hasStep ? starMax : from;
      } else {
        to = tokenValue(match[2], kind);
        if (to === null) {
          return null;
        }
      }
    }
    if (from < min || to > hardMax || from > to) {
      return null;
    }
    const values = [];
    for (let n = from; n <= to; n += step) {
      values.push(n);
    }
    let phrase;
    if (hasStep) {
      const unit = step === 1 ? SINGULAR[kind] : PLURAL[kind];
      phrase = `every ${step} ${unit} from ${shown(from, kind)} through ${shown(to, kind)}`;
    } else if (match[1] === "*") {
      phrase = STAR[kind];
    } else if (match[2] !== undefined) {
      phrase = `${shown(from, kind)} through ${shown(to, kind)}`;
    } else {
      phrase = shown(from, kind);
    }
    return { values, phrase };
  }

  function joinPhrases(parts) {
    if (parts.length === 1) {
      return parts[0];
    }
    if (parts.length === 2) {
      return `${parts[0]} and ${parts[1]}`;
    }
    return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
  }

  function parseField(text, kind) {
    const phrases = [];
    const values = [];
    for (const item of text.split(",")) {
      if (item === "") {
        return null;
      }
      const atom = parseAtom(item, kind);
      if (!atom) {
        return null;
      }
      phrases.push(atom.phrase);
      for (const value of atom.values) {
        values.push(kind === "weekday" && value === 7 ? 0 : value);
      }
    }
    return { set: new Set(values), phrase: joinPhrases(phrases), star: text === "*" };
  }

  function pad(number) {
    return String(number).padStart(2, "0");
  }

  function formatMinute(date) {
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:00Z`;
  }

  function nextRuns(fields, nowMs) {
    const start = new Date(nowMs);
    start.setUTCSeconds(0, 0);
    start.setUTCMinutes(start.getUTCMinutes() + 1);
    const limit = new Date(start.getTime());
    limit.setUTCFullYear(limit.getUTCFullYear() + 4);
    const found = [];
    const cursor = new Date(start.getTime());
    while (cursor < limit && found.length < 5) {
      const minute = cursor.getUTCMinutes();
      const hour = cursor.getUTCHours();
      const day = cursor.getUTCDate();
      const month = cursor.getUTCMonth() + 1;
      const weekday = cursor.getUTCDay();
      const timeOk = fields[0].set.has(minute) && fields[1].set.has(hour) && fields[3].set.has(month);
      let dayOk = false;
      if (timeOk) {
        const dom = fields[2].set.has(day);
        const dow = fields[4].set.has(weekday);
        if (!fields[2].star && !fields[4].star) {
          dayOk = dom || dow;
        } else if (fields[2].star && fields[4].star) {
          dayOk = true;
        } else if (fields[2].star) {
          dayOk = dow;
        } else {
          dayOk = dom;
        }
      }
      if (timeOk && dayOk) {
        found.push(formatMinute(cursor));
      }
      cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
    }
    return found;
  }

  function explain(text) {
    const fields = text.trim().split(/\s+/);
    if (fields.length !== 5) {
      return "That is not a valid cron expression.";
    }
    const parsed = [];
    for (let i = 0; i < 5; i += 1) {
      const field = parseField(fields[i], KINDS[i]);
      if (!field) {
        return "That is not a valid cron expression.";
      }
      parsed.push(field);
    }
    const runs = nextRuns(parsed, Date.now());
    const lines = [];
    for (let i = 0; i < 5; i += 1) {
      lines.push(LABELS[i], `  ${parsed[i].phrase}`, "");
    }
    lines.push("Next runs (UTC)");
    if (runs.length === 0) {
      lines.push("  No run time in the next four years.");
    } else {
      for (const run of runs) {
        lines.push(`  ${run}`);
      }
    }
    return `${lines.join("\n")}\n`;
  }

  function run(action, text) {
    if (action !== "explain") {
      return { ok: false, error: "Unknown action." };
    }
    return { ok: true, output: explain(String(text)) };
  }

  globalThis.LupaxaTools = globalThis.LupaxaTools || {};
  globalThis.LupaxaTools["cron-parser"] = { run };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { run };
  }
})();
