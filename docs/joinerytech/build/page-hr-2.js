/* AUTO-GENERATED from page-hr-2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-hr-2.jsx — HR / MUNKAERŐ-KAPACITÁS világ (2/2)
//   EmployeeDetail (profil SlideOver: kapacitás + készségek + beosztások +
//   távollétek + munkaóra-napló → Kontrolling), Távollét-kezelő (FSM),
//   Készség-mátrix, és a sheetek (új dolgozó / új távollét).
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateH2
} = React;
const h2cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-amber-500";
const h2facName = id => ((window.FACILITIES || []).find(f => f.id === id) || {}).name || "—";

// ── Dolgozó-profil (SlideOver tartalom) ──────────────────────────
function EmployeeDetail({
  emp
}) {
  const sim = useSim();
  const E = window.HrEngine;
  const monday = E.mondayOf(window.HR_TODAY);
  const w = window.sim.hrWeekSummary(emp.id, monday);
  const canManage = window.sim.hasPerm("hr.manage");
  const [tab, setTab] = useStateH2("kapacitas");
  const asgs = window.sim.assignmentsForEmployee(emp.id);
  const abss = window.sim.absencesForEmployee(emp.id);
  const logs = window.sim.timeLogsForEmployee(emp.id);
  const crews = (sim.crews || []).filter(c => (c.memberIds || []).includes(emp.id));
  const TABS = [["kapacitas", "Kapacitás"], ["szabadsag", "Szabadság"], ["szemelyes", "Személyes"], ["keszsegek", "Készségek"], ["naplo", "Munkaóra"]];
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(window.Avatar, {
    emp: emp,
    size: 48
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900"
  }, emp.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500"
  }, emp.role), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement(window.DeptPill, {
    dept: emp.dept,
    size: "sm"
  }), emp.employment === "part" && /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200"
  }, "r\xE9szmunka")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 text-[12px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Telephely"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-800 font-medium truncate"
  }, h2facName(emp.facilityId))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "B\xE9r-kateg\xF3ria"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-800 font-medium"
  }, (window.HR_PAY_GRADES[emp.payGrade] || {}).label, " \xB7 ", window.sim.hrRate(emp).toLocaleString("hu-HU"), " Ft/\xF3")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Heti \xF3ra"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-800 font-medium"
  }, emp.weeklyHours, " \xF3 (", E.dayCapacity(emp), " \xF3/nap)")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Bel\xE9p\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-800 font-medium"
  }, emp.startedAt)), emp.personal && (emp.personal.children != null || emp.personal.maritalStatus) && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 px-3 py-2 col-span-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Csal\xE1di"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-800 font-medium"
  }, (window.HR_MARITAL[emp.personal.maritalStatus] || {}).label || "—", emp.personal.children != null ? ` · ${emp.personal.children} gyermek` : "")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 px-3 py-2 col-span-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "El\xE9rhet\u0151s\xE9g"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-700 truncate"
  }, emp.phone, " \xB7 ", emp.email)), crews.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-sky-200 bg-sky-50/50 px-3 py-2 col-span-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-sky-600"
  }, "Logisztika brig\xE1d"), /*#__PURE__*/React.createElement("div", {
    className: "text-sky-800 font-medium"
  }, crews.map(c => c.name).join(", ")))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 border-b border-stone-100"
  }, TABS.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setTab(k),
    className: `px-3 py-2 text-[12px] font-medium border-b-2 -mb-px ${tab === k ? "border-amber-500 text-amber-700" : "border-transparent text-stone-500"}`
  }, l))), tab === "kapacitas" && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-semibold text-stone-800"
  }, "Aktu\xE1lis h\xE9t"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] tabular-nums text-stone-500"
  }, Math.round(w.load), " / ", Math.round(w.capacity), " \xF3 \xB7 ", Math.round(w.util * 100), "%")), /*#__PURE__*/React.createElement(window.UtilBar, {
    util: w.util
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2 mt-3 text-center"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Szabad"), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-emerald-700"
  }, Math.round(w.free), " \xF3")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "T\xFAll\xE9pett nap"), /*#__PURE__*/React.createElement("div", {
    className: `text-[13px] font-semibold ${w.overDays ? "text-rose-600" : "text-stone-700"}`
  }, w.overDays)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "T\xE1voll\xE9t-nap"), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-700"
  }, w.absDays)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Feladat-beoszt\xE1sok")), /*#__PURE__*/React.createElement(AddAssignmentForm, {
    empId: emp.id
  }), asgs.length ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mt-2"
  }, asgs.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    className: "flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-md grid place-items-center shrink-0 bg-amber-50 text-amber-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "briefcase",
    size: 13
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-800 truncate"
  }, a.label), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 truncate"
  }, a.projectName || "—", " \xB7 ", a.start, "\u2013", a.end, " \xB7 ", a.hoursPerDay, " \xF3/nap")), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.removeAssignment(a.id),
    className: "text-stone-300 hover:text-rose-500 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))))) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 mt-2"
  }, "Nincs akt\xEDv beoszt\xE1s.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "T\xE1voll\xE9tek"), abss.length ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mt-2"
  }, abss.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    className: "flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(window.AbsTypeBadge, {
    type: a.type
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, a.start, "\u2013", a.end, " \xB7 ", a.days, " nap")), /*#__PURE__*/React.createElement(window.AbsStatusPill, {
    status: a.status,
    size: "sm"
  })))) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 mt-2"
  }, "Nincs r\xF6gz\xEDtett t\xE1voll\xE9t."))), tab === "keszsegek" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 mb-2"
  }, canManage ? "Koppints egy szintre a szerkesztéshez (0 = törlés)." : "Csak megtekintés — szerkesztéshez HR-jog kell."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, (window.HR_SKILL_ORDER || []).map(sk => {
    const cur = (emp.skills || []).find(x => x.key === sk);
    const meta = window.HR_SKILLS[sk];
    return /*#__PURE__*/React.createElement("div", {
      key: sk,
      className: "flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-7 h-7 rounded-md grid place-items-center shrink-0 bg-stone-100 text-stone-500"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: meta.icon,
      size: 13
    })), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] font-medium text-stone-700 flex-1 truncate"
    }, meta.label), canManage ? /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1"
    }, [0, 1, 2, 3].map(lv => /*#__PURE__*/React.createElement("button", {
      key: lv,
      onClick: () => window.sim.setEmployeeSkill(emp.id, sk, lv),
      className: `w-7 h-7 rounded-md text-[11px] font-semibold border ${(cur ? cur.level : 0) === lv ? "bg-amber-600 text-white border-amber-600" : "bg-white text-stone-400 border-stone-200"}`
    }, lv === 0 ? "–" : lv))) : cur ? /*#__PURE__*/React.createElement(window.SkillChip, {
      sk: cur,
      size: "sm"
    }) : /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-300"
    }, "nincs"));
  }))), tab === "naplo" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Munka\xF3ra-napl\xF3")), /*#__PURE__*/React.createElement(AddTimeLogForm, {
    empId: emp.id
  }), logs.length ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mt-2"
  }, logs.map(t => {
    const cost = Math.round((t.hours || 0) * window.sim.hrRate(emp));
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      className: "flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-7 h-7 rounded-md grid place-items-center shrink-0 bg-indigo-50 text-indigo-600"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "clock",
      size: 13
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-medium text-stone-800 truncate"
    }, t.hours, " \xF3 \xB7 ", t.projectName || "nincs projekt"), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 truncate"
    }, t.date, t.note ? " · " + t.note : "", " \xB7 ", window.hrHuf(cost))), t.pushedToCtrl ? /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 12
    }), "Kontroll.") : t.projectId ? /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.pushTimeLogToCtrl(t.id),
      className: "h-7 px-2 rounded-lg bg-slate-700 text-white text-[10.5px] font-medium shrink-0"
    }, "\u2192 Kontrolling") : /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-stone-300 shrink-0"
    }, "nincs projekt"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.removeTimeLog(t.id),
      className: "text-stone-300 hover:text-rose-500 shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    })));
  })) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 mt-2"
  }, "Nincs napl\xF3zott \xF3ra."), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-2"
  }, "A \u201E\u2192 Kontrolling\" gomb a napl\xF3zott \xF3r\xE1t (\xF3ra \xD7 \xF3rad\xEDj) \u201Emunka\" kateg\xF3ri\xE1s t\xE9ny-korrekci\xF3k\xE9nt k\xFCldi a projekt ut\xF3kalkul\xE1ci\xF3j\xE1ba.")), tab === "szabadsag" && /*#__PURE__*/React.createElement(EmpLeaveTab, {
    emp: emp
  }), tab === "szemelyes" && /*#__PURE__*/React.createElement(EmpPersonalTab, {
    emp: emp
  }), canManage && /*#__PURE__*/React.createElement("div", {
    className: "pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm("Biztosan archiválod a dolgozót?")) window.sim.removeEmployee(emp.id);
    },
    className: "text-[11.5px] text-rose-500 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "archive",
    size: 13
  }), "Dolgoz\xF3 archiv\xE1l\xE1sa")));
}

