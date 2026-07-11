/* AUTO-GENERATED from page-controlling.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-controlling.jsx — KONTROLLING világ
//   Projekt-jövedelmezőség: terv vs. tény utókalkuláció. SZÁMÍTOTT nézet a
//   store-ból (controllingForProject / controllingPortfolio) — auto-aggregálás
//   + kézi korrekciós tételek (ctrlAdjustments). Három nézet: Áttekintés
//   (portfólió), Projekt-fedezet (lista + detail SlideOver), Eltérés-elemzés.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateC,
  useMemo: useMemoC
} = React;
const CTRL_STATUS_LABEL = {
  draft: "Vázlat",
  active: "Folyamatban",
  install: "Beépítés",
  done: "Kész",
  on_hold: "Áll"
};

// vékony fedezet-sáv: bevétel = 100%, a költség kitölti, a fedezet a maradék
function MarginBar({
  revenue,
  cost,
  tone
}) {
  const r = Math.max(1, revenue || 0);
  const costPct = Math.max(0, Math.min(100, cost / r * 100));
  const t = tone || window.ctrlMarginTone((revenue - cost) / r);
  return /*#__PURE__*/React.createElement("div", {
    className: "h-2.5 w-full rounded-full bg-stone-100 overflow-hidden flex"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-stone-300",
    style: {
      width: costPct + "%"
    },
    title: "Költség: " + window.ctrlHuf(cost)
  }), /*#__PURE__*/React.createElement("div", {
    className: `h-full ${t.bar}`,
    style: {
      width: 100 - costPct + "%"
    },
    title: "Fedezet: " + window.ctrlHuf(revenue - cost)
  }));
}
function MarginPill({
  pct,
  size = "md"
}) {
  const t = window.ctrlMarginTone(pct);
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.dot}`
  }), window.ctrlPct(pct), " \xB7 ", t.label);
}
function VarPill({
  diff,
  size = "md"
}) {
  const t = window.ctrlVarianceTone(diff);
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  if (Math.abs(diff) < 1) return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center rounded-full border font-medium ${cls} ${t.pill}`
  }, "terv szerint");
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center rounded-full border font-medium ${cls} ${t.pill}`
  }, t.sign, window.ctrlHuf(Math.abs(diff)).replace(" Ft", ""), " Ft");
}

// ── Detail host (SlideOver) ──────────────────────────────────────
function CtrlDetailHost({
  openId,
  onClose
}) {
  const sim = useSim();
  const SO = window.SlideOver;
  const r = openId ? window.sim.controllingForProject(openId) : null;
  if (!SO) return null;
  return /*#__PURE__*/React.createElement(SO, {
    open: !!r,
    onClose: onClose,
    title: r ? r.project.name : "",
    subtitle: r ? r.project.customer : "",
    width: 620
  }, r ? /*#__PURE__*/React.createElement(ProjectControllingDetail, {
    r: r
  }) : null);
}

// ── Áttekintés (portfólió) ───────────────────────────────────────
function ControllingDashboard({
  onScreen
}) {
  const sim = useSim();
  const pf = window.sim.controllingPortfolio();
  const [openId, setOpenId] = useStateC(null);
  const [cfgOpen, setCfgOpen] = useStateC(false);
  const cfg = window.sim.ctrlConfig();
  const T = pf.totals;
  const KPI = ({
    label,
    value,
    sub,
    tone = "slate"
  }) => /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: `text-[22px] font-semibold leading-none mt-1.5 ${tone === "rose" ? "text-rose-700" : tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-stone-900"}`
  }, value), sub && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1"
  }, sub));
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Kontrolling"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Projekt-j\xF6vedelmez\u0151s\xE9g \u2014 terv vs. t\xE9ny ut\xF3kalkul\xE1ci\xF3")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden sm:flex items-center gap-2 text-[11.5px] text-stone-500 bg-white border border-stone-200 rounded-lg px-3 h-9"
  }, /*#__PURE__*/React.createElement("span", null, "Rezsi"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: cfg.overheadPct,
    onChange: e => window.sim.setCtrlConfig({
      overheadPct: Number(e.target.value) || 0
    }),
    className: "w-12 h-6 px-1 rounded border border-stone-200 text-[12px] text-right"
  }), /*#__PURE__*/React.createElement("span", null, "%")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCfgOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 bg-white text-[12px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-800",
    title: "\xD3rad\xEDj-be\xE1ll\xEDt\xE1sok"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 15,
    className: "text-stone-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden md:inline"
  }, "\xD3rad\xEDjak")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement(KPI, {
    label: "Szerz\u0151d\xE9ses \xE9rt\xE9k",
    value: window.ctrlHuf(T.contract),
    sub: `Számlázva: ${window.ctrlHuf(T.invoiced)}`
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Terv \xF6sszk\xF6lts\xE9g",
    value: window.ctrlHuf(T.planTotal),
    sub: `Fedezet: ${window.ctrlPct(T.planMarginPct)}`
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "T\xE9ny \xF6sszk\xF6lts\xE9g",
    value: window.ctrlHuf(T.actualTotal),
    sub: `Eltérés: ${window.ctrlHuf(T.actualTotal - T.planTotal)}`,
    tone: T.actualTotal > T.planTotal ? "rose" : "emerald"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "T\xE9ny fedezet",
    value: window.ctrlPct(T.actualMarginPct),
    sub: `Eddig realizált · ${window.ctrlHuf(T.actualMargin)}`,
    tone: (T.actualMarginPct || 0) < 0.15 ? "rose" : "emerald"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "V\xE1rhat\xF3 fedezet (EAC)",
    value: window.ctrlPct(T.eacMarginPct),
    sub: `Terv+realizált · ${window.ctrlHuf(T.eacMargin)}`,
    tone: (T.eacMarginPct || 0) < 0.15 ? "rose" : (T.eacMarginPct || 0) < 0.30 ? "amber" : "emerald"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-3 mb-4"
  }, [["Legjobb fedezet", pf.top, "emerald"], ["Leggyengébb fedezet", pf.flop, "rose"]].map(([label, r, tone], i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => r && setOpenId(r.project.id),
    className: "text-left bg-white rounded-2xl border border-stone-200 p-4 hover:border-stone-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-1.5"
  }, label), r ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 truncate"
  }, r.project.name), /*#__PURE__*/React.createElement(MarginPill, {
    pct: r.actualMarginPct,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mb-2"
  }, r.project.customer), /*#__PURE__*/React.createElement(MarginBar, {
    revenue: r.revenueActual,
    cost: r.actualTotal
  })) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "\u2014")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Projektek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("projects"),
    className: "text-[11.5px] text-slate-600 font-medium inline-flex items-center gap-1"
  }, "Mind ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  }))), pf.list.map(r => /*#__PURE__*/React.createElement(CtrlProjectRow, {
    key: r.project.id,
    r: r,
    onOpen: setOpenId
  }))), /*#__PURE__*/React.createElement(CtrlDetailHost, {
    openId: openId,
    onClose: () => setOpenId(null)
  }), /*#__PURE__*/React.createElement(CtrlSettingsSheet, {
    open: cfgOpen,
    onClose: () => setCfgOpen(false)
  }));
}

