/**
 * Where the CANVAS gets a catalog for a node the server has never serialized.
 *
 * A loaded node carries `catalog` — the server derived it (§5.3) and both
 * renderers read it. A freshly inserted block carries nothing, and would be
 * a blank box until the author saved and reloaded. So the editor, and only
 * the editor, fetches the same rows the serializer would have injected: this
 * add-on's `@metadata-catalog` service on the object being edited, which is
 * computed by the same `content_catalog()` call the transformer uses (held
 * level by `test_metadata_transform.TestServiceParity`).
 *
 * The `view` never fetches. In Aurora proper it IS the public rendering, and
 * a public rendering that fetches after mount would flash empty on the
 * server-rendered page; there, as here, the catalog arrives with the content
 * when the Python add-on is installed on the backend.
 *
 * The path of the object being edited is read off `location` (Blicca edits
 * at `<object>/@@aurora-edit`, Aurora at `<object>/edit`) and the API root
 * off `config.settings.apiPath`, as the Actions block does. The fetch is
 * same-origin with cookies: authenticated under Blicca by the session
 * cookie, anonymous under Aurora, whose token never reaches a plain `fetch`.
 */
import { useEffect, useState } from 'react';
import config from '@plone/registry';

import { catalog as storedCatalog, type Row } from './data';

type Location = { origin: string; pathname: string };

const EDIT_SUFFIX = /\/(?:@@aurora-edit|edit)\/?$/;

/** `config.settings.apiPath`, or `''`. */
export function apiPath(): string {
  const settings = (config as { settings?: { apiPath?: unknown } }).settings;
  const value = settings?.apiPath;
  return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
}

/**
 * The `@metadata-catalog` URL for the object being edited, or `null` when
 * the host has not said where its API is. Under Blicca `apiPath` is the
 * portal URL and the page lives under the same prefix, so the portal's own
 * path is stripped before the object's path is appended.
 */
export function catalogEndpoint(location: Location, base: string): string | null {
  const root = base.replace(/\/+$/, '');
  if (!root) return null;
  let rootPath = '';
  try {
    rootPath = new URL(root, location.origin).pathname.replace(/\/+$/, '');
  } catch {
    return null;
  }
  let path = location.pathname.replace(EDIT_SUFFIX, '').replace(/\/+$/, '');
  if (rootPath && path === rootPath) path = '';
  else if (rootPath && path.startsWith(`${rootPath}/`)) path = path.slice(rootPath.length);
  return `${root}${path}/@metadata-catalog`;
}

const inflight = new Map<string, Promise<Row[] | null>>();

/** One request per URL per page load, shared by every block on the canvas. */
export function fetchCatalog(url: string): Promise<Row[] | null> {
  let pending = inflight.get(url);
  if (!pending) {
    pending = fetch(url, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) =>
        body && typeof body === 'object' && Array.isArray((body as { catalog?: unknown }).catalog)
          ? storedCatalog(body as { catalog: unknown })
          : null,
      )
      .catch(() => null);
    inflight.set(url, pending);
  }
  return pending;
}

/** Test seam: forget every cached request. */
export function resetCatalogCache() {
  inflight.clear();
}

export type CatalogState = 'stored' | 'loading' | 'fetched' | 'failed';

/**
 * The catalog the canvas should draw, and where it came from.
 *
 * Rung 0: the stored one, whenever the node carries it — including an EMPTY
 * list, which is the server saying there is nothing to offer here.
 * Rung 1: a fetch, once, for a node with no catalog at all.
 */
export function useCatalog(data: { catalog?: unknown }): { catalog: Row[] | null; state: CatalogState } {
  const stored = storedCatalog(data);
  const [fetched, setFetched] = useState<{ url: string; catalog: Row[] | null } | null>(null);
  const endpoint =
    stored || typeof globalThis.location === 'undefined'
      ? null
      : catalogEndpoint(globalThis.location, apiPath());

  useEffect(() => {
    if (!endpoint) return;
    let live = true;
    fetchCatalog(endpoint).then((result) => {
      if (live) setFetched({ url: endpoint, catalog: result });
    });
    return () => {
      live = false;
    };
  }, [endpoint]);

  if (stored) return { catalog: stored, state: 'stored' };
  if (!endpoint) return { catalog: null, state: 'failed' };
  if (!fetched || fetched.url !== endpoint) return { catalog: null, state: 'loading' };
  return fetched.catalog
    ? { catalog: fetched.catalog, state: 'fetched' }
    : { catalog: null, state: 'failed' };
}
