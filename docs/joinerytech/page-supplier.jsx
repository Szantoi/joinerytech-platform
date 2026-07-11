// ─────────────────────────────────────────────────────────────────
// page-supplier.jsx — BESZÁLLÍTÓI PORTÁL (külső önkiszolgálás)
//   Teljes képernyős élmény, amikor a fiók portal==="supplier" (mint a B2C
//   webshop). NINCS új entitás — a beszállító a SAJÁT szeletét látja (név
//   szerint szűrve) és a meglévő RFQ/PO FSM beszállítói oldali akcióit végzi:
//   ajánlat-beadás az ajánlatkérésre, megrendelés-visszaigazolás + feladás (ASN).
//   Store: sim.supplierRfqs/supplierPos/submitSupplierBid/acknowledgePO/markPOShipped.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateS } = React;

const supHuf = (n) => (Number(n) || 0).toLocaleString("hu-HU") + " Ft";

// RFQ-állapot a beszállító szemszögéből → tónus
const SUP_RFQ_TONE = {
  beadando:  { label: "Ajánlat kérve",  pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  beadva:    { label: "Ajánlat beadva", pill: "bg-sky-50 text-sky-700 border-sky-200",             dot: "bg-sky-500" },
  nyertes:   { label: "Elnyerte",       pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  elveszett: { label: "Nem nyertes",    pill: "bg-stone-100 text-stone-500 border-stone-200",      dot: "bg-stone-400" },
  lezart:    { label: "Lezárva",        pill: "bg-stone-100 text-stone-500 border-stone-200",      dot: "bg-stone-400" },
};
function SupRfqPill({ state, size = "md" }) {
  const t = SUP_RFQ_TONE[state] || SUP_RFQ_TONE.lezart;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}

// ── Áttekintés ───────────────────────────────────────────────────
function SupplierDashboard({ onTab, onOpenRfq }) {
  const sim = useSim();
  const name = sim.supplierName();
  const rfqs = sim.supplierRfqs();
  const pos = sim.supplierPos();
  const byState = (st) => rfqs.filter((r) => sim.supplierRfqState(r) === st);
  const toBid = byState("beadando");
  const inReview = byState("beadva");
  const won = byState("nyertes");
  const toAck = pos.filter((p) => p.status === "running" && !p.ackAt);
  const billable = pos.filter((p) => sim.poInvoiceable(p));

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
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Üdv, {name}!</h1>
        <p className="text-[12.5px] text-stone-500 mt-0.5">JoineryTech beszállítói portál — ajánlatkérések és megrendelések egy helyen.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPI label="Ajánlatra vár" value={toBid.length} sub="beadandó ajánlat" tone="amber" icon="send" />
        <KPI label="Bírálat alatt" value={inReview.length} sub="beadott ajánlat" tone="sky" icon="clock" />
        <KPI label="Visszaigazolásra vár" value={toAck.length} sub="új megrendelés" tone="rose" icon="receipt" />
        <KPI label="Számlázható" value={billable.length} sub="feladott megrendelés" tone="emerald" icon="file" />
        <KPI label="Elnyert tender" value={won.length} sub="eddig" tone="teal" icon="check" />
      </div>

      {billable.length > 0 && (
        <button onClick={() => onTab("invoices")} className="w-full text-left rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3 hover:bg-emerald-100/70">
          <Icon name="file" size={18} className="text-emerald-600 shrink-0" />
          <div className="min-w-0 flex-1"><div className="text-[12.5px] font-semibold text-emerald-800">{billable.length} feladott megrendelés számlázható</div><div className="text-[11px] text-emerald-700/80 truncate">Nyújtsd be a számlát, és kövesd a befogadás/fizetés állapotát.</div></div>
          <Icon name="chevron" size={15} className="text-emerald-500" />
        </button>
      )}

      {toBid.length > 0 && (
        <button onClick={() => onTab("rfq")} className="w-full text-left rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3 hover:bg-amber-100/70">
          <Icon name="send" size={18} className="text-amber-600 shrink-0" />
          <div className="min-w-0 flex-1"><div className="text-[12.5px] font-semibold text-amber-800">{toBid.length} ajánlatkérés vár az ajánlatodra</div><div className="text-[11px] text-amber-700/80 truncate">{toBid.map((r) => r.title).join(" · ")}</div></div>
          <Icon name="chevron" size={15} className="text-amber-500" />
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-stone-800">Ajánlatkérések</span>
            <button onClick={() => onTab("rfq")} className="text-[11.5px] text-teal-700 font-medium inline-flex items-center gap-1">Mind <Icon name="chevron" size={13} /></button>
          </div>
          {rfqs.length ? rfqs.slice(0, 4).map((r) => <RfqRow key={r.id} rfq={r} onOpen={onOpenRfq} />) : <div className="px-4 py-8 text-center text-[12px] text-stone-400">Nincs ajánlatkérés.</div>}
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-stone-800">Megrendelések</span>
            <button onClick={() => onTab("orders")} className="text-[11.5px] text-teal-700 font-medium inline-flex items-center gap-1">Mind <Icon name="chevron" size={13} /></button>
          </div>
          {pos.length ? pos.slice(0, 4).map((p) => <PoRow key={p.id} po={p} compact />) : <div className="px-4 py-8 text-center text-[12px] text-stone-400">Nincs megrendelés.</div>}
        </div>
      </div>
    </div>
  );
}

// ── RFQ sor + lista ──────────────────────────────────────────────
function RfqRow({ rfq, onOpen }) {
  const sim = useSim();
  const state = sim.supplierRfqState(rfq);
  return (
    <button onClick={() => onOpen(rfq.id)} className="w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-teal-50 text-teal-600"><Icon name="send" size={17} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-stone-900 truncate">{rfq.title}</div>
        <div className="text-[11px] text-stone-500 truncate mt-0.5">{rfq.id} · {(rfq.lines || []).length} tétel · határidő {rfq.dueDate}</div>
      </div>
      <SupRfqPill state={state} size="sm" />
    </button>
  );
}

function SupplierRfqs({ onOpenRfq }) {
  const sim = useSim();
  const [f, setF] = useStateS("all");
  const all = sim.supplierRfqs();
  const list = all.filter((r) => f === "all" ? true : f === "open" ? sim.supplierRfqState(r) === "beadando" : sim.supplierRfqState(r) === f);
  const tabs = [["all", "Mind"], ["open", "Ajánlatra vár"], ["beadva", "Beadva"], ["nyertes", "Elnyert"]];
  return (
    <div className="space-y-3">
      <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Ajánlatkérések</h1>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabs.map(([k, lbl]) => <button key={k} onClick={() => setF(k)} className={`shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${f === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`}>{lbl}</button>)}
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {list.length ? list.map((r) => <RfqRow key={r.id} rfq={r} onOpen={onOpenRfq} />) : <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs találat.</div>}
      </div>
    </div>
  );
}

// ── RFQ ajánlat-beadó panel (SlideOver) ──────────────────────────
function RfqBidHost({ openId, setOpen }) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const rfq = openId ? (sim.rfqs || []).find((x) => x.id === openId) : null;
  const onClose = () => setOpen(null);
  return (
    <SO open={!!rfq} onClose={onClose} title={rfq ? rfq.title : ""} subtitle={rfq ? `${rfq.id} · határidő ${rfq.dueDate}` : ""} width={560}>
      {rfq ? <RfqBidPanel rfq={rfq} onClose={onClose} /> : null}
    </SO>
  );
}

function RfqBidPanel({ rfq, onClose }) {
  const sim = useSim();
  const live = (sim.rfqs || []).find((x) => x.id === rfq.id) || rfq;
  const name = sim.supplierName();
  const sup = (live.suppliers || []).find((s) => s.name === name) || { bids: {} };
  const state = sim.supplierRfqState(live);
  const editable = state === "beadando";
  const [bids, setBids] = useStateS(() => {
    const init = {};
    (live.lines || []).forEach((ln, i) => { const b = (sup.bids || {})[i] || {}; init[i] = { price: b.price != null ? String(b.price) : "", leadDays: b.leadDays != null ? String(b.leadDays) : "" }; });
    return init;
  });
  const [note, setNote] = useStateS(sup.note || "");
  const setBid = (i, k, v) => setBids((b) => ({ ...b, [i]: { ...b[i], [k]: v } }));
  const total = (live.lines || []).reduce((sum, ln, i) => sum + (Number(bids[i] && bids[i].price) || 0) * (Number(ln.qty) || 0), 0);
  const complete = (live.lines || []).every((ln, i) => bids[i] && bids[i].price !== "" && Number(bids[i].price) > 0);

  const submit = () => {
    const out = {};
    (live.lines || []).forEach((ln, i) => { out[i] = { price: Number(bids[i].price) || 0, leadDays: Number(bids[i].leadDays) || 0 }; });
    if (sim.submitSupplierBid(live.id, out, note)) onClose();
  };

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="flex items-center gap-2 flex-wrap"><SupRfqPill state={state} />{live.note && <span className="text-[11.5px] text-stone-500">{live.note}</span>}</div>

      {state === "nyertes" && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2"><Icon name="check" size={16} className="text-emerald-600" /><div className="text-[12.5px] font-medium text-emerald-800">Gratulálunk — elnyerted a tendert!{live.poRef ? ` Megrendelés: ${live.poRef}` : ""}</div></div>}
      {state === "elveszett" && <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 flex items-center gap-2"><Icon name="info" size={16} className="text-stone-500" /><div className="text-[12.5px] text-stone-600">Ezt a tendert másik beszállító nyerte. Köszönjük az ajánlatot.</div></div>}

      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Tételek {editable ? "— add meg az egységárat és az átfutást" : "— a beadott ajánlatod"}</div>
        <div className="space-y-2">
          {(live.lines || []).map((ln, i) => (
            <div key={i} className="rounded-xl border border-stone-200 p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="min-w-0"><div className="text-[12.5px] font-semibold text-stone-800 truncate">{ln.material}</div><div className="text-[10.5px] text-stone-400 font-mono">{ln.code} · {ln.qty} {ln.unit}</div></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-stone-500 block mb-0.5">Egységár (Ft / {ln.unit})</label>
                  <input type="number" disabled={!editable} value={bids[i] ? bids[i].price : ""} onChange={(e) => setBid(i, "price", e.target.value)} placeholder="0" className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 disabled:bg-stone-50 disabled:text-stone-500" />
                </div>
                <div className="w-24">
                  <label className="text-[10px] text-stone-500 block mb-0.5">Átfutás (nap)</label>
                  <input type="number" disabled={!editable} value={bids[i] ? bids[i].leadDays : ""} onChange={(e) => setBid(i, "leadDays", e.target.value)} placeholder="0" className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 disabled:bg-stone-50 disabled:text-stone-500" />
                </div>
              </div>
              {Number(bids[i] && bids[i].price) > 0 && <div className="text-[10.5px] text-stone-400 mt-1.5">Sorösszeg: <span className="font-semibold text-stone-600">{supHuf((Number(bids[i].price) || 0) * (Number(ln.qty) || 0))}</span></div>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2.5">
        <span className="text-[12px] font-medium text-stone-600">Ajánlat összesen (nettó)</span>
        <span className="text-[15px] font-semibold text-stone-900 tabular-nums">{supHuf(total)}</span>
      </div>

      <div>
        <label className="text-[10.5px] text-stone-500 block mb-1">Megjegyzés</label>
        <textarea disabled={!editable} value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Pl. készleten, akciós ár, szállítási feltétel…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 disabled:bg-stone-50 disabled:text-stone-500" />
      </div>

      {editable ? (
        <button disabled={!complete} onClick={submit} className="w-full h-11 rounded-xl bg-teal-600 text-white text-[13px] font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2"><Icon name="send" size={15} />Ajánlat beadása</button>
      ) : sup.respondedAt ? (
        <div className="text-center text-[11.5px] text-stone-400">Beadva: {sup.respondedAt}</div>
      ) : null}
    </div>
  );
}

// ── Megrendelés sor + lista ──────────────────────────────────────
function PoStatusPill({ po, size = "md" }) {
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  let t;
  if (po.status === "delivered") t = { label: "Bevételezve", pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
  else if (po.shipped) t = { label: "Feladva", pill: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" };
  else if (po.ackAt) t = { label: "Visszaigazolva", pill: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500" };
  else t = { label: "Új — visszaigazolásra vár", pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}

function PoRow({ po, compact, onBill }) {
  const lines = po.lines || (po.material ? [{ material: po.material, qty: po.qty }] : []);
  const total = po.total || (po.lines || []).reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);
  const inv = !compact && window.sim.poInvoice ? window.sim.poInvoice(po.id) : null;
  const canBill = !compact && window.sim.poInvoiceable && window.sim.poInvoiceable(po);
  return (
    <div className="px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-stone-100 text-stone-500"><Icon name="receipt" size={17} /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-stone-900 truncate">{po.id}{po.projectName ? ` · ${po.projectName}` : ""}</div>
          <div className="text-[11px] text-stone-500 truncate mt-0.5">{lines.map((l) => `${l.material} ×${l.qty}`).join(" · ") || po.material} · szállítás {po.promiseDate || po.eta}</div>
        </div>
        <PoStatusPill po={po} size="sm" />
      </div>
      {!compact && (
        <div className="mt-2.5 flex items-center justify-between gap-2 pl-12">
          {total > 0 && <span className="text-[11.5px] text-stone-500">Érték: <span className="font-semibold text-stone-700">{supHuf(total)}</span></span>}
          <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
            {!po.ackAt && po.status === "running" && <button onClick={() => window.sim.acknowledgePO(po.id)} className="h-8 px-3 rounded-lg bg-teal-600 text-white text-[12px] font-medium inline-flex items-center gap-1"><Icon name="check" size={13} />Visszaigazolás</button>}
            {po.ackAt && !po.shipped && po.status === "running" && <button onClick={() => window.sim.markPOShipped(po.id)} className="h-8 px-3 rounded-lg bg-sky-600 text-white text-[12px] font-medium inline-flex items-center gap-1"><Icon name="truck" size={13} />Feladás (ASN)</button>}
            {po.shipped && po.status === "running" && !inv && !canBill && <span className="text-[11.5px] text-sky-600 font-medium inline-flex items-center gap-1"><Icon name="truck" size={13} />Úton — bevételezésre vár</span>}
            {inv ? (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-500"><Icon name="file" size={13} className="text-stone-400" /><span className="font-mono text-stone-600">{inv.id}</span><SupInvPill status={inv.status} size="sm" /></span>
            ) : canBill ? (
              <button onClick={() => onBill && onBill(po.id)} className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[12px] font-medium inline-flex items-center gap-1"><Icon name="file" size={13} />Számla benyújtása</button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function SupplierOrders({ onBill }) {
  const sim = useSim();
  const pos = sim.supplierPos();
  return (
    <div className="space-y-3">
      <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Megrendelések</h1>
      <p className="text-[12.5px] text-stone-500">Igazold vissza az új megrendeléseket, jelöld feladottnak (ASN), majd nyújtsd be a számlát.</p>
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {pos.length ? pos.map((p) => <PoRow key={p.id} po={p} onBill={onBill} />) : <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs aktív megrendelés.</div>}
      </div>
    </div>
  );
}

// ── Beszállítói SZÁMLA — állapot a beszállító szemszögéből ────────
const SUP_INV_TONE = {
  draft:   { label: "Befogadásra vár",          pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  issued:  { label: "Befogadva — fizetésre vár", pill: "bg-sky-50 text-sky-700 border-sky-200",             dot: "bg-sky-500" },
  partial: { label: "Részben fizetve",          pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  paid:    { label: "Kifizetve",                pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  void:    { label: "Elutasítva",               pill: "bg-stone-100 text-stone-500 border-stone-200",      dot: "bg-stone-400" },
};
function SupInvPill({ status, size = "md" }) {
  const t = SUP_INV_TONE[status] || SUP_INV_TONE.draft;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}
const supInvFmt = (n, cur) => cur === "EUR" ? (Number(n) || 0).toLocaleString("hu-HU") + " €" : supHuf(n);
const supGross = (inv) => (inv.lines || []).reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0) * (1 + (Number(l.vat) || 0) / 100), 0);

function SupInvRow({ inv }) {
  return (
    <div className="px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-stone-100 text-stone-500"><Icon name="file" size={17} /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-stone-900 truncate">{inv.id}{inv.extNo ? ` · ${inv.extNo}` : ""}</div>
          <div className="text-[11px] text-stone-500 truncate mt-0.5">{inv.orderRef ? `${inv.orderRef} · ` : ""}kiállítva {inv.issueDate} · fiz. határidő {inv.dueDate || "—"}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[12.5px] font-semibold text-stone-800 tabular-nums">{supInvFmt(supGross(inv), inv.currency)}</div>
          <div className="mt-1"><SupInvPill status={inv.status} size="sm" /></div>
        </div>
      </div>
    </div>
  );
}

function SupplierInvoices({ onBill }) {
  const sim = useSim();
  const invs = sim.supplierInvoices();
  const billable = sim.supplierPos().filter((p) => sim.poInvoiceable(p));
  return (
    <div className="space-y-3">
      <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Számláim</h1>
      <p className="text-[12.5px] text-stone-500">Nyújtsd be a számlát a feladott megrendelésekre, és kövesd a befogadás/fizetés állapotát.</p>

      {billable.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Számlázható megrendelés ({billable.length})</div>
          {billable.map((p) => {
            const lines = p.lines || (p.material ? [{ material: p.material, qty: p.qty }] : []);
            const total = p.total || (p.lines || []).reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);
            return (
              <button key={p.id} onClick={() => onBill(p.id)} className="w-full text-left rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3 hover:bg-emerald-100/70">
                <Icon name="file" size={17} className="text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-emerald-800 truncate">{p.id}{total > 0 ? ` · ${supHuf(total)}` : ""}</div>
                  <div className="text-[11px] text-emerald-700/80 truncate">{lines.map((l) => `${l.material} ×${l.qty}`).join(" · ")}</div>
                </div>
                <span className="shrink-0 h-8 px-3 rounded-lg bg-emerald-600 text-white text-[12px] font-medium inline-flex items-center gap-1"><Icon name="file" size={13} />Számla</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-stone-100"><span className="text-[12.5px] font-semibold text-stone-800">Benyújtott számlák</span></div>
        {invs.length ? invs.map((v) => <SupInvRow key={v.id} inv={v} />) : <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Még nincs benyújtott számla.</div>}
      </div>
    </div>
  );
}

// ── Számla-benyújtó panel (SlideOver) ────────────────────────────
function SupInvHost({ openId, setOpen }) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const po = openId ? (sim.pos || []).find((p) => p.id === openId) : null;
  const onClose = () => setOpen(null);
  return (
    <SO open={!!po} onClose={onClose} title="Számla benyújtása" subtitle={po ? `${po.id}${po.projectName ? ` · ${po.projectName}` : ""}` : ""} width={560}>
      {po ? <SupplierInvoicePanel po={po} onClose={onClose} /> : null}
    </SO>
  );
}

function SupplierInvoicePanel({ po, onClose }) {
  const sim = useSim();
  const today = window.FIN_TODAY || "2026-04-28";
  const addDays = (d, n) => { const dt = new Date(d + "T00:00:00"); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };
  const cur = po.currency || "HUF";
  const poLines = (po.lines && po.lines.length) ? po.lines : (po.material ? [{ material: po.material, qty: po.qty, price: po.unitPrice || 0, unit: po.unit || "db" }] : []);
  const [rows, setRows] = useStateS(() => poLines.map((l) => ({ name: l.material || l.name || "Tétel", qty: String(l.qty || 1), unit: l.unit || "db", unitPrice: String(l.price || 0), vat: "27" })));
  const [extNo, setExtNo] = useStateS("");
  const [issueDate, setIssueDate] = useStateS(today);
  const [dueDate, setDueDate] = useStateS(addDays(today, 30));
  const [note, setNote] = useStateS("");
  const setRow = (i, k, v) => setRows((rs) => rs.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  const net = rows.reduce((a, r) => a + (Number(r.qty) || 0) * (Number(r.unitPrice) || 0), 0);
  const vat = rows.reduce((a, r) => a + (Number(r.qty) || 0) * (Number(r.unitPrice) || 0) * (Number(r.vat) || 0) / 100, 0);
  const gross = net + vat;
  const valid = extNo.trim() && rows.every((r) => Number(r.unitPrice) > 0 && Number(r.qty) > 0);

  const submit = () => {
    const lines = rows.map((r) => ({ name: r.name, qty: Number(r.qty) || 1, unit: r.unit, unitPrice: Number(r.unitPrice) || 0, vat: Number(r.vat) || 0 }));
    if (sim.submitSupplierInvoice(po.id, { extNo, issueDate, dueDate, note, lines })) onClose();
  };

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-[11.5px] text-stone-600">
        A számla a <span className="font-medium text-stone-800">{po.id}</span> megrendelésre kerül be a JoineryTech Pénzügyhöz <span className="font-medium">befogadásra vár</span> állapotban. A befogadás és a kifizetés a JoineryTech oldalán történik.
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <label className="block">
          <span className="text-[10.5px] text-stone-500 block mb-0.5">Számlaszámod *</span>
          <input value={extNo} onChange={(e) => setExtNo(e.target.value)} placeholder="pl. FA-26-2210" className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-mono bg-white outline-none focus:border-teal-500" />
        </label>
        <label className="block">
          <span className="text-[10.5px] text-stone-500 block mb-0.5">Pénznem</span>
          <div className="h-9 px-2.5 rounded-lg border border-stone-200 bg-stone-50 text-[12.5px] text-stone-500 inline-flex items-center">{cur}</div>
        </label>
        <label className="block">
          <span className="text-[10.5px] text-stone-500 block mb-0.5">Kiállítás</span>
          <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500" />
        </label>
        <label className="block">
          <span className="text-[10.5px] text-stone-500 block mb-0.5">Fizetési határidő</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500" />
        </label>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Tételek — a megrendelésből előtöltve, módosíthatod</div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="rounded-xl border border-stone-200 p-3">
              <div className="text-[12.5px] font-semibold text-stone-800 mb-2">{r.name}</div>
              <div className="flex items-end gap-2">
                <div className="w-16">
                  <label className="text-[10px] text-stone-500 block mb-0.5">Menny.</label>
                  <input type="number" value={r.qty} onChange={(e) => setRow(i, "qty", e.target.value)} className="w-full h-9 px-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-stone-500 block mb-0.5">Egységár ({cur} / {r.unit})</label>
                  <input type="number" value={r.unitPrice} onChange={(e) => setRow(i, "unitPrice", e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500" />
                </div>
                <div className="w-20">
                  <label className="text-[10px] text-stone-500 block mb-0.5">ÁFA %</label>
                  <select value={r.vat} onChange={(e) => setRow(i, "vat", e.target.value)} className="w-full h-9 px-1.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500">
                    {["27", "18", "5", "0"].map((v) => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </div>
              </div>
              <div className="text-[10.5px] text-stone-400 mt-1.5 text-right">Sor (nettó): <span className="font-semibold text-stone-600">{supInvFmt((Number(r.qty) || 0) * (Number(r.unitPrice) || 0), cur)}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2.5 space-y-1">
        <div className="flex items-center justify-between text-[11.5px] text-stone-500"><span>Nettó</span><span className="tabular-nums">{supInvFmt(net, cur)}</span></div>
        <div className="flex items-center justify-between text-[11.5px] text-stone-500"><span>ÁFA</span><span className="tabular-nums">{supInvFmt(vat, cur)}</span></div>
        <div className="flex items-center justify-between text-[13px] font-semibold text-stone-900 pt-1 border-t border-stone-200"><span>Bruttó</span><span className="tabular-nums">{supInvFmt(gross, cur)}</span></div>
      </div>

      <div>
        <label className="text-[10.5px] text-stone-500 block mb-1">Megjegyzés</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Opcionális megjegyzés a számlához…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500" />
      </div>

      <button disabled={!valid} onClick={submit} className="w-full h-11 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2"><Icon name="file" size={15} />Számla benyújtása</button>
      {!valid && <div className="text-center text-[10.5px] text-stone-400">Add meg a számlaszámod és minden tétel egységárát.</div>}
    </div>
  );
}

// ── Portál-váz (teljes képernyő) ─────────────────────────────────
function SupplierPortal({ onExit, exitLabel }) {
  const sim = useSim();
  const [tab, setTab] = useStateS("dash");
  const [openRfq, setOpenRfq] = useStateS(null);
  const [billPo, setBillPo] = useStateS(null);
  const name = sim.supplierName();
  const toBid = sim.supplierRfqs().filter((r) => sim.supplierRfqState(r) === "beadando").length;
  const toAck = sim.supplierPos().filter((p) => p.status === "running" && !p.ackAt).length;
  const toBill = sim.supplierPos().filter((p) => sim.poInvoiceable(p)).length;

  const NAV = [
    { key: "dash", label: "Áttekintés", icon: "dashboard" },
    { key: "rfq", label: "Ajánlatkérések", icon: "send", badge: toBid },
    { key: "orders", label: "Megrendelések", icon: "receipt", badge: toAck },
    { key: "invoices", label: "Számláim", icon: "file", badge: toBill },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-teal-600 text-white grid place-items-center shrink-0"><Icon name="storefront" size={17} /></span>
            <div className="min-w-0 leading-tight">
              <div className="text-[13px] font-semibold text-stone-900 truncate">Beszállítói portál</div>
              <div className="text-[10.5px] text-stone-400 truncate">{name}</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {window.ProfileSwitcher ? <window.ProfileSwitcher /> : null}
            <button onClick={onExit} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600 hover:bg-stone-50 inline-flex items-center gap-1.5"><Icon name="logout" size={14} />{exitLabel || "Kilépés"}</button>
          </div>
        </div>
        <div className="max-w-[1100px] mx-auto px-2 md:px-6 flex items-center gap-1 overflow-x-auto">
          {NAV.map((n) => (
            <button key={n.key} onClick={() => setTab(n.key)} className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-10 text-[12.5px] font-medium border-b-2 -mb-px ${tab === n.key ? "border-teal-600 text-teal-700" : "border-transparent text-stone-500 hover:text-stone-800"}`}>
              <Icon name={n.icon} size={15} />{n.label}
              {n.badge > 0 && <span className="ml-0.5 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[10px] font-semibold">{n.badge}</span>}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-4 md:px-6 py-5 md:py-7">
        {tab === "dash" && <SupplierDashboard onTab={setTab} onOpenRfq={setOpenRfq} />}
        {tab === "rfq" && <SupplierRfqs onOpenRfq={setOpenRfq} />}
        {tab === "orders" && <SupplierOrders onBill={setBillPo} />}
        {tab === "invoices" && <SupplierInvoices onBill={setBillPo} />}
      </main>

      <RfqBidHost openId={openRfq} setOpen={setOpenRfq} />
      <SupInvHost openId={billPo} setOpen={setBillPo} />
    </div>
  );
}

Object.assign(window, {
  SupplierPortal, SupplierDashboard, SupplierRfqs, SupplierOrders, SupplierInvoices,
  RfqBidHost, RfqBidPanel, RfqRow, PoRow, SupRfqPill, PoStatusPill,
  SupInvPill, SupInvRow, SupInvHost, SupplierInvoicePanel,
});
