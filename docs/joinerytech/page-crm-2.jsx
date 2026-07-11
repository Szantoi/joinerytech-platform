// ─────────────────────────────────────────────────────────────────
// page-crm-2.jsx — CRM / LEAD-PIPELINE világ (2/2)
//   LeadDetail (SlideOver: FSM + konverzió lehetőséggé + tevékenység-napló +
//   feladat), OppDetail (SlideOver: FSM + ajánlat-készítés → createQuote +
//   megnyerés → új ügyfél + B2B kiadás + napló), NewCrmSheet (lead VAGY
//   lehetőség felvétel), CrmTasks (feladatok SLA-val). Store: window.sim.* + CrmEngine.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateC2 } = React;

// tevékenység-napló komponens (típus-chip + szöveg → onAdd)
function ActivityComposer({ onAdd }) {
  const [kind, setKind] = useStateC2("hivas");
  const [text, setText] = useStateC2("");
  return (
    <div className="rounded-xl border border-stone-200 p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        {(window.CRM_ACT_ORDER || []).map((k) => {
          const m = window.CRM_ACT_META[k]; const on = kind === k;
          return <button key={k} onClick={() => setKind(k)} className={`inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-medium border ${on ? "bg-blue-600 text-white border-blue-600" : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"}`}><Icon name={m.icon} size={12} />{m.label}</button>;
        })}
      </div>
      <div className="flex items-end gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder="Tevékenység rögzítése…" className="flex-1 px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-blue-500 resize-none" />
        <button disabled={!text.trim()} onClick={() => { onAdd({ kind, text }); setText(""); }} className="h-9 px-3 rounded-lg bg-stone-900 text-white text-[12px] font-medium disabled:opacity-40 shrink-0">Rögzít</button>
      </div>
    </div>
  );
}

// tevékenység-idővonal
function ActivityTimeline({ activities }) {
  if (!activities || !activities.length) return null;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Tevékenység-napló</div>
      <div className="space-y-2">
        {activities.slice().reverse().map((a, i) => {
          const m = (window.CRM_ACT_META || {})[a.kind] || {};
          return (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg grid place-items-center shrink-0 mt-0.5" style={{ background: (m.accent || "#78716c") + "1a", color: m.accent || "#78716c" }}><Icon name={m.icon || "chat"} size={12} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] text-stone-700">{a.text}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">{a.who} · {a.at}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// gyors feladat-hozzáadás (entitáshoz kötve)
function QuickTaskAdd({ refType, refId }) {
  const sim = useSim();
  const [open, setOpen] = useStateC2(false);
  const [title, setTitle] = useStateC2("");
  const [due, setDue] = useStateC2(window.CRM_TODAY || "2026-04-28");
  const [prio, setPrio] = useStateC2("kozepes");
  const tasks = (sim.crmTasks || []).filter((t) => t.refId === refId);

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Feladatok</div>
      {tasks.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-[12px]">
              <button onClick={() => window.sim.toggleCrmTask(t.id)} className={`w-4 h-4 rounded border grid place-items-center shrink-0 ${t.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-stone-300 bg-white"}`}>{t.done && <Icon name="check" size={11} />}</button>
              <span className={`flex-1 min-w-0 truncate ${t.done ? "text-stone-400 line-through" : "text-stone-700"}`}>{t.title}</span>
              <window.TaskSlaBadge task={t} size="sm" />
            </div>
          ))}
        </div>
      )}
      {open ? (
        <div className="rounded-xl border border-stone-200 p-2.5 space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Feladat címe…" className="w-full h-8 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-blue-500" />
          <div className="flex items-center gap-2">
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-8 px-2 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-blue-500" />
            <select value={prio} onChange={(e) => setPrio(e.target.value)} className="h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-blue-500">
              {(window.CRM_TASK_PRIORITY_ORDER || []).map((k) => <option key={k} value={k}>{window.CRM_TASK_PRIORITY[k].label}</option>)}
            </select>
            <button disabled={!title.trim()} onClick={() => { window.sim.addCrmTask({ refType, refId, title, due, priority: prio }); setTitle(""); setOpen(false); }} className="h-8 px-3 rounded-lg bg-blue-600 text-white text-[12px] font-medium disabled:opacity-40 ml-auto">Hozzáad</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="text-[12px] text-blue-600 font-medium inline-flex items-center gap-1"><Icon name="plus" size={13} />Feladat hozzáadása</button>
      )}
    </div>
  );
}

