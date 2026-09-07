"""Reading the Metadata blocks' stored JSON — the Python twin of ``metadata/data.ts``.

Each block has two renderers in two languages — the React ``view`` and the
Chameleon template — and one scope-wrapped stylesheet dresses both, so the
rules that decide *what renders* are spelled twice, once per side. This module
is the server's spelling; the editor's is ``bundle-src/src/metadata/data.ts``.
A change to either is a change to both, and ``tests/test_metadata_data.py``
reads the TS file to hold the two tables level.

Deliberately free of Plone imports. Everything here is a pure function of one
stored block dict — the *derivation* of the catalog, which needs a context and
a request, lives in ``metadata_catalog``.

What the two sides read is the same thing: the ``catalog`` key the server's
serializer injects at load time — every field of the content item the block
sits on, as ``{id, title, kind, value, input}`` rows with the value already
reduced to one of six display kinds. Neither renderer formats a field value itself; the
catalog is the server's alone (block add-on contract §5.3), and the canvas
only ever *fetches* one when it holds a node the server has never serialized.
"""

import re


#: The display kinds a catalog row's ``value`` can take. The server reduces
#: every Dexterity field type to one of these at derivation time, so the
#: renderers know six shapes and no field types:
#:
#: - ``text``: one string (titles, descriptions, numbers, dates and booleans
#:   already formatted for the request's locale, choice titles);
#: - ``richtext``: one HTML string, the field's own output transform;
#: - ``list``: strings (tags, multi-choice titles);
#: - ``links``: ``{href, title}`` rows (relations);
#: - ``image``: ``{src, alt}``;
#: - ``file``: ``{href, title}``.
#: PARITY: ``data.ts`` spells the same tuple. Extended together or not at all.
KINDS = ("text", "richtext", "list", "links", "image", "file")

#: The inline controls the canvas can offer for a ``text``-kind row, named by
#: the server per field (ADR 0002): ``line`` for a text line, ``text`` for
#: multi-line text. A row with neither is shown, not edited, in the canvas.
#: The public renderer never reads it. PARITY: ``data.ts`` spells the same
#: tuple.
INPUTS = ("line", "text")

#: The section block's two layouts, in sidebar order, with their labels.
#: PARITY with ``data.ts``.
LAYOUTS = (
    ("list", "List"),
    ("table", "Table"),
)

LAYOUT_IDS = tuple(layout for layout, _label in LAYOUTS)

#: A layout that was never stored, or is not one the block offers, renders
#: the list. Applied in BOTH renderers rather than trusted from the schema's
#: ``default`` key, which is spread into the widget as a prop and is not
#: reliably written to the node.
DEFAULT_LAYOUT = "list"

#: The schemes a link or image URL may carry. The catalog is derived data the
#: server computed, but it travels inside a JSON node that anyone with API
#: access can hand-author, so the renderers screen it like typed input. An
#: allowlist, not a blocklist. PARITY with ``data.ts``.
LINK_SCHEMES = ("http", "https", "mailto", "tel")

_SCHEME = re.compile(r"^([a-zA-Z][a-zA-Z0-9+.-]*):")

#: A field id that may become a class modifier. Dexterity field names are
#: Python identifiers; anything else gets no per-field class rather than an
#: escaped one.
_SLUG = re.compile(r"^[A-Za-z0-9_-]+$")


def text(value):
    """A stored value as a stripped string, or ``''``.

    Nothing in either schema is ``required``, so every reader answers
    "absent" for anything at all. Stripping is also what makes the templates'
    whitespace normalization sound — see ``MetadataBlockView.__call__``.
    """
    return value.strip() if isinstance(value, str) else ""


def screen_link(value):
    """``value`` if it is a usable URL of an allowed scheme, ``''`` otherwise.

    A value with no scheme at all is a path and passes. ``//host/x`` is
    rejected: it is a protocol-relative URL wearing a path's clothes, and the
    scheme it inherits is never screened.
    """
    raw = text(value)
    if not raw or raw.startswith("//"):
        return ""
    match = _SCHEME.match(raw)
    if match is None:
        return raw
    return raw if match.group(1).lower() in LINK_SCHEMES else ""


def field_slug(field_id):
    """``field_id`` if it may become a class modifier, else ``''``."""
    slug = text(field_id)
    return slug if slug and _SLUG.match(slug) else ""


def catalog(data):
    """The derived catalog's well-formed rows, in catalog order.

    ``[]`` for every node the server has not serialized — a freshly inserted
    block, an API-authored one, a test fixture — and for a node whose
    derivation failed. A row must carry a slug ``id``, a string ``title`` and
    a ``kind`` the renderers know; anything else is not a row. ``input`` is
    one of ``INPUTS`` or ``""``.
    """
    value = (data or {}).get("catalog")
    if not isinstance(value, list):
        return []
    rows = []
    for row in value:
        if not isinstance(row, dict):
            continue
        field_id = field_slug(row.get("id"))
        kind = text(row.get("kind"))
        if not field_id or kind not in KINDS:
            continue
        control = text(row.get("input"))
        rows.append({
            "id": field_id,
            "title": text(row.get("title")),
            "kind": kind,
            "value": row.get("value"),
            "input": control if control in INPUTS else "",
        })
    return rows


