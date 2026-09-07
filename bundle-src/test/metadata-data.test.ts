/**
 * The rules that decide what renders, on the editor side. The Python suite
 * (`tests/test_metadata_data.py`) holds the same rules on the other side and
 * reads this module's tables to keep the two level.
 */
import { describe, expect, it } from 'vitest';

import {
  catalog,
  DEFAULT_LAYOUT,
  DERIVED_KEYS,
  effectiveLayout,
  fieldSlug,
  fieldSpecs,
  INPUTS,
  KINDS,
  LAYOUT_IDS,
  metadataEntry,
  resolveValue,
  rowFor,
  screenLink,
  sectionEntries,
  sectionTitle,
} from '../src/metadata/data';

describe('the tables', () => {
  it('know six kinds and two layouts', () => {
    expect(KINDS).toEqual(['text', 'richtext', 'list', 'links', 'image', 'file']);
    expect(LAYOUT_IDS).toEqual(['list', 'table']);
    expect(INPUTS).toEqual(['line', 'text']);
    expect(LAYOUT_IDS).toContain(DEFAULT_LAYOUT);
  });

  it('name the one derived key', () => {
    expect(DERIVED_KEYS).toEqual(['catalog']);
  });
});

describe('screenLink', () => {
  it.each(['/a', 'a', 'http://nohost/plone/a', 'HTTPS://example.org/x', 'mailto:x@y', 'tel:+49'])(
    'passes %s',
    (value) => {
      expect(screenLink(value)).toBe(value);
    },
  );

  it.each(['javascript:alert(1)', 'data:text/html,x', 'vbscript:x', '//evil.example/x'])(
    'rejects %s',
    (value) => {
      expect(screenLink(value)).toBe('');
    },
  );

  it.each([undefined, null, '', '  ', 42, [], {}, true])('answers absent for %s', (value) => {
    expect(screenLink(value)).toBe('');
  });
});

describe('catalog', () => {
  it('is null for a node the server never serialized', () => {
    expect(catalog({})).toBeNull();
    expect(catalog({ catalog: null })).toBeNull();
    expect(catalog({ catalog: 'x' })).toBeNull();
    expect(catalog({ catalog: { title: 'x' } })).toBeNull();
  });

  it('is the list when one is there, however empty', () => {
    expect(catalog({ catalog: [] })).toEqual([]);
  });

  it('keeps well-formed rows in order and drops the rest', () => {
    const rows = catalog({
      catalog: [
        { id: 'title', title: 'Title', kind: 'text', value: 'A' },
        'x',
        null,
        { id: 'a b', title: 'Odd', kind: 'text', value: 'x' },
        { id: '', title: 'Blank', kind: 'text' },
        { id: 't', title: 'Unknown', kind: 'table', value: 'x' },
        { id: 'ok', kind: 'list' },
      ],
    });
    expect(rows).toEqual([
      { id: 'title', title: 'Title', kind: 'text', value: 'A', input: '' },
      { id: 'ok', title: '', kind: 'list', value: undefined, input: '' },
    ]);
  });

  it('keeps an input it knows and drops one it does not', () => {
    const rows = catalog({
      catalog: [
        { id: 'title', kind: 'text', input: 'line' },
        { id: 'description', kind: 'text', input: 'text' },
        { id: 'text', kind: 'richtext', input: 'plate' },
        { id: 'effective', kind: 'text', input: null },
      ],
    })!;
    expect(rows.map((row) => row.input)).toEqual(['line', 'text', '', '']);
  });

  it('finds a row by trimmed id', () => {
    const data = { catalog: [{ id: 'title', title: 'T', kind: 'text', value: 'A' }] };
    expect(rowFor(data, ' title ')?.value).toBe('A');
    expect(rowFor(data, 'bogus')).toBeNull();
    expect(rowFor(data, '')).toBeNull();
    expect(rowFor({}, 'title')).toBeNull();
  });

  it('classes only slugs', () => {
    expect(fieldSlug('relatedItems')).toBe('relatedItems');
    expect(fieldSlug('a b')).toBe('');
    expect(fieldSlug(42)).toBe('');
  });
});

