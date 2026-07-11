// Sales Phase 2 — extended data (FSM status map, quote line items, customer type/addresses)
// Augments QUOTES / CUSTOMERS from data-worlds.js with the fields the new SlideOvers need.

// ─────────────────────────────────────────────────────────────────────────
// Quote status FSM — the full 8-state map from the Phase 2 spec
// (existing QUOTE_TONE is kept for the list view; this is the canonical map
//  for the detail SlideOver header + action buttons)
// ─────────────────────────────────────────────────────────────────────────
const QUOTE_STATUS_MAP = {
  draft:             { label: "Vázlat",        bg: "bg-stone-100",   fg: "text-stone-700",   dot: "bg-stone-400",   ring: "ring-stone-200" },
  sent:              { label: "Kiküldve",      bg: "bg-sky-50",      fg: "text-sky-700",     dot: "bg-sky-500",     ring: "ring-sky-200" },
  approved:          { label: "Elfogadva",     bg: "bg-emerald-50",  fg: "text-emerald-700", dot: "bg-emerald-500", ring: "ring-emerald-200" },
  rejected:          { label: "Elutasítva",    bg: "bg-rose-50",     fg: "text-rose-700",    dot: "bg-rose-500",    ring: "ring-rose-200" },
  expired:           { label: "Lejárt",        bg: "bg-amber-50",    fg: "text-amber-700",   dot: "bg-amber-500",   ring: "ring-amber-200" },
  conversionPending: { label: "Gyártásra vár", bg: "bg-teal-50",     fg: "text-teal-700",    dot: "bg-teal-500",    ring: "ring-teal-200" },
  converted:         { label: "Gyártásban",    bg: "bg-teal-100",    fg: "text-teal-800",    dot: "bg-teal-600",    ring: "ring-teal-300" },
  archived:          { label: "Archivált",     bg: "bg-stone-50",    fg: "text-stone-500",   dot: "bg-stone-300",   ring: "ring-stone-200" },
};

// VAT rate (HU standard)
const VAT_RATE = 0.27;

// ─────────────────────────────────────────────────────────────────────────
// Quote line items — keyed by quote id. Distinct realistic mixes per quote
// so each detail SlideOver feels like a real ajánlat, not template noise.
// ─────────────────────────────────────────────────────────────────────────
const QUOTE_LINES = {
  "Q-2426-058": [ // Bognár Bútor · sent · 18 db · 4.28M
    { id: "L1", description: "Belső ajtó 90×210 cm, tölgy furnér",     quantity: 12, unitPrice: 178_000 },
    { id: "L2", description: "Tok szett, tölgy, 90 cm",                 quantity: 12, unitPrice:  32_500 },
    { id: "L3", description: "Vasalat csomag (zsanér + kilincs)",        quantity: 12, unitPrice:  21_400 },
    { id: "L4", description: "Helyszíni felszerelés, ajtónként",         quantity: 12, unitPrice:  18_200 },
  ],
  "Q-2426-057": [ // Várdai Konyhastúdió · draft · 7 db · 1.95M
    { id: "L1", description: "Konyhaszekrény felső 60 cm, fehér MDF",   quantity:  4, unitPrice: 184_000 },
    { id: "L2", description: "Konyhaszekrény alsó 80 cm fiókos",         quantity:  3, unitPrice: 298_000 },
    { id: "L3", description: "Munkalap tölgy 4 m, 38 mm",                quantity:  1, unitPrice: 224_000 },
  ],
  "Q-2426-056": [ // Doorstar · approved · 42 db · 12.4M
    { id: "L1", description: "Belső ajtólap 80×210, CPL fehér",         quantity: 28, unitPrice: 142_000 },
    { id: "L2", description: "Belső ajtólap 90×210, CPL fehér",         quantity: 14, unitPrice: 158_000 },
    { id: "L3", description: "Tok szett komplett (tömör)",               quantity: 42, unitPrice:  64_800 },
    { id: "L4", description: "Élzárás ABS 2 mm, perem",                  quantity: 84, unitPrice:   8_900 },
  ],
  "Q-2426-055": [ // Pesti Ablakműhely · sent · 4 db · 680k
    { id: "L1", description: "Fa nyílászáró 120×140, tölgy",            quantity:  2, unitPrice: 218_000 },
    { id: "L2", description: "Bukó-nyíló vasalat csomag",                quantity:  2, unitPrice:  62_000 },
    { id: "L3", description: "Beépítés, tömítés, gérvágás",              quantity:  4, unitPrice:  30_000 },
  ],
  "Q-2426-054": [ // Hegyi Lakberendezés · approved · 11 db · 2.14M
    { id: "L1", description: "Beépített szekrény oldallap 18 mm bükk",   quantity:  6, unitPrice: 148_000 },
    { id: "L2", description: "Tolóajtó panel 90×240, fehér üveg",        quantity:  3, unitPrice: 312_000 },
    { id: "L3", description: "Belső fiókoszlop 4×",                       quantity:  2, unitPrice: 156_000 },
  ],
  "Q-2426-053": [ // Tóth Konyha & Társa · rejected · 5 db · 1.22M
    { id: "L1", description: "Konyha frontok MDF lakkozott",             quantity: 14, unitPrice:  62_000 },
    { id: "L2", description: "Munkalap kompozit 3 m",                    quantity:  1, unitPrice: 184_000 },
    { id: "L3", description: "Mosogatókonzol kivágás + szerelés",         quantity:  1, unitPrice: 168_000 },
  ],
  "Q-2426-052": [ // Vella Interior · expired · 14 db · 3.81M
    { id: "L1", description: "Egyedi gardrób korpusz tölgy furnér",       quantity:  1, unitPrice: 1_840_000 },
    { id: "L2", description: "Tolóajtó alumínium kerettel, 3 sín",        quantity:  3, unitPrice:   524_000 },
    { id: "L3", description: "LED világítás profillal, 4 m",              quantity:  1, unitPrice:   168_000 },
    { id: "L4", description: "Belső szervező (cipőtartó, akasztó)",       quantity:  1, unitPrice:   228_000 },
  ],
};

