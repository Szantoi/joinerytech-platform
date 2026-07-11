/* AUTO-GENERATED from page-ehs.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-ehs.jsx — MUNKAVÉDELEM / EHS világ (üzemi munkavédelem)
//   Áttekintés (KPI + lejáró oktatás + nyitott incidens) + Balesetek (lista +
//   FSM-detail + CAPA) + Kockázatok (mátrix-kártyák + detail) + Oktatás
//   (dolgozónkénti lejárat-tábla). A detail-SlideOverök + sheetek a
//   page-ehs-2.jsx-ben élnek (window.*). Store: sim.ehs* + EhsEngine.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateE
} = React;

// ── Közös elemek ─────────────────────────────────────────────────
function EhsTypeBadge({
  type,
  size = "md"
}) {
  const m = (window.EHS_INC_TYPE || {})[type] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-md border font-medium ${cls} ${m.pill}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "alert",
    size: size === "sm" ? 11 : 12
  }), m.short || type);
}
function EhsSevPill({
  sev,
  size = "md"
}) {
  const s = (window.EHS_INC_SEV || {})[sev] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${s.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${s.dot}`
  }), s.short || sev);
}
function EhsStatusPill({
  status,
  size = "md"
}) {
  const t = (window.EHS_INC_STATUS || {})[status] || {
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
function EhsRiskBadge({
  risk,
  residual = false,
  size = "md"
}) {
  const E = window.EhsEngine;
  if (!E) return null;
  const sc = residual ? E.residualScore(risk) : E.score(risk);
  const band = E.band(sc);
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-semibold tabular-nums ${cls} ${band.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${band.dot}`
  }), sc, " \xB7 ", band.label);
}
function EhsSlaBadge({
  inc,
  size = "md"
}) {
  const sla = window.EhsEngine ? window.EhsEngine.sla(inc) : {
    active: false
  };
  if (!sla.active) return null;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  if (sla.overdue) return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium bg-rose-50 text-rose-700 border-rose-200 ${cls}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 11
  }), Math.abs(sla.daysLeft), " napja lej\xE1rt");
  if (sla.daysLeft <= 1) return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium bg-amber-50 text-amber-700 border-amber-200 ${cls}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 11
  }), sla.daysLeft === 0 ? "ma jár le" : "1 nap");
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium bg-stone-50 text-stone-500 border-stone-200 ${cls}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 11
  }), sla.daysLeft, " nap");
}
function EhsStepper({
  inc
}) {
  const steps = (window.EHS_INC_FLOW || {}).order || [];
  const rejected = inc.status === "elutasitva";
  const cur = steps.indexOf(inc.status);
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 overflow-x-auto pb-0.5"
  }, steps.map((st, i) => {
    const done = cur >= 0 && i < cur,
      active = i === cur;
    const lbl = (window.EHS_INC_STATUS[st] || {}).label || st;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: st
    }, i > 0 && /*#__PURE__*/React.createElement("div", {
      className: `h-px w-3 shrink-0 ${done ? "bg-red-300" : "bg-stone-200"}`
    }), /*#__PURE__*/React.createElement("div", {
      className: `shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border ${active ? "bg-red-600 text-white border-red-600" : done ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-stone-400 border-stone-200"}`
    }, done && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 10
    }), lbl));
  }), rejected && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "h-px w-3 shrink-0 bg-stone-300"
  }), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border bg-rose-100 text-rose-600 border-rose-200"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 10
  }), "Elutas\xEDtva")));
}
function IncRow({
  inc,
  onOpen
}) {
  const m = (window.EHS_INC_TYPE || {})[inc.type] || {};
  const prog = window.EhsEngine ? window.EhsEngine.actionProgress(inc) : {
    done: 0,
    total: 0,
    open: 0
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(inc.id),
    className: "w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg grid place-items-center shrink-0",
    style: {
      background: (m.accent || "#e11d48") + "1a",
      color: m.accent || "#e11d48"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "alert",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, inc.subject), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate mt-0.5"
  }, inc.id, " \xB7 ", inc.location || "—"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement(EhsTypeBadge, {
    type: inc.type,
    size: "sm"
  }), /*#__PURE__*/React.createElement(EhsSevPill, {
    sev: inc.sev,
    size: "sm"
  }), /*#__PURE__*/React.createElement(EhsSlaBadge, {
    inc: inc,
    size: "sm"
  }), prog.open > 0 && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 10
  }), prog.open, " nyitott CAPA"))), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0"
  }, /*#__PURE__*/React.createElement(EhsStatusPill, {
    status: inc.status,
    size: "sm"
  })));
}
function EhsDetailHost({
  openId,
  setOpen
}) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const inc = openId ? (sim.ehsIncidents || []).find(x => x.id === openId) : null;
  const onClose = () => setOpen(null);
  return /*#__PURE__*/React.createElement(SO, {
    open: !!inc,
    onClose: onClose,
    title: inc ? inc.subject : "",
    subtitle: inc ? `${inc.id} · ${(window.EHS_INC_TYPE[inc.type] || {}).label || inc.type}` : "",
    width: 580
  }, inc && window.IncDetail ? /*#__PURE__*/React.createElement(window.IncDetail, {
    inc: inc,
    onClose: onClose
  }) : null);
}

