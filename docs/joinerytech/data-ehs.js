// ──────────────────────────────────────────────────────────────────────────
// MUNKAVÉDELEM / EHS világ — üzemi munkavédelem (Environment, Health & Safety)
//
// FELELŐSSÉG: az ÜZEMI munkavédelem — baleset/kvázibaleset kivizsgálás (CAPA),
// kockázatértékelés (valószínűség×súlyosság mátrix) és munkavédelmi oktatás/
// kompetencia lejárat-figyeléssel. A magyar Mvt. (1993. évi XCIII. tv.)
// kötelezettségeire húzva, ISO 45001 PDCA-szemlélettel.
//
// HORGONY-elv (egy igazságforrás, nincs duplikáció):
//   • Ember-törzs = HR (sim.employees) — az oktatás csak empId-vel hivatkozik.
//   • Gép-törzs = Karbantartás (sim.assets) — a kockázat assetId/assetLabel-lel.
//   • Intézkedés (CAPA) → Feladataim (unifiedTasks) — nem új inbox.
//   • A Reklamáció (service) az átadás UTÁNI hurok — nem keverednek.
//
// A státusz az ENTITÁSON él (incidens-FSM). A kockázat-pont és az oktatás-
// érettség SZÁMÍTOTT (EhsEngine) — soha ne tárold.
// ──────────────────────────────────────────────────────────────────────────

const EHS_TODAY = "2026-04-28";

// ── Baleset/esemény típus ───────────────────────────────────────────────────
const EHS_INC_TYPE = {
  baleset:    { key: "baleset",    label: "Munkabaleset",     short: "Baleset",   icon: "alert",  accent: "#e11d48", pill: "bg-rose-50 text-rose-700 border-rose-200",       desc: "Sérüléssel járó üzemi munkabaleset — kivizsgálás + jegyzőkönyv kötelező." },
  kvazi:      { key: "kvazi",      label: "Kvázibaleset",     short: "Kvázi",     icon: "shield", accent: "#d97706", pill: "bg-amber-50 text-amber-700 border-amber-200",     desc: "Majdnem-baleset (near-miss) — sérülés nem történt, de a kockázat valós." },
  kornyezeti: { key: "kornyezeti", label: "Környezeti esemény", short: "Környezet", icon: "drop",  accent: "#059669", pill: "bg-emerald-50 text-emerald-700 border-emerald-200", desc: "Szennyezés / vegyszer-kiömlés / hulladék-esemény." },
};
const EHS_INC_TYPE_ORDER = ["baleset", "kvazi", "kornyezeti"];

