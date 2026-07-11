/* AUTO-GENERATED from page-workshop.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// MŰHELY-TERMINÁL — az „Üzem" (shopfloor) világ valódi tartalma (4.7-A folyt.)
//
// JIT-elv: az operátor CSAK a saját ÁLLOMÁSA feladatait lássa, és pontosan azt
// az információt, amivel dolgoznia kell. Az állomás-identitás profil-default +
// felülbírható választó (localStorage-ben őrzött). Élő `prodTasks` store-ból
// dolgozik (NEM a régi statikus SHOPFLOOR_QUEUE mockból), és a meglévő
// `window.TaskDetail` munka-felületet hasznosítja újra (idő-naplózás, folyamat-
// lánc, raktári kivét, gyártási rajz + verzió, etikett-szkennelés).
//
// Etikett-QR → „minden info betöltődik": a scan feloldja a munkadarab kódját egy
// feladatra és megnyitja a teljes kontextussal.
//
// Scope: `wk`-prefixű nevek; Icon/useSim/window.TaskDetail közvetlenül.
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateWk,
  useEffect: useEffectWk
} = React;
const WK_STATION_LS = "jt_wk_station";
const WK_OP_LS = "jt_wk_op";

// Állomások = művelet-típusok (PROD_KINDS). A CNC-s csak CNC-t lát.
function wkStations() {
  const order = window.PROD_KIND_ORDER || [];
  const meta = window.PROD_KINDS || {};
  return order.map(k => ({
    key: k,
    ...(meta[k] || {})
  }));
}
const wkLoad = (key, fb) => {
  try {
    return localStorage.getItem(key) || fb;
  } catch (e) {
    return fb;
  }
};
const wkSave = (key, val) => {
  try {
    localStorage.setItem(key, val);
  } catch (e) {}
};

// kód → feladat feloldás (etikett QR / munkadarab azonosító)
function wkResolveCode(tasks, raw) {
  const code = String(raw || "").trim().toLowerCase();
  if (!code) return null;
  return (tasks || []).find(t => String(t.id).toLowerCase() === code || String(t.order).toLowerCase() === code || String(t.id).toLowerCase().includes(code) || t.order && String(t.order).toLowerCase().includes(code)) || null;
}

// ── Operátor avatar ──────────────────────────────────────────────
function WkAvatar({
  op,
  size = 44
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-full grid place-items-center font-bold text-white shrink-0",
    style: {
      width: size,
      height: size,
      fontSize: size * 0.34,
      background: "linear-gradient(135deg,#0d9488,#115e59)"
    }
  }, op.initials);
}

// ── Állomás-kapu (JIT belépő) ────────────────────────────────────
function WkStationGate({
  onPick,
  current
}) {
  const sim = useSim();
  const tasks = sim.prodTasks || [];
  const stations = wkStations();
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-full flex flex-col items-center justify-center p-5 md:p-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-7"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] uppercase tracking-[0.22em] text-stone-400 font-medium mb-1"
  }, "\xDCzem \xB7 M\u0171hely-termin\xE1l"), /*#__PURE__*/React.createElement("h1", {
    className: "text-[26px] md:text-[30px] font-semibold text-stone-900"
  }, "Melyik \xE1llom\xE1s?"), /*#__PURE__*/React.createElement("p", {
    className: "text-[13px] text-stone-500 mt-1.5"
  }, "V\xE1laszd ki a munka\xE1llom\xE1st \u2014 csak az ide tartoz\xF3 feladatok jelennek meg.")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-[760px]"
  }, stations.map(st => {
    const active = tasks.filter(t => t.kind === st.key && t.status !== "kesz").length;
    const running = tasks.filter(t => t.kind === st.key && t.running).length;
    const isCur = current === st.key;
    return /*#__PURE__*/React.createElement("button", {
      key: st.key,
      onClick: () => onPick(st.key),
      className: `relative bg-white rounded-2xl border p-5 flex flex-col items-center gap-2.5 transition hover:shadow-sm ${isCur ? "border-teal-500 ring-2 ring-teal-500/20" : "border-stone-200 hover:border-teal-400"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-16 h-16 rounded-2xl grid place-items-center",
      style: {
        background: (st.accent || "#0d9488") + "1a",
        color: st.accent
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: st.icon || "factory",
      size: 30
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[16px] font-semibold text-stone-900"
    }, st.label), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 text-[12px]"
    }, /*#__PURE__*/React.createElement("span", {
      className: `font-medium ${active ? "text-teal-700" : "text-stone-400"}`
    }, active, " akt\xEDv"), running > 0 && /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-amber-600 font-medium"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
    }), running, " fut")));
  })));
}

// ── Operátor-választó lap ────────────────────────────────────────
function WkOperatorSheet({
  onPick,
  onClose
}) {
  const ops = window.PROD_OPERATORS || [];
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[70] flex items-end md:items-center justify-center",
    role: "dialog"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-stone-900/50",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full md:max-w-[520px] md:rounded-2xl rounded-t-2xl overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "Ki dolgozik?"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 grid grid-cols-1 sm:grid-cols-2 gap-2"
  }, ops.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.name,
    onClick: () => onPick(o),
    className: "flex items-center gap-3 p-3 rounded-xl border border-stone-200 hover:border-teal-400 hover:bg-teal-50/40 text-left transition"
  }, /*#__PURE__*/React.createElement(WkAvatar, {
    op: o,
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 truncate"
  }, o.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, o.role)))))));
}

// ── Etikett-szkennelő (kód → feladat betöltés) ───────────────────
function WkScanModal({
  onResolve,
  onClose
}) {
  const sim = useSim();
  const tasks = sim.prodTasks || [];
  const [code, setCode] = useStateWk("");
  const [err, setErr] = useStateWk(false);
  const tryResolve = c => {
    const t = wkResolveCode(tasks, c);
    if (t) {
      onResolve(t.id);
      onClose();
    } else setErr(true);
  };
  // pár élő kód gyors-gombnak
  const quick = tasks.filter(t => t.status !== "kesz").slice(0, 3);
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[70] flex items-end md:items-center justify-center",
    role: "dialog"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-stone-900/50",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full md:max-w-[440px] md:rounded-2xl rounded-t-2xl overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "Etikett beolvas\xE1sa"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative rounded-xl bg-stone-900 aspect-[4/3] grid place-items-center overflow-hidden"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "qr",
    size: 64,
    className: "text-stone-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-6 border-2 border-teal-400/70 rounded-lg"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute left-6 right-6 h-0.5 bg-teal-400 shadow-[0_0_12px_2px_rgba(45,212,191,0.7)]",
    style: {
      top: "50%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-2 inset-x-0 text-center text-[10.5px] text-stone-400"
  }, "A munkadarab QR-k\xF3dja minden inf\xF3t bet\xF6lt")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: code,
    onChange: e => {
      setCode(e.target.value);
      setErr(false);
    },
    placeholder: "K\xF3d k\xE9zi bevitele (pl. GT-2426-005)\u2026",
    className: `flex-1 h-10 px-3 rounded-lg border text-[13px] bg-white outline-none font-mono ${err ? "border-rose-400" : "border-stone-200 focus:border-teal-500"}`
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => tryResolve(code),
    disabled: !code.trim(),
    className: "h-10 px-4 rounded-lg bg-teal-600 text-white text-[13px] font-semibold disabled:opacity-40"
  }, "Bet\xF6lt")), err && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-rose-600"
  }, "Nincs ilyen munkadarab/feladat. Pr\xF3b\xE1ld a feladat- vagy rendel\xE9s-azonos\xEDt\xF3t."), quick.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-400 font-medium"
  }, "\xC9l\u0151 munkadarabok"), quick.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => {
      onResolve(t.id);
      onClose();
    },
    className: "w-full text-left px-3 py-2.5 rounded-lg border border-stone-200 hover:border-teal-300 hover:bg-teal-50/40 flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "qr",
    size: 16,
    className: "text-teal-600 shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] text-stone-800 flex-1 truncate"
  }, t.title), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] font-mono text-stone-400"
  }, t.id)))))));
}

// ── Feladat-kártya (állomás-sor) ─────────────────────────────────
function WkTaskCard({
  task,
  op,
  onOpen
}) {
  const sim = useSim();
  const E = window.ProdSchedEngine;
  const st = (window.PROD_STATUS || {})[task.status] || {};
  const station = E && E.stationById ? E.stationById(task.machineId) : null;
  const act = E ? E.taskActualMinutes(task) : 0;
  const mine = task.assignee === op.name;
  const unassigned = !task.assignee;
  // gyártási rajz kiadottság (figyelmeztető pötty)
  const docs = sim.docsFor ? sim.docsFor("order", task.order) : [];
  const rajz = docs.filter(d => d.type === "rajz");
  const DE = window.DocsEngine;
  let drawWarn = false,
    drawBlock = false;
  rajz.forEach(d => {
    const r = DE && DE.runtimeVersion(d);
    if (r && r.blocked) drawBlock = true;else if (r && !r.clear) drawWarn = true;
  });
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(task.id),
    className: "w-full text-left bg-white rounded-2xl border border-stone-200 p-4 hover:border-teal-400 hover:shadow-sm transition flex items-center gap-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 rounded-full border font-medium px-2 h-6 text-[11px] ${st.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${st.dot}`
  }), st.label), task.running && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[11px] text-teal-700 font-medium"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"
  }), "fut"), drawBlock && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[10.5px] text-rose-600 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 12
  }), "nincs kiadott rajz"), !drawBlock && drawWarn && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[10.5px] text-amber-600 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 12
  }), "rajz-rev\xEDzi\xF3")), /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 mt-1.5 leading-tight"
  }, task.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-0.5 truncate"
  }, task.order, " \xB7 ", task.customer), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-1.5 text-[10.5px] text-stone-400 flex-wrap"
  }, station && /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, station.name), /*#__PURE__*/React.createElement("span", null, "\xB7 ", task.hours, " \xF3 terv"), act > 0 && /*#__PURE__*/React.createElement("span", null, "\xB7 ", E.fmtDuration(act), " napl\xF3zva"), mine ? /*#__PURE__*/React.createElement("span", {
    className: "text-teal-600 font-medium"
  }, "\xB7 az eny\xE9m") : unassigned ? /*#__PURE__*/React.createElement("span", {
    className: "text-amber-600 font-medium"
  }, "\xB7 szabad") : /*#__PURE__*/React.createElement("span", null, "\xB7 ", task.assignee))), unassigned ? /*#__PURE__*/React.createElement("span", {
    onClick: e => {
      e.stopPropagation();
      if (sim.assignProdTask) sim.assignProdTask(task.id, op.name);
    },
    className: "shrink-0 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-teal-600 text-white text-[12.5px] font-semibold hover:bg-teal-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 15
  }), "Felveszem") : /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 20,
    className: "text-stone-300 shrink-0"
  }));
}

