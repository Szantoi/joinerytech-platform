/* AUTO-GENERATED from page-projects-epic.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-projects-epic.jsx — Epik (FlowEpic) részletek + FSM + B2BHandshake.
//
//   - FSM-vezérlők: a tiltott átmenet gombja LEZÁRT (disabled + tooltip), nem
//     rejtett. CLOSED_BLOCKED-hoz indoklás kötelező.
//   - Delegálás: epik kiadása platform-partnernek → kézfogás (handshakes[]).
//   - Taskök: pipálható lépések az epiken belül.
//   Konstansok a page-projects-board.jsx-ből (window.EPIC_TONE, ACTOR_META…).
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateEP
} = React;

// Kanonikus FSM-műveletek — mindig MIND látszik; ami tiltott, LEZÁRT.
const EPIC_ACTIONS = [{
  to: "IN_DEV",
  label: "Indítás",
  icon: "production",
  cls: "bg-sky-600 hover:bg-sky-700"
}, {
  to: "IN_REVIEW",
  label: "Ellenőrzésre",
  icon: "send",
  cls: "bg-amber-600 hover:bg-amber-700"
}, {
  to: "CLOSED_DONE",
  label: "Kész — lezár",
  icon: "check",
  cls: "bg-emerald-600 hover:bg-emerald-700"
}, {
  to: "CLOSED_BLOCKED",
  label: "Blokkol",
  icon: "alert",
  cls: "bg-rose-600 hover:bg-rose-700"
}, {
  to: "BACKLOG_READY",
  label: "Újranyit",
  icon: "workflow",
  cls: "bg-stone-700 hover:bg-stone-800"
}];
const LOCK_REASON = {
  CLOSED_DONE: "Fázis nem ugorható át — előbb ellenőrzésre kell küldeni.",
  BACKLOG_READY: "Visszalépés csak blokkoláson keresztül lehetséges.",
  _closed: "Lezárt epik nem nyílik vissza — csak új verzió hozható létre.",
  _generic: "Nem engedélyezett átmenet a jelenlegi állapotból."
};
function EpicDetail({
  project,
  loc,
  onClose,
  canEdit
}) {
  const s = useSim();
  const EPIC_TONE = window.EPIC_TONE,
    EPIC_FLOW = window.EPIC_FLOW,
    actorMeta = window.actorMeta,
    hsTone = window.hsTone;
  const p = project;
  // re-read live epic from store (props loc may be stale after a transition)
  const live = window.sim.findEpic(p.id, loc.epic.id) || loc;
  const e = live.epic,
    m = live.milestone,
    sub = live.sub;
  const t = EPIC_TONE[e.status] || EPIC_TONE.BACKLOG_READY;
  const am = actorMeta(e.ownerType);
  const me = window.sim.currentAccount();
  const [blocking, setBlocking] = useStateEP(false);
  const [reason, setReason] = useStateEP("");
  const [delegOpen, setDelegOpen] = useStateEP(false);
  const [newTask, setNewTask] = useStateEP("");
  const hs = e.handshakeId ? (s.handshakes || []).find(h => h.id === e.handshakeId) : null;
  const tasks = e.tasks || [];
  const doneT = tasks.filter(x => x.done).length;
  const doTransition = to => {
    if (to === "CLOSED_BLOCKED") {
      setBlocking(true);
      return;
    }
    window.sim.setEpicStatus(p.id, e.id, to);
  };
  const confirmBlock = () => {
    if (window.sim.setEpicStatus(p.id, e.id, "CLOSED_BLOCKED", {
      reason
    })) {
      setBlocking(false);
      setReason("");
    }
  };
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: true,
    onClose: onClose,
    title: e.title,
    width: 520,
    subtitle: `${m.name}${sub ? " · " + sub.name : ""}`,
    footer: /*#__PURE__*/React.createElement("div", {
      className: "w-full"
    }, canEdit ? blocking ? /*#__PURE__*/React.createElement("div", {
      className: "w-full space-y-2"
    }, /*#__PURE__*/React.createElement("textarea", {
      autoFocus: true,
      value: reason,
      onChange: ev => setReason(ev.target.value),
      rows: 2,
      placeholder: "Blokkol\xE1s indoka (k\xF6telez\u0151) \u2014 pl. hi\xE1nyz\xF3 anyag, \xFCgyf\xE9l-egyeztet\xE9s\u2026",
      className: "w-full px-3 py-2 rounded-lg border border-rose-200 text-[12.5px] outline-none focus:border-rose-400 resize-none"
    }), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-end gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setBlocking(false);
        setReason("");
      },
      className: "h-9 px-3 rounded-lg text-[12px] text-stone-600 hover:bg-stone-100"
    }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
      onClick: confirmBlock,
      disabled: !reason.trim(),
      className: "h-9 px-3.5 rounded-lg text-[12.5px] font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 14
    }), "Blokkoltra z\xE1r"))) : /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 w-full flex-wrap"
    }, EPIC_ACTIONS.map(a => {
      if (a.to === e.status) return null;
      // újranyit csak blokkoltból releváns; ne mutassuk máshol zajként
      if (a.to === "BACKLOG_READY" && e.status !== "CLOSED_BLOCKED") return null;
      const allowed = window.sim.epicCanTransition(e.status, a.to);
      const reasonTip = !allowed ? e.status === "CLOSED_DONE" ? LOCK_REASON._closed : LOCK_REASON[a.to] || LOCK_REASON._generic : "";
      return /*#__PURE__*/React.createElement("button", {
        key: a.to,
        onClick: () => allowed && doTransition(a.to),
        disabled: !allowed,
        title: reasonTip,
        className: `inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-medium text-white transition ${allowed ? a.cls : "bg-stone-200 !text-stone-400 cursor-not-allowed"}`
      }, /*#__PURE__*/React.createElement(Icon, {
        name: allowed ? a.icon : "lock",
        size: 13
      }), a.label);
    })) : /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-400 inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 13
    }), "Csak megtekint\xE9s \u2014 az \xE1llapotot a gy\xE1rt\xF3 / v\xE9grehajt\xF3 l\xE9pteti."))
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-5 space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[12px] font-semibold ${t.bg} ${t.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.dot}`
  }), t.l), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-400"
  }, "FlowEpic \xB7 ", e.id)), /*#__PURE__*/React.createElement(FsmStepper, {
    status: e.status
  }), e.status === "CLOSED_BLOCKED" && e.blockReason && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-[11.5px] text-rose-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 14,
    className: "mt-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Blokkol\xE1s oka:"), " ", e.blockReason))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5"
  }, "Felel\u0151s"), /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 px-2 h-6 rounded-md text-[11.5px] font-medium ${am.tint}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: am.icon,
    size: 12
  }), am.l), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-800 mt-1.5"
  }, e.owner || "—")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5"
  }, "Hat\xE1rid\u0151"), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-mono text-stone-800 mt-1"
  }, e.due || "—"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "K\xE9zfog\xE1s (B2B deleg\xE1l\xE1s)"), hs ? /*#__PURE__*/React.createElement(HandshakeCard, {
    hs: hs,
    side: "from",
    canEdit: canEdit
  }) : e.delegatedTo ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-teal-200 bg-teal-50/50 p-3 text-[12px] text-teal-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 15
  }), /*#__PURE__*/React.createElement("span", null, "K\xFCls\u0151 partner: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, e.delegatedTo))) : canEdit && me.actorType === "manufacturer" ? delegOpen ? /*#__PURE__*/React.createElement(PartnerPicker, {
    onPick: pid => {
      window.sim.delegateEpic(p.id, e.id, pid);
      setDelegOpen(false);
    },
    onClose: () => setDelegOpen(false)
  }) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setDelegOpen(true),
    className: "w-full rounded-xl border border-dashed border-stone-300 px-3 py-3 text-[12px] font-medium text-stone-500 hover:text-teal-700 hover:border-teal-300 inline-flex items-center justify-center gap-2 transition"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 15
  }), "Kiad\xE1s partnernek (k\xE9zfog\xE1s)") : /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-400"
  }, "Bels\u0151 munka \u2014 nincs deleg\xE1lva.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Task\xF6k ", tasks.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "\xB7 ", doneT, "/", tasks.length))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden"
  }, tasks.map(tk => /*#__PURE__*/React.createElement("button", {
    key: tk.id,
    onClick: () => canEdit && window.sim.toggleEpicTask(p.id, e.id, tk.id),
    disabled: !canEdit,
    className: "w-full px-3 py-2.5 flex items-center gap-2.5 text-left hover:bg-stone-50 disabled:hover:bg-transparent"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-5 h-5 rounded-md grid place-items-center shrink-0 border ${tk.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-stone-300 text-transparent"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  })), /*#__PURE__*/React.createElement("span", {
    className: `text-[12.5px] flex-1 ${tk.done ? "text-stone-400 line-through" : "text-stone-800"}`
  }, tk.title), tk.assignee && /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400 shrink-0"
  }, tk.assignee))), tasks.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-3 text-[11.5px] text-stone-400"
  }, "Nincs task."), canEdit && /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 flex items-center gap-2 bg-stone-50/50"
  }, /*#__PURE__*/React.createElement("input", {
    value: newTask,
    onChange: ev => setNewTask(ev.target.value),
    placeholder: "\xDAj task\u2026",
    onKeyDown: ev => {
      if (ev.key === "Enter" && newTask.trim()) {
        window.sim.addEpicTask(p.id, e.id, newTask);
        setNewTask("");
      }
    },
    className: "flex-1 h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none bg-white"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (newTask.trim()) {
        window.sim.addEpicTask(p.id, e.id, newTask);
        setNewTask("");
      }
    },
    className: "w-8 h-8 grid place-items-center rounded-lg border border-stone-300 text-stone-600 hover:bg-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  })))))));
}
function FsmStepper({
  status
}) {
  const EPIC_TONE = window.EPIC_TONE,
    EPIC_FLOW = window.EPIC_FLOW;
  const blocked = status === "CLOSED_BLOCKED";
  const idx = EPIC_FLOW.indexOf(status);
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center"
  }, EPIC_FLOW.map((st, i) => {
    const tn = EPIC_TONE[st];
    const reached = !blocked && idx >= i;
    const current = status === st;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: st
    }, i > 0 && /*#__PURE__*/React.createElement("div", {
      className: `flex-1 h-0.5 ${!blocked && idx >= i ? "bg-stone-700" : "bg-stone-200"}`
    }), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col items-center gap-1 shrink-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ring-2 ring-white ${current ? tn.solid + " text-white" : reached ? "bg-stone-700 text-white" : "bg-stone-200 text-stone-400"}`
    }, reached && !current ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 12
    }) : i + 1), /*#__PURE__*/React.createElement("span", {
      className: `text-[9px] font-medium ${current ? tn.fg : "text-stone-400"}`
    }, tn.l)));
  }), blocked && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 h-0.5 bg-rose-200"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-1 shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-6 h-6 rounded-full grid place-items-center bg-rose-500 text-white ring-2 ring-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 12
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] font-medium text-rose-600"
  }, "Blokkolt"))));
}
function PartnerPicker({
  onPick,
  onClose
}) {
  const s = useSim();
  const actorMeta = window.actorMeta;
  const [q, setQ] = useStateEP("");
  const partners = (s.partners || []).filter(pt => pt.name.toLowerCase().includes(q.toLowerCase()) || pt.specialty.toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-teal-200 bg-white p-2.5 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg bg-teal-50 text-teal-600 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14
  })), /*#__PURE__*/React.createElement("input", {
    autoFocus: true,
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Partner keres\xE9se (n\xE9v, szakter\xFClet)\u2026",
    className: "flex-1 h-8 text-[12.5px] outline-none"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-7 h-7 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1 max-h-[260px] overflow-y-auto"
  }, partners.map(pt => {
    const am = actorMeta(pt.actorType);
    return /*#__PURE__*/React.createElement("button", {
      key: pt.id,
      onClick: () => onPick(pt.id),
      className: "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-teal-50/60 text-left transition"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-8 h-8 rounded-lg grid place-items-center shrink-0 ${am.tint}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: am.icon,
      size: 15
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-semibold text-stone-900 truncate"
    }, pt.name), pt.platform ? /*#__PURE__*/React.createElement("span", {
      className: "text-[8.5px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold uppercase tracking-wide"
    }, "platform") : /*#__PURE__*/React.createElement("span", {
      className: "text-[8.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-bold uppercase tracking-wide"
    }, "k\xFCls\u0151")), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 truncate"
    }, pt.specialty)), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 15,
      className: "text-stone-300 shrink-0"
    }));
  }), partners.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-2 py-3 text-[11.5px] text-stone-400 text-center"
  }, "Nincs tal\xE1lat.")), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 px-1 leading-relaxed"
  }, "Platform-partnern\xE9l k\xE9zfog\xE1s indul (\u0151 a saj\xE1t rendszer\xE9ben l\xE1tja). K\xFCls\u0151 partnern\xE9l hivatkoz\xE1s j\xF6n l\xE9tre, k\xE9zi st\xE1tusszal."));
}

