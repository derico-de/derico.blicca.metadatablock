"""Metadata blocks serialization transformers: the catalog is the server's.

Both blocks store WHICH fields to show and how — a field id, a label flag, a
placeholder, a layout — and nothing else. What those fields CONTAIN on the
object the blocks sit on is computed here at load time and injected as
``catalog``, every offered field as one ``{id, title, kind, value}`` row, and
stripped again on save. Both renderers read it as ordinary data; neither
reads a field off the object itself (block add-on contract §5.3).

The whole catalog rather than the chosen fields only, on purpose: the derived
set then depends on the context and the user alone, never on a stored field,
so picking a field in the sidebar is instant and needs no round trip and no
provenance stamp. It also gives the sidebar's field select its options.

Registered as ``(context, request)`` subscription adapters providing
``IBlockFieldSerializationTransformer`` / ``IBlockFieldDeserializationTransformer``,
for both ``IBlocks`` content and the site root, once per block type.
plone.restapi's ``NestedBlocksVisitor`` recurses into the somersault value
tree, so a metadata block nested in a Plate tree is transformed too, on
restapi GET and on classic rendering alike.

Worked example: ``derico.blicca.actionsblock``'s ``actions_transform.py``.
"""

import logging

from plone.base.interfaces import IPloneSiteRoot
from plone.restapi.behaviors import IBlocks
from plone.restapi.interfaces import IBlockFieldDeserializationTransformer
from plone.restapi.interfaces import IBlockFieldSerializationTransformer
from plone.restapi.serializer.converters import json_compatible
from zope.component import adapter
from zope.interface import implementer

from derico.blicca.metadatablock.blocks import METADATA_BLOCK_TYPE
from derico.blicca.metadatablock.blocks import METADATA_SECTION_BLOCK_TYPE
from derico.blicca.metadatablock.interfaces import IDericoBliccaMetadatablockLayer
from derico.blicca.metadatablock.metadata_catalog import content_catalog


logger = logging.getLogger(__name__)

#: Every key this pair injects. The serializer strips these before deriving
#: them and the deserializer strips them before the node is written, so the
#: two directions are spelled once and cannot drift apart.
#: PARITY: ``data.ts`` spells the same tuple as ``DERIVED_KEYS``.
DERIVED_FIELDS = ("catalog",)


class CatalogSerializerBase:
    """Inject the catalog for the current user and context."""

    order = 200
    block_type = None

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def __call__(self, value):
        for key in DERIVED_FIELDS:
            # Strip first, derive second: anything already on disk is stale by
            # definition, and a node hand-authored through the API with a
            # catalog of its own must not publish it.
            value.pop(key, None)
        try:
            value["catalog"] = json_compatible(content_catalog(self.context, self.request))
        except Exception:
            # One broken field must not break the whole page's serialization.
            # The block renders its empty root instead.
            logger.exception(
                "Could not derive the metadata catalog on %s",
                "/".join(self.context.getPhysicalPath()),
            )
        return value


class CatalogDeserializerBase:
    """Strip the derived catalog before the block is persisted.

    Unpaired, the serializer's output would be written back on the next save
    and then go stale the moment the content's fields change.
    """

    order = 200
    block_type = None

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def __call__(self, value):
        for key in DERIVED_FIELDS:
            value.pop(key, None)
        return value


# One class per (block type, context kind, direction): plone.restapi keys a
# transformer on its `block_type` attribute, one type per class.


@implementer(IBlockFieldSerializationTransformer)
@adapter(IBlocks, IDericoBliccaMetadatablockLayer)
class MetadataCatalogSerializer(CatalogSerializerBase):
    block_type = METADATA_BLOCK_TYPE


@implementer(IBlockFieldSerializationTransformer)
@adapter(IPloneSiteRoot, IDericoBliccaMetadatablockLayer)
class MetadataCatalogSerializerRoot(CatalogSerializerBase):
    block_type = METADATA_BLOCK_TYPE


@implementer(IBlockFieldDeserializationTransformer)
@adapter(IBlocks, IDericoBliccaMetadatablockLayer)
class MetadataCatalogDeserializer(CatalogDeserializerBase):
    block_type = METADATA_BLOCK_TYPE


@implementer(IBlockFieldDeserializationTransformer)
@adapter(IPloneSiteRoot, IDericoBliccaMetadatablockLayer)
class MetadataCatalogDeserializerRoot(CatalogDeserializerBase):
    block_type = METADATA_BLOCK_TYPE


@implementer(IBlockFieldSerializationTransformer)
@adapter(IBlocks, IDericoBliccaMetadatablockLayer)
class MetadataSectionCatalogSerializer(CatalogSerializerBase):
    block_type = METADATA_SECTION_BLOCK_TYPE


@implementer(IBlockFieldSerializationTransformer)
@adapter(IPloneSiteRoot, IDericoBliccaMetadatablockLayer)
class MetadataSectionCatalogSerializerRoot(CatalogSerializerBase):
    block_type = METADATA_SECTION_BLOCK_TYPE


@implementer(IBlockFieldDeserializationTransformer)
@adapter(IBlocks, IDericoBliccaMetadatablockLayer)
class MetadataSectionCatalogDeserializer(CatalogDeserializerBase):
    block_type = METADATA_SECTION_BLOCK_TYPE


@implementer(IBlockFieldDeserializationTransformer)
@adapter(IPloneSiteRoot, IDericoBliccaMetadatablockLayer)
class MetadataSectionCatalogDeserializerRoot(CatalogDeserializerBase):
    block_type = METADATA_SECTION_BLOCK_TYPE


TRANSFORMERS = (
    MetadataCatalogSerializer,
    MetadataCatalogSerializerRoot,
    MetadataCatalogDeserializer,
    MetadataCatalogDeserializerRoot,
    MetadataSectionCatalogSerializer,
    MetadataSectionCatalogSerializerRoot,
    MetadataSectionCatalogDeserializer,
    MetadataSectionCatalogDeserializerRoot,
)
