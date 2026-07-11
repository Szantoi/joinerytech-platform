/* AUTO-GENERATED from page-labels.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// CÍMKE-STRATÉGIA — alkatrész-címke + rakat-címke + címke-ív (4.7-A folyt.)
//
// 3-szintű traceability a szabászat után:
//   TÁBLA (kód) → mely alkatrészek lettek róla szabva
//   ALKATRÉSZ (kód) → kontúr + élek (E/H/B/J) + élzárás + szálirány + köv. állomás + QR
//   RAKAT (kód) → melyik állomásra tart + milyen alkatrészek vannak rajta
//
// A LabelEngine a nesting-tervből (NestEngine.run kimenete) építi fel a címke-
// modellt: minden elhelyezés egy alkatrész-példány tábla-hozzárendeléssel; a
// példányok a `route[0]` (köv. állomás) szerint KÓDOLT rakatokba kötegelődnek.
//
// Scope: `lb`-prefixű nevek; Icon/PROD_KINDS közvetlenül.
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateLb
} = React;

// Él-konvenció a címkén: H=hátul(fent) · E=elöl(lent) · B=bal · J=jobb
const LB_EDGE_META = {
  h: {
    key: "h",
    label: "Hátul",
    short: "H",
    side: "top"
  },
  e: {
    key: "e",
    label: "Elöl",
    short: "E",
    side: "bottom"
  },
  b: {
    key: "b",
    label: "Bal",
    short: "B",
    side: "left"
  },
  j: {
    key: "j",
    label: "Jobb",
    short: "J",
    side: "right"
  }
};
// állomás-rövidítés a rakat-kódhoz
const LB_STATION_ABBR = {
  szabaszat: "SZB",
  elzaras: "ELZ",
  cnc: "CNC",
  szereles: "SZR",
  feluletkezeles: "FEL"
};

// ── Szabványos A4 címke-ív sablonok — konfigurálható geometria (Avery-kompat.)
// Bármely irodai lézer/tintasugaras nyomtató kezeli. A modell: oldal + margó +
// méret + sor/oszlop + raszter (data→geometry). PDF-szerű mm-pontos render; a
// felhasználót figyelmeztetjük a 100% / „valós méret" nyomtatásra (nem fit-to-page).
// wmm/hmm = címke; cols×rows; mLeft/mTop = ív-margó; gx/gy = címke-köz; r = sarok.
const LABEL_FORMATS = {
  // ── Irodai (A4 ív) — die-cut, bármely lézer/tintasugaras nyomtató ──
  L7159: {
    code: "L7159",
    name: "70 × 37 mm",
    kind: "sheet",
    wmm: 70,
    hmm: 37,
    cols: 3,
    rows: 8,
    per: 24,
    mLeft: 0,
    mTop: 0.5,
    gx: 0,
    gy: 0,
    r: 1.5,
    density: "std",
    desc: "24 / A4 · faipari default"
  },
  L7160: {
    code: "L7160",
    name: "63,5 × 38,1 mm",
    kind: "sheet",
    wmm: 63.5,
    hmm: 38.1,
    cols: 3,
    rows: 7,
    per: 21,
    mLeft: 7.2,
    mTop: 15.1,
    gx: 2.5,
    gy: 0,
    r: 1.5,
    density: "std",
    desc: "21 / A4 · legelterjedtebb"
  },
  L7163: {
    code: "L7163",
    name: "99,1 × 38,1 mm",
    kind: "sheet",
    wmm: 99.1,
    hmm: 38.1,
    cols: 2,
    rows: 7,
    per: 14,
    mLeft: 4.65,
    mTop: 15.1,
    gx: 2.5,
    gy: 0,
    r: 1.5,
    density: "compact",
    desc: "14 / A4 · polc-/rekesz"
  },
  L7165: {
    code: "L7165",
    name: "99,1 × 67,7 mm",
    kind: "sheet",
    wmm: 99.1,
    hmm: 67.7,
    cols: 2,
    rows: 4,
    per: 8,
    mLeft: 4.65,
    mTop: 13,
    gx: 2.5,
    gy: 0,
    r: 2,
    density: "full",
    desc: "8 / A4 · bővebb infó"
  },
  A6: {
    code: "A6",
    name: "105 × 148,5 mm (A6)",
    kind: "sheet",
    wmm: 105,
    hmm: 148.5,
    cols: 2,
    rows: 2,
    per: 4,
    mLeft: 0,
    mTop: 0,
    gx: 0,
    gy: 0,
    r: 0,
    density: "full",
    desc: "4 / A4 · nagy elem"
  },
  L7651: {
    code: "L7651",
    name: "38,1 × 21,2 mm",
    kind: "sheet",
    wmm: 38.1,
    hmm: 21.2,
    cols: 5,
    rows: 13,
    per: 65,
    mLeft: 4.75,
    mTop: 10.7,
    gx: 2.5,
    gy: 0,
    r: 1,
    density: "mini",
    desc: "65 / A4 · vonalkód-tag"
  },
  // ── Ipari (tekercs / thermal) — Zebra · Brother QL · TSC ──
  R100150: {
    code: "R100150",
    name: "100 × 150 mm",
    kind: "roll",
    wmm: 100,
    hmm: 150,
    r: 2,
    density: "full",
    desc: "4×6\" · logisztika / rakat"
  },
  R10050: {
    code: "R10050",
    name: "100 × 50 mm",
    kind: "roll",
    wmm: 100,
    hmm: 50,
    r: 2,
    density: "compact",
    desc: "bútorelem-azonosító"
  },
  R5840: {
    code: "R5840",
    name: "58 × 40 mm",
    kind: "roll",
    wmm: 58,
    hmm: 40,
    r: 1.5,
    density: "std",
    desc: "termék-/polccímke"
  },
  R5030: {
    code: "R5030",
    name: "50 × 30 mm",
    kind: "roll",
    wmm: 50,
    hmm: 30,
    r: 1.5,
    density: "std",
    desc: "kis termékcímke"
  },
  R4030: {
    code: "R4030",
    name: "40 × 30 mm",
    kind: "roll",
    wmm: 40,
    hmm: 30,
    r: 1,
    density: "mini",
    desc: "kis elem / vonalkód"
  }
};
const LABEL_SHEET_ORDER = ["L7159", "L7160", "L7163", "L7165", "A6", "L7651"];
const LABEL_ROLL_ORDER = ["R100150", "R10050", "R5840", "R5030", "R4030"];

// ── Faux-QR: determinisztikus mátrix a kódból (nem valódi QR, de annak látszik)
function lbHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function LbQR({
  code,
  size = 76
}) {
  const N = 21;
  let seed = lbHash(code || "x");
  const rnd = () => {
    seed = Math.imul(seed, 1664525) + 1013904223 >>> 0;
    return seed / 4294967296;
  };
  const cell = size / N;
  const isFinder = (r, c) => {
    const inBox = (br, bc) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
    return inBox(0, 0) || inBox(0, N - 7) || inBox(N - 7, 0);
  };
  const finderFill = (r, c) => {
    const local = (br, bc) => {
      const rr = r - br,
        cc = c - bc;
      if (rr === 0 || rr === 6 || cc === 0 || cc === 6) return true;
      if (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4) return true;
      return false;
    };
    if (r < 7 && c < 7) return local(0, 0);
    if (r < 7 && c >= N - 7) return local(0, N - 7);
    if (r >= N - 7 && c < 7) return local(N - 7, 0);
    return false;
  };
  const cells = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (isFinder(r, c)) {
      if (finderFill(r, c)) cells.push([r, c]);
      continue;
    }
    if (rnd() > 0.55) cells.push([r, c]);
  }
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${N} ${N}`,
    shapeRendering: "crispEdges",
    className: "block"
  }, /*#__PURE__*/React.createElement("rect", {
    width: N,
    height: N,
    fill: "#fff"
  }), cells.map(([r, c], i) => /*#__PURE__*/React.createElement("rect", {
    key: i,
    x: c,
    y: r,
    width: 1,
    height: 1,
    fill: "#0c0a09"
  })));
}

