/* AUTO-GENERATED from page-crm-2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-crm-2.jsx — CRM / LEAD-PIPELINE világ (2/2)
//   LeadDetail (SlideOver: FSM + konverzió lehetőséggé + tevékenység-napló +
//   feladat), OppDetail (SlideOver: FSM + ajánlat-készítés → createQuote +
//   megnyerés → új ügyfél + B2B kiadás + napló), NewCrmSheet (lead VAGY
//   lehetőség felvétel), CrmTasks (feladatok SLA-val). Store: window.sim.* + CrmEngine.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateC2
} = React;

// tevékenység-napló komponens (típus-chip + szöveg → onAdd)
function ActivityComposer({
  onAdd
}) {
  const [kind, setKind] = useStateC2("hivas");
  const [text, setText] = useStateC2("");
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-2"
  }, (window.CRM_ACT_ORDER || []).map(k => {
    const m = window.CRM_ACT_META[k];
    const on = kind === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setKind(k),
      className: `inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-medium border ${on ? "bg-blue-600 text-white border-blue-600" : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 12
    }), m.label);
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end gap-2"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: text,
    onChange: e => setText(e.target.value),
    rows: 1,
    placeholder: "Tev\xE9kenys\xE9g r\xF6gz\xEDt\xE9se\u2026",
    className: "flex-1 px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-blue-500 resize-none"
  }), /*#__PURE__*/React.createElement("button", {
    disabled: !text.trim(),
    onClick: () => {
      onAdd({
        kind,
        text
      });
      setText("");
    },
    className: "h-9 px-3 rounded-lg bg-stone-900 text-white text-[12px] font-medium disabled:opacity-40 shrink-0"
  }, "R\xF6gz\xEDt")));
}

// tevékenység-idővonal
function ActivityTimeline({
  activities
}) {
  if (!activities || !activities.length) return null;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Tev\xE9kenys\xE9g-napl\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, activities.slice().reverse().map((a, i) => {
    const m = (window.CRM_ACT_META || {})[a.kind] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex items-start gap-2.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-6 h-6 rounded-lg grid place-items-center shrink-0 mt-0.5",
      style: {
        background: (m.accent || "#78716c") + "1a",
        color: m.accent || "#78716c"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon || "chat",
      size: 12
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] text-stone-700"
    }, a.text), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-400 mt-0.5"
    }, a.who, " \xB7 ", a.at)));
  })));
}

// gyors feladat-hozzáadás (entitáshoz kötve)
function QuickTaskAdd({
  refType,
  refId
}) {
  const sim = useSim();
  const [open, setOpen] = useStateC2(false);
  const [title, setTitle] = useStateC2("");
  const [due, setDue] = useStateC2(window.CRM_TODAY || "2026-04-28");
  const [prio, setPrio] = useStateC2("kozepes");
  const tasks = (sim.crmTasks || []).filter(t => t.refId === refId);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Feladatok"), tasks.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mb-2"
  }, tasks.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    className: "flex items-center gap-2 text-[12px]"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.toggleCrmTask(t.id),
    className: `w-4 h-4 rounded border grid place-items-center shrink-0 ${t.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-stone-300 bg-white"}`
  }, t.done && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 11
  })), /*#__PURE__*/React.createElement("span", {
    className: `flex-1 min-w-0 truncate ${t.done ? "text-stone-400 line-through" : "text-stone-700"}`
  }, t.title), /*#__PURE__*/React.createElement(window.TaskSlaBadge, {
    task: t,
    size: "sm"
  })))), open ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-2.5 space-y-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "Feladat c\xEDme\u2026",
    className: "w-full h-8 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-blue-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: due,
    onChange: e => setDue(e.target.value),
    className: "h-8 px-2 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-blue-500"
  }), /*#__PURE__*/React.createElement("select", {
    value: prio,
    onChange: e => setPrio(e.target.value),
    className: "h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-blue-500"
  }, (window.CRM_TASK_PRIORITY_ORDER || []).map(k => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, window.CRM_TASK_PRIORITY[k].label))), /*#__PURE__*/React.createElement("button", {
    disabled: !title.trim(),
    onClick: () => {
      window.sim.addCrmTask({
        refType,
        refId,
        title,
        due,
        priority: prio
      });
      setTitle("");
      setOpen(false);
    },
    className: "h-8 px-3 rounded-lg bg-blue-600 text-white text-[12px] font-medium disabled:opacity-40 ml-auto"
  }, "Hozz\xE1ad"))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(true),
    className: "text-[12px] text-blue-600 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "Feladat hozz\xE1ad\xE1sa"));
}

