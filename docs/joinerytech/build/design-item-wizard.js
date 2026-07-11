/* AUTO-GENERATED from design-item-wizard.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// design-item-wizard.jsx — "Tervezett bútor" intake for the quote builder.
//
//   Connects the Tervezés (Design) world into the Sales / quote flow. A quote
//   line can be an EGYEDI (one-off, from scratch) or KATALÓGUS (started from a
//   parametric template / finished product) designed furniture piece.
//
//   The Designes folyamat (design process) is the spine:
//       Igényfelmérés → Stílustervezés → Elrendezés → Műszaki → Gyártás
//   For a QUOTE only Igény + Stílus are required (rough estimate). Elrendezés,
//   Műszaki ("ha bizonytalan / határeset") and Gyártás ("ha saját gyártás" →
//   anyag / vasalat / megmunkálás) are OPTIONAL depth toggles that narrow the
//   price-estimate confidence band.
//
//   Bidirectional catalog: catalog items seed a design; finished designs can be
//   saved back to the catalog (window.sim.saveDesignToCatalog).
//
//   <DesignItemWizard onClose onAdd={(line) => …} />            // context="quote"
//   <DesignItemWizard context="design" onClose />                 // start design → quote
//   line = { name, code:"TERV", unit:"db", price, qty, vat, custom:true, design:{…} }
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateDW,
  useMemo: useMemoDW
} = React;
const dwHuf = n => Math.round(n).toLocaleString("hu-HU") + " Ft";
const dwClamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const dwRound = (n, step) => Math.round(n / step) * step;

// Finished-surface price proxy (Ft / m²) — drives the rough estimate
const DW_MAT_RATE = {
  "EG-3303-18": 22000,
  "EG-1133-18": 24000,
  "EG-3327-18": 26000,
  "MDF-019": 16000,
  "EG-3327-19": 38000,
  "EG-3303-19": 34000,
  "TL-040": 72000,
  "BK-040": 58000,
  "HDF-003": 6000,
  "MDF-006": 9000
};
const DW_ROOMS = ["Konyha", "Nappali", "Háló", "Fürdő", "Gardrób", "Előszoba", "Iroda", "Egyéb"];
const DW_STYLES = [{
  k: "modern",
  l: "Modern",
  mult: 1.0,
  note: "Síkfront, rejtett fogantyú"
}, {
  k: "skandi",
  l: "Skandináv",
  mult: 1.05,
  note: "Világos tónus, fa hangsúly"
}, {
  k: "minimal",
  l: "Minimal",
  mult: 1.1,
  note: "Letisztult, fogantyú nélkül"
}, {
  k: "loft",
  l: "Loft / ipari",
  mult: 1.12,
  note: "Fém + fa kombináció"
}, {
  k: "rusztikus",
  l: "Rusztikus",
  mult: 1.2,
  note: "Tömör fa, látszó erezet"
}, {
  k: "klasszikus",
  l: "Klasszikus",
  mult: 1.35,
  note: "Marással, profilozott front"
}];

// material lists from the design catalog
const DW_ALL_MATS = () => Object.entries(window.CATALOG_LOOKUP || {}).map(([code, m]) => ({
  code,
  ...m
}));
const DW_CORPUS = () => DW_ALL_MATS().filter(m => m.kind === "korpusz" || m.kind === "tömör");
const DW_FRONT = () => DW_ALL_MATS().filter(m => m.kind === "front" || m.kind === "tömör");
const dwMatName = code => (window.CATALOG_LOOKUP || {})[code]?.name || code;
const dwMatColor = code => (window.CATALOG_LOOKUP || {})[code]?.color || "#cbb88e";
const DW_STEPS = ["Típus", "Igény", "Stílus", "Mélység", "Ár"];

// Gyártásmód — a tervezhető bútornál EZ dönti el, hogy házon belül gyártjuk
// (saját gyártás → gyártási alprojekt + műhely-folyamat), vagy külső gyártótól
// rendeljük (rendelhető egyedi → beszerzési igény / megrendelés).
const DW_SOURCING = [{
  k: "own",
  l: "Saját gyártás",
  icon: "factory",
  desc: "Házon belül gyártjuk. Megrendeléskor gyártási alprojekt és műhely-folyamat indítható."
}, {
  k: "outsourced",
  l: "Rendelhető (külső gyártó)",
  icon: "box",
  desc: "Külső gyártótól rendeljük. Megrendeléskor beszerzési igény / megrendelés készül."
}];

// The full design process — two locked (required for a quote) + three optional
const DW_PHASES = [{
  k: "needs",
  l: "Igényfelmérés",
  icon: "user",
  locked: true,
  desc: "Funkció, méret, elvárások rögzítése."
}, {
  k: "style",
  l: "Stílustervezés",
  icon: "drop",
  locked: true,
  desc: "Stílusirány és felhasználható anyagok."
}, {
  k: "layout",
  l: "Elrendezés",
  icon: "layers",
  fee: 0,
  desc: "Modulok, belső kiosztás, funkciók pontosítása."
}, {
  k: "technical",
  l: "Műszaki tervezés",
  icon: "ruler",
  fee: 0,
  desc: "Akkor kell, ha bizonytalan megoldás vagy határeset — a műszaki feltételek tisztázása."
}, {
  k: "manufacturing",
  l: "Gyártástervezés",
  icon: "cpu",
  fee: 0,
  desc: "Akkor kell, ha saját gyártás — anyag, vasalat és megmunkálás meghatározása."
}];
function dwTplDims(t) {
  const g = k => {
    const v = (t.vars || []).find(x => x.key === k);
    return v ? v.default : null;
  };
  return {
    w: g("width") || 800,
    h: g("height") || 1800,
    d: g("depth") || 400
  };
}

// ──────────────────────────────────────────────────────────────────────────
function DesignItemWizard({
  context = "quote",
  onClose,
  onAdd,
  initial = null
}) {
  const isDesign = context === "design";
  const editMode = !!(initial && initial.design);
  const _d = editMode ? initial.design : null;
  const [step, setStep] = useStateDW(0);
  const [category, setCategory] = useStateDW(_d ? _d.category || "egyedi" : "egyedi"); // egyedi | katalogus
  const [sourcing, setSourcing] = useStateDW(_d ? _d.sourcing || "own" : "own"); // own | outsourced
  const [elemCategory, setElemCategory] = useStateDW(_d ? _d.elemCategory || (window.MAKER_CATEGORIES || [])[0] || "" : (window.MAKER_CATEGORIES || [])[0] || ""); // gyártható elem-kategória (outsourced)
  const [baseRef, setBaseRef] = useStateDW(_d ? _d.baseRef || null : null); // { id, name, kind:"tpl"|"prod", price?, dims? }
  const [needs, setNeeds] = useStateDW(_d ? {
    room: "Konyha",
    w: 800,
    h: 1800,
    d: 400,
    qty: 1,
    note: "",
    ...(_d.needs || {})
  } : {
    room: "Konyha",
    w: 800,
    h: 1800,
    d: 400,
    qty: 1,
    note: ""
  });
  const [style, setStyle] = useStateDW(_d ? {
    dir: "modern",
    corpus: "EG-3303-18",
    front: "EG-3327-19",
    note: "",
    ...(_d.style || {})
  } : {
    dir: "modern",
    corpus: "EG-3303-18",
    front: "EG-3327-19",
    note: ""
  });
  const [phases, setPhases] = useStateDW(_d ? {
    layout: false,
    technical: false,
    manufacturing: false,
    ...(_d.phases || {})
  } : {
    layout: false,
    technical: false,
    manufacturing: false
  });
  const [name, setName] = useStateDW(editMode && initial.name ? initial.name : "");
  const [priceOverride, setPriceOverride] = useStateDW(null);
  const [vat, setVat] = useStateDW(editMode && initial.vat != null ? initial.vat : 27);
  const [saveCat, setSaveCat] = useStateDW(false);
  const [pickerOpen, setPickerOpen] = useStateDW(false);
  const [doneQuote, setDoneQuote] = useStateDW(null);
  const templates = window.PARAM_TEMPLATES || [];
  const products = window.sim && window.sim.getState().products || [];

  // lock body scroll
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ── estimate ──────────────────────────────────────────────────────────────
  const est = useMemoDW(() => {
    const {
      w,
      h,
      d
    } = needs;
    const frontM2 = w * h / 1e6;
    const corpusM2 = (2 * (w * d) + 2 * (h * d) + w * h) / 1e6;
    const frontRate = DW_MAT_RATE[style.front] || 36000;
    const corpusRate = DW_MAT_RATE[style.corpus] || 22000;
    const mat = frontM2 * frontRate + corpusM2 * corpusRate;
    const hwLabor = mat * 0.85; // vasalat + munkadíj
    const dirMult = (DW_STYLES.find(s => s.k === style.dir) || {}).mult || 1;
    let unit = (mat + hwLabor) * dirMult;
    // blend toward a catalog anchor price when starting from a finished product
    if (category === "katalogus" && baseRef && baseRef.price) unit = unit * 0.55 + baseRef.price * 0.45;
    unit = dwRound(Math.max(unit, 18000), 1000);
    // confidence band — narrows as deeper phases are planned
    let band = 0.25;
    if (phases.layout) band -= 0.08;
    if (phases.technical) band -= 0.07;
    if (phases.manufacturing) band -= 0.07;
    band = dwClamp(band, 0.03, 0.25);
    return {
      unit,
      band,
      frontM2,
      corpusM2
    };
  }, [needs, style, phases, category, baseRef]);
  const unitPrice = priceOverride != null ? priceOverride : est.unit;
  const qty = needs.qty;
  const net = unitPrice * qty;
  const lo = Math.round(unitPrice * (1 - est.band) / 1000) * 1000;
  const hi = Math.round(unitPrice * (1 + est.band) / 1000) * 1000;
  const derivedName = useMemoDW(() => {
    if (name.trim()) return name.trim();
    const matWord = dwMatName(style.corpus).split(" ")[0];
    const base = baseRef ? baseRef.name : `${needs.room} bútor`;
    return category === "katalogus" ? base : `${matWord} ${needs.room.toLowerCase()}bútor`;
  }, [name, style, needs, baseRef, category]);
  const phasesIncluded = ["needs", "style", ...Object.keys(phases).filter(k => phases[k])];
  const pickBase = ref => {
    setBaseRef(ref);
    if (ref.dims) setNeeds(n => ({
      ...n,
      ...ref.dims
    }));
  };
  const canNext = step === 0 ? category === "egyedi" || !!baseRef : true;
  const buildLine = () => ({
    name: derivedName,
    code: "TERV",
    unit: "db",
    price: unitPrice,
    qty,
    vat,
    custom: true,
    design: {
      category,
      sourcing,
      elemCategory: sourcing === "outsourced" ? elemCategory : null,
      baseRef: baseRef ? {
        id: baseRef.id,
        name: baseRef.name,
        kind: baseRef.kind
      } : null,
      needs: {
        ...needs
      },
      style: {
        ...style
      },
      phases: {
        ...phases
      },
      phasesIncluded,
      band: est.band,
      estLo: lo,
      estHi: hi
    }
  });
  const maybeSaveCatalog = () => {
    if (saveCat && window.sim && window.sim.saveDesignToCatalog) {
      window.sim.saveDesignToCatalog({
        name: derivedName,
        price: unitPrice,
        cat: needs.room,
        blurb: style.note || DW_STYLES.find(s => s.k === style.dir)?.l
      });
    }
  };

  // context="quote": hand the line back to the ItemBuilder
  const submit = () => {
    maybeSaveCatalog();
    onAdd(buildLine());
    onClose();
  };

  // context="design": create a brand-new quote from this design for the picked customer
  const createQuoteFor = customerName => {
    maybeSaveCatalog();
    const id = window.sim && window.sim.createQuote({
      customer: customerName,
      lines: [buildLine()]
    });
    setPickerOpen(false);
    setDoneQuote({
      id,
      customer: customerName
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[68] flex flex-col bg-stone-50",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("header", {
    className: "shrink-0 bg-white border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1100px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100",
    "aria-label": "Bez\xE1r\xE1s"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-lg bg-violet-600 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ruler",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 leading-tight"
  }, editMode ? "Tervezett bútor módosítása" : isDesign ? "Tervezés indítása" : "Tervezett bútor"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 leading-tight"
  }, editMode ? "Specifikáció módosítása · az ár újraszámolódik" : isDesign ? "Új tervezés → ajánlat · igény és stílus alapján becsült ár" : "Tervezés → ajánlat · igény és stílus alapján becsült ár")), /*#__PURE__*/React.createElement("div", {
    className: "hidden sm:block text-[11px] text-stone-400 font-mono"
  }, step + 1, "/", DW_STEPS.length))), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 bg-white border-b border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1100px] mx-auto px-4 md:px-6 py-2.5 flex items-center gap-1 overflow-x-auto"
  }, DW_STEPS.map((label, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => i < step && setStep(i),
    disabled: i > step,
    className: "flex items-center gap-2 shrink-0 disabled:cursor-default"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold transition ${i < step ? "bg-violet-600 text-white" : i === step ? "bg-violet-100 text-violet-700 ring-2 ring-violet-300" : "bg-stone-100 text-stone-400"}`
  }, i < step ? "✓" : i + 1), /*#__PURE__*/React.createElement("span", {
    className: `text-[12px] ${i === step ? "font-semibold text-stone-900" : i < step ? "text-stone-500" : "text-stone-400"}`
  }, label)), i < DW_STEPS.length - 1 && /*#__PURE__*/React.createElement("div", {
    className: `w-6 sm:w-10 h-px shrink-0 ${i < step ? "bg-violet-300" : "bg-stone-200"}`
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-h-0 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1100px] mx-auto px-4 md:px-6 py-5"
  }, step === 0 && /*#__PURE__*/React.createElement(StepType, {
    category: category,
    setCategory: setCategory,
    sourcing: sourcing,
    setSourcing: setSourcing,
    elemCategory: elemCategory,
    setElemCategory: setElemCategory,
    baseRef: baseRef,
    pickBase: pickBase,
    templates: templates,
    products: products
  }), step === 1 && /*#__PURE__*/React.createElement(StepNeeds, {
    needs: needs,
    setNeeds: setNeeds
  }), step === 2 && /*#__PURE__*/React.createElement(StepStyle, {
    style: style,
    setStyle: setStyle
  }), step === 3 && /*#__PURE__*/React.createElement(StepDepth, {
    phases: phases,
    setPhases: setPhases,
    needs: needs,
    style: style,
    est: est
  }), step === 4 && /*#__PURE__*/React.createElement(StepPrice, {
    derivedName: derivedName,
    name: name,
    setName: setName,
    unitPrice: unitPrice,
    setPriceOverride: setPriceOverride,
    estUnit: est.unit,
    qty: qty,
    setNeeds: setNeeds,
    vat: vat,
    setVat: setVat,
    net: net,
    lo: lo,
    hi: hi,
    band: est.band,
    category: category,
    baseRef: baseRef,
    needs: needs,
    style: style,
    phases: phases,
    sourcing: sourcing,
    elemCategory: elemCategory,
    saveCat: saveCat,
    setSaveCat: setSaveCat
  }))), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 bg-white border-t border-stone-200",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom),0px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1100px] mx-auto px-4 md:px-6 h-16 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => step === 0 ? onClose() : setStep(step - 1),
    className: "h-10 px-4 rounded-lg border border-stone-200 text-[12.5px] font-medium text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14,
    className: "rotate-180"
  }), step === 0 ? "Mégse" : "Vissza"), step >= 2 && /*#__PURE__*/React.createElement("div", {
    className: "hidden sm:flex flex-col leading-tight ml-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Becs\xFClt nett\xF3"), /*#__PURE__*/React.createElement("span", {
    className: "text-[14px] font-semibold text-stone-900 tabular-nums"
  }, dwHuf(net), " ", /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-normal text-stone-400"
  }, "\xB1", Math.round(est.band * 100), "%"))), /*#__PURE__*/React.createElement("span", {
    className: "flex-1"
  }), step < DW_STEPS.length - 1 ? /*#__PURE__*/React.createElement("button", {
    onClick: () => canNext && setStep(step + 1),
    disabled: !canNext,
    className: "h-10 px-6 rounded-lg bg-violet-600 text-white text-[12.5px] font-semibold hover:bg-violet-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-2"
  }, "Tov\xE1bb ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14
  })) : /*#__PURE__*/React.createElement("button", {
    onClick: isDesign ? () => setPickerOpen(true) : submit,
    className: "h-10 px-5 rounded-lg bg-violet-600 text-white text-[12.5px] font-semibold hover:bg-violet-700 inline-flex items-center gap-2"
  }, isDesign ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icon, {
    name: "briefcase",
    size: 15
  }), " Aj\xE1nlat k\xE9sz\xEDt\xE9se") : editMode ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 15
  }), " M\xF3dos\xEDt\xE1s ment\xE9se") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), " Hozz\xE1ad\xE1s az aj\xE1nlathoz")))), pickerOpen && window.CustomerPickerDialog && /*#__PURE__*/React.createElement(CustomerPickerDialog, {
    customers: window.sim && window.sim.getState().customers || [],
    onPick: name => createQuoteFor(name),
    onAddCustomer: c => window.sim && window.sim.addCustomer(c),
    onClose: () => setPickerOpen(false)
  }), doneQuote && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[72] grid place-items-center bg-stone-900/40 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center animate-[chSlide_.22s_ease-out]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 grid place-items-center mx-auto mb-3"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 26
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold text-stone-900"
  }, "Aj\xE1nlat l\xE9trehozva"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500 mt-1"
  }, derivedName, " \u2014 ", doneQuote.customer), doneQuote.id && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-[11.5px] font-mono"
  }, doneQuote.id), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 mt-3"
  }, "Az aj\xE1nlat a V\xE1zlat st\xE1tuszban j\xF6tt l\xE9tre, az \xC9rt\xE9kes\xEDt\xE9s \u2192 Aj\xE1nlatok alatt folytathat\xF3."), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center gap-2 mt-5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-9 px-4 rounded-lg bg-stone-900 text-white text-[12px] font-medium hover:bg-stone-800"
  }, "Bez\xE1r\xE1s")))));
}

// ── Step 0 — Típus ──────────────────────────────────────────────────────────
function StepType({
  category,
  setCategory,
  sourcing,
  setSourcing,
  elemCategory,
  setElemCategory,
  baseRef,
  pickBase,
  templates,
  products
}) {
  const cats = [{
    k: "egyedi",
    l: "Egyedi tervezés",
    icon: "sparkle",
    desc: "Teljesen egyedi bútor vagy összeállítás, nulláról — szabad méret, anyag és funkció."
  }, {
    k: "katalogus",
    l: "Katalógus bútor",
    icon: "box",
    desc: "Meglévő sablon vagy katalógus-termék testreszabása kiindulásként."
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Gy\xE1rt\xE1sm\xF3d"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400"
  }, "\u2014 h\xE1zon bel\xFCl gy\xE1rtjuk, vagy k\xFCls\u0151 gy\xE1rt\xF3t\xF3l rendelj\xFCk")), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-3"
  }, DW_SOURCING.map(c => {
    const active = sourcing === c.k;
    return /*#__PURE__*/React.createElement("button", {
      key: c.k,
      onClick: () => setSourcing(c.k),
      className: `text-left p-4 rounded-2xl border-2 transition ${active ? "border-teal-500 bg-teal-50/50 shadow-sm shadow-teal-100" : "border-stone-200 bg-white hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2.5 mb-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-9 h-9 rounded-xl grid place-items-center shrink-0 ${active ? "bg-teal-600 text-white" : "bg-stone-100 text-stone-500"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: c.icon,
      size: 18
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[13.5px] font-semibold text-stone-900"
    }, c.l), active && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 16,
      className: "text-teal-600 ml-auto"
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-500 leading-snug"
    }, c.desc));
  })), sourcing === "outsourced" && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "box",
    size: 13,
    className: "text-amber-600"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] font-semibold text-stone-800"
  }, "Gy\xE1rthat\xF3 elem-kateg\xF3ria")), /*#__PURE__*/React.createElement("p", {
    className: "text-[10.5px] text-stone-500 mb-2 leading-snug"
  }, "A beszerz\xE9s ez alapj\xE1n list\xE1zza a k\xFCls\u0151 gy\xE1rt\xF3kat, akik ezt a kateg\xF3ri\xE1t v\xE1llalj\xE1k."), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, (window.MAKER_CATEGORIES || []).map(c => {
    const active = elemCategory === c;
    return /*#__PURE__*/React.createElement("button", {
      key: c,
      onClick: () => setElemCategory(c),
      className: `h-8 px-3 rounded-lg text-[12px] font-medium border transition ${active ? "bg-amber-600 border-amber-600 text-white" : "bg-white border-stone-200 text-stone-600 hover:border-amber-300"}`
    }, c);
  })))), /*#__PURE__*/React.createElement("div", {
    className: "h-px bg-stone-100"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 max-w-2xl"
  }, "Az aj\xE1nlathoz az ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, "ig\xE9nyt"), " \xE9s a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, "st\xEDlust"), " kell ismerni a becsl\xE9shez \u2014 a r\xE9szletes tervez\xE9s k\xE9s\u0151bb, a Tervez\xE9s modulban folytathat\xF3."), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-3"
  }, cats.map(c => {
    const active = category === c.k;
    return /*#__PURE__*/React.createElement("button", {
      key: c.k,
      onClick: () => setCategory(c.k),
      className: `text-left p-4 rounded-2xl border-2 transition ${active ? "border-violet-500 bg-violet-50/50 shadow-sm shadow-violet-100" : "border-stone-200 bg-white hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-10 h-10 rounded-xl grid place-items-center mb-3 ${active ? "bg-violet-600 text-white" : "bg-stone-100 text-stone-500"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: c.icon,
      size: 20
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[13.5px] font-semibold text-stone-900"
    }, c.l), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-500 mt-1 leading-snug"
    }, c.desc));
  })), category === "katalogus" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Kiindul\xE1si alap"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 gap-2.5"
  }, templates.filter(t => t.id !== "T-04").map(t => {
    const active = baseRef && baseRef.id === t.id;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => pickBase({
        id: t.id,
        name: t.name,
        kind: "tpl",
        dims: dwTplDims(t)
      }),
      className: `text-left p-3 rounded-xl border-2 transition flex items-center gap-3 ${active ? "border-violet-500 bg-violet-50/50" : "border-stone-200 bg-white hover:border-stone-300"}`
    }, window.TemplateThumb ? /*#__PURE__*/React.createElement(TemplateThumb, {
      kind: t.thumb,
      size: 40
    }) : /*#__PURE__*/React.createElement("span", {
      className: "w-10 h-10 rounded-md bg-stone-100"
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-medium text-stone-900 truncate"
    }, t.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-400"
    }, "Sablon \xB7 ", t.type)));
  }), products.map(p => {
    const active = baseRef && baseRef.id === p.id;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      onClick: () => pickBase({
        id: p.id,
        name: p.name,
        kind: "prod",
        price: p.price
      }),
      className: `text-left p-3 rounded-xl border-2 transition flex items-center gap-3 ${active ? "border-violet-500 bg-violet-50/50" : "border-stone-200 bg-white hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-10 h-10 rounded-md bg-gradient-to-br ${p.tint || "from-stone-200 to-stone-100"} grid place-items-center shrink-0`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: p.icon || "box",
      size: 17,
      className: "text-stone-500"
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-medium text-stone-900 truncate"
    }, p.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-400 font-mono"
    }, dwHuf(p.price), " \xB7 katal\xF3gus")));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5 p-3 rounded-xl bg-stone-100/70 text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 15,
    className: "mt-0.5 shrink-0 text-violet-500"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-[11.5px] leading-snug"
  }, "K\xE9tir\xE1ny\xFA katal\xF3gus: a katal\xF3gus elemei kiindul\xE1sk\xE9nt haszn\xE1lhat\xF3k, a k\xE9sz tervezett b\xFAtor pedig visszamenthet\u0151 a katal\xF3gusba (utols\xF3 l\xE9p\xE9s).")));
}

