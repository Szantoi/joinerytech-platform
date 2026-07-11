// ─────────────────────────────────────────────────────────────────
// page-maintenance.jsx — KARBANTARTÁS / ESZKÖZGAZDÁLKODÁS világ (1/2)
//   Áttekintés (eszköz-állapot KPI + esedékes megelőző + nyitott munkalapok +
//   állásidő), Eszköz-nyilvántartás (lista + kártya SlideOver), Munkalapok
//   (lista + FSM detail). A kártya, ütemterv, állásidő-napló és sheetek a
//   page-maintenance-2.jsx-ben. Store: window.sim.assets / workOrders /
//   maintPlans / downtime + MaintEngine. Akcent: cyan.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateMN, useMemo: useMemoMN } = React;

const MNT_TODAY = "2026-04-28";
const mntHuf = (n) => (Math.round(n || 0)).toLocaleString("hu-HU") + " Ft";

// ── Pill-ek / badge-ek ───────────────────────────────────────────
function AssetKindBadge({ kind, size = "md" }) {
  const m = (window.ASSET_KINDS || {})[kind] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${m.pill || "bg-stone-100 text-stone-600 border-stone-200"}`}><Icon name={m.icon || "box"} size={size === "sm" ? 10 : 12} />{m.short || kind}</span>;
}
function AssetStatusPill({ status, size = "md" }) {
  const m = (window.ASSET_STATUS || {})[status] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${m.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label || status}</span>;
}
function WoTypeBadge({ kind }) {
  const m = (window.WO_TYPE || {})[kind] || {};
  return <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: m.accent }}><Icon name={m.icon || "wrench"} size={12} />{m.label || kind}</span>;
}
function WoStatusPill({ status, size = "md" }) {
  const m = (window.WO_STATUS || {})[status] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${m.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label || status}</span>;
}
function WoPriorityPill({ priority, size = "md" }) {
  const m = (window.WO_PRIORITY || {})[priority] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${m.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label || priority}</span>;
}
// megelőző terv esedékesség jelvény
function PlanDueBadge({ due }) {
  if (!due) return null;
  if (due.unit === "nap") {
    if (due.overdue) return <span className="text-[10.5px] font-medium text-rose-600">{Math.abs(due.daysLeft)} napja lejárt</span>;
    if (due.due) return <span className="text-[10.5px] font-medium text-amber-600">ma esedékes</span>;
    return <span className="text-[10.5px] text-stone-500">{due.daysLeft} nap múlva</span>;
  }
  if (due.overdue) return <span className="text-[10.5px] font-medium text-rose-600">{Math.abs(Math.round(due.hoursLeft))} üó túllépés</span>;
  if (due.due) return <span className="text-[10.5px] font-medium text-amber-600">esedékes (üzemóra)</span>;
  return <span className="text-[10.5px] text-stone-500">{Math.round(due.hoursLeft)} üó múlva</span>;
}

// ── Detail hostok (SlideOver) ────────────────────────────────────
function AssetDetailHost({ openId, onClose }) {
  const sim = useSim();
  const SO = window.SlideOver;
  const asset = openId ? window.sim.findAsset(openId) : null;
  if (!SO) return null;
  const st = asset ? window.sim.assetStatus(asset.id) : null;
  return (
    <SO open={!!asset} onClose={onClose} title={asset ? asset.name : ""} subtitle={asset ? asset.code : ""} width={640}>
      {asset && window.AssetDetail ? <window.AssetDetail asset={asset} /> : null}
    </SO>
  );
}
function WoDetailHost({ openId, onClose }) {
  const sim = useSim();
  const SO = window.SlideOver;
  const wo = openId ? window.sim.findWorkOrder(openId) : null;
  const asset = wo ? window.sim.findAsset(wo.assetId) : null;
  if (!SO) return null;
  return (
    <SO open={!!wo} onClose={onClose} title={wo ? wo.title : ""} subtitle={wo ? (wo.id + (asset ? " · " + asset.name : "")) : ""} width={600}>
      {wo && window.WoDetail ? <window.WoDetail wo={wo} /> : null}
    </SO>
  );
}

// ── Áttekintés ───────────────────────────────────────────────────
function MaintDashboard({ onScreen }) {
  const sim = useSim();
  const [openAsset, setOpenAsset] = useStateMN(null);
  const [openWo, setOpenWo] = useStateMN(null);
  const assets = window.sim.assetList();
  const statusCount = { uzemel: 0, karbantartas: 0, leallitva: 0 };
  assets.forEach((a) => { const s = window.sim.assetStatus(a.id); if (statusCount[s] != null) statusCount[s]++; });
  const due = window.sim.duePlans(7);
  const openWOs = (sim.workOrders || []).filter((w) => (window.WO_OPEN || []).includes(w.status));
  const openDowntime = (sim.downtime || []).filter((d) => !d.end);
  const dtHours = openDowntime.reduce((a, d) => a + (Number(d.hours) || 0), 0);
  const canManage = window.sim.hasPerm("maintenance.manage");
  const PORDER = window.WO_PRIORITY_ORDER || [];
  const sortedWOs = openWOs.slice().sort((a, b) => PORDER.indexOf(a.priority) - PORDER.indexOf(b.priority));

  const KPI = ({ label, value, sub, tone }) => (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">{label}</div>
      <div className={`text-[22px] font-semibold leading-none mt-1.5 ${tone === "rose" ? "text-rose-700" : tone === "amber" ? "text-amber-700" : tone === "emerald" ? "text-emerald-700" : "text-stone-900"}`}>{value}</div>
      {sub && <div className="text-[10.5px] text-stone-400 mt-1">{sub}</div>}
    </div>
  );

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="mb-4">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Karbantartás</h1>
        <p className="text-[12.5px] text-stone-500 mt-0.5">Eszköz-állapot, megelőző karbantartás és állásidő — {MNT_TODAY}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Eszközök" value={assets.length} sub={`${statusCount.uzemel} üzemel`} tone="emerald" />
        <KPI label="Karbantartás alatt" value={statusCount.karbantartas} sub={statusCount.leallitva ? `${statusCount.leallitva} leállítva` : "nincs leállás"} tone={statusCount.karbantartas ? "amber" : "default"} />
        <KPI label="Esedékes megelőző" value={due.length} sub="következő 7 nap / üzemóra" tone={due.length ? "amber" : "default"} />
        <KPI label="Nyitott munkalap" value={openWOs.length} sub={`Állásidő most: ${Math.round(dtHours)} ó`} tone={statusCount.leallitva ? "rose" : "default"} />
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-4">
        {/* esedékes megelőző */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12.5px] font-semibold text-stone-800">Esedékes megelőző karbantartás</span>
            <button onClick={() => onScreen && onScreen("schedule")} className="text-[11.5px] text-cyan-700 font-medium inline-flex items-center gap-1">Ütemterv <Icon name="chevron" size={13} /></button>
          </div>
          {due.length ? (
            <div className="space-y-1.5">
              {due.map(({ plan, asset, due }) => (
                <div key={plan.id} className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: (window.WO_TYPE[plan.kind] || {}).accent + "1a", color: (window.WO_TYPE[plan.kind] || {}).accent }}><Icon name={(window.WO_TYPE[plan.kind] || {}).icon || "shield"} size={14} /></span>
                  <button onClick={() => setOpenAsset(asset.id)} className="min-w-0 flex-1 text-left">
                    <div className="text-[12px] font-medium text-stone-800 truncate">{plan.label}</div>
                    <div className="text-[10.5px] text-stone-400 truncate">{asset.name} · <PlanDueBadge due={due} /></div>
                  </button>
                  {canManage && <button onClick={() => { const woId = window.sim.createWorkOrderFromPlan(plan.id); if (woId) setOpenWo(woId); }} className="h-8 px-2.5 rounded-lg bg-cyan-600 text-white text-[11px] font-medium shrink-0">Munkalap</button>}
                </div>
              ))}
            </div>
          ) : <div className="text-[12px] text-stone-400">Nincs esedékes megelőző karbantartás.</div>}
        </div>

        {/* eszköz-állapot */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12.5px] font-semibold text-stone-800">Eszköz-állapot</span>
            <button onClick={() => onScreen && onScreen("assets")} className="text-[11.5px] text-cyan-700 font-medium inline-flex items-center gap-1">Mind <Icon name="chevron" size={13} /></button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            {[["uzemel", "emerald"], ["karbantartas", "amber"], ["leallitva", "rose"]].map(([k, c]) => (
              <div key={k} className="flex-1 text-center rounded-lg border border-stone-200 py-2">
                <div className={`text-[18px] font-semibold text-${c}-600`}>{statusCount[k]}</div>
                <div className="text-[9.5px] text-stone-400">{(window.ASSET_STATUS[k] || {}).label}</div>
              </div>
            ))}
          </div>
          {/* nem-üzemelő eszközök kiemelve */}
          {assets.filter((a) => window.sim.assetStatus(a.id) !== "uzemel").map((a) => (
            <button key={a.id} onClick={() => setOpenAsset(a.id)} className="w-full flex items-center gap-2.5 text-left hover:bg-stone-50/70 rounded-lg px-1 py-1.5">
              <span className="w-7 h-7 rounded-md grid place-items-center shrink-0" style={{ background: (window.ASSET_KINDS[a.kind] || {}).accent + "1a", color: (window.ASSET_KINDS[a.kind] || {}).accent }}><Icon name={(window.ASSET_KINDS[a.kind] || {}).icon || "box"} size={13} /></span>
              <div className="min-w-0 flex-1"><div className="text-[12px] font-medium text-stone-800 truncate">{a.name}</div><div className="text-[10px] text-stone-400 truncate">{a.location}</div></div>
              <AssetStatusPill status={window.sim.assetStatus(a.id)} size="sm" />
            </button>
          ))}
        </div>
      </div>

      {/* nyitott munkalapok */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-stone-800">Nyitott munkalapok{openWOs.length ? ` (${openWOs.length})` : ""}</span>
          <button onClick={() => onScreen && onScreen("workorders")} className="text-[11.5px] text-cyan-700 font-medium inline-flex items-center gap-1">Mind <Icon name="chevron" size={13} /></button>
        </div>
        {sortedWOs.length ? sortedWOs.map((w) => <WoRow key={w.id} wo={w} onOpen={setOpenWo} />) : <div className="px-4 py-8 text-center text-[12px] text-stone-400">Nincs nyitott munkalap.</div>}
      </div>

      <AssetDetailHost openId={openAsset} onClose={() => setOpenAsset(null)} />
      <WoDetailHost openId={openWo} onClose={() => setOpenWo(null)} />
    </div>
  );
}

// ── Munkalap-sor (lista) ─────────────────────────────────────────
function WoRow({ wo, onOpen }) {
  const asset = window.sim.findAsset(wo.assetId);
  const sla = window.MaintEngine.woSla(wo, MNT_TODAY);
  return (
    <button onClick={() => onOpen(wo.id)} className="w-full text-left px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3">
      <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: (window.WO_TYPE[wo.kind] || {}).accent + "1a", color: (window.WO_TYPE[wo.kind] || {}).accent }}><Icon name={(window.WO_TYPE[wo.kind] || {}).icon || "wrench"} size={15} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><span className="text-[12.5px] font-semibold text-stone-900 truncate">{wo.title}</span>{wo.breakdown && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shrink-0">géptörés</span>}</div>
        <div className="text-[10.5px] text-stone-400 truncate">{wo.id} · {asset ? asset.name : ""}{wo.delegatedTo ? " · " + wo.delegatedTo : ""}{!sla.done && sla.overdue ? " · SLA lejárt" : ""}</div>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 shrink-0"><WoPriorityPill priority={wo.priority} size="sm" /></div>
      <WoStatusPill status={wo.status} size="sm" />
      <Icon name="chevron" size={15} className="text-stone-300 shrink-0" />
    </button>
  );
}

// ── Eszköz-nyilvántartás ─────────────────────────────────────────
function AssetRegistry() {
  const sim = useSim();
  const [openId, setOpenId] = useStateMN(null);
  const [kind, setKind] = useStateMN("all");
  const [q, setQ] = useStateMN("");
  const [addOpen, setAddOpen] = useStateMN(false);
  const canManage = window.sim.hasPerm("maintenance.manage");
  const assets = window.sim.assetList()
    .filter((a) => kind === "all" || a.kind === kind)
    .filter((a) => !q.trim() || (a.name + " " + a.code + " " + (a.vendor || "")).toLowerCase().includes(q.toLowerCase()));
  const KINDS = window.ASSET_KIND_ORDER || [];

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Eszközök</h1>
        {canManage && <button onClick={() => setAddOpen(true)} className="h-9 px-3 rounded-lg bg-cyan-600 text-white text-[12.5px] font-medium inline-flex items-center gap-1.5"><Icon name="plus" size={15} />Új eszköz</button>}
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"><Icon name="search" size={15} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés név / kód / gyártó…" className="w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-cyan-500" />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          <button onClick={() => setKind("all")} className={`h-8 px-2.5 rounded-lg text-[11.5px] font-medium shrink-0 border ${kind === "all" ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200"}`}>Összes</button>
          {KINDS.map((k) => { const m = window.ASSET_KINDS[k]; return (
            <button key={k} onClick={() => setKind(k)} className={`h-8 px-2.5 rounded-lg text-[11.5px] font-medium shrink-0 border ${kind === k ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200"}`}>{m.short}</button>
          ); })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {assets.map((a) => {
          const st = window.sim.assetStatus(a.id);
          const plans = window.sim.maintPlansForAsset(a.id);
          return (
            <button key={a.id} onClick={() => setOpenId(a.id)} className="w-full text-left px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: (window.ASSET_KINDS[a.kind] || {}).accent + "1a", color: (window.ASSET_KINDS[a.kind] || {}).accent }}><Icon name={(window.ASSET_KINDS[a.kind] || {}).icon || "box"} size={18} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="text-[13px] font-semibold text-stone-900 truncate">{a.name}</span><span className="text-[10px] font-mono text-stone-400 shrink-0">{a.code}</span></div>
                <div className="text-[11px] text-stone-500 truncate">{a.vendor ? a.vendor + " · " : ""}{a.location}</div>
                <div className="hidden sm:flex items-center gap-1.5 mt-1.5"><AssetKindBadge kind={a.kind} size="sm" />{plans.length > 0 && <span className="text-[9.5px] text-stone-400">{plans.length} terv</span>}</div>
              </div>
              <AssetStatusPill status={st} size="sm" />
              <Icon name="chevron" size={15} className="text-stone-300 shrink-0" />
            </button>
          );
        })}
        {!assets.length && <div className="px-4 py-10 text-center text-[12px] text-stone-400">Nincs találat.</div>}
      </div>

      <AssetDetailHost openId={openId} onClose={() => setOpenId(null)} />
      {addOpen && window.NewAssetSheet && <window.NewAssetSheet onClose={() => setAddOpen(false)} />}
    </div>
  );
}

// ── Munkalapok (lista + szűrő) ───────────────────────────────────
function MaintWorkOrders() {
  const sim = useSim();
  const [openId, setOpenId] = useStateMN(null);
  const [status, setStatus] = useStateMN("open");
  const [addOpen, setAddOpen] = useStateMN(false);
  const canManage = window.sim.hasPerm("maintenance.manage");
  const all = sim.workOrders || [];
  const list = all.filter((w) =>
    status === "all" ? true :
    status === "open" ? (window.WO_OPEN || []).includes(w.status) :
    w.status === status)
    .slice().sort((a, b) => (b.reportedAt || "").localeCompare(a.reportedAt || ""));
  const FILTERS = [["open", "Nyitott"], ["all", "Összes"], ["folyamatban", "Folyamatban"], ["kesz", "Kész"]];

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Munkalapok</h1>
        <button onClick={() => setAddOpen(true)} className="h-9 px-3 rounded-lg bg-cyan-600 text-white text-[12.5px] font-medium inline-flex items-center gap-1.5"><Icon name="plus" size={15} />Új munkalap</button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto mb-3">
        {FILTERS.map(([k, l]) => <button key={k} onClick={() => setStatus(k)} className={`h-8 px-3 rounded-lg text-[11.5px] font-medium shrink-0 border ${status === k ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200"}`}>{l}</button>)}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {list.length ? list.map((w) => <WoRow key={w.id} wo={w} onOpen={setOpenId} />) : <div className="px-4 py-10 text-center text-[12px] text-stone-400">Nincs munkalap ebben a nézetben.</div>}
      </div>

      <WoDetailHost openId={openId} onClose={() => setOpenId(null)} />
      {addOpen && window.NewWorkOrderSheet && <window.NewWorkOrderSheet onClose={() => setAddOpen(false)} onCreated={(id) => { setAddOpen(false); setOpenId(id); }} />}
    </div>
  );
}

Object.assign(window, {
  AssetKindBadge, AssetStatusPill, WoTypeBadge, WoStatusPill, WoPriorityPill, PlanDueBadge,
  AssetDetailHost, WoDetailHost, WoRow,
  MaintDashboard, AssetRegistry, MaintWorkOrders,
  MNT_TODAY, mntHuf,
});
