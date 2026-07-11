/* AUTO-GENERATED from page-mfg-prep.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-mfg-prep.jsx — Gyártás → „Előkészítés"
//
//   A gyártás-előkészítés felülete. A megrendelt / gyártási projektből a
//   window.MfgPrep motor levezeti a szükségleteket; ez a felület mutatja és
//   teszi műveletekké:
//     • Anyag      — lapanyag m² → táblaszám, készlet-fedezet
//     • Szabászat  — rész-szintű vágólista + egyszerű nesting-előnézet
//     • Vasalat    — db × márka-ár a katalógusból
//     • Munkaidő   — RÉSZLEGENKÉNT a termelékenységi normából (óra + nap)
//     • Bérmunka   — folyamat-elem (szabászat/élzárás/festés/CNC) kiadása
//                    partnernek → B2BHandshake (delegateEpic)
//
//   Belépő: a Gyártás világ „Előkészítés" menüje (lista), ill. a Gyártási
//   projekt kártyájáról. Rendelésből is nyitható (pszeudo-projekt).
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStatePrep
} = React;
const PREP_HUF = n => Math.round(n || 0).toLocaleString("hu-HU") + " Ft";
const PREP_HUFk = n => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : Math.round((n || 0) / 1000) + "k") + " Ft";

// Részleg-akcent → Tailwind (literál osztálynevek)
const DEPT_BAR = {
  teal: "bg-teal-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  stone: "bg-stone-500"
};
const DEPT_SOFT = {
  teal: "bg-teal-50 text-teal-700",
  sky: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  stone: "bg-stone-100 text-stone-700"
};
const HS_PREP_TONE = {
  sent: {
    l: "Kiadva — visszajelzésre vár",
    bg: "bg-sky-50",
    fg: "text-sky-700",
    dot: "bg-sky-500"
  },
  external: {
    l: "Külső partner (kézi)",
    bg: "bg-stone-100",
    fg: "text-stone-600",
    dot: "bg-stone-400"
  },
  accepted: {
    l: "Elfogadva — folyamatban",
    bg: "bg-indigo-50",
    fg: "text-indigo-700",
    dot: "bg-indigo-500"
  },
  declined: {
    l: "Visszautasítva",
    bg: "bg-rose-50",
    fg: "text-rose-700",
    dot: "bg-rose-500"
  },
  done: {
    l: "Kész — ellenőrzésre",
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    dot: "bg-emerald-500"
  }
};

// ════════════════════════════════════════════════════════════════════════════
//  LISTA — előkészítésre váró projektek + kiadott rendelések
// ════════════════════════════════════════════════════════════════════════════
function MfgPrepPage() {
  const s = useSim();
  const [open, setOpen] = useStatePrep(null); // { kind:"project"|"order", id }

  const projects = (s.projects || []).filter(p => p.kind === "manufacturing");
  const orders = (s.orders || []).filter(o => o.status === "released");
  const openProject = open && open.kind === "project" ? projects.find(p => p.id === open.id) : null;
  const openOrder = open && open.kind === "order" ? orders.find(o => o.id === open.id) : null;
  const pseudo = openOrder ? orderToPseudo(openOrder) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-end justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[18px] md:text-[20px] font-semibold text-stone-900 tracking-tight"
  }, "Gy\xE1rt\xE1s-el\u0151k\xE9sz\xEDt\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500"
  }, "A megrendelt t\xE9telekb\u0151l levezetett anyag-, szab\xE1szat-, vasalat- \xE9s munkaid\u0151-sz\xFCks\xE9glet \u2014 b\xE9rmunka-kiad\xE1ssal.")), /*#__PURE__*/React.createElement("span", {
    className: "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-teal-50 text-teal-700 text-[12px] font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cpu",
    size: 13
  }), projects.length, " projekt")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Gy\xE1rt\xE1si projektek"), projects.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-11 h-11 mx-auto rounded-xl bg-teal-50 grid place-items-center text-teal-600 mb-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "factory",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[13.5px] font-semibold text-stone-700"
  }, "M\xE9g nincs gy\xE1rt\xE1si alprojekt"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500 mt-1 max-w-md mx-auto"
  }, "Egy megrendelt projekt n\xE9zet\xE9b\u0151l a \u201ESaj\xE1t gy\xE1rt\xE1s alprojekt\" gombbal hozhatsz l\xE9tre egyet \u2014 ut\xE1na itt k\xE9sz\xEDthet\u0151 el\u0151 a gy\xE1rt\xE1s.")) : /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-3 mb-6"
  }, projects.map(p => /*#__PURE__*/React.createElement(PrepListCard, {
    key: p.id,
    project: p,
    onOpen: () => setOpen({
      kind: "project",
      id: p.id
    })
  }))), orders.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Kiadott rendel\xE9sek"), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-3"
  }, orders.map(o => /*#__PURE__*/React.createElement(PrepOrderCard, {
    key: o.id,
    order: o,
    onOpen: () => setOpen({
      kind: "order",
      id: o.id
    })
  })))), openProject && /*#__PURE__*/React.createElement(MfgPrepWorkspace, {
    project: openProject,
    onClose: () => setOpen(null)
  }), pseudo && /*#__PURE__*/React.createElement(MfgPrepWorkspace, {
    project: pseudo,
    isOrder: true,
    onClose: () => setOpen(null)
  }));
}
function ppInferElemCat(text) {
  const t = (text || "").toLowerCase();
  if (/ajt[óo]|door|front/.test(t)) return "Ajtó / front";
  if (/pult|munkalap/.test(t)) return "Pult / munkalap";
  if (/falpanel|burkolat|panel/.test(t)) return "Falpanel / burkolat";
  return null; // → szekrény default (lapanyag)
}
function orderToPseudo(o) {
  const items = o.lines && o.lines.length ? o.lines.map((l, i) => ({
    id: o.id + "-i" + i,
    name: l.name || l.description || "Tétel " + (i + 1),
    value: (l.price || l.unitPrice || 0) * (l.qty || l.quantity || 1),
    elemCategory: ppInferElemCat((l.name || l.description || "") + " " + (o.customer || "")),
    config: l.config || null
  })) : [{
    id: o.id + "-i0",
    name: (o.customer || "Rendelés") + " — tételei",
    value: o.total || 0,
    elemCategory: ppInferElemCat((o.customer || "") + " " + (o.type || ""))
  }];
  return {
    id: o.id,
    name: (o.customer || "Rendelés") + " — " + o.id,
    customer: o.customer,
    items,
    milestones: [],
    _order: true
  };
}
function PrepListCard({
  project: p,
  onOpen
}) {
  const total = (p.items || []).reduce((n, i) => n + (i.value || 0), 0);
  const prep = p.prep && p.prep.generated;
  const released = p.prepRelease;
  const tone = released ? {
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    dot: "bg-emerald-500",
    l: "Kiadva a műhelynek"
  } : prep ? window.MFG_PREP_TONE.generated : window.MFG_PREP_TONE.pending;
  return /*#__PURE__*/React.createElement("button", {
    onClick: onOpen,
    className: "text-left bg-white rounded-2xl border border-stone-200 p-4 hover:shadow-md hover:border-teal-300 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 leading-tight truncate"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-0.5 truncate"
  }, p.customer, p.parentName ? " · " + p.parentName : "")), /*#__PURE__*/React.createElement("span", {
    className: `shrink-0 inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${tone.bg} ${tone.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
  }), tone.l)), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, (p.items || []).length, " t\xE9tel"), prep ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-2 text-stone-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, p.prep.sheets || 0, " t\xE1bla"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, "~", p.prep.leadDays || 0, " nap")) : /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800 tabular-nums"
  }, PREP_HUFk(total))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-teal-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cpu",
    size: 14
  }), released ? "Kiadás megnyitása" : prep ? "Előkészítés megnyitása" : "Előkészítés", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  })));
}
function PrepOrderCard({
  order: o,
  onOpen
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onOpen,
    className: "text-left bg-white rounded-2xl border border-stone-200 p-4 hover:shadow-md hover:border-teal-300 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13.5px] font-semibold text-stone-900 leading-tight truncate font-mono"
  }, o.id), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-0.5 truncate"
  }, o.customer)), /*#__PURE__*/React.createElement("span", {
    className: "shrink-0 inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium bg-teal-50 text-teal-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-teal-500"
  }), "Gy\xE1rt\xE1sban")), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, o.items || (o.lines ? o.lines.length : 1), " t\xE9tel"), o.prepRelease ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-emerald-500"
  }), "Kiadva (", o.prepRelease.count, ") ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  })) : /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 text-[12px] font-medium text-teal-700"
  }, "El\u0151k\xE9sz\xEDt\xE9s ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  }))));
}

// ════════════════════════════════════════════════════════════════════════════
//  MUNKALAP — teljes képernyős előkészítő
// ════════════════════════════════════════════════════════════════════════════
function MfgPrepWorkspace({
  project,
  isOrder,
  onClose
}) {
  const s = useSim();
  // live projekt (kézfogás/epik frissülhet)
  const live = isOrder ? project : (s.projects || []).find(p => p.id === project.id) || project;
  const [tab, setTab] = useStatePrep("routing");
  const [plan, setPlan] = useStatePrep(null);
  const prep = React.useMemo(() => window.MfgPrep.derive(live), [live, s]);
  const generated = !isOrder && live.prep && live.prep.generated;
  const liveOrder = isOrder ? (s.orders || []).find(o => o.id === project.id) || null : null;
  const released = (isOrder ? liveOrder && liveOrder.prepRelease : live.prepRelease) || null;
  const source = isOrder ? {
    kind: "order",
    id: live.id,
    name: live.name,
    customer: live.customer,
    owner: null,
    orderRef: live.id,
    docLink: {
      type: "order",
      id: live.id
    }
  } : {
    kind: "project",
    id: live.id,
    name: live.name,
    customer: live.customer,
    owner: live.owner || live.projectOwner || null,
    orderRef: live.orderRef || live.id,
    docLink: {
      type: "project",
      id: live.id
    }
  };

  // útvonal-terv + alapértelmezett dokumentumok (kiadott rajzok) — csak az id váltásakor
  React.useEffect(() => {
    const steps = window.MfgPrep.routingPlan && window.MfgPrep.routingPlan(live) || [];
    const link = isOrder ? {
      type: "order",
      id: live.id
    } : {
      type: "project",
      id: live.id
    };
    const docs = (s.docsFor ? s.docsFor(link.type, link.id) : []).filter(d => d.type === "rajz");
    const dids = docs.filter(d => {
      const r = window.DocsEngine && window.DocsEngine.runtimeVersion(d);
      return r && r.clear;
    }).map(d => d.id);
    // baseSeq/baseMachineId = a technológiai ALAP-sorrend és -gép pillanatképe —
    // ehhez képest naplózódik a folyamat-eltérés (átrendezés / alternatív gép)
    setPlan({
      steps: steps.map((st, i) => ({
        ...st,
        baseSeq: i + 1,
        baseMachineId: st.machineId
      })),
      docIds: dids,
      docNotes: {},
      note: "",
      deviations: []
    });
  }, [live.id]);
  if (!prep) return null;
  const tabs = [{
    key: "routing",
    label: "Útvonal",
    icon: "route"
  }, {
    key: "flow",
    label: "Folyamatábra",
    icon: "workflow"
  }, {
    key: "material",
    label: "Anyag",
    icon: "box"
  }, {
    key: "cutting",
    label: "Szabászat",
    icon: "cut"
  }, {
    key: "hardware",
    label: "Vasalat",
    icon: "bolt"
  }, {
    key: "aux",
    label: "Segédanyag",
    icon: "drop"
  }, {
    key: "labor",
    label: "Munkaidő",
    icon: "workflow"
  }, {
    key: "calc",
    label: "Kalkuláció",
    icon: "receipt"
  }, {
    key: "docs",
    label: "Dokumentum",
    icon: "folder"
  }, {
    key: "outsource",
    label: "Bérmunka",
    icon: "external"
  }, {
    key: "release",
    label: "Kiadás",
    icon: "check"
  }];
  const chips = [{
    l: "Tétel",
    v: prep.items.length
  }, {
    l: "Tábla",
    v: prep.totals.sheets
  }, {
    l: "Alkatrész",
    v: prep.qty.parts
  }, {
    l: "Munkaóra",
    v: prep.labor.totalHours
  }, {
    l: "Átfutás",
    v: "~" + prep.totals.leadDays + " nap"
  }, {
    l: "Becsült ktsg.",
    v: PREP_HUFk(prep.totals.grand)
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 bg-stone-50 flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 bg-white border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-6 py-3 flex items-start gap-3 max-w-[1280px] mx-auto w-full"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "shrink-0 w-9 h-9 grid place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 mt-0.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 16,
    className: "rotate-180"
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] md:text-[17px] font-semibold text-stone-900 leading-tight truncate"
  }, live.name), isOrder && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-medium"
  }, "rendel\xE9s"), released && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-emerald-500"
  }), "Kiadva a m\u0171helynek")), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500 mt-0.5"
  }, live.customer)), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.generatePrep && !isOrder && window.sim.generatePrep(live.id),
    disabled: isOrder,
    className: `shrink-0 h-9 px-3.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 ${isOrder ? "bg-stone-100 text-stone-400 cursor-not-allowed" : "bg-teal-600 text-white hover:bg-teal-700"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cpu",
    size: 14
  }), generated ? "Újragenerálás" : "Generálás")), /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-6 pb-3 max-w-[1280px] mx-auto w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 md:grid-cols-6 gap-2"
  }, chips.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.l,
    className: "bg-stone-50 border border-stone-200/70 rounded-lg px-2.5 py-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] uppercase tracking-wide text-stone-500"
  }, c.l), /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] md:text-[15px] font-semibold tabular-nums text-stone-900 leading-tight"
  }, c.v))))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-6 max-w-[1280px] mx-auto w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 overflow-x-auto -mb-px"
  }, tabs.map(tb => {
    const on = tab === tb.key;
    return /*#__PURE__*/React.createElement("button", {
      key: tb.key,
      onClick: () => setTab(tb.key),
      className: `shrink-0 inline-flex items-center gap-1.5 px-3 h-10 text-[12.5px] font-medium border-b-2 transition ${on ? "border-teal-600 text-teal-700" : "border-transparent text-stone-500 hover:text-stone-700"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: tb.icon,
      size: 14
    }), tb.label);
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-auto",
    style: {
      paddingBottom: "env(safe-area-inset-bottom)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-6 py-4 md:py-5 max-w-[1280px] mx-auto w-full"
  }, tab === "routing" && window.PrepRouting && /*#__PURE__*/React.createElement(window.PrepRouting, {
    source: source,
    plan: plan,
    setPlan: setPlan,
    released: released
  }), tab === "flow" && window.PrepFlowMatrix && /*#__PURE__*/React.createElement(window.PrepFlowMatrix, {
    project: live
  }), tab === "material" && /*#__PURE__*/React.createElement(PrepMaterials, {
    prep: prep
  }), tab === "cutting" && /*#__PURE__*/React.createElement(PrepCutting, {
    prep: prep
  }), tab === "hardware" && /*#__PURE__*/React.createElement(PrepHardware, {
    prep: prep
  }), tab === "aux" && /*#__PURE__*/React.createElement(PrepAux, {
    prep: prep
  }), tab === "labor" && /*#__PURE__*/React.createElement(PrepLabor, {
    prep: prep
  }), tab === "calc" && /*#__PURE__*/React.createElement(PrepCalc, {
    prep: prep
  }), tab === "docs" && window.PrepDocs && /*#__PURE__*/React.createElement(window.PrepDocs, {
    source: source,
    plan: plan,
    setPlan: setPlan,
    released: released
  }), tab === "outsource" && /*#__PURE__*/React.createElement(PrepOutsource, {
    project: live,
    prep: prep,
    isOrder: isOrder
  }), tab === "release" && window.PrepRelease && /*#__PURE__*/React.createElement(window.PrepRelease, {
    source: source,
    plan: plan,
    setPlan: setPlan,
    project: live,
    released: released
  }))));
}

// ── Anyag ───────────────────────────────────────────────────────────────────
//   ANYAGTÍPUS-VEZÉRELT: lapanyag m²/tábla (10–15% hulladék) külön a tömörfától,
//   amely m³ + FAFAJ-FÜGGŐ hulladékszázalék (tölgy 150%, bükk 130%…) szerint
//   normázódik. (woodwork_domain.md §0/§4/§5)
function CoverPill({
  cover
}) {
  const cov = window.MFG_COVER_TONE[cover] || window.MFG_COVER_TONE.partial;
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${cov.bg} ${cov.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${cov.dot}`
  }), cov.l);
}
function PrepMaterials({
  prep
}) {
  const sheet = prep.materials.filter(m => m.kind !== "solidwood");
  const solid = prep.materials.filter(m => m.kind === "solidwood");
  const sheetCost = sheet.reduce((s, m) => s + m.cost, 0);
  const solidCost = solid.reduce((s, m) => s + m.cost, 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    icon: "box",
    title: "Anyagsz\xFCks\xE9glet \u2014 anyagt\xEDpus szerint",
    sub: "Az alapanyag t\xEDpusa vez\xE9rli a norm\xE1t: a lapanyag m\xB2 \u2192 t\xE1blasz\xE1m (10\u201315% szab\xE1szati hullad\xE9k, 2800\xD72070 mm / 82% hasznos\xEDt\xE1s); a t\xF6m\xF6rfa m\xB3 (ter\xFClet \xD7 vastags\xE1g) + fafaj-f\xFCgg\u0151 hullad\xE9ksz\xE1zal\xE9k (t\xF6lgy 150%, b\xFCkk 130%\u2026) \u2014 a >100% norm\xE1lis, a bemen\u0151 f\u0171r\xE9sz\xE1ru t\xF6bb a nett\xF3n\xE1l."
  }), sheet.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-teal-50 text-teal-700 text-[11px] font-semibold"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "box",
    size: 12
  }), "Lapanyag"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, "m\xB2 \u2192 t\xE1bla \xB7 ", window.WW_SHEET_WASTE_PCT, "% hullad\xE9k")), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:block bg-white rounded-xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[minmax(0,1fr)_84px_70px_70px_84px_100px_104px] gap-3 px-4 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50"
  }, /*#__PURE__*/React.createElement("div", null, "Anyag"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Nett\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Hull.%"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "T\xE1bla"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "K\xE9szlet"), /*#__PURE__*/React.createElement("div", null, "Fedezet"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "\xC9rt\xE9k")), sheet.map(x => /*#__PURE__*/React.createElement("div", {
    key: x.code,
    className: "grid grid-cols-[minmax(0,1fr)_84px_70px_70px_84px_100px_104px] gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0 items-center text-[12.5px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-medium text-stone-900 truncate"
  }, x.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] font-mono text-stone-400"
  }, x.code)), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums text-stone-700"
  }, x.area, " m\xB2"), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums text-stone-400"
  }, "+", x.wastePct, "%"), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums font-semibold text-stone-900"
  }, x.sheets), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums text-stone-500"
  }, x.onHand == null ? "—" : x.onHand), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(CoverPill, {
    cover: x.cover
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums text-stone-700"
  }, PREP_HUF(x.cost))))), /*#__PURE__*/React.createElement("div", {
    className: "md:hidden space-y-2"
  }, sheet.map(x => /*#__PURE__*/React.createElement("div", {
    key: x.code,
    className: "bg-white rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-medium text-stone-900 truncate"
  }, x.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] font-mono text-stone-400"
  }, x.code)), /*#__PURE__*/React.createElement(CoverPill, {
    cover: x.cover
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 grid grid-cols-4 gap-2 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-400 text-[10px]"
  }, "Nett\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "tabular-nums text-stone-700"
  }, x.area, " m\xB2")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-400 text-[10px]"
  }, "Hull.%"), /*#__PURE__*/React.createElement("div", {
    className: "tabular-nums text-stone-500"
  }, "+", x.wastePct, "%")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-400 text-[10px]"
  }, "T\xE1bla"), /*#__PURE__*/React.createElement("div", {
    className: "tabular-nums font-semibold text-stone-900"
  }, x.sheets)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-400 text-[10px]"
  }, "K\xE9szlet"), /*#__PURE__*/React.createElement("div", {
    className: "tabular-nums text-stone-500"
  }, x.onHand == null ? "—" : x.onHand)))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between bg-teal-50/60 border border-teal-200/60 rounded-xl px-4 py-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-teal-800 font-medium"
  }, "\xD6sszes lapanyag"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4 text-[13px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums text-teal-800"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, prep.totals.sheets), " t\xE1bla"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums font-semibold text-teal-900"
  }, PREP_HUF(sheetCost))))), solid.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 12
  }), "T\xF6m\xF6rfa"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, "m\xB3 (t\xE9rfogat) \xB7 fafaj-f\xFCgg\u0151 hullad\xE9ksz\xE1zal\xE9k")), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:block bg-white rounded-xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[minmax(0,1fr)_104px_80px_84px_94px_94px_100px] gap-3 px-4 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50"
  }, /*#__PURE__*/React.createElement("div", null, "Anyag / fafaj"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Nett\xF3 m\xB3"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Hull.%"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Brutt\xF3 m\xB3"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Vastags\xE1g"), /*#__PURE__*/React.createElement("div", null, "Fedezet"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "\xC9rt\xE9k")), solid.map(x => /*#__PURE__*/React.createElement("div", {
    key: x.code,
    className: "grid grid-cols-[minmax(0,1fr)_104px_80px_84px_94px_94px_100px] gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0 items-center text-[12.5px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-medium text-stone-900 truncate"
  }, x.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-amber-600"
  }, x.species)), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums text-stone-700"
  }, x.netM3), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums text-amber-600 font-medium"
  }, "+", x.wastePct, "%"), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums font-semibold text-stone-900"
  }, x.grossM3), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums text-stone-500"
  }, x.thickness, " mm"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(CoverPill, {
    cover: x.cover
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums text-stone-700"
  }, PREP_HUF(x.cost))))), /*#__PURE__*/React.createElement("div", {
    className: "md:hidden space-y-2"
  }, solid.map(x => /*#__PURE__*/React.createElement("div", {
    key: x.code,
    className: "bg-white rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-medium text-stone-900 truncate"
  }, x.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-amber-600"
  }, x.species, " \xB7 ", x.thickness, " mm")), /*#__PURE__*/React.createElement(CoverPill, {
    cover: x.cover
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 grid grid-cols-3 gap-2 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-400 text-[10px]"
  }, "Nett\xF3 m\xB3"), /*#__PURE__*/React.createElement("div", {
    className: "tabular-nums text-stone-700"
  }, x.netM3)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-400 text-[10px]"
  }, "Hull.%"), /*#__PURE__*/React.createElement("div", {
    className: "tabular-nums text-amber-600"
  }, "+", x.wastePct, "%")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-400 text-[10px]"
  }, "Brutt\xF3 m\xB3"), /*#__PURE__*/React.createElement("div", {
    className: "tabular-nums font-semibold text-stone-900"
  }, x.grossM3)))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between bg-amber-50/70 border border-amber-200/60 rounded-xl px-4 py-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-amber-800 font-medium"
  }, "\xD6sszes t\xF6m\xF6rfa (f\u0171r\xE9sz\xE1ru)"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4 text-[13px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums text-amber-800"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, prep.totals.volumeM3), " m\xB3"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums font-semibold text-amber-900"
  }, PREP_HUF(solidCost))))), sheet.length === 0 && solid.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-[12.5px] text-stone-500"
  }, "Nincs levezethet\u0151 anyagsz\xFCks\xE9glet ezen a munk\xE1n."));
}