// ── LEAD részlet ─────────────────────────────────────────────────
function LeadDetail({
  l,
  onClose,
  onOpen
}) {
  const sim = useSim();
  const live = (sim.leads || []).find(x => x.id === l.id) || l;
  const E = window.CrmEngine;
  const next = E ? E.leadNext(live).filter(s => s !== "konvertalva") : [];
  const canConvert = E ? E.leadCanGo(live, "konvertalva") : false;
  const [rejOpen, setRejOpen] = useStateC2(false);
  const [rejText, setRejText] = useStateC2("");
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(window.SourceBadge, {
    source: live.source
  }), /*#__PURE__*/React.createElement(window.LeadStatusPill, {
    status: live.status
  }), live.estValue > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-700"
  }, "~", window.crmMoney(live.estValue))), /*#__PURE__*/React.createElement(window.CrmStepper, {
    flow: window.LEAD_FLOW,
    statusMap: window.LEAD_STATUS,
    status: live.status,
    terminalKey: "elvetve",
    terminalLabel: "Elvetve"
  }), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3 space-y-1.5"
  }, live.interest && /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-700"
  }, live.interest), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px] text-stone-600 pt-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 14,
    className: "text-stone-400"
  }), live.contact, live.company && /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "\xB7 ", live.company)), live.phone && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "phone",
    size: 14,
    className: "text-stone-400"
  }), /*#__PURE__*/React.createElement("a", {
    href: `tel:${live.phone}`,
    className: "text-blue-700"
  }, live.phone)), live.email && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 14,
    className: "text-stone-400"
  }), /*#__PURE__*/React.createElement("a", {
    href: `mailto:${live.email}`,
    className: "text-blue-700"
  }, live.email)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-[11px] text-stone-400 pt-1"
  }, live.city && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 12
  }), live.city), /*#__PURE__*/React.createElement("span", null, "Felv\xE9ve: ", live.createdAt), live.referredBy && /*#__PURE__*/React.createElement("span", null, "Aj\xE1nl\xF3: ", live.referredBy)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400"
  }, "Felel\u0151s: ", live.owner)), live.status === "konvertalva" && live.oppId && /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen && onOpen(live.oppId),
    className: "w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 flex items-center gap-2 hover:bg-emerald-100/60"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "briefcase",
    size: 16,
    className: "text-emerald-600"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-medium text-emerald-800 flex-1 text-left"
  }, "Lehet\u0151s\xE9gg\xE9 konvert\xE1lva: ", live.oppId), /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 15,
    className: "text-emerald-500"
  })), E && E.leadIsOpen(live) && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "M\u0171velet"), canConvert && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const id = window.sim.convertLeadToOpp(live.id);
      if (id && onOpen) onOpen(id);
    },
    className: "w-full mb-2 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 15
  }), "Konvert\xE1l\xE1s lehet\u0151s\xE9gg\xE9"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, next.map(to => {
    const st = window.LEAD_STATUS[to] || {};
    const rej = to === "elvetve";
    return /*#__PURE__*/React.createElement("button", {
      key: to,
      onClick: () => {
        if (rej) {
          setRejOpen(true);
        } else {
          window.sim.setLeadStatus(live.id, to);
        }
      },
      className: `inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${rej ? "bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200" : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"}`
    }, rej ? /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    }) : /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 14
    }), st.label);
  })), rejOpen && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-stone-600 font-medium block mb-1"
  }, "Elvet\xE9s oka (k\xF6telez\u0151)"), /*#__PURE__*/React.createElement("textarea", {
    value: rejText,
    onChange: e => setRejText(e.target.value),
    rows: 2,
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-stone-400",
    placeholder: "Pl. budget-elt\xE9r\xE9s, nem a profilunk\u2026"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-2"
  }, /*#__PURE__*/React.createElement("button", {
    disabled: !rejText.trim(),
    onClick: () => {
      if (window.sim.setLeadStatus(live.id, "elvetve", {
        reason: rejText
      })) {
        setRejOpen(false);
        setRejText("");
      }
    },
    className: "h-8 px-3 rounded-lg bg-stone-700 text-white text-[12px] font-medium disabled:opacity-40"
  }, "Elvet\xE9s"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setRejOpen(false);
      setRejText("");
    },
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse")))), live.status === "elvetve" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 mb-0.5"
  }, "Elvetve"), live.lostReason && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-600"
  }, live.lostReason), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.setLeadStatus(live.id, "uj"),
    className: "mt-2 text-[12px] text-blue-600 font-medium"
  }, "\xDAjranyit\xE1s")), /*#__PURE__*/React.createElement(QuickTaskAdd, {
    refType: "lead",
    refId: live.id
  }), /*#__PURE__*/React.createElement(ActivityComposer, {
    onAdd: ({
      kind,
      text
    }) => window.sim.addLeadActivity(live.id, {
      kind,
      text
    })
  }), /*#__PURE__*/React.createElement(ActivityTimeline, {
    activities: live.activities
  }));
}

