// ─────────────────────────────────────────────────────────────────
// data-finance.js — PÉNZÜGY világ adatmodellje
//   • Kimenő (vevői) számlák  +  Bejövő (szállítói) számlák  →  egy `finInvoices[]`
//   • Kifizetések / pénzmozgások  →  `finPayments[]`  (részfizetés-képes)
//   FSM (kimenő):  draft → issued → partial → paid   (mellék: overdue [SZÁMÍTOTT], void)
//   Számla-fajták: normal (sima) · advance (előleg-számla) · proforma (díjbekérő)
//   Pénznem: HUF / EUR (deviza); EUR a `fxRate`-tel HUF-ra konvertálódik az áttekintőn.
//
//   A pénzügyi műveletek (kiállítás / kifizetés / sztornó) a `finance.manage` joghoz kötöttek.
// ─────────────────────────────────────────────────────────────────

// "Ma" — a teljes app szimulált jelenideje (egyezik az app-store today-jával).
const FIN_TODAY = "2026-04-28";

// ── Státusz-tónusok (a tárolt FSM-státuszhoz + a számított „overdue"-hoz) ────────────
const FIN_INV_TONE = {
  draft:    { bg: "bg-stone-100",   fg: "text-stone-600",   dot: "bg-stone-400",   label: "Piszkozat" },
  issued:   { bg: "bg-sky-50",      fg: "text-sky-700",     dot: "bg-sky-500",     label: "Kiállítva" },
  partial:  { bg: "bg-amber-50",    fg: "text-amber-700",   dot: "bg-amber-500",   label: "Részben fizetve" },
  paid:     { bg: "bg-emerald-50",  fg: "text-emerald-700", dot: "bg-emerald-500", label: "Fizetve" },
  overdue:  { bg: "bg-rose-50",     fg: "text-rose-700",    dot: "bg-rose-500",    label: "Lejárt" },
  void:     { bg: "bg-stone-50",    fg: "text-stone-400",   dot: "bg-stone-300",   label: "Sztornó" },
};

// Engedélyezett FSM-átmenetek (a kézi műveletekhez; a partial/paid a kifizetésekből SZÁMÍTÓDIK)
const FIN_INV_FLOW = {
  draft:   ["issued", "void"],
  issued:  ["partial", "paid", "void"],
  partial: ["paid", "void"],
  paid:    [],
  void:    [],
};

// Számla-fajták
const FIN_KIND_META = {
  normal:   { label: "Számla",       short: "Számla",     tone: "bg-stone-100 text-stone-700",  vatBooked: true },
  advance:  { label: "Előleg-számla", short: "Előleg",    tone: "bg-violet-100 text-violet-700", vatBooked: true },
  proforma: { label: "Díjbekérő",    short: "Díjbekérő",  tone: "bg-teal-100 text-teal-700",     vatBooked: false },
};

// Fizetési módok
const FIN_PAY_METHOD = {
  bank: { label: "Banki átutalás", icon: "external", tone: "bg-sky-50 text-sky-700" },
  cash: { label: "Készpénz",       icon: "receipt",  tone: "bg-emerald-50 text-emerald-700" },
  card: { label: "Bankkártya",     icon: "cpu",      tone: "bg-indigo-50 text-indigo-700" },
};

