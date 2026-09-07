/**
 * The fields the CANVAS edits itself — bound through the host's form atom.
 *
 * The host keeps the content item being edited in a jotai atom registered
 * as the `formAtom` utility; Aurora's own title node reads and writes the
 * title through it with `useFieldFocusedAtom`, and the Blicca save carries
 * every field of that atom the canvas changed (block add-on contract §1.7).
 * A Metadata block binds a plain text field the same way (ADR 0002): what
 * the author types lands in the atom at once, the preview reads it from
 * there, and Save persists it with the blocks.
 *
 * The atom is resolved at render time through the registry, with an inert
 * fallback where no host registered one (a test, a bare registry). `jotai`
 * and `@plone/helpers` are both promised facades (contract §2.1), so this
 * costs the bundle nothing it does not already import.
 */
import { atom, useAtomValue, type PrimitiveAtom } from 'jotai';
import { useFieldFocusedAtom } from '@plone/helpers';
import config from '@plone/registry';

import type { Row } from './data';

type Content = Record<string, unknown>;

const fallbackFormAtom = atom<Content>({});

/** The host's form atom, or an inert one. */
export function formAtom(): PrimitiveAtom<Content> {
  const registry = config as {
    getUtility?: (options: { name: string; type: string }) => { method?: unknown } | undefined;
  };
  try {
    const method = registry.getUtility?.({ name: 'formAtom', type: 'atom' })?.method;
    const found = typeof method === 'function' ? method() : null;
    return (found ?? fallbackFormAtom) as PrimitiveAtom<Content>;
  } catch {
    return fallbackFormAtom;
  }
}

/** Whether the canvas keeps `row` live from the form atom rather than the loaded catalog. */
export function isBound(row: Row): boolean {
  // The title is bound even where this user may not type it here: the
  // title node above edits it, and the preview must never contradict it.
  return row.kind === 'text' && (!!row.input || row.id === 'title');
}

/**
 * `rows` with every bound field's value replaced by what the form atom
 * holds — the title as the title node has it, a description as it is being
 * typed — so the preview never lags what the author sees elsewhere on the
 * canvas. A field the atom does not hold as a string keeps its loaded value.
 */
export function useLiveRows(rows: Row[] | null): Row[] | null {
  const content = useAtomValue(formAtom());
  if (!rows) return null;
  return rows.map((row) => {
    if (!isBound(row)) return row;
    const live = content && typeof content === 'object' ? content[row.id] : undefined;
    return typeof live === 'string' ? { ...row, value: live } : row;
  });
}

/** `[value, setValue]` for one field of the form atom; `null` while it holds no string. */
export function useFieldBinding(fieldId: string): [string | null, (value: string) => void] {
  const [value, setValue] = useFieldFocusedAtom<Content, string>(formAtom() as never, fieldId as never);
  return [typeof value === 'string' ? value : null, setValue as (value: string) => void];
}
