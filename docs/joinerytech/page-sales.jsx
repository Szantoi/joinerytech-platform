// Sales (Értékesítés) world — Dashboard funnel + Quotes + Customers
// Phase 2: clickable rows / cards, QuoteDetail / CreateQuote / CustomerDetail SlideOvers wired in.

const { useState: useStateS, useMemo: useMemoS, useEffect: useEffectS } = React;

// ─────────────────────────────────────────────────────────────────────────
// Shared SlideOver host — used by SalesDashboard / Quotes / Customers.
// All three pages can open the three SlideOvers; this hook keeps the
// open-state and the cross-navigation rules from the spec
// ("egymás fölé stackelve nem kell, zárd be a másikat").
// ─────────────────────────────────────────────────────────────────────────
function useSalesDetail() {
  const [openQuote, setOpenQuote] = useStateS(null);             // QuoteDto
  const [openCustomer, setOpenCustomer] = useStateS(null);       // CustomerDto
  const [createOpen, setCreateOpen] = useStateS(false);
  const [createPrefill, setCreatePrefill] = useStateS(null);     // customer to prefill

  const showQuote = (q) => { setOpenCustomer(null); setOpenQuote(q); };
  const showCustomer = (c) => { setOpenQuote(null); setOpenCustomer(c); };
  const showCreate = (prefill = null) => {
    setOpenQuote(null); setOpenCustomer(null);
    setCreatePrefill(prefill); setCreateOpen(true);
  };
  const closeAll = () => { setOpenQuote(null); setOpenCustomer(null); setCreateOpen(false); };

  // when a Quote subtitle's customer is clicked, open the matching CUSTOMER record
  const openCustomerOfQuote = (q) => {
    const all = (window.sim && window.sim.getState().customers) || window.CUSTOMERS || [];
    const c = all.find(x => x.name === q.customer);
    if (c) showCustomer(c);
  };

  // After CreateQuote success — auto-open detail of new quote (spec)
  const onCreated = (newQuote) => {
    setCreateOpen(false);
    setTimeout(() => setOpenQuote(newQuote), 60);
  };

  return {
    openQuote, openCustomer, createOpen, createPrefill,
    showQuote, showCustomer, showCreate, closeAll,
    setOpenQuote, setOpenCustomer, setCreateOpen,
    openCustomerOfQuote, onCreated,
  };
}

