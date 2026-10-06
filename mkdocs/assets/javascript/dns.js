"use strict";

(function () {
  const RESOLVERS = {
    cloudflare: "https://cloudflare-dns.com/dns-query",
    google: "https://dns.google/resolve",
    quad9: "https://dns.quad9.net/dns-query",
  };

  const STATUS_ERRORS = {
    2: "The resolver could not answer.",
    3: "Name does not exist.",
    5: "The resolver refused the query.",
  };

  function checkName(input) {
    const trimmed = String(input).trim();
    if (trimmed.length === 0) {
      return { ok: false, error: "Enter a name." };
    }
    const bare = trimmed.endsWith(".") ? trimmed.slice(0, -1) : trimmed;
    const name = bare.toLowerCase();
    if (name.length === 0 || name.length > 253) {
      return { ok: false, error: "Enter a valid name." };
    }
    const labels = name.split(".");
    for (const label of labels) {
      if (!/^(?:_[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/.test(label)) {
        return { ok: false, error: "Enter a valid name." };
      }
    }
    return { ok: true, value: name };
  }

  function parseIpv4(value) {
    const parts = value.split(".");
    if (parts.length !== 4) {
      return null;
    }
    const octets = [];
    for (const part of parts) {
      if (!/^\d{1,3}$/.test(part)) {
        return null;
      }
      const octet = Number(part);
      if (octet > 255) {
        return null;
      }
      octets.push(octet);
    }
    return octets;
  }

  function parseIpv6(value) {
    if (value.includes(".") || value.includes("%")) {
      return null;
    }
    const halves = value.split("::");
    if (halves.length > 2) {
      return null;
    }
    const left = halves[0] === "" ? [] : halves[0].split(":");
    const right = halves.length === 1 ? [] : halves[1] === "" ? [] : halves[1].split(":");
    if (halves.length === 1 && left.length !== 8) {
      return null;
    }
    if (halves.length === 2 && left.length + right.length > 7) {
      return null;
    }
    const groups = [...left];
    if (halves.length === 2) {
      const missing = 8 - left.length - right.length;
      for (let index = 0; index < missing; index += 1) {
        groups.push("0");
      }
      groups.push(...right);
    }
    if (groups.length !== 8) {
      return null;
    }
    let nibbles = "";
    for (const group of groups) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(group)) {
        return null;
      }
      nibbles += Number.parseInt(group, 16).toString(16).padStart(4, "0");
    }
    return nibbles;
  }

  function checkAddress(input) {
    const value = String(input).trim();
    if (value.length === 0) {
      return { ok: false, error: "Enter an address." };
    }
    if (parseIpv4(value) || parseIpv6(value)) {
      return { ok: true, value };
    }
    return { ok: false, error: "Enter a valid address." };
  }

  function reverseName(address) {
    const octets = parseIpv4(address);
    if (octets) {
      return `${[...octets].reverse().join(".")}.in-addr.arpa`;
    }
    return `${parseIpv6(address).split("").reverse().join(".")}.ip6.arpa`;
  }

  function dnsStatusError(status) {
    if (status === 0) {
      return null;
    }
    return STATUS_ERRORS[status] || "The resolver returned an error.";
  }

  function unquoteTxt(data) {
    const parts = [];
    const pattern = /"((?:\\.|[^"\\])*)"/g;
    for (const match of String(data).matchAll(pattern)) {
      parts.push(match[1].replace(/\\(.)/g, "$1"));
    }
    return parts.length === 0 ? String(data) : parts.join("");
  }

  async function query(request) {
    const base = RESOLVERS[request.resolver];
    if (!base) {
      return { ok: false, error: "The resolver did not answer." };
    }
    const fetchImpl = request.fetch || globalThis.fetch;
    const params = new URLSearchParams({ name: request.name, type: request.type });
    if (request.validate) {
      params.set("do", "1");
    }
    try {
      const response = await fetchImpl(`${base}?${params}`, {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        return { ok: false, error: "The resolver did not answer." };
      }
      const body = await response.json();
      if (typeof body.Status !== "number") {
        return { ok: false, error: "The resolver did not answer." };
      }
      const raw = Array.isArray(body.Answer) ? body.Answer : [];
      return {
        ok: true,
        status: body.Status,
        authenticated: body.AD === true,
        answers: raw.map((answer) => ({
          name: answer.name,
          type: answer.type,
          ttl: answer.TTL,
          data: answer.type === 16 ? unquoteTxt(answer.data) : String(answer.data),
        })),
      };
    } catch (_err) {
      return { ok: false, error: "The resolver did not answer." };
    }
  }

  const api = { checkName, checkAddress, reverseName, dnsStatusError, query };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    globalThis.LupaxaDns = api;
  }
})();
