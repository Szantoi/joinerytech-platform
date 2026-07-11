// World/module routing config + Tervezés (parametric templates) data + Sales/Quotes data + Shop Floor task queue

// ──────────────────────────────────────────────────────────────────────────
// World definitions — each world has its own mini-sidebar of screens
// ──────────────────────────────────────────────────────────────────────────
const WORLDS = {
  tasks: {
    key: "tasks",
    hu: "Feladataim", en: "My Tasks",
    sub: "Minden világ feladata egy helyen — személyes munkafelület",
    icon: "orders",
    accent: "indigo",
    screens: [],
    badge: "teendők",
  },
  production: {
    key: "production",
    hu: "Gyártás",      en: "Manufacturing",
    sub: "Termelés vezetés és műhely operáció",
    icon: "factory",
    accent: "teal",
    screens: [
      { key: "dash",      hu: "Áttekintés",     en: "Overview" },
      { key: "schedule",  hu: "Ütemezés",       en: "Schedule" },
      { key: "machining", hu: "Megmunkálás",    en: "Machining" },
      { key: "manufprojects", hu: "Gyártási projektek", en: "Manufacturing projects" },
      { key: "workflow",  hu: "Munkafolyamat",  en: "Workflow" },
      { key: "analytics", hu: "Elemzések",      en: "Analytics" },
    ],
    badge: "7 aktív",
  },
  mfgprep: {
    key: "mfgprep",
    hu: "Gyártás-előkészítés", en: "Manufacturing Prep",
    sub: "A kiadott munka előkészítése egy helyen — anyag, vágóterv, címke, útvonal, dokumentum, és kiadás a műhelynek",
    icon: "cpu",
    accent: "teal",
    screens: [
      { key: "dash",    hu: "Munkasor",          en: "Work queue" },
      { key: "nesting", hu: "Anyagoptimalizálás", en: "Nesting" },
    ],
    badge: "előkészítés",
  },
  supervisor: {
    key: "supervisor",
    hu: "Üzemvezető", en: "Floor Control",
    sub: "Dispatch torony — kiosztás, terhelés, termelékenység, élő műhely-státusz",
    icon: "workflow",
    accent: "slate",
    screens: [
      { key: "dash",         hu: "Áttekintés",      en: "Overview" },
      { key: "dispatch",     hu: "Diszpécser",      en: "Dispatch" },
      { key: "load",         hu: "Terhelés",        en: "Load" },
      { key: "productivity", hu: "Termelékenység",  en: "Productivity" },
    ],
    badge: "dispatch",
  },
  sales: {
    key: "sales",
    hu: "Értékesítés", en: "Sales",
    sub: "Ajánlatok, megrendelések, ügyfelek",
    icon: "briefcase",
    accent: "indigo",
    screens: [
      { key: "dash",      hu: "Áttekintés",   en: "Overview" },
      { key: "orders",    hu: "Rendelések",   en: "Orders" },
      { key: "quotes",    hu: "Árajánlatok",  en: "Quotes" },
      { key: "customers", hu: "Ügyfelek",     en: "Customers" },
    ],
    badge: "3 ajánlat",
  },
  crm: {
    key: "crm",
    hu: "CRM / Pipeline", en: "CRM / Pipeline",
    sub: "Lead-pipeline és üzleti lehetőségek — a megkereséstől az ajánlatig",
    icon: "route",
    accent: "blue",
    screens: [
      { key: "dash",     hu: "Áttekintés",     en: "Overview" },
      { key: "pipeline", hu: "Pipeline",       en: "Pipeline" },
      { key: "leads",    hu: "Leadek",         en: "Leads" },
      { key: "opps",     hu: "Lehetőségek",    en: "Opportunities" },
      { key: "tasks",    hu: "Feladatok",      en: "Tasks" },
      { key: "forecast", hu: "Forecast",       en: "Forecast" },
    ],
    badge: "pipeline",
  },
  design: {
    key: "design",
    hu: "Tervezés", en: "Design",
    sub: "Parametrikus sablonok, anyaglista, katalógus",
    icon: "ruler",
    accent: "amber",
    screens: [
      { key: "dash",     hu: "Áttekintés",          en: "Overview" },
      { key: "configurator", hu: "Konfigurátor",    en: "Configurator" },
      { key: "specs",    hu: "Specifikációk",       en: "Specifications" },
      { key: "engineer", hu: "Műszaki tervezés",    en: "Engineering" },
      { key: "datasheet", hu: "Gyártás-adatlap",   en: "Mfg data sheet" },
      { key: "editor",   hu: "Sablon szerkesztő",   en: "Template editor" },
      { key: "generate", hu: "Anyaglista generálás",en: "Materials generator" },
      { key: "catalog",  hu: "Katalógus",           en: "Catalog" },
    ],
    badge: "2 projekt",
  },
  interior: {
    key: "interior",
    hu: "Belsőépítészet", en: "Interior",
    sub: "Koncepciók, térváltozatok, moodboard, szakág-tervek",
    icon: "sparkle",
    accent: "rose",
    screens: [
      { key: "concepts",  hu: "Koncepciók",     en: "Concepts" },
      { key: "dash",      hu: "Áttekintés",     en: "Overview" },
      { key: "composition", hu: "Bútorsor",     en: "Furniture run" },
      { key: "catalog",   hu: "Katalógus",      en: "Catalog" },
      { key: "trades",    hu: "Szakág-tervek",  en: "Trade plans" },
      { key: "floorplan", hu: "Térrendezés",      en: "Space planning" },
      { key: "assembly",  hu: "Projekt-összeállítás", en: "Project assembly" },
    ],
    badge: "2 koncepció",
  },
  procurement: {
    key: "procurement",
    hu: "Beszerzés", en: "Procurement",
    sub: "Igénylések, megrendelések, árlisták",
    icon: "procurement",
    accent: "amber",
    screens: [
      { key: "orders",       hu: "Megrendelések", en: "Purchase Orders" },
      { key: "requisitions", hu: "Igénylések",  en: "Requisitions" },
      { key: "rfq",          hu: "Ajánlatkérés", en: "RFQ" },
      { key: "pricelists",   hu: "Árlisták",    en: "Price Lists" },
      { key: "suppliermap",  hu: "Beszállítói cikkek", en: "Supplier Items" },
      { key: "catalog",      hu: "Beszerzési katalógus", en: "Procurement Catalog" },
    ],
  },
  finance: {
    key: "finance",
    hu: "Pénzügy", en: "Finance",
    sub: "Számlák, kifizetések, kintlévőség",
    icon: "receipt",
    accent: "emerald",
    screens: [
      { key: "dash",     hu: "Áttekintés",     en: "Overview" },
      { key: "outgoing", hu: "Kimenő számlák", en: "Outgoing Invoices" },
      { key: "incoming", hu: "Bejövő számlák", en: "Incoming Invoices" },
      { key: "contracts", hu: "Szerződések",   en: "Contracts" },
      { key: "payments", hu: "Kifizetések",    en: "Payments" },
    ],
  },
  masterdata: {
    key: "masterdata",
    hu: "Törzsadat", en: "Master Data",
    sub: "Cikkszám-törzs és jóváhagyási életciklus",
    icon: "layers",
    accent: "teal",
    screens: [
      { key: "catalog",   hu: "Cikkszámok",     en: "Item Master" },
      { key: "approvals", hu: "Jóváhagyások",   en: "Approvals" },
    ],
  },
  warehouse: {
    key: "warehouse",
    hu: "Raktár", en: "Warehouse",
    sub: "Készlet és mozgások",
    icon: "box",
    accent: "stone",
    screens: [
      { key: "dash",          hu: "Áttekintés",   en: "Overview" },
      { key: "receiving",     hu: "Bevételezés",  en: "Receiving" },
      { key: "inventory",     hu: "Készlet",     en: "Inventory" },
      { key: "withdrawals",   hu: "Kivét",       en: "Withdrawals" },
      { key: "offcuts",       hu: "Maradékanyag", en: "Offcuts" },
      { key: "stocktake",     hu: "Leltár",      en: "Stocktake" },
      { key: "movements",     hu: "Mozgások",    en: "Movements" },
      { key: "catalog",       hu: "Katalógus",   en: "Catalog" },
    ],
    badge: "1 riadat",
  },
  shopfloor: {
    key: "shopfloor",
    hu: "Üzem", en: "Shop Floor",
    sub: "Műhely-terminál — állomásra szűrt operátor feladatok (JIT)",
    icon: "wrench",
    accent: "emerald",
    screens: [],  // állomás-szűrt kiosk, nincs mini-sidebar
    badge: "műhely",
  },
  shop: {
    key: "shop",
    hu: "Bolt", en: "Shop",
    sub: "Portfólió webshop — termékek böngészése és rendelés",
    icon: "box",
    accent: "teal",
    screens: [],  // webshop is full-screen, no mini-sidebar
    badge: "webshop",
  },
  trade: {
    key: "trade",
    hu: "Kereskedelem", en: "Commerce",
    sub: "Pultos eladás, lapszabászat, kereskedelmi árrés-motor",
    icon: "storefront",
    accent: "orange",
    screens: [
      { key: "dash",    hu: "Áttekintés",   en: "Overview" },
      { key: "counter", hu: "Pult",         en: "Counter" },
      { key: "cutting", hu: "Lapszabászat", en: "Panel cutting" },
      { key: "pricing", hu: "Árrés-motor",  en: "Margin engine" },
    ],
    badge: "5 eladás ma",
  },
  projects: {
    key: "projects",
    hu: "Projektek", en: "Projects",
    sub: "Bútor-tételek és szakág-koordináció (víz, áram, szellőzés, gépészet)",
    icon: "briefcase",
    accent: "violet",
    screens: [],  // single full page, no mini-sidebar
    badge: "3 aktív",
  },
  logistics: {
    key: "logistics",
    hu: "Logisztika", en: "Logistics",
    sub: "Kiszállítás, telepítés, beszállítás, felmérés — fuvar és helyszíni átadás",
    icon: "truck",
    accent: "sky",
    screens: [
      { key: "dash",       hu: "Áttekintés",     en: "Overview" },
      { key: "deliveries", hu: "Kiszállítások",  en: "Deliveries" },
      { key: "pickups",    hu: "Beszállítások",  en: "Pickups" },
      { key: "schedule",   hu: "Ütemezés",       en: "Schedule" },
      { key: "terminal",   hu: "Sofőr terminál", en: "Driver terminal" },
      { key: "resources",  hu: "Erőforrások",    en: "Resources" },
    ],
    badge: "ma 3 túra",
  },
  kontrolling: {
    key: "kontrolling",
    hu: "Kontrolling", en: "Controlling",
    sub: "Projekt-jövedelmezőség — terv vs. tény utókalkuláció, fedezet és eltérés-elemzés",
    icon: "chart",
    accent: "slate",
    screens: [
      { key: "exec",     hu: "Vezetői áttekintés", en: "Executive" },
      { key: "dash",     hu: "Portfólió",       en: "Portfolio" },
      { key: "projects", hu: "Projekt-fedezet", en: "Project margin" },
      { key: "variance", hu: "Eltérés-elemzés", en: "Variance" },
      { key: "postcalc", hu: "Utókalkuláció",   en: "Post-calculation" },
    ],
    badge: "fedezet",
  },
  service: {
    key: "service",
    hu: "Reklamáció", en: "Service",
    sub: "Szerviz, garancia és hiánypótlás — az átadás utáni hurok lezárása",
    icon: "shield",
    accent: "rose",
    screens: [
      { key: "dash",    hu: "Áttekintés",  en: "Overview" },
      { key: "tickets", hu: "Bejelentések",en: "Tickets" },
      { key: "board",   hu: "Tábla",       en: "Board" },
    ],
    badge: "3 nyitott",
  },
  hr: {
    key: "hr",
    hu: "HR / Kapacitás", en: "Workforce",
    sub: "Dolgozók, kapacitás-tervezés, jelenlét és távollét, készség-mátrix",
    icon: "user",
    accent: "amber",
    screens: [
      { key: "dash",     hu: "Áttekintés",   en: "Overview" },
      { key: "people",   hu: "Dolgozók",     en: "People" },
      { key: "capacity", hu: "Kapacitás",    en: "Capacity" },
      { key: "absence",  hu: "Távollét",     en: "Absence" },
      { key: "skills",   hu: "Készségek",    en: "Skills" },
    ],
    badge: "11 fő",
  },
  maintenance: {
    key: "maintenance",
    hu: "Karbantartás", en: "Maintenance",
    sub: "Eszköz-nyilvántartás, megelőző karbantartás, munkalapok és állásidő",
    icon: "wrench",
    accent: "cyan",
    screens: [
      { key: "dash",      hu: "Áttekintés",   en: "Overview" },
      { key: "assets",    hu: "Eszközök",     en: "Assets" },
      { key: "workorders",hu: "Munkalapok",   en: "Work orders" },
      { key: "schedule",  hu: "Ütemterv",     en: "Schedule" },
      { key: "downtime",  hu: "Állásidő",     en: "Downtime" },
    ],
    badge: "esedékes",
  },
  quality: {
    key: "quality",
    hu: "Minőség", en: "Quality",
    sub: "Bejövő, gyártásközi és végellenőrzés — az átadás előtti minőség",
    icon: "shield",
    accent: "lime",
    screens: [
      { key: "dash",        hu: "Áttekintés",   en: "Overview" },
      { key: "inspections", hu: "Ellenőrzések", en: "Inspections" },
      { key: "board",       hu: "Tábla",       en: "Board" },
    ],
    badge: "QA",
  },
  ehs: {
    key: "ehs",
    hu: "Munkavédelem", en: "EHS / Safety",
    sub: "Üzemi munkavédelem — baleset & kvázibaleset, kockázatértékelés, oktatás",
    icon: "alert",
    accent: "red",
    screens: [
      { key: "dash",      hu: "Áttekintés", en: "Overview" },
      { key: "incidents", hu: "Balesetek",  en: "Incidents" },
      { key: "risks",     hu: "Kockázatok", en: "Risk register" },
      { key: "training",  hu: "Oktatás",    en: "Training" },
    ],
    badge: "EHS",
  },
  docs: {
    key: "docs",
    hu: "Dokumentumtár", en: "Documents",
    sub: "Verziózott rajzok, szerződések, tanúsítványok, munkautasítások",
    icon: "folder",
    accent: "violet",
    screens: [
      { key: "dash", hu: "Áttekintés",   en: "Overview" },
      { key: "all",  hu: "Dokumentumok", en: "Documents" },
    ],
    badge: "DMS",
  },
  attendance: {
    key: "attendance",
    hu: "Idő & jelenlét", en: "Attendance",
    sub: "Be-/kijelentkezés, jelenléti ív, túlóra, bérköltség",
    icon: "clock",
    accent: "orange",
    screens: [
      { key: "dash",      hu: "Áttekintés",   en: "Overview" },
      { key: "terminal",  hu: "Terminál",     en: "Terminal" },
      { key: "timesheet", hu: "Jelenléti ív", en: "Timesheet" },
    ],
    badge: "jelenlét",
  },
  settings: {
    key: "settings",
    hu: "Beállítások", en: "Settings",
    sub: "Cég, felhasználók, jogosultságok, integrációk",
    icon: "settings",
    accent: "stone",
    screens: [
      { key: "company",      hu: "Cégadatok" },
      { key: "branding",     hu: "Márka" },
      { key: "facilities",   hu: "Részlegek" },
      { key: "partners",     hu: "Partnerek" },
      { key: "workflow",     hu: "Munkafolyamat" },
      { key: "integrations", hu: "Integrációk" },
      { key: "catalog",      hu: "Katalógus" },
      { key: "warehouse",    hu: "Raktárhelyek" },
      { key: "suppliermap",  hu: "Beszállítói cikkek" },
      { key: "audit",        hu: "Napló" },
      { key: "authority",    hu: "Hatáskörök" },
      { key: "roles",        hu: "Jogosultságok" },
    ],
  },
  ai: {
    key: "ai",
    hu: "AI munkaterület", en: "AI Workspace",
    sub: "Agent-ek, skill-ek, memória és rendszer-prompt — a brandérték élő AI-rétege",
    icon: "cpu",
    accent: "indigo",
    screens: [
      { key: "agents",     hu: "Agent Kanban",  en: "Agent Kanban" },
      { key: "skills",     hu: "Skill-ek",      en: "Skills" },
      { key: "memory",     hu: "Memória",       en: "Memory" },
      { key: "playground", hu: "Playground",    en: "Playground" },
    ],
    badge: "AI",
  },
};

