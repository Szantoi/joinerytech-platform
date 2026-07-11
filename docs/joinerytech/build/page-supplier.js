/* AUTO-GENERATED from page-supplier.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-supplier.jsx — BESZÁLLÍTÓI PORTÁL (külső önkiszolgálás)
//   Teljes képernyős élmény, amikor a fiók portal==="supplier" (mint a B2C
//   webshop). NINCS új entitás — a beszállító a SAJÁT szeletét látja (név
//   szerint szűrve) és a meglévő RFQ/PO FSM beszállítói oldali akcióit végzi:
//   ajánlat-beadás az ajánlatkérésre, megrendelés-visszaigazolás + feladás (ASN).
//   Store: sim.supplierRfqs/supplierPos/submitSupplierBid/acknowledgePO/markPOShipped.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateS
} = React;
const supHuf = n => (Number(n) || 0).toLocaleString("hu-HU") + " Ft";

// RFQ-állapot a beszállító szemszögéből → tónus
const SUP_RFQ_TONE = {
  beadando: {
    label: "Ajánlat kérve",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500"
  },
  beadva: {
    label: "Ajánlat beadva",
    pill: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500"
  },
  nyertes: {
    label: "Elnyerte",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500"
  },
  elveszett: {
    label: "Nem nyertes",
    pill: "bg-stone-100 text-stone-500 border-stone-200",
    dot: "bg-stone-400"
  },
  lezart: {
    label: "Lezárva",
    pill: "bg-stone-100 text-stone-500 border-stone-200",
    dot: "bg-stone-400"
  }
};
function SupRfqPill({
  state,
  size = "md"
}) {
  const t = SUP_RFQ_TONE[state] || SUP_RFQ_TONE.lezart;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.dot}`
  }), t.label);
}

// ── Áttekintés ───────────────────────────────────────────────────
function SupplierDashboard({
  onTab,
  onOpenRfq
}) {
  const sim = useSim();
  const name = sim.supplierName();
  const rfqs = sim.supplierRfqs();
  const pos = sim.supplierPos();
  const byState = st => rfqs.filter(r => sim.supplierRfqState(r) === st);
  const toBid = byState("beadando");
  const inReview = byState("beadva");
  const won = byState("nyertes");
  const toAck = pos.filter(p => p.status === "running" && !p.ackAt);
  const billable = pos.filter(p => sim.poInvoiceable(p));
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
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "\xDCdv, ", name, "!"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "JoineryTech besz\xE1ll\xEDt\xF3i port\xE1l \u2014 aj\xE1nlatk\xE9r\xE9sek \xE9s megrendel\xE9sek egy helyen.")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-5 gap-3"
  }, /*#__PURE__*/React.createElement(KPI, {
    label: "Aj\xE1nlatra v\xE1r",
    value: toBid.length,
    sub: "beadand\xF3 aj\xE1nlat",
    tone: "amber",
    icon: "send"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "B\xEDr\xE1lat alatt",
    value: inReview.length,
    sub: "beadott aj\xE1nlat",
    tone: "sky",
    icon: "clock"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Visszaigazol\xE1sra v\xE1r",
    value: toAck.length,
    sub: "\xFAj megrendel\xE9s",
    tone: "rose",
    icon: "receipt"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Sz\xE1ml\xE1zhat\xF3",
    value: billable.length,
    sub: "feladott megrendel\xE9s",
    tone: "emerald",
    icon: "file"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Elnyert tender",
    value: won.length,
    sub: "eddig",
    tone: "teal",
    icon: "check"
  })), billable.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => onTab("invoices"),
    className: "w-full text-left rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3 hover:bg-emerald-100/70"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 18,
    className: "text-emerald-600 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-emerald-800"
  }, billable.length, " feladott megrendel\xE9s sz\xE1ml\xE1zhat\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-emerald-700/80 truncate"
  }, "Ny\xFAjtsd be a sz\xE1ml\xE1t, \xE9s k\xF6vesd a befogad\xE1s/fizet\xE9s \xE1llapot\xE1t.")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 15,
    className: "text-emerald-500"
  })), toBid.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => onTab("rfq"),
    className: "w-full text-left rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3 hover:bg-amber-100/70"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 18,
    className: "text-amber-600 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-amber-800"
  }, toBid.length, " aj\xE1nlatk\xE9r\xE9s v\xE1r az aj\xE1nlatodra"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-amber-700/80 truncate"
  }, toBid.map(r => r.title).join(" · "))), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 15,
    className: "text-amber-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Aj\xE1nlatk\xE9r\xE9sek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onTab("rfq"),
    className: "text-[11.5px] text-teal-700 font-medium inline-flex items-center gap-1"
  }, "Mind ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  }))), rfqs.length ? rfqs.slice(0, 4).map(r => /*#__PURE__*/React.createElement(RfqRow, {
    key: r.id,
    rfq: r,
    onOpen: onOpenRfq
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-8 text-center text-[12px] text-stone-400"
  }, "Nincs aj\xE1nlatk\xE9r\xE9s.")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Megrendel\xE9sek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onTab("orders"),
    className: "text-[11.5px] text-teal-700 font-medium inline-flex items-center gap-1"
  }, "Mind ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  }))), pos.length ? pos.slice(0, 4).map(p => /*#__PURE__*/React.createElement(PoRow, {
    key: p.id,
    po: p,
    compact: true
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-8 text-center text-[12px] text-stone-400"
  }, "Nincs megrendel\xE9s."))));
}

