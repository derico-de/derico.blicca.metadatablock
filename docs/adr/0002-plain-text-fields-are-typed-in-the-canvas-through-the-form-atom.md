# Plain text fields are typed in the canvas, through the host's form atom

ADR 0001 decided that the blocks show fields and do not edit them, and named
the reason: Blicca's editor persisted exactly `{title, blocks, blocks_layout}`,
so an inline-editing block "would need a wrapper change to widen the save
body, or its own PATCH". It called inline editing a deferral, not a veto.
For a block whose whole point is a page's description shown where the layout
wants it, showing without typing was the worse half of the Volto experience
this package set out to match, and the wrapper change was small. This ADR
lifts the deferral for the fields it can be lifted for.

## What changed in the host

`plone.blicca.auroraeditor` now sends, besides the three contract keys,
every other top-level field of its form atom whose value differs from the
content the editor was mounted with (its ADR 0016, block add-on contract
§1.7). The form atom is the same one Aurora's title node writes through
`useFieldFocusedAtom`, and `@plone/helpers` — a promised facade — exports
that hook. A block that binds a field through it edits the page, and Save
persists the edit with the blocks.

## Decisions

**Which fields.** The server decides, per row, as it already decides the
kind and the read permission: a catalog row carries `input`, one of `line`
(a `TextLine`), `text` (a `Text`) or `""`. Only plain prose qualifies — a
URI, a password, an identifier or ASCII data is a text line that is not
prose, and rich text is Plate's business, not a textarea's. A `readonly`
field is never offered. On top of the type, `input` requires what the
content PATCH will require: `Modify portal content` on the object and the
field's own write permission where the schema tags one — the two gates
`plone.restapi`'s deserializer applies. A row a user may read but not write
is shown exactly as before.

**Where the control sits.** In the value element, in place of the value:
`<div class="metadata-value metadata-value--text"><textarea
class="metadata-input"></textarea></div>`, in the single block and in a
section's list rows and table cells alike. The anatomy outside it is
untouched, so the published page and the canvas differ by one element, the
way a Plate paragraph differs from its rendered `<p>`. The public renderers
never draw it: the `view` gets no `renderInput`, the template has no twin,
and `test_view_*` and the vitest suite hold that line.

**A textarea for both shapes.** A title must wrap like the heading it will
become, and an `<input>` cannot; a `line` control folds newlines to a space
and swallows Enter instead. The control grows with its text
(`field-sizing: content`, with a `scrollHeight` fallback).

**Events stop at the control.** A ploneBlock is a Plate void with
`contentEditable={false}`; a native control inside it takes focus and text
normally, but its key events still bubble to Plate's plugin handlers, where
Enter inserts a paragraph after the block and Backspace on a selected block
removes it. The control stops keyboard and clipboard events at itself and
lets mouse events through, so a click still selects the block and opens its
sidebar. Verified in the browser: Enter inside a description adds a line
and no paragraph; Backspace deletes a character and no block.

**One value, everywhere it shows.** Every bound row is previewed from the
form atom, not the loaded catalog, so a description typed into the single
block appears at once in a section's table cell, and a title typed into a
table cell appears in the title node above — the title node's own binding
carries it back. The title row is bound even for a user who may not type it
(ADR 0001's live title, kept).

**An empty editable field stays on the canvas.** The public page skips an
empty field in a section; the canvas keeps it, with its control, so the
section can be filled in place — the one departure `sectionEntries` takes
from its Python twin, on an argument only the editor passes. The notice
still names it as not shown on the page.

## Consequences

- ADR 0001's "Editing" section is superseded for `line` and `text` fields;
  its "Formatting" section and everything about the catalog stand. The
  Content tab remains where every other field is edited, and the notices
  say which is which.
- A field surface (the footer) shows the controls but does not persist a
  bound field — its save service stores only the blocks container. Accepted
  as the contract states it; a footer's carrier is the site root, whose
  title and description are not what a footer editor is there to change.
- In Aurora proper the blocks bind the same atom (`@plone/cmsui` registers
  the `formAtom` utility) and Aurora's own form persists every field, so
  inline editing works there without the Blicca wrapper.
- A rejected field (validation) fails the whole save, as on the Content
  tab; the block offers no field the PATCH would refuse on permission.
- `input` is a fourth parity table (`INPUTS`), held level by
  `test_metadata_data.TestParity`.
