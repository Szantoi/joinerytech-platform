// ──────────────────────────────────────────────────────────────────────────
// data-interior.js — Belsőépítészet / Koncepció világ törzsadata.
//
// A koncepció a projekt STÍLUS-gerince: igényfelmérésből kibontott
// koncepció, amit a belsőépítész helyiségekre bont, változatokban (A/B/C)
// és verziókban (V1→V2) dolgoz ki, moodboardokkal és strukturált
// választásokkal (anyag / szín / fogantyú / burkolat — katalógusból), és
// összefogja a többi szakág TERVÉT (burkolás, festés, villany).
//
// Kapcsolatok: projectRef → a Projektek világ szakág-koordinációja;
// createQuoteFromConcept → a meglévő quote-lánc (Értékesítés).
//
// Státusz-FSM (koncepció): brief → concept → review → approved → handoff
//   (mellék: bármelyikből → archived). A tiltott átmenetek a UI-ban LEZÁRT
//   gombok (disabled + tooltip), nem rejtettek.
// ──────────────────────────────────────────────────────────────────────────

// Koncepció státusz-lánc (FSM) ─────────────────────────────────────────────
const CONCEPT_FLOW = {
  brief:    { next: ["concept"],            label: "Brief" },
  concept:  { next: ["review"],             label: "Koncepció" },
  review:   { next: ["approved", "concept"],label: "Egyeztetés" },
  approved: { next: ["handoff"],            label: "Jóváhagyva" },
  handoff:  { next: [],                     label: "Átadva" },
  archived: { next: [],                     label: "Archivált" },
};
const CONCEPT_TONE = {
  brief:    { bg: "bg-stone-100",   fg: "text-stone-700",   dot: "bg-stone-400",   label: "Brief" },
  concept:  { bg: "bg-rose-50",     fg: "text-rose-700",    dot: "bg-rose-500",    label: "Koncepció" },
  review:   { bg: "bg-amber-50",    fg: "text-amber-700",   dot: "bg-amber-500",   label: "Egyeztetés" },
  approved: { bg: "bg-emerald-50",  fg: "text-emerald-700", dot: "bg-emerald-500", label: "Jóváhagyva" },
  handoff:  { bg: "bg-violet-50",   fg: "text-violet-700",  dot: "bg-violet-500",  label: "Átadva gyártásnak" },
  archived: { bg: "bg-stone-50",    fg: "text-stone-400",   dot: "bg-stone-300",   label: "Archivált" },
};
// A koncepcióból ajánlat a `concept` állapottól indítható (a brief még nem)
function conceptQuoteReady(status) { return ["concept", "review", "approved", "handoff"].includes(status); }
function conceptNextStatuses(status) { return (CONCEPT_FLOW[status] || { next: [] }).next; }

// Szakág-terv meta + státusz ───────────────────────────────────────────────
const INTERIOR_TRADE_META = {
  burkolas: { hu: "Burkolás",       icon: "layers", accent: "amber",   blurb: "Burkolatkiosztás, fugaterv, anyagmennyiség" },
  festes:   { hu: "Festés",         icon: "drop",   accent: "rose",    blurb: "Falfelületek RAL színkóddal, mennyiség" },
  villany:  { hu: "Villanyszerelés",icon: "bolt",   accent: "amber",   blurb: "Kapcsoló / konnektor / lámpakiállás pozíciók" },
  burkolo_anyag: { hu: "Burkolóanyag", icon: "box", accent: "stone", blurb: "" },
};
const TRADEPLAN_TONE = {
  draft:       { bg: "bg-stone-100",  fg: "text-stone-600",   dot: "bg-stone-400",   label: "Vázlat" },
  in_progress: { bg: "bg-sky-50",     fg: "text-sky-700",     dot: "bg-sky-500",     label: "Egyeztetés alatt" },
  ready:       { bg: "bg-emerald-50", fg: "text-emerald-700", dot: "bg-emerald-500", label: "Kész terv" },
  approved:    { bg: "bg-violet-50",  fg: "text-violet-700",  dot: "bg-violet-500",  label: "Kivitelezésre kész" },
};
const TRADEPLAN_FLOW = { draft: ["in_progress"], in_progress: ["ready", "draft"], ready: ["approved", "in_progress"], approved: [] };

