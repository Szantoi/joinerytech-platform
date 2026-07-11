// ──────────────────────────────────────────────────────────────────────────
// GYÁRTÁSÜTEMEZÉS / VÉGES KAPACITÁS — a Gyártás világ új képernyője
//
// FELELŐSSÉG: ütemező-vászon a gyártási taskoknak. Egy task → gép/stáció + nap +
// óra hozzárendelés; a gép-nap terhelés a kapacitáshoz mérve (ÜTKÖZÉS = terhelés
// > kapacitás). A gépek a Shop Floor gépparkjából + szerelő/felületkezelő
// stációkból jönnek (egy igazságforrás). A státusz a taskon él; a terhelés/
// ütközés SZÁMÍTOTT (ProdSchedEngine), soha nem tárolt.
// ──────────────────────────────────────────────────────────────────────────

const PROD_TODAY = "2026-04-28";
const PROD_WEEK_MONDAY = "2026-04-27"; // a megjelenített hét hétfője

// ── Stációk (gép + kézi munkahely) — napi kapacitás órában ───────────────────
// A gép-id-k a SHOPFLOOR_MACHINES-hoz kötnek; a szerelő/felületkezelő kézi.
const PROD_STATIONS = [
  { id: "M-HOLZMA-01", name: "Holzma HPP380", kind: "szabaszat",      facility: "Vác — főüzem",     dailyHours: 8 },
  { id: "M-BIESSE-01", name: "Biesse Selco",  kind: "szabaszat",      facility: "Vác — főüzem",     dailyHours: 8 },
  { id: "M-HOMAG-01",  name: "Homag KAL 310", kind: "elzaras",        facility: "Vác — főüzem",     dailyHours: 8 },
  { id: "M-BIESSE-02", name: "Biesse Rover",  kind: "cnc",            facility: "Vác — főüzem",     dailyHours: 8 },
  { id: "M-HOLZMA-02", name: "Holzma CNC",    kind: "cnc",            facility: "Sopron telephely", dailyHours: 8 },
  { id: "ST-ASSY-01",  name: "Szerelő pad",   kind: "szereles",       facility: "Vác — főüzem",     dailyHours: 16 },
  { id: "ST-FIN-01",   name: "Felületkezelő",  kind: "feluletkezeles", facility: "Vác — főüzem",     dailyHours: 8 },
];

// ── Művelet-típusok ──────────────────────────────────────────────────────────
const PROD_KINDS = {
  szabaszat:      { label: "Szabászat",      icon: "cut",      accent: "#0d9488", pill: "bg-teal-50 text-teal-700 border-teal-200" },
  elzaras:        { label: "Élzárás",        icon: "layers",   accent: "#0284c7", pill: "bg-sky-50 text-sky-700 border-sky-200" },
  cnc:            { label: "CNC",            icon: "settings", accent: "#7c3aed", pill: "bg-violet-50 text-violet-700 border-violet-200" },
  szereles:       { label: "Szerelés",       icon: "wrench",   accent: "#ea580c", pill: "bg-orange-50 text-orange-700 border-orange-200" },
  feluletkezeles: { label: "Felületkezelés", icon: "sparkle",  accent: "#65a30d", pill: "bg-lime-50 text-lime-700 border-lime-200" },
};
const PROD_KIND_ORDER = ["szabaszat", "elzaras", "cnc", "szereles", "feluletkezeles"];

