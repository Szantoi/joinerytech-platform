/* AUTO-GENERATED from page-rfq.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-rfq.jsx — BESZÁLLÍTÓI AJÁNLATKÉRÉS (RFQ) — a Beszerzés világ képernyője
//   A PO ELÉ fűzött kör: igény/tételek → több beszállító ajánlata → bírálat
//   (ár/átfutás összehasonlítás) → odaítélés a nyertesnek → szállítónkénti PO
//   (createPOsFromReqs). KPI-sáv + lista + részlet-SlideOver (ajánlat-mátrix +
//   FSM) + új ajánlatkérés sheet. Store: window.sim.rfqs + akciók; RfqEngine.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateR
} = React;
const _rhuf = n => n == null ? "—" : Math.round(Number(n) || 0).toLocaleString("hu-HU") + " Ft";

// ── Közös elemek ─────────────────────────────────────────────────
function RfqStatusPill({
  status,
  size = "md"
}) {
  const t = (window.RFQ_STATUS || {})[status] || {
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
function RfqStepper({
  rfq
}) {
  const steps = (window.RFQ_FLOW || {}).order || [];
  const withdrawn = rfq.status === "visszavonva";
  const cur = steps.indexOf(rfq.status);
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 overflow-x-auto pb-0.5"
  }, steps.map((st, i) => {
    const done = cur >= 0 && i < cur,
      active = i === cur;
    const lbl = (window.RFQ_STATUS[st] || {}).label || st;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: st
    }, i > 0 && /*#__PURE__*/React.createElement("div", {
      className: `h-px w-3 shrink-0 ${done ? "bg-amber-300" : "bg-stone-200"}`
    }), /*#__PURE__*/React.createElement("div", {
      className: `shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border ${active ? "bg-amber-500 text-white border-amber-500" : done ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-white text-stone-400 border-stone-200"}`
    }, done && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 10
    }), lbl));
  }), withdrawn && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "h-px w-3 shrink-0 bg-stone-300"
  }), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border bg-rose-50 text-rose-700 border-rose-200"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 10
  }), "Visszavonva")));
}
function RfqRow({
  rfq,
  onOpen
}) {
  const E = window.RfqEngine;
  const resp = E ? E.respondedCount(rfq) : 0;
  const rec = E ? E.recommended(rfq) : null;
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(rfq.id),
    className: "w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-amber-50 text-amber-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "procurement",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, rfq.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate mt-0.5"
  }, rfq.id, " \xB7 ", (rfq.lines || []).length, " t\xE9tel \xB7 ", (rfq.suppliers || []).length, " besz\xE1ll\xEDt\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement(RfqStatusPill, {
    status: rfq.status,
    size: "sm"
  }), resp > 0 && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-medium"
  }, resp, " aj\xE1nlat"), rfq.status === "biralat" && rec && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 10
  }), rec.name.split(" ")[0], " \xB7 ", _rhuf(rec.total)), rfq.awardedTo && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"
  }, rfq.awardedTo.split(" ")[0], rfq.poRef ? ` · ${rfq.poRef}` : ""))), rfq.dueDate && /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Hat\xE1rid\u0151"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-medium text-stone-600"
  }, rfq.dueDate)));
}
function RfqDetailHost({
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
    subtitle: rfq ? `${rfq.id} · határidő ${rfq.dueDate || "—"}` : "",
    width: 680
  }, rfq && window.RfqDetail ? /*#__PURE__*/React.createElement(window.RfqDetail, {
    rfq: rfq,
    onClose: onClose
  }) : null);
}