// ── Segédanyag (woodwork_domain.md §6 — ragasztó / felület / csiszoló) ────────
function PrepAux({
  prep
}) {
  const aux = prep.aux || {
    glues: [],
    finishes: [],
    abrasive: null
  };
  const fmtG = g => g >= 1000 ? (g / 1000).toFixed(2) + " kg" : g + " g";
  const AuxRow = ({
    a
  }) => /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[minmax(0,1fr)_92px_70px_84px] gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0 items-center text-[12.5px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-medium text-stone-900 truncate"
  }, a.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 truncate"
  }, a.basis || a.note)), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums text-stone-600"
  }, a.rate, " g/m\xB2"), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums text-stone-400"
  }, "+", a.lossPct, "%"), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums font-semibold text-stone-900"
  }, fmtG(a.totalG)));
  const Block = ({
    title,
    icon,
    tone,
    rows,
    total
  }) => rows.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-semibold ${tone}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 12
  }), title)), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[minmax(0,1fr)_92px_70px_84px] gap-3 px-4 py-2 text-[10px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50"
  }, /*#__PURE__*/React.createElement("div", null, "Seg\xE9danyag / alap"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Fajlagos"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Veszt."), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "\xD6sszes")), rows.map((a, i) => /*#__PURE__*/React.createElement(AuxRow, {
    key: i,
    a: a
  })), total != null && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-4 py-2 bg-stone-50/50 text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, "\xD6sszesen"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums font-semibold text-stone-900"
  }, fmtG(total)))));
  const empty = aux.glues.length === 0 && aux.finishes.length === 0 && !aux.abrasive;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    icon: "drop",
    title: "Seg\xE9danyagnorma \u2014 ragaszt\xF3 / fel\xFClet / csiszol\xF3",
    sub: "A kezelend\u0151 / ragasztand\xF3 fel\xFClet \xD7 fajlagos felhord\xE1s (g/m\xB2) + 10% vesztes\xE9g. A fel\xFCletkezel\u0151 2. r\xE9tege kisebb felhord\xE1s\xFA (kevesebb anyag tapad meg); a t\xF6m\xF6rfa fel\xFClete k\xE9t oldalon kezelt. A lamin\xE1lt lapanyag fel\xFClete k\xE9sz \u2014 nem kap fel\xFCletkezel\u0151t."
  }), /*#__PURE__*/React.createElement(Block, {
    title: "Ragaszt\xF3",
    icon: "layers",
    tone: "bg-sky-50 text-sky-700",
    rows: aux.glues,
    total: aux.glues.length ? aux.totalGlueG : null
  }), /*#__PURE__*/React.createElement(Block, {
    title: "Fel\xFCletkezel\u0151",
    icon: "drop",
    tone: "bg-lime-50 text-lime-700",
    rows: aux.finishes,
    total: aux.finishes.length ? aux.totalFinishG : null
  }), aux.abrasive && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-stone-100 text-stone-700 text-[11px] font-semibold"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkle",
    size: 12
  }), "Csiszol\xF3anyag")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mb-2"
  }, aux.abrasive.note), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, (aux.abrasive.grits || []).map(g => /*#__PURE__*/React.createElement("span", {
    key: g,
    className: "inline-flex items-center h-7 px-3 rounded-lg bg-stone-100 text-stone-700 text-[12px] font-mono font-medium"
  }, g))))), empty ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-[12.5px] text-stone-500"
  }, "Nincs levezethet\u0151 seg\xE9danyag \u2014 nincs \xE9lz\xE1r\xE1s, t\xE1bl\xE1s\xEDt\xE1s vagy fel\xFCletkezelt (t\xF6m\xF6rfa) fel\xFClet ezen a munk\xE1n.") : /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5 bg-stone-50 border border-stone-200/70 rounded-xl px-4 py-3 text-[11.5px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "route",
    size: 15,
    className: "mt-0.5 shrink-0 text-stone-400"
  }), /*#__PURE__*/React.createElement("div", null, "A szerkezeti k\xF6t\u0151elem-ragaszt\xE1s (k\xF6ld\xF6kcsap, domin\xF3) a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Vasalat / szerelv\xE9ny"), " t\xE9telekn\xE9l jelenik meg. Ez a kimutat\xE1s a fel\xFClet-alap\xFA seg\xE9danyagot (\xE9lz\xE1r\xF3, t\xE1bl\xE1s\xEDt\xF3, fel\xFCletkezel\u0151, csiszol\xF3) norm\xE1zza \u2014 a faipari dokument\xE1ci\xF3 5. r\xE9sze.")));
}

