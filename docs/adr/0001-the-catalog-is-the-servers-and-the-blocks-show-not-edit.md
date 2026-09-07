# The catalog is the server's, and the blocks show fields rather than edit them

`@eeacms/volto-metadata-block`, which this package follows, does two things
its host lets it do: it *edits* the chosen field inline (Volto passes every
block `properties` and `onChangeField`, and its form persists any field) and
it *formats* the value in the browser through Volto's `config.widgets.views`
display-widget registry. Neither is available here, and the differences
decided the design.

## Editing

Blicca's editor persists exactly `{title, blocks, blocks_layout}`
(`wrapper/src/save/save-content.ts`); every other field is edited on the
classic Content tab (`@@edit-metadata`), by design (CONTEXT.md of
`plone.blicca.auroraeditor`). Aurora's Plate adapter hands a block `data`,
`block`, `selected` and the setters, and nothing about the content item. An
inline-editing Metadata block would therefore need a wrapper change to widen
the save body, or its own PATCH, and would still leave the Content tab as the
place the same value is edited a second way.

**Decision: the blocks show, they do not edit.** The value is edited where
the host edits it. The canvas says so under the block. The one exception is
the title, which the canvas already edits in its title node: the preview
reads it live from the host's form atom, reached through the promised
`@plone/registry` utility lookup the way Aurora's own title binding does, so
the preview never contradicts the node above it. Under the Blicca-first
doctrine, inline editing in Aurora proper is a deferral, not a veto.

## Formatting

Three designs were open for where a field's display value comes from.

1. **Each renderer formats its own.** The Chameleon template asks the
   object; the React `view` reads the content JSON off the form atom and
   formats it. Two formatters in two languages for every field type, and in
   Aurora proper a `view` that depends on a store the public page may not
   provide.
2. **The server injects the raw restapi content** as a derived key and the
   renderers format it. One source, but still two formatters, and the
   whole content JSON per block.
3. **The server derives a catalog of display values**: every offered field
   reduced to one of six kinds — text, rich text, list, links, image, file —
   with dates and booleans already localized, choices already titled,
   relations already resolved, images already scaled, permissions already
   applied; both renderers read it as data.

The blocks take the third. The renderers know six shapes and no field
types, so a new field type is a server-side change only, and the parity
fixture holds the two renderers to the same six shapes. The rows are
computed from `plone.restapi`'s field serializers, deliberately not from
`ISerializeToJson` on the whole object, which would serialize the `blocks`
field, run these very transformers inside it, and recurse.

The whole catalog is injected rather than the chosen fields' rows, so the
derived set depends on the context and the user alone, needs no provenance
stamp, makes switching fields instant, and fills the sidebar's field select.
It is derived once per request and context and shared by every Metadata
block on the page; a page of long rich-text fields pays for it once per
block in JSON size, which is accepted.

## Consequences

- A field's value on the public page is the server's rendering for the
  visitor; the canvas shows the author's. A field the visitor may not read
  is not in the visitor's catalog.
- A hand-authored `catalog` is replaced on load and stripped on save; the
  renderers still screen every link and image URL, because the key travels
  inside a JSON node anyone with API access can write. Rich text is emitted
  as HTML: on every Blicca surface it is the server's own output transform,
  and in Aurora proper without the backend add-on the `view` draws the
  empty root rather than a hand-authored catalog's HTML — the stated
  deferral, not a bug to be papered over with a client-side sanitizer.
- Adding a kind means adding it to `KINDS` on both sides (the parity test
  enforces it), a reducer branch in `metadata_catalog.py`, a template branch
  in `metadata_value.pt`, a component branch in `MetadataValue.tsx`, and a
  fixture case.
- The fallback fetch needs this package's own `@metadata-catalog` service;
  there is no upstream endpoint that answers with display values.
