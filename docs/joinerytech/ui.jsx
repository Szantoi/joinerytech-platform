// Shared UI primitives for JoineryTech portal.
// React + Tailwind classes. Components are exported to window at the bottom.

const { useState, useEffect, useMemo, useRef } = React;

// ──────────────────────────────────────────────────────────────────────────
// Wordmark — original "joinery/tech" with a tiny grain glyph
// ──────────────────────────────────────────────────────────────────────────
function Wordmark({ tone = "dark", size = 14 }) {
  const fg = tone === "dark" ? "text-white" : "text-stone-900";
  const dim = tone === "dark" ? "text-white/55" : "text-stone-500";
  const accent = "text-teal-300";
  return (
    <div className="flex items-center gap-2 select-none" style={{ fontSize: size }}>
      <GrainMark tone={tone} />
      <span className={`font-semibold tracking-tight ${fg}`}>joinery</span>
      <span className={`${accent} font-light`} style={{ marginLeft: -4, marginRight: -4 }}>/</span>
      <span className={`${dim} font-medium tracking-tight`}>tech</span>
    </div>
  );
}

function GrainMark({ tone = "dark" }) {
  // small concentric arc mark suggesting wood grain — original
  const stroke = tone === "dark" ? "#fff" : "#0c1322";
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <rect x="1" y="1" width="20" height="20" rx="5" fill="none" stroke={stroke} strokeOpacity=".22" />
      <path d="M5 16 Q 11 6, 17 16" fill="none" stroke={stroke} strokeOpacity=".95" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M5 13 Q 11 5, 17 13" fill="none" stroke="#5eead4" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M5 19 Q 11 9, 17 19" fill="none" stroke={stroke} strokeOpacity=".4" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Status pills
// ──────────────────────────────────────────────────────────────────────────
const STATUS_TONES = {
  draft:    { bg: "bg-stone-100",    fg: "text-stone-600",   dot: "bg-stone-400" },
  calc:     { bg: "bg-amber-50",     fg: "text-amber-700",   dot: "bg-amber-500" },
  ready:    { bg: "bg-sky-50",       fg: "text-sky-700",     dot: "bg-sky-500" },
  released: { bg: "bg-emerald-50",   fg: "text-emerald-700", dot: "bg-emerald-500" },
  planned:  { bg: "bg-stone-100",    fg: "text-stone-600",   dot: "bg-stone-400" },
  running:  { bg: "bg-teal-50",      fg: "text-teal-700",    dot: "bg-teal-500" },
  done:     { bg: "bg-emerald-50",   fg: "text-emerald-700", dot: "bg-emerald-500" },
  low:      { bg: "bg-amber-50",     fg: "text-amber-700",   dot: "bg-amber-500" },
  ok:       { bg: "bg-emerald-50",   fg: "text-emerald-700", dot: "bg-emerald-500" },
  critical: { bg: "bg-rose-50",      fg: "text-rose-700",    dot: "bg-rose-500" },
};

function StatusPill({ status, label }) {
  const t = STATUS_TONES[status] || STATUS_TONES.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${t.bg} ${t.fg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sparkline
// ──────────────────────────────────────────────────────────────────────────
function Sparkline({ data, width = 120, height = 32, stroke = "currentColor", fill = "none", strokeWidth = 1.5, responsive = false }) {
  if (!data || !data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const d = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = fill !== "none" ? `${d} L${width},${height} L0,${height} Z` : null;
  const sizeProps = responsive
    ? { width: "100%", height, preserveAspectRatio: "none" }
    : { width, height };
  return (
    <svg {...sizeProps} viewBox={`0 0 ${width} ${height}`} className="block">
      {area && <path d={area} fill={fill} opacity="0.18" />}
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.2" fill={stroke} />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Icons (small, original line set — 18px)
// ──────────────────────────────────────────────────────────────────────────
function Icon({ name, size = 18, className = "" }) {
  const s = size;
  const common = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", className };
  switch (name) {
    case "dashboard": return (<svg {...common}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>);
    case "orders": return (<svg {...common}><path d="M4 7h16M4 12h16M4 17h10"/></svg>);
    case "production": return (<svg {...common}><path d="M3 20V9l5 3V9l5 3V9l5 3v8H3z"/><path d="M3 20h18"/></svg>);
    case "inventory": return (<svg {...common}><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>);
    case "procurement": return (<svg {...common}><path d="M3 6h2l2 11h11l2-8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>);
    case "analytics": return (<svg {...common}><path d="M4 19h16"/><path d="M6 16V9M11 16V5M16 16v-7M21 16v-4"/></svg>);
    case "settings": return (<svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>);
    case "search": return (<svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>);
    case "bell": return (<svg {...common}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>);
    case "plus": return (<svg {...common}><path d="M12 5v14M5 12h14"/></svg>);
    case "minus": return (<svg {...common}><path d="M5 12h14"/></svg>);
    case "filter": return (<svg {...common}><path d="M4 5h16l-6 8v6l-4-2v-4z"/></svg>);
    case "chevron": return (<svg {...common}><path d="m9 6 6 6-6 6"/></svg>);
    case "down": return (<svg {...common}><path d="m6 9 6 6 6-6"/></svg>);
    case "up": return (<svg {...common}><path d="m6 15 6-6 6 6"/></svg>);
    case "external": return (<svg {...common}><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M20 14v6H4V4h6"/></svg>);
    case "download": return (<svg {...common}><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg>);
    case "check": return (<svg {...common}><path d="m5 12 5 5 9-11"/></svg>);
    case "x": return (<svg {...common}><path d="M6 6l12 12M18 6 6 18"/></svg>);
    case "alert": return (<svg {...common}><path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5"/><circle cx="12" cy="18" r=".8" fill="currentColor"/></svg>);
    case "user": return (<svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 5-6 8-6s7 2 8 6"/></svg>);
    case "logout": return (<svg {...common}><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>);
    case "factory": return (<svg {...common}><path d="M2 21V10l5 3V8l5 3V8l5 3v10z"/><circle cx="6" cy="17" r=".8" fill="currentColor"/><circle cx="11" cy="17" r=".8" fill="currentColor"/><circle cx="16" cy="17" r=".8" fill="currentColor"/></svg>);
    case "workflow": return (<svg {...common}><rect x="3" y="4" width="5" height="7" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="5" rx="1"/><path d="M3 18h18"/></svg>);
    case "chat": return (<svg {...common}><path d="M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z"/></svg>);
    case "send": return (<svg {...common}><path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>);
    case "sparkle": return (<svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>);
    case "qr": return (<svg {...common}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/></svg>);
    case "cut": return (<svg {...common}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M9 8l12 12M9 16 21 4"/></svg>);
    case "layers": return (<svg {...common}><path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M2 14l10 5 10-5"/><path d="M2 11l10 5 10-5"/></svg>);
    case "folder": return (<svg {...common}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>);
    case "cpu": return (<svg {...common}><rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 9h6v6H9z"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>);
    case "camera": return (<svg {...common}><path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/></svg>);
    case "more": return (<svg {...common}><circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/></svg>);
    case "menu": return (<svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>);
    case "box": return (<svg {...common}><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>);
    case "cube": return (<svg {...common}><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>);
    case "ruler": return (<svg {...common}><path d="M3 3h18v6H15v6H9v6H3z" /><path d="M7 3v3M11 3v3M15 3v3M3 11h3M3 15h3M3 19h3"/></svg>);
    case "wrench": return (<svg {...common}><path d="M14 4a5 5 0 0 1 5 7l-2 2 3 3-4 4-3-3-2 2a5 5 0 0 1-7-7l3 3 3-3-3-3 4-4z"/></svg>);
    case "briefcase": return (<svg {...common}><rect x="3" y="7" width="18" height="13" rx="1.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>);
    case "bolt": return (<svg {...common}><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>);
    case "phone": return (<svg {...common}><path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>);
    case "inbox": return (<svg {...common}><path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/></svg>);
    case "lock": return (<svg {...common}><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>);
    case "drop": return (<svg {...common}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>);
    case "storefront": return (<svg {...common}><path d="M4 11v9h16v-9"/><path d="M3 5h18l1 4a4 4 0 0 1-8 0 4 4 0 0 1-8 0z"/><path d="M10 20v-5h4v5"/></svg>);
    case "wind": return (<svg {...common}><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h9a3 3 0 1 1-3 3"/></svg>);
    case "archive": return (<svg {...common}><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></svg>);
    case "rotate": return (<svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/></svg>);
    case "file": return (<svg {...common}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>);
    case "receipt": return (<svg {...common}><path d="M5 3v18l2-1.3L9 21l2-1.3L13 21l2-1.3L17 21l2-1.3V3l-2 1.3L15 3l-2 1.3L11 3 9 4.3 7 3 5 4.3z"/><path d="M9 8h6M9 12h6"/></svg>);
    case "info": return (<svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor"/></svg>);
    case "arrow-right": return (<svg {...common}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>);
    case "truck": return (<svg {...common}><path d="M2 6h11v11H2z"/><path d="M13 9h4l3 3v5h-7z"/><circle cx="6" cy="18.5" r="1.6"/><circle cx="17" cy="18.5" r="1.6"/></svg>);
    case "pin": return (<svg {...common}><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>);
    case "calendar": return (<svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>);
    case "clock": return (<svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
    case "route": return (<svg {...common}><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5"/></svg>);
    case "link": return (<svg {...common}><path d="M9 15l6-6"/><path d="M11 7l1-1a3.5 3.5 0 0 1 5 5l-1 1"/><path d="M13 17l-1 1a3.5 3.5 0 0 1-5-5l1-1"/></svg>);
    case "signature": return (<svg {...common}><path d="M3 18c3 0 3-9 6-9s2 7 4 7 2-4 4-4 2 2 4 2"/><path d="M3 21h18"/></svg>);
    case "shield": return (<svg {...common}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>);
    default: return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Sidebar nav items config
// ──────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "dashboard", icon: "dashboard" },
  { key: "workflow", icon: "workflow", badge: "13" },
  { key: "orders", icon: "orders", badge: "12" },
  { key: "production", icon: "production", badge: "6" },
  { key: "inventory", icon: "inventory", badge: "3", badgeTone: "warn" },
  { key: "procurement", icon: "procurement" },
  { key: "analytics", icon: "analytics" },
  { key: "settings", icon: "settings" },
];

// ──────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────
// Mobile bottom nav (< 768px)
// ──────────────────────────────────────────────────────────────────────────
function MobileBottomNav({ current, onNav, t }) {
  const items = [
    { key: "dashboard", icon: "dashboard" },
    { key: "workflow", icon: "workflow" },
    { key: "production", icon: "production" },
    { key: "settings", icon: "settings" },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-30 grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
      {items.map(it => {
        const active = current === it.key;
        return (
          <button key={it.key} onClick={() => onNav(it.key)}
            className={`flex flex-col items-center gap-0.5 py-2 ${active ? "text-teal-700" : "text-stone-500"}`}>
            <Icon name={it.icon} size={18} />
            <span className="text-[9.5px] font-medium">{t.nav[it.key]}</span>
          </button>
        );
      })}
    </nav>
  );
}

window.MobileBottomNav = MobileBottomNav;

// Sidebar (dark)  — used by Layout A
// ──────────────────────────────────────────────────────────────────────────
function SidebarDark({ current, onNav, t }) {
  return (
    <aside className="hidden md:flex bg-[#0b1220] text-white/85 w-[64px] lg:w-[232px] shrink-0 flex-col h-screen sticky top-0 border-r border-white/5">
      <div className="px-4 pt-5 pb-4 hidden lg:block">
        <Wordmark tone="dark" size={15} />
      </div>
      <div className="lg:hidden pt-5 pb-3 grid place-items-center"><GrainMark tone="dark" /></div>
      <div className="px-3 pb-2 hidden lg:block">
        <div className="bg-white/5 hover:bg-white/8 transition rounded-md px-2.5 py-1.5 flex items-center gap-2 cursor-pointer">
          <div className="w-7 h-7 rounded bg-teal-500/15 text-teal-300 grid place-items-center text-[11px] font-semibold">DS</div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium truncate">Doorstar Hungary</div>
            <div className="text-[10.5px] text-white/45 truncate">Üzem · Vác</div>
          </div>
          <Icon name="down" size={14} className="text-white/40" />
        </div>
      </div>
      <nav className="px-2 mt-2 flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.map((it) => {
          const active = current === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onNav(it.key)}
              title={t.nav[it.key]}
              className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition relative ${
                active ? "bg-white/8 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r bg-teal-300" />}
              <Icon name={it.icon} size={17} className={active ? "text-teal-300" : "text-white/55 group-hover:text-white/80"} />
              <span className="hidden lg:inline flex-1 text-left">{t.nav[it.key]}</span>
              {it.badge && (
                <span className={`hidden lg:inline text-[10px] px-1.5 py-0.5 rounded ${it.badgeTone === "warn" ? "bg-amber-400/20 text-amber-200" : "bg-white/10 text-white/65"}`}>
                  {it.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-white/5 p-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 grid place-items-center text-[11px] font-semibold text-white">KP</div>
        <div className="hidden lg:block min-w-0 flex-1">
          <div className="text-[12.5px] font-medium truncate">Kovács Péter</div>
          <div className="text-[10.5px] text-white/45 truncate">Admin · Doorstar</div>
        </div>
        <button className="hidden lg:inline-flex text-white/45 hover:text-white/80"><Icon name="logout" size={15} /></button>
      </div>
    </aside>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sidebar (light rail)  — used by Layout B
// ──────────────────────────────────────────────────────────────────────────
function SidebarLight({ current, onNav, t }) {
  return (
    <aside className="hidden md:flex bg-white w-[64px] shrink-0 flex-col h-screen sticky top-0 border-r border-stone-200/80 items-center py-4 gap-1">
      <div className="mb-2">
        <GrainMark tone="light" />
      </div>
      <div className="w-8 h-px bg-stone-200 my-2" />
      {NAV_ITEMS.map((it) => {
        const active = current === it.key;
        return (
          <button
            key={it.key}
            onClick={() => onNav(it.key)}
            title={t.nav[it.key]}
            className={`relative w-10 h-10 rounded-lg grid place-items-center transition ${
              active ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <Icon name={it.icon} size={18} />
            {it.badge && !active && (
              <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${it.badgeTone === "warn" ? "bg-amber-500" : "bg-teal-500"}`} />
            )}
          </button>
        );
      })}
      <div className="flex-1" />
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 grid place-items-center text-[11px] font-semibold text-white">KP</div>
    </aside>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Top bar (flat)  — used by Layout A
// ──────────────────────────────────────────────────────────────────────────
function TopBarFlat({ title, subtitle, actions, t }) {
  return (
    <header className="bg-white/85 backdrop-blur sticky top-0 z-20 border-b border-stone-200/80">
      <div className="flex items-center gap-4 px-7 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-stone-900 leading-tight truncate">{title}</div>
          {subtitle && <div className="text-[12px] text-stone-500 leading-tight mt-0.5 truncate">{subtitle}</div>}
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 h-9 w-[280px] rounded-lg bg-stone-100/80 border border-stone-200/60 text-stone-500">
          <Icon name="search" size={15} />
          <input placeholder={t.common.search} className="bg-transparent outline-none text-[12.5px] flex-1 placeholder:text-stone-400" />
          <span className="text-[10px] text-stone-400 border border-stone-300 rounded px-1 py-px">⌘K</span>
        </div>
        <button className="w-9 h-9 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100 relative">
          <Icon name="bell" size={17} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-teal-500" />
        </button>
        {actions}
      </div>
    </header>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Top bar (bold + breadcrumb)  — used by Layout B
// ──────────────────────────────────────────────────────────────────────────
function TopBarBold({ title, subtitle, actions, t }) {
  return (
    <header className="bg-white sticky top-0 z-20 border-b border-stone-200/80">
      <div className="flex items-center gap-4 px-8 py-2.5 border-b border-stone-100">
        <Wordmark tone="light" size={13} />
        <div className="text-stone-300 text-xs">·</div>
        <div className="text-[12px] text-stone-500">Doorstar Hungary Zrt.</div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3 h-8 w-[260px] rounded-md bg-stone-100/80 text-stone-500">
          <Icon name="search" size={14} />
          <input placeholder={t.common.search} className="bg-transparent outline-none text-[12px] flex-1 placeholder:text-stone-400" />
        </div>
        <button className="w-8 h-8 grid place-items-center rounded-md text-stone-500 hover:bg-stone-100"><Icon name="bell" size={16} /></button>
      </div>
      <div className="flex items-end gap-4 px-8 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="text-[22px] font-semibold text-stone-900 leading-tight tracking-tight">{title}</div>
          {subtitle && <div className="text-[12.5px] text-stone-500 mt-1">{subtitle}</div>}
        </div>
        {actions}
      </div>
    </header>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Buttons
// ──────────────────────────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, icon }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-teal-700 text-white text-[12.5px] font-medium hover:bg-teal-800 active:scale-[.99] transition shadow-sm shadow-teal-900/10">
      {icon && <Icon name={icon} size={15} />}
      {children}
    </button>
  );
}
function GhostBtn({ children, onClick, icon }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white border border-stone-200 text-stone-700 text-[12.5px] font-medium hover:bg-stone-50">
      {icon && <Icon name={icon} size={15} />}
      {children}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Card
// ──────────────────────────────────────────────────────────────────────────
function Card({ children, className = "", interactive = false }) {
  return (
    <div className={`bg-white border border-stone-200/80 rounded-xl ${interactive ? "hover:border-stone-300 transition cursor-pointer" : ""} ${className}`}>
      {children}
    </div>
  );
}

Object.assign(window, {
  Wordmark, GrainMark, StatusPill, Sparkline, Icon, NAV_ITEMS,
  SidebarDark, SidebarLight, TopBarFlat, TopBarBold,
  PrimaryBtn, GhostBtn, Card,
});
