// Extra mock data: facilities, partners, roles, templates, multi-sheet nesting

// Gyártható elem-kategóriák — a külső gyártó partnerek ezekből adják meg, melyiket
// gyártják (makerCategories). A rendelhető egyedi tervezett bútor is ezt hordozza.
const MAKER_CATEGORIES = ["Konyhabútor", "Szekrény / tároló", "Ajtó / front", "Pult / munkalap", "Falpanel / burkolat", "Egyedi bútor"];

const FACILITIES = [
  {
    id: "fac-vac",
    name: "Vác — főüzem",
    address: "2600 Vác, Ipari park 14.",
    contactName: "Kovács Péter",
    contactPhone: "+36 27 123 456",
    machines: 6,
    workers: 14,
    machinesList: ["Holzma HPP380", "Biesse Selco WN6", "Holzma CNC", "Biesse Rover", "Festool BS-1", "Brandt KDF 660"],
  },
  {
    id: "fac-bp",
    name: "Budapest — kirendeltség",
    address: "1097 Budapest, Könyves Kálmán krt. 12.",
    contactName: "Tóth Krisztián",
    contactPhone: "+36 1 555 8821",
    machines: 2,
    workers: 5,
    machinesList: ["Holzma HPL11", "Brandt KDN 350"],
  },
  {
    id: "fac-szek",
    name: "Székesfehérvár — raktár",
    address: "8000 Székesfehérvár, Raktár u. 7.",
    contactName: "Nagy János",
    contactPhone: "+36 22 411 220",
    machines: 0,
    workers: 3,
    machinesList: [],
  },
  {
    // Elszeparált belső egység — a beszerzési katalógus internal_unit forrása ide
    // mutat (unitId: "fac-lakatos"). A belső megrendelés (internal_order) kézfogás
    // ezt az egységet célozza.
    id: "fac-lakatos",
    name: "Lakatos üzem",
    unit: true,
    address: "2600 Vác, Ipari park 14/B (külön csarnok)",
    contactName: "Szücs Tibor",
    contactPhone: "+36 27 123 470",
    machines: 4,
    workers: 6,
    machinesList: ["Hegesztő robot", "CNC plazmavágó", "Élhajlító", "Sörétező"],
  },
];

const PARTNERS = [
  {
    id: "p-egger",  name: "Egger Faipari Kft.",   type: "supplier",   status: "active",  joined: "2024-09-12",
    apiKey: "egr_••••••••••a3f4",
    delegated: ["Anyag rendelés", "Vágóterv export"],
    sharedOrders: 184,
    contact: "B2B Csatorna · b2b@egger.hu",
  },
  {
    id: "p-blum",   name: "Blum Hungária Kft.",   type: "supplier",   status: "active",  joined: "2024-11-04",
    apiKey: "blu_••••••••••8e21",
    delegated: ["Vasalat katalógus szinkron"],
    sharedOrders: 57,
    contact: "Partner portal · hu.partners@blum.com",
  },
  {
    id: "p-fehervar", name: "Fehérvár Lapszabász Bt.", type: "cutter", status: "active", joined: "2025-02-18",
    apiKey: "flb_••••••••••c0d2",
    delegated: ["Szabászat alvállalkozás", "Élzárás"],
    sharedOrders: 31,
    contact: "Fehér László · info@flb.hu",
  },
  {
    id: "p-konyha", name: "Várdai Konyhastúdió",   type: "trader",    status: "active",  joined: "2025-04-02",
    apiKey: "vks_••••••••••1f88",
    delegated: ["Megrendelés feltöltés"],
    sharedOrders: 12,
    contact: "Várdai Eszter · eszter@vardai.hu",
  },
  {
    id: "p-bognar", name: "Bognár Bútor Kft.",     type: "manufacturer", status: "active", joined: "2025-04-15",
    apiKey: "bgn_••••••••••72ac",
    delegated: ["Közös gyártás"],
    sharedOrders: 8,
    contact: "Bognár István · iroda@bognarbutor.hu",
  },
  {
    id: "p-pending1", name: "Helios Faipar Zrt.",  type: "manufacturer", status: "pending", joined: "2026-04-22",
    apiKey: null, delegated: [], sharedOrders: 0,
    contact: "—",
  },
];

