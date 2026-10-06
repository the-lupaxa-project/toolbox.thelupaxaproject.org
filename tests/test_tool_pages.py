"""Home and tool pages rendered from the browser toolbox catalogue."""

import subprocess
import sys
from pathlib import Path

from tools_lib import (
    build_nav,
    load_catalogue,
    render_category_page,
    render_home,
    render_tool_page,
    write_generated_pages,
)

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "data" / "tools.yml"


def _tool(tool_id: str):
    tools = load_catalogue(CATALOGUE)
    return next(tool for tool in tools if tool.id == tool_id)


def test_render_base64_page_contains_widget() -> None:
    page = render_tool_page(_tool("base64"))
    assert 'data-tool="base64"' in page
    assert 'data-action="encode"' in page
    assert 'data-action="decode"' in page
    assert 'class="tool-copy" disabled' in page
    assert 'Encode and decode Base64 text.\n\n<div class="tool-widget"' in page


def test_render_jwt_decoder_has_decode_only() -> None:
    page = render_tool_page(_tool("jwt-decoder"))
    assert 'data-action="decode"' in page
    assert 'data-action="encode"' not in page


def test_render_hash_generator_contains_widget() -> None:
    page = render_tool_page(_tool("hash-generator"))
    assert 'data-tool="hash-generator"' in page
    assert 'data-action="sha-256"' in page
    assert 'data-action="sha-384"' in page
    assert 'data-action="sha-512"' in page
    assert "This tool is not available yet." not in page


def test_form_tool_renders_fields_and_two_outputs(tmp_path: Path) -> None:
    catalogue = tmp_path / "tools.yml"
    catalogue.write_text(
        """
categories:
  - id: cryptography
    title: Cryptography
    description: Cryptography tools.
    tools:
      - id: certificate-generator
        title: Certificate Generator
        summary: Create a certificate in the browser.
        status: ready
        fields:
          - id: common-name
            label: Common name
            kind: text
          - id: validity-days
            label: Validity (days)
            kind: number
            default: "365"
          - id: key-type
            label: Key type
            kind: choice
            default: rsa-2048
            choices:
              - id: rsa-2048
                label: RSA 2048
              - id: ecdsa-p256
                label: ECDSA P-256
        actions:
          - id: generate
            label: Generate
        outputs:
          - id: certificate
            label: Certificate
          - id: private-key
            label: Private key
""",
        encoding="utf-8",
    )
    page = render_tool_page(load_catalogue(catalogue)[0])
    assert 'data-field="common-name"' in page
    assert 'data-field="validity-days"' in page
    assert 'value="365"' in page
    assert 'min="1"' in page
    assert 'max="3650"' in page
    assert 'data-field="key-type"' in page
    assert '<option value="rsa-2048" selected>RSA 2048</option>' in page
    assert '<option value="ecdsa-p256">ECDSA P-256</option>' in page
    assert 'data-action="generate"' in page
    assert 'data-output="certificate"' in page
    assert 'aria-label="Certificate"' in page
    assert 'data-copy="certificate"' in page
    assert 'data-output="private-key"' in page
    assert 'data-copy="private-key"' in page
    assert "tool-input" not in page


def test_render_csr_generator_page() -> None:
    page = render_tool_page(_tool("csr-generator"))
    assert 'data-field="common-name"' in page
    assert 'data-field="key-type"' in page
    assert 'data-output="csr"' in page
    assert 'data-output="private-key"' in page
    assert "validity-days" not in page


def test_render_home_links_to_six_category_pages() -> None:
    page = render_home(load_catalogue(CATALOGUE))
    assert 'class="lupaxa-hero-logo"' in page
    assert 'src="assets/images/brand/hero-logo.png"' in page
    assert "Lupaxa Web Toolbox" in page
    assert "Browser tools for encoding, cryptography, DNS, data, development, and GitHub." in page
    note = page.index("lupaxa-privacy-note")
    grid = page.index("lupaxa-landing-grid")
    assert page.index("lupaxa-hero") < note < grid
    title = page.index("lupaxa-privacy-note__title")
    rule = page.index("<hr>", title)
    body = page.index("Every tool on this site", title)
    assert title < rule < body
    assert "In Your Browser" in page
    assert "Nothing you paste is uploaded or stored on a server" in page
    assert "keys, tokens, and other private material remain under your control." in page
    assert "lupaxa-landing-grid" in page
    assert page.count("**[") == 6
    assert "[Encoding](encoding/index.md)" in page
    assert "[GitHub](github/index.md)" in page
    assert "encoding/base64.md" not in page
    assert "{#encoding}" not in page


