// ─────────────────────────────────────────────────────────────────
// page-controlling.jsx — KONTROLLING világ
//   Projekt-jövedelmezőség: terv vs. tény utókalkuláció. SZÁMÍTOTT nézet a
//   store-ból (controllingForProject / controllingPortfolio) — auto-aggregálás
//   + kézi korrekciós tételek (ctrlAdjustments). Három nézet: Áttekintés
//   (portfólió), Projekt-fedezet (lista + detail SlideOver), Eltérés-elemzés.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateC, useMemo: useMemoC } = React;

const CTRL_STATUS_LABEL = { draft: "Vázlat", active: "Folyamatban", install: "Beépítés", done: "Kész", on_hold: "Áll" };

// vékony fedezet-sáv: bevétel = 100%, a költség kitölti, a fedezet a maradék
function MarginBar({ revenue, cost, tone }) {
  const r = Math.max(1, revenue || 0);
  const costPct = Math.max(0, Math.min(100, (cost / r) * 100));
  const t = tone || window.ctrlMarginTone((revenue - cost) / r);
  return (
    <div className="h-2.5 w-full rounded-full bg-stone-100 overflow-hidden flex">
      <div className="h-full bg-stone-300" style={{ width: costPct + "%" }} title={"Költség: " + window.ctrlHuf(cost)} />
      <div className={`h-full ${t.bar}`} style={{ width: (100 - costPct) + "%" }} title={"Fedezet: " + window.ctrlHuf(revenue - cost)} />
    </div>
  );
}

function MarginPill({ pct, size = "md" }) {
  const t = window.ctrlMarginTone(pct);
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{window.ctrlPct(pct)} · {t.label}</span>;
}

function VarPill({ diff, size = "md" }) {
  const t = window.ctrlVarianceTone(diff);
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  if (Math.abs(diff) < 1) return <span className={`inline-flex items-center rounded-full border font-medium ${cls} ${t.pill}`}>terv szerint</span>;
  return <span className={`inline-flex items-center rounded-full border font-medium ${cls} ${t.pill}`}>{t.sign}{window.ctrlHuf(Math.abs(diff)).replace(" Ft", "")} Ft</span>;
}

// ── Detail host (SlideOver) ──────────────────────────────────────
function CtrlDetailHost({ openId, onClose }) {
  const sim = useSim();
  const SO = window.SlideOver;
  const r = openId ? window.sim.controllingForProject(openId) : null;
  if (!SO) return null;
  return (
    <SO open={!!r} onClose={onClose} title={r ? r.project.name : ""} subtitle={r ? r.project.customer : ""} width={620}>
      {r ? <ProjectControllingDetail r={r} /> : null}
    </SO>
  );
}

