// ─────────────────────────────────────────────────────────────────
// page-service.jsx — REKLAMÁCIÓ világ (1/2)
//   Diszpécser: Áttekintés (KPI + SLA-veszély + lista) + Bejelentések (szűrhető
//   lista) + Tábla (státusz-oszlopok, kanban-szerű). Közös vizuális elemek +
//   a részlet-SlideOver host. A detail + felvétel a page-service-2.jsx-ben.
//   Store: window.sim.serviceTickets + akciók; ServiceEngine (FSM/SLA/garancia).
// ─────────────────────────────────────────────────────────────────
const { useState: useStateS, useMemo: useMemoS } = React;

const svcRel = (d) => { if (!d) return ""; const [y, m, dd] = String(d).split("-"); return `${m}.${dd}`; };

// ── Közös elemek ─────────────────────────────────────────────────
function SvcStatusPill({ status, size = "md" }) {
  const t = (window.SVC_STATUS || {})[status] || { label: status, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}

function SvcTypeBadge({ type, size = "md" }) {
  const m = (window.SVC_TYPE_META || {})[type] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-md border font-medium ${cls} ${m.pill}`}><Icon name={m.icon || "shield"} size={size === "sm" ? 11 : 12} />{m.short || type}</span>;
}

function SvcPriorityPill({ priority, size = "md" }) {
  const p = (window.SVC_PRIORITY || {})[priority] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${p.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />{p.label}</span>;
}

// SLA-jelvény: hátralévő napok / lejárt
function SlaBadge({ ticket, size = "md" }) {
  const sla = window.ServiceEngine ? window.ServiceEngine.sla(ticket) : { active: false };
  if (!sla.active) return null;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  if (sla.overdue) return <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-rose-50 text-rose-700 border-rose-200 ${cls}`}><Icon name="clock" size={11} />{Math.abs(sla.daysLeft)} napja lejárt</span>;
  if (sla.daysLeft <= 1) return <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-amber-50 text-amber-700 border-amber-200 ${cls}`}><Icon name="clock" size={11} />{sla.daysLeft === 0 ? "ma jár le" : "1 nap"}</span>;
  return <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-stone-50 text-stone-500 border-stone-200 ${cls}`}><Icon name="clock" size={11} />{sla.daysLeft} nap</span>;
}

// garancia-jelvény
function WarrantyBadge({ ticket, size = "md" }) {
  const w = window.ServiceEngine ? window.ServiceEngine.warranty(ticket) : { known: false };
  if (!w.known) return null;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return w.within
    ? <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-emerald-50 text-emerald-700 border-emerald-200 ${cls}`}><Icon name="shield" size={11} />garancián belül</span>
    : <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-stone-100 text-stone-500 border-stone-200 ${cls}`}><Icon name="shield" size={11} />garancián kívül</span>;
}

// horizontális FSM lépés-jelző
function SvcStepper({ ticket }) {
  const steps = (window.SVC_FLOW || {}).order || [];
  const rejected = ticket.status === "elutasitva";
  const cur = steps.indexOf(ticket.status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
      {steps.map((st, i) => {
        const done = !rejected && i < cur, active = !rejected && i === cur;
        const lbl = (window.SVC_STATUS[st] || {}).label || st;
        return (
          <React.Fragment key={st}>
            {i > 0 && <div className={`h-px w-3 shrink-0 ${done ? "bg-rose-300" : "bg-stone-200"}`} />}
            <div className={`shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border ${active ? "bg-rose-600 text-white border-rose-600" : done ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-white text-stone-400 border-stone-200"}`}>{done && <Icon name="check" size={10} />}{lbl}</div>
          </React.Fragment>
        );
      })}
      {rejected && <><div className="h-px w-3 shrink-0 bg-stone-300" /><div className="shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border bg-stone-200 text-stone-500 border-stone-300"><Icon name="x" size={10} />Elutasítva</div></>}
    </div>
  );
}

const CHANNEL_LABEL = { webshop: "Webshop", internal: "Belső felvétel", logistics: "Logisztika", handover: "Átadási hiánylista" };

