/**
 * The `edit` half of the Metadata Section block. See `MetadataEdit.tsx`: a
 * live preview and nothing else, with the inline control of its kind where
 * a field the server marked editable goes — an empty one of those is kept
 * on the canvas so it can be filled in, though the public page skips it.
 *
 * What the editor has to say about any of that — including which chosen
 * fields the page skips — is said in the settings sidebar (`notices.ts`).
 */
import MetadataSectionView from './MetadataSectionView';
import type { MetadataSectionData } from './data';
import { renderInput, usePreviewCatalog } from './preview';

export type MetadataSectionEditProps = {
  data?: MetadataSectionData;
};

export function MetadataSectionEdit(props: MetadataSectionEditProps) {
  const { preview } = usePreviewCatalog(props.data ?? {});
  return <MetadataSectionView data={preview} isEditMode renderInput={renderInput} />;
}

export default MetadataSectionEdit;
