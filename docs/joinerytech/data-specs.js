// ──────────────────────────────────────────────────────────────────────────
// data-specs.js — Specifikáció-rendszer törzsadatai (Tervezés)
//
// Moduláris modell:
//   • Spec-kategória (Szekrény / Ajtó / Falpanel …) — FELHASZNÁLÓ által bővíthető.
//     Minden kategória SAJÁT mezősémát definiál a Stílushoz és a Műszakihoz
//     (kötelező alap-mezők + tetszőleges extra propertik). A kategória osztályozza
//     a sablonokat is → ez hajtja a szűrést és az alkalmazhatóságot.
//   • Stílus / Műszaki PÉLDÁNY — egy kategória sémája szerint kitöltött érték-halmaz,
//     opciónként ár-SZORZÓVAL (×) és/vagy FIX felárral (+Ft).
//   • Sablon — üres, parametrikus geometria + szükséges VASALATOK + munkaóra +
//     szállítási idő. Az ANYAG mindig a Stílusból jön (anyag-slot kitöltés).
//
// Árazás (specs-engine.js): anyag (terület × ár) + vasalat (db × katalógus-ár a
// műszaki márkája szerint) + munkadíj, majd a stílus/műszaki ×/+ módosítók és a
// pontossági sáv. A szorzók MINDIG az ALAPRA hatnak (alap×(m−1)+felár összegezve),
// nem kumulatívan — így nincs elszálló növekedés.
// ──────────────────────────────────────────────────────────────────────────

// Anyag ár (Ft / m²) — a CATALOG_LOOKUP kódjaihoz
const MATERIAL_PRICE = {
  "EG-3303-18": 5200, "EG-1133-18": 5400, "EG-3327-18": 6100,
  "EG-3327-19": 6400, "EG-3303-19": 5600, "MDF-019": 4800,
  "HDF-003": 2200, "MDF-006": 2600, "TL-040": 28000, "BK-040": 24000,
};

// Vasalat-katalógus — szerkezeti vasalatok; egységár MÁRKÁNKÉNT
const HARDWARE_CATALOG = {
  hinge:     { id: "hinge",     name: "Csukópánt",         unit: "db",  brands: { Blum: 1450, Hettich: 1280, GTV: 890,  Vegyes: 1100 } },
  drawer:    { id: "drawer",    name: "Fióksín (teljes)",  unit: "pár", brands: { Blum: 6800, Hettich: 5900, GTV: 3900, Vegyes: 5200 } },
  lift:      { id: "lift",      name: "Felnyíló vasalat",  unit: "db",  brands: { Blum: 8900, Hettich: 7600, GTV: 5200, Vegyes: 7000 } },
  shelfsup:  { id: "shelfsup",  name: "Polctartó",         unit: "db",  brands: { Blum: 120,  Hettich: 110,  GTV: 70,   Vegyes: 95 } },
  leg:       { id: "leg",       name: "Állítható láb",     unit: "db",  brands: { Blum: 340,  Hettich: 300,  GTV: 190,  Vegyes: 260 } },
  doorhinge: { id: "doorhinge", name: "Ajtó zsanér",       unit: "db",  brands: { Blum: 2200, Hettich: 1900, GTV: 1300, Vegyes: 1700 } },
};
const HARDWARE_BRANDS = ["Blum", "Hettich", "GTV", "Vegyes"];

const LABOR_RATE = 6500; // Ft / munkaóra

// Pontossági (tűrés) sávok — árszorzó + a becslés ±%-os sávja
const PRECISION_BANDS = {
  precise:  { key: "precise",  label: "± 0.5 mm (precíz)", mult: 1.15, band: 3 },
  standard: { key: "standard", label: "± 1 mm (standard)", mult: 1.00, band: 7 },
  rough:    { key: "rough",    label: "± 2 mm (durva)",    mult: 0.95, band: 14 },
};

// Property-mezők típusai (a séma-szerkesztőben felvehető)
const SPEC_FIELD_KINDS = [
  { kind: "select",   label: "Választó (egy érték)" },
  { kind: "list",     label: "Lista (több érték)" },
  { kind: "material", label: "Anyag-slot" },
  { kind: "number",   label: "Szám" },
  { kind: "bool",     label: "Igen / nem" },
  { kind: "color",    label: "Szín" },
  { kind: "text",     label: "Szöveg" },
];

