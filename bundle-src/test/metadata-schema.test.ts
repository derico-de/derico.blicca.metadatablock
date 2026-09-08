/**
 * The two sidebar forms: what they offer, what they never offer, and the
 * invariant that keeps the index-keyed renderer from swapping fields.
 */
import { describe, expect, it } from 'vitest';
import config from '@plone/registry';

import {
  MetadataSchema,
  MetadataSectionSchema,
  METADATA_BLOCK_TYPE,
  METADATA_SECTION_BLOCK_TYPE,
} from '../src/metadata/schema';
import { DERIVED_KEYS, LAYOUTS, DEFAULT_LAYOUT } from '../src/metadata/data';
import { installUpstreamRegistry } from './upstream-registry';

installUpstreamRegistry(config as any);

const fieldsOf = (schema: { fieldsets: Array<{ fields: string[] }> }) =>
  schema.fieldsets.flatMap((fieldset) => fieldset.fields);

describe('the Metadata block', () => {
  const schema = MetadataSchema({ formData: {} });

  it('is the block type the entry registers', () => {
    expect(METADATA_BLOCK_TYPE).toBe('metadata');
  });

  it('offers the notices, the field, the label flag, the placeholder and the width', () => {
    expect(fieldsOf(schema)).toEqual([
      'metadataNotice',
      'field',
      'showLabel',
      'placeholder',
      'blockWidth',
    ]);
    for (const name of fieldsOf(schema)) expect(schema.properties).toHaveProperty(name);
  });

  it('names namespaced widgets, so both hosts render the same controls', () => {
    expect(schema.properties.field.widget).toBe('metadata_field');
    expect(schema.properties.showLabel.widget).toBe('metadata_boolean');
    expect(schema.properties.metadataNotice.widget).toBe('metadata_notice');
  });

  it('leads with the notices, and hands them the whole node to reason about', () => {
    expect(schema.fieldsets[0].fields[0]).toBe('metadataNotice');
    const data = { field: 'title', catalog: [] };
    expect(MetadataSchema({ formData: data }).properties.metadataNotice.data).toBe(data);
    // Not a control: no title, so the renderer gives it no label to store under.
    expect(schema.properties.metadataNotice).not.toHaveProperty('title');
  });

  it('passes the node’s catalog through to the field widget', () => {
    const rows = [{ id: 'title', title: 'T', kind: 'text', value: 'A' }];
    expect(MetadataSchema({ formData: { catalog: rows } }).properties.field.catalog).toBe(rows);
  });

  it('never offers a derived key, and requires nothing', () => {
    for (const key of DERIVED_KEYS) {
      expect(fieldsOf(schema)).not.toContain(key);
      expect(schema.properties).not.toHaveProperty(key);
    }
    expect(schema.required).toEqual([]);
  });
});

describe('the Metadata Section block', () => {
  const schema = MetadataSectionSchema({ formData: {} });

  it('is the block type the entry registers', () => {
    expect(METADATA_SECTION_BLOCK_TYPE).toBe('metadataSection');
  });

  it('offers the notices, the heading, the layout, the fields and the width', () => {
    expect(fieldsOf(schema)).toEqual([
      'metadataNotice',
      'title',
      'layout',
      'fields',
      'blockWidth',
    ]);
  });

  it('leads with its own notices, told apart from the single block’s', () => {
    expect(schema.fieldsets[0].fields[0]).toBe('metadataNotice');
    expect(schema.properties.metadataNotice.widget).toBe('metadata_section_notice');
    const data = { fields: [{ field: 'title' }] };
    expect(MetadataSectionSchema({ formData: data }).properties.metadataNotice.data).toBe(data);
  });

  it('offers the layout as a select in BOTH hosts', () => {
    expect(schema.properties.layout.widget).toBe('metadata_select');
    expect(schema.properties.layout.choices).toEqual(LAYOUTS.map(([id, label]) => [id, label]));
    expect(schema.properties.layout.default).toBe(DEFAULT_LAYOUT);
    expect(schema.properties.fields.widget).toBe('metadata_fields');
  });

  it('never offers a derived key', () => {
    for (const key of DERIVED_KEYS) expect(schema.properties).not.toHaveProperty(key);
  });
});

describe('the index-keyed renderer invariant', () => {
  it.each([MetadataSchema, MetadataSectionSchema])('puts the conditional background last (%o)', (make) => {
    const bare = make({ formData: {} });
    const styling = bare.fieldsets.find((f) => f.id === 'styling')!;
    // No palette upstream: absent by mechanism. Were one registered, it
    // would be appended, and appended is last.
    expect(styling.fields).toEqual(['blockWidth']);
  });
});