// ── Állomás-tábla (JIT munkalista) ───────────────────────────────
function WkStationBoard({
  station,
  op,
  onOpen,
  onSwitchStation,
  onSwitchOp,
  onExit
}) {
  const sim = useSim();
  const [scan, setScan] = useStateWk(false);
  const meta = (window.PROD_KINDS || {})[station] || {};
  const all = (sim.prodTasks || []).filter(t => t.kind === station);
  const mineActive = all.filter(t => t.assignee === op.name && ["folyamatban", "utemezve"].includes(t.status)).sort(a => a.running ? -1 : 1);
  const queue = all.filter(t => !["kesz", "blokkolt"].includes(t.status) && !(t.assignee === op.name && ["folyamatban", "utemezve"].includes(t.status)));
  const blocked = all.filter(t => t.status === "blokkolt");
  const done = all.filter(t => t.status === "kesz");
  const Section = ({
    label,
    list,
    tone
  }) => list.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: `text-[11px] uppercase tracking-wide font-medium mb-2 ${tone || "text-stone-400"}`
  }, label, " (", list.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, list.map(t => /*#__PURE__*/React.createElement(WkTaskCard, {
    key: t.id,
    task: t,
    op: op,
    onOpen: onOpen
  }))));
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 z-20 bg-stone-100/90 backdrop-blur border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[820px] mx-auto px-4 md:px-6 py-3 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-11 h-11 rounded-xl grid place-items-center shrink-0",
    style: {
      background: (meta.accent || "#0d9488") + "1a",
      color: meta.accent
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: meta.icon || "factory",
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold text-stone-900 leading-tight"
  }, meta.label || station, " ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-normal text-[13px]"
  }, "\xB7 \xE1llom\xE1s")), /*#__PURE__*/React.createElement("button", {
    onClick: onSwitchStation,
    className: "text-[11.5px] text-teal-700 font-medium inline-flex items-center gap-1 hover:underline"
  }, "\xC1llom\xE1sv\xE1lt\xE1s ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 12
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: onSwitchOp,
    className: "flex items-center gap-2 h-10 pl-1.5 pr-3 rounded-full border border-stone-200 bg-white hover:border-teal-300"
  }, /*#__PURE__*/React.createElement(WkAvatar, {
    op: op,
    size: 30
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-medium text-stone-800 hidden sm:block"
  }, op.name.split(" ")[0])), /*#__PURE__*/React.createElement("button", {
    onClick: onExit,
    title: "Kil\xE9p\xE9s",
    className: "w-10 h-10 grid place-items-center rounded-full border border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "logout",
    size: 17
  })))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-[820px] mx-auto px-4 md:px-6 py-4 space-y-5 pb-24"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setScan(true),
    className: "w-full h-14 rounded-2xl bg-stone-900 text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2.5 hover:bg-stone-800 active:scale-[.995] transition"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "qr",
    size: 20,
    className: "text-teal-400"
  }), "Etikett beolvas\xE1sa \u2014 munkadarab bet\xF6lt\xE9se"), mineActive.length === 0 && queue.length === 0 && blocked.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-center py-12 text-stone-400"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: meta.icon || "factory",
    size: 40,
    className: "mx-auto mb-2 opacity-40"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px]"
  }, "Nincs akt\xEDv feladat ezen az \xE1llom\xE1son.")), /*#__PURE__*/React.createElement(Section, {
    label: "Most ezen dolgozol",
    list: mineActive,
    tone: "text-teal-700"
  }), /*#__PURE__*/React.createElement(Section, {
    label: `Sorban — ${meta.label || station}`,
    list: queue
  }), /*#__PURE__*/React.createElement(Section, {
    label: "Blokkolt",
    list: blocked,
    tone: "text-rose-500"
  }), done.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "opacity-70"
  }, /*#__PURE__*/React.createElement(Section, {
    label: "Mai k\xE9sz",
    list: done,
    tone: "text-emerald-600"
  }))), scan && /*#__PURE__*/React.createElement(WkScanModal, {
    onResolve: onOpen,
    onClose: () => setScan(false)
  }));
}

