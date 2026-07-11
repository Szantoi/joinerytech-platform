/* AUTO-GENERATED from catalog-world-view.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ══════════════════════════════════════════════════════════════════════════════
// catalog-world-view.jsx — Egységes katalógusnézet minden világhoz
//
// Használat:
//   <WorldCatalog worldId="design" />
//   <WorldCatalog worldId="interior" />
//
// Minden világ a WORLD_CATALOG_CONFIG-ban definiált pinned-szűrőkkel indul,
// de az alapvezérlők (kategória, keresés, láthatóság) mindenhol egységesek.
// ══════════════════════════════════════════════════════════════════════════════
const {
  useState: useWC,
  useMemo: useMemoWC
} = React;

// ── Világ-specifikus konfiguráció ─────────────────────────────────────────
const WORLD_CATALOG_CONFIG = {
  design: {
    title: "Anyagkatalógus",
    subtitle: "Lapanyagok, vasalatok és tervezési anyagok",
    accent: "amber",
    pinnedFilters: [{
      key: "lapanyag",
      label: "Lapanyag",
      filter: it => it.props && it.props.t != null
    }, {
      key: "vasalat",
      label: "Vasalat",
      filter: it => it.props && it.props.hardwareId
    }, {
      key: "softclose",
      label: "Soft-close",
      filter: it => it.props && it.props.softclose === true
    }]
  },
  interior: {
    title: "Anyag- és tételkatalógus",
    subtitle: "Információs törzsadat — beszerzési ár, forrás, megosztás",
    accent: "rose",
    tabs: [{
      key: "catalog",
      label: "Tételek"
    }, {
      key: "types",
      label: "Típusok",
      render: () => window.InteriorTypesPanel ? React.createElement(window.InteriorTypesPanel) : null
    }],
    pinnedFilters: [{
      key: "anyag",
      label: "Anyag / minta",
      filter: it => (it.worldExt?.interior?.typeId || "") === "it-anyag"
    }, {
      key: "konyha",
      label: "Konyhabútor",
      filter: it => (it.worldExt?.interior?.typeId || "") === "it-konyha"
    }, {
      key: "gardrob",
      label: "Gardrób",
      filter: it => (it.worldExt?.interior?.typeId || "") === "it-gardrob"
    }, {
      key: "burkolat",
      label: "Burkolat",
      filter: it => (it.worldExt?.interior?.typeId || "") === "it-burkolat"
    }, {
      key: "public",
      label: "Nyilvános",
      filter: it => it.visibility === "public"
    }]
  },
  procurement: {
    title: "Katalógus — Beszerzés",
    subtitle: "Szállítói tételek, anyagok és vasalatok",
    accent: "teal",
    pinnedFilters: [{
      key: "lapanyag",
      label: "Lapanyag",
      filter: it => it.props && it.props.t != null
    }, {
      key: "vasalat",
      label: "Vasalat",
      filter: it => it.props && it.props.hardwareId
    }, {
      key: "hasSuppliers",
      label: "Van szállító",
      filter: it => it.suppliers && it.suppliers.length > 0
    }]
  },
  production: {
    title: "Anyagkatalógus — Gyártás",
    subtitle: "Gyártáshoz szükséges lapanyagok és vasalatok",
    accent: "violet",
    pinnedFilters: [{
      key: "lapanyag",
      label: "Lapanyag",
      filter: it => it.props && it.props.t != null
    }, {
      key: "vasalat",
      label: "Vasalat",
      filter: it => it.props && it.props.hardwareId
    }]
  },
  trade: {
    title: "Termékkatalógus — Kereskedelem",
    subtitle: "Bolt-képes és értékesíthető tételek",
    accent: "orange",
    pinnedFilters: [{
      key: "shopEnabled",
      label: "Bolt-képes",
      filter: it => it.shop && it.shop.enabled
    }, {
      key: "public",
      label: "Nyilvános",
      filter: it => it.visibility === "public"
    }]
  },
  warehouse: {
    title: "Katalógus — Raktár",
    subtitle: "Katalógus-alapú készletkezelés és raktáradatok",
    accent: "teal",
    tabs: [{
      key: "catalog",
      label: "Tételek"
    }, {
      key: "stock",
      label: "Készletkezelés",
      render: () => window.WarehouseStockTab ? React.createElement(window.WarehouseStockTab) : null
    }],
    pinnedFilters: [{
      key: "hasStock",
      label: "Raktáron nyilvántartott",
      filter: it => !!it.worldExt?.warehouse
    }, {
      key: "lowStock",
      label: "Alacsony készlet",
      filter: it => it.worldExt?.warehouse?.trend === "low"
    }, {
      key: "critical",
      label: "Kritikus",
      filter: it => it.worldExt?.warehouse?.trend === "critical"
    }]
  },
  sales: {
    title: "Katalógus — Értékesítés",
    subtitle: "Ajánlatba kerülő tételek",
    accent: "sky",
    pinnedFilters: [{
      key: "public",
      label: "Nyilvános",
      filter: it => it.visibility === "public"
    }, {
      key: "protected",
      label: "Védett",
      filter: it => it.visibility === "protected"
    }]
  }
};

// ── Pin típusok definíciói ────────────────────────────────────────────────
const WC_FILTER_TYPES = [{
  key: "tag",
  label: "Címke",
  placeholder: "pl. tölgy"
}, {
  key: "category",
  label: "Kategória neve",
  placeholder: "pl. Lapanyag (Tervezés)"
}, {
  key: "visibility",
  label: "Láthatóság",
  placeholder: ""
}, {
  key: "fieldValue",
  label: "Tulajdonság érték",
  placeholder: "pl. props.softclose=true"
}];
const WC_VIS_OPTIONS = ["public", "protected", "private", "world-only"];

// Egyedi pin szűrőfüggvény generátor
function makeCustomPinFilter(filterType, filterValue) {
  if (filterType === "tag") return it => (it.tags || []).includes(filterValue);
  if (filterType === "category") return (it, cats) => {
    const c = (cats || []).find(cc => cc.id === it.categoryId);
    return c && c.name === filterValue;
  };
  if (filterType === "visibility") return it => (it.visibility || "private") === filterValue;
  if (filterType === "fieldValue") {
    // format: "key=value" or just "key" (boolean check)
    const [k, v] = filterValue.split("=");
    if (v !== undefined) return it => it.props && String(it.props[k]) === v;
    return it => it.props && !!it.props[k];
  }
  return () => true;
}

// ── Custom pin hozzáadó popover ───────────────────────────────────────────
function WCAddPinPopover({
  worldId,
  catCategories,
  allTags,
  onClose
}) {
  const [label, setLabel] = useWC("");
  const [fType, setFType] = useWC("tag");
  const [fValue, setFValue] = useWC("");
  const [error, setError] = useWC("");
  const save = () => {
    if (!label.trim()) {
      setError("Adj meg egy nevet!");
      return;
    }
    if (!fValue.trim() && fType !== "visibility") {
      setError("Add meg a szűrő értékét!");
      return;
    }
    window.sim.addWorldPin(worldId, {
      label: label.trim(),
      filterType: fType,
      filterValue: fValue
    });
    onClose();
  };
  const visOptions = WC_VIS_OPTIONS.map(v => ({
    key: v,
    label: (WC_VIS[v] || {}).label || v
  }));
  const catOptions = (catCategories || []).map(c => c.name);
  const tagOptions = [...new Set(allTags || [])].filter(Boolean);
  return /*#__PURE__*/React.createElement("div", {
    className: "absolute right-0 top-9 z-30 w-72 bg-white rounded-2xl border border-stone-200 shadow-xl p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "Egyedi pin hozz\xE1ad\xE1sa"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mb-1"
  }, "Felirat"), /*#__PURE__*/React.createElement("input", {
    value: label,
    onChange: e => setLabel(e.target.value),
    placeholder: "pl. T\xF6lgy anyagok",
    className: "w-full h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-teal-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mb-1"
  }, "Sz\u0171r\u0151 t\xEDpusa"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1"
  }, WC_FILTER_TYPES.map(ft => /*#__PURE__*/React.createElement("button", {
    key: ft.key,
    onClick: () => {
      setFType(ft.key);
      setFValue("");
    },
    className: `h-7 px-2 rounded-lg text-[11px] font-medium border transition text-left ${fType === ft.key ? "bg-teal-600 border-teal-600 text-white" : "border-stone-200 text-stone-600 hover:border-stone-300"}`
  }, ft.label)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mb-1"
  }, "\xC9rt\xE9k"), fType === "visibility" ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, visOptions.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.key,
    onClick: () => setFValue(o.key),
    className: `h-7 px-2 rounded-full text-[11px] font-medium border transition ${fValue === o.key ? "bg-teal-600 border-teal-600 text-white" : "border-stone-200 text-stone-600 hover:border-stone-300"}`
  }, o.label))) : fType === "tag" ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("input", {
    value: fValue,
    onChange: e => setFValue(e.target.value),
    placeholder: "\xCDrd be vagy v\xE1lassz...",
    className: "w-full h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-teal-500 mb-1"
  }), tagOptions.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1 max-h-20 overflow-y-auto"
  }, tagOptions.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => setFValue(t),
    className: `h-6 px-2 rounded-full text-[10.5px] border transition ${fValue === t ? "bg-teal-600 border-teal-600 text-white" : "border-stone-200 text-stone-500 hover:border-stone-300"}`
  }, t)))) : fType === "category" ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("input", {
    value: fValue,
    onChange: e => setFValue(e.target.value),
    placeholder: "Kateg\xF3ria neve...",
    className: "w-full h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-teal-500 mb-1"
  }), catOptions.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1 max-h-20 overflow-y-auto"
  }, catOptions.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => setFValue(c),
    className: `h-6 px-2 rounded-full text-[10.5px] border transition ${fValue === c ? "bg-teal-600 border-teal-600 text-white" : "border-stone-200 text-stone-500 hover:border-stone-300"}`
  }, c)))) : /*#__PURE__*/React.createElement("input", {
    value: fValue,
    onChange: e => setFValue(e.target.value),
    placeholder: "pl. softclose=true",
    className: "w-full h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] font-mono outline-none focus:border-teal-500"
  })), error && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-rose-600"
  }, error), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: save,
    className: "flex-1 h-8 rounded-lg bg-teal-600 text-white text-[12px] font-medium hover:bg-teal-700 transition"
  }, "Hozz\xE1ad\xE1s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600 hover:bg-stone-50"
  }, "M\xE9gse")));
}

