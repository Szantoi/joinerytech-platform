/* AUTO-GENERATED from page-supervisor.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// ÜZEMVEZETŐ (dispatch torony) — a gyártás-floor „toló" oldala.
//   A Műhely-terminál (operátor) HÚZZA a feladatot; az üzemvezető ITT TOLJA ki:
//   állomásokra oszt, figyeli a terhelést/szűk keresztmetszetet, a termelékenységet
//   és az élő műhely-státuszt. Élő `prodTasks` store + `ProdSchedEngine` (számított).
//   NEM duplikálja az Ütemezést (heti vászon) — az assignmentre + monitoringra fókuszál.
//
// Scope: `sup`-prefixű nevek; Icon/useSim/PROD_*/ProdSchedEngine/ProdTaskDetail/SlideOver.
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateSup
} = React;
const supToday = () => window.PROD_TODAY || "2026-04-28";

// ── KPI kártya ───────────────────────────────────────────────────────────
function SupKpi({
  label,
  value,
  sub,
  tone = "slate",
  icon
}) {
  const tones = {
    slate: "bg-slate-50 text-slate-600",
    teal: "bg-teal-50 text-teal-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    sky: "bg-sky-50 text-sky-600"
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-8 h-8 rounded-lg grid place-items-center ${tones[tone] || tones.slate}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[22px] font-semibold text-stone-900 leading-none tabular-nums"
  }, value)), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-700 mt-2.5"
  }, label), sub && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-0.5"
  }, sub));
}

// ── SlideOver host a feladat-részlethez (újrahasznosítva) ────────────────
function SupDetailHost({
  openId,
  setOpen
}) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const task = openId ? (sim.prodTasks || []).find(x => x.id === openId) : null;
  const onClose = () => setOpen(null);
  return /*#__PURE__*/React.createElement(SO, {
    open: !!task,
    onClose: onClose,
    title: task ? task.title : "",
    subtitle: task ? `${task.id} · ${task.order || "—"}` : "",
    width: 560
  }, task && window.ProdTaskDetail ? /*#__PURE__*/React.createElement(window.ProdTaskDetail, {
    task: task,
    onClose: onClose
  }) : null);
}

