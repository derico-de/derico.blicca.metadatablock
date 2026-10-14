"""Tests for upgrade step 1003 -> 1004: the namespaced block types.

The blocks' ``@type``s went from ``metadata`` and ``metadataSection`` to
``derico.metadata`` and ``derico.metadataSection`` (ADR 0025 in
plone.blicca.auroraeditor). A site at 1003 gets the records' new ``types``
and every stored block renamed, wherever it is nested.
"""

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.volto.indexers.indexers import block_types_indexer
from Products.GenericSetup.upgrade import UpgradeDepends
from Products.GenericSetup.upgrade import UpgradeStep
from zope.component import getGlobalSiteManager

from derico.blicca.metadatablock.blocks import METADATA_BLOCK_TYPE
from derico.blicca.metadatablock.blocks import METADATA_SECTION_BLOCK_TYPE

from .test_setup import block_addon_records
from .test_setup import RECORDS


PROFILE = "derico.blicca.metadatablock:default"
UPGRADE_PROFILE = "derico.blicca.metadatablock.upgrades:1004"
OLD_TYPES = {
    "derico.blicca.metadatablock.metadata": "metadata",
    "derico.blicca.metadatablock.metadataSection": "metadataSection",
}


def plone_block(node_id, block_type, **data):
    return {
        "type": "ploneBlock",
        "id": node_id,
        "children": [{"text": ""}],
        "@type": block_type,
        **data,
    }


def somersault(*nodes):
    return {"@type": "__somersault__", "value": list(nodes)}


def add_blocks_behavior(portal_type):
    fti = api.portal.get_tool("portal_types")[portal_type]
    fti._updateProperty("behaviors", (*fti.behaviors, "volto.blocks"))


class UpgradeTestCase:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.setup_tool = api.portal.get_tool("portal_setup")

    def _upgrade(self):
        self.setup_tool.setLastVersionForProfile(PROFILE, "1003")
        self.setup_tool.upgradeProfile(PROFILE, dest="1004")


class TestRegistry(UpgradeTestCase):
    def _steps(self):
        found = []
        for step in self.setup_tool.listUpgrades(PROFILE, show_old=True):
            found.extend(step if isinstance(step, list) else [step])
        return [s["step"] for s in found if s["ssource"] == "1003" and s["sdest"] == "1004"]

    def test_the_registry_import_is_narrowed_to_the_registry_step(self):
        depends = [s for s in self._steps() if isinstance(s, UpgradeDepends)]
        assert len(depends) == 1
        assert depends[0].import_profile == UPGRADE_PROFILE
        assert depends[0].import_steps == ["plone.app.registry"]

    def test_the_content_is_renamed_by_the_handler(self):
        handlers = [s for s in self._steps() if isinstance(s, UpgradeStep)]
        assert [s.handler.__module__ for s in handlers] == [
            "derico.blicca.metadatablock.upgrades.v1004"
        ]

    def test_a_site_at_1003_gets_the_new_types(self):
        for name, old_type in OLD_TYPES.items():
            block_addon_records()[name].types = [old_type]
        block_addon_records()["derico.blicca.metadatablock.metadata"].enabled = False

        self._upgrade()

        assert self.setup_tool.getLastVersionForProfile(PROFILE) == ("1004",)
        for name, block_type in RECORDS.items():
            assert block_addon_records()[name].types == [block_type]
        assert block_addon_records()["derico.blicca.metadatablock.metadata"].enabled is False


class TestContent(UpgradeTestCase):
    @pytest.fixture(autouse=True)
    def _page(self, _setup):
        add_blocks_behavior("Document")
        self.doc = api.content.create(container=self.portal, type="Document", id="doc", title="Doc")

    def test_renames_the_blocks_wherever_they_are_nested(self):
        self.doc.blocks = {
            "top": {"@type": "metadata", "field": "title"},
            "grid": {"@type": "gridBlock", "blocks": {"cell": {"@type": "metadataSection"}}},
            "__somersault__": somersault(
                plone_block("n1", "metadataSection", title="Facts"),
                {"type": "p", "id": "p1", "children": [{"text": "metadata"}]},
            ),
        }

        self._upgrade()

        blocks = self.doc.blocks
        assert blocks["top"] == {"@type": METADATA_BLOCK_TYPE, "field": "title"}
        assert blocks["grid"]["blocks"]["cell"]["@type"] == METADATA_SECTION_BLOCK_TYPE
        node, paragraph = blocks["__somersault__"]["value"]
        assert node == plone_block("n1", METADATA_SECTION_BLOCK_TYPE, title="Facts")
        assert paragraph == {"type": "p", "id": "p1", "children": [{"text": "metadata"}]}

    def test_leaves_other_blocks_alone(self):
        blocks = {
            "teaser": {"@type": "teaser", "title": "metadata"},
            "done": {"@type": METADATA_BLOCK_TYPE, "field": "title"},
        }
        self.doc.blocks = dict(blocks)

        self._upgrade()

        assert self.doc.blocks == blocks

    def test_renames_the_site_roots_blocks(self):
        add_blocks_behavior("Plone Site")
        self.portal.blocks = {"b1": {"@type": "metadata", "field": "title"}}

        self._upgrade()

        assert self.portal.blocks == {"b1": {"@type": METADATA_BLOCK_TYPE, "field": "title"}}


class TestBlockTypesIndex(UpgradeTestCase):
    @pytest.fixture(autouse=True)
    def _index(self, _setup):
        registry = getGlobalSiteManager()
        registry.registerAdapter(block_types_indexer, name="block_types")
        self.catalog = api.portal.get_tool("portal_catalog")
        self.catalog.addIndex("block_types", "KeywordIndex")
        add_blocks_behavior("Document")
        self.doc = api.content.create(container=self.portal, type="Document", id="doc", title="Doc")
        self.doc.blocks = {"b1": {"@type": "metadata", "field": "title"}}
        self.doc.reindexObject()
        yield
        registry.unregisterAdapter(block_types_indexer, name="block_types")

    def found(self, block_type):
        return [brain.getId for brain in self.catalog(block_types=block_type)]

    def test_finds_the_page_under_its_new_type(self):
        assert self.found("metadata") == ["doc"]

        self._upgrade()

        assert self.found("metadata") == []
        assert self.found(METADATA_BLOCK_TYPE) == ["doc"]
