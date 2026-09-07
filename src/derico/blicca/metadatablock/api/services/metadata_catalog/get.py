"""metadata-catalog REST API service.

The content's metadata catalog as the block's serializer derives it, for the editor canvas
"""
from plone.restapi.services import Service
from zope.interface import implementer
from zope.publisher.interfaces import IPublishTraverse


@implementer(IPublishTraverse)
class MetadataCatalogGet(Service):
    """The content's metadata catalog as the block's serializer derives it, for the editor canvas

    Endpoint: GET @metadata-catalog
    """

    def __init__(self, context, request):
        super().__init__(context, request)
        self.params = []

    def publishTraverse(self, request, name):
        """Handle URL path segments after the endpoint."""
        self.params.append(name)
        return self

    def reply(self):
        """Return the JSON response."""
        return {
            "service": "@metadata-catalog",
            "status": "ok",
            "params": self.params,
            # Add your response data here
        }
