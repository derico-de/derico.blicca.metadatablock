/**
 * The slash-menu icons. React components, NEVER strings — the menu renders
 * `<Icon />` and a string breaks it. `currentColor` throughout.
 */
import type { SVGProps } from 'react';

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: 'false' as const,
};

/** A tag: one field of the page. */
export function MetadataIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5h9l7 7-7 7-9-9z" />
      <circle cx="8" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}

/** A labelled list: several fields of the page. */
export function MetadataSectionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h5" />
      <path d="M12 6h8" />
      <path d="M4 12h5" />
      <path d="M12 12h8" />
      <path d="M4 18h5" />
      <path d="M12 18h8" />
    </svg>
  );
}