// ── Állomás élő-státusz kártya (dashboard) ───────────────────────────────
function SupStationCard({
  st,
  tasks,
  onOpen
}) {
  const E = window.ProdSchedEngine;
  const today = supToday();
  const running = tasks.find(t => t.machineId === st.id && t.running);
  const inProgress = tasks.find(t => t.machineId === st.id && t.status === "folyamatban");
  const cur = running || inProgress;
  const load = E ? E.dayLoad(tasks, st.id, today) : 0;
  const over = E ? E.isOverloaded(tasks, st.id, today) : false;
  const pct = Math.min(100, Math.round(load / st.dailyHours * 100));
  const queued = tasks.filter(t => t.machineId === st.id && t.status === "utemezve").length;
  const m = (window.PROD_KINDS || {})[st.kind] || {};
  const state = cur ? "Fut" : load > 0 ? "Ütemezve" : "Szabad";
  const stateCls = cur ? "bg-emerald-100 text-emerald-700" : load > 0 ? "bg-sky-100 text-sky-700" : "bg-stone-100 text-stone-500";
  return /*#__PURE__*/React.createElement("div", {
    className: `bg-white rounded-2xl border p-4 ${over ? "border-rose-300" : "border-stone-200"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-9 h-9 rounded-xl grid place-items-center shrink-0",
    style: {
      background: (m.accent || "#999") + "1a",
      color: m.accent
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "factory",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 leading-tight truncate"
  }, st.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, (window.PROD_KINDS[st.kind] || {}).label, " \xB7 ", st.facility))), /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${stateCls}`
  }, cur && /*#__PURE__*/React.createElement("span", {
    className: "inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse align-middle"
  }), state)), cur ? /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(cur.id),
    className: "mt-3 w-full text-left rounded-xl border border-stone-200 hover:border-emerald-300 p-2.5 bg-stone-50/50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-800 truncate"
  }, cur.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mt-0.5 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 11
  }), cur.assignee || "nincs operátor", cur.running && /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-600 font-medium"
  }, "\xB7 dolgozik"))) : /*#__PURE__*/React.createElement("div", {
    className: "mt-3 text-[11.5px] text-stone-400 rounded-xl border border-dashed border-stone-200 p-2.5 text-center"
  }, queued ? `${queued} feladat ütemezve` : "Nincs aktív feladat"), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[10px] mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "Mai terhel\xE9s"), /*#__PURE__*/React.createElement("span", {
    className: over ? "text-rose-600 font-semibold" : "text-stone-500 font-medium"
  }, load, "/", st.dailyHours, " \xF3", over ? " · túlterhelt" : "")), /*#__PURE__*/React.createElement("div", {
    className: "h-1.5 rounded-full bg-stone-100 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full rounded-full ${over ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-teal-500"}`,
    style: {
      width: `${pct}%`
    }
  }))));
}

// ──────────────────────────────────────────────────────────────────────────
// 1) ÁTTEKINTÉS — élő műhely-státusz
// ──────────────────────────────────────────────────────────────────────────
function SupervisorDashboard({
  onScreen
}) {
  const sim = useSim();
  const tasks = sim.prodTasks || [];
  const E = window.ProdSchedEngine;
  const stations = window.PROD_STATIONS || [];
  const [openId, setOpenId] = useStateSup(null);
  const monday = window.PROD_WEEK_MONDAY;
  const today = supToday();
  const running = stations.filter(st => tasks.some(t => t.machineId === st.id && (t.running || t.status === "folyamatban"))).length;
  const idle = stations.length - running;
  const blocked = tasks.filter(t => t.status === "blokkolt");
  const backlog = E ? E.unscheduled(tasks) : [];
  const conflicts = E ? E.conflicts(tasks, monday) : [];
  const todayLoad = stations.reduce((s, st) => s + (E ? E.dayLoad(tasks, st.id, today) : 0), 0);
  const todayCap = stations.reduce((s, st) => s + st.dailyHours, 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1500px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-1"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-slate-600 font-medium"
  }, "\xDCzemvezet\u0151 \xB7 dispatch"), /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "\xC9l\u0151 m\u0171hely-st\xE1tusz"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, today, " \xB7 ", stations.length, " \xE1llom\xE1s \xB7 ", running, " fut, ", idle, " szabad")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("dispatch"),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "workflow",
    size: 15
  }), "Diszp\xE9cser-t\xE1bla")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 my-4"
  }, /*#__PURE__*/React.createElement(SupKpi, {
    label: "Fut",
    value: running,
    sub: "akt\xEDv \xE1llom\xE1s",
    tone: "emerald",
    icon: "factory"
  }), /*#__PURE__*/React.createElement(SupKpi, {
    label: "Szabad",
    value: idle,
    sub: "r\xE1\xE9r\u0151 \xE1llom\xE1s",
    tone: "slate",
    icon: "settings"
  }), /*#__PURE__*/React.createElement(SupKpi, {
    label: "Kioszt\xE1sra v\xE1r",
    value: backlog.length,
    sub: "v\xE1r\xF3lista",
    tone: "amber",
    icon: "orders"
  }), /*#__PURE__*/React.createElement(SupKpi, {
    label: "Blokkolt",
    value: blocked.length,
    sub: "akad\xE1ly",
    tone: blocked.length ? "rose" : "slate",
    icon: "alert"
  }), /*#__PURE__*/React.createElement(SupKpi, {
    label: "Mai kihaszn\xE1lts\xE1g",
    value: `${todayCap ? Math.round(todayLoad / todayCap * 100) : 0}%`,
    sub: `${todayLoad}/${todayCap} ó`,
    tone: "sky",
    icon: "analytics"
  }), /*#__PURE__*/React.createElement(SupKpi, {
    label: "\xDCtk\xF6z\xE9s (h\xE9t)",
    value: conflicts.length,
    sub: "t\xFAlterhelt g\xE9p-nap",
    tone: conflicts.length ? "rose" : "slate",
    icon: "alert"
  })), blocked.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 rounded-2xl border border-rose-200 bg-rose-50/60 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 15,
    className: "text-rose-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-rose-800"
  }, "Beavatkoz\xE1st ig\xE9nyel \u2014 blokkolt feladatok (", blocked.length, ")")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, blocked.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => setOpenId(t.id),
    className: "inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 hover:shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] font-medium text-stone-800"
  }, t.title), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-rose-500"
  }, t.log && t.log[t.log.length - 1] && t.log[t.log.length - 1].text || "blokkolt"))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
  }, stations.map(st => /*#__PURE__*/React.createElement(SupStationCard, {
    key: st.id,
    st: st,
    tasks: tasks,
    onOpen: setOpenId
  }))), /*#__PURE__*/React.createElement(SupDetailHost, {
    openId: openId,
    setOpen: setOpenId
  }));
}

// ── Diszpécser feladat-kártya (húzható) ──────────────────────────────────
function SupDispatchCard({
  task,
  onOpen,
  onDragStart
}) {
  const sim = useSim();
  const m = (window.PROD_KINDS || {})[task.kind] || {};
  const st = (window.PROD_STATUS || {})[task.status] || {};
  const urgent = (task.prio || 0) > 0;
  return /*#__PURE__*/React.createElement("div", {
    draggable: true,
    onDragStart: e => onDragStart(e, task.id),
    className: `group rounded-xl border bg-white p-2.5 cursor-grab active:cursor-grabbing hover:shadow-sm ${urgent ? "border-rose-300 ring-1 ring-rose-200" : "border-stone-200"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full shrink-0",
    style: {
      background: m.accent
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(task.id),
    className: "text-[12px] font-semibold text-stone-800 truncate flex-1 text-left hover:underline"
  }, task.title), /*#__PURE__*/React.createElement("button", {
    onClick: () => sim.setProdTaskPrio(task.id, urgent ? 0 : 1),
    title: "S\xFCrg\u0151s",
    className: `shrink-0 ${urgent ? "text-rose-500" : "text-stone-300 hover:text-rose-400"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 13
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap pl-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border px-1.5 h-5 text-[9.5px] font-medium ${st.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1 h-1 rounded-full ${st.dot}`
  }), st.label), /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-stone-400"
  }, task.hours, " \xF3"), task.assignee && /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-stone-500 inline-flex items-center gap-0.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 9
  }), task.assignee.split(" ")[0]), task.running && /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-emerald-600 font-medium"
  }, "fut")));
}

