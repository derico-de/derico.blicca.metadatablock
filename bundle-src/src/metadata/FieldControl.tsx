/**
 * The inline control the canvas draws for an editable row, one per
 * `input` (ADR 0002) — the twin of Volto's "render the field's own widget"
 * inside its metadata block, on Aurora's terms.
 *
 * Every control edits the field in the host's form atom (`useControlValue`)
 * and writes the shape the content PATCH takes back — a token for a choice,
 * `string[]` for tags, an ISO string for a date, `{ '@id' }` rows for
 * relations, `{ data, encoding, filename, 'content-type' }` for an upload —
 * so a save needs no translation. What it shows is the atom's value itself,
 * so no display value is ever derived in the browser.
 *
 * One host widget is used, `object_browser` (Aurora's, or Blicca's
 * pat-contentbrowser substitute), because a content picker is the host's
 * by nature. Everything else is a native form control dressed to blend into
 * the block: a form control keeps its selection to itself, so Slate never
 * tries to map it (see `DateControl` for the widget that taught us that),
 * and the bundle stays free of anything unpromised.
 *
 * A ploneBlock is a Plate void with `contentEditable={false}`; the controls
 * inside it take focus and text normally, but their key events still bubble
 * to the editor's plugin handlers (Enter inserts a paragraph after the
 * block, arrows move the caret between blocks, Backspace on a selected block
 * removes it). The wrapper stops keyboard and clipboard events for every
 * control at once, host widgets and their portalled popovers included —
 * React bubbles through portals. Mouse events pass: a click must still
 * select the block so its sidebar opens.
 */
import { useId, useRef, useState, type ChangeEvent, type ComponentType, type ReactNode, type SyntheticEvent } from 'react';
import config from '@plone/registry';

import type { Entry, FieldSchema } from './data';
import { FieldInput } from './FieldInput';
import { useControlValue } from './form-fields';

const stop = (event: SyntheticEvent) => event.stopPropagation();

