// ──────────────────────────────────────────────────────────────────────────
// data-trade.js — KERESKEDELEM világ adatai + ár-/árrés-motor.
//
//   A 3. szektor (kereskedelem) logikája: nem önköltség×szorzó gyártói modell,
//   hanem BESZERZÉSI ÁR → MARKUP → ELADÁSI ÁR, kategóriánként.
//     • markup  = eladási / beszerzési  (a beszerzési árra vetített szorzó)
//     • árrés % = haszon / eladási ár    (= 1 − 1/markup)
//   A kettő ugyanaz az érem két oldala — a UI mindkettőt mutatja, hogy a
//   "markup vs. árrés" keverés-hiba ne fordulhasson elő.
//
//   Lapszabászoknak (C1), vasalat-boltoknak (C2) és design-üzleteknek készült.
//   Egyetlen igazságforrás: a store (window.sim) — itt csak a SEED + tiszta
//   számoló helperek (window.TradeEngine) élnek.
// ──────────────────────────────────────────────────────────────────────────

// Kereskedelmi kategóriák — kategóriánkénti alap-markup (iparági sávok).
// sávok (markup, beszerzésre):
//   Alapanyag (lap, él) 1,2–1,35×  ·  Szerelvény/vas 1,35–1,65×
//   Bútor (standard) 1,55–2,0×     ·  Design/prémium 2,0–3,3×
//   Dekor/kiegészítő 2,0–5,0×
const TRADE_CATEGORIES = [
  { id: "lap",    name: "Lapanyag",            short: "Lap",    icon: "layers",  color: "stone",   markup: 1.30, range: [1.20, 1.35], note: "Bútorlap, MDF, HDF — alapanyag, gyors forgás, alacsony árrés." },
  { id: "el",     name: "Élzáró",              short: "Él",     icon: "ruler",   color: "amber",   markup: 1.30, range: [1.20, 1.40], note: "ABS / lézer élfólia, fm-ben." },
  { id: "vas",    name: "Vasalat / szerelvény", short: "Vas",   icon: "wrench",  color: "indigo",  markup: 1.55, range: [1.35, 1.65], note: "Pánt, fióksín, fogantyú, láb — közepes árrés." },
  { id: "butor",  name: "Bútor (standard)",    short: "Bútor",  icon: "box",     color: "teal",    markup: 1.75, range: [1.55, 2.00], note: "Kész bútor, lassabb forgás, magasabb árrés." },
  { id: "design", name: "Design / prémium",    short: "Design", icon: "sparkle", color: "violet",  markup: 2.60, range: [2.00, 3.30], note: "Márka, exkluzivitás — érték-alapú árazás." },
  { id: "dekor",  name: "Dekor / kiegészítő",  short: "Dekor",  icon: "drop",    color: "rose",    markup: 3.00, range: [2.00, 5.00], note: "Kis tételár, magas árrés, impulzusvásárlás." },
];

