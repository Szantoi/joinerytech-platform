// Procurement v1 enhancements — PO SlideOver · Delivery recording · Supplier detail
// Overrides window.ProcurementPage from page-rest.jsx
const { useState: useStateP1, useMemo: useMemoP1 } = React;

// ── Enriched PO data (extends ACTIVE_PO with line items + delivery state) ──
const PO_DETAIL = {
  "PO-2426-091": {
    lines: [{ material: "Tölgy 22mm 2440×1830", code: "TL-022-2440", qty: 30, unit: "tábla", unitPrice: 31800, deliveredQty: null }],
    status: "shipped", confirmedAt: "2026-04-23", shippedAt: "2026-04-28", deliveredAt: null,
    contact: "Egger EDI · b2b@egger.hu",
    note: "Raktárra kérjük — Vác főüzem. ETA: 2026-04-30 reggel.",
    trackingNo: "EGR-2026-04-28-091",
  },
  "PO-2426-090": {
    lines: [{ material: "Blum CLIP top 110°", code: "VS-BL-CT", qty: 200, unit: "db", unitPrice: 1240, deliveredQty: null }],
    status: "confirmed", confirmedAt: "2026-04-25", shippedAt: null, deliveredAt: null,
    contact: "Blum partnerszolgálat · hu.partners@blum.com",
    note: "Sürgős — Bognár JT-0184 rendeléshez szükséges.",
    trackingNo: null,
  },
  "PO-2426-089": {
    lines: [{ material: "MDF 19mm 2440×1830", code: "MDF-019", qty: 50, unit: "tábla", unitPrice: 9600, deliveredQty: null }],
    status: "planned", confirmedAt: null, shippedAt: null, deliveredAt: null,
    contact: "Kronospan EDI · edi@kronospan.hu",
    note: null,
    trackingNo: null,
  },
  "PO-2426-088": {
    lines: [
      { material: "Bükk 18mm 2440×1830", code: "BK-018-2440", qty: 40, unit: "tábla", unitPrice: 17900, deliveredQty: null },
      { material: "Bükk élzáró 22mm ABS", code: "EZ-ABS-22-BK", qty: 200, unit: "fm", unitPrice: 190, deliveredQty: null },
    ],
    status: "confirmed", confirmedAt: "2026-04-24", shippedAt: null, deliveredAt: null,
    contact: "Falco B2B · b2b@falco.hu",
    note: "Komplett szállítás kérve (mindkét tétel együtt).",
    trackingNo: null,
  },
};

// Supplier extra info (extends SUPPLIERS)
const SUPPLIER_DETAIL = {
  "Egger Faipari Kft.":  { phone: "+36 94 519 700", email: "b2b@egger.hu", contact: "Horvath Gábor", leadTime: 5, onTime: 94, reliabilityHistory: [92,93,94,95,94,96,96], activePOs: ["PO-2426-091"] },
  "Kronospan HU Zrt.":   { phone: "+36 45 521 100", email: "edi@kronospan.hu", contact: "Molnár Péter", leadTime: 7, onTime: 89, reliabilityHistory: [88,90,91,90,92,92,92], activePOs: ["PO-2426-089"] },
  "Blum Hungária":       { phone: "+36 1 430 8880", email: "hu.partners@blum.com", contact: "Varga Ildikó", leadTime: 3, onTime: 98, reliabilityHistory: [97,97,98,98,98,98,98], activePOs: ["PO-2426-090"] },
  "Hettich Hungary":     { phone: "+36 1 382 7700", email: "info@hettich.hu", contact: "Fekete Zsolt", leadTime: 4, onTime: 86, reliabilityHistory: [82,83,85,86,87,88,88], activePOs: [] },
  "Falco Sopron Zrt.":   { phone: "+36 99 518 100", email: "b2b@falco.hu", contact: "Takács Béla", leadTime: 6, onTime: 93, reliabilityHistory: [91,92,93,93,94,94,94], activePOs: ["PO-2426-088"] },
};

// PO FSM steps and their labels
const PO_STEPS = ["planned","confirmed","shipped","delivered"];
const PO_STEP_HU = { planned: "Leadva", confirmed: "Visszaigazolva", shipped: "Szállítás alatt", delivered: "Megérkezett" };
const PO_STEP_TONE = { planned: "bg-stone-100 text-stone-600", confirmed: "bg-sky-50 text-sky-700", shipped: "bg-amber-50 text-amber-700", delivered: "bg-emerald-50 text-emerald-700" };
const PO_STEP_DOT = { planned: "bg-stone-400", confirmed: "bg-sky-500", shipped: "bg-amber-500", delivered: "bg-emerald-500" };

function PoStatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${PO_STEP_TONE[status] || "bg-stone-100 text-stone-600"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${PO_STEP_DOT[status] || "bg-stone-400"}`} />
      {PO_STEP_HU[status] || status}
    </span>
  );
}

function PoTimeline({ status }) {
  const cur = PO_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {PO_STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex-1 py-1.5 text-center rounded-md text-[10.5px] font-medium transition ${
            i < cur ? "bg-emerald-50 text-emerald-700" :
            i === cur ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200" :
            "bg-stone-50 text-stone-400"
          }`}>
            {PO_STEP_HU[s]}
          </div>
          {i < PO_STEPS.length - 1 && <Icon name="chevron" size={11} className="text-stone-300 shrink-0" />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Delivery recording form (nested SlideOver) ──────────────────────────────
function DeliveryDrawer({ open, po, detail, onClose, onSubmit }) {
  const [lines, setLines] = useStateP1(() =>
    (detail?.lines || []).map(l => ({ ...l, deliveredNow: l.qty }))
  );
  const [date, setDate] = useStateP1("2026-05-29");
  const [note, setNote] = useStateP1("");

  React.useEffect(() => {
    if (open && detail) setLines(detail.lines.map(l => ({ ...l, deliveredNow: l.qty })));
  }, [open]);

  if (!po || !detail) return null;

  return (
    <SlideOver open={open} onClose={onClose}
      title="Szállítás rögzítése" subtitle={`${po.id} · ${po.supplier}`} width={520}
      footer={<><GhostBtn onClick={onClose}>Mégse</GhostBtn><PrimaryBtn icon="check" onClick={() => onSubmit(lines, date, note)}>Szállítás rögzítése</PrimaryBtn></>}>
      <div className="px-5 py-4 space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Szállítási dátum</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-2">Szállított tételek</div>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="border border-stone-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-[12.5px] font-medium text-stone-900">{l.material}</div>
                    <div className="text-[10.5px] font-mono text-stone-400">{l.code}</div>
                  </div>
                  <div className="text-right text-[10.5px] text-stone-500">
                    Rendelt: <span className="font-semibold text-stone-800">{l.qty} {l.unit}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Érkezett mennyiség</div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button onClick={() => setLines(ls => ls.map((x, j) => j === i ? { ...x, deliveredNow: Math.max(0, x.deliveredNow - 1) } : x))}
                      className="w-7 h-7 rounded-md bg-stone-100 hover:bg-stone-200 grid place-items-center text-stone-700 font-bold text-[14px]">−</button>
                    <input type="number" value={l.deliveredNow} min={0} max={l.qty * 2}
                      onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, deliveredNow: Math.max(0, Number(e.target.value)) } : x))}
                      className="w-20 h-7 text-center rounded-md border border-stone-200 text-[13px] font-mono font-semibold outline-none focus:border-teal-500" />
                    <button onClick={() => setLines(ls => ls.map((x, j) => j === i ? { ...x, deliveredNow: Math.min(x.qty * 2, x.deliveredNow + 1) } : x))}
                      className="w-7 h-7 rounded-md bg-stone-100 hover:bg-stone-200 grid place-items-center text-stone-700 font-bold text-[14px]">+</button>
                    <span className="text-[11.5px] text-stone-500 ml-1">{l.unit}</span>
                  </div>
                </div>
                {l.deliveredNow !== l.qty && (
                  <div className={`mt-2 text-[11px] font-medium flex items-center gap-1 ${l.deliveredNow < l.qty ? "text-amber-700" : "text-rose-700"}`}>
                    <Icon name="alert" size={12} />
                    {l.deliveredNow < l.qty ? `Hiány: ${l.qty - l.deliveredNow} ${l.unit}` : `Többlet: +${l.deliveredNow - l.qty} ${l.unit}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Megjegyzés</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="Pl. sérült csomagolás, hiányos szállítás indoka…"
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none" />
        </div>

        <div className="bg-teal-50 border border-teal-100 rounded-lg px-3 py-2.5 text-[11.5px] text-teal-800 flex gap-2">
          <Icon name="check" size={14} className="shrink-0 mt-0.5" />
          Rögzítés után a PO státusza <span className="font-semibold">Megérkezett</span> lesz, a készlet automatikusan frissül.
        </div>
      </div>
    </SlideOver>
  );
}

// ── Supplier detail SlideOver ───────────────────────────────────────────────
function SupplierSlideOver({ open, supplier, onClose, pos }) {
  if (!supplier) return null;
  const d = SUPPLIER_DETAIL[supplier.name];
  const activePOs = (d?.activePOs || []).map(id => ({ ...ACTIVE_PO.find(p => p.id === id), ...(PO_DETAIL[id] || {}) })).filter(Boolean);

  return (
    <SlideOver open={open} onClose={onClose}
      title={supplier.name} subtitle={supplier.city + " · Szállító"} width={500}
      footer={<><GhostBtn onClick={onClose}>Bezár</GhostBtn><PrimaryBtn icon="plus">Új megrendelés</PrimaryBtn></>}>
      <div className="px-5 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Rating", value: `★ ${supplier.rating}`, tone: "text-amber-700" },
            { label: "Megbízhatóság", value: `${supplier.reliability}%`, tone: "text-emerald-700" },
            { label: "Átlag lead time", value: `${d?.leadTime || "—"} nap`, tone: "text-stone-900" },
          ].map(s => (
            <div key={s.label} className="bg-stone-50 rounded-lg p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-1">{s.label}</div>
              <div className={`text-[16px] font-semibold tabular-nums ${s.tone}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Reliability sparkline */}
        {d?.reliabilityHistory && (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Megbízhatóság trend (7 hét)</div>
            <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
              <div className="flex items-end gap-1 h-10">
                {d.reliabilityHistory.map((v, i) => {
                  const pct = ((v - 80) / 20) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                      <div className="text-[8px] text-stone-400 tabular-nums">{v}</div>
                      <div className="w-full rounded-t-sm bg-teal-600" style={{ height: `${Math.max(4, pct * 0.28)}px` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Contact */}
        {d && (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-2">Kapcsolattartó</div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-stone-50 border border-stone-100">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-stone-400 to-stone-600 grid place-items-center text-[11px] font-bold text-white shrink-0">
                {d.contact.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-stone-900">{d.contact}</div>
                <div className="text-[11px] font-mono text-stone-500 truncate">{d.email}</div>
              </div>
              <a href={"tel:" + d.phone} className="text-[11px] font-mono text-teal-700 hover:underline shrink-0">{d.phone}</a>
            </div>
          </div>
        )}

        {/* Active POs */}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-2">
            Aktív megrendelések ({activePOs.length})
          </div>
          {activePOs.length === 0
            ? <div className="text-[12px] text-stone-400 italic px-1">Nincs aktív megrendelés</div>
            : (
              <div className="space-y-1.5">
                {activePOs.map(po => (
                  <div key={po.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-stone-200 bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-mono font-medium text-stone-700">{po.id}</div>
                      <div className="text-[10.5px] text-stone-500 truncate">{po.material} · {po.qty} {po.lines?.[0]?.unit || "db"}</div>
                    </div>
                    <PoStatusPill status={po.status} />
                    <div className="text-[10.5px] font-mono text-stone-400">{po.eta}</div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Order history summary */}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-2">Utolsó megrendelés</div>
          <div className="text-[12.5px] font-mono text-stone-700">{supplier.lastOrder}</div>
        </div>
      </div>
    </SlideOver>
  );
}

// ── Enhanced ProcurementPage ────────────────────────────────────────────────
function ProcurementPage({ t }) {
  const [pos, setPos] = useStateP1(
    ACTIVE_PO.map(p => ({ ...p, ...(PO_DETAIL[p.id] ? { status: PO_DETAIL[p.id].status } : {}), _detail: PO_DETAIL[p.id] || null }))
  );
  const [openPoId, setOpenPoId] = useStateP1(null);
  const [expandedPoId, setExpandedPoId] = useStateP1(null);
  const [showDelivery, setShowDelivery] = useStateP1(false);
  const [showNewPo, setShowNewPo] = useStateP1(false);
  const [openSupplier, setOpenSupplier] = useStateP1(null);

  const openPo = pos.find(p => p.id === openPoId);

  const handleDelivery = (lines, date, note) => {
    setPos(ps => ps.map(p => p.id === openPoId
      ? { ...p, status: "delivered", _detail: { ...p._detail, deliveredAt: date, lines: lines.map(l => ({ ...l, deliveredQty: l.deliveredNow })) } }
      : p
    ));
    setShowDelivery(false);
    setOpenPoId(null);
    window.toast?.(`✓ ${openPoId} szállítás rögzítve`, "success");
  };

  const poTotal = po => {
    const detail = po._detail;
    if (!detail?.lines) return null;
    return detail.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  };

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-12 gap-3">

        {/* Active PO list */}
        <Card className="col-span-12 lg:col-span-8 p-0">
          <div className="px-5 py-3 border-b border-stone-200/80 flex items-center justify-between">
            <div>
              <div className="text-[12.5px] font-semibold text-stone-900">{t.proc.activePO}</div>
              <div className="text-[10.5px] text-stone-500">{pos.filter(p => p.status !== "delivered").length} nyitott</div>
            </div>
            <PrimaryBtn icon="plus" onClick={() => setShowNewPo(true)}>{t.proc.newPO}</PrimaryBtn>
          </div>
          <div className="hidden md:flex items-center border-b border-stone-100 bg-stone-50/40">
            <div className="flex-1 grid grid-cols-[110px_minmax(0,1.4fr)_110px_130px_28px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500">
              <div>ID</div><div>Szállító</div><div>ETA</div><div>Státusz</div><div></div>
            </div>
            <div className="w-10 shrink-0" />
          </div>
          {pos.map(p => {
            const isExpanded = expandedPoId === p.id;
            return (
              <div key={p.id} className="border-b border-stone-100 last:border-0">
                {/* Desktop row */}
                <div className="hidden md:flex items-center hover:bg-stone-50/60 group">
                  <button onClick={() => setExpandedPoId(isExpanded ? null : p.id)}
                    className="flex-1 grid grid-cols-[110px_minmax(0,1.4fr)_110px_130px_28px] gap-3 px-5 py-3 items-center text-left">
                    <div className="text-[11px] font-mono text-stone-500 truncate">{p.id}</div>
                    <div className="text-[12.5px] font-medium text-stone-900 truncate">{p.supplier}</div>
                    <div className="text-[11px] font-mono text-stone-500">{p.eta}</div>
                    <div><PoStatusPill status={p.status} /></div>
                    <div className={`text-stone-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                      <Icon name="chevron" size={13} />
                    </div>
                  </button>
                  <button onClick={() => setOpenPoId(p.id)} title="Teljes nézet megnyitása"
                    className="w-10 flex items-center justify-center py-3 text-stone-300 hover:text-stone-600 transition shrink-0">
                    <Icon name="external" size={13} />
                  </button>
                </div>
                {/* Mobile row */}
                <div className="md:hidden flex items-center hover:bg-stone-50/60">
                  <button onClick={() => setExpandedPoId(isExpanded ? null : p.id)}
                    className="flex-1 px-4 py-3.5 flex items-center gap-3 text-left">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium text-stone-900 truncate">{p.supplier}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <PoStatusPill status={p.status} />
                        <span className="text-[11px] font-mono text-stone-500 truncate">{p.id} · {p.material}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[13px] font-semibold text-stone-900 tabular-nums">{p.qty} <span className="text-stone-400 text-[10px] font-normal">db</span></div>
                      <div className="text-[11px] font-mono text-stone-400">{p.eta}</div>
                    </div>
                    <Icon name="chevron" size={15} className={`text-stone-300 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                  <button onClick={() => setOpenPoId(p.id)} title="Teljes nézet"
                    className="px-3 py-3.5 text-stone-300 hover:text-stone-600 shrink-0 transition">
                    <Icon name="external" size={14} />
                  </button>
                </div>
                {/* Inline expand */}
                {isExpanded && (
                  <div className="px-5 pb-4 pt-3 bg-stone-50/40 border-t border-stone-100">
                    <PoTimeline status={p.status} />
                    {p._detail?.lines && (
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                        {p._detail.lines.map((l, i) => (
                          <div key={i} className="bg-white rounded-lg border border-stone-100 p-2.5">
                            <div className="text-[10.5px] text-stone-500 truncate">{l.material || l.name}</div>
                            <div className="text-[12.5px] font-semibold text-stone-900 mt-0.5 tabular-nums">{l.qty} <span className="text-[10px] font-normal text-stone-400">{l.unit}</span></div>
                            <div className="text-[10.5px] text-stone-400 font-mono mt-0.5">{l.unitPrice ? (l.unitPrice).toLocaleString("hu-HU") + " Ft" : ""}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {p.status !== "delivered" && (
                        <button onClick={() => { setOpenPoId(p.id); setShowDelivery(true); }}
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-teal-600 text-white text-[11px] font-medium hover:bg-teal-700">
                          <Icon name="check" size={11} /> Szállítás rögzítése
                        </button>
                      )}
                      <button onClick={() => setOpenPoId(p.id)}
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-stone-200 bg-white text-stone-600 text-[11px] hover:bg-stone-50">
                        <Icon name="external" size={11} /> Teljes nézet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        {/* Supplier list */}
        <Card className="col-span-12 lg:col-span-4 p-0">
          <div className="px-5 py-3 border-b border-stone-200/80 text-[12.5px] font-semibold text-stone-900">{t.proc.suppliers}</div>
          {SUPPLIERS.map(s => (
            <button key={s.name} onClick={() => setOpenSupplier(s)}
              className="w-full text-left px-5 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium text-stone-900 truncate">{s.name}</div>
                  <div className="text-[11px] text-stone-500">{s.city}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] font-medium text-amber-600 tabular-nums">★ {s.rating}</div>
                  <div className="text-[10.5px] text-stone-500 tabular-nums">{s.reliability}%</div>
                </div>
              </div>
              {/* mini reliability bar */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full" style={{ width: s.reliability + "%" }} />
                </div>
                <span className="text-[10px] font-mono text-stone-400 shrink-0">{t.proc.lastOrder} {s.lastOrder}</span>
              </div>
            </button>
          ))}
        </Card>
      </div>

      {/* PO detail SlideOver */}
      <SlideOver open={!!openPo} onClose={() => { setOpenPoId(null); setShowDelivery(false); }}
        title={openPo?.id} subtitle={openPo && openPo.supplier + " · " + PO_STEP_HU[openPo.status]}
        width={560}
        footer={openPo && (
          openPo.status !== "delivered"
            ? <><GhostBtn onClick={() => setOpenPoId(null)}>Bezár</GhostBtn>
                <PrimaryBtn icon="check" onClick={() => setShowDelivery(true)}>Szállítás rögzítése</PrimaryBtn></>
            : <GhostBtn onClick={() => setOpenPoId(null)}>Bezár</GhostBtn>
        )}>
        {openPo && (
          <div className="px-5 py-4 space-y-4">
            {/* Timeline */}
            <PoTimeline status={openPo.status} />

            {/* Számlázás — minimális jelzés (a teljes pénzügyi kezelés a Pénzügy világban) */}
            {(() => {
              const inv = (window.sim && window.sim.finInvoices ? window.sim.finInvoices : []).find(i => i.dir === "in" && i.orderRef === openPo.id);
              return inv ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5 text-[11.5px] text-emerald-800 flex items-center gap-2">
                  <Icon name="receipt" size={14} className="shrink-0" />
                  <span>Leszámlázva — szállítói számla: <span className="font-mono font-medium">{inv.id}</span>. Pénzügyi kezelés a <span className="font-medium">Pénzügy</span> világban.</span>
                </div>
              ) : (
                <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 text-[11.5px] text-stone-500 flex items-center gap-2">
                  <Icon name="receipt" size={14} className="shrink-0 text-stone-400" />
                  <span>Nincs még szállítói számla erre a megrendelésre.</span>
                </div>
              );
            })()}

            {/* Line items */}
            <div>
              <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-2">Tételek</div>
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[minmax(0,1.6fr)_60px_80px_100px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 bg-stone-50/60 border-b border-stone-100">
                  <div>Anyag</div><div className="text-right">Db</div><div className="text-right">Egységár</div><div className="text-right">Érték</div>
                </div>
                {(openPo._detail?.lines || [{ material: openPo.material, code: "—", qty: openPo.qty, unit: "db", unitPrice: 0 }]).map((l, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,1.6fr)_60px_80px_100px] gap-2 px-3 py-2.5 border-b border-stone-100 last:border-0 items-center text-[12px]">
                    <div>
                      <div className="text-stone-900 truncate">{l.material}</div>
                      <div className="text-[10px] font-mono text-stone-400">{l.code}</div>
                    </div>
                    <div className="text-right font-mono tabular-nums text-stone-700">{l.qty} <span className="text-stone-400 text-[10px]">{l.unit}</span></div>
                    <div className="text-right font-mono tabular-nums text-stone-700">{l.unitPrice ? fmtHUF(l.unitPrice) : "—"}</div>
                    <div className="text-right font-mono tabular-nums font-medium text-stone-900">{l.unitPrice ? fmtHUF(l.qty * l.unitPrice) : "—"}</div>
                  </div>
                ))}
                {poTotal(openPo) && (
                  <div className="px-3 py-2 bg-stone-50/60 border-t border-stone-200 flex justify-end gap-4 text-[12px]">
                    <span className="text-stone-500">Nettó összesen</span>
                    <span className="font-semibold font-mono text-stone-900">{fmtHUF(poTotal(openPo))}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery status */}
            {openPo.status === "delivered" && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5 text-[11.5px] text-emerald-800 flex gap-2">
                <Icon name="check" size={14} className="shrink-0 mt-0.5" />
                <div>Szállítás rögzítve: <span className="font-mono font-medium">{openPo._detail?.deliveredAt}</span></div>
              </div>
            )}

            {/* Tracking */}
            {openPo._detail?.trackingNo && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Nyomkövetés</div>
                <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-stone-50 border border-stone-200">
                  <Icon name="external" size={13} className="text-teal-600" />
                  <span className="font-mono text-[12px] text-teal-700">{openPo._detail.trackingNo}</span>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-3 text-[11.5px]">
              {[
                { label: "Visszaigazolva", value: openPo._detail?.confirmedAt },
                { label: "Szállítás", value: openPo._detail?.shippedAt },
              ].map(r => r.value && (
                <div key={r.label}>
                  <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-0.5">{r.label}</div>
                  <div className="font-mono text-stone-700">{r.value}</div>
                </div>
              ))}
            </div>

            {/* Note */}
            {openPo._detail?.note && (
              <div className="bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5 text-[11.5px] text-stone-700">{openPo._detail.note}</div>
            )}

            {/* Contact */}
            {openPo._detail?.contact && (
              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                <Icon name="user" size={12} />
                <span className="font-mono">{openPo._detail.contact}</span>
              </div>
            )}
          </div>
        )}
      </SlideOver>

      {/* Delivery recording drawer (nested) */}
      <DeliveryDrawer
        open={showDelivery} po={openPo} detail={openPo?._detail}
        onClose={() => setShowDelivery(false)} onSubmit={handleDelivery}
      />

      {/* Supplier detail */}
      <SupplierSlideOver
        open={!!openSupplier} supplier={openSupplier}
        onClose={() => setOpenSupplier(null)} pos={pos}
      />

      {/* New PO placeholder drawer */}
      <SlideOver open={showNewPo} onClose={() => setShowNewPo(false)}
        title="Új megrendelés" subtitle="Vázlat · auto PO-ID" width={520}
        footer={<><GhostBtn onClick={() => setShowNewPo(false)}>Mégse</GhostBtn><PrimaryBtn icon="check" onClick={() => { setShowNewPo(false); window.toast?.("✓ PO vázlat mentve", "success"); }}>Mentés vázlatként</PrimaryBtn></>}>
        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Szállító</div>
            <select className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white">
              {SUPPLIERS.map(s => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Anyag</div>
              <input list="mat-list2" placeholder="pl. Bükk 18mm tábla" className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500" />
              <datalist id="mat-list2">{MATERIALS.map(m => <option key={m.code} value={m.name} />)}</datalist>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Mennyiség</div>
              <div className="flex gap-1.5">
                <input type="number" placeholder="0" className="flex-1 h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500" />
                <select className="h-9 px-2 rounded-lg border border-stone-200 text-[12px] bg-white">
                  {["tábla","db","fm","m²"].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Kért szállítási dátum</div>
            <input type="date" className="h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Megjegyzés</div>
            <textarea rows={3} placeholder="Pl. sürgős, specifikus minőségi elvárások…"
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 resize-none" />
          </div>
        </div>
      </SlideOver>
    </div>
  );
}

window.ProcurementPage = ProcurementPage;

// ── Combined Orders Page — csak szállítói megrendelések (vevői rendelések = Sales világ)
function CombinedOrdersPage({ t, lang }) {
  return <ProcurementPage t={t} />;
}
window.CombinedOrdersPage = CombinedOrdersPage;
