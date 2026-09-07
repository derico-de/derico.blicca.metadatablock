/**
 * `metadata_boolean` — a labelled checkbox.
 *
 * Both hosts register a `boolean` widget, but not the same one: Aurora's is
 * `@plone/components`' `Checkbox`, whose props (`isSelected`, `children`)
 * are not the ones the block sidebar passes (`value`, `label`), and Blicca
 * substitutes an adapter. A namespaced widget of our own is the same
 * control in both hosts, and it stores a real boolean — the renderers
 * accept `true` and nothing else as a label request.
 */
import { FieldShell, labelClass, type FieldShellProps } from './field-shell';

export type MetadataBooleanWidgetProps = FieldShellProps & {
  name?: string;
  defaultValue?: unknown;
  value?: unknown;
  onChange?: (value: boolean) => void;
};

export function MetadataBooleanWidget(props: MetadataBooleanWidgetProps) {
  const { description, className, onChange } = props;
  const checked = (props.value ?? props.defaultValue) === true;

  return (
    <FieldShell
      blockClass="metadata-boolean-widget"
      description={description}
      className={className}
      render={(controlId) => (
        <label htmlFor={controlId} className={`${labelClass} flex items-center gap-2`}>
          <input
            id={controlId}
            type="checkbox"
            name={props.name}
            checked={checked}
            onChange={(event) => onChange?.(event.target.checked)}
          />
          {props.label}
        </label>
      )}
    />
  );
}

export default MetadataBooleanWidget;
