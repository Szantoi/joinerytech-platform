/* AUTO-GENERATED from page-orders.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// Page: Orders
const {
  useState: useStateO,
  useMemo: useMemoO,
  useEffect: useEffectO
} = React;
function OrderRow({
  o,
  t,
  isOpen,
  onToggle,
  onNav,
  onOpenDetail
}) {
  // Combine static order status with any live flow updates from window.orderFlow
  const flow = useOrderFlow(o.id);
  const liveStatus = flow.calcStatus || o.status;
  const isCalculating = flow.calc;
  return /*#__PURE__*/React.createElement("div", {
    className: "border-b border-stone-100 last:border-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onToggle,
    className: "w-full text-left hover:bg-stone-50/70"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[160px_1fr_120px_110px_140px_130px_28px_28px] gap-4 px-5 py-3 items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-mono text-stone-500"
  }, o.id), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 truncate"
  }, o.customer), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-600"
  }, t.orders.types[o.type]), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-mono text-stone-500"
  }, o.date), /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: liveStatus,
    label: t.status[liveStatus]
  }), isCalculating && /*#__PURE__*/React.createElement("span", {
    className: "text-teal-600"
  }, /*#__PURE__*/React.createElement(Spinner, {
    size: 11
  }))), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 text-right tabular-nums"
  }, fmtHUF(o.total)), /*#__PURE__*/React.createElement("div", {
    className: `text-stone-400 transition ${isOpen ? "rotate-90" : ""}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    onClick: e => {
      e.stopPropagation();
      onOpenDetail && onOpenDetail(o.id);
    },
    className: "w-7 h-7 grid place-items-center rounded text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition cursor-pointer"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 13
  }))), /*#__PURE__*/React.createElement("div", {
    className: "md:hidden flex items-center gap-3 px-4 py-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[13.5px] font-medium text-stone-900 truncate"
  }, o.customer), isCalculating && /*#__PURE__*/React.createElement("span", {
    className: "text-teal-600 shrink-0"
  }, /*#__PURE__*/React.createElement(Spinner, {
    size: 11
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-1"
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: liveStatus,
    label: t.status[liveStatus]
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-mono text-stone-500 truncate"
  }, o.id))), /*#__PURE__*/React.createElement("div", {
    className: "text-right shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 tabular-nums"
  }, fmtHUF(o.total)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-mono text-stone-400"
  }, o.date)), /*#__PURE__*/React.createElement("div", {
    className: `text-stone-300 transition shrink-0 ${isOpen ? "rotate-90" : ""}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 15
  })))), isOpen && /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 pb-5 pt-2 bg-stone-50/40 border-t border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-3"
  }, [{
    label: "Tételszám",
    value: `${o.items} ${t.common.pieces}`
  }, {
    label: "Anyag",
    value: o.type === "door" ? "Tölgy 40mm" : o.type === "cabinet" ? "Bükk 18mm + MDF" : "Egyedi"
  }, {
    label: "Élzárás",
    value: "ABS 2mm színazonos"
  }, {
    label: "Felület",
    value: o.type === "door" ? "Olajos lazúr" : "Lakkozott"
  }].map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-white border border-stone-200/70 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500"
  }, b.label), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-900 mt-0.5"
  }, b.value)))), (liveStatus === "ready" || liveStatus === "released") && flow.anyagItems && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-stone-200/70 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-semibold text-stone-900"
  }, "Anyaglista"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-emerald-700 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 10
  }), "gener\xE1lva")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline gap-2 mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[20px] font-semibold tabular-nums text-stone-900"
  }, flow.anyagItems), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-500"
  }, "t\xE9tel")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 tabular-nums"
  }, "Becs\xFClt anyagk\xF6lts\xE9g: ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, fmtHUF(flow.anyagValue))), /*#__PURE__*/React.createElement("button", {
    className: "mt-2 text-[11px] text-teal-700 hover:underline inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 11
  }), "Anyaglista megnyit\xE1sa")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-stone-200/70 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-semibold text-stone-900"
  }, "V\xE1g\xF3tervek"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-emerald-700 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 10
  }), "gener\xE1lva")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline gap-2 mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[20px] font-semibold tabular-nums text-stone-900"
  }, flow.plans), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-500"
  }, "terv \xB7 ", flow.sheets, " t\xE1bla")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, "Optimaliz\xE1l\xE1s: ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, "86% \xE1tlag kihaszn\xE1l\xE1s")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav && onNav("production"),
    className: "mt-2 text-[11px] text-teal-700 hover:underline inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 11
  }), "Megnyit szab\xE1szaton"))), liveStatus === "released" && /*#__PURE__*/React.createElement("div", {
    className: "mb-3 px-3.5 py-2.5 rounded-lg border border-emerald-200/70 bg-emerald-50/60 flex items-center gap-2 text-[11.5px] text-emerald-900"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-emerald-500"
  }), "Kiadva gy\xE1rt\xE1sba \u2014 k\xF6vethet\u0151 a", /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav && onNav("workflow"),
    className: "font-medium underline underline-offset-2"
  }, "Munkafolyamat"), "n\xE9zetben."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "external"
  }, t.common.cuttingPlan), /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "download"
  }, t.common.pdf), /*#__PURE__*/React.createElement(AskAboutButton, {
    entity: {
      type: "order",
      id: o.id,
      label: o.id,
      sub: o.customer
    }
  }), /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "box",
    onClick: () => window.sim?.requisitionForOrder(o.id)
  }, "Beszerz\xE9s ind\xEDt\xE1sa"), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:block flex-1"
  }), liveStatus === "draft" && /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: isCalculating ? null : "check",
    onClick: () => !isCalculating && window.simulateCalc(o.id)
  }, isCalculating ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Spinner, {
    size: 11
  }), "Sz\xE1m\xEDt\xE1s folyamatban\u2026") : /*#__PURE__*/React.createElement(React.Fragment, null, "Sz\xE1m\xEDt\xE1s ind\xEDt\xE1sa")), liveStatus === "calc" && !isCalculating && /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "check",
    onClick: () => window.simulateCalc(o.id)
  }, "Sz\xE1m\xEDt\xE1s \xFAjraind\xEDt\xE1sa"), liveStatus === "ready" && /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "external",
    onClick: () => {
      window.releaseToWorkflow(o.id);
      window.sim?.releaseOrder(o.id);
    }
  }, "Kiad\xE1s gy\xE1rt\xE1sba"), liveStatus === "released" && /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "external",
    onClick: () => onNav && onNav("workflow")
  }, "Munkafolyamat megnyit\xE1sa"))));
}
function OrdersPage({
  t,
  onNav,
  customerLabel
}) {
  const sim = useSim();
  const ORDERS = sim.orders;
  const [filter, setFilter] = useStateO("all");
  const [expanded, setExpanded] = useStateO(null);
  const [showNew, setShowNew] = useStateO(false);
  const [openDetailId, setOpenDetailId] = useStateO(null);

  // Deep-link: auto-expand a specific order on mount if signalled
  useEffectO(() => {
    const p = window._pendingOpen;
    if (!p || p.type !== "order") return;
    window._pendingOpen = null;
    setExpanded(p.id);
    setFilter("all");
  }, []);
  const counts = useMemoO(() => {
    const c = {
      all: ORDERS.length,
      draft: 0,
      calc: 0,
      ready: 0,
      released: 0
    };
    ORDERS.forEach(o => {
      c[o.status] = (c[o.status] || 0) + 1;
    });
    return c;
  }, [ORDERS]);
  const filtered = filter === "all" ? ORDERS : ORDERS.filter(o => o.status === filter);
  const filters = ["all", "draft", "calc", "ready", "released"];
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-4 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5 overflow-x-auto max-w-full"
  }, filters.map(f => /*#__PURE__*/React.createElement("button", {
    key: f,
    onClick: () => setFilter(f),
    className: `px-2.5 h-7 rounded-md text-[12px] inline-flex items-center gap-1.5 whitespace-nowrap ${filter === f ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`
  }, f === "all" ? t.common.all : t.status[f], /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] tabular-nums ${filter === f ? "text-white/60" : "text-stone-400"}`
  }, counts[f] || 0)))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "filter"
  }, t.common.filter), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: () => setShowNew(true)
  }, t.orders.newOrder)), /*#__PURE__*/React.createElement(NewOrderDrawer, {
    open: showNew,
    onClose: () => setShowNew(false),
    t: t
  }), /*#__PURE__*/React.createElement(Card, {
    className: "overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[160px_1fr_120px_110px_140px_130px_28px_28px] gap-4 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium border-b border-stone-200/80 bg-stone-50/60"
  }, /*#__PURE__*/React.createElement("div", null, t.orders.cols.id), /*#__PURE__*/React.createElement("div", null, customerLabel || t.orders.cols.customer), /*#__PURE__*/React.createElement("div", null, t.orders.cols.type), /*#__PURE__*/React.createElement("div", null, t.orders.cols.date), /*#__PURE__*/React.createElement("div", null, t.orders.cols.status), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, t.orders.cols.total), /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", null)), filtered.map(o => /*#__PURE__*/React.createElement(OrderRow, {
    key: o.id,
    o: o,
    t: t,
    isOpen: expanded === o.id,
    onToggle: () => setExpanded(expanded === o.id ? null : o.id),
    onNav: onNav,
    onOpenDetail: id => setOpenDetailId(id)
  }))), openDetailId && /*#__PURE__*/React.createElement(SlideOver, {
    open: true,
    onClose: () => setOpenDetailId(null),
    title: openDetailId,
    subtitle: ORDERS.find(o => o.id === openDetailId)?.customer || "",
    width: 560,
    footer: /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setOpenDetailId(null)
    }, "Bez\xE1r\xE1s")
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-5"
  }, /*#__PURE__*/React.createElement(OrderRow, {
    o: ORDERS.find(o => o.id === openDetailId),
    t: t,
    isOpen: true,
    onToggle: () => {},
    onNav: onNav
  }))));
}
window.OrdersPage = OrdersPage;
})();