// ── KIMENŐ (vevői) számlák — amit MI állítunk ki ────────────────────────────────────
// dir:"out"  → a kifizetés pénz BE (bevétel / kintlévőség).
const FIN_INVOICES_OUT = [
  // ── ÜGYFÉL-PORTÁL demó (Nagy Anna / Petőfi u. 12.) — előleg fizetve · részszámla LEJÁRT · díjbekérő ──
  {
    id: "SZ-2426-0060", dir: "out", kind: "advance", party: "Nagy Anna", orderRef: "JT-2426-0184",
    status: "paid", issueDate: "2026-04-18", dueDate: "2026-04-25", currency: "HUF",
    issuer: "Szabó Anna", note: "Gyártási előleg (30%) — Petőfi u. 12. konyha + nappali.",
    lines: [ { name: "Gyártási előleg (30%) — Petőfi u. 12.", qty: 1, unit: "alk.", unitPrice: 810000, vat: 27 } ],
  },
  {
    // LEJÁRT részszámla — a portál „Fizetés" + lejárt-kiemelés demója
    id: "SZ-2426-0061", dir: "out", kind: "normal", party: "Nagy Anna", orderRef: "JT-2426-0184",
    status: "issued", issueDate: "2026-04-16", dueDate: "2026-04-24", currency: "HUF",
    issuer: "Szabó Anna", note: "Gyártáskezdés — részszámla (40%).",
    lines: [ { name: "Gyártáskezdés — részszámla (40%) — Petőfi u. 12.", qty: 1, unit: "alk.", unitPrice: 1080000, vat: 27 } ],
  },
  {
    // Díjbekérő (proforma) — „letöltés" + fizetés demó
    id: "DB-2426-010", dir: "out", kind: "proforma", party: "Nagy Anna", orderRef: "JT-2426-0184",
    status: "issued", issueDate: "2026-04-22", dueDate: "2026-05-06", currency: "HUF",
    issuer: "Szabó Anna", note: "Helyszíni felmérés díjbekérő.",
    lines: [ { name: "Helyszíni felmérés és kiszállás", qty: 1, unit: "alk.", unitPrice: 45000, vat: 27 } ],
  },
  {
    id: "SZ-2426-0042", dir: "out", kind: "normal", party: "Bognár Bútor Kft.", orderRef: "JT-2426-0184",
    status: "issued", issueDate: "2026-04-20", dueDate: "2026-05-04", currency: "HUF",
    issuer: "Szabó Anna",
    lines: [
      { name: "Konyhabútor alsó sor (6 elem)", qty: 6, unit: "db", unitPrice: 185000, vat: 27 },
      { name: "Konyhabútor felső sor (8 elem)", qty: 8, unit: "db", unitPrice: 140000, vat: 27 },
      { name: "Szerelés, helyszíni beépítés", qty: 1, unit: "alk.", unitPrice: 320000, vat: 27 },
    ],
  },
  {
    // Előleg-számla — Doorstar nagy rendelés (JT-2426-0182, 12,4 M) 30% előlege, kifizetve
    id: "SZ-2426-0041", dir: "out", kind: "advance", party: "Doorstar Hungary Zrt.", orderRef: "JT-2426-0182",
    status: "issued", issueDate: "2026-04-15", dueDate: "2026-04-29", currency: "HUF",
    issuer: "Kovács Péter", note: "30% gyártási előleg a 12,4 M Ft-os ajtó-rendelésre.",
    lines: [
      { name: "Gyártási előleg (30%) — JT-2426-0182", qty: 1, unit: "alk.", unitPrice: 2929134, vat: 27 },
    ],
  },
  {
    // LEJÁRT — Hegyi, kiállítva, fizetési határidő letelt, nincs fizetés
    id: "SZ-2426-0039", dir: "out", kind: "normal", party: "Hegyi Lakberendezés", orderRef: "JT-2426-0180",
    status: "issued", issueDate: "2026-04-09", dueDate: "2026-04-23", currency: "HUF",
    issuer: "Kovács Péter",
    lines: [
      { name: "Gardrób szekrény-sor (egyedi)", qty: 1, unit: "alk.", unitPrice: 1685000, vat: 27 },
    ],
  },
  {
    // Részben fizetve + LEJÁRT — Vella
    id: "SZ-2426-0038", dir: "out", kind: "normal", party: "Vella Interior Design", orderRef: "JT-2426-0178",
    status: "partial", issueDate: "2026-04-12", dueDate: "2026-04-26", currency: "HUF",
    issuer: "Szabó Anna",
    lines: [
      { name: "Beépített nappali bútor", qty: 1, unit: "alk.", unitPrice: 3000000, vat: 27 },
    ],
  },
  {
    // Devizás díjbekérő (EUR) — proforma, kiküldve, fizetésre vár
    id: "DB-2426-007", dir: "out", kind: "proforma", party: "Doorstar Hungary Zrt.", orderRef: "JT-2426-0177",
    status: "issued", issueDate: "2026-04-22", dueDate: "2026-05-06", currency: "EUR", fxRate: 392,
    issuer: "Kovács Péter", note: "Export szállítás — díjbekérő EUR-ban.",
    lines: [
      { name: "Beltéri ajtó-csomag (28 db) — export", qty: 28, unit: "db", unitPrice: 640, vat: 0 },
    ],
  },
  {
    // Teljesen fizetve — Tóth
    id: "SZ-2426-0036", dir: "out", kind: "normal", party: "Tóth Konyha & Társa", orderRef: "JT-2426-0176",
    status: "paid", issueDate: "2026-04-05", dueDate: "2026-04-19", currency: "HUF",
    issuer: "Szabó Anna",
    lines: [
      { name: "Konyhabútor alsó elem (3 db)", qty: 3, unit: "db", unitPrice: 185000, vat: 27 },
      { name: "Hettich fiókcsúszó beépítés", qty: 1, unit: "alk.", unitPrice: 145000, vat: 27 },
    ],
  },
  {
    // Piszkozat — Várdai (JT-2426-0183 kész, számla még nincs kiállítva)
    id: "SZ-2426-0043", dir: "out", kind: "normal", party: "Várdai Konyhastúdió", orderRef: "JT-2426-0183",
    status: "draft", issueDate: "2026-04-27", dueDate: "2026-05-11", currency: "HUF",
    issuer: "Szabó Anna",
    lines: [
      { name: "Konyhastúdió bemutató bútor", qty: 1, unit: "alk.", unitPrice: 1535000, vat: 27 },
    ],
  },
  {
    // Sztornózott számla (hibás kiállítás)
    id: "SZ-2426-0035", dir: "out", kind: "normal", party: "Erdei Műbútor", orderRef: "JT-2426-0175",
    status: "void", issueDate: "2026-04-03", dueDate: "2026-04-17", currency: "HUF",
    issuer: "Kovács Péter", voidReason: "Hibás vevői adatok — új számla került kiállításra (SZ-2426-0037).",
    lines: [
      { name: "Egyedi műbútor", qty: 1, unit: "alk.", unitPrice: 598000, vat: 27 },
    ],
  },
];

