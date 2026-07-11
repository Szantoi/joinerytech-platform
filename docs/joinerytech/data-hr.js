// ──────────────────────────────────────────────────────────────────────────
// HR / MUNKAERŐ-KAPACITÁS világ — data réteg
//
// A cég emberi erőforrása EGY igazságforrásból (sim.employees[]). Erre épül:
//   • Kapacitás-tervezés — ki ér rá, mennyi szabad óra, terhelés (SZÁMÍTOTT)
//   • Munkaidő / jelenlét — műszak, szabadság, távollét (FSM a kérelmen)
//   • Dolgozói törzs — profil, készségek (szint), bér-kategória
//   • Bérköltség → Kontrolling tény (munkaóra-napló → ctrlAdjustment)
//   • Feladat-kiosztás — projekt/fuvar/task emberhozzárendelés
//
// A Logisztika brigádjai (crews) EBBŐL állnak össze: a crew `memberIds[]` a
// dolgozókra mutat (a régi `members[]` string-lista fallback marad). A kapacitás
// így a fuvar-beosztásból IS terhelődik — közös erőforrás-réteg.
// ──────────────────────────────────────────────────────────────────────────

// ── Részlegek / osztályok ──────────────────────────────────────────────────
const HR_DEPTS = {
  gyartas:    { key: "gyartas",    label: "Gyártás / műhely", icon: "factory",   accent: "#0d9488", pill: "bg-teal-50 text-teal-700 border-teal-200" },
  szereles:   { key: "szereles",   label: "Szerelés / beépítés", icon: "wrench", accent: "#d97706", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  logisztika: { key: "logisztika", label: "Logisztika",       icon: "truck",     accent: "#0284c7", pill: "bg-sky-50 text-sky-700 border-sky-200" },
  tervezes:   { key: "tervezes",   label: "Tervezés",         icon: "ruler",     accent: "#7c3aed", pill: "bg-violet-50 text-violet-700 border-violet-200" },
  ertekesites:{ key: "ertekesites",label: "Értékesítés",      icon: "briefcase", accent: "#4f46e5", pill: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  iroda:      { key: "iroda",      label: "Iroda / admin",    icon: "user",      accent: "#57534e", pill: "bg-stone-100 text-stone-600 border-stone-200" },
};
const HR_DEPT_ORDER = ["gyartas", "szereles", "logisztika", "tervezes", "ertekesites", "iroda"];

// ── Készségek (a kapacitás + brigád-kompetencia szuperhalmaza) ──────────────
// A Logisztika CREW_SKILLS (szallit/szerel/felmer) ide olvad be.
const HR_SKILLS = {
  szabas:       { key: "szabas",       label: "Szabászat",       icon: "cut" },
  elzaras:      { key: "elzaras",      label: "Élzárás",         icon: "layers" },
  cnc:          { key: "cnc",          label: "CNC",             icon: "settings" },
  osszeszereles:{ key: "osszeszereles",label: "Összeszerelés",   icon: "cube" },
  felulet:      { key: "felulet",      label: "Felületkezelés",  icon: "drop" },
  szerel:       { key: "szerel",       label: "Beépítés",        icon: "wrench" },
  szallit:      { key: "szallit",      label: "Szállítás",       icon: "truck" },
  felmer:       { key: "felmer",       label: "Felmérés",        icon: "ruler" },
  tervezes:     { key: "tervezes",     label: "Tervezés / CAD",  icon: "ruler" },
  ertekesites:  { key: "ertekesites",  label: "Értékesítés",     icon: "briefcase" },
};
const HR_SKILL_ORDER = ["szabas", "elzaras", "cnc", "osszeszereles", "felulet", "szerel", "szallit", "felmer", "tervezes", "ertekesites"];
// készség-szint
const HR_SKILL_LEVELS = {
  1: { label: "Alap",   short: "1", pill: "bg-stone-100 text-stone-500 border-stone-200", dot: "bg-stone-300" },
  2: { label: "Rutin",  short: "2", pill: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-400" },
  3: { label: "Mester", short: "3", pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

// ── Bér-kategóriák (alapértelmezett óradíj Ft/h) ────────────────────────────
const HR_PAY_GRADES = {
  seged:      { key: "seged",      label: "Segéd / betanított", rate: 2600 },
  szakmunkas: { key: "szakmunkas", label: "Szakmunkás",         rate: 3800 },
  mester:     { key: "mester",     label: "Mester / előmunkás", rate: 5200 },
  mernok:     { key: "mernok",     label: "Mérnök / tervező",   rate: 6400 },
  vezeto:     { key: "vezeto",     label: "Vezető",             rate: 8000 },
};
const HR_PAY_ORDER = ["seged", "szakmunkas", "mester", "mernok", "vezeto"];

// ── Családi állapot ─────────────────────────────────────────────────────────
const HR_MARITAL = {
  hajadon:  { label: "Hajadon / nőtlen" },
  hazas:    { label: "Házas" },
  elettars: { label: "Élettársi kapcsolat" },
  elvalt:   { label: "Elvált" },
  ozvegy:   { label: "Özvegy" },
};
const HR_MARITAL_ORDER = ["hajadon", "hazas", "elettars", "elvalt", "ozvegy"];

// ── Személyes / HR törzsadat-mezők ──────────────────────────────────────────
// A dolgozó-profil „Személyes" füle EBBŐL rajzol generikus szerkesztőt. A mezők
// az `emp.personal{}` objektumban élnek (a munkahelyi adatok az emp gyökerén).
// type: text | date | tel ; group: szemely | elerheto | okmany. A „Családi" blokk
// (gyerekszám / családi állapot / eltartottak) külön, dedikált vezérlőkkel megy.
const HR_PERSONAL_GROUPS = [
  { key: "szemely",  label: "Személyes adatok" },
  { key: "elerheto", label: "Elérhetőség" },
  { key: "okmany",   label: "Okmányok / pénzügy" },
];
const HR_PERSONAL_FIELDS = [
  { key: "birthName",      label: "Születési név",          group: "szemely",  type: "text", wide: true },
  { key: "birthDate",      label: "Születési dátum",        group: "szemely",  type: "date" },
  { key: "birthPlace",     label: "Születési hely",         group: "szemely",  type: "text" },
  { key: "motherName",     label: "Anyja neve",             group: "szemely",  type: "text" },
  { key: "nationality",    label: "Állampolgárság",         group: "szemely",  type: "text" },
  { key: "address",        label: "Lakcím",                 group: "elerheto", type: "text", wide: true },
  { key: "privPhone",      label: "Telefon (magán)",        group: "elerheto", type: "tel" },
  { key: "privEmail",      label: "E-mail (magán)",         group: "elerheto", type: "text" },
  { key: "emergencyName",  label: "Vészhelyzeti kapcsolat", group: "elerheto", type: "text" },
  { key: "emergencyPhone", label: "Vészhelyzeti telefon",   group: "elerheto", type: "tel" },
  { key: "taj",            label: "TAJ szám",               group: "okmany",   type: "text" },
  { key: "taxId",          label: "Adóazonosító jel",       group: "okmany",   type: "text" },
  { key: "idCard",         label: "Személyi ig. szám",      group: "okmany",   type: "text" },
  { key: "bankAccount",    label: "Bankszámlaszám",         group: "okmany",   type: "text", wide: true },
];

// ── Szabadság / betegszabadság keret (HU Mt. egyszerűsített) ─────────────────
const HR_VAC_BASE = 20;       // alapszabadság (munkanap / év)
const HR_SICK_ANNUAL = 15;    // éves betegszabadság (munkanap, Mt. §126)

// ── Távollét-típusok ────────────────────────────────────────────────────────
const ABS_TYPE_META = {
  szabadsag: { key: "szabadsag", label: "Szabadság",     icon: "calendar", accent: "#0d9488", pill: "bg-teal-50 text-teal-700 border-teal-200", paid: true },
  betegseg:  { key: "betegseg",  label: "Betegszabadság",icon: "shield",   accent: "#dc2626", pill: "bg-rose-50 text-rose-700 border-rose-200",  paid: true },
  fizetes_nelkuli: { key: "fizetes_nelkuli", label: "Fizetés nélküli", icon: "user", accent: "#57534e", pill: "bg-stone-100 text-stone-600 border-stone-200", paid: false },
  egyeb:     { key: "egyeb",     label: "Egyéb távollét", icon: "clock",   accent: "#d97706", pill: "bg-amber-50 text-amber-700 border-amber-200", paid: false },
};
const ABS_TYPE_ORDER = ["szabadsag", "betegseg", "fizetes_nelkuli", "egyeb"];

// ── Távollét-kérelem FSM ────────────────────────────────────────────────────
// kért → jóváhagyva → folyamatban → lezárva  (mellék: elutasítva)
const ABS_STATUS = {
  kert:       { label: "Kért",       pill: "bg-amber-50 text-amber-700 border-amber-200",     dot: "bg-amber-500" },
  jovahagyva: { label: "Jóváhagyva", pill: "bg-sky-50 text-sky-700 border-sky-200",           dot: "bg-sky-500" },
  folyamatban:{ label: "Folyamatban",pill: "bg-indigo-50 text-indigo-700 border-indigo-200",  dot: "bg-indigo-500" },
  lezarva:    { label: "Lezárva",    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",dot: "bg-emerald-500" },
  elutasitva: { label: "Elutasítva", pill: "bg-rose-50 text-rose-700 border-rose-200",         dot: "bg-rose-500" },
};
const ABS_FLOW = {
  order: ["kert", "jovahagyva", "folyamatban", "lezarva"],
  states: {
    kert:        { next: ["jovahagyva", "elutasitva"] },
    jovahagyva:  { next: ["folyamatban", "elutasitva"] },
    folyamatban: { next: ["lezarva"] },
    lezarva:     { next: [], terminal: true },
    elutasitva:  { next: ["kert"] },  // újranyitható
  },
};
// a távollét akkor "blokkol" kapacitást, ha jóváhagyott / folyamatban / lezárt
const ABS_BLOCKING = ["jovahagyva", "folyamatban", "lezarva"];

// ── Dolgozói törzs (seed) ───────────────────────────────────────────────────
// today (store) = 2026-04-28. A nevek illeszkednek a Logisztika brigád-tagokhoz
// és a Shop Floor operátorokhoz — EZ a forrás, azok hivatkoznak rá.
const EMPLOYEES_SEED = [
  { id: "emp-nagyj", name: "Nagy János", initials: "NJ", role: "Beépítő vezető / sofőr", dept: "szereles", facilityId: "fac-vac",
    payGrade: "mester", weeklyHours: 40, employment: "full", phone: "+36 30 412 5511", email: "nagy.janos@joinerytech.hu", startedAt: "2019-03-01", active: true, color: "#d97706",
    vacationBase: 22,
    personal: { children: 2, maritalStatus: "hazas", birthName: "Nagy János", birthDate: "1984-07-12", birthPlace: "Vác", motherName: "Kovács Mária", nationality: "magyar", address: "2600 Vác, Petőfi S. u. 4.", taj: "041 215 338", taxId: "8412071234", idCard: "678234KA", bankAccount: "11773027-00921355", emergencyName: "Nagy Júlia (feleség)", emergencyPhone: "+36 30 555 7788" },
    skills: [{ key: "szerel", level: 3 }, { key: "szallit", level: 3 }, { key: "osszeszereles", level: 2 }] },
  { id: "emp-kissa", name: "Kiss András", initials: "KA", role: "Élzáró / CNC operátor", dept: "gyartas", facilityId: "fac-vac",
    payGrade: "szakmunkas", weeklyHours: 40, employment: "full", phone: "+36 30 553 2210", email: "kiss.andras@joinerytech.hu", startedAt: "2021-06-14", active: true, color: "#0d9488",
    skills: [{ key: "elzaras", level: 3 }, { key: "cnc", level: 2 }, { key: "szerel", level: 2 }] },
  { id: "emp-tothk", name: "Tóth Kinga", initials: "TK", role: "Szabász operátor", dept: "gyartas", facilityId: "fac-vac",
    payGrade: "szakmunkas", weeklyHours: 40, employment: "full", phone: "+36 30 221 7788", email: "toth.kinga@joinerytech.hu", startedAt: "2020-09-01", active: true, color: "#0284c7",
    skills: [{ key: "szabas", level: 3 }, { key: "elzaras", level: 2 }, { key: "szerel", level: 1 }] },
  { id: "emp-horvg", name: "Horváth Gábor", initials: "HG", role: "Beépítő szerelő", dept: "szereles", facilityId: "fac-vac",
    payGrade: "szakmunkas", weeklyHours: 40, employment: "full", phone: "+36 30 118 4402", email: "horvath.gabor@joinerytech.hu", startedAt: "2022-02-07", active: true, color: "#7c3aed",
    personal: { children: 1, maritalStatus: "elettars", birthDate: "1991-03-25", birthPlace: "Budapest", motherName: "Tóth Erzsébet", nationality: "magyar", address: "1163 Budapest, Veres P. út 22.", taj: "122 884 901", taxId: "9103251987", emergencyName: "Horváth Anna (élettárs)", emergencyPhone: "+36 20 411 2200" },
    skills: [{ key: "szerel", level: 3 }, { key: "osszeszereles", level: 3 }, { key: "szallit", level: 2 }] },
  { id: "emp-feketep", name: "Fekete Péter", initials: "FP", role: "Felmérő / sofőr", dept: "logisztika", facilityId: "fac-bp",
    payGrade: "szakmunkas", weeklyHours: 40, employment: "full", phone: "+36 30 904 6633", email: "fekete.peter@joinerytech.hu", startedAt: "2023-01-09", active: true, color: "#0284c7",
    skills: [{ key: "felmer", level: 3 }, { key: "szallit", level: 3 }] },
  { id: "emp-horve", name: "Horváth Éva", initials: "HE", role: "CNC operátor", dept: "gyartas", facilityId: "fac-szek",
    payGrade: "szakmunkas", weeklyHours: 32, employment: "part", phone: "+36 30 667 2231", email: "horvath.eva@joinerytech.hu", startedAt: "2022-11-21", active: true, color: "#0d9488",
    skills: [{ key: "cnc", level: 3 }, { key: "szabas", level: 2 }] },
  { id: "emp-szaboa", name: "Szabó Anna", initials: "SA", role: "Értékesítő", dept: "ertekesites", facilityId: "fac-vac",
    payGrade: "mernok", weeklyHours: 40, employment: "full", phone: "+36 30 442 9100", email: "szabo.anna@joinerytech.hu", startedAt: "2020-04-01", active: true, color: "#4f46e5",
    vacationBase: 21,
    personal: { children: 3, maritalStatus: "hazas", birthDate: "1988-11-02", birthPlace: "Szeged", motherName: "Balogh Ilona", nationality: "magyar", address: "2600 Vác, Deákvári fasor 7.", taj: "088 110 552", taxId: "8811021456", emergencyName: "Szabó Gábor (férj)", emergencyPhone: "+36 30 778 9911" },
    skills: [{ key: "ertekesites", level: 3 }, { key: "tervezes", level: 1 }] },
  { id: "emp-kovacsp", name: "Kovács Péter", initials: "KP", role: "Tervező / ügyvezető", dept: "tervezes", facilityId: "fac-vac",
    payGrade: "vezeto", weeklyHours: 40, employment: "full", phone: "+36 30 111 2233", email: "kovacs.peter@joinerytech.hu", startedAt: "2017-01-02", active: true, color: "#7c3aed",
    vacationBase: 25,
    personal: { children: 2, maritalStatus: "hazas", birthDate: "1979-01-30", birthPlace: "Vác", motherName: "Szücs Katalin", nationality: "magyar", address: "2600 Vác, Géza király tér 1.", taj: "033 920 114", taxId: "7901301122", emergencyName: "Kovács Eszter (feleség)", emergencyPhone: "+36 30 222 3344" },
    skills: [{ key: "tervezes", level: 3 }, { key: "ertekesites", level: 2 }] },
  { id: "emp-vargal", name: "Varga László", initials: "VL", role: "Felületkezelő / lakkozó", dept: "gyartas", facilityId: "fac-vac",
    payGrade: "szakmunkas", weeklyHours: 40, employment: "full", phone: "+36 30 778 1245", email: "varga.laszlo@joinerytech.hu", startedAt: "2021-10-04", active: true, color: "#0d9488",
    skills: [{ key: "felulet", level: 3 }, { key: "osszeszereles", level: 2 }] },
  { id: "emp-balogm", name: "Balogh Márk", initials: "BM", role: "Betanított segéd", dept: "gyartas", facilityId: "fac-vac",
    payGrade: "seged", weeklyHours: 40, employment: "full", phone: "+36 30 330 9981", email: "balogh.mark@joinerytech.hu", startedAt: "2024-08-19", active: true, color: "#57534e",
    skills: [{ key: "osszeszereles", level: 1 }, { key: "elzaras", level: 1 }] },
  { id: "emp-nemethz", name: "Németh Zsófia", initials: "NZ", role: "Tervező (CAD)", dept: "tervezes", facilityId: "fac-bp",
    payGrade: "mernok", weeklyHours: 30, employment: "part", phone: "+36 30 552 0043", email: "nemeth.zsofia@joinerytech.hu", startedAt: "2023-05-15", active: true, color: "#7c3aed",
    skills: [{ key: "tervezes", level: 3 }] },
];

// ── Hozzárendelések — projekt/feladat-beosztás (kapacitás-terhelés) ─────────
// Egy hozzárendelés napi `hoursPerDay` órát foglal le egy dolgozótól a [start..end]
// (munkanapokon). source: "project" | "task" | "other". A fuvar-terhelés EBBŐL
// NEM jön — azt a Logisztika crew-beosztásból számítja a HrEngine.
const HR_ASSIGNMENTS_SEED = [
  { id: "asg-1", empId: "emp-tothk",  projectId: "PRJ-2026-014", projectName: "Petőfi u. 12. — Konyha", label: "Korpusz szabászat", start: "2026-04-27", end: "2026-04-30", hoursPerDay: 6, source: "project" },
  { id: "asg-2", empId: "emp-kissa",  projectId: "PRJ-2026-014", projectName: "Petőfi u. 12. — Konyha", label: "Élzárás + fúrás", start: "2026-04-29", end: "2026-05-04", hoursPerDay: 7, source: "project" },
  { id: "asg-3", empId: "emp-horvg",  projectId: "PRJ-2026-013", projectName: "Belváros Café — pultsor", label: "Összeszerelés", start: "2026-04-28", end: "2026-05-01", hoursPerDay: 8, source: "project" },
  { id: "asg-4", empId: "emp-vargal", projectId: "PRJ-2026-014", projectName: "Petőfi u. 12. — Konyha", label: "Lakkozás / felület", start: "2026-05-05", end: "2026-05-07", hoursPerDay: 6, source: "project" },
  { id: "asg-5", empId: "emp-horve",  projectId: "PRJ-2026-013", projectName: "Belváros Café — pultsor", label: "CNC megmunkálás", start: "2026-04-29", end: "2026-04-30", hoursPerDay: 6, source: "project" },
  // TÚLTERHELÉS-demó: Nagy János ugyanazon a napon projekt-beosztást is kap, miközben fuvarban van (SH a Logisztikából)
  { id: "asg-6", empId: "emp-nagyj",  projectId: "PRJ-2026-014", projectName: "Petőfi u. 12. — Konyha", label: "Helyszíni beépítés-előkészítés", start: "2026-04-28", end: "2026-04-28", hoursPerDay: 6, source: "project" },
  { id: "asg-7", empId: "emp-kissa",  projectId: "PRJ-2026-013", projectName: "Belváros Café — pultsor", label: "Bárszekrény élzárás", start: "2026-04-30", end: "2026-05-01", hoursPerDay: 4, source: "project" },
  // KARBANTARTÁS-bekötés: a folyamatban lévő WO-2426-017 (Biesse Rover CNC szerviz) HR-beosztása
  { id: "asg-wo-WO-2426-017", empId: "emp-kissa", projectId: null, projectName: "Karbantartás", label: "Karbantartás: Biesse Rover B", start: "2026-04-28", end: "2026-04-28", hoursPerDay: 5, source: "maintenance" },
];

// ── Távollét-kérelmek (seed) ────────────────────────────────────────────────
const ABSENCES_SEED = [
  { id: "ABS-2426-007", empId: "emp-balogm", type: "szabadsag", start: "2026-05-04", end: "2026-05-08", status: "kert",
    requestedAt: "2026-04-22", reason: "Tavaszi szabadság.", days: 5,
    log: [{ at: "2026-04-22 10:12", text: "Kérelem beadva" }] },
  { id: "ABS-2426-006", empId: "emp-feketep", type: "szabadsag", start: "2026-05-11", end: "2026-05-15", status: "jovahagyva",
    requestedAt: "2026-04-15", approvedBy: "Kovács Péter", approvedAt: "2026-04-16", reason: "Családi program.", days: 5,
    log: [{ at: "2026-04-15 09:00", text: "Kérelem beadva" }, { at: "2026-04-16 14:30", text: "Jóváhagyva — Kovács Péter" }] },
  { id: "ABS-2426-005", empId: "emp-tothk", type: "betegseg", start: "2026-04-28", end: "2026-04-29", status: "folyamatban",
    requestedAt: "2026-04-28", approvedBy: "Kovács Péter", approvedAt: "2026-04-28", reason: "Táppénz — orvosi igazolás.", days: 2,
    log: [{ at: "2026-04-28 07:40", text: "Bejelentve (telefon)" }, { at: "2026-04-28 08:05", text: "Rögzítve, folyamatban" }] },
  { id: "ABS-2426-004", empId: "emp-horve", type: "szabadsag", start: "2026-04-20", end: "2026-04-24", status: "lezarva",
    requestedAt: "2026-04-01", approvedBy: "Kovács Péter", approvedAt: "2026-04-02", reason: "", days: 5,
    log: [{ at: "2026-04-01 11:00", text: "Kérelem beadva" }, { at: "2026-04-02 09:10", text: "Jóváhagyva" }, { at: "2026-04-24 17:00", text: "Lezárva" }] },
  { id: "ABS-2426-003", empId: "emp-balogm", type: "egyeb", start: "2026-05-06", end: "2026-05-06", status: "elutasitva",
    requestedAt: "2026-04-20", reason: "Hatósági ügyintézés.", days: 1, rejectReason: "Ütközik a Petőfi projekt összeszerelési határidejével — kérlek tedd át.",
    log: [{ at: "2026-04-20 13:20", text: "Kérelem beadva" }, { at: "2026-04-21 08:30", text: "Elutasítva — ütközik a határidővel" }] },
];

// ── Munkaóra-napló (időbejegyzés) — projekt tény-bérköltség forrása ─────────
// pushedToCtrl: true → már átküldve a Kontrollingba (ctrlAdjustment "munka").
const HR_TIMELOGS_SEED = [
  { id: "TL-2426-012", empId: "emp-horvg", projectId: "PRJ-2026-013", projectName: "Belváros Café — pultsor", date: "2026-04-27", hours: 8, note: "Háttérszekrény összeszerelés", pushedToCtrl: false },
  { id: "TL-2426-011", empId: "emp-tothk", projectId: "PRJ-2026-014", projectName: "Petőfi u. 12. — Konyha", date: "2026-04-27", hours: 6, note: "Korpusz szabászat", pushedToCtrl: false },
  { id: "TL-2426-010", empId: "emp-vargal", projectId: "PRJ-2026-014", projectName: "Petőfi u. 12. — Konyha", date: "2026-04-24", hours: 5, note: "Felület-előkészítés", pushedToCtrl: true },
];

// ──────────────────────────────────────────────────────────────────────────
// HrEngine — tiszta számítások (kapacitás, terhelés, túlterhelés, FSM, abszencia)
// ──────────────────────────────────────────────────────────────────────────
const HR_DAY_MS = 86400000;
const HrEngine = {
  parse(d) { const [y, m, day] = String(d).split("-").map(Number); return new Date(y, (m || 1) - 1, day || 1); },
  fmt(dt) { return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; },
  isWorkday(dt) { const d = dt.getDay(); return d >= 1 && d <= 5; },  // H–P
  inRange(dateStr, start, end) { return dateStr >= start && dateStr <= (end || start); },

  // napi kapacitás (óra) — heti / 5 munkanap
  dayCapacity(emp) { return emp ? Math.round((emp.weeklyHours || 40) / 5 * 10) / 10 : 0; },

  // payGrade-ből vagy emp.hourlyCost-ból az óradíj
  rate(emp) {
    if (!emp) return 0;
    if (emp.hourlyCost != null) return emp.hourlyCost;
    return (HR_PAY_GRADES[emp.payGrade] || {}).rate || 0;
  },

  // van-e blokkoló (jóváhagyott/folyamatban/lezárt) távollét az adott napon
  absenceOn(state, empId, dateStr) {
    return (state.absences || []).find((a) => a.empId === empId && ABS_BLOCKING.includes(a.status) && this.inRange(dateStr, a.start, a.end)) || null;
  },

  // fuvar-terhelés: a dolgozó valamely crew tagja, amely fuvarban van aznap
  shipmentHoursOn(state, empId, dateStr) {
    const crews = (state.crews || []).filter((c) => (c.memberIds || []).includes(empId));
    if (!crews.length) return { hours: 0, ships: [] };
    const ids = crews.map((c) => c.id);
    const ships = (state.shipments || []).filter((s) => s.date === dateStr && ids.includes(s.crewId) && !["torolve"].includes(s.status));
    const hrs = ships.reduce((a, s) => {
      const w = this._win(s.windowStart, s.windowEnd);
      return a + (w || 8);
    }, 0);
    return { hours: hrs, ships };
  },
  _win(a, b) {
    const m = (t) => { if (!t) return null; const [h, mm] = String(t).split(":").map(Number); return h * 60 + (mm || 0); };
    const a1 = m(a), b1 = m(b);
    if (a1 == null || b1 == null) return null;
    return Math.max(0, Math.round((b1 - a1) / 60 * 10) / 10);
  },

  // projekt/feladat hozzárendelés-órák az adott napon
  assignmentHoursOn(state, empId, dateStr) {
    const list = (state.assignments || []).filter((a) => a.empId === empId && this.inRange(dateStr, a.start, a.end));
    const hrs = list.reduce((s, a) => s + (Number(a.hoursPerDay) || 0), 0);
    return { hours: hrs, list };
  },

  // EGY dolgozó EGY napjának terhelése
  dayLoad(state, empId, dateStr) {
    const emp = (state.employees || []).find((e) => e.id === empId);
    const dt = this.parse(dateStr);
    const workday = this.isWorkday(dt);
    const abs = this.absenceOn(state, empId, dateStr);
    const cap = (!workday || abs) ? 0 : this.dayCapacity(emp);
    if (abs) return { capacity: 0, load: 0, free: 0, over: false, absence: abs, workday, ships: [], assignments: [] };
    const sh = this.shipmentHoursOn(state, empId, dateStr);
    const asg = this.assignmentHoursOn(state, empId, dateStr);
    const load = sh.hours + asg.hours;
    return { capacity: cap, load, free: Math.max(0, cap - load), over: load > cap + 0.01 && workday, absence: null, workday, ships: sh.ships, assignments: asg.list };
  },

  // egy dolgozó heti kapacitás-összegzése egy adott hét hétfőjétől (5 munkanap)
  weekSummary(state, empId, mondayStr) {
    const mon = this.parse(mondayStr);
    let cap = 0, load = 0, overDays = 0, absDays = 0;
    for (let i = 0; i < 5; i++) {
      const ds = this.fmt(new Date(mon.getTime() + i * HR_DAY_MS));
      const d = this.dayLoad(state, empId, ds);
      cap += d.capacity; load += d.load;
      if (d.over) overDays++;
      if (d.absence) absDays++;
    }
    return { capacity: cap, load, free: Math.max(0, cap - load), util: cap > 0 ? load / cap : 0, overDays, absDays };
  },

  // a hét hétfője egy dátumhoz
  mondayOf(dateStr) {
    const dt = this.parse(dateStr);
    const dow = dt.getDay();           // 0=vas
    const diff = (dow === 0 ? -6 : 1 - dow);
    return this.fmt(new Date(dt.getTime() + diff * HR_DAY_MS));
  },

  // ── Távollét-FSM ──────────────────────────────────────────────────────────
  absCanGo(abs, to) {
    const st = (ABS_FLOW.states[abs.status] || {}).next || [];
    return st.includes(to);
  },
  absNext(abs) { return ((ABS_FLOW.states[abs.status] || {}).next || []).slice(); },
  absIsTerminal(abs) { return !!((ABS_FLOW.states[abs.status] || {}).terminal); },
  // munkanapok száma egy tartományban (H–P)
  workdaysBetween(start, end) {
    const a = this.parse(start), b = this.parse(end || start);
    let n = 0;
    for (let t = a.getTime(); t <= b.getTime(); t += HR_DAY_MS) {
      if (this.isWorkday(new Date(t))) n++;
    }
    return n;
  },

  // ── Szabadság / betegszabadság egyenleg (SZÁMÍTOTT, soha ne tárold) ────────
  yearOf(d) { return String(d || "").slice(0, 4); },
  // gyermek-pótszabadság (Mt. §118): 1 gyermek → +2, 2 → +4, 3 vagy több → +7 munkanap
  childVacationDays(children) {
    const c = Number(children) || 0;
    if (c <= 0) return 0;
    if (c === 1) return 2;
    if (c === 2) return 4;
    return 7;
  },
  empChildren(emp) { return Number((emp && emp.personal && emp.personal.children) != null ? emp.personal.children : (emp && emp.children) || 0) || 0; },
  // éves szabadság-keret = alap (emp.vacationBase v. 20) + gyermek-pótszabadság
  vacationEntitlement(emp) {
    if (!emp) return 0;
    const base = emp.vacationBase != null ? Number(emp.vacationBase) : HR_VAC_BASE;
    return base + this.childVacationDays(this.empChildren(emp));
  },
  // egy típusú, blokkoló (jóváhagyott/folyamatban/lezárt) távollét munkanapjai az évben
  absDaysUsed(state, empId, type, year) {
    return (state.absences || [])
      .filter((a) => a.empId === empId && a.type === type && ABS_BLOCKING.includes(a.status) && this.yearOf(a.start) === String(year))
      .reduce((s, a) => s + (Number(a.days) || 0), 0);
  },
  vacationBalance(state, emp, year) {
    if (!emp) return { entitlement: 0, used: 0, remaining: 0, base: HR_VAC_BASE, childExtra: 0 };
    const base = emp.vacationBase != null ? Number(emp.vacationBase) : HR_VAC_BASE;
    const childExtra = this.childVacationDays(this.empChildren(emp));
    const ent = base + childExtra;
    const used = this.absDaysUsed(state, emp.id, "szabadsag", year);
    return { entitlement: ent, base, childExtra, used, remaining: Math.max(0, ent - used) };
  },
  sickBalance(state, emp, year) {
    const used = emp ? this.absDaysUsed(state, emp.id, "betegseg", year) : 0;
    return { annual: HR_SICK_ANNUAL, used, remaining: Math.max(0, HR_SICK_ANNUAL - used) };
  },
};

Object.assign(window, {
  HR_DEPTS, HR_DEPT_ORDER, HR_SKILLS, HR_SKILL_ORDER, HR_SKILL_LEVELS,
  HR_PAY_GRADES, HR_PAY_ORDER, ABS_TYPE_META, ABS_TYPE_ORDER,
  HR_MARITAL, HR_MARITAL_ORDER, HR_PERSONAL_FIELDS, HR_PERSONAL_GROUPS,
  HR_VAC_BASE, HR_SICK_ANNUAL,
  ABS_STATUS, ABS_FLOW, ABS_BLOCKING,
  EMPLOYEES_SEED, HR_ASSIGNMENTS_SEED, ABSENCES_SEED, HR_TIMELOGS_SEED,
  HrEngine,
});
