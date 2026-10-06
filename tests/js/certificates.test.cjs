"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

const {
  createCertificate,
  createCsr,
  inspectCertificate,
  certificateToDer,
  derToCertificate,
} = require("../../mkdocs/assets/javascript/certificates.js");
const { pkijs, asn1js } = require("../../mkdocs/assets/javascript/vendor/pkijs.js");

const NOW = new Date("2026-10-06T07:38:00Z");

const RSA_REPORT =
  /^Subject\nCN=example\.com\n\nIssuer\nCN=example\.com\n\nSerial\n[1-9a-f][0-9a-f]*\n\nNot before\n2026-10-06T07:38:00Z\n\nNot after\n2027-10-06T07:38:00Z\n\nSignature\nSHA-256 with RSA\n\nPublic key\nRSA 2048$/;

const ECDSA_REPORT =
  /^Subject\nCN=example\.com\n\nIssuer\nCN=example\.com\n\nSerial\n[1-9a-f][0-9a-f]*\n\nNot before\n2026-10-06T07:38:00Z\n\nNot after\n2027-10-06T07:38:00Z\n\nSignature\nSHA-256 with ECDSA\n\nPublic key\nECDSA P-256$/;

const RSA_IMPORT = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
const RSA_SIGN = { name: "RSASSA-PKCS1-v1_5" };
const EC_IMPORT = { name: "ECDSA", namedCurve: "P-256" };
const EC_SIGN = { name: "ECDSA", hash: "SHA-256" };

function pemBase64(pem, label) {
  const begin = `-----BEGIN ${label}-----`;
  const end = `-----END ${label}-----`;
  const from = pem.indexOf(begin);
  const to = pem.indexOf(end);
  assert.ok(from !== -1, `missing ${begin}`);
  assert.ok(to > from, `missing ${end}`);
  return pem.slice(from + begin.length, to).replace(/[ \t\n\r\f\v]/g, "");
}

function decodeBase64(text) {
  assert.match(text, /^[A-Za-z0-9+/]*={0,2}$/);
  return new Uint8Array(Buffer.from(text, "base64"));
}

function toArrayBuffer(bytes) {
  return new Uint8Array(bytes).buffer;
}

function pemBytes(pem, label) {
  return decodeBase64(pemBase64(pem, label));
}

function toPem(label, der) {
  const base64 = Buffer.from(new Uint8Array(der)).toString("base64");
  return `-----BEGIN ${label}-----\n${base64.match(/.{1,64}/g).join("\n")}\n-----END ${label}-----\n`;
}

// Every wrapped line but the last is exactly 64 characters.
function assertWrappedAt64(pem, label) {
  assert.ok(pem.endsWith("\n"), `${label} block does not end with a newline`);
  const lines = pem.split("\n").filter((line) => !line.startsWith("-----") && line !== "");
  assert.ok(lines.length > 0, `${label} block has no Base64 lines`);
  for (const line of lines) {
    assert.ok(line.length <= 64, `${label} line is ${line.length} characters`);
  }
  for (const line of lines.slice(0, -1)) {
    assert.equal(line.length, 64, `${label} is not wrapped at 64 characters`);
  }
}

function parseCertificate(pem) {
  return pkijs.Certificate.fromBER(toArrayBuffer(pemBytes(pem, "CERTIFICATE")));
}

function extensionSchema(extension) {
  const asn1 = asn1js.fromBER(extension.extnValue.valueBlock.valueHexView.slice().buffer);
  assert.notEqual(asn1.offset, -1, `extension ${extension.extnID} did not parse`);
  return asn1.result;
}

function onlyExtension(extensions, extnID) {
  const found = extensions.filter((candidate) => candidate.extnID === extnID);
  assert.equal(found.length, 1, `expected exactly one ${extnID} extension`);
  return found[0];
}

function generalNames(extensions) {
  const extension = onlyExtension(extensions, "2.5.29.17");
  assert.equal(extension.critical, false, "subject alternative name is critical");
  return new pkijs.GeneralNames({ schema: extensionSchema(extension) });
}

function dnsNames(extensions) {
  return generalNames(extensions)
    .names.filter((name) => name.type === 2)
    .map((name) => name.value);
}

