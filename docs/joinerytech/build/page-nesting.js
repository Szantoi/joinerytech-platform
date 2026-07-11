/* AUTO-GENERATED from page-nesting.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// SZABÁSZAT — anyagoptimalizálás (nesting) + maradékanyag-raktár (4.7-A)
// Gyártás → Szabászat. A NestEngine (data-nesting.js) tiszta motorjára épül.
//
// Felelősség: kiadott gyártási tétel (nestJob) alkatrész-listáját TÁBLÁKRA
// optimalizálja, 2D elrendezést rajzol (rotáció + kerf), kiszámolja a
// kihozatalt és a tábla-szükségletet, ELŐSZÖR a meglévő maradékból (offcut)
// keres helyet, majd VÉGLEGESÍTÉSKOR könyvel (tábla-fogyás + maradék raktárba).
// Kereskedői belépésnél SZABÁSZAT-AJÁNLAT is generálható (nestingToQuote).
//
// Scope: minden helyi név `nz`-prefixű; Icon/Card/StatusPill/PrimaryBtn/
// GhostBtn/useSim közvetlenül (megosztott globális scope).
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateNz,
  useMemo: useMemoNz,
  useEffect: useEffectNz
} = React;
const nzHuf = n => Math.round(Number(n) || 0).toLocaleString("hu-HU") + " Ft";
const nzPct = x => x == null ? "—" : (x * 100).toFixed(1) + "%";
const nzM2 = mm2 => (mm2 / 1e6).toFixed(2);

// Alkatrész-típusonkénti teal paletta (partIdx szerint).
const NZ_FILLS = ["#ccfbf1", "#99f6e4", "#5eead4", "#2dd4bf", "#14b8a6", "#0d9488", "#a7f3d0", "#6ee7b7"];
const NZ_STROKE = "#0f766e";
const nzFill = i => NZ_FILLS[i % NZ_FILLS.length];

// ──────────────────────────────────────────────────────────────────────────
// 2D elrendezés-rajz egy táblára (SVG). A szabad téglalapokat osztályozza:
// ≥ OFFCUT_MIN mindkét oldalon → maradék (amber, szaggatott), különben selejt.
// ──────────────────────────────────────────────────────────────────────────
function NzSheet({
  sheet,
  hover,
  onHover
}) {
  const PAD = 14;
  const MIN = window.NestEngine ? window.NestEngine.OFFCUT_MIN : 200;
  const vbW = sheet.w + PAD * 2;
  const vbH = sheet.h + PAD * 2 + 90;
  const isOffcut = sheet.source === "offcut";
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${vbW} ${vbH}`,
    style: {
      width: "100%",
      height: "auto"
    },
    className: "block select-none"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("pattern", {
    id: "nzGrain",
    width: "46",
    height: "46",
    patternUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "46",
    height: "46",
    fill: isOffcut ? "#fffbeb" : "#fafaf9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M0 23 Q23 12 46 23",
    stroke: isOffcut ? "#fde68a" : "#e7e5e4",
    strokeWidth: "2.5",
    fill: "none"
  })), /*#__PURE__*/React.createElement("pattern", {
    id: "nzScrap",
    width: "22",
    height: "22",
    patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "22",
    height: "22",
    fill: "#fff"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "22",
    stroke: "#e7e5e4",
    strokeWidth: "6"
  }))), /*#__PURE__*/React.createElement("g", {
    transform: `translate(${PAD},${PAD})`
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "0",
    width: sheet.w,
    height: sheet.h,
    fill: "url(#nzGrain)",
    stroke: isOffcut ? "#d97706" : "#a8a29e",
    strokeWidth: isOffcut ? 10 : 6
  }), (sheet.free || []).map((f, i) => {
    const keep = f.w >= MIN && f.h >= MIN;
    if (keep) {
      return /*#__PURE__*/React.createElement("g", {
        key: "f" + i
      }, /*#__PURE__*/React.createElement("rect", {
        x: f.x,
        y: f.y,
        width: f.w,
        height: f.h,
        fill: "#fef3c7",
        fillOpacity: "0.7",
        stroke: "#d97706",
        strokeWidth: "5",
        strokeDasharray: "22 14"
      }), f.w > 360 && f.h > 200 && /*#__PURE__*/React.createElement("text", {
        x: f.x + f.w / 2,
        y: f.y + f.h / 2,
        textAnchor: "middle",
        dominantBaseline: "middle",
        fontSize: "58",
        fill: "#b45309",
        fontFamily: "ui-monospace,monospace",
        fontWeight: "600"
      }, "marad\xE9k ", Math.round(f.w), "\xD7", Math.round(f.h)));
    }
    return /*#__PURE__*/React.createElement("rect", {
      key: "f" + i,
      x: f.x,
      y: f.y,
      width: f.w,
      height: f.h,
      fill: "url(#nzScrap)"
    });
  }), (sheet.placements || []).map((p, i) => {
    const isHover = hover === i;
    return /*#__PURE__*/React.createElement("g", {
      key: i,
      onMouseEnter: () => onHover(i),
      onMouseLeave: () => onHover(null),
      style: {
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("rect", {
      x: p.x,
      y: p.y,
      width: p.w,
      height: p.h,
      fill: nzFill(p.partIdx),
      fillOpacity: isHover ? 1 : 0.92,
      stroke: isHover ? "#0b4f47" : NZ_STROKE,
      strokeWidth: isHover ? 11 : 5
    }), p.w > 200 && p.h > 120 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("text", {
      x: p.x + p.w / 2,
      y: p.y + p.h / 2 - 22,
      textAnchor: "middle",
      dominantBaseline: "middle",
      fontSize: "58",
      fill: "#134e4a",
      fontWeight: "700"
    }, p.name), /*#__PURE__*/React.createElement("text", {
      x: p.x + p.w / 2,
      y: p.y + p.h / 2 + 40,
      textAnchor: "middle",
      dominantBaseline: "middle",
      fontSize: "50",
      fill: "#0f766e",
      fontFamily: "ui-monospace,monospace"
    }, Math.round(p.w), "\xD7", Math.round(p.h), p.rot ? " ⟲" : "")));
  }), /*#__PURE__*/React.createElement("text", {
    x: sheet.w / 2,
    y: sheet.h + 56,
    textAnchor: "middle",
    fontSize: "56",
    fill: "#78716c",
    fontFamily: "ui-monospace,monospace"
  }, sheet.w, " \xD7 ", sheet.h, " mm", isOffcut ? "  ·  MARADÉKBÓL" : "")));
}

