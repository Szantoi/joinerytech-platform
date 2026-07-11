/* AUTO-GENERATED from page-home.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// Home screen + World shell with mini-sidebars
// Replaces the global single-sidebar app shell.

const {
  useState: useStateH,
  useMemo: useMemoH,
  useEffect: useEffectH
} = React;

// ──────────────────────────────────────────────────────────────────────────
// World icon set — bigger, more illustrative than the Icon set
// ──────────────────────────────────────────────────────────────────────────
function WorldIcon({
  name,
  size = 40,
  className = ""
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className
  };
  const ICONS = {
    factory: /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M6 40V22l8 5v-5l8 5v-5l8 5V14l8 -2v28z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 40h36"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 32h2M22 32h2M30 32h2M38 28v6"
    })),
    briefcase: /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
      x: "6",
      y: "14",
      width: "36",
      height: "26",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M18 14V10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 24h36M22 22v4M26 22v4"
    })),
    ruler: /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M8 8h32v8H32v6H24v6H16v6H8z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 14v3M20 14v3M26 14v3M32 14v3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 22v3M20 22v3M26 22v3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 30v3M20 30v3"
    })),
    box: /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M24 6 6 14v20l18 8 18-8V14z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 14l18 8 18-8M24 22v20"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 10l18 8"
    })),
    wrench: /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M30 6a8 8 0 0 1 8 12l-2 2 4 4 -8 8 -4 -4 -2 2a8 8 0 0 1 -12 -8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 22 6 30v8h8l8-8"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "32",
      cy: "14",
      r: "2.5"
    })),
    settings: /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("circle", {
      cx: "24",
      cy: "24",
      r: "6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M10 38l4-4M34 14l4-4"
    })),
    sparkle: /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M20 6c0 8-4 14-12 14 8 0 12 6 12 14 0-8 4-14 12-14-8 0-12-6-12-14z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M36 26c0 4-2 6-6 6 4 0 6 2 6 6 0-4 2-6 6-6-4 0-6-2-6-6z"
    })),
    storefront: /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M8 22v16h32V22"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 10h36l2 8a5 5 0 0 1-10 0 5 5 0 0 1-10 0 5 5 0 0 1-10 0 5 5 0 0 1-10 0z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M20 38V28h8v10"
    })),
    receipt: /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M10 6v36l4-2.6L18 42l4-2.6L26 42l4-2.6L34 42l4-2.6V6l-4 2.6L30 6l-4 2.6L22 6l-4 2.6L14 6z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 16h16M16 22h16M16 28h10"
    })),
    truck: /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M4 12a2 2 0 0 1 2-2h18v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M24 16h8l6 6v8a2 2 0 0 1-2 2h-2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "14",
      cy: "38",
      r: "3.5"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "32",
      cy: "38",
      r: "3.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M24 38h-6M38 38h-2"
    })),
    chart: /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M8 8v30a2 2 0 0 0 2 2h30"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "14",
      y: "26",
      width: "5",
      height: "10",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "23",
      y: "18",
      width: "5",
      height: "18",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "32",
      y: "12",
      width: "5",
      height: "24",
      rx: "1"
    })),
    shield: /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M24 5l15 5.5v10.5c0 9.5-6.4 15.5-15 17.5-8.6-2-15-8-15-17.5V10.5z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m17 23 4.5 4.5L31 18"
    }))
  };
  return ICONS[name] || ICONS.box;
}

// ──────────────────────────────────────────────────────────────────────────
// Home screen — module card grid
// ──────────────────────────────────────────────────────────────────────────
const NOTIFICATIONS = [{
  type: "stock",
  when: "10 perccel ezelőtt",
  text: "Vasalat Blum CLIP top — készlet kritikus szint alá esett (4 db)",
  world: "warehouse",
  screen: "inventory"
}, {
  type: "order",
  when: "1 órája",
  text: "Új ajánlat elfogadva: Doorstar Hungary Zrt. — JT-2426-0182 (12.4M Ft)",
  world: "sales",
  screen: "orders"
}, {
  type: "machine",
  when: "2 órája",
  text: "Holzma HPP380 · CP-184-A elkészült · proof feltöltve",
  world: "mfgprep",
  screen: "nesting"
}, {
  type: "design",
  when: "Tegnap",
  text: "Új sablon publikálva: Konyhai alsó szekrény (fiókos) v2.1",
  world: "design",
  screen: "editor"
}, {
  type: "delivery",
  when: "Tegnap",
  text: "PO-2426-091 megérkezett — 30 db Tölgy 22mm",
  world: "warehouse",
  screen: "procurement"
}];

// ──────────────────────────────────────────────────────────────────────────
// Module card — one world tile (used inside themed sections on the Home grid)
// ──────────────────────────────────────────────────────────────────────────
function ModuleCard({
  wkey,
  lang,
  onEnter
}) {
  const w = WORLDS[wkey];
  if (!w) return null;
  const accent = ACCENT_MAP[w.accent] || ACCENT_MAP.teal;
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onEnter(wkey),
    className: `group relative overflow-hidden rounded-2xl bg-white border border-stone-200/80 hover:border-stone-300 hover:shadow-[0_8px_24px_-6px_rgba(28,25,23,.12)] transition text-left p-6 min-h-[200px] flex flex-col`
  }, /*#__PURE__*/React.createElement("div", {
    className: `absolute -right-6 -top-6 w-32 h-32 rounded-full ${accent.tint} opacity-50 group-hover:opacity-90 transition`
  }), /*#__PURE__*/React.createElement("div", {
    className: `relative w-12 h-12 rounded-xl ${accent.iconBg} ${accent.iconFg} grid place-items-center mb-5`
  }, /*#__PURE__*/React.createElement(WorldIcon, {
    name: w.icon,
    size: 24
  })), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[19px] font-semibold tracking-tight text-stone-900"
  }, lang === "en" ? w.en : w.hu), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500 mt-1 leading-snug"
  }, w.sub)), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative flex items-center justify-between mt-5 pt-4 border-t border-stone-100"
  }, w.badge ? /*#__PURE__*/React.createElement("span", {
    className: `text-[11px] font-medium ${accent.fg}`
  }, w.badge) : /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 16
  }))));
}

