// ──────────────────────────────────────────────────────────────────────────
// Procurement v2 page — PurchaseRequisition · SupplierInvoice ·
// Three-Way Match · PriceList. Role-aware (requester/approver) + SoD guards.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateP2, useMemo: useMemoP2, useEffect: useEffectP2 } = React;

// Generic FSM status pill driven by the tone/dot maps in data-procurement2.js
function FsmPill({ map, status, lang }) {
  const label = (map[lang] || map.hu)[status] || status;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${map.tone[status] || "bg-stone-100 text-stone-600"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${map.dot[status] || "bg-stone-400"}`} />
      {label}
    </span>
  );
}

// Field label + value block used across detail slide-overs
function Field({ label, children, mono }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1">{label}</div>
      <div className={`text-[12.5px] text-stone-900 ${mono ? "font-mono" : ""}`}>{children}</div>
    </div>
  );
}

function FormLabel({ children }) {
  return <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">{children}</div>;
}

// SoD warning banner
function SodBanner({ text }) {
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 text-[11.5px] text-rose-800 flex gap-2">
      <Icon name="alert" size={14} className="shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

// ── Three-Way Match helpers ─────────────────────────────────────────────────
const QTY_TOL = 0.02;   // ±2%
const PRICE_TOL = 0.01; // ±1%

function matchLine(line) {
  if (line.deliveredQty == null) {
    return { status: "pending", qtyVar: 0, qtyPct: 0, priceVar: 0 };
  }
  const qtyVar = line.invoicedQty - line.poQty;
  const qtyPct = line.poQty ? qtyVar / line.poQty : 0;
  const priceVar = line.poUnitPrice ? (line.unitPrice - line.poUnitPrice) : 0;
  const pricePct = line.poUnitPrice ? priceVar / line.poUnitPrice : 0;
  const qtyOk = qtyVar === 0;
  const priceOk = priceVar === 0;
  const withinTol = Math.abs(qtyPct) <= QTY_TOL && Math.abs(pricePct) <= PRICE_TOL;
  let status = "ok";
  if (!qtyOk || !priceOk) status = withinTol ? "within" : "exception";
  return { status, qtyVar, qtyPct, priceVar, pricePct };
}

const MATCH_TONE = {
  ok:        { bg: "bg-emerald-50", fg: "text-emerald-700", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  within:    { bg: "bg-amber-50",   fg: "text-amber-700",   dot: "bg-amber-500",   bar: "bg-amber-500" },
  exception: { bg: "bg-rose-50",    fg: "text-rose-700",    dot: "bg-rose-500",    bar: "bg-rose-500" },
  pending:   { bg: "bg-stone-100",  fg: "text-stone-500",   dot: "bg-stone-400",   bar: "bg-stone-300" },
};

function invoiceNet(inv) {
  return inv.lines.reduce((a, l) => a + l.invoicedQty * l.unitPrice, 0);
}
function invoiceVat(inv) {
  return inv.lines.reduce((a, l) => a + l.invoicedQty * l.unitPrice * (l.vat / 100), 0);
}
// Variance magnitude in HUF (rough EUR→HUF for threshold comparison only)
function invoiceVarianceHuf(inv) {
  const fx = inv.currency === "EUR" ? 390 : 1;
  return inv.lines.reduce((a, l) => {
    const m = matchLine(l);
    const qtyAmt = Math.abs(m.qtyVar) * l.unitPrice;
    const priceAmt = Math.abs(m.priceVar) * l.invoicedQty;
    return a + (qtyAmt + priceAmt) * fx;
  }, 0);
}

// ════════════════════════════════════════════════════════════════════════════
// Requisitions tab
// ════════════════════════════════════════════════════════════════════════════
function GeneratePOSheet({ groups, onClose, onConfirm }) {
  const totalLines = groups.reduce((s, g) => s + g.items.length, 0);
  const grand = groups.reduce((s, g) => s + g.items.reduce((a, x) => a + x.qty * x.estUnit, 0), 0);
  return (
    <div className="fixed inset-0 z-[65] flex items-end md:items-center justify-center" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-stone-900/40" onClick={onClose} aria-label="Bezárás" />
      <div className="relative bg-white w-full md:w-[560px] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[88vh] animate-[chSlide_.22s_ease-out]" style={{ paddingBottom: "max(env(safe-area-inset-bottom),0px)" }}>
        <div className="px-5 pt-4 pb-3 border-b border-stone-200 shrink-0">
          <div className="text-[14.5px] font-semibold text-stone-900">Megrendelések generálása</div>
          <div className="text-[11.5px] text-stone-500 mt-0.5">
            {totalLines} jóváhagyott igény → <span className="font-semibold text-sky-700">{groups.length} külön megrendelés</span> · szállítónként
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {groups.map((g, i) => {
            const sub = g.items.reduce((a, x) => a + x.qty * x.estUnit, 0);
            return (
              <div key={i} className="rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-3.5 py-2.5 bg-sky-50/60 border-b border-stone-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-sky-600 text-white grid place-items-center text-[11px] font-bold shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-stone-900 truncate">{g.supplier}</div>
                      <div className="text-[10px] text-stone-500">{g.items.length} tétel · 1 megrendelés</div>
                    </div>
                  </div>
                  <div className="text-[12.5px] font-semibold text-stone-900 tabular-nums shrink-0">{fmtHUF(sub)}</div>
                </div>
                <div className="divide-y divide-stone-100">
                  {g.items.map(x => (
                    <div key={x.id} className="px-3.5 py-2 flex items-center justify-between gap-2 text-[12px]">
                      <span className="text-stone-700 truncate">{x.material}</span>
                      <span className="font-mono tabular-nums text-stone-500 shrink-0">{fmtNum(x.qty)} {x.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-stone-200 bg-stone-50/70 shrink-0 flex items-center justify-between gap-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom),12px)" }}>
          <div className="text-[12px] text-stone-500">Összesen <span className="font-semibold text-stone-800 tabular-nums">{fmtHUF(grand)}</span></div>
          <div className="flex items-center gap-2">
            <GhostBtn onClick={onClose}>Mégse</GhostBtn>
            <button onClick={onConfirm}
              className="h-9 px-4 rounded-lg text-[12.5px] font-medium bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center gap-1.5">
              <Icon name="check" size={14} />{groups.length} megrendelés létrehozása
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReqTab({ t, lang, me, isApprover }) {
  const sim = useSim();
  const rows = sim.requisitions;
  const [openId, setOpenId] = useStateP2(null);
  const [showNew, setShowNew] = useStateP2(false);
  const [builderOpen, setBuilderOpen] = useStateP2(false);
  const [genOpen, setGenOpen] = useStateP2(false);
  const [q, setQ] = useStateP2("");
  const [rejecting, setRejecting] = useStateP2(false);
  const [rejectReason, setRejectReason] = useStateP2("");
  const [expandedReqId, setExpandedReqId] = useStateP2(null);
  const [lineSuppliers, setLineSuppliers] = useStateP2({});
  const [assignOpen, setAssignOpen] = useStateP2(false);

  // Deep-link: auto-open a specific requisition on mount if signalled
  useEffectP2(() => {
    const p = window._pendingOpen;
    if (!p || p.type !== "requisition") return;
    window._pendingOpen = null;
    setOpenId(p.id);
  }, []);

  const r = t.req;
  const cur = rows.find(x => x.id === openId) || null;
  const sodBlocked = cur && isApprover && me.name === cur.requester;

  const filtered = rows.filter(x => {
    if (!q) return true;
    const ql = q.toLowerCase();
    return x.id.toLowerCase().includes(ql)
      || (x.material || "").toLowerCase().includes(ql)
      || (x.lines || []).some(l => l.material.toLowerCase().includes(ql));
  });

  const update = (id, patch) => window.sim.updateRequisition(id, patch);

  // rendelés-generálás + művelet utáni navigációs kérdés (linked-refs.jsx)
  const genOrderWithFollowUp = (reqId) => {
    const oid = window.sim.createOrderFromRequisition(reqId);
    if (!oid) return;
    window.askNextStep?.({
      title: `Rendelés létrejött — ${oid}`,
      options: [
        { label: "Rendelés megnyitása", icon: "orders", primary: true, hint: "Értékesítés → Rendelések · számítás + kiadás gyártásba", onClick: () => { window._pendingOpen = { type: "order", id: oid }; window.navigateTo?.("sales", "orders"); } },
        { label: "További igények kezelése", icon: "inbox", hint: "Maradok az igénylések listáján" },
      ],
    });
  };
  const doApprove = () => {
    const reqId = cur.id, wasOrderReq = cur.type === "order-req";
    update(cur.id, { status: "Approved", approver: me.name, approvedAt: "2026-05-29 10:00" });
    window.toast?.(`✓ ${cur.id} jóváhagyva`, "success");
    setOpenId(null);
    window.askNextStep?.({
      title: `${reqId} jóváhagyva`,
      text: wasOrderReq ? "A jóváhagyott igényből most rendelés generálható." : undefined,
      options: [
        ...(wasOrderReq ? [{ label: "Rendelés generálása most", icon: "factory", primary: true, hint: "Az igényből azonnal rendelés készül", onClick: () => genOrderWithFollowUp(reqId) }] : []),
        { label: "További igények kezelése", icon: "inbox", hint: "Maradok az igénylések listáján" },
      ],
    });
  };
  const doReject = () => {
    update(cur.id, { status: "Rejected", approver: me.name, rejectReason: rejectReason || "—", approvedAt: "2026-05-29 10:00" });
    window.toast?.(`${cur.id} elutasítva`, "info");
    setRejecting(false); setRejectReason(""); setOpenId(null);
  };
  const doToPo = () => {
    if (cur.lines && cur.lines.length > 0) { setAssignOpen(true); return; }
    const po = "PO-2426-" + (92 + Math.floor(Math.random() * 6));
    update(cur.id, { status: "ConvertedToPO", poRef: po });
    window.sim?.createPOsFromReqs([{ supplier: cur.preferredSupplier || "Egyéb (nincs szállító)",
      lines: [{ material: cur.material, matCode: cur.matCode, qty: cur.qty, unit: cur.unit, price: cur.estUnit, reqId: cur.id }] }]);
    setOpenId(null);
  };

  const doToPoMulti = () => {
    if (!cur || !cur.lines) return;
    const groups = {};
    cur.lines.forEach((l, i) => {
      const sup = lineSuppliers[cur.id + "_" + i] || l.supplier || "Egyéb (nincs szállító)";
      if (!groups[sup]) groups[sup] = [];
      groups[sup].push({ material: l.material, matCode: l.code || "—", qty: l.qty, unit: l.unit, price: l.estUnit || 0, reqId: cur.id });
    });
    const groupArr = Object.entries(groups).map(([supplier, lines]) => ({ supplier, lines }));
    const created = window.sim?.createPOsFromReqs(groupArr) || [];
    const poRef = created.map(c => c.poId).join(", ");
    update(cur.id, { status: "ConvertedToPO", poRef: poRef || "PO-multi" });
    setAssignOpen(false); setOpenId(null);
    window.toast?.("✓ " + groupArr.length + " megrendelés generálva", "success");
  };

  // Bulk: split all approved requisitions into one PO per supplier
  const approved = rows.filter(x => x.status === "Approved");
  const supplierGroups = (() => {
    const map = {};
    approved.forEach(x => {
      const key = x.preferredSupplier || "Egyéb (nincs szállító)";
      (map[key] = map[key] || []).push(x);
    });
    return Object.entries(map).map(([supplier, items]) => ({ supplier, items }));
  })();
  const doGenerate = () => {
    const groups = supplierGroups.map(g => ({ supplier: g.supplier,
      lines: g.items.map(x => ({ material: x.material, matCode: x.matCode, qty: x.qty, unit: x.unit, price: x.estUnit, reqId: x.id })) }));
    const created = window.sim?.createPOsFromReqs(groups) || [];
    const refBySupplier = {}; created.forEach(c => { refBySupplier[c.supplier] = c.poId; });
    approved.forEach(x => window.sim.updateRequisition(x.id, { status: "ConvertedToPO", poRef: refBySupplier[x.preferredSupplier || "Egyéb (nincs szállító)"] }));
    setGenOpen(false);
  };

  return (
    <div>
      {/* toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="text-[12.5px] text-stone-500"><span className="font-semibold text-stone-800 tabular-nums">{rows.length}</span> {r.count}</div>
        <div className="flex items-center gap-2 px-3 h-8 flex-1 min-w-[150px] sm:flex-none sm:w-[260px] rounded-lg bg-white border border-stone-200 text-stone-500 sm:ml-2">
          <Icon name="search" size={14} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={r.searchPh}
            className="bg-transparent outline-none text-[12px] flex-1 min-w-0 placeholder:text-stone-400" />
        </div>
        <div className="hidden sm:block flex-1" />
        {supplierGroups.length > 0 && (
          <button onClick={() => setGenOpen(true)}
            className="h-8 px-3 rounded-lg bg-sky-600 text-white text-[11.5px] font-medium hover:bg-sky-700 inline-flex items-center gap-1.5 shadow-sm">
            <Icon name="external" size={13} />Megrendelés ({approved.length})
          </button>
        )}
        <PrimaryBtn icon="plus" onClick={() => setBuilderOpen(true)}>{r.new}</PrimaryBtn>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="hidden md:flex items-center border-b border-stone-200/80 bg-stone-50/40">
          <div className="flex-1 grid grid-cols-[120px_minmax(0,1.5fr)_100px_110px_120px_28px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500">
            <div>{r.cols.id}</div><div>{r.cols.requester}</div><div>Tételek</div><div>{r.cols.date}</div><div>{r.cols.status}</div><div></div>
          </div>
          <div className="w-10 shrink-0" />
        </div>
        {filtered.map(x => {
          const sod = isApprover && me.name === x.requester && x.status === "Draft";
          const isExp = expandedReqId === x.id;
          const lineCount = x.lines ? x.lines.length : 1;
          const lineLabel = x.lines ? lineCount + " tétel" : (x.material || "—");
          const typeTag = x.type === "order-req"
            ? <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Rendelés igény</span>
            : x.type === "multi"
              ? <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">{lineCount} tétel</span>
              : null;
          return (
            <div key={x.id} className="border-b border-stone-100 last:border-0">
              {/* Desktop row */}
              <div className="hidden md:flex items-center hover:bg-stone-50/60 group">
                <button onClick={() => setExpandedReqId(isExp ? null : x.id)}
                  className="flex-1 grid grid-cols-[120px_minmax(0,1.5fr)_100px_110px_120px_28px] gap-3 px-5 py-3 items-center text-left">
                  <div className="text-[11.5px] font-mono text-stone-500 truncate">{x.id}</div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[12.5px] font-medium text-stone-900 truncate">{x.requester}</span>
                    {sod && <span className="text-rose-500 shrink-0"><Icon name="alert" size={11} /></span>}
                  </div>
                  <div className="flex items-center gap-1.5">{typeTag || <span className="text-[12px] text-stone-600">{lineLabel}</span>}</div>
                  <div className="text-[11px] font-mono text-stone-500">{x.date}</div>
                  <div><FsmPill map={PR_STATUS} status={x.status} lang={lang} /></div>
                  <div className={"text-stone-400 transition-transform " + (isExp ? "rotate-90" : "")}><Icon name="chevron" size={13} /></div>
                </button>
                <button onClick={() => setOpenId(x.id)} title="Teljes nézet"
                  className="w-10 flex items-center justify-center py-3 text-stone-300 hover:text-stone-600 transition shrink-0">
                  <Icon name="external" size={13} />
                </button>
              </div>
              {/* Mobile row */}
              <div className="md:hidden flex items-center hover:bg-stone-50/60">
                <button onClick={() => setExpandedReqId(isExp ? null : x.id)} className="flex-1 px-4 py-3.5 flex items-center gap-3 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13.5px] font-medium text-stone-900 truncate">{x.requester}</span>
                      {typeTag}
                      {sod && <span className="text-rose-500 shrink-0"><Icon name="alert" size={12} /></span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <FsmPill map={PR_STATUS} status={x.status} lang={lang} />
                      <span className="text-[11px] font-mono text-stone-500 truncate">{x.id}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[12px] font-medium text-stone-900">{lineLabel}</div>
                    <div className="text-[11px] font-mono text-stone-400">{x.date}</div>
                  </div>
                  <Icon name="chevron" size={15} className={"text-stone-300 shrink-0 transition-transform " + (isExp ? "rotate-90" : "")} />
                </button>
                <button onClick={() => setOpenId(x.id)} className="px-3 py-3.5 text-stone-300 hover:text-stone-600 shrink-0">
                  <Icon name="external" size={14} />
                </button>
              </div>
              {/* Inline expand — line items */}
              {isExp && (
                <div className="px-5 pb-4 pt-3 bg-stone-50/40 border-t border-stone-100">
                  {x.lines && x.lines.length > 0 ? (
                    <div className="rounded-lg border border-stone-200 overflow-hidden mb-3">
                      <div className="grid grid-cols-[minmax(0,2fr)_80px_80px_100px] gap-2 px-3 py-2 bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500 font-medium border-b border-stone-100">
                        <div>Anyag</div><div className="text-right">Menny.</div><div>Egység</div><div className="text-right">Egységár</div>
                      </div>
                      {x.lines.map((l, i) => (
                        <div key={i} className="grid grid-cols-[minmax(0,2fr)_80px_80px_100px] gap-2 px-3 py-2 border-b border-stone-100 last:border-0 text-[12px]">
                          <div>
                            <div className="font-medium text-stone-900 truncate">{l.material}</div>
                            <div className="text-[10px] font-mono text-stone-400">{l.code}</div>
                          </div>
                          <div className="text-right font-mono text-stone-700">{fmtNum(l.qty)}</div>
                          <div className="text-stone-500">{l.unit}</div>
                          <div className="text-right font-mono text-stone-700">{l.estUnit ? fmtHUF(l.estUnit) : "—"}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[12px] text-stone-600 mb-3">{x.material} · {fmtNum(x.qty)} {x.unit}</div>
                  )}
                  {x.note && <div className="text-[11.5px] text-stone-500 italic mb-2">{x.note}</div>}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setOpenId(x.id)}
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-stone-200 bg-white text-stone-600 text-[11px] hover:bg-stone-50">
                      <Icon name="external" size={11} /> Teljes nézet
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-stone-100">
          {filtered.map(x => {
            const sod = isApprover && me.name === x.requester && x.status === "Draft";
            return (
              <button key={x.id} onClick={() => setOpenId(x.id)}
                className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-stone-50/60 active:bg-stone-100/60 transition">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[13.5px] font-medium text-stone-900 truncate">{x.material}</span>
                    {x.type === "order-req" && <span className="shrink-0 text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Rendelés igény</span>}
                    {sod && <span className="text-rose-500 shrink-0"><Icon name="alert" size={12} /></span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <FsmPill map={PR_STATUS} status={x.status} lang={lang} />
                    <span className="text-[11px] font-mono text-stone-500 truncate">{x.id} · {x.requester}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13px] font-semibold text-stone-900 tabular-nums">{fmtNum(x.qty)} <span className="text-stone-400 text-[10px] font-normal">{x.unit}</span></div>
                  <div className="text-[11px] font-mono text-stone-400">{x.date}</div>
                </div>
                <Icon name="chevron" size={15} className="text-stone-300 shrink-0" />
              </button>
            );
          })}
        </div>
      </Card>

      {/* Detail slide-over */}
      <SlideOver
        open={!!cur} onClose={() => { setOpenId(null); setRejecting(false); }}
        title={cur?.id} subtitle={cur && (PR_STATUS[lang] || PR_STATUS.hu)[cur.status]} width={520}
        footer={cur && (
          cur.status === "Draft" ? (
            isApprover ? (
              rejecting ? (
                <><GhostBtn onClick={() => setRejecting(false)}>Mégse</GhostBtn>
                  <button onClick={doReject} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-rose-600 text-white text-[12.5px] font-medium hover:bg-rose-700">
                    <Icon name="x" size={15} />{r.reject}</button></>
              ) : (
                <><GhostBtn icon="x" onClick={() => setRejecting(true)} >{r.reject}</GhostBtn>
                  <button disabled={sodBlocked} onClick={doApprove}
                    className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-white text-[12.5px] font-medium ${sodBlocked ? "bg-stone-300 cursor-not-allowed" : "bg-teal-700 hover:bg-teal-800"}`}>
                    <Icon name="check" size={15} />{r.approve}</button></>
              )
            ) : <div className="text-[11.5px] text-stone-400 italic">Jóváhagyás csak jóváhagyó szerepkörrel</div>
          ) : cur.status === "Approved" ? (
            cur.sourceKind === "internal_unit"
              ? <PrimaryBtn icon="factory" onClick={() => window.sim.delegateReqToInternalUnit(cur.id)}>Belső egységnek kiadása</PrimaryBtn>
            : cur.type === "order-req"
              ? <PrimaryBtn icon="factory" onClick={() => { setOpenId(null); genOrderWithFollowUp(cur.id); }}>{lang === "en" ? "Generate Order" : "Rendelés generálása"}</PrimaryBtn>
              : assignOpen
                ? <><GhostBtn onClick={() => setAssignOpen(false)}>Vissza</GhostBtn>
                    <PrimaryBtn icon="check" onClick={doToPoMulti}>Megrendelések generálása</PrimaryBtn></>
                : <PrimaryBtn icon="external" onClick={doToPo}>{r.toPo}</PrimaryBtn>
          ) : <GhostBtn onClick={() => setOpenId(null)}>Bezár</GhostBtn>
        )}
      >
        {cur && (
          <div className="px-5 py-4 space-y-4">
            {sodBlocked && cur.status === "Draft" && <SodBanner text={t.sod} />}

            {/* Linked order items — sourced via orderRef or fromQuote→order */}
            {(() => {
              const orderRef = cur.orderRef
                || (cur.fromQuote ? (sim.orders || []).find(o => o.fromQuote === cur.fromQuote)?.id : null);
              const order = orderRef ? (sim.orders || []).find(o => o.id === orderRef) : null;
              if (!order) return null;
              const lines = order.lines || [];
              const itemCount = typeof order.items === "number" ? order.items : (lines.length || 1);
              const ORDER_STATUS_TONE = {
                draft: "bg-stone-100 text-stone-600", calc: "bg-amber-100 text-amber-700",
                ready: "bg-sky-100 text-sky-700", released: "bg-teal-100 text-teal-700",
                delivered: "bg-emerald-100 text-emerald-700",
              };
              const ORDER_STATUS_LABEL = {
                draft: "Vázlat", calc: "Kalkulált", ready: "Kész", released: "Gyártásban", delivered: "Teljesített",
              };
              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">
                      Kapcsolódó rendelés tételei
                    </div>
                    <button onClick={() => { setOpenId(null); window._pendingOpen = { type: "order", id: order.id }; window.navigateTo?.("sales", "orders"); }}
                      className="inline-flex items-center gap-1 text-[11px] text-sky-700 font-medium hover:underline">
                      <span className="font-mono">{order.id}</span>
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-medium ${ORDER_STATUS_TONE[order.status] || "bg-stone-100 text-stone-600"}`}>
                        {ORDER_STATUS_LABEL[order.status] || order.status}
                      </span>
                      <Icon name="external" size={11} className="ml-0.5" />
                    </button>
                  </div>
                  <div className="rounded-lg border border-stone-200 overflow-hidden bg-white">
                    {lines.length > 0 ? (
                      <>
                        <div className="hidden sm:grid grid-cols-[minmax(0,2fr)_70px_70px_90px] gap-2 px-3 py-2 bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500 font-medium border-b border-stone-100">
                          <div>Tétel</div><div className="text-right">Menny.</div><div>Egység</div><div className="text-right">Nettó</div>
                        </div>
                        {lines.map((l, i) => (
                          <div key={i} className="px-3 py-2.5 border-b border-stone-100 last:border-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="text-[12.5px] font-medium text-stone-900 truncate">{l.name || l.material || ("Tétel " + (i + 1))}</div>
                                {l.code && <div className="text-[10.5px] font-mono text-stone-400 truncate">{l.code}</div>}
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="text-[12px] tabular-nums font-medium text-stone-900">
                                  {l.qty ?? l.quantity ?? ""} <span className="text-stone-400 font-normal">{l.unit || ""}</span>
                                </div>
                                {(l.price || l.unitPrice) && (
                                  <div className="text-[11px] tabular-nums text-stone-500">{fmtHUF((l.price || l.unitPrice || 0) * (l.qty || l.quantity || 1))}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="px-3 py-2 bg-stone-50/70 border-t border-stone-100 flex items-center justify-between">
                          <span className="text-[11px] text-stone-500">{lines.length} tétel összesen</span>
                          {order.total && <span className="text-[12px] font-semibold tabular-nums text-stone-900">{fmtHUF(order.total)}</span>}
                        </div>
                      </>
                    ) : (
                      <div className="px-3 py-3 flex items-center gap-2 text-[12px] text-stone-600">
                        <Icon name="box" size={13} className="text-stone-400 shrink-0" />
                        <span>{itemCount} összevont tétel — részletes lista a rendelésnél.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Multi-line lines table */}
            {cur.lines && cur.lines.length > 0 ? (
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2">
                  Tételek ({cur.lines.length})
                </div>
                <div className="rounded-lg border border-stone-200 overflow-hidden">
                  <div className="grid grid-cols-[minmax(0,2fr)_70px_70px_100px] gap-2 px-3 py-2 bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500 font-medium border-b border-stone-100">
                    <div>Anyag</div><div className="text-right">Menny.</div><div>Egység</div><div className="text-right">Egységár</div>
                  </div>
                  {cur.lines.map((l, i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,2fr)_70px_70px_100px] gap-2 px-3 py-2.5 border-b border-stone-100 last:border-0 items-center">
                      <div>
                        <div className="text-[12.5px] font-medium text-stone-900 truncate">{l.material}</div>
                        <div className="text-[10px] font-mono text-stone-400">{l.code}</div>
                      </div>
                      <div className="text-right font-mono text-[12px] text-stone-700">{fmtNum(l.qty)}</div>
                      <div className="text-[12px] text-stone-500">{l.unit}</div>
                      <div className="text-right font-mono text-[12px] text-stone-700">{l.estUnit ? fmtHUF(l.estUnit) : "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {!cur.orderRef && <Field label={r.material}>{cur.material}<div className="text-[10.5px] font-mono text-stone-400">{cur.matCode}</div></Field>}
                {!cur.orderRef && <Field label={r.quantity}><span className="tabular-nums">{fmtNum(cur.qty)}</span> {cur.unit}</Field>}
                <Field label={r.preferred}>{cur.preferredSupplier || <span className="text-stone-400">{r.noneSupplier}</span>}</Field>
                <Field label={r.estValue} mono>{fmtHUF(cur.qty * cur.estUnit)}</Field>
                <Field label={r.cols.requester}>{cur.requester}</Field>
                <Field label={r.cols.date} mono>{cur.date}</Field>
              </div>
            )}

            {/* Supplier assignment — shown for Approved multi-line reqs when assignOpen */}
            {assignOpen && cur.lines && cur.status === "Approved" && (
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2">Szállító hozzárendelése tételenként</div>
                <div className="space-y-2">
                  {cur.lines.map((l, i) => {
                    const catItem = (sim.catalog || []).find(c => c.code === l.code);
                    const opts = catItem?.suppliers || [];
                    const key = cur.id + "_" + i;
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 bg-white border border-stone-200 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-medium text-stone-900 truncate">{l.material}</div>
                          <div className="text-[10.5px] text-stone-500">{fmtNum(l.qty)} {l.unit}</div>
                        </div>
                        <select value={lineSuppliers[key] ?? (l.supplier || "")}
                          onChange={e => setLineSuppliers(prev => ({ ...prev, [key]: e.target.value }))}
                          className="h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-teal-500 shrink-0 max-w-[180px]">
                          <option value="">Szállító választása…</option>
                          {l.supplier && !opts.some(s => s.name === l.supplier) && <option value={l.supplier}>{l.supplier}{l.estUnit ? ` — ${fmtHUF(l.estUnit)}/${l.unit}` : ""}</option>}
                          {opts.map(s => <option key={s.name} value={s.name}>{s.name} — {fmtHUF(s.price)}/{l.unit}</option>)}
                          <option value="Egyéb">Egyéb szállító</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Belső egység megrendelés (internal_order) — B2B kézfogás-lánc */}
            {cur.sourceKind === "internal_unit" && (() => {
              const io = (sim.handshakes || []).find(h => h.kind === "internal_order" && h.reqId === cur.id);
              const IO = window.IO_STATUS || { hu: {}, tone: {}, dot: {}, order: ["sent", "accepted", "done"] };
              if (!io) {
                if (cur.status !== "Approved") return null;
                return (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-3.5 py-3 flex items-start gap-2.5">
                    <Icon name="factory" size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-[11.5px] text-amber-800 leading-relaxed">
                      <span className="font-semibold">{cur.unitName || cur.preferredSupplier}</span> belső egység — jóváhagyva. Add ki <span className="font-medium">belső megrendelésként</span> (kézfogás-lánc), nem külső PO-ként.
                    </div>
                  </div>
                );
              }
              const ordMap = { sent: 0, accepted: 1, done: 2, declined: 1 };
              const pos = ordMap[io.status] ?? 0;
              return (
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2">Belső megrendelés · <span className="font-mono">{io.id}</span></div>
                  <div className="rounded-xl border border-stone-200 overflow-hidden bg-white">
                    <div className="px-3.5 py-3 flex items-center justify-between gap-2 border-b border-stone-100 bg-amber-50/40">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-amber-500 text-white grid place-items-center shrink-0"><Icon name="factory" size={14} /></span>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-semibold text-stone-900 truncate">{io.unitName}</div>
                          <div className="text-[10.5px] text-stone-500">belső egység · {fmtNum(io.qty)} {io.unit}</div>
                        </div>
                      </div>
                      <span className={"inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium border " + ((IO.tone || {})[io.status] || "bg-stone-100 text-stone-600 border-stone-200")}>
                        <span className={"w-1.5 h-1.5 rounded-full " + ((IO.dot || {})[io.status] || "bg-stone-400")} />{(IO.hu || {})[io.status] || io.status}
                      </span>
                    </div>
                    <div className="px-3.5 py-3">
                      <div className="flex items-center gap-1">
                        {(IO.order || ["sent", "accepted", "done"]).map((st, i, arr) => {
                          const done = i <= pos && io.status !== "declined";
                          return (
                            <React.Fragment key={st}>
                              <div className={"flex-1 text-center py-1.5 rounded-md text-[10.5px] font-medium " + (done ? "bg-amber-100 text-amber-800" : "bg-stone-50 text-stone-400")}>{(IO.hu || {})[st]}</div>
                              {i < arr.length - 1 && <Icon name="chevron" size={12} className="text-stone-300" />}
                            </React.Fragment>
                          );
                        })}
                      </div>
                      {io.status === "declined" && <div className="mt-2 text-[11px] text-rose-600">Az egység visszautasította — az igény visszakerült „Jóváhagyva” állapotba.</div>}
                    </div>
                  </div>
                  {/* Egység-oldali demó akciók (a fogadó belső egység nézete) */}
                  {io.status !== "done" && io.status !== "declined" && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10.5px] text-stone-400 mr-auto">Egység nézete:</span>
                      {io.status === "sent" && <>
                        <button onClick={() => window.sim.declineInternalOrder(io.id)} className="h-8 px-3 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-600 hover:bg-stone-50">Visszautasít</button>
                        <button onClick={() => window.sim.acceptInternalOrder(io.id)} className="h-8 px-3.5 rounded-lg text-[11.5px] font-medium bg-amber-500 text-white hover:bg-amber-600 inline-flex items-center gap-1.5"><Icon name="check" size={13} />Elfogad</button>
                      </>}
                      {io.status === "accepted" && <button onClick={() => window.sim.completeInternalOrder(io.id)} className="h-8 px-3.5 rounded-lg text-[11.5px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1.5"><Icon name="check" size={13} />Kész jelölés</button>}
                    </div>
                  )}
                </div>
              );
            })()}

            {cur.note && (
              <div>
                <FormLabel>{r.note}</FormLabel>
                <div className="text-[12.5px] text-stone-700 bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5 leading-relaxed">{cur.note}</div>
              </div>
            )}

            {/* Vissza-navigáció: forrás ajánlat + projekt */}
            {(() => {
              const linkedQuote = cur.fromQuote ? (sim.quotes || []).find(qq => qq.id === cur.fromQuote) : null;
              const linkedProject = (sim.projects || []).find(pp =>
                (cur.fromQuote && pp.fromQuote === cur.fromQuote) || (cur.projectRef && pp.id === cur.projectRef)) || null;
              if (!linkedQuote && !linkedProject && !cur.fromQuote) return null;
              const goQuote = () => { const id = cur.fromQuote; setOpenId(null); window._pendingOpen = { type: "quote", id }; window.navigateTo?.("sales", "quotes"); };
              const goProject = () => { const id = linkedProject.id; setOpenId(null); window._pendingOpen = { type: "project", id }; window.navigateTo?.("projects"); };
              return (
                <div>
                  <FormLabel>Forrás</FormLabel>
                  <div className="space-y-1.5">
                    {cur.fromQuote && (
                      <button onClick={goQuote}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-stone-200 rounded-lg hover:border-sky-300 hover:bg-sky-50/40 transition group">
                        <span className="flex items-center gap-2 text-[12px] min-w-0">
                          <Icon name="send" size={13} className="text-sky-600 shrink-0" />
                          <span className="text-stone-500">Ajánlat</span>
                          <span className="font-mono font-medium text-stone-900 truncate">{cur.fromQuote}</span>
                          {linkedQuote && <span className="text-stone-400 truncate hidden sm:inline">· {linkedQuote.customer}</span>}
                        </span>
                        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-sky-700">Megnyitás <Icon name="chevron" size={11} className="rotate-[-90deg]" /></span>
                      </button>
                    )}
                    {linkedProject && (
                      <button onClick={goProject}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-stone-200 rounded-lg hover:border-violet-300 hover:bg-violet-50/40 transition group">
                        <span className="flex items-center gap-2 text-[12px] min-w-0">
                          <Icon name="folder" size={13} className="text-violet-600 shrink-0" />
                          <span className="text-stone-500">Projekt</span>
                          <span className="font-medium text-stone-900 truncate">{linkedProject.name}</span>
                        </span>
                        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-violet-700">Megnyitás <Icon name="chevron" size={11} className="rotate-[-90deg]" /></span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* FSM timeline */}
            <div>
              <FormLabel>Folyamat</FormLabel>
              <div className="flex items-center gap-1">
                {["Draft", "Approved", cur.sourceKind === "internal_unit" ? "Delegated" : cur.type === "order-req" ? "ConvertedToOrder" : "ConvertedToPO"].map((st, i) => {
                  const statusOrder = { Draft: 0, Approved: 1, ConvertedToPO: 2, ConvertedToOrder: 2, Delegated: 2, Fulfilled: 2, Rejected: 1 };
                  const order = statusOrder[cur.status] ?? 0;
                  const rejected = cur.status === "Rejected";
                  const done = i <= order && !(rejected && i >= 1);
                  return (
                    <React.Fragment key={st}>
                      <div className={`flex-1 text-center py-1.5 rounded-md text-[10.5px] font-medium ${done ? "bg-teal-50 text-teal-700" : "bg-stone-50 text-stone-400"}`}>
                        {(PR_STATUS[lang] || PR_STATUS.hu)[st]}
                      </div>
                      {i < 2 && <Icon name="chevron" size={12} className="text-stone-300" />}
                    </React.Fragment>
                  );
                })}
              </div>
              {cur.status === "Rejected" && (
                <div className="mt-2 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-[11.5px] text-rose-700">
                  <span className="font-medium">{r.rejectedReason}:</span> {cur.rejectReason}
                </div>
              )}
            </div>

            {cur.approver && (
              <div className="text-[11px] text-stone-500 font-mono">{r.approvedBy}: {cur.approver} · {cur.approvedAt}</div>
            )}
            {cur.poRef && (
              <div className="flex items-center gap-2 text-[12px] text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
                <Icon name="external" size={13} /><span className="font-mono">{cur.poRef}</span>
              </div>
            )}

            {rejecting && (
              <div>
                <FormLabel>{r.rejectedReason}</FormLabel>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder={r.rejectPh}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 resize-none" />
              </div>
            )}
          </div>
        )}
      </SlideOver>

      <NewReqDrawer open={showNew} onClose={() => setShowNew(false)} t={t} me={me}
        onCreate={(row) => { window.sim.addRequisitions([row]); window.toast?.(`✓ ${row.id} beküldve`, "success"); }} />
      {builderOpen && (
        <ItemBuilder mode="procurement" groupBy="cat" catalog={sim.catalog}
          onClose={() => setBuilderOpen(false)}
          onSubmit={({ lines }) => {
            window.sim.createMultiLineRequisition({ lines, note: "", requester: me.name });
            setBuilderOpen(false);
          }} />
      )}
      {genOpen && <GeneratePOSheet groups={supplierGroups} onClose={() => setGenOpen(false)} onConfirm={doGenerate} />}
    </div>
  );
}

function NewReqDrawer({ open, onClose, t, me, onCreate }) {
  const r = t.req;
  const [material, setMaterial] = useStateP2("");
  const [qty, setQty] = useStateP2("");
  const [unit, setUnit] = useStateP2("tábla");
  const [supplier, setSupplier] = useStateP2("");
  const [note, setNote] = useStateP2("");

  const submit = (asDraft) => {
    const id = "PR-2426-" + (32 + Math.floor(Math.random() * 60));
    onCreate({
      id, material: material || "Új anyag", matCode: "—", qty: Number(qty) || 0, unit,
      preferredSupplier: supplier || null, requester: me.name, date: "2026-05-29",
      status: "Draft", note: note || "—", estUnit: 0,
    });
    setMaterial(""); setQty(""); setSupplier(""); setNote("");
    onClose();
  };

  const suppliers = SUPPLIERS.map(s => s.name);

  return (
    <SlideOver open={open} onClose={onClose} title={r.new} subtitle={`${me.name} · ${me.roleHu}`} width={520}
      footer={<><GhostBtn onClick={onClose}>Mégse</GhostBtn>
        <GhostBtn icon="check" onClick={() => submit(true)}>{r.saveDraft}</GhostBtn>
        <PrimaryBtn icon="send" onClick={() => submit(false)}>{r.save}</PrimaryBtn></>}>
      <div className="px-5 py-4 space-y-5">
        <div>
          <FormLabel>{r.material}</FormLabel>
          <input list="mat-list" value={material} onChange={e => setMaterial(e.target.value)} placeholder="pl. Tölgy 22mm tábla"
            className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
          <datalist id="mat-list">{MATERIALS.map(m => <option key={m.code} value={m.name} />)}</datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FormLabel>{r.quantity}</FormLabel>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0"
              className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono tabular-nums outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <FormLabel>{r.unit}</FormLabel>
            <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white">
              {["tábla", "db", "fm", "m²", "szett", "csomag"].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div>
          <FormLabel>{r.preferred}</FormLabel>
          <select value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white">
            <option value="">{r.noneSupplier}</option>
            {suppliers.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <FormLabel>{r.note}</FormLabel>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder={r.note + "…"}
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none" />
        </div>
        <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
          <Icon name="user" size={12} /> Igénylő: <span className="text-stone-600 font-medium">{me.name}</span>
        </div>
      </div>
    </SlideOver>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Three-Way Match line table (shared by invoice detail + match tab)
// ════════════════════════════════════════════════════════════════════════════
function MatchTable({ inv, t, lang }) {
  const m = t.match;
  return (
    <div className="border border-stone-200 rounded-lg overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1.4fr)_72px_72px_72px_90px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 bg-stone-50/60 border-b border-stone-100">
        <div>{t.inv.colMat}</div><div className="text-right">{m.poQty}</div><div className="text-right">{m.deliv}</div><div className="text-right">{m.inv}</div><div className="text-right">{m.varPct}</div>
      </div>
      {inv.lines.map((l, i) => {
        const r = matchLine(l);
        const tone = MATCH_TONE[r.status];
        return (
          <div key={i} className="grid grid-cols-[minmax(0,1.4fr)_72px_72px_72px_90px] gap-2 px-3 py-2.5 border-b border-stone-100 last:border-0 items-center text-[11.5px]">
            <div className="min-w-0">
              <div className="text-stone-900 truncate">{l.material}</div>
              <span className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-medium ${tone.bg} ${tone.fg}`}>
                <span className={`w-1 h-1 rounded-full ${tone.dot}`} />
                {r.status === "pending" ? t.inv.pending : m[r.status]}
              </span>
            </div>
            <div className="text-right font-mono tabular-nums text-stone-600">{l.poQty}</div>
            <div className="text-right font-mono tabular-nums text-stone-600">{l.deliveredQty ?? "—"}</div>
            <div className={`text-right font-mono tabular-nums ${r.qtyVar !== 0 ? tone.fg + " font-semibold" : "text-stone-600"}`}>{l.invoicedQty}</div>
            <div className={`text-right font-mono tabular-nums ${r.status === "exception" ? tone.fg + " font-semibold" : "text-stone-500"}`}>
              {r.status === "pending" ? "—" : (r.qtyPct === 0 && r.priceVar === 0 ? "0%" : (r.qtyPct ? (r.qtyPct > 0 ? "+" : "") + (r.qtyPct * 100).toFixed(1) + "%" : (r.pricePct > 0 ? "+" : "") + (r.pricePct * 100).toFixed(1) + "%"))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Invoices tab
// ════════════════════════════════════════════════════════════════════════════
function InvTab({ t, lang, me, isApprover }) {
  const [rows, setRows] = useStateP2(SUPPLIER_INVOICES);
  const [openId, setOpenId] = useStateP2(null);
  const [showNew, setShowNew] = useStateP2(false);
  const [q, setQ] = useStateP2("");
  const [disputing, setDisputing] = useStateP2(false);
  const [disputeReason, setDisputeReason] = useStateP2("");

  const iv = t.inv;
  const cur = rows.find(x => x.id === openId) || null;
  const sodBlocked = cur && isApprover && me.name === cur.recorder;
  const varHuf = cur ? invoiceVarianceHuf(cur) : 0;
  const needsElevated = varHuf > VARIANCE_THRESHOLD_HUF;

  const filtered = rows.filter(x =>
    !q || x.invoiceNo.toLowerCase().includes(q.toLowerCase()) || x.supplier.toLowerCase().includes(q.toLowerCase()));
  const update = (id, patch) => setRows(rs => rs.map(x => x.id === id ? { ...x, ...patch } : x));

  const doApprove = (variance) => {
    update(cur.id, { status: "Approved", approver: me.name, approvedAt: "2026-05-29 10:00", variance });
    window.toast?.(`✓ ${cur.id} jóváhagyva${variance ? " (eltéréssel)" : ""}`, "success");
    setOpenId(null);
  };
  const doDispute = () => {
    update(cur.id, { status: "Disputed", disputeReason: disputeReason || "—" });
    window.toast?.(`${cur.id} vitatva`, "warning");
    setDisputing(false); setDisputeReason(""); setOpenId(null);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="text-[12.5px] text-stone-500"><span className="font-semibold text-stone-800 tabular-nums">{rows.length}</span> {iv.count}</div>
        <div className="flex items-center gap-2 px-3 h-8 flex-1 min-w-[150px] sm:flex-none sm:w-[260px] rounded-lg bg-white border border-stone-200 text-stone-500 sm:ml-2">
          <Icon name="search" size={14} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={iv.searchPh}
            className="bg-transparent outline-none text-[12px] flex-1 min-w-0 placeholder:text-stone-400" />
        </div>
        <div className="hidden sm:block flex-1" />
        <PrimaryBtn icon="plus" onClick={() => setShowNew(true)}>{iv.new}</PrimaryBtn>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="hidden md:grid grid-cols-[140px_minmax(0,1.4fr)_120px_minmax(0,1fr)_100px_120px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40">
          <div>{iv.cols.id}</div><div>{iv.cols.supplier}</div><div>{iv.cols.po}</div><div className="text-right">{iv.cols.amount}</div><div>{iv.cols.date}</div><div>{iv.cols.status}</div>
        </div>
        {filtered.map(x => {
          const gross = invoiceNet(x) + invoiceVat(x);
          const sod = isApprover && me.name === x.recorder && (x.status === "Exception" || x.status === "Matched");
          return (
            <button key={x.id} onClick={() => setOpenId(x.id)}
              className="w-full text-left hidden md:grid grid-cols-[140px_minmax(0,1.4fr)_120px_minmax(0,1fr)_100px_120px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center hover:bg-stone-50/60">
              <div className="min-w-0">
                <div className="text-[11.5px] font-mono text-stone-700 truncate">{x.invoiceNo}</div>
                <div className="text-[10px] font-mono text-stone-400">{x.id}</div>
              </div>
              <div className="text-[12.5px] font-medium text-stone-900 truncate flex items-center gap-1.5">
                {x.supplier}
                {sod && <span className="text-rose-500"><Icon name="alert" size={12} /></span>}
              </div>
              <div className="text-[11px] font-mono text-sky-700 truncate">{x.poRef}</div>
              <div className="text-[12px] tabular-nums text-right font-medium text-stone-800">{fmtMoney(gross, x.currency)}</div>
              <div className="text-[11px] font-mono text-stone-500">{x.date}</div>
              <div><FsmPill map={INV_STATUS} status={x.status} lang={lang} /></div>
            </button>
          );
        })}
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-stone-100">
          {filtered.map(x => {
            const gross = invoiceNet(x) + invoiceVat(x);
            const sod = isApprover && me.name === x.recorder && (x.status === "Exception" || x.status === "Matched");
            return (
              <button key={x.id} onClick={() => setOpenId(x.id)}
                className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-stone-50/60 active:bg-stone-100/60 transition">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-stone-900 truncate">{x.supplier}</span>
                    {sod && <span className="text-rose-500 shrink-0"><Icon name="alert" size={12} /></span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <FsmPill map={INV_STATUS} status={x.status} lang={lang} />
                    <span className="text-[11px] font-mono text-stone-500 truncate">{x.invoiceNo} · {x.poRef}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13px] font-semibold text-stone-800 tabular-nums">{fmtMoney(gross, x.currency)}</div>
                  <div className="text-[11px] font-mono text-stone-400">{x.date}</div>
                </div>
                <Icon name="chevron" size={15} className="text-stone-300 shrink-0" />
              </button>
            );
          })}
        </div>
      </Card>

      {/* Detail */}
      <SlideOver open={!!cur} onClose={() => { setOpenId(null); setDisputing(false); }}
        title={cur?.invoiceNo} subtitle={cur && cur.supplier + " · " + (INV_STATUS[lang] || INV_STATUS.hu)[cur.status]} width={560}
        footer={cur && (
          (cur.status === "Approved" || cur.status === "Disputed" || cur.status === "Received") ? (
            <GhostBtn onClick={() => setOpenId(null)}>Bezár</GhostBtn>
          ) : disputing ? (
            <><GhostBtn onClick={() => setDisputing(false)}>Mégse</GhostBtn>
              <button onClick={doDispute} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-rose-600 text-white text-[12.5px] font-medium hover:bg-rose-700">
                <Icon name="alert" size={15} />{iv.dispute}</button></>
          ) : cur.status === "Matched" ? (
            <PrimaryBtn icon="check" onClick={() => doApprove(false)}>{iv.approve}</PrimaryBtn>
          ) : (
            // Exception
            <>
              <GhostBtn icon="alert" onClick={() => setDisputing(true)}>{iv.dispute}</GhostBtn>
              <button disabled={sodBlocked || (needsElevated && !isApprover)} onClick={() => doApprove(true)}
                className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-white text-[12.5px] font-medium ${(sodBlocked || (needsElevated && !isApprover)) ? "bg-stone-300 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-700"}`}>
                <Icon name="check" size={15} />{iv.approveVariance}</button>
            </>
          )
        )}>
        {cur && (
          <div className="px-5 py-4 space-y-4">
            {sodBlocked && (cur.status === "Exception" || cur.status === "Matched") && <SodBanner text={t.sodInv} />}
            <div className="grid grid-cols-2 gap-4">
              <Field label={iv.supplier}>{cur.supplier}</Field>
              <Field label={iv.poRef} mono><span className="text-sky-700">{cur.poRef}</span></Field>
              <Field label={iv.cols.date} mono>{cur.date}</Field>
              <Field label={iv.recordedBy}>{cur.recorder}</Field>
            </div>

            {/* Line items with money */}
            <div>
              <FormLabel>{iv.lines}</FormLabel>
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[minmax(0,1.5fr)_56px_90px_50px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 bg-stone-50/60 border-b border-stone-100">
                  <div>{iv.colMat}</div><div className="text-right">{iv.colInv}</div><div className="text-right">{iv.colPrice}</div><div className="text-right">{iv.colVat}</div>
                </div>
                {cur.lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,1.5fr)_56px_90px_50px] gap-2 px-3 py-2 border-b border-stone-100 last:border-0 items-center text-[11.5px]">
                    <div className="text-stone-900 truncate">{l.material}</div>
                    <div className="text-right font-mono tabular-nums text-stone-700">{l.invoicedQty}</div>
                    <div className="text-right font-mono tabular-nums text-stone-700">{fmtMoney(l.unitPrice, cur.currency)}</div>
                    <div className="text-right font-mono tabular-nums text-stone-500">{l.vat}%</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-col items-end gap-0.5 text-[12px] pr-1">
                <div className="flex gap-6"><span className="text-stone-500">{iv.net}</span><span className="font-mono tabular-nums w-28 text-right">{fmtMoney(invoiceNet(cur), cur.currency)}</span></div>
                <div className="flex gap-6"><span className="text-stone-500">{iv.vat}</span><span className="font-mono tabular-nums w-28 text-right">{fmtMoney(invoiceVat(cur), cur.currency)}</span></div>
                <div className="flex gap-6 font-semibold text-stone-900"><span>{iv.gross}</span><span className="font-mono tabular-nums w-28 text-right">{fmtMoney(invoiceNet(cur) + invoiceVat(cur), cur.currency)}</span></div>
              </div>
            </div>

            {/* Three-way match */}
            <div>
              <FormLabel>{iv.threeWay}</FormLabel>
              <MatchTable inv={cur} t={t} lang={lang} />
            </div>

            {/* Variance threshold note */}
            {(cur.status === "Exception") && (
              <div className={`rounded-lg px-3 py-2.5 text-[11.5px] flex gap-2 ${needsElevated ? "bg-amber-50 border border-amber-200 text-amber-800" : "bg-stone-50 border border-stone-200 text-stone-600"}`}>
                <Icon name="alert" size={14} className="shrink-0 mt-0.5" />
                <div>
                  <div>{iv.varianceTitle}: <span className="font-mono font-medium">{fmtHUF(Math.round(varHuf))}</span> · küszöb {fmtHUF(VARIANCE_THRESHOLD_HUF)}</div>
                  {needsElevated && <div className="mt-0.5">{iv.varianceNote}</div>}
                </div>
              </div>
            )}

            {cur.status === "Disputed" && cur.disputeReason && (
              <div className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-[11.5px] text-rose-700"><span className="font-medium">{iv.disputeReason}:</span> {cur.disputeReason}</div>
            )}
            {cur.approver && <div className="text-[11px] text-stone-500 font-mono">{t.req.approvedBy}: {cur.approver} · {cur.approvedAt}</div>}

            {disputing && (
              <div>
                <FormLabel>{iv.disputeReason}</FormLabel>
                <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} rows={3} placeholder={iv.disputeReason + "…"}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 resize-none" />
              </div>
            )}
          </div>
        )}
      </SlideOver>

      <NewInvDrawer open={showNew} onClose={() => setShowNew(false)} t={t} me={me}
        onCreate={(row) => { setRows(rs => [row, ...rs]); window.toast?.(`✓ ${row.invoiceNo} rögzítve`, "success"); }} />
    </div>
  );
}

function NewInvDrawer({ open, onClose, t, me, onCreate }) {
  const iv = t.inv;
  const [supplier, setSupplier] = useStateP2(SUPPLIERS[0].name);
  const [poRef, setPoRef] = useStateP2("");
  const [invoiceNo, setInvoiceNo] = useStateP2("");
  const [currency, setCurrency] = useStateP2("HUF");
  const [lines, setLines] = useStateP2([{ material: "", invoicedQty: "", unitPrice: "", vat: 27 }]);

  const setLine = (i, patch) => setLines(ls => ls.map((l, j) => j === i ? { ...l, ...patch } : l));
  const addLine = () => setLines(ls => [...ls, { material: "", invoicedQty: "", unitPrice: "", vat: 27 }]);
  const rmLine = (i) => setLines(ls => ls.length > 1 ? ls.filter((_, j) => j !== i) : ls);

  const net = lines.reduce((a, l) => a + (Number(l.invoicedQty) || 0) * (Number(l.unitPrice) || 0), 0);
  const vat = lines.reduce((a, l) => a + (Number(l.invoicedQty) || 0) * (Number(l.unitPrice) || 0) * ((Number(l.vat) || 0) / 100), 0);

  const submit = () => {
    const n = 45 + Math.floor(Math.random() * 50);
    onCreate({
      id: "SINV-2426-0" + n, supplier, poRef: poRef || "—", invoiceNo: invoiceNo || ("INV-" + n),
      date: "2026-05-29", status: "Received", recorder: me.name, currency,
      lines: lines.map(l => ({ material: l.material || "Tétel", poQty: Number(l.invoicedQty) || 0, deliveredQty: null, invoicedQty: Number(l.invoicedQty) || 0, unitPrice: Number(l.unitPrice) || 0, vat: Number(l.vat) || 0 })),
    });
    setLines([{ material: "", invoicedQty: "", unitPrice: "", vat: 27 }]); setPoRef(""); setInvoiceNo("");
    onClose();
  };

  return (
    <SlideOver open={open} onClose={onClose} title={iv.new} subtitle={`${me.name} · ${me.roleHu}`} width={620}
      footer={<><GhostBtn onClick={onClose}>Mégse</GhostBtn><PrimaryBtn icon="check" onClick={submit}>{iv.save}</PrimaryBtn></>}>
      <div className="px-5 py-4 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FormLabel>{iv.supplier}</FormLabel>
            <select value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white">
              {SUPPLIERS.map(s => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <FormLabel>{iv.poRef}</FormLabel>
            <input value={poRef} onChange={e => setPoRef(e.target.value)} placeholder="PO-2426-…"
              className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <FormLabel>Számlaszám</FormLabel>
            <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="pl. EG-2026-…"
              className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <FormLabel>Deviza</FormLabel>
            <div className="flex gap-1.5">
              {["HUF", "EUR"].map(c => (
                <button key={c} onClick={() => setCurrency(c)}
                  className={`flex-1 h-10 rounded-lg text-[12px] border transition ${currency === c ? "bg-teal-700 text-white border-teal-700" : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"}`}>{c}</button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <FormLabel>{iv.lines}</FormLabel>
            <button onClick={addLine} className="text-[11px] text-teal-700 font-medium inline-flex items-center gap-1 hover:text-teal-800"><Icon name="plus" size={12} />{iv.addLine}</button>
          </div>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_64px_84px_56px_28px] gap-1.5 items-center">
                <input value={l.material} onChange={e => setLine(i, { material: e.target.value })} placeholder={iv.colMat}
                  className="h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-teal-500" />
                <input value={l.invoicedQty} onChange={e => setLine(i, { invoicedQty: e.target.value })} placeholder="db" type="number"
                  className="h-9 px-2 rounded-lg border border-stone-200 text-[12px] font-mono tabular-nums text-right outline-none focus:border-teal-500" />
                <input value={l.unitPrice} onChange={e => setLine(i, { unitPrice: e.target.value })} placeholder="ár" type="number"
                  className="h-9 px-2 rounded-lg border border-stone-200 text-[12px] font-mono tabular-nums text-right outline-none focus:border-teal-500" />
                <select value={l.vat} onChange={e => setLine(i, { vat: e.target.value })} className="h-9 px-1 rounded-lg border border-stone-200 text-[11.5px] bg-white">
                  {[27, 18, 5, 0].map(v => <option key={v} value={v}>{v}%</option>)}
                </select>
                <button onClick={() => rmLine(i)} className="w-7 h-9 grid place-items-center text-stone-400 hover:text-rose-600"><Icon name="x" size={13} /></button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-col items-end gap-0.5 text-[12px] pr-1">
            <div className="flex gap-6"><span className="text-stone-500">{iv.net}</span><span className="font-mono tabular-nums w-28 text-right">{fmtMoney(net, currency)}</span></div>
            <div className="flex gap-6"><span className="text-stone-500">{iv.vat}</span><span className="font-mono tabular-nums w-28 text-right">{fmtMoney(vat, currency)}</span></div>
            <div className="flex gap-6 font-semibold text-stone-900"><span>{iv.gross}</span><span className="font-mono tabular-nums w-28 text-right">{fmtMoney(net + vat, currency)}</span></div>
          </div>
        </div>
        <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 text-[11px] text-stone-500 flex gap-2">
          <Icon name="alert" size={13} className="shrink-0 mt-0.5" />
          <span>Rögzítés után a számla <span className="font-medium text-stone-700">Beérkezett</span> státuszba kerül; a Three-Way Match a szállítás könyvelése után automatikusan lefut.</span>
        </div>
      </div>
    </SlideOver>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Three-Way Match tab — aggregated reconciliation across invoices
// ════════════════════════════════════════════════════════════════════════════
function MatchTab({ t, lang }) {
  const m = t.match;
  // flatten all invoice lines with match status
  const all = SUPPLIER_INVOICES.flatMap(inv => inv.lines.map(l => ({ inv, l, r: matchLine(l) })));
  const counts = { ok: 0, within: 0, exception: 0, pending: 0 };
  all.forEach(x => counts[x.r.status]++);

  const Stat = ({ k, label }) => {
    const tone = MATCH_TONE[k];
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full ${tone.dot}`} /><div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">{label}</div>
        </div>
        <div className={`text-[26px] font-semibold tabular-nums ${tone.fg}`}>{counts[k]}</div>
        <div className="text-[11px] text-stone-500">tételsor</div>
      </Card>
    );
  };

  return (
    <div>
      <div className="mb-3">
        <div className="text-[13px] font-semibold text-stone-900">{m.title}</div>
        <div className="text-[11.5px] text-stone-500">{m.sub} · <span className="font-mono">{m.legend}</span></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat k="ok" label={m.ok} />
        <Stat k="within" label={m.within} />
        <Stat k="exception" label={m.exception} />
        <Stat k="pending" label={t.inv.pending} />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="hidden md:grid grid-cols-[130px_minmax(0,1.4fr)_minmax(0,1fr)_80px_80px_80px_120px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40">
          <div>Számla</div><div>Szállító</div><div>{t.inv.colMat}</div><div className="text-right">{m.poQty}</div><div className="text-right">{m.deliv}</div><div className="text-right">{m.inv}</div><div>Egyeztetés</div>
        </div>
        {all.map(({ inv, l, r }, i) => {
          const tone = MATCH_TONE[r.status];
          return (
            <div key={i} className="hidden md:grid grid-cols-[130px_minmax(0,1.4fr)_minmax(0,1fr)_80px_80px_80px_120px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center">
              <div className="text-[11px] font-mono text-stone-500 truncate">{inv.invoiceNo}</div>
              <div className="text-[12px] text-stone-700 truncate">{inv.supplier}</div>
              <div className="text-[12px] text-stone-900 truncate">{l.material}</div>
              <div className="text-right font-mono tabular-nums text-[12px] text-stone-600">{l.poQty}</div>
              <div className="text-right font-mono tabular-nums text-[12px] text-stone-600">{l.deliveredQty ?? "—"}</div>
              <div className={`text-right font-mono tabular-nums text-[12px] ${r.qtyVar !== 0 ? tone.fg + " font-semibold" : "text-stone-600"}`}>{l.invoicedQty}</div>
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${tone.bg} ${tone.fg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                  {r.status === "pending" ? t.inv.pending : m[r.status]}
                </span>
              </div>
            </div>
          );
        })}
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-stone-100">
          {all.map(({ inv, l, r }, i) => {
            const tone = MATCH_TONE[r.status];
            return (
              <div key={i} className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-stone-900 truncate">{l.material}</span>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium ${tone.bg} ${tone.fg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                    {r.status === "pending" ? t.inv.pending : m[r.status]}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-stone-500 mt-0.5 truncate">{inv.invoiceNo} · {inv.supplier}</div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-[11px]"><span className="text-stone-400">{m.poQty}:</span> <span className="font-mono tabular-nums text-stone-700">{l.poQty}</span></div>
                  <div className="text-[11px]"><span className="text-stone-400">{m.deliv}:</span> <span className="font-mono tabular-nums text-stone-700">{l.deliveredQty ?? "—"}</span></div>
                  <div className="text-[11px]"><span className="text-stone-400">{m.inv}:</span> <span className={`font-mono tabular-nums ${r.qtyVar !== 0 ? tone.fg + " font-semibold" : "text-stone-700"}`}>{l.invoicedQty}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Price Lists tab
// ════════════════════════════════════════════════════════════════════════════
function PriceTab({ t, lang }) {
  const [rows, setRows] = useStateP2(PRICE_LISTS);
  const [openId, setOpenId] = useStateP2(null);
  const p = t.price;
  const cur = rows.find(x => x.id === openId) || null;
  const update = (id, patch) => setRows(rs => rs.map(x => x.id === id ? { ...x, ...patch } : x));

  const doActivate = () => { update(cur.id, { status: "Active" }); window.toast?.(`✓ ${cur.id} aktiválva`, "success"); setOpenId(null); };
  const doExpire = () => { update(cur.id, { status: "Expired" }); window.toast?.(`${cur.id} lejáratva`, "info"); setOpenId(null); };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[12.5px] text-stone-500"><span className="font-semibold text-stone-800 tabular-nums">{rows.length}</span> {p.count}</div>
        <div className="flex-1" />
        <PrimaryBtn icon="plus">{p.new}</PrimaryBtn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map(pl => {
          const tone = PL_STATUS.tone[pl.status];
          return (
            <button key={pl.id} onClick={() => setOpenId(pl.id)}
              className="text-left bg-white border border-stone-200/80 hover:border-stone-300 rounded-xl overflow-hidden transition">
              <div className="px-4 py-3 border-b border-stone-100 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-stone-900 truncate">{pl.supplier}</div>
                  <div className="text-[10.5px] font-mono text-stone-400">{pl.id}</div>
                </div>
                <FsmPill map={PL_STATUS} status={pl.status} lang={lang} />
              </div>
              <div className="px-4 py-3 space-y-1.5">
                {pl.items.slice(0, 3).map((it, i) => {
                  const best = BEST_PRICES[it.material];
                  const isBest = pl.status === "Active" && pl.currency === "HUF" && best && best.listId === pl.id;
                  return (
                    <div key={i} className="flex items-center justify-between gap-2 text-[11.5px]">
                      <span className="text-stone-600 truncate flex items-center gap-1.5">
                        {isBest && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" title={p.bestPrice} />}
                        {it.material}
                      </span>
                      <span className={`font-mono tabular-nums shrink-0 ${isBest ? "text-teal-700 font-semibold" : "text-stone-700"}`}>{fmtMoney(it.unitPrice, pl.currency)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-2.5 border-t border-stone-100 flex items-center justify-between text-[10.5px] text-stone-500 font-mono">
                <span>{pl.items.length} {p.itemsCount} · {pl.currency}</span>
                <span>{p.validTo} {pl.validTo}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Best-price summary */}
      <Card className="mt-4 p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-200/80 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
          <div className="text-[12.5px] font-semibold text-stone-900">{p.bestPrice} — aktív árlisták alapján</div>
        </div>
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_120px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-100 bg-stone-50/40">
          <div>{p.cols.material}</div><div>{p.supplier}</div><div className="text-right">{p.cols.price}</div>
        </div>
        {Object.entries(BEST_PRICES).map(([mat, b]) => (
          <div key={mat} className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_120px] gap-3 px-5 py-2.5 border-b border-stone-100 last:border-0 items-center text-[12px]">
            <div className="text-stone-900 truncate">{mat}</div>
            <div className="text-stone-600 truncate flex items-center gap-1.5"><Icon name="check" size={12} className="text-teal-600" />{b.supplier}</div>
            <div className="text-right font-mono tabular-nums text-teal-700 font-semibold">{fmtMoney(b.unitPrice, "HUF")}</div>
          </div>
        ))}
      </Card>

      <SlideOver open={!!cur} onClose={() => setOpenId(null)}
        title={cur?.supplier} subtitle={cur && cur.id + " · " + (PL_STATUS[lang] || PL_STATUS.hu)[cur.status]} width={500}
        footer={cur && (
          cur.status === "Draft" ? <PrimaryBtn icon="check" onClick={doActivate}>{p.activate}</PrimaryBtn> :
          cur.status === "Active" ? <GhostBtn icon="x" onClick={doExpire}>{p.expire}</GhostBtn> :
          <GhostBtn onClick={() => setOpenId(null)}>Bezár</GhostBtn>
        )}>
        {cur && (
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label={p.supplier}>{cur.supplier}</Field>
              <Field label="Deviza" mono>{cur.currency}</Field>
              <Field label={p.validity} mono>{cur.validFrom} → {cur.validTo}</Field>
              <Field label="Tételek"><span className="tabular-nums">{cur.items.length}</span></Field>
            </div>
            <div>
              <FormLabel>{p.cols.material}</FormLabel>
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[minmax(0,1.6fr)_110px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 bg-stone-50/60 border-b border-stone-100">
                  <div>{p.cols.material}</div><div className="text-right">{p.cols.price}</div>
                </div>
                {cur.items.map((it, i) => {
                  const best = BEST_PRICES[it.material];
                  const isBest = cur.status === "Active" && cur.currency === "HUF" && best && best.listId === cur.id;
                  return (
                    <div key={i} className="grid grid-cols-[minmax(0,1.6fr)_110px] gap-2 px-3 py-2.5 border-b border-stone-100 last:border-0 items-center text-[11.5px]">
                      <div className="text-stone-900 truncate flex items-center gap-1.5">
                        {it.material}
                        {isBest && <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">{p.bestPrice}</span>}
                      </div>
                      <div className={`text-right font-mono tabular-nums ${isBest ? "text-teal-700 font-semibold" : "text-stone-700"}`}>{fmtMoney(it.unitPrice, cur.currency)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Shell — tab bar + role indicator
// ════════════════════════════════════════════════════════════════════════════
function ProcurementV2({ lang = "hu", role = "approver", initialTab = "req" }) {
  const t = PROC2_I18N[lang] || PROC2_I18N.hu;
  const me = PROC_USERS[role] || PROC_USERS.approver;
  const isApprover = role === "approver";
  const simV2 = useSim();
  const [tab, setTab] = useStateP2(initialTab);

  const tabs = [
    { k: "req", label: t.tabs.req, count: simV2.requisitions.filter(x => x.status === "Draft").length },
    { k: "inv", label: t.tabs.inv, count: SUPPLIER_INVOICES.filter(x => x.status === "Exception").length },
    { k: "match", label: t.tabs.match },
    { k: "price", label: t.tabs.price },
  ];

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">
      {/* role badge — navigation lives in the sidebar / one-handed menu, no duplicate tab bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex-1" />
        {/* role indicator */}
        <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-white border border-stone-200">
          <div className={`w-6 h-6 rounded-full grid place-items-center text-[10px] font-semibold text-white ${isApprover ? "bg-gradient-to-br from-teal-500 to-teal-700" : "bg-gradient-to-br from-stone-500 to-stone-700"}`}>{me.initials}</div>
          <div className="leading-tight">
            <div className="text-[11.5px] font-medium text-stone-800">{me.name}</div>
            <div className="text-[10px] text-stone-500 font-mono">{me.role}</div>
          </div>
        </div>
      </div>

      {tab === "req"   && <ReqTab t={t} lang={lang} me={me} isApprover={isApprover} />}
      {tab === "inv"   && <InvTab t={t} lang={lang} me={me} isApprover={isApprover} />}
      {tab === "match" && <MatchTab t={t} lang={lang} />}
      {tab === "price" && <PriceTab t={t} lang={lang} />}
    </div>
  );
}

window.ProcurementV2 = ProcurementV2;

// ── Beszerzési tétel szerkesztő — felvétel / módosítás / archiválás ─────────
// A procCatalog CRUD UI-ja. Forrás-soronként kind (külső szállító / külső munka /
// belső egység) + ár + átfutás; gyűjtő esetén tag-választó. Store: add/update/removeProcItem.
function ProcItemEditor({ itemId, onClose }) {
  const { useState: useStatePE } = React;
  const sim = useSim();
  const isNew = itemId === "new";
  const existing = isNew ? null : (sim.procCatalog || []).find(p => p.id === itemId);
  const SRC = window.PROC_SOURCE_META || {};
  const SRC_ORDER = window.PROC_SOURCE_ORDER || ["supplier", "work", "internal_unit"];
  const facilities = window.FACILITIES || [];
  const partners = (sim.partners || []).filter(p => p.platform);
  const supplierNames = (window.SUPPLIERS || []).map(s => s.name);
  const catalogItems = (sim.catalog || []).filter(c => c.active !== false);
  const otherItems = (sim.procCatalog || []).filter(p => p.active !== false && !p.group && p.id !== itemId);

  const [code, setCode] = useStatePE(existing?.code || "");
  const [name, setName] = useStatePE(existing?.name || "");
  const [kind, setKind] = useStatePE(existing?.kind && existing.kind !== "group" ? existing.kind : "material");
  const [unit, setUnit] = useStatePE(existing?.unit || "db");
  const [cat, setCat] = useStatePE(existing?.cat || "Lapanyag");
  const [catalogItemId, setCatalogItemId] = useStatePE(existing?.catalogItemId || "");
  const [group, setGroup] = useStatePE(!!existing?.group);
  const [members, setMembers] = useStatePE(existing?.members ? existing.members.map(m => typeof m === "string" ? m : m.id) : []);
  const [sources, setSources] = useStatePE(existing?.sources && existing.sources.length
    ? existing.sources.map(s => ({ kind: s.kind || "supplier", name: s.name || "", price: s.price ?? "", leadDays: s.leadDays ?? "", partnerId: s.partnerId || "", unitId: s.unitId || "" }))
    : [{ kind: "supplier", name: "", price: "", leadDays: "", partnerId: "", unitId: "" }]);

  const cats = ["Lapanyag", "Élzáró", "Vasalat", "Külső munka", "Belső egység", "Egyéb"];
  const units = ["tábla", "db", "fm", "m²", "szett", "csomag", "óra", "klt"];
  const kinds = [["material", "Anyag"], ["hardware", "Vasalat"], ["work", "Szolgáltatás"]];

  const addSource = () => setSources(ss => [...ss, { kind: "supplier", name: "", price: "", leadDays: "", partnerId: "", unitId: "" }]);
  const removeSource = (i) => setSources(ss => ss.length > 1 ? ss.filter((_, k) => k !== i) : ss);
  const patchSource = (i, patch) => setSources(ss => ss.map((s, k) => k === i ? { ...s, ...patch } : s));
  const toggleMember = (id) => setMembers(ms => ms.includes(id) ? ms.filter(x => x !== id) : [...ms, id]);

  const canSave = name.trim() && (!group || members.length > 0);
  const save = () => {
    if (!canSave) { window.toast?.(group ? "A gyűjtőhöz válassz legalább egy tagot." : "A megnevezés kötelező.", "error"); return; }
    const cleanSources = sources.map(s => ({
      kind: s.kind, name: s.name, price: s.price, leadDays: s.leadDays,
      ...(s.kind === "work" && s.partnerId ? { partnerId: s.partnerId } : {}),
      ...(s.kind === "internal_unit" && s.unitId ? { unitId: s.unitId } : {}),
    })).filter(s => (s.name || "").trim());
    const payload = {
      code, name, kind: group ? "group" : kind, unit, cat,
      catalogItemId: (!group && (kind === "material" || kind === "hardware")) ? (catalogItemId || null) : null,
      group, members: group ? members : [], sources: cleanSources,
    };
    if (isNew) { const id = sim.addProcItem(payload); if (id) onClose(); }
    else { sim.updateProcItem(itemId, payload); window.toast?.("✓ Beszerzési tétel mentve", "success"); onClose(); }
  };
  const archive = () => { if (existing) { sim.removeProcItem(itemId); onClose(); } };

  const SrcRow = ({ s, i }) => {
    const meta = SRC[s.kind] || {};
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-0.5 bg-stone-100 rounded-lg p-0.5">
            {SRC_ORDER.map(k => {
              const m = SRC[k] || {};
              return (
                <button key={k} onClick={() => patchSource(i, { kind: k, name: "", partnerId: "", unitId: "" })}
                  className={"px-2 h-7 rounded-md text-[11px] font-medium transition inline-flex items-center gap-1 " + (s.kind === k ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700")}>
                  <span className={"w-1.5 h-1.5 rounded-full " + (m.dot || "bg-stone-400")}></span>{m.hu || k}
                </button>
              );
            })}
          </div>
          {sources.length > 1 && (
            <button onClick={() => removeSource(i)} className="w-7 h-7 grid place-items-center rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"><Icon name="x" size={14} /></button>
          )}
        </div>
        {/* name — adapts to kind */}
        {s.kind === "supplier" && (
          <div>
            <input list="pe-suppliers" value={s.name} onChange={e => patchSource(i, { name: e.target.value })} placeholder="Szállító neve"
              className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500" />
            <datalist id="pe-suppliers">{supplierNames.map(n => <option key={n} value={n} />)}</datalist>
          </div>
        )}
        {s.kind === "work" && (
          <select value={s.partnerId || ""} onChange={e => { const p = partners.find(x => x.id === e.target.value); patchSource(i, { partnerId: e.target.value, name: p ? p.name : "" }); }}
            className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500">
            <option value="">Külső munka partner választása…</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.name} — {p.specialty}</option>)}
          </select>
        )}
        {s.kind === "internal_unit" && (
          <select value={s.unitId || ""} onChange={e => { const f = facilities.find(x => x.id === e.target.value); patchSource(i, { unitId: e.target.value, name: f ? f.name : "" }); }}
            className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500">
            <option value="">Belső egység választása…</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <div className="text-[10px] text-stone-400 mb-1">Egységár (Ft) — üres = ajánlatkérés</div>
            <input value={s.price} onChange={e => patchSource(i, { price: e.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" placeholder="—"
              className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500" />
          </div>
          <div>
            <div className="text-[10px] text-stone-400 mb-1">Átfutás (nap)</div>
            <input value={s.leadDays} onChange={e => patchSource(i, { leadDays: e.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" placeholder="—"
              className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <SlideOver open={true} onClose={onClose} title={isNew ? "Új beszerzési tétel" : "Tétel szerkesztése"}
      subtitle={isNew ? "Külső szállító · külső munka · belső egység" : (existing?.code || "")} width={560}
      footer={<>
        {!isNew && <button onClick={archive} className="mr-auto h-9 px-3 rounded-lg text-[12px] font-medium text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1.5"><Icon name="archive" size={14} />Archiválás</button>}
        <GhostBtn onClick={onClose}>Mégse</GhostBtn>
        <PrimaryBtn icon="check" onClick={save}>{isNew ? "Létrehozás" : "Mentés"}</PrimaryBtn>
      </>}>
      <div className="px-5 py-4 space-y-5">
        <div>
          <FormLabel>Megnevezés</FormLabel>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="pl. Tölgy 22mm tábla"
            className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FormLabel>Cikkszám / kód</FormLabel>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="auto, ha üres"
              className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500" />
          </div>
          <div>
            <FormLabel>Egység</FormLabel>
            <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500">
              {units.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FormLabel>Kategória</FormLabel>
            <select value={cat} onChange={e => setCat(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500">
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {!group && (
            <div>
              <FormLabel>Típus</FormLabel>
              <div className="flex items-center gap-0.5 bg-stone-100 rounded-lg p-0.5 h-10">
                {kinds.map(([k, l]) => (
                  <button key={k} onClick={() => setKind(k)}
                    className={"flex-1 h-9 rounded-md text-[11.5px] font-medium transition " + (kind === k ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700")}>{l}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Gyűjtő toggle */}
        <button onClick={() => setGroup(g => !g)}
          className={"w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border transition " + (group ? "border-stone-900 bg-stone-50" : "border-stone-200 bg-white hover:border-stone-300")}>
          <div className="text-left">
            <div className="text-[12.5px] font-medium text-stone-900">Gyűjtő cikkszám</div>
            <div className="text-[11px] text-stone-500">Egy igénylési ernyő több beszerezhető tétel fölé — igényléskor a tagok robbantása.</div>
          </div>
          <span className={"w-10 h-6 rounded-full p-0.5 transition shrink-0 " + (group ? "bg-stone-900" : "bg-stone-300")}>
            <span className={"block w-5 h-5 rounded-full bg-white transition-transform " + (group ? "translate-x-4" : "")} />
          </span>
        </button>

        {group ? (
          <div>
            <FormLabel>Tagok ({members.length})</FormLabel>
            <div className="rounded-xl border border-stone-200 divide-y divide-stone-100 max-h-[240px] overflow-y-auto">
              {otherItems.length === 0 && <div className="px-3 py-4 text-[12px] text-stone-400 text-center">Nincs felvehető (nem-gyűjtő) tétel.</div>}
              {otherItems.map(it => {
                const on = members.includes(it.id);
                return (
                  <button key={it.id} onClick={() => toggleMember(it.id)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-stone-50">
                    <span className={"w-4 h-4 rounded border grid place-items-center shrink-0 " + (on ? "bg-teal-600 border-teal-600 text-white" : "border-stone-300")}>{on && <Icon name="check" size={11} />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium text-stone-900 truncate">{it.name}</div>
                      <div className="text-[10.5px] font-mono text-stone-400">{it.code} · {it.cat}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (kind === "material" || kind === "hardware") ? (
          <div>
            <FormLabel>Raktári tétel (opcionális)</FormLabel>
            <select value={catalogItemId} onChange={e => setCatalogItemId(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500">
              <option value="">Nincs — standalone (nem raktári)</option>
              {catalogItems.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
            <div className="text-[10.5px] text-stone-400 mt-1">Anyag/vasalat a saját raktári tételre mutathat (bevételezés ide könyvel).</div>
          </div>
        ) : null}

        {/* Források */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <FormLabel>{group ? "Gyűjtő forrás (informatív)" : "Források"}</FormLabel>
            <button onClick={addSource} className="text-[11.5px] font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"><Icon name="plus" size={12} />Forrás</button>
          </div>
          <div className="space-y-2.5">
            {sources.map((s, i) => <React.Fragment key={i}>{SrcRow({ s, i })}</React.Fragment>)}
          </div>
          {group && <div className="text-[10.5px] text-stone-400 mt-1.5">Gyűjtőnél a tényleges igény a tagok forrásaiból robban — ez a sor csak tájékoztató.</div>}
        </div>
      </div>
    </SlideOver>
  );
}
window.ProcItemEditor = ProcItemEditor;

// ── Beszerzési katalógus — NEM a globális katalógus! ───────────────────────
// A beszerzés saját törzse: minden, amit külső szállítótól, külső munkából
// (festés/szobrászat/CNC), vagy elszeparált belső egységtől (lakatos üzem)
// kell megigényelni. Forrás-típusonként összehasonlít + igényt indít.
function CatalogPage({ lang = "hu" }) {
  const { useState: useStateCat } = React;
  const sim = useSim();
  const [q, setQ] = useStateCat("");
  const [filterCat, setFilterCat] = useStateCat("Összes");
  const [filterKind, setFilterKind] = useStateCat(null); // source.kind szűrő
  const [openId, setOpenId] = useStateCat(null);
  const [reqQty, setReqQty] = useStateCat(10);
  const [editId, setEditId] = useStateCat(null);

  const SRC = window.PROC_SOURCE_META || {};
  const SRC_ORDER = window.PROC_SOURCE_ORDER || ["supplier", "work", "internal_unit"];
  const items = (sim.procCatalog || []).filter(c => c.active !== false);
  const cats = ["Összes", ...Array.from(new Set(items.map(c => c.cat)))];
  const itemKinds = (c) => Array.from(new Set((c.sources || []).map(s => s.kind)));

  const filtered = items.filter(c => {
    if (filterCat !== "Összes" && c.cat !== filterCat) return false;
    if (filterKind && !itemKinds(c).includes(filterKind)) return false;
    if (!q) return true;
    const ql = q.toLowerCase();
    const inSrc = (c.sources || []).some(s => (s.name || "").toLowerCase().includes(ql));
    return c.name.toLowerCase().includes(ql) || (c.code || "").toLowerCase().includes(ql) || (c.cat || "").toLowerCase().includes(ql) || inSrc;
  });

  const toggleRow = (c) => { const wasOpen = openId === c.id; setOpenId(wasOpen ? null : c.id); if (!wasOpen) setReqQty(10); };
  const createReq = (c, s) => {
    const id = sim.requisitionFromProc(c.id, s, Number(reqQty) || 0);
    if (id) setOpenId(null);
  };
  // legolcsóbb forrás ára egy soron (null-okat kihagyva)
  const minPrice = (c) => { const ps = (c.sources || []).map(s => s.price).filter(p => p != null); return ps.length ? Math.min(...ps) : null; };

  const KindChip = ({ kind }) => {
    const m = SRC[kind] || {}; return (
      <span className={"inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded-full border font-medium " + (m.chip || "bg-stone-100 text-stone-600 border-stone-200")}>
        <span className={"w-1.5 h-1.5 rounded-full " + (m.dot || "bg-stone-400")}></span>{m.hu || kind}
      </span>
    );
  };

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between gap-3 mb-1">
        <div>
          <div className="text-[18px] font-semibold text-stone-900 tracking-tight">Beszerzési katalógus</div>
          <div className="text-[12px] text-stone-500">Külső szállító · külső munka · belső egység — minden, amit megigényelünk</div>
        </div>
        <button onClick={() => setEditId("new")}
          className="shrink-0 h-9 px-3.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium hover:bg-stone-800 inline-flex items-center gap-1.5 shadow-sm">
          <Icon name="plus" size={14} />Új tétel
        </button>
      </div>
      <div className="text-[11px] text-stone-400 mb-4 flex items-start gap-1.5 max-w-[640px]">
        <Icon name="info" size={12} className="mt-0.5 shrink-0" /> Ez nem a cég termék-katalógusa. Itt csak a beszerezhető tételek vannak — forrásonként ár- és átfutás-összehasonlítással, közvetlen igény-indítással.
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white border border-stone-200 text-stone-500 w-full sm:w-[240px]">
          <Icon name="search" size={14} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Keresés tétel, kód, forrás…"
            className="bg-transparent outline-none text-[12px] flex-1 placeholder:text-stone-400" />
        </div>
        <div className="flex items-center gap-0.5 bg-white border border-stone-200 rounded-lg p-0.5 overflow-x-auto">
          {cats.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={"px-2.5 h-7 rounded-md text-[11.5px] font-medium transition whitespace-nowrap " + (filterCat === c ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100")}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Source-kind filter */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <span className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mr-0.5">Forrás</span>
        {SRC_ORDER.map(k => {
          const m = SRC[k] || {}; const on = filterKind === k;
          return (
            <button key={k} onClick={() => setFilterKind(on ? null : k)}
              className={"inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-medium border transition " + (on ? "bg-stone-900 border-stone-900 text-white" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300")}>
              <span className={"w-1.5 h-1.5 rounded-full " + (m.dot || "bg-stone-400")}></span>{m.hu || k}
            </button>
          );
        })}
        {filterKind && <button onClick={() => setFilterKind(null)} className="text-[11px] text-stone-400 hover:text-stone-600 underline ml-1">törlés</button>}
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[120px_minmax(0,2fr)_90px_70px_90px_minmax(0,1.4fr)] gap-3 px-5 py-2.5 text-[10px] uppercase tracking-wide text-stone-500 font-medium bg-stone-50/60 border-b border-stone-200">
          <div>Kód</div><div>Megnevezés</div><div>Kategória</div><div>Egység</div><div className="text-right">Legjobb ár</div><div>Források</div>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-[12.5px] text-stone-400">Nincs találat a szűrőkre.</div>
        )}
        {filtered.map(c => {
          const mp = minPrice(c);
          const kinds = itemKinds(c);
          return (
          <div key={c.id} className="border-b border-stone-100 last:border-0">
            <button onClick={() => toggleRow(c)}
              className="w-full text-left hidden md:grid grid-cols-[120px_minmax(0,2fr)_90px_70px_90px_minmax(0,1.4fr)] gap-3 px-5 py-3 items-center hover:bg-stone-50/60">
              <div className="text-[11px] font-mono text-stone-500 truncate">{c.code}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-medium text-stone-900 truncate">{c.name}</span>
                  {c.group && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-900 text-white font-medium shrink-0">Gyűjtő</span>}
                </div>
              </div>
              <div className="text-[11.5px] text-stone-500">{c.cat}</div>
              <div className="text-[11.5px] text-stone-500">{c.unit}</div>
              <div className="text-[12px] font-mono text-stone-700 text-right">{mp != null ? fmtHUF(mp) : "ajánlatkérés"}</div>
              <div className="flex items-center gap-1 flex-wrap">
                {kinds.map(k => <KindChip key={k} kind={k} />)}
                <span className="text-[10px] text-stone-400 ml-0.5">· {(c.sources || []).length} forrás</span>
              </div>
            </button>

            {/* Detail expand — source comparison + requisition */}
            {openId === c.id && (() => {
              const srcs = (c.sources || []);
              const priced = srcs.map(s => s.price).filter(p => p != null);
              const best = priced.length ? Math.min(...priced) : null;
              const leads = srcs.map(s => s.leadDays).filter(p => p != null);
              const fastest = leads.length ? Math.min(...leads) : null;
              const qtyVal = Number(reqQty) || 0;
              return (
              <div className="px-4 md:px-5 pb-4 pt-3 bg-stone-50/40 border-t border-stone-100">
                <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
                  <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Források · ár- és átfutás-összehasonlítás</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-stone-500">Igényelt mennyiség</span>
                    <div className="flex items-center gap-0.5 bg-white border border-stone-200 rounded-lg p-0.5">
                      <button onClick={() => setReqQty(q => Math.max(0, (Number(q) || 0) - 5))} className="w-9 h-9 sm:w-7 sm:h-7 rounded-md grid place-items-center text-stone-600 hover:bg-stone-100 text-[16px] leading-none">−</button>
                      <input value={qtyVal} onChange={e => setReqQty(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric"
                        className="w-12 text-center bg-transparent outline-none text-[12.5px] font-mono font-semibold text-stone-900" />
                      <button onClick={() => setReqQty(q => (Number(q) || 0) + 5)} className="w-9 h-9 sm:w-7 sm:h-7 rounded-md grid place-items-center text-stone-600 hover:bg-stone-100 text-[16px] leading-none">+</button>
                    </div>
                    <span className="text-[11.5px] text-stone-500">{c.unit}</span>
                  </div>
                </div>
                {c.group && (() => {
                  const mems = (c.members || []).map(m => typeof m === "string" ? m : m.id).map(id => (sim.procCatalog || []).find(p => p.id === id)).filter(Boolean);
                  return (
                    <div className="mb-2.5 rounded-lg border border-stone-200 bg-white px-3 py-2.5">
                      <div className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Gyűjtő tagjai ({mems.length}) — igényléskor robbantva</div>
                      <div className="flex flex-wrap gap-1.5">
                        {mems.map(m => <span key={m.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">{m.name}</span>)}
                        {mems.length === 0 && <span className="text-[11px] text-stone-400">Nincs tag megadva.</span>}
                      </div>
                    </div>
                  );
                })()}
                <div className="rounded-lg border border-stone-200 overflow-hidden bg-white">
                  <div className="hidden sm:grid grid-cols-[minmax(0,2fr)_130px_100px_90px_minmax(0,1fr)_108px] gap-2 px-4 py-2 bg-stone-50/70 text-[10px] uppercase tracking-wide text-stone-500 font-medium border-b border-stone-100">
                    <div>Forrás</div><div className="text-right">Egységár</div><div className="text-right">Eltérés</div><div className="text-right">Átfutás</div><div className="text-right">Sorösszeg</div><div></div>
                  </div>
                  {srcs.map((s, i) => {
                    const hasPrice = s.price != null;
                    const isBest = hasPrice && best != null && s.price === best;
                    const isFastest = s.leadDays != null && fastest != null && s.leadDays === fastest && srcs.length > 1;
                    const delta = hasPrice && best != null ? s.price - best : null;
                    return (
                    <div key={i} className={"px-4 py-3 border-b border-stone-100 last:border-0 " + (isBest ? "bg-emerald-50/40" : "")}>
                      <div className="flex flex-col gap-2.5 sm:grid sm:grid-cols-[minmax(0,2fr)_130px_100px_90px_minmax(0,1fr)_108px] sm:gap-2 sm:items-center">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <KindChip kind={s.kind} />
                          <span className="text-[12.5px] font-medium text-stone-900">{s.name}</span>
                          {isBest && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium shrink-0">Legjobb ár</span>}
                          {isFastest && !isBest && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium shrink-0">Leggyorsabb</span>}
                        </div>
                        <div className="flex items-center justify-between sm:block sm:text-right">
                          <span className="sm:hidden text-[10.5px] uppercase tracking-wide text-stone-400">Egységár</span>
                          <span className="font-mono text-[12px] font-semibold text-stone-900">{hasPrice ? fmtHUF(s.price) : "ajánlatkérés"}</span>
                        </div>
                        <div className="flex items-center justify-between sm:block sm:text-right">
                          <span className="sm:hidden text-[10.5px] uppercase tracking-wide text-stone-400">Eltérés a legjobbtól</span>
                          <span className={"font-mono text-[11.5px] " + (delta === 0 ? "text-emerald-600 font-medium" : "text-stone-500")}>{delta == null ? "—" : delta === 0 ? "—" : "+" + fmtHUF(delta)}</span>
                        </div>
                        <div className="flex items-center justify-between sm:block sm:text-right">
                          <span className="sm:hidden text-[10.5px] uppercase tracking-wide text-stone-400">Átfutás</span>
                          <span className="font-mono text-[11.5px] text-stone-600">{s.leadDays != null ? s.leadDays + " nap" : "—"}</span>
                        </div>
                        <div className="flex items-center justify-between sm:block sm:text-right">
                          <span className="sm:hidden text-[10.5px] uppercase tracking-wide text-stone-400">Sorösszeg ({qtyVal} {c.unit})</span>
                          <span className="font-mono text-[12px] text-stone-700">{qtyVal > 0 && hasPrice ? fmtHUF(qtyVal * s.price) : "—"}</span>
                        </div>
                        <button onClick={() => createReq(c, s)}
                          className={"h-11 sm:h-8 px-3 rounded-lg text-[11.5px] font-medium inline-flex items-center justify-center gap-1.5 transition w-full sm:w-auto " + (isBest ? "bg-teal-600 text-white hover:bg-teal-700" : "border border-stone-200 text-stone-700 hover:bg-stone-50")}>
                          <Icon name="plus" size={12} />Igény
                        </button>
                      </div>
                    </div>
                  );})}
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-[11px] text-stone-400 flex items-start gap-1.5 min-w-[200px] flex-1">
                    <Icon name="box" size={12} className="mt-0.5 shrink-0" /> Az „Igény” gomb vázlat beszerzési igényt hoz létre a kiválasztott forrással {c.group ? "— a gyűjtő tagjait szétrobbantva" : "— a Beszerzés → Igénylések közé kerül"}, onnan jóváhagyás után megrendeléssé alakítható.
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setEditId(c.id)} className="h-8 px-3 rounded-lg border border-stone-200 bg-white text-stone-700 text-[11.5px] font-medium hover:bg-stone-50 inline-flex items-center gap-1.5"><Icon name="settings" size={13} />Szerkesztés</button>
                    <button onClick={() => { if (window.confirm(`Archiválod: ${c.name}?`)) sim.removeProcItem(c.id); }} className="h-8 px-3 rounded-lg border border-stone-200 bg-white text-stone-500 text-[11.5px] font-medium hover:text-rose-600 hover:border-rose-200 inline-flex items-center gap-1.5"><Icon name="archive" size={13} />Archiválás</button>
                  </div>
                </div>
              </div>
              );
            })()}

            {/* Mobile row */}
            <button onClick={() => toggleRow(c)}
              className="md:hidden w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-stone-50/60">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13.5px] font-medium text-stone-900 truncate">{c.name}</span>
                  {c.group && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-900 text-white font-medium shrink-0">Gyűjtő</span>}
                </div>
                <div className="text-[11px] font-mono text-stone-400 mt-0.5 mb-1.5">{c.code} · {c.cat}</div>
                <div className="flex items-center gap-1 flex-wrap">{kinds.map(k => <KindChip key={k} kind={k} />)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[12px] font-semibold text-stone-900 font-mono">{mp != null ? fmtHUF(mp) : "—"}</div>
                <div className="text-[10.5px] text-stone-400">{(c.sources || []).length} forrás</div>
              </div>
            </button>
          </div>
          );
        })}
      </div>
      {editId && <ProcItemEditor itemId={editId} onClose={() => setEditId(null)} />}
    </div>
  );
}
window.CatalogPage = CatalogPage;
