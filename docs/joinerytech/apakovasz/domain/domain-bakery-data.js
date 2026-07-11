// ──────────────────────────────────────────────────────────────────────────
// domain-bakery-data.js — BAKERY ADAPTER · config + seed
//
//   Az Apakovász domén MINDEN domén-specifikus tudása. A CORE ezt fogyasztja;
//   egyetlen if(domain==='bakery') sincs a magban. Ez a woodwork_domain.md
//   pékség-párja: itt él a receptúra, a sütő-műveletek, a sarzs-/rendelés-FSM.
//
//   Amit egy adapter szállít (lásd CORE_MAP.md §3):
//     1 erőforrások  2 műveletek  3 katalógus  4 receptek
//     5 FSM-láncok   6 lokációk   7 seed
// ──────────────────────────────────────────────────────────────────────────
(function () {
  const TODAY = "2026-06-15";

  // ── 6) LOKÁCIÓK — a mozgás-háló csomópontjai ──────────────────────────────
  const LOCATIONS = [
    { id: "uzem", name: "Pékműhely", short: "Üzem", kind: "production", addr: "Veresegyház, Fő út 55." },
    { id: "bolt", name: "Bolt & Kávézó", short: "Bolt", kind: "retail", addr: "Veresegyház, Fő út 55." },
  ];

  // ── 1) ERŐFORRÁSOK — kapacitás = tálca / óra-sáv (a CORE vödör-tengelye) ───
  //   capacity-vödör itt = hajnali óra-sáv; a furniture napi órát ad helyette.
  const RESOURCES = [
    { id: "MX-SPIRAL", name: "Spirál-dagasztó", op: "dagasztas", capacity: 3, unit: "tészta", facility: "uzem", note: "120 l üst" },
    { id: "PROOF-01",  name: "Kelesztő szekrény", op: "kelesztes", capacity: 10, unit: "kocsi", facility: "uzem" },
    { id: "OV-KOVASZ", name: "Kovász-kemence", op: "sutes", capacity: 8, unit: "tálca", facility: "uzem", note: "kőlapos deck, kenyér" },
    { id: "OV-KONVEKT", name: "Konvektor", op: "sutes", capacity: 12, unit: "tálca", facility: "uzem", note: "péksütemény, légkeveréses" },
    { id: "BENCH-01",  name: "Formázó pad", op: "formazas", capacity: 6, unit: "adag", facility: "uzem" },
  ];

  // ── 2) MŰVELETEK — a PROD_KINDS pékség-párja ──────────────────────────────
  const OPERATIONS = {
    dagasztas: { label: "Dagasztás",  icon: "mixer",  hue: "#6f4a2a", pill: "bg-[#efe1c7] text-[#6f4a2a] border-[#dcc79a]" },
    kelesztes: { label: "Kelesztés",  icon: "clock",  hue: "#3f6079", pill: "bg-[#dde6ec] text-[#3f6079] border-[#bcd0db]" },
    formazas:  { label: "Formázás",   icon: "hand",   hue: "#8a4d1c", pill: "bg-[#f0ddc4] text-[#8a4d1c] border-[#e0bf94]" },
    sutes:     { label: "Sütés",      icon: "flame",  hue: "#bd7f1e", pill: "bg-[#f6e6c0] text-[#9a6410] border-[#e6c87f]" },
  };
  const OP_ORDER = ["dagasztas", "kelesztes", "formazas", "sutes"];

  // ── Alapanyagok (raktári tételek) ─────────────────────────────────────────
  const INGREDIENTS = {
    "L-BL80":    { name: "BL80 búzaliszt", unit: "kg", supplier: "Gyermelyi malom", group: "liszt" },
    "L-ROZS":    { name: "Rozsliszt RL90", unit: "kg", supplier: "Pannon malom", group: "liszt" },
    "L-TONK":    { name: "Tönkölyliszt", unit: "kg", supplier: "Pannon malom", group: "liszt" },
    "L-ALAKOR":  { name: "Alakor (ősbúza) liszt", unit: "kg", supplier: "Első Pesti Malom", group: "liszt" },
    "MAGKEV":    { name: "Magkeverék (lenmag, napraforgó, szezám)", unit: "kg", supplier: "Natursol", group: "adalek" },
    "SO":        { name: "Tengeri só", unit: "kg", supplier: "Natursol", group: "adalek" },
    "KOVASZ":    { name: "Aktív kovász (saját)", unit: "kg", supplier: "saját", group: "kovasz" },
    "ELESZTO":   { name: "Friss élesztő", unit: "kg", supplier: "Natursol", group: "adalek" },
    "VAJ":       { name: "Vaj 82% (Kálvária Farm)", unit: "kg", supplier: "Őrbottyáni Kálvária Farm", group: "tej" },
    "TEJ":       { name: "Friss tej (Kálvária Farm)", unit: "L", supplier: "Őrbottyáni Kálvária Farm", group: "tej" },
    "TOJAS":     { name: "Tojás (M)", unit: "db", supplier: "helyi", group: "tej" },
    "CUKOR":     { name: "Kristálycukor", unit: "kg", supplier: "Natursol", group: "adalek" },
    "CSOKI":     { name: "Étcsokoládé-rúd 55%", unit: "kg", supplier: "Natursol", group: "toltelek" },
    "TURO":      { name: "Túró (Kálvária Farm)", unit: "kg", supplier: "Őrbottyáni Kálvária Farm", group: "toltelek" },
    "KAKAO":     { name: "Kakaós töltelék", unit: "kg", supplier: "Kence Manufaktúra", group: "toltelek" },
  };

  // ── 4) RECEPTEK (BOM) — qty = 1 sarzsra; yield = kész db / sarzs ───────────
  const RECIPES = {
    "R-HAGY": { id: "R-HAGY", name: "Hagyományos kovászos", yield: 14, bom: [
      { itemId: "L-BL80", qty: 10, unit: "kg" }, { itemId: "KOVASZ", qty: 2.5, unit: "kg" },
      { itemId: "SO", qty: 0.2, unit: "kg" } ] },
    "R-ROZS": { id: "R-ROZS", name: "Rozsos kovászos", yield: 12, bom: [
      { itemId: "L-BL80", qty: 6, unit: "kg" }, { itemId: "L-ROZS", qty: 4, unit: "kg" },
      { itemId: "KOVASZ", qty: 2.5, unit: "kg" }, { itemId: "SO", qty: 0.2, unit: "kg" } ] },
    "R-MAGV": { id: "R-MAGV", name: "Magvas kovászos", yield: 12, bom: [
      { itemId: "L-BL80", qty: 9, unit: "kg" }, { itemId: "MAGKEV", qty: 1.5, unit: "kg" },
      { itemId: "KOVASZ", qty: 2.5, unit: "kg" }, { itemId: "SO", qty: 0.2, unit: "kg" } ] },
    "R-TONK": { id: "R-TONK", name: "Tönkölyös kovászos", yield: 12, bom: [
      { itemId: "L-TONK", qty: 10, unit: "kg" }, { itemId: "KOVASZ", qty: 2.5, unit: "kg" },
      { itemId: "SO", qty: 0.2, unit: "kg" } ] },
    "R-ALAK": { id: "R-ALAK", name: "Alakor kovászos", yield: 10, bom: [
      { itemId: "L-ALAKOR", qty: 9, unit: "kg" }, { itemId: "KOVASZ", qty: 2.5, unit: "kg" },
      { itemId: "SO", qty: 0.2, unit: "kg" } ] },
    "R-BAGETT": { id: "R-BAGETT", name: "Bagett", yield: 24, bom: [
      { itemId: "L-BL80", qty: 8, unit: "kg" }, { itemId: "KOVASZ", qty: 1.5, unit: "kg" },
      { itemId: "ELESZTO", qty: 0.08, unit: "kg" }, { itemId: "SO", qty: 0.18, unit: "kg" } ] },
    "R-CROISS": { id: "R-CROISS", name: "Vajas croissant", yield: 36, bom: [
      { itemId: "L-BL80", qty: 5, unit: "kg" }, { itemId: "VAJ", qty: 2.5, unit: "kg" },
      { itemId: "TEJ", qty: 1.4, unit: "L" }, { itemId: "ELESZTO", qty: 0.12, unit: "kg" },
      { itemId: "CUKOR", qty: 0.6, unit: "kg" }, { itemId: "SO", qty: 0.1, unit: "kg" } ] },
    "R-PAINCH": { id: "R-PAINCH", name: "Pain au chocolat", yield: 30, bom: [
      { itemId: "L-BL80", qty: 5, unit: "kg" }, { itemId: "VAJ", qty: 2.5, unit: "kg" },
      { itemId: "CSOKI", qty: 1.2, unit: "kg" }, { itemId: "TEJ", qty: 1.4, unit: "L" },
      { itemId: "ELESZTO", qty: 0.12, unit: "kg" }, { itemId: "CUKOR", qty: 0.6, unit: "kg" } ] },
    "R-KAKAOS": { id: "R-KAKAOS", name: "Kakaós csiga", yield: 28, bom: [
      { itemId: "L-BL80", qty: 4.5, unit: "kg" }, { itemId: "VAJ", qty: 1.2, unit: "kg" },
      { itemId: "KAKAO", qty: 1.4, unit: "kg" }, { itemId: "TEJ", qty: 1.2, unit: "L" },
      { itemId: "ELESZTO", qty: 0.1, unit: "kg" }, { itemId: "CUKOR", qty: 0.8, unit: "kg" } ] },
    "R-TUROS": { id: "R-TUROS", name: "Túrós batyu", yield: 24, bom: [
      { itemId: "L-BL80", qty: 4.5, unit: "kg" }, { itemId: "VAJ", qty: 1.2, unit: "kg" },
      { itemId: "TURO", qty: 2.2, unit: "kg" }, { itemId: "TOJAS", qty: 6, unit: "db" },
      { itemId: "ELESZTO", qty: 0.1, unit: "kg" }, { itemId: "CUKOR", qty: 0.7, unit: "kg" } ] },
  };

  // ── 3) KATALÓGUS — eladható/gyártható termékek ────────────────────────────
  //   recipeId köti a BOM-hoz; channel: hol jelenik meg; mode: rendelésre/készlet.
  const PRODUCTS = [
    { id: "P-HAGY",   name: "Hagyományos kovászos", recipeId: "R-HAGY", group: "kenyer", unit: "db", price: 1490, weight: "1000 g", emoji: "🍞", channels: ["bolt", "webshop"], mode: "both" },
    { id: "P-ROZS",   name: "Rozsos kovászos",     recipeId: "R-ROZS", group: "kenyer", unit: "db", price: 1590, weight: "1000 g", emoji: "🥖", channels: ["bolt", "webshop"], mode: "both" },
    { id: "P-MAGV",   name: "Magvas kovászos",     recipeId: "R-MAGV", group: "kenyer", unit: "db", price: 1690, weight: "900 g", emoji: "🌾", channels: ["bolt", "webshop"], mode: "both" },
    { id: "P-TONK",   name: "Tönkölyös kovászos",  recipeId: "R-TONK", group: "kenyer", unit: "db", price: 1790, weight: "900 g", emoji: "🍞", channels: ["bolt", "webshop"], mode: "order" },
    { id: "P-ALAK",   name: "Alakor kovászos",     recipeId: "R-ALAK", group: "kenyer", unit: "db", price: 2190, weight: "800 g", emoji: "🌾", channels: ["bolt", "webshop"], mode: "order" },
    { id: "P-BAGETT", name: "Bagett",              recipeId: "R-BAGETT", group: "kenyer", unit: "db", price: 590, weight: "250 g", emoji: "🥖", channels: ["bolt", "webshop"], mode: "both" },
    { id: "P-CROISS", name: "Vajas croissant",     recipeId: "R-CROISS", group: "peksutemeny", unit: "db", price: 690, weight: "70 g", emoji: "🥐", channels: ["bolt", "webshop", "cafe"], mode: "stock" },
    { id: "P-PAINCH", name: "Pain au chocolat",    recipeId: "R-PAINCH", group: "peksutemeny", unit: "db", price: 790, weight: "80 g", emoji: "🥐", channels: ["bolt", "cafe"], mode: "stock" },
    { id: "P-KAKAOS", name: "Kakaós csiga",        recipeId: "R-KAKAOS", group: "peksutemeny", unit: "db", price: 590, weight: "90 g", emoji: "🌀", channels: ["bolt", "cafe"], mode: "stock" },
    { id: "P-TUROS",  name: "Túrós batyu",         recipeId: "R-TUROS", group: "peksutemeny", unit: "db", price: 620, weight: "90 g", emoji: "🧀", channels: ["bolt", "cafe"], mode: "stock" },
  ];

  // ── Kávézó / reggeli menü (előkészítve; ebéd hamarosan) ────────────────────
  const CAFE_MENU = [
    { id: "C-SZENDV", name: "Kovászos szendvics — Kéri sonka", price: 1290, kind: "reggeli", uses: ["P-BAGETT"], note: "váckisújfalui Kéri Birtok sonka, Kálvária sajt", ready: true },
    { id: "C-VAJAS",  name: "Vajas-lekváros pirítós", price: 890, kind: "reggeli", uses: ["P-HAGY"], note: "Kálvária Farm vaj, Maminti lekvár", ready: true },
    { id: "C-CROISS", name: "Croissant + kávé", price: 1190, kind: "reggeli", uses: ["P-CROISS"], note: "Geri kávéja", ready: true },
    { id: "C-KAVE",   name: "Kézműves kávé", price: 650, kind: "ital", uses: [], note: "Cora Gergő válogatása", ready: true },
    { id: "C-EBED",   name: "Napi melegszendvics / leves", price: null, kind: "ebed", uses: [], note: "Hamarosan — ebédeltetés indul", ready: false },
  ];

  // ── 5) FSM-LÁNCOK ─────────────────────────────────────────────────────────
  const BATCH_FLOW = {
    order: ["tervezett", "bekeverve", "kelesztes", "sutes", "kesz"],
    states: {
      tervezett: { next: ["bekeverve", "sikertelen", "torolt"] },
      bekeverve: { next: ["kelesztes", "sikertelen"] },
      kelesztes: { next: ["sutes", "sikertelen"] },
      sutes:     { next: ["kesz", "sikertelen"] },
      kesz:      { next: [], terminal: true },
      sikertelen:{ next: ["tervezett"] },
      torolt:    { next: [], terminal: true },
    },
  };
  const BATCH_STATUS = {
    tervezett:  { label: "Tervezett",   pill: "bg-[#ece2c8] text-[#6b5f49] border-[#d8c8a2]", dot: "bg-[#a99a76]" },
    bekeverve:  { label: "Bekeverve",   pill: "bg-[#efe1c7] text-[#6f4a2a] border-[#dcc79a]", dot: "bg-[#6f4a2a]" },
    kelesztes:  { label: "Kel",         pill: "bg-[#dde6ec] text-[#3f6079] border-[#bcd0db]", dot: "bg-[#3f6079]" },
    sutes:      { label: "Sül",         pill: "bg-[#f6e6c0] text-[#9a6410] border-[#e6c87f]", dot: "bg-[#bd7f1e]" },
    kesz:       { label: "Kész",        pill: "bg-[#dfe9cf] text-[#4d6a2c] border-[#c4d6a3]", dot: "bg-[#5f7d39]" },
    sikertelen: { label: "Sikertelen",  pill: "bg-[#f1d9d2] text-[#8f3320] border-[#e2b4a8]", dot: "bg-[#a8402a]" },
    torolt:     { label: "Törölve",     pill: "bg-[#e7e0d2] text-[#8b8170] border-[#d3c9b4]", dot: "bg-[#b3a88f]" },
  };

  const ORDER_FLOW = {
    order: ["uj", "visszaigazolt", "gyartasban", "keszre", "atadva"],
    states: {
      uj:           { next: ["visszaigazolt", "elutasitva"] },
      visszaigazolt:{ next: ["gyartasban", "keszre"] },
      gyartasban:   { next: ["keszre"] },
      keszre:       { next: ["atadva"] },
      atadva:       { next: [], terminal: true },
      elutasitva:   { next: [], terminal: true },
    },
  };
  const ORDER_STATUS = {
    uj:            { label: "Új", pill: "bg-[#ece2c8] text-[#6b5f49] border-[#d8c8a2]" },
    visszaigazolt: { label: "Visszaigazolva", pill: "bg-[#dde6ec] text-[#3f6079] border-[#bcd0db]" },
    gyartasban:    { label: "Sütés alatt", pill: "bg-[#f6e6c0] text-[#9a6410] border-[#e6c87f]" },
    keszre:        { label: "Átvehető", pill: "bg-[#dfe9cf] text-[#4d6a2c] border-[#c4d6a3]" },
    atadva:        { label: "Átadva", pill: "bg-[#e7e0d2] text-[#8b8170] border-[#d3c9b4]" },
    elutasitva:    { label: "Elutasítva", pill: "bg-[#f1d9d2] text-[#8f3320] border-[#e2b4a8]" },
  };

  const MOVE_FLOW = {
    order: ["tervezett", "uton", "kezbesitve"],
    states: {
      tervezett:  { next: ["uton"] },
      uton:       { next: ["kezbesitve"] },
      kezbesitve: { next: [], terminal: true },
    },
  };
  const MOVE_STATUS = {
    tervezett:  { label: "Indulásra vár", pill: "bg-[#ece2c8] text-[#6b5f49] border-[#d8c8a2]", dot: "bg-[#a99a76]" },
    uton:       { label: "Úton", pill: "bg-[#f6e6c0] text-[#9a6410] border-[#e6c87f]", dot: "bg-[#bd7f1e]" },
    kezbesitve: { label: "Kézbesítve", pill: "bg-[#dfe9cf] text-[#4d6a2c] border-[#c4d6a3]", dot: "bg-[#5f7d39]" },
  };

  // ── Hajnali óra-sávok (a CORE kapacitás-vödör tengelye) ───────────────────
  const BAKE_SLOTS = ["02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00"];

  // ── 7) SEED — mai sütési terv, rendelések, készlet, szállítmányok, trend ───
  // batch.load = tálca; batch.buckets = sütési óra-sáv(ok); resourceId = sütő/stáció.
  const SEED_BATCHES = [
    { id: "B-001", productId: "P-HAGY",   recipeId: "R-HAGY",   qty: 28, load: 4, resourceId: "OV-KOVASZ",  buckets: ["05:00"], op: "sutes", status: "kesz",      bakedAt: "05:00", note: "2 sarzs" },
    { id: "B-002", productId: "P-ROZS",   recipeId: "R-ROZS",   qty: 24, load: 4, resourceId: "OV-KOVASZ",  buckets: ["06:00"], op: "sutes", status: "sutes",     note: "2 sarzs" },
    { id: "B-003", productId: "P-MAGV",   recipeId: "R-MAGV",   qty: 12, load: 2, resourceId: "OV-KOVASZ",  buckets: ["06:00"], op: "sutes", status: "kelesztes", note: "" },
    { id: "B-004", productId: "P-TONK",   recipeId: "R-TONK",   qty: 12, load: 2, resourceId: "OV-KOVASZ",  buckets: ["07:00"], op: "sutes", status: "kelesztes", note: "rendelésre — Várdai" },
    { id: "B-005", productId: "P-ALAK",   recipeId: "R-ALAK",   qty: 10, load: 2, resourceId: "OV-KOVASZ",  buckets: ["07:00"], op: "sutes", status: "tervezett",  note: "rendelésre" },
    { id: "B-006", productId: "P-BAGETT", recipeId: "R-BAGETT", qty: 48, load: 4, resourceId: "OV-KOVASZ",  buckets: ["06:00"], op: "sutes", status: "tervezett",  note: "TÚLTERHELÉS-demó: 06:00 kemence" },
    { id: "B-007", productId: "P-CROISS", recipeId: "R-CROISS", qty: 72, load: 6, resourceId: "OV-KONVEKT", buckets: ["04:00", "05:00"], op: "sutes", status: "kesz", bakedAt: "05:00", note: "2 sarzs" },
    { id: "B-008", productId: "P-PAINCH", recipeId: "R-PAINCH", qty: 30, load: 4, resourceId: "OV-KONVEKT", buckets: ["05:00"], op: "sutes", status: "sutes",     note: "" },
    { id: "B-009", productId: "P-KAKAOS", recipeId: "R-KAKAOS", qty: 28, load: 4, resourceId: "OV-KONVEKT", buckets: ["06:00"], op: "sutes", status: "sikertelen", failReason: "Túl sötétre sült — sütő hőfok elszállt", note: "PÓTLÁS KELL" },
    { id: "B-010", productId: "P-TUROS",  recipeId: "R-TUROS",  qty: 24, load: 4, resourceId: "OV-KONVEKT", buckets: ["07:00"], op: "sutes", status: "tervezett",  note: "" },
  ];

  // mai rendelések (webshop + telefon) — egyik rendelésre gyártás, másik foglalás
  const SEED_ORDERS = [
    { id: "O-3012", customer: "Várdai Eszter", channel: "webshop", date: TODAY, pickup: "07:30", status: "gyartasban", note: "rendelésre",
      lines: [ { productId: "P-TONK", qty: 2 }, { productId: "P-MAGV", qty: 1 } ] },
    { id: "O-3013", customer: "Kovács Réka", channel: "telefon", date: TODAY, pickup: "08:00", status: "visszaigazolt", note: "",
      lines: [ { productId: "P-HAGY", qty: 1 }, { productId: "P-CROISS", qty: 4 } ] },
    { id: "O-3014", customer: "Nagy Péter", channel: "webshop", date: TODAY, pickup: "16:00", status: "uj", note: "délutáni átvétel",
      lines: [ { productId: "P-ALAK", qty: 1 }, { productId: "P-ROZS", qty: 2 } ] },
    { id: "O-3015", customer: "Szabó Anna", channel: "webshop", date: TODAY, pickup: "09:00", status: "keszre", note: "fizetve",
      lines: [ { productId: "P-BAGETT", qty: 3 } ] },
  ];

  // készlet — alapanyag (üzem) + kész termék (bolt). expiry néhány tételen.
  const SEED_LOTS = [
    // alapanyag az üzemben
    { id: "LOT-1", itemId: "L-BL80", qty: 180, location: "uzem", expiry: "2026-09-10" },
    { id: "LOT-2", itemId: "L-ROZS", qty: 14, location: "uzem", expiry: "2026-08-20" },
    { id: "LOT-3", itemId: "L-TONK", qty: 22, location: "uzem", expiry: "2026-08-15" },
    { id: "LOT-4", itemId: "L-ALAKOR", qty: 8, location: "uzem", expiry: "2026-08-30" },
    { id: "LOT-5", itemId: "MAGKEV", qty: 6, location: "uzem", expiry: "2026-07-25" },
    { id: "LOT-6", itemId: "SO", qty: 25, location: "uzem" },
    { id: "LOT-7", itemId: "KOVASZ", qty: 14, location: "uzem", expiry: "2026-06-16" },
    { id: "LOT-8", itemId: "ELESZTO", qty: 1.2, location: "uzem", expiry: "2026-06-18" },
    { id: "LOT-9", itemId: "VAJ", qty: 9, location: "uzem", expiry: "2026-06-22" },
    { id: "LOT-10", itemId: "TEJ", qty: 12, location: "uzem", expiry: "2026-06-17" },
    { id: "LOT-11", itemId: "TOJAS", qty: 90, location: "uzem", expiry: "2026-06-28" },
    { id: "LOT-12", itemId: "CUKOR", qty: 30, location: "uzem" },
    { id: "LOT-13", itemId: "CSOKI", qty: 4, location: "uzem", expiry: "2026-12-01" },
    { id: "LOT-14", itemId: "TURO", qty: 3, location: "uzem", expiry: "2026-06-18" },
    { id: "LOT-15", itemId: "KAKAO", qty: 5, location: "uzem", expiry: "2026-10-10" },
    // kész termék a boltban (ami már megérkezett)
    { id: "LOT-B1", itemId: "P-HAGY", qty: 18, location: "bolt", expiry: TODAY },
    { id: "LOT-B2", itemId: "P-CROISS", qty: 40, location: "bolt", expiry: TODAY },
    { id: "LOT-B3", itemId: "P-BAGETT", qty: 22, location: "bolt", expiry: TODAY },
  ];

  // foglalások (webshop készletről foglalás)
  const SEED_RESERVATIONS = [
    { id: "RES-1", itemId: "P-CROISS", location: "bolt", qty: 4, ref: "O-3013" },
    { id: "RES-2", itemId: "P-BAGETT", location: "bolt", qty: 3, ref: "O-3015" },
  ];

  // napközbeni szállítmányok üzem→bolt (folyamatos)
  const SEED_MOVEMENTS = [
    { id: "MV-1", from: "uzem", to: "bolt", departAt: "05:30", status: "kezbesitve", note: "első kör — kenyér + croissant",
      lines: [ { productId: "P-HAGY", qty: 18 }, { productId: "P-CROISS", qty: 40 }, { productId: "P-BAGETT", qty: 22 } ] },
    { id: "MV-2", from: "uzem", to: "bolt", departAt: "07:00", status: "uton", note: "második kör — rozs + magvas",
      lines: [ { productId: "P-ROZS", qty: 24 }, { productId: "P-MAGV", qty: 12 } ] },
    { id: "MV-3", from: "uzem", to: "bolt", departAt: "08:30", status: "tervezett", note: "harmadik kör — péksütemény-pótlás",
      lines: [ { productId: "P-TUROS", qty: 24 }, { productId: "P-PAINCH", qty: 30 } ] },
  ];

  // trend — termékenkénti átlagos napi kereslet (db) az MRP-előrejelzéshez
  const SEED_TREND = {
    "P-HAGY": 30, "P-ROZS": 24, "P-MAGV": 14, "P-TONK": 10, "P-ALAK": 8,
    "P-BAGETT": 50, "P-CROISS": 70, "P-PAINCH": 28, "P-KAKAOS": 26, "P-TUROS": 22,
  };

  // ── A teljes domén-config + seed kicsomagolása a window-ra ─────────────────
  window.BAKERY = {
    TODAY, LOCATIONS, RESOURCES, OPERATIONS, OP_ORDER, INGREDIENTS, RECIPES, PRODUCTS,
    CAFE_MENU, BATCH_FLOW, BATCH_STATUS, ORDER_FLOW, ORDER_STATUS, MOVE_FLOW, MOVE_STATUS,
    BAKE_SLOTS,
    SEED: {
      batches: SEED_BATCHES, orders: SEED_ORDERS, lots: SEED_LOTS,
      reservations: SEED_RESERVATIONS, movements: SEED_MOVEMENTS, trend: SEED_TREND,
      cafe: CAFE_MENU.map((m) => ({ id: m.id, active: m.ready })),
      seq: { order: 3016, batch: 11, move: 4, lot: 16, res: 3 },
    },
  };
})();
