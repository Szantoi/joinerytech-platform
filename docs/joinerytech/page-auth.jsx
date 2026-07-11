// ─────────────────────────────────────────────────────────────────
// page-auth.jsx — HATÁSKÖR-MÁTRIX (Beállítások → Hatáskörök) (4.8-B2)
//   Jóváhagyási értékküszöbök szerkesztése + a beérkező jóváhagyási kérelmek
//   kezelése (jóváhagy / elutasít). A limit feletti műveletek a „Feladataim"
//   jóváhagyások közt is megjelennek. Store: window.sim authConfig + approvals.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateAu } = React;

const _auhuf = (n) => Math.round(Number(n) || 0).toLocaleString("hu-HU");

function AuthStatusPill({ status }) {
  const t = (window.AUTH_STATUS || {})[status] || { label: status, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium px-2 h-6 text-[11.5px] ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}

function AuthorityPanel() {
  const sim = useSim();
  const cfg = sim.authConfig || {};
  const approvals = sim.approvals || [];
  const canManage = window.sim.hasPerm && window.sim.hasPerm("settings.manage");
  const canApprove = window.sim.hasPerm && window.sim.hasPerm("auth.approve");
  const limitKeys = (window.AUTH_ACTION_ORDER || []).map((t) => window.AUTH_ACTIONS[t].limitKey);
  const initDraft = () => limitKeys.reduce((o, k) => { o[k] = cfg[k]; return o; }, {});
  const [draft, setDraft] = useStateAu(initDraft());
  const [rejId, setRejId] = useStateAu(null);
  const [rejReason, setRejReason] = useStateAu("");
  const dirty = limitKeys.some((k) => Number(draft[k]) !== Number(cfg[k]));
  const pending = approvals.filter((a) => a.status === "fuggoben");
  const decided = approvals.filter((a) => a.status !== "fuggoben");

  return (
    <div className="space-y-4 max-w-[760px]">
      {/* Küszöbök */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="mb-1 text-[13px] font-semibold text-stone-900">Jóváhagyási küszöbök</div>
        <p className="text-[12px] text-stone-500 mb-4">E fölött a meglévő jogosultság MELLETT külön jóváhagyás (`auth.approve`) szükséges — a művelet addig „jóváhagyásra vár".</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(window.AUTH_ACTION_ORDER || []).map((type) => { const m = window.AUTH_ACTIONS[type]; const k = m.limitKey;
            return (
              <div key={type} className="rounded-xl border border-stone-200 p-3">
                <div className="flex items-center gap-1.5 mb-2"><Icon name={m.icon} size={14} className="text-stone-400" /><span className="text-[12px] font-medium text-stone-700">{m.label}</span></div>
                <div className="flex items-center gap-1">
                  <input type="number" value={draft[k] ?? ""} disabled={!canManage} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-indigo-500 disabled:bg-stone-50" />
                  <span className="text-[11px] text-stone-400 shrink-0 w-6">{m.unit}</span>
                </div>
                <div className="text-[10px] text-stone-400 mt-1">e fölött jóváhagyás</div>
              </div>
            ); })}
        </div>
        {canManage && (
          <div className="flex items-center gap-2 mt-4">
            <button disabled={!dirty} onClick={() => window.sim.setAuthConfig(limitKeys.reduce((o, k) => { o[k] = Number(draft[k]) || 0; return o; }, {}))} className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-[12.5px] font-medium disabled:opacity-40">Mentés</button>
            {dirty && <button onClick={() => setDraft(initDraft())} className="h-9 px-3 rounded-lg border border-stone-200 text-stone-600 text-[12.5px]">Mégse</button>}
          </div>
        )}
        {!canManage && <div className="text-[11px] text-amber-700 mt-3 inline-flex items-center gap-1.5"><Icon name="alert" size={13} />A küszöbök módosításához `settings.manage` jog kell.</div>}
      </div>

      {/* Kérelmek */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-stone-900">Jóváhagyási kérelmek</span>
          <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">{pending.length} nyitott</span>
        </div>
        {!approvals.length && <div className="px-4 py-10 text-center text-[12.5px] text-stone-400">Nincs jóváhagyási kérelem.</div>}
        {[...pending, ...decided].map((a) => { const m = (window.AUTH_ACTIONS || {})[a.type] || {}; const isPending = a.status === "fuggoben";
          return (
            <div key={a.id} className="px-4 py-3 border-b border-stone-100 last:border-0">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-amber-50 text-amber-600"><Icon name={m.icon || "check"} size={17} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-stone-900">{a.title}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">{a.id} · {m.label} · kérte: {a.requestedBy}{a.createdAt ? ` · ${a.createdAt}` : ""}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <AuthStatusPill status={a.status} />
                    <span className="text-[11px] text-stone-600">Érték: <span className="font-semibold text-stone-900">{_auhuf(a.amount)}{m.unit === "%" ? "%" : " " + (m.unit || "Ft")}</span></span>
                    <span className="text-[10.5px] text-stone-400">limit {_auhuf(a.limit)}{m.unit === "%" ? "%" : " " + (m.unit || "Ft")}</span>
                    {a.approver && <span className="text-[10.5px] text-stone-400">· {a.status === "jovahagyva" ? "jóváhagyta" : "elutasította"}: {a.approver}</span>}
                  </div>
                  {a.reason && <div className="text-[11px] text-stone-500 mt-1 italic">„{a.reason}"</div>}
                  {isPending && canApprove && rejId !== a.id && (
                    <div className="flex items-center gap-2 mt-2.5">
                      <button onClick={() => window.sim.decideApproval(a.id, true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white text-[12px] font-medium hover:bg-emerald-700"><Icon name="check" size={13} />Jóváhagy</button>
                      <button onClick={() => { setRejId(a.id); setRejReason(""); }} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-stone-200 text-stone-600 text-[12px] font-medium hover:bg-stone-50"><Icon name="x" size={13} />Elutasít</button>
                    </div>
                  )}
                  {isPending && canApprove && rejId === a.id && (
                    <div className="mt-2.5 rounded-lg border border-stone-200 bg-stone-50 p-2.5">
                      <textarea value={rejReason} onChange={(e) => setRejReason(e.target.value)} rows={2} placeholder="Elutasítás oka…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-stone-400" />
                      <div className="flex items-center gap-2 mt-2"><button onClick={() => { window.sim.decideApproval(a.id, false, { reason: rejReason }); setRejId(null); }} className="h-8 px-3 rounded-lg bg-rose-600 text-white text-[12px] font-medium">Elutasít</button><button onClick={() => setRejId(null)} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button></div>
                    </div>
                  )}
                  {isPending && !canApprove && <div className="text-[10.5px] text-amber-700 mt-2 inline-flex items-center gap-1"><Icon name="alert" size={12} />A döntéshez `auth.approve` jog kell.</div>}
                </div>
              </div>
            </div>
          ); })}
      </div>
    </div>
  );
}

Object.assign(window, { AuthStatusPill, AuthorityPanel });