const PARTNER_INVITES = [
  { email: "kapcsolat@regiofa.hu",  type: "supplier", sent: "2026-04-26", state: "pending" },
  { email: "info@hettich.hu",       type: "supplier", sent: "2026-04-24", state: "pending" },
  { email: "p.szabo@cnc-mester.hu", type: "cutter",   sent: "2026-04-21", state: "expired" },
];

const PARTNER_TYPES = {
  hu: { manufacturer: "Gyártó", cutter: "Lapszabász", trader: "Kereskedő", supplier: "Szállító" },
  en: { manufacturer: "Manufacturer", cutter: "Cutter", trader: "Trader", supplier: "Supplier" },
};

const ROLE_KEYS = ["admin", "manager", "operator", "viewer"];
const PERMISSION_MODULES = ["orders", "production", "inventory", "procurement", "analytics", "settings"];

// "full" | "read" | "none"
const ROLE_MATRIX = {
  admin:    { orders: "full", production: "full", inventory: "full", procurement: "full", analytics: "full", settings: "full" },
  manager:  { orders: "full", production: "full", inventory: "full", procurement: "full", analytics: "full", settings: "read" },
  operator: { orders: "read", production: "full", inventory: "read", procurement: "none", analytics: "read", settings: "none" },
  viewer:   { orders: "read", production: "read", inventory: "read", procurement: "read", analytics: "read", settings: "none" },
};

const TEMPLATES = [
  { id: "t-cab-base", name: "Alsó konyhaszekrény", type: "cabinet", paramCount: 8, rating: 4.8, downloads: 1240, community: false,
    params: [
      { name: "Szélesség",    val: 600,  unit: "mm" },
      { name: "Magasság",     val: 720,  unit: "mm" },
      { name: "Mélység",      val: 560,  unit: "mm" },
      { name: "Anyag vastag.", val: 18,   unit: "mm" },
      { name: "Hátlap vastag.", val: 8,  unit: "mm" },
      { name: "Polcok száma", val: 1,    unit: "db" },
      { name: "Élzárás",      val: "ABS 2mm", unit: "" },
      { name: "Pánt típus",   val: "Blum CLIP", unit: "" },
    ],
  },
  { id: "t-cab-tall", name: "Magas szekrény (kamra)", type: "cabinet", paramCount: 9, rating: 4.6, downloads: 824, community: false },
  { id: "t-door-int", name: "Beltéri ajtó — keret + tábla", type: "door", paramCount: 7, rating: 4.7, downloads: 612, community: false },
  { id: "t-window-fix", name: "Fix faablak", type: "window", paramCount: 6, rating: 4.4, downloads: 188, community: false },
  { id: "t-cab-corner", name: "Sarok forgókosaras", type: "cabinet", paramCount: 11, rating: 4.9, downloads: 2150, community: true },
  { id: "t-shaker",    name: "Shaker stílusú front", type: "door", paramCount: 5, rating: 4.5, downloads: 904, community: true },
];

