// ─────────────────────────────────────────────────────────────────
// page-service-2.jsx — REKLAMÁCIÓ világ (2/2)
//   TicketDetail (SlideOver: garancia/SLA + FSM + megoldási mód + bekötés a
//   Logisztikába/gyártásba + B2B kiadás + napló), NewTicketSheet (belső felvétel
//   csatorna-/forrás-választással). Store: window.sim.* + ServiceEngine.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateS2 } = React;

function TicketDetail({ t, onClose }) {
  const sim = useSim();
  const live = (sim.serviceTickets || []).find((x) => x.id === t.id) || t;
  const E = window.ServiceEngine;
  const next = E ? E.nextStates(live) : [];
  const w = E ? E.warranty(live) : { known: false };
  const sla = E ? E.sla(live) : { active: false };
  const m = (window.SVC_TYPE_META || {})[live.type] || {};
  const [rejOpen, setRejOpen] = useStateS2(false);
  const [rejText, setRejText] = useStateS2("");
  const [delegOpen, setDelegOpen] = useStateS2(false);
  const partners = (sim.partners || []).filter((p) => p.platform);
  const resMeta = live.resolution ? (window.SVC_RESOLUTION || {})[live.resolution] : null;

  const go = (to) => { if (to === "elutasitva") { setRejOpen(true); return; } window.sim.setTicketStatus(live.id, to); };

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      {/* fejléc-jelvények */}
      <div className="flex items-center gap-2 flex-wrap">
        <window.SvcTypeBadge type={live.type} />
        <window.SvcStatusPill status={live.status} />
        <window.SvcPriorityPill priority={live.priority} />
        <window.WarrantyBadge ticket={live} />
        <window.SlaBadge ticket={live} />
      </div>

      <window.SvcStepper ticket={live} />

      {/* leírás + kontakt */}
      <div className="rounded-xl border border-stone-200 p-3 space-y-1.5">
        {live.desc && <div className="text-[12.5px] text-stone-700">{live.desc}</div>}
        <div className="flex items-start gap-2 text-[12px] text-stone-600 pt-1"><Icon name="pin" size={14} className="text-stone-400 mt-0.5 shrink-0" />{live.address || "—"}</div>
        <div className="flex items-center gap-2 text-[12px] text-stone-600"><Icon name="user" size={14} className="text-stone-400" />{live.contact || live.customer}{live.phone && <a href={`tel:${live.phone}`} className="inline-flex items-center gap-1 text-rose-700 ml-1"><Icon name="phone" size={13} />{live.phone}</a>}</div>
        {live.refLabel && <div className="flex items-center gap-2 text-[12px] text-stone-600"><Icon name="file" size={14} className="text-stone-400" />{live.refLabel}{live.ref && <span className="font-mono text-[10.5px] text-stone-400">· {live.ref}</span>}</div>}
        <div className="flex items-center gap-3 text-[11px] text-stone-400 pt-1">
          <span>Csatorna: {window.CHANNEL_LABEL[live.channel] || live.channel}</span>
          <span>Bejelentve: {live.reportedAt}</span>
        </div>
      </div>

      {/* garancia + SLA infó */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-stone-200 p-3">
          <div className="text-[10.5px] text-stone-400 mb-0.5">Garancia</div>
          {w.known ? <div className={`text-[12.5px] font-medium ${w.within ? "text-emerald-700" : "text-stone-500"}`}>{w.within ? `Lejár: ${w.expiry}` : `Lejárt: ${w.expiry}`}<div className="text-[10.5px] text-stone-400 font-normal">{w.within ? `${w.daysLeft} nap van hátra` : `${Math.abs(w.daysLeft)} napja lejárt`}</div></div> : <div className="text-[12px] text-stone-400">nincs adat</div>}
        </div>
        <div className="rounded-xl border border-stone-200 p-3">
          <div className="text-[10.5px] text-stone-400 mb-0.5">SLA határidő</div>
          {sla.active ? <div className={`text-[12.5px] font-medium ${sla.overdue ? "text-rose-700" : "text-stone-700"}`}>{live.dueDate}<div className="text-[10.5px] text-stone-400 font-normal">{sla.overdue ? `${Math.abs(sla.daysLeft)} napja lejárt` : `${sla.daysLeft} nap van hátra`}</div></div> : <div className="text-[12px] text-stone-400">lezárt</div>}
        </div>
      </div>

      {/* FSM akciók */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Státusz léptetés</div>
        {next.length ? (
          <div className="flex items-center gap-2 flex-wrap">
            {next.map((to) => {
              const st = window.SVC_STATUS[to] || {};
              const rej = to === "elutasitva";
              return <button key={to} onClick={() => go(to)} className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${rej ? "bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200" : "bg-rose-600 text-white hover:bg-rose-700"}`}>{rej ? <Icon name="x" size={14} /> : <Icon name="arrow-right" size={14} />}{st.label}</button>;
            })}
          </div>
        ) : <div className="text-[12px] text-stone-400">{live.status === "lezarva" ? "Lezárt jegy." : "Elutasított jegy — újranyitható."}{live.status === "elutasitva" && <button onClick={() => window.sim.setTicketStatus(live.id, "bejelentve")} className="ml-2 text-rose-600 font-medium">Újranyitás</button>}</div>}
        {rejOpen && (
          <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
            <label className="text-[11px] text-stone-600 font-medium block mb-1">Elutasítás oka (kötelező)</label>
            <textarea value={rejText} onChange={(e) => setRejText(e.target.value)} rows={2} className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-stone-400" placeholder="Pl. garancián kívüli, nem rendeltetésszerű használat…" />
            <div className="flex items-center gap-2 mt-2">
              <button disabled={!rejText.trim()} onClick={() => { if (window.sim.setTicketStatus(live.id, "elutasitva", { reason: rejText })) { setRejOpen(false); setRejText(""); } }} className="h-8 px-3 rounded-lg bg-stone-700 text-white text-[12px] font-medium disabled:opacity-40">Elutasítás</button>
              <button onClick={() => { setRejOpen(false); setRejText(""); }} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button>
            </div>
          </div>
        )}
      </div>

      {/* megoldási mód + bekötés */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Megoldási mód</div>
        <div className="grid grid-cols-2 gap-2">
          {window.SVC_RESOLUTION_ORDER.map((k) => {
            const r = window.SVC_RESOLUTION[k];
            const on = live.resolution === k;
            return <button key={k} onClick={() => window.sim.setTicketResolution(live.id, k)} className={`flex items-start gap-2 p-2.5 rounded-xl border text-left ${on ? "border-rose-400 bg-rose-50" : "border-stone-200 bg-white hover:border-stone-300"}`}>
              <Icon name={r.icon} size={16} className={on ? "text-rose-600 mt-0.5" : "text-stone-400 mt-0.5"} />
              <div className="min-w-0"><div className={`text-[12px] font-medium ${on ? "text-rose-800" : "text-stone-700"}`}>{r.label}</div><div className="text-[10px] text-stone-400 leading-tight mt-0.5">{r.hint}</div></div>
            </button>;
          })}
        </div>
        {/* bekötés-gombok a választott módhoz */}
        {resMeta && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {(live.resolution === "helyszini" || live.resolution === "behuzas") && (
              live.linkedShipmentId
                ? <span className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 h-8 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-medium"><Icon name="truck" size={13} />Fuvar: {live.linkedShipmentId}</span>
                : <button onClick={() => window.sim.ticketCreateShipment(live.id)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-sky-600 text-white text-[12px] font-medium"><Icon name="truck" size={13} />Szerviz-fuvar létrehozása</button>
            )}
            {live.resolution === "csere" && (
              live.linkedOrderId
                ? <span className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 h-8 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 font-medium"><Icon name="factory" size={13} />Rendelés: {live.linkedOrderId}</span>
                : <button onClick={() => window.sim.ticketCreateOrder(live.id)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-violet-600 text-white text-[12px] font-medium"><Icon name="factory" size={13} />Csere-rendelés létrehozása</button>
            )}
          </div>
        )}
      </div>

      {/* B2B kiadás */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Kiadás szervizpartnernek</div>
        {live.delegatedTo ? (
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 flex items-center gap-2">
            <Icon name="external" size={16} className="text-violet-600" />
            <div className="flex-1 min-w-0"><div className="text-[12.5px] font-medium text-violet-800">{live.delegatedTo}</div><div className="text-[10.5px] text-violet-600/80">{live.delegatedExternal ? "Platformon kívül" : "Kézfogás elküldve"}</div></div>
            <button onClick={() => window.sim.recallTicket(live.id)} className="h-8 px-3 rounded-lg border border-violet-200 text-[12px] text-violet-700 bg-white hover:bg-violet-50">Visszavonás</button>
          </div>
        ) : delegOpen ? (
          <div className="rounded-xl border border-stone-200 p-2 space-y-1.5">
            {partners.map((p) => (
              <button key={p.id} onClick={() => { window.sim.delegateTicket(live.id, p.id); setDelegOpen(false); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-stone-50 text-left">
                <div className="w-7 h-7 rounded-lg bg-stone-100 grid place-items-center text-stone-500"><Icon name="wrench" size={14} /></div>
                <div className="min-w-0 flex-1"><div className="text-[12.5px] font-medium text-stone-800 truncate">{p.name}</div><div className="text-[10.5px] text-stone-400 truncate">{p.specialty}</div></div>
              </button>
            ))}
            <button onClick={() => setDelegOpen(false)} className="w-full h-8 rounded-lg text-[12px] text-stone-500 hover:bg-stone-50">Mégse</button>
          </div>
        ) : (
          <button onClick={() => setDelegOpen(true)} className="w-full h-9 rounded-lg border border-dashed border-stone-300 text-[12.5px] font-medium text-stone-500 hover:text-violet-700 hover:border-violet-300">+ Jegy kiadása partnernek</button>
        )}
      </div>

      {/* napló */}
      {(live.log || []).length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Napló</div>
          <div className="space-y-1.5">
            {live.log.slice().reverse().map((l, i) => (
              <div key={i} className="flex items-start gap-2 text-[11.5px]"><span className="w-1.5 h-1.5 rounded-full bg-stone-300 mt-1.5 shrink-0" /><span className="text-stone-400 font-mono text-[10.5px] shrink-0">{l.at}</span><span className="text-stone-600">{l.text}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Új bejelentés (belső felvétel) ───────────────────────────────
function NewTicketSheet({ onClose, onCreated }) {
  const sim = useSim();
  const [type, setType] = useStateS2("garancia");
  const [priority, setPriority] = useStateS2("kozepes");
  const [customer, setCustomer] = useStateS2("");
  const [title, setTitle] = useStateS2("");
  const [desc, setDesc] = useStateS2("");
  const [source, setSource] = useStateS2("");
  const customers = (sim.customers || []).map((c) => c.name);
  // forrás-jelöltek: a vevő átadott fuvarjai / projektjei / rendelései
  const cust = customer.trim();
  const ships = (sim.shipments || []).filter((s) => s.customer === cust && s.type === "delivery");
  const projs = (sim.projects || []).filter((p) => p.customer === cust);
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-500";

  const create = () => {
    if (!cust || !title.trim()) return;
    let ref = "", refLabel = "", shipmentId = null, projectId = null, installedAt = null;
    if (source.startsWith("sh:")) { const s = ships.find((x) => x.id === source.slice(3)); if (s) { ref = s.ref; refLabel = s.refLabel; shipmentId = s.id; installedAt = s.date; } }
    else if (source.startsWith("pr:")) { const p = projs.find((x) => x.id === source.slice(3)); if (p) { ref = p.id; refLabel = p.name; projectId = p.id; installedAt = p.installTarget; } }
    const id = window.sim.createTicket({ type, priority, customer: cust, title, desc, channel: "internal", ref, refLabel, shipmentId, projectId, installedAt });
    if (id && onCreated) onCreated(id);
  };

  const TypeBtn = ({ k }) => { const m = window.SVC_TYPE_META[k]; const on = type === k; return (
    <button onClick={() => setType(k)} className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border ${on ? "border-rose-500 bg-rose-50" : "border-stone-200 bg-white"}`}>
      <Icon name={m.icon} size={18} className={on ? "text-rose-700" : "text-stone-400"} /><span className={`text-[11px] font-medium text-center leading-tight ${on ? "text-rose-800" : "text-stone-600"}`}>{m.short}</span>
    </button>
  ); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[520px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between">
          <div className="text-[14px] font-semibold text-stone-900">Új bejelentés</div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center gap-2">{window.SVC_TYPE_ORDER.map((k) => <TypeBtn key={k} k={k} />)}</div>

          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">Ügyfél</label>
            <input list="svc-cust-list" value={customer} onChange={(e) => { setCustomer(e.target.value); setSource(""); }} placeholder="Ügyfél neve" className={cls} />
            <datalist id="svc-cust-list">{customers.map((c) => <option key={c} value={c} />)}</datalist>
          </div>

          {cust && (ships.length > 0 || projs.length > 0) && (
            <div>
              <label className="text-[10.5px] text-stone-500 block mb-1">Kapcsolódó munka (opcionális — garancia-dátumhoz)</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={cls}>
                <option value="">— nincs —</option>
                {ships.length > 0 && <optgroup label="Kiszállítások">{ships.map((s) => <option key={s.id} value={"sh:" + s.id}>{s.id} · {s.refLabel || s.date}</option>)}</optgroup>}
                {projs.length > 0 && <optgroup label="Projektek">{projs.map((p) => <option key={p.id} value={"pr:" + p.id}>{p.name}</option>)}</optgroup>}
              </select>
            </div>
          )}

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mi a probléma? (rövid cím)" className={cls} />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Részletes leírás…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-500" />

          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">Prioritás</label>
            <div className="flex items-center gap-1.5">
              {window.SVC_PRIORITY_ORDER.slice().reverse().map((k) => { const p = window.SVC_PRIORITY[k]; const on = priority === k; return <button key={k} onClick={() => setPriority(k)} className={`flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg text-[11.5px] font-medium border ${on ? p.pill : "bg-white text-stone-500 border-stone-200"}`}><span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />{p.label}</button>; })}
            </div>
          </div>

          <button disabled={!cust || !title.trim()} onClick={create} className="w-full h-10 rounded-xl bg-rose-600 text-white text-[13px] font-semibold disabled:opacity-40">Bejelentés rögzítése</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TicketDetail, NewTicketSheet });
