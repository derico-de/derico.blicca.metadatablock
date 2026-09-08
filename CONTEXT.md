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
label and an optional placeholder — and, in the canvas, the place that
field is edited ([[input]]). It stores the field id, the label flag, the
[[show in view]] flag and the placeholder and nothing else; what the field
holds is the page's, derived on the page. Stored `@type: metadata`.
_Avoid_: field block (a field is what it shows, not what it is), title block
(Aurora's title block is a different, editable, thing), property block.

**Show in view**:
Whether the [[Metadata block]] renders for a visitor. Stored `showInView`,
and the one boolean of either block read as "not false" rather than "is
true", so a block authored before the setting existed still renders. Off,
the public renderers emit NOTHING — not the root, so the host drops the
block's band with it — and the canvas draws the block as always: the block
is then an [[input]] and no more, for a field the page renders elsewhere (a
lead image above the content). A setting of the single block; a section
shows several fields and is not the place to hide one.
_Avoid_: published (the workflow's word), visible (a CSS state, where this
decides whether there is anything to see), hidden (the flag is named for
what it does when on).

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
`tags`, `links`, `image` or `file`. Decided on the server from the field's
type — `tags` from its NAME besides, see [[tags]]; the renderers know seven
shapes and no field types. Emitted on the root as `has--kind--<kind>` once
the catalog knows the field.
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
The inline control the canvas draws for a [[field]]: `line`, `text`,
`number`, `boolean`, `select`, `tokens` (tags, multi-choice), `datetime`,
`date`, `relations` or `file`, or none. Decided on the server per row from
the field's type — every type the Volto block edits, rich text excepted —
and from what the content PATCH will accept: `Modify portal content` plus
the field's own write permission (ADR 0002). Carried on the [[catalog]] row
as `input`, with `raw` (the restapi value the control edits) and `schema`
(the `@types` property, terms inlined as `choices`).
_Avoid_: editable (a flag, where this names a shape), widget (Volto's word).

**Bound field**:
A field a control edits in the host's form atom: every row with an
[[input]]. Editing writes the atom; every Metadata block on the canvas
shows it at once — a text control by previewing the atom's string, every
other control by being the preview; the Blicca save carries every field of
the atom the canvas changed (block add-on contract §1.7). The title is
previewed from the atom even without an input, because the title node
above the canvas writes into the same atom. Every field that is not bound
is edited on the Content tab.
_Avoid_: live title (the old name for the title's half of this).

**Tags**:
The [[kind]] of a field whose values are keywords the site's catalog
indexes: `subjects` in the `Subject` index (`metadata_catalog.TAG_INDEXES`
is the map, and the only place a field is known by name). The server reduces
such a field to `{href, title}` rows, one search link per keyword — the link
Plone's own keywords viewlet builds — and both renderers draw them as pills.
_Avoid_: keywords (the field's word, where this names the display), subjects
(the field id), categories (the viewlet's `section-category`).

**Theme seam**:
The twenty-one `--metadata-*` custom properties a host theme sets to make the
blocks its own, with defaults at their point of use and declared nowhere.
