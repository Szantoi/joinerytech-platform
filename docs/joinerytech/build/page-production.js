/* AUTO-GENERATED from page-production.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// Page: Production — with nesting visualization
const {
  useState: useStateP
} = React;
function NestingSVG({
  plan,
  onPart,
  hover,
  parts
}) {
  const sheet = NESTING.sheet;
  const SCALE = 0.18; // mm → px
  const W = sheet.w * SCALE;
  const H = sheet.h * SCALE;
  const usedParts = parts || NESTING.parts;
  // alternating fills using teal palette
  const fills = ["#ccfbf1", "#99f6e4", "#5eead4", "#14b8a6"];
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W + 24} ${H + 36}`,
    style: {
      width: "100%",
      height: "auto"
    },
    className: "block"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("pattern", {
    id: "grain",
    x: "0",
    y: "0",
    width: "6",
    height: "6",
    patternUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "6",
    height: "6",
    fill: "#fafaf9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M0 3 Q3 1.5 6 3",
    stroke: "#e7e5e4",
    strokeWidth: ".5",
    fill: "none"
  }))), /*#__PURE__*/React.createElement("g", {
    transform: "translate(12,12)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "0",
    width: W,
    height: H,
    fill: "url(#grain)",
    stroke: "#a8a29e",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("text", {
    x: W / 2,
    y: H + 16,
    textAnchor: "middle",
    fontSize: "9",
    fill: "#78716c",
    fontFamily: "ui-monospace,monospace"
  }, sheet.w, " \xD7 ", sheet.h, " mm"), usedParts.map((p, i) => {
    const x = p.x * SCALE;
    const y = p.y * SCALE;
    const w = p.w * SCALE;
    const h = p.h * SCALE;
    const fill = fills[i % fills.length];
    const isHover = hover === p.id;
    return /*#__PURE__*/React.createElement("g", {
      key: p.id,
      onMouseEnter: () => onPart(p.id),
      onMouseLeave: () => onPart(null),
      style: {
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("rect", {
      x: x,
      y: y,
      width: w,
      height: h,
      fill: fill,
      fillOpacity: isHover ? 1 : 0.85,
      stroke: isHover ? "#0f766e" : "#0d9488",
      strokeWidth: isHover ? 1.5 : 0.75
    }), /*#__PURE__*/React.createElement("text", {
      x: x + w / 2,
      y: y + h / 2 - 2,
      textAnchor: "middle",
      fontSize: "8.5",
      fill: "#134e4a",
      fontWeight: "600"
    }, p.label), /*#__PURE__*/React.createElement("text", {
      x: x + w / 2,
      y: y + h / 2 + 9,
      textAnchor: "middle",
      fontSize: "7.5",
      fill: "#0f766e",
      fontFamily: "ui-monospace,monospace"
    }, p.w, "\xD7", p.h));
  })));
}
function ProductionPage({
  t,
  initialTab
}) {
  const [tab, setTab] = useStateP(initialTab || "cutting");
  const [selectedPlan, setSelectedPlan] = useStateP(CUTTING_PLANS[0].id);
  const [hoverPart, setHoverPart] = useStateP(null);
  const [sheetIdx, setSheetIdx] = useStateP(0);
  const plan = CUTTING_PLANS.find(p => p.id === selectedPlan);
  // Build per-sheet parts: sheet 0 is the canonical NESTING.parts; rest from NESTING_SHEETS
  const sheetCount = Math.max(plan.sheets, 1);
  const getSheet = i => {
    if (i === 0) return {
      parts: NESTING.parts,
      util: plan.util
    };
    const ext = NESTING_SHEETS[i] || NESTING_SHEETS[i % (NESTING_SHEETS.length - 1) + 1];
    return ext;
  };
  const curSheet = getSheet(sheetIdx);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
  }, tab === "cutting" && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-12 gap-3"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "lg:col-span-4 p-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-200/80 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, t.prod.cuttingPlans), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-500 tabular-nums"
  }, CUTTING_PLANS.length)), /*#__PURE__*/React.createElement("div", {
    className: "max-h-[640px] overflow-auto"
  }, CUTTING_PLANS.map(p => {
    const active = p.id === selectedPlan;
    // Per-plan run state: deterministic but feels live
    const seed = p.id.charCodeAt(p.id.length - 1);
    const progress = p.status === "running" ? 30 + seed * 7 % 55 : p.status === "done" ? 100 : 0;
    const runtimeMin = p.status === "running" ? 12 + seed * 3 % 35 : p.status === "done" ? 38 + seed * 2 % 22 : 0;
    const proof = p.status === "done";
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      onClick: () => setSelectedPlan(p.id),
      className: `w-full text-left px-4 py-3 border-b border-stone-100 last:border-0 ${active ? "bg-teal-50/60" : "hover:bg-stone-50"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2 mb-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[11.5px] font-mono text-stone-700"
    }, p.id), /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1.5"
    }, proof && /*#__PURE__*/React.createElement("span", {
      title: "Bizonylat csatolva",
      className: "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 9
    }), "proof"), /*#__PURE__*/React.createElement(StatusPill, {
      status: p.status,
      label: t.status[p.status]
    }))), /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900"
    }, p.material), /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5 flex items-center gap-2 text-[10.5px] text-stone-500"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-mono"
    }, p.sheets, " ", t.prod.sheet), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, t.prod.utilization, " ", p.util, "%"), p.status === "running" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-teal-700"
    }, runtimeMin, " perc fut\xE1s"))), p.status === "running" && /*#__PURE__*/React.createElement("div", {
      className: "mt-2 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex-1 h-1 bg-stone-100 rounded-full overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-full bg-teal-600 rounded-full transition-all",
      style: {
        width: `${progress}%`,
        boxShadow: "0 0 6px rgba(13,148,136,.4)"
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] tabular-nums font-mono text-teal-700 w-9 text-right"
    }, progress, "%")));
  }))), /*#__PURE__*/React.createElement(Card, {
    className: "lg:col-span-8 p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, t.prod.nesting), /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 mt-0.5"
  }, plan.id, " \xB7 ", plan.material), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-0.5 font-mono"
  }, plan.order, " \xB7 ", plan.machine, " \xB7 ", plan.operator)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "settings"
  }, "Be\xE1ll\xEDt\xE1sok"), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "external"
  }, "Megnyit CNC-n"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4"
  }, [{
    label: t.prod.utilization,
    value: `${curSheet.util}%`,
    tone: "text-teal-700"
  }, {
    label: t.prod.waste,
    value: `${(100 - curSheet.util).toFixed(0)}%`,
    tone: "text-amber-700"
  }, {
    label: t.prod.parts,
    value: curSheet.parts.length,
    tone: "text-stone-900"
  }, {
    label: t.prod.sheet,
    value: `${sheetIdx + 1} / ${sheetCount}`,
    tone: "text-stone-900"
  }].map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-stone-50 border border-stone-200/70 rounded-lg p-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500"
  }, x.label), /*#__PURE__*/React.createElement("div", {
    className: `text-[16px] font-semibold tabular-nums ${x.tone}`
  }, x.value)))), /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-50/40 rounded-lg border border-stone-200/70 p-3"
  }, /*#__PURE__*/React.createElement(NestingSVG, {
    plan: plan,
    onPart: setHoverPart,
    hover: hoverPart,
    parts: curSheet.parts
  })), sheetCount > 1 && /*#__PURE__*/React.createElement("div", {
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
  }, Array.from({
    length: sheetCount
  }, (_, i) => i).map(i => {
    const active = i === sheetIdx;
    const s = getSheet(i);
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => setSheetIdx(i),
      title: `Tábla ${i + 1} · ${s.util}% kihasználás`,
      className: `relative w-12 h-9 rounded-md border-2 transition overflow-hidden bg-stone-50 ${active ? "border-teal-600" : "border-stone-200 hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "absolute inset-0 grid place-items-center text-[10px] font-mono text-stone-600"
    }, i + 1), /*#__PURE__*/React.createElement("span", {
      className: `absolute bottom-0 left-0 h-0.5 ${active ? "bg-teal-600" : "bg-stone-300"}`,
      style: {
        width: `${s.util}%`
      }
    }));
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSheetIdx(Math.min(sheetCount - 1, sheetIdx + 1)),
    disabled: sheetIdx >= sheetCount - 1,
    className: "w-7 h-7 grid place-items-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-30"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 font-mono ml-2"
  }, "T\xE1bla ", sheetIdx + 1, " / ", sheetCount, " \xB7 ", curSheet.util, "% kihaszn\xE1l\xE1s")), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-center gap-3 text-[10.5px] text-stone-500 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded-sm bg-teal-300"
  }), t.prod.parts), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 rounded-sm",
    style: {
      background: "url(#grain)",
      border: "1px solid #a8a29e"
    }
  }), "T\xE1bla"), /*#__PURE__*/React.createElement("span", {
    className: "ml-auto font-mono"
  }, "V\xE1g\xE1si r\xE9s: 4 mm \xB7 Forg\xE1s: 90\xB0")))), tab === "machining" && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-3"
  }, [{
    title: t.prod.edgebanding,
    count: 14,
    items: [{
      name: "CP-184-A · Bükk",
      op: "Nagy J.",
      state: "running"
    }, {
      name: "CP-183-A · MDF",
      op: "Tóth K.",
      state: "done"
    }, {
      name: "CP-182-A · Tölgy",
      op: "Kiss A.",
      state: "planned"
    }]
  }, {
    title: t.prod.cnc,
    count: 8,
    items: [{
      name: "CP-184-A · furatok",
      op: "Holzma CNC",
      state: "running"
    }, {
      name: "CP-180-A · marás",
      op: "Biesse Rover",
      state: "done"
    }, {
      name: "CP-182-B · csaplyuk",
      op: "Holzma CNC",
      state: "planned"
    }]
  }, {
    title: t.prod.qc,
    count: 5,
    items: [{
      name: "JT-2426-0180",
      op: "Szabó A.",
      state: "running"
    }, {
      name: "JT-2426-0179",
      op: "Szabó A.",
      state: "planned"
    }, {
      name: "JT-2426-0177",
      op: "Horváth É.",
      state: "done"
    }]
  }].map((col, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    className: "p-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-200/80 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, col.title), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-500 tabular-nums"
  }, col.count)), /*#__PURE__*/React.createElement("div", {
    className: "p-2 space-y-1.5"
  }, col.items.map((it, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    className: "bg-stone-50/60 border border-stone-200/70 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2 mb-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-mono text-stone-700"
  }, it.name), /*#__PURE__*/React.createElement(StatusPill, {
    status: it.state,
    label: t.status[it.state]
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[10.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 11
  }), /*#__PURE__*/React.createElement("span", null, it.op)))))))));
}
window.ProductionPage = ProductionPage;
})();