// Bolti katalógus + készlet. price MINDIG számított (beszerzés × markup);
// a markup a kategóriából jön, tételenként felülírható (markup mező).
const TRADE_PRODUCTS = [
  // ── Lapanyag ──
  { id: "TP-lap-01", sku: "EG-W1000-18", name: "Egger W1000 fehér 18mm",      catId: "lap",   unit: "tábla", purchase: 8200,  onHand: 38,  min: 20, markup: null },
  { id: "TP-lap-02", sku: "EG-H1334-18", name: "Egger H1334 tölgy 18mm",      catId: "lap",   unit: "tábla", purchase: 11800, onHand: 12,  min: 15, markup: null },
  { id: "TP-lap-03", sku: "MDF-018",     name: "MDF nyers 18mm",              catId: "lap",   unit: "tábla", purchase: 7600,  onHand: 64,  min: 30, markup: null },
  { id: "TP-lap-04", sku: "BK-LAP-18",   name: "Bükk bútorlap 18mm",          catId: "lap",   unit: "tábla", purchase: 14200, onHand: 6,   min: 10, markup: 1.35 },
  { id: "TP-lap-05", sku: "HDF-003-W",   name: "HDF hátlap 3mm fehér",        catId: "lap",   unit: "tábla", purchase: 2200,  onHand: 120, min: 40, markup: null },
  // ── Élzáró ──
  { id: "TP-el-01",  sku: "ABS-22-TL",   name: "ABS élfólia 22mm tölgy",      catId: "el",    unit: "fm",    purchase: 180,   onHand: 480, min: 200, markup: null },
  { id: "TP-el-02",  sku: "ABS-22-W",    name: "ABS élfólia 22mm fehér",      catId: "el",    unit: "fm",    purchase: 120,   onHand: 600, min: 200, markup: null },
  { id: "TP-el-03",  sku: "ABS-2-ANT",   name: "ABS élfólia 2mm antracit",    catId: "el",    unit: "fm",    purchase: 240,   onHand: 90,  min: 150, markup: null },
  // ── Vasalat ──
  { id: "TP-vas-01", sku: "BL-CLIP-T",   name: "Blum CLIP top csukópánt",     catId: "vas",   unit: "db",    purchase: 980,   onHand: 220, min: 100, markup: null },
  { id: "TP-vas-02", sku: "BL-TBX-SET",  name: "Blum Tandembox fiók szett",   catId: "vas",   unit: "szett", purchase: 5400,  onHand: 8,   min: 20,  markup: null },
  { id: "TP-vas-03", sku: "HT-RL-192",   name: "Hettich reling fogantyú 192", catId: "vas",   unit: "db",    purchase: 720,   onHand: 140, min: 60,  markup: null },
  { id: "TP-vas-04", sku: "GTV-GR-100",  name: "GTV gázrugó 100N",            catId: "vas",   unit: "db",    purchase: 640,   onHand: 80,  min: 50,  markup: null },
  { id: "TP-vas-05", sku: "LAB-100",     name: "Állítható bútorláb 100mm",    catId: "vas",   unit: "db",    purchase: 95,    onHand: 1400,min: 400, markup: null },
  // ── Bútor ──
  { id: "TP-but-01", sku: "MOSDO-60",    name: "Mosdószekrény 60 (kész)",     catId: "butor", unit: "db",    purchase: 38000, onHand: 5,   min: 3,  markup: null },
  { id: "TP-but-02", sku: "CIPO-3R",     name: "Cipősszekrény 3 rekesz",      catId: "butor", unit: "db",    purchase: 52000, onHand: 4,   min: 2,  markup: null },
  { id: "TP-but-03", sku: "POLC-MOD",    name: "Polcrendszer modul",          catId: "butor", unit: "db",    purchase: 18500, onHand: 11,  min: 4,  markup: null },
  // ── Design ──
  { id: "TP-des-01", sku: "SZEK-TL",     name: "Design étkezőszék tölgy",     catId: "design",unit: "db",    purchase: 28000, onHand: 14,  min: 6,  markup: null },
  { id: "TP-des-02", sku: "BAR-BOR",     name: "Bárszék bőr/fém",             catId: "design",unit: "db",    purchase: 34000, onHand: 8,   min: 4,  markup: null },
  { id: "TP-des-03", sku: "POLC-DIO",    name: "Design fali polc dió",        catId: "design",unit: "db",    purchase: 21000, onHand: 6,   min: 3,  markup: 2.80 },
  // ── Dekor ──
  { id: "TP-dek-01", sku: "LED-5M-WW",   name: "LED szalag 5m meleg fehér",   catId: "dekor", unit: "db",    purchase: 3200,  onHand: 40,  min: 15, markup: null },
  { id: "TP-dek-02", sku: "AKAS-REZ-4",  name: "Fali akasztó réz (4 db)",     catId: "dekor", unit: "csomag",purchase: 1900,  onHand: 26,  min: 10, markup: null },
  { id: "TP-dek-03", sku: "VAZA-SET",    name: "Üveg vázakészlet",            catId: "dekor", unit: "szett", purchase: 4200,  onHand: 18,  min: 8,  markup: null },
];