// ── LEAD részlet ─────────────────────────────────────────────────
function LeadDetail({ l, onClose, onOpen }) {
  const sim = useSim();
  const live = (sim.leads || []).find((x) => x.id === l.id) || l;
  const E = window.CrmEngine;
  const next = E ? E.leadNext(live).filter((s) => s !== "konvertalva") : [];
  const canConvert = E ? E.leadCanGo(live, "konvertalva") : false;
  const [rejOpen, setRejOpen] = useStateC2(false);
  const [rejText, setRejText] = useStateC2("");

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="flex items-center gap-2 flex-wrap">
        <window.SourceBadge source={live.source} />
        <window.LeadStatusPill status={live.status} />
        {live.estValue > 0 && <span className="text-[12.5px] font-semibold text-stone-700">~{window.crmMoney(live.estValue)}</span>}
      </div>

      <window.CrmStepper flow={window.LEAD_FLOW} statusMap={window.LEAD_STATUS} status={live.status} terminalKey="elvetve" terminalLabel="Elvetve" />

      <div className="rounded-xl border border-stone-200 p-3 space-y-1.5">
        {live.interest && <div className="text-[12.5px] text-stone-700">{live.interest}</div>}
        <div className="flex items-center gap-2 text-[12px] text-stone-600 pt-1"><Icon name="user" size={14} className="text-stone-400" />{live.contact}{live.company && <span className="text-stone-400">· {live.company}</span>}</div>
        {live.phone && <div className="flex items-center gap-2 text-[12px] text-stone-600"><Icon name="phone" size={14} className="text-stone-400" /><a href={`tel:${live.phone}`} className="text-blue-700">{live.phone}</a></div>}
        {live.email && <div className="flex items-center gap-2 text-[12px] text-stone-600"><Icon name="send" size={14} className="text-stone-400" /><a href={`mailto:${live.email}`} className="text-blue-700">{live.email}</a></div>}
        <div className="flex items-center gap-3 text-[11px] text-stone-400 pt-1">
          {live.city && <span className="inline-flex items-center gap-1"><Icon name="pin" size={12} />{live.city}</span>}
          <span>Felvéve: {live.createdAt}</span>
          {live.referredBy && <span>Ajánló: {live.referredBy}</span>}
        </div>
        <div className="text-[11px] text-stone-400">Felelős: {live.owner}</div>
      </div>

      {/* konvertálva → link a lehetőséghez */}
      {live.status === "konvertalva" && live.oppId && (
        <button onClick={() => onOpen && onOpen(live.oppId)} className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 flex items-center gap-2 hover:bg-emerald-100/60">
          <Icon name="briefcase" size={16} className="text-emerald-600" />
          <span className="text-[12.5px] font-medium text-emerald-800 flex-1 text-left">Lehetőséggé konvertálva: {live.oppId}</span>
          <Icon name="arrow-right" size={15} className="text-emerald-500" />
        </button>
      )}

      {/* konverzió + FSM léptetés */}
      {E && E.leadIsOpen(live) && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Művelet</div>
          {canConvert && (
            <button onClick={() => { const id = window.sim.convertLeadToOpp(live.id); if (id && onOpen) onOpen(id); }} className="w-full mb-2 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold"><Icon name="arrow-right" size={15} />Konvertálás lehetőséggé</button>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {next.map((to) => {
              const st = window.LEAD_STATUS[to] || {};
              const rej = to === "elvetve";
              return <button key={to} onClick={() => { if (rej) { setRejOpen(true); } else { window.sim.setLeadStatus(live.id, to); } }} className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${rej ? "bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200" : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"}`}>{rej ? <Icon name="x" size={14} /> : <Icon name="arrow-right" size={14} />}{st.label}</button>;
            })}
          </div>
          {rejOpen && (
            <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <label className="text-[11px] text-stone-600 font-medium block mb-1">Elvetés oka (kötelező)</label>
              <textarea value={rejText} onChange={(e) => setRejText(e.target.value)} rows={2} className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-stone-400" placeholder="Pl. budget-eltérés, nem a profilunk…" />
              <div className="flex items-center gap-2 mt-2">
                <button disabled={!rejText.trim()} onClick={() => { if (window.sim.setLeadStatus(live.id, "elvetve", { reason: rejText })) { setRejOpen(false); setRejText(""); } }} className="h-8 px-3 rounded-lg bg-stone-700 text-white text-[12px] font-medium disabled:opacity-40">Elvetés</button>
                <button onClick={() => { setRejOpen(false); setRejText(""); }} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button>
              </div>
            </div>
          )}
        </div>
      )}
      {live.status === "elvetve" && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <div className="text-[11px] text-stone-400 mb-0.5">Elvetve</div>
          {live.lostReason && <div className="text-[12px] text-stone-600">{live.lostReason}</div>}
          <button onClick={() => window.sim.setLeadStatus(live.id, "uj")} className="mt-2 text-[12px] text-blue-600 font-medium">Újranyitás</button>
        </div>
      )}

      <QuickTaskAdd refType="lead" refId={live.id} />
      <ActivityComposer onAdd={({ kind, text }) => window.sim.addLeadActivity(live.id, { kind, text })} />
      <ActivityTimeline activities={live.activities} />
    </div>
  );
}

