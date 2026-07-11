// ──────────────────────────────────────────────────────────────────────────
// BESZÁLLÍTÓI AJÁNLATKÉRÉS (RFQ) — a Beszerzés világ új képernyője
//
// FELELŐSSÉG: a PO ELÉ fűzött kör. Most az `Approved` igény egyből PO-vá alakul
// (createPOsFromReqs). Az RFQ ezt egészíti ki: bekérünk TÖBB beszállítótól
// ajánlatot egy tétel-csomagra → összehasonlítjuk (ár / átfutás) → odaítéljük a
// nyertesnek → a meglévő szállítónkénti PO-bontás generálja a megrendelést.
// A státusz az RFQ-n él. Egy RFQ több tétel-sort + több meghívott beszállítót
// tartalmaz; minden beszállító soronként ad ajánlatot (ár + átfutás).
// ──────────────────────────────────────────────────────────────────────────

const RFQ_TODAY = "2026-04-28";

// ── Státusz-FSM ─────────────────────────────────────────────────────────────
// osszeallitas → kikuldve → biralat → odaitelve   (mellék: visszavonva)
const RFQ_FLOW = {
  order: ["osszeallitas", "kikuldve", "biralat", "odaitelve"],
  states: {
    osszeallitas: { next: ["kikuldve", "visszavonva"] },
    kikuldve:     { next: ["biralat", "visszavonva"] },
    biralat:      { next: ["odaitelve", "visszavonva"] },
    odaitelve:    { next: [], terminal: true },
    visszavonva:  { next: [], terminal: true },
  },
};
const RFQ_STATUS = {
  osszeallitas: { label: "Összeállítás", pill: "bg-stone-100 text-stone-700 border-stone-200",      dot: "bg-stone-400" },
  kikuldve:     { label: "Kiküldve",     pill: "bg-sky-50 text-sky-700 border-sky-200",             dot: "bg-sky-500" },
  biralat:      { label: "Bírálat alatt",pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  odaitelve:    { label: "Odaítélve",    pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  visszavonva:  { label: "Visszavonva",  pill: "bg-rose-50 text-rose-700 border-rose-200",          dot: "bg-rose-500" },
};

// ── Seed ajánlatkérések ──────────────────────────────────────────────────────
// bids: { lineIdx: { price, leadDays } } — a beszállító soronkénti ajánlata.
const RFQ_SEED = [
  // 5) Kiküldve — Falco MEGHÍVVA, ajánlatra vár (beszállítói portál belépő demó)
  { id: "RFQ-2426-005", title: "Tölgy + bükk frontlap — Q2 sorozat", status: "kikuldve",
    createdBy: "Szabó Anna", createdAt: "2026-04-27", dueDate: "2026-05-08", note: "Frontlap utántöltés két konyha + ajtó rendeléshez. Kérjük az ajánlatot a portálon.",
    lines: [
      { code: "TL-022-2440", material: "Tölgy 22mm bútorlap", qty: 40, unit: "tábla" },
      { code: "BK-018-2440", material: "Bükk 18mm bútorlap",  qty: 35, unit: "tábla" },
    ],
    suppliers: [
      { name: "Falco Sopron Zrt.",  invitedAt: "2026-04-27", responded: false, respondedAt: null, note: "", bids: {} },
      { name: "Egger Faipari Kft.", invitedAt: "2026-04-27", responded: false, respondedAt: null, note: "", bids: {} },
    ],
    awardedTo: null, poRef: null,
    log: [{ at: "2026-04-27 10:00", text: "Ajánlatkérés létrehozva" }, { at: "2026-04-27 10:05", text: "Kiküldve 2 beszállítónak" }] },

  // 4) Összeállítás — még gyűjtjük a tételeket, nincs meghívott beszállító
  { id: "RFQ-2426-004", title: "Élzáró + csavar — szerelési alapkészlet", status: "osszeallitas",
    createdBy: "Szabó Anna", createdAt: "2026-04-28", dueDate: "2026-05-12", note: "Élzárás + szerelvény utántöltés a Q2 sorozathoz.",
    lines: [
      { code: "ABS-02-WH", material: "ABS élzáró 2mm fehér", qty: 500, unit: "m" },
    ],
    suppliers: [], awardedTo: null, poRef: null,
    log: [{ at: "2026-04-28 09:10", text: "Ajánlatkérés létrehozva (összeállítás)" }] },

  // 3) Bírálat alatt — 3 meghívott, 2 beérkezett ajánlattal
  { id: "RFQ-2426-003", title: "Korpusz lapanyag — Q2 utántöltés", status: "biralat",
    createdBy: "Szabó Anna", createdAt: "2026-04-24", dueDate: "2026-05-02", note: "Bükk + MDF korpusz alapanyag, két konyhabútor-rendeléshez.",
    lines: [
      { code: "BK-018-2440", material: "Bükk 18mm bútorlap",     qty: 50, unit: "tábla" },
      { code: "MDF-016-W",   material: "MDF 16mm fehér melamin", qty: 60, unit: "tábla" },
    ],
    suppliers: [
      { name: "Falco Sopron Zrt.",   invitedAt: "2026-04-24", responded: true,  respondedAt: "2026-04-26", note: "Készleten, gyors szállítás.", bids: { 0: { price: 18200, leadDays: 7 }, 1: { price: 8700, leadDays: 10 } } },
      { name: "Egger Faipari Kft.",  invitedAt: "2026-04-24", responded: true,  respondedAt: "2026-04-27", note: "MDF-re kedvező ár.",          bids: { 0: { price: 18900, leadDays: 5 }, 1: { price: 8500, leadDays: 6 } } },
      { name: "Kronospan HU Zrt.",   invitedAt: "2026-04-24", responded: false, respondedAt: null,         note: "",                            bids: {} },
    ],
    awardedTo: null, poRef: null,
    log: [{ at: "2026-04-24 11:00", text: "Ajánlatkérés létrehozva" }, { at: "2026-04-24 11:05", text: "Kiküldve 3 beszállítónak" }, { at: "2026-04-26 14:20", text: "Falco Sopron Zrt. ajánlata beérkezett" }, { at: "2026-04-27 09:40", text: "Egger Faipari Kft. ajánlata beérkezett" }] },

  // 2) Kiküldve — meghívva, ajánlatra várunk
  { id: "RFQ-2426-002", title: "Blum vasalat — konyhabútor sorozat", status: "kikuldve",
    createdBy: "Nagy János", createdAt: "2026-04-26", dueDate: "2026-05-06", note: "Pánt + fiókcsúszó a Bognár konyhabútor sorozathoz.",
    lines: [
      { code: "VS-BL-CT", material: "Blum CLIP top csukópánt", qty: 200, unit: "db" },
      { code: "VS-BL-DR", material: "Blum Tandem fiókcsúszó",  qty: 80,  unit: "pár" },
    ],
    suppliers: [
      { name: "Blum Hungária",  invitedAt: "2026-04-26", responded: false, respondedAt: null, note: "", bids: {} },
      { name: "Häfele Hungary", invitedAt: "2026-04-26", responded: false, respondedAt: null, note: "", bids: {} },
    ],
    awardedTo: null, poRef: null,
    log: [{ at: "2026-04-26 15:00", text: "Ajánlatkérés létrehozva" }, { at: "2026-04-26 15:02", text: "Kiküldve 2 beszállítónak" }] },

  // 1) Odaítélve — lezárt, nyertes + PO
  { id: "RFQ-2426-001", title: "Tölgy frontlap — Doorstar ajtósorozat", status: "odaitelve",
    createdBy: "Szabó Anna", createdAt: "2026-04-15", dueDate: "2026-04-22", note: "Tölgy 22mm frontlap a Doorstar belső ajtó sorozathoz.", closedAt: "2026-04-23",
    lines: [
      { code: "TL-022-2440", material: "Tölgy 22mm bútorlap", qty: 30, unit: "tábla" },
    ],
    suppliers: [
      { name: "Falco Sopron Zrt.",  invitedAt: "2026-04-15", responded: true, respondedAt: "2026-04-18", note: "", bids: { 0: { price: 31600, leadDays: 8 } } },
      { name: "Egger Faipari Kft.", invitedAt: "2026-04-15", responded: true, respondedAt: "2026-04-19", note: "Akciós ár.", bids: { 0: { price: 31200, leadDays: 6 } } },
    ],
    awardedTo: "Egger Faipari Kft.", poRef: "PO-2426-094",
    log: [{ at: "2026-04-15 10:00", text: "Ajánlatkérés létrehozva" }, { at: "2026-04-19 16:00", text: "Bírálat: Egger a legkedvezőbb (31 200 Ft / tábla)" }, { at: "2026-04-23 09:00", text: "Odaítélve: Egger Faipari Kft. → PO-2426-094" }] },
];

// ──────────────────────────────────────────────────────────────────────────
// RfqEngine — tiszta számítások (FSM, ajánlat-összesítés, legjobb ár, megtakarítás)
// ──────────────────────────────────────────────────────────────────────────
const RfqEngine = {
  canGo(rfq, to) { const st = RFQ_FLOW.states[rfq.status]; return !!(st && st.next.includes(to)); },
  nextStates(rfq) { const st = RFQ_FLOW.states[rfq.status]; return st ? st.next.slice() : []; },
  isTerminal(rfq) { const st = RFQ_FLOW.states[rfq.status]; return !!(st && st.terminal); },
  isOpen(rfq) { return !["odaitelve", "visszavonva"].includes(rfq.status); },
  respondedCount(rfq) { return (rfq.suppliers || []).filter((s) => s.responded).length; },
  // egy beszállító teljes ajánlata: Σ soronkénti ár × mennyiség (csak a beadott sorokra)
  supplierTotal(rfq, name) {
    const sup = (rfq.suppliers || []).find((s) => s.name === name);
    if (!sup) return null;
    let total = 0, lines = 0;
    (rfq.lines || []).forEach((ln, i) => { const b = sup.bids && sup.bids[i]; if (b && b.price != null) { total += (Number(b.price) || 0) * (Number(ln.qty) || 0); lines++; } });
    return { total, lines, complete: lines === (rfq.lines || []).length && lines > 0 };
  },
  // legjobb (legolcsóbb) ajánlat egy sorra a beérkezett beszállítóktól
  bestForLine(rfq, lineIdx) {
    let best = null;
    (rfq.suppliers || []).forEach((s) => { const b = s.bids && s.bids[lineIdx]; if (b && b.price != null && (best === null || b.price < best.price)) best = { name: s.name, price: b.price, leadDays: b.leadDays }; });
    return best;
  },
  // beszállítók rangsora teljes ajánlat szerint (csak a beadottak)
  ranking(rfq) {
    return (rfq.suppliers || []).filter((s) => s.responded).map((s) => ({ name: s.name, ...this.supplierTotal(rfq, s.name) }))
      .filter((r) => r.lines > 0).sort((a, b) => a.total - b.total);
  },
  recommended(rfq) { const r = this.ranking(rfq); return r.length ? r[0] : null; },
  // megtakarítás: a legdrágább teljes ajánlat − a legolcsóbb (a verseny haszna)
  savings(rfq) {
    const r = this.ranking(rfq).filter((x) => x.complete);
    if (r.length < 2) return null;
    const lo = r[0].total, hi = r[r.length - 1].total;
    return { amount: hi - lo, pct: hi > 0 ? (hi - lo) / hi : 0 };
  },
};

Object.assign(window, { RFQ_TODAY, RFQ_FLOW, RFQ_STATUS, RFQ_SEED, RfqEngine });
