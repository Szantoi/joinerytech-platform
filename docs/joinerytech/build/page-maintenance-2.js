/* AUTO-GENERATED from page-maintenance-2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-maintenance-2.jsx — KARBANTARTÁS világ (2/2)
//   AssetDetail (eszköz-kártya: adatok + megelőző tervek + munkalap-előzmény +
//   állásidő), WoDetail (munkalap: FSM + ütemezés + alkatrész + kiadás +
//   Kontrolling), MaintSchedule (eszköz-soros ütemterv), DowntimeLog, sheetek.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateM2
} = React;
const m2cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-cyan-500";
const m2facName = id => ((window.FACILITIES || []).find(f => f.id === id) || {}).name || "—";

// ── Faipari gép-paraméterek (szabász max tábla / élzáró min. szélesség) ──
//   Gép-szintű, BESZERZÉSKOR/tapasztalatból rögzített érték (nem munkánként
//   változik). A Gyártás-előkészítés Szabászat füle innen olvassa (wwMachineLimit).
function AssetCutLimits({
  asset,
  canManage
}) {
  const machine = (window.PROD_STATIONS || []).find(m => m.id === asset.machineId);
  const mkind = machine ? machine.kind : null;
  const lim = window.wwMachineLimit ? window.wwMachineLimit(asset.machineId) : asset.cutLimits || {};
  const [maxW, setMaxW] = useStateM2(lim.maxW || "");
  const [maxH, setMaxH] = useStateM2(lim.maxH || "");
  const [minW, setMinW] = useStateM2(lim.minPartW || "");
  const isEdge = mkind === "elzaras";
  const isSaw = mkind === "szabaszat" || mkind === "cnc";
  if (!isEdge && !isSaw) return null;
  const dirty = isSaw ? Number(maxW) !== (lim.maxW || 0) || Number(maxH) !== (lim.maxH || 0) : Number(minW) !== (lim.minPartW || 0);
  const save = () => {
    const cur = asset.cutLimits || {};
    const patch = isSaw ? {
      ...cur,
      maxW: Number(maxW) || 0,
      maxH: Number(maxH) || 0
    } : {
      ...cur,
      minPartW: Number(minW) || 0
    };
    window.sim.updateAsset(asset.id, {
      cutLimits: patch
    });
  };
  const inCls = "w-full h-8 px-2 rounded-lg border border-stone-200 text-[12px] text-right tabular-nums outline-none focus:border-cyan-400 disabled:bg-stone-50 disabled:text-stone-400";
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-cyan-200 bg-cyan-50/30 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-cyan-700/80 font-medium"
  }, "Faipari g\xE9p-param\xE9terek ", isSaw ? "(szabászat)" : "(élzárás)"), canManage && dirty && /*#__PURE__*/React.createElement("button", {
    onClick: save,
    className: "h-7 px-2.5 rounded-lg bg-cyan-600 text-white text-[11px] font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), "Ment\xE9s")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, isSaw && /*#__PURE__*/React.createElement("label", {
    className: "flex-1 min-w-[110px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mb-1"
  }, "Max. t\xE1bla sz\xE9less\xE9g"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    value: maxW,
    disabled: !canManage,
    onChange: e => setMaxW(e.target.value),
    className: inCls
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 text-[11px] shrink-0"
  }, "mm"))), isSaw && /*#__PURE__*/React.createElement("label", {
    className: "flex-1 min-w-[110px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mb-1"
  }, "Max. t\xE1bla hossz"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    value: maxH,
    disabled: !canManage,
    onChange: e => setMaxH(e.target.value),
    className: inCls
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 text-[11px] shrink-0"
  }, "mm"))), isEdge && /*#__PURE__*/React.createElement("label", {
    className: "flex-1 min-w-[150px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mb-1"
  }, "Min. munkadarab-sz\xE9less\xE9g (VV-k\xFCsz\xF6b)"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    value: minW,
    disabled: !canManage,
    onChange: e => setMinW(e.target.value),
    className: inCls
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 text-[11px] shrink-0"
  }, "mm")))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500/80 mt-2"
  }, "Beszerz\xE9skor / tapasztalatb\xF3l r\xF6gz\xEDtett, g\xE9p-szint\u0171 \xE9rt\xE9k \u2014 a Gy\xE1rt\xE1s-el\u0151k\xE9sz\xEDt\xE9s Szab\xE1szat f\xFCle innen olvassa (", isSaw ? "méret-túllépés ellenőrzés" : "VV-összerakás küszöb", "). Nem munk\xE1nk\xE9nt v\xE1ltozik."));
}