// ──────────────────────────────────────────────────────────────────────────
// 2) DISZPÉCSER-TÁBLA — húzd-rá kiosztás (állomás-oszlopok + várólista)
// ──────────────────────────────────────────────────────────────────────────
function SupervisorDispatch() {
  const sim = useSim();
  const tasks = sim.prodTasks || [];
  const E = window.ProdSchedEngine;
  const stations = window.PROD_STATIONS || [];
  const [openId, setOpenId] = useStateSup(null);
  const [dragId, setDragId] = useStateSup(null);
  const [overCol, setOverCol] = useStateSup(null);
  const today = supToday();
  const onDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", id);
    } catch (x) {}
  };
  const dropToStation = stId => {
    if (dragId) {
      const t = tasks.find(x => x.id === dragId);
      sim.scheduleProdTask(dragId, {
        machineId: stId,
        date: t && t.date || today,
        hours: t ? t.hours : 4
      });
    }
    setDragId(null);
    setOverCol(null);
  };
  const dropToBacklog = () => {
    if (dragId) sim.unscheduleProdTask(dragId);
    setDragId(null);
    setOverCol(null);
  };
  const sortCards = list => list.slice().sort((a, b) => (b.prio || 0) - (a.prio || 0) || (a.running ? -1 : 1));
  const backlog = sortCards(tasks.filter(t => !t.machineId && t.status !== "kesz"));
  const Column = ({
    id,
    header,
    list,
    onDrop,
    over,
    capacity
  }) => /*#__PURE__*/React.createElement("div", {
    onDragOver: e => {
      e.preventDefault();
      setOverCol(id);
    },
    onDragLeave: () => setOverCol(c => c === id ? null : c),
    onDrop: e => {
      e.preventDefault();
      onDrop();
    },
    className: `w-[230px] shrink-0 rounded-2xl border ${over ? "border-slate-400 bg-slate-50" : "border-stone-200 bg-stone-50/40"} flex flex-col max-h-[calc(100vh-220px)]`
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2.5 border-b border-stone-200/70 sticky top-0"
  }, header), /*#__PURE__*/React.createElement("div", {
    className: "p-2 space-y-2 overflow-y-auto flex-1"
  }, list.length ? list.map(t => /*#__PURE__*/React.createElement(SupDispatchCard, {
    key: t.id,
    task: t,
    onOpen: setOpenId,
    onDragStart: onDragStart
  })) : /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-300 text-center py-6"
  }, "h\xFAzz ide feladatot")));
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1700px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-slate-600 font-medium"
  }, "\xDCzemvezet\u0151 \xB7 dispatch"), /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Diszp\xE9cser-t\xE1bla"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "H\xFAzd a feladatot egy \xE1llom\xE1sra a kioszt\xE1shoz \xB7 \xE1llom\xE1sok k\xF6zt az \xE1tir\xE1ny\xEDt\xE1shoz \xB7 vissza a v\xE1r\xF3list\xE1ra a visszavon\xE1shoz. A ", /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 12,
    className: "inline text-rose-400"
  }), " ikon = s\xFCrg\u0151s.")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 overflow-x-auto pb-3"
  }, /*#__PURE__*/React.createElement(Column, {
    id: "__backlog",
    over: overCol === "__backlog",
    onDrop: dropToBacklog,
    header: /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "orders",
      size: 14,
      className: "text-amber-500"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] font-semibold text-stone-800"
    }, "Kioszt\xE1sra v\xE1r"), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-stone-400"
    }, "(", backlog.length, ")")),
    list: backlog
  }), stations.map(st => {
    const list = sortCards(tasks.filter(t => t.machineId === st.id && t.status !== "kesz"));
    const load = E ? E.dayLoad(tasks, st.id, today) : 0;
    const over = E ? E.isOverloaded(tasks, st.id, today) : false;
    const pct = Math.min(100, Math.round(load / st.dailyHours * 100));
    const m = (window.PROD_KINDS || {})[st.kind] || {};
    return /*#__PURE__*/React.createElement(Column, {
      key: st.id,
      id: st.id,
      over: overCol === st.id,
      onDrop: () => dropToStation(st.id),
      header: /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-1.5"
      }, /*#__PURE__*/React.createElement("span", {
        className: "w-2 h-2 rounded-full shrink-0",
        style: {
          background: m.accent
        }
      }), /*#__PURE__*/React.createElement("span", {
        className: "text-[12px] font-semibold text-stone-800 truncate flex-1"
      }, st.name), /*#__PURE__*/React.createElement("span", {
        className: "text-[9.5px] text-stone-400"
      }, list.length)), /*#__PURE__*/React.createElement("div", {
        className: "mt-1.5 h-1.5 rounded-full bg-stone-200/70 overflow-hidden"
      }, /*#__PURE__*/React.createElement("div", {
        className: `h-full rounded-full ${over ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-teal-500"}`,
        style: {
          width: `${pct}%`
        }
      })), /*#__PURE__*/React.createElement("div", {
        className: `text-[9px] mt-0.5 ${over ? "text-rose-600 font-semibold" : "text-stone-400"}`
      }, load, "/", st.dailyHours, " \xF3 ma", over ? " · túlterhelt" : "")),
      list: list
    });
  })), /*#__PURE__*/React.createElement(SupDetailHost, {
    openId: openId,
    setOpen: setOpenId
  }));
}

