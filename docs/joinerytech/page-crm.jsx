// ─────────────────────────────────────────────────────────────────
// page-crm.jsx — CRM / LEAD-PIPELINE világ (1/2)
//   Áttekintés (KPI + forrás-bontás + SLA-veszély + nyitott lehetőségek) +
//   Pipeline tábla (lead-fázisok → lehetőség-fázisok, egy vászon) + Lead-lista +
//   Lehetőség-lista + Forecast (súlyozott pipeline). Közös vizuális elemek + a
//   részlet-SlideOver host. A detail + sheetek + Feladatok a page-crm-2.jsx-ben.
//   Store: window.sim.leads / .opportunities / .crmTasks + akciók; CrmEngine.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateC, useMemo: useMemoC } = React;

// pénz-formázó (magyar tizedesvessző)
const crmMoney = (n) => {
  n = Number(n) || 0;
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",").replace(",0", "") + " M Ft";
  if (Math.abs(n) >= 1e3) return Math.round(n / 1e3) + " eFt";
  return n + " Ft";
};
const crmRel = (d) => { if (!d) return "—"; const [y, m, dd] = String(d).split("-"); return `${m}.${dd}`; };

// ── Közös elemek ─────────────────────────────────────────────────
function LeadStatusPill({ status, size = "md" }) {
  const t = (window.LEAD_STATUS || {})[status] || { label: status, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}
function OppStatusPill({ status, size = "md" }) {
  const t = (window.OPP_STATUS || {})[status] || { label: status, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}
function SourceBadge({ source, size = "md" }) {
  const m = (window.CRM_SOURCE_META || {})[source] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-md border font-medium ${cls} ${m.pill || "bg-stone-100 text-stone-600 border-stone-200"}`}><Icon name={m.icon || "user"} size={size === "sm" ? 11 : 12} />{m.label || source}</span>;
}
// feladat SLA jelvény
function TaskSlaBadge({ task, size = "md" }) {
  const sla = window.CrmEngine ? window.CrmEngine.taskSla(task) : { active: false };
  if (!sla.active) return null;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  if (sla.overdue) return <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-rose-50 text-rose-700 border-rose-200 ${cls}`}><Icon name="clock" size={11} />{Math.abs(sla.daysLeft)} napja lejárt</span>;
  if (sla.daysLeft <= 1) return <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-amber-50 text-amber-700 border-amber-200 ${cls}`}><Icon name="clock" size={11} />{sla.daysLeft === 0 ? "ma jár le" : "1 nap"}</span>;
  return <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-stone-50 text-stone-500 border-stone-200 ${cls}`}><Icon name="clock" size={11} />{sla.daysLeft} nap</span>;
}

// horizontális FSM lépés-jelző (lead VAGY opp)
function CrmStepper({ flow, statusMap, status, terminalKey, terminalLabel }) {
  const steps = (flow || {}).order || [];
  const isTerminal = status === terminalKey;
  const cur = steps.indexOf(status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
      {steps.map((st, i) => {
        const done = !isTerminal && i < cur, active = !isTerminal && i === cur;
        const lbl = (statusMap[st] || {}).label || st;
        return (
          <React.Fragment key={st}>
            {i > 0 && <div className={`h-px w-3 shrink-0 ${done ? "bg-blue-300" : "bg-stone-200"}`} />}
            <div className={`shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border ${active ? "bg-blue-600 text-white border-blue-600" : done ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-stone-400 border-stone-200"}`}>{done && <Icon name="check" size={10} />}{lbl}</div>
          </React.Fragment>
        );
      })}
      {isTerminal && <><div className="h-px w-3 shrink-0 bg-stone-300" /><div className="shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border bg-stone-200 text-stone-500 border-stone-300"><Icon name="x" size={10} />{terminalLabel}</div></>}
    </div>
  );
}

