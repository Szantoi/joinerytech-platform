// ──────────────────────────────────────────────────────────────────────────
// page-manufacturing-projects.jsx — Gyártás → „Gyártási projektek" fül.
//
//   A megrendelt, házon belül gyártott tételekből generált SAJÁT GYÁRTÁS
//   alprojektek itt kezelhetők — mint önálló projektek: ugyanaz a mérföldkő →
//   epik → task motor (ProjectBoard) és élő folyamat-futás (ProcessRunner).
//   A lista a kind === "manufacturing" projekteket mutatja, a fő projekthez
//   linkelve. Belépő: a fő projekt nézetéből „Saját gyártás alprojekt".
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateMP } = React;

const MP_STATUS_TONE = {
  draft:   { l: "Vázlat",      bg: "bg-stone-100",  fg: "text-stone-600",   dot: "bg-stone-400" },
  active:  { l: "Gyártásban",  bg: "bg-teal-50",    fg: "text-teal-700",    dot: "bg-teal-500" },
  install: { l: "Készre kész", bg: "bg-emerald-50", fg: "text-emerald-700", dot: "bg-emerald-500" },
  done:    { l: "Lezárva",     bg: "bg-stone-100",  fg: "text-stone-500",   dot: "bg-stone-400" },
  on_hold: { l: "Felfüggesztve", bg: "bg-amber-50", fg: "text-amber-700",   dot: "bg-amber-500" },
};
const mpHuf = (n) => (n || 0).toLocaleString("hu-HU") + " Ft";

function ManufacturingProjectsPage() {
  const s = useSim();
  const [boardId, setBoardId] = useStateMP(null);
  const [runId, setRunId] = useStateMP(null);
  const [prepId, setPrepId] = useStateMP(null);
  const list = (s.projects || []).filter((p) => p.kind === "manufacturing");

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <div className="text-[18px] md:text-[20px] font-semibold text-stone-900 tracking-tight">Gyártási projektek</div>
          <div className="text-[12px] text-stone-500">Saját gyártás alprojektek — műhely-folyamat, lépésről lépésre</div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-teal-50 text-teal-700 text-[12px] font-medium">
          <Icon name="factory" size={13} />{list.length} alprojekt
        </span>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-teal-50 grid place-items-center text-teal-600 mb-3"><Icon name="factory" size={22} /></div>
          <div className="text-[14px] font-semibold text-stone-700">Még nincs gyártási alprojekt</div>
          <div className="text-[12px] text-stone-500 mt-1 max-w-md mx-auto leading-relaxed">
            Egy megrendelt projekt nézetéből a <span className="font-medium text-stone-700">„Saját gyártás alprojekt"</span> gombbal hozhatsz létre egyet a házon belül gyártott tételekből. A létrejött alprojekt itt kezelhető — ugyanazzal a folyamat-motorral, mint bármely projekt.
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {list.map((p) => <MfgCard key={p.id} p={p} onBoard={() => setBoardId(p.id)} onRun={() => setRunId(p.id)} onPrep={() => setPrepId(p.id)} />)}
        </div>
      )}

      {boardId && window.ProjectBoard && <window.ProjectBoard projectId={boardId} onClose={() => setBoardId(null)} />}
      {runId && window.ProcessRunner && <window.ProcessRunner projectId={runId} onClose={() => setRunId(null)} />}
      {prepId && window.MfgPrepWorkspace && (() => { const pr = list.find((x) => x.id === prepId); return pr ? <window.MfgPrepWorkspace project={pr} onClose={() => setPrepId(null)} /> : null; })()}
    </div>
  );
}

function MfgCard({ p, onBoard, onRun, onPrep }) {
  const tone = MP_STATUS_TONE[p.status] || MP_STATUS_TONE.active;
  const es = window.projectEpicSummary ? window.projectEpicSummary(p) : { total: 0, done: 0, pct: 0 };
  const total = (p.items || []).reduce((n, i) => n + (i.value || 0), 0);
  const view = window.sim.runView ? window.sim.runView(p.id) : null;
  const started = view && view.run && view.run.started;
  const runPct = view ? view.pct : es.pct;
  // current active step names (frontier)
  let activeName = null;
  if (view && started && !view.complete) {
    const names = (view.frontier || []).map((id) => { const e = window.sim._epicByStep(p, id); return e ? e.title : null; }).filter(Boolean);
    activeName = names.length ? (names.length > 1 ? `${names.length} lépés fut` : names[0]) : null;
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 hover:shadow-md hover:border-stone-300 transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-stone-900 leading-tight truncate">{p.name}</div>
          <div className="text-[11.5px] text-stone-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>{p.customer}</span>
            {p.parentName && <><span className="text-stone-300">·</span><span className="inline-flex items-center gap-1 text-stone-400"><Icon name="layers" size={11} />{p.parentName}</span></>}
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${tone.bg} ${tone.fg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{tone.l}
        </span>
      </div>

      {/* process + progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11.5px] mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-teal-700 font-medium">
            <Icon name="workflow" size={12} />{p.processName || "Saját gyártás"}
          </span>
          <span className="text-stone-500 tabular-nums">{es.done}/{es.total} lépés{started ? ` · ${runPct}%` : ""}</span>
        </div>
        <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: (started ? runPct : es.pct) + "%" }} />
        </div>
        {activeName && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-sky-700 bg-sky-50 px-2 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />Aktuális: {activeName}
          </div>
        )}
        {view && started && view.complete && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
            <Icon name="check" size={12} />Gyártás kész
          </div>
        )}
        {!started && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-stone-500 bg-stone-50 px-2 py-1 rounded-lg">
            <Icon name="production" size={12} />Folyamat indítható
          </div>
        )}
      </div>

      {/* items + value */}
      <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11.5px]">
        <span className="text-stone-500">{(p.items || []).length} tétel</span>
        <span className="font-semibold text-stone-800 tabular-nums">{mpHuf(total)}</span>
      </div>

      {/* actions */}
      <div className="mt-3 space-y-2">
        <button onClick={onPrep}
          className="w-full h-9 rounded-lg bg-teal-600 text-white text-[12px] font-semibold hover:bg-teal-700 inline-flex items-center justify-center gap-1.5">
          <Icon name="cpu" size={14} />Gyártás-előkészítés
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onRun}
            className="flex-1 h-9 rounded-lg border border-stone-200 bg-white text-stone-700 text-[12px] font-medium hover:border-teal-300 hover:text-teal-700 inline-flex items-center justify-center gap-1.5">
            <Icon name="production" size={14} />Folyamat
          </button>
          <button onClick={onBoard}
            className="flex-1 h-9 rounded-lg border border-stone-200 bg-white text-stone-700 text-[12px] font-medium hover:border-teal-300 hover:text-teal-700 inline-flex items-center justify-center gap-1.5">
            <Icon name="layers" size={14} />Tábla
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ManufacturingProjectsPage });
