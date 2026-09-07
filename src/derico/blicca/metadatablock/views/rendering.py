"""What the two renderer views share: whitespace policy and rich text.

NO WHITESPACE-ONLY TEXT NODES, on either surface. JSX drops inter-element
whitespace by construction; a readable ZPT template does not, and an
inter-element newline is a real space in an inline formatting context — so
one sheet dressing both surfaces would meet gaps on one and not the other.
Collapsing ``>\\s+<`` is sound because every text value goes through
``metadata_data.text`` (stripped) and is HTML-escaped by ``tal:content``, so
no run of whitespace between two tags can be authored content.

Rich text is the exception: it is authored HTML whose own inter-element
whitespace is meaningful (``<b>a</b> <i>b</i>``). So the template emits a
token where the HTML goes, the collapse runs, and the HTML is spliced in
afterwards, untouched.
"""

import re

from plone.blicca.auroraeditor.rendering import BaseBlockView
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile


#: Template indentation, between two tags. Collapsed away.
_INDENT = re.compile(r">\s+<")

_MARKER = "\x00metadata-richtext-{index}\x00"  # noqa: S105 - a placeholder, not a secret


class MetadataRenderingBase(BaseBlockView):
    """A block view that collapses its template's indentation."""

    #: The value macro both templates `use-macro`, one branch per kind.
    value_template = ViewPageTemplateFile("metadata_value.pt")

    @property
    def block(self):
        """The stored node. ``render_block_data`` stamps it before calling."""
        return self.data or {}

    def prepare(self, entries):
        """Swap every rich-text value for a token; remember the HTML."""
        self._richtext = []
        for found in entries:
            if found["kind"] == "richtext" and found["value"] is not None:
                self._richtext.append(found["value"])
                found = dict(found, value=_MARKER.format(index=len(self._richtext) - 1))
            yield found

    def __call__(self):
        """The template's markup, with its own indentation collapsed away."""
        self._richtext = []
        markup = _INDENT.sub("><", self.index().strip())
        for index, html in enumerate(self._richtext):
            markup = markup.replace(_MARKER.format(index=index), html)
        return markup
