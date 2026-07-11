// ──────────────────────────────────────────────────────────────────────────
// MŰHELY-TERMINÁL — az „Üzem" (shopfloor) világ valódi tartalma (4.7-A folyt.)
//
// JIT-elv: az operátor CSAK a saját ÁLLOMÁSA feladatait lássa, és pontosan azt
// az információt, amivel dolgoznia kell. Az állomás-identitás profil-default +
// felülbírható választó (localStorage-ben őrzött). Élő `prodTasks` store-ból
// dolgozik (NEM a régi statikus SHOPFLOOR_QUEUE mockból), és a meglévő
// `window.TaskDetail` munka-felületet hasznosítja újra (idő-naplózás, folyamat-
// lánc, raktári kivét, gyártási rajz + verzió, etikett-szkennelés).
//
// Etikett-QR → „minden info betöltődik": a scan feloldja a munkadarab kódját egy
// feladatra és megnyitja a teljes kontextussal.
//
// Scope: `wk`-prefixű nevek; Icon/useSim/window.TaskDetail közvetlenül.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateWk, useEffect: useEffectWk } = React;

const WK_STATION_LS = "jt_wk_station";
const WK_OP_LS = "jt_wk_op";

// Állomások = művelet-típusok (PROD_KINDS). A CNC-s csak CNC-t lát.
function wkStations() {
  const order = window.PROD_KIND_ORDER || [];
  const meta = window.PROD_KINDS || {};
  return order.map((k) => ({ key: k, ...(meta[k] || {}) }));
}
const wkLoad = (key, fb) => { try { return localStorage.getItem(key) || fb; } catch (e) { return fb; } };
const wkSave = (key, val) => { try { localStorage.setItem(key, val); } catch (e) {} };

// kód → feladat feloldás (etikett QR / munkadarab azonosító)
function wkResolveCode(tasks, raw) {
  const code = String(raw || "").trim().toLowerCase();
  if (!code) return null;
  return (tasks || []).find((t) =>
    String(t.id).toLowerCase() === code ||
    String(t.order).toLowerCase() === code ||
    String(t.id).toLowerCase().includes(code) ||
    (t.order && String(t.order).toLowerCase().includes(code))
  ) || null;
}

