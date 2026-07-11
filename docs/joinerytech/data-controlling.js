// ──────────────────────────────────────────────────────────────────────────
// KONTROLLING világ — projekt-jövedelmezőség, terv vs. tény (utókalkuláció)
//
// NEM új FSM — SZÁMÍTOTT réteg a meglévő adatokból (egy igazságforrás marad a
// többi modul). Projektenként (és a benne lévő rendelésekre) összeveti a
// TERVET (kalkulált: MfgPrep gyártás-előkészítés + ajánlat-érték) a TÉNNYEL
// (felmerült: raktári kivét + bérmunka-kézfogás + szállítás + beszállítói számla
// + kézi munka-napló/korrekció). A bevétel a KIMENŐ számlákból (dir:"out") jön.
//
// Modell: „automatikus alap + kézi korrekció". A store `controllingForProject`
// auto-aggregálja, amit a linkek megengednek; a `ctrlAdjustments[]` kézi
// pót-/korrekciós tételek (terv és/vagy tény) töltik a hézagokat (pl. munkaóra-
// napló, ahol nincs időmérés). A számítás a store-ban él (state-hozzáférés);
// itt csak a konstansok, a default-konfiguráció, a tónusok és a seed.
// ──────────────────────────────────────────────────────────────────────────

// ── Költség-kategóriák ─────────────────────────────────────────────────────
const CTRL_CATEGORIES = {
  anyag:      { key: "anyag",      label: "Anyag",              icon: "box",      accent: "#0d9488", pill: "bg-teal-50 text-teal-700 border-teal-200",     src: "Raktári kivét / mozgások" },
  munka:      { key: "munka",      label: "Munkaóra",           icon: "wrench",   accent: "#4f46e5", pill: "bg-indigo-50 text-indigo-700 border-indigo-200", src: "Gyártás-előkészítés / napló" },
  bermunka:   { key: "bermunka",   label: "Bérmunka",           icon: "external", accent: "#d97706", pill: "bg-amber-50 text-amber-700 border-amber-200",   src: "B2B kézfogás" },
  szallitas:  { key: "szallitas",  label: "Szállítás",          icon: "truck",    accent: "#0284c7", pill: "bg-sky-50 text-sky-700 border-sky-200",         src: "Logisztika / fuvarok" },
  beszallito: { key: "beszallito", label: "Beszállítói számla", icon: "receipt",  accent: "#7c3aed", pill: "bg-violet-50 text-violet-700 border-violet-200", src: "Bejövő számlák" },
  rezsi:      { key: "rezsi",      label: "Rezsi / átalány",    icon: "layers",   accent: "#78716c", pill: "bg-stone-100 text-stone-600 border-stone-200",   src: "% ráterhelés" },
};
// a `rezsi` SZÁMÍTOTT (a direkt költségek %-a) — nem közvetlen tétel
const CTRL_CAT_ORDER = ["anyag", "munka", "bermunka", "szallitas", "beszallito", "rezsi"];
const CTRL_DIRECT_CATS = ["anyag", "munka", "bermunka", "szallitas", "beszallito"];

// ── Default konfiguráció (Tweaks/Beállítás-szerűen állítható) ──────────────
const CTRL_DEFAULTS = {
  overheadPct: 12,        // rezsi-ráterhelés a direkt költségekre
  transportBase: 12000,   // Ft / fuvar alapdíj
  transportPerM3: 2200,   // Ft / m³
  outsourceEst: 75000,    // Ft / kiadott (elfogadott) kézfogás, ha nincs payload-ár
  targetCostRatio: 0.6,   // ha nincs kalkulált terv: a szerződéses érték ennyi része a terv-költség
  laborRate: 7200,        // Ft / óra — ÁLTALÁNOS fallback óradíj (ha nincs se hozzárendelt dolgozó, se művelet-ráta)
  laborBasis: "auto",     // tény-munkaerő ár-bázis: "auto" (dolgozó→művelet→fix kaszkád) | "grade" | "kind" | "flat"
  gradeLoadMult: 1.9,     // HR nettó bér-kategória óradíj → TELJES (bér+járulék+rezsi) műhely-óradíj szorzó
};

