// ─────────────────────────────────────────────────────────────────
// page-ehs.jsx — MUNKAVÉDELEM / EHS világ (üzemi munkavédelem)
//   Áttekintés (KPI + lejáró oktatás + nyitott incidens) + Balesetek (lista +
//   FSM-detail + CAPA) + Kockázatok (mátrix-kártyák + detail) + Oktatás
//   (dolgozónkénti lejárat-tábla). A detail-SlideOverök + sheetek a
//   page-ehs-2.jsx-ben élnek (window.*). Store: sim.ehs* + EhsEngine.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateE } = React;

// ── Közös elemek ─────────────────────────────────────────────────
function EhsTypeBadge({ type, size = "md" }) {
  const m = (window.EHS_INC_TYPE || {})[type] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-md border font-medium ${cls} ${m.pill}`}><Icon name={m.icon || "alert"} size={size === "sm" ? 11 : 12} />{m.short || type}</span>;
}
function EhsSevPill({ sev, size = "md" }) {
  const s = (window.EHS_INC_SEV || {})[sev] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${s.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.short || sev}</span>;
}
function EhsStatusPill({ status, size = "md" }) {
  const t = (window.EHS_INC_STATUS || {})[status] || { label: status, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}
function EhsRiskBadge({ risk, residual = false, size = "md" }) {
  const E = window.EhsEngine; if (!E) return null;
  const sc = residual ? E.residualScore(risk) : E.score(risk);
  const band = E.band(sc);
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-full border font-semibold tabular-nums ${cls} ${band.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${band.dot}`} />{sc} · {band.label}</span>;
}
function EhsSlaBadge({ inc, size = "md" }) {
  const sla = window.EhsEngine ? window.EhsEngine.sla(inc) : { active: false };
  if (!sla.active) return null;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  if (sla.overdue) return <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-rose-50 text-rose-700 border-rose-200 ${cls}`}><Icon name="clock" size={11} />{Math.abs(sla.daysLeft)} napja lejárt</span>;
  if (sla.daysLeft <= 1) return <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-amber-50 text-amber-700 border-amber-200 ${cls}`}><Icon name="clock" size={11} />{sla.daysLeft === 0 ? "ma jár le" : "1 nap"}</span>;
  return <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-stone-50 text-stone-500 border-stone-200 ${cls}`}><Icon name="clock" size={11} />{sla.daysLeft} nap</span>;
}
function EhsStepper({ inc }) {
  const steps = (window.EHS_INC_FLOW || {}).order || [];
  const rejected = inc.status === "elutasitva";
  const cur = steps.indexOf(inc.status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
      {steps.map((st, i) => {
        const done = cur >= 0 && i < cur, active = i === cur;
        const lbl = (window.EHS_INC_STATUS[st] || {}).label || st;
        return (
          <React.Fragment key={st}>
            {i > 0 && <div className={`h-px w-3 shrink-0 ${done ? "bg-red-300" : "bg-stone-200"}`} />}
            <div className={`shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border ${active ? "bg-red-600 text-white border-red-600" : done ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-stone-400 border-stone-200"}`}>{done && <Icon name="check" size={10} />}{lbl}</div>
          </React.Fragment>
        );
      })}
      {rejected && <><div className="h-px w-3 shrink-0 bg-stone-300" /><div className="shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border bg-rose-100 text-rose-600 border-rose-200"><Icon name="x" size={10} />Elutasítva</div></>}
    </div>
  );
}

function IncRow({ inc, onOpen }) {
  const m = (window.EHS_INC_TYPE || {})[inc.type] || {};
  const prog = window.EhsEngine ? window.EhsEngine.actionProgress(inc) : { done: 0, total: 0, open: 0 };
  return (
    <button onClick={() => onOpen(inc.id)} className="w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: (m.accent || "#e11d48") + "1a", color: m.accent || "#e11d48" }}><Icon name={m.icon || "alert"} size={18} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-stone-900 truncate">{inc.subject}</div>
        <div className="text-[11px] text-stone-500 truncate mt-0.5">{inc.id} · {inc.location || "—"}</div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap"><EhsTypeBadge type={inc.type} size="sm" /><EhsSevPill sev={inc.sev} size="sm" /><EhsSlaBadge inc={inc} size="sm" />{prog.open > 0 && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium"><Icon name="check" size={10} />{prog.open} nyitott CAPA</span>}</div>
      </div>
      <div className="shrink-0"><EhsStatusPill status={inc.status} size="sm" /></div>
    </button>
  );
}

