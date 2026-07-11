/* AUTO-GENERATED from page-trade-2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-trade-2.jsx — KERESKEDELEM: Lapszabászat (szabás-rendelés → árajánlat, FSM)
//   + Árrés-motor (markup ↔ árrés kategóriánként és tételenként).
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useTr2,
  useMemo: useTrM2
} = React;
const TE2 = window.TradeEngine;

// ════════════════════════════════════════════════════════════════════════════
// LAPSZABÁSZAT — szabás / megmunkálás rendelések
// ════════════════════════════════════════════════════════════════════════════
function TradeCutting() {
  const sim = useSim();
  const orders = sim.cuttingOrders || [];
  const products = sim.tradeProducts || [];
  const cats = sim.tradeCategories || [];
  const services = sim.tradeServices || [];
  const catById = useTrM2(() => Object.fromEntries(cats.map(c => [c.id, c])), [cats]);
  const [filter, setFilter] = useTr2("open");
  const [detail, setDetail] = useTr2(null); // order id
  const [builder, setBuilder] = useTr2(false);
  const counts = {
    open: orders.filter(o => o.status !== "handed" && o.status !== "rejected").length,
    all: orders.length
  };
  const shown = orders.filter(o => filter === "all" ? true : o.status !== "handed" && o.status !== "rejected");
  const detailOrder = orders.find(o => o.id === detail) || null;
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold tracking-tight text-stone-900"
  }, "Lapszab\xE1szat"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, "Bej\xF6v\u0151 szab\xE1s- \xE9s megmunk\xE1l\xE1s-rendel\xE9sek \u2192 gyors \xE1raj\xE1nlat (lap + szolg\xE1ltat\xE1s).")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5"
  }, [{
    k: "open",
    l: "Nyitott",
    n: counts.open
  }, {
    k: "all",
    l: "Összes",
    n: counts.all
  }].map(x => /*#__PURE__*/React.createElement("button", {
    key: x.k,
    onClick: () => setFilter(x.k),
    className: `px-3 h-8 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5 ${filter === x.k ? "bg-orange-600 text-white" : "text-stone-600 hover:bg-stone-100"}`
  }, x.l, /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] tabular-nums px-1.5 rounded-full ${filter === x.k ? "bg-white/20" : "bg-stone-100 text-stone-500"}`
  }, x.n)))), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: () => setBuilder(true)
  }, "\xDAj szab\xE1s-rendel\xE9s"))), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[120px_minmax(0,1.4fr)_minmax(0,1.2fr)_70px_120px_110px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("div", null, "Azonos\xEDt\xF3"), /*#__PURE__*/React.createElement("div", null, "Vev\u0151"), /*#__PURE__*/React.createElement("div", null, "Lapanyag"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "T\xE1bla"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "\xD6sszeg (nett\xF3)"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "St\xE1tusz")), shown.map(o => {
    const tone = CUTTING_TONE[o.status];
    const total = o.materialCost + o.serviceTotal;
    return /*#__PURE__*/React.createElement("button", {
      key: o.id,
      onClick: () => setDetail(o.id),
      className: "w-full text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "hidden md:grid grid-cols-[120px_minmax(0,1.4fr)_minmax(0,1.2fr)_70px_120px_110px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center hover:bg-stone-50/60"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] font-mono text-stone-500"
    }, o.id), /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900 truncate"
    }, o.customer), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-600 truncate"
    }, o.boardName), /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] tabular-nums text-right text-stone-700"
    }, o.sheets), /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] tabular-nums text-right font-semibold text-stone-900"
    }, TE2.fmtHuf(total)), /*#__PURE__*/React.createElement("div", {
      className: "flex justify-end"
    }, /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1.5 text-[10.5px] px-2 py-0.5 rounded-full font-medium ${tone.bg} ${tone.fg}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
    }), tone.label))), /*#__PURE__*/React.createElement("div", {
      className: "md:hidden px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3 hover:bg-stone-50/60"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-medium text-stone-900 truncate"
    }, o.customer)), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 truncate font-mono"
    }, o.id, " \xB7 ", o.sheets, " t\xE1bla ", o.boardName)), /*#__PURE__*/React.createElement("div", {
      className: "text-right shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold tabular-nums text-stone-900"
    }, TE2.fmtHuf(total)), /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1 text-[10px] mt-0.5 ${tone.fg}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
    }), tone.label))));
  }), shown.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-10 text-center text-[12px] text-stone-400"
  }, "Nincs megjelen\xEDthet\u0151 rendel\xE9s.")), /*#__PURE__*/React.createElement(CuttingDetail, {
    order: detailOrder,
    onClose: () => setDetail(null),
    services: services
  }), /*#__PURE__*/React.createElement(CuttingBuilder, {
    open: builder,
    onClose: () => setBuilder(false),
    products: products,
    catById: catById,
    rates: sim.tradeServiceRates,
    projects: sim.projects || []
  }));
}

// ── szabás-rendelés részlet + FSM ───────────────────────────────────────────
function CuttingDetail({
  order,
  onClose,
  services
}) {
  const [rejecting, setRejecting] = useTr2(false);
  const [reason, setReason] = useTr2("");
  React.useEffect(() => {
    setRejecting(false);
    setReason("");
  }, [order && order.id]);
  if (!order) return null;
  const tone = CUTTING_TONE[order.status];
  const allowed = CUTTING_FLOW[order.status] || [];
  const total = order.materialCost + order.serviceTotal;
  const gross = TE2.gross(total);
  const terminal = order.status === "handed" || order.status === "rejected";

  // a fő-lánc lépései, lezárt jelzéssel (CLAUDE: tiltott = disabled + tooltip)
  const ACTIONS = [{
    to: "quoted",
    label: "Árajánlat kiadása",
    icon: "send"
  }, {
    to: "accepted",
    label: "Elfogadás",
    icon: "check"
  }, {
    to: "ready",
    label: "Kész",
    icon: "check"
  }, {
    to: "handed",
    label: "Átadás",
    icon: "check"
  }];
  const doSet = to => {
    window.sim.setCuttingStatus(order.id, to);
  };
  const doReject = () => {
    if (!reason.trim()) return;
    if (window.sim.setCuttingStatus(order.id, "rejected", {
      reason: reason.trim()
    })) {
      setRejecting(false);
      onClose();
    }
  };
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: !!order,
    onClose: onClose,
    title: order.customer,
    subtitle: `${order.id} · ${order.date}`,
    width: 540,
    footer: terminal ? /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 text-[11.5px] text-stone-500"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 14
    }), order.status === "handed" ? "Lezárt rendelés (átadva)." : "Elutasított rendelés.") : rejecting ? /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 w-full"
    }, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setRejecting(false)
    }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
      onClick: doReject,
      disabled: !reason.trim(),
      className: `inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-[12.5px] font-medium ${reason.trim() ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-stone-200 text-stone-400 cursor-not-allowed"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    }), "Elutas\xEDt\xE1s meger\u0151s\xEDt\xE9se")) : /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap justify-end"
    }, (order.status === "inquiry" || order.status === "quoted") && /*#__PURE__*/React.createElement("button", {
      onClick: () => setRejecting(true),
      className: "inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white border border-rose-200 text-rose-600 text-[12.5px] font-medium hover:bg-rose-50"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    }), "Elutas\xEDt\xE1s"), ACTIONS.map(a => {
      const ok = allowed.includes(a.to);
      if (!ok && a.to === "rejected") return null;
      // csak az értelmes előre-lépéseket mutatjuk; a tiltottak LEZÁRT-ként
      const isNext = ok;
      const isPastOrLocked = !ok && CUTTING_ORDER.indexOf(a.to) > CUTTING_ORDER.indexOf(order.status) + 1;
      if (!isNext && !isPastOrLocked) return null;
      return /*#__PURE__*/React.createElement("button", {
        key: a.to,
        onClick: () => isNext && doSet(a.to),
        disabled: !isNext,
        title: isNext ? "" : "Előbb az előző lépést kell befejezni (FSM)",
        className: `inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-[12.5px] font-medium transition ${isNext ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-stone-100 text-stone-400 cursor-not-allowed"}`
      }, isNext ? /*#__PURE__*/React.createElement(Icon, {
        name: a.icon,
        size: 14
      }) : /*#__PURE__*/React.createElement(Icon, {
        name: "lock",
        size: 13
      }), a.label);
    }))
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-full font-medium ${tone.bg} ${tone.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
  }), tone.label), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[18px] font-semibold tabular-nums text-stone-900"
  }, TE2.fmtHuf(total)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 tabular-nums"
  }, "Brutt\xF3 ", TE2.fmtHuf(gross)))), order.phone && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-600"
  }, "\uD83D\uDCDE ", order.phone), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, CUTTING_ORDER.map((st, i) => {
    const here = order.status === st;
    const past = CUTTING_ORDER.indexOf(order.status) > i && order.status !== "rejected";
    const t = CUTTING_TONE[st];
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: st
    }, /*#__PURE__*/React.createElement("span", {
      className: `text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${here ? `${t.bg} ${t.fg}` : past ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-400"}`
    }, t.label), i < CUTTING_ORDER.length - 1 && /*#__PURE__*/React.createElement("span", {
      className: "text-stone-300 text-[10px]"
    }, "\u203A"));
  })), order.status === "rejected" && order.note && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] px-3 py-2 rounded-lg bg-rose-50 text-rose-700"
  }, "Elutas\xEDt\xE1s oka: ", order.note), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-1.5"
  }, "Lapanyag"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200/70"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-800 font-medium"
  }, order.boardName), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] tabular-nums text-stone-600"
  }, order.sheets, " t\xE1bla \xB7 ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-900"
  }, TE2.fmtHuf(order.materialCost))))), order.cuts && order.cuts.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-1.5"
  }, "V\xE1g\xE1slista"), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200/70 overflow-hidden"
  }, order.cuts.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center justify-between px-3 py-2 border-b border-stone-100 last:border-0 text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-700 tabular-nums font-mono"
  }, c.w, " \xD7 ", c.h, " mm"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 tabular-nums"
  }, c.qty, " db"))))), order.services && order.services.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-1.5"
  }, "Szolg\xE1ltat\xE1sok"), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200/70 overflow-hidden"
  }, order.services.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center justify-between px-3 py-2 border-b border-stone-100 last:border-0 text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-700"
  }, s.name), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 tabular-nums"
  }, s.qty, " ", s.unit, " \xD7 ", TE2.fmtHuf(s.rate), " = ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800"
  }, TE2.fmtHuf(s.qty * s.rate))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-3 py-2 bg-stone-50/60 text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 font-medium"
  }, "Szolg\xE1ltat\xE1s \xF6sszesen"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold tabular-nums text-stone-900"
  }, TE2.fmtHuf(order.serviceTotal))))), order.note && order.status !== "rejected" && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-600 italic"
  }, "\u201E", order.note, "\"")));
}

