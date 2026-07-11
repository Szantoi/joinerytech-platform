// ──────────────────────────────────────────────────────────────────────────
// data-mfgprep.js — Gyártás-előkészítés törzsadatai
//
//   A gyártás-előkészítés (Gyártás → „Előkészítés") a megrendelt / gyártási
//   projektből vezeti le a szükségleteket. Az alap a meglévő SPEC-rendszer:
//   kategória → stílus + műszaki + parametrikus sablon (specs-engine.js).
//   Itt csak a LEVEZETÉSHEZ kellő plusz törzsadat él:
//     • Részleg-termelékenység (kapacitás óra/nap, hatékonyság %, művelet-norma)
//       → ebből számol munkaidőt + átfutást a motor (mfg-prep-engine.js).
//     • Művelet → bérmunka-kiadhatóság (mely folyamat-epik adható ki partnernek).
//     • Elem-kategória → spec-kategória térkép + alap-sablonok a levezetéshez.
// ──────────────────────────────────────────────────────────────────────────

// Lapanyag tábla (Egger standard) — nesting + táblaszám számításhoz
const MFG_SHEET = { w: 2800, h: 2070, kerf: 4, areaM2: (2800 * 2070) / 1e6 }; // ~5.796 m²
const MFG_SHEET_FILL = 0.82; // reális hasznosítható arány egy táblán (hulladék/rés)

// ──────────────────────────────────────────────────────────────────────────
// RÉSZLEGEK — termelékenységi adatok. A munkaidő-norma a szükséglet-mennyiségre
// vetül (alkatrész / élhossz / furat / összeállítási egység / felület m² / tétel).
//   capH  : nettó kapacitás óra / nap (gép- és létszám-függő)
//   eff   : hatékonyság (0–1) — állásidő, beállás, selejt miatt
//   norm  : művelet-specifikus időnorma (óra / mértékegység)
// ──────────────────────────────────────────────────────────────────────────
const MFG_DEPARTMENTS = [
  { id: "dep-cut",    op: "cutting",  name: "Szabászat",        facility: "Vác — főüzem",   capH: 16, eff: 0.92, norm: { perPart: 0.045 },              machines: ["Holzma HPP380", "Biesse Selco WN6"], color: "teal",    icon: "cut" },
  { id: "dep-edge",   op: "edge",     name: "Élzárás",          facility: "Vác — főüzem",   capH: 8,  eff: 0.88, norm: { perMeter: 0.014 },             machines: ["Homag KAL 310", "Brandt KDF 660"],   color: "sky",     icon: "layers" },
  { id: "dep-cnc",    op: "cnc",      name: "CNC megmunkálás",  facility: "Vác — főüzem",   capH: 8,  eff: 0.85, norm: { perHole: 0.018, perPart: 0.02 }, machines: ["Biesse Rover", "Holzma CNC"],        color: "violet",  icon: "cpu" },
  { id: "dep-assemb", op: "assembly", name: "Összeszerelés",    facility: "Vác — főüzem",   capH: 24, eff: 0.90, norm: { perUnit: 1.1 },                machines: ["Szerelőpad 1–3"],                    color: "amber",   icon: "wrench" },
  { id: "dep-surf",   op: "surface",  name: "Felületkezelés",   facility: "Vác — főüzem",   capH: 8,  eff: 0.80, norm: { perM2: 0.28 },                 machines: ["Festűkabin", "Festool BS-1"],        color: "rose",    icon: "drop" },
  { id: "dep-qc",     op: "qc",       name: "Minőségellenőrzés",facility: "Vác — főüzem",   capH: 8,  eff: 0.95, norm: { perUnit: 0.22 },               machines: ["Mérőasztal"],                        color: "stone",   icon: "check" },
];

