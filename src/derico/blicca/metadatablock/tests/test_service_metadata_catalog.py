"""Tests for metadata-catalog REST API service."""
import pytest
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID

from derico.blicca.metadatablock.testing import INTEGRATION_TESTING


class TestServiceMetadataCatalog:
    """Test metadata-catalog REST API service."""

    layer = INTEGRATION_TESTING

    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])

    def test_service_importable(self):
        """Test the service class can be imported."""
        from derico.blicca.metadatablock.api.services.metadata_catalog.get import MetadataCatalogGet

        assert MetadataCatalogGet is not None