// ── Beosztás-hozzáadó (inline) ───────────────────────────────────
function AddAssignmentForm({
  empId
}) {
  const sim = useSim();
  const [open, setOpen] = useStateH2(false);
  const [projectId, setProjectId] = useStateH2("");
  const [label, setLabel] = useStateH2("");
  const [start, setStart] = useStateH2(window.HR_TODAY);
  const [end, setEnd] = useStateH2(window.HR_TODAY);
  const [hours, setHours] = useStateH2("8");
  const projects = (sim.projects || []).filter(p => p.status !== "draft");
  const save = () => {
    if (!label.trim()) return;
    const p = projects.find(x => x.id === projectId);
    window.sim.addAssignment({
      empId,
      projectId: projectId || null,
      projectName: p ? p.name : "",
      label,
      start,
      end,
      hoursPerDay: Number(hours) || 8
    });
    setOpen(false);
    setLabel("");
  };
  if (!open) return /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(true),
    className: "text-[11.5px] text-amber-700 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "Beoszt\xE1s");
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50/60 p-3 space-y-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: label,
    onChange: e => setLabel(e.target.value),
    placeholder: "Feladat megnevez\xE9se",
    className: h2cls
  }), /*#__PURE__*/React.createElement("select", {
    value: projectId,
    onChange: e => setProjectId(e.target.value),
    className: h2cls
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 projekt n\xE9lk\xFCl \u2014"), projects.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[9.5px] text-stone-400"
  }, "Kezd\xE9s"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: start,
    onChange: e => setStart(e.target.value),
    className: h2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[9.5px] text-stone-400"
  }, "V\xE9ge"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: end,
    onChange: e => setEnd(e.target.value),
    className: h2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[9.5px] text-stone-400"
  }, "\xD3/nap"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: hours,
    onChange: e => setHours(e.target.value),
    className: h2cls
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: save,
    className: "h-8 px-3 rounded-lg bg-amber-600 text-white text-[12px] font-medium"
  }, "Hozz\xE1ad"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(false),
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse")));
}

