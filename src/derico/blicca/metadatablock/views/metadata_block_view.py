"""The Metadata block's public renderer (``@@aurora-block-metadata``).

Registered under the block add-on contract's view-name convention (§5.1):
``BlockDispatchMixin.render_block_data`` resolves
``getMultiAdapter(..., name=f"aurora-block-{block_type}")`` and stamps
``self.data`` (post-transformer) and ``self.block_type`` before calling.

**This is the block's other renderer, not a fallback.** The React ``view``
(``bundle-src/src/metadata/MetadataView.tsx``) and this template must emit
the same anatomy element for element, because ONE scope-wrapped stylesheet
dresses both surfaces. ``tests/anatomy-cases.json`` at the package root is
read by this suite and the vitest one alike.

Everything rendered comes from the stored node as ``render_block_data`` hands
it over: the ``catalog`` the serializer injected and the stored ``field``,
``showLabel`` and ``placeholder``. This view reads no field off the object —
the catalog is the server's (``metadata_transform``), and a node that reaches
this renderer without one draws the empty root, exactly as the canvas does.

Error policy is **inherited**: ``render_block_data`` wraps every block.
"""

from derico.blicca.metadatablock import metadata_data
from derico.blicca.metadatablock.views.rendering import MetadataRenderingBase


class MetadataBlockView(MetadataRenderingBase):
    """Render a metadata block."""

    @property
    def entry(self):
        """The one field, prepared for the template."""
        (found,) = self.prepare([metadata_data.metadata_entry(self.block)])
        return found