/** A widget the host registered under `name`, or `null`. */
export function hostWidget(name: string): ComponentType<any> | null {
  const registry = config as { getWidget?: (key: string) => ComponentType<any> | undefined };
  try {
    return registry.getWidget?.(name) ?? null;
  } catch {
    return null;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** A choice value as restapi hands it (`{token, title}`) or stores it (a token). */
const tokenOf = (value: unknown): string =>
  isRecord(value) ? String(value.token ?? '') : typeof value === 'string' ? value : '';

const choicesOf = (schema?: FieldSchema): Array<[string, string]> =>
  Array.isArray(schema?.choices)
    ? schema!.choices.filter((pair) => Array.isArray(pair) && pair.length >= 2).map(([token, title]) => [String(token), String(title)])
    : [];

// ── the controls ────────────────────────────────────────────────────────────

function NumberControl({ entry }: { entry: Entry }) {
  const [bound, setValue] = useControlValue(entry);
  const value = typeof bound === 'number' ? String(bound) : typeof bound === 'string' ? bound : '';
  return (
    <input
      type="number"
      className="metadata-input"
      aria-label={entry.title}
      value={value}
      step="any"
      onChange={(event) => {
        const raw = event.target.value;
        setValue(raw === '' ? null : Number(raw));
      }}
    />
  );
}

function BooleanControl({ entry }: { entry: Entry }) {
  const [bound, setValue] = useControlValue(entry);
  const id = useId();
  return (
    <label htmlFor={id} className="metadata-input metadata-input--boolean">
      <input
        id={id}
        type="checkbox"
        checked={bound === true}
        onChange={(event) => setValue(event.target.checked)}
      />
      <span>{entry.title}</span>
    </label>
  );
}

function SelectControl({ entry }: { entry: Entry }) {
  const [bound, setValue] = useControlValue(entry);
  const current = tokenOf(bound);
  const choices = choicesOf(entry.schema);
  const known = choices.some(([token]) => token === current);
  return (
    <select
      className="metadata-input"
      aria-label={entry.title}
      value={current}
      onChange={(event) => setValue(event.target.value || null)}
    >
      {!entry.schema?.required || !current ? <option value="" /> : null}
      {current && !known ? <option value={current}>{current}</option> : null}
      {choices.map(([token, title]) => (
        <option key={token} value={token}>
          {title}
        </option>
      ))}
    </select>
  );
}

/** Tags and multi-choice: chips plus an entry field with the terms as suggestions. */
function TokensControl({ entry }: { entry: Entry }) {
  const [bound, setValue] = useControlValue(entry);
  const [draft, setDraft] = useState('');
  const listId = useId();
  const choices = choicesOf(entry.schema);
  const titles = new Map(choices);
  const open = entry.schema?.additionalItems !== false;
  const tokens = (Array.isArray(bound) ? bound : []).map(tokenOf).filter(Boolean);

  const add = (candidate: string) => {
    const token = candidate.trim();
    if (!token || tokens.includes(token)) return setDraft('');
    if (!open && !titles.has(token)) return;
    setValue([...tokens, token]);
    setDraft('');
  };
  const remove = (token: string) => setValue(tokens.filter((t) => t !== token));

  return (
    <div className="metadata-input metadata-input--tokens">
      <ul className="metadata-list">
        {tokens.map((token) => (
          <li key={token} className="metadata-item metadata-token">
            <span>{titles.get(token) ?? token}</span>
            <button
              type="button"
              className="metadata-token-remove"
              aria-label={`Remove ${titles.get(token) ?? token}`}
              onClick={() => remove(token)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <input
        type="text"
        className="metadata-token-entry"
        aria-label={entry.title}
        placeholder={open ? 'Add…' : 'Choose…'}
        list={choices.length ? listId : undefined}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => draft && add(draft)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            add(draft);
          } else if (event.key === 'Backspace' && !draft && tokens.length) {
            remove(tokens[tokens.length - 1]);
          }
        }}
      />
      {choices.length ? (
        <datalist id={listId}>
          {choices.map(([token, title]) => (
            <option key={token} value={token}>
              {title}
            </option>
          ))}
        </datalist>
      ) : null}
    </div>
  );
}

/** ISO → what a native date-time input shows, in local time. */
function localDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * A native date input, NOT the host's date picker, on purpose: Aurora's
 * DateTimePicker is a react-aria widget whose segments are contentEditable,
 * and a DOM selection inside a contentEditable element within a Plate void
 * is one slate-react tries to map to a Slate point and throws on ("Cannot
 * resolve a Slate point from DOM point") — the crash overlay, in the
 * wrapper's dev build. A form control keeps its selection to itself and is
 * invisible to Slate, which is also why the text controls are textareas.
 */
function DateControl({ entry }: { entry: Entry }) {
  const [bound, setValue] = useControlValue(entry);
  const value = typeof bound === 'string' ? bound : null;
  const dateOnly = entry.input === 'date';
  return (
    <input
      type={dateOnly ? 'date' : 'datetime-local'}
      className="metadata-input"
      aria-label={entry.title}
      value={value ? (dateOnly ? value.slice(0, 10) : localDateTime(value)) : ''}
      onChange={(event) => {
        const raw = event.target.value;
        if (!raw) return setValue(null);
        setValue(dateOnly ? raw : new Date(raw).toISOString());
      }}
    />
  );
}

/** Related items: the current ones, each removable, and the host's picker to add. */
function RelationsControl({ entry }: { entry: Entry }) {
  const [bound, setValue] = useControlValue(entry);
  const single = entry.schema?.factory === 'Relation Choice' || entry.schema?.type === 'string';
  const items = (Array.isArray(bound) ? bound : bound ? [bound] : []).filter(isRecord);
  const Widget = hostWidget('object_browser');
  const write = (next: Record<string, unknown>[]) => {
    const rows = next.map((item) => ({ '@id': item['@id'], title: item.title }));
    setValue(single ? (rows[0] ?? null) : rows);
  };
  return (
    <div className="metadata-input metadata-input--relations">
      {items.length ? (
        <ul className="metadata-list">
          {items.map((item, index) => (
            <li key={`${String(item['@id'])}:${index}`} className="metadata-item metadata-token">
              <span>{String(item.title ?? item['@id'] ?? '')}</span>
              <button
                type="button"
                className="metadata-token-remove"
                aria-label={`Remove ${String(item.title ?? item['@id'] ?? '')}`}
                onClick={() => write(items.filter((_item, i) => i !== index))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {Widget ? (
        <Widget
          id={entry.id}
          mode={single ? 'single' : 'multiple'}
          widgetOptions={entry.schema?.widgetOptions}
          onChange={(picked: unknown) => {
            const chosen = (Array.isArray(picked) ? picked : picked ? [picked] : []).filter(isRecord);
            write(single ? chosen.slice(0, 1) : [...items, ...chosen]);
          }}
        />
      ) : (
        <p className="metadata-control-note">This host has no content picker.</p>
      )}
    </div>
  );
}

/** An image or file: the current one, an upload to replace it, a way to clear it. */
function FileControl({ entry }: { entry: Entry }) {
  const [bound, setValue] = useControlValue(entry);
  const fileRef = useRef<HTMLInputElement>(null);
  const current = isRecord(bound) ? bound : null;
  const image = entry.kind === 'image';
  const name = current ? String(current.filename ?? '') : '';
  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      setValue({
        data: url.slice(url.indexOf(',') + 1),
        encoding: 'base64',
        filename: file.name,
        'content-type': file.type || 'application/octet-stream',
      });
    };
    reader.readAsDataURL(file);
  };
  return (
    <div className="metadata-input metadata-input--file">
      {current && name ? (
        <span className="metadata-token">
          <span>{name}</span>
          <button
            type="button"
            className="metadata-token-remove"
            aria-label={`Remove ${name}`}
            onClick={() => {
              setValue(null);
              if (fileRef.current) fileRef.current.value = '';
            }}
          >
            ×
          </button>
        </span>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        aria-label={entry.title}
        accept={image ? 'image/*' : undefined}
        onChange={onPick}
      />
    </div>
  );
}

// ── the dispatcher ──────────────────────────────────────────────────────────

export type FieldControlProps = {
  entry: Entry;
  /** What a text control shows while empty: the block's placeholder, else the field's title. */
  placeholder?: string;
};

/** The control for `entry.input`, or `null` for a row the canvas only shows. */
export function FieldControl({ entry, placeholder }: FieldControlProps): ReactNode {
  let control: ReactNode = null;
  switch (entry.input) {
    case 'line':
    case 'text':
      control = <FieldInput entry={entry} placeholder={placeholder} />;
      break;
    case 'number':
      control = <NumberControl entry={entry} />;
      break;
    case 'boolean':
      control = <BooleanControl entry={entry} />;
      break;
    case 'select':
      control = <SelectControl entry={entry} />;
      break;
    case 'tokens':
      control = <TokensControl entry={entry} />;
      break;
    case 'datetime':
    case 'date':
      control = <DateControl entry={entry} />;
      break;
    case 'relations':
      control = <RelationsControl entry={entry} />;
      break;
    case 'file':
      control = <FileControl entry={entry} />;
      break;
    default:
      return null;
  }
  return (
    <div
      className={`metadata-control metadata-control--${entry.input}`}
      data-metadata-control={entry.input}
      onKeyDown={stop}
      onKeyUp={stop}
      onBeforeInput={stop}
      onPaste={stop}
      onCopy={stop}
      onCut={stop}
      onDrop={stop}
    >
      {control}
    </div>
  );
}

export default FieldControl;