// ── Task-FSM ─────────────────────────────────────────────────────────────────
// varolista → utemezve → folyamatban → kesz   (mellék: blokkolt)
const PROD_FLOW = {
  order: ["varolista", "utemezve", "folyamatban", "kesz"],
  states: {
    varolista:   { next: ["utemezve", "blokkolt"] },
    utemezve:    { next: ["folyamatban", "varolista", "blokkolt"] },
    folyamatban: { next: ["kesz", "blokkolt"] },
    kesz:        { next: [], terminal: true },
    blokkolt:    { next: ["varolista", "utemezve"] },
  },
};
const PROD_STATUS = {
  varolista:   { label: "Várólista",   pill: "bg-stone-100 text-stone-700 border-stone-200",      dot: "bg-stone-400" },
  utemezve:    { label: "Ütemezve",    pill: "bg-sky-50 text-sky-700 border-sky-200",             dot: "bg-sky-500" },
  folyamatban: { label: "Folyamatban", pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  kesz:        { label: "Kész",        pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  blokkolt:    { label: "Blokkolt",    pill: "bg-rose-50 text-rose-700 border-rose-200",          dot: "bg-rose-500" },
};

// ── Operátorok (a terminál bejelentkezéshez) ────────────────────────────────
const PROD_OPERATORS = [
  { name: "Nagy János",  initials: "NJ", role: "Szabász" },
  { name: "Kiss András", initials: "KA", role: "Élzáró / CNC" },
  { name: "Horváth Éva", initials: "HÉ", role: "CNC (Sopron)" },
  { name: "Kiss Zoltán", initials: "KZ", role: "Szerelő" },
  { name: "Tóth Kinga",  initials: "TK", role: "Szabász" },
];

// ── Seed gyártási taskok ─────────────────────────────────────────────────────
// Bővített modell: assignee (kihez osztva), prepBy (gyártás-előkészítő),
// projectOwner (projekt felelős), sessions[] (munka-naplók), events[] (visszajelzés/szkennelés).
const PRODTASK_SEED = [
  { id: "GT-2426-001", title: "Bognár konyha — korpusz szabás", order: "JT-2426-0184", customer: "Bognár Bútor Kft.", kind: "szabaszat", machineId: "M-HOLZMA-01", date: "2026-04-28", hours: 6, status: "folyamatban",
    assignee: "Nagy János", prepBy: "Nagy János", projectOwner: "Kovács Péter", note: "Bükk 18mm, 8 tábla.",
    sessions: [{ who: "Nagy János", startAt: "2026-04-28 06:30", endAt: "2026-04-28 08:20", minutes: 110 }], running: null,
    events: [{ at: "2026-04-28 06:25", who: "Nagy János", type: "scan", note: "Szkennelés: BK-018-2440 — anyag átvéve a raktárból" }, { at: "2026-04-28 06:30", who: "Nagy János", type: "start", note: "Munka megkezdve" }],
    log: [{ at: "2026-04-28 06:30", text: "Indítva — Holzma HPP380" }] },
  { id: "GT-2426-002", title: "Bognár konyha — front szabás", order: "JT-2426-0184", customer: "Bognár Bútor Kft.", kind: "szabaszat", machineId: "M-HOLZMA-01", date: "2026-04-29", hours: 5, status: "utemezve",
    assignee: "Nagy János", prepBy: "Nagy János", projectOwner: "Kovács Péter", note: "Tölgy 22mm frontok.",
    sessions: [], running: null, events: [],
    log: [{ at: "2026-04-28 09:00", text: "Ütemezve — Holzma, ápr. 29." }] },
  { id: "GT-2426-003", title: "Hegyi gardrób — korpusz szabás", order: "JT-2426-0180", customer: "Hegyi Lakberendezés", kind: "szabaszat", machineId: "M-HOLZMA-01", date: "2026-04-29", hours: 5, status: "utemezve",
    assignee: "Tóth Kinga", prepBy: "Nagy János", projectOwner: "Kiss Zoltán", note: "Túlterhelés-demó: ugyanaznap a Holzmán.",
    sessions: [], running: null, events: [],
    log: [{ at: "2026-04-28 09:10", text: "Ütemezve — Holzma, ápr. 29." }] },
  { id: "GT-2426-004", title: "Bognár konyha — élzárás", order: "JT-2426-0184", customer: "Bognár Bútor Kft.", kind: "elzaras", machineId: "M-HOMAG-01", date: "2026-04-30", hours: 4, status: "utemezve",
    assignee: "Kiss András", prepBy: "Nagy János", projectOwner: "Kovács Péter", note: "ABS 2mm tölgy színazonos.",
    sessions: [], running: null, events: [],
    log: [{ at: "2026-04-28 09:20", text: "Ütemezve — Homag, ápr. 30." }] },
  { id: "GT-2426-005", title: "Doorstar ajtó — CNC fúrás", order: "JT-2426-0182", customer: "Doorstar Hungary Zrt.", kind: "cnc", machineId: "M-HOLZMA-02", date: "2026-04-29", hours: 7, status: "utemezve",
    assignee: "Horváth Éva", prepBy: "Nagy János", projectOwner: "Szabó Anna", note: "Pánt-furat program, 32 db ajtó.", program: "DOOR_HINGE_M3.cnc",
    sessions: [], running: null, events: [],
    log: [{ at: "2026-04-28 10:00", text: "Ütemezve — Holzma CNC (Sopron)." }] },
  { id: "GT-2426-006", title: "Bognár konyha — szerelés", order: "JT-2426-0184", customer: "Bognár Bútor Kft.", kind: "szereles", machineId: null, date: null, hours: 8, status: "varolista",
    assignee: "Kiss Zoltán", prepBy: "Nagy János", projectOwner: "Kovács Péter", note: "Szabászat + élzárás után.",
    sessions: [], running: null, events: [],
    log: [{ at: "2026-04-28 08:00", text: "Várólistára került" }] },
  { id: "GT-2426-007", title: "Doorstar ajtó — felületkezelés", order: "JT-2426-0182", customer: "Doorstar Hungary Zrt.", kind: "feluletkezeles", machineId: null, date: null, hours: 6, status: "varolista",
    assignee: "", prepBy: "Nagy János", projectOwner: "Szabó Anna", note: "Lakkozás, 2 réteg.",
    sessions: [], running: null, events: [],
    log: [{ at: "2026-04-28 08:05", text: "Várólistára került" }] },
  { id: "GT-2426-008", title: "Hegyi gardrób — szerelés", order: "JT-2426-0180", customer: "Hegyi Lakberendezés", kind: "szereles", machineId: "ST-ASSY-01", date: "2026-05-01", hours: 6, status: "blokkolt",
    assignee: "Kiss Zoltán", prepBy: "Nagy János", projectOwner: "Kiss Zoltán", note: "Tolóajtó-sín hiányzik (beszerzés alatt).",
    sessions: [], running: null, events: [],
    log: [{ at: "2026-04-28 11:00", text: "Blokkolva — alapanyag-hiány" }] },
];

// ──────────────────────────────────────────────────────────────────────────
// ProdSchedEngine — tiszta számítások (FSM, gép-nap terhelés, ütközés)
// ──────────────────────────────────────────────────────────────────────────
const _pParse = (s) => { const [y, m, d] = String(s || "").split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const _pFmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
const PROD_DOW = ["Hétfő", "Kedd", "Szerda", "Csüt.", "Péntek", "Szombat", "Vasárnap"];

const ProdSchedEngine = {
  canGo(t, to) { const st = PROD_FLOW.states[t.status]; return !!(st && st.next.includes(to)); },
  nextStates(t) { const st = PROD_FLOW.states[t.status]; return st ? st.next.slice() : []; },
  isTerminal(t) { const st = PROD_FLOW.states[t.status]; return !!(st && st.terminal); },
  stationById(id) { return PROD_STATIONS.find((s) => s.id === id) || null; },
  downKey(machineId, date) { return machineId + "|" + date; },
  isDown(down, machineId, date) { return !!(down && down[machineId + "|" + date]); },
  // gép-nap kapacitás — LEÁLLÁS-tudatos: ha a `down` map jelzi a gép-napot, 0 (nem ütemezhető)
  capacityOf(id, date, down) {
    if (down && date && this.isDown(down, id, date)) return 0;
    const s = this.stationById(id); return s ? s.dailyHours : 8;
  },
  // egy gép-nap lekötött órái (csak az aktív, nem-kész/nem-blokkolt taskok)
  dayLoad(tasks, machineId, date) {
    return (tasks || []).filter((t) => t.machineId === machineId && t.date === date && ["utemezve", "folyamatban"].includes(t.status))
      .reduce((s, t) => s + (Number(t.hours) || 0), 0);
  },
  // ÜTKÖZÉS = lekötött > kapacitás; leállított gépen MINDEN lekötött óra ütközés (kapacitás 0)
  isOverloaded(tasks, machineId, date, down) { return this.dayLoad(tasks, machineId, date) > this.capacityOf(machineId, date, down) + 1e-9; },
  // a hét 5 munkanapja (hétfőtől)
  weekDays(mondayStr) { const mon = _pParse(mondayStr); return Array.from({ length: 5 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return { date: _pFmt(d), dow: PROD_DOW[i], dom: d.getDate() }; }); },
  // a hét összes ütközése: { machineId, date } halmaz
  conflicts(tasks, mondayStr, down) {
    const days = this.weekDays(mondayStr).map((d) => d.date);
    const set = [];
    PROD_STATIONS.forEach((m) => days.forEach((date) => { if (this.isOverloaded(tasks, m.id, date, down)) set.push({ machineId: m.id, date, down: this.isDown(down, m.id, date) }); }));
    return set;
  },
  unscheduled(tasks) { return (tasks || []).filter((t) => t.status === "varolista"); },
  utilization(tasks, mondayStr, down) {
    const days = this.weekDays(mondayStr).map((d) => d.date);
    let load = 0, cap = 0;
    PROD_STATIONS.forEach((m) => days.forEach((date) => { load += this.dayLoad(tasks, m.id, date); cap += this.capacityOf(m.id, date, down); }));
    return { load, cap, pct: cap ? load / cap : 0 };
  },
  // ── Idő-naplózás (tény munkaidő) ──────────────────────────────────────────
  taskActualMinutes(task) {
    let m = (task.sessions || []).reduce((s, x) => s + (Number(x.minutes) || 0), 0);
    if (task.running && task.running.startMs) m += Math.max(0, (Date.now() - task.running.startMs) / 60000);
    return Math.round(m);
  },
  fmtDuration(min) { const m = Math.max(0, Math.round(min)); const h = Math.floor(m / 60); return h > 0 ? `${h} ó ${m % 60} p` : `${m} p`; },
  // tény vs. terv hatékonyság (becsült óra / tény óra); >1 = gyorsabb a tervnél
  taskEfficiency(task) { const act = this.taskActualMinutes(task) / 60; return act > 0 ? (Number(task.hours) || 0) / act : null; },
  // ── Termelékenység operátoronként ─────────────────────────────────────────
  operatorStats(tasks) {
    const map = {};
    (tasks || []).forEach((t) => {
      const who = t.assignee; if (!who) return;
      const o = map[who] = map[who] || { who, minutes: 0, done: 0, active: 0, planHours: 0, donePlanHours: 0, doneMinutes: 0 };
      const tm = this.taskActualMinutes(t);
      o.minutes += tm;
      if (t.status === "kesz") { o.done++; o.donePlanHours += Number(t.hours) || 0; o.doneMinutes += tm; }
      if (t.running) o.active++;
      o.planHours += Number(t.hours) || 0;
    });
    return Object.values(map).sort((a, b) => b.minutes - a.minutes);
  },
  // Hatékonyság CSAK befejezett feladatokra (terv-óra / tény-óra). null = még nincs kész, naplózott munka.
  operatorEfficiency(o) { return o && o.doneMinutes > 0 ? o.donePlanHours / (o.doneMinutes / 60) : null; },
};

Object.assign(window, {
  PROD_TODAY, PROD_WEEK_MONDAY, PROD_STATIONS, PROD_KINDS, PROD_KIND_ORDER, PROD_OPERATORS,
  PROD_FLOW, PROD_STATUS, PROD_DOW, PRODTASK_SEED, ProdSchedEngine,
});
