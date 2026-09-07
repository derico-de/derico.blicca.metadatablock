"""The catalog derivation: every field of a content item, reduced to a kind.

Run against stock ``plone.app.contenttypes`` types, which between them carry
every field type the reducer knows: text lines and text (title, description),
rich text (Document.text), tags (subjects), dates (effective, Event.start),
booleans (exclude_from_nav), choices (Event.whole_day is a bool; language is
a choice), an image (News Item.image), a file (File.file) and relations
(relatedItems).
"""

import datetime

import pytest
from plone import api
from plone.app.testing import login
from plone.app.testing import logout
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.app.testing import TEST_USER_NAME
from plone.app.textfield.value import RichTextValue
from plone.namedfile.file import NamedBlobFile
from plone.namedfile.file import NamedBlobImage
from z3c.relationfield import RelationValue
from zope.annotation.interfaces import IAnnotations
from zope.component import getUtility
from zope.intid.interfaces import IIntIds

from derico.blicca.metadatablock import metadata_data
from derico.blicca.metadatablock.metadata_catalog import content_catalog
from derico.blicca.metadatablock.metadata_catalog import DENIED_FIELDS


# A 1×1 GIF.
GIF = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,"
    b"\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


def by_id(rows):
    return {row["id"]: row for row in rows}


