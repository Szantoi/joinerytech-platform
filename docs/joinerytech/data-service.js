// ──────────────────────────────────────────────────────────────────────────
// REKLAMÁCIÓ világ — szerviz / garancia / hiánypótlás (átadás utáni hurok)
//
// A fizikai lánc (Logisztika) az `átadva`-nál zárult; ez a világ az UTÓÉLETET
// kezeli: garanciális reklamáció, átadási hiánypótlás, karbantartás/beállítás.
// Egy jegy (`sim.serviceTickets[]`) saját FSM-mel; a megoldás VISSZAKÖT a többi
// világba: helyszíni javítás → Logisztika fuvar, csere-alkatrész → gyártási
// rendelés, be-húzás → visszáru. Csatornák: webshop (D1/D2 önkiszolgáló),
// belső felvétel, Logisztika `reklamáció` ág (auto-jegy), átadási hiánylista-tétel.
// A státusz a jegyen él; az átmenetet a store `setTicketStatus` validált FSM-je kezeli.
// ──────────────────────────────────────────────────────────────────────────

const SVC_TODAY = "2026-04-28"; // a store „today"-jával szinkronban

// ── Jegytípusok ────────────────────────────────────────────────────────────
const SVC_TYPE_META = {
  garancia:    { key: "garancia",    label: "Garanciális reklamáció", short: "Garancia",   icon: "shield",  accent: "#dc2626", pill: "bg-rose-50 text-rose-700 border-rose-200",     desc: "Hibás termék vagy beépítés a garancia-időn belül." },
  hianypotlas: { key: "hianypotlas", label: "Hiánypótlás",            short: "Hiánypótlás", icon: "alert",   accent: "#d97706", pill: "bg-amber-50 text-amber-700 border-amber-200",   desc: "Átadáskor felvett hiánylistából eredő tétel." },
  karbantartas:{ key: "karbantartas",label: "Karbantartás / beállítás",short: "Karbantartás",icon: "wrench",  accent: "#0d9488", pill: "bg-teal-50 text-teal-700 border-teal-200",     desc: "Utánállítás, beállítás, időszakos karbantartás." },
};
const SVC_TYPE_ORDER = ["garancia", "hianypotlas", "karbantartas"];

// ── Státusz-FSM ────────────────────────────────────────────────────────────
// bejelentve → kivizsgalas → utemezve → javitas → ellenorzes → lezarva (+ elutasitva)
const SVC_FLOW = {
  order: ["bejelentve", "kivizsgalas", "utemezve", "javitas", "ellenorzes", "lezarva"],
  states: {
    bejelentve:  { next: ["kivizsgalas", "elutasitva"] },
    kivizsgalas: { next: ["utemezve", "elutasitva"] },
    utemezve:    { next: ["javitas", "elutasitva"] },
    javitas:     { next: ["ellenorzes"] },
    ellenorzes:  { next: ["lezarva", "javitas"] },   // ellenőrzés bukás → vissza javításra
    lezarva:     { next: [], terminal: true },
    elutasitva:  { next: ["bejelentve"], terminal: true }, // panasz újranyitható
  },
};

const SVC_STATUS = {
  bejelentve:  { label: "Bejelentve",   pill: "bg-stone-100 text-stone-700 border-stone-200",     dot: "bg-stone-400" },
  kivizsgalas: { label: "Kivizsgálás",  pill: "bg-sky-50 text-sky-700 border-sky-200",            dot: "bg-sky-500" },
  utemezve:    { label: "Ütemezve",     pill: "bg-indigo-50 text-indigo-700 border-indigo-200",   dot: "bg-indigo-500" },
  javitas:     { label: "Javítás",      pill: "bg-amber-50 text-amber-700 border-amber-200",      dot: "bg-amber-500" },
  ellenorzes:  { label: "Ellenőrzés",   pill: "bg-cyan-50 text-cyan-700 border-cyan-200",         dot: "bg-cyan-500" },
  lezarva:     { label: "Lezárva",      pill: "bg-emerald-50 text-emerald-700 border-emerald-200",dot: "bg-emerald-500" },
  elutasitva:  { label: "Elutasítva",   pill: "bg-stone-200 text-stone-500 border-stone-300",     dot: "bg-stone-400" },
};

