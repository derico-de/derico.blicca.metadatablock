// Unlike collective.fragmentsblock, nothing is aliased to a stub here.
//
// fragmentsblock stubs `@plone/registry` and `@plone/helpers` because the
// facades "exist only in a running host". That is not true of these two:
// both are on npm, and the exact versions the host provides
// (`@plone/registry` 4.0.0-alpha.1, `@plone/helpers` 2.0.0-alpha.7 — see
// plone.blicca.auroraeditor's wrapper/package.json) install in 154 packages
// with no app stack behind them. A hand-written stub of `registerWidget` /
// `getWidget` would be a re-implementation of the very resolution order this
// block depends on (ticket 01: getWidget searches all widget categories
// flat), so a bug in the stub reads as a passing test.
//
// What IS local is the *registration set*: `test/upstream-registry.ts`
// applies the widgets Aurora registers and no more, so a field that only
// works because Blicca registered something fails here — which is the
// divergence ticket 02 asked this suite to catch.
//
// jsdom, not node: every later ticket mounts React (07's widgets, 08's
// edit/view, 15's harness). fragmentsblock could stay on node because it
// tests pure functions.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
