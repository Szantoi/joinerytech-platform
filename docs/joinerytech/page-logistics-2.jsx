// ─────────────────────────────────────────────────────────────────
// page-logistics-2.jsx — LOGISZTIKA világ (2/2)
//   ShipmentDetail (SlideOver tartalom: ütemezés + FSM + kiadás + átadás-átvétel),
//   DriverTerminal (mobil sofőr/szerelő terminál — mai túra), ResourcesPanel
//   (járművek + brigádok), NewShipmentSheet (új fuvar belépési pontokkal).
//   Store: window.sim.* + LogEngine.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateL2, useMemo: useMemoL2 } = React;

// ── Fuvar részlet (SlideOver tartalom) ───────────────────────────
function ShipmentDetail({ sh, onClose }) {
  const sim = useSim();
  const live = (sim.shipments || []).find((x) => x.id === sh.id) || sh;
  const m = (window.LOG_TYPE_META || {})[live.type] || {};
  const next = window.LogEngine ? window.LogEngine.nextStates(live) : [];
  const conflict = window.sim.shipmentConflictSet()[live.id];
  const vehicles = sim.vehicles || [];
  const crews = sim.crews || [];
  const [delegOpen, setDelegOpen] = useStateL2(false);
  const [rekOpen, setRekOpen] = useStateL2(false);
  const [rekText, setRekText] = useStateL2("");
  const [defText, setDefText] = useStateL2("");
  const [defSev, setDefSev] = useStateL2("minor");

  const go = (to) => { if (to === "reklamacio") { setRekOpen(true); return; } window.sim.setShipmentStatus(live.id, to); };
  const sched = (patch) => window.sim.scheduleShipment(live.id, patch);
  const ho = live.handover || {};
  const showHandover = live.type === "delivery" && ["kiszallitva", "beszerelve", "atadva", "reklamacio"].includes(live.status);
  const partners = (sim.partners || []).filter((p) => p.platform && (p.actorType === "installer" || p.actorType === "supplier" || p.actorType === "manufacturer"));

  const Field = ({ label, children }) => (
    <div><label className="text-[10.5px] text-stone-500 block mb-1">{label}</label>{children}</div>
  );
  const inputCls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-sky-500";

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      {/* fejléc */}
      <div className="flex items-center gap-2 flex-wrap">
        <ShipTypeBadge type={live.type} />
        <LogStatusPill status={live.status} />
        {live.install && live.type === "delivery" && <span className="text-[10px] px-2 h-6 inline-flex items-center rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-medium">+ telepítés</span>}
        {conflict && <span className="inline-flex items-center gap-1 text-[10px] px-2 h-6 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium"><Icon name="alert" size={11} /> erőforrás-ütközés</span>}
      </div>

      <ShipStepper sh={live} />

      {/* helyszín / kapcsolat */}
      <div className="rounded-xl border border-stone-200 p-3 space-y-1.5">
        <div className="flex items-start gap-2"><Icon name="pin" size={15} className="text-stone-400 mt-0.5 shrink-0" /><div className="text-[12.5px] text-stone-800">{live.address || "—"}</div></div>
        <div className="flex items-center gap-2 text-[12px] text-stone-600"><Icon name="user" size={14} className="text-stone-400" />{live.contact || "—"}{live.phone && <a href={`tel:${live.phone}`} className="inline-flex items-center gap-1 text-sky-700 ml-1"><Icon name="phone" size={13} />{live.phone}</a>}</div>
        {live.refLabel && <div className="flex items-center gap-2 text-[12px] text-stone-600"><Icon name="file" size={14} className="text-stone-400" />{live.refLabel}{live.ref && <span className="font-mono text-[10.5px] text-stone-400">· {live.ref}</span>}</div>}
        {(live.loadM3 > 0 || live.loadKg > 0) && <div className="flex items-center gap-2 text-[12px] text-stone-600"><Icon name="box" size={14} className="text-stone-400" />{live.loadM3 ? `${live.loadM3} m³` : ""}{live.loadM3 && live.loadKg ? " · " : ""}{live.loadKg ? `${logHuf(live.loadKg)} kg` : ""}</div>}
      </div>

      {/* FSM akciók */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Státusz léptetés</div>
        {next.length ? (
          <div className="flex items-center gap-2 flex-wrap">
            {next.map((to) => {
              const t = window.LOG_STATUS[to] || {};
              const rek = to === "reklamacio";
              return <button key={to} onClick={() => go(to)} className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${rek ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100" : "bg-sky-600 text-white hover:bg-sky-700"}`}>
                {rek ? <Icon name="alert" size={14} /> : <Icon name="arrow-right" size={14} />}{t.label}
              </button>;
            })}
          </div>
        ) : <div className="text-[12px] text-stone-400">Lezárt fuvar — nincs további lépés.</div>}
        {rekOpen && (
          <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3">
            <label className="text-[11px] text-rose-700 font-medium block mb-1">Reklamáció oka (kötelező)</label>
            <textarea value={rekText} onChange={(e) => setRekText(e.target.value)} rows={2} className="w-full px-2.5 py-2 rounded-lg border border-rose-200 text-[12.5px] bg-white outline-none focus:border-rose-400" placeholder="Mi a probléma?" />
            <div className="flex items-center gap-2 mt-2">
              <button disabled={!rekText.trim()} onClick={() => { if (window.sim.setShipmentStatus(live.id, "reklamacio", { reason: rekText })) { setRekOpen(false); setRekText(""); } }} className="h-8 px-3 rounded-lg bg-rose-600 text-white text-[12px] font-medium disabled:opacity-40">Reklamáció rögzítése</button>
              <button onClick={() => { setRekOpen(false); setRekText(""); }} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button>
            </div>
          </div>
        )}
      </div>

      {/* Számlázás — átadott kiszállításból számla-piszkozat (FŐ lánc zárása) */}
      {live.type === "delivery" && live.status === "atadva" && (() => {
        const inv = (sim.finInvoices || []).find((v) => v.dir === "out" && v.orderRef === (live.ref || live.id) && v.status !== "void");
        return (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Számlázás</div>
            {inv ? (
              <button onClick={() => window.navigateTo && window.navigateTo("finance", "outgoing")} className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 flex items-center gap-2 hover:bg-emerald-100/60">
                <Icon name="receipt" size={16} className="text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-[12.5px] font-medium text-emerald-800">Számla: {inv.id} ({(window.FIN_STATUS && window.FIN_STATUS[inv.status] && window.FIN_STATUS[inv.status].label) || inv.status})</div>
                  <div className="text-[10.5px] text-emerald-600/80">Megnyitás a Pénzügyben →</div>
                </div>
                <Icon name="external" size={14} className="text-emerald-500 shrink-0" />
              </button>
            ) : (
              <button onClick={() => window.sim.invoiceDraftFromDelivery(live.id)} className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-medium"><Icon name="receipt" size={14} />Számla-piszkozat a Pénzügyben</button>
            )}
          </div>
        );
      })()}

      {/* Ütemezés */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Ütemezés</div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Dátum"><input type="date" value={live.date || ""} onChange={(e) => sched({ date: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-1.5">
            <Field label="Tól"><input type="time" value={live.windowStart || ""} onChange={(e) => sched({ windowStart: e.target.value })} className={inputCls} /></Field>
            <Field label="Ig"><input type="time" value={live.windowEnd || ""} onChange={(e) => sched({ windowEnd: e.target.value })} className={inputCls} /></Field>
          </div>
          {!live.delegatedTo && <>
            <Field label="Jármű"><select value={live.vehicleId || ""} onChange={(e) => sched({ vehicleId: e.target.value || null })} className={inputCls}><option value="">— nincs —</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>)}</select></Field>
            <Field label="Brigád"><select value={live.crewId || ""} onChange={(e) => sched({ crewId: e.target.value || null })} className={inputCls}><option value="">— nincs —</option>{crews.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          </>}
        </div>
        {conflict && <div className="mt-2 text-[11px] text-rose-600 flex items-center gap-1.5"><Icon name="alert" size={12} />A választott jármű/brigád átfedő időablakban máshol is be van osztva ezen a napon.</div>}
      </div>

      {/* Kiadás partnernek (B2B kézfogás) */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Kiadás fuvarpartnernek</div>
        {live.delegatedTo ? (
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 flex items-center gap-2">
            <Icon name="external" size={16} className="text-violet-600" />
            <div className="flex-1 min-w-0"><div className="text-[12.5px] font-medium text-violet-800">{live.delegatedTo}</div><div className="text-[10.5px] text-violet-600/80">{live.delegatedExternal ? "Platformon kívül — kézi státusz" : "Kézfogás elküldve"}</div></div>
            <button onClick={() => window.sim.recallShipment(live.id)} className="h-8 px-3 rounded-lg border border-violet-200 text-[12px] text-violet-700 bg-white hover:bg-violet-50">Visszavonás</button>
          </div>
        ) : delegOpen ? (
          <div className="rounded-xl border border-stone-200 p-2 space-y-1.5">
            {partners.map((p) => (
              <button key={p.id} onClick={() => { window.sim.delegateShipment(live.id, p.id); setDelegOpen(false); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-stone-50 text-left">
                <div className="w-7 h-7 rounded-lg bg-stone-100 grid place-items-center text-stone-500"><Icon name="truck" size={14} /></div>
                <div className="min-w-0 flex-1"><div className="text-[12.5px] font-medium text-stone-800 truncate">{p.name}</div><div className="text-[10.5px] text-stone-400 truncate">{p.specialty}</div></div>
                {!p.platform && <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">platformon kívül</span>}
              </button>
            ))}
            <button onClick={() => setDelegOpen(false)} className="w-full h-8 rounded-lg text-[12px] text-stone-500 hover:bg-stone-50">Mégse</button>
          </div>
        ) : (
          <button onClick={() => setDelegOpen(true)} className="w-full h-9 rounded-lg border border-dashed border-stone-300 text-[12.5px] font-medium text-stone-500 hover:text-violet-700 hover:border-violet-300">+ Fuvar kiadása külső partnernek</button>
        )}
      </div>

      {/* Átadás-átvétel (csak kiszállításnál, kiszállítva után) */}
      {showHandover && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Átadás-átvétel</div>
          <div className="rounded-xl border border-stone-200 p-3 space-y-3">
            {/* aláírás */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12.5px] text-stone-700"><Icon name="signature" size={16} className="text-stone-400" />Ügyfél aláírása</div>
              {ho.signedBy ? <span className="text-[11.5px] text-emerald-700 font-medium inline-flex items-center gap-1"><Icon name="check" size={13} />{ho.signedBy} · {ho.signedAt}</span>
                : <button onClick={() => window.sim.setShipmentHandover(live.id, { signedBy: live.contact || "Ügyfél", signedAt: new Date().toISOString().slice(0, 16).replace("T", " ") })} className="h-8 px-3 rounded-lg bg-stone-900 text-white text-[12px] font-medium">Aláírás rögzítése</button>}
            </div>
            {/* fotók */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12.5px] text-stone-700"><Icon name="camera" size={16} className="text-stone-400" />Fotók <span className="text-stone-400">({ho.photos || 0})</span></div>
              <button onClick={() => window.sim.setShipmentHandover(live.id, { photos: (ho.photos || 0) + 1 })} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600 hover:bg-stone-50 inline-flex items-center gap-1"><Icon name="plus" size={13} />Fotó</button>
            </div>
            {/* hiánylista */}
            <div>
              <div className="flex items-center gap-2 text-[12.5px] text-stone-700 mb-1.5"><Icon name="alert" size={15} className="text-stone-400" />Hiánylista / hibajegyzék</div>
              {(ho.deficiencies || []).length > 0 && (
                <div className="space-y-1 mb-2">
                  {ho.deficiencies.map((d, i) => {
                    const sv = (window.LOG_DEFECT_SEV || {})[d.sev] || {};
                    return <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-stone-50 border border-stone-100">
                      <span className={`text-[9.5px] px-1.5 py-0.5 rounded-full border font-medium ${sv.pill}`}>{sv.label}</span>
                      <span className="text-[12px] text-stone-700 flex-1 min-w-0">{d.text}</span>
                      <button onClick={() => window.sim.removeShipmentDefect(live.id, i)} className="text-stone-300 hover:text-rose-500"><Icon name="x" size={14} /></button>
                    </div>;
                  })}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <input value={defText} onChange={(e) => setDefText(e.target.value)} placeholder="Hiba leírása…" className="flex-1 h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-sky-500" />
                <select value={defSev} onChange={(e) => setDefSev(e.target.value)} className="h-8 px-1.5 rounded-lg border border-stone-200 text-[11.5px] bg-white"><option value="minor">Kisebb</option><option value="major">Súlyos</option></select>
                <button disabled={!defText.trim()} onClick={() => { window.sim.addShipmentDefect(live.id, { text: defText.trim(), sev: defSev }); setDefText(""); }} className="h-8 px-2.5 rounded-lg bg-stone-900 text-white text-[12px] disabled:opacity-40"><Icon name="plus" size={14} /></button>
              </div>
            </div>
            {/* jegyzőkönyv */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
              <div className="flex items-center gap-2 text-[12.5px] text-stone-700"><Icon name="file" size={16} className="text-stone-400" />Átadási jegyzőkönyv</div>
              {ho.protocol ? <span className="text-[11.5px] text-emerald-700 font-medium inline-flex items-center gap-1"><Icon name="check" size={13} />Elkészült</span>
                : <button onClick={() => window.sim.generateHandoverProtocol(live.id)} className="h-8 px-3 rounded-lg bg-sky-600 text-white text-[12px] font-medium">Jegyzőkönyv készítése</button>}
            </div>
          </div>
        </div>
      )}

      {/* napló */}
      {(live.log || []).length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Napló</div>
          <div className="space-y-1.5">
            {live.log.slice().reverse().map((l, i) => (
              <div key={i} className="flex items-start gap-2 text-[11.5px]"><span className="w-1.5 h-1.5 rounded-full bg-stone-300 mt-1.5 shrink-0" /><span className="text-stone-400 font-mono text-[10.5px] shrink-0">{l.at}</span><span className="text-stone-600">{l.text}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sofőr / szerelő terminál — mobil-első mai túra ───────────────
function DriverTerminal() {
  const sim = useSim();
  const [openId, setOpenId] = useStateL2(null);
  const [vehF, setVehF] = useStateL2("all");
  const vehicles = sim.vehicles || [];
  const isLive = (s) => !["atadva", "beerkezett", "kesz", "torolve"].includes(s.status);
  let tour = (sim.shipments || []).filter((s) => s.date === window.LOG_TODAY && isLive(s) && !s.delegatedTo);
  if (vehF !== "all") tour = tour.filter((s) => s.vehicleId === vehF);
  tour = tour.slice().sort((a, b) => (a.windowStart || "").localeCompare(b.windowStart || ""));

  return (
    <div className="max-w-[560px] mx-auto px-4 py-5 pb-24">
      <div className="mb-3">
        <h1 className="text-[20px] font-semibold tracking-tight text-stone-900">Mai túra</h1>
        <p className="text-[12.5px] text-stone-500 mt-0.5">{window.LOG_TODAY} · {tour.length} megálló</p>
      </div>

      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
        <button onClick={() => setVehF("all")} className={`shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${vehF === "all" ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200"}`}>Mind</button>
        {vehicles.map((v) => <button key={v.id} onClick={() => setVehF(v.id)} className={`shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${vehF === v.id ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200"}`}>{v.name}</button>)}
      </div>

      <div className="space-y-3">
        {tour.length ? tour.map((s, idx) => {
          const m = (window.LOG_TYPE_META || {})[s.type] || {};
          const next = window.LogEngine ? window.LogEngine.nextStates(s).filter((x) => x !== "reklamacio" && x !== "torolve" && x !== "tervezett") : [];
          const primary = next[0];
          const pl = primary ? (window.LOG_STATUS[primary] || {}).label : null;
          return (
            <div key={s.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
              <button onClick={() => setOpenId(s.id)} className="w-full text-left p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-900 text-white grid place-items-center text-[13px] font-semibold shrink-0">{idx + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap"><ShipTypeBadge type={s.type} size="sm" /><LogStatusPill status={s.status} size="sm" /></div>
                  <div className="text-[15px] font-semibold text-stone-900 mt-1.5">{s.customer}</div>
                  <div className="text-[12px] text-stone-500 flex items-center gap-1 mt-0.5"><Icon name="pin" size={13} />{s.address || "—"}</div>
                  <div className="text-[11.5px] text-stone-400 flex items-center gap-2 mt-1">
                    {s.windowStart && <span className="inline-flex items-center gap-1"><Icon name="clock" size={12} />{s.windowStart}–{s.windowEnd}</span>}
                    {s.phone && <span className="inline-flex items-center gap-1"><Icon name="phone" size={12} />{s.phone}</span>}
                  </div>
                </div>
              </button>
              <div className="flex border-t border-stone-100">
                {s.phone && <a href={`tel:${s.phone}`} className="flex-1 h-12 grid place-items-center text-[12.5px] font-medium text-stone-600 hover:bg-stone-50 border-r border-stone-100"><span className="inline-flex items-center gap-1.5"><Icon name="phone" size={15} />Hívás</span></a>}
                {primary
                  ? <button onClick={() => window.sim.setShipmentStatus(s.id, primary)} className="flex-1 h-12 grid place-items-center text-[12.5px] font-semibold text-white bg-sky-600 hover:bg-sky-700"><span className="inline-flex items-center gap-1.5">{pl}<Icon name="arrow-right" size={15} /></span></button>
                  : <button onClick={() => setOpenId(s.id)} className="flex-1 h-12 grid place-items-center text-[12.5px] font-medium text-stone-600 hover:bg-stone-50">Részletek</button>}
              </div>
            </div>
          );
        }) : <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-12 text-center text-[13px] text-stone-400">Ma nincs több megálló. 🎉</div>}
      </div>

      {window.ShipDetailHost && <window.ShipDetailHost openId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

// ── Erőforrások — járművek + brigádok ────────────────────────────
function ResourcesPanel() {
  const sim = useSim();
  const vehicles = sim.vehicles || [];
  const crews = sim.crews || [];
  const facilities = window.FACILITIES || [];
  const facName = (id) => (facilities.find((f) => f.id === id) || {}).name || "—";
  const [addVeh, setAddVeh] = useStateL2(false);
  const [addCrew, setAddCrew] = useStateL2(false);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900 mb-4">Erőforrások</h1>

      <div className="grid md:grid-cols-2 gap-4">
        {/* járművek */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-stone-800 inline-flex items-center gap-1.5"><Icon name="truck" size={15} />Járművek</span>
            <button onClick={() => setAddVeh((v) => !v)} className="text-[11.5px] text-sky-700 font-medium inline-flex items-center gap-1"><Icon name="plus" size={13} />Új</button>
          </div>
          {addVeh && <VehicleForm onClose={() => setAddVeh(false)} />}
          {vehicles.map((v) => (
            <div key={v.id} className="px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 grid place-items-center"><Icon name="truck" size={17} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-stone-900">{v.name} <span className="font-mono text-[11px] text-stone-400">{v.plate}</span></div>
                <div className="text-[11px] text-stone-500">{v.type} · {v.capacityM3} m³ · {logHuf(v.capacityKg)} kg · {facName(v.facilityId)}</div>
              </div>
              <button onClick={() => window.sim.removeVehicle(v.id)} className="text-stone-300 hover:text-rose-500"><Icon name="x" size={15} /></button>
            </div>
          ))}
        </div>

        {/* brigádok */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-stone-800 inline-flex items-center gap-1.5"><Icon name="user" size={15} />Brigádok</span>
            <button onClick={() => setAddCrew((v) => !v)} className="text-[11.5px] text-sky-700 font-medium inline-flex items-center gap-1"><Icon name="plus" size={13} />Új</button>
          </div>
          {addCrew && <CrewForm onClose={() => setAddCrew(false)} />}
          {crews.map((c) => (
            <div key={c.id} className="px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 grid place-items-center"><Icon name="user" size={17} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-stone-900">{c.name}</div>
                <div className="text-[11px] text-stone-500">{(c.members || []).join(", ")}</div>
                <div className="flex items-center gap-1 mt-1">{(c.skills || []).map((sk) => { const m = (window.CREW_SKILLS || {})[sk] || {}; return <span key={sk} className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200"><Icon name={m.icon || "wrench"} size={9} />{m.label || sk}</span>; })}</div>
              </div>
              <button onClick={() => window.sim.removeCrew(c.id)} className="text-stone-300 hover:text-rose-500"><Icon name="x" size={15} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VehicleForm({ onClose }) {
  const [name, setName] = useStateL2(""); const [plate, setPlate] = useStateL2(""); const [type, setType] = useStateL2("Furgon");
  const [m3, setM3] = useStateL2("12"); const [kg, setKg] = useStateL2("1200");
  const facilities = window.FACILITIES || [];
  const [fac, setFac] = useStateL2(facilities[0] ? facilities[0].id : "");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-sky-500";
  const save = () => { if (!name.trim()) return; window.sim.addVehicle({ name: name.trim(), plate: plate.trim(), type, capacityM3: Number(m3) || 0, capacityKg: Number(kg) || 0, facilityId: fac }); onClose(); };
  return (
    <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/60 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Megnevezés" className={cls} />
        <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="Rendszám" className={cls} />
        <input value={type} onChange={(e) => setType(e.target.value)} placeholder="Típus" className={cls} />
        <select value={fac} onChange={(e) => setFac(e.target.value)} className={cls}>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        <input value={m3} onChange={(e) => setM3(e.target.value)} placeholder="m³" type="number" className={cls} />
        <input value={kg} onChange={(e) => setKg(e.target.value)} placeholder="kg" type="number" className={cls} />
      </div>
      <div className="flex items-center gap-2"><button onClick={save} className="h-8 px-3 rounded-lg bg-sky-600 text-white text-[12px] font-medium">Hozzáadás</button><button onClick={onClose} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button></div>
    </div>
  );
}

function CrewForm({ onClose }) {
  const [name, setName] = useStateL2(""); const [members, setMembers] = useStateL2(""); const [skills, setSkills] = useStateL2(["szallit", "szerel"]);
  const facilities = window.FACILITIES || [];
  const [fac, setFac] = useStateL2(facilities[0] ? facilities[0].id : "");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-sky-500";
  const toggleSkill = (k) => setSkills((xs) => xs.includes(k) ? xs.filter((s) => s !== k) : [...xs, k]);
  const save = () => { if (!name.trim()) return; window.sim.addCrew({ name: name.trim(), members: members.split(",").map((s) => s.trim()).filter(Boolean), skills, facilityId: fac }); onClose(); };
  return (
    <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/60 space-y-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Brigád neve" className={cls} />
      <input value={members} onChange={(e) => setMembers(e.target.value)} placeholder="Tagok (vesszővel)" className={cls} />
      <select value={fac} onChange={(e) => setFac(e.target.value)} className={cls}>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
      <div className="flex items-center gap-1.5">{Object.keys(window.CREW_SKILLS || {}).map((k) => { const m = window.CREW_SKILLS[k]; const on = skills.includes(k); return <button key={k} onClick={() => toggleSkill(k)} className={`inline-flex items-center gap-1 px-2 h-7 rounded-full text-[11px] font-medium border ${on ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-white text-stone-500 border-stone-200"}`}><Icon name={m.icon} size={11} />{m.label}</button>; })}</div>
      <div className="flex items-center gap-2"><button onClick={save} className="h-8 px-3 rounded-lg bg-sky-600 text-white text-[12px] font-medium">Hozzáadás</button><button onClick={onClose} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button></div>
    </div>
  );
}

// ── Új fuvar sheet (belépési pontokkal) ──────────────────────────
function NewShipmentSheet({ onClose, onCreated, defaultType }) {
  const sim = useSim();
  const [type, setType] = useStateL2(defaultType || "delivery");
  const [install, setInstall] = useStateL2(true);
  const [source, setSource] = useStateL2("");      // ref id of order/project/po, or "manual"
  const [customer, setCustomer] = useStateL2("");
  const [address, setAddress] = useStateL2("");
  const [date, setDate] = useStateL2("");
  const [note, setNote] = useStateL2("");

  // belépési pont jelöltek
  const orders = (sim.orders || []).filter((o) => ["ready", "released", "calc", "delivered"].includes(o.status) && !(sim.shipments || []).some((s) => s.ref === o.id));
  const projects = (sim.projects || []).filter((p) => ["active", "install"].includes(p.status));
  const pos = (sim.pos || []).filter((p) => p.status === "running" && !(sim.shipments || []).some((s) => s.ref === p.id));

  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-sky-500";
  const create = () => {
    let id;
    if (type === "delivery" && source && source.startsWith("ord:")) id = window.sim.createDeliveryFromOrder(source.slice(4), { install });
    else if (type === "delivery" && source && source.startsWith("prj:")) id = window.sim.createDeliveryFromProject(source.slice(4));
    else if (type === "pickup" && source && source.startsWith("po:")) id = window.sim.createPickupFromPO(source.slice(3));
    else id = window.sim.createShipment({ type, install, customer: customer.trim(), address: address.trim(), note: note.trim() });
    if (id && date) window.sim.scheduleShipment(id, { date });
    if (id && onCreated) onCreated(id);
  };
  const canSave = (type === "delivery" && source.startsWith("ord:")) || (type === "delivery" && source.startsWith("prj:")) || (type === "pickup" && source.startsWith("po:")) || customer.trim();

  const TypeBtn = ({ k }) => { const m = window.LOG_TYPE_META[k]; const on = type === k; return (
    <button onClick={() => { setType(k); setSource(""); }} className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border ${on ? "border-sky-500 bg-sky-50" : "border-stone-200 bg-white"}`}>
      <Icon name={m.icon} size={18} className={on ? "text-sky-700" : "text-stone-400"} /><span className={`text-[11.5px] font-medium ${on ? "text-sky-800" : "text-stone-600"}`}>{m.label}</span>
    </button>
  ); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[520px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between">
          <div className="text-[14px] font-semibold text-stone-900">Új fuvar</div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center gap-2">{(window.LOG_TYPE_ORDER || []).map((k) => <TypeBtn key={k} k={k} />)}</div>

          {type === "delivery" && (
            <label className="flex items-center gap-2 text-[12.5px] text-stone-700"><input type="checkbox" checked={install} onChange={(e) => setInstall(e.target.checked)} />Helyszíni telepítés / beszerelés is</label>
          )}

          {/* belépési pontok */}
          {type === "delivery" && (
            <div>
              <label className="text-[10.5px] text-stone-500 block mb-1">Forrás — kész rendelés vagy projekt</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={cls}>
                <option value="">— kézi (új ügyfél) —</option>
                <optgroup label="Rendelések (gyártásra kész)">{orders.map((o) => <option key={o.id} value={"ord:" + o.id}>{o.id} · {o.customer}</option>)}</optgroup>
                <optgroup label="Projektek (beépítés)">{projects.map((p) => <option key={p.id} value={"prj:" + p.id}>{p.name} · {p.customer}</option>)}</optgroup>
              </select>
            </div>
          )}
          {type === "pickup" && (
            <div>
              <label className="text-[10.5px] text-stone-500 block mb-1">Forrás — futó beszerzési megrendelés</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={cls}>
                <option value="">— kézi (új beszállító) —</option>
                {pos.map((p) => <option key={p.id} value={"po:" + p.id}>{p.id} · {p.supplier} · {p.material}</option>)}
              </select>
            </div>
          )}

          {/* kézi mezők, ha nincs forrás */}
          {(!source) && (
            <div className="grid grid-cols-1 gap-2">
              <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder={type === "pickup" ? "Beszállító neve" : "Ügyfél neve"} className={cls} />
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Cím" className={cls} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Tervezett dátum (opcionális)</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cls} /></div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Megjegyzés (pl. lift, daru, parkolás)…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-sky-500" />
          </div>

          <button disabled={!canSave} onClick={create} className="w-full h-10 rounded-xl bg-sky-600 text-white text-[13px] font-semibold disabled:opacity-40">Fuvar létrehozása</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ShipmentDetail, DriverTerminal, ResourcesPanel, VehicleForm, CrewForm, NewShipmentSheet,
});
