/* AUTO-GENERATED from page-attendance.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-attendance.jsx — IDŐ & JELENLÉT világ (Time & Attendance)
//   Áttekintés (KPI: jelen lévők / óra / túlóra / bérköltség + jóváhagyásra
//   várók) + Terminál (be-/kijelentkezés, tablet-first) + Jelenléti ív
//   (dolgozónként, jóváhagyás-FSM). A DOLGOZÓ = HR (sim.employees), ide csak
//   hivatkozunk. Store: window.sim.attendance + akciók; AttEngine.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateA
} = React;
const ATT_NOW_MIN = 14 * 60 + 30; // demó „most" (14:30) a folyamatban lévő órák becsléséhez
const attEmpById = (sim, id) => (sim.employees || []).find(e => e.id === id) || {
  name: id,
  initials: "?",
  color: "#78716c",
  payGrade: "szakmunkas"
};
const attFt = n => {
  n = Math.round(Number(n) || 0);
  return n.toLocaleString("hu-HU") + " Ft";
};
function AttAvatar({
  emp,
  size = 34
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-full grid place-items-center text-white font-semibold shrink-0",
    style: {
      width: size,
      height: size,
      background: emp.color || "#78716c",
      fontSize: size * 0.36
    }
  }, emp.initials || "?");
}
function AttStatusPill({
  status,
  size = "md"
}) {
  const t = (window.ATT_STATUS || {})[status] || {
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
function AttTypeBadge({
  type,
  size = "sm"
}) {
  const m = (window.ATT_TYPE_META || {})[type] || {};
  if (type === "munka") return null;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 rounded-md border font-medium ${cls} ${m.pill}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "clock",
    size: 11
  }), m.short || type);
}
const attHoursLabel = h => h == null ? "—" : `${h.toFixed(1).replace(".", ",")} ó`;

// ── Áttekintés ───────────────────────────────────────────────────
function AttendanceDashboard({
  onScreen
}) {
  const sim = useSim();
  const E = window.AttEngine;
  const today = sim.today || window.ATT_TODAY;
  const todays = (sim.attendance || []).filter(e => e.date === today);
  const [openEmp, setOpenEmp] = useStateA(null);
  const [otOpen, setOtOpen] = useStateA(false);
  const sum = E ? E.summary(todays, id => attEmpById(sim, id), {
    nowMin: ATT_NOW_MIN
  }) : {
    present: 0,
    hours: 0,
    overtime: 0,
    cost: 0
  };
  const pending = (sim.attendance || []).filter(e => e.status === "kijelentkezve");
  const present = todays.filter(e => e.status === "bejelentkezve");
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
  }, "Id\u0151 & jelenl\xE9t"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Napi jelenl\xE9t \xE9s b\xE9rk\xF6lts\xE9g \u2014 ", today)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 shrink-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOtOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-stone-200 bg-white text-stone-700 text-[12.5px] font-medium hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bolt",
    size: 15,
    className: "text-amber-500"
  }), "T\xFAl\xF3ra elrendel\xE9se"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("terminal"),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[12.5px] font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 15
  }), "Termin\xE1l"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement(KPI, {
    label: "Jelen van",
    value: sum.present,
    sub: `${todays.length} mai bejegyzés`,
    tone: "orange",
    icon: "user"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Ledolgozott \xF3ra ma",
    value: attHoursLabel(sum.hours),
    sub: "nett\xF3 (folyamatban becs\xFClt)",
    tone: "sky",
    icon: "clock"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "T\xFAl\xF3ra ma",
    value: attHoursLabel(sum.overtime),
    sub: "8 \xF3ra felett",
    tone: "amber",
    icon: "bolt"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "B\xE9rk\xF6lts\xE9g ma",
    value: attFt(sum.cost),
    sub: "jelenl\xE9t alapj\xE1n",
    tone: "emerald",
    icon: "receipt"
  })), pending.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("timesheet"),
    className: "w-full mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3 text-left hover:bg-amber-100/60"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 18,
    className: "text-amber-600 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-amber-800"
  }, pending.length, " bejegyz\xE9s j\xF3v\xE1hagy\xE1sra v\xE1r"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-amber-700/80 truncate"
  }, "Jelenl\xE9ti \xEDv \u2192 j\xF3v\xE1hagy\xE1s")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 15,
    className: "text-amber-400"
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Jelenleg bent (", present.length, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("terminal"),
    className: "text-[11.5px] text-orange-600 font-medium inline-flex items-center gap-1"
  }, "Termin\xE1l ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  }))), present.length ? present.map(e => {
    const emp = attEmpById(sim, e.empId);
    const h = E ? E.hours(e, ATT_NOW_MIN) : null;
    return /*#__PURE__*/React.createElement("div", {
      key: e.id,
      className: "px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3"
    }, /*#__PURE__*/React.createElement(AttAvatar, {
      emp: emp
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] font-semibold text-stone-900 truncate"
    }, emp.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 truncate"
    }, emp.role || "", e.note ? ` · ${e.note}` : "")), /*#__PURE__*/React.createElement("div", {
      className: "shrink-0 flex flex-col items-end gap-0.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-medium text-stone-700"
    }, e.clockIn, " \u2192 ", /*#__PURE__*/React.createElement("span", {
      className: "text-orange-600"
    }, "most")), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400"
    }, attHoursLabel(h), /*#__PURE__*/React.createElement(AttTypeBadge, {
      type: e.type
    }))));
  }) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-10 text-center text-[12.5px] text-stone-400"
  }, "Jelenleg senki nincs bejelentkezve.")), otOpen && /*#__PURE__*/React.createElement(OvertimeSheet, {
    onClose: () => setOtOpen(false)
  }));
}

