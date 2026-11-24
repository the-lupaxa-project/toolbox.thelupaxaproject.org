"""Legal pages, footer links, and analytics opt-out."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MKDOCS_YML = (ROOT / "mkdocs.yml").read_text(encoding="utf-8")
FOOTER = (ROOT / "overrides/partials/footer.html").read_text(encoding="utf-8")
MAIN = (ROOT / "overrides/main.html").read_text(encoding="utf-8")
PRIVACY = (ROOT / "mkdocs/legal/privacy-policy.md").read_text(encoding="utf-8")
TERMS = (ROOT / "mkdocs/legal/website-terms.md").read_text(encoding="utf-8")
COPYRIGHT = (ROOT / "mkdocs/legal/copyright-and-licensing.md").read_text(encoding="utf-8")
DISCLAIMER = (ROOT / "mkdocs/legal/disclaimer.md").read_text(encoding="utf-8")


def test_footer_links_the_four_policies():
    assert "href=\"{{ 'legal/privacy-policy/' | url }}\"" in FOOTER
    assert "href=\"{{ 'legal/website-terms/' | url }}\"" in FOOTER
    assert "href=\"{{ 'legal/copyright-and-licensing/' | url }}\"" in FOOTER
    assert "href=\"{{ 'legal/disclaimer/' | url }}\"" in FOOTER
    assert "assets/stylesheets/50-pages/privacy.css" in MKDOCS_YML
    assert "/legal/*.md" in MKDOCS_YML


def test_policies_describe_this_toolbox():
    for page in (PRIVACY, TERMS, COPYRIGHT, DISCLAIMER):
        assert "toolbox.thelupaxaproject.org" in page
        assert "catalogue" not in page.casefold()
    assert "DNS Lookup" in PRIVACY
    assert "Quad9" in PRIVACY
    assert "private key" in PRIVACY
    assert "Open Ko-fi Widget" in PRIVACY


def test_analytics_can_be_turned_off_in_this_browser():
    assert 'localStorage.getItem("lupaxa-counter") === "off"' in MAIN
    assert 'localStorage.getItem("lupaxa-cloudflare") === "off"' in MAIN
    assert "cloudflare_analytics_token: 31ef33d8c80445529678df8599814943" in MKDOCS_YML
    assert "assets/javascript/counter-choice.js" in MKDOCS_YML
    assert 'data-analytics-key="lupaxa-counter"' in PRIVACY
    assert 'data-analytics-key="lupaxa-cloudflare"' in PRIVACY
    assert "Don't count my visits with Counter" in PRIVACY
    assert "Don't count my visits with Cloudflare" in PRIVACY