// ── Accent szín osztályok ─────────────────────────────────────────────────
const ACCENT_CLASSES = {
  amber: {
    btn: "bg-amber-600 text-white",
    link: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
  },
  rose: {
    btn: "bg-rose-600 text-white",
    link: "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
  },
  teal: {
    btn: "bg-teal-600 text-white",
    link: "border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100"
  },
  violet: {
    btn: "bg-violet-600 text-white",
    link: "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100"
  },
  orange: {
    btn: "bg-orange-600 text-white",
    link: "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"
  },
  sky: {
    btn: "bg-sky-600 text-white",
    link: "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"
  }
};

// ── Láthatóság badge ──────────────────────────────────────────────────────
const WC_VIS = {
  public: {
    label: "Nyilvános",
    dot: "bg-emerald-500",
    fg: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200"
  },
  protected: {
    label: "Védett",
    dot: "bg-amber-500",
    fg: "text-amber-700",
    bg: "bg-amber-50 border-amber-200"
  },
  private: {
    label: "Privát",
    dot: "bg-stone-400",
    fg: "text-stone-600",
    bg: "bg-stone-100 border-stone-200"
  },
  "world-only": {
    label: "Világ-korl.",
    dot: "bg-sky-500",
    fg: "text-sky-700",
    bg: "bg-sky-50 border-sky-200"
  }
};
function WCVisBadge({
  v
}) {
  const c = WC_VIS[v] || WC_VIS.private;
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded-full border font-medium ${c.bg} ${c.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${c.dot}`
  }), c.label);
}

// ── Egységes katalógus-kártya ─────────────────────────────────────────────
function WCItemCard({
  item,
  worldId,
  onItemClick
}) {
  const isLap = item.props && item.props.t != null;
  const isHw = item.props && item.props.hardwareId;
  const color = item.props?.lookupColor || item.worldExt?.interior?.color || "#cbb88e";
  const brands = item.worldExt?.design?.brands;
  const intExt = item.worldExt?.interior;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onItemClick ? () => onItemClick(item) : undefined,
    className: `bg-white rounded-2xl border border-stone-200 p-3 flex flex-col gap-2 ${onItemClick ? "cursor-pointer hover:border-stone-300 hover:shadow-sm transition" : ""}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "aspect-[4/3] rounded-xl border border-stone-100 flex items-center justify-center overflow-hidden",
    style: {
      background: color
    }
  }, isHw && /*#__PURE__*/React.createElement(Icon, {
    name: "wrench",
    size: 24,
    className: "text-white/70 drop-shadow"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 leading-tight truncate",
    title: item.name
  }, item.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-mono text-stone-400 mt-0.5 truncate"
  }, item.code)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between pt-1.5 border-t border-stone-100 mt-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 min-w-0"
  }, isLap && /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-stone-500 uppercase tracking-wide truncate"
  }, item.props.kind || "lap"), isHw && /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-stone-500 uppercase tracking-wide"
  }, "vasalat"), intExt && /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-stone-500 truncate"
  }, intExt.source || "—"), !isLap && !isHw && !intExt && /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-stone-400"
  }, "\u2014")), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 ml-1"
  }, isLap && /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-semibold text-stone-800 font-mono"
  }, item.props.t, "mm"), !isLap && item.price != null && /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] font-semibold text-stone-700 tabular-nums"
  }, item.price.toLocaleString("hu-HU"), " Ft"))), /*#__PURE__*/React.createElement(WCVisBadge, {
    v: item.visibility || "private"
  }), intExt?.desc && /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 leading-tight truncate",
    title: intExt.desc
  }, intExt.desc), brands && /*#__PURE__*/React.createElement("div", {
    className: "pt-1.5 border-t border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[9px] text-stone-400 mb-1 uppercase tracking-wide"
  }, "M\xE1rka\xE1rak"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, Object.entries(brands).map(([b, p]) => /*#__PURE__*/React.createElement("span", {
    key: b,
    className: "text-[9px] px-1 py-0.5 rounded bg-stone-100 text-stone-600 font-mono"
  }, b, " ", p.toLocaleString())))));
}