// ── új szabás-rendelés építő ────────────────────────────────────────────────
function CuttingBuilder({
  open,
  onClose,
  products,
  catById,
  rates,
  projects
}) {
  const boards = products.filter(p => p.catId === "lap");
  const [customer, setCustomer] = useTr2("");
  const [phone, setPhone] = useTr2("");
  const [boardId, setBoardId] = useTr2(boards[0] ? boards[0].id : "");
  const [sheets, setSheets] = useTr2(2);
  const [cutMode, setCutMode] = useTr2("fixed"); // "fixed" (tábla) | "meter" (folyóméter)
  const [cuts, setCuts] = useTr2([{
    w: 600,
    h: 400,
    qty: 4
  }]);
  const [edges, setEdges] = useTr2([{
    t: "t08",
    w: "w23",
    g: "trad",
    meters: 18
  }]);
  const [extras, setExtras] = useTr2([]); // [{id, qty}]
  const [note, setNote] = useTr2("");
  const [importOpen, setImportOpen] = useTr2(false);
  const [importedFrom, setImportedFrom] = useTr2(null);
  React.useEffect(() => {
    if (open) {
      setCustomer("");
      setPhone("");
      setBoardId(boards[0] ? boards[0].id : "");
      setSheets(2);
      setCutMode("fixed");
      setCuts([{
        w: 600,
        h: 400,
        qty: 4
      }]);
      setEdges([{
        t: "t08",
        w: "w23",
        g: "trad",
        meters: 18
      }]);
      setExtras([]);
      setNote("");
      setImportedFrom(null);
    }
  }, [open]);
  const board = products.find(p => p.id === boardId);
  const boardSell = board ? TE2.sellOf(board, catById[board.catId]) : 0;
  const materialCost = boardSell * (Number(sheets) || 0);

  // kalkulált vágás-folyóméter a vágáslista kerületeiből (2×(sz+m) × db)
  const cutMeters = useTrM2(() => cuts.reduce((a, c) => a + 2 * ((Number(c.w) || 0) + (Number(c.h) || 0)) / 1000 * (Number(c.qty) || 0), 0), [cuts]);
  const cutCost = cutMode === "fixed" ? (rates ? rates.cutFixed : 0) * (Number(sheets) || 0) : Math.round((rates ? rates.cutMeter : 0) * cutMeters);
  const edgeLines = edges.map(e => {
    const rate = TE2.edgeRate(rates, e.t, e.w, e.g);
    return {
      ...e,
      rate,
      cost: Math.round(rate * (Number(e.meters) || 0))
    };
  });
  const edgeCost = edgeLines.reduce((a, e) => a + e.cost, 0);
  const extraDefs = rates && rates.extras || [];
  const extrasList = extras.map(x => {
    const def = extraDefs.find(d => d.id === x.id);
    return def ? {
      ...def,
      qty: Number(x.qty) || 0,
      cost: def.rate * (Number(x.qty) || 0)
    } : null;
  }).filter(Boolean);
  const extrasCost = extrasList.reduce((a, e) => a + e.cost, 0);
  const serviceTotal = cutCost + edgeCost + extrasCost;
  const total = materialCost + serviceTotal;
  const setCut = (i, k, val) => setCuts(c => c.map((x, j) => j === i ? {
    ...x,
    [k]: val
  } : x));
  const addCut = () => setCuts(c => [...c, {
    w: 600,
    h: 400,
    qty: 1
  }]);
  const rmCut = i => setCuts(c => c.filter((_, j) => j !== i));
  const setEdge = (i, k, val) => setEdges(e => e.map((x, j) => j === i ? {
    ...x,
    [k]: val
  } : x));
  const addEdge = () => setEdges(e => [...e, {
    t: "t08",
    w: "w23",
    g: "trad",
    meters: 6
  }]);
  const rmEdge = i => setEdges(e => e.filter((_, j) => j !== i));
  const toggleExtra = id => setExtras(v => v.some(x => x.id === id) ? v.filter(x => x.id !== id) : [...v, {
    id,
    qty: 1
  }]);
  const setExtraQty = (id, qty) => setExtras(v => v.map(x => x.id === id ? {
    ...x,
    qty
  } : x));
  const applyImport = data => {
    if (data.boardId) setBoardId(data.boardId);
    if (data.sheets) setSheets(data.sheets);
    if (data.cuts && data.cuts.length) setCuts(data.cuts);
    if (data.edgeMeters) setEdges([{
      t: "t08",
      w: "w23",
      g: "trad",
      meters: Math.round(data.edgeMeters)
    }]);
    if (data.customer) setCustomer(data.customer);
    setCutMode("meter");
    setImportedFrom(data.projectName || data.projectId);
    setImportOpen(false);
  };
  const submit = () => {
    const svc = [];
    svc.push(cutMode === "fixed" ? {
      id: "cut",
      name: "Szabás (fix tábla-ár)",
      unit: "tábla",
      qty: Number(sheets) || 0,
      rate: rates ? rates.cutFixed : 0
    } : {
      id: "cut",
      name: "Szabás (folyóméter)",
      unit: "fm",
      qty: Math.round(cutMeters),
      rate: rates ? rates.cutMeter : 0
    });
    edgeLines.forEach(e => svc.push({
      id: "edge",
      name: `Élzárás ${TE2.edgeParamName(rates, "edgeThickness", e.t)} · ${TE2.edgeParamName(rates, "edgeWidth", e.w)} · ${TE2.edgeParamName(rates, "edgeGlue", e.g)}`,
      unit: "fm",
      qty: Number(e.meters) || 0,
      rate: e.rate
    }));
    extrasList.forEach(e => svc.push({
      id: e.id,
      name: e.name,
      unit: e.unit,
      qty: e.qty,
      rate: e.rate
    }));
    window.sim.addCuttingOrder({
      customer: customer.trim() || "Eseti vevő",
      phone: phone.trim(),
      boardId,
      boardName: board ? board.name : "",
      sheets: Number(sheets) || 1,
      cuts: cuts.map(c => ({
        w: Number(c.w) || 0,
        h: Number(c.h) || 0,
        qty: Number(c.qty) || 0
      })),
      services: svc,
      note: note.trim(),
      materialCost,
      serviceTotal,
      status: "quoted"
    });
    onClose();
  };
  const inp = "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-orange-400 placeholder:text-stone-400";
  const lbl = "text-[10.5px] uppercase tracking-wide text-stone-400 font-medium";
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: open,
    onClose: onClose,
    title: "\xDAj szab\xE1s-rendel\xE9s",
    subtitle: "Lap + technol\xF3gia \u2192 gyors \xE1raj\xE1nlat",
    width: 580,
    footer: /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between w-full gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] text-stone-500"
    }, "\xC1raj\xE1nlat: ", /*#__PURE__*/React.createElement("span", {
      className: "text-[14px] font-semibold text-stone-900 tabular-nums"
    }, TE2.fmtHuf(total)), " ", /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400"
    }, "+ \xC1FA")), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "send",
      onClick: submit
    }, "\xC1raj\xE1nlat l\xE9trehoz\xE1sa"))
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setImportOpen(true),
    className: "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 text-teal-800 hover:bg-teal-50 transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg bg-teal-100 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "factory",
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-left flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold"
  }, "El\u0151k\xE9sz\xEDt\xE9sb\u0151l import"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-teal-600/80"
  }, importedFrom ? `Importálva: ${importedFrom}` : "Táblaszám, vágáslista és élhossz egy gyártási projektből")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 15,
    className: "text-teal-400"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: lbl
  }, "Vev\u0151"), /*#__PURE__*/React.createElement("input", {
    value: customer,
    onChange: e => setCustomer(e.target.value),
    placeholder: "Eseti vev\u0151",
    className: inp + " mt-1"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: lbl
  }, "Telefon"), /*#__PURE__*/React.createElement("input", {
    value: phone,
    onChange: e => setPhone(e.target.value),
    placeholder: "+36\u2026",
    className: inp + " mt-1"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: lbl
  }, "Lapanyag"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-1"
  }, /*#__PURE__*/React.createElement("select", {
    value: boardId,
    onChange: e => setBoardId(e.target.value),
    className: inp + " flex-1"
  }, boards.map(b => /*#__PURE__*/React.createElement("option", {
    key: b.id,
    value: b.id
  }, b.name, " \u2014 ", TE2.fmtHuf(TE2.sellOf(b, catById[b.catId])), "/", b.unit))), /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center gap-1.5 shrink-0"
  }, /*#__PURE__*/React.createElement(Stepper, {
    qty: Number(sheets) || 0,
    onChange: v => setSheets(Math.max(1, v))
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-500"
  }, "t\xE1bla"))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mt-1 tabular-nums"
  }, sheets, " \xD7 ", TE2.fmtHuf(boardSell), " = ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800"
  }, TE2.fmtHuf(materialCost)), " ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "(elad\xE1si \xE1r)"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: lbl
  }, "Szab\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-stone-100 rounded-lg p-0.5 mt-1"
  }, [{
    k: "fixed",
    l: "Fix tábla-ár"
  }, {
    k: "meter",
    l: "Folyóméter"
  }].map(x => /*#__PURE__*/React.createElement("button", {
    key: x.k,
    onClick: () => setCutMode(x.k),
    className: `flex-1 h-8 rounded-md text-[12px] font-medium transition ${cutMode === x.k ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`
  }, x.l))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mt-1.5 text-[11.5px] px-3 py-2 rounded-lg bg-stone-50"
  }, cutMode === "fixed" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 tabular-nums"
  }, sheets, " t\xE1bla \xD7 ", TE2.fmtHuf(rates ? rates.cutFixed : 0)), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold tabular-nums text-stone-900"
  }, TE2.fmtHuf(cutCost))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 tabular-nums"
  }, cutMeters.toFixed(1), " fm \xD7 ", TE2.fmtHuf(rates ? rates.cutMeter : 0)), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold tabular-nums text-stone-900"
  }, TE2.fmtHuf(cutCost)))), cutMode === "meter" && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1"
  }, "A foly\xF3m\xE9ter a v\xE1g\xE1slista ker\xFCleteib\u0151l sz\xE1mol\xF3dik.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: lbl
  }, "V\xE1g\xE1slista ", cutMode === "meter" && /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300 normal-case"
  }, "\xB7 ", cutMeters.toFixed(1), " fm")), /*#__PURE__*/React.createElement("button", {
    onClick: addCut,
    className: "inline-flex items-center gap-1 text-[11px] text-orange-700 font-medium hover:underline"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), "Sor")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, cuts.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: c.w,
    onChange: e => setCut(i, "w", e.target.value),
    className: "w-full h-8 px-2 rounded-lg border border-stone-200 text-[12px] tabular-nums outline-none focus:border-orange-400",
    placeholder: "sz\xE9l."
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 text-[12px]"
  }, "\xD7"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: c.h,
    onChange: e => setCut(i, "h", e.target.value),
    className: "w-full h-8 px-2 rounded-lg border border-stone-200 text-[12px] tabular-nums outline-none focus:border-orange-400",
    placeholder: "mag."
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 text-[11px]"
  }, "mm"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: c.qty,
    onChange: e => setCut(i, "qty", e.target.value),
    className: "w-16 h-8 px-2 rounded-lg border border-stone-200 text-[12px] tabular-nums outline-none focus:border-orange-400",
    placeholder: "db"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => rmCut(i),
    className: "w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-rose-600 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  })))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: lbl
  }, "\xC9lz\xE1r\xE1s ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300 normal-case"
  }, "\xB7 ", TE2.fmtHuf(edgeCost))), /*#__PURE__*/React.createElement("button", {
    onClick: addEdge,
    className: "inline-flex items-center gap-1 text-[11px] text-orange-700 font-medium hover:underline"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), "\xC9l-t\xE9tel")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, edgeLines.map((e, i) => /*#__PURE__*/React.createElement(EdgeLineRow, {
    key: i,
    line: e,
    rates: rates,
    onChange: (k, v) => setEdge(i, k, v),
    onRemove: edges.length > 1 ? () => rmEdge(i) : null
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: lbl
  }, "Egy\xE9b megmunk\xE1l\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mt-1.5"
  }, extraDefs.map(s => {
    const on = extras.find(x => x.id === s.id);
    return /*#__PURE__*/React.createElement("div", {
      key: s.id,
      className: `flex items-center gap-2.5 px-3 py-2 rounded-lg border transition ${on ? "border-indigo-200 bg-indigo-50/50" : "border-stone-200"}`
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => toggleExtra(s.id),
      className: `w-4 h-4 rounded grid place-items-center shrink-0 ${on ? "bg-indigo-600 text-white" : "border border-stone-300"}`
    }, on && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 11
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-medium text-stone-800 truncate"
    }, s.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 tabular-nums"
    }, TE2.fmtHuf(s.rate), " / ", s.unit)), on && /*#__PURE__*/React.createElement(Stepper, {
      qty: Number(on.qty) || 0,
      onChange: v => setExtraQty(s.id, Math.max(1, v))
    }), on && /*#__PURE__*/React.createElement("div", {
      className: "w-[72px] text-right text-[12px] font-semibold tabular-nums text-stone-900 shrink-0"
    }, TE2.fmtHuf(s.rate * (Number(on.qty) || 0))));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 overflow-hidden"
  }, [["Lapanyag (eladási)", materialCost], ["Szabás", cutCost], ["Élzárás", edgeCost], ["Egyéb", extrasCost]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "flex items-center justify-between px-3 py-1.5 border-b border-stone-100 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, k), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums text-stone-700"
  }, TE2.fmtHuf(v)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-3 py-2 bg-stone-50 text-[13px] font-semibold"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-900"
  }, "\xD6sszesen (nett\xF3)"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums text-stone-900"
  }, TE2.fmtHuf(total)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: lbl
  }, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("textarea", {
    value: note,
    onChange: e => setNote(e.target.value),
    rows: 2,
    placeholder: "Pl. sz\xEDnazonos \xE9l, helysz\xEDni \xE1tv\xE9tel\u2026",
    className: "w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-orange-400 placeholder:text-stone-400 resize-none"
  }))), /*#__PURE__*/React.createElement(CutImportModal, {
    open: importOpen,
    onClose: () => setImportOpen(false),
    projects: projects,
    products: products,
    onApply: applyImport
  }));
}