// ── Eszköz-kártya (SlideOver tartalom) ───────────────────────────
function AssetDetail({
  asset
}) {
  const sim = useSim();
  const st = window.sim.assetStatus(asset.id);
  const canManage = window.sim.hasPerm("maintenance.manage");
  const plans = window.sim.maintPlansForAsset(asset.id);
  const wos = window.sim.workOrdersForAsset(asset.id).slice().sort((a, b) => (b.reportedAt || "").localeCompare(a.reportedAt || ""));
  const dts = window.sim.downtimeForAsset(asset.id);
  const [openWo, setOpenWo] = useStateM2(null);
  const [addPlan, setAddPlan] = useStateM2(false);
  const KIND = window.ASSET_KINDS[asset.kind] || {};
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-12 h-12 rounded-2xl grid place-items-center shrink-0",
    style: {
      background: KIND.accent + "1a",
      color: KIND.accent
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: KIND.icon || "box",
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 truncate"
  }, asset.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500"
  }, asset.code, " \xB7 ", KIND.label)), /*#__PURE__*/React.createElement(window.AssetStatusPill, {
    status: st
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 text-[12px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Telephely / hely"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-800 font-medium truncate"
  }, m2facName(asset.facilityId), asset.location ? " · " + asset.location : "")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Gy\xE1rt\xF3 / modell"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-800 font-medium truncate"
  }, asset.vendor || "—", asset.model ? " " + asset.model : "")), asset.serial && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Gy\xE1ri sz\xE1m"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-700 font-mono truncate"
  }, asset.serial)), asset.purchasedAt && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Beszerz\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-800 font-medium"
  }, asset.purchasedAt)), asset.value > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "K\xF6nyv szerinti \xE9rt\xE9k"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-800 font-medium"
  }, window.mntHuf(asset.value))), asset.operatingHours > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "\xDCzem\xF3ra"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-800 font-medium"
  }, asset.operatingHours.toLocaleString("hu-HU"), " \xFC\xF3")), asset.odometer && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Km \xF3ra"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-800 font-medium"
  }, asset.odometer.toLocaleString("hu-HU"), " km")), asset.machineId && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-cyan-200 bg-cyan-50/50 px-3 py-2 col-span-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-cyan-600"
  }, "Shop Floor g\xE9p"), /*#__PURE__*/React.createElement("div", {
    className: "text-cyan-800 font-medium"
  }, asset.machineId, " \u2014 a Gy\xE1rt\xE1s innen olvassa az \xFCzem\xE1llapotot"))), asset.note && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, asset.note), asset.machineId && /*#__PURE__*/React.createElement(AssetCutLimits, {
    asset: asset,
    canManage: canManage
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Megel\u0151z\u0151 tervek"), canManage && /*#__PURE__*/React.createElement("button", {
    onClick: () => setAddPlan(v => !v),
    className: "text-[11.5px] text-cyan-700 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "Terv")), addPlan && /*#__PURE__*/React.createElement(AddPlanForm, {
    assetId: asset.id,
    onClose: () => setAddPlan(false)
  }), plans.length ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, plans.map(p => {
    const due = window.MaintEngine.planDue(p, asset, window.MNT_TODAY);
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      className: "flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-7 h-7 rounded-md grid place-items-center shrink-0",
      style: {
        background: (window.WO_TYPE[p.kind] || {}).accent + "1a",
        color: (window.WO_TYPE[p.kind] || {}).accent
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: (window.WO_TYPE[p.kind] || {}).icon || "shield",
      size: 13
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-medium text-stone-800 truncate"
    }, p.label), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 truncate"
    }, p.trigger === "hours" ? `${p.intervalHours} üó` : `${p.intervalDays} naponta`, " \xB7 ", p.assigneeType === "external" ? p.partnerName || "külsős" : window.sim.employeeName(p.assigneeEmpId), " \xB7 ", /*#__PURE__*/React.createElement(window.PlanDueBadge, {
      due: due
    }))), canManage && /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpenWo(window.sim.createWorkOrderFromPlan(p.id)),
      className: "h-7 px-2 rounded-lg bg-cyan-600 text-white text-[10.5px] font-medium shrink-0"
    }, "Munkalap"), canManage && /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.removeMaintPlan(p.id),
      className: "text-stone-300 hover:text-rose-500 shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    })));
  })) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs megel\u0151z\u0151 terv.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Munkalap-el\u0151zm\xE9ny"), wos.length ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mt-2"
  }, wos.map(w => /*#__PURE__*/React.createElement("button", {
    key: w.id,
    onClick: () => setOpenWo(w.id),
    className: "w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50/60 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-800 truncate"
  }, w.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, w.id, " \xB7 ", w.reportedAt, w.cost ? " · " + window.mntHuf(w.cost) : "")), /*#__PURE__*/React.createElement(window.WoStatusPill, {
    status: w.status,
    size: "sm"
  })))) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 mt-2"
  }, "Nincs munkalap.")), dts.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "\xC1ll\xE1sid\u0151-el\u0151zm\xE9ny"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1 mt-2"
  }, dts.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.id,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${d.end ? "bg-stone-300" : d.planned ? "bg-amber-500" : "bg-rose-500"}`
  }), /*#__PURE__*/React.createElement("span", {
    className: "flex-1 truncate text-stone-700"
  }, d.reason), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, d.hours, " \xF3", !d.end ? " · folyamatban" : ""))))), canManage && st !== "selejtezve" && /*#__PURE__*/React.createElement("div", {
    className: "pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm("Biztosan selejtezed az eszközt?")) window.sim.retireAsset(asset.id);
    },
    className: "text-[11.5px] text-rose-500 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "archive",
    size: 13
  }), "Eszk\xF6z selejtez\xE9se")), /*#__PURE__*/React.createElement(window.WoDetailHost, {
    openId: openWo,
    onClose: () => setOpenWo(null)
  }));
}
function AddPlanForm({
  assetId,
  onClose
}) {
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
    window.sim.addMaintPlan({
      assetId,
      label,
      kind,
      trigger,
      intervalDays,
      intervalHours,
      assigneeType,
      assigneeEmpId: assigneeType === "internal" ? assigneeEmpId : null,
      partnerName: assigneeType === "external" ? partnerName : null,
      estHours,
      lastDone: window.MNT_TODAY,
      lastDoneHours: 0
    });
    onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50/60 p-3 space-y-2 mb-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: label,
    onChange: e => setLabel(e.target.value),
    placeholder: "Terv megnevez\xE9se",
    className: m2cls
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("select", {
    value: kind,
    onChange: e => setKind(e.target.value),
    className: m2cls
  }, /*#__PURE__*/React.createElement("option", {
    value: "preventiv"
  }, "Megel\u0151z\u0151"), /*#__PURE__*/React.createElement("option", {
    value: "takaritas"
  }, "Takar\xEDt\xE1s")), /*#__PURE__*/React.createElement("select", {
    value: trigger,
    onChange: e => setTrigger(e.target.value),
    className: m2cls
  }, /*#__PURE__*/React.createElement("option", {
    value: "interval"
  }, "Id\u0151k\xF6z (nap)"), /*#__PURE__*/React.createElement("option", {
    value: "hours"
  }, "\xDCzem\xF3ra")), trigger === "interval" ? /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: intervalDays,
    onChange: e => setDays(e.target.value),
    placeholder: "naponta",
    className: m2cls
  }) : /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: intervalHours,
    onChange: e => setHours(e.target.value),
    placeholder: "\xFCzem\xF3ra",
    className: m2cls
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: estHours,
    onChange: e => setEst(e.target.value),
    placeholder: "becs\xFClt \xF3ra",
    className: m2cls
  }), /*#__PURE__*/React.createElement("select", {
    value: assigneeType,
    onChange: e => setAType(e.target.value),
    className: m2cls
  }, /*#__PURE__*/React.createElement("option", {
    value: "internal"
  }, "Bels\u0151 szerel\u0151"), /*#__PURE__*/React.createElement("option", {
    value: "external"
  }, "K\xFCls\u0151 / partner")), assigneeType === "internal" ? /*#__PURE__*/React.createElement("select", {
    value: assigneeEmpId,
    onChange: e => setEmp(e.target.value),
    className: m2cls
  }, window.sim.employeeList().map(e => /*#__PURE__*/React.createElement("option", {
    key: e.id,
    value: e.id
  }, e.name))) : /*#__PURE__*/React.createElement("input", {
    value: partnerName,
    onChange: e => setPartner(e.target.value),
    placeholder: "Partner neve",
    className: m2cls
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: save,
    className: "h-8 px-3 rounded-lg bg-cyan-600 text-white text-[12px] font-medium"
  }, "Hozz\xE1ad"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse")));
}

// ── Munkalap-detail (FSM + ütemezés + alkatrész + kiadás + Kontrolling) ──────
function WoDetail({
  wo
}) {
  const sim = useSim();
  const asset = window.sim.findAsset(wo.assetId);
  const canManage = window.sim.hasPerm("maintenance.manage");
  const nexts = window.MaintEngine.woNext(wo);
  const sla = window.MaintEngine.woSla(wo, window.MNT_TODAY);
  const [sched, setSched] = useStateM2(false);
  const partners = (sim.partners || []).filter(p => p.platform);
  const projects = (sim.projects || []).filter(p => p.status !== "draft");
  const rate = window.sim.woRate(wo);
  const cost = window.sim.woCost(wo);
  const doTransition = to => {
    if (to === "elutasitva" || to === "halasztva") {
      const r = prompt((window.WO_STATUS[to] || {}).label + " indoka:");
      if (r && r.trim()) window.sim.setWorkOrderStatus(wo.id, to, {
        reason: r
      });
    } else window.sim.setWorkOrderStatus(wo.id, to);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(window.WoTypeBadge, {
    kind: wo.kind
  }), /*#__PURE__*/React.createElement(window.WoPriorityPill, {
    priority: wo.priority,
    size: "sm"
  }), /*#__PURE__*/React.createElement(window.WoStatusPill, {
    status: wo.status,
    size: "sm"
  }), wo.breakdown && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200"
  }, "g\xE9pt\xF6r\xE9s"), !sla.done && /*#__PURE__*/React.createElement("span", {
    className: `text-[10.5px] font-medium ${sla.overdue ? "text-rose-600" : "text-stone-400"}`
  }, sla.overdue ? `SLA ${Math.abs(sla.daysLeft)} napja lejárt` : `SLA: ${sla.daysLeft} nap`)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, wo.title), asset && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500"
  }, asset.name, " \xB7 ", asset.code), wo.desc && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-600 mt-2"
  }, wo.desc)), nexts.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, nexts.map(to => {
    const m = window.WO_STATUS[to];
    return /*#__PURE__*/React.createElement("button", {
      key: to,
      disabled: !canManage,
      onClick: () => doTransition(to),
      title: !canManage ? "Karbantartás-jog szükséges (maintenance.manage)" : "",
      className: `h-8 px-3 rounded-lg text-[12px] font-medium border inline-flex items-center gap-1 ${!canManage ? "bg-stone-50 text-stone-300 border-stone-200 cursor-not-allowed" : to === "elutasitva" ? "bg-white text-rose-600 border-rose-200" : to === "kesz" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"}`
    }, !canManage && /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 11
    }), "\u2192 ", m.label);
  })), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-semibold text-stone-800"
  }, "\xDCtemez\xE9s / felel\u0151s"), canManage && /*#__PURE__*/React.createElement("button", {
    onClick: () => setSched(v => !v),
    className: "text-[11.5px] text-cyan-700 font-medium"
  }, sched ? "Bezár" : "Szerkeszt")), sched ? /*#__PURE__*/React.createElement(WoScheduleForm, {
    wo: wo,
    onClose: () => setSched(false)
  }) : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 text-[12px]"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "\xDCtemezett d\xE1tum"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-800 font-medium"
  }, wo.scheduledDate || "—")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Becs\xFClt munka"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-800 font-medium"
  }, wo.estHours, " \xF3 \xB7 ", window.mntHuf(rate), "/\xF3")), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Felel\u0151s"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-800 font-medium"
  }, wo.assigneeType === "external" ? wo.delegatedTo || wo.partnerName || "külső szerviz" : window.sim.employeeName(wo.assigneeEmpId), wo.assigneeType === "internal" && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-cyan-600"
  }, " \xB7 HR-kapacit\xE1sba k\xF6tve"))))), (wo.parts || []).length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Alkatr\xE9sz"), canManage && !wo.partsRequested && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.woRequestParts(wo.id),
    className: "text-[11.5px] text-cyan-700 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "procurement",
    size: 13
  }), "Ig\xE9ny \u2192 Beszerz\xE9s"), wo.partsRequested && /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-emerald-600 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), "Ig\xE9nyelve")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, wo.parts.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex-1 text-stone-700"
  }, p.label), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, p.qty, " ", p.unit || "db"))))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Karbantart\xE1si k\xF6lts\xE9g (munka)"), /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, window.mntHuf(cost))), wo.projectId ? wo.pushedToCtrl ? /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-emerald-600 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), "Kontrollingban") : canManage && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.pushWorkOrderToCtrl(wo.id),
    className: "h-8 px-2.5 rounded-lg bg-slate-700 text-white text-[11px] font-medium"
  }, "\u2192 Kontrolling") : /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 text-right"
  }, "nincs projekt", /*#__PURE__*/React.createElement("br", null), "(\xE1ltal\xE1nos rezsi)")), canManage && wo.assigneeType !== "external" && !["kesz", "elutasitva"].includes(wo.status) && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Kiad\xE1s k\xFCls\u0151 szerviznek (B2B)"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-1.5"
  }, /*#__PURE__*/React.createElement("select", {
    id: "deleg-" + wo.id,
    className: m2cls
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Partner v\xE1laszt\xE1sa\u2026"), partners.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const v = document.getElementById("deleg-" + wo.id).value;
      if (v) window.sim.delegateWorkOrder(wo.id, v);
    },
    className: "h-9 px-3 rounded-lg border border-stone-200 text-stone-700 text-[12px] font-medium shrink-0"
  }, "Kiad"))), wo.delegatedTo && canManage && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.recallWorkOrder(wo.id),
    className: "text-[11.5px] text-stone-500 font-medium"
  }, "Kiad\xE1s visszavon\xE1sa (", wo.delegatedTo, ")"), canManage && !wo.projectId && !["kesz", "elutasitva"].includes(wo.status) && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Projekthez k\xF6t\xE9s (Kontrolling t\xE9ny)"), /*#__PURE__*/React.createElement("select", {
    onChange: e => {
      if (e.target.value) window.sim.setWorkOrderProject(wo.id, e.target.value);
    },
    className: m2cls + " mt-1.5",
    defaultValue: ""
  }, /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, "\u2014 projekt v\xE1laszt\xE1sa \u2014"), projects.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Napl\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1 mt-2"
  }, (wo.log || []).map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-start gap-2 text-[11px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-mono shrink-0 w-[88px]"
  }, l.at), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-600"
  }, l.text))))));
}
function WoScheduleForm({
  wo,
  onClose
}) {
  const sim = useSim();
  const [date, setDate] = useStateM2(wo.scheduledDate || window.MNT_TODAY);
  const [assigneeType, setAType] = useStateM2(wo.assigneeType || "internal");
  const [assigneeEmpId, setEmp] = useStateM2(wo.assigneeEmpId || window.sim.employeeList()[0]?.id || "");
  const [partnerName, setPartner] = useStateM2(wo.partnerName || "");
  const [estHours, setEst] = useStateM2(String(wo.estHours || 2));
  const save = () => {
    window.sim.scheduleWorkOrder(wo.id, {
      scheduledDate: date,
      assigneeType,
      assigneeEmpId: assigneeType === "internal" ? assigneeEmpId : null,
      partnerName: assigneeType === "external" ? partnerName : null,
      estHours: Number(estHours) || 2
    });
    onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[9.5px] text-stone-400"
  }, "D\xE1tum"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: date,
    onChange: e => setDate(e.target.value),
    className: m2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[9.5px] text-stone-400"
  }, "Becs\xFClt \xF3ra"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: estHours,
    onChange: e => setEst(e.target.value),
    className: m2cls
  })), /*#__PURE__*/React.createElement("select", {
    value: assigneeType,
    onChange: e => setAType(e.target.value),
    className: m2cls
  }, /*#__PURE__*/React.createElement("option", {
    value: "internal"
  }, "Bels\u0151 szerel\u0151"), /*#__PURE__*/React.createElement("option", {
    value: "external"
  }, "K\xFCls\u0151 / partner")), assigneeType === "internal" ? /*#__PURE__*/React.createElement("select", {
    value: assigneeEmpId,
    onChange: e => setEmp(e.target.value),
    className: m2cls
  }, window.sim.employeeList().map(e => /*#__PURE__*/React.createElement("option", {
    key: e.id,
    value: e.id
  }, e.name))) : /*#__PURE__*/React.createElement("input", {
    value: partnerName,
    onChange: e => setPartner(e.target.value),
    placeholder: "Partner neve",
    className: m2cls
  })), assigneeType === "internal" && /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-cyan-600"
  }, "A bels\u0151 szerel\u0151 \xFCtemez\xE9se a HR kapacit\xE1s-napt\xE1rba is beker\xFCl."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: save,
    className: "h-8 px-3 rounded-lg bg-cyan-600 text-white text-[12px] font-medium"
  }, "Ment\xE9s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse")));
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
  const scheduled = (sim.workOrders || []).filter(w => w.scheduledDate && !["kesz", "elutasitva"].includes(w.status));
  const assetIds = [...new Set(scheduled.map(w => w.assetId))];
  const assets = assetIds.map(id => window.sim.findAsset(id)).filter(Boolean);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "\xDCtemterv"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "2 h\xE9t \xB7 az \xFCtemezett munkalapok eszk\xF6z\xF6nk\xE9nt")), assets.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs \xFCtemezett munkalap a k\xF6vetkez\u0151 2 h\xE9tben.") : /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-[940px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid border-b border-stone-100 bg-stone-50/60",
    style: {
      gridTemplateColumns: "190px repeat(14, 1fr)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Eszk\xF6z"), days.map((d, i) => {
    const isToday = E.fmt(d) === window.MNT_TODAY;
    const wknd = d.getDay() === 0 || d.getDay() === 6;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: `px-1 py-2 text-center border-l border-stone-100 ${isToday ? "bg-cyan-50" : wknd ? "bg-stone-50" : ""}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[9px] text-stone-400"
    }, DOW[d.getDay()]), /*#__PURE__*/React.createElement("div", {
      className: `text-[10px] font-mono ${isToday ? "text-cyan-700 font-semibold" : "text-stone-500"}`
    }, d.getMonth() + 1, ".", d.getDate()));
  })), assets.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    className: "grid border-b border-stone-100 last:border-0",
    style: {
      gridTemplateColumns: "190px repeat(14, 1fr)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 min-w-0 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-6 h-6 rounded-md grid place-items-center shrink-0",
    style: {
      background: (window.ASSET_KINDS[a.kind] || {}).accent + "1a",
      color: (window.ASSET_KINDS[a.kind] || {}).accent
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: (window.ASSET_KINDS[a.kind] || {}).icon || "box",
    size: 12
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-semibold text-stone-800 truncate"
  }, a.name))), days.map((d, i) => {
    const ds = E.fmt(d);
    const cell = scheduled.filter(w => w.assetId === a.id && w.scheduledDate === ds);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "border-l border-stone-100 p-0.5 space-y-0.5 min-h-[40px]"
    }, cell.map(w => {
      const m = window.WO_TYPE[w.kind] || {};
      return /*#__PURE__*/React.createElement("button", {
        key: w.id,
        onClick: () => setOpenWo(w.id),
        title: w.title,
        className: "w-full text-left rounded px-1 py-0.5 text-[9px] leading-tight truncate border",
        style: {
          background: m.accent + "14",
          color: m.accent,
          borderColor: m.accent + "33"
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "font-semibold"
      }, m.short), " ", w.title.split(" ")[0]);
    }));
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 flex-wrap mt-3 text-[11px] text-stone-500"
  }, (window.WO_TYPE_ORDER || []).map(t => {
    const m = window.WO_TYPE[t];
    return /*#__PURE__*/React.createElement("span", {
      key: t,
      className: "inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-2.5 h-2.5 rounded-sm",
      style: {
        background: m.accent
      }
    }), m.label);
  })), /*#__PURE__*/React.createElement(window.WoDetailHost, {
    openId: openWo,
    onClose: () => setOpenWo(null)
  }));
}

// ── Állásidő-napló ───────────────────────────────────────────────
function DowntimeLog() {
  const sim = useSim();
  const [openWo, setOpenWo] = useStateM2(null);
  const list = (sim.downtime || []).slice().sort((a, b) => (a.end ? 1 : 0) - (b.end ? 1 : 0) || (b.start || "").localeCompare(a.start || ""));
  const openHours = list.filter(d => !d.end).reduce((a, d) => a + (Number(d.hours) || 0), 0);
  const totalHours = list.reduce((a, d) => a + (Number(d.hours) || 0), 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "\xC1ll\xE1sid\u0151-napl\xF3"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Folyamatban: ", Math.round(openHours), " \xF3 \xB7 \xF6sszes regisztr\xE1lt: ", Math.round(totalHours), " \xF3")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, list.length ? list.map(d => {
    const asset = window.sim.findAsset(d.assetId);
    return /*#__PURE__*/React.createElement("div", {
      key: d.id,
      className: "px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-2.5 h-2.5 rounded-full shrink-0 ${d.end ? "bg-stone-300" : d.planned ? "bg-amber-500" : "bg-rose-500"}`
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-semibold text-stone-900 truncate"
    }, asset ? asset.name : d.assetId), !d.end && /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shrink-0"
    }, "folyamatban"), d.planned && /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 shrink-0"
    }, "tervezett")), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 truncate"
    }, d.reason, " \xB7 ", d.start, d.end ? " – " + d.end : "")), d.workOrderId && /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpenWo(d.workOrderId),
      className: "text-[10.5px] font-mono text-cyan-700 shrink-0"
    }, d.workOrderId), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] tabular-nums text-stone-700 shrink-0"
    }, d.hours, " \xF3"));
  }) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-10 text-center text-[12px] text-stone-400"
  }, "Nincs \xE1ll\xE1sid\u0151-bejegyz\xE9s.")), /*#__PURE__*/React.createElement(window.WoDetailHost, {
    openId: openWo,
    onClose: () => setOpenWo(null)
  }));
}