// ══════════════════════════════════════════════════════════════════════════════
// WorldCatalog — a megosztott katalógusnézet
// ══════════════════════════════════════════════════════════════════════════════
function WorldCatalog({
  worldId,
  onItemClick,
  extraHeader
}) {
  const sim = window.useSim();
  const cfg = WORLD_CATALOG_CONFIG[worldId] || WORLD_CATALOG_CONFIG.design;
  const accent = ACCENT_CLASSES[cfg.accent] || ACCENT_CLASSES.teal;

  // Tab kezelés
  const hasTabs = cfg.tabs && cfg.tabs.length > 0;
  const [activeTab, setActiveTab] = useWC("catalog");
  const isCustomTab = hasTabs && activeTab !== "catalog";

  // ── Minden hook itt — korai return ELŐTT ─────────────────────────────────
  const allItems = useMemoWC(() => {
    if (window.sim && window.sim.catalogForWorldFields) {
      return window.sim.catalogForWorldFields(worldId);
    }
    return (sim.catalog || []).filter(it => it.active !== false);
  }, [sim.catalog, worldId]);
  const catCategories = sim.catCategories || [];
  const [q, setQ] = useWC("");
  const [filterCat, setFilterCat] = useWC("all");
  const [activePinned, setActivePinned] = useWC(null);
  const [viewMode, setViewMode] = useWC("grid");
  const [showAddPin, setShowAddPin] = useWC(false);
  const cats = useMemoWC(() => {
    const seen = new Set();
    allItems.forEach(it => {
      const cat = catCategories.find(c => c.id === it.categoryId);
      if (cat) seen.add(cat.name);
    });
    return [...seen];
  }, [allItems, catCategories]);
  const customPins = useMemoWC(() => {
    return (sim.worldCatalogPins || {})[worldId] || [];
  }, [sim.worldCatalogPins, worldId]);
  const allTags = useMemoWC(() => {
    const s = new Set();
    allItems.forEach(it => (it.tags || []).forEach(t => s.add(t)));
    return [...s];
  }, [allItems]);
  const pinnedFn = useMemoWC(() => {
    if (!activePinned) return null;
    const base = (cfg.pinnedFilters || []).find(f => f.key === activePinned);
    if (base) return it => base.filter(it, catCategories);
    const custom = customPins.find(p => p.id === activePinned);
    if (custom) return it => makeCustomPinFilter(custom.filterType, custom.filterValue)(it, catCategories);
    return null;
  }, [activePinned, cfg.pinnedFilters, customPins, catCategories]);
  const filtered = useMemoWC(() => {
    return allItems.filter(it => {
      if (filterCat !== "all") {
        const cat = catCategories.find(c => c.id === it.categoryId);
        if (!cat || cat.name !== filterCat) return false;
      }
      if (pinnedFn && !pinnedFn(it)) return false;
      if (q) {
        const n = q.toLowerCase();
        const inName = it.name.toLowerCase().includes(n);
        const inCode = (it.code || "").toLowerCase().includes(n);
        const inDesc = (it.worldExt?.interior?.desc || "").toLowerCase().includes(n);
        const inTags = (it.tags || []).some(t => t.toLowerCase().includes(n));
        if (!inName && !inCode && !inDesc && !inTags) return false;
      }
      return true;
    });
  }, [allItems, filterCat, pinnedFn, q, catCategories]);
  const togglePinned = key => setActivePinned(prev => prev === key ? null : key);

  // Tab bar JSX
  const tabBar = hasTabs ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5"
  }, cfg.tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.key,
    onClick: () => setActiveTab(t.key),
    className: `px-3 h-8 rounded-md text-[12.5px] font-medium transition ${activeTab === t.key ? "bg-" + cfg.accent + "-600 text-white" : "text-stone-600 hover:bg-stone-100"}`
  }, t.label))) : null;

  // ── Nem-catalog tab: korai return (minden hook már meghívva) ──────────────
  if (isCustomTab) {
    const tab = cfg.tabs.find(t => t.key === activeTab);
    const rendered = tab && tab.render ? tab.render() : null;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "px-4 md:px-7 pt-5 pb-3 flex items-center justify-between gap-3 flex-wrap"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[16px] font-semibold tracking-tight text-stone-900"
    }, cfg.title), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-500"
    }, cfg.subtitle)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, extraHeader, tabBar)), rendered);
  }

  // ── Catalog nézet ─────────────────────────────────────────────────────────

  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold tracking-tight text-stone-900"
  }, cfg.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, cfg.subtitle)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 shrink-0"
  }, extraHeader, tabBar, /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("settings", "catalog"),
    className: `h-8 px-3 rounded-lg border text-[12px] font-medium inline-flex items-center gap-1.5 transition ${accent.link}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 13
  }), " Szerkeszt\xE9s ", /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 11
  })))), (cfg.pinnedFilters && cfg.pinnedFilters.length > 0 || customPins.length > 0) && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400 font-medium mr-0.5"
  }, "Gyors:"), (cfg.pinnedFilters || []).map(f => {
    const count = allItems.filter(it => f.filter(it, catCategories)).length;
    const active = activePinned === f.key;
    return /*#__PURE__*/React.createElement("button", {
      key: f.key,
      onClick: () => togglePinned(f.key),
      className: `h-7 px-2.5 rounded-full text-[11.5px] font-medium border transition inline-flex items-center gap-1.5 ${active ? accent.btn + " border-transparent" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"}`
    }, f.label, /*#__PURE__*/React.createElement("span", {
      className: `text-[10px] tabular-nums px-1 rounded-full ${active ? "bg-white/20" : "bg-stone-100 text-stone-400"}`
    }, count));
  }), customPins.map(p => {
    const filterFn = makeCustomPinFilter(p.filterType, p.filterValue);
    const count = allItems.filter(it => filterFn(it, catCategories)).length;
    const active = activePinned === p.id;
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      className: "relative group inline-flex"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => togglePinned(p.id),
      className: `h-7 pl-2.5 pr-1.5 rounded-full text-[11.5px] font-medium border transition inline-flex items-center gap-1.5 ${active ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-dashed border-stone-300 text-stone-600 hover:border-teal-400"}`
    }, p.label, /*#__PURE__*/React.createElement("span", {
      className: `text-[10px] tabular-nums px-1 rounded-full ${active ? "bg-white/20" : "bg-stone-100 text-stone-400"}`
    }, count)), /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        window.sim.removeWorldPin(worldId, p.id);
        if (activePinned === p.id) setActivePinned(null);
      },
      className: "absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-stone-700 text-white text-[9px] items-center justify-center hidden group-hover:flex hover:bg-rose-600 transition z-10"
    }, "\xD7"));
  }), activePinned && /*#__PURE__*/React.createElement("button", {
    onClick: () => setActivePinned(null),
    className: "h-7 w-7 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 border border-transparent hover:border-stone-200 transition"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 12
  })), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAddPin(v => !v),
    className: `h-7 w-7 rounded-full flex items-center justify-center border transition ${showAddPin ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-dashed border-stone-300 text-stone-400 hover:border-teal-400 hover:text-teal-600"}`,
    title: "Egyedi pin hozz\xE1ad\xE1sa"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  })), showAddPin && /*#__PURE__*/React.createElement(WCAddPinPopover, {
    worldId: worldId,
    catCategories: catCategories,
    allTags: allTags,
    onClose: () => setShowAddPin(false)
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5 overflow-x-auto max-w-full"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setFilterCat("all"),
    className: `px-2.5 h-7 rounded-md text-[11.5px] font-medium whitespace-nowrap ${filterCat === "all" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`
  }, "\xD6sszes ", /*#__PURE__*/React.createElement("span", {
    className: "ml-1 text-[10px] tabular-nums opacity-60"
  }, allItems.length)), cats.map(c => {
    const n = allItems.filter(it => {
      const cat = catCategories.find(cc => cc.id === it.categoryId);
      return cat && cat.name === c;
    }).length;
    return /*#__PURE__*/React.createElement("button", {
      key: c,
      onClick: () => setFilterCat(c),
      className: `px-2.5 h-7 rounded-md text-[11.5px] font-medium whitespace-nowrap ${filterCat === c ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`
    }, c, " ", /*#__PURE__*/React.createElement("span", {
      className: "ml-1 text-[10px] tabular-nums opacity-60"
    }, n));
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-3 h-8 flex-1 min-w-[160px] rounded-lg bg-white border border-stone-200 text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 13
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "K\xF3d, n\xE9v, le\xEDr\xE1s, c\xEDmke\u2026",
    className: "bg-transparent outline-none text-[11.5px] flex-1 min-w-0 placeholder:text-stone-400"
  }), q && /*#__PURE__*/React.createElement("button", {
    onClick: () => setQ(""),
    className: "text-stone-300 hover:text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 12
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center bg-white border border-stone-200 rounded-lg p-0.5 shrink-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewMode("grid"),
    className: `w-7 h-7 grid place-items-center rounded-md transition ${viewMode === "grid" ? "bg-stone-900 text-white" : "text-stone-400 hover:bg-stone-100"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 13
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewMode("list"),
    className: `w-7 h-7 grid place-items-center rounded-md transition ${viewMode === "list" ? "bg-stone-900 text-white" : "text-stone-400 hover:bg-stone-100"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "menu",
    size: 13
  })))), (activePinned || filterCat !== "all" || q) && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400"
  }, filtered.length, " tal\xE1lat", activePinned && /*#__PURE__*/React.createElement("span", null, " \xB7 ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-600 font-medium"
  }, (cfg.pinnedFilters || []).find(f => f.key === activePinned)?.label)), filterCat !== "all" && /*#__PURE__*/React.createElement("span", null, " \xB7 ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-600 font-medium"
  }, filterCat))), viewMode === "grid" && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
  }, filtered.map(it => /*#__PURE__*/React.createElement(WCItemCard, {
    key: it.id,
    item: it,
    worldId: worldId,
    onItemClick: onItemClick
  }))), viewMode === "list" && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[36px_90px_minmax(0,2fr)_minmax(0,1.2fr)_80px_80px_64px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-400 border-b border-stone-100 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", null, "K\xF3d"), /*#__PURE__*/React.createElement("div", null, "N\xE9v"), /*#__PURE__*/React.createElement("div", null, "Kateg\xF3ria"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "\xC1r"), /*#__PURE__*/React.createElement("div", null, "L\xE1that."), /*#__PURE__*/React.createElement("div", null)), filtered.map(it => {
    const cat = catCategories.find(c => c.id === it.categoryId);
    const color = it.props?.lookupColor || it.worldExt?.interior?.color || "#cbb88e";
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      onClick: onItemClick ? () => onItemClick(it) : undefined,
      className: `grid grid-cols-[36px_90px_minmax(0,2fr)_minmax(0,1.2fr)_80px_80px_64px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center ${onItemClick ? "cursor-pointer hover:bg-stone-50/60" : "hover:bg-stone-50/30"} transition`
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-7 h-7 rounded-md border border-stone-200 shrink-0",
      style: {
        background: color
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-mono text-stone-500 truncate"
    }, it.code), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900 truncate"
    }, it.name), it.worldExt?.interior?.desc && /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 truncate"
    }, it.worldExt.interior.desc)), /*#__PURE__*/React.createElement("div", null, cat ? /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-2 h-2 rounded-full",
      style: {
        background: cat.color
      }
    }), cat.name) : /*#__PURE__*/React.createElement("span", {
      className: "text-stone-300 text-[10.5px]"
    }, "\u2014")), /*#__PURE__*/React.createElement("div", {
      className: "text-right"
    }, it.price != null ? /*#__PURE__*/React.createElement("span", {
      className: "text-[11.5px] tabular-nums font-semibold text-stone-800"
    }, it.price.toLocaleString("hu-HU"), " Ft") : /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-300"
    }, "\u2014")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(WCVisBadge, {
      v: it.visibility || "private"
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex justify-end"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        window.navigateTo && window.navigateTo("settings", "catalog");
      },
      className: "w-7 h-7 grid place-items-center rounded-md text-stone-300 hover:bg-stone-100 hover:text-teal-600 transition",
      title: "Szerkeszt\xE9s a Be\xE1ll\xEDt\xE1sokban"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "external",
      size: 13
    }))));
  }), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-10 text-center text-[12px] text-stone-400"
  }, "Nincs tal\xE1lat.", " ", /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("settings", "catalog"),
    className: "underline text-teal-600"
  }, "Katal\xF3gus szerkeszt\xE9se \u2192"))), filtered.length === 0 && viewMode === "grid" && /*#__PURE__*/React.createElement("div", {
    className: "py-10 text-center text-[12px] text-stone-400"
  }, "Nincs tal\xE1lat.", " ", /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("settings", "catalog"),
    className: "underline text-teal-600"
  }, "Katal\xF3gus szerkeszt\xE9se \u2192")));
}

