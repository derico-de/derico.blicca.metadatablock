/**
 * The inline controls, one per `input` (ADR 0002): each binds its field in
 * the host's form atom and writes the shape the content PATCH takes back.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import config from '@plone/registry';

import MetadataEdit from '../src/metadata/MetadataEdit';
import MetadataView from '../src/metadata/MetadataView';
import { installUpstreamRegistry } from './upstream-registry';

const ROWS = {
  count: { id: 'count', title: 'Count', kind: 'text', value: '3', input: 'number', raw: 3, schema: { type: 'integer' } },
  hidden: {
    id: 'exclude_from_nav', title: 'Exclude', kind: 'text', value: 'No', input: 'boolean', raw: false, schema: { type: 'boolean' },
  },
  language: {
    id: 'language', title: 'Language', kind: 'text', value: 'English', input: 'select',
    raw: { token: 'en', title: 'English' }, schema: { choices: [['en', 'English'], ['de', 'Deutsch']] },
  },
  subjects: {
    id: 'subjects', title: 'Tags', kind: 'list', value: ['Plone'], input: 'tokens',
    raw: ['Plone'], schema: { choices: [['Plone', 'Plone'], ['Aurora', 'Aurora']], additionalItems: true },
  },
  picks: {
    id: 'picks', title: 'Picks', kind: 'list', value: ['A'], input: 'tokens',
    raw: [{ token: 'a', title: 'A' }], schema: { choices: [['a', 'A'], ['b', 'B']], additionalItems: false },
  },
  effective: {
    id: 'effective', title: 'Effective', kind: 'text', value: null, input: 'datetime', raw: null, schema: { widget: 'datetime' },
  },
  when: { id: 'when', title: 'When', kind: 'text', value: '7.9.2026', input: 'date', raw: '2026-09-07', schema: {} },
  related: {
    id: 'relatedItems', title: 'Related', kind: 'links', value: [{ href: '/a', title: 'A' }], input: 'relations',
    raw: [{ '@id': 'http://nohost/a', title: 'A' }], schema: { factory: 'Relation List', type: 'array' },
  },
  image: {
    id: 'image', title: 'Image', kind: 'image', value: { src: '/i.jpg', alt: '' }, input: 'file',
    raw: { filename: 'i.jpg', download: '/i.jpg' }, schema: {},
  },
};

const CATALOG = Object.values(ROWS);

function host(content: Record<string, unknown>) {
  const aurora = installUpstreamRegistry(config as any);
  const formAtom = (aurora as any).getUtility({ name: 'formAtom', type: 'atom' }).method();
  const store = createStore();
  store.set(formAtom, content);
  return { store, formAtom, aurora };
}

function mount(field: string, content: Record<string, unknown>) {
  const { store, formAtom } = host(content);
  const utils = render(
    <Provider store={store}>
      <MetadataEdit data={{ field, catalog: CATALOG }} />
    </Provider>,
  );
  return { ...utils, atom: () => store.get(formAtom) as Record<string, unknown> };
}

describe('every control', () => {
  afterEach(cleanup);

  it('sits inside the value element of its kind, wrapped as a control, and never on the public view', () => {
    const { container } = mount('subjects', { subjects: ['Plone'] });
    const control = container.querySelector('.metadata-value--list > .metadata-control--tokens')!;
    expect(control.getAttribute('data-metadata-control')).toBe('tokens');
    cleanup();
    const view = render(<MetadataView data={{ field: 'subjects', catalog: CATALOG }} />);
    expect(view.container.querySelector('.metadata-control')).toBeNull();
    expect(view.container.querySelector('.metadata-item')?.textContent).toBe('Plone');
  });

  it('keeps every key and clipboard event from the editor', () => {
    const { store } = host({ language: 'en' });
    const editor = vi.fn();
    render(
      <Provider store={store}>
        <div onKeyDown={editor} onKeyUp={editor} onPaste={editor} onCopy={editor}>
          <MetadataEdit data={{ field: 'language', catalog: CATALOG }} />
        </div>
      </Provider>,
    );
    const select = screen.getByLabelText('Language');
    fireEvent.keyDown(select, { key: 'ArrowDown' });
    fireEvent.keyUp(select, { key: 'ArrowDown' });
    fireEvent.paste(select);
    fireEvent.copy(select);
    expect(editor).not.toHaveBeenCalled();
  });
});

describe('what counts as filled', () => {
  afterEach(cleanup);

  it('follows the atom for every control, so the notices keep up with the author', () => {
    const { store, formAtom, aurora } = host({ relatedItems: [], effective: null, exclude_from_nav: false });
    // Aurora's own object browser wants a router; the picker is not the point here.
    const widgets = (aurora as any).widgets;
    const before = widgets.widget.object_browser;
    widgets.widget.object_browser = () => null;
    try {
    render(
      <Provider store={store}>
        <MetadataEdit data={{ field: 'relatedItems', catalog: CATALOG }} />
        <MetadataEdit data={{ field: 'effective', catalog: CATALOG }} />
        <MetadataEdit data={{ field: 'exclude_from_nav', catalog: CATALOG }} />
      </Provider>,
    );
    expect(screen.getByText(/“Related” is empty here/)).toBeTruthy();
    expect(screen.getByText(/“Effective” is empty here/)).toBeTruthy();
    // a boolean is never "empty": false is an answer
    expect(screen.getByText('“Exclude” is edited here and saved with the page.')).toBeTruthy();
    act(() => {
      store.set(formAtom, { ...(store.get(formAtom) as object), relatedItems: [{ '@id': '/a', title: 'A' }], effective: '2026-09-08T00:00:00Z' });
    });
    expect(screen.queryByText(/“Related” is empty here/)).toBeNull();
    expect(screen.queryByText(/“Effective” is empty here/)).toBeNull();
    } finally {
      widgets.widget.object_browser = before;
    }
  });
});

describe('number', () => {
  afterEach(cleanup);
  it('writes a number, and null when cleared', () => {
    const { atom } = mount('count', { count: 3 });
    const input = screen.getByLabelText('Count') as HTMLInputElement;
    expect(input.value).toBe('3');
    fireEvent.change(input, { target: { value: '4.5' } });
    expect(atom().count).toBe(4.5);
    fireEvent.change(input, { target: { value: '' } });
    expect(atom().count).toBeNull();
  });
});

describe('boolean', () => {
  afterEach(cleanup);
  it('is a checkbox named after the field, writing true and false', () => {
    const { atom } = mount('exclude_from_nav', { exclude_from_nav: false });
    const box = screen.getByLabelText('Exclude') as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(atom().exclude_from_nav).toBe(true);
    fireEvent.click(box);
    expect(atom().exclude_from_nav).toBe(false);
  });
});

describe('select', () => {
  afterEach(cleanup);
  it('shows the current token whichever shape restapi gave it, and writes a token', () => {
    const { atom } = mount('language', { language: { token: 'en', title: 'English' } });
    const select = screen.getByLabelText('Language') as HTMLSelectElement;
    expect(select.value).toBe('en');
    fireEvent.change(select, { target: { value: 'de' } });
    expect(atom().language).toBe('de');
    expect(select.value).toBe('de');
    fireEvent.change(select, { target: { value: '' } });
    expect(atom().language).toBeNull();
  });
});

describe('tokens', () => {
  afterEach(cleanup);

  it('shows the tags as chips, adds on Enter or comma, removes by button or Backspace', () => {
    const { atom, container } = mount('subjects', { subjects: ['Plone'] });
    expect(container.querySelector('.metadata-token span')?.textContent).toBe('Plone');
    const entry = screen.getByLabelText('Tags') as HTMLInputElement;
    fireEvent.change(entry, { target: { value: 'Aurora' } });
    fireEvent.keyDown(entry, { key: 'Enter' });
    expect(atom().subjects).toEqual(['Plone', 'Aurora']);
    expect(entry.value).toBe('');
    fireEvent.change(entry, { target: { value: 'Blicca' } });
    fireEvent.keyDown(entry, { key: ',' });
    expect(atom().subjects).toEqual(['Plone', 'Aurora', 'Blicca']);
    fireEvent.keyDown(entry, { key: 'Backspace' });
    expect(atom().subjects).toEqual(['Plone', 'Aurora']);
    fireEvent.click(screen.getByLabelText('Remove Plone'));
    expect(atom().subjects).toEqual(['Aurora']);
    // suggestions from the server's terms
    expect(container.querySelector('datalist option[value="Aurora"]')).toBeTruthy();
  });

  it('adds a pending entry on blur and never a duplicate', () => {
    const { atom } = mount('subjects', { subjects: ['Plone'] });
    const entry = screen.getByLabelText('Tags') as HTMLInputElement;
    fireEvent.change(entry, { target: { value: 'Plone' } });
    fireEvent.blur(entry);
    expect(atom().subjects).toEqual(['Plone']);
    fireEvent.change(entry, { target: { value: ' Aurora ' } });
    fireEvent.blur(entry);
    expect(atom().subjects).toEqual(['Plone', 'Aurora']);
  });

  it('a closed multi-choice shows titles, writes tokens, and refuses a stranger', () => {
    const { atom, container } = mount('picks', { picks: [{ token: 'a', title: 'A' }] });
    expect(container.querySelector('.metadata-token span')?.textContent).toBe('A');
    const entry = screen.getByLabelText('Picks') as HTMLInputElement;
    fireEvent.change(entry, { target: { value: 'zzz' } });
    fireEvent.keyDown(entry, { key: 'Enter' });
    expect(atom().picks).toEqual([{ token: 'a', title: 'A' }]);
    fireEvent.change(entry, { target: { value: 'b' } });
    fireEvent.keyDown(entry, { key: 'Enter' });
    expect(atom().picks).toEqual(['a', 'b']);
  });
});

describe('dates', () => {
  afterEach(cleanup);

  it('is a native input — never the host’s contentEditable picker — writing ISO, and null when cleared', () => {
    const { aurora } = host({});
    expect((aurora as any).getWidget('datetime')).toBeTruthy(); // the host has one; we still do not use it
    const { atom, container } = mount('effective', { effective: '2026-09-07T10:30:00+00:00' });
    expect(container.querySelector('[contenteditable="true"]')).toBeNull();
    const input = screen.getByLabelText('Effective') as HTMLInputElement;
    expect(input.type).toBe('datetime-local');
    expect(input.value).toMatch(/^2026-09-07T\d\d:\d\d$/);
    fireEvent.change(input, { target: { value: '2026-09-08T11:45' } });
    expect(new Date(atom().effective as string).getTime()).toBe(new Date('2026-09-08T11:45').getTime());
    fireEvent.change(input, { target: { value: '' } });
    expect(atom().effective).toBeNull();
    cleanup();
    const day = mount('when', { when: '2026-09-07' });
    const dayInput = screen.getByLabelText('When') as HTMLInputElement;
    expect(dayInput.type).toBe('date');
    expect(dayInput.value).toBe('2026-09-07');
    fireEvent.change(dayInput, { target: { value: '2026-10-01' } });
    expect(day.atom().when).toBe('2026-10-01');
  });
});

describe('relations', () => {
  afterEach(cleanup);

  it('lists the current items removably and adds what the host’s picker returns, as @id rows', () => {
    const { aurora } = host({});
    const widgets = (aurora as any).widgets;
    const before = widgets.widget.object_browser;
    widgets.widget.object_browser = (props: any) => (
      <button type="button" onClick={() => props.onChange([{ '@id': 'http://nohost/b', title: 'B', UID: 'x' }])}>
        browse {props.mode}
      </button>
    );
    try {
      const { atom } = mount('relatedItems', { relatedItems: [{ '@id': 'http://nohost/a', title: 'A' }] });
      expect(screen.getByText('A')).toBeTruthy();
      fireEvent.click(screen.getByText('browse multiple'));
      expect(atom().relatedItems).toEqual([
        { '@id': 'http://nohost/a', title: 'A' },
        { '@id': 'http://nohost/b', title: 'B' },
      ]);
      fireEvent.click(screen.getByLabelText('Remove A'));
      expect(atom().relatedItems).toEqual([{ '@id': 'http://nohost/b', title: 'B' }]);
    } finally {
      widgets.widget.object_browser = before;
    }
  });

  it('says so where the host has no picker', () => {
    const { aurora } = host({});
    const widgets = (aurora as any).widgets;
    const before = widgets.widget.object_browser;
    delete widgets.widget.object_browser;
    try {
      mount('relatedItems', {});
      expect(screen.getByText('This host has no content picker.')).toBeTruthy();
    } finally {
      widgets.widget.object_browser = before;
    }
  });
});

describe('file', () => {
  afterEach(cleanup);

  it('shows the current file, uploads a picked one as base64, and clears to null', async () => {
    const { atom } = mount('image', { image: { filename: 'i.jpg', download: '/i.jpg' } });
    expect(screen.getByText('i.jpg')).toBeTruthy();
    const input = screen.getByLabelText('Image') as HTMLInputElement;
    expect(input.accept).toBe('image/*');
    const file = new File([new Uint8Array([71, 73, 70])], 'dot.gif', { type: 'image/gif' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(atom().image).toEqual({
      data: 'R0lG',
      encoding: 'base64',
      filename: 'dot.gif',
      'content-type': 'image/gif',
    });
    expect(screen.getByText('dot.gif')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Remove dot.gif'));
    expect(atom().image).toBeNull();
  });
});
