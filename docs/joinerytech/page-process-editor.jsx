// ──────────────────────────────────────────────────────────────────────────
// page-process-editor.jsx — Függőleges folyam-sáv szerkesztő.
//   Lépések fentről le, elágazás párhuzamos oszlopként, párhuzamos sávok
//   fork/join-nal, ciklus visszanyíllal. Külső lépés = belső↔külső átadás.
//   Helpers: window.* a page-process-model.jsx-ből (newStep, updateSeg…).
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStatePE } = React;

function ProcessEditor({ processId, onClose }) {
  const s = useSim();
  const proc = (s.processes || []).find((p) => p.id === processId);
  const [flow, setFlow] = useStatePE(() => proc ? JSON.parse(JSON.stringify(proc.flow || [])) : []);
  const [name, setName] = useStatePE(proc ? proc.name : "");
  const [color, setColor] = useStatePE(proc ? proc.color : "#7c3aed");
  const [desc, setDesc] = useStatePE(proc ? proc.desc || "" : "");
  const [editStep, setEditStep] = useStatePE(null);   // segment id being edited
  const [dirty, setDirty] = useStatePE(false);

  if (!proc) return null;
  const fac = (window.FACILITIES || []).find((f) => f.id === proc.facilityId);
  const mutate = (fn) => { setFlow((f) => fn(f)); setDirty(true); };
  const save = () => { window.sim.updateProcess(processId, { name: name.trim() || proc.name, color, desc, flow }); setDirty(false); };
  const close = () => { if (dirty) save(); onClose(); };

  const stepSeg = editStep ? findStepSeg(flow, editStep) : null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-stone-100" role="dialog" aria-modal="true">
      <header className="shrink-0 bg-white border-b border-stone-200">
        <div className="max-w-[1180px] mx-auto px-3 md:px-6 h-14 flex items-center gap-2.5">
          <button onClick={close} className="w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100 shrink-0" aria-label="Vissza"><Icon name="chevron" size={18} className="rotate-180" /></button>
          <span className="w-7 h-7 rounded-lg grid place-items-center text-white shrink-0" style={{ background: color }}><Icon name="workflow" size={15} /></span>
          <div className="min-w-0 flex-1">
            <input value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} className="w-full text-[14px] font-semibold text-stone-900 bg-transparent outline-none focus:bg-stone-50 rounded px-1 -ml-1" />
            <div className="text-[10.5px] text-stone-500 px-1 -ml-1 truncate">{fac ? fac.name : "—"}</div>
          </div>
          {dirty && <span className="text-[10.5px] text-amber-600 font-medium hidden sm:inline">mentetlen</span>}
          <button onClick={save} disabled={!dirty} className={`h-9 px-3.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-1.5 shrink-0 ${dirty ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-stone-100 text-stone-400"}`}><Icon name="check" size={14} />Mentés</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-3 md:px-6 py-5 md:py-7">
          {/* meta row */}
          <div className="mb-5 flex items-center gap-2 flex-wrap">
            {(window.PROC_PALETTE || []).map((c) => (
              <button key={c} onClick={() => { setColor(c); setDirty(true); }} className={`w-6 h-6 rounded-md border-2 transition hover:scale-110 ${color === c ? "border-stone-900 scale-110" : "border-transparent"}`} style={{ background: c }} />
            ))}
            <input value={desc} onChange={(e) => { setDesc(e.target.value); setDirty(true); }} placeholder="Rövid leírás…" className="flex-1 min-w-[160px] h-8 px-3 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-teal-400 bg-white" />
          </div>

          {/* START node */}
          <div className="flex flex-col items-center">
            <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-stone-800 text-white text-[11px] font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Indítás</span>
          </div>

          <FlowLane flow={flow} container={{ scope: "root" }} mutate={mutate} onEditStep={setEditStep} rootFlow={flow} />

          {/* END node */}
          <Connector />
          <div className="flex flex-col items-center">
            <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-stone-800 text-white text-[11px] font-semibold"><Icon name="check" size={12} />Kész</span>
          </div>
        </div>
      </div>

      {stepSeg && <StepEditorSheet step={stepSeg} onClose={() => setEditStep(null)}
        onSave={(patch) => { mutate((f) => updateSeg(f, stepSeg.id, (sg) => ({ ...sg, ...patch }))); setEditStep(null); }} />}
    </div>
  );
}

