/* AUTO-GENERATED from page-projects.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-projects.jsx — Projektek világ (szakág-koordináció).
//
//   A "projekt" összefogó egység: több bútor-TÉTEL + más szakágak FÜGGŐSÉGEI
//   (víz / áram / szellőzés / gépészet), amelyektől a BÚTOR BEÉPÍTÉS időpontja
//   függ. A belsőépítész (B1–B3) elsődleges világa; nagyobb gyártónál (A3–A4)
//   több rendelést összefogó egység.
//
//   Státusz-láncok (lásd CLAUDE.md / PROJECT_STATUS.md):
//     projekt:    draft → active → install → done   (mellék: on_hold)
//     függőség:   pending → scheduled → in_progress → done  (mellék: blocked)
//   A beépítés (install) CSAK akkor indulhat, ha minden blocksInstall függőség done.
//   Minden átmenet store-akción át: setProjectStatus / setDependencyStatus.
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStatePR,
  useEffect: useEffectPR
} = React;
const TRADE_META = {
  viz: {
    label: "Víz",
    icon: "drop",
    tint: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500"
  },
  aram: {
    label: "Áram",
    icon: "bolt",
    tint: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500"
  },
  szellozes: {
    label: "Szellőzés",
    icon: "wind",
    tint: "bg-teal-100 text-teal-700",
    dot: "bg-teal-500"
  },
  gepeszet: {
    label: "Gépészet",
    icon: "settings",
    tint: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500"
  },
  butor: {
    label: "Bútor beépítés",
    icon: "cube",
    tint: "bg-stone-200 text-stone-700",
    dot: "bg-stone-600"
  }
};
window.TRADE_META = TRADE_META;
const DEP_STATUS = [{
  k: "pending",
  l: "Tervezett",
  tone: "bg-stone-100 text-stone-600",
  dot: "bg-stone-400"
}, {
  k: "scheduled",
  l: "Ütemezett",
  tone: "bg-sky-50 text-sky-700",
  dot: "bg-sky-500"
}, {
  k: "in_progress",
  l: "Folyamatban",
  tone: "bg-amber-50 text-amber-700",
  dot: "bg-amber-500"
}, {
  k: "done",
  l: "Kész",
  tone: "bg-emerald-50 text-emerald-700",
  dot: "bg-emerald-500"
}, {
  k: "blocked",
  l: "Akadályozott",
  tone: "bg-rose-50 text-rose-700",
  dot: "bg-rose-500"
}];
const depMeta = k => DEP_STATUS.find(x => x.k === k) || DEP_STATUS[0];
const PROJECT_STATUS_TONE = {
  draft: {
    l: "Vázlat",
    bg: "bg-stone-100",
    fg: "text-stone-600",
    dot: "bg-stone-400"
  },
  active: {
    l: "Folyamatban",
    bg: "bg-sky-50",
    fg: "text-sky-700",
    dot: "bg-sky-500"
  },
  install: {
    l: "Beépítésre kész",
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    dot: "bg-emerald-500"
  },
  done: {
    l: "Lezárva",
    bg: "bg-stone-100",
    fg: "text-stone-500",
    dot: "bg-stone-400"
  },
  on_hold: {
    l: "Felfüggesztve",
    bg: "bg-amber-50",
    fg: "text-amber-700",
    dot: "bg-amber-500"
  }
};
const projHuf = n => (n || 0).toLocaleString("hu-HU") + " Ft";
function ProjectsPage({
  t
}) {
  const s = useSim();
  const [openId, setOpenId] = useStatePR(null);
  const [boardId, setBoardId] = useStatePR(null);
  const [filter, setFilter] = useStatePR("all");
  const [view, setView] = useStatePR("cards");
  const [createOpen, setCreateOpen] = useStatePR(false);
  const me = window.sim.currentAccount();

  // Deep-link: auto-open a specific project on mount if signalled
  useEffectPR(() => {
    const p = window._pendingOpen;
    if (!p || p.type !== "project") return;
    window._pendingOpen = null;
    setOpenId(p.id);
  }, []);
  // Nézet-szétválás: a fogadó actor-típusok (lapszabász / beépítő) az inboxot látják
  if ((me.actorType === "supplier" || me.actorType === "installer") && window.InboxBoard) {
    return /*#__PURE__*/React.createElement(window.InboxBoard, null);
  }
  // belsőépítész/B2C csak a sajátját lássa; belső mindent
  const visible = s.projects.filter(p => p.kind !== "manufacturing" && (me.type === "internal" ? true : p.designer === me.name || p.customer === me.name));
  const list = filter === "all" ? visible : visible.filter(p => p.status === filter);
  const filters = [{
    k: "all",
    l: "Összes"
  }, {
    k: "draft",
    l: "Vázlat"
  }, {
    k: "active",
    l: "Folyamatban"
  }, {
    k: "install",
    l: "Beépítésre kész"
  }, {
    k: "done",
    l: "Lezárva"
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-end justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[18px] md:text-[20px] font-semibold text-stone-900 tracking-tight"
  }, "Projektek"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500"
  }, "B\xFAtor-t\xE9telek \xE9s szak\xE1g-koordin\xE1ci\xF3 egy helyen")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCreateOpen(true),
    className: "shrink-0 h-9 px-3.5 rounded-lg bg-violet-600 text-white text-[12.5px] font-medium hover:bg-violet-700 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, "\xDAj projekt"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-4 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-0.5 bg-white border border-stone-200 rounded-lg p-0.5"
  }, [{
    k: "cards",
    l: "Kártyák",
    icon: "box"
  }, {
    k: "timeline",
    l: "Ütemezés",
    icon: "bell"
  }].map(v => /*#__PURE__*/React.createElement("button", {
    key: v.k,
    onClick: () => setView(v.k),
    className: `px-2.5 h-8 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 ${view === v.k ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: v.icon,
    size: 13
  }), v.l))), view === "cards" && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 flex-1"
  }, filters.map(f => /*#__PURE__*/React.createElement("button", {
    key: f.k,
    onClick: () => setFilter(f.k),
    className: `px-3 h-8 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 transition ${filter === f.k ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"}`
  }, f.l)))), view === "cards" ? /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-3"
  }, list.map(p => /*#__PURE__*/React.createElement(ProjectCard, {
    key: p.id,
    p: p,
    onOpen: () => setOpenId(p.id)
  })), list.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "md:col-span-2 px-4 py-12 text-center text-[13px] text-stone-400"
  }, "Nincs projekt ebben a n\xE9zetben.")) : /*#__PURE__*/React.createElement(ScheduleView, {
    projects: visible,
    onOpen: setOpenId
  }), /*#__PURE__*/React.createElement(ProjectDetailSlideOver, {
    project: s.projects.find(p => p.id === openId),
    onClose: () => setOpenId(null),
    onOpenBoard: id => {
      setOpenId(null);
      setBoardId(id);
    }
  }), createOpen && /*#__PURE__*/React.createElement(CreateProjectSheet, {
    onClose: () => setCreateOpen(false),
    onCreated: id => {
      setCreateOpen(false);
      setOpenId(id);
    }
  }), boardId && window.ProjectBoard && /*#__PURE__*/React.createElement(window.ProjectBoard, {
    projectId: boardId,
    onClose: () => setBoardId(null)
  }));
}
function ProjectCard({
  p,
  onOpen
}) {
  const tone = PROJECT_STATUS_TONE[p.status];
  const st = window.sim.projectInstallStatus(p);
  const total = p.items.reduce((n, i) => n + i.value, 0);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onOpen,
    className: "text-left bg-white rounded-2xl border border-stone-200 p-4 hover:shadow-md hover:border-stone-300 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 leading-tight"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-0.5"
  }, p.customer, " \xB7 ", p.designer)), /*#__PURE__*/React.createElement("span", {
    className: `shrink-0 inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${tone.bg} ${tone.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
  }), tone.l)), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-center gap-2"
  }, st.ready ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 text-[11.5px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  }), " Be\xE9p\xEDt\xE9s ind\xEDthat\xF3") : st.atRisk ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 text-[11.5px] font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded-lg"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 13
  }), " Cs\xFAsz\xE1s kock\xE1zat") : /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 text-[11.5px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-lg"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "wrench",
    size: 13
  }), " ", st.blockedBy.length, " szak\xE1g h\xE1travan")), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-center gap-1.5 flex-wrap"
  }, p.dependencies.map(d => {
    const tm = TRADE_META[d.trade];
    const dm = depMeta(d.status);
    return /*#__PURE__*/React.createElement("span", {
      key: d.id,
      className: `inline-flex items-center gap-1 px-1.5 h-6 rounded-md text-[10px] font-medium ${tm.tint}`,
      title: `${tm.label}: ${dm.l}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: tm.icon,
      size: 11
    }), /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${dm.dot}`
    }));
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, p.items.length, " t\xE9tel \xB7 be\xE9p\xEDt\xE9s: ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, p.installTarget)), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800 tabular-nums"
  }, projHuf(total))));
}
function ProjectDetailSlideOver({
  project,
  onClose,
  onOpenBoard
}) {
  // Hooks MUST run unconditionally on every render (before any early return).
  const simState = useSim();
  const [mfgSelectOpen, setMfgSelectOpen] = useStatePR(false);
  const [makerPickItem, setMakerPickItem] = useStatePR(null);
  if (!project) return null;
  const p = project;
  const tone = PROJECT_STATUS_TONE[p.status];
  const st = window.sim.projectInstallStatus(p);
  const total = p.items.reduce((n, i) => n + i.value, 0);
  const esum = window.projectEpicSummary ? window.projectEpicSummary(p) : {
    total: 0,
    done: 0,
    delegated: 0,
    pct: 0
  };

  // ── Kapcsolódó dokumentumok ──────────────────────────────────────────────
  const canTrackOrder = window.sim.hasPerm("order.track");
  const canViewSales = (window.sim.currentAccount()?.worlds || []).includes("sales");
  const canViewProd = (window.sim.currentAccount()?.worlds || []).includes("production");

  // Collect unique orderIds from items
  const linkedOrderIds = [...new Set((p.items || []).map(i => i.orderId).filter(Boolean))];
  // Find jobs linked to any of these orders
  const linkedJobs = (simState.jobs || []).filter(j => linkedOrderIds.includes(j.order));
  // Find requisitions linked to this project: via the source quote, an explicit
  // projectRef, or an order that belongs to this project.
  const linkedReqs = (simState.requisitions || []).filter(req => p.fromQuote && req.fromQuote === p.fromQuote || req.projectRef && req.projectRef === p.id || req.orderRef && linkedOrderIds.includes(req.orderRef));
  const REQ_TONE = {
    Draft: "bg-stone-100 text-stone-600",
    Approved: "bg-emerald-100 text-emerald-700",
    ConvertedToPO: "bg-sky-100 text-sky-700",
    ConvertedToOrder: "bg-violet-100 text-violet-700",
    Rejected: "bg-rose-100 text-rose-700"
  };
  const reqLabel = st => PR_STATUS.hu[st] || st;

  // Deep-link: set pending signal then navigate — target component opens the entity on mount
  const navTo = (type, payload, world, screen) => {
    onClose();
    window._pendingOpen = {
      type,
      ...payload
    };
    window.navigateTo?.(world, screen);
  };
  const navDocRow = (icon, tint, label, id, canNav, onClick) => /*#__PURE__*/React.createElement("div", {
    key: id,
    className: "flex items-center justify-between px-3 py-2 bg-white border border-stone-200 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px] min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 13,
    className: tint + " shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 shrink-0"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "font-mono font-medium text-stone-900 truncate"
  }, id)), canNav ? /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: "shrink-0 ml-2 inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition"
  }, "Megnyit\xE1s ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 10,
    className: "rotate-[-90deg]"
  })) : /*#__PURE__*/React.createElement("span", {
    title: "Nincs hozz\xE1f\xE9r\xE9s",
    className: "shrink-0 ml-2 inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] text-stone-400 bg-stone-50 border border-stone-200 cursor-not-allowed"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 10
  }), " Nincs jog"));
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: true,
    onClose: onClose,
    title: p.name,
    subtitle: `${p.customer} · ${p.designer}`,
    width: 560,
    footer: /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 w-full"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.askAbout({
        type: "project",
        id: p.id,
        label: p.name,
        sub: "Projekt"
      }, "ch-prod"),
      className: "inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 text-[12px] font-medium"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chat",
      size: 14
    }), " \xDCzenet"), /*#__PURE__*/React.createElement("span", {
      className: "flex-1"
    }), p.kind !== "manufacturing" && p.status === "active" && /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.setProjectStatus(p.id, "install"),
      disabled: !st.ready,
      className: "inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-[12.5px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-400"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: st.ready ? "check" : "lock",
      size: 14
    }), " Be\xE9p\xEDt\xE9sre k\xE9sz"), p.kind !== "manufacturing" && p.status === "draft" && /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.setProjectStatus(p.id, "active"),
      className: "inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-[12.5px] font-medium bg-stone-900 text-white hover:bg-stone-800"
    }, "Ind\xEDt\xE1s"), p.kind !== "manufacturing" && p.status === "install" && /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.setProjectStatus(p.id, "done"),
      className: "inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-[12.5px] font-medium bg-stone-900 text-white hover:bg-stone-800"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14
    }), " Lez\xE1r\xE1s"))
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-5 space-y-5"
  }, p.kind === "manufacturing" && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-teal-200 bg-teal-50/60 p-3.5 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-9 h-9 rounded-lg bg-teal-600 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "factory",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "Saj\xE1t gy\xE1rt\xE1s alprojekt"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, "F\u0151 projekt: ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, p.parentName || "—")))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[12px] font-medium ${tone.bg} ${tone.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
  }), tone.l), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-500"
  }, "Tervezett be\xE9p\xEDt\xE9s: ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-stone-700"
  }, p.installTarget))), /*#__PURE__*/React.createElement("div", {
    className: `rounded-xl border p-3.5 ${p.kind === "manufacturing" ? "hidden" : ""} ${st.ready ? "border-emerald-200 bg-emerald-50/60" : st.atRisk ? "border-rose-200 bg-rose-50/60" : "border-amber-200 bg-amber-50/50"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: st.ready ? "check" : st.atRisk ? "alert" : "wrench",
    size: 16,
    className: st.ready ? "text-emerald-600" : st.atRisk ? "text-rose-600" : "text-amber-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, st.ready ? "Minden blokkoló szakág kész — a bútor beépítés indítható." : `${st.doneCount}/${st.total} blokkoló szakág kész`)), !st.ready && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 space-y-1"
  }, st.blockedBy.map(d => {
    const tm = TRADE_META[d.trade];
    const late = d.due > p.installTarget;
    return /*#__PURE__*/React.createElement("div", {
      key: d.id,
      className: "flex items-center gap-2 text-[11.5px]"
    }, /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${tm.tint}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: tm.icon,
      size: 11
    }), tm.label), /*#__PURE__*/React.createElement("span", {
      className: "text-stone-600 truncate flex-1"
    }, d.party), /*#__PURE__*/React.createElement("span", {
      className: `font-mono ${late ? "text-rose-600 font-semibold" : "text-stone-500"}`
    }, d.due, late ? " ⚠" : ""));
  }))), window.BriefCard && window.sim.briefsForProject && window.sim.briefsForProject(p.id).length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Tervez\xE9si brief"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, window.sim.briefsForProject(p.id).filter(b => !b.parentBriefId).map(b => /*#__PURE__*/React.createElement(window.BriefCard, {
    key: b.id,
    briefId: b.id,
    title: b.title
  })))), (p.fromQuote || linkedOrderIds.length > 0 || linkedJobs.length > 0 || p.customer) && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Kapcsol\xF3d\xF3 dokumentumok"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, p.fromQuote && /*#__PURE__*/React.createElement(window.RefPanel, {
    kind: "quote",
    id: p.fromQuote,
    onBeforeNav: onClose
  }), linkedOrderIds.map(oid => /*#__PURE__*/React.createElement(window.RefPanel, {
    key: oid,
    kind: "order",
    id: oid,
    onBeforeNav: onClose
  })), linkedJobs.map(j => /*#__PURE__*/React.createElement(window.RefPanel, {
    key: j.id,
    kind: "job",
    id: j.id,
    onBeforeNav: onClose
  })), p.customer && navDocRow("user", "text-amber-600", "Ügyfél", p.customer, canViewSales, () => navTo("customer", {
    name: p.customer
  }, "sales", "customers")))), linkedReqs.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Kapcsol\xF3d\xF3 ig\xE9nyek ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300"
  }, "(", linkedReqs.length, ")")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, linkedReqs.map(req => {
    const lineCount = req.lines ? req.lines.length : 1;
    const sub = req.lines ? `${lineCount} tétel` : req.material || "—";
    return /*#__PURE__*/React.createElement("button", {
      key: req.id,
      onClick: () => navTo("requisition", {
        id: req.id
      }, "procurement", "requisitions"),
      className: "w-full flex items-center gap-2.5 px-3 py-2 bg-white border border-stone-200 rounded-lg hover:border-amber-300 hover:bg-amber-50/40 transition text-left"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "inbox",
      size: 13,
      className: "text-amber-600 shrink-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-[12px] font-medium text-stone-900 shrink-0"
    }, req.id), /*#__PURE__*/React.createElement("span", {
      className: "text-[11.5px] text-stone-400 truncate flex-1 min-w-0 hidden sm:block"
    }, sub), /*#__PURE__*/React.createElement("span", {
      className: `shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${REQ_TONE[req.status] || "bg-stone-100 text-stone-600"}`
    }, reqLabel(req.status)), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 12,
      className: "text-stone-300 shrink-0 rotate-[-90deg]"
    }));
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpenBoard && onOpenBoard(p.id),
    className: "w-full text-left rounded-xl border border-violet-200 bg-violet-50/40 p-3.5 hover:bg-violet-50 hover:border-violet-300 transition flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-10 h-10 rounded-lg bg-violet-600 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 19
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "M\xE9rf\xF6ldk\xF6vek & epikek"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-0.5"
  }, esum.total > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, esum.done, "/", esum.total, " epik k\xE9sz", esum.delegated > 0 ? ` · ${esum.delegated} kiadva partnernek` : "") : "Fázisok és munkacsomagok felvétele")), esum.total > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-bold text-violet-700 shrink-0"
  }, esum.pct, "%"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 18,
    className: "text-violet-400 shrink-0"
  })), p.kind !== "manufacturing" && (() => {
    const subs = window.sim.manufacturingSubprojects(p.id);
    const eligible = (p.items || []).filter(it => (it.sourcing || "own") !== "outsourced" && !it.mfgProjectId);
    const me = window.sim.currentAccount();
    const canMake = me.type === "internal" || (me.worlds || []).includes("production");
    if (!subs.length && (!canMake || eligible.length === 0)) return null;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
    }, "Saj\xE1t gy\xE1rt\xE1s"), subs.length > 0 && /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-400"
    }, subs.length, " alprojekt")), /*#__PURE__*/React.createElement("div", {
      className: "space-y-1.5"
    }, subs.map(sub => {
      const es = window.projectEpicSummary ? window.projectEpicSummary(sub) : {
        total: 0,
        done: 0,
        pct: 0
      };
      return /*#__PURE__*/React.createElement("button", {
        key: sub.id,
        onClick: () => onOpenBoard && onOpenBoard(sub.id),
        className: "w-full text-left rounded-xl border border-teal-200 bg-teal-50/40 p-3 hover:bg-teal-50 hover:border-teal-300 transition flex items-center gap-3"
      }, /*#__PURE__*/React.createElement("span", {
        className: "w-9 h-9 rounded-lg bg-teal-600 text-white grid place-items-center shrink-0"
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "factory",
        size: 17
      })), /*#__PURE__*/React.createElement("div", {
        className: "min-w-0 flex-1"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[12.5px] font-semibold text-stone-900 truncate"
      }, sub.name), /*#__PURE__*/React.createElement("div", {
        className: "text-[11px] text-stone-500 mt-0.5"
      }, sub.items.length, " t\xE9tel \xB7 ", es.done, "/", es.total, " l\xE9p\xE9s k\xE9sz")), es.total > 0 && /*#__PURE__*/React.createElement("span", {
        className: "text-[12px] font-bold text-teal-700 shrink-0"
      }, es.pct, "%"), /*#__PURE__*/React.createElement(Icon, {
        name: "chevron",
        size: 16,
        className: "text-teal-400 shrink-0"
      }));
    }), canMake && eligible.length > 0 && /*#__PURE__*/React.createElement("button", {
      onClick: () => setMfgSelectOpen(true),
      className: "w-full text-left rounded-xl border border-dashed border-teal-300 bg-white p-3 hover:bg-teal-50/40 hover:border-teal-400 transition flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-9 h-9 rounded-lg bg-teal-100 text-teal-600 grid place-items-center shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 17
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-900"
    }, "T\xE9telek saj\xE1t gy\xE1rt\xE1sra ad\xE1sa"), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 mt-0.5"
    }, eligible.length, " kiadhat\xF3 t\xE9tel \xB7 v\xE1laszd ki, melyikb\u0151l legyen gy\xE1rt\xE1si projekt")), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 16,
      className: "text-teal-400 shrink-0"
    }))));
  })(), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "B\xFAtor-t\xE9telek (", p.items.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 divide-y divide-stone-100"
  }, p.items.map(it => {
    const outsourced = (it.sourcing || "own") === "outsourced";
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      className: "px-3.5 py-2.5 flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-8 h-8 rounded-lg grid place-items-center shrink-0 ${outsourced ? "bg-amber-50 text-amber-600" : "bg-violet-50 text-violet-600"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: outsourced ? "box" : "cube",
      size: 15
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900 truncate"
    }, it.name), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 mt-0.5 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium ${outsourced ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: outsourced ? "box" : "factory",
      size: 9
    }), outsourced ? "Rendelhető" : "Saját gyártás"), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-400"
    }, outsourced ? it.reqId ? /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-amber-700"
    }, it.reqId) : "nincs beszerzés" : it.orderId ? /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-sky-700"
    }, it.orderId) : "még nincs rendelés"))), outsourced ? !it.reqId ? /*#__PURE__*/React.createElement("button", {
      onClick: () => setMakerPickItem(it),
      className: "shrink-0 inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-amber-600 text-white text-[11px] font-medium hover:bg-amber-700"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "inbox",
      size: 12
    }), "Beszerz\xE9s") : it.supplierName && /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 text-[10px] text-amber-700 bg-amber-50 px-1.5 h-6 inline-flex items-center rounded-md max-w-[120px] truncate",
      title: it.supplierName
    }, it.supplierName) : !it.orderId && /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.createOrderFromProjectItem(p.id, it.id),
      className: "shrink-0 inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-sky-600 text-white text-[11px] font-medium hover:bg-sky-700"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 12
    }), "Rendel\xE9s"), /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-800 tabular-nums shrink-0"
    }, projHuf(it.value)));
  }), /*#__PURE__*/React.createElement("div", {
    className: "px-3.5 py-2.5 flex items-center justify-between bg-stone-50/60"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-500"
  }, "\xD6sszesen"), /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-stone-900 tabular-nums"
  }, projHuf(total))))), p.kind !== "manufacturing" && /*#__PURE__*/React.createElement(ProjectDependencies, {
    p: p
  })), mfgSelectOpen && /*#__PURE__*/React.createElement(MfgSelectSheet, {
    project: p,
    onClose: () => setMfgSelectOpen(false),
    onCreated: id => {
      setMfgSelectOpen(false);
      onOpenBoard && onOpenBoard(id);
    }
  }), makerPickItem && /*#__PURE__*/React.createElement(MakerPickerSheet, {
    project: p,
    item: makerPickItem,
    onClose: () => setMakerPickItem(null)
  }));
}