// side: "from" = delegáló nézet, "to" = fogadó (inbox) nézet
function HandshakeCard({
  hs,
  side = "from",
  canEdit
}) {
  const s = useSim();
  const tn = window.hsTone(hs);
  const isDraft = hs.status === "draft";
  const [picking, setPicking] = useStateEP(false);
  const partners = (s.partners || []).filter(pt => pt.actorType === (hs.partnerType || "supplier"));
  return /*#__PURE__*/React.createElement("div", {
    className: `rounded-xl border overflow-hidden ${isDraft ? "border-amber-200" : "border-stone-200"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: `px-3 py-2.5 flex items-center gap-2.5 border-b ${isDraft ? "bg-amber-50/60 border-amber-100" : "bg-stone-50/60 border-stone-100"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-8 h-8 rounded-lg grid place-items-center shrink-0 ${isDraft ? "bg-amber-100 text-amber-700" : "bg-teal-50 text-teal-600"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900 truncate"
  }, side === "from" ? isDraft ? "Előkészített átadás" : `Kiadva → ${hs.partnerName}` : `Megbízás ${hs.fromCompany}-tól`), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500"
  }, hs.ts)), /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${tn.bg} ${tn.fg} shrink-0`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${tn.dot}`
  }), tn.l)), isDraft && side === "from" ? /*#__PURE__*/React.createElement("div", {
    className: "p-3 space-y-2.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5"
  }, "Partner (", window.actorMeta(hs.partnerType || "supplier").l, ")"), picking ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, partners.map(pt => /*#__PURE__*/React.createElement("button", {
    key: pt.id,
    onClick: () => {
      window.sim.updateHandshake(hs.id, {
        partnerId: pt.id,
        partnerName: pt.name
      });
      setPicking(false);
    },
    className: "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-50/60 text-left"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-7 h-7 rounded-lg grid place-items-center shrink-0 ${window.actorMeta(pt.actorType).tint}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: window.actorMeta(pt.actorType).icon,
    size: 13
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-medium text-stone-800 flex-1 truncate"
  }, pt.name), pt.platform ? /*#__PURE__*/React.createElement("span", {
    className: "text-[8.5px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold uppercase"
  }, "platform") : /*#__PURE__*/React.createElement("span", {
    className: "text-[8.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-bold uppercase"
  }, "k\xFCls\u0151"))), partners.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 px-1 py-1"
  }, "Nincs ", window.actorMeta(hs.partnerType).l, " partner.")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => canEdit && setPicking(true),
    className: "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-stone-200 hover:border-amber-300 text-left"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 14,
    className: "text-stone-400 shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-medium text-stone-800 flex-1 truncate"
  }, hs.partnerName || "— válassz partnert —"), canEdit && /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14,
    className: "text-stone-300 rotate-90 shrink-0"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5"
  }, "Megjegyz\xE9s a partnernek"), /*#__PURE__*/React.createElement("textarea", {
    value: hs.note || "",
    onChange: e => window.sim.updateHandshake(hs.id, {
      note: e.target.value
    }),
    rows: 2,
    disabled: !canEdit,
    className: "w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-amber-400 resize-none"
  })), canEdit && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-2 pt-0.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.declineDelegation(hs.id),
    className: "h-8 px-3 rounded-lg text-[12px] font-medium text-stone-500 hover:bg-stone-100"
  }, "Elvet"), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.sendHandshake(hs.id),
    disabled: !hs.partnerId,
    className: "h-8 px-3.5 rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 bg-teal-600 text-white hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 13
  }), "\xC1tad\xE1s k\xFCld\xE9se"))) : /*#__PURE__*/React.createElement(React.Fragment, null, hs.note && /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 text-[11.5px] text-stone-600 border-b border-stone-100"
  }, hs.note), side === "to" && (hs.status === "sent" || hs.status === "accepted") && /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2.5 flex items-center gap-2 justify-end"
  }, hs.status === "sent" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.declineDelegation(hs.id),
    className: "h-8 px-3 rounded-lg text-[12px] font-medium border border-stone-200 text-stone-600 hover:bg-stone-50"
  }, "Visszautas\xEDt"), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.acceptDelegation(hs.id),
    className: "h-8 px-3.5 rounded-lg text-[12px] font-medium bg-teal-600 text-white hover:bg-teal-700 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  }), "Elfogad")), hs.status === "accepted" && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.completeDelegation(hs.id),
    className: "h-8 px-3.5 rounded-lg text-[12px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  }), "K\xE9sz \u2014 visszajelez"))));
}

