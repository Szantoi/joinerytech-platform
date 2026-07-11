// ──────────────────────────────────────────────────────────────────────────
// item-builder.jsx — reusable "click-to-assemble" line-item builder.
//
//   The webshop's click-to-assemble pattern, generalised into one component
//   used by two flows:
//     • Ajánlat (quote)      — source: own article-number catalogue + finished
//                              products, picked into quote lines.
//     • Beszerzés (request)  — source: partner/supplier catalogue, grouped by
//                              supplier, picked into purchase-request lines.
//
//   Both support custom one-off items and services (manual entry). Pricing is
//   shown net + VAT + gross. On submit the assembled lines are handed back via
//   onSubmit(payload) so the caller can create a quote (store) or PR rows.
//
//   <ItemBuilder mode="quote|procurement" catalog={[…]} groupBy="cat|supplier"
//     onClose onSubmit />
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateIB, useMemo: useMemoIB } = React;

const IB_VAT_DEFAULT = 27;
const ibhuf = (n) => Math.round(n).toLocaleString("hu-HU") + " Ft";
const lineKey = (() => { let n = 0; return () => "ln-" + (++n) + "-" + Date.now().toString(36); })();

function ItemBuilder({ mode = "quote", catalog = [], customers = [], onAddCustomer, groupBy = "cat", onClose, onSubmit,
  initialLines = null, initialHeader = "", title = null, subtitle = null, submitLabel = null, lockHeader = false, enableDiscounts = true }) {
  const isQuote = mode === "quote";
  const [lines, setLines] = useStateIB(() => (initialLines && initialLines.length) ? initialLines.map((l) => ({ key: lineKey(), vat: IB_VAT_DEFAULT, ...l })) : []);
  const [q, setQ] = useStateIB("");
  const [group, setGroup] = useStateIB("Összes");
  const [header, setHeader] = useStateIB(initialHeader || "");       // customer (quote) / requester note (proc)
  const [listOpen, setListOpen] = useStateIB(false); // mobile summary sheet
  const [customOpen, setCustomOpen] = useStateIB(false);
  const [adHocDisc, setAdHocDisc] = useStateIB(0); // eseti kedvezmény %
  const [designOpen, setDesignOpen] = useStateIB(false);
  const [configOpen, setConfigOpen] = useStateIB(false);
  const [custPickerOpen, setCustPickerOpen] = useStateIB(false);
  const selectedCustomer = useMemoIB(() => customers.find((c) => c.name === header) || null, [customers, header]);

  const groups = useMemoIB(() => {
    const key = groupBy === "supplier" ? "supplier" : "cat";
    return ["Összes", ...Array.from(new Set(catalog.map((c) => c[key])))];
  }, [catalog, groupBy]);

  const filtered = useMemoIB(() => {
    const key = groupBy === "supplier" ? "supplier" : "cat";
    const needle = q.trim().toLowerCase();
    return catalog.filter((c) =>
      (c.active !== false) &&
      (group === "Összes" || c[key] === group) &&
      (!needle
        || c.name.toLowerCase().includes(needle)
        || (c.code || "").toLowerCase().includes(needle)
        || Object.values(c.props || {}).some((v) => String(v).toLowerCase().includes(needle))
        || (c.tags || []).some((t) => t.toLowerCase().includes(needle))));
  }, [catalog, q, group, groupBy]);

  const addCatalog = (c) => {
    setLines((ls) => {
      const ex = ls.find((l) => l.code === c.code && !l.custom);
      if (ex) return ls.map((l) => (l === ex ? { ...l, qty: l.qty + 1 } : l));
      const cost = c.cost != null ? c.cost : (window.MarginUtil ? window.MarginUtil.costOf({ price: c.price }) : undefined);
      return [...ls, { key: lineKey(), name: c.name, code: c.code, unit: c.unit, price: c.price, cost, qty: 1, vat: IB_VAT_DEFAULT, supplier: c.supplier }];
    });
  };
  const setQty = (key, qty) => setLines((ls) => qty <= 0 ? ls.filter((l) => l.key !== key) : ls.map((l) => (l.key === key ? { ...l, qty } : l)));
  const setLine = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addCustom = (item) => setLines((ls) => [...ls, { key: lineKey(), custom: true, ...item }]);

  const net = lines.reduce((n, l) => n + l.price * l.qty, 0);
  const vat = lines.reduce((n, l) => n + l.price * l.qty * (l.vat / 100), 0);
  const gross = net + vat;
  const count = lines.reduce((n, l) => n + l.qty, 0);

  // BELSŐ fedezet (csak belső + reseller nézet) + ajánlat-szintű egységes árrés
  const showMargin = !!(window.MarginUtil && window.MarginUtil.canSee());
  const applyUniformMargin = (pct) => setLines((ls) => ls.map((l) => {
    const cost = window.MarginUtil ? window.MarginUtil.costOf(l) : l.cost;
    return { ...l, cost, price: window.MarginUtil.sellFromCost(cost, pct) };
  }));

  // KEDVEZMÉNYEK — partner-állandó (header alapján, automatikus) + eseti (kézi)
  const M = window.MarginUtil;
  const partnerDisc = (enableDiscounts && isQuote && M) ? M.partnerDiscountPct(header.trim(), null) : 0;
  const partner = (enableDiscounts && isQuote && M) ? M.partnerByName(header.trim()) : null;
  const discPct = Math.max(0, Math.min(95, (partnerDisc || 0) + (Number(adHocDisc) || 0)));
  const discFactor = 1 - discPct / 100;
  const discNet = Math.round(net * discFactor);
  const discVat = Math.round(vat * discFactor);
  const discGross = discNet + discVat;

  const canSubmit = lines.length > 0 && (!isQuote || header.trim());
  const submit = () => {
    if (!canSubmit) return;
    // kedvezmény beépítése a tételi árakba (önköltség változatlan → fedezet csökken)
    const outLines = (discPct > 0)
      ? lines.map((l) => ({ ...l, price: Math.round(l.price * discFactor), listPrice: l.price, discountPct: discPct }))
      : lines;
    onSubmit({ header: header.trim(), lines: outLines, net: discNet, vat: discVat, gross: discGross, discountPct: discPct, partnerName: partner ? partner.name : null });
  };

  // Lock background (body) scroll while the full-screen builder is open
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-stone-50" role="dialog" aria-modal="true">
      {/* Header */}
      <header className="shrink-0 bg-white border-b border-stone-200">
        <div className="max-w-[1180px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100" aria-label="Bezárás">
            <Icon name="chevron" size={17} className="rotate-180" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-stone-900 leading-tight">{title || (isQuote ? "Új ajánlat összeállítása" : "Új beszerzési igény")}</div>
            <div className="text-[10.5px] text-stone-500 leading-tight">{subtitle || (isQuote ? "Saját cikkszámok, termékek és egyedi tételek" : "Szállítói kínálatból, egyedi tétellel")}</div>
          </div>
          {/* mobile summary toggle */}
          <button onClick={() => setListOpen(true)}
            className="md:hidden relative inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-stone-900 text-white text-[12.5px] font-medium">
            <Icon name="box" size={15} /> {count}
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 max-w-[1180px] w-full mx-auto flex flex-col md:grid md:grid-cols-[1fr_380px]">
        {/* Catalog browser */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4">
          {isQuote && (
            <div className="mb-4">
              <label className="block text-[11px] text-stone-500 mb-1">Ügyfél <span className="text-rose-500">*</span></label>
              <button onClick={() => setCustPickerOpen(true)}
                className={`w-full h-12 px-3 rounded-lg border text-left flex items-center gap-3 transition ${selectedCustomer ? "border-stone-300 bg-white" : "border-stone-200 bg-white hover:border-teal-400"}`}>
                {selectedCustomer ? (
                  <>
                    <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 grid place-items-center text-[12px] font-semibold shrink-0">
                      {selectedCustomer.name.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-stone-900 truncate leading-tight">{selectedCustomer.name}</span>
                      <span className="block text-[11px] text-stone-400 truncate leading-tight">
                        {[selectedCustomer.city, selectedCustomer.contact].filter(Boolean).join(" · ") || selectedCustomer.id}
                      </span>
                    </span>
                    <span className="text-[11.5px] text-teal-600 font-medium shrink-0">Módosítás</span>
                  </>
                ) : (
                  <>
                    <span className="w-8 h-8 rounded-full bg-stone-100 text-stone-400 grid place-items-center shrink-0"><Icon name="user" size={16} /></span>
                    <span className="flex-1 text-[13px] text-stone-400">Válassz ügyfelet a listából…</span>
                    <Icon name="chevron" size={15} className="text-stone-300 rotate-90 shrink-0" />
                  </>
                )}
              </button>
            </div>
          )}
          {/* Designed-furniture entry — connects the Tervezés world into the quote */}
          {isQuote && window.DesignItemWizard && (
            <button onClick={() => setDesignOpen(true)}
              className="w-full mb-3 p-3 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white flex items-center gap-3 text-left hover:border-violet-300 hover:shadow-sm transition">
              <span className="w-9 h-9 rounded-lg bg-violet-600 text-white grid place-items-center shrink-0"><Icon name="ruler" size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold text-stone-900">Tervezett bútor hozzáadása</span>
                <span className="block text-[10.5px] text-stone-500 leading-snug">Egyedi vagy katalógus alapú tervezés · igény + stílus alapján becsült ár</span>
              </span>
              <Icon name="plus" size={16} className="text-violet-500 shrink-0" />
            </button>
          )}
          {/* Configuration entry — stílus + műszaki + sablonok → kiértékelt ár */}
          {isQuote && window.ConfigEvaluator && (
            <button onClick={() => setConfigOpen(true)}
              className="w-full mb-3 p-3 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white flex items-center gap-3 text-left hover:border-teal-300 hover:shadow-sm transition">
              <span className="w-9 h-9 rounded-lg bg-teal-600 text-white grid place-items-center shrink-0"><Icon name="layers" size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold text-stone-900">Konfiguráció hozzáadása</span>
                <span className="block text-[10.5px] text-stone-500 leading-snug">Stílus + műszaki kiválasztása, sablonok behúzása · ármotor által kiértékelt ár</span>
              </span>
              <Icon name="plus" size={16} className="text-teal-500 shrink-0" />
            </button>
          )}
          {/* search + add custom */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 px-3 h-9 flex-1 rounded-lg bg-white border border-stone-200 text-stone-500">
              <Icon name="search" size={14} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés név, cikkszám, tulajdonság, címke…"
                className="bg-transparent outline-none text-[12.5px] flex-1 min-w-0 placeholder:text-stone-400" />
            </div>
            <button onClick={() => setCustomOpen(true)} className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-300 text-stone-700 text-[12.5px] font-medium hover:bg-white">
              <Icon name="plus" size={14} /> Egyedi
            </button>
          </div>
          {/* group chips */}
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {groups.map((g) => (
              <button key={g} onClick={() => setGroup(g)}
                className={`px-3 h-7 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 transition ${group === g ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"}`}>{g}</button>
            ))}
          </div>
          {/* catalog rows */}
          <div className="grid sm:grid-cols-2 gap-2">
            {filtered.map((c) => {
              const inList = lines.find((l) => l.code === c.code && !l.custom);
              return (
                <button key={c.id} onClick={() => addCatalog(c)}
                  className="text-left bg-white rounded-xl border border-stone-200 p-3 hover:border-teal-300 hover:shadow-sm transition flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-stone-900 truncate">{c.name}</div>
                    <div className="text-[10.5px] text-stone-400 font-mono truncate">{c.code} · {groupBy === "supplier" ? c.cat : c.supplier}</div>
                    <div className="text-[12px] font-semibold text-stone-800 tabular-nums mt-0.5">{ibhuf(c.price)} <span className="text-[10px] font-normal text-stone-400">/ {c.unit}</span></div>
                  </div>
                  <span className={`w-8 h-8 grid place-items-center rounded-lg shrink-0 ${inList ? "bg-teal-600 text-white" : "bg-stone-100 text-stone-600"}`}>
                    {inList ? <span className="text-[12px] font-bold tabular-nums">{inList.qty}</span> : <Icon name="plus" size={16} />}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && <div className="col-span-full px-3 py-10 text-center text-[12.5px] text-stone-400">Nincs találat.</div>}
          </div>
        </div>

        {/* Summary pane — desktop docked, mobile sheet */}
        <SummaryPane desktop lines={lines} setQty={setQty} setLine={setLine} net={net} vat={vat} gross={gross}
          isQuote={isQuote} canSubmit={canSubmit} onSubmit={submit} submitLabel={submitLabel}
          showMargin={showMargin} applyUniformMargin={applyUniformMargin}
          enableDiscounts={enableDiscounts && isQuote} partnerDisc={partnerDisc} partner={partner}
          adHocDisc={adHocDisc} setAdHocDisc={setAdHocDisc} discPct={discPct} discNet={discNet} discVat={discVat} discGross={discGross} />
      </div>

      {/* mobile summary sheet */}
      {listOpen && (
        <div className="md:hidden fixed inset-0 z-[66]">
          <button className="absolute inset-0 bg-stone-900/30" onClick={() => setListOpen(false)} aria-label="Bezárás" />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl max-h-[86vh] flex flex-col animate-[chSlide_.22s_ease-out]" style={{ paddingBottom: "max(env(safe-area-inset-bottom),0px)" }}>
            <div className="pt-2 pb-1 grid place-items-center"><span className="w-9 h-1 rounded-full bg-stone-300" /></div>
            <SummaryPane lines={lines} setQty={setQty} setLine={setLine} net={net} vat={vat} gross={gross}
              isQuote={isQuote} canSubmit={canSubmit} onSubmit={() => { setListOpen(false); submit(); }} onClose={() => setListOpen(false)} submitLabel={submitLabel}
              showMargin={showMargin} applyUniformMargin={applyUniformMargin}
              enableDiscounts={enableDiscounts && isQuote} partnerDisc={partnerDisc} partner={partner}
              adHocDisc={adHocDisc} setAdHocDisc={setAdHocDisc} discPct={discPct} discNet={discNet} discVat={discVat} discGross={discGross} />
          </div>
        </div>
      )}

      {customOpen && <CustomItemDialog onClose={() => setCustomOpen(false)} onAdd={(it) => { addCustom(it); setCustomOpen(false); }} />}
      {designOpen && <DesignItemWizard onClose={() => setDesignOpen(false)} onAdd={(line) => addCustom(line)} />}
      {configOpen && window.ConfigEvaluator && <ConfigEvaluator onClose={() => setConfigOpen(false)} onAdd={(line) => addCustom(line)} />}
      {custPickerOpen && (
        <CustomerPickerDialog customers={customers} selectedName={header}
          onPick={(name) => { setHeader(name); setCustPickerOpen(false); }}
          onAddCustomer={onAddCustomer}
          onClose={() => setCustPickerOpen(false)} />
      )}
    </div>
  );
}

function SummaryPane({ desktop, lines, setQty, setLine, net, vat, gross, isQuote, canSubmit, onSubmit, onClose, submitLabel, showMargin, applyUniformMargin,
  enableDiscounts, partnerDisc, partner, adHocDisc, setAdHocDisc, discPct, discNet, discVat, discGross }) {
  const M = window.MarginUtil;
  const mt = (showMargin && M) ? M.totals(lines) : null;
  const dFactor = 1 - (discPct || 0) / 100;
  const discSell = mt ? Math.round(mt.sell * dFactor) : 0;
  const discProfit = mt ? discSell - mt.cost : 0;
  const discMpct = (mt && mt.cost > 0) ? (discSell / mt.cost - 1) * 100 : 0;
  const tone = mt ? M.tone(discMpct) : null;
  const hasDisc = enableDiscounts && discPct > 0;
  return (
    <div className={`flex flex-col min-h-0 ${desktop ? "hidden md:flex border-l border-stone-200 bg-white" : "flex-1"}`}>
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between shrink-0">
        <div className="text-[13px] font-semibold text-stone-900">Tételek <span className="text-stone-400 font-normal">({lines.length})</span></div>
        {onClose && <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"><Icon name="x" size={16} /></button>}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {lines.length === 0 && <div className="px-3 py-10 text-center text-[12.5px] text-stone-400">Kattintson a katalógusból, vagy adjon hozzá egyedi tételt.</div>}
        {lines.map((l) => (
          <LineRow key={l.key} l={l} setQty={setQty} setLine={setLine} showMargin={showMargin} />
        ))}
      </div>
      {/* KEDVEZMÉNYEK — eseti (kézi) + partner-állandó (automatikus) */}
      {enableDiscounts && lines.length > 0 && (
        <div className="px-4 py-2.5 border-t border-stone-200 bg-emerald-50/30 shrink-0 space-y-2">
          {partner && (partnerDisc || 0) > 0 && (
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="inline-flex items-center gap-1.5 text-emerald-700"><Icon name="check" size={12} />Partner-kedvezmény · {partner.name}</span>
              <span className="tabular-nums font-semibold text-emerald-700">−{partnerDisc}%</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] text-stone-600">Eseti kedvezmény</span>
            <div className="flex items-center h-7 w-20 px-2 rounded-lg border border-stone-200 bg-white focus-within:border-emerald-400">
              <input value={adHocDisc || ""} onChange={(e) => setAdHocDisc(Math.max(0, Math.min(95, Number(e.target.value.replace(/[^0-9]/g, "")) || 0)))} inputMode="numeric" placeholder="0" className="w-full min-w-0 text-[12px] tabular-nums bg-transparent outline-none text-right" />
              <span className="text-[10px] text-stone-400 pl-1">%</span>
            </div>
          </div>
        </div>
      )}
      {/* BELSŐ fedezet — csak belső + reseller; az ügyfél sosem látja (kedvezmény után) */}
      {mt && lines.length > 0 && (
        <MarginSummary mt={mt} tone={tone} applyUniformMargin={applyUniformMargin}
          discPct={discPct} discSell={discSell} discProfit={discProfit} discMpct={discMpct} />
      )}
      <div className="px-4 py-3 border-t border-stone-200 bg-stone-50/70 shrink-0 space-y-1.5" style={{ paddingBottom: "max(env(safe-area-inset-bottom),12px)" }}>
        {hasDisc && <div className="flex items-center justify-between text-[11px] text-stone-400"><span>Listáár (nettó)</span><span className="tabular-nums line-through">{ibhuf(net)}</span></div>}
        {hasDisc && <div className="flex items-center justify-between text-[11px] text-emerald-700"><span>Kedvezmény −{discPct}%</span><span className="tabular-nums">−{ibhuf(net - discNet)}</span></div>}
        <div className="flex items-center justify-between text-[12px] text-stone-500"><span>Nettó{hasDisc ? " (kedvezményes)" : ""}</span><span className="tabular-nums">{ibhuf(hasDisc ? discNet : net)}</span></div>
        <div className="flex items-center justify-between text-[12px] text-stone-500"><span>ÁFA</span><span className="tabular-nums">{ibhuf(hasDisc ? discVat : vat)}</span></div>
        <div className="flex items-center justify-between text-[15px] font-semibold text-stone-900"><span>Bruttó</span><span className="tabular-nums">{ibhuf(hasDisc ? discGross : gross)}</span></div>
        <button onClick={onSubmit} disabled={!canSubmit}
          className="w-full h-11 mt-1.5 rounded-xl bg-teal-600 text-white text-[13.5px] font-semibold hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center justify-center gap-2">
          <Icon name="check" size={16} /> {submitLabel || (isQuote ? "Ajánlat létrehozása" : "Igény beküldése")}
        </button>
      </div>
    </div>
  );
}

// BELSŐ fedezet-összegző + ajánlat-szintű egységes árrés alkalmazása
function MarginSummary({ mt, tone, applyUniformMargin, discPct, discSell, discProfit, discMpct }) {
  const M = window.MarginUtil;
  const [open, setOpen] = useStateIB(false);
  const [pct, setPct] = useStateIB(() => Math.round(mt.pct) || M.defaultPct());
  const hasDisc = (discPct || 0) > 0;
  return (
    <div className="px-4 py-2.5 border-t border-stone-200 bg-amber-50/40 shrink-0">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-amber-700">
          <Icon name="lock" size={11} /> Belső — fedezet{hasDisc ? " (kedvezmény után)" : ""}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10.5px] font-semibold ${tone.bg} ${tone.fg}`}><span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{M.fmtPct(discMpct)}</span>
          <Icon name="chevron" size={13} className={`text-amber-500 transition-transform ${open ? "-rotate-90" : "rotate-90"}`} />
        </span>
      </button>
      <div className="flex items-center justify-between mt-1.5 text-[12px]">
        <span className="text-stone-500">Fedezet (profit)</span>
        <span className={`tabular-nums font-semibold ${tone.fg}`}>{M.fmtHuf(discProfit)}</span>
      </div>
      {open && (
        <div className="mt-2 pt-2 border-t border-amber-100 space-y-2">
          <div className="flex items-center justify-between text-[11.5px]"><span className="text-stone-500">Önköltség (nettó)</span><span className="tabular-nums text-stone-700">{M.fmtHuf(mt.cost)}</span></div>
          <div className="flex items-center justify-between text-[11.5px]"><span className="text-stone-500">Listáár / eladási (nettó)</span><span className="tabular-nums text-stone-700">{M.fmtHuf(mt.sell)}</span></div>
          {hasDisc && <div className="flex items-center justify-between text-[11.5px]"><span className="text-stone-500">Kedvezményes eladási</span><span className="tabular-nums text-stone-700">{M.fmtHuf(discSell)}</span></div>}
          <div className="pt-1.5">
            <div className="text-[10.5px] text-stone-500 mb-1">Ajánlat-szintű egységes árrés (listáár)</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center h-8 px-2 rounded-lg border border-stone-200 bg-white flex-1">
                <input value={pct} onChange={(e) => setPct(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="w-full min-w-0 text-[12px] tabular-nums bg-transparent outline-none text-right" />
                <span className="text-[11px] text-stone-400 pl-1">%</span>
              </div>
              <button onClick={() => applyUniformMargin(Number(pct) || 0)} className="h-8 px-3 rounded-lg text-[11.5px] font-medium bg-amber-600 text-white hover:bg-amber-700 inline-flex items-center gap-1.5"><Icon name="bolt" size={13} />Alkalmaz mindenre</button>
            </div>
            <div className="text-[10px] text-stone-400 mt-1">Minden tétel listáára = önköltség × (1 + árrés). A kedvezmény ezután von le.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// LineRow — egy ajánlat/igény tétel a Tételek listában. Koppintásra lenyílik a
// részletező/szerkesztő panel (megnevezés, egységár, egység, ÁFA), és — ha van
// — a tervezett bútor / konfiguráció kapcsolódó részletei (olvasható).
// ──────────────────────────────────────────────────────────────────────────
const ibLineKind = (l) => l.design ? "tervezett bútor" : l.config ? "konfiguráció" : l.custom ? "egyedi" : l.code;

function LineRow({ l, setQty, setLine, showMargin }) {
  const [open, setOpen] = useStateIB(false);
  const [editor, setEditor] = useStateIB(null); // null | "design" | "config"
  const hasDetail = !!(l.design || l.config);
  const M = window.MarginUtil;
  const mp = (showMargin && M) ? M.marginPct(M.costOf(l), M.sellOf(l)) : null;
  const mtone = mp != null ? M.tone(mp) : null;
  return (
    <div className={`rounded-xl border transition ${open ? "border-teal-300 ring-1 ring-teal-200 bg-white" : "border-stone-200 bg-white"}`}>
      <div className="p-2.5">
        <div className="flex items-start gap-2">
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
            className="min-w-0 flex-1 flex items-start gap-2 text-left rounded-lg -m-1 p-1 hover:bg-stone-50/80 transition">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="text-[12.5px] font-medium text-stone-900 leading-tight truncate">{l.name}</span>
                {hasDetail && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-teal-500" title="Részletek elérhetők" />}
              </span>
              <span className="block text-[10px] text-stone-400 font-mono mt-0.5">{ibLineKind(l)} · {ibhuf(l.price)}/{l.unit} · ÁFA {l.vat}%</span>
              {mp != null && (
                <span className={`inline-flex items-center gap-1 mt-1 px-1.5 h-4 rounded text-[9.5px] font-semibold ${mtone.bg} ${mtone.fg}`}>
                  <Icon name="lock" size={9} /> árrés {M.fmtPct(mp)}
                </span>
              )}
            </span>
            <Icon name="chevron" size={14} className={`text-stone-300 shrink-0 mt-0.5 transition-transform ${open ? "-rotate-90" : "rotate-90"}`} />
          </button>
          <button onClick={() => setQty(l.key, 0)} className="w-7 h-7 grid place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0" aria-label="Tétel törlése"><Icon name="x" size={14} /></button>
        </div>
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-1.5">
            <button onClick={() => setQty(l.key, l.qty - 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"><Icon name="minus" size={13} /></button>
            <input value={l.qty} onChange={(e) => setQty(l.key, Math.max(0, Number(e.target.value) || 0))}
              className="w-11 h-7 text-center text-[12.5px] font-semibold tabular-nums border border-stone-200 rounded-lg outline-none focus:border-teal-500" />
            <button onClick={() => setQty(l.key, l.qty + 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"><Icon name="plus" size={13} /></button>
            <span className="text-[10.5px] text-stone-400 ml-0.5">{l.unit}</span>
          </div>
          <div className="text-[13px] font-semibold text-stone-900 tabular-nums">{ibhuf(l.price * l.qty)}</div>
        </div>
      </div>
      {open && <LineEditDetail l={l} setLine={setLine} onEditSpec={() => setEditor(l.design ? "design" : "config")} showMargin={showMargin} />}

      {editor === "config" && window.ConfigEvaluator && (
        <ConfigEvaluator editLine={l} onSave={(patch) => { setLine(l.key, patch); setEditor(null); }} onClose={() => setEditor(null)} />
      )}
      {editor === "design" && window.DesignItemWizard && (
        <DesignItemWizard initial={l} onAdd={(built) => { setLine(l.key, built); setEditor(null); }} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}

function LineEditDetail({ l, setLine, onEditSpec, showMargin }) {
  const recalcKind = l.design ? "Tervezett bútor szerkesztése" : "Specifikáció módosítása";
  const M = window.MarginUtil;
  const cost = (showMargin && M) ? M.costOf(l) : null;
  const mp = cost != null ? M.marginPct(cost, M.sellOf(l)) : null;
  const mtone = mp != null ? M.tone(mp) : null;
  // önköltség vagy árrés szerkesztése → a másik újraszámol
  const setCost = (c) => setLine(l.key, { cost: c });
  const setMargin = (pct) => setLine(l.key, { cost, price: M.sellFromCost(cost, pct) });
  return (
    <div className="px-2.5 pb-2.5 pt-0.5 border-t border-stone-100 mt-0.5 space-y-2.5 animate-[chSlide_.16s_ease-out]">
      <div className="pt-2.5">
        <label className="block text-[10.5px] text-stone-500 mb-1">Megnevezés</label>
        <input value={l.name} onChange={(e) => setLine(l.key, { name: e.target.value })}
          className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10.5px] text-stone-500 mb-1">Egységár (nettó)</label>
          <div className="flex items-center h-9 px-2.5 rounded-lg border border-stone-200 bg-white focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500">
            <input value={l.price} onChange={(e) => setLine(l.key, { price: Math.max(0, Number(String(e.target.value).replace(/[^0-9]/g, "")) || 0) })}
              inputMode="numeric" className="w-full min-w-0 text-[12.5px] tabular-nums bg-transparent outline-none" />
            <span className="text-[10.5px] text-stone-400 pl-1 shrink-0">Ft</span>
          </div>
        </div>
        <div>
          <label className="block text-[10.5px] text-stone-500 mb-1">Egység</label>
          <input value={l.unit} onChange={(e) => setLine(l.key, { unit: e.target.value })}
            className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        </div>
      </div>
      <div>
        <label className="block text-[10.5px] text-stone-500 mb-1">ÁFA-kulcs</label>
        <div className="flex items-center gap-1.5">
          {[0, 5, 18, 27].map((v) => (
            <button key={v} onClick={() => setLine(l.key, { vat: v })}
              className={`flex-1 h-8 rounded-lg text-[11.5px] font-medium border transition ${l.vat === v ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"}`}>{v}%</button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 text-[11px]">
        <span className="text-stone-400">Sor összesen (nettó)</span>
        <span className="font-semibold text-stone-700 tabular-nums">{ibhuf(l.price * l.qty)}</span>
      </div>
      {cost != null && (
        <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-2.5 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"><Icon name="lock" size={10} /> Belső — önköltség és árrés</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-stone-500 mb-1">Önköltség (nettó)</label>
              <div className="flex items-center h-8 px-2 rounded-lg border border-stone-200 bg-white">
                <input value={cost} onChange={(e) => setCost(Math.max(0, Number(String(e.target.value).replace(/[^0-9]/g, "")) || 0))} inputMode="numeric" className="w-full min-w-0 text-[12px] tabular-nums bg-transparent outline-none" />
                <span className="text-[10px] text-stone-400 pl-1">Ft</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-stone-500 mb-1">Árrés</label>
              <div className="flex items-center h-8 px-2 rounded-lg border border-stone-200 bg-white">
                <input value={Math.round(mp)} onChange={(e) => setMargin(Number(String(e.target.value).replace(/[^0-9-]/g, "")) || 0)} inputMode="numeric" className="w-full min-w-0 text-[12px] tabular-nums bg-transparent outline-none text-right" />
                <span className="text-[10px] text-stone-400 pl-1">%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-stone-500">Egységnyi fedezet</span>
            <span className={`tabular-nums font-semibold ${mtone.fg}`}>{M.fmtHuf(M.unitProfit(l))} <span className="font-normal text-stone-400">/ {l.unit}</span></span>
          </div>
        </div>
      )}
      {(l.design || l.config) && onEditSpec && (
        <button onClick={onEditSpec}
          className="w-full h-9 rounded-lg border border-teal-300 bg-teal-50/60 text-teal-700 text-[12px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-teal-50 transition">
          <Icon name="bolt" size={14} /> {recalcKind} · ár újraszámítása
        </button>
      )}
      {l.design && <DesignMeta design={l.design} />}
      {l.config && <ConfigMeta config={l.config} />}
    </div>
  );
}

// Olvasható összefoglaló — tervezett bútor (DesignItemWizard)
function DesignMeta({ design }) {
  const n = design.needs || {}, st = design.style || {};
  const phaseLabels = { needs: "Igény", style: "Stílus", layout: "Elrendezés", technical: "Műszaki", manufacturing: "Gyártás" };
  const rows = [];
  if (design.sourcing) rows.push(["Gyártásmód", design.sourcing === "outsourced" ? "Rendelhető (külső gyártó)" : "Saját gyártás"]);
  if (design.sourcing === "outsourced" && design.elemCategory) rows.push(["Elem-kategória", design.elemCategory]);
  rows.push(["Típus", design.category === "katalogus" ? "Katalógus alapú" : "Egyedi tervezés"]);
  if (design.baseRef && design.baseRef.name) rows.push(["Kiindulás", design.baseRef.name]);
  if (n.room) rows.push(["Helyiség", n.room]);
  if (n.w || n.h || n.d) rows.push(["Méret", `${n.w || "–"} × ${n.h || "–"} × ${n.d || "–"} mm`]);
  if (st.note) rows.push(["Stílus-jegyzet", st.note]);
  if (n.note) rows.push(["Igények", n.note]);
  const depth = (design.phasesIncluded || []).map((k) => phaseLabels[k] || k);
  if (design.estLo && design.estHi) rows.push(["Becslési sáv", `${ibhuf(design.estLo)} – ${ibhuf(design.estHi)}`]);
  return (
    <MetaBlock icon="ruler" accent="violet" title="Tervezett bútor részletei" rows={rows}
      tags={depth.length ? { label: "Tervezési mélység", items: depth } : null} />
  );
}

// Olvasható összefoglaló — konfiguráció (config-evaluator / SpecEngine)
function ConfigMeta({ config }) {
  const s = (window.sim && window.sim.getState) ? window.sim.getState() : {};
  const cat = (s.specCategories || []).find((c) => c.id === config.categoryId);
  const style = (s.styles || []).find((x) => x.id === config.styleId);
  const tech = (s.techSpecs || []).find((x) => x.id === config.techId);
  const rows = [];
  if (cat) rows.push(["Kategória", cat.name]);
  rows.push(["Stílus", style ? style.name : "alap"]);
  if (tech) rows.push(["Műszaki", tech.name]);
  if (config.bandPct != null) rows.push(["Pontossági sáv", `±${config.bandPct}%`]);
  return <MetaBlock icon="layers" accent="teal" title="Konfiguráció részletei" rows={rows} />;
}

function MetaBlock({ icon, accent, title, rows, tags }) {
  const tone = accent === "violet"
    ? { bg: "bg-violet-50/60", bd: "border-violet-100", ic: "text-violet-500", tg: "bg-violet-100 text-violet-700" }
    : { bg: "bg-teal-50/60", bd: "border-teal-100", ic: "text-teal-600", tg: "bg-teal-100 text-teal-700" };
  return (
    <div className={`rounded-lg border ${tone.bd} ${tone.bg} p-2.5 space-y-1.5`}>
      <div className="flex items-center gap-1.5">
        <Icon name={icon} size={13} className={tone.ic} />
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-stone-500">{title}</span>
      </div>
      <div className="space-y-1">
        {rows.map(([k, v], i) => (
          <div key={i} className="flex items-start justify-between gap-3 text-[11px]">
            <span className="text-stone-400 shrink-0">{k}</span>
            <span className="text-stone-700 text-right leading-snug">{v}</span>
          </div>
        ))}
      </div>
      {tags && tags.items.length > 0 && (
        <div className="pt-1">
          <div className="text-[10px] text-stone-400 mb-1">{tags.label}</div>
          <div className="flex flex-wrap gap-1">
            {tags.items.map((t, i) => (
              <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tone.tg}`}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomItemDialog({ onClose, onAdd }) {
  const [name, setName] = useStateIB("");
  const [price, setPrice] = useStateIB("");
  const [qty, setQty] = useStateIB(1);
  const [unit, setUnit] = useStateIB("db");
  const [vat, setVat] = useStateIB(IB_VAT_DEFAULT);
  const [isService, setIsService] = useStateIB(false);
  const ok = name.trim() && Number(price) > 0;
  const submit = () => { if (!ok) return; onAdd({ name: name.trim() + (isService ? " (szolgáltatás)" : ""), code: isService ? "SZOLG" : "EGYEDI", unit, price: Number(price), qty: Math.max(1, Number(qty) || 1), vat: Number(vat) }); };
  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <button className="absolute inset-0 bg-stone-900/40" onClick={onClose} aria-label="Bezárás" />
      <div className="relative bg-white w-full md:w-[420px] rounded-t-2xl md:rounded-2xl shadow-2xl animate-[chSlide_.22s_ease-out]" style={{ paddingBottom: "max(env(safe-area-inset-bottom),0px)" }}>
        <div className="px-5 pt-4 pb-3 border-b border-stone-200 flex items-center justify-between">
          <div className="text-[14px] font-semibold text-stone-900">Egyedi tétel / szolgáltatás</div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"><Icon name="x" size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
            {[{ k: false, l: "Termék / tétel" }, { k: true, l: "Szolgáltatás" }].map((it) => (
              <button key={String(it.k)} onClick={() => { setIsService(it.k); setUnit(it.k ? "óra" : "db"); }}
                className={`flex-1 h-8 rounded-md text-[12.5px] font-medium ${isService === it.k ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>{it.l}</button>
            ))}
          </div>
          <div>
            <label className="block text-[11px] text-stone-500 mb-1">Megnevezés <span className="text-rose-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={isService ? "pl. Helyszíni felmérés" : "pl. Egyedi méretű polc"}
              className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">Ár (nettó) <span className="text-rose-500">*</span></label>
              <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="0"
                className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] tabular-nums outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">Mennyiség</label>
              <input value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric"
                className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] tabular-nums outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">Egység</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-stone-500 mb-1">ÁFA-kulcs: <span className="font-semibold text-stone-800">{vat}%</span></label>
            <div className="flex items-center gap-1.5">
              {[0, 5, 18, 27].map((v) => (
                <button key={v} onClick={() => setVat(v)}
                  className={`flex-1 h-8 rounded-lg text-[12px] font-medium border ${vat === v ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-stone-200 text-stone-600"}`}>{v}%</button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center justify-end gap-2" style={{ paddingBottom: "max(env(safe-area-inset-bottom),12px)" }}>
          <GhostBtn onClick={onClose}>Mégse</GhostBtn>
          <button onClick={submit} disabled={!ok}
            className="h-9 px-4 rounded-lg text-[12.5px] font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5">
            <Icon name="plus" size={14} /> Hozzáadás
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ItemBuilder, CustomerPickerDialog });

// ──────────────────────────────────────────────────────────────────────────
// CustomerPickerDialog — pick an existing customer (searchable) OR add a new
// one inline via a full form. New customers are persisted through the store
// (onAddCustomer) so they are properly recorded everywhere, not just here.
// ──────────────────────────────────────────────────────────────────────────
function CustomerPickerDialog({ customers = [], selectedName, onPick, onAddCustomer, onClose, initialMode = "list" }) {
  const [mode, setMode] = useStateIB(initialMode); // list | new
  const [query, setQuery] = useStateIB("");
  const filtered = useMemoIB(() => {
    const n = query.trim().toLowerCase();
    if (!n) return customers;
    return customers.filter((c) =>
      c.name.toLowerCase().includes(n) ||
      (c.city || "").toLowerCase().includes(n) ||
      (c.contact || "").toLowerCase().includes(n));
  }, [customers, query]);

  // new-customer form
  const [f, setF] = useStateIB({ name: "", contact: "", city: "", email: "", phone: "" });
  const setField = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const okNew = f.name.trim().length > 0;
  const saveNew = () => {
    if (!okNew) return;
    if (onAddCustomer) onAddCustomer({ ...f });
    onPick(f.name.trim());
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <button className="absolute inset-0 bg-stone-900/40" onClick={onClose} aria-label="Bezárás" />
      <div className="relative bg-white w-full md:w-[460px] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col h-[90vh] md:h-auto md:max-h-[88vh] animate-[chSlide_.22s_ease-out]" style={{ paddingBottom: "max(env(safe-area-inset-bottom),0px)" }}>
        <div className="px-5 pt-4 pb-3 border-b border-stone-200 flex items-center gap-2">
          {mode === "new" && (
            <button onClick={() => setMode("list")} className="w-8 h-8 -ml-1.5 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100"><Icon name="chevron" size={16} className="rotate-180" /></button>
          )}
          <div className="text-[14px] font-semibold text-stone-900 flex-1">{mode === "new" ? "Új ügyfél felvétele" : "Ügyfél kiválasztása"}</div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"><Icon name="x" size={16} /></button>
        </div>

        {mode === "list" ? (
          <>
            <div className="px-5 pt-3 pb-2 shrink-0 space-y-2">
              <button onClick={() => { setF((p) => ({ ...p, name: query.trim() })); setMode("new"); }}
                className="w-full h-11 rounded-xl border border-dashed border-teal-300 text-teal-700 text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:bg-teal-50">
                <Icon name="plus" size={16} /> Új ügyfél felvétele
              </button>
              <div className="flex items-center gap-2 px-3 h-10 rounded-lg bg-stone-50 border border-stone-200 text-stone-500">
                <Icon name="search" size={15} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Keresés név, város, kapcsolattartó…"
                  className="bg-transparent outline-none text-[13px] flex-1 min-w-0 placeholder:text-stone-400 text-stone-800" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {filtered.map((c) => {
                const sel = c.name === selectedName;
                return (
                  <button key={c.id} onClick={() => onPick(c.name)}
                    className={`w-full text-left px-2.5 py-2.5 rounded-xl flex items-center gap-3 transition ${sel ? "bg-teal-50" : "hover:bg-stone-50"}`}>
                    <span className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 grid place-items-center text-[13px] font-semibold shrink-0">{c.name.slice(0, 1)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-stone-900 truncate leading-tight">{c.name}</span>
                      <span className="block text-[11px] text-stone-400 truncate leading-tight">{[c.city, c.contact].filter(Boolean).join(" · ") || c.id}</span>
                    </span>
                    {sel && <Icon name="check" size={16} className="text-teal-600 shrink-0" />}
                  </button>
                );
              })}
              {filtered.length === 0 && <div className="px-3 py-8 text-center text-[12.5px] text-stone-400">Nincs találat erre: „{query}”.</div>}
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div>
                <label className="block text-[11px] text-stone-500 mb-1">Cégnév / név <span className="text-rose-500">*</span></label>
                <input autoFocus value={f.name} onChange={setField("name")} placeholder="pl. Kovács Lakberendezés Kft."
                  className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Kapcsolattartó</label>
                  <input value={f.contact} onChange={setField("contact")} placeholder="pl. Kovács Anna"
                    className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Város</label>
                  <input value={f.city} onChange={setField("city")} placeholder="pl. Budapest"
                    className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-stone-500 mb-1">E-mail</label>
                <input value={f.email} onChange={setField("email")} inputMode="email" placeholder="pl. info@kovacslak.hu"
                  className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-[11px] text-stone-500 mb-1">Telefon</label>
                <input value={f.phone} onChange={setField("phone")} inputMode="tel" placeholder="pl. +36 1 234 5678"
                  className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center justify-end gap-2 shrink-0" style={{ paddingBottom: "max(env(safe-area-inset-bottom),12px)" }}>
              <GhostBtn onClick={() => setMode("list")}>Mégse</GhostBtn>
              <button onClick={saveNew} disabled={!okNew}
                className="h-9 px-4 rounded-lg text-[12.5px] font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5">
                <Icon name="check" size={14} /> Rögzítés és kiválasztás
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
