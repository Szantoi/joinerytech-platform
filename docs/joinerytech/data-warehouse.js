// ──────────────────────────────────────────────────────────────────────────
// Raktár — zóna-modell (készlet-tétel / lot ELÉRHETŐSÉGI státusza), kivét-
// fogyasztók, kivét-kérelem FSM, és az 5-szintű raktárhely-hierarchia szintjei.
//
// FONTOS: a ZÓNA nem fizikai hely — az a készlet-tétel (lot) availability státusza.
// A szabad (general) zóna mennyisége hajtja a "rendelni kell?" jelzést (trend).
// A fizikai elhelyezkedést a lot `loc` (5-szintű hely) mezője + a hely-regiszter adja.
// ──────────────────────────────────────────────────────────────────────────

// Zónák — egy lot ezen az állapotsoron halad végig az elérhetőség szerint.
// general = szabad készlet; a többi valamilyen igényhez kötött (committed).
const WH_ZONES = {
  general: {
    key: "general", label: "Általános", short: "Szabad",
    desc: "Szabad készlet — bármely igényre felhasználható.",
    committed: false,
    pill: "bg-stone-100 text-stone-700 border-stone-200",
    dot: "bg-stone-400", bar: "bg-stone-400", accent: "#78716c",
  },
  project_locked: {
    key: "project_locked", label: "Projekthez zárolt", short: "Zárolt",
    desc: "Projektre érkezett, projektszámhoz zárolt — nem szabad készlet.",
    committed: true, needsProject: true,
    pill: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500", bar: "bg-violet-500", accent: "#7c3aed",
  },
  shop_reserved: {
    key: "shop_reserved", label: "Bolti rendeléshez foglalt", short: "Foglalt",
    desc: "Egy bolti / webshop rendeléshez lefoglalva.",
    committed: true,
    pill: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500", bar: "bg-indigo-500", accent: "#4f46e5",
  },
  commissioned: {
    key: "commissioned", label: "Szállításhoz kommissiózva", short: "Kommissiózva",
    desc: "Kiszedve és összekészítve szállításhoz.",
    committed: true,
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500", bar: "bg-amber-500", accent: "#d97706",
  },
  shippable: {
    key: "shippable", label: "Szállítható", short: "Szállítható",
    desc: "Készen áll a kiadásra / elszállításra.",
    committed: true,
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500", bar: "bg-emerald-500", accent: "#059669",
  },
};
const WH_ZONE_ORDER = ["general", "project_locked", "shop_reserved", "commissioned", "shippable"];

// Engedélyezett zóna-átmenetek (a lista-nézet zóna-mozgatójához).
// Általánosból bármerre; a committed zónák egymás közt és vissza általánosba.
const WH_ZONE_MOVES = {
  general:        ["project_locked", "shop_reserved", "commissioned", "shippable"],
  project_locked: ["commissioned", "shippable", "general"],
  shop_reserved:  ["commissioned", "shippable", "general"],
  commissioned:   ["shippable", "general"],
  shippable:      ["commissioned", "general"],
};

// Trend (rendelni kell?) tónusok — a SZABAD (general) készlet vs. min alapján.
const WH_TREND = {
  ok:       { label: "Rendben",  pill: "bg-teal-50 text-teal-700 border-teal-200",   dot: "bg-teal-500",  bar: "bg-teal-500" },
  low:      { label: "Alacsony", pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", bar: "bg-amber-500" },
  critical: { label: "Kritikus", pill: "bg-rose-50 text-rose-700 border-rose-200",   dot: "bg-rose-500",  bar: "bg-rose-500" },
};

// Kivét-fogyasztók — kik kérhetnek anyagot a raktárból.
const WH_CONSUMERS = {
  gyartas: { key: "gyartas", label: "Gyártás",            icon: "factory",    accent: "#0d9488", pill: "bg-teal-50 text-teal-700 border-teal-200" },
  trade:   { key: "trade",   label: "Kereskedelem (pult)", icon: "storefront", accent: "#ea580c", pill: "bg-orange-50 text-orange-700 border-orange-200" },
  shop:    { key: "shop",    label: "Bolt (webshop)",      icon: "box",        accent: "#0d9488", pill: "bg-teal-50 text-teal-700 border-teal-200" },
  project: { key: "project", label: "Projekt / beépítés",  icon: "briefcase",  accent: "#7c3aed", pill: "bg-violet-50 text-violet-700 border-violet-200" },
  selejt:  { key: "selejt",  label: "Selejt / leltár",     icon: "archive",    accent: "#e11d48", pill: "bg-rose-50 text-rose-700 border-rose-200" },
};
const WH_CONSUMER_ORDER = ["gyartas", "trade", "shop", "project", "selejt"];

// Kivét-kérelem FSM: kért → komissiózva → kiadva (mellék: visszavonva).
const WH_WD_FLOW = {
  kert:        { key: "kert",        label: "Kért",        next: ["komissiozva", "visszavonva"], pill: "bg-stone-100 text-stone-700 border-stone-200", dot: "bg-stone-400" },
  komissiozva: { key: "komissiozva", label: "Komissiózva", next: ["kiadva", "kert", "visszavonva"], pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  kiadva:      { key: "kiadva",      label: "Kiadva",      next: [], terminal: true, pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  visszavonva: { key: "visszavonva", label: "Visszavonva", next: [], terminal: true, pill: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
};
const WH_WD_ORDER = ["kert", "komissiozva", "kiadva", "visszavonva"];

// 5-szintű raktárhely-hierarchia. A Raktár + Tároló KÖTELEZŐ, a többi opcionális
// (Beállítások → Raktárhelyek alatt kapcsolható, mely szinteket kezeli a cég).
// A Telephely szint a meglévő Részlegekből (FACILITIES) jön — egy igazságforrás.
const WH_LEVELS = [
  { key: "telephely", label: "Telephely", mandatory: false, fromFacilities: true,  desc: "Részleg / kirendeltség (a Beállítások → Részlegek listából)." },
  { key: "raktar",    label: "Raktár",    mandatory: true,  desc: "Önálló raktárépület vagy raktár-egység." },
  { key: "helyiseg",  label: "Helyiség",  mandatory: false, desc: "Raktáron belüli helyiség / zóna-terem." },
  { key: "tarolo",    label: "Tároló",    mandatory: true,  desc: "Állvány / polcsor / tárolóegység." },
  { key: "rekesz",    label: "Rekesz",    mandatory: false, desc: "Konkrét polc / rekesz / hely." },
];

Object.assign(window, {
  WH_ZONES, WH_ZONE_ORDER, WH_ZONE_MOVES, WH_TREND,
  WH_CONSUMERS, WH_CONSUMER_ORDER,
  WH_WD_FLOW, WH_WD_ORDER, WH_LEVELS,
});