// Replaces crypto.subtle.generateKey for one call so a post-validation
// failure can be observed, then puts the real method back.
async function withoutKeyGeneration(action) {
  const subtle = crypto.subtle;
  const owned = Object.getOwnPropertyDescriptor(subtle, "generateKey");
  Object.defineProperty(subtle, "generateKey", {
    configurable: true,
    writable: true,
    value: () => Promise.reject(new Error("key generation is unavailable")),
  });
  try {
    return await action();
  } finally {
    if (owned) {
      Object.defineProperty(subtle, "generateKey", owned);
    } else {
      delete subtle.generateKey;
    }
  }
}

// A certificate the toolbox would never build, used to reach the
// inspector's fallback labels. `signatureOid` overrides the outer
// signature algorithm after signing.
async function buildForeignCertificate({ attributes, keyAlgorithm, signatureOid }) {
  const keys = await crypto.subtle.generateKey(keyAlgorithm, true, ["sign", "verify"]);
  const certificate = new pkijs.Certificate();
  certificate.version = 2;
  certificate.serialNumber = new asn1js.Integer({ value: 1 });
  for (const [type, value] of attributes) {
    certificate.subject.typesAndValues.push(
      new pkijs.AttributeTypeAndValue({ type, value: new asn1js.Utf8String({ value }) }),
    );
  }
  certificate.issuer.typesAndValues.push(
    new pkijs.AttributeTypeAndValue({
      type: "2.5.4.3",
      value: new asn1js.Utf8String({ value: "issuer.example" }),
    }),
  );
  certificate.notBefore.value = NOW;
  certificate.notAfter.value = new Date(NOW.getTime() + 365 * 86400 * 1000);
  await certificate.subjectPublicKeyInfo.importKey(keys.publicKey);
  await certificate.sign(keys.privateKey, "SHA-256");
  if (signatureOid) {
    certificate.signatureAlgorithm = new pkijs.AlgorithmIdentifier({ algorithmId: signatureOid });
  }
  return toPem("CERTIFICATE", certificate.toSchema(true).toBER(false));
}

async function keysMatch(privateKeyPem, publicKey, importAlgorithm, signAlgorithm) {
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    toArrayBuffer(pemBytes(privateKeyPem, "PRIVATE KEY")),
    importAlgorithm,
    false,
    ["sign"],
  );
  const data = new TextEncoder().encode("match");
  const signature = await crypto.subtle.sign(signAlgorithm, privateKey, data);
  return crypto.subtle.verify(signAlgorithm, publicKey, signature, data);
}