// ── Túlóra elrendelése (limit felett jóváhagyás-köteles — 4.8-B2) ──────────
function OvertimeSheet({
  onClose
}) {
  const sim = useSim();
  const emps = (sim.employees || []).filter(e => e.active !== false);
  const [empId, setEmpId] = useStateA(emps[0] ? emps[0].id : "");
  const [hours, setHours] = useStateA(2);
  const [date, setDate] = useStateA(sim.today || window.ATT_TODAY);
  const [reason, setReason] = useStateA("");
  const limit = (sim.authConfig || {}).overtimeHours;
  const overLimit = limit != null && (Number(hours) || 0) > limit;
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-orange-500";
  const submit = () => {
    if (!empId) return;
    window.sim.orderOvertime({
      empId,
      hours: Number(hours) || 0,
      date,
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
    className: "relative bg-white w-full md:max-w-[440px] md:rounded-2xl rounded-t-2xl overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "T\xFAl\xF3ra elrendel\xE9se"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Dolgoz\xF3"), /*#__PURE__*/React.createElement("select", {
    value: empId,
    onChange: e => setEmpId(e.target.value),
    className: cls
  }, emps.map(e => /*#__PURE__*/React.createElement("option", {
    key: e.id,
    value: e.id
  }, e.name, " \xB7 ", e.role || "")))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "D\xE1tum"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: date,
    onChange: e => setDate(e.target.value),
    className: cls
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-28"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "T\xFAl\xF3ra (\xF3)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.5",
    value: hours,
    onChange: e => setHours(e.target.value),
    className: cls
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Indok"), /*#__PURE__*/React.createElement("textarea", {
    value: reason,
    onChange: e => setReason(e.target.value),
    rows: 2,
    placeholder: "Pl. s\xFCrg\u0151s hat\xE1rid\u0151s rendel\xE9s\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-orange-500"
  })), overLimit ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11.5px] text-amber-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 15,
    className: "shrink-0"
  }), "A ", hours, " \xF3 t\xFAl\xF3ra a ", limit, " \xF3-s limit felett van \u2014 ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "j\xF3v\xE1hagy\xE1sra ker\xFCl"), " (Feladataim).") : /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400"
  }, "A ", limit, " \xF3-s napi t\xFAl\xF3ra-limit felett j\xF3v\xE1hagy\xE1s sz\xFCks\xE9ges (Be\xE1ll\xEDt\xE1sok \u2192 Hat\xE1sk\xF6r\xF6k)."), /*#__PURE__*/React.createElement("button", {
    disabled: !empId,
    onClick: submit,
    className: "w-full h-10 rounded-xl bg-orange-600 text-white text-[13px] font-semibold disabled:opacity-40"
  }, overLimit ? "Jóváhagyásra küldés" : "Túlóra elrendelése"))));
}

