/**
 * The canvas: the preview each block draws in every state the catalog ladder
 * can be in, the live title, and the inline controls for the fields the
 * server marked editable (ADR 0002).
 *
 * And nothing besides. What the editor has to SAY about any of those states
 * is the sidebar's (`metadata-notices.test.tsx`); the canvas is the page as
 * the visitor will read it, which is what the first test here holds it to.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import config from '@plone/registry';

import MetadataEdit from '../src/metadata/MetadataEdit';
import MetadataSectionEdit from '../src/metadata/MetadataSectionEdit';
import MetadataView from '../src/metadata/MetadataView';
import { resetCatalogCache } from '../src/metadata/catalog-source';
import { installUpstreamRegistry } from './upstream-registry';

const CATALOG = [
  { id: 'title', title: 'Title', kind: 'text', value: 'A doc', input: 'line' },
  { id: 'description', title: 'Summary', kind: 'text', value: '', input: 'text' },
  { id: 'relatedItems', title: 'Related', kind: 'links', value: [{ href: 'http://nohost/a', title: 'A' }] },
  { id: 'modified', title: 'Modified', kind: 'text', value: 'today' },
];

/** A host: Aurora's registry, whose `formAtom` utility the blocks bind to. */
function host(content: Record<string, unknown>) {
  const aurora = installUpstreamRegistry(config as any);
  const formAtom = (aurora as any).getUtility({ name: 'formAtom', type: 'atom' }).method();
  const store = createStore();
  store.set(formAtom, content);
  return { store, formAtom };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('the Metadata block with the server’s catalog on the node', () => {
  afterEach(cleanup);

  it('previews the value with its hrefs dropped, and fetches nothing', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { container } = render(<MetadataEdit data={{ field: 'relatedItems', catalog: CATALOG }} />);
    expect(container.querySelector('.metadata-link')?.getAttribute('href')).toBeNull();
    expect(screen.getByText('A')).toBeTruthy();
    expect(container.querySelector('textarea')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('shows the placeholder for an empty shown-only field, and nothing for one without', () => {
    const shown = CATALOG.map((row) => (row.id === 'description' ? { ...row, input: '' } : row));
    const bare = render(<MetadataEdit data={{ field: 'description', catalog: shown }} />);
    expect(bare.container.querySelector('.metadata-value')).toBeNull();
    cleanup();
    render(<MetadataEdit data={{ field: 'description', placeholder: 'None', catalog: shown }} />);
    expect(screen.getByText('None')).toBeTruthy();
  });

  it('draws a control for an empty editable field, with the placeholder inside it', () => {
    const { container } = render(<MetadataEdit data={{ field: 'description', catalog: CATALOG }} />);
    expect(container.querySelector('textarea')).toBeTruthy();
    expect(container.querySelector('.metadata-value--placeholder')).toBeNull();
    cleanup();
    render(<MetadataEdit data={{ field: 'description', placeholder: 'None', catalog: CATALOG }} />);
    expect(screen.getByPlaceholderText('None')).toBeTruthy();
    expect(screen.queryByText('None')).toBeNull();
  });

  it('renders empty for a field the page does not have', () => {
    const { container } = render(<MetadataEdit data={{ field: 'bogus', catalog: CATALOG }} />);
    expect(container.querySelector('.metadata-value')).toBeNull();
  });

  it('draws NO notice: the canvas is the page, prose the visitor never sees is the sidebar’s', () => {
    for (const data of [
      {},
      { field: 'bogus' },
      { field: 'title' },
      { field: 'description' },
      { field: 'relatedItems' },
    ] as const) {
      const { container } = render(<MetadataEdit data={{ ...data, catalog: CATALOG }} />);
      expect(container.querySelector('.metadata-notice'), JSON.stringify(data)).toBeNull();
      cleanup();
    }
    const section = render(
      <MetadataSectionEdit data={{ fields: [{ field: 'description' }, { field: 'bogus' }], catalog: CATALOG }} />,
    );
    expect(section.container.querySelector('.metadata-notice')).toBeNull();
  });
});

describe('the live title', () => {
  afterEach(cleanup);

  it('previews the title the host’s form atom holds, not the loaded one', () => {
    const { store } = host({ title: 'Renamed while typing' });
    // Shown-only here (a title this user may not type): still live.
    const shown = CATALOG.map((row) => (row.id === 'title' ? { ...row, input: '' } : row));
    const { container } = render(
      <Provider store={store}>
        <MetadataEdit data={{ field: 'title', catalog: shown }} />
      </Provider>,
    );
    expect(screen.getByText('Renamed while typing')).toBeTruthy();
    expect(screen.queryByText('A doc')).toBeNull();
    expect(container.querySelector('textarea')).toBeNull();
  });
});

describe('inline editing', () => {
  afterEach(cleanup);

  it('binds an editable field to the host’s form atom, both ways', () => {
    const { store, formAtom } = host({ title: 'A doc', description: 'From the atom' });
    render(
      <Provider store={store}>
        <MetadataEdit data={{ field: 'description', showLabel: true, catalog: CATALOG }} />
      </Provider>,
    );
    const control = screen.getByLabelText('Summary') as HTMLTextAreaElement;
    expect(control.tagName).toBe('TEXTAREA');
    expect(control.value).toBe('From the atom');
    expect(control.closest('.metadata-value--text')).toBeTruthy();

    fireEvent.change(control, { target: { value: 'Typed in the canvas\nsecond line' } });
    expect((store.get(formAtom) as any).description).toBe('Typed in the canvas\nsecond line');
    expect((store.get(formAtom) as any).title).toBe('A doc');
    expect(control.value).toBe('Typed in the canvas\nsecond line');
  });

  it('draws no control for a shown-only field, and none on the public view', () => {
    const { container } = render(<MetadataEdit data={{ field: 'modified', catalog: CATALOG }} />);
    expect(container.querySelector('textarea')).toBeNull();
    expect(screen.getByText('today')).toBeTruthy();
    cleanup();
    const view = render(<MetadataView data={{ field: 'description', catalog: CATALOG }} />);
    expect(view.container.querySelector('textarea')).toBeNull();
    expect(view.container.innerHTML).toBe('<div class="metadata-block has--field--description has--kind--text"></div>');
  });

  it('a line folds newlines, swallows Enter, and keeps every key from the editor', () => {
    const { store, formAtom } = host({ title: 'A doc' });
    const editorKeyDown = vi.fn();
    render(
      <Provider store={store}>
        <div onKeyDown={editorKeyDown} onPaste={editorKeyDown}>
          <MetadataEdit data={{ field: 'title', catalog: CATALOG }} />
        </div>
      </Provider>,
    );
    const control = screen.getByLabelText('Title') as HTMLTextAreaElement;
    expect(fireEvent.keyDown(control, { key: 'Enter' })).toBe(false);
    expect(fireEvent.keyDown(control, { key: 'a' })).toBe(true);
    fireEvent.paste(control);
    expect(editorKeyDown).not.toHaveBeenCalled();
    fireEvent.change(control, { target: { value: 'Two\nlines' } });
    expect((store.get(formAtom) as any).title).toBe('Two lines');
  });

  it('shows the block’s placeholder in the control, else the field’s title', () => {
    render(<MetadataEdit data={{ field: 'description', placeholder: 'Sum it up', catalog: CATALOG }} />);
    expect(screen.getByPlaceholderText('Sum it up')).toBeTruthy();
    cleanup();
    render(<MetadataEdit data={{ field: 'description', catalog: CATALOG }} />);
    expect(screen.getByPlaceholderText('Summary')).toBeTruthy();
  });

  it('a section keeps an empty editable field so it can be filled, in a table cell too', () => {
    const { store, formAtom } = host({ title: 'A doc' });
    const { container } = render(
      <Provider store={store}>
        <MetadataSectionEdit
          data={{ layout: 'table', fields: [{ field: 'title' }, { field: 'description' }, { field: 'modified' }], catalog: CATALOG }}
        />
      </Provider>,
    );
    const cell = container.querySelector('tr.has--field--description > td.metadata-value--text')!;
    expect(cell).toBeTruthy();
    expect(container.querySelector('tr.has--field--title textarea')).toBeTruthy();
    expect(container.querySelector('tr.has--field--modified textarea')).toBeNull();

    fireEvent.change(cell.querySelector('textarea')!, { target: { value: 'Filled in the table' } });
    expect((store.get(formAtom) as any).description).toBe('Filled in the table');
  });
});

describe('the Metadata Section block', () => {
  afterEach(cleanup);

  it('renders nothing for a node with no fields chosen', () => {
    const { container } = render(<MetadataSectionEdit data={{ catalog: CATALOG }} />);
    expect(container.querySelector('.metadata-section-list')?.childElementCount ?? 0).toBe(0);
  });

  it('keeps the fields it can draw, skipping the ones the page has nothing for', () => {
    const { container } = render(
      <MetadataSectionEdit
        data={{ fields: [{ field: 'title' }, { field: 'description' }, { field: 'bogus' }], catalog: CATALOG }}
      />,
    );
    expect(screen.getByDisplayValue('A doc')).toBeTruthy();
    expect(container.querySelector('.has--field--bogus')).toBeNull();
  });
});

describe('with a never-serialized node', () => {
  beforeEach(() => {
    resetCatalogCache();
    (config as any).settings.apiPath = 'http://localhost:3000/Plone';
    window.history.pushState({}, '', '/Plone/doc/@@aurora-edit');
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    (config as any).settings.apiPath = undefined;
  });

  it('fetches the page’s catalog and then previews the chosen field', async () => {
    const pending = deferred<{ ok: boolean; json: () => Promise<unknown> }>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetch);

    render(<MetadataEdit data={{ field: 'title' }} />);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/Plone/doc/@metadata-catalog',
      expect.objectContaining({ credentials: 'same-origin' }),
    );

    await act(async () => {
      pending.resolve({ ok: true, json: () => Promise.resolve({ catalog: CATALOG }) });
      await pending.promise;
    });
    expect(screen.getByDisplayValue('A doc')).toBeTruthy();
  });

  it('draws an empty block, not an error, when nothing could be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    const { container } = render(<MetadataSectionEdit data={{ fields: [{ field: 'title' }] }} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelector('.metadata-section-block')).toBeTruthy();
    expect(container.querySelector('.metadata-value')).toBeNull();
  });
});
