/**
 * The sidebar's notices: every state the catalog ladder can be in, every
 * state a chosen field can be in, and the promise that they follow the
 * author's typing rather than the loaded content.
 *
 * Driven the way the settings panel drives them — the widget, with the
 * block's data as its `data` prop, which is what `MetadataSchema` puts in
 * the property. The canvas's own half of the same states lives in
 * `metadata-edit.test.tsx`, which asserts it draws none of this.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import config from '@plone/registry';

import { MetadataNoticeWidget, MetadataSectionNoticeWidget } from '../src/widgets/NoticeWidget';
import { resetCatalogCache } from '../src/metadata/catalog-source';
import { installUpstreamRegistry } from './upstream-registry';

const CATALOG = [
  { id: 'title', title: 'Title', kind: 'text', value: 'A doc', input: 'line' },
  { id: 'description', title: 'Summary', kind: 'text', value: '', input: 'text' },
  { id: 'relatedItems', title: 'Related', kind: 'links', value: [{ href: 'http://nohost/a', title: 'A' }] },
  { id: 'modified', title: 'Modified', kind: 'text', value: 'today' },
];

/** A host: Aurora's registry, whose `formAtom` utility the notices read. */
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

describe('the Metadata block’s notices', () => {
  afterEach(cleanup);

  it('asks for a field when none is chosen', () => {
    render(<MetadataNoticeWidget data={{ catalog: CATALOG }} />);
    expect(screen.getByText('Choose a field below.')).toBeTruthy();
  });

  it('says when the page has no such field', () => {
    render(<MetadataNoticeWidget data={{ field: 'bogus', catalog: CATALOG }} />);
    expect(screen.getByText('This page has no field “bogus”, so the block renders empty.')).toBeTruthy();
  });

  it('says why an empty shown-only field renders empty, or shows the placeholder', () => {
    const shown = CATALOG.map((row) => (row.id === 'description' ? { ...row, input: '' } : row));
    render(<MetadataNoticeWidget data={{ field: 'description', catalog: shown }} />);
    expect(screen.getByText('“Summary” is empty on this page, so the block renders empty.')).toBeTruthy();
    cleanup();
    render(<MetadataNoticeWidget data={{ field: 'description', placeholder: 'None', catalog: shown }} />);
    expect(screen.getByText('“Summary” is empty on this page, so the placeholder shows.')).toBeTruthy();
  });

  it('invites typing into an empty editable field, and says what the page shows meanwhile', () => {
    render(<MetadataNoticeWidget data={{ field: 'description', catalog: CATALOG }} />);
    expect(screen.getByText(/Type into the block to fill it in; until then the page renders the block empty/)).toBeTruthy();
    cleanup();
    render(<MetadataNoticeWidget data={{ field: 'description', placeholder: 'None', catalog: CATALOG }} />);
    expect(screen.getByText(/until then the page shows the placeholder/)).toBeTruthy();
  });

  it('says a hidden block is not published, whether or not its field is editable', () => {
    render(<MetadataNoticeWidget data={{ field: 'description', showInView: false, catalog: CATALOG }} />);
    expect(
      screen.getByText('“Summary” is edited in the block and saved with the page, and the page does not show it.'),
    ).toBeTruthy();
    cleanup();
    render(<MetadataNoticeWidget data={{ field: 'modified', showInView: false, catalog: CATALOG }} />);
    expect(
      screen.getByText('“Modified” is not shown on the page. Switch “Show in view” on below to show it.'),
    ).toBeTruthy();
  });

  it('says where a filled editable field is edited, and where a shown-only one is', () => {
    const { store } = host({ description: 'From the atom' });
    render(
      <Provider store={store}>
        <MetadataNoticeWidget data={{ field: 'description', catalog: CATALOG }} />
      </Provider>,
    );
    expect(screen.getByText('“Summary” is edited in the block and saved with the page.')).toBeTruthy();
    cleanup();
    render(<MetadataNoticeWidget data={{ field: 'relatedItems', catalog: CATALOG }} />);
    expect(screen.getByText(/edited on the Content tab/)).toBeTruthy();
  });
});

describe('the Metadata Section block’s notices', () => {
  afterEach(cleanup);

  it('asks for fields when none are chosen', () => {
    render(<MetadataSectionNoticeWidget data={{ catalog: CATALOG }} />);
    expect(screen.getByText('No fields selected yet. Add them below.')).toBeTruthy();
  });

  it('names the fields the page will skip', () => {
    render(
      <MetadataSectionNoticeWidget
        data={{ fields: [{ field: 'title' }, { field: 'description' }, { field: 'bogus' }], catalog: CATALOG }}
      />,
    );
    expect(screen.getByText('Empty on this page, so not shown: Summary, bogus.')).toBeTruthy();
    expect(screen.getByText(/edited in the block and saved with the page/)).toBeTruthy();
  });

  it('drops the skipped notice as soon as the author fills the field in', () => {
    const { store, formAtom } = host({ title: 'A doc' });
    render(
      <Provider store={store}>
        <MetadataSectionNoticeWidget
          data={{ fields: [{ field: 'title' }, { field: 'description' }], catalog: CATALOG }}
        />
      </Provider>,
    );
    expect(screen.getByText('Empty on this page, so not shown: Summary.')).toBeTruthy();
    act(() => {
      store.set(formAtom, { ...(store.get(formAtom) as object), description: 'Filled in the table' });
    });
    expect(screen.queryByText(/not shown/)).toBeNull();
  });

  it('says the values are edited on the Content tab when none may be typed here', () => {
    const shown = CATALOG.map((row) => ({ ...row, input: '' }));
    render(<MetadataSectionNoticeWidget data={{ fields: [{ field: 'modified' }], catalog: shown }} />);
    expect(screen.getByText(/Edit them on the Content tab/)).toBeTruthy();
  });
});

describe('the catalog ladder', () => {
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

  it('says the fields are still loading, then gets out of the way', async () => {
    const pending = deferred<{ ok: boolean; json: () => Promise<unknown> }>();
    vi.stubGlobal('fetch', vi.fn(() => pending.promise));

    render(<MetadataNoticeWidget data={{ field: 'title' }} />);
    expect(screen.getByText('Loading this page’s fields…')).toBeTruthy();

    await act(async () => {
      pending.resolve({ ok: true, json: () => Promise.resolve({ catalog: CATALOG }) });
      await pending.promise;
    });
    expect(screen.queryByText('Loading this page’s fields…')).toBeNull();
  });

  it('says so when nothing could be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    render(<MetadataSectionNoticeWidget data={{ fields: [{ field: 'title' }] }} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText(/could not be loaded for the preview/)).toBeTruthy();
  });
});

describe('the widget itself', () => {
  afterEach(cleanup);

  it('stores nothing: it never calls onChange, and carries no control', () => {
    const onChange = vi.fn();
    const { container } = render(
      <MetadataNoticeWidget data={{ field: 'title', catalog: CATALOG }} {...({ onChange } as object)} />,
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector('input, select, textarea, button')).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });

});
