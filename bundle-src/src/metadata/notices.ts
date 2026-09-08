/**
 * What the editor has to SAY about a block — every state in which the
 * preview is not simply "what the visitor gets": a catalog still loading or
 * lost, no field chosen, a field this page does not have, a block the
 * visitor never sees at all, a field that is empty here and what the visitor
 * gets meanwhile, and where each value is edited.
 *
 * These notices used to be paragraphs on the canvas, under the block. They
 * are not any more. The canvas is the page as the visitor will read it, and
 * prose the visitor never sees does not belong in it; a notice is EDITOR
 * CHROME, so it lives where the block's other chrome lives — at the top of
 * the settings sidebar, drawn by the `metadata_notice` and
 * `metadata_section_notice` widgets. The wording is written for that place:
 * it points at the sidebar's own controls as "below", never "in the
 * sidebar", and never calls the block "here".
 *
 * Both hooks read the SAME preview the canvas draws (`usePreviewCatalog` —
 * the stored catalog or a fetched one, with every bound field live from the
 * form atom), so the sidebar cannot say a field is empty while the canvas
 * shows what the author has just typed into it.
 */
import type { CatalogState } from './catalog-source';
import {
  entry as entryOf,
  fieldSpecs,
  metadataEntry,
  rowFor,
  sectionEntries,
  showInView,
  storedField,
  type MetadataData,
  type MetadataSectionData,
} from './data';
import { hasContent } from './form-fields';
import { usePreviewCatalog } from './preview';

export const EDIT_HINT =
  'Previewed as you: the values come from this page. Edit them on the Content tab.';

export const INLINE_HINT =
  'Previewed as you: fields with a control are edited in the block and saved with the page; every other field is edited on the Content tab.';

/** The notices every state of the catalog ladder deserves, before the block's own. */
export function catalogNotices(state: CatalogState): string[] {
  if (state === 'loading') return ['Loading this page’s fields…'];
  if (state === 'failed') {
    return ['The fields could not be loaded for the preview. Save and reload the page to see them.'];
  }
  return [];
}

/** What the sidebar says about a Metadata block. */
export function useMetadataNotices(data: MetadataData): string[] {
  const { preview, state, rows } = usePreviewCatalog(data);
  const entry = metadataEntry(preview);
  const field = storedField(data);

  const notes = catalogNotices(state);
  if (notes.length) return notes;

  if (!field) {
    notes.push('Choose a field below.');
  } else if (!entry.kind) {
    notes.push(`This page has no field “${field}”, so the block renders empty.`);
  } else if (!showInView(data)) {
    // Hidden: the placeholder and the "empty here" prose are all about what
    // the page shows, and the page shows nothing.
    notes.push(
      entry.input
        ? `“${entry.title}” is edited in the block and saved with the page, and the page does not show it.`
        : `“${entry.title}” is not shown on the page. Switch “Show in view” on below to show it.`,
    );
  } else if (entry.input) {
    notes.push(
      !hasContent(entry)
        ? `“${entry.title}” is empty on this page. Type into the block to fill it in; until then the page ${
            entry.placeholder ? 'shows the placeholder' : 'renders the block empty'
          }.`
        : `“${entry.title}” is edited in the block and saved with the page.`,
    );
  } else if (entry.value === null) {
    notes.push(
      entry.placeholder
        ? `“${entry.title}” is empty on this page, so the placeholder shows.`
        : `“${entry.title}” is empty on this page, so the block renders empty.`,
    );
  } else if (rows) {
    notes.push(rows.some((row) => row.input) ? INLINE_HINT : EDIT_HINT);
  }
  return notes;
}

/**
 * What the sidebar says about a Metadata Section block. One notice is the
 * section's own — which chosen fields the public page skips because they are
 * empty or unknown here, since the page says nothing about them. An empty
 * field the author may type into is kept on the canvas (with its control)
 * and still named as skipped.
 */
export function useMetadataSectionNotices(data: MetadataSectionData): string[] {
  const { preview, state, rows } = usePreviewCatalog(data);
  const specs = fieldSpecs(data);
  const published = sectionEntries(preview);
  const typed = sectionEntries(preview, (candidate) => !!candidate.input).filter((e) => e.input);

  const notes = catalogNotices(state);
  if (notes.length) return notes;

  if (!specs.length) {
    notes.push('No fields selected yet. Add them below.');
  } else if (rows) {
    const skipped = specs
      .filter((spec) => {
        const row = rowFor(preview, spec.field);
        return !row || !hasContent(entryOf(row, spec.showLabel));
      })
      .map((spec) => rowFor(preview, spec.field)?.title || spec.field);
    if (skipped.length) {
      notes.push(`Empty on this page, so not shown: ${skipped.join(', ')}.`);
    }
    if (typed.length) notes.push(INLINE_HINT);
    else if (published.length) notes.push(EDIT_HINT);
  }
  return notes;
}
