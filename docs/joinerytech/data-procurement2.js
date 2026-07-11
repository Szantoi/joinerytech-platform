// ──────────────────────────────────────────────────────────────────────────
// Procurement v2 — mock data for the four new aggregates
//   PurchaseRequisition · SupplierInvoice · Three-Way Match · PriceList
// Backend ref: MSG-PROCUREMENT-012 (Track A–H)
// ──────────────────────────────────────────────────────────────────────────

// Identities used by the role switcher (Tweak). SoD = Segregation of Duties.
const PROC_USERS = {
  requester: { name: "Szabó Anna",  initials: "SA", role: "procurement.requester", roleHu: "Igénylő",   roleEn: "Requester" },
  approver:  { name: "Kovács Péter", initials: "KP", role: "procurement.approver",  roleHu: "Jóváhagyó", roleEn: "Approver" },
};

// ── 1a. Purchase Requisitions ──────────────────────────────────────────────
// FSM: Draft → Approved → ConvertedToPO / Rejected
const PR_REQUISITIONS = [
  {
    id: "PR-2426-031", material: "Tölgy 22mm tábla", matCode: "TL-022-2440",
    qty: 30, unit: "tábla", preferredSupplier: "Egger Faipari Kft.",
    requester: "Szabó Anna", date: "2026-05-22", status: "Draft",
    note: "Tölgy frontlapokhoz — JT-2426-0184 Bognár Bútor Kft. rendelés alapján.",
    estUnit: 31800, orderRef: "JT-2426-0184",
  },
  {
    id: "PR-2426-030", material: "Vasalat Blum CLIP top", matCode: "VS-BL-CT",
    qty: 200, unit: "db", preferredSupplier: "Blum Hungária",
    requester: "Nagy János", date: "2026-05-21", status: "Approved",
    approver: "Kovács Péter", approvedAt: "2026-05-21 14:20",
    estUnit: 1240, orderRef: "JT-2426-0184",
    note: "Blum CLIP top pántok — JT-2426-0184 Bognár Bútor konyhabútor frontjaihoz, 48 db beépítés.",
    note: "Kritikus készletszint (4 db raktáron, min. 50).",
    estUnit: 1240,
  },
  {
    id: "PR-2426-029", material: "MDF 19mm tábla", matCode: "MDF-019",
    qty: 50, unit: "tábla", preferredSupplier: "Kronospan HU Zrt.",
    requester: "Szabó Anna", date: "2026-05-20", status: "ConvertedToPO",
    approver: "Kovács Péter", approvedAt: "2026-05-20 09:40", poRef: "PO-2426-089",
    note: "Korpusz alapanyag utántöltés.",
    estUnit: 9600,
  },
  {
    id: "PR-2426-028", material: "Élfólia ABS 22mm tölgy", matCode: "EZ-ABS-22-TL",
    qty: 600, unit: "fm", preferredSupplier: null,
    requester: "Tóth Kinga", date: "2026-05-19", status: "Rejected",
    approver: "Kovács Péter", approvedAt: "2026-05-19 11:05",
    rejectReason: "320 fm raktáron — elegendő a Q2 tervhez. Újraigénylés júniusban.",
    note: "Élzáráshoz, tölgy színazonos.",
    estUnit: 220,
  },
  {
    // SoD demo — requested by the approver himself
    id: "PR-2426-027", material: "Csavar Spax 4×40", matCode: "CS-SP-440",
    qty: 5000, unit: "db", preferredSupplier: null,
    requester: "Kovács Péter", date: "2026-05-18", status: "Draft",
    note: "Szerelési alapkészlet feltöltése.",
    estUnit: 12,
  },
  {
    id: "PR-2426-026", material: "Bükk 18mm tábla", matCode: "BK-018-2440",
    qty: 40, unit: "tábla", preferredSupplier: "Falco Sopron Zrt.",
    requester: "Szabó Anna", date: "2026-05-17", status: "Draft",
    note: "JT-2426-0176 Tóth Konyha & Társa rendeléshez, korpusz alapanyag.",
    estUnit: 17900, orderRef: "JT-2426-0176",
  },
  {
    id: "PR-2426-025", material: "Hettich fiókcsúszó 500mm", matCode: "VS-HE-500",
    qty: 120, unit: "db", preferredSupplier: "Hettich Hungary",
    requester: "Nagy János", date: "2026-05-16", status: "Approved",
    approver: "Kovács Péter", approvedAt: "2026-05-16 16:10",
    note: "Fiókos szekrény sorozathoz.",
    estUnit: 1180,
  },
];

