// ──────────────────────────────────────────────────────────────────────────
// SZERZŐDÉS + ÜTEMEZETT SZÁMLÁZÁS (milestone billing) (4.8-B3)
//
// FELELŐSSÉG: híd a Projektek ↔ Pénzügy között. Egy szerződés fizetési
// MÉRFÖLDKÖVEKKEL (előleg / részszámla / végszámla ütemterv); minden mérföldkő
// egy %-ot képvisel a szerződéses értékből, és a projekt-fázishoz kötve (vagy
// kézzel) GENERÁL egy kimenő számla-PISZKOZATOT a Pénzügyben (`finInvoices`).
// A számla-FSM a Pénzügyé marad; itt csak az ütemterv + a generálás él.
// ──────────────────────────────────────────────────────────────────────────

// Mérföldkő-státusz (a számlázási ütemtervben)
const CTR_MS_STATUS = {
  fuggoben:  { label: "Függőben",  pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" },
  esedekes:  { label: "Esedékes",  pill: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-500" },
  szamlazva: { label: "Számlázva", pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};
// Mérföldkő-kiváltó
const CTR_TRIGGER = {
  manual: { label: "Kézi" },
  phase:  { label: "Projekt-fázis" },
  date:   { label: "Dátum" },
};

// Seed szerződések — projekthez + rendeléshez kötve
const CONTRACTS_SEED = [
  // ── ÜGYFÉL-PORTÁL demó — Nagy Anna (végfelhasználó), ütemezett fizetés ──
  { id: "SZD-2426-003", customer: "Nagy Anna", projectRef: "PRJ-2026-014", orderRef: "JT-2426-0184",
    title: "Petőfi u. 12. — Konyha + nappali", totalGross: 3429000, currency: "HUF", signedAt: "2026-04-18", status: "aktiv",
    milestones: [
      { id: "m1", label: "Előleg", trigger: "manual", pct: 30, kind: "advance", status: "szamlazva", invoiceId: "SZ-2426-0060" },
      { id: "m2", label: "Gyártáskezdés (részszámla)", trigger: "phase", phase: "Gyártás", pct: 40, kind: "normal", status: "szamlazva", invoiceId: "SZ-2426-0061" },
      { id: "m3", label: "Átadás (végszámla)", trigger: "phase", phase: "Átadás", pct: 30, kind: "normal", status: "fuggoben" },
    ] },
  { id: "SZD-2426-001", customer: "Bognár Bútor Kft.", projectRef: "PRJ-2426-012", orderRef: "JT-2426-0184",
    title: "Bognár konyhabútor — 16 fiókos", totalGross: 4280000, currency: "HUF", signedAt: "2026-04-20", status: "aktiv",
    milestones: [
      { id: "m1", label: "Előleg", trigger: "manual", pct: 30, kind: "advance", status: "szamlazva", invoiceId: "SZ-2426-0050" },
      { id: "m2", label: "Gyártáskezdés (részszámla)", trigger: "phase", phase: "Gyártás", pct: 40, kind: "normal", status: "esedekes" },
      { id: "m3", label: "Átadás (végszámla)", trigger: "phase", phase: "Átadás", pct: 30, kind: "normal", status: "fuggoben" },
    ] },
  { id: "SZD-2426-002", customer: "Doorstar Hungary Zrt.", projectRef: "PRJ-2426-013", orderRef: "JT-2426-0182",
    title: "Doorstar belső ajtó sorozat", totalGross: 12400000, currency: "HUF", signedAt: "2026-04-18", status: "aktiv",
    milestones: [
      { id: "m1", label: "Előleg", trigger: "manual", pct: 40, kind: "advance", status: "szamlazva", invoiceId: "SZ-2426-0048" },
      { id: "m2", label: "Félteljesítés (részszámla)", trigger: "manual", pct: 30, kind: "normal", status: "esedekes" },
      { id: "m3", label: "Átadás (végszámla)", trigger: "phase", phase: "Átadás", pct: 30, kind: "normal", status: "fuggoben" },
    ] },
];

// Alap-ütemterv új szerződéshez (előleg / részszámla / végszámla)
const CTR_DEFAULT_SCHEDULE = [
  { label: "Előleg", trigger: "manual", pct: 30, kind: "advance" },
  { label: "Gyártáskezdés (részszámla)", trigger: "phase", phase: "Gyártás", pct: 40, kind: "normal" },
  { label: "Átadás (végszámla)", trigger: "phase", phase: "Átadás", pct: 30, kind: "normal" },
];

const ContractEngine = {
  msAmount(c, ms) { return Math.round((Number(c.totalGross) || 0) * (Number(ms.pct) || 0) / 100); },
  invoicedPct(c) { return (c.milestones || []).filter((m) => m.status === "szamlazva").reduce((s, m) => s + (Number(m.pct) || 0), 0); },
  invoicedAmount(c) { return (c.milestones || []).filter((m) => m.status === "szamlazva").reduce((s, m) => s + this.msAmount(c, m), 0); },
  remaining(c) { return (Number(c.totalGross) || 0) - this.invoicedAmount(c); },
  pctSum(ms) { return (ms || []).reduce((s, m) => s + (Number(m.pct) || 0), 0); },
};

Object.assign(window, { CTR_MS_STATUS, CTR_TRIGGER, CONTRACTS_SEED, CTR_DEFAULT_SCHEDULE, ContractEngine });
