/* AUTO-GENERATED from ui.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Shared UI primitives for JoineryTech portal.
// React + Tailwind classes. Components are exported to window at the bottom.

const {
  useState,
  useEffect,
  useMemo,
  useRef
} = React;

// ──────────────────────────────────────────────────────────────────────────
// Wordmark — original "joinery/tech" with a tiny grain glyph
// ──────────────────────────────────────────────────────────────────────────
function Wordmark({
  tone = "dark",
  size = 14
}) {
  const fg = tone === "dark" ? "text-white" : "text-stone-900";
  const dim = tone === "dark" ? "text-white/55" : "text-stone-500";
  const accent = "text-teal-300";
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 select-none",
    style: {
      fontSize: size
    }
  }, /*#__PURE__*/React.createElement(GrainMark, {
    tone: tone
  }), /*#__PURE__*/React.createElement("span", {
    className: `font-semibold tracking-tight ${fg}`
  }, "joinery"), /*#__PURE__*/React.createElement("span", {
    className: `${accent} font-light`,
    style: {
      marginLeft: -4,
      marginRight: -4
    }
  }, "/"), /*#__PURE__*/React.createElement("span", {
    className: `${dim} font-medium tracking-tight`
  }, "tech"));
}
function GrainMark({
  tone = "dark"
}) {
  // small concentric arc mark suggesting wood grain — original
  const stroke = tone === "dark" ? "#fff" : "#0c1322";
  return /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 22 22",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "1",
    width: "20",
    height: "20",
    rx: "5",
    fill: "none",
    stroke: stroke,
    strokeOpacity: ".22"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 16 Q 11 6, 17 16",
    fill: "none",
    stroke: stroke,
    strokeOpacity: ".95",
    strokeWidth: "1.4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 13 Q 11 5, 17 13",
    fill: "none",
    stroke: "#5eead4",
    strokeWidth: "1.4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 19 Q 11 9, 17 19",
    fill: "none",
    stroke: stroke,
    strokeOpacity: ".4",
    strokeWidth: "1.4",
    strokeLinecap: "round"
  }));
}

// ──────────────────────────────────────────────────────────────────────────
// Status pills
// ──────────────────────────────────────────────────────────────────────────
const STATUS_TONES = {
  draft: {
    bg: "bg-stone-100",
    fg: "text-stone-600",
    dot: "bg-stone-400"
  },
  calc: {
    bg: "bg-amber-50",
    fg: "text-amber-700",
    dot: "bg-amber-500"
  },
  ready: {
    bg: "bg-sky-50",
    fg: "text-sky-700",
    dot: "bg-sky-500"
  },
  released: {
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    dot: "bg-emerald-500"
  },
  planned: {
    bg: "bg-stone-100",
    fg: "text-stone-600",
    dot: "bg-stone-400"
  },
  running: {
    bg: "bg-teal-50",
    fg: "text-teal-700",
    dot: "bg-teal-500"
  },
  done: {
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    dot: "bg-emerald-500"
  },
  low: {
    bg: "bg-amber-50",
    fg: "text-amber-700",
    dot: "bg-amber-500"
  },
  ok: {
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    dot: "bg-emerald-500"
  },
  critical: {
    bg: "bg-rose-50",
    fg: "text-rose-700",
    dot: "bg-rose-500"
  }
};
function StatusPill({
  status,
  label
}) {
  const t = STATUS_TONES[status] || STATUS_TONES.draft;
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${t.bg} ${t.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.dot}`
  }), label);
}

// ──────────────────────────────────────────────────────────────────────────
// Sparkline
// ──────────────────────────────────────────────────────────────────────────
function Sparkline({
  data,
  width = 120,
  height = 32,
  stroke = "currentColor",
  fill = "none",
  strokeWidth = 1.5,
  responsive = false
}) {
  if (!data || !data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - (v - min) / range * (height - 4) - 2;
    return [x, y];
  });
  const d = points.map((p, i) => i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`).join(" ");
  const area = fill !== "none" ? `${d} L${width},${height} L0,${height} Z` : null;
  const sizeProps = responsive ? {
    width: "100%",
    height,
    preserveAspectRatio: "none"
  } : {
    width,
    height
  };
  return /*#__PURE__*/React.createElement("svg", _extends({}, sizeProps, {
    viewBox: `0 0 ${width} ${height}`,
    className: "block"
  }), area && /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: fill,
    opacity: "0.18"
  }), /*#__PURE__*/React.createElement("path", {
    d: d,
    fill: "none",
    stroke: stroke,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    vectorEffect: "non-scaling-stroke"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: points[points.length - 1][0],
    cy: points[points.length - 1][1],
    r: "2.2",
    fill: stroke
  }));
}

