// ──────────────────────────────────────────────────────────────────────────
// DOKUMENTUMTÁR világ (DMS) — verziózott dokumentum-regiszter
//
// FELELŐSSÉG: a dokumentumok EGYETLEN, verziózott otthona. Minden más modul
// (Projektek / Rendelések / Katalógus / Ügyfelek) csak HIVATKOZIK egy
// dokumentumra — a metaadat + verzió ITT él, nincs szétszórt tárolás.
// (Prototípus: nincs valódi fájl-tartalom; a `fileLabel` jelképezi a fájlt.)
// Egy dokumentum (`sim.documents[]`) saját életciklus-FSM-mel.
// ──────────────────────────────────────────────────────────────────────────

const DOC_TODAY = "2026-04-28";

// ── Dokumentum-típusok ──────────────────────────────────────────────────────
const DOC_TYPE_META = {
  rajz:       { key: "rajz",       label: "Műszaki rajz",   short: "Rajz",        icon: "ruler",   accent: "#7c3aed", pill: "bg-violet-50 text-violet-700 border-violet-200" },
  szerzodes:  { key: "szerzodes",  label: "Szerződés",      short: "Szerződés",   icon: "file",    accent: "#0284c7", pill: "bg-sky-50 text-sky-700 border-sky-200" },
  tanusitvany:{ key: "tanusitvany",label: "Tanúsítvány",    short: "Tanúsítvány", icon: "shield",  accent: "#059669", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  utasitas:   { key: "utasitas",   label: "Munkautasítás",  short: "Utasítás",    icon: "layers",  accent: "#d97706", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  egyeb:      { key: "egyeb",      label: "Egyéb",          short: "Egyéb",       icon: "folder",  accent: "#78716c", pill: "bg-stone-100 text-stone-600 border-stone-200" },
};
const DOC_TYPE_ORDER = ["rajz", "szerzodes", "tanusitvany", "utasitas", "egyeb"];

// ── Életciklus-FSM ──────────────────────────────────────────────────────────
// piszkozat → ellenorzes → kiadott → archivalt   (visszairány: ellenorzes→piszkozat, kiadott→ellenorzes/archivalt)
const DOC_FLOW = {
  order: ["piszkozat", "ellenorzes", "kiadott", "archivalt"],
  states: {
    piszkozat:  { next: ["ellenorzes", "archivalt"] },
    ellenorzes: { next: ["kiadott", "piszkozat"] },
    kiadott:    { next: ["archivalt", "ellenorzes"] },
    archivalt:  { next: ["piszkozat"] },   // újranyitás új munkapéldányként
  },
};
const DOC_STATUS = {
  piszkozat:  { label: "Piszkozat",  pill: "bg-stone-100 text-stone-700 border-stone-200",     dot: "bg-stone-400" },
  ellenorzes: { label: "Ellenőrzés", pill: "bg-amber-50 text-amber-700 border-amber-200",      dot: "bg-amber-500" },
  kiadott:    { label: "Kiadott",    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",dot: "bg-emerald-500" },
  archivalt:  { label: "Archivált",  pill: "bg-stone-200 text-stone-500 border-stone-300",     dot: "bg-stone-400" },
};

// ── Kapcsolat-típusok (mihez tartozik a dokumentum) ─────────────────────────
const DOC_LINK_META = {
  project:  { key: "project",  label: "Projekt",  icon: "briefcase" },
  order:    { key: "order",    label: "Rendelés", icon: "orders" },
  catalog:  { key: "catalog",  label: "Cikkszám", icon: "box" },
  template: { key: "template", label: "Sablon",   icon: "ruler" },
  customer: { key: "customer", label: "Ügyfél",   icon: "user" },
  none:     { key: "none",     label: "Általános",icon: "folder" },
};
const DOC_LINK_ORDER = ["project", "order", "catalog", "template", "customer", "none"];

// ── Seed dokumentumok ───────────────────────────────────────────────────────
const DOCUMENTS_SEED = [
  { id: "DOC-2426-001", name: "Petőfi u. 12. — konyha kiviteli rajz", type: "rajz", version: 3, status: "kiadott",
    linkType: "project", linkId: "PRJ-2026-014", linkLabel: "Petőfi u. 12. — Konyha + nappali",
    owner: "Kovács Péter", updatedAt: "2026-04-22", fileLabel: "petofi-konyha-kiviteli-v3.pdf", note: "Jóváhagyott kiviteli terv, gyártásra kiadva.",
    history: [{ v: 1, at: "2026-03-30", note: "Első koncepció", status: "kiadott" }, { v: 2, at: "2026-04-12", note: "Ügyfél-módosítás: sziget", status: "kiadott" }, { v: 3, at: "2026-04-22", note: "Végleges méretek", status: "kiadott" }] },

  { id: "DOC-2426-002", name: "Bognár Bútor Kft. — keretszerződés 2026", type: "szerzodes", version: 1, status: "kiadott",
    linkType: "customer", linkId: "C-001", linkLabel: "Bognár Bútor Kft.",
    owner: "Szabó Anna", updatedAt: "2026-04-26", fileLabel: "bognar-keretszerzodes-2026.pdf", note: "Q2 sorozat-gyártás keretszerződés, aláírva.",
    history: [{ v: 1, at: "2026-04-26", note: "Aláírt példány", status: "kiadott" }] },

  { id: "DOC-2426-003", name: "FSC eredetigazolás — Falco bükk", type: "tanusitvany", version: 1, status: "kiadott",
    linkType: "catalog", linkId: "wh-001", linkLabel: "Bükk 18mm bútorlap",
    owner: "Tóth Kinga", updatedAt: "2026-04-10", fileLabel: "fsc-falco-buk-2026.pdf", note: "FSC® lánc-tanúsítvány, érvényes 2026 végéig.",
    history: [{ v: 1, at: "2026-04-10", note: "Beszállítótól kapott tanúsítvány", status: "kiadott" }] },

  { id: "DOC-2426-004", name: "Élzárás munkautasítás (ABS 2mm)", type: "utasitas", version: 2, status: "kiadott",
    linkType: "none", linkId: null, linkLabel: "Üzemi SOP",
    owner: "Kiss András", updatedAt: "2026-04-05", fileLabel: "sop-elzaras-abs2mm-v2.pdf", note: "Homag KAL 310 beállítások + hőfok-táblázat.",
    history: [{ v: 1, at: "2026-02-01", note: "Első kiadás", status: "kiadott" }, { v: 2, at: "2026-04-05", note: "PU ragasztó kiegészítés", status: "kiadott" }] },

  { id: "DOC-2426-005", name: "Belváros Café — pultsor kiviteli rajz", type: "rajz", version: 2, status: "ellenorzes",
    linkType: "project", linkId: "PRJ-2026-013", linkLabel: "Belváros Café — pultsor",
    owner: "Németh Zsófia", updatedAt: "2026-04-27", fileLabel: "belvaros-pult-kiviteli-v2.pdf", note: "Bárpult magasság módosítva, ellenőrzésre vár.",
    history: [{ v: 1, at: "2026-04-15", note: "Első kiviteli", status: "kiadott" }, { v: 2, at: "2026-04-27", note: "Pultmagasság 1100→1150", status: "ellenorzes" }] },

  { id: "DOC-2426-006", name: "Doorstar ajtó sorozat — gyártási rajz", type: "rajz", version: 2, status: "ellenorzes",
    linkType: "order", linkId: "JT-2426-0182", linkLabel: "Doorstar Hungary Zrt. — ajtók",
    owner: "Kovács Péter", updatedAt: "2026-04-27", fileLabel: "doorstar-ajto-gyartasi-v2.pdf", note: "v2 felülvizsgálat alatt — pánt-furat raszter módosítva. A CNC a kiadott v1-et futtatja kiadásig.",
    history: [{ v: 1, at: "2026-04-20", note: "Gyártásra kiadva", status: "kiadott" }, { v: 2, at: "2026-04-27", note: "Pánt-furat raszter 32→37mm — ellenőrzésre vár", status: "ellenorzes" }] },

  { id: "DOC-2426-009", name: "Bognár konyha — korpusz gyártási rajz", type: "rajz", version: 2, status: "kiadott",
    linkType: "order", linkId: "JT-2426-0184", linkLabel: "Bognár Bútor Kft. — 16-fiókos konyha",
    owner: "Kovács Péter", updatedAt: "2026-04-26", fileLabel: "bognar-konyha-korpusz-v2.pdf", note: "Korpusz + front, gyártásra kiadva. CNC-fúrás + élzárás adatokkal.",
    history: [{ v: 1, at: "2026-04-18", note: "Első gyártási rajz", status: "kiadott" }, { v: 2, at: "2026-04-26", note: "Fiókosztás finomítva", status: "kiadott" }] },

  { id: "DOC-2426-007", name: "Várdai Konyhastúdió — ajánlat melléklet", type: "egyeb", version: 1, status: "piszkozat",
    linkType: "customer", linkId: "C-002", linkLabel: "Várdai Konyhastúdió",
    owner: "Szabó Anna", updatedAt: "2026-04-28", fileLabel: "vardai-ajanlat-melleklet.pdf", note: "Anyagminta-lista az ajánlathoz, összeállítás alatt.",
    history: [{ v: 1, at: "2026-04-28", note: "Piszkozat", status: "piszkozat" }] },

  { id: "DOC-2426-008", name: "CE megfelelőségi nyilatkozat — vasalat", type: "tanusitvany", version: 1, status: "archivalt",
    linkType: "catalog", linkId: "wh-005", linkLabel: "Blum CLIP top csukópánt",
    owner: "Tóth Kinga", updatedAt: "2025-12-01", fileLabel: "ce-blum-clip-2025.pdf", note: "2025-ös évre, lejárt — 2026-os verzió külön dokumentum.",
    history: [{ v: 1, at: "2025-12-01", note: "2025-ös CE", status: "kiadott" }] },
];

// ──────────────────────────────────────────────────────────────────────────
// DocsEngine — tiszta számítások (FSM, statisztika)
// ──────────────────────────────────────────────────────────────────────────
const DocsEngine = {
  canGo(doc, to) { const st = DOC_FLOW.states[doc.status]; return !!(st && st.next.includes(to)); },
  nextStates(doc) { const st = DOC_FLOW.states[doc.status]; return st ? st.next.slice() : []; },
  isActive(doc) { return doc.status === "kiadott"; },
  // ── Futtatható (kiadott) verzió — a CNC/műhely EZT használja ──────────────
  // Visszaadja: { runVersion (a legújabb KIADOTT verziószám), clear (a jelenlegi
  // verzió is kiadott?), pending ({v,status} ha van ki nem adott újabb munka-
  // példány), blocked (nincs egyetlen kiadott verzió sem) }.
  runtimeVersion(doc) {
    if (!doc) return null;
    if (doc.status === "kiadott") return { runVersion: doc.version, clear: true, pending: null, blocked: false };
    const rel = (doc.history || []).filter((h) => h.status === "kiadott").sort((a, b) => b.v - a.v)[0];
    return { runVersion: rel ? rel.v : null, clear: false, pending: { v: doc.version, status: doc.status }, blocked: !rel };
  },
  stats(list) {
    const all = list || [];
    return {
      total: all.length,
      kiadott: all.filter((d) => d.status === "kiadott").length,
      ellenorzes: all.filter((d) => d.status === "ellenorzes").length,
      piszkozat: all.filter((d) => d.status === "piszkozat").length,
    };
  },
};

Object.assign(window, {
  DOC_TODAY, DOC_TYPE_META, DOC_TYPE_ORDER, DOC_FLOW, DOC_STATUS,
  DOC_LINK_META, DOC_LINK_ORDER, DOCUMENTS_SEED, DocsEngine,
});