// Lapszabászat / megmunkálás szolgáltatás-díjak.
const TRADE_SERVICES = [
  { id: "cut",      name: "Szabás (vágás)",      unit: "vágás",   rate: 95,   kind: "cut" },
  { id: "cut_m",    name: "Méretre vágás",       unit: "fm",      rate: 180,  kind: "cut" },
  { id: "edge1",    name: "Élzárás 1mm",         unit: "fm",      rate: 320,  kind: "edge" },
  { id: "edge2",    name: "Élzárás 2mm",         unit: "fm",      rate: 420,  kind: "edge" },
  { id: "drill",    name: "Furat (fúrás)",       unit: "furat",   rate: 75,   kind: "drill" },
  { id: "cnc",      name: "CNC megmunkálás",     unit: "perc",    rate: 280,  kind: "cnc" },
  { id: "delivery", name: "Kiszállítás",         unit: "alkalom", rate: 6500, kind: "logi" },
];

const TRADE_PAYMENTS = ["Készpénz", "Bankkártya", "Átutalás"];
const TRADE_VAT = 0.27;

// ── Lapszabászat: paraméteres SZOLGÁLTATÁS-árazás ───────────────────────────
//   Szabás kétféleképp: fix tábla-ár VAGY kalkulált folyóméter (Ft/fm × hossz).
//   Élzárás: alap Ft/fm, amit a technológiai paraméterek SZORZÓKÉNT módosítanak
//     (vastagság × szélesség × ragasztás). Minden kombinációhoz konkrét Ft/fm is
//     megadható (override) — ha nincs, a szorzós alapból számolódik.
//   Ez az ár a LAPANYAG eladási árához ADÓDIK az árajánlatban.
const TRADE_SERVICE_RATES_SEED = {
  cutFixed: 850,   // Ft / tábla (átalány szabás)
  cutMeter: 180,   // Ft / folyóméter (kalkulált vágáshossz)
  edgeBase: 240,   // Ft / fm — élzárás alapdíj (a szorzók erre hatnak)
  edgeThickness: [
    { id: "t08", name: "0,8 mm", mult: 1.00 },
    { id: "t2",  name: "2 mm",   mult: 1.35 },
  ],
  edgeWidth: [
    { id: "w23", name: "23 mm", mult: 1.00 },
    { id: "w28", name: "28 mm", mult: 1.15 },
    { id: "w42", name: "42 mm", mult: 1.45 },
  ],
  edgeGlue: [
    { id: "trad", name: "Hagyományos (EVA)", mult: 1.00 },
    { id: "pu",   name: "PU",                mult: 1.40 },
  ],
  // konkrét Ft/fm felülírások — kulcs: "<thickId>·<widthId>·<glueId>"
  edgeOverrides: {},
  // egyéb megmunkálás-díjak
  extras: [
    { id: "drill", name: "Furat (fúrás)",   unit: "furat",   rate: 75 },
    { id: "cnc",   name: "CNC megmunkálás", unit: "perc",    rate: 280 },
    { id: "delivery", name: "Kiszállítás",  unit: "alkalom", rate: 6500 },
  ],
};

// Pultos eladások (seed) — a dashboard ezekből számol napi forgalmat/árrést.
// net = nettó eladás, profit = net − beszerzés. (A számok kerekítve, demó.)
const TRADE_SALES = [
  { id: "PS-2604-018", date: "2026-04-28", time: "09:12", cashier: "Varga T.", customer: "Eseti vevő", payment: "Bankkártya",
    lines: [ { name: "Blum CLIP top csukópánt", qty: 12, unit: "db", unitPrice: 1520, unitCost: 980 },
             { name: "Hettich reling fogantyú 192", qty: 6, unit: "db", unitPrice: 1120, unitCost: 720 } ],
    services: [], net: 24960, profit: 8400 },
  { id: "PS-2604-017", date: "2026-04-28", time: "08:40", cashier: "Varga T.", customer: "Kerekes Asztalos Bt.", payment: "Átutalás",
    lines: [ { name: "Egger W1000 fehér 18mm", qty: 8, unit: "tábla", unitPrice: 10660, unitCost: 8200 },
             { name: "ABS élfólia 22mm fehér", qty: 40, unit: "fm", unitPrice: 156, unitCost: 120 } ],
    services: [ { name: "Méretre vágás", qty: 18, unit: "fm", rate: 180 } ], net: 95560, profit: 22920 },
  { id: "PS-2604-016", date: "2026-04-28", time: "08:15", cashier: "Kis A.", customer: "Eseti vevő", payment: "Készpénz",
    lines: [ { name: "LED szalag 5m meleg fehér", qty: 2, unit: "db", unitPrice: 9600, unitCost: 3200 } ],
    services: [], net: 19200, profit: 12800 },
  { id: "PS-2604-012", date: "2026-04-27", time: "16:50", cashier: "Varga T.", customer: "Design Otthon Stúdió", payment: "Bankkártya",
    lines: [ { name: "Design étkezőszék tölgy", qty: 4, unit: "db", unitPrice: 72800, unitCost: 28000 } ],
    services: [], net: 291200, profit: 179200 },
  { id: "PS-2604-011", date: "2026-04-27", time: "14:22", cashier: "Kis A.", customer: "Eseti vevő", payment: "Készpénz",
    lines: [ { name: "Állítható bútorláb 100mm", qty: 24, unit: "db", unitPrice: 147, unitCost: 95 },
             { name: "Üveg vázakészlet", qty: 1, unit: "szett", unitPrice: 12600, unitCost: 4200 } ],
    services: [], net: 16128, profit: 9648 },
];

