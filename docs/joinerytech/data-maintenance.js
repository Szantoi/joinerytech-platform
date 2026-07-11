// ──────────────────────────────────────────────────────────────────────────
// KARBANTARTÁS / ESZKÖZGAZDÁLKODÁS világ — data réteg
//
// A cég fizikai eszközei EGY kanonikus törzsből (sim.assets[]). A Shop Floor /
// Gyártás innen olvassa a gép üzemállapotát (üzemel / karbantartás alatt /
// leállítva / selejtezve) — a státusz a NYITOTT munkalapokból SZÁMÍTOTT.
//
//   • Eszköz-törzs — gép / jármű / szerszám / infrastruktúra / IT / helyiség
//   • Karbantartási munkalap (work order) — FSM-vezérelt
//   • Megelőző (preventív) tervek — időköz- VAGY üzemóra-alapú + takarítási rend
//   • Korrektív (hibajavítás) — eseti, géptörés
//
// Bekötések: HR (belső szerelő → kapacitás-terhelés egy `assignments` rekorddal),
// külső szerviz/takarító partner (B2B kézfogás), Raktár/Beszerzés (alkatrész-igény
// a munkalapról), Kontrolling (projekthez kötött munkalap → tény-tétel), Gyártás
// (a leállás csökkenti a gép-kapacitást — a Production dashboard ezt olvassa).
// ──────────────────────────────────────────────────────────────────────────