// ── BEJÖVŐ (szállítói) számlák — a Beszerzésből ide gyűjtve ──────────────────────────
// dir:"in"  → a kifizetés pénz KI (kötelezettség / fizetendő).
const FIN_INVOICES_IN = [
  {
    // BESZÁLLÍTÓ NYÚJTOTTA BE a portálon (4.12) — befogadásra vár (draft)
    id: "SINV-2426-045", dir: "in", kind: "normal", party: "Falco Sopron Zrt.", orderRef: "PO-2426-094",
    extNo: "FA-26-2231", status: "draft", issueDate: "2026-04-26", dueDate: "2026-05-26", currency: "HUF",
    issuer: "Falco Sopron Zrt.", submittedVia: "supplier", submittedAt: "2026-04-26",
    note: "Portálon benyújtott számla — befogadásra vár.",
    lines: [ { name: "Tölgy 22mm bútorlap", qty: 20, unit: "tábla", unitPrice: 32100, vat: 27 } ],
  },
  {
    id: "SINV-2426-044", dir: "in", kind: "normal", party: "Egger Faipari Kft.", orderRef: "PO-2426-091",
    extNo: "EG-2026-3391", status: "issued", issueDate: "2026-04-23", dueDate: "2026-05-23", currency: "HUF",
    issuer: "Tóth Kinga",
    lines: [ { name: "Tölgy 22mm tábla", qty: 30, unit: "tábla", unitPrice: 31800, vat: 27 } ],
  },
  {
    id: "SINV-2426-043", dir: "in", kind: "normal", party: "Blum Hungária", orderRef: "PO-2426-090",
    extNo: "BL-26-00781", status: "issued", issueDate: "2026-04-22", dueDate: "2026-05-06", currency: "EUR", fxRate: 392,
    issuer: "Szabó Anna",
    lines: [ { name: "Vasalat Blum CLIP top", qty: 200, unit: "db", unitPrice: 3.15, vat: 27 } ],
  },
  {
    // LEJÁRT fizetendő — Falco
    id: "SINV-2426-041", dir: "in", kind: "normal", party: "Falco Sopron Zrt.", orderRef: "PO-2426-088",
    extNo: "FA-26-2204", status: "issued", issueDate: "2026-04-06", dueDate: "2026-04-20", currency: "HUF",
    issuer: "Nagy János",
    lines: [ { name: "Bükk 18mm tábla", qty: 40, unit: "tábla", unitPrice: 17900, vat: 27 } ],
  },
  {
    // Teljesen kifizetve — Kronospan
    id: "SINV-2426-040", dir: "in", kind: "normal", party: "Kronospan HU Zrt.", orderRef: "PO-2426-089",
    extNo: "KR-2026-1188", status: "paid", issueDate: "2026-04-04", dueDate: "2026-04-18", currency: "HUF",
    issuer: "Tóth Kinga",
    lines: [ { name: "MDF 19mm tábla", qty: 50, unit: "tábla", unitPrice: 9600, vat: 27 } ],
  },
  {
    // Részben fizetve — Hettich
    id: "SINV-2426-039", dir: "in", kind: "normal", party: "Hettich Hungary", orderRef: "PO-2426-086",
    extNo: "HE-2026-0912", status: "partial", issueDate: "2026-04-11", dueDate: "2026-05-11", currency: "HUF",
    issuer: "Tóth Kinga",
    lines: [ { name: "Hettich fiókcsúszó 500mm", qty: 120, unit: "db", unitPrice: 1180, vat: 27 } ],
  },
];

// ── Kifizetések / pénzmozgások (számlánként több is lehet → részfizetés) ──────────────
// amount mindig a SZÁMLA pénznemében. dir öröklődik a számlától (out → pénz be, in → pénz ki).
const FIN_PAYMENTS = [
  // Ügyfél-portál demó — Nagy Anna előlege kifizetve (online kártya)
  { id: "PMT-0009", invoiceId: "SZ-2426-0060", amount: 1028700, method: "card", date: "2026-04-19", ref: "ONLINE-7K2P", who: "Nagy Anna", note: "Online előleg-fizetés (portál)" },
  // Kimenő számlák befizetései
  { id: "PMT-0008", invoiceId: "SZ-2426-0041", amount: 2929134, method: "bank", date: "2026-04-22", ref: "GIRO-9921", who: "Pénzügy", note: "Doorstar előleg — teljes" },
  { id: "PMT-0007", invoiceId: "SZ-2426-0038", amount: 1500000, method: "bank", date: "2026-04-20", ref: "GIRO-9874", who: "Pénzügy", note: "Vella — részfizetés 1/2" },
  { id: "PMT-0006", invoiceId: "SZ-2426-0036", amount: 889000,  method: "bank", date: "2026-04-17", ref: "GIRO-9810", who: "Pénzügy", note: "Tóth — teljes (1/1)" },
  // Bejövő számlák kifizetései
  { id: "PMT-0005", invoiceId: "SINV-2426-040", amount: 609600, method: "bank", date: "2026-04-16", ref: "UTAL-2261", who: "Pénzügy", note: "Kronospan — teljes" },
  { id: "PMT-0004", invoiceId: "SINV-2426-039", amount: 90000,  method: "bank", date: "2026-04-18", ref: "UTAL-2280", who: "Pénzügy", note: "Hettich — részfizetés" },
];

// ── Helperek (számla-matek) — a tárolt számla-objektumon dolgoznak ───────────────────
function finNet(inv)   { return (inv.lines || []).reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0); }
function finVat(inv)   { return (inv.lines || []).reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0) * ((Number(l.vat) || 0) / 100), 0); }
function finGross(inv) { return finNet(inv) + finVat(inv); }
// EUR → HUF aggregáláshoz (áttekintő)
function finToHuf(amount, inv) { return inv.currency === "EUR" ? amount * (inv.fxRate || 390) : amount; }

Object.assign(window, {
  FIN_TODAY, FIN_INV_TONE, FIN_INV_FLOW, FIN_KIND_META, FIN_PAY_METHOD,
  FIN_INVOICES_OUT, FIN_INVOICES_IN, FIN_PAYMENTS,
  finNet, finVat, finGross, finToHuf,
});