// ── Belsőépítész DÍJAZÁS — a tervező maga határozza meg a díját ─────────────
// Négy mód közül választ projektenként: m² alap, óradíj, érték-arányos, fix átalány.
// NINCS kereskedelmi árrés / partner-kedvezmény: ez tervezési (szellemi) díj.
const FEE_METHODS = {
  m2:     { hu: "m² alapú",      sub: "Ft/m² × alapterület",        icon: "ruler",     accent: "rose"   },
  hourly: { hu: "Óradíj",        sub: "Ft/óra × becsült órák",      icon: "briefcase", accent: "amber"  },
  value:  { hu: "Érték-arányos", sub: "a helyiségek értékének %-a",  icon: "sparkle",   accent: "violet" },
  flat:   { hu: "Fix átalány",   sub: "egyösszegű tervezési díj",   icon: "box",       accent: "stone"  },
};
const FEE_METHOD_ORDER = ["m2", "hourly", "value", "flat"];
function feeMethodLabel(method) { return (FEE_METHODS[method] || {}).hu || "—"; }

// A koncepció alapterülete (a megadott vagy a helyiségekből számolt)
function conceptArea(concept) {
  return Number(concept.area) || (concept.rooms || []).reduce((n, r) => n + (Number(r.area) || 0), 0);
}
// A helyiségek becsült kivitelezési ÖSSZÉRTÉKE — az érték-arányos díj alapja
function conceptProjectValue(concept) {
  return (concept.rooms || []).reduce((n, r) => n + (Number(r.value) || 0), 0);
}
// A tervezési díj a választott mód szerint
function conceptFeeAmount(concept) {
  const f = concept.fee || {};
  switch (f.method) {
    case "m2":     return Math.round(conceptArea(concept) * (Number(f.m2Rate) || 0));
    case "hourly": return Math.round((Number(f.hours) || 0) * (Number(f.hourlyRate) || 0));
    case "value":  return Math.round(conceptProjectValue(concept) * (Number(f.valuePct) || 0) / 100);
    case "flat":   return Math.round(Number(f.flatAmount) || 0);
    default:       return 0;
  }
}
// Rövid, ember-olvasható számítási képlet a kiválasztott módhoz
function conceptFeeBasis(concept) {
  const f = concept.fee || {};
  const fmt = (n) => (window.fmtHUF ? window.fmtHUF(n) : String(n));
  switch (f.method) {
    case "m2":     return `${conceptArea(concept)} m² × ${fmt(Number(f.m2Rate) || 0)}`;
    case "hourly": return `${Number(f.hours) || 0} óra × ${fmt(Number(f.hourlyRate) || 0)}`;
    case "value":  return `${fmt(conceptProjectValue(concept))} × ${Number(f.valuePct) || 0}%`;
    case "flat":   return "egyösszegű átalány";
    default:       return "—";
  }
}
const FEE_DEFAULT = { method: "m2", m2Rate: 12000, hours: 40, hourlyRate: 9000, valuePct: 12, flatAmount: 600000 };

// ── Katalógus LÁTHATÓSÁG — a világok / partnerek közötti megosztás alapja ───
// A katalógus INFORMÁCIÓS (nem kereskedelmi): a közös törzsadat (pl. „Egger
// Halifax tölgy") minden világban látszik, de a saját beszerzési ár/forrás
// privát marad. private = csak a saját cég; protected = megosztott partnerek
// (ár nélkül); public = közös törzsadat, minden világ látja.
const INT_VISIBILITY = {
  private:   { hu: "Privát",   blurb: "Csak a saját cég látja",                 icon: "lock",       bg: "bg-stone-100",  fg: "text-stone-600",   dot: "bg-stone-400"   },
  protected: { hu: "Védett",   blurb: "Megosztott partnerek látják — beszerzési ár nélkül", icon: "user", bg: "bg-amber-50", fg: "text-amber-700", dot: "bg-amber-500" },
  public:    { hu: "Publikus", blurb: "Közös törzsadat — minden világ látja",     icon: "storefront", bg: "bg-emerald-50", fg: "text-emerald-700", dot: "bg-emerald-500" },
};
const INT_VIS_ORDER = ["private", "protected", "public"];

