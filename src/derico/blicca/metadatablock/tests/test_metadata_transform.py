"""The catalog transformer pairs.

The headline tests are ``TestRoundTrip`` — serialize → deserialize returns a
block byte-identical to what went in, because derived data is never
persisted — and ``TestServiceParity``: the rows the pairs inject are the rows
``@metadata-catalog`` returns, so the canvas's fallback fetch of that
service for a never-serialized node sees exactly what a serialized node
carries.
"""

import copy

import pytest
from plone import api
from plone.app.testing import login
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.app.testing import TEST_USER_NAME
from plone.restapi.behaviors import IBlocks
from plone.restapi.blocks import iter_block_transform_handlers
from plone.restapi.interfaces import IBlockFieldDeserializationTransformer
from plone.restapi.interfaces import IBlockFieldSerializationTransformer
from zope.annotation.interfaces import IAnnotations
from zope.component import getMultiAdapter
from zope.globalrequest import setRequest
from zope.interface import alsoProvides

from derico.blicca.metadatablock.blocks import BLOCK_TYPES
from derico.blicca.metadatablock.blocks import METADATA_BLOCK_TYPE
from derico.blicca.metadatablock.blocks import METADATA_SECTION_BLOCK_TYPE
from derico.blicca.metadatablock.interfaces import IDericoBliccaMetadatablockLayer
from derico.blicca.metadatablock.metadata_transform import DERIVED_FIELDS
from derico.blicca.metadatablock.metadata_transform import TRANSFORMERS


class TransformTestCase:
    """A portal holding one document, with the add-on's layer on the request."""

    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        self.request = integration["request"]
        alsoProvides(self.request, IDericoBliccaMetadatablockLayer)
        # iter_block_transform_handlers looks the adapters up against
        # zope.globalrequest, not against a request handed in.
        setRequest(self.request)
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        login(self.portal, TEST_USER_NAME)
        self.doc = api.content.create(
            container=self.portal, type="Document", id="doc", title="A doc", description="Sum"
        )
        alsoProvides(self.doc, IBlocks)
        yield
        setRequest(None)

    def _transform(self, context, block, interface):
        value = copy.deepcopy(block)
        for handler in iter_block_transform_handlers(context, value, interface):
            value = handler(value)
        return value

    def serialize(self, block, context=None):
        return self._transform(context or self.doc, block, IBlockFieldSerializationTransformer)

    def deserialize(self, block, context=None):
        return self._transform(context or self.doc, block, IBlockFieldDeserializationTransformer)

    def node(self, block_type=METADATA_BLOCK_TYPE, **fields):
        block = {"@type": block_type, "field": "description"}
        block.update(fields)
        return block


class TestSerializer(TransformTestCase):
    @pytest.mark.parametrize("block_type", BLOCK_TYPES)
    def test_injects_the_catalog_for_both_block_types(self, block_type):
        out = self.serialize(self.node(block_type))
        rows = {row["id"]: row for row in out["catalog"]}
        assert rows["title"]["value"] == "A doc"
        assert rows["description"]["value"] == "Sum"

    def test_touches_no_other_field(self):
        node = self.node(showLabel=True, blockWidth="full")
        out = self.serialize(node)
        out.pop("catalog")
        assert out == node

    def test_replaces_a_catalog_already_on_the_node(self):
        forged = self.node(
            catalog=[{"id": "title", "title": "T", "kind": "text", "value": "Forged"}]
        )
        out = self.serialize(forged)
        rows = {row["id"]: row for row in out["catalog"]}
        assert rows["title"]["value"] == "A doc"

    def test_fires_on_the_site_root_too(self):
        out = self.serialize(self.node(), context=self.portal)
        rows = {row["id"]: row for row in out["catalog"]}
        assert rows["title"]["value"] == self.portal.Title()

    def test_leaves_other_block_types_alone(self):
        other = {"@type": "teaser", "title": "x"}
        assert self.serialize(other) == other

    def test_one_transformer_per_type_context_and_direction(self):
        assert len(TRANSFORMERS) == 8
        assert {t.block_type for t in TRANSFORMERS} == set(BLOCK_TYPES)


class TestRoundTrip(TransformTestCase):
    @pytest.mark.parametrize("block_type", BLOCK_TYPES)
    def test_serialize_then_deserialize_is_the_identity(self, block_type):
        node = self.node(block_type, showLabel=True)
        assert self.deserialize(self.serialize(node)) == node

    @pytest.mark.parametrize("block_type", BLOCK_TYPES)
    def test_deserialize_strips_every_derived_key(self, block_type):
        polluted = self.node(block_type, **{key: {"x": 1} for key in DERIVED_FIELDS})
        assert self.deserialize(polluted) == self.node(block_type)

    def test_deserialize_strips_on_the_site_root_too(self):
        polluted = self.node(METADATA_SECTION_BLOCK_TYPE, catalog=[])
        assert self.deserialize(polluted, context=self.portal) == self.node(
            METADATA_SECTION_BLOCK_TYPE
        )


class TestServiceParity(TransformTestCase):
    """What the canvas fetches equals what the serializer injects."""

    def test_matches_the_service_row_for_row(self):
        injected = self.serialize(self.node())["catalog"]
        IAnnotations(self.request).clear()
        # plone.rest registers a service as a browser view named after the
        # method and the media type; the class itself is not a view.
        service = getMultiAdapter(
            (self.doc, self.request), name="GET_application_json_@metadata-catalog"
        )
        reply = service.reply()
        assert reply["@id"] == f"{self.doc.absolute_url()}/@metadata-catalog"
        assert reply["catalog"] == injected
