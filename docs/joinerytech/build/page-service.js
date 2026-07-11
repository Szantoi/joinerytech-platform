/* AUTO-GENERATED from page-service.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-service.jsx — REKLAMÁCIÓ világ (1/2)
//   Diszpécser: Áttekintés (KPI + SLA-veszély + lista) + Bejelentések (szűrhető
//   lista) + Tábla (státusz-oszlopok, kanban-szerű). Közös vizuális elemek +
//   a részlet-SlideOver host. A detail + felvétel a page-service-2.jsx-ben.
//   Store: window.sim.serviceTickets + akciók; ServiceEngine (FSM/SLA/garancia).
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateS,
  useMemo: useMemoS
} = React;
const svcRel = d => {
  if (!d) return "";
  const [y, m, dd] = String(d).split("-");
  return `${m}.${dd}`;
};

// ── Közös elemek ─────────────────────────────────────────────────
function SvcStatusPill({
  status,
  size = "md"
}) {
  const t = (window.SVC_STATUS || {})[status] || {
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
function SvcTypeBadge({
  type,
  size = "md"
}) {
  const m = (window.SVC_TYPE_META || {})[type] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-md border font-medium ${cls} ${m.pill}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "shield",
    size: size === "sm" ? 11 : 12
  }), m.short || type);
}
function SvcPriorityPill({
  priority,
  size = "md"
}) {
  const p = (window.SVC_PRIORITY || {})[priority] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${p.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${p.dot}`
  }), p.label);
}

// SLA-jelvény: hátralévő napok / lejárt
function SlaBadge({
  ticket,
  size = "md"
}) {
  const sla = window.ServiceEngine ? window.ServiceEngine.sla(ticket) : {
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

// garancia-jelvény
function WarrantyBadge({
  ticket,
  size = "md"
}) {
  const w = window.ServiceEngine ? window.ServiceEngine.warranty(ticket) : {
    known: false
  };
  if (!w.known) return null;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return w.within ? /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium bg-emerald-50 text-emerald-700 border-emerald-200 ${cls}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield",
    size: 11
  }), "garanci\xE1n bel\xFCl") : /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium bg-stone-100 text-stone-500 border-stone-200 ${cls}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield",
    size: 11
  }), "garanci\xE1n k\xEDv\xFCl");
}

// horizontális FSM lépés-jelző
function SvcStepper({
  ticket
}) {
  const steps = (window.SVC_FLOW || {}).order || [];
  const rejected = ticket.status === "elutasitva";
  const cur = steps.indexOf(ticket.status);
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 overflow-x-auto pb-0.5"
  }, steps.map((st, i) => {
    const done = !rejected && i < cur,
      active = !rejected && i === cur;
    const lbl = (window.SVC_STATUS[st] || {}).label || st;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: st
    }, i > 0 && /*#__PURE__*/React.createElement("div", {
      className: `h-px w-3 shrink-0 ${done ? "bg-rose-300" : "bg-stone-200"}`
    }), /*#__PURE__*/React.createElement("div", {
      className: `shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border ${active ? "bg-rose-600 text-white border-rose-600" : done ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-white text-stone-400 border-stone-200"}`
    }, done && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 10
    }), lbl));
  }), rejected && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "h-px w-3 shrink-0 bg-stone-300"
  }), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border bg-stone-200 text-stone-500 border-stone-300"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 10
  }), "Elutas\xEDtva")));
}
const CHANNEL_LABEL = {
  webshop: "Webshop",
  internal: "Belső felvétel",
  logistics: "Logisztika",
  handover: "Átadási hiánylista"
};

// jegy-sor (lista)
function TicketRow({
  t,
  onOpen
}) {
  const m = (window.SVC_TYPE_META || {})[t.type] || {};
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(t.id),
    className: "w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg grid place-items-center shrink-0",
    style: {
      background: (m.accent || "#dc2626") + "1a",
      color: m.accent || "#dc2626"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "shield",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, t.title), t.delegatedTo && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-0.5 text-[9.5px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 9
  }), t.delegatedTo)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate mt-0.5"
  }, t.id, " \xB7 ", t.customer, t.refLabel ? ` · ${t.refLabel}` : ""), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement(SvcTypeBadge, {
    type: t.type,
    size: "sm"
  }), /*#__PURE__*/React.createElement(SvcPriorityPill, {
    priority: t.priority,
    size: "sm"
  }), /*#__PURE__*/React.createElement(SlaBadge, {
    ticket: t,
    size: "sm"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 flex flex-col items-end gap-1"
  }, /*#__PURE__*/React.createElement(SvcStatusPill, {
    status: t.status,
    size: "sm"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 15,
    className: "text-stone-300"
  })));
}

