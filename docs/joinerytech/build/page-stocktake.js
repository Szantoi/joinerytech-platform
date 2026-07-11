/* AUTO-GENERATED from page-stocktake.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-stocktake.jsx — LELTÁR / KÉSZLET-REVÍZIÓ — a Raktár világ képernyője
//   A lot-modellre ülő ciklikus leltár: hatókör-snapshot → számlálás →
//   eltérés-egyeztetés → lezárás (whAdjustLot könyveli a korrekciókat).
//   KPI-sáv + lista + részlet-SlideOver (sor-szintű számlálás + FSM) + új ív.
//   Store: window.sim.stocktakes + akciók; StockEngine (FSM/eltérés/pontosság).
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateS
} = React;
const _svar = line => window.StockEngine ? window.StockEngine.variance(line) : 0;
function StkStatusPill({
  status,
  size = "md"
}) {
  const t = (window.STK_STATUS || {})[status] || {
    label: status,
    pill: "bg-stone-100 text-stone-600 border-stone-200",
    dot: "bg-stone-400"
  };
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.dot}`
  }), t.label);
}
function StkStepper({
  stk
}) {
  const steps = (window.STK_FLOW || {}).order || [];
  const aborted = stk.status === "megszakitva";
  const cur = steps.indexOf(stk.status);
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 overflow-x-auto pb-0.5"
  }, steps.map((st, i) => {
    const done = cur >= 0 && i < cur,
      active = i === cur;
    const lbl = (window.STK_STATUS[st] || {}).label || st;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: st
    }, i > 0 && /*#__PURE__*/React.createElement("div", {
      className: `h-px w-3 shrink-0 ${done ? "bg-teal-300" : "bg-stone-200"}`
    }), /*#__PURE__*/React.createElement("div", {
      className: `shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border ${active ? "bg-teal-600 text-white border-teal-600" : done ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-white text-stone-400 border-stone-200"}`
    }, done && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 10
    }), lbl));
  }), aborted && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "h-px w-3 shrink-0 bg-stone-300"
  }), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border bg-rose-50 text-rose-700 border-rose-200"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 10
  }), "Megszak\xEDtva")));
}
function VarianceBadge({
  v,
  size = "md"
}) {
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  if (v === 0) return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium bg-emerald-50 text-emerald-700 border-emerald-200 ${cls}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 11
  }), "egyezik");
  const neg = v < 0;
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium ${neg ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"} ${cls}`
  }, neg ? "−" : "+", Math.abs(v));
}
function StkRow({
  stk,
  onOpen
}) {
  const sum = window.StockEngine ? window.StockEngine.summary(stk) : {
    counted: 0,
    total: 0,
    variances: 0,
    pct: 0
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(stk.id),
    className: "w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-teal-50 text-teal-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "inventory",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, stk.scope ? stk.scope.label : "Leltár"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate mt-0.5"
  }, stk.id, " \xB7 ", (stk.lines || []).length, " t\xE9tel \xB7 ", stk.createdBy), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement(StkStatusPill, {
    status: stk.status,
    size: "sm"
  }), window.StockEngine && window.StockEngine.isOpen(stk) && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400"
  }, sum.counted, "/", sum.total, " sz\xE1molva"), sum.variances > 0 && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 10
  }), sum.variances, " elt\xE9r\xE9s"))), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Megnyitva"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-medium text-stone-600"
  }, stk.createdAt)));
}
function StkDetailHost({
  openId,
  setOpen
}) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const stk = openId ? (sim.stocktakes || []).find(x => x.id === openId) : null;
  const onClose = () => setOpen(null);
  return /*#__PURE__*/React.createElement(SO, {
    open: !!stk,
    onClose: onClose,
    title: stk ? stk.scope ? stk.scope.label : "Leltár" : "",
    subtitle: stk ? `${stk.id} · ${stk.createdAt}` : "",
    width: 620
  }, stk && window.StocktakeDetail ? /*#__PURE__*/React.createElement(window.StocktakeDetail, {
    stk: stk,
    onClose: onClose
  }) : null);
}
function StocktakePage() {
  const sim = useSim();
  const list = sim.stocktakes || [];
  const [openId, setOpenId] = useStateS(null);
  const [newOpen, setNewOpen] = useStateS(false);
  const [statusF, setStatusF] = useStateS("all");
  const E = window.StockEngine;
  const open = list.filter(s => E && E.isOpen(s));
  const counting = open.filter(s => s.status === "szamlalas");
  const reconciling = open.filter(s => s.status === "egyeztetes");
  const openVariances = open.reduce((n, s) => n + (E ? E.summary(s).variances : 0), 0);
  const shown = list.filter(s => statusF === "all" ? true : statusF === "open" ? E && E.isOpen(s) : s.status === statusF);
  const KPI = ({
    label,
    value,
    sub,
    tone = "stone",
    icon
  }) => /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-8 h-8 rounded-lg grid place-items-center bg-${tone}-50 text-${tone}-600`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[22px] font-semibold text-stone-900 leading-none"
  }, value)), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-700 mt-2.5"
  }, label), sub && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-0.5"
  }, sub));
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-1"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Lelt\xE1r"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Ciklikus k\xE9szlet-rev\xEDzi\xF3 \u2014 a lotok vs. a fizikai sz\xE1ml\xE1l\xE1s \xB7 ", window.STK_TODAY)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "\xDAj lelt\xE1r-\xEDv")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 my-4"
  }, /*#__PURE__*/React.createElement(KPI, {
    label: "Nyitott lelt\xE1r",
    value: open.length,
    sub: "folyamatban",
    tone: "teal",
    icon: "inventory"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Sz\xE1ml\xE1l\xE1s alatt",
    value: counting.length,
    sub: "terepen",
    tone: "sky",
    icon: "search"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Egyeztet\xE9sre v\xE1r",
    value: reconciling.length,
    sub: "elt\xE9r\xE9s-b\xEDr\xE1lat",
    tone: "amber",
    icon: "layers"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Nyitott elt\xE9r\xE9s",
    value: openVariances,
    sub: "k\xF6nyvel\xE9sre v\xE1r",
    tone: "rose",
    icon: "alert"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("select", {
    value: statusF,
    onChange: e => setStatusF(e.target.value),
    className: "h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-teal-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Minden st\xE1tusz"), /*#__PURE__*/React.createElement("option", {
    value: "open"
  }, "Csak nyitott"), Object.keys(window.STK_STATUS || {}).map(k => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, window.STK_STATUS[k].label)))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, shown.length ? shown.map(s => /*#__PURE__*/React.createElement(StkRow, {
    key: s.id,
    stk: s,
    onOpen: setOpenId
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs lelt\xE1r-\xEDv.")), /*#__PURE__*/React.createElement(StkDetailHost, {
    openId: openId,
    setOpen: setOpenId
  }), newOpen && window.NewStocktakeSheet && /*#__PURE__*/React.createElement(window.NewStocktakeSheet, {
    onClose: () => setNewOpen(false),
    onCreated: id => {
      setNewOpen(false);
      setOpenId(id);
    }
  }));
}
function StocktakeDetail({
  stk,
  onClose
}) {
  const sim = useSim();
  const live = (sim.stocktakes || []).find(x => x.id === stk.id) || stk;
  const E = window.StockEngine;
  const sum = E ? E.summary(live) : {
    counted: 0,
    total: 0,
    variances: 0,
    net: 0,
    pct: 0,
    accuracy: 1,
    complete: false
  };
  const next = E ? E.nextStates(live) : [];
  const counting = live.status === "szamlalas";
  const isOpen = E && E.isOpen(live);
  const [abortOpen, setAbortOpen] = useStateS(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(StkStatusPill, {
    status: live.status
  }), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[11.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: (window.STK_SCOPE[live.scope?.type] || {}).icon || "inventory",
    size: 13
  }), live.scope ? live.scope.label : "—")), /*#__PURE__*/React.createElement(StkStepper, {
    stk: live
  }), live.note && /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-600"
  }, live.note), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-2.5 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[18px] font-semibold text-stone-900"
  }, sum.counted, "/", sum.total), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-0.5"
  }, "sz\xE1molva")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-2.5 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: `text-[18px] font-semibold ${sum.variances ? "text-amber-600" : "text-emerald-600"}`
  }, sum.variances), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-0.5"
  }, "elt\xE9r\xE9s")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-2.5 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[18px] font-semibold text-stone-900"
  }, Math.round(sum.accuracy * 100), "%"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-0.5"
  }, "pontoss\xE1g"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "T\xE9telek"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, (live.lines || []).map((l, idx) => {
    const v = _svar(l);
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: "px-2.5 py-2 rounded-lg border border-stone-200"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-800 truncate"
    }, l.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400"
    }, l.locText, " \xB7 rendszer: ", /*#__PURE__*/React.createElement("span", {
      className: "font-medium text-stone-600"
    }, l.systemQty, " ", l.unit))), counting ? /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: l.countedQty != null ? l.countedQty : "",
      onChange: e => window.sim.setStocktakeCount(live.id, idx, e.target.value),
      placeholder: "sz\xE1molt",
      className: "w-[84px] h-9 px-2 text-center rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 shrink-0"
    }) : /*#__PURE__*/React.createElement("div", {
      className: "text-right shrink-0"
    }, l.counted ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-800"
    }, l.countedQty, " ", l.unit), isOpen || v !== 0 ? /*#__PURE__*/React.createElement("div", {
      className: "mt-0.5"
    }, /*#__PURE__*/React.createElement(VarianceBadge, {
      v: v,
      size: "sm"
    })) : null) : /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-400"
    }, "nincs sz\xE1molva"))));
  }), !(live.lines || []).length && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "\xDCres lelt\xE1r-\xEDv (a hat\xF3k\xF6rben nincs lot)."))), isOpen && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap pt-1"
  }, next.filter(t => t !== "megszakitva").map(to => {
    const st = window.STK_STATUS[to] || {};
    const close = to === "lezarva";
    return /*#__PURE__*/React.createElement("button", {
      key: to,
      onClick: () => window.sim.setStocktakeStatus(live.id, to),
      className: `inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${close ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-teal-600 text-white hover:bg-teal-700"}`
    }, close ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14
    }) : to === "szamlalas" ? /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 14
    }) : /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 14
    }), close ? "Lezárás + könyvelés" : st.label);
  }), next.includes("megszakitva") && /*#__PURE__*/React.createElement("button", {
    onClick: () => setAbortOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 text-stone-500 text-[12.5px] font-medium hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }), "Megszak\xEDt")), live.status === "egyeztetes" && sum.variances > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 15,
    className: "shrink-0"
  }), "Lez\xE1r\xE1skor ", sum.variances, " elt\xE9r\xE9s k\xF6nyvel\u0151dik a lotokra (nett\xF3 ", sum.net > 0 ? "+" : "", sum.net, " egys\xE9g)."), abortOpen && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-700 mb-2"
  }, "Biztosan megszak\xEDtod? A sz\xE1molt \xE9rt\xE9kek elvesznek, korrekci\xF3 nem k\xF6nyvel\u0151dik."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.sim.setStocktakeStatus(live.id, "megszakitva");
      setAbortOpen(false);
    },
    className: "h-8 px-3 rounded-lg bg-rose-600 text-white text-[12px] font-medium"
  }, "Megszak\xEDt"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAbortOpen(false),
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse"))), live.status === "lezarva" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16,
    className: "text-emerald-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-emerald-800"
  }, "Lez\xE1rva ", live.closedAt ? `· ${live.closedAt}` : "", " \u2014 a korrekci\xF3k a Mozg\xE1sok k\xF6zt l\xE1that\xF3k.")), (live.log || []).length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Napl\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, live.log.slice().reverse().map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-start gap-2 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-stone-300 mt-1.5 shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-mono text-[10.5px] shrink-0"
  }, l.at), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-600"
  }, l.text))))));
}
function NewStocktakeSheet({
  onClose,
  onCreated
}) {
  const sim = useSim();
  const [scopeType, setScopeType] = useStateS("zone");
  const [zone, setZone] = useStateS("general");
  const [locId, setLocId] = useStateS("");
  const [note, setNote] = useStateS("");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500";
  const locs = window.sim.whLocations ? window.sim.whLocations() : [];

  // élő előnézet: hány lot esik a hatókörbe
  const items = window.sim.warehouseItems ? window.sim.warehouseItems() : [];
  let preview = 0;
  items.forEach(it => (it.worldExt && it.worldExt.warehouse && it.worldExt.warehouse.lots || []).forEach(lot => {
    if ((Number(lot.qty) || 0) <= 0) return;
    if (scopeType === "zone" && lot.zone !== zone) return;
    if (scopeType === "location" && lot.locId !== locId) return;
    preview++;
  }));
  const create = () => {
    const scope = scopeType === "zone" ? {
      type: "zone",
      zone
    } : scopeType === "location" ? {
      type: "location",
      locId
    } : {
      type: "all"
    };
    const id = window.sim.createStocktake({
      scope,
      note
    });
    if (id && onCreated) onCreated(id);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[60] flex items-end md:items-center justify-center",
    role: "dialog"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-stone-900/40",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full md:max-w-[480px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "\xDAj lelt\xE1r-\xEDv"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Hat\xF3k\xF6r"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, Object.keys(window.STK_SCOPE || {}).map(k => {
    const m = window.STK_SCOPE[k];
    const on = scopeType === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setScopeType(k),
      className: `flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border ${on ? "border-teal-500 bg-teal-50" : "border-stone-200 bg-white"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 18,
      className: on ? "text-teal-700" : "text-stone-400"
    }), /*#__PURE__*/React.createElement("span", {
      className: `text-[11px] font-medium ${on ? "text-teal-800" : "text-stone-600"}`
    }, m.label));
  }))), scopeType === "zone" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Z\xF3na"), /*#__PURE__*/React.createElement("select", {
    value: zone,
    onChange: e => setZone(e.target.value),
    className: cls
  }, (window.WH_ZONE_ORDER || []).map(z => /*#__PURE__*/React.createElement("option", {
    key: z,
    value: z
  }, (window.WH_ZONES[z] || {}).label || z)))), scopeType === "location" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Rakt\xE1rhely"), /*#__PURE__*/React.createElement("select", {
    value: locId,
    onChange: e => setLocId(e.target.value),
    className: cls
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "V\xE1lassz helyet\u2026"), locs.map(l => /*#__PURE__*/React.createElement("option", {
    key: l.id,
    value: l.id
  }, window.sim.whLocLabel ? window.sim.whLocLabel(l) : l.id)))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 flex items-center gap-2 text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "inventory",
    size: 15,
    className: "text-stone-400"
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800"
  }, preview), " lot ker\xFCl a lelt\xE1r-\xEDvre a pillanatnyi k\xE9szletb\u0151l.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("textarea", {
    value: note,
    onChange: e => setNote(e.target.value),
    rows: 2,
    placeholder: "Pl. negyed\xE9ves ciklikus lelt\xE1r\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  })), /*#__PURE__*/React.createElement("button", {
    disabled: scopeType === "location" && !locId,
    onClick: create,
    className: "w-full h-10 rounded-xl bg-teal-600 text-white text-[13px] font-semibold disabled:opacity-40"
  }, "Lelt\xE1r-\xEDv l\xE9trehoz\xE1sa"))));
}
Object.assign(window, {
  StkStatusPill,
  StkStepper,
  VarianceBadge,
  StkRow,
  StkDetailHost,
  StocktakePage,
  StocktakeDetail,
  NewStocktakeSheet
});
})();