// ── Tételek kiválasztása saját gyártásra → egy gyártási alprojekt ─────────────
function MfgSelectSheet({
  project,
  onClose,
  onCreated
}) {
  const eligible = (project.items || []).filter(it => (it.sourcing || "own") !== "outsourced" && !it.mfgProjectId);
  const [sel, setSel] = useStatePR(() => eligible.map(it => it.id));
  const toggle = id => setSel(xs => xs.includes(id) ? xs.filter(x => x !== id) : [...xs, id]);
  const total = eligible.filter(it => sel.includes(it.id)).reduce((n, it) => n + (it.value || 0), 0);
  const create = () => {
    if (!sel.length) return;
    const id = window.sim.createManufacturingSubproject(project.id, sel);
    if (id && onCreated) onCreated(id);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[70]",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": "Bez\xE1r\xE1s",
    onClick: onClose,
    className: "absolute inset-0 bg-stone-900/30 backdrop-blur-[1px]"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-x-0 bottom-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-stone-200 flex flex-col max-h-[82vh]",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom), 0px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-200 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-lg bg-teal-600 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "factory",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "T\xE9telek saj\xE1t gy\xE1rt\xE1sra"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, "A kijel\xF6lt t\xE9telekb\u0151l egy gy\xE1rt\xE1si alprojekt j\xF6n l\xE9tre.")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-3 space-y-1.5"
  }, eligible.map(it => {
    const on = sel.includes(it.id);
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => toggle(it.id),
      className: `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition ${on ? "border-teal-400 bg-teal-50/50 ring-1 ring-teal-200" : "border-stone-200 hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-5 h-5 rounded-md grid place-items-center shrink-0 border ${on ? "bg-teal-600 border-teal-600 text-white" : "border-stone-300 text-transparent"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13
    })), /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block text-[12.5px] font-medium text-stone-900 truncate"
    }, it.name), /*#__PURE__*/React.createElement("span", {
      className: "block text-[10.5px] text-stone-400"
    }, it.orderId ? /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-sky-700"
    }, it.orderId) : "még nincs rendelés")), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] font-semibold tabular-nums text-stone-700 shrink-0"
    }, projHuf(it.value)));
  }), eligible.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 text-center py-6"
  }, "Nincs kiadhat\xF3 (saj\xE1t gy\xE1rt\xE1s\xFA) t\xE9tel.")), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-t border-stone-200 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800"
  }, sel.length), " t\xE9tel \xB7 ", /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, projHuf(total))), /*#__PURE__*/React.createElement("span", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: create,
    disabled: !sel.length,
    className: "h-9 px-4 rounded-lg text-[12.5px] font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "factory",
    size: 14
  }), "Gy\xE1rt\xE1si projekt"))));
}

// ── Külső gyártó kiválasztása az elem-kategória szerint → beszerzési igény ────
function MakerPickerSheet({
  project,
  item,
  onClose
}) {
  const s = useSim();
  const cat = item.elemCategory || null;
  const makers = (s.partners || []).filter(x => x.actorType === "supplier" && (x.makerCategories || []).length);
  const sorted = [...makers].sort((a, b) => {
    const am = cat && (a.makerCategories || []).includes(cat) ? 0 : 1;
    const bm = cat && (b.makerCategories || []).includes(cat) ? 0 : 1;
    return am - bm;
  });
  const order = makerId => {
    window.sim.requisitionOutsourcedItem(project.id, item.id, makerId);
    onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[70]",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": "Bez\xE1r\xE1s",
    onClick: onClose,
    className: "absolute inset-0 bg-stone-900/30 backdrop-blur-[1px]"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-x-0 bottom-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-stone-200 flex flex-col max-h-[82vh]",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom), 0px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-200 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-lg bg-amber-600 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "box",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, "K\xFCls\u0151 gy\xE1rt\xF3 kiv\xE1laszt\xE1sa"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate"
  }, item.name, cat ? /*#__PURE__*/React.createElement(React.Fragment, null, " \xB7 ", /*#__PURE__*/React.createElement("span", {
    className: "text-amber-700 font-medium"
  }, cat)) : "")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-3 space-y-2"
  }, cat && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 px-1 mb-0.5"
  }, "A(z) ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, cat), " kateg\xF3ri\xE1t v\xE1llal\xF3 gy\xE1rt\xF3k el\xF6l, \u201Egy\xE1rtja\" jelz\xE9ssel."), sorted.map(m => {
    const matches = cat ? (m.makerCategories || []).includes(cat) : true;
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      className: `rounded-xl border p-3 ${matches ? "border-amber-200 bg-amber-50/40" : "border-stone-200 bg-white"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-2.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-9 h-9 rounded-lg grid place-items-center shrink-0 ${matches ? "bg-amber-600 text-white" : "bg-stone-100 text-stone-500"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "briefcase",
      size: 16
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-semibold text-stone-900"
    }, m.name), matches && /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wide"
    }, "gy\xE1rtja"), !m.platform && /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium"
    }, "platformon k\xEDv\xFCl")), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 mt-0.5"
    }, m.specialty), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1 mt-1.5"
    }, (m.makerCategories || []).map(c => /*#__PURE__*/React.createElement("span", {
      key: c,
      className: `px-1.5 py-0.5 rounded text-[9.5px] font-medium ${c === cat ? "bg-amber-200 text-amber-800" : "bg-stone-100 text-stone-500"}`
    }, c))))), /*#__PURE__*/React.createElement("div", {
      className: "mt-2.5 flex items-center justify-end"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => order(m.id),
      className: `h-8 px-3.5 rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 ${matches ? "bg-amber-600 text-white hover:bg-amber-700" : "border border-stone-200 text-stone-600 hover:bg-stone-50"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "inbox",
      size: 13
    }), "Beszerz\xE9si ig\xE9ny")));
  }), sorted.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 text-center py-6"
  }, "Nincs k\xFCls\u0151 gy\xE1rt\xF3 megadva. Vegy\xE9l fel partnert a Be\xE1ll\xEDt\xE1sok \u2192 Partnerek alatt."))));
}
function ProjectDependencies({
  p
}) {
  const editable = p.status === "draft" || p.status === "active";
  const [adding, setAdding] = useStatePR(false);
  const [nt, setNt] = useStatePR("gepeszet");
  const [nl, setNl] = useStatePR("");
  const [nparty, setNparty] = useStatePR("");
  const [ndue, setNdue] = useStatePR(p.installTarget);
  const [nblock, setNblock] = useStatePR(true);
  const addDep = () => {
    window.sim.addDependency(p.id, {
      trade: nt,
      label: nl.trim() || TRADE_META[nt].label,
      party: nparty.trim(),
      due: ndue,
      blocksInstall: nblock
    });
    setAdding(false);
    setNl("");
    setNparty("");
    setNt("gepeszet");
    setNblock(true);
    setNdue(p.installTarget);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Szak\xE1g-f\xFCgg\u0151s\xE9gek"), editable && !adding && /*#__PURE__*/React.createElement("button", {
    onClick: () => setAdding(true),
    className: "text-[11.5px] text-violet-700 font-medium inline-flex items-center gap-1 hover:underline"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), "Szak\xE1g")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, p.dependencies.map(d => {
    const tm = TRADE_META[d.trade];
    const dm = depMeta(d.status);
    const late = d.due > p.installTarget && d.status !== "done";
    return /*#__PURE__*/React.createElement("div", {
      key: d.id,
      className: "rounded-xl border border-stone-200 p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-8 h-8 rounded-lg grid place-items-center shrink-0 ${tm.tint}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: tm.icon,
      size: 16
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-semibold text-stone-900"
    }, tm.label), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.setDependencyField(p.id, d.id, {
        blocksInstall: !d.blocksInstall
      }),
      className: `text-[9px] px-1.5 py-0.5 rounded-full font-medium ${d.blocksInstall ? "bg-stone-200 text-stone-600" : "bg-stone-50 text-stone-400"}`,
      title: "Blokkolja-e a be\xE9p\xEDt\xE9st"
    }, d.blocksInstall ? "blokkoló" : "nem blokkol")), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 truncate"
    }, d.label)), editable && /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.removeDependency(p.id, d.id),
      className: "w-7 h-7 grid place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 13
    }))), /*#__PURE__*/React.createElement("div", {
      className: "mt-2.5 flex items-center gap-2 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-500 inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "user",
      size: 12
    }), d.party || "—"), /*#__PURE__*/React.createElement("span", {
      className: `text-[11px] font-mono inline-flex items-center gap-1 ${late ? "text-rose-600 font-semibold" : "text-stone-500"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "bell",
      size: 11
    }), d.due, late ? " ⚠" : ""), /*#__PURE__*/React.createElement("span", {
      className: "flex-1"
    }), /*#__PURE__*/React.createElement("label", {
      className: "inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-2 h-2 rounded-full ${dm.dot}`
    }), /*#__PURE__*/React.createElement("select", {
      value: d.status,
      onChange: e => window.sim.setDependencyStatus(p.id, d.id, e.target.value),
      className: `text-[11.5px] font-medium rounded-lg px-2 h-7 outline-none border border-stone-200 ${dm.tone}`
    }, DEP_STATUS.map(opt => /*#__PURE__*/React.createElement("option", {
      key: opt.k,
      value: opt.k
    }, opt.l))))));
  })), adding && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 rounded-xl border border-violet-200 bg-violet-50/40 p-3 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("select", {
    value: nt,
    onChange: e => setNt(e.target.value),
    className: "h-8 px-2 rounded-lg border border-stone-200 text-[12px] font-medium outline-none bg-white"
  }, Object.entries(TRADE_META).map(([k, m]) => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, m.label))), /*#__PURE__*/React.createElement("input", {
    value: nl,
    onChange: e => setNl(e.target.value),
    placeholder: "Megnevez\xE9s (pl. Padl\xF3f\u0171t\xE9s bek\xF6t\xE9s)",
    className: "flex-1 min-w-0 h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none bg-white"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("input", {
    value: nparty,
    onChange: e => setNparty(e.target.value),
    placeholder: "Felel\u0151s / c\xE9g",
    className: "flex-1 min-w-[120px] h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none bg-white"
  }), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: ndue,
    onChange: e => setNdue(e.target.value),
    className: "h-8 px-2 rounded-lg border border-stone-200 text-[12px] outline-none bg-white"
  }), /*#__PURE__*/React.createElement("label", {
    className: "inline-flex items-center gap-1.5 text-[11px] text-stone-600"
  }, "blokkol\xF3", /*#__PURE__*/React.createElement("button", {
    onClick: () => setNblock(!nblock),
    className: `w-9 h-5 rounded-full p-0.5 transition ${nblock ? "bg-violet-600" : "bg-stone-300"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `block w-4 h-4 rounded-full bg-white transition-transform ${nblock ? "translate-x-4" : ""}`
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setAdding(false),
    className: "h-8 px-3 rounded-lg text-[11.5px] text-stone-600 hover:bg-stone-100"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: addDep,
    className: "h-8 px-3 rounded-lg text-[11.5px] font-medium bg-violet-600 text-white hover:bg-violet-700 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), "Hozz\xE1ad\xE1s"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-[10.5px] text-stone-400 leading-relaxed"
  }, "A \u201Eblokkol\xF3\" szak\xE1gaknak k\xE9szen kell lenni\xFCk a b\xFAtor be\xE9p\xEDt\xE9s ind\xEDt\xE1s\xE1hoz. V\xE1zlat/folyamatban \xE1llapotban szak\xE1g adhat\xF3 hozz\xE1 vagy t\xF6r\xF6lhet\u0151."));
}

// ── Ütemezés / mérföldkő idővonal ───────────────────────────────────────────
const DAY_MS = 86400000;
const parseDate = s => {
  const [y, m, d] = (s || "").split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const fmtMD = dt => `${dt.getMonth() + 1}.${String(dt.getDate()).padStart(2, "0")}`;
function ScheduleView({
  projects,
  onOpen
}) {
  const active = projects.filter(p => p.status !== "done");
  if (!active.length) return /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-12 text-center text-[13px] text-stone-400"
  }, "Nincs \xFCtemezhet\u0151 projekt.");

  // collect all dated points → min/max range
  const allDates = [];
  active.forEach(p => {
    if (p.installTarget) allDates.push(parseDate(p.installTarget));
    p.dependencies.forEach(d => d.due && allDates.push(parseDate(d.due)));
  });
  const today = parseDate("2026-05-31");
  allDates.push(today);
  let min = new Date(Math.min(...allDates)),
    max = new Date(Math.max(...allDates));
  // pad to whole weeks
  min = new Date(min.getTime() - 3 * DAY_MS);
  max = new Date(max.getTime() + 3 * DAY_MS);
  const span = Math.max(1, Math.round((max - min) / DAY_MS));
  const pct = dt => Math.max(0, Math.min(100, (dt - min) / DAY_MS / span * 100));

  // week gridlines (Mondays)
  const weeks = [];
  let w = new Date(min);
  w.setDate(w.getDate() - (w.getDay() + 6) % 7);
  while (w <= max) {
    weeks.push(new Date(w));
    w = new Date(w.getTime() + 7 * DAY_MS);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center gap-3 flex-wrap text-[11px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-full bg-emerald-500"
  }), "k\xE9sz"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-full bg-amber-500"
  }), "folyamatban/\xFCtemezett"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-full bg-stone-300"
  }), "tervezett"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded bg-stone-700"
  }), "b\xFAtor be\xE9p\xEDt\xE9s"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 text-rose-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-0.5 bg-rose-500"
  }), "cs\xFAsz\xE1s")), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-[680px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[180px_1fr] border-b border-stone-100 bg-stone-50/50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-1.5 text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Projekt"), /*#__PURE__*/React.createElement("div", {
    className: "relative h-7"
  }, weeks.map((wk, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "absolute top-0 bottom-0 border-l border-stone-200/70 pl-1 text-[9.5px] text-stone-400 font-mono",
    style: {
      left: pct(wk) + "%"
    }
  }, fmtMD(wk))), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 bottom-0 border-l-2 border-rose-400 z-10",
    style: {
      left: pct(today) + "%"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute top-0 left-1 text-[9px] text-rose-500 font-semibold"
  }, "ma")))), active.map(p => {
    const st = window.sim.projectInstallStatus(p);
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      className: "grid grid-cols-[180px_1fr] border-b border-stone-100 last:border-0 hover:bg-stone-50/40"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => onOpen(p.id),
      className: "text-left px-3 py-3.5 hover:text-violet-700 min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-semibold text-stone-900 truncate"
    }, p.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-500 truncate"
    }, p.customer), /*#__PURE__*/React.createElement("span", {
      className: `mt-1 inline-block text-[9px] px-1.5 py-0.5 rounded-full font-medium ${st.ready ? "bg-emerald-50 text-emerald-700" : st.atRisk ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`
    }, st.ready ? "kész a beépítésre" : st.atRisk ? "csúszás kockázat" : `${st.doneCount}/${st.total} szakág`)), /*#__PURE__*/React.createElement("div", {
      className: "relative min-h-[64px]"
    }, weeks.map((wk, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "absolute top-0 bottom-0 border-l border-stone-100",
      style: {
        left: pct(wk) + "%"
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "absolute top-0 bottom-0 border-l-2 border-rose-200",
      style: {
        left: pct(today) + "%"
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-stone-200",
      style: {
        left: "1%",
        right: "1%"
      }
    }), p.dependencies.filter(d => d.due).map(d => {
      const dt = parseDate(d.due);
      const dm = depMeta(d.status);
      const tm = TRADE_META[d.trade];
      const isInstall = d.trade === "butor";
      const late = d.due > p.installTarget && d.status !== "done";
      return /*#__PURE__*/React.createElement("div", {
        key: d.id,
        className: "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 group",
        style: {
          left: pct(dt) + "%"
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: `grid place-items-center text-white shadow-sm ${isInstall ? "w-6 h-6 rounded-md bg-stone-700" : "w-5 h-5 rounded-full " + dm.dot} ${late ? "ring-2 ring-rose-400" : ""}`
      }, /*#__PURE__*/React.createElement(Icon, {
        name: tm.icon,
        size: isInstall ? 13 : 11
      })), /*#__PURE__*/React.createElement("div", {
        className: "absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap bg-stone-900 text-white text-[10px] px-2 py-1 rounded-md z-20 pointer-events-none"
      }, tm.label, ": ", d.party || "—", " \xB7 ", d.due, late ? " ⚠ csúszik" : ""));
    })));
  }))));
}
function CreateProjectSheet({
  onClose,
  onCreated
}) {
  const [name, setName] = useStatePR("");
  const [customer, setCustomer] = useStatePR("");
  const [target, setTarget] = useStatePR("2026-07-15");
  const [templateId, setTemplateId] = useStatePR(null);
  const [items, setItems] = useStatePR([]);
  const [deps, setDeps] = useStatePR([{
    trade: "viz",
    label: "Vízkiállás",
    party: "",
    due: "",
    status: "pending",
    blocksInstall: true
  }, {
    trade: "aram",
    label: "Elektromos kiállás",
    party: "",
    due: "",
    status: "pending",
    blocksInstall: true
  }]);
  const [itName, setItName] = useStatePR("");
  const [itVal, setItVal] = useStatePR("");
  const addItem = () => {
    if (!itName.trim() || !Number(itVal)) return;
    setItems(xs => [...xs, {
      name: itName.trim(),
      value: Number(itVal)
    }]);
    setItName("");
    setItVal("");
  };
  const addDep = () => setDeps(xs => [...xs, {
    trade: "gepeszet",
    label: "",
    party: "",
    due: "",
    status: "pending",
    blocksInstall: true
  }]);
  const setDep = (i, patch) => setDeps(xs => xs.map((d, j) => j === i ? {
    ...d,
    ...patch
  } : d));
  const rmDep = i => setDeps(xs => xs.filter((_, j) => j !== i));
  const canSave = name.trim() && customer.trim() && target;
  const save = () => {
    if (!canSave) return;
    const id = window.sim.createProject({
      name: name.trim(),
      customer: customer.trim(),
      installTarget: target,
      templateId,
      items,
      dependencies: deps.filter(d => d.label.trim() || d.party.trim()).map(d => ({
        ...d,
        label: d.label.trim() || TRADE_META[d.trade].label,
        due: d.due || target
      }))
    });
    if (id && onCreated) onCreated(id);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[65] flex flex-col bg-stone-50",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("header", {
    className: "shrink-0 bg-white border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[760px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100",
    "aria-label": "Bez\xE1r\xE1s"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 17,
    className: "rotate-180"
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 leading-tight"
  }, "\xDAj projekt"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 leading-tight"
  }, "B\xFAtor-t\xE9telek \xE9s szak\xE1g-f\xFCgg\u0151s\xE9gek")), /*#__PURE__*/React.createElement("button", {
    onClick: save,
    disabled: !canSave,
    className: "h-9 px-4 rounded-lg text-[12.5px] font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14
  }), " L\xE9trehoz\xE1s"))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[760px] mx-auto px-4 md:px-6 py-5 space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm:col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "Projekt neve ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-500"
  }, "*")), /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "pl. Kossuth u. 4. \u2014 Konyha",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "\xDCgyf\xE9l ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-500"
  }, "*")), /*#__PURE__*/React.createElement("input", {
    value: customer,
    onChange: e => setCustomer(e.target.value),
    placeholder: "pl. Nagy Anna",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "Tervezett be\xE9p\xEDt\xE9s"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: target,
    onChange: e => setTarget(e.target.value),
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-violet-500"
  }))), (() => {
    const tpls = window.sim.templates && window.sim.templates.project || [];
    if (!tpls.length) return null;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
    }, "Indul\xE1s sablonb\xF3l ", /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400 normal-case font-normal"
    }, "\u2014 fel\xE9p\xEDti a m\xE9rf\xF6ldk\xF6veket \xE9s epikeket")), /*#__PURE__*/React.createElement("div", {
      className: "grid sm:grid-cols-2 gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setTemplateId(null),
      className: `text-left rounded-xl border p-3 transition ${templateId === null ? "border-violet-400 bg-violet-50/50 ring-1 ring-violet-300" : "border-stone-200 hover:border-stone-300 bg-white"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-8 h-8 rounded-lg bg-stone-100 text-stone-400 grid place-items-center shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 15
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-800"
    }, "\xDCres projekt"), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500"
    }, "F\xE1zisokat k\xE9s\u0151bb veszel fel")))), tpls.map(tp => {
      const sel = templateId === tp.id;
      const ms = (tp.milestones || []).length;
      let ep = 0;
      (tp.milestones || []).forEach(m => {
        ep += (m.epics || []).length;
        (m.subMilestones || []).forEach(sm => ep += (sm.epics || []).length);
      });
      return /*#__PURE__*/React.createElement("button", {
        key: tp.id,
        onClick: () => setTemplateId(tp.id),
        className: `text-left rounded-xl border p-3 transition ${sel ? "border-violet-400 bg-violet-50/50 ring-1 ring-violet-300" : "border-stone-200 hover:border-stone-300 bg-white"}`
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-2"
      }, /*#__PURE__*/React.createElement("span", {
        className: "w-8 h-8 rounded-lg grid place-items-center text-white shrink-0",
        style: {
          background: tp.color || "#7c3aed"
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "layers",
        size: 15
      })), /*#__PURE__*/React.createElement("div", {
        className: "min-w-0 flex-1"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[12.5px] font-semibold text-stone-800 truncate"
      }, tp.name), /*#__PURE__*/React.createElement("div", {
        className: "text-[10.5px] text-stone-500"
      }, ms, " f\xE1zis \xB7 ", ep, " epik")), sel && /*#__PURE__*/React.createElement(Icon, {
        name: "check",
        size: 15,
        className: "text-violet-600 shrink-0"
      })));
    })));
  })(), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "B\xFAtor-t\xE9telek"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mb-2"
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 bg-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cube",
    size: 14,
    className: "text-violet-500 shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] text-stone-800 flex-1 truncate"
  }, it.name), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-mono tabular-nums text-stone-600"
  }, projHuf(it.value)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setItems(xs => xs.filter((_, j) => j !== i)),
    className: "w-7 h-7 grid place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  })))), items.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-400 px-1"
  }, "M\xE9g nincs t\xE9tel.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: itName,
    onChange: e => setItName(e.target.value),
    placeholder: "T\xE9tel neve",
    onKeyDown: e => e.key === "Enter" && addItem(),
    className: "flex-1 min-w-0 h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-violet-500"
  }), /*#__PURE__*/React.createElement("input", {
    value: itVal,
    onChange: e => setItVal(e.target.value.replace(/[^0-9]/g, "")),
    inputMode: "numeric",
    placeholder: "\xC1r (Ft)",
    className: "w-28 h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] tabular-nums outline-none focus:border-violet-500"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addItem,
    className: "shrink-0 h-9 px-3 rounded-lg border border-stone-300 text-stone-700 text-[12px] font-medium hover:bg-white inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Szak\xE1g-f\xFCgg\u0151s\xE9gek"), /*#__PURE__*/React.createElement("button", {
    onClick: addDep,
    className: "text-[11.5px] text-violet-700 font-medium inline-flex items-center gap-1 hover:underline"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), "Szak\xE1g")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, deps.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "rounded-xl border border-stone-200 bg-white p-2.5 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("select", {
    value: d.trade,
    onChange: e => setDep(i, {
      trade: e.target.value
    }),
    className: "h-8 px-2 rounded-lg border border-stone-200 text-[12px] font-medium outline-none focus:border-violet-500"
  }, Object.entries(TRADE_META).map(([k, m]) => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, m.label))), /*#__PURE__*/React.createElement("input", {
    value: d.party,
    onChange: e => setDep(i, {
      party: e.target.value
    }),
    placeholder: "Felel\u0151s / c\xE9g",
    className: "flex-1 min-w-0 h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-violet-500"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => rmDep(i),
    className: "w-7 h-7 grid place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: d.due,
    onChange: e => setDep(i, {
      due: e.target.value
    }),
    className: "h-8 px-2 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-violet-500"
  }), /*#__PURE__*/React.createElement("label", {
    className: "inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 cursor-pointer ml-auto"
  }, "blokkolja a be\xE9p\xEDt\xE9st", /*#__PURE__*/React.createElement("button", {
    onClick: () => setDep(i, {
      blocksInstall: !d.blocksInstall
    }),
    "aria-pressed": d.blocksInstall,
    className: `w-9 h-5 rounded-full p-0.5 transition ${d.blocksInstall ? "bg-violet-600" : "bg-stone-300"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `block w-4 h-4 rounded-full bg-white transition-transform ${d.blocksInstall ? "translate-x-4" : ""}`
  }))))))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-2 leading-relaxed"
  }, "A \u201Eb\xFAtor be\xE9p\xEDt\xE9s\" szak\xE1g automatikusan beker\xFCl. A blokkol\xF3 szak\xE1gaknak k\xE9szen kell lenni\xFCk a be\xE9p\xEDt\xE9s ind\xEDt\xE1s\xE1hoz.")))));
}
Object.assign(window, {
  ProjectsPage,
  TRADE_META,
  PROJECT_STATUS_TONE
});
})();
