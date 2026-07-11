/* AUTO-GENERATED from page-hr.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-hr.jsx — HR / MUNKAERŐ-KAPACITÁS világ (1/2)
//   Áttekintés (kapacitás KPI + mai jelenlét + figyelmeztetések + nyitott
//   kérelmek), Dolgozói lista, Kapacitás-naptár (dolgozó-soros heti rács,
//   túlterhelés piros kerettel). A dolgozó-profil SlideOver, Távollét-kezelő,
//   Készség-mátrix és a sheetek a page-hr-2.jsx-ben.
//   Store: window.sim.employees / absences / assignments / timeLogs + HrEngine.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateHR,
  useMemo: useMemoHR
} = React;
const HR_TODAY = "2026-04-28";
const hrDOW = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];
const hrHuf = n => Math.round(n || 0).toLocaleString("hu-HU") + " Ft";
const hrHufK = n => Math.round((n || 0) / 1000).toLocaleString("hu-HU") + " e";

// ── Avatar ───────────────────────────────────────────────────────
function Avatar({
  emp,
  size = 34
}) {
  if (!emp) return null;
  return /*#__PURE__*/React.createElement("span", {
    className: "inline-grid place-items-center rounded-full text-white font-semibold shrink-0",
    style: {
      width: size,
      height: size,
      background: emp.color || "#0d9488",
      fontSize: size * 0.38
    }
  }, emp.initials);
}

// ── Pill-ek ──────────────────────────────────────────────────────
function DeptPill({
  dept,
  size = "md"
}) {
  const m = (window.HR_DEPTS || {})[dept] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${m.pill || "bg-stone-100 text-stone-600 border-stone-200"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "user",
    size: size === "sm" ? 10 : 12
  }), m.label || dept);
}
function PayPill({
  grade
}) {
  const m = (window.HR_PAY_GRADES || {})[grade] || {};
  return /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 rounded-full border px-2 h-6 text-[11px] font-medium bg-stone-50 text-stone-600 border-stone-200"
  }, m.label || grade, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "\xB7 ", (m.rate || 0).toLocaleString("hu-HU"), " Ft/\xF3"));
}
function SkillChip({
  sk,
  size = "md"
}) {
  const m = (window.HR_SKILLS || {})[sk.key] || {};
  const lv = (window.HR_SKILL_LEVELS || {})[sk.level] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${lv.pill}`
  }, m.label || sk.key, /*#__PURE__*/React.createElement("span", {
    className: "opacity-60"
  }, "\xB7", lv.short));
}
function AbsStatusPill({
  status,
  size = "md"
}) {
  const m = (window.ABS_STATUS || {})[status] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${m.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${m.dot}`
  }), m.label || status);
}
function AbsTypeBadge({
  type
}) {
  const m = (window.ABS_TYPE_META || {})[type] || {};
  return /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[11px] font-medium",
    style: {
      color: m.accent
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "calendar",
    size: 12
  }), m.label || type);
}

// kapacitás-kihasználtság sáv (lekötött / kapacitás), túl 100% → piros túlnyúlás
function UtilBar({
  util
}) {
  const u = Math.max(0, util || 0);
  const fill = Math.min(100, u * 100);
  const over = u > 1;
  const tone = over ? "bg-rose-500" : u > 0.85 ? "bg-amber-500" : "bg-emerald-500";
  return /*#__PURE__*/React.createElement("div", {
    className: "h-2 w-full rounded-full bg-stone-100 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full ${tone}`,
    style: {
      width: fill + "%"
    }
  }));
}

// ── Detail host (SlideOver) — a tartalom a page-hr-2.jsx-ben (EmployeeDetail) ──
function HrDetailHost({
  openId,
  onClose
}) {
  const sim = useSim();
  const SO = window.SlideOver;
  const emp = openId ? window.sim.findEmployee(openId) : null;
  if (!SO) return null;
  return /*#__PURE__*/React.createElement(SO, {
    open: !!emp,
    onClose: onClose,
    title: emp ? emp.name : "",
    subtitle: emp ? emp.role : "",
    width: 620
  }, emp && window.EmployeeDetail ? /*#__PURE__*/React.createElement(window.EmployeeDetail, {
    emp: emp
  }) : null);
}

