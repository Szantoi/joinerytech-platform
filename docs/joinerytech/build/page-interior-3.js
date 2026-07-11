/* AUTO-GENERATED from page-interior-3.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-interior-3.jsx — Belsőépítész INFORMÁCIÓS katalógus (típusok + tételek/
// minták): beszerzési ár, beszerzési forrás, megjegyzés, LÁTHATÓSÁG (megosztás
// a világok / partnerek között). NEM kereskedelmi — nincs eladási ár / árrés /
// partner-kedvezmény. ÚJ koncepció létrehozó űrlap + a koncepción belüli
// TERVEZETT TÉTELEK (terv-lista, ÁR NÉLKÜL — a díj külön számolódik a Díjazás fülön).
//
// Store-akciók (NÉVÜTKÖZÉS-MENTES): addIntType/updateIntType/removeIntType,
// addIntProduct/updateIntProduct/removeIntProduct, addConceptItem/…, createConcept.
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useI3,
  useMemo: useMemoI3
} = React;
const TYPE_ICONS_I3 = ["box", "layers", "drop", "sparkle", "ruler", "briefcase", "cube", "wrench"];
const TYPE_COLORS_I3 = ["#a8703a", "#8a5a2b", "#5b8a72", "#2f7d8c", "#6b7280", "#9a8c5a", "#b4574d", "#7c6aa8"];
const UNITS_I3 = ["db", "fm", "m²", "klt", "óra"];
const VIS_I3 = () => window.INT_VISIBILITY || {};

// Interior katalógus → ItemBuilder-alak (Sales beépítéshez) ─────────────────
// A katalógus információs: a beszerzési ár szolgál önköltség-alapként; eladási
// árat a Sales-felhasználó ad. A privát tételek nem kerülnek át (csak protected/public).
function intCatalogForBuilder() {
  const s = window.sim.getState();
  const typeById = Object.fromEntries((s.intCatTypes || []).map(t => [t.id, t]));
  return (s.intCatProducts || []).filter(p => (p.visibility || "private") !== "private").map(p => ({
    id: p.id,
    code: p.code || p.id,
    name: p.name,
    unit: p.unit || "db",
    price: 0,
    cost: p.purchasePrice != null ? p.purchasePrice : undefined,
    cat: (typeById[p.typeId] || {}).name || "Belsőépítészet",
    supplier: p.source || "Belsőépítész katalógus"
  }));
}

// Láthatóság-pirula (privát / védett / publikus)
function VisPill({
  v,
  size = "sm"
}) {
  const meta = VIS_I3()[v || "private"] || VIS_I3().private || {};
  const pad = size === "xs" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full font-medium ${pad} ${meta.bg} ${meta.fg}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: meta.icon || "lock",
    size: size === "xs" ? 10 : 12
  }), meta.hu);
}

// ════════════════════════════════════════════════════════════════════════════
// BELSŐÉPÍTÉSZ KATALÓGUS — típusok + termékek/minták
// ════════════════════════════════════════════════════════════════════════════
function InteriorCatalog() {
  return /*#__PURE__*/React.createElement(WorldCatalog, {
    worldId: "interior"
  });
}
// ── Típus szerkesztő ───────────────────────────────────────────────────────
// ── InteriorTypesPanel — standalone tab content (exportálva WorldCatalog tabs-hoz)
function InteriorTypesPanel() {
  const sim = useSim();
  const types = sim.intCatTypes || [];
  const products = sim.intCatProducts || [];
  const [editType, setEditType] = useI3(null);
  const countByType = useMemoI3(() => {
    const m = {};
    products.forEach(p => {
      m[p.typeId] = (m[p.typeId] || 0) + 1;
    });
    return m;
  }, [products]);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold tracking-tight text-stone-900"
  }, "Katal\xF3gus-t\xEDpusok"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, "Bels\u0151\xE9p\xEDt\xE9szeti kateg\xF3ri\xE1k (Konyhab\xFAtor, Gardr\xF3b stb.) \u2014 a t\xE9telek ezekbe sorol\xF3dnak.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: () => setEditType({})
  }, "\xDAj t\xEDpus"))), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
  }, types.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => setEditType(t),
    className: "text-left rounded-2xl border border-stone-200 bg-white p-4 hover:border-rose-300 hover:shadow-sm transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-10 h-10 rounded-xl grid place-items-center shrink-0 text-white",
    style: {
      background: t.color
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: t.icon,
    size: 19
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, t.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, "alapegys\xE9g: ", t.unit)), /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 14,
    className: "text-stone-300"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 leading-snug"
  }, t.blurb || "—"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400"
  }, countByType[t.id] || 0, " t\xE9tel"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400"
  }, "egys\xE9g: ", t.unit)))), types.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "col-span-full px-5 py-10 text-center text-[12px] text-stone-400 bg-white rounded-2xl border border-stone-200"
  }, "M\xE9g nincs t\xEDpus. Hozz l\xE9tre egyet az \u201E\xDAj t\xEDpus\" gombbal.")), /*#__PURE__*/React.createElement(SlideOver, {
    open: !!editType,
    onClose: () => setEditType(null),
    title: editType && editType.id ? "Típus szerkesztése" : "Új típus",
    width: 480
  }, editType && /*#__PURE__*/React.createElement(IntTypeEditor, {
    key: editType.id || "new",
    type: editType,
    onSaved: () => setEditType(null),
    onClose: () => setEditType(null)
  })));
}