function findStepSeg(flow, id) {
  let found = null;
  (window.mapFlow || ((x) => x))(flow, (seg) => { if (seg.id === id) found = seg; return seg; });
  return found;
}

function Connector() {
  return <div className="flex justify-center"><div className="w-px h-5 bg-stone-300" /></div>;
}

// ── recursive lane ──────────────────────────────────────────────────────────
function FlowLane({ flow, container, mutate, onEditStep, rootFlow }) {
  return (
    <div className="flex flex-col items-stretch">
      {flow.map((seg, i) => (
        <React.Fragment key={seg.id}>
          <Connector />
          <InsertBar container={container} afterId={i === 0 ? null : flow[i - 1].id} mutate={mutate} atStart={i === 0} />
          <Connector />
          {seg.kind === "step" && <StepNode seg={seg} mutate={mutate} onEdit={() => onEditStep(seg.id)} />}
          {seg.kind === "branch" && <BranchNode seg={seg} mutate={mutate} onEditStep={onEditStep} rootFlow={rootFlow} />}
          {seg.kind === "parallel" && <ParallelNode seg={seg} mutate={mutate} onEditStep={onEditStep} rootFlow={rootFlow} />}
          {seg.kind === "loop" && <LoopNode seg={seg} mutate={mutate} rootFlow={rootFlow} />}
        </React.Fragment>
      ))}
      <Connector />
      <InsertBar container={container} afterId={flow.length ? flow[flow.length - 1].id : null} mutate={mutate} atEnd />
    </div>
  );
}

// the "+" affordance between nodes — adds step / branch / parallel / loop
function InsertBar({ container, afterId, mutate, atStart, atEnd }) {
  const [open, setOpen] = useStatePE(false);
  const add = (mk) => { mutate((f) => insertSeg(f, container, mk(), afterId)); setOpen(false); };
  const opts = [
    { k: "step", l: "Lépés", icon: "box", fn: () => newStep() },
    { k: "branch", l: "Elágazás", icon: "workflow", fn: () => newBranch() },
    { k: "parallel", l: "Párhuzamos", icon: "layers", fn: () => newParallel() },
    { k: "loop", l: "Ciklus", icon: "external", fn: () => newLoop() },
  ];
  return (
    <div className="flex justify-center relative">
      {open ? (
        <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-xl shadow-sm px-1.5 py-1 z-10">
          {opts.map((o) => (
            <button key={o.k} onClick={() => add(o.fn)} title={o.l} className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-medium text-stone-600 hover:bg-stone-100">
              <Icon name={o.icon} size={12} />{o.l}
            </button>
          ))}
          <button onClick={() => setOpen(false)} className="w-7 h-7 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"><Icon name="x" size={13} /></button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="w-6 h-6 grid place-items-center rounded-full bg-white border border-stone-300 text-stone-400 hover:text-teal-600 hover:border-teal-400 transition shadow-sm">
          <Icon name="plus" size={13} />
        </button>
      )}
    </div>
  );
}

// node controls (move/delete) shared row
function NodeTools({ seg, mutate, extra }) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {extra}
      <button onClick={(e) => { e.stopPropagation(); mutate((f) => moveSeg(f, seg.id, -1)); }} className="w-6 h-6 grid place-items-center rounded text-stone-300 hover:bg-stone-100 hover:text-stone-600"><Icon name="chevron" size={12} className="-rotate-90" /></button>
      <button onClick={(e) => { e.stopPropagation(); mutate((f) => moveSeg(f, seg.id, 1)); }} className="w-6 h-6 grid place-items-center rounded text-stone-300 hover:bg-stone-100 hover:text-stone-600"><Icon name="chevron" size={12} className="rotate-90" /></button>
      <button onClick={(e) => { e.stopPropagation(); mutate((f) => removeSeg(f, seg.id)); }} className="w-6 h-6 grid place-items-center rounded text-stone-300 hover:bg-rose-50 hover:text-rose-600"><Icon name="x" size={13} /></button>
    </div>
  );
}

