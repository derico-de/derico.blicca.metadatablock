/**
 * The blocks, exercised against Aurora proper: the registry Aurora builds,
 * from the packages Aurora ships, at the versions this host pins, with
 * **none of Blicca's overrides** — and the blocks' own `install`, `edit` and
 * `view` on top of it. The honest claim: every field the blocks declare
 * resolves in Aurora to the widget it was designed for, the blocks join
 * Aurora's own without displacing one, and the `view`s render every fixture
 * case standalone, reading nothing from the registry.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import config from '@plone/registry';
import { TextField } from '@plone/components/quanta';

import install, {
  MetadataBlockInfo,
  MetadataSectionBlockInfo,
  MetadataSchema,
  MetadataSectionSchema,
  MetadataSectionView,
  MetadataView,
} from '../src/index';
import { METADATA_WIDGETS } from '../src/widgets';
import { UPSTREAM_BLOCKS, choicesWidgetOf, installUpstreamRegistry } from './upstream-registry';

const aurora = installUpstreamRegistry(config as any);
install(aurora);

const bundleSourcePath = path.resolve(
  import.meta.dirname,
  '../../src/derico/blicca/metadatablock/static/metadata-block.js',
);

const FIXTURES = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, '../../tests/anatomy-cases.json'), 'utf8'),
) as {
  metadata: Array<{ name: string; data: any; html: string }>;
  metadataSection: Array<{ name: string; data: any; html: string }>;
};

/** `Field.tsx`'s resolution chain, for the attributes the schemas use. */
function resolveWidget(name: string, property: Record<string, any>) {
  const c = aurora as any;
  const byFieldId = c.getWidget(property.id ?? name) ?? null;
  if (byFieldId) return byFieldId;
  if (typeof property.widget === 'string') return c.getWidget(property.widget) ?? c.widgets.default;
  if (property.choices || property.vocabulary) return c.widgets?.choices ?? null;
  if (property.type) return c.getWidget(property.type) ?? null;
  return c.widgets.default;
}

const ours = new Set<unknown>(Object.values(METADATA_WIDGETS));

describe.each([
  [
    'metadata',
    MetadataSchema,
    {
      metadataNotice: 'ours',
      field: 'ours',
      showInView: 'ours',
      showLabel: 'ours',
      placeholder: 'default',
      blockWidth: 'upstream',
    },
  ],
  [
    'metadataSection',
    MetadataSectionSchema,
    {
      metadataNotice: 'ours',
      title: 'default',
      showInView: 'ours',
      layout: 'ours',
      fields: 'ours',
      blockWidth: 'upstream',
    },
  ],
] as const)('%s: every field resolves to the widget it was designed for', (_name, make, expected) => {
  const properties = make({ formData: {} }).properties as Record<string, Record<string, any>>;

  it('declares exactly the fields the table covers', () => {
    expect(Object.keys(properties).sort()).toEqual(Object.keys(expected).sort());
  });

  for (const [name, verdict] of Object.entries(expected)) {
    it(`${name} resolves to ${verdict}`, () => {
      const resolved = resolveWidget(name, properties[name]);
      const isDefault = resolved === (aurora as any).widgets.default;
      if (verdict === 'default') {
        expect(isDefault).toBe(true);
        expect(resolved).toBe(TextField);
      } else {
        expect(resolved).toBeTruthy();
        expect(isDefault).toBe(false);
        expect(ours.has(resolved)).toBe(verdict === 'ours');
      }
    });
  }

  it('leans on no `choices` widget — Aurora registers none', () => {
    expect(choicesWidgetOf(aurora)).toBeUndefined();
    for (const property of Object.values(properties)) {
      if (property.choices) expect(typeof property.widget).toBe('string');
    }
  });
});

describe('the blocks join Aurora rather than displacing it', () => {
  it('leaves upstream’s blocks intact and adds exactly two', () => {
    for (const id of UPSTREAM_BLOCKS) expect((aurora as any).blocks.blocksConfig[id]).toBeDefined();
    expect((aurora as any).blocks.blocksConfig.metadata).toBe(MetadataBlockInfo);
    expect((aurora as any).blocks.blocksConfig.metadataSection).toBe(MetadataSectionBlockInfo);
    const ids = Object.keys((aurora as any).blocks.blocksConfig);
    expect(ids.filter((id) => !UPSTREAM_BLOCKS.includes(id)).sort()).toEqual(['metadata', 'metadataSection']);
  });

  it('installs idempotently — two records call install twice', () => {
    expect(install(aurora)).toBe(aurora);
    expect((aurora as any).blocks.blocksConfig.metadata).toBe(MetadataBlockInfo);
  });
});

