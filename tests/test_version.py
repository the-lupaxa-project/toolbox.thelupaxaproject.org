"""Semantic version shape only. Never assert a literal version."""

from version import __version__, get_version


def test_version_is_dotted_semver() -> None:
    assert isinstance(__version__, str)
    parts = __version__.split(".")
    assert len(parts) >= 2
    assert all(part.isdigit() for part in parts[:2])
    assert get_version() == __version__