// ── Detail host ──────────────────────────────────────────────────
function SvcDetailHost({
  openId,
  onClose
}) {
  const sim = useSim();
  const t = openId ? (sim.serviceTickets || []).find(x => x.id === openId) : null;
  const SO = window.SlideOver;
  if (!SO) return null;
  return /*#__PURE__*/React.createElement(SO, {
    open: !!t,
    onClose: onClose,
    title: t ? t.title : "",
    subtitle: t ? `${t.id} · ${t.customer}` : "",
    width: 580
  }, t && window.TicketDetail ? /*#__PURE__*/React.createElement(window.TicketDetail, {
    t: t,
    onClose: onClose
  }) : null);
}

// ── Áttekintés ───────────────────────────────────────────────────
function ServiceDashboard({
  onScreen
}) {
  const sim = useSim();
  const tickets = sim.serviceTickets || [];
  const [openId, setOpenId] = useStateS(null);
  const [newOpen, setNewOpen] = useStateS(false);
  const E = window.ServiceEngine;
  const open = tickets.filter(t => E && E.isOpen(t));
  const overdue = open.filter(t => {
    const s = E.sla(t);
    return s.active && s.overdue;
  });
  const urgent = open.filter(t => t.priority === "surgos" || t.priority === "magas");
  const warranty = tickets.filter(t => t.type === "garancia");
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
  }, "Reklam\xE1ci\xF3"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Szerviz, garancia \xE9s hi\xE1nyp\xF3tl\xE1s \u2014 ", window.SVC_TODAY)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "\xDAj bejelent\xE9s")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement(KPI, {
    label: "Nyitott jegyek",
    value: open.length,
    sub: "folyamatban",
    tone: "rose",
    icon: "shield"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "SLA lej\xE1rt",
    value: overdue.length,
    sub: "hat\xE1rid\u0151n t\xFAl",
    tone: "amber",
    icon: "clock"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "S\xFCrg\u0151s / magas",
    value: urgent.length,
    sub: "priorit\xE1sos",
    tone: "rose",
    icon: "alert"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Garanci\xE1lis",
    value: warranty.length,
    sub: "\xF6sszes garancia-jegy",
    tone: "emerald",
    icon: "shield"
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
  }, overdue.length, " jegy SLA-hat\xE1rideje lej\xE1rt"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-rose-700/80 truncate"
  }, overdue.map(t => t.id).join(", ")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Nyitott bejelent\xE9sek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("tickets"),
    className: "text-[11.5px] text-rose-600 font-medium inline-flex items-center gap-1"
  }, "Mind ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  }))), open.length ? open.sort((a, b) => window.SVC_PRIORITY[b.priority].rank - window.SVC_PRIORITY[a.priority].rank).map(t => /*#__PURE__*/React.createElement(TicketRow, {
    key: t.id,
    t: t,
    onOpen: setOpenId
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-10 text-center text-[12.5px] text-stone-400"
  }, "Nincs nyitott bejelent\xE9s. \uD83C\uDF89")), /*#__PURE__*/React.createElement(SvcDetailHost, {
    openId: openId,
    onClose: () => setOpenId(null)
  }), newOpen && window.NewTicketSheet && /*#__PURE__*/React.createElement(window.NewTicketSheet, {
    onClose: () => setNewOpen(false),
    onCreated: id => {
      setNewOpen(false);
      setOpenId(id);
    }
  }));
}

// ── Bejelentések (lista) ─────────────────────────────────────────
function ServiceTickets() {
  const sim = useSim();
  const [openId, setOpenId] = useStateS(null);
  const [newOpen, setNewOpen] = useStateS(false);
  const [typeF, setTypeF] = useStateS("all");
  const [statusF, setStatusF] = useStateS("open");
  const [q, setQ] = useStateS("");
  const list = (sim.serviceTickets || []).filter(t => (typeF === "all" || t.type === typeF) && (statusF === "all" ? true : statusF === "open" ? window.ServiceEngine && window.ServiceEngine.isOpen(t) : t.status === statusF) && (!q.trim() || (t.title + " " + t.id + " " + t.customer + " " + (t.refLabel || "")).toLowerCase().includes(q.toLowerCase())));
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Bejelent\xE9sek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "\xDAj bejelent\xE9s")), /*#__PURE__*/React.createElement("div", {
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
    className: "w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-500"
  })), /*#__PURE__*/React.createElement("select", {
    value: statusF,
    onChange: e => setStatusF(e.target.value),
    className: "h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-rose-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: "open"
  }, "Csak nyitott"), /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Minden st\xE1tusz"), Object.keys(window.SVC_STATUS || {}).map(k => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, window.SVC_STATUS[k].label)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-3 overflow-x-auto pb-1"
  }, [["all", "Mind"], ...window.SVC_TYPE_ORDER.map(k => [k, window.SVC_TYPE_META[k].short])].map(([k, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setTypeF(k),
    className: `shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${typeF === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`
  }, lbl))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, list.length ? list.map(t => /*#__PURE__*/React.createElement(TicketRow, {
    key: t.id,
    t: t,
    onOpen: setOpenId
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs tal\xE1lat.")), /*#__PURE__*/React.createElement(SvcDetailHost, {
    openId: openId,
    onClose: () => setOpenId(null)
  }), newOpen && window.NewTicketSheet && /*#__PURE__*/React.createElement(window.NewTicketSheet, {
    onClose: () => setNewOpen(false),
    onCreated: id => {
      setNewOpen(false);
      setOpenId(id);
    }
  }));
}

