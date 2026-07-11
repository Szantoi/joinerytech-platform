// ──────────────────────────────────────────────────────────────────────────
// LELTÁR / KÉSZLET-REVÍZIÓ (cycle counting) — a Raktár világ új képernyője
//
// FELELŐSSÉG: a raktári lot-modellre ülő leltározási folyamat. Egy leltár-ív
// SNAPSHOT-ot készít a kiválasztott hatókör (zóna / hely / minden) lotjairól →
// fizikai számlálás soronként → eltérés-kimutatás (számolt − rendszer) →
// LEZÁRÁSKOR a meglévő `whAdjustLot` könyveli a korrekciókat (egy igazságforrás).
// A státusz a leltár-íven él. A számított eltérés/pontosság SOHA nem tárolt.
// ──────────────────────────────────────────────────────────────────────────

const STK_TODAY = "2026-04-28";

// ── Státusz-FSM ─────────────────────────────────────────────────────────────
// nyitott → szamlalas → egyeztetes → lezarva   (mellék: megszakitva)
const STK_FLOW = {
  order: ["nyitott", "szamlalas", "egyeztetes", "lezarva"],
  states: {
    nyitott:     { next: ["szamlalas", "megszakitva"] },
    szamlalas:   { next: ["egyeztetes", "megszakitva"] },
    egyeztetes:  { next: ["lezarva", "szamlalas", "megszakitva"] },
    lezarva:     { next: [], terminal: true },
    megszakitva: { next: [], terminal: true },
  },
};
const STK_STATUS = {
  nyitott:     { label: "Nyitott",     pill: "bg-stone-100 text-stone-700 border-stone-200",      dot: "bg-stone-400" },
  szamlalas:   { label: "Számlálás",   pill: "bg-sky-50 text-sky-700 border-sky-200",             dot: "bg-sky-500" },
  egyeztetes:  { label: "Egyeztetés",  pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  lezarva:     { label: "Lezárva",     pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  megszakitva: { label: "Megszakítva", pill: "bg-rose-50 text-rose-700 border-rose-200",          dot: "bg-rose-500" },
};

// Hatókör-típusok
const STK_SCOPE = {
  all:      { key: "all",      label: "Teljes készlet", icon: "inventory" },
  zone:     { key: "zone",     label: "Zóna szerint",   icon: "layers" },
  location: { key: "location", label: "Raktárhely",     icon: "box" },
};

// ── Seed leltár-ívek ─────────────────────────────────────────────────────────
// A lines lotId/itemId VALÓS lotokra mutat (lot-013a/b/c), így a lezárás könyvel.
const STOCKTAKE_SEED = [
  // 2) Számlálás folyamatban — Vasalat / Általános zóna (Blum Antaro variánsok)
  { id: "LELT-2426-002", status: "szamlalas",
    scope: { type: "zone", zone: "general", label: "Általános zóna — vasalat" },
    createdBy: "Tóth Kinga", createdAt: "2026-04-28", note: "Negyedéves ciklikus leltár a vasalat-zónára.",
    lines: [
      { itemId: "wh-013-a", code: "VS-BL-ANT-350-FE", name: "Blum Antaro fiókcsúszó · 350 mm / fehér", unit: "pár", lotId: "lot-013a", zone: "general", locText: "Székesfehérvár • V / 05", systemQty: 100, countedQty: 98,  counted: true },
      { itemId: "wh-013-b", code: "VS-BL-ANT-450-FE", name: "Blum Antaro fiókcsúszó · 450 mm / fehér", unit: "pár", lotId: "lot-013b", zone: "general", locText: "Székesfehérvár • V / 05", systemQty: 200, countedQty: null, counted: false },
      { itemId: "wh-013-c", code: "VS-BL-ANT-450-BA", name: "Blum Antaro fiókcsúszó · 450 mm / barna", unit: "pár", lotId: "lot-013c", zone: "general", locText: "Székesfehérvár • V / 05", systemQty: 100, countedQty: 100, counted: true },
    ],
    log: [{ at: "2026-04-28 07:30", text: "Leltár-ív megnyitva (3 tétel)" }, { at: "2026-04-28 08:05", text: "Számlálás megkezdve" }] },

  // 1) Lezárva — historikus, egy eltéréssel könyvelve
  { id: "LELT-2426-001", status: "lezarva",
    scope: { type: "zone", zone: "general", label: "Általános zóna — lapanyag" },
    createdBy: "Nagy János", createdAt: "2026-03-31", closedAt: "2026-03-31", note: "Negyedéves lapanyag-leltár.",
    lines: [
      { itemId: "wh-011", code: "BK-018-M2", name: "Bükk 18mm lapanyag (m²)", unit: "m²", lotId: "lot-011a", zone: "general", locText: "Vác • R1 / A1", systemQty: 178, countedQty: 174, counted: true },
      { itemId: "wh-012", code: "RL-NYIR-18", name: "Nyír rétegelt lemez 18mm (m²)", unit: "m²", lotId: "lot-012a", zone: "general", locText: "Vác • R1 / A3", systemQty: 96, countedQty: 96, counted: true },
    ],
    log: [{ at: "2026-03-31 08:00", text: "Leltár-ív megnyitva" }, { at: "2026-03-31 11:20", text: "Számlálás kész" }, { at: "2026-03-31 11:40", text: "Lezárva — 1 eltérés könyvelve (Bükk m²: −4)" }] },
];

// ──────────────────────────────────────────────────────────────────────────
// StockEngine — tiszta számítások (FSM, eltérés, pontosság)
// ──────────────────────────────────────────────────────────────────────────
const StockEngine = {
  canGo(stk, to) { const st = STK_FLOW.states[stk.status]; return !!(st && st.next.includes(to)); },
  nextStates(stk) { const st = STK_FLOW.states[stk.status]; return st ? st.next.slice() : []; },
  isTerminal(stk) { const st = STK_FLOW.states[stk.status]; return !!(st && st.terminal); },
  isOpen(stk) { return !["lezarva", "megszakitva"].includes(stk.status); },
  variance(line) { return line.counted && line.countedQty != null ? (Number(line.countedQty) || 0) - (Number(line.systemQty) || 0) : 0; },
  summary(stk) {
    const lines = stk.lines || [];
    const counted = lines.filter((l) => l.counted);
    const variances = counted.filter((l) => this.variance(l) !== 0);
    const net = counted.reduce((s, l) => s + this.variance(l), 0);
    const matching = counted.length - variances.length;
    return {
      total: lines.length, counted: counted.length,
      pct: lines.length ? Math.round((counted.length / lines.length) * 100) : 0,
      variances: variances.length, net,
      accuracy: counted.length ? matching / counted.length : 1,
      complete: counted.length === lines.length && lines.length > 0,
    };
  },
};

Object.assign(window, { STK_TODAY, STK_FLOW, STK_STATUS, STK_SCOPE, STOCKTAKE_SEED, StockEngine });
