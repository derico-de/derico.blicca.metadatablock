"""Deriving the catalog: every field of a content item, reduced to a display kind.

The Metadata blocks show fields they do not own — the title, description,
dates, tags, images and relations of the object the blocks sit on. Which
fields exist depends on the portal type and its behaviors; what a value
looks like depends on the field type; whether the visitor may read it depends
on the field's read permission. All of that is decided HERE, once per
request, and handed to both renderers as data (block add-on contract §5.3):
a list of ``{id, title, kind, value, input}`` rows in schema order, ``kind``
one of the seven ``metadata_data.KINDS`` and ``value`` already reduced to that
kind's shape — or ``None`` when the field is empty, so the sidebar can still
offer the field — and ``input`` naming the inline control the canvas draws
for the field (``metadata_data.INPUTS``), or ``""`` when the field is shown
but not edited there. An editable row also carries ``raw``, the field's
restapi value as the content PATCH would take it back, and ``schema``, the
field's ``@types`` property with its vocabulary's terms inlined as
``choices`` — what the control needs and nothing the public page reads.

Values are read through ``plone.restapi``'s field serializers rather than
off the object, for the same reason the Actions block computes its rows the
way ``@actions`` does: the restapi shapes (choice titles, resolved relations,
image scales, output-transformed rich text) are the ones every other Aurora
surface already sees. Field-level read permissions are honoured the way
restapi honours them (``plone.autoform``'s ``READ_PERMISSIONS_KEY``), and
editability the way restapi's deserializer decides it — the field's write
permission on top of ``Modify portal content`` (ADR 0002).

Deliberately NOT ``ISerializeToJson`` on the whole object: that would
serialize the ``blocks`` field, run this add-on's own transformer inside it,
and recurse.
"""

import logging
from urllib.parse import quote

from AccessControl import getSecurityManager
from plone.autoform.interfaces import READ_PERMISSIONS_KEY
from plone.autoform.interfaces import WRITE_PERMISSIONS_KEY
from plone.dexterity.utils import iterSchemata
from plone.restapi.interfaces import IFieldSerializer
from plone.restapi.types.interfaces import IJsonSchemaProvider
from plone.supermodel.utils import mergedTaggedValueDict
from Products.CMFCore.permissions import ModifyPortalContent
from Products.CMFCore.utils import getToolByName
from zope.annotation.interfaces import IAnnotations
from zope.component import getMultiAdapter
from zope.component import queryMultiAdapter
from zope.component import queryUtility
from zope.i18n import translate
from zope.i18nmessageid import MessageFactory
from zope.schema import getFieldsInOrder
from zope.schema.interfaces import IASCIILine
from zope.schema.interfaces import IBool
from zope.schema.interfaces import IChoice
from zope.schema.interfaces import ICollection
from zope.schema.interfaces import IDate
from zope.schema.interfaces import IDatetime
from zope.schema.interfaces import IDecimal
from zope.schema.interfaces import IFloat
from zope.schema.interfaces import IInt
from zope.schema.interfaces import IText
from zope.schema.interfaces import ITextLine
from zope.schema.interfaces import IURI
from zope.schema.interfaces import IVocabularyFactory


logger = logging.getLogger(__name__)

_plone = MessageFactory("plone")

#: Schema fields that are never offered: form-only fields of the versioning
#: behavior that hold no stored value, and the blocks container itself, which
#: is where these blocks live.
DENIED_FIELDS = frozenset({"blocks", "blocks_layout", "changeNote", "versioning_enabled"})

#: Fields that are offered to SHOW but never to edit inline, whatever their
#: type: the short name is the page's URL, and the editor is bound to it —
#: renaming it from inside the canvas would save to one address and
#: navigate to another.
SHOWN_ONLY_FIELDS = frozenset({"id"})

#: The fields every author reaches for first, pulled to the front of the
#: catalog regardless of which behavior schema they come from.
LEADING_FIELDS = ("title", "description")

#: The fields whose values are TAGS rather than a plain list: a keyword
#: each, searchable in one index of the site's catalog. Field id → that
#: index. Such a field renders as tags — every value a link to a search for
#: it — the way Plone's own keywords viewlet renders ``Subject``.
TAG_INDEXES = {"subjects": "Subject"}

#: The image scale an ``image`` row points at, and the fallbacks when the
#: uploaded image is smaller than it.
IMAGE_SCALES = ("large", "preview", "teaser", "mini")

_CACHE_KEY = "derico.blicca.metadatablock.catalog"

