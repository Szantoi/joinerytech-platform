// ──────────────────────────────────────────────────────────────────────────
// page-controlling-2.jsx — Kontrolling: UTÓKALKULÁCIÓ (terv vs. tény, munka-szint)
//
//   SZÁMÍTOTT nézet — nincs új store-mező (woodwork_domain §14 utókalkuláció,
//   §15 gap-lista 5. pont). A lánc:
//     TERV = a gyártás-előkészítés kiadott útvonala (prepRelease.steps órái) +
//            az előkalkuláció (MfgPrep.priceCalc — Kalkuláció fül)
//     TÉNY = a Feladat-terminál idő-naplója (prodTask.sessions →
//            ProdSchedEngine.taskActualMinutes) × óradíj
//   Munka = kiadott rendelés VAGY gyártási projekt (prepRelease-szel).
//   Az anyag-tény (raktári kivét) a Projekt-fedezet nézet dolga — itt a
//   GYÁRTÁSI órák terv/tény összevetése él, állomásonként.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateC2 } = React;

const pcHuf = (n) => Math.round(n || 0).toLocaleString("hu-HU") + " Ft";
const pcH = (n) => (Math.round((n || 0) * 10) / 10).toLocaleString("hu-HU") + " ó";

// Munkák begyűjtése: kiadott rendelések + gyártási projektek terv/tény adatokkal.
// Fallback: a műhelysorban élő, kiadás-rekord nélküli feladat-láncok (pl. seed/demó)
// rendelés-azonosító szerint csoportosítva — a terv ott is a feladat-órákból jön.
function pcCollect(sim) {
  const E = window.ProdSchedEngine;
  const rate = (window.WW_PRICE_PARAMS && window.WW_PRICE_PARAMS.laborRate) || window.LABOR_RATE || 6500;
  const works = [];
  const buildRows = (tasks) => tasks.map((t) => {
    const actH = E ? E.taskActualMinutes(t) / 60 : 0;
    const km = (window.PROD_KINDS || {})[t.kind] || {};
    return { id: t.id, label: km.label || t.title, icon: km.icon || "factory", accent: km.accent || "#0d9488",
      status: t.status, assignee: t.assignee || "", planH: Number(t.hours) || 0, actH,
      eff: actH > 0.05 ? (Number(t.hours) || 0) / actH : null };
  });
  const calcFor = (kind, obj) => {
    try {
      const proj = kind === "order" ? (window.orderToPseudo && obj ? window.orderToPseudo(obj) : null) : obj;
      if (proj && window.MfgPrep) { const prep = window.MfgPrep.derive(proj); if (prep) return window.MfgPrep.priceCalc(prep); }
    } catch (e) {}
    return null;
  };
  const pushWork = (kind, obj, rel, tasks, fallbackName) => {
    if (!tasks.length) return;
    const rows = buildRows(tasks);
    const planH = rows.reduce((s, r) => s + r.planH, 0);
    const actH = rows.reduce((s, r) => s + r.actH, 0);
    works.push({
      kind, id: (obj && obj.id) || fallbackName,
      name: obj ? (kind === "order" ? `${obj.customer || "Rendelés"} — ${obj.id}` : obj.name) : fallbackName,
      customer: (obj && obj.customer) || (tasks[0] && tasks[0].customer) || "", rel, rows,
      planH: Math.round(planH * 10) / 10, actH: Math.round(actH * 10) / 10,
      planCost: Math.round(planH * rate), actCost: Math.round(actH * rate), rate,
      calc: calcFor(kind, obj), doneAll: rows.length > 0 && rows.every((r) => r.status === "kesz"),
      deviations: (rel && rel.deviations) || [],
    });
  };
  const covered = new Set();
  const collectRel = (kind) => (obj) => {
    const rel = obj.prepRelease;
    if (!rel) return;
    (rel.taskIds || []).forEach((id) => covered.add(id));
    pushWork(kind, obj, rel, (sim.prodTasks || []).filter((t) => (rel.taskIds || []).includes(t.id)));
  };
  (sim.orders || []).forEach(collectRel("order"));
  (sim.projects || []).forEach(collectRel("project"));
  // fallback: kiadás-rekord nélküli láncok (rendelés-ref szerint)
  const byOrder = {};
  (sim.prodTasks || []).forEach((t) => { if (!covered.has(t.id) && t.order) (byOrder[t.order] = byOrder[t.order] || []).push(t); });
  Object.entries(byOrder).forEach(([ref, tasks]) => {
    const ord = (sim.orders || []).find((o) => o.id === ref) || null;
    pushWork("order", ord, null, tasks, `${(tasks[0] && tasks[0].customer) || "Műhely-sor"} — ${ref}`);
  });
  return works.sort((a, b) => b.actH - a.actH);
}

