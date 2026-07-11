// ─────────────────────────────────────────────────────────────────
// page-maintenance-2.jsx — KARBANTARTÁS világ (2/2)
//   AssetDetail (eszköz-kártya: adatok + megelőző tervek + munkalap-előzmény +
//   állásidő), WoDetail (munkalap: FSM + ütemezés + alkatrész + kiadás +
//   Kontrolling), MaintSchedule (eszköz-soros ütemterv), DowntimeLog, sheetek.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateM2 } = React;

const m2cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-cyan-500";
const m2facName = (id) => ((window.FACILITIES || []).find((f) => f.id === id) || {}).name || "—";

// ── Faipari gép-paraméterek (szabász max tábla / élzáró min. szélesség) ──
//   Gép-szintű, BESZERZÉSKOR/tapasztalatból rögzített érték (nem munkánként
//   változik). A Gyártás-előkészítés Szabászat füle innen olvassa (wwMachineLimit).
function AssetCutLimits({ asset, canManage }) {
  const machine = (window.PROD_STATIONS || []).find((m) => m.id === asset.machineId);
  const mkind = machine ? machine.kind : null;
  const lim = window.wwMachineLimit ? window.wwMachineLimit(asset.machineId) : (asset.cutLimits || {});
  const [maxW, setMaxW] = useStateM2(lim.maxW || "");
  const [maxH, setMaxH] = useStateM2(lim.maxH || "");
  const [minW, setMinW] = useStateM2(lim.minPartW || "");
  const isEdge = mkind === "elzaras";
  const isSaw = mkind === "szabaszat" || mkind === "cnc";
  if (!isEdge && !isSaw) return null;
  const dirty = isSaw ? (Number(maxW) !== (lim.maxW || 0) || Number(maxH) !== (lim.maxH || 0)) : (Number(minW) !== (lim.minPartW || 0));
  const save = () => {
    const cur = asset.cutLimits || {};
    const patch = isSaw ? { ...cur, maxW: Number(maxW) || 0, maxH: Number(maxH) || 0 } : { ...cur, minPartW: Number(minW) || 0 };
    window.sim.updateAsset(asset.id, { cutLimits: patch });
  };
  const inCls = "w-full h-8 px-2 rounded-lg border border-stone-200 text-[12px] text-right tabular-nums outline-none focus:border-cyan-400 disabled:bg-stone-50 disabled:text-stone-400";
  return (
    <div className="rounded-xl border border-cyan-200 bg-cyan-50/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wide text-cyan-700/80 font-medium">Faipari gép-paraméterek {isSaw ? "(szabászat)" : "(élzárás)"}</span>
        {canManage && dirty && <button onClick={save} className="h-7 px-2.5 rounded-lg bg-cyan-600 text-white text-[11px] font-medium inline-flex items-center gap-1"><Icon name="check" size={12} />Mentés</button>}
      </div>
      <div className="flex flex-wrap gap-2">
        {isSaw && (
          <label className="flex-1 min-w-[110px]">
            <div className="text-[10px] text-stone-400 mb-1">Max. tábla szélesség</div>
            <div className="flex items-center gap-1"><input type="number" min="0" value={maxW} disabled={!canManage} onChange={(e) => setMaxW(e.target.value)} className={inCls} /><span className="text-stone-400 text-[11px] shrink-0">mm</span></div>
          </label>
        )}
        {isSaw && (
          <label className="flex-1 min-w-[110px]">
            <div className="text-[10px] text-stone-400 mb-1">Max. tábla hossz</div>
            <div className="flex items-center gap-1"><input type="number" min="0" value={maxH} disabled={!canManage} onChange={(e) => setMaxH(e.target.value)} className={inCls} /><span className="text-stone-400 text-[11px] shrink-0">mm</span></div>
          </label>
        )}
        {isEdge && (
          <label className="flex-1 min-w-[150px]">
            <div className="text-[10px] text-stone-400 mb-1">Min. munkadarab-szélesség (VV-küszöb)</div>
            <div className="flex items-center gap-1"><input type="number" min="0" value={minW} disabled={!canManage} onChange={(e) => setMinW(e.target.value)} className={inCls} /><span className="text-stone-400 text-[11px] shrink-0">mm</span></div>
          </label>
        )}
      </div>
      <div className="text-[10.5px] text-stone-500/80 mt-2">Beszerzéskor / tapasztalatból rögzített, gép-szintű érték — a Gyártás-előkészítés Szabászat füle innen olvassa ({isSaw ? "méret-túllépés ellenőrzés" : "VV-összerakás küszöb"}). Nem munkánként változik.</div>
    </div>
  );
}

