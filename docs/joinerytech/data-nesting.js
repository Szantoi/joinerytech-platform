// ──────────────────────────────────────────────────────────────────────────
// ANYAGOPTIMALIZÁLÁS / SZABÁSZAT-NESTING — a Gyártás világ „Szabászat" képernyője
//
// FELELŐSSÉG: a kiadott gyártási tételek (nestJobs) alkatrész-listáját TÁBLÁKRA
// optimalizálja (2D guillotine nesting, rotáció + vágási rés/kerf), kiszámolja a
// kihozatalt (yield %) és a tábla-szükségletet, ÉS a maradékot a MARADÉKANYAG-
// RAKTÁRBA (offcut) könyveli. A nesting ELŐSZÖR a meglévő offcut-készletből keres
// felhasználható maradékot, csak utána nyit új teljes táblát.
//
// FONTOS: a NestEngine TISZTA (nincs mellékhatás, nincs tárolt eredmény) — a
// futtatás eredménye a komponensben él, a store csak VÉGLEGESÍTÉSKOR könyvel
// (tábla-fogyás + offcut bevétel/fogyás). A számolt értékeket (yield, költség,
// eltérés) soha ne tárold — mindig az Engine-ből.
// ──────────────────────────────────────────────────────────────────────────

// Vágási rés (fűrészlap szélessége) — a darabok közé ennyi hézag kell, mm.
const NEST_KERF = 4;
// Megőrzendő maradék minimum-mérete: e fölött offcut (visszamegy raktárba),
// alatta selejt (waste). Mindkét oldalnak ≥ ennyinek kell lennie. (mm)
const NEST_OFFCUT_MIN = 200;

// Standard tábla-méret (mm). Anyagkód-felülírás a NEST_BOARD_SIZE-ban.
const NEST_BOARD_DEFAULT = { w: 2800, h: 2070 };
const NEST_BOARD_SIZE = {
  "EG-3303-18": { w: 2800, h: 2070 },
  "EG-1133-18": { w: 2800, h: 2070 },
  "EG-3327-18": { w: 2800, h: 2070 },
  "EG-3327-19": { w: 2800, h: 2070 },
  "EG-3303-19": { w: 2800, h: 2070 },
  "MDF-019":    { w: 2800, h: 2070 },
  "HDF-003":    { w: 2800, h: 2070 },
  "MDF-006":    { w: 2800, h: 2070 },
};

