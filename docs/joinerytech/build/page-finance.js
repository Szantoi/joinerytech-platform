/* AUTO-GENERATED from page-finance.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-finance.jsx — PÉNZÜGY világ (1/2)
//   Helperek + státusz-pill + Számla-részletező (SlideOver) + Új számla / Kifizetés
//   sheet-ek + Kimenő számlák lista. A Bejövő/Áttekintő/Kifizetések a page-finance-2.jsx-ben.
//   Store: window.sim.finInvoices / finPayments + akciók (createInvoiceFromOrder,
//   issueInvoice, voidInvoice, addPayment, finBalance, finEffectiveStatus, finStats).
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateF,
  useMemo: useMemoF,
  useEffect: useEffectF
} = React;

// Pénz-formázás (fmtMoney a data-procurement2.js-ből)
function finFmt(n, currency) {
  return fmtMoney(Math.round((Number(n) || 0) * (currency === "EUR" ? 100 : 1)) / (currency === "EUR" ? 100 : 1), currency);
}

// Számított, megjelenítendő státusz-pötty (a „lejárt" felülírja a nyitott állapotot)
function FinStatusPill({
  inv,
  size = "md"
}) {
  const st = window.sim.finEffectiveStatus(inv);
  const t = FIN_INV_TONE[st] || FIN_INV_TONE.draft;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10.5px]" : "px-2 h-6 text-[11.5px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 rounded-full font-medium ${cls} ${t.bg} ${t.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.dot}`
  }), t.label);
}
function FinKindBadge({
  kind
}) {
  const m = FIN_KIND_META[kind] || FIN_KIND_META.normal;
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center px-1.5 h-5 rounded text-[10px] font-medium ${m.tone}`
  }, m.short);
}
function FinMethodBadge({
  method
}) {
  const m = FIN_PAY_METHOD[method] || FIN_PAY_METHOD.bank;
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10.5px] font-medium ${m.tone}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon,
    size: 11
  }), m.label);
}
function FinLabel({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, children);
}
function FinField({
  label,
  children,
  mono
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-0.5"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: `text-[13px] text-stone-800 ${mono ? "font-mono" : ""}`
  }, children));
}

// ÁFA-bontás összesítő (kulcsonként csoportosítva) + nettó/ÁFA/bruttó
function FinVatSummary({
  inv
}) {
  const groups = {};
  (inv.lines || []).forEach(l => {
    const net = (Number(l.qty) || 0) * (Number(l.unitPrice) || 0);
    const key = Number(l.vat) || 0;
    if (!groups[key]) groups[key] = {
      net: 0,
      vat: 0
    };
    groups[key].net += net;
    groups[key].vat += net * (key / 100);
  });
  const net = finNet(inv),
    vat = finVat(inv),
    gross = finGross(inv);
  const noVat = FIN_KIND_META[inv.kind] && FIN_KIND_META[inv.kind].vatBooked === false;
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 bg-stone-50/70 border-b border-stone-100 text-[10px] uppercase tracking-wide text-stone-500 font-medium flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "\xC1FA-bont\xE1s"), noVat && /*#__PURE__*/React.createElement("span", {
    className: "text-teal-600 normal-case tracking-normal font-medium"
  }, "D\xEDjbek\xE9r\u0151 \u2014 nem \xC1FA-bizonylat")), /*#__PURE__*/React.createElement("div", {
    className: "divide-y divide-stone-100"
  }, Object.keys(groups).sort((a, b) => b - a).map(k => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "grid grid-cols-3 gap-2 px-3 py-1.5 text-[11.5px] tabular-nums"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, k, "% kulcs"), /*#__PURE__*/React.createElement("span", {
    className: "text-right text-stone-600"
  }, finFmt(groups[k].net, inv.currency)), /*#__PURE__*/React.createElement("span", {
    className: "text-right text-stone-700"
  }, "+", finFmt(groups[k].vat, inv.currency), " \xC1FA")))), /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 bg-stone-50/40 border-t border-stone-100 space-y-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement("span", null, "Nett\xF3"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, finFmt(net, inv.currency))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement("span", null, "\xC1FA"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, finFmt(vat, inv.currency))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[14px] font-semibold text-stone-900"
  }, /*#__PURE__*/React.createElement("span", null, "Brutt\xF3"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, finFmt(gross, inv.currency)))));
}

