/**
 * Reading the Metadata blocks' stored JSON — the one place the rules that
 * decide *what renders* live on this side of the blocks.
 *
 * The **server half (`metadata_data.py`) implements the same rules against
 * the same data**: two renderers in two languages, one scope-wrapped
 * stylesheet dressing both. A change here is a change to both, and the
 * anatomy fixture plus the Python parity test are what catch a one-sided
 * edit.
 *
 * Nothing here reads a field off the content item. What both renderers read
 * is the `catalog` the server's serializer injects at load time — every
 * offered field of the content item as an `{id, title, kind, value}` row,
 * the value already reduced to one of seven display kinds — and strips again
 * on save. The canvas only ever *fetches* one (see `catalog-source.ts`) when
 * it holds a node the server has never serialized.
 */

/** Everything the two renderers read. `unknown`, because nothing is required. */
export type MetadataData = {
  field?: unknown;
  showInView?: unknown;
  showLabel?: unknown;
  placeholder?: unknown;
  /** Injected by the server's serializer; never authored, never persisted. */
  catalog?: unknown;
};

export type MetadataSectionData = {
  title?: unknown;
  layout?: unknown;
  fields?: unknown;
  catalog?: unknown;
};

/**
 * The display kinds a catalog row's `value` can take. The server reduces
 * every Dexterity field type to one of these at derivation time, so the
 * renderers know seven shapes and no field types.
 * PARITY: `metadata_data.KINDS`. Extended together or not at all.
 */
export const KINDS = ['text', 'richtext', 'list', 'tags', 'links', 'image', 'file'] as const;

export type Kind = (typeof KINDS)[number];

/**
 * The inline controls the canvas can draw for a row, named by the server
 * per field from its type (ADR 0002): a text line, multi-line text, a
 * number, a yes/no, a select over the field's terms, tokens (tags,
 * multi-choice), a date-time, a date, related items, an uploaded file or
 * image. A row with none is shown, not edited, in the canvas; the `view`
 * never reads it. PARITY: `metadata_data.INPUTS`.
 */
export const INPUTS = [
  'line',
  'text',
  'number',
  'boolean',
  'select',
  'tokens',
  'datetime',
  'date',
  'relations',
  'file',
] as const;

export type Input = (typeof INPUTS)[number] | '';

/** What an editable row's `schema` may carry that a control reads. */
export type FieldSchema = {
  /** `[[token, title], …]` — the field's terms, inlined by the server. */
  choices?: Array<[string, string]>;
  /** Whether a token control may take a value outside `choices`. */
  additionalItems?: boolean;
  required?: boolean;
  widgetOptions?: Record<string, unknown>;
  [key: string]: unknown;
};

/** The section block's two layouts, in sidebar order. PARITY with `metadata_data.LAYOUTS`. */
export const LAYOUTS = [
  ['list', 'List'],
  ['table', 'Table'],
] as const;

export type Layout = (typeof LAYOUTS)[number][0];

export const LAYOUT_IDS: readonly string[] = LAYOUTS.map(([id]) => id);

/**
 * A layout that was never stored, or is not one the block offers, renders
 * the list. Applied in BOTH renderers rather than trusted from the schema's
 * `default`, which is spread into the widget as a prop and is not reliably
 * written to the node.
 */
export const DEFAULT_LAYOUT = 'list';

/**
 * The schemes a link or image URL may carry. The catalog is derived data the
 * server computed, but it travels inside a JSON node anyone with API access
 * can hand-author, so the renderers screen it like typed input. An
 * allowlist, not a blocklist. PARITY with `metadata_data.LINK_SCHEMES`.
 */
export const LINK_SCHEMES = ['http', 'https', 'mailto', 'tel'] as const;

/**
 * Every key the serializer injects and the deserializer strips, named on
 * this side so it can be held level with the Python spelling
 * (`metadata_transform.DERIVED_FIELDS`). The schema suite reads it to assert
 * that no derived key is ever offered to an author.
 */
export const DERIVED_KEYS = ['catalog'] as const;

