// ──────────────────────────────────────────────────────────────────────────
// CRM / LEAD-PIPELINE világ — az ajánlat-FSM ELÉ fűzött kereskedelmi pipeline
//
// Két entitás, két FSM, egy konverziós kézfogás közöttük:
//   1) LEAD (sim.leads[])          — a megkereséstől a minősítésig.
//      új → kapcsolatfelvétel → minősítés → nurturing → konvertálva (+ elvetve)
//   2) OPPORTUNITY (sim.opportunities[]) — a minősített lehetőség az ajánlatig.
//      nyitott → igényfelmérés → ajánlat kiküldve → tárgyalás → megnyert / elveszett
//
// A LÁNC VÉGE a meglévő világba köt: a megnyert lehetőség → `createQuote`
// (Értékesítés ajánlat-FSM), és ÚJ ügyfél a CUSTOMERS-be, ha még nincs.
// Csatornák: webshop érdeklődés → auto-lead (mint a service auto-jegy), telefon,
// email, kiállítás, weboldal-űrlap, ajánlás, belsőépítész partner.
// Tevékenység-napló (hívás/email/találkozó) az entitáson; külön feladatok (sim.crmTasks[])
// határidővel + SLA. B2B kiadás partnernek (handshake, mint a többi világ).
// A státusz az entitáson él; az átmenetet a store validált FSM-je (CrmEngine) kezeli.
// ──────────────────────────────────────────────────────────────────────────

const CRM_TODAY = "2026-04-28"; // a store „today"-jával szinkronban

