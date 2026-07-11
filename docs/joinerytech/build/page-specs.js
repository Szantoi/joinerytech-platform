/* AUTO-GENERATED from page-specs.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-specs.jsx — Specifikációk (Tervezés világ)
// Moduláris: Kategóriák (bővíthető mezősémák) · Stílusok · Műszaki.
// Egy kategória definiálja a stílus/műszaki mezőit; a példányok ezeket töltik ki
// (opciónként ×szorzó / +felár). Az ármotor (specs-engine.js) ezekből számol.
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateS,
  useMemo: useMemoS
} = React;
function specAccentOf(cat) {
  return cat && window.SPEC_ACCENT[cat.color] || window.SPEC_ACCENT.stone;
}

// Compact, human-readable value for a field+value
function fieldValueLabel(field, val) {
  if (field.kind === "bool") return val ? "Igen" : "Nem";
  if (field.kind === "material") return window.sim.materialInfo(val).name || val || "—";
  if (field.kind === "list") return Array.isArray(val) && val.length ? val.join(", ") : "—";
  if (field.role === "precision" && window.PRECISION_BANDS[val]) return window.PRECISION_BANDS[val].label;
  if (field.options) {
    const o = field.options.find(x => x.value === val);
    if (o && o.label) return o.label;
  }
  return val === undefined || val === "" ? "—" : String(val);
}

// ──────────────────────────────────────────────────────────────────────────
// Field control inside the instance editor
// ──────────────────────────────────────────────────────────────────────────
function InstanceField({
  field,
  value,
  onChange,
  accent
}) {
  const hint = o => {
    const bits = [];
    if (o.mult && o.mult !== 1) bits.push("×" + o.mult);
    if (o.add) bits.push("+" + o.add.toLocaleString("hu-HU"));
    return bits.length ? " " + bits.join(" ") : "";
  };
  if (field.kind === "bool") {
    const on = !!value;
    return /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-3 p-2.5 rounded-lg border border-stone-100 bg-stone-50/50"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] text-stone-800"
    }, field.label, field.required && /*#__PURE__*/React.createElement("span", {
      className: "text-rose-400 ml-0.5"
    }, "*")), /*#__PURE__*/React.createElement("button", {
      onClick: () => onChange(!on),
      className: `w-11 h-6 rounded-full transition relative shrink-0 ${on ? accent.solid : "bg-stone-300"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`
    })));
  }
  if (field.kind === "text" || field.kind === "number") {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, {
      field: field
    }), /*#__PURE__*/React.createElement("input", {
      type: field.kind === "number" ? "number" : "text",
      value: value ?? "",
      onChange: e => onChange(field.kind === "number" ? Number(e.target.value) : e.target.value),
      className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px]"
    }));
  }
  if (field.kind === "color") {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, {
      field: field
    }), /*#__PURE__*/React.createElement("input", {
      type: "color",
      value: value || "#dcc4a3",
      onChange: e => onChange(e.target.value),
      className: "h-9 w-16 rounded-lg border border-stone-200 bg-white"
    }));
  }
  // material
  if (field.kind === "material") {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, {
      field: field,
      extra: field.slot ? `slot: ${field.slot}` : null
    }), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5"
    }, (field.options || []).map(o => {
      const m = window.sim.materialInfo(o.value);
      const on = value === o.value;
      return /*#__PURE__*/React.createElement("button", {
        key: o.value,
        onClick: () => onChange(on ? "" : o.value),
        className: `flex items-center gap-1.5 h-9 pl-1.5 pr-2.5 rounded-lg text-[11.5px] font-medium border transition ${on ? `${accent.solid} border-transparent text-white` : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"}`
      }, /*#__PURE__*/React.createElement("span", {
        className: "w-5 h-5 rounded border border-black/10 shrink-0",
        style: {
          background: m.color
        }
      }), m.name, m.known && m.price != null && /*#__PURE__*/React.createElement("span", {
        className: `text-[10px] ${on ? "opacity-80" : "text-stone-400"}`
      }, (m.price / 1000).toFixed(1), "k/", m.unit || "m²"));
    })));
  }
  // select / list
  const isList = field.kind === "list";
  const arr = isList ? Array.isArray(value) ? value : [] : null;
  const pick = v => {
    if (isList) onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);else onChange(value === v ? "" : v);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, {
    field: field,
    extra: isList ? "több is választható" : null
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, (field.options || []).map(o => {
    const on = isList ? arr.includes(o.value) : value === o.value;
    const lbl = o.label || (field.role === "precision" && window.PRECISION_BANDS[o.value] ? window.PRECISION_BANDS[o.value].label : o.value);
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      onClick: () => pick(o.value),
      className: `h-9 px-2.5 rounded-lg text-[11.5px] font-medium border transition ${on ? `${accent.solid} border-transparent text-white` : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"}`
    }, lbl, /*#__PURE__*/React.createElement("span", {
      className: `text-[10px] ${on ? "opacity-80" : "text-stone-400"}`
    }, hint(o)));
  })));
}
function Label({
  field,
  extra
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, field.label, field.required && /*#__PURE__*/React.createElement("span", {
    className: "text-rose-400 ml-0.5"
  }, "*")), extra && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400"
  }, "\xB7 ", extra));
}