#: The most terms of a vocabulary inlined into an editable row's ``schema``
#: as ``choices``. A select or a token control needs its terms in hand; a
#: vocabulary larger than this is not offered for editing at all.
MAX_TERMS = 500


def _empty(value):
    return value is None or value == "" or value == [] or value == {} or value == ()


def _kind_of(field):
    """The display kind for a schema field, or ``None`` when it is not offered.

    Interfaces are tested most specific first: ``IRichText`` extends ``IText``,
    the relation and named-file interfaces extend ``IObject``/``IField``, and
    a collection of relations is ``ICollection`` too.
    """
    # Imported lazily: the optional packages are always present in Plone 6,
    # but the interfaces are cheaper to name once than to guard everywhere.
    from plone.app.textfield.interfaces import IRichText
    from plone.namedfile.interfaces import INamedFileField
    from plone.namedfile.interfaces import INamedImageField
    from z3c.relationfield.interfaces import IRelationChoice
    from z3c.relationfield.interfaces import IRelationList

    if IRichText.providedBy(field):
        return "richtext"
    if INamedImageField.providedBy(field):
        return "image"
    if INamedFileField.providedBy(field):
        return "file"
    if IRelationChoice.providedBy(field) or IRelationList.providedBy(field):
        return "links"
    if ICollection.providedBy(field):
        return "list"
    scalar = (ITextLine, IText, IURI, IInt, IFloat, IDecimal, IBool, IDatetime, IDate)
    if any(iface.providedBy(field) for iface in scalar):
        return "text"
    from zope.schema.interfaces import IChoice

    if IChoice.providedBy(field):
        return "text"
    return None


def _input_of(field):
    """The inline control for a field, or ``""`` when the canvas only shows it.

    One of ``metadata_data.INPUTS``, decided from the field's type the way
    ``_kind_of`` decides the display kind — most specific interface first.
    Every field the Volto metadata block edits with its own widget gets a
    control; rich text is the one exception (Plate's business, and Blicca
    moves it into the blocks anyway), and a ``readonly`` field is never
    offered.
    """
    from plone.app.textfield.interfaces import IRichText
    from plone.namedfile.interfaces import INamedFileField
    from plone.namedfile.interfaces import INamedImageField
    from z3c.relationfield.interfaces import IRelationChoice
    from z3c.relationfield.interfaces import IRelationList

    if getattr(field, "readonly", False) or IRichText.providedBy(field):
        return ""
    if INamedImageField.providedBy(field) or INamedFileField.providedBy(field):
        return "file"
    if IRelationChoice.providedBy(field) or IRelationList.providedBy(field):
        return "relations"
    if ICollection.providedBy(field):
        return "tokens"
    if IChoice.providedBy(field):
        return "select"
    if IBool.providedBy(field):
        return "boolean"
    if any(iface.providedBy(field) for iface in (IInt, IFloat, IDecimal)):
        return "number"
    if IDatetime.providedBy(field):
        return "datetime"
    if IDate.providedBy(field):
        return "date"
    if any(iface.providedBy(field) for iface in (ITextLine, IASCIILine, IURI)):
        return "line"
    if IText.providedBy(field):
        return "text"
    return ""


def _vocabulary_name(schema):
    """The named vocabulary a ``@types`` property points at, or ``None``.

    Looked for where restapi puts it: on the property, on its ``items``, or
    in ``widgetOptions`` (the hint an ajax-select widget leaves — the tags
    field's keywords vocabulary lives there).
    """
    holders = (schema, schema.get("items"), schema.get("widgetOptions"))
    for holder in holders:
        if not isinstance(holder, dict):
            continue
        vocabulary = holder.get("vocabulary")
        url = vocabulary.get("@id") if isinstance(vocabulary, dict) else vocabulary
        if isinstance(url, str) and "/@vocabularies/" in url:
            return url.rsplit("/@vocabularies/", 1)[1]
        if isinstance(url, str) and url and "/" not in url:
            return url
    return None


def _pairs(choices):
    """``[[token, title], …]`` with every title a string, the token standing in."""
    pairs = []
    for choice in choices:
        token, title = (list(choice) + [None])[:2]
        pairs.append([str(token), str(title) if title not in (None, "") else str(token)])
    return pairs