// ── Operátor avatar ──────────────────────────────────────────────
function WkAvatar({ op, size = 44 }) {
  return (
    <div className="rounded-full grid place-items-center font-bold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.34, background: "linear-gradient(135deg,#0d9488,#115e59)" }}>
      {op.initials}
    </div>
  );
}

// ── Állomás-kapu (JIT belépő) ────────────────────────────────────
function WkStationGate({ onPick, current }) {
  const sim = useSim();
  const tasks = sim.prodTasks || [];
  const stations = wkStations();
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-5 md:p-8">
      <div className="text-center mb-7">
        <div className="text-[12px] uppercase tracking-[0.22em] text-stone-400 font-medium mb-1">Üzem · Műhely-terminál</div>
        <h1 className="text-[26px] md:text-[30px] font-semibold text-stone-900">Melyik állomás?</h1>
        <p className="text-[13px] text-stone-500 mt-1.5">Válaszd ki a munkaállomást — csak az ide tartozó feladatok jelennek meg.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-[760px]">
        {stations.map((st) => {
          const active = tasks.filter((t) => t.kind === st.key && t.status !== "kesz").length;
          const running = tasks.filter((t) => t.kind === st.key && t.running).length;
          const isCur = current === st.key;
          return (
            <button key={st.key} onClick={() => onPick(st.key)}
              className={`relative bg-white rounded-2xl border p-5 flex flex-col items-center gap-2.5 transition hover:shadow-sm ${isCur ? "border-teal-500 ring-2 ring-teal-500/20" : "border-stone-200 hover:border-teal-400"}`}>
              <div className="w-16 h-16 rounded-2xl grid place-items-center" style={{ background: (st.accent || "#0d9488") + "1a", color: st.accent }}>
                <Icon name={st.icon || "factory"} size={30} />
              </div>
              <div className="text-[16px] font-semibold text-stone-900">{st.label}</div>
              <div className="flex items-center gap-2 text-[12px]">
                <span className={`font-medium ${active ? "text-teal-700" : "text-stone-400"}`}>{active} aktív</span>
                {running > 0 && <span className="inline-flex items-center gap-1 text-amber-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{running} fut</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Operátor-választó lap ────────────────────────────────────────
function WkOperatorSheet({ onPick, onClose }) {
  const ops = window.PROD_OPERATORS || [];
  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/50" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[520px] md:rounded-2xl rounded-t-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <div className="text-[14px] font-semibold text-stone-900">Ki dolgozik?</div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ops.map((o) => (
            <button key={o.name} onClick={() => onPick(o)} className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 hover:border-teal-400 hover:bg-teal-50/40 text-left transition">
              <WkAvatar op={o} size={40} />
              <div className="min-w-0"><div className="text-[14px] font-semibold text-stone-900 truncate">{o.name}</div><div className="text-[11.5px] text-stone-500">{o.role}</div></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Etikett-szkennelő (kód → feladat betöltés) ───────────────────
function WkScanModal({ onResolve, onClose }) {
  const sim = useSim();
  const tasks = sim.prodTasks || [];
  const [code, setCode] = useStateWk("");
  const [err, setErr] = useStateWk(false);
  const tryResolve = (c) => {
    const t = wkResolveCode(tasks, c);
    if (t) { onResolve(t.id); onClose(); } else setErr(true);
  };
  // pár élő kód gyors-gombnak
  const quick = tasks.filter((t) => t.status !== "kesz").slice(0, 3);
  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/50" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[440px] md:rounded-2xl rounded-t-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <div className="text-[14px] font-semibold text-stone-900">Etikett beolvasása</div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button>
        </div>
        <div className="p-4 space-y-3.5">
          <div className="relative rounded-xl bg-stone-900 aspect-[4/3] grid place-items-center overflow-hidden">
            <Icon name="qr" size={64} className="text-stone-600" />
            <div className="absolute inset-6 border-2 border-teal-400/70 rounded-lg" />
            <div className="absolute left-6 right-6 h-0.5 bg-teal-400 shadow-[0_0_12px_2px_rgba(45,212,191,0.7)]" style={{ top: "50%" }} />
            <div className="absolute bottom-2 inset-x-0 text-center text-[10.5px] text-stone-400">A munkadarab QR-kódja minden infót betölt</div>
          </div>
          <div className="flex items-center gap-2">
            <input value={code} onChange={(e) => { setCode(e.target.value); setErr(false); }} placeholder="Kód kézi bevitele (pl. GT-2426-005)…"
              className={`flex-1 h-10 px-3 rounded-lg border text-[13px] bg-white outline-none font-mono ${err ? "border-rose-400" : "border-stone-200 focus:border-teal-500"}`} />
            <button onClick={() => tryResolve(code)} disabled={!code.trim()} className="h-10 px-4 rounded-lg bg-teal-600 text-white text-[13px] font-semibold disabled:opacity-40">Betölt</button>
          </div>
          {err && <div className="text-[11.5px] text-rose-600">Nincs ilyen munkadarab/feladat. Próbáld a feladat- vagy rendelés-azonosítót.</div>}
          {quick.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium">Élő munkadarabok</div>
              {quick.map((t) => (
                <button key={t.id} onClick={() => { onResolve(t.id); onClose(); }} className="w-full text-left px-3 py-2.5 rounded-lg border border-stone-200 hover:border-teal-300 hover:bg-teal-50/40 flex items-center gap-2.5">
                  <Icon name="qr" size={16} className="text-teal-600 shrink-0" />
                  <span className="text-[12.5px] text-stone-800 flex-1 truncate">{t.title}</span>
                  <span className="text-[10.5px] font-mono text-stone-400">{t.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Feladat-kártya (állomás-sor) ─────────────────────────────────
function WkTaskCard({ task, op, onOpen }) {
  const sim = useSim();
  const E = window.ProdSchedEngine;
  const st = (window.PROD_STATUS || {})[task.status] || {};
  const station = E && E.stationById ? E.stationById(task.machineId) : null;
  const act = E ? E.taskActualMinutes(task) : 0;
  const mine = task.assignee === op.name;
  const unassigned = !task.assignee;
  // gyártási rajz kiadottság (figyelmeztető pötty)
  const docs = sim.docsFor ? sim.docsFor("order", task.order) : [];
  const rajz = docs.filter((d) => d.type === "rajz");
  const DE = window.DocsEngine;
  let drawWarn = false, drawBlock = false;
  rajz.forEach((d) => { const r = DE && DE.runtimeVersion(d); if (r && r.blocked) drawBlock = true; else if (r && !r.clear) drawWarn = true; });
  return (
    <button onClick={() => onOpen(task.id)} className="w-full text-left bg-white rounded-2xl border border-stone-200 p-4 hover:border-teal-400 hover:shadow-sm transition flex items-center gap-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium px-2 h-6 text-[11px] ${st.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</span>
          {task.running && <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />fut</span>}
          {drawBlock && <span className="inline-flex items-center gap-1 text-[10.5px] text-rose-600 font-medium"><Icon name="alert" size={12} />nincs kiadott rajz</span>}
          {!drawBlock && drawWarn && <span className="inline-flex items-center gap-1 text-[10.5px] text-amber-600 font-medium"><Icon name="alert" size={12} />rajz-revízió</span>}
        </div>
        <div className="text-[15px] font-semibold text-stone-900 mt-1.5 leading-tight">{task.title}</div>
        <div className="text-[11.5px] text-stone-500 mt-0.5 truncate">{task.order} · {task.customer}</div>
        <div className="flex items-center gap-2 mt-1.5 text-[10.5px] text-stone-400 flex-wrap">
          {station && <span className="font-mono">{station.name}</span>}
          <span>· {task.hours} ó terv</span>
          {act > 0 && <span>· {E.fmtDuration(act)} naplózva</span>}
          {mine ? <span className="text-teal-600 font-medium">· az enyém</span> : unassigned ? <span className="text-amber-600 font-medium">· szabad</span> : <span>· {task.assignee}</span>}
        </div>
      </div>
      {unassigned
        ? <span onClick={(e) => { e.stopPropagation(); if (sim.assignProdTask) sim.assignProdTask(task.id, op.name); }}
            className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-teal-600 text-white text-[12.5px] font-semibold hover:bg-teal-700">
            <Icon name="check" size={15} />Felveszem</span>
        : <Icon name="chevron" size={20} className="text-stone-300 shrink-0" />}
    </button>
  );
}

// ── Állomás-tábla (JIT munkalista) ───────────────────────────────
function WkStationBoard({ station, op, onOpen, onSwitchStation, onSwitchOp, onExit }) {
  const sim = useSim();
  const [scan, setScan] = useStateWk(false);
  const meta = (window.PROD_KINDS || {})[station] || {};
  const all = (sim.prodTasks || []).filter((t) => t.kind === station);
  const mineActive = all.filter((t) => t.assignee === op.name && ["folyamatban", "utemezve"].includes(t.status)).sort((a) => (a.running ? -1 : 1));
  const queue = all.filter((t) => !["kesz", "blokkolt"].includes(t.status) && !(t.assignee === op.name && ["folyamatban", "utemezve"].includes(t.status)));
  const blocked = all.filter((t) => t.status === "blokkolt");
  const done = all.filter((t) => t.status === "kesz");

  const Section = ({ label, list, tone }) => list.length > 0 && (
    <div>
      <div className={`text-[11px] uppercase tracking-wide font-medium mb-2 ${tone || "text-stone-400"}`}>{label} ({list.length})</div>
      <div className="space-y-2">{list.map((t) => <WkTaskCard key={t.id} task={t} op={op} onOpen={onOpen} />)}</div>
    </div>
  );

  return (
    <div className="min-h-full">
      {/* állomás-fejléc */}
      <div className="sticky top-0 z-20 bg-stone-100/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-[820px] mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: (meta.accent || "#0d9488") + "1a", color: meta.accent }}><Icon name={meta.icon || "factory"} size={22} /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold text-stone-900 leading-tight">{meta.label || station} <span className="text-stone-400 font-normal text-[13px]">· állomás</span></div>
            <button onClick={onSwitchStation} className="text-[11.5px] text-teal-700 font-medium inline-flex items-center gap-1 hover:underline">Állomásváltás <Icon name="chevron" size={12} /></button>
          </div>
          <button onClick={onSwitchOp} className="flex items-center gap-2 h-10 pl-1.5 pr-3 rounded-full border border-stone-200 bg-white hover:border-teal-300">
            <WkAvatar op={op} size={30} /><span className="text-[12.5px] font-medium text-stone-800 hidden sm:block">{op.name.split(" ")[0]}</span>
          </button>
          <button onClick={onExit} title="Kilépés" className="w-10 h-10 grid place-items-center rounded-full border border-stone-200 bg-white text-stone-500 hover:bg-stone-50"><Icon name="logout" size={17} /></button>
        </div>
      </div>

      <div className="max-w-[820px] mx-auto px-4 md:px-6 py-4 space-y-5 pb-24">
        {/* etikett-szkennelés (minden info betöltése) */}
        <button onClick={() => setScan(true)} className="w-full h-14 rounded-2xl bg-stone-900 text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2.5 hover:bg-stone-800 active:scale-[.995] transition">
          <Icon name="qr" size={20} className="text-teal-400" />Etikett beolvasása — munkadarab betöltése
        </button>

        {mineActive.length === 0 && queue.length === 0 && blocked.length === 0 && (
          <div className="text-center py-12 text-stone-400">
            <Icon name={meta.icon || "factory"} size={40} className="mx-auto mb-2 opacity-40" />
            <div className="text-[13px]">Nincs aktív feladat ezen az állomáson.</div>
          </div>
        )}

        <Section label="Most ezen dolgozol" list={mineActive} tone="text-teal-700" />
        <Section label={`Sorban — ${meta.label || station}`} list={queue} />
        <Section label="Blokkolt" list={blocked} tone="text-rose-500" />
        {done.length > 0 && (
          <div className="opacity-70"><Section label="Mai kész" list={done} tone="text-emerald-600" /></div>
        )}
      </div>

      {scan && <WkScanModal onResolve={onOpen} onClose={() => setScan(false)} />}
    </div>
  );
}

// ── Terminál shell ───────────────────────────────────────────────
function WorkshopTerminal({ onExit }) {
  const stations = wkStations();
  const defStation = wkLoad(WK_STATION_LS, stations[0] && stations[0].key);
  const [station, setStation] = useStateWk(defStation);
  const [stage, setStage] = useStateWk(station ? "board" : "gate");
  const opName = wkLoad(WK_OP_LS, "");
  const initOp = (window.PROD_OPERATORS || []).find((o) => o.name === opName) || (window.PROD_OPERATORS || [])[0];
  const [op, setOp] = useStateWk(initOp);
  const [opSheet, setOpSheet] = useStateWk(false);
  const [taskId, setTaskId] = useStateWk(null);

  const pickStation = (k) => { setStation(k); wkSave(WK_STATION_LS, k); setStage("board"); setTaskId(null); };
  const pickOp = (o) => { setOp(o); wkSave(WK_OP_LS, o.name); setOpSheet(false); };

  return (
    <div className="min-h-[calc(100vh-0px)] bg-stone-100/70">
      {stage === "gate" || !station
        ? <WkStationGate current={station} onPick={pickStation} />
        : taskId
          ? <div className="max-w-[820px] mx-auto">
              {window.TaskDetail
                ? <window.TaskDetail taskId={taskId} op={op} onBack={() => setTaskId(null)} />
                : <div className="p-6 text-stone-500">A feladat-részlet nem tölthető be.</div>}
            </div>
          : <WkStationBoard station={station} op={op} onOpen={setTaskId}
              onSwitchStation={() => setStage("gate")} onSwitchOp={() => setOpSheet(true)} onExit={onExit} />}
      {opSheet && <WkOperatorSheet onPick={pickOp} onClose={() => setOpSheet(false)} />}
    </div>
  );
}

window.WorkshopTerminal = WorkshopTerminal;