// ── Step 1 — Igényfelmérés ──────────────────────────────────────────────────
function StepNeeds({
  needs,
  setNeeds
}) {
  const set = patch => setNeeds(n => ({
    ...n,
    ...patch
  }));
  return /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-2.5"
  }, "Helyis\xE9g / funkci\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, DW_ROOMS.map(r => /*#__PURE__*/React.createElement("button", {
    key: r,
    onClick: () => set({
      room: r
    }),
    className: `h-8 px-3 rounded-lg text-[12px] font-medium border transition ${needs.room === r ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"}`
  }, r)))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-2.5"
  }, "M\xE9retek ", /*#__PURE__*/React.createElement("span", {
    className: "font-normal text-stone-400"
  }, "(mm)")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-3"
  }, [{
    k: "w",
    l: "Szélesség",
    min: 200,
    max: 4000
  }, {
    k: "h",
    l: "Magasság",
    min: 200,
    max: 3000
  }, {
    k: "d",
    l: "Mélység",
    min: 150,
    max: 900
  }].map(dim => /*#__PURE__*/React.createElement("div", {
    key: dim.k
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, dim.l), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: needs[dim.k],
    min: dim.min,
    max: dim.max,
    onChange: e => set({
      [dim.k]: dwClamp(Number(e.target.value) || 0, 0, dim.max)
    }),
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[14px] font-semibold font-mono tabular-nums outline-none focus:border-violet-400"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 text-[10.5px] text-stone-400 font-mono"
  }, "T\xE9rfogat \u2248 ", (needs.w * needs.h * needs.d / 1e9).toFixed(2), " m\xB3")), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900"
  }, "Darabsz\xE1m"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => set({
      qty: Math.max(1, needs.qty - 1)
    }),
    className: "w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "minus",
    size: 15
  })), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: needs.qty,
    min: 1,
    onChange: e => set({
      qty: Math.max(1, Number(e.target.value) || 1)
    }),
    className: "w-14 h-9 text-center rounded-lg border border-stone-200 text-[14px] font-semibold font-mono outline-none focus:border-violet-400"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => set({
      qty: needs.qty + 1
    }),
    className: "w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  })))))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-1"
  }, "Ig\xE9nyek, elv\xE1r\xE1sok"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mb-2.5"
  }, "Mit kell tudnia a b\xFAtornak? T\xE1rol\xE1s, funkci\xF3k, k\xE9nyelmi \xE9s helysz\xEDni ig\xE9nyek."), /*#__PURE__*/React.createElement("textarea", {
    value: needs.note,
    onChange: e => set({
      note: e.target.value
    }),
    rows: 8,
    placeholder: "pl. Be\xE9p\xEDtett mosogat\xF3 al\xE1, als\xF3 sor fi\xF3kokkal, sarokmegold\xE1s a k\xFCrt\u0151 miatt, be\xE9p\xEDtett h\u0171t\u0151nek hely\u2026",
    className: "w-full px-3 py-2.5 rounded-lg border border-stone-200 text-[12.5px] leading-relaxed outline-none focus:border-violet-400 resize-none"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 grid grid-cols-3 gap-2"
  }, ["Moodboard", "Helyszínfotó", "Vázlat"].map(lab => /*#__PURE__*/React.createElement("div", {
    key: lab,
    className: "aspect-[4/3] rounded-lg border border-dashed border-stone-300 grid place-items-center text-center",
    style: {
      background: "repeating-linear-gradient(45deg,#fafaf9,#fafaf9 6px,#f5f5f4 6px,#f5f5f4 12px)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] font-mono text-stone-400 px-1"
  }, lab))))));
}