const WORLD_ORDER = ["tasks", "production", "mfgprep", "supervisor", "quality", "ehs", "sales", "crm", "procurement", "finance", "kontrolling", "design", "interior", "projects", "logistics", "service", "hr", "attendance", "maintenance", "masterdata", "docs", "warehouse", "shopfloor", "shop", "trade", "ai", "settings"];

// ──────────────────────────────────────────────────────────────────────────
// KEZDŐLAP TÉMA-CSOPORTOK — a világok tematikus rendezése a Home rácson.
//   Az értéklánc-logikát követi (CLAUDE.md): Személyes → Kereskedelem/ügyfél →
//   Tervezés → Gyártás/üzem → Ellátás/raktár → Pénzügy → Törzsadat/admin.
//   Minden enabledModules-beli világ egy csoportba esik; a felsorolásból
//   kimaradó (új) világ az „Egyéb" alá kerül (fallback a page-home.jsx-ben),
//   így a Home soha nem rejt el engedélyezett világot.
// ──────────────────────────────────────────────────────────────────────────
const WORLD_THEMES = [
  { key: "personal",   hu: "Személyes",                  en: "Personal",             worlds: ["tasks"] },
  { key: "commerce",   hu: "Kereskedelem & ügyfél",      en: "Sales & Customer",     worlds: ["crm", "sales", "shop", "trade", "service"] },
  { key: "design",     hu: "Tervezés & projekt",         en: "Design & Project",     worlds: ["design", "interior", "projects"] },
  { key: "production", hu: "Gyártás & üzem",             en: "Production & Floor",   worlds: ["mfgprep", "production", "supervisor", "shopfloor", "quality", "ehs", "maintenance"] },
  { key: "supply",     hu: "Ellátás & raktár",           en: "Supply & Warehouse",   worlds: ["procurement", "warehouse", "logistics"] },
  { key: "finance",    hu: "Pénzügy & kontrolling",      en: "Finance & Controlling",worlds: ["finance", "kontrolling"] },
  { key: "admin",      hu: "Törzsadat & adminisztráció", en: "Data & Admin",         worlds: ["masterdata", "docs", "hr", "attendance", "settings"] },
];