// ── Típus szerkesztő ───────────────────────────────────────────────────────
function IntTypeEditor({
  type,
  onSaved,
  onClose
}) {
  const isNew = !type.id;
  const [form, setForm] = useI3(() => ({
    name: type.name || "",
    unit: type.unit || "db",
    color: type.color || TYPE_COLORS_I3[0],
    icon: type.icon || "box",
    blurb: type.blurb || ""
  }));
  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const ok = form.name.trim();
  const save = () => {
    if (!ok) return;
    const payload = {
      ...form
    };
    if (isNew) window.sim.addIntType(payload);else window.sim.updateIntType(type.id, payload);
    onSaved();
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "T\xEDpus neve"), /*#__PURE__*/React.createElement(SxInput, {
    value: form.name,
    onChange: v => set("name", v),
    placeholder: "pl. Konyhab\xFAtor"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Alapegys\xE9g"), /*#__PURE__*/React.createElement("select", {
    value: form.unit,
    onChange: e => set("unit", e.target.value),
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-400"
  }, UNITS_I3.map(u => /*#__PURE__*/React.createElement("option", {
    key: u
  }, u)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Sz\xEDn"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, TYPE_COLORS_I3.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => set("color", c),
    className: `w-7 h-7 rounded-lg border-2 transition ${form.color === c ? "border-stone-900 scale-110" : "border-white shadow-sm"}`,
    style: {
      background: c
    }
  }))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Ikon"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, TYPE_ICONS_I3.map(ic => /*#__PURE__*/React.createElement("button", {
    key: ic,
    onClick: () => set("icon", ic),
    className: `w-9 h-9 rounded-lg border grid place-items-center transition ${form.icon === ic ? "border-rose-500 bg-rose-50 text-rose-700" : "border-stone-200 text-stone-500 hover:border-stone-300"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 16
  }))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Le\xEDr\xE1s"), /*#__PURE__*/React.createElement("textarea", {
    value: form.blurb,
    onChange: e => set("blurb", e.target.value),
    rows: 2,
    placeholder: "R\xF6vid le\xEDr\xE1s\u2026",
    className: "w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400 resize-none"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center gap-2",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom),12px)"
    }
  }, !isNew && /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: () => {
      if (confirm("Biztosan törlöd ezt a típust?")) {
        window.sim.removeIntType(type.id);
        onSaved();
      }
    }
  }, "T\xF6rl\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: onClose
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: save,
    disabled: !ok,
    className: "h-9 px-4 rounded-lg text-[12.5px] font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14
  }), isNew ? "Létrehozás" : "Mentés")));
}

// ── Termék / minta szerkesztő ──────────────────────────────────────────────
function IntProductEditor({
  product,
  types,
  onSaved,
  onClose
}) {
  const isNew = !product.id;
  const t0 = types.find(t => t.id === product.typeId) || types[0];
  const [form, setForm] = useI3(() => ({
    typeId: product.typeId || t0 && t0.id || null,
    code: product.code || "",
    name: product.name || "",
    desc: product.desc || "",
    unit: product.unit || t0 && t0.unit || "db",
    purchasePrice: product.purchasePrice != null ? String(product.purchasePrice) : "",
    source: product.source || "",
    notes: product.notes || "",
    visibility: product.visibility || "private",
    color: product.color || "#c9a878",
    tags: [...(product.tags || [])]
  }));
  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const ok = form.name.trim();
  const save = () => {
    if (!ok) return;
    const payload = {
      ...form,
      purchasePrice: Number(form.purchasePrice) || 0
    };
    if (isNew) window.sim.addIntProduct(payload);else window.sim.updateIntProduct(product.id, payload);
    onSaved();
  };
  const [tagDraft, setTagDraft] = useI3("");
  const addTag = () => {
    const t = tagDraft.trim();
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setTagDraft("");
  };
  const sampleId = product.sampleSlot || "ipsmpl-new-" + (product.id || "tmp");
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement(SxLabel, null, "T\xEDpus"), /*#__PURE__*/React.createElement("select", {
    value: form.typeId || "",
    onChange: e => {
      const tid = e.target.value;
      set("typeId", tid);
      const tt = types.find(x => x.id === tid);
      if (tt && !form.unit) set("unit", tt.unit);
    },
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-400"
  }, types.map(t => /*#__PURE__*/React.createElement("option", {
    key: t.id,
    value: t.id
  }, t.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "K\xF3d"), /*#__PURE__*/React.createElement(SxInput, {
    value: form.code,
    onChange: v => set("code", v),
    placeholder: "pl. KO-AL-T60",
    mono: true
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Egys\xE9g"), /*#__PURE__*/React.createElement("select", {
    value: form.unit,
    onChange: e => set("unit", e.target.value),
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-400"
  }, UNITS_I3.map(u => /*#__PURE__*/React.createElement("option", {
    key: u
  }, u)))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement(SxLabel, null, "N\xE9v"), /*#__PURE__*/React.createElement(SxInput, {
    value: form.name,
    onChange: v => set("name", v),
    placeholder: "pl. Als\xF3szekr\xE9ny t\xF6lgy front 60"
  })), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement(SxLabel, null, "Le\xEDr\xE1s"), /*#__PURE__*/React.createElement("textarea", {
    value: form.desc,
    onChange: e => set("desc", e.target.value),
    rows: 2,
    placeholder: "Anyag, fel\xFClet, vasalat\u2026",
    className: "w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400 resize-none"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Beszerz\xE9si \xE1r (Ft / ", form.unit, ")"), /*#__PURE__*/React.createElement(SxInput, {
    value: form.purchasePrice,
    onChange: v => set("purchasePrice", v.replace(/[^0-9]/g, "")),
    placeholder: "pl. 9800",
    mono: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "col-span-1"
  }, /*#__PURE__*/React.createElement(SxLabel, null, "Beszerz\xE9si forr\xE1s"), /*#__PURE__*/React.createElement(SxInput, {
    value: form.source,
    onChange: v => set("source", v),
    placeholder: "pl. Egger / Forest"
  })), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement(SxLabel, null, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("textarea", {
    value: form.notes,
    onChange: e => set("notes", e.target.value),
    rows: 2,
    placeholder: "Beszerz\xE9si megjegyz\xE9s, rakt., min\u0151s\xE9g, alternat\xEDva\u2026",
    className: "w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400 resize-none"
  })), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement(SxLabel, null, "L\xE1that\xF3s\xE1g \u2014 megoszt\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-1.5"
  }, (window.INT_VIS_ORDER || []).map(vk => {
    const m = (window.INT_VISIBILITY || {})[vk] || {};
    const on = form.visibility === vk;
    return /*#__PURE__*/React.createElement("button", {
      key: vk,
      type: "button",
      onClick: () => set("visibility", vk),
      className: `rounded-xl border p-2.5 text-left transition ${on ? "border-rose-400 bg-rose-50/60" : "border-stone-200 hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon || "lock",
      size: 13,
      className: on ? "text-rose-600" : "text-stone-500"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] font-semibold text-stone-900"
    }, m.hu)), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-500 leading-snug mt-1"
    }, m.blurb));
  })), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-[10.5px] text-stone-500 mt-2"
  }, "A ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, "publikus"), " t\xE9tel k\xF6z\xF6s t\xF6rzsadat \u2014 minden vil\xE1g l\xE1tja (pl. Egger Halifax t\xF6lgy). A ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, "v\xE9dett"), " t\xE9telt a partnerek is l\xE1tj\xE1k, de a beszerz\xE9si \xE1r n\xE9lk\xFCl. A ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, "priv\xE1t"), " csak a saj\xE1t c\xE9g\xE9.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Minta sz\xEDne"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, (window.MATERIAL_SWATCHES || []).slice(0, 6).map(m => /*#__PURE__*/React.createElement("button", {
    key: m.code,
    onClick: () => set("color", m.color),
    title: m.name,
    className: `w-7 h-7 rounded-lg border-2 ${form.color === m.color ? "border-stone-900 scale-110" : "border-white shadow-sm"}`,
    style: {
      background: m.color
    }
  })), /*#__PURE__*/React.createElement("label", {
    className: "w-7 h-7 rounded-lg border border-dashed border-stone-300 grid place-items-center cursor-pointer text-stone-400 relative overflow-hidden"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), /*#__PURE__*/React.createElement("input", {
    type: "color",
    value: form.color,
    onChange: e => set("color", e.target.value),
    className: "absolute inset-0 opacity-0 cursor-pointer"
  }))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Minta / referenciak\xE9p"), /*#__PURE__*/React.createElement("image-slot", {
    id: sampleId,
    placeholder: "H\xFAzd be a minta k\xE9p\xE9t",
    shape: "rounded",
    radius: "12",
    class: "block w-full",
    style: {
      aspectRatio: "16 / 9"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "C\xEDmk\xE9k"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap mb-2"
  }, form.tags.map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    className: "inline-flex items-center gap-1 px-2 h-7 rounded-full text-[11.5px] font-medium bg-rose-50 text-rose-700"
  }, t, /*#__PURE__*/React.createElement("button", {
    onClick: () => set("tags", form.tags.filter(x => x !== t)),
    className: "text-rose-400 hover:text-rose-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 11
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: tagDraft,
    onChange: e => setTagDraft(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag();
      }
    },
    placeholder: "\xDAj c\xEDmke\u2026",
    className: "flex-1 h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addTag,
    disabled: !tagDraft.trim(),
    className: "h-9 px-3 rounded-lg border border-stone-300 text-stone-700 text-[12px] font-medium hover:bg-stone-50 disabled:opacity-40 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "Hozz\xE1ad")))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center gap-2",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom),12px)"
    }
  }, !isNew && /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: () => {
      if (confirm("Biztosan törlöd ezt a terméket?")) {
        window.sim.removeIntProduct(product.id);
        onSaved();
      }
    }
  }, "T\xF6rl\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: onClose
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: save,
    disabled: !ok,
    className: "h-9 px-4 rounded-lg text-[12.5px] font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14
  }), isNew ? "Hozzáadás" : "Mentés")));
}

