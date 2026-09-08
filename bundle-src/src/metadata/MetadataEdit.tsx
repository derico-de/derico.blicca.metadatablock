/**
 * The `edit` half of the Metadata block: the canvas is a live preview, and
 * for a plain text field, the place the field is typed (ADR 0002).
 *
 * Every SETTING is edited in the sidebar. Every VALUE is the content item's
 * own: a field the server marked editable (`input`) gets an inline control
 * of its kind (`FieldControl`) bound to the host's form atom, so editing it
 * edits the page's field and Save persists it; every other field is shown
 * as the visitor gets it and edited on the classic Content tab. What the canvas adds is HONESTY: the preview
 * is drawn from whatever catalog the canvas has (`useCatalog` — the
 * server's, or a fetched one for a never-serialized node), and every state
 * in which the preview is not simply "what the visitor gets" is announced,
 * outside the block root and `contentEditable={false}`.
 */
import { metadataEntry, storedField, type MetadataData } from './data';
import { hasContent } from './form-fields';
import MetadataView from './MetadataView';
import { catalogNotices, EDIT_HINT, INLINE_HINT, renderInput, usePreviewCatalog } from './preview';

export type MetadataEditProps = {
  data?: MetadataData;
};

export function MetadataEdit(props: MetadataEditProps) {
  const data = props.data ?? {};
  const { preview, state, rows } = usePreviewCatalog(data);
  const entry = metadataEntry(preview);
  const field = storedField(data);

  const notes = catalogNotices(state);
  if (!notes.length) {
    if (!field) {
      notes.push('Choose a field in the sidebar.');
    } else if (!entry.kind) {
      notes.push(`This page has no field “${field}”, so the block renders empty.`);
    } else if (entry.input) {
      notes.push(
        !hasContent(entry)
          ? `“${entry.title}” is empty here — fill it in. Until then the page ${
              entry.placeholder ? 'shows the placeholder' : 'renders the block empty'
            }.`
          : `“${entry.title}” is edited here and saved with the page.`,
      );
    } else if (entry.value === null) {
      notes.push(
        entry.placeholder
          ? `“${entry.title}” is empty here, so the placeholder shows.`
          : `“${entry.title}” is empty here, so the block renders empty.`,
      );
    } else if (rows) {
      notes.push(rows.some((row) => row.input) ? INLINE_HINT : EDIT_HINT);
    }
  }

  return (
    <>
      <MetadataView data={preview} isEditMode renderInput={renderInput} />
      {notes.map((note) => (
        <p key={note} className="metadata-notice" contentEditable={false}>
          {note}
        </p>
      ))}
    </>
  );
}

export default MetadataEdit;