// ── Terminál shell ───────────────────────────────────────────────
function WorkshopTerminal({
  onExit
}) {
  const stations = wkStations();
  const defStation = wkLoad(WK_STATION_LS, stations[0] && stations[0].key);
  const [station, setStation] = useStateWk(defStation);
  const [stage, setStage] = useStateWk(station ? "board" : "gate");
  const opName = wkLoad(WK_OP_LS, "");
  const initOp = (window.PROD_OPERATORS || []).find(o => o.name === opName) || (window.PROD_OPERATORS || [])[0];
  const [op, setOp] = useStateWk(initOp);
  const [opSheet, setOpSheet] = useStateWk(false);
  const [taskId, setTaskId] = useStateWk(null);
  const pickStation = k => {
    setStation(k);
    wkSave(WK_STATION_LS, k);
    setStage("board");
    setTaskId(null);
  };
  const pickOp = o => {
    setOp(o);
    wkSave(WK_OP_LS, o.name);
    setOpSheet(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-[calc(100vh-0px)] bg-stone-100/70"
  }, stage === "gate" || !station ? /*#__PURE__*/React.createElement(WkStationGate, {
    current: station,
    onPick: pickStation
  }) : taskId ? /*#__PURE__*/React.createElement("div", {
    className: "max-w-[820px] mx-auto"
  }, window.TaskDetail ? /*#__PURE__*/React.createElement(window.TaskDetail, {
    taskId: taskId,
    op: op,
    onBack: () => setTaskId(null)
  }) : /*#__PURE__*/React.createElement("div", {
    className: "p-6 text-stone-500"
  }, "A feladat-r\xE9szlet nem t\xF6lthet\u0151 be.")) : /*#__PURE__*/React.createElement(WkStationBoard, {
    station: station,
    op: op,
    onOpen: setTaskId,
    onSwitchStation: () => setStage("gate"),
    onSwitchOp: () => setOpSheet(true),
    onExit: onExit
  }), opSheet && /*#__PURE__*/React.createElement(WkOperatorSheet, {
    onPick: pickOp,
    onClose: () => setOpSheet(false)
  }));
}
window.WorkshopTerminal = WorkshopTerminal;
})();