// Subtotal/VAT/total helpers — pure functions, called from the SlideOver.
function quoteSubtotal(lines) {
  return lines.reduce((s, l) => s + (l.quantity * l.unitPrice), 0);
}
function quoteVat(subtotal) { return Math.round(subtotal * VAT_RATE); }
function quoteTotal(subtotal) { return subtotal + quoteVat(subtotal); }

// ─────────────────────────────────────────────────────────────────────────
// Customer extensions — type (Lead/Active/Inactive) + billing/shipping addresses
// Maps customer id → extra data. CUSTOMERS in data-worlds is left intact.
// ─────────────────────────────────────────────────────────────────────────
const CUSTOMER_EXTRA = {
  "C-001": { type: "active",   billing: { street: "Mecsek u. 12.", city: "Pécs",      zip: "7621", country: "HU" }, shipping: { street: "Üzem u. 4.",      city: "Pécs",      zip: "7630", country: "HU" } },
  "C-002": { type: "active",   billing: { street: "Piac tér 8.",    city: "Debrecen", zip: "4024", country: "HU" }, shipping: null },
  "C-003": { type: "active",   billing: { street: "Ipari park 3.",  city: "Vác",      zip: "2600", country: "HU" }, shipping: { street: "Logisztikai u. 1.", city: "Vác",     zip: "2600", country: "HU" } },
  "C-004": { type: "lead",     billing: { street: "Váci út 99.",    city: "Budapest", zip: "1139", country: "HU" }, shipping: null },
  "C-005": { type: "active",   billing: { street: "Fő tér 5.",      city: "Sopron",   zip: "9400", country: "HU" }, shipping: null },
  "C-006": { type: "lead",     billing: { street: "Andrássy út 42.",city: "Budapest", zip: "1062", country: "HU" }, shipping: null },
  "C-007": { type: "inactive", billing: { street: "Kossuth u. 14.", city: "Szeged",   zip: "6722", country: "HU" }, shipping: null },
};

const CUSTOMER_TYPE_MAP = {
  lead:     { label: "Lead",           bg: "bg-amber-50",     fg: "text-amber-700",   dot: "bg-amber-500",  gradFrom: "from-amber-300",  gradTo: "to-amber-500" },
  active:   { label: "Aktív ügyfél",   bg: "bg-indigo-50",    fg: "text-indigo-700",  dot: "bg-indigo-500", gradFrom: "from-indigo-400", gradTo: "to-indigo-600" },
  inactive: { label: "Inaktív",        bg: "bg-stone-100",    fg: "text-stone-500",   dot: "bg-stone-400",  gradFrom: "from-stone-300",  gradTo: "to-stone-400" },
};

Object.assign(window, {
  QUOTE_STATUS_MAP, QUOTE_LINES, VAT_RATE,
  quoteSubtotal, quoteVat, quoteTotal,
  CUSTOMER_EXTRA, CUSTOMER_TYPE_MAP,
});
