// ──────────────────────────────────────────────────────────────────────────
// MINŐSÉGBIZTOSÍTÁS világ — gyártásközi + bejövő + végellenőrzés (QA/QC)
//
// FELELŐSSÉG: az ÁTADÁS ELŐTTI minőség. Három pont: bejövő anyag/áru, gyártás-
// közi, és végellenőrzés (kiszállítás/átadás előtt). A Reklamáció (`service`)
// ezzel SZEMBEN az átadás UTÁNI hurok — nem keverednek.
// Egy ellenőrzés (`sim.qaInspections[]`) saját FSM-mel; a hibajegyzőkönyv (NCR)
// a defektek listája. Bekötés: rendelés/job (mit ellenőriz), bejövő anyag selejt
// → jelzés a Beszerzésnek/beszállítónak. A státusz az ellenőrzésen él.
// ──────────────────────────────────────────────────────────────────────────

const QA_TODAY = "2026-04-28";

// ── Ellenőrzés-típusok (a minőség-pont) ─────────────────────────────────────
const QA_TYPE_META = {
  bejovo:        { key: "bejovo",        label: "Bejövő anyagellenőrzés", short: "Bejövő",     icon: "inbox",   accent: "#0284c7", pill: "bg-sky-50 text-sky-700 border-sky-200",        desc: "Beérkezett anyag / áru ellenőrzése bevételezéskor (beszállítói minőség)." },
  gyartaskozi:   { key: "gyartaskozi",   label: "Gyártásközi ellenőrzés", short: "Gyártásközi", icon: "factory", accent: "#65a30d", pill: "bg-lime-50 text-lime-700 border-lime-200",     desc: "Művelet közbeni minőség-ellenőrzés (szabászat / élzárás / CNC / felület)." },
  vegellenorzes: { key: "vegellenorzes", label: "Végellenőrzés",          short: "Végellenőrzés",icon: "shield", accent: "#059669", pill: "bg-emerald-50 text-emerald-700 border-emerald-200", desc: "Kiszállítás / átadás előtti záró minőség-ellenőrzés." },
};
const QA_TYPE_ORDER = ["bejovo", "gyartaskozi", "vegellenorzes"];

// ── Státusz-FSM ─────────────────────────────────────────────────────────────
// nyitott → folyamatban → megfelelt / javitasra / selejt   (javitasra → folyamatban = rework)
const QA_FLOW = {
  order: ["nyitott", "folyamatban", "megfelelt"],
  states: {
    nyitott:     { next: ["folyamatban"] },
    folyamatban: { next: ["megfelelt", "javitasra", "selejt"] },
    javitasra:   { next: ["folyamatban"] },   // javításra visszaküldve → újra-ellenőrzés
    megfelelt:   { next: [], terminal: true },
    selejt:      { next: [], terminal: true },
  },
};
const QA_STATUS = {
  nyitott:     { label: "Nyitott",     pill: "bg-stone-100 text-stone-700 border-stone-200",     dot: "bg-stone-400" },
  folyamatban: { label: "Folyamatban", pill: "bg-sky-50 text-sky-700 border-sky-200",            dot: "bg-sky-500" },
  megfelelt:   { label: "Megfelelt",   pill: "bg-emerald-50 text-emerald-700 border-emerald-200",dot: "bg-emerald-500" },
  javitasra:   { label: "Javításra",   pill: "bg-amber-50 text-amber-700 border-amber-200",      dot: "bg-amber-500" },
  selejt:      { label: "Selejt",      pill: "bg-rose-50 text-rose-700 border-rose-200",         dot: "bg-rose-500" },
};

