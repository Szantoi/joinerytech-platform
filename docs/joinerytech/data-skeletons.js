// ──────────────────────────────────────────────────────────────────────────
// data-skeletons.js — VÁZ-SABLON KÖNYVTÁR (woodwork_domain §21.5)
//
//   A skeleton (referenciasík-réteg) ÖNÁLLÓAN menthető, névvel ellátott
//   sablon: a 6 fő síkot (+ belső síkokat) EGYSZER kell megadni, utána a
//   bútor-sablonon már csak paraméter (szélesség/magasság/mélység…).
//   Más elnevezésű síkok kellenek egy ajtóhoz, mint egy korpuszhoz — a
//   váz-sablon ezt a természetes nyelvet hordozza ("zsanér-oldal", "tető").
//
//   Modell: { id, name, desc, params:[{key,label,unit,default,min,max}],
//             planes:[{id,label,axis,formula,main}] }
//   A formulák a SAJÁT param-kulcsokra hivatkoznak ({W},{H},{D}…); az
//   alkalmazáskor (applySkeletonPreset) ezek a bútor-sablon paramétereire
//   képződnek le (meglévő változóra VAGY új paraméter jön létre).
//   Store: sim.skeletonPresets[] · CRUD + apply az app-store-ban.
// ──────────────────────────────────────────────────────────────────────────
const SKELETON_PRESETS_SEED = [
  {
    id: "SK-1", name: "Korpusz — 6 fő sík", builtin: true,
    desc: "Befoglaló-vezérelt korpusz: bal/jobb, alsó/tető, elülső/hátsó. A jobb oldallap a jobb síkhoz, a bal a balhoz — a természetes szerkesztés.",
    params: [
      { key: "W", label: "Szélesség", unit: "mm", default: 800,  min: 200, max: 3000 },
      { key: "H", label: "Magasság",  unit: "mm", default: 720,  min: 100, max: 2600 },
      { key: "D", label: "Mélység",   unit: "mm", default: 550,  min: 100, max: 900 },
    ],
    planes: [
      { id: "pl-left",   label: "Bal oldal",  axis: "X", formula: "0",     main: true },
      { id: "pl-right",  label: "Jobb oldal", axis: "X", formula: "{W}",   main: true },
      { id: "pl-bottom", label: "Alsó",       axis: "Z", formula: "0",     main: true },
      { id: "pl-top",    label: "Tető",       axis: "Z", formula: "{H}",   main: true },
      { id: "pl-front",  label: "Elülső",     axis: "Y", formula: "0",     main: true },
      { id: "pl-back",   label: "Hátsó",      axis: "Y", formula: "{D}",   main: true },
    ],
  },
  {
    id: "SK-2", name: "Ajtó / front (lap)", builtin: true,
    desc: "Frontelem-váz: zsanér- és nyitó-oldal, alsó/felső él, homlok- és belső lapsík. A mélység itt a frontvastagság.",
    params: [
      { key: "W", label: "Front szélesség", unit: "mm", default: 396, min: 80,  max: 1200 },
      { key: "H", label: "Front magasság",  unit: "mm", default: 716, min: 80,  max: 2400 },
      { key: "T", label: "Frontvastagság",  unit: "mm", default: 19,  min: 12,  max: 40 },
    ],
    planes: [
      { id: "pl-hinge",  label: "Zsanér-oldal", axis: "X", formula: "0",   main: true },
      { id: "pl-open",   label: "Nyitó-oldal",  axis: "X", formula: "{W}", main: true },
      { id: "pl-bottom", label: "Alsó él",      axis: "Z", formula: "0",   main: true },
      { id: "pl-top",    label: "Felső él",     axis: "Z", formula: "{H}", main: true },
      { id: "pl-face",   label: "Homlok-lap",   axis: "Y", formula: "0",   main: true },
      { id: "pl-inner",  label: "Belső lap",    axis: "Y", formula: "{T}", main: true },
    ],
  },
  {
    id: "SK-3", name: "Sarokszekrény (L)", builtin: true,
    desc: "L-alakú sarok-korpusz: a 6 fő sík + két belső sarok-él sík — a visszaforduló szár szélességével/mélységével paraméterezve.",
    params: [
      { key: "W",  label: "Teljes szélesség",   unit: "mm", default: 900, min: 400, max: 2000 },
      { key: "H",  label: "Magasság",           unit: "mm", default: 720, min: 100, max: 2600 },
      { key: "D",  label: "Teljes mélység",     unit: "mm", default: 900, min: 400, max: 2000 },
      { key: "W2", label: "Szár-szélesség",     unit: "mm", default: 550, min: 200, max: 1200 },
      { key: "D2", label: "Szár-mélység",       unit: "mm", default: 550, min: 200, max: 1200 },
    ],
    planes: [
      { id: "pl-left",    label: "Bal oldal",     axis: "X", formula: "0",          main: true },
      { id: "pl-right",   label: "Jobb oldal",    axis: "X", formula: "{W}",        main: true },
      { id: "pl-bottom",  label: "Alsó",          axis: "Z", formula: "0",          main: true },
      { id: "pl-top",     label: "Tető",          axis: "Z", formula: "{H}",        main: true },
      { id: "pl-front",   label: "Elülső",        axis: "Y", formula: "0",          main: true },
      { id: "pl-back",    label: "Hátsó",         axis: "Y", formula: "{D}",        main: true },
      { id: "pl-cornerx", label: "Sarok-él X",    axis: "X", formula: "{W} - {W2}" },
      { id: "pl-cornery", label: "Sarok-él Y",    axis: "Y", formula: "{D2}" },
    ],
  },
];

window.SKELETON_PRESETS_SEED = SKELETON_PRESETS_SEED;
