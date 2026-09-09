"""The Metadata Section block's public renderer (``@@aurora-block-metadataSection``).

The section's counterpart to ``metadata_block_view``: same dispatch
convention, same parity rule against ``MetadataSectionView.tsx``, same
fixture. The rows are the single block's anatomy repeated (list layout) or
one table row per field (table layout); the value markup is shared with the
single block through the ``value`` macro in ``metadata_value.pt``.
"""

from derico.blicca.metadatablock import metadata_data
from derico.blicca.metadatablock.views.rendering import MetadataRenderingBase


class MetadataSectionBlockView(MetadataRenderingBase):
    """Render a metadata section block."""

    @property
    def show_in_view(self):
        """Whether the visitor gets this block at all.

        Off, the template emits nothing and ``_render_block`` drops the
        host's wrapper with it, so a section kept only to edit its fields in
        the canvas leaves no band on the page.
        """
        return metadata_data.show_in_view(self.block)

    @property
    def title(self):
        return metadata_data.section_title(self.block)

    @property
    def layout(self):
        return metadata_data.effective_layout(self.block)

    @property
    def root_class(self):
        return f"metadata-section-block has--layout--{self.layout}"

    @property
    def entries(self):
        return list(self.prepare(metadata_data.section_entries(self.block)))
