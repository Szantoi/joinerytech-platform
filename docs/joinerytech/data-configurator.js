// ──────────────────────────────────────────────────────────────────────────
// data-configurator.js — Termékkonfigurátor (CPQ) törzsadat + FSM konstansok
//
// A vezetett konfigurátor (page-configurator.jsx) a meglévő spec-rendszerre
// (data-specs.js / specs-engine.js / PARAM_TEMPLATES) épül: kategória → modell
// (sablon) → MÉRET (a sablon szabad változói — ez az új képesség) → kivitel
// (stílus) → műszaki → ÁR (SpecEngine, a tényleges méretekkel).
//
// A konfigurátor kimenete egy MENTETT KONFIGURÁCIÓ (sim.quoteConfigs[]) saját,
// könnyű FSM-mel — így a konfiguráció újrahasználható / megosztható, és a
// meglévő láncba (createQuote / createLeadFromWebshop) köt be. A státusz a
// konfiguráció-tételen él; az átmenet validált (window.CfgEngine).
// ──────────────────────────────────────────────────────────────────────────

// Mentett-konfiguráció életciklus (quoteConfigs[].status)
//   piszkozat   — szerkeszthető vázlat (a wizard kimenete)
//   veglegesitett — lezárt, ajánlatba/rendelésbe küldhető
//   ajanlatban  — ajánlattá/leaddé konvertálva (terminal — a kimenet az ajánlat-FSM-be került)
//   elvetve     — elvetett (újranyitható)
const CFG_STATUS = {
  piszkozat:     { bg: "bg-stone-100",   fg: "text-stone-700",   dot: "bg-stone-400",   label: "Piszkozat" },
  veglegesitett: { bg: "bg-violet-50",   fg: "text-violet-700",  dot: "bg-violet-500",  label: "Véglegesített" },
  ajanlatban:    { bg: "bg-emerald-50",  fg: "text-emerald-700", dot: "bg-emerald-500", label: "Ajánlatban" },
  elvetve:       { bg: "bg-rose-50",     fg: "text-rose-700",    dot: "bg-rose-500",    label: "Elvetve" },
};
const CFG_ORDER = ["piszkozat", "veglegesitett", "ajanlatban", "elvetve"];

// Engedélyezett FSM-átmenetek (a tiltottak LEZÁRT gombként, nem rejtve)
const CFG_FLOW = {
  piszkozat:     ["veglegesitett", "elvetve"],
  veglegesitett: ["ajanlatban", "piszkozat"],
  ajanlatban:    [],
  elvetve:       ["piszkozat"],
};

// Három közönség — UGYANAZ a wizard, más belépő, más záró-akció és copy.
//   internal — belső értékesítő / tervező (ajánlatba / új ajánlat)
//   webshop  — ügyfél önkiszolgáló (ajánlatkérés → auto-lead, csak ársáv)
//   b2b      — viszonteladó partner (ajánlatba, viszonteladói kontextus)
const CFG_AUDIENCE_META = {
  internal: {
    key: "internal", label: "Belső", icon: "briefcase", accent: "violet",
    desc: "Értékesítő / tervező — ajánlatba vagy új ajánlatba.",
    cta: "Ajánlathoz adás", showExactPrice: true,
  },
  webshop: {
    key: "webshop", label: "Webshop", icon: "box", accent: "violet",
    desc: "Ügyfél önkiszolgáló — ajánlatkérés, becsült ársáv.",
    cta: "Ajánlatkérés", showExactPrice: false,
  },
  b2b: {
    key: "b2b", label: "Partner (B2B)", icon: "route", accent: "violet",
    desc: "Viszonteladó partner — ajánlatba, partner-kontextus.",
    cta: "Ajánlathoz adás", showExactPrice: true,
  },
};
const CFG_AUDIENCE_ORDER = ["internal", "webshop", "b2b"];

// Pontossági (becslési) magyarázat a záró lépéshez közönségenként
const CFG_BAND_NOTE = {
  internal: "A becslés a kiválasztott pontossági (tűrés) sávval mozog. Az ajánlatban módosítható.",
  webshop:  "Tájékoztató ársáv — a pontos ajánlatot kollégánk készíti el a megadott elérhetőségen.",
  b2b:      "Partner-ár becslés a megadott kivitellel. A végleges ajánlat a partneri kondíciókkal készül.",
};

// Tiszta segéd-motor — FSM őr + összegzők (soha ne tárold a számítottat)
const CfgEngine = {
  canGo(cfg, to) {
    if (!cfg) return false;
    const allowed = CFG_FLOW[cfg.status] || [];
    return allowed.indexOf(to) !== -1;
  },
  // Egy konfiguráció rövid kivitel-összefoglalója (lista/kártya)
  summary(cfg) {
    if (!cfg) return "—";
    const bits = [];
    if (cfg.tplName) bits.push(cfg.tplName);
    if (cfg.styleName) bits.push(cfg.styleName);
    if (cfg.dims) bits.push(cfg.dims);
    return bits.join(" · ") || "—";
  },
};

Object.assign(window, {
  CFG_STATUS, CFG_ORDER, CFG_FLOW,
  CFG_AUDIENCE_META, CFG_AUDIENCE_ORDER, CFG_BAND_NOTE,
  CfgEngine,
});
