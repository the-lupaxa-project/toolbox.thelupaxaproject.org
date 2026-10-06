"""Write catalogue pages and nav before MkDocs collects files."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
_TOOLS_LIB = REPO_ROOT / "src" / "tools_lib.py"


def _load_tools_lib() -> Any:
    """Load src/tools_lib.py by path.

    MkDocs restores sys.path after importing a hook, so a normal import is
    not visible again on the next build. Loading the file directly keeps
    `mkdocs build` working without an editable install, and re-reads the
    file on each build so `mkdocs serve` picks up edits.
    """
    spec = importlib.util.spec_from_file_location("_lupaxa_tools_lib", _TOOLS_LIB)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load {_TOOLS_LIB}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def on_pre_build(config: dict[str, Any]) -> None:
    tools_lib = _load_tools_lib()
    catalogue = tools_lib.load_catalogue(REPO_ROOT / "data" / "tools.yml")
    docs_dir = Path(config["docs_dir"])
    tools_lib.write_generated_pages(catalogue, docs_dir)
    config["nav"] = tools_lib.build_nav(catalogue)
