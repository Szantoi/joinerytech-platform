/* AUTO-GENERATED from page-prodsched.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-prodsched.jsx — GYÁRTÁSÜTEMEZÉS / VÉGES KAPACITÁS — Gyártás világ
//   Heti ütemező-vászon: stáció-sorok × nap-oszlopok, gép-nap kapacitás-sáv +
//   ÜTKÖZÉS-kiemelés (terhelés > kapacitás). Várólista-strip a be nem ütemezett
//   taskokkal. Task-részlet SlideOver: ütemezés (gép + nap + óra) + FSM.
//   Store: window.sim.prodTasks + akciók; ProdSchedEngine (terhelés/ütközés).
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateP
} = React;
function PsStatusPill({
  status,
  size = "md"
}) {
  const t = (window.PROD_STATUS || {})[status] || {
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
function PsKindBadge({
  kind,
  size = "md"
}) {
  const m = (window.PROD_KINDS || {})[kind] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-md border font-medium ${cls} ${m.pill}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "factory",
    size: size === "sm" ? 11 : 12
  }), m.label || kind);
}
function TaskChip({
  task,
  onOpen,
  compact
}) {
  const m = (window.PROD_KINDS || {})[task.kind] || {};
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(task.id),
    className: "w-full text-left rounded-lg border px-2 py-1.5 hover:shadow-sm transition",
    style: {
      borderColor: (m.accent || "#999") + "44",
      background: (m.accent || "#999") + "0f"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full shrink-0",
    style: {
      background: m.accent
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-semibold text-stone-800 truncate flex-1"
  }, task.title), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-500 shrink-0"
  }, task.hours, " \xF3")), !compact && /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] text-stone-400 truncate mt-0.5 pl-2.5"
  }, task.customer || task.order));
}
function PsDetailHost({
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
function ProductionSchedule() {
  const sim = useSim();
  const tasks = sim.prodTasks || [];
  const E = window.ProdSchedEngine;
  const [openId, setOpenId] = useStateP(null);
  const [newOpen, setNewOpen] = useStateP(false);
  const monday = window.PROD_WEEK_MONDAY;
  const days = E ? E.weekDays(monday) : [];
  const stations = window.PROD_STATIONS || [];
  const dates = days.map(d => d.date);
  const downMap = sim.prodDownMap ? sim.prodDownMap(dates) : {};
  const backlog = E ? E.unscheduled(tasks) : [];
  const conflicts = E ? E.conflicts(tasks, monday, downMap) : [];
  const util = E ? E.utilization(tasks, monday, downMap) : {
    pct: 0,
    load: 0,
    cap: 0
  };
  const activeCount = tasks.filter(t => ["utemezve", "folyamatban"].includes(t.status)).length;
  const blocked = tasks.filter(t => t.status === "blokkolt").length;
  const isConflict = (mid, date) => conflicts.some(c => c.machineId === mid && c.date === date);
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
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1600px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-1"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "\xDCtemez\xE9s"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "V\xE9ges kapacit\xE1s \u2014 g\xE9p-nap terhel\xE9s \xE9s \xFCtk\xF6z\xE9s \xB7 h\xE9t: ", days.length ? `${days[0].date} – ${days[days.length - 1].date}` : monday)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "\xDAj feladat")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 my-4"
  }, /*#__PURE__*/React.createElement(KPI, {
    label: "Akt\xEDv feladat",
    value: activeCount,
    sub: "\xFCtemezve / folyamatban",
    tone: "teal",
    icon: "factory"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Kapacit\xE1s-\xFCtk\xF6z\xE9s",
    value: conflicts.length,
    sub: "g\xE9p-nap t\xFAlterhel\xE9s / le\xE1ll\xE1s",
    tone: conflicts.length ? "rose" : "stone",
    icon: "alert"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Heti kihaszn\xE1lts\xE1g",
    value: `${Math.round(util.pct * 100)}%`,
    sub: `${util.load}/${util.cap} óra`,
    tone: "sky",
    icon: "analytics"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "V\xE1r\xF3lista",
    value: backlog.length,
    sub: "be nem \xFCtemezve",
    tone: "amber",
    icon: "orders"
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "orders",
    size: 15,
    className: "text-amber-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "V\xE1r\xF3lista"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400"
  }, "(", backlog.length, ")")), backlog.length ? /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 overflow-x-auto pb-1"
  }, backlog.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    className: "w-[200px] shrink-0"
  }, /*#__PURE__*/React.createElement(TaskChip, {
    task: t,
    onOpen: setOpenId
  })))) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 py-1"
  }, "Minden feladat be van \xFCtemezve. \uD83C\uDF89")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 880
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid border-b border-stone-200 bg-stone-50/60",
    style: {
      gridTemplateColumns: `180px repeat(${days.length}, 1fr)`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 text-[11px] font-semibold text-stone-500"
  }, "St\xE1ci\xF3"), days.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.date,
    className: "px-2 py-2 text-center border-l border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-semibold text-stone-700"
  }, d.dow), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, d.date.slice(5))))), stations.map(st => /*#__PURE__*/React.createElement("div", {
    key: st.id,
    className: "grid border-b border-stone-100 last:border-0",
    style: {
      gridTemplateColumns: `180px repeat(${days.length}, 1fr)`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 border-r border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-800 leading-tight"
  }, st.name), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-1"
  }, /*#__PURE__*/React.createElement(PsKindBadge, {
    kind: st.kind,
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-stone-400"
  }, st.dailyHours, " \xF3/nap"))), days.map(d => {
    const cellTasks = tasks.filter(t => t.machineId === st.id && t.date === d.date && ["utemezve", "folyamatban"].includes(t.status));
    const load = E ? E.dayLoad(tasks, st.id, d.date) : 0;
    const down = downMap[st.id + "|" + d.date];
    const over = isConflict(st.id, d.date);
    const pct = Math.min(100, Math.round(load / st.dailyHours * 100));
    return /*#__PURE__*/React.createElement("div", {
      key: d.date,
      title: down ? `Leállítva: ${down.reason}${down.woId ? " (" + down.woId + ")" : ""}` : undefined,
      style: down ? {
        background: "repeating-linear-gradient(45deg,#fff1f2,#fff1f2 6px,#ffe4e6 6px,#ffe4e6 12px)"
      } : undefined,
      className: `px-1.5 py-1.5 border-l border-stone-100 align-top min-h-[64px] ${down ? "" : over ? "bg-rose-50/60" : ""}`
    }, down && /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 mb-1 text-[9px] font-semibold text-rose-600"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: down.planned ? "shield" : "alert",
      size: 10
    }), down.planned ? "Karbantartás" : "Leállítva"), /*#__PURE__*/React.createElement("div", {
      className: "space-y-1"
    }, cellTasks.map(t => /*#__PURE__*/React.createElement(TaskChip, {
      key: t.id,
      task: t,
      onOpen: setOpenId,
      compact: true
    }))), down ? /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-[9px] text-rose-600 leading-tight"
    }, cellTasks.length ? `${load} ó ütemezve leállított gépre — tedd át!` : down.reason) : load > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-1.5 rounded-full bg-stone-100 overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: `h-full rounded-full ${over ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-teal-500"}`,
      style: {
        width: `${pct}%`
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: `text-[9px] mt-0.5 text-right ${over ? "text-rose-600 font-semibold" : "text-stone-400"}`
    }, load, "/", st.dailyHours, " \xF3", over ? " · túlterhelt" : "")));
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 mt-2 flex items-center gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block w-3 h-1.5 rounded-full bg-rose-500"
  }), " T\xFAlterhelt g\xE9p-nap (lek\xF6t\xF6tt > kapacit\xE1s)"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block w-3 h-3 rounded",
    style: {
      background: "repeating-linear-gradient(45deg,#fff1f2,#fff1f2 3px,#ffe4e6 3px,#ffe4e6 6px)"
    }
  }), " Le\xE1ll\xEDtott g\xE9p (karbantart\xE1s) \u2014 nem \xFCtemezhet\u0151"), /*#__PURE__*/React.createElement("span", null, "Koppints egy feladatra az \xFAjra\xFCtemez\xE9shez.")), (() => {
    const stats = E ? E.operatorStats(tasks) : [];
    if (!stats.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-2xl border border-stone-200 p-4 mt-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-800"
    }, "Termel\xE9kenys\xE9g \u2014 napl\xF3zott munkaid\u0151"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.navigateTo && window.navigateTo("tasks"),
      className: "text-[11.5px] text-teal-700 font-medium inline-flex items-center gap-1"
    }, "Feladataim ", /*#__PURE__*/React.createElement(Icon, {
      name: "external",
      size: 12
    }))), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
    }, stats.map(o => {
      const eff = E.operatorEfficiency(o);
      return /*#__PURE__*/React.createElement("div", {
        key: o.who,
        className: "rounded-xl border border-stone-100 bg-stone-50/50 p-3"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[12.5px] font-semibold text-stone-800"
      }, o.who), o.active > 0 && /*#__PURE__*/React.createElement("span", {
        className: "inline-flex items-center gap-1 text-[10px] text-teal-700 font-medium"
      }, /*#__PURE__*/React.createElement("span", {
        className: "w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"
      }), "fut")), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-3 mt-1.5 text-[11px] text-stone-500"
      }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
        className: "font-semibold text-stone-800 text-[13px]"
      }, E.fmtDuration(o.minutes)), " napl\xF3zva"), /*#__PURE__*/React.createElement("span", {
        className: "text-stone-300"
      }, "\xB7"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
        className: "font-semibold text-stone-800"
      }, o.done), " k\xE9sz"), eff != null && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
        className: "text-stone-300"
      }, "\xB7"), /*#__PURE__*/React.createElement("span", {
        className: eff >= 1 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"
      }, Math.round(eff * 100), "% hat\xE9konys\xE1g"))));
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 mt-2.5"
    }, "A t\xE9ny-id\u0151 a Feladat-termin\xE1lon napl\xF3z\xF3dik (start / sz\xFCnet / k\xE9sz). A hat\xE9konys\xE1g a terv-\xF3ra \xE9s a t\xE9ny-\xF3ra ar\xE1nya."));
  })(), /*#__PURE__*/React.createElement(PsDetailHost, {
    openId: openId,
    setOpen: setOpenId
  }), newOpen && window.NewProdTaskSheet && /*#__PURE__*/React.createElement(window.NewProdTaskSheet, {
    onClose: () => setNewOpen(false),
    onCreated: id => {
      setNewOpen(false);
      setOpenId(id);
    }
  }));
}
function ProdTaskDetail({
  task,
  onClose
}) {
  const sim = useSim();
  const live = (sim.prodTasks || []).find(x => x.id === task.id) || task;
  const E = window.ProdSchedEngine;
  const next = E ? E.nextStates(live) : [];
  const stations = window.PROD_STATIONS || [];
  const compatible = stations.filter(s => s.kind === live.kind);
  const others = stations.filter(s => s.kind !== live.kind);
  const [blockOpen, setBlockOpen] = useStateP(false);
  const [bReason, setBReason] = useStateP("");
  const days = E ? E.weekDays(window.PROD_WEEK_MONDAY) : [];
  const station = E ? E.stationById(live.machineId) : null;
  const load = E && live.machineId && live.date ? E.dayLoad(sim.prodTasks || [], live.machineId, live.date) : 0;
  const over = E && live.machineId && live.date ? E.isOverloaded(sim.prodTasks || [], live.machineId, live.date) : false;
  const downInfo = window.sim.prodDownMap && live.machineId && live.date ? window.sim.prodDownMap([live.date])[live.machineId + "|" + live.date] : null;
  const dayDown = window.sim.prodDownMap && live.date ? window.sim.prodDownMap([live.date]) : {};
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(PsKindBadge, {
    kind: live.kind
  }), /*#__PURE__*/React.createElement(PsStatusPill, {
    status: live.status
  })), live.note && /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-600"
  }, live.note), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3 flex items-center gap-3 text-[11.5px] text-stone-500 flex-wrap"
  }, live.order && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "orders",
    size: 13
  }), live.order), live.customer && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 13
  }), live.customer), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 13
  }), live.hours, " \xF3ra")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "\xDCtemez\xE9s"), live.machineId && live.date ? /*#__PURE__*/React.createElement("div", {
    className: `rounded-xl border p-3 mb-2 ${over || downInfo ? "border-rose-200 bg-rose-50" : "border-teal-200 bg-teal-50"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-800"
  }, station ? station.name : live.machineId, " \xB7 ", live.date), downInfo ? /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] mt-0.5 text-rose-600 font-medium"
  }, "\u26A0 A g\xE9p le\xE1ll\xEDtva (", downInfo.reason, downInfo.woId ? `, ${downInfo.woId}` : "", ") \u2014 ezen a napon nem \xFCtemezhet\u0151. Tedd \xE1t, vagy old fel a karbantart\xE1st.") : /*#__PURE__*/React.createElement("div", {
    className: `text-[11px] mt-0.5 ${over ? "text-rose-600 font-medium" : "text-stone-500"}`
  }, "G\xE9p-nap terhel\xE9s: ", load, "/", station ? station.dailyHours : 8, " \xF3ra", over ? " — túlterhelt!" : ""), downInfo && downInfo.woId && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("maintenance", "workorders"),
    className: "mt-1.5 text-[11px] text-cyan-700 font-medium inline-flex items-center gap-1"
  }, "Karbantart\xE1s: ", downInfo.woId, " ", /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 11
  }))) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 mb-2"
  }, "M\xE9g nincs \xFCtemezve (v\xE1r\xF3lista)."), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "St\xE1ci\xF3"), /*#__PURE__*/React.createElement("select", {
    value: live.machineId || "",
    onChange: e => window.sim.scheduleProdTask(live.id, {
      machineId: e.target.value || null,
      date: live.date || days[0] && days[0].date
    }),
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 v\xE1lassz \u2014"), /*#__PURE__*/React.createElement("optgroup", {
    label: "Aj\xE1nlott (m\u0171velet-egyez\u0151)"
  }, compatible.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name, dayDown[s.id + "|" + live.date] ? " ⚠ leállítva" : ""))), /*#__PURE__*/React.createElement("optgroup", {
    label: "Egy\xE9b st\xE1ci\xF3"
  }, others.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name, " (", (window.PROD_KINDS[s.kind] || {}).label, ")", dayDown[s.id + "|" + live.date] ? " ⚠ leállítva" : ""))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Nap"), /*#__PURE__*/React.createElement("select", {
    value: live.date || "",
    onChange: e => window.sim.scheduleProdTask(live.id, {
      date: e.target.value || null
    }),
    disabled: !live.machineId,
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 disabled:bg-stone-50"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014"), days.map(d => /*#__PURE__*/React.createElement("option", {
    key: d.date,
    value: d.date
  }, d.dow, " \xB7 ", d.date.slice(5))))), /*#__PURE__*/React.createElement("div", {
    className: "w-24"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "\xD3ra"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.5",
    value: live.hours,
    onChange: e => window.sim.setProdTaskHours(live.id, e.target.value),
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  }))), live.machineId && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.unscheduleProdTask(live.id),
    className: "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-stone-200 text-stone-500 text-[12px] font-medium hover:bg-stone-50 w-fit"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  }), "Vissza v\xE1r\xF3list\xE1ra"))), !(E && E.isTerminal(live)) && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "St\xE1tusz l\xE9ptet\xE9se"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, next.map(to => {
    const st = window.PROD_STATUS[to] || {};
    const done = to === "kesz",
      block = to === "blokkolt";
    if (block) return /*#__PURE__*/React.createElement("button", {
      key: to,
      onClick: () => setBlockOpen(true),
      className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-rose-500 text-white text-[12.5px] font-medium hover:bg-rose-600"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 14
    }), "Blokkol");
    return /*#__PURE__*/React.createElement("button", {
      key: to,
      onClick: () => window.sim.setProdTaskStatus(live.id, to),
      className: `inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${done ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-teal-600 text-white hover:bg-teal-700"}`
    }, done ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14
    }) : /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 14
    }), st.label);
  })), blockOpen && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-stone-600 font-medium block mb-1"
  }, "Blokkol\xE1s oka"), /*#__PURE__*/React.createElement("textarea", {
    value: bReason,
    onChange: e => setBReason(e.target.value),
    rows: 2,
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-stone-400",
    placeholder: "Pl. alapanyag-hi\xE1ny, g\xE9p \xE1ll\u2026"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.sim.setProdTaskStatus(live.id, "blokkolt", {
        reason: bReason
      });
      setBlockOpen(false);
      setBReason("");
    },
    className: "h-8 px-3 rounded-lg bg-rose-600 text-white text-[12px] font-medium"
  }, "Blokkol"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setBlockOpen(false),
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse")))), live.status === "kesz" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16,
    className: "text-emerald-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-emerald-800"
  }, "K\xE9sz")), (live.log || []).length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Napl\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, live.log.slice().reverse().map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-start gap-2 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-stone-300 mt-1.5 shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-mono text-[10.5px] shrink-0"
  }, l.at), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-600"
  }, l.text))))));
}
function NewProdTaskSheet({
  onClose,
  onCreated
}) {
  const sim = useSim();
  const [title, setTitle] = useStateP("");
  const [kind, setKind] = useStateP("szabaszat");
  const [order, setOrder] = useStateP("");
  const [hours, setHours] = useStateP(4);
  const [note, setNote] = useStateP("");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500";
  const orders = (sim.orders || []).filter(o => o.status !== "delivered");
  const create = () => {
    if (!title.trim()) return;
    const o = orders.find(x => x.id === order);
    const id = window.sim.addProdTask({
      title,
      kind,
      order,
      customer: o ? o.customer : "",
      hours,
      note
    });
    if (id && onCreated) onCreated(id);
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
  }, "\xDAj gy\xE1rt\xE1si feladat"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Megnevez\xE9s *"), /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "Pl. Bogn\xE1r konyha \u2014 korpusz szab\xE1s",
    className: cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "M\u0171velet"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, (window.PROD_KIND_ORDER || []).map(k => {
    const m = window.PROD_KINDS[k];
    const on = kind === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setKind(k),
      className: `inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11.5px] font-medium border ${on ? m.pill : "bg-white text-stone-500 border-stone-200"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 12
    }), m.label);
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Rendel\xE9s"), /*#__PURE__*/React.createElement("select", {
    value: order,
    onChange: e => setOrder(e.target.value),
    className: cls
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 nincs \u2014"), orders.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.id,
    value: o.id
  }, o.id, " \xB7 ", o.customer)))), /*#__PURE__*/React.createElement("div", {
    className: "w-24"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "\xD3ra"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.5",
    value: hours,
    onChange: e => setHours(e.target.value),
    className: cls
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("textarea", {
    value: note,
    onChange: e => setNote(e.target.value),
    rows: 2,
    placeholder: "R\xE9szletek\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  })), /*#__PURE__*/React.createElement("button", {
    disabled: !title.trim(),
    onClick: create,
    className: "w-full h-10 rounded-xl bg-teal-600 text-white text-[13px] font-semibold disabled:opacity-40"
  }, "Feladat l\xE9trehoz\xE1sa"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 text-center"
  }, "V\xE1r\xF3list\xE1ra ker\xFCl; az \xFCtemez\xE9s (g\xE9p + nap) a r\xE9szlet-n\xE9zetb\u0151l v\xE9gezhet\u0151."))));
}
Object.assign(window, {
  PsStatusPill,
  PsKindBadge,
  TaskChip,
  PsDetailHost,
  ProductionSchedule,
  ProdTaskDetail,
  NewProdTaskSheet
});
})();
