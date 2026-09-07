/**
 * `metadata_field` — a `<select>` over the page's fields.
 *
 * The options are the catalog's rows: the schema passes the node's stored
 * `catalog` through as a prop, and for a never-serialized node the widget
 * fetches one itself through the same one-request-per-page cache the canvas
 * uses (`useCatalog`), so the sidebar and the canvas never disagree about
 * which fields exist. A stored field the catalog does not know keeps its own
 * option, so the control never claims another field is selected.
 */
import { useCatalog } from '../metadata/catalog-source';
import { text, type Row } from '../metadata/data';
import { FieldShell, controlClass, type FieldShellProps } from './field-shell';
import { asText } from './SelectWidget';

export type MetadataFieldWidgetProps = FieldShellProps & {
  name?: string;
  /** The node's derived catalog, spread from the schema property. */
  catalog?: unknown;
  defaultValue?: unknown;
  value?: unknown;
  required?: boolean;
  onChange?: (value: string) => void;
};

export function fieldOptions(rows: Row[] | null): Array<[string, string]> {
  return (rows ?? []).map((row) => [row.id, row.title || row.id]);
}

export function MetadataFieldWidget(props: MetadataFieldWidgetProps) {
  const { label, description, className, onChange } = props;
  const { catalog, state } = useCatalog({ catalog: props.catalog });
  const options = fieldOptions(catalog);
  const current = text(asText(props.value ?? props.defaultValue));
  const known = options.some(([value]) => value === current);

  return (
    <FieldShell
      blockClass="metadata-field-widget"
      label={label}
      description={state === 'loading' ? 'Loading this page’s fields…' : description}
      className={className}
      render={(controlId) => (
        <select
          id={controlId}
          name={props.name}
          required={props.required}
          value={current}
          onChange={(event) => onChange?.(event.target.value)}
          className={controlClass}
        >
          <option value="">— choose a field —</option>
          {current && !known ? <option value={current}>{current}</option> : null}
          {options.map(([value, optionLabel]) => (
            <option key={value} value={value}>
              {optionLabel}
            </option>
          ))}
        </select>
      )}
    />
  );
}

export default MetadataFieldWidget;
