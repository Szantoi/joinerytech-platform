// ──────────────────────────────────────────────────────────────────────────
// LOGISZTIKA világ — Kiszállítás & Telepítés (+ beszállítás, felmérés)
//
// A fizikai lánc lezárása: a rendelés/projekt/raktár-zóna után a fuvar és a
// helyszíni telepítés. Három fuvar-TÍPUS, mindegyik SAJÁT FSM-mel, de KÖZÖS
// erőforrás-réteggel (jármű + brigád) és ütközés-figyeléssel:
//   • delivery (Kiszállítás+telepítés) — kész bútor az ügyfélhez (OUTBOUND)
//   • pickup   (Beszállítás)           — saját fuvar áruért a beszállítóhoz (INBOUND)
//   • survey   (Felmérés)              — helyszíni bemérés a gyártás előtt
//
// A státusz a fuvar-TÉTELEN él; az átmenetet a store `setShipmentStatus` validált
// FSM-akciója kezeli (tiltott = LEZÁRT gomb). A raktár-zóna (commissioned/shippable),
// a rendelés (ready/delivered), a projekt (install) és a beszerzési PO mind
// BELÉPÉSI PONT — a fuvar onnan keletkezik, és vissza is gyűrűzik (átadás → rendelés
// delivered; beérkezés → bevételezés-javaslat; ügyfél-követés a webshopban).
// ──────────────────────────────────────────────────────────────────────────

// ── Fuvar-típusok ──────────────────────────────────────────────────────────
const LOG_TYPE_META = {
  delivery: { key: "delivery", label: "Kiszállítás", short: "Kisz.", dir: "out", icon: "truck",
    accent: "#0284c7", pill: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500",
    desc: "Kész bútor kiszállítása + helyszíni telepítés az ügyfélhez." },
  pickup:   { key: "pickup", label: "Beszállítás", short: "Besz.", dir: "in", icon: "download",
    accent: "#7c3aed", pill: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500",
    desc: "Saját fuvar — anyag / áru felvétele a beszállítótól a céghez." },
  survey:   { key: "survey", label: "Felmérés", short: "Felm.", dir: "out", icon: "ruler",
    accent: "#0d9488", pill: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500",
    desc: "Helyszíni felmérés / bemérés a gyártás előtt." },
};
const LOG_TYPE_ORDER = ["delivery", "pickup", "survey"];