// Téma szerint csoportosított világok a Home rácsra. Csak az engedélyezett
// világok jelennek meg; a téma-listából kimaradó (új) világok az „Egyéb" alá
// esnek, így semmi nem tűnik el. Üres csoport nem jelenik meg.
function homeThemeSections(enabledModules, lang) {
  const enabled = new Set(enabledModules);
  const themes = window.WORLD_THEMES || [];
  const used = new Set();
  const sections = themes.map(t => {
    const worlds = (t.worlds || []).filter(k => enabled.has(k) && WORLDS[k]);
    worlds.forEach(k => used.add(k));
    return {
      key: t.key,
      title: lang === "en" ? t.en : t.hu,
      worlds
    };
  }).filter(s => s.worlds.length > 0);
  // bármi, ami engedélyezett, de egyik témában sincs → „Egyéb"
  const leftover = (window.WORLD_ORDER || []).filter(k => enabled.has(k) && WORLDS[k] && !used.has(k));
  if (leftover.length) sections.push({
    key: "other",
    title: lang === "en" ? "Other" : "Egyéb",
    worlds: leftover
  });
  return sections;
}
function HomeScreen({
  enabledModules,
  onEnter,
  lang
}) {
  const greeting = lang === "en" ? "Good morning" : "Jó reggelt";
  const _acct = useSim().currentAccountId;
  const _me = window.sim.currentAccount();
  const me = _me ? _me.name.replace(/\(.*?\)/g, "").trim() : lang === "en" ? "Peter Kovacs" : "Kovács Péter";
  const subtitle = lang === "en" ? "Choose a workspace" : "Válassz egy munkavilágot";
  const recent = lang === "en" ? "Recent activity" : "Legutóbbi tevékenység";
  const sections = homeThemeSections(enabledModules, lang);
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-gradient-to-br from-stone-50 via-white to-teal-50/30"
  }, /*#__PURE__*/React.createElement("header", {
    className: "px-8 py-5 flex items-center justify-between border-b border-stone-200/60"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg bg-stone-900 grid place-items-center text-white"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[16px] font-bold tracking-tighter"
  }, "jt")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold tracking-tight"
  }, "joinery", /*#__PURE__*/React.createElement("span", {
    className: "text-teal-600"
  }, "/"), "tech"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 -mt-0.5"
  }, "port\xE1l"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(CommHubButton, null), /*#__PURE__*/React.createElement(ProfileSwitcher, null))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1200px] mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] uppercase tracking-[0.2em] text-stone-500 font-medium mb-2"
  }, new Date().toLocaleDateString(lang === "en" ? "en-US" : "hu-HU", {
    weekday: "long",
    month: "long",
    day: "numeric"
  })), /*#__PURE__*/React.createElement("h1", {
    className: "text-[32px] md:text-[44px] font-semibold tracking-tight text-stone-900 leading-tight"
  }, greeting, ", ", me, "."), /*#__PURE__*/React.createElement("p", {
    className: "text-[16px] text-stone-500 mt-1"
  }, subtitle, ".")), /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1200px] mx-auto px-5 md:px-8 pb-10 space-y-8"
  }, sections.map(sec => /*#__PURE__*/React.createElement("section", {
    key: sec.key
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-[12px] uppercase tracking-[0.16em] text-stone-500 font-semibold"
  }, sec.title), /*#__PURE__*/React.createElement("div", {
    className: "h-px flex-1 bg-stone-200/70"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400 tabular-nums"
  }, sec.worlds.length)), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 gap-4"
  }, sec.worlds.map(key => /*#__PURE__*/React.createElement(ModuleCard, {
    key: key,
    wkey: key,
    lang: lang,
    onEnter: onEnter
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "!mt-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-3"
  }, recent), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, NOTIFICATIONS.map((n, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => onEnter(n.world, n.screen),
    className: "w-full grid grid-cols-[20px_1fr_120px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center text-left hover:bg-stone-50/70"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-2 h-2 rounded-full ${n.type === "stock" ? "bg-amber-500" : n.type === "order" ? "bg-emerald-500" : n.type === "machine" ? "bg-teal-500" : n.type === "design" ? "bg-indigo-500" : "bg-sky-500"}`
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-800 truncate"
  }, n.text), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 font-mono text-right"
  }, n.when)))))), /*#__PURE__*/React.createElement("footer", {
    className: "text-center py-6 text-[10.5px] text-stone-400 font-mono"
  }, "v3.2.1 \xB7 2026"));
}

// Color tokens per accent
const ACCENT_MAP = {
  teal: {
    tint: "bg-teal-100",
    iconBg: "bg-teal-100",
    iconFg: "text-teal-700",
    fg: "text-teal-700",
    sideBg: "bg-teal-50/30",
    sideAccent: "border-teal-600",
    sideHover: "hover:bg-teal-50"
  },
  indigo: {
    tint: "bg-indigo-100",
    iconBg: "bg-indigo-100",
    iconFg: "text-indigo-700",
    fg: "text-indigo-700",
    sideBg: "bg-indigo-50/30",
    sideAccent: "border-indigo-600",
    sideHover: "hover:bg-indigo-50"
  },
  amber: {
    tint: "bg-amber-100",
    iconBg: "bg-amber-100",
    iconFg: "text-amber-700",
    fg: "text-amber-700",
    sideBg: "bg-amber-50/30",
    sideAccent: "border-amber-600",
    sideHover: "hover:bg-amber-50"
  },
  emerald: {
    tint: "bg-emerald-100",
    iconBg: "bg-emerald-100",
    iconFg: "text-emerald-700",
    fg: "text-emerald-700",
    sideBg: "bg-emerald-50/30",
    sideAccent: "border-emerald-600",
    sideHover: "hover:bg-emerald-50"
  },
  violet: {
    tint: "bg-violet-100",
    iconBg: "bg-violet-100",
    iconFg: "text-violet-700",
    fg: "text-violet-700",
    sideBg: "bg-violet-50/30",
    sideAccent: "border-violet-600",
    sideHover: "hover:bg-violet-50"
  },
  rose: {
    tint: "bg-rose-100",
    iconBg: "bg-rose-100",
    iconFg: "text-rose-700",
    fg: "text-rose-700",
    sideBg: "bg-rose-50/30",
    sideAccent: "border-rose-600",
    sideHover: "hover:bg-rose-50"
  },
  stone: {
    tint: "bg-stone-100",
    iconBg: "bg-stone-100",
    iconFg: "text-stone-700",
    fg: "text-stone-700",
    sideBg: "bg-stone-50/40",
    sideAccent: "border-stone-700",
    sideHover: "hover:bg-stone-100"
  },
  orange: {
    tint: "bg-orange-100",
    iconBg: "bg-orange-100",
    iconFg: "text-orange-700",
    fg: "text-orange-700",
    sideBg: "bg-orange-50/40",
    sideAccent: "border-orange-600",
    sideHover: "hover:bg-orange-50"
  },
  sky: {
    tint: "bg-sky-100",
    iconBg: "bg-sky-100",
    iconFg: "text-sky-700",
    fg: "text-sky-700",
    sideBg: "bg-sky-50/40",
    sideAccent: "border-sky-600",
    sideHover: "hover:bg-sky-50"
  },
  slate: {
    tint: "bg-slate-200",
    iconBg: "bg-slate-100",
    iconFg: "text-slate-700",
    fg: "text-slate-700",
    sideBg: "bg-slate-50/50",
    sideAccent: "border-slate-600",
    sideHover: "hover:bg-slate-100"
  },
  red: {
    tint: "bg-red-100",
    iconBg: "bg-red-100",
    iconFg: "text-red-700",
    fg: "text-red-700",
    sideBg: "bg-red-50/40",
    sideAccent: "border-red-600",
    sideHover: "hover:bg-red-50"
  },
  lime: {
    tint: "bg-lime-100",
    iconBg: "bg-lime-100",
    iconFg: "text-lime-700",
    fg: "text-lime-700",
    sideBg: "bg-lime-50/40",
    sideAccent: "border-lime-600",
    sideHover: "hover:bg-lime-50"
  },
  cyan: {
    tint: "bg-cyan-100",
    iconBg: "bg-cyan-100",
    iconFg: "text-cyan-700",
    fg: "text-cyan-700",
    sideBg: "bg-cyan-50/40",
    sideAccent: "border-cyan-600",
    sideHover: "hover:bg-cyan-50"
  },
  blue: {
    tint: "bg-blue-100",
    iconBg: "bg-blue-100",
    iconFg: "text-blue-700",
    fg: "text-blue-700",
    sideBg: "bg-blue-50/40",
    sideAccent: "border-blue-600",
    sideHover: "hover:bg-blue-50"
  },
  rose: {
    tint: "bg-rose-100",
    iconBg: "bg-rose-100",
    iconFg: "text-rose-700",
    fg: "text-rose-700",
    sideBg: "bg-rose-50/40",
    sideAccent: "border-rose-600",
    sideHover: "hover:bg-rose-50"
  }
};

// ──────────────────────────────────────────────────────────────────────────
// World shell — sidebar + content frame, scoped to one world
// ──────────────────────────────────────────────────────────────────────────
function WorldShell({
  world,
  screen,
  onScreen,
  onHome,
  lang,
  children,
  t
}) {
  const w = WORLDS[world];
  const accent = ACCENT_MAP[w.accent] || ACCENT_MAP.teal;
  const [menuOpen, setMenuOpen] = useStateH(false);

  // Close the drawer whenever we navigate to a different screen/world.
  useEffectH(() => {
    setMenuOpen(false);
  }, [screen, world]);

  // Lock body scroll while the drawer is open.
  useEffectH(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = e => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);
  return /*#__PURE__*/React.createElement("div", {
    className: "flex min-h-screen bg-stone-50/60"
  }, /*#__PURE__*/React.createElement(WorldSidebar, {
    world: w,
    accent: accent,
    screen: screen,
    onScreen: onScreen,
    onHome: onHome,
    lang: lang
  }), /*#__PURE__*/React.createElement("main", {
    className: "flex-1 min-w-0 flex flex-col"
  }, /*#__PURE__*/React.createElement(WorldTopBar, {
    world: w,
    accent: accent,
    screen: screen,
    onHome: onHome,
    lang: lang,
    onMenu: () => setMenuOpen(true)
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 pb-[58px] md:pb-0"
  }, children)), /*#__PURE__*/React.createElement(MobileBottomNav, {
    world: w,
    accent: accent,
    screen: screen,
    onScreen: onScreen,
    onMore: () => setMenuOpen(true),
    lang: lang
  }), /*#__PURE__*/React.createElement(WorldMobileDrawer, {
    open: menuOpen,
    onClose: () => setMenuOpen(false),
    world: w,
    accent: accent,
    screen: screen,
    onScreen: onScreen,
    onHome: onHome,
    lang: lang
  }));
}

// Mobile slide-in drawer (< md) — mirrors WorldSidebar content
function WorldMobileDrawer({
  open,
  onClose,
  world,
  accent,
  screen,
  onScreen,
  onHome,
  lang
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `md:hidden fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`,
    "aria-hidden": !open
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    className: `absolute inset-0 bg-stone-900/40 backdrop-blur-[1px] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`
  }), /*#__PURE__*/React.createElement("aside", {
    className: `absolute inset-y-0 left-0 w-[280px] max-w-[82%] bg-white shadow-2xl flex flex-col transition-transform duration-200 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 border-b border-stone-200/70 flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-lg bg-stone-900 grid place-items-center text-white shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-bold tracking-tighter"
  }, "jt")), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold tracking-tight text-stone-900 leading-tight"
  }, "joinery", /*#__PURE__*/React.createElement("span", {
    className: "text-teal-600"
  }, "/"), "tech"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-500 truncate"
  }, "port\xE1l")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-9 h-9 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100 -mr-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onHome();
      onClose();
    },
    className: "px-4 py-3 border-b border-stone-200/70 flex items-center gap-2 text-[12px] text-stone-600 hover:bg-stone-50 text-left"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14,
    className: "rotate-180"
  }), lang === "en" ? "All workspaces" : "Vissza a Home-ra"), /*#__PURE__*/React.createElement("div", {
    className: `px-4 py-3 border-b border-stone-200/70 ${accent.sideBg}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-8 h-8 rounded-lg ${accent.iconBg} ${accent.iconFg} grid place-items-center`
  }, /*#__PURE__*/React.createElement(WorldIcon, {
    name: world.icon,
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, lang === "en" ? world.en : world.hu), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-500"
  }, lang === "en" ? "Workspace" : "Munkavilág")))), /*#__PURE__*/React.createElement("nav", {
    className: "flex-1 px-2 py-3 space-y-0.5 overflow-y-auto"
  }, world.screens.map(s => {
    const active = screen === s.key;
    return /*#__PURE__*/React.createElement("button", {
      key: s.key,
      onClick: () => {
        onScreen(s.key);
        onClose();
      },
      className: `w-full flex items-center gap-2.5 px-2.5 h-11 rounded-lg text-[13.5px] text-left transition ${active ? "bg-stone-100 text-stone-900 font-medium" : "text-stone-600 hover:bg-stone-50"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1 h-4 rounded-full ${active ? accent.sideAccent.replace("border-", "bg-") : "bg-transparent"}`
    }), /*#__PURE__*/React.createElement("span", {
      className: "flex-1 truncate"
    }, lang === "en" && s.en ? s.en : s.hu), s.badge && !active && /*#__PURE__*/React.createElement("span", {
      className: "text-[9.5px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold shrink-0"
    }, s.badge));
  })), /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-3 border-t border-stone-200/70 text-[10.5px] text-stone-400 font-mono"
  }, "v3.2.1")));
}
function WorldSidebar({
  world,
  accent,
  screen,
  onScreen,
  onHome,
  lang
}) {
  return /*#__PURE__*/React.createElement("aside", {
    className: "hidden md:flex w-56 shrink-0 bg-white border-r border-stone-200/70 flex-col"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onHome,
    className: "px-4 py-4 border-b border-stone-200/70 flex items-center gap-2.5 hover:bg-stone-50 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-lg bg-stone-900 grid place-items-center text-white"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-bold tracking-tighter"
  }, "jt")), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold tracking-tight text-stone-900 leading-tight"
  }, "joinery", /*#__PURE__*/React.createElement("span", {
    className: "text-teal-600"
  }, "/"), "tech"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-500 truncate"
  }, lang === "en" ? "← All workspaces" : "← Vissza a Home-ra"))), /*#__PURE__*/React.createElement("div", {
    className: `px-4 py-3 border-b border-stone-200/70 ${accent.sideBg}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-8 h-8 rounded-lg ${accent.iconBg} ${accent.iconFg} grid place-items-center`
  }, /*#__PURE__*/React.createElement(WorldIcon, {
    name: world.icon,
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, lang === "en" ? world.en : world.hu), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-500"
  }, lang === "en" ? "Workspace" : "Munkavilág")))), /*#__PURE__*/React.createElement("nav", {
    className: "flex-1 px-2 py-3 space-y-0.5 overflow-y-auto"
  }, world.screens.map(s => {
    const active = screen === s.key;
    return /*#__PURE__*/React.createElement("button", {
      key: s.key,
      onClick: () => onScreen(s.key),
      className: `w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[12.5px] text-left transition ${active ? "bg-stone-100 text-stone-900 font-medium" : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1 h-4 rounded-full ${active ? accent.sideAccent.replace("border-", "bg-") : "bg-transparent"}`
    }), /*#__PURE__*/React.createElement("span", {
      className: "flex-1 truncate"
    }, lang === "en" && s.en ? s.en : s.hu), s.badge && !active && /*#__PURE__*/React.createElement("span", {
      className: "text-[9.5px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold shrink-0"
    }, s.badge));
  })), /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-3 border-t border-stone-200/70 text-[10.5px] text-stone-400 font-mono"
  }, "v3.2.1"));
}
function WorldTopBar({
  world,
  accent,
  screen,
  onHome,
  lang,
  onMenu
}) {
  const screenObj = world.screens.find(s => s.key === screen) || world.screens[0];
  const screenLabel = lang === "en" && screenObj?.en ? screenObj.en : screenObj?.hu;
  return /*#__PURE__*/React.createElement("header", {
    className: "bg-white border-b border-stone-200/70"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-4 flex items-center gap-3 md:gap-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onMenu,
    "aria-label": "Men\xFC",
    className: "md:hidden w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-600 hover:bg-stone-100 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "menu",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "md:hidden min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: `text-[10px] font-medium ${accent.fg} truncate`
  }, lang === "en" ? world.en : world.hu), /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold tracking-tight text-stone-900 leading-tight truncate"
  }, screenLabel)), /*#__PURE__*/React.createElement(CommHubButton, {
    className: "md:hidden"
  }), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:flex items-center gap-2 text-[11.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onHome,
    className: "hover:text-stone-900"
  }, "Home"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 11,
    className: "text-stone-300"
  }), /*#__PURE__*/React.createElement("span", {
    className: accent.fg + " font-medium"
  }, lang === "en" ? world.en : world.hu), screenObj && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 11,
    className: "text-stone-300"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-700 font-medium"
  }, screenLabel))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    placeholder: lang === "en" ? "Search…" : "Keresés…",
    className: "h-8 w-56 pl-8 pr-3 rounded-lg border border-stone-200 text-[12px] focus:border-stone-400 focus:ring-1 focus:ring-stone-300 outline-none bg-stone-50/40"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 13,
    className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
  })), /*#__PURE__*/React.createElement("button", {
    className: "w-8 h-8 grid place-items-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 relative"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    className: "absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500"
  })), /*#__PURE__*/React.createElement(CommHubButton, {
    tone: "bar",
    size: 16
  }), /*#__PURE__*/React.createElement(ProfileSwitcher, {
    tone: "bar"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:block px-7 pb-4"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[22px] font-semibold tracking-tight text-stone-900"
  }, screenLabel)));
}
window.HomeScreen = HomeScreen;
window.WorldShell = WorldShell;
window.WorldIcon = WorldIcon;
window.ACCENT_MAP = ACCENT_MAP;
})();