// ── RFQ sor + lista ──────────────────────────────────────────────
function RfqRow({
  rfq,
  onOpen
}) {
  const sim = useSim();
  const state = sim.supplierRfqState(rfq);
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(rfq.id),
    className: "w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-teal-50 text-teal-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, rfq.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate mt-0.5"
  }, rfq.id, " \xB7 ", (rfq.lines || []).length, " t\xE9tel \xB7 hat\xE1rid\u0151 ", rfq.dueDate)), /*#__PURE__*/React.createElement(SupRfqPill, {
    state: state,
    size: "sm"
  }));
}
function SupplierRfqs({
  onOpenRfq
}) {
  const sim = useSim();
  const [f, setF] = useStateS("all");
  const all = sim.supplierRfqs();
  const list = all.filter(r => f === "all" ? true : f === "open" ? sim.supplierRfqState(r) === "beadando" : sim.supplierRfqState(r) === f);
  const tabs = [["all", "Mind"], ["open", "Ajánlatra vár"], ["beadva", "Beadva"], ["nyertes", "Elnyert"]];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Aj\xE1nlatk\xE9r\xE9sek"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 overflow-x-auto pb-1"
  }, tabs.map(([k, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setF(k),
    className: `shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${f === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`
  }, lbl))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, list.length ? list.map(r => /*#__PURE__*/React.createElement(RfqRow, {
    key: r.id,
    rfq: r,
    onOpen: onOpenRfq
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs tal\xE1lat.")));
}

// ── RFQ ajánlat-beadó panel (SlideOver) ──────────────────────────
function RfqBidHost({
  openId,
  setOpen
}) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const rfq = openId ? (sim.rfqs || []).find(x => x.id === openId) : null;
  const onClose = () => setOpen(null);
  return /*#__PURE__*/React.createElement(SO, {
    open: !!rfq,
    onClose: onClose,
    title: rfq ? rfq.title : "",
    subtitle: rfq ? `${rfq.id} · határidő ${rfq.dueDate}` : "",
    width: 560
  }, rfq ? /*#__PURE__*/React.createElement(RfqBidPanel, {
    rfq: rfq,
    onClose: onClose
  }) : null);
}
function RfqBidPanel({
  rfq,
  onClose
}) {
  const sim = useSim();
  const live = (sim.rfqs || []).find(x => x.id === rfq.id) || rfq;
  const name = sim.supplierName();
  const sup = (live.suppliers || []).find(s => s.name === name) || {
    bids: {}
  };
  const state = sim.supplierRfqState(live);
  const editable = state === "beadando";
  const [bids, setBids] = useStateS(() => {
    const init = {};
    (live.lines || []).forEach((ln, i) => {
      const b = (sup.bids || {})[i] || {};
      init[i] = {
        price: b.price != null ? String(b.price) : "",
        leadDays: b.leadDays != null ? String(b.leadDays) : ""
      };
    });
    return init;
  });
  const [note, setNote] = useStateS(sup.note || "");
  const setBid = (i, k, v) => setBids(b => ({
    ...b,
    [i]: {
      ...b[i],
      [k]: v
    }
  }));
  const total = (live.lines || []).reduce((sum, ln, i) => sum + (Number(bids[i] && bids[i].price) || 0) * (Number(ln.qty) || 0), 0);
  const complete = (live.lines || []).every((ln, i) => bids[i] && bids[i].price !== "" && Number(bids[i].price) > 0);
  const submit = () => {
    const out = {};
    (live.lines || []).forEach((ln, i) => {
      out[i] = {
        price: Number(bids[i].price) || 0,
        leadDays: Number(bids[i].leadDays) || 0
      };
    });
    if (sim.submitSupplierBid(live.id, out, note)) onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(SupRfqPill, {
    state: state
  }), live.note && /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-500"
  }, live.note)), state === "nyertes" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16,
    className: "text-emerald-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-emerald-800"
  }, "Gratul\xE1lunk \u2014 elnyerted a tendert!", live.poRef ? ` Megrendelés: ${live.poRef}` : "")), state === "elveszett" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50 p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 16,
    className: "text-stone-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-600"
  }, "Ezt a tendert m\xE1sik besz\xE1ll\xEDt\xF3 nyerte. K\xF6sz\xF6nj\xFCk az aj\xE1nlatot.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "T\xE9telek ", editable ? "— add meg az egységárat és az átfutást" : "— a beadott ajánlatod"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, (live.lines || []).map((ln, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2 mb-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-800 truncate"
  }, ln.material), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 font-mono"
  }, ln.code, " \xB7 ", ln.qty, " ", ln.unit))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500 block mb-0.5"
  }, "Egys\xE9g\xE1r (Ft / ", ln.unit, ")"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    disabled: !editable,
    value: bids[i] ? bids[i].price : "",
    onChange: e => setBid(i, "price", e.target.value),
    placeholder: "0",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 disabled:bg-stone-50 disabled:text-stone-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-24"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500 block mb-0.5"
  }, "\xC1tfut\xE1s (nap)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    disabled: !editable,
    value: bids[i] ? bids[i].leadDays : "",
    onChange: e => setBid(i, "leadDays", e.target.value),
    placeholder: "0",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 disabled:bg-stone-50 disabled:text-stone-500"
  }))), Number(bids[i] && bids[i].price) > 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1.5"
  }, "Sor\xF6sszeg: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-600"
  }, supHuf((Number(bids[i].price) || 0) * (Number(ln.qty) || 0)))))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-medium text-stone-600"
  }, "Aj\xE1nlat \xF6sszesen (nett\xF3)"), /*#__PURE__*/React.createElement("span", {
    className: "text-[15px] font-semibold text-stone-900 tabular-nums"
  }, supHuf(total))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("textarea", {
    disabled: !editable,
    value: note,
    onChange: e => setNote(e.target.value),
    rows: 2,
    placeholder: "Pl. k\xE9szleten, akci\xF3s \xE1r, sz\xE1ll\xEDt\xE1si felt\xE9tel\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 disabled:bg-stone-50 disabled:text-stone-500"
  })), editable ? /*#__PURE__*/React.createElement("button", {
    disabled: !complete,
    onClick: submit,
    className: "w-full h-11 rounded-xl bg-teal-600 text-white text-[13px] font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 15
  }), "Aj\xE1nlat bead\xE1sa") : sup.respondedAt ? /*#__PURE__*/React.createElement("div", {
    className: "text-center text-[11.5px] text-stone-400"
  }, "Beadva: ", sup.respondedAt) : null);
}

