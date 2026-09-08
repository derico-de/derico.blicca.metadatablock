/**
 * The inline control the canvas draws for a field the catalog marks
 * editable: a bare `<textarea>` bound to the field in the host's form atom,
 * sitting where the published page puts the value.
 *
 * A textarea for BOTH shapes, on purpose: a `line` (a title) must wrap like
 * the heading it will become, and an `<input>` cannot. A line folds any
 * newline to a space and swallows Enter instead.
 *
 * A ploneBlock is a Plate void with `contentEditable={false}`, so a native
 * control inside it receives focus and text normally — but every key event
 * still bubbles to the editor's plugin handlers, where Enter inserts a
 * paragraph after the block and Backspace on a selected block removes it.
 * The control therefore stops its keyboard and clipboard events at itself
 * (contract §1.7). Mouse events are left alone: a click must still select
 * the block, so its sidebar opens.
 */
import { useLayoutEffect, useRef, type SyntheticEvent } from 'react';

import type { Entry } from './data';
import { useControlValue } from './form-fields';

export type FieldInputProps = {
  entry: Entry;
  /** What the field shows while empty: the block's placeholder, else the field's title. */
  placeholder?: string;
};

const stop = (event: SyntheticEvent) => event.stopPropagation();

export function FieldInput({ entry, placeholder }: FieldInputProps) {
  const [bound, setValue] = useControlValue(entry);
  // A text field's display value IS its raw value, so a row that carries
  // no `raw` (a fixture, a hand-authored catalog) still shows what it shows.
  const value =
    typeof bound === 'string' ? bound : bound == null && typeof entry.value === 'string' ? entry.value : '';
  const ref = useRef<HTMLTextAreaElement>(null);
  const line = entry.input === 'line';

  // Grow with the text; `field-sizing: content` does this in CSS where the
  // browser knows it, this is the fallback everywhere else.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      className="metadata-input"
      rows={1}
      value={value}
      placeholder={placeholder || entry.title}
      aria-label={entry.title}
      onChange={(event) => {
        const next = event.target.value;
        setValue(line ? next.replace(/[\r\n]+/g, ' ') : next);
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (line && event.key === 'Enter') event.preventDefault();
      }}
      onKeyUp={stop}
      onBeforeInput={stop}
      onPaste={stop}
      onCopy={stop}
      onCut={stop}
      onDrop={stop}
    />
  );
}

export default FieldInput;
