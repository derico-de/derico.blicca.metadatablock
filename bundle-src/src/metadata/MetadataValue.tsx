/**
 * The value markup both blocks share, one branch per display kind — the
 * twin of the `value` macro in `views/metadata_value.pt`.
 *
 * `tag` names the element the value sits in: `div` in the single block and
 * the section's list rows, `td` in its table rows. Rich text is authored
 * HTML the server already ran through the field's output transform;
 * `dangerouslySetInnerHTML` is what a Chameleon `structure` is.
 */
import type { Entry, Image, Link } from './data';

export type MetadataValueProps = {
  entry: Entry;
  tag: 'div' | 'td';
  /** Drops every `href`: a live link in the canvas navigates away from unsaved work. */
  isEditMode?: boolean;
};

export function MetadataValue({ entry, tag, isEditMode }: MetadataValueProps) {
  if (entry.value === null || !entry.kind) return null;
  const Tag = tag;
  const className = `metadata-value metadata-value--${entry.kind}`;
  const href = (target: string) => (isEditMode ? {} : { href: target });

  switch (entry.kind) {
    case 'text':
      return <Tag className={className}>{entry.value as string}</Tag>;
    case 'richtext':
      return <Tag className={className} dangerouslySetInnerHTML={{ __html: entry.value as string }} />;
    case 'list':
      return (
        <Tag className={className}>
          <ul className="metadata-list">
            {(entry.value as string[]).map((item, index) => (
              <li key={`${item}:${index}`} className="metadata-item">
                {item}
              </li>
            ))}
          </ul>
        </Tag>
      );
    case 'links':
      return (
        <Tag className={className}>
          <ul className="metadata-list">
            {(entry.value as Link[]).map((item, index) => (
              <li key={`${item.href}:${index}`} className="metadata-item">
                <a className="metadata-link" {...href(item.href)}>
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </Tag>
      );
    case 'image': {
      const image = entry.value as Image;
      return (
        <Tag className={className}>
          <img className="metadata-image" src={image.src} alt={image.alt} />
        </Tag>
      );
    }
    case 'file': {
      const file = entry.value as Link;
      return (
        <Tag className={className}>
          <a className="metadata-link" {...href(file.href)}>
            {file.title}
          </a>
        </Tag>
      );
    }
    default:
      return null;
  }
}

export default MetadataValue;