// ── Step 2 — Stílustervezés ─────────────────────────────────────────────────
function StepStyle({
  style,
  setStyle
}) {
  const set = patch => setStyle(s => ({
    ...s,
    ...patch
  }));
  const MatRow = ({
    label,
    list,
    value,
    onPick
  }) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, list.map(m => {
    const active = value === m.code;
    return /*#__PURE__*/React.createElement("button", {
      key: m.code,
      onClick: () => onPick(m.code),
      title: m.name,
      className: `relative w-10 h-10 rounded-lg border-2 transition ${active ? "border-violet-600 shadow-sm shadow-violet-200" : "border-transparent hover:border-stone-300"}`,
      style: {
        background: m.color
      }
    }, active && /*#__PURE__*/React.createElement("span", {
      className: "absolute inset-0 grid place-items-center"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14,
      className: "text-white drop-shadow"
    })));
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mt-1 truncate"
  }, dwMatName(value)));
  return /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-2.5"
  }, "St\xEDlusir\xE1ny"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, DW_STYLES.map(s => {
    const active = style.dir === s.k;
    return /*#__PURE__*/React.createElement("button", {
      key: s.k,
      onClick: () => set({
        dir: s.k
      }),
      className: `text-left p-3 rounded-xl border-2 transition ${active ? "border-violet-500 bg-violet-50/50" : "border-stone-200 bg-white hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-900"
    }, s.l), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 mt-0.5 leading-snug"
    }, s.note));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement(MatRow, {
    label: "Korpusz / alapanyag",
    list: DW_CORPUS(),
    value: style.corpus,
    onPick: c => set({
      corpus: c
    })
  }), /*#__PURE__*/React.createElement(MatRow, {
    label: "Front anyag",
    list: DW_FRONT(),
    value: style.front,
    onPick: c => set({
      front: c
    })
  }))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "drop",
    size: 16,
    className: "mt-0.5 shrink-0 text-violet-500"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-[11.5px] text-stone-600 leading-snug"
  }, "A st\xEDlus \xE9s az elrendez\xE9s adja a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-800"
  }, "funkci\xF3t"), " \xE9s a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-800"
  }, "felhaszn\xE1lhat\xF3 anyagokat"), " \u2014 ez el\xE9g egy aj\xE1nlat-szint\u0171 becsl\xE9shez.")), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-stone-100 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3.5 h-3.5 rounded-sm border border-stone-200",
    style: {
      background: dwMatColor(style.corpus)
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, "Korpusz:"), /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-800 truncate"
  }, dwMatName(style.corpus))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3.5 h-3.5 rounded-sm border border-stone-200",
    style: {
      background: dwMatColor(style.front)
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, "Front:"), /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-800 truncate"
  }, dwMatName(style.front))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px]"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkle",
    size: 13,
    className: "text-violet-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, "Ir\xE1ny:"), /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-800"
  }, DW_STYLES.find(s => s.k === style.dir)?.l)))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-1"
  }, "St\xEDlus-jegyzet"), /*#__PURE__*/React.createElement("textarea", {
    value: style.note,
    onChange: e => set({
      note: e.target.value
    }),
    rows: 4,
    placeholder: "pl. matt fel\xFClet, fa foganty\xFA, antracit l\xE1bazat, LED vil\xE1g\xEDt\xE1s a fels\u0151 sorban\u2026",
    className: "w-full px-3 py-2.5 rounded-lg border border-stone-200 text-[12.5px] leading-relaxed outline-none focus:border-violet-400 resize-none"
  }))));
}

// ── Step 3 — Tervezési mélység ──────────────────────────────────────────────
function StepDepth({
  phases,
  setPhases,
  needs,
  style,
  est
}) {
  const toggle = k => setPhases(p => ({
    ...p,
    [k]: !p[k]
  }));
  // rough manufacturing-needs preview (gyártástervezés output)
  const hours = needs.w * needs.h / 1e6 * 1.4 + needs.qty * 0.6;
  return /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-[1fr_320px] gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 max-w-2xl"
  }, "A teljes folyamatra nincs sz\xFCks\xE9g egy aj\xE1nlathoz. Min\xE9l t\xF6bb f\xE1zist tervezel meg, ann\xE1l pontosabb a becsl\xE9s."), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, DW_PHASES.map((ph, i) => {
    const on = ph.locked || phases[ph.k];
    return /*#__PURE__*/React.createElement("div", {
      key: ph.k,
      className: `flex items-start gap-3 p-3 rounded-xl border transition ${on ? "border-violet-200 bg-violet-50/40" : "border-stone-200 bg-white"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-9 h-9 rounded-lg grid place-items-center shrink-0 ${on ? "bg-violet-600 text-white" : "bg-stone-100 text-stone-400"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: ph.icon,
      size: 17
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-semibold text-stone-900"
    }, i + 1, ". ", ph.l), ph.locked && /*#__PURE__*/React.createElement("span", {
      className: "text-[9.5px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium"
    }, "k\xF6telez\u0151")), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 mt-0.5 leading-snug"
    }, ph.desc)), ph.locked ? /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 mt-0.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 16,
      className: "text-violet-600"
    })) : /*#__PURE__*/React.createElement("button", {
      onClick: () => toggle(ph.k),
      role: "switch",
      "aria-checked": on,
      className: `shrink-0 mt-0.5 w-10 h-6 rounded-full transition relative ${on ? "bg-violet-600" : "bg-stone-200"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${on ? "left-[18px]" : "left-0.5"}`
    })));
  }))), phases.manufacturing && /*#__PURE__*/React.createElement(Card, {
    className: "p-4 border-violet-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cpu",
    size: 15,
    className: "text-violet-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900"
  }, "Gy\xE1rt\xE1si sz\xFCks\xE9gletek ", /*#__PURE__*/React.createElement("span", {
    className: "font-normal text-stone-400"
  }, "(becsl\xE9s)"))), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-3 gap-2.5 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-2.5 rounded-lg bg-stone-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1"
  }, "Anyag"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded-sm border border-stone-200",
    style: {
      background: dwMatColor(style.corpus)
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-700 truncate"
  }, dwMatName(style.corpus))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded-sm border border-stone-200",
    style: {
      background: dwMatColor(style.front)
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-700 truncate"
  }, dwMatName(style.front))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 font-mono mt-1"
  }, "\u2248 ", (est.corpusM2 + est.frontM2).toFixed(1), " m\xB2")), /*#__PURE__*/React.createElement("div", {
    className: "p-2.5 rounded-lg bg-stone-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1"
  }, "Vasalat"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-700"
  }, "P\xE1ntok, fi\xF3kcs\xFAsz\xF3k"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-700"
  }, "\xC9lz\xE1r\xF3, csavar"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-1"
  }, "Blum / Hettich")), /*#__PURE__*/React.createElement("div", {
    className: "p-2.5 rounded-lg bg-stone-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1"
  }, "Megmunk\xE1l\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-700"
  }, "Szab\xE1s, \xE9lz\xE1r\xE1s, CNC"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 font-mono mt-1"
  }, "\u2248 ", hours.toFixed(1), " \xF3ra"))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-2.5"
  }, "A r\xE9szletes anyaglista (BOM) a Tervez\xE9s \u2192 Term\xE9k-\xF6ssze\xE1ll\xEDt\xE1s modulban v\xE9gleges\xEDthet\u0151."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Card, {
    className: "p-4 lg:sticky lg:top-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-3"
  }, "Becsl\xE9s pontoss\xE1ga"), /*#__PURE__*/React.createElement("div", {
    className: "text-[30px] font-semibold text-violet-700 tabular-nums leading-none"
  }, "\xB1", Math.round(est.band * 100), "%"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mt-1"
  }, "a becs\xFClt egys\xE9g\xE1rhoz k\xE9pest"), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 h-2 rounded-full bg-stone-100 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-violet-500 transition-all",
    style: {
      width: `${dwClamp((0.25 - est.band) / 0.22 * 100, 6, 100)}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[9.5px] text-stone-400 mt-1"
  }, /*#__PURE__*/React.createElement("span", null, "durva"), /*#__PURE__*/React.createElement("span", null, "pontos")), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-3 border-t border-stone-100 space-y-1.5 text-[11px]"
  }, DW_PHASES.map(ph => {
    const on = ph.locked || phases[ph.k];
    return /*#__PURE__*/React.createElement("div", {
      key: ph.k,
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: on ? "check" : "x",
      size: 12,
      className: on ? "text-violet-600" : "text-stone-300"
    }), /*#__PURE__*/React.createElement("span", {
      className: on ? "text-stone-700" : "text-stone-400"
    }, ph.l));
  })))));
}

// ── Step 4 — Ár & összegzés ─────────────────────────────────────────────────
function StepPrice({
  derivedName,
  name,
  setName,
  unitPrice,
  setPriceOverride,
  estUnit,
  qty,
  setNeeds,
  vat,
  setVat,
  net,
  lo,
  hi,
  band,
  category,
  baseRef,
  needs,
  style,
  phases,
  sourcing,
  elemCategory,
  saveCat,
  setSaveCat
}) {
  const vatAmt = net * (vat / 100);
  const srcMeta = DW_SOURCING.find(x => x.k === sourcing) || DW_SOURCING[0];
  const incl = ["Igényfelmérés", "Stílustervezés", ...(phases.layout ? ["Elrendezés"] : []), ...(phases.technical ? ["Műszaki"] : []), ...(phases.manufacturing ? ["Gyártás"] : [])];
  return /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-1.5"
  }, "T\xE9tel megnevez\xE9se"), /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: derivedName,
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-violet-400"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1.5"
  }, "Megjelenik: ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-600"
  }, derivedName))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900"
  }, "Becs\xFClt egys\xE9g\xE1r"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium"
  }, "\xB1", Math.round(band * 100), "% s\xE1v")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: unitPrice,
    step: 1000,
    onChange: e => setPriceOverride(Math.max(0, Number(e.target.value) || 0)),
    className: "flex-1 h-12 px-3 rounded-lg border border-stone-200 text-[18px] font-semibold font-mono tabular-nums outline-none focus:border-violet-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-400"
  }, "Ft / db")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mt-2 text-[11px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 font-mono"
  }, "S\xE1v: ", dwHuf(lo), " \u2013 ", dwHuf(hi)), unitPrice !== estUnit && /*#__PURE__*/React.createElement("button", {
    onClick: () => setPriceOverride(null),
    className: "text-violet-700 font-medium hover:underline"
  }, "Vissza a becsl\xE9sre")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 h-2 rounded-full bg-stone-100 relative overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-y-0 bg-violet-200",
    style: {
      left: "10%",
      right: "10%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-violet-600",
    style: {
      left: "calc(50% - 4px)"
    }
  }))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "Darabsz\xE1m"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setNeeds(n => ({
      ...n,
      qty: Math.max(1, n.qty - 1)
    })),
    className: "w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "minus",
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    className: "flex-1 h-9 grid place-items-center rounded-lg border border-stone-200 text-[14px] font-semibold font-mono"
  }, qty), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNeeds(n => ({
      ...n,
      qty: n.qty + 1
    })),
    className: "w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "\xC1FA-kulcs"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, [0, 5, 18, 27].map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setVat(v),
    className: `flex-1 h-9 rounded-lg text-[11.5px] font-medium border ${vat === v ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-stone-200 text-stone-600"}`
  }, v, "%")))))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSaveCat(!saveCat),
    role: "switch",
    "aria-checked": saveCat,
    className: `w-full p-3.5 rounded-xl border-2 text-left flex items-center gap-3 transition ${saveCat ? "border-violet-500 bg-violet-50/50" : "border-stone-200 bg-white hover:border-stone-300"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-9 h-9 rounded-lg grid place-items-center shrink-0 ${saveCat ? "bg-violet-600 text-white" : "bg-stone-100 text-stone-400"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "box",
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block text-[12.5px] font-semibold text-stone-900"
  }, "Ment\xE9s a katal\xF3gusba"), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-stone-500 leading-snug"
  }, "A tervezett b\xFAtor felker\xFCl a term\xE9kkatal\xF3gusba, \xE9s a j\xF6v\u0151ben kiindul\xE1sk\xE9nt v\xE1laszthat\xF3.")), /*#__PURE__*/React.createElement("span", {
    className: `shrink-0 w-10 h-6 rounded-full transition relative ${saveCat ? "bg-violet-600" : "bg-stone-200"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${saveCat ? "left-[18px]" : "left-0.5"}`
  })))), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden h-fit"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-100 bg-stone-50/60"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, derivedName), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mt-0.5"
  }, category === "katalogus" ? `Katalógus alapú${baseRef ? " · " + baseRef.name : ""}` : "Egyedi tervezés"), /*#__PURE__*/React.createElement("span", {
    className: `mt-1.5 inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${sourcing === "own" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: srcMeta.icon,
    size: 11
  }), srcMeta.l)), /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-2.5 text-[12px]"
  }, /*#__PURE__*/React.createElement(Row, {
    k: "Gy\xE1rt\xE1sm\xF3d",
    v: srcMeta.l
  }), sourcing === "outsourced" && elemCategory && /*#__PURE__*/React.createElement(Row, {
    k: "Elem-kateg\xF3ria",
    v: elemCategory
  }), /*#__PURE__*/React.createElement(Row, {
    k: "Helyis\xE9g",
    v: needs.room
  }), /*#__PURE__*/React.createElement(Row, {
    k: "M\xE9ret",
    v: `${needs.w} × ${needs.h} × ${needs.d} mm`,
    mono: true
  }), /*#__PURE__*/React.createElement(Row, {
    k: "Korpusz",
    v: dwMatName(style.corpus)
  }), /*#__PURE__*/React.createElement(Row, {
    k: "Front",
    v: dwMatName(style.front)
  }), /*#__PURE__*/React.createElement(Row, {
    k: "St\xEDlus",
    v: DW_STYLES.find(s => s.k === style.dir)?.l
  }), /*#__PURE__*/React.createElement("div", {
    className: "pt-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "Tervezett f\xE1zisok"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, incl.map(p => /*#__PURE__*/React.createElement("span", {
    key: p,
    className: "px-2 h-6 inline-flex items-center rounded-full bg-violet-50 text-violet-700 text-[10.5px] font-medium border border-violet-100"
  }, p))))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-t border-stone-200 bg-stone-50/70 space-y-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", null, "Egys\xE9g\xE1r \xD7 ", qty), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, dwHuf(net))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", null, "\xC1FA (", vat, "%)"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, dwHuf(vatAmt))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[15px] font-semibold text-stone-900"
  }, /*#__PURE__*/React.createElement("span", null, "Brutt\xF3"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, dwHuf(net + vatAmt))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 pt-0.5"
  }, "Becs\xFClt \xE9rt\xE9k \u2014 \xB1", Math.round(band * 100), "% pontoss\xE1g a tervezetts\xE9g alapj\xE1n."))));
}
function Row({
  k,
  v,
  mono
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline justify-between gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 shrink-0"
  }, k), /*#__PURE__*/React.createElement("span", {
    className: `font-medium text-stone-900 text-right truncate ${mono ? "font-mono" : ""}`
  }, v));
}
Object.assign(window, {
  DesignItemWizard
});
})();