// Katalógus-szerű választékok (a választás "katalógusból" történik) ─────────
// Fogantyúk — a Vasalat katalógus „Fogantyú" típusából
const HANDLE_CATALOG_INT = [
  { code: "VS-PUSH-00", name: "Push-to-open (fogantyú nélkül)", brand: "Blum", finish: "—",        price: 2400,  swatch: "#e7e2d8" },
  { code: "VS-RUD-160",  name: "Rúdfogantyú 160mm",            brand: "Hettich", finish: "Matt fekete", price: 3200, swatch: "#26242227" },
  { code: "VS-RUD-320",  name: "Rúdfogantyú 320mm",            brand: "Hettich", finish: "Szálcsiszolt inox", price: 4100, swatch: "#b9bcc0" },
  { code: "VS-PROF-J",   name: "J-profil maró (rejtett)",      brand: "Egyedi",  finish: "Anyagszínű", price: 1800, swatch: "#cdbfa6" },
  { code: "VS-GOMB-BR",  name: "Gombfogantyú Ø30",             brand: "Viefe",   finish: "Antik réz",  price: 2900, swatch: "#a9824f" },
  { code: "VS-KAGYLO",   name: "Kagylófogantyú (süllyesztett)",brand: "Viefe",   finish: "Bronz",      price: 3400, swatch: "#7d5a3a" },
];
// Korpusz / front anyagminták (a stílus tölti ki a {slot}-okat)
const MATERIAL_SWATCHES = [
  { code: "EG-H1334",  name: "Tölgy Halifax natúr",  kind: "Furnérhatású lap", color: "#c9a878" },
  { code: "EG-W1000",  name: "Prémium fehér matt",   kind: "Melamin",          color: "#f1ece4" },
  { code: "EG-U999",   name: "Antracit matt",        kind: "Melamin",          color: "#2c2b29" },
  { code: "EG-H3192",  name: "Dió Pacific",          kind: "Furnérhatású lap", color: "#6f4a32" },
  { code: "EG-U727",   name: "Zsálya zöld matt",     kind: "Melamin",          color: "#8a917e" },
  { code: "EG-F637",   name: "Beton világos",        kind: "Kőhatású lap",     color: "#b9b4ab" },
  { code: "EG-U960",   name: "Mélyfekete",           kind: "Melamin",          color: "#1a1917" },
  { code: "TL-OIL",    name: "Tömör tölgy olajozott",kind: "Tömörfa",          color: "#b3895a" },
];
// Burkolat katalógus
const TILE_CATALOG_INT = [
  { code: "BR-TER-15", name: "Terrazzo 60×60",      finish: "Matt",   color: "#d8d2c6", grout: "#cfc8ba", price: 9800 },
  { code: "BR-HEX-WH", name: "Hatszög fehér 20×23", finish: "Fényes", color: "#eee9e1", grout: "#d8cfc0", price: 7200 },
  { code: "BR-MET-AN", name: "Metró antracit 7,5×15",finish: "Matt",  color: "#33312e", grout: "#9a948a", price: 6400 },
  { code: "BR-OAK-LP", name: "Tölgy-hatású lap 20×120",finish:"Matt", color: "#c2a47b", grout: "#b6a98a", price: 8900 },
  { code: "BR-MIK-GR", name: "Mikrocement greige",  finish: "Selyem", color: "#b4aa99", grout: "#b4aa99", price: 11200 },
];
// RAL festék paletta
const RAL_PALETTE = [
  { ral: "RAL 9010", name: "Tiszta fehér",   color: "#f1f0ea" },
  { ral: "RAL 9016", name: "Közlekedésfehér",color: "#f4f6f6" },
  { ral: "RAL 7044", name: "Selyemszürke",   color: "#b8b3a6" },
  { ral: "RAL 7016", name: "Antracitszürke", color: "#383e42" },
  { ral: "RAL 6021", name: "Halványzöld",    color: "#89a07a" },
  { ral: "RAL 1019", name: "Szürkésbézs",    color: "#a48f74" },
  { ral: "RAL 5008", name: "Szürkéskék",     color: "#31363b" },
];

