/* AUTO-GENERATED from page-auth.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-auth.jsx — HATÁSKÖR-MÁTRIX (Beállítások → Hatáskörök) (4.8-B2)
//   Jóváhagyási értékküszöbök szerkesztése + a beérkező jóváhagyási kérelmek
//   kezelése (jóváhagy / elutasít). A limit feletti műveletek a „Feladataim"
//   jóváhagyások közt is megjelennek. Store: window.sim authConfig + approvals.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateAu
} = React;
const _auhuf = n => Math.round(Number(n) || 0).toLocaleString("hu-HU");
function AuthStatusPill({
  status
}) {
  const t = (window.AUTH_STATUS || {})[status] || {
    label: status,
    pill: "bg-stone-100 text-stone-600 border-stone-200",
    dot: "bg-stone-400"
  };
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 rounded-full border font-medium px-2 h-6 text-[11.5px] ${t.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.dot}`
  }), t.label);
}
function AuthorityPanel() {
  const sim = useSim();
  const cfg = sim.authConfig || {};
  const approvals = sim.approvals || [];
  const canManage = window.sim.hasPerm && window.sim.hasPerm("settings.manage");
  const canApprove = window.sim.hasPerm && window.sim.hasPerm("auth.approve");
  const limitKeys = (window.AUTH_ACTION_ORDER || []).map(t => window.AUTH_ACTIONS[t].limitKey);
  const initDraft = () => limitKeys.reduce((o, k) => {
    o[k] = cfg[k];
    return o;
  }, {});
  const [draft, setDraft] = useStateAu(initDraft());
  const [rejId, setRejId] = useStateAu(null);
  const [rejReason, setRejReason] = useStateAu("");
  const dirty = limitKeys.some(k => Number(draft[k]) !== Number(cfg[k]));
  const pending = approvals.filter(a => a.status === "fuggoben");
  const decided = approvals.filter(a => a.status !== "fuggoben");
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 max-w-[760px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-1 text-[13px] font-semibold text-stone-900"
  }, "J\xF3v\xE1hagy\xE1si k\xFCsz\xF6b\xF6k"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-stone-500 mb-4"
  }, "E f\xF6l\xF6tt a megl\xE9v\u0151 jogosults\xE1g MELLETT k\xFCl\xF6n j\xF3v\xE1hagy\xE1s (`auth.approve`) sz\xFCks\xE9ges \u2014 a m\u0171velet addig \u201Ej\xF3v\xE1hagy\xE1sra v\xE1r\"."), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-3 gap-3"
  }, (window.AUTH_ACTION_ORDER || []).map(type => {
    const m = window.AUTH_ACTIONS[type];
    const k = m.limitKey;
    return /*#__PURE__*/React.createElement("div", {
      key: type,
      className: "rounded-xl border border-stone-200 p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 mb-2"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 14,
      className: "text-stone-400"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] font-medium text-stone-700"
    }, m.label)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1"
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: draft[k] ?? "",
      disabled: !canManage,
      onChange: e => setDraft({
        ...draft,
        [k]: e.target.value
      }),
      className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-indigo-500 disabled:bg-stone-50"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-400 shrink-0 w-6"
    }, m.unit)), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-400 mt-1"
    }, "e f\xF6l\xF6tt j\xF3v\xE1hagy\xE1s"));
  })), canManage && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-4"
  }, /*#__PURE__*/React.createElement("button", {
    disabled: !dirty,
    onClick: () => window.sim.setAuthConfig(limitKeys.reduce((o, k) => {
      o[k] = Number(draft[k]) || 0;
      return o;
    }, {})),
    className: "h-9 px-4 rounded-lg bg-indigo-600 text-white text-[12.5px] font-medium disabled:opacity-40"
  }, "Ment\xE9s"), dirty && /*#__PURE__*/React.createElement("button", {
    onClick: () => setDraft(initDraft()),
    className: "h-9 px-3 rounded-lg border border-stone-200 text-stone-600 text-[12.5px]"
  }, "M\xE9gse")), !canManage && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-amber-700 mt-3 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 13
  }), "A k\xFCsz\xF6b\xF6k m\xF3dos\xEDt\xE1s\xE1hoz `settings.manage` jog kell.")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "J\xF3v\xE1hagy\xE1si k\xE9relmek"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium"
  }, pending.length, " nyitott")), !approvals.length && /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-10 text-center text-[12.5px] text-stone-400"
  }, "Nincs j\xF3v\xE1hagy\xE1si k\xE9relem."), [...pending, ...decided].map(a => {
    const m = (window.AUTH_ACTIONS || {})[a.type] || {};
    const isPending = a.status === "fuggoben";
    return /*#__PURE__*/React.createElement("div", {
      key: a.id,
      className: "px-4 py-3 border-b border-stone-100 last:border-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-amber-50 text-amber-600"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon || "check",
      size: 17
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] font-semibold text-stone-900"
    }, a.title), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 mt-0.5"
    }, a.id, " \xB7 ", m.label, " \xB7 k\xE9rte: ", a.requestedBy, a.createdAt ? ` · ${a.createdAt}` : ""), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mt-1.5 flex-wrap"
    }, /*#__PURE__*/React.createElement(AuthStatusPill, {
      status: a.status
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-600"
    }, "\xC9rt\xE9k: ", /*#__PURE__*/React.createElement("span", {
      className: "font-semibold text-stone-900"
    }, _auhuf(a.amount), m.unit === "%" ? "%" : " " + (m.unit || "Ft"))), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-400"
    }, "limit ", _auhuf(a.limit), m.unit === "%" ? "%" : " " + (m.unit || "Ft")), a.approver && /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-400"
    }, "\xB7 ", a.status === "jovahagyva" ? "jóváhagyta" : "elutasította", ": ", a.approver)), a.reason && /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 mt-1 italic"
    }, "\u201E", a.reason, "\""), isPending && canApprove && rejId !== a.id && /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mt-2.5"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.decideApproval(a.id, true),
      className: "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white text-[12px] font-medium hover:bg-emerald-700"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13
    }), "J\xF3v\xE1hagy"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setRejId(a.id);
        setRejReason("");
      },
      className: "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-stone-200 text-stone-600 text-[12px] font-medium hover:bg-stone-50"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 13
    }), "Elutas\xEDt")), isPending && canApprove && rejId === a.id && /*#__PURE__*/React.createElement("div", {
      className: "mt-2.5 rounded-lg border border-stone-200 bg-stone-50 p-2.5"
    }, /*#__PURE__*/React.createElement("textarea", {
      value: rejReason,
      onChange: e => setRejReason(e.target.value),
      rows: 2,
      placeholder: "Elutas\xEDt\xE1s oka\u2026",
      className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-stone-400"
    }), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mt-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        window.sim.decideApproval(a.id, false, {
          reason: rejReason
        });
        setRejId(null);
      },
      className: "h-8 px-3 rounded-lg bg-rose-600 text-white text-[12px] font-medium"
    }, "Elutas\xEDt"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setRejId(null),
      className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
    }, "M\xE9gse"))), isPending && !canApprove && /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-amber-700 mt-2 inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 12
    }), "A d\xF6nt\xE9shez `auth.approve` jog kell."))));
  })));
}
Object.assign(window, {
  AuthStatusPill,
  AuthorityPanel
});
})();
