# derico.blicca.metadatablock

Two Metadata blocks: a page's own fields, shown inside its blocks area —
one field, or a section of several. A Blicca block add-on (block add-on
contract §3.1) whose editor half is the Aurora npm package
`@derico/aurora-metadata-block` (publishing it is a later step). Generic by
intent — derico.de is its first consumer, not its subject.

Heavily inspired by `@eeacms/volto-metadata-block` (European Environment
Agency, MIT). Thank you. The block ids are theirs (`metadata`,
`metadataSection`) so a page authored with that add-on names the same blocks;
the data shape and the editing model are this package's own, see ADR 0001.

## Language

**Metadata block**:
A block that shows ONE [[field]] of the page it sits on, with an optional
label and an optional placeholder — and, for a plain text field, the place
that field is typed ([[input]]). It stores the field id, the label flag and
the placeholder and nothing else; what the field holds is the page's,
derived on the page. Stored `@type: metadata`.
_Avoid_: field block (a field is what it shows, not what it is), title block
(Aurora's title block is a different, editable, thing), property block.

**Metadata Section block**:
A block that shows SEVERAL fields of the page, in stored order, each with
its own label flag, under an optional heading, in one of two [[layout]]s.
Stored `@type: metadataSection`.
_Avoid_: metadata table (one layout of it), fact box (a use of it).

**Field**:
One field of the content item the blocks sit on: a schema field of its type
or of a behavior, or one of three system rows (`created`, `modified`,
`review_state`). Identified by its id (`description`, `subjects`,
`relatedItems`). Which fields exist depends on the type; which the visitor
gets depends on the field's read permission.
_Avoid_: property, attribute, metadata (the whole, not the one).

**Kind**:
The display shape a field's value is reduced to: `text`, `richtext`, `list`,
`links`, `image` or `file`. Decided on the server from the field's type; the
renderers know six shapes and no field types. Emitted on the root as
`has--kind--<kind>` once the catalog knows the field.
_Avoid_: widget (Volto's word for the same idea, but a widget edits), type
(the field's, not the display's).

**Catalog**:
The [[derived key]]: every offered field of the page as an
`{id, title, kind, value, input}` row, in schema order (`title` and `description`
pulled to the front, the system rows last), the value already reduced to its
kind — or `null` when the field is empty, so the sidebar still offers it.
Injected by the blocks' serialization transformers at load and stripped at
save. The WHOLE catalog, not the chosen fields' rows, so the derived set
depends on the context and the user alone and picking a field in the sidebar
is instant. Both renderers read it as data; neither reads a field off the
object (ADR 0001).
_Avoid_: schema (it carries values), content (it is a projection of it),
properties (Volto's word).

**Derived key**:
A key the blocks' serializers compute onto a stored node at load and their
deserializers strip at save, so it is never on disk. Here there is one,
`catalog`. It belongs to the server alone; no client code writes one; an
author is never offered one in the sidebar.

**Layout**:
How a section arranges its fields: `list` (the single block's anatomy
repeated) or `table` (one row per field, the title always in the header
cell). A stored value, defaulting to `list` in both renderers.

**Fallback fetch**:
The canvas's one exception to reading the [[catalog]] from the node: a block
the server has never serialized — freshly inserted — carries none, so the
editor fetches this package's `@metadata-catalog` service for the object
being edited, once per page, and previews from that. The sidebar's field
widgets use the same request. The `view` never fetches.

**Input**:
The inline control the canvas may draw for a `text`-kind [[field]]: `line`
for a text line (a title), `text` for multi-line text (a description), or
none. Decided on the server per row, from the field type — plain prose only,
never a URI, a password, an identifier, ASCII data or rich text — and from
what the content PATCH will accept: `Modify portal content` plus the field's
own write permission (ADR 0002). Carried on the [[catalog]] row as `input`.
_Avoid_: editable (a flag, where this names a shape), widget.

**Bound field**:
A field the canvas keeps live from the host's form atom rather than from the
loaded catalog: every row with an [[input]], and the title always, because
the title node above the canvas writes into the same atom. Typing into a
bound field's control writes the atom; every Metadata block on the canvas
previews from it at once; the Blicca save carries every field of the atom
the canvas changed (block add-on contract §1.7). Every field that is not
bound is edited on the Content tab.
_Avoid_: live title (the old name for the title's half of this).

**Theme seam**:
The fifteen `--metadata-*` custom properties a host theme sets to make the
blocks its own, with defaults at their point of use and declared nowhere.