// ── Munkaóra-napló hozzáadó (inline) ─────────────────────────────
function AddTimeLogForm({
  empId
}) {
  const sim = useSim();
  const [open, setOpen] = useStateH2(false);
  const [projectId, setProjectId] = useStateH2("");
  const [date, setDate] = useStateH2(window.HR_TODAY);
  const [hours, setHours] = useStateH2("8");
  const [note, setNote] = useStateH2("");
  const projects = (sim.projects || []).filter(p => p.status !== "draft");
  const save = () => {
    if (!Number(hours)) return;
    const p = projects.find(x => x.id === projectId);
    window.sim.addTimeLog({
      empId,
      projectId: projectId || null,
      projectName: p ? p.name : "",
      date,
      hours: Number(hours),
      note
    });
    setOpen(false);
    setNote("");
  };
  if (!open) return /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(true),
    className: "text-[11.5px] text-amber-700 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "\xD3ra r\xF6gz\xEDt\xE9se");
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50/60 p-3 space-y-2"
  }, /*#__PURE__*/React.createElement("select", {
    value: projectId,
    onChange: e => setProjectId(e.target.value),
    className: h2cls
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 projekt n\xE9lk\xFCl (nem k\xFCldhet\u0151 Kontrollingba) \u2014"), projects.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[9.5px] text-stone-400"
  }, "D\xE1tum"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: date,
    onChange: e => setDate(e.target.value),
    className: h2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[9.5px] text-stone-400"
  }, "\xD3ra"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: hours,
    onChange: e => setHours(e.target.value),
    className: h2cls
  }))), /*#__PURE__*/React.createElement("input", {
    value: note,
    onChange: e => setNote(e.target.value),
    placeholder: "Megjegyz\xE9s",
    className: h2cls
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: save,
    className: "h-8 px-3 rounded-lg bg-amber-600 text-white text-[12px] font-medium"
  }, "R\xF6gz\xEDt"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(false),
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse")));
}