// ══════════════════════════════════════════════════════════════════════════════
// WarehouseStockTab — Katalógus-alapú készletkezelés
// Megjelenik: Raktár világ → Katalógus → Készletkezelés fül
// Mutatja a worldExt.warehouse mezővel rendelkező katalógus tételeket,
// és inline szerkesztést biztosít (onHand, min, location, reserved).
// ══════════════════════════════════════════════════════════════════════════════
const {
  useState: useWST,
  useMemo: useMemoWST
} = React;
const WST_TREND = {
  ok: {
    label: "Rendben",
    bar: "bg-teal-500",
    pill: "bg-teal-50 text-teal-700 border-teal-200",
    dot: "bg-teal-500"
  },
  low: {
    label: "Alacsony",
    bar: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500"
  },
  critical: {
    label: "Kritikus",
    bar: "bg-rose-500",
    pill: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500"
  }
};
function WSTTrendPill({
  trend
}) {
  const t = WST_TREND[trend] || WST_TREND.ok;
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${t.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.dot}`
  }), t.label);
}

// Inline szerkesztő panel (SlideOver-szerű, de beágyazott)
function WSTEditPanel({
  item,
  onClose
}) {
  const wh = item.worldExt?.warehouse || {};
  const [onHand, setOnHand] = useWST(String(wh.onHand ?? ""));
  const [min, setMin] = useWST(String(wh.min ?? ""));
  const [location, setLocation] = useWST(wh.location ?? "");
  const [reserved, setReserved] = useWST(String(wh.reserved ?? ""));
  const save = () => {
    window.sim.setWarehouseStock(item.id, {
      onHand: Number(onHand) || 0,
      min: Number(min) || 0,
      location: location.trim(),
      reserved: Number(reserved) || 0
    });
    onClose();
    if (window.toast) window.toast("✓ Készletadat mentve", "success");
  };
  const avail = (Number(onHand) || 0) - (Number(reserved) || 0);
  const pct = Math.min(100, (Number(onHand) || 0) / Math.max(1, (Number(min) || 0) * 2) * 100);
  const barCls = pct < 30 ? "bg-rose-500" : pct < 60 ? "bg-amber-500" : "bg-teal-500";
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-teal-200 bg-teal-50/30 p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, item.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] font-mono text-stone-400"
  }, item.code, " \xB7 ", item.unit)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-7 h-7 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1 text-[10.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", null, "K\xE9szlet el\u0151n\xE9zet"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums font-medium text-stone-700"
  }, onHand || 0, " / min. ", min || 0, " ", item.unit)), /*#__PURE__*/React.createElement("div", {
    className: "h-2 bg-stone-100 rounded-full overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full rounded-full transition-all ${barCls}`,
    style: {
      width: `${pct}%`
    }
  })), Number(reserved) > 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-1"
  }, "Szabad: ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-600"
  }, avail, " ", item.unit), " (foglalt: ", reserved, ")")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mb-1"
  }, "K\xE9szleten ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "(", item.unit, ")")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: onHand,
    onChange: e => setOnHand(e.target.value),
    min: 0,
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[13px] tabular-nums font-semibold outline-none focus:border-teal-500 bg-white"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mb-1"
  }, "Min. szint (rendel\xE9si pont)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: min,
    onChange: e => setMin(e.target.value),
    min: 0,
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[13px] tabular-nums outline-none focus:border-teal-500 bg-white"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mb-1"
  }, "Rakt\xE1rpoz\xEDci\xF3"), /*#__PURE__*/React.createElement("input", {
    value: location,
    onChange: e => setLocation(e.target.value),
    placeholder: "pl. R3-A2",
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500 bg-white"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mb-1"
  }, "Foglalt (nyitott megrendel\xE9sek)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: reserved,
    onChange: e => setReserved(e.target.value),
    min: 0,
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[13px] tabular-nums outline-none focus:border-teal-500 bg-white"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: save,
    className: "flex-1 h-9 rounded-xl bg-teal-600 text-white text-[12.5px] font-medium hover:bg-teal-700 transition inline-flex items-center justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  }), " Ment\xE9s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-9 px-4 rounded-xl border border-stone-200 text-[12.5px] text-stone-600 hover:bg-stone-50"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.sim.archiveWarehouseStock(item.id);
      onClose();
    },
    title: "Archiv\xE1l\xE1s (soft t\xF6rl\xE9s \u2014 az adat megmarad)",
    className: "h-9 px-3 rounded-xl border border-rose-200 text-rose-600 text-[12.5px] hover:bg-rose-50 transition inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "archive",
    size: 13
  }), " Archiv\xE1l\xE1s")), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 -mt-1"
  }, "Az archiv\xE1l\xE1s nem t\xF6rli v\xE9glegesen a t\xE9telt \u2014 audit c\xE9lb\xF3l meg\u0151rizz\xFCk, \xE9s b\xE1rmikor vissza\xE1ll\xEDthat\xF3."));
}
function WarehouseStockTab({
  embedded
}) {
  const sim = window.useSim();
  const [editId, setEditId] = useWST(null);
  const [q, setQ] = useWST("");
  const [filter, setFilter] = useWST("all"); // all | ok | low | critical | nodata | archived
  const [catFilter, setCatFilter] = useWST("all"); // categoryId vagy "all"

  const allCatalog = useMemoWST(() => (sim.catalog || []).filter(it => it.active !== false), [sim.catalog]);

  // AKTÍV raktározott tételek (van warehouse adat ÉS nincs archiválva)
  const stockItems = useMemoWST(() => allCatalog.filter(it => it.worldExt?.warehouse && !it.worldExt.warehouse.archived), [allCatalog]);

  // ARCHIVÁLT raktártételek (soft-deleted — audit miatt megmaradnak)
  const archivedItems = useMemoWST(() => allCatalog.filter(it => it.worldExt?.warehouse?.archived), [allCatalog]);

  // RAKTÁRBA VEHETŐ — bármely katalógus tétel, amelynek még egyáltalán nincs raktáradata
  const addableItems = useMemoWST(() => allCatalog.filter(it => !it.worldExt?.warehouse), [allCatalog]);

  // Összesítők
  const alerts = stockItems.filter(it => it.worldExt.warehouse.trend !== "ok").length;
  const critical = stockItems.filter(it => it.worldExt.warehouse.trend === "critical").length;

  // Szűrés + keresés
  const filtered = useMemoWST(() => {
    let list = filter === "nodata" ? addableItems : filter === "archived" ? archivedItems : stockItems;
    if (filter !== "all" && filter !== "nodata" && filter !== "archived") list = list.filter(it => it.worldExt?.warehouse?.trend === filter);
    if (catFilter !== "all") list = list.filter(it => it.categoryId === catFilter);
    if (q) {
      const n = q.toLowerCase();
      list = list.filter(it => it.name.toLowerCase().includes(n) || (it.code || "").toLowerCase().includes(n) || (it.worldExt?.warehouse?.location || "").toLowerCase().includes(n));
    }
    return list;
  }, [stockItems, addableItems, archivedItems, filter, catFilter, q]);

  // Elérhető kategóriák az aktuális szűrőfül alaplistájából (csak amelyek léteznek)
  const availableCats = useMemoWST(() => {
    const base = filter === "nodata" ? addableItems : filter === "archived" ? archivedItems : stockItems;
    const ids = new Set(base.map(it => it.categoryId).filter(Boolean));
    return (sim.catCategories || []).filter(c => ids.has(c.id));
  }, [stockItems, addableItems, archivedItems, filter, sim.catCategories]);
  const addToWarehouse = id => {
    window.sim.enableWarehouseStock(id);
    setEditId(id);
    setFilter("all");
  };
  const pickFilter = k => {
    setFilter(k);
    setCatFilter("all");
  };
  return /*#__PURE__*/React.createElement("div", {
    className: (embedded ? "" : "px-4 md:px-7 py-5 ") + "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3"
  }, [{
    label: "Nyilvántartott",
    value: stockItems.length,
    sub: "aktív raktártétel",
    tone: ""
  }, {
    label: "Riasztás",
    value: alerts,
    sub: "alacsony / kritikus",
    tone: alerts > 0 ? "text-amber-700" : ""
  }, {
    label: "Kritikus",
    value: critical,
    sub: "azonnali beavatkozás",
    tone: critical > 0 ? "text-rose-700" : ""
  }, {
    label: "Archivált",
    value: archivedItems.length,
    sub: "soft-törölt (audit)",
    tone: ""
  }].map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-white rounded-2xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-500 font-medium"
  }, c.label), /*#__PURE__*/React.createElement("div", {
    className: `text-[24px] font-semibold tabular-nums mt-0.5 ${c.tone || "text-stone-900"}`
  }, c.value), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, c.sub)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-0.5 bg-white border border-stone-200 rounded-lg p-0.5"
  }, [{
    k: "all",
    l: "Mind"
  }, {
    k: "ok",
    l: "Rendben"
  }, {
    k: "low",
    l: "Alacsony"
  }, {
    k: "critical",
    l: "Kritikus"
  }, {
    k: "nodata",
    l: "Raktárba vehető"
  }, {
    k: "archived",
    l: "Archivált"
  }].map(f => /*#__PURE__*/React.createElement("button", {
    key: f.k,
    onClick: () => pickFilter(f.k),
    className: `px-2.5 h-7 rounded-md text-[11.5px] font-medium whitespace-nowrap transition ${filter === f.k ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`
  }, f.l))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-3 h-8 flex-1 min-w-[160px] rounded-lg bg-white border border-stone-200 text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 13
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "K\xF3d, n\xE9v, poz\xEDci\xF3\u2026",
    className: "bg-transparent outline-none text-[11.5px] flex-1 min-w-0 placeholder:text-stone-400"
  }), q && /*#__PURE__*/React.createElement("button", {
    onClick: () => setQ(""),
    className: "text-stone-300 hover:text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 12
  })))), availableCats.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium shrink-0 pr-1"
  }, "T\xEDpus"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCatFilter("all"),
    className: `shrink-0 px-2.5 h-7 rounded-full text-[11.5px] font-medium whitespace-nowrap border transition ${catFilter === "all" ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`
  }, "Mind"), availableCats.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    onClick: () => setCatFilter(catFilter === c.id ? "all" : c.id),
    className: `shrink-0 inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11.5px] font-medium whitespace-nowrap border transition ${catFilter === c.id ? "border-stone-900 bg-stone-900 text-white" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full shrink-0",
    style: {
      background: c.color
    }
  }), c.name))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[90px_minmax(0,2fr)_minmax(0,1fr)_90px_90px_80px_80px_80px_56px] gap-3 px-5 py-2.5 text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("div", null, "K\xF3d"), /*#__PURE__*/React.createElement("div", null, "N\xE9v"), /*#__PURE__*/React.createElement("div", null, "Kateg\xF3ria"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "K\xE9szleten"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Min. szint"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Foglalt"), /*#__PURE__*/React.createElement("div", null, "Poz\xEDci\xF3"), /*#__PURE__*/React.createElement("div", null, "St\xE1tusz"), /*#__PURE__*/React.createElement("div", null)), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-10 text-center text-[12px] text-stone-400"
  }, filter === "nodata" ? "Nincs több raktárba vehető katalógustétel — úgy tűnik, minden tétel már nyilvántartott." : filter === "archived" ? "Nincs archivált raktártétel." : "Nincs találat."), filtered.map(item => {
    const wh = item.worldExt?.warehouse || {};
    const t = WST_TREND[wh.trend] || WST_TREND.ok;
    const pct = Math.min(100, (wh.onHand || 0) / Math.max(1, (wh.min || 0) * 2) * 100);
    const cat = (sim.catCategories || []).find(c => c.id === item.categoryId);
    const isEdit = editId === item.id;
    const mode = !item.worldExt?.warehouse ? "addable" : wh.archived ? "archived" : "active";
    return /*#__PURE__*/React.createElement("div", {
      key: item.id,
      className: `border-b border-stone-100 last:border-0 ${mode === "archived" ? "opacity-60" : ""}`
    }, /*#__PURE__*/React.createElement("div", {
      className: `hidden md:grid grid-cols-[90px_minmax(0,2fr)_minmax(0,1fr)_90px_90px_80px_80px_80px_56px] gap-3 px-5 py-3 items-center text-[12px] ${isEdit ? "bg-teal-50/30" : "hover:bg-stone-50/40"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-mono text-[10.5px] text-stone-500 truncate"
    }, item.code), /*#__PURE__*/React.createElement("div", {
      className: "font-medium text-stone-900 truncate"
    }, item.name), /*#__PURE__*/React.createElement("div", null, cat ? /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-1.5 h-1.5 rounded-full",
      style: {
        background: cat.color
      }
    }), cat.name) : /*#__PURE__*/React.createElement("span", {
      className: "text-stone-300"
    }, "\u2014")), /*#__PURE__*/React.createElement("div", {
      className: "text-right"
    }, wh.onHand != null ? /*#__PURE__*/React.createElement("span", {
      className: "tabular-nums font-semibold text-stone-800"
    }, wh.onHand, " ", /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400 font-normal text-[10px]"
    }, item.unit)) : /*#__PURE__*/React.createElement("span", {
      className: "text-stone-300"
    }, "\u2014")), /*#__PURE__*/React.createElement("div", {
      className: "text-right tabular-nums text-stone-500"
    }, wh.min != null ? wh.min : "—"), /*#__PURE__*/React.createElement("div", {
      className: "text-right tabular-nums text-stone-400"
    }, wh.reserved || 0), /*#__PURE__*/React.createElement("div", {
      className: "font-mono text-[10.5px] text-stone-500"
    }, wh.location || "—"), /*#__PURE__*/React.createElement("div", null, mode === "archived" ? /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-stone-200 bg-stone-50 text-stone-500 font-medium"
    }, "Archiv\xE1lt") : wh.trend ? /*#__PURE__*/React.createElement(WSTTrendPill, {
      trend: wh.trend
    }) : /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-stone-300 italic"
    }, "nincs adat")), /*#__PURE__*/React.createElement("div", {
      className: "flex justify-end"
    }, mode === "addable" ? /*#__PURE__*/React.createElement("button", {
      onClick: () => addToWarehouse(item.id),
      title: "Rakt\xE1rba vesz",
      className: "h-8 px-2.5 inline-flex items-center gap-1 rounded-lg bg-teal-600 text-white text-[11px] font-medium hover:bg-teal-700 transition"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 13
    }), " Felvesz") : mode === "archived" ? /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.restoreWarehouseStock(item.id),
      title: "Vissza\xE1ll\xEDt\xE1s",
      className: "w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-teal-50 hover:text-teal-600 transition"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "rotate",
      size: 14
    })) : /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditId(isEdit ? null : item.id),
      className: `w-8 h-8 grid place-items-center rounded-lg transition ${isEdit ? "bg-teal-100 text-teal-700" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "settings",
      size: 14
    })))), /*#__PURE__*/React.createElement("button", {
      onClick: () => mode === "addable" ? addToWarehouse(item.id) : mode === "archived" ? window.sim.restoreWarehouseStock(item.id) : setEditId(isEdit ? null : item.id),
      className: `md:hidden w-full text-left px-4 py-3.5 flex items-center gap-3 ${isEdit ? "bg-teal-50/40" : "active:bg-stone-50"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[13.5px] font-medium text-stone-900 truncate"
    }, item.name), wh.trend && !wh.archived && /*#__PURE__*/React.createElement(WSTTrendPill, {
      trend: wh.trend
    }), mode === "archived" && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium"
    }, "Archiv\xE1lt")), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3 mt-1"
    }, mode === "addable" ? /*#__PURE__*/React.createElement("span", {
      className: "text-[11.5px] text-teal-600 font-medium"
    }, "Koppints a rakt\xE1rba v\xE9telhez") : /*#__PURE__*/React.createElement(React.Fragment, null, wh.onHand != null && /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] tabular-nums font-semibold text-stone-700"
    }, wh.onHand, " ", item.unit), wh.location && /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-mono text-stone-400"
    }, wh.location), wh.min != null && /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-400"
    }, "min. ", wh.min))), mode !== "addable" && wh.onHand != null && wh.min != null && /*#__PURE__*/React.createElement("div", {
      className: "mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: `h-full rounded-full ${t.bar}`,
      style: {
        width: `${pct}%`
      }
    }))), /*#__PURE__*/React.createElement(Icon, {
      name: mode === "addable" ? "plus" : mode === "archived" ? "rotate" : "chevron",
      size: 14,
      className: `shrink-0 transition ${mode === "addable" ? "text-teal-600" : mode === "archived" ? "text-stone-400" : "text-stone-300"} ${mode === "active" && isEdit ? "rotate-90" : ""}`
    })), isEdit && /*#__PURE__*/React.createElement("div", {
      className: "px-3 pb-3 md:px-5 md:pb-4"
    }, /*#__PURE__*/React.createElement(WSTEditPanel, {
      item: item,
      onClose: () => setEditId(null)
    })));
  })), addableItems.length > 0 && filter !== "nodata" && filter !== "archived" && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[11.5px] text-stone-500 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "box",
    size: 14,
    className: "text-teal-600 shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, addableItems.length, " katal\xF3gust\xE9tel m\xE9g nincs rakt\xE1rban nyilv\xE1ntartva."), /*#__PURE__*/React.createElement("button", {
    onClick: () => pickFilter("nodata"),
    className: "ml-1 text-teal-600 font-medium hover:underline"
  }, "Rakt\xE1rba v\xE9tel \u2192")));
}
Object.assign(window, {
  WorldCatalog,
  WCVisBadge,
  WCItemCard,
  WORLD_CATALOG_CONFIG,
  WarehouseStockTab
});
})();