// ── Fogadó oldal: beérkezett megbízások (supplier / installer nézet) ─────────
function InboxBoard() {
  const s = useSim();
  const me = window.sim.currentAccount();
  const all = window.sim.incomingHandshakes();
  const fresh = all.filter(h => h.status === "sent");
  const active = all.filter(h => h.status === "accepted");
  const history = all.filter(h => h.status === "done" || h.status === "declined");
  const Group = ({
    label,
    items,
    hint
  }) => items.length === 0 ? null : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-semibold"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-bold"
  }, items.length), hint && /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400"
  }, hint)), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-2.5"
  }, items.map(h => /*#__PURE__*/React.createElement("div", {
    key: h.id,
    className: "space-y-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-800 px-0.5"
  }, h.epicTitle, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-normal"
  }, " \xB7 ", h.projectName)), /*#__PURE__*/React.createElement(HandshakeCard, {
    hs: h,
    side: "to"
  })))));
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[18px] md:text-[20px] font-semibold text-stone-900 tracking-tight"
  }, "Be\xE9rkezett megb\xEDz\xE1sok"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500"
  }, me.name, " \xB7 ", (window.ACTOR_META[me.actorType] || {}).l || me.actorType, " \u2014 k\xE9zfog\xE1ssal kiadott epikek m\xE1s c\xE9gekt\u0151l")), all.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 mx-auto rounded-xl bg-stone-100 grid place-items-center text-stone-400 mb-3"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "inbox",
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-700"
  }, "Nincs be\xE9rkezett megb\xEDz\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500 mt-1"
  }, "Amikor egy gy\xE1rt\xF3 kiad neked egy epikot, itt jelenik meg \u2014 elfogadhatod vagy visszautas\xEDthatod.")) : /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement(Group, {
    label: "\xDAj \u2014 v\xE1laszra v\xE1r",
    items: fresh,
    hint: "fogadd el vagy utas\xEDtsd vissza"
  }), /*#__PURE__*/React.createElement(Group, {
    label: "Folyamatban",
    items: active,
    hint: "ha k\xE9sz, jelezd vissza ellen\u0151rz\xE9sre"
  }), /*#__PURE__*/React.createElement(Group, {
    label: "Lez\xE1rt",
    items: history
  })));
}
Object.assign(window, {
  EpicDetail,
  FsmStepper,
  PartnerPicker,
  HandshakeCard,
  InboxBoard
});
})();