// ── Lead-források (honnan jön a megkeresés) ─────────────────────────────────
const CRM_SOURCE_META = {
  telefon:      { key: "telefon",      label: "Telefon",            icon: "phone",      accent: "#0284c7", pill: "bg-sky-50 text-sky-700 border-sky-200" },
  ajanlas:      { key: "ajanlas",      label: "Ajánlás",            icon: "user",       accent: "#059669", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  email:        { key: "email",        label: "Email",              icon: "send",       accent: "#4f46e5", pill: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  kiallitas:    { key: "kiallitas",    label: "Kiállítás / vásár",  icon: "storefront", accent: "#d97706", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  weboldal:     { key: "weboldal",     label: "Weboldal űrlap",     icon: "external",   accent: "#2563eb", pill: "bg-blue-50 text-blue-700 border-blue-200" },
  webshop:      { key: "webshop",      label: "Webshop érdeklődés", icon: "box",        accent: "#0d9488", pill: "bg-teal-50 text-teal-700 border-teal-200" },
  belsoepitesz: { key: "belsoepitesz", label: "Belsőépítész partner", icon: "sparkle",  accent: "#e11d48", pill: "bg-rose-50 text-rose-700 border-rose-200" },
};
const CRM_SOURCE_ORDER = ["telefon", "ajanlas", "email", "kiallitas", "weboldal", "webshop", "belsoepitesz"];

// ── LEAD státusz-FSM ────────────────────────────────────────────────────────
// új → kapcsolatfelvétel → minősítés → nurturing → konvertálva (+ elvetve)
// A `konvertalva` állapotot NEM a sima status-léptetés állítja, hanem a
// `convertLeadToOpp` akció (lehetőséget hoz létre). A nurturing tartó-állapot.
const LEAD_FLOW = {
  order: ["uj", "kapcsolat", "minosites", "nurturing", "konvertalva"],
  states: {
    uj:          { next: ["kapcsolat", "elvetve"] },
    kapcsolat:   { next: ["minosites", "nurturing", "elvetve"] },
    minosites:   { next: ["nurturing", "konvertalva", "elvetve"] },
    nurturing:   { next: ["minosites", "konvertalva", "elvetve"] },
    konvertalva: { next: [], terminal: true },
    elvetve:     { next: ["uj"], terminal: true },
  },
};
const LEAD_STATUS = {
  uj:          { label: "Új",            pill: "bg-stone-100 text-stone-700 border-stone-200",     dot: "bg-stone-400" },
  kapcsolat:   { label: "Kapcsolatfelvétel", pill: "bg-sky-50 text-sky-700 border-sky-200",        dot: "bg-sky-500" },
  minosites:   { label: "Minősítés",     pill: "bg-indigo-50 text-indigo-700 border-indigo-200",   dot: "bg-indigo-500" },
  nurturing:   { label: "Nurturing",     pill: "bg-amber-50 text-amber-700 border-amber-200",      dot: "bg-amber-500" },
  konvertalva: { label: "Konvertálva",   pill: "bg-emerald-50 text-emerald-700 border-emerald-200",dot: "bg-emerald-500" },
  elvetve:     { label: "Elvetve",       pill: "bg-stone-200 text-stone-500 border-stone-300",     dot: "bg-stone-400" },
};

// ── OPPORTUNITY (üzleti lehetőség) státusz-FSM ──────────────────────────────
// nyitott → igényfelmérés → ajánlat kiküldve → tárgyalás → megnyert / elveszett
const OPP_FLOW = {
  order: ["nyitott", "igenyfelmeres", "osszeallitas", "ajanlat", "targyalas", "megnyert"],
  states: {
    nyitott:       { next: ["igenyfelmeres", "elveszett"] },
    igenyfelmeres: { next: ["osszeallitas", "elveszett"] },
    osszeallitas:  { next: ["ajanlat", "elveszett"] },
    ajanlat:       { next: ["targyalas", "megnyert", "elveszett"] },
    targyalas:     { next: ["megnyert", "elveszett"] },
    megnyert:      { next: [], terminal: true },
    elveszett:     { next: ["nyitott"], terminal: true },
  },
};
const OPP_STATUS = {
  nyitott:       { label: "Nyitott",         pill: "bg-stone-100 text-stone-700 border-stone-200",     dot: "bg-stone-400",   prob: 0.10 },
  igenyfelmeres: { label: "Igényfelmérés",   pill: "bg-sky-50 text-sky-700 border-sky-200",            dot: "bg-sky-500",     prob: 0.25 },
  osszeallitas:  { label: "Összeállítás alatt", pill: "bg-cyan-50 text-cyan-700 border-cyan-200",        dot: "bg-cyan-500",    prob: 0.40 },
  ajanlat:       { label: "Ajánlat kiküldve",pill: "bg-indigo-50 text-indigo-700 border-indigo-200",   dot: "bg-indigo-500",  prob: 0.55 },
  targyalas:     { label: "Tárgyalás",       pill: "bg-amber-50 text-amber-700 border-amber-200",      dot: "bg-amber-500",   prob: 0.80 },
  megnyert:      { label: "Megnyert",        pill: "bg-emerald-50 text-emerald-700 border-emerald-200",dot: "bg-emerald-500", prob: 1.0 },
  elveszett:     { label: "Elveszett",       pill: "bg-rose-50 text-rose-700 border-rose-200",         dot: "bg-rose-500",    prob: 0 },
};

// ── Tevékenység-típusok (napló-tételek) ─────────────────────────────────────
const CRM_ACT_META = {
  hivas:      { key: "hivas",      label: "Hívás",      icon: "phone",    accent: "#0284c7" },
  email:      { key: "email",      label: "Email",      icon: "send",     accent: "#4f46e5" },
  talalkozo:  { key: "talalkozo",  label: "Találkozó",  icon: "calendar", accent: "#d97706" },
  megjegyzes: { key: "megjegyzes", label: "Megjegyzés", icon: "chat",     accent: "#78716c" },
};
const CRM_ACT_ORDER = ["hivas", "email", "talalkozo", "megjegyzes"];

// ── Feladat-prioritás + SLA (válaszidő nap) ─────────────────────────────────
const CRM_TASK_PRIORITY = {
  alacsony: { key: "alacsony", label: "Alacsony", pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400", rank: 0 },
  kozepes:  { key: "kozepes",  label: "Közepes",  pill: "bg-sky-50 text-sky-700 border-sky-200",         dot: "bg-sky-500",   rank: 1 },
  magas:    { key: "magas",    label: "Magas",    pill: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-500", rank: 2 },
};
const CRM_TASK_PRIORITY_ORDER = ["magas", "kozepes", "alacsony"];

// ── Seed: leadek ────────────────────────────────────────────────────────────
const LEADS_SEED = [
  // 1) Új — webshop érdeklődés (auto-lead csatorna demója)
  { id: "LEAD-2426-001", status: "uj", source: "webshop", owner: "Szabó A.",
    company: "", contact: "Kele Márton", email: "kele.marton@gmail.com", phone: "+36 30 244 5512", city: "Budapest",
    title: "Konyhabútor felújítás (~3,2 fm)", interest: "L-alakú konyha, tölgy front, beépített gépekkel.",
    estValue: 2_400_000, createdAt: "2026-04-27",
    activities: [{ at: "2026-04-27 09:14", kind: "megjegyzes", who: "Rendszer", text: "Webshop érdeklődésből automatikusan létrehozva." }] },

  // 2) Kapcsolatfelvétel — kiállítás
  { id: "LEAD-2426-002", status: "kapcsolat", source: "kiallitas", owner: "Kovács P.",
    company: "Novitech Mérnökiroda Kft.", contact: "Halmi Gábor", email: "halmi@novitech.hu", phone: "+36 1 388 2210", city: "Budapest",
    title: "Iroda berendezés — 40 munkaállomás", interest: "Új irodaszint teljes bútorozása, asztalok + tárolók + tárgyaló.",
    estValue: 11_500_000, createdAt: "2026-04-22",
    activities: [
      { at: "2026-04-22 15:40", kind: "talalkozo", who: "Kovács P.", text: "Construma kiállításon felvett kapcsolat, névjegy + igény-vázlat." },
      { at: "2026-04-24 10:05", kind: "email", who: "Kovács P.", text: "Bemutatkozó anyag + referenciák kiküldve." }] },

  // 3) Minősítés — ajánlás (meglévő ügyfél referál)
  { id: "LEAD-2426-003", status: "minosites", source: "ajanlas", owner: "Szabó A.",
    company: "Bistro Central", contact: "Reményi Dóra", email: "remenyi@bistrocentral.hu", phone: "+36 70 119 4420", city: "Budapest",
    title: "Étterem beépített bútorzat + pult", interest: "Vendégtér bútor + bárpult + kiszolgáló. Belváros Café ajánlására.",
    estValue: 5_800_000, createdAt: "2026-04-18", referredBy: "Belváros Café",
    activities: [
      { at: "2026-04-18 11:00", kind: "hivas", who: "Szabó A.", text: "Bejövő hívás — Belváros Café ajánlására keresett meg." },
      { at: "2026-04-20 14:20", kind: "talalkozo", who: "Szabó A.", text: "Helyszíni egyeztetés, igények felmérve. Budget reális." }] },

  // 4) Nurturing — telefon (még nem aktuális, ősszel)
  { id: "LEAD-2426-004", status: "nurturing", source: "telefon", owner: "Szabó A.",
    company: "", contact: "Dr. Halász Péter", email: "halasz.p@protonmail.com", phone: "+36 20 556 7781", city: "Balatonfüred",
    title: "Nyaraló konyha + gardrób", interest: "Felújítás ősszel indul, addig tájékozódik. Tartani a kapcsolatot.",
    estValue: 4_200_000, createdAt: "2026-03-30",
    activities: [
      { at: "2026-03-30 16:10", kind: "hivas", who: "Szabó A.", text: "Érdeklődő hívás, projekt csak szeptemberben indul." },
      { at: "2026-04-15 09:30", kind: "email", who: "Szabó A.", text: "Katalógus + anyagminta-info kiküldve, emlékeztető beállítva." }] },

  // 5) Elvetve — email (budget-eltérés)
  { id: "LEAD-2426-005", status: "elvetve", source: "email", owner: "Kovács P.",
    company: "", contact: "Tarr Niké", email: "nike.tarr@gmail.com", phone: "+36 30 901 2244", city: "Szeged",
    title: "Olcsó polcrendszer garázsba", interest: "Tömeggyártott, alacsony árfekvésű megoldást keres.",
    estValue: 180_000, createdAt: "2026-04-12", lostReason: "Nem a profilunk — tömegtermék, ár-érzékeny. Más gyártót ajánlottunk.",
    activities: [
      { at: "2026-04-12 08:50", kind: "email", who: "Kovács P.", text: "Beérkező megkeresés." },
      { at: "2026-04-13 10:00", kind: "megjegyzes", who: "Kovács P.", text: "Elvetve — nem illik a profilunkba (egyedi gyártás)." }] },

  // 6) Konvertálva — belsőépítész partner (→ OPP-2426-001)
  { id: "LEAD-2426-006", status: "konvertalva", source: "belsoepitesz", owner: "Kovács P.",
    company: "Vella Interior Design", contact: "Vella Andrea", email: "andrea@vellainterior.hu", phone: "+36 1 567 890", city: "Budapest",
    title: "Penthouse konyha + nappali bútor", interest: "Belsőépítész partner közvetítésével, igényes egyedi konyha.",
    estValue: 6_500_000, createdAt: "2026-04-10", referredBy: "Lakberendezés Plusz", oppId: "OPP-2426-001",
    activities: [
      { at: "2026-04-10 13:00", kind: "email", who: "Kovács P.", text: "Lakberendezés Plusz partnertől beérkezett megkeresés + tervrajz." },
      { at: "2026-04-14 11:30", kind: "talalkozo", who: "Kovács P.", text: "Minősítve — komoly szándék, magas budget. Lehetőséggé konvertálva." }] },
];

// ── Seed: lehetőségek (opportunities) ───────────────────────────────────────
const OPPS_SEED = [
  // 1) Nyitott — LEAD-2426-006-ból konvertálva
  { id: "OPP-2426-001", status: "nyitott", owner: "Kovács P.",
    customer: "Vella Interior Design", contact: "Vella Andrea", phone: "+36 1 567 890", city: "Budapest",
    title: "Penthouse konyha + nappali bútor", value: 6_500_000,
    source: "belsoepitesz", fromLead: "LEAD-2426-006", expectedClose: "2026-06-15", isNewCustomer: false, createdAt: "2026-04-14",
    activities: [{ at: "2026-04-14 11:35", kind: "megjegyzes", who: "Kovács P.", text: "Lehetőség létrehozva a LEAD-2426-006 minősített leadből." }] },

  // 2) Igényfelmérés — meglévő ügyfél (Doorstar), 2. ütem
  { id: "OPP-2426-002", status: "igenyfelmeres", owner: "Kovács P.",
    customer: "Doorstar Hungary Zrt.", contact: "Kis Zoltán", phone: "+36 27 123 456", city: "Vác",
    title: "Belső ajtó sorozat — 2. ütem (120 db)", value: 14_200_000,
    source: "ajanlas", fromLead: null, expectedClose: "2026-05-30", isNewCustomer: false, createdAt: "2026-04-16",
    activities: [
      { at: "2026-04-16 09:00", kind: "hivas", who: "Kovács P.", text: "Meglévő ügyfél jelezte a 2. ütem igényét." },
      { at: "2026-04-23 14:00", kind: "talalkozo", who: "Kovács P.", text: "Műszaki egyeztetés, mennyiségek pontosítva. Felmérés ütemezve." }] },

  // 3) Ajánlat kiküldve — linkelt quote (a Sales világ Q-jával összhangban)
  { id: "OPP-2426-003", status: "ajanlat", owner: "Szabó A.",
    customer: "Várdai Konyhastúdió", contact: "Várdai Eszter", phone: "+36 52 234 124", city: "Debrecen",
    title: "Bemutatóterem bővítés — kiállító konyhák", value: 3_200_000,
    source: "ajanlas", fromLead: null, expectedClose: "2026-05-12", isNewCustomer: false, createdAt: "2026-04-12", quoteId: "Q-2426-057",
    activities: [
      { at: "2026-04-12 10:00", kind: "email", who: "Szabó A.", text: "Igény beérkezett, paraméterek tisztázva." },
      { at: "2026-04-25 16:30", kind: "email", who: "Szabó A.", text: "Ajánlat (Q-2426-057) kiküldve, 1,95 M Ft." }] },

  // 4) Tárgyalás
  { id: "OPP-2426-004", status: "targyalas", owner: "Kovács P.",
    customer: "Hegyi Lakberendezés", contact: "Hegyi Krisztina", phone: "+36 99 312 444", city: "Sopron",
    title: "Nappali fal + médiabútor", value: 2_400_000,
    source: "weboldal", fromLead: null, expectedClose: "2026-05-08", isNewCustomer: false, createdAt: "2026-04-08", quoteId: "Q-2426-054",
    activities: [
      { at: "2026-04-21 11:00", kind: "email", who: "Kovács P.", text: "Ajánlat (Q-2426-054) kiküldve." },
      { at: "2026-04-26 15:00", kind: "hivas", who: "Kovács P.", text: "Ügyfél kedvezményt kér, tárgyalás folyamatban." }] },

  // 5) Megnyert — új ügyfél lett belőle
  { id: "OPP-2426-005", status: "megnyert", owner: "Szabó A.",
    customer: "Bognár Bútor Kft.", contact: "Bognár István", phone: "+36 72 412 333", city: "Pécs",
    title: "Sorozat-gyártás keretszerződés (Q2)", value: 8_800_000,
    source: "telefon", fromLead: null, expectedClose: "2026-04-26", isNewCustomer: false, createdAt: "2026-03-28", quoteId: "Q-2426-058", wonAt: "2026-04-26",
    activities: [
      { at: "2026-04-26 12:00", kind: "megjegyzes", who: "Szabó A.", text: "Megnyert — keretszerződés aláírva. Ajánlat: Q-2426-058." }] },

  // 6) Elveszett (versenytárs)
  { id: "OPP-2426-006", status: "elveszett", owner: "Szabó A.",
    customer: "Pesti Ablakműhely", contact: "Pesti Tamás", phone: "+36 1 422 100", city: "Budapest",
    title: "Raktári tárolók (selejtes ütem)", value: 1_100_000,
    source: "weboldal", fromLead: null, expectedClose: "2026-04-20", isNewCustomer: false, createdAt: "2026-03-25", lostReason: "Árban alulmaradtunk egy helyi versenytárssal szemben.", lostAt: "2026-04-20",
    activities: [
      { at: "2026-04-20 09:00", kind: "megjegyzes", who: "Szabó A.", text: "Elveszett — ár-alapú döntés, versenytárs nyert." }] },
];

// ── Seed: feladatok / emlékeztetők (határidő + SLA) ─────────────────────────
const CRM_TASKS_SEED = [
  { id: "CRMT-001", refType: "opp",  refId: "OPP-2426-002", title: "Helyszíni felmérés időpont egyeztetése", priority: "magas",  due: "2026-04-29", done: false, owner: "Kovács P." },
  { id: "CRMT-002", refType: "lead", refId: "LEAD-2426-002", title: "Visszahívás az iroda-projekt ajánlatáról", priority: "magas",  due: "2026-04-26", done: false, owner: "Kovács P." },
  { id: "CRMT-003", refType: "opp",  refId: "OPP-2426-004", title: "Kedvezményes szerződés-tervezet küldése",   priority: "magas",  due: "2026-04-28", done: false, owner: "Kovács P." },
  { id: "CRMT-004", refType: "lead", refId: "LEAD-2426-004", title: "Őszi újrakapcsolat — emlékeztető",          priority: "alacsony", due: "2026-09-01", done: false, owner: "Szabó A." },
  { id: "CRMT-005", refType: "opp",  refId: "OPP-2426-003", title: "Ajánlat-utánkövetés (Várdai)",              priority: "kozepes", due: "2026-05-02", done: false, owner: "Szabó A." },
  { id: "CRMT-006", refType: "lead", refId: "LEAD-2426-003", title: "Étterem — anyagminták bemutatása",          priority: "kozepes", due: "2026-04-24", done: true,  owner: "Szabó A." },
];

// ──────────────────────────────────────────────────────────────────────────
// CrmEngine — tiszta számítások (FSM, valószínűség-súlyozott forecast, SLA)
// ──────────────────────────────────────────────────────────────────────────
const _crmParse = (s) => { const [y, m, d] = String(s || "").split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const _crmDayDiff = (a, b) => Math.round((_crmParse(a) - _crmParse(b)) / 86400000);

const CrmEngine = {
  // LEAD FSM
  leadCanGo(lead, to) { const st = LEAD_FLOW.states[lead.status]; return !!(st && st.next.includes(to)); },
  leadNext(lead) { const st = LEAD_FLOW.states[lead.status]; return st ? st.next.slice() : []; },
  leadIsOpen(lead) { return !["konvertalva", "elvetve"].includes(lead.status); },
  // OPP FSM
  oppCanGo(opp, to) { const st = OPP_FLOW.states[opp.status]; return !!(st && st.next.includes(to)); },
  oppNext(opp) { const st = OPP_FLOW.states[opp.status]; return st ? st.next.slice() : []; },
  oppIsOpen(opp) { return !["megnyert", "elveszett"].includes(opp.status); },
  oppProb(opp) { return (OPP_STATUS[opp.status] || {}).prob || 0; },
  oppWeighted(opp) { return Math.round((opp.value || 0) * this.oppProb(opp)); },
  // Forecast a nyitott lehetőségekből
  forecast(opps) {
    const open = (opps || []).filter((o) => this.oppIsOpen(o));
    const pipeline = open.reduce((s, o) => s + (o.value || 0), 0);
    const weighted = open.reduce((s, o) => s + this.oppWeighted(o), 0);
    const won = (opps || []).filter((o) => o.status === "megnyert").reduce((s, o) => s + (o.value || 0), 0);
    const lost = (opps || []).filter((o) => o.status === "elveszett").reduce((s, o) => s + (o.value || 0), 0);
    const byStage = {};
    OPP_FLOW.order.forEach((st) => { const items = (opps || []).filter((o) => o.status === st); byStage[st] = { count: items.length, value: items.reduce((s, o) => s + (o.value || 0), 0) }; });
    return { pipeline, weighted, won, lost, openCount: open.length, byStage };
  },
  // Konverziós arány: konvertált leadek / lezárt leadek (konvertált + elvetett)
  leadConversion(leads) {
    const conv = (leads || []).filter((l) => l.status === "konvertalva").length;
    const closed = (leads || []).filter((l) => ["konvertalva", "elvetve"].includes(l.status)).length;
    return { conv, closed, rate: closed ? conv / closed : 0 };
  },
  // OPP nyerési arány
  oppWinRate(opps) {
    const won = (opps || []).filter((o) => o.status === "megnyert").length;
    const closed = (opps || []).filter((o) => ["megnyert", "elveszett"].includes(o.status)).length;
    return { won, closed, rate: closed ? won / closed : 0 };
  },
  // Feladat-SLA: hátralévő napok / lejárt (nyitott feladatnál)
  taskSla(task, today = CRM_TODAY) {
    if (task.done || !task.due) return { active: false, daysLeft: null, overdue: false };
    const daysLeft = _crmDayDiff(task.due, today);
    return { active: true, daysLeft, overdue: daysLeft < 0 };
  },
  dayDiff: _crmDayDiff,
};

Object.assign(window, {
  CRM_TODAY, CRM_SOURCE_META, CRM_SOURCE_ORDER,
  LEAD_FLOW, LEAD_STATUS, OPP_FLOW, OPP_STATUS,
  CRM_ACT_META, CRM_ACT_ORDER, CRM_TASK_PRIORITY, CRM_TASK_PRIORITY_ORDER,
  LEADS_SEED, OPPS_SEED, CRM_TASKS_SEED, CrmEngine,
});
