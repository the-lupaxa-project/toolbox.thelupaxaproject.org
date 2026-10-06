<p align="center">
    <a href="https://github.com/the-lupaxa-project">
        <img src="https://raw.githubusercontent.com/the-lupaxa-project/brand-assets/master/logos/organisations/the-lupaxa-project/readme-logo.png" alt="Organisation Logo" />
    </a>
</p>

<h1 align="center">Lupaxa Web Toolbox</h1>

Browser tools for encoding, cryptography, DNS, data, development, and GitHub.
Each ready tool runs in the page you have open. Paste text, a certificate, or
any other input, and the page writes the result back here. Encoding, cryptography, and the other tools keep that text on this machine. A DNS lookup sends the name or address to the resolver you pick.

The site is published at <https://toolbox.thelupaxaproject.org/>.

## What it Does

The catalogue in `data/tools.yml` is the list of tools. A build step writes
the home page, one page per category, and one page per tool before MkDocs
collects files. Ready tools get a form in the page. Planned tools stay in the
catalogue and say they are not available yet.

## Tools

### Encoding

Ready. Base64, URL Encode/Decode, Hexadecimal, Base 16, Base 32, Base 58,
Base 85, Binary, Octal, and JWT Decoder. JWT Decoder shows the header, the
payload, and the raw signature. It does not check the signature.

### Cryptography

Ready. Hash Generator (SHA-256, SHA-384, and SHA-512), Certificate Generator,
CSR Generator, Certificate Inspector, and PEM/DER Converter. Hashes,
certificates, signing requests, and keys are created in the browser.

### DNS

Ready. DNS Lookup, Reverse DNS, MX Lookup, SPF Inspector, DMARC Inspector,
and DNSSEC Inspector. A lookup is sent to the resolver you pick: Cloudflare,
Google, or Quad9.

### Data

Ready. JSON Formatter, YAML Formatter, XML Formatter, JSON ↔ YAML,
CSV ↔ JSON, and CSV ↔ YAML. A pasted file stays on this machine.

### Development

Planned. UUID Generator, Cron Parser, Regex Tester, Timestamp Converter, and
SemVer Calculator.

### GitHub

Ready. Actions YAML Validator, Dependabot Validator, and Workflow Inspector.
A pasted file stays on this machine.

## Prerequisites

- Python 3.13+
- Node.js 22+ (browser-tool tests)

## Local Development

```bash
make init
make install-dev
make mkdocs-serve
```

Open the local URL MkDocs prints (typically port `8000` on `127.0.0.1`).

`mkdocs.yml` watches the catalogue, the page generator, and the site
stylesheets and scripts, so those edits reload while the server is running.

## Checks

Python:

```bash
python -m pytest
```

Browser tools:

```bash
node --test tests/js/*.test.cjs
```

<a href="https://github.com/the-lupaxa-project">
    <img src="https://raw.githubusercontent.com/the-lupaxa-project/brand-assets/master/logos/components/footer.svg" alt="The Lupaxa Project Footer" width="100%" />
</a>