// ── Óradíj-beállítások (munkaerő ár-bázis) ───────────────────────
function CtrlSettingsSheet({
  open,
  onClose
}) {
  const sim = useSim();
  const SO = window.SlideOver;
  const cfg = window.sim.ctrlConfig();
  const D = window.CTRL_DEFAULTS || {};
  const BASIS = window.CTRL_LABOR_BASIS || {};
  const GRADES = window.HR_PAY_GRADES || {};
  const GORDER = window.HR_PAY_ORDER || Object.keys(GRADES);
  const KINDS = window.PROD_KINDS || {};
  const KORDER = window.PROD_KIND_ORDER || Object.keys(KINDS);
  const kindRates = cfg.kindRates || window.CTRL_KIND_RATES || {};
  if (!SO) return null;
  const mult = Number(cfg.gradeLoadMult) || D.gradeLoadMult || 1.9;
  const basis = cfg.laborBasis || "auto";
  const huf = n => Math.round(n).toLocaleString("hu-HU");
  const setKind = (k, v) => {
    const next = {
      ...(window.CTRL_KIND_RATES || {}),
      ...kindRates,
      [k]: Number(v) || 0
    };
    window.sim.setCtrlConfig({
      kindRates: next
    });
  };
  const resetAll = () => window.sim.setCtrlConfig({
    laborBasis: D.laborBasis || "auto",
    gradeLoadMult: D.gradeLoadMult || 1.9,
    laborRate: D.laborRate || 7200,
    kindRates: {
      ...(window.CTRL_KIND_RATES || {})
    }
  });
  const BASIS_DESC = {
    auto: "Kaszkád: ha a feladathoz HR-dolgozó van rendelve → bér-kategória; különben művelettípus; végül átalány.",
    grade: "Mindig a hozzárendelt dolgozó bér-kategóriáját használja (dolgozó nélkül átalány).",
    kind: "Mindig a művelettípus óradíját használja (ismeretlen típusnál átalány).",
    flat: "Minden feladatra az általános átalány óradíjat alkalmazza."
  };
  const BORDER = ["auto", "grade", "kind", "flat"];
  const basisLabel = k => k === "auto" ? "Automatikus" : (BASIS[k] || {}).label || k;
  const Field = ({
    label,
    children,
    hint
  }) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline justify-between gap-2 mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-medium text-stone-700"
  }, label), hint && /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400"
  }, hint)), children);
  return /*#__PURE__*/React.createElement(SO, {
    open: open,
    onClose: onClose,
    title: "\xD3rad\xEDj-be\xE1ll\xEDt\xE1sok",
    subtitle: "T\xE9ny-munkaer\u0151 \xE1r-b\xE1zis a kontrollinghoz",
    width: 520
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-1 py-1 space-y-6"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Munkaer\u0151 \xE1r-b\xE1zis"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-1.5"
  }, BORDER.map(k => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => window.sim.setCtrlConfig({
      laborBasis: k
    }),
    className: `h-9 rounded-lg border text-[12px] font-medium transition-colors ${basis === k ? "border-slate-600 bg-slate-700 text-white" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`
  }, basisLabel(k)))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-stone-500 mt-2 leading-snug"
  }, BASIS_DESC[basis])), /*#__PURE__*/React.createElement(Field, {
    label: "B\xE9r-kateg\xF3ria terhel\xE9si szorz\xF3",
    hint: `alap: ${D.gradeLoadMult || 1.9}×`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "1",
    max: "3",
    step: "0.05",
    value: mult,
    onChange: e => window.sim.setCtrlConfig({
      gradeLoadMult: Number(e.target.value)
    }),
    className: "flex-1 accent-slate-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-white border border-stone-200 rounded-lg px-2 h-9"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.05",
    min: "1",
    value: mult,
    onChange: e => window.sim.setCtrlConfig({
      gradeLoadMult: Number(e.target.value) || 1
    }),
    className: "w-12 h-7 text-[13px] text-right outline-none"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-400"
  }, "\xD7"))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-stone-500 mt-1.5 leading-snug"
  }, "Nett\xF3 HR-\xF3rab\xE9r \u2192 teljes (b\xE9r + j\xE1rul\xE9k + rezsi) m\u0171hely-\xF3rad\xEDj."), /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 rounded-xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[1.4fr_1fr_auto_1fr] items-center px-3 py-1.5 bg-stone-50/70 text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, /*#__PURE__*/React.createElement("span", null, "B\xE9r-kateg\xF3ria"), /*#__PURE__*/React.createElement("span", {
    className: "text-right"
  }, "Nett\xF3"), /*#__PURE__*/React.createElement("span", {
    className: "px-2"
  }, " "), /*#__PURE__*/React.createElement("span", {
    className: "text-right"
  }, "Terhelt")), GORDER.map(g => {
    const net = (GRADES[g] || {}).rate || 0;
    return /*#__PURE__*/React.createElement("div", {
      key: g,
      className: "grid grid-cols-[1.4fr_1fr_auto_1fr] items-center px-3 py-1.5 border-t border-stone-100 text-[12px]"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-stone-700 truncate"
    }, (GRADES[g] || {}).label || g), /*#__PURE__*/React.createElement("span", {
      className: "text-right text-stone-500 tabular-nums"
    }, huf(net)), /*#__PURE__*/React.createElement("span", {
      className: "px-2 text-stone-300"
    }, "\u2192"), /*#__PURE__*/React.createElement("span", {
      className: "text-right font-semibold text-stone-900 tabular-nums"
    }, huf(net * mult)));
  }))), /*#__PURE__*/React.createElement(Field, {
    label: "Per-m\u0171velett\xEDpus \xF3rad\xEDjak",
    hint: "dolgoz\xF3 n\xE9lk\xFCli feladatra"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, KORDER.map(k => {
    const meta = KINDS[k] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      className: "flex items-center gap-2.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-1.5 h-1.5 rounded-full shrink-0",
      style: {
        background: meta.accent || "#a8a29e"
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] text-stone-700 flex-1 truncate"
    }, meta.label || k), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 bg-white border border-stone-200 rounded-lg px-2 h-9"
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      step: "100",
      value: kindRates[k] ?? (window.CTRL_KIND_RATES || {})[k] ?? 0,
      onChange: e => setKind(k, e.target.value),
      className: "w-16 h-7 text-[13px] text-right outline-none tabular-nums"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-400"
    }, "Ft/h")));
  }))), /*#__PURE__*/React.createElement(Field, {
    label: "\xC1ltal\xE1nos \xF3rad\xEDj (\xE1tal\xE1ny)",
    hint: "v\xE9gs\u0151 fallback"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-white border border-stone-200 rounded-lg px-2 h-9 w-fit"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "100",
    value: cfg.laborRate ?? D.laborRate ?? 7200,
    onChange: e => window.sim.setCtrlConfig({
      laborRate: Number(e.target.value) || 0
    }),
    className: "w-20 h-7 text-[13px] text-right outline-none tabular-nums"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, "Ft/h")), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-stone-500 mt-1.5 leading-snug"
  }, "Akkor \xE9rv\xE9nyes, ha sem dolgoz\xF3, sem m\u0171velett\xEDpus-\xF3rad\xEDj nem oldhat\xF3 fel.")), /*#__PURE__*/React.createElement("div", {
    className: "pt-1 flex items-center justify-between border-t border-stone-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, "A v\xE1ltoz\xE1s azonnal \xE9rv\xE9nyes\xFCl a t\xE9ny-fedezeten."), /*#__PURE__*/React.createElement("button", {
    onClick: resetAll,
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-800"
  }, "Alap\xE9rt\xE9kek"))));
}
function CtrlProjectRow({
  r,
  onOpen
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(r.project.id),
    className: "w-full text-left px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, r.project.name), /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 shrink-0"
  }, CTRL_STATUS_LABEL[r.project.status] || r.project.status)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate mb-1.5"
  }, r.project.customer, " \xB7 ", window.ctrlHuf(r.revenueActual)), /*#__PURE__*/React.createElement(MarginBar, {
    revenue: r.revenueActual,
    cost: r.actualTotal
  })), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 w-[120px] text-right flex flex-col items-end gap-1"
  }, /*#__PURE__*/React.createElement(MarginPill, {
    pct: r.actualMarginPct,
    size: "sm"
  }), /*#__PURE__*/React.createElement(VarPill, {
    diff: r.costVariance,
    size: "sm"
  })), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 15,
    className: "text-stone-300 shrink-0"
  }));
}

