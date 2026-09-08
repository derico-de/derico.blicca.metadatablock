/**
 * What the canvas previews: the node plus whatever catalog the canvas has,
 * with every bound field kept live from the form atom. Shared by both edit
 * components, which also draw the inline controls (`renderInput`), and by
 * the sidebar's notices (`notices.ts`), so the two never disagree.
 */
import { useCatalog, type CatalogState } from './catalog-source';
import type { Entry, Row } from './data';
import { FieldControl } from './FieldControl';
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
  return entry.input ? createElement(FieldControl, { entry, placeholder }) : null;
}
