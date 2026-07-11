// ──────────────────────────────────────────────────────────────────────────
// Raktár — lot-szintű készletkezelés (zóna = elérhetőségi státusz), bevételezés,
// kivét-kérelmek, raktárhely-beállítások. A zóna NEM fizikai hely; a fizikai
// elhelyezkedés a lot `loc` mezője + a hely-regiszter. Egy igazságforrás: window.sim.
//
// Ez a fájl: közös segéd-komponensek + Készlet (lot-lista zóna-szűrővel).
// A Bevételezés / Kivét / Beállítások a page-warehouse-2.jsx-ben.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateWH, useMemo: useMemoWH } = React;

// ── Közös vizuális elemek ───────────────────────────────────────────────────
function WhZonePill({ zone, size = "sm" }) {
  const z = (window.WH_ZONES || {})[zone] || { label: zone, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  return (
    <span className={`inline-flex items-center gap-1 ${size === "xs" ? "text-[9.5px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"} rounded-full border font-medium ${z.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${z.dot}`} />
      {z.short || z.label}
    </span>
  );
}
function WhTrendPill({ trend }) {
  const t = (window.WH_TREND || {})[trend] || (window.WH_TREND || {}).ok || { label: trend, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${t.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {t.label}
    </span>
  );
}
function WhConsumerPill({ consumer }) {
  const c = (window.WH_CONSUMERS || {})[consumer] || { label: consumer, pill: "bg-stone-100 text-stone-600 border-stone-200", icon: "box" };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.pill}`}>
      <Icon name={c.icon} size={11} />{c.label}
    </span>
  );
}
// Zóna-megoszlás sáv egy tételen belül (lotok mennyisége zónánként)
function WhZoneBar({ lots }) {
  const total = lots.reduce((a, l) => a + (Number(l.qty) || 0), 0) || 1;
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden bg-stone-100">
      {(window.WH_ZONE_ORDER || []).map((zk) => {
        const q = lots.filter((l) => l.zone === zk).reduce((a, l) => a + (Number(l.qty) || 0), 0);
        if (q <= 0) return null;
        const z = window.WH_ZONES[zk];
        return <div key={zk} title={`${z.label}: ${q}`} style={{ width: `${(q / total) * 100}%`, background: z.accent }} />;
      })}
    </div>
  );
}
function WhNumInput({ value, onChange, max, min = 0, className = "" }) {
  return (
    <input type="number" value={value} min={min} max={max}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 px-2.5 rounded-lg border border-stone-200 text-[13px] tabular-nums outline-none focus:border-teal-500 bg-white ${className}`} />
  );
}

