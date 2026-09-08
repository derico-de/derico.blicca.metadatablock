# Fields are edited in the canvas, through the host's form atom

ADR 0001 decided that the blocks show fields and do not edit them, and named
the reason: Blicca's editor persisted exactly `{title, blocks, blocks_layout}`,
so an inline-editing block "would need a wrapper change to widen the save
body, or its own PATCH". It called inline editing a deferral, not a veto.
`@eeacms/volto-metadata-block`, which this package follows, edits every
field inline with the field's own Volto widget; showing without editing was
the worse half of that experience, and the wrapper change was small. This
ADR lifts the deferral for every field type the Volto block edits.

## What changed in the host

`plone.blicca.auroraeditor` now sends, besides the three contract keys,
every other top-level field of its form atom whose value differs from the
content the editor was mounted with (its ADR 0016, block add-on contract
§1.7). The form atom is the same one Aurora's title node writes through
`useFieldFocusedAtom`, and `@plone/helpers` — a promised facade — exports
that hook. A block that binds a field through it edits the page, and Save
persists the edit with the blocks.

## Decisions

**Which fields, and with what.** The server decides, per row, as it already
decides the kind and the read permission: a catalog row carries `input`,
one of `metadata_data.INPUTS` — `line` (a text line), `text` (multi-line
text), `number`, `boolean`, `select` (a choice), `tokens` (tags and
multi-choice), `datetime`, `date`, `relations`, `file` (an image or file
upload) — or `""`. Decided from the zope.schema interface, most specific
first, like the kind. Rich text is the one type left out: it is Plate's
business, and Blicca moves it into the blocks anyway. A `readonly` field is
never offered. On top of the type, `input` requires what the content PATCH
will require: `Modify portal content` on the object and the field's own
write permission where the schema tags one — the two gates
`plone.restapi`'s deserializer applies. A row a user may read but not write
is shown exactly as before.

**What a control needs travels on the row.** An editable row also carries
`raw` — the field's restapi value, the shape the PATCH takes back — and
`schema`, the field's `@types` property, with its vocabulary's terms
inlined as `choices` (`[[token, title], …]`) for a select and a token
control, and `additionalItems` saying whether tokens outside the terms are
allowed. For tags the first item of a pair is the term's *value* (the tag
itself), because the keywords vocabulary's tokens are base64 and a text
field stores the value. A vocabulary of more than `MAX_TERMS` is not
inlined, and a select without terms is not offered. Both keys are absent on
a shown-only row, so the catalog of a visitor grows by nothing.

**The control shows the atom's value itself.** ADR 0001's rule that no
display value is derived in the browser stands: a text control's raw value
is its display value; every other control (a date picker, chips, a select)
*is* the preview while the field is editable, as in Volto. The value
element is emitted for an empty field too, so there is something to edit,
and a section keeps an empty editable field the public page would skip.

**Host widgets where the host has the better control.** `datetime` and
`date` use the host's `datetime` widget (Aurora's DateTimePicker, day-
granular for a date); `relations` uses the host's `object_browser` (Aurora's,
or Blicca's pat-contentbrowser substitute), adding to a removable list of
the current items. Everything else is a native element dressed to blend
into the block, which also keeps the bundle free of anything unpromised.
Where a host widget is absent, a date falls back to a native input and
relations say the host has no picker.

**Every control writes the PATCH's shape.** A token for a choice, `string[]`
for tags and multi-choice, `true`/`false`, a number or `null`, an ISO
string or `null`, `[{ '@id', title }]` rows (or one, or `null`) for
relations, `{ data, encoding: 'base64', filename, 'content-type' }` or
`null` for an upload. `pickSaveBody` sends the value as written; nothing
translates on the way out.

**Events stop at the control.** A ploneBlock is a Plate void with
`contentEditable={false}`; a native control inside it takes focus and text
normally, but its key events still bubble to Plate's plugin handlers, where
Enter inserts a paragraph after the block, arrows move between blocks and
Backspace on a selected block removes it. One wrapper stops keyboard and
clipboard events for every control — host widgets and their portalled
popovers included, since React bubbles through portals — and lets mouse
events through, so a click still selects the block and opens its sidebar.

**One value, everywhere it shows.** Every control edits the atom, so a tag
added in the single block appears at once in a section's table cell, and a
title typed into a table cell reaches the title node above — the title
node's own binding carries it back. The title row is previewed live even
for a user who may not type it (ADR 0001's live title, kept).

## Consequences

- ADR 0001's "Editing" section is superseded; its "Formatting" section and
  everything about the catalog stand. The Content tab remains where rich
  text and any field the user may not write are edited, and the notices
  say which is which.
- A field surface (the footer) shows the controls but does not persist a
  bound field — its save service stores only the blocks container. Accepted
  as the contract states it.
- In Aurora proper the blocks bind the same atom (`@plone/cmsui` registers
  the `formAtom` utility) and Aurora's own form persists every field, so
  inline editing works there without the Blicca wrapper.
- A rejected field (validation) fails the whole save, as on the Content
  tab; the block offers no field the PATCH would refuse on permission.
- Inline editing in Aurora proper has one gap the Blicca surface does not:
  Aurora's `object_browser` calls a router loader and cannot be mounted
  here, so the relations control is verified under Blicca only.
- `input` is a fourth parity table (`INPUTS`), held level by
  `test_metadata_data.TestParity`.