// lead-sor
function LeadRow({ l, onOpen }) {
  const m = (window.CRM_SOURCE_META || {})[l.source] || {};
  const who = l.company || l.contact;
  return (
    <button onClick={() => onOpen(l.id)} className="w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: (m.accent || "#2563eb") + "1a", color: m.accent || "#2563eb" }}><Icon name={m.icon || "user"} size={18} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-stone-900 truncate">{l.title}</span>
          {l.estValue > 0 && <span className="text-[11px] font-medium text-stone-500">· {crmMoney(l.estValue)}</span>}
        </div>
        <div className="text-[11px] text-stone-500 truncate mt-0.5">{l.id} · {who}{l.city ? ` · ${l.city}` : ""}</div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap"><SourceBadge source={l.source} size="sm" />{l.referredBy && <span className="text-[10px] text-stone-400">↳ {l.referredBy}</span>}</div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1"><LeadStatusPill status={l.status} size="sm" /><Icon name="chevron" size={15} className="text-stone-300" /></div>
    </button>
  );
}
// lehetőség-sor
function OppRow({ o, onOpen }) {
  const prob = window.CrmEngine ? window.CrmEngine.oppProb(o) : 0;
  return (
    <button onClick={() => onOpen(o.id)} className="w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-blue-50 text-blue-600"><Icon name="briefcase" size={17} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-stone-900 truncate">{o.title}</span>
          {o.delegatedTo && <span className="inline-flex items-center gap-0.5 text-[9.5px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-medium"><Icon name="external" size={9} />{o.delegatedTo}</span>}
        </div>
        <div className="text-[11px] text-stone-500 truncate mt-0.5">{o.id} · {o.customer}{o.isNewCustomer ? " · új" : ""}</div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap"><SourceBadge source={o.source} size="sm" />{o.quoteId && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium"><Icon name="file" size={10} />{o.quoteId}</span>}</div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className="text-[13px] font-semibold text-stone-900">{crmMoney(o.value)}</span>
        <OppStatusPill status={o.status} size="sm" />
        {window.CrmEngine && window.CrmEngine.oppIsOpen(o) && <span className="text-[9.5px] text-stone-400">{Math.round(prob * 100)}% · {crmMoney(window.CrmEngine.oppWeighted(o))}</span>}
      </div>
    </button>
  );
}

// ── Detail host (lead VAGY opp — prefixből) ──────────────────────
function CrmDetailHost({ openId, setOpen }) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const lead = openId && openId.startsWith("LEAD") ? (sim.leads || []).find((x) => x.id === openId) : null;
  const opp = openId && openId.startsWith("OPP") ? (sim.opportunities || []).find((x) => x.id === openId) : null;
  const ent = lead || opp;
  const onClose = () => setOpen(null);
  return (
    <SO open={!!ent} onClose={onClose} title={ent ? ent.title : ""} subtitle={ent ? `${ent.id} · ${lead ? (lead.company || lead.contact) : opp.customer}` : ""} width={580}>
      {lead && window.LeadDetail ? <window.LeadDetail l={lead} onClose={onClose} onOpen={setOpen} /> : null}
      {opp && window.OppDetail ? <window.OppDetail o={opp} onClose={onClose} onOpen={setOpen} /> : null}
    </SO>
  );
}