// ──────────────────────────────────────────────────────────────────────────
// Instance editor (style or tech) — renders the category schema
// ──────────────────────────────────────────────────────────────────────────
function InstanceEditor({
  kind,
  instance,
  category,
  onClose
}) {
  const isNew = !instance;
  const fields = kind === "tech" ? category.techFields || [] : category.styleFields || [];
  const accent = kind === "tech" ? window.SPEC_ACCENT.teal : window.SPEC_ACCENT.violet;
  const [name, setName] = useStateS(instance ? instance.name : "");
  const [note, setNote] = useStateS(instance ? instance.note || "" : "");
  const [values, setValues] = useStateS(() => ({
    ...(instance ? instance.values : {})
  }));
  const setVal = (k, v) => setValues(p => ({
    ...p,
    [k]: v
  }));
  const save = () => {
    const payload = {
      categoryId: category.id,
      name: name.trim() || "Névtelen",
      note,
      values
    };
    if (isNew) window.sim.addSpecInstance(kind, payload);else window.sim.updateSpecInstance(kind, instance.id, payload);
    onClose();
  };
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: true,
    onClose: onClose,
    title: isNew ? `Új ${kind === "tech" ? "műszaki" : "stílus"} — ${category.name}` : instance.name,
    subtitle: `${category.name} · ${kind === "tech" ? "műszaki paraméterek" : "stílus / kivitel"}`,
    width: 560,
    footer: /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-3"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onClose,
      className: "h-9 px-4 rounded-lg border border-stone-200 text-[12.5px] text-stone-600 hover:bg-stone-50"
    }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
      onClick: save,
      className: `h-9 px-5 rounded-lg text-white text-[12.5px] font-semibold inline-flex items-center gap-2 ${accent.solid} ${accent.solidHover}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14
    }), isNew ? "Létrehozás" : "Mentés"))
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium block mb-1"
  }, "Megnevez\xE9s"), /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value),
    autoFocus: true,
    placeholder: kind === "tech" ? "pl. Standard gyártási előírás" : "pl. Skandi tölgy — matt",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px]"
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, fields.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 italic"
  }, "Ennek a kateg\xF3ri\xE1nak nincs ", kind === "tech" ? "műszaki" : "stílus", " mez\u0151je. Vedd fel a Kateg\xF3ri\xE1k f\xFCl\xF6n."), fields.map(f => /*#__PURE__*/React.createElement(InstanceField, {
    key: f.key,
    field: f,
    value: values[f.key],
    onChange: v => setVal(f.key, v),
    accent: accent
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium block mb-1"
  }, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("textarea", {
    value: note,
    onChange: e => setNote(e.target.value),
    rows: 2,
    placeholder: "Bels\u0151 jegyzet (opcion\xE1lis)\u2026",
    className: "w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] resize-none"
  }))));
}

// ──────────────────────────────────────────────────────────────────────────
// Instance card
// ──────────────────────────────────────────────────────────────────────────
function InstanceCard({
  kind,
  inst,
  category,
  onEdit
}) {
  const accent = kind === "tech" ? window.SPEC_ACCENT.teal : window.SPEC_ACCENT.violet;
  const tone = window.SPEC_STATUS_TONE[inst.status];
  const fields = kind === "tech" ? category.techFields || [] : category.styleFields || [];
  const pairs = fields.map(f => ({
    label: f.label,
    value: fieldValueLabel(f, inst.values ? inst.values[f.key] : undefined)
  })).filter(p => p.value && p.value !== "—" && p.value !== "Nem");
  return /*#__PURE__*/React.createElement("div", {
    className: `rounded-2xl border bg-white p-4 flex flex-col gap-3 ${inst.status === "archived" ? "border-stone-200 opacity-75" : accent.softBd}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-10 h-10 rounded-xl grid place-items-center shrink-0 ${accent.iconBg} ${accent.iconFg}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: kind === "tech" ? "cpu" : "drop",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: `text-[9.5px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${specAccentOf(category).chipBg} ${specAccentOf(category).chipFg}`
  }, category.name), /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded ${tone.bg} ${tone.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
  }), tone.label)), /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 mt-1 leading-tight truncate"
  }, inst.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 font-mono mt-0.5"
  }, inst.id))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, pairs.length === 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400 italic"
  }, "Nincs kit\xF6lt\xF6tt \xE9rt\xE9k"), pairs.slice(0, 6).map((p, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "inline-flex items-center gap-1 text-[10.5px] bg-stone-50 border border-stone-200 rounded-md px-1.5 py-0.5 text-stone-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, p.label, ":"), /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-800"
  }, p.value))), pairs.length > 6 && /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400 px-1 py-0.5"
  }, "+", pairs.length - 6)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-auto pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onEdit(inst),
    className: `h-8 px-3 rounded-lg text-white text-[11.5px] font-medium inline-flex items-center gap-1.5 ${accent.solid} ${accent.solidHover}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 12
  }), "Szerkeszt\xE9s"), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.duplicateSpecInstance(kind, inst.id),
    title: "Duplik\xE1l\xE1s",
    className: "h-8 w-8 grid place-items-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 13
  })), inst.status === "active" ? /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.setSpecInstanceStatus(kind, inst.id, "archived"),
    title: "Archiv\xE1l\xE1s",
    className: "h-8 w-8 grid place-items-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 ml-auto"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "folder",
    size: 13
  })) : /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.setSpecInstanceStatus(kind, inst.id, "active"),
    className: "h-8 px-3 rounded-lg border border-emerald-200 text-emerald-700 text-[11.5px] font-medium hover:bg-emerald-50 inline-flex items-center gap-1.5 ml-auto"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), "Aktiv\xE1l\xE1s")));
}

// ──────────────────────────────────────────────────────────────────────────
// Category card
// ──────────────────────────────────────────────────────────────────────────
function CategoryCard({
  cat,
  counts,
  onEdit,
  onDelete
}) {
  const accent = specAccentOf(cat);
  return /*#__PURE__*/React.createElement("div", {
    className: `rounded-2xl border bg-white p-4 flex flex-col gap-3 ${accent.softBd}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-11 h-11 rounded-xl grid place-items-center shrink-0 ${accent.iconBg} ${accent.iconFg}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: cat.icon || "box",
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 truncate"
  }, cat.name), cat.builtin && /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-stone-100 text-stone-500"
  }, "be\xE9p\xEDtett")), cat.desc && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 leading-snug mt-0.5"
  }, cat.desc))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] font-medium px-2 py-0.5 rounded bg-violet-50 text-violet-700"
  }, (cat.styleFields || []).length, " st\xEDlus mez\u0151"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] font-medium px-2 py-0.5 rounded bg-teal-50 text-teal-700"
  }, (cat.techFields || []).length, " m\u0171szaki mez\u0151"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-600"
  }, counts.style, " st\xEDlus \xB7 ", counts.tech, " m\u0171szaki")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-auto pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onEdit(cat),
    className: `h-8 px-3 rounded-lg text-white text-[11.5px] font-medium inline-flex items-center gap-1.5 ${accent.solid} ${accent.solidHover}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 12
  }), "S\xE9ma szerkeszt\xE9se"), !cat.builtin && /*#__PURE__*/React.createElement("button", {
    onClick: () => onDelete(cat),
    title: "T\xF6rl\xE9s",
    className: "h-8 w-8 grid place-items-center rounded-lg border border-stone-200 text-stone-400 hover:bg-rose-50 hover:text-rose-500 ml-auto"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))));
}

// ──────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────
function SpecsPage({
  onScreen
}) {
  const s = useSim();
  const cats = s.specCategories || [];
  const styles = s.styles || [];
  const techSpecs = s.techSpecs || [];
  const [tab, setTab] = useStateS("categories"); // categories | styles | tech
  const [catFilter, setCatFilter] = useStateS("all");
  const [showArchived, setShowArchived] = useStateS(false);
  const [catSheet, setCatSheet] = useStateS(null); // { cat } | { isNew:true }
  const [instEditor, setInstEditor] = useStateS(null); // { kind, instance?, category }

  const catById = id => cats.find(c => c.id === id);
  const collection = tab === "tech" ? techSpecs : styles;
  const kind = tab === "tech" ? "tech" : "style";
  const filtered = useMemoS(() => collection.filter(x => {
    if (catFilter !== "all" && x.categoryId !== catFilter) return false;
    if (!showArchived && x.status === "archived") return false;
    return catById(x.categoryId); // skip orphans
  }), [collection, catFilter, showArchived, cats]);
  const tabs = [{
    key: "categories",
    label: "Kategóriák",
    icon: "folder",
    count: cats.length
  }, {
    key: "styles",
    label: "Stílusok",
    icon: "drop",
    count: styles.filter(x => x.status === "active").length
  }, {
    key: "tech",
    label: "Műszaki",
    icon: "cpu",
    count: techSpecs.filter(x => x.status === "active").length
  }];
  const archivedCount = collection.filter(x => x.status === "archived" && (catFilter === "all" || x.categoryId === catFilter)).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 space-y-5"
  }, catSheet && /*#__PURE__*/React.createElement(CategorySheet, {
    category: catSheet.cat,
    onClose: () => setCatSheet(null)
  }), instEditor && /*#__PURE__*/React.createElement(InstanceEditor, {
    kind: instEditor.kind,
    instance: instEditor.instance,
    category: instEditor.category,
    onClose: () => setInstEditor(null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[19px] md:text-[21px] font-semibold text-stone-900"
  }, "Specifik\xE1ci\xF3k"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 max-w-3xl leading-snug"
  }, "Modul\xE1ris, b\u0151v\xEDthet\u0151 rendszer. A ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, "Kateg\xF3ria"), " (pl. Szekr\xE9ny, Ajt\xF3) saj\xE1t mez\u0151s\xE9m\xE1t ad a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-violet-700"
  }, "St\xEDlushoz"), " \xE9s a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-teal-700"
  }, "M\u0171szakihoz"), ", opci\xF3nk\xE9nt \xE1r-szorz\xF3val. Az aj\xE1nlatban ezekb\u0151l + a beh\xFAzott sablonokb\xF3l sz\xE1mol \xE1rat az \xE1rmotor.")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-flex p-0.5 rounded-xl bg-stone-100 gap-0.5"
  }, tabs.map(t => {
    const active = tab === t.key;
    const ac = t.key === "styles" ? window.SPEC_ACCENT.violet : t.key === "tech" ? window.SPEC_ACCENT.teal : null;
    return /*#__PURE__*/React.createElement("button", {
      key: t.key,
      onClick: () => setTab(t.key),
      className: `h-9 px-3.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-1.5 transition ${active ? ac ? ac.tabActive : "bg-stone-800 text-white" : "text-stone-600 hover:text-stone-900"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: t.icon,
      size: 14
    }), t.label, /*#__PURE__*/React.createElement("span", {
      className: `text-[10px] tabular-nums ${active ? "opacity-80" : "text-stone-400"}`
    }, t.count));
  })), tab !== "categories" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("select", {
    value: catFilter,
    onChange: e => setCatFilter(e.target.value),
    className: "h-9 px-3 rounded-lg border border-stone-200 text-[12px] bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Minden kateg\xF3ria"), cats.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name))), /*#__PURE__*/React.createElement("label", {
    className: "inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 cursor-pointer select-none"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowArchived(v => !v),
    className: `w-9 h-5 rounded-full transition relative ${showArchived ? "bg-stone-600" : "bg-stone-300"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${showArchived ? "left-[18px]" : "left-0.5"}`
  })), "Archiv\xE1ltak (", archivedCount, ")")), /*#__PURE__*/React.createElement("div", {
    className: "ml-auto"
  }, tab === "categories" ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setCatSheet({
      cat: null
    }),
    className: "h-9 px-3.5 rounded-lg bg-stone-800 text-white text-[12px] font-medium hover:bg-stone-900 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "\xDAj kateg\xF3ria") : /*#__PURE__*/React.createElement(NewInstanceButton, {
    kind: kind,
    cats: cats,
    catFilter: catFilter,
    onCreate: category => setInstEditor({
      kind,
      category
    })
  }))), tab === "categories" ? /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 xl:grid-cols-3 gap-3"
  }, cats.map(c => /*#__PURE__*/React.createElement(CategoryCard, {
    key: c.id,
    cat: c,
    onEdit: x => setCatSheet({
      cat: x
    }),
    counts: {
      style: styles.filter(x => x.categoryId === c.id).length,
      tech: techSpecs.filter(x => x.categoryId === c.id).length
    },
    onDelete: x => window.sim.removeSpecCategory(x.id)
  }))) : filtered.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-dashed border-stone-300 p-10 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] text-stone-500"
  }, "Nincs megjelen\xEDthet\u0151 elem."), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-400 mt-1"
  }, "Hozz l\xE9tre egyet a jobb fels\u0151 gombbal.")) : /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 xl:grid-cols-3 gap-3"
  }, filtered.map(inst => /*#__PURE__*/React.createElement(InstanceCard, {
    key: inst.id,
    kind: kind,
    inst: inst,
    category: catById(inst.categoryId),
    onEdit: x => setInstEditor({
      kind,
      instance: x,
      category: catById(inst.categoryId)
    })
  }))));
}