// ── Áttekintés ───────────────────────────────────────────────────
function HrDashboard({
  onScreen
}) {
  const sim = useSim();
  const [openId, setOpenId] = useStateHR(null);
  const emps = window.sim.employeeList();
  const E = window.HrEngine;
  const monday = E.mondayOf(HR_TODAY);
  const week = emps.map(e => ({
    emp: e,
    w: window.sim.hrWeekSummary(e.id, monday)
  }));
  const totals = week.reduce((a, x) => ({
    cap: a.cap + x.w.capacity,
    load: a.load + x.w.load
  }), {
    cap: 0,
    load: 0
  });
  const util = totals.cap > 0 ? totals.load / totals.cap : 0;
  const presence = window.sim.hrPresenceToday();
  const att = window.sim.hrAttendanceToday ? window.sim.hrAttendanceToday() : null;
  const overSet = window.sim.hrOverloadSet(14);
  const overEmps = emps.filter(e => Object.keys(overSet).some(k => k.startsWith(e.id + "|")));
  const openReqs = (sim.absences || []).filter(a => a.status === "kert");
  const canManage = window.sim.hasPerm("hr.manage");
  const KPI = ({
    label,
    value,
    sub,
    tone
  }) => /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: `text-[22px] font-semibold leading-none mt-1.5 ${tone === "rose" ? "text-rose-700" : tone === "emerald" ? "text-emerald-700" : "text-stone-900"}`
  }, value), sub && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1"
  }, sub));
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "HR / Kapacit\xE1s"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Munkaer\u0151-kapacit\xE1s, jelenl\xE9t \xE9s t\xE1voll\xE9t \u2014 aktu\xE1lis h\xE9t (", monday, ")"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement(KPI, {
    label: "L\xE9tsz\xE1m",
    value: emps.length + " fő",
    sub: `${presence.present.length} bent · ${presence.absent.length} távol ma`
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Heti kapacit\xE1s",
    value: Math.round(totals.cap) + " ó",
    sub: `${emps.length} dolgozó · 5 munkanap`
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Lek\xF6t\xF6tt",
    value: Math.round(totals.load) + " ó",
    sub: `Szabad: ${Math.round(totals.cap - totals.load)} ó`
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Kihaszn\xE1lts\xE1g",
    value: Math.round(util * 100) + "%",
    sub: overEmps.length ? `${overEmps.length} túlterhelt dolgozó` : "nincs túlterhelés",
    tone: util > 1 ? "rose" : "emerald"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Mai jelenl\xE9t"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, HR_TODAY)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 h-2 rounded-full bg-stone-100 overflow-hidden flex"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-emerald-500",
    style: {
      width: presence.present.length / Math.max(1, emps.length) * 100 + "%"
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-500 tabular-nums shrink-0"
  }, presence.present.length, "/", emps.length, " bent")), presence.absent.length ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Ma t\xE1vol"), presence.absent.map(({
    emp,
    absence
  }) => /*#__PURE__*/React.createElement("button", {
    key: emp.id,
    onClick: () => setOpenId(emp.id),
    className: "w-full flex items-center gap-2.5 text-left hover:bg-stone-50/70 rounded-lg px-1 py-1"
  }, /*#__PURE__*/React.createElement(Avatar, {
    emp: emp,
    size: 28
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-800 truncate"
  }, emp.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 truncate"
  }, emp.role)), /*#__PURE__*/React.createElement(AbsTypeBadge, {
    type: absence.type
  })))) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Mindenki bent van ma."), att && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Jelenl\xE9t-modul ma"), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("attendance", "terminal"),
    className: "text-[11px] text-orange-600 font-medium inline-flex items-center gap-1"
  }, "Jelenl\xE9t ", /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 11
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2 text-center"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Bejelentkezve"), /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-800"
  }, att.count, " f\u0151")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Ledolgozott \xF3"), /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-800"
  }, att.hours, att.overtime ? /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-amber-600"
  }, " +", att.overtime, " t\xFA") : "")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "B\xE9rk\xF6lts\xE9g"), /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-emerald-700"
  }, hrHufK(att.cost), " Ft"))), /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] text-stone-400 mt-1.5"
  }, "A jelenl\xE9t-modul be-/kijelentkez\xE9seib\u0151l sz\xE1m\xEDtva (AttEngine)."))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "T\xFAlterhel\xE9s \u2014 2 h\xE9t"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("capacity"),
    className: "text-[11.5px] text-amber-700 font-medium inline-flex items-center gap-1"
  }, "Napt\xE1r ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  }))), overEmps.length ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, overEmps.map(e => {
    const days = Object.keys(overSet).filter(k => k.startsWith(e.id + "|")).map(k => k.split("|")[1]);
    return /*#__PURE__*/React.createElement("button", {
      key: e.id,
      onClick: () => setOpenId(e.id),
      className: "w-full flex items-center gap-2.5 text-left hover:bg-stone-50/70 rounded-lg px-1 py-1"
    }, /*#__PURE__*/React.createElement(Avatar, {
      emp: e,
      size: 28
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-medium text-stone-800 truncate"
    }, e.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 truncate"
    }, days.length, " nap t\xFAll\xE9p\xE9s")), /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[10.5px] font-medium text-rose-600"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 12
    }), "t\xFAlterhelt"));
  })) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs t\xFAlterhelt dolgoz\xF3 a k\xF6vetkez\u0151 2 h\xE9tben."))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Nyitott t\xE1voll\xE9t-k\xE9relmek", openReqs.length ? ` (${openReqs.length})` : ""), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("absence"),
    className: "text-[11.5px] text-amber-700 font-medium inline-flex items-center gap-1"
  }, "Mind ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  }))), openReqs.length ? openReqs.map(a => {
    const emp = window.sim.findEmployee(a.empId);
    return /*#__PURE__*/React.createElement("div", {
      key: a.id,
      className: "px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3"
    }, /*#__PURE__*/React.createElement(Avatar, {
      emp: emp,
      size: 30
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-semibold text-stone-900 truncate"
    }, emp ? emp.name : ""), /*#__PURE__*/React.createElement(AbsTypeBadge, {
      type: a.type
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 truncate"
    }, a.start, " \u2013 ", a.end, " \xB7 ", a.days, " munkanap", a.reason ? " · " + a.reason : "")), canManage ? /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 shrink-0"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.setAbsenceStatus(a.id, "jovahagyva"),
      className: "h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-[11.5px] font-medium inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13
    }), "J\xF3v\xE1"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const r = prompt("Elutasítás indoka:");
        if (r && r.trim()) window.sim.setAbsenceStatus(a.id, "elutasitva", {
          reason: r
        });
      },
      className: "h-8 px-2.5 rounded-lg border border-stone-200 text-stone-600 text-[11.5px] font-medium"
    }, "Elutas\xEDt")) : /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[10.5px] text-stone-400"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 11
    }), "j\xF3v\xE1hagy\xF3 kell"));
  }) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-8 text-center text-[12px] text-stone-400"
  }, "Nincs nyitott k\xE9relem.")), /*#__PURE__*/React.createElement(HrDetailHost, {
    openId: openId,
    onClose: () => setOpenId(null)
  }));
}