// ── Áttekintés ───────────────────────────────────────────────────
function CrmDashboard({ onScreen }) {
  const sim = useSim();
  const leads = sim.leads || [];
  const opps = sim.opportunities || [];
  const tasks = sim.crmTasks || [];
  const [openId, setOpenId] = useStateC(null);
  const [newOpen, setNewOpen] = useStateC(null); // "lead" | "opp"
  const E = window.CrmEngine;

  const openLeads = leads.filter((l) => E && E.leadIsOpen(l));
  const fc = E ? E.forecast(opps) : { pipeline: 0, weighted: 0, openCount: 0 };
  const conv = E ? E.leadConversion(leads) : { rate: 0 };
  const overdueTasks = tasks.filter((t) => { const s = E.taskSla(t); return s.active && s.overdue; });
  const openOpps = opps.filter((o) => E && E.oppIsOpen(o)).sort((a, b) => E.oppWeighted(b) - E.oppWeighted(a));

  // forrás-bontás (nyitott lead + nyitott opp)
  const bySource = {};
  [...openLeads, ...opps.filter((o) => E && E.oppIsOpen(o))].forEach((x) => { bySource[x.source] = (bySource[x.source] || 0) + 1; });
  const srcRows = (window.CRM_SOURCE_ORDER || []).map((k) => [k, bySource[k] || 0]).filter(([, n]) => n > 0);
  const srcMax = Math.max(1, ...srcRows.map(([, n]) => n));

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
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">CRM / Pipeline</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Lead-pipeline és üzleti lehetőségek — {window.CRM_TODAY}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setNewOpen("lead")} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white border border-stone-200 text-stone-700 text-[12.5px] font-medium hover:bg-stone-50"><Icon name="plus" size={15} />Lead</button>
          <button onClick={() => setNewOpen("opp")} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-medium"><Icon name="plus" size={15} />Lehetőség</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="Nyitott lehetőség" value={fc.openCount} sub={`${crmMoney(fc.pipeline)} pipeline`} tone="blue" icon="briefcase" />
        <KPI label="Súlyozott forecast" value={crmMoney(fc.weighted)} sub="valószínűség szerint" tone="emerald" icon="analytics" />
        <KPI label="Nyitott leadek" value={openLeads.length} sub="minősítés alatt" tone="sky" icon="route" />
        <KPI label="Lead-konverzió" value={`${Math.round(conv.rate * 100)}%`} sub={`${conv.conv}/${conv.closed} lezárt`} tone="indigo" icon="check" />
      </div>

      {overdueTasks.length > 0 && (
        <button onClick={() => onScreen && onScreen("tasks")} className="w-full mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-center gap-3 text-left hover:bg-rose-100/60">
          <Icon name="clock" size={18} className="text-rose-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold text-rose-800">{overdueTasks.length} feladat határideje lejárt</div>
            <div className="text-[11px] text-rose-700/80 truncate">{overdueTasks.map((t) => t.title).join(" · ")}</div>
          </div>
          <Icon name="chevron" size={15} className="text-rose-400" />
        </button>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-stone-800">Nyitott lehetőségek (súly szerint)</span>
            <button onClick={() => onScreen && onScreen("opps")} className="text-[11.5px] text-blue-600 font-medium inline-flex items-center gap-1">Mind <Icon name="chevron" size={13} /></button>
          </div>
          {openOpps.length ? openOpps.slice(0, 6).map((o) => <OppRow key={o.id} o={o} onOpen={setOpenId} />)
            : <div className="px-4 py-10 text-center text-[12.5px] text-stone-400">Nincs nyitott lehetőség.</div>}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="text-[12.5px] font-semibold text-stone-800 mb-3">Forrás-bontás</div>
          <div className="space-y-2.5">
            {srcRows.length ? srcRows.map(([k, n]) => {
              const m = window.CRM_SOURCE_META[k] || {};
              return (
                <div key={k} className="flex items-center gap-2">
                  <Icon name={m.icon || "user"} size={14} className="text-stone-400 shrink-0" />
                  <span className="text-[11.5px] text-stone-600 w-[92px] shrink-0 truncate">{m.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(n / srcMax) * 100}%`, background: m.accent || "#2563eb" }} /></div>
                  <span className="text-[11px] text-stone-500 w-4 text-right">{n}</span>
                </div>
              );
            }) : <div className="text-[12px] text-stone-400">Nincs nyitott tétel.</div>}
          </div>
        </div>
      </div>

      <CrmDetailHost openId={openId} setOpen={setOpenId} />
      {newOpen && window.NewCrmSheet && <window.NewCrmSheet kind={newOpen} onClose={() => setNewOpen(null)} onCreated={(id) => { setNewOpen(null); setOpenId(id); }} />}
    </div>
  );
}

// ── Pipeline tábla (lead-fázisok → lehetőség-fázisok, egy vászon) ─
function CrmPipeline() {
  const sim = useSim();
  const [openId, setOpenId] = useStateC(null);
  const leads = sim.leads || [];
  const opps = sim.opportunities || [];
  const leadCols = (window.LEAD_FLOW || {}).order.filter((k) => k !== "konvertalva");
  const oppCols = (window.OPP_FLOW || {}).order;

  const LeadCard = ({ l }) => {
    const m = window.CRM_SOURCE_META[l.source] || {};
    return (
      <button onClick={() => setOpenId(l.id)} className="w-full text-left bg-white rounded-xl border border-stone-200 p-2.5 hover:border-stone-300 hover:shadow-sm">
        <div className="flex items-center gap-1.5 mb-1"><SourceBadge source={l.source} size="sm" /></div>
        <div className="text-[12px] font-semibold text-stone-900 leading-tight">{l.title}</div>
        <div className="text-[10.5px] text-stone-500 mt-0.5 truncate">{l.company || l.contact}</div>
        {l.estValue > 0 && <div className="text-[10.5px] text-stone-400 mt-0.5">~{crmMoney(l.estValue)}</div>}
      </button>
    );
  };
  const OppCard = ({ o }) => (
    <button onClick={() => setOpenId(o.id)} className="w-full text-left bg-white rounded-xl border border-stone-200 p-2.5 hover:border-stone-300 hover:shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12.5px] font-semibold text-stone-900">{crmMoney(o.value)}</span>
        {o.quoteId && <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">{o.quoteId}</span>}
      </div>
      <div className="text-[12px] font-medium text-stone-700 leading-tight">{o.title}</div>
      <div className="text-[10.5px] text-stone-500 mt-0.5 truncate">{o.customer}{o.isNewCustomer ? " · új" : ""}</div>
    </button>
  );
  const Col = ({ label, dot, count, children }) => (
    <div className="w-[230px] shrink-0">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-stone-700"><span className={`w-2 h-2 rounded-full ${dot}`} />{label}</span>
        <span className="text-[10.5px] text-stone-400">{count}</span>
      </div>
      <div className="space-y-2 min-h-[60px]">{children}</div>
    </div>
  );

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1600px] mx-auto">
      <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900 mb-1">Pipeline</h1>
      <p className="text-[12.5px] text-stone-500 mb-4">A megkereséstől az ajánlatig — koppints egy kártyára a részletekért.</p>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max items-start">
          <div className="flex flex-col">
            <div className="text-[10px] uppercase tracking-wide text-sky-600 font-semibold mb-2 px-1">Lead</div>
            <div className="flex gap-3">
              {leadCols.map((st) => {
                const meta = window.LEAD_STATUS[st] || {};
                const items = leads.filter((l) => l.status === st);
                return <Col key={st} label={meta.label} dot={meta.dot} count={items.length}>
                  {items.map((l) => <LeadCard key={l.id} l={l} />)}
                  {!items.length && <div className="rounded-xl border border-dashed border-stone-200 py-4 text-center text-[11px] text-stone-300">—</div>}
                </Col>;
              })}
            </div>
          </div>

          <div className="self-stretch flex items-center px-1 pt-7"><div className="w-px h-full bg-stone-200" /><Icon name="arrow-right" size={16} className="text-stone-300 -ml-2 bg-stone-50" /></div>

          <div className="flex flex-col">
            <div className="text-[10px] uppercase tracking-wide text-blue-600 font-semibold mb-2 px-1">Lehetőség</div>
            <div className="flex gap-3">
              {oppCols.map((st) => {
                const meta = window.OPP_STATUS[st] || {};
                const items = opps.filter((o) => o.status === st);
                const sum = items.reduce((s, o) => s + (o.value || 0), 0);
                return <Col key={st} label={meta.label} dot={meta.dot} count={items.length ? `${items.length} · ${crmMoney(sum)}` : 0}>
                  {items.map((o) => <OppCard key={o.id} o={o} />)}
                  {!items.length && <div className="rounded-xl border border-dashed border-stone-200 py-4 text-center text-[11px] text-stone-300">—</div>}
                </Col>;
              })}
            </div>
          </div>
        </div>
      </div>

      <CrmDetailHost openId={openId} setOpen={setOpenId} />
    </div>
  );
}

// ── Lead-lista ───────────────────────────────────────────────────
function CrmLeads() {
  const sim = useSim();
  const [openId, setOpenId] = useStateC(null);
  const [newOpen, setNewOpen] = useStateC(false);
  const [statusF, setStatusF] = useStateC("open");
  const [srcF, setSrcF] = useStateC("all");
  const [q, setQ] = useStateC("");
  const E = window.CrmEngine;

  const list = (sim.leads || []).filter((l) =>
    (statusF === "all" ? true : statusF === "open" ? (E && E.leadIsOpen(l)) : l.status === statusF)
    && (srcF === "all" || l.source === srcF)
    && (!q.trim() || (l.title + " " + l.id + " " + (l.company || "") + " " + l.contact + " " + (l.city || "")).toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Leadek</h1>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Új lead</button>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Icon name="search" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés…" className="w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-blue-500" />
        </div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-blue-500">
          <option value="open">Csak nyitott</option>
          <option value="all">Minden státusz</option>
          {Object.keys(window.LEAD_STATUS || {}).map((k) => <option key={k} value={k}>{window.LEAD_STATUS[k].label}</option>)}
        </select>
        <select value={srcF} onChange={(e) => setSrcF(e.target.value)} className="h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-blue-500">
          <option value="all">Minden forrás</option>
          {(window.CRM_SOURCE_ORDER || []).map((k) => <option key={k} value={k}>{window.CRM_SOURCE_META[k].label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {list.length ? list.map((l) => <LeadRow key={l.id} l={l} onOpen={setOpenId} />)
          : <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs találat.</div>}
      </div>

      <CrmDetailHost openId={openId} setOpen={setOpenId} />
      {newOpen && window.NewCrmSheet && <window.NewCrmSheet kind="lead" onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />}
    </div>
  );
}

// ── Lehetőség-lista ──────────────────────────────────────────────
function CrmOpps() {
  const sim = useSim();
  const [openId, setOpenId] = useStateC(null);
  const [newOpen, setNewOpen] = useStateC(false);
  const [statusF, setStatusF] = useStateC("open");
  const [q, setQ] = useStateC("");
  const E = window.CrmEngine;

  const list = (sim.opportunities || []).filter((o) =>
    (statusF === "all" ? true : statusF === "open" ? (E && E.oppIsOpen(o)) : o.status === statusF)
    && (!q.trim() || (o.title + " " + o.id + " " + o.customer).toLowerCase().includes(q.toLowerCase())));
  const sum = list.reduce((s, o) => s + (o.value || 0), 0);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Lehetőségek</h1>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Új lehetőség</button>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Icon name="search" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés…" className="w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-blue-500" />
        </div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-blue-500">
          <option value="open">Csak nyitott</option>
          <option value="all">Minden státusz</option>
          {Object.keys(window.OPP_STATUS || {}).map((k) => <option key={k} value={k}>{window.OPP_STATUS[k].label}</option>)}
        </select>
        <span className="text-[11.5px] text-stone-500 px-2 shrink-0">Σ {crmMoney(sum)}</span>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {list.length ? list.map((o) => <OppRow key={o.id} o={o} onOpen={setOpenId} />)
          : <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs találat.</div>}
      </div>

      <CrmDetailHost openId={openId} setOpen={setOpenId} />
      {newOpen && window.NewCrmSheet && <window.NewCrmSheet kind="opp" onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />}
    </div>
  );
}

// ── Forecast (súlyozott pipeline + fázis-bontás) ─────────────────
function CrmForecast() {
  const sim = useSim();
  const [openId, setOpenId] = useStateC(null);
  const opps = sim.opportunities || [];
  const E = window.CrmEngine;
  const fc = E ? E.forecast(opps) : { pipeline: 0, weighted: 0, won: 0, lost: 0, byStage: {} };
  const win = E ? E.oppWinRate(opps) : { rate: 0, won: 0, closed: 0 };
  const openStages = (window.OPP_FLOW || {}).order.filter((k) => k !== "megnyert");
  const maxVal = Math.max(1, ...openStages.map((st) => (fc.byStage[st] || {}).value || 0));

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1000px] mx-auto">
      <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900 mb-1">Forecast</h1>
      <p className="text-[12.5px] text-stone-500 mb-4">Várható bevétel — a nyitott lehetőségek értéke a fázis valószínűségével súlyozva.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-stone-200 p-4"><div className="text-[11px] text-stone-500">Nyitott pipeline</div><div className="text-[20px] font-semibold text-stone-900 mt-1">{crmMoney(fc.pipeline)}</div></div>
        <div className="bg-blue-600 rounded-2xl p-4 text-white"><div className="text-[11px] text-white/70">Súlyozott forecast</div><div className="text-[20px] font-semibold mt-1">{crmMoney(fc.weighted)}</div></div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4"><div className="text-[11px] text-stone-500">Megnyert (összes)</div><div className="text-[20px] font-semibold text-emerald-700 mt-1">{crmMoney(fc.won)}</div></div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4"><div className="text-[11px] text-stone-500">Nyerési arány</div><div className="text-[20px] font-semibold text-stone-900 mt-1">{Math.round(win.rate * 100)}%</div><div className="text-[10px] text-stone-400">{win.won}/{win.closed} lezárt</div></div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-4 md:p-5">
        <div className="text-[12.5px] font-semibold text-stone-800 mb-4">Súlyozott érték fázisonként</div>
        <div className="space-y-3">
          {openStages.map((st) => {
            const meta = window.OPP_STATUS[st] || {};
            const cell = fc.byStage[st] || { count: 0, value: 0 };
            const weighted = Math.round(cell.value * (meta.prob || 0));
            return (
              <div key={st}>
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-stone-700"><span className={`w-2 h-2 rounded-full ${meta.dot}`} />{meta.label}<span className="text-[10.5px] text-stone-400 font-normal">{Math.round((meta.prob || 0) * 100)}% · {cell.count} db</span></span>
                  <span className="text-[12px] font-semibold text-stone-900">{crmMoney(weighted)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden relative">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-stone-200" style={{ width: `${(cell.value / maxVal) * 100}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-blue-500" style={{ width: `${(weighted / maxVal) * 100}%` }} />
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">teljes: {crmMoney(cell.value)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <CrmDetailHost openId={openId} setOpen={setOpenId} />
    </div>
  );
}

Object.assign(window, {
  crmMoney, crmRel, LeadStatusPill, OppStatusPill, SourceBadge, TaskSlaBadge, CrmStepper,
  LeadRow, OppRow, CrmDetailHost,
  CrmDashboard, CrmPipeline, CrmLeads, CrmOpps, CrmForecast,
});
