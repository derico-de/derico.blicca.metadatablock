/**
 * The Metadata block's markup — and in Aurora proper, its PUBLIC rendering.
 * `view` is the block's other renderer, and the Chameleon template in
 * `views/metadata_block_view.pt` must emit the same anatomy element for
 * element, because ONE scope-wrapped stylesheet dresses both surfaces.
 *
 * - **The root is our own `<div class="metadata-block">`**, never the host's
 *   `.block-metadata` wrapper stamp. It is emitted ALWAYS, with the stored
 *   field and its kind when the catalog knows it.
 * - **Every element inside is conditional on its own content.**
 * - **It reads only `data`** — the stored `field`, `showLabel` and
 *   `placeholder`, and the `catalog` the server injected. No registry, no
 *   fetch: that is what makes it portable across hosts.
 *
 * NO WHITESPACE-ONLY TEXT NODES: JSX drops inter-element whitespace, so this
 * file is safe by construction; the template strips its indentation.
 */
import { metadataEntry, type MetadataData } from './data';
import MetadataValue from './MetadataValue';

export type MetadataViewProps = {
  data?: MetadataData;
  /** Set by `edit`. Suppresses `href` on every anchor and nothing else. */
  isEditMode?: boolean;
};

export function MetadataView({ data = {}, isEditMode }: MetadataViewProps) {
  const entry = metadataEntry(data);
  return (
    <div className={entry.css}>
      {entry.label ? <span className="metadata-label">{entry.label}</span> : null}
      <MetadataValue entry={entry} tag="div" isEditMode={isEditMode} />
      {entry.placeholder ? (
        <div className="metadata-value metadata-value--placeholder">{entry.placeholder}</div>
      ) : null}
    </div>
  );
}

export default MetadataView;