// ── 1b. Supplier Invoices ───────────────────────────────────────────────────
// FSM: Received → Matched / Exception → Approved / Disputed
// Each line carries three-way match data: poQty vs deliveredQty vs invoicedQty.
const SUPPLIER_INVOICES = [
  {
    id: "SINV-2426-044", supplier: "Egger Faipari Kft.", poRef: "PO-2426-091",
    invoiceNo: "EG-2026-3391", date: "2026-05-23", status: "Matched",
    recorder: "Tóth Kinga", currency: "HUF",
    lines: [
      { material: "Tölgy 22mm tábla", poQty: 30, deliveredQty: 30, invoicedQty: 30, unitPrice: 31800, vat: 27 },
    ],
  },
  {
    id: "SINV-2426-043", supplier: "Blum Hungária", poRef: "PO-2426-090",
    invoiceNo: "BL-26-00781", date: "2026-05-22", status: "Exception",
    recorder: "Szabó Anna", currency: "EUR",
    lines: [
      // invoiced 210 vs ordered/delivered 200 → quantity exception
      { material: "Vasalat Blum CLIP top", poQty: 200, deliveredQty: 200, invoicedQty: 210, unitPrice: 3.15, vat: 27 },
    ],
  },
  {
    id: "SINV-2426-042", supplier: "Kronospan HU Zrt.", poRef: "PO-2426-089",
    invoiceNo: "KR-2026-1188", date: "2026-05-22", status: "Received",
    recorder: "Tóth Kinga", currency: "HUF",
    lines: [
      // delivered not yet booked → match pending
      { material: "MDF 19mm tábla", poQty: 50, deliveredQty: null, invoicedQty: 50, unitPrice: 9600, vat: 27 },
    ],
  },
  {
    id: "SINV-2426-041", supplier: "Falco Sopron Zrt.", poRef: "PO-2426-088",
    invoiceNo: "FA-26-2204", date: "2026-05-20", status: "Approved",
    recorder: "Nagy János", currency: "HUF", approver: "Kovács Péter", approvedAt: "2026-05-20 15:30",
    lines: [
      { material: "Bükk 18mm tábla", poQty: 40, deliveredQty: 40, invoicedQty: 40, unitPrice: 17900, vat: 27 },
    ],
  },
  {
    id: "SINV-2426-040", supplier: "Egger Faipari Kft.", poRef: "PO-2426-087",
    invoiceNo: "EG-2026-3340", date: "2026-05-18", status: "Disputed",
    recorder: "Szabó Anna", currency: "HUF",
    disputeReason: "Egységár eltérés: számlán 10 200 Ft, árlistán 9 600 Ft / tábla.",
    lines: [
      // price mismatch — invoiced unit price higher than PO
      { material: "MDF 19mm tábla", poQty: 60, deliveredQty: 60, invoicedQty: 60, unitPrice: 10200, poUnitPrice: 9600, vat: 27 },
    ],
  },
  {
    // SoD demo — recorded by the approver himself
    id: "SINV-2426-039", supplier: "Hettich Hungary", poRef: "PO-2426-086",
    invoiceNo: "HE-2026-0912", date: "2026-05-17", status: "Exception",
    recorder: "Kovács Péter", currency: "HUF",
    lines: [
      { material: "Hettich fiókcsúszó 500mm", poQty: 120, deliveredQty: 118, invoicedQty: 120, unitPrice: 1180, vat: 27 },
    ],
  },
];