def row_for(data, field_id):
    """The catalog row for ``field_id``, or ``None``."""
    wanted = text(field_id)
    if not wanted:
        return None
    for row in catalog(data):
        if row["id"] == wanted:
            return row
    return None


def _link(value):
    if not isinstance(value, dict):
        return None
    href = screen_link(value.get("href"))
    title = text(value.get("title"))
    return {"href": href, "title": title} if href and title else None


def resolve_value(kind, value):
    """The display value of ``kind``, or ``None`` when there is nothing to show.

    Rows carry raw catalog values; this is where they are screened. A row
    whose value fails its shape renders nothing, exactly as an empty one.
    """
    if kind in ("text", "richtext"):
        return text(value) or None
    if kind == "list":
        items = [text(item) for item in value] if isinstance(value, list) else []
        items = [item for item in items if item]
        return items or None
    if kind == "links":
        links = [_link(item) for item in value] if isinstance(value, list) else []
        links = [link for link in links if link]
        return links or None
    if kind == "image":
        if not isinstance(value, dict):
            return None
        src = screen_link(value.get("src"))
        return {"src": src, "alt": text(value.get("alt"))} if src else None
    if kind == "file":
        return _link(value)
    return None


def entry(row, show_label):
    """One rendered field: ``{id, title, kind, value, label, css}``.

    ``label`` is the title when the author asked for it, else ``''``;
    ``value`` is the resolved display value or ``None``. ``css`` is the class
    list of the field's root element, in both the single block and a
    section's list rows.
    """
    return {
        "id": row["id"],
        "title": row["title"],
        "kind": row["kind"],
        "value": resolve_value(row["kind"], row["value"]),
        "label": row["title"] if show_label and row["title"] else "",
        "css": f"metadata-block has--field--{row['id']} has--kind--{row['kind']}",
    }


# ── the Metadata block ───────────────────────────────────────────────────────


def stored_field(data):
    """The field the block shows, as stored. Plain text; may name nothing."""
    return text((data or {}).get("field"))


def show_label(data):
    """Whether the author asked for the field's title above its value."""
    return (data or {}).get("showLabel") is True


def placeholder(data):
    """What to show when the field has no value. Plain text."""
    return text((data or {}).get("placeholder"))


def metadata_entry(data):
    """What the Metadata block renders: ``{css, label, kind, value, placeholder}``.

    The root is emitted always. With a stored field the root carries
    ``has--field--<id>``, and — when the catalog knows the field — its kind
    too. The label renders only for a known field; the placeholder only when
    a field is stored and there is no value to show.
    """
    field_id = stored_field(data)
    row = row_for(data, field_id)
    if row is not None:
        found = entry(row, show_label(data))
        found["placeholder"] = placeholder(data) if found["value"] is None else ""
        return found
    slug = field_slug(field_id)
    return {
        "id": slug,
        "title": "",
        "kind": "",
        "value": None,
        "label": "",
        "css": f"metadata-block has--field--{slug}" if slug else "metadata-block",
        "placeholder": placeholder(data) if field_id else "",
    }


# ── the Metadata Section block ───────────────────────────────────────────────


def section_title(data):
    """The optional heading above the section. Plain text."""
    return text((data or {}).get("title"))


def effective_layout(data):
    """The layout that renders: the stored one if offered, else the default."""
    stored = text((data or {}).get("layout"))
    return stored if stored in LAYOUT_IDS else DEFAULT_LAYOUT


def field_specs(data):
    """The stored field list, well-formed: ``[{field, showLabel}]``.

    A spec that names no field is skipped; anything that is not an object is
    skipped; a field named twice renders twice, as authored.
    """
    value = (data or {}).get("fields")
    if not isinstance(value, list):
        return []
    specs = []
    for spec in value:
        if not isinstance(spec, dict):
            continue
        field_id = text(spec.get("field"))
        if field_id:
            specs.append({"field": field_id, "showLabel": spec.get("showLabel") is True})
    return specs


def section_entries(data):
    """The fields that render, in stored order, each with a value to show.

    A field the catalog does not know and a field with nothing to show both
    render nothing — a section is a list of facts, and an empty fact is not
    one. The canvas says which fields were skipped; the public page says
    nothing.
    """
    found = []
    for spec in field_specs(data):
        row = row_for(data, spec["field"])
        if row is None:
            continue
        candidate = entry(row, spec["showLabel"])
        if candidate["value"] is not None:
            found.append(candidate)
    return found
