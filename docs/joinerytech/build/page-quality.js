/* AUTO-GENERATED from page-quality.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-quality.jsx — MINŐSÉGBIZTOSÍTÁS világ (QA/QC)
//   Áttekintés (KPI + SLA-veszély + nyitott ellenőrzések) + Ellenőrzések
//   (szűrhető lista) + Tábla (státusz-oszlopok) + részlet-SlideOver (checklist +
//   FSM + hibajegyzőkönyv/NCR) + új ellenőrzés sheet.
//   Store: window.sim.qaInspections + akciók; QaEngine (FSM/SLA/megfelelés).
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateQ
} = React;

// ── Közös elemek ─────────────────────────────────────────────────
function QaStatusPill({
  status,
  size = "md"
}) {
  const t = (window.QA_STATUS || {})[status] || {
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
function QaTypeBadge({
  type,
  size = "md"
}) {
  const m = (window.QA_TYPE_META || {})[type] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-md border font-medium ${cls} ${m.pill}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "shield",
    size: size === "sm" ? 11 : 12
  }), m.short || type);
}
function QaPriorityPill({
  priority,
  size = "md"
}) {
  const p = (window.QA_PRIORITY || {})[priority] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${p.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${p.dot}`
  }), p.label);
}
function QaSlaBadge({
  insp,
  size = "md"
}) {
  const sla = window.QaEngine ? window.QaEngine.sla(insp) : {
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
function QaStepper({
  insp
}) {
  const steps = (window.QA_FLOW || {}).order || [];
  const rework = insp.status === "javitasra",
    scrap = insp.status === "selejt";
  const cur = steps.indexOf(insp.status);
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 overflow-x-auto pb-0.5"
  }, steps.map((st, i) => {
    const done = cur >= 0 && i < cur,
      active = i === cur;
    const lbl = (window.QA_STATUS[st] || {}).label || st;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: st
    }, i > 0 && /*#__PURE__*/React.createElement("div", {
      className: `h-px w-3 shrink-0 ${done ? "bg-lime-300" : "bg-stone-200"}`
    }), /*#__PURE__*/React.createElement("div", {
      className: `shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border ${active ? "bg-lime-600 text-white border-lime-600" : done ? "bg-lime-50 text-lime-700 border-lime-200" : "bg-white text-stone-400 border-stone-200"}`
    }, done && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 10
    }), lbl));
  }), (rework || scrap) && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "h-px w-3 shrink-0 bg-stone-300"
  }), /*#__PURE__*/React.createElement("div", {
    className: `shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border ${scrap ? "bg-rose-100 text-rose-600 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: scrap ? "x" : "rotate",
    size: 10
  }), (window.QA_STATUS[insp.status] || {}).label)));
}
function InspRow({
  insp,
  onOpen
}) {
  const m = (window.QA_TYPE_META || {})[insp.type] || {};
  const pr = window.QaEngine ? window.QaEngine.progress(insp) : {
    done: 0,
    total: 0
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(insp.id),
    className: "w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg grid place-items-center shrink-0",
    style: {
      background: (m.accent || "#65a30d") + "1a",
      color: m.accent || "#65a30d"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "shield",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, insp.subject), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate mt-0.5"
  }, insp.id, " \xB7 ", insp.refLabel || insp.ref || "—"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement(QaTypeBadge, {
    type: insp.type,
    size: "sm"
  }), /*#__PURE__*/React.createElement(QaPriorityPill, {
    priority: insp.priority,
    size: "sm"
  }), /*#__PURE__*/React.createElement(QaSlaBadge, {
    insp: insp,
    size: "sm"
  }), (insp.defects || []).length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 10
  }), insp.defects.length, " hiba"))), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 flex flex-col items-end gap-1"
  }, /*#__PURE__*/React.createElement(QaStatusPill, {
    status: insp.status,
    size: "sm"
  }), pr.total > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-stone-400"
  }, pr.done, "/", pr.total, " pont")));
}
function QaDetailHost({
  openId,
  setOpen
}) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const insp = openId ? (sim.qaInspections || []).find(x => x.id === openId) : null;
  const onClose = () => setOpen(null);
  return /*#__PURE__*/React.createElement(SO, {
    open: !!insp,
    onClose: onClose,
    title: insp ? insp.subject : "",
    subtitle: insp ? `${insp.id} · ${insp.refLabel || insp.ref}` : "",
    width: 580
  }, insp && window.InspDetail ? /*#__PURE__*/React.createElement(window.InspDetail, {
    insp: insp,
    onClose: onClose
  }) : null);
}

// ── Áttekintés ───────────────────────────────────────────────────
function QualityDashboard({
  onScreen
}) {
  const sim = useSim();
  const list = sim.qaInspections || [];
  const [openId, setOpenId] = useStateQ(null);
  const [newOpen, setNewOpen] = useStateQ(false);
  const E = window.QaEngine;
  const open = list.filter(i => E && E.isOpen(i));
  const overdue = open.filter(i => {
    const s = E.sla(i);
    return s.active && s.overdue;
  });
  const pass = E ? E.passRate(list) : {
    rate: 0,
    pass: 0,
    closed: 0
  };
  const defects = list.reduce((n, i) => n + (i.defects || []).length, 0);
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
  }, "Min\u0151s\xE9g"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "\xC1tad\xE1s el\u0151tti min\u0151s\xE9g-ellen\u0151rz\xE9s \u2014 ", window.QA_TODAY)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-lime-600 hover:bg-lime-700 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "\xDAj ellen\u0151rz\xE9s")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement(KPI, {
    label: "Nyitott ellen\u0151rz\xE9s",
    value: open.length,
    sub: "folyamatban",
    tone: "lime",
    icon: "shield"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "SLA lej\xE1rt",
    value: overdue.length,
    sub: "hat\xE1rid\u0151n t\xFAl",
    tone: "amber",
    icon: "clock"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Megfelel\xE9si ar\xE1ny",
    value: `${Math.round(pass.rate * 100)}%`,
    sub: `${pass.pass}/${pass.closed} lezárt`,
    tone: "emerald",
    icon: "check"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Nyitott hibat\xE9tel",
    value: defects,
    sub: "NCR-ekben",
    tone: "rose",
    icon: "alert"
  })), overdue.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 18,
    className: "text-rose-600 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-rose-800"
  }, overdue.length, " ellen\u0151rz\xE9s SLA-hat\xE1rideje lej\xE1rt"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-rose-700/80 truncate"
  }, overdue.map(i => i.id).join(", ")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Nyitott ellen\u0151rz\xE9sek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("inspections"),
    className: "text-[11.5px] text-lime-700 font-medium inline-flex items-center gap-1"
  }, "Mind ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  }))), open.length ? open.sort((a, b) => window.QA_PRIORITY[b.priority].rank - window.QA_PRIORITY[a.priority].rank).map(i => /*#__PURE__*/React.createElement(InspRow, {
    key: i.id,
    insp: i,
    onOpen: setOpenId
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-10 text-center text-[12.5px] text-stone-400"
  }, "Nincs nyitott ellen\u0151rz\xE9s. \uD83C\uDF89")), /*#__PURE__*/React.createElement(QaDetailHost, {
    openId: openId,
    setOpen: setOpenId
  }), newOpen && window.NewInspSheet && /*#__PURE__*/React.createElement(window.NewInspSheet, {
    onClose: () => setNewOpen(false),
    onCreated: id => {
      setNewOpen(false);
      setOpenId(id);
    }
  }));
}

// ── Ellenőrzések (lista) ─────────────────────────────────────────
function QualityInspections() {
  const sim = useSim();
  const [openId, setOpenId] = useStateQ(null);
  const [newOpen, setNewOpen] = useStateQ(false);
  const [typeF, setTypeF] = useStateQ("all");
  const [statusF, setStatusF] = useStateQ("open");
  const [q, setQ] = useStateQ("");
  const list = (sim.qaInspections || []).filter(i => (typeF === "all" || i.type === typeF) && (statusF === "all" ? true : statusF === "open" ? window.QaEngine && window.QaEngine.isOpen(i) : i.status === statusF) && (!q.trim() || (i.subject + " " + i.id + " " + (i.refLabel || "") + " " + (i.supplier || "")).toLowerCase().includes(q.toLowerCase())));
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Ellen\u0151rz\xE9sek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-lime-600 hover:bg-lime-700 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "\xDAj ellen\u0151rz\xE9s")), /*#__PURE__*/React.createElement("div", {
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
    className: "w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-lime-500"
  })), /*#__PURE__*/React.createElement("select", {
    value: statusF,
    onChange: e => setStatusF(e.target.value),
    className: "h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-lime-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: "open"
  }, "Csak nyitott"), /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Minden st\xE1tusz"), Object.keys(window.QA_STATUS || {}).map(k => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, window.QA_STATUS[k].label)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-3 overflow-x-auto pb-1"
  }, [["all", "Mind"], ...window.QA_TYPE_ORDER.map(k => [k, window.QA_TYPE_META[k].short])].map(([k, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setTypeF(k),
    className: `shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${typeF === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`
  }, lbl))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, list.length ? list.map(i => /*#__PURE__*/React.createElement(InspRow, {
    key: i.id,
    insp: i,
    onOpen: setOpenId
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs tal\xE1lat.")), /*#__PURE__*/React.createElement(QaDetailHost, {
    openId: openId,
    setOpen: setOpenId
  }), newOpen && window.NewInspSheet && /*#__PURE__*/React.createElement(window.NewInspSheet, {
    onClose: () => setNewOpen(false),
    onCreated: id => {
      setNewOpen(false);
      setOpenId(id);
    }
  }));
}

// ── Tábla (státusz-oszlopok) ─────────────────────────────────────
function QualityBoard() {
  const sim = useSim();
  const [openId, setOpenId] = useStateQ(null);
  const list = sim.qaInspections || [];
  const cols = [...((window.QA_FLOW || {}).order || []), "javitasra", "selejt"];
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1500px] mx-auto"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900 mb-1"
  }, "T\xE1bla"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mb-4"
  }, "Az ellen\u0151rz\xE9sek \xE1llapot szerint \u2014 koppints egy k\xE1rty\xE1ra."), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto pb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 min-w-max"
  }, cols.map(st => {
    const meta = window.QA_STATUS[st] || {};
    const items = list.filter(i => i.status === st);
    return /*#__PURE__*/React.createElement("div", {
      key: st,
      className: "w-[250px] shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between px-1 mb-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1.5 text-[12px] font-semibold text-stone-700"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-2 h-2 rounded-full ${meta.dot}`
    }), meta.label), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-400"
    }, items.length)), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2 min-h-[60px]"
    }, items.map(i => /*#__PURE__*/React.createElement("button", {
      key: i.id,
      onClick: () => setOpenId(i.id),
      className: "w-full text-left bg-white rounded-xl border border-stone-200 p-3 hover:border-stone-300 hover:shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 mb-1.5"
    }, /*#__PURE__*/React.createElement(QaTypeBadge, {
      type: i.type,
      size: "sm"
    }), /*#__PURE__*/React.createElement(QaPriorityPill, {
      priority: i.priority,
      size: "sm"
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-900 leading-tight"
    }, i.subject), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 mt-0.5 truncate"
    }, i.id, " \xB7 ", i.refLabel || i.ref), /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5 flex items-center justify-between"
    }, /*#__PURE__*/React.createElement(QaSlaBadge, {
      insp: i,
      size: "sm"
    }), (i.defects || []).length > 0 && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-rose-600"
    }, i.defects.length, " hiba")))), !items.length && /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl border border-dashed border-stone-200 py-4 text-center text-[11px] text-stone-300"
    }, "\u2014")));
  }))), /*#__PURE__*/React.createElement(QaDetailHost, {
    openId: openId,
    setOpen: setOpenId
  }));
}

