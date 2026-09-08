/**
 * The `edit` half of the Metadata block: the canvas is a live preview, and
 * for a plain text field, the place the field is typed (ADR 0002).
 *
 * Every SETTING is edited in the sidebar. Every VALUE is the content item's
 * own: a field the server marked editable (`input`) gets an inline control
 * of its kind (`FieldControl`) bound to the host's form atom, so editing it
 * edits the page's field and Save persists it; every other field is shown
 * as the visitor gets it and edited on the classic Content tab.
 *
 * The canvas draws THAT AND NOTHING ELSE. The preview is drawn from whatever
 * catalog the canvas has (`useCatalog` — the server's, or a fetched one for
 * a never-serialized node), and every state in which it is not simply "what
 * the visitor gets" is announced in the settings sidebar instead
 * (`notices.ts`), so what the author sees on the page is the page.
 */
import MetadataView from './MetadataView';
import type { MetadataData } from './data';
import { renderInput, usePreviewCatalog } from './preview';

export type MetadataEditProps = {
  data?: MetadataData;
};

export function MetadataEdit(props: MetadataEditProps) {
  const { preview } = usePreviewCatalog(props.data ?? {});
  return <MetadataView data={preview} isEditMode renderInput={renderInput} />;
}

export default MetadataEdit;
