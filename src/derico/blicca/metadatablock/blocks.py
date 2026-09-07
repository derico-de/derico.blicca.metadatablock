"""The two blocks' identities, spelled once.

``metadata`` and ``metadataSection`` are the blocks' ``@type`` values — the
same ids ``@eeacms/volto-metadata-block`` registers, so a page authored with
that add-on names the same blocks here. Every surface that names a block
derives its spelling from these constants: the serialization transformers
(``metadata_transform``), the renderer view names
(``aurora-block-<type>``) and the registry records. Aurora ships no block of
either name, so registration (last-wins by weight) replaces nothing.
"""

METADATA_BLOCK_TYPE = "metadata"
METADATA_SECTION_BLOCK_TYPE = "metadataSection"

BLOCK_TYPES = (METADATA_BLOCK_TYPE, METADATA_SECTION_BLOCK_TYPE)
