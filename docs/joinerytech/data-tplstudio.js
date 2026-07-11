// ──────────────────────────────────────────────────────────────────────────
// data-tplstudio.js — MŰSZAKI TERVEZÉS: sablon-műhely (template studio)
//
//   A §19.2 (műszaki tervezés) szerep ALKOTÓ rétege: konfigurálható sablonok
//   (PARAM_TEMPLATES-séma: vars + parts-képletek + hardware + constraints)
//   létrehozása, szerkesztése és ÉLETCIKLUS-kezelése — úgy, hogy a kiadott
//   sablont a teljes lánc (konfigurátor → ajánlat → rendelés-tétel config →
//   gyártás-előkészítés deriveItem) fel tudja dolgozni.
//
//   KULCS-ELV: a `window.PARAM_TEMPLATES` a FELOLDÓ-REGISTRY — minden fogyasztó
//   ezt olvassa. A store (sim.designTemplates) sablonjai közül CSAK a `kiadott`
//   státuszú kerül a registry-be (a gyári bázist azonos id-n FELÜLÍRJA, új id-n
//   kiegészíti). A vázlat/ellenőrzés alatti sablon csak a műhelyben látszik →
//   "csak a KIADOTT használható ajánlatban/gyártásban" (cikkszám-governance minta).
//   Szinkron: app-store `syncTemplateRegistry` (in-place mutáció).
// ──────────────────────────────────────────────────────────────────────────

// ── Életciklus-FSM ──────────────────────────────────────────────────────────
// vazlat → ellenorzes → kiadott → archivalt
//   ellenorzes → vazlat (visszaküldés, indokkal) · kiadott → ellenorzes (revízió,
//   a kiadott forma `lastReleased` pillanatképként a registry-ben marad) ·
//   archivalt → vazlat (újranyitás).
const TPL_FLOW = {
  vazlat:     { next: ["ellenorzes", "archivalt"] },
  ellenorzes: { next: ["kiadott", "vazlat"] },
  kiadott:    { next: ["ellenorzes", "archivalt"] },
  archivalt:  { next: ["vazlat"] },
};
const TPL_STATUS = {
  vazlat:     { label: "Vázlat",      pill: "bg-stone-100 text-stone-700 border-stone-200",       dot: "bg-stone-400" },
  ellenorzes: { label: "Ellenőrzés",  pill: "bg-amber-50 text-amber-700 border-amber-200",        dot: "bg-amber-500" },
  kiadott:    { label: "Kiadott",     pill: "bg-emerald-50 text-emerald-700 border-emerald-200",  dot: "bg-emerald-500" },
  archivalt:  { label: "Archivált",   pill: "bg-stone-100 text-stone-400 border-stone-200",       dot: "bg-stone-300" },
};
const TPL_STATUS_ORDER = ["vazlat", "ellenorzes", "kiadott", "archivalt"];

// ── CSATLAKOZÁS-KOORDINÁTÁK — lap-alkatrész: 2 LAP (A/B) + 4 ÉL ─────────────
//   A sablon-alkatrész téglalap (w × h): a felső/alsó él hossza = w, a bal/jobb
//   élé = h. A kapcsolódási hivatkozás (ref) ezekre mutat — Inventor-kényszer minta.
const TPL_PART_REFS = [
  { key: "face-a",      label: "Lap A (szín)",     short: "Lap A", kind: "face" },
  { key: "face-b",      label: "Lap B (hátoldal)", short: "Lap B", kind: "face" },
  { key: "edge-top",    label: "Él — felső",       short: "Él↑",  kind: "edge", dim: "w" },
  { key: "edge-bottom", label: "Él — alsó",        short: "Él↓",  kind: "edge", dim: "w" },
  { key: "edge-left",   label: "Él — bal",         short: "Él←",  kind: "edge", dim: "h" },
  { key: "edge-right",  label: "Él — jobb",        short: "Él→",  kind: "edge", dim: "h" },
];
const TPL_REF_BY_KEY = Object.fromEntries(TPL_PART_REFS.map((r) => [r.key, r]));

