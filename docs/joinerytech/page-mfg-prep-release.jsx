// ──────────────────────────────────────────────────────────────────────────
// page-mfg-prep-release.jsx — Gyártás-előkészítés: Útvonal → Dokumentum → Kiadás
//
//   A gyártás-előkészítő munkalap HÁROM ÚJ füle (a meglévő Anyag/Szabászat/
//   Vasalat/Munkaidő/Bérmunka mellé). Ez a HIÁNYZÓ LÁNC: a levezetett munkából
//   valódi MŰHELY-FELADATOKAT készít.
//     • Útvonal     — a technológiai sorrend (szabászat → élzárás → CNC →
//                     szerelés → felület) műveletekre bontva; állomás + óra +
//                     bérmunka-jelölés. (MfgPrep.routingPlan)
//     • Dokumentum  — a munkához kötött gyártási rajzok / utasítások + verzió-
//                     tudat (DocsEngine.runtimeVersion); a kiadáskor a feladatra
//                     kerülnek (docIds). Figyelmeztet, ha nincs KIADOTT rajz.
//     • Kiadás      — áttekintés + „Kiadás a műhelynek" → sim.releaseToWorkshop
//                     valódi prodTask-okat hoz létre (Műhely-terminál fogyasztja).
//
//   Scope: `mp`-prefixű nevek; a három fő komponens (PrepRouting/PrepDocs/
//   PrepRelease) window-ra exportálva, a page-mfg-prep.jsx ezekre hivatkozik.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateMp } = React;

const mpHUF = (n) => (Math.round(n || 0)).toLocaleString("hu-HU") + " Ft";
const mpHUFk = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : Math.round((n || 0) / 1000) + "k") + " Ft";

// állomás-akcent → lágy Tailwind (literál osztálynevek)
const MP_SOFT = {
  "#0d9488": "bg-teal-50 text-teal-700",   "#0284c7": "bg-sky-50 text-sky-700",
  "#7c3aed": "bg-violet-50 text-violet-700", "#ea580c": "bg-orange-50 text-orange-700",
  "#65a30d": "bg-lime-50 text-lime-700",
};

