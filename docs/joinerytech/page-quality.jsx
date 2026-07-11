// ─────────────────────────────────────────────────────────────────
// page-quality.jsx — MINŐSÉGBIZTOSÍTÁS világ (QA/QC)
//   Áttekintés (KPI + SLA-veszély + nyitott ellenőrzések) + Ellenőrzések
//   (szűrhető lista) + Tábla (státusz-oszlopok) + részlet-SlideOver (checklist +
//   FSM + hibajegyzőkönyv/NCR) + új ellenőrzés sheet.
//   Store: window.sim.qaInspections + akciók; QaEngine (FSM/SLA/megfelelés).
// ─────────────────────────────────────────────────────────────────
const { useState: useStateQ } = React;

// ── Közös elemek ─────────────────────────────────────────────────
function QaStatusPill({ status, size = "md" }) {
  const t = (window.QA_STATUS || {})[status] || { label: status, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}
function QaTypeBadge({ type, size = "md" }) {
  const m = (window.QA_TYPE_META || {})[type] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-md border font-medium ${cls} ${m.pill}`}><Icon name={m.icon || "shield"} size={size === "sm" ? 11 : 12} />{m.short || type}</span>;
}
function QaPriorityPill({ priority, size = "md" }) {
  const p = (window.QA_PRIORITY || {})[priority] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${p.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />{p.label}</span>;
}
function QaSlaBadge({ insp, size = "md" }) {
  const sla = window.QaEngine ? window.QaEngine.sla(insp) : { active: false };
  if (!sla.active) return null;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  if (sla.overdue) return <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-rose-50 text-rose-700 border-rose-200 ${cls}`}><Icon name="clock" size={11} />{Math.abs(sla.daysLeft)} napja lejárt</span>;
  if (sla.daysLeft <= 1) return <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-amber-50 text-amber-700 border-amber-200 ${cls}`}><Icon name="clock" size={11} />{sla.daysLeft === 0 ? "ma jár le" : "1 nap"}</span>;
  return <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-stone-50 text-stone-500 border-stone-200 ${cls}`}><Icon name="clock" size={11} />{sla.daysLeft} nap</span>;
}
function QaStepper({ insp }) {
  const steps = (window.QA_FLOW || {}).order || [];
  const rework = insp.status === "javitasra", scrap = insp.status === "selejt";
  const cur = steps.indexOf(insp.status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
      {steps.map((st, i) => {
        const done = cur >= 0 && i < cur, active = i === cur;
        const lbl = (window.QA_STATUS[st] || {}).label || st;
        return (
          <React.Fragment key={st}>
            {i > 0 && <div className={`h-px w-3 shrink-0 ${done ? "bg-lime-300" : "bg-stone-200"}`} />}
            <div className={`shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border ${active ? "bg-lime-600 text-white border-lime-600" : done ? "bg-lime-50 text-lime-700 border-lime-200" : "bg-white text-stone-400 border-stone-200"}`}>{done && <Icon name="check" size={10} />}{lbl}</div>
          </React.Fragment>
        );
      })}
      {(rework || scrap) && <><div className="h-px w-3 shrink-0 bg-stone-300" /><div className={`shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border ${scrap ? "bg-rose-100 text-rose-600 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}><Icon name={scrap ? "x" : "rotate"} size={10} />{(window.QA_STATUS[insp.status] || {}).label}</div></>}
    </div>
  );
}

function InspRow({ insp, onOpen }) {
  const m = (window.QA_TYPE_META || {})[insp.type] || {};
  const pr = window.QaEngine ? window.QaEngine.progress(insp) : { done: 0, total: 0 };
  return (
    <button onClick={() => onOpen(insp.id)} className="w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: (m.accent || "#65a30d") + "1a", color: m.accent || "#65a30d" }}><Icon name={m.icon || "shield"} size={18} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-stone-900 truncate">{insp.subject}</div>
        <div className="text-[11px] text-stone-500 truncate mt-0.5">{insp.id} · {insp.refLabel || insp.ref || "—"}</div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap"><QaTypeBadge type={insp.type} size="sm" /><QaPriorityPill priority={insp.priority} size="sm" /><QaSlaBadge insp={insp} size="sm" />{(insp.defects || []).length > 0 && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium"><Icon name="alert" size={10} />{insp.defects.length} hiba</span>}</div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1"><QaStatusPill status={insp.status} size="sm" />{pr.total > 0 && <span className="text-[9.5px] text-stone-400">{pr.done}/{pr.total} pont</span>}</div>
    </button>
  );
}

function QaDetailHost({ openId, setOpen }) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const insp = openId ? (sim.qaInspections || []).find((x) => x.id === openId) : null;
  const onClose = () => setOpen(null);
  return (
    <SO open={!!insp} onClose={onClose} title={insp ? insp.subject : ""} subtitle={insp ? `${insp.id} · ${insp.refLabel || insp.ref}` : ""} width={580}>
      {insp && window.InspDetail ? <window.InspDetail insp={insp} onClose={onClose} /> : null}
    </SO>
  );
}

// ── Áttekintés ───────────────────────────────────────────────────
function QualityDashboard({ onScreen }) {
  const sim = useSim();
  const list = sim.qaInspections || [];
  const [openId, setOpenId] = useStateQ(null);
  const [newOpen, setNewOpen] = useStateQ(false);
  const E = window.QaEngine;
  const open = list.filter((i) => E && E.isOpen(i));
  const overdue = open.filter((i) => { const s = E.sla(i); return s.active && s.overdue; });
  const pass = E ? E.passRate(list) : { rate: 0, pass: 0, closed: 0 };
  const defects = list.reduce((n, i) => n + (i.defects || []).length, 0);

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
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Minőség</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Átadás előtti minőség-ellenőrzés — {window.QA_TODAY}</p>
        </div>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-lime-600 hover:bg-lime-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Új ellenőrzés</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="Nyitott ellenőrzés" value={open.length} sub="folyamatban" tone="lime" icon="shield" />
        <KPI label="SLA lejárt" value={overdue.length} sub="határidőn túl" tone="amber" icon="clock" />
        <KPI label="Megfelelési arány" value={`${Math.round(pass.rate * 100)}%`} sub={`${pass.pass}/${pass.closed} lezárt`} tone="emerald" icon="check" />
        <KPI label="Nyitott hibatétel" value={defects} sub="NCR-ekben" tone="rose" icon="alert" />
      </div>

      {overdue.length > 0 && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-center gap-3">
          <Icon name="clock" size={18} className="text-rose-600 shrink-0" />
          <div className="min-w-0 flex-1"><div className="text-[12.5px] font-semibold text-rose-800">{overdue.length} ellenőrzés SLA-határideje lejárt</div><div className="text-[11px] text-rose-700/80 truncate">{overdue.map((i) => i.id).join(", ")}</div></div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-stone-800">Nyitott ellenőrzések</span>
          <button onClick={() => onScreen && onScreen("inspections")} className="text-[11.5px] text-lime-700 font-medium inline-flex items-center gap-1">Mind <Icon name="chevron" size={13} /></button>
        </div>
        {open.length ? open.sort((a, b) => (window.QA_PRIORITY[b.priority].rank - window.QA_PRIORITY[a.priority].rank)).map((i) => <InspRow key={i.id} insp={i} onOpen={setOpenId} />)
          : <div className="px-4 py-10 text-center text-[12.5px] text-stone-400">Nincs nyitott ellenőrzés. 🎉</div>}
      </div>

      <QaDetailHost openId={openId} setOpen={setOpenId} />
      {newOpen && window.NewInspSheet && <window.NewInspSheet onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />}
    </div>
  );
}

// ── Ellenőrzések (lista) ─────────────────────────────────────────
function QualityInspections() {
  const sim = useSim();
  const [openId, setOpenId] = useStateQ(null);
  const [newOpen, setNewOpen] = useStateQ(false);
  const [typeF, setTypeF] = useStateQ("all");
  const [statusF, setStatusF] = useStateQ("open");
  const [q, setQ] = useStateQ("");
  const list = (sim.qaInspections || []).filter((i) =>
    (typeF === "all" || i.type === typeF)
    && (statusF === "all" ? true : statusF === "open" ? (window.QaEngine && window.QaEngine.isOpen(i)) : i.status === statusF)
    && (!q.trim() || (i.subject + " " + i.id + " " + (i.refLabel || "") + " " + (i.supplier || "")).toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Ellenőrzések</h1>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-lime-600 hover:bg-lime-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Új ellenőrzés</button>
      </div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]"><Icon name="search" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés…" className="w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-lime-500" /></div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-lime-500">
          <option value="open">Csak nyitott</option><option value="all">Minden státusz</option>
          {Object.keys(window.QA_STATUS || {}).map((k) => <option key={k} value={k}>{window.QA_STATUS[k].label}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
        {[["all", "Mind"], ...window.QA_TYPE_ORDER.map((k) => [k, window.QA_TYPE_META[k].short])].map(([k, lbl]) => (
          <button key={k} onClick={() => setTypeF(k)} className={`shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${typeF === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`}>{lbl}</button>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {list.length ? list.map((i) => <InspRow key={i.id} insp={i} onOpen={setOpenId} />) : <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs találat.</div>}
      </div>
      <QaDetailHost openId={openId} setOpen={setOpenId} />
      {newOpen && window.NewInspSheet && <window.NewInspSheet onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />}
    </div>
  );
}

// ── Tábla (státusz-oszlopok) ─────────────────────────────────────
function QualityBoard() {
  const sim = useSim();
  const [openId, setOpenId] = useStateQ(null);
  const list = sim.qaInspections || [];
  const cols = [...((window.QA_FLOW || {}).order || []), "javitasra", "selejt"];
  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1500px] mx-auto">
      <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900 mb-1">Tábla</h1>
      <p className="text-[12.5px] text-stone-500 mb-4">Az ellenőrzések állapot szerint — koppints egy kártyára.</p>
      <div className="overflow-x-auto pb-2"><div className="flex gap-3 min-w-max">
        {cols.map((st) => {
          const meta = window.QA_STATUS[st] || {};
          const items = list.filter((i) => i.status === st);
          return (
            <div key={st} className="w-[250px] shrink-0">
              <div className="flex items-center justify-between px-1 mb-2"><span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-stone-700"><span className={`w-2 h-2 rounded-full ${meta.dot}`} />{meta.label}</span><span className="text-[10.5px] text-stone-400">{items.length}</span></div>
              <div className="space-y-2 min-h-[60px]">
                {items.map((i) => (
                  <button key={i.id} onClick={() => setOpenId(i.id)} className="w-full text-left bg-white rounded-xl border border-stone-200 p-3 hover:border-stone-300 hover:shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1.5"><QaTypeBadge type={i.type} size="sm" /><QaPriorityPill priority={i.priority} size="sm" /></div>
                    <div className="text-[12.5px] font-semibold text-stone-900 leading-tight">{i.subject}</div>
                    <div className="text-[10.5px] text-stone-500 mt-0.5 truncate">{i.id} · {i.refLabel || i.ref}</div>
                    <div className="mt-1.5 flex items-center justify-between"><QaSlaBadge insp={i} size="sm" />{(i.defects || []).length > 0 && <span className="text-[10px] text-rose-600">{i.defects.length} hiba</span>}</div>
                  </button>
                ))}
                {!items.length && <div className="rounded-xl border border-dashed border-stone-200 py-4 text-center text-[11px] text-stone-300">—</div>}
              </div>
            </div>
          );
        })}
      </div></div>
      <QaDetailHost openId={openId} setOpen={setOpenId} />
    </div>
  );
}

// ── Részlet (checklist + FSM + NCR) ──────────────────────────────
function InspDetail({ insp, onClose }) {
  const sim = useSim();
  const live = (sim.qaInspections || []).find((x) => x.id === insp.id) || insp;
  const E = window.QaEngine;
  const next = E ? E.nextStates(live) : [];
  const pr = E ? E.progress(live) : { done: 0, total: 0, fail: 0 };
  const m = (window.QA_TYPE_META || {})[live.type] || {};
  const [scrapOpen, setScrapOpen] = useStateQ(false);
  const [scrapText, setScrapText] = useStateQ("");
  const [defSev, setDefSev] = useStateQ("major");
  const [defNote, setDefNote] = useStateQ("");

  const cycle = (idx, cur) => { const order = [null, true, false]; const nextV = order[(order.indexOf(cur) + 1) % 3]; window.sim.setQaCheck(live.id, idx, nextV); };

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="flex items-center gap-2 flex-wrap">
        <window.QaTypeBadge type={live.type} /><window.QaStatusPill status={live.status} /><window.QaPriorityPill priority={live.priority} /><window.QaSlaBadge insp={live} />
      </div>
      <window.QaStepper insp={live} />

      <div className="rounded-xl border border-stone-200 p-3 space-y-1.5">
        {live.note && <div className="text-[12.5px] text-stone-700">{live.note}</div>}
        {live.refLabel && <div className="flex items-center gap-2 text-[12px] text-stone-600"><Icon name="file" size={14} className="text-stone-400" />{live.refLabel}<span className="font-mono text-[10.5px] text-stone-400">· {live.ref}</span></div>}
        {live.supplier && <div className="flex items-center gap-2 text-[12px] text-stone-600"><Icon name="truck" size={14} className="text-stone-400" />{live.supplier}</div>}
        <div className="flex items-center gap-3 text-[11px] text-stone-400 pt-1"><span className="inline-flex items-center gap-1"><Icon name="user" size={12} />{live.inspector}</span><span>Felvéve: {live.reportedAt}</span></div>
      </div>

      {/* checklist */}
      <div>
        <div className="flex items-center justify-between mb-2"><div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Ellenőrzőlista</div><div className="text-[11px] text-stone-500">{pr.done}/{pr.total} kitöltve{pr.fail > 0 && <span className="text-rose-600"> · {pr.fail} hibás</span>}</div></div>
        <div className="space-y-1.5">
          {(live.checklist || []).map((c, idx) => (
            <button key={idx} onClick={() => cycle(idx, c.ok)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 text-left">
              <span className={`w-5 h-5 rounded grid place-items-center shrink-0 border ${c.ok === true ? "bg-emerald-500 border-emerald-500 text-white" : c.ok === false ? "bg-rose-500 border-rose-500 text-white" : "border-stone-300 bg-white"}`}>{c.ok === true ? <Icon name="check" size={13} /> : c.ok === false ? <Icon name="x" size={13} /> : null}</span>
              <span className={`text-[12.5px] flex-1 ${c.ok === false ? "text-rose-700" : "text-stone-700"}`}>{c.label}</span>
            </button>
          ))}
          {!(live.checklist || []).length && <div className="text-[12px] text-stone-400">Nincs ellenőrzőlista.</div>}
        </div>
      </div>

      {/* FSM akciók */}
      {E && E.isOpen(live) && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Eredmény / léptetés</div>
          <div className="flex items-center gap-2 flex-wrap">
            {next.map((to) => {
              const st = window.QA_STATUS[to] || {};
              const pass = to === "megfelelt", scrap = to === "selejt", rework = to === "javitasra";
              return <button key={to} onClick={() => { if (scrap) { setScrapOpen(true); } else { window.sim.setQaStatus(live.id, to); } }} className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${pass ? "bg-emerald-600 text-white hover:bg-emerald-700" : scrap ? "bg-rose-600 text-white hover:bg-rose-700" : rework ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-lime-600 text-white hover:bg-lime-700"}`}>{pass ? <Icon name="check" size={14} /> : scrap ? <Icon name="x" size={14} /> : rework ? <Icon name="rotate" size={14} /> : <Icon name="arrow-right" size={14} />}{st.label}</button>;
            })}
          </div>
          {scrapOpen && (
            <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <label className="text-[11px] text-stone-600 font-medium block mb-1">Selejt indoka {(live.defects || []).length ? "(opcionális — van hibatétel)" : "(kötelező)"}</label>
              <textarea value={scrapText} onChange={(e) => setScrapText(e.target.value)} rows={2} className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-stone-400" placeholder="Pl. gyári hiba, teljes tétel selejt…" />
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => { if (window.sim.setQaStatus(live.id, "selejt", { reason: scrapText })) { setScrapOpen(false); setScrapText(""); } }} className="h-8 px-3 rounded-lg bg-rose-600 text-white text-[12px] font-medium">Selejt</button>
                <button onClick={() => { setScrapOpen(false); setScrapText(""); }} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button>
              </div>
            </div>
          )}
        </div>
      )}
      {live.status === "megfelelt" && live.type !== "vegellenorzes" && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2"><Icon name="check" size={16} className="text-emerald-600" /><div className="text-[12.5px] font-medium text-emerald-800">Megfelelt{live.closedAt ? ` · ${live.closedAt}` : ""}</div></div>}
      {/* Minőség → Logisztika kézfogás: megfelelt végellenőrzés → kiszállításra kész → fuvar */}
      {live.status === "megfelelt" && live.type === "vegellenorzes" && (() => {
        const sh = (live.ref && window.sim.shipmentForRef) ? window.sim.shipmentForRef(live.ref) : null;
        return (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center gap-2">
              <Icon name="check" size={16} className="text-emerald-600 shrink-0" />
              <div className="text-[12.5px] font-medium text-emerald-800 flex-1">Megfelelt{live.closedAt ? ` · ${live.closedAt}` : ""} — a rendelés kiszállításra kész</div>
            </div>
            {sh ? (
              <button onClick={() => window.navigateTo && window.navigateTo("logistics", "deliveries")}
                className="mt-2.5 w-full h-10 rounded-xl bg-white text-sky-700 border border-sky-200 text-[12.5px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-sky-50">
                <Icon name="truck" size={15} />Fuvar: {sh.id} · {(window.LOG_STATUS[sh.status] || {}).label || sh.status} — Logisztika megnyitása
              </button>
            ) : (
              <button onClick={() => window.sim.createDeliveryFromQa(live.id)}
                className="mt-2.5 w-full h-11 rounded-xl bg-sky-600 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-sky-700">
                <Icon name="truck" size={16} />Kiszállításra kész — fuvar létrehozása
              </button>
            )}
          </div>
        );
      })()}
      {live.status === "selejt" && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-center gap-2"><Icon name="x" size={16} className="text-rose-600" /><div className="text-[12.5px] font-medium text-rose-800">Selejt{live.type === "bejovo" ? " · beszállítói reklamáció jelezve" : ""}</div></div>}

      {/* hibajegyzőkönyv (NCR) */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Hibajegyzőkönyv (NCR)</div>
        {(live.defects || []).length > 0 && (
          <div className="space-y-1.5 mb-2">
            {live.defects.map((d, idx) => { const sv = window.QA_DEFECT_SEV[d.sev] || {}; return (
              <div key={idx} className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-stone-200">
                <span className={`inline-flex items-center gap-1 rounded-full border font-medium px-1.5 h-5 text-[10px] shrink-0 mt-0.5 ${sv.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${sv.dot}`} />{sv.label}</span>
                <span className="text-[12px] text-stone-700 flex-1">{d.note}</span>
                {E && E.isOpen(live) && <button onClick={() => window.sim.removeQaDefect(live.id, idx)} className="text-stone-300 hover:text-rose-500 shrink-0"><Icon name="x" size={14} /></button>}
              </div>
            ); })}
          </div>
        )}
        {E && E.isOpen(live) && (
          <div className="rounded-xl border border-stone-200 p-2.5 space-y-2">
            <div className="flex items-center gap-1.5">
              {window.QA_DEFECT_ORDER.map((k) => { const sv = window.QA_DEFECT_SEV[k]; const on = defSev === k; return <button key={k} onClick={() => setDefSev(k)} className={`inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-medium border ${on ? sv.pill : "bg-white text-stone-500 border-stone-200"}`}><span className={`w-1.5 h-1.5 rounded-full ${sv.dot}`} />{sv.label}</button>; })}
            </div>
            <div className="flex items-end gap-2">
              <textarea value={defNote} onChange={(e) => setDefNote(e.target.value)} rows={1} placeholder="Hiba leírása…" className="flex-1 px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-lime-500 resize-none" />
              <button disabled={!defNote.trim()} onClick={() => { window.sim.addQaDefect(live.id, { sev: defSev, note: defNote }); setDefNote(""); }} className="h-9 px-3 rounded-lg bg-stone-900 text-white text-[12px] font-medium disabled:opacity-40 shrink-0">Rögzít</button>
            </div>
          </div>
        )}
      </div>

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

// ── Új ellenőrzés sheet ──────────────────────────────────────────
function NewInspSheet({ onClose, onCreated }) {
  const sim = useSim();
  const [type, setType] = useStateQ("gyartaskozi");
  const [priority, setPriority] = useStateQ("kozepes");
  const [subject, setSubject] = useStateQ("");
  const [refLabel, setRefLabel] = useStateQ("");
  const [supplier, setSupplier] = useStateQ("");
  const [note, setNote] = useStateQ("");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-lime-500";
  const create = () => { if (!subject.trim()) return; const id = window.sim.addQaInspection({ type, priority, subject, refLabel, supplier: type === "bejovo" ? supplier : "", note }); if (id && onCreated) onCreated(id); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[500px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"><div className="text-[14px] font-semibold text-stone-900">Új ellenőrzés</div><button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button></div>
        <div className="px-4 py-4 space-y-3.5">
          <div className="flex items-center gap-2">
            {window.QA_TYPE_ORDER.map((k) => { const m = window.QA_TYPE_META[k]; const on = type === k; return (
              <button key={k} onClick={() => setType(k)} className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border ${on ? "border-lime-500 bg-lime-50" : "border-stone-200 bg-white"}`}><Icon name={m.icon} size={18} className={on ? "text-lime-700" : "text-stone-400"} /><span className={`text-[11px] font-medium text-center leading-tight ${on ? "text-lime-800" : "text-stone-600"}`}>{m.short}</span></button>
            ); })}
          </div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Tárgy *</label><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mit ellenőrzünk?" className={cls} /></div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Hivatkozás (rendelés / PO / projekt)</label><input value={refLabel} onChange={(e) => setRefLabel(e.target.value)} placeholder="Pl. Bognár — konyhabútor" className={cls} /></div>
          {type === "bejovo" && <div><label className="text-[10.5px] text-stone-500 block mb-1">Beszállító</label><input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Beszállító neve" className={cls} /></div>}
          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">Prioritás</label>
            <div className="flex items-center gap-1.5">{window.QA_PRIORITY_ORDER.map((k) => { const p = window.QA_PRIORITY[k]; const on = priority === k; return <button key={k} onClick={() => setPriority(k)} className={`flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg text-[11.5px] font-medium border ${on ? p.pill : "bg-white text-stone-500 border-stone-200"}`}><span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />{p.label}</button>; })}</div>
          </div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Megjegyzés</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Részletek…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-lime-500" /></div>
          <button disabled={!subject.trim()} onClick={create} className="w-full h-10 rounded-xl bg-lime-600 text-white text-[13px] font-semibold disabled:opacity-40">Ellenőrzés létrehozása</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  QaStatusPill, QaTypeBadge, QaPriorityPill, QaSlaBadge, QaStepper, InspRow, QaDetailHost,
  QualityDashboard, QualityInspections, QualityBoard, InspDetail, NewInspSheet,
});
