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

/**
 * Whether the canvas previews `row`'s VALUE from the form atom rather than
 * the loaded catalog. Only a text line or text can be: its raw value IS its
 * display value. Every other control shows the atom's value itself (a date
 * picker shows the date, a token control the tags), so the display value
 * never needs deriving in the browser — the server's rule (ADR 0001).
 * The title is bound even where this user may not type it here: the title
 * node above edits it, and the preview must never contradict it.
 */
export function isBound(row: Row): boolean {
  return row.kind === 'text' && (row.input === 'line' || row.input === 'text' || row.id === 'title');
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
    const live = content && typeof content === 'object' ? content[row.id] : undefined;
    if (live === undefined) return row;
    // Every editable row's RAW follows the atom, so the canvas knows what
    // the author has filled in (`hasContent`); only a text row's display
    // value does, see `isBound`.
    const next = row.input ? { ...row, raw: live } : row;
    return isBound(row) && typeof live === 'string' ? { ...next, value: live } : next;
  });
}

/**
 * Whether an editable field holds something, as the author has it NOW —
 * the atom's raw value for a control, the display value otherwise. What
 * the canvas's "empty here" notices are about.
 */
export function hasContent(entry: { input: string; value: unknown; raw?: unknown }): boolean {
  if (!entry.input || entry.raw === undefined) return entry.value !== null;
  const raw = entry.raw;
  if (raw == null || raw === '' || raw === false) return raw === false;
  if (typeof raw === 'string') return raw.trim() !== '';
  if (Array.isArray(raw)) return raw.length > 0;
  if (typeof raw === 'object') return Object.keys(raw as object).length > 0;
  return true;
}

/**
 * `[value, setValue]` for one field of the form atom. `undefined` while the
 * atom does not hold the field at all (a bare registry, a test); `null` is
 * a value — restapi's empty date, cleared image.
 */
export function useFieldBinding(fieldId: string): [unknown, (value: unknown) => void] {
  const [value, setValue] = useFieldFocusedAtom<Content, string>(formAtom() as never, fieldId as never);
  return [value as unknown, setValue as (value: unknown) => void];
}

/**
 * The value a control edits: the atom's, else the row's `raw` — so under a
 * host the control never contradicts the preview it stands in for, and
 * without one it still shows what was loaded.
 */
export function useControlValue(entry: { id: string; raw?: unknown }): [unknown, (value: unknown) => void] {
  const [bound, setValue] = useFieldBinding(entry.id);
  return [bound === undefined ? entry.raw : bound, setValue];
}
