// ─────────────────────────────────────────────────────────────────
// page-rfq.jsx — BESZÁLLÍTÓI AJÁNLATKÉRÉS (RFQ) — a Beszerzés világ képernyője
//   A PO ELÉ fűzött kör: igény/tételek → több beszállító ajánlata → bírálat
//   (ár/átfutás összehasonlítás) → odaítélés a nyertesnek → szállítónkénti PO
//   (createPOsFromReqs). KPI-sáv + lista + részlet-SlideOver (ajánlat-mátrix +
//   FSM) + új ajánlatkérés sheet. Store: window.sim.rfqs + akciók; RfqEngine.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateR } = React;

const _rhuf = (n) => (n == null ? "—" : Math.round(Number(n) || 0).toLocaleString("hu-HU") + " Ft");

// ── Közös elemek ─────────────────────────────────────────────────
function RfqStatusPill({ status, size = "md" }) {
  const t = (window.RFQ_STATUS || {})[status] || { label: status, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}
function RfqStepper({ rfq }) {
  const steps = (window.RFQ_FLOW || {}).order || [];
  const withdrawn = rfq.status === "visszavonva";
  const cur = steps.indexOf(rfq.status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
      {steps.map((st, i) => {
        const done = cur >= 0 && i < cur, active = i === cur;
        const lbl = (window.RFQ_STATUS[st] || {}).label || st;
        return (
          <React.Fragment key={st}>
            {i > 0 && <div className={`h-px w-3 shrink-0 ${done ? "bg-amber-300" : "bg-stone-200"}`} />}
            <div className={`shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border ${active ? "bg-amber-500 text-white border-amber-500" : done ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-white text-stone-400 border-stone-200"}`}>{done && <Icon name="check" size={10} />}{lbl}</div>
          </React.Fragment>
        );
      })}
      {withdrawn && <><div className="h-px w-3 shrink-0 bg-stone-300" /><div className="shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border bg-rose-50 text-rose-700 border-rose-200"><Icon name="x" size={10} />Visszavonva</div></>}
    </div>
  );
}
function RfqRow({ rfq, onOpen }) {
  const E = window.RfqEngine;
  const resp = E ? E.respondedCount(rfq) : 0;
  const rec = E ? E.recommended(rfq) : null;
  return (
    <button onClick={() => onOpen(rfq.id)} className="w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-amber-50 text-amber-600"><Icon name="procurement" size={18} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-stone-900 truncate">{rfq.title}</div>
        <div className="text-[11px] text-stone-500 truncate mt-0.5">{rfq.id} · {(rfq.lines || []).length} tétel · {(rfq.suppliers || []).length} beszállító</div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <RfqStatusPill status={rfq.status} size="sm" />
          {resp > 0 && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-medium">{resp} ajánlat</span>}
          {rfq.status === "biralat" && rec && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"><Icon name="check" size={10} />{rec.name.split(" ")[0]} · {_rhuf(rec.total)}</span>}
          {rfq.awardedTo && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">{rfq.awardedTo.split(" ")[0]}{rfq.poRef ? ` · ${rfq.poRef}` : ""}</span>}
        </div>
      </div>
      {rfq.dueDate && <div className="shrink-0 text-right"><div className="text-[10px] text-stone-400">Határidő</div><div className="text-[11px] font-medium text-stone-600">{rfq.dueDate}</div></div>}
    </button>
  );
}

function RfqDetailHost({ openId, setOpen }) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const rfq = openId ? (sim.rfqs || []).find((x) => x.id === openId) : null;
  const onClose = () => setOpen(null);
  return (
    <SO open={!!rfq} onClose={onClose} title={rfq ? rfq.title : ""} subtitle={rfq ? `${rfq.id} · határidő ${rfq.dueDate || "—"}` : ""} width={680}>
      {rfq && window.RfqDetail ? <window.RfqDetail rfq={rfq} onClose={onClose} /> : null}
    </SO>
  );
}

// ── Megrendelés-vázlatok panel (szállító alá gyűjtve, összevonható) ──────────
function PoDraftPanel({ onOpenRfq }) {
  const sim = useSim();
  const drafts = (sim.pos || []).filter((p) => p.status === "draft");
  const [open, setOpen] = useStateR(true);
  const [sel, setSel] = useStateR([]);
  const [reqPick, setReqPick] = useStateR(false);
  const reqs = (sim.requisitions || []).filter((r) => r.status === "Approved");

  // szállító alá csoportosítva
  const groups = {};
  drafts.forEach((p) => { (groups[p.supplier] = groups[p.supplier] || []).push(p); });
  const supList = Object.keys(groups).sort();
  const toggle = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const mergeSupplier = (sup) => { const ids = groups[sup].filter((p) => sel.includes(p.id)).map((p) => p.id); if (ids.length < 2) return; window.sim.mergeDraftPOs(ids); setSel([]); };

  if (!drafts.length && !reqs.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 mb-4 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50/60">
        <div className="flex items-center gap-2">
          <Icon name="orders" size={16} className="text-amber-500" />
          <span className="text-[13px] font-semibold text-stone-800">Megrendelés-vázlatok</span>
          <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">{drafts.length}</span>
        </div>
        <Icon name="chevron" size={15} className={`text-stone-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-stone-100 pt-3 space-y-3">
          {!drafts.length && <div className="text-[12px] text-stone-400">Nincs vázlat. Jóváhagyott igényből készíthetsz egyet lent.</div>}
          {supList.map((sup) => {
            const items = groups[sup];
            const selInSup = items.filter((p) => sel.includes(p.id)).length;
            const supTotal = items.reduce((s, p) => s + (p.total || 0), 0);
            return (
              <div key={sup} className="rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-3 py-2 bg-stone-50/70 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0"><Icon name="truck" size={14} className="text-stone-400 shrink-0" /><span className="text-[12.5px] font-semibold text-stone-800 truncate">{sup}</span><span className="text-[10.5px] text-stone-400">{items.length} vázlat · {_rhuf(supTotal)}</span></div>
                  {items.length > 1 && <button onClick={() => mergeSupplier(sup)} disabled={selInSup < 2} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-stone-900 text-white text-[11px] font-medium disabled:opacity-30 shrink-0"><Icon name="layers" size={12} />Összevon{selInSup >= 2 ? ` (${selInSup})` : ""}</button>}
                </div>
                <div className="divide-y divide-stone-100">
                  {items.map((p) => (
                    <div key={p.id} className="px-3 py-2.5 flex items-center gap-2.5">
                      {items.length > 1 && <input type="checkbox" checked={sel.includes(p.id)} onChange={() => toggle(p.id)} className="shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><span className="text-[11px] font-mono text-stone-500">{p.id}</span><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-medium">Vázlat</span>{p.approvalPending && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium"><Icon name="alert" size={10} />Jóváhagyásra vár</span>}</div>
                        <div className="text-[12px] text-stone-800 truncate mt-0.5">{(p.lines || []).map((l) => `${l.material} (${l.qty} ${l.unit})`).join(", ") || p.material}</div>
                        {p.note && <div className="text-[10.5px] text-stone-400 mt-0.5">{p.note}</div>}
                      </div>
                      <div className="text-[11.5px] font-semibold text-stone-700 shrink-0">{_rhuf(p.total)}</div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => window.sim.releasePO(p.id)} title="Megrendelés (kiküldés)" className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-medium"><Icon name="check" size={11} />Megrendel</button>
                        <button onClick={() => { const rid = window.sim.createRfqFromPO(p.id); if (rid && onOpenRfq) onOpenRfq(rid); }} title="Ajánlatkérés indítása a vázlatból" className="inline-flex items-center gap-1 h-7 px-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[10.5px] font-medium hover:bg-amber-100"><Icon name="send" size={11} />RFQ</button>
                        <button onClick={() => window.sim.deletePO(p.id)} title="Vázlat törlése" className="w-7 h-7 grid place-items-center rounded-lg border border-stone-200 text-stone-400 hover:text-rose-500"><Icon name="x" size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Vázlat jóváhagyott igényből */}
          {reqs.length > 0 && (
            <div>
              {!reqPick ? (
                <button onClick={() => setReqPick(true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-stone-200 text-stone-600 text-[12px] font-medium hover:bg-stone-50"><Icon name="plus" size={14} />Vázlat jóváhagyott igényből</button>
              ) : (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                  <div className="text-[11px] text-stone-500 mb-1.5">Válassz jóváhagyott igényt → vázlat-megrendelés (a megjegyzés a forrásra hivatkozik):</div>
                  <div className="space-y-1">
                    {reqs.map((r) => (
                      <button key={r.id} onClick={() => { window.sim.requisitionToDraftPO(r.id); }} className="w-full text-left px-2.5 py-2 rounded-lg border border-stone-200 bg-white hover:border-amber-300 flex items-center gap-2">
                        <span className="text-[11px] font-mono text-stone-500 shrink-0">{r.id}</span>
                        <span className="text-[12px] text-stone-800 truncate flex-1">{r.material} · {r.qty} {r.unit}</span>
                        <span className="text-[10.5px] text-stone-400 shrink-0">{r.preferredSupplier || "—"}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setReqPick(false)} className="mt-2 text-[11px] text-stone-500 hover:text-stone-700">Bezárás</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Fő képernyő (KPI + lista) ────────────────────────────────────
function RfqPage() {
  const sim = useSim();
  const list = sim.rfqs || [];
  const [openId, setOpenId] = useStateR(null);
  const [newOpen, setNewOpen] = useStateR(false);
  const [statusF, setStatusF] = useStateR("open");
  const [q, setQ] = useStateR("");
  const E = window.RfqEngine;
  const open = list.filter((r) => E && E.isOpen(r));
  const awaiting = open.filter((r) => r.status === "biralat");
  const awardedThis = list.filter((r) => r.status === "odaitelve");
  const totalSavings = list.reduce((n, r) => { const s = E ? E.savings(r) : null; return n + (s ? s.amount : 0); }, 0);

  const shown = list.filter((r) =>
    (statusF === "all" ? true : statusF === "open" ? (E && E.isOpen(r)) : r.status === statusF)
    && (!q.trim() || (r.title + " " + r.id + " " + (r.suppliers || []).map((s) => s.name).join(" ")).toLowerCase().includes(q.toLowerCase())));

  const KPI = ({ label, value, sub, tone = "stone", icon }) => (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-lg grid place-items-center bg-${tone}-50 text-${tone}-600`}><Icon name={icon} size={16} /></div>
        <div className="text-[22px] font-semibold text-stone-900 leading-none">{value}</div>
      </div>
      <div className="text-[12px] font-medium text-stone-700 mt-2.5">{label}</div>
      {sub && <div className="text-[10.5px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Ajánlatkérés</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Beszállítói versenyeztetés a megrendelés előtt — {window.RFQ_TODAY}</p>
        </div>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Új ajánlatkérés</button>
      </div>

      <div className="mt-4"><PoDraftPanel onOpenRfq={setOpenId} /></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="Nyitott ajánlatkérés" value={open.length} sub="folyamatban" tone="amber" icon="procurement" />
        <KPI label="Bírálatra vár" value={awaiting.length} sub="ajánlatok beérkeztek" tone="sky" icon="layers" />
        <KPI label="Odaítélve" value={awardedThis.length} sub="PO generálva" tone="emerald" icon="check" />
        <KPI label="Verseny-megtakarítás" value={_rhuf(totalSavings)} sub="legdrágább vs. nyertes" tone="teal" icon="analytics" />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]"><Icon name="search" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés…" className="w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-amber-500" /></div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500">
          <option value="open">Csak nyitott</option><option value="all">Minden státusz</option>
          {Object.keys(window.RFQ_STATUS || {}).map((k) => <option key={k} value={k}>{window.RFQ_STATUS[k].label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {shown.length ? shown.map((r) => <RfqRow key={r.id} rfq={r} onOpen={setOpenId} />)
          : <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs találat.</div>}
      </div>

      <RfqDetailHost openId={openId} setOpen={setOpenId} />
      {newOpen && window.NewRfqSheet && <window.NewRfqSheet onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />}
    </div>
  );
}

// ── Részlet (ajánlat-mátrix + FSM + odaítélés) ───────────────────
function RfqDetail({ rfq, onClose }) {
  const sim = useSim();
  const live = (sim.rfqs || []).find((x) => x.id === rfq.id) || rfq;
  const E = window.RfqEngine;
  const next = E ? E.nextStates(live) : [];
  const editable = live.status === "osszeallitas";
  const canBid = ["kikuldve", "biralat"].includes(live.status);
  const rec = E ? E.recommended(live) : null;
  const savings = E ? E.savings(live) : null;
  const canAward = window.sim.hasPerm && window.sim.hasPerm("rfq.manage");
  const [withdrawOpen, setWithdrawOpen] = useStateR(false);
  const [wReason, setWReason] = useStateR("");
  const [supAdd, setSupAdd] = useStateR("");
  const [lineForm, setLineForm] = useStateR({ code: "", material: "", qty: 1, unit: "db" });

  const supOptions = window.sim.rfqSupplierOptions ? window.sim.rfqSupplierOptions() : [];
  const whItems = window.sim.warehouseItems ? window.sim.warehouseItems() : [];

  const addLine = () => {
    if (!lineForm.material.trim()) return;
    window.sim.addRfqLine(live.id, lineForm);
    setLineForm({ code: "", material: "", qty: 1, unit: "db" });
  };
  const pickItem = (id) => {
    const it = whItems.find((x) => x.id === id);
    if (it) setLineForm({ code: it.code || "", material: it.name, qty: 1, unit: it.unit || "db" });
  };

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="flex items-center gap-2 flex-wrap"><RfqStatusPill status={live.status} />{live.note && <span className="text-[12px] text-stone-500">{live.note}</span>}</div>
      <RfqStepper rfq={live} />

      <div className="rounded-xl border border-stone-200 p-3 flex items-center gap-3 text-[11px] text-stone-400">
        <span className="inline-flex items-center gap-1"><Icon name="user" size={12} />{live.createdBy}</span>
        <span>Felvéve: {live.createdAt}</span>
        {live.dueDate && <span className="inline-flex items-center gap-1"><Icon name="clock" size={12} />Határidő: {live.dueDate}</span>}
      </div>

      {/* Tételek */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Tételek ({(live.lines || []).length})</div>
        <div className="space-y-1.5">
          {(live.lines || []).map((ln, i) => (
            <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-stone-200">
              <div className="min-w-0 flex-1"><div className="text-[12.5px] font-medium text-stone-800 truncate">{ln.material}</div><div className="text-[10.5px] text-stone-400 font-mono">{ln.code || "—"}</div></div>
              <div className="text-[12px] text-stone-600 shrink-0">{ln.qty} {ln.unit}</div>
              {editable && <button onClick={() => window.sim.removeRfqLine(live.id, i)} className="text-stone-300 hover:text-rose-500 shrink-0"><Icon name="x" size={14} /></button>}
            </div>
          ))}
          {!(live.lines || []).length && <div className="text-[12px] text-stone-400">Nincs tétel.</div>}
        </div>
        {editable && (
          <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-2.5 space-y-2">
            <select onChange={(e) => { if (e.target.value) pickItem(e.target.value); e.target.value = ""; }} className="w-full h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500">
              <option value="">Raktári tételből…</option>
              {whItems.map((it) => <option key={it.id} value={it.id}>{it.name} ({it.code})</option>)}
            </select>
            <div className="flex items-center gap-1.5">
              <input value={lineForm.material} onChange={(e) => setLineForm({ ...lineForm, material: e.target.value })} placeholder="Megnevezés" className="flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500" />
              <input type="number" value={lineForm.qty} onChange={(e) => setLineForm({ ...lineForm, qty: e.target.value })} className="w-16 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500" />
              <input value={lineForm.unit} onChange={(e) => setLineForm({ ...lineForm, unit: e.target.value })} className="w-12 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500" />
              <button onClick={addLine} disabled={!lineForm.material.trim()} className="h-8 px-2.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium disabled:opacity-40 shrink-0"><Icon name="plus" size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Ajánlat-mátrix */}
      {(live.suppliers || []).length > 0 && (live.lines || []).length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Ajánlatok (ár / átfutás)</div>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full border-collapse text-[12px]" style={{ minWidth: 360 }}>
              <thead>
                <tr>
                  <th className="text-left font-medium text-stone-400 text-[10.5px] uppercase tracking-wide py-1.5 pr-2">Tétel</th>
                  {(live.suppliers || []).map((s) => (
                    <th key={s.name} className="text-center font-medium text-[11px] py-1.5 px-1.5 min-w-[92px]">
                      <div className="text-stone-700 leading-tight">{s.name.split(" ")[0]}</div>
                      {rec && rec.name === s.name && <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600"><Icon name="check" size={9} />legjobb</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(live.lines || []).map((ln, i) => {
                  const best = E ? E.bestForLine(live, i) : null;
                  return (
                    <tr key={i} className="border-t border-stone-100">
                      <td className="py-1.5 pr-2 align-top"><div className="text-[11.5px] font-medium text-stone-800 leading-tight">{ln.material}</div><div className="text-[10px] text-stone-400">{ln.qty} {ln.unit}</div></td>
                      {(live.suppliers || []).map((s) => {
                        const b = s.bids && s.bids[i];
                        const isBest = best && b && b.price === best.price && b.price != null;
                        return (
                          <td key={s.name} className="py-1.5 px-1 align-top text-center">
                            {canBid ? (
                              <div className="flex flex-col items-center gap-1">
                                <input type="number" value={b && b.price != null ? b.price : ""} onChange={(e) => window.sim.setRfqBid(live.id, s.name, i, { price: e.target.value === "" ? null : e.target.value, leadDays: b ? b.leadDays : 0 })} placeholder="ár" className={`w-[72px] h-7 px-1.5 text-center rounded border text-[11px] bg-white outline-none focus:border-amber-500 ${isBest ? "border-emerald-300 text-emerald-700 font-semibold" : "border-stone-200"}`} />
                                <input type="number" value={b && b.leadDays != null ? b.leadDays : ""} onChange={(e) => window.sim.setRfqBid(live.id, s.name, i, { price: b ? b.price : null, leadDays: e.target.value === "" ? null : e.target.value })} placeholder="nap" className="w-[72px] h-6 px-1.5 text-center rounded border border-stone-200 text-[10px] text-stone-500 bg-white outline-none focus:border-amber-500" />
                              </div>
                            ) : (
                              <div>{b && b.price != null ? <><div className={`text-[11.5px] ${isBest ? "text-emerald-700 font-semibold" : "text-stone-700"}`}>{_rhuf(b.price)}</div><div className="text-[10px] text-stone-400">{b.leadDays} nap</div></> : <span className="text-stone-300">—</span>}</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-stone-200">
                  <td className="py-2 pr-2 text-[11px] font-semibold text-stone-600">Összesen</td>
                  {(live.suppliers || []).map((s) => { const t = E ? E.supplierTotal(live, s.name) : null; const isRec = rec && rec.name === s.name;
                    return (
                      <td key={s.name} className="py-2 px-1 text-center align-top">
                        {t && t.lines > 0 ? <div className={`text-[11.5px] font-semibold ${isRec ? "text-emerald-700" : "text-stone-800"}`}>{_rhuf(t.total)}{!t.complete && <span className="text-[9px] text-amber-500 block">részleges</span>}</div> : <span className="text-stone-300 text-[11px]">nincs</span>}
                        {!E || !E.isOpen(live) ? null : (live.status === "biralat" && t && t.complete && canAward ? <button onClick={() => window.sim.awardRfq(live.id, s.name)} className="mt-1.5 inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-medium"><Icon name="check" size={11} />Odaítél</button> : null)}
                      </td>
                    ); })}
                </tr>
              </tbody>
            </table>
          </div>
          {savings && <div className="mt-2 text-[11px] text-teal-700 inline-flex items-center gap-1"><Icon name="analytics" size={13} />Verseny-megtakarítás: <span className="font-semibold">{_rhuf(savings.amount)}</span> ({Math.round(savings.pct * 100)}%) a legdrágábbhoz képest.</div>}
        </div>
      )}

      {/* Beszállítók kezelése (összeállítás) */}
      {editable && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Meghívott beszállítók</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(live.suppliers || []).map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full bg-stone-100 text-stone-700 text-[11.5px] font-medium">{s.name}<button onClick={() => window.sim.removeRfqSupplier(live.id, s.name)} className="text-stone-400 hover:text-rose-500"><Icon name="x" size={13} /></button></span>
            ))}
            {!(live.suppliers || []).length && <span className="text-[12px] text-stone-400">Még nincs meghívott beszállító.</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <input list="rfq-sup-list" value={supAdd} onChange={(e) => setSupAdd(e.target.value)} placeholder="Beszállító neve" className="flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500" />
            <datalist id="rfq-sup-list">{supOptions.map((n) => <option key={n} value={n} />)}</datalist>
            <button onClick={() => { if (supAdd.trim()) { window.sim.addRfqSupplier(live.id, supAdd); setSupAdd(""); } }} className="h-8 px-2.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium shrink-0">Meghív</button>
          </div>
        </div>
      )}

      {/* FSM léptetés */}
      {E && E.isOpen(live) && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {next.filter((t) => t !== "visszavonva").map((to) => {
            const st = window.RFQ_STATUS[to] || {};
            return <button key={to} onClick={() => window.sim.setRfqStatus(live.id, to)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-amber-500 text-white text-[12.5px] font-medium hover:bg-amber-600">{to === "kikuldve" ? <Icon name="send" size={14} /> : <Icon name="chevron" size={14} />}{st.label}</button>;
          })}
          {next.includes("visszavonva") && <button onClick={() => setWithdrawOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 text-stone-500 text-[12.5px] font-medium hover:bg-stone-50"><Icon name="x" size={14} />Visszavon</button>}
        </div>
      )}
      {withdrawOpen && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <label className="text-[11px] text-stone-600 font-medium block mb-1">Visszavonás oka (opcionális)</label>
          <textarea value={wReason} onChange={(e) => setWReason(e.target.value)} rows={2} className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-stone-400" placeholder="Pl. nincs igény, elhalasztva…" />
          <div className="flex items-center gap-2 mt-2"><button onClick={() => { window.sim.setRfqStatus(live.id, "visszavonva", { reason: wReason }); setWithdrawOpen(false); }} className="h-8 px-3 rounded-lg bg-rose-600 text-white text-[12px] font-medium">Visszavon</button><button onClick={() => setWithdrawOpen(false)} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button></div>
        </div>
      )}
      {live.status === "biralat" && !canAward && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800 inline-flex items-center gap-2"><Icon name="alert" size={15} />Az odaítéléshez <span className="font-mono">rfq.manage</span> jogosultság szükséges.</div>}
      {live.status === "odaitelve" && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2"><Icon name="check" size={16} className="text-emerald-600" /><div className="text-[12.5px] font-medium text-emerald-800">Odaítélve: {live.awardedTo}{live.poRef ? <> · megrendelés <span className="font-mono">{live.poRef}</span></> : ""}</div></div>}

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

// ── Új ajánlatkérés sheet ────────────────────────────────────────
function NewRfqSheet({ onClose, onCreated }) {
  const sim = useSim();
  const [title, setTitle] = useStateR("");
  const [dueDate, setDueDate] = useStateR("");
  const [note, setNote] = useStateR("");
  const [lines, setLines] = useStateR([]);
  const [suppliers, setSuppliers] = useStateR([]);
  const [supAdd, setSupAdd] = useStateR("");
  const [lineForm, setLineForm] = useStateR({ code: "", material: "", qty: 1, unit: "db" });
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-amber-500";
  const whItems = window.sim.warehouseItems ? window.sim.warehouseItems() : [];
  const supOptions = window.sim.rfqSupplierOptions ? window.sim.rfqSupplierOptions() : [];
  const reqs = (sim.requisitions || []).filter((r) => ["Draft", "Approved"].includes(r.status));

  const addLine = () => { if (!lineForm.material.trim()) return; setLines([...lines, { ...lineForm, qty: Number(lineForm.qty) || 1 }]); setLineForm({ code: "", material: "", qty: 1, unit: "db" }); };
  const pickItem = (id) => { const it = whItems.find((x) => x.id === id); if (it) setLineForm({ code: it.code || "", material: it.name, qty: 1, unit: it.unit || "db" }); };
  const addReq = (id) => { const r = reqs.find((x) => x.id === id); if (!r) return; const ls = (r.lines && r.lines.length) ? r.lines.map((l) => ({ code: l.code || "", material: l.material || l.name, qty: l.qty, unit: l.unit })) : [{ code: r.matCode || "", material: r.material, qty: r.qty, unit: r.unit }]; setLines([...lines, ...ls]); if (r.preferredSupplier && !suppliers.includes(r.preferredSupplier)) setSuppliers([...suppliers, r.preferredSupplier]); };
  const create = () => { if (!title.trim() || !lines.length) return; const id = window.sim.addRfq({ title, dueDate, note, lines, suppliers }); if (id && onCreated) onCreated(id); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[560px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between z-10"><div className="text-[14px] font-semibold text-stone-900">Új ajánlatkérés</div><button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button></div>
        <div className="px-4 py-4 space-y-3.5">
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Tárgy *</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pl. Korpusz lapanyag — Q2 utántöltés" className={cls} /></div>
          <div className="flex items-center gap-2">
            <div className="flex-1"><label className="text-[10.5px] text-stone-500 block mb-1">Beérkezési határidő</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={cls} /></div>
          </div>

          {/* igényből */}
          {reqs.length > 0 && (
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Tételek beszerzési igényből</label>
              <select onChange={(e) => { if (e.target.value) addReq(e.target.value); e.target.value = ""; }} className={cls}><option value="">Igény hozzáadása…</option>{reqs.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.material} ({r.qty} {r.unit})</option>)}</select>
            </div>
          )}

          {/* tételek */}
          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">Tételek *</label>
            <div className="space-y-1.5 mb-2">
              {lines.map((ln, i) => <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-stone-200"><div className="min-w-0 flex-1 text-[12px] text-stone-800 truncate">{ln.material} <span className="text-stone-400">· {ln.qty} {ln.unit}</span></div><button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-stone-300 hover:text-rose-500"><Icon name="x" size={14} /></button></div>)}
              {!lines.length && <div className="text-[11.5px] text-stone-400">Még nincs tétel.</div>}
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 space-y-2">
              <select onChange={(e) => { if (e.target.value) pickItem(e.target.value); e.target.value = ""; }} className="w-full h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500"><option value="">Raktári tételből…</option>{whItems.map((it) => <option key={it.id} value={it.id}>{it.name} ({it.code})</option>)}</select>
              <div className="flex items-center gap-1.5">
                <input value={lineForm.material} onChange={(e) => setLineForm({ ...lineForm, material: e.target.value })} placeholder="Megnevezés" className="flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500" />
                <input type="number" value={lineForm.qty} onChange={(e) => setLineForm({ ...lineForm, qty: e.target.value })} className="w-14 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500" />
                <input value={lineForm.unit} onChange={(e) => setLineForm({ ...lineForm, unit: e.target.value })} className="w-12 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500" />
                <button onClick={addLine} disabled={!lineForm.material.trim()} className="h-8 px-2.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium disabled:opacity-40 shrink-0"><Icon name="plus" size={14} /></button>
              </div>
            </div>
          </div>

          {/* beszállítók */}
          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">Meghívott beszállítók</label>
            <div className="flex flex-wrap gap-1.5 mb-2">{suppliers.map((n) => <span key={n} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full bg-stone-100 text-stone-700 text-[11.5px] font-medium">{n}<button onClick={() => setSuppliers(suppliers.filter((x) => x !== n))} className="text-stone-400 hover:text-rose-500"><Icon name="x" size={13} /></button></span>)}</div>
            <div className="flex items-center gap-1.5">
              <input list="rfq-new-sup" value={supAdd} onChange={(e) => setSupAdd(e.target.value)} placeholder="Beszállító neve" className="flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-amber-500" />
              <datalist id="rfq-new-sup">{supOptions.map((n) => <option key={n} value={n} />)}</datalist>
              <button onClick={() => { const n = supAdd.trim(); if (n && !suppliers.includes(n)) { setSuppliers([...suppliers, n]); setSupAdd(""); } }} className="h-8 px-2.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium shrink-0">Hozzáad</button>
            </div>
          </div>

          <div><label className="text-[10.5px] text-stone-500 block mb-1">Megjegyzés</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Részletek…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-amber-500" /></div>
          <button disabled={!title.trim() || !lines.length} onClick={create} className="w-full h-10 rounded-xl bg-amber-500 text-white text-[13px] font-semibold disabled:opacity-40">Ajánlatkérés létrehozása</button>
          <div className="text-[10.5px] text-stone-400 text-center">Létrehozás után „összeállítás" állapotba kerül; a kiküldés a részlet-nézetből indítható.</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RfqStatusPill, RfqStepper, RfqRow, RfqDetailHost, PoDraftPanel, RfqPage, RfqDetail, NewRfqSheet });