// Multi-sheet nesting for the active cutting plan.
// Each sheet has its own parts array. Coords are mm, sheet 2800×2070.
const NESTING_SHEETS = [
  // sheet 1 — keep in sync with NESTING.parts (the original)
  null, // populated at runtime from NESTING
  // sheet 2 — drawer fronts
  { parts: [
    { id: "df1", x: 60,   y: 60,   w: 596,  h: 140, label: "Fiókfront 600", rot: 0 },
    { id: "df2", x: 60,   y: 220,  w: 596,  h: 140, label: "Fiókfront 600", rot: 0 },
    { id: "df3", x: 60,   y: 380,  w: 596,  h: 140, label: "Fiókfront 600", rot: 0 },
    { id: "df4", x: 60,   y: 540,  w: 596,  h: 140, label: "Fiókfront 600", rot: 0 },
    { id: "df5", x: 696,  y: 60,   w: 396,  h: 140, label: "Fiókfront 400", rot: 0 },
    { id: "df6", x: 696,  y: 220,  w: 396,  h: 140, label: "Fiókfront 400", rot: 0 },
    { id: "side1", x: 1130, y: 60,  w: 800,  h: 560, label: "Oldal 800×560", rot: 0 },
    { id: "side2", x: 1960, y: 60,  w: 800,  h: 560, label: "Oldal 800×560", rot: 0 },
    { id: "back1", x: 60,   y: 700, w: 1180, h: 720, label: "Hátlap 1180×720", rot: 0 },
    { id: "back2", x: 1280, y: 700, w: 1180, h: 720, label: "Hátlap 1180×720", rot: 0 },
    { id: "shelf1", x: 60,   y: 1440, w: 590, h: 560, label: "Polc 590", rot: 0 },
    { id: "shelf2", x: 680,  y: 1440, w: 590, h: 560, label: "Polc 590", rot: 0 },
    { id: "shelf3", x: 1300, y: 1440, w: 590, h: 560, label: "Polc 590", rot: 0 },
    { id: "shelf4", x: 1920, y: 1440, w: 590, h: 560, label: "Polc 590", rot: 0 },
  ], util: 84 },
  // sheet 3 — large panels
  { parts: [
    { id: "top1",  x: 60,  y: 60,   w: 2200, h: 600, label: "Felső lap 2200×600", rot: 0 },
    { id: "top2",  x: 60,  y: 700,  w: 2200, h: 600, label: "Felső lap 2200×600", rot: 0 },
    { id: "rear",  x: 60,  y: 1340, w: 2680, h: 660, label: "Hátlap 2680×660", rot: 0 },
    { id: "ext1",  x: 2300, y: 60,  w: 460,  h: 600, label: "Oldal 460×600", rot: 0 },
    { id: "ext2",  x: 2300, y: 700, w: 460,  h: 600, label: "Oldal 460×600", rot: 0 },
  ], util: 91 },
  // sheet 4 — small parts
  { parts: Array.from({ length: 24 }, (_, i) => {
      const cols = 6;
      const cw = 440, ch = 320;
      const cx = 60 + (i % cols) * (cw + 12);
      const cy = 60 + Math.floor(i / cols) * (ch + 12);
      return { id: `sm${i}`, x: cx, y: cy, w: cw, h: ch, label: `Polc ${i + 1}`, rot: 0 };
    }), util: 76 },
  // sheet 5 — mixed
  { parts: [
    { id: "m1", x: 60,  y: 60,  w: 1200, h: 800, label: "Front 1200×800", rot: 0 },
    { id: "m2", x: 1300, y: 60, w: 1200, h: 800, label: "Front 1200×800", rot: 0 },
    { id: "m3", x: 60,  y: 900, w: 800,  h: 1100, label: "Oldal 800×1100", rot: 0 },
    { id: "m4", x: 900, y: 900, w: 800,  h: 1100, label: "Oldal 800×1100", rot: 0 },
    { id: "m5", x: 1740, y: 900, w: 1020, h: 1100, label: "Hátlap 1020×1100", rot: 0 },
  ], util: 88 },
  // sheets 6-8: smaller fillers
  { parts: [
    { id: "f1", x: 60,  y: 60,  w: 1340, h: 1940, label: "Bal hátlap", rot: 0 },
    { id: "f2", x: 1420, y: 60, w: 1340, h: 1940, label: "Jobb hátlap", rot: 0 },
  ], util: 95 },
  { parts: [
    { id: "g1", x: 60,  y: 60,  w: 880, h: 600, label: "Fiók oldal", rot: 0 },
    { id: "g2", x: 960, y: 60,  w: 880, h: 600, label: "Fiók oldal", rot: 0 },
    { id: "g3", x: 1860, y: 60, w: 880, h: 600, label: "Fiók oldal", rot: 0 },
    { id: "g4", x: 60,  y: 700, w: 880, h: 600, label: "Fiók oldal", rot: 0 },
    { id: "g5", x: 960, y: 700, w: 880, h: 600, label: "Fiók oldal", rot: 0 },
    { id: "g6", x: 1860, y: 700, w: 880, h: 600, label: "Fiók oldal", rot: 0 },
    { id: "g7", x: 60,  y: 1340, w: 1340, h: 660, label: "Fenéklap", rot: 0 },
    { id: "g8", x: 1420, y: 1340, w: 1340, h: 660, label: "Fenéklap", rot: 0 },
  ], util: 81 },
  { parts: [
    { id: "h1", x: 60, y: 60, w: 2680, h: 1940, label: "Asztallap 2680×1940", rot: 0 },
  ], util: 99 },
];

Object.assign(window, {
  FACILITIES, PARTNERS, PARTNER_INVITES, PARTNER_TYPES, MAKER_CATEGORIES,
  ROLE_KEYS, PERMISSION_MODULES, ROLE_MATRIX,
  TEMPLATES, NESTING_SHEETS,
});