// ──────────────────────────────────────────────────────────────────────────
// Icons (small, original line set — 18px)
// ──────────────────────────────────────────────────────────────────────────
function Icon({
  name,
  size = 18,
  className = ""
}) {
  const s = size;
  const common = {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className
  };
  switch (name) {
    case "dashboard":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "3",
        width: "7",
        height: "9",
        rx: "1.5"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "3",
        width: "7",
        height: "5",
        rx: "1.5"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "12",
        width: "7",
        height: "9",
        rx: "1.5"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "16",
        width: "7",
        height: "5",
        rx: "1.5"
      }));
    case "orders":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M4 7h16M4 12h16M4 17h10"
      }));
    case "production":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M3 20V9l5 3V9l5 3V9l5 3v8H3z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 20h18"
      }));
    case "inventory":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M3 7l9-4 9 4v10l-9 4-9-4V7z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 7l9 4 9-4M12 11v10"
      }));
    case "procurement":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M3 6h2l2 11h11l2-8H6"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "9",
        cy: "20",
        r: "1.4"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "17",
        cy: "20",
        r: "1.4"
      }));
    case "analytics":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M4 19h16"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M6 16V9M11 16V5M16 16v-7M21 16v-4"
      }));
    case "settings":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "3"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
      }));
    case "search":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("circle", {
        cx: "11",
        cy: "11",
        r: "7"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m20 20-3.5-3.5"
      }));
    case "bell":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M10 21a2 2 0 0 0 4 0"
      }));
    case "plus":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M12 5v14M5 12h14"
      }));
    case "minus":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M5 12h14"
      }));
    case "filter":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M4 5h16l-6 8v6l-4-2v-4z"
      }));
    case "chevron":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "m9 6 6 6-6 6"
      }));
    case "down":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "m6 9 6 6 6-6"
      }));
    case "up":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "m6 15 6-6 6 6"
      }));
    case "external":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M14 4h6v6"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M20 4 10 14"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M20 14v6H4V4h6"
      }));
    case "download":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M12 4v12"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m7 11 5 5 5-5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M4 20h16"
      }));
    case "check":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "m5 12 5 5 9-11"
      }));
    case "x":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M6 6l12 12M18 6 6 18"
      }));
    case "alert":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M12 3 2 21h20L12 3z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M12 10v5"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "18",
        r: ".8",
        fill: "currentColor"
      }));
    case "user":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "8",
        r: "4"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M4 21c1-4 5-6 8-6s7 2 8 6"
      }));
    case "logout":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m16 17 5-5-5-5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M21 12H9"
      }));
    case "factory":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M2 21V10l5 3V8l5 3V8l5 3v10z"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "6",
        cy: "17",
        r: ".8",
        fill: "currentColor"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "11",
        cy: "17",
        r: ".8",
        fill: "currentColor"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "16",
        cy: "17",
        r: ".8",
        fill: "currentColor"
      }));
    case "workflow":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "4",
        width: "5",
        height: "7",
        rx: "1"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "10",
        y: "4",
        width: "5",
        height: "10",
        rx: "1"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "17",
        y: "4",
        width: "4",
        height: "5",
        rx: "1"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 18h18"
      }));
    case "chat":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z"
      }));
    case "send":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M22 2 11 13"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M22 2l-7 20-4-9-9-4 20-7z"
      }));
    case "sparkle":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"
      }));
    case "qr":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "3",
        width: "7",
        height: "7"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "3",
        width: "7",
        height: "7"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "14",
        width: "7",
        height: "7"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "14",
        width: "3",
        height: "3"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "18",
        y: "14",
        width: "3",
        height: "3"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "18",
        width: "3",
        height: "3"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "18",
        y: "18",
        width: "3",
        height: "3"
      }));
    case "cut":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("circle", {
        cx: "6",
        cy: "6",
        r: "3"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "6",
        cy: "18",
        r: "3"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M9 8l12 12M9 16 21 4"
      }));
    case "layers":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M12 3 2 8l10 5 10-5-10-5z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M2 14l10 5 10-5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M2 11l10 5 10-5"
      }));
    case "folder":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
      }));
    case "cpu":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
        x: "6",
        y: "6",
        width: "12",
        height: "12",
        rx: "1.5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M9 9h6v6H9z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"
      }));
    case "camera":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M3 8h4l2-3h6l2 3h4v12H3z"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "13",
        r: "4"
      }));
    case "more":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("circle", {
        cx: "5",
        cy: "12",
        r: "1.4",
        fill: "currentColor"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "1.4",
        fill: "currentColor"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "19",
        cy: "12",
        r: "1.4",
        fill: "currentColor"
      }));
    case "menu":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M4 7h16M4 12h16M4 17h16"
      }));
    case "box":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M3 7l9-4 9 4v10l-9 4-9-4V7z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 7l9 4 9-4M12 11v10"
      }));
    case "cube":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M3 7l9-4 9 4v10l-9 4-9-4V7z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 7l9 4 9-4M12 11v10"
      }));
    case "ruler":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M3 3h18v6H15v6H9v6H3z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M7 3v3M11 3v3M15 3v3M3 11h3M3 15h3M3 19h3"
      }));
    case "wrench":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M14 4a5 5 0 0 1 5 7l-2 2 3 3-4 4-3-3-2 2a5 5 0 0 1-7-7l3 3 3-3-3-3 4-4z"
      }));
    case "briefcase":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "7",
        width: "18",
        height: "13",
        rx: "1.5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 13h18"
      }));
    case "bolt":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M13 2 4 14h7l-1 8 9-12h-7z"
      }));
    case "phone":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"
      }));
    case "inbox":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M3 13h5l1.5 3h5L16 13h5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M5 5h14l2 8v6H3v-6z"
      }));
    case "lock":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
        x: "4",
        y: "10",
        width: "16",
        height: "10",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M8 10V7a4 4 0 0 1 8 0v3"
      }));
    case "drop":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"
      }));
    case "storefront":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M4 11v9h16v-9"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 5h18l1 4a4 4 0 0 1-8 0 4 4 0 0 1-8 0z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M10 20v-5h4v5"
      }));
    case "wind":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h9a3 3 0 1 1-3 3"
      }));
    case "archive":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "4",
        width: "18",
        height: "4",
        rx: "1"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M10 12h4"
      }));
    case "rotate":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M3 12a9 9 0 1 0 3-6.7L3 8"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 4v4h4"
      }));
    case "file":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M14 3v5h5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M9 13h6M9 17h6"
      }));
    case "receipt":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M5 3v18l2-1.3L9 21l2-1.3L13 21l2-1.3L17 21l2-1.3V3l-2 1.3L15 3l-2 1.3L11 3 9 4.3 7 3 5 4.3z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M9 8h6M9 12h6"
      }));
    case "info":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "9"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M12 11v5"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "7.8",
        r: ".9",
        fill: "currentColor"
      }));
    case "arrow-right":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M5 12h14"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m13 6 6 6-6 6"
      }));
    case "truck":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M2 6h11v11H2z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M13 9h4l3 3v5h-7z"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "6",
        cy: "18.5",
        r: "1.6"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "17",
        cy: "18.5",
        r: "1.6"
      }));
    case "pin":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "10",
        r: "2.5"
      }));
    case "calendar":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "5",
        width: "18",
        height: "16",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 9h18M8 3v4M16 3v4"
      }));
    case "clock":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "9"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M12 7v5l3 2"
      }));
    case "route":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("circle", {
        cx: "6",
        cy: "6",
        r: "2.5"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "18",
        cy: "18",
        r: "2.5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5"
      }));
    case "link":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M9 15l6-6"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M11 7l1-1a3.5 3.5 0 0 1 5 5l-1 1"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M13 17l-1 1a3.5 3.5 0 0 1-5-5l1-1"
      }));
    case "signature":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M3 18c3 0 3-9 6-9s2 7 4 7 2-4 4-4 2 2 4 2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 21h18"
      }));
    case "shield":
      return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
        d: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m9 12 2 2 4-4"
      }));
    default:
      return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Sidebar nav items config
