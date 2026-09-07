/**
 * The Metadata Section block's markup — the twin of
 * `views/metadata_section_block_view.pt`. The list layout repeats the single
 * block's anatomy per field; the table layout puts one row per field with
 * the title always in the header cell. See `MetadataView.tsx` for the rules.
 *
 * With the editor's `renderInput`, an EMPTY field the author may type into
 * is kept (the public page skips it), so the section can be filled in place.
 */
import type { ReactNode } from 'react';

import {
  effectiveLayout,
  sectionEntries,
  sectionTitle,
  type Entry,
  type MetadataSectionData,
} from './data';
import MetadataValue from './MetadataValue';

export type MetadataSectionViewProps = {
  data?: MetadataSectionData;
  isEditMode?: boolean;
  /** Set by `edit`. The inline control for an editable field, or `null`. */
  renderInput?: (entry: Entry, placeholder: string) => ReactNode;
};

export function MetadataSectionView({ data = {}, isEditMode, renderInput }: MetadataSectionViewProps) {
  const title = sectionTitle(data);
  const layout = effectiveLayout(data);
  const entries = sectionEntries(data, renderInput ? (candidate) => !!candidate.input : undefined);
  const input = (entry: Entry) => renderInput?.(entry, '') ?? null;

  return (
    <section className={`metadata-section-block has--layout--${layout}`} aria-label={title || undefined}>
      {title ? <h2 className="metadata-section-title">{title}</h2> : null}
      {entries.length && layout === 'list' ? (
        <div className="metadata-section-list">
          {entries.map((entry, index) => (
            <div key={`${entry.id}:${index}`} className={entry.css}>
              {entry.label ? <span className="metadata-label">{entry.label}</span> : null}
              <MetadataValue entry={entry} tag="div" isEditMode={isEditMode} input={input(entry)} />
            </div>
          ))}
        </div>
      ) : null}
      {entries.length && layout === 'table' ? (
        <table className="metadata-section-table">
          <tbody>
            {entries.map((entry, index) => (
              <tr
                key={`${entry.id}:${index}`}
                className={`metadata-section-row has--field--${entry.id} has--kind--${entry.kind}`}
              >
                <th className="metadata-label" scope="row">
                  {entry.title}
                </th>
                <MetadataValue entry={entry} tag="td" isEditMode={isEditMode} input={input(entry)} />
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}

export default MetadataSectionView;
