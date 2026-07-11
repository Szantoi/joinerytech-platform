// ──────────────────────────────────────────────────────────────────────────
// data-woodwork.js — Faipari domén: ANYAGTÍPUS-vezérelt per-alkatrész útvonal
//
//   A „Faipar műszaki dokumentáció" tankönyv (2–3. fejezet) alapja:
//   az ALAPANYAG TÍPUSA vezérli a teljes gyártási folyamatot.
//     • LAPANYAG (sheet): MDF / laminált / faforgácslap / rétegelt — az alkatrész
//       már a SZABÁSNÁL kész; rövid, uniformizált útvonal; nincs szelektálás.
//     • TÖMÖRFA (solidwood): deszka/palló nyersáru — az alkatrész fokozatosan áll
//       elő (válogatás → darabolás → szélezés → egyengetés → vastagolás →
//       táblásítás → szabás → …); HOSSZÚ útvonal, FOLYAMATOS szelektálással.
//
//   Az ÚTVONAL nem a termékhez, hanem az ALKATRÉSZHEZ + ANYAGTÍPUSHOZ kötődik
//   (per-alkatrész) → a „vonalas folyamatábra" (alkatrész × művelet mátrix).
//   Részletes domén-tudás: woodwork_domain.md.
//   Scope-prefix: ww.
// ──────────────────────────────────────────────────────────────────────────

// ── Anyagtípusok ─────────────────────────────────────────────────────────────
const WW_MATERIAL_KINDS = {
  sheet:     { key: "sheet",     label: "Lapanyag",  short: "Lap",     accent: "#0d9488", soft: "bg-teal-50 text-teal-700 border-teal-200",  icon: "box",
               note: "MDF / laminált / faforgácslap — az alkatrész a szabásnál kész, nincs szelektálás. Rövid útvonal." },
  solidwood: { key: "solidwood", label: "Tömörfa",   short: "Tömör",   accent: "#d97706", soft: "bg-amber-50 text-amber-700 border-amber-200", icon: "layers",
               note: "Deszka/palló nyersáru — fokozatos megmunkálás, folyamatos szelektálás (csomó, repedés, szálirány). Hosszú útvonal." },
};
const WW_KIND_ORDER = ["sheet", "solidwood"];

// ── Műveletek (a vonalas folyamatábra SORAI, technológiai sorrend) ───────────
//   station = a műhely-állomás (PROD_KINDS kulcs) a színhez / későbbi kiadáshoz.
//   kinds   = mely anyagtípus(ok) használják az adott műveletet.
//   front   = tömörfa front-end (rönkudvar/gyalu, szelektálással) jelölés.
const WW_OPS = [
  { key: "valogatas",      label: "Válogatás",         short: "Vál.",   icon: "check",    station: "szabaszat",      kinds: ["solidwood"], front: true },
  { key: "darabolas",      label: "Darabolás+hibakiejtés", short: "Dar.", icon: "cut",   station: "szabaszat",      kinds: ["solidwood"], front: true },
  { key: "szelezes",       label: "Szélezés",          short: "Szél.",  icon: "cut",      station: "szabaszat",      kinds: ["solidwood"], front: true },
  { key: "egyengetes",     label: "Egyengetés",        short: "Egy.",   icon: "layers",   station: "szabaszat",      kinds: ["solidwood"], front: true },
  { key: "vastagolas",     label: "Vastagolás",        short: "Vast.",  icon: "layers",   station: "szabaszat",      kinds: ["solidwood"], front: true },
  { key: "tablasitas",     label: "Táblásítás",        short: "Tábl.",  icon: "layers",   station: "szereles",       kinds: ["solidwood"], front: true, merge: true },
  { key: "szabas",         label: "Szabás",            short: "Szab.",  icon: "cut",      station: "szabaszat",      kinds: ["sheet", "solidwood"] },
  { key: "elzaras",        label: "Élzárás",           short: "Élz.",   icon: "layers",   station: "elzaras",        kinds: ["sheet"] },
  { key: "kotes",          label: "Szerk. kötés",      short: "Köt.",   icon: "settings", station: "cnc",            kinds: ["solidwood"] },
  { key: "furat",          label: "Furatok",           short: "Fur.",   icon: "settings", station: "cnc",            kinds: ["sheet", "solidwood"] },
  { key: "maras",          label: "Aljazás / marás",   short: "Mar.",   icon: "settings", station: "cnc",            kinds: ["sheet", "solidwood"] },
  { key: "csiszolas",      label: "Csiszolás",         short: "Csi.",   icon: "sparkle",  station: "feluletkezeles", kinds: ["solidwood"] },
  { key: "feluletkezeles", label: "Felületkezelés",    short: "Fel.",   icon: "drop",     station: "feluletkezeles", kinds: ["solidwood"] },
  { key: "szereles",       label: "Összeépítés",       short: "Össz.",  icon: "wrench",   station: "szereles",       kinds: ["sheet", "solidwood"], merge: true },
  { key: "kesz",           label: "Kész termék",       short: "Kész",   icon: "check",     station: null,            kinds: ["sheet", "solidwood"], terminal: true },
];
const WW_OP_BY_KEY = Object.fromEntries(WW_OPS.map((o) => [o.key, o]));