describe("certificates", () => {
  let rsa;
  let ecdsa;
  let csr;

  before(async () => {
    rsa = await createCertificate({
      "common-name": "example.com",
      "validity-days": "365",
      "key-type": "rsa-2048",
      now: NOW,
    });
    ecdsa = await createCertificate({
      "common-name": "example.com",
      "validity-days": "365",
      "key-type": "ecdsa-p256",
      now: NOW,
    });
    csr = await createCsr({ "common-name": "example.com", "key-type": "ecdsa-p256" });
  });

  describe("createCertificate", () => {
    it("writes an RSA certificate and a PKCS#8 private key as wrapped PEM", () => {
      assert.equal(rsa.ok, true);
      assert.deepEqual(Object.keys(rsa.output).sort(), ["certificate", "csr", "private-key"]);
      assert.match(rsa.output.csr, /^-----BEGIN CERTIFICATE REQUEST-----\n/);
      assertWrappedAt64(rsa.output.csr, "csr");
      assert.match(rsa.output.certificate, /^-----BEGIN CERTIFICATE-----\n/);
      assert.match(rsa.output["private-key"], /^-----BEGIN PRIVATE KEY-----\n/);
      assert.doesNotMatch(rsa.output["private-key"], /BEGIN RSA PRIVATE KEY/);
      assertWrappedAt64(rsa.output.certificate, "certificate");
      assertWrappedAt64(rsa.output["private-key"], "private key");
    });

    it("inspects the RSA certificate as the full report", async () => {
      const report = await inspectCertificate(rsa.output.certificate);
      assert.equal(report.ok, true);
      assert.match(report.output, RSA_REPORT);
    });

    it("signs the RSA certificate with its own key", async () => {
      const certificate = parseCertificate(rsa.output.certificate);
      assert.equal(await certificate.verify(), true);
      assert.equal(
        await keysMatch(
          rsa.output["private-key"],
          await certificate.getPublicKey(),
          RSA_IMPORT,
          RSA_SIGN,
        ),
        true,
      );
    });

    it("inspects the ECDSA certificate as the full report", async () => {
      assert.equal(ecdsa.ok, true);
      const report = await inspectCertificate(ecdsa.output.certificate);
      assert.equal(report.ok, true);
      assert.match(report.output, ECDSA_REPORT);
    });

    it("signs the ECDSA certificate with its own key", async () => {
      const certificate = parseCertificate(ecdsa.output.certificate);
      assert.equal(await certificate.verify(), true);
      assert.equal(
        await keysMatch(
          ecdsa.output["private-key"],
          await certificate.getPublicKey(),
          EC_IMPORT,
          EC_SIGN,
        ),
        true,
      );
    });

    it("writes a request signed by the same key as the certificate", async () => {
      const request = pkijs.CertificationRequest.fromBER(
        toArrayBuffer(pemBytes(rsa.output.csr, "CERTIFICATE REQUEST")),
      );
      const certificate = parseCertificate(rsa.output.certificate);
      assert.equal(await request.verify(), true);
      const commonName = request.subject.typesAndValues.find(
        (attribute) => attribute.type === "2.5.4.3",
      );
      assert.equal(commonName.value.valueBlock.value, "example.com");
      const attribute = request.attributes.find(
        (candidate) => candidate.type === "1.2.840.113549.1.9.14",
      );
      const extensions = new pkijs.Extensions({ schema: attribute.values[0] });
      assert.deepEqual(dnsNames(extensions.extensions), ["example.com"]);
      assert.deepEqual(
        new Uint8Array(request.subjectPublicKeyInfo.toSchema().toBER(false)),
        new Uint8Array(certificate.subjectPublicKeyInfo.toSchema().toBER(false)),
      );
      assert.equal(
        await keysMatch(
          rsa.output["private-key"],
          await request.getPublicKey(),
          RSA_IMPORT,
          RSA_SIGN,
        ),
        true,
      );
    });

    it("inspects RSA 4096 and ECDSA P-384", async () => {
      const rsa4096 = await createCertificate({
        "common-name": "example.com",
        "validity-days": "365",
        "key-type": "rsa-4096",
        now: NOW,
      });
      const p384 = await createCertificate({
        "common-name": "example.com",
        "validity-days": "365",
        "key-type": "ecdsa-p384",
        now: NOW,
      });
      assert.equal(rsa4096.ok, true);
      assert.equal(p384.ok, true);
      const rsaReport = await inspectCertificate(rsa4096.output.certificate);
      const ecReport = await inspectCertificate(p384.output.certificate);
      assert.match(rsaReport.output, /Signature\nSHA-256 with RSA\n\nPublic key\nRSA 4096$/);
      assert.match(ecReport.output, /Signature\nSHA-256 with ECDSA\n\nPublic key\nECDSA P-384$/);
      const request = pkijs.CertificationRequest.fromBER(
        toArrayBuffer(pemBytes(p384.output.csr, "CERTIFICATE REQUEST")),
      );
      assert.equal(
        await keysMatch(
          p384.output["private-key"],
          await request.getPublicKey(),
          { name: "ECDSA", namedCurve: "P-384" },
          { name: "ECDSA", hash: "SHA-256" },
        ),
        true,
      );
    });

    it("gives each certificate one DNS subject alternative name", () => {
      for (const result of [rsa, ecdsa]) {
        const certificate = parseCertificate(result.output.certificate);
        const names = generalNames(certificate.extensions).names;
        assert.equal(names.length, 1);
        assert.equal(names[0].type, 2);
        assert.equal(names[0].value, "example.com");
        assert.deepEqual(dnsNames(certificate.extensions), ["example.com"]);
      }
    });

    it("builds exactly basic constraints, key usage, and the subject alternative name", () => {
      for (const result of [rsa, ecdsa]) {
        const certificate = parseCertificate(result.output.certificate);
        assert.deepEqual(
          certificate.extensions.map((extension) => extension.extnID),
          ["2.5.29.19", "2.5.29.15", "2.5.29.17"],
        );
        assert.deepEqual(
          certificate.extensions.map((extension) => extension.critical),
          [false, false, false],
        );

        const basicConstraints = new pkijs.BasicConstraints({
          schema: extensionSchema(onlyExtension(certificate.extensions, "2.5.29.19")),
        });
        assert.equal(basicConstraints.cA, false);

        const keyUsage = extensionSchema(onlyExtension(certificate.extensions, "2.5.29.15"));
        assert.ok(keyUsage instanceof asn1js.BitString, "key usage is not a bit string");
        assert.equal(keyUsage.valueBlock.valueHexView.length, 1);
        assert.equal(keyUsage.valueBlock.valueHexView[0], 0x80);
      }
    });

    it("builds a positive eight-byte serial number", () => {
      for (const result of [rsa, ecdsa]) {
        const certificate = parseCertificate(result.output.certificate);
        const serial = new Uint8Array(certificate.serialNumber.valueBlock.valueHex);
        assert.equal(serial.length, 8);
        assert.equal(serial[0] & 0x80, 0, "the high bit of the serial is set");
        assert.ok(
          serial.some((byte) => byte !== 0),
          "the serial is all zero bytes",
        );
      }
    });

    it("truncates now to a whole second", async () => {
      const result = await createCertificate({
        "common-name": "example.com",
        "validity-days": "365",
        "key-type": "ecdsa-p256",
        now: new Date("2026-10-06T07:38:00.900Z"),
      });
      assert.equal(result.ok, true);
      const certificate = parseCertificate(result.output.certificate);
      assert.equal(certificate.notBefore.value.toISOString(), "2026-10-06T07:38:00.000Z");
      assert.equal(certificate.notAfter.value.toISOString(), "2027-10-06T07:38:00.000Z");
      const report = await inspectCertificate(result.output.certificate);
      assert.equal(report.ok, true);
      assert.match(report.output, ECDSA_REPORT);
    });

    it("rejects a blank common name", async () => {
      assert.deepEqual(
        await createCertificate({
          "common-name": "   ",
          "validity-days": "365",
          "key-type": "ecdsa-p256",
          now: NOW,
        }),
        { ok: false, error: "Enter a common name." },
      );
    });

    it("rejects a common name longer than 64 characters", async () => {
      assert.deepEqual(
        await createCertificate({
          "common-name": "a".repeat(65),
          "validity-days": "365",
          "key-type": "ecdsa-p256",
          now: NOW,
        }),
        { ok: false, error: "The common name is too long." },
      );
    });

    it("rejects a validity that is not a whole number from 1 to 3650", async () => {
      for (const days of ["0365", "365.0", "0", "3651"]) {
        assert.deepEqual(
          await createCertificate({
            "common-name": "example.com",
            "validity-days": days,
            "key-type": "ecdsa-p256",
            now: NOW,
          }),
          { ok: false, error: "Enter a validity from 1 to 3650 days." },
          `validity ${JSON.stringify(days)} was accepted`,
        );
      }
    });

    it("defaults an empty validity to 365 days", async () => {
      const result = await createCertificate({
        "common-name": "example.com",
        "validity-days": "",
        "key-type": "ecdsa-p256",
        now: NOW,
      });
      assert.equal(result.ok, true);
      const defaulted = await inspectCertificate(result.output.certificate);
      const explicit = await inspectCertificate(ecdsa.output.certificate);
      const notAfter = /\nNot after\n(.+)\n/;
      assert.equal(defaulted.ok, true);
      assert.match(defaulted.output.match(notAfter)[1], /^2027-10-06T07:38:00Z$/);
      assert.equal(defaulted.output.match(notAfter)[1], explicit.output.match(notAfter)[1]);
    });

    it("rejects an unsupported key type", async () => {
      assert.deepEqual(
        await createCertificate({
          "common-name": "example.com",
          "validity-days": "365",
          "key-type": "rsa-1024",
          now: NOW,
        }),
        { ok: false, error: "Choose a key type." },
      );
    });

    it("trims the common name", async () => {
      const result = await createCertificate({
        "common-name": "  example.com  ",
        "validity-days": "365",
        "key-type": "ecdsa-p256",
        now: NOW,
      });
      assert.equal(result.ok, true);
      const report = await inspectCertificate(result.output.certificate);
      assert.equal(report.ok, true);
      assert.match(report.output, ECDSA_REPORT);
    });

    it("reports a build failure when key generation fails", async () => {
      const result = await withoutKeyGeneration(() =>
        createCertificate({
          "common-name": "example.com",
          "validity-days": "365",
          "key-type": "ecdsa-p256",
          now: NOW,
        }),
      );
      assert.deepEqual(result, { ok: false, error: "Could not create the certificate." });
      const after = await createCertificate({
        "common-name": "example.com",
        "validity-days": "365",
        "key-type": "ecdsa-p256",
        now: NOW,
      });
      assert.equal(after.ok, true, "key generation was not restored");
    });
  });

  describe("createCsr", () => {
    it("writes a PKCS#10 request as wrapped PEM", () => {
      assert.equal(csr.ok, true);
      assert.deepEqual(Object.keys(csr.output).sort(), ["csr", "private-key"]);
      assert.match(csr.output.csr, /^-----BEGIN CERTIFICATE REQUEST-----\n/);
      assertWrappedAt64(csr.output.csr, "csr");
      assertWrappedAt64(csr.output["private-key"], "private key");
    });

    it("signs the request, names the subject, and requests the DNS name", async () => {
      const request = pkijs.CertificationRequest.fromBER(
        toArrayBuffer(pemBytes(csr.output.csr, "CERTIFICATE REQUEST")),
      );
      assert.equal(await request.verify(), true);
      const commonName = request.subject.typesAndValues.find(
        (attribute) => attribute.type === "2.5.4.3",
      );
      assert.equal(commonName.value.valueBlock.value, "example.com");
      const attribute = request.attributes.find(
        (candidate) => candidate.type === "1.2.840.113549.1.9.14",
      );
      assert.ok(attribute, "no extension request attribute");
      const extensions = new pkijs.Extensions({ schema: attribute.values[0] });
      assert.deepEqual(dnsNames(extensions.extensions), ["example.com"]);
      assert.equal(
        await keysMatch(csr.output["private-key"], await request.getPublicKey(), EC_IMPORT, EC_SIGN),
        true,
      );
    });

    it("rejects a missing common name", async () => {
      assert.deepEqual(await createCsr({ "common-name": "", "key-type": "ecdsa-p256" }), {
        ok: false,
        error: "Enter a common name.",
      });
    });

    it("rejects a common name longer than 64 characters", async () => {
      assert.deepEqual(
        await createCsr({ "common-name": "a".repeat(65), "key-type": "ecdsa-p256" }),
        { ok: false, error: "The common name is too long." },
      );
    });

    it("rejects an unsupported key type", async () => {
      assert.deepEqual(await createCsr({ "common-name": "example.com", "key-type": "rsa-1024" }), {
        ok: false,
        error: "Choose a key type.",
      });
    });

    it("reports a build failure when key generation fails", async () => {
      const result = await withoutKeyGeneration(() =>
        createCsr({ "common-name": "example.com", "key-type": "ecdsa-p256" }),
      );
      assert.deepEqual(result, { ok: false, error: "Could not create the certificate request." });
      const after = await createCsr({ "common-name": "example.com", "key-type": "ecdsa-p256" });
      assert.equal(after.ok, true, "key generation was not restored");
    });
  });

  describe("inspectCertificate fallbacks", () => {
    const FOREIGN_SUBJECT = [
      ["2.5.4.10", "Org"],
      ["2.5.4.11", "Unit"],
      ["2.5.4.6", "GB"],
      ["2.5.4.7", "Town"],
      ["2.5.4.8", "County"],
      ["1.2.840.113549.1.9.1", "who@example.com"],
      ["1.2.3.4", "Odd"],
    ];

    it("names every known distinguished name attribute and falls back to the OID", async () => {
      const pem = await buildForeignCertificate({
        attributes: FOREIGN_SUBJECT,
        keyAlgorithm: { name: "ECDSA", namedCurve: "P-256" },
      });
      const report = await inspectCertificate(pem);
      assert.equal(report.ok, true);
      assert.match(
        report.output,
        /^Subject\nO=Org\nOU=Unit\nC=GB\nL=Town\nST=County\nE=who@example\.com\n1\.2\.3\.4=Odd\n\nIssuer\nCN=issuer\.example\n\nSerial\n[0-9a-f]+\n\nNot before\n2026-10-06T07:38:00Z\n\nNot after\n2027-10-06T07:38:00Z\n\nSignature\nSHA-256 with ECDSA\n\nPublic key\nECDSA P-256$/,
      );
    });

    it("names an unrecognised signature and survives a thrown key import", async () => {
      const pem = await buildForeignCertificate({
        attributes: [["2.5.4.3", "badsig.example"]],
        keyAlgorithm: { name: "ECDSA", namedCurve: "P-256" },
        signatureOid: "1.2.3.4",
      });
      // pkijs derives the key import algorithm from the signature
      // algorithm, so an unknown OID makes getPublicKey throw. The same
      // P-256 key prints "ECDSA P-256" when the OID is recognised.
      await assert.rejects(() => parseCertificate(pem).getPublicKey());
      const report = await inspectCertificate(pem);
      assert.equal(report.ok, true);
      assert.match(
        report.output,
        /\nSignature\nUnrecognised signature\.\n\nPublic key\nUnrecognised public key\.$/,
      );
    });

    it("names a public key that is neither RSA nor ECDSA P-256", async () => {
      const pem = await buildForeignCertificate({
        attributes: [["2.5.4.3", "p521.example"]],
        keyAlgorithm: { name: "ECDSA", namedCurve: "P-521" },
      });
      const report = await inspectCertificate(pem);
      assert.equal(report.ok, true);
      assert.equal((await parseCertificate(pem).getPublicKey()).algorithm.namedCurve, "P-521");
      assert.match(
        report.output,
        /\nSignature\nSHA-256 with ECDSA\n\nPublic key\nUnrecognised public key\.$/,
      );
    });
  });

  describe("certificateToDer and derToCertificate", () => {
    it("converts a PEM certificate to unwrapped Base64 and back", async () => {
      const der = await certificateToDer(rsa.output.certificate);
      assert.equal(der.ok, true);
      assert.match(der.output, /^[A-Za-z0-9+/]+={0,2}$/);
      // `$` would still allow a single trailing newline in some engines,
      // so reject every whitespace character outright.
      assert.doesNotMatch(der.output, /\s/);
      assert.equal(der.output, der.output.trim());
      const expected = decodeBase64(der.output);

      const unpadded = der.output.replace(/=+$/, "");
      const spaced = der.output.replace(/(.{48})/g, "$1 \n");
      for (const input of [der.output, unpadded, spaced]) {
        const pem = await derToCertificate(input);
        assert.equal(pem.ok, true, `derToCertificate rejected ${JSON.stringify(input.slice(0, 16))}`);
        assertWrappedAt64(pem.output, "certificate");
        assert.deepEqual(pemBytes(pem.output, "CERTIFICATE"), expected);
      }
    });

    it("rejects PEM that is not a certificate", async () => {
      assert.deepEqual(
        await certificateToDer("-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n"),
        { ok: false, error: "That is not a PEM certificate." },
      );
      assert.deepEqual(await certificateToDer(csr.output.csr), {
        ok: false,
        error: "That is not a PEM certificate.",
      });
      assert.deepEqual(
        await certificateToDer("-----END CERTIFICATE-----\nAAAA\n-----BEGIN CERTIFICATE-----\n"),
        { ok: false, error: "That is not a PEM certificate." },
      );
    });

    it("rejects a body that is not valid Base64", async () => {
      assert.deepEqual(
        await certificateToDer("-----BEGIN CERTIFICATE-----\n!!!!\n-----END CERTIFICATE-----"),
        { ok: false, error: "That is not valid Base64." },
      );
      assert.deepEqual(await derToCertificate("!!!!"), {
        ok: false,
        error: "That is not valid Base64.",
      });
    });

    it("rejects the URL-safe alphabet", async () => {
      assert.deepEqual(
        await certificateToDer("-----BEGIN CERTIFICATE-----\nAAAA-AAA=\n-----END CERTIFICATE-----\n"),
        { ok: false, error: "That is not valid Base64." },
      );
      assert.deepEqual(await derToCertificate("AAAA_AAA"), {
        ok: false,
        error: "That is not valid Base64.",
      });

      // Base64url of a real certificate must be refused rather than
      // quietly decoded, so the rejection is not just junk input failing.
      const der = await certificateToDer(rsa.output.certificate);
      const urlSafe = der.output.replace(/\+/g, "-").replace(/\//g, "_");
      assert.notEqual(urlSafe, der.output, "the DER Base64 had no + or / to swap");
      assert.deepEqual(await derToCertificate(urlSafe), {
        ok: false,
        error: "That is not valid Base64.",
      });
      // Only `/` is swapped here, so no run of `+` can turn into a `-----`
      // marker and confuse the PEM scan.
      const bytes = pemBytes(rsa.output.certificate, "CERTIFICATE");
      const urlSafePem = toPem("CERTIFICATE", bytes).replace(/\//g, "_");
      assert.ok(urlSafePem.includes("_"), "the certificate Base64 had no / to swap");
      assert.deepEqual(await certificateToDer(urlSafePem), {
        ok: false,
        error: "That is not valid Base64.",
      });
    });

    it("rejects Base64 that is not a certificate", async () => {
      assert.deepEqual(await derToCertificate("AA=="), {
        ok: false,
        error: "That is not a valid certificate.",
      });
    });
  });
});
