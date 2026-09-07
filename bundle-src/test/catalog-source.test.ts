/**
 * Where the canvas gets a catalog for a never-serialized node: the endpoint
 * derivation for both hosts' edit routes, and the one-request-per-URL cache.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { catalogEndpoint, fetchCatalog, resetCatalogCache } from '../src/metadata/catalog-source';

describe('catalogEndpoint', () => {
  const at = (origin: string, pathname: string) => ({ origin, pathname });

  it('strips the portal prefix and the Blicca edit suffix', () => {
    expect(
      catalogEndpoint(at('http://host', '/Plone/folder/doc/@@aurora-edit'), 'http://host/Plone'),
    ).toBe('http://host/Plone/folder/doc/@metadata-catalog');
  });

  it('handles the portal root itself', () => {
    expect(catalogEndpoint(at('http://host', '/Plone/@@aurora-edit'), 'http://host/Plone')).toBe(
      'http://host/Plone/@metadata-catalog',
    );
  });

  it('strips the Aurora edit suffix and adds no prefix twice', () => {
    expect(catalogEndpoint(at('http://app', '/folder/doc/edit'), 'http://backend/Plone')).toBe(
      'http://backend/Plone/folder/doc/@metadata-catalog',
    );
    expect(catalogEndpoint(at('http://app', '/folder/doc/edit'), '/++api++')).toBe(
      '/++api++/folder/doc/@metadata-catalog',
    );
  });

  it('answers null when the host has not said where its API is', () => {
    expect(catalogEndpoint(at('http://host', '/Plone/doc/@@aurora-edit'), '')).toBeNull();
  });
});

describe('fetchCatalog', () => {
  afterEach(() => {
    resetCatalogCache();
    vi.unstubAllGlobals();
  });

  const respond = (body: unknown, ok = true) =>
    vi.fn(() => Promise.resolve({ ok, json: () => Promise.resolve(body) }));

  it('returns the well-formed rows of the body’s catalog', async () => {
    const fetch = respond({
      '@id': 'x',
      catalog: [{ id: 'title', title: 'T', kind: 'text', value: 'A' }, 'junk'],
    });
    vi.stubGlobal('fetch', fetch);
    await expect(fetchCatalog('http://x/@metadata-catalog')).resolves.toEqual([
      { id: 'title', title: 'T', kind: 'text', value: 'A' },
    ]);
    expect(fetch).toHaveBeenCalledWith('http://x/@metadata-catalog', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
  });

  it('asks once per URL, however many blocks and widgets ask', async () => {
    const fetch = respond({ catalog: [] });
    vi.stubGlobal('fetch', fetch);
    await Promise.all([fetchCatalog('http://x/@m'), fetchCatalog('http://x/@m')]);
    await fetchCatalog('http://x/@m');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a failed response', respond({ catalog: [] }, false)],
    ['a body without a catalog list', respond({ catalog: 'x' })],
    ['a rejected request', vi.fn(() => Promise.reject(new Error('offline')))],
  ])('answers null for %s', async (_what, fetch) => {
    vi.stubGlobal('fetch', fetch);
    await expect(fetchCatalog('http://x/@m')).resolves.toBeNull();
  });
});