// ════════════════════════════════════════════════════════════════════════════
// ÚJ KONCEPCIÓ — létrehozó űrlap (SlideOver body)
// ════════════════════════════════════════════════════════════════════════════
function ConceptCreateForm({
  onCreated,
  onClose
}) {
  const sim = useSim();
  const projects = sim.projects || [];
  const [form, setForm] = useI3({
    name: "",
    customer: "",
    area: "",
    projectRef: "",
    brief: ""
  });
  const [rooms, setRooms] = useI3([{
    name: "",
    area: ""
  }]);
  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const setRoom = (i, k, v) => setRooms(rs => rs.map((r, idx) => idx === i ? {
    ...r,
    [k]: v
  } : r));
  const addRoom = () => setRooms(rs => [...rs, {
    name: "",
    area: ""
  }]);
  const delRoom = i => setRooms(rs => rs.filter((_, idx) => idx !== i));
  const ok = form.name.trim() && form.customer.trim();
  const save = () => {
    if (!ok) return;
    const cleanRooms = rooms.filter(r => r.name.trim()).map(r => ({
      name: r.name.trim(),
      area: Number(r.area) || 0,
      note: ""
    }));
    const id = window.sim.createConcept({
      ...form,
      projectRef: form.projectRef || null,
      rooms: cleanRooms
    });
    onCreated && onCreated(id);
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement(SxLabel, null, "Koncepci\xF3 neve"), /*#__PURE__*/React.createElement(SxInput, {
    value: form.name,
    onChange: v => set("name", v),
    placeholder: "pl. Pet\u0151fi u. 12. \u2014 Skandin\xE1v otthon"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "\xDCgyf\xE9l"), /*#__PURE__*/React.createElement(SxInput, {
    value: form.customer,
    onChange: v => set("customer", v),
    placeholder: "Megrendel\u0151 neve"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Alapter\xFClet (m\xB2)"), /*#__PURE__*/React.createElement(SxInput, {
    value: form.area,
    onChange: v => set("area", v.replace(/[^0-9]/g, "")),
    placeholder: "auto a helyis\xE9gekb\u0151l",
    mono: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement(SxLabel, null, "Kapcsol\xF3d\xF3 projekt (opcion\xE1lis)"), /*#__PURE__*/React.createElement("select", {
    value: form.projectRef,
    onChange: e => set("projectRef", e.target.value),
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-400"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 nincs \u2014"), projects.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.id, " \xB7 ", p.name)))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement(SxLabel, null, "Brief \u2014 ig\xE9nyfelm\xE9r\xE9s"), /*#__PURE__*/React.createElement("textarea", {
    value: form.brief,
    onChange: e => set("brief", e.target.value),
    rows: 3,
    placeholder: "St\xEDlus, hangulat, ig\xE9nyek, korl\xE1tok\u2026",
    className: "w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400 resize-none"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement(SxLabel, null, "Helyis\xE9gek"), /*#__PURE__*/React.createElement("button", {
    onClick: addRoom,
    className: "text-[11.5px] text-rose-700 font-medium inline-flex items-center gap-1 hover:underline"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), "Helyis\xE9g")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, rooms.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: r.name,
    onChange: e => setRoom(i, "name", e.target.value),
    placeholder: "pl. Konyha",
    className: "flex-1 h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 w-24 shrink-0"
  }, /*#__PURE__*/React.createElement("input", {
    value: r.area,
    onChange: e => setRoom(i, "area", e.target.value.replace(/[^0-9.]/g, "")),
    placeholder: "m\xB2",
    inputMode: "decimal",
    className: "w-full h-9 px-2 rounded-lg border border-stone-200 text-[12.5px] tabular-nums text-right outline-none focus:border-rose-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, "m\xB2")), /*#__PURE__*/React.createElement("button", {
    onClick: () => delRoom(i),
    className: "w-9 h-9 grid place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 15
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-rose-50/60 border border-rose-100 px-3 py-2.5 text-[11.5px] text-stone-600"
  }, "A koncepci\xF3 ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "brief"), " \xE1llapotban j\xF6n l\xE9tre, egy \u201EA \u2014 Alap ir\xE1ny\" v\xE1ltozattal. A v\xE1ltozatokat, moodboardot \xE9s a t\xE9teles aj\xE1nlatot a r\xE9szletekn\xE9l dolgozhatod ki.")), /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center gap-2",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom),12px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: onClose
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: save,
    disabled: !ok,
    className: "h-9 px-4 rounded-lg text-[12.5px] font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14
  }), "Koncepci\xF3 l\xE9trehoz\xE1sa")));
}