// ── Dolgozói lista ───────────────────────────────────────────────
function HrPeople() {
  const sim = useSim();
  const [openId, setOpenId] = useStateHR(null);
  const [dept, setDept] = useStateHR("all");
  const [q, setQ] = useStateHR("");
  const [addOpen, setAddOpen] = useStateHR(false);
  const E = window.HrEngine;
  const monday = E.mondayOf(HR_TODAY);
  const emps = window.sim.employeeList().filter(e => dept === "all" || e.dept === dept).filter(e => !q.trim() || (e.name + " " + e.role).toLowerCase().includes(q.toLowerCase()));
  const DEPTS = window.HR_DEPT_ORDER || [];
  const canManage = window.sim.hasPerm("hr.manage");
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Dolgoz\xF3k"), canManage && /*#__PURE__*/React.createElement("button", {
    onClick: () => setAddOpen(true),
    className: "h-9 px-3 rounded-lg bg-amber-600 text-white text-[12.5px] font-medium inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "\xDAj dolgoz\xF3")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative flex-1 min-w-[180px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 15
  })), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Keres\xE9s n\xE9v / szerep\u2026",
    className: "w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-amber-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 overflow-x-auto"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDept("all"),
    className: `h-8 px-2.5 rounded-lg text-[11.5px] font-medium shrink-0 border ${dept === "all" ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200"}`
  }, "\xD6sszes"), DEPTS.map(d => {
    const m = window.HR_DEPTS[d];
    return /*#__PURE__*/React.createElement("button", {
      key: d,
      onClick: () => setDept(d),
      className: `h-8 px-2.5 rounded-lg text-[11.5px] font-medium shrink-0 border ${dept === d ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200"}`
    }, m.label);
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, emps.map(e => {
    const w = window.sim.hrWeekSummary(e.id, monday);
    return /*#__PURE__*/React.createElement("button", {
      key: e.id,
      onClick: () => setOpenId(e.id),
      className: "w-full text-left px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3"
    }, /*#__PURE__*/React.createElement(Avatar, {
      emp: e,
      size: 38
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[13px] font-semibold text-stone-900 truncate"
    }, e.name), e.employment === "part" && /*#__PURE__*/React.createElement("span", {
      className: "text-[9.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 shrink-0"
    }, "r\xE9szmunka")), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 truncate"
    }, e.role), /*#__PURE__*/React.createElement("div", {
      className: "hidden sm:flex items-center gap-1.5 mt-1.5"
    }, (e.skills || []).slice(0, 3).map(sk => /*#__PURE__*/React.createElement(SkillChip, {
      key: sk.key,
      sk: sk,
      size: "sm"
    })))), /*#__PURE__*/React.createElement("div", {
      className: "shrink-0 w-[130px] hidden md:block"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-stone-400"
    }, "heti terhel\xE9s"), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] tabular-nums text-stone-600"
    }, Math.round(w.load), "/", Math.round(w.capacity), " \xF3")), /*#__PURE__*/React.createElement(UtilBar, {
      util: w.util
    })), /*#__PURE__*/React.createElement(DeptPill, {
      dept: e.dept,
      size: "sm"
    }), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 15,
      className: "text-stone-300 shrink-0"
    }));
  }), !emps.length && /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-10 text-center text-[12px] text-stone-400"
  }, "Nincs tal\xE1lat.")), /*#__PURE__*/React.createElement(HrDetailHost, {
    openId: openId,
    onClose: () => setOpenId(null)
  }), addOpen && window.NewEmployeeSheet && /*#__PURE__*/React.createElement(window.NewEmployeeSheet, {
    onClose: () => setAddOpen(false)
  }));
}