// Lapszabászat / megmunkálás rendelések — saját FSM.
const CUTTING_ORDERS = [
  { id: "SZ-2604-031", date: "2026-04-28", customer: "Kerekes Asztalos Bt.", phone: "+36 30 412 778",
    boardId: "TP-lap-02", boardName: "Egger H1334 tölgy 18mm", sheets: 6,
    cuts: [ { w: 800, h: 560, qty: 8 }, { w: 600, h: 140, qty: 12 } ],
    services: [ { id: "cut", name: "Szabás (vágás)", unit: "vágás", qty: 28, rate: 95 },
                { id: "edge2", name: "Élzárás 2mm", unit: "fm", qty: 22, rate: 420 } ],
    note: "Tölgy színazonos él kérve.", status: "quoted", materialCost: 95580, serviceTotal: 11900 },
  { id: "SZ-2604-029", date: "2026-04-27", customer: "Szabó Lakberendezés", phone: "+36 20 558 110",
    boardId: "TP-lap-01", boardName: "Egger W1000 fehér 18mm", sheets: 4,
    cuts: [ { w: 1200, h: 380, qty: 6 } ],
    services: [ { id: "cut", name: "Szabás (vágás)", unit: "vágás", qty: 12, rate: 95 },
                { id: "edge1", name: "Élzárás 1mm", unit: "fm", qty: 18, rate: 320 } ],
    note: "", status: "accepted", materialCost: 42640, serviceTotal: 6900 },
  { id: "SZ-2604-027", date: "2026-04-26", customer: "Eseti vevő", phone: "",
    boardId: "TP-lap-03", boardName: "MDF nyers 18mm", sheets: 2,
    cuts: [ { w: 600, h: 600, qty: 4 } ],
    services: [ { id: "cut", name: "Szabás (vágás)", unit: "vágás", qty: 8, rate: 95 } ],
    note: "Helyszíni átvétel.", status: "ready", materialCost: 19760, serviceTotal: 760 },
  { id: "SZ-2604-024", date: "2026-04-25", customer: "Bognár Bútor Kft.", phone: "+36 72 412 333",
    boardId: "TP-lap-02", boardName: "Egger H1334 tölgy 18mm", sheets: 10,
    cuts: [ { w: 720, h: 560, qty: 16 } ],
    services: [ { id: "cut", name: "Szabás (vágás)", unit: "vágás", qty: 16, rate: 95 },
                { id: "edge2", name: "Élzárás 2mm", unit: "fm", qty: 41, rate: 420 },
                { id: "delivery", name: "Kiszállítás", unit: "alkalom", qty: 1, rate: 6500 } ],
    note: "", status: "handed", materialCost: 159300, serviceTotal: 25540 },
  { id: "SZ-2604-022", date: "2026-04-24", customer: "Eseti vevő", phone: "+36 30 110 552",
    boardId: "TP-lap-01", boardName: "Egger W1000 fehér 18mm", sheets: 3,
    cuts: [ { w: 400, h: 400, qty: 6 } ],
    services: [ { id: "cut", name: "Szabás (vágás)", unit: "vágás", qty: 6, rate: 95 } ],
    note: "Túl drága volt az ügyfélnek.", status: "rejected", materialCost: 31980, serviceTotal: 570 },
];