// ── Számla-részletező (kimenő + bejövő közös) ─────────────────────────────────
function InvoiceDetailBody({
  inv
}) {
  const sim = useSim();
  const live = sim.finInvoices.find(x => x.id === inv.id) || inv;
  const canManage = window.sim.hasPerm("finance.manage");
  const payments = (sim.finPayments || []).filter(p => p.invoiceId === live.id);
  const paid = payments.reduce((a, p) => a + p.amount, 0);
  const gross = finGross(live);
  const balance = window.sim.finBalance(live);
  const overdue = window.sim.finIsOverdue(live);
  const isOut = live.dir === "out";
  const [mode, setMode] = useStateF(null); // "pay" | "void"
  const [amount, setAmount] = useStateF("");
  const [method, setMethod] = useStateF("bank");
  const [payDate, setPayDate] = useStateF(FIN_TODAY);
  const [payRef, setPayRef] = useStateF("");
  const [reason, setReason] = useStateF("");
  useEffectF(() => {
    setMode(null);
    setAmount("");
    setMethod("bank");
    setPayRef("");
    setReason("");
  }, [live.id]);
  const startPay = () => {
    setAmount(String(Math.round(balance)));
    setMode("pay");
  };
  const doPay = () => {
    const id = window.sim.addPayment(live.id, {
      amount: Number(amount),
      method,
      date: payDate,
      ref: payRef
    });
    if (id) {
      setMode(null);
      window.toast && window.toast("Kifizetés rögzítve.", "success");
    }
  };
  const doVoid = () => {
    if (window.sim.voidInvoice(live.id, reason)) {
      setMode(null);
      window.toast && window.toast("Számla sztornózva.", "info");
    }
  };
  const doIssue = () => {
    if (window.sim.issueInvoice(live.id)) window.toast && window.toast(isOut ? "Számla kiállítva." : "Számla befogadva.", "success");
  };
  const sendReminder = () => {
    window.sim.postSystem && window.sim.postSystem(`🔔 Fizetési emlékeztető küldve: ${live.id} — ${live.party} (hátralék ${finFmt(balance, live.currency)}).`, "ch-prod");
    window.toast && window.toast("Emlékeztető elküldve.", "success");
  };
  const poFound = !isOut && (sim.pos || []).some(p => p.id === live.orderRef);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(FinStatusPill, {
    inv: live
  }), /*#__PURE__*/React.createElement(FinKindBadge, {
    kind: live.kind
  }), live.currency === "EUR" && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center px-1.5 h-5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700"
  }, "EUR \xB7 ", live.fxRate || 390, " Ft")), overdue && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 flex items-start gap-2 text-[11.5px] text-rose-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 14,
    className: "mt-px shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, isOut ? "Lejárt kintlévőség" : "Lejárt fizetendő", " \u2014 esed\xE9kess\xE9g: ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, live.dueDate), ". H\xE1tral\xE9k: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, finFmt(balance, live.currency)), ".")), live.status === "void" && live.voidReason && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-[11.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-600"
  }, "Sztorn\xF3 indok:"), " ", live.voidReason), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement(FinField, {
    label: isOut ? "Vevő" : "Szállító"
  }, live.party), /*#__PURE__*/React.createElement(FinField, {
    label: isOut ? "Rendelés" : "Megrendelés (PO)",
    mono: true
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sky-700"
  }, live.orderRef || "—")), /*#__PURE__*/React.createElement(FinField, {
    label: "Ki\xE1ll\xEDt\xE1s",
    mono: true
  }, live.issueDate), /*#__PURE__*/React.createElement(FinField, {
    label: "Fizet\xE9si hat\xE1rid\u0151",
    mono: true
  }, live.dueDate || "—"), live.extNo && /*#__PURE__*/React.createElement(FinField, {
    label: "Sz\xE1ll\xEDt\xF3i sz\xE1mlasz\xE1m",
    mono: true
  }, live.extNo), /*#__PURE__*/React.createElement(FinField, {
    label: "Ki\xE1ll\xEDt\xF3"
  }, live.issuer || "—")), !isOut && live.submittedVia === "supplier" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 flex items-center gap-2 text-[11.5px] text-teal-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "storefront",
    size: 14,
    className: "shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, "A besz\xE1ll\xEDt\xF3 ny\xFAjtotta be a port\xE1lon", live.submittedAt ? ` (${live.submittedAt})` : "", " \u2014 ellen\u0151rizd, majd ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "fogadd be"), ".")), !isOut && /*#__PURE__*/React.createElement("div", {
    className: `rounded-lg border px-3 py-2 flex items-center gap-2 text-[11.5px] ${poFound ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: poFound ? "check" : "alert",
    size: 14,
    className: "shrink-0"
  }), poFound ? /*#__PURE__*/React.createElement("span", null, "A sz\xE1mla kapcsol\xF3d\xF3 megrendel\xE9se (", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, live.orderRef), ") megtal\xE1lhat\xF3 a Beszerz\xE9sben.") : /*#__PURE__*/React.createElement("span", null, "Nincs egyez\u0151 nyitott megrendel\xE9s (", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, live.orderRef || "—"), ") \u2014 ellen\u0151rizd, val\xF3ban rendelt\xFCnk-e ilyet.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FinLabel, null, "T\xE9telek"), /*#__PURE__*/React.createElement("div", {
    className: "border border-stone-200 rounded-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[minmax(0,1.6fr)_46px_84px_40px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 bg-stone-50/60 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement("div", null, "Megnevez\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Db"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Egys\xE9g\xE1r"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "\xC1FA")), (live.lines || []).map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "grid grid-cols-[minmax(0,1.6fr)_46px_84px_40px] gap-2 px-3 py-2 border-b border-stone-100 last:border-0 items-center text-[11.5px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-700 truncate"
  }, l.name), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums text-stone-600"
  }, l.qty, " ", l.unit), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums text-stone-600"
  }, finFmt(l.unitPrice, live.currency)), /*#__PURE__*/React.createElement("div", {
    className: "text-right tabular-nums text-stone-400"
  }, l.vat, "%"))))), /*#__PURE__*/React.createElement(FinVatSummary, {
    inv: live
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5"
  }, /*#__PURE__*/React.createElement(FinLabel, null, "Kifizet\xE9sek ", payments.length ? `(${payments.length})` : ""), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, "Fizetve: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-700 tabular-nums"
  }, finFmt(paid, live.currency)))), payments.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-400 px-3 py-2 rounded-lg bg-stone-50 border border-dashed border-stone-200"
  }, "M\xE9g nincs r\xF6gz\xEDtett p\xE9nzmozg\xE1s.") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, payments.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-50/70 border border-stone-100"
  }, /*#__PURE__*/React.createElement(FinMethodBadge, {
    method: p.method
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-700 font-mono"
  }, p.date, p.ref ? ` · ${p.ref}` : ""), p.note && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 truncate"
  }, p.note)), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold tabular-nums text-stone-800"
  }, finFmt(p.amount, live.currency))))), balance > 0.01 && live.status !== "void" && live.status !== "draft" && /*#__PURE__*/React.createElement("div", {
    className: `mt-2 flex items-center justify-between px-3 py-2 rounded-lg ${overdue ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-medium"
  }, "H\xE1tral\xE9k"), /*#__PURE__*/React.createElement("span", {
    className: "text-[14px] font-bold tabular-nums"
  }, finFmt(balance, live.currency)))), canManage && mode === "pay" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-white p-3 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-800"
  }, isOut ? "Befizetés rögzítése" : "Kifizetés rögzítése"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, "\xD6sszeg (", live.currency, ")"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: amount,
    onChange: e => setAmount(e.target.value),
    className: "mt-0.5 w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] tabular-nums outline-none focus:border-emerald-500"
  })), /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, "D\xE1tum"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: payDate,
    onChange: e => setPayDate(e.target.value),
    className: "mt-0.5 w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-emerald-500"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Fizet\xE9si m\xF3d"), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 grid grid-cols-3 gap-1.5"
  }, Object.keys(FIN_PAY_METHOD).map(k => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setMethod(k),
    className: `h-8 rounded-lg text-[11px] font-medium transition ${method === k ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`
  }, FIN_PAY_METHOD[k].label)))), /*#__PURE__*/React.createElement("input", {
    value: payRef,
    onChange: e => setPayRef(e.target.value),
    placeholder: "Bizonylat / tranzakci\xF3 azonos\xEDt\xF3 (opc.)",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] font-mono outline-none focus:border-emerald-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2"
  }, /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: () => setMode(null)
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: doPay,
    className: "inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-emerald-600 text-white text-[12.5px] font-medium hover:bg-emerald-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 15
  }), "R\xF6gz\xEDt\xE9s"))), canManage && mode === "void" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-rose-700"
  }, "Sz\xE1mla sztorn\xF3z\xE1sa"), /*#__PURE__*/React.createElement("textarea", {
    value: reason,
    onChange: e => setReason(e.target.value),
    rows: 2,
    placeholder: "Sztorn\xF3 indoka (k\xF6telez\u0151)\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-rose-200 text-[12px] outline-none focus:border-rose-400 resize-none bg-white"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2"
  }, /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: () => setMode(null)
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: doVoid,
    className: "inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-rose-600 text-white text-[12.5px] font-medium hover:bg-rose-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 15
  }), "Sztorn\xF3"))), !mode && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2 pt-1"
  }, !canManage ? /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-400 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13
  }), "A p\xE9nz\xFCgyi m\u0171veletekhez \u201Efinance.manage\" jog kell.") : live.status === "draft" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: doIssue,
    className: "inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-emerald-700 text-white text-[12.5px] font-medium hover:bg-emerald-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 15
  }), isOut ? "Kiállítás" : "Befogadás"), /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "x",
    onClick: () => setMode("void")
  }, "Sztorn\xF3")) : live.status === "issued" || live.status === "partial" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: startPay,
    className: "inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-emerald-700 text-white text-[12.5px] font-medium hover:bg-emerald-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "receipt",
    size: 15
  }), isOut ? "Befizetés rögzítése" : "Kifizetés rögzítése"), overdue && isOut && /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "bell",
    onClick: sendReminder
  }, "Eml\xE9keztet\u0151"), /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "x",
    onClick: () => setMode("void")
  }, "Sztorn\xF3")) : /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-400 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  }), "Lez\xE1rt sz\xE1mla \u2014 nincs tov\xE1bbi m\u0171velet.")));
}

