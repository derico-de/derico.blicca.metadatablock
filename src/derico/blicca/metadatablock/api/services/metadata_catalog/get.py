"""``@metadata-catalog``: the catalog the blocks' serializer derives, on demand.

The canvas's one exception to reading the catalog off the node: a block the
server has never serialized — freshly inserted — carries none, so the editor
fetches this service for the object being edited, once per page, and previews
from it. It answers with exactly the rows ``metadata_transform`` injects
(``tests/test_metadata_transform.TestServiceParity`` holds the two level), so
what the canvas shows is what the next load will carry.

``GET <object>/@metadata-catalog`` → ``{"@id": ..., "catalog": [rows]}``.
"""

from plone.restapi.serializer.converters import json_compatible
from plone.restapi.services import Service

from derico.blicca.metadatablock.metadata_catalog import content_catalog


class MetadataCatalogGet(Service):
    """The content's metadata catalog for the current user."""

    def reply(self):
        return {
            "@id": f"{self.context.absolute_url()}/@metadata-catalog",
            "catalog": json_compatible(content_catalog(self.context, self.request)),
        }
