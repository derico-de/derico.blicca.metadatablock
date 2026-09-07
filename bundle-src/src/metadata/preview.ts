/**
 * What the canvas previews: the node plus whatever catalog the canvas has,
 * with the title kept live. Shared by both edit components.
 */
import { useCatalog, type CatalogState } from './catalog-source';
import { text, type Row } from './data';
import { useLiveTitle } from './live-title';

export function usePreviewCatalog<T extends { catalog?: unknown }>(
  data: T,
): { preview: T; state: CatalogState; rows: Row[] | null } {
  const { catalog, state } = useCatalog(data);
  const liveTitle = useLiveTitle();
  let rows = catalog;
  if (rows && liveTitle !== null) {
    rows = rows.map((row) =>
      row.id === 'title' && row.kind === 'text' ? { ...row, value: text(liveTitle) } : row,
    );
  }
  const preview = rows ? { ...data, catalog: rows } : data;
  return { preview, state, rows };
}

/** The notices every state of the catalog ladder deserves, before the block's own. */
export function catalogNotices(state: CatalogState): string[] {
  if (state === 'loading') return ['Loading this page’s fields…'];
  if (state === 'failed') {
    return ['The fields could not be loaded for the preview. Save and reload the page to see them.'];
  }
  return [];
}

export const EDIT_HINT =
  'Previewed as you: the values come from this page. Edit them on the Content tab.';
