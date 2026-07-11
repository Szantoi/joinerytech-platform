/* AUTO-GENERATED from page-logistics.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-logistics.jsx — LOGISZTIKA világ (1/2)
//   Diszpécser: Áttekintés + Kiszállítások/Beszállítások listák + heti Ütemezés
//   (jármű-soros idővonal ütközés-jelzéssel). A részlet-SlideOver, sofőr-terminál,
//   erőforrások és „Új fuvar" sheet a page-logistics-2.jsx-ben.
//   Store: window.sim.shipments / vehicles / crews + akciók; LogEngine (FSM/ütközés).
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateL,
  useMemo: useMemoL,
  useEffect: useEffectL
} = React;
const LOG_TODAY = "2026-04-28";
const logParse = s => {
  const [y, m, d] = String(s || "").split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const LOG_DAY_MS = 86400000;
const logFmtMD = dt => `${dt.getMonth() + 1}.${String(dt.getDate()).padStart(2, "0")}`;
const logDOW = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];
const logHuf = n => (Number(n) || 0).toLocaleString("hu-HU");

// ── Közös vizuális elemek ────────────────────────────────────────
function LogStatusPill({
  status,
  size = "md"
}) {
  const t = (window.LOG_STATUS || {})[status] || {
    label: status,
    pill: "bg-stone-100 text-stone-600 border-stone-200",
    dot: "bg-stone-400"
  };
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.dot}`
  }), t.label);
}
function ShipTypeBadge({
  type,
  size = "md"
}) {
  const m = (window.LOG_TYPE_META || {})[type] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-md border font-medium ${cls} ${m.pill}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "truck",
    size: size === "sm" ? 11 : 12
  }), m.short || type);
}

// horizontális lépés-jelző a fuvar FSM-éhez (install nélküli delivery-nél kihagyja a beszerelve-t)
function ShipStepper({
  sh
}) {
  const steps = window.LogEngine ? window.LogEngine.steps(sh) : [];
  const cur = steps.indexOf(sh.status);
  const rek = sh.status === "reklamacio";
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 overflow-x-auto pb-0.5"
  }, steps.map((st, i) => {
    const done = !rek && i < cur,
      active = !rek && i === cur;
    const lbl = (window.LOG_STATUS[st] || {}).label || st;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: st
    }, i > 0 && /*#__PURE__*/React.createElement("div", {
      className: `h-px w-3 shrink-0 ${done ? "bg-teal-400" : "bg-stone-200"}`
    }), /*#__PURE__*/React.createElement("div", {
      className: `shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border ${active ? "bg-sky-600 text-white border-sky-600" : done ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-white text-stone-400 border-stone-200"}`
    }, done && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 10
    }), lbl));
  }), rek && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "h-px w-3 shrink-0 bg-rose-300"
  }), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[10.5px] font-medium border bg-rose-50 text-rose-700 border-rose-200"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 10
  }), "Reklam\xE1ci\xF3")));
}

// egy fuvar-sor (lista) — koppintható, mobilbarát
function ShipRow({
  sh,
  onOpen,
  conflict
}) {
  const m = (window.LOG_TYPE_META || {})[sh.type] || {};
  const veh = window.sim.findVehicle(sh.vehicleId);
  const crew = window.sim.findCrew(sh.crewId);
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(sh.id),
    className: "w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg grid place-items-center shrink-0",
    style: {
      background: (m.accent || "#0284c7") + "1a",
      color: m.accent || "#0284c7"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "truck",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, sh.customer), sh.install && sh.type === "delivery" && /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-medium"
  }, "+ telep\xEDt\xE9s"), conflict && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-0.5 text-[9.5px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 9
  }), "\xFCtk\xF6z\xE9s"), sh.delegatedTo && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-0.5 text-[9.5px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 9
  }), sh.delegatedTo)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate mt-0.5"
  }, sh.id, " \xB7 ", sh.refLabel || sh.address || "—"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-1 text-[10.5px] text-stone-400"
  }, sh.date && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar",
    size: 11
  }), sh.date, sh.windowStart ? ` ${sh.windowStart}–${sh.windowEnd}` : ""), veh && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "truck",
    size: 11
  }), veh.name), crew && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 11
  }), crew.name))), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 flex flex-col items-end gap-1"
  }, /*#__PURE__*/React.createElement(LogStatusPill, {
    status: sh.status,
    size: "sm"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 15,
    className: "text-stone-300"
  })));
}