// ── LEHETŐSÉG részlet ────────────────────────────────────────────
function OppDetail({
  o,
  onClose,
  onOpen
}) {
  const sim = useSim();
  const live = (sim.opportunities || []).find(x => x.id === o.id) || o;
  const E = window.CrmEngine;
  const next = E ? E.oppNext(live) : [];
  const prob = E ? E.oppProb(live) : 0;
  const [rejOpen, setRejOpen] = useStateC2(false);
  const [rejText, setRejText] = useStateC2("");
  const [delegOpen, setDelegOpen] = useStateC2(false);
  const partners = (sim.partners || []).filter(p => p.platform);
  const canQuote = window.sim.hasPerm && window.sim.hasPerm("quote.create");
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(window.SourceBadge, {
    source: live.source
  }), /*#__PURE__*/React.createElement(window.OppStatusPill, {
    status: live.status
  }), live.isNewCustomer && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] px-1.5 h-5 inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium"
  }, "\xFAj \xFCgyf\xE9l")), /*#__PURE__*/React.createElement(window.CrmStepper, {
    flow: window.OPP_FLOW,
    statusMap: window.OPP_STATUS,
    status: live.status,
    terminalKey: "elveszett",
    terminalLabel: "Elveszett"
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mb-0.5"
  }, "\xC9rt\xE9k"), /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900"
  }, window.crmMoney(live.value))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mb-0.5"
  }, "S\xFAlyozott (", Math.round(prob * 100), "%)"), /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-blue-700"
  }, window.crmMoney(E ? E.oppWeighted(live) : 0)))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3 space-y-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 14,
    className: "text-stone-400"
  }), live.contact || live.customer, live.contact && /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "\xB7 ", live.customer)), live.phone && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "phone",
    size: 14,
    className: "text-stone-400"
  }), /*#__PURE__*/React.createElement("a", {
    href: `tel:${live.phone}`,
    className: "text-blue-700"
  }, live.phone)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-[11px] text-stone-400 pt-1"
  }, live.city && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 12
  }), live.city), live.expectedClose && /*#__PURE__*/React.createElement("span", null, "V\xE1rhat\xF3 z\xE1r\xE1s: ", live.expectedClose), /*#__PURE__*/React.createElement("span", null, "Felel\u0151s: ", live.owner)), live.fromLead && /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen && onOpen(live.fromLead),
    className: "text-[11px] text-blue-600 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "route",
    size: 12
  }), "Forr\xE1s lead: ", live.fromLead)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Aj\xE1nlat"), live.quoteId ? /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window._pendingOpen = {
        type: "quote",
        id: live.quoteId
      };
      window.navigateTo && window.navigateTo("sales", "quotes");
    },
    className: "w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 flex items-center gap-2 hover:bg-indigo-100/60"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 16,
    className: "text-indigo-600 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-indigo-800"
  }, "V\xE1zlat-aj\xE1nlat: ", live.quoteId), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-indigo-600/80"
  }, live.status === "osszeallitas" ? "Összeállításra vár az Értékesítésben →" : "Megnyitás az Értékesítésben →")), /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 14,
    className: "text-indigo-500 shrink-0"
  })) : E && E.oppIsOpen(live) ? /*#__PURE__*/React.createElement("button", {
    disabled: !canQuote,
    onClick: () => window.sim.oppCreateQuote(live.id),
    className: "w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-medium disabled:opacity-40",
    title: canQuote ? "" : "Nincs quote.create jogosultság"
  }, canQuote ? /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 14
  }) : /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 14
  }), "V\xE1zlat-aj\xE1nlat k\xE9sz\xEDt\xE9se (", window.crmMoney(live.value), ")") : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs linkelt aj\xE1nlat.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Bels\u0151\xE9p\xEDt\xE9szet"), live.conceptRef ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window._interiorOpen = live.conceptRef;
      window.navigateTo && window.navigateTo("interior", "concepts");
    },
    className: "w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 flex items-center gap-2 hover:bg-rose-100/60"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 16,
    className: "text-rose-600 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-rose-800"
  }, "Koncepci\xF3: ", live.conceptRef), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-rose-600/80"
  }, "Megnyit\xE1s a Bels\u0151\xE9p\xEDt\xE9szetben \u2192")), /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 14,
    className: "text-rose-500 shrink-0"
  })), (() => {
    const cc = (window.sim.getState().concepts || []).find(c => c.id === live.conceptRef);
    const qr = cc && cc.quoteRef;
    if (!qr || qr === live.quoteId) return null;
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        window._pendingOpen = {
          type: "quote",
          id: qr
        };
        window.navigateTo && window.navigateTo("sales", "quotes");
      },
      className: "mt-1.5 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center gap-2 hover:bg-emerald-100/60"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file",
      size: 14,
      className: "text-emerald-600 shrink-0"
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1 text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-medium text-emerald-800"
    }, "Tervez\xE9si d\xEDj-aj\xE1nlat: ", qr), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-emerald-600/80"
    }, "a koncepci\xF3b\xF3l \u2014 megnyit\xE1s \u2192")), /*#__PURE__*/React.createElement(Icon, {
      name: "external",
      size: 13,
      className: "text-emerald-500 shrink-0"
    }));
  })()) : E && E.oppIsOpen(live) ? /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.oppCreateConcept(live.id),
    className: "w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12.5px] font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 14
  }), "Koncepci\xF3 ind\xEDt\xE1sa a Bels\u0151\xE9p\xEDt\xE9szetben") : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs linkelt koncepci\xF3.")), E && E.oppIsOpen(live) && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "St\xE1tusz l\xE9ptet\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, next.map(to => {
    const st = window.OPP_STATUS[to] || {};
    const lost = to === "elveszett",
      won = to === "megnyert";
    return /*#__PURE__*/React.createElement("button", {
      key: to,
      onClick: () => {
        if (lost) {
          setRejOpen(true);
        } else {
          window.sim.setOppStatus(live.id, to);
        }
      },
      className: `inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${won ? "bg-emerald-600 text-white hover:bg-emerald-700" : lost ? "bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200" : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"}`
    }, won ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14
    }) : lost ? /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    }) : /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 14
    }), st.label);
  })), rejOpen && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-stone-600 font-medium block mb-1"
  }, "Veszt\xE9s oka (k\xF6telez\u0151)"), /*#__PURE__*/React.createElement("textarea", {
    value: rejText,
    onChange: e => setRejText(e.target.value),
    rows: 2,
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-stone-400",
    placeholder: "Pl. \xE1rban alulmaradtunk, versenyt\xE1rs nyert\u2026"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-2"
  }, /*#__PURE__*/React.createElement("button", {
    disabled: !rejText.trim(),
    onClick: () => {
      if (window.sim.setOppStatus(live.id, "elveszett", {
        reason: rejText
      })) {
        setRejOpen(false);
        setRejText("");
      }
    },
    className: "h-8 px-3 rounded-lg bg-stone-700 text-white text-[12px] font-medium disabled:opacity-40"
  }, "Elveszett"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setRejOpen(false);
      setRejText("");
    },
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse")))), live.status === "megnyert" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16,
    className: "text-emerald-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-emerald-800"
  }, "Megnyert", live.wonAt ? ` · ${live.wonAt}` : "", live.isNewCustomer ? " · új ügyfél felvéve" : "")), live.status === "elveszett" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 mb-0.5"
  }, "Elveszett", live.lostAt ? ` · ${live.lostAt}` : ""), live.lostReason && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-600"
  }, live.lostReason), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.setOppStatus(live.id, "nyitott"),
    className: "mt-2 text-[12px] text-blue-600 font-medium"
  }, "\xDAjranyit\xE1s")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Kiad\xE1s partnernek"), live.delegatedTo ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-violet-200 bg-violet-50/60 p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 16,
    className: "text-violet-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-violet-800"
  }, live.delegatedTo), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-violet-600/80"
  }, live.delegatedExternal ? "Platformon kívül" : "Kézfogás elküldve")), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.recallOpp(live.id),
    className: "h-8 px-3 rounded-lg border border-violet-200 text-[12px] text-violet-700 bg-white hover:bg-violet-50"
  }, "Visszavon\xE1s")) : delegOpen ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-2 space-y-1.5"
  }, partners.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => {
      window.sim.delegateOpp(live.id, p.id);
      setDelegOpen(false);
    },
    className: "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-stone-50 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-7 h-7 rounded-lg bg-stone-100 grid place-items-center text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "briefcase",
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-800 truncate"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 truncate"
  }, p.specialty)))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDelegOpen(false),
    className: "w-full h-8 rounded-lg text-[12px] text-stone-500 hover:bg-stone-50"
  }, "M\xE9gse")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setDelegOpen(true),
    className: "w-full h-9 rounded-lg border border-dashed border-stone-300 text-[12.5px] font-medium text-stone-500 hover:text-violet-700 hover:border-violet-300"
  }, "+ Lehet\u0151s\xE9g kiad\xE1sa partnernek")), /*#__PURE__*/React.createElement(QuickTaskAdd, {
    refType: "opp",
    refId: live.id
  }), /*#__PURE__*/React.createElement(ActivityComposer, {
    onAdd: ({
      kind,
      text
    }) => window.sim.addOppActivity(live.id, {
      kind,
      text
    })
  }), /*#__PURE__*/React.createElement(ActivityTimeline, {
    activities: live.activities
  }));
}

