/**
 * Type surface for the five Aurora installers and the two cmsui widget
 * modules `test/upstream-registry.ts` imports. Wired in through `tsconfig`'s
 * `paths`, which redirects TYPE resolution only — vite and vitest still load
 * the real packages at runtime, which is the entire point of ticket 15.
 *
 * WHY THIS EXISTS. `@plone/cmsui`, `@plone/plate` and friends publish raw
 * TypeScript (`"main": "index.ts"`) rather than built output with `.d.ts`
 * beside it. That is what lets vitest run them with no build step — but it
 * also puts their source into our `tsc --noEmit` program, where it does not
 * compile: they import `@plone/aurora/app/root`, `./Logo.svg` and
 * `*.module.css`, and rely on ambient declarations that exist only inside
 * Volto's monorepo. `skipLibCheck` does not help — it skips `.d.ts` files,
 * and these are sources.
 *
 * So this is not us papering over a problem in our own code: there is no
 * version of these packages that typechecks standalone, and every one of the
 * ~40 errors was in a file we do not own. Our own usage stays checked, and
 * the shapes below are narrow enough to catch a real misuse — an installer
 * called with no argument, or a widget import that has moved.
 *
 * If Aurora ever ships built types, delete this file and the `paths` block
 * that points at it; the imports resolve to the real thing and nothing else
 * has to change.
 */
declare module '@plone/theming' {
  const install: (config: any) => any;
  export default install;
}
declare module '@plone/plate' {
  const install: (config: any) => any;
  export default install;
}
declare module '@plone/blocks' {
  const install: (config: any) => any;
  export default install;
}
declare module '@plone/layout' {
  const install: (config: any) => any;
  export default install;
}
declare module '@plone/cmsui' {
  const install: (config: any) => any;
  export default install;
}

import type { ComponentType } from 'react';

declare module '@plone/components/quanta' {
  export const AlignWidget: ComponentType<any>;
  export const TextField: ComponentType<any>;
}
declare module '@plone/cmsui/components/ImageWidget/ImageWidget' {
  const ImageWidget: ComponentType<any>;
  export default ImageWidget;
}
declare module '@plone/cmsui/components/ObjectBrowserWidget/ObjectBrowserWidget' {
  export const ObjectBrowserWidget: ComponentType<any>;
}