export type Row = {
  id: string;
  title: string;
  kind: Kind;
  value: unknown;
  input: Input;
  /** With an `input`: the field's restapi value, as the content PATCH takes it back. */
  raw?: unknown;
  /** With an `input`: the field's `@types` property, terms inlined. */
  schema?: FieldSchema;
};

export type Link = { href: string; title: string };
export type Image = { src: string; alt: string };
export type Value = string | string[] | Link[] | Image | Link;

export type Entry = {
  id: string;
  title: string;
  kind: Kind | '';
  value: Value | null;
  label: string;
  css: string;
  /** The inline control the canvas may draw for this field; `''` on the public page's terms. */
  input: Input;
  raw?: unknown;
  schema?: FieldSchema;
};

export type MetadataEntry = Entry & { placeholder: string };

export type FieldSpec = { field: string; showLabel: boolean };

/** A field id that may become a class modifier. */
const SLUG = /^[A-Za-z0-9_-]+$/;

export function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * `value` if it is a usable URL of an allowed scheme, `''` otherwise. A value
 * with no scheme at all is a path and passes; `//host/x` is rejected.
 */
export function screenLink(value: unknown): string {
  const raw = text(value);
  if (!raw || raw.startsWith('//')) return '';
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(raw);
  if (!scheme) return raw;
  return (LINK_SCHEMES as readonly string[]).includes(scheme[1].toLowerCase()) ? raw : '';
}

/** `fieldId` if it may become a class modifier, else `''`. */
export function fieldSlug(fieldId: unknown): string {
  const slug = text(fieldId);
  return slug && SLUG.test(slug) ? slug : '';
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * The derived catalog's well-formed rows, or `null` when the node carries no
 * catalog at all — which is every node the server has never serialized: a
 * freshly inserted block, an API-authored one, a fixture. `null` rather than
 * `[]` so the editor can tell "never derived" from "derived and empty"
 * (`catalog-source.ts`). A row must carry a slug `id`, a string `title` and
 * a `kind` the renderers know; anything else is not a row. `input` is one
 * of `INPUTS` or `''`.
 */
export function catalog(data: { catalog?: unknown }): Row[] | null {
  const value = data.catalog;
  if (!Array.isArray(value)) return null;
  const rows: Row[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const id = fieldSlug(raw.id);
    const kind = text(raw.kind);
    if (!id || !(KINDS as readonly string[]).includes(kind)) continue;
    const control = text(raw.input);
    const row: Row = {
      id,
      title: text(raw.title),
      kind: kind as Kind,
      value: raw.value,
      input: (INPUTS as readonly string[]).includes(control) ? (control as Input) : '',
    };
    if (row.input) {
      row.raw = raw.raw;
      row.schema = isRecord(raw.schema) ? (raw.schema as FieldSchema) : {};
    }
    rows.push(row);
  }
  return rows;
}

/** The catalog row for `fieldId`, or `null`. */
export function rowFor(data: { catalog?: unknown }, fieldId: unknown): Row | null {
  const wanted = text(fieldId);
  if (!wanted) return null;
  return (catalog(data) ?? []).find((row) => row.id === wanted) ?? null;
}

function link(value: unknown): Link | null {
  if (!isRecord(value)) return null;
  const href = screenLink(value.href);
  const title = text(value.title);
  return href && title ? { href, title } : null;
}

/**
 * The display value of `kind`, or `null` when there is nothing to show.
 * Rows carry raw catalog values; this is where they are screened. A row
 * whose value fails its shape renders nothing, exactly as an empty one.
 */
export function resolveValue(kind: string, value: unknown): Value | null {
  if (kind === 'text' || kind === 'richtext') return text(value) || null;
  if (kind === 'list') {
    const items = (Array.isArray(value) ? value : []).map(text).filter(Boolean);
    return items.length ? items : null;
  }
  if (kind === 'tags' || kind === 'links') {
    const links = (Array.isArray(value) ? value : []).map(link).filter((l): l is Link => !!l);
    return links.length ? links : null;
  }
  if (kind === 'image') {
    if (!isRecord(value)) return null;
    const src = screenLink(value.src);
    return src ? { src, alt: text(value.alt) } : null;
  }
  if (kind === 'file') return link(value);
  return null;
}

/**
 * One rendered field. `label` is the title when the author asked for it,
 * else `''`; `value` is the resolved display value or `null`; `css` is the
 * class list of the field's root element, in both the single block and a
 * section's list rows.
 */
export function entry(row: Row, showLabel: boolean): Entry {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    value: resolveValue(row.kind, row.value),
    label: showLabel && row.title ? row.title : '',
    css: `metadata-block has--field--${row.id} has--kind--${row.kind}`,
    input: row.input,
    ...(row.input ? { raw: row.raw, schema: row.schema } : {}),
  };
}