// ── Koncepciók (seed) ──────────────────────────────────────────────────────
const CONCEPTS_SEED = [
  {
    id: "KON-2026-014",
    name: "Petőfi u. 12. — Skandináv otthon",
    projectRef: "PRJ-2026-014",
    customer: "Nagy Anna",
    designer: "Lakberendezés Plusz",
    status: "review",
    created: "2026-04-19",
    area: 78,
    brief: "Világos, meleg, természetes anyagok. Nyitott konyha-nappali, sok tárolás rejtett fogantyúkkal. Gyerekbarát, könnyen tisztítható felületek.",
    floorplanSlot: "ifp-KON-2026-014",
    rooms: [
      { id: "r-elo", name: "Előszoba",  area: 8,  value: 1_250_000, note: "Beépített gardrób, tükör" },
      { id: "r-kon", name: "Konyha",    area: 14, value: 3_600_000, note: "L-alakú, sziget nélkül" },
      { id: "r-nap", name: "Nappali",   area: 30, value: 4_200_000, note: "Konyhával egy légtér, TV-fal" },
      { id: "r-hal", name: "Hálószoba", area: 16, value: 2_400_000, note: "Ágy mögötti tárolófal" },
      { id: "r-fur", name: "Fürdő",     area: 6,  value: 1_650_000, note: "Zuhanyzó, mosdópult" },
    ],
    fee: { method: "m2", m2Rate: 13000, hours: 56, hourlyRate: 9500, valuePct: 12, flatAmount: 980000 },
    selectedVariantId: "v-a",
    variants: [
      {
        id: "v-a", label: "A — Meleg minimál", version: 2, selected: true,
        summary: "Tölgy furnérhatás + törtfehér, zsálya akcentfal, rejtett fogantyúk.",
        palette: ["#c9a878", "#f1ece4", "#8a917e", "#6f4a32"],
        bodyMat: "EG-W1000", frontMat: "EG-H1334", handle: "VS-PROF-J", tile: "BR-TER-15", paint: "RAL 9010",
        moodSlots: 4,
        history: [
          { v: 1, date: "2026-04-19", note: "Első koncepció — tölgy + fehér" },
          { v: 2, date: "2026-04-24", note: "Zsálya akcentfal hozzáadva, sziget elhagyva" },
        ],
      },
      {
        id: "v-b", label: "B — Matt antracit", version: 1, selected: false,
        summary: "Antracit matt frontok, dió pult, réz fogantyúk — kontrasztos, elegáns.",
        palette: ["#2c2b29", "#a9824f", "#6f4a32", "#b9b4ab"],
        bodyMat: "EG-U999", frontMat: "EG-U999", handle: "VS-GOMB-BR", tile: "BR-MET-AN", paint: "RAL 7016",
        moodSlots: 4,
        history: [ { v: 1, date: "2026-04-22", note: "Alternatív sötét irány bemutatásra" } ],
      },
    ],
    trades: [
      { id: "tp-1", trade: "burkolas", title: "Burkolatkiosztás", party: "Burkoló Stúdió Kft.", due: "2026-05-20", status: "in_progress", planSlot: "itp-KON-2026-014-burk",
        rooms: [
          { room: "Konyha",  tile: "BR-TER-15", area: 6,  layout: "Csempe a munkapult mögött, padló laminált" },
          { room: "Fürdő",   tile: "BR-HEX-WH", area: 12, layout: "Fal + padló, zuhanyzóban dőlés a folyókához" },
          { room: "Előszoba",tile: "BR-TER-15", area: 8,  layout: "Padló, lábazat 10cm" },
        ] },
      { id: "tp-2", trade: "festes", title: "Festési terv (RAL)", party: "Színes Falak Bt.", due: "2026-05-25", status: "draft", planSlot: "itp-KON-2026-014-fest",
        rooms: [
          { room: "Nappali",  surface: "Falak",     ral: "RAL 9010", note: "Akcentfal a TV mögött RAL 6021" },
          { room: "Nappali",  surface: "Akcentfal",  ral: "RAL 6021", note: "Zsálya, matt" },
          { room: "Hálószoba",surface: "Falak",     ral: "RAL 1019", note: "Meleg bézs" },
          { room: "Mennyezet",surface: "Mennyezet",  ral: "RAL 9016", note: "Egységes az egész lakásban" },
        ] },
      { id: "tp-3", trade: "villany", title: "Erősáram kiosztás", party: "VoltÁram Kft.", due: "2026-05-18", status: "in_progress", planSlot: "itp-KON-2026-014-vill",
        rooms: [
          { room: "Konyha",  points: [ { type: "Konnektor", count: 6, note: "Munkapult fölött 4 + sziget 2" }, { type: "Kapcsoló", count: 2, note: "Belépő + pult-világítás" }, { type: "Lámpakiállás", count: 3, note: "Sín + pult LED" } ] },
          { room: "Nappali", points: [ { type: "Konnektor", count: 8, note: "TV-fal 4, kanapé mellett 4" }, { type: "Kapcsoló", count: 3, note: "Váltó a két bejáratnál" }, { type: "Lámpakiállás", count: 2, note: "Mennyezeti + állólámpa" } ] },
          { room: "Hálószoba",points: [ { type: "Konnektor", count: 4, note: "Ágy két oldalán USB-vel" }, { type: "Kapcsoló", count: 2, note: "Ágy melletti olvasólámpa" } ] },
        ] },
    ],
    quoteRef: null,
    items: [
      { id: "li-1", productId: "ip-001", name: "Alsószekrény — tölgy front 60", room: "Konyha",    unit: "fm", qty: 4.2, note: "L-alak" },
      { id: "li-2", productId: "ip-002", name: "Felsőszekrény — matt fehér",    room: "Konyha",    unit: "fm", qty: 3.0, note: "" },
      { id: "li-3", productId: "ip-010", name: "Tolóajtós gardrób — tölgy",     room: "Előszoba",  unit: "m²", qty: 3.6, note: "Mennyezetig" },
      { id: "li-4", productId: "ip-031", name: "Könyvespolc-fal — egyedi",      room: "Nappali",   unit: "db", qty: 1,   note: "TV-fal mellé" },
    ],
  },
  {
    id: "KON-2026-013",
    name: "Belváros Café — ipari koncepció",
    projectRef: "PRJ-2026-013",
    customer: "Belváros Café",
    designer: "Lakberendezés Plusz",
    status: "approved",
    created: "2026-04-11",
    area: 95,
    brief: "Nyers ipari hangulat, tartós felületek nagy forgalomhoz. Egyedi pultsor, látvány-háttérfal, meleg fapad-szegélyek a vendégtérben.",
    floorplanSlot: "ifp-KON-2026-013",
    rooms: [
      { id: "rc-ven", name: "Vendégtér", area: 60, value: 9_800_000, note: "32 fő, pad + asztal kombináció" },
      { id: "rc-pul", name: "Pultsor",   area: 12, value: 6_400_000, note: "Kávégép-sor, hűtőpult, kassza" },
      { id: "rc-mos", name: "Mosdó",     area: 8,  value: 2_100_000, note: "2 fülke + akadálymentes" },
      { id: "rc-rak", name: "Raktár",    area: 15, value: 1_900_000, note: "Polcrendszer, mosogató" },
    ],
    fee: { method: "value", m2Rate: 12000, hours: 80, hourlyRate: 11000, valuePct: 10, flatAmount: 1_400_000 },
    selectedVariantId: "vc-a",
    variants: [
      {
        id: "vc-a", label: "A — Nyers ipari", version: 3, selected: true,
        summary: "Beton-hatás, fekete acél, tölgy pultlap — látszó szerelvények.",
        palette: ["#b9b4ab", "#1a1917", "#b3895a", "#a9824f"],
        bodyMat: "EG-F637", frontMat: "EG-U960", handle: "VS-RUD-320", tile: "BR-MET-AN", paint: "RAL 7016",
        moodSlots: 4,
        history: [
          { v: 1, date: "2026-04-11", note: "Alapkoncepció — beton + fekete" },
          { v: 2, date: "2026-04-16", note: "Tölgy pultlap melegítésként" },
          { v: 3, date: "2026-04-23", note: "Réz akcentek a háttérfalon — jóváhagyva" },
        ],
      },
      {
        id: "vc-b", label: "B — Meleg bisztró", version: 1, selected: false,
        summary: "Zöld lambéria, sárgaréz, terrazzo padló — lágyabb, otthonosabb.",
        palette: ["#89a07a", "#a9824f", "#d8d2c6", "#6f4a32"],
        bodyMat: "EG-U727", frontMat: "EG-U727", handle: "VS-KAGYLO", tile: "BR-TER-15", paint: "RAL 6021",
        moodSlots: 4,
        history: [ { v: 1, date: "2026-04-18", note: "Alternatív meleg irány" } ],
      },
    ],
    trades: [
      { id: "tpc-1", trade: "burkolas", title: "Burkolatkiosztás", party: "Burkoló Stúdió Kft.", due: "2026-05-08", status: "approved", planSlot: "itp-KON-2026-013-burk",
        rooms: [
          { room: "Vendégtér", tile: "BR-MET-AN", area: 18, layout: "Pultsor háttérfal metró csempe, padló mikrocement" },
          { room: "Mosdó",     tile: "BR-HEX-WH", area: 16, layout: "Fal + padló teljesen burkolt" },
        ] },
      { id: "tpc-2", trade: "festes", title: "Festési terv (RAL)", party: "Színes Falak Bt.", due: "2026-05-10", status: "ready", planSlot: "itp-KON-2026-013-fest",
        rooms: [
          { room: "Vendégtér", surface: "Falak",    ral: "RAL 7044", note: "Selyemszürke, kopásálló" },
          { room: "Vendégtér", surface: "Lambéria", ral: "RAL 6021", note: "Csak a B változatban" },
          { room: "Mennyezet", surface: "Mennyezet", ral: "RAL 7016", note: "Látszó gépészet feketén" },
        ] },
      { id: "tpc-3", trade: "villany", title: "Erősáram + gyengeáram", party: "VoltÁram Kft.", due: "2026-05-05", status: "approved", planSlot: "itp-KON-2026-013-vill",
        rooms: [
          { room: "Pultsor",   points: [ { type: "Konnektor", count: 10, note: "Kávégép, daráló, hűtőpult dedikált körök" }, { type: "Kapcsoló", count: 3, note: "Pult-világítás zónák" }, { type: "Lámpakiállás", count: 5, note: "Sínrendszer a pult fölött" } ] },
          { room: "Vendégtér", points: [ { type: "Konnektor", count: 6, note: "Fal menti, takarítógéphez" }, { type: "Lámpakiállás", count: 8, note: "Függeszték asztalonként" } ] },
        ] },
    ],
    quoteRef: "Q-2426-054",
    items: [
      { id: "lic-1", productId: "ip-003", name: "Konyhasziget — kőhatású munkalap", room: "Pultsor",   unit: "db", qty: 1,   note: "Kávégép-sor" },
      { id: "lic-2", productId: "ip-040", name: "Tölgy lamella falpanel",          room: "Vendégtér", unit: "m²", qty: 12,  note: "Háttérfal" },
      { id: "lic-3", productId: "ip-030", name: "Étkezőasztal — tömör tölgy 200",   room: "Vendégtér", unit: "db", qty: 6,   note: "Pad-kombináció" },
    ],
  },
];