// ── egy élzárás-sor: vastagság × szélesség × ragasztás → Ft/fm × méter ──────
function EdgeLineRow({
  line,
  rates,
  onChange,
  onRemove
}) {
  const sel = "h-8 px-1.5 rounded-lg border border-stone-200 text-[11.5px] outline-none focus:border-orange-400 bg-white";
  const isOv = TE2.edgeIsOverride(rates, line.t, line.w, line.g);
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 px-2.5 py-2 space-y-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("select", {
    value: line.t,
    onChange: e => onChange("t", e.target.value),
    className: sel + " flex-1 min-w-0"
  }, (rates ? rates.edgeThickness : []).map(o => /*#__PURE__*/React.createElement("option", {
    key: o.id,
    value: o.id
  }, o.name))), /*#__PURE__*/React.createElement("select", {
    value: line.w,
    onChange: e => onChange("w", e.target.value),
    className: sel + " flex-1 min-w-0"
  }, (rates ? rates.edgeWidth : []).map(o => /*#__PURE__*/React.createElement("option", {
    key: o.id,
    value: o.id
  }, o.name))), /*#__PURE__*/React.createElement("select", {
    value: line.g,
    onChange: e => onChange("g", e.target.value),
    className: sel + " flex-1 min-w-0"
  }, (rates ? rates.edgeGlue : []).map(o => /*#__PURE__*/React.createElement("option", {
    key: o.id,
    value: o.id
  }, o.name))), onRemove && /*#__PURE__*/React.createElement("button", {
    onClick: onRemove,
    className: "w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-rose-600 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center gap-1.5 text-[11px] text-stone-500"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: line.meters,
    onChange: e => onChange("meters", e.target.value),
    className: "w-16 h-7 px-2 rounded-md border border-stone-200 text-[12px] tabular-nums outline-none focus:border-orange-400"
  }), /*#__PURE__*/React.createElement("span", null, "fm \xD7 ", TE2.fmtHuf(line.rate), "/fm ", isOv && /*#__PURE__*/React.createElement("span", {
    className: "text-orange-600"
  }, "(egyedi)"))), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-semibold tabular-nums text-stone-900"
  }, TE2.fmtHuf(line.cost))));
}