// ── Eszköz-kategóriák ───────────────────────────────────────────────────────
const ASSET_KINDS = {
  gep:      { key: "gep",      label: "Gyártógép",       short: "Gép",     icon: "factory",  accent: "#0891b2", pill: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  jarmu:    { key: "jarmu",    label: "Jármű",           short: "Jármű",   icon: "truck",    accent: "#0284c7", pill: "bg-sky-50 text-sky-700 border-sky-200" },
  szerszam: { key: "szerszam", label: "Szerszám / kisgép",short: "Szersz.",icon: "wrench",   accent: "#7c3aed", pill: "bg-violet-50 text-violet-700 border-violet-200" },
  infra:    { key: "infra",    label: "Infrastruktúra",  short: "Infra",   icon: "bolt",     accent: "#d97706", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  it:       { key: "it",       label: "IT / iroda",      short: "IT",      icon: "dashboard",accent: "#4f46e5", pill: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  helyiseg: { key: "helyiseg", label: "Helyiség (takarítás)", short: "Helyis.", icon: "box",  accent: "#0d9488", pill: "bg-teal-50 text-teal-700 border-teal-200" },
};
const ASSET_KIND_ORDER = ["gep", "jarmu", "szerszam", "infra", "it", "helyiseg"];

// ── Eszköz üzemállapot (SZÁMÍTOTT a nyitott munkalapokból) ──────────────────
const ASSET_STATUS = {
  uzemel:      { label: "Üzemel",            pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  karbantartas:{ label: "Karbantartás alatt",pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  leallitva:   { label: "Leállítva",         pill: "bg-rose-50 text-rose-700 border-rose-200",           dot: "bg-rose-500" },
  selejtezve:  { label: "Selejtezve",        pill: "bg-stone-100 text-stone-400 border-stone-200",       dot: "bg-stone-300" },
};

// ── Munkalap-típus ──────────────────────────────────────────────────────────
const WO_TYPE = {
  korrektiv: { key: "korrektiv", label: "Hibajavítás", short: "Korr.", icon: "alert",    accent: "#dc2626", pill: "bg-rose-50 text-rose-700 border-rose-200" },
  preventiv: { key: "preventiv", label: "Megelőző",    short: "Prev.", icon: "shield",   accent: "#0891b2", pill: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  takaritas: { key: "takaritas", label: "Takarítás",   short: "Takar.",icon: "sparkle",  accent: "#0d9488", pill: "bg-teal-50 text-teal-700 border-teal-200" },
};
const WO_TYPE_ORDER = ["korrektiv", "preventiv", "takaritas"];

// ── Munkalap FSM ────────────────────────────────────────────────────────────
// bejelentve → ütemezve → folyamatban → kész  (mellék: halasztva / elutasítva)
const WO_STATUS = {
  bejelentve:  { label: "Bejelentve",  pill: "bg-stone-100 text-stone-700 border-stone-200",   dot: "bg-stone-400" },
  utemezve:    { label: "Ütemezve",    pill: "bg-sky-50 text-sky-700 border-sky-200",          dot: "bg-sky-500" },
  folyamatban: { label: "Folyamatban", pill: "bg-amber-50 text-amber-700 border-amber-200",    dot: "bg-amber-500" },
  kesz:        { label: "Kész",        pill: "bg-emerald-50 text-emerald-700 border-emerald-200",dot: "bg-emerald-500" },
  halasztva:   { label: "Halasztva",   pill: "bg-violet-50 text-violet-700 border-violet-200",  dot: "bg-violet-500" },
  elutasitva:  { label: "Elutasítva",  pill: "bg-rose-50 text-rose-700 border-rose-200",        dot: "bg-rose-500" },
};
const WO_FLOW = {
  order: ["bejelentve", "utemezve", "folyamatban", "kesz"],
  states: {
    bejelentve:  { next: ["utemezve", "elutasitva"] },
    utemezve:    { next: ["folyamatban", "halasztva", "elutasitva"] },
    folyamatban: { next: ["kesz", "halasztva"] },
    halasztva:   { next: ["utemezve", "elutasitva"] },
    kesz:        { next: [], terminal: true },
    elutasitva:  { next: ["bejelentve"] },  // újranyitható
  },
};
// a "nyitott" (aktív) munkalapok — ezek alapján számít az eszköz-állapot és a downtime
const WO_OPEN = ["bejelentve", "utemezve", "folyamatban", "halasztva"];

// ── Prioritás (SLA-nap) ─────────────────────────────────────────────────────
const WO_PRIORITY = {
  alacsony: { label: "Alacsony", sla: 21, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" },
  kozepes:  { label: "Közepes",  sla: 10, pill: "bg-sky-50 text-sky-700 border-sky-200",        dot: "bg-sky-500" },
  magas:    { label: "Magas",    sla: 4,  pill: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-500" },
  surgos:   { label: "Sürgős",   sla: 1,  pill: "bg-rose-50 text-rose-700 border-rose-200",     dot: "bg-rose-500" },
};
const WO_PRIORITY_ORDER = ["surgos", "magas", "kozepes", "alacsony"];

// ── Megelőző terv trigger ───────────────────────────────────────────────────
const PLAN_TRIGGER = {
  interval: { key: "interval", label: "Időköz-alapú", unit: "nap" },
  hours:    { key: "hours",    label: "Üzemóra-alapú", unit: "üó" },
};

// ── Karbantartási költség — alapértékek ─────────────────────────────────────
const MAINT_DEFAULTS = {
  internalRate: 4200,   // Ft/óra belső szerelő (ha nincs HR óradíj)
  externalRate: 9500,   // Ft/óra külső szerviz (alapdíj)
};

// ──────────────────────────────────────────────────────────────────────────
// SEED — eszközök (a meglévő géppark + járművek a Logisztikából + infra + helyiség)
// today (store) = 2026-04-28
// ──────────────────────────────────────────────────────────────────────────
const ASSETS_SEED = [
  { id: "as-holzma1", code: "GEP-001", name: "Holzma HPP380", kind: "gep", facilityId: "fac-vac", location: "Szabászat", machineId: "M-HOLZMA-01",
    vendor: "Holzma", model: "HPP 380", serial: "HPP380-2019-114", purchasedAt: "2019-05-12", value: 38_000_000, operatingHours: 11240, retired: false, note: "Fő szabászgép." },
  { id: "as-biesse1", code: "GEP-002", name: "Biesse Selco WN6", kind: "gep", facilityId: "fac-vac", location: "Szabászat", machineId: "M-BIESSE-01",
    vendor: "Biesse", model: "Selco WN6", serial: "WN6-2020-088", purchasedAt: "2020-09-01", value: 31_000_000, operatingHours: 8930, retired: false, note: "" },
  { id: "as-homag1", code: "GEP-003", name: "Homag KAL 310", kind: "gep", facilityId: "fac-vac", location: "Élzárás", machineId: "M-HOMAG-01",
    vendor: "Homag", model: "KAL 310", serial: "KAL310-2018-201", purchasedAt: "2018-03-21", value: 22_000_000, operatingHours: 14870, retired: false, note: "Élzárógép — esedékes szervizhez közel." },
  { id: "as-rover", code: "GEP-004", name: "Biesse Rover B", kind: "gep", facilityId: "fac-vac", location: "CNC", machineId: "M-BIESSE-02",
    vendor: "Biesse", model: "Rover B FT", serial: "RVB-2021-045", purchasedAt: "2021-02-07", value: 45_000_000, operatingHours: 6120, retired: false, note: "CNC megmunkáló — most preventív szerviz alatt." },
  { id: "as-holzcnc", code: "GEP-005", name: "Holzma CNC Profile", kind: "gep", facilityId: "fac-szek", location: "CNC", machineId: "M-HOLZMA-02",
    vendor: "Holzma", model: "CNC Profile", serial: "HCP-2017-009", purchasedAt: "2017-11-30", value: 18_000_000, operatingHours: 19980, retired: false, note: "Géptörés — alkatrészre vár, leállítva." },
  { id: "as-spr", code: "JAR-001", name: "Mercedes Sprinter", kind: "jarmu", facilityId: "fac-vac", location: "Telephely", vehicleId: "veh-1",
    vendor: "Mercedes-Benz", model: "Sprinter 316", serial: "LMN-204", purchasedAt: "2022-06-10", value: 16_500_000, operatingHours: 0, odometer: 142300, retired: false, note: "Kiszállító furgon (Logisztika veh-1)." },
  { id: "as-comp", code: "INF-001", name: "Kompresszor — Atlas Copco", kind: "infra", facilityId: "fac-vac", location: "Gépház",
    vendor: "Atlas Copco", model: "GA 15", serial: "GA15-2019-330", purchasedAt: "2019-08-04", value: 4_200_000, operatingHours: 9450, retired: false, note: "Sűrített levegő ellátás — pneumatika." },
  { id: "as-festo", code: "INF-002", name: "Festőkabin elszívó", kind: "infra", facilityId: "fac-vac", location: "Felületkezelő",
    vendor: "Spanesi", model: "AirEvo", serial: "AE-2020-77", purchasedAt: "2020-04-15", value: 6_800_000, operatingHours: 5210, retired: false, note: "Szűrőcsere ciklikus." },
  { id: "as-szerszam", code: "SZ-001", name: "Festool BS-1 szalagcsiszoló", kind: "szerszam", facilityId: "fac-vac", location: "Szerelő 2",
    vendor: "Festool", model: "BS 105", serial: "BS105-22-441", purchasedAt: "2023-01-20", value: 180_000, operatingHours: 0, retired: false, note: "" },
  { id: "as-muhely", code: "HEL-001", name: "Műhelycsarnok", kind: "helyiseg", facilityId: "fac-vac", location: "Vác — főüzem",
    vendor: "", model: "", serial: "", purchasedAt: "", value: 0, operatingHours: 0, retired: false, note: "Napi takarítás belső, heti nagytakarítás külsős." },
  { id: "as-iroda", code: "HEL-002", name: "Iroda + szociális helyiség", kind: "helyiseg", facilityId: "fac-vac", location: "Vác — iroda",
    vendor: "", model: "", serial: "", purchasedAt: "", value: 0, operatingHours: 0, retired: false, note: "Heti nagytakarítás külsős céggel (Tiszta-Pro Kft.)." },
];

// ── SEED — megelőző tervek (időköz / üzemóra / takarítás) ───────────────────
const MAINT_PLANS_SEED = [
  // időköz-alapú gép-szerviz
  { id: "mp-1", assetId: "as-holzma1", label: "Negyedéves gépszerviz", kind: "preventiv", trigger: "interval", intervalDays: 90, lastDone: "2026-03-14", assigneeType: "internal", assigneeEmpId: "emp-kissa", estHours: 4, active: true },
  // üzemóra-alapú élzáró karbantartás → esedékes (14870 üó, ciklus 500, utolsó 14500)
  { id: "mp-2", assetId: "as-homag1", label: "Élzáró 500 üó karbantartás", kind: "preventiv", trigger: "hours", intervalHours: 500, lastDone: "2026-02-10", lastDoneHours: 14500, assigneeType: "internal", assigneeEmpId: "emp-kissa", estHours: 3, active: true },
  // jármű időszakos
  { id: "mp-3", assetId: "as-spr", label: "Jármű időszakos szerviz", kind: "preventiv", trigger: "interval", intervalDays: 180, lastDone: "2026-01-15", assigneeType: "external", partnerName: "Mercedes Szerviz Vác", estHours: 5, active: true },
  // kompresszor szűrő/olaj
  { id: "mp-4", assetId: "as-comp", label: "Kompresszor olaj + szűrő", kind: "preventiv", trigger: "interval", intervalDays: 120, lastDone: "2026-01-08", assigneeType: "internal", assigneeEmpId: "emp-vargal", estHours: 2, active: true },
  // festőkabin szűrőcsere — üzemóra
  { id: "mp-5", assetId: "as-festo", label: "Elszívó szűrőcsere", kind: "preventiv", trigger: "hours", intervalHours: 800, lastDone: "2026-03-01", lastDoneHours: 4800, assigneeType: "internal", assigneeEmpId: "emp-vargal", estHours: 1.5, active: true },
  // TAKARÍTÁSI REND — műhely napi (belső), heti nagytakarítás (külsős)
  { id: "mp-6", assetId: "as-muhely", label: "Műhely napi takarítás", kind: "takaritas", trigger: "interval", intervalDays: 1, lastDone: "2026-04-27", assigneeType: "internal", assigneeEmpId: "emp-balogm", estHours: 1, active: true },
  { id: "mp-7", assetId: "as-muhely", label: "Heti nagytakarítás", kind: "takaritas", trigger: "interval", intervalDays: 7, lastDone: "2026-04-21", assigneeType: "external", partnerName: "Tiszta-Pro Kft.", estHours: 4, active: true },
  { id: "mp-8", assetId: "as-iroda", label: "Iroda heti nagytakarítás", kind: "takaritas", trigger: "interval", intervalDays: 7, lastDone: "2026-04-22", assigneeType: "external", partnerName: "Tiszta-Pro Kft.", estHours: 3, active: true },
];

// ── SEED — munkalapok ───────────────────────────────────────────────────────
const WORKORDERS_SEED = [
  // 1) Géptörés — leállítva, alkatrészre vár (korrektív, sürgős, breakdown)
  { id: "WO-2426-018", assetId: "as-holzcnc", kind: "korrektiv", title: "Főorsó csapágy zaj + leállás", desc: "A CNC orsó berágott, csapágycsere kell. Alkatrész rendelve.",
    status: "utemezve", priority: "surgos", breakdown: true, stops: true, reportedAt: "2026-04-26", scheduledDate: "2026-04-30",
    assigneeType: "external", partnerName: "Holzma Szerviz HU", estHours: 6,
    parts: [{ label: "Orsócsapágy készlet", qty: 1 }], downtimeHours: 0, cost: 0,
    log: [{ at: "2026-04-26 13:20", text: "Bejelentve — operátor (Horváth Éva)" }, { at: "2026-04-26 15:00", text: "Ütemezve — Holzma Szerviz, alkatrész rendelve" }] },
  // 2) CNC preventív szerviz — FOLYAMATBAN (ez teszi a Rover-t „karbantartás alatt"-ra)
  { id: "WO-2426-017", assetId: "as-rover", kind: "preventiv", title: "Negyedéves CNC nagyszerviz", desc: "Vezetékek, kenés, kalibráció, vákuumtömítések.",
    status: "folyamatban", priority: "magas", breakdown: false, stops: true, reportedAt: "2026-04-25", scheduledDate: "2026-04-28",
    assigneeType: "internal", assigneeEmpId: "emp-kissa", estHours: 5,
    parts: [{ label: "Kenőzsír + tömítés", qty: 1 }], downtimeHours: 5, cost: 0,
    log: [{ at: "2026-04-25 09:00", text: "Bejelentve — terv szerint" }, { at: "2026-04-28 08:00", text: "Megkezdve — Kiss András" }] },
  // 3) Élzáró üzemóra-karbantartás — bejelentve (esedékes plan-ből)
  { id: "WO-2426-016", assetId: "as-homag1", kind: "preventiv", title: "Élzáró 500 üó karbantartás", desc: "Görgők, ragasztótartály tisztítás, kés-ellenőrzés.",
    status: "bejelentve", priority: "kozepes", breakdown: false, stops: false, reportedAt: "2026-04-28", planId: "mp-2",
    assigneeType: "internal", assigneeEmpId: "emp-kissa", estHours: 3, parts: [], downtimeHours: 0, cost: 0,
    log: [{ at: "2026-04-28 07:30", text: "Automatikus munkalap — esedékes (14870 / 500 üó)" }] },
  // 4) Festőkabin szűrőcsere — kész (lezárt, költséggel)
  { id: "WO-2426-015", assetId: "as-festo", kind: "preventiv", title: "Elszívó szűrőcsere", desc: "Előszűrő + aktívszén csere.",
    status: "kesz", priority: "kozepes", breakdown: false, stops: true, reportedAt: "2026-04-18", scheduledDate: "2026-04-20", completedAt: "2026-04-20",
    assigneeType: "internal", assigneeEmpId: "emp-vargal", estHours: 1.5, parts: [{ label: "Szűrőkészlet", qty: 1 }], downtimeHours: 2, cost: 34000,
    log: [{ at: "2026-04-18 10:00", text: "Bejelentve" }, { at: "2026-04-20 14:00", text: "Kész — szűrő cserélve" }] },
  // 5) Heti nagytakarítás — ütemezve (külsős, B2B)
  { id: "WO-2426-014", assetId: "as-iroda", kind: "takaritas", title: "Iroda heti nagytakarítás", desc: "Padló, vizesblokk, ablakok.",
    status: "utemezve", priority: "alacsony", breakdown: false, stops: false, reportedAt: "2026-04-27", scheduledDate: "2026-04-29", planId: "mp-8",
    assigneeType: "external", partnerName: "Tiszta-Pro Kft.", estHours: 3, parts: [], downtimeHours: 0, cost: 0,
    log: [{ at: "2026-04-27 16:00", text: "Ütemezve — Tiszta-Pro Kft." }] },
  // 6) Szalagcsiszoló talp csere — halasztva
  { id: "WO-2426-013", assetId: "as-szerszam", kind: "korrektiv", title: "Csúszótalp kopott", desc: "A csiszolótalp cseréje szükséges.",
    status: "halasztva", priority: "alacsony", breakdown: false, stops: false, reportedAt: "2026-04-20",
    assigneeType: "internal", assigneeEmpId: "emp-balogm", estHours: 0.5, parts: [{ label: "Csúszótalp", qty: 1 }], downtimeHours: 0, cost: 0,
    log: [{ at: "2026-04-20 11:00", text: "Bejelentve" }, { at: "2026-04-22 09:00", text: "Halasztva — alkatrész nincs készleten" }] },
];

// ── SEED — állásidő-napló ───────────────────────────────────────────────────
const DOWNTIME_SEED = [
  { id: "dt-1", assetId: "as-holzcnc", start: "2026-04-26", end: null, hours: 36, reason: "Orsó csapágy géptörés — alkatrészre vár", workOrderId: "WO-2426-018", planned: false },
  { id: "dt-2", assetId: "as-rover", start: "2026-04-28", end: null, hours: 5, reason: "Negyedéves CNC nagyszerviz (tervezett)", workOrderId: "WO-2426-017", planned: true },
  { id: "dt-3", assetId: "as-festo", start: "2026-04-20", end: "2026-04-20", hours: 2, reason: "Szűrőcsere", workOrderId: "WO-2426-015", planned: true },
  { id: "dt-4", assetId: "as-homag1", start: "2026-04-12", end: "2026-04-12", hours: 3, reason: "Ragasztótartály dugulás", workOrderId: null, planned: false },
];

// ──────────────────────────────────────────────────────────────────────────
// MaintEngine — tiszta számítások (eszköz-állapot, esedékesség, FSM, költség)
// ──────────────────────────────────────────────────────────────────────────
const MAINT_DAY_MS = 86400000;
const MaintEngine = {
  parse(d) { const [y, m, day] = String(d).split("-").map(Number); return new Date(y, (m || 1) - 1, day || 1); },
  fmt(dt) { return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; },
  daysBetween(a, b) { return Math.round((this.parse(b) - this.parse(a)) / MAINT_DAY_MS); },

  // eszköz nyitott munkalapjai
  openWOs(state, assetId) { return (state.workOrders || []).filter((w) => w.assetId === assetId && WO_OPEN.includes(w.status)); },

  // SZÁMÍTOTT eszköz-állapot a munkalapokból
  assetStatus(state, asset) {
    if (!asset) return "uzemel";
    if (asset.retired) return "selejtezve";
    const open = this.openWOs(state, asset.id);
    // folyamatban + leállást igénylő → karbantartás alatt
    if (open.some((w) => w.status === "folyamatban" && w.stops)) return "karbantartas";
    // nyitott géptörés (breakdown) még nem folyamatban → leállítva (alkatrészre/szervizre vár)
    if (open.some((w) => w.breakdown)) return "leallitva";
    return "uzemel";
  },

  // megelőző terv esedékessége
  planDue(plan, asset, today) {
    if (!plan || !plan.active) return { due: false };
    if (plan.trigger === "interval") {
      const next = this.fmt(new Date(this.parse(plan.lastDone || today).getTime() + (plan.intervalDays || 30) * MAINT_DAY_MS));
      const daysLeft = this.daysBetween(today, next);
      return { due: daysLeft <= 0, overdue: daysLeft < 0, dueDate: next, daysLeft, unit: "nap" };
    }
    // üzemóra-alapú
    const cur = (asset && asset.operatingHours) || 0;
    const base = plan.lastDoneHours || 0;
    const since = cur - base;
    const left = (plan.intervalHours || 500) - since;
    return { due: left <= 0, overdue: left < -50, hoursLeft: left, since, unit: "üó" };
  },

  // minden esedékes (vagy közelgő) terv
  duePlans(state, today, withinDays = 7) {
    const out = [];
    (state.maintPlans || []).filter((p) => p.active).forEach((p) => {
      const asset = (state.assets || []).find((a) => a.id === p.assetId);
      if (!asset || asset.retired) return;
      // ne ajánljunk újat, ha már van nyitott munkalap erre a tervre
      const hasOpen = (state.workOrders || []).some((w) => w.planId === p.id && WO_OPEN.includes(w.status));
      if (hasOpen) return;
      const d = this.planDue(p, asset, today);
      const near = d.due || (d.unit === "nap" && d.daysLeft != null && d.daysLeft <= withinDays) || (d.unit === "üó" && d.hoursLeft != null && d.hoursLeft <= 100);
      if (near) out.push({ plan: p, asset, due: d });
    });
    // esedékes előre, aztán közelgő
    return out.sort((a, b) => (b.due.due - a.due.due) || ((a.due.daysLeft ?? a.due.hoursLeft ?? 0) - (b.due.daysLeft ?? b.due.hoursLeft ?? 0)));
  },

  // ── Munkalap FSM ──────────────────────────────────────────────────────────
  woCanGo(wo, to) { return ((WO_FLOW.states[wo.status] || {}).next || []).includes(to); },
  woNext(wo) { return ((WO_FLOW.states[wo.status] || {}).next || []).slice(); },
  woIsTerminal(wo) { return !!((WO_FLOW.states[wo.status] || {}).terminal); },

  // SLA a prioritásból
  woDueDate(wo) {
    const sla = (WO_PRIORITY[wo.priority] || {}).sla || 14;
    return this.fmt(new Date(this.parse(wo.reportedAt).getTime() + sla * MAINT_DAY_MS));
  },
  woSla(wo, today) {
    if (["kesz", "elutasitva"].includes(wo.status)) return { done: true };
    const due = this.woDueDate(wo);
    const daysLeft = this.daysBetween(today, due);
    return { due, daysLeft, overdue: daysLeft < 0 };
  },

  // munkalap-költség becslés (munka + alkatrész becslés nélkül, csak munkadíj-alap)
  woLaborCost(wo, rate) { return Math.round((Number(wo.estHours) || 0) * (rate || 0)); },
};

Object.assign(window, {
  ASSET_KINDS, ASSET_KIND_ORDER, ASSET_STATUS, WO_TYPE, WO_TYPE_ORDER,
  WO_STATUS, WO_FLOW, WO_OPEN, WO_PRIORITY, WO_PRIORITY_ORDER,
  PLAN_TRIGGER, MAINT_DEFAULTS,
  ASSETS_SEED, MAINT_PLANS_SEED, WORKORDERS_SEED, DOWNTIME_SEED,
  MaintEngine,
});
