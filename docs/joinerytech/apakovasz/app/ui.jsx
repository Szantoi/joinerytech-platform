// ──────────────────────────────────────────────────────────────────────────
// ui.jsx — közös UI-primitívek (Icon, pill, kártya, fejléc, logó)
//   Apakovász arculat. A Tailwind a struktúra; a brand-színek CSS-változókból
//   (bg-[var(--...)]).  Minden komponens a window-ra exportálva (cross-file).
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateUI } = React;

// ── Ikon-készlet (egyszerű vonalas glyph-ek) ──────────────────────────────
const ICON_PATHS = {
  bread:    'M4 12a4 4 0 0 1 4-4h8a4 4 0 0 1 0 8H8a4 4 0 0 1-4-4Z M9 8v8 M14 8v8',
  oven:     'M4 4h16v16H4Z M4 9h16 M7 6.5h.01 M10 6.5h.01 M7 13h10v4H7Z',
  flame:    'M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 .5 2 2 1 2-4Z',
  clock:    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2',
  truck:    'M3 6h11v9H3Z M14 9h4l3 3v3h-7 M6.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  box:      'M3 7l9-4 9 4-9 4-9-4Z M3 7v10l9 4 9-4V7 M12 11v10',
  store:    'M4 9l1-5h14l1 5 M5 9v11h14V9 M4 9h16 M9 20v-6h6v6',
  receipt:  'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3Z M8 8h8 M8 12h8 M8 16h5',
  wheat:    'M12 3v18 M12 7c-1.5-1-3-1-3-3 1.5 0 3 1 3 3Zm0 0c1.5-1 3-1 3-3-1.5 0-3 1-3 3Z M12 12c-1.5-1-3-1-3-3 1.5 0 3 1 3 3Zm0 0c1.5-1 3-1 3-3-1.5 0-3 1-3 3Z',
  check:    'M5 12l5 5 9-11',
  chevron:  'M9 6l6 6-6 6',
  plus:     'M12 5v14 M5 12h14',
  minus:    'M5 12h14',
  alert:    'M12 3l9 16H3L12 3Z M12 9v5 M12 17h.01',
  coffee:   'M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z M17 9h2a2 2 0 0 1 0 4h-2 M7 3v2 M11 3v2',
  list:     'M8 6h13 M8 12h13 M8 18h13 M3.5 6h.01 M3.5 12h.01 M3.5 18h.01',
  calendar: 'M4 5h16v15H4Z M4 9h16 M8 3v4 M16 3v4',
  chart:    'M4 20V4 M4 20h16 M8 16v-4 M12 16V9 M16 16v-7',
  x:        'M6 6l12 12 M18 6L6 18',
  hand:     'M7 11V6a1.5 1.5 0 0 1 3 0v4 M10 10V5a1.5 1.5 0 0 1 3 0v5 M13 10V6a1.5 1.5 0 0 1 3 0v6c0 4-2 7-6 7s-6-3-6-6l1-2',
  mixer:    'M6 4h12l-1 7H7L6 4Z M12 11v6 M9 20h6 M9 4l1.5 7 M15 4l-1.5 7',
  sparkle:  'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
  user:     'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M5 20a7 7 0 0 1 14 0',
  pin:      'M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  refresh:  'M20 11a8 8 0 1 0-2 5 M20 5v6h-6',
  scale:    'M12 4v16 M7 20h10 M5 8h14 M5 8l-2 5a3 3 0 0 0 6 0L5 8Z M19 8l-2 5a3 3 0 0 0 6 0l-2-5Z M9 5h6',
  package:  'M3 7l9-4 9 4-9 4-9-4Z M3 7v10l9 4 9-4V7 M7.5 5.2l9 4',
  snow:     'M12 3v18 M5 7l14 10 M19 7L5 17 M9 4l3 2 3-2 M9 20l3-2 3 2',
  download: 'M12 4v11 M8 11l4 4 4-4 M5 20h14',
  send:     'M4 12l16-8-6 16-3-6-7-2Z',
  chat:     'M5 5h14v10H9l-4 4V5Z',
  spark2:   'M12 2v4 M12 18v4 M2 12h4 M18 12h4',
  home:     'M4 11l8-7 8 7 M6 10v10h12V10',
  leaf:     'M5 19c0-8 6-13 14-13 0 8-6 13-14 13Z M9 15c2-2 4-3 6-4',
};
function Icon({ name, size = 18, className = "", strokeWidth = 1.7, style }) {
  const d = ICON_PATHS[name] || ICON_PATHS.box;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      {d.split(' M').map((seg, i) => <path key={i} d={(i === 0 ? seg : 'M' + seg)} />)}
    </svg>
  );
}