// ──────────────────────────────────────────────────────────────────────────
// Parametric template library — Tervezés world
// ──────────────────────────────────────────────────────────────────────────
const PARAM_TEMPLATES = [
  {
    id: "T-01",
    name: "Polcos szekrény (2 polcos)",
    type: "Szekrény",
    author: "Kovács P.",
    version: "1.4",
    rating: 4.7,
    uses: 142,
    updated: "2026-04-18",
    thumb: "cabinet",
    note: "Standard polcos szekrény, 2 db állítható polccal, hátlapos kivitel.",
    vars: [
      { key: "width",       label: "Szélesség",      unit: "mm", min: 400, max: 1200, step: 50, default: 800,  kind: "raster" },
      { key: "height",      label: "Magasság",       unit: "mm", min: 600, max: 2400, step: 1,  default: 1800, kind: "analog" },
      { key: "depth",       label: "Mélység",        unit: "mm", min: 300, max: 600,  step: 50, default: 400,  kind: "raster" },
      { key: "body",        label: "Korpusz anyag",  kind: "material", default: "EG-3303-18", options: ["EG-3303-18", "EG-1133-18", "EG-3327-18", "MDF-019"] },
      { key: "back",        label: "Hátlap anyag",   kind: "material", default: "HDF-003",    options: ["HDF-003", "MDF-006"] },
      { key: "shelves",     label: "Polcok",         unit: "db", min: 0, max: 5, step: 1, default: 2, kind: "raster" },
    ],
    parts: [
      { name: "Bal oldallap",  qty: 1, mat: "{body}", w: "{depth}", h: "{height}",                                                            t: "{body.t}" },
      { name: "Jobb oldallap", qty: 1, mat: "{body}", w: "{depth}", h: "{height}",                                                            t: "{body.t}" },
      { name: "Felső lap",     qty: 1, mat: "{body}", w: "{width} - 2 × {body.t}", h: "{depth}",                                              t: "{body.t}" },
      { name: "Alsó lap",      qty: 1, mat: "{body}", w: "{width} - 2 × {body.t}", h: "{depth}",                                              t: "{body.t}" },
      { name: "Polc",          qty: "{shelves}", mat: "{body}", w: "{width} - 2 × {body.t}", h: "{depth} - 20",                              t: "{body.t}" },
      { name: "Hátlap",        qty: 1, mat: "{back}", w: "{width} - 2 × {body.t}", h: "{height} - 2 × {body.t}",                              t: "{back.t}" },
    ],
    constraints: [
      { rule: "polc szélesség min 200mm",  expr: "{width} - 2 × {body.t} >= 200" },
      { rule: "hátlap vastagság ≤ 8mm",    expr: "{back.t} <= 8" },
    ],
    categoryId: "cat-cabinet",
    hardware: [ { id: "shelfsup", qty: 8 }, { id: "hinge", qty: 2 }, { id: "leg", qty: 4 } ],
    laborHours: 3.5,
    deliveryDays: 10,
  },
  {
    id: "T-02",
    name: "Konyhai alsó szekrény (fiókos)",
    type: "Szekrény",
    author: "Szabó A.",
    version: "2.1",
    rating: 4.9,
    uses: 318,
    updated: "2026-04-22",
    thumb: "drawer",
    note: "3 fiókos alsó szekrény, Blum Tandembox vasalattal. Standard 720mm magasság.",
    vars: [
      { key: "width",   label: "Szélesség",      unit: "mm", min: 300, max: 1200, step: 50, default: 600, kind: "raster" },
      { key: "depth",   label: "Mélység",        unit: "mm", min: 480, max: 580,  step: 10, default: 560, kind: "raster" },
      { key: "drawers", label: "Fiók szám",      unit: "db", min: 1, max: 4, step: 1, default: 3, kind: "raster" },
      { key: "body",    label: "Korpusz",        kind: "material", default: "EG-3303-18", options: ["EG-3303-18", "EG-1133-18"] },
      { key: "front",   label: "Front anyag",    kind: "material", default: "EG-3327-19", options: ["EG-3327-19", "EG-3303-19"] },
    ],
    parts: [
      { name: "Bal oldallap",  qty: 1, mat: "{body}", w: "{depth}", h: 720, t: 18 },
      { name: "Jobb oldallap", qty: 1, mat: "{body}", w: "{depth}", h: 720, t: 18 },
      { name: "Alsó lap",      qty: 1, mat: "{body}", w: "{width} - 36", h: "{depth}", t: 18 },
      { name: "Hátmerevítő",   qty: 1, mat: "{body}", w: "{width} - 36", h: 80, t: 18 },
      { name: "Front",         qty: "{drawers}", mat: "{front}", w: "{width} - 4", h: "(720 - 8) / {drawers} - 4", t: 19 },
      { name: "Fiók oldal",    qty: "{drawers} × 2", mat: "{body}", w: "{depth} - 30", h: 120, t: 16 },
      { name: "Fiók eleje",    qty: "{drawers}", mat: "{body}", w: "{width} - 70", h: 120, t: 16 },
      { name: "Fiók alja",     qty: "{drawers}", mat: "HDF-003", w: "{width} - 80", h: "{depth} - 50", t: 3 },
    ],
    constraints: [
      { rule: "min 1 fiók",              expr: "{drawers} >= 1" },
      { rule: "fiókmagasság min 100mm",  expr: "(720 - 8) / {drawers} - 4 >= 100" },
    ],
    categoryId: "cat-cabinet",
    hardware: [ { id: "drawer", qty: 3 }, { id: "leg", qty: 4 } ],
    laborHours: 5,
    deliveryDays: 12,
  },
  {
    id: "T-03",
    name: "Belső ajtó — bélelt",
    type: "Ajtó",
    author: "Nagy J.",
    version: "1.0",
    rating: 4.5,
    uses: 76,
    updated: "2026-04-10",
    thumb: "door",
    note: "Bélelt belső ajtó, tölgy vagy bükk furnérral. Standard tok mérettel.",
    vars: [
      { key: "width",  label: "Szélesség", unit: "mm", min: 600,  max: 1000, step: 50, default: 800,  kind: "raster" },
      { key: "height", label: "Magasság",  unit: "mm", min: 1900, max: 2200, step: 1,  default: 2050, kind: "analog" },
      { key: "body",   label: "Anyag",     kind: "material", default: "TL-040", options: ["TL-040", "BK-040"] },
    ],
    parts: [
      { name: "Ajtólap",      qty: 1, mat: "{body}", w: "{width}", h: "{height}", t: 40 },
      { name: "Tok bal",      qty: 1, mat: "{body}", w: 80, h: "{height} + 30", t: 30 },
      { name: "Tok jobb",     qty: 1, mat: "{body}", w: 80, h: "{height} + 30", t: 30 },
      { name: "Tok felső",    qty: 1, mat: "{body}", w: "{width} + 60", h: 80, t: 30 },
    ],
    constraints: [],
    categoryId: "cat-door",
    hardware: [ { id: "doorhinge", qty: 3 } ],
    laborHours: 2.5,
    deliveryDays: 7,
  },
  {
    id: "T-04",
    name: "Üres sablon",
    type: "Egyedi",
    author: "—",
    version: "0.1",
    rating: 0,
    uses: 0,
    updated: "—",
    thumb: "empty",
    note: "Kiindulási alap — adj hozzá saját változókat és alkatrészeket.",
    vars: [
      { key: "width",  label: "Szélesség", unit: "mm", min: 100, max: 3000, step: 1, default: 600, kind: "analog" },
      { key: "height", label: "Magasság",  unit: "mm", min: 100, max: 3000, step: 1, default: 600, kind: "analog" },
    ],
    parts: [],
    constraints: [],
    categoryId: null,
    hardware: [],
    laborHours: 0,
    deliveryDays: 0,
  },
];

