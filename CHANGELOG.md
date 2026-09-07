# Changelog

## 1.0.0a1 (unreleased)

- Plain text fields are typed in the canvas (ADR 0002). A catalog row now
  carries `input` — `line` for a text line, `text` for multi-line text, or
  empty — decided on the server from the field type and the user's write
  permission. For such a field the editor draws a bare `<textarea>` in place
  of the value, in the single block and in a section's rows and table cells,
  bound to the host's form atom the way Aurora's title node is; typing edits
  the page's field, every Metadata block on the canvas follows at once, and
  Save persists it with the blocks (needs `plone.blicca.auroraeditor` with
  block add-on contract §1.7). Every other field is still shown as the
  visitor gets it and edited on the Content tab. The public renderers are
  unchanged.
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
