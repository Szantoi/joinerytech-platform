/* AUTO-GENERATED from page-process-editor.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-process-editor.jsx — Függőleges folyam-sáv szerkesztő.
//   Lépések fentről le, elágazás párhuzamos oszlopként, párhuzamos sávok
//   fork/join-nal, ciklus visszanyíllal. Külső lépés = belső↔külső átadás.
//   Helpers: window.* a page-process-model.jsx-ből (newStep, updateSeg…).
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStatePE
} = React;
function ProcessEditor({
  processId,
  onClose
}) {
  const s = useSim();
  const proc = (s.processes || []).find(p => p.id === processId);
  const [flow, setFlow] = useStatePE(() => proc ? JSON.parse(JSON.stringify(proc.flow || [])) : []);
  const [name, setName] = useStatePE(proc ? proc.name : "");
  const [color, setColor] = useStatePE(proc ? proc.color : "#7c3aed");
  const [desc, setDesc] = useStatePE(proc ? proc.desc || "" : "");
  const [editStep, setEditStep] = useStatePE(null); // segment id being edited
  const [dirty, setDirty] = useStatePE(false);
  if (!proc) return null;
  const fac = (window.FACILITIES || []).find(f => f.id === proc.facilityId);
  const mutate = fn => {
    setFlow(f => fn(f));
    setDirty(true);
  };
  const save = () => {
    window.sim.updateProcess(processId, {
      name: name.trim() || proc.name,
      color,
      desc,
      flow
    });
    setDirty(false);
  };
  const close = () => {
    if (dirty) save();
    onClose();
  };
  const stepSeg = editStep ? findStepSeg(flow, editStep) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[60] flex flex-col bg-stone-100",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("header", {
    className: "shrink-0 bg-white border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1180px] mx-auto px-3 md:px-6 h-14 flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: close,
    className: "w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100 shrink-0",
    "aria-label": "Vissza"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 18,
    className: "rotate-180"
  })), /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg grid place-items-center text-white shrink-0",
    style: {
      background: color
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "workflow",
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => {
      setName(e.target.value);
      setDirty(true);
    },
    className: "w-full text-[14px] font-semibold text-stone-900 bg-transparent outline-none focus:bg-stone-50 rounded px-1 -ml-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 px-1 -ml-1 truncate"
  }, fac ? fac.name : "—")), dirty && /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-amber-600 font-medium hidden sm:inline"
  }, "mentetlen"), /*#__PURE__*/React.createElement("button", {
    onClick: save,
    disabled: !dirty,
    className: `h-9 px-3.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-1.5 shrink-0 ${dirty ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-stone-100 text-stone-400"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14
  }), "Ment\xE9s"))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[760px] mx-auto px-3 md:px-6 py-5 md:py-7"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-5 flex items-center gap-2 flex-wrap"
  }, (window.PROC_PALETTE || []).map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => {
      setColor(c);
      setDirty(true);
    },
    className: `w-6 h-6 rounded-md border-2 transition hover:scale-110 ${color === c ? "border-stone-900 scale-110" : "border-transparent"}`,
    style: {
      background: c
    }
  })), /*#__PURE__*/React.createElement("input", {
    value: desc,
    onChange: e => {
      setDesc(e.target.value);
      setDirty(true);
    },
    placeholder: "R\xF6vid le\xEDr\xE1s\u2026",
    className: "flex-1 min-w-[160px] h-8 px-3 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-teal-400 bg-white"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-stone-800 text-white text-[11px] font-semibold"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-emerald-400"
  }), "Ind\xEDt\xE1s")), /*#__PURE__*/React.createElement(FlowLane, {
    flow: flow,
    container: {
      scope: "root"
    },
    mutate: mutate,
    onEditStep: setEditStep,
    rootFlow: flow
  }), /*#__PURE__*/React.createElement(Connector, null), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-stone-800 text-white text-[11px] font-semibold"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), "K\xE9sz")))), stepSeg && /*#__PURE__*/React.createElement(StepEditorSheet, {
    step: stepSeg,
    onClose: () => setEditStep(null),
    onSave: patch => {
      mutate(f => updateSeg(f, stepSeg.id, sg => ({
        ...sg,
        ...patch
      })));
      setEditStep(null);
    }
  }));
}
function findStepSeg(flow, id) {
  let found = null;
  (window.mapFlow || (x => x))(flow, seg => {
    if (seg.id === id) found = seg;
    return seg;
  });
  return found;
}
function Connector() {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-px h-5 bg-stone-300"
  }));
}

// ── recursive lane ──────────────────────────────────────────────────────────
function FlowLane({
  flow,
  container,
  mutate,
  onEditStep,
  rootFlow
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-stretch"
  }, flow.map((seg, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: seg.id
  }, /*#__PURE__*/React.createElement(Connector, null), /*#__PURE__*/React.createElement(InsertBar, {
    container: container,
    afterId: i === 0 ? null : flow[i - 1].id,
    mutate: mutate,
    atStart: i === 0
  }), /*#__PURE__*/React.createElement(Connector, null), seg.kind === "step" && /*#__PURE__*/React.createElement(StepNode, {
    seg: seg,
    mutate: mutate,
    onEdit: () => onEditStep(seg.id)
  }), seg.kind === "branch" && /*#__PURE__*/React.createElement(BranchNode, {
    seg: seg,
    mutate: mutate,
    onEditStep: onEditStep,
    rootFlow: rootFlow
  }), seg.kind === "parallel" && /*#__PURE__*/React.createElement(ParallelNode, {
    seg: seg,
    mutate: mutate,
    onEditStep: onEditStep,
    rootFlow: rootFlow
  }), seg.kind === "loop" && /*#__PURE__*/React.createElement(LoopNode, {
    seg: seg,
    mutate: mutate,
    rootFlow: rootFlow
  }))), /*#__PURE__*/React.createElement(Connector, null), /*#__PURE__*/React.createElement(InsertBar, {
    container: container,
    afterId: flow.length ? flow[flow.length - 1].id : null,
    mutate: mutate,
    atEnd: true
  }));
}

// the "+" affordance between nodes — adds step / branch / parallel / loop
function InsertBar({
  container,
  afterId,
  mutate,
  atStart,
  atEnd
}) {
  const [open, setOpen] = useStatePE(false);
  const add = mk => {
    mutate(f => insertSeg(f, container, mk(), afterId));
    setOpen(false);
  };
  const opts = [{
    k: "step",
    l: "Lépés",
    icon: "box",
    fn: () => newStep()
  }, {
    k: "branch",
    l: "Elágazás",
    icon: "workflow",
    fn: () => newBranch()
  }, {
    k: "parallel",
    l: "Párhuzamos",
    icon: "layers",
    fn: () => newParallel()
  }, {
    k: "loop",
    l: "Ciklus",
    icon: "external",
    fn: () => newLoop()
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center relative"
  }, open ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-white border border-stone-200 rounded-xl shadow-sm px-1.5 py-1 z-10"
  }, opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.k,
    onClick: () => add(o.fn),
    title: o.l,
    className: "inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-medium text-stone-600 hover:bg-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: o.icon,
    size: 12
  }), o.l)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(false),
    className: "w-7 h-7 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  }))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(true),
    className: "w-6 h-6 grid place-items-center rounded-full bg-white border border-stone-300 text-stone-400 hover:text-teal-600 hover:border-teal-400 transition shadow-sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  })));
}

// node controls (move/delete) shared row
function NodeTools({
  seg,
  mutate,
  extra
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-0.5 shrink-0"
  }, extra, /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      mutate(f => moveSeg(f, seg.id, -1));
    },
    className: "w-6 h-6 grid place-items-center rounded text-stone-300 hover:bg-stone-100 hover:text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 12,
    className: "-rotate-90"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      mutate(f => moveSeg(f, seg.id, 1));
    },
    className: "w-6 h-6 grid place-items-center rounded text-stone-300 hover:bg-stone-100 hover:text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 12,
    className: "rotate-90"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      mutate(f => removeSeg(f, seg.id));
    },
    className: "w-6 h-6 grid place-items-center rounded text-stone-300 hover:bg-rose-50 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  })));
}
function StepNode({
  seg,
  mutate,
  onEdit
}) {
  const am = procActor(seg.actor);
  const subN = (seg.subtasks || []).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onEdit,
    role: "button",
    tabIndex: 0,
    className: `group relative cursor-pointer text-left w-full max-w-[440px] bg-white rounded-xl border p-3 hover:shadow-md transition ${seg.external ? "border-teal-300 ring-1 ring-teal-100" : "border-stone-200 hover:border-stone-300"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-9 h-9 rounded-lg grid place-items-center shrink-0 ${seg.external ? "bg-teal-50 text-teal-600" : am.tint}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: seg.external ? "external" : am.icon,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-stone-900"
  }, seg.name), seg.external && /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold uppercase tracking-wide"
  }, "k\xFCls\u0151 \xE1tad\xE1s")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-1 flex-wrap text-[10.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 px-1.5 h-4 rounded ${seg.external ? "bg-teal-50 text-teal-700" : am.tint}`
  }, seg.external ? procActor(seg.partnerType).l : am.l), seg.phase && /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "\xB7 ", seg.phase), seg.sla ? /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-mono"
  }, "\xB7 ", seg.sla, "h") : null, subN > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "\xB7 ", subN, " r\xE9szfeladat"))), /*#__PURE__*/React.createElement(NodeTools, {
    seg: seg,
    mutate: mutate
  }))));
}
function BranchNode({
  seg,
  mutate,
  onEditStep,
  rootFlow
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-[440px] bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg bg-violet-600 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "workflow",
    size: 14
  })), /*#__PURE__*/React.createElement("input", {
    value: seg.prompt,
    onChange: e => mutate(f => updateSeg(f, seg.id, s => ({
      ...s,
      prompt: e.target.value
    }))),
    className: "flex-1 min-w-0 h-7 px-1.5 rounded bg-transparent text-[12.5px] font-semibold text-violet-900 outline-none focus:bg-white"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-violet-500 font-medium uppercase shrink-0"
  }, "d\xF6nt\xE9s"), /*#__PURE__*/React.createElement(NodeTools, {
    seg: seg,
    mutate: mutate
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-full flex items-stretch gap-3 mt-1 overflow-x-auto pb-1 px-0.5"
  }, seg.paths.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "flex-1 min-w-[208px] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-1 px-1"
  }, /*#__PURE__*/React.createElement("input", {
    value: p.label,
    onChange: e => mutate(f => updateSeg(f, seg.id, s => ({
      ...s,
      paths: s.paths.map(x => x.id === p.id ? {
        ...x,
        label: e.target.value
      } : x)
    }))),
    className: "flex-1 min-w-0 h-6 px-1.5 rounded bg-violet-100/60 text-[11px] font-semibold text-violet-800 outline-none focus:bg-white"
  }), seg.paths.length > 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => mutate(f => removePath(f, seg.id, p.id)),
    className: "w-5 h-5 grid place-items-center rounded text-violet-300 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 11
  }))), /*#__PURE__*/React.createElement("input", {
    value: p.cond || "",
    onChange: e => mutate(f => updateSeg(f, seg.id, s => ({
      ...s,
      paths: s.paths.map(x => x.id === p.id ? {
        ...x,
        cond: e.target.value
      } : x)
    }))),
    placeholder: "felt\xE9tel (pl. k\xE9szlet < ig\xE9ny)",
    className: "mb-1 h-6 px-1.5 rounded border border-dashed border-violet-200 text-[10px] text-stone-500 outline-none focus:border-violet-400 bg-white/60"
  }), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-violet-50/40 border border-violet-100 p-1"
  }, /*#__PURE__*/React.createElement(FlowLane, {
    flow: p.flow,
    container: {
      scope: "path",
      pathId: p.id
    },
    mutate: mutate,
    onEditStep: onEditStep,
    rootFlow: rootFlow
  })))), /*#__PURE__*/React.createElement("button", {
    onClick: () => mutate(f => addPath(f, seg.id)),
    className: "shrink-0 w-10 self-stretch grid place-items-center rounded-xl border border-dashed border-violet-200 text-violet-400 hover:text-violet-700 hover:border-violet-400",
    title: "\xC1g hozz\xE1ad\xE1sa"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 text-[9.5px] text-violet-500 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "workflow",
    size: 11
  }), "utak visszacsatlakoznak"));
}
function ParallelNode({
  seg,
  mutate,
  onEditStep,
  rootFlow
}) {
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
  }, "P\xE1rhuzamos \xE1gak ", /*#__PURE__*/React.createElement("span", {
    className: "text-sky-500 font-normal"
  }, "\xB7 egyszerre futnak")), /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-sky-500 font-medium uppercase shrink-0"
  }, "fork"), /*#__PURE__*/React.createElement(NodeTools, {
    seg: seg,
    mutate: mutate
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-full flex items-stretch gap-3 mt-1 overflow-x-auto pb-1 px-0.5"
  }, seg.lanes.map(l => /*#__PURE__*/React.createElement("div", {
    key: l.id,
    className: "flex-1 min-w-[208px] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-1 px-1"
  }, /*#__PURE__*/React.createElement("input", {
    value: l.label,
    onChange: e => mutate(f => updateSeg(f, seg.id, s => ({
      ...s,
      lanes: s.lanes.map(x => x.id === l.id ? {
        ...x,
        label: e.target.value
      } : x)
    }))),
    className: "flex-1 min-w-0 h-6 px-1.5 rounded bg-sky-100/60 text-[11px] font-semibold text-sky-800 outline-none focus:bg-white"
  }), seg.lanes.length > 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => mutate(f => removeLane(f, seg.id, l.id)),
    className: "w-5 h-5 grid place-items-center rounded text-sky-300 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 11
  }))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-sky-50/40 border border-sky-100 p-1"
  }, /*#__PURE__*/React.createElement(FlowLane, {
    flow: l.flow,
    container: {
      scope: "lane",
      laneId: l.id
    },
    mutate: mutate,
    onEditStep: onEditStep,
    rootFlow: rootFlow
  })))), /*#__PURE__*/React.createElement("button", {
    onClick: () => mutate(f => addLane(f, seg.id)),
    className: "shrink-0 w-10 self-stretch grid place-items-center rounded-xl border border-dashed border-sky-200 text-sky-400 hover:text-sky-700 hover:border-sky-400",
    title: "S\xE1v hozz\xE1ad\xE1sa"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 text-[9.5px] text-sky-500 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 11
  }), "szinkroniz\xE1l (join)"));
}
function LoopNode({
  seg,
  mutate,
  rootFlow
}) {
  const steps = (window.allSteps || (() => []))(rootFlow);
  return /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-[440px] bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 15,
    className: "-scale-x-100"
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1 space-y-1"
  }, /*#__PURE__*/React.createElement("input", {
    value: seg.label,
    onChange: e => mutate(f => updateSeg(f, seg.id, s => ({
      ...s,
      label: e.target.value
    }))),
    className: "w-full h-6 px-1.5 rounded bg-transparent text-[12px] font-semibold text-amber-900 outline-none focus:bg-white"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-amber-600 shrink-0"
  }, "vissza ide:"), /*#__PURE__*/React.createElement("select", {
    value: seg.targetId || "",
    onChange: e => mutate(f => updateSeg(f, seg.id, s => ({
      ...s,
      targetId: e.target.value
    }))),
    className: "flex-1 min-w-0 h-6 px-1 rounded border border-amber-200 text-[10.5px] bg-white text-stone-700 outline-none"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 v\xE1lassz l\xE9p\xE9st \u2014"), steps.map(st => /*#__PURE__*/React.createElement("option", {
    key: st.id,
    value: st.id
  }, st.name)))), /*#__PURE__*/React.createElement("input", {
    value: seg.cond || "",
    onChange: e => mutate(f => updateSeg(f, seg.id, s => ({
      ...s,
      cond: e.target.value
    }))),
    placeholder: "felt\xE9tel (pl. QC = bukott)",
    className: "w-full h-6 px-1.5 rounded border border-dashed border-amber-200 text-[10px] text-stone-500 outline-none focus:border-amber-400 bg-white/60"
  })), /*#__PURE__*/React.createElement(NodeTools, {
    seg: seg,
    mutate: mutate
  })));
}

// ── step detail editor ──────────────────────────────────────────────────────
function StepEditorSheet({
  step,
  onSave,
  onClose
}) {
  const [form, setForm] = useStatePE(() => JSON.parse(JSON.stringify(step)));
  const [taskInput, setTaskInput] = useStatePE("");
  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const tasks = form.subtasks || [];
  const addTask = () => {
    if (taskInput.trim()) {
      set("subtasks", [...tasks, taskInput.trim()]);
      setTaskInput("");
    }
  };
  const PHASES = ["Ajánlat", "Felmérés", "Gyártás", "Beépítés", "Átadás", "Bejelentés", "Diagnózis", "Javítás"];
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: true,
    onClose: onClose,
    title: "L\xE9p\xE9s szerkeszt\xE9se",
    subtitle: form.name,
    width: 480,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: onClose
    }, "M\xE9gse"), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "check",
      onClick: () => onSave(form)
    }, "K\xE9sz"))
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "L\xE9p\xE9s neve"), /*#__PURE__*/React.createElement(SxInput, {
    value: form.name,
    onChange: v => set("name", v)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "F\xE1zis (m\xE9rf\xF6ldk\u0151)"), /*#__PURE__*/React.createElement("input", {
    list: "proc-phases",
    value: form.phase || "",
    onChange: e => set("phase", e.target.value),
    placeholder: "pl. Gy\xE1rt\xE1s",
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500"
  }), /*#__PURE__*/React.createElement("datalist", {
    id: "proc-phases"
  }, PHASES.map(p => /*#__PURE__*/React.createElement("option", {
    key: p,
    value: p
  }))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-1"
  }, "Az azonos f\xE1zis\xFA l\xE9p\xE9sek egy m\xE9rf\xF6ldk\u0151be ker\xFClnek a projekten.")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => set("external", !form.external),
    className: "w-full px-3 py-2.5 flex items-center justify-between hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-2 text-[12.5px] font-medium text-stone-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 14,
    className: form.external ? "text-teal-600" : "text-stone-400"
  }), "K\xFCls\u0151 \xE1tad\xE1s (k\xE9zfog\xE1s)"), /*#__PURE__*/React.createElement("span", {
    className: `h-6 w-11 rounded-full relative transition shrink-0 ${form.external ? "bg-teal-600" : "bg-stone-200"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.external ? "left-[22px]" : "left-0.5"}`
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-3 border-t border-stone-100 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement(SxLabel, null, form.external ? "Külső partner típusa" : "Felelős (belső)"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-1.5"
  }, (window.PROC_ACTORS || []).filter(o => form.external ? o === "supplier" || o === "installer" || o === "designer" : true).map(o => {
    const m = procActor(o);
    const key = form.external ? "partnerType" : "actor";
    const sel = form[key] === o;
    return /*#__PURE__*/React.createElement("button", {
      key: o,
      onClick: () => set(key, o),
      className: `inline-flex items-center gap-1 h-9 px-1.5 rounded-lg border text-[11px] font-medium transition ${sel ? "border-teal-500 bg-teal-50 text-teal-700" : "border-stone-200 text-stone-600 hover:bg-white"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 12
    }), m.l);
  })), form.external && /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-2"
  }, "A projektre h\xFAz\xE1skor ez a l\xE9p\xE9s egy ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-teal-700"
  }, "draft k\xE9zfog\xE1st"), " k\xE9sz\xEDt \u2014 \xE1tn\xE9zhet\u0151 \xE9s szerkeszthet\u0151, miel\u0151tt elk\xFCld\xF6d a partnernek."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "SLA (\xF3ra, opcion\xE1lis)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: 0,
    value: form.sla || 0,
    onChange: e => set("sla", Number(e.target.value)),
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "R\xE9szfeladatok (", tasks.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden"
  }, tasks.map((tk, ti) => /*#__PURE__*/React.createElement("div", {
    key: ti,
    className: "flex items-center gap-2 px-3 py-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-4 h-4 rounded border border-stone-300 shrink-0"
  }), /*#__PURE__*/React.createElement("input", {
    value: typeof tk === "string" ? tk : tk.title,
    onChange: e => set("subtasks", tasks.map((x, i) => i === ti ? e.target.value : x)),
    className: "flex-1 min-w-0 h-7 px-1.5 rounded bg-transparent text-[12.5px] text-stone-800 outline-none focus:bg-stone-50"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => set("subtasks", tasks.filter((_, i) => i !== ti)),
    className: "w-6 h-6 grid place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  })))), tasks.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2.5 text-[11.5px] text-stone-400"
  }, "Nincs r\xE9szfeladat."), /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 flex items-center gap-2 bg-stone-50/50"
  }, /*#__PURE__*/React.createElement("input", {
    value: taskInput,
    onChange: e => setTaskInput(e.target.value),
    placeholder: "\xDAj r\xE9szfeladat\u2026",
    onKeyDown: e => {
      if (e.key === "Enter") addTask();
    },
    className: "flex-1 h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none bg-white focus:border-teal-400"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addTask,
    className: "w-8 h-8 grid place-items-center rounded-lg border border-stone-300 text-stone-600 hover:bg-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  })))))));
}
Object.assign(window, {
  ProcessEditor,
  FlowLane,
  StepNode,
  BranchNode,
  ParallelNode,
  LoopNode,
  StepEditorSheet
});
})();
