"""Load the browser toolbox catalogue from YAML and render its pages."""

import html
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

_ID_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
_STATUSES = frozenset({"ready", "planned"})


class CatalogueError(ValueError):
    """Raised when a catalogue file is invalid."""


@dataclass(frozen=True)
class Action:
    id: str
    label: str


@dataclass(frozen=True)
class Choice:
    id: str
    label: str


@dataclass(frozen=True)
class Field:
    id: str
    label: str
    kind: str
    default: str
    choices: tuple[Choice, ...]


@dataclass(frozen=True)
class Output:
    id: str
    label: str


@dataclass(frozen=True)
class Tool:
    category_id: str
    category_title: str
    category_description: str
    id: str
    title: str
    summary: str
    status: str
    actions: tuple[Action, ...]
    fields: tuple[Field, ...] = ()
    outputs: tuple[Output, ...] = ()


def load_catalogue(path: Path) -> tuple[Tool, ...]:
    document = yaml.safe_load(path.read_text(encoding="utf-8"))
    root = _mapping(document, "catalogue")
    categories = root.get("categories")
    if not isinstance(categories, list):
        raise CatalogueError("categories must be a list")

    tools: list[Tool] = []
    seen_category_ids: set[str] = set()
    seen_tool_ids: set[str] = set()
    for index, category in enumerate(categories):
        category_map = _mapping(category, f"categories[{index}]")
        category_id = _identifier(
            _required_text(category_map, "id", f"categories[{index}]"),
            f"categories[{index}]",
        )
        if category_id in seen_category_ids:
            raise CatalogueError(f"duplicate category id {category_id!r}")
        seen_category_ids.add(category_id)
        category_title = _required_text(category_map, "title", f"category {category_id}")
        category_description = _required_text(
            category_map, "description", f"category {category_id}"
        )
        raw_tools = category_map.get("tools")
        if not isinstance(raw_tools, list):
            raise CatalogueError(f"category {category_id} tools must be a list")
        for tool_index, raw_tool in enumerate(raw_tools):
            where = f"category {category_id} tools[{tool_index}]"
            tools.append(
                _tool(
                    raw_tool,
                    where,
                    category_id,
                    category_title,
                    category_description,
                    seen_tool_ids,
                )
            )
    return tuple(tools)


def _tool(
    raw_tool: Any,
    where: str,
    category_id: str,
    category_title: str,
    category_description: str,
    seen_tool_ids: set[str],
) -> Tool:
    tool_map = _mapping(raw_tool, where)
    tool_id = _identifier(_required_text(tool_map, "id", where), where)
    if tool_id in seen_tool_ids:
        raise CatalogueError(f"duplicate tool id {tool_id!r}")
    seen_tool_ids.add(tool_id)
    status = _required_text(tool_map, "status", where)
    if status not in _STATUSES:
        raise CatalogueError(f"tool {tool_id} status {status!r} is invalid")
    fields = _fields(tool_map, tool_id, status)
    outputs = _outputs(tool_map, tool_id, status, bool(fields))
    return Tool(
        category_id=category_id,
        category_title=category_title,
        category_description=category_description,
        id=tool_id,
        title=_required_text(tool_map, "title", where),
        summary=_required_text(tool_map, "summary", where),
        status=status,
        actions=_actions(tool_map, tool_id, status),
        fields=fields,
        outputs=outputs,
    )


def _actions(tool_map: dict[str, Any], tool_id: str, status: str) -> tuple[Action, ...]:
    if status == "planned":
        if "actions" in tool_map:
            raise CatalogueError(f"planned tool {tool_id} must not include actions")
        return ()
    raw_actions = tool_map.get("actions")
    if not isinstance(raw_actions, list) or not raw_actions:
        raise CatalogueError(f"ready tool {tool_id} must include actions")
    actions: list[Action] = []
    for index, raw_action in enumerate(raw_actions):
        where = f"tool {tool_id} actions[{index}]"
        action_map = _mapping(raw_action, where)
        actions.append(
            Action(
                id=_identifier(_required_text(action_map, "id", where), where),
                label=_required_text(action_map, "label", where),
            )
        )
    return tuple(actions)