// ── Áttekintés ───────────────────────────────────────────────────
function EhsDashboard({
  onScreen
}) {
  const sim = useSim();
  const E = window.EhsEngine;
  const [openId, setOpenId] = useStateE(null);
  const [newOpen, setNewOpen] = useStateE(false);
  const incs = sim.ehsIncidents || [];
  const risks = sim.ehsRisks || [];
  const trainings = sim.ehsTrainings || [];
  const today = window.EHS_TODAY;
  const open = incs.filter(i => E && E.isOpen(i));
  const capaOverdue = [];
  incs.forEach(i => (E ? E.openActions(i) : []).forEach(a => {
    if (a.due && a.due < today) capaOverdue.push(a);
  }));
  const expired = E ? E.expiredTrainings(trainings) : [];
  const expiring = E ? E.expiringTrainings(trainings) : [];
  const kiemelt = risks.filter(r => E && E.riskBand(r).key === "kiemelt");
  const rate = E ? E.recordableRate(incs) : {
    count: 0,
    lost: 0
  };
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
    className: "flex items-center justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Munkav\xE9delem"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "\xDCzemi munkav\xE9delem (Mvt. / ISO 45001) \u2014 ", today)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "Bejelent\xE9s")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement(KPI, {
    label: "Nyitott incidens",
    value: open.length,
    sub: "kivizsg\xE1l\xE1s alatt",
    tone: "rose",
    icon: "alert"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Lej\xE1rt int\xE9zked\xE9s",
    value: capaOverdue.length,
    sub: "CAPA hat\xE1rid\u0151n t\xFAl",
    tone: "amber",
    icon: "clock"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Lej\xE1rt oktat\xE1s",
    value: expired.length,
    sub: `${expiring.length} hamarosan lejár`,
    tone: "orange",
    icon: "shield"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Kiemelt kock\xE1zat",
    value: kiemelt.length,
    sub: `${risks.length} értékelés`,
    tone: "red",
    icon: "bolt"
  })), expired.length + expiring.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("training"),
    className: "w-full text-left mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3 hover:bg-amber-100/70"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield",
    size: 18,
    className: "text-amber-600 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-amber-800"
  }, expired.length, " lej\xE1rt \xE9s ", expiring.length, " hamarosan lej\xE1r\xF3 oktat\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-amber-700/80 truncate"
  }, "K\xF6telez\u0151 munkav\xE9delmi / g\xE9pkezel\u0151i oktat\xE1sok \u2014 p\xF3tl\xE1s sz\xFCks\xE9ges.")), /*#__PURE__*/React.createElement(Icon, {
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
  }, "Nyitott incidensek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("incidents"),
    className: "text-[11.5px] text-red-700 font-medium inline-flex items-center gap-1"
  }, "Mind ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  }))), open.length ? open.map(i => /*#__PURE__*/React.createElement(IncRow, {
    key: i.id,
    inc: i,
    onOpen: setOpenId
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-10 text-center text-[12.5px] text-stone-400"
  }, "Nincs nyitott incidens. \uD83C\uDF89")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Legmagasabb kock\xE1zatok"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("risks"),
    className: "text-[11.5px] text-red-700 font-medium inline-flex items-center gap-1"
  }, "Mind ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  }))), /*#__PURE__*/React.createElement("div", {
    className: "p-3 space-y-2"
  }, risks.slice().sort((a, b) => E.score(b) - E.score(a)).slice(0, 4).map(r => /*#__PURE__*/React.createElement("div", {
    key: r.id,
    className: "flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-stone-100 text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: r.icon || "alert",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-800 truncate"
  }, r.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 truncate"
  }, r.scope)), /*#__PURE__*/React.createElement(EhsRiskBadge, {
    risk: r,
    size: "sm"
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 16,
    className: "text-stone-400 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, "R\xF6gz\xEDtett munkabaleset: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-700"
  }, rate.count), " \xB7 ebb\u0151l munkaid\u0151-kies\xE9ssel: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-700"
  }, rate.lost), ". A nyitott int\xE9zked\xE9sek a ", /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("tasks"),
    className: "text-red-700 font-medium underline"
  }, "Feladataim"), " k\xF6z\xF6tt is megjelennek.")), /*#__PURE__*/React.createElement(EhsDetailHost, {
    openId: openId,
    setOpen: setOpenId
  }), newOpen && window.NewIncSheet && /*#__PURE__*/React.createElement(window.NewIncSheet, {
    onClose: () => setNewOpen(false),
    onCreated: id => {
      setNewOpen(false);
      setOpenId(id);
    }
  }));
}

