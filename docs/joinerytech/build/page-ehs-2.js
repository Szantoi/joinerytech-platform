/* AUTO-GENERATED from page-ehs-2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-ehs-2.jsx — EHS detail SlideOverök + sheetek
//   IncDetail (incidens-FSM + CAPA + napló) · NewIncSheet ·
//   RiskDetail (5×5 mátrix + kontrollok + maradék-kockázat + felülvizsg.) ·
//   RiskDetailHost · NewRiskSheet · NewTrainingSheet.
//   A közös pill-ek a page-ehs.jsx-ben (window.*).
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateE2
} = React;

// ── Incidens-részlet (FSM + CAPA + napló) ────────────────────────
function IncDetail({
  inc,
  onClose
}) {
  const sim = useSim();
  const live = (sim.ehsIncidents || []).find(x => x.id === inc.id) || inc;
  const E = window.EhsEngine;
  const next = E ? E.nextStates(live) : [];
  const prog = E ? E.actionProgress(live) : {
    done: 0,
    total: 0,
    open: 0
  };
  const [rejectOpen, setRejectOpen] = useStateE2(false);
  const [rejectText, setRejectText] = useStateE2("");
  const [actText, setActText] = useStateE2("");
  const [actOwner, setActOwner] = useStateE2("");
  const [actDue, setActDue] = useStateE2("");
  const canManage = sim.hasPerm("ehs.manage");
  const people = (sim.employees || []).filter(e => e.active !== false);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(window.EhsTypeBadge, {
    type: live.type
  }), /*#__PURE__*/React.createElement(window.EhsStatusPill, {
    status: live.status
  }), /*#__PURE__*/React.createElement(window.EhsSevPill, {
    sev: live.sev
  }), /*#__PURE__*/React.createElement(window.EhsSlaBadge, {
    inc: live
  })), /*#__PURE__*/React.createElement(window.EhsStepper, {
    inc: live
  }), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3 space-y-1.5"
  }, live.note && /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-700"
  }, live.note), live.location && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 14,
    className: "text-stone-400"
  }), live.location), live.assetLabel && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("maintenance", "assets"),
    className: "flex items-center gap-2 text-[12px] text-stone-600 hover:text-red-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "wrench",
    size: 14,
    className: "text-stone-400"
  }), live.assetLabel, /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[10.5px] text-stone-400"
  }, "\xB7 ", live.assetId)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-[11px] text-stone-400 pt-1 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 12
  }), "Bejelent\u0151: ", live.reporter || "—"), live.investigator && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 12
  }), "Vizsg\xE1l\xF3: ", live.investigator), /*#__PURE__*/React.createElement("span", null, "Esem\xE9ny: ", live.occurredAt))), E && E.isOpen(live) && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Kivizsg\xE1l\xE1s / l\xE9ptet\xE9s"), !canManage && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-400 mb-2 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 12
  }), "St\xE1tuszv\xE1lt\xE1shoz ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, "ehs.manage"), " jog kell."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, next.map(to => {
    const st = window.EHS_INC_STATUS[to] || {};
    const reject = to === "elutasitva",
      close = to === "lezarva";
    return /*#__PURE__*/React.createElement("button", {
      key: to,
      disabled: !canManage,
      onClick: () => {
        if (reject) {
          setRejectOpen(true);
        } else {
          window.sim.setEhsIncidentStatus(live.id, to);
        }
      },
      className: `inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium disabled:opacity-40 ${close ? "bg-emerald-600 text-white hover:bg-emerald-700" : reject ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-red-600 text-white hover:bg-red-700"}`
    }, close ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14
    }) : reject ? /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    }) : /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 14
    }), st.label);
  })), rejectOpen && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-stone-600 font-medium block mb-1"
  }, "Elutas\xEDt\xE1s indoka (k\xF6telez\u0151)"), /*#__PURE__*/React.createElement("textarea", {
    value: rejectText,
    onChange: e => setRejectText(e.target.value),
    rows: 2,
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-stone-400",
    placeholder: "Pl. nem munkav\xE9delmi esem\xE9ny\u2026"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (window.sim.setEhsIncidentStatus(live.id, "elutasitva", {
        reason: rejectText
      })) {
        setRejectOpen(false);
        setRejectText("");
      }
    },
    className: "h-8 px-3 rounded-lg bg-rose-600 text-white text-[12px] font-medium"
  }, "Elutas\xEDt\xE1s"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setRejectOpen(false);
      setRejectText("");
    },
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse")))), live.status === "lezarva" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16,
    className: "text-emerald-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-emerald-800"
  }, "Lez\xE1rva", live.closedAt ? ` · ${live.closedAt}` : "", " \u2014 minden int\xE9zked\xE9s v\xE9grehajtva.")), live.status === "elutasitva" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16,
    className: "text-rose-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-rose-800"
  }, "Elutas\xEDtva \u2014 nem munkav\xE9delmi esem\xE9ny.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Korrekci\xF3s int\xE9zked\xE9sek (CAPA)"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, prog.done, "/", prog.total, " k\xE9sz")), (live.actions || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mb-2"
  }, live.actions.map(a => {
    const overdue = !a.done && a.due && a.due < window.EHS_TODAY;
    return /*#__PURE__*/React.createElement("div", {
      key: a.id,
      className: "flex items-start gap-2 px-2.5 py-2 rounded-lg border border-stone-200"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.toggleEhsAction(live.id, a.id),
      className: `w-5 h-5 rounded grid place-items-center shrink-0 border mt-0.5 ${a.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-stone-300 bg-white"}`
    }, a.done ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13
    }) : null), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: `text-[12.5px] ${a.done ? "text-stone-400 line-through" : "text-stone-700"}`
    }, a.text), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 text-[10.5px] text-stone-400 mt-0.5 flex-wrap"
    }, a.owner && /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "user",
      size: 10
    }), a.owner), a.due && /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1 ${overdue ? "text-rose-600 font-medium" : ""}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "clock",
      size: 10
    }), a.due, overdue ? " · lejárt" : ""))), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.removeEhsAction(live.id, a.id),
      className: "text-stone-300 hover:text-rose-500 shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    })));
  })), E && E.isOpen(live) && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-2.5 space-y-2"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: actText,
    onChange: e => setActText(e.target.value),
    rows: 1,
    placeholder: "Int\xE9zked\xE9s le\xEDr\xE1sa\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-red-500 resize-none"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("select", {
    value: actOwner,
    onChange: e => setActOwner(e.target.value),
    className: "flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-red-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Felel\u0151s\u2026"), people.map(e => /*#__PURE__*/React.createElement("option", {
    key: e.id,
    value: e.name
  }, e.name))), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: actDue,
    onChange: e => setActDue(e.target.value),
    className: "h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-red-500"
  }), /*#__PURE__*/React.createElement("button", {
    disabled: !actText.trim(),
    onClick: () => {
      window.sim.addEhsAction(live.id, {
        text: actText,
        owner: actOwner,
        due: actDue
      });
      setActText("");
      setActOwner("");
      setActDue("");
    },
    className: "h-8 px-3 rounded-lg bg-stone-900 text-white text-[12px] font-medium disabled:opacity-40 shrink-0"
  }, "Hozz\xE1ad")))), (live.log || []).length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
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

