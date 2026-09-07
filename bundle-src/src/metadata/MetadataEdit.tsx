/**
 * The `edit` half of the Metadata block: the canvas is a live preview, never
 * an editing surface.
 *
 * Every setting is edited in the sidebar; every VALUE is the content item's
 * own and is edited on the classic Content tab (the title in the canvas's
 * title node). The block is a Plate VOID node, so there is nothing to type
 * into. What the canvas adds is HONESTY: the preview is drawn from whatever
 * catalog the canvas has (`useCatalog` — the server's, or a fetched one for
 * a never-serialized node), and every state in which the preview is not
 * simply "what the visitor gets" is announced, outside the block root and
 * `contentEditable={false}`.
 */
import { metadataEntry, storedField, type MetadataData } from './data';
import MetadataView from './MetadataView';
import { catalogNotices, EDIT_HINT, usePreviewCatalog } from './preview';

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
    } else if (entry.value === null) {
      notes.push(
        entry.placeholder
          ? `“${entry.title}” is empty here, so the placeholder shows.`
          : `“${entry.title}” is empty here, so the block renders empty.`,
      );
    } else if (rows) {
      notes.push(EDIT_HINT);
    }
  }

  return (
    <>
      <MetadataView data={preview} isEditMode />
      {notes.map((note) => (
        <p key={note} className="metadata-notice" contentEditable={false}>
          {note}
        </p>
      ))}
    </>
  );
}

export default MetadataEdit;
