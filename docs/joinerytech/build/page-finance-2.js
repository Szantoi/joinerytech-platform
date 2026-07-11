/* AUTO-GENERATED from page-finance-2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-finance-2.jsx — PÉNZÜGY világ (2/2)
//   Áttekintés (cash-flow / kintlévőség / lejárt) · Bejövő (szállítói) számlák · Kifizetések.
//   A megosztott elemek (InvoiceSlideOver, FinInvoiceRow, FinStatusPill, finFmt, FinMiniStat,
//   FinMethodBadge) a page-finance.jsx-ből, window-ról érhetők el.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateF2
} = React;

// Nagy KPI-kártya (áttekintő)
function FinKpi({
  label,
  value,
  sub,
  tone = "stone",
  icon
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    stone: "bg-stone-100 text-stone-600"
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-stone-200/80 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-8 h-8 rounded-lg grid place-items-center ${tones[tone]}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, label)), /*#__PURE__*/React.createElement("div", {
    className: "text-[22px] font-semibold text-stone-900 tabular-nums leading-none"
  }, value), sub && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-1.5"
  }, sub));
}

// ── Áttekintés ────────────────────────────────────────────────────────────────
function FinanceDashboard({
  onScreen
}) {
  const sim = useSim();
  const stats = window.sim.finStats();
  const [openInv, setOpenInv] = useStateF2(null);
  const all = sim.finInvoices || [];
  const overdueOut = all.filter(i => i.dir === "out" && window.sim.finIsOverdue(i)).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  const duePayables = all.filter(i => i.dir === "in" && (i.status === "issued" || i.status === "partial")).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  const liveOpen = openInv ? all.find(x => x.id === openInv.id) || null : null;
  const cashMax = Math.max(stats.cashIn, stats.cashOut, 1);
  const monthLabel = "2026. április";
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-4 gap-3"
  }, /*#__PURE__*/React.createElement(FinKpi, {
    label: "Kintl\xE9v\u0151s\xE9g",
    tone: "amber",
    icon: "receipt",
    value: finFmt(stats.receivable, "HUF"),
    sub: stats.receivableOverdue > 0 ? `ebből lejárt: ${finFmt(stats.receivableOverdue, "HUF")}` : "nincs lejárt tétel"
  }), /*#__PURE__*/React.createElement(FinKpi, {
    label: "Fizetend\u0151",
    tone: "sky",
    icon: "external",
    value: finFmt(stats.payable, "HUF"),
    sub: stats.payableOverdue > 0 ? `ebből lejárt: ${finFmt(stats.payableOverdue, "HUF")}` : "nincs lejárt tétel"
  }), /*#__PURE__*/React.createElement(FinKpi, {
    label: "Lej\xE1rt \xF6sszesen",
    tone: "rose",
    icon: "alert",
    value: finFmt(stats.receivableOverdue + stats.payableOverdue, "HUF"),
    sub: `${overdueOut.length} kintlévő · ${duePayables.filter(i => window.sim.finIsOverdue(i)).length} fizetendő`
  }), /*#__PURE__*/React.createElement(FinKpi, {
    label: "Nett\xF3 p\xE9nz\xE1ram",
    tone: stats.net >= 0 ? "emerald" : "rose",
    icon: "analytics",
    value: (stats.net >= 0 ? "+" : "") + finFmt(stats.net, "HUF"),
    sub: `${monthLabel}`
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-3 gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-2 bg-white border border-stone-200/80 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-800"
  }, "P\xE9nz\xE1ram \u2014 ", monthLabel), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400"
  }, "befizet\xE9sek vs. kifizet\xE9sek")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11.5px] mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-emerald-500"
  }), "Bev\xE9tel (befizet\xE9s)"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800 tabular-nums"
  }, finFmt(stats.cashIn, "HUF"))), /*#__PURE__*/React.createElement("div", {
    className: "h-2.5 rounded-full bg-stone-100 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full rounded-full bg-emerald-500",
    style: {
      width: stats.cashIn / cashMax * 100 + "%"
    }
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11.5px] mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-rose-400"
  }), "Kiad\xE1s (kifizet\xE9s)"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800 tabular-nums"
  }, finFmt(stats.cashOut, "HUF"))), /*#__PURE__*/React.createElement("div", {
    className: "h-2.5 rounded-full bg-stone-100 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full rounded-full bg-rose-400",
    style: {
      width: stats.cashOut / cashMax * 100 + "%"
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-3 border-t border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-500"
  }, "Egyenleg"), /*#__PURE__*/React.createElement("span", {
    className: `text-[16px] font-bold tabular-nums ${stats.net >= 0 ? "text-emerald-600" : "text-rose-600"}`
  }, (stats.net >= 0 ? "+" : "") + finFmt(stats.net, "HUF")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-stone-200/80 rounded-xl p-4 flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-800 mb-3"
  }, "Teend\u0151k"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 flex-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("outgoing"),
    className: "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-left transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg bg-stone-200 text-stone-600 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-700 flex-1"
  }, "Ki\xE1ll\xEDtatlan piszkozat"), /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-stone-900"
  }, stats.draftCount)), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("outgoing"),
    className: "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-left transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg bg-rose-100 text-rose-600 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-rose-700 flex-1"
  }, "Lej\xE1rt kintl\xE9v\u0151s\xE9g"), /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-rose-700"
  }, overdueOut.length)), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("incoming"),
    className: "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-left transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg bg-sky-100 text-sky-600 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-sky-700 flex-1"
  }, "Nyitott fizetend\u0151"), /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-sky-700"
  }, duePayables.length))))), /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-800"
  }, "Lej\xE1rt kintl\xE9v\u0151s\xE9gek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("outgoing"),
    className: "text-[11.5px] text-emerald-700 hover:underline"
  }, "\xD6sszes \u2192")), overdueOut.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-8 text-center text-[12px] text-stone-400"
  }, "Nincs lej\xE1rt kintl\xE9v\u0151s\xE9g. \uD83C\uDF89") : /*#__PURE__*/React.createElement("div", null, overdueOut.slice(0, 5).map(inv => /*#__PURE__*/React.createElement(FinInvoiceRow, {
    key: inv.id,
    inv: inv,
    onOpen: setOpenInv
  })))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-800"
  }, "Esed\xE9kes fizetend\u0151k"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("incoming"),
    className: "text-[11.5px] text-emerald-700 hover:underline"
  }, "\xD6sszes \u2192")), duePayables.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-8 text-center text-[12px] text-stone-400"
  }, "Nincs nyitott fizetend\u0151.") : /*#__PURE__*/React.createElement("div", null, duePayables.slice(0, 5).map(inv => /*#__PURE__*/React.createElement(FinInvoiceRow, {
    key: inv.id,
    inv: inv,
    onOpen: setOpenInv
  }))))), /*#__PURE__*/React.createElement(InvoiceSlideOver, {
    inv: liveOpen,
    onClose: () => setOpenInv(null)
  }));
}

