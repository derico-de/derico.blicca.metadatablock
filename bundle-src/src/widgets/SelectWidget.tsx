/**
 * `metadata_select` — a `<select>` over a schema property's `choices`.
 *
 * `Field.tsx` does have a choices lane, but **only the Blicca wrapper
 * registers that slot**; upstream leaves it empty, so a field relying on
 * `choices` alone would render a select in `@@aurora-edit` and a bare text
 * input in Aurora proper. Declaring `widget: 'metadata_select'` sidesteps
 * it: `getWidgetByName` sits above `getWidgetByChoices` in the resolution
 * chain, so the same field resolves to this widget in both hosts.
 *
 * With nothing stored, the control shows the schema's `default` rather than
 * the first choice; displaying it is **not** storing it. A stored value
 * outside `choices` keeps its own option instead of vanishing.
 */
import { FieldShell, controlClass, type FieldShellProps } from './field-shell';

export type MetadataSelectWidgetProps = FieldShellProps & {
  name?: string;
  choices?: Array<[string, string]>;
  defaultValue?: unknown;
  value?: unknown;
  default?: string;
  required?: boolean;
  onChange?: (value: string) => void;
};

export const asText = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

export function MetadataSelectWidget(props: MetadataSelectWidgetProps) {
  const { label, description, className, choices = [], onChange } = props;
  const stored = asText(props.value ?? props.defaultValue);
  const current = stored || asText(props.default);
  const known = choices.some(([value]) => value === current);

  return (
    <FieldShell
      blockClass="metadata-select-widget"
      label={label}
      description={description}
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
          {current === '' ? <option value="" /> : null}
          {current !== '' && !known ? <option value={current}>{current}</option> : null}
          {choices.map(([value, choiceLabel]) => (
            <option key={value} value={value}>
              {choiceLabel}
            </option>
          ))}
        </select>
      )}
    />
  );
}

export default MetadataSelectWidget;
