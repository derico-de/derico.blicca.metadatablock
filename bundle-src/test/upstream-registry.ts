/**
 * An Aurora-shaped registry, and nothing more.
 *
 * Ticket 02 established that Blicca is upstream **plus deltas**, and that
 * the deltas are the risk this block carries: `choices` and
 * `backgroundColor`'s `styleFieldDefinition` are registered by the Blicca
 * wrapper and by nobody upstream, so a field that leans on either silently
 * degrades to a single-line text input in Aurora proper.
 *
 * ## This used to be a transcription. Ticket 15 replaced it with the real thing.
 *
 * Ticket 06 built this fixture by hand-copying `@plone/cmsui`'s
 * `config/widgets.ts` registration list and pointing each key at a named
 * placeholder component, leaving ticket 15 the choice of whether to install
 * the real Aurora installers instead. It decided: **install them**, and the
 * deciding argument was not fidelity in general but a specific circularity.
 *
 * The assertions this fixture exists to support are mostly assertions of
 * ABSENCE — `choices` is not registered upstream, nor `textarea`, nor
 * `select`, nor a `backgroundColor` style field. Against a transcription
 * those pass because *we chose not to transcribe them*. They restate the
 * fixture's own construction and cannot fail while the hypothesis they
 * describe is false. Against the packages Aurora actually ships, the same
 * line is an observation about upstream, which is what ticket 02 named as
 * the risk and what ticket 15 was asked to verify.
 *
 * A transcription is also a copy that must be resynced by hand: were
 * `@plone/cmsui` to rename or drop a widget, the copy would keep passing.
 * The real install fails, which is the point.
 *
 * Cost, stated honestly: the five installers pull the Aurora app stack into
 * this block's **devDependencies** (154 packages became ~670). They are
 * devDependencies only — the shipped bundle externalises `@plone/registry`
 * and `@plone/helpers` and carries none of the rest (see `vite.config.ts`),
 * and `test/aurora-harness.test.tsx` holds that line. They ship raw
 * TypeScript (`"main": "index.ts"`), so vitest transforms them directly with
 * no build step, and the whole install runs in well under a second.
 *
 * The versions are pinned to the ones the host provides — read off
 * `plone.blicca.auroraeditor`'s `wrapper/package.json`, not off npm's
 * `latest`, because the question this fixture answers is what THIS host's
 * Aurora does. `@plone/plate` is alpha.9 here while npm has newer.
 *
 * ## What is still local
 *
 * `UPSTREAM_WIDTHS` stays a transcribed literal deliberately: reading it back
 * out of the registry would make `workspace.test.tsx`'s width assertion
 * compare the registry to itself. As a literal it is a drift detector — if
 * `@plone/blocks` changes the four widths, that test fails.
 *
 * `BLICCA_ONLY_REGISTRATIONS` is likewise a hand-read list, transcribed from
 * the wrapper's `bootstrap/config.ts`, so a test can assert an override's
 * absence *by name* rather than with a bare `toBeUndefined()`.
 */
import type { ComponentType } from 'react';

import installTheming from '@plone/theming';
import installPlate from '@plone/plate';
import installBlocks from '@plone/blocks';
import installLayout from '@plone/layout';
import installCmsui from '@plone/cmsui';

/**
 * The four widgets a block's schema may lean on, imported the same
 * way `@plone/cmsui/config/widgets.ts` imports them.
 *
 * Imported INDEPENDENTLY rather than read back out of the registry, which is
 * what makes `expect(getWidget('align')).toBe(UpstreamAlignWidget)` a claim
 * about cmsui rather than a tautology. pnpm resolves a single
 * `@plone/components` instance for both this module and cmsui's own import
 * (one entry in `.pnpm`), so the objects are identical — asserted directly
 * in `aurora-harness.test.tsx` before anything is built on it.
 */
import { AlignWidget, TextField } from '@plone/components/quanta';
import ImageWidget from '@plone/cmsui/components/ImageWidget/ImageWidget';
import { ObjectBrowserWidget } from '@plone/cmsui/components/ObjectBrowserWidget/ObjectBrowserWidget';

export type UpstreamConfig = {
  blocks: {
    blocksConfig: Record<string, unknown>;
    widths?: unknown[];
    plateBlocksConfig?: Record<string, unknown>;
  };
  widgets: Record<string, any>;
  settings: Record<string, any>;
  registerWidget: (options: { key: string; definition: unknown }) => void;
  registerDefaultWidget: (widget: unknown) => void;
  getWidget: (key: string) => ComponentType<any> | undefined;
  registerUtility: (options: {
    type: string;
    name: string;
    method: unknown;
  }) => void;
  getUtility: (options: { type: string; name: string }) => { method?: unknown };
};