// Megjelenítés-tónusok ──────────────────────────────────────────────────────
const TRADE_SALE_TONE = {
  paid:     { bg: "bg-emerald-50", fg: "text-emerald-700", dot: "bg-emerald-500", label: "Fizetve" },
  void:     { bg: "bg-stone-100",  fg: "text-stone-500",   dot: "bg-stone-400",   label: "Sztornó" },
  refunded: { bg: "bg-rose-50",    fg: "text-rose-700",    dot: "bg-rose-500",    label: "Visszatérítve" },
};
const CUTTING_TONE = {
  inquiry:  { bg: "bg-stone-100",  fg: "text-stone-600",   dot: "bg-stone-400",   label: "Érdeklődés" },
  quoted:   { bg: "bg-sky-50",     fg: "text-sky-700",     dot: "bg-sky-500",     label: "Árajánlat" },
  accepted: { bg: "bg-indigo-50",  fg: "text-indigo-700",  dot: "bg-indigo-500",  label: "Elfogadva" },
  ready:    { bg: "bg-amber-50",   fg: "text-amber-700",   dot: "bg-amber-500",   label: "Kész" },
  handed:   { bg: "bg-emerald-50", fg: "text-emerald-700", dot: "bg-emerald-500", label: "Átadva" },
  rejected: { bg: "bg-rose-50",    fg: "text-rose-700",    dot: "bg-rose-500",    label: "Elutasítva" },
};
// Engedélyezett FSM-átmenetek (a tiltottak LEZÁRT gombként jelennek meg).
const CUTTING_FLOW = {
  inquiry:  ["quoted", "rejected"],
  quoted:   ["accepted", "rejected"],
  accepted: ["ready"],
  ready:    ["handed"],
  handed:   [],
  rejected: [],
};
const CUTTING_ORDER = ["inquiry", "quoted", "accepted", "ready", "handed"];

// Kategória-színek — TELJES osztály-stringek (Tailwind CDN JIT miatt nem építhető
// dinamikusan a `bg-${color}-100` forma).
const TRADE_CAT_TONE = {
  stone:  { bg: "bg-stone-100",  fg: "text-stone-700",  bar: "bg-stone-400",  soft: "bg-stone-50",  ring: "ring-stone-200",  dot: "bg-stone-400" },
  amber:  { bg: "bg-amber-100",  fg: "text-amber-700",  bar: "bg-amber-400",  soft: "bg-amber-50",  ring: "ring-amber-200",  dot: "bg-amber-400" },
  indigo: { bg: "bg-indigo-100", fg: "text-indigo-700", bar: "bg-indigo-500", soft: "bg-indigo-50", ring: "ring-indigo-200", dot: "bg-indigo-500" },
  teal:   { bg: "bg-teal-100",   fg: "text-teal-700",   bar: "bg-teal-500",   soft: "bg-teal-50",   ring: "ring-teal-200",   dot: "bg-teal-500" },
  violet: { bg: "bg-violet-100", fg: "text-violet-700", bar: "bg-violet-500", soft: "bg-violet-50", ring: "ring-violet-200", dot: "bg-violet-500" },
  rose:   { bg: "bg-rose-100",   fg: "text-rose-700",   bar: "bg-rose-500",   soft: "bg-rose-50",   ring: "ring-rose-200",   dot: "bg-rose-500" },
};
// Készlet-állapot tónus (számított trend).
const TRADE_STOCK_TONE = {
  ok:       { fg: "text-emerald-600", dot: "bg-emerald-500", bg: "bg-emerald-50", label: "Készleten" },
  low:      { fg: "text-amber-600",   dot: "bg-amber-500",   bg: "bg-amber-50",   label: "Alacsony" },
  critical: { fg: "text-rose-600",    dot: "bg-rose-500",    bg: "bg-rose-50",    label: "Kritikus" },
};