// ──────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [{
  key: "dashboard",
  icon: "dashboard"
}, {
  key: "workflow",
  icon: "workflow",
  badge: "13"
}, {
  key: "orders",
  icon: "orders",
  badge: "12"
}, {
  key: "production",
  icon: "production",
  badge: "6"
}, {
  key: "inventory",
  icon: "inventory",
  badge: "3",
  badgeTone: "warn"
}, {
  key: "procurement",
  icon: "procurement"
}, {
  key: "analytics",
  icon: "analytics"
}, {
  key: "settings",
  icon: "settings"
}];

// ──────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────
// Mobile bottom nav (< 768px)
// ──────────────────────────────────────────────────────────────────────────
function MobileBottomNav({
  current,
  onNav,
  t
}) {
  const items = [{
    key: "dashboard",
    icon: "dashboard"
  }, {
    key: "workflow",
    icon: "workflow"
  }, {
    key: "production",
    icon: "production"
  }, {
    key: "settings",
    icon: "settings"
  }];
  return /*#__PURE__*/React.createElement("nav", {
    className: "md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-30 grid grid-cols-4 pb-[env(safe-area-inset-bottom)]"
  }, items.map(it => {
    const active = current === it.key;
    return /*#__PURE__*/React.createElement("button", {
      key: it.key,
      onClick: () => onNav(it.key),
      className: `flex flex-col items-center gap-0.5 py-2 ${active ? "text-teal-700" : "text-stone-500"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: it.icon,
      size: 18
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[9.5px] font-medium"
    }, t.nav[it.key]));
  }));
}
window.MobileBottomNav = MobileBottomNav;

// Sidebar (dark)  — used by Layout A
// ──────────────────────────────────────────────────────────────────────────
function SidebarDark({
  current,
  onNav,
  t
}) {
  return /*#__PURE__*/React.createElement("aside", {
    className: "hidden md:flex bg-[#0b1220] text-white/85 w-[64px] lg:w-[232px] shrink-0 flex-col h-screen sticky top-0 border-r border-white/5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 pt-5 pb-4 hidden lg:block"
  }, /*#__PURE__*/React.createElement(Wordmark, {
    tone: "dark",
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    className: "lg:hidden pt-5 pb-3 grid place-items-center"
  }, /*#__PURE__*/React.createElement(GrainMark, {
    tone: "dark"
  })), /*#__PURE__*/React.createElement("div", {
    className: "px-3 pb-2 hidden lg:block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white/5 hover:bg-white/8 transition rounded-md px-2.5 py-1.5 flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-7 h-7 rounded bg-teal-500/15 text-teal-300 grid place-items-center text-[11px] font-semibold"
  }, "DS"), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium truncate"
  }, "Doorstar Hungary"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-white/45 truncate"
  }, "\xDCzem \xB7 V\xE1c")), /*#__PURE__*/React.createElement(Icon, {
    name: "down",
    size: 14,
    className: "text-white/40"
  }))), /*#__PURE__*/React.createElement("nav", {
    className: "px-2 mt-2 flex flex-col gap-0.5 flex-1"
  }, NAV_ITEMS.map(it => {
    const active = current === it.key;
    return /*#__PURE__*/React.createElement("button", {
      key: it.key,
      onClick: () => onNav(it.key),
      title: t.nav[it.key],
      className: `group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition relative ${active ? "bg-white/8 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`
    }, active && /*#__PURE__*/React.createElement("span", {
      className: "absolute left-0 top-2 bottom-2 w-[2px] rounded-r bg-teal-300"
    }), /*#__PURE__*/React.createElement(Icon, {
      name: it.icon,
      size: 17,
      className: active ? "text-teal-300" : "text-white/55 group-hover:text-white/80"
    }), /*#__PURE__*/React.createElement("span", {
      className: "hidden lg:inline flex-1 text-left"
    }, t.nav[it.key]), it.badge && /*#__PURE__*/React.createElement("span", {
      className: `hidden lg:inline text-[10px] px-1.5 py-0.5 rounded ${it.badgeTone === "warn" ? "bg-amber-400/20 text-amber-200" : "bg-white/10 text-white/65"}`
    }, it.badge));
  })), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-white/5 p-3 flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 grid place-items-center text-[11px] font-semibold text-white"
  }, "KP"), /*#__PURE__*/React.createElement("div", {
    className: "hidden lg:block min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium truncate"
  }, "Kov\xE1cs P\xE9ter"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-white/45 truncate"
  }, "Admin \xB7 Doorstar")), /*#__PURE__*/React.createElement("button", {
    className: "hidden lg:inline-flex text-white/45 hover:text-white/80"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "logout",
    size: 15
  }))));
}