class CatalogTestCase:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        self.request = integration["request"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        login(self.portal, TEST_USER_NAME)
        self.doc = api.content.create(
            container=self.portal,
            type="Document",
            id="doc",
            title="A doc",
            description="A short summary.\nSecond line.",
        )
        self.doc.setSubject(("Plone", "Aurora"))
        self.doc.text = RichTextValue(
            "<p>Hello <b>world</b> <i>now</i></p>", "text/html", "text/x-html-safe"
        )

    def catalog(self, context=None):
        # Fresh per call: the derivation is cached on the request.
        IAnnotations(self.request).clear()
        return content_catalog(context or self.doc, self.request)


class TestShape(CatalogTestCase):
    def test_every_row_is_well_formed(self):
        rows = self.catalog()
        assert rows
        assert metadata_data.catalog({"catalog": rows}) == rows

    def test_title_and_description_lead(self):
        rows = self.catalog()
        assert [row["id"] for row in rows[:2]] == ["title", "description"]

    def test_system_rows_trail(self):
        rows = self.catalog()
        assert [row["id"] for row in rows[-3:]] == ["created", "modified", "review_state"]
        assert rows[-1]["value"] == "Private"
        assert rows[-2]["value"], "a modified stamp"

    def test_denied_fields_are_never_offered(self):
        ids = set(by_id(self.catalog()))
        assert not ids & DENIED_FIELDS

    def test_the_blocks_container_is_not_offered(self):
        # A JSONField has no display kind, so it is skipped by type — which
        # is also what keeps the derivation from recursing into itself.
        assert "blocks" not in by_id(self.catalog())

    def test_titles_are_the_schema_titles(self):
        rows = by_id(self.catalog())
        assert rows["title"]["title"] == "Title"
        assert rows["subjects"]["title"] == "Tags"


class TestKinds(CatalogTestCase):
    def test_text(self):
        rows = by_id(self.catalog())
        assert rows["title"] == {
            "id": "title",
            "title": "Title",
            "kind": "text",
            "value": "A doc",
            "input": "line",
        }
        assert rows["description"]["value"] == "A short summary.\nSecond line."

    def test_richtext_is_the_output_html(self):
        row = by_id(self.catalog())["text"]
        assert row["kind"] == "richtext"
        assert row["value"] == "<p>Hello <b>world</b> <i>now</i></p>"

    def test_list(self):
        row = by_id(self.catalog())["subjects"]
        assert row["kind"] == "list"
        assert row["value"] == ["Plone", "Aurora"]

    def test_empty_field_is_offered_with_no_value(self):
        row = by_id(self.catalog())["effective"]
        assert row["kind"] == "text"
        assert row["value"] is None

    def test_boolean_is_yes_or_no(self):
        assert by_id(self.catalog())["exclude_from_nav"]["value"] == "No"
        self.doc.exclude_from_nav = True
        assert by_id(self.catalog())["exclude_from_nav"]["value"] == "Yes"

    def test_datetime_is_localized(self):
        self.doc.setEffectiveDate("2026-09-07 10:30:00")
        row = by_id(self.catalog())["effective"]
        assert "2026" in row["value"]
        assert "10:30" in row["value"]

    def test_date(self):
        event = api.content.create(container=self.portal, type="Event", id="ev", title="Ev")
        event.start = datetime.datetime(2026, 9, 7, 9, 0)
        event.end = datetime.datetime(2026, 9, 7, 10, 0)
        rows = by_id(self.catalog(event))
        assert rows["start"]["kind"] == "text"
        assert "2026" in rows["start"]["value"]

    def test_choice_is_its_title(self):
        # `language` is a Choice over the available languages vocabulary.
        self.doc.language = "en"
        row = by_id(self.catalog())["language"]
        assert row["kind"] == "text"
        assert row["value"] == "English"

    def test_image_points_at_a_scale(self):
        news = api.content.create(container=self.portal, type="News Item", id="news", title="N")
        news.image = NamedBlobImage(data=GIF, filename="dot.gif")
        news.image_caption = "A dot"
        row = by_id(self.catalog(news))["image"]
        assert row["kind"] == "image"
        assert row["value"]["src"].startswith(f"{news.absolute_url()}/@@images/")
        assert row["value"]["alt"] == "A dot"

    def test_file_is_a_download(self):
        item = api.content.create(container=self.portal, type="File", id="f", title="F")
        item.file = NamedBlobFile(
            data=b"hello", filename="report.pdf", contentType="application/pdf"
        )
        row = by_id(self.catalog(item))["file"]
        assert row["kind"] == "file"
        assert row["value"] == {
            "href": f"{item.absolute_url()}/@@download/file",
            "title": "report.pdf",
        }

    def test_relations_are_links(self):
        other = api.content.create(
            container=self.portal, type="Document", id="other", title="Other"
        )
        intids = getUtility(IIntIds)
        self.doc.relatedItems = [RelationValue(intids.getId(other))]
        row = by_id(self.catalog())["relatedItems"]
        assert row["kind"] == "links"
        assert row["value"] == [{"href": other.absolute_url(), "title": "Other"}]


class TestInputs(CatalogTestCase):
    """Which rows the canvas may edit inline, decided here (ADR 0002)."""

    def test_a_text_line_is_a_line_and_text_is_text(self):
        rows = by_id(self.catalog())
        assert rows["title"]["input"] == "line"
        assert rows["description"]["input"] == "text"

    def test_every_other_kind_and_shape_is_shown_only(self):
        rows = by_id(self.catalog())
        # rich text, a list, a date, a boolean, a choice: formatted, not typed
        for name in ("text", "subjects", "effective", "exclude_from_nav", "language"):
            assert rows[name]["input"] == "", name

    def test_system_rows_are_never_edited(self):
        rows = by_id(self.catalog())
        for name in ("created", "modified", "review_state"):
            assert rows[name]["input"] == "", name

    def test_the_site_root_title_is_a_line(self):
        assert by_id(self.catalog(self.portal))["title"]["input"] == "line"

    def test_needs_modify_portal_content(self):
        # A Reader sees the title but the content PATCH would refuse them.
        api.user.create(email="r@example.org", username="reader", password="secret123")
        api.user.grant_roles(username="reader", obj=self.doc, roles=["Reader"])
        logout()
        login(self.portal, "reader")
        rows = by_id(self.catalog())
        assert rows["title"]["value"] == "A doc"
        assert rows["title"]["input"] == ""
        assert rows["description"]["input"] == ""

    def test_needs_the_fields_own_write_permission(self):
        # An Editor may modify the document but the ownership behavior guards
        # `creators` with `Manage portal`... a list, so take a schema whose
        # write permission is tagged on a text field instead: the test
        # tags one on the fly.
        from plone.autoform.interfaces import WRITE_PERMISSIONS_KEY
        from plone.dexterity.utils import iterSchemata

        schema = next(s for s in iterSchemata(self.doc) if "description" in s)
        tagged = dict(schema.queryTaggedValue(WRITE_PERMISSIONS_KEY) or {})
        schema.setTaggedValue(
            WRITE_PERMISSIONS_KEY, {**tagged, "description": "cmf.ManagePortal"}
        )
        try:
            api.user.create(email="e@example.org", username="editor", password="secret123")
            api.user.grant_roles(username="editor", obj=self.doc, roles=["Editor"])
            logout()
            login(self.portal, "editor")
            rows = by_id(self.catalog())
            assert rows["title"]["input"] == "line"
            assert rows["description"]["input"] == ""
        finally:
            schema.setTaggedValue(WRITE_PERMISSIONS_KEY, tagged)


class TestWhoseCatalog(CatalogTestCase):
    def test_it_is_the_users(self):
        # `plone.app.dexterity`'s ownership behavior guards `creators` and
        # friends with `Modify portal content`... which anonymous lacks.
        manager = by_id(self.catalog())
        logout()
        anonymous = by_id(self.catalog())
        assert "title" in anonymous
        assert set(anonymous) <= set(manager)

    def test_it_is_cached_per_request_and_context(self):
        first = content_catalog(self.doc, self.request)
        assert content_catalog(self.doc, self.request) is first
        assert content_catalog(self.portal, self.request) is not first

    def test_the_site_root_has_a_catalog_too(self):
        rows = by_id(self.catalog(self.portal))
        assert "title" in rows
        assert rows["title"]["value"] == self.portal.Title()