// ── Belsőépítész INFORMÁCIÓS katalógus — típusok + termékek/minták ─────────
// NEM kereskedelmi: nincs eladási ár / árrés. A cél az ALKOTÁS támogatása —
// beszerzési ár, beszerzési forrás, megjegyzések, láthatóság (megosztás).
// (NÉVÜTKÖZÉS-TILALOM: a gyártási katalógus addCategory/addCatalogItem-et használ.)
const INT_TYPES_SEED = [
  { id: "it-konyha",   name: "Konyhabútor",        icon: "box",     color: "#a8703a", unit: "fm",  blurb: "Szekrénysorok folyóméterben" },
  { id: "it-gardrob",  name: "Gardrób / beépített", icon: "layers",  color: "#5b8a72", unit: "m²",  blurb: "Beépített tárolók homlokfelület szerint" },
  { id: "it-furdo",    name: "Fürdőszobabútor",     icon: "drop",    color: "#2f7d8c", unit: "db",  blurb: "Mosdópult, tükrös szekrény" },
  { id: "it-egyedi",   name: "Egyedi bútor",        icon: "sparkle", color: "#8a5a2b", unit: "db",  blurb: "Asztal, polc, egyedi darab" },
  { id: "it-burkolat", name: "Burkolat / falpanel", icon: "layers",  color: "#6b7280", unit: "m²",  blurb: "Dekorpanel, lambéria" },
  { id: "it-anyag",    name: "Alapanyag / minta",   icon: "layers",  color: "#9a8c5a", unit: "m²",  blurb: "Közös lap- és anyagminták (megosztott)" },
];
// purchasePrice = beszerzési ár (privát), source = beszerzési forrás, notes = megjegyzés,
// visibility = private | protected | public (megosztás a világok / partnerek között).
const INT_PRODUCTS_SEED = [
  // Közös alapanyag-minták — publikus törzsadat (pl. „Egger Halifax tölgy")
  { id: "ip-100", typeId: "it-anyag", code: "EG-H1334", name: "Egger Halifax tölgy natúr", desc: "H1334 ST9 — furnérhatású bútorlap, 18mm", unit: "m²", purchasePrice: 9800,  source: "Egger / Forest Hungary", notes: "Közös referencia minden világnak", visibility: "public", color: "#c9a878", tags: ["egger", "tölgy", "lap"], sampleSlot: "ipsmpl-ip-100" },
  { id: "ip-101", typeId: "it-anyag", code: "EG-W1000", name: "Egger Prémium fehér matt", desc: "W1000 PM — melamin bútorlap, 18mm", unit: "m²", purchasePrice: 7200, source: "Egger / Forest Hungary", notes: "", visibility: "public", color: "#f1ece4", tags: ["egger", "fehér"], sampleSlot: "ipsmpl-ip-101" },
  // Konyhabútor
  { id: "ip-001", typeId: "it-konyha",   code: "KO-AL-T60", name: "Alsószekrény — tölgy front 60", desc: "18mm korpusz, tölgy furnérhatású front, push-to-open", unit: "fm", purchasePrice: 64000,  source: "Saját gyártás",          notes: "Vasalat: Blum",        visibility: "private",   color: "#c9a878", tags: ["tölgy", "alsó"],  sampleSlot: "ipsmpl-ip-001" },
  { id: "ip-002", typeId: "it-konyha",   code: "KO-FE-MF", name: "Felsőszekrény — matt fehér",    desc: "Bukó-pántos, fehér matt front",            unit: "fm", purchasePrice: 48000,  source: "Saját gyártás",          notes: "",                   visibility: "private",   color: "#f1ece4", tags: ["fehér", "felső"], sampleSlot: "ipsmpl-ip-002" },
  { id: "ip-003", typeId: "it-konyha",   code: "KO-SZIG",  name: "Konyhasziget — kőhatású munkalap", desc: "120×90, beépíthető főzőlappal",          unit: "db", purchasePrice: 340000, source: "Saját + Dekton pult",     notes: "Pult beszerezve",      visibility: "protected", color: "#b9b4ab", tags: ["sziget"],        sampleSlot: "ipsmpl-ip-003" },
  // Gardrób
  { id: "ip-010", typeId: "it-gardrob",  code: "GA-TOL-T", name: "Tolóajtós gardrób — tölgy",     desc: "Mennyezetig, tölgy + tükör betét",        unit: "m²", purchasePrice: 102000, source: "Saját gyártás",          notes: "Tolóajtó: Hettich",    visibility: "private",   color: "#c9a878", tags: ["tolóajtós"],     sampleSlot: "ipsmpl-ip-010" },
  { id: "ip-011", typeId: "it-gardrob",  code: "GA-NYI-F", name: "Nyílóajtós szekrény — fehér",   desc: "Belső polc + akasztó rendszer",          unit: "m²", purchasePrice: 66000,  source: "Saját gyártás",          notes: "",                   visibility: "private",   color: "#f1ece4", tags: ["nyílóajtós"],    sampleSlot: "ipsmpl-ip-011" },
  // Fürdő
  { id: "ip-020", typeId: "it-furdo",    code: "FU-MOS-D", name: "Mosdópult — dió 120",          desc: "Alátétmosdóval, 2 fiók",                 unit: "db", purchasePrice: 116000, source: "Saját + Geberit kerámia", notes: "",                   visibility: "private",   color: "#6f4a32", tags: ["dió"],          sampleSlot: "ipsmpl-ip-020" },
  { id: "ip-021", typeId: "it-furdo",    code: "FU-TUK-L", name: "Tükrös szekrény — LED",         desc: "Érintős LED, páramentes",                unit: "db", purchasePrice: 42000,  source: "Beszerzés — Sanitt",   notes: "Kész termék",         visibility: "protected", color: "#e7e2d8", tags: ["LED"],          sampleSlot: "ipsmpl-ip-021" },
  // Egyedi
  { id: "ip-030", typeId: "it-egyedi",   code: "EG-ASZ-T", name: "Étkezőasztal — tömör tölgy 200", desc: "Olajozott, fém lábszerkezet",            unit: "db", purchasePrice: 224000, source: "Saját gyártás",          notes: "Tömörfa beszerezve",   visibility: "private",   color: "#b3895a", tags: ["tömörfa"],      sampleSlot: "ipsmpl-ip-030" },
  { id: "ip-031", typeId: "it-egyedi",   code: "EG-POL-F", name: "Könyvespolc-fal — egyedi",      desc: "Mennyezetig, rejtett LED",               unit: "db", purchasePrice: 142000, source: "Saját gyártás",          notes: "",                   visibility: "private",   color: "#2c2b29", tags: ["polc"],         sampleSlot: "ipsmpl-ip-031" },
  // Burkolat
  { id: "ip-040", typeId: "it-burkolat", code: "BU-LAM-T", name: "Tölgy lamella falpanel",        desc: "Akusztikus, filc hátlap",                unit: "m²", purchasePrice: 25000,  source: "Beszerzés — Naturwand", notes: "Közös a Trade világgal", visibility: "public",  color: "#c2a47b", tags: ["lamella"],      sampleSlot: "ipsmpl-ip-040" },
  { id: "ip-041", typeId: "it-burkolat", code: "BU-MIK-G", name: "Mikrocement falfelület",        desc: "Selyemmatt, greige",                     unit: "m²", purchasePrice: 17000,  source: "Beszerzés — Topcret",   notes: "Kézi felhordás",      visibility: "private",   color: "#b4aa99", tags: ["mikrocement"],  sampleSlot: "ipsmpl-ip-041" },
];
const productOf = (id) => (window.sim.getState().intCatProducts || []).find((p) => p.id === id);
const intTypeOf = (id) => (window.sim.getState().intCatTypes || []).find((t) => t.id === id);