// ── Távollét-kezelő (FSM) ────────────────────────────────────────
function HrAbsence() {
  const sim = useSim();
  const [filter, setFilter] = useStateH2("all");
  const [addOpen, setAddOpen] = useStateH2(false);
  const canManage = window.sim.hasPerm("hr.manage");
  const all = sim.absences || [];
  const list = all.filter(a => filter === "all" || a.status === filter).slice().sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""));
  const FILTERS = [["all", "Összes"], ["kert", "Kért"], ["jovahagyva", "Jóváhagyva"], ["folyamatban", "Folyamatban"], ["lezarva", "Lezárva"]];
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "T\xE1voll\xE9t"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAddOpen(true),
    className: "h-9 px-3 rounded-lg bg-amber-600 text-white text-[12.5px] font-medium inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "\xDAj k\xE9relem")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 overflow-x-auto mb-3"
  }, FILTERS.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setFilter(k),
    className: `h-8 px-3 rounded-lg text-[11.5px] font-medium shrink-0 border ${filter === k ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200"}`
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, list.length ? list.map(a => {
    const emp = window.sim.findEmployee(a.empId);
    const nexts = window.HrEngine.absNext(a);
    return /*#__PURE__*/React.createElement("div", {
      key: a.id,
      className: "px-4 py-3 border-b border-stone-100 last:border-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement(window.Avatar, {
      emp: emp,
      size: 34
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-semibold text-stone-900 truncate"
    }, emp ? emp.name : ""), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-mono text-stone-400"
    }, a.id)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 text-[10.5px] text-stone-400 truncate"
    }, /*#__PURE__*/React.createElement(window.AbsTypeBadge, {
      type: a.type
    }), /*#__PURE__*/React.createElement("span", null, "\xB7 ", a.start, "\u2013", a.end, " \xB7 ", a.days, " munkanap"))), /*#__PURE__*/React.createElement(window.AbsStatusPill, {
      status: a.status,
      size: "sm"
    })), a.reason && /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 mt-1.5 pl-[46px]"
    }, "\u201E", a.reason, "\""), a.rejectReason && /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-rose-600 mt-1 pl-[46px]"
    }, "Elutas\xEDtva: ", a.rejectReason), nexts.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 mt-2 pl-[46px] flex-wrap"
    }, nexts.map(to => {
      const m = window.ABS_STATUS[to];
      const needPerm = (to === "jovahagyva" || to === "elutasitva") && !canManage;
      const onClick = () => {
        if (to === "elutasitva") {
          const r = prompt("Elutasítás indoka:");
          if (r && r.trim()) window.sim.setAbsenceStatus(a.id, to, {
            reason: r
          });
        } else window.sim.setAbsenceStatus(a.id, to);
      };
      return /*#__PURE__*/React.createElement("button", {
        key: to,
        disabled: needPerm,
        onClick: onClick,
        title: needPerm ? "HR-jog szükséges (hr.manage)" : "",
        className: `h-7 px-2.5 rounded-lg text-[11px] font-medium border inline-flex items-center gap-1 ${needPerm ? "bg-stone-50 text-stone-300 border-stone-200 cursor-not-allowed" : to === "elutasitva" ? "bg-white text-rose-600 border-rose-200" : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"}`
      }, needPerm && /*#__PURE__*/React.createElement(Icon, {
        name: "lock",
        size: 11
      }), "\u2192 ", m.label);
    })));
  }) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-10 text-center text-[12px] text-stone-400"
  }, "Nincs k\xE9relem ebben a n\xE9zetben.")), addOpen && /*#__PURE__*/React.createElement(NewAbsenceSheet, {
    onClose: () => setAddOpen(false)
  }));
}

