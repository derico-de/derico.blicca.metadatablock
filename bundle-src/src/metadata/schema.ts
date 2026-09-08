/**
 * The two blocks' sidebar forms.
 *
 * Two host facts shape them:
 *
 * 1. The schema function receives `{ props, formData, intl }`, not `{ data }`.
 * 2. `BlockSettingsFormRenderer` keys its fields by ARRAY INDEX and re-runs
 *    this function on every change, so a conditional field must be LAST in
 *    its fieldset. The only conditional field is the background, and it is
 *    last.
 *
 * Every non-text field names a NAMESPACED widget of this package
 * (`metadata_field`, `metadata_fields`, `metadata_select`,
 * `metadata_boolean`): `getWidgetByName` outranks every other lane in
 * `Field.tsx`, and the `choices` / `boolean` lanes differ between the two
 * hosts — Aurora registers no `choices` widget at all, and its `boolean`
 * widget takes different props than Blicca's substitute. A namespaced widget
 * is the same control in both hosts.
 *
 * The field widgets need the catalog to offer the page's fields: the
 * serializer's `catalog` on the node is passed through as a widget prop, and
 * the widget fetches one itself for a never-serialized node (the same
 * one-request-per-page cache the canvas uses).
 *
 * The first field of each form is not a control at all: `metadataNotice`
 * carries the editor's own notices about this block (`notices.ts`), which
 * the canvas deliberately does not draw. It is the one property here that
 * never becomes a key of the block — its widget stores nothing — and it
 * takes the whole `formData` as a prop, because what there is to say
 * depends on every setting at once.
 */
import { getStyleFieldDefinitionsFromRegistry } from '@plone/helpers';

import { DEFAULT_LAYOUT, LAYOUTS } from './data';

export const METADATA_BLOCK_TYPE = 'metadata';
export const METADATA_SECTION_BLOCK_TYPE = 'metadataSection';

const BACKGROUND_FIELD_NAME = 'backgroundColor';

/**
 * Backgrounds are the host's palette, not ours — `backgroundField` returns
 * `null` where the host registers none, so the control is absent in Aurora
 * proper BY MECHANISM rather than by a flag we maintain.
 */
function backgroundField(data: Record<string, unknown>, blockType: string) {
  const definitions = getStyleFieldDefinitionsFromRegistry(BACKGROUND_FIELD_NAME, {
    data,
    blockType,
    fieldName: BACKGROUND_FIELD_NAME,
  }) as Array<{ name?: unknown; label?: unknown }>;
  const choices = definitions
    .filter((definition) => typeof definition?.name === 'string')
    .map((definition) => [definition.name, definition.label || definition.name]);
  if (!choices.length) return null;
  return {
    title: 'Background',
    choices,
    ...(choices.some(([name]) => name === 'none') ? { default: 'none' } : {}),
    styleField: true,
  };
}

function styling(background: ReturnType<typeof backgroundField>) {
  return {
    fieldset: {
      id: 'styling',
      title: 'Styling',
      fields: ['blockWidth', ...(background ? [BACKGROUND_FIELD_NAME] : [])],
    },
    properties: {
      blockWidth: {
        title: 'Block width',
        widget: 'width',
        default: 'default',
        styleField: true,
      },
      ...(background ? { [BACKGROUND_FIELD_NAME]: background } : {}),
    },
  };
}

type SchemaArgs = { formData?: Record<string, unknown> };

export function MetadataSchema({ formData = {} }: SchemaArgs = {}) {
  const style = styling(backgroundField(formData, METADATA_BLOCK_TYPE));
  return {
    title: 'Metadata',
    fieldsets: [
      {
        id: 'default',
        title: 'Default',
        fields: ['metadataNotice', 'field', 'showLabel', 'placeholder'],
      },
      style.fieldset,
    ],
    properties: {
      metadataNotice: {
        widget: 'metadata_notice',
        data: formData,
      },
      field: {
        title: 'Field',
        description: 'Which of this page’s fields to show.',
        widget: 'metadata_field',
        catalog: formData.catalog,
      },
      showLabel: {
        title: 'Show label',
        description: 'Put the field’s title above its value.',
        widget: 'metadata_boolean',
      },
      placeholder: {
        title: 'Placeholder',
        description: 'Shown when the field is empty on this page.',
      },
      ...style.properties,
    },
    required: [],
  };
}

export function MetadataSectionSchema({ formData = {} }: SchemaArgs = {}) {
  const style = styling(backgroundField(formData, METADATA_SECTION_BLOCK_TYPE));
  return {
    title: 'Metadata section',
    fieldsets: [
      {
        id: 'default',
        title: 'Default',
        fields: ['metadataNotice', 'title', 'layout', 'fields'],
      },
      style.fieldset,
    ],
    properties: {
      metadataNotice: {
        widget: 'metadata_section_notice',
        data: formData,
      },
      title: {
        title: 'Heading',
        description: 'Optional heading above the fields.',
      },
      layout: {
        title: 'Layout',
        widget: 'metadata_select',
        choices: LAYOUTS.map(([id, label]) => [id, label]),
        // NOT a storage guarantee — both renderers fall back to it themselves.
        default: DEFAULT_LAYOUT,
      },
      fields: {
        title: 'Fields',
        description: 'Which of this page’s fields to show, in order.',
        widget: 'metadata_fields',
        catalog: formData.catalog,
      },
      ...style.properties,
    },
    required: [],
  };
}
