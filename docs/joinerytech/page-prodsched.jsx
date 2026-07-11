// ─────────────────────────────────────────────────────────────────
// page-prodsched.jsx — GYÁRTÁSÜTEMEZÉS / VÉGES KAPACITÁS — Gyártás világ
//   Heti ütemező-vászon: stáció-sorok × nap-oszlopok, gép-nap kapacitás-sáv +
//   ÜTKÖZÉS-kiemelés (terhelés > kapacitás). Várólista-strip a be nem ütemezett
//   taskokkal. Task-részlet SlideOver: ütemezés (gép + nap + óra) + FSM.
//   Store: window.sim.prodTasks + akciók; ProdSchedEngine (terhelés/ütközés).
// ─────────────────────────────────────────────────────────────────
const { useState: useStateP } = React;

function PsStatusPill({ status, size = "md" }) {
  const t = (window.PROD_STATUS || {})[status] || { label: status, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}
function PsKindBadge({ kind, size = "md" }) {
  const m = (window.PROD_KINDS || {})[kind] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-md border font-medium ${cls} ${m.pill}`}><Icon name={m.icon || "factory"} size={size === "sm" ? 11 : 12} />{m.label || kind}</span>;
}

function TaskChip({ task, onOpen, compact }) {
  const m = (window.PROD_KINDS || {})[task.kind] || {};
  return (
    <button onClick={() => onOpen(task.id)} className="w-full text-left rounded-lg border px-2 py-1.5 hover:shadow-sm transition" style={{ borderColor: (m.accent || "#999") + "44", background: (m.accent || "#999") + "0f" }}>
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.accent }} />
        <span className="text-[11px] font-semibold text-stone-800 truncate flex-1">{task.title}</span>
        <span className="text-[10px] text-stone-500 shrink-0">{task.hours} ó</span>
      </div>
      {!compact && <div className="text-[9.5px] text-stone-400 truncate mt-0.5 pl-2.5">{task.customer || task.order}</div>}
    </button>
  );
}

function PsDetailHost({ openId, setOpen }) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const task = openId ? (sim.prodTasks || []).find((x) => x.id === openId) : null;
  const onClose = () => setOpen(null);
  return (
    <SO open={!!task} onClose={onClose} title={task ? task.title : ""} subtitle={task ? `${task.id} · ${task.order || "—"}` : ""} width={560}>
      {task && window.ProdTaskDetail ? <window.ProdTaskDetail task={task} onClose={onClose} /> : null}
    </SO>
  );
}

function ProductionSchedule() {
  const sim = useSim();
  const tasks = sim.prodTasks || [];
  const E = window.ProdSchedEngine;
  const [openId, setOpenId] = useStateP(null);
  const [newOpen, setNewOpen] = useStateP(false);
  const monday = window.PROD_WEEK_MONDAY;
  const days = E ? E.weekDays(monday) : [];
  const stations = window.PROD_STATIONS || [];
  const dates = days.map((d) => d.date);
  const downMap = sim.prodDownMap ? sim.prodDownMap(dates) : {};
  const backlog = E ? E.unscheduled(tasks) : [];
  const conflicts = E ? E.conflicts(tasks, monday, downMap) : [];
  const util = E ? E.utilization(tasks, monday, downMap) : { pct: 0, load: 0, cap: 0 };
  const activeCount = tasks.filter((t) => ["utemezve", "folyamatban"].includes(t.status)).length;
  const blocked = tasks.filter((t) => t.status === "blokkolt").length;
  const isConflict = (mid, date) => conflicts.some((c) => c.machineId === mid && c.date === date);

  const KPI = ({ label, value, sub, tone = "stone", icon }) => (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-center justify-between"><div className={`w-8 h-8 rounded-lg grid place-items-center bg-${tone}-50 text-${tone}-600`}><Icon name={icon} size={16} /></div><div className="text-[22px] font-semibold text-stone-900 leading-none">{value}</div></div>
      <div className="text-[12px] font-medium text-stone-700 mt-2.5">{label}</div>{sub && <div className="text-[10.5px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Ütemezés</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Véges kapacitás — gép-nap terhelés és ütközés · hét: {days.length ? `${days[0].date} – ${days[days.length - 1].date}` : monday}</p>
        </div>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Új feladat</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
        <KPI label="Aktív feladat" value={activeCount} sub="ütemezve / folyamatban" tone="teal" icon="factory" />
        <KPI label="Kapacitás-ütközés" value={conflicts.length} sub="gép-nap túlterhelés / leállás" tone={conflicts.length ? "rose" : "stone"} icon="alert" />
        <KPI label="Heti kihasználtság" value={`${Math.round(util.pct * 100)}%`} sub={`${util.load}/${util.cap} óra`} tone="sky" icon="analytics" />
        <KPI label="Várólista" value={backlog.length} sub="be nem ütemezve" tone="amber" icon="orders" />
      </div>

      {/* Várólista */}
      <div className="bg-white rounded-2xl border border-stone-200 p-3 mb-4">
        <div className="flex items-center gap-2 mb-2"><Icon name="orders" size={15} className="text-amber-500" /><span className="text-[12.5px] font-semibold text-stone-800">Várólista</span><span className="text-[10.5px] text-stone-400">({backlog.length})</span></div>
        {backlog.length ? (
          <div className="flex gap-2 overflow-x-auto pb-1">{backlog.map((t) => <div key={t.id} className="w-[200px] shrink-0"><TaskChip task={t} onOpen={setOpenId} /></div>)}</div>
        ) : <div className="text-[12px] text-stone-400 py-1">Minden feladat be van ütemezve. 🎉</div>}
      </div>

      {/* Ütemező-vászon */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: 880 }}>
            {/* fejléc */}
            <div className="grid border-b border-stone-200 bg-stone-50/60" style={{ gridTemplateColumns: `180px repeat(${days.length}, 1fr)` }}>
              <div className="px-3 py-2 text-[11px] font-semibold text-stone-500">Stáció</div>
              {days.map((d) => <div key={d.date} className="px-2 py-2 text-center border-l border-stone-100"><div className="text-[11.5px] font-semibold text-stone-700">{d.dow}</div><div className="text-[10px] text-stone-400">{d.date.slice(5)}</div></div>)}
            </div>
            {/* sorok */}
            {stations.map((st) => (
              <div key={st.id} className="grid border-b border-stone-100 last:border-0" style={{ gridTemplateColumns: `180px repeat(${days.length}, 1fr)` }}>
                <div className="px-3 py-2 border-r border-stone-100">
                  <div className="text-[12px] font-semibold text-stone-800 leading-tight">{st.name}</div>
                  <div className="flex items-center gap-1.5 mt-1"><PsKindBadge kind={st.kind} size="sm" /><span className="text-[9.5px] text-stone-400">{st.dailyHours} ó/nap</span></div>
                </div>
                {days.map((d) => {
                  const cellTasks = tasks.filter((t) => t.machineId === st.id && t.date === d.date && ["utemezve", "folyamatban"].includes(t.status));
                  const load = E ? E.dayLoad(tasks, st.id, d.date) : 0;
                  const down = downMap[st.id + "|" + d.date];
                  const over = isConflict(st.id, d.date);
                  const pct = Math.min(100, Math.round((load / st.dailyHours) * 100));
                  return (
                    <div key={d.date} title={down ? `Leállítva: ${down.reason}${down.woId ? " (" + down.woId + ")" : ""}` : undefined}
                      style={down ? { background: "repeating-linear-gradient(45deg,#fff1f2,#fff1f2 6px,#ffe4e6 6px,#ffe4e6 12px)" } : undefined}
                      className={`px-1.5 py-1.5 border-l border-stone-100 align-top min-h-[64px] ${down ? "" : over ? "bg-rose-50/60" : ""}`}>
                      {down && <div className="flex items-center gap-1 mb-1 text-[9px] font-semibold text-rose-600"><Icon name={down.planned ? "shield" : "alert"} size={10} />{down.planned ? "Karbantartás" : "Leállítva"}</div>}
                      <div className="space-y-1">{cellTasks.map((t) => <TaskChip key={t.id} task={t} onOpen={setOpenId} compact />)}</div>
                      {down ? (
                        <div className="mt-1 text-[9px] text-rose-600 leading-tight">{cellTasks.length ? `${load} ó ütemezve leállított gépre — tedd át!` : down.reason}</div>
                      ) : load > 0 && (
                        <div className="mt-1.5">
                          <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden"><div className={`h-full rounded-full ${over ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-teal-500"}`} style={{ width: `${pct}%` }} /></div>
                          <div className={`text-[9px] mt-0.5 text-right ${over ? "text-rose-600 font-semibold" : "text-stone-400"}`}>{load}/{st.dailyHours} ó{over ? " · túlterhelt" : ""}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="text-[11px] text-stone-400 mt-2 flex items-center gap-3 flex-wrap"><span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-1.5 rounded-full bg-rose-500" /> Túlterhelt gép-nap (lekötött &gt; kapacitás)</span><span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded" style={{ background: "repeating-linear-gradient(45deg,#fff1f2,#fff1f2 3px,#ffe4e6 3px,#ffe4e6 6px)" }} /> Leállított gép (karbantartás) — nem ütemezhető</span><span>Koppints egy feladatra az újraütemezéshez.</span></div>

      {/* Termelékenység operátoronként */}
      {(() => {
        const stats = E ? E.operatorStats(tasks) : [];
        if (!stats.length) return null;
        return (
          <div className="bg-white rounded-2xl border border-stone-200 p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12.5px] font-semibold text-stone-800">Termelékenység — naplózott munkaidő</div>
              <button onClick={() => window.navigateTo && window.navigateTo("tasks")} className="text-[11.5px] text-teal-700 font-medium inline-flex items-center gap-1">Feladataim <Icon name="external" size={12} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {stats.map((o) => {
                const eff = E.operatorEfficiency(o);
                return (
                  <div key={o.who} className="rounded-xl border border-stone-100 bg-stone-50/50 p-3">
                    <div className="flex items-center justify-between"><div className="text-[12.5px] font-semibold text-stone-800">{o.who}</div>{o.active > 0 && <span className="inline-flex items-center gap-1 text-[10px] text-teal-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />fut</span>}</div>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-stone-500">
                      <span><span className="font-semibold text-stone-800 text-[13px]">{E.fmtDuration(o.minutes)}</span> naplózva</span>
                      <span className="text-stone-300">·</span>
                      <span><span className="font-semibold text-stone-800">{o.done}</span> kész</span>
                      {eff != null && <><span className="text-stone-300">·</span><span className={eff >= 1 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>{Math.round(eff * 100)}% hatékonyság</span></>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[10.5px] text-stone-400 mt-2.5">A tény-idő a Feladat-terminálon naplózódik (start / szünet / kész). A hatékonyság a terv-óra és a tény-óra aránya.</div>
          </div>
        );
      })()}

      <PsDetailHost openId={openId} setOpen={setOpenId} />
      {newOpen && window.NewProdTaskSheet && <window.NewProdTaskSheet onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />}
    </div>
  );
}

function ProdTaskDetail({ task, onClose }) {
  const sim = useSim();
  const live = (sim.prodTasks || []).find((x) => x.id === task.id) || task;
  const E = window.ProdSchedEngine;
  const next = E ? E.nextStates(live) : [];
  const stations = window.PROD_STATIONS || [];
  const compatible = stations.filter((s) => s.kind === live.kind);
  const others = stations.filter((s) => s.kind !== live.kind);
  const [blockOpen, setBlockOpen] = useStateP(false);
  const [bReason, setBReason] = useStateP("");
  const days = E ? E.weekDays(window.PROD_WEEK_MONDAY) : [];
  const station = E ? E.stationById(live.machineId) : null;
  const load = E && live.machineId && live.date ? E.dayLoad(sim.prodTasks || [], live.machineId, live.date) : 0;
  const over = E && live.machineId && live.date ? E.isOverloaded(sim.prodTasks || [], live.machineId, live.date) : false;
  const downInfo = (window.sim.prodDownMap && live.machineId && live.date) ? window.sim.prodDownMap([live.date])[live.machineId + "|" + live.date] : null;
  const dayDown = (window.sim.prodDownMap && live.date) ? window.sim.prodDownMap([live.date]) : {};

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="flex items-center gap-2 flex-wrap"><PsKindBadge kind={live.kind} /><PsStatusPill status={live.status} /></div>
      {live.note && <div className="text-[12.5px] text-stone-600">{live.note}</div>}
      <div className="rounded-xl border border-stone-200 p-3 flex items-center gap-3 text-[11.5px] text-stone-500 flex-wrap">
        {live.order && <span className="inline-flex items-center gap-1"><Icon name="orders" size={13} />{live.order}</span>}
        {live.customer && <span className="inline-flex items-center gap-1"><Icon name="user" size={13} />{live.customer}</span>}
        <span className="inline-flex items-center gap-1"><Icon name="clock" size={13} />{live.hours} óra</span>
      </div>

      {/* Ütemezés */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Ütemezés</div>
        {live.machineId && live.date ? (
          <div className={`rounded-xl border p-3 mb-2 ${(over || downInfo) ? "border-rose-200 bg-rose-50" : "border-teal-200 bg-teal-50"}`}>
            <div className="text-[12.5px] font-medium text-stone-800">{station ? station.name : live.machineId} · {live.date}</div>
            {downInfo ? (
              <div className="text-[11px] mt-0.5 text-rose-600 font-medium">⚠ A gép leállítva ({downInfo.reason}{downInfo.woId ? `, ${downInfo.woId}` : ""}) — ezen a napon nem ütemezhető. Tedd át, vagy old fel a karbantartást.</div>
            ) : (
              <div className={`text-[11px] mt-0.5 ${over ? "text-rose-600 font-medium" : "text-stone-500"}`}>Gép-nap terhelés: {load}/{station ? station.dailyHours : 8} óra{over ? " — túlterhelt!" : ""}</div>
            )}
            {downInfo && downInfo.woId && <button onClick={() => window.navigateTo && window.navigateTo("maintenance", "workorders")} className="mt-1.5 text-[11px] text-cyan-700 font-medium inline-flex items-center gap-1">Karbantartás: {downInfo.woId} <Icon name="external" size={11} /></button>}
          </div>
        ) : <div className="text-[12px] text-stone-400 mb-2">Még nincs ütemezve (várólista).</div>}

        <div className="grid grid-cols-1 gap-2">
          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">Stáció</label>
            <select value={live.machineId || ""} onChange={(e) => window.sim.scheduleProdTask(live.id, { machineId: e.target.value || null, date: live.date || (days[0] && days[0].date) })} className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500">
              <option value="">— válassz —</option>
              <optgroup label="Ajánlott (művelet-egyező)">{compatible.map((s) => <option key={s.id} value={s.id}>{s.name}{dayDown[s.id + "|" + live.date] ? " ⚠ leállítva" : ""}</option>)}</optgroup>
              <optgroup label="Egyéb stáció">{others.map((s) => <option key={s.id} value={s.id}>{s.name} ({(window.PROD_KINDS[s.kind] || {}).label}){dayDown[s.id + "|" + live.date] ? " ⚠ leállítva" : ""}</option>)}</optgroup>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1"><label className="text-[10.5px] text-stone-500 block mb-1">Nap</label>
              <select value={live.date || ""} onChange={(e) => window.sim.scheduleProdTask(live.id, { date: e.target.value || null })} disabled={!live.machineId} className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 disabled:bg-stone-50">
                <option value="">—</option>{days.map((d) => <option key={d.date} value={d.date}>{d.dow} · {d.date.slice(5)}</option>)}
              </select>
            </div>
            <div className="w-24"><label className="text-[10.5px] text-stone-500 block mb-1">Óra</label>
              <input type="number" step="0.5" value={live.hours} onChange={(e) => window.sim.setProdTaskHours(live.id, e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500" />
            </div>
          </div>
          {live.machineId && <button onClick={() => window.sim.unscheduleProdTask(live.id)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-stone-200 text-stone-500 text-[12px] font-medium hover:bg-stone-50 w-fit"><Icon name="x" size={13} />Vissza várólistára</button>}
        </div>
      </div>

      {/* FSM léptetés */}
      {!(E && E.isTerminal(live)) && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Státusz léptetése</div>
          <div className="flex items-center gap-2 flex-wrap">
            {next.map((to) => {
              const st = window.PROD_STATUS[to] || {};
              const done = to === "kesz", block = to === "blokkolt";
              if (block) return <button key={to} onClick={() => setBlockOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-rose-500 text-white text-[12.5px] font-medium hover:bg-rose-600"><Icon name="alert" size={14} />Blokkol</button>;
              return <button key={to} onClick={() => window.sim.setProdTaskStatus(live.id, to)} className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${done ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-teal-600 text-white hover:bg-teal-700"}`}>{done ? <Icon name="check" size={14} /> : <Icon name="chevron" size={14} />}{st.label}</button>;
            })}
          </div>
          {blockOpen && (
            <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <label className="text-[11px] text-stone-600 font-medium block mb-1">Blokkolás oka</label>
              <textarea value={bReason} onChange={(e) => setBReason(e.target.value)} rows={2} className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-stone-400" placeholder="Pl. alapanyag-hiány, gép áll…" />
              <div className="flex items-center gap-2 mt-2"><button onClick={() => { window.sim.setProdTaskStatus(live.id, "blokkolt", { reason: bReason }); setBlockOpen(false); setBReason(""); }} className="h-8 px-3 rounded-lg bg-rose-600 text-white text-[12px] font-medium">Blokkol</button><button onClick={() => setBlockOpen(false)} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button></div>
            </div>
          )}
        </div>
      )}
      {live.status === "kesz" && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2"><Icon name="check" size={16} className="text-emerald-600" /><div className="text-[12.5px] font-medium text-emerald-800">Kész</div></div>}

      {(live.log || []).length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Napló</div>
          <div className="space-y-1.5">{live.log.slice().reverse().map((l, i) => <div key={i} className="flex items-start gap-2 text-[11.5px]"><span className="w-1.5 h-1.5 rounded-full bg-stone-300 mt-1.5 shrink-0" /><span className="text-stone-400 font-mono text-[10.5px] shrink-0">{l.at}</span><span className="text-stone-600">{l.text}</span></div>)}</div>
        </div>
      )}
    </div>
  );
}

function NewProdTaskSheet({ onClose, onCreated }) {
  const sim = useSim();
  const [title, setTitle] = useStateP("");
  const [kind, setKind] = useStateP("szabaszat");
  const [order, setOrder] = useStateP("");
  const [hours, setHours] = useStateP(4);
  const [note, setNote] = useStateP("");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500";
  const orders = (sim.orders || []).filter((o) => o.status !== "delivered");
  const create = () => {
    if (!title.trim()) return;
    const o = orders.find((x) => x.id === order);
    const id = window.sim.addProdTask({ title, kind, order, customer: o ? o.customer : "", hours, note });
    if (id && onCreated) onCreated(id);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[480px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"><div className="text-[14px] font-semibold text-stone-900">Új gyártási feladat</div><button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button></div>
        <div className="px-4 py-4 space-y-3.5">
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Megnevezés *</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pl. Bognár konyha — korpusz szabás" className={cls} /></div>
          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">Művelet</label>
            <div className="flex items-center gap-1.5 flex-wrap">{(window.PROD_KIND_ORDER || []).map((k) => { const m = window.PROD_KINDS[k]; const on = kind === k; return <button key={k} onClick={() => setKind(k)} className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11.5px] font-medium border ${on ? m.pill : "bg-white text-stone-500 border-stone-200"}`}><Icon name={m.icon} size={12} />{m.label}</button>; })}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1"><label className="text-[10.5px] text-stone-500 block mb-1">Rendelés</label><select value={order} onChange={(e) => setOrder(e.target.value)} className={cls}><option value="">— nincs —</option>{orders.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.customer}</option>)}</select></div>
            <div className="w-24"><label className="text-[10.5px] text-stone-500 block mb-1">Óra</label><input type="number" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} className={cls} /></div>
          </div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Megjegyzés</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Részletek…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500" /></div>
          <button disabled={!title.trim()} onClick={create} className="w-full h-10 rounded-xl bg-teal-600 text-white text-[13px] font-semibold disabled:opacity-40">Feladat létrehozása</button>
          <div className="text-[10.5px] text-stone-400 text-center">Várólistára kerül; az ütemezés (gép + nap) a részlet-nézetből végezhető.</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PsStatusPill, PsKindBadge, TaskChip, PsDetailHost, ProductionSchedule, ProdTaskDetail, NewProdTaskSheet });