// ── Készség-mátrix ───────────────────────────────────────────────
function HrSkills() {
  const sim = useSim();
  const [openId, setOpenId] = useStateH2(null);
  const emps = window.sim.employeeList();
  const SKILLS = window.HR_SKILL_ORDER || [];
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1300px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "K\xE9szs\xE9g-m\xE1trix"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Ki mihez \xE9rt \xE9s milyen szinten \u2014 a beoszt\xE1shoz \xE9s a brig\xE1d-\xF6ssze\xE1ll\xEDt\xE1shoz")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-[820px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid border-b border-stone-100 bg-stone-50/60",
    style: {
      gridTemplateColumns: "180px repeat(" + SKILLS.length + ", 1fr)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, "Dolgoz\xF3"), SKILLS.map(sk => /*#__PURE__*/React.createElement("div", {
    key: sk,
    className: "px-1 py-2 text-center border-l border-stone-100 text-[9.5px] text-stone-500 font-medium leading-tight"
  }, window.HR_SKILLS[sk].label))), emps.map(e => /*#__PURE__*/React.createElement("div", {
    key: e.id,
    className: "grid border-b border-stone-100 last:border-0",
    style: {
      gridTemplateColumns: "180px repeat(" + SKILLS.length + ", 1fr)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpenId(e.id),
    className: "px-3 py-2 min-w-0 text-left hover:bg-stone-50/70 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(window.Avatar, {
    emp: e,
    size: 26
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-semibold text-stone-800 truncate"
  }, e.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] text-stone-400 truncate"
  }, e.role))), SKILLS.map(sk => {
    const cur = (e.skills || []).find(x => x.key === sk);
    const lv = cur ? window.HR_SKILL_LEVELS[cur.level] : null;
    return /*#__PURE__*/React.createElement("div", {
      key: sk,
      className: "border-l border-stone-100 grid place-items-center py-2"
    }, cur ? /*#__PURE__*/React.createElement("span", {
      className: `w-6 h-6 rounded-md grid place-items-center text-[10.5px] font-semibold border ${lv.pill}`,
      title: lv.label
    }, cur.level) : /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-stone-200"
    }, "\xB7"));
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 flex-wrap mt-3 text-[11px] text-stone-500"
  }, [1, 2, 3].map(l => {
    const m = window.HR_SKILL_LEVELS[l];
    return /*#__PURE__*/React.createElement("span", {
      key: l,
      className: "inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-2.5 h-2.5 rounded-sm ${m.dot}`
    }), l, " \u2014 ", m.label);
  })), /*#__PURE__*/React.createElement(window.HrDetailHost, {
    openId: openId,
    onClose: () => setOpenId(null)
  }));
}