def test_category_pages_describe_the_tools_on_offer() -> None:
    tools = load_catalogue(CATALOGUE)
    seen: set[str] = set()
    for category_id in ("encoding", "cryptography", "dns", "data", "development", "github"):
        category_tools = [tool for tool in tools if tool.category_id == category_id]
        page = render_category_page(category_tools[0].category_title, category_tools)
        description = category_tools[0].category_description
        assert description not in seen
        seen.add(description)
        assert description in page
        assert page.index(description) < page.index('<div class="grid cards"')
        assert f'{description.rstrip(chr(10))}\n\n<div class="grid cards" markdown>' in page
        assert "\n\n\n" not in page
        for tool in category_tools:
            assert tool.title in description
        titles = sorted((tool.title for tool in category_tools), key=str.casefold)
        positions = [page.index(f"**[{title}]") for title in titles]
        assert positions == sorted(positions)


def test_build_nav_is_home_plus_six_sections() -> None:
    nav = build_nav(load_catalogue(CATALOGUE))
    assert [next(iter(item)) for item in nav] == [
        "Home",
        "Encoding",
        "Cryptography",
        "DNS",
        "Data",
        "Development",
        "GitHub",
    ]
    assert nav[0] == {"Home": "index.md"}
    for item in nav[1:]:
        children = next(iter(item.values()))
        tool_titles = [next(iter(child)) for child in children[1:]]
        assert tool_titles == sorted(tool_titles, key=str.casefold)
    assert nav[1]["Encoding"][0] == {"Encoding": "encoding/index.md"}
    assert [next(iter(child)) for child in nav[1]["Encoding"][1:]] == [
        "Base 16",
        "Base 32",
        "Base 58",
        "Base 85",
        "Base64",
        "Binary",
        "Hexadecimal",
        "JWT Decoder",
        "Octal",
        "URL Encode/Decode",
    ]
    assert nav[-1]["GitHub"][-1] == {"Workflow Inspector": "github/workflow-inspector.md"}


def test_write_generated_pages_writes_pages_and_drops_stale_file(tmp_path: Path) -> None:
    tools = load_catalogue(CATALOGUE)
    write_generated_pages(tools, tmp_path)
    encoding = (tmp_path / "encoding" / "index.md").read_text(encoding="utf-8")
    assert (tmp_path / "index.md").is_file()
    assert "base64.md" in encoding
    assert (tmp_path / "dns" / "mx-lookup.md").is_file()
    stale = tmp_path / "encoding" / "gone.md"
    stale.write_text("stale\n", encoding="utf-8")
    legacy = tmp_path / "tools" / "encoding" / "index.md"
    legacy.parent.mkdir(parents=True)
    legacy.write_text("old\n", encoding="utf-8")
    write_generated_pages(tools, tmp_path)
    assert not stale.exists()
    assert not (tmp_path / "tools").exists()
    assert (tmp_path / "index.md").is_file()
    assert (tmp_path / "dns" / "mx-lookup.md").is_file()


def test_write_generated_pages_skips_unchanged_files(tmp_path: Path) -> None:
    tools = load_catalogue(CATALOGUE)
    write_generated_pages(tools, tmp_path)
    index = tmp_path / "index.md"
    page = tmp_path / "encoding" / "base64.md"
    index_mtime = index.stat().st_mtime_ns
    page_mtime = page.stat().st_mtime_ns
    write_generated_pages(tools, tmp_path)
    assert index.stat().st_mtime_ns == index_mtime
    assert page.stat().st_mtime_ns == page_mtime


