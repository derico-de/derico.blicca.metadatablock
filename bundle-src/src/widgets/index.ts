/**
 * The Metadata blocks' six sidebar widgets and their registration.
 *
 * Every key is **namespaced**. `registerWidget` writes into one global
 * last-wins map, so a block claiming a generic key (`select`, `boolean`,
 * `object_list`) changes every other block's fields in the host. `key:
 * 'widget'` puts them where `Field.tsx`'s `getWidgetByName` looks — the lane
 * a schema selects with `widget: 'metadata_field'`.
 */
import { MetadataBooleanWidget } from './BooleanWidget';
import { MetadataFieldWidget } from './FieldSelectWidget';
import { MetadataFieldsWidget } from './FieldsWidget';
import { MetadataNoticeWidget, MetadataSectionNoticeWidget } from './NoticeWidget';
import { MetadataSelectWidget } from './SelectWidget';

export { MetadataBooleanWidget } from './BooleanWidget';
export { MetadataFieldWidget } from './FieldSelectWidget';
export { MetadataFieldsWidget } from './FieldsWidget';
export { MetadataNoticeWidget, MetadataSectionNoticeWidget } from './NoticeWidget';
export { MetadataSelectWidget } from './SelectWidget';

type WidgetRegistrar = {
  registerWidget: (options: { key: string; definition: unknown }) => void;
};

/** Schema `widget:` value → component. */
export const METADATA_WIDGETS = {
  metadata_field: MetadataFieldWidget,
  metadata_fields: MetadataFieldsWidget,
  metadata_select: MetadataSelectWidget,
  metadata_boolean: MetadataBooleanWidget,
  metadata_notice: MetadataNoticeWidget,
  metadata_section_notice: MetadataSectionNoticeWidget,
} as const;

/**
 * Registered from `install()`, against the config the loader hands us —
 * never the imported singleton — so a host that composes more than one
 * registry gets its widgets on the one it is building.
 */
export function registerMetadataWidgets<T extends WidgetRegistrar>(config: T): T {
  config.registerWidget({ key: 'widget', definition: { ...METADATA_WIDGETS } });
  return config;
}
