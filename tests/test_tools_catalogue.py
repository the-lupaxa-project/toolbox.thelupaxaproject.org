"""Browser toolbox catalogue loaded from data/tools.yml."""

from pathlib import Path

import pytest

from tools_lib import CatalogueError, load_catalogue

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "data" / "tools.yml"

EXPECTED = [
    ("encoding", "base-n", "Base N", "ready"),
    ("encoding", "url-encode-decode", "URL Encode/Decode", "ready"),
    ("encoding", "hex", "Hexadecimal", "ready"),
    ("encoding", "binary", "Binary", "ready"),
    ("encoding", "octal", "Octal", "ready"),
    ("encoding", "jwt-decoder", "JWT Decoder", "ready"),
    ("cryptography", "hash-generator", "Hash Generator", "ready"),
    ("cryptography", "certificate-generator", "Certificate Generator", "ready"),
    ("cryptography", "csr-generator", "CSR Generator", "ready"),
    ("cryptography", "certificate-inspector", "Certificate Inspector", "ready"),
    ("cryptography", "pem-der-converter", "PEM/DER Converter", "ready"),
    ("dns", "dns-lookup", "DNS Lookup", "ready"),
    ("dns", "reverse-dns", "Reverse DNS", "ready"),
    ("dns", "mx-lookup", "MX Lookup", "ready"),
    ("dns", "spf-inspector", "SPF Inspector", "ready"),
    ("dns", "dmarc-inspector", "DMARC Inspector", "ready"),
    ("dns", "dnssec-inspector", "DNSSEC Inspector", "ready"),
    ("data", "json-formatter", "JSON Formatter", "ready"),
    ("data", "yaml-formatter", "YAML Formatter", "ready"),
    ("data", "json-yaml", "JSON ↔ YAML", "ready"),
    ("data", "csv-json", "CSV ↔ JSON", "ready"),
    ("data", "csv-yaml", "CSV ↔ YAML", "ready"),
    ("data", "xml-formatter", "XML Formatter", "ready"),
    ("development", "uuid-generator", "UUID Generator", "ready"),
    ("development", "cron-parser", "Cron Parser", "ready"),
    ("development", "regex-tester", "Regex Tester", "ready"),
    ("development", "timestamp-converter", "Timestamp Converter", "ready"),
    ("development", "semver-calculator", "SemVer Calculator", "ready"),
    ("github", "actions-yaml-validator", "Actions YAML Validator", "ready"),
    ("github", "dependabot-validator", "Dependabot Validator", "ready"),
    ("github", "workflow-inspector", "Workflow Inspector", "ready"),
]

ENCODE_DECODE = (("encode", "Encode"), ("decode", "Decode"))


def test_catalogue_rows_match_expected_order() -> None:
    tools = load_catalogue(CATALOGUE)
    rows = [(tool.category_id, tool.id, tool.title, tool.status) for tool in tools]
    assert rows == EXPECTED


