// ──────────────────────────────────────────────────────────────────────────
// page-mfg-prep.jsx — Gyártás → „Előkészítés"
//
//   A gyártás-előkészítés felülete. A megrendelt / gyártási projektből a
//   window.MfgPrep motor levezeti a szükségleteket; ez a felület mutatja és
//   teszi műveletekké:
//     • Anyag      — lapanyag m² → táblaszám, készlet-fedezet
//     • Szabászat  — rész-szintű vágólista + egyszerű nesting-előnézet
//     • Vasalat    — db × márka-ár a katalógusból
//     • Munkaidő   — RÉSZLEGENKÉNT a termelékenységi normából (óra + nap)
//     • Bérmunka   — folyamat-elem (szabászat/élzárás/festés/CNC) kiadása
//                    partnernek → B2BHandshake (delegateEpic)
//
//   Belépő: a Gyártás világ „Előkészítés" menüje (lista), ill. a Gyártási
//   projekt kártyájáról. Rendelésből is nyitható (pszeudo-projekt).
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStatePrep } = React;

const PREP_HUF = (n) => (Math.round(n || 0)).toLocaleString("hu-HU") + " Ft";
const PREP_HUFk = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : Math.round((n || 0) / 1000) + "k") + " Ft";

// Részleg-akcent → Tailwind (literál osztálynevek)
const DEPT_BAR = { teal: "bg-teal-500", sky: "bg-sky-500", violet: "bg-violet-500", amber: "bg-amber-500", rose: "bg-rose-500", stone: "bg-stone-500" };
const DEPT_SOFT = {
  teal: "bg-teal-50 text-teal-700", sky: "bg-sky-50 text-sky-700", violet: "bg-violet-50 text-violet-700",
  amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", stone: "bg-stone-100 text-stone-700",
};
const HS_PREP_TONE = {
  sent:     { l: "Kiadva — visszajelzésre vár", bg: "bg-sky-50",     fg: "text-sky-700",     dot: "bg-sky-500" },
  external: { l: "Külső partner (kézi)",         bg: "bg-stone-100",  fg: "text-stone-600",   dot: "bg-stone-400" },
  accepted: { l: "Elfogadva — folyamatban",      bg: "bg-indigo-50",  fg: "text-indigo-700",  dot: "bg-indigo-500" },
  declined: { l: "Visszautasítva",               bg: "bg-rose-50",    fg: "text-rose-700",    dot: "bg-rose-500" },
  done:     { l: "Kész — ellenőrzésre",          bg: "bg-emerald-50", fg: "text-emerald-700", dot: "bg-emerald-500" },
};

// ════════════════════════════════════════════════════════════════════════════
//  LISTA — előkészítésre váró projektek + kiadott rendelések
// ════════════════════════════════════════════════════════════════════════════
function MfgPrepPage() {
  const s = useSim();
  const [open, setOpen] = useStatePrep(null); // { kind:"project"|"order", id }

  const projects = (s.projects || []).filter((p) => p.kind === "manufacturing");
  const orders = (s.orders || []).filter((o) => o.status === "released");

  const openProject = open && open.kind === "project" ? projects.find((p) => p.id === open.id) : null;
  const openOrder = open && open.kind === "order" ? orders.find((o) => o.id === open.id) : null;
  const pseudo = openOrder ? orderToPseudo(openOrder) : null;

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <div className="text-[18px] md:text-[20px] font-semibold text-stone-900 tracking-tight">Gyártás-előkészítés</div>
          <div className="text-[12px] text-stone-500">A megrendelt tételekből levezetett anyag-, szabászat-, vasalat- és munkaidő-szükséglet — bérmunka-kiadással.</div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-teal-50 text-teal-700 text-[12px] font-medium">
          <Icon name="cpu" size={13} />{projects.length} projekt
        </span>
      </div>

      {/* Gyártási projektek */}
      <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2">Gyártási projektek</div>
      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center mb-6">
          <div className="w-11 h-11 mx-auto rounded-xl bg-teal-50 grid place-items-center text-teal-600 mb-2"><Icon name="factory" size={20} /></div>
          <div className="text-[13.5px] font-semibold text-stone-700">Még nincs gyártási alprojekt</div>
          <div className="text-[12px] text-stone-500 mt-1 max-w-md mx-auto">Egy megrendelt projekt nézetéből a „Saját gyártás alprojekt" gombbal hozhatsz létre egyet — utána itt készíthető elő a gyártás.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          {projects.map((p) => <PrepListCard key={p.id} project={p} onOpen={() => setOpen({ kind: "project", id: p.id })} />)}
        </div>
      )}

      {/* Kiadott rendelések */}
      {orders.length > 0 && (
        <>
          <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2">Kiadott rendelések</div>
          <div className="grid md:grid-cols-2 gap-3">
            {orders.map((o) => <PrepOrderCard key={o.id} order={o} onOpen={() => setOpen({ kind: "order", id: o.id })} />)}
          </div>
        </>
      )}

      {openProject && <MfgPrepWorkspace project={openProject} onClose={() => setOpen(null)} />}
      {pseudo && <MfgPrepWorkspace project={pseudo} isOrder onClose={() => setOpen(null)} />}
    </div>
  );
}

function ppInferElemCat(text) {
  const t = (text || "").toLowerCase();
  if (/ajt[óo]|door|front/.test(t)) return "Ajtó / front";
  if (/pult|munkalap/.test(t)) return "Pult / munkalap";
  if (/falpanel|burkolat|panel/.test(t)) return "Falpanel / burkolat";
  return null; // → szekrény default (lapanyag)
}
function orderToPseudo(o) {
  const items = (o.lines && o.lines.length)
    ? o.lines.map((l, i) => ({ id: o.id + "-i" + i, name: l.name || l.description || ("Tétel " + (i + 1)), value: (l.price || l.unitPrice || 0) * (l.qty || l.quantity || 1), elemCategory: ppInferElemCat((l.name || l.description || "") + " " + (o.customer || "")), config: l.config || null }))
    : [{ id: o.id + "-i0", name: (o.customer || "Rendelés") + " — tételei", value: o.total || 0, elemCategory: ppInferElemCat((o.customer || "") + " " + (o.type || "")) }];
  return { id: o.id, name: (o.customer || "Rendelés") + " — " + o.id, customer: o.customer, items, milestones: [], _order: true };
}

function PrepListCard({ project: p, onOpen }) {
  const total = (p.items || []).reduce((n, i) => n + (i.value || 0), 0);
  const prep = p.prep && p.prep.generated;
  const released = p.prepRelease;
  const tone = released ? { bg: "bg-emerald-50", fg: "text-emerald-700", dot: "bg-emerald-500", l: "Kiadva a műhelynek" }
    : prep ? window.MFG_PREP_TONE.generated : window.MFG_PREP_TONE.pending;
  return (
    <button onClick={onOpen} className="text-left bg-white rounded-2xl border border-stone-200 p-4 hover:shadow-md hover:border-teal-300 transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-stone-900 leading-tight truncate">{p.name}</div>
          <div className="text-[11.5px] text-stone-500 mt-0.5 truncate">{p.customer}{p.parentName ? " · " + p.parentName : ""}</div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${tone.bg} ${tone.fg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{tone.l}
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11.5px]">
        <span className="text-stone-500">{(p.items || []).length} tétel</span>
        {prep ? (
          <span className="inline-flex items-center gap-2 text-stone-600">
            <span className="tabular-nums">{p.prep.sheets || 0} tábla</span><span className="text-stone-300">·</span>
            <span className="tabular-nums">~{p.prep.leadDays || 0} nap</span>
          </span>
        ) : <span className="font-semibold text-stone-800 tabular-nums">{PREP_HUFk(total)}</span>}
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-teal-700">
        <Icon name="cpu" size={14} />{released ? "Kiadás megnyitása" : prep ? "Előkészítés megnyitása" : "Előkészítés"}
        <Icon name="chevron" size={13} />
      </div>
    </button>
  );
}

