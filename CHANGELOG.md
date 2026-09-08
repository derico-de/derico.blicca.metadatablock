# Changelog

## 1.0.0a1 (unreleased)

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