// Számla SlideOver — bárhonnan használható (kimenő + bejövő)
function InvoiceSlideOver({
  inv,
  onClose
}) {
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: !!inv,
    onClose: onClose,
    title: inv ? inv.id : "",
    subtitle: inv ? `${(FIN_KIND_META[inv.kind] || {}).label} · ${inv.party}` : "",
    width: 560
  }, inv && /*#__PURE__*/React.createElement(InvoiceDetailBody, {
    inv: inv
  }));
}

// ── Új (kimenő) számla rendelésből ────────────────────────────────────────────
function NewInvoiceSheet({
  open,
  onClose,
  onCreated
}) {
  const sim = useSim();
  const [orderId, setOrderId] = useStateF("");
  const [kind, setKind] = useStateF("normal");
  const [pct, setPct] = useStateF(30);
  useEffectF(() => {
    if (open) {
      setOrderId("");
      setKind("normal");
      setPct(30);
    }
  }, [open]);
  const orders = (sim.orders || []).filter(o => o.status !== "draft");
  const create = () => {
    if (!orderId) {
      window.toast && window.toast("Válassz rendelést.", "warning");
      return;
    }
    const id = window.sim.createInvoiceFromOrder(orderId, {
      kind,
      advancePct: pct
    });
    if (id) {
      onClose();
      onCreated && onCreated(id);
    }
  };
  const sel = orders.find(o => o.id === orderId);
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: open,
    onClose: onClose,
    title: "\xDAj kimen\u0151 sz\xE1mla",
    subtitle: "Rendel\xE9sb\u0151l \u2014 piszkozatk\xE9nt j\xF6n l\xE9tre",
    width: 480
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FinLabel, null, "Sz\xE1mla fajt\xE1ja"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-1.5"
  }, [["normal", "Számla"], ["advance", "Előleg"], ["proforma", "Díjbekérő"]].map(([k, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setKind(k),
    className: `h-9 rounded-lg text-[11.5px] font-medium transition ${kind === k ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`
  }, lbl))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1.5"
  }, kind === "advance" ? "Előleg-számla: a rendelés értékének egy része, gyártás előtt." : kind === "proforma" ? "Díjbekérő: fizetési felszólítás, nem ÁFA-bizonylat." : "Sima (vég)számla a teljes rendelésről.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FinLabel, null, "Rendel\xE9s"), /*#__PURE__*/React.createElement("select", {
    value: orderId,
    onChange: e => setOrderId(e.target.value),
    className: "w-full h-10 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-emerald-500 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 V\xE1lassz rendel\xE9st \u2014"), orders.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.id,
    value: o.id
  }, o.id, " \xB7 ", o.customer, " \xB7 ", finFmt(o.total, "HUF"))))), kind === "advance" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FinLabel, null, "El\u0151leg m\xE9rt\xE9ke: ", pct, "%"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 10,
    max: 90,
    step: 5,
    value: pct,
    onChange: e => setPct(Number(e.target.value)),
    className: "w-full accent-emerald-600"
  }), sel && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mt-1"
  }, "\u2248 ", finFmt(Math.round((sel.total || 0) * (pct / 100)), "HUF"), " brutt\xF3 el\u0151leg")), sel && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-stone-50 border border-stone-200 px-3 py-2.5 space-y-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, "Vev\u0151"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-800 font-medium"
  }, sel.customer)), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, "Rendel\xE9s \xE9rt\xE9ke"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-800 tabular-nums"
  }, finFmt(sel.total, "HUF")))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2 pt-1"
  }, /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: onClose
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: create,
    className: "inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-emerald-700 text-white text-[12.5px] font-medium hover:bg-emerald-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "Piszkozat l\xE9trehoz\xE1sa"))));
}