// ── Új bejelentés sheet ──────────────────────────────────────────
function NewIncSheet({
  onClose,
  onCreated
}) {
  const sim = useSim();
  const [type, setType] = useStateE2("kvazi");
  const [sev, setSev] = useStateE2("konnyu");
  const [subject, setSubject] = useStateE2("");
  const [location, setLocation] = useStateE2("");
  const [note, setNote] = useStateE2("");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-red-500";
  const create = () => {
    if (!subject.trim()) return;
    const id = window.sim.addEhsIncident({
      type,
      sev,
      subject,
      location,
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
  }, "Munkav\xE9delmi bejelent\xE9s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, window.EHS_INC_TYPE_ORDER.map(k => {
    const m = window.EHS_INC_TYPE[k];
    const on = type === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setType(k),
      className: `flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border ${on ? "border-red-500 bg-red-50" : "border-stone-200 bg-white"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 18,
      className: on ? "text-red-700" : "text-stone-400"
    }), /*#__PURE__*/React.createElement("span", {
      className: `text-[11px] font-medium text-center leading-tight ${on ? "text-red-800" : "text-stone-600"}`
    }, m.short));
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Mi t\xF6rt\xE9nt? *"), /*#__PURE__*/React.createElement("input", {
    value: subject,
    onChange: e => setSubject(e.target.value),
    placeholder: "R\xF6vid le\xEDr\xE1s",
    className: cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Helysz\xEDn"), /*#__PURE__*/React.createElement("input", {
    value: location,
    onChange: e => setLocation(e.target.value),
    placeholder: "Pl. V\xE1c \u2014 f\u0151\xFCzem, szab\xE1szat",
    className: cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "S\xFAlyoss\xE1g"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, window.EHS_INC_SEV_ORDER.map(k => {
    const s = window.EHS_INC_SEV[k];
    const on = sev === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setSev(k),
      className: `flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg text-[11.5px] font-medium border ${on ? s.pill : "bg-white text-stone-500 border-stone-200"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${s.dot}`
    }), s.short);
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "R\xE9szletek"), /*#__PURE__*/React.createElement("textarea", {
    value: note,
    onChange: e => setNote(e.target.value),
    rows: 2,
    placeholder: "Mi t\xF6rt\xE9nt, hogyan, ki \xE9rintett\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-red-500"
  })), /*#__PURE__*/React.createElement("button", {
    disabled: !subject.trim(),
    onClick: create,
    className: "w-full h-10 rounded-xl bg-red-600 text-white text-[13px] font-semibold disabled:opacity-40"
  }, "Bejelent\xE9s r\xF6gz\xEDt\xE9se"))));
}

// ── Kockázati mátrix (5×5) ───────────────────────────────────────
function RiskMatrix({
  L,
  S,
  onPick
}) {
  const E = window.EhsEngine;
  const rows = [5, 4, 3, 2, 1]; // súlyosság (fentről)
  const cols = [1, 2, 3, 4, 5]; // valószínűség
  return /*#__PURE__*/React.createElement("div", {
    className: "inline-flex flex-col gap-0.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-stretch gap-0.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-7"
  }), cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c,
    className: "w-9 text-center text-[9px] text-stone-400 font-medium"
  }, c))), rows.map(s => /*#__PURE__*/React.createElement("div", {
    key: s,
    className: "flex items-stretch gap-0.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-7 grid place-items-center text-[9px] text-stone-400 font-medium"
  }, s), cols.map(c => {
    const sc = s * c;
    const band = E.band(sc);
    const active = L === c && S === s;
    return /*#__PURE__*/React.createElement("button", {
      key: c,
      onClick: onPick ? () => onPick(c, s) : undefined,
      disabled: !onPick,
      className: `w-9 h-8 rounded-md grid place-items-center text-[10.5px] font-semibold tabular-nums ${active ? "ring-2 ring-stone-900 ring-offset-1" : ""}`,
      style: {
        background: band.cell + (active ? "" : "33"),
        color: active ? "#fff" : band.cell
      }
    }, sc);
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mt-1.5 ml-7"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] text-stone-400"
  }, "\u2191 S\xFAlyoss\xE1g \xB7 Val\xF3sz\xEDn\u0171s\xE9g \u2192")));
}

// ── Kockázat-részlet ─────────────────────────────────────────────
function RiskDetail({
  risk,
  onClose
}) {
  const sim = useSim();
  const live = (sim.ehsRisks || []).find(x => x.id === risk.id) || risk;
  const E = window.EhsEngine;
  const canManage = sim.hasPerm("ehs.manage");
  const [ctrlText, setCtrlText] = useStateE2("");
  const due = E.isReviewDue(live);
  const days = E.reviewDays(live);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-500"
  }, live.scope), /*#__PURE__*/React.createElement(window.EhsRiskBadge, {
    risk: live
  })), live.hazard && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3 text-[12.5px] text-stone-700"
  }, live.hazard), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Kock\xE1zati besorol\xE1s (kontroll el\u0151tt)"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4 flex-wrap"
  }, /*#__PURE__*/React.createElement(RiskMatrix, {
    L: live.likelihood,
    S: live.severity,
    onPick: canManage ? (l, s) => window.sim.updateEhsRisk(live.id, {
      likelihood: l,
      severity: s
    }) : null
  }), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1 text-[11.5px] text-stone-600"
  }, /*#__PURE__*/React.createElement("div", null, "Val\xF3sz\xEDn\u0171s\xE9g: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, live.likelihood), " \u2014 ", (window.EHS_SCALE || {})[live.likelihood]), /*#__PURE__*/React.createElement("div", null, "S\xFAlyoss\xE1g: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, live.severity), " \u2014 ", (window.EHS_SEV_SCALE || {})[live.severity]), /*#__PURE__*/React.createElement("div", {
    className: "pt-1"
  }, "Pontsz\xE1m: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold tabular-nums"
  }, E.score(live))))), canManage && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1.5"
  }, "A m\xE1trix cell\xE1ira kattintva \xE1ll\xEDthat\xF3 a besorol\xE1s.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "V\xE9d\u0151int\xE9zked\xE9sek"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mb-2"
  }, (live.controls || []).map((c, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "flex items-start gap-2 px-2.5 py-2 rounded-lg border border-stone-200"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield",
    size: 14,
    className: "text-emerald-600 shrink-0 mt-0.5"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-700 flex-1"
  }, c), canManage && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.removeEhsRiskControl(live.id, idx),
    className: "text-stone-300 hover:text-rose-500 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })))), !(live.controls || []).length && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs r\xF6gz\xEDtett v\xE9d\u0151int\xE9zked\xE9s.")), canManage && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: ctrlText,
    onChange: e => setCtrlText(e.target.value),
    placeholder: "\xDAj v\xE9d\u0151int\xE9zked\xE9s\u2026",
    className: "flex-1 h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-red-500"
  }), /*#__PURE__*/React.createElement("button", {
    disabled: !ctrlText.trim(),
    onClick: () => {
      window.sim.addEhsRiskControl(live.id, ctrlText);
      setCtrlText("");
    },
    className: "h-8 px-3 rounded-lg bg-stone-900 text-white text-[12px] font-medium disabled:opacity-40 shrink-0"
  }, "Hozz\xE1ad"))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Marad\xE9k kock\xE1zat (kontroll ut\xE1n)"), /*#__PURE__*/React.createElement(window.EhsRiskBadge, {
    risk: live,
    residual: true,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Val\xF3sz\xEDn\u0171s\xE9g"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1"
  }, [1, 2, 3, 4, 5].map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    disabled: !canManage,
    onClick: () => window.sim.updateEhsRisk(live.id, {
      resL: n
    }),
    className: `flex-1 h-7 rounded-md text-[11px] font-semibold ${(live.resL || live.likelihood) === n ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500"} disabled:opacity-60`
  }, n)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "S\xFAlyoss\xE1g"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1"
  }, [1, 2, 3, 4, 5].map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    disabled: !canManage,
    onClick: () => window.sim.updateEhsRisk(live.id, {
      resS: n
    }),
    className: `flex-1 h-7 rounded-md text-[11px] font-semibold ${(live.resS || live.severity) === n ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500"} disabled:opacity-60`
  }, n)))))), /*#__PURE__*/React.createElement("div", {
    className: `rounded-xl border p-3 flex items-center gap-3 ${due ? "border-rose-200 bg-rose-50" : "border-stone-200 bg-stone-50/60"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar",
    size: 16,
    className: due ? "text-rose-600 shrink-0" : "text-stone-400 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: `text-[12px] font-medium ${due ? "text-rose-800" : "text-stone-700"}`
  }, "Fel\xFClvizsg\xE1lat: ", live.reviewDue, due ? " — lejárt" : days != null ? ` (${days} nap)` : ""), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, "Felel\u0151s: ", live.owner || "—", " \xB7 Utols\xF3 \xE9rt\xE9kel\xE9s: ", live.assessedAt)), canManage && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.reviewEhsRisk(live.id),
    className: "h-8 px-3 rounded-lg bg-red-600 text-white text-[12px] font-medium shrink-0 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "rotate",
    size: 13
  }), "Fel\xFClvizsg\xE1lat")));
}
function RiskDetailHost({
  openId,
  setOpen
}) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const risk = openId ? (sim.ehsRisks || []).find(x => x.id === openId) : null;
  const onClose = () => setOpen(null);
  return /*#__PURE__*/React.createElement(SO, {
    open: !!risk,
    onClose: onClose,
    title: risk ? risk.title : "",
    subtitle: risk ? `${risk.id} · ${risk.scope}` : "",
    width: 560
  }, risk ? /*#__PURE__*/React.createElement(RiskDetail, {
    risk: risk,
    onClose: onClose
  }) : null);
}

// ── Új kockázatértékelés sheet ───────────────────────────────────
function NewRiskSheet({
  onClose,
  onCreated
}) {
  const sim = useSim();
  const [title, setTitle] = useStateE2("");
  const [scope, setScope] = useStateE2("");
  const [hazard, setHazard] = useStateE2("");
  const [L, setL] = useStateE2(3);
  const [S, setS] = useStateE2(3);
  const [owner, setOwner] = useStateE2("");
  const people = (sim.employees || []).filter(e => e.active !== false);
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-red-500";
  const create = () => {
    if (!title.trim()) return;
    const id = window.sim.addEhsRisk({
      title,
      scope,
      hazard,
      likelihood: L,
      severity: S,
      owner
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
    className: "relative bg-white w-full md:max-w-[520px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "\xDAj kock\xE1zat\xE9rt\xE9kel\xE9s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Megnevez\xE9s *"), /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "Pl. K\xF6rf\u0171r\xE9sz \u2014 v\xE1g\xE1si s\xE9r\xFCl\xE9s",
    className: cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Hat\xF3k\xF6r (g\xE9p / munkahely)"), /*#__PURE__*/React.createElement("input", {
    value: scope,
    onChange: e => setScope(e.target.value),
    placeholder: "Pl. Szab\xE1szat (g\xE9p)",
    className: cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Vesz\xE9ly le\xEDr\xE1sa"), /*#__PURE__*/React.createElement("textarea", {
    value: hazard,
    onChange: e => setHazard(e.target.value),
    rows: 2,
    placeholder: "Mi a vesz\xE9lyforr\xE1s?",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-red-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1.5"
  }, "Besorol\xE1s (kattints a m\xE1trixra)"), /*#__PURE__*/React.createElement(RiskMatrix, {
    L: L,
    S: S,
    onPick: (l, s) => {
      setL(l);
      setS(s);
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Felel\u0151s"), /*#__PURE__*/React.createElement("select", {
    value: owner,
    onChange: e => setOwner(e.target.value),
    className: cls
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "V\xE1lassz\u2026"), people.map(e => /*#__PURE__*/React.createElement("option", {
    key: e.id,
    value: e.name
  }, e.name)))), /*#__PURE__*/React.createElement("button", {
    disabled: !title.trim(),
    onClick: create,
    className: "w-full h-10 rounded-xl bg-red-600 text-white text-[13px] font-semibold disabled:opacity-40"
  }, "\xC9rt\xE9kel\xE9s l\xE9trehoz\xE1sa"))));
}

// ── Új oktatás-rekord sheet ──────────────────────────────────────
function NewTrainingSheet({
  onClose,
  onCreated
}) {
  const sim = useSim();
  const people = (sim.employees || []).filter(e => e.active !== false);
  const [empId, setEmpId] = useStateE2(people[0] ? people[0].id : "");
  const [kind, setKind] = useStateE2("munkavedelmi");
  const [completedAt, setCompletedAt] = useStateE2(window.EHS_TODAY);
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-red-500";
  const create = () => {
    if (!empId || !kind) return;
    window.sim.addEhsTraining({
      empId,
      kind,
      completedAt
    });
    if (onCreated) onCreated();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[60] flex items-end md:items-center justify-center",
    role: "dialog"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-stone-900/40",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full md:max-w-[460px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "Oktat\xE1s r\xF6gz\xEDt\xE9se"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Dolgoz\xF3 *"), /*#__PURE__*/React.createElement("select", {
    value: empId,
    onChange: e => setEmpId(e.target.value),
    className: cls
  }, people.map(e => /*#__PURE__*/React.createElement("option", {
    key: e.id,
    value: e.id
  }, e.name, " \xB7 ", e.role)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Oktat\xE1s t\xEDpusa"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-1.5"
  }, window.EHS_TRAIN_KIND_ORDER.map(k => {
    const m = window.EHS_TRAIN_KIND[k];
    const on = kind === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setKind(k),
      className: `flex items-center gap-2 px-2.5 h-9 rounded-lg border text-[12px] font-medium ${on ? "border-red-500 bg-red-50 text-red-800" : "border-stone-200 bg-white text-stone-600"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 14,
      className: on ? "text-red-600" : "text-stone-400"
    }), m.label, /*#__PURE__*/React.createElement("span", {
      className: "ml-auto text-[10px] text-stone-400"
    }, m.validMonths, " h\xF3"));
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Elv\xE9gz\xE9s d\xE1tuma"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: completedAt,
    onChange: e => setCompletedAt(e.target.value),
    className: cls
  })), /*#__PURE__*/React.createElement("button", {
    disabled: !empId,
    onClick: create,
    className: "w-full h-10 rounded-xl bg-red-600 text-white text-[13px] font-semibold disabled:opacity-40"
  }, "R\xF6gz\xEDt\xE9s"))));
}
Object.assign(window, {
  IncDetail,
  NewIncSheet,
  RiskMatrix,
  RiskDetail,
  RiskDetailHost,
  NewRiskSheet,
  NewTrainingSheet
});
})();