// ── KPI kártya ───────────────────────────────────────────────────────────
function NzKpi({
  label,
  value,
  tone,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-50 border border-stone-200/70 rounded-lg px-3 py-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-500"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: `text-[19px] font-semibold tabular-nums leading-tight ${tone || "text-stone-900"}`
  }, value), sub && /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-0.5"
  }, sub));
}

// ──────────────────────────────────────────────────────────────────────────
// Fő komponens — Szabászat-optimalizáló
// ──────────────────────────────────────────────────────────────────────────
function CuttingOptimizer() {
  const sim = useSim();
  const E = window.NestEngine;
  const jobs = sim.nestJobList ? sim.nestJobList() : [];
  const [jobId, setJobId] = useStateNz(jobs[0] ? jobs[0].id : null);
  const job = jobs.find(j => j.id === jobId) || jobs[0] || null;
  const [sheetIdx, setSheetIdx] = useStateNz(0);
  const [hover, setHover] = useStateNz(null);
  const [showList, setShowList] = useStateNz(false);
  const [computing, setComputing] = useStateNz(false);
  const [runToken, setRunToken] = useStateNz(0);
  const [showLabels, setShowLabels] = useStateNz(false);
  const canQuote = sim.hasPerm && sim.hasPerm("quote.create");

  // anyag-választó: Lapanyag (Tervezés) panel-anyagok (m²)
  const materials = (sim.designMaterials ? sim.designMaterials() : []).filter(m => m.unit === "m²" || E && E.boardSize && window.NEST_BOARD_SIZE[m.code]);

  // élő terv-számítás (futtatás-token + job + anyag + offcut-készlet)
  const plan = useMemoNz(() => {
    if (!job || !E) return null;
    const board = E.boardSize(job.material);
    const offcuts = sim.offcutStockFor ? sim.offcutStockFor(job.material) : [];
    return E.run({
      parts: job.parts,
      board,
      kerf: E.KERF,
      offcuts
    });
    // eslint-disable-next-line
  }, [job && job.id, job && job.material, runToken, (sim.offcuts || []).length]);
  useEffectNz(() => {
    setSheetIdx(0);
    setHover(null);
  }, [job && job.id, job && job.material, runToken]);
  if (!job) {
    return /*#__PURE__*/React.createElement("div", {
      className: "px-4 md:px-7 py-10 max-w-[1400px] mx-auto text-center text-stone-500 text-[13px]"
    }, "Nincs szab\xE1szati t\xE9tel.");
  }
  const mi = sim.materialInfo(job.material);
  const board = E.boardSize(job.material);
  const sum = plan ? plan.summary : null;
  const boardM2 = board.w * board.h / 1e6;
  const boardCost = sum ? Math.round(sum.boards * boardM2 * (mi.price || 0)) : 0;
  const sheets = plan ? plan.sheets : [];
  const cur = sheets[Math.min(sheetIdx, sheets.length - 1)] || null;
  const statusMeta = (window.NEST_STATUS || {})[job.status] || window.NEST_STATUS.terv;
  const runOptim = () => {
    setComputing(true);
    setTimeout(() => {
      setRunToken(t => t + 1);
      setComputing(false);
    }, 380);
  };
  const commit = () => {
    if (plan) sim.commitNesting(job.id, plan);
  };
  const makeQuote = () => {
    if (plan) sim.nestingToQuote(job.id, plan);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-teal-700 font-medium"
  }, "Szab\xE1szat \xB7 anyagoptimaliz\xE1l\xE1s"), /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] font-semibold text-stone-900 leading-tight mt-0.5"
  }, "Nesting & marad\xE9kanyag-rakt\xE1r"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-stone-500 mt-0.5"
  }, "2D guillotine-nesting rot\xE1ci\xF3val \xE9s ", E.KERF, " mm v\xE1g\xE1si r\xE9ssel. A marad\xE9k (", E.OFFCUT_MIN, "+ mm) visszaker\xFCl a rakt\xE1rba \xE9s \xFAjrahasznosul."))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-12 gap-3"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "lg:col-span-3 p-0 self-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-200/80 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "Szab\xE1szati t\xE9telek"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-500 tabular-nums"
  }, jobs.length)), /*#__PURE__*/React.createElement("div", {
    className: "max-h-[560px] overflow-auto"
  }, jobs.map(j => {
    const active = j.id === jobId;
    const sm = (window.NEST_STATUS || {})[j.status] || window.NEST_STATUS.terv;
    return /*#__PURE__*/React.createElement("button", {
      key: j.id,
      onClick: () => setJobId(j.id),
      className: `w-full text-left px-4 py-3 border-b border-stone-100 last:border-0 ${active ? "bg-teal-50/60" : "hover:bg-stone-50"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2 mb-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-mono text-stone-600"
    }, j.id), /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-medium border ${sm.pill}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${sm.dot}`
    }), sm.label)), /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900 leading-tight"
    }, j.title), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 mt-1"
    }, j.customer), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 flex items-center gap-2 text-[10px] text-stone-400 font-mono"
    }, /*#__PURE__*/React.createElement("span", null, j.material), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, j.parts.reduce((s, p) => s + p.qty, 0), " db")));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-9 space-y-3"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col md:flex-row md:items-start md:justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-mono text-stone-500"
  }, job.id), /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusMeta.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${statusMeta.dot}`
  }), statusMeta.label), job.planRef && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-mono text-teal-700"
  }, "\u2192 ", job.planRef), job.quoteRef && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-mono text-indigo-600"
  }, "\u2192 ", job.quoteRef)), /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 mt-1"
  }, job.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-0.5 font-mono"
  }, job.customer, " \xB7 ", job.order), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 mt-1"
  }, job.note)), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2 shrink-0 w-full md:w-auto"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] uppercase tracking-wide text-stone-500"
  }, "T\xE1bla-anyag"), /*#__PURE__*/React.createElement("select", {
    value: job.material,
    onChange: e => sim.setNestJobMaterial(job.id, e.target.value),
    className: "h-9 rounded-lg border border-stone-200 bg-white px-2 text-[12.5px] text-stone-800 min-w-[220px]"
  }, materials.map(m => /*#__PURE__*/React.createElement("option", {
    key: m.code,
    value: m.code
  }, m.name, " (", m.code, ")")), !materials.find(m => m.code === job.material) && /*#__PURE__*/React.createElement("option", {
    value: job.material
  }, job.material)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 font-mono"
  }, "T\xE1bla ", board.w, "\xD7", board.h, " \xB7 ", nzHuf(Math.round(boardM2 * (mi.price || 0))), "/t\xE1bla"), /*#__PURE__*/React.createElement("button", {
    onClick: runOptim,
    disabled: computing,
    className: "inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg bg-teal-700 text-white text-[12.5px] font-medium hover:bg-teal-800 active:scale-[.99] transition shadow-sm disabled:opacity-60"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: computing ? "settings" : "cut",
    size: 15,
    className: computing ? "animate-spin" : ""
  }), computing ? "Optimalizálás…" : "Optimalizálás futtatása")))), sum && /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "Eredm\xE9ny-\xF6sszegz\xE9s"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowList(v => !v),
    className: "text-[11px] text-teal-700 hover:underline inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 12
  }), showList ? "Vágási lista elrejtése" : "Vágási lista")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2"
  }, /*#__PURE__*/React.createElement(NzKpi, {
    label: "T\xE1bla-sz\xFCks\xE9glet",
    value: sum.boards,
    tone: "text-stone-900",
    sub: `${sum.totalPartCount} alkatrész`
  }), /*#__PURE__*/React.createElement(NzKpi, {
    label: "Marad\xE9kb\xF3l",
    value: sum.offcutSheets,
    tone: "text-amber-700",
    sub: "\xFAjrahasznos\xEDtott"
  }), /*#__PURE__*/React.createElement(NzKpi, {
    label: "Kihozatal",
    value: nzPct(sum.yieldPct),
    tone: "text-teal-700",
    sub: "anyag-kihaszn\xE1l\xE1s"
  }), /*#__PURE__*/React.createElement(NzKpi, {
    label: "Selejt",
    value: nzPct(sum.scrapPct),
    tone: "text-rose-600",
    sub: `${nzM2(sum.scrapArea)} m²`
  }), /*#__PURE__*/React.createElement(NzKpi, {
    label: "\xDAj marad\xE9k",
    value: sum.newOffcuts.length,
    tone: "text-amber-700",
    sub: `${nzM2(sum.newOffcutArea)} m² raktárba`
  }), /*#__PURE__*/React.createElement(NzKpi, {
    label: "Becs\xFClt anyag",
    value: nzHuf(boardCost),
    tone: "text-stone-900",
    sub: `${sum.boards} × tábla`
  })), sum.unplaced && plan.unplaced.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
  }, "\u26A0\uFE0F ", plan.unplaced.length, " alkatr\xE9sz nem f\xE9r r\xE1 a t\xE1bl\xE1ra (t\xFAl nagy) \u2014 ellen\u0151rizd a m\xE9reteket."), showList && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-[12px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "text-left text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-1.5 pr-3"
  }, "Alkatr\xE9sz"), /*#__PURE__*/React.createElement("th", {
    className: "py-1.5 px-2 text-right"
  }, "M\xE9ret (mm)"), /*#__PURE__*/React.createElement("th", {
    className: "py-1.5 px-2 text-right"
  }, "Db"), /*#__PURE__*/React.createElement("th", {
    className: "py-1.5 px-2 text-right"
  }, "m\xB2/db"), /*#__PURE__*/React.createElement("th", {
    className: "py-1.5 px-2 text-center"
  }, "Forgathat\xF3"))), /*#__PURE__*/React.createElement("tbody", null, job.parts.map((p, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    className: "border-b border-stone-100 last:border-0"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-1.5 pr-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded-sm",
    style: {
      background: nzFill(i),
      border: `1.5px solid ${NZ_STROKE}`
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-800"
  }, p.name))), /*#__PURE__*/React.createElement("td", {
    className: "py-1.5 px-2 text-right font-mono text-stone-700"
  }, p.w, " \xD7 ", p.h), /*#__PURE__*/React.createElement("td", {
    className: "py-1.5 px-2 text-right font-mono text-stone-700"
  }, p.qty), /*#__PURE__*/React.createElement("td", {
    className: "py-1.5 px-2 text-right font-mono text-stone-500"
  }, (p.w * p.h / 1e6).toFixed(3)), /*#__PURE__*/React.createElement("td", {
    className: "py-1.5 px-2 text-center"
  }, p.rotatable !== false ? /*#__PURE__*/React.createElement("span", {
    className: "text-teal-600"
  }, "\u27F2 igen") : /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "\u2014 sz\xE1lir\xE1ny")))))))), cur && /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3 gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "2D elrendez\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-[10.5px] text-stone-500 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded-sm bg-teal-300 border border-teal-700"
  }), "Alkatr\xE9sz"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded-sm border-2 border-dashed border-amber-500 bg-amber-100"
  }), "Marad\xE9k"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded-sm",
    style: {
      background: "repeating-linear-gradient(45deg,#fff,#fff 2px,#e7e5e4 2px,#e7e5e4 4px)"
    }
  }), "Selejt"))), /*#__PURE__*/React.createElement("div", {
    className: `rounded-lg border p-3 ${cur.source === "offcut" ? "border-amber-200 bg-amber-50/30" : "border-stone-200/70 bg-stone-50/40"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-mono text-stone-500"
  }, "T\xE1bla ", sheetIdx + 1, " / ", sheets.length, cur.source === "offcut" ? /*#__PURE__*/React.createElement("span", {
    className: "text-amber-700"
  }, " \xB7 marad\xE9kb\xF3l (", cur.srcId, ")") : ""), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-mono text-teal-700"
  }, nzPct(cur.yield), " kihaszn\xE1l\xE1s")), /*#__PURE__*/React.createElement(NzSheet, {
    sheet: cur,
    hover: hover,
    onHover: setHover
  })), sheets.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSheetIdx(Math.max(0, sheetIdx - 1)),
    disabled: sheetIdx === 0,
    className: "w-7 h-7 grid place-items-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-30"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14,
    className: "rotate-180"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 flex-wrap"
  }, sheets.map((s, i) => {
    const active = i === sheetIdx;
    const oc = s.source === "offcut";
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => setSheetIdx(i),
      title: `Tábla ${i + 1} · ${nzPct(s.yield)}${oc ? " · maradékból" : ""}`,
      className: `relative w-12 h-9 rounded-md border-2 overflow-hidden ${active ? oc ? "border-amber-500" : "border-teal-600" : "border-stone-200 hover:border-stone-300"} ${oc ? "bg-amber-50" : "bg-stone-50"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "absolute inset-0 grid place-items-center text-[10px] font-mono text-stone-600"
    }, i + 1, oc ? "↻" : ""), /*#__PURE__*/React.createElement("span", {
      className: `absolute bottom-0 left-0 h-0.5 ${oc ? "bg-amber-500" : "bg-teal-600"}`,
      style: {
        width: `${Math.round(s.yield * 100)}%`
      }
    }));
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSheetIdx(Math.min(sheets.length - 1, sheetIdx + 1)),
    disabled: sheetIdx >= sheets.length - 1,
    className: "w-7 h-7 grid place-items-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-30"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14
  })))), sum && /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, job.status === "veglegesitve" ? /*#__PURE__*/React.createElement("span", {
    className: "text-teal-700"
  }, "\u2713 A terv v\xE9gleges\xEDtve \u2014 ", sum.boards, " t\xE1bla lefoglalva, marad\xE9k rakt\xE1rba k\xF6nyvelve.") : /*#__PURE__*/React.createElement(React.Fragment, null, "V\xE9gleges\xEDt\xE9skor a rendszer lefoglalja a t\xE1bl\xE1kat \xE9s a ", sum.newOffcuts.length, " marad\xE9kot a rakt\xE1rba k\xF6nyveli", sum.offcutSheets ? `, valamint ${sum.offcutSheets} felhasznált maradékot kivezet` : "", ".")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 shrink-0"
  }, /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "qr",
    onClick: () => setShowLabels(true)
  }, "C\xEDmk\xE9k & rakatok"), canQuote && /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "briefcase",
    onClick: makeQuote
  }, "Szab\xE1szat-aj\xE1nlat"), /*#__PURE__*/React.createElement("button", {
    onClick: commit,
    disabled: job.status === "veglegesitve",
    className: "inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-teal-700 text-white text-[12.5px] font-medium hover:bg-teal-800 active:scale-[.99] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 15
  }), job.status === "veglegesitve" ? "Véglegesítve" : "Véglegesítés")))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement(OffcutWarehouse, {
    activeMaterial: job.material
  })), showLabels && plan && window.LabelSheet && /*#__PURE__*/React.createElement(window.LabelSheet, {
    plan: plan,
    job: job,
    onClose: () => setShowLabels(false)
  }));
}

// ──────────────────────────────────────────────────────────────────────────
// Maradékanyag-raktár — offcut-lotok anyag + zóna szerint
// ──────────────────────────────────────────────────────────────────────────
function OffcutWarehouse({
  activeMaterial,
  standalone
}) {
  const sim = useSim();
  const offcuts = sim.offcutList ? sim.offcutList() : [];
  const Z = window.OFFCUT_ZONES || {};
  const [zoneFilter, setZoneFilter] = useStateNz("all");

  // anyagonként csoportosítva
  const byMat = {};
  offcuts.forEach(o => {
    (byMat[o.material] = byMat[o.material] || []).push(o);
  });
  const mats = Object.keys(byMat).sort((a, b) => a === activeMaterial ? -1 : b === activeMaterial ? 1 : a.localeCompare(b));
  const zoneCounts = {};
  (window.OFFCUT_ZONE_ORDER || []).forEach(z => {
    zoneCounts[z] = offcuts.filter(o => o.zone === z).reduce((s, o) => s + (Number(o.qty) || 0), 0);
  });
  const availArea = offcuts.filter(o => o.zone === "available").reduce((s, o) => s + o.w * o.h * (Number(o.qty) || 0), 0);
  const visible = list => zoneFilter === "all" ? list : list.filter(o => o.zone === zoneFilter);
  return /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "box",
    size: 15,
    className: "text-amber-600"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "Marad\xE9kanyag-rakt\xE1r")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mt-0.5"
  }, "Szabad marad\xE9k: ", /*#__PURE__*/React.createElement("b", {
    className: "text-amber-700"
  }, zoneCounts.available || 0, " db"), " \xB7 ", nzM2(availArea), " m\xB2 \xB7 a nesting automatikusan ezt haszn\xE1lja el\u0151sz\xF6r.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setZoneFilter("all"),
    className: `px-2.5 h-7 rounded-md text-[11px] font-medium border ${zoneFilter === "all" ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`
  }, "Mind"), (window.OFFCUT_ZONE_ORDER || []).map(z => {
    const m = Z[z];
    if (!m) return null;
    return /*#__PURE__*/React.createElement("button", {
      key: z,
      onClick: () => setZoneFilter(z),
      className: `px-2.5 h-7 rounded-md text-[11px] font-medium border inline-flex items-center gap-1.5 ${zoneFilter === z ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${m.dot}`
    }), m.label, /*#__PURE__*/React.createElement("span", {
      className: "tabular-nums opacity-70"
    }, zoneCounts[z] || 0));
  }))), mats.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 py-6 text-center"
  }, "Nincs marad\xE9kanyag a rakt\xE1rban."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, mats.map(code => {
    const list = visible(byMat[code]);
    if (!list.length) return null;
    const mi = sim.materialInfo(code);
    const isActive = code === activeMaterial;
    return /*#__PURE__*/React.createElement("div", {
      key: code,
      className: `rounded-lg border ${isActive ? "border-amber-200 bg-amber-50/30" : "border-stone-200/70"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-3 py-2 flex items-center justify-between border-b border-stone-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-3.5 h-3.5 rounded border border-black/10",
      style: {
        background: mi.color
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] font-semibold text-stone-800"
    }, mi.name), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-mono text-stone-400"
    }, code), isActive && /*#__PURE__*/React.createElement("span", {
      className: "text-[9.5px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium"
    }, "aktu\xE1lis")), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-400 tabular-nums"
    }, list.reduce((s, o) => s + (Number(o.qty) || 0), 0), " db")), /*#__PURE__*/React.createElement("div", {
      className: "p-2 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2"
    }, list.map(o => {
      const m = Z[o.zone] || Z.available;
      return /*#__PURE__*/React.createElement("div", {
        key: o.id,
        className: "bg-white border border-stone-200/70 rounded-lg p-2.5"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between gap-1 mb-1"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] font-mono text-stone-500"
      }, o.id), /*#__PURE__*/React.createElement("span", {
        className: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${m.pill}`
      }, /*#__PURE__*/React.createElement("span", {
        className: `w-1.5 h-1.5 rounded-full ${m.dot}`
      }), m.short)), /*#__PURE__*/React.createElement("div", {
        className: "text-[14px] font-semibold text-stone-900 font-mono tabular-nums"
      }, o.w, "\xD7", o.h, /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] text-stone-400 font-normal"
      }, " mm")), /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] text-stone-400 mt-0.5 flex items-center justify-between"
      }, /*#__PURE__*/React.createElement("span", null, (o.w * o.h / 1e6).toFixed(2), " m\xB2", (o.qty || 1) > 1 ? ` · ${o.qty}×` : ""), /*#__PURE__*/React.createElement("span", {
        className: "font-mono"
      }, o.loc)), /*#__PURE__*/React.createElement("div", {
        className: "text-[9.5px] text-stone-300 mt-0.5 font-mono"
      }, o.fromJob, " \xB7 ", o.createdAt), o.zone === "available" && /*#__PURE__*/React.createElement("button", {
        onClick: () => sim.scrapOffcut(o.id),
        className: "mt-1.5 text-[10px] text-rose-500 hover:text-rose-700 hover:underline"
      }, "Selejtez\xE9s"), o.zone === "scrap" && /*#__PURE__*/React.createElement("button", {
        onClick: () => sim.restoreOffcut(o.id),
        className: "mt-1.5 text-[10px] text-stone-400 hover:text-amber-600 hover:underline"
      }, "Vissza\xE1ll\xEDt\xE1s"));
    })));
  })));
}
window.CuttingOptimizer = CuttingOptimizer;
window.OffcutWarehouse = OffcutWarehouse;
})();