// ── Anyagkód → anyagtípus osztályozó ─────────────────────────────────────────
//   Elsődleges: a katalógus „kind" mezője (tömör → solidwood). A derivált
//   alkatrész-kódok a CATALOG_LOOKUP-ból jönnek, ezért ez megbízható; a regex
//   csak ismeretlen kódra fallback (konzervatív, hogy a „bükk bútorlap" = LAP
//   ne minősüljön tömörnek).
function wwMaterialKind(code, matName) {
  const lk = (window.CATALOG_LOOKUP && window.CATALOG_LOOKUP[code]) || null;
  if (lk && lk.kind === "tömör") return "solidwood";
  if (lk) return "sheet"; // ismert lookup, de nem tömör → lap
  const s = ((code || "") + " " + (matName || "")).toLowerCase();
  if (/tömör|tomor|fűrész|furesz|deszka|pall[óo]|massz[ií]v|^tl-04|^bk-04/.test(s)) return "solidwood";
  return "sheet";
}

// ── Egy alkatrész per-anyagtípus ÚTVONALA (mely művelet-kulcsokon megy át) ────
//   Lap: szabás → (élzárás, ha van él) → (furat v. aljazás) → összeépítés → kész.
//   Tömör: válogatás → … → vastagolás → (táblásítás, ha széles tábla) → szabás →
//          szerk. kötés → furat → (aljazás, ha hornyolt) → csiszolás →
//          felületkezelés → összeépítés → kész.
function wwPartOps(part, kind) {
  const name = ((part && part.name) || "").toLowerCase();
  const grooved = /hátfal|hatfal|hátlap|hatlap|fenék|fenek|alj/.test(name);
  const wide = Math.max(part.w || 0, part.h || 0) >= 500; // táblásítandó panel
  const hasEdge = (part.edgeM || 0) > 0;
  // csatlakozás-kényszerekből igényelt műveletek (TplEngine.jointOps → deriveItem)
  const jOps = (part && part.jointOps) || [];
  const needFurat = jOps.includes("furat");
  const needMaras = grooved || jOps.includes("maras");
  const ops = [];
  if (kind === "solidwood") {
    ops.push("valogatas", "darabolas", "szelezes", "egyengetes", "vastagolas");
    if (wide) ops.push("tablasitas");
    ops.push("szabas", "kotes", "furat");
    if (needMaras) ops.push("maras");
    ops.push("csiszolas", "feluletkezeles", "szereles", "kesz");
  } else {
    ops.push("szabas");
    if (hasEdge) ops.push("elzaras");
    // a csatlakozás dönti: marás (horony/lamelló/dominó) és/vagy furat (csap/excenter)
    if (needMaras) ops.push("maras");
    if (needFurat || !needMaras) ops.push("furat");
    ops.push("szereles", "kesz");
  }
  return ops;
}

// ── Cím-hierarchia: szegmensek + formázó (16. szakasz a woodwork_domain.md-ben) ──
//   partRef = { project?, site?, floor?, room?, group?, element?, part? }
//   Nem minden szegmens látszik mindig — a `density` dönti el (kontextus-függő).
const WW_ADDR_ORDER = ["site", "floor", "room", "group", "element", "part"];

