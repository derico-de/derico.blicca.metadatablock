/**
 * The one field the CANVAS edits itself: the title.
 *
 * Every other field a Metadata block shows is edited on the classic Content
 * tab, so the catalog the server derived is current until the author leaves
 * the canvas. The title is different — the title node at the top of the
 * canvas writes it into the host's form atom as the author types — and a
 * preview that kept showing the loaded title would be lying next to it.
 *
 * The form atom is the host's, reached the way Aurora's own title binding
 * reaches it: a registry utility named `formAtom`, resolved at render time,
 * with an inert fallback where no host registered one (a test, a bare
 * registry). `jotai` and `@plone/registry` are both promised facades
 * (contract §2.1), so this costs the bundle nothing it does not already
 * import.
 */
import { atom, useAtomValue, type Atom } from 'jotai';
import config from '@plone/registry';

const fallbackFormAtom = atom<Record<string, unknown>>({});

function formAtom(): Atom<Record<string, unknown>> {
  const registry = config as {
    getUtility?: (options: { name: string; type: string }) => { method?: unknown } | undefined;
  };
  try {
    const method = registry.getUtility?.({ name: 'formAtom', type: 'atom' })?.method;
    const found = typeof method === 'function' ? method() : null;
    return (found ?? fallbackFormAtom) as Atom<Record<string, unknown>>;
  } catch {
    return fallbackFormAtom;
  }
}

/** The title as the canvas currently has it, or `null` when the host has none. */
export function useLiveTitle(): string | null {
  const content = useAtomValue(formAtom());
  const title = content && typeof content === 'object' ? content.title : null;
  return typeof title === 'string' ? title : null;
}