// ──────────────────────────────────────────────────────────────────────────
// Sidebar (light rail)  — used by Layout B
// ──────────────────────────────────────────────────────────────────────────
function SidebarLight({
  current,
  onNav,
  t
}) {
  return /*#__PURE__*/React.createElement("aside", {
    className: "hidden md:flex bg-white w-[64px] shrink-0 flex-col h-screen sticky top-0 border-r border-stone-200/80 items-center py-4 gap-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-2"
  }, /*#__PURE__*/React.createElement(GrainMark, {
    tone: "light"
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-px bg-stone-200 my-2"
  }), NAV_ITEMS.map(it => {
    const active = current === it.key;
    return /*#__PURE__*/React.createElement("button", {
      key: it.key,
      onClick: () => onNav(it.key),
      title: t.nav[it.key],
      className: `relative w-10 h-10 rounded-lg grid place-items-center transition ${active ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: it.icon,
      size: 18
    }), it.badge && !active && /*#__PURE__*/React.createElement("span", {
      className: `absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${it.badgeTone === "warn" ? "bg-amber-500" : "bg-teal-500"}`
    }));
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 grid place-items-center text-[11px] font-semibold text-white"
  }, "KP"));
}

// ──────────────────────────────────────────────────────────────────────────
// Top bar (flat)  — used by Layout A
// ──────────────────────────────────────────────────────────────────────────
function TopBarFlat({
  title,
  subtitle,
  actions,
  t
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "bg-white/85 backdrop-blur sticky top-0 z-20 border-b border-stone-200/80"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4 px-7 py-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 leading-tight truncate"
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500 leading-tight mt-0.5 truncate"
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:flex items-center gap-2 px-3 h-9 w-[280px] rounded-lg bg-stone-100/80 border border-stone-200/60 text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 15
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: t.common.search,
    className: "bg-transparent outline-none text-[12.5px] flex-1 placeholder:text-stone-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 border border-stone-300 rounded px-1 py-px"
  }, "\u2318K")), /*#__PURE__*/React.createElement("button", {
    className: "w-9 h-9 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100 relative"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 17
  }), /*#__PURE__*/React.createElement("span", {
    className: "absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-teal-500"
  })), actions));
}

// ──────────────────────────────────────────────────────────────────────────
// Top bar (bold + breadcrumb)  — used by Layout B
// ──────────────────────────────────────────────────────────────────────────
function TopBarBold({
  title,
  subtitle,
  actions,
  t
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "bg-white sticky top-0 z-20 border-b border-stone-200/80"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4 px-8 py-2.5 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement(Wordmark, {
    tone: "light",
    size: 13
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-300 text-xs"
  }, "\xB7"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500"
  }, "Doorstar Hungary Zrt."), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-3 h-8 w-[260px] rounded-md bg-stone-100/80 text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: t.common.search,
    className: "bg-transparent outline-none text-[12px] flex-1 placeholder:text-stone-400"
  })), /*#__PURE__*/React.createElement("button", {
    className: "w-8 h-8 grid place-items-center rounded-md text-stone-500 hover:bg-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end gap-4 px-8 pt-4 pb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[22px] font-semibold text-stone-900 leading-tight tracking-tight"
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-500 mt-1"
  }, subtitle)), actions));
}

// ──────────────────────────────────────────────────────────────────────────
// Buttons
// ──────────────────────────────────────────────────────────────────────────
function PrimaryBtn({
  children,
  onClick,
  icon
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: "inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-teal-700 text-white text-[12.5px] font-medium hover:bg-teal-800 active:scale-[.99] transition shadow-sm shadow-teal-900/10"
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 15
  }), children);
}
function GhostBtn({
  children,
  onClick,
  icon
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: "inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white border border-stone-200 text-stone-700 text-[12.5px] font-medium hover:bg-stone-50"
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 15
  }), children);
}

// ──────────────────────────────────────────────────────────────────────────
// Card
// ──────────────────────────────────────────────────────────────────────────
function Card({
  children,
  className = "",
  interactive = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `bg-white border border-stone-200/80 rounded-xl ${interactive ? "hover:border-stone-300 transition cursor-pointer" : ""} ${className}`
  }, children);
}
Object.assign(window, {
  Wordmark,
  GrainMark,
  StatusPill,
  Sparkline,
  Icon,
  NAV_ITEMS,
  SidebarDark,
  SidebarLight,
  TopBarFlat,
  TopBarBold,
  PrimaryBtn,
  GhostBtn,
  Card
});
})();
