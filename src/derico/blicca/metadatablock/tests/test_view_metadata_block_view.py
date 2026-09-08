"""The Metadata block's public renderer — registration, and the anatomy it emits.

The headline test is ``TestAnatomy``: every ``metadata`` case in
``tests/anatomy-cases.json`` at the package root, the same hand-authored
cases ``bundle-src/test/metadata-anatomy.test.tsx`` holds the React renderer
to. ``TestEndToEnd`` then runs the real pipeline once: the serializer derives
the catalog for a Manager on a document, ``render_block_data`` dispatches,
and the markup carries the document's own fields.
"""

import re

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.app.textfield.value import RichTextValue
from plone.blicca.auroraeditor.blockaddons import evaluate
from plone.blicca.auroraeditor.blockaddons import lockstep_gaps
from plone.blicca.auroraeditor.browser.rendering.base import BlockDispatchMixin
from plone.blicca.auroraeditor.rendering import render_blocks
from plone.restapi.behaviors import IBlocks
from zope.component import getMultiAdapter
from zope.globalrequest import setRequest
from zope.interface import alsoProvides
from zope.publisher.browser import TestRequest

from derico.blicca.metadatablock.blocks import METADATA_BLOCK_TYPE
from derico.blicca.metadatablock.interfaces import IDericoBliccaMetadatablockLayer

from .anatomy import canonical
from .anatomy import METADATA_CASES
from .anatomy import skeleton


VIEW_NAME = f"aurora-block-{METADATA_BLOCK_TYPE}"


class MetadataViewTestCase:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.context = api.content.create(
            container=self.portal,
            type="Document",
            id="doc",
            title="A doc",
            description="A short summary.",
        )
        self.context.setSubject(("Plone", "Aurora"))
        self.context.text = RichTextValue(
            "<p>Hello <b>world</b> <i>now</i></p>", "text/html", "text/x-html-safe"
        )

    def _request(self):
        request = TestRequest()
        alsoProvides(request, IDericoBliccaMetadatablockLayer)
        return request

    def render(self, data):
        view = getMultiAdapter((self.context, self._request()), name=VIEW_NAME)
        view.block_type = METADATA_BLOCK_TYPE
        view.data = dict(data, **{"@type": METADATA_BLOCK_TYPE})
        return view()


class TestRegistration(MetadataViewTestCase):
    def test_view_name_is_the_dispatch_convention(self):
        assert VIEW_NAME == "aurora-block-metadata"
        view = getMultiAdapter((self.context, self._request()), name=VIEW_NAME)
        assert view.__name__ == VIEW_NAME

    def test_the_dispatcher_finds_it_rather_than_the_default(self):
        dispatcher = BlockDispatchMixin()
        dispatcher.context = self.context
        dispatcher.request = self._request()
        markup = dispatcher.render_block_data({"@type": METADATA_BLOCK_TYPE})
        assert "block-unrendered" not in markup
        assert markup.startswith('<div class="metadata-block')

    def test_it_closes_the_wrappers_soft_lockstep_gap(self):
        request = self._request()
        statuses = evaluate(self.portal)
        assert [status.name for status in statuses], "no add-on registered at all"
        gaps = lockstep_gaps(self.portal, request, statuses)
        assert [gap for gap in gaps if gap["type"] == METADATA_BLOCK_TYPE] == []

    def test_it_renders_for_any_context_including_the_site_root(self):
        view = getMultiAdapter((self.portal, self._request()), name=VIEW_NAME)
        view.data = {"@type": METADATA_BLOCK_TYPE, "field": "title", "placeholder": "P"}
        assert "metadata-value--placeholder" in view()