// „Helyszín — Helyiség" típusú névből kibontja a site/room-ot (az azonosító-szerű
// második tagot — pl. rendelésszám — NEM kezeli helyiségként).
function wwParseLocation(name) {
  const parts = String(name || "").split(/\s[—–-]\s/);
  const site = (parts[0] || "").trim() || null;
  let room = (parts[1] || "").trim() || null;
  if (room && /^[A-Z]{1,4}-?\d/.test(room)) room = null; // rendelés/azonosító, nem helyiség
  return { site, room };
}

// Cím-formázó. density: "mini" (elem+alkatrész) · "std" (csoport→elem→alkatrész) ·
// "full" (minden meglévő szegmens). Csak a kitöltött szegmensek jelennek meg.
function wwPartAddr(ref, density) {
  if (!ref) return "";
  const pick = density === "mini" ? ["element", "part"]
    : density === "std" ? ["group", "element", "part"]
    : WW_ADDR_ORDER;
  return pick.map((k) => ref[k]).filter(Boolean).join(" · ");
}

// ── Gyártási típus (darabszám/ismétlődés szerint — 17. szakasz) ──────────────
//   Vezérli az előkészítés mélységét és a routing-modellt.
const WW_PROD_TYPES = {
  egyedi:  { key: "egyedi",  label: "Egyedi",       accent: "#7c3aed", soft: "bg-violet-50 text-violet-700 border-violet-200", icon: "ruler",
             note: "Egyedi munka, nincs ismétlés — részletes műveletterv és per-alkatrész követés ajánlott." },
  sorozat: { key: "sorozat", label: "Sorozatgyártás", accent: "#0284c7", soft: "bg-sky-50 text-sky-700 border-sky-200", icon: "layers",
             note: "Ismétlődő tételek — érdemes batch-elni, közös szabászat/élzárás, sablonosított útvonal." },
  tomeg:   { key: "tomeg",   label: "Tömeggyártás", accent: "#0d9488", soft: "bg-teal-50 text-teal-700 border-teal-200", icon: "factory",
             note: "Nagy darabszám — folyamatos rendszerű gyártás, gyártósor, minimális anyagmozgatás." },
};
// units = a gyártandó bútor-egységek száma
function wwProdType(units) {
  const n = Number(units) || 0;
  if (n >= 50) return "tomeg";
  if (n >= 3) return "sorozat";
  return "egyedi";
}

// ── Tömörfa hulladékszázalék-tábla (woodwork_domain.md §5, 2.1. táblázat) ────
//   A tömörfánál az anyagnorma fafaj-függő, és a hulladék gyakran >100% (a
//   bemenő fűrészáru többszöröse a nettónak). A névből osztályozunk; ismeretlen
//   keménylombosra konzervatív 130%. A %-ok tapasztalati értékek — később
//   konfigurálhatóvá tehetők.
const WW_WOOD_WASTE = [
  { re: /tölgy|tolgy|oak/,                              species: "Tölgy",                pct: 150 },
  { re: /bükk|bukk|beech/,                              species: "Bükk",                 pct: 130 },
  { re: /dió|dio|walnut/,                               species: "Dió",                  pct: 150 },
  { re: /juhar|maple/,                                  species: "Juhar",                pct: 150 },
  { re: /cseresznye|cherry|kőris|koris|ash|szil|elm|akác|akac|gyertyán|gyertyan|kőris/, species: "Egyéb keménylombos", pct: 135 },
  { re: /fenyő|fenyo|pine|spruce|luc|jegenye/,          species: "Fenyő (szélezett)",    pct: 65 },
  { re: /hárs|hars|nyár|nyar|éger|eger|poplar|lime|fűz|fuz/, species: "Egyéb lágylombos", pct: 120 },
];
// matName → { species, pct } (a hulladékszázalék az alkatrészjegyzék térfogatára)
function wwWoodWaste(matName) {
  const s = String(matName || "").toLowerCase();
  for (const r of WW_WOOD_WASTE) if (r.re.test(s)) return { species: r.species, pct: r.pct };
  return { species: "Keménylombos (átl.)", pct: 130 };
}
// Lap- és lemeztermék hulladék% (10–15%) — a szabászati veszteség
const WW_SHEET_WASTE_PCT = 12;