// ── Előkészítésből import: gyártási projekt → MfgPrep levezetés ──────────────
function CutImportModal({
  open,
  onClose,
  projects,
  products,
  onApply
}) {
  const derived = useTrM2(() => {
    if (!open || !window.MfgPrep) return [];
    return (projects || []).map(p => {
      let prep = null;
      try {
        prep = window.MfgPrep.derive(p);
      } catch (e) {
        prep = null;
      }
      if (!prep) return null;
      // domináns lapanyag → bolti termék párosítás kód/név alapján
      const topMat = (prep.materials || [])[0];
      let match = null;
      if (topMat) match = (products || []).find(pr => pr.catId === "lap" && (pr.name.toLowerCase().includes((topMat.name || "").toLowerCase().split(" ")[0]) || (topMat.name || "").toLowerCase().includes(pr.name.toLowerCase().split(" ")[0])));
      const cuts = (prep.cutlist || []).slice(0, 8).map(c => ({
        w: c.w,
        h: c.h,
        qty: c.qty
      }));
      return {
        projectId: p.id,
        projectName: p.name,
        customer: p.customer,
        sheets: prep.totals.sheets,
        parts: prep.qty.parts,
        edgeMeters: prep.qty.edgeM,
        boardId: match ? match.id : null,
        boardName: match ? match.name : topMat ? topMat.name : "—",
        cuts,
        items: prep.items.length
      };
    }).filter(Boolean);
  }, [open, projects, products]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[60]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-stone-900/40 backdrop-blur-[1px]",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-x-3 top-[8vh] mx-auto max-w-lg bg-white rounded-2xl shadow-2xl max-h-[80vh] flex flex-col overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3.5 border-b border-stone-200 flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-lg bg-teal-50 text-teal-700 grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "factory",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13.5px] font-semibold text-stone-900"
  }, "El\u0151k\xE9sz\xEDt\xE9sb\u0151l import"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, "V\xE1lassz egy gy\xE1rt\xE1si projektet \u2014 az el\u0151k\xE9sz\xEDt\xE9s adja az \xE1raz\xE1si adatokat.")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-8 h-8 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "overflow-y-auto px-3 py-3 space-y-2"
  }, derived.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "py-10 text-center text-[12px] text-stone-400"
  }, "Nincs levezethet\u0151 gy\xE1rt\xE1si projekt."), derived.map(d => /*#__PURE__*/React.createElement("button", {
    key: d.projectId,
    onClick: () => onApply(d),
    className: "w-full text-left rounded-xl border border-stone-200 hover:border-teal-300 hover:bg-teal-50/40 transition p-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900 truncate"
  }, d.projectName), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] font-mono text-stone-400 shrink-0"
  }, d.projectId)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mt-0.5 truncate"
  }, d.customer, " \xB7 ", d.items, " t\xE9tel \xB7 lap: ", d.boardName), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-2"
  }, [["Tábla", d.sheets], ["Vágás", d.parts + " db"], ["Élhossz", d.edgeMeters.toFixed(1) + " fm"]].map(([k, v]) => /*#__PURE__*/React.createElement("span", {
    key: k,
    className: "inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 tabular-nums"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, k, ":"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, v)))))))));
}