// ── Projekt-fedezet (lista) ──────────────────────────────────────
function ControllingProjects() {
  const sim = useSim();
  const pf = window.sim.controllingPortfolio();
  const [openId, setOpenId] = useStateC(null);
  const [sort, setSort] = useStateC("margin");
  const rows = pf.list.slice().sort((a, b) => sort === "margin" ? (a.actualMarginPct || 0) - (b.actualMarginPct || 0) : sort === "variance" ? b.costVariance - a.costVariance : b.revenueActual - a.revenueActual);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Projekt-fedezet"), /*#__PURE__*/React.createElement("select", {
    value: sort,
    onChange: e => setSort(e.target.value),
    className: "h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-slate-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: "margin"
  }, "Fedezet szerint (n\xF6vekv\u0151)"), /*#__PURE__*/React.createElement("option", {
    value: "variance"
  }, "K\xF6lts\xE9g-elt\xE9r\xE9s szerint"), /*#__PURE__*/React.createElement("option", {
    value: "revenue"
  }, "Bev\xE9tel szerint"))), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:block bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[1.6fr_1fr_1fr_1fr_1.2fr_120px] px-4 py-2.5 border-b border-stone-100 bg-stone-50/50 text-[10.5px] uppercase tracking-wide text-stone-400 font-medium"
  }, /*#__PURE__*/React.createElement("span", null, "Projekt"), /*#__PURE__*/React.createElement("span", {
    className: "text-right"
  }, "Bev\xE9tel"), /*#__PURE__*/React.createElement("span", {
    className: "text-right"
  }, "Terv ktg."), /*#__PURE__*/React.createElement("span", {
    className: "text-right"
  }, "T\xE9ny ktg."), /*#__PURE__*/React.createElement("span", {
    className: "text-right pr-2"
  }, "Elt\xE9r\xE9s"), /*#__PURE__*/React.createElement("span", {
    className: "text-right"
  }, "Fedezet")), rows.map(r => /*#__PURE__*/React.createElement("button", {
    key: r.project.id,
    onClick: () => setOpenId(r.project.id),
    className: "w-full grid grid-cols-[1.6fr_1fr_1fr_1fr_1.2fr_120px] items-center px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 pr-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900 truncate"
  }, r.project.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 truncate"
  }, r.project.customer)), /*#__PURE__*/React.createElement("div", {
    className: "text-right text-[12.5px] tabular-nums text-stone-700"
  }, window.ctrlHuf(r.revenueActual)), /*#__PURE__*/React.createElement("div", {
    className: "text-right text-[12.5px] tabular-nums text-stone-500"
  }, window.ctrlHuf(r.planTotal)), /*#__PURE__*/React.createElement("div", {
    className: "text-right text-[12.5px] tabular-nums text-stone-900 font-medium"
  }, window.ctrlHuf(r.actualTotal)), /*#__PURE__*/React.createElement("div", {
    className: "text-right pr-2"
  }, /*#__PURE__*/React.createElement(VarPill, {
    diff: r.costVariance,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement(MarginPill, {
    pct: r.actualMarginPct,
    size: "sm"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "md:hidden bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, rows.map(r => /*#__PURE__*/React.createElement(CtrlProjectRow, {
    key: r.project.id,
    r: r,
    onOpen: setOpenId
  }))), /*#__PURE__*/React.createElement(CtrlDetailHost, {
    openId: openId,
    onClose: () => setOpenId(null)
  }));
}

