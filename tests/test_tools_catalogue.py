"""Browser toolbox catalogue loaded from data/tools.yml."""

from pathlib import Path

import pytest

from tools_lib import CatalogueError, load_catalogue

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "data" / "tools.yml"

EXPECTED = [
    ("encoding", "base64", "Base64", "ready"),
    ("encoding", "url-encode-decode", "URL Encode/Decode", "ready"),
    ("encoding", "hex", "Hexadecimal", "ready"),
    ("encoding", "base-16", "Base 16", "ready"),
    ("encoding", "base-32", "Base 32", "ready"),
    ("encoding", "base-58", "Base 58", "ready"),
    ("encoding", "base-85", "Base 85", "ready"),
    ("encoding", "binary", "Binary", "ready"),
    ("encoding", "octal", "Octal", "ready"),
    ("encoding", "jwt-decoder", "JWT Decoder", "ready"),
    ("cryptography", "hash-generator", "Hash Generator", "ready"),
    ("cryptography", "certificate-generator", "Certificate Generator", "ready"),
    ("cryptography", "csr-generator", "CSR Generator", "ready"),
    ("cryptography", "certificate-inspector", "Certificate Inspector", "ready"),
    ("cryptography", "pem-der-converter", "PEM/DER Converter", "ready"),
    ("dns", "dns-lookup", "DNS Lookup", "planned"),
    ("dns", "reverse-dns", "Reverse DNS", "planned"),
    ("dns", "mx-lookup", "MX Lookup", "planned"),
    ("dns", "spf-inspector", "SPF Inspector", "planned"),
    ("dns", "dmarc-inspector", "DMARC Inspector", "planned"),
    ("dns", "dnssec-inspector", "DNSSEC Inspector", "planned"),
    ("data", "json-formatter", "JSON Formatter", "planned"),
    ("data", "yaml-formatter", "YAML Formatter", "planned"),
    ("data", "json-yaml", "JSON ↔ YAML", "planned"),
    ("data", "csv-json", "CSV ↔ JSON", "planned"),
    ("data", "xml-formatter", "XML Formatter", "planned"),
    ("development", "uuid-generator", "UUID Generator", "planned"),
    ("development", "cron-parser", "Cron Parser", "planned"),
    ("development", "regex-tester", "Regex Tester", "planned"),
    ("development", "timestamp-converter", "Timestamp Converter", "planned"),
    ("development", "semver-calculator", "SemVer Calculator", "planned"),
    ("github", "actions-yaml-validator", "Actions YAML Validator", "planned"),
    ("github", "dependabot-validator", "Dependabot Validator", "planned"),
    ("github", "workflow-inspector", "Workflow Inspector", "planned"),
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
