/* AUTO-GENERATED from page-process-run.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-process-run.jsx — ÉLŐ FOLYAMAT-FUTÁS a projekten.
//   A folyamat nemcsak legenerálja a projektet, hanem VEZÉRLI is: mutatja, hol
//   tart, lépteti a frontvonalat, dönti az elágazásokat, triggereli a ciklusokat.
//   A lépés-státusz az epik-státuszból származik (egy igazságforrás).
//   Store: window.sim.runView / startRun / runnerCompleteStep /
//          runnerDecideBranch / runnerTriggerLoop / resetRun.
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateRun
} = React;
const RUN_TONE = {
  done: {
    ring: "ring-emerald-400",
    solid: "bg-emerald-500",
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    label: "Kész"
  },
  active: {
    ring: "ring-sky-400",
    solid: "bg-sky-500",
    bg: "bg-sky-50",
    fg: "text-sky-700",
    label: "Folyamatban"
  },
  pending: {
    ring: "ring-stone-200",
    solid: "bg-stone-300",
    bg: "bg-white",
    fg: "text-stone-400",
    label: "Várakozik"
  },
  skipped: {
    ring: "ring-stone-100",
    solid: "bg-stone-200",
    bg: "bg-stone-50",
    fg: "text-stone-300",
    label: "Kihagyva"
  },
  blocked: {
    ring: "ring-rose-400",
    solid: "bg-rose-500",
    bg: "bg-rose-50",
    fg: "text-rose-700",
    label: "Blokkolt"
  }
};
const rProcActor = k => (window.procActor || (x => ({
  l: x,
  icon: "user",
  tint: "bg-stone-100"
})))(k);
function ProcessRunner({
  projectId,
  onClose
}) {
  const s = useSim();
  const view = window.sim.runView(projectId);
  const me = window.sim.currentAccount();
  const canRun = me.actorType === "manufacturer" || me.type === "internal";
  if (!view) return null;
  const {
    project: p,
    proc,
    frontier,
    gate,
    complete,
    total,
    done,
    pct,
    run
  } = view;
  const started = run.started;
  const frontierSet = new Set(frontier);
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[62] flex flex-col bg-stone-100",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("header", {
    className: "shrink-0 bg-white border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[820px] mx-auto px-3 md:px-6 h-14 flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100 shrink-0",
    "aria-label": "Vissza"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 18,
    className: "rotate-180"
  })), /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg grid place-items-center text-white shrink-0",
    style: {
      background: proc.color || "#7c3aed"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "workflow",
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13.5px] font-semibold text-stone-900 truncate leading-tight"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 truncate"
  }, proc.name, " \xB7 \xE9l\u0151 fut\xE1s")), started && canRun && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm("Visszaállítod a futást az elejére? Minden lépés várakozóra kerül.")) window.sim.resetRun(projectId);
    },
    className: "h-8 px-2.5 rounded-lg text-[11.5px] font-medium text-stone-500 hover:bg-stone-100 inline-flex items-center gap-1.5 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 13,
    className: "-scale-x-100"
  }), "\xDAjra")), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-stone-100 bg-stone-50/60"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[820px] mx-auto px-3 md:px-6 py-2 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800"
  }, done, "/", total), " l\xE9p\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-emerald-500 rounded-full transition-all",
    style: {
      width: pct + "%"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-semibold text-stone-700 shrink-0"
  }, pct, "%")))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[820px] mx-auto px-3 md:px-6 py-5 md:py-7"
  }, !started ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 mx-auto rounded-xl grid place-items-center text-white mb-3",
    style: {
      background: proc.color || "#7c3aed"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "workflow",
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-800"
  }, "K\xE9szen \xE1ll a fut\xE1sra"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500 mt-1 max-w-sm mx-auto"
  }, "A \u201E", proc.name, "\u201D folyamat ", total, " l\xE9p\xE9sb\u0151l \xE1ll. Ind\xEDt\xE1skor az els\u0151 l\xE9p\xE9s akt\xEDvv\xE1 v\xE1lik; ahogy haladsz, a folyamat vez\xE9rli a k\xF6vetkez\u0151 l\xE9p\xE9seket, d\xF6nt\xE9seket \xE9s visszacsatol\xE1sokat."), canRun ? /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.startRun(projectId),
    className: "mt-4 h-10 px-5 rounded-lg text-white text-[13px] font-semibold inline-flex items-center gap-2",
    style: {
      background: proc.color || "#7c3aed"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "production",
    size: 15
  }), "Folyamat ind\xEDt\xE1sa") : /*#__PURE__*/React.createElement("div", {
    className: "mt-4 text-[11.5px] text-stone-400 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13
  }), "A fut\xE1st a gy\xE1rt\xF3 ind\xEDtja.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RunBanner, {
    view: view,
    canRun: canRun
  }), /*#__PURE__*/React.createElement("div", {
    className: "mt-5 flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-stone-800 text-white text-[11px] font-semibold"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-emerald-400"
  }), "Ind\xEDt\xE1s")), /*#__PURE__*/React.createElement(RunLane, {
    flow: proc.flow,
    view: view,
    project: p,
    frontierSet: frontierSet,
    canRun: canRun
  }), /*#__PURE__*/React.createElement(RConn, null), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[11px] font-semibold ${complete ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-500"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), complete ? "Folyamat kész" : "Kész")), (run.log || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-7 rounded-xl border border-stone-200 bg-white overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 border-b border-stone-100 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Esem\xE9nynapl\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "divide-y divide-stone-50 max-h-[220px] overflow-y-auto"
  }, (run.log || []).map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "px-3 py-2 flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${LOG_DOT[l.kind] || "bg-stone-300"}`
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-700 flex-1"
  }, l.text), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 font-mono shrink-0"
  }, (l.ts || "").split(" ")[1] || "")))))))));
}
const LOG_DOT = {
  start: "bg-sky-500",
  done: "bg-emerald-500",
  decision: "bg-violet-500",
  loop: "bg-amber-500",
  finish: "bg-emerald-600",
  info: "bg-stone-300"
};
function RunBanner({
  view,
  canRun
}) {
  const {
    project: p,
    proc,
    frontier,
    gate,
    complete
  } = view;
  if (complete) return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-9 h-9 rounded-lg bg-emerald-500 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 18
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-emerald-800"
  }, "A folyamat minden l\xE9p\xE9se elk\xE9sz\xFClt \uD83C\uDF89"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-emerald-600"
  }, "Nincs t\xF6bb akt\xEDv l\xE9p\xE9s.")));
  if (gate && gate.type === "branch") {
    let branch = null;
    const find = flow => (flow || []).forEach(seg => {
      if (seg.id === gate.id) branch = seg;
      if (seg.kind === "branch") seg.paths.forEach(pp => find(pp.flow));
      if (seg.kind === "parallel") seg.lanes.forEach(l => find(l.flow));
    });
    find(proc.flow);
    return /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-violet-50 border border-violet-200 px-4 py-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2.5 mb-2.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-9 h-9 rounded-lg bg-violet-600 text-white grid place-items-center shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "workflow",
      size: 17
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] font-semibold text-violet-900"
    }, "D\xF6nt\xE9s sz\xFCks\xE9ges"), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-violet-600"
    }, branch ? branch.prompt : "Válassz ágat a folytatáshoz"))), canRun ? /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-2"
    }, branch && branch.paths.map(pp => /*#__PURE__*/React.createElement("button", {
      key: pp.id,
      onClick: () => window.sim.runnerDecideBranch(p.id, gate.id, pp.id),
      className: "inline-flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg bg-white border border-violet-200 hover:border-violet-400 hover:bg-violet-50 transition text-left"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-semibold text-violet-800"
    }, pp.label), pp.cond && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-stone-400"
    }, pp.cond)))) : /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-violet-500 inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 12
    }), "A d\xF6nt\xE9st a gy\xE1rt\xF3 hozza meg."));
  }
  // active steps banner
  const names = frontier.map(id => {
    const e = window.sim._epicByStep(p, id);
    return e ? e.title : null;
  }).filter(Boolean);
  if (names.length) return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-sky-50 border border-sky-200 px-4 py-3 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-9 h-9 rounded-lg bg-sky-500 text-white grid place-items-center shrink-0 relative"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "production",
    size: 17
  }), /*#__PURE__*/React.createElement("span", {
    className: "absolute inset-0 rounded-lg ring-2 ring-sky-300 animate-ping opacity-40"
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-sky-900"
  }, names.length > 1 ? `${names.length} lépés fut párhuzamosan` : "Aktuális lépés"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-sky-600 truncate"
  }, names.join(" · "))));
  return null;
}
function RConn() {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-px h-5 bg-stone-300"
  }));
}
function RunLane({
  flow,
  view,
  project,
  frontierSet,
  canRun
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-stretch"
  }, (flow || []).map(seg => /*#__PURE__*/React.createElement(React.Fragment, {
    key: seg.id
  }, /*#__PURE__*/React.createElement(RConn, null), seg.kind === "step" && /*#__PURE__*/React.createElement(RunStepNode, {
    seg: seg,
    view: view,
    project: project,
    frontierSet: frontierSet,
    canRun: canRun
  }), seg.kind === "branch" && /*#__PURE__*/React.createElement(RunBranchNode, {
    seg: seg,
    view: view,
    project: project,
    frontierSet: frontierSet,
    canRun: canRun
  }), seg.kind === "parallel" && /*#__PURE__*/React.createElement(RunParallelNode, {
    seg: seg,
    view: view,
    project: project,
    frontierSet: frontierSet,
    canRun: canRun
  }), seg.kind === "loop" && /*#__PURE__*/React.createElement(RunLoopNode, {
    seg: seg,
    view: view,
    project: project,
    canRun: canRun
  }))));
}
function RunStepNode({
  seg,
  view,
  project,
  frontierSet,
  canRun
}) {
  const st = window.sim.runStepStatus(project, seg.id);
  const t = RUN_TONE[st] || RUN_TONE.pending;
  const am = rProcActor(seg.actor);
  const epic = window.sim._epicByStep(project, seg.id);
  const isFrontier = frontierSet.has(seg.id) && st === "active";
  const hs = epic && epic.handshakeId ? (window.sim.getState().handshakes || []).find(h => h.id === epic.handshakeId) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-full max-w-[440px] bg-white rounded-xl border p-3 transition ${isFrontier ? "border-sky-300 ring-2 ring-sky-100 shadow-sm" : st === "skipped" ? "border-stone-100 opacity-60" : "border-stone-200"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-9 h-9 rounded-full grid place-items-center shrink-0 ring-2 ${t.ring} ${st === "done" ? t.solid + " text-white" : seg.external ? "bg-teal-50 text-teal-600" : am.tint}`
  }, st === "done" ? /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16
  }) : /*#__PURE__*/React.createElement(Icon, {
    name: seg.external ? "external" : am.icon,
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: `text-[13px] font-semibold ${st === "skipped" ? "text-stone-400 line-through" : "text-stone-900"}`
  }, seg.name), seg.external && /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold uppercase tracking-wide"
  }, "k\xFCls\u0151")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-1 flex-wrap text-[10.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 px-1.5 h-5 rounded-full font-medium ${t.bg} ${t.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.solid}`
  }), t.label), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "\xB7 ", seg.external ? rProcActor(seg.partnerType).l : am.l), seg.phase && /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "\xB7 ", seg.phase)), seg.external && hs && /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 text-[10.5px] text-teal-700 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 11
  }), hs.status === "draft" ? "Átadás előkészítve (draft) — küldd el" : hs.status === "sent" ? `Átadva: ${hs.partnerName} — válaszra vár` : hs.status === "accepted" ? `${hs.partnerName} dolgozik rajta` : hs.status === "done" ? `${hs.partnerName} kész` : hs.partnerName))), isFrontier && canRun && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 pt-2.5 border-t border-stone-100 flex items-center justify-end gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.runnerCompleteStep(project.id, seg.id),
    className: "h-8 px-3.5 rounded-lg text-[12px] font-medium bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  }), "L\xE9p\xE9s k\xE9sz", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  })))));
}
function RunBranchNode({
  seg,
  view,
  project,
  frontierSet,
  canRun
}) {
  const dec = project.run && project.run.decisions || {};
  const chosen = dec[seg.id];
  const decided = !!chosen;
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-full max-w-[440px] rounded-xl px-3 py-2 flex items-center gap-2 border ${decided ? "bg-violet-50/60 border-violet-200" : "bg-violet-100 border-violet-300 ring-2 ring-violet-100"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg bg-violet-600 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "workflow",
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    className: "flex-1 text-[12.5px] font-semibold text-violet-900"
  }, seg.prompt), decided ? /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-violet-600 font-medium shrink-0"
  }, (seg.paths.find(p => p.id === chosen) || {}).label || "döntve") : /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-violet-500 font-medium uppercase shrink-0"
  }, "d\xF6nt\xE9s kell")), /*#__PURE__*/React.createElement("div", {
    className: "w-full flex items-stretch gap-3 mt-1 overflow-x-auto pb-1 px-0.5"
  }, seg.paths.map(p => {
    const isChosen = chosen === p.id;
    const faded = decided && !isChosen;
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      className: `flex-1 min-w-[208px] flex flex-col ${faded ? "opacity-50" : ""}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 mb-1 px-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: `text-[11px] font-semibold px-1.5 h-5 rounded inline-flex items-center ${isChosen ? "bg-violet-200 text-violet-800" : "bg-violet-100/60 text-violet-700"}`
    }, p.label, isChosen && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 11,
      className: "ml-1"
    }), faded && /*#__PURE__*/React.createElement("span", {
      className: "ml-1 text-stone-400"
    }, "\xB7 kihagyva"))), /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-violet-50/30 border border-violet-100 p-1"
    }, /*#__PURE__*/React.createElement(RunLane, {
      flow: p.flow,
      view: view,
      project: project,
      frontierSet: frontierSet,
      canRun: canRun
    })));
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 text-[9.5px] text-violet-500 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "workflow",
    size: 11
  }), "visszacsatlakozik"));
}
function RunParallelNode({
  seg,
  view,
  project,
  frontierSet,
  canRun
}) {
  const laneStats = seg.lanes.map(l => {
    const ids = window.sim._orderedStepIds(l.flow, project);
    const d = ids.filter(id => window.sim.runStepStatus(project, id) === "done").length;
    return {
      total: ids.length,
      done: d
    };
  });
  const lanesDone = laneStats.filter(x => x.total > 0 && x.done === x.total).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-[440px] bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg bg-sky-600 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    className: "flex-1 text-[12.5px] font-semibold text-sky-900"
  }, "P\xE1rhuzamos \xE1gak"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-sky-600 font-medium shrink-0"
  }, lanesDone, "/", seg.lanes.length, " s\xE1v k\xE9sz")), /*#__PURE__*/React.createElement("div", {
    className: "w-full flex items-stretch gap-3 mt-1 overflow-x-auto pb-1 px-0.5"
  }, seg.lanes.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: l.id,
    className: "flex-1 min-w-[208px] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-1 px-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-semibold px-1.5 h-5 rounded inline-flex items-center bg-sky-100/70 text-sky-800"
  }, l.label, /*#__PURE__*/React.createElement("span", {
    className: "ml-1 text-sky-500"
  }, laneStats[i].done, "/", laneStats[i].total))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-sky-50/30 border border-sky-100 p-1"
  }, /*#__PURE__*/React.createElement(RunLane, {
    flow: l.flow,
    view: view,
    project: project,
    frontierSet: frontierSet,
    canRun: canRun
  }))))), /*#__PURE__*/React.createElement("div", {
    className: `mt-1 text-[9.5px] font-medium inline-flex items-center gap-1 ${lanesDone === seg.lanes.length ? "text-emerald-600" : "text-sky-500"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: lanesDone === seg.lanes.length ? "check" : "layers",
    size: 11
  }), lanesDone === seg.lanes.length ? "szinkronizálva — mehet tovább" : "join: minden sáv kész kell legyen"));
}
function RunLoopNode({
  seg,
  view,
  project,
  canRun
}) {
  const targetDone = seg.targetId && window.sim.runStepStatus(project, seg.targetId) === "done";
  const cnt = project.run && project.run.loops && project.run.loops[seg.id] || 0;
  const targetEpic = seg.targetId ? window.sim._epicByStep(project, seg.targetId) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-[440px] bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 15,
    className: "-scale-x-100"
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-amber-900 flex items-center gap-1.5"
  }, seg.label, cnt > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 font-bold"
  }, cnt, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-amber-600"
  }, seg.cond ? `Ha: ${seg.cond} → ` : "Vissza → ", targetEpic ? targetEpic.title : "—")), canRun && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.runnerTriggerLoop(project.id, seg.id),
    disabled: !targetDone,
    title: targetDone ? "" : "A cél-lépésnek előbb késznek kell lennie",
    className: `h-8 px-3 rounded-lg text-[11.5px] font-medium inline-flex items-center gap-1.5 shrink-0 ${targetDone ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-stone-100 text-stone-400 cursor-not-allowed"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: targetDone ? "external" : "lock",
    size: 13,
    className: targetDone ? "-scale-x-100" : ""
  }), "Visszal\xE9ptet")));
}
Object.assign(window, {
  ProcessRunner
});
})();
