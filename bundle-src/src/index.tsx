/**
 * The Metadata blocks' Aurora half — the npm entry point (`exports: "."`)
 * and the bundle entry the Vite lib build compiles into the Python package's
 * `static/metadata-block.js`. Two blocks, one bundle, one `install()`.
 *
 * Heavily inspired by `@eeacms/volto-metadata-block` (European Environment
 * Agency, MIT): the same two blocks, the same idea of showing a page's own
 * fields inside its blocks area. Thank you.
 *
 * The Python package registers TWO `IAuroraBlockAddon` records naming this
 * one bundle, and `loadBlockAddons` calls `install(config)` once PER RECORD
 * with no dedupe (block add-on contract §1.3). So `install` is idempotent:
 * plain assignments, the same values every time.
 *
 * Deliberately absent: `defaultBlockWidth`. The schemas offer `blockWidth`
 * instead, and contract §1.4 makes declaring both a contradiction.
 */
import { MetadataIcon, MetadataSectionIcon } from './metadata/icons';
import MetadataEdit from './metadata/MetadataEdit';
import MetadataSectionEdit from './metadata/MetadataSectionEdit';
import MetadataSectionView from './metadata/MetadataSectionView';
import MetadataView from './metadata/MetadataView';
import {
  MetadataSchema,
  MetadataSectionSchema,
  METADATA_BLOCK_TYPE,
  METADATA_SECTION_BLOCK_TYPE,
} from './metadata/schema';
import { registerMetadataWidgets } from './widgets';
import './styles.css';

/**
 * SILENT-DROP GATE: an entry missing a well-formed `id` or `title` vanishes
 * from the slash menu with no error, and an `icon` given as a string breaks
 * the menu outright. Check those three first if a block "doesn't appear".
 */
export const MetadataBlockInfo = {
  id: METADATA_BLOCK_TYPE,
  title: 'Metadata',
  edit: MetadataEdit,
  view: MetadataView,
  blockSchema: MetadataSchema,
  icon: MetadataIcon,
  category: 'metadata',
};

export const MetadataSectionBlockInfo = {
  id: METADATA_SECTION_BLOCK_TYPE,
  title: 'Metadata section',
  edit: MetadataSectionEdit,
  view: MetadataSectionView,
  blockSchema: MetadataSectionSchema,
  icon: MetadataSectionIcon,
  category: 'metadata',
};

// The loader convention (block add-on contract §1): default-export an
// install function that registers the blocks and RETURNS the config.
export default function install(config: any) {
  // Before the block entries, so a host that reads the registry the moment a
  // block appears finds the widgets its schemas name already present.
  registerMetadataWidgets(config);
  config.blocks.blocksConfig[METADATA_BLOCK_TYPE] = MetadataBlockInfo;
  config.blocks.blocksConfig[METADATA_SECTION_BLOCK_TYPE] = MetadataSectionBlockInfo;
  return config;
}

export {
  METADATA_BLOCK_TYPE,
  METADATA_SECTION_BLOCK_TYPE,
  MetadataEdit,
  MetadataSchema,
  MetadataSectionEdit,
  MetadataSectionSchema,
  MetadataSectionView,
  MetadataView,
};