// ── Segédanyagnorma fajlagos felhordások (woodwork_domain.md §6, fig-2.11) ───
//   g/m² fajlagos felhordás (biztonsági adatlapról) + tipikus 10% veszteség.
//   A felületkezelő 2. rétege kisebb (kevesebb anyag tapad meg). Konfigurálható.
const WW_AUX_DEFAULTS = {
  glueEdge:    { key: "glueEdge",    name: "Élzáró ragasztó (PVAc hot-melt)",        rate: 220, kind: "glue",   note: "Élzárás — az élek összterületére." },
  gluePanel:   { key: "gluePanel",   name: "Táblásító ragasztó (PVAc diszperzió)",   rate: 150, kind: "glue",   note: "Tömörfa táblásítás / élragasztás — a ragasztási felületre." },
  finishCoat1: { key: "finishCoat1", name: "Felületkezelő — 1. réteg",               rate: 40,  kind: "finish", note: "Olaj / lakk első réteg — nagyobb felhordás." },
  finishCoat2: { key: "finishCoat2", name: "Felületkezelő — 2. réteg",               rate: 25,  kind: "finish", note: "Második réteg — kevesebb anyag tapad meg." },
  abrasive:    { key: "abrasive",    name: "Csiszolóanyag",                          grits: ["P100", "P120", "P180", "P240"], kind: "abrasive", note: "Szemcsefinomság szerint, durvától finomig." },
};
const WW_AUX_LOSS = 0.10;          // 10% veszteség
const WW_EDGE_BAND_H = 0.019;      // élléc/élzáró tipikus magassága (m) → él-terület = élhossz × ez

// ── Szabászati ráhagyás-modell (woodwork_domain.md §18) ──────────────────────
//   A LAP szabásmérete = készméret + Σ ráhagyás (élzáró-kompenzáció, CNC-kontúr,
//   gérvágás, duplungolás) + tábla-szintű formázó vágás. A nesting (CNC-szabászat)
//   kiváltja a per-alkatrész CNC-ráhagyást. A keskeny (< edgeMinW) élzárt alkatrész
//   VV-csoportba kerül (visszavágás). A tömörfa hossz/kereszt ráhagyása a §4-ből.
const WW_CUT_ALLOW = {
  edgeComp:   0.5,   // mm / élzárt él — élzáró marófej-kompenzáció (oldalanként)
  cncContour: 1.5,   // mm körben — külön CNC kontúrozás (nesting = 0)
  miterPerCut: 5,    // mm / gérvágott él (opcionális)
  doubling:   15,    // mm / méret — duplungolás (10–20)
  boardTrim:  15,    // mm / él — formázó vágás (tábla-szintű, 10–20)
  edgeMinW:   60,    // mm — élzáró min. szélessége (ez alatt VV összerakás)
  sawKerf:    4,     // mm — fűrészlap (VV összerakás számításhoz)
  swLengthAdd: 12,   // tömörfa hossz-ráhagyás (10–15)
  swCrossAdd:  6,    // tömörfa kereszt-ráhagyás (5–8)
};

// Élzárt élek BECSLÉSE a per-alkatrész élhosszból (nincs per-él adat a sablonban):
//   a hosszú éleket tölti fel előbb, majd a rövideket. Visszaadja: { nLong, nShort }.
function wwBandedEdges(part) {
  const qty = Math.max(1, part.qty || 1);
  let rem = (part.edgeM || 0) / qty;          // élzárt méter / db
  if (rem <= 0) return { nLong: 0, nShort: 0 };
  const L = Math.max(part.w || 0, part.h || 0) / 1000;
  const S = Math.min(part.w || 0, part.h || 0) / 1000;
  let nLong = 0, nShort = 0;
  while (nLong < 2 && rem >= L * 0.5 && L > 0) { nLong++; rem -= L; }
  while (nShort < 2 && rem >= S * 0.5 && S > 0) { nShort++; rem -= S; }
  return { nLong, nShort };
}