// Hely-választó (csak az engedélyezett szintek mezőivel) — regiszterből választ.
function WhLocationSelect({ value, onChange }) {
  const sim = window.useSim();
  const locs = sim.warehouseLocations || [];
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500">
      <option value="">— raktárhely —</option>
      {locs.map((l) => <option key={l.id} value={l.id}>{window.sim.whLocLabel(l)}</option>)}
    </select>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// KÉSZLET — lot-lista zóna-szűrővel
// ══════════════════════════════════════════════════════════════════════════
function WarehouseInventory() {
  const sim = window.useSim();
  const [q, setQ] = useStateWH("");
  const [zoneF, setZoneF] = useStateWH("all");   // all | <zone> | alerts
  const [openId, setOpenId] = useStateWH(null);
  const [showWd, setShowWd] = useStateWH(null);   // item for quick withdrawal

  const items = useMemoWH(() =>
    (sim.catalog || []).filter((it) => it.active !== false && it.worldExt?.warehouse && !it.worldExt.warehouse.archived),
  [sim.catalog]);

  // Zóna-összegzők (globális, fejléchez)
  const zoneTotals = useMemoWH(() => {
    const m = {};
    (window.WH_ZONE_ORDER || []).forEach((z) => (m[z] = 0));
    items.forEach((it) => (it.worldExt.warehouse.lots || []).forEach((l) => { m[l.zone] = (m[l.zone] || 0) + (Number(l.qty) || 0); }));
    return m;
  }, [items]);
  const alertCount = items.filter((it) => it.worldExt.warehouse.trend !== "ok").length;
  const freeValue = items.reduce((a, it) => a + (it.worldExt.warehouse.available || 0) * (it.price || 0), 0);

  const filtered = useMemoWH(() => {
    let list = items;
    if (zoneF === "alerts") list = list.filter((it) => it.worldExt.warehouse.trend !== "ok");
    else if (zoneF !== "all") list = list.filter((it) => (it.worldExt.warehouse.lots || []).some((l) => l.zone === zoneF));
    if (q) {
      const n = q.toLowerCase();
      list = list.filter((it) => it.name.toLowerCase().includes(n) || (it.code || "").toLowerCase().includes(n) ||
        (it.worldExt.warehouse.lots || []).some((l) => (l.locText || "").toLowerCase().includes(n) || (l.projectNo || "").toLowerCase().includes(n)));
    }
    return list;
  }, [items, zoneF, q]);

  const open = openId ? items.find((it) => it.id === openId) : null;
  const fmtVal = (v) => v >= 1e6 ? (v / 1e6).toFixed(1) + "M Ft" : Math.round(v / 1000) + "e Ft";

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">
      {/* Fejléc + zóna-összegzők */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[17px] font-semibold text-stone-900">Készlet</h2>
          <p className="text-[12.5px] text-stone-500">{items.length} nyilvántartott tétel · lot- és zóna-szintű kezelés</p>
        </div>
        <div className="flex items-center gap-2 text-[11.5px]">
          <span className="text-stone-400">Szabad készlet értéke</span>
          <span className="font-semibold text-stone-800 tabular-nums">{fmtVal(freeValue)}</span>
        </div>
      </div>

      {/* Zóna-szűrő chipsor */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3">
        <ZoneChip active={zoneF === "all"} onClick={() => setZoneF("all")} label="Mind" count={items.length} dot="bg-stone-800" />
        {(window.WH_ZONE_ORDER || []).map((zk) => {
          const z = window.WH_ZONES[zk];
          return <ZoneChip key={zk} active={zoneF === zk} onClick={() => setZoneF(zk)} label={z.label} count={zoneTotals[zk] || 0} dotColor={z.accent} />;
        })}
        <ZoneChip active={zoneF === "alerts"} onClick={() => setZoneF("alerts")} label="Utánrendelés" count={alertCount} dot="bg-rose-500" />
      </div>

      {/* Kereső */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"><Icon name="search" size={16} /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés név, cikkszám, hely vagy projektszám szerint…"
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 bg-white" />
      </div>

      {/* Lista */}
      <Card className="p-0 overflow-hidden">
        <div className="hidden lg:grid grid-cols-[minmax(0,1fr)_92px_92px_80px_160px_120px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50">
          <div>Tétel</div><div className="text-right">Szabad</div><div className="text-right">Foglalt</div><div className="text-right">Min.</div><div>Zóna-megoszlás</div><div>Állapot</div>
        </div>
        {filtered.length === 0 && <div className="px-5 py-10 text-center text-[12.5px] text-stone-400">Nincs találat.</div>}
        {filtered.map((it) => {
          const wh = it.worldExt.warehouse;
          return (
            <button key={it.id} onClick={() => setOpenId(it.id)}
              className="w-full text-left border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition">
              {/* Desktop */}
              <div className="hidden lg:grid grid-cols-[minmax(0,1fr)_92px_92px_80px_160px_120px] gap-3 px-5 py-3 items-center">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-stone-900 truncate">{it.name}</div>
                  <div className="text-[10.5px] text-stone-400 font-mono">{it.code} · {(wh.lots || []).length} lot</div>
                </div>
                <div className="text-right tabular-nums text-[13px] font-semibold text-stone-800">{wh.available} <span className="text-[10px] text-stone-400 font-normal">{it.unit}</span></div>
                <div className="text-right tabular-nums text-[12.5px] text-stone-500">{wh.reserved || 0}</div>
                <div className="text-right tabular-nums text-[12px] text-stone-400">{wh.min}</div>
                <div><WhZoneBar lots={wh.lots || []} /></div>
                <div><WhTrendPill trend={wh.trend} /></div>
              </div>
              {/* Mobile / tablet */}
              <div className="lg:hidden px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium text-stone-900 truncate">{it.name}</div>
                    <div className="text-[10.5px] text-stone-400 font-mono">{it.code}</div>
                  </div>
                  <WhTrendPill trend={wh.trend} />
                </div>
                <div className="flex items-center gap-3 text-[11.5px] mb-1.5">
                  <span className="text-stone-500">Szabad <b className="text-stone-800 tabular-nums">{wh.available}</b> {it.unit}</span>
                  {wh.reserved > 0 && <span className="text-stone-400">Foglalt <b className="text-stone-600 tabular-nums">{wh.reserved}</b></span>}
                  <span className="text-stone-300">·</span>
                  <span className="text-stone-400">min. {wh.min}</span>
                </div>
                <WhZoneBar lots={wh.lots || []} />
              </div>
            </button>
          );
        })}
      </Card>

      {/* Tétel-részlet — lotok + zóna-műveletek */}
      <SlideOver open={!!open} onClose={() => setOpenId(null)} width={560}
        title={open ? open.name : ""} subtitle={open ? `${open.code} · ${open.unit}` : ""}
        footer={open ? (
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11.5px] text-stone-500">Szabad: <b className="text-stone-800">{open.worldExt.warehouse.available} {open.unit}</b> · Összes: {open.worldExt.warehouse.onHand}</div>
            <PrimaryBtn icon="external" onClick={() => { setShowWd(open); }}>Kivét-kérelem</PrimaryBtn>
          </div>
        ) : null}>
        {open && <ItemLotPanel item={open} />}
      </SlideOver>

      {/* Gyors kivét-kérelem egy tételre */}
      {showWd && window.QuickWithdrawDialog && <window.QuickWithdrawDialog initialItem={showWd} onClose={() => setShowWd(null)} />}
    </div>
  );
}

function ZoneChip({ active, onClick, label, count, dot, dotColor }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12px] font-medium transition ${active ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`}>
      {dotColor ? <span className="w-2 h-2 rounded-full" style={{ background: dotColor }} /> : <span className={`w-2 h-2 rounded-full ${dot || "bg-stone-300"}`} />}
      {label}
      <span className={`tabular-nums text-[10.5px] ${active ? "text-white/60" : "text-stone-400"}`}>{count}</span>
    </button>
  );
}

// ── Tétel lot-panel (a SlideOver tartalma) ──────────────────────────────────
function ItemLotPanel({ item }) {
  const sim = window.useSim();
  const live = sim.catalog.find((x) => x.id === item.id) || item;
  const wh = live.worldExt.warehouse;
  const lots = (wh.lots || []).slice().sort((a, b) => (window.WH_ZONE_ORDER.indexOf(a.zone) - window.WH_ZONE_ORDER.indexOf(b.zone)));
  const [minEdit, setMinEdit] = useStateWH(false);
  const [minVal, setMinVal] = useStateWH(String(wh.min));
  const [actLot, setActLot] = useStateWH(null);   // lotId being acted on
  const [mode, setMode] = useStateWH(null);        // reassign | move | adjust

  return (
    <div className="space-y-4">
      {/* Összegző */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Szabad" value={`${wh.available}`} sub={item.unit} tone="teal" />
        <Stat label="Foglalt" value={`${wh.reserved || 0}`} sub={item.unit} tone="stone" />
        <Stat label="Összes" value={`${wh.onHand}`} sub={item.unit} tone="stone" />
      </div>

      {/* Újrarendelési szint */}
      <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2.5">
        <div className="text-[12px] text-stone-600">Újrarendelési szint (min. szabad készlet)</div>
        {minEdit ? (
          <div className="flex items-center gap-1.5">
            <WhNumInput value={minVal} onChange={setMinVal} className="w-20" />
            <button onClick={() => { window.sim.setWarehouseStock(item.id, { min: Number(minVal) || 0 }); setMinEdit(false); }}
              className="h-9 px-2.5 rounded-lg bg-teal-700 text-white text-[12px] font-medium">Mentés</button>
          </div>
        ) : (
          <button onClick={() => { setMinVal(String(wh.min)); setMinEdit(true); }}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-stone-800 tabular-nums hover:text-teal-700">
            {wh.min} {item.unit} <Icon name="settings" size={13} />
          </button>
        )}
      </div>

      {/* Lotok */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium">Készlet-tételek (lot) · {lots.length}</div>
        </div>
        <div className="space-y-2">
          {lots.length === 0 && <div className="text-[12px] text-stone-400 italic px-1 py-4 text-center">Nincs készlet-tétel. Vételezz be a Bevételezés képernyőn.</div>}
          {lots.map((lot) => {
            const isAct = actLot === lot.id;
            return (
              <div key={lot.id} className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="shrink-0 text-center min-w-[52px]">
                    <div className="text-[15px] font-semibold text-stone-900 tabular-nums leading-none">{lot.qty}</div>
                    <div className="text-[9.5px] text-stone-400 mt-0.5">{item.unit}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1"><WhZonePill zone={lot.zone} />
                      {lot.projectNo && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-mono">{lot.projectNo}</span>}
                      {lot.ref && !lot.projectNo && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono">{lot.ref}</span>}
                    </div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-1"><Icon name="inventory" size={11} className="text-stone-400" />{lot.locText || "— nincs hely —"}</div>
                    {lot.docNo && <div className="text-[10.5px] text-stone-400 flex items-center gap-1"><Icon name={lot.docType === "szamla" ? "receipt" : "file"} size={11} className="text-stone-300" />{lot.docType === "szamla" ? "Számla" : "Szállítólevél"} {lot.docNo}</div>}
                    {(lot.projectName || lot.refLabel) && <div className="text-[10.5px] text-stone-400 truncate">{lot.projectName || lot.refLabel}</div>}
                  </div>
                  <button onClick={() => { setActLot(isAct ? null : lot.id); setMode(isAct ? null : "menu"); }}
                    className="shrink-0 w-9 h-9 grid place-items-center rounded-lg hover:bg-stone-100 text-stone-500">
                    <Icon name={isAct ? "up" : "down"} size={16} />
                  </button>
                </div>
                {isAct && (
                  <div className="border-t border-stone-100 bg-stone-50/50 px-3 py-2.5">
                    {mode === "menu" && (
                      <div className="flex flex-wrap gap-1.5">
                        <LotActBtn icon="external" label="Zóna mozgatás" onClick={() => setMode("reassign")} />
                        <LotActBtn icon="inventory" label="Áthelyezés" onClick={() => setMode("move")} />
                        <LotActBtn icon="alert" label="Korrekció / selejt" onClick={() => setMode("adjust")} />
                      </div>
                    )}
                    {mode === "reassign" && <LotReassign item={item} lot={lot} onDone={() => { setActLot(null); setMode(null); }} />}
                    {mode === "move" && <LotMove item={item} lot={lot} onDone={() => { setActLot(null); setMode(null); }} />}
                    {mode === "adjust" && <LotAdjust item={item} lot={lot} onDone={() => { setActLot(null); setMode(null); }} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone = "stone" }) {
  const tones = { teal: "text-teal-700", stone: "text-stone-800" };
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-center">
      <div className="text-[10px] uppercase tracking-wide text-stone-400 mb-0.5">{label}</div>
      <div className={`text-[18px] font-semibold tabular-nums ${tones[tone]}`}>{value}<span className="text-[10px] text-stone-400 font-normal ml-0.5">{sub}</span></div>
    </div>
  );
}
function LotActBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-stone-200 text-[12px] font-medium text-stone-700 hover:bg-stone-50">
      <Icon name={icon} size={14} />{label}
    </button>
  );
}

// Zóna-mozgatás (rész vagy egész lot → másik zóna)
function LotReassign({ item, lot, onDone }) {
  const targets = (window.WH_ZONE_MOVES || {})[lot.zone] || [];
  const [toZone, setToZone] = useStateWH(targets[0] || "general");
  const [qty, setQty] = useStateWH(String(lot.qty));
  const [projectNo, setProjectNo] = useStateWH("");
  const [ref, setRef] = useStateWH("");
  const needProject = toZone === "project_locked";
  const needRef = toZone === "shop_reserved" || toZone === "commissioned" || toZone === "shippable";
  const go = () => {
    window.sim.whReassignLot(item.id, lot.id, Number(qty) || 0, toZone, { projectNo, ref, refLabel: ref });
    onDone();
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10.5px] text-stone-500 block mb-1">Cél zóna</label>
          <select value={toZone} onChange={(e) => setToZone(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500">
            {targets.map((z) => <option key={z} value={z}>{window.WH_ZONES[z].label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10.5px] text-stone-500 block mb-1">Mennyiség (max {lot.qty})</label>
          <WhNumInput value={qty} onChange={setQty} max={lot.qty} className="w-full" />
        </div>
      </div>
      {needProject && (
        <input value={projectNo} onChange={(e) => setProjectNo(e.target.value)} placeholder="Projektszám (pl. PRJ-2426-012)"
          className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500 bg-white" />
      )}
      {needRef && (
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Rendelés / hivatkozás (opcionális)"
          className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white" />
      )}
      <div className="flex justify-end gap-1.5 pt-1">
        <button onClick={onDone} className="h-9 px-3 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100">Mégse</button>
        <button onClick={go} className="h-9 px-3.5 rounded-lg bg-teal-700 text-white text-[12px] font-medium">Mozgat</button>
      </div>
    </div>
  );
}
function LotMove({ item, lot, onDone }) {
  const [locId, setLocId] = useStateWH(lot.locId || "");
  const go = () => {
    const loc = window.sim.whLocById(locId);
    window.sim.whMoveLotLocation(item.id, lot.id, locId, loc ? loc.text : "");
    onDone();
  };
  return (
    <div className="space-y-2">
      <label className="text-[10.5px] text-stone-500 block">Új raktárhely</label>
      <WhLocationSelect value={locId} onChange={setLocId} />
      <div className="flex justify-end gap-1.5 pt-1">
        <button onClick={onDone} className="h-9 px-3 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100">Mégse</button>
        <button onClick={go} disabled={!locId} className={`h-9 px-3.5 rounded-lg text-[12px] font-medium ${locId ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-400"}`}>Áthelyez</button>
      </div>
    </div>
  );
}
function LotAdjust({ item, lot, onDone }) {
  const [qty, setQty] = useStateWH(String(lot.qty));
  const [reason, setReason] = useStateWH("");
  const go = () => { window.sim.whAdjustLot(item.id, lot.id, Number(qty) || 0, reason || "Leltárkorrekció"); onDone(); };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10.5px] text-stone-500 block mb-1">Új mennyiség</label>
          <WhNumInput value={qty} onChange={setQty} className="w-full" />
        </div>
        <div>
          <label className="text-[10.5px] text-stone-500 block mb-1">Indok</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Törés / leltárhiány…"
            className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white" />
        </div>
      </div>
      <div className="flex justify-end gap-1.5 pt-1">
        <button onClick={onDone} className="h-9 px-3 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100">Mégse</button>
        <button onClick={go} className="h-9 px-3.5 rounded-lg bg-rose-600 text-white text-[12px] font-medium">Rögzít</button>
      </div>
    </div>
  );
}

Object.assign(window, {
  WhZonePill, WhTrendPill, WhConsumerPill, WhZoneBar, WhNumInput, WhLocationSelect,
  WarehouseInventory,
});
