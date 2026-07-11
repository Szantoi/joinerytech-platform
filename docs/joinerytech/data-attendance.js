// ──────────────────────────────────────────────────────────────────────────
// IDŐ & JELENLÉT világ (Time & Attendance)
//
// FELELŐSSÉG: a napi jelenlét — be-/kijelentkezés, ledolgozott óra, túlóra,
// jelenléti ív, jóváhagyás. A DOLGOZÓI TÖRZS az HR-é (`sim.employees`) — ide
// csak HIVATKOZUNK (empId). Feeds: HR-kapacitás (tény-jelenlét) + a teljes
// bérköltség (Kontrolling-szintű rezsi). HATÁR: a HR `timeLogs` = PROJEKT-
// munkaóra allokáció (→ projekt-kontrolling); az `attendance` = NAPI jelenlét/
// műszak — két külön réteg, NEM duplikálják egymást.
// Egy bejegyzés (`sim.attendance[]`) saját FSM-mel.
// ──────────────────────────────────────────────────────────────────────────

const ATT_TODAY = "2026-04-28";
const ATT_STD_DAY = 8;     // standard napi óra (túlóra-küszöb)
const ATT_BREAK = 0.5;     // levont ebédszünet 6 óra felett
const ATT_OT_MULT = 1.5;   // túlóra-szorzó a bérköltségben

