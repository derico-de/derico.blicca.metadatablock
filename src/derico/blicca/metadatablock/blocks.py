"""The two blocks' identities, spelled once.

``derico.metadata`` and ``derico.metadataSection`` are the blocks' ``@type``
values, namespaced after the npm package ``@derico/plone-metadata-block``
(ADR 0025 in plone.blicca.auroraeditor). Every surface that names a block
derives its spelling from these constants: the serialization transformers
(``metadata_transform``), the renderer view names
(``aurora-block-<type>``) and the registry records.
"""

METADATA_BLOCK_TYPE = "derico.metadata"
METADATA_SECTION_BLOCK_TYPE = "derico.metadataSection"

BLOCK_TYPES = (METADATA_BLOCK_TYPE, METADATA_SECTION_BLOCK_TYPE)