class TestAnatomy(MetadataViewTestCase):
    def test_the_fixture_covers_the_states_the_rules_enumerate(self):
        assert len(METADATA_CASES) >= 25
        assert len({case["name"] for case in METADATA_CASES}) == len(METADATA_CASES)
        assert all(case["note"] for case in METADATA_CASES)

    @pytest.mark.parametrize("case", METADATA_CASES, ids=lambda case: case["name"])
    def test_matches_the_fixture_exactly(self, case):
        assert canonical(self.render(case["data"])) == canonical(case["html"])

    @pytest.mark.parametrize("case", METADATA_CASES, ids=lambda case: case["name"])
    def test_matches_the_cross_renderer_skeleton(self, case):
        assert skeleton(self.render(case["data"])) == skeleton(case["html"])

    def test_emits_no_whitespace_between_elements(self):
        richest = next(case for case in METADATA_CASES if case["name"] == "text-with-label")
        assert not re.search(r">\s+<", self.render(richest["data"]))

    def test_a_hidden_block_leaves_the_page_with_no_band_at_all(self):
        """`showInView: false`: no markup, so the wrapper drops the block."""
        node = {
            "field": "description",
            "showInView": False,
            "placeholder": "No summary yet",
            "catalog": [
                {"id": "description", "title": "Summary", "kind": "text", "value": "A summary."}
            ],
        }
        assert self.render(node) == ""
        dispatcher = BlockDispatchMixin()
        dispatcher.context = self.context
        dispatcher.request = self._request()
        assert dispatcher.render_block_data(dict(node, **{"@type": METADATA_BLOCK_TYPE})) == ""

    def test_escapes_authored_text_but_not_rich_text(self):
        markup = self.render({
            "field": "title",
            "showLabel": True,
            "placeholder": "<i>none</i>",
            "catalog": [{"id": "title", "title": "<b>T</b>", "kind": "text", "value": "A & B <i>"}],
        })
        assert "<b>" not in markup
        assert "&lt;b&gt;T&lt;/b&gt;" in markup
        assert "A &amp; B &lt;i&gt;" in markup
        rich = self.render({
            "field": "text",
            "catalog": [
                {"id": "text", "title": "Text", "kind": "richtext", "value": "<p>a <b>b</b></p>"}
            ],
        })
        assert "<p>a <b>b</b></p>" in rich


class TestEndToEnd(MetadataViewTestCase):
    """The real pipeline: serializer, dispatcher, template."""

    @pytest.fixture(autouse=True)
    def _pipeline(self, integration, _setup):
        self.request = integration["request"]
        alsoProvides(self.request, IDericoBliccaMetadatablockLayer)
        setRequest(self.request)
        alsoProvides(self.context, IBlocks)
        yield
        setRequest(None)

    def _page(self, node):
        blocks = {"b1": dict(node, **{"@type": METADATA_BLOCK_TYPE})}
        layout = {"items": ["b1"]}
        return render_blocks(self.context, self.request, blocks, layout)

    def test_the_documents_description_renders(self):
        markup = self._page({"field": "description", "showLabel": True})
        assert 'class="metadata-block has--field--description has--kind--text"' in markup
        assert '<span class="metadata-label">Summary</span>' in markup
        assert "A short summary." in markup

    def test_the_documents_rich_text_renders_as_html(self):
        markup = self._page({"field": "text"})
        assert "<p>Hello <b>world</b> <i>now</i></p>" in markup

    def test_the_documents_tags_render_as_search_links(self):
        markup = self._page({"field": "subjects"})
        href = f"{self.portal.absolute_url()}/@@search?Subject%3Alist=Plone"
        assert 'class="metadata-block has--field--subjects has--kind--tags"' in markup
        assert f'<a class="metadata-tag" rel="nofollow" href="{href}">Plone</a>' in markup
        assert "Aurora</a>" in markup

    def test_a_stored_catalog_is_never_published(self):
        markup = self._page({
            "field": "title",
            "catalog": [{"id": "title", "title": "Title", "kind": "text", "value": "Forged"}],
        })
        assert "Forged" not in markup
        assert "A doc" in markup
