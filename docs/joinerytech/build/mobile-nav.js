/* AUTO-GENERATED from mobile-nav.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// MobileBottomNav — thumb-zone bottom tab bar for one-handed mobile use.
//
// Reusable + data-driven: renders directly from `world.screens` and is fully
// state-driven through the `screen` / `onScreen` props that already flow through
// WorldShell. No DOM manipulation, no internal duplicate of nav state.
//
// Behaviour:
//   • Shows up to MAX_TABS primary screens as tabs in the thumb zone.
//   • If the world has more screens, the last slot becomes a "Több" (More)
//     tab that opens the existing drawer via `onMore`, and stays highlighted
//     when the active screen is one of the overflow screens.
//   • Hidden on md+ (the persistent sidebar takes over there).
// ──────────────────────────────────────────────────────────────────────────
const {
  useEffect: useEffectMN
} = React;

// screen-key → Icon name. Falls back to a sensible default per key pattern.
const SCREEN_ICON = {
  dash: "dashboard",
  analytics: "analytics",
  cutting: "cut",
  machining: "cpu",
  workflow: "workflow",
  orders: "orders",
  quotes: "briefcase",
  customers: "user",
  editor: "ruler",
  generate: "layers",
  catalog: "box",
  inventory: "inventory",
  procurement: "procurement",
  procurement2: "procurement",
  movements: "external",
  receiving: "download",
  withdrawals: "send",
  warehouse: "inventory",
  offcuts: "cut",
  stocktake: "layers",
  company: "briefcase",
  users: "user",
  facilities: "factory",
  machines: "cpu",
  partners: "user",
  integrations: "bolt",
  audit: "orders",
  roles: "settings",
  deliveries: "truck",
  pickups: "download",
  schedule: "calendar",
  terminal: "truck",
  resources: "user",
  projects: "briefcase",
  variance: "analytics",
  tickets: "shield",
  board: "workflow"
};
function screenIcon(key) {
  return SCREEN_ICON[key] || "dashboard";
}

// How many slots the bar shows (including a possible "More" slot).
const MAX_TABS = 5;
function MobileBottomNav({
  world,
  accent,
  screen,
  onScreen,
  onMore,
  lang
}) {
  const screens = world.screens || [];
  if (screens.length === 0) return null; // e.g. shopfloor kiosk

  const overflow = screens.length > MAX_TABS;
  // Primary screens get their own tab; reserve the last slot for "More" if needed.
  const primary = overflow ? screens.slice(0, MAX_TABS - 1) : screens;
  const overflowScreens = overflow ? screens.slice(MAX_TABS - 1) : [];
  const activeInOverflow = overflowScreens.some(s => s.key === screen);
  const activeBg = accent.iconBg; // tinted pill behind active icon
  const activeFg = accent.fg; // active label/icon colour

  const moreLabel = lang === "en" ? "More" : "Több";
  return /*#__PURE__*/React.createElement("nav", {
    className: "md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-stone-200/80",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom), 0px)"
    },
    "aria-label": lang === "en" ? "Primary" : "Fő navigáció"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-stretch"
  }, primary.map(s => {
    const active = screen === s.key;
    const label = lang === "en" && s.en ? s.en : s.hu;
    return /*#__PURE__*/React.createElement(NavTab, {
      key: s.key,
      icon: screenIcon(s.key),
      label: label,
      badge: s.badge,
      active: active,
      activeBg: activeBg,
      activeFg: activeFg,
      onClick: () => onScreen(s.key)
    });
  }), overflow && /*#__PURE__*/React.createElement(NavTab, {
    icon: "more",
    label: moreLabel,
    active: activeInOverflow,
    activeBg: activeBg,
    activeFg: activeFg,
    onClick: onMore
  })));
}

// Single tab — 56px tall, full-width hit target (thumb-friendly).
function NavTab({
  icon,
  label,
  badge,
  active,
  activeBg,
  activeFg,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    "aria-current": active ? "page" : undefined,
    className: "relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 h-[58px] px-1 active:bg-stone-100/70 transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: `relative grid place-items-center w-12 h-7 rounded-full transition ${active ? activeBg : ""}`
  }, /*#__PURE__*/React.createElement("span", {
    className: active ? activeFg : "text-stone-400"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 20
  })), badge && /*#__PURE__*/React.createElement("span", {
    className: "absolute -top-0.5 right-2.5 min-w-[7px] h-[7px] rounded-full bg-rose-500 ring-2 ring-white"
  })), /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] leading-none truncate max-w-full ${active ? activeFg + " font-semibold" : "text-stone-500"}`
  }, label));
}
window.MobileBottomNav = MobileBottomNav;
window.screenIcon = screenIcon;
})();