// Szabásméret + ráhagyás-bontás + etikett-jelölések EGY alkatrészhez.
//   opts: { mode:"nesting"|"cnc", doubling?:bool, kindOverride? }
//   Visszaad: { kind, w, h, cutW, cutH, adds:[{label,w,h,detail?}], marks:[{key,label,tone}], banded, narrow }
function wwCutSize(part, opts) {
  opts = opts || {};
  const A = window.WW_CUT_ALLOW || WW_CUT_ALLOW;
  const emin = opts.edgeMinW != null ? opts.edgeMinW : A.edgeMinW; // élzáró min. szélesség (gép-törzsből)
  const kind = opts.kindOverride || (window.wwMaterialKind ? window.wwMaterialKind(part.code, part.matName) : "sheet");
  const w = part.w || 0, h = part.h || 0;
  const adds = [], marks = [];
  let addW = 0, addH = 0;

  if (kind === "solidwood") {
    const wIsLong = w >= h;
    const aw = wIsLong ? A.swLengthAdd : A.swCrossAdd;
    const ah = wIsLong ? A.swCrossAdd : A.swLengthAdd;
    addW += aw; addH += ah;
    adds.push({ label: `Tömörfa ráhagyás (hossz +${A.swLengthAdd} / kereszt +${A.swCrossAdd})`, w: aw, h: ah });
    marks.push({ key: "SW", label: "gyalulatlan", tone: "amber" });
  } else {
    // élzáró-kompenzáció: rövid él → hossz, hosszú él → szélesség
    const b = wwBandedEdges(part);
    const wIsLong = w >= h;
    const edgeToLong = b.nShort * A.edgeComp;   // a hosszméretre (a hosszabb dim)
    const edgeToShort = b.nLong * A.edgeComp;    // a szélesség-méretre (a rövidebb dim)
    const ew = wIsLong ? edgeToLong : edgeToShort;
    const eh = wIsLong ? edgeToShort : edgeToLong;
    if (ew > 0 || eh > 0) {
      addW += ew; addH += eh;
      adds.push({ label: `Élzáró-kompenzáció (+${A.edgeComp}/él)`, w: ew, h: eh, detail: `${b.nLong} hosszú · ${b.nShort} rövid él` });
    }
    // CNC-kontúr — csak külön CNC (nesting = 0)
    if (opts.mode === "cnc") {
      addW += A.cncContour; addH += A.cncContour;
      adds.push({ label: `CNC-kontúr (+${A.cncContour} körben)`, w: A.cncContour, h: A.cncContour });
      marks.push({ key: "CNC", label: "CNC-kontúr", tone: "violet" });
    } else {
      marks.push({ key: "NEST", label: "nesting", tone: "teal" });
    }
    // duplungolás
    if (opts.doubling) {
      addW += A.doubling; addH += A.doubling;
      adds.push({ label: `Duplungolás (+${A.doubling}/méret)`, w: A.doubling, h: A.doubling });
      marks.push({ key: "DUP", label: "duplázás", tone: "stone" });
    }
    // gérvágás (GV) / szögbe vágott él — a DÖNTÉS a műszaki tervezésből jön
    // (part.miterShort/miterLong); itt csak az üzemi ráhagyás mértéke állítható
    // (opts.miterPerCut, akár 0). Rövid él → hossz, hosszú él → szélesség.
    const mpc = opts.miterPerCut != null ? opts.miterPerCut : A.miterPerCut;
    const mShort = opts.miterShort || 0, mLong = opts.miterLong || 0;
    if ((mShort || mLong) && mpc > 0) {
      const wIsLong2 = w >= h;
      const toLong = mShort * mpc;   // rövid él gérvágása → hosszméret
      const toShort = mLong * mpc;    // hosszú él gérvágása → szélesség
      const mw = wIsLong2 ? toLong : toShort;
      const mh = wIsLong2 ? toShort : toLong;
      addW += mw; addH += mh;
      adds.push({ label: `Gérvágás ráhagyás (+${mpc}/vágás)`, w: mw, h: mh, detail: `${mShort} rövid · ${mLong} hosszú él` });
      marks.push({ key: `GV ${mShort}R${mLong}H`, label: "gérvágás", tone: "rose" });
    } else if (mShort || mLong) {
      // a tervező gérelt/szögbe vágott élt írt elő, de az üzem 0 ráhagyást ad
      marks.push({ key: `GV ${mShort}R${mLong}H`, label: "gérvágás (0 ráhagyás)", tone: "rose" });
    }
    // VV — keskeny, élzárt alkatrész (élzáró min. szélesség alatt — gép-törzsből)
    if (Math.min(w, h) < emin && (part.edgeM || 0) > 0) {
      marks.push({ key: "VV", label: "visszavágás", tone: "sky" });
    }
  }

  const cutW = Math.round((w + addW) * 10) / 10;
  const cutH = Math.round((h + addH) * 10) / 10;
  // gép-méret túllépés: a szabásméret nem fér a szabászgép max táblájára (gép-törzs)
  if (opts.maxW && opts.maxH) {
    const fits = (cutW <= opts.maxW && cutH <= opts.maxH) || (cutW <= opts.maxH && cutH <= opts.maxW);
    if (!fits) marks.push({ key: "MÉRET!", label: "gép-méret túllépés", tone: "amber" });
  }
  return { kind, w, h, cutW, cutH, addW: Math.round(addW * 10) / 10, addH: Math.round(addH * 10) / 10,
    adds, marks, narrow: Math.min(w, h) < emin };
}