// ════════════════════════════════════════════════════════════════════════════
// TERVEZETT TÉTELEK — a belsőépítész helyiségenként tervezi a tételeket a
// katalógusból. TERV-LISTA, ÁR NÉLKÜL — a tervezési díj külön, a „Díjazás" fülön
// számolódik (m² / óradíj / érték-% / fix). A díj-ajánlat onnan indul.
// ════════════════════════════════════════════════════════════════════════════
function ConceptQuoteTab({
  concept
}) {
  const sim = useSim();
  const live = (sim.concepts || []).find(c => c.id === concept.id) || concept;
  const items = live.items || [];
  const [picker, setPicker] = useI3(false);
  const rooms = (live.rooms || []).map(r => r.name);
  const grouped = useMemoI3(() => {
    const map = {};
    items.forEach(it => {
      const k = it.room || "— besorolás nélkül —";
      (map[k] = map[k] || []).push(it);
    });
    return map;
  }, [items]);
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 max-w-3xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-stone-50 border border-stone-200 px-3.5 py-2.5 text-[11.5px] text-stone-600 flex items-start gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "box",
    size: 14,
    className: "text-rose-600 mt-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, "A bels\u0151\xE9p\xEDt\xE9sz itt ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-800"
  }, "tervezi meg a b\xFAtorokat / t\xE9teleket"), " helyis\xE9genk\xE9nt, a katal\xF3gusb\xF3l. Ez ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-800"
  }, "terv-lista, \xE1r n\xE9lk\xFCl"), " \u2014 a tervez\xE9si d\xEDjat a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-800"
  }, "D\xEDjaz\xE1s"), " f\xFCl\xF6n hat\xE1rozod meg.")), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900"
  }, "Tervezett t\xE9telek ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-normal"
  }, "\xB7 ", items.length, " db")), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: () => setPicker(true)
  }, "T\xE9tel hozz\xE1ad\xE1sa")), Object.keys(grouped).map(room => /*#__PURE__*/React.createElement("div", {
    key: room
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-1.5 bg-stone-50/70 border-b border-stone-100 text-[10px] uppercase tracking-wide text-stone-500 font-medium flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ruler",
    size: 11
  }), room, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300"
  }, "\xB7 ", grouped[room].length)), grouped[room].map(it => /*#__PURE__*/React.createElement(QuoteLineRow, {
    key: it.id,
    conceptId: live.id,
    item: it,
    rooms: rooms
  })))), items.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-10 text-center text-[12px] text-stone-400"
  }, "M\xE9g nincs t\xE9tel. A \u201ET\xE9tel hozz\xE1ad\xE1sa\" gombbal v\xE1lassz a katal\xF3gusb\xF3l, vagy adj egyedi sort.")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 px-1"
  }, "A terv-lista a kivitelez\xE9s tartalm\xE1t r\xF6gz\xEDti. A d\xEDjaz\xE1s \xE9s a d\xEDj-aj\xE1nlat a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-600"
  }, "D\xEDjaz\xE1s"), " f\xFCl\xF6n k\xE9sz\xFCl."), /*#__PURE__*/React.createElement(ProductPickerSheet, {
    open: picker,
    onClose: () => setPicker(false),
    concept: live,
    rooms: rooms
  }));
}