// Maradékanyag-raktár (offcut) zóna-státuszok — egy maradék-lot ezen halad végig.
const OFFCUT_ZONES = {
  available: { key: "available", label: "Raktáron", short: "Raktáron",
    desc: "Szabad maradék — a következő nesting felhasználhatja.",
    pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", accent: "#d97706" },
  reserved:  { key: "reserved", label: "Foglalt", short: "Foglalt",
    desc: "Egy véglegesített szabásterv lefoglalta.",
    pill: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500", accent: "#0284c7" },
  used:      { key: "used", label: "Felhasználva", short: "Felhasználva",
    desc: "Beépült egy szabástervbe — kivezetve.",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", accent: "#059669" },
  scrap:     { key: "scrap", label: "Selejt", short: "Selejt",
    desc: "Kiselejtezve — nem használható tovább.",
    pill: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", accent: "#e11d48" },
};
const OFFCUT_ZONE_ORDER = ["available", "reserved", "used", "scrap"];

// Szabásterv FSM: terv → véglegesítve  (mellék: ajánlat — kereskedői szabászat-ajánlat).
const NEST_STATUS = {
  terv:         { key: "terv", label: "Terv", pill: "bg-stone-100 text-stone-700 border-stone-200", dot: "bg-stone-400" },
  veglegesitve: { key: "veglegesitve", label: "Véglegesítve", pill: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500" },
  ajanlat:      { key: "ajanlat", label: "Ajánlatban", pill: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
};

// ──────────────────────────────────────────────────────────────────────────
// NestEngine — tiszta 2D guillotine nesting (rotáció + kerf + offcut-újrahasznosítás)
// ──────────────────────────────────────────────────────────────────────────
const NestEngine = {
  boardSize(code) { return NEST_BOARD_SIZE[code] || NEST_BOARD_DEFAULT; },
  KERF: NEST_KERF,
  OFFCUT_MIN: NEST_OFFCUT_MIN,

  // Alkatrész-lista → egyedi téglalapokra bontva (qty szerint).
  expandParts(parts) {
    const out = [];
    (parts || []).forEach((p, pi) => {
      const n = Math.max(1, Math.round(Number(p.qty) || 1));
      for (let i = 0; i < n; i++) {
        out.push({ w: Number(p.w) || 0, h: Number(p.h) || 0, name: p.name || `Alkatrész ${pi + 1}`,
          rotatable: p.rotatable !== false, partIdx: pi });
      }
    });
    return out.filter((r) => r.w > 0 && r.h > 0);
  },

  // Egy tábla/maradék becsomagolása. Guillotine free-rectangle pakolás, best-fit
  // (legkisebb maradék-oldal) + 90°-os forgatás. Visszaadja az elhelyezéseket, a
  // ki nem fért darabokat, és a megmaradt szabad téglalapokat (offcut-jelöltek).
  packBin(binW, binH, rects, kerf) {
    kerf = kerf == null ? NEST_KERF : kerf;
    let free = [{ x: 0, y: 0, w: binW, h: binH }];
    const placements = [];
    const unplaced = [];
    // nagyobb terület előbb (jobb kitöltés)
    const queue = rects.slice().sort((a, b) => (b.w * b.h) - (a.w * a.h));
    for (const r of queue) {
      let best = null;
      for (let i = 0; i < free.length; i++) {
        const f = free[i];
        // forgatás nélkül
        const fw = r.w + kerf, fh = r.h + kerf;
        if (fw <= f.w + 1e-6 && fh <= f.h + 1e-6) {
          const score = Math.min(f.w - fw, f.h - fh);
          if (!best || score < best.score) best = { i, rot: false, score, pw: r.w, ph: r.h };
        }
        // 90°-kal forgatva (ha szabad)
        if (r.rotatable && r.w !== r.h) {
          const rw = r.h + kerf, rh = r.w + kerf;
          if (rw <= f.w + 1e-6 && rh <= f.h + 1e-6) {
            const score = Math.min(f.w - rw, f.h - rh);
            if (!best || score < best.score) best = { i, rot: true, score, pw: r.h, ph: r.w };
          }
        }
      }
      if (!best) { unplaced.push(r); continue; }
      const f = free[best.i];
      placements.push({ x: f.x, y: f.y, w: best.pw, h: best.ph, rot: best.rot, name: r.name, partIdx: r.partIdx });
      const usedW = best.pw + kerf, usedH = best.ph + kerf;
      free.splice(best.i, 1);
      // guillotine vágás: alsó sáv = teljes szélesség (jó, széles maradék),
      // jobb sáv = az elhelyezett darab magasságáig.
      const rightW = f.w - usedW, bottomH = f.h - usedH;
      if (rightW > 1) free.push({ x: f.x + usedW, y: f.y, w: rightW, h: usedH });
      if (bottomH > 1) free.push({ x: f.x, y: f.y + usedH, w: f.w, h: bottomH });
      free = free.filter((fr) => fr.w > 1 && fr.h > 1);
    }
    return { placements, unplaced, free };
  },

  // Szabad téglalapokból a megőrzendő maradékok (mindkét oldal ≥ OFFCUT_MIN).
  extractOffcuts(free) {
    return (free || [])
      .filter((f) => f.w >= NEST_OFFCUT_MIN && f.h >= NEST_OFFCUT_MIN)
      .map((f) => ({ w: Math.round(f.w - NEST_KERF > 0 ? f.w - NEST_KERF : f.w), h: Math.round(f.h - NEST_KERF > 0 ? f.h - NEST_KERF : f.h) }))
      .filter((f) => f.w >= NEST_OFFCUT_MIN && f.h >= NEST_OFFCUT_MIN)
      .sort((a, b) => (b.w * b.h) - (a.w * a.h));
  },

  // Teljes terv futtatása. ELŐSZÖR a megadott offcut-készletből keres helyet,
  // csak utána nyit új teljes táblát. Visszaadja a táblánkénti elrendezést +
  // összesítést. opts: { parts, board:{w,h}, kerf, offcuts:[{id,w,h}] }
  run({ parts, board, kerf = NEST_KERF, offcuts = [] }) {
    const rects = this.expandParts(parts);
    const totalPartArea = rects.reduce((s, r) => s + r.w * r.h, 0);
    const totalPartCount = rects.length;
    const sheets = [];
    const offcutsUsed = [];
    let avail = (offcuts || []).map((o) => ({ ...o })).sort((a, b) => (b.w * b.h) - (a.w * a.h));
    let remaining = rects;
    let guard = 0;

    while (remaining.length && guard++ < 300) {
      // 1) Próbáljunk meglévő maradékot (offcut) — a legkisebb, ami legalább 1
      //    darabot befogad (a nagy táblát kíméljük).
      let pickedOffcut = -1, packed = null;
      const cand = avail.slice().sort((a, b) => (a.w * a.h) - (b.w * b.h)); // kicsi előbb
      for (let i = 0; i < cand.length; i++) {
        const res = this.packBin(cand[i].w, cand[i].h, remaining, kerf);
        if (res.placements.length > 0) { pickedOffcut = avail.indexOf(cand[i]); packed = res; break; }
      }
      let sheet;
      if (packed && pickedOffcut >= 0) {
        const o = avail[pickedOffcut];
        offcutsUsed.push(o);
        avail.splice(pickedOffcut, 1);
        sheet = { source: "offcut", srcId: o.id, w: o.w, h: o.h, packed };
      } else {
        // 2) Új teljes tábla.
        packed = this.packBin(board.w, board.h, remaining, kerf);
        if (packed.placements.length === 0) {
          // egyetlen darab sem fér el — túl nagy alkatrész; megszakítás.
          break;
        }
        sheet = { source: "board", srcId: null, w: board.w, h: board.h, packed };
      }
      const placedArea = sheet.packed.placements.reduce((s, p) => s + p.w * p.h, 0);
      const newOffcuts = this.extractOffcuts(sheet.packed.free);
      sheets.push({
        source: sheet.source, srcId: sheet.srcId, w: sheet.w, h: sheet.h,
        placements: sheet.packed.placements, free: sheet.packed.free,
        placedArea, sheetArea: sheet.w * sheet.h,
        yield: placedArea / (sheet.w * sheet.h),
        newOffcuts,
      });
      remaining = sheet.packed.unplaced;
    }

    const boards = sheets.filter((s) => s.source === "board").length;
    const offcutSheets = sheets.filter((s) => s.source === "offcut").length;
    const usedArea = sheets.reduce((s, x) => s + x.sheetArea, 0);
    const boardArea = sheets.filter((s) => s.source === "board").reduce((s, x) => s + x.sheetArea, 0);
    const newOffcuts = sheets.flatMap((s) => s.newOffcuts);
    const newOffcutArea = newOffcuts.reduce((s, o) => s + o.w * o.h, 0);
    const scrapArea = Math.max(0, usedArea - totalPartArea - newOffcutArea);

    return {
      sheets,
      unplaced: remaining,
      summary: {
        boards, offcutSheets, offcutsUsed,
        totalPartCount, totalPartArea,
        usedArea, boardArea,
        yieldPct: usedArea ? totalPartArea / usedArea : 0,        // tényleges anyag-kihasználás
        boardYieldPct: boardArea ? (totalPartArea - sheets.filter((s)=>s.source==="offcut").reduce((s,x)=>s+x.placedArea,0)) / boardArea : 0,
        newOffcuts, newOffcutArea, scrapArea,
        scrapPct: usedArea ? scrapArea / usedArea : 0,
      },
    };
  },
};

const mm2ToM2 = (mm2) => mm2 / 1e6;

// ──────────────────────────────────────────────────────────────────────────
// Seed — szabászati tételek (kiadott gyártásból) + maradékanyag-raktár
// Minden alkatrész mm-ben; rotatable=false a szálirányos (front) daraboknál.
// ──────────────────────────────────────────────────────────────────────────
const NEST_JOBS_SEED = [
  { id: "SZ-2426-184", job: "FE-2426-184", order: "JT-2426-0184", customer: "Bognár Bútor Kft.",
    title: "16-fiókos konyhabútor — korpusz", material: "EG-3303-18", status: "terv", planRef: null,
    note: "Egger 3303 ST10 18mm korpusz — uni dekor, forgatható.",
    parts: [
      { name: "Oldallap",      w: 720, h: 560, qty: 8,  rotatable: true, grain: "hossz", route: ["elzaras", "szereles"],
        edges: { e: "ABS 2mm tölgy", h: null, b: "ABS 2mm tölgy", j: null } },
      { name: "Polc",          w: 564, h: 520, qty: 12, rotatable: true, grain: "hossz", route: ["elzaras", "szereles"],
        edges: { e: "ABS 2mm tölgy", h: null, b: null, j: null } },
      { name: "Alsó/felső lap", w: 568, h: 560, qty: 8, rotatable: true, grain: "hossz", route: ["elzaras", "szereles"],
        edges: { e: "ABS 2mm tölgy", h: null, b: null, j: null } },
      { name: "Hátmerevítő",   w: 568, h: 100, qty: 6,  rotatable: true, grain: "szel", route: ["szereles"],
        edges: { e: null, h: null, b: null, j: null } },
      { name: "Térelválasztó", w: 540, h: 520, qty: 4,  rotatable: true, grain: "hossz", route: ["elzaras", "szereles"],
        edges: { e: "ABS 2mm tölgy", h: null, b: "ABS 2mm tölgy", j: null } },
    ] },
  { id: "SZ-2426-180", job: "FE-2426-180", order: "JT-2426-0180", customer: "Hegyi Lakberendezés",
    title: "Gardrób — korpusz + polcok", material: "EG-1133-18", status: "terv", planRef: null,
    note: "Egger 1133 ST10 18mm — magas oldallapok.",
    parts: [
      { name: "Oldallap (magas)", w: 2000, h: 580, qty: 4, rotatable: true, grain: "hossz", route: ["elzaras", "szereles"],
        edges: { e: "ABS 1mm fehér", h: null, b: "ABS 1mm fehér", j: null } },
      { name: "Tető / fenék",     w: 936,  h: 580, qty: 4, rotatable: true, grain: "hossz", route: ["elzaras", "szereles"],
        edges: { e: "ABS 1mm fehér", h: null, b: null, j: null } },
      { name: "Polc",             w: 900,  h: 560, qty: 10, rotatable: true, grain: "hossz", route: ["elzaras", "szereles"],
        edges: { e: "ABS 1mm fehér", h: null, b: null, j: null } },
      { name: "Válaszfal",        w: 1960, h: 560, qty: 2, rotatable: true, grain: "hossz", route: ["szereles"],
        edges: { e: null, h: null, b: null, j: null } },
    ] },
  { id: "SZ-2426-182", job: "FE-2426-182", order: "JT-2426-0182", customer: "Doorstar Hungary Zrt.",
    title: "Bejárati ajtó — frontok (szálirány)", material: "EG-3327-19", status: "terv", planRef: null,
    note: "Egger 3327 ST22 19mm front — SZÁLIRÁNYOS, nem forgatható.",
    parts: [
      { name: "Ajtófront",  w: 716, h: 356, qty: 16, rotatable: false, grain: "hossz", route: ["cnc", "feluletkezeles"],
        edges: { e: "ABS 2mm 3327", h: "ABS 2mm 3327", b: "ABS 2mm 3327", j: "ABS 2mm 3327" } },
      { name: "Oldalfront", w: 716, h: 140, qty: 16, rotatable: false, grain: "hossz", route: ["cnc", "feluletkezeles"],
        edges: { e: "ABS 2mm 3327", h: "ABS 2mm 3327", b: "ABS 2mm 3327", j: "ABS 2mm 3327" } },
      { name: "Fedőléc",    w: 800, h: 90,  qty: 8,  rotatable: false, grain: "hossz", route: ["feluletkezeles"],
        edges: { e: "ABS 2mm 3327", h: "ABS 2mm 3327", b: null, j: null } },
    ] },
  { id: "SZ-2426-179", job: "FE-2426-179", order: "JT-2426-0179", customer: "Várdai Konyhastúdió",
    title: "Konyhasziget — korpusz", material: "MDF-019", status: "terv", planRef: null,
    note: "MDF 19mm korpusz festéshez — élzárás nincs, kontúros munkalap.",
    parts: [
      { name: "Oldallap",  w: 820, h: 600, qty: 6, rotatable: true, grain: null, route: ["cnc", "feluletkezeles"],
        edges: { e: null, h: null, b: null, j: null } },
      { name: "Fedlap",    w: 1180, h: 600, qty: 2, rotatable: true, grain: null, route: ["feluletkezeles"],
        edges: { e: null, h: null, b: null, j: null } },
      { name: "Polc",      w: 1150, h: 560, qty: 6, rotatable: true, grain: null, route: ["szereles"],
        edges: { e: null, h: null, b: null, j: null } },
      { name: "Hátlap-merevítő", w: 1150, h: 120, qty: 4, rotatable: true, grain: "szel", route: ["szereles"],
        edges: { e: null, h: null, b: null, j: null } },
      { name: "Munkalap (sarok)", w: 1200, h: 700, qty: 1, rotatable: false, grain: "szel", route: ["feluletkezeles"],
        edges: { e: "Tömörfa perem", h: null, b: "Tömörfa perem", j: null },
        contour: [[0, 0], [1, 0], [1, 0.55], [0.5, 0.55], [0.5, 1], [0, 1]] },
    ] },
];

// Maradékanyag-raktár seed — korábbi szabásokból visszamaradt darabok.
const OFFCUT_SEED = [
  { id: "OC-2426-001", material: "EG-3303-18", w: 1400, h: 900, qty: 1, zone: "available", fromJob: "SZ-2426-160", createdAt: "2026-04-22", loc: "Vác · A-12" },
  { id: "OC-2426-002", material: "EG-3303-18", w: 820,  h: 600, qty: 2, zone: "available", fromJob: "SZ-2426-160", createdAt: "2026-04-22", loc: "Vác · A-12" },
  { id: "OC-2426-003", material: "EG-1133-18", w: 1200, h: 760, qty: 1, zone: "available", fromJob: "SZ-2426-171", createdAt: "2026-04-24", loc: "Vác · A-13" },
  { id: "OC-2426-004", material: "MDF-019",    w: 980,  h: 640, qty: 1, zone: "available", fromJob: "SZ-2426-168", createdAt: "2026-04-20", loc: "Vác · A-14" },
  { id: "OC-2426-005", material: "EG-3327-19", w: 700,  h: 320, qty: 1, zone: "available", fromJob: "SZ-2426-175", createdAt: "2026-04-25", loc: "Vác · A-13" },
  { id: "OC-2426-006", material: "EG-3303-18", w: 240,  h: 210, qty: 3, zone: "scrap",     fromJob: "SZ-2426-160", createdAt: "2026-04-22", loc: "—" },
];

Object.assign(window, {
  NEST_KERF, NEST_OFFCUT_MIN, NEST_BOARD_DEFAULT, NEST_BOARD_SIZE,
  OFFCUT_ZONES, OFFCUT_ZONE_ORDER, NEST_STATUS,
  NestEngine, mm2ToM2,
  NEST_JOBS_SEED, OFFCUT_SEED,
});
