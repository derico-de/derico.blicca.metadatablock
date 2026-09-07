# Changelog

## 1.0.0a1 (unreleased)

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