// ── A diszpécser keret (a SlideOver-t itt nyitjuk) ───────────────
function useShipOpen() {
  const [openId, setOpenId] = useStateL(null);
  return [openId, setOpenId];
}
function ShipDetailHost({
  openId,
  onClose
}) {
  const sim = useSim();
  const sh = openId ? (sim.shipments || []).find(x => x.id === openId) : null;
  const SO = window.SlideOver;
  if (!SO) return null;
  return /*#__PURE__*/React.createElement(SO, {
    open: !!sh,
    onClose: onClose,
    title: sh ? sh.customer : "",
    subtitle: sh ? sh.id : "",
    width: 560
  }, sh && window.ShipmentDetail ? /*#__PURE__*/React.createElement(window.ShipmentDetail, {
    sh: sh,
    onClose: onClose
  }) : null);
}

// ── Áttekintés ───────────────────────────────────────────────────
function LogisticsDashboard({
  onScreen
}) {
  const sim = useSim();
  const ships = sim.shipments || [];
  const [openId, setOpenId] = useShipOpen();
  const [newOpen, setNewOpen] = useStateL(false);
  const conflictSet = window.sim.shipmentConflictSet();
  const conflicts = window.sim.shipmentConflicts();
  const isLive = s => !["atadva", "beerkezett", "kesz", "torolve"].includes(s.status);
  const today = ships.filter(s => s.date === LOG_TODAY && isLive(s));
  const enRoute = ships.filter(s => s.status === "uton");
  const waiting = ships.filter(s => isLive(s) && (!s.date || s.status === "tervezett"));
  const reklam = ships.filter(s => s.status === "reklamacio");
  const openDefects = ships.reduce((a, s) => a + (s.handover && s.handover.deficiencies || []).filter(() => true).length, 0);
  const KPI = ({
    label,
    value,
    sub,
    tone = "stone",
    icon
  }) => /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-8 h-8 rounded-lg grid place-items-center bg-${tone}-50 text-${tone}-600`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[22px] font-semibold text-stone-900 leading-none"
  }, value)), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-700 mt-2.5"
  }, label), sub && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-0.5"
  }, sub));
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Logisztika"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Kisz\xE1ll\xEDt\xE1s, telep\xEDt\xE9s, besz\xE1ll\xEDt\xE1s \xE9s felm\xE9r\xE9s \u2014 ", LOG_TODAY)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "\xDAj fuvar")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement(KPI, {
    label: "Mai t\xFAr\xE1k",
    value: today.length,
    sub: "akt\xEDv, ma \xFCtemezve",
    tone: "sky",
    icon: "truck"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "\xDAton",
    value: enRoute.length,
    sub: "jelenleg \xFAton",
    tone: "cyan",
    icon: "route"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Beoszt\xE1sra v\xE1r",
    value: waiting.length,
    sub: "tervezett / d\xE1tum n\xE9lk\xFCl",
    tone: "amber",
    icon: "calendar"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Reklam\xE1ci\xF3",
    value: reklam.length,
    sub: `${openDefects} nyitott hiánytétel`,
    tone: "rose",
    icon: "alert"
  })), conflicts.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("schedule"),
    className: "w-full text-left mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-center gap-3 hover:bg-rose-100/70"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 18,
    className: "text-rose-600 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-rose-800"
  }, conflicts.length, " er\u0151forr\xE1s-\xFCtk\xF6z\xE9s az \xFCtemez\xE9sben"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-rose-700/80 truncate"
  }, "Ugyanaz a j\xE1rm\u0171 vagy brig\xE1d \xE1tfed\u0151 id\u0151ablakban \u2014 n\xE9zd meg az \xDCtemez\xE9st.")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 16,
    className: "text-rose-400"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Mai t\xFAr\xE1k"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, today.length, " db")), today.length ? today.map(s => /*#__PURE__*/React.createElement(ShipRow, {
    key: s.id,
    sh: s,
    onOpen: setOpenId,
    conflict: conflictSet[s.id]
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-8 text-center text-[12px] text-stone-400"
  }, "Ma nincs \xFCtemezett fuvar.")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Beoszt\xE1sra v\xE1r"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, waiting.length, " db")), waiting.length ? waiting.map(s => /*#__PURE__*/React.createElement(ShipRow, {
    key: s.id,
    sh: s,
    onOpen: setOpenId,
    conflict: conflictSet[s.id]
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-8 text-center text-[12px] text-stone-400"
  }, "Minden fuvar be van osztva."))), /*#__PURE__*/React.createElement(ShipDetailHost, {
    openId: openId,
    onClose: () => setOpenId(null)
  }), newOpen && window.NewShipmentSheet && /*#__PURE__*/React.createElement(window.NewShipmentSheet, {
    onClose: () => setNewOpen(false),
    onCreated: id => {
      setNewOpen(false);
      setOpenId(id);
    }
  }));
}

// ── Lista-nézet (kiszállítások / beszállítások) ──────────────────
function ShipmentListPage({
  dir,
  title
}) {
  const sim = useSim();
  const [openId, setOpenId] = useShipOpen();
  const [newOpen, setNewOpen] = useStateL(false);
  const [typeF, setTypeF] = useStateL("all");
  const [statusF, setStatusF] = useStateL("all");
  const [q, setQ] = useStateL("");
  const conflictSet = window.sim.shipmentConflictSet();

  // dir "out" → delivery + survey; dir "in" → pickup
  const inDir = s => dir === "in" ? s.type === "pickup" : s.type === "delivery" || s.type === "survey";
  const list = (sim.shipments || []).filter(s => inDir(s) && (typeF === "all" || s.type === typeF) && (statusF === "all" || (statusF === "live" ? !["atadva", "beerkezett", "kesz", "torolve"].includes(s.status) : s.status === statusF)) && (!q.trim() || (s.customer + " " + s.id + " " + (s.refLabel || "")).toLowerCase().includes(q.toLowerCase())));
  const typeChips = dir === "in" ? [] : [["all", "Mind"], ["delivery", "Kiszállítás"], ["survey", "Felmérés"]];
  const newType = dir === "in" ? "pickup" : "delivery";
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), dir === "in" ? "Új beszállítás" : "Új fuvar")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative flex-1 min-w-[160px]"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 15,
    className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Keres\xE9s \xFCgyf\xE9l / azonos\xEDt\xF3\u2026",
    className: "w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-sky-500"
  })), /*#__PURE__*/React.createElement("select", {
    value: statusF,
    onChange: e => setStatusF(e.target.value),
    className: "h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-sky-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Minden st\xE1tusz"), /*#__PURE__*/React.createElement("option", {
    value: "live"
  }, "Csak akt\xEDv"), Object.keys(window.LOG_STATUS || {}).map(k => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, window.LOG_STATUS[k].label)))), typeChips.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-3 overflow-x-auto pb-1"
  }, typeChips.map(([k, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setTypeF(k),
    className: `shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${typeF === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`
  }, lbl))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, list.length ? list.map(s => /*#__PURE__*/React.createElement(ShipRow, {
    key: s.id,
    sh: s,
    onOpen: setOpenId,
    conflict: conflictSet[s.id]
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs tal\xE1lat.")), /*#__PURE__*/React.createElement(ShipDetailHost, {
    openId: openId,
    onClose: () => setOpenId(null)
  }), newOpen && window.NewShipmentSheet && /*#__PURE__*/React.createElement(window.NewShipmentSheet, {
    defaultType: newType,
    onClose: () => setNewOpen(false),
    onCreated: id => {
      setNewOpen(false);
      setOpenId(id);
    }
  }));
}

// ── Ütemezés — jármű-soros heti idővonal (ütközés-jelzéssel) ─────
function LogisticsSchedule() {
  const sim = useSim();
  const [openId, setOpenId] = useShipOpen();
  const vehicles = sim.vehicles || [];
  const ships = (sim.shipments || []).filter(s => !["torolve"].includes(s.status));
  const conflictSet = window.sim.shipmentConflictSet();

  // 14 nap a mai naptól
  const start = logParse(LOG_TODAY);
  const days = [];
  for (let i = 0; i < 14; i++) days.push(new Date(start.getTime() + i * LOG_DAY_MS));

  // sorok: minden jármű + „Kiadva (partner)" + „Nincs jármű"
  const rows = [...vehicles.map(v => ({
    key: v.id,
    label: v.name,
    sub: v.plate,
    kind: "veh"
  })), {
    key: "__deleg",
    label: "Kiadva partnernek",
    sub: "külső fuvar",
    kind: "deleg"
  }, {
    key: "__none",
    label: "Nincs jármű",
    sub: "beosztásra vár",
    kind: "none"
  }];
  const rowShips = (row, day) => {
    const ds = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    return ships.filter(s => s.date === ds && (row.kind === "veh" ? s.vehicleId === row.key && !s.delegatedTo : row.kind === "deleg" ? !!s.delegatedTo : !s.vehicleId && !s.delegatedTo));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "\xDCtemez\xE9s"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "2 h\xE9t \xB7 j\xE1rm\u0171 szerint \xB7 az \xFCtk\xF6z\u0151 (\xE1tfed\u0151) fuvarok piros kerettel")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-[860px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid border-b border-stone-100 bg-stone-50/60",
    style: {
      gridTemplateColumns: "150px repeat(14, 1fr)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, "J\xE1rm\u0171"), days.map((d, i) => {
    const isToday = logFmtMD(d) === logFmtMD(start);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: `px-1 py-2 text-center border-l border-stone-100 ${isToday ? "bg-sky-50" : ""}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[9px] text-stone-400"
    }, logDOW[d.getDay()]), /*#__PURE__*/React.createElement("div", {
      className: `text-[10px] font-mono ${isToday ? "text-sky-700 font-semibold" : "text-stone-500"}`
    }, logFmtMD(d)));
  })), rows.map(row => /*#__PURE__*/React.createElement("div", {
    key: row.key,
    className: "grid border-b border-stone-100 last:border-0",
    style: {
      gridTemplateColumns: "150px repeat(14, 1fr)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-800 truncate"
  }, row.label), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 truncate"
  }, row.sub)), days.map((d, i) => {
    const cell = rowShips(row, d);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "border-l border-stone-100 p-0.5 space-y-0.5 min-h-[44px]"
    }, cell.map(s => {
      const m = (window.LOG_TYPE_META || {})[s.type] || {};
      const conf = conflictSet[s.id];
      return /*#__PURE__*/React.createElement("button", {
        key: s.id,
        onClick: () => setOpenId(s.id),
        title: `${s.customer} · ${s.windowStart || ""}–${s.windowEnd || ""}`,
        className: `w-full text-left rounded px-1 py-0.5 text-[9px] leading-tight truncate border ${conf ? "ring-1 ring-rose-400" : ""}`,
        style: {
          background: (m.accent || "#0284c7") + "14",
          color: m.accent || "#0284c7",
          borderColor: (m.accent || "#0284c7") + "33"
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "font-semibold"
      }, m.short), " ", s.customer.split(" ")[0]);
    }));
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 flex-wrap mt-3 text-[11px] text-stone-500"
  }, (window.LOG_TYPE_ORDER || []).map(t => {
    const m = window.LOG_TYPE_META[t];
    return /*#__PURE__*/React.createElement("span", {
      key: t,
      className: "inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-2.5 h-2.5 rounded-sm",
      style: {
        background: m.accent
      }
    }), m.label);
  }), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-sm ring-1 ring-rose-400"
  }), "\xFCtk\xF6z\xE9s")), /*#__PURE__*/React.createElement(ShipDetailHost, {
    openId: openId,
    onClose: () => setOpenId(null)
  }));
}
Object.assign(window, {
  LogStatusPill,
  ShipTypeBadge,
  ShipStepper,
  ShipRow,
  ShipDetailHost,
  LogisticsDashboard,
  ShipmentListPage,
  LogisticsSchedule,
  LOG_TODAY,
  logParse,
  logHuf
});
})();