// ── Megrendelés sor + lista ──────────────────────────────────────
function PoStatusPill({
  po,
  size = "md"
}) {
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  let t;
  if (po.status === "delivered") t = {
    label: "Bevételezve",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500"
  };else if (po.shipped) t = {
    label: "Feladva",
    pill: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500"
  };else if (po.ackAt) t = {
    label: "Visszaigazolva",
    pill: "bg-teal-50 text-teal-700 border-teal-200",
    dot: "bg-teal-500"
  };else t = {
    label: "Új — visszaigazolásra vár",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500"
  };
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.dot}`
  }), t.label);
}
function PoRow({
  po,
  compact,
  onBill
}) {
  const lines = po.lines || (po.material ? [{
    material: po.material,
    qty: po.qty
  }] : []);
  const total = po.total || (po.lines || []).reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);
  const inv = !compact && window.sim.poInvoice ? window.sim.poInvoice(po.id) : null;
  const canBill = !compact && window.sim.poInvoiceable && window.sim.poInvoiceable(po);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-stone-100 text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "receipt",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, po.id, po.projectName ? ` · ${po.projectName}` : ""), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate mt-0.5"
  }, lines.map(l => `${l.material} ×${l.qty}`).join(" · ") || po.material, " \xB7 sz\xE1ll\xEDt\xE1s ", po.promiseDate || po.eta)), /*#__PURE__*/React.createElement(PoStatusPill, {
    po: po,
    size: "sm"
  })), !compact && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 flex items-center justify-between gap-2 pl-12"
  }, total > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-500"
  }, "\xC9rt\xE9k: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-700"
  }, supHuf(total))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 ml-auto flex-wrap justify-end"
  }, !po.ackAt && po.status === "running" && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.acknowledgePO(po.id),
    className: "h-8 px-3 rounded-lg bg-teal-600 text-white text-[12px] font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  }), "Visszaigazol\xE1s"), po.ackAt && !po.shipped && po.status === "running" && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.markPOShipped(po.id),
    className: "h-8 px-3 rounded-lg bg-sky-600 text-white text-[12px] font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "truck",
    size: 13
  }), "Felad\xE1s (ASN)"), po.shipped && po.status === "running" && !inv && !canBill && /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-sky-600 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "truck",
    size: 13
  }), "\xDAton \u2014 bev\xE9telez\xE9sre v\xE1r"), inv ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 text-[11.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 13,
    className: "text-stone-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-stone-600"
  }, inv.id), /*#__PURE__*/React.createElement(SupInvPill, {
    status: inv.status,
    size: "sm"
  })) : canBill ? /*#__PURE__*/React.createElement("button", {
    onClick: () => onBill && onBill(po.id),
    className: "h-8 px-3 rounded-lg bg-emerald-600 text-white text-[12px] font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 13
  }), "Sz\xE1mla beny\xFAjt\xE1sa") : null)));
}
function SupplierOrders({
  onBill
}) {
  const sim = useSim();
  const pos = sim.supplierPos();
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Megrendel\xE9sek"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500"
  }, "Igazold vissza az \xFAj megrendel\xE9seket, jel\xF6ld feladottnak (ASN), majd ny\xFAjtsd be a sz\xE1ml\xE1t."), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, pos.length ? pos.map(p => /*#__PURE__*/React.createElement(PoRow, {
    key: p.id,
    po: p,
    onBill: onBill
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs akt\xEDv megrendel\xE9s.")));
}

// ── Beszállítói SZÁMLA — állapot a beszállító szemszögéből ────────
const SUP_INV_TONE = {
  draft: {
    label: "Befogadásra vár",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500"
  },
  issued: {
    label: "Befogadva — fizetésre vár",
    pill: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500"
  },
  partial: {
    label: "Részben fizetve",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500"
  },
  paid: {
    label: "Kifizetve",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500"
  },
  void: {
    label: "Elutasítva",
    pill: "bg-stone-100 text-stone-500 border-stone-200",
    dot: "bg-stone-400"
  }
};
function SupInvPill({
  status,
  size = "md"
}) {
  const t = SUP_INV_TONE[status] || SUP_INV_TONE.draft;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.dot}`
  }), t.label);
}
const supInvFmt = (n, cur) => cur === "EUR" ? (Number(n) || 0).toLocaleString("hu-HU") + " €" : supHuf(n);
const supGross = inv => (inv.lines || []).reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0) * (1 + (Number(l.vat) || 0) / 100), 0);
function SupInvRow({
  inv
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-stone-100 text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, inv.id, inv.extNo ? ` · ${inv.extNo}` : ""), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate mt-0.5"
  }, inv.orderRef ? `${inv.orderRef} · ` : "", "ki\xE1ll\xEDtva ", inv.issueDate, " \xB7 fiz. hat\xE1rid\u0151 ", inv.dueDate || "—")), /*#__PURE__*/React.createElement("div", {
    className: "text-right shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-800 tabular-nums"
  }, supInvFmt(supGross(inv), inv.currency)), /*#__PURE__*/React.createElement("div", {
    className: "mt-1"
  }, /*#__PURE__*/React.createElement(SupInvPill, {
    status: inv.status,
    size: "sm"
  })))));
}
function SupplierInvoices({
  onBill
}) {
  const sim = useSim();
  const invs = sim.supplierInvoices();
  const billable = sim.supplierPos().filter(p => sim.poInvoiceable(p));
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Sz\xE1ml\xE1im"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500"
  }, "Ny\xFAjtsd be a sz\xE1ml\xE1t a feladott megrendel\xE9sekre, \xE9s k\xF6vesd a befogad\xE1s/fizet\xE9s \xE1llapot\xE1t."), billable.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Sz\xE1ml\xE1zhat\xF3 megrendel\xE9s (", billable.length, ")"), billable.map(p => {
    const lines = p.lines || (p.material ? [{
      material: p.material,
      qty: p.qty
    }] : []);
    const total = p.total || (p.lines || []).reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      onClick: () => onBill(p.id),
      className: "w-full text-left rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3 hover:bg-emerald-100/70"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file",
      size: 17,
      className: "text-emerald-600 shrink-0"
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-emerald-800 truncate"
    }, p.id, total > 0 ? ` · ${supHuf(total)}` : ""), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-emerald-700/80 truncate"
    }, lines.map(l => `${l.material} ×${l.qty}`).join(" · "))), /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 h-8 px-3 rounded-lg bg-emerald-600 text-white text-[12px] font-medium inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file",
      size: 13
    }), "Sz\xE1mla"));
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Beny\xFAjtott sz\xE1ml\xE1k")), invs.length ? invs.map(v => /*#__PURE__*/React.createElement(SupInvRow, {
    key: v.id,
    inv: v
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "M\xE9g nincs beny\xFAjtott sz\xE1mla.")));
}