// ── 1d. Price Lists ─────────────────────────────────────────────────────────
// FSM: Draft → Active → Expired
const PRICE_LISTS = [
  {
    id: "PL-EG-2026H1", supplier: "Egger Faipari Kft.", status: "Active",
    validFrom: "2026-01-01", validTo: "2026-06-30", currency: "HUF",
    items: [
      { material: "Tölgy 22mm tábla", unitPrice: 31800, unit: "tábla" },
      { material: "MDF 19mm tábla",   unitPrice: 9600,  unit: "tábla" },
      { material: "Bükk 18mm tábla",  unitPrice: 18200, unit: "tábla" },
    ],
  },
  {
    id: "PL-KR-2026H1", supplier: "Kronospan HU Zrt.", status: "Active",
    validFrom: "2026-01-01", validTo: "2026-12-31", currency: "HUF",
    items: [
      { material: "MDF 19mm tábla",      unitPrice: 9200, unit: "tábla" },
      { material: "MDF 16mm fehér tábla", unitPrice: 8700, unit: "tábla" },
      { material: "Bükk 18mm tábla",     unitPrice: 18900, unit: "tábla" },
    ],
  },
  {
    id: "PL-FA-2026H1", supplier: "Falco Sopron Zrt.", status: "Active",
    validFrom: "2026-02-01", validTo: "2026-07-31", currency: "HUF",
    items: [
      { material: "Bükk 18mm tábla",  unitPrice: 17900, unit: "tábla" },
      { material: "Tölgy 22mm tábla", unitPrice: 32400, unit: "tábla" },
    ],
  },
  {
    id: "PL-BL-2026H1", supplier: "Blum Hungária", status: "Active",
    validFrom: "2026-01-01", validTo: "2026-12-31", currency: "EUR",
    items: [
      { material: "Vasalat Blum CLIP top",  unitPrice: 3.15, unit: "db" },
      { material: "Blum Tandembox szett",   unitPrice: 8.40, unit: "szett" },
    ],
  },
  {
    id: "PL-HE-2026H1", supplier: "Hettich Hungary", status: "Draft",
    validFrom: "2026-06-01", validTo: "2026-12-31", currency: "HUF",
    items: [
      { material: "Hettich fiókcsúszó 500mm", unitPrice: 1180, unit: "db" },
    ],
  },
  {
    id: "PL-EG-2025H2", supplier: "Egger Faipari Kft.", status: "Expired",
    validFrom: "2025-07-01", validTo: "2025-12-31", currency: "HUF",
    items: [
      { material: "Tölgy 22mm tábla", unitPrice: 30400, unit: "tábla" },
      { material: "MDF 19mm tábla",   unitPrice: 9100,  unit: "tábla" },
    ],
  },
];

// Best-price lookup: across ACTIVE price lists, the cheapest supplier per material.
// (Only comparing same-currency HUF lines for a fair best-price signal.)
function computeBestPrices() {
  const best = {};
  PRICE_LISTS.filter(pl => pl.status === "Active" && pl.currency === "HUF").forEach(pl => {
    pl.items.forEach(it => {
      const cur = best[it.material];
      if (!cur || it.unitPrice < cur.unitPrice) {
        best[it.material] = { supplier: pl.supplier, unitPrice: it.unitPrice, listId: pl.id };
      }
    });
  });
  return best;
}
const BEST_PRICES = computeBestPrices();

// ── Status tone maps (FSM-specific, beyond the shared StatusPill set) ────────
const PR_STATUS = {
  hu: { Draft: "Vázlat", Approved: "Jóváhagyva", ConvertedToPO: "PO-vá alakítva", ConvertedToOrder: "Rendeléssé alakítva", Delegated: "Belső egységnek kiadva", Fulfilled: "Teljesítve", Rejected: "Elutasítva" },
  en: { Draft: "Draft", Approved: "Approved", ConvertedToPO: "Converted to PO", ConvertedToOrder: "Converted to Order", Delegated: "Delegated to unit", Fulfilled: "Fulfilled", Rejected: "Rejected" },
  tone: {
    Draft:            "bg-stone-100 text-stone-600",
    Approved:         "bg-emerald-50 text-emerald-700",
    ConvertedToPO:    "bg-sky-50 text-sky-700",
    ConvertedToOrder: "bg-violet-50 text-violet-700",
    Delegated:        "bg-amber-50 text-amber-700",
    Fulfilled:        "bg-emerald-50 text-emerald-700",
    Rejected:         "bg-rose-50 text-rose-700",
  },
  dot: {
    Draft: "bg-stone-400", Approved: "bg-emerald-500", ConvertedToPO: "bg-sky-500", ConvertedToOrder: "bg-violet-500", Delegated: "bg-amber-500", Fulfilled: "bg-emerald-500", Rejected: "bg-rose-500",
  },
};

// Belső megrendelés (internal_order kézfogás) státusz-megjelenítés
const IO_STATUS = {
  hu: { sent: "Kiadva", accepted: "Elfogadva", done: "Kész", declined: "Visszautasítva" },
  en: { sent: "Sent", accepted: "Accepted", done: "Done", declined: "Declined" },
  tone: {
    sent:     "bg-sky-50 text-sky-700 border-sky-200",
    accepted: "bg-amber-50 text-amber-700 border-amber-200",
    done:     "bg-emerald-50 text-emerald-700 border-emerald-200",
    declined: "bg-rose-50 text-rose-700 border-rose-200",
  },
  dot: { sent: "bg-sky-500", accepted: "bg-amber-500", done: "bg-emerald-500", declined: "bg-rose-400" },
  order: ["sent", "accepted", "done"],
};

