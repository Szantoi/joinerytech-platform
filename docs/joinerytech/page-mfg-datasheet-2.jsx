// ──────────────────────────────────────────────────────────────────────────
// page-mfg-datasheet-2.jsx — MdElementSheet
//
//   EGY elem teljes gyártás-adatlapja (fullscreen). A bútorsor-elemet egy
//   egy-tételes pszeudo-projektté képezi, és a MfgPrep motorral feloldja a
//   woodwork_domain.md 10-részes dokumentáció releváns részeit:
//     Áttekintés · Szabásjegyzék · Anyagnorma · Szerelvény · Útvonal · Munkaóra
//   Mind SZÁMÍTOTT (a megjelenítés a tényleges, konfigurált méretekkel).
//   Belépő: a Gyártás-adatlap elem-kártyájáról (window.MdElementSheet).
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateMD2 } = React;

const MD_KIND_LABEL = { sheet: "Lapanyag", solidwood: "Tömörfa", veneer: "Furnér", edgeband: "Élzáró" };
const MD_KIND_TONE = { sheet: "bg-sky-50 text-sky-700 border-sky-200", solidwood: "bg-amber-50 text-amber-700 border-amber-200", veneer: "bg-violet-50 text-violet-700 border-violet-200", edgeband: "bg-stone-100 text-stone-600 border-stone-200" };

const MD_TABS = [
  { key: "overview", hu: "Áttekintés",   icon: "box" },
  { key: "cut",      hu: "Szabásjegyzék", icon: "cut" },
  { key: "material", hu: "Anyagnorma",   icon: "layers" },
  { key: "hardware", hu: "Szerelvény",   icon: "bolt" },
  { key: "routing",  hu: "Útvonal",      icon: "workflow" },
  { key: "labor",    hu: "Munkaóra",     icon: "cpu" },
];