// ── Sheet: új eszköz ─────────────────────────────────────────────
function NewAssetSheet({
  onClose
}) {
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
  const save = () => {
    if (!name.trim()) return;
    window.sim.addAsset({
      name,
      kind,
      facilityId,
      location,
      vendor,
      model,
      serial,
      value: Number(value) || 0,
      operatingHours: Number(operatingHours) || 0
    });
    onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[60] flex items-end md:items-center justify-center",
    role: "dialog"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-stone-900/40",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full md:max-w-[480px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "\xDAj eszk\xF6z"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-2.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Megnevez\xE9s"), /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value),
    className: m2cls
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Kateg\xF3ria"), /*#__PURE__*/React.createElement("select", {
    value: kind,
    onChange: e => setKind(e.target.value),
    className: m2cls
  }, (window.ASSET_KIND_ORDER || []).map(k => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, window.ASSET_KINDS[k].label)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Telephely"), /*#__PURE__*/React.createElement("select", {
    value: facilityId,
    onChange: e => setFac(e.target.value),
    className: m2cls
  }, (window.FACILITIES || []).map(f => /*#__PURE__*/React.createElement("option", {
    key: f.id,
    value: f.id
  }, f.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Hely"), /*#__PURE__*/React.createElement("input", {
    value: location,
    onChange: e => setLoc(e.target.value),
    className: m2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Gy\xE1rt\xF3"), /*#__PURE__*/React.createElement("input", {
    value: vendor,
    onChange: e => setVendor(e.target.value),
    className: m2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Modell"), /*#__PURE__*/React.createElement("input", {
    value: model,
    onChange: e => setModel(e.target.value),
    className: m2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Gy\xE1ri sz\xE1m"), /*#__PURE__*/React.createElement("input", {
    value: serial,
    onChange: e => setSerial(e.target.value),
    className: m2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "\xC9rt\xE9k (Ft)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    onChange: e => setValue(e.target.value),
    className: m2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "\xDCzem\xF3ra"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: operatingHours,
    onChange: e => setOH(e.target.value),
    className: m2cls
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: save,
    disabled: !name.trim(),
    className: `w-full h-10 rounded-xl text-white text-[13px] font-medium mt-1 ${name.trim() ? "bg-cyan-600" : "bg-stone-300"}`
  }, "Eszk\xF6z felv\xE9tele"))));
}

