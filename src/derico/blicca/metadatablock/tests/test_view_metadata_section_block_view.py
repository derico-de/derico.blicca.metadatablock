"""The Metadata Section block's public renderer — registration and anatomy.

The section's counterpart to ``test_view_metadata_block_view``: the
``metadataSection`` cases of the shared fixture, and the real pipeline once.
"""

import re

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.blicca.auroraeditor.blockaddons import evaluate
from plone.blicca.auroraeditor.blockaddons import lockstep_gaps
from plone.blicca.auroraeditor.browser.rendering.base import BlockDispatchMixin
from plone.blicca.auroraeditor.rendering import render_blocks
from plone.restapi.behaviors import IBlocks
from zope.component import getMultiAdapter
from zope.globalrequest import setRequest
from zope.interface import alsoProvides
from zope.publisher.browser import TestRequest

from derico.blicca.metadatablock.blocks import METADATA_SECTION_BLOCK_TYPE
from derico.blicca.metadatablock.interfaces import IDericoBliccaMetadatablockLayer

from .anatomy import canonical
from .anatomy import SECTION_CASES
from .anatomy import skeleton


VIEW_NAME = f"aurora-block-{METADATA_SECTION_BLOCK_TYPE}"


class SectionViewTestCase:
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
        self.context.setSubject(("Plone",))

    def _request(self):
        request = TestRequest()
        alsoProvides(request, IDericoBliccaMetadatablockLayer)
        return request

    def render(self, data):
        view = getMultiAdapter((self.context, self._request()), name=VIEW_NAME)
        view.block_type = METADATA_SECTION_BLOCK_TYPE
        view.data = dict(data, **{"@type": METADATA_SECTION_BLOCK_TYPE})
        return view()


class TestRegistration(SectionViewTestCase):
    def test_view_name_is_the_dispatch_convention(self):
        assert VIEW_NAME == "aurora-block-metadataSection"
        view = getMultiAdapter((self.context, self._request()), name=VIEW_NAME)
        assert view.__name__ == VIEW_NAME

    def test_the_dispatcher_finds_it_rather_than_the_default(self):
        dispatcher = BlockDispatchMixin()
        dispatcher.context = self.context
        dispatcher.request = self._request()
        markup = dispatcher.render_block_data({"@type": METADATA_SECTION_BLOCK_TYPE})
        assert "block-unrendered" not in markup
        assert markup.startswith('<section class="metadata-section-block')

    def test_it_closes_the_wrappers_soft_lockstep_gap(self):
        statuses = evaluate(self.portal)
        gaps = lockstep_gaps(self.portal, self._request(), statuses)
        assert [gap for gap in gaps if gap["type"] == METADATA_SECTION_BLOCK_TYPE] == []

    def test_it_renders_for_any_context_including_the_site_root(self):
        view = getMultiAdapter((self.portal, self._request()), name=VIEW_NAME)
        view.data = {"@type": METADATA_SECTION_BLOCK_TYPE, "title": "Facts"}
        assert "metadata-section-title" in view()


class TestAnatomy(SectionViewTestCase):
    def test_the_fixture_covers_the_states_the_rules_enumerate(self):
        assert len(SECTION_CASES) >= 10
        assert len({case["name"] for case in SECTION_CASES}) == len(SECTION_CASES)
        assert all(case["note"] for case in SECTION_CASES)

    @pytest.mark.parametrize("case", SECTION_CASES, ids=lambda case: case["name"])
    def test_matches_the_fixture_exactly(self, case):
        assert canonical(self.render(case["data"])) == canonical(case["html"])

    @pytest.mark.parametrize("case", SECTION_CASES, ids=lambda case: case["name"])
    def test_matches_the_cross_renderer_skeleton(self, case):
        assert skeleton(self.render(case["data"])) == skeleton(case["html"])

    @pytest.mark.parametrize("name", ["list-layout", "table-layout"])
    def test_emits_no_whitespace_between_elements(self, name):
        case = next(case for case in SECTION_CASES if case["name"] == name)
        assert not re.search(r">\s+<", self.render(case["data"]))

    def test_escapes_authored_text(self):
        markup = self.render({
            "title": "<b>Facts</b>",
            "layout": "table",
            "fields": [{"field": "title"}],
            "catalog": [{"id": "title", "title": "<i>T</i>", "kind": "text", "value": "A & B"}],
        })
        assert "<b>" not in markup and "<i>" not in markup
        assert "&lt;b&gt;Facts&lt;/b&gt;" in markup
        assert 'aria-label="&lt;b&gt;Facts&lt;/b&gt;"' in markup
        assert "A &amp; B" in markup


class TestEndToEnd(SectionViewTestCase):
    @pytest.fixture(autouse=True)
    def _pipeline(self, integration, _setup):
        self.request = integration["request"]
        alsoProvides(self.request, IDericoBliccaMetadatablockLayer)
        setRequest(self.request)
        alsoProvides(self.context, IBlocks)
        yield
        setRequest(None)

    def _page(self, node):
        blocks = {"b1": dict(node, **{"@type": METADATA_SECTION_BLOCK_TYPE})}
        return render_blocks(self.context, self.request, blocks, {"items": ["b1"]})

    def test_a_table_of_the_documents_fields_renders(self):
        markup = self._page({
            "title": "Facts",
            "layout": "table",
            "fields": [{"field": "title"}, {"field": "subjects"}, {"field": "effective"}],
        })
        assert '<th class="metadata-label" scope="row">Title</th>' in markup
        assert '<td class="metadata-value metadata-value--text">A doc</td>' in markup
        assert '<li class="metadata-item">Plone</li>' in markup
        # `effective` is unset on the document: skipped, not rendered empty.
        assert "has--field--effective" not in markup

    def test_a_list_of_the_documents_fields_renders(self):
        markup = self._page({"fields": [{"field": "description", "showLabel": True}]})
        assert '<span class="metadata-label">Summary</span>' in markup
        assert "A short summary." in markup