// ── Számla-benyújtó panel (SlideOver) ────────────────────────────
function SupInvHost({
  openId,
  setOpen
}) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const po = openId ? (sim.pos || []).find(p => p.id === openId) : null;
  const onClose = () => setOpen(null);
  return /*#__PURE__*/React.createElement(SO, {
    open: !!po,
    onClose: onClose,
    title: "Sz\xE1mla beny\xFAjt\xE1sa",
    subtitle: po ? `${po.id}${po.projectName ? ` · ${po.projectName}` : ""}` : "",
    width: 560
  }, po ? /*#__PURE__*/React.createElement(SupplierInvoicePanel, {
    po: po,
    onClose: onClose
  }) : null);
}
function SupplierInvoicePanel({
  po,
  onClose
}) {
  const sim = useSim();
  const today = window.FIN_TODAY || "2026-04-28";
  const addDays = (d, n) => {
    const dt = new Date(d + "T00:00:00");
    dt.setDate(dt.getDate() + n);
    return dt.toISOString().slice(0, 10);
  };
  const cur = po.currency || "HUF";
  const poLines = po.lines && po.lines.length ? po.lines : po.material ? [{
    material: po.material,
    qty: po.qty,
    price: po.unitPrice || 0,
    unit: po.unit || "db"
  }] : [];
  const [rows, setRows] = useStateS(() => poLines.map(l => ({
    name: l.material || l.name || "Tétel",
    qty: String(l.qty || 1),
    unit: l.unit || "db",
    unitPrice: String(l.price || 0),
    vat: "27"
  })));
  const [extNo, setExtNo] = useStateS("");
  const [issueDate, setIssueDate] = useStateS(today);
  const [dueDate, setDueDate] = useStateS(addDays(today, 30));
  const [note, setNote] = useStateS("");
  const setRow = (i, k, v) => setRows(rs => rs.map((r, idx) => idx === i ? {
    ...r,
    [k]: v
  } : r));
  const net = rows.reduce((a, r) => a + (Number(r.qty) || 0) * (Number(r.unitPrice) || 0), 0);
  const vat = rows.reduce((a, r) => a + (Number(r.qty) || 0) * (Number(r.unitPrice) || 0) * (Number(r.vat) || 0) / 100, 0);
  const gross = net + vat;
  const valid = extNo.trim() && rows.every(r => Number(r.unitPrice) > 0 && Number(r.qty) > 0);
  const submit = () => {
    const lines = rows.map(r => ({
      name: r.name,
      qty: Number(r.qty) || 1,
      unit: r.unit,
      unitPrice: Number(r.unitPrice) || 0,
      vat: Number(r.vat) || 0
    }));
    if (sim.submitSupplierInvoice(po.id, {
      extNo,
      issueDate,
      dueDate,
      note,
      lines
    })) onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-[11.5px] text-stone-600"
  }, "A sz\xE1mla a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-800"
  }, po.id), " megrendel\xE9sre ker\xFCl be a JoineryTech P\xE9nz\xFCgyh\xF6z ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "befogad\xE1sra v\xE1r"), " \xE1llapotban. A befogad\xE1s \xE9s a kifizet\xE9s a JoineryTech oldal\xE1n t\xF6rt\xE9nik."), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-500 block mb-0.5"
  }, "Sz\xE1mlasz\xE1mod *"), /*#__PURE__*/React.createElement("input", {
    value: extNo,
    onChange: e => setExtNo(e.target.value),
    placeholder: "pl. FA-26-2210",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-mono bg-white outline-none focus:border-teal-500"
  })), /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-500 block mb-0.5"
  }, "P\xE9nznem"), /*#__PURE__*/React.createElement("div", {
    className: "h-9 px-2.5 rounded-lg border border-stone-200 bg-stone-50 text-[12.5px] text-stone-500 inline-flex items-center"
  }, cur)), /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-500 block mb-0.5"
  }, "Ki\xE1ll\xEDt\xE1s"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: issueDate,
    onChange: e => setIssueDate(e.target.value),
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  })), /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-500 block mb-0.5"
  }, "Fizet\xE9si hat\xE1rid\u0151"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: dueDate,
    onChange: e => setDueDate(e.target.value),
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "T\xE9telek \u2014 a megrendel\xE9sb\u0151l el\u0151t\xF6ltve, m\xF3dos\xEDthatod"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-800 mb-2"
  }, r.name), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500 block mb-0.5"
  }, "Menny."), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: r.qty,
    onChange: e => setRow(i, "qty", e.target.value),
    className: "w-full h-9 px-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500 block mb-0.5"
  }, "Egys\xE9g\xE1r (", cur, " / ", r.unit, ")"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: r.unitPrice,
    onChange: e => setRow(i, "unitPrice", e.target.value),
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-20"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500 block mb-0.5"
  }, "\xC1FA %"), /*#__PURE__*/React.createElement("select", {
    value: r.vat,
    onChange: e => setRow(i, "vat", e.target.value),
    className: "w-full h-9 px-1.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  }, ["27", "18", "5", "0"].map(v => /*#__PURE__*/React.createElement("option", {
    key: v,
    value: v
  }, v, "%"))))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1.5 text-right"
  }, "Sor (nett\xF3): ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-600"
  }, supInvFmt((Number(r.qty) || 0) * (Number(r.unitPrice) || 0), cur))))))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2.5 space-y-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", null, "Nett\xF3"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, supInvFmt(net, cur))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", null, "\xC1FA"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, supInvFmt(vat, cur))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[13px] font-semibold text-stone-900 pt-1 border-t border-stone-200"
  }, /*#__PURE__*/React.createElement("span", null, "Brutt\xF3"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, supInvFmt(gross, cur)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("textarea", {
    value: note,
    onChange: e => setNote(e.target.value),
    rows: 2,
    placeholder: "Opcion\xE1lis megjegyz\xE9s a sz\xE1ml\xE1hoz\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  })), /*#__PURE__*/React.createElement("button", {
    disabled: !valid,
    onClick: submit,
    className: "w-full h-11 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 15
  }), "Sz\xE1mla beny\xFAjt\xE1sa"), !valid && /*#__PURE__*/React.createElement("div", {
    className: "text-center text-[10.5px] text-stone-400"
  }, "Add meg a sz\xE1mlasz\xE1mod \xE9s minden t\xE9tel egys\xE9g\xE1r\xE1t."));
}