// ──────────────────────────────────────────────────────────────────────────
// BÉRMUNKÁRA KIADHATÓ MŰVELET-TÍPUSOK — a `sim.outsourceOps` SEED-je.
//   A típusok a Beállítások → Munkafolyamat → Bérmunka alatt szerkeszthetők
//   (létrehozás / átnevezés / leírás / epik-keresőszó / partner-kategóriák).
//   Egy típus a projekt mérföldkő→epik fában megkeres egy folyamat-epiket
//   (`epicMatch` keresőszó → regex), és azt delegálja egy partnernek
//   (B2BHandshake → delegateEpic). Több típus EGYÜTT is kiadható egy olyan
//   partnernek, aki mindet vállalja (`partner.capabilities ⊇ kijelölt op-ok`).
//   Mezők:
//     op         : kulcs (egyezik egy MFG_DEPARTMENTS részleg `op`-jával →
//                  innen jön a részletes munkaidő-info a kiadott csomaghoz)
//     epicMatch  : keresőszó(ak) az epik címére (RegExp-pé fordul, `|` = vagy)
//     makerCats  : alapértelmezett partner-kategória szűrő
// ──────────────────────────────────────────────────────────────────────────
const MFG_OUTSOURCE_OPS = [
  { id: "os-cut",  op: "cutting", label: "Teljes szabászat", icon: "cut",    epicMatch: "szab",                  makerCats: ["Szekrény / tároló", "Ajtó / front", "Falpanel / burkolat"], desc: "Lapszabászat (optimalizált vágóterv + CNC szabás) kiadása lapszabász partnernek." },
  { id: "os-edge", op: "edge",    label: "Élzárás",          icon: "layers", epicMatch: "élzár",                 makerCats: ["Ajtó / front", "Pult / munkalap"],                          desc: "ABS / lézer élzárás kiadása élzáró partnernek." },
  { id: "os-cnc",  op: "cnc",     label: "CNC megmunkálás",  icon: "cpu",    epicMatch: "cnc|furat|megmunk",     makerCats: ["Ajtó / front", "Falpanel / burkolat", "Egyedi bútor"],      desc: "Furatolás, marás kiadása CNC bérmunka partnernek." },
  { id: "os-surf", op: "surface", label: "Festés / felület", icon: "drop",   epicMatch: "felület|fest|lakk|olajoz", makerCats: ["Ajtó / front", "Egyedi bútor"],                          desc: "Lakkozás / festés / olajozás kiadása felületkezelő partnernek." },
];

// Választható ikonok a Beállítások bérmunka-szerkesztőjében
const MFG_OP_ICONS = ["cut", "layers", "cpu", "drop", "wrench", "bolt", "box", "factory", "external"];

// epicMatch keresőszó → biztonságos, kis-nagybetű-független RegExp
function mfgEpicRe(str) {
  try { return new RegExp(String(str || "").trim() || "\\b\\B", "i"); }
  catch (e) { return new RegExp(String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); }
}

// Elem-kategória (MAKER_CATEGORIES / item.elemCategory) → spec-kategória id
const MFG_ELEM_TO_SPECCAT = {
  "Konyhabútor": "cat-cabinet",
  "Szekrény / tároló": "cat-cabinet",
  "Ajtó / front": "cat-door",
  "Pult / munkalap": "cat-cabinet",
  "Falpanel / burkolat": "cat-panel",
  "Egyedi bútor": "cat-cabinet",
};

// Spec-kategória → alap-sablon(ok) a levezetéshez (ha a tétel nem hordoz konfigot)
const MFG_SPECCAT_TEMPLATES = {
  "cat-cabinet": ["T-02", "T-01"],
  "cat-door":    ["T-03"],
  "cat-panel":   ["T-01"],
};

// Előkészítés-állapot megjelenítés
const MFG_PREP_TONE = {
  pending:   { l: "Nincs előkészítve", bg: "bg-stone-100",  fg: "text-stone-600",   dot: "bg-stone-400" },
  generated: { l: "Előkészítve",       bg: "bg-teal-50",    fg: "text-teal-700",    dot: "bg-teal-500" },
  partial:   { l: "Bérmunka folyamatban", bg: "bg-amber-50", fg: "text-amber-700",  dot: "bg-amber-500" },
};

// Készlet-fedezet jelző az anyagszükséglethez
const MFG_COVER_TONE = {
  ok:      { bg: "bg-emerald-50", fg: "text-emerald-700", dot: "bg-emerald-500", l: "Fedezve" },
  partial: { bg: "bg-amber-50",   fg: "text-amber-700",   dot: "bg-amber-500",   l: "Részben" },
  short:   { bg: "bg-rose-50",    fg: "text-rose-700",    dot: "bg-rose-500",    l: "Hiány" },
};

Object.assign(window, {
  MFG_SHEET, MFG_SHEET_FILL, MFG_DEPARTMENTS, MFG_OUTSOURCE_OPS, MFG_OP_ICONS, mfgEpicRe,
  MFG_ELEM_TO_SPECCAT, MFG_SPECCAT_TEMPLATES, MFG_PREP_TONE, MFG_COVER_TONE,
});
