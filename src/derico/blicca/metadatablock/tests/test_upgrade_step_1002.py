"""Upgrade step 1001 -> 1002: the block add-on records declare block-api 2.0.

The step imports the registry step from a mini profile that carries only the
new `block_api` values. Held here: those values match the default profile,
and running the step on a site at 1001 lands both records on 2.0 without
touching the rest of them.
"""

import pathlib
import xml.etree.ElementTree as ET

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.blicca.auroraeditor import blockaddons

import derico.blicca.metadatablock

from .test_setup import block_addon_records
from .test_setup import RECORDS
from .test_upgrade_step_1001 import hidden_profiles


PROFILE = "derico.blicca.metadatablock:default"
UPGRADE_PROFILE = "derico.blicca.metadatablock.upgrades:1002"

PACKAGE = pathlib.Path(derico.blicca.metadatablock.__file__).parent
DEFAULT_REGISTRY = PACKAGE / "profiles" / "default" / "registry.xml"
UPGRADE_REGISTRY = PACKAGE / "upgrades" / "1002" / "registry.xml"


def prefix(name):
    return f"{blockaddons.BLOCKADDON_PREFIX}/{name}"


def declared_block_api(path):
    """`block_api` per record prefix in a registry profile."""
    # S314: this package's own committed profile XML, not input.
    root = ET.parse(path).getroot()  # noqa: S314
    return {
        records.get("prefix"): value.text.strip()
        for records in root.iter("records")
        for value in records.iter("value")
        if value.get("key") == "block_api"
    }


class TestUpgradeProfileParity:
    def test_upgrade_declares_what_a_fresh_install_declares(self):
        assert declared_block_api(UPGRADE_REGISTRY) == declared_block_api(DEFAULT_REGISTRY)


class TestUpgrade1002:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.setup_tool = api.portal.get_tool("portal_setup")
        # A site at 1001: the records declare 1.0.
        for name in RECORDS:
            api.portal.set_registry_record(f"{prefix(name)}.block_api", "1.0")
        self.setup_tool.setLastVersionForProfile(PROFILE, "1001")

    def test_the_upgrade_profile_is_hidden_from_the_control_panel(self):
        assert UPGRADE_PROFILE in hidden_profiles()

    @pytest.mark.parametrize("name", RECORDS)
    def test_declares_block_api_2_0(self, name):
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        assert block_addon_records()[name].block_api == "2.0"

    @pytest.mark.parametrize("name", RECORDS)
    def test_the_block_loads_again(self, name):
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        statuses = {s.name: s for s in blockaddons.evaluate(self.portal)}
        assert statuses[name].loadable

    @pytest.mark.parametrize("name", RECORDS)
    def test_leaves_the_rest_of_the_record_alone(self, name):
        api.portal.set_registry_record(f"{prefix(name)}.enabled", False)
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        record = block_addon_records()[name]
        assert record.enabled is False
        assert record.bundle == "++plone++derico.blicca.metadatablock/metadata-block.js"

    def test_reaches_the_profile_version(self):
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        assert self.setup_tool.getLastVersionForProfile(PROFILE) == ("1002",)
