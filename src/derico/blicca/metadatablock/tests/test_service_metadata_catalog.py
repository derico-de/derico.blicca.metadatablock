"""``@metadata-catalog`` over HTTP: registered for every context, for viewers.

Against the acceptance layer's live WSGI server, with ``requests`` directly:
``plone.restapi.testing``'s session helper drags in a mail host stub this
package does not depend on.
"""

import pytest
import requests
import transaction
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import SITE_OWNER_NAME
from plone.app.testing import SITE_OWNER_PASSWORD
from plone.app.testing import TEST_USER_ID


class TestServiceMetadataCatalog:
    @pytest.fixture(autouse=True)
    def _setup(self, acceptance):
        self.portal = acceptance["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.doc = api.content.create(
            container=self.portal, type="Document", id="doc", title="A doc", description="Sum"
        )
        transaction.commit()
        self.base = self.portal.absolute_url()

    def get(self, path, auth=None):
        return requests.get(
            f"{self.base}{path}", headers={"Accept": "application/json"}, auth=auth, timeout=30
        )

    def test_anonymous_gets_the_public_fields_of_a_published_page(self):
        api.content.transition(self.doc, "publish")
        transaction.commit()
        response = self.get("/doc/@metadata-catalog")
        assert response.status_code == 200
        rows = {row["id"]: row for row in response.json()["catalog"]}
        assert rows["title"]["value"] == "A doc"
        assert rows["review_state"]["value"] == "Published"

    def test_anonymous_may_not_read_a_private_page(self):
        response = self.get("/doc/@metadata-catalog")
        assert response.status_code == 401

    def test_the_owner_gets_the_catalog(self):
        response = self.get("/doc/@metadata-catalog", auth=(SITE_OWNER_NAME, SITE_OWNER_PASSWORD))
        assert response.status_code == 200
        body = response.json()
        assert body["@id"] == f"{self.doc.absolute_url()}/@metadata-catalog"
        assert {row["id"] for row in body["catalog"]} >= {"title", "description", "modified"}

    def test_the_site_root_answers_too(self):
        response = self.get("/@metadata-catalog", auth=(SITE_OWNER_NAME, SITE_OWNER_PASSWORD))
        assert response.status_code == 200