// ──────────────────────────────────────────────────────────────────────────
// 3) TERHELÉS — kapacitás és szűk keresztmetszet (heti)
// ──────────────────────────────────────────────────────────────────────────
function SupervisorLoad() {
  const sim = useSim();
  const tasks = sim.prodTasks || [];
  const E = window.ProdSchedEngine;
  const stations = window.PROD_STATIONS || [];
  const monday = window.PROD_WEEK_MONDAY;
  const days = E ? E.weekDays(monday) : [];
  const conflicts = E ? E.conflicts(tasks, monday) : [];
  const rows = stations.map(st => {
    let load = 0;
    let overDays = 0;
    days.forEach(d => {
      const l = E ? E.dayLoad(tasks, st.id, d.date) : 0;
      load += l;
      if (E && E.isOverloaded(tasks, st.id, d.date)) overDays++;
    });
    const cap = st.dailyHours * days.length;
    return {
      st,
      load,
      cap,
      pct: cap ? load / cap : 0,
      overDays
    };
  }).sort((a, b) => b.pct - a.pct);
  const bottleneck = rows.filter(r => r.overDays > 0 || r.pct >= 0.95);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-slate-600 font-medium"
  }, "\xDCzemvezet\u0151 \xB7 dispatch"), /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Terhel\xE9s & sz\u0171k keresztmetszet"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Heti kapacit\xE1s-kihaszn\xE1lts\xE1g \xE1llom\xE1sonk\xE9nt \xB7 ", days.length ? `${days[0].date} – ${days[days.length - 1].date}` : monday)), bottleneck.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "mb-4 rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 16,
    className: "text-rose-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-rose-800"
  }, "Sz\u0171k keresztmetszet")), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-rose-700"
  }, bottleneck.map(b => `${b.st.name} (${Math.round(b.pct * 100)}%${b.overDays ? `, ${b.overDays} túlterhelt nap` : ""})`).join(" · ")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-rose-600/80 mt-1"
  }, "Tehermentes\xEDt\xE9s: ir\xE1ny\xEDtsd \xE1t a feladatokat a ", /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("supervisor", "dispatch"),
    className: "underline font-medium"
  }, "diszp\xE9cser-t\xE1bl\xE1n"), ", vagy \xFCtemezd \xFAjra az ", /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("production", "schedule"),
    className: "underline font-medium"
  }, "\xDCtemez\xE9sben"), ".")) : /*#__PURE__*/React.createElement("div", {
    className: "mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16,
    className: "text-emerald-600"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-medium text-emerald-800"
  }, "Nincs sz\u0171k keresztmetszet \u2014 minden \xE1llom\xE1s a kapacit\xE1s\xE1n bel\xFCl.")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100"
  }, rows.map(({
    st,
    load,
    cap,
    pct,
    overDays
  }) => {
    const m = (window.PROD_KINDS || {})[st.kind] || {};
    const over = pct > 1 || overDays > 0;
    return /*#__PURE__*/React.createElement("div", {
      key: st.id,
      className: "p-3.5 flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-9 h-9 rounded-xl grid place-items-center shrink-0",
      style: {
        background: (m.accent || "#999") + "1a",
        color: m.accent
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon || "factory",
      size: 18
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[13px] font-semibold text-stone-800 truncate"
    }, st.name), /*#__PURE__*/React.createElement("span", {
      className: `text-[12px] font-semibold tabular-nums ${over ? "text-rose-600" : pct > 0.8 ? "text-amber-600" : "text-stone-600"}`
    }, Math.round(pct * 100), "%")), /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5 h-2 rounded-full bg-stone-100 overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: `h-full rounded-full ${over ? "bg-rose-500" : pct > 0.8 ? "bg-amber-500" : "bg-teal-500"}`,
      style: {
        width: `${Math.min(100, Math.round(pct * 100))}%`
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between text-[10px] text-stone-400 mt-1"
    }, /*#__PURE__*/React.createElement("span", null, (window.PROD_KINDS[st.kind] || {}).label, " \xB7 ", st.facility), /*#__PURE__*/React.createElement("span", null, load, "/", cap, " \xF3", overDays ? ` · ${overDays} túlterhelt nap` : ""))));
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 mt-2"
  }, "A teljes heti v\xE1szon (st\xE1ci\xF3 \xD7 nap, \xFCtemez\xE9s) a Gy\xE1rt\xE1s \u2192 ", /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("production", "schedule"),
    className: "underline"
  }, "\xDCtemez\xE9s"), " k\xE9perny\u0151n. ", conflicts.length, " g\xE9p-nap \xFCtk\xF6z\xE9s a h\xE9ten."));
}

