// ──────────────────────────────────────────────────────────────────────────
// FELADATAIM — közös, szerep-független személyes munkafelület (4.8-B1)
//
// FELELŐSSÉG: NEM új állapotgép — SZÁMÍTOTT aggregátor. A meglévő világok
// feladat-jellegű tételeit (gyártási feladat, CRM-feladat, QA-ellenőrzés,
// karbantartási munkalap, reklamáció-jegy, fuvar, raktári kivét/leltár,
// jóváhagyások) EGY személyes listába gyűjti, mindegyik a SAJÁT FSM-jét és
// otthonát megtartva. A „Feladataim" csak NÉZ és deep-linkel; a gyártási
// feladat detailje (idő-naplózás) a régi terminálból van újrahasználva.
// ──────────────────────────────────────────────────────────────────────────

const TASKS_TODAY = "2026-04-28";

// Forrás-meta: címke + ikon + akcent + a célvilág/képernyő (deep-link).
const TASK_SOURCES = {
  prod:        { key: "prod",        label: "Gyártás",       short: "Gyártás",  icon: "factory",  accent: "#0d9488", world: "production",  screen: "tasks" },
  crm:         { key: "crm",         label: "CRM / Értékesítés", short: "CRM",  icon: "route",    accent: "#2563eb", world: "crm",         screen: "tasks" },
  quality:     { key: "quality",     label: "Minőség",       short: "Minőség",  icon: "shield",   accent: "#65a30d", world: "quality",     screen: "inspections" },
  ehs:         { key: "ehs",         label: "Munkavédelem",  short: "EHS",      icon: "alert",    accent: "#e11d48", world: "ehs",         screen: "incidents" },
  maintenance: { key: "maintenance", label: "Karbantartás",  short: "Karbant.", icon: "wrench",   accent: "#0891b2", world: "maintenance", screen: "workorders" },
  service:     { key: "service",     label: "Reklamáció",    short: "Reklam.",  icon: "shield",   accent: "#e11d48", world: "service",     screen: "board" },
  logistics:   { key: "logistics",   label: "Logisztika",    short: "Logiszt.", icon: "truck",    accent: "#0284c7", world: "logistics",   screen: "schedule" },
  warehouse:   { key: "warehouse",   label: "Raktár",        short: "Raktár",   icon: "box",      accent: "#78716c", world: "warehouse",   screen: "withdrawals" },
  approval:    { key: "approval",    label: "Jóváhagyás",    short: "Jóváh.",   icon: "check",    accent: "#d97706", world: "procurement", screen: "rfq" },
  qreq:        { key: "qreq",        label: "Ajánlat-kérés (belső)", short: "Aj.-kérés", icon: "send", accent: "#e11d48", world: "interior", screen: "concepts" },
  brief:       { key: "brief",       label: "Tervezési brief", short: "Brief",   icon: "chat",    accent: "#7c3aed", world: "sales",       screen: "quotes" },
};
const TASK_SOURCE_ORDER = ["approval", "qreq", "brief", "prod", "crm", "quality", "ehs", "service", "logistics", "maintenance", "warehouse"];

// Prioritás-rang → tónus (a forrás-független megjelenítéshez).
const TASK_PRIO = {
  3: { label: "Sürgős",   pill: "bg-rose-50 text-rose-700 border-rose-200",   dot: "bg-rose-500" },
  2: { label: "Magas",    pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  1: { label: "Közepes",  pill: "bg-sky-50 text-sky-700 border-sky-200",       dot: "bg-sky-500" },
  0: { label: "Alacsony", pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" },
};

// Esedékesség-tónus a hátralévő napokból (SZÁMÍTOTT).
function taskDueTone(daysLeft) {
  if (daysLeft == null) return null;
  if (daysLeft < 0) return { label: `${Math.abs(daysLeft)} napja lejárt`, pill: "bg-rose-50 text-rose-700 border-rose-200", urgent: true };
  if (daysLeft === 0) return { label: "ma esedékes", pill: "bg-amber-50 text-amber-700 border-amber-200", urgent: true };
  if (daysLeft === 1) return { label: "holnap", pill: "bg-amber-50 text-amber-700 border-amber-200", urgent: false };
  return { label: `${daysLeft} nap`, pill: "bg-stone-50 text-stone-500 border-stone-200", urgent: false };
}

Object.assign(window, { TASKS_TODAY, TASK_SOURCES, TASK_SOURCE_ORDER, TASK_PRIO, taskDueTone });