// ── Eltérés-elemzés ──────────────────────────────────────────────
function ControllingVariance() {
  const sim = useSim();
  const pf = window.sim.controllingPortfolio();
  const [openId, setOpenId] = useStateC(null);
  const CATS = window.CTRL_CATEGORIES || {};
  const ORDER = window.CTRL_CAT_ORDER || [];

  // kategóriánkénti portfólió-aggregátum
  const byCat = ORDER.map(c => {
    const plan = pf.list.reduce((a, r) => a + (r.plan[c] || 0), 0);
    const actual = pf.list.reduce((a, r) => a + (r.actual[c] || 0), 0);
    return {
      key: c,
      meta: CATS[c] || {},
      plan,
      actual,
      diff: actual - plan
    };
  });
  const maxAbs = Math.max(1, ...byCat.map(x => Math.max(x.plan, x.actual)));

  // projektek a legnagyobb költség-csúszással
  const slipped = pf.list.slice().filter(r => r.costVariance > 0).sort((a, b) => b.costVariance - a.costVariance);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900 mb-1"
  }, "Elt\xE9r\xE9s-elemz\xE9s"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mb-4"
  }, "Hol cs\xFAszott a k\xF6lts\xE9g a tervhez k\xE9pest \u2014 kateg\xF3ri\xE1nk\xE9nt \xE9s projektenk\xE9nt."), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4 md:p-5 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-800 mb-3"
  }, "Kateg\xF3ria szerint (teljes portf\xF3li\xF3)"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, byCat.map(x => /*#__PURE__*/React.createElement("div", {
    key: x.key
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 text-[12px] font-medium text-stone-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-sm",
    style: {
      background: x.meta.accent
    }
  }), x.meta.label), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px]"
  }, /*#__PURE__*/React.createElement(VarPill, {
    diff: x.diff,
    size: "sm"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-stone-400 w-8 shrink-0"
  }, "terv"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 h-2 rounded-full bg-stone-100 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-stone-300",
    style: {
      width: x.plan / maxAbs * 100 + "%"
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] tabular-nums text-stone-500 w-20 text-right shrink-0"
  }, window.ctrlHuf(x.plan))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-stone-400 w-8 shrink-0"
  }, "t\xE9ny"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 h-2 rounded-full bg-stone-100 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full",
    style: {
      width: x.actual / maxAbs * 100 + "%",
      background: x.meta.accent
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] tabular-nums text-stone-800 font-medium w-20 text-right shrink-0"
  }, window.ctrlHuf(x.actual)))))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 text-[12.5px] font-semibold text-stone-800"
  }, "K\xF6lts\xE9g-t\xFAll\xE9p\u0151 projektek"), slipped.length ? slipped.map(r => /*#__PURE__*/React.createElement("button", {
    key: r.project.id,
    onClick: () => setOpenId(r.project.id),
    className: "w-full text-left px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900 truncate"
  }, r.project.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500"
  }, "Terv ", window.ctrlHuf(r.planTotal), " \u2192 T\xE9ny ", window.ctrlHuf(r.actualTotal))), /*#__PURE__*/React.createElement(VarPill, {
    diff: r.costVariance,
    size: "sm"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 15,
    className: "text-stone-300"
  }))) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-8 text-center text-[12px] text-stone-400"
  }, "Nincs k\xF6lts\xE9g-t\xFAll\xE9p\u0151 projekt \u2014 minden terv szerint vagy alatta.")), /*#__PURE__*/React.createElement(CtrlDetailHost, {
    openId: openId,
    onClose: () => setOpenId(null)
  }));
}

