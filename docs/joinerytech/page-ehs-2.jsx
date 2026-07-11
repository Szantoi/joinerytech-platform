// ─────────────────────────────────────────────────────────────────
// page-ehs-2.jsx — EHS detail SlideOverök + sheetek
//   IncDetail (incidens-FSM + CAPA + napló) · NewIncSheet ·
//   RiskDetail (5×5 mátrix + kontrollok + maradék-kockázat + felülvizsg.) ·
//   RiskDetailHost · NewRiskSheet · NewTrainingSheet.
//   A közös pill-ek a page-ehs.jsx-ben (window.*).
// ─────────────────────────────────────────────────────────────────
const { useState: useStateE2 } = React;

// ── Incidens-részlet (FSM + CAPA + napló) ────────────────────────
function IncDetail({ inc, onClose }) {
  const sim = useSim();
  const live = (sim.ehsIncidents || []).find((x) => x.id === inc.id) || inc;
  const E = window.EhsEngine;
  const next = E ? E.nextStates(live) : [];
  const prog = E ? E.actionProgress(live) : { done: 0, total: 0, open: 0 };
  const [rejectOpen, setRejectOpen] = useStateE2(false);
  const [rejectText, setRejectText] = useStateE2("");
  const [actText, setActText] = useStateE2("");
  const [actOwner, setActOwner] = useStateE2("");
  const [actDue, setActDue] = useStateE2("");
  const canManage = sim.hasPerm("ehs.manage");
  const people = (sim.employees || []).filter((e) => e.active !== false);

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="flex items-center gap-2 flex-wrap">
        <window.EhsTypeBadge type={live.type} /><window.EhsStatusPill status={live.status} /><window.EhsSevPill sev={live.sev} /><window.EhsSlaBadge inc={live} />
      </div>
      <window.EhsStepper inc={live} />

      <div className="rounded-xl border border-stone-200 p-3 space-y-1.5">
        {live.note && <div className="text-[12.5px] text-stone-700">{live.note}</div>}
        {live.location && <div className="flex items-center gap-2 text-[12px] text-stone-600"><Icon name="pin" size={14} className="text-stone-400" />{live.location}</div>}
        {live.assetLabel && <button onClick={() => window.navigateTo && window.navigateTo("maintenance", "assets")} className="flex items-center gap-2 text-[12px] text-stone-600 hover:text-red-700"><Icon name="wrench" size={14} className="text-stone-400" />{live.assetLabel}<span className="font-mono text-[10.5px] text-stone-400">· {live.assetId}</span></button>}
        <div className="flex items-center gap-3 text-[11px] text-stone-400 pt-1 flex-wrap">
          <span className="inline-flex items-center gap-1"><Icon name="user" size={12} />Bejelentő: {live.reporter || "—"}</span>
          {live.investigator && <span className="inline-flex items-center gap-1"><Icon name="search" size={12} />Vizsgáló: {live.investigator}</span>}
          <span>Esemény: {live.occurredAt}</span>
        </div>
      </div>

      {/* FSM akciók */}
      {E && E.isOpen(live) && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Kivizsgálás / léptetés</div>
          {!canManage && <div className="text-[11.5px] text-stone-400 mb-2 inline-flex items-center gap-1"><Icon name="lock" size={12} />Státuszváltáshoz <span className="font-mono">ehs.manage</span> jog kell.</div>}
          <div className="flex items-center gap-2 flex-wrap">
            {next.map((to) => {
              const st = window.EHS_INC_STATUS[to] || {};
              const reject = to === "elutasitva", close = to === "lezarva";
              return <button key={to} disabled={!canManage} onClick={() => { if (reject) { setRejectOpen(true); } else { window.sim.setEhsIncidentStatus(live.id, to); } }} className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium disabled:opacity-40 ${close ? "bg-emerald-600 text-white hover:bg-emerald-700" : reject ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-red-600 text-white hover:bg-red-700"}`}>{close ? <Icon name="check" size={14} /> : reject ? <Icon name="x" size={14} /> : <Icon name="arrow-right" size={14} />}{st.label}</button>;
            })}
          </div>
          {rejectOpen && (
            <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <label className="text-[11px] text-stone-600 font-medium block mb-1">Elutasítás indoka (kötelező)</label>
              <textarea value={rejectText} onChange={(e) => setRejectText(e.target.value)} rows={2} className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-stone-400" placeholder="Pl. nem munkavédelmi esemény…" />
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => { if (window.sim.setEhsIncidentStatus(live.id, "elutasitva", { reason: rejectText })) { setRejectOpen(false); setRejectText(""); } }} className="h-8 px-3 rounded-lg bg-rose-600 text-white text-[12px] font-medium">Elutasítás</button>
                <button onClick={() => { setRejectOpen(false); setRejectText(""); }} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button>
              </div>
            </div>
          )}
        </div>
      )}
      {live.status === "lezarva" && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2"><Icon name="check" size={16} className="text-emerald-600" /><div className="text-[12.5px] font-medium text-emerald-800">Lezárva{live.closedAt ? ` · ${live.closedAt}` : ""} — minden intézkedés végrehajtva.</div></div>}
      {live.status === "elutasitva" && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-center gap-2"><Icon name="x" size={16} className="text-rose-600" /><div className="text-[12.5px] font-medium text-rose-800">Elutasítva — nem munkavédelmi esemény.</div></div>}

      {/* CAPA — korrekciós intézkedések */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Korrekciós intézkedések (CAPA)</div>
          <div className="text-[11px] text-stone-500">{prog.done}/{prog.total} kész</div>
        </div>
        {(live.actions || []).length > 0 && (
          <div className="space-y-1.5 mb-2">
            {live.actions.map((a) => {
              const overdue = !a.done && a.due && a.due < window.EHS_TODAY;
              return (
                <div key={a.id} className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-stone-200">
                  <button onClick={() => window.sim.toggleEhsAction(live.id, a.id)} className={`w-5 h-5 rounded grid place-items-center shrink-0 border mt-0.5 ${a.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-stone-300 bg-white"}`}>{a.done ? <Icon name="check" size={13} /> : null}</button>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[12.5px] ${a.done ? "text-stone-400 line-through" : "text-stone-700"}`}>{a.text}</div>
                    <div className="flex items-center gap-2 text-[10.5px] text-stone-400 mt-0.5 flex-wrap">{a.owner && <span className="inline-flex items-center gap-1"><Icon name="user" size={10} />{a.owner}</span>}{a.due && <span className={`inline-flex items-center gap-1 ${overdue ? "text-rose-600 font-medium" : ""}`}><Icon name="clock" size={10} />{a.due}{overdue ? " · lejárt" : ""}</span>}</div>
                  </div>
                  <button onClick={() => window.sim.removeEhsAction(live.id, a.id)} className="text-stone-300 hover:text-rose-500 shrink-0"><Icon name="x" size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
        {E && E.isOpen(live) && (
          <div className="rounded-xl border border-stone-200 p-2.5 space-y-2">
            <textarea value={actText} onChange={(e) => setActText(e.target.value)} rows={1} placeholder="Intézkedés leírása…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-red-500 resize-none" />
            <div className="flex items-center gap-2">
              <select value={actOwner} onChange={(e) => setActOwner(e.target.value)} className="flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-red-500">
                <option value="">Felelős…</option>
                {people.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
              <input type="date" value={actDue} onChange={(e) => setActDue(e.target.value)} className="h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-red-500" />
              <button disabled={!actText.trim()} onClick={() => { window.sim.addEhsAction(live.id, { text: actText, owner: actOwner, due: actDue }); setActText(""); setActOwner(""); setActDue(""); }} className="h-8 px-3 rounded-lg bg-stone-900 text-white text-[12px] font-medium disabled:opacity-40 shrink-0">Hozzáad</button>
            </div>
          </div>
        )}
      </div>

      {/* napló */}
      {(live.log || []).length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Napló</div>
          <div className="space-y-1.5">{live.log.slice().reverse().map((l, i) => <div key={i} className="flex items-start gap-2 text-[11.5px]"><span className="w-1.5 h-1.5 rounded-full bg-stone-300 mt-1.5 shrink-0" /><span className="text-stone-400 font-mono text-[10.5px] shrink-0">{l.at}</span><span className="text-stone-600">{l.text}</span></div>)}</div>
        </div>
      )}
    </div>
  );
}

// ── Új bejelentés sheet ──────────────────────────────────────────
function NewIncSheet({ onClose, onCreated }) {
  const sim = useSim();
  const [type, setType] = useStateE2("kvazi");
  const [sev, setSev] = useStateE2("konnyu");
  const [subject, setSubject] = useStateE2("");
  const [location, setLocation] = useStateE2("");
  const [note, setNote] = useStateE2("");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-red-500";
  const create = () => { if (!subject.trim()) return; const id = window.sim.addEhsIncident({ type, sev, subject, location, note }); if (id && onCreated) onCreated(id); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[500px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"><div className="text-[14px] font-semibold text-stone-900">Munkavédelmi bejelentés</div><button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button></div>
        <div className="px-4 py-4 space-y-3.5">
          <div className="flex items-center gap-2">
            {window.EHS_INC_TYPE_ORDER.map((k) => { const m = window.EHS_INC_TYPE[k]; const on = type === k; return (
              <button key={k} onClick={() => setType(k)} className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border ${on ? "border-red-500 bg-red-50" : "border-stone-200 bg-white"}`}><Icon name={m.icon} size={18} className={on ? "text-red-700" : "text-stone-400"} /><span className={`text-[11px] font-medium text-center leading-tight ${on ? "text-red-800" : "text-stone-600"}`}>{m.short}</span></button>
            ); })}
          </div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Mi történt? *</label><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Rövid leírás" className={cls} /></div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Helyszín</label><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Pl. Vác — főüzem, szabászat" className={cls} /></div>
          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">Súlyosság</label>
            <div className="flex items-center gap-1.5">{window.EHS_INC_SEV_ORDER.map((k) => { const s = window.EHS_INC_SEV[k]; const on = sev === k; return <button key={k} onClick={() => setSev(k)} className={`flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg text-[11.5px] font-medium border ${on ? s.pill : "bg-white text-stone-500 border-stone-200"}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.short}</button>; })}</div>
          </div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Részletek</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Mi történt, hogyan, ki érintett…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-red-500" /></div>
          <button disabled={!subject.trim()} onClick={create} className="w-full h-10 rounded-xl bg-red-600 text-white text-[13px] font-semibold disabled:opacity-40">Bejelentés rögzítése</button>
        </div>
      </div>
    </div>
  );
}

// ── Kockázati mátrix (5×5) ───────────────────────────────────────
function RiskMatrix({ L, S, onPick }) {
  const E = window.EhsEngine;
  const rows = [5, 4, 3, 2, 1]; // súlyosság (fentről)
  const cols = [1, 2, 3, 4, 5]; // valószínűség
  return (
    <div className="inline-flex flex-col gap-0.5">
      <div className="flex items-stretch gap-0.5">
        <div className="w-7" />
        {cols.map((c) => <div key={c} className="w-9 text-center text-[9px] text-stone-400 font-medium">{c}</div>)}
      </div>
      {rows.map((s) => (
        <div key={s} className="flex items-stretch gap-0.5">
          <div className="w-7 grid place-items-center text-[9px] text-stone-400 font-medium">{s}</div>
          {cols.map((c) => {
            const sc = s * c; const band = E.band(sc); const active = (L === c && S === s);
            return (
              <button key={c} onClick={onPick ? () => onPick(c, s) : undefined} disabled={!onPick}
                className={`w-9 h-8 rounded-md grid place-items-center text-[10.5px] font-semibold tabular-nums ${active ? "ring-2 ring-stone-900 ring-offset-1" : ""}`}
                style={{ background: band.cell + (active ? "" : "33"), color: active ? "#fff" : band.cell }}>{sc}</button>
            );
          })}
        </div>
      ))}
      <div className="flex items-center gap-3 mt-1.5 ml-7">
        <span className="text-[9px] text-stone-400">↑ Súlyosság · Valószínűség →</span>
      </div>
    </div>
  );
}

// ── Kockázat-részlet ─────────────────────────────────────────────
function RiskDetail({ risk, onClose }) {
  const sim = useSim();
  const live = (sim.ehsRisks || []).find((x) => x.id === risk.id) || risk;
  const E = window.EhsEngine;
  const canManage = sim.hasPerm("ehs.manage");
  const [ctrlText, setCtrlText] = useStateE2("");
  const due = E.isReviewDue(live);
  const days = E.reviewDays(live);

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11.5px] text-stone-500">{live.scope}</span>
        <window.EhsRiskBadge risk={live} />
      </div>
      {live.hazard && <div className="rounded-xl border border-stone-200 p-3 text-[12.5px] text-stone-700">{live.hazard}</div>}

      {/* mátrix — eredeti (kontroll előtti) kockázat */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Kockázati besorolás (kontroll előtt)</div>
        <div className="flex items-center gap-4 flex-wrap">
          <RiskMatrix L={live.likelihood} S={live.severity} onPick={canManage ? (l, s) => window.sim.updateEhsRisk(live.id, { likelihood: l, severity: s }) : null} />
          <div className="space-y-1 text-[11.5px] text-stone-600">
            <div>Valószínűség: <span className="font-semibold">{live.likelihood}</span> — {(window.EHS_SCALE || {})[live.likelihood]}</div>
            <div>Súlyosság: <span className="font-semibold">{live.severity}</span> — {(window.EHS_SEV_SCALE || {})[live.severity]}</div>
            <div className="pt-1">Pontszám: <span className="font-semibold tabular-nums">{E.score(live)}</span></div>
          </div>
        </div>
        {canManage && <div className="text-[10.5px] text-stone-400 mt-1.5">A mátrix celláira kattintva állítható a besorolás.</div>}
      </div>

      {/* kontrollok */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Védőintézkedések</div>
        <div className="space-y-1.5 mb-2">
          {(live.controls || []).map((c, idx) => (
            <div key={idx} className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-stone-200">
              <Icon name="shield" size={14} className="text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-[12px] text-stone-700 flex-1">{c}</span>
              {canManage && <button onClick={() => window.sim.removeEhsRiskControl(live.id, idx)} className="text-stone-300 hover:text-rose-500 shrink-0"><Icon name="x" size={14} /></button>}
            </div>
          ))}
          {!(live.controls || []).length && <div className="text-[12px] text-stone-400">Nincs rögzített védőintézkedés.</div>}
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <input value={ctrlText} onChange={(e) => setCtrlText(e.target.value)} placeholder="Új védőintézkedés…" className="flex-1 h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-red-500" />
            <button disabled={!ctrlText.trim()} onClick={() => { window.sim.addEhsRiskControl(live.id, ctrlText); setCtrlText(""); }} className="h-8 px-3 rounded-lg bg-stone-900 text-white text-[12px] font-medium disabled:opacity-40 shrink-0">Hozzáad</button>
          </div>
        )}
      </div>

      {/* maradék kockázat */}
      <div className="rounded-xl border border-stone-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Maradék kockázat (kontroll után)</div>
          <window.EhsRiskBadge risk={live} residual size="sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">Valószínűség</label>
            <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} disabled={!canManage} onClick={() => window.sim.updateEhsRisk(live.id, { resL: n })} className={`flex-1 h-7 rounded-md text-[11px] font-semibold ${(live.resL || live.likelihood) === n ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500"} disabled:opacity-60`}>{n}</button>)}</div>
          </div>
          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">Súlyosság</label>
            <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} disabled={!canManage} onClick={() => window.sim.updateEhsRisk(live.id, { resS: n })} className={`flex-1 h-7 rounded-md text-[11px] font-semibold ${(live.resS || live.severity) === n ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500"} disabled:opacity-60`}>{n}</button>)}</div>
          </div>
        </div>
      </div>

      {/* felülvizsgálat */}
      <div className={`rounded-xl border p-3 flex items-center gap-3 ${due ? "border-rose-200 bg-rose-50" : "border-stone-200 bg-stone-50/60"}`}>
        <Icon name="calendar" size={16} className={due ? "text-rose-600 shrink-0" : "text-stone-400 shrink-0"} />
        <div className="min-w-0 flex-1">
          <div className={`text-[12px] font-medium ${due ? "text-rose-800" : "text-stone-700"}`}>Felülvizsgálat: {live.reviewDue}{due ? " — lejárt" : days != null ? ` (${days} nap)` : ""}</div>
          <div className="text-[10.5px] text-stone-400">Felelős: {live.owner || "—"} · Utolsó értékelés: {live.assessedAt}</div>
        </div>
        {canManage && <button onClick={() => window.sim.reviewEhsRisk(live.id)} className="h-8 px-3 rounded-lg bg-red-600 text-white text-[12px] font-medium shrink-0 inline-flex items-center gap-1"><Icon name="rotate" size={13} />Felülvizsgálat</button>}
      </div>
    </div>
  );
}

function RiskDetailHost({ openId, setOpen }) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const risk = openId ? (sim.ehsRisks || []).find((x) => x.id === openId) : null;
  const onClose = () => setOpen(null);
  return (
    <SO open={!!risk} onClose={onClose} title={risk ? risk.title : ""} subtitle={risk ? `${risk.id} · ${risk.scope}` : ""} width={560}>
      {risk ? <RiskDetail risk={risk} onClose={onClose} /> : null}
    </SO>
  );
}

// ── Új kockázatértékelés sheet ───────────────────────────────────
function NewRiskSheet({ onClose, onCreated }) {
  const sim = useSim();
  const [title, setTitle] = useStateE2("");
  const [scope, setScope] = useStateE2("");
  const [hazard, setHazard] = useStateE2("");
  const [L, setL] = useStateE2(3);
  const [S, setS] = useStateE2(3);
  const [owner, setOwner] = useStateE2("");
  const people = (sim.employees || []).filter((e) => e.active !== false);
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-red-500";
  const create = () => { if (!title.trim()) return; const id = window.sim.addEhsRisk({ title, scope, hazard, likelihood: L, severity: S, owner }); if (id && onCreated) onCreated(id); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[520px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"><div className="text-[14px] font-semibold text-stone-900">Új kockázatértékelés</div><button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button></div>
        <div className="px-4 py-4 space-y-3.5">
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Megnevezés *</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pl. Körfűrész — vágási sérülés" className={cls} /></div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Hatókör (gép / munkahely)</label><input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Pl. Szabászat (gép)" className={cls} /></div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Veszély leírása</label><textarea value={hazard} onChange={(e) => setHazard(e.target.value)} rows={2} placeholder="Mi a veszélyforrás?" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-red-500" /></div>
          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1.5">Besorolás (kattints a mátrixra)</label>
            <RiskMatrix L={L} S={S} onPick={(l, s) => { setL(l); setS(s); }} />
          </div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Felelős</label>
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className={cls}>
              <option value="">Válassz…</option>
              {people.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          <button disabled={!title.trim()} onClick={create} className="w-full h-10 rounded-xl bg-red-600 text-white text-[13px] font-semibold disabled:opacity-40">Értékelés létrehozása</button>
        </div>
      </div>
    </div>
  );
}

// ── Új oktatás-rekord sheet ──────────────────────────────────────
function NewTrainingSheet({ onClose, onCreated }) {
  const sim = useSim();
  const people = (sim.employees || []).filter((e) => e.active !== false);
  const [empId, setEmpId] = useStateE2(people[0] ? people[0].id : "");
  const [kind, setKind] = useStateE2("munkavedelmi");
  const [completedAt, setCompletedAt] = useStateE2(window.EHS_TODAY);
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-red-500";
  const create = () => { if (!empId || !kind) return; window.sim.addEhsTraining({ empId, kind, completedAt }); if (onCreated) onCreated(); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[460px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"><div className="text-[14px] font-semibold text-stone-900">Oktatás rögzítése</div><button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button></div>
        <div className="px-4 py-4 space-y-3.5">
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Dolgozó *</label>
            <select value={empId} onChange={(e) => setEmpId(e.target.value)} className={cls}>{people.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.role}</option>)}</select>
          </div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Oktatás típusa</label>
            <div className="grid grid-cols-1 gap-1.5">{window.EHS_TRAIN_KIND_ORDER.map((k) => { const m = window.EHS_TRAIN_KIND[k]; const on = kind === k; return (
              <button key={k} onClick={() => setKind(k)} className={`flex items-center gap-2 px-2.5 h-9 rounded-lg border text-[12px] font-medium ${on ? "border-red-500 bg-red-50 text-red-800" : "border-stone-200 bg-white text-stone-600"}`}><Icon name={m.icon} size={14} className={on ? "text-red-600" : "text-stone-400"} />{m.label}<span className="ml-auto text-[10px] text-stone-400">{m.validMonths} hó</span></button>
            ); })}</div>
          </div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Elvégzés dátuma</label><input type="date" value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} className={cls} /></div>
          <button disabled={!empId} onClick={create} className="w-full h-10 rounded-xl bg-red-600 text-white text-[13px] font-semibold disabled:opacity-40">Rögzítés</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  IncDetail, NewIncSheet, RiskMatrix, RiskDetail, RiskDetailHost, NewRiskSheet, NewTrainingSheet,
});