// ── Súlyosság ───────────────────────────────────────────────────────────────
const EHS_INC_SEV = {
  konnyu:     { key: "konnyu",     label: "Könnyű (elsősegély)",   short: "Könnyű",     pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400",   rank: 0 },
  munkakieso: { key: "munkakieso", label: "Munkaidő-kieséssel",    short: "Munkakieső", pill: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-500",   rank: 1 },
  sulyos:     { key: "sulyos",     label: "Súlyos",                short: "Súlyos",     pill: "bg-rose-50 text-rose-700 border-rose-200",     dot: "bg-rose-500",    rank: 2 },
};
const EHS_INC_SEV_ORDER = ["sulyos", "munkakieso", "konnyu"];

// ── Incidens-FSM ────────────────────────────────────────────────────────────
// bejelentve → kivizsgalas → intezkedes → lezarva   (mellék: elutasitva)
const EHS_INC_FLOW = {
  order: ["bejelentve", "kivizsgalas", "intezkedes", "lezarva"],
  states: {
    bejelentve:  { next: ["kivizsgalas", "elutasitva"] },
    kivizsgalas: { next: ["intezkedes", "elutasitva"] },
    intezkedes:  { next: ["lezarva", "kivizsgalas"] },
    lezarva:     { next: [], terminal: true },
    elutasitva:  { next: ["bejelentve"], terminal: false },
  },
};
const EHS_INC_STATUS = {
  bejelentve:  { label: "Bejelentve",   pill: "bg-stone-100 text-stone-700 border-stone-200",      dot: "bg-stone-400" },
  kivizsgalas: { label: "Kivizsgálás",  pill: "bg-sky-50 text-sky-700 border-sky-200",             dot: "bg-sky-500" },
  intezkedes:  { label: "Intézkedés",   pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  lezarva:     { label: "Lezárva",      pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  elutasitva:  { label: "Elutasítva",   pill: "bg-rose-50 text-rose-700 border-rose-200",          dot: "bg-rose-500" },
};

// ── Kockázati sávok (5×5 mátrix, pont = valószínűség × súlyosság) ───────────
const EHS_RISK_BAND = {
  alacsony: { key: "alacsony", label: "Alacsony", min: 1,  max: 4,  pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", cell: "#10b981" },
  kozepes:  { key: "kozepes",  label: "Közepes",  min: 5,  max: 9,  pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500",   cell: "#f59e0b" },
  magas:    { key: "magas",    label: "Magas",    min: 10, max: 14, pill: "bg-orange-50 text-orange-700 border-orange-200",    dot: "bg-orange-500",  cell: "#f97316" },
  kiemelt:  { key: "kiemelt",  label: "Kiemelt",  min: 15, max: 25, pill: "bg-rose-50 text-rose-700 border-rose-200",          dot: "bg-rose-500",    cell: "#e11d48" },
};
const EHS_RISK_BAND_ORDER = ["kiemelt", "magas", "kozepes", "alacsony"];
// 1–5 skála címkék (a mátrix tengelyeihez)
const EHS_SCALE = { 1: "Ritka", 2: "Kis eséllyel", 3: "Esetenként", 4: "Gyakori", 5: "Állandó" };
const EHS_SEV_SCALE = { 1: "Jelentéktelen", 2: "Csekély", 3: "Mérsékelt", 4: "Súlyos", 5: "Katasztrofális" };

// ── Oktatás-fajták (alap-érvényesség hónapban) ──────────────────────────────
const EHS_TRAIN_KIND = {
  munkavedelmi:   { key: "munkavedelmi",   label: "Munkavédelmi oktatás",     short: "Munkavédelmi", icon: "shield",  accent: "#e11d48", validMonths: 12 },
  gepkezeloi:     { key: "gepkezeloi",     label: "Gépkezelői jogosultság",   short: "Gépkezelő",    icon: "factory", accent: "#0d9488", validMonths: 24 },
  tuzvedelmi:     { key: "tuzvedelmi",     label: "Tűzvédelmi oktatás",       short: "Tűzvédelmi",   icon: "bolt",    accent: "#d97706", validMonths: 12 },
  elsosegely:     { key: "elsosegely",     label: "Elsősegély-nyújtó",        short: "Elsősegély",   icon: "plus",    accent: "#059669", validMonths: 36 },
  veszelyesanyag: { key: "veszelyesanyag", label: "Veszélyes anyag kezelés",  short: "Vegyszer",     icon: "drop",    accent: "#7c3aed", validMonths: 12 },
};
const EHS_TRAIN_KIND_ORDER = ["munkavedelmi", "gepkezeloi", "tuzvedelmi", "elsosegely", "veszelyesanyag"];
// Oktatás-érettség küszöb (hamarosan lejár, nap)
const EHS_TRAIN_SOON_DAYS = 30;

// ──────────────────────────────────────────────────────────────────────────
// Seed — incidensek (faipari profil)
// ──────────────────────────────────────────────────────────────────────────
const EHS_INCIDENTS_SEED = [
  // 1) Kvázibaleset — kivizsgálás (Holzma szabászgép, kéz közelében)
  { id: "EHS-2426-001", type: "kvazi", sev: "munkakieso", status: "kivizsgalas",
    subject: "Holzma HPP380 — kéz a vágózóna közelében", location: "Vác — főüzem, szabászat",
    assetId: "as-holzma1", assetLabel: "Holzma HPP380", reporter: "Nagy János", investigator: "Tóth Kinga",
    occurredAt: "2026-04-27", reportedAt: "2026-04-27", dueDate: "2026-05-04",
    note: "Az operátor a fénysorompó kiiktatásával nyúlt a tábláért — a gép nem indult, de a védelem megkerülése súlyos kockázat.",
    actions: [
      { id: "a1", text: "Fénysorompó-felülbírálat letiltása, kulcsos jogosultsághoz kötése", owner: "Tóth Kinga", due: "2026-05-02", done: false },
      { id: "a2", text: "Ismétlő gépkezelői oktatás a szabászat dolgozóinak", owner: "Kiss András", due: "2026-05-04", done: false },
    ],
    log: [{ at: "2026-04-27 10:20", text: "Kvázibaleset bejelentve (Nagy János)" }, { at: "2026-04-27 13:00", text: "Kivizsgálás megkezdve" }] },

  // 2) Munkabaleset — intézkedés (élzáró, ujjsérülés)
  { id: "EHS-2426-002", type: "baleset", sev: "munkakieso", status: "intezkedes",
    subject: "Homag élzáró — könnyű ujjsérülés tisztításnál", location: "Vác — főüzem, élzárás",
    assetId: "as-homag1", assetLabel: "Homag KAL 310", reporter: "Kiss András", investigator: "Tóth Kinga",
    occurredAt: "2026-04-24", reportedAt: "2026-04-24", dueDate: "2026-04-30",
    note: "Forró ragasztó-maradék eltávolításakor a dolgozó megégette az ujját. Üzemorvosi ellátás, 1 nap kieséssel.",
    actions: [
      { id: "a1", text: "Hőálló kesztyű kötelező a tisztítási műveletnél (EVE-bővítés)", owner: "Tóth Kinga", due: "2026-04-29", done: true },
      { id: "a2", text: "Tisztítási utasítás kihelyezése a gép mellé", owner: "Kiss András", due: "2026-04-26", done: false },
    ],
    log: [{ at: "2026-04-24 09:10", text: "Munkabaleset bejelentve" }, { at: "2026-04-24 11:00", text: "Kivizsgálás" }, { at: "2026-04-25 08:00", text: "Intézkedési terv összeállítva" }] },

  // 3) Környezeti — bejelentve (lakk-kiömlés)
  { id: "EHS-2426-003", type: "kornyezeti", sev: "konnyu", status: "bejelentve",
    subject: "Felületkezelő — lakk-kiömlés a keverőben", location: "Vác — főüzem, felületkezelő",
    reporter: "Horváth Gábor", investigator: "",
    occurredAt: "2026-04-28", reportedAt: "2026-04-28", dueDate: "2026-05-05",
    note: "Kb. 2 liter oldószeres lakk a padlóra került. Felitatva, veszélyes hulladékként gyűjtve. Szellőzés bekapcsolva.",
    actions: [],
    log: [{ at: "2026-04-28 07:40", text: "Környezeti esemény bejelentve (Horváth Gábor)" }] },

  // 4) Kvázibaleset — lezárva (porelszívás eltömődés)
  { id: "EHS-2426-004", type: "kvazi", sev: "konnyu", status: "lezarva",
    subject: "Porelszívás eltömődés — ATEX kockázat", location: "Vác — főüzem, elszívó-rendszer",
    reporter: "Nagy János", investigator: "Tóth Kinga",
    occurredAt: "2026-04-18", reportedAt: "2026-04-18", dueDate: "2026-04-25", closedAt: "2026-04-23",
    note: "A keményfa-por feltorlódott a ciklon előtt — porrobbanás-kockázat. A szűrő tisztítva, a karbantartási terv gyakorisága emelve.",
    actions: [
      { id: "a1", text: "Elszívó-szűrő tisztítási ciklus 2 hétre csökkentve (Karbantartás)", owner: "Tóth Kinga", due: "2026-04-22", done: true },
    ],
    log: [{ at: "2026-04-18 14:00", text: "Bejelentve" }, { at: "2026-04-20 09:00", text: "Kivizsgálva — torlódás oka azonosítva" }, { at: "2026-04-23 16:00", text: "Lezárva — intézkedés végrehajtva" }] },
];

// ──────────────────────────────────────────────────────────────────────────
// Seed — kockázatértékelések
// ──────────────────────────────────────────────────────────────────────────
const EHS_RISKS_SEED = [
  { id: "EHS-R-001", title: "Körfűrész / szabászgép — vágási sérülés", scope: "Szabászat (gép)", icon: "factory",
    assetId: "as-holzma1", assetLabel: "Holzma HPP380", hazard: "Mozgó vágószerszám, visszacsapódó tábla.",
    likelihood: 3, severity: 5, owner: "Tóth Kinga", reviewDue: "2026-09-01", assessedAt: "2025-09-01",
    controls: ["Fénysorompó + kétkezes indítás", "Védőburkolat", "Gépkezelői jogosultság kötelező"], resL: 2, resS: 4 },

  { id: "EHS-R-002", title: "Fapor — belélegzés + ATEX porrobbanás", scope: "Elszívó-rendszer (üzem)", icon: "wind",
    assetLabel: "Központi elszívó", hazard: "Keményfa-por rákkeltő; feltorlódott por robbanásveszélyes.",
    likelihood: 3, severity: 5, owner: "Tóth Kinga", reviewDue: "2026-04-10", assessedAt: "2025-04-10",
    controls: ["Központi elszívás minden gépnél", "FFP3 porálarc", "Heti szűrő-ellenőrzés (Karbantartás)"], resL: 2, resS: 4 },

  { id: "EHS-R-003", title: "Zajterhelés — tartós halláskárosodás", scope: "Gépterem (munkahely)", icon: "bolt",
    hazard: "A gépterem zajszintje tartósan 85 dB felett.", likelihood: 4, severity: 3,
    owner: "Kiss András", reviewDue: "2026-11-01", assessedAt: "2025-11-01",
    controls: ["Hallásvédő kötelező a géptermben", "Éves zajexpozíció-mérés"], resL: 2, resS: 3 },

  { id: "EHS-R-004", title: "Oldószer / VOC — felületkezelés", scope: "Felületkezelő (munkahely)", icon: "drop",
    hazard: "Lakk-oldószer gőze gyúlékony és egészségkárosító.", likelihood: 3, severity: 4,
    owner: "Horváth Gábor", reviewDue: "2026-06-15", assessedAt: "2025-06-15",
    controls: ["Elszívó fülke", "Légzésvédő + nitril kesztyű", "Tűzveszélyes anyag külön tárolóban"], resL: 2, resS: 3 },

  { id: "EHS-R-005", title: "Kézi anyagmozgatás — gerinc-terhelés", scope: "Raktár + szerelés (munkahely)", icon: "box",
    hazard: "Nehéz táblák és kész bútor kézi emelése.", likelihood: 4, severity: 2,
    owner: "Kiss András", reviewDue: "2027-01-10", assessedAt: "2026-01-10",
    controls: ["Emelő-segédeszközök", "Két fős emelés 25 kg felett", "Ergonómiai oktatás"], resL: 2, resS: 2 },
];

// ──────────────────────────────────────────────────────────────────────────
// Seed — oktatás-rekordok (dolgozónként; empId a HR-törzsre mutat)
// ──────────────────────────────────────────────────────────────────────────
const EHS_TRAININGS_SEED = [
  { id: "EHS-T-001", empId: "emp-nagyj",  kind: "munkavedelmi",   completedAt: "2025-09-15", validMonths: 12 },
  { id: "EHS-T-002", empId: "emp-nagyj",  kind: "elsosegely",     completedAt: "2024-06-01", validMonths: 36 },
  { id: "EHS-T-003", empId: "emp-kissa",  kind: "munkavedelmi",   completedAt: "2025-04-02", validMonths: 12 }, // lejárt
  { id: "EHS-T-004", empId: "emp-kissa",  kind: "gepkezeloi",     completedAt: "2025-03-10", validMonths: 24 },
  { id: "EHS-T-005", empId: "emp-tothk",  kind: "munkavedelmi",   completedAt: "2026-04-10", validMonths: 12 },
  { id: "EHS-T-006", empId: "emp-tothk",  kind: "gepkezeloi",     completedAt: "2024-09-01", validMonths: 24 },
  { id: "EHS-T-007", empId: "emp-horvg",  kind: "munkavedelmi",   completedAt: "2025-12-01", validMonths: 12 },
  { id: "EHS-T-008", empId: "emp-horvg",  kind: "tuzvedelmi",     completedAt: "2025-11-20", validMonths: 12 },
  { id: "EHS-T-009", empId: "emp-vargal", kind: "munkavedelmi",   completedAt: "2025-12-01", validMonths: 12 },
  { id: "EHS-T-010", empId: "emp-vargal", kind: "veszelyesanyag", completedAt: "2025-05-25", validMonths: 12 }, // hamarosan lejár
  { id: "EHS-T-011", empId: "emp-balogm", kind: "munkavedelmi",   completedAt: "2026-02-14", validMonths: 12 },
  { id: "EHS-T-012", empId: "emp-horve",  kind: "munkavedelmi",   completedAt: "2026-03-01", validMonths: 12 },
];

// ──────────────────────────────────────────────────────────────────────────
// EhsEngine — tiszta számítások (FSM, kockázat-pont, oktatás-érettség, ráta)
// ──────────────────────────────────────────────────────────────────────────
const _ehsParse = (s) => { const [y, m, d] = String(s || "").split("-").map(Number); return y ? new Date(y, (m || 1) - 1, d || 1) : null; };
const _ehsDiff = (a, b) => { const pa = _ehsParse(a), pb = _ehsParse(b); if (!pa || !pb) return null; return Math.round((pa - pb) / 86400000); };
const _ehsAddMonths = (s, n) => { const p = _ehsParse(s); if (!p) return s; p.setMonth(p.getMonth() + (n || 0)); return p.toISOString().slice(0, 10); };

const EhsEngine = {
  // ── Incidens-FSM ──
  canGo(inc, to) { const st = EHS_INC_FLOW.states[inc.status]; return !!(st && st.next.includes(to)); },
  nextStates(inc) { const st = EHS_INC_FLOW.states[inc.status]; return st ? st.next.slice() : []; },
  isOpen(inc) { return !["lezarva", "elutasitva"].includes(inc.status); },
  // CAPA haladás
  actionProgress(inc) {
    const a = inc.actions || [];
    const done = a.filter((x) => x.done).length;
    return { total: a.length, done, open: a.length - done, pct: a.length ? Math.round((done / a.length) * 100) : 0 };
  },
  openActions(inc) { return (inc.actions || []).filter((a) => !a.done); },
  // SLA: a határidőig hátralévő napok (nyitott incidensnél)
  sla(inc, today = EHS_TODAY) {
    if (!inc.dueDate || !this.isOpen(inc)) return { active: false, daysLeft: null, overdue: false };
    const daysLeft = _ehsDiff(inc.dueDate, today);
    return { active: true, daysLeft, overdue: daysLeft != null && daysLeft < 0 };
  },

  // ── Kockázat ──
  score(r) { return (Number(r.likelihood) || 0) * (Number(r.severity) || 0); },
  residualScore(r) { return (Number(r.resL || r.likelihood) || 0) * (Number(r.resS || r.severity) || 0); },
  band(scoreVal) {
    for (const k of EHS_RISK_BAND_ORDER) { const b = EHS_RISK_BAND[k]; if (scoreVal >= b.min && scoreVal <= b.max) return b; }
    return EHS_RISK_BAND.alacsony;
  },
  riskBand(r) { return this.band(this.score(r)); },
  isReviewDue(r, today = EHS_TODAY) { const d = _ehsDiff(r.reviewDue, today); return d != null && d < 0; },
  reviewDays(r, today = EHS_TODAY) { return _ehsDiff(r.reviewDue, today); },

  // ── Oktatás ──
  trainExpiry(t) { return t.expiresAt || _ehsAddMonths(t.completedAt, t.validMonths || (EHS_TRAIN_KIND[t.kind] || {}).validMonths || 12); },
  trainStatus(t, today = EHS_TODAY) {
    const exp = this.trainExpiry(t);
    const d = _ehsDiff(exp, today);
    if (d == null) return { key: "ok", label: "Érvényes", daysLeft: null, expiresAt: exp, pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
    if (d < 0) return { key: "lejart", label: "Lejárt", daysLeft: d, expiresAt: exp, pill: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" };
    if (d <= EHS_TRAIN_SOON_DAYS) return { key: "soon", label: "Hamarosan lejár", daysLeft: d, expiresAt: exp, pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
    return { key: "ok", label: "Érvényes", daysLeft: d, expiresAt: exp, pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
  },

  // ── Aggregált KPI-k ──
  expiredTrainings(list, today = EHS_TODAY) { return (list || []).filter((t) => this.trainStatus(t, today).key === "lejart"); },
  expiringTrainings(list, today = EHS_TODAY) { return (list || []).filter((t) => this.trainStatus(t, today).key === "soon"); },
  openCapa(incs) { let n = 0; (incs || []).forEach((i) => { n += this.openActions(i).length; }); return n; },
  // LTIFR-szerű mutató: munkabalesetek száma a nyilvántartásban (demó-ráta)
  recordableRate(incs) {
    const rec = (incs || []).filter((i) => i.type === "baleset");
    return { count: rec.length, lost: rec.filter((i) => i.sev !== "konnyu").length };
  },
};

Object.assign(window, {
  EHS_TODAY, EHS_INC_TYPE, EHS_INC_TYPE_ORDER, EHS_INC_SEV, EHS_INC_SEV_ORDER,
  EHS_INC_FLOW, EHS_INC_STATUS, EHS_RISK_BAND, EHS_RISK_BAND_ORDER, EHS_SCALE, EHS_SEV_SCALE,
  EHS_TRAIN_KIND, EHS_TRAIN_KIND_ORDER, EHS_TRAIN_SOON_DAYS,
  EHS_INCIDENTS_SEED, EHS_RISKS_SEED, EHS_TRAININGS_SEED, EhsEngine,
});
