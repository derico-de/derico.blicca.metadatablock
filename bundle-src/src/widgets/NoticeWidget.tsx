/**
 * `metadata_notice` / `metadata_section_notice` — the editor talking to the
 * author, at the top of the block's settings form.
 *
 * Not a control: it stores nothing, never calls `onChange`, and carries no
 * label, so the schema field it stands on never becomes a key of the block.
 * The block's own `data` reaches it as a widget prop, spread from the schema
 * property the way the field widgets get the catalog, and the notices are
 * computed from the same live preview the canvas draws (`notices.ts`).
 *
 * Why these class names: `metadata-block.css` is scope-wrapped to
 * `.aurora-editor` / `.aurora-editor-portal` / `.aurora-blocks-view`
 * (contract §6.1). Under Blicca the settings panel IS inside `.aurora-editor`
 * — it is portalled into the shell's own `#sidebar`, not to `document.body` —
 * so `.metadata-notice` reaches it there and adds the rail that marks these
 * paragraphs as the editor's voice rather than a field's description. In
 * Aurora proper no such root exists, so the type comes from the host's own
 * utilities instead: the exact three cmsui's `Description` uses, which is
 * both why they match the sidebar's other prose and why they are certainly
 * in its stylesheet — the Tailwind build scans cmsui, and never this
 * runtime-loaded bundle. The two sets are disjoint on purpose: the rail sets
 * no property the utilities set, so neither has to win a cascade it cannot
 * see.
 */
import type { MetadataData, MetadataSectionData } from '../metadata/data';
import { useMetadataNotices, useMetadataSectionNotices } from '../metadata/notices';

export type MetadataNoticeWidgetProps = {
  /** The block's own data, spread from the schema property. */
  data?: MetadataData & MetadataSectionData;
  className?: string;
};

const noticeClass = 'metadata-notice text-xs font-normal text-quanta-pigeon';

function NoticeList({ notes, className }: { notes: string[]; className?: string }) {
  if (!notes.length) return null;
  return (
    <div
      role="status"
      className={`metadata-notice-widget flex flex-col gap-1${className ? ` ${className}` : ''}`}
    >
      {notes.map((note) => (
        <p key={note} className={noticeClass}>
          {note}
        </p>
      ))}
    </div>
  );
}

export function MetadataNoticeWidget(props: MetadataNoticeWidgetProps) {
  return <NoticeList notes={useMetadataNotices(props.data ?? {})} className={props.className} />;
}

export function MetadataSectionNoticeWidget(props: MetadataNoticeWidgetProps) {
  return (
    <NoticeList notes={useMetadataSectionNotices(props.data ?? {})} className={props.className} />
  );
}

export default MetadataNoticeWidget;