// ── Terminál (be-/kijelentkezés) ─────────────────────────────────
function AttendanceTerminal() {
  const sim = useSim();
  const E = window.AttEngine;
  const today = sim.today || window.ATT_TODAY;
  const emps = (sim.employees || []).filter(e => e.active !== false);
  const todays = (sim.attendance || []).filter(e => e.date === today);
  const openFor = empId => todays.find(e => e.empId === empId && e.status === "bejelentkezve");
  const lastFor = empId => todays.find(e => e.empId === empId);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900 mb-1"
  }, "Termin\xE1l"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mb-4"
  }, "Koppints a k\xE1rty\xE1ra a be- vagy kijelentkez\xE9shez \u2014 ", today), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
  }, emps.map(emp => {
    const open = openFor(emp.id),
      last = lastFor(emp.id);
    const inNow = !!open;
    const h = open && E ? E.hours(open, ATT_NOW_MIN) : null;
    return /*#__PURE__*/React.createElement("div", {
      key: emp.id,
      className: `rounded-2xl border p-3.5 flex flex-col ${inNow ? "border-orange-300 bg-orange-50/40" : "border-stone-200 bg-white"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2.5 mb-3"
    }, /*#__PURE__*/React.createElement(AttAvatar, {
      emp: emp,
      size: 40
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] font-semibold text-stone-900 truncate"
    }, emp.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 truncate"
    }, emp.role || ""))), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 mb-3"
    }, inNow ? /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-600"
    }, "Bejelentkezve: ", /*#__PURE__*/React.createElement("span", {
      className: "font-semibold text-stone-900"
    }, open.clockIn), " \xB7 ", attHoursLabel(h)) : last ? /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-400"
    }, "Ma: ", last.clockIn, "\u2013", last.clockOut || "?", " \xB7 ", /*#__PURE__*/React.createElement(AttStatusPill, {
      status: last.status,
      size: "sm"
    })) : /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-400"
    }, "Ma m\xE9g nem dolgozott.")), inNow ? /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.clockOut(open.id),
      className: "w-full h-10 rounded-xl bg-stone-800 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-stone-900"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "logout",
      size: 15
    }), "Kijelentkez\xE9s") : /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.clockIn(emp.id),
      className: "w-full h-10 rounded-xl bg-orange-600 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-orange-700"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "clock",
      size: 15
    }), "Bejelentkez\xE9s"));
  })));
}

// ── Jelenléti ív (jóváhagyás-FSM) ────────────────────────────────
function AttendanceTimesheet() {
  const sim = useSim();
  const E = window.AttEngine;
  const canApprove = window.sim.hasPerm && window.sim.hasPerm("attendance.manage");
  const [empF, setEmpF] = useStateA("all");
  const emps = (sim.employees || []).filter(e => e.active !== false);
  let entries = (sim.attendance || []).slice();
  if (empF !== "all") entries = entries.filter(e => e.empId === empF);
  // csoportosítás dátum szerint (csökkenő)
  const dates = Array.from(new Set(entries.map(e => e.date))).sort((a, b) => b.localeCompare(a));
  const Row = ({
    e
  }) => {
    const emp = attEmpById(sim, e.empId);
    const h = E ? E.hours(e, ATT_NOW_MIN) : null;
    const ot = E ? E.overtime(e, ATT_NOW_MIN) : 0;
    const cost = E ? E.cost(e, emp, ATT_NOW_MIN) : 0;
    const pending = e.status === "kijelentkezve";
    return /*#__PURE__*/React.createElement("div", {
      className: "px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3"
    }, /*#__PURE__*/React.createElement(AttAvatar, {
      emp: emp,
      size: 30
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-semibold text-stone-900 truncate"
    }, emp.name), /*#__PURE__*/React.createElement(AttTypeBadge, {
      type: e.type
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 truncate mt-0.5"
    }, e.clockIn, "\u2013", e.clockOut || (e.status === "bejelentkezve" ? "most" : "?"), " \xB7 ", attHoursLabel(h), ot > 0 ? ` · +${ot.toFixed(1).replace(".", ",")}ó túlóra` : "", " \xB7 ", attFt(cost), e.note ? ` · ${e.note}` : "")), /*#__PURE__*/React.createElement("div", {
      className: "shrink-0 flex items-center gap-1.5"
    }, pending && canApprove ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.setAttStatus(e.id, "jovahagyva"),
      className: "h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-[11.5px] font-medium inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13
    }), "J\xF3v\xE1hagy"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.setAttStatus(e.id, "elutasitva", {
        reason: "Pontosítás szükséges"
      }),
      className: "h-8 px-2 rounded-lg border border-stone-200 text-stone-500 text-[11.5px] font-medium hover:bg-stone-50"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 13
    }))) : /*#__PURE__*/React.createElement(AttStatusPill, {
      status: e.status,
      size: "sm"
    })));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1000px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Jelenl\xE9ti \xEDv"), /*#__PURE__*/React.createElement("select", {
    value: empF,
    onChange: e => setEmpF(e.target.value),
    className: "h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-orange-500 max-w-[180px]"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Minden dolgoz\xF3"), emps.map(e => /*#__PURE__*/React.createElement("option", {
    key: e.id,
    value: e.id
  }, e.name)))), !canApprove && /*#__PURE__*/React.createElement("div", {
    className: "mb-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[11.5px] text-stone-500 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13
  }), "A j\xF3v\xE1hagy\xE1shoz ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "attendance.manage"), " jog kell."), dates.map(d => {
    const dayEntries = entries.filter(e => e.date === d);
    const sum = E ? E.summary(dayEntries, id => attEmpById(sim, id), {
      nowMin: ATT_NOW_MIN
    }) : {
      hours: 0,
      cost: 0
    };
    return /*#__PURE__*/React.createElement("div", {
      key: d,
      className: "bg-white rounded-2xl border border-stone-200 overflow-hidden mb-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-semibold text-stone-800 inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "calendar",
      size: 14,
      className: "text-stone-400"
    }), d), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-500"
    }, attHoursLabel(sum.hours), " \xB7 ", attFt(sum.cost))), dayEntries.map(e => /*#__PURE__*/React.createElement(Row, {
      key: e.id,
      e: e
    })));
  }), !dates.length && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs bejegyz\xE9s."));
}
Object.assign(window, {
  AttAvatar,
  AttStatusPill,
  AttTypeBadge,
  AttendanceDashboard,
  AttendanceTerminal,
  AttendanceTimesheet,
  OvertimeSheet
});
})();