// ── Szabászat ─────────────────────────────────────────────────────────────────
// Üzemi beállítás-presetek — localStorage (projektfüggetlen, behívható másik munkán).
const PREP_PRESET_LS = "jt_prep_presets";
function prepLoadPresets() {
  try {
    return JSON.parse(localStorage.getItem(PREP_PRESET_LS) || "[]");
  } catch (e) {
    return [];
  }
}
function prepSavePresets(list) {
  try {
    localStorage.setItem(PREP_PRESET_LS, JSON.stringify(list));
  } catch (e) {}
}
const CUT_MARK_TONE = {
  amber: "bg-amber-50 text-amber-700",
  violet: "bg-violet-50 text-violet-700",
  teal: "bg-teal-50 text-teal-700",
  stone: "bg-stone-100 text-stone-600",
  sky: "bg-sky-50 text-sky-700",
  rose: "bg-rose-50 text-rose-700"
};
function PrepCutting({
  prep
}) {
  const A = window.WW_CUT_ALLOW || {};
  const stations = window.PROD_STATIONS || [];
  const sawMachines = window.wwMachinesByKind ? window.wwMachinesByKind("szabaszat") : stations.filter(s => s.kind === "szabaszat");
  const edgeMachines = window.wwMachinesByKind ? window.wwMachinesByKind("elzaras") : stations.filter(s => s.kind === "elzaras");
  const [mode, setMode] = useStatePrep("nesting");
  const [miterAllow, setMiterAllow] = useStatePrep(A.miterPerCut != null ? A.miterPerCut : 5);
  const [sawId, setSawId] = useStatePrep(sawMachines[0] ? sawMachines[0].id : "");
  const [edgeId, setEdgeId] = useStatePrep(edgeMachines[0] ? edgeMachines[0].id : "");
  const [presets, setPresets] = useStatePrep(() => prepLoadPresets());
  const sawLim = window.wwMachineLimit ? window.wwMachineLimit(sawId) : {};
  const edgeLim = window.wwMachineLimit ? window.wwMachineLimit(edgeId) : {};
  const edgeMin = edgeLim.minPartW != null ? edgeLim.minPartW : A.edgeMinW || 60;
  const cut = prep.cutlist;
  const rows = cut.map(p => {
    // a gér/szög az alkatrész MŰSZAKI SPECIFIKÁCIÓJÁBÓL jön (part.miterShort/Long);
    // az előkészítés a ráhagyás mértékét + a gép-választást (min/max) állítja
    const miter = {
      miterShort: p.miterShort || 0,
      miterLong: p.miterLong || 0,
      miterPerCut: miterAllow
    };
    return {
      ...p,
      cs: window.wwCutSize ? window.wwCutSize(p, {
        mode,
        edgeMinW: edgeMin,
        maxW: sawLim.maxW,
        maxH: sawLim.maxH,
        ...miter
      }) : null
    };
  });
  const vvGroups = window.wwVVGroups ? window.wwVVGroups(cut, {
    edgeMinW: edgeMin
  }) : [];
  const overCount = rows.filter(r => r.cs && r.cs.marks.some(m => m.key === "MÉRET!")).length;
  const applyPreset = p => {
    if (!p) return;
    const d = p.data || p;
    if (d.mode) setMode(d.mode);
    if (d.miterAllow != null) setMiterAllow(d.miterAllow);
    if (d.sawId) setSawId(d.sawId);
    if (d.edgeId) setEdgeId(d.edgeId);
    window.toast && window.toast(`✓ Beállítás betöltve: ${p.name}`, "success");
  };
  const saveNewPreset = () => {
    const name = (prompt("Üzemi beállítás neve:") || "").trim();
    if (!name) return;
    const np = {
      id: "pp-" + Date.now().toString(36),
      name,
      data: {
        mode,
        miterAllow,
        sawId,
        edgeId
      }
    };
    const list = [...presets, np];
    setPresets(list);
    prepSavePresets(list);
    window.toast && window.toast(`✓ Mentve: ${name}`, "success");
  };
  const deletePreset = id => {
    const list = presets.filter(x => x.id !== id);
    setPresets(list);
    prepSavePresets(list);
  };
  // domináns anyag a nesting-előnézethez
  const byMat = {};
  cut.forEach(p => {
    byMat[p.code] = byMat[p.code] || [];
    byMat[p.code].push(p);
  });
  const domCode = prep.materials[0] ? prep.materials[0].code : Object.keys(byMat)[0];
  const domParts = byMat[domCode] || [];
  const domMat = prep.materials.find(m => m.code === domCode);
  const MarkChips = ({
    marks
  }) => /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1 justify-end"
  }, marks.map(m => /*#__PURE__*/React.createElement("span", {
    key: m.key,
    className: `inline-flex items-center h-5 px-1.5 rounded text-[9.5px] font-semibold ${CUT_MARK_TONE[m.tone] || CUT_MARK_TONE.stone}`
  }, m.key)));
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    icon: "cut",
    title: "Szab\xE1szat \u2014 szab\xE1sjegyz\xE9k (r\xE1hagy\xE1sokkal)",
    sub: "A szab\xE1sm\xE9ret = k\xE9szm\xE9ret + r\xE1hagy\xE1sok: \xE9lz\xE1r\xF3-mar\xF3fej kompenz\xE1ci\xF3 (+0,5/\xE9lz\xE1rt \xE9l), k\xFCl\xF6n CNC-n\xE9l kont\xFAr-r\xE1hagy\xE1s (+1\u20132 k\xF6rben; nesting = 0). Keskeny \xE9lz\xE1rt alkatr\xE9sz \u2192 visszav\xE1g\xE1s (VV). Jel\xF6l\xE9sek: VV, CNC, NEST, g\xE9rv\xE1g\xE1s (GV), dupl\xE1z\xE1s (DUP)."
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-stone-200 p-3.5 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium"
  }, "\xDCzemi be\xE1ll\xEDt\xE1sok"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("select", {
    value: "",
    onChange: e => {
      const p = presets.find(x => x.id === e.target.value);
      applyPreset(p);
    },
    className: "h-8 px-2 rounded-lg border border-stone-200 text-[12px] text-stone-600 bg-white max-w-[180px]"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Be\xE1ll\xEDt\xE1s beh\xEDv\xE1sa\u2026"), presets.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name))), /*#__PURE__*/React.createElement("button", {
    onClick: saveNewPreset,
    className: "h-8 px-2.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium inline-flex items-center gap-1 hover:bg-stone-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), "Ment\xE9s"))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-end gap-x-4 gap-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mb-1"
  }, "Szab\xE1szat m\xF3dja"), /*#__PURE__*/React.createElement("div", {
    className: "inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-50"
  }, [["nesting", "CNC maró"], ["cnc", "Körfűrész / külön CNC"]].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setMode(k),
    className: `h-8 px-3 rounded-md text-[12px] font-medium transition ${mode === k ? "bg-teal-600 text-white shadow-sm" : "text-stone-600 hover:text-stone-900"}`
  }, l)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mb-1"
  }, "Szab\xE1szg\xE9p"), /*#__PURE__*/React.createElement("select", {
    value: sawId,
    onChange: e => setSawId(e.target.value),
    className: "h-8 px-2 rounded-lg border border-stone-200 text-[12px] text-stone-700 bg-white"
  }, sawMachines.map(m => /*#__PURE__*/React.createElement("option", {
    key: m.id,
    value: m.id
  }, m.name))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-0.5 tabular-nums"
  }, "max ", sawLim.maxW || "—", "\xD7", sawLim.maxH || "—", " mm")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mb-1"
  }, "\xC9lz\xE1r\xF3"), /*#__PURE__*/React.createElement("select", {
    value: edgeId,
    onChange: e => setEdgeId(e.target.value),
    className: "h-8 px-2 rounded-lg border border-stone-200 text-[12px] text-stone-700 bg-white"
  }, edgeMachines.map(m => /*#__PURE__*/React.createElement("option", {
    key: m.id,
    value: m.id
  }, m.name))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-0.5 tabular-nums"
  }, "min sz\xE9l. ", edgeMin, " mm \u2192 VV")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mb-1"
  }, "G\xE9r-/sz\xF6g-r\xE1hagy\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    step: "0.5",
    value: miterAllow,
    onChange: e => setMiterAllow(Math.max(0, Number(e.target.value) || 0)),
    className: "w-16 h-8 px-2 rounded-lg border border-stone-200 text-[12px] text-right tabular-nums outline-none focus:border-teal-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 text-[11px]"
  }, "mm/v\xE1g\xE1s")))), presets.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5 pt-1"
  }, presets.map(p => /*#__PURE__*/React.createElement("span", {
    key: p.id,
    className: "inline-flex items-center gap-1 h-6 pl-2.5 pr-1 rounded-full bg-stone-100 text-[11px] text-stone-600"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => applyPreset(p),
    className: "hover:text-stone-900 font-medium"
  }, p.name), /*#__PURE__*/React.createElement("button", {
    onClick: () => deletePreset(p.id),
    title: "T\xF6rl\xE9s",
    className: "w-4 h-4 grid place-items-center rounded-full hover:bg-stone-200 text-stone-400"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 10
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2 text-[11px] text-stone-400 pt-2 border-t border-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 13,
    className: "shrink-0 mt-px text-stone-300"
  }), /*#__PURE__*/React.createElement("span", {
    className: "leading-snug"
  }, "A g\xE9relt / sz\xF6gbe v\xE1gott \xE9l a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-500"
  }, "m\u0171szaki tervez\xE9sb\u0151l"), " \xE9rkezik; a g\xE9p ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-500"
  }, "min./max. m\xE9rete"), " a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-500"
  }, "Karbantart\xE1s \u2192 eszk\xF6z"), " t\xF6rzsb\u0151l j\xF6n (beszerz\xE9skor/tapasztalatb\xF3l r\xF6gz\xEDtett, g\xE9p-szint\u0171 \u2014 nem munk\xE1nk\xE9nt v\xE1ltozik). Itt az ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-500"
  }, "\xFCzemi r\xE1hagy\xE1s"), " \xE9s a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-500"
  }, "g\xE9p-v\xE1laszt\xE1s"), " \xE1ll\xEDthat\xF3; a be\xE1ll\xEDt\xE1s ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-500"
  }, "menthet\u0151 \xE9s beh\xEDvhat\xF3"), ". ", mode === "nesting" ? "CNC maró: szabad forma + szabad csoportosítás, nincs CNC-kontúr ráhagyás." : `Körfűrész / külön CNC: +${A.cncContour} mm kontúr-ráhagyás körben.`))), overCount > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-2.5 text-[12px] text-amber-800 -mt-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 14,
    className: "mt-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, overCount, " alkatr\xE9sz nem f\xE9r a szab\xE1szg\xE9pre"), " (", sawLim.maxW, "\xD7", sawLim.maxH, " mm) \u2014 bont\xE1s, m\xE1sik g\xE9p vagy k\xFCls\u0151 lapszab\xE1sz kell. Jel\xF6l\xE9s: ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono font-semibold"
  }, "M\xC9RET!"))), /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-12 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-7"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[minmax(0,1fr)_94px_104px_56px_96px] gap-2 px-4 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50"
  }, /*#__PURE__*/React.createElement("div", null, "Alkatr\xE9sz"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "K\xE9szm\xE9ret"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Szab\xE1sm\xE9ret"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Db"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Jel\xF6l\xE9s")), /*#__PURE__*/React.createElement("div", {
    className: "max-h-[58vh] overflow-auto"
  }, rows.map((p, i) => {
    const cs = p.cs;
    const grew = cs && (cs.addW > 0 || cs.addH > 0);
    const tip = cs ? cs.adds.map(a => `${a.label}${a.detail ? " (" + a.detail + ")" : ""}: +${a.w}×${a.h} mm`).join("\n") : "";
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_94px_104px_56px_96px] gap-2 px-4 py-2 border-b border-stone-100 last:border-0 items-center text-[12px]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-medium text-stone-800 truncate"
    }, p.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-400 truncate"
    }, p.itemName, " \xB7 ", /*#__PURE__*/React.createElement("span", {
      className: "font-mono"
    }, p.code))), /*#__PURE__*/React.createElement("div", {
      className: "hidden md:block text-right tabular-nums text-stone-500"
    }, p.w, "\xD7", p.h), /*#__PURE__*/React.createElement("div", {
      className: "text-right tabular-nums font-semibold text-stone-900",
      title: tip
    }, cs ? `${cs.cutW}×${cs.cutH}` : `${p.w}×${p.h}`, grew && /*#__PURE__*/React.createElement("span", {
      className: "block text-[9.5px] font-normal text-teal-600"
    }, "+", cs.addW, "\xD7", cs.addH)), /*#__PURE__*/React.createElement("div", {
      className: "hidden md:block text-right tabular-nums font-semibold text-stone-900"
    }, p.qty), /*#__PURE__*/React.createElement("div", {
      className: "hidden md:block"
    }, cs && cs.marks.length > 0 && /*#__PURE__*/React.createElement(MarkChips, {
      marks: cs.marks
    })));
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-4 py-2.5 border-t border-stone-200 bg-stone-50/50 text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-600"
  }, prep.qty.parts, " alkatr\xE9sz \xB7 ", cut.length, " sor"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-600 tabular-nums"
  }, "\xC9lz\xE1r\xE1s: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-900"
  }, prep.qty.edgeM, " fm")))), vvGroups.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 bg-sky-50/60 border border-sky-200/70 rounded-xl px-4 py-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center h-5 px-1.5 rounded text-[9.5px] font-semibold bg-sky-100 text-sky-700"
  }, "VV"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-sky-900"
  }, "Visszav\xE1g\xE1s \u2014 ", vvGroups.length, " cs\xEDk (", vvGroups.reduce((s, g) => s + g.count, 0), " alkatr\xE9sz)")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-sky-800/80 leading-snug mb-2"
  }, "Az \xE9lz\xE1r\xF3 min. sz\xE9less\xE9ge ~", A.edgeMinW, " mm. A keskeny \xE9lz\xE1rt alkatr\xE9szeket azonos hossz szerint 100\u2013150 mm-re \xF6sszerakj\xE1k (\u03A3 sz\xE9less\xE9g + ", A.sawKerf, " mm kerf), egyben \xE9lz\xE1rj\xE1k, majd visszav\xE1gj\xE1k. Etikett: ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, "VV:<m\xE9retek>"), "."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, vvGroups.map((g, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-2.5 bg-white border border-sky-200 rounded-lg px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 text-[13px] font-semibold text-sky-800 tabular-nums w-8 text-center"
  }, g.count, "\xD7"), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-mono text-sky-900 truncate"
  }, g.label), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-sky-700/70"
  }, g.length, " mm hossz\xFA cs\xEDk \xB7 \xF6sszerakott sz\xE9less\xE9g ", g.combinedWidth, " mm")), /*#__PURE__*/React.createElement("span", {
    className: `shrink-0 text-[9.5px] px-1.5 h-5 inline-flex items-center rounded font-semibold ${g.stable ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`
  }, g.stable ? "stabil" : "kiegészítendő")))))), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-5 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "Nesting-el\u0151n\xE9zet"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-500 font-mono"
  }, domMat ? domMat.sheets : 1, " t\xE1bla")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mb-3 truncate"
  }, domMat ? domMat.name : domCode), /*#__PURE__*/React.createElement(NestingPreview, {
    parts: domParts
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-50 border border-stone-200/70 rounded-xl px-4 py-3 text-[11.5px] text-stone-600"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 font-medium text-stone-700 mb-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cut",
    size: 13,
    className: "text-stone-400"
  }), "Form\xE1z\xF3 v\xE1g\xE1s (t\xE1bla-szint\u0171)"), "Minden t\xE1bl\xE1n 1\u20134 \xE9lb\u0151l ", A.boardTrim - 5, "\u2013", A.boardTrim + 5, " mm-t lev\xE1gnak (der\xE9ksz\xF6g, tiszta \xE9l). Mint\xE1s anyagn\xE1l (sz\xE1llfut\xE1s) az elemeket a minta szerint helyezik el \u2014 ilyenkor nem az optimaliz\xE1l\xE1s d\xF6nt, a kihozatal nem c\xE9l."))));
}

