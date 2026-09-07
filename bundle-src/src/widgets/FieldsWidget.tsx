/**
 * `metadata_fields` — an ordered list of `{field, showLabel}` rows.
 *
 * Aurora registers no `object_list` widget, so the section block brings its
 * own: one row per chosen field with a field select, a label checkbox, move
 * up / move down and remove, plus an add button. It stores exactly what
 * `metadata_data.field_specs` reads and nothing else. The field options come
 * from the same catalog source as `metadata_field`.
 */
import { useCatalog } from '../metadata/catalog-source';
import { fieldSpecs, text, type FieldSpec } from '../metadata/data';
import { FieldShell, controlClass, labelClass, type FieldShellProps } from './field-shell';
import { fieldOptions } from './FieldSelectWidget';

export type MetadataFieldsWidgetProps = FieldShellProps & {
  name?: string;
  catalog?: unknown;
  defaultValue?: unknown;
  value?: unknown;
  onChange?: (value: FieldSpec[]) => void;
};

const buttonClass = 'rounded-md border border-input bg-background px-2 py-1 text-xs';

export function MetadataFieldsWidget(props: MetadataFieldsWidgetProps) {
  const { label, description, className, onChange } = props;
  const { catalog } = useCatalog({ catalog: props.catalog });
  const options = fieldOptions(catalog);
  const specs = fieldSpecs({ fields: props.value ?? props.defaultValue });

  const update = (next: FieldSpec[]) => onChange?.(next);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= specs.length) return;
    const next = [...specs];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    update(next);
  };

  return (
    <FieldShell
      blockClass="metadata-fields-widget"
      label={label}
      description={description}
      className={className}
      render={(controlId) => (
        <div id={controlId} className="flex flex-col gap-2">
          {specs.map((spec, index) => {
            const known = options.some(([value]) => value === spec.field);
            return (
              <div key={`${spec.field}:${index}`} className="metadata-fields-row flex flex-col gap-1">
                <select
                  aria-label={`Field ${index + 1}`}
                  value={spec.field}
                  className={controlClass}
                  onChange={(event) =>
                    update(specs.map((s, i) => (i === index ? { ...s, field: text(event.target.value) } : s)))
                  }
                >
                  {!known ? <option value={spec.field}>{spec.field}</option> : null}
                  {options.map(([value, optionLabel]) => (
                    <option key={value} value={value}>
                      {optionLabel}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <label className={`${labelClass} flex items-center gap-1`}>
                    <input
                      type="checkbox"
                      checked={spec.showLabel}
                      onChange={(event) =>
                        update(specs.map((s, i) => (i === index ? { ...s, showLabel: event.target.checked } : s)))
                      }
                    />
                    Show label
                  </label>
                  <button type="button" className={buttonClass} aria-label={`Move field ${index + 1} up`} disabled={index === 0} onClick={() => move(index, index - 1)}>
                    ↑
                  </button>
                  <button type="button" className={buttonClass} aria-label={`Move field ${index + 1} down`} disabled={index === specs.length - 1} onClick={() => move(index, index + 1)}>
                    ↓
                  </button>
                  <button type="button" className={buttonClass} aria-label={`Remove field ${index + 1}`} onClick={() => update(specs.filter((_s, i) => i !== index))}>
                    ×
                  </button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              const unused = options.find(([value]) => !specs.some((s) => s.field === value));
              update([...specs, { field: unused ? unused[0] : options[0]?.[0] ?? 'title', showLabel: true }]);
            }}
          >
            Add field
          </button>
        </div>
      )}
    />
  );
}

export default MetadataFieldsWidget;
