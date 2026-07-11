/* AUTO-GENERATED from page-manufacturing-projects.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-manufacturing-projects.jsx — Gyártás → „Gyártási projektek" fül.
//
//   A megrendelt, házon belül gyártott tételekből generált SAJÁT GYÁRTÁS
//   alprojektek itt kezelhetők — mint önálló projektek: ugyanaz a mérföldkő →
//   epik → task motor (ProjectBoard) és élő folyamat-futás (ProcessRunner).
//   A lista a kind === "manufacturing" projekteket mutatja, a fő projekthez
//   linkelve. Belépő: a fő projekt nézetéből „Saját gyártás alprojekt".
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateMP
} = React;
const MP_STATUS_TONE = {
  draft: {
    l: "Vázlat",
    bg: "bg-stone-100",
    fg: "text-stone-600",
    dot: "bg-stone-400"
  },
  active: {
    l: "Gyártásban",
    bg: "bg-teal-50",
    fg: "text-teal-700",
    dot: "bg-teal-500"
  },
  install: {
    l: "Készre kész",
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    dot: "bg-emerald-500"
  },
  done: {
    l: "Lezárva",
    bg: "bg-stone-100",
    fg: "text-stone-500",
    dot: "bg-stone-400"
  },
  on_hold: {
    l: "Felfüggesztve",
    bg: "bg-amber-50",
    fg: "text-amber-700",
    dot: "bg-amber-500"
  }
};
const mpHuf = n => (n || 0).toLocaleString("hu-HU") + " Ft";
function ManufacturingProjectsPage() {
  const s = useSim();
  const [boardId, setBoardId] = useStateMP(null);
  const [runId, setRunId] = useStateMP(null);
  const [prepId, setPrepId] = useStateMP(null);
  const list = (s.projects || []).filter(p => p.kind === "manufacturing");
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-end justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[18px] md:text-[20px] font-semibold text-stone-900 tracking-tight"
  }, "Gy\xE1rt\xE1si projektek"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500"
  }, "Saj\xE1t gy\xE1rt\xE1s alprojektek \u2014 m\u0171hely-folyamat, l\xE9p\xE9sr\u0151l l\xE9p\xE9sre")), /*#__PURE__*/React.createElement("span", {
    className: "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-teal-50 text-teal-700 text-[12px] font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "factory",
    size: 13
  }), list.length, " alprojekt")), list.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 mx-auto rounded-xl bg-teal-50 grid place-items-center text-teal-600 mb-3"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "factory",
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-700"
  }, "M\xE9g nincs gy\xE1rt\xE1si alprojekt"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500 mt-1 max-w-md mx-auto leading-relaxed"
  }, "Egy megrendelt projekt n\xE9zet\xE9b\u0151l a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, "\u201ESaj\xE1t gy\xE1rt\xE1s alprojekt\""), " gombbal hozhatsz l\xE9tre egyet a h\xE1zon bel\xFCl gy\xE1rtott t\xE9telekb\u0151l. A l\xE9trej\xF6tt alprojekt itt kezelhet\u0151 \u2014 ugyanazzal a folyamat-motorral, mint b\xE1rmely projekt.")) : /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-3"
  }, list.map(p => /*#__PURE__*/React.createElement(MfgCard, {
    key: p.id,
    p: p,
    onBoard: () => setBoardId(p.id),
    onRun: () => setRunId(p.id),
    onPrep: () => setPrepId(p.id)
  }))), boardId && window.ProjectBoard && /*#__PURE__*/React.createElement(window.ProjectBoard, {
    projectId: boardId,
    onClose: () => setBoardId(null)
  }), runId && window.ProcessRunner && /*#__PURE__*/React.createElement(window.ProcessRunner, {
    projectId: runId,
    onClose: () => setRunId(null)
  }), prepId && window.MfgPrepWorkspace && (() => {
    const pr = list.find(x => x.id === prepId);
    return pr ? /*#__PURE__*/React.createElement(window.MfgPrepWorkspace, {
      project: pr,
      onClose: () => setPrepId(null)
    }) : null;
  })());
}
function MfgCard({
  p,
  onBoard,
  onRun,
  onPrep
}) {
  const tone = MP_STATUS_TONE[p.status] || MP_STATUS_TONE.active;
  const es = window.projectEpicSummary ? window.projectEpicSummary(p) : {
    total: 0,
    done: 0,
    pct: 0
  };
  const total = (p.items || []).reduce((n, i) => n + (i.value || 0), 0);
  const view = window.sim.runView ? window.sim.runView(p.id) : null;
  const started = view && view.run && view.run.started;
  const runPct = view ? view.pct : es.pct;
  // current active step names (frontier)
  let activeName = null;
  if (view && started && !view.complete) {
    const names = (view.frontier || []).map(id => {
      const e = window.sim._epicByStep(p, id);
      return e ? e.title : null;
    }).filter(Boolean);
    activeName = names.length ? names.length > 1 ? `${names.length} lépés fut` : names[0] : null;
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4 hover:shadow-md hover:border-stone-300 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 leading-tight truncate"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-0.5 flex items-center gap-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", null, p.customer), p.parentName && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-stone-400"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 11
  }), p.parentName)))), /*#__PURE__*/React.createElement("span", {
    className: `shrink-0 inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${tone.bg} ${tone.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
  }), tone.l)), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11.5px] mb-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 text-teal-700 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "workflow",
    size: 12
  }), p.processName || "Saját gyártás"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 tabular-nums"
  }, es.done, "/", es.total, " l\xE9p\xE9s", started ? ` · ${runPct}%` : "")), /*#__PURE__*/React.createElement("div", {
    className: "h-1.5 rounded-full bg-stone-100 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-emerald-500 rounded-full transition-all",
    style: {
      width: (started ? runPct : es.pct) + "%"
    }
  })), activeName && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 inline-flex items-center gap-1.5 text-[11px] text-sky-700 bg-sky-50 px-2 py-1 rounded-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-sky-500"
  }), "Aktu\xE1lis: ", activeName), view && started && view.complete && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 inline-flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), "Gy\xE1rt\xE1s k\xE9sz"), !started && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 inline-flex items-center gap-1.5 text-[11px] text-stone-500 bg-stone-50 px-2 py-1 rounded-lg"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "production",
    size: 12
  }), "Folyamat ind\xEDthat\xF3")), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, (p.items || []).length, " t\xE9tel"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800 tabular-nums"
  }, mpHuf(total))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onPrep,
    className: "w-full h-9 rounded-lg bg-teal-600 text-white text-[12px] font-semibold hover:bg-teal-700 inline-flex items-center justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cpu",
    size: 14
  }), "Gy\xE1rt\xE1s-el\u0151k\xE9sz\xEDt\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onRun,
    className: "flex-1 h-9 rounded-lg border border-stone-200 bg-white text-stone-700 text-[12px] font-medium hover:border-teal-300 hover:text-teal-700 inline-flex items-center justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "production",
    size: 14
  }), "Folyamat"), /*#__PURE__*/React.createElement("button", {
    onClick: onBoard,
    className: "flex-1 h-9 rounded-lg border border-stone-200 bg-white text-stone-700 text-[12px] font-medium hover:border-teal-300 hover:text-teal-700 inline-flex items-center justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 14
  }), "T\xE1bla"))));
}
Object.assign(window, {
  ManufacturingProjectsPage
});
})();