describe('resolveValue', () => {
  it('text and richtext are trimmed strings', () => {
    expect(resolveValue('text', ' A ')).toBe('A');
    expect(resolveValue('richtext', '<p>x</p>')).toBe('<p>x</p>');
    for (const value of [null, undefined, '', ' ', 42, [], {}]) {
      expect(resolveValue('text', value)).toBeNull();
    }
  });

  it('list keeps non-empty strings', () => {
    expect(resolveValue('list', ['a', '', 3, ' b '])).toEqual(['a', 'b']);
    expect(resolveValue('list', [])).toBeNull();
    expect(resolveValue('list', 'a')).toBeNull();
  });

  it('links need a screened href and a title', () => {
    expect(
      resolveValue('links', [
        { href: '/a', title: 'A' },
        { href: 'javascript:x', title: 'Evil' },
        { href: '/b' },
        { title: 'C' },
        'd',
      ]),
    ).toEqual([{ href: '/a', title: 'A' }]);
    expect(resolveValue('links', [])).toBeNull();
  });

  it('image needs a screened src', () => {
    expect(resolveValue('image', { src: '/i.jpg' })).toEqual({ src: '/i.jpg', alt: '' });
    expect(resolveValue('image', { src: 'javascript:x', alt: 'a' })).toBeNull();
    expect(resolveValue('image', '/i.jpg')).toBeNull();
  });

  it('file is a link', () => {
    expect(resolveValue('file', { href: '/f', title: 'f.pdf' })).toEqual({ href: '/f', title: 'f.pdf' });
    expect(resolveValue('file', { href: '/f' })).toBeNull();
  });

  it('unknown kind is nothing', () => {
    expect(resolveValue('table', 'x')).toBeNull();
  });
});

describe('metadataEntry', () => {
  const rows = [{ id: 'title', title: 'Title', kind: 'text', value: 'A' }];

  it('renders a known field', () => {
    const found = metadataEntry({ field: 'title', showLabel: true, catalog: rows });
    expect(found.css).toBe('metadata-block has--field--title has--kind--text');
    expect(found.label).toBe('Title');
    expect(found.value).toBe('A');
    expect(found.placeholder).toBe('');
  });

  it('shows the placeholder only without a value', () => {
    expect(metadataEntry({ field: 'title', placeholder: 'P', catalog: rows }).placeholder).toBe('');
    const empty = [{ id: 'title', title: 'Title', kind: 'text', value: null }];
    expect(metadataEntry({ field: 'title', placeholder: 'P', catalog: empty }).placeholder).toBe('P');
    expect(metadataEntry({ field: 'title', placeholder: 'P' }).placeholder).toBe('P');
    expect(metadataEntry({ placeholder: 'P' }).placeholder).toBe('');
  });

  it('keeps the modifier for an unknown field and drops it for an unsafe one', () => {
    expect(metadataEntry({ field: 'bogus', showLabel: true }).css).toBe('metadata-block has--field--bogus');
    expect(metadataEntry({ field: 'bogus', showLabel: true }).label).toBe('');
    expect(metadataEntry({ field: 'a b' }).css).toBe('metadata-block');
    expect(metadataEntry({}).css).toBe('metadata-block');
  });
});

describe('the section', () => {
  it.each([undefined, null, '', 'grid', 42, ['table'], 'Table'])('layout falls back for %s', (stored) => {
    expect(effectiveLayout({ layout: stored })).toBe('list');
  });

  it('layout stored wins when offered', () => {
    expect(effectiveLayout({ layout: ' table ' })).toBe('table');
  });

  it('reads well-formed specs', () => {
    expect(
      fieldSpecs({
        fields: ['x', null, { showLabel: true }, { field: ' a ', showLabel: 'yes' }, { field: 'b', showLabel: true }],
      }),
    ).toEqual([
      { field: 'a', showLabel: false },
      { field: 'b', showLabel: true },
    ]);
    expect(fieldSpecs({ fields: { field: 'a' } })).toEqual([]);
    expect(fieldSpecs({})).toEqual([]);
  });

  it('keeps only fields with a value', () => {
    const entries = sectionEntries({
      fields: [{ field: 'title', showLabel: true }, { field: 'description' }, { field: 'bogus' }],
      catalog: [
        { id: 'title', title: 'Title', kind: 'text', value: 'A' },
        { id: 'description', title: 'Summary', kind: 'text', value: '' },
      ],
    });
    expect(entries.map((e) => [e.id, e.label])).toEqual([['title', 'Title']]);
  });

  it('trims the title', () => {
    expect(sectionTitle({ title: ' Facts ' })).toBe('Facts');
    expect(sectionTitle({ title: 42 })).toBe('');
  });
});