// ── Balesetek (lista) ────────────────────────────────────────────
function EhsIncidents() {
  const sim = useSim();
  const [openId, setOpenId] = useStateE(null);
  const [newOpen, setNewOpen] = useStateE(false);
  const [typeF, setTypeF] = useStateE("all");
  const [statusF, setStatusF] = useStateE("open");
  const [q, setQ] = useStateE("");
  const E = window.EhsEngine;
  const list = (sim.ehsIncidents || []).filter(i => (typeF === "all" || i.type === typeF) && (statusF === "all" ? true : statusF === "open" ? E && E.isOpen(i) : i.status === statusF) && (!q.trim() || (i.subject + " " + i.id + " " + (i.location || "") + " " + (i.assetLabel || "")).toLowerCase().includes(q.toLowerCase())));
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Balesetek & kv\xE1zibalesetek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "Bejelent\xE9s")), /*#__PURE__*/React.createElement("div", {
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
    className: "w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-red-500"
  })), /*#__PURE__*/React.createElement("select", {
    value: statusF,
    onChange: e => setStatusF(e.target.value),
    className: "h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-red-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: "open"
  }, "Csak nyitott"), /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Minden st\xE1tusz"), Object.keys(window.EHS_INC_STATUS || {}).map(k => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, window.EHS_INC_STATUS[k].label)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-3 overflow-x-auto pb-1"
  }, [["all", "Mind"], ...window.EHS_INC_TYPE_ORDER.map(k => [k, window.EHS_INC_TYPE[k].short])].map(([k, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setTypeF(k),
    className: `shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${typeF === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`
  }, lbl))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, list.length ? list.map(i => /*#__PURE__*/React.createElement(IncRow, {
    key: i.id,
    inc: i,
    onOpen: setOpenId
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs tal\xE1lat.")), /*#__PURE__*/React.createElement(EhsDetailHost, {
    openId: openId,
    setOpen: setOpenId
  }), newOpen && window.NewIncSheet && /*#__PURE__*/React.createElement(window.NewIncSheet, {
    onClose: () => setNewOpen(false),
    onCreated: id => {
      setNewOpen(false);
      setOpenId(id);
    }
  }));
}

// ── Kockázatok (mátrix-kártyák) ──────────────────────────────────
function RiskCard({
  risk,
  onOpen
}) {
  const E = window.EhsEngine;
  const band = E.riskBand(risk);
  const due = E.isReviewDue(risk);
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(risk.id),
    className: "text-left bg-white rounded-2xl border border-stone-200 p-4 hover:border-stone-300 hover:shadow-sm transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg grid place-items-center shrink-0",
    style: {
      background: band.cell + "1a",
      color: band.cell
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: risk.icon || "alert",
    size: 18
  })), /*#__PURE__*/React.createElement(EhsRiskBadge, {
    risk: risk
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 leading-tight"
  }, risk.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mt-0.5"
  }, risk.scope), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-2.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400"
  }, "Marad\xE9k kock\xE1zat:"), /*#__PURE__*/React.createElement(EhsRiskBadge, {
    risk: risk,
    residual: true,
    size: "sm"
  })), due && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 inline-flex items-center gap-1 text-[10.5px] px-1.5 h-5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 10
  }), "Fel\xFClvizsg\xE1lat lej\xE1rt"));
}
function EhsRisks() {
  const sim = useSim();
  const [openId, setOpenId] = useStateE(null);
  const [newOpen, setNewOpen] = useStateE(false);
  const [bandF, setBandF] = useStateE("all");
  const E = window.EhsEngine;
  const list = (sim.ehsRisks || []).filter(r => bandF === "all" || E.riskBand(r).key === bandF).sort((a, b) => E.score(b) - E.score(a));
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Kock\xE1zat\xE9rt\xE9kel\xE9s"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Val\xF3sz\xEDn\u0171s\xE9g \xD7 s\xFAlyoss\xE1g (5\xD75) \u2014 k\xF6telez\u0151 kock\xE1zat\xE9rt\xE9kel\xE9s (Mvt.)")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "\xDAj \xE9rt\xE9kel\xE9s")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-4 overflow-x-auto pb-1"
  }, [["all", "Mind"], ...window.EHS_RISK_BAND_ORDER.map(k => [k, window.EHS_RISK_BAND[k].label])].map(([k, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setBandF(k),
    className: `shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${bandF === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`
  }, lbl))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
  }, list.length ? list.map(r => /*#__PURE__*/React.createElement(RiskCard, {
    key: r.id,
    risk: r,
    onOpen: setOpenId
  })) : /*#__PURE__*/React.createElement("div", {
    className: "col-span-full px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs tal\xE1lat.")), window.RiskDetailHost && /*#__PURE__*/React.createElement(window.RiskDetailHost, {
    openId: openId,
    setOpen: setOpenId
  }), newOpen && window.NewRiskSheet && /*#__PURE__*/React.createElement(window.NewRiskSheet, {
    onClose: () => setNewOpen(false),
    onCreated: id => {
      setNewOpen(false);
      setOpenId(id);
    }
  }));
}

