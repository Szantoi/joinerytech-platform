// ─────────────────────────────────────────────────────────────────
// page-finance-2.jsx — PÉNZÜGY világ (2/2)
//   Áttekintés (cash-flow / kintlévőség / lejárt) · Bejövő (szállítói) számlák · Kifizetések.
//   A megosztott elemek (InvoiceSlideOver, FinInvoiceRow, FinStatusPill, finFmt, FinMiniStat,
//   FinMethodBadge) a page-finance.jsx-ből, window-ról érhetők el.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateF2 } = React;

// Nagy KPI-kártya (áttekintő)
function FinKpi({ label, value, sub, tone = "stone", icon }) {
  const tones = {
    amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700", sky: "bg-sky-50 text-sky-700", stone: "bg-stone-100 text-stone-600",
  };
  return (
    <div className="bg-white border border-stone-200/80 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`w-8 h-8 rounded-lg grid place-items-center ${tones[tone]}`}><Icon name={icon} size={16} /></div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">{label}</div>
      </div>
      <div className="text-[22px] font-semibold text-stone-900 tabular-nums leading-none">{value}</div>
      {sub && <div className="text-[11.5px] text-stone-500 mt-1.5">{sub}</div>}
    </div>
  );
}

// ── Áttekintés ────────────────────────────────────────────────────────────────
function FinanceDashboard({ onScreen }) {
  const sim = useSim();
  const stats = window.sim.finStats();
  const [openInv, setOpenInv] = useStateF2(null);

  const all = sim.finInvoices || [];
  const overdueOut = all.filter((i) => i.dir === "out" && window.sim.finIsOverdue(i))
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  const duePayables = all.filter((i) => i.dir === "in" && (i.status === "issued" || i.status === "partial"))
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

  const liveOpen = openInv ? (all.find((x) => x.id === openInv.id) || null) : null;
  const cashMax = Math.max(stats.cashIn, stats.cashOut, 1);
  const monthLabel = "2026. április";

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto space-y-5">
      {/* KPI sor */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <FinKpi label="Kintlévőség" tone="amber" icon="receipt"
          value={finFmt(stats.receivable, "HUF")}
          sub={stats.receivableOverdue > 0 ? `ebből lejárt: ${finFmt(stats.receivableOverdue, "HUF")}` : "nincs lejárt tétel"} />
        <FinKpi label="Fizetendő" tone="sky" icon="external"
          value={finFmt(stats.payable, "HUF")}
          sub={stats.payableOverdue > 0 ? `ebből lejárt: ${finFmt(stats.payableOverdue, "HUF")}` : "nincs lejárt tétel"} />
        <FinKpi label="Lejárt összesen" tone="rose" icon="alert"
          value={finFmt(stats.receivableOverdue + stats.payableOverdue, "HUF")}
          sub={`${overdueOut.length} kintlévő · ${duePayables.filter((i) => window.sim.finIsOverdue(i)).length} fizetendő`} />
        <FinKpi label="Nettó pénzáram" tone={stats.net >= 0 ? "emerald" : "rose"} icon="analytics"
          value={(stats.net >= 0 ? "+" : "") + finFmt(stats.net, "HUF")}
          sub={`${monthLabel}`} />
      </div>

      {/* Cash-flow + piszkozat */}
      <div className="grid lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white border border-stone-200/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[13px] font-semibold text-stone-800">Pénzáram — {monthLabel}</div>
            <div className="text-[11px] text-stone-400">befizetések vs. kifizetések</div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-[11.5px] mb-1">
                <span className="text-stone-500 inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Bevétel (befizetés)</span>
                <span className="font-semibold text-stone-800 tabular-nums">{finFmt(stats.cashIn, "HUF")}</span>
              </div>
              <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: (stats.cashIn / cashMax * 100) + "%" }} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11.5px] mb-1">
                <span className="text-stone-500 inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" />Kiadás (kifizetés)</span>
                <span className="font-semibold text-stone-800 tabular-nums">{finFmt(stats.cashOut, "HUF")}</span>
              </div>
              <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden"><div className="h-full rounded-full bg-rose-400" style={{ width: (stats.cashOut / cashMax * 100) + "%" }} /></div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-[12px] text-stone-500">Egyenleg</span>
            <span className={`text-[16px] font-bold tabular-nums ${stats.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{(stats.net >= 0 ? "+" : "") + finFmt(stats.net, "HUF")}</span>
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-xl p-4 flex flex-col">
          <div className="text-[13px] font-semibold text-stone-800 mb-3">Teendők</div>
          <div className="space-y-2 flex-1">
            <button onClick={() => onScreen && onScreen("outgoing")} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-left transition">
              <span className="w-7 h-7 rounded-lg bg-stone-200 text-stone-600 grid place-items-center shrink-0"><Icon name="file" size={14} /></span>
              <span className="text-[12px] text-stone-700 flex-1">Kiállítatlan piszkozat</span>
              <span className="text-[13px] font-semibold text-stone-900">{stats.draftCount}</span>
            </button>
            <button onClick={() => onScreen && onScreen("outgoing")} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-left transition">
              <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 grid place-items-center shrink-0"><Icon name="alert" size={14} /></span>
              <span className="text-[12px] text-rose-700 flex-1">Lejárt kintlévőség</span>
              <span className="text-[13px] font-semibold text-rose-700">{overdueOut.length}</span>
            </button>
            <button onClick={() => onScreen && onScreen("incoming")} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-left transition">
              <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 grid place-items-center shrink-0"><Icon name="external" size={14} /></span>
              <span className="text-[12px] text-sky-700 flex-1">Nyitott fizetendő</span>
              <span className="text-[13px] font-semibold text-sky-700">{duePayables.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lejárt kintlévőségek */}
      <div className="grid lg:grid-cols-2 gap-3">
        <Card>
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <div className="text-[13px] font-semibold text-stone-800">Lejárt kintlévőségek</div>
            <button onClick={() => onScreen && onScreen("outgoing")} className="text-[11.5px] text-emerald-700 hover:underline">Összes →</button>
          </div>
          {overdueOut.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-stone-400">Nincs lejárt kintlévőség. 🎉</div>
          ) : (
            <div>{overdueOut.slice(0, 5).map((inv) => <FinInvoiceRow key={inv.id} inv={inv} onOpen={setOpenInv} />)}</div>
          )}
        </Card>
        <Card>
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <div className="text-[13px] font-semibold text-stone-800">Esedékes fizetendők</div>
            <button onClick={() => onScreen && onScreen("incoming")} className="text-[11.5px] text-emerald-700 hover:underline">Összes →</button>
          </div>
          {duePayables.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-stone-400">Nincs nyitott fizetendő.</div>
          ) : (
            <div>{duePayables.slice(0, 5).map((inv) => <FinInvoiceRow key={inv.id} inv={inv} onOpen={setOpenInv} />)}</div>
          )}
        </Card>
      </div>

      <InvoiceSlideOver inv={liveOpen} onClose={() => setOpenInv(null)} />
    </div>
  );
}

// ── Bejövő (szállítói) számlák ────────────────────────────────────────────────
const FIN_IN_FILTERS = [
  { key: "all", label: "Mind" },
  { key: "open", label: "Nyitott" },
  { key: "overdue", label: "Lejárt" },
  { key: "paid", label: "Fizetve" },
];

function FinanceIncoming() {
  const sim = useSim();
  const [openInv, setOpenInv] = useStateF2(null);
  const [q, setQ] = useStateF2("");
  const [filter, setFilter] = useStateF2("all");

  const all = (sim.finInvoices || []).filter((i) => i.dir === "in");
  const rows = all.filter((i) => {
    const eff = window.sim.finEffectiveStatus(i);
    if (filter === "open" && !(eff === "issued" || eff === "partial" || eff === "overdue")) return false;
    if (filter === "overdue" && eff !== "overdue") return false;
    if (filter === "paid" && i.status !== "paid") return false;
    if (q && !(`${i.id} ${i.party} ${i.orderRef || ""} ${i.extNo || ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  const liveOpen = openInv ? (sim.finInvoices.find((x) => x.id === openInv.id) || null) : null;

  const payableTotal = all.filter((i) => i.status === "issued" || i.status === "partial").reduce((a, i) => a + finToHuf(window.sim.finBalance(i), i), 0);
  const overdueCount = all.filter((i) => window.sim.finIsOverdue(i)).length;

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <FinMiniStat label="Fizetendő összesen" value={finFmt(payableTotal, "HUF")} tone="sky" icon="external" />
        <FinMiniStat label="Lejárt fizetendő" value={`${overdueCount} db`} tone={overdueCount ? "rose" : "stone"} icon="alert" />
        <FinMiniStat label="Szállítói számla" value={`${all.length} db`} tone="stone" icon="receipt" />
      </div>

      <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 px-3.5 py-2.5 mb-4 flex items-start gap-2 text-[11.5px] text-emerald-800">
        <Icon name="info" size={14} className="mt-px shrink-0 text-emerald-600" />
        <span>A szállítói számlák a Beszerzésből kerülnek ide gyűjtésre. A Beszerzés csak a megrendelés <span className="font-medium">leszámlázottságát</span> jelzi — a teljes pénzügyi kezelés (kifizetés, sztornó) itt történik.</span>
      </div>

      <Card>
        <div className="px-3 md:px-4 py-3 border-b border-stone-100 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {FIN_IN_FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`h-7 px-2.5 rounded-full text-[11.5px] font-medium transition ${filter === f.key ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>{f.label}</button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="relative">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés: szállító, számlaszám…"
              className="h-8 w-48 pl-8 pr-3 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-emerald-400 bg-stone-50/40" />
            <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs a szűrésnek megfelelő számla.</div>
        ) : (
          <div>{rows.map((inv) => <FinInvoiceRow key={inv.id} inv={inv} onOpen={setOpenInv} />)}</div>
        )}
      </Card>

      <InvoiceSlideOver inv={liveOpen} onClose={() => setOpenInv(null)} />
    </div>
  );
}