// ── Per-művelettípus tény-óradíj (TELJES, terhelt Ft/h) ─────────────────────
// Akkor használjuk, ha a gyártási taskhoz nincs konkrét HR-dolgozó hozzárendelve
// (assignee nincs a törzsben). A gép-igényes műveletek drágábbak (gép-óradíj a
// kezelő bére fölött). Kulcs = PROD_KINDS művelet-típus.
const CTRL_KIND_RATES = {
  szabaszat:      7600,   // szabász + tábla-/körfűrész
  elzaras:        7400,   // élzáró-gép kezelő
  cnc:            9800,   // CNC-megmunkálás (gép-óradíj prémium)
  szereles:       6800,   // kézi szerelés (nincs gép-óradíj)
  feluletkezeles: 7600,   // felületkezelés / lakkozó kabin
};

// ── Munkaerő ár-bázis meta (a bontás megjelenítéséhez) ──────────────────────
const CTRL_LABOR_BASIS = {
  grade: { key: "grade", label: "Bér-kategória",  short: "dolgozó",    pill: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  kind:  { key: "kind",  label: "Művelettípus",   short: "művelet",    pill: "bg-sky-50 text-sky-700 border-sky-200",          dot: "bg-sky-500" },
  flat:  { key: "flat",  label: "Általános óradíj", short: "átalány",  pill: "bg-stone-100 text-stone-600 border-stone-200",   dot: "bg-stone-400" },
};

// ── Tény-óradíj feloldó (PURE) ──────────────────────────────────────────────
// Egy gyártási taskhoz feloldja a Ft/h tény-óradíjat — KASZKÁD:
//   (1) grade — ha az assignee a HR-törzsben van: bér-kategória nettó × gradeLoadMult
//               (vagy emp.hourlyCost, szintén terhelve) — a data-attendance mintáját követi.
//   (2) kind  — különben a művelettípus terhelt óradíja (CTRL_KIND_RATES).
//   (3) flat  — végső fallback: cfg.laborRate.
// A `laborBasis` cfg force-olhatja az ágat (grade/kind/flat); "auto" = a kaszkád.
// Visszaad: { rate, basis, label, who } — `who` a dolgozó neve, ha grade-bázis.
function ctrlLaborRate(task, opts) {
  opts = opts || {};
  const cfg = opts.cfg || CTRL_DEFAULTS;
  const basisCfg = cfg.laborBasis || "auto";
  const grades = (typeof window !== "undefined" && window.HR_PAY_GRADES) || {};
  const mult = cfg.gradeLoadMult || CTRL_DEFAULTS.gradeLoadMult || 1.9;
  const flatRate = cfg.laborRate || CTRL_DEFAULTS.laborRate || 7200;
  const flat = () => ({ rate: flatRate, basis: "flat", label: "Általános óradíj", who: null });

  // (1) HR bér-kategória — a hozzárendelt dolgozóból
  if (basisCfg === "auto" || basisCfg === "grade") {
    const emp = (task && task.assignee && opts.empByName) ? opts.empByName(task.assignee) : null;
    if (emp) {
      const net = (emp.hourlyCost != null) ? emp.hourlyCost : (grades[emp.payGrade] || {}).rate;
      if (net) return { rate: Math.round(net * mult), basis: "grade",
        label: (grades[emp.payGrade] || {}).label || "Bér-kategória", who: emp.name, payGrade: emp.payGrade };
    }
    if (basisCfg === "grade") return flat(); // force-olt grade, de nincs dolgozó → átalány
  }

  // (2) Per-művelettípus
  if (basisCfg === "auto" || basisCfg === "kind") {
    const rates = cfg.kindRates || CTRL_KIND_RATES;
    const kr = task && rates[task.kind];
    if (kr) return { rate: kr, basis: "kind",
      label: ((typeof window !== "undefined" && window.PROD_KINDS) || {})[task.kind] && window.PROD_KINDS[task.kind].label || task.kind, who: null };
    if (basisCfg === "kind") return flat();
  }

  // (3) Átalány
  return flat();
}

// ── Fedezet / eltérés tónusok ──────────────────────────────────────────────
// fedezet-szint: jó / közepes / gyenge / veszteség
function ctrlMarginTone(pct) {
  if (pct == null) return { label: "—", pill: "bg-stone-100 text-stone-500 border-stone-200", dot: "bg-stone-400", bar: "bg-stone-400", fg: "text-stone-600" };
  if (pct < 0)    return { label: "Veszteséges", pill: "bg-rose-50 text-rose-700 border-rose-200",      dot: "bg-rose-500",    bar: "bg-rose-500",    fg: "text-rose-700" };
  if (pct < 0.15) return { label: "Gyenge",       pill: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-500",   bar: "bg-amber-500",   fg: "text-amber-700" };
  if (pct < 0.30) return { label: "Közepes",      pill: "bg-sky-50 text-sky-700 border-sky-200",         dot: "bg-sky-500",     bar: "bg-sky-500",     fg: "text-sky-700" };
  return                 { label: "Jó",           pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", bar: "bg-emerald-500", fg: "text-emerald-700" };
}
// eltérés (tény − terv): a túllépés ROSSZ (rose), a megtakarítás JÓ (emerald)
function ctrlVarianceTone(diff) {
  if (Math.abs(diff) < 1) return { pill: "bg-stone-100 text-stone-500 border-stone-200", fg: "text-stone-500", sign: "" };
  if (diff > 0)           return { pill: "bg-rose-50 text-rose-700 border-rose-200",     fg: "text-rose-700",   sign: "+" };
  return                       { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", fg: "text-emerald-700", sign: "−" };
}

const ctrlHuf = (n) => Math.round(Number(n) || 0).toLocaleString("hu-HU") + " Ft";
const ctrlHufM = (n) => { const v = (Number(n) || 0) / 1e6; return (Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)) + "M"; };
const ctrlPct = (x) => (x == null ? "—" : (x * 100).toFixed(0) + "%");

// ── Seed: kézi pót-/korrekciós tételek (a két aktív projekthez) ────────────
// scope: "project" (refId = projekt id). category: CTRL_CATEGORIES kulcs.
// plan / actual: Ft (a kézzel rögzített terv- ill. tény-összeg).
const CTRL_ADJ_SEED = [
  // PRJ-2026-014 — Petőfi u. 12. (Nagy Anna)
  { id: "adj-001", scope: "project", refId: "PRJ-2026-014", category: "munka",      label: "Szerelés + összeállítás (műhely-napló)", plan: 0,      actual: 285000, note: "Naplózott munkaóra (nincs automatikus időmérés)." },
  { id: "adj-002", scope: "project", refId: "PRJ-2026-014", category: "anyag",      label: "Pótrendelés — sérült fiókfront",         plan: 0,      actual: 42000,  note: "1 front csere a szállítási sérülés miatt." },
  { id: "adj-003", scope: "project", refId: "PRJ-2026-014", category: "beszallito", label: "Vasalat-számla (Blum) ráterhelés",        plan: 120000, actual: 128400, note: "A bejövő Blum-számla projektre osztott része." },
  // PRJ-2026-013 — Belváros Café
  { id: "adj-004", scope: "project", refId: "PRJ-2026-013", category: "munka",      label: "Szerelés (műhely-napló)",                 plan: 0,      actual: 210000, note: "Naplózott munkaóra." },
  { id: "adj-005", scope: "project", refId: "PRJ-2026-013", category: "bermunka",   label: "Élzárás bérmunka (Élzáró Mester)",        plan: 95000,  actual: 104000, note: "A kiadott élzárás tényleges díja." },
  { id: "adj-006", scope: "project", refId: "PRJ-2026-013", category: "anyag",      label: "Tölgy lapanyag — pótlás",                 plan: 0,      actual: 64000,  note: "Vágási hiba miatti pótlás." },
];

Object.assign(window, {
  CTRL_CATEGORIES, CTRL_CAT_ORDER, CTRL_DIRECT_CATS, CTRL_DEFAULTS,
  CTRL_KIND_RATES, CTRL_LABOR_BASIS, ctrlLaborRate,
  CTRL_ADJ_SEED, ctrlMarginTone, ctrlVarianceTone, ctrlHuf, ctrlHufM, ctrlPct,
});
