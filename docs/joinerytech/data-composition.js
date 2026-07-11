// ──────────────────────────────────────────────────────────────────────────
// data-composition.js — Összeállítás / Bútorsor (falnézet) — Belsőépítészet
//
//   Egy ÖSSZEÁLLÍTÁS (sim.compositions[]) = egy fal bútorsora: több konfigurált
//   elem (szekrény / ajtó / falpanel) egy falnézeten (elevation). Minden elem
//   egy mini-konfiguráció SNAPSHOT (categoryId/tplId/vars/styleId/techId/qty +
//   mount). Az ár és a falnézet-szín a window.SpecEngine-ből + a stílusból
//   számolódik (NEM tárolt igazság) — így a tömeges stílus-csere automatikusan
//   újraáraz és átszínez. A kimenet ajánlat: elemenként külön tételsor.
//
//   A státusz az összeállításon él; az átmenet validált (window.CompoEngine).
// ──────────────────────────────────────────────────────────────────────────

// Összeállítás életciklus (compositions[].status) — a quoteConfig-mintát követi
const COMPO_STATUS = {
  piszkozat:     { bg: "bg-stone-100",   fg: "text-stone-700",   dot: "bg-stone-400",   label: "Piszkozat" },
  veglegesitett: { bg: "bg-rose-50",     fg: "text-rose-700",    dot: "bg-rose-500",    label: "Véglegesített" },
  ajanlatban:    { bg: "bg-emerald-50",  fg: "text-emerald-700", dot: "bg-emerald-500", label: "Ajánlatban" },
  elvetve:       { bg: "bg-stone-50",    fg: "text-stone-500",   dot: "bg-stone-300",   label: "Elvetve" },
};
const COMPO_ORDER = ["piszkozat", "veglegesitett", "ajanlatban", "elvetve"];
const COMPO_FLOW = {
  piszkozat:     ["veglegesitett", "elvetve"],
  veglegesitett: ["ajanlatban", "piszkozat"],
  ajanlatban:    [],
  elvetve:       ["piszkozat"],
};

// Elem-felfüggesztés a falnézeten: alsó (padlón álló) vagy felső (falon függő)
const MOUNT_META = {
  floor: { key: "floor", label: "Alsó", short: "Alsó sor", icon: "box" },
  wall:  { key: "wall",  label: "Felső", short: "Felső sor", icon: "layers" },
};
const MOUNT_ORDER = ["wall", "floor"]; // a falnézeten felül a wall, alul a floor

const CompoEngine = {
  canGo(c, to) {
    if (!c) return false;
    return (COMPO_FLOW[c.status] || []).indexOf(to) !== -1;
  },
  // Egy összeállítás összegzői (számított — soha ne tárold)
  totals(c) {
    const items = (c && c.items) || [];
    const net = items.reduce((n, it) => n + (it.unitPrice || 0) * (it.qty || 1), 0);
    const count = items.reduce((n, it) => n + (it.qty || 1), 0);
    const floorW = items.filter((it) => it.mount === "floor").reduce((n, it) => n + ((it.vars && it.vars.width) || 600) * (it.qty || 1), 0);
    const wallW = items.filter((it) => it.mount === "wall").reduce((n, it) => n + ((it.vars && it.vars.width) || 600) * (it.qty || 1), 0);
    const deliveryDays = items.reduce((m, it) => Math.max(m, it.deliveryDays || 0), 0);
    return { net, count, floorW, wallW, runW: Math.max(floorW, wallW), deliveryDays };
  },
};

Object.assign(window, { COMPO_STATUS, COMPO_ORDER, COMPO_FLOW, MOUNT_META, MOUNT_ORDER, CompoEngine });