// Material catalog used as the source for material dropdowns / lookup
const CATALOG_LOOKUP = {
  "EG-3303-18": { name: "Egger 3303 ST10 18mm", t: 18, kind: "korpusz", color: "#dcc4a3" },
  "EG-1133-18": { name: "Egger 1133 ST10 18mm", t: 18, kind: "korpusz", color: "#a18166" },
  "EG-3327-18": { name: "Egger 3327 ST22 18mm", t: 18, kind: "korpusz", color: "#3d3631" },
  "EG-3327-19": { name: "Egger 3327 ST22 19mm", t: 19, kind: "front",   color: "#3d3631" },
  "EG-3303-19": { name: "Egger 3303 ST10 19mm", t: 19, kind: "front",   color: "#dcc4a3" },
  "MDF-019":    { name: "MDF 19mm",             t: 19, kind: "korpusz", color: "#c8b8a0" },
  "HDF-003":    { name: "HDF 3mm fehér",        t: 3,  kind: "hátlap",  color: "#f0ebe1" },
  "MDF-006":    { name: "MDF 6mm",              t: 6,  kind: "hátlap",  color: "#c8b8a0" },
  "TL-040":     { name: "Tölgy 40mm",           t: 40, kind: "tömör",   color: "#b08560" },
  "BK-040":     { name: "Bükk 40mm",            t: 40, kind: "tömör",   color: "#d6b596" },
};