// ── Egy terv-sor (szerkeszthető: helyiség, mennyiség, törlés — ÁR NÉLKÜL) ───
function QuoteLineRow({
  conceptId,
  item,
  rooms
}) {
  const it = item;
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-50 last:border-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_120px_44px] gap-3 items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 truncate"
  }, it.name), it.note && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 truncate"
  }, it.note)), /*#__PURE__*/React.createElement("select", {
    value: it.room || "",
    onChange: e => window.sim.updateConceptItem(conceptId, it.id, {
      room: e.target.value
    }),
    className: "h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-rose-400"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 helyis\xE9g \u2014"), rooms.map(r => /*#__PURE__*/React.createElement("option", {
    key: r,
    value: r
  }, r))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 justify-end"
  }, /*#__PURE__*/React.createElement("input", {
    value: it.qty,
    onChange: e => window.sim.updateConceptItem(conceptId, it.id, {
      qty: e.target.value.replace(/[^0-9.]/g, "")
    }),
    inputMode: "decimal",
    className: "w-16 h-8 px-1.5 rounded-lg border border-stone-200 text-[11.5px] tabular-nums text-right outline-none focus:border-rose-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400 w-7"
  }, it.unit)), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.removeConceptItem(conceptId, it.id),
    className: "w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })))), /*#__PURE__*/React.createElement("div", {
    className: "md:hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-medium text-stone-900"
  }, it.name), it.note && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, it.note)), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.removeConceptItem(conceptId, it.id),
    className: "w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-2"
  }, /*#__PURE__*/React.createElement("select", {
    value: it.room || "",
    onChange: e => window.sim.updateConceptItem(conceptId, it.id, {
      room: e.target.value
    }),
    className: "flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-rose-400"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 helyis\xE9g \u2014"), rooms.map(r => /*#__PURE__*/React.createElement("option", {
    key: r,
    value: r
  }, r))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("input", {
    value: it.qty,
    onChange: e => window.sim.updateConceptItem(conceptId, it.id, {
      qty: e.target.value.replace(/[^0-9.]/g, "")
    }),
    inputMode: "decimal",
    className: "w-16 h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] tabular-nums text-right outline-none focus:border-rose-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400"
  }, it.unit)))));
}

