"""Reading the stored JSON, and the tables that are spelled twice.

``metadata_data`` is the Python twin of ``bundle-src/src/metadata/data.ts``.
The kinds, the layouts, the default and the scheme allowlist live in both,
because the two renderers run in different languages, so the risk this file
exists for is a **one-sided edit**: a kind added in TS and not here would let
the canvas draw a value the public page drops as malformed.

``TestParity`` is Python-reads-TS: reading a TS literal from Python is much
the cheaper way round.
"""

import re
from pathlib import Path

import pytest

from derico.blicca.metadatablock import metadata_data


DATA_TS = Path(__file__).resolve().parents[5] / "bundle-src" / "src" / "metadata" / "data.ts"

_ARRAY = r"export const {name} = \[([^;]*?)\](?: as const)?;"
_SCALAR = r"export const {name} = '([^']*)';"


def ts_source():
    return DATA_TS.read_text(encoding="utf-8")


def ts_array(name):
    match = re.search(_ARRAY.format(name=name), ts_source(), re.DOTALL)
    assert match, f"no `export const {name} = [...]` in {DATA_TS}"
    return tuple(re.findall(r"'([^']*)'", match.group(1)))


def ts_pairs(name):
    match = re.search(_ARRAY.format(name=name), ts_source(), re.DOTALL)
    assert match, f"no `export const {name} = [...]` in {DATA_TS}"
    return tuple(re.findall(r"\['([^']*)',\s*'([^']*)'\]", match.group(1)))


def ts_scalar(name):
    match = re.search(_SCALAR.format(name=name), ts_source())
    assert match, f"no `export const {name} = '...'` in {DATA_TS}"
    return match.group(1)


class TestParity:
    """The tables, held level with the editor half's."""

    def test_the_ts_file_is_where_this_test_thinks_it_is(self):
        assert DATA_TS.is_file(), DATA_TS
        assert ts_array("KINDS"), "the parser found an empty table"

    def test_kinds_match(self):
        assert ts_array("KINDS") == metadata_data.KINDS

    def test_layouts_match(self):
        assert ts_pairs("LAYOUTS") == metadata_data.LAYOUTS

    def test_default_layout_matches(self):
        assert ts_scalar("DEFAULT_LAYOUT") == metadata_data.DEFAULT_LAYOUT
        assert metadata_data.DEFAULT_LAYOUT in metadata_data.LAYOUT_IDS

    def test_link_schemes_match(self):
        assert ts_array("LINK_SCHEMES") == metadata_data.LINK_SCHEMES

    def test_the_derived_key_set_matches(self):
        from derico.blicca.metadatablock.metadata_transform import DERIVED_FIELDS

        assert ts_array("DERIVED_KEYS") == DERIVED_FIELDS


class TestScreen:
    @pytest.mark.parametrize(
        "value",
        ["/a", "a", "http://nohost/plone/a", "HTTPS://example.org/x", "mailto:x@y", "tel:+49"],
    )
    def test_passes_a_usable_link(self, value):
        assert metadata_data.screen_link(value) == value

    @pytest.mark.parametrize(
        "value", ["javascript:alert(1)", "data:text/html,x", "vbscript:x", "//evil.example/x"]
    )
    def test_rejects_an_unfollowable_link(self, value):
        assert metadata_data.screen_link(value) == ""

    @pytest.mark.parametrize("value", [None, "", "  ", 42, [], {}, True])
    def test_answers_absent_for_anything_that_is_not_a_string(self, value):
        assert metadata_data.screen_link(value) == ""


class TestCatalog:
    def test_reads_well_formed_rows_in_order(self):
        rows = metadata_data.catalog({
            "catalog": [
                {"id": "title", "title": "Title", "kind": "text", "value": "A"},
                {"id": "subjects", "title": "Tags", "kind": "list", "value": ["x"]},
            ]
        })
        assert [row["id"] for row in rows] == ["title", "subjects"]
        assert rows[0] == {"id": "title", "title": "Title", "kind": "text", "value": "A"}

    @pytest.mark.parametrize("value", [None, "x", {"title": {}}, 42])
    def test_answers_nothing_for_a_catalog_of_the_wrong_shape(self, value):
        assert metadata_data.catalog({"catalog": value}) == []

    def test_drops_rows_of_the_wrong_shape(self):
        rows = metadata_data.catalog({
            "catalog": [
                "title",
                None,
                {"id": "a b", "title": "Odd", "kind": "text", "value": "x"},
                {"id": "", "title": "Blank", "kind": "text", "value": "x"},
                {"id": "t", "title": "Unknown kind", "kind": "table", "value": "x"},
                {"id": "ok", "kind": "text"},
            ]
        })
        assert rows == [{"id": "ok", "title": "", "kind": "text", "value": None}]

    def test_row_for(self):
        data = {"catalog": [{"id": "title", "title": "T", "kind": "text", "value": "A"}]}
        assert metadata_data.row_for(data, "title")["value"] == "A"
        assert metadata_data.row_for(data, " title ")["value"] == "A"
        assert metadata_data.row_for(data, "bogus") is None
        assert metadata_data.row_for(data, "") is None
        assert metadata_data.row_for({}, "title") is None