// ── Bejegyzés-típusok ───────────────────────────────────────────────────────
const ATT_TYPE_META = {
  munka:     { key: "munka",     label: "Munka",      short: "Munka",    icon: "clock",  accent: "#ea580c", pill: "bg-orange-50 text-orange-700 border-orange-200" },
  tullora:   { key: "tullora",   label: "Túlóra",     short: "Túlóra",   icon: "bolt",   accent: "#d97706", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  keszenlet: { key: "keszenlet", label: "Készenlét",  short: "Készenlét",icon: "rotate", accent: "#0284c7", pill: "bg-sky-50 text-sky-700 border-sky-200" },
};
const ATT_TYPE_ORDER = ["munka", "tullora", "keszenlet"];

// ── Státusz-FSM ─────────────────────────────────────────────────────────────
// bejelentkezve → kijelentkezve → jovahagyva   (mellék: kijelentkezve → elutasitva → kijelentkezve)
const ATT_FLOW = {
  order: ["bejelentkezve", "kijelentkezve", "jovahagyva"],
  states: {
    bejelentkezve: { next: ["kijelentkezve"] },
    kijelentkezve: { next: ["jovahagyva", "elutasitva"] },
    jovahagyva:    { next: [], terminal: true },
    elutasitva:    { next: ["kijelentkezve"] },
  },
};
const ATT_STATUS = {
  bejelentkezve: { label: "Bejelentkezve", pill: "bg-sky-50 text-sky-700 border-sky-200",            dot: "bg-sky-500" },
  kijelentkezve: { label: "Jóváhagyásra",  pill: "bg-amber-50 text-amber-700 border-amber-200",      dot: "bg-amber-500" },
  jovahagyva:    { label: "Jóváhagyva",    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",dot: "bg-emerald-500" },
  elutasitva:    { label: "Elutasítva",    pill: "bg-rose-50 text-rose-700 border-rose-200",         dot: "bg-rose-500" },
};

// ── Seed jelenléti bejegyzések ──────────────────────────────────────────────
// (Tóth Kinga ma táppénzen — HR `ABS-2426-005` folyamatban — ezért ma nincs jelenléte.)
const ATTENDANCE_SEED = [
  // ── MA (2026-04-28) — műszak folyamatban / lezárva ──
  { id: "ATT-0001", empId: "emp-kissa",  date: "2026-04-28", type: "munka",   clockIn: "07:02", clockOut: null,    status: "bejelentkezve", note: "" },
  { id: "ATT-0002", empId: "emp-horvg",  date: "2026-04-28", type: "munka",   clockIn: "06:58", clockOut: null,    status: "bejelentkezve", note: "" },
  { id: "ATT-0003", empId: "emp-vargal", date: "2026-04-28", type: "munka",   clockIn: "07:10", clockOut: null,    status: "bejelentkezve", note: "Felületkezelés" },
  { id: "ATT-0004", empId: "emp-balogm", date: "2026-04-28", type: "munka",   clockIn: "07:05", clockOut: null,    status: "bejelentkezve", note: "" },
  { id: "ATT-0005", empId: "emp-horve",  date: "2026-04-28", type: "munka",   clockIn: "08:00", clockOut: null,    status: "bejelentkezve", note: "Részmunkaidő" },
  { id: "ATT-0006", empId: "emp-nagyj",  date: "2026-04-28", type: "munka",   clockIn: "06:40", clockOut: null,    status: "bejelentkezve", note: "Helyszíni beépítés-előkészítés" },

  // ── TEGNAP (2026-04-27) — lezárt / jóváhagyott ──
  { id: "ATT-0007", empId: "emp-kissa",  date: "2026-04-27", type: "munka",   clockIn: "07:00", clockOut: "16:30", status: "jovahagyva",   note: "", approvedBy: "Kovács Péter" },
  { id: "ATT-0008", empId: "emp-horvg",  date: "2026-04-27", type: "munka",   clockIn: "07:00", clockOut: "15:30", status: "jovahagyva",   note: "", approvedBy: "Kovács Péter" },
  { id: "ATT-0009", empId: "emp-vargal", date: "2026-04-27", type: "munka",   clockIn: "07:15", clockOut: "15:45", status: "kijelentkezve",note: "Jóváhagyásra vár" },
  { id: "ATT-0010", empId: "emp-balogm", date: "2026-04-27", type: "munka",   clockIn: "07:00", clockOut: "15:30", status: "jovahagyva",   note: "", approvedBy: "Kovács Péter" },
  { id: "ATT-0011", empId: "emp-nagyj",  date: "2026-04-27", type: "tullora", clockIn: "06:30", clockOut: "18:15", status: "kijelentkezve",note: "Tóth konyha kiszállítás + beépítés (Szeged)" },
  { id: "ATT-0012", empId: "emp-horve",  date: "2026-04-27", type: "munka",   clockIn: "08:00", clockOut: "14:30", status: "jovahagyva",   note: "", approvedBy: "Kovács Péter" },
];

// ──────────────────────────────────────────────────────────────────────────
// AttEngine — tiszta számítások (óra, túlóra, bérköltség, napi/időszaki összegzés)
// ──────────────────────────────────────────────────────────────────────────
const _attMin = (t) => { if (!t) return null; const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };

const AttEngine = {
  canGo(e, to) { const st = ATT_FLOW.states[e.status]; return !!(st && st.next.includes(to)); },
  nextStates(e) { const st = ATT_FLOW.states[e.status]; return st ? st.next.slice() : []; },
  isOpen(e) { return e.status === "bejelentkezve"; },   // még bent van
  // nettó ledolgozott óra (0,5h ebéd levonva 6h felett); folyamatban: a "most"-ig
  hours(e, nowMin) {
    const inM = _attMin(e.clockIn);
    let outM = _attMin(e.clockOut);
    if (outM === null) outM = (nowMin != null ? nowMin : null);
    if (inM === null || outM === null) return null;
    let h = (outM - inM) / 60;
    if (h > 6) h -= ATT_BREAK;
    return Math.max(0, Math.round(h * 100) / 100);
  },
  overtime(e, nowMin) { const h = this.hours(e, nowMin); return h != null && h > ATT_STD_DAY ? Math.round((h - ATT_STD_DAY) * 100) / 100 : 0; },
  rate(emp) { return (emp && emp.hourlyCost) || ((window.HR_PAY_GRADES && window.HR_PAY_GRADES[emp && emp.payGrade]) || {}).rate || 3800; },
  // bérköltség: alapóra × ráta + túlóra × ráta × szorzó (nowMin a folyamatban lévő bejegyzéshez)
  cost(e, emp, nowMin) {
    const h = this.hours(e, nowMin); if (h == null) return 0;
    const r = this.rate(emp);
    const ot = this.overtime(e, nowMin), base = h - ot;
    return Math.round(base * r + ot * r * ATT_OT_MULT);
  },
  // egy bejegyzés folyamatban lévő órája a megadott "most" perchez
  liveHours(e, nowMin) { return this.hours(e, nowMin); },
  // időszaki összegzés: ledolgozott óra, túlóra, bérköltség, jelen lévők
  summary(entries, empById, opts = {}) {
    const list = entries || [];
    let hours = 0, ot = 0, cost = 0, present = 0;
    list.forEach((e) => {
      const emp = empById ? empById(e.empId) : null;
      const h = this.hours(e, opts.nowMin);
      if (h != null) { hours += h; ot += this.overtime(e, opts.nowMin); cost += this.cost(e, emp, opts.nowMin); }
      if (e.status === "bejelentkezve") present++;
    });
    return { hours: Math.round(hours * 10) / 10, overtime: Math.round(ot * 10) / 10, cost, present, count: list.length };
  },
};

Object.assign(window, {
  ATT_TODAY, ATT_STD_DAY, ATT_BREAK, ATT_OT_MULT,
  ATT_TYPE_META, ATT_TYPE_ORDER, ATT_FLOW, ATT_STATUS,
  ATTENDANCE_SEED, AttEngine,
});