// ── VV-összerakás (woodwork_domain.md §18.5) ─────────────────────────────────
//   A keskeny (< edgeMinW) élzárt alkatrészeket AZONOS HOSSZ szerint csoportokba
//   ('csíkokba') rakja, a szélességeket 100–150 mm közé összegezve (A szél. + B
//   szél. + fűrészlap-kerf), hogy az élzáró stabilan tartsa. Visszaad: csík-lista
//   { length, combinedWidth, members:[{w,qty}], label, count } — a `label` az
//   etikett-formátum (VV:750×50,750×60 vagy VV:750×50 2db).
function wwVVGroups(parts, opts) {
  const A = window.WW_CUT_ALLOW || WW_CUT_ALLOW;
  const emin = (opts && opts.edgeMinW != null) ? opts.edgeMinW : A.edgeMinW;
  const MIN = 100, MAX = 150; // stabil élzárási szélesség-sáv
  const cand = [];
  (parts || []).forEach((p) => {
    const L = Math.max(p.w || 0, p.h || 0), W = Math.min(p.w || 0, p.h || 0);
    if (W < emin && (p.edgeM || 0) > 0) for (let i = 0; i < (p.qty || 1); i++) cand.push({ L, W, name: p.name });
  });
  if (!cand.length) return [];
  // azonos hossz szerinti kosarak (±2 mm tűrés a kerekítésnél)
  const byLen = {};
  cand.forEach((c) => { const key = Math.round(c.L); (byLen[key] = byLen[key] || []).push(c); });
  const strips = [];
  Object.keys(byLen).forEach((key) => {
    let units = byLen[key].slice().sort((a, b) => b.W - a.W);
    while (units.length) {
      const strip = { length: units[0].L, width: 0, members: [] };
      for (let i = 0; i < units.length;) {
        const u = units[i];
        const nextW = strip.members.length ? strip.width + A.sawKerf + u.W : u.W;
        if (strip.members.length === 0 || nextW <= MAX) { strip.members.push(u); strip.width = nextW; units.splice(i, 1); }
        else i++;
        if (strip.width >= MIN) break;
      }
      strips.push(strip);
    }
  });
  // tagok összevonása szélesség szerint + etikett-címke
  return strips.map((g) => {
    const byW = {};
    g.members.forEach((m) => { byW[Math.round(m.W)] = (byW[Math.round(m.W)] || 0) + 1; });
    const members = Object.keys(byW).map((w) => ({ w: Number(w), qty: byW[w] })).sort((a, b) => b.w - a.w);
    const label = "VV:" + members.map((m) => `${Math.round(g.length)}×${m.w}${m.qty > 1 ? ` ${m.qty}db` : ""}`).join(",");
    return { length: Math.round(g.length), combinedWidth: Math.round(g.width), count: g.members.length, members, label,
      stable: g.width >= MIN };
  }).sort((a, b) => b.count - a.count);
}