// Egyszerű polc-pakolás (shelf packing) a vágólistából — a meglévő nesting stílusban
function NestingPreview({
  parts
}) {
  const sheet = window.MFG_SHEET;
  const SCALE = 0.135;
  const W = sheet.w * SCALE,
    H = sheet.h * SCALE;
  const fills = ["#ccfbf1", "#99f6e4", "#5eead4", "#2dd4bf"];
  // bővített rect-lista (darabszám szerint), terület szerint csökkenő, cap 60
  const rects = [];
  parts.forEach((p, pi) => {
    for (let k = 0; k < p.qty && rects.length < 60; k++) rects.push({
      w: p.w,
      h: p.h,
      label: p.name,
      pi
    });
  });
  rects.sort((a, b) => b.w * b.h - a.w * a.h);
  // shelf packing a táblán (mm), kerf rés
  const kerf = sheet.kerf + 4;
  const placed = [];
  let shelfY = 0,
    shelfH = 0,
    x = 0,
    leftover = 0;
  rects.forEach(r => {
    let w = r.w,
      h = r.h;
    if (w > sheet.w) {
      [w, h] = [h, w];
    } // forgatás ha kell
    if (w > sheet.w) {
      leftover++;
      return;
    }
    if (x + w > sheet.w) {
      shelfY += shelfH + kerf;
      x = 0;
      shelfH = 0;
    }
    if (shelfY + h > sheet.h) {
      leftover++;
      return;
    }
    placed.push({
      x,
      y: shelfY,
      w,
      h,
      label: r.label,
      pi: r.pi
    });
    x += w + kerf;
    shelfH = Math.max(shelfH, h);
  });
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W + 4} ${H + 18}`,
    style: {
      width: "100%",
      height: "auto"
    },
    className: "block"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("pattern", {
    id: "prepGrain",
    x: "0",
    y: "0",
    width: "6",
    height: "6",
    patternUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "6",
    height: "6",
    fill: "#fafaf9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M0 3 Q3 1.5 6 3",
    stroke: "#e7e5e4",
    strokeWidth: ".5",
    fill: "none"
  }))), /*#__PURE__*/React.createElement("g", {
    transform: "translate(2,2)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "0",
    width: W,
    height: H,
    fill: "url(#prepGrain)",
    stroke: "#a8a29e",
    strokeWidth: "1"
  }), placed.map((p, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("rect", {
    x: p.x * SCALE,
    y: p.y * SCALE,
    width: p.w * SCALE,
    height: p.h * SCALE,
    fill: fills[p.pi % fills.length],
    fillOpacity: "0.9",
    stroke: "#0d9488",
    strokeWidth: "0.6"
  }), p.w * SCALE > 26 && p.h * SCALE > 14 && /*#__PURE__*/React.createElement("text", {
    x: p.x * SCALE + p.w * SCALE / 2,
    y: p.y * SCALE + p.h * SCALE / 2 + 3,
    textAnchor: "middle",
    fontSize: "6.5",
    fill: "#134e4a",
    fontFamily: "ui-monospace,monospace"
  }, p.w, "\xD7", p.h))), /*#__PURE__*/React.createElement("text", {
    x: W / 2,
    y: H + 12,
    textAnchor: "middle",
    fontSize: "8",
    fill: "#78716c",
    fontFamily: "ui-monospace,monospace"
  }, sheet.w, " \xD7 ", sheet.h, " mm"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center justify-between text-[10.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", null, placed.length, " alkatr\xE9sz az 1. t\xE1bl\xE1n"), leftover > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "+", leftover, " a tov\xE1bbi t\xE1bl\xE1(ko)n")));
}

// ── Vasalat ───────────────────────────────────────────────────────────────────
function PrepHardware({
  prep
}) {
  const hw = prep.hardware;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    icon: "bolt",
    title: "Vasalat-sz\xFCks\xE9glet",
    sub: "A sablonok vasalat-list\xE1j\xE1b\xF3l, a m\u0171szaki specifik\xE1ci\xF3 m\xE1rk\xE1ja szerinti katal\xF3gus-\xE1rral."
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[minmax(0,1fr)_110px_70px_110px_120px] gap-3 px-4 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50"
  }, /*#__PURE__*/React.createElement("div", null, "Vasalat"), /*#__PURE__*/React.createElement("div", null, "M\xE1rka"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Db"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Egys\xE9g\xE1r"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "\xC9rt\xE9k")), hw.map((h, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_110px_70px_110px_120px] gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0 items-center text-[12.5px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-medium text-stone-900 truncate"
  }, h.name), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:block text-stone-600"
  }, h.brand), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums font-semibold text-stone-900"
  }, h.qty, " ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 text-[10.5px] font-normal"
  }, h.unit)), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:block text-right tabular-nums text-stone-500"
  }, PREP_HUF(h.unitPrice)), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums text-stone-700"
  }, PREP_HUF(h.cost)))), hw.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-8 text-center text-[12.5px] text-stone-400"
  }, "Nincs vasalat-sz\xFCks\xE9glet a sablonokb\xF3l."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-4 py-2.5 border-t border-stone-200 bg-stone-50/50 text-[12.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-600"
  }, hw.reduce((s, h) => s + h.qty, 0), " db \xF6sszesen"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums font-semibold text-stone-900"
  }, PREP_HUF(prep.totals.hardwareCost)))));
}

// ── Munkaidő ──────────────────────────────────────────────────────────────────
function PrepLabor({
  prep
}) {
  const rows = prep.labor.rows;
  const maxH = Math.max(1, ...rows.map(r => r.hours));
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    icon: "workflow",
    title: "Munkaid\u0151 r\xE9szlegenk\xE9nt",
    sub: "A sz\xFCks\xE9glet-mennyis\xE9gb\u0151l a r\xE9szlegek termel\xE9kenys\xE9gi norm\xE1ja szerint (\xF3ra), \xE9s a nett\xF3 napi kapacit\xE1sb\xF3l (kapacit\xE1s \xD7 hat\xE9konys\xE1g) sz\xE1molt \xE1tfut\xE1s."
  }), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, rows.map(r => {
    const soft = DEPT_SOFT[r.color] || DEPT_SOFT.stone;
    const bar = DEPT_BAR[r.color] || DEPT_BAR.stone;
    return /*#__PURE__*/React.createElement("div", {
      key: r.id,
      className: "bg-white rounded-xl border border-stone-200 p-3.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: `shrink-0 w-9 h-9 rounded-lg grid place-items-center ${soft}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: r.icon,
      size: 16
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[13.5px] font-semibold text-stone-900"
    }, r.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] tabular-nums font-semibold text-stone-900"
    }, r.hours, " \xF3 ", /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400 font-normal"
    }, "\xB7 ~", Math.max(1, Math.ceil(r.days)), " nap"))), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 truncate"
    }, (r.machines || []).join(" · ")))), /*#__PURE__*/React.createElement("div", {
      className: "mt-2.5 h-1.5 rounded-full bg-stone-100 overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: `h-full rounded-full ${bar}`,
      style: {
        width: r.hours / maxH * 100 + "%"
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 flex items-center gap-3 text-[10.5px] text-stone-500 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", null, "Kapacit\xE1s ", r.capH, " \xF3/nap"), /*#__PURE__*/React.createElement("span", {
      className: "text-stone-300"
    }, "\xB7"), /*#__PURE__*/React.createElement("span", null, "Hat\xE9konys\xE1g ", Math.round(r.eff * 100), "%"), /*#__PURE__*/React.createElement("span", {
      className: "text-stone-300"
    }, "\xB7"), /*#__PURE__*/React.createElement("span", {
      className: "tabular-nums"
    }, "Munkad\xEDj ", PREP_HUF(r.cost))));
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, [{
    l: "Összes munkaóra",
    v: prep.labor.totalHours + " ó"
  }, {
    l: "Becsült átfutás",
    v: "~" + prep.totals.leadDays + " nap"
  }, {
    l: "Munkadíj",
    v: PREP_HUFk(prep.totals.laborCost)
  }].map(c => /*#__PURE__*/React.createElement("div", {
    key: c.l,
    className: "bg-teal-50/60 border border-teal-200/60 rounded-xl px-3 py-2.5 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-teal-700"
  }, c.l), /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold tabular-nums text-teal-900 mt-0.5"
  }, c.v)))));
}