// jegy-sor (lista)
function TicketRow({ t, onOpen }) {
  const m = (window.SVC_TYPE_META || {})[t.type] || {};
  return (
    <button onClick={() => onOpen(t.id)} className="w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: (m.accent || "#dc2626") + "1a", color: m.accent || "#dc2626" }}><Icon name={m.icon || "shield"} size={18} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-stone-900 truncate">{t.title}</span>
          {t.delegatedTo && <span className="inline-flex items-center gap-0.5 text-[9.5px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-medium"><Icon name="external" size={9} />{t.delegatedTo}</span>}
        </div>
        <div className="text-[11px] text-stone-500 truncate mt-0.5">{t.id} · {t.customer}{t.refLabel ? ` · ${t.refLabel}` : ""}</div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap"><SvcTypeBadge type={t.type} size="sm" /><SvcPriorityPill priority={t.priority} size="sm" /><SlaBadge ticket={t} size="sm" /></div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1"><SvcStatusPill status={t.status} size="sm" /><Icon name="chevron" size={15} className="text-stone-300" /></div>
    </button>
  );
}

// ── Detail host ──────────────────────────────────────────────────
function SvcDetailHost({ openId, onClose }) {
  const sim = useSim();
  const t = openId ? (sim.serviceTickets || []).find((x) => x.id === openId) : null;
  const SO = window.SlideOver;
  if (!SO) return null;
  return (
    <SO open={!!t} onClose={onClose} title={t ? t.title : ""} subtitle={t ? `${t.id} · ${t.customer}` : ""} width={580}>
      {t && window.TicketDetail ? <window.TicketDetail t={t} onClose={onClose} /> : null}
    </SO>
  );
}

// ── Áttekintés ───────────────────────────────────────────────────
function ServiceDashboard({ onScreen }) {
  const sim = useSim();
  const tickets = sim.serviceTickets || [];
  const [openId, setOpenId] = useStateS(null);
  const [newOpen, setNewOpen] = useStateS(false);
  const E = window.ServiceEngine;

  const open = tickets.filter((t) => E && E.isOpen(t));
  const overdue = open.filter((t) => { const s = E.sla(t); return s.active && s.overdue; });
  const urgent = open.filter((t) => t.priority === "surgos" || t.priority === "magas");
  const warranty = tickets.filter((t) => t.type === "garancia");

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
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Reklamáció</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Szerviz, garancia és hiánypótlás — {window.SVC_TODAY}</p>
        </div>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Új bejelentés</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="Nyitott jegyek" value={open.length} sub="folyamatban" tone="rose" icon="shield" />
        <KPI label="SLA lejárt" value={overdue.length} sub="határidőn túl" tone="amber" icon="clock" />
        <KPI label="Sürgős / magas" value={urgent.length} sub="prioritásos" tone="rose" icon="alert" />
        <KPI label="Garanciális" value={warranty.length} sub="összes garancia-jegy" tone="emerald" icon="shield" />
      </div>

      {overdue.length > 0 && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-center gap-3">
          <Icon name="clock" size={18} className="text-rose-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold text-rose-800">{overdue.length} jegy SLA-határideje lejárt</div>
            <div className="text-[11px] text-rose-700/80 truncate">{overdue.map((t) => t.id).join(", ")}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-stone-800">Nyitott bejelentések</span>
          <button onClick={() => onScreen && onScreen("tickets")} className="text-[11.5px] text-rose-600 font-medium inline-flex items-center gap-1">Mind <Icon name="chevron" size={13} /></button>
        </div>
        {open.length ? open.sort((a, b) => (window.SVC_PRIORITY[b.priority].rank - window.SVC_PRIORITY[a.priority].rank)).map((t) => <TicketRow key={t.id} t={t} onOpen={setOpenId} />)
          : <div className="px-4 py-10 text-center text-[12.5px] text-stone-400">Nincs nyitott bejelentés. 🎉</div>}
      </div>

      <SvcDetailHost openId={openId} onClose={() => setOpenId(null)} />
      {newOpen && window.NewTicketSheet && <window.NewTicketSheet onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />}
    </div>
  );
}