// ── Hibasúlyosság (NCR defekt) ──────────────────────────────────────────────
const QA_DEFECT_SEV = {
  minor:   { key: "minor",   label: "Kisebb",     pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400", rank: 0 },
  major:   { key: "major",   label: "Jelentős",   pill: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-500", rank: 1 },
  kritikus:{ key: "kritikus",label: "Kritikus",   pill: "bg-rose-50 text-rose-700 border-rose-200",     dot: "bg-rose-500",  rank: 2 },
};
const QA_DEFECT_ORDER = ["kritikus", "major", "minor"];

// ── Prioritás + SLA (nap) ───────────────────────────────────────────────────
const QA_PRIORITY = {
  alacsony: { key: "alacsony", label: "Alacsony", slaDays: 5, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400", rank: 0 },
  kozepes:  { key: "kozepes",  label: "Közepes",  slaDays: 2, pill: "bg-sky-50 text-sky-700 border-sky-200",         dot: "bg-sky-500",   rank: 1 },
  magas:    { key: "magas",    label: "Magas",    slaDays: 1, pill: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-500", rank: 2 },
};
const QA_PRIORITY_ORDER = ["magas", "kozepes", "alacsony"];

// ── Checklist-sablonok típusonként (alap, az ellenőrzés másolja) ────────────
const QA_CHECKLISTS = {
  bejovo:        ["Mennyiség egyezik a szállítólevéllel", "Sérülésmentes csomagolás", "Méret / vastagság a tűrésen belül", "Felület / szín a mintával egyezik", "Tanúsítvány / dokumentáció megvan"],
  gyartaskozi:   ["Méret a rajz szerint (±1 mm)", "Élzárás folytonos, lecsiszolt", "Furatok pozíciója pontos", "Felület karc- és hibamentes", "Címke / azonosító felhelyezve"],
  vegellenorzes: ["Összeszerelés hézagmentes", "Ajtók / fiókok járása megfelelő", "Vasalat működik (soft-close)", "Felület tisztított, karcmentes", "Tartozékok / szerelvények hiánytalan", "Csomagolás szállításra kész"],
};

// ── Seed ellenőrzések ───────────────────────────────────────────────────────
const _qaChk = (type, oks) => (QA_CHECKLISTS[type] || []).map((label, i) => ({ label, ok: oks && oks[i] !== undefined ? oks[i] : null }));

const QA_INSPECTIONS_SEED = [
  // 1) Bejövő — folyamatban (Falco bükk tábla bevételezés)
  { id: "QA-2426-001", type: "bejovo", status: "folyamatban", priority: "kozepes",
    subject: "Bükk 18mm bútorlap — beérkezés", ref: "PO-2426-031", refLabel: "Falco Sopron Zrt. szállítmány", supplier: "Falco Sopron Zrt.",
    inspector: "Tóth Kinga", reportedAt: "2026-04-28", dueDate: "2026-04-30",
    checklist: _qaChk("bejovo", [true, true, null, null, null]), defects: [],
    note: "30 tábla érkezett, méret-ellenőrzés folyamatban.",
    log: [{ at: "2026-04-28 08:10", text: "Bejövő ellenőrzés megnyitva (PO-2426-031)" }, { at: "2026-04-28 08:30", text: "Mennyiség + csomagolás rendben" }] },

  // 2) Gyártásközi — nyitott (Bognár konyha élzárás)
  { id: "QA-2426-002", type: "gyartaskozi", status: "nyitott", priority: "magas",
    subject: "16-fiókos konyha — élzárás ellenőrzés", ref: "JT-2426-0184", refLabel: "Bognár Bútor Kft. — konyhabútor",
    inspector: "Kiss András", reportedAt: "2026-04-28", dueDate: "2026-04-29",
    checklist: _qaChk("gyartaskozi"), defects: [],
    note: "Élzárás után, CNC előtt ütemezve.",
    log: [{ at: "2026-04-28 11:00", text: "Gyártásközi ellenőrzés létrehozva" }] },

  // 3) Végellenőrzés — javításra (Hegyi gardrób, ajtó-rés)
  { id: "QA-2426-003", type: "vegellenorzes", status: "javitasra", priority: "magas",
    subject: "Gardrób — végellenőrzés", ref: "JT-2426-0180", refLabel: "Hegyi Lakberendezés — gardrób",
    inspector: "Horváth Gábor", reportedAt: "2026-04-27", dueDate: "2026-04-28",
    checklist: _qaChk("vegellenorzes", [true, false, true, true, true, false]),
    defects: [{ sev: "major", note: "Középső tolóajtó nem fut végig a sínen — állítás szükséges." }],
    note: "Visszaküldve javításra, sín-állítás után újra-ellenőrzés.",
    log: [{ at: "2026-04-27 14:00", text: "Végellenőrzés megkezdve" }, { at: "2026-04-27 15:20", text: "Hiba: tolóajtó akad → javításra" }] },

  // 4) Gyártásközi — megfelelt (Doorstar ajtó fúrás)
  { id: "QA-2426-004", type: "gyartaskozi", status: "megfelelt", priority: "kozepes",
    subject: "Belső ajtó sorozat — CNC fúrás ellenőrzés", ref: "JT-2426-0182", refLabel: "Doorstar Hungary Zrt. — ajtók",
    inspector: "Horváth Éva", reportedAt: "2026-04-26", dueDate: "2026-04-28", closedAt: "2026-04-26",
    checklist: _qaChk("gyartaskozi", [true, true, true, true, true]), defects: [],
    note: "Mintavételes ellenőrzés (8 db), mind megfelelt.",
    log: [{ at: "2026-04-26 09:00", text: "Ellenőrzés megkezdve" }, { at: "2026-04-26 10:15", text: "Megfelelt — sorozat folytatható" }] },

  // 5) Bejövő — selejt (Häfele vasalat hibás) → jelzés a Beszerzésnek
  { id: "QA-2426-005", type: "bejovo", status: "selejt", priority: "magas",
    subject: "Häfele bútorzár — hibás tétel", ref: "PO-2426-029", refLabel: "Häfele Hungary szállítmány", supplier: "Häfele Hungary",
    inspector: "Tóth Kinga", reportedAt: "2026-04-24", dueDate: "2026-04-25", closedAt: "2026-04-25",
    checklist: _qaChk("bejovo", [true, false, true, false, true]),
    defects: [{ sev: "kritikus", note: "A zárbetétek 40%-a nem zár — gyári hiba." }, { sev: "minor", note: "Néhány doboz sérült szállításkor." }],
    note: "Teljes tétel selejt, reklamáció a beszállító felé jelezve.",
    log: [{ at: "2026-04-24 13:00", text: "Bejövő ellenőrzés (PO-2426-029)" }, { at: "2026-04-25 09:30", text: "Selejt — beszállítói reklamáció jelezve a Beszerzésnek" }] },

  // 6) Végellenőrzés — nyitott (Várdai konyha)
  { id: "QA-2426-006", type: "vegellenorzes", status: "nyitott", priority: "kozepes",
    subject: "Bemutató konyha — végellenőrzés", ref: "JT-2426-0186", refLabel: "Várdai Konyhastúdió — kiállító konyha",
    inspector: "Varga László", reportedAt: "2026-04-28", dueDate: "2026-05-02",
    checklist: _qaChk("vegellenorzes"), defects: [],
    note: "Felületkezelés után ütemezve.",
    log: [{ at: "2026-04-28 12:00", text: "Végellenőrzés betervezve" }] },
];

// ──────────────────────────────────────────────────────────────────────────
// QaEngine — tiszta számítások (FSM, SLA, megfelelési arány)
// ──────────────────────────────────────────────────────────────────────────
const _qaParse = (s) => { const [y, m, d] = String(s || "").split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const _qaDiff = (a, b) => Math.round((_qaParse(a) - _qaParse(b)) / 86400000);

const QaEngine = {
  canGo(insp, to) { const st = QA_FLOW.states[insp.status]; return !!(st && st.next.includes(to)); },
  nextStates(insp) { const st = QA_FLOW.states[insp.status]; return st ? st.next.slice() : []; },
  isTerminal(insp) { const st = QA_FLOW.states[insp.status]; return !!(st && st.terminal); },
  isOpen(insp) { return !["megfelelt", "selejt"].includes(insp.status); },
  // checklist haladás
  progress(insp) {
    const items = insp.checklist || [];
    const done = items.filter((c) => c.ok !== null).length;
    const fail = items.filter((c) => c.ok === false).length;
    return { total: items.length, done, fail, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
  },
  // SLA: a határidőig hátralévő napok (nyitott ellenőrzésnél)
  sla(insp, today = QA_TODAY) {
    if (!insp.dueDate || !this.isOpen(insp)) return { active: false, daysLeft: null, overdue: false };
    const daysLeft = _qaDiff(insp.dueDate, today);
    return { active: true, daysLeft, overdue: daysLeft < 0 };
  },
  // legsúlyosabb defekt rangja
  worstDefect(insp) {
    let worst = null;
    (insp.defects || []).forEach((d) => { const r = (QA_DEFECT_SEV[d.sev] || {}).rank || 0; if (worst === null || r > worst) worst = r; });
    return worst;
  },
  // megfelelési arány a lezárt ellenőrzésekből
  passRate(list) {
    const closed = (list || []).filter((i) => ["megfelelt", "selejt"].includes(i.status));
    const pass = closed.filter((i) => i.status === "megfelelt").length;
    return { pass, closed: closed.length, rate: closed.length ? pass / closed.length : 0 };
  },
};

Object.assign(window, {
  QA_TODAY, QA_TYPE_META, QA_TYPE_ORDER, QA_FLOW, QA_STATUS,
  QA_DEFECT_SEV, QA_DEFECT_ORDER, QA_PRIORITY, QA_PRIORITY_ORDER, QA_CHECKLISTS,
  QA_INSPECTIONS_SEED, QaEngine,
});
