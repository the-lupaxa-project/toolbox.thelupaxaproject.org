"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { run } = require("../../mkdocs/assets/javascript/tools/hash-generator.js");

describe("hash generator", () => {
  it("hashes abc with SHA-256, SHA-384, and SHA-512", async () => {
    assert.deepEqual(await run("sha-256", "abc"), {
      ok: true,
      output: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    });
    assert.deepEqual(await run("sha-384", "abc"), {
      ok: true,
      output: "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7",
    });
    assert.deepEqual(await run("sha-512", "abc"), {
      ok: true,
      output: "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
    });
  });

  it("hashes UTF-8 and keeps surrounding spaces", async () => {
    assert.deepEqual(await run("sha-256", "£"), {
      ok: true,
      output: "b4fe151e413445357b1c0935e7cf04a429492ebd23dc62bfadb2f898c431c1fd",
    });
    assert.deepEqual(await run("sha-256", "  abc  "), {
      ok: true,
      output: "e1df0bfff7ba8ed81085b91ad7dde5d31777855835b80db6d99b56ef9f3aaa6b",
    });
  });

  it("rejects an unknown action", async () => {
    assert.deepEqual(await run("md5", "abc"), {
      ok: false,
      error: "Unknown action.",
    });
  });
});
