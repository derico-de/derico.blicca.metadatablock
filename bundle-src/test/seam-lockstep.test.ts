/**
 * The README ↔ stylesheet lockstep.
 *
 * The seam defaults live at their POINT OF USE — every axis is spelled
 * `var(--metadata-x, <literal>)` and the sheet declares no `--metadata-*`
 * property anywhere — so there is no single place in the code that states
 * what a default is. The README's property table is that place, and it is
 * published: changing a default is a breaking change. This test fails in
 * five directions: a documented property nothing consumes, a use whose
 * fallback differs from the table, a use with no fallback, a consumed
 * property the table does not document, and a `--metadata-*` DECLARED in the
 * sheet.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '..', '..');
const README = readFileSync(path.join(PACKAGE_ROOT, 'README.md'), 'utf8');
const SHEET = readFileSync(path.join(PACKAGE_ROOT, 'bundle-src', 'src', 'styles.css'), 'utf8');

const PREFIX = '--metadata-';

function normalise(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

type VarUse = { name: string; fallback: string | null };

/** Every `var()` in the sheet, nested fallbacks included (paren-balanced). */
function parseVarUses(css: string): VarUse[] {
  const uses: VarUse[] = [];
  for (let i = css.indexOf('var('); i !== -1; i = css.indexOf('var(', i + 1)) {
    let j = i + 'var('.length;
    let name = '';
    while (j < css.length && css[j] !== ',' && css[j] !== ')') name += css[j++];
    if (j >= css.length) break;
    if (css[j] === ')') {
      uses.push({ name: name.trim(), fallback: null });
      continue;
    }
    let depth = 0;
    let fallback = '';
    j += 1;
    for (; j < css.length; j++) {
      const c = css[j];
      if (c === '(') depth++;
      else if (c === ')') {
        if (depth === 0) break;
        depth--;
      }
      fallback += c;
    }
    uses.push({ name: name.trim(), fallback: fallback.trim() });
  }
  return uses;
}

/** `| `--metadata-gap` | `1rem` | between the items |` */
function parseReadmeTable(markdown: string): Map<string, string> {
  const documented = new Map<string, string>();
  const row = /^\|\s*`(--metadata-[\w-]+)`\s*\|\s*`(.+?)`\s*\|/gm;
  for (const match of markdown.matchAll(row)) {
    documented.set(match[1], normalise(match[2]));
  }
  return documented;
}

const documented = parseReadmeTable(README);
const body = stripComments(SHEET);
const uses = parseVarUses(body).filter((use) => use.name.startsWith(PREFIX));

describe('the seam is what the README says it is', () => {
  it('parses the published table', () => {
    expect(documented.size).toBe(21);
    expect(documented.get('--metadata-gap')).toBe('0.75rem');
    expect(documented.get('--metadata-link-decoration')).toBe('underline');
  });

  it('parses the stylesheet', () => {
    expect(uses.length).toBeGreaterThanOrEqual(documented.size);
  });

  it('consumes every property it publishes', () => {
    const used = new Set(uses.map((use) => use.name));
    expect([...documented.keys()].filter((name) => !used.has(name))).toEqual([]);
  });

  it('publishes every property it consumes', () => {
    const undocumented = [...new Set(uses.map((use) => use.name))].filter(
      (name) => !documented.has(name),
    );
    expect(undocumented).toEqual([]);
  });

  it('spells every use with exactly the documented default', () => {
    const drift = uses
      .filter((use) => documented.has(use.name))
      .filter((use) => normalise(use.fallback ?? '') !== documented.get(use.name))
      .map((use) => `${use.name}: ${use.fallback ?? '(no fallback)'}`);
    expect(drift).toEqual([]);
  });

  it('declares no --metadata-* property anywhere', () => {
    const declarations = [...body.matchAll(/(?:^|[;{\s])(--metadata-[\w-]+)\s*:/g)].map(
      (match) => match[1],
    );
    expect(declarations).toEqual([]);
  });
});

describe('the sanity rules the sheet is written under', () => {
  it('uses no !important', () => {
    expect(body).not.toMatch(/!\s*important/);
  });

  it('never selects on [href]', () => {
    expect(body).not.toMatch(/\[href/);
  });

  it('sets no outline, so the host focus ring reaches the links', () => {
    expect(body).not.toMatch(/(?:^|[;{\s])outline\s*:/);
  });

  it('descends every block rule from the root, except the editor chrome', () => {
    const selectors = [...body.matchAll(/(^|})\s*([^{}]+?)\s*\{/g)].map((m) => m[2].trim());
    for (const selector of selectors) {
      if (selector.startsWith('@')) continue;
      expect(
        selector.startsWith('.metadata-block') || selector.startsWith('.metadata-section-block') || selector === '.metadata-notice',
        selector,
      ).toBe(true);
    }
  });
});
