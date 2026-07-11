// Pages: Inventory, Procurement, Analytics, Settings
const { useState: useStateX } = React;

function InventoryPage({ t, initialTab }) {
  const MATERIALS = sim.materials;
  const stockCount = (sim.catalog || []).filter(it => it.active !== false && it.worldExt && it.worldExt.warehouse && !it.worldExt.warehouse.archived).length;
  const [tab, setTab] = useStateX(initialTab || "materials");
  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5 w-full sm:w-fit mb-4 overflow-x-auto">
        {[
          { k: "materials", label: "Anyagok", count: stockCount },
          { k: "offcuts",   label: t.inv.offcuts, count: 8 },
          { k: "movements", label: t.inv.movements, count: 24 },
        ].map(x => (
          <button key={x.k} onClick={() => setTab(x.k)}
            className={`flex-1 sm:flex-none justify-center px-3 h-8 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap ${tab === x.k ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
            {x.label}
            <span className={`text-[10px] tabular-nums ${tab === x.k ? "text-white/60" : "text-stone-400"}`}>{x.count}</span>
          </button>
        ))}
      </div>

      {tab === "materials" && (window.WarehouseStockTab
        ? <WarehouseStockTab embedded />
        : null)}

      {tab === "offcuts" && <OffcutsPanel />}

      {tab === "movements" && (() => {
        const rows = [
          { date: "2026-04-27 14:32", type: "Kivét",  src: "CP-184-A",  who: "Nagy J.",   mat: "Bükk 18mm 2440×1830",  qty: -8, unit: "tábla" },
          { date: "2026-04-27 09:15", type: "Bevét",  src: "PO-2426-088", who: "Raktár",    mat: "MDF 19mm 2440×1830",   qty: +50, unit: "tábla" },
          { date: "2026-04-26 16:48", type: "Maradék",src: "CP-184-A",  who: "Nagy J.",   mat: "Bükk 18mm 1200×380 ",  qty: +1, unit: "darab" },
          { date: "2026-04-26 11:02", type: "Kivét",  src: "CP-182-A",  who: "Tóth K.",   mat: "Tölgy 40mm 2440×1830", qty: -22, unit: "tábla" },
          { date: "2026-04-25 13:20", type: "Bevét",  src: "PO-2426-091", who: "Raktár",    mat: "Tölgy 22mm 2440×1830", qty: +30, unit: "tábla" },
          { date: "2026-04-25 08:55", type: "Korr.",  src: "Leltár",    who: "Szabó A.",  mat: "Csavar Spax 4×40",     qty: -120, unit: "db" },
        ];
        const typeTone = (type) =>
          type === "Bevét" ? "bg-emerald-50 text-emerald-700" :
          type === "Kivét" ? "bg-stone-100 text-stone-700" :
          type === "Maradék" ? "bg-sky-50 text-sky-700" :
          "bg-amber-50 text-amber-700";
        return (
        <Card className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[110px_140px_minmax(0,1fr)_100px_120px_120px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40">
              <div>Dátum</div><div>Típus</div><div>Anyag</div><div className="text-right">Mennyiség</div><div>Forrás / Cél</div><div>Felelős</div>
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[110px_140px_minmax(0,1fr)_100px_120px_120px] gap-3 px-5 py-2.5 border-b border-stone-100 last:border-0 items-center text-[12px]">
                <div className="font-mono text-stone-500 text-[11px]">{r.date}</div>
                <div>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium ${typeTone(r.type)}`}>{r.type}</span>
                </div>
                <div className="text-stone-900 truncate">{r.mat}</div>
                <div className={`text-right font-mono tabular-nums font-medium ${r.qty > 0 ? "text-emerald-700" : "text-stone-700"}`}>{r.qty > 0 ? "+" : ""}{r.qty} {r.unit}</div>
                <div className="font-mono text-[11px] text-teal-700">{r.src}</div>
                <div className="text-stone-600 text-[11.5px]">{r.who}</div>
              </div>
            ))}
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-stone-100">
            {rows.map((r, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium ${typeTone(r.type)}`}>{r.type}</span>
                  <span className={`font-mono tabular-nums text-[13px] font-semibold ${r.qty > 0 ? "text-emerald-700" : "text-stone-700"}`}>{r.qty > 0 ? "+" : ""}{r.qty} {r.unit}</span>
                </div>
                <div className="text-[13px] text-stone-900 font-medium mt-1.5">{r.mat}</div>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-stone-500">
                  <span className="font-mono">{r.date}</span>
                  <span className="font-mono text-teal-700">{r.src}</span>
                  <span>{r.who}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        );
      })()}
    </div>
  );
}

function ProcurementPage({ t }) {
  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <Card className="lg:col-span-8 p-0">
          <div className="px-4 md:px-5 py-3 border-b border-stone-200/80 flex items-center justify-between">
            <div className="text-[12.5px] font-semibold text-stone-900">{t.proc.activePO}</div>
            <PrimaryBtn icon="plus">{t.proc.newPO}</PrimaryBtn>
          </div>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[100px_minmax(0,1.4fr)_minmax(0,1fr)_60px_90px_120px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-100 bg-stone-50/40">
              <div className="truncate">ID</div><div>Szállító</div><div>Anyag</div><div className="text-right">Db</div><div>{t.common.eta}</div><div>Státusz</div>
            </div>
            {ACTIVE_PO.map(p => (
              <div key={p.id} className="grid grid-cols-[100px_minmax(0,1.4fr)_minmax(0,1fr)_60px_90px_120px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center hover:bg-stone-50/60">
                <div className="text-[11.5px] font-mono text-stone-500 truncate">{p.id}</div>
                <div className="text-[12.5px] font-medium text-stone-900 truncate">{p.supplier}</div>
                <div className="text-[12px] text-stone-600 truncate">{p.material}</div>
                <div className="text-[12px] tabular-nums text-right">{p.qty}</div>
                <div className="text-[11.5px] font-mono text-stone-500">{p.eta}</div>
                <div className="min-w-0"><StatusPill status={p.status} label={t.status[p.status]} /></div>
              </div>
            ))}
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-stone-100">
            {ACTIVE_PO.map(p => (
              <div key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-stone-500">{p.id}</span>
                  <StatusPill status={p.status} label={t.status[p.status]} />
                </div>
                <div className="text-[13px] font-semibold text-stone-900 mt-1">{p.supplier}</div>
                <div className="text-[12px] text-stone-600 mt-0.5">{p.material}</div>
                <div className="flex items-center gap-4 mt-1.5 text-[11.5px] text-stone-500">
                  <span><span className="tabular-nums font-medium text-stone-700">{p.qty}</span> db</span>
                  <span className="font-mono">{t.common.eta}: {p.eta}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-4 p-0">
          <div className="px-4 md:px-5 py-3 border-b border-stone-200/80 text-[12.5px] font-semibold text-stone-900">{t.proc.suppliers}</div>
          {SUPPLIERS.map(s => (
            <div key={s.name} className="px-4 md:px-5 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-stone-900 truncate">{s.name}</div>
                  <div className="text-[11px] text-stone-500">{s.city}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-medium text-amber-600 tabular-nums">★ {s.rating}</div>
                  <div className="text-[10.5px] text-stone-500 tabular-nums">{s.reliability}% {t.proc.reliability.toLowerCase()}</div>
                </div>
              </div>
              <div className="mt-1.5 text-[10.5px] text-stone-400 font-mono">{t.proc.lastOrder}: {s.lastOrder}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function AnalyticsPage({ t }) {
  const cards = [
    { label: t.ana.waste, value: "7.1%", delta: -9, color: "#0d9488", spark: SPARKS.wasteRate },
    { label: t.ana.capacity, value: "82%", delta: 7, color: "#0d9488", spark: SPARKS.capacity },
    { label: t.ana.oee, value: "81%", delta: 4, color: "#0d9488", spark: SPARKS.oee },
    { label: t.ana.daily, value: "284", unit: t.common.pieces, delta: 12, color: "#b45309", spark: [240, 252, 261, 268, 274, 279, 284] },
  ];
  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5">
          {[t.common.today, t.common.week, t.common.month].map((p, i) => (
            <button key={i} className={`px-2.5 h-7 rounded-md text-[12px] ${i === 1 ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>{p}</button>
          ))}
        </div>
        <div className="flex-1" />
        <GhostBtn icon="download">CSV</GhostBtn>
        <GhostBtn icon="download">PDF</GhostBtn>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {cards.map(c => (
          <Card key={c.label} className="p-4">
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">{c.label}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[26px] font-semibold tabular-nums text-stone-900">{c.value}</span>
              {c.unit && <span className="text-[12px] text-stone-500">{c.unit}</span>}
            </div>
            <div className={`text-[11px] mt-0.5 inline-flex items-center gap-0.5 ${c.delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              <Icon name={c.delta >= 0 ? "up" : "down"} size={11} />{Math.abs(c.delta)}%
            </div>
            <div className="mt-3" style={{ color: c.color }}>
              <Sparkline data={c.spark} width={220} height={48} stroke={c.color} fill={c.color} strokeWidth={1.8} responsive />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="text-[12.5px] font-semibold text-stone-900 mb-1">Gép-szintű hulladék arány (utolsó 30 nap)</div>
        <div className="text-[11.5px] text-stone-500 mb-4">Anyag és gép kombinációjára lebontva</div>
        <div className="space-y-2.5">
          {[
            { name: "Holzma HPP380 · Bükk 18mm",  pct: 6.4 },
            { name: "Holzma HPP380 · MDF 19mm",   pct: 5.2 },
            { name: "Biesse Selco · Tölgy 40mm",  pct: 8.2 },
            { name: "Biesse Selco · Tölgy 22mm",  pct: 7.8 },
            { name: "Holzma HPP380 · MDF 16mm",   pct: 5.9 },
          ].map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_60px] gap-3 items-center">
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-[12px] font-mono text-stone-700 w-[120px] sm:w-[200px] md:w-[260px] shrink-0 truncate">{row.name}</div>
                <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-600" style={{ width: `${row.pct * 8}%` }} />
                </div>
              </div>
              <div className="text-[12px] tabular-nums text-stone-700 text-right">{row.pct}%</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SettingsPage({ t, initialTab }) {
  const tab = initialTab || "company";
  const setTab = () => {}; // navigation is handled by the sidebar; this is now controlled
  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">

      {tab === "company" && (
        <div className="space-y-4">
        <Card className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[640px]">
            {[
              { label: "Cégnév", value: "Doorstar Hungary Zrt." },
              { label: "Adószám", value: "12345678-2-13" },
              { label: "Cím", value: "2600 Vác, Ipari park 14." },
              { label: "Bank", value: "OTP · 11774012-12345678" },
              { label: "Kapcsolat", value: "info@doorstar.hu" },
              { label: "Telefon", value: "+36 27 123 456" },
            ].map((f, i) => (
              <div key={i}>
                <div className="text-[10.5px] uppercase tracking-wide text-stone-500 mb-1">{f.label}</div>
                <input defaultValue={f.value} className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px]" />
              </div>
            ))}
          </div>
        </Card>
        {window.sim.companyProfile && (() => {
          const prof = window.sim.companyProfile();
          const setP = (patch) => window.sim.setCompanyProfile(patch);
          const TONES = [["közvetlen", "Tegező / közvetlen"], ["hivatalos", "Magázó / hivatalos"], ["szakmai", "Szakmai / tömör"]];
          const chip = (active) => `h-7 px-2.5 rounded-lg text-[11px] font-medium border transition ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-stone-500 border-stone-200 hover:border-indigo-300"}`;
          return (
            <Card className="p-5 max-w-[640px]">
              <div className="text-[13px] font-semibold text-stone-800">Cég-önkép — értékrend az értékesítésnek</div>
              <div className="text-[11.5px] text-stone-500 mt-0.5 mb-3">A SAJÁT hangnemünk és azok az értékek/ígéretek, amiket minden ügyfélnél szem előtt kell tartani. Ez jelenik meg az értékesítőnek iránymutatásként.</div>
              <div className="space-y-2.5">
                <div>
                  <div className="text-[10.5px] text-stone-500 mb-1">Kommunikáció hangneme (alapértelmezett)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {TONES.map(([k, l]) => <button key={k} onClick={() => setP({ tone: prof.tone === k ? "" : k })} className={chip(prof.tone === k)}>{l}</button>)}
                  </div>
                </div>
                <label className="block">
                  <span className="text-[10.5px] text-stone-500">Értékeink / amit ígérünk</span>
                  <textarea defaultValue={prof.values || ""} onBlur={(e) => setP({ values: e.target.value })} rows={3}
                    placeholder="pl. precíz határidő, kézműves minőség, őszinte árazás, helyszíni felmérés minden projektnél…"
                    className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400 resize-none leading-relaxed" />
                </label>
                <label className="block">
                  <span className="text-[10.5px] text-stone-500">Amit kerülünk / nem vállalunk</span>
                  <textarea defaultValue={prof.avoid || ""} onBlur={(e) => setP({ avoid: e.target.value })} rows={2}
                    placeholder="pl. nem ígérünk irreális határidőt, nem dolgozunk rajz nélkül, nem vállalunk olcsó bóvli anyagot…"
                    className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400 resize-none leading-relaxed" />
                </label>
                <label className="block">
                  <span className="text-[10.5px] text-stone-500">Pozicionálás / amiben erősek vagyunk</span>
                  <textarea defaultValue={prof.positioning || ""} onBlur={(e) => setP({ positioning: e.target.value })} rows={2}
                    placeholder="pl. egyedi konyha és beépített bútor, tömörfa megmunkálás, belsőépítészekkel való együttműködés…"
                    className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400 resize-none leading-relaxed" />
                </label>
              </div>
            </Card>
          );
        })()}
        </div>
      )}

      {tab === "catalog" && <CatalogPanel />}
      {tab === "branding" && (window.BrandingPanel ? <window.BrandingPanel /> : null)}
      {tab === "audit" && <AuditPanel />}
      {tab === "facilities" && <FacilitiesPanel />}
      {tab === "partners" && <PartnersPanel lang={t === I18N.en ? "en" : "hu"} />}
      {tab === "roles" && <RolesPanel t={t} />}
      {tab === "authority" && (window.AuthorityPanel ? <window.AuthorityPanel /> : null)}
      {tab === "warehouse" && (window.WarehouseLevelsPanel ? <window.WarehouseLevelsPanel /> : null)}
      {tab === "suppliermap" && (window.SupplierMapPanel ? <window.SupplierMapPanel /> : null)}
      {tab === "workflow" && (window.WorkflowSettings ? <window.WorkflowSettings t={t} /> : <StageChainEditor t={t} />)}

      {tab === "integrations" && (
        <Card className="p-8 text-center">
          <div className="text-[13px] font-medium text-stone-700">{t.set.tabs[tab]}</div>
          <div className="text-[11.5px] text-stone-500 mt-1">Tartalom placeholder — ehhez a fülhöz design-folyamat van.</div>
        </Card>
      )}
    </div>
  );
}

window.InventoryPage = InventoryPage;
window.ProcurementPage = ProcurementPage;
window.AnalyticsPage = AnalyticsPage;
window.SettingsPage = SettingsPage;
