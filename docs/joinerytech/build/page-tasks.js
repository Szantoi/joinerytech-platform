/* AUTO-GENERATED from page-tasks.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-tasks.jsx — FELADATAIM világ (4.8-B1)
//   Szerep-független személyes munkafelület: minden világ feladat-tételeit
//   egy listába gyűjti (SZÁMÍTOTT — window.sim.unifiedTasks()). Nézet:
//   bejelentkezett felhasználó saját feladatai (+ Csapat nézet), kártya/lista
//   váltóval. A gyártási feladat detailje a Feladat-terminálból (idő-naplózás)
//   van újrahasználva; a többi forrás a saját világába deep-linkel.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateTk
} = React;
const _tkSurname = n => String(n || "").trim().split(/\s+/)[0].replace(/[.,]/g, "").toLowerCase();
const _tkInitials = n => (n || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
function TaskSourceBadge({
  source,
  size = "md"
}) {
  const m = (window.TASK_SOURCES || {})[source] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-md border font-medium ${cls}`,
    style: {
      background: (m.accent || "#888") + "14",
      color: m.accent || "#555",
      borderColor: (m.accent || "#888") + "33"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "orders",
    size: size === "sm" ? 11 : 12
  }), m.short || source);
}
function TaskDueBadge({
  daysLeft,
  size = "md"
}) {
  const t = window.taskDueTone ? window.taskDueTone(daysLeft) : null;
  if (!t) return null;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${t.pill}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 11
  }), t.label);
}
function TaskPrioDot({
  priority
}) {
  if (priority == null) return null;
  const p = (window.TASK_PRIO || {})[priority] || {};
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium px-1.5 h-5 text-[10px] ${p.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${p.dot}`
  }), p.label);
}

// ── Lista-sor ────────────────────────────────────────────────────
function TaskRow({
  item,
  onOpen
}) {
  const m = (window.TASK_SOURCES || {})[item.source] || {};
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(item),
    className: "w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg grid place-items-center shrink-0",
    style: {
      background: (m.accent || "#888") + "1a",
      color: m.accent
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "orders",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate mt-0.5"
  }, item.subtitle || item.statusLabel), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement(TaskSourceBadge, {
    source: item.source,
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[10px] px-1.5 h-5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-medium"
  }, item.statusLabel), /*#__PURE__*/React.createElement(TaskPrioDot, {
    priority: item.priority
  }), /*#__PURE__*/React.createElement(TaskDueBadge, {
    daysLeft: item.daysLeft,
    size: "sm"
  }))), item.owner && /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 hidden sm:flex flex-col items-end gap-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold text-white",
    style: {
      background: m.accent || "#888"
    }
  }, _tkInitials(item.owner))), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 16,
    className: "text-stone-300 shrink-0"
  }));
}

// ── Kártya (tablet-first) ────────────────────────────────────────
function TaskCardTk({
  item,
  onOpen
}) {
  const m = (window.TASK_SOURCES || {})[item.source] || {};
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(item),
    className: "text-left bg-white rounded-2xl border border-stone-200 p-4 hover:border-indigo-300 hover:shadow-sm transition flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement(TaskSourceBadge, {
    source: item.source
  }), /*#__PURE__*/React.createElement(TaskDueBadge, {
    daysLeft: item.daysLeft,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 leading-tight"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 truncate"
  }, item.subtitle), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-1 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[10px] px-1.5 h-5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-medium"
  }, item.statusLabel), /*#__PURE__*/React.createElement(TaskPrioDot, {
    priority: item.priority
  }), item.owner && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400"
  }, "\xB7 ", item.owner)));
}

