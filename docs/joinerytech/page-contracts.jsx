// ─────────────────────────────────────────────────────────────────
// page-contracts.jsx — SZERZŐDÉSEK / ÜTEMEZETT SZÁMLÁZÁS (4.8-B3)
//   Pénzügy → Szerződések: a szerződéses érték fizetési mérföldkövekre bontva
//   (előleg / részszámla / végszámla). Mérföldkőnként „Számláz" → kimenő
//   számla-PISZKOZAT a Pénzügyben. Híd: Projektek ↔ Pénzügy.
//   Store: window.sim.contracts + billMilestone; ContractEngine (összegek).
// ─────────────────────────────────────────────────────────────────
const { useState: useStateCt } = React;

const _cthuf = (n) => Math.round(Number(n) || 0).toLocaleString("hu-HU") + " Ft";

function CtMsStatusPill({ status }) {
  const t = (window.CTR_MS_STATUS || {})[status] || { label: status, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium px-2 h-6 text-[11px] ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}

function ContractCard({ c }) {
  const E = window.ContractEngine;
  const invPct = E ? E.invoicedPct(c) : 0;
  const invAmt = E ? E.invoicedAmount(c) : 0;
  const canBill = window.sim.hasPerm && window.sim.hasPerm("finance.manage");
  const pctSum = E ? E.pctSum(c.milestones) : 100;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-stone-900 truncate">{c.title}</div>
            <div className="text-[11px] text-stone-500 mt-0.5">{c.id} · {c.customer}{c.projectRef ? ` · ${c.projectRef}` : ""}{c.orderRef ? ` · ${c.orderRef}` : ""}</div>
          </div>
          <div className="text-right shrink-0"><div className="text-[10px] text-stone-400">Szerződéses érték</div><div className="text-[14px] font-semibold text-stone-900">{_cthuf(c.totalGross)}</div></div>
        </div>
        {/* haladás */}
        <div className="mt-2.5">
          <div className="h-2 rounded-full bg-stone-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, invPct)}%` }} /></div>
          <div className="flex items-center justify-between mt-1 text-[10.5px] text-stone-400"><span>Leszámlázva: {invPct}% · {_cthuf(invAmt)}</span><span>Hátralévő: {_cthuf((c.totalGross || 0) - invAmt)}</span></div>
        </div>
      </div>
      <div className="divide-y divide-stone-100">
        {(c.milestones || []).map((ms) => { const amt = E ? E.msAmount(c, ms) : 0; const billed = ms.status === "szamlazva"; const trig = (window.CTR_TRIGGER || {})[ms.trigger] || {};
          return (
            <div key={ms.id} className="px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-stone-100 text-stone-500 text-[12px] font-bold">{ms.pct}%</div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-stone-800 truncate">{ms.label}</div>
                <div className="text-[10.5px] text-stone-400">{_cthuf(amt)} · {trig.label || ms.trigger}{ms.phase ? `: ${ms.phase}` : ""}</div>
              </div>
              <CtMsStatusPill status={ms.status} />
              <div className="shrink-0 w-[112px] text-right">
                {billed
                  ? <button onClick={() => window.navigateTo && window.navigateTo("finance", "outgoing")} className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium font-mono hover:underline">{ms.invoiceId}<Icon name="external" size={11} /></button>
                  : canBill
                    ? <button onClick={() => window.sim.billMilestone(c.id, ms.id)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11.5px] font-medium"><Icon name="receipt" size={13} />Számláz</button>
                    : <span className="text-[10.5px] text-amber-700">finance.manage</span>}
              </div>
            </div>
          ); })}
      </div>
      {pctSum !== 100 && <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-[10.5px] text-amber-700 inline-flex items-center gap-1.5"><Icon name="alert" size={12} />A mérföldkövek összege {pctSum}% (nem 100%).</div>}
    </div>
  );
}

function NewContractSheet({ onClose, onCreated }) {
  const sim = useSim();
  const orders = (sim.orders || []).filter((o) => !(sim.contracts || []).some((c) => c.orderRef === o.id));
  const PHASES = ["Ajánlat", "Felmérés", "Gyártás", "Beépítés", "Átadás"];
  const [orderId, setOrderId] = useStateCt("");
  const [customer, setCustomer] = useStateCt("");
  const [title, setTitle] = useStateCt("");
  const [total, setTotal] = useStateCt("");
  const [ms, setMs] = useStateCt((window.CTR_DEFAULT_SCHEDULE || []).map((m) => ({ ...m })));
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-emerald-500";

  const pickOrder = (id) => { setOrderId(id); const o = orders.find((x) => x.id === id); if (o) { setCustomer(o.customer); setTitle(`${o.customer} — ${o.id}`); setTotal(o.total || ""); } };
  const setRow = (i, patch) => setMs(ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const addRow = () => setMs([...ms, { label: "Részszámla", trigger: "manual", pct: 0, kind: "normal" }]);
  const delRow = (i) => setMs(ms.filter((_, j) => j !== i));
  const pctSum = ms.reduce((s, m) => s + (Number(m.pct) || 0), 0);
  const valid = customer.trim() && (Number(total) || 0) > 0 && ms.length > 0 && pctSum === 100;
  const create = () => { const id = window.sim.addContract({ orderId: orderId || null, customer, title: title || customer, totalGross: Number(total) || 0, projectRef: (orders.find((o) => o.id === orderId) || {}).projectId || null, milestones: ms }); if (id && onCreated) onCreated(id); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[600px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between z-10"><div className="text-[14px] font-semibold text-stone-900">Új szerződés</div><button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button></div>
        <div className="px-4 py-4 space-y-3.5">
          {orders.length > 0 && (
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Rendelésből (előtöltés) — opcionális</label>
              <select value={orderId} onChange={(e) => pickOrder(e.target.value)} className={cls}><option value="">— kézi megadás —</option>{orders.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.customer} · {(o.total || 0).toLocaleString("hu-HU")} Ft</option>)}</select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Ügyfél *</label><input value={customer} onChange={(e) => setCustomer(e.target.value)} className={cls} /></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Szerződéses érték (bruttó) *</label><input type="number" value={total} onChange={(e) => setTotal(e.target.value)} className={cls} /></div>
          </div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Megnevezés</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pl. Konyhabútor — 16 fiókos" className={cls} /></div>

          {/* Számlázási ütemterv — ITT határozza meg a felhasználó */}
          <div>
            <div className="flex items-center justify-between mb-1.5"><label className="text-[11px] font-semibold text-stone-700">Számlázási ütemterv (mérföldkövek)</label><span className={`text-[11px] font-medium ${pctSum === 100 ? "text-emerald-600" : "text-rose-600"}`}>Σ {pctSum}%</span></div>
            <div className="space-y-1.5">
              {ms.map((m, i) => { const amt = (Number(total) || 0) * (Number(m.pct) || 0) / 100;
                return (
                  <div key={i} className="rounded-xl border border-stone-200 p-2.5 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <input value={m.label} onChange={(e) => setRow(i, { label: e.target.value })} placeholder="Megnevezés" className="flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-emerald-500" />
                      <div className="relative w-[68px]"><input type="number" value={m.pct} onChange={(e) => setRow(i, { pct: e.target.value })} className="w-full h-8 pl-2 pr-5 rounded-lg border border-stone-200 text-[12px] text-right bg-white outline-none focus:border-emerald-500" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">%</span></div>
                      <button onClick={() => delRow(i)} className="w-8 h-8 grid place-items-center rounded-lg border border-stone-200 text-stone-400 hover:text-rose-500 shrink-0"><Icon name="x" size={13} /></button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select value={m.kind} onChange={(e) => setRow(i, { kind: e.target.value })} className="h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-emerald-500"><option value="advance">Előleg</option><option value="normal">Rész/végszámla</option></select>
                      <select value={m.trigger} onChange={(e) => setRow(i, { trigger: e.target.value })} className="h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-emerald-500"><option value="manual">Kézi kiváltás</option><option value="phase">Projekt-fázis</option><option value="date">Dátum</option></select>
                      {m.trigger === "phase" && <select value={m.phase || "Gyártás"} onChange={(e) => setRow(i, { phase: e.target.value })} className="h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-emerald-500">{PHASES.map((p) => <option key={p} value={p}>{p}</option>)}</select>}
                      <span className="ml-auto text-[11px] text-stone-500">{_cthuf(amt)}</span>
                    </div>
                  </div>
                ); })}
            </div>
            <button onClick={addRow} className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-stone-200 text-stone-600 text-[12px] font-medium hover:bg-stone-50"><Icon name="plus" size={13} />Mérföldkő hozzáadása</button>
            {pctSum !== 100 && <div className="text-[10.5px] text-rose-600 mt-1.5">A mérföldkövek összegének 100%-nak kell lennie (most {pctSum}%).</div>}
          </div>

          <button disabled={!valid} onClick={create} className="w-full h-10 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold disabled:opacity-40">Szerződés létrehozása</button>
        </div>
      </div>
    </div>
  );
}

function FinanceContracts() {
  const sim = useSim();
  const contracts = sim.contracts || [];
  const [newOpen, setNewOpen] = useStateCt(false);
  const E = window.ContractEngine;
  const totalValue = contracts.reduce((s, c) => s + (c.totalGross || 0), 0);
  const invoiced = contracts.reduce((s, c) => s + (E ? E.invoicedAmount(c) : 0), 0);
  const dueCount = contracts.reduce((s, c) => s + (c.milestones || []).filter((m) => m.status === "esedekes").length, 0);

  const KPI = ({ label, value, sub, tone, icon }) => (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-center justify-between"><div className={`w-8 h-8 rounded-lg grid place-items-center bg-${tone}-50 text-${tone}-600`}><Icon name={icon} size={16} /></div><div className="text-[18px] font-semibold text-stone-900 leading-none">{value}</div></div>
      <div className="text-[12px] font-medium text-stone-700 mt-2.5">{label}</div>{sub && <div className="text-[10.5px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div><h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Szerződések</h1><p className="text-[12.5px] text-stone-500 mt-0.5">Ütemezett számlázás — fizetési mérföldkövek a projekt-fázisokhoz</p></div>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Új szerződés</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
        <KPI label="Szerződéses érték" value={_cthuf(totalValue)} sub={`${contracts.length} szerződés`} tone="emerald" icon="receipt" />
        <KPI label="Leszámlázva" value={_cthuf(invoiced)} sub={totalValue ? `${Math.round(invoiced / totalValue * 100)}%` : "—"} tone="teal" icon="check" />
        <KPI label="Esedékes mérföldkő" value={dueCount} sub="számlázásra vár" tone="amber" icon="clock" />
        <KPI label="Hátralévő" value={_cthuf(totalValue - invoiced)} sub="nyitott érték" tone="stone" icon="orders" />
      </div>
      <div className="space-y-3">
        {contracts.length ? contracts.map((c) => <ContractCard key={c.id} c={c} />) : <div className="bg-white rounded-2xl border border-stone-200 px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs szerződés. Hozz létre egyet rendelésből.</div>}
      </div>
      {newOpen && <NewContractSheet onClose={() => setNewOpen(false)} onCreated={() => setNewOpen(false)} />}
    </div>
  );
}

Object.assign(window, { CtMsStatusPill, ContractCard, NewContractSheet, FinanceContracts });