/** Upstream's default widget: every unmatched field lands here. */
export const UpstreamTextField = TextField as unknown as ComponentType<any>;
export const UpstreamAlignWidget = AlignWidget as unknown as ComponentType<any>;
export const UpstreamImageWidget = ImageWidget as unknown as ComponentType<any>;
export const UpstreamObjectBrowserWidget =
  ObjectBrowserWidget as unknown as ComponentType<any>;

/**
 * `@plone/blocks`' four widths, verbatim. `blockWidth` is a style field, so
 * this list is what the sidebar control offers; a block declares
 * `blockWidth` in its schema rather than fixing one (contract §1.4).
 */
export const UPSTREAM_WIDTHS = [
  {
    style: { '--block-width': 'var(--narrow-container-width)' },
    name: 'narrow',
    label: 'Narrow',
  },
  {
    style: { '--block-width': 'var(--default-container-width)' },
    name: 'default',
    label: 'Default',
  },
  {
    style: { '--block-width': 'var(--layout-container-width)' },
    name: 'layout',
    label: 'Layout',
  },
  { style: { '--block-width': '100%' }, name: 'full', label: 'Full Width' },
];

/**
 * The blocks `@plone/blocks` registers. A block must appear ALONGSIDE
 * these, displacing none — `teaser` above all, which is why the block is
 * no block claims an upstream key (registration is last-wins by key).
 */
export const UPSTREAM_BLOCKS = ['image', 'teaser', 'video', 'listing'];

/**
 * Apply Aurora's registrations to a config, in the host's own order —
 * theming, plate, blocks, layout, cmsui — read off the Blicca wrapper's
 * `bootstrap/config.ts`, which mirrors Aurora's `registry.config.ts`.
 * Blocks must run before cmsui: it is what creates `blocksConfig`.
 *
 * Idempotent. `installBlocks` resets `blocksConfig` to `{}` and `installCmsui`
 * appends to `settings.cssLayers`, so a second call through a shared module
 * singleton would drop the block's own registration and double the layer.
 * Tracked in a WeakSet rather than a marker property because `@plone/registry`
 * seals its config object — assigning to it throws, which is itself worth
 * knowing: nothing can bolt state onto the host's registry at runtime.
 */
const installed = new WeakSet<object>();

export function installUpstreamRegistry<T extends UpstreamConfig>(config: T): T {
  if (installed.has(config)) return config;

  installTheming(config as any);
  installPlate(config as any);
  installBlocks(config as any);
  installLayout(config as any);
  installCmsui(config as any);

  installed.add(config);
  return config;
}

/**
 * The wrapper's overrides, listed so a test can assert their absence by
 * name rather than by a bare `toBeUndefined()`. Read off
 * `plone.blicca.auroraeditor`'s `wrapper/src/bootstrap/config.ts`.
 *
 * Since ticket 15 these are absent from the fixture because upstream does
 * not register them, not because the fixture declined to.
 */
/**
 * How the host actually resolves a `choices` widget — and the reason this is
 * a function rather than a `getWidget('choices')` call at every call site.
 *
 * `config.getWidget(key)` walks the widget CATEGORIES and looks `key` up
 * inside each, guarded by `typeof group === 'object'`. But Blicca registers
 * the choices widget as `registerWidget({ key: 'choices', definition:
 * BliccaChoicesWidget })` — a bare component, not a `{ name: Component }`
 * map — and `registerWidget` stores a non-map definition AS the category:
 * `widgets.choices = BliccaChoicesWidget`. A function fails the
 * `typeof === 'object'` guard, so `getWidget('choices')` skips right over it
 * and returns `undefined` **whether or not it is registered**.
 *
 * `Field.tsx` knows this and reads `config.widgets?.choices` directly
 * (`getWidgetByChoices`). Every assertion about `choices` must use the same
 * path, or it is vacuous — which is what ticket 15's mutation run caught:
 * registering Blicca's widget into the fixture left every "no choices
 * widget" test in this suite green.
 */
export function choicesWidgetOf(config: UpstreamConfig): unknown {
  return (config as any).widgets?.choices;
}

export const BLICCA_ONLY_REGISTRATIONS = {
  widgetKeys: ['choices'],
  styleFieldDefinitions: ['backgroundColor'],
  substitutedWidgets: ['object_browser', 'image', 'boolean', 'querystring'],
} as const;