// ── Faux Code128-szerű vonalkód (a floor-szkennerek gyakran 1D-t olvasnak) ──
function LbBarcode({
  code,
  height = 26
}) {
  let seed = lbHash("128" + (code || "x"));
  const rnd = () => {
    seed = Math.imul(seed, 1664525) + 1013904223 >>> 0;
    return seed / 4294967296;
  };
  const bars = [];
  let x = 0;
  // kvázi-modulok: keret + adat (determinisztikus)
  const mods = 6 + (code || "").length * 6;
  for (let i = 0; i < mods; i++) {
    const w = 1 + Math.floor(rnd() * 3);
    if (i % 2 === 0) bars.push([x, w]);
    x += w;
  }
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${x} ${height}`,
    preserveAspectRatio: "none",
    width: "100%",
    height: height,
    shapeRendering: "crispEdges",
    className: "block"
  }, /*#__PURE__*/React.createElement("rect", {
    width: x,
    height: height,
    fill: "#fff"
  }), bars.map(([bx, bw], i) => /*#__PURE__*/React.createElement("rect", {
    key: i,
    x: bx,
    y: "0",
    width: bw,
    height: height,
    fill: "#0c0a09"
  })));
}

// ──────────────────────────────────────────────────────────────────────────
// LabelEngine — a nesting-tervből építi a címke-modellt
// ──────────────────────────────────────────────────────────────────────────
const LabelEngine = {
  // plan: NestEngine.run() kimenete; job: nestJob (parts route/edges/grain/contour)
  // → { boards:[{code,source,srcId,w,h,parts:[partInst]}], parts:[partInst], rakats:[{code,station,parts}] }
  build(plan, job) {
    if (!plan || !job) return {
      boards: [],
      parts: [],
      rakats: []
    };
    const jobNum = String(job.id).replace(/^SZ-\d+-/, "").replace(/\D/g, "") || String(job.id).slice(-3);
    const boards = [];
    const parts = [];
    let pseq = 0;
    (plan.sheets || []).forEach((sheet, si) => {
      const code = sheet.source === "offcut" ? `M${si + 1}` : `T${si + 1}`;
      const bParts = [];
      (sheet.placements || []).forEach(pl => {
        const def = (job.parts || [])[pl.partIdx] || {};
        pseq += 1;
        const inst = {
          code: `${job.id}/${code}/${String(pseq).padStart(2, "0")}`,
          seq: pseq,
          boardCode: code,
          boardIdx: si,
          name: def.name || pl.name || "Alkatrész",
          w: Math.round(pl.w),
          h: Math.round(pl.h),
          rot: !!pl.rot,
          grain: def.grain || null,
          edges: def.edges || {
            e: null,
            h: null,
            b: null,
            j: null
          },
          contour: def.contour || null,
          route: def.route || ["szereles"],
          material: job.material,
          order: job.order,
          customer: job.customer,
          partIdx: pl.partIdx
        };
        parts.push(inst);
        bParts.push(inst);
      });
      boards.push({
        code,
        source: sheet.source,
        srcId: sheet.srcId,
        w: sheet.w,
        h: sheet.h,
        yield: sheet.yield,
        parts: bParts
      });
    });
    // rakat-képzés: route[0] (köv. állomás) szerint kötegelve, kapacitás-szeleteléssel
    const CAP = 24;
    const byStation = {};
    parts.forEach(p => {
      const st = p.route && p.route[0] || "szereles";
      (byStation[st] = byStation[st] || []).push(p);
    });
    const rakats = [];
    (window.PROD_KIND_ORDER || Object.keys(byStation)).forEach(st => {
      const list = byStation[st];
      if (!list || !list.length) return;
      const abbr = LB_STATION_ABBR[st] || "XXX";
      let idx = 0;
      for (let i = 0; i < list.length; i += CAP) {
        idx += 1;
        const slice = list.slice(i, i + CAP);
        const code = `R-${jobNum}-${abbr}-${String(idx).padStart(2, "0")}`;
        slice.forEach(p => {
          p.rakat = code;
        });
        rakats.push({
          code,
          station: st,
          fromStation: "szabaszat",
          parts: slice
        });
      }
    });
    return {
      boards,
      parts,
      rakats
    };
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Kontúr-rajz (orientált) — E/H/B/J élek, élzárás vastagítva, szálirány nyíl
// ──────────────────────────────────────────────────────────────────────────
function LbContour({
  part,
  box = 150
}) {
  const ar = part.w / part.h;
  let dw = box,
    dh = box;
  if (ar >= 1) dh = box / ar;else dw = box * ar;
  const pad = 26;
  const W = dw + pad * 2,
    H = dh + pad * 2;
  // kontúr pontok (normalizált 0..1 → rajz koord). Téglalap, ha nincs contour.
  const norm = part.contour || [[0, 0], [1, 0], [1, 1], [0, 1]];
  const pts = norm.map(([x, y]) => [pad + x * dw, pad + y * dh]);
  const poly = pts.map(p => p.join(",")).join(" ");
  const cx = pad + dw / 2,
    cy = pad + dh / 2;
  // élzárás-vonalak a 4 bounding oldalon
  const edge = key => part.edges && part.edges[key];
  const accent = "#0d9488";
  const bandColor = "#ea580c";
  const grain = part.grain;
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} ${H}`,
    style: {
      width: "100%",
      height: "auto"
    },
    className: "block"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: poly,
    fill: "#f5f5f4",
    stroke: "#a8a29e",
    strokeWidth: "1.5"
  }), edge("h") && /*#__PURE__*/React.createElement("line", {
    x1: pad,
    y1: pad,
    x2: pad + dw,
    y2: pad,
    stroke: bandColor,
    strokeWidth: "5",
    strokeLinecap: "round"
  }), edge("e") && /*#__PURE__*/React.createElement("line", {
    x1: pad,
    y1: pad + dh,
    x2: pad + dw,
    y2: pad + dh,
    stroke: bandColor,
    strokeWidth: "5",
    strokeLinecap: "round"
  }), edge("b") && /*#__PURE__*/React.createElement("line", {
    x1: pad,
    y1: pad,
    x2: pad,
    y2: pad + dh,
    stroke: bandColor,
    strokeWidth: "5",
    strokeLinecap: "round"
  }), edge("j") && /*#__PURE__*/React.createElement("line", {
    x1: pad + dw,
    y1: pad,
    x2: pad + dw,
    y2: pad + dh,
    stroke: bandColor,
    strokeWidth: "5",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("text", {
    x: cx,
    y: pad - 9,
    textAnchor: "middle",
    fontSize: "13",
    fontWeight: "700",
    fill: edge("h") ? bandColor : "#78716c"
  }, "H"), /*#__PURE__*/React.createElement("text", {
    x: cx,
    y: pad + dh + 18,
    textAnchor: "middle",
    fontSize: "13",
    fontWeight: "700",
    fill: edge("e") ? bandColor : "#78716c"
  }, "E"), /*#__PURE__*/React.createElement("text", {
    x: pad - 14,
    y: cy + 4,
    textAnchor: "middle",
    fontSize: "13",
    fontWeight: "700",
    fill: edge("b") ? bandColor : "#78716c"
  }, "B"), /*#__PURE__*/React.createElement("text", {
    x: pad + dw + 14,
    y: cy + 4,
    textAnchor: "middle",
    fontSize: "13",
    fontWeight: "700",
    fill: edge("j") ? bandColor : "#78716c"
  }, "J"), grain === "hossz" && /*#__PURE__*/React.createElement("g", {
    stroke: accent,
    strokeWidth: "2.5",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: cx,
    y1: cy - dh * 0.28,
    x2: cx,
    y2: cy + dh * 0.28
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${cx - 5} ${cy - dh * 0.28 + 6} L${cx} ${cy - dh * 0.28} L${cx + 5} ${cy - dh * 0.28 + 6}`
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${cx - 5} ${cy + dh * 0.28 - 6} L${cx} ${cy + dh * 0.28} L${cx + 5} ${cy + dh * 0.28 - 6}`
  })), grain === "szel" && /*#__PURE__*/React.createElement("g", {
    stroke: accent,
    strokeWidth: "2.5",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: cx - dw * 0.28,
    y1: cy,
    x2: cx + dw * 0.28,
    y2: cy
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${cx - dw * 0.28 + 6} ${cy - 5} L${cx - dw * 0.28} ${cy} L${cx - dw * 0.28 + 6} ${cy + 5}`
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${cx + dw * 0.28 - 6} ${cy - 5} L${cx + dw * 0.28} ${cy} L${cx + dw * 0.28 - 6} ${cy + 5}`
  })));
}

