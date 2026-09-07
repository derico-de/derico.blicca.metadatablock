/**
 * The workspace stands up, the loader convention is honoured, and the
 * upstream fixture is genuinely Blicca-free.
 */
import { describe, expect, it } from 'vitest';
import config from '@plone/registry';

import install, { MetadataBlockInfo, MetadataSectionBlockInfo } from '../src/index';
import { METADATA_WIDGETS } from '../src/widgets';
import { BLICCA_ONLY_REGISTRATIONS, choicesWidgetOf, installUpstreamRegistry } from './upstream-registry';

const upstream = installUpstreamRegistry(config as any);

describe('install()', () => {
  it('returns the config — the loader convention requires it', () => {
    expect(install(upstream)).toBe(upstream);
  });

  it('registers both blocks under their Volto ids', () => {
    install(upstream);
    expect(upstream.blocks.blocksConfig.metadata).toBe(MetadataBlockInfo);
    expect(upstream.blocks.blocksConfig.metadataSection).toBe(MetadataSectionBlockInfo);
  });

  it('registers the four namespaced widgets, and only those', () => {
    install(upstream);
    expect(Object.keys(METADATA_WIDGETS).sort()).toEqual(
      ['metadata_boolean', 'metadata_field', 'metadata_fields', 'metadata_select'].sort(),
    );
    for (const [key, widget] of Object.entries(METADATA_WIDGETS)) {
      expect(upstream.getWidget(key)).toBe(widget);
    }
    // The generic keys stay unclaimed: claiming one would change every other
    // block's fields in the host.
    for (const key of ['select', 'textarea', 'object_list']) {
      expect(upstream.getWidget(key)).toBeUndefined();
    }
  });
});

describe.each([MetadataBlockInfo, MetadataSectionBlockInfo])('the blocksConfig entry %o', (info) => {
  it('has the fields whose absence silently drops it from the slash menu', () => {
    expect(typeof info.id).toBe('string');
    expect(typeof info.title).toBe('string');
    expect(typeof info.icon).toBe('function');
  });

  it('implements both halves and declares no defaultBlockWidth', () => {
    expect(typeof info.edit).toBe('function');
    expect(typeof info.view).toBe('function');
    expect(typeof info.blockSchema).toBe('function');
    expect(info).not.toHaveProperty('defaultBlockWidth');
  });
});

describe('the upstream registry fixture', () => {
  it('registers no `choices` widget — it is Blicca-only', () => {
    expect(BLICCA_ONLY_REGISTRATIONS.widgetKeys).toEqual(['choices']);
    expect(choicesWidgetOf(upstream)).toBeUndefined();
  });
});