// ── Árkalkuláció — kétszintű (woodwork_domain.md §10) ─────────────────────────
function PrepCalc({
  prep
}) {
  const [params, setParams] = useStatePrep(() => ({
    ...(window.WW_PRICE_PARAMS || {})
  }));
  const calc = window.MfgPrep.priceCalc(prep, params);
  if (!calc) return null;
  const s = calc.simple,
    f = calc.full;
  const setP = (k, v) => setParams(p => ({
    ...p,
    [k]: v
  }));
  const Num = ({
    k,
    label,
    suffix
  }) => /*#__PURE__*/React.createElement("label", {
    className: "flex items-center justify-between gap-2 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-600 truncate"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 shrink-0"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: params[k],
    onChange: e => setP(k, Number(e.target.value) || 0),
    className: "w-20 h-8 px-2 rounded-lg border border-stone-200 text-[12px] text-right tabular-nums outline-none focus:border-teal-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 w-5 text-[10.5px]"
  }, suffix)));
  const Row = ({
    l,
    v,
    strong,
    accent
  }) => /*#__PURE__*/React.createElement("div", {
    className: `flex items-center justify-between px-4 py-1.5 text-[12.5px] ${strong ? "bg-stone-50/40" : ""}`
  }, /*#__PURE__*/React.createElement("span", {
    className: strong ? "font-semibold text-stone-900" : "text-stone-600"
  }, l), /*#__PURE__*/React.createElement("span", {
    className: `tabular-nums ${accent ? "font-bold text-teal-700" : strong ? "font-semibold text-stone-900" : "text-stone-800"}`
  }, PREP_HUF(v)));
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    icon: "receipt",
    title: "\xC1rkalkul\xE1ci\xF3 \u2014 k\xE9tszint\u0171",
    sub: "Egyszer\u0171s\xEDtett (brutt\xF3, tanul\xF3) \xE9s \xF6sszetett (v\xE1llalkoz\xF3i, nett\xF3 \u2192 \xE1f\xE1s) kalkul\xE1ci\xF3 a levezetett anyag- \xE9s munkaid\u0151-sz\xFCks\xE9gletb\u0151l. A %-ok (j\xE1rul\xE9k, rezsi, nyeres\xE9g, \xE1fa) jogszab\xE1ly-/\xFCzletf\xFCgg\u0151k \u2014 szerkeszthet\u0151k, nincsenek bedr\xF3tozva."
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-3"
  }, "Param\xE9terek"), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2.5"
  }, /*#__PURE__*/React.createElement(Num, {
    k: "laborRate",
    label: "Nett\xF3 \xF3rab\xE9r",
    suffix: "Ft"
  }), /*#__PURE__*/React.createElement(Num, {
    k: "shiftRate",
    label: "Brutt\xF3 \xF3rad\xEDj (b\xE9r+rezsi)",
    suffix: "Ft"
  }), /*#__PURE__*/React.createElement(Num, {
    k: "machineRate",
    label: "G\xE9p-\xF3rad\xEDj",
    suffix: "Ft"
  }), /*#__PURE__*/React.createElement(Num, {
    k: "otherCost",
    label: "Egy\xE9b (b\xE9rmunka)",
    suffix: "Ft"
  }), /*#__PURE__*/React.createElement(Num, {
    k: "szochoPct",
    label: "J\xE1rul\xE9k (szocho)",
    suffix: "%"
  }), /*#__PURE__*/React.createElement(Num, {
    k: "overheadPct",
    label: "\xC1ltal\xE1nos (rezsi)",
    suffix: "%"
  }), /*#__PURE__*/React.createElement(Num, {
    k: "profitPct",
    label: "Nyeres\xE9g",
    suffix: "%"
  }), /*#__PURE__*/React.createElement(Num, {
    k: "vatPct",
    label: "\xC1fa",
    suffix: "%"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-stone-400"
  }, /*#__PURE__*/React.createElement("span", null, "Munka\xF3ra: ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-600"
  }, calc.hours, " \xF3")), /*#__PURE__*/React.createElement("span", null, "Anyag + vasalat: ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-600"
  }, PREP_HUF(calc.mat))), /*#__PURE__*/React.createElement("span", null, "M\u0171szakkihaszn\xE1lts\xE1g: ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-600"
  }, Math.round(params.shiftUtil * 100), "%")))), /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-stone-200 overflow-hidden self-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 bg-stone-50/60 border-b border-stone-200/80"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "Egyszer\u0171s\xEDtett \u2014 brutt\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500"
  }, "anyag + (b\xE9r + rezsi) + g\xE9p \xB7 tanul\xF3 / gyors becsl\xE9s")), /*#__PURE__*/React.createElement("div", {
    className: "py-1.5"
  }, /*#__PURE__*/React.createElement(Row, {
    l: "Anyagk\xF6lts\xE9g (brutt\xF3)",
    v: s.anyag
  }), /*#__PURE__*/React.createElement(Row, {
    l: `Bér + rezsi (${s.hours} ó × ${PREP_HUF(s.shiftRate)})`,
    v: s.ber
  }), /*#__PURE__*/React.createElement(Row, {
    l: `Gépköltség (× ${s.machineFactor})`,
    v: s.gep
  }), /*#__PURE__*/React.createElement(Row, {
    l: "Kalkul\xE1lt brutt\xF3 \xE1r",
    v: s.total,
    strong: true,
    accent: true
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-stone-200 overflow-hidden self-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 bg-stone-50/60 border-b border-stone-200/80"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "\xD6sszetett \u2014 nett\xF3 \u2192 \xE1f\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500"
  }, "v\xE1llalkoz\xF3i \xF6nk\xF6lts\xE9g + nyeres\xE9g + \xE1fa")), /*#__PURE__*/React.createElement("div", {
    className: "py-1.5"
  }, /*#__PURE__*/React.createElement(Row, {
    l: "1. Anyagk\xF6lts\xE9g (nett\xF3)",
    v: f.anyag
  }), /*#__PURE__*/React.createElement(Row, {
    l: `2. Bérköltség (${f.hours} ó)`,
    v: f.ber
  }), /*#__PURE__*/React.createElement(Row, {
    l: `3. Járulék (${f.szochoPct}%)`,
    v: f.jarulek
  }), f.egyeb > 0 && /*#__PURE__*/React.createElement(Row, {
    l: "4. Egy\xE9b (b\xE9rmunka)",
    v: f.egyeb
  }), /*#__PURE__*/React.createElement(Row, {
    l: "5. K\xF6zvetlen k\xF6lts\xE9g",
    v: f.kozvetlen,
    strong: true
  }), /*#__PURE__*/React.createElement(Row, {
    l: `6. Általános (${f.overheadPct}%)`,
    v: f.altalanos
  }), /*#__PURE__*/React.createElement(Row, {
    l: "7. \xD6nk\xF6lts\xE9g",
    v: f.onkoltseg,
    strong: true
  }), /*#__PURE__*/React.createElement(Row, {
    l: `8. Nyereség (${f.profitPct}%)`,
    v: f.nyereseg
  }), /*#__PURE__*/React.createElement(Row, {
    l: "9. Nett\xF3 elad\xE1si \xE1r",
    v: f.nettoAr,
    strong: true
  }), /*#__PURE__*/React.createElement(Row, {
    l: `Bruttó ár (${f.vatPct}% áfa)`,
    v: f.brutto,
    strong: true,
    accent: true
  })))));
}