// ── the Metadata block ───────────────────────────────────────────────────────

export function storedField(data: MetadataData): string {
  return text(data.field);
}

export function showLabel(data: MetadataData): boolean {
  return data.showLabel === true;
}

/**
 * Whether the block renders for a VISITOR. `true` unless the author turned
 * it off, so every node authored before the setting existed keeps rendering
 * — which is why this is the one boolean of the block read as "not false"
 * rather than "is true".
 *
 * Off, the block is an editing surface and nothing else: the canvas draws it
 * so the field can be filled in (a lead image the theme already renders
 * above the content, say), and the public page emits nothing at all — not
 * the root, not the placeholder — so the host drops the wrapper band with
 * it. PARITY: `metadata_data.show_in_view`.
 */
export function showInView(data: MetadataData): boolean {
  return data.showInView !== false;
}

export function placeholder(data: MetadataData): string {
  return text(data.placeholder);
}

/**
 * What the Metadata block renders. The root is emitted always. With a stored
 * field the root carries `has--field--<id>`, and — when the catalog knows
 * the field — its kind too. The label renders only for a known field; the
 * placeholder only when a field is stored and there is no value to show.
 */
export function metadataEntry(data: MetadataData): MetadataEntry {
  const fieldId = storedField(data);
  const row = rowFor(data, fieldId);
  if (row) {
    const found = entry(row, showLabel(data));
    return { ...found, placeholder: found.value === null ? placeholder(data) : '' };
  }
  const slug = fieldSlug(fieldId);
  return {
    id: slug,
    title: '',
    kind: '',
    value: null,
    label: '',
    css: slug ? `metadata-block has--field--${slug}` : 'metadata-block',
    input: '',
    placeholder: fieldId ? placeholder(data) : '',
  };
}

// ── the Metadata Section block ───────────────────────────────────────────────

export function sectionTitle(data: MetadataSectionData): string {
  return text(data.title);
}

/** The layout that renders: the stored one if offered, else the default. */
export function effectiveLayout(data: MetadataSectionData): Layout {
  const stored = text(data.layout);
  return (LAYOUT_IDS.includes(stored) ? stored : DEFAULT_LAYOUT) as Layout;
}

/**
 * The stored field list, well-formed. A spec that names no field is skipped;
 * anything that is not an object is skipped; a field named twice renders
 * twice, as authored.
 */
export function fieldSpecs(data: MetadataSectionData): FieldSpec[] {
  const value = data.fields;
  if (!Array.isArray(value)) return [];
  const specs: FieldSpec[] = [];
  for (const spec of value) {
    if (!isRecord(spec)) continue;
    const field = text(spec.field);
    if (field) specs.push({ field, showLabel: spec.showLabel === true });
  }
  return specs;
}

/**
 * The fields that render, in stored order, each with a value to show. A
 * field the catalog does not know and a field with nothing to show both
 * render nothing.
 *
 * `keepEmpty` is the CANVAS's one departure from that rule, with no Python
 * twin: an empty field the author may type into is kept so it can be
 * filled. The public renderers never pass it.
 */
export function sectionEntries(
  data: MetadataSectionData,
  keepEmpty?: (candidate: Entry) => boolean,
): Entry[] {
  const found: Entry[] = [];
  for (const spec of fieldSpecs(data)) {
    const row = rowFor(data, spec.field);
    if (!row) continue;
    const candidate = entry(row, spec.showLabel);
    if (candidate.value !== null || keepEmpty?.(candidate)) found.push(candidate);
  }
  return found;
}