def _fields(tool_map: dict[str, Any], tool_id: str, status: str) -> tuple[Field, ...]:
    if status == "planned":
        if "fields" in tool_map or "outputs" in tool_map:
            raise CatalogueError(f"planned tool {tool_id} must not include fields or outputs")
        return ()
    if "fields" not in tool_map:
        return ()
    raw_fields = tool_map["fields"]
    if not isinstance(raw_fields, list) or not raw_fields:
        raise CatalogueError(f"ready tool {tool_id} fields must be a non-empty list")
    fields: list[Field] = []
    for index, raw_field in enumerate(raw_fields):
        where = f"tool {tool_id} fields[{index}]"
        field_map = _mapping(raw_field, where)
        kind = _required_text(field_map, "kind", where)
        if kind not in {"text", "number", "choice"}:
            raise CatalogueError(f"{where} kind {kind!r} is invalid")
        default = field_map.get("default", "")
        if not isinstance(default, str):
            raise CatalogueError(f"{where} default must be a string")
        choices: tuple[Choice, ...] = ()
        if kind == "choice":
            raw_choices = field_map.get("choices")
            if not isinstance(raw_choices, list) or not raw_choices:
                raise CatalogueError(f"{where} choices must be a non-empty list")
            parsed_choices: list[Choice] = []
            for choice_index, raw_choice in enumerate(raw_choices):
                choice_where = f"{where} choices[{choice_index}]"
                choice_map = _mapping(raw_choice, choice_where)
                parsed_choices.append(
                    Choice(
                        id=_identifier(
                            _required_text(choice_map, "id", choice_where),
                            choice_where,
                        ),
                        label=_required_text(choice_map, "label", choice_where),
                    )
                )
            choices = tuple(parsed_choices)
            if default not in {choice.id for choice in choices}:
                raise CatalogueError(f"{where} default must match a choice id")
        fields.append(
            Field(
                id=_identifier(_required_text(field_map, "id", where), where),
                label=_required_text(field_map, "label", where),
                kind=kind,
                default=default,
                choices=choices,
            )
        )
    return tuple(fields)


def _outputs(
    tool_map: dict[str, Any], tool_id: str, status: str, has_fields: bool
) -> tuple[Output, ...]:
    if status == "planned":
        return ()
    if not has_fields:
        if "outputs" in tool_map:
            raise CatalogueError(f"text tool {tool_id} must not include outputs")
        return ()
    raw_outputs = tool_map.get("outputs")
    if not isinstance(raw_outputs, list) or not raw_outputs:
        raise CatalogueError(f"form tool {tool_id} must include outputs")
    outputs: list[Output] = []
    for index, raw_output in enumerate(raw_outputs):
        where = f"tool {tool_id} outputs[{index}]"
        output_map = _mapping(raw_output, where)
        outputs.append(
            Output(
                id=_identifier(_required_text(output_map, "id", where), where),
                label=_required_text(output_map, "label", where),
            )
        )
    return tuple(outputs)


