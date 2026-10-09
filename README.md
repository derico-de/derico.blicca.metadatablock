# derico.blicca.metadatablock

Two **Metadata** blocks for the Aurora editor in [Plone](https://plone.org) Blicca.
Blicca is the former Plone Classic UI. The blocks show a page's own fields
inside its blocks area: title, description, tags, dates, lead image, related
items, or any other field of the content type. The **Metadata** block shows
one field. The **Metadata section** block shows several, as a list or as a
table.

Typical uses:

- a "Last modified" line at the bottom of an article;
- the tags of a page, placed where the layout wants them;
- a fact box: event dates, contact, state, related pages, in one table;
- an author box built from the ownership fields.

The blocks need [plone.blicca.auroraeditor](https://github.com/derico-de/plone.blicca.auroraeditor),
which brings the Aurora editor to Blicca. Their editor half is also a plain
Aurora block package, `@derico/aurora-metadata-block`, that can be used in an
Aurora frontend directly, see
[Using the blocks in Aurora](#using-the-blocks-in-aurora).

The blocks are inspired by
[`@eeacms/volto-metadata-block`](https://github.com/eea/volto-metadata-block)
by the European Environment Agency and use the same block ids, `metadata`
and `metadataSection`.

## Features

- **Any field of the page.** Every field of the content type and its
  behaviors that the current user may read, plus created, modified and the
  workflow state.
- **Seven display kinds.** Text, rich text, lists, tags (keyword pills that
  link to a search), links (relations), image (the lead image as a scale)
  and file (a download link). Dates, numbers and booleans are formatted for
  the request's locale.
- **Labels, placeholders, layouts.** Each field can show its title as a
  label. The single block can show a placeholder when the field is empty.
  The section renders as a stack or as a two-column table.
- **Show in view.** Turned off, the block renders nothing on the public page
  but stays editable in the editor. Use it to edit a field in the blocks
  area that the page already shows elsewhere.
- **Always current.** Values are not stored with the block. They are read
  from the page on every load, for the current user.
- **Fields are edited in place.** Every field the author may write gets a
  control of its kind in the canvas: text, number, date, checkbox, select,
  tag chips, related items, image and file upload. Saving the page stores the
  field together with the blocks. Rich text and read-only fields are edited
  on the Content tab.
- **Live preview in the editor,** also for a freshly inserted block. Notices
  about a block (no field chosen, field empty, where a value is edited) are
  shown in the block's settings sidebar, not on the canvas.
- **One markup, one stylesheet** for the public page, the editor canvas and
  an Aurora frontend.
- **Themeable** through twenty-one `--metadata-*` CSS custom properties.
- **Block width and background colour** come from the editor's regular block
  styling controls.

## Requirements

- Plone 6.0 or later
- `plone.blicca.auroraeditor` 1.0.0a4 or later

The JavaScript bundle is committed to the package. No Node is needed at
install time.

## Installation

Add the package to your project's dependencies:

```toml
# pyproject.toml
dependencies = [
    "derico.blicca.metadatablock",
]
```

Then install **Derico Blicca Metadatablock** from Plone's Add-ons control
panel, or apply the `derico.blicca.metadatablock:default` profile. The
profile registers both blocks with the Aurora editor for that site.
Uninstalling removes the registrations again.

## Using the blocks

**Metadata**, one field:

1. Insert the **Metadata** block in the Aurora editor.
2. In the sidebar, choose the **Field** from the page's fields.
3. Leave **Show in view** on to publish the field here. Turn it off to keep
   the block as an editing surface only.
4. Turn on **Show label** to put the field's title above its value.
5. Optionally enter a **Placeholder**, shown when the field is empty.

**Metadata section**, several fields:

1. Insert the **Metadata section** block.
2. Optionally enter a **Heading**.
3. Leave **Show in view** on to publish the fields here, or turn it off.
4. Choose the **Layout**: *List* stacks the fields, *Table* puts one field
   per row with its title in the first column.
5. Under **Fields**, add the fields to show, in order, each with its own
   *Show label* switch. The table layout always shows the title.

Only these choices are stored with the page. The values come from the page
on every load. The editor previews them as *you* see them, and a field the
current user may not read is not offered. An empty field renders nothing, or
the placeholder in the single block. In a section it is skipped.

Every field you may write is edited right in the block. What you edit is the
page's field, so every other block that shows the same field follows at
once, and so does the page title above the canvas. Rich text and fields you
may not write are edited on the **Content** tab. The sidebar says which is
which.

## Rendered markup

The **Metadata** block:

```html
<div class="metadata-block has--field--description has--kind--text">
  <span class="metadata-label">Summary</span>                 <!-- only with Show label -->
  <div class="metadata-value metadata-value--text">…</div>     <!-- only with a value -->
  <div class="metadata-value metadata-value--placeholder">…</div>  <!-- only without one, with a placeholder -->
</div>
```

The value element depends on the kind:

| kind | value element |
|---|---|
| `text` | `<div class="metadata-value metadata-value--text">text</div>` |
| `richtext` | `<div class="metadata-value metadata-value--richtext">html</div>` |
| `list` | `… <ul class="metadata-list"><li class="metadata-item">…</li></ul>` |
| `tags` | `… <ul class="metadata-list"><li class="metadata-item"><a class="metadata-tag" rel="nofollow" href>…</a></li></ul>` |
| `links` | `… <ul class="metadata-list"><li class="metadata-item"><a class="metadata-link" href>…</a></li></ul>` |
| `image` | `… <img class="metadata-image" src alt>` |
| `file` | `… <a class="metadata-link" href>filename</a>` |

The **Metadata section** block:

```html
<section class="metadata-section-block has--layout--list" aria-label="Facts">
  <h2 class="metadata-section-title">Facts</h2>          <!-- only with a heading -->
  <div class="metadata-section-list">                      <!-- list layout, only with fields -->
    <div class="metadata-block has--field--title has--kind--text">…</div>
  </div>
  <table class="metadata-section-table"><tbody>            <!-- table layout, only with fields -->
    <tr class="metadata-section-row has--field--title has--kind--text">
      <th class="metadata-label" scope="row">Title</th>
      <td class="metadata-value metadata-value--text">…</td>
    </tr>
  </tbody></table>
</section>
```

- The root carries the chosen field as `has--field--<id>` and its kind as
  `has--kind--<kind>`. With **Show in view** off, nothing is emitted at all.
- Everything inside is left out when it has nothing to show.
- Block width and background classes are added by the editor on a wrapper
  around this markup, as for every Aurora block.

## How it works

The blocks store which fields to show and how, nothing else. The values come
from the server:

1. On every load of a page, a `plone.restapi` block serialization
   transformer derives the page's **catalog**: every field the current user
   may read, as `{id, title, kind, value, input}` rows in schema order. The
   value is already reduced to its display kind and formatted for the
   request's locale. `input` names the inline control the editor draws, or
   is empty for a field the user may not write. The catalog is injected into
   the block data as `catalog`.
2. On save, a matching deserialization transformer strips `catalog` again,
   so it is never persisted and cannot go stale.
3. The renderers read the chosen fields out of the catalog and print them.
   They format nothing themselves.

The whole catalog is injected, not only the chosen fields, so picking a field
in the sidebar updates the preview without a round trip. It also fills the
sidebar's field select. A freshly inserted block has no catalog yet. The
editor fetches one from the page's `@metadata-catalog` REST endpoint, which
this package adds.

Inline editing binds each editable field to the editor's form state, the
same way Aurora's own title node does. Saving the page sends the edited
fields together with the blocks.

The transformers are registered for content with the `IBlocks` behavior and
for the site root, so a block stored on the site root shows the site root's
fields on every page.

Two renderers emit the same markup: Chameleon templates registered as the
`@@aurora-block-metadata` and `@@aurora-block-metadataSection` views for the
public page, and React `view` components for the editor canvas and for
Aurora frontends. Both read the shared fixture `tests/anatomy-cases.json` in
their test suites, so they cannot drift apart unnoticed.

Link and image URLs must be a plain path or use `http`, `https`, `mailto` or
`tel`, because block data travels in JSON that anyone with API access can
write.

## Theming

Twenty-one CSS custom properties are the whole styling interface. Set them
on `:root`; they inherit into the blocks. Do not override the blocks' rules
directly: the stylesheet is `@scope`-wrapped, and a scoped declaration wins
over an unscoped one of equal specificity.

The blocks declare none of these properties. Every default is spelled at its
point of use as `var(--metadata-x, <default>)`, so a value set on `:root`
inherits in and wins without specificity games.

| property | default | what it controls |
|---|---|---|
| `--metadata-flow` | `0.25rem` | gap between a label and its value |
| `--metadata-gap` | `0.75rem` | gap between the fields of a section, and below its heading |
| `--metadata-padding` | `0` | inner padding of a block root |
| `--metadata-label-size` | `0.875rem` | label font size |
| `--metadata-label-weight` | `600` | label font weight |
| `--metadata-label-color` | `currentColor` | label colour |
| `--metadata-value-size` | `1rem` | value font size |
| `--metadata-list-gap` | `0.5rem` | gap between the items of a list or links value |
| `--metadata-tag-padding` | `0.125rem 0.5rem` | padding inside a tag pill |
| `--metadata-tag-border` | `1px solid currentColor` | tag pill `border` |
| `--metadata-tag-radius` | `0.25rem` | tag pill `border-radius` |
| `--metadata-tag-size` | `0.875rem` | tag font size |
| `--metadata-tag-color` | `currentColor` | tag colour |
| `--metadata-tag-decoration` | `none` | tag `text-decoration` |
| `--metadata-link-color` | `currentColor` | link colour |
| `--metadata-link-decoration` | `underline` | link `text-decoration` |
| `--metadata-image-width` | `100%` | `max-width` of an image value |
| `--metadata-title-size` | `1.25rem` | section heading font size |
| `--metadata-cell-padding` | `0.5rem 0.75rem` | padding of a table cell |
| `--metadata-table-border` | `1px solid currentColor` | `border-bottom` of a table row |
| `--metadata-table-label-width` | `30%` | width of the table's label column |

Example, a quiet fact box:

```css
:root {
  --metadata-label-color: var(--my-muted-color);
  --metadata-table-border: 1px solid var(--my-rule-color);
  --metadata-table-label-width: 25%;
}
```

Notes:

- The padding defaults to `0` because the editor's block wrapper already
  pads a block with a background colour.
- A text value keeps its line breaks (`white-space: pre-line`).
- The blocks set no focus outline, so your own `:focus-visible` style
  reaches the links and the tags.
- A tag is an outlined pill with no hover rule of its own, so your link
  hover reaches it.

Adding a property is a minor release. Removing or renaming a property, or
changing a default, is a breaking change.

## Using the blocks in Aurora

The editor half lives in `bundle-src/` as the npm package
`@derico/aurora-metadata-block` (not yet published). It registers both
blocks and their sidebar widgets through the usual `install(config)` entry
point and uses only upstream Aurora widgets.

- **The Python package must still be installed on the backend.** The React
  `view`s read the `catalog` the server injects, and the sidebar's field
  select is filled from it. Without it the blocks render empty roots.
- **Inline editing works,** except for related items: Aurora's own
  `object_browser` needs a router loader the canvas does not provide.
- **The editor preview of a new block is anonymous.** The fallback fetch of
  `@metadata-catalog` is a plain same-origin `fetch`. Under Blicca the
  session cookie authenticates it. In Aurora the API token does not reach
  it, so a private page previews nothing until the block is saved and
  reloaded.
- **Bring your own styling.** The stylesheet is scoped to the Blicca roots
  and does not apply in an Aurora frontend.

## Development

The JavaScript build output is committed into
`src/derico/blicca/metadatablock/static/`. Rebuild and commit it whenever
`bundle-src/src/` changes.

```bash
cd bundle-src
pnpm install
pnpm build        # writes ../src/derico/blicca/metadatablock/static/metadata-block.{js,css}
pnpm test         # reads the built bundle, so build first
pnpm typecheck
```

```bash
uv run --extra test pytest
```

`test/seam-lockstep.test.ts` checks that the property table in this README
matches the stylesheet literally, so keep the two in step.

Every change to a GenericSetup profile XML file needs an upgrade step, even
in an alpha release. Scaffold it with `plonecli add upgrade_step`.

## License

GPL-2.0-or-later

## Author

Maik Derstappen, [derico](https://derico.de), <md@derico.de>
