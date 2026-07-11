// ──────────────────────────────────────────────────────────────────────────
// data-execbi.js — VEZETŐI BI-COCKPIT (kereszt-világ exec dashboard)
//
// NEM új FSM, NEM új entitás — SZÁMÍTOTT kereszt-világ aggregátor (mint a
// Feladataim/unifiedTasks): a meglévő világok igazságforrásait olvassa és
// deep-linkel a forrás-világba. A tényleges aggregáció a store `execCockpit()`-
// jában él (state-hozzáférés); itt csak a konstansok, a trend-idősor seed, a
// tónusok és a formázók.
//
// IDŐ ABLAK (trend): a szimuláció EGY pillanatkép (~2026-04), így valós többhavi
// idősor nincs az adatban — a `EXEC_TREND_SEED` egy demó 12-havi sorozat,
// amelynek az UTOLSÓ pontját a store az ÉLŐ pillanatkép-értékekre igazítja
// (`live:true`), hogy a görbe vége a tényleges KPI-kra fusson ki.
// ──────────────────────────────────────────────────────────────────────────

// ── Magyar rövid hónap-címkék ──────────────────────────────────────────────
const EXEC_MONTHS_HU = ["jan", "feb", "márc", "ápr", "máj", "jún", "júl", "aug", "szept", "okt", "nov", "dec"];
function execMonthLabel(ym) {
  const m = Number(String(ym).slice(5, 7)) - 1;
  return EXEC_MONTHS_HU[m] || ym;
}

// ── Trend-metrikák (a trend-panel sorozat-választója) ──────────────────────
// kind: "money" (M Ft) | "pct" (0..1). A `key` a trend-pont mezője.
const EXEC_TREND_METRICS = {
  revenue:  { key: "revenue",  label: "Árbevétel",        sub: "kiállított vevői számla", color: "#0d9488", kind: "money" },
  margin:   { key: "margin",   label: "Fedezet",          sub: "tény fedezeti hányad",    color: "#4f46e5", kind: "pct" },
  backlog:  { key: "backlog",  label: "Rendelésállomány", sub: "visszaigazolt, nem szállított", color: "#0284c7", kind: "money" },
  pipeline: { key: "pipeline", label: "Pipeline",         sub: "súlyozott forecast",      color: "#7c3aed", kind: "money" },
};
const EXEC_TREND_ORDER = ["revenue", "backlog", "pipeline", "margin"];

// ── Idő-ablak opciók ───────────────────────────────────────────────────────
const EXEC_WINDOWS = [
  { key: 6,  label: "6 hó" },
  { key: 12, label: "12 hó" },
];

// ── Demó 12-havi idősor (M Ft; margin = 0..1). Az UTOLSÓ pont ÉLŐ-felülírt. ─
// Enyhe növekedés + tél eleji (dec/jan) visszaesés — hihető bútorgyártó-ritmus.
const EXEC_TREND_SEED = [
  { ym: "2025-05", revenue: 12.4, margin: 0.17, backlog: 9.6,  pipeline: 8.4,  intake: 10.1 },
  { ym: "2025-06", revenue: 13.8, margin: 0.19, backlog: 10.8, pipeline: 9.1,  intake: 12.0 },
  { ym: "2025-07", revenue: 15.1, margin: 0.21, backlog: 12.2, pipeline: 10.0, intake: 13.4 },
  { ym: "2025-08", revenue: 11.9, margin: 0.16, backlog: 11.0, pipeline: 9.6,  intake: 9.8  },
  { ym: "2025-09", revenue: 16.7, margin: 0.23, backlog: 14.1, pipeline: 11.8, intake: 15.2 },
  { ym: "2025-10", revenue: 17.9, margin: 0.25, backlog: 16.0, pipeline: 13.2, intake: 16.6 },
  { ym: "2025-11", revenue: 16.2, margin: 0.22, backlog: 15.2, pipeline: 12.9, intake: 14.0 },
  { ym: "2025-12", revenue: 13.1, margin: 0.18, backlog: 12.4, pipeline: 11.5, intake: 10.7 },
  { ym: "2026-01", revenue: 14.6, margin: 0.20, backlog: 13.1, pipeline: 12.6, intake: 13.9 },
  { ym: "2026-02", revenue: 16.9, margin: 0.24, backlog: 15.6, pipeline: 14.1, intake: 15.8 },
  { ym: "2026-03", revenue: 18.8, margin: 0.27, backlog: 18.0, pipeline: 15.7, intake: 18.2 },
  { ym: "2026-04", revenue: 17.4, margin: 0.25, backlog: 16.8, pipeline: 16.2, intake: 16.9 },
];

// ── Radar-tónus: egy KPI állapota (jó / figyelni / kritikus) ────────────────
// count-alapú: 0 → jó, kevés → figyelni, sok → kritikus (a küszöböt a hívó adja)
function execAlarmTone(level) {
  if (level === "crit") return { pill: "bg-rose-50 text-rose-700 border-rose-200",     dot: "bg-rose-500",    fg: "text-rose-700",    ring: "ring-rose-200" };
  if (level === "warn") return { pill: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-500",   fg: "text-amber-700",   ring: "ring-amber-200" };
  return                  { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", fg: "text-emerald-700", ring: "ring-emerald-200" };
}
// kihasználtság-tónus (gyártás-terhelés %): <0.7 laza, 0.7–0.95 jó, >0.95 feszített
function execLoadTone(pct) {
  if (pct == null) return execAlarmTone("ok");
  if (pct > 0.98) return execAlarmTone("crit");
  if (pct >= 0.7) return execAlarmTone("ok");
  return execAlarmTone("warn"); // alulterhelt = értékesítési/ütemezési figyelmeztetés
}

// ── Formázók (a Kontrolling fmt-jeit újrahasználjuk, ha vannak) ─────────────
const execHuf = (n) => (window.ctrlHuf ? window.ctrlHuf(n) : Math.round(Number(n) || 0).toLocaleString("hu-HU") + " Ft");
const execHufM = (n) => (window.ctrlHufM ? window.ctrlHufM(n) : ((Number(n) || 0) / 1e6).toFixed(1) + "M");
const execPct = (x) => (x == null ? "—" : Math.round(x * 100) + "%");
const execMoneyShort = (n) => { const v = (Number(n) || 0) / 1e6; return (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1)) + " M Ft"; };

Object.assign(window, {
  EXEC_MONTHS_HU, execMonthLabel, EXEC_TREND_METRICS, EXEC_TREND_ORDER,
  EXEC_WINDOWS, EXEC_TREND_SEED, execAlarmTone, execLoadTone,
  execHuf, execHufM, execPct, execMoneyShort,
});