// ── Bérmunka ────────────────────────────────────────────────────────────────────
function PrepOutsource({
  project,
  prep,
  isOrder
}) {
  const s = useSim();
  const ops = React.useMemo(() => window.MfgPrep.outsourceStatus(project), [project, s]);
  const [sel, setSel] = useStatePrep([]); // kiválasztott, MÉG ki nem adott op-id-k

  const dispatched = ops.filter(o => o.handshake);
  const available = ops.filter(o => o.epic && !o.handshake);
  const blocked = ops.filter(o => !o.epic && !o.handshake);

  // egy op kerüljön/maradjon kint a kijelölésből, ha kiadták/nincs epikje
  React.useEffect(() => {
    setSel(cur => cur.filter(id => available.some(o => o.id === id)));
  }, [project, s]);
  const toggle = id => setSel(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  const selectAll = () => setSel(available.map(o => o.id));
  const clear = () => setSel([]);
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(SectionHead, {
    icon: "external",
    title: "B\xE9rmunka-kiad\xE1s",
    sub: "Jel\xF6lj ki egy vagy t\xF6bb folyamat-elemet (szab\xE1szat, \xE9lz\xE1r\xE1s, CNC, fel\xFClet), \xE9s add ki egy partnernek \u2014 aki mindet v\xE1llalja. Ak\xE1r a teljes folyamat is kiadhat\xF3; a partner megkapja a kidolgozott, r\xE9szletes inf\xF3csomagot. (Be\xE1ll\xEDt\xE1sok \u2192 Munkafolyamat \u2192 B\xE9rmunka alatt szerkeszthet\u0151k a t\xEDpusok.)"
  }), isOrder && /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-3 text-[12px] text-amber-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 15,
    className: "mt-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("div", null, "A b\xE9rmunka-kiad\xE1shoz ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "gy\xE1rt\xE1si alprojekt"), " sz\xFCks\xE9ges (folyamat-epikekkel). A rendel\xE9s projektj\xE9b\u0151l hozd l\xE9tre a \u201ESaj\xE1t gy\xE1rt\xE1s alprojekt\" gombbal, majd onnan add ki a m\u0171veleteket.")), dispatched.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Kiadott b\xE9rmunka"), uniqHandshakes(dispatched).map(hs => /*#__PURE__*/React.createElement(DispatchedCard, {
    key: hs.id,
    hs: hs
  }))), available.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Kiadhat\xF3 m\u0171veletek"), !isOrder && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: selectAll,
    className: "text-[11px] font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 12
  }), "Teljes folyamat"), sel.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: clear,
    className: "text-[11px] font-medium text-stone-400 hover:text-stone-600"
  }, "T\xF6rl\xE9s"))), available.map(op => /*#__PURE__*/React.createElement(OpSelectRow, {
    key: op.id,
    op: op,
    checked: sel.includes(op.id),
    disabled: isOrder,
    onToggle: () => toggle(op.id)
  }))), blocked.map(op => /*#__PURE__*/React.createElement("div", {
    key: op.id,
    className: "flex items-center gap-3 bg-stone-50 border border-dashed border-stone-200 rounded-xl px-4 py-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-stone-100 text-stone-400"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: op.icon,
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-600"
  }, op.label), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, "Nincs megfelel\u0151 folyamat-epik \u2014 el\u0151bb h\xFAzd r\xE1 a gy\xE1rt\xE1si folyamatot a projektre.")))), available.length === 0 && blocked.length === 0 && dispatched.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-[12.5px] text-stone-500"
  }, "Nincs kiadhat\xF3 folyamat-elem ezen a projekten."), sel.length > 0 && !isOrder && /*#__PURE__*/React.createElement("div", {
    className: "h-20",
    "aria-hidden": true
  }), sel.length > 0 && !isOrder && /*#__PURE__*/React.createElement(DispatchPanel, {
    project: project,
    ops: available.filter(o => sel.includes(o.id)),
    onDone: clear
  }));
}
function uniqHandshakes(dispatched) {
  const seen = {};
  const out = [];
  dispatched.forEach(o => {
    if (o.handshake && !seen[o.handshake.id]) {
      seen[o.handshake.id] = 1;
      out.push(o.handshake);
    }
  });
  return out;
}
function DispatchedCard({
  hs
}) {
  const tone = HS_PREP_TONE[hs.status] || HS_PREP_TONE.sent;
  const labels = hs.opLabels || (hs.epicTitle ? [hs.epicTitle] : []);
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, hs.partnerName), hs.bundle && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-medium"
  }, "csomag \xB7 ", labels.length, " m\u0171velet")), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] font-mono text-stone-400 mt-0.5"
  }, hs.id)), /*#__PURE__*/React.createElement("span", {
    className: `shrink-0 inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${tone.bg} ${tone.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
  }), tone.l)), /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 flex flex-wrap gap-1.5"
  }, labels.map((l, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "inline-flex items-center px-2 h-6 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium"
  }, l))), hs.payload && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 pt-2.5 border-t border-stone-100 flex items-center gap-3 text-[11px] text-stone-500 flex-wrap"
  }, hs.payload.totalHours > 0 && /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, hs.payload.totalHours, " munka\xF3ra"), hs.payload.parts > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, hs.payload.parts, " alkatr\xE9sz")), hs.payload.sheets > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, hs.payload.sheets, " t\xE1bla")), hs.payload.edgeM > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, hs.payload.edgeM, " fm \xE9l"))), hs.note && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-[11.5px] text-stone-600 bg-stone-50 rounded-lg px-3 py-2 leading-snug"
  }, "\u201E", hs.note, "\""));
}
function OpSelectRow({
  op,
  checked,
  disabled,
  onToggle
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: disabled ? undefined : onToggle,
    disabled: disabled,
    className: `w-full text-left bg-white rounded-xl border p-3.5 flex items-start gap-3 transition ${checked ? "border-teal-400 ring-1 ring-teal-200" : "border-stone-200 hover:border-stone-300"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `shrink-0 mt-0.5 w-5 h-5 rounded-md border grid place-items-center transition ${checked ? "bg-teal-600 border-teal-600 text-white" : "border-stone-300 bg-white text-transparent"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  })), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-stone-100 text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: op.icon,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13.5px] font-semibold text-stone-900"
  }, op.label), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-0.5 leading-snug"
  }, op.desc), op.epic && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1"
  }, "Folyamat-epik: ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-600 font-medium"
  }, op.epic.title))));
}

// Kiadó sáv (kompakt, lebegő) — nem takarja a kijelölést; a részletek alulról nyíló lapon
function DispatchPanel({
  project,
  ops,
  onDone
}) {
  const s = useSim();
  const opKeys = ops.map(o => o.op);
  const partners = React.useMemo(() => window.MfgPrep.partnersForOps(opKeys, []), [opKeys.join(","), s]);
  const [open, setOpen] = useStatePrep(false);
  const bundle = ops.length > 1;
  const able = partners.length > 0;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "sticky bottom-0 z-10",
    style: {
      paddingBottom: "env(safe-area-inset-bottom)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-teal-300 shadow-lg shadow-teal-900/10 p-3 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-teal-50 text-teal-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 leading-tight"
  }, ops.length, " m\u0171velet kijel\xF6lve", bundle ? " — csomag" : ""), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] truncate leading-tight mt-0.5"
  }, able ? /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, partners.length, " partner v\xE1llalja mindet") : /*#__PURE__*/React.createElement("span", {
    className: "text-rose-600"
  }, "Nincs partner, aki mindet v\xE1llalja"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(true),
    className: "shrink-0 h-10 px-4 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 bg-teal-600 text-white hover:bg-teal-700"
  }, "Kiad\xE1s", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14,
    className: "-rotate-90"
  })))), open && /*#__PURE__*/React.createElement(DispatchSheet, {
    project: project,
    ops: ops,
    partners: partners,
    onClose: () => setOpen(false),
    onDone: () => {
      setOpen(false);
      onDone && onDone();
    }
  }));
}

// Alulról nyíló részletes kiadó lap — csomag-előnézet + partner + jegyzet + kiadás
function DispatchSheet({
  project,
  ops,
  partners,
  onClose,
  onDone
}) {
  const s = useSim();
  const opKeys = ops.map(o => o.op);
  const opIds = ops.map(o => o.id);
  const [pid, setPid] = useStatePrep(partners[0] ? partners[0].id : "");
  const [note, setNote] = useStatePrep("");
  const payload = React.useMemo(() => window.MfgPrep.payloadFor(project, opKeys), [project, opKeys.join(","), s]);
  const bundle = ops.length > 1;
  const give = () => {
    if (!pid) return;
    window.sim.delegateOutsource(project.id, opIds, pid, note);
    onDone && onDone();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[60] flex flex-col justify-end",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-stone-900/40",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white rounded-t-2xl sm:rounded-2xl sm:max-w-lg sm:mx-auto sm:mb-6 w-full max-h-[88vh] flex flex-col shadow-2xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 px-4 pt-3 pb-3 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-1 rounded-full bg-stone-200 mx-auto mb-3 sm:hidden"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-teal-50 text-teal-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 leading-tight"
  }, bundle ? `${ops.length} művelet egy csomagban` : ops[0].label, " kiad\xE1sa"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 truncate"
  }, project.name)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "shrink-0 w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5 mt-2.5"
  }, ops.map(o => /*#__PURE__*/React.createElement("span", {
    key: o.id,
    className: "inline-flex items-center gap-1 px-2 h-6 rounded-full bg-teal-50 text-teal-700 text-[11px] font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: o.icon,
    size: 11
  }), o.label)))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-auto px-4 py-3 space-y-3"
  }, payload && /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-50 border border-stone-200/70 rounded-xl p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "A partner ezt a r\xE9szletes csomagot kapja"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 mb-2"
  }, payload.parts > 0 && /*#__PURE__*/React.createElement(PayloadStat, {
    l: "Alkatr\xE9sz",
    v: payload.parts
  }), payload.sheets > 0 && /*#__PURE__*/React.createElement(PayloadStat, {
    l: "Lapanyag",
    v: payload.sheets + " tábla"
  }), payload.edgeM > 0 && /*#__PURE__*/React.createElement(PayloadStat, {
    l: "\xC9lz\xE1r\xE1s",
    v: payload.edgeM + " fm"
  }), payload.surfaceM2 > 0 && /*#__PURE__*/React.createElement(PayloadStat, {
    l: "Fel\xFClet",
    v: payload.surfaceM2 + " m²"
  }), /*#__PURE__*/React.createElement(PayloadStat, {
    l: "Munka\xF3ra",
    v: payload.totalHours
  }), /*#__PURE__*/React.createElement(PayloadStat, {
    l: "Becs\xFClt d\xEDj",
    v: PREP_HUFk(payload.totalCost)
  })), payload.ops.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, payload.ops.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.op,
    className: "flex items-center justify-between text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-600"
  }, r.label), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums text-stone-500"
  }, r.hours, " \xF3 \xB7 ~", r.days, " nap")))), (payload.materials.length > 0 || payload.hardware.length > 0) && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 pt-2 border-t border-stone-200/70 text-[11px] text-stone-500 space-y-0.5"
  }, payload.materials.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "truncate"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "Anyag:"), " ", payload.materials.map(m => `${m.name} (${m.sheets})`).join(", ")), payload.hardware.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "truncate"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "Vasalat:"), " ", payload.hardware.map(h => `${h.name} ×${h.qty}`).join(", ")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1"
  }, "Partner"), partners.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2 bg-rose-50 border border-rose-200/70 rounded-lg px-3 py-2.5 text-[11.5px] text-rose-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 14,
    className: "mt-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("div", null, "Nincs olyan partner, aki a kijel\xF6lt m\u0171veletek ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "mindegyik\xE9t"), " v\xE1llalja. Sz\u0171k\xEDtsd a kijel\xF6l\xE9st, vagy \xE1ll\xEDtsd be a partner k\xE9pess\xE9geit (Be\xE1ll\xEDt\xE1sok \u2192 Partnerek).")) : /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, partners.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => setPid(p.id),
    className: `w-full text-left flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition ${pid === p.id ? "border-teal-400 ring-1 ring-teal-200 bg-teal-50/40" : "border-stone-200 hover:border-stone-300"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `shrink-0 w-4 h-4 rounded-full border-2 grid place-items-center ${pid === p.id ? "border-teal-600" : "border-stone-300"}`
  }, pid === p.id && /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-teal-600"
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 truncate"
  }, p.name, p.platform ? "" : " (platformon kívül)"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 truncate"
  }, p.specialty || `${(p.capabilities || []).length} képesség`)))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1"
  }, "Megjegyz\xE9s a partnernek"), /*#__PURE__*/React.createElement("textarea", {
    value: note,
    onChange: e => setNote(e.target.value),
    rows: 2,
    placeholder: "Hat\xE1rid\u0151, min\u0151s\xE9gi elv\xE1r\xE1s, sz\xE1ll\xEDt\xE1s\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-700 resize-none"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 px-4 py-3 border-t border-stone-100 flex items-center gap-2",
    style: {
      paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-10 px-4 rounded-lg text-[12.5px] font-medium text-stone-600 border border-stone-200 hover:bg-stone-50"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: give,
    disabled: !pid,
    className: "flex-1 h-10 px-4 rounded-lg text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 bg-teal-600 text-white hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 14
  }), "Kiad\xE1s", partners.length ? "" : " — nincs partner"))));
}
function PayloadStat({
  l,
  v
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg border border-stone-200/70 px-2.5 py-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] uppercase tracking-wide text-stone-500"
  }, l), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold tabular-nums text-stone-900 leading-tight"
  }, v));
}

// ── közös szekció-fejléc ──
function SectionHead({
  icon,
  title,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-teal-50 text-teal-600 mt-0.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 15
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 leading-snug max-w-2xl"
  }, sub)));
}
Object.assign(window, {
  MfgPrepPage,
  MfgPrepWorkspace,
  orderToPseudo
});
})();
