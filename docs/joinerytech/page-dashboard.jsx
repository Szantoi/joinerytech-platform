// Page: Dashboard
const { useState: useStateD } = React;

function KpiCard({ label, value, unit, delta, sparkData, sparkColor = "#0d9488", expanded, onToggle, breakdown }) {
  const positive = (delta || 0) >= 0;
  return (
    <Card className="overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-4 hover:bg-stone-50/60 transition">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11.5px] uppercase tracking-wide text-stone-500 font-medium">{label}</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[26px] font-semibold text-stone-900 tabular-nums tracking-tight">{value}</span>
              {unit && <span className="text-[12px] text-stone-500">{unit}</span>}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
              <span className={`inline-flex items-center gap-0.5 ${positive ? "text-emerald-700" : "text-rose-700"}`}>
                <Icon name={positive ? "up" : "down"} size={11} />
                {Math.abs(delta)}%
              </span>
              <span className="text-stone-400">{window.__T.dash.vsLastWeek}</span>
            </div>
          </div>
          <div style={{ color: sparkColor }} className="shrink-0">
            <Sparkline data={sparkData} width={88} height={36} stroke={sparkColor} fill={sparkColor} />
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-stone-400">
          <span>{expanded ? window.__T.common.collapse : window.__T.common.expand}</span>
          <Icon name={expanded ? "up" : "down"} size={13} />
        </div>
      </button>
      {expanded && (
        <div className="border-t border-stone-200/80 bg-stone-50/40 p-4 grid grid-cols-3 gap-3 text-[11.5px]">
          {breakdown.map((b, i) => (
            <div key={i} className="bg-white rounded-lg border border-stone-200/70 p-3">
              <div className="text-stone-500 text-[10.5px] uppercase tracking-wide">{b.label}</div>
              <div className="mt-1 text-[16px] font-semibold text-stone-900 tabular-nums">{b.value}</div>
              {b.note && <div className="text-stone-500 mt-0.5">{b.note}</div>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function DashboardPage({ t, onNav }) {
  window.__T = t;
  const [expanded, setExpanded] = useStateD(null);
  const toggle = (k) => setExpanded(expanded === k ? null : k);

  const kpis = [
    { key: "ordersToday",   label: t.dash.kpi.ordersToday,   value: 12,    unit: t.common.orders, delta: 8,   spark: SPARKS.ordersToday,   color: "#0d9488",
      breakdown: [
        { label: t.orders.types.cabinet, value: "7", note: "58%" },
        { label: t.orders.types.door,    value: "3", note: "25%" },
        { label: t.orders.types.window,  value: "2", note: "17%" },
      ]},
    { key: "inProduction",  label: t.dash.kpi.inProduction,  value: 28,    unit: t.common.orders, delta: 12,  spark: SPARKS.inProduction,  color: "#0d9488",
      breakdown: [
        { label: "Holzma HPP380", value: "12", note: "43%" },
        { label: "Biesse Selco",  value: "9",  note: "32%" },
        { label: "Élzáró + CNC",  value: "7",  note: "25%" },
      ]},
    { key: "stockAlerts",   label: t.dash.kpi.stockAlerts,   value: 3,     unit: "",              delta: -25, spark: SPARKS.stockAlerts,   color: "#b45309",
      breakdown: [
        { label: "Tölgy 22mm",     value: "8 / 15", note: t.status.low },
        { label: "MDF 19mm",       value: "12 / 25", note: t.status.low },
        { label: "Vasalat CLIP",   value: "4 / 50", note: t.status.critical },
      ]},
    { key: "wasteRate",     label: t.dash.kpi.wasteRate,     value: "7.1", unit: "%",             delta: -9,  spark: SPARKS.wasteRate,     color: "#0d9488",
      breakdown: [
        { label: "Bükk 18mm",  value: "6.4%" },
        { label: "Tölgy 40mm", value: "8.2%" },
        { label: "MDF 16mm",   value: "5.9%" },
      ]},
    { key: "oee",           label: t.dash.kpi.oee,           value: 81,    unit: "%",             delta: 4,   spark: SPARKS.oee,           color: "#0d9488",
      breakdown: [
        { label: "Rendelkezés", value: "94%" },
        { label: "Teljesítm.",  value: "89%" },
        { label: "Minőség",     value: "97%" },
      ]},
    { key: "capacity",      label: t.dash.kpi.capacity,      value: 82,    unit: "%",             delta: 7,   spark: SPARKS.capacity,      color: "#0d9488",
      breakdown: [
        { label: "Szabászat",  value: "88%" },
        { label: "Élzárás",    value: "76%" },
        { label: "CNC",        value: "82%" },
      ]},
  ];

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-[18px] md:text-[20px] font-semibold text-stone-900 tracking-tight">{t.dash.greeting}</div>
          <div className="text-[12.5px] text-stone-500 mt-0.5">{t.dash.sub}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] bg-white border border-stone-200 rounded-lg p-0.5">
          {[t.common.today, t.common.week, t.common.month].map((p, i) => (
            <button key={i} className={`px-2.5 h-7 rounded-md ${i === 0 ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map(k => (
          <KpiCard key={k.key} label={k.label} value={k.value} unit={k.unit} delta={k.delta}
                   sparkData={k.spark} sparkColor={k.color}
                   expanded={expanded === k.key} onToggle={() => toggle(k.key)}
                   breakdown={k.breakdown} />
        ))}
      </div>

      <div className="mt-3">
        {typeof MiniKanbanStrip !== "undefined" && <MiniKanbanStrip onNav={onNav} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[13px] font-semibold text-stone-900">{t.dash.todayPlan}</div>
              <div className="text-[11.5px] text-stone-500 mt-0.5">12 {t.dash.cuttingPlans} · 84 {t.dash.sheets} · 3 {t.dash.machinesActive}</div>
            </div>
            <button onClick={() => onNav("production")} className="text-[11.5px] text-teal-700 hover:text-teal-900 font-medium inline-flex items-center gap-1">{t.common.details} <Icon name="chevron" size={12} /></button>
          </div>
          <div className="space-y-2.5">
            {[
              { name: "Holzma HPP380", load: 78, plans: 5, current: "CP-184-A · Bükk 18mm" },
              { name: "Biesse Selco",  load: 64, plans: 4, current: "CP-182-A · Tölgy 40mm" },
              { name: "Élzáró Homag",  load: 42, plans: 3, current: "CP-183-A · MDF 16mm fehér" },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-stone-100 last:border-0">
                <div className="w-9 h-9 rounded-lg bg-stone-100 grid place-items-center text-stone-600">
                  <Icon name="factory" size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-medium text-stone-900">{m.name}</span>
                    <span className="text-[10.5px] text-stone-500 font-mono truncate">{m.current}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-600 rounded-full" style={{ width: `${m.load}%` }} />
                    </div>
                    <span className="text-[11px] text-stone-500 tabular-nums w-9 text-right">{m.load}%</span>
                    <span className="text-[10.5px] text-stone-400">{m.plans} {t.dash.cuttingPlans}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-semibold text-stone-900">{t.dash.recentOrders}</div>
            <button onClick={() => onNav("orders")} className="text-[11.5px] text-teal-700 hover:text-teal-900 font-medium inline-flex items-center gap-1">{t.common.details} <Icon name="chevron" size={12} /></button>
          </div>
          <div className="space-y-1">
            {ORDERS.slice(0, 5).map(o => (
              <button key={o.id} onClick={() => onNav("orders")} className="w-full text-left py-2 px-2 -mx-2 rounded-md hover:bg-stone-50 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium text-stone-900 truncate">{o.customer}</div>
                  <div className="text-[10.5px] font-mono text-stone-400">{o.id}</div>
                </div>
                <StatusPill status={o.status} label={t.status[o.status]} />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

window.DashboardPage = DashboardPage;