// ── Részlet (checklist + FSM + NCR) ──────────────────────────────
function InspDetail({
  insp,
  onClose
}) {
  const sim = useSim();
  const live = (sim.qaInspections || []).find(x => x.id === insp.id) || insp;
  const E = window.QaEngine;
  const next = E ? E.nextStates(live) : [];
  const pr = E ? E.progress(live) : {
    done: 0,
    total: 0,
    fail: 0
  };
  const m = (window.QA_TYPE_META || {})[live.type] || {};
  const [scrapOpen, setScrapOpen] = useStateQ(false);
  const [scrapText, setScrapText] = useStateQ("");
  const [defSev, setDefSev] = useStateQ("major");
  const [defNote, setDefNote] = useStateQ("");
  const cycle = (idx, cur) => {
    const order = [null, true, false];
    const nextV = order[(order.indexOf(cur) + 1) % 3];
    window.sim.setQaCheck(live.id, idx, nextV);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(window.QaTypeBadge, {
    type: live.type
  }), /*#__PURE__*/React.createElement(window.QaStatusPill, {
    status: live.status
  }), /*#__PURE__*/React.createElement(window.QaPriorityPill, {
    priority: live.priority
  }), /*#__PURE__*/React.createElement(window.QaSlaBadge, {
    insp: live
  })), /*#__PURE__*/React.createElement(window.QaStepper, {
    insp: live
  }), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3 space-y-1.5"
  }, live.note && /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-700"
  }, live.note), live.refLabel && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 14,
    className: "text-stone-400"
  }), live.refLabel, /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[10.5px] text-stone-400"
  }, "\xB7 ", live.ref)), live.supplier && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "truck",
    size: 14,
    className: "text-stone-400"
  }), live.supplier), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-[11px] text-stone-400 pt-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 12
  }), live.inspector), /*#__PURE__*/React.createElement("span", null, "Felv\xE9ve: ", live.reportedAt))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Ellen\u0151rz\u0151lista"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, pr.done, "/", pr.total, " kit\xF6ltve", pr.fail > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-rose-600"
  }, " \xB7 ", pr.fail, " hib\xE1s"))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, (live.checklist || []).map((c, idx) => /*#__PURE__*/React.createElement("button", {
    key: idx,
    onClick: () => cycle(idx, c.ok),
    className: "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 text-left"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-5 h-5 rounded grid place-items-center shrink-0 border ${c.ok === true ? "bg-emerald-500 border-emerald-500 text-white" : c.ok === false ? "bg-rose-500 border-rose-500 text-white" : "border-stone-300 bg-white"}`
  }, c.ok === true ? /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  }) : c.ok === false ? /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  }) : null), /*#__PURE__*/React.createElement("span", {
    className: `text-[12.5px] flex-1 ${c.ok === false ? "text-rose-700" : "text-stone-700"}`
  }, c.label))), !(live.checklist || []).length && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs ellen\u0151rz\u0151lista."))), E && E.isOpen(live) && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Eredm\xE9ny / l\xE9ptet\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, next.map(to => {
    const st = window.QA_STATUS[to] || {};
    const pass = to === "megfelelt",
      scrap = to === "selejt",
      rework = to === "javitasra";
    return /*#__PURE__*/React.createElement("button", {
      key: to,
      onClick: () => {
        if (scrap) {
          setScrapOpen(true);
        } else {
          window.sim.setQaStatus(live.id, to);
        }
      },
      className: `inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${pass ? "bg-emerald-600 text-white hover:bg-emerald-700" : scrap ? "bg-rose-600 text-white hover:bg-rose-700" : rework ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-lime-600 text-white hover:bg-lime-700"}`
    }, pass ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14
    }) : scrap ? /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    }) : rework ? /*#__PURE__*/React.createElement(Icon, {
      name: "rotate",
      size: 14
    }) : /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 14
    }), st.label);
  })), scrapOpen && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-stone-600 font-medium block mb-1"
  }, "Selejt indoka ", (live.defects || []).length ? "(opcionális — van hibatétel)" : "(kötelező)"), /*#__PURE__*/React.createElement("textarea", {
    value: scrapText,
    onChange: e => setScrapText(e.target.value),
    rows: 2,
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-stone-400",
    placeholder: "Pl. gy\xE1ri hiba, teljes t\xE9tel selejt\u2026"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (window.sim.setQaStatus(live.id, "selejt", {
        reason: scrapText
      })) {
        setScrapOpen(false);
        setScrapText("");
      }
    },
    className: "h-8 px-3 rounded-lg bg-rose-600 text-white text-[12px] font-medium"
  }, "Selejt"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setScrapOpen(false);
      setScrapText("");
    },
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse")))), live.status === "megfelelt" && live.type !== "vegellenorzes" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16,
    className: "text-emerald-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-emerald-800"
  }, "Megfelelt", live.closedAt ? ` · ${live.closedAt}` : "")), live.status === "megfelelt" && live.type === "vegellenorzes" && (() => {
    const sh = live.ref && window.sim.shipmentForRef ? window.sim.shipmentForRef(live.ref) : null;
    return /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl border border-emerald-200 bg-emerald-50 p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 16,
      className: "text-emerald-600 shrink-0"
    }), /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-emerald-800 flex-1"
    }, "Megfelelt", live.closedAt ? ` · ${live.closedAt}` : "", " \u2014 a rendel\xE9s kisz\xE1ll\xEDt\xE1sra k\xE9sz")), sh ? /*#__PURE__*/React.createElement("button", {
      onClick: () => window.navigateTo && window.navigateTo("logistics", "deliveries"),
      className: "mt-2.5 w-full h-10 rounded-xl bg-white text-sky-700 border border-sky-200 text-[12.5px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-sky-50"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "truck",
      size: 15
    }), "Fuvar: ", sh.id, " \xB7 ", (window.LOG_STATUS[sh.status] || {}).label || sh.status, " \u2014 Logisztika megnyit\xE1sa") : /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.createDeliveryFromQa(live.id),
      className: "mt-2.5 w-full h-11 rounded-xl bg-sky-600 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-sky-700"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "truck",
      size: 16
    }), "Kisz\xE1ll\xEDt\xE1sra k\xE9sz \u2014 fuvar l\xE9trehoz\xE1sa"));
  })(), live.status === "selejt" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16,
    className: "text-rose-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-rose-800"
  }, "Selejt", live.type === "bejovo" ? " · beszállítói reklamáció jelezve" : "")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Hibajegyz\u0151k\xF6nyv (NCR)"), (live.defects || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mb-2"
  }, live.defects.map((d, idx) => {
    const sv = window.QA_DEFECT_SEV[d.sev] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: "flex items-start gap-2 px-2.5 py-2 rounded-lg border border-stone-200"
    }, /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1 rounded-full border font-medium px-1.5 h-5 text-[10px] shrink-0 mt-0.5 ${sv.pill}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${sv.dot}`
    }), sv.label), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] text-stone-700 flex-1"
    }, d.note), E && E.isOpen(live) && /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.removeQaDefect(live.id, idx),
      className: "text-stone-300 hover:text-rose-500 shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    })));
  })), E && E.isOpen(live) && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-2.5 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, window.QA_DEFECT_ORDER.map(k => {
    const sv = window.QA_DEFECT_SEV[k];
    const on = defSev === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setDefSev(k),
      className: `inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-medium border ${on ? sv.pill : "bg-white text-stone-500 border-stone-200"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${sv.dot}`
    }), sv.label);
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end gap-2"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: defNote,
    onChange: e => setDefNote(e.target.value),
    rows: 1,
    placeholder: "Hiba le\xEDr\xE1sa\u2026",
    className: "flex-1 px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-lime-500 resize-none"
  }), /*#__PURE__*/React.createElement("button", {
    disabled: !defNote.trim(),
    onClick: () => {
      window.sim.addQaDefect(live.id, {
        sev: defSev,
        note: defNote
      });
      setDefNote("");
    },
    className: "h-9 px-3 rounded-lg bg-stone-900 text-white text-[12px] font-medium disabled:opacity-40 shrink-0"
  }, "R\xF6gz\xEDt")))), (live.log || []).length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
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

// ── Új ellenőrzés sheet ──────────────────────────────────────────
function NewInspSheet({
  onClose,
  onCreated
}) {
  const sim = useSim();
  const [type, setType] = useStateQ("gyartaskozi");
  const [priority, setPriority] = useStateQ("kozepes");
  const [subject, setSubject] = useStateQ("");
  const [refLabel, setRefLabel] = useStateQ("");
  const [supplier, setSupplier] = useStateQ("");
  const [note, setNote] = useStateQ("");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-lime-500";
  const create = () => {
    if (!subject.trim()) return;
    const id = window.sim.addQaInspection({
      type,
      priority,
      subject,
      refLabel,
      supplier: type === "bejovo" ? supplier : "",
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
    className: "relative bg-white w-full md:max-w-[500px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "\xDAj ellen\u0151rz\xE9s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, window.QA_TYPE_ORDER.map(k => {
    const m = window.QA_TYPE_META[k];
    const on = type === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setType(k),
      className: `flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border ${on ? "border-lime-500 bg-lime-50" : "border-stone-200 bg-white"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 18,
      className: on ? "text-lime-700" : "text-stone-400"
    }), /*#__PURE__*/React.createElement("span", {
      className: `text-[11px] font-medium text-center leading-tight ${on ? "text-lime-800" : "text-stone-600"}`
    }, m.short));
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "T\xE1rgy *"), /*#__PURE__*/React.createElement("input", {
    value: subject,
    onChange: e => setSubject(e.target.value),
    placeholder: "Mit ellen\u0151rz\xFCnk?",
    className: cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Hivatkoz\xE1s (rendel\xE9s / PO / projekt)"), /*#__PURE__*/React.createElement("input", {
    value: refLabel,
    onChange: e => setRefLabel(e.target.value),
    placeholder: "Pl. Bogn\xE1r \u2014 konyhab\xFAtor",
    className: cls
  })), type === "bejovo" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Besz\xE1ll\xEDt\xF3"), /*#__PURE__*/React.createElement("input", {
    value: supplier,
    onChange: e => setSupplier(e.target.value),
    placeholder: "Besz\xE1ll\xEDt\xF3 neve",
    className: cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Priorit\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, window.QA_PRIORITY_ORDER.map(k => {
    const p = window.QA_PRIORITY[k];
    const on = priority === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setPriority(k),
      className: `flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg text-[11.5px] font-medium border ${on ? p.pill : "bg-white text-stone-500 border-stone-200"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${p.dot}`
    }), p.label);
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("textarea", {
    value: note,
    onChange: e => setNote(e.target.value),
    rows: 2,
    placeholder: "R\xE9szletek\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-lime-500"
  })), /*#__PURE__*/React.createElement("button", {
    disabled: !subject.trim(),
    onClick: create,
    className: "w-full h-10 rounded-xl bg-lime-600 text-white text-[13px] font-semibold disabled:opacity-40"
  }, "Ellen\u0151rz\xE9s l\xE9trehoz\xE1sa"))));
}
Object.assign(window, {
  QaStatusPill,
  QaTypeBadge,
  QaPriorityPill,
  QaSlaBadge,
  QaStepper,
  InspRow,
  QaDetailHost,
  QualityDashboard,
  QualityInspections,
  QualityBoard,
  InspDetail,
  NewInspSheet
});
})();