// ── Bejelentések (lista) ─────────────────────────────────────────
function ServiceTickets() {
  const sim = useSim();
  const [openId, setOpenId] = useStateS(null);
  const [newOpen, setNewOpen] = useStateS(false);
  const [typeF, setTypeF] = useStateS("all");
  const [statusF, setStatusF] = useStateS("open");
  const [q, setQ] = useStateS("");

  const list = (sim.serviceTickets || []).filter((t) =>
    (typeF === "all" || t.type === typeF)
    && (statusF === "all" ? true : statusF === "open" ? (window.ServiceEngine && window.ServiceEngine.isOpen(t)) : t.status === statusF)
    && (!q.trim() || (t.title + " " + t.id + " " + t.customer + " " + (t.refLabel || "")).toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Bejelentések</h1>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Új bejelentés</button>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Icon name="search" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés…" className="w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-500" />
        </div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-rose-500">
          <option value="open">Csak nyitott</option>
          <option value="all">Minden státusz</option>
          {Object.keys(window.SVC_STATUS || {}).map((k) => <option key={k} value={k}>{window.SVC_STATUS[k].label}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
        {[["all", "Mind"], ...window.SVC_TYPE_ORDER.map((k) => [k, window.SVC_TYPE_META[k].short])].map(([k, lbl]) => (
          <button key={k} onClick={() => setTypeF(k)} className={`shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${typeF === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`}>{lbl}</button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {list.length ? list.map((t) => <TicketRow key={t.id} t={t} onOpen={setOpenId} />)
          : <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs találat.</div>}
      </div>

      <SvcDetailHost openId={openId} onClose={() => setOpenId(null)} />
      {newOpen && window.NewTicketSheet && <window.NewTicketSheet onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />}
    </div>
  );
}

// ── Tábla (státusz-oszlopok) ─────────────────────────────────────
function ServiceBoard() {
  const sim = useSim();
  const [openId, setOpenId] = useStateS(null);
  const tickets = sim.serviceTickets || [];
  const cols = (window.SVC_FLOW || {}).order || [];

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1500px] mx-auto">
      <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900 mb-1">Tábla</h1>
      <p className="text-[12.5px] text-stone-500 mb-4">A bejelentések állapot szerint — koppints egy kártyára a részletekért.</p>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {cols.map((st) => {
            const meta = window.SVC_STATUS[st] || {};
            const items = tickets.filter((t) => t.status === st);
            return (
              <div key={st} className="w-[260px] shrink-0">
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-stone-700"><span className={`w-2 h-2 rounded-full ${meta.dot}`} />{meta.label}</span>
                  <span className="text-[10.5px] text-stone-400">{items.length}</span>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  {items.map((t) => {
                    const m = window.SVC_TYPE_META[t.type] || {};
                    return (
                      <button key={t.id} onClick={() => setOpenId(t.id)} className="w-full text-left bg-white rounded-xl border border-stone-200 p-3 hover:border-stone-300 hover:shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1.5"><SvcTypeBadge type={t.type} size="sm" /><SvcPriorityPill priority={t.priority} size="sm" /></div>
                        <div className="text-[12.5px] font-semibold text-stone-900 leading-tight">{t.title}</div>
                        <div className="text-[10.5px] text-stone-500 mt-0.5 truncate">{t.id} · {t.customer}</div>
                        <div className="mt-1.5 flex items-center justify-between"><SlaBadge ticket={t} size="sm" /></div>
                      </button>
                    );
                  })}
                  {!items.length && <div className="rounded-xl border border-dashed border-stone-200 py-4 text-center text-[11px] text-stone-300">—</div>}
                </div>
              </div>
            );
          })}
          {/* elutasítva oszlop */}
          {(() => {
            const items = tickets.filter((t) => t.status === "elutasitva");
            if (!items.length) return null;
            const meta = window.SVC_STATUS.elutasitva;
            return (
              <div className="w-[260px] shrink-0">
                <div className="flex items-center justify-between px-1 mb-2"><span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-stone-500"><span className={`w-2 h-2 rounded-full ${meta.dot}`} />{meta.label}</span><span className="text-[10.5px] text-stone-400">{items.length}</span></div>
                <div className="space-y-2">
                  {items.map((t) => (
                    <button key={t.id} onClick={() => setOpenId(t.id)} className="w-full text-left bg-stone-50 rounded-xl border border-stone-200 p-3 hover:border-stone-300">
                      <div className="flex items-center gap-1.5 mb-1.5"><SvcTypeBadge type={t.type} size="sm" /></div>
                      <div className="text-[12.5px] font-semibold text-stone-700 leading-tight">{t.title}</div>
                      <div className="text-[10.5px] text-stone-400 mt-0.5 truncate">{t.id} · {t.customer}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <SvcDetailHost openId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

Object.assign(window, {
  SvcStatusPill, SvcTypeBadge, SvcPriorityPill, SlaBadge, WarrantyBadge, SvcStepper,
  TicketRow, SvcDetailHost, ServiceDashboard, ServiceTickets, ServiceBoard, CHANNEL_LABEL,
});
