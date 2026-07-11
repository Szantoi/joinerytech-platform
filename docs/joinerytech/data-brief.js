// ──────────────────────────────────────────────────────────────────────────
// data-brief.js — TERVEZÉSI BRIEF (igény-információ) konstansok + motor.
//
//   A "tervezett bútor" mögötti igény-információ EGYETLEN, verziózott otthona.
//   Két szint (mindkettő ugyanaz a modell, `scope` különbözteti meg):
//     • scope:"quote" — ajánlat-szintű ÁLTALÁNOS brief (egy az ajánlatra)
//     • scope:"line"  — bútoronkénti RÉSZLETES brief (a TERV-tételhez kötve)
//
//   A brief eljut a tervezőkhöz (Belsőépítészet koncepció + Műszaki munkalap),
//   kérdés-válasz CIKLUSBAN gazdagodik (bárki kérdez/válaszol), minden módosítás
//   NAPLÓZVA, és a projektbe is átmegy (másolat-snapshot + élő link).
//
//   SZÁMÍTOTT mezőket SOHA ne tárolj — mindig a BriefEngine-ből olvasd.
// ──────────────────────────────────────────────────────────────────────────

// Strukturált szöveges mezők (a szabad jegyzet helyett kategorizálva).
const BRIEF_FIELDS = [
  { key: "func",    label: "Funkció / használat",        icon: "user",    ph: "Mit kell tudnia? Tárolás, funkciók, kényelmi és helyszíni igények…" },
  { key: "site",    label: "Helyszíni kötöttségek",      icon: "ruler",   ph: "Méret, fal, gépészet, kürtő, nyílászárók, csatlakozások, ferde plafon…" },
  { key: "style",   label: "Stílus / anyag / szín",      icon: "drop",    ph: "Stílusirány, preferált anyagok, színek, felületek, fogantyú-elképzelés…" },
  { key: "users",   label: "Felhasználók / kontextus",   icon: "user",    ph: "Kik használják? Háztartás mérete, szokások, gyerek / idős / állat…" },
  { key: "special", label: "Speciális igények",          icon: "sparkle", ph: "Gyerekbarát, akadálymentes, allergia, könnyű tisztíthatóság, akusztika…" },
];

// A briefek azonosító-előtagja.
const BRIEF_PREFIX = "BRF";

// HIERARCHIA — a brief ugyanúgy fa, mint a bútor-jelölés:
//   ajánlat (gyökér) → helyszín → terület → helyiség (tér) → bútor → bútor elem
//   Minden szint ugyanaz a modell; `scope` + `parentBriefId` adja a fát.
//   Skálafüggetlen: kis munkánál elég ajánlat→bútor; nagynál a teljes lánc.
const BRIEF_SCOPES = {
  quote:     { key: "quote",     label: "Ajánlat",   icon: "briefcase",  level: 0, child: "site" },
  site:      { key: "site",      label: "Helyszín",  icon: "storefront", level: 1, child: "area" },
  area:      { key: "area",      label: "Terület",   icon: "layers",     level: 2, child: "room" },
  room:      { key: "room",      label: "Helyiség",  icon: "box",        level: 3, child: "furniture" },
  furniture: { key: "furniture", label: "Bútor",     icon: "cube",       level: 4, child: "part" },
  part:      { key: "part",      label: "Bútor elem", icon: "cpu",       level: 5, child: null },
};
const BRIEF_SCOPE_ORDER = ["quote", "site", "area", "room", "furniture", "part"];
function briefChildScope(scope) { return (BRIEF_SCOPES[scope] || {}).child || null; }

// Kérdés-válasz FSM: nyitott → megválaszolt → lezárt (vissza is léphet).
const BRIEF_Q_STATUS = {
  nyitott:      { label: "Nyitott",      pill: "bg-rose-50 text-rose-700 border-rose-200",       dot: "bg-rose-500" },
  megvalaszolt: { label: "Megválaszolt", pill: "bg-amber-50 text-amber-700 border-amber-200",     dot: "bg-amber-500" },
  lezart:       { label: "Lezárt",       pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};
const BRIEF_Q_FLOW = {
  nyitott:      ["megvalaszolt", "lezart"],
  megvalaszolt: ["lezart", "nyitott"],
  lezart:       ["nyitott"],
};

// Napló-bejegyzés típus → címke/ikon (megjelenítéshez).
const BRIEF_LOG_META = {
  create: { label: "Létrehozva",   icon: "plus" },
  field:  { label: "Mező módosítva", icon: "ruler" },
  budget: { label: "Költségkeret",  icon: "receipt" },
  deadline: { label: "Határidő",    icon: "bell" },
  ref:    { label: "Hivatkozás",    icon: "paperclip" },
  q:      { label: "Kérdés",        icon: "chat" },
  a:      { label: "Válasz",        icon: "send" },
  qstatus: { label: "Kérdés-státusz", icon: "check" },
  handoff: { label: "Átadás",       icon: "arrow-right" },
};

const BriefEngine = {
  // Hány strukturált mező van kitöltve (a 8 ellenőrzésből) + arány.
  completeness(b) {
    if (!b) return { filled: 0, total: 8, pct: 0, ready: false };
    const f = b.fields || {};
    const checks = [
      !!String(f.func || "").trim(),
      !!String(f.site || "").trim(),
      !!String(f.style || "").trim(),
      !!String(f.users || "").trim(),
      !!String(f.special || "").trim(),
      !!(f.budgetMin || f.budgetMax),
      !!String(f.deadline || "").trim(),
      (b.refs || []).length > 0,
    ];
    const filled = checks.filter(Boolean).length;
    return { filled, total: checks.length, pct: Math.round((filled / checks.length) * 100), ready: this.minimumReady(b) };
  },
  // A tervezés-indítás minimuma: funkció + helyszín + stílus.
  minimumReady(b) {
    const f = (b && b.fields) || {};
    return ["func", "site", "style"].every((k) => String(f[k] || "").trim());
  },
  openQuestions(b) { return ((b && b.questions) || []).filter((q) => q.status === "nyitott"); },
  questionCount(b) { return ((b && b.questions) || []).length; },
  qCanGo(from, to) { return (BRIEF_Q_FLOW[from] || []).includes(to); },
  budgetLabel(b) {
    const f = (b && b.fields) || {};
    const fmt = (n) => Math.round(n).toLocaleString("hu-HU") + " Ft";
    if (f.budgetMin && f.budgetMax) return `${fmt(f.budgetMin)} – ${fmt(f.budgetMax)}`;
    if (f.budgetMax) return `max. ${fmt(f.budgetMax)}`;
    if (f.budgetMin) return `min. ${fmt(f.budgetMin)}`;
    return null;
  },
};

Object.assign(window, { BRIEF_FIELDS, BRIEF_PREFIX, BRIEF_SCOPES, BRIEF_SCOPE_ORDER, briefChildScope, BRIEF_Q_STATUS, BRIEF_Q_FLOW, BRIEF_LOG_META, BriefEngine });
