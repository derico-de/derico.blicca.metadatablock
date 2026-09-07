/**
 * The `edit` half of the Metadata Section block. See `MetadataEdit.tsx`;
 * the section adds one notice of its own — which chosen fields were skipped
 * because they are empty or unknown here, since the public page says
 * nothing about them.
 */
import { fieldSpecs, rowFor, sectionEntries, type MetadataSectionData } from './data';
import MetadataSectionView from './MetadataSectionView';
import { catalogNotices, EDIT_HINT, usePreviewCatalog } from './preview';

export type MetadataSectionEditProps = {
  data?: MetadataSectionData;
};

export function MetadataSectionEdit(props: MetadataSectionEditProps) {
  const data = props.data ?? {};
  const { preview, state, rows } = usePreviewCatalog(data);
  const specs = fieldSpecs(data);
  const shown = sectionEntries(preview).length;

  const notes = catalogNotices(state);
  if (!notes.length) {
    if (!specs.length) {
      notes.push('No fields selected. Add fields in the sidebar.');
    } else if (rows) {
      const skipped = specs
        .map((spec) => rowFor(preview, spec.field)?.title || spec.field)
        .filter((_title, index) => {
          const row = rowFor(preview, specs[index].field);
          return !row || sectionEntries({ ...preview, fields: [specs[index]] }).length === 0;
        });
      if (skipped.length) {
        notes.push(`Empty here, so not shown: ${skipped.join(', ')}.`);
      }
      if (shown) notes.push(EDIT_HINT);
    }
  }

  return (
    <>
      <MetadataSectionView data={preview} isEditMode />
      {notes.map((note) => (
        <p key={note} className="metadata-notice" contentEditable={false}>
          {note}
        </p>
      ))}
    </>
  );
}

export default MetadataSectionEdit;