// ── Eszköz-kártya (SlideOver tartalom) ───────────────────────────
function AssetDetail({ asset }) {
  const sim = useSim();
  const st = window.sim.assetStatus(asset.id);
  const canManage = window.sim.hasPerm("maintenance.manage");
  const plans = window.sim.maintPlansForAsset(asset.id);
  const wos = window.sim.workOrdersForAsset(asset.id).slice().sort((a, b) => (b.reportedAt || "").localeCompare(a.reportedAt || ""));
  const dts = window.sim.downtimeForAsset(asset.id);
  const [openWo, setOpenWo] = useStateM2(null);
  const [addPlan, setAddPlan] = useStateM2(false);
  const KIND = window.ASSET_KINDS[asset.kind] || {};

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      {/* fej */}
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-2xl grid place-items-center shrink-0" style={{ background: KIND.accent + "1a", color: KIND.accent }}><Icon name={KIND.icon || "box"} size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-stone-900 truncate">{asset.name}</div>
          <div className="text-[12px] text-stone-500">{asset.code} · {KIND.label}</div>
        </div>
        <window.AssetStatusPill status={st} />
      </div>

      {/* adatok */}
      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <div className="rounded-lg border border-stone-200 px-3 py-2"><div className="text-[10px] text-stone-400">Telephely / hely</div><div className="text-stone-800 font-medium truncate">{m2facName(asset.facilityId)}{asset.location ? " · " + asset.location : ""}</div></div>
        <div className="rounded-lg border border-stone-200 px-3 py-2"><div className="text-[10px] text-stone-400">Gyártó / modell</div><div className="text-stone-800 font-medium truncate">{asset.vendor || "—"}{asset.model ? " " + asset.model : ""}</div></div>
        {asset.serial && <div className="rounded-lg border border-stone-200 px-3 py-2"><div className="text-[10px] text-stone-400">Gyári szám</div><div className="text-stone-700 font-mono truncate">{asset.serial}</div></div>}
        {asset.purchasedAt && <div className="rounded-lg border border-stone-200 px-3 py-2"><div className="text-[10px] text-stone-400">Beszerzés</div><div className="text-stone-800 font-medium">{asset.purchasedAt}</div></div>}
        {asset.value > 0 && <div className="rounded-lg border border-stone-200 px-3 py-2"><div className="text-[10px] text-stone-400">Könyv szerinti érték</div><div className="text-stone-800 font-medium">{window.mntHuf(asset.value)}</div></div>}
        {asset.operatingHours > 0 && <div className="rounded-lg border border-stone-200 px-3 py-2"><div className="text-[10px] text-stone-400">Üzemóra</div><div className="text-stone-800 font-medium">{asset.operatingHours.toLocaleString("hu-HU")} üó</div></div>}
        {asset.odometer && <div className="rounded-lg border border-stone-200 px-3 py-2"><div className="text-[10px] text-stone-400">Km óra</div><div className="text-stone-800 font-medium">{asset.odometer.toLocaleString("hu-HU")} km</div></div>}
        {asset.machineId && <div className="rounded-lg border border-cyan-200 bg-cyan-50/50 px-3 py-2 col-span-2"><div className="text-[10px] text-cyan-600">Shop Floor gép</div><div className="text-cyan-800 font-medium">{asset.machineId} — a Gyártás innen olvassa az üzemállapotot</div></div>}
      </div>
      {asset.note && <div className="text-[11.5px] text-stone-500">{asset.note}</div>}

      {/* faipari gép-paraméterek — csak Shop Floor-hoz kötött gépeknél */}
      {asset.machineId && <AssetCutLimits asset={asset} canManage={canManage} />}

      {/* megelőző tervek */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Megelőző tervek</span>
          {canManage && <button onClick={() => setAddPlan((v) => !v)} className="text-[11.5px] text-cyan-700 font-medium inline-flex items-center gap-1"><Icon name="plus" size={13} />Terv</button>}
        </div>
        {addPlan && <AddPlanForm assetId={asset.id} onClose={() => setAddPlan(false)} />}
        {plans.length ? <div className="space-y-1.5">{plans.map((p) => {
          const due = window.MaintEngine.planDue(p, asset, window.MNT_TODAY);
          return (
            <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200">
              <span className="w-7 h-7 rounded-md grid place-items-center shrink-0" style={{ background: (window.WO_TYPE[p.kind] || {}).accent + "1a", color: (window.WO_TYPE[p.kind] || {}).accent }}><Icon name={(window.WO_TYPE[p.kind] || {}).icon || "shield"} size={13} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-stone-800 truncate">{p.label}</div>
                <div className="text-[10.5px] text-stone-400 truncate">{p.trigger === "hours" ? `${p.intervalHours} üó` : `${p.intervalDays} naponta`} · {p.assigneeType === "external" ? (p.partnerName || "külsős") : window.sim.employeeName(p.assigneeEmpId)} · <window.PlanDueBadge due={due} /></div>
              </div>
              {canManage && <button onClick={() => setOpenWo(window.sim.createWorkOrderFromPlan(p.id))} className="h-7 px-2 rounded-lg bg-cyan-600 text-white text-[10.5px] font-medium shrink-0">Munkalap</button>}
              {canManage && <button onClick={() => window.sim.removeMaintPlan(p.id)} className="text-stone-300 hover:text-rose-500 shrink-0"><Icon name="x" size={14} /></button>}
            </div>
          );
        })}</div> : <div className="text-[12px] text-stone-400">Nincs megelőző terv.</div>}
      </div>

      {/* munkalap-előzmény */}
      <div>
        <span className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Munkalap-előzmény</span>
        {wos.length ? <div className="space-y-1.5 mt-2">{wos.map((w) => (
          <button key={w.id} onClick={() => setOpenWo(w.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50/60 text-left">
            <div className="min-w-0 flex-1"><div className="text-[12px] font-medium text-stone-800 truncate">{w.title}</div><div className="text-[10.5px] text-stone-400">{w.id} · {w.reportedAt}{w.cost ? " · " + window.mntHuf(w.cost) : ""}</div></div>
            <window.WoStatusPill status={w.status} size="sm" />
          </button>
        ))}</div> : <div className="text-[12px] text-stone-400 mt-2">Nincs munkalap.</div>}
      </div>

      {/* állásidő */}
      {dts.length > 0 && (
        <div>
          <span className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Állásidő-előzmény</span>
          <div className="space-y-1 mt-2">{dts.map((d) => (
            <div key={d.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 text-[11.5px]">
              <span className={`w-1.5 h-1.5 rounded-full ${d.end ? "bg-stone-300" : d.planned ? "bg-amber-500" : "bg-rose-500"}`} />
              <span className="flex-1 truncate text-stone-700">{d.reason}</span>
              <span className="text-stone-400">{d.hours} ó{!d.end ? " · folyamatban" : ""}</span>
            </div>
          ))}</div>
        </div>
      )}

      {canManage && st !== "selejtezve" && <div className="pt-1"><button onClick={() => { if (confirm("Biztosan selejtezed az eszközt?")) window.sim.retireAsset(asset.id); }} className="text-[11.5px] text-rose-500 font-medium inline-flex items-center gap-1"><Icon name="archive" size={13} />Eszköz selejtezése</button></div>}

      <window.WoDetailHost openId={openWo} onClose={() => setOpenWo(null)} />
    </div>
  );
}

function AddPlanForm({ assetId, onClose }) {
  const sim = useSim();
  const [label, setLabel] = useStateM2("");
  const [kind, setKind] = useStateM2("preventiv");
  const [trigger, setTrigger] = useStateM2("interval");
  const [intervalDays, setDays] = useStateM2("90");
  const [intervalHours, setHours] = useStateM2("500");
  const [assigneeType, setAType] = useStateM2("internal");
  const [assigneeEmpId, setEmp] = useStateM2(window.sim.employeeList()[0]?.id || "");
  const [partnerName, setPartner] = useStateM2("");
  const [estHours, setEst] = useStateM2("2");
  const save = () => {
    if (!label.trim()) return;
    window.sim.addMaintPlan({ assetId, label, kind, trigger, intervalDays, intervalHours, assigneeType, assigneeEmpId: assigneeType === "internal" ? assigneeEmpId : null, partnerName: assigneeType === "external" ? partnerName : null, estHours, lastDone: window.MNT_TODAY, lastDoneHours: 0 });
    onClose();
  };
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 space-y-2 mb-2">
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Terv megnevezése" className={m2cls} />
      <div className="grid grid-cols-2 gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={m2cls}><option value="preventiv">Megelőző</option><option value="takaritas">Takarítás</option></select>
        <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className={m2cls}><option value="interval">Időköz (nap)</option><option value="hours">Üzemóra</option></select>
        {trigger === "interval" ? <input type="number" value={intervalDays} onChange={(e) => setDays(e.target.value)} placeholder="naponta" className={m2cls} /> : <input type="number" value={intervalHours} onChange={(e) => setHours(e.target.value)} placeholder="üzemóra" className={m2cls} />}
        <input type="number" value={estHours} onChange={(e) => setEst(e.target.value)} placeholder="becsült óra" className={m2cls} />
        <select value={assigneeType} onChange={(e) => setAType(e.target.value)} className={m2cls}><option value="internal">Belső szerelő</option><option value="external">Külső / partner</option></select>
        {assigneeType === "internal"
          ? <select value={assigneeEmpId} onChange={(e) => setEmp(e.target.value)} className={m2cls}>{window.sim.employeeList().map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          : <input value={partnerName} onChange={(e) => setPartner(e.target.value)} placeholder="Partner neve" className={m2cls} />}
      </div>
      <div className="flex items-center gap-2"><button onClick={save} className="h-8 px-3 rounded-lg bg-cyan-600 text-white text-[12px] font-medium">Hozzáad</button><button onClick={onClose} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button></div>
    </div>
  );
}

// ── Munkalap-detail (FSM + ütemezés + alkatrész + kiadás + Kontrolling) ──────
function WoDetail({ wo }) {
  const sim = useSim();
  const asset = window.sim.findAsset(wo.assetId);
  const canManage = window.sim.hasPerm("maintenance.manage");
  const nexts = window.MaintEngine.woNext(wo);
  const sla = window.MaintEngine.woSla(wo, window.MNT_TODAY);
  const [sched, setSched] = useStateM2(false);
  const partners = (sim.partners || []).filter((p) => p.platform);
  const projects = (sim.projects || []).filter((p) => p.status !== "draft");
  const rate = window.sim.woRate(wo);
  const cost = window.sim.woCost(wo);

  const doTransition = (to) => {
    if (to === "elutasitva" || to === "halasztva") { const r = prompt((window.WO_STATUS[to] || {}).label + " indoka:"); if (r && r.trim()) window.sim.setWorkOrderStatus(wo.id, to, { reason: r }); }
    else window.sim.setWorkOrderStatus(wo.id, to);
  };

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="flex items-center gap-2 flex-wrap">
        <window.WoTypeBadge kind={wo.kind} />
        <window.WoPriorityPill priority={wo.priority} size="sm" />
        <window.WoStatusPill status={wo.status} size="sm" />
        {wo.breakdown && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">géptörés</span>}
        {!sla.done && <span className={`text-[10.5px] font-medium ${sla.overdue ? "text-rose-600" : "text-stone-400"}`}>{sla.overdue ? `SLA ${Math.abs(sla.daysLeft)} napja lejárt` : `SLA: ${sla.daysLeft} nap`}</span>}
      </div>

      <div>
        <div className="text-[14px] font-semibold text-stone-900">{wo.title}</div>
        {asset && <div className="text-[12px] text-stone-500">{asset.name} · {asset.code}</div>}
        {wo.desc && <div className="text-[12px] text-stone-600 mt-2">{wo.desc}</div>}
      </div>

      {/* FSM gombok */}
      {nexts.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {nexts.map((to) => {
            const m = window.WO_STATUS[to];
            return <button key={to} disabled={!canManage} onClick={() => doTransition(to)} title={!canManage ? "Karbantartás-jog szükséges (maintenance.manage)" : ""}
              className={`h-8 px-3 rounded-lg text-[12px] font-medium border inline-flex items-center gap-1 ${!canManage ? "bg-stone-50 text-stone-300 border-stone-200 cursor-not-allowed" : to === "elutasitva" ? "bg-white text-rose-600 border-rose-200" : to === "kesz" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"}`}>
              {!canManage && <Icon name="lock" size={11} />}→ {m.label}</button>;
          })}
        </div>
      )}

      {/* ütemezés */}
      <div className="rounded-xl border border-stone-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold text-stone-800">Ütemezés / felelős</span>
          {canManage && <button onClick={() => setSched((v) => !v)} className="text-[11.5px] text-cyan-700 font-medium">{sched ? "Bezár" : "Szerkeszt"}</button>}
        </div>
        {sched ? <WoScheduleForm wo={wo} onClose={() => setSched(false)} /> : (
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div><div className="text-[10px] text-stone-400">Ütemezett dátum</div><div className="text-stone-800 font-medium">{wo.scheduledDate || "—"}</div></div>
            <div><div className="text-[10px] text-stone-400">Becsült munka</div><div className="text-stone-800 font-medium">{wo.estHours} ó · {window.mntHuf(rate)}/ó</div></div>
            <div className="col-span-2"><div className="text-[10px] text-stone-400">Felelős</div><div className="text-stone-800 font-medium">{wo.assigneeType === "external" ? (wo.delegatedTo || wo.partnerName || "külső szerviz") : window.sim.employeeName(wo.assigneeEmpId)}{wo.assigneeType === "internal" && <span className="text-[10px] text-cyan-600"> · HR-kapacitásba kötve</span>}</div></div>
          </div>
        )}
      </div>

      {/* alkatrész */}
      {(wo.parts || []).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Alkatrész</span>
            {canManage && !wo.partsRequested && <button onClick={() => window.sim.woRequestParts(wo.id)} className="text-[11.5px] text-cyan-700 font-medium inline-flex items-center gap-1"><Icon name="procurement" size={13} />Igény → Beszerzés</button>}
            {wo.partsRequested && <span className="text-[10.5px] text-emerald-600 font-medium inline-flex items-center gap-1"><Icon name="check" size={12} />Igényelve</span>}
          </div>
          <div className="space-y-1">{wo.parts.map((p, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 text-[12px]"><span className="flex-1 text-stone-700">{p.label}</span><span className="text-stone-400">{p.qty} {p.unit || "db"}</span></div>
          ))}</div>
        </div>
      )}

      {/* költség + Kontrolling */}
      <div className="rounded-xl border border-stone-200 p-3 flex items-center justify-between">
        <div><div className="text-[10px] text-stone-400">Karbantartási költség (munka)</div><div className="text-[14px] font-semibold text-stone-900">{window.mntHuf(cost)}</div></div>
        {wo.projectId ? (wo.pushedToCtrl ? <span className="text-[10.5px] text-emerald-600 font-medium inline-flex items-center gap-1"><Icon name="check" size={12} />Kontrollingban</span> : canManage && <button onClick={() => window.sim.pushWorkOrderToCtrl(wo.id)} className="h-8 px-2.5 rounded-lg bg-slate-700 text-white text-[11px] font-medium">→ Kontrolling</button>) : <span className="text-[10px] text-stone-400 text-right">nincs projekt<br/>(általános rezsi)</span>}
      </div>

      {/* kiadás külső partnernek */}
      {canManage && wo.assigneeType !== "external" && !["kesz", "elutasitva"].includes(wo.status) && (
        <div>
          <span className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Kiadás külső szerviznek (B2B)</span>
          <div className="flex items-center gap-2 mt-1.5">
            <select id={"deleg-" + wo.id} className={m2cls}><option value="">Partner választása…</option>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <button onClick={() => { const v = document.getElementById("deleg-" + wo.id).value; if (v) window.sim.delegateWorkOrder(wo.id, v); }} className="h-9 px-3 rounded-lg border border-stone-200 text-stone-700 text-[12px] font-medium shrink-0">Kiad</button>
          </div>
        </div>
      )}
      {wo.delegatedTo && canManage && <button onClick={() => window.sim.recallWorkOrder(wo.id)} className="text-[11.5px] text-stone-500 font-medium">Kiadás visszavonása ({wo.delegatedTo})</button>}

      {/* projekt-hozzárendelés (opcionális, Kontrolling-bekötéshez) */}
      {canManage && !wo.projectId && !["kesz", "elutasitva"].includes(wo.status) && (
        <div>
          <span className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Projekthez kötés (Kontrolling tény)</span>
          <select onChange={(e) => { if (e.target.value) window.sim.setWorkOrderProject(wo.id, e.target.value); }} className={m2cls + " mt-1.5"} defaultValue="">
            <option value="" disabled>— projekt választása —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {/* napló */}
      <div>
        <span className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Napló</span>
        <div className="space-y-1 mt-2">{(wo.log || []).map((l, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px]"><span className="text-stone-400 font-mono shrink-0 w-[88px]">{l.at}</span><span className="text-stone-600">{l.text}</span></div>
        ))}</div>
      </div>
    </div>
  );
}

function WoScheduleForm({ wo, onClose }) {
  const sim = useSim();
  const [date, setDate] = useStateM2(wo.scheduledDate || window.MNT_TODAY);
  const [assigneeType, setAType] = useStateM2(wo.assigneeType || "internal");
  const [assigneeEmpId, setEmp] = useStateM2(wo.assigneeEmpId || window.sim.employeeList()[0]?.id || "");
  const [partnerName, setPartner] = useStateM2(wo.partnerName || "");
  const [estHours, setEst] = useStateM2(String(wo.estHours || 2));
  const save = () => {
    window.sim.scheduleWorkOrder(wo.id, { scheduledDate: date, assigneeType, assigneeEmpId: assigneeType === "internal" ? assigneeEmpId : null, partnerName: assigneeType === "external" ? partnerName : null, estHours: Number(estHours) || 2 });
    onClose();
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div><label className="text-[9.5px] text-stone-400">Dátum</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={m2cls} /></div>
        <div><label className="text-[9.5px] text-stone-400">Becsült óra</label><input type="number" value={estHours} onChange={(e) => setEst(e.target.value)} className={m2cls} /></div>
        <select value={assigneeType} onChange={(e) => setAType(e.target.value)} className={m2cls}><option value="internal">Belső szerelő</option><option value="external">Külső / partner</option></select>
        {assigneeType === "internal"
          ? <select value={assigneeEmpId} onChange={(e) => setEmp(e.target.value)} className={m2cls}>{window.sim.employeeList().map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          : <input value={partnerName} onChange={(e) => setPartner(e.target.value)} placeholder="Partner neve" className={m2cls} />}
      </div>
      {assigneeType === "internal" && <div className="text-[10px] text-cyan-600">A belső szerelő ütemezése a HR kapacitás-naptárba is bekerül.</div>}
      <div className="flex items-center gap-2"><button onClick={save} className="h-8 px-3 rounded-lg bg-cyan-600 text-white text-[12px] font-medium">Mentés</button><button onClick={onClose} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button></div>
    </div>
  );
}

// ── Ütemterv — eszköz-soros 2 hetes rács ─────────────────────────
function MaintSchedule() {
  const sim = useSim();
  const [openWo, setOpenWo] = useStateM2(null);
  const E = window.MaintEngine;
  const start = E.parse(window.MNT_TODAY);
  const days = [];
  for (let i = 0; i < 14; i++) days.push(new Date(start.getTime() + i * 86400000));
  const DOW = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];
  // eszközök, amelyeknek van ütemezett munkalapja
  const scheduled = (sim.workOrders || []).filter((w) => w.scheduledDate && !["kesz", "elutasitva"].includes(w.status));
  const assetIds = [...new Set(scheduled.map((w) => w.assetId))];
  const assets = assetIds.map((id) => window.sim.findAsset(id)).filter(Boolean);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">
      <div className="mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Ütemterv</h1>
        <p className="text-[12.5px] text-stone-500 mt-0.5">2 hét · az ütemezett munkalapok eszközönként</p>
      </div>

      {assets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs ütemezett munkalap a következő 2 hétben.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto"><div className="min-w-[940px]">
            <div className="grid border-b border-stone-100 bg-stone-50/60" style={{ gridTemplateColumns: "190px repeat(14, 1fr)" }}>
              <div className="px-3 py-2 text-[10px] uppercase tracking-wide text-stone-400 font-medium">Eszköz</div>
              {days.map((d, i) => { const isToday = E.fmt(d) === window.MNT_TODAY; const wknd = d.getDay() === 0 || d.getDay() === 6; return (
                <div key={i} className={`px-1 py-2 text-center border-l border-stone-100 ${isToday ? "bg-cyan-50" : wknd ? "bg-stone-50" : ""}`}>
                  <div className="text-[9px] text-stone-400">{DOW[d.getDay()]}</div>
                  <div className={`text-[10px] font-mono ${isToday ? "text-cyan-700 font-semibold" : "text-stone-500"}`}>{d.getMonth() + 1}.{d.getDate()}</div>
                </div>
              ); })}
            </div>
            {assets.map((a) => (
              <div key={a.id} className="grid border-b border-stone-100 last:border-0" style={{ gridTemplateColumns: "190px repeat(14, 1fr)" }}>
                <div className="px-3 py-2 min-w-0 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md grid place-items-center shrink-0" style={{ background: (window.ASSET_KINDS[a.kind] || {}).accent + "1a", color: (window.ASSET_KINDS[a.kind] || {}).accent }}><Icon name={(window.ASSET_KINDS[a.kind] || {}).icon || "box"} size={12} /></span>
                  <div className="min-w-0"><div className="text-[11.5px] font-semibold text-stone-800 truncate">{a.name}</div></div>
                </div>
                {days.map((d, i) => {
                  const ds = E.fmt(d);
                  const cell = scheduled.filter((w) => w.assetId === a.id && w.scheduledDate === ds);
                  return (
                    <div key={i} className="border-l border-stone-100 p-0.5 space-y-0.5 min-h-[40px]">
                      {cell.map((w) => { const m = window.WO_TYPE[w.kind] || {}; return (
                        <button key={w.id} onClick={() => setOpenWo(w.id)} title={w.title} className="w-full text-left rounded px-1 py-0.5 text-[9px] leading-tight truncate border" style={{ background: m.accent + "14", color: m.accent, borderColor: m.accent + "33" }}>
                          <span className="font-semibold">{m.short}</span> {w.title.split(" ")[0]}
                        </button>
                      ); })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div></div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap mt-3 text-[11px] text-stone-500">
        {(window.WO_TYPE_ORDER || []).map((t) => { const m = window.WO_TYPE[t]; return <span key={t} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: m.accent }} />{m.label}</span>; })}
      </div>

      <window.WoDetailHost openId={openWo} onClose={() => setOpenWo(null)} />
    </div>
  );
}

// ── Állásidő-napló ───────────────────────────────────────────────
function DowntimeLog() {
  const sim = useSim();
  const [openWo, setOpenWo] = useStateM2(null);
  const list = (sim.downtime || []).slice().sort((a, b) => (a.end ? 1 : 0) - (b.end ? 1 : 0) || (b.start || "").localeCompare(a.start || ""));
  const openHours = list.filter((d) => !d.end).reduce((a, d) => a + (Number(d.hours) || 0), 0);
  const totalHours = list.reduce((a, d) => a + (Number(d.hours) || 0), 0);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Állásidő-napló</h1>
        <p className="text-[12.5px] text-stone-500 mt-0.5">Folyamatban: {Math.round(openHours)} ó · összes regisztrált: {Math.round(totalHours)} ó</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {list.length ? list.map((d) => {
          const asset = window.sim.findAsset(d.assetId);
          return (
            <div key={d.id} className="px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${d.end ? "bg-stone-300" : d.planned ? "bg-amber-500" : "bg-rose-500"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="text-[12.5px] font-semibold text-stone-900 truncate">{asset ? asset.name : d.assetId}</span>{!d.end && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shrink-0">folyamatban</span>}{d.planned && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 shrink-0">tervezett</span>}</div>
                <div className="text-[10.5px] text-stone-400 truncate">{d.reason} · {d.start}{d.end ? " – " + d.end : ""}</div>
              </div>
              {d.workOrderId && <button onClick={() => setOpenWo(d.workOrderId)} className="text-[10.5px] font-mono text-cyan-700 shrink-0">{d.workOrderId}</button>}
              <span className="text-[12px] tabular-nums text-stone-700 shrink-0">{d.hours} ó</span>
            </div>
          );
        }) : <div className="px-4 py-10 text-center text-[12px] text-stone-400">Nincs állásidő-bejegyzés.</div>}
      </div>

      <window.WoDetailHost openId={openWo} onClose={() => setOpenWo(null)} />
    </div>
  );
}

// ── Sheet: új eszköz ─────────────────────────────────────────────
function NewAssetSheet({ onClose }) {
  const sim = useSim();
  const [name, setName] = useStateM2("");
  const [kind, setKind] = useStateM2("gep");
  const [facilityId, setFac] = useStateM2((window.FACILITIES || [])[0]?.id || "fac-vac");
  const [location, setLoc] = useStateM2("");
  const [vendor, setVendor] = useStateM2("");
  const [model, setModel] = useStateM2("");
  const [serial, setSerial] = useStateM2("");
  const [value, setValue] = useStateM2("");
  const [operatingHours, setOH] = useStateM2("");
  const save = () => { if (!name.trim()) return; window.sim.addAsset({ name, kind, facilityId, location, vendor, model, serial, value: Number(value) || 0, operatingHours: Number(operatingHours) || 0 }); onClose(); };
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[480px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"><div className="text-[14px] font-semibold text-stone-900">Új eszköz</div><button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button></div>
        <div className="px-4 py-4 space-y-2.5">
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Megnevezés</label><input value={name} onChange={(e) => setName(e.target.value)} className={m2cls} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Kategória</label><select value={kind} onChange={(e) => setKind(e.target.value)} className={m2cls}>{(window.ASSET_KIND_ORDER || []).map((k) => <option key={k} value={k}>{window.ASSET_KINDS[k].label}</option>)}</select></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Telephely</label><select value={facilityId} onChange={(e) => setFac(e.target.value)} className={m2cls}>{(window.FACILITIES || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Hely</label><input value={location} onChange={(e) => setLoc(e.target.value)} className={m2cls} /></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Gyártó</label><input value={vendor} onChange={(e) => setVendor(e.target.value)} className={m2cls} /></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Modell</label><input value={model} onChange={(e) => setModel(e.target.value)} className={m2cls} /></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Gyári szám</label><input value={serial} onChange={(e) => setSerial(e.target.value)} className={m2cls} /></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Érték (Ft)</label><input type="number" value={value} onChange={(e) => setValue(e.target.value)} className={m2cls} /></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Üzemóra</label><input type="number" value={operatingHours} onChange={(e) => setOH(e.target.value)} className={m2cls} /></div>
          </div>
          <button onClick={save} disabled={!name.trim()} className={`w-full h-10 rounded-xl text-white text-[13px] font-medium mt-1 ${name.trim() ? "bg-cyan-600" : "bg-stone-300"}`}>Eszköz felvétele</button>
        </div>
      </div>
    </div>
  );
}

// ── Sheet: új munkalap ───────────────────────────────────────────
function NewWorkOrderSheet({ onClose, onCreated }) {
  const sim = useSim();
  const assets = window.sim.assetList();
  const [assetId, setAssetId] = useStateM2(assets[0]?.id || "");
  const [kind, setKind] = useStateM2("korrektiv");
  const [title, setTitle] = useStateM2("");
  const [desc, setDesc] = useStateM2("");
  const [priority, setPriority] = useStateM2("kozepes");
  const [breakdown, setBreakdown] = useStateM2(false);
  const save = () => { if (!assetId || !title.trim()) return; const id = window.sim.createWorkOrder({ assetId, kind, title, desc, priority, breakdown, stops: breakdown }); if (id && onCreated) onCreated(id); else onClose(); };
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[480px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"><div className="text-[14px] font-semibold text-stone-900">Új munkalap</div><button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button></div>
        <div className="px-4 py-4 space-y-2.5">
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Eszköz</label><select value={assetId} onChange={(e) => setAssetId(e.target.value)} className={m2cls}>{assets.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}</select></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Típus</label><select value={kind} onChange={(e) => setKind(e.target.value)} className={m2cls}>{(window.WO_TYPE_ORDER || []).map((k) => <option key={k} value={k}>{window.WO_TYPE[k].label}</option>)}</select></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Prioritás</label><select value={priority} onChange={(e) => setPriority(e.target.value)} className={m2cls}>{(window.WO_PRIORITY_ORDER || []).map((p) => <option key={p} value={p}>{window.WO_PRIORITY[p].label}</option>)}</select></div>
          </div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Cím</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="pl. Csapágycsere" className={m2cls} /></div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Leírás</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-cyan-500" /></div>
          <label className="flex items-center gap-2 text-[12.5px] text-stone-700"><input type="checkbox" checked={breakdown} onChange={(e) => setBreakdown(e.target.checked)} />Géptörés — az eszköz leáll (üzemállapot → leállítva)</label>
          <button onClick={save} disabled={!assetId || !title.trim()} className={`w-full h-10 rounded-xl text-white text-[13px] font-medium mt-1 ${assetId && title.trim() ? "bg-cyan-600" : "bg-stone-300"}`}>Munkalap létrehozása</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  AssetDetail, AddPlanForm, WoDetail, WoScheduleForm,
  MaintSchedule, DowntimeLog, NewAssetSheet, NewWorkOrderSheet,
});