def test_actions_and_summaries() -> None:
    tools = load_catalogue(CATALOGUE)
    assert len(tools) == len(EXPECTED)
    for tool in tools:
        assert isinstance(tool.summary, str)
        assert tool.summary != ""
        if tool.id == "jwt-decoder":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("decode", "Decode"),
            )
        elif tool.id == "hash-generator":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("sha-256", "SHA-256"),
                ("sha-384", "SHA-384"),
                ("sha-512", "SHA-512"),
            )
        elif tool.id == "certificate-generator":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("generate", "Generate"),
            )
            assert tuple(field.id for field in tool.fields) == (
                "common-name",
                "validity-days",
                "key-type",
            )
            validity = next(field for field in tool.fields if field.id == "validity-days")
            assert validity.default == "365"
            assert validity.kind == "number"
            key_type = next(field for field in tool.fields if field.id == "key-type")
            assert key_type.default == "rsa-2048"
            assert tuple(choice.id for choice in key_type.choices) == (
                "rsa-2048",
                "rsa-3072",
                "rsa-4096",
                "ecdsa-p256",
                "ecdsa-p384",
            )
            assert tuple(output.id for output in tool.outputs) == (
                "csr",
                "certificate",
                "private-key",
            )
        elif tool.id == "csr-generator":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("generate", "Generate"),
            )
            assert tuple(field.id for field in tool.fields) == (
                "common-name",
                "key-type",
            )
            key_type = next(field for field in tool.fields if field.id == "key-type")
            assert key_type.default == "rsa-2048"
            assert tuple(choice.id for choice in key_type.choices) == (
                "rsa-2048",
                "rsa-3072",
                "rsa-4096",
                "ecdsa-p256",
                "ecdsa-p384",
            )
            assert tuple(output.id for output in tool.outputs) == (
                "csr",
                "private-key",
            )
        elif tool.id == "certificate-inspector":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("inspect", "Inspect"),
            )
            assert tool.fields == ()
        elif tool.id == "pem-der-converter":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("to-der", "To DER"),
                ("to-pem", "To PEM"),
            )
            assert tool.fields == ()
        elif tool.id == "dns-lookup":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("look-up", "Look Up"),
            )
            assert tuple(field.id for field in tool.fields) == ("name", "resolver", "record-type")
            resolver = next(field for field in tool.fields if field.id == "resolver")
            assert resolver.default == "cloudflare"
            assert tuple(choice.id for choice in resolver.choices) == (
                "cloudflare",
                "google",
                "quad9",
            )
            record_type = next(field for field in tool.fields if field.id == "record-type")
            assert record_type.default == "a"
            assert tuple(choice.id for choice in record_type.choices) == (
                "a",
                "aaaa",
                "cname",
                "mx",
                "ns",
                "txt",
                "soa",
                "caa",
                "srv",
            )
            assert tuple(output.id for output in tool.outputs) == ("result",)
        elif tool.id == "reverse-dns":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("look-up", "Look Up"),
            )
            assert tuple(field.id for field in tool.fields) == ("name", "resolver")
            name = next(field for field in tool.fields if field.id == "name")
            assert name.label == "Address"
            resolver = next(field for field in tool.fields if field.id == "resolver")
            assert resolver.default == "cloudflare"
            assert tuple(choice.id for choice in resolver.choices) == (
                "cloudflare",
                "google",
                "quad9",
            )
            assert tuple(output.id for output in tool.outputs) == ("result",)
        elif (
            tool.id == "mx-lookup"
            or tool.id == "spf-inspector"
            or tool.id == "dmarc-inspector"
            or tool.id == "dnssec-inspector"
        ):
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("look-up", "Look Up"),
            )
            assert tuple(field.id for field in tool.fields) == ("name", "resolver")
            resolver = next(field for field in tool.fields if field.id == "resolver")
            assert resolver.default == "cloudflare"
            assert tuple(choice.id for choice in resolver.choices) == (
                "cloudflare",
                "google",
                "quad9",
            )
            assert tuple(output.id for output in tool.outputs) == ("result",)
        elif tool.id in {
            "actions-yaml-validator",
            "dependabot-validator",
            "workflow-inspector",
        }:
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("check", "Check"),
            )
            assert tool.fields == ()
            assert tool.outputs == ()
        elif tool.id in {"json-formatter", "yaml-formatter", "xml-formatter"}:
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("format", "Format"),
                ("minify", "Minify"),
            )
            assert tool.fields == ()
            assert tool.outputs == ()
        elif tool.id == "json-yaml":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("to-yaml", "To YAML"),
                ("to-json", "To JSON"),
            )
            assert tool.fields == ()
            assert tool.outputs == ()
        elif tool.id == "csv-json":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("to-json", "To JSON"),
                ("to-csv", "To CSV"),
            )
            assert tool.fields == ()
            assert tool.outputs == ()
        elif tool.id == "csv-yaml":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("to-yaml", "To YAML"),
                ("to-csv", "To CSV"),
            )
            assert tool.fields == ()
            assert tool.outputs == ()
        elif tool.id == "uuid-generator":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("generate", "Generate"),
            )
            assert tuple((field.id, field.kind, field.default) for field in tool.fields) == (
                ("version", "choice", "4"),
                ("count", "number", "1"),
            )
            count = tool.fields[1]
            assert count.min == "1"
            assert count.max == "20"
            assert tuple(choice.id for choice in tool.fields[0].choices) == ("4", "7")
            assert tuple(output.id for output in tool.outputs) == ("result",)
        elif tool.id == "cron-parser":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("explain", "Explain"),
            )
            assert tool.fields == ()
            assert tool.outputs == ()
        elif tool.id == "regex-tester":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("test", "Test"),
            )
            assert tuple((field.id, field.kind) for field in tool.fields) == (
                ("pattern", "text"),
                ("sample", "text"),
            )
            assert tuple(output.id for output in tool.outputs) == ("result",)
        elif tool.id == "timestamp-converter":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("to-date", "To Date"),
                ("to-timestamp", "To Timestamp"),
            )
            assert tool.fields == ()
            assert tool.outputs == ()
        elif tool.id == "semver-calculator":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("compare", "Compare"),
                ("step", "Step"),
            )
            assert tuple(choice.id for choice in tool.fields[2].choices) == (
                "major",
                "minor",
                "patch",
            )
            assert tool.fields[2].default == "patch"
            assert tuple(output.id for output in tool.outputs) == ("result",)
        elif tool.id == "base-n":
            assert tuple((action.id, action.label) for action in tool.actions) == (
                ("encode", "Encode"),
                ("decode", "Decode"),
            )
            assert tuple((field.id, field.kind, field.default) for field in tool.fields) == (
                ("base", "choice", "64"),
            )
            assert tuple(choice.id for choice in tool.fields[0].choices) == (
                "16",
                "32",
                "58",
                "64",
                "85",
            )
            assert tool.outputs == ()
        elif tool.status == "planned":
            assert tool.actions == ()
        else:
            assert tool.status == "ready"
            assert tuple((action.id, action.label) for action in tool.actions) == ENCODE_DECODE


