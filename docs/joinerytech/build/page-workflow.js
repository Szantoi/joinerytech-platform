/* AUTO-GENERATED from page-workflow.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// Workflow page — Kanban + slide-over detail panel
const {
  useState: useStateW,
  useMemo: useMemoW
} = React;
const TYPE_ICON = {
  cabinet: "inventory",
  door: "factory",
  window: "dashboard",
  custom: "settings"
};
const PRIORITY_TONES = {
  high: {
    bg: "bg-rose-100",
    fg: "text-rose-700",
    label: "Magas"
  },
  med: {
    bg: "bg-amber-100",
    fg: "text-amber-700",
    label: "K\u00f6zepes"
  },
  low: {
    bg: "bg-stone-100",
    fg: "text-stone-600",
    label: "Alacsony"
  }
};
const ASSIGNEE_NAMES = {
  NJ: "Nagy J\u00e1nos",
  TK: "T\u00f3th Kinga",
  KA: "Kiss Andr\u00e1s",
  SA: "Szab\u00f3 Anna",
  HE: "Horv\u00e1th \u00c9va"
};
const ASSIGNEE_BG = {
  NJ: "from-teal-400 to-teal-600",
  TK: "from-amber-400 to-amber-600",
  KA: "from-sky-400 to-sky-600",
  SA: "from-violet-400 to-violet-600",
  HE: "from-rose-400 to-rose-600"
};
function Avatar({
  id,
  size = 22
}) {
  const grad = ASSIGNEE_BG[id] || "from-stone-400 to-stone-600";
  return /*#__PURE__*/React.createElement("div", {
    className: `rounded-full bg-gradient-to-br ${grad} grid place-items-center text-white font-semibold`,
    style: {
      width: size,
      height: size,
      fontSize: size * 0.42
    }
  }, id);
}
function FlowCard({
  epic,
  onOpen,
  t
}) {
  const lang = t === I18N.en ? "en" : "hu";
  const stage = STAGES.find(s => s.key === epic.stage);
  const pri = PRIORITY_TONES[epic.priority];
  const due = new Date(epic.due);
  const today = new Date("2026-04-28");
  const days = Math.round((due - today) / 86400000);
  const dueColor = days < 2 ? "text-rose-600" : days < 7 ? "text-amber-600" : "text-stone-500";
  const onDragStart = e => {
    e.dataTransfer.setData("text/plain", epic.id);
    e.dataTransfer.effectAllowed = "move";
  };
  return /*#__PURE__*/React.createElement("div", {
    draggable: true,
    onDragStart: onDragStart,
    onClick: () => onOpen(epic),
    className: "bg-white border border-stone-200/80 rounded-lg p-3 cursor-pointer hover:border-stone-300 hover:shadow-sm transition active:cursor-grabbing"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2 mb-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] font-mono text-stone-400"
  }, epic.id), /*#__PURE__*/React.createElement("span", {
    className: `text-[9.5px] px-1.5 py-0.5 rounded-full font-medium ${pri.bg} ${pri.fg}`
  }, pri.label)), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900 leading-snug mb-0.5"
  }, epic.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate"
  }, epic.customer), /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Avatar, {
    id: epic.assignee
  }), epic.delegated && /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 font-medium border border-violet-100"
  }, "B2B")), /*#__PURE__*/React.createElement("div", {
    className: `text-[10.5px] font-mono ${dueColor}`
  }, days < 0 ? `${-days}n k\u00e9s\u00e9s` : days === 0 ? "Ma" : `${days}n m\u00falva`)));
}
function DetailPanel({
  epic,
  onClose,
  t
}) {
  if (!epic) return null;
  const stage = STAGES.find(s => s.key === epic.stage);
  const stageIdx = STAGES.findIndex(s => s.key === epic.stage);
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-40",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-stone-900/30 backdrop-blur-[1px]"
  }), /*#__PURE__*/React.createElement("aside", {
    onClick: e => e.stopPropagation(),
    className: "absolute right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl border-l border-stone-200 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-stone-200 px-5 py-3 flex items-start gap-3 z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] font-mono text-stone-400"
  }, epic.id), /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 leading-tight"
  }, epic.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-0.5"
  }, epic.customer)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-8 h-8 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "p-5 space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Stage timeline"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, STAGES.map((s, i) => {
    const passed = i < stageIdx;
    const current = i === stageIdx;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: s.key
    }, /*#__PURE__*/React.createElement("div", {
      className: `flex-1 flex flex-col items-center gap-1 ${current ? "text-teal-700" : passed ? "text-stone-700" : "text-stone-400"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-6 h-6 rounded-full grid place-items-center text-[10px] font-semibold border-2 ${current ? "bg-teal-600 text-white border-teal-600" : passed ? "bg-stone-700 text-white border-stone-700" : "bg-white border-stone-300"}`
    }, passed ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 11
    }) : i + 1), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] font-medium text-center leading-tight"
    }, s.hu)), i < STAGES.length - 1 && /*#__PURE__*/React.createElement("div", {
      className: `h-0.5 flex-1 mt-[-12px] ${i < stageIdx ? "bg-stone-700" : "bg-stone-200"}`
    }));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-50 border border-stone-200/70 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500"
  }, "Hat\\u00e1rid\\u0151"), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-mono text-stone-900 mt-0.5"
  }, epic.due)), /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-50 border border-stone-200/70 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500"
  }, "Hozz\\u00e1rendelt"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-0.5"
  }, /*#__PURE__*/React.createElement(Avatar, {
    id: epic.assignee,
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] text-stone-900"
  }, ASSIGNEE_NAMES[epic.assignee])))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Stage handoff napl\\u00f3"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, STAGES.slice(0, stageIdx + 1).map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.key,
    className: "flex items-start gap-2 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-900 font-medium"
  }, s.hu), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, " \\u00b7 ", ASSIGNEE_NAMES[epic.assignee], " \\u00b7 "), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-stone-400"
  }, "2026-04-", 20 + i)), /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] font-mono text-stone-400"
  }, "hash:", (0xa3f + i).toString(16), "b2"))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Csatolm\\u00e1nyok"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, ["Rajz.pdf", "Anyaglista.pdf", "Foto-3.jpg"].map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-stone-50 border border-stone-200/70 rounded-lg p-2.5 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-400 mb-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "download",
    size: 16,
    className: "inline"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] font-mono text-stone-700 truncate"
  }, f))))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 pt-2 border-t border-stone-200"
  }, /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "check"
  }, "K\\u00f6vetkez\\u0151 stage"), /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "external"
  }, "\\u00c1tad\\u00e1s partnernek"), /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "settings"
  }, "L\\u00e9p\\u00e9s \\u00e1tugr\\u00e1sa")), /*#__PURE__*/React.createElement("div", {
    className: "pt-2 border-t border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Snapshot history \\u00b7 Proof chain"), /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-900 text-stone-100 rounded-lg p-3 font-mono text-[10.5px] leading-relaxed"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "v3 \\u00b7 prev hash"), /*#__PURE__*/React.createElement("span", {
    className: "text-teal-300"
  }, "a3f4b29c")), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "v2 \\u00b7 prev hash"), /*#__PURE__*/React.createElement("span", {
    className: "text-teal-300"
  }, "9e2c8d11")), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "v1 \\u00b7 root hash"), /*#__PURE__*/React.createElement("span", {
    className: "text-teal-300"
  }, "f1d04b87")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 pt-2 border-t border-stone-700 flex items-center gap-1.5 text-emerald-400"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), " L\\u00e1nc \\u00e9rv\\u00e9nyes"))))));
}
function WorkflowPage({
  t
}) {
  const lang = t === I18N.en ? "en" : "hu";
  const [epics, setEpics] = useStateW(FLOW_EPICS);
  const [selected, setSelected] = useStateW(null);
  const [search, setSearch] = useStateW("");
  const [filterAssignee, setFilterAssignee] = useStateW("all");
  const [dragOver, setDragOver] = useStateW(null);
  const filtered = epics.filter(e => {
    if (filterAssignee !== "all" && e.assignee !== filterAssignee) return false;
    if (search && !(e.title.toLowerCase().includes(search.toLowerCase()) || e.customer.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });
  const onDrop = stageKey => e => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    setEpics(prev => prev.map(ep => ep.id === id ? {
      ...ep,
      stage: stageKey
    } : ep));
    setDragOver(null);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 max-w-[1600px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-4 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-3 h-9 flex-1 min-w-[160px] sm:flex-none sm:w-[280px] rounded-lg bg-white border border-stone-200 text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14
  }), /*#__PURE__*/React.createElement("input", {
    value: search,
    onChange: e => setSearch(e.target.value),
    placeholder: "Keres\\u00e9s feladat / megrendel\\u0151...",
    className: "bg-transparent outline-none text-[12px] flex-1 min-w-0 placeholder:text-stone-400"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setFilterAssignee("all"),
    className: `px-2.5 h-7 rounded-md text-[12px] ${filterAssignee === "all" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`
  }, "Mind"), Object.keys(ASSIGNEE_NAMES).map(k => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setFilterAssignee(filterAssignee === k ? "all" : k),
    className: `w-7 h-7 rounded-md grid place-items-center ${filterAssignee === k ? "ring-2 ring-stone-900 ring-offset-1" : ""}`
  }, /*#__PURE__*/React.createElement(Avatar, {
    id: k,
    size: 20
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "filter"
  }, "Sz\\u0171r\\u0151"), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus"
  }, "\\u00daj feladat")), /*#__PURE__*/React.createElement("div", {
    className: "flex md:grid gap-3 overflow-x-auto md:overflow-visible -mx-4 md:mx-0 px-4 md:px-0 pb-2 md:pb-0 snap-x snap-mandatory md:snap-none",
    style: {
      gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))`
    }
  }, STAGES.map(s => {
    const colEpics = filtered.filter(e => e.stage === s.key);
    const isOver = dragOver === s.key;
    return /*#__PURE__*/React.createElement("div", {
      key: s.key,
      onDragOver: e => {
        e.preventDefault();
        setDragOver(s.key);
      },
      onDragLeave: () => setDragOver(null),
      onDrop: onDrop(s.key),
      className: `shrink-0 w-[260px] md:w-auto snap-start rounded-xl border-2 transition ${isOver ? "border-teal-400 bg-teal-50/40" : "border-transparent bg-stone-100/60"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-3 py-2.5 flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-semibold text-stone-900"
    }, lang === "en" ? s.en : s.hu), s.optional && /*#__PURE__*/React.createElement("span", {
      className: "text-[9.5px] px-1.5 py-0.5 rounded bg-stone-200/60 text-stone-500 font-medium"
    }, "opt.")), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] tabular-nums text-stone-500 bg-white border border-stone-200 rounded-full px-1.5"
    }, colEpics.length)), /*#__PURE__*/React.createElement("div", {
      className: "px-2 pb-2 space-y-2 min-h-[200px]"
    }, colEpics.map(epic => /*#__PURE__*/React.createElement(FlowCard, {
      key: epic.id,
      epic: epic,
      onOpen: setSelected,
      t: t
    })), colEpics.length === 0 && /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-400 text-center py-6 border-2 border-dashed border-stone-200 rounded-lg"
    }, "Hely\\u00fcrz\\u0151")));
  })), /*#__PURE__*/React.createElement(DetailPanel, {
    epic: selected,
    onClose: () => setSelected(null),
    t: t
  }));
}
window.WorkflowPage = WorkflowPage;
window.STAGES_REF = STAGES;
window.FLOW_EPICS_REF = FLOW_EPICS;
})();