function MdElementSheet({ comp, entry, onClose }) {
  const [tab, setTab] = useStateMD2("overview");
  const { mapped, prep, comp: completeness } = entry;
  const it = mapped._it;
  const ep = window.mdElementProject(comp, mapped);
  const routing = (() => { try { return window.MfgPrep.routingPlan(ep); } catch (e) { return []; } })();
  const routes = (() => { try { return window.MfgPrep.partRoutes(ep); } catch (e) { return null; } })();
  const calc = (() => { try { return window.MfgPrep.priceCalc(prep); } catch (e) { return null; } })();
  const di = prep && prep.items && prep.items[0];

  React.useEffect(() => { const p = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = p; }; }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-stone-50" role="dialog" aria-modal="true">
      {/* fejléc */}
      <header className="shrink-0 bg-white border-b border-stone-200">
        <div className="max-w-[1080px] mx-auto px-4 md:px-6 pt-3.5">
          <div className="flex items-start gap-3">
            <button onClick={onClose} className="shrink-0 w-9 h-9 grid place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 mt-0.5"><Icon name="chevron" size={16} className="rotate-180" /></button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[16px] font-semibold text-stone-900 tracking-tight truncate">{it.tplName}</span>
                <window.MdTplPill tplId={it.tplId} />
                <span className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10px] font-medium ${completeness.ready ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}><Icon name={completeness.ready ? "check" : "alert"} size={10} />{completeness.ready ? "kész" : `${completeness.missing.length} hiány`}</span>
              </div>
              <div className="mt-1"><window.MdCrumb segs={[{ v: comp.room }, { v: it.catName }, { v: it.tplName }]} /></div>
            </div>
            <div className="shrink-0 hidden sm:flex flex-col items-end leading-tight">
              <span className="text-[9.5px] uppercase tracking-wide text-stone-400 font-medium">Önköltség</span>
              <span className="text-[15px] font-semibold text-stone-900 tabular-nums">{window.mdHuf(prep.totals.grand)}</span>
            </div>
          </div>
          {/* fülek */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto">
            {MD_TABS.map((tb) => (
              <button key={tb.key} onClick={() => setTab(tb.key)}
                className={`h-9 px-3 rounded-t-lg text-[12px] font-medium inline-flex items-center gap-1.5 border-b-2 whitespace-nowrap ${tab === tb.key ? "border-amber-500 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800"}`}>
                <Icon name={tb.icon} size={13} />{tb.hu}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1080px] mx-auto px-4 md:px-6 py-5">
          {tab === "overview" && <MdOverview comp={comp} it={it} di={di} prep={prep} completeness={completeness} calc={calc} routing={routing} />}
          {tab === "cut" && <MdCutTab prep={prep} />}
          {tab === "material" && <MdMaterialTab prep={prep} />}
          {tab === "hardware" && <MdHardwareTab prep={prep} di={di} />}
          {tab === "routing" && <MdRoutingTab routing={routing} routes={routes} />}
          {tab === "labor" && <MdLaborTab prep={prep} />}
        </div>
      </div>
    </div>
  );
}

// ── panel-keret ────────────────────────────────────────────────────────────
function MdCard({ title, icon, sub, right, children }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <Icon name={icon} size={14} className="text-amber-500 shrink-0" />}
          <div className="text-[12.5px] font-semibold text-stone-900 truncate">{title}</div>
          {sub && <span className="text-[10.5px] text-stone-400 truncate">· {sub}</span>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ÁTTEKINTÉS
// ════════════════════════════════════════════════════════════════════════════
function MdOverview({ comp, it, di, prep, completeness, calc, routing }) {
  const t = prep.totals;
  const sell = (it.unitPrice || 0) * (it.qty || 1);
  const margin = sell > 0 ? Math.round((1 - t.grand / sell) * 100) : null;
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {/* meta */}
        <MdCard title="Konfiguráció" icon="settings">
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2.5 p-4">
            {[
              ["Kategória (csoport)", di ? di.catName : it.catName],
              ["Kivitel (stílus)", di ? di.styleName : it.styleName],
              ["Műszaki előírás", di ? di.techName : it.techName],
              ["Sablon", `${di ? di.tplName : it.tplName} · ${di ? di.tplId : it.tplId}`],
              ["Befoglaló méret", it.dims],
              ["Felfüggesztés", (window.MOUNT_META[it.mount] || {}).label || "—"],
              ["Darab", `${it.qty} db`],
              ["Vasalat-márka", di ? di.brand : "—"],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-stone-400">{k}</div>
                <div className="text-[12.5px] text-stone-800 font-medium truncate">{v || "—"}</div>
              </div>
            ))}
          </div>
        </MdCard>

        {/* önköltség-bontás */}
        <MdCard title="Önköltség-bontás" icon="briefcase" sub="anyag + vasalat + munka">
          <div className="p-4 space-y-2">
            {[
              ["Anyag", t.materialCost, "layers"],
              ["Vasalat", t.hardwareCost, "bolt"],
              ["Munka", t.laborCost, "cpu"],
            ].map(([k, v, ic]) => (
              <div key={k} className="flex items-center gap-2">
                <Icon name={ic} size={13} className="text-stone-400" />
                <span className="text-[12px] text-stone-600 flex-1">{k}</span>
                <span className="text-[12.5px] font-medium text-stone-900 tabular-nums">{window.mdHuf(v)}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
              <span className="text-[12.5px] font-semibold text-stone-900 flex-1">Önköltség (Σ)</span>
              <span className="text-[14px] font-bold text-stone-900 tabular-nums">{window.mdHuf(t.grand)}</span>
            </div>
            <div className="flex items-center gap-2 text-[11.5px]">
              <span className="text-stone-500 flex-1">Eladási ár (konfigból)</span>
              <span className="text-stone-700 tabular-nums">{window.mdHuf(sell)}</span>
              {margin != null && <span className={`ml-1 px-1.5 h-5 inline-flex items-center rounded-md text-[10px] font-semibold ${margin >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>{margin >= 0 ? "+" : ""}{margin}% fedezet</span>}
            </div>
          </div>
        </MdCard>

        {/* kétszintű kalkuláció (woodwork §10) */}
        {calc && calc.full && (
          <MdCard title="Kétszintű árkalkuláció" icon="cpu" sub="woodwork §10 — összetett (nettó → áfa)">
            <div className="p-4 grid sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px]">
              {[
                ["Közvetlen költség", calc.full.kozvetlen],
                [`Általános (${calc.full.overheadPct}%)`, calc.full.altalanos],
                ["Önköltség", calc.full.onkoltseg],
                [`Nyereség (${calc.full.profitPct}%)`, calc.full.nyereseg],
                ["Nettó ár", calc.full.nettoAr],
                [`Bruttó (+${calc.full.vatPct}% áfa)`, calc.full.brutto],
              ].map(([k, v], i) => (
                <div key={k} className={`flex items-center justify-between ${i >= 4 ? "font-semibold text-stone-900" : "text-stone-600"}`}>
                  <span>{k}</span><span className="tabular-nums">{window.mdHuf(v)}</span>
                </div>
              ))}
            </div>
          </MdCard>
        )}
      </div>

      {/* jobb: készültség + összegzők */}
      <div className="space-y-4">
        <MdCard title="Készültség" icon="check" sub="kiadáshoz">
          <div className="p-4 space-y-1.5">
            {completeness.checks.map((c) => (
              <div key={c.key} className="flex items-center gap-2 text-[12px]">
                <span className={`w-4 h-4 rounded grid place-items-center text-white text-[10px] ${c.ok ? "bg-emerald-500" : "bg-stone-300"}`}><Icon name={c.ok ? "check" : "minus"} size={10} /></span>
                <span className={c.ok ? "text-stone-600" : "text-stone-800 font-medium"}>{c.label}</span>
              </div>
            ))}
            {!completeness.ready && (
              <button onClick={() => { window._engineerOpen = di ? di.tplId : it.tplId; window.navigateTo && window.navigateTo("design", "engineer"); }}
                className="mt-2 w-full h-9 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[12px] font-medium hover:bg-amber-100 inline-flex items-center justify-center gap-1.5">
                <Icon name="ruler" size={13} />Megnyitás a Műszaki tervezésben
              </button>
            )}
          </div>
        </MdCard>
        <MdCard title="Mennyiségek" icon="box">
          <div className="p-4 grid grid-cols-2 gap-3">
            {[
              ["Alkatrész", prep.qty.parts],
              ["Lapanyag", `${t.sheets} tábla`],
              ["Tömörfa", `${window.mdN1(t.volumeM3)} m³`],
              ["Élzárás", `${window.mdN1(prep.qty.edgeM)} fm`],
              ["Vasalat", prep.hardware.reduce((n, h) => n + h.qty, 0)],
              ["Munkaóra", `${window.mdN1(prep.labor.totalHours)} ó`],
            ].map(([k, v]) => (
              <div key={k}><div className="text-[10px] uppercase tracking-wide text-stone-400">{k}</div><div className="text-[14px] font-semibold text-stone-900 tabular-nums">{v}</div></div>
            ))}
          </div>
        </MdCard>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SZABÁSJEGYZÉK
// ════════════════════════════════════════════════════════════════════════════
function MdCutTab({ prep }) {
  const rows = prep.cutlist || [];
  return (
    <MdCard title="Alkatrész- + szabásjegyzék" icon="cut" sub={`${rows.length} sor · ${prep.qty.parts} db`}>
      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
              <th className="text-left font-medium px-4 py-2">Alkatrész</th>
              <th className="text-left font-medium px-2 py-2">Anyag</th>
              <th className="text-right font-medium px-2 py-2">Db</th>
              <th className="text-right font-medium px-2 py-2">Méret (mm)</th>
              <th className="text-right font-medium px-2 py-2">Felület</th>
              <th className="text-right font-medium px-2 py-2">Él (fm)</th>
              <th className="text-center font-medium px-3 py-2">Él-kial.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const gv = (p.miterShort || 0) + (p.miterLong || 0);
              return (
                <tr key={i} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50">
                  <td className="px-4 py-2 font-medium text-stone-800">{p.name}</td>
                  <td className="px-2 py-2 text-stone-500 truncate max-w-[160px]">{p.matName}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-stone-700">{p.qty}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-mono text-stone-700">{p.w} × {p.h}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-stone-500">{window.mdN1(p.area)} m²</td>
                  <td className="px-2 py-2 text-right tabular-nums text-stone-500">{window.mdN1(p.edgeM)}</td>
                  <td className="px-3 py-2 text-center">{gv > 0 ? <span className="inline-flex items-center px-1.5 h-5 rounded bg-rose-50 text-rose-600 border border-rose-200 text-[9.5px] font-semibold">GV {p.miterShort || 0}R{p.miterLong || 0}H</span> : <span className="text-stone-300">—</span>}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-[12px] text-stone-400">Nincs feloldott alkatrész — a sablon nincs kiadva.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-stone-50/60 border-t border-stone-100 text-[10.5px] text-stone-400">A méret a TÉNYLEGES konfigurált geometriából (CPQ vars) feloldva. GV = gérvágás/szögbe vágott él (rövid R / hosszú H).</div>
    </MdCard>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ANYAGNORMA
// ════════════════════════════════════════════════════════════════════════════
function MdMaterialTab({ prep }) {
  const sheet = (prep.materials || []).filter((m) => m.kind !== "solidwood");
  const wood = (prep.materials || []).filter((m) => m.kind === "solidwood");
  const aux = prep.aux;
  return (
    <div className="space-y-4">
      <MdCard title="Anyagnorma — lapanyag" icon="layers" sub={`${prep.totals.sheets} tábla`}>
        <MdMatTable rows={sheet} kind="sheet" />
      </MdCard>
      {wood.length > 0 && (
        <MdCard title="Anyagnorma — tömörfa" icon="layers" sub={`${window.mdN1(prep.totals.volumeM3)} m³ · fafaj-függő hulladék%`}>
          <MdMatTable rows={wood} kind="solidwood" />
        </MdCard>
      )}
      {aux && (aux.glues.length > 0 || aux.finishes.length > 0 || aux.abrasive) && (
        <MdCard title="Segédanyagnorma" icon="box" sub="woodwork §6 — ragasztó / felület / csiszoló">
          <div className="p-4 space-y-1.5 text-[11.5px]">
            {[...aux.glues, ...aux.finishes].map((g, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-stone-700 flex-1 truncate">{g.name}</span>
                <span className="text-stone-400 text-[10px] truncate hidden sm:inline">{g.basis}</span>
                <span className="font-medium text-stone-900 tabular-nums shrink-0">{g.totalG} g</span>
              </div>
            ))}
            {aux.abrasive && <div className="flex items-center gap-2"><span className="text-stone-700 flex-1">Csiszolóanyag</span><span className="text-stone-500 font-mono text-[10.5px]">{(aux.abrasive.grits || []).join(" · ")}</span></div>}
          </div>
        </MdCard>
      )}
    </div>
  );
}
function MdMatTable({ rows, kind }) {
  const coverTone = { ok: "bg-emerald-50 text-emerald-700", partial: "bg-amber-50 text-amber-700", short: "bg-rose-50 text-rose-600" };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11.5px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
            <th className="text-left font-medium px-4 py-2">Anyag</th>
            <th className="text-right font-medium px-2 py-2">Nettó</th>
            <th className="text-right font-medium px-2 py-2">Hulladék</th>
            <th className="text-right font-medium px-2 py-2">Szükséglet</th>
            <th className="text-right font-medium px-2 py-2">Készlet</th>
            <th className="text-right font-medium px-4 py-2">Költség</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m, i) => (
            <tr key={i} className="border-b border-stone-50 last:border-0">
              <td className="px-4 py-2"><span className="font-medium text-stone-800">{m.name}</span><span className={`ml-1.5 inline-flex items-center px-1 h-4 rounded border text-[9px] font-medium ${MD_KIND_TONE[m.kind] || ""}`}>{MD_KIND_LABEL[m.kind] || m.kind}</span></td>
              <td className="px-2 py-2 text-right tabular-nums text-stone-500">{kind === "solidwood" ? `${window.mdN1(m.netM3)} m³` : `${window.mdN1(m.area)} m²`}</td>
              <td className="px-2 py-2 text-right tabular-nums text-stone-500">{m.wastePct}%{kind === "solidwood" && <span className="text-stone-400"> ({m.species})</span>}</td>
              <td className="px-2 py-2 text-right tabular-nums font-medium text-stone-900">{m.qtyLabel}</td>
              <td className="px-2 py-2 text-right">{m.onHand == null ? <span className="text-stone-300">—</span> : <span className={`px-1.5 h-5 inline-flex items-center rounded text-[10px] font-medium ${coverTone[m.cover] || ""}`}>{m.onHand} {m.unit}</span>}</td>
              <td className="px-4 py-2 text-right tabular-nums text-stone-700">{window.mdHuf(m.cost)}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-[12px] text-stone-400">Nincs ilyen anyag ennél az elemnél.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SZERELVÉNYJEGYZÉK
// ════════════════════════════════════════════════════════════════════════════
function MdHardwareTab({ prep, di }) {
  const rows = prep.hardware || [];
  return (
    <MdCard title="Szerelvényjegyzék" icon="bolt" sub={`${rows.reduce((n, h) => n + h.qty, 0)} db · márka: ${di ? di.brand : "—"}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
              <th className="text-left font-medium px-4 py-2">Megnevezés</th>
              <th className="text-left font-medium px-2 py-2">Márka</th>
              <th className="text-right font-medium px-2 py-2">Db</th>
              <th className="text-right font-medium px-2 py-2">Egységár</th>
              <th className="text-right font-medium px-4 py-2">Költség</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h, i) => (
              <tr key={i} className="border-b border-stone-50 last:border-0">
                <td className="px-4 py-2 font-medium text-stone-800">{h.name}</td>
                <td className="px-2 py-2 text-stone-500">{h.brand || "—"}</td>
                <td className="px-2 py-2 text-right tabular-nums text-stone-700">{h.qty} {h.unit}</td>
                <td className="px-2 py-2 text-right tabular-nums text-stone-500">{window.mdHuf(h.unitPrice)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-stone-700">{window.mdHuf(h.cost)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-[12px] text-stone-400">Nincs vasalat ennél az elemnél.</td></tr>}
          </tbody>
        </table>
      </div>
    </MdCard>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ÚTVONAL — állomás-stepper + per-alkatrész folyamatábra
// ════════════════════════════════════════════════════════════════════════════
function MdRoutingTab({ routing, routes }) {
  return (
    <div className="space-y-4">
      <MdCard title="Technológiai útvonal — állomások" icon="workflow" sub={`${routing.length} állomás`}>
        <div className="p-4 flex items-stretch gap-1.5 overflow-x-auto">
          {routing.map((r, i) => (
            <React.Fragment key={r.kind}>
              {i > 0 && <div className="self-center text-stone-300 shrink-0"><Icon name="chevron" size={13} /></div>}
              <div className="shrink-0 rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 min-w-[120px]">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: r.accent }} /><span className="text-[11.5px] font-semibold text-stone-800">{r.kindLabel}</span></div>
                <div className="text-[10px] text-stone-500 mt-1">{r.partCount} alkatrész · {window.mdN1(r.hours)} ó</div>
                <div className="text-[9.5px] text-stone-400 font-mono truncate">{r.machineName}</div>
                {r.opStepCount > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{r.opSteps.slice(0, 6).map((o) => <span key={o.key} title={o.label} className={`px-1 h-4 inline-flex items-center rounded text-[8.5px] font-medium ${o.front ? "bg-amber-100 text-amber-700" : o.merge ? "bg-violet-100 text-violet-700" : "bg-stone-200 text-stone-600"}`}>{o.short || o.label}</span>)}</div>}
              </div>
            </React.Fragment>
          ))}
          {routing.length === 0 && <div className="text-[12px] text-stone-400">Nincs útvonal — a sablon nincs kiadva.</div>}
        </div>
      </MdCard>

      {routes && routes.parts && routes.parts.length > 0 && (
        <MdCard title="Per-alkatrész folyamatábra (vonalas)" icon="cut" sub="woodwork §11 — anyagtípus-vezérelt útvonal alkatrészenként">
          <div className="overflow-x-auto p-4">
            <div className="space-y-1.5 min-w-[480px]">
              {routes.parts.map((pt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-[150px] shrink-0 min-w-0">
                    <div className="text-[11.5px] font-medium text-stone-800 truncate">{pt.name}</div>
                    <span className={`inline-flex items-center px-1 h-4 rounded border text-[9px] font-medium ${MD_KIND_TONE[pt.kind] || ""}`}>{MD_KIND_LABEL[pt.kind] || pt.kind}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap flex-1">
                    {pt.ops.map((opk, j) => {
                      const od = (window.WW_OP_BY_KEY || {})[opk] || { short: opk, label: opk };
                      return (
                        <React.Fragment key={j}>
                          {j > 0 && <span className="text-stone-300 text-[9px]">›</span>}
                          <span title={od.label} className={`px-1.5 h-5 inline-flex items-center rounded text-[9.5px] font-medium ${od.front ? "bg-amber-50 text-amber-700 border border-amber-200" : od.merge ? "bg-violet-50 text-violet-700 border border-violet-200" : "bg-stone-100 text-stone-600"}`}>{od.short || od.label}</span>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 py-2 bg-stone-50/60 border-t border-stone-100 text-[10.5px] text-stone-400 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-200" />tömörfa front-end</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-violet-200" />összevezetés / identitás-váltás</span>
            <span>· a lap és a tömörfa eltérő műveletsoron megy át</span>
          </div>
        </MdCard>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  MUNKAÓRA
// ════════════════════════════════════════════════════════════════════════════
function MdLaborTab({ prep }) {
  const rows = (prep.labor && prep.labor.rows || []).filter((r) => r.hours > 0);
  const total = prep.labor || { totalHours: 0, leadDays: 0, cost: 0 };
  const maxH = Math.max(1, ...rows.map((r) => r.hours));
  return (
    <MdCard title="Munkaidő — részlegenként" icon="cpu" sub={`${window.mdN1(total.totalHours)} óra · ~${total.leadDays} nap · ${window.mdHuf(total.cost)}`}>
      <div className="p-4 space-y-2.5">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
            <div className="w-[120px] shrink-0 min-w-0">
              <div className="text-[12px] font-medium text-stone-800 truncate">{r.name}</div>
              <div className="text-[9.5px] text-stone-400 truncate">{(r.machines || []).slice(0, 1).join(", ")}</div>
            </div>
            <div className="flex-1 h-2.5 rounded-full bg-stone-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(r.hours / maxH) * 100}%`, background: r.color }} /></div>
            <span className="text-[11.5px] tabular-nums text-stone-700 w-14 text-right shrink-0">{window.mdN1(r.hours)} ó</span>
            <span className="text-[11px] tabular-nums text-stone-400 w-20 text-right shrink-0 hidden sm:inline">{window.mdHuf(r.cost)}</span>
          </div>
        ))}
        {rows.length === 0 && <div className="text-[12px] text-stone-400 text-center py-6">Nincs munkaóra-adat.</div>}
        <div className="flex items-center gap-3 pt-2.5 border-t border-stone-100">
          <span className="text-[12px] font-semibold text-stone-900 flex-1">Összesen</span>
          <span className="text-[13px] font-bold text-stone-900 tabular-nums">{window.mdN1(total.totalHours)} ó</span>
          <span className="text-[11.5px] text-stone-500 tabular-nums w-20 text-right hidden sm:inline">{window.mdHuf(total.cost)}</span>
        </div>
      </div>
    </MdCard>
  );
}

window.MdElementSheet = MdElementSheet;