class TestResolveValue:
    def test_text_and_richtext_are_trimmed_strings(self):
        assert metadata_data.resolve_value("text", "  A ") == "A"
        assert metadata_data.resolve_value("richtext", "<p>x</p>") == "<p>x</p>"
        for value in (None, "", "  ", 42, [], {}):
            assert metadata_data.resolve_value("text", value) is None

    def test_list_keeps_non_empty_strings(self):
        assert metadata_data.resolve_value("list", ["a", "", 3, " b "]) == ["a", "b"]
        assert metadata_data.resolve_value("list", []) is None
        assert metadata_data.resolve_value("list", "a") is None

    def test_links_need_a_screened_href_and_a_title(self):
        value = [
            {"href": "/a", "title": "A"},
            {"href": "javascript:x", "title": "Evil"},
            {"href": "/b"},
            {"title": "C"},
            "d",
        ]
        assert metadata_data.resolve_value("links", value) == [{"href": "/a", "title": "A"}]
        assert metadata_data.resolve_value("links", []) is None

    def test_image_needs_a_screened_src(self):
        assert metadata_data.resolve_value("image", {"src": "/i.jpg"}) == {
            "src": "/i.jpg",
            "alt": "",
        }
        assert metadata_data.resolve_value("image", {"src": "javascript:x", "alt": "a"}) is None
        assert metadata_data.resolve_value("image", "/i.jpg") is None

    def test_file_is_a_link(self):
        assert metadata_data.resolve_value("file", {"href": "/f", "title": "f.pdf"}) == {
            "href": "/f",
            "title": "f.pdf",
        }
        assert metadata_data.resolve_value("file", {"href": "/f"}) is None

    def test_unknown_kind_is_nothing(self):
        assert metadata_data.resolve_value("table", "x") is None


class TestMetadataEntry:
    def test_known_field(self):
        found = metadata_data.metadata_entry({
            "field": "title",
            "showLabel": True,
            "catalog": [{"id": "title", "title": "Title", "kind": "text", "value": "A"}],
        })
        assert found["css"] == "metadata-block has--field--title has--kind--text"
        assert found["label"] == "Title"
        assert found["value"] == "A"
        assert found["placeholder"] == ""

    def test_placeholder_only_without_a_value(self):
        data = {
            "field": "title",
            "placeholder": "None",
            "catalog": [{"id": "title", "title": "Title", "kind": "text", "value": "A"}],
        }
        assert metadata_data.metadata_entry(data)["placeholder"] == ""
        data["catalog"][0]["value"] = None
        assert metadata_data.metadata_entry(data)["placeholder"] == "None"

    def test_unknown_field(self):
        found = metadata_data.metadata_entry({
            "field": "bogus",
            "showLabel": True,
            "placeholder": "P",
        })
        assert found["css"] == "metadata-block has--field--bogus"
        assert found["label"] == ""
        assert found["placeholder"] == "P"

    def test_no_field(self):
        found = metadata_data.metadata_entry({"placeholder": "P"})
        assert found["css"] == "metadata-block"
        assert found["placeholder"] == ""

    def test_unsafe_field_id(self):
        assert metadata_data.metadata_entry({"field": "a b"})["css"] == "metadata-block"


class TestSection:
    @pytest.mark.parametrize("stored", [None, "", "grid", 42, ["table"], "Table"])
    def test_layout_falls_back(self, stored):
        assert metadata_data.effective_layout({"layout": stored}) == "list"

    def test_layout_stored_wins_when_offered(self):
        assert metadata_data.effective_layout({"layout": "table"}) == "table"
        assert metadata_data.effective_layout({"layout": " table "}) == "table"

    def test_field_specs(self):
        specs = metadata_data.field_specs({
            "fields": [
                "x",
                None,
                {"showLabel": True},
                {"field": " a ", "showLabel": "yes"},
                {"field": "b", "showLabel": True},
            ]
        })
        assert specs == [{"field": "a", "showLabel": False}, {"field": "b", "showLabel": True}]
        assert metadata_data.field_specs({"fields": {"field": "a"}}) == []
        assert metadata_data.field_specs({}) == []

    def test_section_entries_keep_only_fields_with_a_value(self):
        data = {
            "fields": [
                {"field": "title", "showLabel": True},
                {"field": "description"},
                {"field": "bogus"},
            ],
            "catalog": [
                {"id": "title", "title": "Title", "kind": "text", "value": "A"},
                {"id": "description", "title": "Summary", "kind": "text", "value": ""},
            ],
        }
        entries = metadata_data.section_entries(data)
        assert [(e["id"], e["label"]) for e in entries] == [("title", "Title")]

    def test_section_title(self):
        assert metadata_data.section_title({"title": " Facts "}) == "Facts"
        assert metadata_data.section_title({"title": 42}) == ""