// ── Megrendelés-vázlatok panel (szállító alá gyűjtve, összevonható) ──────────
function PoDraftPanel({
  onOpenRfq
}) {
  const sim = useSim();
  const drafts = (sim.pos || []).filter(p => p.status === "draft");
  const [open, setOpen] = useStateR(true);
  const [sel, setSel] = useStateR([]);
  const [reqPick, setReqPick] = useStateR(false);
  const reqs = (sim.requisitions || []).filter(r => r.status === "Approved");

  // szállító alá csoportosítva
  const groups = {};
  drafts.forEach(p => {
    (groups[p.supplier] = groups[p.supplier] || []).push(p);
  });
  const supList = Object.keys(groups).sort();
  const toggle = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const mergeSupplier = sup => {
    const ids = groups[sup].filter(p => sel.includes(p.id)).map(p => p.id);
    if (ids.length < 2) return;
    window.sim.mergeDraftPOs(ids);
    setSel([]);
  };
  if (!drafts.length && !reqs.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 mb-4 overflow-hidden"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(!open),
    className: "w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50/60"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "orders",
    size: 16,
    className: "text-amber-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-stone-800"
  }, "Megrendel\xE9s-v\xE1zlatok"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium"
  }, drafts.length)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 15,
    className: `text-stone-400 transition-transform ${open ? "rotate-90" : ""}`
  })), open && /*#__PURE__*/React.createElement("div", {
    className: "px-4 pb-4 border-t border-stone-100 pt-3 space-y-3"
  }, !drafts.length && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs v\xE1zlat. J\xF3v\xE1hagyott ig\xE9nyb\u0151l k\xE9sz\xEDthetsz egyet lent."), supList.map(sup => {
    const items = groups[sup];
    const selInSup = items.filter(p => sel.includes(p.id)).length;
    const supTotal = items.reduce((s, p) => s + (p.total || 0), 0);
    return /*#__PURE__*/React.createElement("div", {
      key: sup,
      className: "rounded-xl border border-stone-200 overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-3 py-2 bg-stone-50/70 flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 min-w-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "truck",
      size: 14,
      className: "text-stone-400 shrink-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-semibold text-stone-800 truncate"
    }, sup), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-400"
    }, items.length, " v\xE1zlat \xB7 ", _rhuf(supTotal))), items.length > 1 && /*#__PURE__*/React.createElement("button", {
      onClick: () => mergeSupplier(sup),
      disabled: selInSup < 2,
      className: "inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-stone-900 text-white text-[11px] font-medium disabled:opacity-30 shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "layers",
      size: 12
    }), "\xD6sszevon", selInSup >= 2 ? ` (${selInSup})` : "")), /*#__PURE__*/React.createElement("div", {
      className: "divide-y divide-stone-100"
    }, items.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      className: "px-3 py-2.5 flex items-center gap-2.5"
    }, items.length > 1 && /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: sel.includes(p.id),
      onChange: () => toggle(p.id),
      className: "shrink-0"
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-mono text-stone-500"
    }, p.id), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-medium"
    }, "V\xE1zlat"), p.approvalPending && /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 10
    }), "J\xF3v\xE1hagy\xE1sra v\xE1r")), /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] text-stone-800 truncate mt-0.5"
    }, (p.lines || []).map(l => `${l.material} (${l.qty} ${l.unit})`).join(", ") || p.material), p.note && /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 mt-0.5"
    }, p.note)), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] font-semibold text-stone-700 shrink-0"
    }, _rhuf(p.total)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 shrink-0"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.releasePO(p.id),
      title: "Megrendel\xE9s (kik\xFCld\xE9s)",
      className: "inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-medium"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 11
    }), "Megrendel"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const rid = window.sim.createRfqFromPO(p.id);
        if (rid && onOpenRfq) onOpenRfq(rid);
      },
      title: "Aj\xE1nlatk\xE9r\xE9s ind\xEDt\xE1sa a v\xE1zlatb\xF3l",
      className: "inline-flex items-center gap-1 h-7 px-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[10.5px] font-medium hover:bg-amber-100"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "send",
      size: 11
    }), "RFQ"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.deletePO(p.id),
      title: "V\xE1zlat t\xF6rl\xE9se",
      className: "w-7 h-7 grid place-items-center rounded-lg border border-stone-200 text-stone-400 hover:text-rose-500"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 13
    })))))));
  }), reqs.length > 0 && /*#__PURE__*/React.createElement("div", null, !reqPick ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setReqPick(true),
    className: "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-stone-200 text-stone-600 text-[12px] font-medium hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), "V\xE1zlat j\xF3v\xE1hagyott ig\xE9nyb\u0151l") : /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50 p-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mb-1.5"
  }, "V\xE1lassz j\xF3v\xE1hagyott ig\xE9nyt \u2192 v\xE1zlat-megrendel\xE9s (a megjegyz\xE9s a forr\xE1sra hivatkozik):"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, reqs.map(r => /*#__PURE__*/React.createElement("button", {
    key: r.id,
    onClick: () => {
      window.sim.requisitionToDraftPO(r.id);
    },
    className: "w-full text-left px-2.5 py-2 rounded-lg border border-stone-200 bg-white hover:border-amber-300 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-mono text-stone-500 shrink-0"
  }, r.id), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-800 truncate flex-1"
  }, r.material, " \xB7 ", r.qty, " ", r.unit), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400 shrink-0"
  }, r.preferredSupplier || "—")))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setReqPick(false),
    className: "mt-2 text-[11px] text-stone-500 hover:text-stone-700"
  }, "Bez\xE1r\xE1s")))));
}

