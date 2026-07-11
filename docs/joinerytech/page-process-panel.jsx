// ──────────────────────────────────────────────────────────────────────────
// page-process-panel.jsx — Beállítások → Munkafolyamat → Folyamatok.
//   Kirendeltség-választó + az adott telephely saját folyamatai. Megnyitja a
//   függőleges folyam-sáv szerkesztőt (window.ProcessEditor).
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStatePP } = React;

function ProcessesPanel() {
  const s = useSim();
  const facilities = window.FACILITIES || [];
  const [facId, setFacId] = useStatePP(facilities[0] ? facilities[0].id : null);
  const [editId, setEditId] = useStatePP(null);
  const list = (s.processes || []).filter((p) => p.facilityId === facId);

  const create = () => { const id = window.sim.addProcess(facId, {}); setEditId(id); };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[12.5px] font-semibold text-stone-900">Folyamatok</div>
          <div className="text-[11px] text-stone-500 max-w-md">Kirendeltségenként saját munkafolyamatok. Lépések, elágazások, párhuzamos ágak, ciklusok és belső↔külső átadások. Egy folyamat ráhúzva a projektre legenerálja a mérföldkő → epik → task hierarchiát.</div>
        </div>
        <PrimaryBtn icon="plus" onClick={create}>Új folyamat</PrimaryBtn>
      </div>

      {/* facility selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {facilities.map((f) => {
          const cnt = (s.processes || []).filter((p) => p.facilityId === f.id).length;
          const sel = facId === f.id;
          return (
            <button key={f.id} onClick={() => setFacId(f.id)}
              className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg text-[12px] font-medium shrink-0 border transition ${sel ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`}>
              <Icon name="factory" size={14} className={sel ? "text-teal-300" : "text-stone-400"} />
              <span className="max-w-[180px] truncate">{f.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${sel ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"}`}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* process cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((proc) => {
          const st = window.sim.processStepStats(proc);
          return (
            <div key={proc.id} className="group bg-white border border-stone-200/80 hover:border-stone-300 hover:shadow-sm rounded-xl p-4 transition flex flex-col gap-3">
              <button onClick={() => setEditId(proc.id)} className="text-left flex items-start gap-2.5">
                <span className="w-9 h-9 rounded-lg grid place-items-center text-white shrink-0" style={{ background: proc.color || "#7c3aed" }}><Icon name="workflow" size={17} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-stone-900 leading-tight">{proc.name}</div>
                  {proc.desc && <div className="text-[11px] text-stone-500 mt-0.5 leading-snug line-clamp-2">{proc.desc}</div>}
                </div>
              </button>
              <div className="flex items-center gap-1 flex-wrap">
                <Chip icon="layers" tone="stone">{st.phases} fázis</Chip>
                <Chip icon="box" tone="stone">{st.steps} lépés</Chip>
                {st.branches > 0 && <Chip icon="workflow" tone="violet">{st.branches} elágazás</Chip>}
                {st.parallels > 0 && <Chip icon="layers" tone="sky">{st.parallels} párhuzam</Chip>}
                {st.loops > 0 && <Chip icon="external" tone="amber">{st.loops} ciklus</Chip>}
                {st.ext > 0 && <Chip icon="external" tone="teal">{st.ext} külső átadás</Chip>}
              </div>
              <div className="mt-auto flex items-center gap-1 pt-1 border-t border-stone-100">
                <button onClick={() => setEditId(proc.id)} className="flex-1 h-8 rounded-lg text-[12px] font-medium text-stone-700 hover:bg-stone-100 inline-flex items-center justify-center gap-1.5"><Icon name="ruler" size={13} />Szerkesztés</button>
                <button onClick={() => window.sim.duplicateProcess(proc.id)} title="Duplikálás" className="w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Icon name="box" size={14} /></button>
                <button onClick={() => { if (confirm("Biztosan törlöd ezt a folyamatot?")) window.sim.removeProcess(proc.id); }} title="Törlés" className="w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="x" size={14} /></button>
              </div>
            </div>
          );
        })}
        <button onClick={create} className="rounded-xl border border-dashed border-stone-300 p-4 min-h-[150px] grid place-items-center text-stone-400 hover:text-teal-700 hover:border-teal-300 transition">
          <span className="inline-flex flex-col items-center gap-1.5 text-[12px] font-medium"><Icon name="plus" size={18} />Üres folyamat</span>
        </button>
      </div>

      {editId && window.ProcessEditor && <window.ProcessEditor processId={editId} onClose={() => setEditId(null)} />}
    </div>
  );
}

function Chip({ icon, tone, children }) {
  const tones = {
    stone: "bg-stone-100 text-stone-600", violet: "bg-violet-100 text-violet-700",
    sky: "bg-sky-100 text-sky-700", amber: "bg-amber-100 text-amber-700", teal: "bg-teal-100 text-teal-700",
  };
  return <span className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[10px] font-medium ${tones[tone] || tones.stone}`}><Icon name={icon} size={11} />{children}</span>;
}

Object.assign(window, { ProcessesPanel });