// ── Munka tény — bérköltség bontás (időnaplóból) ────────────────────
function CtrlLaborBreakdown({
  r
}) {
  const [view, setView] = useStateC("person"); // person | basis
  const [open, setOpen] = useStateC(false);
  const [cfgOpen, setCfgOpen] = useStateC(false);
  const BASIS = window.CTRL_LABOR_BASIS || {};
  const KINDS = window.PROD_KINDS || {};
  const GRADES = window.HR_PAY_GRADES || {};
  const bd = r.laborBreakdown || [];
  const by = r.laborByBasis || {};
  const people = r.laborByPerson || [];
  if (!bd.length) return null;
  const basisOrder = ["grade", "kind", "flat"].filter(k => (by[k] || 0) > 0);
  const Tab = ({
    id,
    label
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: () => setView(id),
    className: `h-7 px-2.5 rounded-md text-[11px] font-medium transition ${view === id ? "bg-white shadow-sm text-stone-900" : "text-stone-500"}`
  }, label);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2 gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Munka t\xE9ny \u2014 b\xE9rk\xF6lts\xE9g"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400 tabular-nums"
  }, r.laborHoursTotal != null ? r.laborHoursTotal.toLocaleString("hu-HU") + " ó · " : "", window.ctrlHuf(r.laborActual)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCfgOpen(true),
    className: "w-7 h-7 grid place-items-center rounded-md border border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300 shrink-0",
    title: "\xD3rad\xEDj-be\xE1ll\xEDt\xE1sok"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 13
  })), /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center gap-0.5 bg-stone-100 rounded-lg p-0.5"
  }, /*#__PURE__*/React.createElement(Tab, {
    id: "person",
    label: "Szem\xE9ly"
  }), /*#__PURE__*/React.createElement(Tab, {
    id: "basis",
    label: "B\xE1zis"
  })))), view === "person" ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 overflow-hidden"
  }, people.map(p => {
    const grade = p.payGrade ? (GRADES[p.payGrade] || {}).label : (BASIS[p.basis] || {}).label;
    return /*#__PURE__*/React.createElement("div", {
      key: p.who,
      className: "flex items-center gap-2.5 px-3 py-2 border-b border-stone-100 last:border-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-7 h-7 rounded-full grid place-items-center text-[10px] font-semibold text-white shrink-0",
      style: {
        background: p.color
      }
    }, p.initials || "?"), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-medium text-stone-800 truncate"
    }, p.who, !p.inTorzs && /*#__PURE__*/React.createElement("span", {
      className: "ml-1 text-[9px] text-stone-400"
    }, "(nincs HR-t\xF6rzsben)")), /*#__PURE__*/React.createElement("div", {
      className: "text-[9.5px] text-stone-400 truncate"
    }, grade, " \xB7 ", p.hours.toLocaleString("hu-HU"), " \xF3 \xD7 ", window.ctrlHuf(p.rate).replace(" Ft", ""), " Ft \xB7 ", p.taskCount, " feladat")), /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] tabular-nums font-semibold text-stone-900 shrink-0"
    }, window.ctrlHuf(p.cost)));
  })) : /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 overflow-hidden"
  }, basisOrder.map(k => {
    const m = BASIS[k] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      className: "flex items-center gap-2 px-3 py-2 border-b border-stone-100 last:border-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1.5 rounded-full border px-2 h-6 text-[11px] font-medium ${m.pill || ""}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${m.dot || "bg-stone-400"}`
    }), m.label || k), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-400 flex-1 truncate"
    }, k === "grade" ? "HR bér-kategória (hozzárendelt dolgozó)" : k === "kind" ? "per-művelettípus óradíj" : "általános fallback óradíj"), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] tabular-nums font-medium text-stone-800 shrink-0"
    }, window.ctrlHuf(by[k])));
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(v => !v),
    className: "mt-1.5 text-[11px] text-slate-600 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: open ? "chevron-up" : "chevron",
    size: 12
  }), open ? "Feladatonkénti bontás elrejtése" : `Feladatonkénti bontás (${bd.length})`), open && /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 rounded-xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[1.5fr_0.7fr_0.8fr_0.8fr] px-3 py-1.5 bg-stone-50/60 text-[9.5px] uppercase tracking-wide text-stone-400 font-medium"
  }, /*#__PURE__*/React.createElement("span", null, "Feladat"), /*#__PURE__*/React.createElement("span", {
    className: "text-right"
  }, "\xD3ra"), /*#__PURE__*/React.createElement("span", {
    className: "text-right"
  }, "\xD3rad\xEDj"), /*#__PURE__*/React.createElement("span", {
    className: "text-right"
  }, "K\xF6lts\xE9g")), bd.map(x => {
    const km = KINDS[x.kind] || {};
    const bm = BASIS[x.basis] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: x.taskId,
      className: "grid grid-cols-[1.5fr_0.7fr_0.8fr_0.8fr] items-center px-3 py-2 border-t border-stone-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 pr-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-800 truncate"
    }, x.title), /*#__PURE__*/React.createElement("div", {
      className: "text-[9.5px] text-stone-400 truncate"
    }, km.label || x.kind, " \xB7 ", x.who || x.assignee || bm.label)), /*#__PURE__*/React.createElement("div", {
      className: "text-right text-[11px] tabular-nums text-stone-500"
    }, x.hours.toLocaleString("hu-HU"), " \xF3"), /*#__PURE__*/React.createElement("div", {
      className: "text-right text-[11px] tabular-nums text-stone-500"
    }, window.ctrlHuf(x.rate).replace(" Ft", "")), /*#__PURE__*/React.createElement("div", {
      className: "text-right text-[11.5px] tabular-nums font-medium text-stone-800"
    }, window.ctrlHuf(x.cost)));
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-1.5"
  }, "A t\xE9ny-\xF3rad\xEDj feladatonk\xE9nt: hozz\xE1rendelt dolgoz\xF3 \u2192 HR b\xE9r-kateg\xF3ria (terhelt) \u2192 m\u0171velett\xEDpus \u2192 \xE1tal\xE1ny. A k\xE9zi munka-napl\xF3 t\xE9telek ezen f\xF6l\xF6tt, a korrekci\xF3kn\xE1l."), /*#__PURE__*/React.createElement(CtrlSettingsSheet, {
    open: cfgOpen,
    onClose: () => setCfgOpen(false)
  }));
}

