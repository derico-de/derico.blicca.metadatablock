"""MetadataSectionBlockView browser view.

The Metadata Section block's public renderer
"""
from Products.Five.browser import BrowserView


class MetadataSectionBlockView(BrowserView):
    """The Metadata Section block's public renderer"""

    # If you need to override the template registered in configure.zcml:
    # index = ViewPageTemplateFile("metadata_section_block_view.pt")

    def __call__(self):
        return self.index()
