// Page: Orders
const { useState: useStateO, useMemo: useMemoO, useEffect: useEffectO } = React;

function OrderRow({ o, t, isOpen, onToggle, onNav, onOpenDetail }) {
  // Combine static order status with any live flow updates from window.orderFlow
  const flow = useOrderFlow(o.id);
  const liveStatus = flow.calcStatus || o.status;
  const isCalculating = flow.calc;

  return (
    <div className="border-b border-stone-100 last:border-0">
      <button onClick={onToggle}
        className="w-full text-left hover:bg-stone-50/70">
        {/* Desktop row */}
        <div className="hidden md:grid grid-cols-[160px_1fr_120px_110px_140px_130px_28px_28px] gap-4 px-5 py-3 items-center">
          <div className="text-[11.5px] font-mono text-stone-500">{o.id}</div>
          <div className="text-[12.5px] font-medium text-stone-900 truncate">{o.customer}</div>
          <div className="text-[12px] text-stone-600">{t.orders.types[o.type]}</div>
          <div className="text-[11.5px] font-mono text-stone-500">{o.date}</div>
          <div className="inline-flex items-center gap-1.5">
            <StatusPill status={liveStatus} label={t.status[liveStatus]} />
            {isCalculating && <span className="text-teal-600"><Spinner size={11} /></span>}
          </div>
          <div className="text-[12.5px] font-medium text-stone-900 text-right tabular-nums">{fmtHUF(o.total)}</div>
          <div className={`text-stone-400 transition ${isOpen ? "rotate-90" : ""}`}><Icon name="chevron" size={14} /></div>
          <div onClick={e => { e.stopPropagation(); onOpenDetail && onOpenDetail(o.id); }}
            className="w-7 h-7 grid place-items-center rounded text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition cursor-pointer">
            <Icon name="external" size={13} />
          </div>
        </div>
        {/* Mobile condensed row */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-medium text-stone-900 truncate">{o.customer}</span>
              {isCalculating && <span className="text-teal-600 shrink-0"><Spinner size={11} /></span>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <StatusPill status={liveStatus} label={t.status[liveStatus]} />
              <span className="text-[11px] font-mono text-stone-500 truncate">{o.id}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[13px] font-semibold text-stone-900 tabular-nums">{fmtHUF(o.total)}</div>
            <div className="text-[11px] font-mono text-stone-400">{o.date}</div>
          </div>
          <div className={`text-stone-300 transition shrink-0 ${isOpen ? "rotate-90" : ""}`}><Icon name="chevron" size={15} /></div>
        </div>
      </button>
      {isOpen && (
        <div className="px-4 md:px-5 pb-5 pt-2 bg-stone-50/40 border-t border-stone-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {[
              { label: "Tételszám", value: `${o.items} ${t.common.pieces}` },
              { label: "Anyag",     value: o.type === "door" ? "Tölgy 40mm" : o.type === "cabinet" ? "Bükk 18mm + MDF" : "Egyedi" },
              { label: "Élzárás",   value: "ABS 2mm színazonos" },
              { label: "Felület",   value: o.type === "door" ? "Olajos lazúr" : "Lakkozott" },
            ].map((b, i) => (
              <div key={i} className="bg-white border border-stone-200/70 rounded-lg p-3">
                <div className="text-[10.5px] uppercase tracking-wide text-stone-500">{b.label}</div>
                <div className="text-[12.5px] text-stone-900 mt-0.5">{b.value}</div>
              </div>
            ))}
          </div>

          {/* Post-calc surfaces — shown when status is ready or released */}
          {(liveStatus === "ready" || liveStatus === "released") && flow.anyagItems && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="bg-white border border-stone-200/70 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11.5px] font-semibold text-stone-900">Anyaglista</div>
                  <span className="text-[10.5px] text-emerald-700 inline-flex items-center gap-1"><Icon name="check" size={10} />generálva</span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[20px] font-semibold tabular-nums text-stone-900">{flow.anyagItems}</span>
                  <span className="text-[11px] text-stone-500">tétel</span>
                </div>
                <div className="text-[11.5px] text-stone-500 tabular-nums">Becsült anyagköltség: <span className="font-medium text-stone-700">{fmtHUF(flow.anyagValue)}</span></div>
                <button className="mt-2 text-[11px] text-teal-700 hover:underline inline-flex items-center gap-1">
                  <Icon name="external" size={11} />Anyaglista megnyitása
                </button>
              </div>
              <div className="bg-white border border-stone-200/70 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11.5px] font-semibold text-stone-900">Vágótervek</div>
                  <span className="text-[10.5px] text-emerald-700 inline-flex items-center gap-1"><Icon name="check" size={10} />generálva</span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[20px] font-semibold tabular-nums text-stone-900">{flow.plans}</span>
                  <span className="text-[11px] text-stone-500">terv · {flow.sheets} tábla</span>
                </div>
                <div className="text-[11.5px] text-stone-500">Optimalizálás: <span className="font-medium text-stone-700">86% átlag kihasználás</span></div>
                <button onClick={() => onNav && onNav("production")} className="mt-2 text-[11px] text-teal-700 hover:underline inline-flex items-center gap-1">
                  <Icon name="external" size={11} />Megnyit szabászaton
                </button>
              </div>
            </div>
          )}

          {liveStatus === "released" && (
            <div className="mb-3 px-3.5 py-2.5 rounded-lg border border-emerald-200/70 bg-emerald-50/60 flex items-center gap-2 text-[11.5px] text-emerald-900">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Kiadva gyártásba — követhető a
              <button onClick={() => onNav && onNav("workflow")} className="font-medium underline underline-offset-2">Munkafolyamat</button>
              nézetben.
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <GhostBtn icon="external">{t.common.cuttingPlan}</GhostBtn>
            <GhostBtn icon="download">{t.common.pdf}</GhostBtn>
            <AskAboutButton entity={{ type: "order", id: o.id, label: o.id, sub: o.customer }} />
            <GhostBtn icon="box" onClick={() => window.sim?.requisitionForOrder(o.id)}>Beszerzés indítása</GhostBtn>
            <div className="hidden md:block flex-1" />
            {liveStatus === "draft" && (
              <PrimaryBtn icon={isCalculating ? null : "check"} onClick={() => !isCalculating && window.simulateCalc(o.id)}>
                {isCalculating ? <span className="inline-flex items-center gap-1.5"><Spinner size={11} />Számítás folyamatban…</span> : <>Számítás indítása</>}
              </PrimaryBtn>
            )}
            {liveStatus === "calc" && !isCalculating && (
              <PrimaryBtn icon="check" onClick={() => window.simulateCalc(o.id)}>Számítás újraindítása</PrimaryBtn>
            )}
            {liveStatus === "ready" && (
              <PrimaryBtn icon="external" onClick={() => { window.releaseToWorkflow(o.id); window.sim?.releaseOrder(o.id); }}>Kiadás gyártásba</PrimaryBtn>
            )}
            {liveStatus === "released" && (
              <GhostBtn icon="external" onClick={() => onNav && onNav("workflow")}>Munkafolyamat megnyitása</GhostBtn>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersPage({ t, onNav, customerLabel }) {
  const sim = useSim();
  const ORDERS = sim.orders;
  const [filter, setFilter] = useStateO("all");
  const [expanded, setExpanded] = useStateO(null);
  const [showNew, setShowNew] = useStateO(false);
  const [openDetailId, setOpenDetailId] = useStateO(null);

  // Deep-link: auto-expand a specific order on mount if signalled
  useEffectO(() => {
    const p = window._pendingOpen;
    if (!p || p.type !== "order") return;
    window._pendingOpen = null;
    setExpanded(p.id);
    setFilter("all");
  }, []);

  const counts = useMemoO(() => {
    const c = { all: ORDERS.length, draft: 0, calc: 0, ready: 0, released: 0 };
    ORDERS.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [ORDERS]);
  const filtered = filter === "all" ? ORDERS : ORDERS.filter(o => o.status === filter);

  const filters = ["all", "draft", "calc", "ready", "released"];

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5 overflow-x-auto max-w-full">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2.5 h-7 rounded-md text-[12px] inline-flex items-center gap-1.5 whitespace-nowrap ${filter === f ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
              {f === "all" ? t.common.all : t.status[f]}
              <span className={`text-[10px] tabular-nums ${filter === f ? "text-white/60" : "text-stone-400"}`}>{counts[f] || 0}</span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <GhostBtn icon="filter">{t.common.filter}</GhostBtn>
        <PrimaryBtn icon="plus" onClick={() => setShowNew(true)}>{t.orders.newOrder}</PrimaryBtn>
      </div>
      <NewOrderDrawer open={showNew} onClose={() => setShowNew(false)} t={t} />

      <Card className="overflow-hidden">
        <div className="hidden md:grid grid-cols-[160px_1fr_120px_110px_140px_130px_28px_28px] gap-4 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium border-b border-stone-200/80 bg-stone-50/60">
          <div>{t.orders.cols.id}</div>
          <div>{customerLabel || t.orders.cols.customer}</div>
          <div>{t.orders.cols.type}</div>
          <div>{t.orders.cols.date}</div>
          <div>{t.orders.cols.status}</div>
          <div className="text-right">{t.orders.cols.total}</div>
          <div></div><div></div>
        </div>
        {filtered.map(o => (
          <OrderRow key={o.id} o={o} t={t} isOpen={expanded === o.id}
            onToggle={() => setExpanded(expanded === o.id ? null : o.id)}
            onNav={onNav}
            onOpenDetail={(id) => setOpenDetailId(id)} />
        ))}
      </Card>
      {openDetailId && (
        <SlideOver open={true} onClose={() => setOpenDetailId(null)}
          title={openDetailId}
          subtitle={ORDERS.find(o => o.id === openDetailId)?.customer || ""}
          width={560}
          footer={<GhostBtn onClick={() => setOpenDetailId(null)}>Bezárás</GhostBtn>}>
          <div className="px-5 py-5">
            <OrderRow
              o={ORDERS.find(o => o.id === openDetailId)}
              t={t} isOpen={true}
              onToggle={() => {}}
              onNav={onNav} />
          </div>
        </SlideOver>
      )}
    </div>
  );
}

window.OrdersPage = OrdersPage;