// ── Kapacitás-naptár — dolgozó-soros heti rács (túlterhelés piros kerettel) ──
function HrCapacity() {
  const sim = useSim();
  const [openId, setOpenId] = useStateHR(null);
  const E = window.HrEngine;
  const emps = window.sim.employeeList();

  // 14 nap a mai naptól
  const start = E.parse(HR_TODAY);
  const days = [];
  for (let i = 0; i < 14; i++) days.push(new Date(start.getTime() + i * 86400000));
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Kapacit\xE1s-napt\xE1r"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "2 h\xE9t \xB7 dolgoz\xF3nk\xE9nti napi terhel\xE9s \xB7 a t\xFAlterhelt (kapacit\xE1s feletti) napok piros kerettel")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-[940px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid border-b border-stone-100 bg-stone-50/60",
    style: {
      gridTemplateColumns: "180px repeat(14, 1fr)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Dolgoz\xF3"), days.map((d, i) => {
    const isToday = E.fmt(d) === HR_TODAY;
    const wknd = !E.isWorkday(d);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: `px-1 py-2 text-center border-l border-stone-100 ${isToday ? "bg-amber-50" : wknd ? "bg-stone-50" : ""}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[9px] text-stone-400"
    }, hrDOW[d.getDay()]), /*#__PURE__*/React.createElement("div", {
      className: `text-[10px] font-mono ${isToday ? "text-amber-700 font-semibold" : "text-stone-500"}`
    }, d.getMonth() + 1, ".", d.getDate()));
  })), emps.map(e => /*#__PURE__*/React.createElement("div", {
    key: e.id,
    className: "grid border-b border-stone-100 last:border-0",
    style: {
      gridTemplateColumns: "180px repeat(14, 1fr)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpenId(e.id),
    className: "px-3 py-2 min-w-0 text-left hover:bg-stone-50/70 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Avatar, {
    emp: e,
    size: 26
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-semibold text-stone-800 truncate"
  }, e.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] text-stone-400 truncate"
  }, Math.round(E.dayCapacity(e)), " \xF3/nap"))), days.map((d, i) => {
    const ds = E.fmt(d);
    const load = window.sim.hrDayLoad(e.id, ds);
    const wknd = !E.isWorkday(d);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: `border-l border-stone-100 p-0.5 min-h-[40px] grid place-items-center ${wknd ? "bg-stone-50/60" : ""}`
    }, load.absence ? /*#__PURE__*/React.createElement("span", {
      className: "w-full h-full rounded grid place-items-center text-[8.5px] font-medium",
      style: {
        background: (window.ABS_TYPE_META[load.absence.type] || {}).accent + "1a",
        color: (window.ABS_TYPE_META[load.absence.type] || {}).accent
      },
      title: (window.ABS_TYPE_META[load.absence.type] || {}).label
    }, "t\xE1v") : !wknd && load.capacity > 0 ? /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpenId(e.id),
      className: `w-full rounded px-1 py-1 grid place-items-center ${load.over ? "ring-1 ring-rose-400 bg-rose-50" : load.load === 0 ? "bg-stone-50" : load.load / load.capacity > 0.85 ? "bg-amber-50" : "bg-emerald-50"}`,
      title: `${load.load} / ${load.capacity} ó`
    }, /*#__PURE__*/React.createElement("span", {
      className: `text-[10px] font-semibold tabular-nums ${load.over ? "text-rose-600" : load.load === 0 ? "text-stone-300" : load.load / load.capacity > 0.85 ? "text-amber-700" : "text-emerald-700"}`
    }, load.load || "·")) : /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] text-stone-300"
    }, "\u2014"));
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 flex-wrap mt-3 text-[11px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded bg-emerald-50 border border-emerald-200"
  }), "szabad kapacit\xE1s"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded bg-amber-50 border border-amber-200"
  }), "k\xF6zel tele (>85%)"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded bg-rose-50 ring-1 ring-rose-400"
  }), "t\xFAlterhelt"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded",
    style: {
      background: "#0d948822"
    }
  }), "t\xE1voll\xE9t"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "A sz\xE1m = aznap lek\xF6t\xF6tt \xF3ra (projekt-beoszt\xE1s + fuvar-beoszt\xE1s).")), /*#__PURE__*/React.createElement(HrDetailHost, {
    openId: openId,
    onClose: () => setOpenId(null)
  }));
}
Object.assign(window, {
  Avatar,
  DeptPill,
  PayPill,
  SkillChip,
  AbsStatusPill,
  AbsTypeBadge,
  UtilBar,
  HrDetailHost,
  HrDashboard,
  HrPeople,
  HrCapacity,
  HR_TODAY,
  hrDOW,
  hrHuf,
  hrHufK
});
})();
