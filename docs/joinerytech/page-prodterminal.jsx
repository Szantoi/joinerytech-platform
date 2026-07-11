// ─────────────────────────────────────────────────────────────────
// page-prodterminal.jsx — GYÁRTÁS · FELADAT-TERMINÁL (4.8-A3 feedback)
//   Tablet-first, üzem-felülethez hasonló operátor-terminál: a kiosztott
//   feladatok, idő-naplózás (start/szünet/kész), a TELJES folyamat-lánc
//   (a rendelés összes gyártási feladata), felelősök (projekt felelős,
//   gyártás-előkészítő), raktári kivét, kapcsolódó dokumentumok, etikett
//   QR-szkennelés (pl. „anyag nálam van"), és visszajelzés-napló.
//   Store: window.sim.prodTasks + idő-akciók; ProdSchedEngine (tény-idő).
// ─────────────────────────────────────────────────────────────────
const { useState: useStatePT2, useEffect: useEffectPT2 } = React;

// élő óra (másodperces tick, ha fut egy munka-session)
function useTick(active) {
  const [, setN] = useStatePT2(0);
  useEffectPT2(() => { if (!active) return; const t = setInterval(() => setN((n) => n + 1), 1000); return () => clearInterval(t); }, [active]);
}

function PtStatusPill({ status }) {
  const t = (window.PROD_STATUS || {})[status] || { label: status, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium px-2.5 h-7 text-[12px] ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}

// ── Operátor-választó ────────────────────────────────────────────
function OperatorPicker({ onPick }) {
  const ops = window.PROD_OPERATORS || [];
  const tasks = useSim().prodTasks || [];
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6">
      <div className="text-center mb-7">
        <div className="text-[13px] uppercase tracking-[0.2em] text-stone-400 font-medium mb-1">Gyártás · Feladat-terminál</div>
        <h1 className="text-[26px] font-semibold text-stone-900">Ki dolgozik?</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-[640px]">
        {ops.map((o) => {
          const mine = tasks.filter((t) => t.assignee === o.name && t.status !== "kesz").length;
          return (
            <button key={o.name} onClick={() => onPick(o)} className="bg-white rounded-2xl border border-stone-200 p-5 hover:border-teal-400 hover:shadow-sm flex flex-col items-center gap-2 transition">
              <div className="w-14 h-14 rounded-full grid place-items-center text-[18px] font-bold text-white" style={{ background: "linear-gradient(135deg,#0d9488,#115e59)" }}>{o.initials}</div>
              <div className="text-[14px] font-semibold text-stone-900">{o.name}</div>
              <div className="text-[11px] text-stone-500">{o.role}</div>
              <div className={`text-[11px] font-medium ${mine ? "text-teal-700" : "text-stone-400"}`}>{mine} aktív feladat</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Feladat-kártya a listában ────────────────────────────────────
function TaskCard({ task, onOpen }) {
  const m = (window.PROD_KINDS || {})[task.kind] || {};
  const E = window.ProdSchedEngine;
  const act = E ? E.taskActualMinutes(task) : 0;
  return (
    <button onClick={() => onOpen(task.id)} className="w-full text-left bg-white rounded-2xl border border-stone-200 p-4 hover:border-teal-400 hover:shadow-sm transition flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: (m.accent || "#999") + "1a", color: m.accent }}><Icon name={m.icon || "factory"} size={20} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-stone-900 truncate">{task.title}</div>
        <div className="text-[11.5px] text-stone-500 truncate">{task.order} · {task.customer}</div>
        <div className="flex items-center gap-2 mt-1.5"><PtStatusPill status={task.status} />{task.running && <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />fut</span>}{act > 0 && <span className="text-[10.5px] text-stone-400">{E.fmtDuration(act)} naplózva</span>}</div>
      </div>
      <Icon name="chevron" size={18} className="text-stone-300 shrink-0" />
    </button>
  );
}

// ── Feladat-lista (saját + felvehető) ────────────────────────────
function TaskList({ op, onOpen, onBack }) {
  const tasks = useSim().prodTasks || [];
  const mine = tasks.filter((t) => t.assignee === op.name && t.status !== "kesz");
  const available = tasks.filter((t) => !t.assignee && t.status !== "kesz");
  const doneToday = tasks.filter((t) => t.assignee === op.name && t.status === "kesz");
  return (
    <div className="max-w-[760px] mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full grid place-items-center text-[15px] font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg,#0d9488,#115e59)" }}>{op.initials}</div>
        <div className="flex-1"><div className="text-[16px] font-semibold text-stone-900">{op.name}</div><div className="text-[12px] text-stone-500">{op.role}</div></div>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 text-stone-600 text-[12.5px] font-medium hover:bg-stone-50"><Icon name="logout" size={14} />Váltás</button>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Az én feladataim ({mine.length})</div>
        <div className="space-y-2">{mine.length ? mine.map((t) => <TaskCard key={t.id} task={t} onOpen={onOpen} />) : <div className="text-[12.5px] text-stone-400 py-2">Nincs aktív kiosztott feladat.</div>}</div>
      </div>
      {available.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Felvehető feladatok ({available.length})</div>
          <div className="space-y-2">{available.map((t) => <TaskCard key={t.id} task={t} onOpen={onOpen} />)}</div>
        </div>
      )}
      {doneToday.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Mai kész ({doneToday.length})</div>
          <div className="space-y-2 opacity-70">{doneToday.map((t) => <TaskCard key={t.id} task={t} onOpen={onOpen} />)}</div>
        </div>
      )}
    </div>
  );
}

// ── QR / etikett szkennelő modal ─────────────────────────────────
function ScanModal({ task, op, onClose }) {
  const [code, setCode] = useStatePT2("");
  const quick = [
    { label: "Anyag átvéve a raktárból", code: (task.lines && task.lines[0] && task.lines[0].matCode) || task.order },
    { label: "Anyag nálam van", code: task.order },
    { label: "Munkadarab azonosító", code: task.id },
  ];
  const doScan = (c, label) => { if (!c) return; window.sim.scanProdTaskLabel(task.id, c, op.name, label); onClose(); };
  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/50" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[440px] md:rounded-2xl rounded-t-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between"><div className="text-[14px] font-semibold text-stone-900">Etikett szkennelése</div><button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button></div>
        <div className="p-4 space-y-3.5">
          {/* szkenner-vászon */}
          <div className="relative rounded-xl bg-stone-900 aspect-[4/3] grid place-items-center overflow-hidden">
            <Icon name="qr" size={64} className="text-stone-600" />
            <div className="absolute inset-6 border-2 border-teal-400/70 rounded-lg" />
            <div className="absolute left-6 right-6 h-0.5 bg-teal-400 shadow-[0_0_12px_2px_rgba(45,212,191,0.7)]" style={{ top: "50%" }} />
            <div className="absolute bottom-2 inset-x-0 text-center text-[10.5px] text-stone-400">Tartsd a kamerát az etikett QR-kódjára</div>
          </div>
          <div className="flex items-center gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Kód kézi bevitele…" className="flex-1 h-10 px-3 rounded-lg border border-stone-200 text-[13px] bg-white outline-none focus:border-teal-500 font-mono" />
            <button onClick={() => doScan(code.trim(), null)} disabled={!code.trim()} className="h-10 px-4 rounded-lg bg-teal-600 text-white text-[13px] font-semibold disabled:opacity-40">Rögzít</button>
          </div>
          <div className="space-y-1.5">
            <div className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium">Gyors-rögzítés</div>
            {quick.map((q) => <button key={q.label} onClick={() => doScan(q.code, q.label)} className="w-full text-left px-3 py-2.5 rounded-lg border border-stone-200 hover:border-teal-300 hover:bg-teal-50/40 flex items-center gap-2.5"><Icon name="qr" size={16} className="text-teal-600 shrink-0" /><span className="text-[12.5px] text-stone-800 flex-1">{q.label}</span><span className="text-[10.5px] font-mono text-stone-400">{q.code}</span></button>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feladat-részlet (idő-naplózás + lánc + felelősök + dokumentumok) ──
function TaskDetail({ taskId, op, onBack }) {
  const sim = useSim();
  const task = (sim.prodTasks || []).find((t) => t.id === taskId);
  const E = window.ProdSchedEngine;
  useTick(!!(task && task.running));
  const [note, setNote] = useStatePT2("");
  const [scanOpen, setScanOpen] = useStatePT2(false);
  if (!task) return null;
  const m = (window.PROD_KINDS || {})[task.kind] || {};
  const act = E ? E.taskActualMinutes(task) : 0;
  const eff = E ? E.taskEfficiency(task) : null;
  // a rendelés TELJES gyártási lánca
  const chain = (sim.prodTasks || []).filter((t) => t.order === task.order).sort((a, b) => (window.PROD_KIND_ORDER.indexOf(a.kind) - window.PROD_KIND_ORDER.indexOf(b.kind)));
  // raktári kivét a rendeléshez
  const withdrawals = (sim.withdrawals || []).filter((w) => (w.ref && w.ref === task.order) || (w.refLabel && task.customer && w.refLabel.includes(task.customer)) || (w.refLabel && w.refLabel.includes(task.order)));
  const docs = window.sim.docsFor ? window.sim.docsFor("order", task.order) : [];

  return (
    <div className="max-w-[760px] mx-auto p-4 md:p-6 space-y-4 pb-24">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[12.5px] text-stone-500 font-medium hover:text-stone-800"><Icon name="chevron" size={14} className="rotate-180" />Vissza a feladataimhoz</button>

      {/* fejléc */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl grid place-items-center shrink-0" style={{ background: (m.accent || "#999") + "1a", color: m.accent }}><Icon name={m.icon || "factory"} size={22} /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold text-stone-900">{task.title}</div>
            <div className="text-[12px] text-stone-500">{task.order} · {task.customer}</div>
            <div className="flex items-center gap-2 mt-2 flex-wrap"><PtStatusPill status={task.status} />{task.note && <span className="text-[11.5px] text-stone-500">{task.note}</span>}</div>
          </div>
        </div>
      </div>

      {/* idő-naplózás */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Munkaidő naplózás</div>
          <div className="text-right"><div className="text-[10.5px] text-stone-400">tény / terv</div><div className="text-[14px] font-semibold text-stone-900">{E.fmtDuration(act)} <span className="text-stone-400 font-normal">/ {task.hours} ó</span></div></div>
        </div>
        {task.running ? (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[13px] font-medium text-teal-800 flex-1">Fut — {task.running.who} · {task.running.startAt.slice(11)} óta</span>
          </div>
        ) : eff != null && (
          <div className="text-[11.5px] text-stone-500 mb-3">Hatékonyság: <span className={`font-semibold ${eff >= 1 ? "text-emerald-600" : "text-amber-600"}`}>{Math.round(eff * 100)}%</span> a tervhez képest</div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {!task.running
            ? <button onClick={() => window.sim.startProdTaskWork(task.id, op.name)} disabled={task.status === "kesz"} className="col-span-3 h-12 rounded-xl bg-teal-600 text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-teal-700"><Icon name="check" size={18} />{(task.sessions || []).length ? "Folytatás" : "Munka indítása"}</button>
            : <>
                <button onClick={() => window.sim.pauseProdTaskWork(task.id)} className="col-span-1 h-12 rounded-xl bg-amber-500 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-amber-600"><Icon name="minus" size={16} />Szünet</button>
                <button onClick={() => window.sim.finishProdTaskWork(task.id)} className="col-span-2 h-12 rounded-xl bg-emerald-600 text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-emerald-700"><Icon name="check" size={18} />Kész</button>
              </>}
        </div>
        {(task.sessions || []).length > 0 && <div className="mt-2.5 text-[10.5px] text-stone-400">{task.sessions.length} munka-szakasz naplózva · összesen {E.fmtDuration((task.sessions || []).reduce((s, x) => s + (x.minutes || 0), 0))}</div>}
      </div>

      {/* műveleti lépések (per-alkatrész útvonal — tömörfa front-end / lap szabás) */}
      {(task.opSteps || []).length > 0 && (() => {
        const steps = task.opSteps;
        const done = task.opDone || [];
        const doneN = steps.filter((o) => done.includes(o.key)).length;
        const allDone = doneN === steps.length && steps.length > 0;
        const hasFront = steps.some((o) => o.front);
        const nextKey = (steps.find((o) => !done.includes(o.key)) || {}).key;
        return (
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Műveleti lépések · {m.label || task.kind}</div>
              <div className="text-[13px] font-semibold text-stone-900 tabular-nums">{doneN}<span className="text-stone-400 font-normal">/{steps.length}</span></div>
            </div>
            {hasFront && (
              <div className="mb-2.5 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200/70 rounded-lg px-2.5 py-1.5">
                <Icon name="layers" size={13} className="mt-0.5 shrink-0" />
                <span>Tömörfa front-end — a deszka fokozatos megmunkálása, folyamatos szelektálással (csomó, repedés, szálirány, szín).</span>
              </div>
            )}
            <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden mb-3">
              <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${steps.length ? (doneN / steps.length * 100) : 0}%` }} />
            </div>
            <div className="space-y-1.5">
              {steps.map((o, i) => {
                const isDone = done.includes(o.key);
                const isNext = o.key === nextKey;
                return (
                  <button key={o.key} onClick={() => window.sim.toggleProdTaskOp(task.id, o.key, op.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition ${isDone ? "bg-emerald-50/60 border-emerald-200" : isNext ? "bg-teal-50/50 border-teal-300" : "bg-white border-stone-200 hover:border-teal-300"}`}>
                    <span className={`shrink-0 w-6 h-6 rounded-md grid place-items-center text-[11px] font-semibold ${isDone ? "bg-emerald-500 text-white" : isNext ? "bg-teal-600 text-white" : "border border-stone-300 text-stone-400"}`}>{isDone ? <Icon name="check" size={13} /> : i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[13px] font-medium ${isDone ? "text-emerald-800 line-through decoration-emerald-300" : "text-stone-800"}`}>{o.label}</div>
                      <div className="text-[10px] text-stone-400">{o.partCount} alkatrész{o.merge ? " · összevezetés egységgé (identitás-váltás)" : ""}</div>
                    </div>
                    {o.front && <span className="shrink-0 text-[9px] uppercase tracking-wide text-amber-600 font-semibold">tömör</span>}
                    {o.merge && <span className="shrink-0 inline-flex items-center gap-1 text-[9px] uppercase tracking-wide text-stone-500 font-semibold"><Icon name="layers" size={12} />merge</span>}
                  </button>
                );
              })}
            </div>
            {allDone && <div className="mt-2.5 text-[11.5px] text-emerald-700 font-medium flex items-center gap-1.5"><Icon name="check" size={14} />Minden művelet kész — zárd le a feladatot a „Kész" gombbal.</div>}
          </div>
        );
      })()}

      {/* gyors-akciók */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setScanOpen(true)} className="h-12 rounded-xl bg-white border border-stone-200 text-stone-800 text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:border-teal-300"><Icon name="qr" size={18} className="text-teal-600" />Etikett szkennelés</button>
        {task.status !== "kesz" && (window.ProdSchedEngine.canGo(task, "blokkolt"))
          ? <button onClick={() => { const r = prompt("Blokkolás oka:"); if (r) window.sim.setProdTaskStatus(task.id, "blokkolt", { reason: r }); }} className="h-12 rounded-xl bg-white border border-stone-200 text-rose-600 text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:border-rose-300"><Icon name="alert" size={18} />Akadály jelzése</button>
          : <div className="h-12 rounded-xl bg-stone-50 border border-stone-100" />}
      </div>

      {/* folyamat-lánc */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2.5">Folyamat-lánc · {task.order}</div>
        <div className="space-y-1.5">
          {chain.map((c, i) => { const cm = (window.PROD_KINDS || {})[c.kind] || {}; const cur = c.id === task.id; const st = (window.PROD_STATUS || {})[c.status] || {};
            return (
              <div key={c.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg ${cur ? "bg-teal-50 border border-teal-200" : "border border-stone-100"}`}>
                <span className="text-[10px] font-mono text-stone-400 w-5 shrink-0">{i + 1}.</span>
                <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: (cm.accent || "#999") + "1a", color: cm.accent }}><Icon name={cm.icon || "factory"} size={14} /></span>
                <div className="min-w-0 flex-1"><div className={`text-[12.5px] truncate ${cur ? "font-semibold text-teal-900" : "text-stone-700"}`}>{c.title.split("—").slice(1).join("—").trim() || c.title}</div><div className="text-[10px] text-stone-400">{c.assignee || "nincs kiosztva"}</div></div>
                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 h-5 rounded-full border font-medium shrink-0 ${st.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</span>
              </div>
            ); })}
        </div>
      </div>

      {/* gyártás → minőség: a teljes lánc kész → végellenőrzésre küld */}
      {(() => {
        const allChainDone = chain.length > 0 && chain.every((c) => c.status === "kesz");
        const qa = (sim.qaList ? sim.qaList() : []).find((i) => i.type === "vegellenorzes" && i.ref === task.order);
        if (!allChainDone && !qa) return null;
        const orderName = (task.title.split("—")[0] || "").trim();
        const refLabel = [task.customer, orderName].filter(Boolean).join(" — ");
        return (
          <div className="bg-white rounded-2xl border border-emerald-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-emerald-50 text-emerald-600"><Icon name="shield" size={20} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-stone-900">Gyártás kész → Minőség</div>
                <div className="text-[11.5px] text-stone-500">A rendelés teljes gyártási lánca elkészült. Átadás előtt végellenőrzés szükséges.</div>
              </div>
            </div>
            {qa ? (
              <button onClick={() => window.navigateTo && window.navigateTo("quality", "inspections")}
                className="mt-3 w-full h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-emerald-100">
                <Icon name="shield" size={16} />Végellenőrzés fut — {qa.id} · {(window.QA_STATUS[qa.status] || {}).label || qa.status}
              </button>
            ) : (
              <button onClick={() => window.sim.sendOrderToFinalQa(task.order, { refLabel, subject: `${orderName || "Késztermék"} — végellenőrzés`, by: op.name })}
                className="mt-3 w-full h-12 rounded-xl bg-emerald-600 text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-emerald-700">
                <Icon name="shield" size={18} />Végellenőrzésre küld
              </button>
            )}
          </div>
        );
      })()}

      {/* felelősök */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2.5">Felelősök</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[["Projekt felelős", task.projectOwner], ["Gyártás-előkészítő", task.prepBy], ["Kiosztva", task.assignee || "—"]].map(([lbl, val]) => (
            <div key={lbl} className="rounded-xl border border-stone-100 bg-stone-50/60 p-2.5"><div className="text-[10px] text-stone-400">{lbl}</div><div className="text-[12.5px] font-medium text-stone-800 truncate flex items-center gap-1.5 mt-0.5"><Icon name="user" size={13} className="text-stone-400" />{val || "—"}</div></div>
          ))}
        </div>
      </div>

      {/* raktári kivét */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2.5">Raktárból kivéve ehhez</div>
        {withdrawals.length ? (
          <div className="space-y-1.5">{withdrawals.map((w) => { const c = (window.WH_CONSUMERS || {})[w.consumer] || {};
            return <div key={w.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-stone-100"><Icon name="box" size={15} className="text-stone-400 shrink-0" /><div className="min-w-0 flex-1"><div className="text-[12px] text-stone-800 truncate">{w.refLabel || w.ref || w.id}</div><div className="text-[10px] text-stone-400">{(w.lines || []).length} tétel · {c.label || w.consumer}</div></div><span className="text-[10.5px] text-stone-400 shrink-0">{(window.WH_WD_FLOW && window.WH_WD_FLOW[w.status] && window.WH_WD_FLOW[w.status].label) || w.status}</span></div>; })}</div>
        ) : <div className="text-[12px] text-stone-400">Még nincs rögzített kivét ehhez a rendeléshez.</div>}
      </div>

      {/* gyártási rajz — verzió-tudatos (a CNC/műhely a KIADOTT verziót futtatja) */}
      {(() => {
        const DE = window.DocsEngine;
        const rajzDocs = docs.filter((d) => d.type === "rajz");
        const otherDocs = docs.filter((d) => d.type !== "rajz");
        return (
          <>
            <div className="bg-white rounded-2xl border border-stone-200 p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Gyártási rajz · verzió</div>
                <button onClick={() => window.navigateTo && window.navigateTo("docs", "all")} className="text-[11px] text-violet-700 font-medium inline-flex items-center gap-1">Dokumentumtár <Icon name="external" size={12} /></button>
              </div>
              {task.kind === "cnc" && task.program && (
                <div className="mb-2.5 flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 border border-violet-200">
                  <Icon name="settings" size={16} className="text-violet-600 shrink-0" />
                  <div className="min-w-0 flex-1"><span className="text-[10.5px] text-violet-700/70 uppercase tracking-wide">CNC program</span><div className="text-[13px] font-mono font-semibold text-violet-900 truncate">{task.program}</div></div>
                </div>
              )}
              {rajzDocs.length ? (
                <div className="space-y-2">
                  {rajzDocs.map((d) => {
                    const rt = DE ? DE.runtimeVersion(d) : { runVersion: d.version, clear: true };
                    const tone = rt.blocked ? { bd: "border-rose-200", bg: "bg-rose-50", fg: "text-rose-700", ic: "text-rose-500" }
                      : !rt.clear ? { bd: "border-amber-200", bg: "bg-amber-50", fg: "text-amber-700", ic: "text-amber-500" }
                      : { bd: "border-emerald-200", bg: "bg-emerald-50", fg: "text-emerald-700", ic: "text-emerald-500" };
                    return (
                      <button key={d.id} onClick={() => window.navigateTo && window.navigateTo("docs", "all")} className={`w-full text-left rounded-xl border p-3 ${tone.bd} ${tone.bg} hover:shadow-sm transition`}>
                        <div className="flex items-center gap-2.5">
                          <Icon name="ruler" size={17} className={`shrink-0 ${tone.ic}`} />
                          <div className="min-w-0 flex-1"><div className="text-[12.5px] font-semibold text-stone-900 truncate">{d.name}</div><div className="text-[10px] text-stone-400 font-mono truncate">{d.fileLabel}</div></div>
                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-stone-400 uppercase tracking-wide">futtatandó</div>
                            <div className={`text-[16px] font-bold leading-none ${tone.fg}`}>{rt.runVersion != null ? `v${rt.runVersion}` : "—"}</div>
                          </div>
                        </div>
                        <div className={`mt-2 text-[11.5px] font-medium ${tone.fg} flex items-center gap-1.5`}>
                          <Icon name={rt.blocked ? "alert" : rt.clear ? "check" : "alert"} size={13} />
                          {rt.clear
                            ? `Gyártható — kiadott v${rt.runVersion}`
                            : rt.blocked
                              ? `Nincs kiadott rajz — ne kezdd el (v${rt.pending.v} ${(window.DOC_STATUS[rt.pending.status] || {}).label || rt.pending.status} alatt)`
                              : `A v${rt.pending.v} ${(window.DOC_STATUS[rt.pending.status] || {}).label || rt.pending.status} alatt — futtasd a kiadott v${rt.runVersion}-t`}
                        </div>
                        {task.docNotes && task.docNotes[d.id] && (
                          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-white/80 border border-teal-200/70 px-2.5 py-1.5">
                            <Icon name="chat" size={13} className="mt-0.5 shrink-0 text-teal-600" />
                            <span className="text-[11.5px] text-stone-700"><span className="font-semibold text-teal-800">Előkészítői annotáció:</span> {task.docNotes[d.id]}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : <div className="text-[12px] text-stone-400">Nincs kapcsolt gyártási rajz a rendeléshez.</div>}
              {otherDocs.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-stone-100 space-y-1.5">
                  {otherDocs.map((d) => { const dm = (window.DOC_TYPE_META || {})[d.type] || {}; const ds = (window.DOC_STATUS || {})[d.status] || {};
                    return (
                      <button key={d.id} onClick={() => window.navigateTo && window.navigateTo("docs", "all")} className="w-full text-left px-2.5 py-2 rounded-lg border border-stone-100 hover:border-violet-300">
                        <div className="flex items-center gap-2">
                          <Icon name={dm.icon || "file"} size={15} className="text-stone-400 shrink-0" />
                          <div className="min-w-0 flex-1"><div className="text-[12px] text-stone-800 truncate">{d.name}</div><div className="text-[10px] text-stone-400">{dm.short || d.type} · v{d.version}</div></div>
                          <span className={`text-[9.5px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${ds.pill}`}>{ds.label || d.status}</span>
                        </div>
                        {task.docNotes && task.docNotes[d.id] && (
                          <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-teal-50/60 border border-teal-200/60 px-2 py-1">
                            <Icon name="chat" size={12} className="mt-0.5 shrink-0 text-teal-600" />
                            <span className="text-[11px] text-stone-700"><span className="font-semibold text-teal-800">Annotáció:</span> {task.docNotes[d.id]}</span>
                          </div>
                        )}
                      </button>
                    ); })}
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* visszajelzés + esemény-napló */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2.5">Visszajelzés</div>
        <div className="flex items-end gap-2 mb-3">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={1} placeholder="Megjegyzés a folyamatról…" className="flex-1 px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 resize-none" />
          <button disabled={!note.trim()} onClick={() => { window.sim.addProdTaskEvent(task.id, { type: "note", note, who: op.name }); setNote(""); }} className="h-9 px-3 rounded-lg bg-stone-900 text-white text-[12px] font-medium disabled:opacity-40 shrink-0">Küld</button>
        </div>
        <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
          {(task.events || []).slice().reverse().map((e, i) => { const ic = e.type === "scan" ? "qr" : e.type === "start" ? "check" : e.type === "finish" ? "check" : e.type === "pause" ? "minus" : "chat";
            return <div key={i} className="flex items-start gap-2 text-[11.5px]"><Icon name={ic} size={13} className={`mt-0.5 shrink-0 ${e.type === "scan" ? "text-teal-600" : "text-stone-400"}`} /><div className="min-w-0 flex-1"><span className="text-stone-700">{e.note}</span><div className="text-[10px] text-stone-400 font-mono">{e.at} · {e.who}</div></div></div>; })}
          {!(task.events || []).length && <div className="text-[12px] text-stone-400">Még nincs esemény.</div>}
        </div>
      </div>

      {scanOpen && <ScanModal task={task} op={op} onClose={() => setScanOpen(false)} />}
    </div>
  );
}

// ── Terminál shell ───────────────────────────────────────────────
function ProdTaskTerminal() {
  const [op, setOp] = useStatePT2(null);
  const [taskId, setTaskId] = useStatePT2(null);
  return (
    <div className="min-h-[calc(100vh-120px)] bg-stone-100/60">
      {!op ? <OperatorPicker onPick={(o) => { setOp(o); setTaskId(null); }} />
        : taskId ? <TaskDetail taskId={taskId} op={op} onBack={() => setTaskId(null)} />
          : <TaskList op={op} onOpen={setTaskId} onBack={() => setOp(null)} />}
    </div>
  );
}

Object.assign(window, { ProdTaskTerminal, TaskDetail });