// ──────────────────────────────────────────────────────────────────────────
// SPEC-KATEGÓRIÁK — kezdő készlet (a felhasználó bővítheti/szerkesztheti)
// Minden mező: { key, label, kind, required, options?[{value,mult,add}], slot?, onTrue?{mult,add}, band? }
// ──────────────────────────────────────────────────────────────────────────
const SPEC_CATEGORIES_SEED = [
  {
    id: "cat-cabinet", name: "Szekrény", icon: "box", color: "violet", builtin: true,
    desc: "Korpuszos bútor — polcos / fiókos szekrények, konyhaelemek.",
    styleFields: [
      { key: "decor",   label: "Szín / dekor", kind: "select", required: true, options: [
        { value: "Natúr tölgy", mult: 1 }, { value: "Antracit", mult: 1.05 }, { value: "Fehér", mult: 1 },
        { value: "Fekete tölgy", mult: 1.08 }, { value: "Kasmír szürke", mult: 1.04 }, { value: "Egyedi RAL", mult: 1, add: 18000 } ] },
      { key: "corpus",  label: "Korpusz anyag", kind: "material", required: true, slot: "body",
        options: [ { value: "EG-3303-18" }, { value: "EG-1133-18" }, { value: "MDF-019" } ] },
      { key: "front",   label: "Front anyag", kind: "material", required: true, slot: "front",
        options: [ { value: "EG-3327-19" }, { value: "EG-3303-19" } ] },
      { key: "back",    label: "Hátlap anyag", kind: "material", required: false, slot: "back",
        options: [ { value: "HDF-003" }, { value: "MDF-006" } ] },
      { key: "surface", label: "Felületkezelés", kind: "select", required: true, options: [
        { value: "Matt", mult: 1 }, { value: "Selyemfény", mult: 1.08 }, { value: "Magasfényű lakk", mult: 1.35, add: 8000 }, { value: "Natúr olajozott", mult: 1.12 } ] },
      { key: "edge",    label: "Élzárás", kind: "select", required: false, options: [
        { value: "ABS 2mm színazonos", mult: 1, add: 2400 }, { value: "ABS 1mm", mult: 1 }, { value: "Lézerélzárás", mult: 1.1, add: 5200 } ] },
      { key: "handle",  label: "Fogantyú / nyitásmód", kind: "select", required: false, options: [
        { value: "Rejtett (gola)", add: 6500 }, { value: "Push-to-open", add: 4200 }, { value: "Fém fogantyú", add: 1800 }, { value: "Gombfogantyú", add: 900 } ] },
      { key: "plinth",  label: "Lábazat / sokli", kind: "select", required: false, options: [
        { value: "Alumínium sokli 100mm", add: 3200 }, { value: "Bútorláb állítható", add: 1600 }, { value: "Lebegő (fali)", add: 5400 } ] },
    ],
    techFields: [
      { key: "thickness", label: "Lapvastagság", kind: "select", required: true, options: [
        { value: "18 mm", mult: 1 }, { value: "18/25 mm", mult: 1.08 }, { value: "25 mm", mult: 1.18 } ] },
      { key: "hardwareBrand", label: "Vasalat-márka", kind: "select", required: true, role: "hardwareBrand", options: [
        { value: "Blum" }, { value: "Hettich" }, { value: "GTV" }, { value: "Vegyes" } ] },
      { key: "softClose", label: "Csukódás-lágyítás (soft-close)", kind: "bool", required: false, onTrue: { add: 4800 } },
      { key: "tolerance", label: "Tűrés / illesztés", kind: "select", required: true, role: "precision", options: [
        { value: "precise", label: "± 0.5 mm (precíz)" }, { value: "standard", label: "± 1 mm (standard)" }, { value: "rough", label: "± 2 mm (durva)" } ] },
    ],
  },
  {
    id: "cat-door", name: "Ajtó", icon: "ruler", color: "amber", builtin: true,
    desc: "Belső ajtók, tokkal — bélelt / dekor / üveges kivitel.",
    styleFields: [
      { key: "leaf",    label: "Ajtólap anyag", kind: "material", required: true, slot: "body",
        options: [ { value: "TL-040" }, { value: "BK-040" } ] },
      { key: "veneer",  label: "Furnér / felület", kind: "select", required: true, options: [
        { value: "Tölgy furnér", mult: 1.1 }, { value: "Bükk furnér", mult: 1 }, { value: "Festett", mult: 1.05, add: 6000 } ] },
      { key: "surface", label: "Felületkezelés", kind: "select", required: true, options: [
        { value: "Matt lakk", mult: 1 }, { value: "Selyemfény", mult: 1.08 }, { value: "Magasfény", mult: 1.3, add: 9000 } ] },
      { key: "glazing", label: "Üvegbetét", kind: "bool", required: false, onTrue: { mult: 1.15, add: 14000 } },
    ],
    techFields: [
      { key: "hardwareBrand", label: "Vasalat-márka", kind: "select", required: true, role: "hardwareBrand", options: [
        { value: "Blum" }, { value: "Hettich" }, { value: "GTV" }, { value: "Vegyes" } ] },
      { key: "tolerance", label: "Tűrés / illesztés", kind: "select", required: true, role: "precision", options: [
        { value: "precise", label: "± 0.5 mm (precíz)" }, { value: "standard", label: "± 1 mm (standard)" }, { value: "rough", label: "± 2 mm (durva)" } ] },
    ],
  },
  {
    id: "cat-panel", name: "Falpanel", icon: "layers", color: "teal", builtin: true,
    desc: "Dekor falpanelek, burkolatok — mintázható felületek.",
    styleFields: [
      { key: "surfaceMat", label: "Panel anyag", kind: "material", required: true, slot: "body",
        options: [ { value: "MDF-019" }, { value: "EG-3303-18" } ] },
      { key: "pattern",  label: "Mintázat (lista)", kind: "list", required: false, options: [
        { value: "Hosszanti léc", add: 3200 }, { value: "Rombusz", mult: 1.2, add: 5400 }, { value: "Sima", mult: 1 }, { value: "3D dombornyomott", mult: 1.35, add: 8800 } ] },
      { key: "finish",   label: "Felület", kind: "select", required: true, options: [
        { value: "Matt", mult: 1 }, { value: "Bársony", mult: 1.12 }, { value: "Magasfény", mult: 1.3 } ] },
    ],
    techFields: [
      { key: "thickness", label: "Vastagság", kind: "select", required: true, options: [
        { value: "12 mm", mult: 0.95 }, { value: "18 mm", mult: 1 }, { value: "25 mm", mult: 1.15 } ] },
      { key: "tolerance", label: "Tűrés / illesztés", kind: "select", required: true, role: "precision", options: [
        { value: "precise", label: "± 0.5 mm (precíz)" }, { value: "standard", label: "± 1 mm (standard)" }, { value: "rough", label: "± 2 mm (durva)" } ] },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────
// STÍLUS / MŰSZAKI PÉLDÁNYOK — kezdő készlet (egy kategória sémáját töltik ki)
// ──────────────────────────────────────────────────────────────────────────
const STYLES_SEED = [
  { id: "ST-01", categoryId: "cat-cabinet", name: "Skandi tölgy — matt", status: "active",
    note: "Alapértelmezett lakossági kivitel.",
    values: { decor: "Natúr tölgy", corpus: "EG-3303-18", front: "EG-3303-19", back: "HDF-003", surface: "Matt", edge: "ABS 2mm színazonos", handle: "Rejtett (gola)", plinth: "Alumínium sokli 100mm" } },
  { id: "ST-02", categoryId: "cat-cabinet", name: "Premium antracit — selyemfény", status: "active",
    note: "Magasabb kategóriás konyhák.",
    values: { decor: "Antracit", corpus: "EG-1133-18", front: "EG-3327-19", back: "MDF-006", surface: "Selyemfény", edge: "Lézerélzárás", handle: "Push-to-open", plinth: "Lebegő (fali)" } },
  { id: "ST-03", categoryId: "cat-door", name: "Tölgy bélelt ajtó", status: "active",
    note: "Klasszikus belső ajtó.",
    values: { leaf: "TL-040", veneer: "Tölgy furnér", surface: "Matt lakk", glazing: false } },
  { id: "ST-04", categoryId: "cat-panel", name: "Léc-dekor falpanel", status: "active",
    note: "Nappali akcentfal.",
    values: { surfaceMat: "MDF-019", pattern: ["Hosszanti léc"], finish: "Bársony" } },
];

const TECHSPECS_SEED = [
  { id: "MS-01", categoryId: "cat-cabinet", name: "Standard gyártási előírás", status: "active",
    note: "Általános korpusz- és vasalatszabvány.",
    values: { thickness: "18/25 mm", hardwareBrand: "Blum", softClose: true, tolerance: "standard" } },
  { id: "MS-02", categoryId: "cat-cabinet", name: "Gazdaságos — GTV", status: "active",
    note: "Ár-érzékeny szegmens.",
    values: { thickness: "18 mm", hardwareBrand: "GTV", softClose: false, tolerance: "rough" } },
  { id: "MS-03", categoryId: "cat-door", name: "Ajtó — precíz", status: "active",
    note: "Szoros illesztés.",
    values: { hardwareBrand: "Hettich", tolerance: "precise" } },
  { id: "MS-04", categoryId: "cat-panel", name: "Falpanel — standard", status: "active",
    note: "",
    values: { thickness: "18 mm", tolerance: "standard" } },
];

const SPEC_STATUS_TONE = {
  active:   { bg: "bg-emerald-50", fg: "text-emerald-700", dot: "bg-emerald-500", label: "Aktív" },
  archived: { bg: "bg-stone-100",  fg: "text-stone-500",   dot: "bg-stone-400",   label: "Archivált" },
};

// Accent → Tailwind class map (literal class names required)
const SPEC_ACCENT = {
  violet: { chipBg: "bg-violet-50", chipFg: "text-violet-700", chipBd: "border-violet-200", solid: "bg-violet-600", solidHover: "hover:bg-violet-700", iconBg: "bg-violet-100", iconFg: "text-violet-700", tabActive: "bg-violet-600 text-white", softBd: "border-violet-200", dot: "bg-violet-500" },
  teal:   { chipBg: "bg-teal-50",   chipFg: "text-teal-700",   chipBd: "border-teal-200",   solid: "bg-teal-600",   solidHover: "hover:bg-teal-700",   iconBg: "bg-teal-100",   iconFg: "text-teal-700",   tabActive: "bg-teal-600 text-white",   softBd: "border-teal-200",   dot: "bg-teal-500" },
  amber:  { chipBg: "bg-amber-50",  chipFg: "text-amber-700",  chipBd: "border-amber-200",  solid: "bg-amber-600",  solidHover: "hover:bg-amber-700",  iconBg: "bg-amber-100",  iconFg: "text-amber-700",  tabActive: "bg-amber-600 text-white",  softBd: "border-amber-200",  dot: "bg-amber-500" },
  stone:  { chipBg: "bg-stone-100", chipFg: "text-stone-700",  chipBd: "border-stone-200",  solid: "bg-stone-800",  solidHover: "hover:bg-stone-900",  iconBg: "bg-stone-200",  iconFg: "text-stone-700",  tabActive: "bg-stone-800 text-white",  softBd: "border-stone-200",  dot: "bg-stone-500" },
  rose:   { chipBg: "bg-rose-50",   chipFg: "text-rose-700",   chipBd: "border-rose-200",   solid: "bg-rose-600",   solidHover: "hover:bg-rose-700",   iconBg: "bg-rose-100",   iconFg: "text-rose-700",   tabActive: "bg-rose-600 text-white",   softBd: "border-rose-200",   dot: "bg-rose-500" },
  sky:    { chipBg: "bg-sky-50",    chipFg: "text-sky-700",    chipBd: "border-sky-200",    solid: "bg-sky-600",    solidHover: "hover:bg-sky-700",    iconBg: "bg-sky-100",    iconFg: "text-sky-700",    tabActive: "bg-sky-600 text-white",    softBd: "border-sky-200",    dot: "bg-sky-500" },
};
const SPEC_ACCENT_KEYS = ["violet", "teal", "amber", "stone", "rose", "sky"];

Object.assign(window, {
  MATERIAL_PRICE, HARDWARE_CATALOG, HARDWARE_BRANDS, LABOR_RATE, PRECISION_BANDS,
  SPEC_FIELD_KINDS, SPEC_CATEGORIES_SEED, STYLES_SEED, TECHSPECS_SEED,
  SPEC_STATUS_TONE, SPEC_ACCENT, SPEC_ACCENT_KEYS,
});