// ── Tábla (státusz-oszlopok) ─────────────────────────────────────
function ServiceBoard() {
  const sim = useSim();
  const [openId, setOpenId] = useStateS(null);
  const tickets = sim.serviceTickets || [];
  const cols = (window.SVC_FLOW || {}).order || [];
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1500px] mx-auto"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900 mb-1"
  }, "T\xE1bla"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mb-4"
  }, "A bejelent\xE9sek \xE1llapot szerint \u2014 koppints egy k\xE1rty\xE1ra a r\xE9szletek\xE9rt."), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto pb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 min-w-max"
  }, cols.map(st => {
    const meta = window.SVC_STATUS[st] || {};
    const items = tickets.filter(t => t.status === st);
    return /*#__PURE__*/React.createElement("div", {
      key: st,
      className: "w-[260px] shrink-0"
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
    }, items.map(t => {
      const m = window.SVC_TYPE_META[t.type] || {};
      return /*#__PURE__*/React.createElement("button", {
        key: t.id,
        onClick: () => setOpenId(t.id),
        className: "w-full text-left bg-white rounded-xl border border-stone-200 p-3 hover:border-stone-300 hover:shadow-sm"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-1.5 mb-1.5"
      }, /*#__PURE__*/React.createElement(SvcTypeBadge, {
        type: t.type,
        size: "sm"
      }), /*#__PURE__*/React.createElement(SvcPriorityPill, {
        priority: t.priority,
        size: "sm"
      })), /*#__PURE__*/React.createElement("div", {
        className: "text-[12.5px] font-semibold text-stone-900 leading-tight"
      }, t.title), /*#__PURE__*/React.createElement("div", {
        className: "text-[10.5px] text-stone-500 mt-0.5 truncate"
      }, t.id, " \xB7 ", t.customer), /*#__PURE__*/React.createElement("div", {
        className: "mt-1.5 flex items-center justify-between"
      }, /*#__PURE__*/React.createElement(SlaBadge, {
        ticket: t,
        size: "sm"
      })));
    }), !items.length && /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl border border-dashed border-stone-200 py-4 text-center text-[11px] text-stone-300"
    }, "\u2014")));
  }), (() => {
    const items = tickets.filter(t => t.status === "elutasitva");
    if (!items.length) return null;
    const meta = window.SVC_STATUS.elutasitva;
    return /*#__PURE__*/React.createElement("div", {
      className: "w-[260px] shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between px-1 mb-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1.5 text-[12px] font-semibold text-stone-500"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-2 h-2 rounded-full ${meta.dot}`
    }), meta.label), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-400"
    }, items.length)), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, items.map(t => /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setOpenId(t.id),
      className: "w-full text-left bg-stone-50 rounded-xl border border-stone-200 p-3 hover:border-stone-300"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 mb-1.5"
    }, /*#__PURE__*/React.createElement(SvcTypeBadge, {
      type: t.type,
      size: "sm"
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-700 leading-tight"
    }, t.title), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 mt-0.5 truncate"
    }, t.id, " \xB7 ", t.customer)))));
  })())), /*#__PURE__*/React.createElement(SvcDetailHost, {
    openId: openId,
    onClose: () => setOpenId(null)
  }));
}
Object.assign(window, {
  SvcStatusPill,
  SvcTypeBadge,
  SvcPriorityPill,
  SlaBadge,
  WarrantyBadge,
  SvcStepper,
  TicketRow,
  SvcDetailHost,
  ServiceDashboard,
  ServiceTickets,
  ServiceBoard,
  CHANNEL_LABEL
});
})();
