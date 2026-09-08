/**
 * The `edit` half of the Metadata Section block. See `MetadataEdit.tsx`;
 * the section adds one notice of its own — which chosen fields the public
 * page skips because they are empty or unknown here, since the page says
 * nothing about them. An empty field the author may type into is kept on
 * the canvas (with its control) and still named as skipped.
 */
import { entry as entryOf, fieldSpecs, rowFor, sectionEntries, type MetadataSectionData } from './data';
import { hasContent } from './form-fields';
import MetadataSectionView from './MetadataSectionView';
import { catalogNotices, EDIT_HINT, INLINE_HINT, renderInput, usePreviewCatalog } from './preview';

export type MetadataSectionEditProps = {
  data?: MetadataSectionData;
};

export function MetadataSectionEdit(props: MetadataSectionEditProps) {
  const data = props.data ?? {};
  const { preview, state, rows } = usePreviewCatalog(data);
  const specs = fieldSpecs(data);
  const published = sectionEntries(preview);
  const typed = sectionEntries(preview, (candidate) => !!candidate.input).filter((e) => e.input);

  const notes = catalogNotices(state);
  if (!notes.length) {
    if (!specs.length) {
      notes.push('No fields selected. Add fields in the sidebar.');
    } else if (rows) {
      const skipped = specs
        .filter((spec) => {
          const row = rowFor(preview, spec.field);
          return !row || !hasContent(entryOf(row, spec.showLabel));
        })
        .map((spec) => rowFor(preview, spec.field)?.title || spec.field);
      if (skipped.length) {
        notes.push(`Empty here, so not shown on the page: ${skipped.join(', ')}.`);
      }
      if (typed.length) notes.push(INLINE_HINT);
      else if (published.length) notes.push(EDIT_HINT);
    }
  }

  return (
    <>
      <MetadataSectionView data={preview} isEditMode renderInput={renderInput} />
      {notes.map((note) => (
        <p key={note} className="metadata-notice" contentEditable={false}>
          {note}
        </p>
      ))}
    </>
  );
}

export default MetadataSectionEdit;