// "Új stílus/műszaki" — pick category if needed
function NewInstanceButton({
  kind,
  cats,
  catFilter,
  onCreate
}) {
  const [open, setOpen] = useStateS(false);
  const accent = kind === "tech" ? window.SPEC_ACCENT.teal : window.SPEC_ACCENT.violet;
  const label = kind === "tech" ? "Új műszaki" : "Új stílus";
  const fixed = catFilter !== "all" ? cats.find(c => c.id === catFilter) : null;
  if (cats.length === 0) return /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-400"
  }, "El\u0151bb hozz l\xE9tre kateg\xF3ri\xE1t");
  if (fixed) return /*#__PURE__*/React.createElement("button", {
    onClick: () => onCreate(fixed),
    className: `h-9 px-3.5 rounded-lg text-white text-[12px] font-medium inline-flex items-center gap-1.5 ${accent.solid} ${accent.solidHover}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), label);
  return /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(v => !v),
    className: `h-9 px-3.5 rounded-lg text-white text-[12px] font-medium inline-flex items-center gap-1.5 ${accent.solid} ${accent.solidHover}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), label, /*#__PURE__*/React.createElement(Icon, {
    name: "down",
    size: 12
  })), open && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-40",
    onClick: () => setOpen(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute right-0 mt-1 z-50 w-52 bg-white rounded-xl border border-stone-200 shadow-lg p-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Kateg\xF3ria"), cats.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    onClick: () => {
      setOpen(false);
      onCreate(c);
    },
    className: "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] text-stone-700 hover:bg-stone-50 text-left"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: c.icon || "box",
    size: 14,
    className: "text-stone-400"
  }), c.name)))));
}
window.SpecsPage = SpecsPage;
})();
