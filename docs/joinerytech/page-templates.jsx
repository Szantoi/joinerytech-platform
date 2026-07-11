// ──────────────────────────────────────────────────────────────────────────
// page-templates.jsx — Beállítások → Munkafolyamat: SABLONOK.
//
//   A munkafolyamat-fül három nézete:
//     1. Folyamat-lánc (StageChain) — meglévő, gyártási stage-ek.
//     2. Projekt sablonok — teljes mérföldkő → (almérföldkő) → epik → task váz,
//        amit új projekt létrehozásakor egy kattintással fel lehet építeni.
//     3. Epik sablonok — újrafelhasználható epik (felelős actor + tasklista),
//        amit a board-on "sablonból" lehet beszúrni.
//
//   Store: window.sim.templates {project:[], epic:[]} + addTemplate /
//   updateTemplate / removeTemplate / applyProjectTemplate / addEpicFromTemplate.
//   Színek + actor-meta: window.EPIC_TONE / window.ACTOR_META (board fájlból).
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateTpl } = React;

const TPL_PALETTE = ["#7c3aed", "#0d9488", "#0ea5e9", "#f59e0b", "#ec4899", "#6366f1", "#10b981", "#f97316"];
const OWNER_OPTIONS = ["manufacturer", "supplier", "installer", "designer", "dealer", "client"];
const ownerMeta = (k) => (window.ACTOR_META || {})[k] || { l: k, icon: "user", tint: "bg-stone-100 text-stone-600" };