// ── Kifizetések / pénzmozgások ────────────────────────────────────────────────
function FinancePayments() {
  const sim = useSim();
  const [dir, setDir] = useStateF2("all"); // all | in | out
  const [openInv, setOpenInv] = useStateF2(null);

  const invById = {};
  (sim.finInvoices || []).forEach((i) => { invById[i.id] = i; });
  const pays = (sim.finPayments || [])
    .map((p) => ({ ...p, inv: invById[p.invoiceId] }))
    .filter((p) => p.inv)
    .filter((p) => dir === "all" ? true : p.inv.dir === dir)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  let totalIn = 0, totalOut = 0;
  (sim.finPayments || []).forEach((p) => {
    const inv = invById[p.invoiceId]; if (!inv) return;
    const huf = finToHuf(p.amount, inv);
    if (inv.dir === "out") totalIn += huf; else totalOut += huf;
  });
  const liveOpen = openInv ? (sim.finInvoices.find((x) => x.id === openInv.id) || null) : null;

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1000px] mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <FinMiniStat label="Összes bevétel" value={finFmt(totalIn, "HUF")} tone="emerald" icon="down" />
        <FinMiniStat label="Összes kiadás" value={finFmt(totalOut, "HUF")} tone="rose" icon="up" />
        <FinMiniStat label="Egyenleg" value={(totalIn - totalOut >= 0 ? "+" : "") + finFmt(totalIn - totalOut, "HUF")} tone={totalIn - totalOut >= 0 ? "emerald" : "rose"} icon="analytics" />
      </div>

      <Card>
        <div className="px-3 md:px-4 py-3 border-b border-stone-100 flex items-center gap-1.5">
          {[["all", "Mind"], ["out", "Bevétel"], ["in", "Kiadás"]].map(([k, lbl]) => (
            <button key={k} onClick={() => setDir(k)}
              className={`h-7 px-2.5 rounded-full text-[11.5px] font-medium transition ${dir === k ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>{lbl}</button>
          ))}
        </div>
        {pays.length === 0 ? (
          <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs rögzített pénzmozgás.</div>
        ) : (
          <div>
            {pays.map((p) => {
              const isIn = p.inv.dir === "out"; // kimenő számla befizetése = pénz BE
              return (
                <button key={p.id} onClick={() => setOpenInv(p.inv)}
                  className="w-full flex items-center gap-3 px-3 md:px-4 py-3 hover:bg-stone-50 text-left border-b border-stone-100 last:border-0 transition">
                  <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${isIn ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                    <Icon name={isIn ? "down" : "up"} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-stone-900 truncate">{p.inv.party}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono text-stone-500">{p.inv.id}</span>
                      <FinMethodBadge method={p.method} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[13px] font-semibold tabular-nums ${isIn ? "text-emerald-600" : "text-rose-600"}`}>{isIn ? "+" : "−"}{finFmt(p.amount, p.inv.currency)}</div>
                    <div className="text-[10.5px] font-mono text-stone-400">{p.date}</div>
                  </div>
                  <Icon name="chevron" size={15} className="text-stone-300 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <InvoiceSlideOver inv={liveOpen} onClose={() => setOpenInv(null)} />
    </div>
  );
}

Object.assign(window, { FinKpi, FinanceDashboard, FinanceIncoming, FinancePayments });
