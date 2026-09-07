"""Deriving the catalog: every field of a content item, reduced to a display kind.

The Metadata blocks show fields they do not own — the title, description,
dates, tags, images and relations of the object the blocks sit on. Which
fields exist depends on the portal type and its behaviors; what a value
looks like depends on the field type; whether the visitor may read it depends
on the field's read permission. All of that is decided HERE, once per
request, and handed to both renderers as data (block add-on contract §5.3):
a list of ``{id, title, kind, value, input}`` rows in schema order, ``kind``
one of the six ``metadata_data.KINDS`` and ``value`` already reduced to that
kind's shape — or ``None`` when the field is empty, so the sidebar can still
offer the field — and ``input`` naming the inline control the canvas may
offer for the field (``metadata_data.INPUTS``), or ``""`` when the field is
shown but not edited there.

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

from AccessControl import getSecurityManager
from plone.autoform.interfaces import READ_PERMISSIONS_KEY
from plone.autoform.interfaces import WRITE_PERMISSIONS_KEY
from plone.dexterity.utils import iterSchemata
from plone.restapi.interfaces import IFieldSerializer
from plone.supermodel.utils import mergedTaggedValueDict
from Products.CMFCore.permissions import ModifyPortalContent
from Products.CMFCore.utils import getToolByName
from zope.annotation.interfaces import IAnnotations
from zope.component import getMultiAdapter
from zope.component import queryMultiAdapter
from zope.i18n import translate
from zope.i18nmessageid import MessageFactory
from zope.schema import getFieldsInOrder
from zope.schema.interfaces import IASCII
from zope.schema.interfaces import IBool
from zope.schema.interfaces import ICollection
from zope.schema.interfaces import IDate
from zope.schema.interfaces import IDatetime
from zope.schema.interfaces import IDecimal
from zope.schema.interfaces import IDottedName
from zope.schema.interfaces import IFloat
from zope.schema.interfaces import IId
from zope.schema.interfaces import IInt
from zope.schema.interfaces import IPassword
from zope.schema.interfaces import IText
from zope.schema.interfaces import ITextLine
from zope.schema.interfaces import IURI


logger = logging.getLogger(__name__)

_plone = MessageFactory("plone")

#: Schema fields that are never offered: form-only fields of the versioning
#: behavior that hold no stored value, and the blocks container itself, which
#: is where these blocks live.
DENIED_FIELDS = frozenset({"blocks", "blocks_layout", "changeNote", "versioning_enabled"})

#: The fields every author reaches for first, pulled to the front of the
#: catalog regardless of which behavior schema they come from.
LEADING_FIELDS = ("title", "description")

#: The image scale an ``image`` row points at, and the fallbacks when the
#: uploaded image is smaller than it.
IMAGE_SCALES = ("large", "preview", "teaser", "mini")

_CACHE_KEY = "derico.blicca.metadatablock.catalog"


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


#: Text-line and text fields that are NOT plain prose, and so get no inline
#: control: a URI, a password, an identifier, ASCII-only data. Each provides
#: ``ITextLine`` or ``IText`` through zope.schema's native-string aliases.
_NOT_PROSE = (IURI, IPassword, IId, IDottedName, IASCII)


def _input_of(field):
    """The inline control for a ``text``-kind field, or ``None``.

    ``line`` for a text line (a title), ``text`` for multi-line text (a
    description): the two shapes the canvas can offer a plain control for
    without reformatting on the way in. Rich text is Plate's business, and
    a date, a number, a boolean or a choice is shown formatted and edited on
    the Content tab. A ``readonly`` field is never offered.
    """
    if getattr(field, "readonly", False):
        return None
    if any(iface.providedBy(field) for iface in _NOT_PROSE):
        return None
    if ITextLine.providedBy(field):
        return "line"
    if IText.providedBy(field):
        return "text"
    return None


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
            try:
                value = _reduce(field, kind, _serialized(field, context, request), context, request)
            except Exception:
                # One field that will not serialize must not cost the page
                # every other field: log it and offer the field empty.
                logger.exception("Could not read field %s on %s", name, context.absolute_url())
                value = None
            control = _input_of(field) if kind == "text" else None
            rows.append({
                "id": name,
                "title": translate(field.title, context=request) or name,
                "kind": kind,
                "value": value,
                "input": control if control and _may_write(schema, name, context) else "",
            })
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