// ── Prioritás + SLA (válaszidő nap) ────────────────────────────────────────
const SVC_PRIORITY = {
  alacsony: { key: "alacsony", label: "Alacsony", slaDays: 14, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400", rank: 0 },
  kozepes:  { key: "kozepes",  label: "Közepes",  slaDays: 7,  pill: "bg-sky-50 text-sky-700 border-sky-200",         dot: "bg-sky-500",   rank: 1 },
  magas:    { key: "magas",    label: "Magas",    slaDays: 3,  pill: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-500", rank: 2 },
  surgos:   { key: "surgos",   label: "Sürgős",   slaDays: 1,  pill: "bg-rose-50 text-rose-700 border-rose-200",      dot: "bg-rose-500",  rank: 3 },
};
const SVC_PRIORITY_ORDER = ["surgos", "magas", "kozepes", "alacsony"];

// ── Megoldási módok (a többi világba kötnek) ───────────────────────────────
const SVC_RESOLUTION = {
  helyszini: { key: "helyszini", label: "Helyszíni javítás", icon: "truck",  hint: "Szerelő kimegy — Logisztika fuvar jön létre.", link: "logistics" },
  csere:     { key: "csere",     label: "Csere-alkatrész",   icon: "factory", hint: "Csere-alkatrész gyártása — gyártási rendelés.", link: "production" },
  behuzas:   { key: "behuzas",   label: "Be-húzás a műhelybe",icon: "download",hint: "Visszáru a műhelybe — beszállítás-fuvar.",     link: "logistics" },
  beallitas: { key: "beallitas", label: "Helyszíni beállítás",icon: "wrench",  hint: "Beállítás / utasítás — nincs külön gyártás.",  link: null },
};
const SVC_RESOLUTION_ORDER = ["helyszini", "csere", "behuzas", "beallitas"];

// ── Garancia ───────────────────────────────────────────────────────────────
const SVC_WARRANTY_MONTHS = 24; // alapértelmezett garancia-idő

// ── Ügyfél-oldali (webshop) lépés-leképezés — kevesebbet lát ───────────────
const SVC_CUSTOMER_STEPS = ["Bejelentve", "Vizsgálat alatt", "Javítás folyamatban", "Megoldva"];
const SVC_STATUS_TO_CUSTOMER = {
  bejelentve: 0, kivizsgalas: 1, utemezve: 1, javitas: 2, ellenorzes: 2, lezarva: 3, elutasitva: 3,
};

// ── Seed jegyek ────────────────────────────────────────────────────────────
const SERVICE_TICKETS_SEED = [
  // 1) Hiánypótlás — a Logisztika átadási hiánylistából (Bognár, SH-2426-002): karcos fiókfront
  { id: "REK-2426-001", type: "hianypotlas", status: "utemezve", priority: "magas",
    customer: "Bognár Bútor Kft.", contact: "Bognár István", phone: "+36 72 412 333", address: "7621 Pécs, Király u. 22.",
    title: "Karcos fiókfront — csere", desc: "Az átadáskor jelölt fiókfront felülete karcos, csere ígérve.",
    ref: "JT-2426-0184", refLabel: "16-fiókos konyhabútor", shipmentId: "SH-2426-002", projectId: null,
    channel: "logistics", installedAt: "2026-04-28", warrantyMonths: 24, resolution: "csere",
    reportedAt: "2026-04-28", dueDate: "2026-05-01",
    log: [{ at: "2026-04-28 12:25", text: "Jegy létrehozva a Logisztika hiánylistából (SH-2426-002)" }, { at: "2026-04-29 09:10", text: "Kivizsgálva → csere-front gyártása ütemezve" }] },

  // 2) Garanciális reklamáció — Hegyi gardrób (átadva SH-2426-001), ajtó nem zár
  { id: "REK-2426-002", type: "garancia", status: "kivizsgalas", priority: "kozepes",
    customer: "Hegyi Lakberendezés", contact: "Hegyi Krisztina", phone: "+36 99 312 444", address: "9400 Sopron, Várkerület 18.",
    title: "Gardróbajtó nem zár rendesen", desc: "A középső tolóajtó akad, nem fut végig a sínen. Garanciális.",
    ref: "JT-2426-0180", refLabel: "Gardrób", shipmentId: "SH-2426-001", projectId: null,
    channel: "webshop", installedAt: "2026-04-24", warrantyMonths: 24, resolution: null,
    reportedAt: "2026-05-02", dueDate: "2026-05-09",
    log: [{ at: "2026-05-02 16:40", text: "Bejelentve a webshopból (ügyfél)" }, { at: "2026-05-03 08:30", text: "Kivizsgálás megkezdve — sín-állítás vagy görgő-csere" }] },

  // 3) Karbantartás / beállítás — Nagy Anna konyha (projekt), ajtó-utánállítás
  { id: "REK-2426-003", type: "karbantartas", status: "bejelentve", priority: "alacsony",
    customer: "Nagy Anna", contact: "Nagy Anna", phone: "+36 30 555 1212", address: "1124 Budapest, Petőfi u. 12.",
    title: "Konyhaajtók utánállítása", desc: "Néhány front rése elállt, kéri az utánállítást a beszokás után.",
    ref: "PRJ-2026-014", refLabel: "Petőfi u. 12. — Konyha + nappali", shipmentId: null, projectId: "PRJ-2026-014",
    channel: "internal", installedAt: "2026-04-20", warrantyMonths: 24, resolution: null,
    reportedAt: "2026-05-05", dueDate: "2026-05-19",
    log: [{ at: "2026-05-05 11:00", text: "Telefonon bejelentve — diszpécser rögzítette" }] },

  // 4) Garanciális — lezárt (megoldva), helyszíni javítással
  { id: "REK-2426-004", type: "garancia", status: "lezarva", priority: "magas",
    customer: "Belváros Café", contact: "Kovács Dóra", phone: "+36 1 266 7788", address: "1052 Budapest, Váci u. 8.",
    title: "Pult él-leválás", desc: "A bárpult egyik élzárása levált a hőhatástól. Garanciális javítás.",
    ref: "PRJ-2026-013", refLabel: "Belváros Café — pultsor", shipmentId: null, projectId: "PRJ-2026-013",
    channel: "internal", installedAt: "2026-03-15", warrantyMonths: 24, resolution: "helyszini",
    reportedAt: "2026-04-10", dueDate: "2026-04-13", closedAt: "2026-04-16",
    log: [{ at: "2026-04-10 09:00", text: "Bejelentve (belső)" }, { at: "2026-04-11", text: "Helyszíni javítás ütemezve" }, { at: "2026-04-15", text: "Élzárás újraragasztva helyszínen" }, { at: "2026-04-16", text: "Ellenőrizve és lezárva" }] },

  // 5) Garanciális — elutasítva (garancián kívüli, nem rendeltetésszerű használat)
  { id: "REK-2426-005", type: "garancia", status: "elutasitva", priority: "kozepes",
    customer: "Tóth Konyha & Társa", contact: "Tóth Béla", phone: "+36 62 555 333", address: "6722 Szeged, Tisza Lajos krt. 9.",
    title: "Vetemedett munkalap", desc: "A munkalap vetemedett — a vizsgálat tartós átázást állapított meg (nem rendeltetésszerű).",
    ref: "JT-2426-0177", refLabel: "Konyhabútor", shipmentId: null, projectId: null,
    channel: "webshop", installedAt: "2025-11-20", warrantyMonths: 24, resolution: null,
    reportedAt: "2026-04-18", dueDate: "2026-04-25", closedAt: "2026-04-22",
    log: [{ at: "2026-04-18", text: "Bejelentve a webshopból" }, { at: "2026-04-22", text: "Kivizsgálva — tartós átázás, garancián kívüli. Elutasítva (fizetős javítás felajánlva)." }] },
];

// ──────────────────────────────────────────────────────────────────────────
// ServiceEngine — tiszta számítások (FSM, SLA, garancia, ügyfél-leképezés)
// ──────────────────────────────────────────────────────────────────────────
const _svcParse = (s) => { const [y, m, d] = String(s || "").split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const _svcDayDiff = (a, b) => Math.round((_svcParse(a) - _svcParse(b)) / 86400000);
const _svcAddMonths = (s, months) => { const d = _svcParse(s); d.setMonth(d.getMonth() + months); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const ServiceEngine = {
  canGo(ticket, to) {
    const st = SVC_FLOW.states[ticket.status];
    return !!(st && st.next.includes(to));
  },
  nextStates(ticket) { const st = SVC_FLOW.states[ticket.status]; return st ? st.next.slice() : []; },
  isTerminal(ticket) { const st = SVC_FLOW.states[ticket.status]; return !!(st && st.terminal); },
  isOpen(ticket) { return !["lezarva", "elutasitva"].includes(ticket.status); },
  // garancia: az átadástól számítva
  warranty(ticket, today = SVC_TODAY) {
    if (!ticket.installedAt) return { known: false, within: null, expiry: null, daysLeft: null };
    const expiry = _svcAddMonths(ticket.installedAt, ticket.warrantyMonths || SVC_WARRANTY_MONTHS);
    const daysLeft = _svcDayDiff(expiry, today);
    return { known: true, within: daysLeft >= 0, expiry, daysLeft };
  },
  // SLA: a határidőig hátralévő napok (nyitott jegynél); lejárt = negatív
  sla(ticket, today = SVC_TODAY) {
    if (!ticket.dueDate || !this.isOpen(ticket)) return { active: false, daysLeft: null, overdue: false };
    const daysLeft = _svcDayDiff(ticket.dueDate, today);
    return { active: true, daysLeft, overdue: daysLeft < 0 };
  },
  customerStep(status) { return SVC_STATUS_TO_CUSTOMER[status] != null ? SVC_STATUS_TO_CUSTOMER[status] : 0; },
  addMonths: _svcAddMonths,
};

Object.assign(window, {
  SVC_TODAY, SVC_TYPE_META, SVC_TYPE_ORDER, SVC_FLOW, SVC_STATUS,
  SVC_PRIORITY, SVC_PRIORITY_ORDER, SVC_RESOLUTION, SVC_RESOLUTION_ORDER,
  SVC_WARRANTY_MONTHS, SVC_CUSTOMER_STEPS, SVC_STATUS_TO_CUSTOMER,
  SERVICE_TICKETS_SEED, ServiceEngine,
});