// Kapcsolat-típus a két hivatkozásból SZÁRMAZIK (nem kézzel választott):
//   él+él → el-el · él+lap → el-lap · lap+lap → lap-lap (felfekvés/duplázás).
//   A gérbe vágás az él–él kapcsolat VARIÁNSA (joint.ger) — párosított 45°.
const TPL_JOINT_KINDS = {
  "el-el":   { label: "Él – Él",   pill: "bg-sky-50 text-sky-700 border-sky-200" },
  "el-lap":  { label: "Él – Lap",  pill: "bg-teal-50 text-teal-700 border-teal-200" },
  "lap-lap": { label: "Lap – Lap", pill: "bg-violet-50 text-violet-700 border-violet-200" },
};

// ── Megmunkálás-katalógus a csatlakozásokhoz ─────────────────────────────
//   ops = mely faipari műveletet (WW_OPS kulcs) igényli az alkatrész útvonalán
//   → a gyártás-előkészítés per-alkatrész útvonala (wwPartOps) EBBŐL bővül.
const TPL_MACHINING = {
  koldokcsap: { key: "koldokcsap", label: "Köldökcsap (8×35)",      ops: ["furat"], note: "Fúrt csaphely mindkét oldalon, ragasztással." },
  excenter:   { key: "excenter",   label: "Excenter + csap",         ops: ["furat"], note: "Oldható kötés — excenter-ház + vonócsap furatok." },
  lamello:    { key: "lamello",    label: "Lamelló",                 ops: ["maras"], note: "Lamelló-marás mindkét félben, ragasztással." },
  domino:     { key: "domino",     label: "Dominó",                  ops: ["maras"], note: "Dominó-csap marás — erősebb, mint a lamelló." },
  horony:     { key: "horony",     label: "Horony / aljazás",        ops: ["maras"], note: "Horonyba ültetés (pl. hátfal, fiókfenék)." },
  csavar:     { key: "csavar",     label: "Csavarozás (confirmat)",  ops: ["furat"], note: "Átmenő + menetes furat, süllyesztéssel." },
  csapozas:   { key: "csapozas",   label: "Csapozás (anyagban)",     ops: ["maras"], note: "Anyagban kialakított csap — marás mindkét félben." },
  polcfurat:  { key: "polcfurat",  label: "Polcfurat-sor (32 mm)",   ops: ["furat"], note: "Állítható polc — furatsor a lapban." },
  ragasztas:  { key: "ragasztas",  label: "Ragasztás",               ops: [],        note: "Csak ragasztás — nincs külön megmunkálás." },
};
const TPL_MACHINING_ORDER = ["koldokcsap", "excenter", "lamello", "domino", "horony", "csavar", "csapozas", "polcfurat", "ragasztas"];