def test_strict_build_contains_widget_and_planned_sentence() -> None:
    completed = subprocess.run(
        [sys.executable, "-m", "mkdocs", "build", "--strict"],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr

    tool_css = (ROOT / "site" / "assets" / "stylesheets" / "40-components" / "tool.css").read_text(
        encoding="utf-8"
    )
    assert ".tool-actions button:hover" in tool_css
    assert ".tool-copy:hover" in tool_css
    assert "cursor: pointer" in tool_css
    assert "cursor: default" in tool_css
    assert "var(--lupaxa-light-blue)" in tool_css

    base64_page = ROOT / "site" / "encoding" / "base64" / "index.html"
    assert base64_page.is_file()
    base64_html = base64_page.read_text(encoding="utf-8")
    assert 'data-tool="base64"' in base64_html
    assert "md-sidebar--primary" in base64_html
    assert "lupaxa-header__drawer-button" in base64_html
    assert "hide-primary-sidebar.css" in base64_html
    shortcuts = base64_html.split("tool-shortcuts", 1)[1].split("</nav>", 1)[0]
    active = shortcuts.split("tool-shortcuts__link--active", 1)[1].split("</a>", 1)[0]
    assert "Encoding Tools" in shortcuts
    assert "Base64" in active
    assert "Hexadecimal" in shortcuts
    assert "URL Encode/Decode" in shortcuts
    assert "JWT Decoder" in shortcuts
    assert "Base 16" in shortcuts
    assert "Base 32" in shortcuts
    assert "Base 58" in shortcuts
    assert "Base 85" in shortcuts
    assert "Binary" in shortcuts
    assert "Octal" in shortcuts
    assert "tools/base-16.js" in base64_html
    assert "tools/base-32.js" in base64_html
    assert "tools/base-58.js" in base64_html
    assert "tools/base-85.js" in base64_html
    assert "tools/binary.js" in base64_html
    assert "tools/octal.js" in base64_html
    assert "Hash Generator" not in shortcuts

    hash_generator = ROOT / "site" / "cryptography" / "hash-generator" / "index.html"
    assert hash_generator.is_file()
    assert 'data-tool="hash-generator"' in hash_generator.read_text(encoding="utf-8")

    certificate_generator = ROOT / "site" / "cryptography" / "certificate-generator" / "index.html"
    assert certificate_generator.is_file()
    certificate_html = certificate_generator.read_text(encoding="utf-8")
    assert 'data-field="common-name"' in certificate_html
    assert 'data-output="private-key"' in certificate_html
    assert 'data-output="csr"' in certificate_html
    assert certificate_html.index('data-output="csr"') < certificate_html.index(
        'data-output="certificate"'
    )
    assert 'value="rsa-3072"' in certificate_html
    assert 'value="rsa-4096"' in certificate_html
    assert 'value="ecdsa-p384"' in certificate_html
    csr_page = (ROOT / "site" / "cryptography" / "csr-generator" / "index.html").read_text(
        encoding="utf-8"
    )
    assert 'value="rsa-4096"' in csr_page
    assert "validity-days" not in csr_page

    certificate_inspector = ROOT / "site" / "cryptography" / "certificate-inspector" / "index.html"
    inspector_html = certificate_inspector.read_text(encoding="utf-8")
    assert "tool-input" in inspector_html
    assert 'data-tool="certificate-inspector"' in inspector_html

    pem_der = ROOT / "site" / "cryptography" / "pem-der-converter" / "index.html"
    pem_html = pem_der.read_text(encoding="utf-8")
    assert "tool-input" in pem_html
    assert 'data-tool="pem-der-converter"' in pem_html

    planned = ROOT / "site" / "dns" / "dns-lookup" / "index.html"
    assert planned.is_file()
    assert "This tool is not available yet." in planned.read_text(encoding="utf-8")

    home = (ROOT / "site" / "index.html").read_text(encoding="utf-8")
    assert 'href="encoding/"' in home
    assert 'href="github/"' in home
    assert 'href="tools/' not in home
    assert 'id="encoding"' not in home
    assert home.count("lupaxa-header__nav-link") == 7

    header = (ROOT / "overrides" / "partials" / "header.html").read_text(encoding="utf-8")
    nav_link_at = header.index('class="lupaxa-header__nav-link"')
    href_at = header.index('href="', nav_link_at)
    section_link = header[href_at : header.index('"', href_at + 6) + 1]
    assert "nav_item.children[0].url" in section_link
    assert "#{{" not in section_link


def test_built_encoding_page_loads_scripts() -> None:
    completed = subprocess.run(
        [sys.executable, "-m", "mkdocs", "build", "--strict"],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr

    base64_page = (ROOT / "site" / "encoding" / "base64" / "index.html").read_text(encoding="utf-8")
    assert "tools/base64.js" in base64_page
    assert "toolbox.js" in base64_page
    assert 'id="lupaxa-lang"' in base64_page
    assert "cdn.counter.dev/script.js" in base64_page
    assert "ef410665-76d4-43fe-9e91-53f26ed1004b" in base64_page
    assert "assets/images/brand/social-media-card.png" in base64_page
    assert (ROOT / "site" / "assets" / "stylesheets" / "40-components" / "tool.css").is_file()