// ── Portál-váz (teljes képernyő) ─────────────────────────────────
function SupplierPortal({
  onExit,
  exitLabel
}) {
  const sim = useSim();
  const [tab, setTab] = useStateS("dash");
  const [openRfq, setOpenRfq] = useStateS(null);
  const [billPo, setBillPo] = useStateS(null);
  const name = sim.supplierName();
  const toBid = sim.supplierRfqs().filter(r => sim.supplierRfqState(r) === "beadando").length;
  const toAck = sim.supplierPos().filter(p => p.status === "running" && !p.ackAt).length;
  const toBill = sim.supplierPos().filter(p => sim.poInvoiceable(p)).length;
  const NAV = [{
    key: "dash",
    label: "Áttekintés",
    icon: "dashboard"
  }, {
    key: "rfq",
    label: "Ajánlatkérések",
    icon: "send",
    badge: toBid
  }, {
    key: "orders",
    label: "Megrendelések",
    icon: "receipt",
    badge: toAck
  }, {
    key: "invoices",
    label: "Számláim",
    icon: "file",
    badge: toBill
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-stone-50"
  }, /*#__PURE__*/React.createElement("header", {
    className: "sticky top-0 z-40 bg-white border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1100px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5 min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-lg bg-teal-600 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "storefront",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 leading-tight"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, "Besz\xE1ll\xEDt\xF3i port\xE1l"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 truncate"
  }, name))), /*#__PURE__*/React.createElement("div", {
    className: "ml-auto flex items-center gap-2"
  }, window.ProfileSwitcher ? /*#__PURE__*/React.createElement(window.ProfileSwitcher, null) : null, /*#__PURE__*/React.createElement("button", {
    onClick: onExit,
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600 hover:bg-stone-50 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "logout",
    size: 14
  }), exitLabel || "Kilépés"))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1100px] mx-auto px-2 md:px-6 flex items-center gap-1 overflow-x-auto"
  }, NAV.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.key,
    onClick: () => setTab(n.key),
    className: `shrink-0 inline-flex items-center gap-1.5 px-3 h-10 text-[12.5px] font-medium border-b-2 -mb-px ${tab === n.key ? "border-teal-600 text-teal-700" : "border-transparent text-stone-500 hover:text-stone-800"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: n.icon,
    size: 15
  }), n.label, n.badge > 0 && /*#__PURE__*/React.createElement("span", {
    className: "ml-0.5 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[10px] font-semibold"
  }, n.badge))))), /*#__PURE__*/React.createElement("main", {
    className: "max-w-[1100px] mx-auto px-4 md:px-6 py-5 md:py-7"
  }, tab === "dash" && /*#__PURE__*/React.createElement(SupplierDashboard, {
    onTab: setTab,
    onOpenRfq: setOpenRfq
  }), tab === "rfq" && /*#__PURE__*/React.createElement(SupplierRfqs, {
    onOpenRfq: setOpenRfq
  }), tab === "orders" && /*#__PURE__*/React.createElement(SupplierOrders, {
    onBill: setBillPo
  }), tab === "invoices" && /*#__PURE__*/React.createElement(SupplierInvoices, {
    onBill: setBillPo
  })), /*#__PURE__*/React.createElement(RfqBidHost, {
    openId: openRfq,
    setOpen: setOpenRfq
  }), /*#__PURE__*/React.createElement(SupInvHost, {
    openId: billPo,
    setOpen: setBillPo
  }));
}
Object.assign(window, {
  SupplierPortal,
  SupplierDashboard,
  SupplierRfqs,
  SupplierOrders,
  SupplierInvoices,
  RfqBidHost,
  RfqBidPanel,
  RfqRow,
  PoRow,
  SupRfqPill,
  PoStatusPill,
  SupInvPill,
  SupInvRow,
  SupInvHost,
  SupplierInvoicePanel
});
})();
