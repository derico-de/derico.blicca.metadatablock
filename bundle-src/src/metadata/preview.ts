/**
 * What the canvas previews: the node plus whatever catalog the canvas has,
 * with every bound field kept live from the form atom. Shared by both edit
 * components, which also draw the inline controls (`renderInput`).
 */
import { useCatalog, type CatalogState } from './catalog-source';
import type { Entry, Row } from './data';
import { FieldInput } from './FieldInput';
import { useLiveRows } from './form-fields';
import { createElement, type ReactNode } from 'react';

export function usePreviewCatalog<T extends { catalog?: unknown }>(
  data: T,
): { preview: T; state: CatalogState; rows: Row[] | null } {
  const { catalog, state } = useCatalog(data);
  const rows = useLiveRows(catalog);
  const preview = rows ? { ...data, catalog: rows } : data;
  return { preview, state, rows };
}

/** The inline control for an editable entry, or `null` for one the canvas only shows. */
export function renderInput(entry: Entry, placeholder = ''): ReactNode {
  return entry.input ? createElement(FieldInput, { entry, placeholder }) : null;
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

export const INLINE_HINT =
  'Previewed as you: text fields are typed here and saved with the page; every other field is edited on the Content tab.';