// ── TplEngine — tiszta számítások ───────────────────────────────────────────
const TplEngine = {
  canGo(tpl, to) { const st = TPL_FLOW[tpl.status]; return !!(st && st.next.includes(to)); },
  nextStates(tpl) { const st = TPL_FLOW[tpl.status]; return st ? st.next.slice() : []; },
  // Teljesség a KIADÁSHOZ (a "Kiadás" gomb e nélkül LEZÁRT):
  //   név + kategória + ≥1 alkatrész + minden alkatrész-sor kitöltve (név/db/szél/mag/anyag)
  //   + ≥1 szabad változó + munkaóra > 0.
  completeness(tpl) {
    const parts = tpl.parts || [];
    const partsOk = parts.length > 0 && parts.every((p) =>
      (p.name || "").trim() && String(p.qty ?? "").trim() !== "" &&
      String(p.w ?? "").trim() !== "" && String(p.h ?? "").trim() !== "" && String(p.mat ?? "").trim() !== "");
    const checks = [
      { key: "name",  label: "Megnevezés",                          ok: !!(tpl.name || "").trim() },
      { key: "cat",   label: "Spec-kategória",                      ok: !!tpl.categoryId },
      { key: "vars",  label: "Legalább 1 paraméter (változó)",      ok: (tpl.vars || []).length > 0 },
      { key: "parts", label: "Alkatrész-sorok hiánytalanul",        ok: partsOk },
      { key: "joints", label: "Csatlakozások érvényesek",           ok: (tpl.joints || []).every((j) => TplEngine.jointValid(tpl, j)) },
      ...(tpl.skeleton && window.Skel ? [{ key: "skel", label: "Teljes kényszerezettség (nincs szabad érintkezés / ütközés)", ok: (() => { try { const dv = {}; (tpl.vars || []).forEach((v) => { dv[v.key] = v.default; }); return window.Skel.solve(tpl, dv).errors.length === 0; } catch (e) { return true; } })() }] : []),
      { key: "labor", label: "Tervezett munkaóra (> 0)",            ok: (Number(tpl.laborHours) || 0) > 0 },
    ];
    const missing = checks.filter((c) => !c.ok).map((c) => c.label);
    return { checks, missing, ready: missing.length === 0 };
  },
  // Verzió-léptetés kiadáskor: <1 → 1.0, egyébként +0.1
  nextVersion(tpl) {
    const v = parseFloat(tpl.version) || 0;
    return v < 1 ? "1.0" : String(Math.round((v + 0.1) * 10) / 10);
  },
  // Kapcsolat-típus a két hivatkozásból (él+él / él+lap / lap+lap)
  jointKind(j) {
    const a = (TPL_REF_BY_KEY[(j.a || {}).ref] || {}).kind, b = (TPL_REF_BY_KEY[(j.b || {}).ref] || {}).kind;
    if (a === "edge" && b === "edge") return "el-el";
    if (a === "face" && b === "face") return "lap-lap";
    return "el-lap";
  },
  // Érvényes-e a csatlakozás a sablon alkatrészeire nézve
  jointValid(tpl, j) {
    const names = (tpl.parts || []).map((p) => p.name);
    return !!(j && j.a && j.b && names.includes(j.a.part) && names.includes(j.b.part) &&
      TPL_REF_BY_KEY[j.a.ref] && TPL_REF_BY_KEY[j.b.ref] && j.machining);
  },
  // GÉR-csatlakozásokból származtatott él-jelölés EGY alkatrészre (a feloldott
  //   méretekkel): felső/alsó él hossza = rW, bal/jobb = rH; a hosszabb dimenzió
  //   éle a "hosszú él". A szabásjegyzék GV-jelölése EBBŐL + a kézi partMiters-ből épül.
  jointMiters(tpl, partName, rW, rH) {
    let short = 0, long = 0;
    (tpl.joints || []).forEach((j) => {
      if (!j.ger || this.jointKind(j) !== "el-el") return;
      [j.a, j.b].forEach((side) => {
        if (!side || side.part !== partName) return;
        const ref = TPL_REF_BY_KEY[side.ref];
        if (!ref || ref.kind !== "edge") return;
        const len = ref.dim === "w" ? rW : rH;
        const other = ref.dim === "w" ? rH : rW;
        if (len >= other) long = Math.min(2, long + 1); else short = Math.min(2, short + 1);
      });
    });
    return { short, long };
  },
  // Megmunkálás-igény (WW_OPS kulcsok) EGY alkatrészre a csatlakozásokból
  jointOps(tpl, partName) {
    const out = new Set();
    (tpl.joints || []).forEach((j) => {
      if (![(j.a || {}).part, (j.b || {}).part].includes(partName)) return;
      const m = TPL_MACHINING[j.machining];
      (m ? m.ops : []).forEach((o) => out.add(o));
    });
    return Array.from(out);
  },
  // A sablon képleteiben használható tokenek (a vars kulcsaiból)
  tokens(tpl) {
    const out = [];
    (tpl.vars || []).forEach((v) => {
      if (v.kind === "material") out.push(`{${v.key}}`, `{${v.key}.t}`);
      else out.push(`{${v.key}}`);
    });
    return out;
  },
};