function PcEffPill({ eff }) {
  if (eff == null) return <span className="text-[10px] text-stone-300">—</span>;
  const pct = Math.round(eff * 100);
  const tone = eff >= 1 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : eff >= 0.8 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200";
  return <span className={`inline-flex items-center rounded-full border font-medium px-1.5 h-5 text-[10px] tabular-nums ${tone}`}>{pct}%</span>;
}

function PcWorkCard({ w }) {
  const [open, setOpen] = useStateC2(false);
  const stat = window.PROD_STATUS || {};
  const diff = w.actCost - w.planCost;
  const VarPill = window.VarPill;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full text-left px-4 py-3.5 hover:bg-stone-50/50 transition">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-xl grid place-items-center ${w.doneAll ? "bg-emerald-50 text-emerald-600" : "bg-teal-50 text-teal-600"}`}>
            <Icon name={w.doneAll ? "check" : "factory"} size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[13.5px] font-semibold text-stone-900 truncate">{w.name}</div>
              <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-medium">{w.kind === "order" ? "rendelés" : "projekt"}</span>
              {!w.doneAll && <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-medium">gyártás folyamatban — részleges tény</span>}
              {w.deviations.length > 0 && <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">⚠ {w.deviations.length} folyamat-eltérés</span>}
            </div>
            <div className="text-[10.5px] text-stone-400 mt-0.5">{w.rel ? `Kiadva: ${w.rel.ts} · ${w.rel.by} · ${w.rows.length} feladat` : `Műhely-sor · ${w.rows.length} feladat (kiadás-rekord nélkül)`}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[14px] font-semibold tabular-nums text-stone-900">{pcH(w.actH)} <span className="text-stone-400 font-normal text-[11px]">/ {pcH(w.planH)}</span></div>
            <div className="text-[9.5px] uppercase tracking-wide text-stone-400">tény / terv óra</div>
          </div>
          <Icon name="chevron" size={14} className={`shrink-0 mt-2 text-stone-300 transition ${open ? "rotate-90" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="border-t border-stone-100">
          {/* feladat-sorok: állomás terv/tény/hatékonyság */}
          <div className="hidden sm:grid grid-cols-[1.6fr_1fr_80px_80px_70px_110px] items-center px-4 py-2 text-[9.5px] uppercase tracking-wide text-stone-400 bg-stone-50/60">
            <span>Állomás / feladat</span><span>Felelős</span><span className="text-right">Terv</span><span className="text-right">Tény</span><span className="text-right">Hat.</span><span className="text-right">Státusz</span>
          </div>
          {w.rows.map((r) => {
            const s = stat[r.status] || {};
            return (
              <div key={r.id} className="grid grid-cols-2 sm:grid-cols-[1.6fr_1fr_80px_80px_70px_110px] items-center gap-y-1 px-4 py-2.5 border-t border-stone-50">
                <span className="inline-flex items-center gap-2 min-w-0 col-span-2 sm:col-span-1">
                  <span className="w-6 h-6 rounded-md grid place-items-center shrink-0" style={{ background: r.accent + "1a", color: r.accent }}><Icon name={r.icon} size={13} /></span>
                  <span className="text-[12px] font-medium text-stone-800 truncate">{r.label}</span>
                  <span className="text-[9.5px] font-mono text-stone-300 shrink-0">{r.id}</span>
                </span>
                <span className="text-[11px] text-stone-500 truncate">{r.assignee || "—"}</span>
                <span className="text-right text-[12px] tabular-nums text-stone-500">{pcH(r.planH)}</span>
                <span className="text-right text-[12px] tabular-nums font-medium text-stone-900">{pcH(r.actH)}</span>
                <span className="text-right"><PcEffPill eff={r.eff} /></span>
                <span className="text-right"><span className={`inline-flex items-center gap-1 text-[10px] px-1.5 h-5 rounded-full border font-medium ${s.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}</span></span>
              </div>
            );
          })}
          {/* bérköltség terv vs tény */}
          <div className="px-4 py-3 border-t border-stone-200 bg-stone-50/40 flex items-center justify-between flex-wrap gap-2">
            <div className="text-[11px] text-stone-500">Gyártási bérköltség <span className="text-stone-400">({pcHuf(w.rate).replace(" Ft", "")} Ft/ó)</span></div>
            <div className="flex items-center gap-3 text-[12.5px] tabular-nums">
              <span className="text-stone-500">terv {pcHuf(w.planCost)}</span>
              <span className="font-semibold text-stone-900">tény {pcHuf(w.actCost)}</span>
              {VarPill ? <VarPill diff={diff} size="sm" /> : null}
            </div>
          </div>
          {/* előkalkuláció referencia (Kalkuláció fül motorja) */}
          {w.calc && (
            <div className="px-4 py-3 border-t border-stone-100">
              <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Előkalkuláció (terv referencia — Gyártás-előkészítés / Kalkuláció)</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[["Anyag (terv)", w.calc.full.anyag], ["Bér (terv)", w.calc.full.ber], ["Önköltség (terv)", w.calc.full.onkoltseg], ["Nettó ár (terv)", w.calc.full.nettoAr]].map(([l, v]) => (
                  <div key={l} className="rounded-lg border border-stone-100 bg-stone-50/60 px-2.5 py-1.5">
                    <div className="text-[9.5px] text-stone-400">{l}</div>
                    <div className="text-[12px] font-semibold tabular-nums text-stone-800">{pcHuf(v)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 text-[10px] text-stone-400">Az anyag- és teljes költség-TÉNY (kivét, számla, fuvar) a Projekt-fedezet nézetben gyűlik — itt a gyártási órák terv/tény összevetése él.</div>
            </div>
          )}
          {/* folyamat-eltérések a kiadásból */}
          {w.deviations.length > 0 && (
            <div className="px-4 py-3 border-t border-stone-100">
              <div className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold mb-1.5 inline-flex items-center gap-1"><Icon name="route" size={12} />Folyamat-eltérések a kiadásban</div>
              <div className="space-y-1">
                {w.deviations.map((d, i) => (
                  <div key={i} className="text-[11.5px] text-stone-600"><span className="font-medium text-stone-800">{d.what}</span>{d.reason ? <> — {d.reason}</> : null}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ControllingPostCalc() {
  const sim = useSim();
  const works = pcCollect(sim);
  const sumPlanH = works.reduce((s, w) => s + w.planH, 0);
  const sumActH = works.reduce((s, w) => s + w.actH, 0);
  const sumDiff = works.reduce((s, w) => s + (w.actCost - w.planCost), 0);
  const VarPill = window.VarPill;

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[18px] md:text-[20px] font-semibold text-stone-900 tracking-tight">Utókalkuláció — terv vs. tény</div>
          <div className="text-[12px] text-stone-500 max-w-2xl">A kiadott munkák gyártási órái: TERV = az előkészítés útvonala + előkalkuláció · TÉNY = a Feladat-terminál idő-naplója. Idővel ebből lesz pontosabb az ajánlati ár.</div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-stone-100 text-stone-600 text-[12px] font-medium"><Icon name="chart" size={13} />{works.length} munka</span>
      </div>

      {works.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[["Terv munkaóra", pcH(sumPlanH)], ["Tény munkaóra", pcH(sumActH)], ["Bér-eltérés", null]].map(([l, v]) => (
            <div key={l} className="bg-white border border-stone-200 rounded-xl px-3 py-2.5">
              <div className="text-[9.5px] uppercase tracking-wide text-stone-400">{l}</div>
              <div className="text-[16px] font-semibold tabular-nums text-stone-900 leading-tight mt-0.5">
                {v != null ? v : (VarPill ? <VarPill diff={sumDiff} /> : pcHuf(sumDiff))}
              </div>
            </div>
          ))}
        </div>
      )}

      {works.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
          <div className="w-11 h-11 mx-auto rounded-xl bg-stone-100 grid place-items-center text-stone-400 mb-2"><Icon name="chart" size={20} /></div>
          <div className="text-[13.5px] font-semibold text-stone-700">Még nincs kiadott munka</div>
          <div className="text-[12px] text-stone-500 mt-1 max-w-md mx-auto">Az utókalkuláció a műhelynek kiadott munkákból épül — add ki egy rendelés vagy projekt útvonalát a Gyártás-előkészítésben, és naplózz időt a Feladat-terminálban.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {works.map((w) => <PcWorkCard key={w.kind + w.id} w={w} />)}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ControllingPostCalc });