function StepNode({ seg, mutate, onEdit }) {
  const am = procActor(seg.actor);
  const subN = (seg.subtasks || []).length;
  return (
    <div className="flex justify-center">
      <div onClick={onEdit} role="button" tabIndex={0} className={`group relative cursor-pointer text-left w-full max-w-[440px] bg-white rounded-xl border p-3 hover:shadow-md transition ${seg.external ? "border-teal-300 ring-1 ring-teal-100" : "border-stone-200 hover:border-stone-300"}`}>
        <div className="flex items-start gap-2.5">
          <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${seg.external ? "bg-teal-50 text-teal-600" : am.tint}`}>
            <Icon name={seg.external ? "external" : am.icon} size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[13px] font-semibold text-stone-900">{seg.name}</span>
              {seg.external && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold uppercase tracking-wide">külső átadás</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10.5px]">
              <span className={`inline-flex items-center gap-1 px-1.5 h-4 rounded ${seg.external ? "bg-teal-50 text-teal-700" : am.tint}`}>{seg.external ? procActor(seg.partnerType).l : am.l}</span>
              {seg.phase && <span className="text-stone-400">· {seg.phase}</span>}
              {seg.sla ? <span className="text-stone-400 font-mono">· {seg.sla}h</span> : null}
              {subN > 0 && <span className="text-stone-400">· {subN} részfeladat</span>}
            </div>
          </div>
          <NodeTools seg={seg} mutate={mutate} />
        </div>
      </div>
    </div>
  );
}

function BranchNode({ seg, mutate, onEditStep, rootFlow }) {
  return (
    <div className="flex flex-col items-center">
      {/* diamond / prompt */}
      <div className="w-full max-w-[440px] bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-violet-600 text-white grid place-items-center shrink-0"><Icon name="workflow" size={14} /></span>
        <input value={seg.prompt} onChange={(e) => mutate((f) => updateSeg(f, seg.id, (s) => ({ ...s, prompt: e.target.value })))}
          className="flex-1 min-w-0 h-7 px-1.5 rounded bg-transparent text-[12.5px] font-semibold text-violet-900 outline-none focus:bg-white" />
        <span className="text-[9.5px] text-violet-500 font-medium uppercase shrink-0">döntés</span>
        <NodeTools seg={seg} mutate={mutate} />
      </div>
      {/* parallel path columns */}
      <div className="w-full flex items-stretch gap-3 mt-1 overflow-x-auto pb-1 px-0.5">
        {seg.paths.map((p) => (
          <div key={p.id} className="flex-1 min-w-[208px] flex flex-col">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <input value={p.label} onChange={(e) => mutate((f) => updateSeg(f, seg.id, (s) => ({ ...s, paths: s.paths.map((x) => x.id === p.id ? { ...x, label: e.target.value } : x) })))}
                className="flex-1 min-w-0 h-6 px-1.5 rounded bg-violet-100/60 text-[11px] font-semibold text-violet-800 outline-none focus:bg-white" />
              {seg.paths.length > 1 && <button onClick={() => mutate((f) => removePath(f, seg.id, p.id))} className="w-5 h-5 grid place-items-center rounded text-violet-300 hover:text-rose-600"><Icon name="x" size={11} /></button>}
            </div>
            <input value={p.cond || ""} onChange={(e) => mutate((f) => updateSeg(f, seg.id, (s) => ({ ...s, paths: s.paths.map((x) => x.id === p.id ? { ...x, cond: e.target.value } : x) })))}
              placeholder="feltétel (pl. készlet < igény)" className="mb-1 h-6 px-1.5 rounded border border-dashed border-violet-200 text-[10px] text-stone-500 outline-none focus:border-violet-400 bg-white/60" />
            <div className="rounded-xl bg-violet-50/40 border border-violet-100 p-1">
              <FlowLane flow={p.flow} container={{ scope: "path", pathId: p.id }} mutate={mutate} onEditStep={onEditStep} rootFlow={rootFlow} />
            </div>
          </div>
        ))}
        <button onClick={() => mutate((f) => addPath(f, seg.id))} className="shrink-0 w-10 self-stretch grid place-items-center rounded-xl border border-dashed border-violet-200 text-violet-400 hover:text-violet-700 hover:border-violet-400" title="Ág hozzáadása"><Icon name="plus" size={15} /></button>
      </div>
      {/* merge */}
      <div className="mt-1 text-[9.5px] text-violet-500 font-medium inline-flex items-center gap-1"><Icon name="workflow" size={11} />utak visszacsatlakoznak</div>
    </div>
  );
}

function ParallelNode({ seg, mutate, onEditStep, rootFlow }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-[440px] bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-sky-600 text-white grid place-items-center shrink-0"><Icon name="layers" size={14} /></span>
        <span className="flex-1 text-[12.5px] font-semibold text-sky-900">Párhuzamos ágak <span className="text-sky-500 font-normal">· egyszerre futnak</span></span>
        <span className="text-[9.5px] text-sky-500 font-medium uppercase shrink-0">fork</span>
        <NodeTools seg={seg} mutate={mutate} />
      </div>
      <div className="w-full flex items-stretch gap-3 mt-1 overflow-x-auto pb-1 px-0.5">
        {seg.lanes.map((l) => (
          <div key={l.id} className="flex-1 min-w-[208px] flex flex-col">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <input value={l.label} onChange={(e) => mutate((f) => updateSeg(f, seg.id, (s) => ({ ...s, lanes: s.lanes.map((x) => x.id === l.id ? { ...x, label: e.target.value } : x) })))}
                className="flex-1 min-w-0 h-6 px-1.5 rounded bg-sky-100/60 text-[11px] font-semibold text-sky-800 outline-none focus:bg-white" />
              {seg.lanes.length > 1 && <button onClick={() => mutate((f) => removeLane(f, seg.id, l.id))} className="w-5 h-5 grid place-items-center rounded text-sky-300 hover:text-rose-600"><Icon name="x" size={11} /></button>}
            </div>
            <div className="rounded-xl bg-sky-50/40 border border-sky-100 p-1">
              <FlowLane flow={l.flow} container={{ scope: "lane", laneId: l.id }} mutate={mutate} onEditStep={onEditStep} rootFlow={rootFlow} />
            </div>
          </div>
        ))}
        <button onClick={() => mutate((f) => addLane(f, seg.id))} className="shrink-0 w-10 self-stretch grid place-items-center rounded-xl border border-dashed border-sky-200 text-sky-400 hover:text-sky-700 hover:border-sky-400" title="Sáv hozzáadása"><Icon name="plus" size={15} /></button>
      </div>
      <div className="mt-1 text-[9.5px] text-sky-500 font-medium inline-flex items-center gap-1"><Icon name="layers" size={11} />szinkronizál (join)</div>
    </div>
  );
}

function LoopNode({ seg, mutate, rootFlow }) {
  const steps = (window.allSteps || (() => []))(rootFlow);
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[440px] bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0"><Icon name="external" size={15} className="-scale-x-100" /></span>
        <div className="min-w-0 flex-1 space-y-1">
          <input value={seg.label} onChange={(e) => mutate((f) => updateSeg(f, seg.id, (s) => ({ ...s, label: e.target.value })))}
            className="w-full h-6 px-1.5 rounded bg-transparent text-[12px] font-semibold text-amber-900 outline-none focus:bg-white" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-amber-600 shrink-0">vissza ide:</span>
            <select value={seg.targetId || ""} onChange={(e) => mutate((f) => updateSeg(f, seg.id, (s) => ({ ...s, targetId: e.target.value })))}
              className="flex-1 min-w-0 h-6 px-1 rounded border border-amber-200 text-[10.5px] bg-white text-stone-700 outline-none">
              <option value="">— válassz lépést —</option>
              {steps.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
          </div>
          <input value={seg.cond || ""} onChange={(e) => mutate((f) => updateSeg(f, seg.id, (s) => ({ ...s, cond: e.target.value })))}
            placeholder="feltétel (pl. QC = bukott)" className="w-full h-6 px-1.5 rounded border border-dashed border-amber-200 text-[10px] text-stone-500 outline-none focus:border-amber-400 bg-white/60" />
        </div>
        <NodeTools seg={seg} mutate={mutate} />
      </div>
    </div>
  );
}

// ── step detail editor ──────────────────────────────────────────────────────
function StepEditorSheet({ step, onSave, onClose }) {
  const [form, setForm] = useStatePE(() => JSON.parse(JSON.stringify(step)));
  const [taskInput, setTaskInput] = useStatePE("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const tasks = form.subtasks || [];
  const addTask = () => { if (taskInput.trim()) { set("subtasks", [...tasks, taskInput.trim()]); setTaskInput(""); } };
  const PHASES = ["Ajánlat", "Felmérés", "Gyártás", "Beépítés", "Átadás", "Bejelentés", "Diagnózis", "Javítás"];

  return (
    <SlideOver open={true} onClose={onClose} title="Lépés szerkesztése" subtitle={form.name} width={480}
      footer={<><GhostBtn onClick={onClose}>Mégse</GhostBtn><PrimaryBtn icon="check" onClick={() => onSave(form)}>Kész</PrimaryBtn></>}>
      <div className="px-5 py-4 space-y-4">
        <div><SxLabel>Lépés neve</SxLabel><SxInput value={form.name} onChange={(v) => set("name", v)} /></div>

        <div>
          <SxLabel>Fázis (mérföldkő)</SxLabel>
          <input list="proc-phases" value={form.phase || ""} onChange={(e) => set("phase", e.target.value)} placeholder="pl. Gyártás"
            className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500" />
          <datalist id="proc-phases">{PHASES.map((p) => <option key={p} value={p} />)}</datalist>
          <div className="text-[10px] text-stone-400 mt-1">Az azonos fázisú lépések egy mérföldkőbe kerülnek a projekten.</div>
        </div>

        {/* internal vs external handoff */}
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          <button onClick={() => set("external", !form.external)} className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-stone-50">
            <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-stone-800"><Icon name="external" size={14} className={form.external ? "text-teal-600" : "text-stone-400"} />Külső átadás (kézfogás)</span>
            <span className={`h-6 w-11 rounded-full relative transition shrink-0 ${form.external ? "bg-teal-600" : "bg-stone-200"}`}><span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.external ? "left-[22px]" : "left-0.5"}`} /></span>
          </button>
          <div className="px-3 py-3 border-t border-stone-100 bg-stone-50/40">
            <SxLabel>{form.external ? "Külső partner típusa" : "Felelős (belső)"}</SxLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {(window.PROC_ACTORS || []).filter((o) => form.external ? (o === "supplier" || o === "installer" || o === "designer") : true).map((o) => {
                const m = procActor(o); const key = form.external ? "partnerType" : "actor"; const sel = form[key] === o;
                return (
                  <button key={o} onClick={() => set(key, o)} className={`inline-flex items-center gap-1 h-9 px-1.5 rounded-lg border text-[11px] font-medium transition ${sel ? "border-teal-500 bg-teal-50 text-teal-700" : "border-stone-200 text-stone-600 hover:bg-white"}`}>
                    <Icon name={m.icon} size={12} />{m.l}
                  </button>
                );
              })}
            </div>
            {form.external && <div className="text-[10px] text-stone-400 mt-2">A projektre húzáskor ez a lépés egy <span className="font-medium text-teal-700">draft kézfogást</span> készít — átnézhető és szerkeszthető, mielőtt elküldöd a partnernek.</div>}
          </div>
        </div>

        <div>
          <SxLabel>SLA (óra, opcionális)</SxLabel>
          <input type="number" min={0} value={form.sla || 0} onChange={(e) => set("sla", Number(e.target.value))}
            className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500" />
        </div>

        <div>
          <SxLabel>Részfeladatok ({tasks.length})</SxLabel>
          <div className="rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
            {tasks.map((tk, ti) => (
              <div key={ti} className="flex items-center gap-2 px-3 py-2">
                <span className="w-4 h-4 rounded border border-stone-300 shrink-0" />
                <input value={typeof tk === "string" ? tk : tk.title} onChange={(e) => set("subtasks", tasks.map((x, i) => i === ti ? e.target.value : x))}
                  className="flex-1 min-w-0 h-7 px-1.5 rounded bg-transparent text-[12.5px] text-stone-800 outline-none focus:bg-stone-50" />
                <button onClick={() => set("subtasks", tasks.filter((_, i) => i !== ti))} className="w-6 h-6 grid place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"><Icon name="x" size={13} /></button>
              </div>
            ))}
            {tasks.length === 0 && <div className="px-3 py-2.5 text-[11.5px] text-stone-400">Nincs részfeladat.</div>}
            <div className="px-3 py-2 flex items-center gap-2 bg-stone-50/50">
              <input value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="Új részfeladat…" onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                className="flex-1 h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none bg-white focus:border-teal-400" />
              <button onClick={addTask} className="w-8 h-8 grid place-items-center rounded-lg border border-stone-300 text-stone-600 hover:bg-white"><Icon name="plus" size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </SlideOver>
  );
}

Object.assign(window, { ProcessEditor, FlowLane, StepNode, BranchNode, ParallelNode, LoopNode, StepEditorSheet });