// ── LEHETŐSÉG részlet ────────────────────────────────────────────
function OppDetail({ o, onClose, onOpen }) {
  const sim = useSim();
  const live = (sim.opportunities || []).find((x) => x.id === o.id) || o;
  const E = window.CrmEngine;
  const next = E ? E.oppNext(live) : [];
  const prob = E ? E.oppProb(live) : 0;
  const [rejOpen, setRejOpen] = useStateC2(false);
  const [rejText, setRejText] = useStateC2("");
  const [delegOpen, setDelegOpen] = useStateC2(false);
  const partners = (sim.partners || []).filter((p) => p.platform);
  const canQuote = window.sim.hasPerm && window.sim.hasPerm("quote.create");

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="flex items-center gap-2 flex-wrap">
        <window.SourceBadge source={live.source} />
        <window.OppStatusPill status={live.status} />
        {live.isNewCustomer && <span className="text-[10px] px-1.5 h-5 inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">új ügyfél</span>}
      </div>

      <window.CrmStepper flow={window.OPP_FLOW} statusMap={window.OPP_STATUS} status={live.status} terminalKey="elveszett" terminalLabel="Elveszett" />

      {/* érték + súlyozott */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-stone-200 p-3"><div className="text-[10.5px] text-stone-400 mb-0.5">Érték</div><div className="text-[15px] font-semibold text-stone-900">{window.crmMoney(live.value)}</div></div>
        <div className="rounded-xl border border-stone-200 p-3"><div className="text-[10.5px] text-stone-400 mb-0.5">Súlyozott ({Math.round(prob * 100)}%)</div><div className="text-[15px] font-semibold text-blue-700">{window.crmMoney(E ? E.oppWeighted(live) : 0)}</div></div>
      </div>

      <div className="rounded-xl border border-stone-200 p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-[12px] text-stone-600"><Icon name="user" size={14} className="text-stone-400" />{live.contact || live.customer}{live.contact && <span className="text-stone-400">· {live.customer}</span>}</div>
        {live.phone && <div className="flex items-center gap-2 text-[12px] text-stone-600"><Icon name="phone" size={14} className="text-stone-400" /><a href={`tel:${live.phone}`} className="text-blue-700">{live.phone}</a></div>}
        <div className="flex items-center gap-3 text-[11px] text-stone-400 pt-1">
          {live.city && <span className="inline-flex items-center gap-1"><Icon name="pin" size={12} />{live.city}</span>}
          {live.expectedClose && <span>Várható zárás: {live.expectedClose}</span>}
          <span>Felelős: {live.owner}</span>
        </div>
        {live.fromLead && <button onClick={() => onOpen && onOpen(live.fromLead)} className="text-[11px] text-blue-600 font-medium inline-flex items-center gap-1"><Icon name="route" size={12} />Forrás lead: {live.fromLead}</button>}
      </div>

      {/* ajánlat-kapcsolat → Sales világ createQuote */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Ajánlat</div>
        {live.quoteId ? (
          <button onClick={() => { window._pendingOpen = { type: "quote", id: live.quoteId }; window.navigateTo && window.navigateTo("sales", "quotes"); }} className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 flex items-center gap-2 hover:bg-indigo-100/60">
            <Icon name="file" size={16} className="text-indigo-600 shrink-0" />
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[12.5px] font-medium text-indigo-800">Vázlat-ajánlat: {live.quoteId}</div>
              <div className="text-[10.5px] text-indigo-600/80">{live.status === "osszeallitas" ? "Összeállításra vár az Értékesítésben →" : "Megnyitás az Értékesítésben →"}</div>
            </div>
            <Icon name="external" size={14} className="text-indigo-500 shrink-0" />
          </button>
        ) : E && E.oppIsOpen(live) ? (
          <button disabled={!canQuote} onClick={() => window.sim.oppCreateQuote(live.id)} className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-medium disabled:opacity-40" title={canQuote ? "" : "Nincs quote.create jogosultság"}>{canQuote ? <Icon name="file" size={14} /> : <Icon name="lock" size={14} />}Vázlat-ajánlat készítése ({window.crmMoney(live.value)})</button>
        ) : <div className="text-[12px] text-stone-400">Nincs linkelt ajánlat.</div>}
      </div>

      {/* koncepció-kapcsolat → Belsőépítészet (FŐ lánc tervezési láncszeme) */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Belsőépítészet</div>
        {live.conceptRef ? (<>
          <button onClick={() => { window._interiorOpen = live.conceptRef; window.navigateTo && window.navigateTo("interior", "concepts"); }} className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 flex items-center gap-2 hover:bg-rose-100/60">
            <Icon name="layers" size={16} className="text-rose-600 shrink-0" />
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[12.5px] font-medium text-rose-800">Koncepció: {live.conceptRef}</div>
              <div className="text-[10.5px] text-rose-600/80">Megnyitás a Belsőépítészetben →</div>
            </div>
            <Icon name="external" size={14} className="text-rose-500 shrink-0" />
          </button>
          {(() => { const cc = (window.sim.getState().concepts || []).find((c) => c.id === live.conceptRef); const qr = cc && cc.quoteRef; if (!qr || qr === live.quoteId) return null; return (
            <button onClick={() => { window._pendingOpen = { type: "quote", id: qr }; window.navigateTo && window.navigateTo("sales", "quotes"); }} className="mt-1.5 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center gap-2 hover:bg-emerald-100/60">
              <Icon name="file" size={14} className="text-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1 text-left"><div className="text-[12px] font-medium text-emerald-800">Tervezési díj-ajánlat: {qr}</div><div className="text-[10px] text-emerald-600/80">a koncepcióból — megnyitás →</div></div>
              <Icon name="external" size={13} className="text-emerald-500 shrink-0" />
            </button>); })()}
        </>
        ) : E && E.oppIsOpen(live) ? (
          <button onClick={() => window.sim.oppCreateConcept(live.id)} className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12.5px] font-medium"><Icon name="layers" size={14} />Koncepció indítása a Belsőépítészetben</button>
        ) : <div className="text-[12px] text-stone-400">Nincs linkelt koncepció.</div>}
      </div>

      {/* FSM léptetés */}
      {E && E.oppIsOpen(live) && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Státusz léptetés</div>
          <div className="flex items-center gap-2 flex-wrap">
            {next.map((to) => {
              const st = window.OPP_STATUS[to] || {};
              const lost = to === "elveszett", won = to === "megnyert";
              return <button key={to} onClick={() => { if (lost) { setRejOpen(true); } else { window.sim.setOppStatus(live.id, to); } }} className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${won ? "bg-emerald-600 text-white hover:bg-emerald-700" : lost ? "bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200" : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"}`}>{won ? <Icon name="check" size={14} /> : lost ? <Icon name="x" size={14} /> : <Icon name="arrow-right" size={14} />}{st.label}</button>;
            })}
          </div>
          {rejOpen && (
            <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <label className="text-[11px] text-stone-600 font-medium block mb-1">Vesztés oka (kötelező)</label>
              <textarea value={rejText} onChange={(e) => setRejText(e.target.value)} rows={2} className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-stone-400" placeholder="Pl. árban alulmaradtunk, versenytárs nyert…" />
              <div className="flex items-center gap-2 mt-2">
                <button disabled={!rejText.trim()} onClick={() => { if (window.sim.setOppStatus(live.id, "elveszett", { reason: rejText })) { setRejOpen(false); setRejText(""); } }} className="h-8 px-3 rounded-lg bg-stone-700 text-white text-[12px] font-medium disabled:opacity-40">Elveszett</button>
                <button onClick={() => { setRejOpen(false); setRejText(""); }} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button>
              </div>
            </div>
          )}
        </div>
      )}
      {live.status === "megnyert" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2">
          <Icon name="check" size={16} className="text-emerald-600" />
          <div className="text-[12.5px] font-medium text-emerald-800">Megnyert{live.wonAt ? ` · ${live.wonAt}` : ""}{live.isNewCustomer ? " · új ügyfél felvéve" : ""}</div>
        </div>
      )}
      {live.status === "elveszett" && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <div className="text-[11px] text-stone-400 mb-0.5">Elveszett{live.lostAt ? ` · ${live.lostAt}` : ""}</div>
          {live.lostReason && <div className="text-[12px] text-stone-600">{live.lostReason}</div>}
          <button onClick={() => window.sim.setOppStatus(live.id, "nyitott")} className="mt-2 text-[12px] text-blue-600 font-medium">Újranyitás</button>
        </div>
      )}

      {/* B2B kiadás */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Kiadás partnernek</div>
        {live.delegatedTo ? (
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 flex items-center gap-2">
            <Icon name="external" size={16} className="text-violet-600" />
            <div className="flex-1 min-w-0"><div className="text-[12.5px] font-medium text-violet-800">{live.delegatedTo}</div><div className="text-[10.5px] text-violet-600/80">{live.delegatedExternal ? "Platformon kívül" : "Kézfogás elküldve"}</div></div>
            <button onClick={() => window.sim.recallOpp(live.id)} className="h-8 px-3 rounded-lg border border-violet-200 text-[12px] text-violet-700 bg-white hover:bg-violet-50">Visszavonás</button>
          </div>
        ) : delegOpen ? (
          <div className="rounded-xl border border-stone-200 p-2 space-y-1.5">
            {partners.map((p) => (
              <button key={p.id} onClick={() => { window.sim.delegateOpp(live.id, p.id); setDelegOpen(false); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-stone-50 text-left">
                <div className="w-7 h-7 rounded-lg bg-stone-100 grid place-items-center text-stone-500"><Icon name="briefcase" size={14} /></div>
                <div className="min-w-0 flex-1"><div className="text-[12.5px] font-medium text-stone-800 truncate">{p.name}</div><div className="text-[10.5px] text-stone-400 truncate">{p.specialty}</div></div>
              </button>
            ))}
            <button onClick={() => setDelegOpen(false)} className="w-full h-8 rounded-lg text-[12px] text-stone-500 hover:bg-stone-50">Mégse</button>
          </div>
        ) : (
          <button onClick={() => setDelegOpen(true)} className="w-full h-9 rounded-lg border border-dashed border-stone-300 text-[12.5px] font-medium text-stone-500 hover:text-violet-700 hover:border-violet-300">+ Lehetőség kiadása partnernek</button>
        )}
      </div>

      <QuickTaskAdd refType="opp" refId={live.id} />
      <ActivityComposer onAdd={({ kind, text }) => window.sim.addOppActivity(live.id, { kind, text })} />
      <ActivityTimeline activities={live.activities} />
    </div>
  );
}

// ── Új lead / lehetőség felvétel (alulról nyíló sheet) ───────────
function NewCrmSheet({ kind, onClose, onCreated }) {
  const sim = useSim();
  const isLead = kind === "lead";
  const [source, setSource] = useStateC2("telefon");
  const [company, setCompany] = useStateC2("");
  const [contact, setContact] = useStateC2("");
  const [email, setEmail] = useStateC2("");
  const [phone, setPhone] = useStateC2("");
  const [city, setCity] = useStateC2("");
  const [title, setTitle] = useStateC2("");
  const [interest, setInterest] = useStateC2("");
  const [val, setVal] = useStateC2("");
  const [expectedClose, setExpectedClose] = useStateC2("");
  const customers = (sim.customers || []).map((c) => c.name);
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-blue-500";

  const create = () => {
    if (isLead) {
      if (!contact.trim() || !title.trim()) return;
      const id = window.sim.addLead({ source, company, contact, email, phone, city, title, interest, estValue: Number(val) || 0 });
      if (id && onCreated) onCreated(id);
    } else {
      if (!company.trim() || !title.trim()) return;
      const id = window.sim.addOpp({ source, customer: company, contact, phone, city, title, value: Number(val) || 0, expectedClose });
      if (id && onCreated) onCreated(id);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[520px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between">
          <div className="text-[14px] font-semibold text-stone-900">{isLead ? "Új lead" : "Új lehetőség"}</div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button>
        </div>
        <div className="px-4 py-4 space-y-3.5">
          {/* forrás */}
          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">Forrás</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(window.CRM_SOURCE_ORDER || []).map((k) => { const m = window.CRM_SOURCE_META[k]; const on = source === k; return (
                <button key={k} onClick={() => setSource(k)} className={`inline-flex items-center gap-1.5 h-8 px-2 rounded-lg text-[11.5px] font-medium border ${on ? "border-blue-500 bg-blue-50 text-blue-800" : "border-stone-200 bg-white text-stone-600"}`}><Icon name={m.icon} size={13} className={on ? "text-blue-600" : "text-stone-400"} />{m.label}</button>
              ); })}
            </div>
          </div>

          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">{isLead ? "Cég (opcionális magánszemélynél)" : "Ügyfél"}</label>
            <input list={isLead ? undefined : "crm-cust-list"} value={company} onChange={(e) => setCompany(e.target.value)} placeholder={isLead ? "Cégnév" : "Ügyfél / cég neve"} className={cls} />
            {!isLead && <datalist id="crm-cust-list">{customers.map((c) => <option key={c} value={c} />)}</datalist>}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Kapcsolattartó{isLead ? " *" : ""}</label><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Név" className={cls} /></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Város</label><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Város" className={cls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Telefon</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+36…" className={cls} /></div>
            {isLead
              ? <div><label className="text-[10.5px] text-stone-500 block mb-1">Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@…" className={cls} /></div>
              : <div><label className="text-[10.5px] text-stone-500 block mb-1">Várható zárás</label><input type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} className={cls} /></div>}
          </div>

          <div><label className="text-[10.5px] text-stone-500 block mb-1">Tárgy *</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pl. Konyhabútor felújítás" className={cls} /></div>
          {isLead && <div><label className="text-[10.5px] text-stone-500 block mb-1">Igény leírása</label><textarea value={interest} onChange={(e) => setInterest(e.target.value)} rows={2} placeholder="Részletek…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-blue-500" /></div>}
          <div><label className="text-[10.5px] text-stone-500 block mb-1">{isLead ? "Becsült érték (Ft)" : "Érték (Ft)"}</label><input type="number" value={val} onChange={(e) => setVal(e.target.value)} placeholder="0" className={cls} /></div>

          <button disabled={isLead ? (!contact.trim() || !title.trim()) : (!company.trim() || !title.trim())} onClick={create} className="w-full h-10 rounded-xl bg-blue-600 text-white text-[13px] font-semibold disabled:opacity-40">{isLead ? "Lead rögzítése" : "Lehetőség rögzítése"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Feladatok (SLA-val) ──────────────────────────────────────────
function CrmTasks() {
  const sim = useSim();
  const [openId, setOpenId] = useStateC2(null);
  const [showDone, setShowDone] = useStateC2(false);
  const tasks = sim.crmTasks || [];
  const E = window.CrmEngine;

  const refTitle = (t) => {
    if (t.refType === "lead") { const l = (sim.leads || []).find((x) => x.id === t.refId); return l ? `${l.id} · ${l.title}` : t.refId; }
    const o = (sim.opportunities || []).find((x) => x.id === t.refId); return o ? `${o.id} · ${o.title}` : t.refId;
  };
  const openTasks = tasks.filter((t) => !t.done);
  const overdue = openTasks.filter((t) => { const s = E.taskSla(t); return s.overdue; });
  const upcoming = openTasks.filter((t) => { const s = E.taskSla(t); return !s.overdue; }).sort((a, b) => (a.due || "").localeCompare(b.due || ""));
  const done = tasks.filter((t) => t.done);

  const Row = ({ t }) => (
    <div className="flex items-center gap-3 px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0">
      <button onClick={() => window.sim.toggleCrmTask(t.id)} className={`w-5 h-5 rounded border grid place-items-center shrink-0 ${t.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-stone-300 bg-white hover:border-blue-400"}`}>{t.done && <Icon name="check" size={13} />}</button>
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] font-medium truncate ${t.done ? "text-stone-400 line-through" : "text-stone-900"}`}>{t.title}</div>
        <button onClick={() => setOpenId(t.refId)} className="text-[11px] text-blue-600 truncate inline-flex items-center gap-1 mt-0.5"><Icon name={t.refType === "lead" ? "route" : "briefcase"} size={11} />{refTitle(t)}</button>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full border font-medium px-1.5 h-5 text-[10px] ${(window.CRM_TASK_PRIORITY[t.priority] || {}).pill}`}><span className={`w-1.5 h-1.5 rounded-full ${(window.CRM_TASK_PRIORITY[t.priority] || {}).dot}`} />{(window.CRM_TASK_PRIORITY[t.priority] || {}).label}</span>
          {!t.done && <window.TaskSlaBadge task={t} size="sm" />}
        </div>
        <span className="text-[10px] text-stone-400">{t.owner} · {t.due}</span>
      </div>
    </div>
  );

  const Section = ({ label, items, tone }) => items.length > 0 && (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-3">
      <div className="px-4 py-2.5 border-b border-stone-100 flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${tone}`} /><span className="text-[12.5px] font-semibold text-stone-800">{label}</span><span className="text-[11px] text-stone-400">{items.length}</span></div>
      {items.map((t) => <Row key={t.id} t={t} />)}
    </div>
  );

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[900px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Feladatok</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Emlékeztetők és teendők — határidő + SLA</p>
        </div>
        <button onClick={() => setShowDone((v) => !v)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white border border-stone-200 text-stone-600 text-[12.5px] font-medium hover:bg-stone-50">{showDone ? "Kész elrejtése" : `Kész (${done.length})`}</button>
      </div>

      <Section label="Lejárt" items={overdue} tone="bg-rose-500" />
      <Section label="Közelgő" items={upcoming} tone="bg-blue-500" />
      {showDone && <Section label="Elvégezve" items={done} tone="bg-emerald-500" />}
      {!overdue.length && !upcoming.length && <div className="bg-white rounded-2xl border border-stone-200 px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs nyitott feladat. 🎉</div>}

      <window.CrmDetailHost openId={openId} setOpen={setOpenId} />
    </div>
  );
}

Object.assign(window, { ActivityComposer, ActivityTimeline, QuickTaskAdd, LeadDetail, OppDetail, NewCrmSheet, CrmTasks });