// ── Projekt-detail (utókalkuláció) ───────────────────────────────
function ProjectControllingDetail({
  r
}) {
  const sim = useSim();
  const CATS = window.CTRL_CATEGORIES || {};
  const [addOpen, setAddOpen] = useStateC(false);
  const tone = window.ctrlMarginTone(r.actualMarginPct);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, "Szerz\u0151d\xE9ses \xE9rt\xE9k"), /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 tabular-nums"
  }, window.ctrlHuf(r.contract))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, "Sz\xE1ml\xE1zva (t\xE9ny bev\xE9tel)"), /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 tabular-nums"
  }, window.ctrlHuf(r.invoiced), r.invoiced === 0 ? " " : ""), r.invoiced === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] text-amber-600"
  }, "m\xE9g nincs ki\xE1ll\xEDtott sz\xE1mla"))), /*#__PURE__*/React.createElement(MarginBar, {
    revenue: r.revenueActual,
    cost: r.actualTotal,
    tone: tone
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-2 mt-3 text-center"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Terv fedezet"), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-700"
  }, window.ctrlPct(r.planMarginPct))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "T\xE9ny fedezet"), /*#__PURE__*/React.createElement("div", {
    className: `text-[13px] font-semibold ${tone.fg}`
  }, window.ctrlPct(r.actualMarginPct))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "V\xE1rhat\xF3 (EAC)"), /*#__PURE__*/React.createElement("div", {
    className: `text-[13px] font-semibold ${window.ctrlMarginTone(r.eacMarginPct).fg}`
  }, window.ctrlPct(r.eacMarginPct))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "K\xF6lts\xE9g-elt\xE9r\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold"
  }, /*#__PURE__*/React.createElement(VarPill, {
    diff: r.costVariance,
    size: "sm"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, "Hozz\xE1adott \xE9rt\xE9k ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300"
  }, "(bev\xE9tel \u2212 k\xFCls\u0151 input)")), /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 tabular-nums"
  }, window.ctrlHuf(r.valueAdded), " ", /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-medium text-emerald-700"
  }, "\xB7 ", window.ctrlPct(r.valueAddedPct)))), /*#__PURE__*/React.createElement("div", {
    className: "text-right shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, "K\xFCls\u0151 input ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300"
  }, "(anyag\xB7b\xE9rmunka\xB7besz\xE1ll\xEDt\xF3\xB7fuvar)")), /*#__PURE__*/React.createElement("div", {
    className: "text-[13.5px] font-semibold text-stone-700 tabular-nums"
  }, window.ctrlHuf(r.externalActual), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-normal text-stone-400"
  }, " \xB7 ", window.ctrlPct(r.revenueActual ? r.externalActual / r.revenueActual : null)))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "K\xF6lts\xE9g-kateg\xF3ri\xE1k \u2014 terv vs. t\xE9ny"), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[1.4fr_1fr_1fr_1fr] px-3 py-2 bg-stone-50/60 text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, /*#__PURE__*/React.createElement("span", null, "Kateg\xF3ria"), /*#__PURE__*/React.createElement("span", {
    className: "text-right"
  }, "Terv"), /*#__PURE__*/React.createElement("span", {
    className: "text-right"
  }, "T\xE9ny"), /*#__PURE__*/React.createElement("span", {
    className: "text-right"
  }, "Elt\xE9r\xE9s")), r.cats.map(c => {
    const meta = CATS[c.key] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: c.key,
      className: "grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center px-3 py-2 border-t border-stone-100"
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1.5 text-[12px] text-stone-700 min-w-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-6 h-6 rounded-md grid place-items-center shrink-0",
      style: {
        background: (meta.accent || "#999") + "1a",
        color: meta.accent
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: meta.icon || "box",
      size: 12
    })), /*#__PURE__*/React.createElement("span", {
      className: "truncate"
    }, meta.label || c.key)), /*#__PURE__*/React.createElement("span", {
      className: "text-right text-[12px] tabular-nums text-stone-500"
    }, window.ctrlHuf(c.plan)), /*#__PURE__*/React.createElement("span", {
      className: "text-right text-[12px] tabular-nums text-stone-900 font-medium"
    }, window.ctrlHuf(c.actual)), /*#__PURE__*/React.createElement("span", {
      className: "text-right text-[11.5px] tabular-nums"
    }, /*#__PURE__*/React.createElement("span", {
      className: window.ctrlVarianceTone(c.diff).fg
    }, Math.abs(c.diff) < 1 ? "—" : (c.diff > 0 ? "+" : "−") + window.ctrlHuf(Math.abs(c.diff)).replace(" Ft", ""))));
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center px-3 py-2.5 border-t-2 border-stone-200 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "\xD6sszesen"), /*#__PURE__*/React.createElement("span", {
    className: "text-right text-[12.5px] tabular-nums font-semibold text-stone-600"
  }, window.ctrlHuf(r.planTotal)), /*#__PURE__*/React.createElement("span", {
    className: "text-right text-[12.5px] tabular-nums font-semibold text-stone-900"
  }, window.ctrlHuf(r.actualTotal)), /*#__PURE__*/React.createElement("span", {
    className: "text-right text-[12px] tabular-nums"
  }, /*#__PURE__*/React.createElement(VarPill, {
    diff: r.costVariance,
    size: "sm"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-1.5"
  }, "Az anyag a rakt\xE1ri kiv\xE9tb\u0151l, a b\xE9rmunka a B2B k\xE9zfog\xE1sokb\xF3l, a sz\xE1ll\xEDt\xE1s a fuvarokb\xF3l, a besz\xE1ll\xEDt\xF3i a bej\xF6v\u0151 sz\xE1ml\xE1kb\xF3l auto-aggreg\xE1l\xF3dik; a munka az id\u0151napl\xF3b\xF3l (\xF3rad\xEDj-b\xE1zis lent) + k\xE9zi t\xE9telek. Rezsi = ", r.cfg.overheadPct, "% a direkt k\xF6lts\xE9gen.")), /*#__PURE__*/React.createElement(CtrlLaborBreakdown, {
    r: r
  }), r.orders.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Rendel\xE9sek a projektben"), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 overflow-hidden"
  }, r.orders.map(o => /*#__PURE__*/React.createElement("div", {
    key: o.id,
    className: "flex items-center justify-between gap-2 px-3 py-2 border-b border-stone-100 last:border-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-mono text-stone-700"
  }, o.id), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 truncate"
  }, o.customer)), /*#__PURE__*/React.createElement("div", {
    className: "text-right shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] tabular-nums text-stone-700"
  }, "Sz\xE1ml\xE1zva ", window.ctrlHuf(o.invoiced)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "ktg-h\xE1nyad ~", window.ctrlHuf(o.costShare))))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "K\xE9zi korrekci\xF3k / p\xF3t-t\xE9telek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAddOpen(v => !v),
    className: "text-[11.5px] text-slate-600 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "\xDAj")), addOpen && /*#__PURE__*/React.createElement(CtrlAdjustForm, {
    projectId: r.project.id,
    onClose: () => setAddOpen(false)
  }), r.adjustments.length ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, r.adjustments.map(a => {
    const meta = CATS[a.category] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: a.id,
      className: "flex items-start gap-2 px-3 py-2 rounded-lg border border-stone-200"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-6 h-6 rounded-md grid place-items-center shrink-0 mt-0.5",
      style: {
        background: (meta.accent || "#999") + "1a",
        color: meta.accent
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: meta.icon || "box",
      size: 12
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-medium text-stone-800"
    }, a.label), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400"
    }, meta.label, a.note ? " · " + a.note : "")), /*#__PURE__*/React.createElement("div", {
      className: "text-right shrink-0"
    }, a.plan ? /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 tabular-nums"
    }, "terv ", window.ctrlHuf(a.plan)) : null, a.actual ? /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-800 font-medium tabular-nums"
    }, "t\xE9ny ", window.ctrlHuf(a.actual)) : null), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.removeCtrlAdjustment(a.id),
      className: "text-stone-300 hover:text-rose-500 shrink-0 mt-0.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    })));
  })) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 px-1"
  }, "Nincs k\xE9zi t\xE9tel \u2014 minden auto-aggreg\xE1lt.")));
}
function CtrlAdjustForm({
  projectId,
  onClose
}) {
  const CATS = window.CTRL_CATEGORIES || {};
  const ORDER = window.CTRL_CAT_ORDER || [];
  const [category, setCategory] = useStateC("munka");
  const [label, setLabel] = useStateC("");
  const [plan, setPlan] = useStateC("");
  const [actual, setActual] = useStateC("");
  const [note, setNote] = useStateC("");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-slate-500";
  const save = () => {
    if (!label.trim() || !Number(plan) && !Number(actual)) return;
    window.sim.addCtrlAdjustment({
      scope: "project",
      refId: projectId,
      category,
      label,
      plan: Number(plan) || 0,
      actual: Number(actual) || 0,
      note
    });
    onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50/60 p-3 mb-2 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("select", {
    value: category,
    onChange: e => setCategory(e.target.value),
    className: cls
  }, ORDER.map(c => /*#__PURE__*/React.createElement("option", {
    key: c,
    value: c
  }, (CATS[c] || {}).label || c))), /*#__PURE__*/React.createElement("input", {
    value: label,
    onChange: e => setLabel(e.target.value),
    placeholder: "Megnevez\xE9s",
    className: cls
  }), /*#__PURE__*/React.createElement("input", {
    value: plan,
    onChange: e => setPlan(e.target.value),
    type: "number",
    placeholder: "Terv (Ft)",
    className: cls
  }), /*#__PURE__*/React.createElement("input", {
    value: actual,
    onChange: e => setActual(e.target.value),
    type: "number",
    placeholder: "T\xE9ny (Ft)",
    className: cls
  })), /*#__PURE__*/React.createElement("input", {
    value: note,
    onChange: e => setNote(e.target.value),
    placeholder: "Megjegyz\xE9s (opcion\xE1lis)",
    className: cls
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: save,
    className: "h-8 px-3 rounded-lg bg-slate-700 text-white text-[12px] font-medium"
  }, "Hozz\xE1ad\xE1s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse")));
}
Object.assign(window, {
  ControllingDashboard,
  ControllingProjects,
  ControllingVariance,
  ProjectControllingDetail,
  CtrlDetailHost,
  CtrlLaborBreakdown,
  CtrlSettingsSheet,
  MarginBar,
  MarginPill,
  VarPill
});
})();