// ──────────────────────────────────────────────────────────────────────────
// Quotes (Sales world)
// ──────────────────────────────────────────────────────────────────────────
const QUOTES = [
  { id: "Q-2426-058", customer: "Bognár Bútor Kft.",       date: "2026-04-26", expires: "2026-05-10", value: 4_280_000, status: "sent",     items: 18, owner: "Szabó A." },
  { id: "Q-2426-057", customer: "Várdai Konyhastúdió",     date: "2026-04-25", expires: "2026-05-09", value: 1_950_000, status: "draft",    items: 7,  owner: "Szabó A." },
  { id: "Q-2426-056", customer: "Doorstar Hungary Zrt.",   date: "2026-04-24", expires: "2026-05-08", value: 12_400_000,status: "approved", items: 42, owner: "Kovács P." },
  { id: "Q-2426-055", customer: "Pesti Ablakműhely",       date: "2026-04-22", expires: "2026-05-06", value: 680_000,   status: "sent",     items: 4,  owner: "Szabó A." },
  { id: "Q-2426-054", customer: "Hegyi Lakberendezés",     date: "2026-04-21", expires: "2026-05-05", value: 2_140_000, status: "approved", items: 11, owner: "Kovács P." },
  { id: "Q-2426-053", customer: "Tóth Konyha & Társa",     date: "2026-04-19", expires: "2026-05-03", value: 1_220_000, status: "rejected", items: 5,  owner: "Szabó A." },
  { id: "Q-2426-052", customer: "Vella Interior Design",   date: "2026-04-18", expires: "2026-05-02", value: 3_810_000, status: "expired",  items: 14, owner: "Kovács P." },
];
const QUOTE_TONE = {
  draft:    { bg: "bg-stone-100",   fg: "text-stone-700",   dot: "bg-stone-400",   label: "Vázlat" },
  sent:     { bg: "bg-sky-50",      fg: "text-sky-700",     dot: "bg-sky-500",     label: "Kiküldve" },
  approved: { bg: "bg-emerald-50",  fg: "text-emerald-700", dot: "bg-emerald-500", label: "Elfogadva" },
  rejected: { bg: "bg-rose-50",     fg: "text-rose-700",    dot: "bg-rose-500",    label: "Elutasítva" },
  expired:  { bg: "bg-amber-50",    fg: "text-amber-700",   dot: "bg-amber-500",   label: "Lejárt" },
  conversionPending: { bg: "bg-teal-50",  fg: "text-teal-700",  dot: "bg-teal-500",  label: "Gyártásra vár" },
  converted: { bg: "bg-teal-100",   fg: "text-teal-800",    dot: "bg-teal-600",    label: "Gyártásban" },
  archived: { bg: "bg-stone-50",    fg: "text-stone-500",   dot: "bg-stone-300",   label: "Archivált" },
};