// ── Bejövő (szállítói) számlák ────────────────────────────────────────────────
const FIN_IN_FILTERS = [{
  key: "all",
  label: "Mind"
}, {
  key: "open",
  label: "Nyitott"
}, {
  key: "overdue",
  label: "Lejárt"
}, {
  key: "paid",
  label: "Fizetve"
}];
function FinanceIncoming() {
  const sim = useSim();
  const [openInv, setOpenInv] = useStateF2(null);
  const [q, setQ] = useStateF2("");
  const [filter, setFilter] = useStateF2("all");
  const all = (sim.finInvoices || []).filter(i => i.dir === "in");
  const rows = all.filter(i => {
    const eff = window.sim.finEffectiveStatus(i);
    if (filter === "open" && !(eff === "issued" || eff === "partial" || eff === "overdue")) return false;
    if (filter === "overdue" && eff !== "overdue") return false;
    if (filter === "paid" && i.status !== "paid") return false;
    if (q && !`${i.id} ${i.party} ${i.orderRef || ""} ${i.extNo || ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const liveOpen = openInv ? sim.finInvoices.find(x => x.id === openInv.id) || null : null;
  const payableTotal = all.filter(i => i.status === "issued" || i.status === "partial").reduce((a, i) => a + finToHuf(window.sim.finBalance(i), i), 0);
  const overdueCount = all.filter(i => window.sim.finIsOverdue(i)).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 gap-3 mb-5"
  }, /*#__PURE__*/React.createElement(FinMiniStat, {
    label: "Fizetend\u0151 \xF6sszesen",
    value: finFmt(payableTotal, "HUF"),
    tone: "sky",
    icon: "external"
  }), /*#__PURE__*/React.createElement(FinMiniStat, {
    label: "Lej\xE1rt fizetend\u0151",
    value: `${overdueCount} db`,
    tone: overdueCount ? "rose" : "stone",
    icon: "alert"
  }), /*#__PURE__*/React.createElement(FinMiniStat, {
    label: "Sz\xE1ll\xEDt\xF3i sz\xE1mla",
    value: `${all.length} db`,
    tone: "stone",
    icon: "receipt"
  })), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-emerald-50/60 border border-emerald-100 px-3.5 py-2.5 mb-4 flex items-start gap-2 text-[11.5px] text-emerald-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 14,
    className: "mt-px shrink-0 text-emerald-600"
  }), /*#__PURE__*/React.createElement("span", null, "A sz\xE1ll\xEDt\xF3i sz\xE1ml\xE1k a Beszerz\xE9sb\u0151l ker\xFClnek ide gy\u0171jt\xE9sre. A Beszerz\xE9s csak a megrendel\xE9s ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "lesz\xE1ml\xE1zotts\xE1g\xE1t"), " jelzi \u2014 a teljes p\xE9nz\xFCgyi kezel\xE9s (kifizet\xE9s, sztorn\xF3) itt t\xF6rt\xE9nik.")), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    className: "px-3 md:px-4 py-3 border-b border-stone-100 flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, FIN_IN_FILTERS.map(f => /*#__PURE__*/React.createElement("button", {
    key: f.key,
    onClick: () => setFilter(f.key),
    className: `h-7 px-2.5 rounded-full text-[11.5px] font-medium transition ${filter === f.key ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`
  }, f.label))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Keres\xE9s: sz\xE1ll\xEDt\xF3, sz\xE1mlasz\xE1m\u2026",
    className: "h-8 w-48 pl-8 pr-3 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-emerald-400 bg-stone-50/40"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 13,
    className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
  }))), rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs a sz\u0171r\xE9snek megfelel\u0151 sz\xE1mla.") : /*#__PURE__*/React.createElement("div", null, rows.map(inv => /*#__PURE__*/React.createElement(FinInvoiceRow, {
    key: inv.id,
    inv: inv,
    onOpen: setOpenInv
  })))), /*#__PURE__*/React.createElement(InvoiceSlideOver, {
    inv: liveOpen,
    onClose: () => setOpenInv(null)
  }));
}

// ── Kifizetések / pénzmozgások ────────────────────────────────────────────────
function FinancePayments() {
  const sim = useSim();
  const [dir, setDir] = useStateF2("all"); // all | in | out
  const [openInv, setOpenInv] = useStateF2(null);
  const invById = {};
  (sim.finInvoices || []).forEach(i => {
    invById[i.id] = i;
  });
  const pays = (sim.finPayments || []).map(p => ({
    ...p,
    inv: invById[p.invoiceId]
  })).filter(p => p.inv).filter(p => dir === "all" ? true : p.inv.dir === dir).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  let totalIn = 0,
    totalOut = 0;
  (sim.finPayments || []).forEach(p => {
    const inv = invById[p.invoiceId];
    if (!inv) return;
    const huf = finToHuf(p.amount, inv);
    if (inv.dir === "out") totalIn += huf;else totalOut += huf;
  });
  const liveOpen = openInv ? sim.finInvoices.find(x => x.id === openInv.id) || null : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1000px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 gap-3 mb-5"
  }, /*#__PURE__*/React.createElement(FinMiniStat, {
    label: "\xD6sszes bev\xE9tel",
    value: finFmt(totalIn, "HUF"),
    tone: "emerald",
    icon: "down"
  }), /*#__PURE__*/React.createElement(FinMiniStat, {
    label: "\xD6sszes kiad\xE1s",
    value: finFmt(totalOut, "HUF"),
    tone: "rose",
    icon: "up"
  }), /*#__PURE__*/React.createElement(FinMiniStat, {
    label: "Egyenleg",
    value: (totalIn - totalOut >= 0 ? "+" : "") + finFmt(totalIn - totalOut, "HUF"),
    tone: totalIn - totalOut >= 0 ? "emerald" : "rose",
    icon: "analytics"
  })), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    className: "px-3 md:px-4 py-3 border-b border-stone-100 flex items-center gap-1.5"
  }, [["all", "Mind"], ["out", "Bevétel"], ["in", "Kiadás"]].map(([k, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setDir(k),
    className: `h-7 px-2.5 rounded-full text-[11.5px] font-medium transition ${dir === k ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`
  }, lbl))), pays.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs r\xF6gz\xEDtett p\xE9nzmozg\xE1s.") : /*#__PURE__*/React.createElement("div", null, pays.map(p => {
    const isIn = p.inv.dir === "out"; // kimenő számla befizetése = pénz BE
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      onClick: () => setOpenInv(p.inv),
      className: "w-full flex items-center gap-3 px-3 md:px-4 py-3 hover:bg-stone-50 text-left border-b border-stone-100 last:border-0 transition"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-8 h-8 rounded-lg grid place-items-center shrink-0 ${isIn ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: isIn ? "down" : "up",
      size: 16
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900 truncate"
    }, p.inv.party), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mt-0.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-mono text-stone-500"
    }, p.inv.id), /*#__PURE__*/React.createElement(FinMethodBadge, {
      method: p.method
    }))), /*#__PURE__*/React.createElement("div", {
      className: "text-right shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: `text-[13px] font-semibold tabular-nums ${isIn ? "text-emerald-600" : "text-rose-600"}`
    }, isIn ? "+" : "−", finFmt(p.amount, p.inv.currency)), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] font-mono text-stone-400"
    }, p.date)), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 15,
      className: "text-stone-300 shrink-0"
    }));
  }))), /*#__PURE__*/React.createElement(InvoiceSlideOver, {
    inv: liveOpen,
    onClose: () => setOpenInv(null)
  }));
}
Object.assign(window, {
  FinKpi,
  FinanceDashboard,
  FinanceIncoming,
  FinancePayments
});
})();