// ── Fő képernyő (KPI + lista) ────────────────────────────────────
function RfqPage() {
  const sim = useSim();
  const list = sim.rfqs || [];
  const [openId, setOpenId] = useStateR(null);
  const [newOpen, setNewOpen] = useStateR(false);
  const [statusF, setStatusF] = useStateR("open");
  const [q, setQ] = useStateR("");
  const E = window.RfqEngine;
  const open = list.filter(r => E && E.isOpen(r));
  const awaiting = open.filter(r => r.status === "biralat");
  const awardedThis = list.filter(r => r.status === "odaitelve");
  const totalSavings = list.reduce((n, r) => {
    const s = E ? E.savings(r) : null;
    return n + (s ? s.amount : 0);
  }, 0);
  const shown = list.filter(r => (statusF === "all" ? true : statusF === "open" ? E && E.isOpen(r) : r.status === statusF) && (!q.trim() || (r.title + " " + r.id + " " + (r.suppliers || []).map(s => s.name).join(" ")).toLowerCase().includes(q.toLowerCase())));
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
  }, "Aj\xE1nlatk\xE9r\xE9s"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Besz\xE1ll\xEDt\xF3i versenyeztet\xE9s a megrendel\xE9s el\u0151tt \u2014 ", window.RFQ_TODAY)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "\xDAj aj\xE1nlatk\xE9r\xE9s")), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement(PoDraftPanel, {
    onOpenRfq: setOpenId
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement(KPI, {
    label: "Nyitott aj\xE1nlatk\xE9r\xE9s",
    value: open.length,
    sub: "folyamatban",
    tone: "amber",
    icon: "procurement"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "B\xEDr\xE1latra v\xE1r",
    value: awaiting.length,
    sub: "aj\xE1nlatok be\xE9rkeztek",
    tone: "sky",
    icon: "layers"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Oda\xEDt\xE9lve",
    value: awardedThis.length,
    sub: "PO gener\xE1lva",
    tone: "emerald",
    icon: "check"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Verseny-megtakar\xEDt\xE1s",
    value: _rhuf(totalSavings),
    sub: "legdr\xE1g\xE1bb vs. nyertes",
    tone: "teal",
    icon: "analytics"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative flex-1 min-w-[160px]"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 15,
    className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Keres\xE9s\u2026",
    className: "w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-amber-500"
  })), /*#__PURE__*/React.createElement("select", {
    value: statusF,
    onChange: e => setStatusF(e.target.value),
    className: "h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: "open"
  }, "Csak nyitott"), /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Minden st\xE1tusz"), Object.keys(window.RFQ_STATUS || {}).map(k => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, window.RFQ_STATUS[k].label)))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, shown.length ? shown.map(r => /*#__PURE__*/React.createElement(RfqRow, {
    key: r.id,
    rfq: r,
    onOpen: setOpenId
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs tal\xE1lat.")), /*#__PURE__*/React.createElement(RfqDetailHost, {
    openId: openId,
    setOpen: setOpenId
  }), newOpen && window.NewRfqSheet && /*#__PURE__*/React.createElement(window.NewRfqSheet, {
    onClose: () => setNewOpen(false),
    onCreated: id => {
      setNewOpen(false);
      setOpenId(id);
    }
  }));
}