// Customers (Sales world)
const CUSTOMERS = [
  { id: "C-001", name: "Bognár Bútor Kft.",       city: "Pécs",         contact: "Bognár István",   email: "bognar@bognarbutor.hu", phone: "+36 72 412 333", openOrders: 2, ltv: 18_400_000, since: "2022" },
  { id: "C-002", name: "Várdai Konyhastúdió",     city: "Debrecen",     contact: "Várdai Eszter",   email: "evardai@vardakonyha.hu",phone: "+36 52 234 124", openOrders: 1, ltv: 9_200_000,  since: "2023" },
  { id: "C-003", name: "Doorstar Hungary Zrt.",   city: "Vác",          contact: "Kis Zoltán",      email: "kis.z@doorstar.hu",     phone: "+36 27 123 456", openOrders: 4, ltv: 84_000_000, since: "2019" },
  { id: "C-004", name: "Pesti Ablakműhely",       city: "Budapest",     contact: "Pesti Tamás",     email: "info@pestiablak.hu",    phone: "+36 1 422 100",  openOrders: 1, ltv: 2_400_000,  since: "2024" },
  { id: "C-005", name: "Hegyi Lakberendezés",     city: "Sopron",       contact: "Hegyi Krisztina", email: "hegyi.k@hegyilakk.hu",  phone: "+36 99 312 444", openOrders: 1, ltv: 6_120_000,  since: "2023" },
  { id: "C-006", name: "Vella Interior Design",   city: "Budapest",     contact: "Vella Andrea",    email: "andrea@vellainterior.hu",phone:"+36 1 567 890",   openOrders: 0, ltv: 12_700_000, since: "2022" },
  { id: "C-007", name: "Tóth Konyha & Társa",     city: "Szeged",       contact: "Tóth Béla",       email: "info@tothkonyha.hu",    phone: "+36 62 555 333", openOrders: 0, ltv: 3_800_000,  since: "2024" },
];