function PrepOrderCard({ order: o, onOpen }) {
  return (
    <button onClick={onOpen} className="text-left bg-white rounded-2xl border border-stone-200 p-4 hover:shadow-md hover:border-teal-300 transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-stone-900 leading-tight truncate font-mono">{o.id}</div>
          <div className="text-[11.5px] text-stone-500 mt-0.5 truncate">{o.customer}</div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium bg-teal-50 text-teal-700">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />Gyártásban
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11.5px]">
        <span className="text-stone-500">{o.items || (o.lines ? o.lines.length : 1)} tétel</span>
        {o.prepRelease
          ? <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Kiadva ({o.prepRelease.count}) <Icon name="chevron" size={13} /></span>
          : <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-teal-700">Előkészítés <Icon name="chevron" size={13} /></span>}
      </div>
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  MUNKALAP — teljes képernyős előkészítő
// ════════════════════════════════════════════════════════════════════════════
function MfgPrepWorkspace({ project, isOrder, onClose }) {
  const s = useSim();
  // live projekt (kézfogás/epik frissülhet)
  const live = isOrder ? project : ((s.projects || []).find((p) => p.id === project.id) || project);
  const [tab, setTab] = useStatePrep("routing");
  const [plan, setPlan] = useStatePrep(null);
  const prep = React.useMemo(() => window.MfgPrep.derive(live), [live, s]);
  const generated = !isOrder && live.prep && live.prep.generated;
  const liveOrder = isOrder ? ((s.orders || []).find((o) => o.id === project.id) || null) : null;
  const released = (isOrder ? (liveOrder && liveOrder.prepRelease) : live.prepRelease) || null;
  const source = isOrder
    ? { kind: "order", id: live.id, name: live.name, customer: live.customer, owner: null, orderRef: live.id, docLink: { type: "order", id: live.id } }
    : { kind: "project", id: live.id, name: live.name, customer: live.customer, owner: live.owner || live.projectOwner || null, orderRef: live.orderRef || live.id, docLink: { type: "project", id: live.id } };

  // útvonal-terv + alapértelmezett dokumentumok (kiadott rajzok) — csak az id váltásakor
  React.useEffect(() => {
    const steps = (window.MfgPrep.routingPlan && window.MfgPrep.routingPlan(live)) || [];
    const link = isOrder ? { type: "order", id: live.id } : { type: "project", id: live.id };
    const docs = (s.docsFor ? s.docsFor(link.type, link.id) : []).filter((d) => d.type === "rajz");
    const dids = docs.filter((d) => { const r = window.DocsEngine && window.DocsEngine.runtimeVersion(d); return r && r.clear; }).map((d) => d.id);
    // baseSeq/baseMachineId = a technológiai ALAP-sorrend és -gép pillanatképe —
    // ehhez képest naplózódik a folyamat-eltérés (átrendezés / alternatív gép)
    setPlan({ steps: steps.map((st, i) => ({ ...st, baseSeq: i + 1, baseMachineId: st.machineId })), docIds: dids, docNotes: {}, note: "", deviations: [] });
  }, [live.id]);

  if (!prep) return null;

  const tabs = [
    { key: "routing", label: "Útvonal", icon: "route" },
    { key: "flow", label: "Folyamatábra", icon: "workflow" },
    { key: "material", label: "Anyag", icon: "box" },
    { key: "cutting", label: "Szabászat", icon: "cut" },
    { key: "hardware", label: "Vasalat", icon: "bolt" },
    { key: "aux", label: "Segédanyag", icon: "drop" },
    { key: "labor", label: "Munkaidő", icon: "workflow" },
    { key: "calc", label: "Kalkuláció", icon: "receipt" },
    { key: "docs", label: "Dokumentum", icon: "folder" },
    { key: "outsource", label: "Bérmunka", icon: "external" },
    { key: "release", label: "Kiadás", icon: "check" },
  ];

  const chips = [
    { l: "Tétel", v: prep.items.length },
    { l: "Tábla", v: prep.totals.sheets },
    { l: "Alkatrész", v: prep.qty.parts },
    { l: "Munkaóra", v: prep.labor.totalHours },
    { l: "Átfutás", v: "~" + prep.totals.leadDays + " nap" },
    { l: "Becsült ktsg.", v: PREP_HUFk(prep.totals.grand) },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-stone-50 flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-stone-200">
        <div className="px-4 md:px-6 py-3 flex items-start gap-3 max-w-[1280px] mx-auto w-full">
          <button onClick={onClose} className="shrink-0 w-9 h-9 grid place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 mt-0.5">
            <Icon name="chevron" size={16} className="rotate-180" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[15px] md:text-[17px] font-semibold text-stone-900 leading-tight truncate">{live.name}</div>
              {isOrder && <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-medium">rendelés</span>}
              {released && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Kiadva a műhelynek</span>}
            </div>
            <div className="text-[12px] text-stone-500 mt-0.5">{live.customer}</div>
          </div>
          <button onClick={() => window.sim.generatePrep && !isOrder && window.sim.generatePrep(live.id)}
            disabled={isOrder}
            className={`shrink-0 h-9 px-3.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 ${isOrder ? "bg-stone-100 text-stone-400 cursor-not-allowed" : "bg-teal-600 text-white hover:bg-teal-700"}`}>
            <Icon name="cpu" size={14} />{generated ? "Újragenerálás" : "Generálás"}
          </button>
        </div>
        {/* summary chips */}
        <div className="px-4 md:px-6 pb-3 max-w-[1280px] mx-auto w-full">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {chips.map((c) => (
              <div key={c.l} className="bg-stone-50 border border-stone-200/70 rounded-lg px-2.5 py-1.5">
                <div className="text-[9.5px] uppercase tracking-wide text-stone-500">{c.l}</div>
                <div className="text-[14px] md:text-[15px] font-semibold tabular-nums text-stone-900 leading-tight">{c.v}</div>
              </div>
            ))}
          </div>
        </div>
        {/* tabs */}
        <div className="px-4 md:px-6 max-w-[1280px] mx-auto w-full">
          <div className="flex items-center gap-1 overflow-x-auto -mb-px">
            {tabs.map((tb) => {
              const on = tab === tb.key;
              return (
                <button key={tb.key} onClick={() => setTab(tb.key)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-10 text-[12.5px] font-medium border-b-2 transition ${on ? "border-teal-600 text-teal-700" : "border-transparent text-stone-500 hover:text-stone-700"}`}>
                  <Icon name={tb.icon} size={14} />{tb.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="px-4 md:px-6 py-4 md:py-5 max-w-[1280px] mx-auto w-full">
          {tab === "routing" && window.PrepRouting && <window.PrepRouting source={source} plan={plan} setPlan={setPlan} released={released} />}
          {tab === "flow" && window.PrepFlowMatrix && <window.PrepFlowMatrix project={live} />}
          {tab === "material" && <PrepMaterials prep={prep} />}
          {tab === "cutting" && <PrepCutting prep={prep} />}
          {tab === "hardware" && <PrepHardware prep={prep} />}
          {tab === "aux" && <PrepAux prep={prep} />}
          {tab === "labor" && <PrepLabor prep={prep} />}
          {tab === "calc" && <PrepCalc prep={prep} />}
          {tab === "docs" && window.PrepDocs && <window.PrepDocs source={source} plan={plan} setPlan={setPlan} released={released} />}
          {tab === "outsource" && <PrepOutsource project={live} prep={prep} isOrder={isOrder} />}
          {tab === "release" && window.PrepRelease && <window.PrepRelease source={source} plan={plan} setPlan={setPlan} project={live} released={released} />}
        </div>
      </div>
    </div>
  );
}

// ── Anyag ───────────────────────────────────────────────────────────────────
//   ANYAGTÍPUS-VEZÉRELT: lapanyag m²/tábla (10–15% hulladék) külön a tömörfától,
//   amely m³ + FAFAJ-FÜGGŐ hulladékszázalék (tölgy 150%, bükk 130%…) szerint
//   normázódik. (woodwork_domain.md §0/§4/§5)
function CoverPill({ cover }) {
  const cov = window.MFG_COVER_TONE[cover] || window.MFG_COVER_TONE.partial;
  return <span className={`inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${cov.bg} ${cov.fg}`}><span className={`w-1.5 h-1.5 rounded-full ${cov.dot}`} />{cov.l}</span>;
}

function PrepMaterials({ prep }) {
  const sheet = prep.materials.filter((m) => m.kind !== "solidwood");
  const solid = prep.materials.filter((m) => m.kind === "solidwood");
  const sheetCost = sheet.reduce((s, m) => s + m.cost, 0);
  const solidCost = solid.reduce((s, m) => s + m.cost, 0);

  return (
    <div className="space-y-5">
      <SectionHead icon="box" title="Anyagszükséglet — anyagtípus szerint"
        sub="Az alapanyag típusa vezérli a normát: a lapanyag m² → táblaszám (10–15% szabászati hulladék, 2800×2070 mm / 82% hasznosítás); a tömörfa m³ (terület × vastagság) + fafaj-függő hulladékszázalék (tölgy 150%, bükk 130%…) — a >100% normális, a bemenő fűrészáru több a nettónál." />

      {/* ── LAPANYAG ── */}
      {sheet.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-teal-50 text-teal-700 text-[11px] font-semibold"><Icon name="box" size={12} />Lapanyag</span>
            <span className="text-[11px] text-stone-400">m² → tábla · {window.WW_SHEET_WASTE_PCT}% hulladék</span>
          </div>
          {/* desktop */}
          <div className="hidden md:block bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_84px_70px_70px_84px_100px_104px] gap-3 px-4 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50">
              <div>Anyag</div><div className="text-right">Nettó</div><div className="text-right">Hull.%</div><div className="text-right">Tábla</div><div className="text-right">Készlet</div><div>Fedezet</div><div className="text-right">Érték</div>
            </div>
            {sheet.map((x) => (
              <div key={x.code} className="grid grid-cols-[minmax(0,1fr)_84px_70px_70px_84px_100px_104px] gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0 items-center text-[12.5px]">
                <div className="min-w-0"><div className="font-medium text-stone-900 truncate">{x.name}</div><div className="text-[10.5px] font-mono text-stone-400">{x.code}</div></div>
                <div className="text-right tabular-nums text-stone-700">{x.area} m²</div>
                <div className="text-right tabular-nums text-stone-400">+{x.wastePct}%</div>
                <div className="text-right tabular-nums font-semibold text-stone-900">{x.sheets}</div>
                <div className="text-right tabular-nums text-stone-500">{x.onHand == null ? "—" : x.onHand}</div>
                <div><CoverPill cover={x.cover} /></div>
                <div className="text-right tabular-nums text-stone-700">{PREP_HUF(x.cost)}</div>
              </div>
            ))}
          </div>
          {/* mobile */}
          <div className="md:hidden space-y-2">
            {sheet.map((x) => (
              <div key={x.code} className="bg-white rounded-xl border border-stone-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="text-[13px] font-medium text-stone-900 truncate">{x.name}</div><div className="text-[10.5px] font-mono text-stone-400">{x.code}</div></div>
                  <CoverPill cover={x.cover} />
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 text-[11.5px]">
                  <div><div className="text-stone-400 text-[10px]">Nettó</div><div className="tabular-nums text-stone-700">{x.area} m²</div></div>
                  <div><div className="text-stone-400 text-[10px]">Hull.%</div><div className="tabular-nums text-stone-500">+{x.wastePct}%</div></div>
                  <div><div className="text-stone-400 text-[10px]">Tábla</div><div className="tabular-nums font-semibold text-stone-900">{x.sheets}</div></div>
                  <div><div className="text-stone-400 text-[10px]">Készlet</div><div className="tabular-nums text-stone-500">{x.onHand == null ? "—" : x.onHand}</div></div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between bg-teal-50/60 border border-teal-200/60 rounded-xl px-4 py-2.5">
            <div className="text-[12px] text-teal-800 font-medium">Összes lapanyag</div>
            <div className="flex items-center gap-4 text-[13px]">
              <span className="tabular-nums text-teal-800"><span className="font-semibold">{prep.totals.sheets}</span> tábla</span>
              <span className="tabular-nums font-semibold text-teal-900">{PREP_HUF(sheetCost)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TÖMÖRFA ── */}
      {solid.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold"><Icon name="layers" size={12} />Tömörfa</span>
            <span className="text-[11px] text-stone-400">m³ (térfogat) · fafaj-függő hulladékszázalék</span>
          </div>
          {/* desktop */}
          <div className="hidden md:block bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_104px_80px_84px_94px_94px_100px] gap-3 px-4 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50">
              <div>Anyag / fafaj</div><div className="text-right">Nettó m³</div><div className="text-right">Hull.%</div><div className="text-right">Bruttó m³</div><div className="text-right">Vastagság</div><div>Fedezet</div><div className="text-right">Érték</div>
            </div>
            {solid.map((x) => (
              <div key={x.code} className="grid grid-cols-[minmax(0,1fr)_104px_80px_84px_94px_94px_100px] gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0 items-center text-[12.5px]">
                <div className="min-w-0"><div className="font-medium text-stone-900 truncate">{x.name}</div><div className="text-[10.5px] text-amber-600">{x.species}</div></div>
                <div className="text-right tabular-nums text-stone-700">{x.netM3}</div>
                <div className="text-right tabular-nums text-amber-600 font-medium">+{x.wastePct}%</div>
                <div className="text-right tabular-nums font-semibold text-stone-900">{x.grossM3}</div>
                <div className="text-right tabular-nums text-stone-500">{x.thickness} mm</div>
                <div><CoverPill cover={x.cover} /></div>
                <div className="text-right tabular-nums text-stone-700">{PREP_HUF(x.cost)}</div>
              </div>
            ))}
          </div>
          {/* mobile */}
          <div className="md:hidden space-y-2">
            {solid.map((x) => (
              <div key={x.code} className="bg-white rounded-xl border border-stone-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="text-[13px] font-medium text-stone-900 truncate">{x.name}</div><div className="text-[10.5px] text-amber-600">{x.species} · {x.thickness} mm</div></div>
                  <CoverPill cover={x.cover} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11.5px]">
                  <div><div className="text-stone-400 text-[10px]">Nettó m³</div><div className="tabular-nums text-stone-700">{x.netM3}</div></div>
                  <div><div className="text-stone-400 text-[10px]">Hull.%</div><div className="tabular-nums text-amber-600">+{x.wastePct}%</div></div>
                  <div><div className="text-stone-400 text-[10px]">Bruttó m³</div><div className="tabular-nums font-semibold text-stone-900">{x.grossM3}</div></div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/60 rounded-xl px-4 py-2.5">
            <div className="text-[12px] text-amber-800 font-medium">Összes tömörfa (fűrészáru)</div>
            <div className="flex items-center gap-4 text-[13px]">
              <span className="tabular-nums text-amber-800"><span className="font-semibold">{prep.totals.volumeM3}</span> m³</span>
              <span className="tabular-nums font-semibold text-amber-900">{PREP_HUF(solidCost)}</span>
            </div>
          </div>
        </div>
      )}

      {sheet.length === 0 && solid.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-[12.5px] text-stone-500">Nincs levezethető anyagszükséglet ezen a munkán.</div>
      )}
    </div>
  );
}

// ── Segédanyag (woodwork_domain.md §6 — ragasztó / felület / csiszoló) ────────
function PrepAux({ prep }) {
  const aux = prep.aux || { glues: [], finishes: [], abrasive: null };
  const fmtG = (g) => g >= 1000 ? (g / 1000).toFixed(2) + " kg" : g + " g";
  const AuxRow = ({ a }) => (
    <div className="grid grid-cols-[minmax(0,1fr)_92px_70px_84px] gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0 items-center text-[12.5px]">
      <div className="min-w-0"><div className="font-medium text-stone-900 truncate">{a.name}</div><div className="text-[10.5px] text-stone-400 truncate">{a.basis || a.note}</div></div>
      <div className="text-right tabular-nums text-stone-600">{a.rate} g/m²</div>
      <div className="text-right tabular-nums text-stone-400">+{a.lossPct}%</div>
      <div className="text-right tabular-nums font-semibold text-stone-900">{fmtG(a.totalG)}</div>
    </div>
  );
  const Block = ({ title, icon, tone, rows, total }) => rows.length > 0 && (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-semibold ${tone}`}><Icon name={icon} size={12} />{title}</span>
      </div>
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_92px_70px_84px] gap-3 px-4 py-2 text-[10px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50">
          <div>Segédanyag / alap</div><div className="text-right">Fajlagos</div><div className="text-right">Veszt.</div><div className="text-right">Összes</div>
        </div>
        {rows.map((a, i) => <AuxRow key={i} a={a} />)}
        {total != null && (
          <div className="flex items-center justify-between px-4 py-2 bg-stone-50/50 text-[12px]">
            <span className="text-stone-500">Összesen</span>
            <span className="tabular-nums font-semibold text-stone-900">{fmtG(total)}</span>
          </div>
        )}
      </div>
    </div>
  );

  const empty = aux.glues.length === 0 && aux.finishes.length === 0 && !aux.abrasive;

  return (
    <div className="space-y-5">
      <SectionHead icon="drop" title="Segédanyagnorma — ragasztó / felület / csiszoló"
        sub="A kezelendő / ragasztandó felület × fajlagos felhordás (g/m²) + 10% veszteség. A felületkezelő 2. rétege kisebb felhordású (kevesebb anyag tapad meg); a tömörfa felülete két oldalon kezelt. A laminált lapanyag felülete kész — nem kap felületkezelőt." />

      <Block title="Ragasztó" icon="layers" tone="bg-sky-50 text-sky-700" rows={aux.glues} total={aux.glues.length ? aux.totalGlueG : null} />
      <Block title="Felületkezelő" icon="drop" tone="bg-lime-50 text-lime-700" rows={aux.finishes} total={aux.finishes.length ? aux.totalFinishG : null} />

      {aux.abrasive && (
        <div className="space-y-2">
          <div className="flex items-center gap-2"><span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-stone-100 text-stone-700 text-[11px] font-semibold"><Icon name="sparkle" size={12} />Csiszolóanyag</span></div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="text-[11.5px] text-stone-500 mb-2">{aux.abrasive.note}</div>
            <div className="flex flex-wrap gap-2">
              {(aux.abrasive.grits || []).map((g) => <span key={g} className="inline-flex items-center h-7 px-3 rounded-lg bg-stone-100 text-stone-700 text-[12px] font-mono font-medium">{g}</span>)}
            </div>
          </div>
        </div>
      )}

      {empty ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-[12.5px] text-stone-500">
          Nincs levezethető segédanyag — nincs élzárás, táblásítás vagy felületkezelt (tömörfa) felület ezen a munkán.
        </div>
      ) : (
        <div className="flex items-start gap-2.5 bg-stone-50 border border-stone-200/70 rounded-xl px-4 py-3 text-[11.5px] text-stone-600">
          <Icon name="route" size={15} className="mt-0.5 shrink-0 text-stone-400" />
          <div>A szerkezeti kötőelem-ragasztás (köldökcsap, dominó) a <span className="font-medium">Vasalat / szerelvény</span> tételeknél jelenik meg. Ez a kimutatás a felület-alapú segédanyagot (élzáró, táblásító, felületkezelő, csiszoló) normázza — a faipari dokumentáció 5. része.</div>
        </div>
      )}
    </div>
  );
}

// ── Szabászat ─────────────────────────────────────────────────────────────────
// Üzemi beállítás-presetek — localStorage (projektfüggetlen, behívható másik munkán).
const PREP_PRESET_LS = "jt_prep_presets";
function prepLoadPresets() { try { return JSON.parse(localStorage.getItem(PREP_PRESET_LS) || "[]"); } catch (e) { return []; } }
function prepSavePresets(list) { try { localStorage.setItem(PREP_PRESET_LS, JSON.stringify(list)); } catch (e) {} }

const CUT_MARK_TONE = {
  amber: "bg-amber-50 text-amber-700", violet: "bg-violet-50 text-violet-700",
  teal: "bg-teal-50 text-teal-700", stone: "bg-stone-100 text-stone-600", sky: "bg-sky-50 text-sky-700",
  rose: "bg-rose-50 text-rose-700",
};
function PrepCutting({ prep }) {
  const A = window.WW_CUT_ALLOW || {};
  const stations = window.PROD_STATIONS || [];
  const sawMachines = window.wwMachinesByKind ? window.wwMachinesByKind("szabaszat") : stations.filter((s) => s.kind === "szabaszat");
  const edgeMachines = window.wwMachinesByKind ? window.wwMachinesByKind("elzaras") : stations.filter((s) => s.kind === "elzaras");
  const [mode, setMode] = useStatePrep("nesting");
  const [miterAllow, setMiterAllow] = useStatePrep(A.miterPerCut != null ? A.miterPerCut : 5);
  const [sawId, setSawId] = useStatePrep(sawMachines[0] ? sawMachines[0].id : "");
  const [edgeId, setEdgeId] = useStatePrep(edgeMachines[0] ? edgeMachines[0].id : "");
  const [presets, setPresets] = useStatePrep(() => prepLoadPresets());
  const sawLim = window.wwMachineLimit ? window.wwMachineLimit(sawId) : {};
  const edgeLim = window.wwMachineLimit ? window.wwMachineLimit(edgeId) : {};
  const edgeMin = edgeLim.minPartW != null ? edgeLim.minPartW : (A.edgeMinW || 60);
  const cut = prep.cutlist;
  const rows = cut.map((p) => {
    // a gér/szög az alkatrész MŰSZAKI SPECIFIKÁCIÓJÁBÓL jön (part.miterShort/Long);
    // az előkészítés a ráhagyás mértékét + a gép-választást (min/max) állítja
    const miter = { miterShort: p.miterShort || 0, miterLong: p.miterLong || 0, miterPerCut: miterAllow };
    return { ...p, cs: window.wwCutSize ? window.wwCutSize(p, { mode, edgeMinW: edgeMin, maxW: sawLim.maxW, maxH: sawLim.maxH, ...miter }) : null };
  });
  const vvGroups = window.wwVVGroups ? window.wwVVGroups(cut, { edgeMinW: edgeMin }) : [];
  const overCount = rows.filter((r) => r.cs && r.cs.marks.some((m) => m.key === "MÉRET!")).length;
  const applyPreset = (p) => { if (!p) return; const d = p.data || p; if (d.mode) setMode(d.mode); if (d.miterAllow != null) setMiterAllow(d.miterAllow); if (d.sawId) setSawId(d.sawId); if (d.edgeId) setEdgeId(d.edgeId); window.toast && window.toast(`✓ Beállítás betöltve: ${p.name}`, "success"); };
  const saveNewPreset = () => { const name = (prompt("Üzemi beállítás neve:") || "").trim(); if (!name) return; const np = { id: "pp-" + Date.now().toString(36), name, data: { mode, miterAllow, sawId, edgeId } }; const list = [...presets, np]; setPresets(list); prepSavePresets(list); window.toast && window.toast(`✓ Mentve: ${name}`, "success"); };
  const deletePreset = (id) => { const list = presets.filter((x) => x.id !== id); setPresets(list); prepSavePresets(list); };
  // domináns anyag a nesting-előnézethez
  const byMat = {};
  cut.forEach((p) => { byMat[p.code] = byMat[p.code] || []; byMat[p.code].push(p); });
  const domCode = prep.materials[0] ? prep.materials[0].code : Object.keys(byMat)[0];
  const domParts = byMat[domCode] || [];
  const domMat = prep.materials.find((m) => m.code === domCode);

  const MarkChips = ({ marks }) => (
    <div className="flex flex-wrap gap-1 justify-end">
      {marks.map((m) => <span key={m.key} className={`inline-flex items-center h-5 px-1.5 rounded text-[9.5px] font-semibold ${CUT_MARK_TONE[m.tone] || CUT_MARK_TONE.stone}`}>{m.key}</span>)}
    </div>
  );

  return (
    <div className="space-y-4">
      <SectionHead icon="cut" title="Szabászat — szabásjegyzék (ráhagyásokkal)"
        sub="A szabásméret = készméret + ráhagyások: élzáró-marófej kompenzáció (+0,5/élzárt él), külön CNC-nél kontúr-ráhagyás (+1–2 körben; nesting = 0). Keskeny élzárt alkatrész → visszavágás (VV). Jelölések: VV, CNC, NEST, gérvágás (GV), duplázás (DUP)." />

      {/* ÜZEMI BEÁLLÍTÁSOK — gép-paraméterek (min/max) + menthető presetek */}
      <div className="bg-white rounded-xl border border-stone-200 p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium">Üzemi beállítások</div>
          <div className="flex items-center gap-1.5">
            <select value="" onChange={(e) => { const p = presets.find((x) => x.id === e.target.value); applyPreset(p); }}
              className="h-8 px-2 rounded-lg border border-stone-200 text-[12px] text-stone-600 bg-white max-w-[180px]">
              <option value="">Beállítás behívása…</option>
              {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={saveNewPreset} className="h-8 px-2.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium inline-flex items-center gap-1 hover:bg-stone-800"><Icon name="check" size={12} />Mentés</button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <div>
            <div className="text-[10.5px] text-stone-400 mb-1">Szabászat módja</div>
            <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-50">
              {[["nesting", "CNC maró"], ["cnc", "Körfűrész / külön CNC"]].map(([k, l]) => (
                <button key={k} onClick={() => setMode(k)} className={`h-8 px-3 rounded-md text-[12px] font-medium transition ${mode === k ? "bg-teal-600 text-white shadow-sm" : "text-stone-600 hover:text-stone-900"}`}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] text-stone-400 mb-1">Szabászgép</div>
            <select value={sawId} onChange={(e) => setSawId(e.target.value)} className="h-8 px-2 rounded-lg border border-stone-200 text-[12px] text-stone-700 bg-white">
              {sawMachines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div className="text-[10px] text-stone-400 mt-0.5 tabular-nums">max {sawLim.maxW || "—"}×{sawLim.maxH || "—"} mm</div>
          </div>
          <div>
            <div className="text-[10.5px] text-stone-400 mb-1">Élzáró</div>
            <select value={edgeId} onChange={(e) => setEdgeId(e.target.value)} className="h-8 px-2 rounded-lg border border-stone-200 text-[12px] text-stone-700 bg-white">
              {edgeMachines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div className="text-[10px] text-stone-400 mt-0.5 tabular-nums">min szél. {edgeMin} mm → VV</div>
          </div>
          <div>
            <div className="text-[10.5px] text-stone-400 mb-1">Gér-/szög-ráhagyás</div>
            <div className="inline-flex items-center gap-1.5">
              <input type="number" min="0" step="0.5" value={miterAllow} onChange={(e) => setMiterAllow(Math.max(0, Number(e.target.value) || 0))}
                className="w-16 h-8 px-2 rounded-lg border border-stone-200 text-[12px] text-right tabular-nums outline-none focus:border-teal-400" />
              <span className="text-stone-400 text-[11px]">mm/vágás</span>
            </div>
          </div>
        </div>

        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {presets.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1 h-6 pl-2.5 pr-1 rounded-full bg-stone-100 text-[11px] text-stone-600">
                <button onClick={() => applyPreset(p)} className="hover:text-stone-900 font-medium">{p.name}</button>
                <button onClick={() => deletePreset(p.id)} title="Törlés" className="w-4 h-4 grid place-items-center rounded-full hover:bg-stone-200 text-stone-400"><Icon name="x" size={10} /></button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 text-[11px] text-stone-400 pt-2 border-t border-stone-100">
          <Icon name="info" size={13} className="shrink-0 mt-px text-stone-300" />
          <span className="leading-snug">A gérelt / szögbe vágott él a <span className="font-medium text-stone-500">műszaki tervezésből</span> érkezik; a gép <span className="font-medium text-stone-500">min./max. mérete</span> a <span className="font-medium text-stone-500">Karbantartás → eszköz</span> törzsből jön (beszerzéskor/tapasztalatból rögzített, gép-szintű — nem munkánként változik). Itt az <span className="font-medium text-stone-500">üzemi ráhagyás</span> és a <span className="font-medium text-stone-500">gép-választás</span> állítható; a beállítás <span className="font-medium text-stone-500">menthető és behívható</span>. {mode === "nesting" ? "CNC maró: szabad forma + szabad csoportosítás, nincs CNC-kontúr ráhagyás." : `Körfűrész / külön CNC: +${A.cncContour} mm kontúr-ráhagyás körben.`}</span>
        </div>
      </div>

      {overCount > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-2.5 text-[12px] text-amber-800 -mt-1">
          <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
          <div><span className="font-medium">{overCount} alkatrész nem fér a szabászgépre</span> ({sawLim.maxW}×{sawLim.maxH} mm) — bontás, másik gép vagy külső lapszabász kell. Jelölés: <span className="font-mono font-semibold">MÉRET!</span></div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-4">
        {/* szabásjegyzék */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_94px_104px_56px_96px] gap-2 px-4 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50">
              <div>Alkatrész</div><div className="text-right">Készméret</div><div className="text-right">Szabásméret</div><div className="text-right">Db</div><div className="text-right">Jelölés</div>
            </div>
            <div className="max-h-[58vh] overflow-auto">
              {rows.map((p, i) => {
                const cs = p.cs;
                const grew = cs && (cs.addW > 0 || cs.addH > 0);
                const tip = cs ? cs.adds.map((a) => `${a.label}${a.detail ? " (" + a.detail + ")" : ""}: +${a.w}×${a.h} mm`).join("\n") : "";
                return (
                  <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_94px_104px_56px_96px] gap-2 px-4 py-2 border-b border-stone-100 last:border-0 items-center text-[12px]">
                    <div className="min-w-0"><div className="font-medium text-stone-800 truncate">{p.name}</div><div className="text-[10px] text-stone-400 truncate">{p.itemName} · <span className="font-mono">{p.code}</span></div></div>
                    <div className="hidden md:block text-right tabular-nums text-stone-500">{p.w}×{p.h}</div>
                    <div className="text-right tabular-nums font-semibold text-stone-900" title={tip}>
                      {cs ? `${cs.cutW}×${cs.cutH}` : `${p.w}×${p.h}`}
                      {grew && <span className="block text-[9.5px] font-normal text-teal-600">+{cs.addW}×{cs.addH}</span>}
                    </div>
                    <div className="hidden md:block text-right tabular-nums font-semibold text-stone-900">{p.qty}</div>
                    <div className="hidden md:block">{cs && cs.marks.length > 0 && <MarkChips marks={cs.marks} />}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-stone-200 bg-stone-50/50 text-[12px]">
              <span className="text-stone-600">{prep.qty.parts} alkatrész · {cut.length} sor</span>
              <span className="text-stone-600 tabular-nums">Élzárás: <span className="font-semibold text-stone-900">{prep.qty.edgeM} fm</span></span>
            </div>
          </div>

          {/* VV — visszavágandó keskeny alkatrészek, konkrét csíkokba rakva */}
          {vvGroups.length > 0 && (
            <div className="mt-3 bg-sky-50/60 border border-sky-200/70 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center h-5 px-1.5 rounded text-[9.5px] font-semibold bg-sky-100 text-sky-700">VV</span>
                <div className="text-[12px] font-semibold text-sky-900">Visszavágás — {vvGroups.length} csík ({vvGroups.reduce((s, g) => s + g.count, 0)} alkatrész)</div>
              </div>
              <div className="text-[11px] text-sky-800/80 leading-snug mb-2">Az élzáró min. szélessége ~{A.edgeMinW} mm. A keskeny élzárt alkatrészeket azonos hossz szerint 100–150 mm-re összerakják (Σ szélesség + {A.sawKerf} mm kerf), egyben élzárják, majd visszavágják. Etikett: <span className="font-mono">VV:&lt;méretek&gt;</span>.</div>
              <div className="space-y-1.5">
                {vvGroups.map((g, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-white border border-sky-200 rounded-lg px-3 py-2">
                    <div className="shrink-0 text-[13px] font-semibold text-sky-800 tabular-nums w-8 text-center">{g.count}×</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11.5px] font-mono text-sky-900 truncate">{g.label}</div>
                      <div className="text-[10px] text-sky-700/70">{g.length} mm hosszú csík · összerakott szélesség {g.combinedWidth} mm</div>
                    </div>
                    <span className={`shrink-0 text-[9.5px] px-1.5 h-5 inline-flex items-center rounded font-semibold ${g.stable ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>{g.stable ? "stabil" : "kiegészítendő"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* nesting preview + tábla-szintű formázó vágás */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12.5px] font-semibold text-stone-900">Nesting-előnézet</div>
              <span className="text-[10.5px] text-stone-500 font-mono">{domMat ? domMat.sheets : 1} tábla</span>
            </div>
            <div className="text-[11px] text-stone-500 mb-3 truncate">{domMat ? domMat.name : domCode}</div>
            <NestingPreview parts={domParts} />
          </div>
          <div className="bg-stone-50 border border-stone-200/70 rounded-xl px-4 py-3 text-[11.5px] text-stone-600">
            <div className="flex items-center gap-1.5 font-medium text-stone-700 mb-1"><Icon name="cut" size={13} className="text-stone-400" />Formázó vágás (tábla-szintű)</div>
            Minden táblán 1–4 élből {A.boardTrim - 5}–{A.boardTrim + 5} mm-t levágnak (derékszög, tiszta él). Mintás anyagnál (szállfutás) az elemeket a minta szerint helyezik el — ilyenkor nem az optimalizálás dönt, a kihozatal nem cél.
          </div>
        </div>
      </div>
    </div>
  );
}

// Egyszerű polc-pakolás (shelf packing) a vágólistából — a meglévő nesting stílusban
function NestingPreview({ parts }) {
  const sheet = window.MFG_SHEET;
  const SCALE = 0.135;
  const W = sheet.w * SCALE, H = sheet.h * SCALE;
  const fills = ["#ccfbf1", "#99f6e4", "#5eead4", "#2dd4bf"];
  // bővített rect-lista (darabszám szerint), terület szerint csökkenő, cap 60
  const rects = [];
  parts.forEach((p, pi) => { for (let k = 0; k < p.qty && rects.length < 60; k++) rects.push({ w: p.w, h: p.h, label: p.name, pi }); });
  rects.sort((a, b) => (b.w * b.h) - (a.w * a.h));
  // shelf packing a táblán (mm), kerf rés
  const kerf = sheet.kerf + 4;
  const placed = [];
  let shelfY = 0, shelfH = 0, x = 0, leftover = 0;
  rects.forEach((r) => {
    let w = r.w, h = r.h;
    if (w > sheet.w) { [w, h] = [h, w]; } // forgatás ha kell
    if (w > sheet.w) { leftover++; return; }
    if (x + w > sheet.w) { shelfY += shelfH + kerf; x = 0; shelfH = 0; }
    if (shelfY + h > sheet.h) { leftover++; return; }
    placed.push({ x, y: shelfY, w, h, label: r.label, pi: r.pi });
    x += w + kerf; shelfH = Math.max(shelfH, h);
  });
  return (
    <div>
      <svg viewBox={`0 0 ${W + 4} ${H + 18}`} style={{ width: "100%", height: "auto" }} className="block">
        <defs>
          <pattern id="prepGrain" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#fafaf9" /><path d="M0 3 Q3 1.5 6 3" stroke="#e7e5e4" strokeWidth=".5" fill="none" />
          </pattern>
        </defs>
        <g transform="translate(2,2)">
          <rect x="0" y="0" width={W} height={H} fill="url(#prepGrain)" stroke="#a8a29e" strokeWidth="1" />
          {placed.map((p, i) => (
            <g key={i}>
              <rect x={p.x * SCALE} y={p.y * SCALE} width={p.w * SCALE} height={p.h * SCALE}
                fill={fills[p.pi % fills.length]} fillOpacity="0.9" stroke="#0d9488" strokeWidth="0.6" />
              {p.w * SCALE > 26 && p.h * SCALE > 14 && (
                <text x={p.x * SCALE + p.w * SCALE / 2} y={p.y * SCALE + p.h * SCALE / 2 + 3} textAnchor="middle" fontSize="6.5" fill="#134e4a" fontFamily="ui-monospace,monospace">{p.w}×{p.h}</text>
              )}
            </g>
          ))}
          <text x={W / 2} y={H + 12} textAnchor="middle" fontSize="8" fill="#78716c" fontFamily="ui-monospace,monospace">{sheet.w} × {sheet.h} mm</text>
        </g>
      </svg>
      <div className="mt-2 flex items-center justify-between text-[10.5px] text-stone-500">
        <span>{placed.length} alkatrész az 1. táblán</span>
        {leftover > 0 && <span className="text-stone-400">+{leftover} a további táblá(ko)n</span>}
      </div>
    </div>
  );
}

// ── Vasalat ───────────────────────────────────────────────────────────────────
function PrepHardware({ prep }) {
  const hw = prep.hardware;
  return (
    <div className="space-y-4">
      <SectionHead icon="bolt" title="Vasalat-szükséglet" sub="A sablonok vasalat-listájából, a műszaki specifikáció márkája szerinti katalógus-árral." />
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_110px_70px_110px_120px] gap-3 px-4 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50">
          <div>Vasalat</div><div>Márka</div><div className="text-right">Db</div><div className="text-right">Egységár</div><div className="text-right">Érték</div>
        </div>
        {hw.map((h, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_110px_70px_110px_120px] gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0 items-center text-[12.5px]">
            <div className="font-medium text-stone-900 truncate">{h.name}</div>
            <div className="hidden md:block text-stone-600">{h.brand}</div>
            <div className="text-right tabular-nums font-semibold text-stone-900">{h.qty} <span className="text-stone-400 text-[10.5px] font-normal">{h.unit}</span></div>
            <div className="hidden md:block text-right tabular-nums text-stone-500">{PREP_HUF(h.unitPrice)}</div>
            <div className="text-right tabular-nums text-stone-700">{PREP_HUF(h.cost)}</div>
          </div>
        ))}
        {hw.length === 0 && <div className="px-4 py-8 text-center text-[12.5px] text-stone-400">Nincs vasalat-szükséglet a sablonokból.</div>}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-stone-200 bg-stone-50/50 text-[12.5px]">
          <span className="text-stone-600">{hw.reduce((s, h) => s + h.qty, 0)} db összesen</span>
          <span className="tabular-nums font-semibold text-stone-900">{PREP_HUF(prep.totals.hardwareCost)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Munkaidő ──────────────────────────────────────────────────────────────────
function PrepLabor({ prep }) {
  const rows = prep.labor.rows;
  const maxH = Math.max(1, ...rows.map((r) => r.hours));
  return (
    <div className="space-y-4">
      <SectionHead icon="workflow" title="Munkaidő részlegenként" sub="A szükséglet-mennyiségből a részlegek termelékenységi normája szerint (óra), és a nettó napi kapacitásból (kapacitás × hatékonyság) számolt átfutás." />
      <div className="space-y-2">
        {rows.map((r) => {
          const soft = DEPT_SOFT[r.color] || DEPT_SOFT.stone;
          const bar = DEPT_BAR[r.color] || DEPT_BAR.stone;
          return (
            <div key={r.id} className="bg-white rounded-xl border border-stone-200 p-3.5">
              <div className="flex items-center gap-3">
                <div className={`shrink-0 w-9 h-9 rounded-lg grid place-items-center ${soft}`}><Icon name={r.icon} size={16} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13.5px] font-semibold text-stone-900">{r.name}</div>
                    <div className="text-[13px] tabular-nums font-semibold text-stone-900">{r.hours} ó <span className="text-stone-400 font-normal">· ~{Math.max(1, Math.ceil(r.days))} nap</span></div>
                  </div>
                  <div className="text-[10.5px] text-stone-400 truncate">{(r.machines || []).join(" · ")}</div>
                </div>
              </div>
              <div className="mt-2.5 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div className={`h-full rounded-full ${bar}`} style={{ width: (r.hours / maxH * 100) + "%" }} />
              </div>
              <div className="mt-2 flex items-center gap-3 text-[10.5px] text-stone-500 flex-wrap">
                <span>Kapacitás {r.capH} ó/nap</span><span className="text-stone-300">·</span>
                <span>Hatékonyság {Math.round(r.eff * 100)}%</span><span className="text-stone-300">·</span>
                <span className="tabular-nums">Munkadíj {PREP_HUF(r.cost)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "Összes munkaóra", v: prep.labor.totalHours + " ó" },
          { l: "Becsült átfutás", v: "~" + prep.totals.leadDays + " nap" },
          { l: "Munkadíj", v: PREP_HUFk(prep.totals.laborCost) },
        ].map((c) => (
          <div key={c.l} className="bg-teal-50/60 border border-teal-200/60 rounded-xl px-3 py-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wide text-teal-700">{c.l}</div>
            <div className="text-[15px] font-semibold tabular-nums text-teal-900 mt-0.5">{c.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Árkalkuláció — kétszintű (woodwork_domain.md §10) ─────────────────────────
function PrepCalc({ prep }) {
  const [params, setParams] = useStatePrep(() => ({ ...(window.WW_PRICE_PARAMS || {}) }));
  const calc = window.MfgPrep.priceCalc(prep, params);
  if (!calc) return null;
  const s = calc.simple, f = calc.full;
  const setP = (k, v) => setParams((p) => ({ ...p, [k]: v }));
  const Num = ({ k, label, suffix }) => (
    <label className="flex items-center justify-between gap-2 text-[11.5px]">
      <span className="text-stone-600 truncate">{label}</span>
      <span className="inline-flex items-center gap-1 shrink-0">
        <input type="number" value={params[k]} onChange={(e) => setP(k, Number(e.target.value) || 0)}
          className="w-20 h-8 px-2 rounded-lg border border-stone-200 text-[12px] text-right tabular-nums outline-none focus:border-teal-400" />
        <span className="text-stone-400 w-5 text-[10.5px]">{suffix}</span>
      </span>
    </label>
  );
  const Row = ({ l, v, strong, accent }) => (
    <div className={`flex items-center justify-between px-4 py-1.5 text-[12.5px] ${strong ? "bg-stone-50/40" : ""}`}>
      <span className={strong ? "font-semibold text-stone-900" : "text-stone-600"}>{l}</span>
      <span className={`tabular-nums ${accent ? "font-bold text-teal-700" : strong ? "font-semibold text-stone-900" : "text-stone-800"}`}>{PREP_HUF(v)}</span>
    </div>
  );
  return (
    <div className="space-y-4">
      <SectionHead icon="receipt" title="Árkalkuláció — kétszintű"
        sub="Egyszerűsített (bruttó, tanuló) és összetett (vállalkozói, nettó → áfás) kalkuláció a levezetett anyag- és munkaidő-szükségletből. A %-ok (járulék, rezsi, nyereség, áfa) jogszabály-/üzletfüggők — szerkeszthetők, nincsenek bedrótozva." />

      {/* paraméterek */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-3">Paraméterek</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2.5">
          <Num k="laborRate" label="Nettó órabér" suffix="Ft" />
          <Num k="shiftRate" label="Bruttó óradíj (bér+rezsi)" suffix="Ft" />
          <Num k="machineRate" label="Gép-óradíj" suffix="Ft" />
          <Num k="otherCost" label="Egyéb (bérmunka)" suffix="Ft" />
          <Num k="szochoPct" label="Járulék (szocho)" suffix="%" />
          <Num k="overheadPct" label="Általános (rezsi)" suffix="%" />
          <Num k="profitPct" label="Nyereség" suffix="%" />
          <Num k="vatPct" label="Áfa" suffix="%" />
        </div>
        <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-stone-400">
          <span>Munkaóra: <span className="font-medium text-stone-600">{calc.hours} ó</span></span>
          <span>Anyag + vasalat: <span className="font-medium text-stone-600">{PREP_HUF(calc.mat)}</span></span>
          <span>Műszakkihasználtság: <span className="font-medium text-stone-600">{Math.round(params.shiftUtil * 100)}%</span></span>
        </div>
      </div>

      {/* két szint */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* egyszerűsített */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden self-start">
          <div className="px-4 py-2.5 bg-stone-50/60 border-b border-stone-200/80">
            <div className="text-[13px] font-semibold text-stone-900">Egyszerűsített — bruttó</div>
            <div className="text-[10.5px] text-stone-500">anyag + (bér + rezsi) + gép · tanuló / gyors becslés</div>
          </div>
          <div className="py-1.5">
            <Row l="Anyagköltség (bruttó)" v={s.anyag} />
            <Row l={`Bér + rezsi (${s.hours} ó × ${PREP_HUF(s.shiftRate)})`} v={s.ber} />
            <Row l={`Gépköltség (× ${s.machineFactor})`} v={s.gep} />
            <Row l="Kalkulált bruttó ár" v={s.total} strong accent />
          </div>
        </div>

        {/* összetett */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden self-start">
          <div className="px-4 py-2.5 bg-stone-50/60 border-b border-stone-200/80">
            <div className="text-[13px] font-semibold text-stone-900">Összetett — nettó → áfás</div>
            <div className="text-[10.5px] text-stone-500">vállalkozói önköltség + nyereség + áfa</div>
          </div>
          <div className="py-1.5">
            <Row l="1. Anyagköltség (nettó)" v={f.anyag} />
            <Row l={`2. Bérköltség (${f.hours} ó)`} v={f.ber} />
            <Row l={`3. Járulék (${f.szochoPct}%)`} v={f.jarulek} />
            {f.egyeb > 0 && <Row l="4. Egyéb (bérmunka)" v={f.egyeb} />}
            <Row l="5. Közvetlen költség" v={f.kozvetlen} strong />
            <Row l={`6. Általános (${f.overheadPct}%)`} v={f.altalanos} />
            <Row l="7. Önköltség" v={f.onkoltseg} strong />
            <Row l={`8. Nyereség (${f.profitPct}%)`} v={f.nyereseg} />
            <Row l="9. Nettó eladási ár" v={f.nettoAr} strong />
            <Row l={`Bruttó ár (${f.vatPct}% áfa)`} v={f.brutto} strong accent />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bérmunka ────────────────────────────────────────────────────────────────────
function PrepOutsource({ project, prep, isOrder }) {
  const s = useSim();
  const ops = React.useMemo(() => window.MfgPrep.outsourceStatus(project), [project, s]);
  const [sel, setSel] = useStatePrep([]); // kiválasztott, MÉG ki nem adott op-id-k

  const dispatched = ops.filter((o) => o.handshake);
  const available = ops.filter((o) => o.epic && !o.handshake);
  const blocked = ops.filter((o) => !o.epic && !o.handshake);

  // egy op kerüljön/maradjon kint a kijelölésből, ha kiadták/nincs epikje
  React.useEffect(() => { setSel((cur) => cur.filter((id) => available.some((o) => o.id === id))); }, [project, s]);

  const toggle = (id) => setSel((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  const selectAll = () => setSel(available.map((o) => o.id));
  const clear = () => setSel([]);

  return (
    <div className="space-y-4">
      <SectionHead icon="external" title="Bérmunka-kiadás" sub="Jelölj ki egy vagy több folyamat-elemet (szabászat, élzárás, CNC, felület), és add ki egy partnernek — aki mindet vállalja. Akár a teljes folyamat is kiadható; a partner megkapja a kidolgozott, részletes infócsomagot. (Beállítások → Munkafolyamat → Bérmunka alatt szerkeszthetők a típusok.)" />

      {isOrder && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-3 text-[12px] text-amber-800">
          <Icon name="lock" size={15} className="mt-0.5 shrink-0" />
          <div>A bérmunka-kiadáshoz <span className="font-medium">gyártási alprojekt</span> szükséges (folyamat-epikekkel). A rendelés projektjéből hozd létre a „Saját gyártás alprojekt" gombbal, majd onnan add ki a műveleteket.</div>
        </div>
      )}

      {/* már kiadott csomagok */}
      {dispatched.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium">Kiadott bérmunka</div>
          {uniqHandshakes(dispatched).map((hs) => <DispatchedCard key={hs.id} hs={hs} />)}
        </div>
      )}

      {/* kiadható műveletek — kijelölhető */}
      {available.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium">Kiadható műveletek</div>
            {!isOrder && (
              <div className="flex items-center gap-1.5">
                <button onClick={selectAll} className="text-[11px] font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"><Icon name="layers" size={12} />Teljes folyamat</button>
                {sel.length > 0 && <button onClick={clear} className="text-[11px] font-medium text-stone-400 hover:text-stone-600">Törlés</button>}
              </div>
            )}
          </div>
          {available.map((op) => (
            <OpSelectRow key={op.id} op={op} checked={sel.includes(op.id)} disabled={isOrder} onToggle={() => toggle(op.id)} />
          ))}
        </div>
      )}

      {/* nincs epik */}
      {blocked.map((op) => (
        <div key={op.id} className="flex items-center gap-3 bg-stone-50 border border-dashed border-stone-200 rounded-xl px-4 py-3">
          <div className="shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-stone-100 text-stone-400"><Icon name={op.icon} size={15} /></div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-medium text-stone-600">{op.label}</div>
            <div className="text-[10.5px] text-stone-400">Nincs megfelelő folyamat-epik — előbb húzd rá a gyártási folyamatot a projektre.</div>
          </div>
        </div>
      ))}

      {available.length === 0 && blocked.length === 0 && dispatched.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-[12.5px] text-stone-500">Nincs kiadható folyamat-elem ezen a projekten.</div>
      )}

      {/* alsó térköz, hogy a lebegő sáv ne takarja az utolsó sort */}
      {sel.length > 0 && !isOrder && <div className="h-20" aria-hidden />}

      {/* kiadó sáv (kompakt) + alulról nyíló részletes lap */}
      {sel.length > 0 && !isOrder && (
        <DispatchPanel project={project} ops={available.filter((o) => sel.includes(o.id))} onDone={clear} />
      )}
    </div>
  );
}

function uniqHandshakes(dispatched) {
  const seen = {}; const out = [];
  dispatched.forEach((o) => { if (o.handshake && !seen[o.handshake.id]) { seen[o.handshake.id] = 1; out.push(o.handshake); } });
  return out;
}

function DispatchedCard({ hs }) {
  const tone = HS_PREP_TONE[hs.status] || HS_PREP_TONE.sent;
  const labels = hs.opLabels || (hs.epicTitle ? [hs.epicTitle] : []);
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[13px] font-semibold text-stone-900">{hs.partnerName}</div>
            {hs.bundle && <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-medium">csomag · {labels.length} művelet</span>}
          </div>
          <div className="text-[10.5px] font-mono text-stone-400 mt-0.5">{hs.id}</div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${tone.bg} ${tone.fg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{tone.l}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {labels.map((l, i) => <span key={i} className="inline-flex items-center px-2 h-6 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium">{l}</span>)}
      </div>
      {hs.payload && (
        <div className="mt-2.5 pt-2.5 border-t border-stone-100 flex items-center gap-3 text-[11px] text-stone-500 flex-wrap">
          {hs.payload.totalHours > 0 && <span className="tabular-nums">{hs.payload.totalHours} munkaóra</span>}
          {hs.payload.parts > 0 && <><span className="text-stone-300">·</span><span className="tabular-nums">{hs.payload.parts} alkatrész</span></>}
          {hs.payload.sheets > 0 && <><span className="text-stone-300">·</span><span className="tabular-nums">{hs.payload.sheets} tábla</span></>}
          {hs.payload.edgeM > 0 && <><span className="text-stone-300">·</span><span className="tabular-nums">{hs.payload.edgeM} fm él</span></>}
        </div>
      )}
      {hs.note && <div className="mt-2 text-[11.5px] text-stone-600 bg-stone-50 rounded-lg px-3 py-2 leading-snug">„{hs.note}"</div>}
    </div>
  );
}

function OpSelectRow({ op, checked, disabled, onToggle }) {
  return (
    <button onClick={disabled ? undefined : onToggle} disabled={disabled}
      className={`w-full text-left bg-white rounded-xl border p-3.5 flex items-start gap-3 transition ${checked ? "border-teal-400 ring-1 ring-teal-200" : "border-stone-200 hover:border-stone-300"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
      <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-md border grid place-items-center transition ${checked ? "bg-teal-600 border-teal-600 text-white" : "border-stone-300 bg-white text-transparent"}`}>
        <Icon name="check" size={13} />
      </span>
      <div className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-stone-100 text-stone-600"><Icon name={op.icon} size={16} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-stone-900">{op.label}</div>
        <div className="text-[11.5px] text-stone-500 mt-0.5 leading-snug">{op.desc}</div>
        {op.epic && <div className="text-[10.5px] text-stone-400 mt-1">Folyamat-epik: <span className="text-stone-600 font-medium">{op.epic.title}</span></div>}
      </div>
    </button>
  );
}

// Kiadó sáv (kompakt, lebegő) — nem takarja a kijelölést; a részletek alulról nyíló lapon
function DispatchPanel({ project, ops, onDone }) {
  const s = useSim();
  const opKeys = ops.map((o) => o.op);
  const partners = React.useMemo(() => window.MfgPrep.partnersForOps(opKeys, []), [opKeys.join(","), s]);
  const [open, setOpen] = useStatePrep(false);
  const bundle = ops.length > 1;
  const able = partners.length > 0;

  return (
    <>
      {/* lebegő összegző sáv */}
      <div className="sticky bottom-0 z-10" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="bg-white rounded-2xl border border-teal-300 shadow-lg shadow-teal-900/10 p-3 flex items-center gap-3">
          <div className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-teal-50 text-teal-600"><Icon name="external" size={16} /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-stone-900 leading-tight">{ops.length} művelet kijelölve{bundle ? " — csomag" : ""}</div>
            <div className="text-[11px] truncate leading-tight mt-0.5">
              {able ? <span className="text-stone-500">{partners.length} partner vállalja mindet</span>
                    : <span className="text-rose-600">Nincs partner, aki mindet vállalja</span>}
            </div>
          </div>
          <button onClick={() => setOpen(true)}
            className="shrink-0 h-10 px-4 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 bg-teal-600 text-white hover:bg-teal-700">
            Kiadás<Icon name="chevron" size={14} className="-rotate-90" />
          </button>
        </div>
      </div>

      {open && <DispatchSheet project={project} ops={ops} partners={partners} onClose={() => setOpen(false)} onDone={() => { setOpen(false); onDone && onDone(); }} />}
    </>
  );
}

// Alulról nyíló részletes kiadó lap — csomag-előnézet + partner + jegyzet + kiadás
function DispatchSheet({ project, ops, partners, onClose, onDone }) {
  const s = useSim();
  const opKeys = ops.map((o) => o.op);
  const opIds = ops.map((o) => o.id);
  const [pid, setPid] = useStatePrep(partners[0] ? partners[0].id : "");
  const [note, setNote] = useStatePrep("");
  const payload = React.useMemo(() => window.MfgPrep.payloadFor(project, opKeys), [project, opKeys.join(","), s]);
  const bundle = ops.length > 1;
  const give = () => { if (!pid) return; window.sim.delegateOutsource(project.id, opIds, pid, note); onDone && onDone(); };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl sm:max-w-lg sm:mx-auto sm:mb-6 w-full max-h-[88vh] flex flex-col shadow-2xl">
        {/* header */}
        <div className="shrink-0 px-4 pt-3 pb-3 border-b border-stone-100">
          <div className="w-9 h-1 rounded-full bg-stone-200 mx-auto mb-3 sm:hidden" />
          <div className="flex items-start gap-2.5">
            <div className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-teal-50 text-teal-600"><Icon name="external" size={16} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-stone-900 leading-tight">{bundle ? `${ops.length} művelet egy csomagban` : ops[0].label} kiadása</div>
              <div className="text-[11.5px] text-stone-500 truncate">{project.name}</div>
            </div>
            <button onClick={onClose} className="shrink-0 w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"><Icon name="x" size={16} /></button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {ops.map((o) => <span key={o.id} className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-teal-50 text-teal-700 text-[11px] font-medium"><Icon name={o.icon} size={11} />{o.label}</span>)}
          </div>
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
          {payload && (
            <div className="bg-stone-50 border border-stone-200/70 rounded-xl p-3">
              <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2">A partner ezt a részletes csomagot kapja</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {payload.parts > 0 && <PayloadStat l="Alkatrész" v={payload.parts} />}
                {payload.sheets > 0 && <PayloadStat l="Lapanyag" v={payload.sheets + " tábla"} />}
                {payload.edgeM > 0 && <PayloadStat l="Élzárás" v={payload.edgeM + " fm"} />}
                {payload.surfaceM2 > 0 && <PayloadStat l="Felület" v={payload.surfaceM2 + " m²"} />}
                <PayloadStat l="Munkaóra" v={payload.totalHours} />
                <PayloadStat l="Becsült díj" v={PREP_HUFk(payload.totalCost)} />
              </div>
              {payload.ops.length > 0 && (
                <div className="space-y-1">
                  {payload.ops.map((r) => (
                    <div key={r.op} className="flex items-center justify-between text-[11.5px]">
                      <span className="text-stone-600">{r.label}</span>
                      <span className="tabular-nums text-stone-500">{r.hours} ó · ~{r.days} nap</span>
                    </div>
                  ))}
                </div>
              )}
              {(payload.materials.length > 0 || payload.hardware.length > 0) && (
                <div className="mt-2 pt-2 border-t border-stone-200/70 text-[11px] text-stone-500 space-y-0.5">
                  {payload.materials.length > 0 && <div className="truncate"><span className="text-stone-400">Anyag:</span> {payload.materials.map((m) => `${m.name} (${m.sheets})`).join(", ")}</div>}
                  {payload.hardware.length > 0 && <div className="truncate"><span className="text-stone-400">Vasalat:</span> {payload.hardware.map((h) => `${h.name} ×${h.qty}`).join(", ")}</div>}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1">Partner</div>
            {partners.length === 0 ? (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200/70 rounded-lg px-3 py-2.5 text-[11.5px] text-rose-700">
                <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
                <div>Nincs olyan partner, aki a kijelölt műveletek <span className="font-medium">mindegyikét</span> vállalja. Szűkítsd a kijelölést, vagy állítsd be a partner képességeit (Beállítások → Partnerek).</div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {partners.map((p) => (
                  <button key={p.id} onClick={() => setPid(p.id)}
                    className={`w-full text-left flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition ${pid === p.id ? "border-teal-400 ring-1 ring-teal-200 bg-teal-50/40" : "border-stone-200 hover:border-stone-300"}`}>
                    <span className={`shrink-0 w-4 h-4 rounded-full border-2 grid place-items-center ${pid === p.id ? "border-teal-600" : "border-stone-300"}`}>{pid === p.id && <span className="w-2 h-2 rounded-full bg-teal-600" />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium text-stone-900 truncate">{p.name}{p.platform ? "" : " (platformon kívül)"}</div>
                      <div className="text-[10.5px] text-stone-400 truncate">{p.specialty || `${(p.capabilities || []).length} képesség`}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1">Megjegyzés a partnernek</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Határidő, minőségi elvárás, szállítás…"
              className="w-full px-2.5 py-2 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-700 resize-none" />
          </div>
        </div>

        {/* footer */}
        <div className="shrink-0 px-4 py-3 border-t border-stone-100 flex items-center gap-2" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          <button onClick={onClose} className="h-10 px-4 rounded-lg text-[12.5px] font-medium text-stone-600 border border-stone-200 hover:bg-stone-50">Mégse</button>
          <button onClick={give} disabled={!pid}
            className="flex-1 h-10 px-4 rounded-lg text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 bg-teal-600 text-white hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400">
            <Icon name="external" size={14} />Kiadás{partners.length ? "" : " — nincs partner"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PayloadStat({ l, v }) {
  return (
    <div className="bg-white rounded-lg border border-stone-200/70 px-2.5 py-1.5">
      <div className="text-[9.5px] uppercase tracking-wide text-stone-500">{l}</div>
      <div className="text-[13px] font-semibold tabular-nums text-stone-900 leading-tight">{v}</div>
    </div>
  );
}

// ── közös szekció-fejléc ──
function SectionHead({ icon, title, sub }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-teal-50 text-teal-600 mt-0.5"><Icon name={icon} size={15} /></div>
      <div>
        <div className="text-[14px] font-semibold text-stone-900">{title}</div>
        <div className="text-[11.5px] text-stone-500 leading-snug max-w-2xl">{sub}</div>
      </div>
    </div>
  );
}

Object.assign(window, { MfgPrepPage, MfgPrepWorkspace, orderToPseudo });