describe('the views render standalone — in Aurora they ARE the public rendering', () => {
  for (const testCase of FIXTURES.metadata) {
    it(`metadata renders ${testCase.name}`, () => {
      const markup = render(<MetadataView data={testCase.data} />).container.innerHTML;
      // Every case renders standalone — except the ones whose whole point is
      // that nothing is published (`showInView: false`, fixture `html: ""`).
      expect(Boolean(markup), testCase.name).toBe(testCase.html !== '');
      cleanup();
    });
  }
  for (const testCase of FIXTURES.metadataSection) {
    it(`metadataSection renders ${testCase.name}`, () => {
      const markup = render(<MetadataSectionView data={testCase.data} />).container.innerHTML;
      expect(Boolean(markup), testCase.name).toBe(testCase.html !== '');
      cleanup();
    });
  }

  it('reads nothing from the registry, which is why they are portable', () => {
    const richest = FIXTURES.metadataSection.find((c) => c.name === 'table-layout')!;
    const withAurora = render(<MetadataSectionView data={richest.data} />).container.innerHTML;
    cleanup();
    const c = aurora as any;
    const saved = { widgets: c.widgets, blocks: c.blocks.blocksConfig, settings: c.settings };
    try {
      c.widgets = { default: undefined };
      c.blocks.blocksConfig = {};
      c.settings = {};
      expect(render(<MetadataSectionView data={richest.data} />).container.innerHTML).toBe(withAurora);
    } finally {
      c.widgets = saved.widgets;
      c.blocks.blocksConfig = saved.blocks;
      c.settings = saved.settings;
      cleanup();
    }
  });
});

describe('bundle hygiene', () => {
  const source = readFileSync(bundleSourcePath, 'utf8');
  const PROBE_NAME = '.artifact-probe.mjs';
  const PROBE_PATH = path.resolve(import.meta.dirname, PROBE_NAME);
  afterAll(() => rmSync(PROBE_PATH, { force: true }));

  const PROMISED = [
    'react',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
    'jotai',
    'platejs',
    '@plone/registry',
    '@plone/helpers',
  ];

  it('imports only promised modules — anything else means two Reacts', () => {
    const imported = [
      ...new Set([...source.matchAll(/(?:^|\n)\s*import[^'"\n]*["']([^"']+)["']/g)].map((m) => m[1])),
    ].sort();
    expect(imported).toEqual(['@plone/helpers', '@plone/registry', 'jotai', 'react', 'react/jsx-runtime']);
    for (const specifier of imported) expect(PROMISED).toContain(specifier);
  });

  it('carries none of the Aurora app stack it dev-depends on', () => {
    for (const forbidden of ['@plone/cmsui', '@plone/components', '@plone/blocks', '@plone/theming', '@plone/layout', '@plone/plate', 'react-router']) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('is importable as a plain ESM module whose default export installs both blocks', async () => {
    writeFileSync(PROBE_PATH, source.replace(/\/\/# sourceMappingURL=.*/g, ''));
    const built: any = await import(/* @vite-ignore */ './' + PROBE_NAME);
    expect(typeof built.default).toBe('function');
    const probe: any = {
      blocks: { blocksConfig: {} },
      widgets: { widget: {} },
      registerWidget: ({ key, definition }: any) => {
        probe.widgets[key] = { ...(probe.widgets[key] ?? {}), ...definition };
      },
      getWidget: () => undefined,
    };
    expect(built.default(probe)).toBe(probe);
    expect(probe.blocks.blocksConfig.metadata?.id).toBe('metadata');
    expect(probe.blocks.blocksConfig.metadataSection?.id).toBe('metadataSection');
    for (const key of Object.keys(METADATA_WIDGETS)) expect(typeof probe.widgets.widget[key]).toBe('function');
  });
});
