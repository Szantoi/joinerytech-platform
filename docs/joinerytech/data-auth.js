// ──────────────────────────────────────────────────────────────────────────
// HATÁSKÖR-MÁTRIX / JÓVÁHAGYÁSI LIMITEK (4.8-B2)
//
// FELELŐSSÉG: érték-küszöbök a meglévő perm-rendszer FÖLÖTT. Ha egy művelet
// (megrendelés kiküldése, számla sztornó, kedvezmény) a limit FÖLÖTT van, nem
// hajtódik végre azonnal — JÓVÁHAGYÁSI kérelem jön létre (`approvals[]`), ami a
// „Feladataim" jóváhagyások közt jelenik meg; egy arra jogosult (`auth.approve`)
// dönt róla, és jóváhagyáskor végrehajtódik a visszatartott művelet.
// ──────────────────────────────────────────────────────────────────────────

// Művelet-típusok + melyik limithez kötődnek.
const AUTH_ACTIONS = {
  "po.release":     { label: "Megrendelés kiküldése", limitKey: "poValue",     unit: "Ft", icon: "procurement", world: "procurement", screen: "rfq" },
  "invoice.void":   { label: "Számla sztornó",        limitKey: "voidValue",   unit: "Ft", icon: "receipt",     world: "finance",     screen: "outgoing" },
  "quote.discount": { label: "Kedvezmény ajánlaton",  limitKey: "discountPct", unit: "%",  icon: "briefcase",   world: "sales",       screen: "quotes" },
  "overtime.order": { label: "Túlóra elrendelés",    limitKey: "overtimeHours", unit: "ó", icon: "clock",       world: "attendance",  screen: "timesheet" },
};
const AUTH_ACTION_ORDER = ["po.release", "invoice.void", "quote.discount", "overtime.order"];

// Alap-küszöbök (e FÖLÖTT kell jóváhagyás). A cég Beállítások → Hatáskörök alatt módosíthatja.
const AUTH_CONFIG_DEFAULT = { poValue: 600000, voidValue: 800000, discountPct: 15, overtimeHours: 2 };

// Jóváhagyás-FSM
const AUTH_FLOW = {
  states: { fuggoben: { next: ["jovahagyva", "elutasitva"] }, jovahagyva: { next: [], terminal: true }, elutasitva: { next: [], terminal: true } },
};
const AUTH_STATUS = {
  fuggoben:   { label: "Jóváhagyásra vár", pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  jovahagyva: { label: "Jóváhagyva",       pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  elutasitva: { label: "Elutasítva",       pill: "bg-rose-50 text-rose-700 border-rose-200",          dot: "bg-rose-500" },
};

// Seed jóváhagyási kérelmek
const APPROVALS_SEED = [
  // nyitott — a Falco tölgy vázlat (632 e Ft) a 600 e Ft-os PO-limit felett
  { id: "JV-2426-002", type: "po.release", refId: "PO-2426-D02", title: "Megrendelés kiküldése — Falco Sopron Zrt. (Tölgy 22mm)",
    requestedBy: "Szabó Anna", amount: 632000, limit: 600000, status: "fuggoben", createdAt: "2026-04-28",
    payload: { poId: "PO-2426-D02" },
    log: [{ at: "2026-04-28 10:15", text: "Jóváhagyásra küldve — PO-limit felett (632 000 / 600 000 Ft)" }] },
  // lezárt — historikus sztornó-jóváhagyás
  { id: "JV-2426-001", type: "invoice.void", refId: "SZ-2426-0031", title: "Számla sztornó — Bognár Bútor Kft.",
    requestedBy: "Tóth Kinga", amount: 1240000, limit: 800000, status: "jovahagyva", approver: "Kovács Péter", createdAt: "2026-04-24", decidedAt: "2026-04-24",
    payload: {}, reason: "Hibás tételsor, javított számla kiállítva.",
    log: [{ at: "2026-04-24 09:00", text: "Jóváhagyásra küldve — sztornó-limit felett" }, { at: "2026-04-24 11:30", text: "Jóváhagyva — Kovács Péter" }] },
];

Object.assign(window, { AUTH_ACTIONS, AUTH_ACTION_ORDER, AUTH_CONFIG_DEFAULT, AUTH_FLOW, AUTH_STATUS, APPROVALS_SEED });