// ── Új lead / lehetőség felvétel (alulról nyíló sheet) ───────────
function NewCrmSheet({
  kind,
  onClose,
  onCreated
}) {
  const sim = useSim();
  const isLead = kind === "lead";
  const [source, setSource] = useStateC2("telefon");
  const [company, setCompany] = useStateC2("");
  const [contact, setContact] = useStateC2("");
  const [email, setEmail] = useStateC2("");
  const [phone, setPhone] = useStateC2("");
  const [city, setCity] = useStateC2("");
  const [title, setTitle] = useStateC2("");
  const [interest, setInterest] = useStateC2("");
  const [val, setVal] = useStateC2("");
  const [expectedClose, setExpectedClose] = useStateC2("");
  const customers = (sim.customers || []).map(c => c.name);
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-blue-500";
  const create = () => {
    if (isLead) {
      if (!contact.trim() || !title.trim()) return;
      const id = window.sim.addLead({
        source,
        company,
        contact,
        email,
        phone,
        city,
        title,
        interest,
        estValue: Number(val) || 0
      });
      if (id && onCreated) onCreated(id);
    } else {
      if (!company.trim() || !title.trim()) return;
      const id = window.sim.addOpp({
        source,
        customer: company,
        contact,
        phone,
        city,
        title,
        value: Number(val) || 0,
        expectedClose
      });
      if (id && onCreated) onCreated(id);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[60] flex items-end md:items-center justify-center",
    role: "dialog"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-stone-900/40",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full md:max-w-[520px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, isLead ? "Új lead" : "Új lehetőség"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Forr\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1.5"
  }, (window.CRM_SOURCE_ORDER || []).map(k => {
    const m = window.CRM_SOURCE_META[k];
    const on = source === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setSource(k),
      className: `inline-flex items-center gap-1.5 h-8 px-2 rounded-lg text-[11.5px] font-medium border ${on ? "border-blue-500 bg-blue-50 text-blue-800" : "border-stone-200 bg-white text-stone-600"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 13,
      className: on ? "text-blue-600" : "text-stone-400"
    }), m.label);
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, isLead ? "Cég (opcionális magánszemélynél)" : "Ügyfél"), /*#__PURE__*/React.createElement("input", {
    list: isLead ? undefined : "crm-cust-list",
    value: company,
    onChange: e => setCompany(e.target.value),
    placeholder: isLead ? "Cégnév" : "Ügyfél / cég neve",
    className: cls
  }), !isLead && /*#__PURE__*/React.createElement("datalist", {
    id: "crm-cust-list"
  }, customers.map(c => /*#__PURE__*/React.createElement("option", {
    key: c,
    value: c
  })))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Kapcsolattart\xF3", isLead ? " *" : ""), /*#__PURE__*/React.createElement("input", {
    value: contact,
    onChange: e => setContact(e.target.value),
    placeholder: "N\xE9v",
    className: cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "V\xE1ros"), /*#__PURE__*/React.createElement("input", {
    value: city,
    onChange: e => setCity(e.target.value),
    placeholder: "V\xE1ros",
    className: cls
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Telefon"), /*#__PURE__*/React.createElement("input", {
    value: phone,
    onChange: e => setPhone(e.target.value),
    placeholder: "+36\u2026",
    className: cls
  })), isLead ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: "email@\u2026",
    className: cls
  })) : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "V\xE1rhat\xF3 z\xE1r\xE1s"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: expectedClose,
    onChange: e => setExpectedClose(e.target.value),
    className: cls
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "T\xE1rgy *"), /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "Pl. Konyhab\xFAtor fel\xFAj\xEDt\xE1s",
    className: cls
  })), isLead && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Ig\xE9ny le\xEDr\xE1sa"), /*#__PURE__*/React.createElement("textarea", {
    value: interest,
    onChange: e => setInterest(e.target.value),
    rows: 2,
    placeholder: "R\xE9szletek\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-blue-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, isLead ? "Becsült érték (Ft)" : "Érték (Ft)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: val,
    onChange: e => setVal(e.target.value),
    placeholder: "0",
    className: cls
  })), /*#__PURE__*/React.createElement("button", {
    disabled: isLead ? !contact.trim() || !title.trim() : !company.trim() || !title.trim(),
    onClick: create,
    className: "w-full h-10 rounded-xl bg-blue-600 text-white text-[13px] font-semibold disabled:opacity-40"
  }, isLead ? "Lead rögzítése" : "Lehetőség rögzítése"))));
}

// ── Feladatok (SLA-val) ──────────────────────────────────────────
function CrmTasks() {
  const sim = useSim();
  const [openId, setOpenId] = useStateC2(null);
  const [showDone, setShowDone] = useStateC2(false);
  const tasks = sim.crmTasks || [];
  const E = window.CrmEngine;
  const refTitle = t => {
    if (t.refType === "lead") {
      const l = (sim.leads || []).find(x => x.id === t.refId);
      return l ? `${l.id} · ${l.title}` : t.refId;
    }
    const o = (sim.opportunities || []).find(x => x.id === t.refId);
    return o ? `${o.id} · ${o.title}` : t.refId;
  };
  const openTasks = tasks.filter(t => !t.done);
  const overdue = openTasks.filter(t => {
    const s = E.taskSla(t);
    return s.overdue;
  });
  const upcoming = openTasks.filter(t => {
    const s = E.taskSla(t);
    return !s.overdue;
  }).sort((a, b) => (a.due || "").localeCompare(b.due || ""));
  const done = tasks.filter(t => t.done);
  const Row = ({
    t
  }) => /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.toggleCrmTask(t.id),
    className: `w-5 h-5 rounded border grid place-items-center shrink-0 ${t.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-stone-300 bg-white hover:border-blue-400"}`
  }, t.done && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: `text-[13px] font-medium truncate ${t.done ? "text-stone-400 line-through" : "text-stone-900"}`
  }, t.title), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpenId(t.refId),
    className: "text-[11px] text-blue-600 truncate inline-flex items-center gap-1 mt-0.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: t.refType === "lead" ? "route" : "briefcase",
    size: 11
  }), refTitle(t))), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 flex flex-col items-end gap-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium px-1.5 h-5 text-[10px] ${(window.CRM_TASK_PRIORITY[t.priority] || {}).pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${(window.CRM_TASK_PRIORITY[t.priority] || {}).dot}`
  }), (window.CRM_TASK_PRIORITY[t.priority] || {}).label), !t.done && /*#__PURE__*/React.createElement(window.TaskSlaBadge, {
    task: t,
    size: "sm"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400"
  }, t.owner, " \xB7 ", t.due)));
  const Section = ({
    label,
    items,
    tone
  }) => items.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-2 h-2 rounded-full ${tone}`
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, items.length)), items.map(t => /*#__PURE__*/React.createElement(Row, {
    key: t.id,
    t: t
  })));
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[900px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Feladatok"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Eml\xE9keztet\u0151k \xE9s teend\u0151k \u2014 hat\xE1rid\u0151 + SLA")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDone(v => !v),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white border border-stone-200 text-stone-600 text-[12.5px] font-medium hover:bg-stone-50"
  }, showDone ? "Kész elrejtése" : `Kész (${done.length})`)), /*#__PURE__*/React.createElement(Section, {
    label: "Lej\xE1rt",
    items: overdue,
    tone: "bg-rose-500"
  }), /*#__PURE__*/React.createElement(Section, {
    label: "K\xF6zelg\u0151",
    items: upcoming,
    tone: "bg-blue-500"
  }), showDone && /*#__PURE__*/React.createElement(Section, {
    label: "Elv\xE9gezve",
    items: done,
    tone: "bg-emerald-500"
  }), !overdue.length && !upcoming.length && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs nyitott feladat. \uD83C\uDF89"), /*#__PURE__*/React.createElement(window.CrmDetailHost, {
    openId: openId,
    setOpen: setOpenId
  }));
}
Object.assign(window, {
  ActivityComposer,
  ActivityTimeline,
  QuickTaskAdd,
  LeadDetail,
  OppDetail,
  NewCrmSheet,
  CrmTasks
});
})();
