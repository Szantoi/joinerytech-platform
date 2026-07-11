// ─────────────────────────────────────────────────────────────────
// page-stocktake.jsx — LELTÁR / KÉSZLET-REVÍZIÓ — a Raktár világ képernyője
//   A lot-modellre ülő ciklikus leltár: hatókör-snapshot → számlálás →
//   eltérés-egyeztetés → lezárás (whAdjustLot könyveli a korrekciókat).
//   KPI-sáv + lista + részlet-SlideOver (sor-szintű számlálás + FSM) + új ív.
//   Store: window.sim.stocktakes + akciók; StockEngine (FSM/eltérés/pontosság).
// ─────────────────────────────────────────────────────────────────
const { useState: useStateS } = React;

const _svar = (line) => window.StockEngine ? window.StockEngine.variance(line) : 0;

function StkStatusPill({ status, size = "md" }) {
  const t = (window.STK_STATUS || {})[status] || { label: status, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}
function StkStepper({ stk }) {
  const steps = (window.STK_FLOW || {}).order || [];
  const aborted = stk.status === "megszakitva";
  const cur = steps.indexOf(stk.status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
      {steps.map((st, i) => {
        const done = cur >= 0 && i < cur, active = i === cur;
        const lbl = (window.STK_STATUS[st] || {}).label || st;
        return (
          <React.Fragment key={st}>
            {i > 0 && <div className={`h-px w-3 shrink-0 ${done ? "bg-teal-300" : "bg-stone-200"}`} />}
            <div className={`shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border ${active ? "bg-teal-600 text-white border-teal-600" : done ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-white text-stone-400 border-stone-200"}`}>{done && <Icon name="check" size={10} />}{lbl}</div>
          </React.Fragment>
        );
      })}
      {aborted && <><div className="h-px w-3 shrink-0 bg-stone-300" /><div className="shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border bg-rose-50 text-rose-700 border-rose-200"><Icon name="x" size={10} />Megszakítva</div></>}
    </div>
  );
}
function VarianceBadge({ v, size = "md" }) {
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  if (v === 0) return <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-emerald-50 text-emerald-700 border-emerald-200 ${cls}`}><Icon name="check" size={11} />egyezik</span>;
  const neg = v < 0;
  return <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${neg ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"} ${cls}`}>{neg ? "−" : "+"}{Math.abs(v)}</span>;
}

function StkRow({ stk, onOpen }) {
  const sum = window.StockEngine ? window.StockEngine.summary(stk) : { counted: 0, total: 0, variances: 0, pct: 0 };
  return (
    <button onClick={() => onOpen(stk.id)} className="w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-teal-50 text-teal-600"><Icon name="inventory" size={18} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-stone-900 truncate">{stk.scope ? stk.scope.label : "Leltár"}</div>
        <div className="text-[11px] text-stone-500 truncate mt-0.5">{stk.id} · {(stk.lines || []).length} tétel · {stk.createdBy}</div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <StkStatusPill status={stk.status} size="sm" />
          {window.StockEngine && window.StockEngine.isOpen(stk) && <span className="text-[10px] text-stone-400">{sum.counted}/{sum.total} számolva</span>}
          {sum.variances > 0 && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium"><Icon name="alert" size={10} />{sum.variances} eltérés</span>}
        </div>
      </div>
      <div className="shrink-0 text-right"><div className="text-[10px] text-stone-400">Megnyitva</div><div className="text-[11px] font-medium text-stone-600">{stk.createdAt}</div></div>
    </button>
  );
}

function StkDetailHost({ openId, setOpen }) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const stk = openId ? (sim.stocktakes || []).find((x) => x.id === openId) : null;
  const onClose = () => setOpen(null);
  return (
    <SO open={!!stk} onClose={onClose} title={stk ? (stk.scope ? stk.scope.label : "Leltár") : ""} subtitle={stk ? `${stk.id} · ${stk.createdAt}` : ""} width={620}>
      {stk && window.StocktakeDetail ? <window.StocktakeDetail stk={stk} onClose={onClose} /> : null}
    </SO>
  );
}