// Partner-állandó kedvezmények — a kereskedelmi (B2B diszkont) modell. A belső-
// építész világból KIKERÜLT (a díjazás nem kereskedelem); az adat itt marad,
// hogy egy másik (kereskedelmi) világ használhassa.
const PARTNER_PRICING_SEED = [
  { id: "pp-lbp", name: "Lakberendezés Plusz", kind: "Viszonteladó (B2B2C)", defaultDiscount: 12,
    byType: { "it-konyha": 15, "it-gardrob": 12, "it-egyedi": 8 } },
  { id: "pp-studio", name: "Stúdió Ív Belsőépítészet", kind: "Belsőépítész iroda", defaultDiscount: 8,
    byType: { "it-burkolat": 12 } },
];

Object.assign(window, {
  CONCEPTS_SEED, CONCEPT_FLOW, CONCEPT_TONE, INTERIOR_TRADE_META, TRADEPLAN_TONE, TRADEPLAN_FLOW,
  HANDLE_CATALOG_INT, MATERIAL_SWATCHES, TILE_CATALOG_INT, RAL_PALETTE,
  INT_TYPES_SEED, INT_PRODUCTS_SEED, PARTNER_PRICING_SEED, productOf, intTypeOf,
  conceptNextStatuses, conceptQuoteReady,
  FEE_METHODS, FEE_METHOD_ORDER, FEE_DEFAULT, feeMethodLabel,
  conceptArea, conceptProjectValue, conceptFeeAmount, conceptFeeBasis,
  INT_VISIBILITY, INT_VIS_ORDER,
});