const INV_STATUS = {
  hu: { Received: "Beérkezett", Matched: "Egyeztetve", Exception: "Eltérés", Approved: "Jóváhagyva", Disputed: "Vitatott" },
  en: { Received: "Received", Matched: "Matched", Exception: "Exception", Approved: "Approved", Disputed: "Disputed" },
  tone: {
    Received:  "bg-stone-100 text-stone-600",
    Matched:   "bg-teal-50 text-teal-700",
    Exception: "bg-amber-50 text-amber-700",
    Approved:  "bg-emerald-50 text-emerald-700",
    Disputed:  "bg-rose-50 text-rose-700",
  },
  dot: {
    Received: "bg-stone-400", Matched: "bg-teal-500", Exception: "bg-amber-500", Approved: "bg-emerald-500", Disputed: "bg-rose-500",
  },
};

const PL_STATUS = {
  hu: { Draft: "Vázlat", Active: "Aktív", Expired: "Lejárt" },
  en: { Draft: "Draft", Active: "Active", Expired: "Expired" },
  tone: { Draft: "bg-stone-100 text-stone-600", Active: "bg-emerald-50 text-emerald-700", Expired: "bg-stone-100 text-stone-400" },
  dot: { Draft: "bg-stone-400", Active: "bg-emerald-500", Expired: "bg-stone-300" },
};

// Variance approval threshold — above this absolute HUF amount, ApproveWithVariance
// requires the elevated procurement.approver role.
const VARIANCE_THRESHOLD_HUF = 50000;

// ── i18n for the Procurement v2 module ───────────────────────────────────────
const PROC2_I18N = {
  hu: {
    title: "Beszerzés v2",
    tabs: { req: "Igénylések", inv: "Számlák", match: "Egyeztetés", price: "Árlisták" },
    role: { label: "Aktuális szerepkör", requester: "Igénylő", approver: "Jóváhagyó" },
    sod: "Összeférhetetlenség (SoD): a jóváhagyó nem lehet azonos az igénylővel.",
    sodInv: "Összeférhetetlenség (SoD): a jóváhagyó nem lehet azonos a rögzítővel.",
    req: {
      new: "Új igénylés", count: "igénylés", searchPh: "Keresés azonosító, anyag…",
      cols: { id: "Azonosító", material: "Anyag", qty: "Menny.", supplier: "Pref. szállító", requester: "Igénylő", date: "Dátum", status: "Státusz" },
      approve: "Jóváhagyás", reject: "Elutasítás", toPo: "PO létrehozás",
      material: "Anyag", quantity: "Mennyiség", unit: "Egység", preferred: "Preferált szállító (opcionális)",
      note: "Megjegyzés", optional: "opcionális", estValue: "Becsült érték",
      noneSupplier: "Nincs megadva", save: "Igénylés beküldése", saveDraft: "Mentés vázlatként",
      detailTitle: "Igénylés", approvedBy: "Jóváhagyta", rejectedReason: "Elutasítás indoka",
      rejectPh: "Add meg az elutasítás indokát…",
    },
    inv: {
      new: "Számla rögzítése", count: "számla", searchPh: "Keresés számlaszám, szállító…",
      cols: { id: "Számla", supplier: "Szállító", po: "PO hiv.", amount: "Bruttó", date: "Dátum", status: "Státusz" },
      net: "Nettó", vat: "ÁFA", gross: "Bruttó", lines: "Tételsorok", addLine: "Tételsor hozzáadása",
      supplier: "Szállító", poRef: "PO hivatkozás", recordedBy: "Rögzítette",
      approve: "Jóváhagyás", approveVariance: "Jóváhagyás eltéréssel", dispute: "Vitatás",
      threeWay: "Three-Way Match", varianceTitle: "Eltérés", disputeReason: "Vitatás indoka",
      colMat: "Anyag", colPo: "PO db", colDeliv: "Szállított", colInv: "Számlázott", colPrice: "Egységár", colVat: "ÁFA",
      save: "Számla rögzítése", varianceNote: "Eltérés meghaladja a küszöböt — emelt jogkör szükséges.",
      pending: "Szállítás még nem könyvelve",
    },
    match: {
      title: "Three-Way Match eredmények", sub: "PO · Szállítás · Számla — soronkénti egyeztetés",
      ok: "Rendben", within: "Toleranciában", exception: "Eltérés",
      poQty: "PO menny.", deliv: "Szállított", inv: "Számlázott", variance: "Eltérés", varPct: "Eltérés %",
      legend: "Tolerancia: ±2% mennyiség / ±1% ár",
    },
    price: {
      new: "Új árlista", count: "árlista", supplier: "Szállító", validity: "Érvényesség",
      activate: "Aktiválás", expire: "Lejáratás", bestPrice: "Legjobb ár",
      cols: { material: "Anyag", price: "Egységár", currency: "Deviza", best: "" },
      itemsCount: "tétel", validTo: "érvényes eddig",
    },
  },
  en: {
    title: "Procurement v2",
    tabs: { req: "Requisitions", inv: "Invoices", match: "Matching", price: "Price lists" },
    role: { label: "Current role", requester: "Requester", approver: "Approver" },
    sod: "Segregation of Duties (SoD): the approver cannot be the requester.",
    sodInv: "Segregation of Duties (SoD): the approver cannot be the recorder.",
    req: {
      new: "New requisition", count: "requisitions", searchPh: "Search id, material…",
      cols: { id: "ID", material: "Material", qty: "Qty", supplier: "Pref. supplier", requester: "Requester", date: "Date", status: "Status" },
      approve: "Approve", reject: "Reject", toPo: "Create PO",
      material: "Material", quantity: "Quantity", unit: "Unit", preferred: "Preferred supplier (optional)",
      note: "Note", optional: "optional", estValue: "Est. value",
      noneSupplier: "Not specified", save: "Submit requisition", saveDraft: "Save as draft",
      detailTitle: "Requisition", approvedBy: "Approved by", rejectedReason: "Rejection reason",
      rejectPh: "Enter rejection reason…",
    },
    inv: {
      new: "Record invoice", count: "invoices", searchPh: "Search invoice no, supplier…",
      cols: { id: "Invoice", supplier: "Supplier", po: "PO ref", amount: "Gross", date: "Date", status: "Status" },
      net: "Net", vat: "VAT", gross: "Gross", lines: "Line items", addLine: "Add line",
      supplier: "Supplier", poRef: "PO reference", recordedBy: "Recorded by",
      approve: "Approve", approveVariance: "Approve with variance", dispute: "Dispute",
      threeWay: "Three-Way Match", varianceTitle: "Variance", disputeReason: "Dispute reason",
      colMat: "Material", colPo: "PO qty", colDeliv: "Delivered", colInv: "Invoiced", colPrice: "Unit price", colVat: "VAT",
      save: "Record invoice", varianceNote: "Variance exceeds threshold — elevated role required.",
      pending: "Delivery not yet booked",
    },
    match: {
      title: "Three-Way Match results", sub: "PO · Delivery · Invoice — line-by-line reconciliation",
      ok: "OK", within: "Within tolerance", exception: "Exception",
      poQty: "PO qty", deliv: "Delivered", inv: "Invoiced", variance: "Variance", varPct: "Variance %",
      legend: "Tolerance: ±2% quantity / ±1% price",
    },
    price: {
      new: "New price list", count: "price lists", supplier: "Supplier", validity: "Validity",
      activate: "Activate", expire: "Expire", bestPrice: "Best price",
      cols: { material: "Material", price: "Unit price", currency: "Currency", best: "" },
      itemsCount: "items", validTo: "valid until",
    },
  },
};