// ── Sheet: új munkalap ───────────────────────────────────────────
function NewWorkOrderSheet({
  onClose,
  onCreated
}) {
  const sim = useSim();
  const assets = window.sim.assetList();
  const [assetId, setAssetId] = useStateM2(assets[0]?.id || "");
  const [kind, setKind] = useStateM2("korrektiv");
  const [title, setTitle] = useStateM2("");
  const [desc, setDesc] = useStateM2("");
  const [priority, setPriority] = useStateM2("kozepes");
  const [breakdown, setBreakdown] = useStateM2(false);
  const save = () => {
    if (!assetId || !title.trim()) return;
    const id = window.sim.createWorkOrder({
      assetId,
      kind,
      title,
      desc,
      priority,
      breakdown,
      stops: breakdown
    });
    if (id && onCreated) onCreated(id);else onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[60] flex items-end md:items-center justify-center",
    role: "dialog"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-stone-900/40",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full md:max-w-[480px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "\xDAj munkalap"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-2.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Eszk\xF6z"), /*#__PURE__*/React.createElement("select", {
    value: assetId,
    onChange: e => setAssetId(e.target.value),
    className: m2cls
  }, assets.map(a => /*#__PURE__*/React.createElement("option", {
    key: a.id,
    value: a.id
  }, a.name, " (", a.code, ")")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "T\xEDpus"), /*#__PURE__*/React.createElement("select", {
    value: kind,
    onChange: e => setKind(e.target.value),
    className: m2cls
  }, (window.WO_TYPE_ORDER || []).map(k => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, window.WO_TYPE[k].label)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Priorit\xE1s"), /*#__PURE__*/React.createElement("select", {
    value: priority,
    onChange: e => setPriority(e.target.value),
    className: m2cls
  }, (window.WO_PRIORITY_ORDER || []).map(p => /*#__PURE__*/React.createElement("option", {
    key: p,
    value: p
  }, window.WO_PRIORITY[p].label))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "C\xEDm"), /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "pl. Csap\xE1gycsere",
    className: m2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Le\xEDr\xE1s"), /*#__PURE__*/React.createElement("textarea", {
    value: desc,
    onChange: e => setDesc(e.target.value),
    rows: 2,
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-cyan-500"
  })), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 text-[12.5px] text-stone-700"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: breakdown,
    onChange: e => setBreakdown(e.target.checked)
  }), "G\xE9pt\xF6r\xE9s \u2014 az eszk\xF6z le\xE1ll (\xFCzem\xE1llapot \u2192 le\xE1ll\xEDtva)"), /*#__PURE__*/React.createElement("button", {
    onClick: save,
    disabled: !assetId || !title.trim(),
    className: `w-full h-10 rounded-xl text-white text-[13px] font-medium mt-1 ${assetId && title.trim() ? "bg-cyan-600" : "bg-stone-300"}`
  }, "Munkalap l\xE9trehoz\xE1sa"))));
}
Object.assign(window, {
  AssetDetail,
  AddPlanForm,
  WoDetail,
  WoScheduleForm,
  MaintSchedule,
  DowntimeLog,
  NewAssetSheet,
  NewWorkOrderSheet
});
})();