def _terms(name, context, request, by_value=False):
    """``[[token, title], …]`` of the named vocabulary, or ``None``.

    ``None`` when there is no such vocabulary, it cannot be built here, or
    it is larger than ``MAX_TERMS``. With ``by_value`` the first item is the
    term's VALUE rather than its token: what a plain text field stores when
    a vocabulary merely suggests (the keywords vocabulary tokens are base64,
    the tag itself is the value).
    """
    factory = queryUtility(IVocabularyFactory, name=name)
    if factory is None:
        return None
    try:
        vocabulary = factory(context)
        terms = []
        for term in vocabulary:
            if len(terms) >= MAX_TERMS:
                return None
            key = term.value if by_value else term.token
            if isinstance(key, bytes):
                key = key.decode("utf-8", "replace")
            title = term.title if term.title is not None else key
            terms.append([str(key), translate(title, context=request)])
        return terms
    except Exception:
        logger.exception("Could not list vocabulary %s", name)
        return None


def _schema_of(field, control, context, request):
    """The field's ``@types`` property, readied for its control.

    ``select`` and ``tokens`` get their vocabulary's terms inlined as
    ``choices`` (``[[token, title], …]``, restapi's own spelling for a static
    vocabulary), and ``additionalItems`` says whether a token control may
    take a value outside them. ``None`` when a control cannot be drawn —
    a select with no terms in hand.
    """
    try:
        provider = queryMultiAdapter((field, context, request), IJsonSchemaProvider)
        schema = dict(provider.get_schema()) if provider is not None else {}
    except Exception:
        # A field restapi cannot describe (a vocabulary that does not
        # exist) cannot be edited by its rules either.
        logger.exception("Could not describe field %s", field.__name__)
        return None
    if control in ("select", "tokens"):
        value_type = getattr(field, "value_type", None)
        closed = control == "select" or IChoice.providedBy(value_type)
        choices = schema.get("choices") or (schema.get("items") or {}).get("choices")
        if not choices:
            name = _vocabulary_name(schema)
            choices = _terms(name, context, request, by_value=not closed) if name else None
        if choices:
            schema["choices"] = _pairs(choices)
        else:
            schema.pop("choices", None)
        if control == "select":
            if not choices:
                return None
        else:
            schema["additionalItems"] = not (closed and bool(choices))
    return schema


def _may_read(schema, field_name, context):
    permission = mergedTaggedValueDict(schema, READ_PERMISSIONS_KEY).get(field_name)
    if not permission:
        return True
    return bool(getSecurityManager().checkPermission(permission, context))


def _may_write(schema, field_name, context):
    """Whether the content PATCH would accept ``field_name`` from this user.

    The same two gates ``plone.restapi``'s deserializer applies: ``Modify
    portal content`` on the object, then the field's own write permission
    when the schema tags one.
    """
    manager = getSecurityManager()
    if not manager.checkPermission(ModifyPortalContent, context):
        return False
    permission = mergedTaggedValueDict(schema, WRITE_PERMISSIONS_KEY).get(field_name)
    if not permission:
        return True
    return bool(manager.checkPermission(permission, context))


def _serialized(field, context, request):
    serializer = queryMultiAdapter((field, context, request), IFieldSerializer)
    return serializer() if serializer is not None else None


def _text_of(field, value, context, request):
    """A scalar field's restapi value as one display string."""
    plone_view = getMultiAdapter((context, request), name="plone")
    if IBool.providedBy(field):
        return translate(_plone("Yes") if value else _plone("No"), context=request)
    if IDatetime.providedBy(field):
        return plone_view.toLocalizedTime(value, long_format=True) or str(value)
    if IDate.providedBy(field):
        return plone_view.toLocalizedTime(value) or str(value)
    if isinstance(value, dict):
        # A choice: restapi answers `{token, title}`.
        return str(value.get("title") or value.get("token") or "")
    return str(value)


def _list_of(value):
    items = []
    for item in value if isinstance(value, list) else []:
        if isinstance(item, dict):
            items.append(str(item.get("title") or item.get("token") or ""))
        else:
            items.append(str(item))
    return [item for item in items if item]


def _tags_of(name, value, context, request):
    """Tag strings → ``{href, title}`` rows, one search link per tag.

    The link Plone's own keywords viewlet builds: the navigation root's
    ``@@search``, the tag as the sole criterion of the field's index.
    """
    index = TAG_INDEXES[name]
    portal_state = getMultiAdapter((context, request), name="plone_portal_state")
    root = portal_state.navigation_root_url()
    return [
        {"href": f"{root}/@@search?{index}%3Alist={quote(title, safe='')}", "title": title}
        for title in _list_of(value)
    ]


