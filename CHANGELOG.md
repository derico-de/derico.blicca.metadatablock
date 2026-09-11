# Changelog

## 1.0.0a1 (unreleased)

- The uninstall and upgrade profiles are out of the Add-ons control panel
  again. `HiddenProfiles` named them all along, but the `INonInstallable`
  utility was never registered in `configure.zcml` — and the panel (and
  `GET /@addons`) only ever sees the class through that registration, so the
  list was inert and `derico.blicca.metadatablock.upgrades` was offered as an installable
  add-on of its own. Installing an upgrade profile by hand imports its XML
  without moving the recorded profile version, leaving the site behind what it
  actually has. The test reads the list out of the utility registry now,
  where the control panel reads it, instead of instantiating the class — which
  is why it stayed green through all of this.

- **Show in view** is a setting of BOTH blocks, on by default. The Metadata
  Section block now takes it too: off, the section publishes nothing at all
  — not the root, so the wrapper drops its band with it, in either layout —
  while the editor draws it as always, with every inline control it had, so
  a group of fields the theme already renders elsewhere can be edited in the
  blocks area without appearing there twice. It hides the whole block, never
  one of its fields: which fields a section shows is what its field list is
  for. The sidebar says when a section is hidden.
- The Metadata block takes **Show in view**, on by default. Off, the block
  publishes nothing at all — not the root, so the wrapper drops its band
  with it — while the editor draws it as always, so a field the theme
  already renders elsewhere (the lead image above the content) can be
  edited in the blocks area without appearing there twice. Stored
  `showInView`, and the one boolean either block reads as "not false", so
  every node authored before the setting existed still renders. The
  sidebar says when a block is hidden.
- An image or file field is edited with the widget the Content tab shows,
  not a bare file input: a thumbnail of the current image at its smallest
  offered scale, its filename with type and size (`zope.size.byteDisplay`'s
  own wording), a *Remove existing image* control and a picker to replace
  it, with the accepted types under it. A picked file is previewed at once
  from the data URL the upload already produced. The three
  `nochange`/`remove`/`replace` radios are deliberately not reproduced:
  they exist because z3c.form POSTs a form, and here not touching the
  picker IS no change.

- Tags are a display kind of their own. A field whose values are keywords
  the site's catalog indexes (`subjects`, in `Subject`) now derives as
  `tags` rather than as a plain `list`: the server reduces it to one
  `{href, title}` row per keyword, each the search link Plone's own keywords
  viewlet builds, and both renderers draw them as `<a class="metadata-tag"
  rel="nofollow">` pills inside the usual list. Six new seam properties
  dress them (`--metadata-tag-padding`, `-border`, `-radius`, `-size`,
  `-color`, `-decoration`); every other list field renders as before.
- The editor's notices moved off the canvas into the block's settings
  sidebar, where they lead both forms (`metadata_notice`,
  `metadata_section_notice`). The canvas now draws the page and nothing
  else — the preview, and the inline control for a field that has one — so
  what the author edits looks like what the visitor gets. Everything the
  editor has to say about a block (a catalog still loading or lost, no field
  chosen, a field this page does not have, a field empty here and what the
  page shows meanwhile, which of a section's fields will be skipped, where
  each value is edited) is said in the panel instead, from the same live
  preview, and follows the author's typing exactly as before.
- Fields are edited in the canvas (ADR 0002), as in the Volto block. A
  catalog row now carries `input` — `line`, `text`, `number`, `boolean`,
  `select`, `tokens`, `datetime`, `date`, `relations`, `file`, or empty —
  decided on the server from the field type and the user's write
  permission, plus `raw` (the field's restapi value) and `schema` (its
  `@types` property, vocabulary terms inlined). For such a field the editor
  draws a control of its kind in place of the value, in the single block and
  in a section's rows and table cells: a bare textarea, a number or date
  input, a checkbox, a select, tag chips with suggestions, the host's date
  picker and content browser, a file upload. Each is bound to the host's
  form atom the way Aurora's title node is; editing edits the page's field,
  every Metadata block on the canvas follows at once, and Save persists it
  with the blocks (needs `plone.blicca.auroraeditor` with block add-on
  contract §1.7). Rich text, and any field the user may not write, is still
  shown as the visitor gets it and edited on the Content tab. The public
  renderers are unchanged.
- Initial release: the Metadata block (`@type: metadata`) and the Metadata
  Section block (`@type: metadataSection`) — a page's own fields shown inside
  its blocks area, one field with an optional label and placeholder, or
  several as a list or a table. Heavily inspired by
  `@eeacms/volto-metadata-block` (European Environment Agency), thank you.
  Renders under Blicca (`@@aurora-block-metadata`,
  `@@aurora-block-metadataSection`) and in Aurora proper (the React `view`s)
  from one anatomy per block and one scope-wrapped stylesheet; the catalog of
  every field, reduced to six display kinds, is derived on load by the
  server's serialization transformers, served to the canvas by
  `@metadata-catalog`, and never persisted.
