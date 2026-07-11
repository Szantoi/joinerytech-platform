// ──────────────────────────────────────────────────────────────────────────
// page-trade-2.jsx — KERESKEDELEM: Lapszabászat (szabás-rendelés → árajánlat, FSM)
//   + Árrés-motor (markup ↔ árrés kategóriánként és tételenként).
// ──────────────────────────────────────────────────────────────────────────
const { useState: useTr2, useMemo: useTrM2 } = React;
const TE2 = window.TradeEngine;

// ════════════════════════════════════════════════════════════════════════════
// LAPSZABÁSZAT — szabás / megmunkálás rendelések
// ════════════════════════════════════════════════════════════════════════════
function TradeCutting() {
  const sim = useSim();
  const orders = sim.cuttingOrders || [];
  const products = sim.tradeProducts || [];
  const cats = sim.tradeCategories || [];
  const services = sim.tradeServices || [];
  const catById = useTrM2(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);

  const [filter, setFilter] = useTr2("open");
  const [detail, setDetail] = useTr2(null);   // order id
  const [builder, setBuilder] = useTr2(false);

  const counts = {
    open: orders.filter((o) => o.status !== "handed" && o.status !== "rejected").length,
    all: orders.length,
  };
  const shown = orders.filter((o) => filter === "all" ? true : (o.status !== "handed" && o.status !== "rejected"));
  const detailOrder = orders.find((o) => o.id === detail) || null;

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[16px] font-semibold tracking-tight text-stone-900">Lapszabászat</div>
          <div className="text-[11.5px] text-stone-500">Bejövő szabás- és megmunkálás-rendelések → gyors árajánlat (lap + szolgáltatás).</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5">
            {[{ k: "open", l: "Nyitott", n: counts.open }, { k: "all", l: "Összes", n: counts.all }].map((x) => (
              <button key={x.k} onClick={() => setFilter(x.k)}
                className={`px-3 h-8 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5 ${filter === x.k ? "bg-orange-600 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
                {x.l}<span className={`text-[10px] tabular-nums px-1.5 rounded-full ${filter === x.k ? "bg-white/20" : "bg-stone-100 text-stone-500"}`}>{x.n}</span>
              </button>
            ))}
          </div>
          <PrimaryBtn icon="plus" onClick={() => setBuilder(true)}>Új szabás-rendelés</PrimaryBtn>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="hidden md:grid grid-cols-[120px_minmax(0,1.4fr)_minmax(0,1.2fr)_70px_120px_110px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40">
          <div>Azonosító</div><div>Vevő</div><div>Lapanyag</div><div className="text-right">Tábla</div><div className="text-right">Összeg (nettó)</div><div className="text-right">Státusz</div>
        </div>
        {shown.map((o) => {
          const tone = CUTTING_TONE[o.status];
          const total = o.materialCost + o.serviceTotal;
          return (
            <button key={o.id} onClick={() => setDetail(o.id)} className="w-full text-left">
              {/* desktop */}
              <div className="hidden md:grid grid-cols-[120px_minmax(0,1.4fr)_minmax(0,1.2fr)_70px_120px_110px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center hover:bg-stone-50/60">
                <div className="text-[11.5px] font-mono text-stone-500">{o.id}</div>
                <div className="text-[12.5px] font-medium text-stone-900 truncate">{o.customer}</div>
                <div className="text-[11.5px] text-stone-600 truncate">{o.boardName}</div>
                <div className="text-[12px] tabular-nums text-right text-stone-700">{o.sheets}</div>
                <div className="text-[12.5px] tabular-nums text-right font-semibold text-stone-900">{TE2.fmtHuf(total)}</div>
                <div className="flex justify-end">
                  <span className={`inline-flex items-center gap-1.5 text-[10.5px] px-2 py-0.5 rounded-full font-medium ${tone.bg} ${tone.fg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{tone.label}
                  </span>
                </div>
              </div>
              {/* mobile */}
              <div className="md:hidden px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3 hover:bg-stone-50/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-medium text-stone-900 truncate">{o.customer}</span>
                  </div>
                  <div className="text-[11px] text-stone-500 truncate font-mono">{o.id} · {o.sheets} tábla {o.boardName}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12.5px] font-semibold tabular-nums text-stone-900">{TE2.fmtHuf(total)}</div>
                  <span className={`inline-flex items-center gap-1 text-[10px] mt-0.5 ${tone.fg}`}><span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{tone.label}</span>
                </div>
              </div>
            </button>
          );
        })}
        {shown.length === 0 && <div className="px-5 py-10 text-center text-[12px] text-stone-400">Nincs megjeleníthető rendelés.</div>}
      </Card>

      <CuttingDetail order={detailOrder} onClose={() => setDetail(null)} services={services} />
      <CuttingBuilder open={builder} onClose={() => setBuilder(false)} products={products} catById={catById} rates={sim.tradeServiceRates} projects={sim.projects || []} />
    </div>
  );
}