def _extra_javascript() -> list[str]:
    lines = (ROOT / "mkdocs.yml").read_text(encoding="utf-8").splitlines()
    entries: list[str] = []
    in_block = False
    for line in lines:
        if line == "extra_javascript:":
            in_block = True
            continue
        if not in_block:
            continue
        if line.startswith("  - "):
            entries.append(line.removeprefix("  - ").strip())
            continue
        break
    return entries


def test_ready_tools_have_scripts_in_extra_javascript() -> None:
    scripts = _extra_javascript()
    ready = [tool for tool in load_catalogue(CATALOGUE) if tool.status == "ready"]
    assert ready
    for tool in ready:
        relative = f"assets/javascript/tools/{tool.id}.js"
        assert (ROOT / "mkdocs" / relative).is_file()
        assert relative in scripts


def test_extra_javascript_order() -> None:
    scripts = _extra_javascript()
    ordered = [
        "assets/javascript/vendor/pkijs.js",
        "assets/javascript/certificates.js",
        "assets/javascript/tools/certificate-generator.js",
        "assets/javascript/tools/csr-generator.js",
        "assets/javascript/tools/certificate-inspector.js",
        "assets/javascript/tools/pem-der-converter.js",
    ]
    indexes = [scripts.index(entry) for entry in ordered]
    assert indexes == sorted(indexes)
    toolbox = scripts.index("assets/javascript/toolbox.js")
    assert all(index < toolbox for index in indexes)

    dns_ordered = [
        "assets/javascript/dns.js",
        "assets/javascript/tools/dns-lookup.js",
        "assets/javascript/tools/reverse-dns.js",
        "assets/javascript/tools/mx-lookup.js",
        "assets/javascript/tools/spf-inspector.js",
        "assets/javascript/tools/dmarc-inspector.js",
        "assets/javascript/tools/dnssec-inspector.js",
    ]
    dns_indexes = [scripts.index(entry) for entry in dns_ordered]
    assert dns_indexes == sorted(dns_indexes)
    assert dns_indexes[-1] < toolbox
    github_ordered = [
        "assets/javascript/vendor/js-yaml.js",
        "assets/javascript/github.js",
        "assets/javascript/tools/actions-yaml-validator.js",
        "assets/javascript/tools/dependabot-validator.js",
        "assets/javascript/tools/workflow-inspector.js",
    ]
    github_indexes = [scripts.index(entry) for entry in github_ordered]
    assert github_indexes == sorted(github_indexes)
    assert github_indexes[-1] < toolbox
    data_ordered = [
        "assets/javascript/data.js",
        "assets/javascript/tools/json-formatter.js",
        "assets/javascript/tools/yaml-formatter.js",
        "assets/javascript/tools/json-yaml.js",
        "assets/javascript/tools/csv-json.js",
        "assets/javascript/tools/csv-yaml.js",
        "assets/javascript/tools/xml-formatter.js",
    ]
    data_indexes = [scripts.index(entry) for entry in data_ordered]
    assert data_indexes == sorted(data_indexes)
    assert github_indexes[-1] < data_indexes[0]
    assert data_indexes[-1] < toolbox
    development_ordered = [
        "assets/javascript/tools/uuid-generator.js",
        "assets/javascript/tools/cron-parser.js",
        "assets/javascript/tools/regex-tester.js",
        "assets/javascript/tools/timestamp-converter.js",
        "assets/javascript/tools/semver-calculator.js",
    ]
    development_indexes = [scripts.index(entry) for entry in development_ordered]
    assert development_indexes == sorted(development_indexes)
    assert data_indexes[-1] < development_indexes[0]
    assert development_indexes[-1] < toolbox
    hash_generator = scripts.index("assets/javascript/tools/hash-generator.js")
    assert hash_generator < indexes[0]


def test_bad_tool_id_raises(tmp_path: Path) -> None:
    path = tmp_path / "bad.yml"
    path.write_text(
        """
categories:
  - id: encoding
    title: Encoding
    description: Encoding tools.
    tools:
      - id: Bad_Id
        title: Bad
        summary: Bad id.
        status: planned
""",
        encoding="utf-8",
    )
    with pytest.raises(CatalogueError):
        load_catalogue(path)


def test_duplicate_tool_id_raises(tmp_path: Path) -> None:
    path = tmp_path / "duplicate.yml"
    path.write_text(
        """
categories:
  - id: encoding
    title: Encoding
    description: Encoding tools.
    tools:
      - id: base64
        title: Base64
        summary: Encode and decode Base64 text.
        status: planned
      - id: base64
        title: Base64 again
        summary: Duplicate id.
        status: planned
""",
        encoding="utf-8",
    )
    with pytest.raises(CatalogueError):
        load_catalogue(path)