// ── Sheet: új dolgozó ────────────────────────────────────────────
function NewEmployeeSheet({
  onClose
}) {
  const sim = useSim();
  const [name, setName] = useStateH2("");
  const [role, setRole] = useStateH2("");
  const [dept, setDept] = useStateH2("gyartas");
  const [facilityId, setFac] = useStateH2((window.FACILITIES || [])[0]?.id || "fac-vac");
  const [payGrade, setPay] = useStateH2("szakmunkas");
  const [weeklyHours, setWH] = useStateH2("40");
  const [phone, setPhone] = useStateH2("");
  const [email, setEmail] = useStateH2("");
  const [children, setChildren] = useStateH2("0");
  const [birthDate, setBirthDate] = useStateH2("");
  const save = () => {
    if (!name.trim()) return;
    window.sim.addEmployee({
      name,
      role,
      dept,
      facilityId,
      payGrade,
      weeklyHours: Number(weeklyHours) || 40,
      employment: Number(weeklyHours) < 40 ? "part" : "full",
      phone,
      email,
      children: Number(children) || 0,
      personal: {
        children: Number(children) || 0,
        birthDate
      }
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
  }, "\xDAj dolgoz\xF3"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-2.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "N\xE9v"), /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "Teljes n\xE9v",
    className: h2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Munkak\xF6r"), /*#__PURE__*/React.createElement("input", {
    value: role,
    onChange: e => setRole(e.target.value),
    placeholder: "pl. Szab\xE1sz oper\xE1tor",
    className: h2cls
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "R\xE9szleg"), /*#__PURE__*/React.createElement("select", {
    value: dept,
    onChange: e => setDept(e.target.value),
    className: h2cls
  }, (window.HR_DEPT_ORDER || []).map(d => /*#__PURE__*/React.createElement("option", {
    key: d,
    value: d
  }, window.HR_DEPTS[d].label)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Telephely"), /*#__PURE__*/React.createElement("select", {
    value: facilityId,
    onChange: e => setFac(e.target.value),
    className: h2cls
  }, (window.FACILITIES || []).map(f => /*#__PURE__*/React.createElement("option", {
    key: f.id,
    value: f.id
  }, f.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "B\xE9r-kateg\xF3ria"), /*#__PURE__*/React.createElement("select", {
    value: payGrade,
    onChange: e => setPay(e.target.value),
    className: h2cls
  }, (window.HR_PAY_ORDER || []).map(g => /*#__PURE__*/React.createElement("option", {
    key: g,
    value: g
  }, window.HR_PAY_GRADES[g].label)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Heti \xF3ra"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: weeklyHours,
    onChange: e => setWH(e.target.value),
    className: h2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Telefon"), /*#__PURE__*/React.createElement("input", {
    value: phone,
    onChange: e => setPhone(e.target.value),
    className: h2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "E-mail"), /*#__PURE__*/React.createElement("input", {
    value: email,
    onChange: e => setEmail(e.target.value),
    className: h2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Gyermekek sz\xE1ma"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    value: children,
    onChange: e => setChildren(e.target.value),
    className: h2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Sz\xFClet\xE9si d\xE1tum"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: birthDate,
    onChange: e => setBirthDate(e.target.value),
    className: h2cls
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: save,
    disabled: !name.trim(),
    className: `w-full h-10 rounded-xl text-white text-[13px] font-medium mt-1 ${name.trim() ? "bg-amber-600" : "bg-stone-300"}`
  }, "Dolgoz\xF3 felv\xE9tele"))));
}