def _mapping(value: Any, where: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise CatalogueError(f"{where} must be a mapping")
    return value


def _required_text(mapping: dict[str, Any], key: str, where: str) -> str:
    value = mapping.get(key)
    if not isinstance(value, str) or value == "":
        raise CatalogueError(f"{where} {key} must be a non-empty string")
    return value


def _identifier(value: str, where: str) -> str:
    if _ID_PATTERN.fullmatch(value) is None:
        raise CatalogueError(f"{where} id {value!r} is invalid")
    return value


def render_tool_page(tool: Tool) -> str:
    lines = [
        "---",
        f"title: {tool.title}",
        "---",
        "",
        f"# {tool.title}",
        "",
        tool.summary,
        "",
    ]
    if tool.status == "planned":
        lines.append("This tool is not available yet.")
        return "\n".join(lines) + "\n"
    if tool.status != "ready":
        raise CatalogueError(f"tool {tool.id} status {tool.status!r} is invalid")
    if tool.fields:
        return "\n".join(lines) + "\n" + _form_widget(tool)
    buttons = "\n".join(
        "<button "
        f'type="button" data-action="{html.escape(action.id, quote=True)}">'
        f"{html.escape(action.label, quote=True)}</button>"
        for action in tool.actions
    )
    widget = (
        f'<div class="tool-widget" data-tool="{html.escape(tool.id, quote=True)}">\n'
        '<textarea class="tool-input" aria-label="Input"></textarea>\n'
        '<div class="tool-actions">\n'
        f"{buttons}\n"
        "</div>\n"
        '<textarea class="tool-output" aria-label="Output" readonly></textarea>\n'
        '<button type="button" class="tool-copy" disabled>Copy</button>\n'
        '<p class="tool-error" role="alert"></p>\n'
        "</div>\n"
    )
    return "\n".join(lines) + "\n" + widget


def _form_widget(tool: Tool) -> str:
    lines = [f'<div class="tool-widget" data-tool="{html.escape(tool.id, quote=True)}">']
    for field in tool.fields:
        field_id = html.escape(field.id, quote=True)
        lines.extend(
            [
                '<label class="tool-field">',
                f'<span class="tool-field__label">{html.escape(field.label, quote=True)}</span>',
            ]
        )
        if field.kind == "text":
            lines.append(
                '<input class="tool-field__control" type="text" '
                f'data-field="{field_id}" autocomplete="off">'
            )
        elif field.kind == "number":
            lines.append(
                '<input class="tool-field__control" type="number" '
                f'data-field="{field_id}" '
                f'value="{html.escape(field.default, quote=True)}" '
                'min="1" max="3650" inputmode="numeric">'
            )
        else:
            lines.append(f'<select class="tool-field__control" data-field="{field_id}">')
            for choice in field.choices:
                choice_id = html.escape(choice.id, quote=True)
                selected = " selected" if choice.id == field.default else ""
                lines.append(
                    f'<option value="{choice_id}"{selected}>'
                    f"{html.escape(choice.label, quote=True)}</option>"
                )
            lines.append("</select>")
        lines.append("</label>")
    lines.append('<div class="tool-actions">')
    lines.extend(
        "<button "
        f'type="button" data-action="{html.escape(action.id, quote=True)}">'
        f"{html.escape(action.label, quote=True)}</button>"
        for action in tool.actions
    )
    lines.append("</div>")
    for output in tool.outputs:
        output_id = html.escape(output.id, quote=True)
        output_label = html.escape(output.label, quote=True)
        lines.extend(
            [
                '<label class="tool-field">',
                f'<span class="tool-field__label">{output_label}</span>',
                f'<textarea class="tool-output" data-output="{output_id}" '
                f'aria-label="{output_label}" readonly></textarea>',
                "</label>",
                '<button type="button" class="tool-copy" '
                f'data-copy="{output_id}" disabled>Copy</button>',
            ]
        )
    lines.extend(['<p class="tool-error" role="alert"></p>', "</div>"])
    return "\n".join(lines) + "\n"


def render_home(tools: tuple[Tool, ...]) -> str:
    parts = [
        "---",
        "hide:",
        "  - toc",
        "title: Home",
        "---",
        "",
        '<div class="lupaxa-hero">',
        "    <img",
        '        class="lupaxa-hero-logo"',
        '        src="assets/images/brand/hero-logo.png"',
        '        alt="The Lupaxa Project Logo"',
        '        translate="no"/>',
        '    <h1 class="lupaxa-hero-title" translate="no">Lupaxa Web Toolbox</h1>',
        '    <p class="lupaxa-hero-subtitle">'
        + "Browser tools for encoding, cryptography, DNS, data, development, and GitHub."
        + "</p>",
        "</div>",
        "",
        '<aside class="lupaxa-privacy-note">',
        '    <p class="lupaxa-privacy-note__title">In Your Browser</p>',
        "    <hr>",
        "    <p>Every tool on this site runs in the page you have open."
        + " Paste text for encoding, a hash, a certificate, or any other"
        + " tool, and the page reads it and writes the result back here."
        + " Your text stays on this machine. Nothing you paste is uploaded"
        + " or stored on a server, so keys, tokens, and other private"
        + " material remain under your control.</p>",
        "</aside>",
        "",
        '<div class="grid cards lupaxa-landing-grid" markdown>',
        "",
    ]
    for category_id, category_title, category_tools in _categories(tools):
        href = f"{category_id}/index.md"
        parts.extend(_card(category_title, href, _tool_list(category_tools)))
    parts.append("</div>")
    parts.append("")
    return "\n".join(parts).rstrip() + "\n"


def render_category_page(category_title: str, category_tools: list[Tool]) -> str:
    category_tools = _by_title(category_tools)
    parts = [
        "---",
        f"title: {category_title}",
        "hide:",
        "  - toc",
        "---",
        "",
        f"# {category_title}",
        "",
        category_tools[0].category_description.rstrip("\n"),
        "",
        '<div class="grid cards" markdown>',
        "",
    ]
    for tool in category_tools:
        parts.extend(_card(tool.title, f"{tool.id}.md", tool.summary))
    parts.append("</div>")
    parts.append("")
    return "\n".join(parts).rstrip() + "\n"


def _card(title: str, href: str, summary: str) -> list[str]:
    return [
        f"-   **[{title}]({href})**",
        "",
        "    ---",
        "",
        f"    {summary}",
        "",
    ]


def _tool_list(category_tools: list[Tool]) -> str:
    titles = [tool.title for tool in category_tools]
    if len(titles) == 1:
        return f"{titles[0]}."
    return f"{', '.join(titles[:-1])}, and {titles[-1]}."


def build_nav(tools: tuple[Tool, ...]) -> list[Any]:
    nav: list[Any] = [{"Home": "index.md"}]
    for category_id, category_title, category_tools in _categories(tools):
        children = [{category_title: f"{category_id}/index.md"}]
        children.extend({tool.title: f"{category_id}/{tool.id}.md"} for tool in category_tools)
        nav.append({category_title: children})
    return nav


def _write_if_changed(path: Path, text: str) -> None:
    if path.is_file() and path.read_text(encoding="utf-8") == text:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def write_generated_pages(tools: tuple[Tool, ...], docs_dir: Path) -> None:
    expected: set[Path] = set()
    category_dirs: list[Path] = []
    for category_id, category_title, category_tools in _categories(tools):
        category_dir = docs_dir / category_id
        category_dirs.append(category_dir)
        index_path = category_dir / "index.md"
        expected.add(index_path)
        _write_if_changed(index_path, render_category_page(category_title, category_tools))
    for tool in tools:
        path = docs_dir / tool.category_id / f"{tool.id}.md"
        expected.add(path)
        _write_if_changed(path, render_tool_page(tool))
    for category_dir in category_dirs:
        if not category_dir.is_dir():
            continue
        for path in category_dir.rglob("*"):
            if path.is_file() and path not in expected:
                path.unlink()
        for path in sorted((p for p in category_dir.rglob("*") if p.is_dir()), reverse=True):
            if not any(path.iterdir()):
                path.rmdir()
    legacy = docs_dir / "tools"
    if legacy.is_dir():
        shutil.rmtree(legacy)
    docs_dir.mkdir(parents=True, exist_ok=True)
    _write_if_changed(docs_dir / "index.md", render_home(tools))


def _categories(tools: tuple[Tool, ...]) -> list[tuple[str, str, list[Tool]]]:
    grouped: list[tuple[str, str, list[Tool]]] = []
    index: dict[str, int] = {}
    for tool in tools:
        slot = index.get(tool.category_id)
        if slot is None:
            index[tool.category_id] = len(grouped)
            grouped.append((tool.category_id, tool.category_title, [tool]))
        else:
            grouped[slot][2].append(tool)
    return [
        (category_id, category_title, _by_title(category_tools))
        for category_id, category_title, category_tools in grouped
    ]


def _by_title(category_tools: list[Tool]) -> list[Tool]:
    return sorted(category_tools, key=lambda tool: tool.title.casefold())