// ── Seed: 1 felhasználó-alkotta sablon VÁZLAT állapotban (a flow demója) ────
const DESIGN_TEMPLATES_SEED = [
  {
    id: "T-10",
    name: "TV-fal nyitott polcos elem",
    type: "Szekrény",
    author: "Szabó Anna",
    createdBy: "Szabó Anna",
    version: "0.1",
    rating: 0, uses: 0,
    updated: "2026-06-09",
    thumb: "cabinet",
    note: "Nappali TV-fal nyitott eleme — hátlap nélkül, állítható polccal. Vázlat: ellenőrzésre vár.",
    status: "vazlat",
    baseId: null,
    lastReleased: null,
    history: [{ at: "2026-06-09", text: "Vázlat létrehozva (Szabó Anna) — műszaki tervezés" }],
    vars: [
      { key: "width",   label: "Szélesség",     unit: "mm", min: 400, max: 1600, step: 50, default: 900, kind: "raster" },
      { key: "height",  label: "Magasság",      unit: "mm", min: 300, max: 1200, step: 1,  default: 600, kind: "analog" },
      { key: "depth",   label: "Mélység",       unit: "mm", min: 250, max: 450,  step: 50, default: 350, kind: "raster" },
      { key: "body",    label: "Korpusz anyag", kind: "material", default: "EG-3303-18", options: ["EG-3303-18", "EG-1133-18"] },
      { key: "shelves", label: "Polcok",        unit: "db", min: 0, max: 3, step: 1, default: 1, kind: "raster" },
    ],
    parts: [
      { name: "Bal oldallap",  qty: 1, mat: "{body}", w: "{depth}", h: "{height}", t: "{body.t}",
        binding: { X: { min: { plane: "pl-left", off: 0 }, max: { plane: "pl-left", off: "{body.t}" } }, Y: { min: { plane: "pl-front", off: 0 }, max: { plane: "pl-back", off: 0 } }, Z: { min: { plane: "pl-bottom", off: 0 }, max: { plane: "pl-top", off: 0 } } } },
      { name: "Jobb oldallap", qty: 1, mat: "{body}", w: "{depth}", h: "{height}", t: "{body.t}",
        binding: { X: { min: { plane: "pl-right", off: "-{body.t}" }, max: { plane: "pl-right", off: 0 } }, Y: { min: { plane: "pl-front", off: 0 }, max: { plane: "pl-back", off: 0 } }, Z: { min: { plane: "pl-bottom", off: 0 }, max: { plane: "pl-top", off: 0 } } } },
      { name: "Felső lap",     qty: 1, mat: "{body}", w: "{width}", h: "{depth}", t: "{body.t}",
        binding: { X: { min: { plane: "pl-left", off: 0 }, max: { plane: "pl-right", off: 0 } }, Y: { min: { plane: "pl-front", off: 0 }, max: { plane: "pl-back", off: 0 } }, Z: { min: { plane: "pl-top", off: "-{body.t}" }, max: { plane: "pl-top", off: 0 } } } },
      { name: "Alsó lap",      qty: 1, mat: "{body}", w: "{width} - 2 × {body.t}", h: "{depth}", t: "{body.t}",
        binding: { X: { min: { plane: "pl-left", off: "{body.t}" }, max: { plane: "pl-right", off: "-{body.t}" } }, Y: { min: { plane: "pl-front", off: 0 }, max: { plane: "pl-back", off: 0 } }, Z: { min: { plane: "pl-bottom", off: 0 }, max: { plane: "pl-bottom", off: "{body.t}" } } } },
      { name: "Polc",          qty: "{shelves}", mat: "{body}", w: "{width} - 2 × {body.t}", h: "{depth} - 20", t: "{body.t}",
        binding: { X: { min: { plane: "pl-left", off: "{body.t}" }, max: { plane: "pl-right", off: "-{body.t}" } }, Y: { min: { plane: "pl-front", off: 10 }, max: { plane: "pl-back", off: "-10" } }, Z: { min: { plane: "pl-shelf", off: 0 }, max: { plane: "pl-shelf", off: "{body.t}" } } } },
    ],
    constraints: [
      { rule: "polc szélesség min 200mm", expr: "{width} - 2 × {body.t} >= 200" },
    ],
    // SKELETON-VÁZ (§21): képletes referenciasíkok — a 6 fő sík + belső polc-sík.
    skeleton: {
      planes: [
        { id: "pl-left",   label: "Bal oldal",  axis: "X", formula: "0",         main: true },
        { id: "pl-right",  label: "Jobb oldal", axis: "X", formula: "{width}",   main: true },
        { id: "pl-bottom", label: "Alsó",       axis: "Z", formula: "0",         main: true },
        { id: "pl-top",    label: "Tető",       axis: "Z", formula: "{height}",  main: true },
        { id: "pl-front",  label: "Elülső",     axis: "Y", formula: "0",         main: true },
        { id: "pl-back",   label: "Hátsó",      axis: "Y", formula: "{depth}",   main: true },
        { id: "pl-shelf",  label: "Polc-sík",   axis: "Z", formula: "282" },
      ],
    },
    // KÖTÉS-objektumok a síkokon (§21.3): kapcsolat CSAK kötés-típussal létezhet.
    //   A gér sarok-kötés — a felső lap TELJES szélességű (45°-os sarok-doboz).
    connections: [
      { id: "c-1", type: "ger",        a: "Bal oldallap",  b: "Felső lap",     plane: "pl-top",   side: "-", offset: 0,  note: "Gérelt sarok — látszó él nélkül" },
      { id: "c-2", type: "ger",        a: "Jobb oldallap", b: "Felső lap",     plane: "pl-top",   side: "-", offset: 0,  note: "Gérelt sarok — pár a balhoz" },
      { id: "c-3", type: "koldokcsap", a: "Alsó lap",      b: "Bal oldallap",  plane: "pl-left",  side: "+", offset: 0,  note: "" },
      { id: "c-4", type: "koldokcsap", a: "Alsó lap",      b: "Jobb oldallap", plane: "pl-right", side: "-", offset: 0,  note: "" },
      { id: "c-5", type: "polcfurat",  a: "Polc",          b: "Bal oldallap",  plane: "pl-shelf", side: "+", offset: 37, note: "Állítható — furatsor 37 mm a homloklaptól" },
      { id: "c-6", type: "polcfurat",  a: "Polc",          b: "Jobb oldallap", plane: "pl-shelf", side: "+", offset: 37, note: "" },
    ],
    // SZÁRMAZTATOTT joints-tükör (Skel.deriveJoints írja újra szerkesztéskor) —
    // a meglévő lánc (jointMiters → auto-GV · jointOps → útvonal) ebből él.
    joints: [
      { id: "c-1", derived: true, a: { part: "Bal oldallap",  ref: "edge-top" },   b: { part: "Felső lap", ref: "edge-left" },  ger: true,  machining: "ragasztas",  offset: 0,  note: "Gérelt sarok — látszó él nélkül" },
      { id: "c-2", derived: true, a: { part: "Jobb oldallap", ref: "edge-top" },   b: { part: "Felső lap", ref: "edge-right" }, ger: true,  machining: "ragasztas",  offset: 0,  note: "Gérelt sarok — pár a balhoz" },
      { id: "c-3", derived: true, a: { part: "Alsó lap", ref: "edge-left" },  b: { part: "Bal oldallap",  ref: "face-a" }, ger: false, machining: "koldokcsap", offset: 0,  note: "" },
      { id: "c-4", derived: true, a: { part: "Alsó lap", ref: "edge-right" }, b: { part: "Jobb oldallap", ref: "face-b" }, ger: false, machining: "koldokcsap", offset: 0,  note: "" },
      { id: "c-5", derived: true, a: { part: "Polc", ref: "edge-left" },  b: { part: "Bal oldallap",  ref: "face-a" }, ger: false, machining: "polcfurat",  offset: 37, note: "Állítható — furatsor 37 mm a homloklaptól" },
      { id: "c-6", derived: true, a: { part: "Polc", ref: "edge-right" }, b: { part: "Jobb oldallap", ref: "face-b" }, ger: false, machining: "polcfurat",  offset: 37, note: "" },
    ],
    categoryId: "cat-cabinet",
    hardware: [{ id: "shelfsup", qty: 4 }],
    laborHours: 2,
    deliveryDays: 7,
  },
];

Object.assign(window, {
  TPL_FLOW, TPL_STATUS, TPL_STATUS_ORDER, TplEngine, DESIGN_TEMPLATES_SEED,
  TPL_PART_REFS, TPL_REF_BY_KEY, TPL_JOINT_KINDS, TPL_MACHINING, TPL_MACHINING_ORDER,
});