// ── Státusz-tónusok (minden típus minden állapota) ─────────────────────────
const LOG_STATUS = {
  tervezett:   { label: "Tervezett",   pill: "bg-stone-100 text-stone-700 border-stone-200",   dot: "bg-stone-400" },
  berakodva:   { label: "Berakodva",   pill: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  uton:        { label: "Úton",        pill: "bg-sky-50 text-sky-700 border-sky-200",          dot: "bg-sky-500" },
  kiszallitva: { label: "Kiszállítva", pill: "bg-cyan-50 text-cyan-700 border-cyan-200",       dot: "bg-cyan-500" },
  beszerelve:  { label: "Beszerelve",  pill: "bg-teal-50 text-teal-700 border-teal-200",       dot: "bg-teal-500" },
  atadva:      { label: "Átadva",      pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  felveve:     { label: "Felvéve",     pill: "bg-cyan-50 text-cyan-700 border-cyan-200",       dot: "bg-cyan-500" },
  beerkezett:  { label: "Beérkezett",  pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  helyszinen:  { label: "Helyszínen",  pill: "bg-cyan-50 text-cyan-700 border-cyan-200",       dot: "bg-cyan-500" },
  kesz:        { label: "Kész",        pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  reklamacio:  { label: "Reklamáció",  pill: "bg-rose-50 text-rose-700 border-rose-200",       dot: "bg-rose-500" },
  torolve:     { label: "Törölve",     pill: "bg-stone-100 text-stone-400 border-stone-200",   dot: "bg-stone-300" },
};

// ── FSM-folyamatok típusonként ─────────────────────────────────────────────
// A `beszerelve` lépés CSAK ha a delivery `install:true`; egyébként kiszallitva → atadva.
const LOG_FLOWS = {
  delivery: {
    order: ["tervezett", "berakodva", "uton", "kiszallitva", "beszerelve", "atadva"],
    states: {
      tervezett:   { next: ["berakodva", "torolve"] },
      berakodva:   { next: ["uton", "tervezett"] },
      uton:        { next: ["kiszallitva"] },
      kiszallitva: { next: ["beszerelve", "atadva", "reklamacio"] },
      beszerelve:  { next: ["atadva", "reklamacio"] },
      atadva:      { next: ["reklamacio"], terminal: true },
      reklamacio:  { next: ["beszerelve", "atadva"] },
      torolve:     { next: [], terminal: true },
    },
  },
  pickup: {
    order: ["tervezett", "uton", "felveve", "beerkezett"],
    states: {
      tervezett:  { next: ["uton", "torolve"] },
      uton:       { next: ["felveve", "tervezett"] },
      felveve:    { next: ["beerkezett"] },
      beerkezett: { next: [], terminal: true },
      torolve:    { next: [], terminal: true },
    },
  },
  survey: {
    order: ["tervezett", "uton", "helyszinen", "kesz"],
    states: {
      tervezett:  { next: ["uton", "torolve"] },
      uton:       { next: ["helyszinen", "tervezett"] },
      helyszinen: { next: ["kesz"] },
      kesz:       { next: [], terminal: true },
      torolve:    { next: [], terminal: true },
    },
  },
};

// ── Ügyfél-oldali (webshop) leképezés — kevesebbet lát, mint a diszpécser ──
// 4 lépés: Ütemezve → Úton → Kiszállítva → Átadva
const LOG_CUSTOMER_STEPS = ["Ütemezve", "Úton", "Kiszállítva", "Átadva"];
const LOG_STATUS_TO_CUSTOMER = {
  tervezett: 0, berakodva: 0, uton: 1, kiszallitva: 2, beszerelve: 2, atadva: 3,
};

// ── Brigád-kompetenciák ────────────────────────────────────────────────────
const CREW_SKILLS = {
  szallit: { key: "szallit", label: "Szállítás", icon: "truck" },
  szerel:  { key: "szerel",  label: "Szerelés",  icon: "wrench" },
  felmer:  { key: "felmer",  label: "Felmérés",  icon: "ruler" },
};

// ── Reklamáció / hiány súlyosság ───────────────────────────────────────────
const LOG_DEFECT_SEV = {
  minor:    { label: "Kisebb",   pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  major:    { label: "Súlyos",   pill: "bg-rose-50 text-rose-700 border-rose-200",    dot: "bg-rose-500" },
};

// ── Járművek (rakodókapacitás) ─────────────────────────────────────────────
const VEHICLES_SEED = [
  { id: "veh-1", name: "Mercedes Sprinter", plate: "LMN-204", type: "Furgon",             capacityM3: 14, capacityKg: 1350, facilityId: "fac-vac" },
  { id: "veh-2", name: "MAN TGL platós",    plate: "KRT-887", type: "Platós teherautó",   capacityM3: 28, capacityKg: 5000, facilityId: "fac-vac" },
  { id: "veh-3", name: "Ford Transit",      plate: "BPX-541", type: "Furgon",             capacityM3: 11, capacityKg: 1100, facilityId: "fac-bp" },
];

// ── Szerelő-/sofőr-brigádok ────────────────────────────────────────────────
// A `memberIds` a HR dolgozói törzsre (sim.employees) mutat — EZ a forrás; a
// `members` string-lista vizuális fallback marad (ha nincs HR-modul betöltve).
const CREWS_SEED = [
  { id: "crew-1", name: "Beépítő brigád A", members: ["Nagy J.", "Kiss A."],     memberIds: ["emp-nagyj", "emp-kissa"],   skills: ["szallit", "szerel"],          facilityId: "fac-vac" },
  { id: "crew-2", name: "Beépítő brigád B", members: ["Tóth K.", "Horváth G."],  memberIds: ["emp-tothk", "emp-horvg"],   skills: ["szallit", "szerel"],          facilityId: "fac-vac" },
  { id: "crew-3", name: "Felmérő + sofőr",  members: ["Fekete P."],              memberIds: ["emp-feketep"],              skills: ["szallit", "felmer"],          facilityId: "fac-bp" },
];

// ── Seed fuvarok ───────────────────────────────────────────────────────────
// today (store) = 2026-04-28. A demók e körül szóródnak.
const SHIPMENTS_SEED = [
  // 1) Lezárt kiszállítás+telepítés (átadva) — múlt, teljes átadási csomaggal
  { id: "SH-2426-001", type: "delivery", status: "atadva", install: true,
    customer: "Hegyi Lakberendezés", address: "9400 Sopron, Várkerület 18.", contact: "Hegyi Krisztina", phone: "+36 99 312 444",
    date: "2026-04-24", windowStart: "08:00", windowEnd: "12:00", vehicleId: "veh-1", crewId: "crew-1",
    ref: "JT-2426-0180", refLabel: "Hegyi Lakberendezés — gardrób", loadM3: 6, loadKg: 420, note: "Emeleti lakás, lift van.",
    handover: { signedBy: "Hegyi Krisztina", signedAt: "2026-04-24 11:40", photos: 3, deficiencies: [], protocol: true },
    log: [{ at: "2026-04-24 07:55", text: "Berakodva (Vác — főüzem)" }, { at: "2026-04-24 11:40", text: "Átadva, jegyzőkönyv aláírva" }] },

  // 2) Ma — kiszállítás+telepítés, beszerelve, jármű+brigád, egy kisebb hiánnyal
  { id: "SH-2426-002", type: "delivery", status: "beszerelve", install: true,
    customer: "Bognár Bútor Kft.", address: "7621 Pécs, Király u. 22.", contact: "Bognár István", phone: "+36 72 412 333",
    date: "2026-04-28", windowStart: "09:00", windowEnd: "13:00", vehicleId: "veh-2", crewId: "crew-1",
    ref: "JT-2426-0184", refLabel: "Bognár — 16 fiókos konyhabútor", loadM3: 12, loadKg: 980, note: "Daru nem kell, földszint.",
    handover: { signedBy: "", signedAt: "", photos: 2, deficiencies: [{ text: "Egy fiókfront felülete karcos — csere ígérve.", sev: "minor" }], protocol: false },
    log: [{ at: "2026-04-28 08:30", text: "Berakodva" }, { at: "2026-04-28 10:05", text: "Helyszínre érkezett" }, { at: "2026-04-28 12:20", text: "Beszerelve" }] },

  // 3) Ma — kiszállítás úton (ütközés-demó: veh-2 ugyanazon a napon, átfedő ablak a #2-vel)
  { id: "SH-2426-003", type: "delivery", status: "uton", install: false,
    customer: "Pesti Ablakműhely", address: "1095 Budapest, Soroksári út 30.", contact: "Pesti Tamás", phone: "+36 1 422 100",
    date: "2026-04-28", windowStart: "11:00", windowEnd: "14:00", vehicleId: "veh-2", crewId: "crew-2",
    ref: "JT-2426-0179", refLabel: "Pesti Ablakműhely — polcrendszer", loadM3: 3, loadKg: 210, note: "",
    handover: { signedBy: "", signedAt: "", photos: 0, deficiencies: [], protocol: false },
    log: [{ at: "2026-04-28 10:40", text: "Elindult (Vác — főüzem)" }] },

  // 4) Jövő — kiszállítás+telepítés tervezett, projekt-install belépő
  { id: "SH-2426-004", type: "delivery", status: "tervezett", install: true,
    customer: "Doorstar Hungary Zrt.", address: "2600 Vác, Deák F. u. 5.", contact: "Kis Zoltán", phone: "+36 27 123 456",
    date: "2026-05-06", windowStart: "08:00", windowEnd: "16:00", vehicleId: "veh-2", crewId: "crew-2",
    ref: "JT-2426-0182", refLabel: "Doorstar — 8 beltéri ajtó", loadM3: 9, loadKg: 540, note: "Két emelet, lift nincs — pluszidő.",
    handover: { signedBy: "", signedAt: "", photos: 0, deficiencies: [], protocol: false },
    log: [] },

  // 5) Ma — beszállítás (INBOUND): saját fuvar a Falcóhoz lapanyagért, úton
  { id: "SH-2426-005", type: "pickup", status: "uton",
    customer: "Falco Sopron Zrt.", address: "9400 Sopron, Bánfalvi út 42.", contact: "Áru-átvétel", phone: "+36 99 511 200",
    date: "2026-04-28", windowStart: "13:00", windowEnd: "15:00", vehicleId: "veh-1", crewId: "crew-1",
    ref: "PO-2426-093", refLabel: "Bükk 18mm bútorlap — 50 tábla", loadM3: 18, loadKg: 1450, note: "Saját fuvar — nem ők hozzák.",
    handover: { signedBy: "", signedAt: "", photos: 0, deficiencies: [], protocol: false },
    log: [{ at: "2026-04-28 12:10", text: "Elindult a beszállítóhoz" }] },

  // 6) Jövő — felmérés (helyszíni bemérés), tervezett
  { id: "SH-2426-006", type: "survey", status: "tervezett",
    customer: "Várdai Konyhastúdió", address: "4025 Debrecen, Piac u. 51.", contact: "Várdai Eszter", phone: "+36 52 234 124",
    date: "2026-05-04", windowStart: "10:00", windowEnd: "12:00", vehicleId: "veh-3", crewId: "crew-3",
    ref: "", refLabel: "Konyha felmérés — ajánlat előtt", loadM3: 0, loadKg: 0, note: "Lézeres bemérés, fotódokumentáció.",
    handover: { signedBy: "", signedAt: "", photos: 0, deficiencies: [], protocol: false },
    log: [] },

  // 7) Kiadva külső partnernek (B2BHandshake) — kiszállítás, tervezett
  { id: "SH-2426-007", type: "delivery", status: "tervezett", install: true,
    customer: "Tóth Konyha & Társa", address: "6722 Szeged, Tisza Lajos krt. 9.", contact: "Tóth Béla", phone: "+36 62 555 333",
    date: "2026-05-08", windowStart: "09:00", windowEnd: "15:00", vehicleId: null, crewId: null,
    ref: "JT-2426-0177", refLabel: "Tóth Konyha — konyhabútor", loadM3: 10, loadKg: 720, note: "Távoli helyszín — kiadva fuvarpartnernek.",
    handshakeId: "HS-SH-007", delegatedTo: "Beépítő Csapat Kft.", delegatedExternal: false,
    handover: { signedBy: "", signedAt: "", photos: 0, deficiencies: [], protocol: false },
    log: [{ at: "2026-04-26 14:00", text: "Kiadva: Beépítő Csapat Kft. (kézfogás elküldve)" }] },
];

// ──────────────────────────────────────────────────────────────────────────
// LogEngine — tiszta számítások (FSM, ütközés, ügyfél-leképezés)
// ──────────────────────────────────────────────────────────────────────────
const LogEngine = {
  // a típus rendezett lépéslistája (install nélküli delivery-nél a "beszerelve" kimarad)
  steps(sh) {
    const flow = LOG_FLOWS[sh.type];
    if (!flow) return [];
    let order = flow.order.slice();
    if (sh.type === "delivery" && !sh.install) order = order.filter((s) => s !== "beszerelve");
    return order;
  },
  // engedélyezett-e az átmenet
  canGo(sh, to) {
    const flow = LOG_FLOWS[sh.type];
    if (!flow || !flow.states[sh.status]) return false;
    let allowed = flow.states[sh.status].next.slice();
    // install nélküli delivery: kiszallitva → ne kínálja a beszerelve-t
    if (sh.type === "delivery" && !sh.install) allowed = allowed.filter((s) => s !== "beszerelve");
    return allowed.includes(to);
  },
  nextStates(sh) {
    const flow = LOG_FLOWS[sh.type];
    if (!flow || !flow.states[sh.status]) return [];
    let allowed = flow.states[sh.status].next.slice();
    if (sh.type === "delivery" && !sh.install) allowed = allowed.filter((s) => s !== "beszerelve");
    return allowed;
  },
  isTerminal(sh) {
    const st = (LOG_FLOWS[sh.type] || {}).states || {};
    return !!(st[sh.status] && st[sh.status].terminal);
  },
  // ügyfél-lépés (webshop)
  customerStep(status) {
    return LOG_STATUS_TO_CUSTOMER[status] != null ? LOG_STATUS_TO_CUSTOMER[status] : 0;
  },
  // időablak átfedés (HH:MM)
  _toMin(t) { if (!t) return null; const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); },
  overlaps(a, b) {
    const a1 = this._toMin(a.windowStart), a2 = this._toMin(a.windowEnd);
    const b1 = this._toMin(b.windowStart), b2 = this._toMin(b.windowEnd);
    if (a1 == null || a2 == null || b1 == null || b2 == null) return true; // ablak nélkül → konzervatív ütközés
    return a1 < b2 && b1 < a2;
  },
  // ütközések: ugyanaz a jármű VAGY brigád, ugyanaznap, átfedő időablak
  conflicts(shipments) {
    const live = shipments.filter((s) => !["atadva", "beerkezett", "kesz", "torolve"].includes(s.status));
    const out = [];
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j];
        if (a.date !== b.date) continue;
        const sameVeh = a.vehicleId && b.vehicleId && a.vehicleId === b.vehicleId;
        const sameCrew = a.crewId && b.crewId && a.crewId === b.crewId;
        if ((sameVeh || sameCrew) && this.overlaps(a, b)) {
          out.push({ date: a.date, ids: [a.id, b.id], resource: sameVeh ? "vehicle" : "crew",
            resourceId: sameVeh ? a.vehicleId : a.crewId });
        }
      }
    }
    return out;
  },
  // egy fuvar ütközik-e bármivel
  conflictIdSet(shipments) {
    const set = {};
    this.conflicts(shipments).forEach((c) => c.ids.forEach((id) => { set[id] = true; }));
    return set;
  },
};

Object.assign(window, {
  LOG_TYPE_META, LOG_TYPE_ORDER, LOG_STATUS, LOG_FLOWS,
  LOG_CUSTOMER_STEPS, LOG_STATUS_TO_CUSTOMER, CREW_SKILLS, LOG_DEFECT_SEV,
  VEHICLES_SEED, CREWS_SEED, SHIPMENTS_SEED, LogEngine,
});
