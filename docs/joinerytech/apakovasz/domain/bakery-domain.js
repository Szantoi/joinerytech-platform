// ──────────────────────────────────────────────────────────────────────────
// bakery-domain.js — A DOMÉN-ADAPTER (pékség)
// Csak ADAT + FSM-definíciók, amiket a CORE motorok fogyasztanak.
// NINCS benne vezérlés-logika. Lásd CORE_MAP.md §2.
// ──────────────────────────────────────────────────────────────────────────
(function () {
  const makeFSM = window.CoreFSM.makeFSM;

  // ── 2.a Állomások (a CapacityEngine bucket-jei) — a két KEMENCE a véges erőforrás ──
  // (a dagasztás/kelesztés művelet, nem szűk keresztmetszet — lásd OPERATIONS)
  const STATIONS = [
    { id: 'kemence-ko',  label: 'Kőkemence',    kind: 'sutes', dailyHours: 8, tepsi: 8 },
    { id: 'kemence-lk',  label: 'Légkeveréses', kind: 'sutes', dailyHours: 8, tepsi: 10 },
  ];

  // ── 2.b Műveletek (a RouteEngine lépései) ──────────────────────────────────
  const OPERATIONS = {
    dagasztas:  { label: 'Dagasztás',  station: 'dagaszto' },
    kelesztes:  { label: 'Kelesztés',  station: 'keleszto' },
    formazas:   { label: 'Formázás',   station: null },
    sutes:      { label: 'Sütés',      station: 'kemence' },
    hutes:      { label: 'Hűtés',      station: null },
    csomagolas: { label: 'Csomagolás', station: null },
  };

  // ── Alapanyag mértékegység-kódok ───────────────────────────────────────────
  // ── 2.c Termékek + recept-BOM (a BomEngine tápláléka) ──────────────────────
  // bom mennyiségek = 1 DARAB termékhez. route = műveletsor + perc/sarzs (nem db).
  const PRODUCTS = [
    {
      id: 'cipo', name: 'Kovászos cipó', emoji: '🍞', unit: 'db', price: 1490,
      oven: 'kemence-ko', bakeMin: 45, batchSize: 16, shelfLife: 2,
      route: ['dagasztas', 'kelesztes', 'formazas', 'sutes', 'hutes'],
      bom: [
        { material: 'liszt-bl55', qty: 0.45, unit: 'kg' },
        { material: 'liszt-tk',   qty: 0.05, unit: 'kg' },
        { material: 'viz',        qty: 0.35, unit: 'l' },
        { material: 'so',         qty: 0.01, unit: 'kg' },
        { material: 'kovasz',     qty: 0.12, unit: 'kg' },
      ],
    },
    {
      id: 'rozs', name: 'Rozsos kovászos', emoji: '🥖', unit: 'db', price: 1690,
      oven: 'kemence-ko', bakeMin: 50, batchSize: 14, shelfLife: 3,
      route: ['dagasztas', 'kelesztes', 'formazas', 'sutes', 'hutes'],
      bom: [
        { material: 'liszt-rozs', qty: 0.30, unit: 'kg' },
        { material: 'liszt-bl55', qty: 0.20, unit: 'kg' },
        { material: 'viz',        qty: 0.38, unit: 'l' },
        { material: 'so',         qty: 0.011, unit: 'kg' },
        { material: 'kovasz',     qty: 0.14, unit: 'kg' },
      ],
    },
    {
      id: 'magvas', name: 'Magvas kovászos', emoji: '🌾', unit: 'db', price: 1790,
      oven: 'kemence-ko', bakeMin: 48, batchSize: 14, shelfLife: 3,
      route: ['dagasztas', 'kelesztes', 'formazas', 'sutes', 'hutes'],
      bom: [
        { material: 'liszt-bl55', qty: 0.40, unit: 'kg' },
        { material: 'magkeverek', qty: 0.08, unit: 'kg' },
        { material: 'viz',        qty: 0.34, unit: 'l' },
        { material: 'so',         qty: 0.01, unit: 'kg' },
        { material: 'kovasz',     qty: 0.12, unit: 'kg' },
      ],
    },
    {
      id: 'bagett', name: 'Kovászos bagett', emoji: '🥖', unit: 'db', price: 690,
      oven: 'kemence-ko', bakeMin: 25, batchSize: 24, shelfLife: 1,
      route: ['dagasztas', 'kelesztes', 'formazas', 'sutes'],
      bom: [
        { material: 'liszt-bl55', qty: 0.22, unit: 'kg' },
        { material: 'viz',        qty: 0.15, unit: 'l' },
        { material: 'so',         qty: 0.005, unit: 'kg' },
        { material: 'kovasz',     qty: 0.06, unit: 'kg' },
      ],
    },
    {
      id: 'croissant', name: 'Vajas croissant', emoji: '🥐', unit: 'db', price: 590,
      oven: 'kemence-lk', bakeMin: 22, batchSize: 30, shelfLife: 1,
      route: ['dagasztas', 'kelesztes', 'formazas', 'sutes'],
      bom: [
        { material: 'liszt-bl55', qty: 0.06, unit: 'kg' },
        { material: 'vaj',        qty: 0.03, unit: 'kg' },
        { material: 'tej',        qty: 0.02, unit: 'l' },
        { material: 'cukor',      qty: 0.008, unit: 'kg' },
        { material: 'tojas',      qty: 0.2, unit: 'db' },
        { material: 'eleszto',    qty: 0.002, unit: 'kg' },
      ],
    },
    {
      id: 'kakaos', name: 'Kakaós csiga', emoji: '🌀', unit: 'db', price: 520,
      oven: 'kemence-lk', bakeMin: 20, batchSize: 28, shelfLife: 1,
      route: ['dagasztas', 'kelesztes', 'formazas', 'sutes'],
      bom: [
        { material: 'liszt-bl55', qty: 0.05, unit: 'kg' },
        { material: 'vaj',        qty: 0.02, unit: 'kg' },
        { material: 'cukor',      qty: 0.012, unit: 'kg' },
        { material: 'kakao',      qty: 0.008, unit: 'kg' },
        { material: 'tojas',      qty: 0.15, unit: 'db' },
        { material: 'eleszto',    qty: 0.002, unit: 'kg' },
      ],
    },
    {
      id: 'turos', name: 'Túrós táska', emoji: '🧀', unit: 'db', price: 560,
      oven: 'kemence-lk', bakeMin: 20, batchSize: 24, shelfLife: 1,
      route: ['dagasztas', 'kelesztes', 'formazas', 'sutes'],
      bom: [
        { material: 'liszt-bl55', qty: 0.05, unit: 'kg' },
        { material: 'vaj',        qty: 0.02, unit: 'kg' },
        { material: 'turo',       qty: 0.04, unit: 'kg' },
        { material: 'cukor',      qty: 0.008, unit: 'kg' },
        { material: 'tojas',      qty: 0.2, unit: 'db' },
      ],
    },
    {
      id: 'zsemle', name: 'Kézműves zsemle', emoji: '🥯', unit: 'db', price: 220,
      oven: 'kemence-lk', bakeMin: 18, batchSize: 40, shelfLife: 1,
      route: ['dagasztas', 'kelesztes', 'formazas', 'sutes'],
      bom: [
        { material: 'liszt-bl55', qty: 0.07, unit: 'kg' },
        { material: 'viz',        qty: 0.04, unit: 'l' },
        { material: 'so',         qty: 0.002, unit: 'kg' },
        { material: 'eleszto',    qty: 0.002, unit: 'kg' },
      ],
    },
  ];

  // ── 2.d Alapanyag-törzs (az InventoryEngine tételei) ───────────────────────
  const MATERIALS = [
    { id: 'liszt-bl55', name: 'BL55 búzaliszt',       unit: 'kg', zone: 'silo',    stock: 220, reorderPoint: 80, pack: 25 },
    { id: 'liszt-tk',   name: 'Teljes kiőrlésű liszt', unit: 'kg', zone: 'silo',    stock: 45,  reorderPoint: 30, pack: 25 },
    { id: 'liszt-rozs', name: 'Rozsliszt',            unit: 'kg', zone: 'silo',    stock: 38,  reorderPoint: 40, pack: 25 },
    { id: 'viz',        name: 'Víz',                  unit: 'l',  zone: 'uzem',    stock: 9999, reorderPoint: 0,  pack: 0 },
    { id: 'so',         name: 'Tengeri só',          unit: 'kg', zone: 'szaraz',  stock: 12,  reorderPoint: 5,  pack: 10 },
    { id: 'kovasz',     name: 'Aktív kovász',         unit: 'kg', zone: 'huto',    stock: 18,  reorderPoint: 8,  pack: 0 },
    { id: 'magkeverek', name: 'Magkeverék',          unit: 'kg', zone: 'szaraz',  stock: 9,   reorderPoint: 6,  pack: 5 },
    { id: 'vaj',        name: 'Sütővaj',             unit: 'kg', zone: 'huto',    stock: 22,  reorderPoint: 10, pack: 5 },
    { id: 'tej',        name: 'Tej',                 unit: 'l',  zone: 'huto',    stock: 30,  reorderPoint: 15, pack: 6 },
    { id: 'cukor',      name: 'Kristálycukor',        unit: 'kg', zone: 'szaraz',  stock: 28,  reorderPoint: 12, pack: 10 },
    { id: 'tojas',      name: 'Tojás (M)',           unit: 'db', zone: 'huto',    stock: 180, reorderPoint: 120, pack: 30 },
    { id: 'kakao',      name: 'Kakaópor',            unit: 'kg', zone: 'szaraz',  stock: 4,   reorderPoint: 3,  pack: 1 },
    { id: 'turo',       name: 'Túró',                unit: 'kg', zone: 'huto',    stock: 6,   reorderPoint: 8,  pack: 5 },
    { id: 'eleszto',    name: 'Friss élesztő',       unit: 'kg', zone: 'huto',    stock: 2.5, reorderPoint: 2,  pack: 0.5 },
  ];
  const ZONES = {
    silo: 'Liszt-silók', szaraz: 'Száraz raktár', huto: 'Hűtő', uzem: 'Üzem', bolt: 'Bolt',
  };

  // ── 2.e FSM-definíciók (a közös makeFSM-ből) ───────────────────────────────
  const FLOWS = {
    // SARZS (sütési tétel) — a "sül → sikertelen" a JoineryTech blokkolt/selejt analógja
    batch: makeFSM({
      order: ['tervezett', 'bekeverve', 'kel', 'sul', 'kesz', 'sikertelen'],
      states: {
        tervezett:  { label: 'Tervezett',  tone: 'slate' },
        bekeverve:  { label: 'Bekeverve',  tone: 'amber' },
        kel:        { label: 'Kel',        tone: 'amber' },
        sul:        { label: 'Sül',        tone: 'crust' },
        kesz:       { label: 'Kész',       tone: 'sage', terminal: true },
        sikertelen: { label: 'Sikertelen', tone: 'ember', terminal: true, requireReason: true },
      },
      transitions: {
        tervezett:  ['bekeverve'],
        bekeverve:  ['kel'],
        kel:        ['sul'],
        sul:        ['kesz', 'sikertelen'],
        kesz:       [],
        sikertelen: ['tervezett'],
      },
    }),
    // RENDELÉS
    order: makeFSM({
      order: ['draft', 'visszaigazolva', 'gyartasban', 'kesz', 'atadva'],
      states: {
        draft:          { label: 'Beérkezett',    tone: 'slate' },
        visszaigazolva: { label: 'Visszaigazolva', tone: 'amber' },
        gyartasban:     { label: 'Gyártásban',     tone: 'crust' },
        kesz:           { label: 'Készen áll',     tone: 'sage' },
        atadva:         { label: 'Átadva',         tone: 'slate', terminal: true },
      },
      transitions: {
        draft:          ['visszaigazolva'],
        visszaigazolva: ['gyartasban'],
        gyartasban:     ['kesz'],
        kesz:           ['atadva'],
        atadva:         [],
      },
    }),
    // SZÁLLÍTMÁNY (üzem→bolt)
    delivery: makeFSM({
      order: ['osszekeszites', 'uton', 'megerkezett'],
      states: {
        osszekeszites: { label: 'Összekészítés', tone: 'slate' },
        uton:          { label: 'Úton',          tone: 'amber' },
        megerkezett:   { label: 'Megérkezett',   tone: 'sage', terminal: true },
      },
      transitions: {
        osszekeszites: ['uton'],
        uton:          ['megerkezett'],
        megerkezett:   [],
      },
    }),
  };

  window.DOMAIN = {
    id: 'bakery',
    stations: STATIONS,
    operations: OPERATIONS,
    products: PRODUCTS,
    materials: MATERIALS,
    zones: ZONES,
    flows: FLOWS,
    productById: function (id) { return PRODUCTS.find(function (p) { return p.id === id; }); },
    materialById: function (id) { return MATERIALS.find(function (m) { return m.id === id; }); },
  };
})();
