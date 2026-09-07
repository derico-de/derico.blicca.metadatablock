# `@derico/aurora-metadata-block`

The Metadata blocks' Aurora half. This is a real npm package (block add-on
contract §1.1: the editor half belongs to the Aurora ecosystem; Blicca
ownership lives only in the Python package) *and* the source for the bundle
committed into `../src/derico/blicca/metadatablock/static/`. Publishing it
to npm is a later step; nothing here changes for it.

Heavily inspired by [`@eeacms/volto-metadata-block`](https://github.com/eea/volto-metadata-block)
(European Environment Agency, MIT) — thank you.

Two consumers, one source:

| consumer | artifact | entry |
| --- | --- | --- |
| Blicca `@@aurora-edit` | the scope-wrapped Plone static bundle, runtime-imported per contract §4 | `install(config)` via `blockAddons` |
| Aurora proper | this npm package, a source dependency | `install(config)` from the app's registry config |

## Commands

```bash
pnpm install
pnpm build      # -> ../src/derico/blicca/metadatablock/static/metadata-block.{js,css,js.map}
pnpm test       # the harness reads the built artifact: build first
pnpm typecheck
```

**Build artifacts are committed and never built at install time.** There is
no Node on the deploy host; rebuild here and commit the result whenever
`src/` changes.

If `pnpm install` fails with a sqlite "disk I/O error", the store is on a
filesystem it cannot lock — use `pnpm install --store-dir /dev/shm/pnpm-store`.

## Layout

- `src/metadata/data.ts` — the rules that decide what renders, spelled once
  per side (`metadata_data.py` is the twin; the Python suite reads this file).
- `src/metadata/catalog-source.ts` — where the CANVAS gets a catalog for a
  never-serialized node: the `@metadata-catalog` endpoint for either host's
  edit route, one request per page, and the `useCatalog` ladder.
- `src/metadata/live-title.ts` — the title as the canvas has it, off the
  host's form atom.
- `src/metadata/MetadataValue.tsx` — the value markup both blocks share,
  one branch per kind. `MetadataView.tsx` and `MetadataSectionView.tsx` are
  the two blocks' markup, and in Aurora their public rendering.
- `src/metadata/MetadataEdit.tsx`, `MetadataSectionEdit.tsx` — the views
  plus the notices.
- `src/metadata/schema.ts` — the two sidebar forms.
- `src/widgets/` — `metadata_field`, `metadata_fields`, `metadata_select`,
  `metadata_boolean`: namespaced widgets so every control is the same in
  both hosts.
- `src/styles.css` — the one stylesheet, scope-wrapped by the build.

`vite.config.ts` and `build-plugins/scope-wrap.ts` are the canonical block
add-on build, as the Actions block ships them.

## Tests

`test/upstream-registry.ts` installs the five real Aurora installers at the
versions the host pins, so the harness runs against the registry Aurora
builds and none of Blicca's overrides. `test/metadata-anatomy.test.tsx`
reads `../tests/anatomy-cases.json`, the fixture the Python suite reads too.