function StocktakePage() {
  const sim = useSim();
  const list = sim.stocktakes || [];
  const [openId, setOpenId] = useStateS(null);
  const [newOpen, setNewOpen] = useStateS(false);
  const [statusF, setStatusF] = useStateS("all");
  const E = window.StockEngine;
  const open = list.filter((s) => E && E.isOpen(s));
  const counting = open.filter((s) => s.status === "szamlalas");
  const reconciling = open.filter((s) => s.status === "egyeztetes");
  const openVariances = open.reduce((n, s) => n + (E ? E.summary(s).variances : 0), 0);

  const shown = list.filter((s) => statusF === "all" ? true : statusF === "open" ? (E && E.isOpen(s)) : s.status === statusF);

  const KPI = ({ label, value, sub, tone = "stone", icon }) => (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-center justify-between"><div className={`w-8 h-8 rounded-lg grid place-items-center bg-${tone}-50 text-${tone}-600`}><Icon name={icon} size={16} /></div><div className="text-[22px] font-semibold text-stone-900 leading-none">{value}</div></div>
      <div className="text-[12px] font-medium text-stone-700 mt-2.5">{label}</div>{sub && <div className="text-[10.5px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Leltár</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Ciklikus készlet-revízió — a lotok vs. a fizikai számlálás · {window.STK_TODAY}</p>
        </div>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Új leltár-ív</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
        <KPI label="Nyitott leltár" value={open.length} sub="folyamatban" tone="teal" icon="inventory" />
        <KPI label="Számlálás alatt" value={counting.length} sub="terepen" tone="sky" icon="search" />
        <KPI label="Egyeztetésre vár" value={reconciling.length} sub="eltérés-bírálat" tone="amber" icon="layers" />
        <KPI label="Nyitott eltérés" value={openVariances} sub="könyvelésre vár" tone="rose" icon="alert" />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-teal-500">
          <option value="all">Minden státusz</option><option value="open">Csak nyitott</option>
          {Object.keys(window.STK_STATUS || {}).map((k) => <option key={k} value={k}>{window.STK_STATUS[k].label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {shown.length ? shown.map((s) => <StkRow key={s.id} stk={s} onOpen={setOpenId} />) : <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs leltár-ív.</div>}
      </div>

      <StkDetailHost openId={openId} setOpen={setOpenId} />
      {newOpen && window.NewStocktakeSheet && <window.NewStocktakeSheet onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />}
    </div>
  );
}

function StocktakeDetail({ stk, onClose }) {
  const sim = useSim();
  const live = (sim.stocktakes || []).find((x) => x.id === stk.id) || stk;
  const E = window.StockEngine;
  const sum = E ? E.summary(live) : { counted: 0, total: 0, variances: 0, net: 0, pct: 0, accuracy: 1, complete: false };
  const next = E ? E.nextStates(live) : [];
  const counting = live.status === "szamlalas";
  const isOpen = E && E.isOpen(live);
  const [abortOpen, setAbortOpen] = useStateS(false);

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="flex items-center gap-2 flex-wrap"><StkStatusPill status={live.status} /><span className="inline-flex items-center gap-1 text-[11.5px] text-stone-500"><Icon name={(window.STK_SCOPE[live.scope?.type] || {}).icon || "inventory"} size={13} />{live.scope ? live.scope.label : "—"}</span></div>
      <StkStepper stk={live} />
      {live.note && <div className="text-[12.5px] text-stone-600">{live.note}</div>}

      {/* haladás + összegzés */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-stone-200 p-2.5 text-center"><div className="text-[18px] font-semibold text-stone-900">{sum.counted}/{sum.total}</div><div className="text-[10.5px] text-stone-400 mt-0.5">számolva</div></div>
        <div className="rounded-xl border border-stone-200 p-2.5 text-center"><div className={`text-[18px] font-semibold ${sum.variances ? "text-amber-600" : "text-emerald-600"}`}>{sum.variances}</div><div className="text-[10.5px] text-stone-400 mt-0.5">eltérés</div></div>
        <div className="rounded-xl border border-stone-200 p-2.5 text-center"><div className="text-[18px] font-semibold text-stone-900">{Math.round(sum.accuracy * 100)}%</div><div className="text-[10.5px] text-stone-400 mt-0.5">pontosság</div></div>
      </div>

      {/* sorok */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Tételek</div>
        <div className="space-y-1.5">
          {(live.lines || []).map((l, idx) => {
            const v = _svar(l);
            return (
              <div key={idx} className="px-2.5 py-2 rounded-lg border border-stone-200">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1"><div className="text-[12.5px] font-medium text-stone-800 truncate">{l.name}</div><div className="text-[10.5px] text-stone-400">{l.locText} · rendszer: <span className="font-medium text-stone-600">{l.systemQty} {l.unit}</span></div></div>
                  {counting ? (
                    <input type="number" value={l.countedQty != null ? l.countedQty : ""} onChange={(e) => window.sim.setStocktakeCount(live.id, idx, e.target.value)} placeholder="számolt" className="w-[84px] h-9 px-2 text-center rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 shrink-0" />
                  ) : (
                    <div className="text-right shrink-0">{l.counted ? <><div className="text-[12.5px] font-semibold text-stone-800">{l.countedQty} {l.unit}</div>{isOpen || v !== 0 ? <div className="mt-0.5"><VarianceBadge v={v} size="sm" /></div> : null}</> : <span className="text-[11px] text-stone-400">nincs számolva</span>}</div>
                  )}
                </div>
              </div>
            );
          })}
          {!(live.lines || []).length && <div className="text-[12px] text-stone-400">Üres leltár-ív (a hatókörben nincs lot).</div>}
        </div>
      </div>

      {/* FSM léptetés */}
      {isOpen && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {next.filter((t) => t !== "megszakitva").map((to) => {
            const st = window.STK_STATUS[to] || {};
            const close = to === "lezarva";
            return <button key={to} onClick={() => window.sim.setStocktakeStatus(live.id, to)} className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${close ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-teal-600 text-white hover:bg-teal-700"}`}>{close ? <Icon name="check" size={14} /> : to === "szamlalas" ? <Icon name="search" size={14} /> : <Icon name="chevron" size={14} />}{close ? "Lezárás + könyvelés" : st.label}</button>;
          })}
          {next.includes("megszakitva") && <button onClick={() => setAbortOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 text-stone-500 text-[12.5px] font-medium hover:bg-stone-50"><Icon name="x" size={14} />Megszakít</button>}
        </div>
      )}
      {live.status === "egyeztetes" && sum.variances > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800 flex items-center gap-2"><Icon name="alert" size={15} className="shrink-0" />Lezáráskor {sum.variances} eltérés könyvelődik a lotokra (nettó {sum.net > 0 ? "+" : ""}{sum.net} egység).</div>}
      {abortOpen && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <div className="text-[12px] text-stone-700 mb-2">Biztosan megszakítod? A számolt értékek elvesznek, korrekció nem könyvelődik.</div>
          <div className="flex items-center gap-2"><button onClick={() => { window.sim.setStocktakeStatus(live.id, "megszakitva"); setAbortOpen(false); }} className="h-8 px-3 rounded-lg bg-rose-600 text-white text-[12px] font-medium">Megszakít</button><button onClick={() => setAbortOpen(false)} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button></div>
        </div>
      )}
      {live.status === "lezarva" && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2"><Icon name="check" size={16} className="text-emerald-600" /><div className="text-[12.5px] font-medium text-emerald-800">Lezárva {live.closedAt ? `· ${live.closedAt}` : ""} — a korrekciók a Mozgások közt láthatók.</div></div>}

      {(live.log || []).length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Napló</div>
          <div className="space-y-1.5">{live.log.slice().reverse().map((l, i) => <div key={i} className="flex items-start gap-2 text-[11.5px]"><span className="w-1.5 h-1.5 rounded-full bg-stone-300 mt-1.5 shrink-0" /><span className="text-stone-400 font-mono text-[10.5px] shrink-0">{l.at}</span><span className="text-stone-600">{l.text}</span></div>)}</div>
        </div>
      )}
    </div>
  );
}

function NewStocktakeSheet({ onClose, onCreated }) {
  const sim = useSim();
  const [scopeType, setScopeType] = useStateS("zone");
  const [zone, setZone] = useStateS("general");
  const [locId, setLocId] = useStateS("");
  const [note, setNote] = useStateS("");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500";
  const locs = window.sim.whLocations ? window.sim.whLocations() : [];

  // élő előnézet: hány lot esik a hatókörbe
  const items = window.sim.warehouseItems ? window.sim.warehouseItems() : [];
  let preview = 0;
  items.forEach((it) => ((it.worldExt && it.worldExt.warehouse && it.worldExt.warehouse.lots) || []).forEach((lot) => {
    if ((Number(lot.qty) || 0) <= 0) return;
    if (scopeType === "zone" && lot.zone !== zone) return;
    if (scopeType === "location" && lot.locId !== locId) return;
    preview++;
  }));

  const create = () => {
    const scope = scopeType === "zone" ? { type: "zone", zone } : scopeType === "location" ? { type: "location", locId } : { type: "all" };
    const id = window.sim.createStocktake({ scope, note });
    if (id && onCreated) onCreated(id);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[480px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"><div className="text-[14px] font-semibold text-stone-900">Új leltár-ív</div><button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button></div>
        <div className="px-4 py-4 space-y-3.5">
          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">Hatókör</label>
            <div className="flex items-center gap-1.5">
              {Object.keys(window.STK_SCOPE || {}).map((k) => { const m = window.STK_SCOPE[k]; const on = scopeType === k; return (
                <button key={k} onClick={() => setScopeType(k)} className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border ${on ? "border-teal-500 bg-teal-50" : "border-stone-200 bg-white"}`}><Icon name={m.icon} size={18} className={on ? "text-teal-700" : "text-stone-400"} /><span className={`text-[11px] font-medium ${on ? "text-teal-800" : "text-stone-600"}`}>{m.label}</span></button>
              ); })}
            </div>
          </div>
          {scopeType === "zone" && (
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Zóna</label>
              <select value={zone} onChange={(e) => setZone(e.target.value)} className={cls}>{(window.WH_ZONE_ORDER || []).map((z) => <option key={z} value={z}>{(window.WH_ZONES[z] || {}).label || z}</option>)}</select>
            </div>
          )}
          {scopeType === "location" && (
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Raktárhely</label>
              <select value={locId} onChange={(e) => setLocId(e.target.value)} className={cls}><option value="">Válassz helyet…</option>{locs.map((l) => <option key={l.id} value={l.id}>{window.sim.whLocLabel ? window.sim.whLocLabel(l) : l.id}</option>)}</select>
            </div>
          )}
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 flex items-center gap-2 text-[12px] text-stone-600"><Icon name="inventory" size={15} className="text-stone-400" /><span><span className="font-semibold text-stone-800">{preview}</span> lot kerül a leltár-ívre a pillanatnyi készletből.</span></div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Megjegyzés</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Pl. negyedéves ciklikus leltár…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500" /></div>
          <button disabled={scopeType === "location" && !locId} onClick={create} className="w-full h-10 rounded-xl bg-teal-600 text-white text-[13px] font-semibold disabled:opacity-40">Leltár-ív létrehozása</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StkStatusPill, StkStepper, VarianceBadge, StkRow, StkDetailHost, StocktakePage, StocktakeDetail, NewStocktakeSheet });