// közös szekció-fejléc (a page-mfg-prep.jsx-belivel megegyező vizuál)
function MpHead({ icon, title, sub }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-teal-50 text-teal-600 mt-0.5"><Icon name={icon} size={15} /></div>
      <div>
        <div className="text-[14px] font-semibold text-stone-900">{title}</div>
        <div className="text-[11.5px] text-stone-500 leading-snug max-w-2xl">{sub}</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ÚTVONAL — műveletekre bontás (technológiai sorrend)
// ════════════════════════════════════════════════════════════════════════════
function PrepRouting({ source, plan, setPlan, released }) {
  if (!plan) return null;
  const steps = plan.steps || [];
  const enabled = steps.filter((s) => s.enabled && !s.outsource);
  const outsourced = steps.filter((s) => s.enabled && s.outsource);

  const patchStep = (kind, patch) =>
    setPlan((p) => ({ ...p, steps: p.steps.map((s) => (s.kind === kind ? { ...s, ...patch } : s)) }));

  // ── FOLYAMAT-ELTÉRÉS NAPLÓ (§19.3 cap.5): átrendezés / alternatív gép →
  //    napló-bejegyzés, indok KÖTELEZŐ a kiadáshoz (a store is kikényszeríti) ──
  const logDeviation = (what) =>
    setPlan((p) => ({ ...p, deviations: [...(p.deviations || []), {
      id: "dev-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      at: new Date().toTimeString().slice(0, 5), what, reason: "" }] }));
  const moveStep = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= steps.length) return;
    const a = steps[idx], b = steps[j];
    setPlan((p) => { const arr = p.steps.slice(); const t = arr[idx]; arr[idx] = arr[j]; arr[j] = t; return { ...p, steps: arr }; });
    logDeviation(`Sorrend-átrendezés: ${a.kindLabel} ⇄ ${b.kindLabel}`);
  };
  const deviations = plan.deviations || [];
  const devMissing = deviations.filter((d) => !(d.reason && d.reason.trim())).length;

  const totalHours = enabled.reduce((s, x) => s + (Number(x.hours) || 0), 0);

  return (
    <div className="space-y-4">
      <MpHead icon="route" title="Technológiai útvonal — műveletekre bontás"
        sub="A levezetett munka állomásokra bontva, technológiai sorrendben. Minden bekapcsolt állomásból egy várólistás gyártási feladat készül a kiadáskor. Az üzem a folyamatot a saját működésére szabhatja — átrendezés vagy alternatív gép = ELTÉRÉS, ami indokkal naplózódik és a feladatokra kerül." />

      {released && (
        <div className="flex items-start gap-2.5 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-[12px] text-stone-600">
          <Icon name="lock" size={14} className="mt-0.5 shrink-0 text-stone-400" />
          <div>Ez a munka már ki van adva a műhelynek — az útvonal csak tájékoztató. Új kiadáshoz lásd a <span className="font-medium">Kiadás</span> fület.</div>
        </div>
      )}

      {steps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-[12.5px] text-stone-500">
          Nincs levezethető művelet ezen a munkán. Előbb generáld a szükségletet, vagy adj tételt a projekthez.
        </div>
      ) : (
        <div className="relative space-y-2.5 pl-1">
          {steps.map((st, i) => {
            const soft = MP_SOFT[st.accent] || "bg-stone-100 text-stone-600";
            const stationOpts = (window.PROD_STATIONS || []).filter((s) => s.kind === st.kind);
            const on = st.enabled;
            const active = on && !st.outsource;
            return (
              <div key={st.kind}
                className={`relative bg-white rounded-xl border p-3.5 transition ${active ? "border-teal-300" : on ? "border-amber-200" : "border-stone-200 opacity-70"}`}>
                <div className="flex items-start gap-3">
                  {/* seq + chain dot */}
                  <div className="shrink-0 flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full grid place-items-center text-[12px] font-semibold ${active ? "bg-teal-600 text-white" : "bg-stone-200 text-stone-500"}`}>{i + 1}</div>
                    {i < steps.length - 1 && <div className="w-px flex-1 min-h-[14px] bg-stone-200 mt-1" />}
                  </div>
                  {/* icon */}
                  <div className={`shrink-0 w-9 h-9 rounded-lg grid place-items-center ${soft}`}><Icon name={st.icon} size={17} /></div>
                  {/* body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-[14px] font-semibold text-stone-900 truncate">{st.kindLabel}</div>
                        {st.baseSeq != null && st.baseSeq !== i + 1 && (
                          <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200" title="Eltérés a technológiai alap-sorrendtől">⇕ {st.baseSeq}. → {i + 1}.</span>
                        )}
                        {st.baseMachineId && st.machineId !== st.baseMachineId && (
                          <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200" title="Nem az alapértelmezett gép">alt. gép</span>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {!released && (
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => moveStep(i, -1)} disabled={i === 0} title="Fel — sorrend-átrendezés (eltérés)"
                              className="w-6 h-6 rounded-md border border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300 grid place-items-center disabled:opacity-30"><Icon name="chevron" size={12} className="-rotate-90" /></button>
                            <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} title="Le — sorrend-átrendezés (eltérés)"
                              className="w-6 h-6 rounded-md border border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300 grid place-items-center disabled:opacity-30"><Icon name="chevron" size={12} className="rotate-90" /></button>
                          </div>
                        )}
                        <button onClick={released ? undefined : () => patchStep(st.kind, { enabled: !on })} disabled={released}
                          className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition ${on ? "bg-teal-50 text-teal-700" : "bg-stone-100 text-stone-500"} ${released ? "opacity-60" : "hover:brightness-95"}`}>
                          <span className={`w-3.5 h-3.5 rounded grid place-items-center ${on ? "bg-teal-600 text-white" : "border border-stone-300 bg-white text-transparent"}`}><Icon name="check" size={10} /></span>
                          {on ? "Bekapcsolva" : "Kihagyva"}
                        </button>
                      </div>
                    </div>
                    {on && (
                      <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-[1fr_120px_auto] gap-2 items-center">
                        {/* állomás — alternatív gép választása = ELTÉRÉS, naplózódik */}
                        <select value={st.machineId || ""} disabled={released || st.outsource}
                          onChange={(e) => {
                            const v = e.target.value || null;
                            patchStep(st.kind, { machineId: v });
                            if (v !== st.baseMachineId) {
                              const mn = (stationOpts.find((s) => s.id === v) || {}).name || "—";
                              logDeviation(`Alternatív gép — ${st.kindLabel}: ${mn}`);
                            }
                          }}
                          className="h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-700 disabled:bg-stone-50 disabled:text-stone-400">
                          {stationOpts.length === 0 && <option value="">— nincs gép —</option>}
                          {stationOpts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {/* óra */}
                        <div className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-stone-200 bg-white">
                          <input type="number" min="0.5" step="0.5" value={st.hours} disabled={released}
                            onChange={(e) => patchStep(st.kind, { hours: Math.max(0.5, Number(e.target.value) || 0.5) })}
                            className="w-full text-[12px] text-stone-800 tabular-nums outline-none bg-transparent disabled:text-stone-400" />
                          <span className="text-[11px] text-stone-400 shrink-0">óra</span>
                        </div>
                        {/* bérmunka */}
                        <button onClick={released ? undefined : () => patchStep(st.kind, { outsource: !st.outsource })} disabled={released}
                          className={`h-9 px-3 rounded-lg text-[11.5px] font-medium inline-flex items-center gap-1.5 border transition ${st.outsource ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"} ${released ? "opacity-60" : ""}`}>
                          <Icon name="external" size={13} />{st.outsource ? "Bérmunka" : "Házon belül"}
                        </button>
                      </div>
                    )}
                    {on && st.outsource && (
                      <div className="mt-1.5 text-[10.5px] text-amber-600">Kimarad a műhelysorból — a műveletet partner végzi (lásd a Bérmunka fület).</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* eltérés-napló — indok kötelező a kiadáshoz */}
      {deviations.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-amber-50/70 border-b border-amber-200/70 flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wide text-amber-800 font-semibold inline-flex items-center gap-1.5"><Icon name="alert" size={13} />Eltérés-napló — indok kötelező</div>
            {devMissing > 0
              ? <span className="text-[10.5px] font-medium text-amber-700">{devMissing} kitöltetlen indok</span>
              : <span className="text-[10.5px] font-medium text-emerald-700 inline-flex items-center gap-1"><Icon name="check" size={12} />minden indokolva</span>}
          </div>
          <div className="divide-y divide-stone-100">
            {deviations.map((d) => (
              <div key={d.id} className="px-4 py-2.5 flex items-start gap-2.5">
                <Icon name="route" size={14} className="mt-1 text-amber-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-stone-800">{d.what} <span className="text-[10px] font-normal text-stone-400 font-mono">· {d.at}</span></div>
                  <input value={d.reason || ""} disabled={!!released}
                    onChange={(e) => setPlan((p) => ({ ...p, deviations: (p.deviations || []).map((x) => (x.id === d.id ? { ...x, reason: e.target.value } : x)) }))}
                    placeholder="Eltérés indoka (kötelező a kiadáshoz)…"
                    className={`mt-1 w-full h-8 px-2.5 rounded-lg border text-[11.5px] bg-white outline-none disabled:bg-stone-50 ${(d.reason || "").trim() ? "border-stone-200 text-stone-700" : "border-amber-300 focus:border-amber-400"}`} />
                </div>
                {!released && (
                  <button onClick={() => setPlan((p) => ({ ...p, deviations: (p.deviations || []).filter((x) => x.id !== d.id) }))}
                    title="Bejegyzés törlése" className="shrink-0 mt-0.5 text-stone-300 hover:text-rose-500"><Icon name="x" size={14} /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* összegző */}
      <div className="flex items-center justify-between bg-teal-50/60 border border-teal-200/60 rounded-xl px-4 py-3">
        <div className="text-[12px] text-teal-800 font-medium">Műhelynek kiadandó</div>
        <div className="flex items-center gap-4 text-[13px]">
          <span className="tabular-nums text-teal-800"><span className="font-semibold">{enabled.length}</span> feladat</span>
          <span className="tabular-nums text-teal-800"><span className="font-semibold">{Math.round(totalHours * 10) / 10}</span> óra</span>
          {outsourced.length > 0 && <span className="tabular-nums text-amber-600"><span className="font-semibold">{outsourced.length}</span> bérmunka</span>}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  DOKUMENTUM — gyártási rajzok + verzió-tudat, csatolás a kiadáshoz
// ════════════════════════════════════════════════════════════════════════════
function PrepDocs({ source, plan, setPlan, released }) {
  const sim = useSim();
  const DE = window.DocsEngine;
  const link = source.docLink || { type: "order", id: source.id };
  const docs = sim.docsFor ? sim.docsFor(link.type, link.id) : [];
  const rajz = docs.filter((d) => d.type === "rajz");
  const others = docs.filter((d) => d.type !== "rajz");
  const hasReleasedRajz = rajz.some((d) => { const r = DE && DE.runtimeVersion(d); return r && r.clear; });
  const docIds = plan ? (plan.docIds || []) : [];

  const toggleDoc = (id) =>
    setPlan((p) => ({ ...p, docIds: (p.docIds || []).includes(id) ? p.docIds.filter((x) => x !== id) : [...(p.docIds || []), id] }));

  // csatolható (még nem ehhez a munkához kötött) rajz/utasítás a tárból
  const attachable = (sim.docList ? sim.docList() : []).filter(
    (d) => (d.type === "rajz" || d.type === "utasitas") && !(d.linkType === link.type && d.linkId === link.id)
  );
  const [attachId, setAttachId] = useStateMp("");
  const attach = () => {
    if (!attachId) return;
    sim.linkDocToWork(attachId, link.type, link.id, source.name);
    setAttachId("");
  };

  const DocRow = ({ d }) => {
    const rt = DE ? DE.runtimeVersion(d) : { runVersion: d.version, clear: true };
    const meta = (window.DOC_TYPE_META || {})[d.type] || {};
    const stat = (window.DOC_STATUS || {})[d.status] || {};
    const tone = rt.blocked ? { bd: "border-rose-200", bg: "bg-rose-50", fg: "text-rose-700" }
      : !rt.clear ? { bd: "border-amber-200", bg: "bg-amber-50", fg: "text-amber-700" }
      : { bd: "border-stone-200", bg: "bg-white", fg: "text-emerald-700" };
    const checked = docIds.includes(d.id);
    return (
      <div className={`rounded-xl border p-3.5 ${tone.bd} ${tone.bg}`}>
        <div className="flex items-start gap-3">
          <button onClick={released ? undefined : () => toggleDoc(d.id)} disabled={released}
            className={`shrink-0 mt-0.5 w-5 h-5 rounded-md border grid place-items-center transition ${checked ? "bg-teal-600 border-teal-600 text-white" : "border-stone-300 bg-white text-transparent"} ${released ? "opacity-60" : ""}`}>
            <Icon name="check" size={13} />
          </button>
          <div className="shrink-0 w-8 h-8 rounded-lg grid place-items-center" style={{ background: (meta.accent || "#78716c") + "1a", color: meta.accent || "#78716c" }}><Icon name={meta.icon || "file"} size={15} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[13px] font-semibold text-stone-900 leading-tight">{d.name}</div>
              <span className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-full border text-[10px] font-medium ${stat.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`} />{stat.label}</span>
            </div>
            <div className="text-[10.5px] font-mono text-stone-400 mt-0.5">{d.id} · v{d.version}</div>
            {/* verzió-tudat */}
            {d.type === "rajz" && (
              <div className="mt-1.5 text-[11px]">
                {rt.clear
                  ? <span className="text-emerald-700">A kiadott v{rt.runVersion} kerül a feladatra — gyártható.</span>
                  : rt.blocked
                    ? <span className="text-rose-700 font-medium">Nincs kiadott verzió — a műhely ne kezdje el.</span>
                    : <span className="text-amber-700">A v{d.version} {stat.label.toLowerCase()} — a műhely a kiadott v{rt.runVersion}-t futtatja.</span>}
              </div>
            )}
            {/* rajz-annotáció a kiadáshoz — részlet-megjegyzés a műhelynek (§19.3 cap.6) */}
            {checked && (
              <div className="mt-2 flex items-center gap-1.5">
                <Icon name="chat" size={13} className="shrink-0 text-teal-600" />
                <input value={(plan && plan.docNotes ? plan.docNotes[d.id] : "") || ""} disabled={!!released}
                  onChange={(e) => setPlan((p) => ({ ...p, docNotes: { ...(p.docNotes || {}), [d.id]: e.target.value } }))}
                  placeholder="Annotáció a műhelynek — részlet-megjegyzés ehhez a dokumentumhoz…"
                  className="flex-1 h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-[11.5px] text-stone-700 outline-none focus:border-teal-400 disabled:bg-stone-50 disabled:text-stone-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <MpHead icon="folder" title="Dokumentumok — gyártási rajz + verzió + annotáció"
        sub="A munkához kötött rajzok és utasítások. A kiadáskor a bepipált dokumentumok — az előkészítői annotációkkal együtt — a műhely-feladatokra kerülnek; a műhely mindig a KIADOTT verziót futtatja. A teljes verziókezelés a Dokumentumtár világban." />

      {/* kiadott rajz figyelmeztetés */}
      {!hasReleasedRajz && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-3 text-[12px] text-amber-800">
          <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">Nincs kiadott gyártási rajz</span> ehhez a munkához. Kiadható így is, de a műhely nem tud biztonságosan elkezdeni — előbb add ki a rajzot a Dokumentumtárban.
            <button onClick={() => window.navigateTo && window.navigateTo("docs", "all")} className="ml-1 underline font-medium">Dokumentumtár megnyitása</button>
          </div>
        </div>
      )}

      {rajz.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium">Gyártási rajzok</div>
          {rajz.map((d) => <DocRow key={d.id} d={d} />)}
        </div>
      )}
      {others.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium">Egyéb dokumentum</div>
          {others.map((d) => <DocRow key={d.id} d={d} />)}
        </div>
      )}
      {docs.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-7 text-center text-[12.5px] text-stone-500">
          Nincs a munkához kötött dokumentum. Csatolj egyet a tárból, vagy hozz létre a Dokumentumtárban.
        </div>
      )}

      {/* csatolás a tárból */}
      {!released && attachable.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-3.5">
          <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2">Csatolás a tárból</div>
          <div className="flex items-center gap-2">
            <select value={attachId} onChange={(e) => setAttachId(e.target.value)}
              className="flex-1 h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-700">
              <option value="">Válassz dokumentumot…</option>
              {attachable.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
            </select>
            <button onClick={attach} disabled={!attachId}
              className="h-9 px-3.5 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1.5 bg-stone-900 text-white hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400">
              <Icon name="plus" size={13} />Csatol
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  KIADÁS — áttekintés + kiadás a műhelynek (prodTask generálás)
// ════════════════════════════════════════════════════════════════════════════
function PrepRelease({ source, plan, setPlan, project, released }) {
  const sim = useSim();
  const DE = window.DocsEngine;
  if (!plan) return null;
  const steps = plan.steps || [];
  const enabled = steps.filter((s) => s.enabled && !s.outsource);
  const outsourced = steps.filter((s) => s.enabled && s.outsource);
  const totalHours = enabled.reduce((s, x) => s + (Number(x.hours) || 0), 0);
  // folyamat-eltérések — indok nélkül a kiadás LEZÁRT
  const deviations = plan.deviations || [];
  const devMissing = deviations.filter((d) => !(d.reason && d.reason.trim())).length;

  // kiadott rajz?
  const link = source.docLink || { type: "order", id: source.id };
  const rajz = (sim.docsFor ? sim.docsFor(link.type, link.id) : []).filter((d) => d.type === "rajz");
  const hasReleasedRajz = rajz.some((d) => { const r = DE && DE.runtimeVersion(d); return r && r.clear; });
  const docCount = (plan.docIds || []).length;

  // ── már kiadva ──
  if (released) {
    const rel = released;
    const tasks = (sim.prodTasks || []).filter((t) => (rel.taskIds || []).includes(t.id));
    const stat = window.PROD_STATUS || {};
    const doneN = tasks.filter((t) => t.status === "kesz").length;
    return (
      <div className="space-y-4">
        <MpHead icon="check" title="Kiadva a műhelynek" sub="A munka át lett adva a műhelynek — az alábbi feladatok élnek a Műhely-terminálban és az Üzemvezetőnél." />

        <div className="bg-white rounded-2xl border border-emerald-200 p-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-emerald-50 text-emerald-600"><Icon name="factory" size={22} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-stone-900">{rel.count} gyártási feladat kiadva</div>
              <div className="text-[11.5px] text-stone-500">{rel.by} · {rel.ts} · {(rel.steps || []).map((s) => s.kindLabel).join(" → ")}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[18px] font-semibold tabular-nums text-stone-900">{doneN}/{rel.count}</div>
              <div className="text-[10px] uppercase tracking-wide text-stone-400">kész</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
            {tasks.map((t) => {
              const s = stat[t.status] || {};
              return (
                <div key={t.id} className="flex items-center gap-2 text-[12px]">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium px-2 h-5 text-[10px] ${s.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}</span>
                  <span className="text-stone-800 truncate flex-1">{t.title}</span>
                  <span className="font-mono text-[10.5px] text-stone-400">{t.id}</span>
                </div>
              );
            })}
          </div>
          {(rel.deviations || []).length > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-100">
              <div className="text-[10.5px] uppercase tracking-wide text-amber-700 font-semibold mb-1.5 inline-flex items-center gap-1"><Icon name="route" size={12} />Naplózott folyamat-eltérések</div>
              <div className="space-y-1">
                {rel.deviations.map((d, i) => (
                  <div key={i} className="text-[11.5px] text-stone-600"><span className="font-medium text-stone-800">{d.what}</span> — {d.reason}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <button onClick={() => window.navigateTo && window.navigateTo("shopfloor")}
            className="h-11 px-4 rounded-xl text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 bg-teal-600 text-white hover:bg-teal-700">
            <Icon name="wrench" size={15} />Műhely-terminál megnyitása
          </button>
          <button onClick={() => window.navigateTo && window.navigateTo("supervisor", "dispatch")}
            className="h-11 px-4 rounded-xl text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 bg-white text-stone-700 border border-stone-200 hover:bg-stone-50">
            <Icon name="workflow" size={15} />Üzemvezető — diszpécser
          </button>
        </div>
        <div className="text-[11px] text-stone-400 text-center">A feladatok ütemezése (gép-nap) az Üzemvezető diszpécserében történik.</div>
      </div>
    );
  }

  // ── kiadás előtt ──
  const give = () => {
    if (!enabled.length) return;
    sim.releaseToWorkshop(source, plan);
  };

  const chips = [
    { l: "Feladat", v: enabled.length },
    { l: "Állomás", v: new Set(enabled.map((s) => s.machineId)).size },
    { l: "Munkaóra", v: Math.round(totalHours * 10) / 10 },
    { l: "Dokumentum", v: docCount },
  ];

  return (
    <div className="space-y-4">
      <MpHead icon="external" title="Kiadás a műhelynek"
        sub="Az útvonal bekapcsolt műveleteiből várólistás gyártási feladatok készülnek, a kiválasztott dokumentumokkal. A feladatokat azonnal látja a Műhely-terminál és az Üzemvezető." />

      <div className="grid grid-cols-4 gap-2">
        {chips.map((c) => (
          <div key={c.l} className="bg-stone-50 border border-stone-200/70 rounded-lg px-2.5 py-2 text-center">
            <div className="text-[9.5px] uppercase tracking-wide text-stone-500">{c.l}</div>
            <div className="text-[16px] font-semibold tabular-nums text-stone-900 leading-tight">{c.v}</div>
          </div>
        ))}
      </div>

      {!hasReleasedRajz && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-2.5 text-[12px] text-amber-800">
          <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
          <div>Nincs kiadott gyártási rajz — kiadható, de a műhely figyelmeztetést kap (a feladaton „nincs kiadott rajz" jelzés).</div>
        </div>
      )}

      {/* folyamat-eltérések a kiadásban */}
      {deviations.length > 0 && (
        <div className={`flex items-start gap-2.5 rounded-xl px-4 py-2.5 text-[12px] border ${devMissing ? "bg-amber-50 border-amber-200/70 text-amber-800" : "bg-stone-50 border-stone-200 text-stone-600"}`}>
          <Icon name="route" size={14} className="mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">{deviations.length} folyamat-eltérés</span> (átrendezés / alternatív gép) kerül a feladatok naplójába.
            {devMissing > 0
              ? <> <span className="font-semibold">{devMissing} indok hiányzik</span> — töltsd ki az Útvonal fül eltérés-naplójában; addig a kiadás zárolva.</>
              : " Minden eltérés indokolva."}
          </div>
        </div>
      )}

      {/* a leendő feladatok */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50">Létrejövő feladatok</div>
        {enabled.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12.5px] text-stone-400">Nincs bekapcsolt művelet az útvonalon — kapcsolj be legalább egyet.</div>
        ) : enabled.map((st, i) => {
          const soft = MP_SOFT[st.accent] || "bg-stone-100 text-stone-600";
          const station = window.ProdSchedEngine && window.ProdSchedEngine.stationById(st.machineId);
          return (
            <div key={st.kind} className="flex items-center gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0">
              <div className={`shrink-0 w-6 h-6 rounded-full grid place-items-center text-[11px] font-semibold bg-teal-600 text-white`}>{i + 1}</div>
              <div className={`shrink-0 w-8 h-8 rounded-lg grid place-items-center ${soft}`}><Icon name={st.icon} size={15} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-stone-900 truncate">{String(source.name || "").split("—")[0].trim()} — {st.kindLabel}</div>
                <div className="text-[10.5px] text-stone-400">{station ? station.name : "nincs gép"} · {st.hours} ó</div>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded-full bg-stone-100 text-stone-600 text-[10.5px] font-medium">várólista</span>
            </div>
          );
        })}
      </div>

      {outsourced.length > 0 && (
        <div className="text-[11.5px] text-stone-500 bg-amber-50/60 border border-amber-200/50 rounded-lg px-3 py-2">
          Bérmunkára jelölve (nem kerül a műhelysorba): {outsourced.map((s) => s.kindLabel).join(", ")} — a Bérmunka fülön add ki partnernek.
        </div>
      )}

      {/* megjegyzés */}
      <div>
        <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1">Megjegyzés a műhelynek</div>
        <textarea value={plan.note || ""} onChange={(e) => setPlan((p) => ({ ...p, note: e.target.value }))} rows={2}
          placeholder="Prioritás, határidő, anyag-megjegyzés…"
          className="w-full px-2.5 py-2 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-700 resize-none" />
      </div>

      <button onClick={give} disabled={!enabled.length || devMissing > 0}
        title={devMissing > 0 ? "Folyamat-eltérésnél indok kötelező — töltsd ki az Útvonal fül eltérés-naplóját." : undefined}
        className="w-full h-12 rounded-xl text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 bg-teal-600 text-white hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed">
        <Icon name="external" size={16} />{devMissing > 0 ? "Kiadás zárolva — eltérés-indok hiányzik" : `Kiadás a műhelynek — ${enabled.length} feladat`}
      </button>
    </div>
  );
}

Object.assign(window, { PrepRouting, PrepDocs, PrepRelease });