// ── Gép-paraméter törzs (woodwork_domain.md §18.9, §19.3 cap.2) ──────────────
//   Melyik gépnek mi a min./max. mérete — a beállítások (ráhagyás, VV, méret-
//   ellenőrzés) EHHEZ igazodnak. A gépek a PROD_STATIONS-ból jönnek (egy
//   igazságforrás); itt a faipari méret-korlátok élnek. Szabászgép: max tábla.
//   Élzáró: min. munkadarab-szélesség (ez alatt VV-összerakás) + max.
const WW_MACHINE_LIMITS = {
  "M-HOLZMA-01": { maxW: 2800, maxH: 2070 },                 // szabászat — Holzma HPP380
  "M-BIESSE-01": { maxW: 3200, maxH: 2150 },                 // szabászat — Biesse Selco
  "M-HOMAG-01":  { minPartW: 55, maxPartW: 1300 },           // élzárás — Homag KAL 310
  "M-BIESSE-02": { maxW: 3050, maxH: 2050 },                 // CNC — Biesse Rover
  "M-HOLZMA-02": { maxW: 3700, maxH: 2150 },                 // CNC — Holzma CNC
};
function wwMachineLimit(id) {
  let assetLim = {};
  try { const a = (window.sim && window.sim.assetList ? window.sim.assetList() : []).find((x) => x.machineId === id); if (a && a.cutLimits) assetLim = a.cutLimits; } catch (e) {}
  return { ...(WW_MACHINE_LIMITS[id] || {}), ...(wwLoadMachineOverrides()[id] || {}), ...assetLim };
}
function wwMachinesByKind(kind) { return (window.PROD_STATIONS || []).filter((s) => s.kind === kind); }
// Gép-paraméter felülírások (üzem-szerkeszthető, perzisztens) — a törzs-alapot írják felül.
const WW_MLIMIT_LS = "jt_machine_limits";
function wwLoadMachineOverrides() { try { return JSON.parse(localStorage.getItem(WW_MLIMIT_LS) || "{}"); } catch (e) { return {}; } }
function wwSaveMachineOverride(id, patch) {
  const all = wwLoadMachineOverrides();
  all[id] = { ...(all[id] || {}), ...patch };
  try { localStorage.setItem(WW_MLIMIT_LS, JSON.stringify(all)); } catch (e) {}
  return all;
}

// ── Kétszintű árkalkuláció paraméterei (woodwork_domain.md §10) ──────────────
//   A %-ok jogszabály-/üzletfüggők → konfigurálhatók (nincs bedrótozva).
const WW_PRICE_PARAMS = {
  laborRate:    6500,  // nettó órabér (Ft/h) — összetett kalkuláció
  shiftRate:    4500,  // bruttó óradíj (bér + rezsi) — egyszerűsített
  machineRate:  3500,  // gép-óradíj (Ft/h)
  machineFactor: 0.25, // a telepített gépen a munkaórák ~¼-e gépidő
  shiftUtil:    0.55,  // műszakkihasználtság (info / egyszerűsített)
  szochoPct:    13,    // bérjárulék (2023: 13% szocho)
  overheadPct:  20,    // általános (rezsi/raktár/admin) % a közvetlen ktsg-re
  profitPct:    15,    // nyereség %
  vatPct:       27,    // áfa %
  otherCost:    0,     // egyéb (külső bérmunka: felület/üveg/kárpit) Ft
};

Object.assign(window, {
  WW_MATERIAL_KINDS, WW_KIND_ORDER, WW_OPS, WW_OP_BY_KEY, wwMaterialKind, wwPartOps,
  WW_ADDR_ORDER, wwParseLocation, wwPartAddr, WW_PROD_TYPES, wwProdType,
  WW_WOOD_WASTE, wwWoodWaste, WW_SHEET_WASTE_PCT, WW_AUX_DEFAULTS, WW_AUX_LOSS, WW_EDGE_BAND_H,
  WW_CUT_ALLOW, wwBandedEdges, wwCutSize, WW_PRICE_PARAMS,
  wwVVGroups, WW_MACHINE_LIMITS, wwMachineLimit, wwMachinesByKind,
  wwLoadMachineOverrides, wwSaveMachineOverride,
});
