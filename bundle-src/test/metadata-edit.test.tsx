/**
 * The canvas: the preview each block draws and the notices it adds, in every
 * state the catalog ladder can be in, the live title, and the inline
 * controls for the fields the server marked editable (ADR 0002).
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

  it('previews the value, hrefs dropped, and says where to edit it', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { container } = render(<MetadataEdit data={{ field: 'relatedItems', catalog: CATALOG }} />);
    expect(container.querySelector('.metadata-link')?.getAttribute('href')).toBeNull();
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText(/edited on the Content tab/)).toBeTruthy();
    expect(container.querySelector('textarea')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('asks for a field when none is chosen', () => {
    render(<MetadataEdit data={{ catalog: CATALOG }} />);
    expect(screen.getByText('Choose a field in the sidebar.')).toBeTruthy();
  });

  it('says why an empty shown-only field renders empty, or shows the placeholder', () => {
    const shown = CATALOG.map((row) => (row.id === 'description' ? { ...row, input: '' } : row));
    render(<MetadataEdit data={{ field: 'description', catalog: shown }} />);
    expect(screen.getByText('“Summary” is empty here, so the block renders empty.')).toBeTruthy();
    cleanup();
    render(<MetadataEdit data={{ field: 'description', placeholder: 'None', catalog: shown }} />);
    expect(screen.getByText('“Summary” is empty here, so the placeholder shows.')).toBeTruthy();
    expect(screen.getByText('None')).toBeTruthy();
  });

  it('invites typing into an empty editable field, and says what the page shows meanwhile', () => {
    const { container } = render(<MetadataEdit data={{ field: 'description', catalog: CATALOG }} />);
    expect(screen.getByText(/fill it in\. Until then the page renders the block empty/)).toBeTruthy();
    expect(container.querySelector('textarea')).toBeTruthy();
    expect(container.querySelector('.metadata-value--placeholder')).toBeNull();
    cleanup();
    render(<MetadataEdit data={{ field: 'description', placeholder: 'None', catalog: CATALOG }} />);
    expect(screen.getByText(/Until then the page shows the placeholder/)).toBeTruthy();
    expect(screen.getByPlaceholderText('None')).toBeTruthy();
    expect(screen.queryByText('None')).toBeNull();
  });

  it('says when the page has no such field', () => {
    render(<MetadataEdit data={{ field: 'bogus', catalog: CATALOG }} />);
    expect(screen.getByText('This page has no field “bogus”, so the block renders empty.')).toBeTruthy();
  });

  it('keeps the notices outside the block root and uneditable', () => {
    const { container } = render(<MetadataEdit data={{ field: 'title', catalog: CATALOG }} />);
    const notice = container.querySelector('.metadata-notice')!;
    expect(notice.parentElement).toBe(container);
    expect(notice.getAttribute('contenteditable')).toBe('false');
    expect(container.querySelector('.metadata-block .metadata-notice')).toBeNull();
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
    expect(screen.getByText('“Summary” is edited here and saved with the page.')).toBeTruthy();

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
    expect(screen.getByText('Empty here, so not shown on the page: Summary.')).toBeTruthy();
    expect(screen.getByText(/edited here and saved with the page/)).toBeTruthy();

    fireEvent.change(cell.querySelector('textarea')!, { target: { value: 'Filled in the table' } });
    expect((store.get(formAtom) as any).description).toBe('Filled in the table');
    // Filled now, so the page will show it: the notice goes.
    expect(screen.queryByText(/not shown on the page/)).toBeNull();
  });
});

describe('the Metadata Section block', () => {
  afterEach(cleanup);

  it('asks for fields when none are chosen', () => {
    render(<MetadataSectionEdit data={{ catalog: CATALOG }} />);
    expect(screen.getByText('No fields selected. Add fields in the sidebar.')).toBeTruthy();
  });

  it('names the fields it skipped', () => {
    render(
      <MetadataSectionEdit
        data={{ fields: [{ field: 'title' }, { field: 'description' }, { field: 'bogus' }], catalog: CATALOG }}
      />,
    );
    expect(screen.getByText('Empty here, so not shown on the page: Summary, bogus.')).toBeTruthy();
    expect(screen.getByDisplayValue('A doc')).toBeTruthy();
    expect(screen.getByText(/edited on the Content tab/)).toBeTruthy();
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
    expect(screen.getByText('Loading this page’s fields…')).toBeTruthy();
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

  it('says so when nothing could be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    render(<MetadataSectionEdit data={{ fields: [{ field: 'title' }] }} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText(/could not be loaded for the preview/)).toBeTruthy();
  });
});