// ── Apakovász logó (wordmark) ─────────────────────────────────────────────
function Logo({ size = "md", onDark = true }) {
  const big = size === "lg";
  return (
    <div className="flex items-center gap-2.5">
      <div className={`grid place-items-center rounded-full border ${big ? "w-10 h-10" : "w-8 h-8"} ${onDark ? "border-[var(--cream)]/40 text-[var(--cream)]" : "border-[var(--crust-deep)]/40 text-[var(--crust-deep)]"}`}>
        <Icon name="wheat" size={big ? 20 : 16} strokeWidth={1.5} />
      </div>
      <div className="leading-none">
        <div className={`wordmark font-display ${big ? "text-[17px]" : "text-[14px]"} ${onDark ? "text-[var(--cream)]" : "text-[var(--ink)]"}`}>APAKOVÁSZ</div>
        <div className={`tracking-brand uppercase ${big ? "text-[8.5px] mt-1" : "text-[7px] mt-0.5"} ${onDark ? "text-[var(--cream-dim)]" : "text-[var(--ink-dim)]"}`}>Kézműves Pékműhely</div>
      </div>
    </div>
  );
}

// ── kis primitívek ─────────────────────────────────────────────────────────
function Pill({ children, className = "" }) {
  return <span className={`inline-flex items-center gap-1 px-2 h-6 rounded-full border text-[11px] font-semibold ${className}`}>{children}</span>;
}
function StatusPill({ meta }) {
  if (!meta) return null;
  return <Pill className={meta.pill}>{meta.dot && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />}{meta.label}</Pill>;
}
function Card({ children, className = "", onClick }) {
  return <div onClick={onClick} className={`rounded-2xl border border-[var(--line)] bg-[var(--flour-50)] ${onClick ? "cursor-pointer active:scale-[.995] transition" : ""} ${className}`}>{children}</div>;
}
function Section({ title, sub, right, children, className = "" }) {
  return (
    <section className={`space-y-2.5 ${className}`}>
      {(title || right) && (
        <div className="flex items-end justify-between gap-3 px-0.5">
          <div>
            {title && <h2 className="font-display text-[16px] text-[var(--ink)]">{title}</h2>}
            {sub && <p className="text-[11.5px] text-[var(--ink-dim)] mt-0.5">{sub}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
// KPI csempe (faszén panel)
function Stat({ label, value, unit, icon, tone = "panel" }) {
  const bg = tone === "panel" ? "bg-[var(--panel)] text-[var(--cream)]" : "bg-[var(--flour-50)] text-[var(--ink)] border border-[var(--line)]";
  return (
    <div className={`rounded-2xl p-3.5 ${bg}`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-medium mb-1.5 ${tone === "panel" ? "text-[var(--cream-dim)]" : "text-[var(--ink-dim)]"}`}>
        {icon && <Icon name={icon} size={13} />}{label}
      </div>
      <div className="text-[22px] font-semibold tnum leading-none">{value}{unit && <span className="text-[12px] font-normal opacity-60 ml-1">{unit}</span>}</div>
    </div>
  );
}
// progress sáv
function Bar({ pct, tone = "var(--crust)", track = "rgba(33,29,22,.10)", h = 6 }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ background: track, height: h }}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%`, background: tone, transition: "width .4s ease" }} />
    </div>
  );
}
// finom toast
function toast(msg) {
  const el = document.createElement("div");
  el.className = "fixed left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-xl text-[13px] font-medium shadow-lg";
  el.style.cssText += "bottom:84px;background:var(--panel);color:var(--cream);max-width:88vw;text-align:center;";
  el.textContent = msg;
  document.body.appendChild(el);
  el.animate([{ opacity: 0, transform: "translate(-50%,8px)" }, { opacity: 1, transform: "translate(-50%,0)" }], { duration: 220, fill: "forwards" });
  setTimeout(() => { el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" }).onfinish = () => el.remove(); }, 2200);
}
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString("hu-HU");

Object.assign(window, { Icon, Logo, Pill, StatusPill, Card, Section, Stat, Bar, toast, fmt });