// ──────────────────────────────────────────────────────────────────────────
// 4) TERMELÉKENYSÉG — operátoronkénti naplózott idő / hatékonyság
// ──────────────────────────────────────────────────────────────────────────
function SupervisorProductivity() {
  const sim = useSim();
  const tasks = sim.prodTasks || [];
  const E = window.ProdSchedEngine;
  const stats = E ? E.operatorStats(tasks) : [];
  const maxMin = Math.max(1, ...stats.map(o => o.minutes));
  const ops = window.PROD_OPERATORS || [];
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-slate-600 font-medium"
  }, "\xDCzemvezet\u0151 \xB7 dispatch"), /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Termel\xE9kenys\xE9g"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Napl\xF3zott t\xE9ny-munkaid\u0151 \xE9s hat\xE9konys\xE1g oper\xE1toronk\xE9nt \xB7 a t\xE9ny-id\u0151 a M\u0171hely-termin\xE1lon napl\xF3z\xF3dik.")), stats.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-8 text-center text-[13px] text-stone-400"
  }, "M\xE9g nincs napl\xF3zott munkaid\u0151.") : /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100"
  }, stats.map(o => {
    const eff = E.operatorEfficiency(o);
    const opMeta = ops.find(x => x.name === o.who) || {};
    return /*#__PURE__*/React.createElement("div", {
      key: o.who,
      className: "p-3.5 flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-10 h-10 rounded-full grid place-items-center text-[13px] font-bold text-white shrink-0",
      style: {
        background: "linear-gradient(135deg,#475569,#1e293b)"
      }
    }, opMeta.initials || o.who.split(" ").map(w => w[0]).join("")), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[13px] font-semibold text-stone-800 truncate"
    }, o.who, " ", o.active > 0 && /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium ml-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"
    }), "dolgozik")), /*#__PURE__*/React.createElement("span", {
      className: "text-[13px] font-semibold text-stone-900 tabular-nums shrink-0"
    }, E.fmtDuration(o.minutes))), /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5 h-2 rounded-full bg-stone-100 overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-full rounded-full bg-slate-500",
      style: {
        width: `${Math.round(o.minutes / maxMin * 100)}%`
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3 mt-1 text-[10.5px] text-stone-400"
    }, /*#__PURE__*/React.createElement("span", null, opMeta.role || "operátor"), /*#__PURE__*/React.createElement("span", null, "\xB7 ", o.done, " k\xE9sz"), eff != null && /*#__PURE__*/React.createElement("span", {
      className: eff >= 1 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"
    }, "\xB7 ", Math.round(eff * 100), "% hat\xE9konys\xE1g"))));
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 mt-2"
  }, "A hat\xE9konys\xE1g a terv-\xF3ra \xE9s a napl\xF3zott t\xE9ny-\xF3ra ar\xE1nya (>100% = a tervn\xE9l gyorsabb)."));
}
Object.assign(window, {
  SupervisorDashboard,
  SupervisorDispatch,
  SupervisorLoad,
  SupervisorProductivity
});
})();