function SalesDetailHost({ s }) {
  return (
    <>
      {s.openQuote && (
        <QuoteDetailSlideOver
          quote={s.openQuote}
          onClose={() => s.setOpenQuote(null)}
          onOpenCustomer={(q) => s.openCustomerOfQuote(q)}
        />
      )}
      {s.openCustomer && (
        <CustomerDetailSlideOver
          customer={s.openCustomer}
          onClose={() => s.setOpenCustomer(null)}
          onOpenQuote={(q) => s.showQuote(q)}
          onCreateQuote={(c) => s.showCreate(c)}
        />
      )}
      <CreateQuoteSlideOver
        open={s.createOpen}
        preselectCustomer={s.createPrefill}
        onClose={() => s.setCreateOpen(false)}
        onCreated={s.onCreated}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sales dashboard
// ─────────────────────────────────────────────────────────────────────────
function SalesDashboard({ onScreen }) {
  const s = useSalesDetail();
  const sim = useSim();
  const QUOTES = sim.quotes;
  const [builderOpen, setBuilderOpen] = useStateS(false);

  const funnel = [
    { stage: "Vázlat",     count: 4, value: 6_200_000,  color: "bg-stone-300" },
    { stage: "Kiküldve",   count: 9, value: 18_400_000, color: "bg-sky-400" },
    { stage: "Elfogadva",  count: 5, value: 24_900_000, color: "bg-emerald-500" },
    { stage: "Gyártásban", count: 7, value: 31_200_000, color: "bg-teal-500" },
    { stage: "Kiszállítva",count: 3, value: 12_800_000, color: "bg-stone-700" },
  ];
  const maxCount = Math.max(...funnel.map(f => f.count));
  const fmt = (n) => (n / 1_000_000).toFixed(1) + "M";

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Heti bevétel",      v: "8.4M Ft",  d: "+12% előző hét" },
          { l: "Nyitott ajánlatok", v: "13",       d: "5 lejár 7 napon belül" },
          { l: "Pipeline érték",    v: "93.5M Ft", d: "28 ajánlat összesen" },
          { l: "Konverziós ráta",   v: "62%",      d: "elfogadás / kiküldés" },
        ].map(card => (
          <Card key={card.l} className="p-4">
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">{card.l}</div>
            <div className="text-[28px] font-semibold tracking-tight text-stone-900 mt-1">{card.v}</div>
            <div className="text-[10.5px] text-stone-500 mt-1">{card.d}</div>
          </Card>
        ))}
      </div>

      <button onClick={() => setBuilderOpen(true)}
        className="w-full h-12 rounded-xl bg-indigo-600 text-white text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-sm shadow-indigo-900/10 transition">
        <Icon name="plus" size={16} /> Új ajánlat
      </button>

      {builderOpen && (
        <ItemBuilder mode="quote" groupBy="cat"
          catalog={[...sim.sellableCatalog(), ...sim.products.map(p => ({ id: p.id, code: p.id, name: p.name, unit: "db", price: p.price, cat: p.cat, supplier: "Saját termék" })), ...(window.intCatalogForBuilder ? window.intCatalogForBuilder() : [])]}
          customers={sim.customers}
          onAddCustomer={(c) => window.sim.addCustomer(c)}
          onClose={() => setBuilderOpen(false)}
          onSubmit={({ header, lines }) => {
            const id = window.sim.createQuote({ customer: header, lines });
            setBuilderOpen(false);
            if (id) { const nq = window.sim.getState().quotes.find(q => q.id === id); if (nq) setTimeout(() => s.showQuote(nq), 60); }
          }} />
      )}

      {/* Pipeline funnel */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[14px] font-semibold text-stone-900">Pipeline</div>
            <div className="text-[11px] text-stone-500">Ajánlattól szállításig — aktuális állapot</div>
          </div>
          <button onClick={() => onScreen("quotes")} className="text-[11.5px] text-indigo-700 font-medium hover:underline">Ajánlatok →</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {funnel.map((f) => {
            const w = (f.count / maxCount) * 100;
            return (
              <div key={f.stage} className="space-y-2">
                <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium">{f.stage}</div>
                <div className="text-[26px] font-semibold tracking-tight text-stone-900 leading-none">{f.count}</div>
                <div className="text-[11px] text-stone-600 font-mono">{fmt(f.value)} Ft</div>
                <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                  <div className={`h-full ${f.color}`} style={{ width: w + "%" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* SVG funnel visualization */}
        <div className="mt-6 relative">
          <svg viewBox="0 0 600 120" className="w-full h-24" preserveAspectRatio="none">
            {funnel.map((f, i) => {
              const x0 = (i / funnel.length) * 600;
              const x1 = ((i + 1) / funnel.length) * 600;
              const h0 = 100 - (i / funnel.length) * 50;
              const h1 = 100 - ((i + 1) / funnel.length) * 50;
              const y0 = (120 - h0) / 2;
              const y1 = (120 - h1) / 2;
              const colors = ["#d6d3d1", "#7dd3fc", "#10b981", "#14b8a6", "#44403c"];
              return (
                <path key={i}
                  d={`M ${x0},${y0} L ${x1},${y1} L ${x1},${y1 + h1} L ${x0},${y0 + h0} Z`}
                  fill={colors[i]} opacity="0.85" />
              );
            })}
          </svg>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[14px] font-semibold text-stone-900">Lejáró ajánlatok</div>
              <div className="text-[11px] text-stone-500">Következő 14 nap — kattints egy sorra a részletekért</div>
            </div>
            <button onClick={() => onScreen("quotes")} className="text-[11.5px] text-indigo-700 font-medium hover:underline">Mind →</button>
          </div>
          <div className="space-y-1.5">
            {QUOTES.filter(q => q.status === "sent").slice(0, 4).map(q => (
              <button key={q.id} onClick={() => s.showQuote(q)}
                className="w-full text-left flex flex-col gap-1.5 md:grid md:grid-cols-[1fr_140px_120px_90px] md:gap-3 px-3 py-2.5 rounded-lg border border-stone-100 hover:bg-stone-50/60 hover:border-stone-200 md:items-center transition">
                <div className="flex items-center justify-between gap-2 md:block min-w-0">
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium text-stone-900 truncate">{q.customer}</div>
                    <div className="text-[10.5px] text-stone-500 font-mono">{q.id}</div>
                  </div>
                  <span className={`md:hidden shrink-0 px-2 h-6 inline-flex items-center justify-center rounded-full text-[10px] font-medium ${QUOTE_TONE[q.status].bg} ${QUOTE_TONE[q.status].fg}`}>{QUOTE_TONE[q.status].label}</span>
                </div>
                <div className="flex items-center justify-between gap-2 md:contents">
                  <div className="text-[11px] text-stone-600 font-mono">{q.expires}</div>
                  <div className="text-[12px] font-semibold text-stone-900 font-mono md:text-right">{(q.value/1_000_000).toFixed(1)}M Ft</div>
                </div>
                <span className={`hidden md:inline-flex px-2 h-6 items-center justify-center rounded-full text-[10px] font-medium ${QUOTE_TONE[q.status].bg} ${QUOTE_TONE[q.status].fg}`}>{QUOTE_TONE[q.status].label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-[14px] font-semibold text-stone-900 mb-3">Top ügyfelek (LTV)</div>
          <div className="space-y-2">
            {[...CUSTOMERS].sort((a, b) => b.ltv - a.ltv).slice(0, 5).map((c, i) => (
              <button key={c.id} onClick={() => s.showCustomer(c)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-stone-50/60 transition text-left">
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center text-[10px] font-semibold">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-stone-900 truncate">{c.name}</div>
                  <div className="text-[10.5px] text-stone-500">{c.city}</div>
                </div>
                <div className="text-[11.5px] font-semibold text-stone-900 font-mono">{(c.ltv/1_000_000).toFixed(1)}M</div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <SalesDetailHost s={s} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Quotes list
// ─────────────────────────────────────────────────────────────────────────
function SalesQuotes() {
  const s = useSalesDetail();
  const sim = useSim();
  const QUOTES = sim.quotes;

  // Deep-link: auto-open a specific quote on mount if signalled
  useEffectS(() => {
    const p = window._pendingOpen;
    if (!p || p.type !== "quote") return;
    window._pendingOpen = null;
    const q = sim.quotes.find(x => x.id === p.id);
    if (q) s.showQuote(q);
  }, []);
  const [builderOpen, setBuilderOpen] = useStateS(false);
  const [filter, setFilter] = useStateS("all");
  const filters = [
    { key: "all",      label: "Összes",       count: QUOTES.length },
    { key: "draft",    label: "Vázlat",       count: QUOTES.filter(q => q.status === "draft").length },
    { key: "sent",     label: "Kiküldve",     count: QUOTES.filter(q => q.status === "sent").length },
    { key: "approved", label: "Elfogadva",    count: QUOTES.filter(q => q.status === "approved").length },
    { key: "expired",  label: "Lejárt",       count: QUOTES.filter(q => q.status === "expired").length },
  ];
  const list = filter === "all" ? QUOTES : QUOTES.filter(q => q.status === filter);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 h-8 rounded-lg text-[11.5px] font-medium border transition inline-flex items-center gap-1.5 ${
              filter === f.key ? "bg-indigo-50 border-indigo-300 text-indigo-800" : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"
            }`}>
            {f.label}
            <span className={`px-1.5 rounded text-[10px] tabular-nums ${filter === f.key ? "bg-indigo-100 text-indigo-700" : "bg-stone-100 text-stone-600"}`}>{f.count}</span>
          </button>
        ))}
        <span className="flex-1" />
        <button onClick={() => setBuilderOpen(true)}
          className="h-8 px-3 bg-indigo-600 text-white text-[11.5px] font-medium rounded-lg hover:bg-indigo-700 inline-flex items-center gap-1.5 shadow-sm shadow-indigo-900/10">
          <Icon name="plus" size={12} />Új ajánlat
        </button>
      </div>
      {builderOpen && (
        <ItemBuilder mode="quote" groupBy="cat"
          catalog={[...sim.sellableCatalog(), ...sim.products.map(p => ({ id: p.id, code: p.id, name: p.name, unit: "db", price: p.price, cat: p.cat, supplier: "Saját termék" })), ...(window.intCatalogForBuilder ? window.intCatalogForBuilder() : [])]}
          customers={sim.customers}
          onAddCustomer={(c) => window.sim.addCustomer(c)}
          onClose={() => setBuilderOpen(false)}
          onSubmit={({ header, lines }) => {
            const id = window.sim.createQuote({ customer: header, lines });
            setBuilderOpen(false);
            if (id) { const nq = window.sim.getState().quotes.find(q => q.id === id); if (nq) setTimeout(() => s.showQuote(nq), 60); }
          }} />
      )}

      <Card className="p-0 overflow-hidden">
        <table className="hidden md:table w-full text-[12px]">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/50 text-left">
              <th className="px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Azonosító</th>
              <th className="px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Ügyfél</th>
              <th className="px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Dátum</th>
              <th className="px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Lejár</th>
              <th className="px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Tételek</th>
              <th className="px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Felelős</th>
              <th className="px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Státusz</th>
              <th className="px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium text-right">Érték</th>
            </tr>
          </thead>
          <tbody>
            {list.map(q => {
              const tone = QUOTE_TONE[q.status] || QUOTE_TONE.draft;
              return (
                <tr key={q.id} onClick={() => s.showQuote(q)}
                  className="border-b border-stone-50 last:border-0 hover:bg-stone-50/60 cursor-pointer transition">
                  <td className="px-5 py-2.5 font-mono text-stone-700">{q.id}</td>
                  <td className="px-5 py-2.5 font-medium text-stone-900">{q.customer}</td>
                  <td className="px-5 py-2.5 text-stone-600 font-mono">{q.date}</td>
                  <td className="px-5 py-2.5 text-stone-600 font-mono">{q.expires}</td>
                  <td className="px-5 py-2.5 text-stone-600">{q.items}</td>
                  <td className="px-5 py-2.5 text-stone-700">{q.owner}</td>
                  <td className="px-5 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${tone.bg} ${tone.fg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                      {tone.label}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold text-stone-900 font-mono">{q.value.toLocaleString("hu-HU")} Ft</td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-[12px] text-stone-400">Nincs ajánlat ebben a státuszban.</td></tr>
            )}
          </tbody>
        </table>
        {/* Mobile: condensed tappable rows → detail panel */}
        <div className="md:hidden divide-y divide-stone-100">
          {list.map(q => {
            const tone = QUOTE_TONE[q.status] || QUOTE_TONE.draft;
            return (
              <button key={q.id} onClick={() => s.showQuote(q)}
                className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-stone-50/60 active:bg-stone-100/60 transition">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-stone-900 truncate">{q.customer}</span>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10px] font-medium ${tone.bg} ${tone.fg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{tone.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono mt-0.5 truncate">{q.id} · lejár {q.expires}</div>
                </div>
                <div className="text-[13px] font-semibold text-stone-900 font-mono shrink-0">{(q.value/1_000_000).toFixed(1)}M</div>
                <Icon name="chevron" size={15} className="text-stone-300 shrink-0" />
              </button>
            );
          })}
          {list.length === 0 && (
            <div className="px-4 py-10 text-center text-[12px] text-stone-400">Nincs ajánlat ebben a státuszban.</div>
          )}
        </div>
      </Card>

      <SalesDetailHost s={s} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Customers list
// ─────────────────────────────────────────────────────────────────────────
function SalesCustomers() {
  const s = useSalesDetail();
  const sim = useSim();
  const CUSTOMERS = sim.customers;
  const [query, setQuery] = useStateS("");
  const [newCustOpen, setNewCustOpen] = useStateS(false);

  // Deep-link: auto-open a specific customer on mount if signalled
  useEffectS(() => {
    const p = window._pendingOpen;
    if (!p || p.type !== "customer") return;
    window._pendingOpen = null;
    const c = (CUSTOMERS || []).find(x => x.name === p.name || x.id === p.id);
    if (c) s.showCustomer(c);
  }, []);

  const list = useMemoS(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CUSTOMERS;
    return CUSTOMERS.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      (c.contact || "").toLowerCase().includes(q)
    );
  }, [query, CUSTOMERS]);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Ügyfél keresése…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" />
          <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
        </div>
        <span className="hidden sm:block flex-1" />
        <button onClick={() => setNewCustOpen(true)} className="h-9 px-3 bg-indigo-600 text-white text-[11.5px] font-medium rounded-lg hover:bg-indigo-700 inline-flex items-center gap-1.5 shrink-0">
          <Icon name="plus" size={12} /><span className="hidden sm:inline">Új ügyfél</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map(c => {
          const ext = (window.CUSTOMER_EXTRA || {})[c.id] || { type: "active" };
          const typeTone = (window.CUSTOMER_TYPE_MAP || {})[ext.type] || {};
          return (
            <Card key={c.id} className="p-5 cursor-pointer hover:border-stone-300 hover:shadow-sm transition group"
              interactive={false}>
              <button onClick={() => s.showCustomer(c)} className="block w-full text-left">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${typeTone.gradFrom || "from-indigo-400"} ${typeTone.gradTo || "to-indigo-600"} grid place-items-center text-[12px] font-semibold text-white`}>
                    {c.name.split(" ").slice(0, 2).map(x => x[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-stone-900 truncate group-hover:text-indigo-700 transition">{c.name}</div>
                    <div className="text-[10.5px] text-stone-500">{c.city} · {c.since} óta</div>
                  </div>
                  <span className={`px-2 h-5 inline-flex items-center rounded-full text-[10px] font-medium ${typeTone.bg || "bg-stone-100"} ${typeTone.fg || "text-stone-600"}`}>
                    {typeTone.label || "—"}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-stone-100 space-y-1 text-[11.5px]">
                  <div className="flex justify-between"><span className="text-stone-500">Kapcsolattartó</span><span className="font-medium text-stone-900 truncate ml-2">{c.contact}</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">E-mail</span><span className="font-mono text-stone-700 truncate ml-2">{c.email}</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">Telefon</span><span className="font-mono text-stone-700">{c.phone}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="px-2 py-2 rounded-lg bg-stone-50 text-center">
                    <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Nyitott</div>
                    <div className="text-[15px] font-semibold text-stone-900">{c.openOrders}</div>
                  </div>
                  <div className="px-2 py-2 rounded-lg bg-stone-50 text-center">
                    <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">LTV</div>
                    <div className="text-[15px] font-semibold text-stone-900">{(c.ltv/1_000_000).toFixed(1)}M</div>
                  </div>
                </div>
              </button>
            </Card>
          );
        })}
        {list.length === 0 && (
          <div className="col-span-full text-center py-10 text-[12px] text-stone-400">
            Nincs találat — próbálj más keresőkifejezést.
          </div>
        )}
      </div>

      <SalesDetailHost s={s} />
      {newCustOpen && (
        <CustomerPickerDialog customers={CUSTOMERS} initialMode="new"
          onAddCustomer={(c) => window.sim.addCustomer(c)}
          onPick={() => setNewCustOpen(false)}
          onClose={() => setNewCustOpen(false)} />
      )}
    </div>
  );
}

window.SalesDashboard = SalesDashboard;
window.SalesQuotes = SalesQuotes;
window.SalesCustomers = SalesCustomers;