// ── Generikus részlet (nem-gyártás források) — info + deep-link ───
function GenericTaskDetail({
  item,
  onClose
}) {
  const sim = useSim();
  const m = (window.TASK_SOURCES || {})[item.source] || {};
  const goWorld = () => {
    onClose();
    if (window.navigateTo) window.navigateTo(item.world, item.screen);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(TaskSourceBadge, {
    source: item.source
  }), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[11px] px-2 h-6 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-medium"
  }, item.statusLabel), /*#__PURE__*/React.createElement(TaskPrioDot, {
    priority: item.priority
  }), /*#__PURE__*/React.createElement(TaskDueBadge, {
    daysLeft: item.daysLeft
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900"
  }, item.title), item.subtitle && /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, item.subtitle)), item.owner && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3 flex items-center gap-2 text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 14,
    className: "text-stone-400"
  }), "Felel\u0151s: ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-800"
  }, item.owner)), item.quick === "crmDone" && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.sim.toggleCrmTask && window.sim.toggleCrmTask(item.openId);
      onClose();
    },
    className: "w-full h-11 rounded-xl bg-emerald-600 text-white text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-emerald-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 17
  }), "Feladat k\xE9sz"), item.quick === "approve" && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.sim.decideApproval(item.approvalId, true);
      onClose();
    },
    className: "h-11 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-emerald-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16
  }), "J\xF3v\xE1hagy"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const r = window.prompt("Elutasítás oka (opcionális):") || "";
      window.sim.decideApproval(item.approvalId, false, {
        reason: r
      });
      onClose();
    },
    className: "h-11 rounded-xl bg-white border border-rose-200 text-rose-600 text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-rose-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }), "Elutas\xEDt")), /*#__PURE__*/React.createElement("button", {
    onClick: goWorld,
    className: "w-full h-11 rounded-xl bg-indigo-600 text-white text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-indigo-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "external",
    size: 17
  }), "Megnyit\xE1s \u2014 ", m.label, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 text-center"
  }, "A t\xE9tel teljes kezel\xE9se (\xE1llapot-l\xE9ptet\xE9s, r\xE9szletek) a ", m.label, " vil\xE1gban."));
}