// ──────────────────────────────────────────────────────────────────────────
// TradeEngine — tiszta számoló helperek (markup ↔ árrés, eladási ár).
// ──────────────────────────────────────────────────────────────────────────
(function () {
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const TradeEngine = {
    VAT: TRADE_VAT,
    // markup (×beszerzés) → árrés % (haszon / eladási ár)
    markupToMargin(m) { m = num(m); return m > 0 ? (1 - 1 / m) * 100 : 0; },
    // árrés % → markup
    marginToMarkup(p) { p = num(p); return p < 100 ? 1 / (1 - p / 100) : 99; },
    // egy termék effektív markupja (saját felülírás → kategória alap)
    productMarkup(p, cat) {
      if (p && p.markup != null && p.markup !== "") return num(p.markup);
      return cat ? num(cat.markup) : 1;
    },
    // eladási nettó ár (10 Ft-ra kerekítve)
    sell(purchase, markup) { return Math.round(num(purchase) * num(markup) / 10) * 10; },
    sellOf(p, cat) { return this.sell(p.purchase, this.productMarkup(p, cat)); },
    profitOf(p, cat) { return this.sellOf(p, cat) - num(p.purchase); },
    // ÁFA-s (bruttó) ár
    gross(net) { return Math.round(num(net) * (1 + TRADE_VAT)); },
    // készlet-állapot (számított)
    trendOf(p) { const oh = num(p.onHand), mn = num(p.min); return oh <= 0 ? "critical" : oh < mn ? (oh < mn / 2 ? "critical" : "low") : "ok"; },
    fmtHuf(n) { return Math.round(num(n)).toLocaleString("hu-HU") + " Ft"; },
    fmtPct(p) { return (Math.round(num(p) * 10) / 10).toLocaleString("hu-HU") + "%"; },
    fmtX(m) { return (Math.round(num(m) * 100) / 100).toLocaleString("hu-HU") + "×"; },
    // ── Lapszabászat szolgáltatás-árak ──
    edgeKey(tId, wId, gId) { return tId + "·" + wId + "·" + gId; },
    // élzárás Ft/fm egy paraméter-kombinációra (override → szorzós alap)
    edgeRate(rates, tId, wId, gId) {
      if (!rates) return 0;
      const key = this.edgeKey(tId, wId, gId);
      const ov = rates.edgeOverrides && rates.edgeOverrides[key];
      if (ov != null && ov !== "") return num(ov);
      const t = (rates.edgeThickness || []).find((x) => x.id === tId);
      const w = (rates.edgeWidth || []).find((x) => x.id === wId);
      const g = (rates.edgeGlue || []).find((x) => x.id === gId);
      const r = num(rates.edgeBase) * num(t ? t.mult : 1) * num(w ? w.mult : 1) * num(g ? g.mult : 1);
      return Math.round(r / 5) * 5;
    },
    edgeIsOverride(rates, tId, wId, gId) {
      if (!rates || !rates.edgeOverrides) return false;
      const ov = rates.edgeOverrides[this.edgeKey(tId, wId, gId)];
      return ov != null && ov !== "";
    },
    edgeParamName(rates, dim, id) {
      const arr = rates ? rates[dim] : null;
      const f = (arr || []).find((x) => x.id === id);
      return f ? f.name : "—";
    },
    // árrés-szín a markup vagy árrés alapján (egészséges → zöld)
    marginTone(pct) {
      pct = num(pct);
      if (pct < 0) return { fg: "text-rose-700", bg: "bg-rose-50", dot: "bg-rose-500", bar: "bg-rose-400" };
      if (pct < 22) return { fg: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500", bar: "bg-amber-400" };
      return { fg: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500", bar: "bg-emerald-500" };
    },
  };
  window.TradeEngine = TradeEngine;
})();

Object.assign(window, {
  TRADE_CATEGORIES, TRADE_PRODUCTS, TRADE_SERVICES, TRADE_PAYMENTS, TRADE_VAT,
  TRADE_SERVICE_RATES_SEED,
  TRADE_SALES, CUTTING_ORDERS,
  TRADE_SALE_TONE, CUTTING_TONE, CUTTING_FLOW, CUTTING_ORDER,
  TRADE_CAT_TONE, TRADE_STOCK_TONE,
});