// ── szabás-rendelés részlet + FSM ───────────────────────────────────────────
function CuttingDetail({ order, onClose, services }) {
  const [rejecting, setRejecting] = useTr2(false);
  const [reason, setReason] = useTr2("");
  React.useEffect(() => { setRejecting(false); setReason(""); }, [order && order.id]);
  if (!order) return null;
  const tone = CUTTING_TONE[order.status];
  const allowed = CUTTING_FLOW[order.status] || [];
  const total = order.materialCost + order.serviceTotal;
  const gross = TE2.gross(total);
  const terminal = order.status === "handed" || order.status === "rejected";

  // a fő-lánc lépései, lezárt jelzéssel (CLAUDE: tiltott = disabled + tooltip)
  const ACTIONS = [
    { to: "quoted",   label: "Árajánlat kiadása", icon: "send" },
    { to: "accepted", label: "Elfogadás",          icon: "check" },
    { to: "ready",    label: "Kész",               icon: "check" },
    { to: "handed",   label: "Átadás",             icon: "check" },
  ];
  const doSet = (to) => { window.sim.setCuttingStatus(order.id, to); };
  const doReject = () => {
    if (!reason.trim()) return;
    if (window.sim.setCuttingStatus(order.id, "rejected", { reason: reason.trim() })) { setRejecting(false); onClose(); }
  };

  return (
    <SlideOver open={!!order} onClose={onClose} title={order.customer} subtitle={`${order.id} · ${order.date}`} width={540}
      footer={
        terminal ? (
          <div className="flex items-center gap-2 text-[11.5px] text-stone-500"><Icon name="lock" size={14} />{order.status === "handed" ? "Lezárt rendelés (átadva)." : "Elutasított rendelés."}</div>
        ) : rejecting ? (
          <div className="flex items-center gap-2 w-full">
            <GhostBtn onClick={() => setRejecting(false)}>Mégse</GhostBtn>
            <button onClick={doReject} disabled={!reason.trim()}
              className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-[12.5px] font-medium ${reason.trim() ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-stone-200 text-stone-400 cursor-not-allowed"}`}>
              <Icon name="x" size={14} />Elutasítás megerősítése
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {(order.status === "inquiry" || order.status === "quoted") && (
              <button onClick={() => setRejecting(true)} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white border border-rose-200 text-rose-600 text-[12.5px] font-medium hover:bg-rose-50">
                <Icon name="x" size={14} />Elutasítás
              </button>
            )}
            {ACTIONS.map((a) => {
              const ok = allowed.includes(a.to);
              if (!ok && a.to === "rejected") return null;
              // csak az értelmes előre-lépéseket mutatjuk; a tiltottak LEZÁRT-ként
              const isNext = ok;
              const isPastOrLocked = !ok && CUTTING_ORDER.indexOf(a.to) > CUTTING_ORDER.indexOf(order.status) + 1;
              if (!isNext && !isPastOrLocked) return null;
              return (
                <button key={a.to} onClick={() => isNext && doSet(a.to)} disabled={!isNext}
                  title={isNext ? "" : "Előbb az előző lépést kell befejezni (FSM)"}
                  className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-[12.5px] font-medium transition ${isNext ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-stone-100 text-stone-400 cursor-not-allowed"}`}>
                  {isNext ? <Icon name={a.icon} size={14} /> : <Icon name="lock" size={13} />}{a.label}
                </button>
              );
            })}
          </div>
        )
      }>
      <div className="px-5 py-4 space-y-4">
        {/* státusz + összeg */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-full font-medium ${tone.bg} ${tone.fg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{tone.label}
          </span>
          <div className="text-right">
            <div className="text-[18px] font-semibold tabular-nums text-stone-900">{TE2.fmtHuf(total)}</div>
            <div className="text-[11px] text-stone-500 tabular-nums">Bruttó {TE2.fmtHuf(gross)}</div>
          </div>
        </div>
        {order.phone && <div className="text-[12px] text-stone-600">📞 {order.phone}</div>}

        {/* FSM lánc vizualizáció */}
        <div className="flex items-center gap-1">
          {CUTTING_ORDER.map((st, i) => {
            const here = order.status === st;
            const past = CUTTING_ORDER.indexOf(order.status) > i && order.status !== "rejected";
            const t = CUTTING_TONE[st];
            return (
              <React.Fragment key={st}>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${here ? `${t.bg} ${t.fg}` : past ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-400"}`}>{t.label}</span>
                {i < CUTTING_ORDER.length - 1 && <span className="text-stone-300 text-[10px]">›</span>}
              </React.Fragment>
            );
          })}
        </div>
        {order.status === "rejected" && order.note && (
          <div className="text-[11.5px] px-3 py-2 rounded-lg bg-rose-50 text-rose-700">Elutasítás oka: {order.note}</div>
        )}

        {/* lapanyag */}
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Lapanyag</div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200/70">
            <div className="text-[12.5px] text-stone-800 font-medium">{order.boardName}</div>
            <div className="text-[12px] tabular-nums text-stone-600">{order.sheets} tábla · <span className="font-semibold text-stone-900">{TE2.fmtHuf(order.materialCost)}</span></div>
          </div>
        </div>

        {/* vágáslista */}
        {order.cuts && order.cuts.length > 0 && (
          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Vágáslista</div>
            <div className="rounded-lg border border-stone-200/70 overflow-hidden">
              {order.cuts.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-stone-100 last:border-0 text-[12px]">
                  <span className="text-stone-700 tabular-nums font-mono">{c.w} × {c.h} mm</span>
                  <span className="text-stone-500 tabular-nums">{c.qty} db</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* szolgáltatások */}
        {order.services && order.services.length > 0 && (
          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Szolgáltatások</div>
            <div className="rounded-lg border border-stone-200/70 overflow-hidden">
              {order.services.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-stone-100 last:border-0 text-[12px]">
                  <span className="text-stone-700">{s.name}</span>
                  <span className="text-stone-500 tabular-nums">{s.qty} {s.unit} × {TE2.fmtHuf(s.rate)} = <span className="font-semibold text-stone-800">{TE2.fmtHuf(s.qty * s.rate)}</span></span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 bg-stone-50/60 text-[12px]">
                <span className="text-stone-500 font-medium">Szolgáltatás összesen</span>
                <span className="font-semibold tabular-nums text-stone-900">{TE2.fmtHuf(order.serviceTotal)}</span>
              </div>
            </div>
          </div>
        )}

        {order.note && order.status !== "rejected" && <div className="text-[11.5px] text-stone-600 italic">„{order.note}"</div>}
      </div>
    </SlideOver>
  );
}

// ── új szabás-rendelés építő ────────────────────────────────────────────────
function CuttingBuilder({ open, onClose, products, catById, rates, projects }) {
  const boards = products.filter((p) => p.catId === "lap");
  const [customer, setCustomer] = useTr2("");
  const [phone, setPhone] = useTr2("");
  const [boardId, setBoardId] = useTr2(boards[0] ? boards[0].id : "");
  const [sheets, setSheets] = useTr2(2);
  const [cutMode, setCutMode] = useTr2("fixed");      // "fixed" (tábla) | "meter" (folyóméter)
  const [cuts, setCuts] = useTr2([{ w: 600, h: 400, qty: 4 }]);
  const [edges, setEdges] = useTr2([{ t: "t08", w: "w23", g: "trad", meters: 18 }]);
  const [extras, setExtras] = useTr2([]);             // [{id, qty}]
  const [note, setNote] = useTr2("");
  const [importOpen, setImportOpen] = useTr2(false);
  const [importedFrom, setImportedFrom] = useTr2(null);

  React.useEffect(() => {
    if (open) {
      setCustomer(""); setPhone(""); setBoardId(boards[0] ? boards[0].id : "");
      setSheets(2); setCutMode("fixed"); setCuts([{ w: 600, h: 400, qty: 4 }]);
      setEdges([{ t: "t08", w: "w23", g: "trad", meters: 18 }]); setExtras([]); setNote(""); setImportedFrom(null);
    }
  }, [open]);

  const board = products.find((p) => p.id === boardId);
  const boardSell = board ? TE2.sellOf(board, catById[board.catId]) : 0;
  const materialCost = boardSell * (Number(sheets) || 0);

  // kalkulált vágás-folyóméter a vágáslista kerületeiből (2×(sz+m) × db)
  const cutMeters = useTrM2(() => cuts.reduce((a, c) => a + (2 * ((Number(c.w) || 0) + (Number(c.h) || 0)) / 1000) * (Number(c.qty) || 0), 0), [cuts]);
  const cutCost = cutMode === "fixed"
    ? (rates ? rates.cutFixed : 0) * (Number(sheets) || 0)
    : Math.round((rates ? rates.cutMeter : 0) * cutMeters);

  const edgeLines = edges.map((e) => { const rate = TE2.edgeRate(rates, e.t, e.w, e.g); return { ...e, rate, cost: Math.round(rate * (Number(e.meters) || 0)) }; });
  const edgeCost = edgeLines.reduce((a, e) => a + e.cost, 0);

  const extraDefs = (rates && rates.extras) || [];
  const extrasList = extras.map((x) => { const def = extraDefs.find((d) => d.id === x.id); return def ? { ...def, qty: Number(x.qty) || 0, cost: def.rate * (Number(x.qty) || 0) } : null; }).filter(Boolean);
  const extrasCost = extrasList.reduce((a, e) => a + e.cost, 0);

  const serviceTotal = cutCost + edgeCost + extrasCost;
  const total = materialCost + serviceTotal;

  const setCut = (i, k, val) => setCuts((c) => c.map((x, j) => j === i ? { ...x, [k]: val } : x));
  const addCut = () => setCuts((c) => [...c, { w: 600, h: 400, qty: 1 }]);
  const rmCut = (i) => setCuts((c) => c.filter((_, j) => j !== i));
  const setEdge = (i, k, val) => setEdges((e) => e.map((x, j) => j === i ? { ...x, [k]: val } : x));
  const addEdge = () => setEdges((e) => [...e, { t: "t08", w: "w23", g: "trad", meters: 6 }]);
  const rmEdge = (i) => setEdges((e) => e.filter((_, j) => j !== i));
  const toggleExtra = (id) => setExtras((v) => v.some((x) => x.id === id) ? v.filter((x) => x.id !== id) : [...v, { id, qty: 1 }]);
  const setExtraQty = (id, qty) => setExtras((v) => v.map((x) => x.id === id ? { ...x, qty } : x));

  const applyImport = (data) => {
    if (data.boardId) setBoardId(data.boardId);
    if (data.sheets) setSheets(data.sheets);
    if (data.cuts && data.cuts.length) setCuts(data.cuts);
    if (data.edgeMeters) setEdges([{ t: "t08", w: "w23", g: "trad", meters: Math.round(data.edgeMeters) }]);
    if (data.customer) setCustomer(data.customer);
    setCutMode("meter");
    setImportedFrom(data.projectName || data.projectId);
    setImportOpen(false);
  };

  const submit = () => {
    const svc = [];
    svc.push(cutMode === "fixed"
      ? { id: "cut", name: "Szabás (fix tábla-ár)", unit: "tábla", qty: Number(sheets) || 0, rate: rates ? rates.cutFixed : 0 }
      : { id: "cut", name: "Szabás (folyóméter)", unit: "fm", qty: Math.round(cutMeters), rate: rates ? rates.cutMeter : 0 });
    edgeLines.forEach((e) => svc.push({
      id: "edge", name: `Élzárás ${TE2.edgeParamName(rates, "edgeThickness", e.t)} · ${TE2.edgeParamName(rates, "edgeWidth", e.w)} · ${TE2.edgeParamName(rates, "edgeGlue", e.g)}`,
      unit: "fm", qty: Number(e.meters) || 0, rate: e.rate,
    }));
    extrasList.forEach((e) => svc.push({ id: e.id, name: e.name, unit: e.unit, qty: e.qty, rate: e.rate }));
    window.sim.addCuttingOrder({
      customer: customer.trim() || "Eseti vevő", phone: phone.trim(), boardId, boardName: board ? board.name : "",
      sheets: Number(sheets) || 1, cuts: cuts.map((c) => ({ w: Number(c.w) || 0, h: Number(c.h) || 0, qty: Number(c.qty) || 0 })),
      services: svc, note: note.trim(), materialCost, serviceTotal, status: "quoted",
    });
    onClose();
  };

  const inp = "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-orange-400 placeholder:text-stone-400";
  const lbl = "text-[10.5px] uppercase tracking-wide text-stone-400 font-medium";

  return (
    <SlideOver open={open} onClose={onClose} title="Új szabás-rendelés" subtitle="Lap + technológia → gyors árajánlat" width={580}
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <div className="text-[12px] text-stone-500">Árajánlat: <span className="text-[14px] font-semibold text-stone-900 tabular-nums">{TE2.fmtHuf(total)}</span> <span className="text-stone-400">+ ÁFA</span></div>
          <PrimaryBtn icon="send" onClick={submit}>Árajánlat létrehozása</PrimaryBtn>
        </div>
      }>
      <div className="px-5 py-4 space-y-4">
        {/* Előkészítésből import */}
        <button onClick={() => setImportOpen(true)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 text-teal-800 hover:bg-teal-50 transition">
          <span className="w-7 h-7 rounded-lg bg-teal-100 grid place-items-center shrink-0"><Icon name="factory" size={15} /></span>
          <div className="text-left flex-1 min-w-0">
            <div className="text-[12px] font-semibold">Előkészítésből import</div>
            <div className="text-[10.5px] text-teal-600/80">{importedFrom ? `Importálva: ${importedFrom}` : "Táblaszám, vágáslista és élhossz egy gyártási projektből"}</div>
          </div>
          <Icon name="chevron" size={15} className="text-teal-400" />
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <div><label className={lbl}>Vevő</label><input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Eseti vevő" className={inp + " mt-1"} /></div>
          <div><label className={lbl}>Telefon</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+36…" className={inp + " mt-1"} /></div>
        </div>

        {/* Lapanyag */}
        <div>
          <label className={lbl}>Lapanyag</label>
          <div className="flex items-center gap-2 mt-1">
            <select value={boardId} onChange={(e) => setBoardId(e.target.value)} className={inp + " flex-1"}>
              {boards.map((b) => <option key={b.id} value={b.id}>{b.name} — {TE2.fmtHuf(TE2.sellOf(b, catById[b.catId]))}/{b.unit}</option>)}
            </select>
            <div className="inline-flex items-center gap-1.5 shrink-0">
              <Stepper qty={Number(sheets) || 0} onChange={(v) => setSheets(Math.max(1, v))} />
              <span className="text-[11.5px] text-stone-500">tábla</span>
            </div>
          </div>
          <div className="text-[11px] text-stone-500 mt-1 tabular-nums">{sheets} × {TE2.fmtHuf(boardSell)} = <span className="font-semibold text-stone-800">{TE2.fmtHuf(materialCost)}</span> <span className="text-stone-400">(eladási ár)</span></div>
        </div>

        {/* Szabás-mód */}
        <div>
          <label className={lbl}>Szabás</label>
          <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5 mt-1">
            {[{ k: "fixed", l: "Fix tábla-ár" }, { k: "meter", l: "Folyóméter" }].map((x) => (
              <button key={x.k} onClick={() => setCutMode(x.k)}
                className={`flex-1 h-8 rounded-md text-[12px] font-medium transition ${cutMode === x.k ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>{x.l}</button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[11.5px] px-3 py-2 rounded-lg bg-stone-50">
            {cutMode === "fixed" ? (
              <><span className="text-stone-500 tabular-nums">{sheets} tábla × {TE2.fmtHuf(rates ? rates.cutFixed : 0)}</span><span className="font-semibold tabular-nums text-stone-900">{TE2.fmtHuf(cutCost)}</span></>
            ) : (
              <><span className="text-stone-500 tabular-nums">{cutMeters.toFixed(1)} fm × {TE2.fmtHuf(rates ? rates.cutMeter : 0)}</span><span className="font-semibold tabular-nums text-stone-900">{TE2.fmtHuf(cutCost)}</span></>
            )}
          </div>
          {cutMode === "meter" && <div className="text-[10.5px] text-stone-400 mt-1">A folyóméter a vágáslista kerületeiből számolódik.</div>}
        </div>

        {/* Vágáslista */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={lbl}>Vágáslista {cutMode === "meter" && <span className="text-stone-300 normal-case">· {cutMeters.toFixed(1)} fm</span>}</label>
            <button onClick={addCut} className="inline-flex items-center gap-1 text-[11px] text-orange-700 font-medium hover:underline"><Icon name="plus" size={12} />Sor</button>
          </div>
          <div className="space-y-1.5">
            {cuts.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input type="number" value={c.w} onChange={(e) => setCut(i, "w", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-stone-200 text-[12px] tabular-nums outline-none focus:border-orange-400" placeholder="szél." />
                <span className="text-stone-400 text-[12px]">×</span>
                <input type="number" value={c.h} onChange={(e) => setCut(i, "h", e.target.value)} className="w-full h-8 px-2 rounded-lg border border-stone-200 text-[12px] tabular-nums outline-none focus:border-orange-400" placeholder="mag." />
                <span className="text-stone-400 text-[11px]">mm</span>
                <input type="number" value={c.qty} onChange={(e) => setCut(i, "qty", e.target.value)} className="w-16 h-8 px-2 rounded-lg border border-stone-200 text-[12px] tabular-nums outline-none focus:border-orange-400" placeholder="db" />
                <button onClick={() => rmCut(i)} className="w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-rose-600 shrink-0"><Icon name="x" size={13} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Élzárás — paraméteres */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={lbl}>Élzárás <span className="text-stone-300 normal-case">· {TE2.fmtHuf(edgeCost)}</span></label>
            <button onClick={addEdge} className="inline-flex items-center gap-1 text-[11px] text-orange-700 font-medium hover:underline"><Icon name="plus" size={12} />Él-tétel</button>
          </div>
          <div className="space-y-1.5">
            {edgeLines.map((e, i) => (
              <EdgeLineRow key={i} line={e} rates={rates} onChange={(k, v) => setEdge(i, k, v)} onRemove={edges.length > 1 ? () => rmEdge(i) : null} />
            ))}
          </div>
        </div>

        {/* Egyéb megmunkálás */}
        <div>
          <label className={lbl}>Egyéb megmunkálás</label>
          <div className="space-y-1.5 mt-1.5">
            {extraDefs.map((s) => {
              const on = extras.find((x) => x.id === s.id);
              return (
                <div key={s.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition ${on ? "border-indigo-200 bg-indigo-50/50" : "border-stone-200"}`}>
                  <button onClick={() => toggleExtra(s.id)} className={`w-4 h-4 rounded grid place-items-center shrink-0 ${on ? "bg-indigo-600 text-white" : "border border-stone-300"}`}>{on && <Icon name="check" size={11} />}</button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-stone-800 truncate">{s.name}</div>
                    <div className="text-[10.5px] text-stone-500 tabular-nums">{TE2.fmtHuf(s.rate)} / {s.unit}</div>
                  </div>
                  {on && <Stepper qty={Number(on.qty) || 0} onChange={(v) => setExtraQty(s.id, Math.max(1, v))} />}
                  {on && <div className="w-[72px] text-right text-[12px] font-semibold tabular-nums text-stone-900 shrink-0">{TE2.fmtHuf(s.rate * (Number(on.qty) || 0))}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Összegzés */}
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          {[["Lapanyag (eladási)", materialCost], ["Szabás", cutCost], ["Élzárás", edgeCost], ["Egyéb", extrasCost]].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-3 py-1.5 border-b border-stone-100 text-[11.5px]">
              <span className="text-stone-500">{k}</span><span className="tabular-nums text-stone-700">{TE2.fmtHuf(v)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2 bg-stone-50 text-[13px] font-semibold">
            <span className="text-stone-900">Összesen (nettó)</span><span className="tabular-nums text-stone-900">{TE2.fmtHuf(total)}</span>
          </div>
        </div>

        <div><label className={lbl}>Megjegyzés</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Pl. színazonos él, helyszíni átvétel…" className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-orange-400 placeholder:text-stone-400 resize-none" /></div>
      </div>

      <CutImportModal open={importOpen} onClose={() => setImportOpen(false)} projects={projects} products={products} onApply={applyImport} />
    </SlideOver>
  );
}

// ── egy élzárás-sor: vastagság × szélesség × ragasztás → Ft/fm × méter ──────
function EdgeLineRow({ line, rates, onChange, onRemove }) {
  const sel = "h-8 px-1.5 rounded-lg border border-stone-200 text-[11.5px] outline-none focus:border-orange-400 bg-white";
  const isOv = TE2.edgeIsOverride(rates, line.t, line.w, line.g);
  return (
    <div className="rounded-lg border border-stone-200 px-2.5 py-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <select value={line.t} onChange={(e) => onChange("t", e.target.value)} className={sel + " flex-1 min-w-0"}>
          {(rates ? rates.edgeThickness : []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={line.w} onChange={(e) => onChange("w", e.target.value)} className={sel + " flex-1 min-w-0"}>
          {(rates ? rates.edgeWidth : []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={line.g} onChange={(e) => onChange("g", e.target.value)} className={sel + " flex-1 min-w-0"}>
          {(rates ? rates.edgeGlue : []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        {onRemove && <button onClick={onRemove} className="w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-rose-600 shrink-0"><Icon name="x" size={13} /></button>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-stone-500">
          <input type="number" value={line.meters} onChange={(e) => onChange("meters", e.target.value)} className="w-16 h-7 px-2 rounded-md border border-stone-200 text-[12px] tabular-nums outline-none focus:border-orange-400" />
          <span>fm × {TE2.fmtHuf(line.rate)}/fm {isOv && <span className="text-orange-600">(egyedi)</span>}</span>
        </div>
        <span className="text-[12px] font-semibold tabular-nums text-stone-900">{TE2.fmtHuf(line.cost)}</span>
      </div>
    </div>
  );
}

// ── Előkészítésből import: gyártási projekt → MfgPrep levezetés ──────────────
function CutImportModal({ open, onClose, projects, products, onApply }) {
  const derived = useTrM2(() => {
    if (!open || !window.MfgPrep) return [];
    return (projects || []).map((p) => {
      let prep = null;
      try { prep = window.MfgPrep.derive(p); } catch (e) { prep = null; }
      if (!prep) return null;
      // domináns lapanyag → bolti termék párosítás kód/név alapján
      const topMat = (prep.materials || [])[0];
      let match = null;
      if (topMat) match = (products || []).find((pr) => pr.catId === "lap" && (pr.name.toLowerCase().includes((topMat.name || "").toLowerCase().split(" ")[0]) || (topMat.name || "").toLowerCase().includes(pr.name.toLowerCase().split(" ")[0])));
      const cuts = (prep.cutlist || []).slice(0, 8).map((c) => ({ w: c.w, h: c.h, qty: c.qty }));
      return {
        projectId: p.id, projectName: p.name, customer: p.customer,
        sheets: prep.totals.sheets, parts: prep.qty.parts, edgeMeters: prep.qty.edgeM,
        boardId: match ? match.id : null, boardName: match ? match.name : (topMat ? topMat.name : "—"),
        cuts, items: prep.items.length,
      };
    }).filter(Boolean);
  }, [open, projects, products]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-x-3 top-[8vh] mx-auto max-w-lg bg-white rounded-2xl shadow-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-200 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 grid place-items-center"><Icon name="factory" size={16} /></span>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold text-stone-900">Előkészítésből import</div>
            <div className="text-[11px] text-stone-500">Válassz egy gyártási projektet — az előkészítés adja az árazási adatokat.</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100"><Icon name="x" size={16} /></button>
        </div>
        <div className="overflow-y-auto px-3 py-3 space-y-2">
          {derived.length === 0 && <div className="py-10 text-center text-[12px] text-stone-400">Nincs levezethető gyártási projekt.</div>}
          {derived.map((d) => (
            <button key={d.projectId} onClick={() => onApply(d)}
              className="w-full text-left rounded-xl border border-stone-200 hover:border-teal-300 hover:bg-teal-50/40 transition p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[12.5px] font-semibold text-stone-900 truncate">{d.projectName}</div>
                <span className="text-[10.5px] font-mono text-stone-400 shrink-0">{d.projectId}</span>
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5 truncate">{d.customer} · {d.items} tétel · lap: {d.boardName}</div>
              <div className="flex items-center gap-2 mt-2">
                {[["Tábla", d.sheets], ["Vágás", d.parts + " db"], ["Élhossz", d.edgeMeters.toFixed(1) + " fm"]].map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 tabular-nums"><span className="text-stone-400">{k}:</span><span className="font-semibold">{v}</span></span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ÁRRÉS-MOTOR — markup ↔ árrés kategóriánként és tételenként
// ════════════════════════════════════════════════════════════════════════════
function TradePricing() {
  const sim = useSim();
  const cats = sim.tradeCategories || [];
  const products = sim.tradeProducts || [];
  const catById = useTrM2(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);
  const [tab, setTab] = useTr2("categories");
  const [pcat, setPcat] = useTr2("all");

  const shownProducts = products.filter((p) => pcat === "all" ? true : p.catId === pcat);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[16px] font-semibold tracking-tight text-stone-900">Árrés-motor</div>
          <div className="text-[11.5px] text-stone-500">Kereskedelmi árazás: beszerzési ár → markup → eladási ár. Az ár a Pulton és a Lapszabászatban is innen jön.</div>
        </div>
        <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5">
          {[{ k: "categories", l: "Kategóriák" }, { k: "products", l: "Tételek" }, { k: "services", l: "Szolgáltatás-árazás" }].map((x) => (
            <button key={x.k} onClick={() => setTab(x.k)}
              className={`px-3 h-8 rounded-md text-[12.5px] font-medium ${tab === x.k ? "bg-orange-600 text-white" : "text-stone-600 hover:bg-stone-100"}`}>{x.l}</button>
          ))}
        </div>
      </div>

      {/* markup vs árrés magyarázó — csak áru-árazásnál */}
      {tab !== "services" && (
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200/70">
        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0"><Icon name="alert" size={15} /></div>
        <div className="text-[11.5px] text-amber-900 leading-relaxed">
          <span className="font-semibold">Markup ≠ árrés.</span> A <span className="font-medium">markup</span> a beszerzési árra vetített szorzó (eladási / beszerzés), az <span className="font-medium">árrés %</span> a haszon az eladási árhoz képest (haszon / eladás). Pl. 1,5× markup = 33,3% árrés. A két mező ugyanazt állítja — bármelyiket módosíthatod.
        </div>
      </div>
      )}

      {tab === "services" ? (
        <ServicePricing rates={sim.tradeServiceRates} />
      ) : tab === "categories" ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {cats.map((c) => <CatPricingCard key={c.id} cat={c} />)}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5 overflow-x-auto max-w-full w-fit">
            <button onClick={() => setPcat("all")} className={`px-2.5 h-7 rounded-md text-[11.5px] font-medium whitespace-nowrap ${pcat === "all" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>Összes</button>
            {cats.map((c) => {
              const tone = TRADE_CAT_TONE[c.color] || TRADE_CAT_TONE.stone;
              return <button key={c.id} onClick={() => setPcat(c.id)} className={`px-2.5 h-7 rounded-md text-[11.5px] font-medium whitespace-nowrap inline-flex items-center gap-1.5 ${pcat === c.id ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}><span className={`w-2 h-2 rounded-full ${tone.dot}`} />{c.short}</button>;
            })}
          </div>
          <Card className="p-0 overflow-hidden">
            <div className="hidden md:grid grid-cols-[minmax(0,1.6fr)_90px_120px_110px_110px_100px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40">
              <div>Termék</div><div>Kategória</div><div className="text-right">Beszerzés</div><div className="text-right">Markup</div><div className="text-right">Eladási (nettó)</div><div className="text-right">Árrés</div>
            </div>
            {shownProducts.map((p) => <ProductPricingRow key={p.id} p={p} cat={catById[p.catId]} />)}
          </Card>
        </>
      )}
    </div>
  );
}

function CatPricingCard({ cat }) {
  const tone = TRADE_CAT_TONE[cat.color] || TRADE_CAT_TONE.stone;
  const margin = TE2.markupToMargin(cat.markup);
  const mTone = TE2.marginTone(margin);
  const example = 10000;
  const exSell = TE2.sell(example, cat.markup);
  const [minR, maxR] = cat.range;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-7 h-7 rounded-lg grid place-items-center ${tone.bg} ${tone.fg}`}><Icon name={cat.icon} size={15} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-stone-900 truncate">{cat.name}</div>
          <div className="text-[10.5px] text-stone-400 tabular-nums">Iparági sáv: {TE2.fmtX(minR)}–{TE2.fmtX(maxR)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 my-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-stone-400 font-medium">Markup (×)</span>
          <input type="number" step="0.05" min="1" max="9.99" value={Math.round(cat.markup * 100) / 100}
            onChange={(e) => window.sim.setTradeMarkup(cat.id, e.target.value)}
            className="w-full mt-1 h-9 px-2.5 rounded-lg border border-stone-200 text-[13px] font-semibold tabular-nums outline-none focus:border-orange-400" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-stone-400 font-medium">Árrés (%)</span>
          <input type="number" step="1" min="0" max="95" value={Math.round(margin)}
            onChange={(e) => window.sim.setTradeMargin(cat.id, e.target.value)}
            className="w-full mt-1 h-9 px-2.5 rounded-lg border border-stone-200 text-[13px] font-semibold tabular-nums outline-none focus:border-orange-400" />
        </label>
      </div>

      <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden mb-2">
        <div className={`h-full rounded-full ${mTone.bar}`} style={{ width: `${Math.min(100, margin)}%` }} />
      </div>

      <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-stone-50">
        <span className="text-stone-500 tabular-nums">Pl. {TE2.fmtHuf(example)} beszerzés</span>
        <span className="tabular-nums">→ <span className="font-semibold text-stone-900">{TE2.fmtHuf(exSell)}</span> <span className={mTone.fg}>({TE2.fmtPct(margin)})</span></span>
      </div>
      <div className="text-[10.5px] text-stone-400 mt-2 leading-snug">{cat.note}</div>
    </Card>
  );
}

function ProductPricingRow({ p, cat }) {
  const tone = TRADE_CAT_TONE[cat ? cat.color : "stone"] || TRADE_CAT_TONE.stone;
  const markup = TE2.productMarkup(p, cat);
  const sell = TE2.sellOf(p, cat);
  const margin = TE2.markupToMargin(markup);
  const mTone = TE2.marginTone(margin);
  const overridden = p.markup != null && p.markup !== "";

  return (
    <div className="px-5 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60
      grid md:grid-cols-[minmax(0,1.6fr)_90px_120px_110px_110px_100px] gap-x-3 gap-y-2 items-center">
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-stone-900 truncate">{p.name}</div>
        <div className="text-[10.5px] text-stone-400 font-mono truncate">{p.sku}</div>
      </div>
      <div className="md:block">
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${tone.bg} ${tone.fg}`}>{cat ? cat.short : "—"}</span>
      </div>
      <label className="flex md:block items-center justify-between gap-2">
        <span className="md:hidden text-[10.5px] text-stone-400">Beszerzés</span>
        <input type="number" value={p.purchase} onChange={(e) => window.sim.setTradeProductCost(p.id, e.target.value)}
          className="w-28 md:w-full h-8 px-2 rounded-lg border border-stone-200 text-[12px] tabular-nums text-right outline-none focus:border-orange-400" />
      </label>
      <label className="flex md:block items-center justify-between gap-2">
        <span className="md:hidden text-[10.5px] text-stone-400">Markup</span>
        <input type="number" step="0.05" value={overridden ? Math.round(p.markup * 100) / 100 : ""} placeholder={`${Math.round(markup * 100) / 100} (alap)`}
          onChange={(e) => window.sim.setTradeProductMarkup(p.id, e.target.value)}
          className={`w-28 md:w-full h-8 px-2 rounded-lg border text-[12px] tabular-nums text-right outline-none focus:border-orange-400 ${overridden ? "border-orange-300 bg-orange-50/50" : "border-stone-200"}`} />
      </label>
      <div className="flex md:block items-center justify-between gap-2">
        <span className="md:hidden text-[10.5px] text-stone-400">Eladási</span>
        <span className="text-[13px] font-semibold tabular-nums text-stone-900 md:text-right md:block">{TE2.fmtHuf(sell)}</span>
      </div>
      <div className="flex md:justify-end items-center justify-between gap-2">
        <span className="md:hidden text-[10.5px] text-stone-400">Árrés</span>
        <span className={`inline-flex items-center gap-1 text-[11.5px] font-semibold tabular-nums px-2 py-0.5 rounded-full ${mTone.bg} ${mTone.fg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${mTone.dot}`} />{TE2.fmtPct(margin)}
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SZOLGÁLTATÁS-ÁRAZÁS — szabás-módok + élzárás-paraméterek + egyéb
// ════════════════════════════════════════════════════════════════════════════
function ServicePricing({ rates }) {
  if (!rates) return <div className="text-[12px] text-stone-400 py-8 text-center">Nincs betöltött szolgáltatás-árlista.</div>;
  const num = "h-9 px-2.5 rounded-lg border border-stone-200 text-[13px] font-semibold tabular-nums outline-none focus:border-orange-400";
  const lbl = "text-[10px] uppercase tracking-wide text-stone-400 font-medium";

  // élzárás ár-mátrix: minden vastagság × szélesség × ragasztás
  const combos = [];
  (rates.edgeThickness || []).forEach((t) => (rates.edgeWidth || []).forEach((w) => (rates.edgeGlue || []).forEach((g) => combos.push({ t, w, g }))));

  return (
    <div className="space-y-4">
      {/* Szabás-módok */}
      <Card className="p-4">
        <div className="text-[13px] font-semibold text-stone-900 mb-1">Szabás-módok</div>
        <div className="text-[11px] text-stone-500 mb-3">A szabás-rendelő mindkét módot kínálja: fix tábla-ár vagy folyóméter-alapú kalkuláció.</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-stone-200 p-3">
            <div className="text-[12px] font-medium text-stone-800">Fix tábla-ár</div>
            <div className="text-[10.5px] text-stone-500 mb-2">Táblánkénti átalány a szabásért.</div>
            <label className={lbl}>Ft / tábla</label>
            <input type="number" value={rates.cutFixed} onChange={(e) => window.sim.setCutRate("fixed", e.target.value)} className={num + " w-full mt-1"} />
          </div>
          <div className="rounded-xl border border-stone-200 p-3">
            <div className="text-[12px] font-medium text-stone-800">Folyóméter-szabás</div>
            <div className="text-[10.5px] text-stone-500 mb-2">A vágáshossz (folyóméter) alapján.</div>
            <label className={lbl}>Ft / fm</label>
            <input type="number" value={rates.cutMeter} onChange={(e) => window.sim.setCutRate("meter", e.target.value)} className={num + " w-full mt-1"} />
          </div>
        </div>
      </Card>

      {/* Élzárás */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <div className="text-[13px] font-semibold text-stone-900">Élzárás</div>
          <label className="inline-flex items-center gap-2">
            <span className={lbl}>Alap Ft/fm</span>
            <input type="number" value={rates.edgeBase} onChange={(e) => window.sim.setEdgeBase(e.target.value)} className={num + " w-24"} />
          </label>
        </div>
        <div className="text-[11px] text-stone-500 mb-3">A technológiai paraméterek <span className="font-medium text-stone-600">szorzóként</span> hatnak az alap fm-díjra. A mátrixban minden kombinációhoz konkrét Ft/fm is megadható (egyedi felülírás).</div>

        {/* szorzók */}
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          {[["edgeThickness", "Vastagság"], ["edgeWidth", "Szélesség"], ["edgeGlue", "Ragasztás"]].map(([dim, title]) => (
            <div key={dim} className="rounded-xl border border-stone-200 p-3">
              <div className="text-[11.5px] font-medium text-stone-700 mb-2">{title}</div>
              <div className="space-y-1.5">
                {(rates[dim] || []).map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-stone-600 truncate">{o.name}</span>
                    <div className="inline-flex items-center gap-1 shrink-0">
                      <input type="number" step="0.05" value={o.mult} onChange={(e) => window.sim.setEdgeParamMult(dim, o.id, e.target.value)}
                        className="w-16 h-8 px-2 rounded-md border border-stone-200 text-[12px] tabular-nums text-right outline-none focus:border-orange-400" />
                      <span className="text-[11px] text-stone-400">×</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ár-mátrix: konkrét Ft/fm kombinációnként */}
        <div className="text-[11.5px] font-medium text-stone-700 mb-1.5">Ár-mátrix <span className="text-stone-400 font-normal">(Ft/fm — üres = szorzós alap, beírt érték = egyedi)</span></div>
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_0.9fr] gap-2 px-3 py-2 bg-stone-50/60 text-[10px] uppercase tracking-wide text-stone-500 border-b border-stone-200/70">
            <div>Vastagság · Szélesség · Ragasztás</div><div className="text-right">Számított</div><div className="text-right">Egyedi Ft/fm</div><div className="text-right">Érvényes</div>
          </div>
          {combos.map(({ t, w, g }) => {
            const key = TE2.edgeKey(t.id, w.id, g.id);
            const computed = Math.round(rates.edgeBase * t.mult * w.mult * g.mult / 5) * 5;
            const ov = rates.edgeOverrides ? rates.edgeOverrides[key] : null;
            const effective = TE2.edgeRate(rates, t.id, w.id, g.id);
            const isOv = ov != null && ov !== "";
            return (
              <div key={key} className="grid grid-cols-[1.4fr_1fr_1fr_0.9fr] gap-2 px-3 py-1.5 border-b border-stone-100 last:border-0 items-center text-[11.5px]">
                <div className="text-stone-700 truncate">{t.name} · {w.name} · {g.name}</div>
                <div className="text-right tabular-nums text-stone-400">{TE2.fmtHuf(computed)}</div>
                <div className="flex justify-end">
                  <input type="number" value={isOv ? ov : ""} placeholder="—" onChange={(e) => window.sim.setEdgeOverride(key, e.target.value)}
                    className={`w-20 h-7 px-2 rounded-md border text-[11.5px] tabular-nums text-right outline-none focus:border-orange-400 ${isOv ? "border-orange-300 bg-orange-50/50" : "border-stone-200"}`} />
                </div>
                <div className={`text-right tabular-nums font-semibold ${isOv ? "text-orange-700" : "text-stone-700"}`}>{TE2.fmtHuf(effective)}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Egyéb megmunkálás */}
      <Card className="p-4">
        <div className="text-[13px] font-semibold text-stone-900 mb-3">Egyéb megmunkálás</div>
        <div className="grid sm:grid-cols-3 gap-3">
          {(rates.extras || []).map((s) => (
            <div key={s.id} className="rounded-xl border border-stone-200 p-3">
              <div className="text-[12px] font-medium text-stone-800">{s.name}</div>
              <div className="text-[10.5px] text-stone-500 mb-2">Ft / {s.unit}</div>
              <input type="number" value={s.rate} onChange={(e) => window.sim.setTradeExtraRate(s.id, e.target.value)} className={num + " w-full"} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { TradeCutting, TradePricing });