// ── Sheet: új távollét-kérelem ───────────────────────────────────
function NewAbsenceSheet({
  onClose,
  defaultEmpId
}) {
  const sim = useSim();
  const [empId, setEmpId] = useStateH2(defaultEmpId || window.sim.employeeList()[0]?.id || "");
  const [type, setType] = useStateH2("szabadsag");
  const [start, setStart] = useStateH2("");
  const [end, setEnd] = useStateH2("");
  const [reason, setReason] = useStateH2("");
  const emps = window.sim.employeeList();
  const days = start ? window.HrEngine.workdaysBetween(start, end || start) : 0;
  const save = () => {
    if (!empId || !start) return;
    window.sim.addAbsence({
      empId,
      type,
      start,
      end: end || start,
      reason
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
    className: "relative bg-white w-full md:max-w-[460px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "\xDAj t\xE1voll\xE9t-k\xE9relem"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-2.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Dolgoz\xF3"), /*#__PURE__*/React.createElement("select", {
    value: empId,
    onChange: e => setEmpId(e.target.value),
    className: h2cls
  }, emps.map(e => /*#__PURE__*/React.createElement("option", {
    key: e.id,
    value: e.id
  }, e.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "T\xEDpus"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1.5"
  }, (window.ABS_TYPE_ORDER || []).map(k => {
    const m = window.ABS_TYPE_META[k];
    const on = type === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setType(k),
      className: `flex items-center gap-1.5 py-2 px-2.5 rounded-lg border text-[11.5px] font-medium ${on ? "border-amber-500 bg-amber-50 text-amber-800" : "border-stone-200 bg-white text-stone-600"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 14
    }), m.label);
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Kezd\xE9s"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: start,
    onChange: e => setStart(e.target.value),
    className: h2cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "V\xE9ge"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: end,
    onChange: e => setEnd(e.target.value),
    className: h2cls
  }))), start && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, days, " munkanap"), empId && (type === "szabadsag" || type === "betegseg") && (() => {
    const bal = type === "szabadsag" ? window.sim.hrVacationBalance(empId) : window.sim.hrSickBalance(empId);
    if (!bal) return null;
    const over = days > bal.remaining;
    return /*#__PURE__*/React.createElement("div", {
      className: `text-[11px] ${over ? "text-rose-600 font-medium" : "text-stone-500"}`
    }, type === "szabadsag" ? "Szabadság" : "Betegszab.", "-egyenleg: ", bal.remaining, " nap maradt", over ? ` — a kérelem (${days} nap) túllépi a keretet!` : "");
  })(), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Indok (opcion\xE1lis)"), /*#__PURE__*/React.createElement("input", {
    value: reason,
    onChange: e => setReason(e.target.value),
    className: h2cls
  })), /*#__PURE__*/React.createElement("button", {
    onClick: save,
    disabled: !empId || !start,
    className: `w-full h-10 rounded-xl text-white text-[13px] font-medium mt-1 ${empId && start ? "bg-amber-600" : "bg-stone-300"}`
  }, "K\xE9relem bead\xE1sa"))));
}

// ── Profil: Személyes / HR törzsadat fül ─────────────────────────
function H2Field({
  label,
  wide,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: wide ? "col-span-2" : ""
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[9.5px] text-stone-400 block mb-0.5"
  }, label), children);
}
function H2ReadVal({
  v
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "h-9 px-2.5 rounded-lg border border-stone-100 bg-stone-50/60 text-[12.5px] text-stone-700 flex items-center truncate"
  }, v || /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300"
  }, "\u2014"));
}
function EmpPersonalTab({
  emp
}) {
  const sim = useSim();
  const canManage = window.sim.hasPerm("hr.manage");
  const p = emp.personal || {};
  const setP = patch => window.sim.setEmployeePersonal(emp.id, patch);
  const GROUPS = window.HR_PERSONAL_GROUPS || [];
  const FIELDS = window.HR_PERSONAL_FIELDS || [];
  const MARITAL = window.HR_MARITAL || {};
  const kids = Number(p.children) || 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, !canManage && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
  }, "\xC9rz\xE9keny HR-adatok \u2014 szerkeszt\xE9shez HR-jog (hr.manage) kell. Most csak megtekint\xE9s."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Csal\xE1di adatok"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement(H2Field, {
    label: "Csal\xE1di \xE1llapot"
  }, canManage ? /*#__PURE__*/React.createElement("select", {
    value: p.maritalStatus || "",
    onChange: e => setP({
      maritalStatus: e.target.value
    }),
    className: h2cls
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014"), (window.HR_MARITAL_ORDER || []).map(k => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, MARITAL[k].label))) : /*#__PURE__*/React.createElement(H2ReadVal, {
    v: p.maritalStatus ? (MARITAL[p.maritalStatus] || {}).label : null
  })), /*#__PURE__*/React.createElement(H2Field, {
    label: "Gyermekek sz\xE1ma"
  }, canManage ? /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    value: p.children != null ? p.children : "",
    onChange: e => setP({
      children: e.target.value === "" ? null : Number(e.target.value) || 0
    }),
    className: h2cls
  }) : /*#__PURE__*/React.createElement(H2ReadVal, {
    v: p.children != null ? p.children + " fő" : null
  }))), kids > 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-teal-700 mt-1.5 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar",
    size: 12
  }), "+", window.HrEngine.childVacationDays(kids), " munkanap gyermek-p\xF3tszabads\xE1g (Mt. \xA7118) \u2014 a Szabads\xE1g f\xFCl\xF6n besz\xE1m\xEDtva.")), GROUPS.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.key
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, g.label), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, FIELDS.filter(f => f.group === g.key).map(f => /*#__PURE__*/React.createElement(H2Field, {
    key: f.key,
    label: f.label,
    wide: f.wide
  }, canManage ? /*#__PURE__*/React.createElement("input", {
    type: f.type === "date" ? "date" : f.type === "tel" ? "tel" : "text",
    value: p[f.key] || "",
    onChange: e => setP({
      [f.key]: e.target.value
    }),
    className: h2cls
  }) : /*#__PURE__*/React.createElement(H2ReadVal, {
    v: p[f.key]
  })))))));
}

// ── Profil: Szabadság & betegszabadság fül ───────────────────────
function EmpLeaveTab({
  emp
}) {
  const sim = useSim();
  const [addOpen, setAddOpen] = useStateH2(false);
  const vac = window.sim.hrVacationBalance(emp.id) || {
    remaining: 0,
    entitlement: 0,
    used: 0,
    base: 0,
    childExtra: 0
  };
  const sick = window.sim.hrSickBalance(emp.id) || {
    remaining: 0,
    annual: 0,
    used: 0
  };
  const abss = window.sim.absencesForEmployee(emp.id);
  const year = window.sim.hrYear ? window.sim.hrYear() : "";
  const Bar = ({
    used,
    total,
    tone
  }) => {
    const pct = total > 0 ? Math.min(100, used / total * 100) : 0;
    return /*#__PURE__*/React.createElement("div", {
      className: "h-2 rounded-full bg-stone-100 overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: `h-full ${tone}`,
      style: {
        width: pct + "%"
      }
    }));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar",
    size: 14,
    className: "text-teal-600"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-semibold text-stone-800"
  }, "Szabads\xE1g ", year)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end gap-1 mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[22px] font-semibold text-stone-900 leading-none"
  }, vac.remaining), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400 mb-0.5"
  }, "/ ", vac.entitlement, " nap maradt")), /*#__PURE__*/React.createElement(Bar, {
    used: vac.used,
    total: vac.entitlement,
    tone: "bg-teal-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1.5"
  }, vac.used, " nap kiv\xE9ve \xB7 alap ", vac.base, vac.childExtra ? ` + ${vac.childExtra} gyermek-pótszab.` : "")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield",
    size: 14,
    className: "text-rose-600"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-semibold text-stone-800"
  }, "Betegszab. ", year)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end gap-1 mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[22px] font-semibold text-stone-900 leading-none"
  }, sick.remaining), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400 mb-0.5"
  }, "/ ", sick.annual, " nap maradt")), /*#__PURE__*/React.createElement(Bar, {
    used: sick.used,
    total: sick.annual,
    tone: "bg-rose-400"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1.5"
  }, sick.used, " nap ig\xE9nybe v\xE9ve (Mt. \xE9vi ", sick.annual, ")"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, "T\xE1voll\xE9tek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAddOpen(true),
    className: "text-[11.5px] text-amber-700 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "\xDAj k\xE9relem")), abss.length ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, abss.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    className: "flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(window.AbsTypeBadge, {
    type: a.type
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, a.start, "\u2013", a.end, " \xB7 ", a.days, " nap")), /*#__PURE__*/React.createElement(window.AbsStatusPill, {
    status: a.status,
    size: "sm"
  })))) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs r\xF6gz\xEDtett t\xE1voll\xE9t.")), addOpen && window.NewAbsenceSheet && /*#__PURE__*/React.createElement(window.NewAbsenceSheet, {
    onClose: () => setAddOpen(false),
    defaultEmpId: emp.id
  }));
}
Object.assign(window, {
  EmployeeDetail,
  AddAssignmentForm,
  AddTimeLogForm,
  HrAbsence,
  HrSkills,
  NewEmployeeSheet,
  NewAbsenceSheet
});
})();