// ──────────────────────────────────────────────────────────────────────────
// Shop Floor task queue — per machine
// ──────────────────────────────────────────────────────────────────────────
const SHOPFLOOR_MACHINES = [
  { id: "M-HOLZMA-01",  name: "Holzma HPP380",   kind: "Szabászat",   facility: "Vác — főüzem",      operator: "Nagy J.",  state: "running" },
  { id: "M-BIESSE-01",  name: "Biesse Selco",    kind: "Szabászat",   facility: "Vác — főüzem",      operator: "Tóth K.",  state: "running" },
  { id: "M-HOMAG-01",   name: "Homag KAL 310",   kind: "Élzárás",     facility: "Vác — főüzem",      operator: "Kiss A.",  state: "idle"    },
  { id: "M-BIESSE-02",  name: "Biesse Rover",    kind: "CNC",         facility: "Vác — főüzem",      operator: "—",        state: "idle"    },
  { id: "M-HOLZMA-02",  name: "Holzma CNC",      kind: "CNC",         facility: "Sopron telephely",  operator: "Horváth É.", state: "running" },
];

// Per-machine task queue (cutting plans / edgebanding / cnc tasks)
const SHOPFLOOR_QUEUE = {
  "M-HOLZMA-01": [
    { id: "CP-184-A", kind: "cutting", order: "JT-2426-0184", customer: "Bognár Bútor Kft.", material: "Bükk 18mm",  sheets: 8,  currentSheet: 3, util: 87, runtime: 24, parts: [
      { name: "Oldallap",   w: 800, h: 560, qty: 2 },
      { name: "Fiókfront",  w: 600, h: 140, qty: 4 },
      { name: "Polc",       w: 590, h: 560, qty: 8 },
    ]},
    { id: "CP-184-B", kind: "cutting", order: "JT-2426-0184", customer: "Bognár Bútor Kft.", material: "Tölgy 22mm", sheets: 4,  currentSheet: 0, util: 79, runtime: 0,  parts: [
      { name: "Felső lap",  w: 1200, h: 380, qty: 4 },
      { name: "Alsó lap",   w: 1200, h: 380, qty: 4 },
    ]},
    { id: "CP-180-A", kind: "cutting", order: "JT-2426-0180", customer: "Hegyi Lakberendezés", material: "Bükk 18mm",  sheets: 5, currentSheet: 0, util: 82, runtime: 0, parts: [
      { name: "Korpusz oldallap", w: 720, h: 560, qty: 8 },
    ]},
  ],
  "M-BIESSE-01": [
    { id: "CP-182-A", kind: "cutting", order: "JT-2426-0182", customer: "Doorstar Hungary Zrt.", material: "Tölgy 40mm", sheets: 22, currentSheet: 14, util: 84, runtime: 86, parts: [
      { name: "Ajtólap", w: 800, h: 2050, qty: 8 },
      { name: "Tok",     w: 80,  h: 2080, qty: 16 },
    ]},
    { id: "CP-182-B", kind: "cutting", order: "JT-2426-0182", customer: "Doorstar Hungary Zrt.", material: "MDF 19mm",   sheets: 12, currentSheet: 0, util: 88, runtime: 0,  parts: [] },
  ],
  "M-HOMAG-01": [
    { id: "EB-184-1", kind: "edgeband", order: "JT-2426-0184", customer: "Bognár Bútor Kft.", parts: 14, edge: "ABS 2mm tölgy színazonos", runtime: 0, currentSheet: 0, sheets: 1 },
    { id: "EB-180-1", kind: "edgeband", order: "JT-2426-0180", customer: "Hegyi Lakberendezés", parts: 8, edge: "ABS 1mm fehér",          runtime: 0, currentSheet: 0, sheets: 1 },
  ],
  "M-BIESSE-02": [
    { id: "CN-184-1", kind: "cnc", order: "JT-2426-0184", customer: "Bognár Bútor Kft.", program: "DRILL_CABINET_v2.cnc", runtime: 0, currentSheet: 0, sheets: 1, parts: 24 },
  ],
  "M-HOLZMA-02": [
    { id: "CN-182-1", kind: "cnc", order: "JT-2426-0182", customer: "Doorstar Hungary Zrt.", program: "DOOR_HINGE_M3.cnc", runtime: 14, currentSheet: 0, sheets: 1, parts: 32 },
  ],
};