// ── Fő világ ─────────────────────────────────────────────────────
function TasksWorld() {
  const sim = useSim();
  const all = sim.unifiedTasks ? sim.unifiedTasks() : [];
  const me = sim.currentWorkerName ? sim.currentWorkerName() : "";
  const people = sim.taskPeople ? sim.taskPeople() : [];
  const [scope, setScope] = useStateTk("mine");
  const [person, setPerson] = useStateTk(me);
  const [view, setView] = useStateTk("list");
  const [srcF, setSrcF] = useStateTk("all");
  const [openItem, setOpenItem] = useStateTk(null);
  const [prodOpen, setProdOpen] = useStateTk(null); // gyártási feladat full overlay

  let items = all.slice();
  if (scope === "mine") items = items.filter(t => t.owner && _tkSurname(t.owner) === _tkSurname(person));
  if (srcF !== "all") items = items.filter(t => t.source === srcF);
  items.sort((a, b) => {
    const ua = a.daysLeft != null && a.daysLeft <= 0 ? 1 : 0,
      ub = b.daysLeft != null && b.daysLeft <= 0 ? 1 : 0;
    if (ua !== ub) return ub - ua;
    if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
    const da = a.daysLeft == null ? 999 : a.daysLeft,
      db = b.daysLeft == null ? 999 : b.daysLeft;
    return da - db;
  });

  // KPI a SZŰRT halmazból
  const urgent = items.filter(t => t.daysLeft != null && t.daysLeft <= 0).length;
  const approvals = items.filter(t => t.source === "approval").length;
  // forrás-chipek a teljes (scope szerinti) halmazból
  const scopeItems = scope === "mine" ? all.filter(t => t.owner && _tkSurname(t.owner) === _tkSurname(person)) : all;
  const srcCounts = {};
  scopeItems.forEach(t => {
    srcCounts[t.source] = (srcCounts[t.source] || 0) + 1;
  });
  const open = item => {
    if (item.source === "prod") setProdOpen(item.openId);else setOpenItem(item);
  };
  const SO = window.SlideOver;
  const KPI = ({
    label,
    value,
    sub,
    tone,
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

  // gyártási feladat full overlay (újrahasznosított terminál-detail)
  if (prodOpen && window.TaskDetail) {
    const opName = scope === "mine" ? person : ((sim.prodTasks || []).find(t => t.id === prodOpen) || {}).assignee || me;
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-[calc(100vh-120px)] bg-stone-100/60"
    }, /*#__PURE__*/React.createElement(window.TaskDetail, {
      taskId: prodOpen,
      op: {
        name: opName,
        initials: _tkInitials(opName),
        role: ""
      },
      onBack: () => setProdOpen(null)
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-1 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Feladataim"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Minden vil\xE1g feladata egy helyen \u2014 ", window.TASKS_TODAY)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-flex rounded-lg border border-stone-200 overflow-hidden"
  }, [["mine", "Enyém"], ["team", "Csapat"]].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setScope(k),
    className: `px-3 h-9 text-[12.5px] font-medium ${scope === k ? "bg-indigo-600 text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "inline-flex rounded-lg border border-stone-200 overflow-hidden"
  }, [["list", "orders"], ["card", "dashboard"]].map(([k, ic]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setView(k),
    title: k === "list" ? "Lista" : "Kártya",
    className: `w-9 h-9 grid place-items-center ${view === k ? "bg-stone-900 text-white" : "bg-white text-stone-500 hover:bg-stone-50"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 16
  })))))), scope === "mine" && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-3 mb-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-full grid place-items-center text-[12px] font-bold text-white shrink-0",
    style: {
      background: "linear-gradient(135deg,#4f46e5,#3730a3)"
    }
  }, _tkInitials(person)), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("select", {
    value: person,
    onChange: e => setPerson(e.target.value),
    className: "h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-indigo-500 max-w-full"
  }, people.map(p => /*#__PURE__*/React.createElement("option", {
    key: p,
    value: p
  }, p, p === me ? " (én)" : ""))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 my-4"
  }, /*#__PURE__*/React.createElement(KPI, {
    label: "Nyitott feladat",
    value: items.length,
    sub: scope === "mine" ? person : "az egész csapat",
    tone: "indigo",
    icon: "orders"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "S\xFCrg\u0151s",
    value: urgent,
    sub: "lej\xE1rt / ma esed\xE9kes",
    tone: urgent ? "rose" : "stone",
    icon: "clock"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "J\xF3v\xE1hagy\xE1sra v\xE1r",
    value: approvals,
    sub: "r\xE1m tartozik",
    tone: "amber",
    icon: "check"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Forr\xE1s",
    value: Object.keys(srcCounts).length,
    sub: "akt\xEDv vil\xE1g",
    tone: "teal",
    icon: "layers"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-3 overflow-x-auto pb-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSrcF("all"),
    className: `shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${srcF === "all" ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`
  }, "Mind"), (window.TASK_SOURCE_ORDER || []).filter(k => srcCounts[k]).map(k => {
    const sm = window.TASK_SOURCES[k];
    const on = srcF === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setSrcF(k),
      className: `shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-medium border ${on ? "text-white border-transparent" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`,
      style: on ? {
        background: sm.accent
      } : {}
    }, /*#__PURE__*/React.createElement(Icon, {
      name: sm.icon,
      size: 12
    }), sm.short, /*#__PURE__*/React.createElement("span", {
      className: `text-[10px] ${on ? "opacity-80" : "text-stone-400"}`
    }, srcCounts[k]));
  })), items.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 px-4 py-16 text-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 28,
    className: "text-emerald-400 mx-auto mb-2"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] text-stone-500"
  }, "Nincs nyitott feladat ezen a sz\u0171r\u0151n. \uD83C\uDF89")) : view === "list" ? /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, items.map(t => /*#__PURE__*/React.createElement(TaskRow, {
    key: t.uid,
    item: t,
    onOpen: open
  }))) : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
  }, items.map(t => /*#__PURE__*/React.createElement(TaskCardTk, {
    key: t.uid,
    item: t,
    onOpen: open
  }))), SO && /*#__PURE__*/React.createElement(SO, {
    open: !!openItem,
    onClose: () => setOpenItem(null),
    title: openItem ? openItem.title : "",
    subtitle: openItem ? (window.TASK_SOURCES[openItem.source] || {}).label : "",
    width: 500
  }, openItem && /*#__PURE__*/React.createElement(GenericTaskDetail, {
    item: openItem,
    onClose: () => setOpenItem(null)
  })));
}
Object.assign(window, {
  TaskSourceBadge,
  TaskDueBadge,
  TaskPrioDot,
  TaskRow,
  TaskCardTk,
  GenericTaskDetail,
  TasksWorld
});
})();