// ── Oktatás & kompetencia (dolgozónkénti lejárat) ────────────────
function EhsTraining() {
  const sim = useSim();
  const [newOpen, setNewOpen] = useStateE(false);
  const [filter, setFilter] = useStateE("all");
  const E = window.EhsEngine;
  const trainings = sim.ehsTrainings || [];
  const emps = (sim.employees || []).filter(e => e.active !== false);
  // dolgozónként csoportosítva
  const byEmp = {};
  trainings.forEach(t => {
    (byEmp[t.empId] = byEmp[t.empId] || []).push(t);
  });
  const statusRank = {
    lejart: 0,
    soon: 1,
    ok: 2
  };
  const rows = emps.map(e => {
    const list = (byEmp[e.id] || []).map(t => ({
      t,
      st: E.trainStatus(t)
    }));
    const worst = list.reduce((w, x) => Math.min(w, statusRank[x.st.key]), 2);
    return {
      emp: e,
      list,
      worst
    };
  }).filter(r => filter === "all" ? true : filter === "issues" ? r.worst < 2 : true).sort((a, b) => a.worst - b.worst);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Oktat\xE1s & kompetencia"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "K\xF6telez\u0151 munkav\xE9delmi oktat\xE1sok lej\xE1rat-figyel\xE9ssel")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "Oktat\xE1s r\xF6gz\xEDt\xE9se")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-4"
  }, [["all", "Minden dolgozó"], ["issues", "Csak figyelmeztetés"]].map(([k, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setFilter(k),
    className: `px-3 h-8 rounded-full text-[12px] font-medium border ${filter === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`
  }, lbl))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, rows.map(({
    emp,
    list
  }) => /*#__PURE__*/React.createElement("div", {
    key: emp.id,
    className: "bg-white rounded-2xl border border-stone-200 p-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5 mb-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-full grid place-items-center text-white text-[11px] font-semibold shrink-0",
    style: {
      background: emp.color || "#78716c"
    }
  }, emp.initials), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, emp.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, emp.role))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, list.length ? list.map(({
    t,
    st
  }) => {
    const km = window.EHS_TRAIN_KIND[t.kind] || {};
    return /*#__PURE__*/React.createElement("span", {
      key: t.id,
      className: `inline-flex items-center gap-1.5 rounded-lg border px-2 h-7 text-[11px] font-medium ${st.pill}`,
      title: `Lejár: ${st.expiresAt}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: km.icon || "shield",
      size: 12
    }), km.short || t.kind, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${st.dot}`
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] opacity-80"
    }, st.key === "lejart" ? "lejárt" : st.key === "soon" ? `${st.daysLeft} nap` : st.expiresAt), st.key !== "ok" && /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.renewEhsTraining(t.id),
      className: "ml-0.5 hover:opacity-70",
      title: "Meg\xFAj\xEDt\xE1s"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "rotate",
      size: 11
    })));
  }) : /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-400"
  }, "Nincs r\xF6gz\xEDtett oktat\xE1s.")))), !rows.length && /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs tal\xE1lat.")), newOpen && window.NewTrainingSheet && /*#__PURE__*/React.createElement(window.NewTrainingSheet, {
    onClose: () => setNewOpen(false),
    onCreated: () => setNewOpen(false)
  }));
}
Object.assign(window, {
  EhsTypeBadge,
  EhsSevPill,
  EhsStatusPill,
  EhsRiskBadge,
  EhsSlaBadge,
  EhsStepper,
  IncRow,
  EhsDetailHost,
  EhsDashboard,
  EhsIncidents,
  RiskCard,
  EhsRisks,
  EhsTraining
});
})();
