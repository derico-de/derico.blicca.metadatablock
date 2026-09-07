"""MetadataBlockView browser view.

The Metadata block's public renderer
"""
from Products.Five.browser import BrowserView


class MetadataBlockView(BrowserView):
    """The Metadata block's public renderer"""

    # If you need to override the template registered in configure.zcml:
    # index = ViewPageTemplateFile("metadata_block_view.pt")

    def __call__(self):
        return self.index()