// ════════════════════════════════════════════════════════════════════════════
// ÁRRÉS-MOTOR — markup ↔ árrés kategóriánként és tételenként
// ════════════════════════════════════════════════════════════════════════════
function TradePricing() {
  const sim = useSim();
  const cats = sim.tradeCategories || [];
  const products = sim.tradeProducts || [];
  const catById = useTrM2(() => Object.fromEntries(cats.map(c => [c.id, c])), [cats]);
  const [tab, setTab] = useTr2("categories");
  const [pcat, setPcat] = useTr2("all");
  const shownProducts = products.filter(p => pcat === "all" ? true : p.catId === pcat);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold tracking-tight text-stone-900"
  }, "\xC1rr\xE9s-motor"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, "Kereskedelmi \xE1raz\xE1s: beszerz\xE9si \xE1r \u2192 markup \u2192 elad\xE1si \xE1r. Az \xE1r a Pulton \xE9s a Lapszab\xE1szatban is innen j\xF6n.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5"
  }, [{
    k: "categories",
    l: "Kategóriák"
  }, {
    k: "products",
    l: "Tételek"
  }, {
    k: "services",
    l: "Szolgáltatás-árazás"
  }].map(x => /*#__PURE__*/React.createElement("button", {
    key: x.k,
    onClick: () => setTab(x.k),
    className: `px-3 h-8 rounded-md text-[12.5px] font-medium ${tab === x.k ? "bg-orange-600 text-white" : "text-stone-600 hover:bg-stone-100"}`
  }, x.l)))), tab !== "services" && /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200/70"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-7 h-7 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-amber-900 leading-relaxed"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Markup \u2260 \xE1rr\xE9s."), " A ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "markup"), " a beszerz\xE9si \xE1rra vet\xEDtett szorz\xF3 (elad\xE1si / beszerz\xE9s), az ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "\xE1rr\xE9s %"), " a haszon az elad\xE1si \xE1rhoz k\xE9pest (haszon / elad\xE1s). Pl. 1,5\xD7 markup = 33,3% \xE1rr\xE9s. A k\xE9t mez\u0151 ugyanazt \xE1ll\xEDtja \u2014 b\xE1rmelyiket m\xF3dos\xEDthatod.")), tab === "services" ? /*#__PURE__*/React.createElement(ServicePricing, {
    rates: sim.tradeServiceRates
  }) : tab === "categories" ? /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 xl:grid-cols-3 gap-3"
  }, cats.map(c => /*#__PURE__*/React.createElement(CatPricingCard, {
    key: c.id,
    cat: c
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5 overflow-x-auto max-w-full w-fit"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPcat("all"),
    className: `px-2.5 h-7 rounded-md text-[11.5px] font-medium whitespace-nowrap ${pcat === "all" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`
  }, "\xD6sszes"), cats.map(c => {
    const tone = TRADE_CAT_TONE[c.color] || TRADE_CAT_TONE.stone;
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: () => setPcat(c.id),
      className: `px-2.5 h-7 rounded-md text-[11.5px] font-medium whitespace-nowrap inline-flex items-center gap-1.5 ${pcat === c.id ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-2 h-2 rounded-full ${tone.dot}`
    }), c.short);
  })), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[minmax(0,1.6fr)_90px_120px_110px_110px_100px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("div", null, "Term\xE9k"), /*#__PURE__*/React.createElement("div", null, "Kateg\xF3ria"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Beszerz\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Markup"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Elad\xE1si (nett\xF3)"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "\xC1rr\xE9s")), shownProducts.map(p => /*#__PURE__*/React.createElement(ProductPricingRow, {
    key: p.id,
    p: p,
    cat: catById[p.catId]
  })))));
}
function CatPricingCard({
  cat
}) {
  const tone = TRADE_CAT_TONE[cat.color] || TRADE_CAT_TONE.stone;
  const margin = TE2.markupToMargin(cat.markup);
  const mTone = TE2.marginTone(margin);
  const example = 10000;
  const exSell = TE2.sell(example, cat.markup);
  const [minR, maxR] = cat.range;
  return /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-7 h-7 rounded-lg grid place-items-center ${tone.bg} ${tone.fg}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: cat.icon,
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, cat.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 tabular-nums"
  }, "Ipar\xE1gi s\xE1v: ", TE2.fmtX(minR), "\u2013", TE2.fmtX(maxR)))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 my-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Markup (\xD7)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.05",
    min: "1",
    max: "9.99",
    value: Math.round(cat.markup * 100) / 100,
    onChange: e => window.sim.setTradeMarkup(cat.id, e.target.value),
    className: "w-full mt-1 h-9 px-2.5 rounded-lg border border-stone-200 text-[13px] font-semibold tabular-nums outline-none focus:border-orange-400"
  })), /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, "\xC1rr\xE9s (%)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "1",
    min: "0",
    max: "95",
    value: Math.round(margin),
    onChange: e => window.sim.setTradeMargin(cat.id, e.target.value),
    className: "w-full mt-1 h-9 px-2.5 rounded-lg border border-stone-200 text-[13px] font-semibold tabular-nums outline-none focus:border-orange-400"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "h-1.5 rounded-full bg-stone-100 overflow-hidden mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full rounded-full ${mTone.bar}`,
    style: {
      width: `${Math.min(100, margin)}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-stone-50"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 tabular-nums"
  }, "Pl. ", TE2.fmtHuf(example), " beszerz\xE9s"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, "\u2192 ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-900"
  }, TE2.fmtHuf(exSell)), " ", /*#__PURE__*/React.createElement("span", {
    className: mTone.fg
  }, "(", TE2.fmtPct(margin), ")"))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-2 leading-snug"
  }, cat.note));
}
function ProductPricingRow({
  p,
  cat
}) {
  const tone = TRADE_CAT_TONE[cat ? cat.color : "stone"] || TRADE_CAT_TONE.stone;
  const markup = TE2.productMarkup(p, cat);
  const sell = TE2.sellOf(p, cat);
  const margin = TE2.markupToMargin(markup);
  const mTone = TE2.marginTone(margin);
  const overridden = p.markup != null && p.markup !== "";
  return /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 grid md:grid-cols-[minmax(0,1.6fr)_90px_120px_110px_110px_100px] gap-x-3 gap-y-2 items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 truncate"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 font-mono truncate"
  }, p.sku)), /*#__PURE__*/React.createElement("div", {
    className: "md:block"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${tone.bg} ${tone.fg}`
  }, cat ? cat.short : "—")), /*#__PURE__*/React.createElement("label", {
    className: "flex md:block items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "md:hidden text-[10.5px] text-stone-400"
  }, "Beszerz\xE9s"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: p.purchase,
    onChange: e => window.sim.setTradeProductCost(p.id, e.target.value),
    className: "w-28 md:w-full h-8 px-2 rounded-lg border border-stone-200 text-[12px] tabular-nums text-right outline-none focus:border-orange-400"
  })), /*#__PURE__*/React.createElement("label", {
    className: "flex md:block items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "md:hidden text-[10.5px] text-stone-400"
  }, "Markup"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.05",
    value: overridden ? Math.round(p.markup * 100) / 100 : "",
    placeholder: `${Math.round(markup * 100) / 100} (alap)`,
    onChange: e => window.sim.setTradeProductMarkup(p.id, e.target.value),
    className: `w-28 md:w-full h-8 px-2 rounded-lg border text-[12px] tabular-nums text-right outline-none focus:border-orange-400 ${overridden ? "border-orange-300 bg-orange-50/50" : "border-stone-200"}`
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex md:block items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "md:hidden text-[10.5px] text-stone-400"
  }, "Elad\xE1si"), /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold tabular-nums text-stone-900 md:text-right md:block"
  }, TE2.fmtHuf(sell))), /*#__PURE__*/React.createElement("div", {
    className: "flex md:justify-end items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "md:hidden text-[10.5px] text-stone-400"
  }, "\xC1rr\xE9s"), /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 text-[11.5px] font-semibold tabular-nums px-2 py-0.5 rounded-full ${mTone.bg} ${mTone.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${mTone.dot}`
  }), TE2.fmtPct(margin))));
}

// ════════════════════════════════════════════════════════════════════════════
// SZOLGÁLTATÁS-ÁRAZÁS — szabás-módok + élzárás-paraméterek + egyéb
// ════════════════════════════════════════════════════════════════════════════
function ServicePricing({
  rates
}) {
  if (!rates) return /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 py-8 text-center"
  }, "Nincs bet\xF6lt\xF6tt szolg\xE1ltat\xE1s-\xE1rlista.");
  const num = "h-9 px-2.5 rounded-lg border border-stone-200 text-[13px] font-semibold tabular-nums outline-none focus:border-orange-400";
  const lbl = "text-[10px] uppercase tracking-wide text-stone-400 font-medium";

  // élzárás ár-mátrix: minden vastagság × szélesség × ragasztás
  const combos = [];
  (rates.edgeThickness || []).forEach(t => (rates.edgeWidth || []).forEach(w => (rates.edgeGlue || []).forEach(g => combos.push({
    t,
    w,
    g
  }))));
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 mb-1"
  }, "Szab\xE1s-m\xF3dok"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mb-3"
  }, "A szab\xE1s-rendel\u0151 mindk\xE9t m\xF3dot k\xEDn\xE1lja: fix t\xE1bla-\xE1r vagy foly\xF3m\xE9ter-alap\xFA kalkul\xE1ci\xF3."), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-800"
  }, "Fix t\xE1bla-\xE1r"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mb-2"
  }, "T\xE1bl\xE1nk\xE9nti \xE1tal\xE1ny a szab\xE1s\xE9rt."), /*#__PURE__*/React.createElement("label", {
    className: lbl
  }, "Ft / t\xE1bla"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: rates.cutFixed,
    onChange: e => window.sim.setCutRate("fixed", e.target.value),
    className: num + " w-full mt-1"
  })), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-800"
  }, "Foly\xF3m\xE9ter-szab\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mb-2"
  }, "A v\xE1g\xE1shossz (foly\xF3m\xE9ter) alapj\xE1n."), /*#__PURE__*/React.createElement("label", {
    className: lbl
  }, "Ft / fm"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: rates.cutMeter,
    onChange: e => window.sim.setCutRate("meter", e.target.value),
    className: num + " w-full mt-1"
  })))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 flex-wrap mb-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "\xC9lz\xE1r\xE1s"), /*#__PURE__*/React.createElement("label", {
    className: "inline-flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: lbl
  }, "Alap Ft/fm"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: rates.edgeBase,
    onChange: e => window.sim.setEdgeBase(e.target.value),
    className: num + " w-24"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mb-3"
  }, "A technol\xF3giai param\xE9terek ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-600"
  }, "szorz\xF3k\xE9nt"), " hatnak az alap fm-d\xEDjra. A m\xE1trixban minden kombin\xE1ci\xF3hoz konkr\xE9t Ft/fm is megadhat\xF3 (egyedi fel\xFCl\xEDr\xE1s)."), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-3 gap-3 mb-4"
  }, [["edgeThickness", "Vastagság"], ["edgeWidth", "Szélesség"], ["edgeGlue", "Ragasztás"]].map(([dim, title]) => /*#__PURE__*/React.createElement("div", {
    key: dim,
    className: "rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-medium text-stone-700 mb-2"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, (rates[dim] || []).map(o => /*#__PURE__*/React.createElement("div", {
    key: o.id,
    className: "flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-600 truncate"
  }, o.name), /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center gap-1 shrink-0"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.05",
    value: o.mult,
    onChange: e => window.sim.setEdgeParamMult(dim, o.id, e.target.value),
    className: "w-16 h-8 px-2 rounded-md border border-stone-200 text-[12px] tabular-nums text-right outline-none focus:border-orange-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, "\xD7")))))))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-medium text-stone-700 mb-1.5"
  }, "\xC1r-m\xE1trix ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-normal"
  }, "(Ft/fm \u2014 \xFCres = szorz\xF3s alap, be\xEDrt \xE9rt\xE9k = egyedi)")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[1.4fr_1fr_1fr_0.9fr] gap-2 px-3 py-2 bg-stone-50/60 text-[10px] uppercase tracking-wide text-stone-500 border-b border-stone-200/70"
  }, /*#__PURE__*/React.createElement("div", null, "Vastags\xE1g \xB7 Sz\xE9less\xE9g \xB7 Ragaszt\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Sz\xE1m\xEDtott"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Egyedi Ft/fm"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "\xC9rv\xE9nyes")), combos.map(({
    t,
    w,
    g
  }) => {
    const key = TE2.edgeKey(t.id, w.id, g.id);
    const computed = Math.round(rates.edgeBase * t.mult * w.mult * g.mult / 5) * 5;
    const ov = rates.edgeOverrides ? rates.edgeOverrides[key] : null;
    const effective = TE2.edgeRate(rates, t.id, w.id, g.id);
    const isOv = ov != null && ov !== "";
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      className: "grid grid-cols-[1.4fr_1fr_1fr_0.9fr] gap-2 px-3 py-1.5 border-b border-stone-100 last:border-0 items-center text-[11.5px]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-stone-700 truncate"
    }, t.name, " \xB7 ", w.name, " \xB7 ", g.name), /*#__PURE__*/React.createElement("div", {
      className: "text-right tabular-nums text-stone-400"
    }, TE2.fmtHuf(computed)), /*#__PURE__*/React.createElement("div", {
      className: "flex justify-end"
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: isOv ? ov : "",
      placeholder: "\u2014",
      onChange: e => window.sim.setEdgeOverride(key, e.target.value),
      className: `w-20 h-7 px-2 rounded-md border text-[11.5px] tabular-nums text-right outline-none focus:border-orange-400 ${isOv ? "border-orange-300 bg-orange-50/50" : "border-stone-200"}`
    })), /*#__PURE__*/React.createElement("div", {
      className: `text-right tabular-nums font-semibold ${isOv ? "text-orange-700" : "text-stone-700"}`
    }, TE2.fmtHuf(effective)));
  }))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 mb-3"
  }, "Egy\xE9b megmunk\xE1l\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-3 gap-3"
  }, (rates.extras || []).map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    className: "rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-800"
  }, s.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mb-2"
  }, "Ft / ", s.unit), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: s.rate,
    onChange: e => window.sim.setTradeExtraRate(s.id, e.target.value),
    className: num + " w-full"
  }))))));
}
Object.assign(window, {
  TradeCutting,
  TradePricing
});
})();