// ── Wrapper: a Munkafolyamat fül szegmens-vezérlővel ────────────────────────
function WorkflowSettings({ t }) {
  const [seg, setSeg] = useStateTpl("processes");
  const segs = [
    { k: "processes", label: "Folyamatok", icon: "workflow" },
    { k: "outsource", label: "Bérmunka", icon: "external" },
    { k: "project", label: "Projekt sablonok", icon: "layers" },
    { k: "epic",    label: "Epik sablonok", icon: "box" },
    { k: "chain",   label: "Klasszikus lánc", icon: "external" },
  ];
  return (
    <div className="space-y-4">
      <div className="inline-flex p-1 rounded-xl bg-stone-100 border border-stone-200/70 overflow-x-auto max-w-full">
        {segs.map((sg) => (
          <button key={sg.k} onClick={() => setSeg(sg.k)}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition shrink-0 ${seg === sg.k ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>
            <Icon name={sg.icon} size={14} />{sg.label}
          </button>
        ))}
      </div>
      {seg === "processes" && (window.ProcessesPanel ? <window.ProcessesPanel /> : null)}
      {seg === "outsource" && (window.OutsourceSettings ? <window.OutsourceSettings /> : null)}
      {seg === "chain"   && <StageChainEditor t={t} />}
      {seg === "project" && <ProjectTemplatesPanel />}
      {seg === "epic"    && <EpicTemplatesPanel />}
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────
function tplProjectStats(tpl) {
  let ms = (tpl.milestones || []).length, ep = 0, tk = 0, subs = 0;
  (tpl.milestones || []).forEach((m) => {
    (m.epics || []).forEach((e) => { ep++; tk += (e.tasks || []).length; });
    (m.subMilestones || []).forEach((sm) => { subs++; (sm.epics || []).forEach((e) => { ep++; tk += (e.tasks || []).length; }); });
  });
  return { ms, ep, tk, subs };
}

// ════════════════════════════════════════════════════════════════════════════
// PROJEKT SABLONOK
// ════════════════════════════════════════════════════════════════════════════
function ProjectTemplatesPanel() {
  const s = useSim();
  const list = (s.templates && s.templates.project) || [];
  const [editId, setEditId] = useStateTpl(null);
  const editing = editId ? list.find((x) => x.id === editId) : null;

  const create = () => { const id = window.sim.addTemplate("project", { name: "Új projekt sablon", milestones: [{ name: "Új fázis", epics: [] }] }); setEditId(id); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12.5px] font-semibold text-stone-900">Projekt sablonok</div>
          <div className="text-[11px] text-stone-500">Fázis → epik → task vázak. Új projekt létrehozásakor egy kattintással felépíthetők.</div>
        </div>
        <PrimaryBtn icon="plus" onClick={create}>Új sablon</PrimaryBtn>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((tpl) => {
          const st = tplProjectStats(tpl);
          return (
            <button key={tpl.id} onClick={() => setEditId(tpl.id)}
              className="text-left bg-white border border-stone-200/80 hover:border-stone-300 hover:shadow-sm rounded-xl p-4 transition flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <span className="w-9 h-9 rounded-lg grid place-items-center text-white shrink-0" style={{ background: tpl.color || "#7c3aed" }}><Icon name="layers" size={17} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-stone-900 leading-tight">{tpl.name}</div>
                  {tpl.desc && <div className="text-[11px] text-stone-500 mt-0.5 leading-snug line-clamp-2">{tpl.desc}</div>}
                </div>
              </div>
              {/* phase chips */}
              <div className="flex items-center gap-1 flex-wrap">
                {(tpl.milestones || []).map((m, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-1.5 h-5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-medium">
                    {m.name}{(m.subMilestones || []).length > 0 && <span className="text-stone-400">·{m.subMilestones.length}</span>}
                  </span>
                ))}
              </div>
              <div className="mt-auto flex items-center gap-3 text-[10.5px] text-stone-400 pt-1 border-t border-stone-100">
                <span>{st.ms} fázis</span><span>·</span><span>{st.ep} epik</span><span>·</span><span>{st.tk} task</span>
              </div>
            </button>
          );
        })}
        <button onClick={create} className="rounded-xl border border-dashed border-stone-300 p-4 min-h-[120px] grid place-items-center text-stone-400 hover:text-violet-700 hover:border-violet-300 transition">
          <span className="inline-flex flex-col items-center gap-1.5 text-[12px] font-medium"><Icon name="plus" size={18} />Üres sablon</span>
        </button>
      </div>

      {editing && <ProjectTemplateEditor tpl={editing} onClose={() => setEditId(null)} />}
    </div>
  );
}

function ProjectTemplateEditor({ tpl, onClose }) {
  const [form, setForm] = useStateTpl(() => JSON.parse(JSON.stringify(tpl)));
  const save = () => { window.sim.updateTemplate("project", tpl.id, form); onClose(); };
  const del = () => { if (confirm("Biztosan törlöd ezt a sablont?")) { window.sim.removeTemplate("project", tpl.id); onClose(); } };

  // immutable milestone mutators
  const setMs = (mi, patch) => setForm((f) => ({ ...f, milestones: f.milestones.map((m, i) => i === mi ? { ...m, ...patch } : m) }));
  const addMs = () => setForm((f) => ({ ...f, milestones: [...f.milestones, { name: "Új fázis", epics: [] }] }));
  const rmMs = (mi) => setForm((f) => ({ ...f, milestones: f.milestones.filter((_, i) => i !== mi) }));
  const moveMs = (mi, dir) => setForm((f) => { const n = [...f.milestones]; const j = mi + dir; if (j < 0 || j >= n.length) return f; [n[mi], n[j]] = [n[j], n[mi]]; return { ...f, milestones: n }; });

  // epic mutators (sub = sub-milestone index or null)
  const epicsOf = (m, sub) => sub === null ? (m.epics || []) : (m.subMilestones[sub].epics || []);
  const setEpics = (mi, sub, next) => setForm((f) => ({ ...f, milestones: f.milestones.map((m, i) => {
    if (i !== mi) return m;
    if (sub === null) return { ...m, epics: typeof next === "function" ? next(m.epics || []) : next };
    return { ...m, subMilestones: m.subMilestones.map((sm, si) => si === sub ? { ...sm, epics: typeof next === "function" ? next(sm.epics || []) : next } : sm) };
  }) }));
  const addEpic = (mi, sub) => setEpics(mi, sub, (es) => [...es, { title: "Új epik", ownerType: "manufacturer", tasks: [] }]);
  const setEpic = (mi, sub, ei, patch) => setEpics(mi, sub, (es) => es.map((e, i) => i === ei ? { ...e, ...patch } : e));
  const rmEpic = (mi, sub, ei) => setEpics(mi, sub, (es) => es.filter((_, i) => i !== ei));

  // sub-milestone
  const addSub = (mi) => setForm((f) => ({ ...f, milestones: f.milestones.map((m, i) => i === mi ? { ...m, subMilestones: [...(m.subMilestones || []), { name: "Új almérföldkő", epics: [] }], epics: m.epics || [] } : m) }));
  const setSub = (mi, si, patch) => setForm((f) => ({ ...f, milestones: f.milestones.map((m, i) => i === mi ? { ...m, subMilestones: m.subMilestones.map((sm, j) => j === si ? { ...sm, ...patch } : sm) } : m) }));
  const rmSub = (mi, si) => setForm((f) => ({ ...f, milestones: f.milestones.map((m, i) => i === mi ? { ...m, subMilestones: m.subMilestones.filter((_, j) => j !== si) } : m) }));

  const st = tplProjectStats(form);

  return (
    <SlideOver open={true} onClose={onClose} title="Projekt sablon" subtitle={form.name} width={620}
      footer={<>
        <button onClick={del} className="h-9 px-3 rounded-lg text-[12px] font-medium text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1.5 mr-auto"><Icon name="x" size={14} />Törlés</button>
        <GhostBtn onClick={onClose}>Mégse</GhostBtn>
        <PrimaryBtn icon="check" onClick={save}>Mentés</PrimaryBtn>
      </>}>
      <div className="px-5 py-4 space-y-5">
        {/* header fields */}
        <div className="space-y-3">
          <div><SxLabel>Sablon neve</SxLabel><SxInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} /></div>
          <div><SxLabel>Leírás</SxLabel>
            <textarea value={form.desc || ""} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} rows={2} placeholder="Mire való ez a sablon?"
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 resize-none" />
          </div>
          <div><SxLabel>Szín</SxLabel>
            <div className="flex gap-2 flex-wrap">
              {TPL_PALETTE.map((c) => (
                <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-lg border-2 transition hover:scale-110 ${form.color === c ? "border-stone-900 scale-110" : "border-transparent"}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10.5px] text-stone-400 pb-1 border-b border-stone-100">
          <span className="uppercase tracking-wide font-medium text-stone-500">Fázisok</span>
          <span>· {st.ms} fázis · {st.ep} epik · {st.tk} task</span>
        </div>

        {/* milestones */}
        <div className="space-y-3">
          {form.milestones.map((m, mi) => {
            const hasSub = (m.subMilestones || []).length > 0;
            return (
              <div key={mi} className="rounded-xl border border-stone-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-stone-50/70 border-b border-stone-100">
                  <span className="w-5 h-5 rounded-full grid place-items-center text-white text-[10px] font-bold shrink-0" style={{ background: form.color }}>{mi + 1}</span>
                  <input value={m.name} onChange={(e) => setMs(mi, { name: e.target.value })}
                    className="flex-1 min-w-0 h-7 px-2 rounded-md bg-transparent text-[12.5px] font-semibold text-stone-900 outline-none focus:bg-white focus:ring-1 focus:ring-teal-400" />
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => moveMs(mi, -1)} disabled={mi === 0} className="w-6 h-6 grid place-items-center rounded text-stone-400 hover:bg-stone-200 disabled:opacity-30"><Icon name="chevron" size={13} className="-rotate-90" /></button>
                    <button onClick={() => moveMs(mi, 1)} disabled={mi === form.milestones.length - 1} className="w-6 h-6 grid place-items-center rounded text-stone-400 hover:bg-stone-200 disabled:opacity-30"><Icon name="chevron" size={13} className="rotate-90" /></button>
                    <button onClick={() => rmMs(mi)} className="w-6 h-6 grid place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="x" size={13} /></button>
                  </div>
                </div>

                <div className="p-2.5 space-y-2.5">
                  {hasSub ? (
                    <>
                      {m.subMilestones.map((sm, si) => (
                        <div key={si} className="rounded-lg border border-stone-200/80 bg-stone-50/30">
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                            <Icon name="layers" size={12} className="text-stone-400 shrink-0" />
                            <input value={sm.name} onChange={(e) => setSub(mi, si, { name: e.target.value })}
                              className="flex-1 min-w-0 h-6 px-1.5 rounded bg-transparent text-[11.5px] font-semibold text-stone-600 uppercase tracking-wide outline-none focus:bg-white" />
                            <button onClick={() => rmSub(mi, si)} className="w-5 h-5 grid place-items-center rounded text-stone-400 hover:text-rose-600"><Icon name="x" size={12} /></button>
                          </div>
                          <div className="px-2.5 pb-2.5 space-y-1.5">
                            {(sm.epics || []).map((e, ei) => <TplEpicRow key={ei} epic={e} onChange={(p) => setEpic(mi, si, ei, p)} onRemove={() => rmEpic(mi, si, ei)} />)}
                            <AddEpicBtn onClick={() => addEpic(mi, si)} />
                          </div>
                        </div>
                      ))}
                      <button onClick={() => addSub(mi)} className="text-[11px] text-stone-400 hover:text-teal-700 font-medium inline-flex items-center gap-1"><Icon name="plus" size={12} />Almérföldkő</button>
                    </>
                  ) : (
                    <>
                      {(m.epics || []).map((e, ei) => <TplEpicRow key={ei} epic={e} onChange={(p) => setEpic(mi, null, ei, p)} onRemove={() => rmEpic(mi, null, ei)} />)}
                      <div className="flex items-center gap-3">
                        <AddEpicBtn onClick={() => addEpic(mi, null)} />
                        <button onClick={() => addSub(mi)} className="text-[11px] text-stone-400 hover:text-teal-700 font-medium inline-flex items-center gap-1"><Icon name="layers" size={12} />Almérföldkő-bontás</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <button onClick={addMs} className="w-full rounded-xl border border-dashed border-stone-300 py-2.5 text-[12px] font-medium text-stone-500 hover:text-teal-700 hover:border-teal-300 inline-flex items-center justify-center gap-1.5 transition"><Icon name="plus" size={14} />Fázis hozzáadása</button>
        </div>
      </div>
    </SlideOver>
  );
}

function AddEpicBtn({ onClick }) {
  return <button onClick={onClick} className="text-[11px] text-stone-400 hover:text-teal-700 font-medium inline-flex items-center gap-1"><Icon name="plus" size={12} />Epik</button>;
}

// single epic row inside a project-template editor
function TplEpicRow({ epic, onChange, onRemove }) {
  const [taskInput, setTaskInput] = useStateTpl("");
  const om = ownerMeta(epic.ownerType);
  const tasks = epic.tasks || [];
  const addTask = () => { if (taskInput.trim()) { onChange({ tasks: [...tasks, taskInput.trim()] }); setTaskInput(""); } };
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <input value={epic.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Epik megnevezése"
          className="flex-1 min-w-0 h-7 px-2 rounded-md border border-transparent hover:border-stone-200 focus:border-teal-400 text-[12px] font-medium text-stone-800 outline-none" />
        <select value={epic.ownerType} onChange={(e) => onChange({ ownerType: e.target.value })}
          className="h-7 px-1.5 rounded-md border border-stone-200 text-[11px] bg-white text-stone-600 outline-none focus:border-teal-400 shrink-0">
          {OWNER_OPTIONS.map((o) => <option key={o} value={o}>{ownerMeta(o).l}</option>)}
        </select>
        <button onClick={onRemove} className="w-6 h-6 grid place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"><Icon name="x" size={12} /></button>
      </div>
      {/* tasks */}
      <div className="flex items-center gap-1 flex-wrap pl-0.5">
        {tasks.map((tk, ti) => (
          <span key={ti} className="inline-flex items-center gap-1 pl-2 pr-1 h-5 rounded-full bg-stone-100 text-stone-600 text-[10.5px]">
            {typeof tk === "string" ? tk : tk.title}
            <button onClick={() => onChange({ tasks: tasks.filter((_, i) => i !== ti) })} className="w-3.5 h-3.5 grid place-items-center rounded-full hover:bg-stone-300 text-stone-400 hover:text-stone-700"><Icon name="x" size={10} /></button>
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <input value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="+ task" onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
            className="h-5 w-20 px-1.5 rounded-full border border-dashed border-stone-300 text-[10.5px] outline-none focus:border-teal-400 focus:w-28 transition-all" />
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EPIK SABLONOK
// ════════════════════════════════════════════════════════════════════════════
function EpicTemplatesPanel() {
  const s = useSim();
  const list = (s.templates && s.templates.epic) || [];
  const [editId, setEditId] = useStateTpl(null);
  const editing = editId ? list.find((x) => x.id === editId) : null;
  const create = () => { const id = window.sim.addTemplate("epic", { name: "Új epik sablon", ownerType: "manufacturer", tasks: [] }); setEditId(id); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12.5px] font-semibold text-stone-900">Epik sablonok</div>
          <div className="text-[11px] text-stone-500">Újrafelhasználható munkacsomagok. A board-on „sablonból" gyorsan beszúrhatók.</div>
        </div>
        <PrimaryBtn icon="plus" onClick={create}>Új sablon</PrimaryBtn>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((tpl) => {
          const om = ownerMeta(tpl.ownerType);
          return (
            <button key={tpl.id} onClick={() => setEditId(tpl.id)}
              className="text-left bg-white border border-stone-200/80 hover:border-stone-300 hover:shadow-sm rounded-xl p-4 transition flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${om.tint}`}><Icon name={om.icon} size={17} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-stone-900 leading-tight">{tpl.name}</div>
                  <span className={`inline-flex items-center gap-1 px-1.5 h-4 mt-1 rounded text-[9.5px] font-medium ${om.tint}`}>{om.l}</span>
                </div>
              </div>
              {tpl.desc && <div className="text-[11px] text-stone-500 leading-snug line-clamp-2">{tpl.desc}</div>}
              <div className="mt-auto flex items-center gap-1 flex-wrap pt-1 border-t border-stone-100">
                {(tpl.tasks || []).slice(0, 4).map((tk, i) => <span key={i} className="inline-flex px-1.5 h-5 items-center rounded-md bg-stone-100 text-stone-600 text-[10px]">{typeof tk === "string" ? tk : tk.title}</span>)}
                {(tpl.tasks || []).length > 4 && <span className="text-[10px] text-stone-400">+{tpl.tasks.length - 4}</span>}
                {(tpl.tasks || []).length === 0 && <span className="text-[10.5px] text-stone-400">nincs task</span>}
              </div>
            </button>
          );
        })}
        <button onClick={create} className="rounded-xl border border-dashed border-stone-300 p-4 min-h-[110px] grid place-items-center text-stone-400 hover:text-teal-700 hover:border-teal-300 transition">
          <span className="inline-flex flex-col items-center gap-1.5 text-[12px] font-medium"><Icon name="plus" size={18} />Üres sablon</span>
        </button>
      </div>

      {editing && <EpicTemplateEditor tpl={editing} onClose={() => setEditId(null)} />}
    </div>
  );
}

function EpicTemplateEditor({ tpl, onClose }) {
  const [form, setForm] = useStateTpl(() => JSON.parse(JSON.stringify(tpl)));
  const [taskInput, setTaskInput] = useStateTpl("");
  const save = () => { window.sim.updateTemplate("epic", tpl.id, form); onClose(); };
  const del = () => { if (confirm("Biztosan törlöd ezt a sablont?")) { window.sim.removeTemplate("epic", tpl.id); onClose(); } };
  const tasks = form.tasks || [];
  const addTask = () => { if (taskInput.trim()) { setForm((f) => ({ ...f, tasks: [...(f.tasks || []), taskInput.trim()] })); setTaskInput(""); } };
  const om = ownerMeta(form.ownerType);

  return (
    <SlideOver open={true} onClose={onClose} title="Epik sablon" subtitle={form.name} width={460}
      footer={<>
        <button onClick={del} className="h-9 px-3 rounded-lg text-[12px] font-medium text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1.5 mr-auto"><Icon name="x" size={14} />Törlés</button>
        <GhostBtn onClick={onClose}>Mégse</GhostBtn>
        <PrimaryBtn icon="check" onClick={save}>Mentés</PrimaryBtn>
      </>}>
      <div className="px-5 py-4 space-y-4">
        <div><SxLabel>Epik neve</SxLabel><SxInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} /></div>
        <div><SxLabel>Leírás</SxLabel>
          <textarea value={form.desc || ""} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} rows={2} placeholder="Mire való?"
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 resize-none" />
        </div>
        <div>
          <SxLabel>Felelős (actor-típus)</SxLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {OWNER_OPTIONS.map((o) => {
              const m = ownerMeta(o); const sel = form.ownerType === o;
              return (
                <button key={o} onClick={() => setForm((f) => ({ ...f, ownerType: o }))}
                  className={`inline-flex items-center gap-1.5 h-9 px-2 rounded-lg border text-[11.5px] font-medium transition ${sel ? "border-teal-500 bg-teal-50 text-teal-700" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}>
                  <Icon name={m.icon} size={13} />{m.l}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <SxLabel>Taskök ({tasks.length})</SxLabel>
          <div className="rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
            {tasks.map((tk, ti) => (
              <div key={ti} className="flex items-center gap-2 px-3 py-2">
                <span className="w-4 h-4 rounded border border-stone-300 shrink-0" />
                <input value={typeof tk === "string" ? tk : tk.title} onChange={(e) => setForm((f) => ({ ...f, tasks: f.tasks.map((x, i) => i === ti ? e.target.value : x) }))}
                  className="flex-1 min-w-0 h-7 px-1.5 rounded-md bg-transparent text-[12.5px] text-stone-800 outline-none focus:bg-stone-50" />
                <button onClick={() => setForm((f) => ({ ...f, tasks: f.tasks.filter((_, i) => i !== ti) }))} className="w-6 h-6 grid place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"><Icon name="x" size={13} /></button>
              </div>
            ))}
            {tasks.length === 0 && <div className="px-3 py-2.5 text-[11.5px] text-stone-400">Nincs task — adj hozzá lentebb.</div>}
            <div className="px-3 py-2 flex items-center gap-2 bg-stone-50/50">
              <input value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="Új task…" onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                className="flex-1 h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none bg-white focus:border-teal-400" />
              <button onClick={addTask} className="w-8 h-8 grid place-items-center rounded-lg border border-stone-300 text-stone-600 hover:bg-white"><Icon name="plus" size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </SlideOver>
  );
}

Object.assign(window, { WorkflowSettings, ProjectTemplatesPanel, EpicTemplatesPanel });
