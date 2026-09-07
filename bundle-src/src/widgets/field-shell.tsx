/**
 * The label/description chrome the three metadata widgets share.
 *
 * Why a shell at all: `BlockSettingsFormRenderer` renders **no label of its
 * own** — it passes the schema title down as the `label` PROP
 * (`label={schema.properties[field.name].title}`) and `Field.tsx` re-applies
 * it (`label: fieldProps.title`). A widget that ignores the prop produces an
 * anonymous control, which is how Blicca's listing block came out with
 * unnamed selects before `BliccaChoicesWidget` existed. All three of ours go
 * through here so none can regress that way.
 *
 * Why the id is generated: the renderer passes `name`, `defaultValue`,
 * `required` and `error` — but **never `id`**. `props.id` is therefore
 * `undefined` in the block sidebar, so `htmlFor={props.id}` (the shape
 * `BliccaObjectBrowserWidget` and `BliccaChoicesWidget` both use) silently
 * associates nothing. `useId()` gives every control a real association,
 * which is ticket 07's accessibility requirement.
 *
 * Why these class names: the block's own stylesheet cannot reach here.
 * `metadata-block.css` is scope-wrapped to `.aurora-editor`,
 * `.aurora-editor-portal` and `.aurora-blocks-view` (contract §6.1) — roots
 * that exist in Blicca and nowhere in Aurora proper, whose sidebar is its
 * own app shell. So the visual metrics are the host's own Tailwind utilities,
 * copied from `BliccaChoicesWidget`, which in turn copied cmsui's
 * `components/Field/Field.tsx`. They style the widget wherever cmsui's sheet
 * is loaded and degrade to unstyled-but-usable markup where it is not. The
 * `metadata-*-widget` classes are ours, for a hook that never depends on
 * Tailwind being present.
 */
import { useId, type ReactNode } from 'react';

export const labelClass =
  'w-fit cursor-default text-xs font-medium text-quanta-pigeon';

export const controlClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

export type FieldShellProps = {
  /** The schema title, arriving as `label` (see the module docstring). */
  label?: string;
  /** The schema `description`, spread through by the renderer. */
  description?: string;
  className?: string;
};

/**
 * Renders label → control → description, and hands the control the id the
 * label points at. `render` receives that id rather than the shell wrapping
 * the child, so each widget keeps ownership of its own element and props.
 */
export function FieldShell({
  label,
  description,
  className,
  blockClass,
  render,
}: FieldShellProps & {
  blockClass: string;
  render: (controlId: string) => ReactNode;
}) {
  const controlId = useId();
  return (
    <div
      className={`${blockClass} flex flex-col gap-1${className ? ` ${className}` : ''}`}
    >
      {label ? (
        <label htmlFor={controlId} className={labelClass}>
          {label}
        </label>
      ) : null}
      {render(controlId)}
      {description ? (
        <p className="text-xs font-normal text-quanta-pigeon">{description}</p>
      ) : null}
    </div>
  );
}
