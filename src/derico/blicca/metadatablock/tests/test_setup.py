"""Test derico.blicca.metadatablock installation.

The install profile is what makes the committed bundle reachable at all: the
JS can be perfect and the blocks still never appear, because ``@@aurora-edit``
discovers add-ons per site through ``IAuroraBlockAddon`` records and gates
each one on *enabled*, *bundle resolves* and *block-api compatible*. Every
gate is asserted here rather than assumed, for both records, and uninstall is
asserted to undo exactly what install did.
"""

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.blicca.auroraeditor import blockaddons
from plone.blicca.auroraeditor.interfaces import IAuroraBlockAddon
from plone.registry.interfaces import IRegistry
from zope.component import getUtility

from derico.blicca.metadatablock.blocks import METADATA_BLOCK_TYPE
from derico.blicca.metadatablock.blocks import METADATA_SECTION_BLOCK_TYPE
from derico.blicca.metadatablock.interfaces import IDericoBliccaMetadatablockLayer


#: The records' names under the add-on prefix, and the resource directory
#: `configure.zcml` publishes. Spelled here so a rename shows up as a failing
#: test rather than as a block that silently stops appearing.
RECORDS = {
    "derico.blicca.metadatablock.metadata": METADATA_BLOCK_TYPE,
    "derico.blicca.metadatablock.metadataSection": METADATA_SECTION_BLOCK_TYPE,
}
RESOURCE = "++plone++derico.blicca.metadatablock"


def block_addon_records():
    """The site's IAuroraBlockAddon collection, keyed by record name."""
    registry = getUtility(IRegistry)
    return registry.collectionOfInterface(
        IAuroraBlockAddon,
        prefix=blockaddons.BLOCKADDON_PREFIX,
        check=False,
    )


class TestSetup:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]

    def test_addon_installed(self):
        installer = api.addon.get_installer(self.portal)
        assert installer.is_product_installed("derico.blicca.metadatablock")

    def test_browserlayer(self):
        from plone.browserlayer import utils

        assert IDericoBliccaMetadatablockLayer in utils.registered_layers()

    @pytest.mark.parametrize(("name", "block_type"), RECORDS.items())
    def test_blockaddon_record_installed(self, name, block_type):
        """Two records, one bundle, spelled exactly as the committed artifacts are."""
        record = block_addon_records()[name]
        assert record.bundle == f"{RESOURCE}/metadata-block.js"
        assert record.css == f"{RESOURCE}/metadata-block.css"
        assert record.types == [block_type]
        assert record.enabled
        assert record.weight == 100
        assert not getattr(record, "permission", "")

    @pytest.mark.parametrize("name", RECORDS)
    def test_blockaddon_record_declares_the_api_floor(self, name):
        record = block_addon_records()[name]
        assert record.block_api == "1.0"
        assert blockaddons.is_compatible(record.block_api, blockaddons.host_block_api())

    @pytest.mark.parametrize("name", RECORDS)
    def test_addon_loadable_by_wrapper(self, name):
        """Record present, bundle resolves, block-api compatible."""
        statuses = {s.name: s for s in blockaddons.evaluate(self.portal)}
        status = statuses[name]
        assert status.skip_reason is None
        assert status.loadable
        assert status.bundle_url
        assert status.css_url


class TestUninstall:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.installer = api.addon.get_installer(self.portal)
        self.installer.uninstall_product("derico.blicca.metadatablock")

    def test_addon_uninstalled(self):
        assert not self.installer.is_product_installed("derico.blicca.metadatablock")

    def test_blockaddon_records_removed(self):
        for name in RECORDS:
            assert name not in block_addon_records()

    def test_browserlayer_removed(self):
        from plone.browserlayer import utils

        assert IDericoBliccaMetadatablockLayer not in utils.registered_layers()