def _links_of(value):
    rows = value if isinstance(value, list) else [value]
    links = []
    for row in rows:
        if isinstance(row, dict) and row.get("@id"):
            links.append({"href": row["@id"], "title": row.get("title") or row["@id"]})
    return links


def _image_of(field, value, context):
    scales = value.get("scales") or {}
    src = value.get("download")
    for name in IMAGE_SCALES:
        if name in scales and scales[name].get("download"):
            src = scales[name]["download"]
            break
    caption = getattr(context, f"{field.__name__}_caption", "") or ""
    return {"src": src, "alt": str(caption)}


def _reduce(field, kind, value, context, request):
    """A restapi field value, reduced to its display kind's shape."""
    if _empty(value):
        return None
    if kind == "text":
        return _text_of(field, value, context, request) or None
    if kind == "richtext":
        data = value.get("data") if isinstance(value, dict) else value
        return str(data) if data else None
    if kind == "list":
        return _list_of(value) or None
    if kind == "tags":
        return _tags_of(field.__name__, value, context, request) or None
    if kind == "links":
        return _links_of(value) or None
    if kind == "image":
        return _image_of(field, value, context) if isinstance(value, dict) else None
    if kind == "file":
        if isinstance(value, dict) and value.get("download"):
            return {"href": value["download"], "title": value.get("filename") or "file"}
        return None
    return None


def _schema_rows(context, request):
    rows = []
    for schema in iterSchemata(context):
        for name, field in getFieldsInOrder(schema):
            if name in DENIED_FIELDS:
                continue
            kind = _kind_of(field)
            if kind is None or not _may_read(schema, name, context):
                continue
            if kind == "list" and name in TAG_INDEXES:
                kind = "tags"
            raw = None
            try:
                raw = _serialized(field, context, request)
                value = _reduce(field, kind, raw, context, request)
            except Exception:
                # One field that will not serialize must not cost the page
                # every other field: log it and offer the field empty.
                logger.exception("Could not read field %s on %s", name, context.absolute_url())
                value = None
            row = {
                "id": name,
                "title": translate(field.title, context=request) or name,
                "kind": kind,
                "value": value,
                "input": "",
            }
            control = _input_of(field) if name not in SHOWN_ONLY_FIELDS else ""
            if control and _may_write(schema, name, context):
                try:
                    field_schema = _schema_of(field, control, context, request)
                except Exception:
                    logger.exception("Could not describe field %s on %s", name, context.absolute_url())
                    field_schema = None
                if field_schema is not None:
                    row.update({"input": control, "raw": raw, "schema": field_schema})
            rows.append(row)
    return rows


def _system_rows(context, request):
    """Rows for facts every content item has that no schema field holds."""
    plone_view = getMultiAdapter((context, request), name="plone")
    rows = []
    # Message ids the `plone` domain actually carries (Plone has no bare
    # "Created" / "Modified"): the querystring's date labels.
    labels = (("created", _plone("Creation date")), ("modified", _plone("Modification date")))
    for name, label in labels:
        stamp = getattr(context, name, None)
        value = stamp() if callable(stamp) else stamp
        rows.append({
            "id": name,
            "title": translate(label, context=request),
            "kind": "text",
            "value": (plone_view.toLocalizedTime(value, long_format=True) or None)
            if value
            else None,
            "input": "",
        })
    workflow = getToolByName(context, "portal_workflow", None)
    state = workflow.getInfoFor(context, "review_state", None) if workflow is not None else None
    title = None
    if state:
        title = workflow.getTitleForStateOnType(state, context.portal_type) or state
        title = translate(_plone(title), context=request)
    rows.append({
        "id": "review_state",
        "title": translate(_plone("State"), context=request),
        "kind": "text",
        "value": title,
        "input": "",
    })
    return rows


def content_catalog(context, request):
    """Every offered field of ``context`` → one row, for this request.

    Schema fields first, ``title`` and ``description`` pulled to the front,
    then the system rows (``created``, ``modified``, ``review_state``).
    Computed once per request and context: every Metadata block on a page
    reads the same catalog, so it is cached on the request.
    """
    cache = IAnnotations(request, None)
    key = f"{_CACHE_KEY}:{'/'.join(context.getPhysicalPath())}"
    if cache is not None and key in cache:
        return cache[key]
    rows = _schema_rows(context, request)
    leading = [row for name in LEADING_FIELDS for row in rows if row["id"] == name]
    rest = [row for row in rows if row["id"] not in LEADING_FIELDS]
    result = leading + rest + _system_rows(context, request)
    if cache is not None:
        cache[key] = result
    return result