function EhsDetailHost({ openId, setOpen }) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const inc = openId ? (sim.ehsIncidents || []).find((x) => x.id === openId) : null;
  const onClose = () => setOpen(null);
  return (
    <SO open={!!inc} onClose={onClose} title={inc ? inc.subject : ""} subtitle={inc ? `${inc.id} · ${(window.EHS_INC_TYPE[inc.type] || {}).label || inc.type}` : ""} width={580}>
      {inc && window.IncDetail ? <window.IncDetail inc={inc} onClose={onClose} /> : null}
    </SO>
  );
}

// ── Áttekintés ───────────────────────────────────────────────────
function EhsDashboard({ onScreen }) {
  const sim = useSim();
  const E = window.EhsEngine;
  const [openId, setOpenId] = useStateE(null);
  const [newOpen, setNewOpen] = useStateE(false);
  const incs = sim.ehsIncidents || [];
  const risks = sim.ehsRisks || [];
  const trainings = sim.ehsTrainings || [];
  const today = window.EHS_TODAY;
  const open = incs.filter((i) => E && E.isOpen(i));
  const capaOverdue = []; incs.forEach((i) => (E ? E.openActions(i) : []).forEach((a) => { if (a.due && a.due < today) capaOverdue.push(a); }));
  const expired = E ? E.expiredTrainings(trainings) : [];
  const expiring = E ? E.expiringTrainings(trainings) : [];
  const kiemelt = risks.filter((r) => E && E.riskBand(r).key === "kiemelt");
  const rate = E ? E.recordableRate(incs) : { count: 0, lost: 0 };

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
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Munkavédelem</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Üzemi munkavédelem (Mvt. / ISO 45001) — {today}</p>
        </div>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Bejelentés</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="Nyitott incidens" value={open.length} sub="kivizsgálás alatt" tone="rose" icon="alert" />
        <KPI label="Lejárt intézkedés" value={capaOverdue.length} sub="CAPA határidőn túl" tone="amber" icon="clock" />
        <KPI label="Lejárt oktatás" value={expired.length} sub={`${expiring.length} hamarosan lejár`} tone="orange" icon="shield" />
        <KPI label="Kiemelt kockázat" value={kiemelt.length} sub={`${risks.length} értékelés`} tone="red" icon="bolt" />
      </div>

      {expired.length + expiring.length > 0 && (
        <button onClick={() => onScreen && onScreen("training")} className="w-full text-left mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3 hover:bg-amber-100/70">
          <Icon name="shield" size={18} className="text-amber-600 shrink-0" />
          <div className="min-w-0 flex-1"><div className="text-[12.5px] font-semibold text-amber-800">{expired.length} lejárt és {expiring.length} hamarosan lejáró oktatás</div><div className="text-[11px] text-amber-700/80 truncate">Kötelező munkavédelmi / gépkezelői oktatások — pótlás szükséges.</div></div>
          <Icon name="chevron" size={15} className="text-amber-500" />
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-stone-800">Nyitott incidensek</span>
            <button onClick={() => onScreen && onScreen("incidents")} className="text-[11.5px] text-red-700 font-medium inline-flex items-center gap-1">Mind <Icon name="chevron" size={13} /></button>
          </div>
          {open.length ? open.map((i) => <IncRow key={i.id} inc={i} onOpen={setOpenId} />)
            : <div className="px-4 py-10 text-center text-[12.5px] text-stone-400">Nincs nyitott incidens. 🎉</div>}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-stone-800">Legmagasabb kockázatok</span>
            <button onClick={() => onScreen && onScreen("risks")} className="text-[11.5px] text-red-700 font-medium inline-flex items-center gap-1">Mind <Icon name="chevron" size={13} /></button>
          </div>
          <div className="p-3 space-y-2">
            {risks.slice().sort((a, b) => E.score(b) - E.score(a)).slice(0, 4).map((r) => (
              <div key={r.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-stone-200">
                <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-stone-100 text-stone-500"><Icon name={r.icon || "alert"} size={16} /></div>
                <div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-stone-800 truncate">{r.title}</div><div className="text-[10.5px] text-stone-400 truncate">{r.scope}</div></div>
                <EhsRiskBadge risk={r} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3 flex items-center gap-3">
        <Icon name="info" size={16} className="text-stone-400 shrink-0" />
        <div className="text-[11.5px] text-stone-500">Rögzített munkabaleset: <span className="font-semibold text-stone-700">{rate.count}</span> · ebből munkaidő-kieséssel: <span className="font-semibold text-stone-700">{rate.lost}</span>. A nyitott intézkedések a <button onClick={() => window.navigateTo && window.navigateTo("tasks")} className="text-red-700 font-medium underline">Feladataim</button> között is megjelennek.</div>
      </div>

      <EhsDetailHost openId={openId} setOpen={setOpenId} />
      {newOpen && window.NewIncSheet && <window.NewIncSheet onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />}
    </div>
  );
}

// ── Balesetek (lista) ────────────────────────────────────────────
function EhsIncidents() {
  const sim = useSim();
  const [openId, setOpenId] = useStateE(null);
  const [newOpen, setNewOpen] = useStateE(false);
  const [typeF, setTypeF] = useStateE("all");
  const [statusF, setStatusF] = useStateE("open");
  const [q, setQ] = useStateE("");
  const E = window.EhsEngine;
  const list = (sim.ehsIncidents || []).filter((i) =>
    (typeF === "all" || i.type === typeF)
    && (statusF === "all" ? true : statusF === "open" ? (E && E.isOpen(i)) : i.status === statusF)
    && (!q.trim() || (i.subject + " " + i.id + " " + (i.location || "") + " " + (i.assetLabel || "")).toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Balesetek & kvázibalesetek</h1>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Bejelentés</button>
      </div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]"><Icon name="search" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés…" className="w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-red-500" /></div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-red-500">
          <option value="open">Csak nyitott</option><option value="all">Minden státusz</option>
          {Object.keys(window.EHS_INC_STATUS || {}).map((k) => <option key={k} value={k}>{window.EHS_INC_STATUS[k].label}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
        {[["all", "Mind"], ...window.EHS_INC_TYPE_ORDER.map((k) => [k, window.EHS_INC_TYPE[k].short])].map(([k, lbl]) => (
          <button key={k} onClick={() => setTypeF(k)} className={`shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${typeF === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`}>{lbl}</button>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {list.length ? list.map((i) => <IncRow key={i.id} inc={i} onOpen={setOpenId} />) : <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs találat.</div>}
      </div>
      <EhsDetailHost openId={openId} setOpen={setOpenId} />
      {newOpen && window.NewIncSheet && <window.NewIncSheet onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />}
    </div>
  );
}

// ── Kockázatok (mátrix-kártyák) ──────────────────────────────────
function RiskCard({ risk, onOpen }) {
  const E = window.EhsEngine;
  const band = E.riskBand(risk);
  const due = E.isReviewDue(risk);
  return (
    <button onClick={() => onOpen(risk.id)} className="text-left bg-white rounded-2xl border border-stone-200 p-4 hover:border-stone-300 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: band.cell + "1a", color: band.cell }}><Icon name={risk.icon || "alert"} size={18} /></div>
        <EhsRiskBadge risk={risk} />
      </div>
      <div className="text-[13px] font-semibold text-stone-900 leading-tight">{risk.title}</div>
      <div className="text-[11px] text-stone-500 mt-0.5">{risk.scope}</div>
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <span className="text-[10.5px] text-stone-400">Maradék kockázat:</span><EhsRiskBadge risk={risk} residual size="sm" />
      </div>
      {due && <div className="mt-2 inline-flex items-center gap-1 text-[10.5px] px-1.5 h-5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium"><Icon name="clock" size={10} />Felülvizsgálat lejárt</div>}
    </button>
  );
}

function EhsRisks() {
  const sim = useSim();
  const [openId, setOpenId] = useStateE(null);
  const [newOpen, setNewOpen] = useStateE(false);
  const [bandF, setBandF] = useStateE("all");
  const E = window.EhsEngine;
  const list = (sim.ehsRisks || []).filter((r) => bandF === "all" || E.riskBand(r).key === bandF)
    .sort((a, b) => E.score(b) - E.score(a));
  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Kockázatértékelés</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Valószínűség × súlyosság (5×5) — kötelező kockázatértékelés (Mvt.)</p>
        </div>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Új értékelés</button>
      </div>
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        {[["all", "Mind"], ...window.EHS_RISK_BAND_ORDER.map((k) => [k, window.EHS_RISK_BAND[k].label])].map(([k, lbl]) => (
          <button key={k} onClick={() => setBandF(k)} className={`shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${bandF === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`}>{lbl}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.length ? list.map((r) => <RiskCard key={r.id} risk={r} onOpen={setOpenId} />) : <div className="col-span-full px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs találat.</div>}
      </div>
      {window.RiskDetailHost && <window.RiskDetailHost openId={openId} setOpen={setOpenId} />}
      {newOpen && window.NewRiskSheet && <window.NewRiskSheet onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />}
    </div>
  );
}

// ── Oktatás & kompetencia (dolgozónkénti lejárat) ────────────────
function EhsTraining() {
  const sim = useSim();
  const [newOpen, setNewOpen] = useStateE(false);
  const [filter, setFilter] = useStateE("all");
  const E = window.EhsEngine;
  const trainings = sim.ehsTrainings || [];
  const emps = (sim.employees || []).filter((e) => e.active !== false);
  // dolgozónként csoportosítva
  const byEmp = {};
  trainings.forEach((t) => { (byEmp[t.empId] = byEmp[t.empId] || []).push(t); });
  const statusRank = { lejart: 0, soon: 1, ok: 2 };
  const rows = emps.map((e) => {
    const list = (byEmp[e.id] || []).map((t) => ({ t, st: E.trainStatus(t) }));
    const worst = list.reduce((w, x) => Math.min(w, statusRank[x.st.key]), 2);
    return { emp: e, list, worst };
  }).filter((r) => filter === "all" ? true : filter === "issues" ? r.worst < 2 : true)
    .sort((a, b) => a.worst - b.worst);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Oktatás & kompetencia</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Kötelező munkavédelmi oktatások lejárat-figyeléssel</p>
        </div>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Oktatás rögzítése</button>
      </div>
      <div className="flex items-center gap-1.5 mb-4">
        {[["all", "Minden dolgozó"], ["issues", "Csak figyelmeztetés"]].map(([k, lbl]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3 h-8 rounded-full text-[12px] font-medium border ${filter === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`}>{lbl}</button>
        ))}
      </div>
      <div className="space-y-2.5">
        {rows.map(({ emp, list }) => (
          <div key={emp.id} className="bg-white rounded-2xl border border-stone-200 p-3.5">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-full grid place-items-center text-white text-[11px] font-semibold shrink-0" style={{ background: emp.color || "#78716c" }}>{emp.initials}</div>
              <div className="min-w-0 flex-1"><div className="text-[13px] font-semibold text-stone-900">{emp.name}</div><div className="text-[11px] text-stone-500">{emp.role}</div></div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {list.length ? list.map(({ t, st }) => { const km = window.EHS_TRAIN_KIND[t.kind] || {}; return (
                <span key={t.id} className={`inline-flex items-center gap-1.5 rounded-lg border px-2 h-7 text-[11px] font-medium ${st.pill}`} title={`Lejár: ${st.expiresAt}`}>
                  <Icon name={km.icon || "shield"} size={12} />{km.short || t.kind}
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  <span className="text-[10px] opacity-80">{st.key === "lejart" ? "lejárt" : st.key === "soon" ? `${st.daysLeft} nap` : st.expiresAt}</span>
                  {st.key !== "ok" && <button onClick={() => window.sim.renewEhsTraining(t.id)} className="ml-0.5 hover:opacity-70" title="Megújítás"><Icon name="rotate" size={11} /></button>}
                </span>
              ); }) : <span className="text-[11.5px] text-stone-400">Nincs rögzített oktatás.</span>}
            </div>
          </div>
        ))}
        {!rows.length && <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs találat.</div>}
      </div>
      {newOpen && window.NewTrainingSheet && <window.NewTrainingSheet onClose={() => setNewOpen(false)} onCreated={() => setNewOpen(false)} />}
    </div>
  );
}

Object.assign(window, {
  EhsTypeBadge, EhsSevPill, EhsStatusPill, EhsRiskBadge, EhsSlaBadge, EhsStepper, IncRow, EhsDetailHost,
  EhsDashboard, EhsIncidents, RiskCard, EhsRisks, EhsTraining,
});