function fmtMoney(n, currency) {
  if (currency === "EUR") {
    return "€" + new Intl.NumberFormat("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
  return new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(n) + " Ft";
}

// ── Beszerzési katalógus — forrás-típus + tétel-típus megjelenítés ──────────
// A procCatalog source.kind szerinti tónus + címke. NE hardcode-olj színt máshol.
const PROC_SOURCE_META = {
  supplier:      { hu: "Külső szállító",  icon: "box",   dot: "bg-teal-500",   chip: "bg-teal-50 text-teal-700 border-teal-200" },
  work:          { hu: "Külső munka",     icon: "wrench", dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700 border-violet-200" },
  internal_unit: { hu: "Belső egység",    icon: "factory", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 border-amber-200" },
};
const PROC_SOURCE_ORDER = ["supplier", "work", "internal_unit"];
const PROC_KIND_META = {
  material: { hu: "Anyag" },
  hardware: { hu: "Vasalat" },
  work:     { hu: "Szolgáltatás" },
  group:    { hu: "Gyűjtő" },
};

Object.assign(window, {
  PROC_USERS, PR_REQUISITIONS, SUPPLIER_INVOICES, PRICE_LISTS, BEST_PRICES,
  PR_STATUS, INV_STATUS, PL_STATUS, IO_STATUS, VARIANCE_THRESHOLD_HUF, PROC2_I18N, fmtMoney,
  PROC_SOURCE_META, PROC_SOURCE_ORDER, PROC_KIND_META,
});
