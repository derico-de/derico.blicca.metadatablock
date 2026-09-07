import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef, useLayoutEffect, createElement, useId } from "react";
import config from "@plone/registry";
import { atom, useAtomValue } from "jotai";
import { useFieldFocusedAtom, getStyleFieldDefinitionsFromRegistry } from "@plone/helpers";
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: "false"
};
function MetadataIcon(props) {
  return /* @__PURE__ */ jsxs("svg", { ...base, ...props, children: [
    /* @__PURE__ */ jsx("path", { d: "M4 5h9l7 7-7 7-9-9z" }),
    /* @__PURE__ */ jsx("circle", { cx: "8", cy: "9", r: "1", fill: "currentColor" })
  ] });
}
function MetadataSectionIcon(props) {
  return /* @__PURE__ */ jsxs("svg", { ...base, ...props, children: [
    /* @__PURE__ */ jsx("path", { d: "M4 6h5" }),
    /* @__PURE__ */ jsx("path", { d: "M12 6h8" }),
    /* @__PURE__ */ jsx("path", { d: "M4 12h5" }),
    /* @__PURE__ */ jsx("path", { d: "M12 12h8" }),
    /* @__PURE__ */ jsx("path", { d: "M4 18h5" }),
    /* @__PURE__ */ jsx("path", { d: "M12 18h8" })
  ] });
}
const KINDS = ["text", "richtext", "list", "links", "image", "file"];
const INPUTS = ["line", "text"];
const LAYOUTS = [
  ["list", "List"],
  ["table", "Table"]
];
const LAYOUT_IDS = LAYOUTS.map(([id]) => id);
const DEFAULT_LAYOUT = "list";
const LINK_SCHEMES = ["http", "https", "mailto", "tel"];
const SLUG = /^[A-Za-z0-9_-]+$/;
function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
function screenLink(value) {
  const raw = text(value);
  if (!raw || raw.startsWith("//")) return "";
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(raw);
  if (!scheme) return raw;
  return LINK_SCHEMES.includes(scheme[1].toLowerCase()) ? raw : "";
}
function fieldSlug(fieldId) {
  const slug = text(fieldId);
  return slug && SLUG.test(slug) ? slug : "";
}
const isRecord = (value) => !!value && typeof value === "object" && !Array.isArray(value);
function catalog(data) {
  const value = data.catalog;
  if (!Array.isArray(value)) return null;
  const rows = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const id = fieldSlug(raw.id);
    const kind = text(raw.kind);
    if (!id || !KINDS.includes(kind)) continue;
    const control = text(raw.input);
    rows.push({
      id,
      title: text(raw.title),
      kind,
      value: raw.value,
      input: INPUTS.includes(control) ? control : ""
    });
  }
  return rows;
}
function rowFor(data, fieldId) {
  const wanted = text(fieldId);
  if (!wanted) return null;
  return (catalog(data) ?? []).find((row) => row.id === wanted) ?? null;
}
function link(value) {
  if (!isRecord(value)) return null;
  const href = screenLink(value.href);
  const title = text(value.title);
  return href && title ? { href, title } : null;
}
function resolveValue(kind, value) {
  if (kind === "text" || kind === "richtext") return text(value) || null;
  if (kind === "list") {
    const items = (Array.isArray(value) ? value : []).map(text).filter(Boolean);
    return items.length ? items : null;
  }
  if (kind === "links") {
    const links = (Array.isArray(value) ? value : []).map(link).filter((l) => !!l);
    return links.length ? links : null;
  }
  if (kind === "image") {
    if (!isRecord(value)) return null;
    const src = screenLink(value.src);
    return src ? { src, alt: text(value.alt) } : null;
  }
  if (kind === "file") return link(value);
  return null;
}
function entry(row, showLabel2) {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    value: resolveValue(row.kind, row.value),
    label: showLabel2 && row.title ? row.title : "",
    css: `metadata-block has--field--${row.id} has--kind--${row.kind}`,
    input: row.input
  };
}
function storedField(data) {
  return text(data.field);
}
function showLabel(data) {
  return data.showLabel === true;
}
function placeholder(data) {
  return text(data.placeholder);
}
function metadataEntry(data) {
  const fieldId = storedField(data);
  const row = rowFor(data, fieldId);
  if (row) {
    const found = entry(row, showLabel(data));
    return { ...found, placeholder: found.value === null ? placeholder(data) : "" };
  }
  const slug = fieldSlug(fieldId);
  return {
    id: slug,
    title: "",
    kind: "",
    value: null,
    label: "",
    css: slug ? `metadata-block has--field--${slug}` : "metadata-block",
    input: "",
    placeholder: fieldId ? placeholder(data) : ""
  };
}
function sectionTitle(data) {
  return text(data.title);
}
function effectiveLayout(data) {
  const stored = text(data.layout);
  return LAYOUT_IDS.includes(stored) ? stored : DEFAULT_LAYOUT;
}
function fieldSpecs(data) {
  const value = data.fields;
  if (!Array.isArray(value)) return [];
  const specs = [];
  for (const spec of value) {
    if (!isRecord(spec)) continue;
    const field = text(spec.field);
    if (field) specs.push({ field, showLabel: spec.showLabel === true });
  }
  return specs;
}
function sectionEntries(data, keepEmpty) {
  const found = [];
  for (const spec of fieldSpecs(data)) {
    const row = rowFor(data, spec.field);
    if (!row) continue;
    const candidate = entry(row, spec.showLabel);
    if (candidate.value !== null || keepEmpty?.(candidate)) found.push(candidate);
  }
  return found;
}
function MetadataValue({ entry: entry2, tag, isEditMode, input }) {
  const Tag = tag;
  if (input) return /* @__PURE__ */ jsx(Tag, { className: "metadata-value metadata-value--text", children: input });
  if (entry2.value === null || !entry2.kind) return null;
  const className = `metadata-value metadata-value--${entry2.kind}`;
  const href = (target) => isEditMode ? {} : { href: target };
  switch (entry2.kind) {
    case "text":
      return /* @__PURE__ */ jsx(Tag, { className, children: entry2.value });
    case "richtext":
      return /* @__PURE__ */ jsx(Tag, { className, dangerouslySetInnerHTML: { __html: entry2.value } });
    case "list":
      return /* @__PURE__ */ jsx(Tag, { className, children: /* @__PURE__ */ jsx("ul", { className: "metadata-list", children: entry2.value.map((item, index) => /* @__PURE__ */ jsx("li", { className: "metadata-item", children: item }, `${item}:${index}`)) }) });
    case "links":
      return /* @__PURE__ */ jsx(Tag, { className, children: /* @__PURE__ */ jsx("ul", { className: "metadata-list", children: entry2.value.map((item, index) => /* @__PURE__ */ jsx("li", { className: "metadata-item", children: /* @__PURE__ */ jsx("a", { className: "metadata-link", ...href(item.href), children: item.title }) }, `${item.href}:${index}`)) }) });
    case "image": {
      const image = entry2.value;
      return /* @__PURE__ */ jsx(Tag, { className, children: /* @__PURE__ */ jsx("img", { className: "metadata-image", src: image.src, alt: image.alt }) });
    }
    case "file": {
      const file = entry2.value;
      return /* @__PURE__ */ jsx(Tag, { className, children: /* @__PURE__ */ jsx("a", { className: "metadata-link", ...href(file.href), children: file.title }) });
    }
    default:
      return null;
  }
}
function MetadataView({ data = {}, isEditMode, renderInput: renderInput2 }) {
  const entry2 = metadataEntry(data);
  const input = renderInput2?.(entry2, entry2.placeholder) ?? null;
  return /* @__PURE__ */ jsxs("div", { className: entry2.css, children: [
    entry2.label ? /* @__PURE__ */ jsx("span", { className: "metadata-label", children: entry2.label }) : null,
    /* @__PURE__ */ jsx(MetadataValue, { entry: entry2, tag: "div", isEditMode, input }),
    entry2.placeholder && !input ? /* @__PURE__ */ jsx("div", { className: "metadata-value metadata-value--placeholder", children: entry2.placeholder }) : null
  ] });
}
const EDIT_SUFFIX = /\/(?:@@aurora-edit|edit)\/?$/;
function apiPath() {
  const settings = config.settings;
  const value = settings?.apiPath;
  return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
}
function catalogEndpoint(location, base2) {
  const root = base2.replace(/\/+$/, "");
  if (!root) return null;
  let rootPath = "";
  try {
    rootPath = new URL(root, location.origin).pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
  let path = location.pathname.replace(EDIT_SUFFIX, "").replace(/\/+$/, "");
  if (rootPath && path === rootPath) path = "";
  else if (rootPath && path.startsWith(`${rootPath}/`)) path = path.slice(rootPath.length);
  return `${root}${path}/@metadata-catalog`;
}
const inflight = /* @__PURE__ */ new Map();
function fetchCatalog(url) {
  let pending = inflight.get(url);
  if (!pending) {
    pending = fetch(url, {
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    }).then((response) => response.ok ? response.json() : null).then(
      (body) => body && typeof body === "object" && Array.isArray(body.catalog) ? catalog(body) : null
    ).catch(() => null);
    inflight.set(url, pending);
  }
  return pending;
}
function useCatalog(data) {
  const stored = catalog(data);
  const [fetched, setFetched] = useState(null);
  const endpoint = stored || typeof globalThis.location === "undefined" ? null : catalogEndpoint(globalThis.location, apiPath());
  useEffect(() => {
    if (!endpoint) return;
    let live = true;
    fetchCatalog(endpoint).then((result) => {
      if (live) setFetched({ url: endpoint, catalog: result });
    });
    return () => {
      live = false;
    };
  }, [endpoint]);
  if (stored) return { catalog: stored, state: "stored" };
  if (!endpoint) return { catalog: null, state: "failed" };
  if (!fetched || fetched.url !== endpoint) return { catalog: null, state: "loading" };
  return fetched.catalog ? { catalog: fetched.catalog, state: "fetched" } : { catalog: null, state: "failed" };
}
const fallbackFormAtom = atom({});
function formAtom() {
  const registry = config;
  try {
    const method = registry.getUtility?.({ name: "formAtom", type: "atom" })?.method;
    const found = typeof method === "function" ? method() : null;
    return found ?? fallbackFormAtom;
  } catch {
    return fallbackFormAtom;
  }
}
function isBound(row) {
  return row.kind === "text" && (!!row.input || row.id === "title");
}
function useLiveRows(rows) {
  const content = useAtomValue(formAtom());
  if (!rows) return null;
  return rows.map((row) => {
    if (!isBound(row)) return row;
    const live = content && typeof content === "object" ? content[row.id] : void 0;
    return typeof live === "string" ? { ...row, value: live } : row;
  });
}
function useFieldBinding(fieldId) {
  const [value, setValue] = useFieldFocusedAtom(formAtom(), fieldId);
  return [typeof value === "string" ? value : null, setValue];
}
const stop = (event) => event.stopPropagation();
function FieldInput({ entry: entry2, placeholder: placeholder2 }) {
  const [bound, setValue] = useFieldBinding(entry2.id);
  const value = bound ?? (typeof entry2.value === "string" ? entry2.value : "");
  const ref = useRef(null);
  const line = entry2.input === "line";
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);
  return /* @__PURE__ */ jsx(
    "textarea",
    {
      ref,
      className: "metadata-input",
      rows: 1,
      value,
      placeholder: placeholder2 || entry2.title,
      "aria-label": entry2.title,
      onChange: (event) => {
        const next = event.target.value;
        setValue(line ? next.replace(/[\r\n]+/g, " ") : next);
      },
      onKeyDown: (event) => {
        event.stopPropagation();
        if (line && event.key === "Enter") event.preventDefault();
      },
      onKeyUp: stop,
      onBeforeInput: stop,
      onPaste: stop,
      onCopy: stop,
      onCut: stop,
      onDrop: stop
    }
  );
}
function usePreviewCatalog(data) {
  const { catalog: catalog2, state } = useCatalog(data);
  const rows = useLiveRows(catalog2);
  const preview = rows ? { ...data, catalog: rows } : data;
  return { preview, state, rows };
}
function renderInput(entry2, placeholder2 = "") {
  return entry2.input ? createElement(FieldInput, { entry: entry2, placeholder: placeholder2 }) : null;
}
function catalogNotices(state) {
  if (state === "loading") return ["Loading this page’s fields…"];
  if (state === "failed") {
    return ["The fields could not be loaded for the preview. Save and reload the page to see them."];
  }
  return [];
}
const EDIT_HINT = "Previewed as you: the values come from this page. Edit them on the Content tab.";
const INLINE_HINT = "Previewed as you: text fields are typed here and saved with the page; every other field is edited on the Content tab.";
function MetadataEdit(props) {
  const data = props.data ?? {};
  const { preview, state, rows } = usePreviewCatalog(data);
  const entry2 = metadataEntry(preview);
  const field = storedField(data);
  const notes = catalogNotices(state);
  if (!notes.length) {
    if (!field) {
      notes.push("Choose a field in the sidebar.");
    } else if (!entry2.kind) {
      notes.push(`This page has no field “${field}”, so the block renders empty.`);
    } else if (entry2.input) {
      notes.push(
        entry2.value === null ? `“${entry2.title}” is empty here — type to fill it. Until then the page ${entry2.placeholder ? "shows the placeholder" : "renders the block empty"}.` : `“${entry2.title}” is typed here and saved with the page.`
      );
    } else if (entry2.value === null) {
      notes.push(
        entry2.placeholder ? `“${entry2.title}” is empty here, so the placeholder shows.` : `“${entry2.title}” is empty here, so the block renders empty.`
      );
    } else if (rows) {
      notes.push(rows.some((row) => row.input) ? INLINE_HINT : EDIT_HINT);
    }
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(MetadataView, { data: preview, isEditMode: true, renderInput }),
    notes.map((note) => /* @__PURE__ */ jsx("p", { className: "metadata-notice", contentEditable: false, children: note }, note))
  ] });
}
function MetadataSectionView({ data = {}, isEditMode, renderInput: renderInput2 }) {
  const title = sectionTitle(data);
  const layout = effectiveLayout(data);
  const entries = sectionEntries(data, renderInput2 ? (candidate) => !!candidate.input : void 0);
  const input = (entry2) => renderInput2?.(entry2, "") ?? null;
  return /* @__PURE__ */ jsxs("section", { className: `metadata-section-block has--layout--${layout}`, "aria-label": title || void 0, children: [
    title ? /* @__PURE__ */ jsx("h2", { className: "metadata-section-title", children: title }) : null,
    entries.length && layout === "list" ? /* @__PURE__ */ jsx("div", { className: "metadata-section-list", children: entries.map((entry2, index) => /* @__PURE__ */ jsxs("div", { className: entry2.css, children: [
      entry2.label ? /* @__PURE__ */ jsx("span", { className: "metadata-label", children: entry2.label }) : null,
      /* @__PURE__ */ jsx(MetadataValue, { entry: entry2, tag: "div", isEditMode, input: input(entry2) })
    ] }, `${entry2.id}:${index}`)) }) : null,
    entries.length && layout === "table" ? /* @__PURE__ */ jsx("table", { className: "metadata-section-table", children: /* @__PURE__ */ jsx("tbody", { children: entries.map((entry2, index) => /* @__PURE__ */ jsxs(
      "tr",
      {
        className: `metadata-section-row has--field--${entry2.id} has--kind--${entry2.kind}`,
        children: [
          /* @__PURE__ */ jsx("th", { className: "metadata-label", scope: "row", children: entry2.title }),
          /* @__PURE__ */ jsx(MetadataValue, { entry: entry2, tag: "td", isEditMode, input: input(entry2) })
        ]
      },
      `${entry2.id}:${index}`
    )) }) }) : null
  ] });
}
function MetadataSectionEdit(props) {
  const data = props.data ?? {};
  const { preview, state, rows } = usePreviewCatalog(data);
  const specs = fieldSpecs(data);
  const published = sectionEntries(preview);
  const typed = sectionEntries(preview, (candidate) => !!candidate.input).filter((e) => e.input);
  const notes = catalogNotices(state);
  if (!notes.length) {
    if (!specs.length) {
      notes.push("No fields selected. Add fields in the sidebar.");
    } else if (rows) {
      const skipped = specs.filter((spec) => sectionEntries({ ...preview, fields: [spec] }).length === 0).map((spec) => rowFor(preview, spec.field)?.title || spec.field);
      if (skipped.length) {
        notes.push(`Empty here, so not shown on the page: ${skipped.join(", ")}.`);
      }
      if (typed.length) notes.push(INLINE_HINT);
      else if (published.length) notes.push(EDIT_HINT);
    }
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(MetadataSectionView, { data: preview, isEditMode: true, renderInput }),
    notes.map((note) => /* @__PURE__ */ jsx("p", { className: "metadata-notice", contentEditable: false, children: note }, note))
  ] });
}
const METADATA_BLOCK_TYPE = "metadata";
const METADATA_SECTION_BLOCK_TYPE = "metadataSection";
const BACKGROUND_FIELD_NAME = "backgroundColor";
function backgroundField(data, blockType) {
  const definitions = getStyleFieldDefinitionsFromRegistry(BACKGROUND_FIELD_NAME, {
    data,
    blockType,
    fieldName: BACKGROUND_FIELD_NAME
  });
  const choices = definitions.filter((definition) => typeof definition?.name === "string").map((definition) => [definition.name, definition.label || definition.name]);
  if (!choices.length) return null;
  return {
    title: "Background",
    choices,
    ...choices.some(([name]) => name === "none") ? { default: "none" } : {},
    styleField: true
  };
}
function styling(background) {
  return {
    fieldset: {
      id: "styling",
      title: "Styling",
      fields: ["blockWidth", ...background ? [BACKGROUND_FIELD_NAME] : []]
    },
    properties: {
      blockWidth: {
        title: "Block width",
        widget: "width",
        default: "default",
        styleField: true
      },
      ...background ? { [BACKGROUND_FIELD_NAME]: background } : {}
    }
  };
}
function MetadataSchema({ formData = {} } = {}) {
  const style = styling(backgroundField(formData, METADATA_BLOCK_TYPE));
  return {
    title: "Metadata",
    fieldsets: [
      { id: "default", title: "Default", fields: ["field", "showLabel", "placeholder"] },
      style.fieldset
    ],
    properties: {
      field: {
        title: "Field",
        description: "Which of this page’s fields to show.",
        widget: "metadata_field",
        catalog: formData.catalog
      },
      showLabel: {
        title: "Show label",
        description: "Put the field’s title above its value.",
        widget: "metadata_boolean"
      },
      placeholder: {
        title: "Placeholder",
        description: "Shown when the field is empty on this page."
      },
      ...style.properties
    },
    required: []
  };
}
function MetadataSectionSchema({ formData = {} } = {}) {
  const style = styling(backgroundField(formData, METADATA_SECTION_BLOCK_TYPE));
  return {
    title: "Metadata section",
    fieldsets: [
      { id: "default", title: "Default", fields: ["title", "layout", "fields"] },
      style.fieldset
    ],
    properties: {
      title: {
        title: "Heading",
        description: "Optional heading above the fields."
      },
      layout: {
        title: "Layout",
        widget: "metadata_select",
        choices: LAYOUTS.map(([id, label]) => [id, label]),
        // NOT a storage guarantee — both renderers fall back to it themselves.
        default: DEFAULT_LAYOUT
      },
      fields: {
        title: "Fields",
        description: "Which of this page’s fields to show, in order.",
        widget: "metadata_fields",
        catalog: formData.catalog
      },
      ...style.properties
    },
    required: []
  };
}
const labelClass = "w-fit cursor-default text-xs font-medium text-quanta-pigeon";
const controlClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
function FieldShell({
  label,
  description,
  className,
  blockClass,
  render
}) {
  const controlId = useId();
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `${blockClass} flex flex-col gap-1${className ? ` ${className}` : ""}`,
      children: [
        label ? /* @__PURE__ */ jsx("label", { htmlFor: controlId, className: labelClass, children: label }) : null,
        render(controlId),
        description ? /* @__PURE__ */ jsx("p", { className: "text-xs font-normal text-quanta-pigeon", children: description }) : null
      ]
    }
  );
}
function MetadataBooleanWidget(props) {
  const { description, className, onChange } = props;
  const checked = (props.value ?? props.defaultValue) === true;
  return /* @__PURE__ */ jsx(
    FieldShell,
    {
      blockClass: "metadata-boolean-widget",
      description,
      className,
      render: (controlId) => /* @__PURE__ */ jsxs("label", { htmlFor: controlId, className: `${labelClass} flex items-center gap-2`, children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            id: controlId,
            type: "checkbox",
            name: props.name,
            checked,
            onChange: (event) => onChange?.(event.target.checked)
          }
        ),
        props.label
      ] })
    }
  );
}
const asText = (value) => typeof value === "string" ? value : value == null ? "" : String(value);
function MetadataSelectWidget(props) {
  const { label, description, className, choices = [], onChange } = props;
  const stored = asText(props.value ?? props.defaultValue);
  const current = stored || asText(props.default);
  const known = choices.some(([value]) => value === current);
  return /* @__PURE__ */ jsx(
    FieldShell,
    {
      blockClass: "metadata-select-widget",
      label,
      description,
      className,
      render: (controlId) => /* @__PURE__ */ jsxs(
        "select",
        {
          id: controlId,
          name: props.name,
          required: props.required,
          value: current,
          onChange: (event) => onChange?.(event.target.value),
          className: controlClass,
          children: [
            current === "" ? /* @__PURE__ */ jsx("option", { value: "" }) : null,
            current !== "" && !known ? /* @__PURE__ */ jsx("option", { value: current, children: current }) : null,
            choices.map(([value, choiceLabel]) => /* @__PURE__ */ jsx("option", { value, children: choiceLabel }, value))
          ]
        }
      )
    }
  );
}
function fieldOptions(rows) {
  return (rows ?? []).map((row) => [row.id, row.title || row.id]);
}
function MetadataFieldWidget(props) {
  const { label, description, className, onChange } = props;
  const { catalog: catalog2, state } = useCatalog({ catalog: props.catalog });
  const options = fieldOptions(catalog2);
  const current = text(asText(props.value ?? props.defaultValue));
  const known = options.some(([value]) => value === current);
  return /* @__PURE__ */ jsx(
    FieldShell,
    {
      blockClass: "metadata-field-widget",
      label,
      description: state === "loading" ? "Loading this page’s fields…" : description,
      className,
      render: (controlId) => /* @__PURE__ */ jsxs(
        "select",
        {
          id: controlId,
          name: props.name,
          required: props.required,
          value: current,
          onChange: (event) => onChange?.(event.target.value),
          className: controlClass,
          children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "— choose a field —" }),
            current && !known ? /* @__PURE__ */ jsx("option", { value: current, children: current }) : null,
            options.map(([value, optionLabel]) => /* @__PURE__ */ jsx("option", { value, children: optionLabel }, value))
          ]
        }
      )
    }
  );
}
const buttonClass = "rounded-md border border-input bg-background px-2 py-1 text-xs";
function MetadataFieldsWidget(props) {
  const { label, description, className, onChange } = props;
  const { catalog: catalog2 } = useCatalog({ catalog: props.catalog });
  const options = fieldOptions(catalog2);
  const specs = fieldSpecs({ fields: props.value ?? props.defaultValue });
  const update = (next) => onChange?.(next);
  const move = (from, to) => {
    if (to < 0 || to >= specs.length) return;
    const next = [...specs];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    update(next);
  };
  return /* @__PURE__ */ jsx(
    FieldShell,
    {
      blockClass: "metadata-fields-widget",
      label,
      description,
      className,
      render: (controlId) => /* @__PURE__ */ jsxs("div", { id: controlId, className: "flex flex-col gap-2", children: [
        specs.map((spec, index) => {
          const known = options.some(([value]) => value === spec.field);
          return /* @__PURE__ */ jsxs("div", { className: "metadata-fields-row flex flex-col gap-1", children: [
            /* @__PURE__ */ jsxs(
              "select",
              {
                "aria-label": `Field ${index + 1}`,
                value: spec.field,
                className: controlClass,
                onChange: (event) => update(specs.map((s, i) => i === index ? { ...s, field: text(event.target.value) } : s)),
                children: [
                  !known ? /* @__PURE__ */ jsx("option", { value: spec.field, children: spec.field }) : null,
                  options.map(([value, optionLabel]) => /* @__PURE__ */ jsx("option", { value, children: optionLabel }, value))
                ]
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxs("label", { className: `${labelClass} flex items-center gap-1`, children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: spec.showLabel,
                    onChange: (event) => update(specs.map((s, i) => i === index ? { ...s, showLabel: event.target.checked } : s))
                  }
                ),
                "Show label"
              ] }),
              /* @__PURE__ */ jsx("button", { type: "button", className: buttonClass, "aria-label": `Move field ${index + 1} up`, disabled: index === 0, onClick: () => move(index, index - 1), children: "↑" }),
              /* @__PURE__ */ jsx("button", { type: "button", className: buttonClass, "aria-label": `Move field ${index + 1} down`, disabled: index === specs.length - 1, onClick: () => move(index, index + 1), children: "↓" }),
              /* @__PURE__ */ jsx("button", { type: "button", className: buttonClass, "aria-label": `Remove field ${index + 1}`, onClick: () => update(specs.filter((_s, i) => i !== index)), children: "×" })
            ] })
          ] }, `${spec.field}:${index}`);
        }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: buttonClass,
            onClick: () => {
              const unused = options.find(([value]) => !specs.some((s) => s.field === value));
              update([...specs, { field: unused ? unused[0] : options[0]?.[0] ?? "title", showLabel: true }]);
            },
            children: "Add field"
          }
        )
      ] })
    }
  );
}
const METADATA_WIDGETS = {
  metadata_field: MetadataFieldWidget,
  metadata_fields: MetadataFieldsWidget,
  metadata_select: MetadataSelectWidget,
  metadata_boolean: MetadataBooleanWidget
};
function registerMetadataWidgets(config2) {
  config2.registerWidget({ key: "widget", definition: { ...METADATA_WIDGETS } });
  return config2;
}
const MetadataBlockInfo = {
  id: METADATA_BLOCK_TYPE,
  title: "Metadata",
  edit: MetadataEdit,
  view: MetadataView,
  blockSchema: MetadataSchema,
  icon: MetadataIcon,
  category: "metadata"
};
const MetadataSectionBlockInfo = {
  id: METADATA_SECTION_BLOCK_TYPE,
  title: "Metadata section",
  edit: MetadataSectionEdit,
  view: MetadataSectionView,
  blockSchema: MetadataSectionSchema,
  icon: MetadataSectionIcon,
  category: "metadata"
};
function install(config2) {
  registerMetadataWidgets(config2);
  config2.blocks.blocksConfig[METADATA_BLOCK_TYPE] = MetadataBlockInfo;
  config2.blocks.blocksConfig[METADATA_SECTION_BLOCK_TYPE] = MetadataSectionBlockInfo;
  return config2;
}
export {
  METADATA_BLOCK_TYPE,
  METADATA_SECTION_BLOCK_TYPE,
  MetadataBlockInfo,
  MetadataEdit,
  MetadataSchema,
  MetadataSectionBlockInfo,
  MetadataSectionEdit,
  MetadataSectionSchema,
  MetadataSectionView,
  MetadataView,
  install as default
};
//# sourceMappingURL=metadata-block.js.map
