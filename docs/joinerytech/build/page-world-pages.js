/* AUTO-GENERATED from page-world-pages.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ProductionDashboard (Gyártás → Áttekintés) + MovementsPage (Raktár → Mozgások)

const {
  useState: useStateW2
} = React;

// ──────────────────────────────────────────────────────────────────────────
// Production Dashboard — factory floor KPIs only
// ──────────────────────────────────────────────────────────────────────────
function ProductionDashboard({
  onScreen
}) {
  // Compute KPIs from SHOPFLOOR_MACHINES + SHOPFLOOR_QUEUE
  const sim = useSim();
  const machines = SHOPFLOOR_MACHINES;
  const running = machines.filter(m => m.state === "running").length;
  const idle = machines.length - running;
  // Karbantartás-bekötés: az eszköz-törzs a forrás — mely gép van karbantartás/leállás alatt
  const maintMachineIds = (window.sim.assetsUnderMaintenance ? window.sim.assetsUnderMaintenance() : []).map(a => a.machineId).filter(Boolean);
  const inMaint = machines.filter(m => maintMachineIds.includes(m.id)).length;

  // Pull all task ids across all machines and aggregate
  const allTasks = Object.values(SHOPFLOOR_QUEUE).flat();
  const cuttingTasks = allTasks.filter(t => t.kind === "cutting");
  const totalSheets = cuttingTasks.reduce((a, t) => a + (t.sheets || 0), 0);
  const completedSheets = cuttingTasks.reduce((a, t) => a + (t.currentSheet || 0), 0);

  // Group active tasks by order
  const orderProgress = {};
  for (const t of allTasks) {
    const id = t.order;
    if (!orderProgress[id]) orderProgress[id] = {
      id,
      customer: t.customer,
      sheets: 0,
      done: 0,
      stage: t.kind
    };
    orderProgress[id].sheets += t.sheets || 0;
    orderProgress[id].done += t.currentSheet || 0;
    // record dominant stage
    if (t.runtime > 0) orderProgress[id].stage = t.kind;
  }
  const activeOrders = Object.values(orderProgress).filter(o => o.sheets > 0).slice(0, 5);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-7 py-6 space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Napi terv"), /*#__PURE__*/React.createElement("div", {
    className: "text-[28px] font-semibold tracking-tight text-stone-900 mt-1 tabular-nums"
  }, cuttingTasks.length, /*#__PURE__*/React.createElement("span", {
    className: "text-[14px] text-stone-400 font-normal ml-1"
  }, "v\xE1g\xF3terv")), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mt-1"
  }, totalSheets, " t\xE1bla \xF6sszesen \xB7 ", completedSheets, " k\xE9sz")), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Akt\xEDv g\xE9pek"), /*#__PURE__*/React.createElement("div", {
    className: "text-[28px] font-semibold tracking-tight text-stone-900 mt-1 tabular-nums"
  }, running, /*#__PURE__*/React.createElement("span", {
    className: "text-[14px] text-stone-400 font-normal ml-1"
  }, "/ ", machines.length)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] mt-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-700"
  }, running, " fut"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 mx-1"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, idle, " szabad"), inMaint > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 mx-1"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "text-amber-600"
  }, inMaint, " karbantart\xE1s")))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Hullad\xE9k"), /*#__PURE__*/React.createElement("div", {
    className: "text-[28px] font-semibold tracking-tight text-stone-900 mt-1 tabular-nums"
  }, "4.2", /*#__PURE__*/React.createElement("span", {
    className: "text-[16px] text-stone-400 ml-0.5"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-emerald-700 mt-1 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "\u2193 0.4pp"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "el\u0151z\u0151 h\xE9t"))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, "OEE"), /*#__PURE__*/React.createElement("div", {
    className: "text-[28px] font-semibold tracking-tight text-stone-900 mt-1 tabular-nums"
  }, "87", /*#__PURE__*/React.createElement("span", {
    className: "text-[16px] text-stone-400 ml-0.5"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-emerald-700 mt-1 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "\u2191 3pp"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "el\u0151z\u0151 h\xE9t")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "G\xE9p terhel\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, "\xC9l\u0151 \xE1llapot \u2014 minden m\u0171hely")), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo ? window.navigateTo("mfgprep", "nesting") : onScreen?.("machining"),
    className: "text-[11.5px] text-teal-700 font-medium hover:underline"
  }, "Anyagoptimaliz\xE1l\xE1s \u2192")), machines.map(m => {
    const queue = SHOPFLOOR_QUEUE[m.id] || [];
    const active = queue.find(q => (q.runtime || 0) > 0);
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      className: "px-5 py-3 border-b border-stone-50 last:border-0 hover:bg-stone-50/40"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3 min-w-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-2 h-2 rounded-full ${m.state === "running" ? "bg-emerald-500 animate-pulse" : "bg-stone-300"}`
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900 truncate"
    }, m.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500"
    }, m.kind, " \xB7 ", m.facility))), /*#__PURE__*/React.createElement("div", {
      className: "text-right shrink-0"
    }, m.state === "running" && active ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] font-mono text-stone-700"
    }, active.id), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500"
    }, active.customer)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-500"
    }, "\u26AA szabad"), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400"
    }, queue.length, " feladat v\xE1r")))), m.state === "running" && active && active.sheets > 1 && /*#__PURE__*/React.createElement("div", {
      className: "mt-2 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-full bg-teal-500",
      style: {
        width: `${(active.currentSheet || 0) / active.sheets * 100}%`
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] font-mono text-stone-500 tabular-nums"
    }, active.currentSheet || 0, "/", active.sheets)));
  })), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "Akt\xEDv megrendel\xE9sek"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, "Gy\xE1rt\xE1s alatti rendel\xE9sek halad\xE1sa")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen?.("workflow"),
    className: "text-[11.5px] text-teal-700 font-medium hover:underline"
  }, "Munkafolyamat \u2192")), activeOrders.map(o => {
    const pct = o.sheets > 0 ? o.done / o.sheets * 100 : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: o.id,
      className: "px-5 py-3 border-b border-stone-50 last:border-0 hover:bg-stone-50/40"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-3 mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900 truncate"
    }, o.id), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 truncate"
    }, o.customer)), /*#__PURE__*/React.createElement("span", {
      className: "px-2 h-6 inline-flex items-center rounded-full text-[10px] font-medium bg-teal-50 text-teal-700"
    }, o.stage === "cutting" ? "Szabászat" : o.stage === "edgeband" ? "Élzárás" : "CNC")), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex-1 h-2 rounded-full bg-stone-100 overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-full bg-teal-600 rounded-full",
      style: {
        width: `${pct}%`
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-mono text-stone-700 tabular-nums w-14 text-right"
    }, o.done, "/", o.sheets)));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3"
  }, [{
    key: "prep",
    label: "Gyártás-előkészítés",
    icon: "cpu",
    desc: "Anyag, útvonal, kiadás a műhelynek",
    world: "mfgprep",
    screen: "dash"
  }, {
    key: "machining",
    label: "Megmunkálás",
    icon: "layers",
    desc: "Élzárás + CNC + QC"
  }, {
    key: "workflow",
    label: "Munkafolyamat",
    icon: "workflow",
    desc: "Kanban — minden szakasz"
  }, {
    key: "analytics",
    label: "Elemzések",
    icon: "analytics",
    desc: "Hulladék, OEE, kapacitás"
  }].map(s => /*#__PURE__*/React.createElement("button", {
    key: s.key,
    onClick: () => s.world ? window.navigateTo && window.navigateTo(s.world, s.screen) : onScreen?.(s.key),
    className: "text-left p-4 rounded-xl bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50/40 transition group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg bg-teal-100 text-teal-700 grid place-items-center mb-2.5 group-hover:bg-teal-200"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, s.label), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mt-0.5"
  }, s.desc)))));
}

// ──────────────────────────────────────────────────────────────────────────
// MovementsPage — Raktár → Mozgások (standalone, with filters)
// ──────────────────────────────────────────────────────────────────────────
const MOVEMENTS = [{
  date: "2026-04-27 14:32",
  type: "Kivét",
  src: "CP-184-A",
  who: "Nagy J.",
  mat: "Bükk 18mm 2440×1830",
  qty: -8,
  unit: "tábla",
  note: "JT-2426-0184 · Bognár"
}, {
  date: "2026-04-27 11:48",
  type: "Maradék",
  src: "CP-184-A",
  who: "Nagy J.",
  mat: "Bükk 18mm 1200×380",
  qty: +1,
  unit: "darab",
  note: "OC-002 raktárba"
}, {
  date: "2026-04-27 09:15",
  type: "Bevét",
  src: "PO-2426-088",
  who: "Raktár",
  mat: "MDF 19mm 2440×1830",
  qty: +50,
  unit: "tábla",
  note: "Egger szállítás"
}, {
  date: "2026-04-26 16:48",
  type: "Maradék",
  src: "CP-182-A",
  who: "Tóth K.",
  mat: "Tölgy 22mm 400×600",
  qty: +1,
  unit: "darab",
  note: "OC-001 raktárba"
}, {
  date: "2026-04-26 11:02",
  type: "Kivét",
  src: "CP-182-A",
  who: "Tóth K.",
  mat: "Tölgy 40mm 2440×1830",
  qty: -22,
  unit: "tábla",
  note: "JT-2426-0182 · Doorstar"
}, {
  date: "2026-04-25 13:20",
  type: "Bevét",
  src: "PO-2426-091",
  who: "Raktár",
  mat: "Tölgy 22mm 2440×1830",
  qty: +30,
  unit: "tábla",
  note: "Falco szállítás"
}, {
  date: "2026-04-25 10:14",
  type: "Kivét",
  src: "CP-181-B",
  who: "Kiss A.",
  mat: "MDF 19mm 2440×1830",
  qty: -4,
  unit: "tábla",
  note: "JT-2426-0181 · Várdai"
}, {
  date: "2026-04-25 08:55",
  type: "Korr.",
  src: "Leltár",
  who: "Szabó A.",
  mat: "Csavar Spax 4×40",
  qty: -120,
  unit: "db",
  note: "Heti leltár"
}, {
  date: "2026-04-24 15:33",
  type: "Maradék",
  src: "CP-182-B",
  who: "Tóth K.",
  mat: "Tölgy 22mm 320×280",
  qty: +1,
  unit: "darab",
  note: "OC-007 sérült"
}, {
  date: "2026-04-24 14:00",
  type: "Kivét",
  src: "EB-180-1",
  who: "Kiss A.",
  mat: "ABS él 1mm fehér",
  qty: -120,
  unit: "fm",
  note: "JT-2426-0180 · élzárás"
}, {
  date: "2026-04-23 11:22",
  type: "Bevét",
  src: "PO-2426-087",
  who: "Raktár",
  mat: "Vasalat Blum CLIP top",
  qty: +200,
  unit: "db",
  note: "Blum szállítás"
}, {
  date: "2026-04-22 16:40",
  type: "Kivét",
  src: "CP-180-A",
  who: "Nagy J.",
  mat: "Bükk 18mm 2440×1830",
  qty: -5,
  unit: "tábla",
  note: "JT-2426-0180 · Hegyi"
}];
const MOV_TONE = {
  "Bevét": {
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    dot: "bg-emerald-500"
  },
  "Kivét": {
    bg: "bg-stone-100",
    fg: "text-stone-700",
    dot: "bg-stone-400"
  },
  "Maradék": {
    bg: "bg-sky-50",
    fg: "text-sky-700",
    dot: "bg-sky-500"
  },
  "Korr.": {
    bg: "bg-amber-50",
    fg: "text-amber-700",
    dot: "bg-amber-500"
  },
  "Selejt": {
    bg: "bg-rose-50",
    fg: "text-rose-700",
    dot: "bg-rose-500"
  },
  "Zóna": {
    bg: "bg-violet-50",
    fg: "text-violet-700",
    dot: "bg-violet-500"
  },
  "Mozgatás": {
    bg: "bg-indigo-50",
    fg: "text-indigo-700",
    dot: "bg-indigo-500"
  }
};
const MOV_TONE_DEFAULT = {
  bg: "bg-stone-100",
  fg: "text-stone-600",
  dot: "bg-stone-400"
};
const movTone = t => MOV_TONE[t] || MOV_TONE_DEFAULT;
function MovementDetailSlideOver({
  mov,
  onClose
}) {
  if (!mov) return null;
  const tone = movTone(mov.type);
  const kv = [{
    label: "Dátum",
    value: mov.date,
    mono: true
  }, {
    label: "Forrás / Cél",
    value: mov.src,
    mono: true,
    accent: true
  }, {
    label: "Felelős",
    value: mov.who
  }, {
    label: "Egység",
    value: mov.unit
  }];
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: true,
    onClose: onClose,
    title: mov.mat,
    subtitle: `Mozgás · ${mov.date}`,
    width: 440,
    footer: /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: onClose
    }, "Bez\xE1r\xE1s")
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-5 space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 p-4 rounded-xl border border-stone-200/80 bg-stone-50/50"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[12px] font-medium ${tone.bg} ${tone.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
  }), mov.type), /*#__PURE__*/React.createElement("div", {
    className: `text-[26px] font-semibold font-mono tabular-nums leading-none ${mov.qty > 0 ? "text-emerald-700" : "text-stone-800"}`
  }, mov.qty > 0 ? "+" : "", mov.qty, /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-normal text-stone-400 ml-1"
  }, mov.unit))), /*#__PURE__*/React.createElement("dl", {
    className: "border border-stone-200/70 rounded-xl overflow-hidden divide-y divide-stone-100"
  }, kv.map(row => /*#__PURE__*/React.createElement("div", {
    key: row.label,
    className: "flex items-center justify-between gap-4 px-4 py-3"
  }, /*#__PURE__*/React.createElement("dt", {
    className: "text-[12px] text-stone-500"
  }, row.label), /*#__PURE__*/React.createElement("dd", {
    className: `text-[12.5px] font-medium text-right ${row.mono ? "font-mono" : ""} ${row.accent ? "text-teal-700" : "text-stone-900"}`
  }, row.value)))), mov.note && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-700 leading-relaxed p-3 rounded-lg bg-stone-50 border border-stone-100"
  }, mov.note))));
}
function MovementsPage() {
  const MOVEMENTS = useSim().movements;
  const [filter, setFilter] = useStateW2("all");
  const [range, setRange] = useStateW2("week");
  const [search, setSearch] = useStateW2("");
  const [openMov, setOpenMov] = useStateW2(null);
  const types = [{
    key: "all",
    label: "Összes",
    count: MOVEMENTS.length
  }, {
    key: "Bevét",
    label: "Bevét",
    count: MOVEMENTS.filter(m => m.type === "Bevét").length
  }, {
    key: "Kivét",
    label: "Kivét",
    count: MOVEMENTS.filter(m => m.type === "Kivét").length
  }, {
    key: "Maradék",
    label: "Maradék",
    count: MOVEMENTS.filter(m => m.type === "Maradék").length
  }, {
    key: "Korr.",
    label: "Korrekció",
    count: MOVEMENTS.filter(m => m.type === "Korr.").length
  }];
  const filtered = MOVEMENTS.filter(m => {
    if (filter !== "all" && m.type !== filter) return false;
    if (search && !m.mat.toLowerCase().includes(search.toLowerCase()) && !m.src.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Summary cards
  const totals = {
    in: MOVEMENTS.filter(m => m.type === "Bevét").length,
    out: MOVEMENTS.filter(m => m.type === "Kivét").length,
    off: MOVEMENTS.filter(m => m.type === "Maradék").length,
    adj: MOVEMENTS.filter(m => m.type === "Korr.").length
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3"
  }, [{
    label: "Bevétek",
    value: totals.in,
    sub: "e héten",
    tone: "text-emerald-700"
  }, {
    label: "Kivétek",
    value: totals.out,
    sub: "gyártásba",
    tone: "text-stone-900"
  }, {
    label: "Maradékok",
    value: totals.off,
    sub: "raktárba",
    tone: "text-sky-700"
  }, {
    label: "Korrekciók",
    value: totals.adj,
    sub: "leltárból",
    tone: "text-amber-700"
  }].map(s => /*#__PURE__*/React.createElement(Card, {
    key: s.label,
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, s.label), /*#__PURE__*/React.createElement("div", {
    className: `text-[28px] font-semibold tracking-tight mt-1 tabular-nums ${s.tone}`
  }, s.value), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mt-1"
  }, s.sub)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, types.map(f => /*#__PURE__*/React.createElement("button", {
    key: f.key,
    onClick: () => setFilter(f.key),
    className: `px-3 h-8 rounded-lg text-[11.5px] font-medium border transition inline-flex items-center gap-1.5 ${filter === f.key ? "bg-stone-900 border-stone-900 text-white" : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"}`
  }, f.label, /*#__PURE__*/React.createElement("span", {
    className: `px-1.5 rounded text-[10px] tabular-nums ${filter === f.key ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"}`
  }, f.count))), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:block flex-1"
  }), /*#__PURE__*/React.createElement("select", {
    value: range,
    onChange: e => setRange(e.target.value),
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[11.5px] bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: "today"
  }, "Ma"), /*#__PURE__*/React.createElement("option", {
    value: "week"
  }, "Ezen a h\xE9ten"), /*#__PURE__*/React.createElement("option", {
    value: "month"
  }, "Ebben a h\xF3napban"), /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Mind")), /*#__PURE__*/React.createElement("div", {
    className: "relative flex-1 sm:flex-none min-w-[140px]"
  }, /*#__PURE__*/React.createElement("input", {
    value: search,
    onChange: e => setSearch(e.target.value),
    placeholder: "Anyag/hivatkoz\xE1s\u2026",
    className: "h-8 w-full sm:w-56 pl-8 pr-3 rounded-lg border border-stone-200 text-[12px] bg-white"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 13,
    className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
  }))), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[140px_120px_minmax(0,1fr)_110px_120px_140px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50 font-medium"
  }, /*#__PURE__*/React.createElement("div", null, "D\xE1tum"), /*#__PURE__*/React.createElement("div", null, "T\xEDpus"), /*#__PURE__*/React.createElement("div", null, "Anyag"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Mennyis\xE9g"), /*#__PURE__*/React.createElement("div", null, "Hivatkoz\xE1s"), /*#__PURE__*/React.createElement("div", null, "Felel\u0151s")), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-12 text-center text-[12px] text-stone-500"
  }, "Nincs tal\xE1lat a megadott sz\u0171r\u0151kre."), filtered.map((r, i) => {
    const tone = movTone(r.type);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: () => setOpenMov(r),
      className: "grid grid-cols-[140px_120px_minmax(0,1fr)_110px_120px_140px] gap-3 px-5 py-3 border-b border-stone-50 last:border-0 hover:bg-stone-50/40 cursor-pointer items-center text-[12px]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-mono text-stone-500 text-[11px]"
    }, r.date), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${tone.bg} ${tone.fg}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
    }), r.type)), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-stone-900 truncate font-medium"
    }, r.mat), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 truncate"
    }, r.note)), /*#__PURE__*/React.createElement("div", {
      className: `text-right font-mono tabular-nums font-semibold ${r.qty > 0 ? "text-emerald-700" : "text-stone-700"}`
    }, r.qty > 0 ? "+" : "", r.qty, /*#__PURE__*/React.createElement("span", {
      className: "font-normal text-[10px] text-stone-400 ml-1"
    }, r.unit)), /*#__PURE__*/React.createElement("div", {
      className: "font-mono text-[11px] text-teal-700 truncate"
    }, r.src), /*#__PURE__*/React.createElement("div", {
      className: "text-stone-600 text-[11.5px] truncate"
    }, r.who));
  })), /*#__PURE__*/React.createElement("div", {
    className: "md:hidden divide-y divide-stone-100"
  }, filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[12px] text-stone-500"
  }, "Nincs tal\xE1lat a megadott sz\u0171r\u0151kre."), filtered.map((r, i) => {
    const tone = movTone(r.type);
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => setOpenMov(r),
      className: "w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-stone-50/60 active:bg-stone-100/60 transition"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: `shrink-0 inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10px] font-medium ${tone.bg} ${tone.fg}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
    }), r.type), /*#__PURE__*/React.createElement("span", {
      className: "text-[13.5px] font-medium text-stone-900 truncate"
    }, r.mat)), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 font-mono mt-0.5 truncate"
    }, r.date, " \xB7 ", r.src)), /*#__PURE__*/React.createElement("span", {
      className: `font-mono tabular-nums text-[13px] font-semibold shrink-0 ${r.qty > 0 ? "text-emerald-700" : "text-stone-700"}`
    }, r.qty > 0 ? "+" : "", r.qty, /*#__PURE__*/React.createElement("span", {
      className: "font-normal text-[10px] text-stone-400 ml-0.5"
    }, r.unit)), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 15,
      className: "text-stone-300 shrink-0"
    }));
  }))), /*#__PURE__*/React.createElement(MovementDetailSlideOver, {
    mov: openMov,
    onClose: () => setOpenMov(null)
  }));
}
window.ProductionDashboard = ProductionDashboard;
window.MovementsPage = MovementsPage;

// ──────────────────────────────────────────────────────────────────────────
// Warehouse Dashboard — Raktár → Áttekintés
// Katalógus-alapú készlet KPI-k, riasztások, legutóbbi mozgások, gyorslinkek
// ──────────────────────────────────────────────────────────────────────────
function WarehouseDashboard({
  onScreen
}) {
  const sim = useSim();
  const stock = (sim.catalog || []).filter(it => it.active !== false && it.worldExt && it.worldExt.warehouse && !it.worldExt.warehouse.archived);
  const movements = sim.movements || [];
  const critical = stock.filter(it => it.worldExt.warehouse.trend === "critical");
  const low = stock.filter(it => it.worldExt.warehouse.trend === "low");
  const ok = stock.filter(it => (it.worldExt.warehouse.trend || "ok") === "ok");
  const alerts = [...critical, ...low];

  // Becsült raktárérték
  const totalValue = stock.reduce((a, it) => a + (it.worldExt.warehouse.onHand || 0) * (it.price || 0), 0);
  const fmtVal = totalValue >= 1e6 ? (totalValue / 1e6).toFixed(1) + "M" : Math.round(totalValue / 1000) + "e";
  const recent = movements.slice(0, 5);
  const trendDot = {
    ok: "bg-teal-500",
    low: "bg-amber-500",
    critical: "bg-rose-500"
  };
  const trendLabel = {
    ok: "Rendben",
    low: "Alacsony",
    critical: "Kritikus"
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3"
  }, [{
    label: "Nyilvántartott",
    value: stock.length,
    sub: "katalógus tétel",
    tone: "text-stone-900"
  }, {
    label: "Riasztás",
    value: alerts.length,
    sub: "alacsony / kritikus",
    tone: alerts.length ? "text-amber-700" : "text-stone-900"
  }, {
    label: "Kritikus",
    value: critical.length,
    sub: "azonnali beavatkozás",
    tone: critical.length ? "text-rose-700" : "text-stone-900"
  }, {
    label: "Becsült érték",
    value: fmtVal + " Ft",
    sub: "raktáron",
    tone: "text-stone-900"
  }].map(c => /*#__PURE__*/React.createElement(Card, {
    key: c.label,
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, c.label), /*#__PURE__*/React.createElement("div", {
    className: `text-[28px] font-semibold tracking-tight mt-1 tabular-nums ${c.tone}`
  }, c.value), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mt-1"
  }, c.sub)))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-12 gap-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "lg:col-span-7 p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-3 border-b border-stone-200/80 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "Ut\xE1nrendel\xE9st ig\xE9nyel"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("inventory"),
    className: "text-[11.5px] text-teal-600 font-medium hover:underline"
  }, "K\xE9szlet kezel\xE9se \u2192")), alerts.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-10 text-center text-[12px] text-stone-400"
  }, "Minden t\xE9tel a minimum szint felett van. \uD83D\uDC4D"), alerts.map(it => {
    const wh = it.worldExt.warehouse;
    const pct = Math.min(100, (wh.onHand || 0) / Math.max(1, (wh.min || 0) * 2) * 100);
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      className: "px-4 md:px-5 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-2 h-2 rounded-full shrink-0 ${trendDot[wh.trend]}`
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900 truncate"
    }, it.name), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mt-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden max-w-[160px]"
    }, /*#__PURE__*/React.createElement("div", {
      className: `h-full rounded-full ${wh.trend === "critical" ? "bg-rose-500" : "bg-amber-500"}`,
      style: {
        width: `${pct}%`
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-400 tabular-nums"
    }, "min. ", wh.min))), /*#__PURE__*/React.createElement("div", {
      className: "text-right shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[14px] font-semibold tabular-nums text-stone-900"
    }, wh.onHand, /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-stone-400 font-normal ml-0.5"
    }, it.unit)), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] font-mono text-stone-400"
    }, wh.location || "—")));
  })), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-5 space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900 mb-3"
  }, "K\xE9szlet \xE1llapota"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, [{
    k: "ok",
    n: ok.length
  }, {
    k: "low",
    n: low.length
  }, {
    k: "critical",
    n: critical.length
  }].map(r => {
    const pct = stock.length ? r.n / stock.length * 100 : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: r.k,
      className: "flex items-center gap-2.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-2 h-2 rounded-full shrink-0 ${trendDot[r.k]}`
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[11.5px] text-stone-600 w-[58px] shrink-0"
    }, trendLabel[r.k]), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 h-2 bg-stone-100 rounded-full overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: `h-full rounded-full ${trendDot[r.k]}`,
      style: {
        width: `${pct}%`
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "text-[11.5px] tabular-nums text-stone-700 w-5 text-right"
    }, r.n));
  }))), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-200/80 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "Legut\xF3bbi mozg\xE1sok"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("movements"),
    className: "text-[11.5px] text-teal-600 font-medium hover:underline"
  }, "Mind \u2192")), recent.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-8 text-center text-[12px] text-stone-400"
  }, "Nincs mozg\xE1s."), recent.map((r, i) => {
    const tone = MOV_TONE[r.type] || {
      bg: "bg-stone-100",
      fg: "text-stone-700",
      dot: "bg-stone-400"
    };
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "px-4 py-2.5 border-b border-stone-50 last:border-0 flex items-center gap-2.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: `shrink-0 inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10px] font-medium ${tone.bg} ${tone.fg}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
    }), r.type), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] text-stone-800 truncate flex-1 min-w-0"
    }, r.mat), /*#__PURE__*/React.createElement("span", {
      className: `font-mono tabular-nums text-[12px] font-semibold shrink-0 ${r.qty > 0 ? "text-emerald-700" : "text-stone-700"}`
    }, r.qty > 0 ? "+" : "", r.qty));
  })))));
}
window.WarehouseDashboard = WarehouseDashboard;
})();