// Egy számla-sor a listában (kimenő + bejövő közös)
function FinInvoiceRow({
  inv,
  onOpen
}) {
  const gross = finGross(inv);
  const balance = window.sim.finBalance(inv);
  const overdue = window.sim.finIsOverdue(inv);
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(inv),
    className: "w-full flex items-center gap-3 px-3 md:px-4 py-3 hover:bg-stone-50 text-left border-b border-stone-100 last:border-0 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, inv.party), /*#__PURE__*/React.createElement(FinKindBadge, {
    kind: inv.kind
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-mono text-stone-500 truncate"
  }, inv.id, inv.orderRef ? ` · ${inv.orderRef}` : ""))), /*#__PURE__*/React.createElement("div", {
    className: "hidden sm:flex flex-col items-end shrink-0"
  }, /*#__PURE__*/React.createElement(FinStatusPill, {
    inv: inv,
    size: "sm"
  }), balance > 0.01 && (inv.status === "issued" || inv.status === "partial") && /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] mt-1 tabular-nums ${overdue ? "text-rose-500" : "text-stone-400"}`
  }, "h\xE1tral\xE9k ", finFmt(balance, inv.currency))), /*#__PURE__*/React.createElement("div", {
    className: "text-right shrink-0 w-[96px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-800 tabular-nums"
  }, finFmt(gross, inv.currency)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] font-mono text-stone-400"
  }, inv.dueDate || inv.issueDate)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 15,
    className: "text-stone-300 shrink-0"
  }));
}

// ── Kimenő számlák lista ──────────────────────────────────────────────────────
const FIN_OUT_FILTERS = [{
  key: "all",
  label: "Mind"
}, {
  key: "open",
  label: "Nyitott"
}, {
  key: "overdue",
  label: "Lejárt"
}, {
  key: "draft",
  label: "Piszkozat"
}, {
  key: "paid",
  label: "Fizetve"
}];
function FinanceOutgoing() {
  const sim = useSim();
  const canManage = window.sim.hasPerm("finance.manage");
  const [openInv, setOpenInv] = useStateF(null);
  const [showNew, setShowNew] = useStateF(false);
  const [q, setQ] = useStateF("");
  const [filter, setFilter] = useStateF("all");
  const all = (sim.finInvoices || []).filter(i => i.dir === "out");
  const rows = all.filter(i => {
    const eff = window.sim.finEffectiveStatus(i);
    if (filter === "open" && !(eff === "issued" || eff === "partial" || eff === "overdue")) return false;
    if (filter === "overdue" && eff !== "overdue") return false;
    if (filter === "draft" && i.status !== "draft") return false;
    if (filter === "paid" && i.status !== "paid") return false;
    if (q && !`${i.id} ${i.party} ${i.orderRef || ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const liveOpen = openInv ? sim.finInvoices.find(x => x.id === openInv.id) || null : null;
  const counts = {
    receivable: all.filter(i => i.status === "issued" || i.status === "partial").reduce((a, i) => a + finToHuf(window.sim.finBalance(i), i), 0),
    overdue: all.filter(i => window.sim.finIsOverdue(i)).length,
    drafts: all.filter(i => i.status === "draft").length
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 gap-3 mb-5"
  }, /*#__PURE__*/React.createElement(FinMiniStat, {
    label: "Kintl\xE9v\u0151s\xE9g",
    value: finFmt(counts.receivable, "HUF"),
    tone: "amber",
    icon: "receipt"
  }), /*#__PURE__*/React.createElement(FinMiniStat, {
    label: "Lej\xE1rt sz\xE1mla",
    value: `${counts.overdue} db`,
    tone: counts.overdue ? "rose" : "stone",
    icon: "alert"
  }), /*#__PURE__*/React.createElement(FinMiniStat, {
    label: "Piszkozat",
    value: `${counts.drafts} db`,
    tone: "stone",
    icon: "file"
  })), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    className: "px-3 md:px-4 py-3 border-b border-stone-100 flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, FIN_OUT_FILTERS.map(f => /*#__PURE__*/React.createElement("button", {
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
    placeholder: "Keres\xE9s: vev\u0151, sz\xE1mlasz\xE1m\u2026",
    className: "h-8 w-48 pl-8 pr-3 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-emerald-400 bg-stone-50/40"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 13,
    className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
  })), canManage && /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowNew(true),
    className: "inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-emerald-700 text-white text-[12px] font-medium hover:bg-emerald-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), "\xDAj sz\xE1mla")), rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs a sz\u0171r\xE9snek megfelel\u0151 sz\xE1mla.") : /*#__PURE__*/React.createElement("div", null, rows.map(inv => /*#__PURE__*/React.createElement(FinInvoiceRow, {
    key: inv.id,
    inv: inv,
    onOpen: setOpenInv
  })))), /*#__PURE__*/React.createElement(InvoiceSlideOver, {
    inv: liveOpen,
    onClose: () => setOpenInv(null)
  }), /*#__PURE__*/React.createElement(NewInvoiceSheet, {
    open: showNew,
    onClose: () => setShowNew(false),
    onCreated: id => setOpenInv({
      id
    })
  }));
}

// Kis statisztika-kártya (lista tetejére)
function FinMiniStat({
  label,
  value,
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
    className: "bg-white border border-stone-200/80 rounded-xl px-3.5 py-3 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-9 h-9 rounded-lg grid place-items-center shrink-0 ${tones[tone]}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-400 font-medium"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold text-stone-900 tabular-nums leading-tight truncate"
  }, value)));
}
Object.assign(window, {
  finFmt,
  FinStatusPill,
  FinKindBadge,
  FinMethodBadge,
  FinLabel,
  FinField,
  FinVatSummary,
  InvoiceDetailBody,
  InvoiceSlideOver,
  NewInvoiceSheet,
  FinInvoiceRow,
  FinanceOutgoing,
  FinMiniStat
});
})();