const SHOPFLOOR_OPERATORS = [
  { name: "Nagy János",  pin: "1234", initials: "NJ", machines: ["M-HOLZMA-01"] },
  { name: "Tóth Kinga",  pin: "2345", initials: "TK", machines: ["M-BIESSE-01", "M-HOMAG-01"] },
  { name: "Kiss András", pin: "3456", initials: "KA", machines: ["M-HOMAG-01", "M-BIESSE-02"] },
  { name: "Horváth Éva", pin: "4567", initials: "HE", machines: ["M-HOLZMA-02"] },
];

// ──────────────────────────────────────────────────────────────────────────
// Specifikációk (Tervezés) — újra-felhasználható, egy vagy több sablonra/
// összeállításra alkalmazható információ-halmaz. A teljes spec-rendszer (kategóriák,
// stílus/műszaki sémák, vasalat-katalógus, ármotor) a `data-specs.js` + `specs-engine.js`
// fájlokban él. Itt csak a sablonok kapnak spec-mezőket (categoryId, hardware, munka/szállítás).
// ──────────────────────────────────────────────────────────────────────────

Object.assign(window, {
  WORLDS, WORLD_ORDER, WORLD_THEMES,
  PARAM_TEMPLATES, CATALOG_LOOKUP,
  QUOTES, QUOTE_TONE, CUSTOMERS,
  SHOPFLOOR_MACHINES, SHOPFLOOR_QUEUE, SHOPFLOOR_OPERATORS,
});
