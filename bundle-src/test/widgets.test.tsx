/**
 * The four sidebar widgets: labelled, associated, and storing exactly the
 * shapes the renderers read.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { MetadataBooleanWidget } from '../src/widgets/BooleanWidget';
import { MetadataFieldWidget } from '../src/widgets/FieldSelectWidget';
import { MetadataFieldsWidget } from '../src/widgets/FieldsWidget';
import { MetadataSelectWidget } from '../src/widgets/SelectWidget';

const CATALOG = [
  { id: 'title', title: 'Title', kind: 'text', value: 'A' },
  { id: 'description', title: 'Summary', kind: 'text', value: '' },
];

afterEach(cleanup);

describe('metadata_select', () => {
  it('associates its label and shows the default without storing it', () => {
    const onChange = vi.fn();
    render(
      <MetadataSelectWidget label="Layout" choices={[['list', 'List'], ['table', 'Table']]} default="list" onChange={onChange} />,
    );
    const select = screen.getByLabelText('Layout') as HTMLSelectElement;
    expect(select.value).toBe('list');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(select, { target: { value: 'table' } });
    expect(onChange).toHaveBeenCalledWith('table');
  });

  it('keeps a stored value outside the choices', () => {
    render(<MetadataSelectWidget label="Layout" choices={[['list', 'List']]} value="grid" />);
    expect((screen.getByLabelText('Layout') as HTMLSelectElement).value).toBe('grid');
  });
});

describe('metadata_boolean', () => {
  it('stores a real boolean', () => {
    const onChange = vi.fn();
    render(<MetadataBooleanWidget label="Show label" value={false} onChange={onChange} />);
    const box = screen.getByLabelText('Show label') as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('treats anything but true as unchecked', () => {
    render(<MetadataBooleanWidget label="Show label" value={'yes' as any} />);
    expect((screen.getByLabelText('Show label') as HTMLInputElement).checked).toBe(false);
  });

  it('shows the schema default while nothing is stored, without storing it', () => {
    const onChange = vi.fn();
    render(<MetadataBooleanWidget label="Show in view" default onChange={onChange} />);
    expect((screen.getByLabelText('Show in view') as HTMLInputElement).checked).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
    cleanup();
    // A stored value outranks it, false included.
    render(<MetadataBooleanWidget label="Show in view" defaultValue={false} default />);
    expect((screen.getByLabelText('Show in view') as HTMLInputElement).checked).toBe(false);
  });
});

describe('metadata_field', () => {
  it('offers the catalog’s fields by title and stores the id', () => {
    const onChange = vi.fn();
    render(<MetadataFieldWidget label="Field" catalog={CATALOG} value="" onChange={onChange} />);
    const select = screen.getByLabelText('Field') as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(['— choose a field —', 'Title', 'Summary']);
    fireEvent.change(select, { target: { value: 'description' } });
    expect(onChange).toHaveBeenCalledWith('description');
  });

  it('keeps a stored field the catalog does not know', () => {
    render(<MetadataFieldWidget label="Field" catalog={CATALOG} value="bogus" />);
    expect((screen.getByLabelText('Field') as HTMLSelectElement).value).toBe('bogus');
  });
});

describe('metadata_fields', () => {
  it('adds, toggles, reorders and removes rows, storing {field, showLabel}', () => {
    const onChange = vi.fn();
    const { rerender } = render(<MetadataFieldsWidget label="Fields" catalog={CATALOG} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('Add field'));
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'title', showLabel: true }]);

    rerender(<MetadataFieldsWidget label="Fields" catalog={CATALOG} value={[{ field: 'title', showLabel: true }]} onChange={onChange} />);
    fireEvent.click(screen.getByText('Add field'));
    expect(onChange).toHaveBeenLastCalledWith([
      { field: 'title', showLabel: true },
      { field: 'description', showLabel: true },
    ]);

    const two = [
      { field: 'title', showLabel: true },
      { field: 'description', showLabel: true },
    ];
    rerender(<MetadataFieldsWidget label="Fields" catalog={CATALOG} value={two} onChange={onChange} />);
    fireEvent.click(screen.getAllByLabelText('Show label')[1]);
    expect(onChange).toHaveBeenLastCalledWith([
      { field: 'title', showLabel: true },
      { field: 'description', showLabel: false },
    ]);
    fireEvent.click(screen.getByLabelText('Move field 2 up'));
    expect(onChange).toHaveBeenLastCalledWith([
      { field: 'description', showLabel: true },
      { field: 'title', showLabel: true },
    ]);
    fireEvent.change(screen.getByLabelText('Field 1'), { target: { value: 'description' } });
    expect(onChange).toHaveBeenLastCalledWith([
      { field: 'description', showLabel: true },
      { field: 'description', showLabel: true },
    ]);
    fireEvent.click(screen.getByLabelText('Remove field 1'));
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'description', showLabel: true }]);
  });

  it('reads only well-formed specs out of a stored value', () => {
    render(<MetadataFieldsWidget label="Fields" catalog={CATALOG} value={['x', { field: 'title' }] as any} />);
    expect(screen.getAllByLabelText(/^Field \d/)).toHaveLength(1);
  });
});
