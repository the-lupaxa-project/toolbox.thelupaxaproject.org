"use strict";

(function () {
  const lib = globalThis.LupaxaPkijs || require("./vendor/pkijs.js");
  const pkijs = lib.pkijs;
  const asn1js = lib.asn1js;

  const NO_COMMON_NAME = "Enter a common name.";
  const LONG_COMMON_NAME = "The common name is too long.";
  const BAD_VALIDITY = "Enter a validity from 1 to 3650 days.";
  const BAD_KEY_TYPE = "Choose a key type.";
  const BAD_BUILD = "Could not create the certificate.";
  const BAD_CSR_BUILD = "Could not create the certificate request.";
  const NOT_PEM = "That is not a PEM certificate.";
  const BAD_BASE64 = "That is not valid Base64.";
  const BAD_CERTIFICATE = "That is not a valid certificate.";
  const UNKNOWN_SIGNATURE = "Unrecognised signature.";
  const UNKNOWN_PUBLIC_KEY = "Unrecognised public key.";

  const BEGIN_CERTIFICATE = "-----BEGIN CERTIFICATE-----";
  const END_CERTIFICATE = "-----END CERTIFICATE-----";

  const MAX_COMMON_NAME = 64;
  const MAX_DAYS = 3650;
  const DEFAULT_DAYS = 365;
  const DAY_MS = 86400 * 1000;
  const COMMON_NAME_OID = "2.5.4.3";
  const EXTENSION_REQUEST_OID = "1.2.840.113549.1.9.14";
  const DIGITAL_SIGNATURE_BIT = 0x80;

  const KEY_TYPES = {
    "rsa-2048": {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    "rsa-3072": {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 3072,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    "rsa-4096": {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    "ecdsa-p256": { name: "ECDSA", namedCurve: "P-256" },
    "ecdsa-p384": { name: "ECDSA", namedCurve: "P-384" },
  };

  const SIGNATURE_LABELS = {
    "1.2.840.113549.1.1.11": "SHA-256 with RSA",
    "1.2.840.10045.4.3.2": "SHA-256 with ECDSA",
  };

  const DISTINGUISHED_NAME_SHORTS = {
    "2.5.4.3": "CN",
    "2.5.4.10": "O",
    "2.5.4.11": "OU",
    "2.5.4.6": "C",
    "2.5.4.7": "L",
    "2.5.4.8": "ST",
    "1.2.840.113549.1.9.1": "E",
  };

  function readCommonName(value) {
    const commonName = String(value === undefined || value === null ? "" : value).trim();
    if (commonName.length === 0) {
      return { ok: false, error: NO_COMMON_NAME };
    }
    if (commonName.length > MAX_COMMON_NAME) {
      return { ok: false, error: LONG_COMMON_NAME };
    }
    return { ok: true, value: commonName };
  }

  function readValidityDays(value) {
    const text = String(value === undefined || value === null ? "" : value).trim();
    if (text === "") {
      return { ok: true, value: DEFAULT_DAYS };
    }
    if (!/^[1-9][0-9]*$/.test(text)) {
      return { ok: false, error: BAD_VALIDITY };
    }
    const days = Number(text);
    if (days < 1 || days > MAX_DAYS) {
      return { ok: false, error: BAD_VALIDITY };
    }
    return { ok: true, value: days };
  }

  function readKeyType(value) {
    const keyType = String(value === undefined || value === null ? "" : value);
    if (!Object.prototype.hasOwnProperty.call(KEY_TYPES, keyType)) {
      return { ok: false, error: BAD_KEY_TYPE };
    }
    return { ok: true, value: keyType };
  }

  // Standard Base64: ASCII whitespace is ignored, padding may be omitted,
  // and the URL-safe alphabet fails.
  function decodeBase64(input) {
    const cleaned = String(input === undefined || input === null ? "" : input).replace(
      /[ \t\n\r\f\v]/g,
      "",
    );
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
      return { ok: false, error: BAD_BASE64 };
    }
    const padStart = cleaned.indexOf("=");
    const body = padStart === -1 ? cleaned : cleaned.slice(0, padStart);
    const padding = padStart === -1 ? "" : cleaned.slice(padStart);
    const expectedPad = body.length % 4 === 0 ? 0 : 4 - (body.length % 4);
    if (expectedPad === 3 || (padding.length !== 0 && padding.length !== expectedPad)) {
      return { ok: false, error: BAD_BASE64 };
    }
    let binary;
    try {
      binary = atob(body + "=".repeat(expectedPad));
    } catch (_err) {
      return { ok: false, error: BAD_BASE64 };
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { ok: true, value: bytes };
  }

  function encodeBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function toPem(label, der) {
    const base64 = encodeBase64(new Uint8Array(der));
    const lines = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
  }

  function commonNameAttribute(commonName) {
    return new pkijs.AttributeTypeAndValue({
      type: COMMON_NAME_OID,
      value: new asn1js.Utf8String({ value: commonName }),
    });
  }

  function randomSerialNumber() {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    bytes[0] &= 0x7f;
    if (bytes.every((byte) => byte === 0)) {
      bytes[bytes.length - 1] = 1;
    }
    return new asn1js.Integer({ valueHex: bytes.buffer });
  }

  function basicConstraintsExtension() {
    const basicConstraints = new pkijs.BasicConstraints({ cA: false });
    return new pkijs.Extension({
      extnID: "2.5.29.19",
      critical: false,
      extnValue: basicConstraints.toSchema().toBER(false),
      parsedValue: basicConstraints,
    });
  }

  function keyUsageExtension() {
    const bits = new Uint8Array(1);
    bits[0] = DIGITAL_SIGNATURE_BIT;
    return new pkijs.Extension({
      extnID: "2.5.29.15",
      critical: false,
      extnValue: new asn1js.BitString({ valueHex: bits.buffer }).toBER(false),
    });
  }

  function subjectAltNameExtension(commonName) {
    const names = new pkijs.GeneralNames({
      names: [new pkijs.GeneralName({ type: 2, value: commonName })],
    });
    return new pkijs.Extension({
      extnID: "2.5.29.17",
      critical: false,
      extnValue: names.toSchema().toBER(false),
    });
  }

  function generateKeys(keyType) {
    return crypto.subtle.generateKey(KEY_TYPES[keyType], true, ["sign", "verify"]);
  }

  async function privateKeyPem(privateKey) {
    return toPem("PRIVATE KEY", await crypto.subtle.exportKey("pkcs8", privateKey));
  }

  async function signCertificate(commonName, days, keys, now) {
    const notBefore = new Date(Math.floor(now.getTime() / 1000) * 1000);
    const notAfter = new Date(notBefore.getTime() + days * DAY_MS);
    const certificate = new pkijs.Certificate();
    certificate.version = 2;
    certificate.serialNumber = randomSerialNumber();
    certificate.subject.typesAndValues.push(commonNameAttribute(commonName));
    certificate.issuer.typesAndValues.push(commonNameAttribute(commonName));
    certificate.notBefore.value = notBefore;
    certificate.notAfter.value = notAfter;
    certificate.extensions = [
      basicConstraintsExtension(),
      keyUsageExtension(),
      subjectAltNameExtension(commonName),
    ];
    await certificate.subjectPublicKeyInfo.importKey(keys.publicKey);
    await certificate.sign(keys.privateKey, "SHA-256");
    return toPem("CERTIFICATE", certificate.toSchema(true).toBER(false));
  }

  async function signCsr(commonName, keys) {
    const request = new pkijs.CertificationRequest();
    request.subject.typesAndValues.push(commonNameAttribute(commonName));
    request.attributes = [];
    request.attributes.push(
      new pkijs.Attribute({
        type: EXTENSION_REQUEST_OID,
        values: [
          new pkijs.Extensions({
            extensions: [subjectAltNameExtension(commonName)],
          }).toSchema(),
        ],
      }),
    );
    await request.subjectPublicKeyInfo.importKey(keys.publicKey);
    await request.sign(keys.privateKey, "SHA-256");
    return toPem("CERTIFICATE REQUEST", request.toSchema(true).toBER(false));
  }

  async function buildCertificate(commonName, days, keyType, now) {
    const keys = await generateKeys(keyType);
    return {
      csr: await signCsr(commonName, keys),
      certificate: await signCertificate(commonName, days, keys, now),
      "private-key": await privateKeyPem(keys.privateKey),
    };
  }

  async function buildCsr(commonName, keyType) {
    const keys = await generateKeys(keyType);
    return {
      csr: await signCsr(commonName, keys),
      "private-key": await privateKeyPem(keys.privateKey),
    };
  }

  async function createCertificate(options) {
    const fields = options || {};
    const commonName = readCommonName(fields["common-name"]);
    if (!commonName.ok) {
      return commonName;
    }
    const days = readValidityDays(fields["validity-days"]);
    if (!days.ok) {
      return days;
    }
    const keyType = readKeyType(fields["key-type"]);
    if (!keyType.ok) {
      return keyType;
    }
    const now = new Date(fields.now === undefined || fields.now === null ? Date.now() : fields.now);
    try {
      return {
        ok: true,
        output: await buildCertificate(commonName.value, days.value, keyType.value, now),
      };
    } catch (_err) {
      return { ok: false, error: BAD_BUILD };
    }
  }

  async function createCsr(options) {
    const fields = options || {};
    const commonName = readCommonName(fields["common-name"]);
    if (!commonName.ok) {
      return commonName;
    }
    const keyType = readKeyType(fields["key-type"]);
    if (!keyType.ok) {
      return keyType;
    }
    try {
      return { ok: true, output: await buildCsr(commonName.value, keyType.value) };
    } catch (_err) {
      return { ok: false, error: BAD_CSR_BUILD };
    }
  }

  function parseCertificateBytes(bytes) {
    const asn1 = asn1js.fromBER(new Uint8Array(bytes).buffer);
    if (asn1.offset === -1) {
      return { ok: false, error: BAD_CERTIFICATE };
    }
    try {
      return { ok: true, value: new pkijs.Certificate({ schema: asn1.result }) };
    } catch (_err) {
      return { ok: false, error: BAD_CERTIFICATE };
    }
  }

  function parsePemCertificate(input) {
    const text = String(input === undefined || input === null ? "" : input);
    const from = text.indexOf(BEGIN_CERTIFICATE);
    const to = text.indexOf(END_CERTIFICATE);
    if (from === -1 || to <= from) {
      return { ok: false, error: NOT_PEM };
    }
    const decoded = decodeBase64(text.slice(from + BEGIN_CERTIFICATE.length, to));
    if (!decoded.ok) {
      return decoded;
    }
    return parseCertificateBytes(decoded.value);
  }

  function distinguishedName(name) {
    return name.typesAndValues
      .map((attribute) => {
        const short = DISTINGUISHED_NAME_SHORTS[attribute.type] || attribute.type;
        return `${short}=${attribute.value.valueBlock.value}`;
      })
      .join("\n");
  }

  function instant(date) {
    return date.toISOString().replace(/\.[0-9]{3}Z$/, "Z");
  }

  function serialHex(serialNumber) {
    const hex = Array.from(new Uint8Array(serialNumber.valueBlock.valueHex))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .replace(/^0+/, "");
    return hex === "" ? "0" : hex;
  }

  async function publicKeyLabel(certificate) {
    let key;
    try {
      key = await certificate.getPublicKey();
    } catch (_err) {
      return UNKNOWN_PUBLIC_KEY;
    }
    if (key.algorithm.name === "RSASSA-PKCS1-v1_5") {
      return `RSA ${key.algorithm.modulusLength}`;
    }
    if (key.algorithm.name === "ECDSA" && key.algorithm.namedCurve === "P-256") {
      return "ECDSA P-256";
    }
    if (key.algorithm.name === "ECDSA" && key.algorithm.namedCurve === "P-384") {
      return "ECDSA P-384";
    }
    return UNKNOWN_PUBLIC_KEY;
  }

  async function describe(certificate) {
    const signature =
      SIGNATURE_LABELS[certificate.signatureAlgorithm.algorithmId] || UNKNOWN_SIGNATURE;
    return [
      `Subject\n${distinguishedName(certificate.subject)}`,
      `Issuer\n${distinguishedName(certificate.issuer)}`,
      `Serial\n${serialHex(certificate.serialNumber)}`,
      `Not before\n${instant(certificate.notBefore.value)}`,
      `Not after\n${instant(certificate.notAfter.value)}`,
      `Signature\n${signature}`,
      `Public key\n${await publicKeyLabel(certificate)}`,
    ].join("\n\n");
  }

  async function inspectCertificate(pem) {
    const parsed = parsePemCertificate(pem);
    if (!parsed.ok) {
      return parsed;
    }
    try {
      return { ok: true, output: await describe(parsed.value) };
    } catch (_err) {
      return { ok: false, error: BAD_CERTIFICATE };
    }
  }

  async function certificateToDer(pem) {
    const parsed = parsePemCertificate(pem);
    if (!parsed.ok) {
      return parsed;
    }
    const der = parsed.value.toSchema().toBER(false);
    return { ok: true, output: encodeBase64(new Uint8Array(der)) };
  }

  async function derToCertificate(base64) {
    const decoded = decodeBase64(base64);
    if (!decoded.ok) {
      return decoded;
    }
    const parsed = parseCertificateBytes(decoded.value);
    if (!parsed.ok) {
      return parsed;
    }
    return { ok: true, output: toPem("CERTIFICATE", parsed.value.toSchema().toBER(false)) };
  }

  const api = {
    createCertificate,
    createCsr,
    inspectCertificate,
    certificateToDer,
    derToCertificate,
  };

  globalThis.LupaxaCertificates = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
