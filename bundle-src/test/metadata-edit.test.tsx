/**
 * The canvas: the preview each block draws and the notices it adds, in every
 * state the catalog ladder can be in, plus the live title.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import config from '@plone/registry';

import MetadataEdit from '../src/metadata/MetadataEdit';
import MetadataSectionEdit from '../src/metadata/MetadataSectionEdit';
import { resetCatalogCache } from '../src/metadata/catalog-source';
import { installUpstreamRegistry } from './upstream-registry';

const CATALOG = [
  { id: 'title', title: 'Title', kind: 'text', value: 'A doc' },
  { id: 'description', title: 'Summary', kind: 'text', value: '' },
  { id: 'relatedItems', title: 'Related', kind: 'links', value: [{ href: 'http://nohost/a', title: 'A' }] },
];

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
    expect(screen.getByText(/Edit them on the Content tab/)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('asks for a field when none is chosen', () => {
    render(<MetadataEdit data={{ catalog: CATALOG }} />);
    expect(screen.getByText('Choose a field in the sidebar.')).toBeTruthy();
  });

  it('says why an empty field renders empty, or shows the placeholder', () => {
    render(<MetadataEdit data={{ field: 'description', catalog: CATALOG }} />);
    expect(screen.getByText('“Summary” is empty here, so the block renders empty.')).toBeTruthy();
    cleanup();
    render(<MetadataEdit data={{ field: 'description', placeholder: 'None', catalog: CATALOG }} />);
    expect(screen.getByText('“Summary” is empty here, so the placeholder shows.')).toBeTruthy();
    expect(screen.getByText('None')).toBeTruthy();
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
    const aurora = installUpstreamRegistry(config as any);
    const formAtom = (aurora as any).getUtility({ name: 'formAtom', type: 'atom' }).method();
    const store = createStore();
    store.set(formAtom, { title: 'Renamed while typing' });
    render(
      <Provider store={store}>
        <MetadataEdit data={{ field: 'title', catalog: CATALOG }} />
      </Provider>,
    );
    expect(screen.getByText('Renamed while typing')).toBeTruthy();
    expect(screen.queryByText('A doc')).toBeNull();
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
    expect(screen.getByText('Empty here, so not shown: Summary, bogus.')).toBeTruthy();
    expect(screen.getByText('A doc')).toBeTruthy();
    expect(screen.getByText(/Edit them on the Content tab/)).toBeTruthy();
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
    expect(screen.getByText('A doc')).toBeTruthy();
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