// ── Termékválasztó (katalógusból) + egyedi sor ─────────────────────────────
function ProductPickerSheet({
  open,
  onClose,
  concept,
  rooms
}) {
  const sim = useSim();
  const types = sim.intCatTypes || [];
  const products = sim.intCatProducts || [];
  const [q, setQ] = useI3("");
  const [custom, setCustom] = useI3(null); // null | {name,unit,price}
  const typeById = Object.fromEntries(types.map(t => [t.id, t]));
  const defRoom = rooms[0] || "";
  const add = p => {
    window.sim.addConceptItem(concept.id, {
      productId: p.id,
      name: p.name,
      room: defRoom,
      unit: p.unit,
      qty: 1,
      note: ""
    });
  };
  const filtered = products.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.code || "").toLowerCase().includes(q.toLowerCase()));
  const byType = types.map(t => ({
    t,
    list: filtered.filter(p => p.typeId === t.id)
  })).filter(g => g.list.length);
  const saveCustom = () => {
    if (!custom.name.trim()) return;
    window.sim.addConceptItem(concept.id, {
      productId: null,
      name: custom.name.trim(),
      room: defRoom,
      unit: custom.unit || "db",
      qty: Number(custom.qty) || 1,
      note: "egyedi"
    });
    setCustom(null);
  };
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: open,
    onClose: onClose,
    title: "T\xE9tel hozz\xE1ad\xE1sa",
    subtitle: "Katal\xF3gusb\xF3l vagy egyedi terv-sor",
    width: 520
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-3 h-9 rounded-lg bg-stone-50 border border-stone-200 text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "T\xE9tel keres\xE9se\u2026",
    className: "bg-transparent outline-none text-[12.5px] flex-1 min-w-0"
  })), custom === null ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setCustom({
      name: "",
      unit: "db",
      qty: "1"
    }),
    className: "w-full flex items-center gap-3 px-3 h-11 rounded-xl border border-dashed border-stone-300 text-stone-600 hover:border-rose-300 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-lg bg-stone-100 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-medium"
  }, "Egyedi t\xE9tel (nem katal\xF3gusb\xF3l)")) : /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-2.5"
  }, /*#__PURE__*/React.createElement("input", {
    value: custom.name,
    onChange: e => setCustom({
      ...custom,
      name: e.target.value
    }),
    placeholder: "T\xE9tel megnevez\xE9se",
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400"
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: custom.qty,
    onChange: e => setCustom({
      ...custom,
      qty: e.target.value.replace(/[^0-9.]/g, "")
    }),
    placeholder: "menny.",
    inputMode: "decimal",
    className: "h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] tabular-nums outline-none focus:border-rose-400"
  }), /*#__PURE__*/React.createElement("select", {
    value: custom.unit,
    onChange: e => setCustom({
      ...custom,
      unit: e.target.value
    }),
    className: "h-9 px-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-400"
  }, UNITS_I3.map(u => /*#__PURE__*/React.createElement("option", {
    key: u
  }, u)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 justify-end"
  }, /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: () => setCustom(null)
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: saveCustom,
    disabled: !custom.name.trim(),
    className: "h-9 px-3.5 rounded-lg text-[12px] font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "Hozz\xE1ad"))), byType.map(({
    t,
    list
  }) => /*#__PURE__*/React.createElement("div", {
    key: t.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full",
    style: {
      background: t.color
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, t.name)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, list.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => add(p),
    className: "w-full flex items-center gap-3 px-2.5 py-2 rounded-xl border border-stone-200 hover:border-rose-300 hover:bg-rose-50/40 text-left transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-9 h-9 rounded-lg border border-stone-200 shrink-0",
    style: {
      background: p.color
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 truncate"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 truncate"
  }, p.code, " \xB7 ", p.desc)), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 shrink-0"
  }, "/ ", p.unit), /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg bg-rose-600 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }))))))), byType.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-8 text-center text-[12px] text-stone-400"
  }, "Nincs tal\xE1lat a katal\xF3gusban.")));
}

// ── Díjazás összegző (a koncepció-fejléchez) ───────────────────────────────
function conceptFeeLine(concept) {
  const amt = window.conceptFeeAmount ? window.conceptFeeAmount(concept) : 0;
  const label = window.feeMethodLabel ? window.feeMethodLabel((concept.fee || {}).method) : "—";
  return {
    amt,
    label
  };
}
Object.assign(window, {
  InteriorCatalog,
  InteriorTypesPanel,
  ConceptCreateForm,
  ConceptQuoteTab,
  ProductPickerSheet,
  intCatalogForBuilder,
  VisPill,
  conceptFeeLine
});
})();
