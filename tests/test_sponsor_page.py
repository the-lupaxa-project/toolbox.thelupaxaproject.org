"""Sponsor page nav, copy, and Ko-fi embed."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MKDOCS_YML = (ROOT / "mkdocs.yml").read_text(encoding="utf-8")
SPONSOR_MD = (ROOT / "mkdocs/sponsor.md").read_text(encoding="utf-8")


def test_sponsor_stylesheet_is_loaded():
    assert "assets/stylesheets/50-pages/sponsor.css" in MKDOCS_YML


def test_sponsor_page_states_time_then_costs_and_embeds_kofi():
    time_at = SPONSOR_MD.index("**Time**")
    costs_at = SPONSOR_MD.index("**Running costs**")
    ai_at = SPONSOR_MD.index("**AI subscriptions**")
    assert time_at < costs_at < ai_at
    assert "\n# Sponsor\n" not in SPONSOR_MD
    assert "\n    ---\n" not in SPONSOR_MD
    assert (
        'src="https://ko-fi.com/thelupaxaproject/?hidefeed=true&widget=true&embed=true"'
    ) in SPONSOR_MD
    assert 'aria-label="Support The Lupaxa Project on Ko-fi"' in SPONSOR_MD
    assert "title=" not in SPONSOR_MD
    assert 'href="https://ko-fi.com/thelupaxaproject"' in SPONSOR_MD
    assert 'rel="noopener noreferrer"' in SPONSOR_MD
    assert 'target="_blank"' in SPONSOR_MD
    assert "[https://ko-fi.com/thelupaxaproject](https://ko-fi.com/thelupaxaproject)" in SPONSOR_MD
    assert "toolbox.thelupaxaproject.org/sponsor/" not in SPONSOR_MD
    assert "overlay-widget.js" not in SPONSOR_MD