// ── Állomás-jelvény ──────────────────────────────────────────────
function LbStationBadge({
  station,
  prefix = "→",
  size = "sm"
}) {
  const m = (window.PROD_KINDS || {})[station] || {};
  const cls = size === "lg" ? "text-[13px] px-2.5 h-7" : "text-[11px] px-2 h-6";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 rounded-full border font-semibold ${cls}`,
    style: {
      background: (m.accent || "#0d9488") + "14",
      color: m.accent,
      borderColor: (m.accent || "#0d9488") + "44"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "factory",
    size: size === "lg" ? 14 : 12
  }), prefix, " ", m.label || station);
}

// ── Technológiai folyamat-lánc (a route = a tervezés/gyártáselőkészítés által
//    meghatározott műveleti sor; a köv. állomás ebből szűrődik le) ──────────
function LbRouteChain({
  route
}) {
  const KINDS = window.PROD_KINDS || {};
  const chain = ["szabaszat", ...(route || [])];
  return /*#__PURE__*/React.createElement("div", {
    className: "px-2.5 py-1 border-t border-stone-200 flex items-center gap-1 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] uppercase tracking-wide text-stone-400 mr-0.5"
  }, "Folyamat"), chain.map((st, i) => {
    const m = KINDS[st] || {};
    const isDone = i === 0;
    const isNext = i === 1;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: st + i
    }, i > 0 && /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 9,
      className: "text-stone-300"
    }), /*#__PURE__*/React.createElement("span", {
      className: `text-[9px] font-medium ${isNext ? "px-1.5 py-0.5 rounded-full text-white" : isDone ? "text-stone-400 line-through" : "text-stone-500"}`,
      style: isNext ? {
        background: m.accent || "#0d9488"
      } : {}
    }, m.label || st));
  }));
}

// Fázis-info: a CÉL állomás művelete + konkrét utasítása (az aktuális info)
function lbStageInfo(part, station) {
  const banded = Object.keys(LB_EDGE_META).filter(k => part.edges && part.edges[k]);
  const bandMat = banded.length ? part.edges[banded[0]] : null;
  switch (station) {
    case "elzaras":
      return {
        op: "Élzárás",
        instr: banded.length ? `${banded.map(k => LB_EDGE_META[k].short).join("·")} él — ${bandMat}` : "nincs élzárandó él — átfut"
      };
    case "cnc":
      return {
        op: "CNC megmunkálás",
        instr: "Furat / maratás a gépnél lévő program szerint"
      };
    case "feluletkezeles":
      return {
        op: "Felületkezelés",
        instr: "Festés / lakkozás — felület-előkészítés"
      };
    case "szereles":
      return {
        op: "Összeszerelés",
        instr: "Korpuszba szerelés"
      };
    case "szabaszat":
      return {
        op: "Szabászat",
        instr: `${part.w}×${part.h} mm kiszabva`
      };
    default:
      return {
        op: (window.PROD_KINDS[station] || {}).label || station,
        instr: ""
      };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// ALKATRÉSZ-CÍMKE (etikett) — szabványos méretre igazítva (A4 ív vagy tekercs).
//   format: a tartalom a méret szerint sűrűsödik (full/compact/std/mini).
//   stageIndex: a route melyik átadási pontját címkézzük (0 = szabászat után).
// ──────────────────────────────────────────────────────────────────────────
function PartLabel({
  part,
  stageIndex = 0,
  format = "L7165"
}) {
  const f = LABEL_FORMATS[format] || LABEL_FORMATS.L7165;
  const mi = window.sim && window.sim.materialInfo ? window.sim.materialInfo(part.material) : {
    name: part.material,
    color: "#ddd"
  };
  const route = part.route || ["szereles"];
  const target = route[Math.min(stageIndex, route.length - 1)] || "szereles";
  const tMeta = (window.PROD_KINDS || {})[target] || {};
  const stage = lbStageInfo(part, target);
  const accent = tMeta.accent || "#0d9488";
  const banded = Object.keys(LB_EDGE_META).filter(k => part.edges && part.edges[k]);
  const bandMat = banded.length ? part.edges[banded[0]] : null;
  const grainTxt = part.grain === "hossz" ? "↕ hossz" : part.grain === "szel" ? "↔ kereszt" : "—";
  const stageLabel = stageIndex === 0 ? "Szabászat után" : `${(window.PROD_KINDS[route[stageIndex - 1]] || {}).label || ""} után`;
  const box = {
    width: f.wmm + "mm",
    height: f.hmm + "mm",
    borderRadius: (f.r || 0) + "mm"
  };
  const wrap = "lb-label bg-white border border-stone-800 overflow-hidden box-border flex flex-col";

  // ── MINI (38×21, 40×30) — vonalkód-tag ──
  if (f.density === "mini") {
    return /*#__PURE__*/React.createElement("div", {
      className: wrap,
      style: box
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between px-1 py-0.5 text-white shrink-0",
      style: {
        background: accent
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[7.5px] font-bold uppercase tracking-wide truncate"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: tMeta.icon || "factory",
      size: 9
    }), stage.op), /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-[8.5px] font-bold shrink-0"
    }, part.boardCode)), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 px-1 py-0.5 flex flex-col justify-center min-h-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[8px] font-bold text-stone-900 leading-tight truncate"
    }, part.name), /*#__PURE__*/React.createElement("div", {
      className: "mt-0.5"
    }, /*#__PURE__*/React.createElement(LbBarcode, {
      code: part.code,
      height: 15
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-1 leading-none mt-0.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[6.5px] font-mono text-stone-500 truncate"
    }, part.code), /*#__PURE__*/React.createElement("span", {
      className: "text-[7px] font-mono font-bold shrink-0",
      style: {
        color: accent
      }
    }, part.rakat))));
  }

  // ── STD (70×37, 63,5×38, 58×40, 50×30) — faipari default ──
  if (f.density === "std") {
    return /*#__PURE__*/React.createElement("div", {
      className: wrap,
      style: box
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between px-1.5 py-0.5 text-white shrink-0",
      style: {
        background: accent
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wide truncate"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: tMeta.icon || "factory",
      size: 12
    }), "\u2192 ", stage.op), /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-[10px] font-bold shrink-0"
    }, part.boardCode)), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 px-1.5 py-1 flex flex-col min-h-0 gap-0.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-baseline justify-between gap-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-bold text-stone-900 truncate leading-tight"
    }, part.name), /*#__PURE__*/React.createElement("span", {
      className: "text-[8.5px] font-mono font-bold shrink-0",
      style: {
        color: accent
      }
    }, part.rakat)), /*#__PURE__*/React.createElement("div", {
      className: "text-[7.5px] font-mono text-stone-500 truncate leading-none"
    }, part.code), /*#__PURE__*/React.createElement("div", {
      className: "text-[8px] text-stone-600 truncate leading-tight"
    }, part.w, "\xD7", part.h, " \xB7 sz\xE1l ", grainTxt, " \xB7 \xE9l ", banded.length ? banded.map(k => LB_EDGE_META[k].short).join("·") : "—"), /*#__PURE__*/React.createElement("div", {
      className: "flex items-end gap-1.5 mt-auto"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement(LbBarcode, {
      code: part.code,
      height: 20
    })), /*#__PURE__*/React.createElement(LbQR, {
      code: part.code,
      size: 34
    }))));
  }

  // ── COMPACT (99×38, 100×50) ──
  if (f.density === "compact") {
    return /*#__PURE__*/React.createElement("div", {
      className: wrap,
      style: box
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between px-2 py-1 text-white shrink-0",
      style: {
        background: accent
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide truncate"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: tMeta.icon || "factory",
      size: 14
    }), "\u2192 ", stage.op), /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-[10px] shrink-0"
    }, part.rakat)), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 flex items-stretch min-h-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "grid place-items-center border-r border-stone-200 p-1",
      style: {
        width: "26mm"
      }
    }, /*#__PURE__*/React.createElement(LbContour, {
      part: part,
      box: 88
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 px-2 py-1 min-w-0 flex flex-col justify-center gap-0.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-baseline justify-between gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-bold text-stone-900 truncate"
    }, part.name), /*#__PURE__*/React.createElement("span", {
      className: "text-[14px] font-extrabold font-mono text-stone-900 shrink-0"
    }, part.boardCode)), /*#__PURE__*/React.createElement("div", {
      className: "text-[8.5px] font-mono text-stone-500 truncate"
    }, part.code), /*#__PURE__*/React.createElement("div", {
      className: "text-[8.5px] text-stone-600 truncate"
    }, part.w, "\xD7", part.h, " mm \xB7 sz\xE1l ", grainTxt), /*#__PURE__*/React.createElement("div", {
      className: "text-[8.5px] text-stone-600 truncate"
    }, /*#__PURE__*/React.createElement("b", {
      className: "text-stone-800"
    }, "\xC9l:"), " ", banded.length ? `${banded.map(k => LB_EDGE_META[k].short).join("·")} ${bandMat}` : "nincs"), /*#__PURE__*/React.createElement("div", {
      className: "mt-0.5"
    }, /*#__PURE__*/React.createElement(LbBarcode, {
      code: part.code,
      height: 16
    }))), /*#__PURE__*/React.createElement("div", {
      className: "grid place-items-center p-1.5 shrink-0"
    }, /*#__PURE__*/React.createElement(LbQR, {
      code: part.code,
      size: 52
    }))));
  }

  // ── FULL (99×67,7, A6, 100×150) ──
  return /*#__PURE__*/React.createElement("div", {
    className: wrap,
    style: box
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-2.5 py-1.5 text-white shrink-0",
    style: {
      background: accent
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-2 min-w-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: tMeta.icon || "factory",
    size: 20,
    className: "shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "min-w-0 block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block text-[8px] uppercase tracking-wide opacity-80 leading-none"
  }, stageLabel, " \u2192"), /*#__PURE__*/React.createElement("span", {
    className: "block text-[15px] font-extrabold leading-tight truncate"
  }, stage.op))), /*#__PURE__*/React.createElement("span", {
    className: "text-right shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block text-[8px] uppercase opacity-75 leading-none"
  }, "t\xE1bla"), /*#__PURE__*/React.createElement("span", {
    className: "block font-mono text-[16px] font-extrabold leading-tight"
  }, part.boardCode))), /*#__PURE__*/React.createElement("div", {
    className: "px-2.5 py-1 bg-stone-900 text-white flex items-center gap-1.5 shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-teal-300 text-[8px] uppercase tracking-wide shrink-0"
  }, "Most"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] font-medium truncate flex-1"
  }, stage.instr), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[9px] text-stone-300 shrink-0"
  }, part.rakat)), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex min-h-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid place-items-center p-1.5 border-r border-stone-200",
    style: {
      width: "40mm"
    }
  }, /*#__PURE__*/React.createElement(LbContour, {
    part: part,
    box: 150
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 px-2 py-1.5 min-w-0 flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-bold text-stone-900 leading-tight truncate"
  }, part.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[9px] font-mono text-stone-500 truncate"
  }, part.code)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-1"
  }, /*#__PURE__*/React.createElement(LbQR, {
    code: part.code,
    size: 58
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[8px] uppercase text-stone-400 leading-none"
  }, "m\xE9ret"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-extrabold font-mono text-stone-900 leading-tight"
  }, part.w, "\xD7", part.h), /*#__PURE__*/React.createElement("div", {
    className: "text-[7.5px] text-stone-400"
  }, "mm"))), /*#__PURE__*/React.createElement("div", {
    className: "text-[9px] leading-snug text-stone-600 space-y-0.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-sm border border-black/10 shrink-0",
    style: {
      background: mi.color
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "truncate"
  }, mi.name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", {
    className: "text-stone-800"
  }, "Sz\xE1l:"), " ", grainTxt), /*#__PURE__*/React.createElement("div", {
    className: "truncate"
  }, /*#__PURE__*/React.createElement("b", {
    className: "text-stone-800"
  }, "\xC9l:"), " ", banded.length ? `${banded.map(k => LB_EDGE_META[k].label).join(", ")} — ${bandMat}` : "nincs")), /*#__PURE__*/React.createElement("div", {
    className: "mt-auto"
  }, /*#__PURE__*/React.createElement(LbBarcode, {
    code: part.code,
    height: 20
  })))), /*#__PURE__*/React.createElement(LbRouteChain, {
    route: part.route
  }));
}

// ──────────────────────────────────────────────────────────────────────────
// RAKAT-CÍMKE (pallet/köteg tag)
// ──────────────────────────────────────────────────────────────────────────
function RakatLabel({
  rakat,
  job
}) {
  const m = (window.PROD_KINDS || {})[rakat.station] || {};
  const names = {};
  rakat.parts.forEach(p => {
    names[p.name] = (names[p.name] || 0) + 1;
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg border-2 overflow-hidden",
    style: {
      width: 340,
      borderColor: m.accent || "#0d9488"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 flex items-center justify-between text-white",
    style: {
      background: m.accent || "#0d9488"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon || "factory",
    size: 20
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide opacity-80 leading-none"
  }, "Rakat"), /*#__PURE__*/React.createElement("div", {
    className: "text-[18px] font-extrabold font-mono leading-tight"
  }, rakat.code))), /*#__PURE__*/React.createElement(LbQR, {
    code: rakat.code,
    size: 56
  })), /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 flex items-center justify-between border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, "C\xE9l \xE1llom\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-bold",
    style: {
      color: m.accent
    }
  }, m.label || rakat.station)), /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-wide text-stone-400"
  }, "Tartalom"), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-bold text-stone-900"
  }, rakat.parts.length, " db")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-0.5"
  }, Object.entries(names).map(([n, c]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    className: "flex items-center justify-between text-[11px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-700 truncate"
  }, n), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-stone-500 shrink-0"
  }, c, "\xD7"))))), /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-1 bg-stone-50 border-t border-stone-200 text-[9.5px] font-mono text-stone-500 truncate"
  }, job ? `${job.order} · ${job.customer}` : ""));
}

// ──────────────────────────────────────────────────────────────────────────
// CÍMKE-ÍV — tábla→alkatrész→kódolt rakat. Irodai (A4 ív) VAGY Ipari (tekercs).
//   PDF-szerű mm-pontos render; 100% / „valós méret" nyomtatás (nem fit-to-page).
// ──────────────────────────────────────────────────────────────────────────
function LabelSheet({
  plan,
  job,
  onClose
}) {
  const model = LabelEngine.build(plan, job);
  const [view, setView] = useStateLb("parts"); // parts | rakat | boards
  const [mode, setMode] = useStateLb("sheet"); // sheet | roll
  const [format, setFormat] = useStateLb("L7159");
  const [phase, setPhase] = useStateLb("current"); // current | all
  const KINDS = window.PROD_KINDS || {};
  const f = LABEL_FORMATS[format] || LABEL_FORMATS.L7159;
  const formatList = mode === "sheet" ? LABEL_SHEET_ORDER : LABEL_ROLL_ORDER;
  const switchMode = m => {
    setMode(m);
    setFormat(m === "sheet" ? "L7159" : "R100150");
  };

  // alkatrész-címke tételek (fázis szerint: aktuális vagy minden átadási pont)
  const partItems = phase === "all" ? model.parts.flatMap(p => (p.route || ["szereles"]).map((_, si) => ({
    part: p,
    stageIndex: si,
    key: p.code + "-" + si
  }))) : model.parts.map(p => ({
    part: p,
    stageIndex: 0,
    key: p.code
  }));
  const renderPart = it => /*#__PURE__*/React.createElement(PartLabel, {
    key: it.key,
    part: it.part,
    stageIndex: it.stageIndex,
    format: format
  });
  const pages = [];
  if (mode === "sheet") for (let i = 0; i < partItems.length; i += f.per) pages.push(partItems.slice(i, i + f.per));
  const Seg = ({
    opts,
    val,
    set
  }) => /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-stone-100 rounded-lg p-0.5"
  }, opts.map(([k, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => set(k),
    className: `px-2.5 h-8 rounded-md text-[12px] font-medium ${val === k ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`
  }, lbl)));
  return /*#__PURE__*/React.createElement("div", {
    className: "lb-overlay fixed inset-0 z-[80] bg-stone-100 overflow-auto"
  }, /*#__PURE__*/React.createElement("style", null, `@media print{@page{size:A4;margin:0}.lb-overlay{position:static!important;overflow:visible!important;background:#fff!important}.lb-noprint{display:none!important}.lb-a4{box-shadow:none!important;margin:0 auto!important;page-break-after:always}.lb-roll{box-shadow:none!important;page-break-after:always;margin:0 auto!important}}`), /*#__PURE__*/React.createElement("div", {
    className: "lb-noprint sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1100px] mx-auto px-4 py-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-9 h-9 grid place-items-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 16,
    className: "rotate-180"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 truncate"
  }, "C\xEDmk\xE9k & rakatok \u2014 ", job.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, model.parts.length, " alkatr\xE9sz \xB7 ", model.boards.length, " t\xE1bla \xB7 ", model.rakats.length, " rakat")), /*#__PURE__*/React.createElement(Seg, {
    opts: [["parts", "Alkatrész-címkék"], ["rakat", "Rakatok"], ["boards", "Táblák"]],
    val: view,
    set: setView
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.print(),
    className: "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-teal-700 text-white text-[12.5px] font-medium hover:bg-teal-800 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 15
  }), "Nyomtat\xE1s")), view !== "boards" && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 flex items-center gap-2.5 flex-wrap"
  }, /*#__PURE__*/React.createElement(Seg, {
    opts: [["sheet", "Irodai · A4 ív"], ["roll", "Ipari · tekercs"]],
    val: mode,
    set: switchMode
  }), /*#__PURE__*/React.createElement("select", {
    value: format,
    onChange: e => setFormat(e.target.value),
    className: "h-9 rounded-lg border border-stone-200 bg-white px-2.5 text-[12.5px] text-stone-800"
  }, formatList.map(k => {
    const ff = LABEL_FORMATS[k];
    return /*#__PURE__*/React.createElement("option", {
      key: k,
      value: k
    }, ff.name, " \u2014 ", ff.desc);
  })), view === "parts" && /*#__PURE__*/React.createElement(Seg, {
    opts: [["current", "Aktuális fázis"], ["all", "Minden fázis"]],
    val: phase,
    set: setPhase
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, mode === "sheet" ? `${f.per} címke / A4 ív` : "tekercs / thermal")))), view !== "boards" && /*#__PURE__*/React.createElement("div", {
    className: "lb-noprint max-w-[1100px] mx-auto px-4 pt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11.5px] text-amber-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 15,
    className: "text-amber-500 shrink-0 mt-0.5"
  }), /*#__PURE__*/React.createElement("span", null, "Nyomtat\xE1skor \xE1ll\xEDtsd ", /*#__PURE__*/React.createElement("b", null, "100% / Val\xF3s m\xE9ret"), " (Actual size) \u2014 ", /*#__PURE__*/React.createElement("b", null, "ne"), " \u201Elapra igaz\xEDt\xE1s\" (fit to page), k\xFCl\xF6nben a c\xEDmk\xE9k nem esnek egybe a ", mode === "sheet" ? "címke-ív rácsával" : "tekercs-mérettel", "."))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1100px] mx-auto px-4 py-5 pb-24"
  }, view !== "boards" && /*#__PURE__*/React.createElement("div", {
    className: "lb-noprint mb-5 bg-white rounded-xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-2"
  }, "Szab\xE1szat ut\xE1n \u2014 k\xF6tegel\xE9s a k\xF6vetkez\u0151 \xE1llom\xE1s (technol\xF3giai folyamat) szerint"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, model.rakats.map(r => {
    const m = KINDS[r.station] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: r.code,
      className: "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
      style: {
        borderColor: (m.accent || "#999") + "55",
        background: (m.accent || "#999") + "0d"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon || "factory",
      size: 15,
      style: {
        color: m.accent
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[11.5px] font-mono font-semibold text-stone-800"
    }, r.code), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px]",
      style: {
        color: m.accent
      }
    }, m.label), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-400"
    }, "\xB7 ", r.parts.length, " db"));
  }))), view === "parts" && mode === "sheet" && /*#__PURE__*/React.createElement("div", null, pages.map((page, pi) => /*#__PURE__*/React.createElement("div", {
    key: pi,
    className: "lb-a4 bg-white shadow-lg mx-auto mb-6 overflow-hidden",
    style: {
      width: "210mm",
      height: "297mm",
      paddingTop: f.mTop + "mm",
      paddingLeft: f.mLeft + "mm",
      paddingRight: f.mLeft + "mm",
      boxSizing: "border-box"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(${f.cols}, ${f.wmm}mm)`,
      columnGap: f.gx + "mm",
      rowGap: f.gy + "mm"
    }
  }, page.map(renderPart)))), /*#__PURE__*/React.createElement("div", {
    className: "lb-noprint text-center text-[11px] text-stone-400"
  }, pages.length, " A4 \xEDv \xB7 ", partItems.length, " c\xEDmke")), view === "parts" && mode === "roll" && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-3"
  }, partItems.map(it => /*#__PURE__*/React.createElement("div", {
    key: it.key,
    className: "lb-roll bg-white shadow-md"
  }, renderPart(it)))), view === "rakat" && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, model.rakats.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.code
  }, /*#__PURE__*/React.createElement("div", {
    className: "lb-noprint flex items-center gap-2 mb-2.5"
  }, /*#__PURE__*/React.createElement(LbStationBadge, {
    station: r.station,
    prefix: "\u2192",
    size: "lg"
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[13px] font-bold text-stone-900"
  }, r.code), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-400"
  }, r.parts.length, " alkatr\xE9sz")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-3 items-start"
  }, /*#__PURE__*/React.createElement(RakatLabel, {
    rakat: r,
    job: job
  }), r.parts.map(p => /*#__PURE__*/React.createElement(PartLabel, {
    key: p.code,
    part: p,
    format: format
  })))))), view === "boards" && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, model.boards.map(b => /*#__PURE__*/React.createElement("div", {
    key: b.code,
    className: "bg-white rounded-xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-grid place-items-center w-9 h-9 rounded-lg bg-stone-900 text-white font-mono font-bold text-[14px]"
  }, b.code), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, b.source === "offcut" ? "Maradék" : "Tábla", " \xB7 ", b.w, "\xD7", b.h, " mm"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, b.parts.length, " alkatr\xE9sz \xB7 ", Math.round((b.yield || 0) * 100), "% kihaszn\xE1l\xE1s")))), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-[11.5px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "text-left text-[9.5px] uppercase tracking-wide text-stone-400 border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-1 pr-2"
  }, "Alkatr\xE9sz-k\xF3d"), /*#__PURE__*/React.createElement("th", {
    className: "py-1 px-2"
  }, "Megnevez\xE9s"), /*#__PURE__*/React.createElement("th", {
    className: "py-1 px-2 text-right"
  }, "M\xE9ret"), /*#__PURE__*/React.createElement("th", {
    className: "py-1 px-2"
  }, "Rakat"), /*#__PURE__*/React.createElement("th", {
    className: "py-1 pl-2"
  }, "K\xF6v. \xE1llom\xE1s"))), /*#__PURE__*/React.createElement("tbody", null, b.parts.map(p => {
    const m = KINDS[p.route && p.route[0]] || {};
    return /*#__PURE__*/React.createElement("tr", {
      key: p.code,
      className: "border-b border-stone-100 last:border-0"
    }, /*#__PURE__*/React.createElement("td", {
      className: "py-1 pr-2 font-mono text-stone-600"
    }, p.code), /*#__PURE__*/React.createElement("td", {
      className: "py-1 px-2 text-stone-800"
    }, p.name), /*#__PURE__*/React.createElement("td", {
      className: "py-1 px-2 text-right font-mono text-stone-500"
    }, p.w, "\xD7", p.h), /*#__PURE__*/React.createElement("td", {
      className: "py-1 px-2 font-mono text-stone-600"
    }, p.rakat), /*#__PURE__*/React.createElement("td", {
      className: "py-1 pl-2",
      style: {
        color: m.accent
      }
    }, m.label));
  })))))))));
}
Object.assign(window, {
  LabelEngine,
  PartLabel,
  RakatLabel,
  LabelSheet,
  LbQR,
  LbBarcode,
  LABEL_FORMATS
});
})();
