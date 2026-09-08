/**
 * The anatomy of both blocks, held against the React renderers through the
 * shared fixture (`tests/anatomy-cases.json`) the Python suite reads too.
 * Exactly, up to attribute order and the void-element slash; as a skeleton
 * (every attribute but `class` dropped); and with every `href` dropped on
 * the editor surface.
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import MetadataView from '../src/metadata/MetadataView';
import MetadataSectionView from '../src/metadata/MetadataSectionView';

const FIXTURE = 'tests/anatomy-cases.json';

function fixtureFile(): string {
  let directory = process.cwd();
  for (let up = 0; up < 4; up += 1) {
    const candidate = join(directory, FIXTURE);
    if (existsSync(candidate)) return candidate;
    directory = dirname(directory);
  }
  throw new Error(`no ${FIXTURE} above ${process.cwd()}`);
}

type Case = {
  name: string;
  note: string;
  data: Record<string, unknown>;
  html: string;
  /** The canvas's markup where it is NOT `html` minus its hrefs; see the fixture's comment. */
  editor?: string;
};

const ALL = JSON.parse(readFileSync(fixtureFile(), 'utf8')) as {
  metadata: Case[];
  metadataSection: Case[];
};

const TAG = /<([a-z0-9]+)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(\/?)>/gi;

const attributesOf = (attrs: string): string[] => attrs.match(/[^\s=/]+(?:="[^"]*")?/g) ?? [];

/** Attribute ORDER and the void-element slash normalized away; everything else exact. */
export function canonical(html: string): string {
  return html.replace(TAG, (_match, tag: string, attrs: string) => {
    const sorted = attributesOf(attrs).sort();
    return `<${tag}${sorted.length ? ` ${sorted.join(' ')}` : ''}>`;
  });
}

/** The cross-renderer contract: tags, `class` and text; nothing else. */
export function skeleton(html: string): string {
  return html.replace(TAG, (_match, tag: string, attrs: string) => {
    const kept = attributesOf(attrs).filter((attr) => attr.startsWith('class='));
    return `<${tag}${kept.length ? ` ${kept.join(' ')}` : ''}>`;
  });
}

const SUITES = [
  { name: 'metadata', cases: ALL.metadata, floor: 25, View: MetadataView },
  { name: 'metadataSection', cases: ALL.metadataSection, floor: 10, View: MetadataSectionView },
] as const;

for (const suite of SUITES) {
  const markup = (data: Record<string, unknown>, isEditMode?: boolean) =>
    render(<suite.View data={data as any} isEditMode={isEditMode} />).container.innerHTML;

  describe(`the shared anatomy fixture: ${suite.name}`, () => {
    it('covers the states the rules enumerate', () => {
      expect(suite.cases.length).toBeGreaterThanOrEqual(suite.floor);
      expect(new Set(suite.cases.map((entry) => entry.name)).size).toBe(suite.cases.length);
      for (const entry of suite.cases) expect(entry.note, entry.name).toBeTruthy();
    });

    it.each(suite.cases.map((entry) => [entry.name, entry] as const))('renders %s exactly', (_name, entry) => {
      expect(canonical(markup(entry.data))).toBe(canonical(entry.html));
    });

    it.each(suite.cases.map((entry) => [entry.name, entry] as const))(
      'matches the cross-renderer skeleton for %s',
      (_name, entry) => {
        expect(skeleton(markup(entry.data))).toBe(skeleton(entry.html));
      },
    );

    it('drops every href on the editor surface, and changes nothing else', () => {
      for (const entry of suite.cases) {
        const expected = entry.editor ?? entry.html.replace(/ href="[^"]*"/g, '');
        expect(canonical(markup(entry.data, true)), entry.name).toBe(canonical(expected));
      }
    });

    it('emits no whitespace-only text nodes outside rich text', () => {
      for (const entry of suite.cases) {
        if (entry.name.includes('richtext')) continue;
        expect(markup(entry.data), entry.name).not.toMatch(/>\s+</);
      }
    });
  });
}
