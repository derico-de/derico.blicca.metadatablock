import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect, useRef, useLayoutEffect, useId, createElement } from "react";
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
const KINDS = ["text", "richtext", "list", "tags", "links", "image", "file"];
const INPUTS = [
  "line",
  "text",
  "number",
  "boolean",
  "select",
  "tokens",
  "datetime",
  "date",
  "relations",
  "file"
];
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
const isRecord$1 = (value) => !!value && typeof value === "object" && !Array.isArray(value);
function catalog(data) {
  const value = data.catalog;
  if (!Array.isArray(value)) return null;
  const rows = [];
  for (const raw of value) {
    if (!isRecord$1(raw)) continue;
    const id = fieldSlug(raw.id);
    const kind = text(raw.kind);
    if (!id || !KINDS.includes(kind)) continue;
    const control = text(raw.input);
    const row = {
      id,
      title: text(raw.title),
      kind,
      value: raw.value,
      input: INPUTS.includes(control) ? control : ""
    };
    if (row.input) {
      row.raw = raw.raw;
      row.schema = isRecord$1(raw.schema) ? raw.schema : {};
    }
    rows.push(row);
  }
  return rows;
}
function rowFor(data, fieldId) {
  const wanted = text(fieldId);
  if (!wanted) return null;
  return (catalog(data) ?? []).find((row) => row.id === wanted) ?? null;
}
function link(value) {
  if (!isRecord$1(value)) return null;
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
  if (kind === "tags" || kind === "links") {
    const links = (Array.isArray(value) ? value : []).map(link).filter((l) => !!l);
    return links.length ? links : null;
  }
  if (kind === "image") {
    if (!isRecord$1(value)) return null;
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
    input: row.input,
    ...row.input ? { raw: row.raw, schema: row.schema } : {}
  };
}
function storedField(data) {
  return text(data.field);
}
function showLabel(data) {
  return data.showLabel === true;
}
function showInView(data) {
  return data.showInView !== false;
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
    if (!isRecord$1(spec)) continue;
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
  if (input) return /* @__PURE__ */ jsx(Tag, { className: `metadata-value metadata-value--${entry2.kind || "text"}`, children: input });
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
    case "tags":
      return /* @__PURE__ */ jsx(Tag, { className, children: /* @__PURE__ */ jsx("ul", { className: "metadata-list", children: entry2.value.map((item, index) => /* @__PURE__ */ jsx("li", { className: "metadata-item", children: /* @__PURE__ */ jsx("a", { className: "metadata-tag", rel: "nofollow", ...href(item.href), children: item.title }) }, `${item.href}:${index}`)) }) });
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
  if (!isEditMode && !showInView(data)) return null;
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
  return row.kind === "text" && (row.input === "line" || row.input === "text" || row.id === "title");
}
function useLiveRows(rows) {
  const content = useAtomValue(formAtom());
  if (!rows) return null;
  return rows.map((row) => {
    const live = content && typeof content === "object" ? content[row.id] : void 0;
    if (live === void 0) return row;
    const next = row.input ? { ...row, raw: live } : row;
    return isBound(row) && typeof live === "string" ? { ...next, value: live } : next;
  });
}
function hasContent(entry2) {
  if (!entry2.input || entry2.raw === void 0) return entry2.value !== null;
  const raw = entry2.raw;
  if (raw == null || raw === "" || raw === false) return raw === false;
  if (typeof raw === "string") return raw.trim() !== "";
  if (Array.isArray(raw)) return raw.length > 0;
  if (typeof raw === "object") return Object.keys(raw).length > 0;
  return true;
}
function useFieldBinding(fieldId) {
  const [value, setValue] = useFieldFocusedAtom(formAtom(), fieldId);
  return [value, setValue];
}
function useControlValue(entry2) {
  const [bound, setValue] = useFieldBinding(entry2.id);
  return [bound === void 0 ? entry2.raw : bound, setValue];
}
const stop$1 = (event) => event.stopPropagation();
function FieldInput({ entry: entry2, placeholder: placeholder2 }) {
  const [bound, setValue] = useControlValue(entry2);
  const value = typeof bound === "string" ? bound : bound == null && typeof entry2.value === "string" ? entry2.value : "";
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
      onKeyUp: stop$1,
      onBeforeInput: stop$1,
      onPaste: stop$1,
      onCopy: stop$1,
      onCut: stop$1,
      onDrop: stop$1
    }
  );
}
const stop = (event) => event.stopPropagation();
function hostWidget(name) {
  const registry = config;
  try {
    return registry.getWidget?.(name) ?? null;
  } catch {
    return null;
  }
}
const isRecord = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const tokenOf = (value) => isRecord(value) ? String(value.token ?? "") : typeof value === "string" ? value : "";
const choicesOf = (schema) => Array.isArray(schema?.choices) ? schema.choices.filter((pair) => Array.isArray(pair) && pair.length >= 2).map(([token, title]) => [String(token), String(title)]) : [];
function NumberControl({ entry: entry2 }) {
  const [bound, setValue] = useControlValue(entry2);
  const value = typeof bound === "number" ? String(bound) : typeof bound === "string" ? bound : "";
  return /* @__PURE__ */ jsx(
    "input",
    {
      type: "number",
      className: "metadata-input",
      "aria-label": entry2.title,
      value,
      step: "any",
      onChange: (event) => {
        const raw = event.target.value;
        setValue(raw === "" ? null : Number(raw));
      }
    }
  );
}
function BooleanControl({ entry: entry2 }) {
  const [bound, setValue] = useControlValue(entry2);
  const id = useId();
  return /* @__PURE__ */ jsxs("label", { htmlFor: id, className: "metadata-input metadata-input--boolean", children: [
    /* @__PURE__ */ jsx(
      "input",
      {
        id,
        type: "checkbox",
        checked: bound === true,
        onChange: (event) => setValue(event.target.checked)
      }
    ),
    /* @__PURE__ */ jsx("span", { children: entry2.title })
  ] });
}
function SelectControl({ entry: entry2 }) {
  const [bound, setValue] = useControlValue(entry2);
  const current = tokenOf(bound);
  const choices = choicesOf(entry2.schema);
  const known = choices.some(([token]) => token === current);
  return /* @__PURE__ */ jsxs(
    "select",
    {
      className: "metadata-input",
      "aria-label": entry2.title,
      value: current,
      onChange: (event) => setValue(event.target.value || null),
      children: [
        !entry2.schema?.required || !current ? /* @__PURE__ */ jsx("option", { value: "" }) : null,
        current && !known ? /* @__PURE__ */ jsx("option", { value: current, children: current }) : null,
        choices.map(([token, title]) => /* @__PURE__ */ jsx("option", { value: token, children: title }, token))
      ]
    }
  );
}
function TokensControl({ entry: entry2 }) {
  const [bound, setValue] = useControlValue(entry2);
  const [draft, setDraft] = useState("");
  const listId = useId();
  const choices = choicesOf(entry2.schema);
  const titles = new Map(choices);
  const open = entry2.schema?.additionalItems !== false;
  const tokens = (Array.isArray(bound) ? bound : []).map(tokenOf).filter(Boolean);
  const add = (candidate) => {
    const token = candidate.trim();
    if (!token || tokens.includes(token)) return setDraft("");
    if (!open && !titles.has(token)) return;
    setValue([...tokens, token]);
    setDraft("");
  };
  const remove = (token) => setValue(tokens.filter((t) => t !== token));
  return /* @__PURE__ */ jsxs("div", { className: "metadata-input metadata-input--tokens", children: [
    /* @__PURE__ */ jsx("ul", { className: "metadata-list", children: tokens.map((token) => /* @__PURE__ */ jsxs("li", { className: "metadata-item metadata-token", children: [
      /* @__PURE__ */ jsx("span", { children: titles.get(token) ?? token }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "metadata-token-remove",
          "aria-label": `Remove ${titles.get(token) ?? token}`,
          onClick: () => remove(token),
          children: "×"
        }
      )
    ] }, token)) }),
    /* @__PURE__ */ jsx(
      "input",
      {
        type: "text",
        className: "metadata-token-entry",
        "aria-label": entry2.title,
        placeholder: open ? "Add…" : "Choose…",
        list: choices.length ? listId : void 0,
        value: draft,
        onChange: (event) => setDraft(event.target.value),
        onBlur: () => draft && add(draft),
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            add(draft);
          } else if (event.key === "Backspace" && !draft && tokens.length) {
            remove(tokens[tokens.length - 1]);
          }
        }
      }
    ),
    choices.length ? /* @__PURE__ */ jsx("datalist", { id: listId, children: choices.map(([token, title]) => /* @__PURE__ */ jsx("option", { value: token, children: title }, token)) }) : null
  ] });
}
function localDateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function DateControl({ entry: entry2 }) {
  const [bound, setValue] = useControlValue(entry2);
  const value = typeof bound === "string" ? bound : null;
  const dateOnly = entry2.input === "date";
  return /* @__PURE__ */ jsx(
    "input",
    {
      type: dateOnly ? "date" : "datetime-local",
      className: "metadata-input",
      "aria-label": entry2.title,
      value: value ? dateOnly ? value.slice(0, 10) : localDateTime(value) : "",
      onChange: (event) => {
        const raw = event.target.value;
        if (!raw) return setValue(null);
        setValue(dateOnly ? raw : new Date(raw).toISOString());
      }
    }
  );
}
function RelationsControl({ entry: entry2 }) {
  const [bound, setValue] = useControlValue(entry2);
  const single = entry2.schema?.factory === "Relation Choice" || entry2.schema?.type === "string";
  const items = (Array.isArray(bound) ? bound : bound ? [bound] : []).filter(isRecord);
  const Widget = hostWidget("object_browser");
  const write = (next) => {
    const rows = next.map((item) => ({ "@id": item["@id"], title: item.title }));
    setValue(single ? rows[0] ?? null : rows);
  };
  return /* @__PURE__ */ jsxs("div", { className: "metadata-input metadata-input--relations", children: [
    items.length ? /* @__PURE__ */ jsx("ul", { className: "metadata-list", children: items.map((item, index) => /* @__PURE__ */ jsxs("li", { className: "metadata-item metadata-token", children: [
      /* @__PURE__ */ jsx("span", { children: String(item.title ?? item["@id"] ?? "") }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "metadata-token-remove",
          "aria-label": `Remove ${String(item.title ?? item["@id"] ?? "")}`,
          onClick: () => write(items.filter((_item, i) => i !== index)),
          children: "×"
        }
      )
    ] }, `${String(item["@id"])}:${index}`)) }) : null,
    Widget ? /* @__PURE__ */ jsx(
      Widget,
      {
        id: entry2.id,
        mode: single ? "single" : "multiple",
        widgetOptions: entry2.schema?.widgetOptions,
        onChange: (picked) => {
          const chosen = (Array.isArray(picked) ? picked : picked ? [picked] : []).filter(isRecord);
          write(single ? chosen.slice(0, 1) : [...items, ...chosen]);
        }
      }
    ) : /* @__PURE__ */ jsx("p", { className: "metadata-control-note", children: "This host has no content picker." })
  ] });
}
function byteDisplay(size) {
  const bytes = typeof size === "number" ? size : Number(size);
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes === 0) return "0 KB";
  if (bytes <= 1024) return "1 KB";
  if (bytes > 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  return `${Math.floor(bytes / 1024)} KB`;
}
const PREVIEW_SCALES = ["thumb", "mini", "preview", "teaser"];
function scaleOf(value) {
  if (!value) return "";
  const scales = isRecord(value.scales) ? value.scales : {};
  for (const name of PREVIEW_SCALES) {
    const scale = scales[name];
    if (isRecord(scale) && typeof scale.download === "string") return scale.download;
  }
  return typeof value.download === "string" ? value.download : "";
}
function FileControl({ entry: entry2 }) {
  const [bound, setValue] = useControlValue(entry2);
  const fileRef = useRef(null);
  const [picked, setPicked] = useState(null);
  const image = entry2.kind === "image";
  const current = isRecord(bound) ? bound : null;
  const uploaded = !!current && typeof current.data === "string";
  const name = current ? String(current.filename ?? "") : "";
  const type = current ? String(current["content-type"] ?? "") : "";
  const source = image ? uploaded ? picked?.url ?? "" : scaleOf(current) : "";
  const size = byteDisplay(uploaded ? picked?.size : current?.size);
  const meta = [type, size].filter(Boolean).join(", ");
  const clear = () => {
    setValue(null);
    setPicked(null);
    if (fileRef.current) fileRef.current.value = "";
  };
  const onPick = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      setPicked({ url, size: file.size });
      setValue({
        data: url.slice(url.indexOf(",") + 1),
        encoding: "base64",
        filename: file.name,
        "content-type": file.type || "application/octet-stream"
      });
    };
    reader.readAsDataURL(file);
  };
  return /* @__PURE__ */ jsxs("div", { className: "metadata-input metadata-input--file", children: [
    source ? /* @__PURE__ */ jsx("img", { className: "metadata-file-preview", src: source, alt: "" }) : null,
    name ? /* @__PURE__ */ jsxs("p", { className: "metadata-file-current", children: [
      /* @__PURE__ */ jsx("span", { className: "metadata-file-name", children: name }),
      meta ? /* @__PURE__ */ jsx("span", { className: "metadata-file-meta", children: ` — ${meta}` }) : null
    ] }) : null,
    name ? /* @__PURE__ */ jsx("button", { type: "button", className: "metadata-file-remove", onClick: clear, children: image ? "Remove existing image" : "Remove existing file" }) : null,
    /* @__PURE__ */ jsx(
      "input",
      {
        ref: fileRef,
        type: "file",
        className: "metadata-file-input",
        "aria-label": entry2.title,
        accept: image ? "image/*" : void 0,
        onChange: onPick
      }
    ),
    image ? /* @__PURE__ */ jsx("p", { className: "metadata-control-note", children: "Allowed types: image/*." }) : null
  ] });
}
function FieldControl({ entry: entry2, placeholder: placeholder2 }) {
  let control = null;
  switch (entry2.input) {
    case "line":
    case "text":
      control = /* @__PURE__ */ jsx(FieldInput, { entry: entry2, placeholder: placeholder2 });
      break;
    case "number":
      control = /* @__PURE__ */ jsx(NumberControl, { entry: entry2 });
      break;
    case "boolean":
      control = /* @__PURE__ */ jsx(BooleanControl, { entry: entry2 });
      break;
    case "select":
      control = /* @__PURE__ */ jsx(SelectControl, { entry: entry2 });
      break;
    case "tokens":
      control = /* @__PURE__ */ jsx(TokensControl, { entry: entry2 });
      break;
    case "datetime":
    case "date":
      control = /* @__PURE__ */ jsx(DateControl, { entry: entry2 });
      break;
    case "relations":
      control = /* @__PURE__ */ jsx(RelationsControl, { entry: entry2 });
      break;
    case "file":
      control = /* @__PURE__ */ jsx(FileControl, { entry: entry2 });
      break;
    default:
      return null;
  }
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: `metadata-control metadata-control--${entry2.input}`,
      "data-metadata-control": entry2.input,
      onKeyDown: stop,
      onKeyUp: stop,
      onBeforeInput: stop,
      onPaste: stop,
      onCopy: stop,
      onCut: stop,
      onDrop: stop,
      children: control
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
  return entry2.input ? createElement(FieldControl, { entry: entry2, placeholder: placeholder2 }) : null;
}
function MetadataEdit(props) {
  const { preview } = usePreviewCatalog(props.data ?? {});
  return /* @__PURE__ */ jsx(MetadataView, { data: preview, isEditMode: true, renderInput });
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
  const { preview } = usePreviewCatalog(props.data ?? {});
  return /* @__PURE__ */ jsx(MetadataSectionView, { data: preview, isEditMode: true, renderInput });
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
      {
        id: "default",
        title: "Default",
        fields: ["metadataNotice", "field", "showInView", "showLabel", "placeholder"]
      },
      style.fieldset
    ],
    properties: {
      metadataNotice: {
        widget: "metadata_notice",
        data: formData
      },
      field: {
        title: "Field",
        description: "Which of this page’s fields to show.",
        widget: "metadata_field",
        catalog: formData.catalog
      },
      showInView: {
        title: "Show in view",
        description: "Off, the field is only edited here and never shown on the page.",
        widget: "metadata_boolean",
        // NOT a storage guarantee — both renderers read an absent value as
        // `true` themselves, so a block authored before the setting existed
        // still renders.
        default: true
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
      {
        id: "default",
        title: "Default",
        fields: ["metadataNotice", "title", "layout", "fields"]
      },
      style.fieldset
    ],
    properties: {
      metadataNotice: {
        widget: "metadata_section_notice",
        data: formData
      },
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
  const checked = (props.value ?? props.defaultValue ?? props.default) === true;
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
const EDIT_HINT = "Previewed as you: the values come from this page. Edit them on the Content tab.";
const INLINE_HINT = "Previewed as you: fields with a control are edited in the block and saved with the page; every other field is edited on the Content tab.";
function catalogNotices(state) {
  if (state === "loading") return ["Loading this page’s fields…"];
  if (state === "failed") {
    return ["The fields could not be loaded for the preview. Save and reload the page to see them."];
  }
  return [];
}
function useMetadataNotices(data) {
  const { preview, state, rows } = usePreviewCatalog(data);
  const entry2 = metadataEntry(preview);
  const field = storedField(data);
  const notes = catalogNotices(state);
  if (notes.length) return notes;
  if (!field) {
    notes.push("Choose a field below.");
  } else if (!entry2.kind) {
    notes.push(`This page has no field “${field}”, so the block renders empty.`);
  } else if (!showInView(data)) {
    notes.push(
      entry2.input ? `“${entry2.title}” is edited in the block and saved with the page, and the page does not show it.` : `“${entry2.title}” is not shown on the page. Switch “Show in view” on below to show it.`
    );
  } else if (entry2.input) {
    notes.push(
      !hasContent(entry2) ? `“${entry2.title}” is empty on this page. Type into the block to fill it in; until then the page ${entry2.placeholder ? "shows the placeholder" : "renders the block empty"}.` : `“${entry2.title}” is edited in the block and saved with the page.`
    );
  } else if (entry2.value === null) {
    notes.push(
      entry2.placeholder ? `“${entry2.title}” is empty on this page, so the placeholder shows.` : `“${entry2.title}” is empty on this page, so the block renders empty.`
    );
  } else if (rows) {
    notes.push(rows.some((row) => row.input) ? INLINE_HINT : EDIT_HINT);
  }
  return notes;
}
function useMetadataSectionNotices(data) {
  const { preview, state, rows } = usePreviewCatalog(data);
  const specs = fieldSpecs(data);
  const published = sectionEntries(preview);
  const typed = sectionEntries(preview, (candidate) => !!candidate.input).filter((e) => e.input);
  const notes = catalogNotices(state);
  if (notes.length) return notes;
  if (!specs.length) {
    notes.push("No fields selected yet. Add them below.");
  } else if (rows) {
    const skipped = specs.filter((spec) => {
      const row = rowFor(preview, spec.field);
      return !row || !hasContent(entry(row, spec.showLabel));
    }).map((spec) => rowFor(preview, spec.field)?.title || spec.field);
    if (skipped.length) {
      notes.push(`Empty on this page, so not shown: ${skipped.join(", ")}.`);
    }
    if (typed.length) notes.push(INLINE_HINT);
    else if (published.length) notes.push(EDIT_HINT);
  }
  return notes;
}
const noticeClass = "metadata-notice text-xs font-normal text-quanta-pigeon";
function NoticeList({ notes, className }) {
  if (!notes.length) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      role: "status",
      className: `metadata-notice-widget flex flex-col gap-1${className ? ` ${className}` : ""}`,
      children: notes.map((note) => /* @__PURE__ */ jsx("p", { className: noticeClass, children: note }, note))
    }
  );
}
function MetadataNoticeWidget(props) {
  return /* @__PURE__ */ jsx(NoticeList, { notes: useMetadataNotices(props.data ?? {}), className: props.className });
}
function MetadataSectionNoticeWidget(props) {
  return /* @__PURE__ */ jsx(NoticeList, { notes: useMetadataSectionNotices(props.data ?? {}), className: props.className });
}
const METADATA_WIDGETS = {
  metadata_field: MetadataFieldWidget,
  metadata_fields: MetadataFieldsWidget,
  metadata_select: MetadataSelectWidget,
  metadata_boolean: MetadataBooleanWidget,
  metadata_notice: MetadataNoticeWidget,
  metadata_section_notice: MetadataSectionNoticeWidget
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