// ── Áttekintés (portfólió) ───────────────────────────────────────
function ControllingDashboard({ onScreen }) {
  const sim = useSim();
  const pf = window.sim.controllingPortfolio();
  const [openId, setOpenId] = useStateC(null);
  const [cfgOpen, setCfgOpen] = useStateC(false);
  const cfg = window.sim.ctrlConfig();
  const T = pf.totals;

  const KPI = ({ label, value, sub, tone = "slate" }) => (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">{label}</div>
      <div className={`text-[22px] font-semibold leading-none mt-1.5 ${tone === "rose" ? "text-rose-700" : tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-stone-900"}`}>{value}</div>
      {sub && <div className="text-[10.5px] text-stone-400 mt-1">{sub}</div>}
    </div>
  );

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Kontrolling</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Projekt-jövedelmezőség — terv vs. tény utókalkuláció</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-[11.5px] text-stone-500 bg-white border border-stone-200 rounded-lg px-3 h-9">
            <span>Rezsi</span>
            <input type="number" value={cfg.overheadPct} onChange={(e) => window.sim.setCtrlConfig({ overheadPct: Number(e.target.value) || 0 })} className="w-12 h-6 px-1 rounded border border-stone-200 text-[12px] text-right" />
            <span>%</span>
          </div>
          <button onClick={() => setCfgOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 bg-white text-[12px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-800" title="Óradíj-beállítások">
            <Icon name="settings" size={15} className="text-stone-400" />
            <span className="hidden md:inline">Óradíjak</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <KPI label="Szerződéses érték" value={window.ctrlHuf(T.contract)} sub={`Számlázva: ${window.ctrlHuf(T.invoiced)}`} />
        <KPI label="Terv összköltség" value={window.ctrlHuf(T.planTotal)} sub={`Fedezet: ${window.ctrlPct(T.planMarginPct)}`} />
        <KPI label="Tény összköltség" value={window.ctrlHuf(T.actualTotal)} sub={`Eltérés: ${window.ctrlHuf(T.actualTotal - T.planTotal)}`} tone={T.actualTotal > T.planTotal ? "rose" : "emerald"} />
        <KPI label="Tény fedezet" value={window.ctrlPct(T.actualMarginPct)} sub={`Eddig realizált · ${window.ctrlHuf(T.actualMargin)}`} tone={(T.actualMarginPct || 0) < 0.15 ? "rose" : "emerald"} />
        <KPI label="Várható fedezet (EAC)" value={window.ctrlPct(T.eacMarginPct)} sub={`Terv+realizált · ${window.ctrlHuf(T.eacMargin)}`} tone={(T.eacMarginPct || 0) < 0.15 ? "rose" : (T.eacMarginPct || 0) < 0.30 ? "amber" : "emerald"} />
      </div>

      {/* top / flop */}
      <div className="grid md:grid-cols-2 gap-3 mb-4">
        {[["Legjobb fedezet", pf.top, "emerald"], ["Leggyengébb fedezet", pf.flop, "rose"]].map(([label, r, tone], i) => (
          <button key={i} onClick={() => r && setOpenId(r.project.id)} className="text-left bg-white rounded-2xl border border-stone-200 p-4 hover:border-stone-300">
            <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">{label}</div>
            {r ? <>
              <div className="flex items-center justify-between gap-2">
                <div className="text-[14px] font-semibold text-stone-900 truncate">{r.project.name}</div>
                <MarginPill pct={r.actualMarginPct} size="sm" />
              </div>
              <div className="text-[11px] text-stone-500 mb-2">{r.project.customer}</div>
              <MarginBar revenue={r.revenueActual} cost={r.actualTotal} />
            </> : <div className="text-[12px] text-stone-400">—</div>}
          </button>
        ))}
      </div>

      {/* projekt-lista (kompakt) */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-stone-800">Projektek</span>
          <button onClick={() => onScreen && onScreen("projects")} className="text-[11.5px] text-slate-600 font-medium inline-flex items-center gap-1">Mind <Icon name="chevron" size={13} /></button>
        </div>
        {pf.list.map((r) => <CtrlProjectRow key={r.project.id} r={r} onOpen={setOpenId} />)}
      </div>

      <CtrlDetailHost openId={openId} onClose={() => setOpenId(null)} />
      <CtrlSettingsSheet open={cfgOpen} onClose={() => setCfgOpen(false)} />
    </div>
  );
}

// ── Óradíj-beállítások (munkaerő ár-bázis) ───────────────────────
function CtrlSettingsSheet({ open, onClose }) {
  const sim = useSim();
  const SO = window.SlideOver;
  const cfg = window.sim.ctrlConfig();
  const D = window.CTRL_DEFAULTS || {};
  const BASIS = window.CTRL_LABOR_BASIS || {};
  const GRADES = window.HR_PAY_GRADES || {};
  const GORDER = window.HR_PAY_ORDER || Object.keys(GRADES);
  const KINDS = window.PROD_KINDS || {};
  const KORDER = window.PROD_KIND_ORDER || Object.keys(KINDS);
  const kindRates = cfg.kindRates || window.CTRL_KIND_RATES || {};
  if (!SO) return null;

  const mult = Number(cfg.gradeLoadMult) || D.gradeLoadMult || 1.9;
  const basis = cfg.laborBasis || "auto";
  const huf = (n) => Math.round(n).toLocaleString("hu-HU");

  const setKind = (k, v) => {
    const next = { ...(window.CTRL_KIND_RATES || {}), ...kindRates, [k]: Number(v) || 0 };
    window.sim.setCtrlConfig({ kindRates: next });
  };
  const resetAll = () => window.sim.setCtrlConfig({
    laborBasis: D.laborBasis || "auto",
    gradeLoadMult: D.gradeLoadMult || 1.9,
    laborRate: D.laborRate || 7200,
    kindRates: { ...(window.CTRL_KIND_RATES || {}) },
  });

  const BASIS_DESC = {
    auto: "Kaszkád: ha a feladathoz HR-dolgozó van rendelve → bér-kategória; különben művelettípus; végül átalány.",
    grade: "Mindig a hozzárendelt dolgozó bér-kategóriáját használja (dolgozó nélkül átalány).",
    kind: "Mindig a művelettípus óradíját használja (ismeretlen típusnál átalány).",
    flat: "Minden feladatra az általános átalány óradíjat alkalmazza.",
  };
  const BORDER = ["auto", "grade", "kind", "flat"];
  const basisLabel = (k) => k === "auto" ? "Automatikus" : (BASIS[k] || {}).label || k;

  const Field = ({ label, children, hint }) => (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[12px] font-medium text-stone-700">{label}</span>
        {hint && <span className="text-[10.5px] text-stone-400">{hint}</span>}
      </div>
      {children}
    </div>
  );

  return (
    <SO open={open} onClose={onClose} title="Óradíj-beállítások" subtitle="Tény-munkaerő ár-bázis a kontrollinghoz" width={520}>
      <div className="px-1 py-1 space-y-6">
        {/* Ár-bázis */}
        <Field label="Munkaerő ár-bázis">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {BORDER.map((k) => (
              <button key={k} onClick={() => window.sim.setCtrlConfig({ laborBasis: k })}
                className={`h-9 rounded-lg border text-[12px] font-medium transition-colors ${basis === k ? "border-slate-600 bg-slate-700 text-white" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`}>
                {basisLabel(k)}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-stone-500 mt-2 leading-snug">{BASIS_DESC[basis]}</p>
        </Field>

        {/* Bér-kategória terhelési szorzó */}
        <Field label="Bér-kategória terhelési szorzó" hint={`alap: ${D.gradeLoadMult || 1.9}×`}>
          <div className="flex items-center gap-3">
            <input type="range" min="1" max="3" step="0.05" value={mult}
              onChange={(e) => window.sim.setCtrlConfig({ gradeLoadMult: Number(e.target.value) })}
              className="flex-1 accent-slate-600" />
            <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg px-2 h-9">
              <input type="number" step="0.05" min="1" value={mult}
                onChange={(e) => window.sim.setCtrlConfig({ gradeLoadMult: Number(e.target.value) || 1 })}
                className="w-12 h-7 text-[13px] text-right outline-none" />
              <span className="text-[12px] text-stone-400">×</span>
            </div>
          </div>
          <p className="text-[11px] text-stone-500 mt-1.5 leading-snug">Nettó HR-órabér → teljes (bér + járulék + rezsi) műhely-óradíj.</p>
          {/* élő előnézet a bér-kategóriákra */}
          <div className="mt-2.5 rounded-xl border border-stone-200 overflow-hidden">
            <div className="grid grid-cols-[1.4fr_1fr_auto_1fr] items-center px-3 py-1.5 bg-stone-50/70 text-[10px] uppercase tracking-wide text-stone-400 font-medium">
              <span>Bér-kategória</span><span className="text-right">Nettó</span><span className="px-2"> </span><span className="text-right">Terhelt</span>
            </div>
            {GORDER.map((g) => {
              const net = (GRADES[g] || {}).rate || 0;
              return (
                <div key={g} className="grid grid-cols-[1.4fr_1fr_auto_1fr] items-center px-3 py-1.5 border-t border-stone-100 text-[12px]">
                  <span className="text-stone-700 truncate">{(GRADES[g] || {}).label || g}</span>
                  <span className="text-right text-stone-500 tabular-nums">{huf(net)}</span>
                  <span className="px-2 text-stone-300">→</span>
                  <span className="text-right font-semibold text-stone-900 tabular-nums">{huf(net * mult)}</span>
                </div>
              );
            })}
          </div>
        </Field>

        {/* Per-művelettípus óradíjak */}
        <Field label="Per-művelettípus óradíjak" hint="dolgozó nélküli feladatra">
          <div className="space-y-1.5">
            {KORDER.map((k) => {
              const meta = KINDS[k] || {};
              return (
                <div key={k} className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.accent || "#a8a29e" }} />
                  <span className="text-[12.5px] text-stone-700 flex-1 truncate">{meta.label || k}</span>
                  <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg px-2 h-9">
                    <input type="number" step="100" value={kindRates[k] ?? (window.CTRL_KIND_RATES || {})[k] ?? 0}
                      onChange={(e) => setKind(k, e.target.value)}
                      className="w-16 h-7 text-[13px] text-right outline-none tabular-nums" />
                    <span className="text-[11px] text-stone-400">Ft/h</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Field>

        {/* Általános átalány óradíj */}
        <Field label="Általános óradíj (átalány)" hint="végső fallback">
          <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg px-2 h-9 w-fit">
            <input type="number" step="100" value={cfg.laborRate ?? D.laborRate ?? 7200}
              onChange={(e) => window.sim.setCtrlConfig({ laborRate: Number(e.target.value) || 0 })}
              className="w-20 h-7 text-[13px] text-right outline-none tabular-nums" />
            <span className="text-[11px] text-stone-400">Ft/h</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1.5 leading-snug">Akkor érvényes, ha sem dolgozó, sem művelettípus-óradíj nem oldható fel.</p>
        </Field>

        <div className="pt-1 flex items-center justify-between border-t border-stone-100">
          <span className="text-[11px] text-stone-400">A változás azonnal érvényesül a tény-fedezeten.</span>
          <button onClick={resetAll} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] font-medium text-stone-600 hover:border-stone-300 hover:text-stone-800">Alapértékek</button>
        </div>
      </div>
    </SO>
  );
}

function CtrlProjectRow({ r, onOpen }) {
  return (
    <button onClick={() => onOpen(r.project.id)} className="w-full text-left px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-stone-900 truncate">{r.project.name}</span>
          <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 shrink-0">{CTRL_STATUS_LABEL[r.project.status] || r.project.status}</span>
        </div>
        <div className="text-[11px] text-stone-500 truncate mb-1.5">{r.project.customer} · {window.ctrlHuf(r.revenueActual)}</div>
        <MarginBar revenue={r.revenueActual} cost={r.actualTotal} />
      </div>
      <div className="shrink-0 w-[120px] text-right flex flex-col items-end gap-1">
        <MarginPill pct={r.actualMarginPct} size="sm" />
        <VarPill diff={r.costVariance} size="sm" />
      </div>
      <Icon name="chevron" size={15} className="text-stone-300 shrink-0" />
    </button>
  );
}

// ── Projekt-fedezet (lista) ──────────────────────────────────────
function ControllingProjects() {
  const sim = useSim();
  const pf = window.sim.controllingPortfolio();
  const [openId, setOpenId] = useStateC(null);
  const [sort, setSort] = useStateC("margin");
  const rows = pf.list.slice().sort((a, b) =>
    sort === "margin" ? (a.actualMarginPct || 0) - (b.actualMarginPct || 0) :
    sort === "variance" ? (b.costVariance) - (a.costVariance) :
    (b.revenueActual - a.revenueActual));

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Projekt-fedezet</h1>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-slate-500">
          <option value="margin">Fedezet szerint (növekvő)</option>
          <option value="variance">Költség-eltérés szerint</option>
          <option value="revenue">Bevétel szerint</option>
        </select>
      </div>

      {/* asztali táblázat */}
      <div className="hidden md:block bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1.2fr_120px] px-4 py-2.5 border-b border-stone-100 bg-stone-50/50 text-[10.5px] uppercase tracking-wide text-stone-400 font-medium">
          <span>Projekt</span><span className="text-right">Bevétel</span><span className="text-right">Terv ktg.</span><span className="text-right">Tény ktg.</span><span className="text-right pr-2">Eltérés</span><span className="text-right">Fedezet</span>
        </div>
        {rows.map((r) => (
          <button key={r.project.id} onClick={() => setOpenId(r.project.id)} className="w-full grid grid-cols-[1.6fr_1fr_1fr_1fr_1.2fr_120px] items-center px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 text-left">
            <div className="min-w-0 pr-2"><div className="text-[12.5px] font-semibold text-stone-900 truncate">{r.project.name}</div><div className="text-[10.5px] text-stone-500 truncate">{r.project.customer}</div></div>
            <div className="text-right text-[12.5px] tabular-nums text-stone-700">{window.ctrlHuf(r.revenueActual)}</div>
            <div className="text-right text-[12.5px] tabular-nums text-stone-500">{window.ctrlHuf(r.planTotal)}</div>
            <div className="text-right text-[12.5px] tabular-nums text-stone-900 font-medium">{window.ctrlHuf(r.actualTotal)}</div>
            <div className="text-right pr-2"><VarPill diff={r.costVariance} size="sm" /></div>
            <div className="text-right"><MarginPill pct={r.actualMarginPct} size="sm" /></div>
          </button>
        ))}
      </div>

      {/* mobil kártyák */}
      <div className="md:hidden bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {rows.map((r) => <CtrlProjectRow key={r.project.id} r={r} onOpen={setOpenId} />)}
      </div>

      <CtrlDetailHost openId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

// ── Eltérés-elemzés ──────────────────────────────────────────────
function ControllingVariance() {
  const sim = useSim();
  const pf = window.sim.controllingPortfolio();
  const [openId, setOpenId] = useStateC(null);
  const CATS = window.CTRL_CATEGORIES || {};
  const ORDER = window.CTRL_CAT_ORDER || [];

  // kategóriánkénti portfólió-aggregátum
  const byCat = ORDER.map((c) => {
    const plan = pf.list.reduce((a, r) => a + (r.plan[c] || 0), 0);
    const actual = pf.list.reduce((a, r) => a + (r.actual[c] || 0), 0);
    return { key: c, meta: CATS[c] || {}, plan, actual, diff: actual - plan };
  });
  const maxAbs = Math.max(1, ...byCat.map((x) => Math.max(x.plan, x.actual)));

  // projektek a legnagyobb költség-csúszással
  const slipped = pf.list.slice().filter((r) => r.costVariance > 0).sort((a, b) => b.costVariance - a.costVariance);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900 mb-1">Eltérés-elemzés</h1>
      <p className="text-[12.5px] text-stone-500 mb-4">Hol csúszott a költség a tervhez képest — kategóriánként és projektenként.</p>

      <div className="bg-white rounded-2xl border border-stone-200 p-4 md:p-5 mb-4">
        <div className="text-[12.5px] font-semibold text-stone-800 mb-3">Kategória szerint (teljes portfólió)</div>
        <div className="space-y-3">
          {byCat.map((x) => (
            <div key={x.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-stone-700"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: x.meta.accent }} />{x.meta.label}</span>
                <span className="text-[11.5px]"><VarPill diff={x.diff} size="sm" /></span>
              </div>
              {/* terv + tény sávpár */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9.5px] text-stone-400 w-8 shrink-0">terv</span>
                  <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden"><div className="h-full bg-stone-300" style={{ width: (x.plan / maxAbs * 100) + "%" }} /></div>
                  <span className="text-[10.5px] tabular-nums text-stone-500 w-20 text-right shrink-0">{window.ctrlHuf(x.plan)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9.5px] text-stone-400 w-8 shrink-0">tény</span>
                  <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden"><div className="h-full" style={{ width: (x.actual / maxAbs * 100) + "%", background: x.meta.accent }} /></div>
                  <span className="text-[10.5px] tabular-nums text-stone-800 font-medium w-20 text-right shrink-0">{window.ctrlHuf(x.actual)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-stone-100 text-[12.5px] font-semibold text-stone-800">Költség-túllépő projektek</div>
        {slipped.length ? slipped.map((r) => (
          <button key={r.project.id} onClick={() => setOpenId(r.project.id)} className="w-full text-left px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-stone-900 truncate">{r.project.name}</div>
              <div className="text-[10.5px] text-stone-500">Terv {window.ctrlHuf(r.planTotal)} → Tény {window.ctrlHuf(r.actualTotal)}</div>
            </div>
            <VarPill diff={r.costVariance} size="sm" />
            <Icon name="chevron" size={15} className="text-stone-300" />
          </button>
        )) : <div className="px-4 py-8 text-center text-[12px] text-stone-400">Nincs költség-túllépő projekt — minden terv szerint vagy alatta.</div>}
      </div>

      <CtrlDetailHost openId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

// ── Munka tény — bérköltség bontás (időnaplóból) ────────────────────
function CtrlLaborBreakdown({ r }) {
  const [view, setView] = useStateC("person");   // person | basis
  const [open, setOpen] = useStateC(false);
  const [cfgOpen, setCfgOpen] = useStateC(false);
  const BASIS = window.CTRL_LABOR_BASIS || {};
  const KINDS = window.PROD_KINDS || {};
  const GRADES = window.HR_PAY_GRADES || {};
  const bd = r.laborBreakdown || [];
  const by = r.laborByBasis || {};
  const people = r.laborByPerson || [];
  if (!bd.length) return null;
  const basisOrder = ["grade", "kind", "flat"].filter((k) => (by[k] || 0) > 0);
  const Tab = ({ id, label }) => (
    <button onClick={() => setView(id)} className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition ${view === id ? "bg-white shadow-sm text-stone-900" : "text-stone-500"}`}>{label}</button>
  );
  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Munka tény — bérköltség</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-stone-400 tabular-nums">{r.laborHoursTotal != null ? r.laborHoursTotal.toLocaleString("hu-HU") + " ó · " : ""}{window.ctrlHuf(r.laborActual)}</span>
          <button onClick={() => setCfgOpen(true)} className="w-7 h-7 grid place-items-center rounded-md border border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300 shrink-0" title="Óradíj-beállítások"><Icon name="settings" size={13} /></button>
          <div className="inline-flex items-center gap-0.5 bg-stone-100 rounded-lg p-0.5"><Tab id="person" label="Személy" /><Tab id="basis" label="Bázis" /></div>
        </div>
      </div>

      {view === "person" ? (
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          {people.map((p) => {
            const grade = p.payGrade ? (GRADES[p.payGrade] || {}).label : (BASIS[p.basis] || {}).label;
            return (
              <div key={p.who} className="flex items-center gap-2.5 px-3 py-2 border-b border-stone-100 last:border-0">
                <span className="w-7 h-7 rounded-full grid place-items-center text-[10px] font-semibold text-white shrink-0" style={{ background: p.color }}>{p.initials || "?"}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-stone-800 truncate">{p.who}{!p.inTorzs && <span className="ml-1 text-[9px] text-stone-400">(nincs HR-törzsben)</span>}</div>
                  <div className="text-[9.5px] text-stone-400 truncate">{grade} · {p.hours.toLocaleString("hu-HU")} ó × {window.ctrlHuf(p.rate).replace(" Ft", "")} Ft · {p.taskCount} feladat</div>
                </div>
                <span className="text-[12.5px] tabular-nums font-semibold text-stone-900 shrink-0">{window.ctrlHuf(p.cost)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          {basisOrder.map((k) => {
            const m = BASIS[k] || {};
            return (
              <div key={k} className="flex items-center gap-2 px-3 py-2 border-b border-stone-100 last:border-0">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 h-6 text-[11px] font-medium ${m.pill || ""}`}><span className={`w-1.5 h-1.5 rounded-full ${m.dot || "bg-stone-400"}`} />{m.label || k}</span>
                <span className="text-[10.5px] text-stone-400 flex-1 truncate">{k === "grade" ? "HR bér-kategória (hozzárendelt dolgozó)" : k === "kind" ? "per-művelettípus óradíj" : "általános fallback óradíj"}</span>
                <span className="text-[12px] tabular-nums font-medium text-stone-800 shrink-0">{window.ctrlHuf(by[k])}</span>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={() => setOpen((v) => !v)} className="mt-1.5 text-[11px] text-slate-600 font-medium inline-flex items-center gap-1">
        <Icon name={open ? "chevron-up" : "chevron"} size={12} />{open ? "Feladatonkénti bontás elrejtése" : `Feladatonkénti bontás (${bd.length})`}
      </button>
      {open && (
        <div className="mt-1.5 rounded-xl border border-stone-200 overflow-hidden">
          <div className="grid grid-cols-[1.5fr_0.7fr_0.8fr_0.8fr] px-3 py-1.5 bg-stone-50/60 text-[9.5px] uppercase tracking-wide text-stone-400 font-medium">
            <span>Feladat</span><span className="text-right">Óra</span><span className="text-right">Óradíj</span><span className="text-right">Költség</span>
          </div>
          {bd.map((x) => {
            const km = KINDS[x.kind] || {};
            const bm = BASIS[x.basis] || {};
            return (
              <div key={x.taskId} className="grid grid-cols-[1.5fr_0.7fr_0.8fr_0.8fr] items-center px-3 py-2 border-t border-stone-100">
                <div className="min-w-0 pr-1">
                  <div className="text-[11.5px] text-stone-800 truncate">{x.title}</div>
                  <div className="text-[9.5px] text-stone-400 truncate">{km.label || x.kind} · {x.who || x.assignee || bm.label}</div>
                </div>
                <div className="text-right text-[11px] tabular-nums text-stone-500">{x.hours.toLocaleString("hu-HU")} ó</div>
                <div className="text-right text-[11px] tabular-nums text-stone-500">{window.ctrlHuf(x.rate).replace(" Ft", "")}</div>
                <div className="text-right text-[11.5px] tabular-nums font-medium text-stone-800">{window.ctrlHuf(x.cost)}</div>
              </div>
            );
          })}
        </div>
      )}
      <div className="text-[10px] text-stone-400 mt-1.5">A tény-óradíj feladatonként: hozzárendelt dolgozó → HR bér-kategória (terhelt) → művelettípus → átalány. A kézi munka-napló tételek ezen fölött, a korrekcióknál.</div>
      <CtrlSettingsSheet open={cfgOpen} onClose={() => setCfgOpen(false)} />
    </div>
  );
}

// ── Projekt-detail (utókalkuláció) ───────────────────────────────
function ProjectControllingDetail({ r }) {
  const sim = useSim();
  const CATS = window.CTRL_CATEGORIES || {};
  const [addOpen, setAddOpen] = useStateC(false);
  const tone = window.ctrlMarginTone(r.actualMarginPct);

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      {/* bevétel + fedezet összegző */}
      <div className="rounded-xl border border-stone-200 p-3.5">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><div className="text-[10.5px] text-stone-400">Szerződéses érték</div><div className="text-[15px] font-semibold text-stone-900 tabular-nums">{window.ctrlHuf(r.contract)}</div></div>
          <div><div className="text-[10.5px] text-stone-400">Számlázva (tény bevétel)</div><div className="text-[15px] font-semibold text-stone-900 tabular-nums">{window.ctrlHuf(r.invoiced)}{r.invoiced === 0 ? " " : ""}</div>{r.invoiced === 0 && <div className="text-[9.5px] text-amber-600">még nincs kiállított számla</div>}</div>
        </div>
        <MarginBar revenue={r.revenueActual} cost={r.actualTotal} tone={tone} />
        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
          <div><div className="text-[10px] text-stone-400">Terv fedezet</div><div className="text-[13px] font-semibold text-stone-700">{window.ctrlPct(r.planMarginPct)}</div></div>
          <div><div className="text-[10px] text-stone-400">Tény fedezet</div><div className={`text-[13px] font-semibold ${tone.fg}`}>{window.ctrlPct(r.actualMarginPct)}</div></div>
          <div><div className="text-[10px] text-stone-400">Várható (EAC)</div><div className={`text-[13px] font-semibold ${window.ctrlMarginTone(r.eacMarginPct).fg}`}>{window.ctrlPct(r.eacMarginPct)}</div></div>
          <div><div className="text-[10px] text-stone-400">Költség-eltérés</div><div className="text-[13px] font-semibold"><VarPill diff={r.costVariance} size="sm" /></div></div>
        </div>
        {/* hozzáadott érték — bevétel − külső beszerzett (anyag+bérmunka+beszállító+szállítás) */}
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10.5px] text-stone-400">Hozzáadott érték <span className="text-stone-300">(bevétel − külső input)</span></div>
            <div className="text-[15px] font-semibold text-stone-900 tabular-nums">{window.ctrlHuf(r.valueAdded)} <span className="text-[12px] font-medium text-emerald-700">· {window.ctrlPct(r.valueAddedPct)}</span></div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10.5px] text-stone-400">Külső input <span className="text-stone-300">(anyag·bérmunka·beszállító·fuvar)</span></div>
            <div className="text-[13.5px] font-semibold text-stone-700 tabular-nums">{window.ctrlHuf(r.externalActual)}<span className="text-[11px] font-normal text-stone-400"> · {window.ctrlPct(r.revenueActual ? r.externalActual / r.revenueActual : null)}</span></div>
          </div>
        </div>
      </div>

      {/* kategória-bontás */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Költség-kategóriák — terv vs. tény</div>
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] px-3 py-2 bg-stone-50/60 text-[10px] uppercase tracking-wide text-stone-400 font-medium">
            <span>Kategória</span><span className="text-right">Terv</span><span className="text-right">Tény</span><span className="text-right">Eltérés</span>
          </div>
          {r.cats.map((c) => {
            const meta = CATS[c.key] || {};
            return (
              <div key={c.key} className="grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center px-3 py-2 border-t border-stone-100">
                <span className="inline-flex items-center gap-1.5 text-[12px] text-stone-700 min-w-0"><span className="w-6 h-6 rounded-md grid place-items-center shrink-0" style={{ background: (meta.accent || "#999") + "1a", color: meta.accent }}><Icon name={meta.icon || "box"} size={12} /></span><span className="truncate">{meta.label || c.key}</span></span>
                <span className="text-right text-[12px] tabular-nums text-stone-500">{window.ctrlHuf(c.plan)}</span>
                <span className="text-right text-[12px] tabular-nums text-stone-900 font-medium">{window.ctrlHuf(c.actual)}</span>
                <span className="text-right text-[11.5px] tabular-nums"><span className={window.ctrlVarianceTone(c.diff).fg}>{Math.abs(c.diff) < 1 ? "—" : (c.diff > 0 ? "+" : "−") + window.ctrlHuf(Math.abs(c.diff)).replace(" Ft", "")}</span></span>
              </div>
            );
          })}
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center px-3 py-2.5 border-t-2 border-stone-200 bg-stone-50/40">
            <span className="text-[12.5px] font-semibold text-stone-800">Összesen</span>
            <span className="text-right text-[12.5px] tabular-nums font-semibold text-stone-600">{window.ctrlHuf(r.planTotal)}</span>
            <span className="text-right text-[12.5px] tabular-nums font-semibold text-stone-900">{window.ctrlHuf(r.actualTotal)}</span>
            <span className="text-right text-[12px] tabular-nums"><VarPill diff={r.costVariance} size="sm" /></span>
          </div>
        </div>
        <div className="text-[10px] text-stone-400 mt-1.5">Az anyag a raktári kivétből, a bérmunka a B2B kézfogásokból, a szállítás a fuvarokból, a beszállítói a bejövő számlákból auto-aggregálódik; a munka az időnaplóból (óradíj-bázis lent) + kézi tételek. Rezsi = {r.cfg.overheadPct}% a direkt költségen.</div>
      </div>

      {/* munka tény — óradíj-bázis bontás */}
      <CtrlLaborBreakdown r={r} />

      {/* rendelések */}
      {r.orders.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Rendelések a projektben</div>
          <div className="rounded-xl border border-stone-200 overflow-hidden">
            {r.orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-stone-100 last:border-0">
                <div className="min-w-0"><div className="text-[12px] font-mono text-stone-700">{o.id}</div><div className="text-[10.5px] text-stone-400 truncate">{o.customer}</div></div>
                <div className="text-right shrink-0"><div className="text-[11.5px] tabular-nums text-stone-700">Számlázva {window.ctrlHuf(o.invoiced)}</div><div className="text-[10px] text-stone-400">ktg-hányad ~{window.ctrlHuf(o.costShare)}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* kézi korrekciók */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Kézi korrekciók / pót-tételek</span>
          <button onClick={() => setAddOpen((v) => !v)} className="text-[11.5px] text-slate-600 font-medium inline-flex items-center gap-1"><Icon name="plus" size={13} />Új</button>
        </div>
        {addOpen && <CtrlAdjustForm projectId={r.project.id} onClose={() => setAddOpen(false)} />}
        {r.adjustments.length ? (
          <div className="space-y-1.5">
            {r.adjustments.map((a) => {
              const meta = CATS[a.category] || {};
              return (
                <div key={a.id} className="flex items-start gap-2 px-3 py-2 rounded-lg border border-stone-200">
                  <span className="w-6 h-6 rounded-md grid place-items-center shrink-0 mt-0.5" style={{ background: (meta.accent || "#999") + "1a", color: meta.accent }}><Icon name={meta.icon || "box"} size={12} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-stone-800">{a.label}</div>
                    <div className="text-[10.5px] text-stone-400">{meta.label}{a.note ? " · " + a.note : ""}</div>
                  </div>
                  <div className="text-right shrink-0">
                    {a.plan ? <div className="text-[10.5px] text-stone-400 tabular-nums">terv {window.ctrlHuf(a.plan)}</div> : null}
                    {a.actual ? <div className="text-[11.5px] text-stone-800 font-medium tabular-nums">tény {window.ctrlHuf(a.actual)}</div> : null}
                  </div>
                  <button onClick={() => window.sim.removeCtrlAdjustment(a.id)} className="text-stone-300 hover:text-rose-500 shrink-0 mt-0.5"><Icon name="x" size={14} /></button>
                </div>
              );
            })}
          </div>
        ) : <div className="text-[12px] text-stone-400 px-1">Nincs kézi tétel — minden auto-aggregált.</div>}
      </div>
    </div>
  );
}

function CtrlAdjustForm({ projectId, onClose }) {
  const CATS = window.CTRL_CATEGORIES || {};
  const ORDER = window.CTRL_CAT_ORDER || [];
  const [category, setCategory] = useStateC("munka");
  const [label, setLabel] = useStateC("");
  const [plan, setPlan] = useStateC("");
  const [actual, setActual] = useStateC("");
  const [note, setNote] = useStateC("");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-slate-500";
  const save = () => {
    if (!label.trim() || (!Number(plan) && !Number(actual))) return;
    window.sim.addCtrlAdjustment({ scope: "project", refId: projectId, category, label, plan: Number(plan) || 0, actual: Number(actual) || 0, note });
    onClose();
  };
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 mb-2 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={cls}>{ORDER.map((c) => <option key={c} value={c}>{(CATS[c] || {}).label || c}</option>)}</select>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Megnevezés" className={cls} />
        <input value={plan} onChange={(e) => setPlan(e.target.value)} type="number" placeholder="Terv (Ft)" className={cls} />
        <input value={actual} onChange={(e) => setActual(e.target.value)} type="number" placeholder="Tény (Ft)" className={cls} />
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Megjegyzés (opcionális)" className={cls} />
      <div className="flex items-center gap-2"><button onClick={save} className="h-8 px-3 rounded-lg bg-slate-700 text-white text-[12px] font-medium">Hozzáadás</button><button onClick={onClose} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button></div>
    </div>
  );
}

Object.assign(window, {
  ControllingDashboard, ControllingProjects, ControllingVariance,
  ProjectControllingDetail, CtrlDetailHost, CtrlLaborBreakdown, CtrlSettingsSheet, MarginBar, MarginPill, VarPill,
});