// ── Részlet (ajánlat-mátrix + FSM + odaítélés) ───────────────────
function RfqDetail({
  rfq,
  onClose
}) {
  const sim = useSim();
  const live = (sim.rfqs || []).find(x => x.id === rfq.id) || rfq;
  const E = window.RfqEngine;
  const next = E ? E.nextStates(live) : [];
  const editable = live.status === "osszeallitas";
  const canBid = ["kikuldve", "biralat"].includes(live.status);
  const rec = E ? E.recommended(live) : null;
  const savings = E ? E.savings(live) : null;
  const canAward = window.sim.hasPerm && window.sim.hasPerm("rfq.manage");
  const [withdrawOpen, setWithdrawOpen] = useStateR(false);
  const [wReason, setWReason] = useStateR("");
  const [supAdd, setSupAdd] = useStateR("");
  const [lineForm, setLineForm] = useStateR({
    code: "",
    material: "",
    qty: 1,
    unit: "db"
  });
  const supOptions = window.sim.rfqSupplierOptions ? window.sim.rfqSupplierOptions() : [];
  const whItems = window.sim.warehouseItems ? window.sim.warehouseItems() : [];
  const addLine = () => {
    if (!lineForm.material.trim()) return;
    window.sim.addRfqLine(live.id, lineForm);
    setLineForm({
      code: "",
      material: "",
      qty: 1,
      unit: "db"
    });
  };
  const pickItem = id => {
    const it = whItems.find(x => x.id === id);
    if (it) setLineForm({
      code: it.code || "",
      material: it.name,
      qty: 1,
      unit: it.unit || "db"
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(RfqStatusPill, {
    status: live.status
  }), live.note && /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-500"
  }, live.note)), /*#__PURE__*/React.createElement(RfqStepper, {
    rfq: live
  }), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3 flex items-center gap-3 text-[11px] text-stone-400"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 12
  }), live.createdBy), /*#__PURE__*/React.createElement("span", null, "Felv\xE9ve: ", live.createdAt), live.dueDate && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 12
  }), "Hat\xE1rid\u0151: ", live.dueDate)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "T\xE9telek (", (live.lines || []).length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, (live.lines || []).map((ln, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-2 px-2.5 py-2 rounded-lg border border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-800 truncate"
  }, ln.material), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 font-mono"
  }, ln.code || "—")), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-600 shrink-0"
  }, ln.qty, " ", ln.unit), editable && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.removeRfqLine(live.id, i),
    className: "text-stone-300 hover:text-rose-500 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })))), !(live.lines || []).length && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs t\xE9tel.")), editable && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 rounded-xl border border-stone-200 bg-stone-50 p-2.5 space-y-2"
  }, /*#__PURE__*/React.createElement("select", {
    onChange: e => {
      if (e.target.value) pickItem(e.target.value);
      e.target.value = "";
    },
    className: "w-full h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Rakt\xE1ri t\xE9telb\u0151l\u2026"), whItems.map(it => /*#__PURE__*/React.createElement("option", {
    key: it.id,
    value: it.id
  }, it.name, " (", it.code, ")"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    value: lineForm.material,
    onChange: e => setLineForm({
      ...lineForm,
      material: e.target.value
    }),
    placeholder: "Megnevez\xE9s",
    className: "flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500"
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: lineForm.qty,
    onChange: e => setLineForm({
      ...lineForm,
      qty: e.target.value
    }),
    className: "w-16 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500"
  }), /*#__PURE__*/React.createElement("input", {
    value: lineForm.unit,
    onChange: e => setLineForm({
      ...lineForm,
      unit: e.target.value
    }),
    className: "w-12 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addLine,
    disabled: !lineForm.material.trim(),
    className: "h-8 px-2.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium disabled:opacity-40 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }))))), (live.suppliers || []).length > 0 && (live.lines || []).length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Aj\xE1nlatok (\xE1r / \xE1tfut\xE1s)"), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto -mx-1 px-1"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full border-collapse text-[12px]",
    style: {
      minWidth: 360
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "text-left font-medium text-stone-400 text-[10.5px] uppercase tracking-wide py-1.5 pr-2"
  }, "T\xE9tel"), (live.suppliers || []).map(s => /*#__PURE__*/React.createElement("th", {
    key: s.name,
    className: "text-center font-medium text-[11px] py-1.5 px-1.5 min-w-[92px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-700 leading-tight"
  }, s.name.split(" ")[0]), rec && rec.name === s.name && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-0.5 text-[9px] text-emerald-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 9
  }), "legjobb"))))), /*#__PURE__*/React.createElement("tbody", null, (live.lines || []).map((ln, i) => {
    const best = E ? E.bestForLine(live, i) : null;
    return /*#__PURE__*/React.createElement("tr", {
      key: i,
      className: "border-t border-stone-100"
    }, /*#__PURE__*/React.createElement("td", {
      className: "py-1.5 pr-2 align-top"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] font-medium text-stone-800 leading-tight"
    }, ln.material), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-400"
    }, ln.qty, " ", ln.unit)), (live.suppliers || []).map(s => {
      const b = s.bids && s.bids[i];
      const isBest = best && b && b.price === best.price && b.price != null;
      return /*#__PURE__*/React.createElement("td", {
        key: s.name,
        className: "py-1.5 px-1 align-top text-center"
      }, canBid ? /*#__PURE__*/React.createElement("div", {
        className: "flex flex-col items-center gap-1"
      }, /*#__PURE__*/React.createElement("input", {
        type: "number",
        value: b && b.price != null ? b.price : "",
        onChange: e => window.sim.setRfqBid(live.id, s.name, i, {
          price: e.target.value === "" ? null : e.target.value,
          leadDays: b ? b.leadDays : 0
        }),
        placeholder: "\xE1r",
        className: `w-[72px] h-7 px-1.5 text-center rounded border text-[11px] bg-white outline-none focus:border-amber-500 ${isBest ? "border-emerald-300 text-emerald-700 font-semibold" : "border-stone-200"}`
      }), /*#__PURE__*/React.createElement("input", {
        type: "number",
        value: b && b.leadDays != null ? b.leadDays : "",
        onChange: e => window.sim.setRfqBid(live.id, s.name, i, {
          price: b ? b.price : null,
          leadDays: e.target.value === "" ? null : e.target.value
        }),
        placeholder: "nap",
        className: "w-[72px] h-6 px-1.5 text-center rounded border border-stone-200 text-[10px] text-stone-500 bg-white outline-none focus:border-amber-500"
      })) : /*#__PURE__*/React.createElement("div", null, b && b.price != null ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        className: `text-[11.5px] ${isBest ? "text-emerald-700 font-semibold" : "text-stone-700"}`
      }, _rhuf(b.price)), /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] text-stone-400"
      }, b.leadDays, " nap")) : /*#__PURE__*/React.createElement("span", {
        className: "text-stone-300"
      }, "\u2014")));
    }));
  }), /*#__PURE__*/React.createElement("tr", {
    className: "border-t-2 border-stone-200"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-2 pr-2 text-[11px] font-semibold text-stone-600"
  }, "\xD6sszesen"), (live.suppliers || []).map(s => {
    const t = E ? E.supplierTotal(live, s.name) : null;
    const isRec = rec && rec.name === s.name;
    return /*#__PURE__*/React.createElement("td", {
      key: s.name,
      className: "py-2 px-1 text-center align-top"
    }, t && t.lines > 0 ? /*#__PURE__*/React.createElement("div", {
      className: `text-[11.5px] font-semibold ${isRec ? "text-emerald-700" : "text-stone-800"}`
    }, _rhuf(t.total), !t.complete && /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] text-amber-500 block"
    }, "r\xE9szleges")) : /*#__PURE__*/React.createElement("span", {
      className: "text-stone-300 text-[11px]"
    }, "nincs"), !E || !E.isOpen(live) ? null : live.status === "biralat" && t && t.complete && canAward ? /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.awardRfq(live.id, s.name),
      className: "mt-1.5 inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-medium"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 11
    }), "Oda\xEDt\xE9l") : null);
  }))))), savings && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-[11px] text-teal-700 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "analytics",
    size: 13
  }), "Verseny-megtakar\xEDt\xE1s: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, _rhuf(savings.amount)), " (", Math.round(savings.pct * 100), "%) a legdr\xE1g\xE1bbhoz k\xE9pest.")), editable && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Megh\xEDvott besz\xE1ll\xEDt\xF3k"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5 mb-2"
  }, (live.suppliers || []).map(s => /*#__PURE__*/React.createElement("span", {
    key: s.name,
    className: "inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full bg-stone-100 text-stone-700 text-[11.5px] font-medium"
  }, s.name, /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.removeRfqSupplier(live.id, s.name),
    className: "text-stone-400 hover:text-rose-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  })))), !(live.suppliers || []).length && /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-400"
  }, "M\xE9g nincs megh\xEDvott besz\xE1ll\xEDt\xF3.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    list: "rfq-sup-list",
    value: supAdd,
    onChange: e => setSupAdd(e.target.value),
    placeholder: "Besz\xE1ll\xEDt\xF3 neve",
    className: "flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500"
  }), /*#__PURE__*/React.createElement("datalist", {
    id: "rfq-sup-list"
  }, supOptions.map(n => /*#__PURE__*/React.createElement("option", {
    key: n,
    value: n
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (supAdd.trim()) {
        window.sim.addRfqSupplier(live.id, supAdd);
        setSupAdd("");
      }
    },
    className: "h-8 px-2.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium shrink-0"
  }, "Megh\xEDv"))), E && E.isOpen(live) && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap pt-1"
  }, next.filter(t => t !== "visszavonva").map(to => {
    const st = window.RFQ_STATUS[to] || {};
    return /*#__PURE__*/React.createElement("button", {
      key: to,
      onClick: () => window.sim.setRfqStatus(live.id, to),
      className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-amber-500 text-white text-[12.5px] font-medium hover:bg-amber-600"
    }, to === "kikuldve" ? /*#__PURE__*/React.createElement(Icon, {
      name: "send",
      size: 14
    }) : /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 14
    }), st.label);
  }), next.includes("visszavonva") && /*#__PURE__*/React.createElement("button", {
    onClick: () => setWithdrawOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 text-stone-500 text-[12.5px] font-medium hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }), "Visszavon")), withdrawOpen && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50 p-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-stone-600 font-medium block mb-1"
  }, "Visszavon\xE1s oka (opcion\xE1lis)"), /*#__PURE__*/React.createElement("textarea", {
    value: wReason,
    onChange: e => setWReason(e.target.value),
    rows: 2,
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-stone-400",
    placeholder: "Pl. nincs ig\xE9ny, elhalasztva\u2026"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.sim.setRfqStatus(live.id, "visszavonva", {
        reason: wReason
      });
      setWithdrawOpen(false);
    },
    className: "h-8 px-3 rounded-lg bg-rose-600 text-white text-[12px] font-medium"
  }, "Visszavon"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setWithdrawOpen(false),
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse"))), live.status === "biralat" && !canAward && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800 inline-flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 15
  }), "Az oda\xEDt\xE9l\xE9shez ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, "rfq.manage"), " jogosults\xE1g sz\xFCks\xE9ges."), live.status === "odaitelve" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16,
    className: "text-emerald-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-emerald-800"
  }, "Oda\xEDt\xE9lve: ", live.awardedTo, live.poRef ? /*#__PURE__*/React.createElement(React.Fragment, null, " \xB7 megrendel\xE9s ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, live.poRef)) : "")), (live.log || []).length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
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

// ── Új ajánlatkérés sheet ────────────────────────────────────────
function NewRfqSheet({
  onClose,
  onCreated
}) {
  const sim = useSim();
  const [title, setTitle] = useStateR("");
  const [dueDate, setDueDate] = useStateR("");
  const [note, setNote] = useStateR("");
  const [lines, setLines] = useStateR([]);
  const [suppliers, setSuppliers] = useStateR([]);
  const [supAdd, setSupAdd] = useStateR("");
  const [lineForm, setLineForm] = useStateR({
    code: "",
    material: "",
    qty: 1,
    unit: "db"
  });
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-amber-500";
  const whItems = window.sim.warehouseItems ? window.sim.warehouseItems() : [];
  const supOptions = window.sim.rfqSupplierOptions ? window.sim.rfqSupplierOptions() : [];
  const reqs = (sim.requisitions || []).filter(r => ["Draft", "Approved"].includes(r.status));
  const addLine = () => {
    if (!lineForm.material.trim()) return;
    setLines([...lines, {
      ...lineForm,
      qty: Number(lineForm.qty) || 1
    }]);
    setLineForm({
      code: "",
      material: "",
      qty: 1,
      unit: "db"
    });
  };
  const pickItem = id => {
    const it = whItems.find(x => x.id === id);
    if (it) setLineForm({
      code: it.code || "",
      material: it.name,
      qty: 1,
      unit: it.unit || "db"
    });
  };
  const addReq = id => {
    const r = reqs.find(x => x.id === id);
    if (!r) return;
    const ls = r.lines && r.lines.length ? r.lines.map(l => ({
      code: l.code || "",
      material: l.material || l.name,
      qty: l.qty,
      unit: l.unit
    })) : [{
      code: r.matCode || "",
      material: r.material,
      qty: r.qty,
      unit: r.unit
    }];
    setLines([...lines, ...ls]);
    if (r.preferredSupplier && !suppliers.includes(r.preferredSupplier)) setSuppliers([...suppliers, r.preferredSupplier]);
  };
  const create = () => {
    if (!title.trim() || !lines.length) return;
    const id = window.sim.addRfq({
      title,
      dueDate,
      note,
      lines,
      suppliers
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
    className: "relative bg-white w-full md:max-w-[560px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "\xDAj aj\xE1nlatk\xE9r\xE9s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "T\xE1rgy *"), /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "Pl. Korpusz lapanyag \u2014 Q2 ut\xE1nt\xF6lt\xE9s",
    className: cls
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Be\xE9rkez\xE9si hat\xE1rid\u0151"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: dueDate,
    onChange: e => setDueDate(e.target.value),
    className: cls
  }))), reqs.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "T\xE9telek beszerz\xE9si ig\xE9nyb\u0151l"), /*#__PURE__*/React.createElement("select", {
    onChange: e => {
      if (e.target.value) addReq(e.target.value);
      e.target.value = "";
    },
    className: cls
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Ig\xE9ny hozz\xE1ad\xE1sa\u2026"), reqs.map(r => /*#__PURE__*/React.createElement("option", {
    key: r.id,
    value: r.id
  }, r.id, " \xB7 ", r.material, " (", r.qty, " ", r.unit, ")")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "T\xE9telek *"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mb-2"
  }, lines.map((ln, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1 text-[12px] text-stone-800 truncate"
  }, ln.material, " ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "\xB7 ", ln.qty, " ", ln.unit)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setLines(lines.filter((_, j) => j !== i)),
    className: "text-stone-300 hover:text-rose-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })))), !lines.length && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-400"
  }, "M\xE9g nincs t\xE9tel.")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50 p-2.5 space-y-2"
  }, /*#__PURE__*/React.createElement("select", {
    onChange: e => {
      if (e.target.value) pickItem(e.target.value);
      e.target.value = "";
    },
    className: "w-full h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Rakt\xE1ri t\xE9telb\u0151l\u2026"), whItems.map(it => /*#__PURE__*/React.createElement("option", {
    key: it.id,
    value: it.id
  }, it.name, " (", it.code, ")"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    value: lineForm.material,
    onChange: e => setLineForm({
      ...lineForm,
      material: e.target.value
    }),
    placeholder: "Megnevez\xE9s",
    className: "flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500"
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: lineForm.qty,
    onChange: e => setLineForm({
      ...lineForm,
      qty: e.target.value
    }),
    className: "w-14 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500"
  }), /*#__PURE__*/React.createElement("input", {
    value: lineForm.unit,
    onChange: e => setLineForm({
      ...lineForm,
      unit: e.target.value
    }),
    className: "w-12 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addLine,
    disabled: !lineForm.material.trim(),
    className: "h-8 px-2.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium disabled:opacity-40 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Megh\xEDvott besz\xE1ll\xEDt\xF3k"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5 mb-2"
  }, suppliers.map(n => /*#__PURE__*/React.createElement("span", {
    key: n,
    className: "inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full bg-stone-100 text-stone-700 text-[11.5px] font-medium"
  }, n, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSuppliers(suppliers.filter(x => x !== n)),
    className: "text-stone-400 hover:text-rose-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    list: "rfq-new-sup",
    value: supAdd,
    onChange: e => setSupAdd(e.target.value),
    placeholder: "Besz\xE1ll\xEDt\xF3 neve",
    className: "flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500"
  }), /*#__PURE__*/React.createElement("datalist", {
    id: "rfq-new-sup"
  }, supOptions.map(n => /*#__PURE__*/React.createElement("option", {
    key: n,
    value: n
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const n = supAdd.trim();
      if (n && !suppliers.includes(n)) {
        setSuppliers([...suppliers, n]);
        setSupAdd("");
      }
    },
    className: "h-8 px-2.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium shrink-0"
  }, "Hozz\xE1ad"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("textarea", {
    value: note,
    onChange: e => setNote(e.target.value),
    rows: 2,
    placeholder: "R\xE9szletek\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-amber-500"
  })), /*#__PURE__*/React.createElement("button", {
    disabled: !title.trim() || !lines.length,
    onClick: create,
    className: "w-full h-10 rounded-xl bg-amber-500 text-white text-[13px] font-semibold disabled:opacity-40"
  }, "Aj\xE1nlatk\xE9r\xE9s l\xE9trehoz\xE1sa"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 text-center"
  }, "L\xE9trehoz\xE1s ut\xE1n \u201E\xF6ssze\xE1ll\xEDt\xE1s\" \xE1llapotba ker\xFCl; a kik\xFCld\xE9s a r\xE9szlet-n\xE9zetb\u0151l ind\xEDthat\xF3."))));
}
Object.assign(window, {
  RfqStatusPill,
  RfqStepper,
  RfqRow,
  RfqDetailHost,
  PoDraftPanel,
  RfqPage,
  RfqDetail,
  NewRfqSheet
});
})();
