// ──────────────────────────────────────────────────────────────────────────
// page-trade.jsx — KERESKEDELEM világ: Áttekintés (dashboard) + Pult (counter sale)
//   Lapszabászoknak (C1), vasalat-boltoknak (C2), design-üzleteknek.
//   Egyetlen igazságforrás: window.sim. Árazás: window.TradeEngine.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useTr, useMemo: useTrM } = React;
const TE = window.TradeEngine;

// ── kis közös elemek ────────────────────────────────────────────────────────
function TrStockDot({ p, withLabel = false }) {
  const tr = TE.trendOf(p);
  const tone = TRADE_STOCK_TONE[tr];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
      <span className={`tabular-nums ${tone.fg}`}>{p.onHand} {p.unit}</span>
      {withLabel && <span className="text-stone-400">· {tone.label}</span>}
    </span>
  );
}

function TrKpi({ label, value, sub, tone = "stone", accentValue = false }) {
  return (
    <div className="bg-white border border-stone-200/80 rounded-xl px-4 py-3.5">
      <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">{label}</div>
      <div className={`text-[24px] md:text-[26px] font-semibold tracking-tight tabular-nums mt-1 ${accentValue ? "text-orange-700" : "text-stone-900"}`}>{value}</div>
      {sub && <div className="text-[11px] text-stone-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ÁTTEKINTÉS — dashboard
// ════════════════════════════════════════════════════════════════════════════
function TradeDashboard({ onScreen }) {
  const sim = useSim();
  const cats = sim.tradeCategories || [];
  const products = sim.tradeProducts || [];
  const sales = sim.tradeSales || [];
  const cuts = sim.cuttingOrders || [];
  const catById = useTrM(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);

  // "ma" = a legutóbbi eladási dátum
  const todayStr = useTrM(() => sales.reduce((m, s) => (s.date > m ? s.date : m), sales[0] ? sales[0].date : ""), [sales]);
  const todaySales = sales.filter((s) => s.date === todayStr && (s.status || "paid") === "paid");
  const dayNet = todaySales.reduce((a, s) => a + s.net, 0);
  const dayProfit = todaySales.reduce((a, s) => a + s.profit, 0);
  const dayMargin = dayNet > 0 ? (dayProfit / dayNet) * 100 : 0;
  const openCuts = cuts.filter((c) => c.status !== "handed" && c.status !== "rejected").length;
  const lowStock = products.filter((p) => TE.trendOf(p) !== "ok").sort((a, b) => TE.trendOf(a) === "critical" ? -1 : 1);
  const marginTone = TE.marginTone(dayMargin);

  // top termékek (mai + összes eladás aggregálva nettó szerint)
  const topProducts = useTrM(() => {
    const agg = {};
    sales.forEach((s) => (s.lines || []).forEach((l) => {
      agg[l.name] = agg[l.name] || { name: l.name, qty: 0, net: 0 };
      agg[l.name].qty += l.qty; agg[l.name].net += l.unitPrice * l.qty;
    }));
    return Object.values(agg).sort((a, b) => b.net - a.net).slice(0, 5);
  }, [sales]);
  const topMax = topProducts[0] ? topProducts[0].net : 1;

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[16px] font-semibold tracking-tight text-stone-900">Kereskedelem — áttekintés</div>
          <div className="text-[11.5px] text-stone-500">Napi forgalom, árrés-egészség és bolti készlet egy helyen.</div>
        </div>
        <div className="flex items-center gap-2">
          <GhostBtn icon="orders" onClick={() => onScreen("cutting")}>Szabás-rendelések</GhostBtn>
          <PrimaryBtn icon="plus" onClick={() => onScreen("counter")}>Új eladás</PrimaryBtn>
        </div>
      </div>

      {/* KPI sor */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TrKpi label="Napi forgalom (nettó)" value={TE.fmtHuf(dayNet)} sub={`Bruttó ${TE.fmtHuf(TE.gross(dayNet))}`} accentValue />
        <TrKpi label="Átlag árrés ma" value={TE.fmtPct(dayMargin)} sub={`Fedezet ${TE.fmtHuf(dayProfit)}`} />
        <TrKpi label="Tranzakció ma" value={todaySales.length} sub={`${cats.length} árukategória`} />
        <TrKpi label="Nyitott szabás" value={openCuts} sub={`${cuts.length} rendelés összesen`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Mai eladások */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-200/80 flex items-center justify-between">
              <div className="text-[13px] font-semibold text-stone-900">Mai eladások</div>
              <div className="text-[11px] text-stone-500 tabular-nums">{todaySales.length} tétel</div>
            </div>
            {todaySales.length === 0 && <div className="px-5 py-8 text-center text-[12px] text-stone-400">Ma még nincs rögzített eladás.</div>}
            {todaySales.map((s) => {
              const mTone = TE.marginTone(s.net > 0 ? (s.profit / s.net) * 100 : 0);
              return (
                <div key={s.id} className="px-5 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-700 grid place-items-center shrink-0">
                    <Icon name="storefront" size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-stone-900 truncate">{s.customer} <span className="text-stone-400 font-normal">· {s.time}</span></div>
                    <div className="text-[11px] text-stone-500 truncate font-mono">{s.id} · {s.payment} · {(s.lines || []).length} tétel{(s.services || []).length ? ` + ${s.services.length} szolg.` : ""}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-semibold tabular-nums text-stone-900">{TE.fmtHuf(s.net)}</div>
                    <div className={`text-[10.5px] tabular-nums ${mTone.fg}`}>+{TE.fmtHuf(s.profit)}</div>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Top termékek */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-200/80 text-[13px] font-semibold text-stone-900">Top termékek (forgalom)</div>
            <div className="px-5 py-3 space-y-2.5">
              {topProducts.map((t) => (
                <div key={t.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="text-stone-700 truncate">{t.name}</span>
                    <span className="tabular-nums text-stone-500 shrink-0">{t.qty} db · <span className="font-semibold text-stone-800">{TE.fmtHuf(t.net)}</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.max(4, (t.net / topMax) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* jobb oszlop */}
        <div className="space-y-4">
          {/* Árrés kategóriánként */}
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-200/80 flex items-center justify-between">
              <div className="text-[13px] font-semibold text-stone-900">Árrés kategóriánként</div>
              <button onClick={() => onScreen("pricing")} className="text-[11px] text-orange-700 font-medium hover:underline">Motor →</button>
            </div>
            <div className="px-4 py-3 space-y-3">
              {cats.map((c) => {
                const margin = TE.markupToMargin(c.markup);
                const tone = TRADE_CAT_TONE[c.color] || TRADE_CAT_TONE.stone;
                const mTone = TE.marginTone(margin);
                return (
                  <div key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="inline-flex items-center gap-1.5 text-stone-700 truncate">
                        <span className={`w-2 h-2 rounded-full ${tone.dot}`} />{c.short}
                      </span>
                      <span className="tabular-nums shrink-0">
                        <span className="text-stone-500">{TE.fmtX(c.markup)}</span>
                        <span className={`ml-2 font-semibold ${mTone.fg}`}>{TE.fmtPct(margin)}</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                      <div className={`h-full rounded-full ${mTone.bar}`} style={{ width: `${Math.min(100, margin)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Alacsony készlet */}
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-200/80 flex items-center justify-between">
              <div className="text-[13px] font-semibold text-stone-900">Alacsony készlet</div>
              <span className="text-[11px] tabular-nums text-stone-500">{lowStock.length} tétel</span>
            </div>
            {lowStock.length === 0 && <div className="px-4 py-6 text-center text-[12px] text-stone-400">Minden tétel a minimum felett.</div>}
            {lowStock.map((p) => {
              const tr = TE.trendOf(p); const tone = TRADE_STOCK_TONE[tr];
              return (
                <div key={p.id} className="px-4 py-2.5 border-b border-stone-100 last:border-0 flex items-center gap-2.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tone.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-stone-800 truncate">{p.name}</div>
                    <div className="text-[10.5px] text-stone-400 font-mono truncate">{p.sku}</div>
                  </div>
                  <div className={`text-[11.5px] tabular-nums text-right shrink-0 ${tone.fg}`}>
                    {p.onHand} / <span className="text-stone-400">{p.min}</span> {p.unit}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PULT — counter sale
// ════════════════════════════════════════════════════════════════════════════
function TradeCounter() {
  const sim = useSim();
  const cats = sim.tradeCategories || [];
  const products = sim.tradeProducts || [];
  const services = sim.tradeServices || [];
  const catById = useTrM(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);

  const [filterCat, setFilterCat] = useTr("all");
  const [q, setQ] = useTr("");
  const [cart, setCart] = useTr([]);          // [{id,name,unit,unitPrice,unitCost,qty}]
  const [svc, setSvc] = useTr([]);            // [{id,name,unit,rate,qty}]
  const [customer, setCustomer] = useTr("");
  const [payment, setPayment] = useTr("Készpénz");
  const [mobileCart, setMobileCart] = useTr(false);
  const [lastReceipt, setLastReceipt] = useTr(null);

  const filtered = products.filter((p) => {
    if (filterCat !== "all" && p.catId !== filterCat) return false;
    if (q) { const n = q.toLowerCase(); if (!p.name.toLowerCase().includes(n) && !p.sku.toLowerCase().includes(n)) return false; }
    return true;
  });

  const addToCart = (p) => {
    const cat = catById[p.catId];
    const price = TE.sellOf(p, cat);
    setLastReceipt(null);
    setCart((c) => {
      const i = c.findIndex((x) => x.id === p.id);
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...c, { id: p.id, name: p.name, unit: p.unit, unitPrice: price, unitCost: p.purchase, qty: 1 }];
    });
  };
  const setQty = (id, qty) => setCart((c) => qty <= 0 ? c.filter((x) => x.id !== id) : c.map((x) => x.id === id ? { ...x, qty } : x));
  const addSvc = (s) => { setLastReceipt(null); setSvc((v) => v.some((x) => x.id === s.id) ? v : [...v, { id: s.id, name: s.name, unit: s.unit, rate: s.rate, qty: 1 }]); };
  const setSvcQty = (id, qty) => setSvc((v) => qty <= 0 ? v.filter((x) => x.id !== id) : v.map((x) => x.id === id ? { ...x, qty } : x));

  const lineNet = cart.reduce((a, l) => a + l.unitPrice * l.qty, 0);
  const svcNet = svc.reduce((a, s) => a + s.rate * s.qty, 0);
  const net = lineNet + svcNet;
  const cost = cart.reduce((a, l) => a + l.unitCost * l.qty, 0);
  const profit = lineNet - cost;
  const margin = lineNet > 0 ? (profit / lineNet) * 100 : 0;
  const vat = Math.round(net * TE.VAT);
  const gross = net + vat;
  const count = cart.reduce((a, l) => a + l.qty, 0) + svc.reduce((a, s) => a + s.qty, 0);

  const checkout = () => {
    const id = window.sim.tradeCheckout({ lines: cart, services: svc, payment, customer: customer.trim() || "Eseti vevő" });
    if (id) { setCart([]); setSvc([]); setCustomer(""); setMobileCart(false); setLastReceipt({ id, gross }); }
  };

  // megosztott kosár-tartalom (desktop oszlop + mobil sheet)
  const cartBody = (
    <>
      <div className="px-4 py-3 space-y-2.5">
        {/* vevő + fizetés */}
        <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Vevő neve (opcionális)"
          className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-orange-400 placeholder:text-stone-400" />
        <div className="grid grid-cols-3 gap-1.5">
          {TRADE_PAYMENTS.map((pm) => (
            <button key={pm} onClick={() => setPayment(pm)}
              className={`h-8 rounded-lg text-[11.5px] font-medium transition ${payment === pm ? "bg-orange-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>{pm}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
        {count === 0 && <div className="py-10 text-center text-[12px] text-stone-400">A kosár üres — koppints egy termékre.</div>}
        {cart.map((l) => (
          <div key={l.id} className="py-2.5 border-b border-stone-100 flex items-center gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium text-stone-900 truncate">{l.name}</div>
              <div className="text-[10.5px] text-stone-500 tabular-nums">{TE.fmtHuf(l.unitPrice)} / {l.unit}</div>
            </div>
            <Stepper qty={l.qty} onChange={(v) => setQty(l.id, v)} />
            <div className="w-[78px] text-right text-[12px] font-semibold tabular-nums text-stone-900 shrink-0">{TE.fmtHuf(l.unitPrice * l.qty)}</div>
          </div>
        ))}
        {svc.map((s) => (
          <div key={s.id} className="py-2.5 border-b border-stone-100 flex items-center gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium text-indigo-700 truncate">{s.name}</div>
              <div className="text-[10.5px] text-stone-500 tabular-nums">{TE.fmtHuf(s.rate)} / {s.unit}</div>
            </div>
            <Stepper qty={s.qty} onChange={(v) => setSvcQty(s.id, v)} />
            <div className="w-[78px] text-right text-[12px] font-semibold tabular-nums text-stone-900 shrink-0">{TE.fmtHuf(s.rate * s.qty)}</div>
          </div>
        ))}

        {/* gyors szolgáltatás-gombok */}
        <div className="pt-3">
          <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Szolgáltatás hozzáadása</div>
          <div className="flex flex-wrap gap-1.5">
            {services.map((s) => (
              <button key={s.id} onClick={() => addSvc(s)}
                className="inline-flex items-center gap-1 px-2 h-7 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-medium hover:bg-indigo-100">
                <Icon name="plus" size={11} />{s.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* összegzés */}
      <div className="border-t border-stone-200 px-4 py-3 space-y-1.5 bg-stone-50/60" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
        <div className="flex items-center justify-between text-[12px]"><span className="text-stone-500">Nettó</span><span className="tabular-nums text-stone-700">{TE.fmtHuf(net)}</span></div>
        <div className="flex items-center justify-between text-[12px]"><span className="text-stone-500">ÁFA (27%)</span><span className="tabular-nums text-stone-700">{TE.fmtHuf(vat)}</span></div>
        <div className="flex items-center justify-between text-[15px] font-semibold pt-0.5"><span className="text-stone-900">Fizetendő</span><span className="tabular-nums text-stone-900">{TE.fmtHuf(gross)}</span></div>
        {cart.length > 0 && (
          <div className={`flex items-center justify-between text-[11px] pt-1 ${TE.marginTone(margin).fg}`}>
            <span>Fedezet (belső)</span><span className="tabular-nums">+{TE.fmtHuf(profit)} · {TE.fmtPct(margin)}</span>
          </div>
        )}
        <button onClick={checkout} disabled={count === 0}
          className={`w-full h-11 mt-1.5 rounded-xl text-[13.5px] font-semibold transition ${count === 0 ? "bg-stone-200 text-stone-400 cursor-not-allowed" : "bg-orange-600 text-white hover:bg-orange-700 active:scale-[.99] shadow-sm"}`}>
          Fizetés · {TE.fmtHuf(gross)}
        </button>
      </div>
    </>
  );

  return (
    <div className="lg:h-[calc(100vh-57px)] lg:grid lg:grid-cols-[1fr_380px] lg:overflow-hidden">
      {/* ── bal: termékek ── */}
      <div className="px-4 md:px-7 py-5 lg:overflow-y-auto">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <div className="text-[16px] font-semibold tracking-tight text-stone-900">Pult — gyors eladás</div>
            <div className="text-[11.5px] text-stone-500">Koppints egy termékre a kosárhoz adáshoz. Az ár a kategória árrése szerint számolódik.</div>
          </div>
        </div>

        {lastReceipt && (
          <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center shrink-0"><Icon name="check" size={16} /></div>
            <div className="flex-1 min-w-0 text-[12.5px] text-emerald-800">Eladás rögzítve: <span className="font-semibold font-mono">{lastReceipt.id}</span> — {TE.fmtHuf(lastReceipt.gross)} fizetve.</div>
            <button onClick={() => setLastReceipt(null)} className="text-emerald-600 hover:text-emerald-800"><Icon name="x" size={15} /></button>
          </div>
        )}

        {/* kategória chipek + kereső */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5 overflow-x-auto max-w-full">
            <button onClick={() => setFilterCat("all")}
              className={`px-2.5 h-7 rounded-md text-[11.5px] font-medium whitespace-nowrap ${filterCat === "all" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>Összes</button>
            {cats.map((c) => {
              const tone = TRADE_CAT_TONE[c.color] || TRADE_CAT_TONE.stone;
              return (
                <button key={c.id} onClick={() => setFilterCat(c.id)}
                  className={`px-2.5 h-7 rounded-md text-[11.5px] font-medium whitespace-nowrap inline-flex items-center gap-1.5 ${filterCat === c.id ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
                  <span className={`w-2 h-2 rounded-full ${tone.dot}`} />{c.short}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 px-3 h-8 flex-1 min-w-[150px] sm:flex-none sm:w-[240px] rounded-lg bg-white border border-stone-200 text-stone-500">
            <Icon name="search" size={13} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Név vagy cikkszám…" className="bg-transparent outline-none text-[11.5px] flex-1 min-w-0 placeholder:text-stone-400" />
          </div>
        </div>

        {/* termék-rács */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 pb-24 lg:pb-4">
          {filtered.map((p) => {
            const cat = catById[p.catId]; const tone = TRADE_CAT_TONE[cat ? cat.color : "stone"] || TRADE_CAT_TONE.stone;
            const price = TE.sellOf(p, cat); const out = p.onHand <= 0;
            const inCart = cart.find((x) => x.id === p.id);
            return (
              <button key={p.id} onClick={() => !out && addToCart(p)} disabled={out}
                className={`relative text-left bg-white border rounded-xl p-3 transition ${out ? "border-stone-200 opacity-60 cursor-not-allowed" : "border-stone-200/80 hover:border-orange-300 hover:shadow-sm active:scale-[.99]"} ${inCart ? "ring-1 ring-orange-300 border-orange-300" : ""}`}>
                {inCart && <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] font-bold grid place-items-center tabular-nums">{inCart.qty}</span>}
                <span className={`inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded ${tone.bg} ${tone.fg}`}>{cat ? cat.short : "—"}</span>
                <div className="text-[12.5px] font-medium text-stone-900 mt-1.5 leading-snug line-clamp-2 min-h-[34px]">{p.name}</div>
                <div className="text-[10px] text-stone-400 font-mono mt-0.5">{p.sku}</div>
                <div className="flex items-end justify-between gap-1 mt-2">
                  <div className="text-[14px] font-semibold tabular-nums text-stone-900">{TE.fmtHuf(price)}</div>
                </div>
                <div className="text-[10.5px] mt-1">{out ? <span className="text-rose-600 font-medium">Elfogyott</span> : <TrStockDot p={p} />}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── jobb: kosár (desktop) ── */}
      <aside className="hidden lg:flex flex-col border-l border-stone-200 bg-white min-h-0">
        <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-2">
          <Icon name="procurement" size={17} className="text-orange-600" />
          <div className="text-[13px] font-semibold text-stone-900">Kosár</div>
          {count > 0 && <span className="ml-auto text-[11px] tabular-nums px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-semibold">{count} db</span>}
        </div>
        {cartBody}
      </aside>

      {/* ── mobil: kosár-sáv + sheet ── */}
      {count > 0 && (
        <button onClick={() => setMobileCart(true)}
          className="lg:hidden fixed left-3 right-3 bottom-[64px] z-40 h-12 rounded-xl bg-orange-600 text-white shadow-lg flex items-center justify-between px-4 active:scale-[.99]"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold"><Icon name="procurement" size={16} />Kosár · {count} tétel</span>
          <span className="text-[13.5px] font-semibold tabular-nums">{TE.fmtHuf(gross)}</span>
        </button>
      )}
      {mobileCart && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px]" onClick={() => setMobileCart(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] bg-white rounded-t-2xl shadow-2xl flex flex-col">
            <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-2">
              <Icon name="procurement" size={17} className="text-orange-600" />
              <div className="text-[13px] font-semibold text-stone-900">Kosár</div>
              <span className="ml-auto text-[11px] tabular-nums px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-semibold">{count} db</span>
              <button onClick={() => setMobileCart(false)} className="w-8 h-8 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100"><Icon name="x" size={16} /></button>
            </div>
            {cartBody}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { TradeDashboard, TradeCounter });
