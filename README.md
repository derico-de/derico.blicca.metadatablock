# derico.blicca.metadatablock

Two **Metadata blocks** for the Aurora block editor in Plone 6. They show a
page's own fields inside its blocks area: the title, the description, the
tags, the dates, the lead image, the related items, or any other field of the
content type. The **Metadata** block shows one field; the **Metadata section**
block shows several, as a list or as a table.

Typical uses:

- a "Last modified" line at the bottom of an article;
- the tags of a page, shown where the layout wants them rather than in the
  theme's fixed spot;
- a fact box: event dates, contact, state, related pages, in one table;
- an author box built from the ownership fields.

The blocks work with [plone.blicca.auroraeditor](https://github.com/derico-de/plone.blicca.auroraeditor),
which brings the Aurora editor and server-side rendering of Aurora blocks to
classic Plone 6. The editor half is also a plain Aurora block package
(`@derico/aurora-metadata-block`) that can be used in an Aurora frontend
directly, see [Using the blocks in Aurora](#using-the-blocks-in-aurora).

## Inspired by volto-metadata-block

This package is heavily inspired by
[`@eeacms/volto-metadata-block`](https://github.com/eea/volto-metadata-block)
by the European Environment Agency: the same two blocks, the same block ids
(`metadata` and `metadataSection`), the same idea of a "field" block and a
"section" of fields with per-field labels and a list or table layout. Thank
you, EEA, for showing how metadata belongs in the blocks area.

Two things are different on purpose, because the hosts are different. In
Volto every field is edited inline with its Volto widget; here every field
type the Volto block edits gets a control of its kind in the canvas — rich
text excepted, which Blicca keeps in the blocks — while a field the user may
not write is *shown* and edited where Blicca edits every non-block field, on
the Content tab. And no field is formatted in the browser: the server reduces
every field to one of seven display kinds, so both renderers know seven
shapes and no field types.

## Features

- **Any field of the page.** Every field of the content type and its
  behaviors that the current user may read, plus created, modified and the
  workflow state. Chosen in the sidebar from a select filled with the page's
  own fields.
- **Seven display kinds.** Text (titles, descriptions, numbers, dates and
  booleans formatted for the request's locale, choice titles), rich text,
  lists (multi-choice), tags (the page's keywords, each a pill linking to a
  search for it, as Plone's own keywords viewlet renders them), links
  (relations), an image (the lead image, as a scale) and a file (a download
  link).
- **Labels, placeholders, layouts.** Each field can show its title as a
  label. The single block can show a placeholder when the field is empty.
  The section renders as a stack of fields or as a two-column table.
- **Always current.** Values are not stored with the block. They are
  derived on every page load from the page itself, for the current user,
  and never written back.
- **Fields are edited in place.** Every field the author may write gets a
  control of its kind where its value goes, in the single block and in a
  section's rows and table cells: a bare text control for the title or the
  description, a number or date input, a checkbox, a select over the
  field's terms, tag chips with suggestions, the host's date picker and
  content browser for related items, a file upload for the lead image.
  Editing edits the page's field, every Metadata block on the canvas
  follows at once (so does the title node), and Save stores it with the
  blocks. Rich text and fields the author may not write are edited on the
  Content tab, and the canvas says which is which.
- **Live preview in the editor.** A freshly inserted block previews the
  page's fields before it is ever saved, tells the author which chosen
  fields are empty here, and follows every field typed on the canvas.
- **Same markup on every surface.** The public page, the editor canvas and
  an Aurora frontend all render the same HTML, dressed by one stylesheet.
- **Themeable through CSS custom properties.** Twenty-one `--metadata-*`
  properties control rhythm, labels, tags, links, images and the table.
- **Block width and background** come from the host's regular block styling
  controls.

## Requirements

- Plone 6.0 or later
- `plone.blicca.auroraeditor` 1.0.0a2 or later; inline editing needs a
  wrapper that sends canvas-edited fields with the save (block add-on
  contract §1.7)

The JavaScript bundle is committed to the package. Nothing needs Node at
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
panel, or apply the `derico.blicca.metadatablock:default` GenericSetup
profile. The profile registers both blocks with the Aurora editor for that
site. Uninstalling removes the registrations again.

## Using the blocks

**Metadata** — one field:

1. Open a page in the Aurora editor and insert the **Metadata** block.
2. In the sidebar, choose the **Field** from the page's fields.
3. Tick **Show label** to put the field's title above its value.
4. Optionally enter a **Placeholder**, shown when the field is empty on
   this page.

**Metadata section** — several fields:

1. Insert the **Metadata section** block.
2. Optionally enter a **Heading**.
3. Choose the **Layout**: *List* stacks the fields, *Table* puts one field
   per row with its title in the first column.
4. Under **Fields**, add the fields to show, in order, each with its own
   *Show label* switch (in the table layout the title is always shown).

Both blocks take a block width and, if the theme offers one, a background
colour.

Only the choices are stored with the page. The values come from the page on
every load; the canvas previews them as *you* see them, and a field the
current user may not read is not offered. A field that is empty on the page
renders nothing (or the placeholder, for the single block); in a section it
is skipped, and the canvas says so.

Every field you may write can be edited right in the block: the canvas
draws a control of its kind where the value goes — a text control (an
empty one shows the placeholder, or the field's title), a number or date
input, a checkbox, a select, tag chips (type a tag and press Enter; the
page's existing tags are suggested), a list of related items with the
content browser to add more, a file upload. What you edit is the page's
field, so a section that shows the same field updates at once, and so does
the title at the top of the canvas. Save stores it together with the
blocks. Rich text, and fields you may not write, are shown as the visitor
gets them and edited on the **Content** tab.

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

- The roots are always emitted. The single block's root carries the chosen
  field as `has--field--<id>` and, once the page's catalog knows the field,
  its kind as `has--kind--<kind>`.
- Everything inside is left out when it has nothing to show.
- The block width and background classes are added by the host on a wrapper
  around this markup, as for every Aurora block.

## How it works

The blocks store which fields to show and how, and nothing else. The values
come from the server:

1. On every load of a page, a `plone.restapi` block serialization
   transformer derives the page's **catalog** — every field the current user
   may read, as `{id, title, kind, value, input}` rows in schema order, the
   value already reduced to its display kind and formatted for the request's
   locale, and `input` naming the inline control the canvas draws (`line`,
   `text`, `number`, `boolean`, `select`, `tokens`, `datetime`, `date`,
   `relations`, `file`, or empty — decided from the field type and the
   user's write permission; an editable row also carries `raw`, the
   field's restapi value, and `schema`, its `@types` property with the
   vocabulary's terms inlined) — and injects it into the block data as
   `catalog`.
2. On save, a matching deserialization transformer strips `catalog` again,
   so it is never written to the database and can never go stale.
3. The renderers read the chosen fields out of the catalog and print them.
   They format nothing themselves.

The whole catalog is injected rather than only the chosen fields. This keeps
the derived data independent of the stored choices, so picking a field in
the sidebar updates the preview instantly, and it is what fills the sidebar's
field select. Every Metadata block on a page shares one derivation per
request.

A freshly inserted block has no catalog yet. The editor canvas fetches one
from the page's `@metadata-catalog` REST endpoint, which this package adds
and which returns exactly what the transformer injects, once per page load,
and previews from that.

Inline editing rides the host's own machinery: the canvas binds each
editable field to the editor's form atom with the same `useFieldFocusedAtom`
hook Aurora's title node uses, and the Blicca wrapper's save carries every
field of that atom the canvas changed next to the blocks (block add-on
contract §1.7). Each control sits in a `<div class="metadata-control">`
inside the value element and writes the shape the content PATCH takes back
(a token, a list of tags, an ISO date, `{ '@id' }` rows, a base64 upload);
the wrapper stops keyboard and clipboard events so the editor's own
handlers never see them. Dates use the host's `datetime` widget and related
items the host's `object_browser`; everything else is a native element. The
public page never carries any of it.

The transformers are registered for content with the `IBlocks` behavior and
for the site root, so a block stored on the site root (a footer) shows the
site root's fields on every page.

There are two renderers per block that produce the same markup: a Chameleon
template, registered as the `@@aurora-block-metadata` and
`@@aurora-block-metadataSection` views, for the public page rendered by
Blicca; and a React `view` component, used for the preview in the editor
canvas and for the public rendering in an Aurora frontend. One
`@scope`-wrapped stylesheet styles both. A shared fixture file,
`tests/anatomy-cases.json`, is read by the Python test suite and the vitest
suite alike, so the renderers cannot drift apart unnoticed.

Link and image URLs are screened against an allowlist of schemes (`http`,
`https`, `mailto`, `tel`, or a plain path), because the block data travels
inside JSON that anyone with API access can write. Rich text is emitted as
HTML: it is the field's own output transform, and a hand-authored catalog is
replaced by the server's on every load.

## Theming

The blocks are styled through twenty-one CSS custom properties. Set them on
`:root` or on your theme's own scope root, where they inherit into the
blocks. Do not set them on `.metadata-block` itself and do not override the
blocks' rules directly: the stylesheet is `@scope`-wrapped, and a scoped
declaration wins over an unscoped one of equal specificity.

The blocks declare none of these properties. Every default is spelled at its
point of use as `var(--metadata-x, <default>)`, so a value set on `:root`
inherits in and wins without any specificity games.

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

- The padding defaults to `0` because the host's background band already
  pads the block.
- A text value keeps its line breaks (`white-space: pre-line`), so a
  multi-line description renders as written.
- The blocks set no focus outline, so the host's own `:focus-visible` style
  reaches the links and the tags.
- A tag is an outlined pill rather than an underlined link, the anatomy of
  Plone's keywords viewlet in the blocks' own classes. It carries no hover
  rule of its own, so the theme's link hover reaches it.

Versioning of this interface: adding a property is a minor release. Removing
or renaming a property, or changing a default, is a breaking change.

## Using the blocks in Aurora

The editor half lives in `bundle-src/` as the npm package
`@derico/aurora-metadata-block` (not yet published). It registers both
blocks and their four sidebar widgets through the usual `install(config)`
entry point and uses only upstream Aurora widgets besides, so it works
without the Blicca wrapper.

Things to know when using it in an Aurora frontend:

- **The Python package must still be installed on the backend.** The React
  `view`s read the `catalog` the server injects, and the sidebar's field
  select is filled from it. Without the backend add-on the blocks render
  their empty roots.
- **Inline editing works.** The blocks bind the `formAtom` utility
  `@plone/cmsui` registers, and Aurora's form persists every field. Related
  items are the exception: Aurora's own `object_browser` needs a router
  loader the canvas does not provide, so that control is proven under
  Blicca only.
- **The editor preview of a new block is anonymous.** The fallback fetch of
  `@metadata-catalog` is a plain same-origin `fetch`. Under Blicca the
  session cookie authenticates it. In Aurora the API token does not reach
  it, so a private page previews nothing until the block is saved and
  reloaded.
- **Bring your own styling.** The stylesheet is scoped to the Blicca roots
  and does not apply in an Aurora frontend.

## Development

The package has a Python half and a JavaScript half. The JavaScript build
output is committed into `src/derico/blicca/metadatablock/static/`; rebuild
and commit it whenever the sources in `bundle-src/src/` change.

```bash
# JavaScript: the blocks, their widgets and the stylesheet
cd bundle-src
pnpm install
pnpm build        # writes ../src/derico/blicca/metadatablock/static/metadata-block.{js,css}
pnpm test         # the tests read the built bundle, so build first
pnpm typecheck
```

```bash
# Python, from an environment that has the test extras installed
uv run pytest
```

The JavaScript tests run the blocks against the real Aurora registry, built
by the upstream Aurora installers pinned as dev dependencies. Among them,
`test/seam-lockstep.test.ts` checks that the property table in this README
matches the stylesheet literally, so keep the two in step.

Every change to a GenericSetup profile XML file needs an upgrade step, even
in an alpha release. Scaffold it with `plonecli add upgrade_step`.

## License

GPL-2.0-or-later

## Author

Maik Derstappen, [derico](https://derico.de), <md@derico.de>
