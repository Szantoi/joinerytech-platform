// ──────────────────────────────────────────────────────────────────────────
// app-store.jsx — single source of truth for the simulated business.
//
// A tiny global observable store (same pattern as window.orderFlow) so every
// babel script can read/write it through the shared `window`. Cross-world
// actions ripple through one immutable state tree:
//
//   approveQuote → creates an Order
//   releaseOrder → creates a production Job, consumes Materials, logs a
//                  stock Movement, and (if stock drops below min) flags a
//                  low-stock event
//   receivePO    → increments Materials + logs a Bevét movement
//
// Messaging lives in the same store, so business events can post into the
// team hub, and any entity (order / product / job …) can be attached to a
// message or used to start a "visszakérdés" (ask-about) thread.
//
// State is persisted to localStorage and can be reset to the seed. React
// binds to it via useSim() (useSyncExternalStore).
// ──────────────────────────────────────────────────────────────────────────
(function () {
  const LS_KEY = "jt_sim_v63";
  const today = "2026-04-28";
  const clone = (x) => JSON.parse(JSON.stringify(x));

  // ── Ár-érettség osztályok (arazas-egyedi-kutatas.md — AACE-minta) ──
  //   band = alapértelmezett ±sáv %; a tételen rangePct felülírhatja.
  window.PRICE_CLASS_META = {
    fix:       { label: "Fix ár",    band: 0,  tone: "emerald", hint: "Katalógus / sablon / RFQ-nyertes — garantált ár." },
    kalkulalt: { label: "Kalkulált", band: 10, tone: "sky",     hint: "Becsült költség-alapból számolt ár — ±10% sáv." },
    iranyar:   { label: "Irányár",   band: 30, tone: "amber",   hint: "Irányösszeg (PS) — pontosítás a műszaki tervezés után, ±30% sáv." },
  };
  window.PRICE_CLASS_ORDER = ["iranyar", "kalkulalt", "fix"];

  // ── Catalog category schema (hierarchical) + typed property fields ──────────
  // Each category defines typed fields; child categories inherit ancestors'
  // fields and may add their own. Field types: text | number | select | bool |
  // date | color. This schema drives item creation AND the shop.
  const CAT_CATEGORIES_SEED = [
    { id: "cat-lemez", parentId: null, name: "Lemez", color: "#a8703a", fields: [
      { key: "vastagsag", label: "Vastagság", type: "number", unit: "mm" },
      { key: "meret", label: "Táblaméret", type: "text" },
      { key: "felulet", label: "Felület", type: "select", options: ["Nyers", "Melaminos", "Furnérozott", "Lakkozott"] },
      { key: "dekor", label: "Dekor szín", type: "color" },
    ] },
    { id: "cat-butorlap", parentId: "cat-lemez", name: "Bútorlap", color: "#b07d45", fields: [
      { key: "elkompat", label: "Él-kompatibilis", type: "bool" },
    ] },
    { id: "cat-melamin", parentId: "cat-butorlap", name: "Melaminos", color: "#b98a52", fields: [
      { key: "dekorkod", label: "Dekor kód", type: "text" },
    ] },
    { id: "cat-mdf", parentId: "cat-lemez", name: "MDF", color: "#9c7b54", fields: [
      { key: "nedves", label: "Nedvességálló", type: "bool" },
    ] },
    { id: "cat-elzaro", parentId: null, name: "Élzáró", color: "#5b8a72", fields: [
      { key: "szelesseg", label: "Szélesség", type: "number", unit: "mm" },
      { key: "vastagsag", label: "Vastagság", type: "number", unit: "mm" },
      { key: "anyag", label: "Anyag", type: "select", options: ["ABS", "PVC", "Akril", "Melamin"] },
      { key: "szin", label: "Szín", type: "color" },
    ] },
    { id: "cat-vasalat", parentId: null, name: "Vasalat", color: "#6b7280", fields: [
      { key: "tipus", label: "Típus", type: "select", options: ["Pánt", "Fiókcsúszó", "Fogantyú", "Emelő", "Egyéb"] },
      { key: "gyarto", label: "Gyártó", type: "text" },
      { key: "teher", label: "Teherbírás", type: "number", unit: "kg" },
      { key: "softclose", label: "Soft-close", type: "bool" },
    ] },
    { id: "cat-kotszer", parentId: null, name: "Kötszer", color: "#9a8c5a", fields: [
      { key: "meret", label: "Méret", type: "text" },
      { key: "anyag", label: "Anyag", type: "select", options: ["Acél", "Rozsdamentes", "Sárgaréz", "Horganyzott"] },
    ] },
    { id: "cat-tomorfa", parentId: null, name: "Tömörfa", color: "#8a5a2b", fields: [
      { key: "fafaj", label: "Fafaj", type: "select", options: ["Tölgy", "Bükk", "Dió", "Fenyő", "Kőris"] },
      { key: "vastagsag", label: "Vastagság", type: "number", unit: "mm" },
      { key: "minoseg", label: "Minőség", type: "select", options: ["A", "AB", "B", "Rusztikus"] },
    ] },
    { id: "cat-szolg", parentId: null, name: "Szolgáltatás", color: "#2f7d8c", fields: [
      { key: "egyseg", label: "Elszámolási egység", type: "select", options: ["óra", "fm", "m²", "db"] },
    ] },
    // ── Tervezés / Gyártás világ — CATALOG_LOOKUP anyagok (lapok, lemezek)
    { id: "cat-lapanyag", parentId: "cat-lemez", name: "Lapanyag (Tervezés)", color: "#b07d45", fields: [
      { key: "t",           label: "Vastagság (mm)",   type: "number", unit: "mm" },
      { key: "kind",        label: "Felhasználás",      type: "select", options: ["korpusz", "front", "hátlap", "tömör"] },
      { key: "lookupColor", label: "Megjelenítési szín", type: "color" },
    ] },
    // ── Tervezés / Gyártás / Beszerz. világ — HARDWARE_CATALOG szerkezeti vasalatok
    { id: "cat-szerv", parentId: "cat-vasalat", name: "Szerkezeti vasalat", color: "#556270", fields: [
      { key: "hardwareId",  label: "Belső vasalat-id",  type: "text" },
      { key: "softclose",   label: "Soft-close",        type: "bool" },
    ] },
    // ── Belsőépítészet világ — intCatProducts forrása
    { id: "cat-belso",        parentId: null,       name: "Belsőépítészet",       color: "#5b8a72", fields: [
      { key: "source", label: "Forrás / szállító", type: "text" },
      { key: "notes",  label: "Megjegyzés",         type: "text" },
    ] },
    { id: "cat-belso-anyag",    parentId: "cat-belso", name: "Alapanyag / minta",    color: "#9a8c5a", fields: [] },
    { id: "cat-belso-konyha",   parentId: "cat-belso", name: "Konyhabútor",          color: "#a8703a", fields: [] },
    { id: "cat-belso-gardrob",  parentId: "cat-belso", name: "Gardrób / beépített",  color: "#5b8a72", fields: [] },
    { id: "cat-belso-furdo",    parentId: "cat-belso", name: "Fürdőszobabútor",      color: "#2f7d8c", fields: [] },
    { id: "cat-belso-egyedi",   parentId: "cat-belso", name: "Egyedi bútor",         color: "#8a5a2b", fields: [] },
    { id: "cat-belso-burkolat", parentId: "cat-belso", name: "Burkolat / falpanel",  color: "#6b7280", fields: [] },
  ];
  const CAT_TAGS_SEED = ["Raktárról", "Rendelésre", "Akciós", "Új", "Kifutó", "Prémium", "Környezetbarát", "Bestseller"];

  const __catIdByName = {};
  CAT_CATEGORIES_SEED.forEach((c) => { __catIdByName[c.name] = c.id; });
  // Backfill new item fields (categoryId / typed props / tags / shop / active)
  // Visibility levels for all catalog items
  // public     — shop customers + all B2B partners see it
  // protected  — only authorized B2B partners (with permission)
  // private    — all internal worlds of this company
  // world-only — only the listed worlds (allowedWorlds[])
  const INT_TYPE_TO_CAT = {
    "it-anyag":    "Alapanyag / minta",
    "it-konyha":   "Konyhabútor",
    "it-gardrob":  "Gardrób / beépített",
    "it-furdo":    "Fürdőszobabútor",
    "it-egyedi":   "Egyedi bútor",
    "it-burkolat": "Burkolat / falpanel",
  };

  // ── Mezőszintű láthatóság ─────────────────────────────────────────────────
  // fieldVis: { fieldKey: "public"|"protected"|"private"|"world-only" }
  // fieldAllowedWorlds: { fieldKey: ["worldId", ...] }  — csak world-only esetén
  // STRIPPABLE mezők: price, supplier, suppliers, props
  const STRIPPABLE_FIELDS = ["price", "supplier", "suppliers", "props"];

  // canSeeField: can worldId see the given field of item?
  //   worldId = null → external/shop context (csak public mezők láthatók)
  function canSeeField(item, fieldKey, worldId) {
    const fv = (item.fieldVis || {})[fieldKey];
    if (!fv) return true; // nincs mező-szintű korlátozás
    if (worldId == null) return fv === "public"; // külső kontextus
    if (fv === "public" || fv === "protected" || fv === "private") return true;
    if (fv === "world-only") {
      const allowed = ((item.fieldAllowedWorlds || {})[fieldKey]) || [];
      return allowed.includes(worldId);
    }
    return true;
  }

  // stripFieldsForWorld: visszaad egy másolatot ahol a nem látható mezők hiányoznak
  function stripFieldsForWorld(item, worldId) {
    const out = { ...item };
    STRIPPABLE_FIELDS.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(out, f) && !canSeeField(item, f, worldId)) {
        delete out[f];
      }
    });
    // worldExt: csak a saját világ ext-je + amit láthat
    if (out.worldExt && worldId != null) {
      out.worldExt = { [worldId]: (item.worldExt || {})[worldId] };
    } else if (out.worldExt && worldId == null) {
      // külső: semmilyen worldExt nem látható
      delete out.worldExt;
    }
    return out;
  }

  function __normCatItem(it) {
    return {
      active: true,
      status: "active",
      props: {},
      tags: [],
      shop: { enabled: false, price: it.price, priceGross: Math.round((it.price || 0) * 1.27), desc: "", leadDays: 14, stockMode: "order", image: "" },
      categoryId: __catIdByName[it.cat] || null,
      visibility: "private",
      allowedWorlds: [],
      worldExt: {},
      fieldVis: {},
      fieldAllowedWorlds: {},
      ...it,
    };
  }

  // ── Seed ──────────────────────────────────────────────────────────────────
  const g = (name, fallback) => (typeof window !== "undefined" && window[name] !== undefined ? clone(window[name]) : (typeof eval("typeof " + name) !== "undefined" ? clone(eval(name)) : fallback));

  // ── ÜGYFÉL-PORTÁL projekt-betekintő demó (4.14) — Nagy Anna tervezési brief ──
  const CUSTOMER_PORTAL_DEMO_BRIEFS = [
    { id: "BRF-2426-009", scope: "quote", quoteId: "Q-2426-061", projectId: "PRJ-2026-014", lineUid: null, parentBriefId: null,
      name: "Petőfi u. 12. — Konyha + nappali", title: "Ajánlat — Petőfi u. 12.",
      site: "Nagy Anna — Petőfi u. 12.",
      fields: {
        func: "Nyitott konyha-nappali, sok rejtett tárolás, gyerekbarát kialakítás. L-alak, konyhasziget nélkül.",
        site: "L-alakú konyha, kürtő a sarokban, 270 cm belmagasság, gépészet a bal falon, panel-fal.",
        style: "Skandináv irány: világos tölgy + törtfehér, rejtett (push-to-open) fogantyúk, matt, könnyen tisztítható felületek.",
        users: "4 fős család, 2 kisgyerek.",
        special: "Lekerekített élek a gyerekek miatt, csúszásmentes, allergiabarát lakk.",
      },
      refs: [], 
      questions: [
        { id: "q-1", text: "A mosogatógép integrált front mögé kerüljön?", by: "Nagy Anna", ts: "2026-04-16 10:00", status: "lezart",
          answers: [{ text: "Igen, teljesen integrált, tölgy fronttal takarva.", by: "Lakberendezés Plusz", ts: "2026-04-16 14:00" }] },
      ],
      history: [
        { ts: "2026-04-15 09:00", who: "Szabó Anna", kind: "create", label: "Ajánlat brief létrehozva" },
        { ts: "2026-04-16 14:05", who: "Lakberendezés Plusz", kind: "field", label: "Stílus / anyag / szín pontosítva" },
      ],
      docId: "DOC-2426-001", createdBy: "Szabó Anna", createdAt: "2026-04-15", updatedAt: "2026-04-16" },
  ];

  function seed() {
    // Pull canonical datasets from the global data scripts so there is one
    // source of truth (kept in sync with QUOTE_LINES etc.). Falls back to
    // inline copies if a global is unavailable.
    const quotes = (typeof QUOTES !== "undefined") ? clone(QUOTES) : [];
    const orders = (typeof ORDERS !== "undefined") ? clone(ORDERS) : [];
    const materials = (typeof MATERIALS !== "undefined") ? clone(MATERIALS) : [];
    const customers = (typeof CUSTOMERS !== "undefined") ? clone(CUSTOMERS) : [];
    // ── ÜGYFÉL-PORTÁL projekt-betekintő demó (4.14) — Nagy Anna / PRJ-2026-014 ──
    //   Rendelés + ajánlatok + brief, hogy a vevő-portál Egyedi → projekt-detail
    //   minden füle (MAG/kereskedelmi) tartalommal demonstrálható legyen.
    if (!quotes.find((q) => q.id === "Q-2426-061")) quotes.unshift(
      { id: "Q-2426-061", customer: "Nagy Anna", date: "2026-04-15", expires: "2026-04-29", value: 4_428_000, status: "approved", items: 3, owner: "Szabó A.", projectRef: "PRJ-2026-014" },
      { id: "Q-2426-062", customer: "Nagy Anna", date: "2026-04-24", expires: "2026-05-08", value: 360_000,   status: "sent",     items: 2, owner: "Szabó A.", projectRef: "PRJ-2026-014" },
    );
    if (!orders.find((o) => o.id === "JT-2426-0185")) orders.unshift(
      { id: "JT-2426-0185", customer: "Nagy Anna", type: "cabinet", date: "2026-04-18", status: "released", total: 4_428_000, items: 3, projectId: "PRJ-2026-014", source: "project", fromQuote: "Q-2426-061",
        lines: [
          { name: "Konyhabútor (alsó + felső sor)", code: "KO-185-01", qty: 1, unit: "klt", price: 2_180_000 },
          { name: "Nappali szekrénysor",           code: "NA-185-02", qty: 1, unit: "klt", price: 1_240_000 },
          { name: "6 db beltéri ajtó",              code: "AJ-185-03", qty: 6, unit: "db",  price: 168_000 },
        ] },
    );
    return {
      v: 46,
      quotes,
      orders,
      briefs: (typeof CUSTOMER_PORTAL_DEMO_BRIEFS !== "undefined") ? clone(CUSTOMER_PORTAL_DEMO_BRIEFS) : [],
      briefSeq: 9,
      materials,
      customers,
      // ── REKLAMÁCIÓ világ ── (szerviz-jegyek; FSM a jegyen)
      serviceTickets: (typeof SERVICE_TICKETS_SEED !== "undefined") ? clone(SERVICE_TICKETS_SEED) : [],
      svcSeq: 5,
      // ── LOGISZTIKA világ ── (fuvarok + járművek + brigádok)
      shipments: (typeof SHIPMENTS_SEED !== "undefined") ? clone(SHIPMENTS_SEED) : [],
      vehicles:  (typeof VEHICLES_SEED !== "undefined") ? clone(VEHICLES_SEED) : [],
      crews:     (typeof CREWS_SEED !== "undefined") ? clone(CREWS_SEED) : [],
      shipSeq: 7,
      // ── KONTROLLING világ ── (számított; config + kézi korrekciók)
      ctrlConfig: (typeof CTRL_DEFAULTS !== "undefined") ? clone(CTRL_DEFAULTS) : {},
      ctrlAdjustments: (typeof CTRL_ADJ_SEED !== "undefined") ? clone(CTRL_ADJ_SEED) : [],
      ctrlAdjSeq: 6,
      // ── HR / MUNKAERŐ-KAPACITÁS világ ── (dolgozók = forrás; FSM a távollét-kérelmen)
      employees:   (typeof EMPLOYEES_SEED !== "undefined") ? clone(EMPLOYEES_SEED) : [],
      absences:    (typeof ABSENCES_SEED !== "undefined") ? clone(ABSENCES_SEED) : [],
      assignments: (typeof HR_ASSIGNMENTS_SEED !== "undefined") ? clone(HR_ASSIGNMENTS_SEED) : [],
      timeLogs:    (typeof HR_TIMELOGS_SEED !== "undefined") ? clone(HR_TIMELOGS_SEED) : [],
      hrSeq: 12, absSeq: 7, asgSeq: 7, tlSeq: 12,
      // ── KARBANTARTÁS / ESZKÖZGAZDÁLKODÁS világ ── (eszköz-törzs = forrás; FSM a munkalapon)
      assets:      (typeof ASSETS_SEED !== "undefined") ? clone(ASSETS_SEED) : [],
      workOrders:  (typeof WORKORDERS_SEED !== "undefined") ? clone(WORKORDERS_SEED) : [],
      maintPlans:  (typeof MAINT_PLANS_SEED !== "undefined") ? clone(MAINT_PLANS_SEED) : [],
      downtime:    (typeof DOWNTIME_SEED !== "undefined") ? clone(DOWNTIME_SEED) : [],
      assetSeq: 11, woSeq: 18, planSeq: 8, dtSeq: 4,
      // ── CRM / LEAD-PIPELINE világ ── (lead + opportunity FSM; feladatok SLA-val)
      leads:         (typeof LEADS_SEED !== "undefined") ? clone(LEADS_SEED) : [],
      opportunities: (typeof OPPS_SEED !== "undefined") ? clone(OPPS_SEED) : [],
      crmTasks:      (typeof CRM_TASKS_SEED !== "undefined") ? clone(CRM_TASKS_SEED) : [],
      leadSeq: 6, oppSeq: 6, crmTaskSeq: 6,
      // ── MINŐSÉGBIZTOSÍTÁS világ ── (átadás ELŐTTI minőség; FSM az ellenőrzésen)
      qaInspections: (typeof QA_INSPECTIONS_SEED !== "undefined") ? clone(QA_INSPECTIONS_SEED) : [],
      qaSeq: 6,
      // ── MUNKAVÉDELEM / EHS világ ── (üzemi munkavédelem; incidens-FSM + kockázat + oktatás)
      ehsIncidents: (typeof EHS_INCIDENTS_SEED !== "undefined") ? clone(EHS_INCIDENTS_SEED) : [],
      ehsIncSeq: 4,
      ehsRisks: (typeof EHS_RISKS_SEED !== "undefined") ? clone(EHS_RISKS_SEED) : [],
      ehsRiskSeq: 5,
      ehsTrainings: (typeof EHS_TRAININGS_SEED !== "undefined") ? clone(EHS_TRAININGS_SEED) : [],
      ehsTrainSeq: 12,
      // ── PARTNER-KAPCSOLAT NÉZET ── (perm-mentes profil-map + belső jegyzetek)
      partnerProfiles: {
        "Falco Sopron Zrt.":   { rating: 5, reliability: "kiváló", status: "active" },
        "Egger Faipari Kft.":  { rating: 4, reliability: "megbízható", status: "active" },
        "Profi Lapszabász Kft.": { rating: 4, reliability: "megbízható", status: "active" },
      },
      partnerNotes: [
        { id: "pn-seed1", partner: "Falco Sopron Zrt.", text: "Gyors visszajelzés, készletről szállít. Stratégiai beszállító a tölgy/bükk frontlapokra.", by: "Szabó Anna", ts: "2026-04-20 10:15" },
        { id: "pn-seed2", partner: "Egger Faipari Kft.", text: "MDF-re a legjobb ár, de élzáróra drágább. Mennyiségi kedvezmény 50 tábla felett.", by: "Szabó Anna", ts: "2026-04-18 14:30" },
      ],
      // ── MŰSZAKI TERVEZÉS — sablon-műhely ── (FSM a sablonon: vazlat → ellenorzes →
      //    kiadott → archivalt; CSAK a kiadott kerül a feloldó-registry-be —
      //    lsd. syncTemplateRegistry. design.engineer jog.)
      designTemplates: (typeof DESIGN_TEMPLATES_SEED !== "undefined") ? clone(DESIGN_TEMPLATES_SEED) : [],
      dtplSeq: 10,
      // ── VÁZ-SABLON KÖNYVTÁR ── (§21.5: a referenciasík-réteg önálló, névvel
      //    mentett sablonja — korpusz / ajtó-front / sarokszekrény; design.engineer)
      skeletonPresets: (typeof window !== "undefined" && window.SKELETON_PRESETS_SEED) ? clone(window.SKELETON_PRESETS_SEED) : [],
      skelSeq: 3,
      // ── MŰSZAKI ÉL-SPECIFIKÁCIÓ ── (gér/szög él-jelölés a sablon-alkatrészen;
      //    a DÖNTÉS a műszaki tervezésé — woodwork_domain §18.3/§19. Kulcs: "tplId|partName".
      //    short/long = gérelt/szögbe vágott RÖVID ill. HOSSZÚ élek száma (0–2).)
      partMiters: {
        "T-01|Felső lap":     { short: 2, long: 0, note: "Gérelt sarok-kötés az oldallapokkal (pár)" },
        "T-01|Bal oldallap":  { short: 1, long: 0, note: "Felső él gérben — pár: felső lap" },
        "T-01|Jobb oldallap": { short: 1, long: 0, note: "Felső él gérben — pár: felső lap" },
      },
      // ── DOKUMENTUMTÁR világ ── (verziózott dokumentum-regiszter; FSM a dokumentumon)
      documents: (typeof DOCUMENTS_SEED !== "undefined") ? clone(DOCUMENTS_SEED) : [],
      docSeq: 8,
      // ── IDŐ & JELENLÉT világ ── (napi jelenlét; a dolgozó = HR, ide csak hivatkozik)
      attendance: (typeof ATTENDANCE_SEED !== "undefined") ? clone(ATTENDANCE_SEED) : [],
      attSeq: 12,
      // ── BESZÁLLÍTÓI AJÁNLATKÉRÉS (RFQ) ── (Beszerzés képernyő; a PO ELÉ fűzve; FSM az RFQ-n)
      rfqs: (typeof RFQ_SEED !== "undefined") ? clone(RFQ_SEED) : [],
      rfqSeq: 4,
      // ── LELTÁR / KÉSZLET-REVÍZIÓ ── (Raktár képernyő; a lot-modellre ül; FSM a leltáron)
      stocktakes: (typeof STOCKTAKE_SEED !== "undefined") ? clone(STOCKTAKE_SEED) : [],
      stkSeq: 2,
      // ── GYÁRTÁSÜTEMEZÉS / VÉGES KAPACITÁS ── (Gyártás képernyő; gép-nap terhelés; FSM a taskon)
      prodTasks: (typeof PRODTASK_SEED !== "undefined") ? clone(PRODTASK_SEED) : [],
      prodTaskSeq: 8,
      // ── AI MUNKATERÜLET ── (skills/agents/memory + projekt system prompt; brandContext-fogyasztó)
      aiSkills: (typeof AI_SKILLS_SEED !== "undefined") ? clone(AI_SKILLS_SEED) : [],
      aiAgents: (typeof AI_AGENTS_SEED !== "undefined") ? clone(AI_AGENTS_SEED) : [],
      aiMemory: (typeof AI_MEMORY_SEED !== "undefined") ? clone(AI_MEMORY_SEED) : [],
      aiProjectPrompt: "",
      aiSkillSeq: 7, aiAgentSeq: 4, aiMemSeq: 6,
      // ── HATÁSKÖR-MÁTRIX / JÓVÁHAGYÁSI LIMITEK ── (4.8-B2; érték-küszöbök a perm fölött)
      authConfig: (typeof AUTH_CONFIG_DEFAULT !== "undefined") ? { ...AUTH_CONFIG_DEFAULT } : { poValue: 600000, voidValue: 800000, discountPct: 15 },
      approvals: (typeof APPROVALS_SEED !== "undefined") ? clone(APPROVALS_SEED) : [],
      apprSeq: 2,
      // ── SZERZŐDÉS + ÜTEMEZETT SZÁMLÁZÁS ── (4.8-B3; Projektek ↔ Pénzügy híd)
      contracts: (typeof CONTRACTS_SEED !== "undefined") ? clone(CONTRACTS_SEED) : [],
      ctrSeq: 2,
      concepts: (typeof CONCEPTS_SEED !== "undefined") ? clone(CONCEPTS_SEED) : [],
      intCatTypes: (typeof INT_TYPES_SEED !== "undefined") ? clone(INT_TYPES_SEED) : [],
      // intCatProducts is derived from catalog items with worldExt.interior (see getState)
      worldCatalogPins: {},  // { worldId: [{ id, label, filterType, filterValue }] }
      partnerPricing: (typeof PARTNER_PRICING_SEED !== "undefined") ? clone(PARTNER_PRICING_SEED) : [],
      specCategories: (typeof SPEC_CATEGORIES_SEED !== "undefined") ? clone(SPEC_CATEGORIES_SEED) : [],
      styles:    (typeof STYLES_SEED !== "undefined") ? clone(STYLES_SEED) : [],
      techSpecs: (typeof TECHSPECS_SEED !== "undefined") ? clone(TECHSPECS_SEED) : [],
      catCategories: clone(CAT_CATEGORIES_SEED),
      catTags: clone(CAT_TAGS_SEED),
      // ── KERESKEDELEM világ ──
      tradeCategories: (typeof TRADE_CATEGORIES !== "undefined") ? clone(TRADE_CATEGORIES) : [],
      tradeProducts:   (typeof TRADE_PRODUCTS !== "undefined") ? clone(TRADE_PRODUCTS) : [],
      tradeServices:   (typeof TRADE_SERVICES !== "undefined") ? clone(TRADE_SERVICES) : [],
      tradeSales:      (typeof TRADE_SALES !== "undefined") ? clone(TRADE_SALES) : [],
      tradeServiceRates: (typeof TRADE_SERVICE_RATES_SEED !== "undefined") ? clone(TRADE_SERVICE_RATES_SEED) : null,
      cuttingOrders:   (typeof CUTTING_ORDERS !== "undefined") ? clone(CUTTING_ORDERS) : [],
      tradeSeq: 19,
      cutSeq: 32,
      // ── PÉNZÜGY világ ── (kimenő + bejövő számlák egy listában, kifizetések külön)
      finInvoices: [].concat(
        (typeof FIN_INVOICES_OUT !== "undefined") ? clone(FIN_INVOICES_OUT) : [],
        (typeof FIN_INVOICES_IN  !== "undefined") ? clone(FIN_INVOICES_IN)  : []
      ),
      finPayments: (typeof FIN_PAYMENTS !== "undefined") ? clone(FIN_PAYMENTS) : [],
      finSeq: 44,
      finPmtSeq: 10,
      movements: [
        { date: "2026-04-27 14:32", type: "Kivét",   src: "CP-184-A", who: "Nagy J.", mat: "Bükk 18mm 2440×1830", qty: -8, unit: "tábla", note: "JT-2426-0184 · Bognár" },
        { date: "2026-04-27 11:48", type: "Maradék", src: "CP-184-A", who: "Nagy J.", mat: "Bükk 18mm 1200×380",  qty: +1, unit: "darab", note: "OC-002 raktárba" },
        { date: "2026-04-27 09:15", type: "Bevét",   src: "PO-2426-088", who: "Kiss Z.", mat: "MDF 16mm fehér", qty: +40, unit: "tábla", note: "Egger szállítás" },
      ],
      jobs: [
        { id: "FE-2426-184", title: "16-fiókos konyhabútor", customer: "Bognár Bútor Kft.", order: "JT-2426-0184", stage: "production", due: "2026-05-08", sheets: 12, status: "running" },
      ],
      // Szabászat-nesting (4.7-A) — kiadott tételek alkatrész-listái + maradékanyag-raktár.
      nestJobs: (typeof NEST_JOBS_SEED !== "undefined") ? clone(NEST_JOBS_SEED) : [],
      nestPlans: [],
      offcuts: (typeof OFFCUT_SEED !== "undefined") ? clone(OFFCUT_SEED) : [],
      nestSeq: 184,
      offcutSeq: 6,
      pos: [
        // Megrendelés-vázlatok (draft) — szállító alá gyűjtve, összevonhatók (4.8-A1)
        { id: "PO-2426-D01", supplier: "Falco Sopron Zrt.", material: "Bükk 18mm bútorlap", qty: 30, eta: "2026-05-12", status: "draft", note: "Forrás: PR-2426-026", sourceRef: "PR-2426-026",
          total: 30 * 18200, lines: [{ material: "Bükk 18mm bútorlap", matCode: "BK-018-2440", itemId: "wh-001", qty: 30, unit: "tábla", price: 18200 }] },
        { id: "PO-2426-D02", supplier: "Falco Sopron Zrt.", material: "Tölgy 22mm bútorlap", qty: 20, eta: "2026-05-12", status: "draft", note: "Forrás: JT-2426-0184", sourceRef: "JT-2426-0184", approvalPending: true,
          total: 20 * 31600, lines: [{ material: "Tölgy 22mm bútorlap", matCode: "TL-022-2440", itemId: "wh-002", qty: 20, unit: "tábla", price: 31600 }] },
        { id: "PO-2426-D03", supplier: "Blum Hungária", material: "Blum CLIP top csukópánt", qty: 200, eta: "2026-05-10", status: "draft", note: "Forrás: PR-2426-030", sourceRef: "PR-2426-030",
          total: 200 * 1420, lines: [{ material: "Blum CLIP top csukópánt", matCode: "VS-BL-CT", itemId: "wh-005", qty: 200, unit: "db", price: 1420 }] },
        { id: "PO-2426-093", supplier: "Falco Sopron Zrt.", material: "Bükk 18mm bútorlap", itemId: "wh-001", qty: 50, unit: "tábla", unitPrice: 17900, eta: "2026-05-02", status: "running", ackAt: "2026-04-25", shipped: true, shippedAt: "2026-04-27", promiseDate: "2026-05-02", projectNo: "PRJ-2426-012", projectName: "Bognár konyhabútor", total: 50 * 17900, lines: [{ material: "Bükk 18mm bútorlap", matCode: "BK-018-2440", itemId: "wh-001", qty: 50, unit: "tábla", price: 17900 }], supplierLog: [{ at: "2026-04-25 09:10", text: "Visszaigazolva — vállalt szállítás: 2026-05-02" }, { at: "2026-04-27 14:30", text: "Feladva (ASN — szállítási értesítő)" }] },
        { id: "PO-2426-094", supplier: "Falco Sopron Zrt.", material: "Tölgy 22mm bútorlap", itemId: "wh-002", qty: 20, unit: "tábla", unitPrice: 32100, eta: "2026-04-29", status: "running", ackAt: "2026-04-22", shipped: true, shippedAt: "2026-04-24", promiseDate: "2026-04-29", invoiceId: "SINV-2426-045", total: 20 * 32100, lines: [{ material: "Tölgy 22mm bútorlap", matCode: "TL-022-2440", itemId: "wh-002", qty: 20, unit: "tábla", price: 32100 }], supplierLog: [{ at: "2026-04-22 10:00", text: "Visszaigazolva" }, { at: "2026-04-24 16:00", text: "Feladva (ASN — szállítási értesítő)" }, { at: "2026-04-26 09:00", text: "Számla benyújtva (SINV-2426-045)" }] },
        { id: "PO-2426-092", supplier: "Rehau Hungária", material: "ABS élzáró 2mm fehér", itemId: "wh-004", qty: 300, eta: "2026-05-01", status: "running" },
        { id: "PO-2426-091", supplier: "Egger Faipari Kft.", material: "Tölgy 22mm bútorlap", itemId: "wh-002", qty: 30, eta: "2026-04-30", status: "running" },
        { id: "PO-2426-090", supplier: "Blum Hungária", material: "Blum CLIP top csukópánt", itemId: "wh-005", qty: 200, eta: "2026-04-29", status: "running" },
      ],
      // ── Raktárhely-hierarchia konfiguráció (mely szinteket kezeli a cég) ──
      // Raktár + Tároló KÖTELEZŐ (mandatory), a többi opcionális.
      warehouseCfg: { levels: { telephely: true, raktar: true, helyiseg: false, tarolo: true, rekesz: false } },
      // ── Raktárhely-regiszter (a fizikai helyek, telephely = facilityId) ──
      warehouseLocations: [
        { id: "loc-r1a1", facilityId: "fac-vac",  raktar: "R1", helyiseg: "",         tarolo: "A1",   rekesz: "" },
        { id: "loc-r1a3", facilityId: "fac-vac",  raktar: "R1", helyiseg: "",         tarolo: "A3",   rekesz: "" },
        { id: "loc-r2b1", facilityId: "fac-vac",  raktar: "R2", helyiseg: "Laptár",   tarolo: "B1",   rekesz: "" },
        { id: "loc-pe01", facilityId: "fac-szek", raktar: "P",  helyiseg: "",         tarolo: "E-01", rekesz: "" },
        { id: "loc-v03",  facilityId: "fac-szek", raktar: "V",  helyiseg: "Vasalat", tarolo: "03",   rekesz: "" },
        { id: "loc-v05",  facilityId: "fac-szek", raktar: "V",  helyiseg: "Vasalat", tarolo: "05",   rekesz: "" },
      ],
      // ── Kivét-kérelmek (FSM: kért → komissiózva → kiadva) ──
      withdrawals: [
        { id: "WD-2426-031", consumer: "gyartas", ref: "JT-2426-0184", refLabel: "Bognár — 16 fiókos konyhabútor", status: "komissiozva", requestedBy: "Nagy J.", requestedAt: "2026-04-27 08:10",
          lines: [ { itemId: "wh-005", code: "VS-BL-CT", name: "Blum CLIP top csukópánt", qty: 60, unit: "db" } ], note: "Korpusz pántok a 2-es szerelősorhoz." },
        { id: "WD-2426-030", consumer: "shop", ref: "WEB-1042", refLabel: "Webshop rendelés #1042", status: "kert", requestedBy: "Bolt", requestedAt: "2026-04-26 15:40",
          lines: [ { itemId: "wh-003", code: "MDF-016-W", name: "MDF 16mm fehér melamin", qty: 12, unit: "tábla" } ], note: "" },
        { id: "WD-2426-029", consumer: "gyartas", ref: "JT-2426-0180", refLabel: "Hegyi Lakberendezés", status: "kiadva", requestedBy: "Tóth K.", requestedAt: "2026-04-25 09:30", issuedAt: "2026-04-25 11:05",
          lines: [ { itemId: "wh-001", code: "BK-018-2440", name: "Bükk 18mm bútorlap", qty: 4, unit: "tábla" } ], note: "" },
      ],
      whSeq: 32,
      // ── Beszállítói cikk-megfeleltetés ───────────────────────────────────
      // A külső beszállító SAJÁT cikkszáma + megnevezése → a MI katalógus tételünk.
      // A beszerzés a rendeléskor rögzíti; a raktár a bevételezéskor ebből oldja fel,
      // hogy a szállítólevélen szereplő idegen megnevezés melyik saját tételünk.
      supplierMap: [
        { id: "sm-1", supplierName: "Falco Sopron Zrt.", supplierSku: "FAL-BUK-18-2800", supplierLabel: "Buche Möbelplatte 18mm 2800×2070", catalogItemId: "wh-001", note: "" },
        { id: "sm-2", supplierName: "Falco Sopron Zrt.", supplierSku: "FAL-EIC-22-2800", supplierLabel: "Eiche Möbelplatte 22mm", catalogItemId: "wh-002", note: "" },
        { id: "sm-3", supplierName: "Egger Faipari Kft.", supplierSku: "EGG-W980-ST2-16", supplierLabel: "W980 ST2 Premiumweiß 16mm", catalogItemId: "wh-003", note: "Melamin, ST2 struktúra" },
        { id: "sm-4", supplierName: "Rehau Hungária", supplierSku: "REH-23X2-W", supplierLabel: "RAUKANTEX ABS 23×2 weiß", catalogItemId: "wh-004", note: "" },
        { id: "sm-5", supplierName: "Blum Hungária", supplierSku: "71B3550", supplierLabel: "CLIP top BLUMOTION 110° Topfscharnier", catalogItemId: "wh-005", note: "" },
        { id: "sm-6", supplierName: "Blum Hungária", supplierSku: "560H5000B", supplierLabel: "TANDEM plus BLUMOTION 560H", catalogItemId: "wh-006", note: "" },
        // N:1 — a beszállító másik cikkszáma UGYANARRA a saját tételünkre (más kiszerelés)
        { id: "sm-7", supplierName: "Egger Faipari Kft.", supplierSku: "EGG-W980-16-KIS", supplierLabel: "W980 ST2 kistábla 16mm", catalogItemId: "wh-003", note: "Nálunk ugyanaz a tétel (N:1)" },
        // 1:N — a beszállító EGY szett-cikke több saját tételre bontva, szorzóval
        { id: "sm-8", supplierName: "Blum Hungária", supplierSku: "ZBOX-SET-500", supplierLabel: "BOX szett (1 fiók + 2 pánt)", catalogItemId: "wh-006",
          targets: [{ catalogItemId: "wh-006", factor: 1 }, { catalogItemId: "wh-005", factor: 2 }], note: "1 szettből 1 fiókcsúszó + 2 csukópánt (1:N)" },
        // SZETT / KIT — összetett rendelési tétel: 1 konténer szerelvénye több komponensből
        { id: "sm-9", supplierName: "Häfele Hungary", supplierSku: "KONT-3F-SET", supplierLabel: "Konténer 3-fiókos szerelvény-szett", catalogItemId: "wh-007", kit: true,
          targets: [{ catalogItemId: "wh-007", factor: 1 }, { catalogItemId: "wh-008", factor: 3 }, { catalogItemId: "wh-006", factor: 3 }],
          note: "1 konténer = 1 zár + 3 fiók doboz + 3 sín" },
        // MÉRTÉKEGYSÉG-ÁTVÁLTÁS — a beszállító TÁBLÁBAN tartja nyilván, mi m²-ben (1 tábla = 5,796 m²)
        // Laminált forgácslap: szabványos méret (2800×2070), ritka az eltérés → változó: false
        { id: "sm-10", supplierName: "Falco Sopron Zrt.", supplierSku: "FAL-BUK-18-2800", supplierLabel: "Buche Möbelplatte 18mm 2800×2070", catalogItemId: "wh-011",
          supplierUnit: "tábla", targets: [{ catalogItemId: "wh-011", factor: 5.796 }], sheet: { w: 2800, l: 2070, variable: false },
          note: "1 tábla (2800×2070) = 5,796 m²" },
        // Rétegelt lemez: a méret VÁLTOZÓ → a tényleges szél×hossz adja az m²-t bevételezéskor
        { id: "sm-11", supplierName: "Falco Sopron Zrt.", supplierSku: "FAL-NYIR-18", supplierLabel: "Nyír rétegelt lemez 18mm", catalogItemId: "wh-012",
          supplierUnit: "tábla", targets: [{ catalogItemId: "wh-012", factor: 2.9768 }], sheet: { w: 2440, l: 1220, variable: true },
          note: "Névleges 2440×1220, de a méret táblánként változhat" },
        // VARIÁNS-AWARE megfeleltetés — a beszállítói cikk egy konkrét VARIÁNSRA mutat
        { id: "sm-12", supplierName: "Blum Hungária", supplierSku: "ZB-ANT-450-W", supplierLabel: "Antaro Zargen 450mm seidenweiss", catalogItemId: "wh-013-b",
          supplierUnit: "pár", note: "Konkrét variáns: 450 mm · fehér" },
      ],
      smSeq: 12,
      // ── BESZERZÉSI KATALÓGUS (NEM a globális katalógus!) ───────────────────────
      // A beszerzés saját törzse: minden, amit a cég működése közben KÜLSŐ partnertől
      // VAGY elszeparált BELSŐ egységtől kell megigényelni, és követni a folyamatot a
      // bevételezésig. Forrás-típusok (source.kind): supplier = külső szállító;
      // work = külső munka/szolgáltatás (festés, szobrászat, CNC bérmunka); internal_unit
      // = elszeparált belső cégegység (pl. lakatos üzem). A `group:true` = gyűjtő cikkszám.
      // A catalogItemId opcionális: anyag/vasalat a saját raktári tételre mutat, a TISZTA
      // szolgáltatás/külső munka standalone (nincs raktári tétel). Innen indul az igénylés.
      procCatalog: [
        // Külső szállító — anyag / vasalat (a saját raktári tételre mutat)
        { id: "pc-01", code: "BSZ-LAP-BUK18", name: "Bükk 18mm tábla", kind: "material", unit: "tábla", cat: "Lapanyag", catalogItemId: "wh-001", group: false, active: true,
          sources: [ { kind: "supplier", name: "Falco Sopron Zrt.", price: 17900, leadDays: 5 }, { kind: "supplier", name: "Kronospan HU Zrt.", price: 18200, leadDays: 3 } ] },
        { id: "pc-02", code: "BSZ-LAP-TL22", name: "Tölgy 22mm tábla", kind: "material", unit: "tábla", cat: "Lapanyag", catalogItemId: "wh-002", group: false, active: true,
          sources: [ { kind: "supplier", name: "Egger Faipari Kft.", price: 31800, leadDays: 5 }, { kind: "supplier", name: "Falco Sopron Zrt.", price: 32100, leadDays: 4 } ] },
        { id: "pc-03", code: "BSZ-EZ-ABS22", name: "ABS élzáró 22mm tölgy", kind: "material", unit: "fm", cat: "Élzáró", catalogItemId: "wh-004", group: false, active: true,
          sources: [ { kind: "supplier", name: "Rehau Hungária", price: 220, leadDays: 7 }, { kind: "supplier", name: "Döllken HU", price: 235, leadDays: 5 } ] },
        { id: "pc-04", code: "BSZ-VAS-CLIP", name: "Blum CLIP top 110° pánt", kind: "hardware", unit: "db", cat: "Vasalat", catalogItemId: "wh-005", group: false, active: true,
          sources: [ { kind: "supplier", name: "Blum Hungária", price: 1240, leadDays: 4 } ] },
        // Külső munka / szolgáltatás — nincs saját raktári tétel (catalogItemId: null)
        { id: "pc-05", code: "BSZ-MUNKA-FEST", name: "Lakkozás / festés (külső)", kind: "work", unit: "m²", cat: "Külső munka", catalogItemId: null, group: false, active: true,
          sources: [ { kind: "work", name: "Felület Stúdió Kft.", partnerId: "pt-fest", price: 4200, leadDays: 6 } ] },
        { id: "pc-06", code: "BSZ-MUNKA-SZOBR", name: "Szobrászat / faragás (egyedi)", kind: "work", unit: "db", cat: "Külső munka", catalogItemId: null, group: false, active: true,
          sources: [ { kind: "work", name: "Helyi Asztalos Műhely", partnerId: "pt-ext", price: null, leadDays: 14 } ] },
        { id: "pc-07", code: "BSZ-MUNKA-CNC", name: "CNC bérmegmunkálás", kind: "work", unit: "óra", cat: "Külső munka", catalogItemId: null, group: false, active: true,
          sources: [ { kind: "work", name: "CNC Bérmunka Stúdió", partnerId: "pt-cnc", price: 8900, leadDays: 5 } ] },
        // Elszeparált BELSŐ egységtől (pl. lakatos üzem) — minden egy helyen, igénylésen át
        { id: "pc-08", code: "BSZ-BELSO-VASLAB", name: "Vaslábak — fekete acél", kind: "hardware", unit: "db", cat: "Belső egység", catalogItemId: null, group: false, active: true,
          sources: [ { kind: "internal_unit", name: "Lakatos üzem", unitId: "fac-lakatos", price: 3800, leadDays: 4 } ] },
        { id: "pc-09", code: "BSZ-BELSO-KERET", name: "Fém keretszerkezet", kind: "hardware", unit: "db", cat: "Belső egység", catalogItemId: null, group: false, active: true,
          sources: [ { kind: "internal_unit", name: "Lakatos üzem", unitId: "fac-lakatos", price: 12400, leadDays: 7 } ] },
        // Gyűjtő cikkszám (collective) — egy igénylési ernyő több beszerezhető alá
        { id: "pc-10", code: "BSZ-GY-KONYHAVAS", name: "Konyha vasalat-csomag (gyűjtő)", kind: "group", unit: "klt", cat: "Vasalat", catalogItemId: null, group: true, members: ["pc-04"], active: true,
          sources: [ { kind: "supplier", name: "Blum Hungária", price: null, leadDays: 5 } ] },
      ],
      procSeq: 10,
      convos: [
        { id: "sys", kind: "system", name: "Rendszer", channel: "internal", unread: 0,
          messages: [ { id: 1, from: "Rendszer", initials: "R", text: "Itt jelennek meg az automatikus folyamat-események.", ts: "08:00", me: false, system: true } ] },
        { id: "ch-prod", kind: "channel", name: "Gyártás", channel: "internal", members: 9, unread: 2,
          messages: [
            { id: 1, from: "Nagy Anna", initials: "NA", text: "A Holzma vágóterv kész, indíthatjuk a Petőfi rendelést?", ts: "08:42", me: false },
            { id: 2, from: "Tóth Béla", initials: "TB", text: "Igen, az anyag be van készítve a 2-es géphez.", ts: "08:45", me: false },
          ] },
        { id: "ch-field", kind: "channel", name: "Helyszíni szerelők", channel: "whatsapp", members: 5, unread: 1,
          messages: [ { id: 1, from: "Kiss Zoltán", initials: "KZ", text: "A Petőfi u. beépítés kész, küldöm a fotókat. 📷", ts: "09:10", me: false } ] },
        { id: "dm-szabo", kind: "dm", name: "Szabó Gábor", channel: "telegram", presence: "online", unread: 0,
          messages: [
            { id: 1, from: "Szabó Gábor", initials: "SG", text: "Megkaptad a tölgy ajánlatot?", ts: "Tegnap", me: false },
            { id: 2, from: "me", text: "Igen, ma átnézem és visszajelzek.", ts: "Tegnap", me: true },
          ] },
        { id: "ch-beszerzes", kind: "channel", name: "Beszerzés", channel: "internal", members: 4, unread: 0,
          messages: [ { id: 1, from: "Horváth Éva", initials: "HE", text: "MDF 16mm beszerzési ár 4%-ot emelkedett a héten.", ts: "Tegnap", me: false } ] },
        { id: "dm-anna", kind: "dm", name: "Nagy Anna", channel: "internal", presence: "offline", unread: 0,
          messages: [ { id: 1, from: "me", text: "Köszi a gyors vágótervet!", ts: "H 16:20", me: true } ] },
      ],
      integrations: [
        { id: "whatsapp", name: "WhatsApp Business", desc: "Helyszíni csapat és ügyfélüzenetek", connected: true },
        { id: "telegram", name: "Telegram", desc: "Partneri egyeztetések", connected: true },
        { id: "messenger", name: "Messenger", desc: "Bejövő ügyfélmegkeresések", connected: false },
        { id: "email", name: "E-mail átjáró", desc: "Levelek beszélgetésként", connected: false },
      ],
      aiMessages: [{ role: "assistant", text: "Szia! Én vagyok a JoineryTech asszisztens. Segíthetek rendelésekkel, gyártással, készlettel. Mit nézzünk meg?", ts: "9:14" }],
      settings: { eventMessages: true, marginPct: 30 },
      projects: [
        { id: "PRJ-2026-014", name: "Petőfi u. 12. — Konyha + nappali", customer: "Nagy Anna", designer: "Lakberendezés Plusz",
          status: "active", installTarget: "2026-06-22", created: "2026-04-18",
          customerMilestones: [
            { id: "cm14-1", label: "Megrendelés visszaigazolva", done: true,  doneAt: "2026-04-18" },
            { id: "cm14-2", label: "Anyagok beszerezve",          done: true,  doneAt: "2026-04-26" },
            { id: "cm14-3", label: "Gyártás elindult",            done: true,  doneAt: "2026-04-28" },
            { id: "cm14-4", label: "Gyártás befejezése",          done: false, doneAt: null },
            { id: "cm14-5", label: "Helyszíni beépítés",          done: false, doneAt: null },
            { id: "cm14-6", label: "Átadás",                      done: false, doneAt: null },
          ],
          items: [
            { id: "pi1", name: "Konyhabútor (alsó + felső sor)", kind: "assembly", value: 2_180_000, orderId: "JT-2426-0184" },
            { id: "pi2", name: "Nappali szekrénysor", kind: "assembly", value: 1_240_000, orderId: null },
            { id: "pi3", name: "6 db beltéri ajtó", kind: "assembly", value: 1_008_000, orderId: null },
          ],
          dependencies: [
            { id: "d1", trade: "viz",       label: "Vízkiállás (mosogató, mosogatógép)", party: "AquaFix Bt.",        due: "2026-05-28", status: "done",        blocksInstall: true },
            { id: "d2", trade: "aram",      label: "Elektromos kiállás (gépek, világítás)", party: "VoltÁram Kft.",   due: "2026-06-05", status: "scheduled",   blocksInstall: true },
            { id: "d3", trade: "szellozes", label: "Páraelszívó szellőzés kiépítése",      party: "KlímaPlusz Kft.", due: "2026-06-28", status: "pending",     blocksInstall: true },
            { id: "d4", trade: "butor",     label: "Bútor beépítés (helyszíni szerelés)",  party: "JoineryTech",     due: "2026-06-22", status: "pending",     blocksInstall: false },
          ],
          milestones: [
            { id: "m14-1", name: "Ajánlat", phase: 1, epics: [
              { id: "e14-1", title: "Ajánlat összeállítás és elfogadás", status: "CLOSED_DONE", ownerType: "manufacturer", owner: "Kovács Péter", due: "2026-04-18", tasks: [
                { id: "t1", title: "Tételek felvitele", done: true, assignee: "Kovács P." },
                { id: "t2", title: "Ügyfél jóváhagyás", done: true, assignee: "Kovács P." },
              ] },
            ] },
            { id: "m14-2", name: "Felmérés", phase: 2, epics: [
              { id: "e14-2", title: "Helyszíni felmérés", status: "CLOSED_DONE", ownerType: "manufacturer", owner: "Szabó Anna", due: "2026-04-29", tasks: [
                { id: "t3", title: "Bemérés lézerrel", done: true, assignee: "Szabó A." },
                { id: "t4", title: "Fotódokumentáció", done: true, assignee: "Szabó A." },
              ] },
              { id: "e14-3", title: "Gyártási rajz jóváhagyás", status: "IN_REVIEW", ownerType: "designer", owner: "Lakberendezés Plusz", due: "2026-05-30", tasks: [
                { id: "t5", title: "CAD modell", done: true, assignee: "Tóth R." },
                { id: "t6", title: "Ügyfél jóváhagyás", done: false, assignee: "Tóth R." },
              ] },
            ] },
            { id: "m14-3", name: "Gyártás", phase: 3, subMilestones: [
              { id: "sm14-31", name: "Lapszabászat", epics: [
                { id: "e14-4", title: "Frontlapok szabása", status: "IN_DEV", ownerType: "supplier", owner: "Profi Lapszabász Kft.", due: "2026-06-04", handshakeId: "HS-014-1", delegatedTo: "Profi Lapszabász Kft.", delegatedExternal: false, tasks: [
                  { id: "t7", title: "Anyag kivét raktárból", done: true, assignee: "Profi Lapsz." },
                  { id: "t8", title: "CNC szabás (12 db front)", done: false, assignee: "Profi Lapsz." },
                  { id: "t9", title: "QC mérés", done: false, assignee: "Profi Lapsz." },
                ] },
              ] },
              { id: "sm14-32", name: "Élzárás + CNC", epics: [
                { id: "e14-5", title: "Élzárás (ABS 2mm)", status: "BACKLOG_READY", ownerType: "manufacturer", owner: "Nagy János", due: "2026-06-08", tasks: [] },
                { id: "e14-6", title: "CNC fúrás + vasalat furatok", status: "BACKLOG_READY", ownerType: "manufacturer", owner: "Nagy János", due: "2026-06-10", tasks: [] },
              ] },
              { id: "sm14-33", name: "Összeszerelés", epics: [
                { id: "e14-7", title: "Korpusz összeállítás", status: "BACKLOG_READY", ownerType: "manufacturer", owner: "Kiss Zoltán", due: "2026-06-14", tasks: [] },
              ] },
            ] },
            { id: "m14-4", name: "Beépítés", phase: 4, epics: [
              { id: "e14-8", title: "Helyszíni szerelés", status: "BACKLOG_READY", ownerType: "installer", owner: "Beépítő Csapat Kft.", due: "2026-06-22", tasks: [] },
            ] },
            { id: "m14-5", name: "Átadás", phase: 5, epics: [
              { id: "e14-9", title: "Ügyfél átadás + minőségi jegyzőkönyv", status: "BACKLOG_READY", ownerType: "client", owner: "Nagy Anna", due: "2026-06-24", tasks: [] },
            ] },
          ] },
        { id: "PRJ-2026-013", name: "Belváros Café — pultsor + bárszekrény", customer: "Belváros Café", designer: "Lakberendezés Plusz",
          status: "active", installTarget: "2026-06-10", created: "2026-04-10",
          items: [
            { id: "pi4", name: "Bárpult (tölgy, korpusz + front)", kind: "assembly", value: 1_650_000, orderId: "JT-2426-0182" },
            { id: "pi5", name: "Háttérszekrény + polcok", kind: "assembly", value: 720_000, orderId: null },
          ],
          dependencies: [
            { id: "d5", trade: "viz",     label: "Pult mögötti vízvétel",          party: "AquaFix Bt.",     due: "2026-05-20", status: "done",        blocksInstall: true },
            { id: "d6", trade: "aram",    label: "Pult elektromos betáplálás",     party: "VoltÁram Kft.",   due: "2026-05-25", status: "done",        blocksInstall: true },
            { id: "d7", trade: "gepeszet",label: "Hűtőpult gépészeti bekötés",     party: "HiTech Gépészet", due: "2026-06-02", status: "in_progress", blocksInstall: true },
            { id: "d8", trade: "butor",   label: "Bútor beépítés",                 party: "JoineryTech",     due: "2026-06-10", status: "pending",     blocksInstall: false },
          ],
          milestones: [
            { id: "m13-1", name: "Gyártás", phase: 1, epics: [
              { id: "e13-1", title: "Bárpult korpusz + front", status: "IN_REVIEW", ownerType: "manufacturer", owner: "Kiss Zoltán", due: "2026-05-28", tasks: [
                { id: "t10", title: "Tölgy szabás", done: true, assignee: "Kiss Z." },
                { id: "t11", title: "Összeszerelés", done: true, assignee: "Kiss Z." },
                { id: "t12", title: "Felület lakkozás", done: false, assignee: "Kiss Z." },
              ] },
              { id: "e13-2", title: "Háttérszekrény élzárás", status: "IN_DEV", ownerType: "supplier", owner: "Élzáró Mester Bt.", due: "2026-06-01", handshakeId: "HS-013-1", delegatedTo: "Élzáró Mester Bt.", delegatedExternal: false, tasks: [] },
            ] },
            { id: "m13-2", name: "Beépítés", phase: 2, epics: [
              { id: "e13-3", title: "Helyszíni szerelés + bekötés", status: "BACKLOG_READY", ownerType: "installer", owner: "Beépítő Csapat Kft.", due: "2026-06-10", tasks: [] },
            ] },
          ] },
        { id: "PRJ-2026-012", name: "Naprózsa Panzió — recepció", customer: "Naprózsa Panzió", designer: "JoineryTech (belső)",
          status: "draft", installTarget: "2026-07-05", created: "2026-04-22",
          items: [
            { id: "pi6", name: "Recepciós pult", kind: "assembly", value: 980_000, orderId: null },
          ],
          dependencies: [
            { id: "d9",  trade: "aram",  label: "Pult világítás + konnektorok", party: "VoltÁram Kft.", due: "2026-06-20", status: "pending", blocksInstall: true },
            { id: "d10", trade: "butor", label: "Bútor beépítés",               party: "JoineryTech",   due: "2026-07-05", status: "pending", blocksInstall: false },
          ],
          milestones: [] },
      ],
      cart: [],
      requisitions: (typeof PR_REQUISITIONS !== "undefined") ? clone(PR_REQUISITIONS) : [],
      catalog: ([
        // ── DEMO: életciklus-státuszok (a Törzsadat → Jóváhagyások képernyőhöz) ──
        // Ezek a NEM-active tételek belül használhatók (igénylés, raktár, tervezés),
        // de ajánlatba/eladásba/webshopba NEM kerülnek, amíg jóvá nem hagyják.
        { id: "c-draft-led", code: "UJ-0001", name: "LED profil alu 2m (mattüveg búra)", unit: "db", cat: "Vasalat", categoryId: "cat-vasalat",
          kind: "material", price: 0, status: "draft", createdBy: "Tóth Kinga · Beszerzés",
          props: {}, tags: ["Új"] },
        { id: "c-inc-fog", code: "UJ-0002", name: "Tölgy fogantyú 160mm", unit: "db", cat: "Vasalat", categoryId: "cat-vasalat",
          kind: "hardware", price: 0, status: "incomplete", createdBy: "Nagy János · Gyártás",
          statusReason: "Hiányzik az eladási ár és a műszaki típus (vasalat fajta) — kérlek pótold.",
          suppliers: [{ name: "Häfele Hungary", price: 640, leadDays: 6 }], props: {}, tags: [] },
        { id: "c-rev-fog", code: "VS-HA-FB160", name: "Matt fekete fogantyú 160mm", unit: "db", cat: "Vasalat", categoryId: "cat-vasalat",
          kind: "hardware", price: 1290, status: "review", createdBy: "Szabó Anna · Értékesítés",
          visibility: "public", suppliers: [{ name: "Häfele Hungary", price: 720, leadDays: 6 }],
          props: { tipus: "Fogantyú", gyarto: "Häfele", teher: 25, softclose: false }, tags: ["Új"] },
        { id: "c1",  code: "BK-018-2440",  name: "Bükk 18mm tábla",          unit: "tábla", cat: "Lemez",       price: 17900, supplier: "Falco Sopron Zrt.",
          suppliers: [{ name: "Falco Sopron Zrt.",  price: 17900, leadDays: 5 }, { name: "Kronospan HU Zrt.", price: 18200, leadDays: 3 }, { name: "Egger Faipari Kft.", price: 18800, leadDays: 7 }] },
        { id: "c2",  code: "TL-022-2440",  name: "Tölgy 22mm tábla",          unit: "tábla", cat: "Lemez",       price: 31800, supplier: "Egger Faipari Kft.",
          suppliers: [{ name: "Egger Faipari Kft.", price: 31800, leadDays: 5 }, { name: "Falco Sopron Zrt.",  price: 32100, leadDays: 4 }] },
        { id: "c3",  code: "MDF-019",      name: "MDF 19mm tábla",            unit: "tábla", cat: "Lemez",       price: 9600,  supplier: "Kronospan HU Zrt.",
          suppliers: [{ name: "Kronospan HU Zrt.", price: 9600, leadDays: 3 }, { name: "Egger Faipari Kft.", price: 9850, leadDays: 5 }, { name: "Falco Sopron Zrt.", price: 10100, leadDays: 6 }] },
        { id: "c4",  code: "MDF-016-W",    name: "MDF 16mm fehér",            unit: "tábla", cat: "Lemez",       price: 8700,  supplier: "Kronospan HU Zrt.",
          suppliers: [{ name: "Kronospan HU Zrt.", price: 8700, leadDays: 3 }, { name: "Egger Faipari Kft.", price: 8950, leadDays: 5 }] },
        { id: "c5",  code: "HDF-003",      name: "HDF 3mm fehér",             unit: "tábla", cat: "Lemez",       price: 3200,  supplier: "Egger Faipari Kft.",
          suppliers: [{ name: "Egger Faipari Kft.", price: 3200, leadDays: 5 }, { name: "Kronospan HU Zrt.", price: 3350, leadDays: 4 }] },
        { id: "c6",  code: "EZ-ABS-22-TL", name: "ABS élzáró 22mm tölgy",    unit: "fm",    cat: "Élzáró",      price: 220,   supplier: "Rehau HU",
          suppliers: [{ name: "Rehau HU", price: 220, leadDays: 7 }, { name: "Döllken HU", price: 235, leadDays: 5 }] },
        { id: "c7",  code: "VS-BL-CT",     name: "Blum CLIP top 110°",        unit: "db",    cat: "Vasalat",     price: 1240,  supplier: "Blum Hungária",
          suppliers: [{ name: "Blum Hungária", price: 1240, leadDays: 4 }] },
        { id: "c8",  code: "VS-HE-500",    name: "Hettich fiókcsúszó 500mm",  unit: "db",    cat: "Vasalat",     price: 1180,  supplier: "Hettich Hungary",
          suppliers: [{ name: "Hettich Hungary", price: 1180, leadDays: 5 }, { name: "Blum Hungária", price: 1350, leadDays: 4 }] },
        { id: "c9",  code: "CS-SP-440",    name: "Spax csavar 4×40",          unit: "db",    cat: "Kötszer",     price: 12,    supplier: "Würth HU",
          suppliers: [{ name: "Würth HU", price: 12, leadDays: 2 }, { name: "Bossard HU", price: 11, leadDays: 4 }] },
        { id: "c10", code: "TL-040",       name: "Tölgy 40mm tömör",          unit: "fm",    cat: "Tömörfa",     price: 32400, supplier: "Falco Sopron Zrt.",
          suppliers: [{ name: "Falco Sopron Zrt.", price: 32400, leadDays: 7 }, { name: "Egger Faipari Kft.", price: 33100, leadDays: 6 }] },
        { id: "s1",  code: "SZ-SZAB",      name: "Szabászat (CNC)",            unit: "óra",   cat: "Szolgáltatás", price: 9500,  supplier: "JoineryTech", suppliers: [{ name: "JoineryTech", price: 9500, leadDays: 1 }] },
        { id: "s2",  code: "SZ-ELZ",       name: "Élzárás",                   unit: "fm",    cat: "Szolgáltatás", price: 380,   supplier: "JoineryTech", suppliers: [{ name: "JoineryTech", price: 380,  leadDays: 1 }] },
        { id: "s3",  code: "SZ-SZER",      name: "Összeszerelés",             unit: "óra",   cat: "Szolgáltatás", price: 7800,  supplier: "JoineryTech", suppliers: [{ name: "JoineryTech", price: 7800, leadDays: 1 }] },
        { id: "s4",  code: "SZ-HELY",      name: "Helyszíni beépítés",         unit: "óra",   cat: "Szolgáltatás", price: 8500,  supplier: "JoineryTech", suppliers: [{ name: "JoineryTech", price: 8500, leadDays: 1 }] },
        // ── Lapanyag (Tervezés/Gyártás — CATALOG_LOOKUP forrása) ───────────────────
        // Lapanyag tételek: az ár csak beszerzés+gyártás+tervezés látja; szállító csak protected
        { id: "cl-eg3303-18", code: "EG-3303-18", name: "Egger 3303 ST10 18mm", unit: "m²", cat: "Lapanyag (Tervezés)", price: 5200,  supplier: "Egger Faipari Kft.",
          visibility: "world-only", allowedWorlds: ["design", "production"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production", "design"] },
          props: { t: 18, kind: "korpusz", lookupColor: "#dcc4a3" }, tags: ["egger"] },
        { id: "cl-eg1133-18", code: "EG-1133-18", name: "Egger 1133 ST10 18mm", unit: "m²", cat: "Lapanyag (Tervezés)", price: 5400,  supplier: "Egger Faipari Kft.",
          visibility: "world-only", allowedWorlds: ["design", "production"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production", "design"] },
          props: { t: 18, kind: "korpusz", lookupColor: "#a18166" }, tags: ["egger"] },
        { id: "cl-eg3327-18", code: "EG-3327-18", name: "Egger 3327 ST22 18mm", unit: "m²", cat: "Lapanyag (Tervezés)", price: 6100,  supplier: "Egger Faipari Kft.",
          visibility: "world-only", allowedWorlds: ["design", "production"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production", "design"] },
          props: { t: 18, kind: "korpusz", lookupColor: "#3d3631" }, tags: ["egger"] },
        { id: "cl-eg3327-19", code: "EG-3327-19", name: "Egger 3327 ST22 19mm", unit: "m²", cat: "Lapanyag (Tervezés)", price: 6400,  supplier: "Egger Faipari Kft.",
          visibility: "world-only", allowedWorlds: ["design", "production"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production", "design"] },
          props: { t: 19, kind: "front",   lookupColor: "#3d3631" }, tags: ["egger"] },
        { id: "cl-eg3303-19", code: "EG-3303-19", name: "Egger 3303 ST10 19mm", unit: "m²", cat: "Lapanyag (Tervezés)", price: 5600,  supplier: "Egger Faipari Kft.",
          visibility: "world-only", allowedWorlds: ["design", "production"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production", "design"] },
          props: { t: 19, kind: "front",   lookupColor: "#dcc4a3" }, tags: ["egger"] },
        { id: "cl-mdf-019",   code: "MDF-019",    name: "MDF 19mm",             unit: "m²", cat: "Lapanyag (Tervezés)", price: 4800,  supplier: "Kronospan HU Zrt.",
          visibility: "world-only", allowedWorlds: ["design", "production"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production", "design"] },
          props: { t: 19, kind: "korpusz", lookupColor: "#c8b8a0" }, tags: ["mdf"] },
        { id: "cl-hdf-003",   code: "HDF-003",    name: "HDF 3mm fehér",        unit: "m²", cat: "Lapanyag (Tervezés)", price: 2200,  supplier: "Egger Faipari Kft.",
          visibility: "world-only", allowedWorlds: ["design", "production"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production", "design"] },
          props: { t: 3,  kind: "hátlap",  lookupColor: "#f0ebe1" } },
        { id: "cl-mdf-006",   code: "MDF-006",    name: "MDF 6mm",              unit: "m²", cat: "Lapanyag (Tervezés)", price: 2600,  supplier: "Kronospan HU Zrt.",
          visibility: "world-only", allowedWorlds: ["design", "production"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production", "design"] },
          props: { t: 6,  kind: "hátlap",  lookupColor: "#c8b8a0" } },
        { id: "cl-tl-040",    code: "TL-040",     name: "Tölgy 40mm",           unit: "fm", cat: "Lapanyag (Tervezés)", price: 28000, supplier: "Falco Sopron Zrt.",
          visibility: "world-only", allowedWorlds: ["design", "production"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production", "design"] },
          props: { t: 40, kind: "tömör",   lookupColor: "#b08560" }, tags: ["tölgy"] },
        { id: "cl-bk-040",    code: "BK-040",     name: "Bükk 40mm",            unit: "fm", cat: "Lapanyag (Tervezés)", price: 24000, supplier: "Falco Sopron Zrt.",
          visibility: "world-only", allowedWorlds: ["design", "production"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production", "design"] },
          props: { t: 40, kind: "tömör",   lookupColor: "#d6b596" }, tags: ["bükk"] },
        // ── Szerkezeti vasalat (Tervezés — HARDWARE_CATALOG forrása) ───────────────
        // Vasalat tételek: az ár csak beszerzés+gyártás látja; a márkaárak (worldExt.design.brands) csak design világnak
        { id: "cl-hw-hinge",     code: "HW-HINGE",     name: "Csukópánt",        unit: "db",  cat: "Szerkezeti vasalat", price: 1100, supplier: "Vegyes",
          visibility: "world-only", allowedWorlds: ["design", "production", "procurement"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production"] },
          props: { hardwareId: "hinge",    softclose: true },
          worldExt: { design: { brands: { Blum: 1450, Hettich: 1280, GTV: 890,  Vegyes: 1100 } } } },
        { id: "cl-hw-drawer",    code: "HW-DRAWER",    name: "Fióksín (teljes)", unit: "pár", cat: "Szerkezeti vasalat", price: 5200, supplier: "Vegyes",
          visibility: "world-only", allowedWorlds: ["design", "production", "procurement"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production"] },
          props: { hardwareId: "drawer" },
          worldExt: { design: { brands: { Blum: 6800, Hettich: 5900, GTV: 3900, Vegyes: 5200 } } } },
        { id: "cl-hw-lift",      code: "HW-LIFT",      name: "Felnyíló vasalat", unit: "db",  cat: "Szerkezeti vasalat", price: 7000, supplier: "Vegyes",
          visibility: "world-only", allowedWorlds: ["design", "production", "procurement"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production"] },
          props: { hardwareId: "lift" },
          worldExt: { design: { brands: { Blum: 8900, Hettich: 7600, GTV: 5200, Vegyes: 7000 } } } },
        { id: "cl-hw-shelfsup",  code: "HW-SHELFSUP",  name: "Polctartó",        unit: "db",  cat: "Szerkezeti vasalat", price: 95,   supplier: "Vegyes",
          visibility: "world-only", allowedWorlds: ["design", "production", "procurement"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production"] },
          props: { hardwareId: "shelfsup" },
          worldExt: { design: { brands: { Blum: 120,  Hettich: 110, GTV: 70,   Vegyes: 95 } } } },
        { id: "cl-hw-leg",       code: "HW-LEG",       name: "Állítható láb",    unit: "db",  cat: "Szerkezeti vasalat", price: 260,  supplier: "Vegyes",
          visibility: "world-only", allowedWorlds: ["design", "production", "procurement"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production"] },
          props: { hardwareId: "leg" },
          worldExt: { design: { brands: { Blum: 340,  Hettich: 300, GTV: 190,  Vegyes: 260 } } } },
        { id: "cl-hw-doorhinge", code: "HW-DOORHINGE", name: "Ajtó zsanér",      unit: "db",  cat: "Szerkezeti vasalat", price: 1700, supplier: "Vegyes",
          visibility: "world-only", allowedWorlds: ["design", "production", "procurement"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "production"] },
          props: { hardwareId: "doorhinge" },
          worldExt: { design: { brands: { Blum: 2200, Hettich: 1900, GTV: 1300, Vegyes: 1700 } } } },
        // ── Belsőépítészeti katalógus (Interior világ — intCatProducts forrása) ────
        { id: "ip-100", code: "EG-H1334",  name: "Egger Halifax tölgy natúr",      unit: "m²", cat: "Alapanyag / minta",   price: 9800,  supplier: "Egger / Forest Hungary",
          visibility: "public",    tags: ["egger", "tölgy", "lap"],
          fieldVis: { price: "protected", supplier: "protected" },
          worldExt: { interior: { typeId: "it-anyag",   desc: "H1334 ST9 — furnérhatású bútorlap, 18mm",  source: "Egger / Forest Hungary",  notes: "Közös referencia minden világnak", color: "#c9a878", sampleSlot: "ipsmpl-ip-100" } } },
        { id: "ip-101", code: "EG-W1000",  name: "Egger Prémium fehér matt",        unit: "m²", cat: "Alapanyag / minta",   price: 7200,  supplier: "Egger / Forest Hungary",
          visibility: "public",    tags: ["egger", "fehér"],
          fieldVis: { price: "protected", supplier: "protected" },
          worldExt: { interior: { typeId: "it-anyag",   desc: "W1000 PM — melamin bútorlap, 18mm",        source: "Egger / Forest Hungary",  notes: "", color: "#f1ece4", sampleSlot: "ipsmpl-ip-101" } } },
        { id: "ip-001", code: "KO-AL-T60", name: "Alsószekrény — tölgy front 60",  unit: "fm", cat: "Konyhabútor",         price: 64000, supplier: "Saját gyártás",
          visibility: "private",   tags: ["tölgy", "alsó"],
          worldExt: { interior: { typeId: "it-konyha",  desc: "18mm korpusz, tölgy furnérhatású front, push-to-open", source: "Saját gyártás", notes: "Vasalat: Blum", color: "#c9a878", sampleSlot: "ipsmpl-ip-001" } } },
        { id: "ip-002", code: "KO-FE-MF",  name: "Felsőszekrény — matt fehér",     unit: "fm", cat: "Konyhabútor",         price: 48000, supplier: "Saját gyártás",
          visibility: "private",   tags: ["fehér", "felső"],
          worldExt: { interior: { typeId: "it-konyha",  desc: "Bukó-pántos, fehér matt front",            source: "Saját gyártás", notes: "", color: "#f1ece4", sampleSlot: "ipsmpl-ip-002" } } },
        { id: "ip-003", code: "KO-SZIG",   name: "Konyhasziget — kőhatású munkalap", unit: "db", cat: "Konyhabútor",        price: 340000,supplier: "Saját + Dekton pult",
          visibility: "protected", tags: ["sziget"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "interior"] },
          worldExt: { interior: { typeId: "it-konyha",  desc: "120×90, beépíthető főzőlappal",            source: "Saját + Dekton pult", notes: "Pult beszerezve", color: "#b9b4ab", sampleSlot: "ipsmpl-ip-003" } } },
        { id: "ip-010", code: "GA-TOL-T",  name: "Tolóajtós gardrób — tölgy",      unit: "m²", cat: "Gardrób / beépített", price: 102000,supplier: "Saját gyártás",
          visibility: "private",   tags: ["tolóajtós"],
          worldExt: { interior: { typeId: "it-gardrob", desc: "Mennyezetig, tölgy + tükör betét",         source: "Saját gyártás", notes: "Tolóajtó: Hettich", color: "#c9a878", sampleSlot: "ipsmpl-ip-010" } } },
        { id: "ip-011", code: "GA-NYI-F",  name: "Nyílóajtós szekrény — fehér",    unit: "m²", cat: "Gardrób / beépített", price: 66000, supplier: "Saját gyártás",
          visibility: "private",   tags: ["nyílóajtós"],
          worldExt: { interior: { typeId: "it-gardrob", desc: "Belső polc + akasztó rendszer",            source: "Saját gyártás", notes: "", color: "#f1ece4", sampleSlot: "ipsmpl-ip-011" } } },
        { id: "ip-020", code: "FU-MOS-D",  name: "Mosdópult — dió 120",            unit: "db", cat: "Fürdőszobabútor",     price: 116000,supplier: "Saját + Geberit kerámia",
          visibility: "private",   tags: ["dió"],
          worldExt: { interior: { typeId: "it-furdo",   desc: "Alátétmosdóval, 2 fiók",                   source: "Saját + Geberit kerámia", notes: "", color: "#6f4a32", sampleSlot: "ipsmpl-ip-020" } } },
        { id: "ip-021", code: "FU-TUK-L",  name: "Tükrös szekrény — LED",          unit: "db", cat: "Fürdőszobabútor",     price: 42000, supplier: "Sanitt",
          visibility: "protected", tags: ["LED"],
          fieldVis: { price: "world-only", supplier: "protected" },
          fieldAllowedWorlds: { price: ["procurement", "interior"] },
          worldExt: { interior: { typeId: "it-furdo",   desc: "Érintős LED, páramentes",                  source: "Sanitt", notes: "Kész termék", color: "#e7e2d8", sampleSlot: "ipsmpl-ip-021" } } },
        { id: "ip-030", code: "EG-ASZ-T",  name: "Étkezőasztal — tömör tölgy 200", unit: "db", cat: "Egyedi bútor",        price: 224000,supplier: "Saját gyártás",
          visibility: "private",   tags: ["tömörfa"],
          worldExt: { interior: { typeId: "it-egyedi",  desc: "Olajozott, fém lábszerkezet",              source: "Saját gyártás", notes: "Tömörfa beszerezve", color: "#b3895a", sampleSlot: "ipsmpl-ip-030" } } },
        { id: "ip-031", code: "EG-POL-F",  name: "Könyvespolc-fal — egyedi",       unit: "db", cat: "Egyedi bútor",        price: 142000,supplier: "Saját gyártás",
          visibility: "private",   tags: ["polc"],
          worldExt: { interior: { typeId: "it-egyedi",  desc: "Mennyezetig, rejtett LED",                 source: "Saját gyártás", notes: "", color: "#2c2b29", sampleSlot: "ipsmpl-ip-031" } } },
        { id: "ip-040", code: "BU-LAM-T",  name: "Tölgy lamella falpanel",         unit: "m²", cat: "Burkolat / falpanel", price: 25000, supplier: "Naturwand",
          visibility: "public",    tags: ["lamella"],
          fieldVis: { price: "protected", supplier: "protected" },
          worldExt: { interior: { typeId: "it-burkolat",desc: "Akusztikus, filc hátlap",                  source: "Naturwand", notes: "Közös a Trade világgal", color: "#c2a47b", sampleSlot: "ipsmpl-ip-040" } } },
        { id: "ip-041", code: "BU-MIK-G",  name: "Mikrocement falfelület",         unit: "m²", cat: "Burkolat / falpanel", price: 17000, supplier: "Topcret",
          visibility: "private",   tags: ["mikrocement"],
          worldExt: { interior: { typeId: "it-burkolat",desc: "Selyemmatt, greige",                       source: "Topcret", notes: "Kézi felhordás", color: "#b4aa99", sampleSlot: "ipsmpl-ip-041" } } },
        // ── Raktárkezelés — world-only: warehouse + procurement, worldExt.warehouse készletadatokkal ──
        { id: "wh-001", code: "BK-018-2440", name: "Bükk 18mm bútorlap",      unit: "tábla", cat: "Bútorlap",    price: 18500, supplier: "Falco Sopron Zrt.",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production"],
          tags: ["bükk", "korpusz"],
          props: { vastagsag: 18, meret: "2440×1830", felulet: "Melaminos" },
          worldExt: { warehouse: { min: 20, lots: [
            { id: "lot-001a", qty: 34, zone: "general",        locId: "loc-r1a1", locText: "Vác • R1 / A1", receivedAt: "2026-04-12", receivedFrom: "PO-2426-070" },
            { id: "lot-001b", qty: 8,  zone: "project_locked", locId: "loc-r1a1", locText: "Vác • R1 / A1", receivedAt: "2026-04-22", receivedFrom: "PO-2426-085", projectNo: "PRJ-2426-012", projectName: "Bognár konyhabútor" },
          ] } } },
        { id: "wh-002", code: "TL-022-2440", name: "Tölgy 22mm bútorlap",     unit: "tábla", cat: "Bútorlap",    price: 32400, supplier: "Falco Sopron Zrt.",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production"],
          tags: ["tölgy", "front"],
          props: { vastagsag: 22, meret: "2440×1830", felulet: "Furnérozott" },
          worldExt: { warehouse: { min: 15, lots: [
            { id: "lot-002a", qty: 8, zone: "general", locId: "loc-r1a3", locText: "Vác • R1 / A3", receivedAt: "2026-04-18", receivedFrom: "PO-2426-078" },
          ] } } },
        { id: "wh-003", code: "MDF-016-W",   name: "MDF 16mm fehér melamin",  unit: "tábla", cat: "MDF",         price: 8900,  supplier: "Egger Faipari Kft.",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production"],
          tags: ["mdf", "fehér"],
          props: { vastagsag: 16, meret: "2440×1830", nedves: false },
          worldExt: { warehouse: { min: 30, lots: [
            { id: "lot-003a", qty: 66, zone: "general",       locId: "loc-r2b1", locText: "Vác • R2 / B1", receivedAt: "2026-04-10", receivedFrom: "PO-2426-066" },
            { id: "lot-003b", qty: 12, zone: "shop_reserved", locId: "loc-r2b1", locText: "Vác • R2 / B1", receivedAt: "2026-04-20", ref: "WEB-1042", refLabel: "Webshop rendelés #1042" },
          ] } } },
        { id: "wh-004", code: "ABS-02-WH",   name: "ABS élzáró 2mm fehér",    unit: "m",     cat: "Élzáró",      price: 145,   supplier: "Rehau Hungária",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement"],
          tags: ["abs", "fehér"],
          props: { szelesseg: 23, vastagsag: 2, anyag: "ABS" },
          worldExt: { warehouse: { min: 200, lots: [
            { id: "lot-004a", qty: 120, zone: "general", locId: "loc-pe01", locText: "Székesfehérvár • P / E-01", receivedAt: "2026-04-08", receivedFrom: "PO-2426-060" },
          ] } } },
        { id: "wh-005", code: "VS-BL-CT",    name: "Blum CLIP top csukópánt", unit: "db",    cat: "Vasalat",     price: 1450,  supplier: "Blum Hungária",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production"],
          tags: ["blum", "csukópánt"],
          props: { tipus: "Pánt", gyarto: "Blum", softclose: true },
          worldExt: { warehouse: { min: 100, lots: [
            { id: "lot-005a", qty: 280, zone: "general",      locId: "loc-v03", locText: "Székesfehérvár • V / 03", receivedAt: "2026-04-05", receivedFrom: "PO-2426-055" },
            { id: "lot-005b", qty: 60,  zone: "commissioned", locId: "loc-v03", locText: "Székesfehérvár • V / 03", receivedAt: "2026-04-19", ref: "JT-2426-0184", refLabel: "Bognár — gyártás" },
          ] } } },
        { id: "wh-006", code: "VS-BL-DR",    name: "Blum Tandem fiókcsúszó",  unit: "pár",   cat: "Vasalat",     price: 6800,  supplier: "Blum Hungária",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production"],
          tags: ["blum", "fiók"],
          props: { tipus: "Fiókcsúszó", gyarto: "Blum", softclose: true },
          worldExt: { warehouse: { min: 40, lots: [
            { id: "lot-006a", qty: 18, zone: "general", locId: "loc-v05", locText: "Székesfehérvár • V / 05", receivedAt: "2026-04-15", receivedFrom: "PO-2426-072" },
          ] } } },
        { id: "wh-007", code: "ZA-HF-CT",    name: "Häfele bútorzár (központi)", unit: "db",  cat: "Vasalat",     price: 2400,  supplier: "Häfele Hungary",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production"],
          tags: ["häfele", "zár"],
          props: { tipus: "Zár", gyarto: "Häfele" },
          worldExt: { warehouse: { min: 20, lots: [
            { id: "lot-007a", qty: 14, zone: "general", locId: "loc-v05", locText: "Székesfehérvár • V / 05", receivedAt: "2026-04-12", receivedFrom: "PO-2426-068" },
          ] } } },
        { id: "wh-008", code: "FB-HF-MX",    name: "Häfele Matrix fiók doboz", unit: "db",    cat: "Vasalat",     price: 5200,  supplier: "Häfele Hungary",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production"],
          tags: ["häfele", "fiók"],
          props: { tipus: "Fiókdoboz", gyarto: "Häfele" },
          worldExt: { warehouse: { min: 30, lots: [
            { id: "lot-008a", qty: 9, zone: "general", locId: "loc-v05", locText: "Székesfehérvár • V / 05", receivedAt: "2026-04-12", receivedFrom: "PO-2426-068" },
          ] } } },
        // ── Összeállítás (multi-level BOM) — a tétel komponensekből áll ──
        // Al-összeállítás: 1 fiók-egység = 1 fiók doboz + 1 sín (maga is bomos → rekurzió)
        // KÉSZTERMÉKKÉNT is raktározható (worldExt.warehouse + lotok)
        { id: "wh-010", code: "ASSY-FIOK",   name: "Fiók-egység (doboz + sín)", unit: "db", cat: "Összeállítás", price: 12000, supplier: "JoineryTech",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production", "design"],
          tags: ["összeállítás", "fiók"],
          bom: [{ catalogItemId: "wh-008", qty: 1 }, { catalogItemId: "wh-006", qty: 1 }],
          worldExt: { warehouse: { min: 6, lots: [
            { id: "lot-010a", qty: 4, zone: "general", locId: "loc-v05", locText: "Székesfehérvár • V / 05", receivedAt: "2026-04-20", receivedFrom: "Gyártás" },
          ] } } },
        // Szekrény: 0,5 bükk lap + 3 fiók-egység (al-összeállítás) + 1 zár — KÉSZTERMÉK
        { id: "wh-009", code: "ASSY-AK60-3F", name: "Konyha alsószekrény 60 (3 fiókos)", unit: "db", cat: "Összeállítás", price: 78000, supplier: "JoineryTech",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production", "design"],
          tags: ["összeállítás", "szekrény", "konyha"],
          bom: [{ catalogItemId: "wh-001", qty: 0.5 }, { catalogItemId: "wh-010", qty: 3 }, { catalogItemId: "wh-007", qty: 1 }],
          worldExt: { warehouse: { min: 2, lots: [
            { id: "lot-009a", qty: 1, zone: "general", locId: "loc-v05", locText: "Székesfehérvár • V / 05", receivedAt: "2026-04-24", receivedFrom: "Gyártás" },
          ] } } },
        // Mértékegység-eltérés demó: MI m²-ben tartjuk, a beszállító TÁBLÁBAN (1 tábla = 5,796 m²)
        { id: "wh-011", code: "BK-018-M2",   name: "Bükk 18mm lapanyag (m²)", unit: "m²",    cat: "Bútorlap",    price: 3100,  supplier: "Falco Sopron Zrt.",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production"],
          tags: ["bükk", "m2"],
          worldExt: { warehouse: { min: 30, lots: [
            { id: "lot-011a", qty: 23.18, zone: "general", locId: "loc-r1a1", locText: "Vác • R1 / A1", receivedAt: "2026-04-21", receivedFrom: "PO-2426-070" },
          ] } } },
        // Rétegelt lemez m²-ben — a tábla mérete VÁLTOZÓ (lásd sm-11)
        { id: "wh-012", code: "RL-NYIR-18",  name: "Nyír rétegelt lemez 18mm (m²)", unit: "m²", cat: "Bútorlap", price: 5400,  supplier: "Falco Sopron Zrt.",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production"],
          tags: ["rétegelt", "nyír", "m2"],
          worldExt: { warehouse: { min: 20, lots: [
            { id: "lot-012a", qty: 11.9, zone: "general", locId: "loc-r1a3", locText: "Vác • R1 / A3", receivedAt: "2026-04-19", receivedFrom: "PO-2426-066" },
          ] } } },
        // ── VARIÁNS-CSALÁD — egy fő-tétel alatt méret/szín változatok, külön készlettel ──
        // Fő-tétel (variantAxes): a változó tulajdonságok; a variánsok ezt öröklik.
        { id: "wh-013", code: "VS-BL-ANT",   name: "Blum Antaro fiókcsúszó", unit: "pár", cat: "Vasalat", price: 7200, supplier: "Blum Hungária",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production"],
          tags: ["blum", "fiók", "variáns"],
          props: { tipus: "Fiókcsúszó", gyarto: "Blum", softclose: true },
          variantAxes: [
            { key: "hossz", label: "Hossz", options: ["350 mm", "450 mm", "550 mm"] },
            { key: "szin",  label: "Szín",  options: ["fehér", "barna"] },
          ] },
        // Variánsok — öröklik a fő-tétel props-át (gyártó/típus/softclose), a méret/szín és az ár felülírva; saját készlet
        { id: "wh-013-a", code: "VS-BL-ANT-350-FE", name: "Blum Antaro fiókcsúszó", unit: "pár", cat: "Vasalat", price: 6900, supplier: "Blum Hungária",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production"], variantOf: "wh-013", variantValues: { hossz: "350 mm", szin: "fehér" },
          worldExt: { warehouse: { min: 40, lots: [ { id: "lot-013a", qty: 100, zone: "general", locId: "loc-v05", locText: "Székesfehérvár • V / 05", receivedAt: "2026-04-16", receivedFrom: "PO-2426-071" } ] } } },
        { id: "wh-013-b", code: "VS-BL-ANT-450-FE", name: "Blum Antaro fiókcsúszó", unit: "pár", cat: "Vasalat", price: 7200, supplier: "Blum Hungária",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production"], variantOf: "wh-013", variantValues: { hossz: "450 mm", szin: "fehér" },
          worldExt: { warehouse: { min: 60, lots: [ { id: "lot-013b", qty: 200, zone: "general", locId: "loc-v05", locText: "Székesfehérvár • V / 05", receivedAt: "2026-04-16", receivedFrom: "PO-2426-071" } ] } } },
        { id: "wh-013-c", code: "VS-BL-ANT-450-BA", name: "Blum Antaro fiókcsúszó", unit: "pár", cat: "Vasalat", price: 7400, supplier: "Blum Hungária",
          visibility: "world-only", allowedWorlds: ["warehouse", "procurement", "production"], variantOf: "wh-013", variantValues: { hossz: "450 mm", szin: "barna" },
          worldExt: { warehouse: { min: 30, lots: [ { id: "lot-013c", qty: 100, zone: "general", locId: "loc-v05", locText: "Székesfehérvár • V / 05", receivedAt: "2026-04-18", receivedFrom: "PO-2426-073" } ] } } },
      ]).map(__normCatItem),
      products: [
        { id: "P-101", name: "Tölgy étkezőasztal", cat: "Asztalok", price: 289_000, lead: 21, blurb: "Tömör tölgy, 180×90 cm, olajozott felület", tint: "from-amber-200 to-amber-100", icon: "box" },
        { id: "P-102", name: "Bükk konyhaszekrény", cat: "Szekrények", price: 412_000, lead: 28, blurb: "Egyedi méret, Blum vasalat, soft-close", tint: "from-stone-200 to-stone-100", icon: "inventory" },
        { id: "P-103", name: "Tölgy beltéri ajtó", cat: "Ajtók", price: 168_000, lead: 18, blurb: "90×210 cm, furnérozott, tokkal", tint: "from-orange-200 to-amber-100", icon: "box" },
        { id: "P-104", name: "Fali polcrendszer", cat: "Polcok", price: 94_000, lead: 12, blurb: "Moduláris, 3 elem, MDF lakkozott", tint: "from-teal-100 to-stone-100", icon: "inventory" },
        { id: "P-105", name: "Dolgozóasztal", cat: "Asztalok", price: 158_000, lead: 16, blurb: "140×70 cm, kábelrendezővel", tint: "from-stone-200 to-teal-50", icon: "box" },
        { id: "P-106", name: "Fiókos éjjeliszekrény", cat: "Szekrények", price: 72_000, lead: 14, blurb: "2 fiók, tölgy, soft-close", tint: "from-amber-100 to-stone-100", icon: "inventory" },
        { id: "P-107", name: "Tárgyalóasztal", cat: "Asztalok", price: 540_000, lead: 30, blurb: "8 fő, furnérozott, kábelporttal", tint: "from-stone-300 to-stone-100", icon: "box" },
        { id: "P-108", name: "Cipősszekrény", cat: "Szekrények", price: 88_000, lead: 15, blurb: "Billenős, 3 rekesz, fehér MDF", tint: "from-stone-100 to-stone-50", icon: "inventory" },
      ],
      currentAccountId: "acc-internal",
      prevAccountId: "acc-internal",
      accounts: [
        { id: "acc-internal", name: "JoineryTech (belső)", contact: "Kovács Péter · Admin", type: "internal", actorType: "manufacturer", role: "Adminisztrátor",
          worlds: ["tasks", "production", "mfgprep", "supervisor", "quality", "ehs", "sales", "crm", "procurement", "design", "interior", "projects", "logistics", "kontrolling", "service", "hr", "attendance", "maintenance", "docs", "warehouse", "shopfloor", "shop", "trade", "masterdata", "finance", "ai", "settings"],
          perms: ["quote.create", "quote.convert", "order.release", "order.track", "forward", "catalog.approve", "finance.manage", "hr.manage", "maintenance.manage", "crm.manage", "rfq.manage", "auth.approve", "quality.manage", "ehs.manage", "docs.manage", "attendance.manage", "settings.manage", "design.engineer", "ai.manage", "controlling.exec"] },
        { id: "acc-b2b", name: "Bognár Bútor Kft.", contact: "Bognár István · Beszerzés", type: "b2b", actorType: "manufacturer", role: "B2B partner",
          worlds: ["sales", "production", "shop"],
          perms: ["quote.create", "quote.convert", "forward", "order.track"] },
        { id: "acc-reseller", name: "Lakberendezés Plusz", contact: "Tóth Réka · Belsőépítész", type: "reseller", actorType: "designer", role: "Belsőépítész (B2B2C)",
          worlds: ["sales", "crm", "interior", "projects"],
          perms: ["quote.create", "forward", "order.track", "crm.manage"] },
        { id: "acc-supplier", name: "Profi Lapszabász Kft.", contact: "Varga Tamás · Üzemvezető", type: "partner", actorType: "supplier", partnerId: "pt-lap", role: "Lapszabász partner",
          worlds: ["trade", "production", "projects"],
          perms: ["order.track"] },
        { id: "acc-installer", name: "Beépítő Csapat Kft.", contact: "Horváth Géza · Brigádvezető", type: "partner", actorType: "installer", partnerId: "pt-beep", role: "Beépítő partner",
          worlds: ["projects"],
          perms: ["order.track"] },
        { id: "acc-b2c", name: "Nagy Anna", contact: "Magánszemély", type: "b2c", actorType: "client", role: "Ügyfél (B2C)",
          worlds: ["sales"],
          perms: ["quote.create", "order.track"] },
        { id: "acc-vendor", name: "Falco Sopron Zrt.", contact: "Varga Tamás · Beszállító", type: "partner", actorType: "supplier", partnerId: "pt-falco", portal: "supplier", supplierName: "Falco Sopron Zrt.", role: "Beszállító (portál)",
          worlds: [],
          perms: ["supplier.portal"] },
      ],
      partners: [
        { id: "pt-lap",  name: "Profi Lapszabász Kft.", actorType: "supplier",  platform: true,  contact: "Varga Tamás", specialty: "CNC lapszabászat, élzárás", makerCategories: ["Szekrény / tároló", "Ajtó / front", "Falpanel / burkolat"], capabilities: ["cutting", "edge"] },
        { id: "pt-elz",  name: "Élzáró Mester Bt.",      actorType: "supplier",  platform: true,  contact: "Németh Béla", specialty: "Élzárás, lézerélzárás", makerCategories: ["Ajtó / front", "Pult / munkalap"], capabilities: ["edge"] },
        { id: "pt-beep", name: "Beépítő Csapat Kft.",    actorType: "installer", platform: true,  contact: "Horváth Géza", specialty: "Helyszíni szerelés", capabilities: [] },
        { id: "pt-cnc",  name: "CNC Bérmunka Stúdió",    actorType: "supplier",  platform: true,  contact: "Fekete Pál",  specialty: "CNC megmunkálás", makerCategories: ["Ajtó / front", "Falpanel / burkolat", "Egyedi bútor"], capabilities: ["cnc"] },
        { id: "pt-fest", name: "Felület Stúdió Kft.",     actorType: "supplier",  platform: true,  contact: "Balázs Anna", specialty: "Lakkozás, festés, olajozás", makerCategories: ["Ajtó / front", "Egyedi bútor"], capabilities: ["surface"] },
        { id: "pt-teljes", name: "Komplett Bútorüzem Zrt.", actorType: "manufacturer", platform: true, contact: "Szabó Gergely", specialty: "Teljes bérgyártás: szabászat→élzárás→CNC→felület", makerCategories: ["Szekrény / tároló", "Ajtó / front", "Falpanel / burkolat", "Egyedi bútor", "Pult / munkalap"], capabilities: ["cutting", "edge", "cnc", "surface"] },
        { id: "pt-ext",  name: "Helyi Asztalos Műhely",  actorType: "supplier",  platform: false, contact: "Kis Sándor",  specialty: "Egyedi munkák (platformon kívül)", makerCategories: ["Konyhabútor", "Szekrény / tároló", "Egyedi bútor"], capabilities: ["cutting", "edge", "cnc", "surface"] },
        // Anyag-beszállítók (RFQ/PO lánc) — a beszállítói portál + partner-cockpit gazdag adatához
        { id: "pt-falco", name: "Falco Sopron Zrt.",     actorType: "supplier",  platform: true,  contact: "Varga Tamás", specialty: "Bútorlap, tölgy/bükk frontlap", makerCategories: [], capabilities: [] },
        { id: "pt-egger", name: "Egger Faipari Kft.",    actorType: "supplier",  platform: true,  contact: "Tóth Márk",   specialty: "MDF, melamin, élzáró", makerCategories: [], capabilities: [] },
      ],
      // ── Bérmunka művelet-típusok (Beállítások → Munkafolyamat → Bérmunka). Szerkeszthető.
      outsourceOps: g("MFG_OUTSOURCE_OPS", []),
      handshakes: [
        { id: "HS-014-1", projectId: "PRJ-2026-014", projectName: "Petőfi u. 12. — Konyha + nappali", epicId: "e14-4", epicTitle: "Frontlapok szabása", fromCompany: "JoineryTech (belső)", partnerId: "pt-lap", partnerName: "Profi Lapszabász Kft.", status: "accepted", external: false, note: "12 db front, tölgy furnér. Határidő szoros.", ts: "2026-05-26 10:12" },
        { id: "HS-013-1", projectId: "PRJ-2026-013", projectName: "Belváros Café — pultsor + bárszekrény", epicId: "e13-2", epicTitle: "Háttérszekrény élzárás", fromCompany: "JoineryTech (belső)", partnerId: "pt-elz", partnerName: "Élzáró Mester Bt.", status: "sent", external: false, note: "ABS 2mm, 18 fm. Várjuk a visszajelzést.", ts: "2026-05-29 14:40" },
        // Logisztika: kiszállítás+telepítés kiadva külső fuvar-/szerelőpartnernek
        { id: "HS-SH-007", kind: "transport", shipmentId: "SH-2426-007", projectName: "Tóth Konyha & Társa — kiszállítás", epicTitle: "Kiszállítás + telepítés (Szeged)", fromCompany: "JoineryTech (belső)", partnerId: "pt-beep", partnerName: "Beépítő Csapat Kft.", status: "sent", external: false, note: "Távoli helyszín, 2026-05-08. Konyhabútor beépítéssel.", ts: "2026-04-26 14:00" },
      ],
      // ── Sablonok: Beállítások → Munkafolyamat. Projekt- és epik-vázak újrafelhasználáshoz.
      templates: {
        project: [
          { id: "tpl-konyha", name: "Konyhabútor — teljes folyamat", desc: "Standard konyha ajánlattól átadásig, almérföldkövekkel a gyártásban.", color: "#7c3aed", milestones: [
            { name: "Ajánlat", epics: [
              { title: "Ajánlat összeállítás és elfogadás", ownerType: "manufacturer", tasks: ["Tételek felvitele", "Ügyfél jóváhagyás"] },
            ] },
            { name: "Felmérés", epics: [
              { title: "Helyszíni felmérés", ownerType: "manufacturer", tasks: ["Bemérés lézerrel", "Fotódokumentáció"] },
              { title: "Gyártási rajz jóváhagyás", ownerType: "designer", tasks: ["CAD modell", "Ügyfél jóváhagyás"] },
            ] },
            { name: "Gyártás", subMilestones: [
              { name: "Lapszabászat", epics: [ { title: "Frontlapok szabása", ownerType: "supplier", tasks: ["Anyag kivét", "CNC szabás", "QC mérés"] } ] },
              { name: "Élzárás + CNC", epics: [ { title: "Élzárás (ABS 2mm)", ownerType: "manufacturer", tasks: [] }, { title: "CNC fúrás + vasalat", ownerType: "manufacturer", tasks: [] } ] },
              { name: "Összeszerelés", epics: [ { title: "Korpusz összeállítás", ownerType: "manufacturer", tasks: [] } ] },
            ] },
            { name: "Beépítés", epics: [ { title: "Helyszíni szerelés", ownerType: "installer", tasks: [] } ] },
            { name: "Átadás", epics: [ { title: "Ügyfél átadás + jegyzőkönyv", ownerType: "client", tasks: [] } ] },
          ] },
          { id: "tpl-egyszeru", name: "Egyszerű bútor", desc: "Kis projekt: gyártás + beépítés. Egyfős / mikrovállalkozás.", color: "#0d9488", milestones: [
            { name: "Gyártás", epics: [ { title: "Bútor legyártása", ownerType: "manufacturer", tasks: ["Szabás", "Élzárás", "Összeszerelés"] } ] },
            { name: "Beépítés", epics: [ { title: "Helyszíni szerelés", ownerType: "installer", tasks: [] } ] },
          ] },
          { id: "tpl-iroda", name: "Irodabútor projekt", desc: "Nagyobb, programba szervezhető iroda-berendezés.", color: "#0ea5e9", milestones: [
            { name: "Tervezés", epics: [ { title: "Koncepció + látványterv", ownerType: "designer", tasks: ["Igényfelmérés", "3D látvány"] } ] },
            { name: "Gyártás", epics: [ { title: "Sorozatgyártás", ownerType: "manufacturer", tasks: [] } ] },
            { name: "Beépítés", epics: [ { title: "Telepítés helyszínen", ownerType: "installer", tasks: [] } ] },
          ] },
        ],
        epic: [
          { id: "etpl-lap",   name: "Lapszabászat",        ownerType: "supplier",     desc: "Szabás CNC-vel + minőségellenőrzés.", tasks: ["Anyag kivét raktárból", "CNC szabás", "QC mérés"] },
          { id: "etpl-elz",   name: "Élzárás",             ownerType: "manufacturer", desc: "ABS / lézer élzárás.",                 tasks: ["Élanyag előkészítés", "Élzárás", "Csiszolás"] },
          { id: "etpl-assy",  name: "Összeszerelés",       ownerType: "manufacturer", desc: "Korpusz + front beállítás.",          tasks: ["Vasalat furatok", "Korpusz összeállítás", "Front beállítás"] },
          { id: "etpl-inst",  name: "Helyszíni beépítés",  ownerType: "installer",    desc: "Szerelés + beüzemelés a helyszínen.", tasks: ["Helyszín előkészítés", "Szekrények rögzítése", "Beüzemelés + takarítás"] },
        ],
      },
      // ── Folyamatok (process engine): kirendeltségenként saját folyamat-definíciók.
      //    Strukturált folyam: step / branch (döntés) / parallel (fork-join) / loop (visszacsatolás).
      //    Külső lépés (external) → félautomata DRAFT kézfogás a projektre húzáskor.
      processes: [
        // Beépített SAJÁT GYÁRTÁS folyamat — a megrendelt, házon belül gyártott
        // tételekből generált gyártási alprojekt erre épül (ugyanaz a motor, mint
        // bármely projektnél). Anyagelőkészítéstől készre jelentésig, QC visszacsatolással.
        { id: "proc-vac-sajat", facilityId: "fac-vac", name: "Saját gyártás", color: "#0d9488",
          desc: "Belső műhely-gyártás: anyagelőkészítés → szabás → élzárás → CNC → összeszerelés → felület → QC → készre jelentés.",
          flow: [
            { id: "sg1", kind: "step", name: "Anyagelőkészítés", phase: "Anyag", actor: "manufacturer", external: false, sla: 4, subtasks: ["Komissiózás", "Élzáró + vasalat kikészítés"] },
            { id: "sgb1", kind: "branch", prompt: "Alapanyag raktáron?", paths: [
              { id: "sgp1a", label: "Raktáron", cond: "készlet ≥ igény", flow: [
                { id: "sg2", kind: "step", name: "Anyag kivét raktárból", phase: "Anyag", actor: "manufacturer", external: false, sla: 2, subtasks: ["Komissiózás"] },
              ] },
              { id: "sgp1b", label: "Beszerzés kell", cond: "készlet < igény", flow: [
                { id: "sg3", kind: "step", name: "Alapanyag beszerzés", phase: "Anyag", actor: "supplier", external: true, partnerType: "supplier", sla: 72, subtasks: ["Megrendelés", "Bevételezés"] },
              ] },
            ] },
            { id: "sg4", kind: "step", name: "Szabás", phase: "Gyártás", actor: "manufacturer", external: false, sla: 8, subtasks: ["Optimalizált vágóterv", "CNC szabás"] },
            { id: "sg5", kind: "step", name: "Élzárás", phase: "Gyártás", actor: "manufacturer", external: false, sla: 6, subtasks: ["ABS élzárás", "Saroktisztítás"] },
            { id: "sg6", kind: "step", name: "Furatolás / CNC megmunkálás", phase: "Gyártás", actor: "manufacturer", external: false, sla: 6, subtasks: ["Vasalat furatok", "Marások"] },
            { id: "sg7", kind: "step", name: "Összeszerelés", phase: "Összeszerelés", actor: "manufacturer", external: false, sla: 12, subtasks: ["Korpusz összeállítás", "Vasalatozás", "Front beállítás"] },
            { id: "sg8", kind: "step", name: "Felületkezelés", phase: "Felület", actor: "manufacturer", external: false, sla: 8, subtasks: ["Csiszolás", "Lakkozás / olajozás"] },
            { id: "sg9", kind: "step", name: "Minőségellenőrzés", phase: "Minőség", actor: "manufacturer", external: false, sla: 3, subtasks: ["Méretellenőrzés", "Felület ellenőrzés"] },
            { id: "sglp", kind: "loop", label: "Ha QC bukott → vissza összeszerelésre", cond: "QC = bukott", targetId: "sg7" },
            { id: "sg10", kind: "step", name: "Csomagolás + készre jelentés", phase: "Kész", actor: "manufacturer", external: false, sla: 3, subtasks: ["Védőcsomagolás", "Készre jelentés"] },
          ] },
        { id: "proc-vac-konyha", facilityId: "fac-vac", name: "Konyhabútor — teljes gyártás", color: "#7c3aed",
          desc: "Ajánlattól átadásig, lapszabász + beépítő külső átadással, QC visszacsatolással.",
          flow: [
            { id: "s1", kind: "step", name: "Ajánlat egyeztetés", phase: "Ajánlat", actor: "manufacturer", external: false, sla: 8, subtasks: ["Igényfelmérés", "Árajánlat kiküldés"] },
            { id: "s2", kind: "step", name: "Helyszíni felmérés", phase: "Felmérés", actor: "manufacturer", external: false, sla: 24, subtasks: ["Bemérés lézerrel", "Fotódokumentáció"] },
            { id: "s3", kind: "step", name: "Gyártási rajz jóváhagyás", phase: "Felmérés", actor: "designer", external: false, sla: 16, subtasks: ["CAD modell", "Ügyfél jóváhagyás"] },
            { id: "b1", kind: "branch", prompt: "Alapanyag elérhető raktáron?", paths: [
              { id: "p1a", label: "Raktáron", cond: "készlet ≥ igény", flow: [
                { id: "s4", kind: "step", name: "Anyag kivét raktárból", phase: "Gyártás", actor: "manufacturer", external: false, sla: 2, subtasks: ["Komissiózás"] },
              ] },
              { id: "p1b", label: "Beszerzés kell", cond: "készlet < igény", flow: [
                { id: "s5", kind: "step", name: "Alapanyag beszerzés", phase: "Gyártás", actor: "supplier", external: true, partnerType: "supplier", sla: 72, subtasks: ["Megrendelés", "Bevételezés"] },
              ] },
            ] },
            { id: "par1", kind: "parallel", lanes: [
              { id: "l1", label: "Lapszabászat (külső)", flow: [
                { id: "s6", kind: "step", name: "Frontlapok szabása", phase: "Gyártás", actor: "supplier", external: true, partnerType: "supplier", sla: 48, subtasks: ["CNC szabás", "Élzárás", "QC mérés"] },
              ] },
              { id: "l2", label: "Korpusz (belső)", flow: [
                { id: "s7", kind: "step", name: "Korpusz gyártás", phase: "Gyártás", actor: "manufacturer", external: false, sla: 36, subtasks: ["Szabás", "Élzárás", "Vasalat furatok"] },
              ] },
            ] },
            { id: "s8", kind: "step", name: "Összeszerelés", phase: "Gyártás", actor: "manufacturer", external: false, sla: 16, subtasks: ["Korpusz összeállítás", "Front beállítás"] },
            { id: "s9", kind: "step", name: "Minőségellenőrzés", phase: "Gyártás", actor: "manufacturer", external: false, sla: 4, subtasks: ["Méretellenőrzés", "Felület ellenőrzés"] },
            { id: "lp1", kind: "loop", label: "Ha QC bukott → vissza összeszerelésre", cond: "QC = bukott", targetId: "s8" },
            { id: "s10", kind: "step", name: "Helyszíni beépítés", phase: "Beépítés", actor: "installer", external: true, partnerType: "installer", sla: 24, subtasks: ["Szállítás", "Szerelés", "Beüzemelés"] },
            { id: "s11", kind: "step", name: "Ügyfél átadás", phase: "Átadás", actor: "client", external: false, sla: 4, subtasks: ["Minőségi jegyzőkönyv", "Aláírás"] },
          ] },
        { id: "proc-bp-gyors", facilityId: "fac-bp", name: "Gyors beépítés (kis projekt)", color: "#0d9488",
          desc: "Budapesti kirendeltség egyszerűsített, lineáris folyamata külső lapszabásszal.",
          flow: [
            { id: "bs1", kind: "step", name: "Felmérés + ajánlat", phase: "Felmérés", actor: "manufacturer", external: false, sla: 24, subtasks: ["Bemérés", "Árajánlat"] },
            { id: "bs2", kind: "step", name: "Lapszabászat (külső)", phase: "Gyártás", actor: "supplier", external: true, partnerType: "supplier", sla: 48, subtasks: ["CNC szabás", "Élzárás"] },
            { id: "bs3", kind: "step", name: "Összeszerelés + beépítés", phase: "Beépítés", actor: "manufacturer", external: false, sla: 16, subtasks: ["Összeszerelés", "Helyszíni szerelés"] },
            { id: "bs4", kind: "step", name: "Átadás", phase: "Átadás", actor: "client", external: false, sla: 2, subtasks: ["Jegyzőkönyv"] },
          ] },
        { id: "proc-bp-garancia", facilityId: "fac-bp", name: "Garanciális javítás", color: "#f59e0b",
          desc: "Bejelentés → diagnózis → javítási ág (helyszíni vagy műhelyes), ismételt ellenőrzéssel.",
          flow: [
            { id: "gs1", kind: "step", name: "Hibabejelentés rögzítés", phase: "Bejelentés", actor: "manufacturer", external: false, sla: 4, subtasks: ["Ügyfél egyeztetés"] },
            { id: "gs2", kind: "step", name: "Helyszíni diagnózis", phase: "Diagnózis", actor: "installer", external: false, sla: 24, subtasks: ["Hiba felmérés", "Fotó"] },
            { id: "gb1", kind: "branch", prompt: "Helyszínen javítható?", paths: [
              { id: "gp1", label: "Helyszínen", cond: "kis hiba", flow: [
                { id: "gs3", kind: "step", name: "Helyszíni javítás", phase: "Javítás", actor: "installer", external: false, sla: 8, subtasks: ["Csere/állítás"] },
              ] },
              { id: "gp2", label: "Műhelybe kell", cond: "nagy hiba", flow: [
                { id: "gs4", kind: "step", name: "Műhelyes javítás", phase: "Javítás", actor: "manufacturer", external: false, sla: 48, subtasks: ["Beszállítás", "Javítás", "Visszaszállítás"] },
              ] },
            ] },
            { id: "gs5", kind: "step", name: "Utóellenőrzés", phase: "Átadás", actor: "manufacturer", external: false, sla: 4, subtasks: ["Működés teszt"] },
            { id: "glp", kind: "loop", label: "Ha nem megfelelő → vissza diagnózisra", cond: "utóellenőrzés = bukott", targetId: "gs2" },
          ] },
      ],
      // ── Termékkonfigurátor (CPQ) — mentett konfigurációk (FSM: data-configurator.js) ──
      quoteConfigs: [
        { id: "CFG-2426-001", status: "veglegesitett", audience: "internal",
          categoryId: "cat-cabinet", catName: "Szekrény", tplId: "T-02", tplName: "Konyhai alsó szekrény (fiókos)", thumb: "drawer",
          vars: { width: 600, depth: 560, drawers: 3, body: "EG-3303-18", front: "EG-3327-19" }, dims: "600 × 720 × 560 mm",
          styleId: "ST-01", styleName: "Skandi tölgy — matt", techId: "MS-01", techName: "Standard gyártási előírás",
          qty: 6, customer: "Bognár Bútor Kft.", contact: "",
          unitPrice: 84200, net: 505200, bandPct: 7, estLo: 469836, estHi: 540564, laborHours: 30, deliveryDays: 12,
          createdBy: "Szabó A.", createdAt: "2026-04-26", quoteRef: null, leadRef: null, note: "Konyha alsó sor — 6 elem." },
        { id: "CFG-2426-002", status: "piszkozat", audience: "webshop",
          categoryId: "cat-cabinet", catName: "Szekrény", tplId: "T-01", tplName: "Polcos szekrény (2 polcos)", thumb: "cabinet",
          vars: { width: 1000, height: 2000, depth: 400, shelves: 3, body: "EG-1133-18", back: "HDF-003" }, dims: "1000 × 2000 × 400 mm",
          styleId: "ST-02", styleName: "Premium antracit — selyemfény", techId: "MS-02", techName: "Gazdaságos — GTV",
          qty: 1, customer: "", contact: "Kovács Anna · +36 30 111 2233",
          unitPrice: 138400, net: 138400, bandPct: 14, estLo: 119024, estHi: 157776, laborHours: 3.5, deliveryDays: 10,
          createdBy: "Webshop", createdAt: "2026-04-27", quoteRef: null, leadRef: null, note: "Nappali könyvespolc — antracit." },
        { id: "CFG-2426-003", status: "ajanlatban", audience: "internal",
          categoryId: "cat-door", catName: "Ajtó", tplId: "T-03", tplName: "Belső ajtó — bélelt", thumb: "door",
          vars: { width: 900, height: 2100, body: "TL-040" }, dims: "900 × 2100 mm",
          styleId: "ST-03", styleName: "Tölgy bélelt ajtó", techId: "MS-03", techName: "Ajtó — precíz",
          qty: 4, customer: "Doorstar Hungary Zrt.", contact: "",
          unitPrice: 168000, net: 672000, bandPct: 3, estLo: 651840, estHi: 692160, laborHours: 10, deliveryDays: 7,
          createdBy: "Kovács P.", createdAt: "2026-04-24", quoteRef: "Q-2426-056", leadRef: null, note: "4 db tölgy ajtó — Doorstar." },
      ],
      cfgSeq: 3,
      // ── Összeállítás / Bútorsor (falnézet) — Belsőépítészet (data-composition.js) ──
      compositions: [
        { id: "KOMP-2426-001", status: "veglegesitett", name: "Várdai konyha — bútorsor", room: "Konyha",
          wallWidth: 3600, wallHeight: 2700, createdBy: "Vella A.", createdAt: "2026-04-26", quoteRef: null, note: "L-alak rövidebb fala — alsó + felső sor.",
          items: [
            { uid: "it-k1a", categoryId: "cat-cabinet", catName: "Szekrény", tplId: "T-02", tplName: "Konyhai alsó szekrény (fiókos)", thumb: "drawer", mount: "floor", qty: 1,
              vars: { width: 600, depth: 560, drawers: 3 }, dims: "600 × 720 × 560 mm", styleId: "ST-01", styleName: "Skandi tölgy — matt", techId: "MS-01", techName: "Standard gyártási előírás", unitPrice: 84200, bandPct: 7, deliveryDays: 12 },
            { uid: "it-k1b", categoryId: "cat-cabinet", catName: "Szekrény", tplId: "T-02", tplName: "Konyhai alsó szekrény (fiókos)", thumb: "drawer", mount: "floor", qty: 1,
              vars: { width: 600, depth: 560, drawers: 3 }, dims: "600 × 720 × 560 mm", styleId: "ST-01", styleName: "Skandi tölgy — matt", techId: "MS-01", techName: "Standard gyártási előírás", unitPrice: 84200, bandPct: 7, deliveryDays: 12 },
            { uid: "it-k1c", categoryId: "cat-cabinet", catName: "Szekrény", tplId: "T-01", tplName: "Polcos szekrény (2 polcos)", thumb: "cabinet", mount: "floor", qty: 1,
              vars: { width: 800, height: 720, depth: 560, shelves: 2 }, dims: "800 × 720 × 560 mm", styleId: "ST-01", styleName: "Skandi tölgy — matt", techId: "MS-01", techName: "Standard gyártási előírás", unitPrice: 76400, bandPct: 7, deliveryDays: 10 },
            { uid: "it-k1d", categoryId: "cat-cabinet", catName: "Szekrény", tplId: "T-01", tplName: "Polcos szekrény (2 polcos)", thumb: "cabinet", mount: "wall", qty: 1,
              vars: { width: 600, height: 700, depth: 350, shelves: 2 }, dims: "600 × 700 × 350 mm", styleId: "ST-01", styleName: "Skandi tölgy — matt", techId: "MS-01", techName: "Standard gyártási előírás", unitPrice: 58200, bandPct: 7, deliveryDays: 10 },
            { uid: "it-k1e", categoryId: "cat-cabinet", catName: "Szekrény", tplId: "T-01", tplName: "Polcos szekrény (2 polcos)", thumb: "cabinet", mount: "wall", qty: 1,
              vars: { width: 600, height: 700, depth: 350, shelves: 2 }, dims: "600 × 700 × 350 mm", styleId: "ST-01", styleName: "Skandi tölgy — matt", techId: "MS-01", techName: "Standard gyártási előírás", unitPrice: 58200, bandPct: 7, deliveryDays: 10 },
          ] },
        { id: "KOMP-2426-002", status: "piszkozat", name: "Hegyi gardrób — fal", room: "Háló",
          wallWidth: 2800, wallHeight: 2600, createdBy: "Vella A.", createdAt: "2026-04-27", quoteRef: null, note: "Beépített gardrób, egy fal.",
          items: [
            { uid: "it-g1a", categoryId: "cat-cabinet", catName: "Szekrény", tplId: "T-01", tplName: "Polcos szekrény (2 polcos)", thumb: "cabinet", mount: "floor", qty: 1,
              vars: { width: 1000, height: 2400, depth: 600, shelves: 4 }, dims: "1000 × 2400 × 600 mm", styleId: "ST-02", styleName: "Premium antracit — selyemfény", techId: "MS-01", techName: "Standard gyártási előírás", unitPrice: 168000, bandPct: 7, deliveryDays: 12 },
          ] },
      ],
      compoSeq: 2,
      hub: { open: false, tab: "team", view: "list", activeId: null, draft: null },
    };
  }

  // ── Persistence + observable core ───────────────────────────────────────────
  let state = null;
  const listeners = new Set();

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.v >= 26) {
          if (!parsed.worldCatalogPins) parsed.worldCatalogPins = {};
          if (!parsed.warehouseCfg) parsed.warehouseCfg = { levels: { telephely: true, raktar: true, helyiseg: false, tarolo: true, rekesz: false } };
          if (!parsed.warehouseLocations) parsed.warehouseLocations = [];
          if (!parsed.withdrawals) parsed.withdrawals = [];
          if (parsed.whSeq == null) parsed.whSeq = 32;
          if (!parsed.supplierMap) { const sd = seed(); parsed.supplierMap = sd.supplierMap; parsed.smSeq = sd.smSeq; }
          if (parsed.smSeq == null) parsed.smSeq = (parsed.supplierMap || []).length;
          if (!parsed.procCatalog || !parsed.procCatalog.length) { const sd = seed(); parsed.procCatalog = sd.procCatalog; parsed.procSeq = sd.procSeq; }
          if (parsed.procSeq == null) parsed.procSeq = (parsed.procCatalog || []).length;
          if (!parsed.finInvoices) { const sd = seed(); parsed.finInvoices = sd.finInvoices; parsed.finPayments = sd.finPayments; parsed.finSeq = sd.finSeq; parsed.finPmtSeq = sd.finPmtSeq; }
          if (parsed.finPayments == null) parsed.finPayments = [];
          if (parsed.finSeq == null) parsed.finSeq = 44;
          if (parsed.finPmtSeq == null) parsed.finPmtSeq = 9;
          // Logisztika: hiányzó fuvar-mezők pótlása
          if (!parsed.shipments) { const sd = seed(); parsed.shipments = sd.shipments; parsed.vehicles = sd.vehicles; parsed.crews = sd.crews; parsed.shipSeq = sd.shipSeq; }
          if (!parsed.vehicles) { const sd = seed(); parsed.vehicles = sd.vehicles; }
          if (!parsed.crews) { const sd = seed(); parsed.crews = sd.crews; }
          if (parsed.shipSeq == null) parsed.shipSeq = (parsed.shipments || []).length;
          // Kontrolling: config + kézi korrekciók pótlása
          if (!parsed.ctrlConfig) { const sd = seed(); parsed.ctrlConfig = sd.ctrlConfig; }
          if (!parsed.ctrlAdjustments) { const sd = seed(); parsed.ctrlAdjustments = sd.ctrlAdjustments; parsed.ctrlAdjSeq = sd.ctrlAdjSeq; }
          if (parsed.ctrlAdjSeq == null) parsed.ctrlAdjSeq = (parsed.ctrlAdjustments || []).length;
          // Reklamáció: szerviz-jegyek pótlása
          if (!parsed.serviceTickets) { const sd = seed(); parsed.serviceTickets = sd.serviceTickets; parsed.svcSeq = sd.svcSeq; }
          if (parsed.svcSeq == null) parsed.svcSeq = (parsed.serviceTickets || []).length;
          // HR: dolgozók + távollétek + hozzárendelések + munkaóra-napló pótlása
          if (!parsed.employees) { const sd = seed(); parsed.employees = sd.employees; parsed.hrSeq = sd.hrSeq; }
          if (!parsed.absences) { const sd = seed(); parsed.absences = sd.absences; parsed.absSeq = sd.absSeq; }
          if (!parsed.assignments) { const sd = seed(); parsed.assignments = sd.assignments; parsed.asgSeq = sd.asgSeq; }
          if (!parsed.timeLogs) { const sd = seed(); parsed.timeLogs = sd.timeLogs; parsed.tlSeq = sd.tlSeq; }
          if (parsed.hrSeq == null) parsed.hrSeq = (parsed.employees || []).length;
          if (parsed.absSeq == null) parsed.absSeq = (parsed.absences || []).length;
          if (parsed.asgSeq == null) parsed.asgSeq = (parsed.assignments || []).length;
          if (parsed.tlSeq == null) parsed.tlSeq = (parsed.timeLogs || []).length;
          // a régi crews kapjon memberIds-t (HR-link), ha hiányzik
          if (parsed.crews) { const sd = seed(); parsed.crews.forEach((c) => { if (!c.memberIds) { const m = (sd.crews || []).find((x) => x.id === c.id); if (m) c.memberIds = m.memberIds; } }); }
          // Karbantartás: eszközök + munkalapok + tervek + állásidő pótlása
          if (!parsed.assets) { const sd = seed(); parsed.assets = sd.assets; parsed.assetSeq = sd.assetSeq; }
          if (!parsed.workOrders) { const sd = seed(); parsed.workOrders = sd.workOrders; parsed.woSeq = sd.woSeq; }
          if (!parsed.maintPlans) { const sd = seed(); parsed.maintPlans = sd.maintPlans; parsed.planSeq = sd.planSeq; }
          if (!parsed.downtime) { const sd = seed(); parsed.downtime = sd.downtime; parsed.dtSeq = sd.dtSeq; }
          if (parsed.assetSeq == null) parsed.assetSeq = (parsed.assets || []).length;
          if (parsed.woSeq == null) parsed.woSeq = (parsed.workOrders || []).length;
          if (parsed.planSeq == null) parsed.planSeq = (parsed.maintPlans || []).length;
          if (parsed.dtSeq == null) parsed.dtSeq = (parsed.downtime || []).length;
          // CRM: leadek + lehetőségek + feladatok pótlása
          if (!parsed.leads) { const sd = seed(); parsed.leads = sd.leads; parsed.leadSeq = sd.leadSeq; }
          if (!parsed.opportunities) { const sd = seed(); parsed.opportunities = sd.opportunities; parsed.oppSeq = sd.oppSeq; }
          if (!parsed.crmTasks) { const sd = seed(); parsed.crmTasks = sd.crmTasks; parsed.crmTaskSeq = sd.crmTaskSeq; }
          if (parsed.leadSeq == null) parsed.leadSeq = (parsed.leads || []).length;
          if (parsed.oppSeq == null) parsed.oppSeq = (parsed.opportunities || []).length;
          if (parsed.crmTaskSeq == null) parsed.crmTaskSeq = (parsed.crmTasks || []).length;
          // Minőség / Dokumentumok / Jelenlét pótlása
          if (!parsed.qaInspections) { const sd = seed(); parsed.qaInspections = sd.qaInspections; parsed.qaSeq = sd.qaSeq; }
          // Munkavédelem / EHS pótlása (additív — nincs LS-bump)
          if (!parsed.ehsIncidents) { const sd = seed(); parsed.ehsIncidents = sd.ehsIncidents; parsed.ehsIncSeq = sd.ehsIncSeq; }
          if (!parsed.ehsRisks) { const sd = seed(); parsed.ehsRisks = sd.ehsRisks; parsed.ehsRiskSeq = sd.ehsRiskSeq; }
          if (!parsed.ehsTrainings) { const sd = seed(); parsed.ehsTrainings = sd.ehsTrainings; parsed.ehsTrainSeq = sd.ehsTrainSeq; }
          // Partner-kapcsolat nézet (additív — nincs LS-bump)
          if (!parsed.partnerNotes) { const sd = seed(); parsed.partnerNotes = sd.partnerNotes || []; }
          if (!parsed.partnerProfiles) { const sd = seed(); parsed.partnerProfiles = sd.partnerProfiles || {}; }
          // Gér/szög él-specifikáció (Tervezés) pótlása
          if (!parsed.partMiters) { const sd = seed(); parsed.partMiters = sd.partMiters; }
          // Műszaki tervezés — sablon-műhely pótlása
          if (!parsed.designTemplates) { const sd = seed(); parsed.designTemplates = sd.designTemplates; parsed.dtplSeq = sd.dtplSeq; }
          // Váz-sablon könyvtár (§21.5) pótlása (LS-bump nélkül)
          if (!parsed.skeletonPresets) { parsed.skeletonPresets = clone(window.SKELETON_PRESETS_SEED || []); parsed.skelSeq = 3; }
          // Parametrikus geometria (§20) — hiányzó seed-jointok + flip/offsetV pótlása (LS-bump nélkül)
          try {
            (parsed.designTemplates || []).forEach((t) => {
              const sdt = (typeof DESIGN_TEMPLATES_SEED !== "undefined" ? DESIGN_TEMPLATES_SEED : []).find((x) => x.id === t.id);
              if (!sdt) return;
              // §21 MIGRÁCIÓ: a seed már skeleton-alapú, a tárolt még nem → váz +
              // kötések + binding (név szerint) átvétele; a legacy joints-ot a
              // SZÁRMAZTATOTT tükör váltja (jointMiters/jointOps tovább él belőle).
              if (sdt.skeleton && !t.skeleton) {
                t.skeleton = clone(sdt.skeleton);
                t.connections = clone(sdt.connections || []);
                const sByName = Object.fromEntries((sdt.parts || []).map((p) => [p.name, p]));
                (t.parts || []).forEach((p) => {
                  const sp = sByName[p.name];
                  if (sp && sp.binding && !p.binding) { p.binding = clone(sp.binding); p.w = sp.w; p.h = sp.h; p.t = sp.t; }
                });
                t.joints = clone(sdt.joints || []);
                return;
              }
              if (!Array.isArray(t.joints)) t.joints = [];
              // takarítás: korábbi teszt-maradvány — érintetlen default-kapcsolat, aminek
              // a (part,part) párját seed-joint is lefedi → a seed-változat él tovább
              const sPairs = (sdt.joints || []).map((x) => [x.a.part, x.b.part].sort().join("|"));
              t.joints = t.joints.filter((j) => {
                const isSeed = (sdt.joints || []).some((x) => x.id === j.id);
                if (isSeed) return true;
                const untouched = j.machining === "koldokcsap" && !(j.offset || 0) && !(j.offsetV || 0) && !j.ger && !(j.note || "").trim();
                const dup = sPairs.includes([j.a && j.a.part, j.b && j.b.part].sort().join("|"));
                return !(untouched && dup);
              });
              (sdt.joints || []).forEach((sj) => {
                const j = t.joints.find((x) => x.id === sj.id);
                if (!j) {
                  // csak akkor pótolható, ha a hivatkozott alkatrészek léteznek a tárolt sablonban
                  const names = (t.parts || []).map((p) => p.name);
                  if (names.includes(sj.a.part) && names.includes(sj.b.part)) t.joints.push(JSON.parse(JSON.stringify(sj)));
                  return;
                }
                if (j.flip == null && sj.flip != null) j.flip = sj.flip;
                if (j.offsetV == null && sj.offsetV != null) { j.offsetV = sj.offsetV; if (sj.note) j.note = j.note || sj.note; }
                // érintetlen seed-joint (azonos note) kinullázott geometria-mezőinek helyreállítása
                if (j.note === sj.note && !(j.offset || 0) && !(j.offsetV || 0) && ((sj.offset || 0) || (sj.offsetV || 0))) {
                  j.offset = sj.offset || 0; j.offsetV = sj.offsetV || 0;
                }
              });
            });
          } catch (e) {}
          if (parsed.dtplSeq == null) parsed.dtplSeq = 10;
          if (parsed.qaSeq == null) parsed.qaSeq = (parsed.qaInspections || []).length;
          if (!parsed.documents) { const sd = seed(); parsed.documents = sd.documents; parsed.docSeq = sd.docSeq; }
          if (parsed.docSeq == null) parsed.docSeq = (parsed.documents || []).length;
          if (!parsed.attendance) { const sd = seed(); parsed.attendance = sd.attendance; parsed.attSeq = sd.attSeq; }
          if (parsed.attSeq == null) parsed.attSeq = (parsed.attendance || []).length;
          // RFQ / Leltár / Gyártásütemezés pótlása (4.8-A)
          if (!parsed.rfqs) { const sd = seed(); parsed.rfqs = sd.rfqs; parsed.rfqSeq = sd.rfqSeq; }
          if (parsed.rfqSeq == null) parsed.rfqSeq = (parsed.rfqs || []).length;
          if (!parsed.stocktakes) { const sd = seed(); parsed.stocktakes = sd.stocktakes; parsed.stkSeq = sd.stkSeq; }
          if (parsed.stkSeq == null) parsed.stkSeq = (parsed.stocktakes || []).length;
          if (!parsed.prodTasks) { const sd = seed(); parsed.prodTasks = sd.prodTasks; parsed.prodTaskSeq = sd.prodTaskSeq; }
          if (parsed.prodTaskSeq == null) parsed.prodTaskSeq = (parsed.prodTasks || []).length;
          if (!parsed.authConfig) { const sd = seed(); parsed.authConfig = sd.authConfig; }
          if (!parsed.approvals) { const sd = seed(); parsed.approvals = sd.approvals; parsed.apprSeq = sd.apprSeq; }
          if (parsed.apprSeq == null) parsed.apprSeq = (parsed.approvals || []).length;
          if (parsed.authConfig && parsed.authConfig.overtimeHours == null) parsed.authConfig.overtimeHours = 2;
          if (!parsed.contracts) { const sd = seed(); parsed.contracts = sd.contracts; parsed.ctrSeq = sd.ctrSeq; }
          if (parsed.ctrSeq == null) parsed.ctrSeq = (parsed.contracts || []).length;
          // Termékkonfigurátor (CPQ): mentett konfigurációk pótlása (4.7-A)
          if (!parsed.quoteConfigs) { const sd = seed(); parsed.quoteConfigs = sd.quoteConfigs; parsed.cfgSeq = sd.cfgSeq; }
          if (parsed.cfgSeq == null) parsed.cfgSeq = (parsed.quoteConfigs || []).length;
          // Összeállítás / Bútorsor (falnézet) pótlása
          if (!parsed.compositions) { const sd = seed(); parsed.compositions = sd.compositions; parsed.compoSeq = sd.compoSeq; }
          if (parsed.compoSeq == null) parsed.compoSeq = (parsed.compositions || []).length;
          // Szabászat-nesting + maradékanyag-raktár (4.7-A)
          if (!parsed.nestJobs) { const sd = seed(); parsed.nestJobs = sd.nestJobs; parsed.nestSeq = sd.nestSeq; }
          if (!parsed.nestPlans) parsed.nestPlans = [];
          if (!parsed.offcuts) { const sd = seed(); parsed.offcuts = sd.offcuts; parsed.offcutSeq = sd.offcutSeq; }
          if (parsed.nestSeq == null) parsed.nestSeq = 184;
          if (parsed.offcutSeq == null) parsed.offcutSeq = (parsed.offcuts || []).length;
          // Üzemvezető (dispatch) világ — meglévő fiókok aktiválása (bump nélkül)
          (parsed.accounts || []).forEach((a) => {
            if (a.id === "acc-internal" && a.worlds && !a.worlds.includes("supervisor")) {
              const i = a.worlds.indexOf("production");
              a.worlds.splice(i >= 0 ? i + 1 : a.worlds.length, 0, "supervisor");
            }
            // Gyártás-előkészítés világ — meglévő fiókok aktiválása (bump nélkül)
            if (a.id === "acc-internal" && a.worlds && !a.worlds.includes("mfgprep")) {
              const i = a.worlds.indexOf("production");
              a.worlds.splice(i >= 0 ? i + 1 : a.worlds.length, 0, "mfgprep");
            }
            // Műszaki tervezés jog — meglévő belső fiók aktiválása (bump nélkül)
            if (a.id === "acc-internal" && a.perms && !a.perms.includes("design.engineer")) a.perms.push("design.engineer");
            // AI munkaterület — meglévő belső fiók aktiválása (bump nélkül)
            if (a.id === "acc-internal" && a.worlds && !a.worlds.includes("ai")) {
              const i = a.worlds.indexOf("finance");
              a.worlds.splice(i >= 0 ? i + 1 : a.worlds.length, 0, "ai");
            }
            if (a.id === "acc-internal" && a.perms && !a.perms.includes("ai.manage")) a.perms.push("ai.manage");
            // Munkavédelem / EHS — meglévő belső fiók aktiválása (bump nélkül)
            if (a.id === "acc-internal" && a.worlds && !a.worlds.includes("ehs")) {
              const i = a.worlds.indexOf("quality");
              a.worlds.splice(i >= 0 ? i + 1 : a.worlds.length, 0, "ehs");
            }
            if (a.id === "acc-internal" && a.perms && !a.perms.includes("ehs.manage")) a.perms.push("ehs.manage");
            // Vezetői BI-cockpit jog — meglévő belső fiók aktiválása (bump nélkül)
            if (a.id === "acc-internal" && a.perms && !a.perms.includes("controlling.exec")) a.perms.push("controlling.exec");
          });
          // Beszállítói portál — új beszállítói fiók + nyitott RFQ pótlása (bump nélkül)
          if (parsed.accounts && !parsed.accounts.find((a) => a.id === "acc-vendor")) {
            const sd = seed(); const v = (sd.accounts || []).find((a) => a.id === "acc-vendor"); if (v) parsed.accounts.push(v);
          }
          // Partner-cockpit — anyag-beszállítók (Falco/Egger) pótlása a partners listába (bump nélkül)
          if (parsed.partners) {
            const sd = seed();
            ["pt-falco", "pt-egger"].forEach((pid) => {
              if (!parsed.partners.find((p) => p.id === pid)) { const np = (sd.partners || []).find((p) => p.id === pid); if (np) parsed.partners.push(np); }
            });
          }
          if (parsed.rfqs && !parsed.rfqs.find((r) => r.id === "RFQ-2426-005")) {
            const sd = seed(); const r5 = (sd.rfqs || []).find((r) => r.id === "RFQ-2426-005"); if (r5) parsed.rfqs.unshift(r5);
          }
          // Beszállítói számla-benyújtás (4.12) — demó: feladott (számlázható) + már benyújtott PO + a hozzá tartozó bejövő számla (bump nélkül)
          if (parsed.pos) {
            const sd = seed();
            const p93 = parsed.pos.find((p) => p.id === "PO-2426-093");
            if (p93 && !p93.shipped) { const np = (sd.pos || []).find((p) => p.id === "PO-2426-093"); if (np) Object.assign(p93, np); }
            if (!parsed.pos.find((p) => p.id === "PO-2426-094")) { const np = (sd.pos || []).find((p) => p.id === "PO-2426-094"); if (np) parsed.pos.push(np); }
          }
          if (parsed.finInvoices && !parsed.finInvoices.find((v) => v.id === "SINV-2426-045")) {
            const sd = seed(); const si = (sd.finInvoices || []).find((v) => v.id === "SINV-2426-045"); if (si) parsed.finInvoices.unshift(si);
          }
          // Ügyfél-portál demó (Nagy Anna) — számlák + kifizetés + szerződés + látható mérföldkövek (bump nélkül)
          if (parsed.finInvoices && !parsed.finInvoices.find((v) => v.id === "SZ-2426-0060")) {
            const sd = seed();
            ["SZ-2426-0060", "SZ-2426-0061", "DB-2426-010"].forEach((iid) => { const iv = (sd.finInvoices || []).find((v) => v.id === iid); if (iv) parsed.finInvoices.unshift(iv); });
            if (parsed.finPayments && !parsed.finPayments.find((p) => p.id === "PMT-0009")) { const pm = (sd.finPayments || []).find((p) => p.id === "PMT-0009"); if (pm) parsed.finPayments.unshift(pm); if ((parsed.finPmtSeq || 0) < 10) parsed.finPmtSeq = 10; }
          }
          if (parsed.contracts && !parsed.contracts.find((c) => c.id === "SZD-2426-003")) {
            const sd = seed(); const ct = (sd.contracts || []).find((c) => c.id === "SZD-2426-003"); if (ct) parsed.contracts.unshift(ct);
          }
          if (parsed.projects) {
            const sd = seed();
            const p14 = parsed.projects.find((p) => p.id === "PRJ-2026-014");
            const sp14 = (sd.projects || []).find((p) => p.id === "PRJ-2026-014");
            if (p14 && !(p14.customerMilestones && p14.customerMilestones.length) && sp14) p14.customerMilestones = sp14.customerMilestones;
          }
          // Ügyfél-portál projekt-betekintő demó (4.14) — Nagy Anna rendelés + ajánlatok + brief (additív, idempotens)
          {
            const sd = seed();
            if (parsed.orders && !parsed.orders.find((o) => o.id === "JT-2426-0185")) { const o = (sd.orders || []).find((x) => x.id === "JT-2426-0185"); if (o) parsed.orders.unshift(o); }
            if (parsed.quotes) { ["Q-2426-061", "Q-2426-062"].forEach((qid) => { if (!parsed.quotes.find((x) => x.id === qid)) { const q = (sd.quotes || []).find((x) => x.id === qid); if (q) parsed.quotes.unshift(q); } }); }
            if (!parsed.briefs) parsed.briefs = [];
            if (!parsed.briefs.find((b) => b.id === "BRF-2426-009")) { const b = (sd.briefs || []).find((x) => x.id === "BRF-2426-009"); if (b) parsed.briefs.push(b); if ((parsed.briefSeq || 0) < 9) parsed.briefSeq = 9; }
          }
          // Cikkszám-életciklus: régi tételek státusz nélkül → "active" (jóváhagyott).
          (parsed.catalog || []).forEach((it) => { if (!it.status) it.status = "active"; });
          // AI munkaterület — régi LS-ben hiányzó tömbök pótlása (bump nélkül)
          if (!parsed.aiSkills) { parsed.aiSkills = (typeof AI_SKILLS_SEED !== "undefined") ? clone(AI_SKILLS_SEED) : []; parsed.aiSkillSeq = 7; }
          if (!parsed.aiAgents) { parsed.aiAgents = (typeof AI_AGENTS_SEED !== "undefined") ? clone(AI_AGENTS_SEED) : []; parsed.aiAgentSeq = 4; }
          if (!parsed.aiMemory) { parsed.aiMemory = (typeof AI_MEMORY_SEED !== "undefined") ? clone(AI_MEMORY_SEED) : []; parsed.aiMemSeq = 6; }
          if (parsed.aiProjectPrompt == null) parsed.aiProjectPrompt = "";
          normalizeAllWarehouse(parsed);
          delete parsed.intCatProducts; // derived from catalog
          rebuildBridges(parsed);
          return parsed;
        }
      }
    } catch (e) {}
    const s = seed();
    normalizeAllWarehouse(s);
    rebuildBridges(s);
    return s;
  }
  function persist() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }
  function ensure() { if (!state) { state = load(); syncTemplateRegistry(state); } return state; }
  function emit() { persist(); rebuildBridges(state); syncTemplateRegistry(state); listeners.forEach((fn) => fn()); }
  function set(updater) {
    ensure();
    const next = typeof updater === "function" ? updater(state) : updater;
    state = { ...state, ...next };
    emit();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const trendFor = (m) => (m.onHand <= 0 ? "critical" : m.onHand < m.min ? (m.onHand < m.min / 2 ? "critical" : "low") : "ok");

  // ── MŰSZAKI TERVEZÉS: sablon-registry tükör ─────────────────────────────
  //   A window.PARAM_TEMPLATES a FELOLDÓ-REGISTRY — minden fogyasztó ezt olvassa
  //   (konfigurátor, ármotor evaluateConfig, MfgPrep deriveItem, bútorsor, wizard).
  //   Tartalma: gyári bázis (PARAM_TEMPLATES_BASE pillanatkép) felülírva/kiegészítve
  //   a store KIADOTT sablonjaival; revízió alatt (kiadott→ellenorzes) a lastReleased
  //   pillanatkép marad élesben. IN-PLACE mutáció (length=0 + push), mert több fájl
  //   a const-bindinget csupaszon olvassa — újra-értékadás NEM érne el hozzájuk.
  function syncTemplateRegistry(s) {
    const arr = window.PARAM_TEMPLATES;
    if (!arr) return;
    if (!window.PARAM_TEMPLATES_BASE) window.PARAM_TEMPLATES_BASE = arr.slice();
    const base = window.PARAM_TEMPLATES_BASE;
    const live = [];
    (((s || {}).designTemplates) || []).forEach((t) => {
      if (t.status === "kiadott") live.push(t);
      else if (t.status !== "archivalt" && t.lastReleased) live.push(t.lastReleased);
    });
    const byId = {};
    live.forEach((t) => { byId[t.id] = t; });
    arr.length = 0;
    base.forEach((t) => arr.push(byId[t.id] || t));
    live.forEach((t) => { if (!base.some((b) => b.id === t.id)) arr.push(t); });
  }

  // ── Raktár lot-modell: a worldExt.warehouse SZÁMÍTOTT tükör-mezői ─────────────
  // A zóna a lot elérhetőségi státusza; a SZABAD (general) készlet hajtja a trendet.
  // onHand/available/reserved/trend/location SOHA nem szerkesztett kézzel — innen jön.
  function normWarehouse(wh) {
    if (!wh) return wh;
    const live = (wh.lots || []).filter((l) => l && (Number(l.qty) || 0) > 0);
    const onHand    = live.reduce((a, l) => a + (Number(l.qty) || 0), 0);
    const available = live.filter((l) => l.zone === "general").reduce((a, l) => a + (Number(l.qty) || 0), 0);
    const reserved  = onHand - available;
    const min = Number(wh.min) || 0;
    const trend = onHand <= 0 ? "critical" : available < min ? (available < min / 2 ? "critical" : "low") : "ok";
    const primary = live.slice().sort((a, b) => (Number(b.qty) || 0) - (Number(a.qty) || 0))[0];
    const location = primary ? (primary.locText || "") : (wh.location || "");
    return { ...wh, lots: wh.lots || [], min, onHand, available, reserved, trend, location };
  }
  function normalizeAllWarehouse(st) {
    if (!st || !Array.isArray(st.catalog)) return st;
    st.catalog = st.catalog.map((it) => {
      const wh = it.worldExt && it.worldExt.warehouse;
      if (!wh || !Array.isArray(wh.lots)) return it;
      return { ...it, worldExt: { ...it.worldExt, warehouse: normWarehouse(wh) } };
    });
    return st;
  }
  // Egy katalógus tétel warehouse mezőjének mutálása (fn ad új lots-t), majd norm.
  function mutateWarehouse(s, id, fn) {
    return {
      catalog: s.catalog.map((it) => {
        if (it.id !== id) return it;
        const cur = (it.worldExt && it.worldExt.warehouse) || { min: 0, lots: [] };
        const next = normWarehouse(fn({ ...cur, lots: [...(cur.lots || [])] }));
        return { ...it, worldExt: { ...(it.worldExt || {}), warehouse: next } };
      }),
    };
  }
  const nowStamp = () => today + " " + new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
  const EPIC_LABELS = { BACKLOG_READY: "Indítható", IN_DEV: "Folyamatban", IN_REVIEW: "Ellenőrzés", CLOSED_DONE: "Kész", CLOSED_BLOCKED: "Blokkolt" };
  const EPIC_LABEL = (k) => EPIC_LABELS[k] || k;
  const hm = () => new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });

  // ── Central catalog bridge builders ──────────────────────────────────────────
  // After each store update, derived globals are recomputed from the central
  // catalog so all consuming code (specs-engine, page-design, etc.) stays in sync.
  function rebuildBridges(st) {
    // CATALOG_LOOKUP — lapanyag-tételekből (props.t megléte jelzi)
    const cl = {};
    (st.catalog || []).filter((it) => it.active !== false && it.props && it.props.t != null)
      .forEach((it) => { cl[it.code] = { name: it.name, t: Number(it.props.t) || 18, kind: it.props.kind || "", color: it.props.lookupColor || "#cbb88e" }; });
    if (Object.keys(cl).length > 0) window.CATALOG_LOOKUP = cl;

    // HARDWARE_CATALOG — szerkezeti vasalat-tételekből (props.hardwareId megléte jelzi)
    const hw = {};
    (st.catalog || []).filter((it) => it.active !== false && it.props && it.props.hardwareId)
      .forEach((it) => {
        hw[it.props.hardwareId] = {
          id: it.props.hardwareId, name: it.name, unit: it.unit,
          brands: (it.worldExt && it.worldExt.design && it.worldExt.design.brands) || {},
        };
      });
    if (Object.keys(hw).length > 0) window.HARDWARE_CATALOG = hw;
  }

  function postSystem(text, channelId = "sys") {
    if (!state.settings.eventMessages) return;
    state.convos = state.convos.map((c) =>
      c.id === channelId
        ? { ...c, unread: state.hub.open && state.hub.activeId === c.id ? 0 : (c.unread || 0) + 1,
            messages: [...c.messages, { id: Date.now() + Math.random(), from: "Rendszer", initials: "R", text, ts: hm(), me: false, system: true }] }
        : c);
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  const api = {
    getState() {
      ensure();
      // Memoize: useSyncExternalStore uses Object.is — must return same ref when unchanged
      if (api._cachedRaw === state) return api._derivedState;
      const intCatProducts = (state.catalog || [])
        .filter((it) => it.active !== false && it.worldExt && it.worldExt.interior)
        .map((it) => ({
          id: it.id, typeId: (it.worldExt.interior || {}).typeId || "",
          code: it.code, name: it.name, desc: (it.worldExt.interior || {}).desc || "",
          unit: it.unit, purchasePrice: it.price,
          source: (it.worldExt.interior || {}).source || it.supplier || "",
          notes: (it.worldExt.interior || {}).notes || "",
          visibility: it.visibility,
          color: (it.worldExt.interior || {}).color || "#c9a878",
          tags: it.tags || [],
          sampleSlot: (it.worldExt.interior || {}).sampleSlot || "",
        }));
      api._cachedRaw = state;
      // A useSim() eredménye tartalmazza az api-metódusokat IS (nem csak az adatot),
      // hogy a `const sim = useSim(); sim.valamiMetodus()` minta is működjön. A metódusok
      // stabil referenciák, a derived objektum csak state-változáskor épül újra (memoizált).
      api._derivedState = { ...api, ...state, intCatProducts };
      return api._derivedState;
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    set,
    reset() { state = seed(); emit(); if (window.toast) window.toast("Demó visszaállítva a kiinduló állapotra", "info"); },

    // ── KERESKEDELEM — árazás / árrés-motor ────────────────────────────────
    // Kategória alap-markup beállítása (clamp 1.0–9.99).
    setTradeMarkup(catId, markup) {
      const m = Math.max(1, Math.min(9.99, Number(markup) || 1));
      set((s) => ({ tradeCategories: s.tradeCategories.map((c) => (c.id === catId ? { ...c, markup: Math.round(m * 100) / 100 } : c)) }));
    },
    // Kategória árrés%-ból → markup (a két nézet ugyanazt a számot írja).
    setTradeMargin(catId, marginPct) {
      const p = Math.max(0, Math.min(95, Number(marginPct) || 0));
      const m = 1 / (1 - p / 100);
      this.setTradeMarkup(catId, m);
    },
    // Tétel-szintű felülírás (markup=null → vissza a kategória alapra).
    setTradeProductMarkup(id, markup) {
      const m = (markup == null || markup === "") ? null : Math.max(1, Math.min(9.99, Number(markup) || 1));
      set((s) => ({ tradeProducts: s.tradeProducts.map((p) => (p.id === id ? { ...p, markup: m == null ? null : Math.round(m * 100) / 100 } : p)) }));
    },
    setTradeProductCost(id, cost) {
      const c = Math.max(0, Math.round(Number(cost) || 0));
      set((s) => ({ tradeProducts: s.tradeProducts.map((p) => (p.id === id ? { ...p, purchase: c } : p)) }));
    },

    // ── KERESKEDELEM — lapszabászat szolgáltatás-díjak ─────────────────────
    setCutRate(mode, val) {
      const v = Math.max(0, Math.round(Number(val) || 0));
      const key = mode === "fixed" ? "cutFixed" : "cutMeter";
      set((s) => ({ tradeServiceRates: { ...s.tradeServiceRates, [key]: v } }));
    },
    setEdgeBase(val) {
      const v = Math.max(0, Math.round(Number(val) || 0));
      set((s) => ({ tradeServiceRates: { ...s.tradeServiceRates, edgeBase: v } }));
    },
    setEdgeParamMult(dim, id, mult) {
      const m = Math.max(0.1, Math.round((Number(mult) || 1) * 100) / 100);
      set((s) => ({ tradeServiceRates: { ...s.tradeServiceRates, [dim]: (s.tradeServiceRates[dim] || []).map((x) => x.id === id ? { ...x, mult: m } : x) } }));
    },
    // konkrét Ft/fm felülírás egy kombinációra (val null/"" → törli, vissza a szorzós alapra)
    setEdgeOverride(key, val) {
      set((s) => {
        const ov = { ...(s.tradeServiceRates.edgeOverrides || {}) };
        if (val == null || val === "") delete ov[key];
        else ov[key] = Math.max(0, Math.round(Number(val) || 0));
        return { tradeServiceRates: { ...s.tradeServiceRates, edgeOverrides: ov } };
      });
    },
    setTradeExtraRate(id, val) {
      const v = Math.max(0, Math.round(Number(val) || 0));
      set((s) => ({ tradeServiceRates: { ...s.tradeServiceRates, extras: (s.tradeServiceRates.extras || []).map((x) => x.id === id ? { ...x, rate: v } : x) } }));
    },

    // ── KERESKEDELEM — pultos eladás (counter sale) ────────────────────────
    // lines: [{ id(productId), name, qty, unit, unitPrice, unitCost }]
    // services: [{ name, qty, unit, rate }]  payment, customer
    tradeCheckout({ lines = [], services = [], payment = "Készpénz", customer = "Eseti vevő" } = {}) {
      const s = ensure();
      if (!lines.length && !services.length) { if (window.toast) window.toast("A kosár üres", "error"); return null; }
      const seq = (s.tradeSeq || 19) + 1;
      const id = "PS-2604-" + String(seq).padStart(3, "0");
      const lineNet = lines.reduce((a, l) => a + Number(l.unitPrice) * Number(l.qty), 0);
      const svcNet = services.reduce((a, sv) => a + Number(sv.rate) * Number(sv.qty), 0);
      const net = lineNet + svcNet;
      const cost = lines.reduce((a, l) => a + Number(l.unitCost) * Number(l.qty), 0);
      const profit = lineNet - cost; // szolgáltatás teljes egészében fedezet
      // készletcsökkenés + mozgások
      let products = s.tradeProducts.map((p) => ({ ...p }));
      const movements = [];
      lines.forEach((l) => {
        const idx = products.findIndex((p) => p.id === l.id);
        if (idx >= 0) {
          products[idx] = { ...products[idx], onHand: Math.max(0, products[idx].onHand - Number(l.qty)) };
          movements.push({ date: nowStamp(), type: "Eladás", src: id, who: "Pult", mat: l.name, qty: -Number(l.qty), unit: l.unit, note: `${id} · ${customer}` });
        }
      });
      const sale = { id, date: today, time: new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }),
        cashier: "Varga T.", customer, payment, lines: clone(lines), services: clone(services), net, profit, status: "paid" };
      set(() => ({
        tradeProducts: products,
        tradeSales: [sale, ...s.tradeSales],
        movements: [...movements, ...s.movements],
        tradeSeq: seq,
      }));
      const fmt = (window.TradeEngine) ? window.TradeEngine.fmtHuf(net) : net + " Ft";
      postSystem(`🧾 Pultos eladás: ${id} — ${fmt} nettó (${customer}). Fizetés: ${payment}.`, "ch-prod");
      // alacsony készlet figyelmeztetés
      lines.forEach((l) => {
        const p = products.find((x) => x.id === l.id);
        if (p && p.onHand < p.min) postSystem(`⚠️ Alacsony bolti készlet: ${p.name} (${p.onHand} ${p.unit}, min. ${p.min}).`, "ch-beszerzes");
      });
      emit();
      if (window.toast) window.toast(`✓ Eladás rögzítve — ${id}`, "success");
      return id;
    },

    // ── KERESKEDELEM — lapszabászat / szabás-rendelés (FSM) ─────────────────
    addCuttingOrder({ customer = "Eseti vevő", phone = "", boardId, boardName, sheets = 1, cuts = [], services = [], note = "", materialCost = 0, serviceTotal = 0, status = "quoted" } = {}) {
      const s = ensure();
      const seq = (s.cutSeq || 32);
      const id = "SZ-2604-" + String(seq).padStart(3, "0");
      const order = { id, date: today, customer, phone, boardId, boardName, sheets: Number(sheets) || 1,
        cuts: clone(cuts), services: clone(services), note, status, materialCost: Math.round(materialCost), serviceTotal: Math.round(serviceTotal) };
      set(() => ({ cuttingOrders: [order, ...s.cuttingOrders], cutSeq: seq + 1 }));
      postSystem(`✂️ Új szabás-rendelés: ${id} — ${customer} (${order.sheets} tábla ${boardName || ""}).`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Szabás-rendelés rögzítve — ${id}`, "success");
      return id;
    },
    // FSM-validált státuszváltás. opts.reason kötelező az elutasításhoz.
    setCuttingStatus(id, status, opts = {}) {
      const s = ensure();
      const o = s.cuttingOrders.find((x) => x.id === id);
      if (!o) return false;
      const allowed = (typeof CUTTING_FLOW !== "undefined" && CUTTING_FLOW[o.status]) || [];
      if (!allowed.includes(status)) {
        if (window.toast) window.toast(`Tiltott átmenet: ${o.status} → ${status}`, "error");
        return false;
      }
      if (status === "rejected" && !(opts.reason || o.note)) {
        if (window.toast) window.toast("Elutasításhoz indoklás szükséges", "error");
        return false;
      }
      set(() => ({ cuttingOrders: s.cuttingOrders.map((x) => (x.id === id ? { ...x, status, note: status === "rejected" && opts.reason ? opts.reason : x.note } : x)) }));
      const lbl = (typeof CUTTING_TONE !== "undefined" && CUTTING_TONE[status]) ? CUTTING_TONE[status].label : status;
      postSystem(`✂️ ${id} státusz: ${lbl}.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ ${id} → ${lbl}`, "success");
      return true;
    },

    setQuoteStatus(id, status) {
      set((s) => ({ quotes: s.quotes.map((q) => (q.id === id ? { ...q, status } : q)) }));
    },
    // Vevő-portál: az ügyfél elfogadja a kiküldött ajánlatot (sent → approved). PERM-MENTES
    // (a saját portálján), rendszerüzenettel jelzi a cégnek. A rendelés-létrehozás
    // továbbra is a belső approveQuote (quote.convert jog).
    customerAcceptQuote(id) {
      ensure();
      const q = (state.quotes || []).find((x) => x.id === id);
      if (!q) return false;
      if (q.status !== "sent") { if (window.toast) window.toast("Ez az ajánlat nem fogadható el (nincs kiküldve).", "info"); return false; }
      set((s) => ({ quotes: s.quotes.map((x) => (x.id === id ? { ...x, status: "approved", customerAcceptedAt: today } : x)) }));
      postSystem(`\u2705 ${q.customer} elfogadta a(z) ${id} aj\u00e1nlatot a port\u00e1lon.`, "ch-prod");
      emit();
      if (window.toast) window.toast("K\u00f6sz\u00f6nj\u00fck! Az aj\u00e1nlat elfogadva \u2014 hamarosan keress\u00fck a r\u00e9szletekkel.", "success");
      return true;
    },

    // ── Belsőépítészet / Koncepció világ ──────────────────────────────────────
    // Koncepció státusz-FSM: brief → concept → review → approved → handoff (→ archived)
    setConceptStatus(id, status, opts = {}) {
      ensure();
      const c = (state.concepts || []).find((x) => x.id === id);
      if (!c) return;
      const allowed = (window.conceptNextStatuses ? window.conceptNextStatuses(c.status) : []).includes(status) || status === "archived";
      if (!allowed) { if (window.toast) window.toast("Nem engedélyezett státusz-átmenet.", "error"); return; }
      set((s) => ({ concepts: s.concepts.map((x) => (x.id === id ? { ...x, status } : x)) }));
      const lbl = (window.CONCEPT_TONE && window.CONCEPT_TONE[status] || {}).label || status;
      postSystem(`🎨 „${c.name}" koncepció állapota: ${lbl}.`);
      if (status === "handoff" && window.toast) window.toast("Koncepció átadva a gyártásnak", "success");
    },
    selectConceptVariant(conceptId, variantId) {
      set((s) => ({ concepts: s.concepts.map((c) => (c.id === conceptId
        ? { ...c, selectedVariantId: variantId, variants: c.variants.map((v) => ({ ...v, selected: v.id === variantId })) } : c)) }));
    },
    setConceptVariantField(conceptId, variantId, field, value) {
      set((s) => ({ concepts: s.concepts.map((c) => (c.id === conceptId
        ? { ...c, variants: c.variants.map((v) => (v.id === variantId ? { ...v, [field]: value } : v)) } : c)) }));
    },
    addConceptVariant(conceptId, label) {
      ensure();
      const c = (state.concepts || []).find((x) => x.id === conceptId);
      if (!c) return;
      const letter = String.fromCharCode(65 + (c.variants || []).length);
      const id = "v-" + Math.random().toString(36).slice(2, 6);
      const nv = { id, label: label || `${letter} — Új változat`, version: 1, selected: false, summary: "",
        palette: ["#e7e2d8", "#c9a878", "#8a917e", "#2c2b29"], bodyMat: "EG-W1000", frontMat: "EG-H1334",
        handle: "VS-PROF-J", tile: "BR-TER-15", paint: "RAL 9010", moodSlots: 4,
        history: [{ v: 1, date: today, note: "Új változat létrehozva" }] };
      set((s) => ({ concepts: s.concepts.map((x) => (x.id === conceptId ? { ...x, variants: [...x.variants, nv] } : x)) }));
      postSystem(`🎨 Új változat a(z) „${c.name}" koncepcióhoz: ${nv.label}.`);
      return id;
    },
    bumpConceptVariantVersion(conceptId, variantId, note) {
      set((s) => ({ concepts: s.concepts.map((c) => (c.id === conceptId
        ? { ...c, variants: c.variants.map((v) => (v.id === variantId
            ? { ...v, version: (v.version || 1) + 1, history: [...(v.history || []), { v: (v.version || 1) + 1, date: today, note: note || "Új verzió mentve" }] } : v)) } : c)) }));
      if (window.toast) window.toast("Új verzió mentve", "success");
    },
    setConceptTradeStatus(conceptId, tradeId, status) {
      set((s) => ({ concepts: s.concepts.map((c) => (c.id === conceptId
        ? { ...c, trades: c.trades.map((t) => (t.id === tradeId ? { ...t, status } : t)) } : c)) }));
    },
    // Koncepcióból TERVEZÉSI DÍJ-ajánlat → a meglévő quote-lánc (createQuote).
    // A belsőépítész nem terméket ad el (nincs árrés/kedvezmény) — a díj a választott
    // mód szerint számítódik (m² / óradíj / érték-% / fix átalány), egy díj-tételsorral.
    //
    // ⚠️ targetQuoteId opció: ha meg van adva (és draft állapotú), a díj-tételsor NEM
    // új ajánlatba, hanem a MEGLÉVŐ ajánlatba generálódik (addLinesToQuote) — így ha a
    // lehetőséghez már van bútor-ajánlat, a tervezési díj abba kerül, nem külön dokumentumba.
    // Több ajánlat is megengedett: targetQuoteId nélkül (vagy ha a cél nem draft) új jön létre.
    conceptFeeLines(conceptId) {
      ensure();
      const c = (state.concepts || []).find((x) => x.id === conceptId);
      if (!c) return null;
      const fee = window.conceptFeeAmount ? window.conceptFeeAmount(c) : 0;
      if (!(fee > 0)) return null;
      const label = window.feeMethodLabel ? window.feeMethodLabel((c.fee || {}).method) : "Tervezési díj";
      const basis = window.conceptFeeBasis ? window.conceptFeeBasis(c) : "";
      return [{ name: `Belsőépítészeti tervezési díj — ${label}${basis ? ` (${basis})` : ""}`, code: c.id, unit: "díj", qty: 1, price: fee, vat: 27,
        source: { world: "interior", kind: "concept", ref: c.id, label: "Belsőépítészet" } }];
    },
    createQuoteFromConcept(conceptId, opts = {}) {
      ensure();
      if (!api.hasPerm("quote.create")) { if (window.toast) window.toast("Nincs jogosultság ajánlat létrehozásához.", "error"); return; }
      const c = (state.concepts || []).find((x) => x.id === conceptId);
      if (!c) return;
      if (!(window.conceptQuoteReady && window.conceptQuoteReady(c.status))) { if (window.toast) window.toast("A brief állapotú koncepcióból még nem készíthető ajánlat.", "error"); return; }
      const fee = window.conceptFeeAmount ? window.conceptFeeAmount(c) : 0;
      if (!(fee > 0)) { if (window.toast) window.toast("Adj meg érvényes díjazást (Díjazás fül), mielőtt ajánlatot indítasz.", "error"); return; }
      const label = window.feeMethodLabel ? window.feeMethodLabel((c.fee || {}).method) : "Tervezési díj";
      const lines = api.conceptFeeLines(conceptId);

      // ── Hozzáfűzés a meglévő ajánlathoz (nem új dokumentum) ──
      const target = opts.targetQuoteId && api.quoteEditable(opts.targetQuoteId) ? opts.targetQuoteId : null;
      if (target) {
        if (!api.addLinesToQuote(target, lines)) return null;
        set((s) => ({ concepts: s.concepts.map((x) => (x.id === conceptId ? { ...x, quoteRef: target } : x)) }));
        api._autoFulfillInteriorReq(target, conceptId);
        if (c.oppRef) {
          const o = (state.opportunities || []).find((x) => x.id === c.oppRef);
          if (o) {
            const act = { at: nowStamp(), kind: "email", who: o.owner, text: `Tervezési díj a meglévő ${target} ajánlathoz adva a(z) „${c.name}" koncepcióból.` };
            const patch = { activities: [...(o.activities || []), act] };
            if (!o.quoteId) patch.quoteId = target;
            set((s) => ({ opportunities: s.opportunities.map((x) => (x.id === c.oppRef ? { ...x, ...patch } : x)) }));
          }
        }
        postSystem(`🎨 Tervezési díj a(z) ${target} ajánlathoz fűzve — „${c.name}", ${Math.round(fee / 1000)} eFt + ÁFA.`);
        return target;
      }

      // ── Külön (új) díj-ajánlat ──
      const newId = api.createQuote({ customer: c.customer, lines, owner: c.designer });
      set((s) => ({ concepts: s.concepts.map((x) => (x.id === conceptId ? { ...x, quoteRef: newId } : x)) }));
      // CRM-kapocs: ha a koncepció lehetőségből indult (oppRef), a díj-ajánlat
      // linkelődik vissza a lehetőséghez (quoteId) — ugyanaz a kézfogás, mint az
      // oppCreateQuote-nál: napló + előrelépés „osszeallitas"-ra, ha korábbi fázisban van.
      if (c.oppRef) {
        const o = (state.opportunities || []).find((x) => x.id === c.oppRef);
        if (o && !o.quoteId) {
          const act = { at: nowStamp(), kind: "email", who: o.owner, text: `Díj-ajánlat (${newId}) a(z) „${c.name}" koncepcióból — linkelve a lehetőséghez.` };
          const patch = { quoteId: newId, activities: [...(o.activities || []), act] };
          const order = (window.OPP_FLOW || {}).order || [];
          const curIdx = order.indexOf(o.status), tgtIdx = order.indexOf("osszeallitas");
          if (curIdx >= 0 && tgtIdx >= 0 && curIdx < tgtIdx) patch.status = "osszeallitas";
          set((s) => ({ opportunities: s.opportunities.map((x) => (x.id === c.oppRef ? { ...x, ...patch } : x)) }));
        }
      }
      postSystem(`🎨 Tervezési díj-ajánlat (${newId}) a(z) „${c.name}" koncepcióból — ${label}, ${Math.round(fee / 1000)} eFt + ÁFA.`);
      return newId;
    },

    // Új koncepció létrehozása (a nulláról)
    createConcept(payload) {
      ensure();
      const seq = String((state.concepts || []).length + 15).padStart(3, "0");
      const id = payload.id || `KON-2026-${seq}`;
      const rooms = (payload.rooms || []).map((r, i) => ({ id: "r-" + Math.random().toString(36).slice(2, 6), name: r.name, area: Number(r.area) || 0, value: Number(r.value) || 0, note: r.note || "" }));
      const concept = {
        id, name: payload.name || "Új koncepció", projectRef: payload.projectRef || null,
        customer: payload.customer || "", designer: payload.designer || api.currentAccount().name,
        status: "brief", created: today, area: Number(payload.area) || rooms.reduce((n, r) => n + r.area, 0),
        brief: payload.brief || "", floorplanSlot: "ifp-" + id,
        rooms,
        selectedVariantId: "v-a",
        variants: [{ id: "v-a", label: "A — Alap irány", version: 1, selected: true, summary: "",
          palette: ["#e7e2d8", "#c9a878", "#8a917e", "#2c2b29"], bodyMat: "EG-W1000", frontMat: "EG-H1334",
          handle: "VS-PROF-J", tile: "BR-TER-15", paint: "RAL 9010", moodSlots: 4,
          history: [{ v: 1, date: today, note: "Koncepció létrehozva" }] }],
        trades: [
          { id: "tp-" + Math.random().toString(36).slice(2, 6), trade: "burkolas", title: "Burkolatkiosztás", party: "", due: "", status: "draft", planSlot: "itp-" + id + "-burk", rooms: [] },
          { id: "tp-" + Math.random().toString(36).slice(2, 6), trade: "festes",   title: "Festési terv (RAL)", party: "", due: "", status: "draft", planSlot: "itp-" + id + "-fest", rooms: [] },
          { id: "tp-" + Math.random().toString(36).slice(2, 6), trade: "villany",  title: "Erősáram kiosztás", party: "", due: "", status: "draft", planSlot: "itp-" + id + "-vill", rooms: [] },
        ],
        quoteRef: null, items: [],
        fee: (typeof FEE_DEFAULT !== "undefined") ? { ...FEE_DEFAULT } : { method: "m2", m2Rate: 12000, hours: 40, hourlyRate: 9000, valuePct: 12, flatAmount: 600000 },
      };
      set((s) => ({ concepts: [concept, ...s.concepts] }));
      postSystem(`🎨 Új koncepció: „${concept.name}" (${concept.customer}, ${concept.area} m²).`);
      if (window.toast) window.toast(`✓ Koncepció létrehozva — ${id}`, "success");
      return id;
    },

    // ── Tételes ajánlat sorok a koncepción belül ────────────────────────────────
    addConceptItem(conceptId, item) {
      ensure();
      const id = "li-" + Date.now().toString(36) + Math.floor(Math.random() * 100);
      const li = { id, productId: item.productId || null, name: item.name || "Tétel", room: item.room || "",
        unit: item.unit || "db", qty: Number(item.qty) || 1, note: item.note || "" };
      set((s) => ({ concepts: s.concepts.map((c) => (c.id === conceptId ? { ...c, items: [...(c.items || []), li] } : c)) }));
      return id;
    },
    updateConceptItem(conceptId, itemId, patch) {
      set((s) => ({ concepts: s.concepts.map((c) => (c.id === conceptId
        ? { ...c, items: (c.items || []).map((it) => (it.id === itemId ? { ...it, ...patch } : it)) } : c)) }));
    },
    removeConceptItem(conceptId, itemId) {
      set((s) => ({ concepts: s.concepts.map((c) => (c.id === conceptId
        ? { ...c, items: (c.items || []).filter((it) => it.id !== itemId) } : c)) }));
    },

    // ── Helyiségek (alapterület + becsült kivitelezési érték — ez utóbbi az érték-% díj alapja) ──
    addConceptRoom(conceptId, room) {
      ensure();
      const id = "r-" + Date.now().toString(36);
      const r = { id, name: room.name || "Új helyiség", area: Number(room.area) || 0, value: Number(room.value) || 0, note: room.note || "" };
      set((s) => ({ concepts: s.concepts.map((c) => (c.id === conceptId ? { ...c, rooms: [...(c.rooms || []), r] } : c)) }));
      return id;
    },
    updateConceptRoom(conceptId, roomId, patch) {
      const clean = { ...patch };
      if ("area" in clean) clean.area = Number(clean.area) || 0;
      if ("value" in clean) clean.value = Number(clean.value) || 0;
      set((s) => ({ concepts: s.concepts.map((c) => (c.id === conceptId
        ? { ...c, rooms: (c.rooms || []).map((r) => (r.id === roomId ? { ...r, ...clean } : r)) } : c)) }));
    },
    removeConceptRoom(conceptId, roomId) {
      set((s) => ({ concepts: s.concepts.map((c) => (c.id === conceptId
        ? { ...c, rooms: (c.rooms || []).filter((r) => r.id !== roomId) } : c)) }));
    },

    // ── Belsőépítész DÍJAZÁS — a tervezési díj módja és paraméterei (m²/óradíj/érték-%/fix) ──
    setConceptFee(conceptId, patch) {
      set((s) => ({ concepts: s.concepts.map((c) => {
        if (c.id !== conceptId) return c;
        const base = c.fee || (window.FEE_DEFAULT ? { ...window.FEE_DEFAULT } : {});
        const next = { ...base, ...patch };
        ["m2Rate", "hours", "hourlyRate", "valuePct", "flatAmount"].forEach((k) => { if (k in patch) next[k] = Number(patch[k]) || 0; });
        return { ...c, fee: next };
      }) }));
    },

    // ── Belsőépítész katalógus — TÍPUSOK (addIntType… — NEM ütközik addCategory-val) ──
    addIntType(payload) {
      ensure();
      const id = "it-" + Date.now().toString(36);
      const t = { id, name: payload.name || "Új típus", icon: payload.icon || "box", color: payload.color || "#a8703a",
        unit: payload.unit || "db", blurb: payload.blurb || "" };
      set((s) => ({ intCatTypes: [...(s.intCatTypes || []), t] }));
      if (window.toast) window.toast(`✓ Típus hozzáadva — ${t.name}`, "success");
      return id;
    },
    updateIntType(id, patch) {
      set((s) => ({ intCatTypes: (s.intCatTypes || []).map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      if (window.toast) window.toast("✓ Típus frissítve", "success");
    },
    removeIntType(id) {
      ensure();
      const used = (state.intCatProducts || []).some((p) => p.typeId === id);
      if (used) { if (window.toast) window.toast("A típushoz termékek tartoznak — előbb azokat rendezd.", "error"); return; }
      set((s) => ({ intCatTypes: (s.intCatTypes || []).filter((t) => t.id !== id) }));
      if (window.toast) window.toast("Típus törölve", "info");
    },
    // ── Belsőépítész katalógus — TERMÉKEK / MINTÁK (central catalog-based) ────
    addIntProduct(payload) {
      ensure();
      const id = "ip-" + Date.now().toString(36);
      const cat = INT_TYPE_TO_CAT[payload.typeId] || "Belsőépítészet";
      const ni = __normCatItem({
        id, code: payload.code || id, name: payload.name || "Új termék",
        unit: payload.unit || "db", price: Number(payload.purchasePrice) || 0,
        supplier: payload.source || "", cat,
        visibility: payload.visibility || "private",
        tags: payload.tags || [],
        worldExt: { interior: {
          typeId: payload.typeId || "",
          desc: payload.desc || "",
          source: payload.source || "",
          notes: payload.notes || "",
          color: payload.color || "#c9a878",
          sampleSlot: payload.sampleSlot || ("ipsmpl-" + id),
        } },
      });
      set((s) => ({ catalog: [ni, ...s.catalog] }));
      if (window.toast) window.toast(`✓ Katalógus-tétel hozzáadva — ${ni.name}`, "success");
      return id;
    },
    updateIntProduct(id, patch) {
      ensure();
      set((s) => ({ catalog: s.catalog.map((it) => {
        if (it.id !== id) return it;
        const catPatch = {};
        if (patch.name !== undefined) catPatch.name = patch.name;
        if (patch.unit !== undefined) catPatch.unit = patch.unit;
        if (patch.purchasePrice !== undefined) catPatch.price = Number(patch.purchasePrice) || it.price;
        if (patch.source !== undefined) catPatch.supplier = patch.source;
        if (patch.visibility !== undefined) catPatch.visibility = patch.visibility;
        if (patch.tags !== undefined) catPatch.tags = patch.tags;
        const intPatch = {};
        ["desc", "source", "notes", "color", "typeId", "sampleSlot"].forEach((k) => { if (patch[k] !== undefined) intPatch[k] = patch[k]; });
        return { ...it, ...catPatch, worldExt: { ...(it.worldExt || {}), interior: { ...(it.worldExt?.interior || {}), ...intPatch } } };
      }) }));
      if (window.toast) window.toast("✓ Termék frissítve", "success");
    },
    removeIntProduct(id) {
      ensure();
      set((s) => ({ catalog: s.catalog.filter((it) => !(it.id === id && it.worldExt && it.worldExt.interior)) }));
      if (window.toast) window.toast("Termék törölve", "info");
    },
    // ── Partner-állandó kedvezmények (margin mindenkinek; kedvezmény partnerenként) ──
    addPartnerPricing(payload) {
      ensure();
      const id = "pp-" + Date.now().toString(36);
      const p = { id, name: payload.name || "Új partner", kind: payload.kind || "Partner",
        defaultDiscount: Number(payload.defaultDiscount) || 0, byType: payload.byType || {} };
      set((s) => ({ partnerPricing: [...(s.partnerPricing || []), p] }));
      if (window.toast) window.toast(`✓ Partner hozzáadva — ${p.name}`, "success");
      return id;
    },
    updatePartnerPricing(id, patch) {
      set((s) => ({ partnerPricing: (s.partnerPricing || []).map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    },
    setPartnerDiscount(id, typeId, pct) {
      const v = pct === "" || pct == null ? null : Math.max(0, Math.min(95, Number(pct) || 0));
      set((s) => ({ partnerPricing: (s.partnerPricing || []).map((p) => {
        if (p.id !== id) return p;
        const byType = { ...(p.byType || {}) };
        if (v == null) delete byType[typeId]; else byType[typeId] = v;
        return { ...p, byType };
      }) }));
    },
    removePartnerPricing(id) {
      set((s) => ({ partnerPricing: (s.partnerPricing || []).filter((p) => p.id !== id) }));
      if (window.toast) window.toast("Partner törölve", "info");
    },

    // Sales → Orders
    approveQuote(id) {
      ensure();
      const q = state.quotes.find((x) => x.id === id);
      if (!q) return;
      const seq = 185 + state.orders.filter((o) => o.id.startsWith("JT-2426")).length - 184 + 1;
      const orderId = "JT-2426-0" + String(184 + state.orders.length + 1).padStart(3, "0").slice(-3);
      const newOrder = { id: orderId, customer: q.customer, type: "cabinet", date: today, status: "draft", total: q.value, items: q.items, fromQuote: q.id };
      set((s) => ({
        quotes: s.quotes.map((x) => (x.id === id ? { ...x, status: "approved" } : x)),
        orders: [newOrder, ...s.orders],
      }));
      postSystem(`✅ Új rendelés (${orderId}) létrejött a(z) ${q.id} ajánlatból — ${q.customer}, ${(q.value / 1e6).toFixed(1)} M Ft.`);
      emit();
      if (window.toast) window.toast(`✓ ${q.id} elfogadva → ${orderId} rendelés létrehozva`, "success");
      return orderId;
    },

    // Sales → Project (optional, on convert): wrap the quote as a coordinated project
    createProjectFromQuote(quoteId, orderId) {
      ensure();
      const q = state.quotes.find((x) => x.id === quoteId);
      if (!q) return;
      const me = api.currentAccount();
      const pid = "PRJ-2026-0" + String(15 + state.projects.length).slice(-2);
      // quote lines → project items (fallback: one item = the whole quote)
      const items = (q.lines && q.lines.length)
        ? q.lines.map((l, i) => ({ id: pid + "-i" + i, name: l.name || l.description || ("Tétel " + (i + 1)), kind: "assembly", value: (l.price || l.unitPrice || 0) * (l.qty || l.quantity || 1), orderId: i === 0 ? (orderId || null) : null,
            sourcing: l.design ? (l.design.sourcing || "own") : "own", elemCategory: l.design ? (l.design.elemCategory || null) : null, custom: !!l.custom, design: l.design || null }))
        : [{ id: pid + "-i0", name: q.customer + " — ajánlat tételei", kind: "assembly", value: q.value, orderId: orderId || null, sourcing: "own" }];
      const target = "2026-08-15";
      const deps = [
        { id: pid + "-d0", trade: "viz",   label: "Vízkiállás",          party: "", due: "2026-07-20", status: "pending", blocksInstall: true },
        { id: pid + "-d1", trade: "aram",  label: "Elektromos kiállás",  party: "", due: "2026-07-25", status: "pending", blocksInstall: true },
        { id: pid + "-d2", trade: "butor", label: "Bútor beépítés",      party: "JoineryTech", due: target, status: "pending", blocksInstall: false },
      ];
      const proj = { id: pid, name: q.customer + " — projekt", customer: q.customer, designer: me.name,
        status: "draft", installTarget: target, created: today, fromQuote: q.id, items, dependencies: deps };
      set((s) => ({ projects: [proj, ...s.projects] }));
      // Tervezési brief átvitel — MÁSOLAT-snapshot a naplóba + ÉLŐ LINK (projectId
      // rákerül, a Q&A és a mezők tovább fejlődnek, mindkét nézet látja).
      const carried = (state.briefs || []).filter((b) => b.quoteId === q.id && !b.projectId);
      if (carried.length) {
        set((s) => ({ briefs: s.briefs.map((b) => (carried.some((c) => c.id === b.id)
          ? { ...b, projectId: pid, updatedAt: today, history: [...b.history, { ts: nowStamp(), who: me.name, kind: "handoff", label: `Átadva a projektnek (${pid})`, snapshot: { fields: { ...b.fields }, refs: [...(b.refs || [])], openQ: (b.questions || []).filter((x) => x.status === "nyitott").length } }] }
          : b)) }));
        postSystem(`📋 ${carried.length} tervezési brief átadva a(z) ${pid} projektnek (élő link — a Q&A folytatódik).`);
      }
      emit();
      if (window.toast) window.toast(`✓ Projekt létrehozva — ${pid}`, "success");
      return pid;
    },

    // Orders → Production (+ stock consumption + movement)
    releaseOrder(id) {
      ensure();
      const o = state.orders.find((x) => x.id === id);
      if (!o) return;
      const jobId = "FE-2426-" + id.slice(-3);
      const sheets = 6 + Math.floor((o.items || 8) / 2);
      const job = { id: jobId, title: `${o.customer} — ${o.items} tétel`, customer: o.customer, order: o.id, stage: "production", due: "2026-05-12", sheets, status: "queued" };
      // consume from the first board material with enough stock
      const boards = state.materials.filter((m) => m.unit === "tábla");
      const pick = boards.find((m) => m.onHand >= sheets) || boards[0];
      const newMaterials = state.materials.map((m) => (m.code === pick.code ? { ...m, onHand: Math.max(0, m.onHand - sheets), trend: trendFor({ ...m, onHand: Math.max(0, m.onHand - sheets) }) } : m));
      const mv = { date: nowStamp(), type: "Kivét", src: jobId, who: "Rendszer", mat: pick.name, qty: -sheets, unit: pick.unit, note: `${o.id} · ${o.customer}` };
      set((s) => ({
        orders: s.orders.map((x) => (x.id === id ? { ...x, status: "released" } : x)),
        jobs: [job, ...s.jobs],
        materials: newMaterials,
        movements: [mv, ...s.movements],
      }));
      postSystem(`🏭 ${o.id} gyártásba adva (${jobId}). Anyagfoglalás: ${sheets} ${pick.unit} ${pick.name}.`, "ch-prod");
      const after = state.materials.find((m) => m.code === pick.code);
      if (after && after.onHand < after.min) postSystem(`⚠️ Alacsony készlet: ${after.name} (${after.onHand} ${after.unit}, min. ${after.min}). Beszerzés javasolt.`, "ch-beszerzes");
      emit();
      if (window.toast) window.toast(`✓ ${o.id} kiadva gyártásba — ${jobId}`, "success");
      return jobId;
    },

    // ── Rendelés-számítás (anyaglista) PERZISZTENS életciklusa ────────────────
    // A draft→calc→ready→released FSM középső lépései (calc/ready) eddig csak a
    // tranziens window.orderFlow-ban éltek (frissítéskor elvesztek) — pedig a SEED
    // már `o.status: "calc"|"ready"`-t használ. Most a UI-akció is a STORE-t lépteti:
    // az ÁLLAPOT az `o.status`-ban (egy FSM-forrás), az anyaglista-EREDMÉNY az
    // `o.calc = { items, value, plans, sheets, at }`-ban. Additív — nincs LS-bump.
    findOrder(id) { ensure(); return (state.orders || []).find((x) => x.id === id); },
    startOrderCalc(id) {
      ensure();
      const o = state.orders.find((x) => x.id === id);
      if (!o || !(o.status === "draft" || o.status === "calc")) return false;
      set((s) => ({ orders: s.orders.map((x) => (x.id === id ? { ...x, status: "calc" } : x)) }));
      emit();
      return true;
    },
    completeOrderCalc(id, data = {}) {
      ensure();
      const o = state.orders.find((x) => x.id === id);
      if (!o || o.status === "released" || o.status === "delivered") return false;
      const calc = { items: Number(data.items) || 0, value: Number(data.value) || 0,
        plans: Number(data.plans) || 0, sheets: Number(data.sheets) || 0, at: nowStamp() };
      set((s) => ({ orders: s.orders.map((x) => (x.id === id ? { ...x, status: "ready", calc } : x)) }));
      postSystem(`📐 ${id} anyaglista-számítás kész — ${calc.items} tétel, ${calc.plans} vágóterv, ${calc.sheets} lap.`, "ch-prod");
      emit();
      return calc;
    },

    // ── Procurement: requisitions in the store ─────────────────────────────────
    addRequisitions(rows) { if (!rows || !rows.length) return; set((s) => ({ requisitions: [...rows, ...s.requisitions] })); },
    updateRequisition(id, patch) { set((s) => ({ requisitions: s.requisitions.map((x) => (x.id === id ? { ...x, ...patch } : x)) })); },

    // Multi-line requisition (new model: one req, many lines, no supplier yet)
    createMultiLineRequisition({ lines, note, requester }) {
      ensure();
      const me = api.currentAccount();
      const reqId = "PR-2426-" + String(100 + state.requisitions.length).slice(-3);
      const totalQty = lines.reduce((s, l) => s + l.qty, 0);
      const req = {
        id: reqId,
        lines: lines.map((l) => ({ code: l.code, material: l.name, qty: l.qty, unit: l.unit, estUnit: l.price || 0 })),
        material: lines.length === 1 ? lines[0].name : lines.length + " tétel",
        matCode: lines.length === 1 ? (lines[0].code || "") : "",
        qty: totalQty,
        unit: lines.length === 1 ? lines[0].unit : "tétel",
        preferredSupplier: null,
        requester: requester || me.name || "Kovács Péter",
        date: today,
        status: "Draft",
        note: note || "",
        estUnit: Math.round(lines.reduce((s, l) => s + l.qty * (l.price || 0), 0) / Math.max(1, totalQty)),
        type: "multi",
      };
      set((s) => ({ requisitions: [req, ...s.requisitions] }));
      postSystem(`📋 Igénylés létrejött (${reqId}) — ${req.lines.length} tétel, ${req.requester}.`);
      emit();
      if (window.toast) window.toast(`✓ Igénylés létrehozva — ${reqId} (${req.lines.length} tétel)`, "success");
      return reqId;
    },

    // Quote → Requisition (new flow: quote approval creates an igénylés, not an order directly)
    createRequisitionFromQuote(quoteId) {
      ensure();
      const q = state.quotes.find((x) => x.id === quoteId);
      if (!q) return;
      const me = api.currentAccount();
      const reqId = "PR-2426-" + String(100 + state.requisitions.length).slice(-3);
      const req = {
        id: reqId,
        material: q.customer + " — megrendelés",
        matCode: quoteId,
        qty: 1,
        unit: "tétel",
        preferredSupplier: null,
        requester: me.name || "Kovács Péter",
        date: today,
        status: "Draft",
        note: `Gyártásba adáshoz jóváhagyásra vár. Ajánlat: ${quoteId} · ${(q.value / 1e6).toFixed(2)}M Ft.`,
        estUnit: q.value,
        fromQuote: quoteId,
        type: "order-req",
      };
      set((s) => ({ requisitions: [req, ...s.requisitions] }));
      postSystem(`📋 Igénylés létrejött (${reqId}) a(z) ${quoteId} jóváhagyott ajánlatból — ${q.customer}.`);
      emit();
      if (window.toast) window.toast(`✓ Igénylés létrehozva — ${reqId}`, "success");
      return reqId;
    },

    // Requisition → Order (igénylés jóváhagyás után rendelést generál)
    createOrderFromRequisition(reqId) {
      ensure();
      const req = state.requisitions.find((x) => x.id === reqId);
      if (!req || req.status !== "Approved") return;
      const q = req.fromQuote ? state.quotes.find((x) => x.id === req.fromQuote) : null;
      const orderId = "JT-2426-0" + String(184 + state.orders.length + 1).padStart(3, "0").slice(-3);
      const newOrder = {
        id: orderId,
        customer: q ? q.customer : req.material,
        type: "cabinet",
        date: today,
        status: "draft",
        total: q ? q.value : req.qty * (req.estUnit || 0),
        items: q ? (q.items || 1) : req.qty,
        // design-átvitel: az ajánlat tételsorai (config/design snapshotokkal) a rendelésre öröklődnek,
        // hogy a Gyártás-előkészítés a tényleges tételekből deriválhasson
        lines: q && q.lines ? q.lines.map((l) => ({ ...l })) : undefined,
        fromQuote: req.fromQuote || null,
        fromReq: reqId,
      };
      set((s) => ({
        orders: [newOrder, ...s.orders],
        requisitions: s.requisitions.map((x) => x.id === reqId ? { ...x, status: "ConvertedToOrder", orderRef: orderId } : x),
      }));
      postSystem(`✅ Rendelés (${orderId}) generálva a(z) ${reqId} jóváhagyott igénylésből — ${newOrder.customer}.`);
      emit();
      if (window.toast) window.toast(`✓ ${reqId} → ${orderId} rendelés létrehozva`, "success");
      return orderId;
    },

    // Order → procurement: take what's in stock, requisition the shortfall
    requisitionForOrder(orderId) {
      ensure();
      const o = state.orders.find((x) => x.id === orderId);
      if (!o) return;
      const n = o.items || 8;
      // material need estimate for the order
      const boards = state.materials.filter((m) => m.unit === "tábla");
      const board = boards.find((m) => o.type === "door" ? /tölgy/i.test(m.name) : true) || boards[0];
      const edge = state.materials.find((m) => m.unit === "fm") || null;
      const hw = state.materials.find((m) => m.code === "VS-BL-CT") || null;
      const needs = [
        board && { mat: board, qty: Math.max(4, Math.ceil(n / 2)) },
        edge && { mat: edge, qty: n * 4 },
        hw && { mat: hw, qty: n * 2 },
      ].filter(Boolean);

      const supplierOf = (m) => { const c = state.catalog.find((x) => x.name.split(" ")[0] === m.name.split(" ")[0] || x.code === m.code); return c ? c.supplier : null; };
      const movements = [];
      let materials = state.materials;
      const newReqs = [];
      let taken = 0, reqCount = 0, base = 50 + state.requisitions.length;

      needs.forEach((need, i) => {
        const cur = materials.find((m) => m.code === need.mat.code);
        const avail = Math.min(need.qty, Math.max(0, cur.onHand));
        if (avail > 0) {
          materials = materials.map((m) => (m.code === cur.code ? { ...m, onHand: m.onHand - avail, trend: trendFor({ ...m, onHand: m.onHand - avail }) } : m));
          movements.push({ date: nowStamp(), type: "Kivét", src: o.id, who: "Rendszer", mat: cur.name, qty: -avail, unit: cur.unit, note: `${o.id} · ${o.customer}` });
          taken++;
        }
        const short = need.qty - avail;
        if (short > 0) {
          reqCount++;
          newReqs.push({ id: "PR-2426-" + (base + i), material: cur.name, matCode: cur.code, qty: short, unit: cur.unit,
            preferredSupplier: supplierOf(cur), requester: api.currentAccount().name, date: today, status: "Draft",
            note: `${o.id} hiánypótlás`, estUnit: cur.price, orderRef: o.id, projectRef: o.projectId || null });
        }
      });

      set((s) => ({
        materials,
        movements: [...movements, ...s.movements],
        requisitions: [...newReqs, ...s.requisitions],
        orders: s.orders.map((x) => (x.id === orderId ? { ...x, procurementDone: true } : x)),
      }));
      postSystem(`📥 ${o.id}: ${taken} tétel raktárból kivéve, ${reqCount} beszerzési igény létrehozva a hiányra.`, "ch-beszerzes");
      emit();
      if (window.toast) window.toast(`✓ Beszerzés indítva — ${taken} raktárból, ${reqCount} igény`, "success");
      return { taken, reqCount };
    },

    // Procurement: split approved requisitions into one PO PER SUPPLIER
    // groups: [{ supplier, lines:[{material,matCode,qty,unit,price,reqId}] }]
    // A PO-soraira ráírjuk a beszállítói cikk-hivatkozást (supplierSku/Label) a
    // megfeleltetési táblából — így a beszállító a SAJÁT cikkével kapja a rendelést,
    // a raktár pedig a bevételezéskor vissza tudja oldani.
    createPOsFromReqs(groups, opts = {}) {
      ensure();
      const created = [];
      let n = 92 + state.pos.length;
      const status = opts.status || "running";
      const enrichLine = (l, supplier) => {
        const cat = (state.catalog || []).find((c) => c.code && (c.code === l.matCode || c.code === l.code));
        const ref = cat ? this.supplierRefFor(cat.id, supplier) : null;
        return { ...l, itemId: cat ? cat.id : (l.itemId || null),
          ...(ref ? { supplierSku: ref.supplierSku, supplierLabel: ref.supplierLabel } : {}) };
      };
      const newPos = groups.map((g) => {
        const poId = "PO-2426-0" + String(n++).slice(-2);
        const lines = g.lines.map((l) => enrichLine(l, g.supplier));
        const total = lines.reduce((s, l) => s + (l.price || 0) * l.qty, 0);
        created.push({ poId, supplier: g.supplier, count: lines.length });
        return { id: poId, supplier: g.supplier, material: lines.map((l) => l.material).join(", "),
          qty: lines.reduce((s, l) => s + l.qty, 0), eta: opts.eta || "2026-06-10", status,
          ...(opts.note ? { note: opts.note } : {}), ...(opts.sourceRef ? { sourceRef: opts.sourceRef } : {}), ...(opts.fromRfq ? { fromRfq: opts.fromRfq } : {}),
          total, lines };
      });
      set((s) => ({ pos: [...newPos, ...s.pos] }));
      if (status === "draft") {
        groups.forEach((g, i) => postSystem(`📝 Megrendelés-vázlat ${created[i].poId} — ${g.supplier} (${g.lines.length} tétel).`, "ch-beszerzes"));
      } else {
        groups.forEach((g, i) => postSystem(`🧾 Megrendelés ${created[i].poId} létrehozva — ${g.supplier} (${g.lines.length} tétel).`, "ch-beszerzes"));
      }
      emit();
      if (window.toast) window.toast(status === "draft" ? `✓ ${groups.length} megrendelés-vázlat létrehozva` : `✓ ${groups.reduce((s, g) => s + g.lines.length, 0)} igény → ${groups.length} megrendelés (szállítónként)`, "success");
      return created;
    },

    // ── Megrendelés-vázlat (PO draft) (4.8-A1 feedback) ───────────────────────
    // PO-állapot: draft → running → delivered. A vázlatok a szállító alá
    // gyűjthetők és összevonhatók; vázlatból ajánlatkérés (RFQ) is indítható.
    poList() { ensure(); return state.pos || []; },
    poDrafts() { ensure(); return (state.pos || []).filter((p) => p.status === "draft"); },
    // Approved beszerzési igényből vázlat-PO (szállítónként), megjegyzés a forrással.
    requisitionToDraftPO(reqId) {
      ensure();
      const req = (state.requisitions || []).find((x) => x.id === reqId);
      if (!req || req.status !== "Approved") { if (window.toast) window.toast("Csak jóváhagyott igényből.", "warning"); return false; }
      const supplier = req.preferredSupplier || "—";
      const lines = (req.lines && req.lines.length) ? req.lines.map((l) => ({ material: l.material || l.name, matCode: l.code || "", qty: l.qty, unit: l.unit, price: l.estUnit || 0 }))
        : [{ material: req.material, matCode: req.matCode || "", qty: req.qty, unit: req.unit, price: req.estUnit || 0 }];
      const ref = req.fromQuote || req.orderRef || req.id;
      const created = api.createPOsFromReqs([{ supplier, lines }], { status: "draft", note: `Forrás: ${ref}`, sourceRef: ref });
      api.updateRequisition(reqId, { status: "ConvertedToPO", poRef: created[0] ? created[0].poId : null });
      return created[0] ? created[0].poId : null;
    },
    // Több azonos szállítójú vázlat összevonása egy vázlatba.
    mergeDraftPOs(ids) {
      ensure();
      const drafts = (state.pos || []).filter((p) => ids.includes(p.id) && p.status === "draft");
      if (drafts.length < 2) { if (window.toast) window.toast("Legalább két vázlat kell az összevonáshoz.", "warning"); return false; }
      const supplier = drafts[0].supplier;
      if (!drafts.every((p) => p.supplier === supplier)) { if (window.toast) window.toast("Csak azonos szállító vázlatai vonhatók össze.", "error"); return false; }
      const lines = drafts.flatMap((p) => p.lines || []);
      const refs = Array.from(new Set(drafts.map((p) => p.sourceRef).filter(Boolean)));
      const keepId = drafts[0].id;
      const merged = { ...drafts[0], lines, material: lines.map((l) => l.material).join(", "), qty: lines.reduce((s, l) => s + (Number(l.qty) || 0), 0),
        total: lines.reduce((s, l) => s + (l.price || 0) * (Number(l.qty) || 0), 0), note: refs.length ? `Forrás: ${refs.join(", ")}` : drafts[0].note, sourceRef: refs.join(", ") };
      const dropIds = drafts.slice(1).map((p) => p.id);
      set((s) => ({ pos: s.pos.filter((p) => !dropIds.includes(p.id)).map((p) => (p.id === keepId ? merged : p)) }));
      postSystem(`🔗 ${drafts.length} megrendelés-vázlat összevonva (${supplier}) → ${keepId}.`, "ch-beszerzes");
      emit();
      if (window.toast) window.toast(`✓ ${drafts.length} vázlat összevonva → ${keepId}`, "success");
      return keepId;
    },
    // Vázlat → firm megrendelés (draft → running). HATÁSKÖR: limit felett jóváhagyás kell.
    _doReleasePO(id) {
      ensure();
      const po = (state.pos || []).find((x) => x.id === id);
      if (!po || po.status !== "draft") return false;
      set((s) => ({ pos: s.pos.map((p) => (p.id === id ? { ...p, status: "running", approvalPending: false } : p)) }));
      postSystem(`✅ Megrendelés ${id} kiküldve — ${po.supplier}.`, "ch-beszerzes");
      emit();
      if (window.toast) window.toast(`✓ ${id} megrendelve`, "success");
      return true;
    },
    releasePO(id) {
      ensure();
      const po = (state.pos || []).find((x) => x.id === id);
      if (!po || po.status !== "draft") return false;
      const limit = (state.authConfig || {}).poValue;
      if (limit != null && (po.total || 0) > limit) {
        const exists = (state.approvals || []).some((a) => a.type === "po.release" && a.refId === id && a.status === "fuggoben");
        if (!exists) api.requestApproval({ type: "po.release", refId: id, title: `Megrendelés kiküldése — ${po.supplier}`, amount: po.total || 0, payload: { poId: id } });
        if (!po.approvalPending) { set((s) => ({ pos: s.pos.map((p) => (p.id === id ? { ...p, approvalPending: true } : p)) })); emit(); }
        if (window.toast) window.toast(`Jóváhagyásra küldve — PO-limit felett (${Math.round((po.total || 0) / 1000)} e / ${Math.round(limit / 1000)} e Ft)`, "warning");
        return false;
      }
      return api._doReleasePO(id);
    },
    deletePO(id) {
      ensure();
      const po = (state.pos || []).find((x) => x.id === id);
      if (!po || po.status !== "draft") { if (window.toast) window.toast("Csak vázlat törölhető.", "warning"); return false; }
      set((s) => ({ pos: s.pos.filter((p) => p.id !== id) }));
      emit();
      if (window.toast) window.toast(`Vázlat ${id} törölve`, "info");
      return true;
    },
    // Vázlatból ajánlatkérés (RFQ) — a vázlat tételeit + szállítóját átemeli.
    createRfqFromPO(poId, { keepDraft } = {}) {
      ensure();
      const po = (state.pos || []).find((x) => x.id === poId);
      if (!po) return null;
      const lines = (po.lines || []).map((l) => ({ code: l.matCode || l.code || "", material: l.material, qty: l.qty, unit: l.unit || "db" }));
      const rfqId = api.addRfq({ title: `${po.supplier} — ${poId} versenyeztetés`, note: `Megrendelés-vázlatból (${poId})`, lines, suppliers: po.supplier && po.supplier !== "—" ? [po.supplier] : [] });
      if (!keepDraft && po.status === "draft") set((s) => ({ pos: s.pos.filter((p) => p.id !== poId) }));
      emit();
      if (window.toast) window.toast(`✓ Ajánlatkérés indítva a vázlatból — ${rfqId}`, "success");
      return rfqId;
    },

    // Procurement: receive PO → stock up
    receivePO(id) {
      ensure();
      const po = state.pos.find((x) => x.id === id);
      if (!po) return;
      const mat = state.materials.find((m) => po.material.includes(m.name.split(" ")[0]));
      const mv = { date: nowStamp(), type: "Bevét", src: po.id, who: "Rendszer", mat: mat ? mat.name : po.material, qty: +po.qty, unit: mat ? mat.unit : "db", note: `${po.supplier}` };
      set((s) => ({
        pos: s.pos.map((x) => (x.id === id ? { ...x, status: "delivered" } : x)),
        materials: mat ? s.materials.map((m) => (m.code === mat.code ? { ...m, onHand: m.onHand + po.qty, trend: trendFor({ ...m, onHand: m.onHand + po.qty }) } : m)) : s.materials,
        movements: [mv, ...s.movements],
      }));
      postSystem(`📦 ${po.id} bevételezve — +${po.qty} ${mat ? mat.unit : ""} ${mat ? mat.name : po.material}.`, "ch-beszerzes");
      emit();
      if (window.toast) window.toast(`✓ ${po.id} bevételezve`, "success");
    },

    // ── Beszállítói ajánlatkérés (RFQ) — a PO ELÉ fűzve (4.8-A) ────────────────
    // FSM az RFQ-n (RfqEngine). Az odaítélés a meglévő createPOsFromReqs láncba
    // köt (szállítónkénti PO-bontás) — egy igazságforrás, nincs duplikáció.
    rfqList() { ensure(); return state.rfqs || []; },
    findRfq(id) { ensure(); return (state.rfqs || []).find((x) => x.id === id); },
    rfqOpen() { ensure(); return (state.rfqs || []).filter((x) => window.RfqEngine && window.RfqEngine.isOpen(x)); },
    _nextRfqId() { const seq = (state.rfqSeq || 0) + 1; return { id: `RFQ-2426-${String(seq).padStart(3, "0")}`, seq }; },
    addRfq(data) {
      ensure();
      const { id, seq } = api._nextRfqId();
      const me = api.currentAccount();
      const rfq = { id, title: (data.title || "Ajánlatkérés").trim(), status: "osszeallitas",
        createdBy: me.name || "Beszerzés", createdAt: today, dueDate: data.dueDate || "", note: (data.note || "").trim(),
        lines: (data.lines || []).map((l) => ({ code: l.code || "", material: l.material || l.name || "Tétel", qty: Number(l.qty) || 1, unit: l.unit || "db" })),
        suppliers: (data.suppliers || []).map((n) => ({ name: n, invitedAt: today, responded: false, respondedAt: null, note: "", bids: {} })),
        awardedTo: null, poRef: null,
        log: [{ at: nowStamp(), text: "Ajánlatkérés létrehozva (összeállítás)" }] };
      set((s) => ({ rfqs: [rfq, ...(s.rfqs || [])], rfqSeq: seq }));
      postSystem(`📨 Új ajánlatkérés (${id}) — ${rfq.title}.`, "ch-beszerzes");
      emit();
      if (window.toast) window.toast(`✓ Ajánlatkérés létrehozva — ${id}`, "success");
      return id;
    },
    setRfqStatus(id, to, opts = {}) {
      ensure();
      if (to === "odaitelve") { if (window.toast) window.toast("Az odaítélés a nyertes kiválasztásával történik.", "info"); return false; }
      const rfq = (state.rfqs || []).find((x) => x.id === id);
      if (!rfq) return false;
      if (!(window.RfqEngine && window.RfqEngine.canGo(rfq, to))) { if (window.toast) window.toast("Nem engedélyezett státuszváltás.", "error"); return false; }
      if (to === "kikuldve" && !(rfq.suppliers || []).length) { if (window.toast) window.toast("Legalább egy beszállítót hívj meg a kiküldéshez.", "warning"); return false; }
      const lbl = (window.RFQ_STATUS[to] || {}).label || to;
      const patch = { status: to, log: [...(rfq.log || []), { at: nowStamp(), text: `Státusz → ${lbl}${opts.reason ? ` (${opts.reason.trim()})` : ""}` }] };
      if (to === "kikuldve") patch.log.push({ at: nowStamp(), text: `Kiküldve ${(rfq.suppliers || []).length} beszállítónak` });
      set((s) => ({ rfqs: s.rfqs.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      postSystem(`📨 Ajánlatkérés ${id} → ${lbl}.`, "ch-beszerzes");
      emit();
      return true;
    },
    addRfqLine(id, line) {
      ensure();
      const ln = { code: line.code || "", material: line.material || line.name || "Tétel", qty: Number(line.qty) || 1, unit: line.unit || "db" };
      set((s) => ({ rfqs: s.rfqs.map((x) => (x.id === id ? { ...x, lines: [...(x.lines || []), ln] } : x)) }));
      emit();
    },
    removeRfqLine(id, idx) {
      ensure();
      set((s) => ({ rfqs: s.rfqs.map((x) => { if (x.id !== id) return x; const lines = (x.lines || []).filter((_, i) => i !== idx);
        const suppliers = (x.suppliers || []).map((su) => { const bids = {}; Object.keys(su.bids || {}).forEach((k) => { const ki = Number(k); if (ki < idx) bids[ki] = su.bids[k]; else if (ki > idx) bids[ki - 1] = su.bids[k]; }); return { ...su, bids }; });
        return { ...x, lines, suppliers }; }) }));
      emit();
    },
    addRfqSupplier(id, name) {
      ensure();
      if (!name || !name.trim()) return;
      set((s) => ({ rfqs: s.rfqs.map((x) => { if (x.id !== id) return x; if ((x.suppliers || []).some((su) => su.name === name.trim())) return x;
        return { ...x, suppliers: [...(x.suppliers || []), { name: name.trim(), invitedAt: today, responded: false, respondedAt: null, note: "", bids: {} }] }; }) }));
      emit();
    },
    removeRfqSupplier(id, name) {
      ensure();
      set((s) => ({ rfqs: s.rfqs.map((x) => (x.id === id ? { ...x, suppliers: (x.suppliers || []).filter((su) => su.name !== name) } : x)) }));
      emit();
    },
    setRfqBid(id, name, lineIdx, bid) {
      ensure();
      set((s) => ({ rfqs: s.rfqs.map((x) => { if (x.id !== id) return x;
        return { ...x, suppliers: (x.suppliers || []).map((su) => { if (su.name !== name) return su;
          const bids = { ...(su.bids || {}) };
          if (bid == null || (bid.price == null && bid.leadDays == null)) delete bids[lineIdx];
          else bids[lineIdx] = { price: bid.price != null ? Number(bid.price) || 0 : (bids[lineIdx] && bids[lineIdx].price) || 0, leadDays: bid.leadDays != null ? Number(bid.leadDays) || 0 : (bids[lineIdx] && bids[lineIdx].leadDays) || 0 };
          const responded = Object.keys(bids).length > 0;
          return { ...su, bids, responded, respondedAt: responded ? (su.respondedAt || today) : null };
        }) }; }) }));
      emit();
    },
    setRfqSupplierNote(id, name, note) {
      ensure();
      set((s) => ({ rfqs: s.rfqs.map((x) => (x.id === id ? { ...x, suppliers: (x.suppliers || []).map((su) => (su.name === name ? { ...su, note } : su)) } : x)) }));
      emit();
    },
    // Odaítélés: a nyertes ajánlatából a meglévő szállítónkénti PO-bontás generál PO-t.
    awardRfq(id, supplierName) {
      ensure();
      if (!api.hasPerm("rfq.manage")) { if (window.toast) window.toast("Nincs jogosultság (rfq.manage).", "error"); return false; }
      const rfq = (state.rfqs || []).find((x) => x.id === id);
      if (!rfq) return false;
      if (!(window.RfqEngine && window.RfqEngine.canGo(rfq, "odaitelve"))) { if (window.toast) window.toast("Csak bírálat alatti ajánlatkérés ítélhető oda.", "error"); return false; }
      const sup = (rfq.suppliers || []).find((s) => s.name === supplierName);
      if (!sup || !sup.responded) { if (window.toast) window.toast("A nyertesnek beérkezett ajánlattal kell rendelkeznie.", "warning"); return false; }
      const lines = (rfq.lines || []).map((ln, i) => { const b = sup.bids && sup.bids[i]; return { material: ln.material, matCode: ln.code, code: ln.code, qty: ln.qty, unit: ln.unit, price: b && b.price != null ? Number(b.price) || 0 : 0 }; });
      const created = api.createPOsFromReqs([{ supplier: supplierName, lines }], { status: "draft", note: `Forrás: ${id}`, sourceRef: id, fromRfq: id });
      const poId = created && created[0] ? created[0].poId : null;
      set((s) => ({ rfqs: s.rfqs.map((x) => (x.id === id ? { ...x, status: "odaitelve", awardedTo: supplierName, poRef: poId, closedAt: today, log: [...(x.log || []), { at: nowStamp(), text: `Odaítélve: ${supplierName}${poId ? ` → vázlat ${poId}` : ""}` }] } : x)) }));
      postSystem(`🏆 Ajánlatkérés ${id} odaítélve — ${supplierName}${poId ? ` → vázlat ${poId}` : ""}.`, "ch-beszerzes");
      emit();
      if (window.toast) window.toast(`✓ ${id} odaítélve — ${supplierName} (vázlat ${poId})`, "success");
      return poId;
    },
    // Beszállító-javaslatok (katalógus + beszerzési katalógus források + partnerek)
    rfqSupplierOptions() {
      ensure();
      const set2 = new Set();
      (state.catalog || []).forEach((c) => { if (c.supplier && c.supplier !== "Vegyes" && c.supplier !== "JoineryTech") set2.add(c.supplier); });
      (state.procCatalog || []).forEach((p) => (p.sources || []).forEach((sr) => { if (sr.name) set2.add(sr.name); }));
      (state.partners || []).forEach((p) => { if (p.actorType === "supplier" && p.name) set2.add(p.name); });
      return Array.from(set2).sort();
    },

    // ── Gyártásütemezés / véges kapacitás (4.8-A) ─────────────────────────────
    // Task-FSM (ProdSchedEngine); a gép-nap terhelés/ütközés SZÁMÍTOTT. A gépek a
    // Shop Floor gépparkjából + szerelő/felületkezelő stációkból (PROD_STATIONS).
    prodTaskList() { ensure(); return state.prodTasks || []; },
    findProdTask(id) { ensure(); return (state.prodTasks || []).find((x) => x.id === id); },
    // egy gép-nap leállás-infója a karbantartásból (állásidő-rekord lefedi a napot)
    // a stáció → eszköz (asset.machineId) → downtime lánc — a Karbantartás és a Gyártás közötti híd
    _prodDownOn(machineId, date) {
      if (!machineId || !date) return null;
      const asset = (state.assets || []).find((a) => a.machineId === machineId && !a.retired);
      if (!asset) return null;
      const hit = (state.downtime || []).find((x) => x.assetId === asset.id && x.start <= date && (!x.end || date <= x.end));
      if (!hit) return null;
      return { reason: hit.reason || "Állásidő", woId: hit.workOrderId || null, planned: !!hit.planned, assetId: asset.id, assetName: asset.name };
    },
    // gép-nap → leállás map (kulcs `machineId|date`) az adott napokra — az ütemező ezt adja a ProdSchedEngine-nek
    prodDownMap(dates) {
      ensure();
      const out = {};
      (window.PROD_STATIONS || []).forEach((st) => {
        (dates || []).forEach((d) => { const info = api._prodDownOn(st.id, d); if (info) out[st.id + "|" + d] = info; });
      });
      return out;
    },
    _nextProdTaskId() { const seq = (state.prodTaskSeq || 0) + 1; return { id: `GT-2426-${String(seq).padStart(3, "0")}`, seq }; },
    addProdTask(data) {
      ensure();
      const { id, seq } = api._nextProdTaskId();
      const task = { id, title: (data.title || "Gyártási feladat").trim(), order: data.order || "", customer: data.customer || "",
        kind: data.kind || "szabaszat", machineId: data.machineId || null, date: data.date || null, hours: Number(data.hours) || 4,
        status: data.machineId && data.date ? "utemezve" : "varolista", note: (data.note || "").trim(),
        log: [{ at: nowStamp(), text: `Feladat létrehozva${data.machineId && data.date ? " és ütemezve" : " (várólista)"}` }] };
      set((s) => ({ prodTasks: [task, ...(s.prodTasks || [])], prodTaskSeq: seq }));
      postSystem(`🗓️ Új gyártási feladat (${id}) — ${task.title}.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Gyártási feladat — ${id}`, "success");
      return id;
    },
    scheduleProdTask(id, opts = {}) {
      ensure();
      const t = (state.prodTasks || []).find((x) => x.id === id);
      if (!t) return false;
      const machineId = opts.machineId !== undefined ? opts.machineId : t.machineId;
      const date = opts.date !== undefined ? opts.date : t.date;
      const hours = opts.hours !== undefined ? Number(opts.hours) || t.hours : t.hours;
      const station = window.ProdSchedEngine && window.ProdSchedEngine.stationById(machineId);
      if (machineId && date) { const dn = api._prodDownOn(machineId, date); if (dn && window.toast) window.toast(`⚠ ${station ? station.name : machineId} leállítva ezen a napon (${dn.reason}) — ütközés, tedd át vagy old fel a karbantartást.`, "warning"); }
      const nextStatus = (t.status === "kesz" || t.status === "folyamatban") ? t.status : "utemezve";
      set((s) => ({ prodTasks: s.prodTasks.map((x) => (x.id === id ? { ...x, machineId, date, hours, status: nextStatus, log: [...(x.log || []), { at: nowStamp(), text: `Ütemezve — ${station ? station.name : machineId} · ${date || "—"} · ${hours} ó` }] } : x)) }));
      emit();
      return true;
    },
    unscheduleProdTask(id) {
      ensure();
      set((s) => ({ prodTasks: s.prodTasks.map((x) => (x.id === id ? { ...x, machineId: null, date: null, status: "varolista", log: [...(x.log || []), { at: nowStamp(), text: "Visszatéve a várólistára" }] } : x)) }));
      emit();
    },
    setProdTaskStatus(id, to, opts = {}) {
      ensure();
      const t = (state.prodTasks || []).find((x) => x.id === id);
      if (!t) return false;
      if (!(window.ProdSchedEngine && window.ProdSchedEngine.canGo(t, to))) { if (window.toast) window.toast("Nem engedélyezett státuszváltás.", "error"); return false; }
      const lbl = (window.PROD_STATUS[to] || {}).label || to;
      const patch = { status: to, log: [...(t.log || []), { at: nowStamp(), text: `Státusz → ${lbl}${opts.reason ? ` (${opts.reason.trim()})` : ""}` }] };
      if (to === "varolista") { patch.machineId = null; patch.date = null; }
      set((s) => ({ prodTasks: s.prodTasks.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      if (to === "kesz") postSystem(`✅ Gyártási feladat kész (${id}) — ${t.title}.`, "ch-prod");
      emit();
      return true;
    },
    setProdTaskHours(id, hours) {
      ensure();
      set((s) => ({ prodTasks: s.prodTasks.map((x) => (x.id === id ? { ...x, hours: Math.max(0.5, Number(hours) || 1) } : x)) }));
      emit();
    },
    assignProdTask(id, who) {
      ensure();
      set((s) => ({ prodTasks: s.prodTasks.map((x) => (x.id === id ? { ...x, assignee: who || "", log: [...(x.log || []), { at: nowStamp(), text: who ? `Kiosztva: ${who}` : "Hozzárendelés törölve" }] } : x)) }));
      emit();
    },
    // Diszpécser-prioritás (sürgős) — opcionális mező a taskon (üzemvezető felülbírálat).
    setProdTaskPrio(id, level) {
      ensure();
      set((s) => ({ prodTasks: s.prodTasks.map((x) => (x.id === id ? { ...x, prio: level || 0 } : x)) }));
      emit();
    },
    startProdTaskWork(id, who) {
      ensure();
      const t = (state.prodTasks || []).find((x) => x.id === id);
      if (!t || t.running) return false;
      const w = who || t.assignee || "Operátor";
      set((s) => ({ prodTasks: s.prodTasks.map((x) => (x.id === id ? { ...x,
        status: x.status === "kesz" ? "folyamatban" : (["varolista", "utemezve", "blokkolt"].includes(x.status) ? "folyamatban" : x.status),
        assignee: x.assignee || w, running: { who: w, startMs: Date.now(), startAt: nowStamp() },
        events: [...(x.events || []), { at: nowStamp(), who: w, type: "start", note: "Munka megkezdve" }],
        log: [...(x.log || []), { at: nowStamp(), text: `Munka indítva — ${w}` }] } : x)) }));
      emit();
      return true;
    },
    pauseProdTaskWork(id) {
      ensure();
      const t = (state.prodTasks || []).find((x) => x.id === id);
      if (!t || !t.running) return false;
      const minutes = Math.max(0, Math.round((Date.now() - t.running.startMs) / 60000));
      set((s) => ({ prodTasks: s.prodTasks.map((x) => (x.id === id ? { ...x,
        sessions: [...(x.sessions || []), { who: x.running.who, startAt: x.running.startAt, endAt: nowStamp(), minutes }], running: null,
        events: [...(x.events || []), { at: nowStamp(), who: x.running.who, type: "pause", note: `Szünet — ${minutes} p naplózva` }] } : x)) }));
      emit();
      return true;
    },
    finishProdTaskWork(id) {
      ensure();
      const t = (state.prodTasks || []).find((x) => x.id === id);
      if (!t) return false;
      let sessions = t.sessions || [];
      if (t.running) { const minutes = Math.max(0, Math.round((Date.now() - t.running.startMs) / 60000)); sessions = [...sessions, { who: t.running.who, startAt: t.running.startAt, endAt: nowStamp(), minutes }]; }
      const who = (t.running && t.running.who) || t.assignee || "Operátor";
      set((s) => ({ prodTasks: s.prodTasks.map((x) => (x.id === id ? { ...x, status: "kesz", sessions, running: null,
        events: [...(x.events || []), { at: nowStamp(), who, type: "finish", note: "Feladat kész" }],
        log: [...(x.log || []), { at: nowStamp(), text: `Kész — ${who}` }] } : x)) }));
      postSystem(`✅ Gyártási feladat kész (${id}) — ${t.title} (${who}).`, "ch-prod");
      emit();
      return true;
    },
    addProdTaskEvent(id, data) {
      ensure();
      if (!data || !data.note || !data.note.trim()) return false;
      const who = data.who || (state.prodTasks.find((x) => x.id === id) || {}).assignee || "Operátor";
      set((s) => ({ prodTasks: s.prodTasks.map((x) => (x.id === id ? { ...x, events: [...(x.events || []), { at: nowStamp(), who, type: data.type || "note", note: data.note.trim() }] } : x)) }));
      emit();
      return true;
    },
    // Etikett-szkennelés: a kódot eseményként rögzíti (pl. „anyag nálam van").
    scanProdTaskLabel(id, code, who, label) {
      ensure();
      const w = who || (state.prodTasks.find((x) => x.id === id) || {}).assignee || "Operátor";
      const note = label ? `${label} — ${code}` : `Szkennelés: ${code}`;
      set((s) => ({ prodTasks: s.prodTasks.map((x) => (x.id === id ? { ...x, events: [...(x.events || []), { at: nowStamp(), who: w, type: "scan", note }] } : x)) }));
      postSystem(`🔖 Szkennelés (${id}) — ${note} · ${w}.`, "ch-prod");
      emit();
      return true;
    },

    // ── FELADATAIM — szerep-független személyes aggregátor (4.8-B1) ───────────
    // SZÁMÍTOTT: a meglévő világok feladat-tételeit egy listába gyűjti. Soha ne
    // tárold; mindig innen olvasd. Az egyes FSM-ek a saját világukban élnek.
    currentWorkerName() {
      ensure();
      const a = api.currentAccount();
      const c = (a && (a.contact || a.name)) || "";
      return c.split("·")[0].trim();
    },
    taskEmpName(empId) { ensure(); const e = (state.employees || []).find((x) => x.id === empId); return e ? e.name : ""; },
    unifiedTasks() {
      ensure();
      const out = [];
      const today = TASKS_TODAY || "2026-04-28";
      const parse = (s) => { const [y, m, d] = String(s || "").split(/[ T]/)[0].split("-").map(Number); return y ? new Date(y, (m || 1) - 1, d || 1) : null; };
      const days = (due) => { const p = parse(due); if (!p) return null; return Math.round((p - parse(today)) / 86400000); };
      const prio = (p) => ({ surgos: 3, kritikus: 3, magas: 2, kozepes: 2, kozepes_: 2, normal: 1, kozep: 1, alacsony: 0 }[p] != null ? ({ surgos: 3, kritikus: 3, magas: 2, kozepes: 1, normal: 1, alacsony: 0 }[p]) : null);
      const slbl = (mapName, key, fb) => { const m = window[mapName]; const v = m && m[key]; return (v && (v.label || v)) || fb || key; };
      const push = (o) => out.push({ daysLeft: days(o.due), ...o });

      // 1) Gyártási feladatok (prodTasks) — assignee
      (state.prodTasks || []).filter((t) => t.status !== "kesz").forEach((t) => push({
        uid: "prod:" + t.id, source: "prod", openId: t.id, title: t.title, subtitle: `${t.order || ""}${t.customer ? " · " + t.customer : ""}`,
        owner: t.assignee || "", status: t.status, statusLabel: slbl("PROD_STATUS", t.status), priority: t.status === "blokkolt" ? 2 : null, due: t.date,
        world: "production", screen: "tasks" }));

      // 2) CRM feladatok — owner
      (state.crmTasks || []).filter((t) => !t.done).forEach((t) => push({
        uid: "crm:" + t.id, source: "crm", openId: t.id, title: t.title, subtitle: t.refId ? `${t.refType || ""} ${t.refId}` : "",
        owner: t.owner || "", status: "nyitott", statusLabel: "Nyitott", priority: prio(t.priority), due: t.due, quick: "crmDone",
        world: "crm", screen: "tasks" }));

      // 3) Minőség-ellenőrzések — inspector
      (state.qaInspections || []).filter((i) => window.QaEngine && window.QaEngine.isOpen(i)).forEach((i) => push({
        uid: "qa:" + i.id, source: "quality", openId: i.id, title: i.subject, subtitle: `${i.id} · ${i.refLabel || i.ref || ""}`,
        owner: i.inspector || "", status: i.status, statusLabel: slbl("QA_STATUS", i.status), priority: prio(i.priority), due: i.dueDate,
        world: "quality", screen: "inspections" }));

      // 4) Karbantartási munkalapok — belső felelős (empId → név)
      (state.workOrders || []).filter((w) => w.status !== "kesz" && w.assigneeType === "internal").forEach((w) => push({
        uid: "wo:" + w.id, source: "maintenance", openId: w.id, title: w.title, subtitle: `${w.id}`,
        owner: api.taskEmpName(w.assigneeEmpId), status: w.status, statusLabel: slbl("WO_STATUS", w.status, w.status), priority: prio(w.priority), due: w.scheduledDate,
        world: "maintenance", screen: "workorders" }));

      // 4b) Munkavédelem / EHS — nyitott incidensek (felelős = vizsgáló) + nyitott CAPA-akciók
      (state.ehsIncidents || []).filter((i) => window.EhsEngine && window.EhsEngine.isOpen(i)).forEach((i) => push({
        uid: "ehs:" + i.id, source: "ehs", openId: i.id, title: i.subject, subtitle: `${i.id} · ${(window.EHS_INC_TYPE[i.type] || {}).label || i.type}`,
        owner: i.investigator || "", status: i.status, statusLabel: slbl("EHS_INC_STATUS", i.status, i.status),
        priority: i.type === "baleset" ? 2 : (i.sev === "sulyos" ? 2 : 1), due: i.dueDate,
        world: "ehs", screen: "incidents" }));
      (state.ehsIncidents || []).forEach((i) => (window.EhsEngine ? window.EhsEngine.openActions(i) : []).forEach((a) => push({
        uid: "ehsa:" + i.id + ":" + a.id, source: "ehs", openId: i.id, ehsActionId: a.id,
        title: `Intézkedés: ${String(a.text || "").slice(0, 60)}`, subtitle: `${i.id} · ${i.subject}`,
        owner: a.owner || "", status: "intezkedes", statusLabel: "CAPA — nyitott", priority: 1, due: a.due,
        world: "ehs", screen: "incidents" })));

      // 5) Reklamáció jegyek — csapat (nincs személy-felelős)
      (state.serviceTickets || []).filter((t) => !["lezarva", "elutasitva"].includes(t.status)).forEach((t) => push({
        uid: "svc:" + t.id, source: "service", openId: t.id, title: t.subject || t.refLabel || t.id, subtitle: `${t.id} · ${t.refLabel || ""}`,
        owner: "", status: t.status, statusLabel: slbl("SVC_STATUS", t.status, t.status), priority: prio(t.priority), due: t.dueDate,
        world: "service", screen: "board" }));

      // 6) Logisztikai fuvarok — csapat
      (state.shipments || []).filter((s) => !["atadva", "beerkezett", "kesz"].includes(s.status)).forEach((s) => push({
        uid: "ship:" + s.id, source: "logistics", openId: s.id, title: s.title || s.refLabel || s.id, subtitle: `${s.id}${s.date ? " · " + s.date : ""}`,
        owner: "", status: s.status, statusLabel: slbl("LOG_STATUS", s.status, s.status), priority: s.install ? 1 : null, due: s.date,
        world: "logistics", screen: "schedule" }));

      // 6b) Ajánlat al-ajánlatkérések — belsőépítészet / műszaki tervezés (csapat)
      (state.quoteRequests || []).filter((r) => r.kind !== "rfq" && ["kert", "folyamatban"].includes(r.status)).forEach((r) => push({
        uid: "qreq:" + r.id, source: "qreq", openId: r.id,
        title: r.kind === "interior" ? "Belsőépítészeti koncepció-kérés" : "Műszaki tervezési kérés",
        subtitle: `${r.quoteId}${r.customer ? " · " + r.customer : ""}`,
        owner: "", status: r.status, statusLabel: slbl("QR_STATUS", r.status, r.status), priority: 1, due: null,
        world: r.kind === "interior" ? "interior" : "design", screen: r.kind === "interior" ? "concepts" : "engineer" }));

      // 6c) Tervezési brief — NYITOTT kérdések (Q&A hurok, csapat)
      (state.briefs || []).forEach((b) => (b.questions || []).filter((q) => q.status === "nyitott").forEach((q) => push({
        uid: "brief:" + b.id + ":" + q.id, source: "brief", openId: b.id, briefId: b.id, briefQid: q.id,
        title: `Brief-kérdés: ${String(q.text || "").slice(0, 60)}`,
        subtitle: `${b.title}${b.projectId ? " · " + b.projectId : b.quoteId ? " · " + b.quoteId : ""}`,
        owner: "", status: "nyitott", statusLabel: "Nyitott kérdés", priority: 1, due: null,
        world: b.projectId ? "projects" : "sales", screen: b.projectId ? "projects" : "quotes" })));

      // 7) Raktári kivét + nyitott leltár — csapat
      (state.withdrawals || []).filter((w) => ["kert", "komissiozva"].includes(w.status)).forEach((w) => push({
        uid: "wd:" + w.id, source: "warehouse", openId: w.id, title: w.refLabel || `Kivét ${w.id}`, subtitle: `${w.id} · ${(w.lines || []).length} tétel`,
        owner: "", status: w.status, statusLabel: (window.WH_WD_FLOW && window.WH_WD_FLOW[w.status] && window.WH_WD_FLOW[w.status].label) || w.status, priority: null, due: null,
        world: "warehouse", screen: "withdrawals" }));
      (state.stocktakes || []).filter((s) => window.StockEngine && window.StockEngine.isOpen(s)).forEach((s) => push({
        uid: "stk:" + s.id, source: "warehouse", openId: s.id, title: (s.scope && s.scope.label) || "Leltár", subtitle: `${s.id} · ${(s.lines || []).length} tétel`,
        owner: s.createdBy || "", status: s.status, statusLabel: slbl("STK_STATUS", s.status, s.status), priority: null, due: null,
        world: "warehouse", screen: "stocktake" }));

      // 8) Jóváhagyások — a bejelentkezett (jogosult) felhasználóra attribuálva
      const me = api.currentWorkerName();
      (state.rfqs || []).filter((r) => r.status === "biralat").forEach((r) => push({
        uid: "appr-rfq:" + r.id, source: "approval", openId: r.id, title: `Ajánlatkérés odaítélése — ${r.title}`, subtitle: `${r.id} · ${window.RfqEngine ? window.RfqEngine.respondedCount(r) : 0} ajánlat`,
        owner: me, status: "biralat", statusLabel: "Bírálatra vár", priority: 2, due: r.dueDate, world: "procurement", screen: "rfq" }));
      (state.absences || []).filter((a) => a.status === "kert").forEach((a) => push({
        uid: "appr-abs:" + a.id, source: "approval", openId: a.id, title: `Távollét jóváhagyása — ${api.taskEmpName(a.empId)}`, subtitle: `${a.start} – ${a.end}`,
        owner: me, status: "kert", statusLabel: "Jóváhagyásra vár", priority: 1, due: a.start, world: "hr", screen: "absence" }));
      (state.catalog || []).filter((c) => c.status === "review").forEach((c) => push({
        uid: "appr-cat:" + c.id, source: "approval", openId: c.id, title: `Cikkszám jóváhagyása — ${c.name}`, subtitle: `${c.code || c.id}`,
        owner: me, status: "review", statusLabel: "Jóváhagyásra vár", priority: 1, due: null, world: "masterdata", screen: "approvals" }));
      // hatáskör-mátrix jóváhagyások (4.8-B2) — limit feletti műveletek
      (state.approvals || []).filter((a) => a.status === "fuggoben").forEach((a) => { const meta = (window.AUTH_ACTIONS || {})[a.type] || {}; const u = meta.unit === "%" ? "%" : " " + (meta.unit || "Ft");
        push({ uid: "appr2:" + a.id, source: "approval", openId: a.id, approvalId: a.id, quick: "approve",
          title: a.title, subtitle: `${a.id} · ${(a.amount || 0).toLocaleString("hu-HU")}${u} (limit ${(a.limit || 0).toLocaleString("hu-HU")}${u})`,
          owner: me, status: "fuggoben", statusLabel: "Jóváhagyásra vár", priority: 2, due: null, world: "settings", screen: "authority" }); });

      return out;
    },
    // a feladatokban szereplő személyek (a nézet-választóhoz) — vezetéknév szerint
    // dedupálva, a leghosszabb (legteljesebb) névformát megtartva.
    taskPeople() {
      ensure();
      const bySur = {};
      const consider = (n) => { if (!n) return; const sur = String(n).trim().split(/\s+/)[0].replace(/[.,]/g, "").toLowerCase(); if (!bySur[sur] || n.length > bySur[sur].length) bySur[sur] = n; };
      api.unifiedTasks().forEach((t) => consider(t.owner));
      consider(api.currentWorkerName());
      return Object.values(bySur).sort();
    },

    // ── Hatáskör-mátrix / jóváhagyási limitek (4.8-B2) ────────────────────────
    authConfigGet() { ensure(); return state.authConfig || {}; },
    setAuthConfig(patch) {
      ensure();
      if (!api.hasPerm("settings.manage")) { if (window.toast) window.toast("Nincs jogosultság (settings.manage).", "error"); return false; }
      set((s) => ({ authConfig: { ...s.authConfig, ...patch } }));
      emit();
      if (window.toast) window.toast("✓ Hatáskör-küszöbök mentve", "success");
      return true;
    },
    approvalList() { ensure(); return state.approvals || []; },
    approvalsPending() { ensure(); return (state.approvals || []).filter((a) => a.status === "fuggoben"); },
    _nextApprId() { const seq = (state.apprSeq || 0) + 1; return { id: `JV-2426-${String(seq).padStart(3, "0")}`, seq }; },
    requestApproval(data) {
      ensure();
      const meta = (window.AUTH_ACTIONS || {})[data.type] || {};
      const limit = (state.authConfig || {})[meta.limitKey];
      const { id, seq } = api._nextApprId();
      const appr = { id, type: data.type, refId: data.refId || null, title: (data.title || meta.label || "Jóváhagyás"), requestedBy: api.currentWorkerName(),
        amount: Number(data.amount) || 0, limit: limit != null ? limit : 0, status: "fuggoben", createdAt: today, payload: data.payload || {},
        log: [{ at: nowStamp(), text: "Jóváhagyásra küldve — limit felett" }] };
      set((s) => ({ approvals: [appr, ...(s.approvals || [])], apprSeq: seq }));
      postSystem(`🛂 Jóváhagyás-kérelem (${id}) — ${appr.title}.`, "ch-beszerzes");
      emit();
      return id;
    },
    decideApproval(id, approve, opts = {}) {
      ensure();
      if (!api.hasPerm("auth.approve")) { if (window.toast) window.toast("Nincs jogosultság (auth.approve).", "error"); return false; }
      const a = (state.approvals || []).find((x) => x.id === id);
      if (!a || a.status !== "fuggoben") return false;
      const to = approve ? "jovahagyva" : "elutasitva";
      set((s) => ({ approvals: s.approvals.map((x) => (x.id === id ? { ...x, status: to, approver: api.currentWorkerName(), decidedAt: today, reason: opts.reason || x.reason, log: [...(x.log || []), { at: nowStamp(), text: `${approve ? "Jóváhagyva" : "Elutasítva"} — ${api.currentWorkerName()}${opts.reason ? ` (${opts.reason.trim()})` : ""}` }] } : x)) }));
      if (approve) {
        if (a.type === "po.release" && a.payload && a.payload.poId) api._doReleasePO(a.payload.poId);
        if (a.type === "overtime.order" && a.payload) postSystem(`⏰ Túlóra jóváhagyva — ${a.payload.empName || ""} ${a.payload.date || ""} (${a.payload.hours} ó).`, "ch-prod");
      } else if (a.type === "po.release" && a.payload && a.payload.poId) {
        set((s) => ({ pos: s.pos.map((p) => (p.id === a.payload.poId ? { ...p, approvalPending: false } : p)) }));
      }
      postSystem(`🛂 ${id} ${approve ? "jóváhagyva" : "elutasítva"} — ${a.title}.`, "ch-beszerzes");
      emit();
      if (window.toast) window.toast(approve ? `✓ ${id} jóváhagyva` : `${id} elutasítva`, approve ? "success" : "info");
      return true;
    },

    // ── Szerződés + ütemezett számlázás (4.8-B3) ──────────────────────────────
    contractList() { ensure(); return state.contracts || []; },
    findContract(id) { ensure(); return (state.contracts || []).find((x) => x.id === id); },
    _nextContractId() { const seq = (state.ctrSeq || 0) + 1; return { id: `SZD-2426-${String(seq).padStart(3, "0")}`, seq }; },
    addContractFromOrder(orderId) {
      ensure();
      const o = (state.orders || []).find((x) => x.id === orderId);
      if (!o) { if (window.toast) window.toast("Rendelés nem található.", "error"); return null; }
      const milestones = (window.CTR_DEFAULT_SCHEDULE || []).map((m) => ({ label: m.label, trigger: m.trigger, phase: m.phase, pct: m.pct, kind: m.kind }));
      return api.addContract({ orderId: o.id, customer: o.customer, projectRef: o.projectId || null, title: `${o.customer} — ${o.id}`, totalGross: o.total || 0, milestones });
    },
    // addContract: szabad ütemtervvel (a NewContractSheet-ből — a számlázási
    // ütemezést a felhasználó határozza meg mérföldkövenként).
    addContract(data) {
      ensure();
      const { id, seq } = api._nextContractId();
      const milestones = (data.milestones || []).map((m, i) => ({ id: "m" + (i + 1), label: (m.label || `Mérföldkő ${i + 1}`).trim(), trigger: m.trigger || "manual", phase: m.trigger === "phase" ? (m.phase || "Gyártás") : undefined, pct: Number(m.pct) || 0, kind: m.kind || "normal", status: "fuggoben" }));
      const c = { id, customer: data.customer || "—", projectRef: data.projectRef || null, orderRef: data.orderId || null, title: (data.title || data.customer || "Szerződés").trim(), totalGross: Number(data.totalGross) || 0, currency: "HUF", signedAt: today, status: "aktiv", milestones };
      set((s) => ({ contracts: [c, ...(s.contracts || [])], ctrSeq: seq }));
      postSystem(`📄 Új szerződés (${id}) — ${c.customer}, ütemezett számlázás (${milestones.length} mérföldkő).`);
      emit();
      if (window.toast) window.toast(`✓ Szerződés létrehozva — ${id}`, "success");
      return id;
    },
    // Mérföldkő-szerkesztés meglévő szerződésen (csak nem-számlázott).
    updateMilestone(contractId, msId, patch) {
      ensure();
      set((s) => ({ contracts: s.contracts.map((c) => (c.id === contractId ? { ...c, milestones: c.milestones.map((m) => (m.id === msId && m.status !== "szamlazva" ? { ...m, ...patch } : m)) } : c)) }));
      emit();
    },
    addMilestone(contractId, ms) {
      ensure();
      set((s) => ({ contracts: s.contracts.map((c) => { if (c.id !== contractId) return c; const n = (c.milestones || []).length + 1;
        return { ...c, milestones: [...c.milestones, { id: "m" + Date.now().toString(36), label: (ms && ms.label) || `Mérföldkő ${n}`, trigger: (ms && ms.trigger) || "manual", phase: ms && ms.phase, pct: (ms && Number(ms.pct)) || 0, kind: (ms && ms.kind) || "normal", status: "fuggoben" }] }; }) }));
      emit();
    },
    removeMilestone(contractId, msId) {
      ensure();
      set((s) => ({ contracts: s.contracts.map((c) => (c.id === contractId ? { ...c, milestones: c.milestones.filter((m) => !(m.id === msId && m.status !== "szamlazva")) } : c)) }));
      emit();
    },
    setMilestoneStatus(contractId, msId, status) {
      ensure();
      set((s) => ({ contracts: s.contracts.map((c) => (c.id === contractId ? { ...c, milestones: c.milestones.map((m) => (m.id === msId ? { ...m, status } : m)) } : c)) }));
      emit();
    },
    // Mérföldkő számlázása → kimenő számla-PISZKOZAT a Pénzügyben (finInvoices).
    billMilestone(contractId, msId) {
      ensure();
      if (!api.hasPerm("finance.manage")) { if (window.toast) window.toast("Nincs jogosultság (finance.manage).", "error"); return false; }
      const c = (state.contracts || []).find((x) => x.id === contractId);
      if (!c) return false;
      const ms = (c.milestones || []).find((m) => m.id === msId);
      if (!ms || ms.status === "szamlazva") { if (window.toast) window.toast("Ez a mérföldkő már számlázva van.", "warning"); return false; }
      const seq = state.finSeq || 44;
      const id = "SZ-2426-" + String(seq).padStart(4, "0");
      const addDays = (d, n) => { const dt = new Date(d + "T00:00:00"); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };
      const gross = window.ContractEngine ? window.ContractEngine.msAmount(c, ms) : Math.round((c.totalGross || 0) * (ms.pct || 0) / 100);
      const net = Math.round(gross / 1.27);
      const inv = { id, dir: "out", kind: ms.kind || "normal", party: c.customer, orderRef: c.orderRef || c.projectRef || c.id, contractRef: c.id, status: "draft",
        issueDate: today, dueDate: addDays(today, 14), currency: c.currency || "HUF",
        issuer: (api.currentAccount().contact || "Pénzügy").split("·")[0].trim(),
        lines: [{ name: `${ms.label} (${ms.pct}%) — ${c.title}`, qty: 1, unit: "alk.", unitPrice: net, vat: 27 }] };
      set((s) => ({ finInvoices: [inv, ...s.finInvoices], finSeq: seq + 1,
        contracts: s.contracts.map((x) => (x.id === contractId ? { ...x, milestones: x.milestones.map((m) => (m.id === msId ? { ...m, status: "szamlazva", invoiceId: id } : m)) } : x)) }));
      postSystem(`🧾 Ütemezett számla-piszkozat (${id}) — ${c.customer}: ${ms.label} (${ms.pct}%).`);
      emit();
      if (window.toast) window.toast(`✓ ${id} piszkozat — ${ms.label}`, "success");
      return id;
    },

    // Túlóra elrendelése — a limit (authConfig.overtimeHours) felett JÓVÁHAGYÁS köteles (4.8-B2 feedback).
    orderOvertime(data) {
      ensure();
      const emp = (state.employees || []).find((e) => e.id === data.empId);
      const empName = emp ? emp.name : (data.empName || "Dolgozó");
      const hours = Number(data.hours) || 0;
      const limit = (state.authConfig || {}).overtimeHours;
      const title = `Túlóra elrendelés — ${empName} (${hours} ó${data.date ? ", " + data.date : ""})`;
      if (limit != null && hours > limit) {
        const id = api.requestApproval({ type: "overtime.order", refId: data.empId || null, title, amount: hours, payload: { empId: data.empId, empName, hours, date: data.date || today, reason: data.reason || "" } });
        if (window.toast) window.toast(`Túlóra jóváhagyásra küldve (${hours} ó > ${limit} ó limit)`, "warning");
        return { needsApproval: true, id };
      }
      postSystem(`⏰ Túlóra elrendelve — ${empName} ${data.date || today} (${hours} ó).`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Túlóra elrendelve — ${empName} (${hours} ó)`, "success");
      return { needsApproval: false };
    },

    // ── Messaging ────────────────────────────────────────────────────────────
    openHub(tab) { set((s) => ({ hub: { ...s.hub, open: true, tab: tab || s.hub.tab, view: "list", activeId: null } })); },
    closeHub() { set((s) => ({ hub: { ...s.hub, open: false } })); },
    setHubTab(tab) { set((s) => ({ hub: { ...s.hub, tab } })); },
    setHubView(view) { set((s) => ({ hub: { ...s.hub, view } })); },
    openConvo(cid) { set((s) => ({ hub: { ...s.hub, view: "thread", activeId: cid }, convos: s.convos.map((c) => (c.id === cid ? { ...c, unread: 0 } : c)) })); },
    backToList() { set((s) => ({ hub: { ...s.hub, view: "list", activeId: null } })); },
    setDraft(attachment) { set((s) => ({ hub: { ...s.hub, draft: attachment } })); },
    clearDraft() { set((s) => ({ hub: { ...s.hub, draft: null } })); },

    sendMessage(cid, text, attachment) {
      if (!text && !attachment) return;
      set((s) => ({
        convos: s.convos.map((c) => (c.id === cid
          ? { ...c, messages: [...c.messages, { id: Date.now(), from: "me", text: (text || "").trim(), ts: "most", me: true, attachment: attachment || null }] }
          : c)),
        hub: { ...s.hub, draft: null },
      }));
    },

    sendAi(text) {
      if (!text.trim()) return;
      set((s) => ({ aiMessages: [...s.aiMessages, { role: "user", text: text.trim(), ts: "most" }] }));
      const t = text.toLowerCase();
      const reply = t.includes("gyárt") || t.includes("gép") ? "Most a Bognár konyhabútor (FE-2426-184) van gyártásban, 12 lap. A Holzma 78%-on üzemel."
        : t.includes("készlet") || t.includes("anyag") ? "Három anyag a minimum alatt: Tölgy 22mm, MDF 19mm, Blum CLIP top. Készítsek beszerzési igényt?"
        : t.includes("ajánlat") || t.includes("rendel") ? "Jelenleg több nyitott ajánlat vár jóváhagyásra. Az Ajánlatok nézetben egy kattintással rendeléssé alakíthatók."
        : "Értettem. Pontosítsd, melyik világban (Gyártás, Raktár, Értékesítés) nézzük meg.";
      setTimeout(() => set((s) => ({ aiMessages: [...s.aiMessages, { role: "assistant", text: reply, ts: "most" }] })), 360);
    },

    toggleIntegration(iid) { set((s) => ({ integrations: s.integrations.map((x) => (x.id === iid ? { ...x, connected: !x.connected } : x)) })); },
    setEventMessages(on) { set((s) => ({ settings: { ...s.settings, eventMessages: !!on } })); },
    setMarginPct(p) { const v = Math.max(0, Math.min(95, Math.round(Number(p) || 0))); set((s) => ({ settings: { ...s.settings, marginPct: v } })); },

    // ── Projects (cross-trade coordination) ────────────────────────────────────
    addDependency(projectId, dep) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      if (!p) return;
      const id = projectId + "-d" + Date.now().toString(36);
      set((s) => ({ projects: s.projects.map((pr) => (pr.id === projectId ? { ...pr, dependencies: [...pr.dependencies, { id, status: "pending", blocksInstall: true, due: pr.installTarget, party: "", ...dep }] } : pr)) }));
      emit();
    },
    removeDependency(projectId, depId) {
      set((s) => ({ projects: s.projects.map((pr) => (pr.id === projectId ? { ...pr, dependencies: pr.dependencies.filter((d) => d.id !== depId) } : pr)) }));
    },
    setDependencyField(projectId, depId, patch) {
      set((s) => ({ projects: s.projects.map((pr) => (pr.id === projectId ? { ...pr, dependencies: pr.dependencies.map((d) => (d.id === depId ? { ...d, ...patch } : d)) } : pr)) }));
    },

    createProject({ name, customer, installTarget, items, dependencies, templateId }) {
      ensure();
      if (!name || !customer) return;
      const seq = 15 + state.projects.length;
      const id = "PRJ-2026-0" + String(seq).slice(-2);
      const me = api.currentAccount();
      // ensure a bútor (install) dependency always exists
      const deps = (dependencies || []).map((d, i) => ({ id: id + "-d" + i, ...d }));
      if (!deps.some((d) => d.trade === "butor")) {
        deps.push({ id: id + "-dx", trade: "butor", label: "Bútor beépítés", party: "JoineryTech", due: installTarget, status: "pending", blocksInstall: false });
      }
      const tpl = templateId ? (state.templates.project || []).find((x) => x.id === templateId) : null;
      const milestones = tpl ? api._scaffoldFromTemplate(tpl, { installTarget }) : [];
      const proj = { id, name, customer, designer: me.name, status: "draft", installTarget,
        created: today, items: (items || []).map((it, i) => ({ id: id + "-i" + i, kind: "assembly", orderId: null, ...it })),
        dependencies: deps, milestones };
      set((s) => ({ projects: [proj, ...s.projects] }));
      postSystem(`📁 Új projekt létrehozva: ${name} — ${customer} (${(items || []).length} tétel, ${deps.length} szakág${tpl ? `, „${tpl.name}" sablon` : ""}).`);
      emit();
      if (window.toast) window.toast(`✓ Projekt létrehozva — ${id}`, "success");
      return id;
    },

    createOrderFromProjectItem(projectId, itemId) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      const it = p && p.items.find((i) => i.id === itemId);
      if (!it || it.orderId) return;
      const orderId = "JT-2426-0" + String(184 + state.orders.length + 1).slice(-3);
      const newOrder = { id: orderId, customer: p.customer, type: "cabinet", date: today, status: "draft",
        total: it.value, items: 1, source: "project", projectId: p.id, projectItem: it.name, fromQuote: p.fromQuote || null,
        // design-átvitel: a tétel konfigurációja (bútorsor-elem sablon+méretek) a
        // rendelés-soron utazik tovább → orderToPseudo / MfgPrep a TÉNYLEGES
        // méretekből derivál a gyártás-előkészítésben (nem generikus tételből)
        lines: [{ name: it.name, qty: 1, unit: "db", price: it.value, config: it.config || (it.design && it.design.config) || null }] };
      set((s) => ({
        orders: [newOrder, ...s.orders],
        projects: s.projects.map((pr) => pr.id === projectId
          ? { ...pr, items: pr.items.map((i) => (i.id === itemId ? { ...i, orderId } : i)) } : pr),
      }));
      postSystem(`📦 ${p.name}: „${it.name}” → rendelés létrehozva (${orderId}).`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Rendelés létrehozva — ${orderId}`, "success");
      return orderId;
    },

    // ── SAJÁT GYÁRTÁS alprojekt ─────────────────────────────────────────────────
    //   A megrendelt, házon belül gyártott (sourcing !== "outsourced") tételekből
    //   külön GYÁRTÁSI ALPROJEKT jön létre a fő projekt alatt, és rákerül a beépített
    //   „Saját gyártás" folyamat (ugyanaz a mérföldkő → epik → task motor + élő futás).
    //   A Gyártás → Gyártási projektek fül alatt kezelhető, mint egy önálló projekt.
    manufacturingSubprojects(parentId) {
      ensure();
      return (state.projects || []).filter((p) => p.kind === "manufacturing" && (parentId == null || p.parentProjectId === parentId));
    },
    createManufacturingSubproject(parentId, itemIds) {
      ensure();
      const parent = state.projects.find((x) => x.id === parentId);
      if (!parent) return;
      const me = api.currentAccount();
      // a kiválasztott tételek (vagy ha nincs megadva: minden saját gyártású, még ki nem adott tétel)
      const eligible = (parent.items || []).filter((it) => (it.sourcing || "own") !== "outsourced" && !it.mfgProjectId);
      const pick = (itemIds && itemIds.length)
        ? eligible.filter((it) => itemIds.includes(it.id))
        : eligible;
      if (!pick.length) { if (window.toast) window.toast("Nincs kiadható (saját gyártású) tétel.", "info"); return; }
      // egyedi alprojekt-azonosító (több is lehet egy projekt alatt)
      const idx = (state.projects || []).filter((x) => x.kind === "manufacturing" && x.parentProjectId === parentId).length + 1;
      const subId = parentId + "-G" + idx;
      const items = pick.map((it, i) => ({ id: subId + "-i" + i, name: it.name, kind: "assembly", value: it.value, orderId: it.orderId || null, sourcing: "own", parentItemId: it.id, elemCategory: it.elemCategory || null }));
      const sub = { id: subId, name: parent.name + " — Saját gyártás" + (idx > 1 ? " " + idx : ""), customer: parent.customer, designer: me.name,
        status: "active", kind: "manufacturing", parentProjectId: parentId, parentName: parent.name,
        installTarget: parent.installTarget, created: today, fromQuote: parent.fromQuote || null,
        items, dependencies: [], milestones: [] };
      const pickIds = pick.map((it) => it.id);
      set((s) => ({
        projects: [sub, ...s.projects.map((pr) => pr.id !== parentId ? pr : ({ ...pr, items: pr.items.map((it) => pickIds.includes(it.id) ? { ...it, mfgProjectId: subId } : it) }))],
      }));
      // a beépített „Saját gyártás" folyamat ráhúzása → mérföldkő/epik/task hierarchia
      const proc = (state.processes || []).find((p) => p.id === "proc-vac-sajat") || (state.processes || []).find((p) => /saját gyárt/i.test(p.name));
      if (proc) api.applyProcessToProject(subId, proc.id, { replace: true });
      postSystem(`🏭 Gyártási alprojekt létrehozva: ${sub.name} (${items.length} tétel) — a Gyártás → Gyártási projektek alatt kezelhető.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Gyártási alprojekt — ${subId} (${items.length} tétel)`, "success");
      return subId;
    },

    // ── Gyártás-előkészítés ────────────────────────────────────────────────────
    //   A projektből (gyártási alprojekt) levezetett szükségletek legenerálása.
    //   A levezetés a window.MfgPrep motorral történik (tiszta számítás); itt csak
    //   a „legenerálva" állapotot rögzítjük a projekten (snapshot), rendszerüzenettel.
    generatePrep(projectId) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      if (!p) return;
      const prep = window.MfgPrep ? window.MfgPrep.derive(p) : null;
      const snap = prep
        ? { generated: true, ts: nowStamp(), sheets: prep.totals.sheets, leadDays: prep.totals.leadDays, grand: prep.totals.grand, items: prep.items.length, hours: prep.labor.totalHours }
        : { generated: true, ts: nowStamp() };
      set((s) => ({ projects: s.projects.map((pr) => (pr.id === projectId ? { ...pr, prep: snap } : pr)) }));
      postSystem(`🧮 ${p.name}: gyártás-előkészítés legenerálva — ${snap.sheets || 0} tábla, ${snap.hours || 0} munkaóra, ~${snap.leadDays || 0} nap átfutás.`, "ch-prod");
      emit();
      if (window.toast) window.toast("✓ Gyártás-előkészítés legenerálva", "success");
      return snap;
    },

    // ── Kiadás a műhelynek ─────────────────────────────────────────────────
    //   A gyártás-előkészítés Útvonal-tervéből (MfgPrep.routingPlan) VALÓDI
    //   gyártási feladatokat (prodTasks) hoz létre — EZEKET fogyasztja a Műhely-
    //   terminál és az Üzemvezető. Minden engedélyezett (nem bérmunka) lépés egy
    //   várólistás task; a teljes lánc azonos `order`-rel csoportosítódik. A
    //   kiválasztott dokumentumok (docIds) rákerülnek a feladatokra.
    //   source: { kind:"order"|"project", id, name, customer, owner, orderRef }
    //   plan:   { steps:[{kind,kindLabel,hours,machineId,enabled,outsource,title?}], docIds:[], note }
    releaseToWorkshop(source, plan) {
      ensure();
      if (!source || !plan) return null;
      const steps = (plan.steps || []).filter((st) => st.enabled && !st.outsource);
      if (!steps.length) { if (window.toast) window.toast("Nincs kiadható művelet — jelölj ki legalább egy állomást.", "warning"); return null; }
      const by = (api.currentWorkerName && api.currentWorkerName()) || "Gyártás-előkészítő";
      const orderRef = source.orderRef || source.id;
      const shortName = String(source.name || "Munka").split("—")[0].trim() || String(source.name || "Munka");
      const routeLabels = steps.map((st) => st.kindLabel);
      const docIds = plan.docIds || [];
      // rajz-annotációk: csak a kiadásra jelölt dokumentumok kitöltött megjegyzései
      const docNotes = {};
      Object.entries(plan.docNotes || {}).forEach(([k, v]) => { if (docIds.includes(k) && v && String(v).trim()) docNotes[k] = String(v).trim(); });
      // folyamat-eltérés napló (sorrend-átrendezés / alternatív gép) — indok KÖTELEZŐ
      const deviations = (plan.deviations || []).filter((d) => d && d.what);
      if (deviations.some((d) => !(d.reason && String(d.reason).trim()))) {
        if (window.toast) window.toast("Folyamat-eltérésnél indok kötelező — töltsd ki az eltérés-naplót az Útvonal fülön.", "warning");
        return null;
      }
      let seq = state.prodTaskSeq || 0;
      const tasks = steps.map((st, i) => {
        seq += 1;
        const id = `GT-2426-${String(seq).padStart(3, "0")}`;
        return {
          id, title: (st.title && st.title.trim()) || `${shortName} — ${st.kindLabel}`,
          order: orderRef, customer: source.customer || "",
          kind: st.kind, machineId: st.machineId || null, date: null,
          hours: Math.max(0.5, Number(st.hours) || 1), status: "varolista",
          assignee: "", prepBy: by, projectOwner: source.owner || by,
          seq: i + 1, route: routeLabels, docIds, docNotes,
          partNames: st.parts || [], partCount: st.partCount || 0,
          opSteps: (st.opSteps || []).map((o) => ({ ...o })), opDone: [],
          sessions: [], running: null, events: [],
          note: plan.note ? String(plan.note).trim() : "",
          log: [
            { at: nowStamp(), text: `Kiadva a műhelynek — gyártás-előkészítésből (${by})` },
            ...(deviations.length ? [{ at: nowStamp(), text: `⚠ Folyamat-eltérés a kiadásban (${deviations.length}): ` + deviations.map((d) => `${d.what} — ${String(d.reason).trim()}`).join(" · ") }] : []),
          ],
        };
      });
      const taskIds = tasks.map((t) => t.id);
      const rel = { ts: nowStamp(), by, taskIds, count: tasks.length, docIds, docNotes, deviations,
        steps: steps.map((st) => ({ kind: st.kind, kindLabel: st.kindLabel, hours: st.hours, machineId: st.machineId })) };
      set((s) => {
        const patch = { prodTasks: [...tasks, ...(s.prodTasks || [])], prodTaskSeq: seq };
        if (source.kind === "order") patch.orders = (s.orders || []).map((o) => (o.id === source.id ? { ...o, prepRelease: rel } : o));
        else patch.projects = (s.projects || []).map((p) => (p.id === source.id ? { ...p, prepRelease: rel } : p));
        return patch;
      });
      postSystem(`🏭 ${shortName}: ${tasks.length} gyártási feladat kiadva a műhelynek (${routeLabels.join(" → ")}).${deviations.length ? ` ⚠ ${deviations.length} folyamat-eltérés naplózva.` : ""}`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ ${tasks.length} feladat kiadva a műhelynek`, "success");
      return taskIds;
    },
    // Meglévő dokumentum hozzácsatolása egy munkához (rendelés/projekt) — a prep
    // folyamat része, ezért perm-mentes (könnyű társítás).
    linkDocToWork(docId, linkType, linkId, linkLabel) {
      ensure();
      const d = (state.documents || []).find((x) => x.id === docId);
      if (!d) return false;
      set((s) => ({ documents: s.documents.map((x) => (x.id === docId ? { ...x, linkType, linkId, linkLabel: linkLabel || x.linkLabel } : x)) }));
      postSystem(`🔗 ${docId} a(z) ${linkLabel || linkId} munkához csatolva.`);
      emit();
      return true;
    },
    // ── Műhely-feladat MŰVELETI LÉPÉSE (per-alkatrész útvonal a terminálban) ──
    //   A kiadott feladat hordozza a saját faipari műveleteit (opSteps); a műhely
    //   operátora lépésenként pipálja le őket. A tömörfa front-endje (válogatás →
    //   … → vastagolás → táblásítás) így a műhelyben is végigkövethető, nem lapul
    //   egyetlen „szabászat" feladatba. Perm-mentes (üzem-művelet, mint a naplózás).
    toggleProdTaskOp(id, opKey, who) {
      ensure();
      const t = (state.prodTasks || []).find((x) => x.id === id);
      if (!t || !(t.opSteps || []).some((o) => o.key === opKey)) return false;
      const w = who || t.assignee || "Operátor";
      const had = (t.opDone || []).includes(opKey);
      const opMeta = (t.opSteps || []).find((o) => o.key === opKey) || {};
      const lbl = opMeta.label || opKey;
      set((s) => ({ prodTasks: s.prodTasks.map((x) => {
        if (x.id !== id) return x;
        const opDone = had ? (x.opDone || []).filter((k) => k !== opKey) : [...(x.opDone || []), opKey];
        const ev = { at: nowStamp(), who: w, type: "op", note: had ? `Művelet visszavonva: ${lbl}` : `Művelet kész: ${lbl}` };
        return { ...x, opDone, events: [...(x.events || []), ev] };
      }) }));
      emit();
      return true;
    },
    // ── Gyártás → Minőség kézfogás (FŐ értéklánc: végellenőrzés) ──────────────
    //   A teljes gyártási lánc elkészülte után a műhely VÉGELLENŐRZÉSRE küldi a
    //   rendelést → új `vegellenorzes` QA-ellenőrzés a Minőség világban. Auto-
    //   belépő, ezért PERM-MENTES (mint a webshop→auto-lead / service→auto-jegy);
    //   a teljes QA-kezelés ott `quality.manage` jog alatt marad. Duplikátum-véd:
    //   ha már van NYITOTT végellenőrzés erre a rendelésre, azt adja vissza.
    sendOrderToFinalQa(order, opts = {}) {
      ensure();
      const ref = String(order || "").trim();
      if (!ref) return null;
      const existing = (state.qaInspections || []).find(
        (i) => i.type === "vegellenorzes" && i.ref === ref && window.QaEngine && window.QaEngine.isOpen(i));
      if (existing) { if (window.toast) window.toast("Erre a rendelésre már fut végellenőrzés.", "info"); return existing.id; }
      const seq = (state.qaSeq || 0) + 1;
      const qid = `QA-2426-${String(seq).padStart(3, "0")}`;
      const today = (window.QA_TODAY) || nowStamp().slice(0, 10);
      const checklist = ((window.QA_CHECKLISTS && window.QA_CHECKLISTS.vegellenorzes) || [])
        .map((c) => (typeof c === "string" ? { label: c, ok: null } : { ...c }));
      const insp = {
        id: qid, type: "vegellenorzes", status: "nyitott", priority: opts.priority || "kozepes",
        subject: (opts.subject || "Késztermék — végellenőrzés").trim(),
        ref, refLabel: opts.refLabel || ref, supplier: "",
        inspector: opts.inspector || "", reportedAt: today, dueDate: opts.dueDate || today,
        checklist, defects: [], note: (opts.note || "Gyártás kész — átadás előtti végellenőrzésre küldve a műhelyből.").trim(),
        log: [{ at: nowStamp(), text: `Végellenőrzésre küldve a műhelyből${opts.by ? ` (${opts.by})` : ""}` }] };
      set((s) => ({ qaInspections: [insp, ...(s.qaInspections || [])], qaSeq: seq }));
      postSystem(`🛡️ Végellenőrzésre küldve (${qid}) — ${insp.refLabel}. A gyártási lánc kész.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Végellenőrzésre küldve — ${qid}`, "success");
      return qid;
    },
    // ── Minőség → Logisztika kézfogás (FŐ értéklánc: kiszállításra kész) ─────────
    //   A MEGFELELT végellenőrzés után a rendelés kiszállításra kész → fuvar a
    //   Logisztikában (tervezett). Auto-belépő, PERM-MENTES (mint a
    //   sendOrderToFinalQa); duplikátum-véd: ha már van ÉLŐ delivery-fuvar erre a
    //   ref-re, azt adja vissza. A fuvar-FSM-et innen a Logisztika viszi tovább.
    createDeliveryFromQa(inspId, opts = {}) {
      ensure();
      const insp = (state.qaInspections || []).find((i) => i.id === inspId);
      if (!insp) return null;
      if (insp.type !== "vegellenorzes" || insp.status !== "megfelelt") {
        if (window.toast) window.toast("Csak MEGFELELT végellenőrzésből indítható kiszállítás.", "warning");
        return null;
      }
      const ref = insp.ref || "";
      const existing = (state.shipments || []).find((sh) => sh.type === "delivery" && sh.ref === ref && sh.status !== "torolve");
      if (existing) { if (window.toast) window.toast(`Erre a rendelésre már van fuvar (${existing.id}).`, "info"); return existing.id; }
      const ord = (state.orders || []).find((o) => o.id === ref);
      const shId = api.createShipment({
        type: "delivery", install: opts.install !== false,
        customer: (ord && ord.customer) || String(insp.refLabel || "").split("—")[0].trim(),
        address: ord ? api._custAddress(ord.customer) : "",
        ref, refLabel: insp.refLabel || ref,
        note: `Végellenőrzés megfelelt (${insp.id}) — kiszállításra kész.`,
      });
      set((s) => ({ qaInspections: s.qaInspections.map((x) => (x.id === inspId ? { ...x, log: [...(x.log || []), { at: nowStamp(), text: `Kiszállításra kész — fuvar létrehozva (${shId})` }] } : x)) }));
      postSystem(`🚚 ${insp.refLabel || ref}: végellenőrzés megfelelt → kiszállításra kész (${shId}).`, "ch-prod");
      emit();
      return shId;
    },
    // ── Logisztika → Pénzügy kézfogás (FŐ értéklánc lánc-zárása) ───────────────
    //   ÁTADOTT kiszállítás → kimenő számla-PISZKOZAT a Pénzügyben. Auto-belépő,
    //   PERM-MENTES (mint a sendOrderToFinalQa / createDeliveryFromQa) — a piszkozat
    //   kiállítása (issueInvoice) marad finance.manage alatt. Duplikátum-véd: élő
    //   (nem void) kimenő számla a rendelés-ref-re → azt adja vissza.
    invoiceDraftFromDelivery(shipmentId) {
      ensure();
      const sh = (state.shipments || []).find((x) => x.id === shipmentId);
      if (!sh) return null;
      if (sh.type !== "delivery" || sh.status !== "atadva") { if (window.toast) window.toast("Csak ÁTADOTT kiszállításból indítható számla.", "warning"); return null; }
      const ref = sh.ref || "";
      const existing = (state.finInvoices || []).find((v) => v.dir === "out" && v.orderRef === ref && v.status !== "void");
      if (existing) { if (window.toast) window.toast(`Erre a rendelésre már van számla (${existing.id}).`, "info"); return existing.id; }
      const o = (state.orders || []).find((x) => x.id === ref);
      const seq = state.finSeq || 44;
      const id = "SZ-2426-" + String(seq).padStart(4, "0");
      const addDays = (d, n) => { const dt = new Date(d + "T00:00:00"); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };
      const lines = (o && o.lines && o.lines.length)
        ? o.lines.map((l) => ({ name: l.name, qty: l.qty || 1, unit: l.unit || "db", unitPrice: l.price || l.unitPrice || 0, vat: 27 }))
        : [{ name: `${ref || sh.refLabel || sh.id} teljesítés — ${sh.customer}`, qty: 1, unit: "alk.", unitPrice: Math.round(((o && o.total) || 0) / 1.27), vat: 27 }];
      const inv = { id, dir: "out", kind: "normal", party: (o && o.customer) || sh.customer, orderRef: ref || sh.id, status: "draft",
        issueDate: today, dueDate: addDays(today, 14), currency: "HUF",
        issuer: (api.currentAccount().contact || "Pénzügy").split("·")[0].trim(), lines,
        note: `Forrás: ${sh.id} kiszállítás (átadva).` };
      set((s) => ({ finInvoices: [inv, ...s.finInvoices], finSeq: seq + 1,
        shipments: s.shipments.map((x) => (x.id === shipmentId ? { ...x, log: [...(x.log || []), { at: nowStamp(), text: `Számla-piszkozat létrehozva (${id})` }] } : x)) }));
      postSystem(`🧾 ${ref || sh.id}: átadva → számla-piszkozat (${id}) a Pénzügyben — ${inv.party}.`);
      emit();
      return id;
    },
    // ── Gér/szög él-jelölés a MŰSZAKI SPECIFIKÁCIÓBAN (§18.3/§19) ─────────────
    //   A gér/szög DÖNTÉS a műszaki tervezésé (Tervezés → sablon-alkatrész), NEM
    //   az előkészítésé — az csak az üzemi ráhagyás mm-ét állítja. Kulcs:
    //   "tplId|partName"; érték { short, long, note } (gérelt rövid/hosszú élek
    //   száma, 0–2). A szabásjegyzék (wwCutSize) automatikusan GV-jelöl.
    partMiter(tplId, partName) { ensure(); return (state.partMiters || {})[tplId + "|" + partName] || null; },
    setPartMiter(tplId, partName, val) {
      ensure();
      const key = tplId + "|" + partName;
      const short = Math.max(0, Math.min(2, Math.round(Number(val && val.short) || 0)));
      const long = Math.max(0, Math.min(2, Math.round(Number(val && val.long) || 0)));
      const note = (val && val.note ? String(val.note).trim() : "");
      set((s) => {
        const pm = { ...(s.partMiters || {}) };
        if (!short && !long) delete pm[key];
        else pm[key] = { short, long, note };
        return { partMiters: pm };
      });
      emit();
      return true;
    },
    // ── MŰSZAKI TERVEZÉS — sablon-műhely (designTemplates; FSM: TPL_FLOW) ───────
    //   A §19.2 szerep ALKOTÓ rétege: konfigurálható sablonok létrehozása és
    //   életciklusa. CSAK a `kiadott` kerül a feloldó-registry-be (syncTemplateRegistry)
    //   — így az ajánlat/konfigurátor/gyártás-előkészítés csak kiadott sablont lát.
    designTemplateList() { ensure(); return state.designTemplates || []; },
    findDesignTemplate(id) { ensure(); return (state.designTemplates || []).find((t) => t.id === id); },
    baseTemplateList() { ensure(); return window.PARAM_TEMPLATES_BASE || window.PARAM_TEMPLATES || []; },
    // ── VÁZ-SABLON KÖNYVTÁR (§21.5) — a referenciasík-réteg önálló sablonként ──
    skeletonPresetList() { ensure(); return state.skeletonPresets || []; },
    findSkeletonPreset(id) { ensure(); return (state.skeletonPresets || []).find((p) => p.id === id); },
    // Új váz-sablon — üresből VAGY egy bútor-sablon élő vázából („mentés váz-sablonként”):
    //   utóbbinál a sík-képletekben hivatkozott változókból lesznek a paraméterek.
    addSkeletonPreset(data = {}) {
      ensure();
      if (!api.hasPerm("design.engineer")) { if (window.toast) window.toast("Nincs jogosultság (design.engineer).", "error"); return null; }
      const seq = (state.skelSeq || 3) + 1;
      const id = `SK-${seq}`;
      let preset = { id, name: (data.name || "Új váz-sablon").trim(), desc: data.desc || "", params: [
        { key: "W", label: "Szélesség", unit: "mm", default: 800, min: 200, max: 3000 },
        { key: "H", label: "Magasság",  unit: "mm", default: 720, min: 100, max: 2600 },
        { key: "D", label: "Mélység",   unit: "mm", default: 550, min: 100, max: 900 },
      ], planes: [] };
      if (data.fromTplId) {
        const t = (state.designTemplates || []).find((x) => x.id === data.fromTplId);
        if (t && t.skeleton) {
          const planes = clone(t.skeleton.planes || []);
          const used = new Set();
          planes.forEach((p) => { String(p.formula || "").replace(/\{([^}.]+)\}/g, (_, k) => { used.add(k); return _; }); });
          const params = (t.vars || []).filter((v) => used.has(v.key) && v.kind !== "material")
            .map((v) => ({ key: v.key, label: v.label, unit: v.unit || "mm", default: v.default, min: v.min, max: v.max }));
          preset = { id, name: (data.name || `${t.name} — váz`).trim(), desc: data.desc || `A(z) ${t.id} sablon vázából mentve.`, params, planes };
        }
      }
      set((s) => ({ skeletonPresets: [...(s.skeletonPresets || []), preset], skelSeq: seq }));
      emit();
      if (window.toast) window.toast(`✓ Váz-sablon: ${id}`, "success");
      return id;
    },
    updateSkeletonPreset(id, patch) {
      ensure();
      if (!api.hasPerm("design.engineer")) { if (window.toast) window.toast("Nincs jogosultság (design.engineer).", "error"); return false; }
      set((s) => ({ skeletonPresets: (s.skeletonPresets || []).map((p) => (p.id === id ? { ...p, ...patch, builtin: false } : p)) }));
      return true;
    },
    removeSkeletonPreset(id) {
      ensure();
      if (!api.hasPerm("design.engineer")) { if (window.toast) window.toast("Nincs jogosultság (design.engineer).", "error"); return false; }
      set((s) => ({ skeletonPresets: (s.skeletonPresets || []).filter((p) => p.id !== id) }));
      return true;
    },
    // Váz alkalmazása bútor-sablonra — mapping: presetParamKey → sablon-változó
    //   kulcs (meglévő VAGY új — ha nincs ilyen változó, létrejön a preset-default
    //   értékekkel). A sík-képletek {presetKey} → {sablonKey} cserével íródnak.
    applySkeletonPreset(tplId, presetId, mapping = {}) {
      ensure();
      const preset = (state.skeletonPresets || []).find((p) => p.id === presetId);
      const t = (state.designTemplates || []).find((x) => x.id === tplId);
      if (!preset || !t) return false;
      const vars = clone(t.vars || []);
      const keyMap = {};
      (preset.params || []).forEach((pp) => {
        const target = (mapping[pp.key] || pp.key).trim() || pp.key;
        keyMap[pp.key] = target;
        if (!vars.some((v) => v.key === target)) {
          vars.push({ key: target, label: pp.label, unit: pp.unit || "mm", min: pp.min ?? 0, max: pp.max ?? 3000, step: 1, default: pp.default, kind: "analog" });
        }
      });
      const planes = clone(preset.planes || []).map((p) => ({ ...p,
        formula: String(p.formula || "0").replace(/\{([^}.]+)\}/g, (m, k) => (keyMap[k] ? `{${keyMap[k]}}` : m)) }));
      const ok = api.updateDesignTemplate(tplId, { skeleton: { ...(t.skeleton || {}), planes }, vars, connections: t.connections || [] });
      if (ok && window.toast) window.toast(`✓ Váz alkalmazva: ${preset.name}`, "success");
      return ok;
    },
    // Új sablon — üresből vagy meglévő duplikálásával (ÚJ id-n)
    addDesignTemplate(data = {}) {
      ensure();
      if (!api.hasPerm("design.engineer")) { if (window.toast) window.toast("Nincs jogosultság (design.engineer).", "error"); return null; }
      const by = (api.currentWorkerName && api.currentWorkerName()) || "Műszaki tervező";
      const seq = (state.dtplSeq || 10) + 1;
      const id = `T-${String(seq).padStart(2, "0")}`;
      const src = data.fromId
        ? ((state.designTemplates || []).find((t) => t.id === data.fromId) || (window.PARAM_TEMPLATES || []).find((t) => t.id === data.fromId))
        : null;
      const blank = {
        type: "Egyedi", thumb: "empty", categoryId: "cat-cabinet", note: "",
        vars: [
          { key: "width",  label: "Szélesség", unit: "mm", min: 200, max: 3000, step: 50, default: 800, kind: "raster" },
          { key: "height", label: "Magasság",  unit: "mm", min: 200, max: 2400, step: 1,  default: 700, kind: "analog" },
          { key: "body",   label: "Anyag",     kind: "material", default: "EG-3303-18", options: ["EG-3303-18"] },
        ],
        parts: [], constraints: [], hardware: [], laborHours: 1, deliveryDays: 7,
      };
      const tpl = { ...(src ? clone(src) : blank), id,
        name: (data.name || (src ? src.name + " (másolat)" : "Új sablon")).trim(),
        status: "vazlat", version: src ? String(src.version || "0.1") : "0.1", rating: 0, uses: 0,
        author: by, createdBy: by, updated: today, baseId: src ? src.id : null, lastReleased: null,
        history: [{ at: nowStamp(), text: src ? `Vázlat a(z) ${src.id} (${src.name}) duplikálásával (${by})` : `Vázlat létrehozva (${by})` }] };
      set((s) => ({ designTemplates: [tpl, ...(s.designTemplates || [])], dtplSeq: seq }));
      postSystem(`📐 Új sablon-vázlat (${id}) — ${tpl.name}.`);
      emit();
      if (window.toast) window.toast(`✓ Sablon-vázlat: ${id}`, "success");
      return id;
    },
    // ── EGYEDI ELEM-KÉRÉS a Belsőépítészetből (PERM-MENTES auto-belépő, mint a
    //    webshop→auto-lead): a belsőépítész megadja a nevet + külső méretet +
    //    megjegyzést → sablon-VÁZLAT születik a műszaki sablon-műhelyben
    //    (requested:true jelöléssel); a műszaki tervező tölti fel és adja ki.
    requestCustomTemplate(data = {}) {
      ensure();
      const by = (api.currentWorkerName && api.currentWorkerName()) || "Belsőépítész";
      const seq = (state.dtplSeq || 10) + 1;
      const id = `T-${String(seq).padStart(2, "0")}`;
      const num = (v, d) => Math.max(100, Number(v) || d);
      const tpl = {
        id, type: "Egyedi", thumb: "empty", categoryId: "cat-cabinet",
        name: (data.name || "Egyedi elem").trim(),
        note: `Belsőépítészeti kérés${data.note ? ": " + data.note : ""}`,
        requested: true, requestedBy: by, requestRef: data.ref || null,
        vars: [
          { key: "width",  label: "Szélesség", unit: "mm", min: 200, max: 3600, step: 50, default: num(data.width, 800),  kind: "raster" },
          { key: "height", label: "Magasság",  unit: "mm", min: 200, max: 2600, step: 1,  default: num(data.height, 720), kind: "analog" },
          { key: "depth",  label: "Mélység",   unit: "mm", min: 200, max: 900,  step: 10, default: num(data.depth, 560),  kind: "analog" },
          { key: "body",   label: "Anyag",     kind: "material", default: "EG-3303-18", options: ["EG-3303-18"] },
        ],
        parts: [], constraints: [], hardware: [], laborHours: 1, deliveryDays: 7,
        status: "vazlat", version: "0.1", rating: 0, uses: 0,
        author: by, createdBy: by, updated: today, baseId: null, lastReleased: null,
        history: [{ at: nowStamp(), text: `Egyedi elem-kérés a Belsőépítészetből (${by}) — ${num(data.width, 800)}×${num(data.height, 720)}×${num(data.depth, 560)} mm` }],
      };
      set((s) => ({ designTemplates: [tpl, ...(s.designTemplates || [])], dtplSeq: seq }));
      // a kérés rajz-helye a DMS-ben születik (PERM-MENTES auto-belépő) — a
      // műszaki tervező ide verziózza a vázlat-rajzot; egy dokumentum-igazságforrás
      const { id: docId, seq: dseq } = api._nextDocId();
      set((s) => ({ docSeq: dseq, documents: [{ id: docId, name: `${tpl.name} — műszaki rajz`, type: "rajz", version: 1,
        status: "piszkozat", linkType: "template", linkId: id, linkLabel: `${id} · ${tpl.name}`,
        owner: by, updatedAt: today, fileLabel: "", note: `Egyedi elem-kérés melléklete (${by}).${data.note ? " " + data.note : ""}`,
        history: [{ v: 1, at: today, note: "Piszkozat a belsőépítészeti kérésből", status: "piszkozat" }] }, ...(s.documents || [])] }));
      postSystem(`📐 Egyedi elem-kérés (${id}) — ${tpl.name} (${by}). A műszaki tervezés tölti fel. Rajz-hely: ${docId}.`);
      emit();
      if (window.toast) window.toast(`✓ Kérés elküldve a műszaki tervezésnek: ${id}`, "success");
      return id;
    },
    // Szerkesztő-vázlat GYÁRI vagy KIADOTT sablonból — AZONOS id-n. Kiadáskor a
    //   registry-ben felülírja a korábbi formát; addig a gyári / lastReleased él.
    draftDesignTemplateFrom(baseId) {
      ensure();
      if (!api.hasPerm("design.engineer")) { if (window.toast) window.toast("Nincs jogosultság (design.engineer).", "error"); return null; }
      const by = (api.currentWorkerName && api.currentWorkerName()) || "Műszaki tervező";
      const existing = (state.designTemplates || []).find((t) => t.id === baseId);
      if (existing) {
        if (existing.status === "kiadott") return api.setDesignTemplateStatus(baseId, "ellenorzes", { reason: "Revízió nyitása" }) ? baseId : null;
        if (existing.status === "archivalt") return api.setDesignTemplateStatus(baseId, "vazlat", { reason: "Újranyitás" }) ? baseId : null;
        return baseId; // már van munka-példány
      }
      const src = (window.PARAM_TEMPLATES_BASE || window.PARAM_TEMPLATES || []).find((t) => t.id === baseId);
      if (!src) return null;
      const tpl = { ...clone(src), status: "vazlat", baseId, lastReleased: null, updated: today, createdBy: src.author || by,
        history: [{ at: nowStamp(), text: `Szerkesztő-vázlat a gyári v${src.version} alapján (${by}) — a kiadásig a gyári verzió marad élesben` }] };
      set((s) => ({ designTemplates: [tpl, ...(s.designTemplates || [])] }));
      postSystem(`📐 Szerkesztő-vázlat (${baseId}) — ${src.name} v${src.version} alapján.`);
      emit();
      if (window.toast) window.toast(`✓ Szerkesztő-vázlat: ${baseId} — a kiadásig a gyári verzió él`, "success");
      return baseId;
    },
    // Szerkesztés — csak vázlat/ellenőrzés alatt (a kiadott LEZÁRT: előbb revízió)
    updateDesignTemplate(id, patch) {
      ensure();
      if (!api.hasPerm("design.engineer")) { if (window.toast) window.toast("Nincs jogosultság (design.engineer).", "error"); return false; }
      const t = (state.designTemplates || []).find((x) => x.id === id);
      if (!t) return false;
      if (!(["vazlat", "ellenorzes"].includes(t.status))) { if (window.toast) window.toast("Kiadott/archivált sablon nem szerkeszthető — nyiss revíziót.", "warning"); return false; }
      set((s) => ({ designTemplates: s.designTemplates.map((x) => {
        if (x.id !== id) return x;
        let m = { ...x, ...patch, updated: today };
        // §21 skeleton-sablon: a vázból SZÁRMAZTATOTT w/h/t képletek + joints-tükör szinkronja
        if (m.skeleton && window.Skel && window.Skel.syncDerived) m = window.Skel.syncDerived({ ...m });
        return m;
      }) }));
      return true;
    },
    // Validált FSM-átmenet. `kiadott` = jog + teljesség + verzió-léptetés;
    //   ellenorzes→vazlat (visszaküldés) indok-köteles; kiadott→ellenorzes (revízió)
    //   a kiadott formát lastReleased pillanatképként a registry-ben tartja.
    setDesignTemplateStatus(id, to, opts = {}) {
      ensure();
      if (!api.hasPerm("design.engineer")) { if (window.toast) window.toast("Nincs jogosultság (design.engineer).", "error"); return false; }
      const t = (state.designTemplates || []).find((x) => x.id === id);
      if (!t) return false;
      if (!(window.TplEngine && window.TplEngine.canGo(t, to))) { if (window.toast) window.toast("Nem engedélyezett átmenet.", "error"); return false; }
      if (to === "vazlat" && t.status === "ellenorzes" && !(opts.reason && String(opts.reason).trim())) {
        if (window.toast) window.toast("Visszaküldéshez indok kötelező.", "warning"); return false;
      }
      if (to === "kiadott") {
        const c = window.TplEngine.completeness(t);
        if (!c.ready) { if (window.toast) window.toast("Kiadáshoz hiányzik: " + c.missing.join(" · "), "warning"); return false; }
      }
      const lbl = (window.TPL_STATUS[to] || {}).label || to;
      const hist = [...(t.history || []), { at: nowStamp(), text: `Státusz → ${lbl}${opts.reason ? ` (${String(opts.reason).trim()})` : ""}` }];
      const patch = { status: to, updated: today, history: hist };
      if (to === "kiadott") {
        patch.version = window.TplEngine.nextVersion(t);
        patch.lastReleased = null;
        patch.history = [...hist, { at: nowStamp(), text: `Kiadva v${patch.version} — a feloldó-registry-be került (konfigurátor / ajánlat / gyártás-előkészítés látja)` }];
      } else if (t.status === "kiadott") {
        patch.lastReleased = to === "ellenorzes" ? clone({ ...t, lastReleased: null }) : null;
      }
      set((s) => ({ designTemplates: s.designTemplates.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      postSystem(`📐 ${id} (${t.name}) — ${lbl}${to === "kiadott" ? ` v${patch.version}` : ""}.`);
      emit();
      if (window.toast) window.toast(`✓ ${id} — ${lbl}${to === "kiadott" ? ` v${patch.version}` : ""}`, "success");
      return true;
    },
    // ── Bérmunka művelet-típusok (Beállítások → Munkafolyamat → Bérmunka) ──────
    addOutsourceOp(data) {
      ensure();
      const id = "os-" + Date.now().toString(36);
      const op = { id, op: (data.op || "custom"), label: (data.label || "Új bérmunka típus").trim(),
        icon: data.icon || "external", epicMatch: (data.epicMatch || "").trim(), makerCats: data.makerCats || [], desc: (data.desc || "").trim() };
      set((s) => ({ outsourceOps: [...(s.outsourceOps || []), op] }));
      emit();
      if (window.toast) window.toast(`✓ Bérmunka típus: ${op.label}`, "success");
      return id;
    },
    updateOutsourceOp(id, patch) {
      ensure();
      set((s) => ({ outsourceOps: (s.outsourceOps || []).map((o) => o.id === id ? { ...o, ...patch } : o) }));
      emit();
    },
    removeOutsourceOp(id) {
      ensure();
      set((s) => ({ outsourceOps: (s.outsourceOps || []).filter((o) => o.id !== id) }));
      emit();
      if (window.toast) window.toast("Bérmunka típus törölve", "info");
    },

    // Egy VAGY TÖBB bérmunka-művelet kiadása egy partnernek EGY csomagban.
    //   opIds: a sim.outsourceOps id-jei. Megkeresi mindegyikhez a folyamat-epiket,
    //   majd EGY kézfogást hoz létre, ami az összes érintett epiket lefedi
    //   (epicIds[]). A partner megkapja a kidolgozott részletes infót (payload).
    delegateOutsource(projectId, opIds, partnerId, note) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      const partner = (state.partners || []).find((x) => x.id === partnerId);
      if (!p || !partner) return;
      const flatten = window.flattenEpics || ((m) => m.epics || []);
      const allEpics = [];
      (p.milestones || []).forEach((m) => flatten(m).forEach((e) => allEpics.push(e)));
      const defs = (state.outsourceOps || []).filter((o) => (opIds || []).includes(o.id));
      const matched = [];
      defs.forEach((d) => {
        const re = window.mfgEpicRe(d.epicMatch);
        const ep = allEpics.find((e) => re.test(e.title || "") && !matched.some((m) => m.epic.id === e.id));
        if (ep) matched.push({ def: d, epic: ep });
      });
      if (!matched.length) {
        if (window.toast) window.toast("Nincs a folyamatban megfelelő epik a kijelölt művelethez — előbb húzd rá a gyártási folyamatot.", "info");
        return;
      }
      const me = api.currentAccount();
      const hid = "HS-" + projectId.slice(-3) + "-" + ((state.handshakes || []).length + 1);
      const epicIds = matched.map((m) => m.epic.id);
      const titles = matched.map((m) => m.epic.title);
      const opLabels = matched.map((m) => m.def.label);
      const bundle = matched.length > 1;
      const payload = window.MfgPrep ? window.MfgPrep.payloadFor(p, matched.map((m) => m.def.op)) : null;
      const hs = { id: hid, projectId, projectName: p.name,
        epicId: epicIds[0], epicTitle: bundle ? `${opLabels.join(" + ")} (csomag)` : titles[0],
        epicIds, epicTitles: titles, ops: matched.map((m) => m.def.op), opLabels, bundle,
        fromCompany: me.name, partnerId: partner.id, partnerName: partner.name,
        status: partner.platform ? "sent" : "external", external: !partner.platform,
        note: (note || "").trim(), payload, ts: nowStamp() };
      // egyetlen állapot-frissítés: handshake + minden érintett epik megjelölése
      set((s) => {
        let projects = s.projects;
        epicIds.forEach((eid) => { projects = api._mapEpic(projectId, eid, (e) => ({ ...e, handshakeId: hid, delegatedTo: partner.name, delegatedExternal: !partner.platform }))({ projects }).projects; });
        return { handshakes: [hs, ...(s.handshakes || [])], projects };
      });
      postSystem(partner.platform
        ? `🤝 ${p.name}: ${bundle ? `${opLabels.join(" + ")} csomag` : `„${titles[0]}”`} kiadva → ${partner.name} (kézfogás elküldve, részletes csomaggal).`
        : `🔗 ${p.name}: ${bundle ? `${opLabels.join(" + ")} csomag` : `„${titles[0]}”`} külső partnerhez rendelve: ${partner.name} (platformon kívül).`, "ch-prod");
      emit();
      if (window.toast) window.toast(partner.platform ? `✓ Kiadva — ${partner.name}` : `✓ Külső partner: ${partner.name}`, "success");
      return hid;
    },
    // Visszafelé kompatibilis egy-műveletes belépő (op = MFG_DEPARTMENTS op-kulcs)
    delegatePrepOperation(projectId, op, partnerId) {
      ensure();
      const def = (state.outsourceOps || []).find((o) => o.op === op);
      if (!def) { if (window.toast) window.toast("Ismeretlen bérmunka típus.", "info"); return; }
      return api.delegateOutsource(projectId, [def.id], partnerId);
    },

    // ── Rendelhető egyedi (külső gyártó) → beszerzési igény ──────────────────────
    requisitionOutsourcedItem(projectId, itemId, makerId) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      const it = p && (p.items || []).find((i) => i.id === itemId);
      if (!it) return;
      const me = api.currentAccount();
      const maker = makerId
        ? (state.partners || []).find((x) => x.id === makerId)
        : (state.partners || []).find((x) => x.actorType === "supplier" && (x.makerCategories || []).includes(it.elemCategory))
          || (state.partners || []).find((x) => x.actorType === "supplier");
      const supplierName = maker ? maker.name : "Külső gyártó";
      const reqId = "PR-2426-" + String(100 + state.requisitions.length).slice(-3);
      const req = {
        id: reqId, material: it.name + " — rendelt egyedi gyártás", matCode: "",
        qty: 1, unit: "db", preferredSupplier: supplierName, supplierId: maker ? maker.id : null,
        requester: me.name || "Kovács Péter", date: today, status: "Draft",
        note: `Rendelhető egyedi termék${it.elemCategory ? ` (${it.elemCategory})` : ""} — külső gyártótól rendelve.`, estUnit: it.value, type: "outsourced",
        projectRef: projectId, fromQuote: p.fromQuote || null,
        lines: [{ code: "", material: it.name, qty: 1, unit: "db", estUnit: it.value }],
      };
      set((s) => ({
        requisitions: [req, ...s.requisitions],
        projects: s.projects.map((pr) => pr.id === projectId ? { ...pr, items: pr.items.map((i) => i.id === itemId ? { ...i, reqId, supplierName } : i) } : pr),
      }));
      postSystem(`🛒 ${p.name}: „${it.name}" rendelhető egyedi → beszerzési igény (${reqId}) a külső gyártónak: ${supplierName}.`, "ch-beszerzes");
      emit();
      if (window.toast) window.toast(`✓ Beszerzési igény — ${reqId} · ${supplierName}`, "success");
      return reqId;
    },

    setDependencyStatus(projectId, depId, status) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      const dep = p && p.dependencies.find((d) => d.id === depId);
      if (!dep) return;
      set((s) => ({ projects: s.projects.map((pr) => pr.id === projectId
        ? { ...pr, dependencies: pr.dependencies.map((d) => (d.id === depId ? { ...d, status } : d)) } : pr) }));
      const meta = (window.TRADE_META && window.TRADE_META[dep.trade]) || { label: dep.trade };
      postSystem(`🔧 ${p.name}: „${meta.label}” → ${status}.`, "ch-prod");
      // if this unblocked the install, announce readiness
      const after = api.getState().projects.find((x) => x.id === projectId);
      const st = api.projectInstallStatus(after);
      if (st.ready && dep.blocksInstall && status === "done") postSystem(`✅ ${p.name}: minden szakág kész — a bútor beépítés indítható.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Szakág frissítve: ${meta.label}`, "success");
    },

    setProjectStatus(projectId, status) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      if (!p) return;
      if (status === "install" && !api.projectInstallStatus(p).ready) {
        if (window.toast) window.toast("Beépítés nem indítható — blokkoló szakág még nincs kész.", "error");
        return;
      }
      set((s) => ({ projects: s.projects.map((pr) => (pr.id === projectId ? { ...pr, status } : pr)) }));
      postSystem(`📁 ${p.name}: projekt állapota → ${status}.`);
      emit();
      if (window.toast) window.toast(`✓ Projekt: ${status}`, "success");
    },

    // computed install-readiness from blocking dependencies
    projectInstallStatus(project) {
      if (!project) return { ready: false, blockedBy: [], atRisk: false };
      const blocking = project.dependencies.filter((d) => d.blocksInstall);
      const blockedBy = blocking.filter((d) => d.status !== "done");
      const target = project.installTarget;
      const atRisk = blockedBy.some((d) => d.due && target && d.due > target);
      return { ready: blockedBy.length === 0, blockedBy, atRisk, total: blocking.length, doneCount: blocking.length - blockedBy.length };
    },

    // ── SpaceOS hierarchia: mérföldkő → (almérföldkő) → epik → task ────────────
    // Epik FSM — validált átmenetek. SOHA ne ugorj fázist, lezárt nem nyílik vissza.
    epicNext: {
      BACKLOG_READY:  ["IN_DEV"],
      IN_DEV:         ["IN_REVIEW", "CLOSED_BLOCKED"],
      IN_REVIEW:      ["CLOSED_DONE", "CLOSED_BLOCKED", "IN_DEV"],
      CLOSED_DONE:    [],
      CLOSED_BLOCKED: ["BACKLOG_READY"],
    },
    epicCanTransition(from, to) { return (api.epicNext[from] || []).includes(to); },

    // walk every epic in a project (flattening sub-milestones), with locator info
    eachEpic(project, fn) {
      (project.milestones || []).forEach((m) => {
        (m.epics || []).forEach((e) => fn(e, m, null));
        (m.subMilestones || []).forEach((sm) => (sm.epics || []).forEach((e) => fn(e, m, sm)));
      });
    },
    findEpic(projectId, epicId) {
      const p = state.projects.find((x) => x.id === projectId);
      if (!p) return null;
      let found = null;
      api.eachEpic(p, (e, m, sm) => { if (e.id === epicId) found = { epic: e, milestone: m, sub: sm }; });
      return found;
    },
    _mapEpic(projectId, epicId, patchFn) {
      const mapEpics = (epics) => (epics || []).map((e) => (e.id === epicId ? patchFn(e) : e));
      return (s) => ({ projects: s.projects.map((pr) => pr.id !== projectId ? pr : ({
        ...pr,
        milestones: (pr.milestones || []).map((m) => ({
          ...m,
          epics: mapEpics(m.epics),
          subMilestones: (m.subMilestones || []).map((sm) => ({ ...sm, epics: mapEpics(sm.epics) })),
        })),
      })) });
    },

    setEpicStatus(projectId, epicId, status, opts = {}) {
      ensure();
      const loc = api.findEpic(projectId, epicId);
      const p = state.projects.find((x) => x.id === projectId);
      if (!loc || !p) return false;
      const from = loc.epic.status;
      if (from === status) return false;
      if (!api.epicCanTransition(from, status)) {
        if (window.toast) window.toast(`Tiltott átmenet: ${EPIC_LABEL(from)} → ${EPIC_LABEL(status)}.`, "error");
        return false;
      }
      if (status === "CLOSED_BLOCKED" && !(opts.reason && opts.reason.trim())) {
        if (window.toast) window.toast("Blokkolt lezáráshoz indoklás kötelező.", "error");
        return false;
      }
      // IN_REVIEW lezárását (CLOSED_DONE) csak ellenőrző actor végezheti — a végrehajtó (supplier) nem
      if (status === "CLOSED_DONE") {
        const me = api.currentAccount();
        if (me.actorType === "supplier" || me.actorType === "installer") {
          if (window.toast) window.toast("Lezárást (kész) csak a megrendelő / minőségellenőr végezhet.", "error");
          return false;
        }
      }
      set(api._mapEpic(projectId, epicId, (e) => ({ ...e, status, ...(opts.reason ? { blockReason: opts.reason.trim() } : {}) })));
      postSystem(`🧩 ${p.name}: „${loc.epic.title}” epik → ${EPIC_LABEL(status)}${opts.reason ? ` (${opts.reason.trim()})` : ""}.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Epik: ${EPIC_LABEL(status)}`, "success");
      return true;
    },

    toggleEpicTask(projectId, epicId, taskId) {
      ensure();
      set(api._mapEpic(projectId, epicId, (e) => ({ ...e, tasks: (e.tasks || []).map((t) => t.id === taskId ? { ...t, done: !t.done } : t) })));
      emit();
    },
    addEpicTask(projectId, epicId, title) {
      ensure();
      if (!title || !title.trim()) return;
      const tid = "t" + Date.now().toString(36);
      set(api._mapEpic(projectId, epicId, (e) => ({ ...e, tasks: [...(e.tasks || []), { id: tid, title: title.trim(), done: false, assignee: "" }] })));
      emit();
    },

    addEpic(projectId, milestoneId, subId, data) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      if (!p) return;
      const eid = "e" + Date.now().toString(36);
      const epic = { id: eid, title: (data.title || "Új epik").trim(), status: "BACKLOG_READY",
        ownerType: data.ownerType || "manufacturer", owner: data.owner || "", due: data.due || p.installTarget, tasks: [] };
      set((s) => ({ projects: s.projects.map((pr) => pr.id !== projectId ? pr : ({
        ...pr,
        milestones: (pr.milestones || []).map((m) => {
          if (m.id !== milestoneId) return m;
          if (subId) return { ...m, subMilestones: (m.subMilestones || []).map((sm) => sm.id === subId ? { ...sm, epics: [...(sm.epics || []), epic] } : sm) };
          return { ...m, epics: [...(m.epics || []), epic] };
        }),
      })) }));
      postSystem(`🧩 ${p.name}: új epik „${epic.title}” felvéve.`, "ch-prod");
      emit();
      if (window.toast) window.toast("✓ Epik létrehozva", "success");
      return eid;
    },

    addMilestone(projectId, name) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      if (!p || !name || !name.trim()) return;
      const mid = "m" + Date.now().toString(36);
      const phase = (p.milestones || []).length + 1;
      set((s) => ({ projects: s.projects.map((pr) => pr.id === projectId ? { ...pr, milestones: [...(pr.milestones || []), { id: mid, name: name.trim(), phase, epics: [] }] } : pr) }));
      emit();
      if (window.toast) window.toast(`✓ Mérföldkő: ${name.trim()}`, "success");
      return mid;
    },

    // ── B2BHandshake: epik delegálása másik platform-cégnek ────────────────────
    delegateEpic(projectId, epicId, partnerId) {
      ensure();
      const loc = api.findEpic(projectId, epicId);
      const p = state.projects.find((x) => x.id === projectId);
      const partner = (state.partners || []).find((x) => x.id === partnerId);
      if (!loc || !p || !partner) return;
      const me = api.currentAccount();
      const hid = "HS-" + projectId.slice(-3) + "-" + ((state.handshakes || []).length + 1);
      const hs = { id: hid, projectId, projectName: p.name, epicId, epicTitle: loc.epic.title,
        fromCompany: me.name, partnerId: partner.id, partnerName: partner.name,
        status: partner.platform ? "sent" : "external", external: !partner.platform, note: "", ts: nowStamp() };
      set((s) => ({
        handshakes: [hs, ...(s.handshakes || [])],
        ...api._mapEpic(projectId, epicId, (e) => ({ ...e, handshakeId: hid, delegatedTo: partner.name, delegatedExternal: !partner.platform }))(s),
      }));
      postSystem(partner.platform
        ? `🤝 ${p.name}: „${loc.epic.title}” epik kiadva → ${partner.name} (kézfogás elküldve).`
        : `🔗 ${p.name}: „${loc.epic.title}” epik külső partnerhez rendelve: ${partner.name} (platformon kívül, kézi státusz).`, "ch-prod");
      emit();
      if (window.toast) window.toast(partner.platform ? `✓ Kézfogás elküldve — ${partner.name}` : `✓ Külső partner: ${partner.name}`, "success");
      return hid;
    },
    acceptDelegation(handshakeId) {
      ensure();
      const hs = (state.handshakes || []).find((x) => x.id === handshakeId);
      if (!hs) return;
      set((s) => ({ handshakes: s.handshakes.map((x) => x.id === handshakeId ? { ...x, status: "accepted" } : x) }));
      (hs.epicIds || [hs.epicId]).forEach((eid) => {
        const loc = api.findEpic(hs.projectId, eid);
        if (loc && loc.epic.status === "BACKLOG_READY") set(api._mapEpic(hs.projectId, eid, (e) => ({ ...e, status: "IN_DEV" })));
      });
      postSystem(`🤝 ${hs.partnerName} elfogadta a megbízást: „${hs.epicTitle}” (${hs.projectName}).`, "ch-prod");
      emit();
      if (window.toast) window.toast("✓ Megbízás elfogadva", "success");
    },
    declineDelegation(handshakeId) {
      ensure();
      const hs = (state.handshakes || []).find((x) => x.id === handshakeId);
      if (!hs) return;
      set((s) => {
        let projects = s.projects;
        (hs.epicIds || [hs.epicId]).forEach((eid) => { projects = api._mapEpic(hs.projectId, eid, (e) => ({ ...e, handshakeId: null, delegatedTo: null, delegatedExternal: false }))({ projects }).projects; });
        return { handshakes: s.handshakes.map((x) => x.id === handshakeId ? { ...x, status: "declined" } : x), projects };
      });
      postSystem(`✋ ${hs.partnerName} visszautasította a megbízást: „${hs.epicTitle}”.`, "ch-prod");
      emit();
      if (window.toast) window.toast("Megbízás visszautasítva", "info");
    },
    completeDelegation(handshakeId) {
      ensure();
      const hs = (state.handshakes || []).find((x) => x.id === handshakeId);
      if (!hs) return;
      set((s) => ({ handshakes: s.handshakes.map((x) => x.id === handshakeId ? { ...x, status: "done" } : x) }));
      (hs.epicIds || [hs.epicId]).forEach((eid) => {
        const loc = api.findEpic(hs.projectId, eid);
        if (loc && api.epicCanTransition(loc.epic.status, "IN_REVIEW")) set(api._mapEpic(hs.projectId, eid, (e) => ({ ...e, status: "IN_REVIEW" })));
      });
      postSystem(`✅ ${hs.partnerName} kész: „${hs.epicTitle}” visszajelezve ellenőrzésre.`, "ch-prod");
      emit();
      if (window.toast) window.toast("✓ Visszajelezve ellenőrzésre", "success");
    },
    incomingHandshakes() {
      ensure();
      const me = api.currentAccount();
      if (!me.partnerId) return [];
      return (state.handshakes || []).filter((h) => h.partnerId === me.partnerId);
    },

    // ── Sablonok (Beállítások → Munkafolyamat) ─────────────────────────────────
    addTemplate(kind, data) {
      ensure();
      const id = (kind === "project" ? "tpl-" : "etpl-") + Date.now().toString(36);
      const base = kind === "project"
        ? { id, name: (data.name || "Új projekt sablon").trim(), desc: data.desc || "", color: data.color || "#7c3aed", milestones: data.milestones || [] }
        : { id, name: (data.name || "Új epik sablon").trim(), desc: data.desc || "", ownerType: data.ownerType || "manufacturer", tasks: data.tasks || [] };
      set((s) => ({ templates: { ...s.templates, [kind]: [...(s.templates[kind] || []), base] } }));
      emit();
      if (window.toast) window.toast("✓ Sablon létrehozva", "success");
      return id;
    },
    updateTemplate(kind, id, patch) {
      ensure();
      set((s) => ({ templates: { ...s.templates, [kind]: (s.templates[kind] || []).map((tp) => tp.id === id ? { ...tp, ...patch } : tp) } }));
      emit();
      if (window.toast) window.toast("✓ Sablon mentve", "success");
    },
    removeTemplate(kind, id) {
      ensure();
      set((s) => ({ templates: { ...s.templates, [kind]: (s.templates[kind] || []).filter((tp) => tp.id !== id) } }));
      emit();
      if (window.toast) window.toast("Sablon törölve", "info");
    },

    // sablonból konkrét mérföldkő-struktúra (státusz BACKLOG_READY, due = projekt cél)
    _scaffoldFromTemplate(tpl, project) {
      const due = project ? project.installTarget : today;
      const mkEpic = (e, n) => ({ id: "e" + Date.now().toString(36) + n, title: e.title, status: "BACKLOG_READY",
        ownerType: e.ownerType || "manufacturer", owner: "", due, tasks: (e.tasks || []).map((tt, ti) => ({ id: "t" + Date.now().toString(36) + n + ti, title: typeof tt === "string" ? tt : tt.title, done: false, assignee: "" })) });
      let n = 0;
      return (tpl.milestones || []).map((m, mi) => {
        const base = { id: "m" + Date.now().toString(36) + mi, name: m.name, phase: mi + 1 };
        if ((m.subMilestones || []).length) {
          return { ...base, subMilestones: m.subMilestones.map((sm, si) => ({ id: "sm" + Date.now().toString(36) + mi + si, name: sm.name, epics: (sm.epics || []).map((e) => mkEpic(e, n++)) })) };
        }
        return { ...base, epics: (m.epics || []).map((e) => mkEpic(e, n++)) };
      });
    },
    applyProjectTemplate(projectId, templateId, { replace = false } = {}) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      const tpl = (state.templates.project || []).find((x) => x.id === templateId);
      if (!p || !tpl) return;
      const scaffold = api._scaffoldFromTemplate(tpl, p);
      set((s) => ({ projects: s.projects.map((pr) => pr.id !== projectId ? pr : ({ ...pr, milestones: replace ? scaffold : [...(pr.milestones || []), ...scaffold] })) }));
      postSystem(`🧩 ${p.name}: „${tpl.name}" sablon alkalmazva (${scaffold.length} fázis).`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Sablon alkalmazva — ${tpl.name}`, "success");
    },
    addEpicFromTemplate(projectId, milestoneId, subId, templateId) {
      ensure();
      const tpl = (state.templates.epic || []).find((x) => x.id === templateId);
      const p = state.projects.find((x) => x.id === projectId);
      if (!tpl || !p) return;
      const eid = "e" + Date.now().toString(36);
      const epic = { id: eid, title: tpl.name, status: "BACKLOG_READY", ownerType: tpl.ownerType || "manufacturer", owner: "", due: p.installTarget,
        tasks: (tpl.tasks || []).map((tt, ti) => ({ id: eid + "t" + ti, title: typeof tt === "string" ? tt : tt.title, done: false, assignee: "" })) };
      set((s) => ({ projects: s.projects.map((pr) => pr.id !== projectId ? pr : ({
        ...pr,
        milestones: (pr.milestones || []).map((m) => {
          if (m.id !== milestoneId) return m;
          if (subId) return { ...m, subMilestones: (m.subMilestones || []).map((sm) => sm.id === subId ? { ...sm, epics: [...(sm.epics || []), epic] } : sm) };
          return { ...m, epics: [...(m.epics || []), epic] };
        }),
      })) }));
      postSystem(`🧩 ${p.name}: „${tpl.name}" epik sablonból felvéve.`, "ch-prod");
      emit();
      if (window.toast) window.toast("✓ Epik sablonból létrehozva", "success");
      return eid;
    },

    // ── Folyamatok (process engine) — kirendeltségenként saját definíciók ───────
    facilities() { return (window.FACILITIES || []); },
    processesForFacility(facilityId) { ensure(); return (state.processes || []).filter((p) => p.facilityId === facilityId); },
    findProcess(id) { ensure(); return (state.processes || []).find((p) => p.id === id); },

    addProcess(facilityId, data = {}) {
      ensure();
      const id = "proc-" + Date.now().toString(36);
      const proc = { id, facilityId, name: (data.name || "Új folyamat").trim(), color: data.color || "#7c3aed", desc: data.desc || "",
        flow: data.flow || [{ id: "s" + Date.now().toString(36), kind: "step", name: "Első lépés", phase: "Kezdés", actor: "manufacturer", external: false, sla: 8, subtasks: [] }] };
      set((s) => ({ processes: [...(s.processes || []), proc] }));
      emit();
      if (window.toast) window.toast("✓ Folyamat létrehozva", "success");
      return id;
    },
    updateProcess(id, patch) {
      ensure();
      set((s) => ({ processes: (s.processes || []).map((p) => p.id === id ? { ...p, ...patch } : p) }));
      emit();
      if (window.toast) window.toast("✓ Folyamat mentve", "success");
    },
    removeProcess(id) {
      ensure();
      set((s) => ({ processes: (s.processes || []).filter((p) => p.id !== id) }));
      emit();
      if (window.toast) window.toast("Folyamat törölve", "info");
    },
    duplicateProcess(id) {
      ensure();
      const p = (state.processes || []).find((x) => x.id === id);
      if (!p) return;
      const copy = JSON.parse(JSON.stringify(p));
      copy.id = "proc-" + Date.now().toString(36);
      copy.name = p.name + " (másolat)";
      set((s) => ({ processes: [...(s.processes || []), copy] }));
      emit();
      if (window.toast) window.toast("✓ Folyamat duplikálva", "success");
      return copy.id;
    },

    // ── Specifikáció-rendszer (moduláris): kategóriák + stílus + műszaki ──────
    // Kategória = a stílus/műszaki MEZŐSÉMÁJA + a sablonok osztályozója.
    findSpecCategory(id) { ensure(); return (state.specCategories || []).find((c) => c.id === id); },
    addSpecCategory(data = {}) {
      ensure();
      const id = "spcat-" + Date.now().toString(36).slice(-5);
      const cat = { id, name: (data.name || "Új kategória").trim(), icon: data.icon || "box",
        color: data.color || "stone", desc: data.desc || "", builtin: false,
        styleFields: data.styleFields || [], techFields: data.techFields || [] };
      set((s) => ({ specCategories: [...(s.specCategories || []), cat] }));
      emit();
      if (window.toast) window.toast("✓ Kategória létrehozva", "success");
      return id;
    },
    updateSpecCategory(id, patch) {
      ensure();
      set((s) => ({ specCategories: (s.specCategories || []).map((c) => c.id === id ? { ...c, ...patch } : c) }));
      emit();
    },
    removeSpecCategory(id) {
      ensure();
      const used = (state.styles || []).some((x) => x.categoryId === id) || (state.techSpecs || []).some((x) => x.categoryId === id);
      if (used) { if (window.toast) window.toast("Nem törölhető: van hozzá tartozó stílus/műszaki.", "error"); return false; }
      set((s) => ({ specCategories: (s.specCategories || []).filter((c) => c.id !== id) }));
      emit();
      if (window.toast) window.toast("Kategória törölve", "info");
      return true;
    },
    // Egy kategória mezősémájának szerkesztése (which: "styleFields" | "techFields")
    setSpecCategoryFields(id, which, fields) {
      ensure();
      set((s) => ({ specCategories: (s.specCategories || []).map((c) => c.id === id ? { ...c, [which]: fields } : c) }));
      emit();
      if (window.toast) window.toast("✓ Séma mentve", "success");
    },

    // Stílus / Műszaki példányok — kind: "style" | "tech"
    _coll(kind) { return kind === "tech" ? "techSpecs" : "styles"; },
    findSpec(kind, id) { ensure(); return (state[api._coll(kind)] || []).find((x) => x.id === id); },
    stylesFor(categoryId, onlyActive = false) {
      ensure();
      return (state.styles || []).filter((x) => x.categoryId === categoryId && (!onlyActive || x.status === "active"));
    },
    techSpecsFor(categoryId, onlyActive = false) {
      ensure();
      return (state.techSpecs || []).filter((x) => x.categoryId === categoryId && (!onlyActive || x.status === "active"));
    },
    addSpecInstance(kind, data = {}) {
      ensure();
      const coll = api._coll(kind);
      const pre = kind === "tech" ? "MS-" : "ST-";
      const id = pre + Date.now().toString(36).slice(-4).toUpperCase();
      const inst = { id, categoryId: data.categoryId || null, name: (data.name || "Új elem").trim(),
        status: "active", note: data.note || "", values: data.values || {} };
      set((s) => ({ [coll]: [inst, ...(s[coll] || [])] }));
      emit();
      if (window.toast) window.toast(kind === "tech" ? "✓ Műszaki létrehozva" : "✓ Stílus létrehozva", "success");
      return id;
    },
    updateSpecInstance(kind, id, patch) {
      ensure();
      const coll = api._coll(kind);
      set((s) => ({ [coll]: (s[coll] || []).map((x) => x.id === id ? { ...x, ...patch } : x) }));
      emit();
      if (window.toast) window.toast("✓ Mentve", "success");
    },
    setSpecInstanceStatus(kind, id, status) {
      ensure();
      const coll = api._coll(kind);
      const inst = (state[coll] || []).find((x) => x.id === id);
      set((s) => ({ [coll]: (s[coll] || []).map((x) => x.id === id ? { ...x, status } : x) }));
      emit();
      if (inst && state.settings && state.settings.eventMessages) {
        postSystem(`Specifikáció ${status === "archived" ? "archiválva" : "aktiválva"}: ${inst.name} (${inst.id}).`);
      }
      if (window.toast) window.toast(status === "archived" ? "Archiválva" : "Aktiválva", "info");
    },
    duplicateSpecInstance(kind, id) {
      ensure();
      const coll = api._coll(kind);
      const inst = (state[coll] || []).find((x) => x.id === id);
      if (!inst) return;
      const copy = JSON.parse(JSON.stringify(inst));
      const pre = kind === "tech" ? "MS-" : "ST-";
      copy.id = pre + Date.now().toString(36).slice(-4).toUpperCase();
      copy.name = inst.name + " (másolat)";
      copy.status = "active";
      set((s) => ({ [coll]: [copy, ...(s[coll] || [])] }));
      emit();
      if (window.toast) window.toast("✓ Duplikálva", "success");
      return copy.id;
    },
    removeSpecInstance(kind, id) {
      ensure();
      const coll = api._coll(kind);
      set((s) => ({ [coll]: (s[coll] || []).filter((x) => x.id !== id) }));
      emit();
      if (window.toast) window.toast("Törölve", "info");
    },

    // flatten the structured flow into linear steps (recursing branches/parallel), collecting loops
    _walkProcess(flow, ctx, acc) {
      (flow || []).forEach((seg) => {
        if (seg.kind === "step") acc.steps.push({ ...seg, _cond: ctx.cond || null, _lane: ctx.lane || null });
        else if (seg.kind === "branch") (seg.paths || []).forEach((pp) => api._walkProcess(pp.flow, { ...ctx, cond: pp.label }, acc));
        else if (seg.kind === "parallel") (seg.lanes || []).forEach((ln) => api._walkProcess(ln.flow, { ...ctx, lane: ln.label }, acc));
        else if (seg.kind === "loop") acc.loops.push(seg);
      });
      return acc;
    },
    processStepStats(proc) {
      const acc = api._walkProcess(proc.flow, {}, { steps: [], loops: [] });
      const phases = [...new Set(acc.steps.map((s) => s.phase || "Egyéb"))];
      return { steps: acc.steps.length, loops: acc.loops.length, ext: acc.steps.filter((s) => s.external).length, phases: phases.length,
        branches: (proc.flow || []).filter((s) => s.kind === "branch").length, parallels: (proc.flow || []).filter((s) => s.kind === "parallel").length };
    },

    // ── A folyamat a "forrás": ráhúzva legenerálja a mérföldkő → epik → task hierarchiát.
    applyProcessToProject(projectId, processId, { replace = true } = {}) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      const proc = (state.processes || []).find((x) => x.id === processId);
      if (!p || !proc) return;
      const me = api.currentAccount();
      const acc = api._walkProcess(proc.flow, {}, { steps: [], loops: [] });
      const due = p.installTarget;
      const stamp = Date.now().toString(36);
      // group steps by phase (first-seen order) → milestones
      const order = [];
      const byPhase = {};
      acc.steps.forEach((st, i) => {
        const ph = st.phase || "Egyéb";
        if (!byPhase[ph]) { byPhase[ph] = []; order.push(ph); }
        byPhase[ph].push({ st, i });
      });
      const newHandshakes = [];
      const milestones = order.map((ph, mi) => ({
        id: "m" + stamp + mi, name: ph, phase: mi + 1,
        epics: byPhase[ph].map(({ st, i }) => {
          const eid = "e" + stamp + i;
          const epic = { id: eid, title: st.name, status: "BACKLOG_READY", ownerType: st.actor || "manufacturer", owner: "", due,
            sla: st.sla || null, processStepId: st.id,
            condLabel: st._cond || null, laneLabel: st._lane || null,
            tasks: (st.subtasks || []).map((tt, ti) => ({ id: eid + "t" + ti, title: typeof tt === "string" ? tt : tt.title, done: false, assignee: "" })) };
          if (st.external) {
            // félautomata: DRAFT kézfogás — átnézhető, szerkeszthető, majd küldhető
            const partner = (state.partners || []).find((x) => x.actorType === (st.partnerType || "supplier") && x.platform)
                         || (state.partners || []).find((x) => x.actorType === (st.partnerType || "supplier"));
            const hid = "HS-" + projectId.slice(-3) + "-D" + i;
            newHandshakes.push({ id: hid, projectId, projectName: p.name, epicId: eid, epicTitle: st.name,
              fromCompany: me.name, partnerId: partner ? partner.id : null, partnerName: partner ? partner.name : "", partnerType: st.partnerType || "supplier",
              status: "draft", external: false, note: `Auto-előkészített átadás a(z) „${proc.name}" folyamatból.`, ts: nowStamp() });
            epic.handshakeId = hid;
            epic.delegatedTo = partner ? partner.name : null;
            epic.delegatedDraft = true;
          }
          return epic;
        }),
      }));
      const reworkRules = acc.loops.map((lp) => {
        const tgt = acc.steps.find((s) => s.id === lp.targetId);
        return { id: lp.id, label: lp.label, cond: lp.cond || "", target: tgt ? tgt.name : "" };
      });
      set((s) => ({
        projects: s.projects.map((pr) => pr.id !== projectId ? pr : ({
          ...pr, processId, processName: proc.name, facilityId: proc.facilityId,
          milestones: replace ? milestones : [...(pr.milestones || []), ...milestones],
          reworkRules,
          run: { started: false, decisions: {}, loops: {}, skipped: [], log: [] },
        })),
        handshakes: [...newHandshakes, ...(s.handshakes || [])],
      }));
      postSystem(`⚙️ ${p.name}: „${proc.name}" folyamat alkalmazva — ${milestones.length} fázis, ${acc.steps.length} epik${newHandshakes.length ? `, ${newHandshakes.length} előkészített átadás (draft)` : ""}.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Folyamat alkalmazva — ${proc.name}`, "success");
    },

    // draft kézfogás szerkesztése + küldése (félautomata átadás)
    updateHandshake(id, patch) {
      ensure();
      set((s) => ({ handshakes: s.handshakes.map((h) => h.id === id ? { ...h, ...patch } : h) }));
      // keep epic's delegatedTo label in sync if partner changed
      if (patch.partnerName !== undefined) {
        const hs = (state.handshakes || []).find((h) => h.id === id);
        if (hs) set(api._mapEpic(hs.projectId, hs.epicId, (e) => ({ ...e, delegatedTo: patch.partnerName || null })));
      }
      emit();
    },
    sendHandshake(id) {
      ensure();
      const hs = (state.handshakes || []).find((h) => h.id === id);
      if (!hs) return;
      if (!hs.partnerId) { if (window.toast) window.toast("Válassz partnert a küldés előtt.", "error"); return; }
      const partner = (state.partners || []).find((x) => x.id === hs.partnerId);
      const ext = partner ? !partner.platform : false;
      set((s) => ({ handshakes: s.handshakes.map((h) => h.id === id ? { ...h, status: ext ? "external" : "sent", external: ext } : h) }));
      set(api._mapEpic(hs.projectId, hs.epicId, (e) => ({ ...e, delegatedDraft: false, delegatedExternal: ext })));
      postSystem(ext
        ? `🔗 ${hs.projectName}: „${hs.epicTitle}” külső partnerhez küldve: ${hs.partnerName} (platformon kívül).`
        : `🤝 ${hs.projectName}: „${hs.epicTitle}” átadás elküldve → ${hs.partnerName} (kézfogás).`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Átadás elküldve — ${hs.partnerName}`, "success");
    },

    // ── ÉLŐ FOLYAMAT-FUTÁS — a folyamat vezérli a projektet ─────────────────────
    //   A lépés-státusz a hozzá tartozó epik státuszából SZÁRMAZIK (egy igazságforrás):
    //     BACKLOG_READY=pending · IN_DEV/IN_REVIEW=active · CLOSED_DONE=done · CLOSED_BLOCKED=blocked
    //   A döntések (elágazás) és ciklus-számlálók a project.run-ban élnek.
    _epicByStep(project, stepId) {
      let found = null;
      api.eachEpic(project, (e) => { if (e.processStepId === stepId) found = e; });
      return found;
    },
    runStepStatus(project, stepId) {
      const run = project.run || {};
      if ((run.skipped || []).includes(stepId)) return "skipped";
      const e = api._epicByStep(project, stepId);
      if (!e) return "pending";
      if (e.status === "CLOSED_DONE") return "done";
      if (e.status === "CLOSED_BLOCKED") return "blocked";
      if (e.status === "IN_DEV" || e.status === "IN_REVIEW") return "active";
      return "pending";
    },
    // recursive frontier: which steps are "current", and is a gate (branch decision) pending
    _frontier(flow, project) {
      for (const seg of (flow || [])) {
        if (seg.kind === "step") {
          const st = api.runStepStatus(project, seg.id);
          if (st === "done" || st === "skipped") continue;
          return { active: [seg.id], gate: null, done: false };
        }
        if (seg.kind === "branch") {
          const dec = (project.run && project.run.decisions) || {};
          const pathId = dec[seg.id];
          if (!pathId) return { active: [], gate: { type: "branch", id: seg.id }, done: false };
          const path = seg.paths.find((p) => p.id === pathId);
          const sub = api._frontier(path ? path.flow : [], project);
          if (!sub.done) return sub;
          continue;
        }
        if (seg.kind === "parallel") {
          const subs = seg.lanes.map((l) => api._frontier(l.flow, project));
          if (subs.every((s) => s.done)) continue;
          const active = subs.flatMap((s) => s.active);
          const gate = subs.map((s) => s.gate).find(Boolean) || null;
          return { active, gate, done: false };
        }
        // loop: nem előre-kapu, kézi trigger
      }
      return { active: [], gate: null, done: true };
    },
    _orderedStepIds(flow, project, acc) {
      acc = acc || [];
      (flow || []).forEach((seg) => {
        if (seg.kind === "step") acc.push(seg.id);
        else if (seg.kind === "branch") {
          const dec = (project.run && project.run.decisions) || {};
          const path = seg.paths.find((p) => p.id === dec[seg.id]);
          if (path) api._orderedStepIds(path.flow, project, acc);
        } else if (seg.kind === "parallel") seg.lanes.forEach((l) => api._orderedStepIds(l.flow, project, acc));
      });
      return acc;
    },
    runView(projectId) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      const proc = p ? api.findProcess(p.processId) : null;
      if (!p || !proc) return null;
      const fr = api._frontier(proc.flow, p);
      const ord = api._orderedStepIds(proc.flow, p);
      const total = ord.length;
      const done = ord.filter((id) => api.runStepStatus(p, id) === "done").length;
      return { project: p, proc, frontier: fr.active, gate: fr.gate, complete: fr.done, total, done, pct: total ? Math.round(done / total * 100) : 0, run: p.run || {} };
    },
    // activate frontier steps (BACKLOG_READY → IN_DEV) in one immutable pass
    _runReflow(projectId) {
      const p = state.projects.find((x) => x.id === projectId);
      const proc = p ? api.findProcess(p.processId) : null;
      if (!p || !proc) return;
      const fr = api._frontier(proc.flow, p);
      const activate = new Set(fr.active);
      if (!activate.size) return;
      const mapE = (e) => (activate.has(e.processStepId) && e.status === "BACKLOG_READY") ? { ...e, status: "IN_DEV" } : e;
      set((s) => ({ projects: s.projects.map((pr) => pr.id !== projectId ? pr : ({
        ...pr,
        milestones: (pr.milestones || []).map((m) => ({ ...m, epics: (m.epics || []).map(mapE), subMilestones: (m.subMilestones || []).map((sm) => ({ ...sm, epics: (sm.epics || []).map(mapE) })) })),
      })) }));
    },
    _runLog(projectId, text, kind) {
      set((s) => ({ projects: s.projects.map((pr) => pr.id !== projectId ? pr : ({ ...pr, run: { ...(pr.run || {}), log: [{ ts: nowStamp(), text, kind: kind || "info" }, ...((pr.run || {}).log || [])].slice(0, 40) } })) }));
    },
    startRun(projectId) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      if (!p || !p.processId) return;
      set((s) => ({ projects: s.projects.map((pr) => pr.id !== projectId ? pr : ({ ...pr, run: { started: true, decisions: (pr.run && pr.run.decisions) || {}, loops: (pr.run && pr.run.loops) || {}, skipped: (pr.run && pr.run.skipped) || [], log: (pr.run && pr.run.log) || [] } })) }));
      api._runReflow(projectId);
      api._runLog(projectId, "Folyamat-futás elindítva.", "start");
      emit();
      if (window.toast) window.toast("▶ Folyamat elindítva", "success");
    },
    runnerCompleteStep(projectId, stepId) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      const e = p ? api._epicByStep(p, stepId) : null;
      if (!p || !e) return;
      // a futtató autoritatív: a lépést késznek jelöli (taskök is), majd reflow
      set(api._mapEpic(projectId, e.id, (ep) => ({ ...ep, status: "CLOSED_DONE", tasks: (ep.tasks || []).map((t) => ({ ...t, done: true })) })));
      api._runLog(projectId, `„${e.title}” lépés kész.`, "done");
      api._runReflow(projectId);
      // ha a folyamat befejeződött
      const fr2 = api._frontier(api.findProcess(p.processId).flow, state.projects.find((x) => x.id === projectId));
      if (fr2.done) { api._runLog(projectId, "A folyamat minden lépése elkészült. 🎉", "finish"); if (window.toast) window.toast("🎉 Folyamat befejezve", "success"); }
      else if (window.toast) window.toast("✓ Lépés kész — következő aktiválva", "success");
      postSystem(`⚙️ ${p.name}: „${e.title}” lépés kész a folyamatban.`, "ch-prod");
      emit();
    },
    runnerDecideBranch(projectId, branchId, pathId) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      const proc = p ? api.findProcess(p.processId) : null;
      if (!p || !proc) return;
      // a NEM választott ágak lépései → skipped
      let branch = null;
      const findB = (flow) => (flow || []).forEach((seg) => {
        if (seg.id === branchId) branch = seg;
        if (seg.kind === "branch") seg.paths.forEach((pp) => findB(pp.flow));
        if (seg.kind === "parallel") seg.lanes.forEach((l) => findB(l.flow));
      });
      findB(proc.flow);
      const skip = [];
      if (branch) branch.paths.filter((pp) => pp.id !== pathId).forEach((pp) => api._orderedStepIds(pp.flow, { run: { decisions: {} } }, skip));
      const chosen = branch ? branch.paths.find((pp) => pp.id === pathId) : null;
      set((s) => ({ projects: s.projects.map((pr) => pr.id !== projectId ? pr : ({ ...pr, run: { ...(pr.run || {}), decisions: { ...((pr.run || {}).decisions || {}), [branchId]: pathId }, skipped: [...new Set([...(((pr.run || {}).skipped) || []), ...skip])] } })) }));
      api._runReflow(projectId);
      api._runLog(projectId, `Döntés: „${branch ? branch.prompt : "elágazás"}” → ${chosen ? chosen.label : ""}.`, "decision");
      postSystem(`🔀 ${p.name}: elágazás döntés — ${chosen ? chosen.label : ""}.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Ág kiválasztva: ${chosen ? chosen.label : ""}`, "success");
    },
    runnerTriggerLoop(projectId, loopId) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      const proc = p ? api.findProcess(p.processId) : null;
      if (!p || !proc) return;
      let loop = null;
      const findL = (flow) => (flow || []).forEach((seg) => { if (seg.id === loopId) loop = seg; if (seg.kind === "branch") seg.paths.forEach((pp) => findL(pp.flow)); if (seg.kind === "parallel") seg.lanes.forEach((l) => findL(l.flow)); });
      findL(proc.flow);
      if (!loop || !loop.targetId) { if (window.toast) window.toast("A ciklusnak nincs cél-lépése.", "error"); return; }
      const ord = api._orderedStepIds(proc.flow, p);
      const ti = ord.indexOf(loop.targetId);
      if (ti < 0) return;
      const resetIds = new Set(ord.slice(ti)); // cél + utána lévők
      const mapE = (e) => (resetIds.has(e.processStepId)) ? { ...e, status: "BACKLOG_READY", tasks: (e.tasks || []).map((t) => ({ ...t, done: false })) } : e;
      const cnt = ((p.run && p.run.loops && p.run.loops[loopId]) || 0) + 1;
      set((s) => ({ projects: s.projects.map((pr) => pr.id !== projectId ? pr : ({
        ...pr,
        run: { ...(pr.run || {}), loops: { ...((pr.run || {}).loops || {}), [loopId]: cnt } },
        milestones: (pr.milestones || []).map((m) => ({ ...m, epics: (m.epics || []).map(mapE), subMilestones: (m.subMilestones || []).map((sm) => ({ ...sm, epics: (sm.epics || []).map(mapE) })) })),
      })) }));
      api._runReflow(projectId);
      const tgt = ord[ti];
      const tgtEpic = api._epicByStep(state.projects.find((x) => x.id === projectId), tgt);
      api._runLog(projectId, `Visszacsatolás (#${cnt}): „${loop.label}” → vissza „${tgtEpic ? tgtEpic.title : ""}” lépésre.`, "loop");
      postSystem(`🔁 ${p.name}: visszaléptetés — ${loop.label}.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`🔁 Visszaléptetve (${cnt}.)`, "info");
    },
    resetRun(projectId) {
      ensure();
      const p = state.projects.find((x) => x.id === projectId);
      if (!p) return;
      const mapE = (e) => e.processStepId ? { ...e, status: "BACKLOG_READY", tasks: (e.tasks || []).map((t) => ({ ...t, done: false })) } : e;
      set((s) => ({ projects: s.projects.map((pr) => pr.id !== projectId ? pr : ({
        ...pr, run: { started: false, decisions: {}, loops: {}, skipped: [], log: [] },
        milestones: (pr.milestones || []).map((m) => ({ ...m, epics: (m.epics || []).map(mapE), subMilestones: (m.subMilestones || []).map((sm) => ({ ...sm, epics: (sm.epics || []).map(mapE) })) })),
      })) }));
      emit();
      if (window.toast) window.toast("Futás visszaállítva", "info");
    },


    askAbout(entity, suggestConvo) {
      ensure();
      const cid = suggestConvo || (entity.type === "material" || entity.type === "po" ? "ch-beszerzes" : "ch-prod");
      set((s) => ({ hub: { ...s.hub, open: true, tab: "team", view: "thread", activeId: cid, draft: entity },
        convos: s.convos.map((c) => (c.id === cid ? { ...c, unread: 0 } : c)) }));
    },

    // ── PÉNZÜGY (Finance) — kimenő/bejövő számlák + kifizetések ─────────────────
    finInvoiceById(id) { ensure(); return (state.finInvoices || []).find((x) => x.id === id) || null; },
    finPaymentsFor(invoiceId) { ensure(); return (state.finPayments || []).filter((p) => p.invoiceId === invoiceId); },
    finPaidSum(invoiceId) { ensure(); return (state.finPayments || []).filter((p) => p.invoiceId === invoiceId).reduce((a, p) => a + (Number(p.amount) || 0), 0); },
    finBalance(inv) { if (!inv) return 0; const g = finGross(inv) - api.finPaidSum(inv.id); return g < 0.01 ? 0 : g; },
    finIsOverdue(inv) {
      if (!inv || inv.status === "paid" || inv.status === "void" || inv.status === "draft") return false;
      return !!inv.dueDate && inv.dueDate < today && api.finBalance(inv) > 0.01;
    },
    // Megjelenítendő státusz: a tárolt FSM-állapot, de a számított „overdue" felülírja a nyitottakat.
    finEffectiveStatus(inv) {
      if (!inv) return "draft";
      if (inv.status === "void" || inv.status === "paid" || inv.status === "draft") return inv.status;
      return api.finIsOverdue(inv) ? "overdue" : inv.status;
    },

    createInvoiceFromOrder(orderId, opts = {}) {
      ensure();
      if (!api.hasPerm("finance.manage")) { if (window.toast) window.toast("Nincs jogosultság számla kiállításához (finance.manage).", "error"); return false; }
      const o = (state.orders || []).find((x) => x.id === orderId);
      if (!o) { if (window.toast) window.toast("Rendelés nem található.", "error"); return false; }
      const kind = opts.kind === "advance" ? "advance" : opts.kind === "proforma" ? "proforma" : "normal";
      const seq = state.finSeq || 44;
      const id = (kind === "proforma" ? "DB-2426-" : "SZ-2426-") + String(seq).padStart(4, "0");
      const addDays = (d, n) => { const dt = new Date(d + "T00:00:00"); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };
      let lines;
      if (kind === "advance") {
        const pct = Number(opts.advancePct) || 30;
        const base = Math.round((o.total || 0) * (pct / 100) / 1.27);
        lines = [{ name: `Gyártási előleg (${pct}%) — ${o.id}`, qty: 1, unit: "alk.", unitPrice: base, vat: 27 }];
      } else if (o.lines && o.lines.length) {
        lines = o.lines.map((l) => ({ name: l.name, qty: l.qty, unit: l.unit, unitPrice: l.price, vat: 27 }));
      } else {
        lines = [{ name: `${o.id} teljesítés — ${o.customer}`, qty: 1, unit: "alk.", unitPrice: Math.round((o.total || 0) / 1.27), vat: 27 }];
      }
      const inv = { id, dir: "out", kind, party: o.customer, orderRef: o.id, status: "draft",
        issueDate: today, dueDate: addDays(today, 14), currency: "HUF",
        issuer: (api.currentAccount().contact || "Pénzügy").split("·")[0].trim(), lines };
      set((s) => ({ finInvoices: [inv, ...s.finInvoices], finSeq: seq + 1 }));
      postSystem(`🧾 Új ${(typeof FIN_KIND_META !== "undefined" ? FIN_KIND_META[kind].label : kind).toLowerCase()} piszkozat: ${id} — ${o.customer} (${o.id}).`);
      emit();
      return id;
    },

    issueInvoice(id) {
      ensure();
      if (!api.hasPerm("finance.manage")) { if (window.toast) window.toast("Nincs jogosultság (finance.manage).", "error"); return false; }
      const inv = api.finInvoiceById(id);
      if (!inv || inv.status !== "draft") return false;
      set((s) => ({ finInvoices: s.finInvoices.map((x) => x.id === id ? { ...x, status: "issued", issueDate: x.issueDate || today } : x) }));
      postSystem(`🧾 Számla kiállítva: ${inv.id} — ${inv.party}.`, inv.dir === "out" ? "ch-prod" : "ch-beszerzes");
      emit();
      return true;
    },

    voidInvoice(id, reason) {
      ensure();
      if (!api.hasPerm("finance.manage")) { if (window.toast) window.toast("Nincs jogosultság (finance.manage).", "error"); return false; }
      const inv = api.finInvoiceById(id);
      if (!inv) return false;
      if (inv.status === "paid") { if (window.toast) window.toast("Fizetett számla nem sztornózható.", "warning"); return false; }
      if (!(reason && reason.trim())) { if (window.toast) window.toast("Sztornóhoz indok kötelező.", "warning"); return false; }
      set((s) => ({ finInvoices: s.finInvoices.map((x) => x.id === id ? { ...x, status: "void", voidReason: reason.trim() } : x) }));
      postSystem(`🚫 Számla sztornózva: ${inv.id} — ${reason.trim()}`, inv.dir === "out" ? "ch-prod" : "ch-beszerzes");
      emit();
      return true;
    },

    addPayment(invoiceId, opts = {}) {
      ensure();
      if (!api.hasPerm("finance.manage")) { if (window.toast) window.toast("Nincs jogosultság kifizetés rögzítéséhez (finance.manage).", "error"); return false; }
      const inv = api.finInvoiceById(invoiceId);
      if (!inv) return false;
      if (inv.status === "draft") { if (window.toast) window.toast("Előbb állítsd ki a számlát.", "warning"); return false; }
      if (inv.status === "void") { if (window.toast) window.toast("Sztornózott számlára nem rögzíthető fizetés.", "warning"); return false; }
      const amt = Math.round((Number(opts.amount) || 0) * 100) / 100;
      if (amt <= 0) { if (window.toast) window.toast("Adj meg pozitív összeget.", "warning"); return false; }
      const bal = api.finBalance(inv);
      if (amt > bal + 0.01) { if (window.toast) window.toast("Az összeg meghaladja a hátralékot.", "warning"); return false; }
      const seq = state.finPmtSeq || 1;
      const pmt = { id: "PMT-" + String(seq).padStart(4, "0"), invoiceId, amount: amt,
        method: opts.method || "bank", date: opts.date || today, ref: (opts.ref || "").trim(), who: "Pénzügy", note: (opts.note || "").trim() };
      const newPaid = api.finPaidSum(invoiceId) + amt;
      const newStatus = newPaid >= finGross(inv) - 0.01 ? "paid" : "partial";
      set((s) => ({
        finPayments: [pmt, ...s.finPayments],
        finInvoices: s.finInvoices.map((x) => x.id === invoiceId ? { ...x, status: newStatus } : x),
        finPmtSeq: seq + 1,
      }));
      const word = inv.dir === "out" ? "Befizetés" : "Kifizetés";
      postSystem(`💰 ${inv.id}: ${word} rögzítve. Új státusz: ${(typeof FIN_INV_TONE !== "undefined" ? FIN_INV_TONE[newStatus].label : newStatus)}.`, inv.dir === "out" ? "ch-prod" : "ch-beszerzes");
      emit();
      return pmt.id;
    },

    // ── ÜGYFÉL-PORTÁL — pénzügy + látható mérföldkövek (B2C / végfelhasználó) ──
    //   A vevő a saját portálján látja a számláit, fizetési kötelezettségeit, az
    //   ütemezett (mérföldkő) fizetéseket, és szimuláltan fizethet. A láthatóságot
    //   a cég adja: a projekt `customerMilestones[]` a cég által KURÁLT, ügyfél-
    //   látható haladás (belső részletek nélkül). EGY igazságforrás (finInvoices /
    //   contracts / projects) — nincs duplikáció.
    customerInvoices(name) {
      ensure();
      const n = name || (api.currentAccount() || {}).name;
      return (state.finInvoices || []).filter((v) => v.dir === "out" && v.party === n && v.status !== "void")
        .sort((a, b) => (b.issueDate || "").localeCompare(a.issueDate || ""));
    },
    contractsForCustomer(name) {
      ensure();
      const n = name || (api.currentAccount() || {}).name;
      return (state.contracts || []).filter((c) => c.customer === n);
    },
    customerFinanceSummary(name) {
      ensure();
      const n = name || (api.currentAccount() || {}).name;
      const invs = api.customerInvoices(n);
      let outstanding = 0, overdue = 0, paidTotal = 0, nextDue = null;
      invs.forEach((i) => {
        const bal = finToHuf(api.finBalance(i), i);
        paidTotal += finToHuf(api.finPaidSum(i.id), i);
        if (i.status === "paid") return;
        if (bal > 0.01 && (i.status === "issued" || i.status === "partial")) {
          outstanding += bal;
          if (api.finIsOverdue(i)) overdue += bal;
          if (i.dueDate && (!nextDue || i.dueDate < nextDue.dueDate)) nextDue = { id: i.id, dueDate: i.dueDate, balance: bal };
        }
      });
      return { outstanding, overdue, paidTotal, nextDue, count: invs.length };
    },
    // Szimulált ügyfél-fizetés — PERM-MENTES (a vevő a saját portálján fizet).
    // A meglévő finPayments-be ír (egy igazságforrás); a teljes hátralékot rendezi.
    customerPayInvoice(invoiceId, opts = {}) {
      ensure();
      const inv = api.finInvoiceById(invoiceId);
      if (!inv) return false;
      if (inv.dir !== "out") { if (window.toast) window.toast("Csak vevői számla fizethető itt.", "warning"); return false; }
      if (inv.status === "draft") { if (window.toast) window.toast("A számla még nincs kiállítva.", "warning"); return false; }
      if (inv.status === "void") return false;
      const bal = api.finBalance(inv);
      if (bal <= 0.01) { if (window.toast) window.toast("Ez a számla már rendezve van.", "info"); return false; }
      const seq = state.finPmtSeq || 1;
      const pmt = { id: "PMT-" + String(seq).padStart(4, "0"), invoiceId, amount: bal,
        method: opts.method || "card", date: today, ref: "ONLINE-" + Date.now().toString(36).toUpperCase().slice(-6),
        who: inv.party, note: "Ügyfél online fizetés (portál)" };
      set((s) => ({
        finPayments: [pmt, ...s.finPayments],
        finInvoices: s.finInvoices.map((x) => x.id === invoiceId ? { ...x, status: "paid" } : x),
        finPmtSeq: seq + 1,
      }));
      postSystem(`💳 ${inv.id}: ${inv.party} online fizetést teljesített (${Math.round(bal).toLocaleString("hu-HU")} Ft) a portálon.`, "ch-prod");
      emit();
      if (window.toast) window.toast("Köszönjük! A fizetést rögzítettük.", "success");
      return pmt.id;
    },
    // Ügyfél-látható mérföldkövek (a cég kurálja a Projektek világban)
    customerMilestones(projectId) {
      ensure();
      const p = (state.projects || []).find((x) => x.id === projectId);
      return (p && p.customerMilestones) || [];
    },
    projectsForCustomer(name) {
      ensure();
      const n = name || (api.currentAccount() || {}).name;
      return (state.projects || []).filter((p) => p.customer === n);
    },
    addCustomerMilestone(projectId, label) {
      ensure();
      const lbl = (label || "").trim(); if (!lbl) return;
      const ms = { id: "cm" + Date.now().toString(36), label: lbl, done: false, doneAt: null };
      set((s) => ({ projects: s.projects.map((p) => p.id === projectId ? { ...p, customerMilestones: [...(p.customerMilestones || []), ms] } : p) }));
      emit();
    },
    toggleCustomerMilestone(projectId, msId) {
      ensure();
      set((s) => ({ projects: s.projects.map((p) => p.id !== projectId ? p : { ...p, customerMilestones: (p.customerMilestones || []).map((m) => m.id === msId ? { ...m, done: !m.done, doneAt: !m.done ? today : null } : m) }) }));
      emit();
    },
    removeCustomerMilestone(projectId, msId) {
      ensure();
      set((s) => ({ projects: s.projects.map((p) => p.id !== projectId ? p : { ...p, customerMilestones: (p.customerMilestones || []).filter((m) => m.id !== msId) }) }));
      emit();
    },

    // ── ÜGYFÉL PROJEKT-BETEKINTŐ (4.14) — vevő-látható, JÓVÁHAGYOTT/KIADOTT elemek ──
    //   Aggregátor a vevő-portál projekt-detail nézetéhez. EGY igazságforrás
    //   (projects / briefs / quotes / orders / documents / concepts) — nincs
    //   duplikáció, csak vevő-szűrt vetület. Láthatóság: csak elfogadott brief
    //   (minimumReady) · kiküldött/elfogadott ajánlat · nem-draft rendelés ·
    //   KIADOTT dokumentum · review/approved koncepció. A piszkozatok rejtve.
    conceptForProject(projectId) {
      ensure();
      return (state.concepts || []).find((c) => c.projectRef === projectId) || null;
    },
    customerProjectDossier(projectId, name) {
      ensure();
      const p = (state.projects || []).find((x) => x.id === projectId);
      if (!p) return null;
      const cust = name || p.customer;
      if (p.customer !== cust) return null; // scope-guard: csak a saját projektje
      const E = window.BriefEngine;
      // BRIEFEK — projekthez kötött, elfogadott (a tervezés-indítás minimuma megvan)
      const briefs = (state.briefs || []).filter((b) => b.projectId === projectId && (!E || E.minimumReady(b)));
      // AJÁNLATOK — projekthez, kiküldve/elfogadva (piszkozat rejtve)
      const quotes = (state.quotes || []).filter((q) => q.projectRef === projectId && ["sent", "approved", "converted"].includes(q.status));
      // RENDELÉSEK — projekthez, nem piszkozat
      const orders = (state.orders || []).filter((o) => o.projectId === projectId && o.status !== "draft");
      const orderIds = orders.map((o) => o.id);
      // DOKUMENTUMOK — KIADOTT, a projekthez VAGY a rendeléseihez kötve
      const docs = (state.documents || []).filter((d) => d.status === "kiadott" &&
        ((d.linkType === "project" && d.linkId === projectId) || (d.linkType === "order" && orderIds.includes(d.linkId))));
      // KONCEPCIÓ (látványterv) — review/approved (piszkozat rejtve)
      const concept = (state.concepts || []).find((c) => c.projectRef === projectId && ["review", "approved"].includes(c.status)) || null;
      return { project: p, milestones: p.customerMilestones || [], briefs, quotes, orders, docs, concept };
    },

    // Áttekintő összesítők (EUR → HUF a fxRate-tel)
    finStats() {
      ensure();
      const invs = (state.finInvoices || []).filter((i) => i.status !== "void");
      let receivable = 0, receivableOverdue = 0, payable = 0, payableOverdue = 0, draftCount = 0;
      invs.forEach((i) => {
        if (i.status === "draft") { if (i.dir === "out") draftCount++; return; }
        const balHuf = finToHuf(api.finBalance(i), i);
        if (i.dir === "out") { receivable += balHuf; if (api.finIsOverdue(i)) receivableOverdue += balHuf; }
        else { payable += balHuf; if (api.finIsOverdue(i)) payableOverdue += balHuf; }
      });
      let cashIn = 0, cashOut = 0;
      (state.finPayments || []).forEach((p) => {
        const inv = (state.finInvoices || []).find((x) => x.id === p.invoiceId);
        if (!inv) return;
        const huf = finToHuf(p.amount, inv);
        if (String(p.date).slice(0, 7) === today.slice(0, 7)) { if (inv.dir === "out") cashIn += huf; else cashOut += huf; }
      });
      return { receivable, receivableOverdue, payable, payableOverdue, cashIn, cashOut, net: cashIn - cashOut, draftCount,
        outCount: invs.filter((i) => i.dir === "out").length, inCount: invs.filter((i) => i.dir === "in").length };
    },

    // ── LOGISZTIKA — fuvar (kiszállítás / beszállítás / felmérés) ──────────────
    // A státusz a fuvar-tételen él; az átmenet validált FSM (LogEngine). A fuvar
    // belépési pontjai: rendelés (ready/delivered), projekt (install), raktár-zóna
    // (commissioned/shippable), beszerzési PO (saját beszállítás), vagy kézzel.
    shipmentList() { ensure(); return state.shipments || []; },
    findShipment(id) { ensure(); return (state.shipments || []).find((x) => x.id === id); },
    vehicleList() { ensure(); return state.vehicles || []; },
    crewList() { ensure(); return state.crews || []; },
    findVehicle(id) { ensure(); return (state.vehicles || []).find((x) => x.id === id); },
    findCrew(id) { ensure(); return (state.crews || []).find((x) => x.id === id); },
    shipmentConflictSet() { ensure(); return (window.LogEngine ? window.LogEngine.conflictIdSet(state.shipments || []) : {}); },
    shipmentConflicts() { ensure(); return (window.LogEngine ? window.LogEngine.conflicts(state.shipments || []) : []); },
    shipmentsForDate(date) { ensure(); return (state.shipments || []).filter((s) => s.date === date); },
    shipmentForRef(ref) { ensure(); return (state.shipments || []).find((s) => s.ref === ref); },

    _nextShipId() {
      const seq = (state.shipSeq || 0) + 1;
      return { id: `SH-2426-${String(seq).padStart(3, "0")}`, seq };
    },
    _custAddress(name) {
      const c = (state.customers || []).find((x) => x.name === name);
      return c ? `${c.city || ""}` : "";
    },

    createShipment(data) {
      ensure();
      const { id, seq } = api._nextShipId();
      const sh = {
        id, type: data.type || "delivery", status: "tervezett",
        install: data.type === "delivery" ? (data.install !== false) : false,
        customer: data.customer || "", address: data.address || "", contact: data.contact || "", phone: data.phone || "",
        date: data.date || "", windowStart: data.windowStart || "", windowEnd: data.windowEnd || "",
        vehicleId: data.vehicleId || null, crewId: data.crewId || null,
        ref: data.ref || "", refLabel: data.refLabel || "", loadM3: data.loadM3 || 0, loadKg: data.loadKg || 0,
        note: data.note || "",
        handover: { signedBy: "", signedAt: "", photos: 0, deficiencies: [], protocol: false },
        log: [{ at: nowStamp(), text: "Fuvar létrehozva (tervezett)" }],
      };
      set((s) => ({ shipments: [sh, ...(s.shipments || [])], shipSeq: seq }));
      const tl = (window.LOG_TYPE_META && window.LOG_TYPE_META[sh.type] || {}).label || sh.type;
      postSystem(`🚚 Új fuvar (${id}) — ${tl}: ${sh.customer}${sh.refLabel ? ` · ${sh.refLabel}` : ""}.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Fuvar létrehozva — ${id}`, "success");
      return id;
    },

    createDeliveryFromOrder(orderId, opts = {}) {
      ensure();
      const o = (state.orders || []).find((x) => x.id === orderId);
      if (!o) { if (window.toast) window.toast("Rendelés nem található.", "error"); return; }
      return api.createShipment({
        type: "delivery", install: opts.install !== false,
        customer: o.customer, address: api._custAddress(o.customer),
        ref: o.id, refLabel: `${o.customer} — ${o.title || o.product || "rendelés"}`,
        note: opts.note || "",
      });
    },

    createDeliveryFromProject(projectId) {
      ensure();
      const p = (state.projects || []).find((x) => x.id === projectId);
      if (!p) { if (window.toast) window.toast("Projekt nem található.", "error"); return; }
      return api.createShipment({
        type: "delivery", install: true,
        customer: p.customer, address: api._custAddress(p.customer),
        date: p.installTarget || "",
        ref: p.id, refLabel: `${p.name} — beépítés`,
        note: "Projekt-beépítés — szakág-koordinációval.",
      });
    },

    createPickupFromPO(poId) {
      ensure();
      const po = (state.pos || []).find((x) => x.id === poId);
      if (!po) { if (window.toast) window.toast("Megrendelés nem található.", "error"); return; }
      return api.createShipment({
        type: "pickup",
        customer: po.supplier, address: "",
        ref: po.id, refLabel: `${po.material || ""}${po.qty ? ` — ${po.qty} db` : ""}`,
        note: "Saját fuvar a beszállítóhoz.",
      });
    },

    scheduleShipment(id, patch) {
      ensure();
      const sh = (state.shipments || []).find((x) => x.id === id);
      if (!sh) return;
      const next = { ...sh };
      ["date", "windowStart", "windowEnd", "vehicleId", "crewId"].forEach((k) => { if (patch[k] !== undefined) next[k] = patch[k]; });
      set((s) => ({ shipments: s.shipments.map((x) => (x.id === id ? next : x)) }));
      emit();
      if (window.toast) window.toast("✓ Ütemezés frissítve", "success");
    },

    setShipmentStatus(id, to, opts = {}) {
      ensure();
      const sh = (state.shipments || []).find((x) => x.id === id);
      if (!sh) return false;
      if (!(window.LogEngine && window.LogEngine.canGo(sh, to))) {
        if (window.toast) window.toast("Nem engedélyezett átmenet.", "error");
        return false;
      }
      if (to === "reklamacio" && !(opts.reason && opts.reason.trim())) {
        if (window.toast) window.toast("Reklamációhoz indoklás kötelező.", "warning");
        return false;
      }
      const lbl = (window.LOG_STATUS && window.LOG_STATUS[to] || {}).label || to;
      const log = [...(sh.log || []), { at: nowStamp(), text: `Státusz → ${lbl}${opts.reason ? ` (${opts.reason.trim()})` : ""}` }];
      set((s) => ({ shipments: s.shipments.map((x) => (x.id === id ? { ...x, status: to, log } : x)) }));
      // Átgyűrűzés: kiszállítás átadva → a rendelés delivered (+ számlázható jelzés a Pénzügynek)
      if (to === "atadva" && sh.ref) {
        const ord = (state.orders || []).find((x) => x.id === sh.ref);
        if (ord && ord.status !== "delivered") {
          set((s) => ({ orders: s.orders.map((x) => (x.id === sh.ref ? { ...x, status: "delivered" } : x)) }));
          const hasInv = (state.finInvoices || []).some((v) => v.dir === "out" && v.orderRef === sh.ref && v.status !== "void");
          postSystem(`📦 ${sh.ref} kiszállítva és átadva (${id}) — ${sh.customer}.${hasInv ? "" : " Számlázható — piszkozat indítható a fuvarból vagy a Pénzügyben."}`, "ch-prod");
        }
      }
      if (to === "beerkezett") postSystem(`📥 Beszállítás beérkezett (${id}) — ${sh.customer}${sh.ref ? ` · ${sh.ref}` : ""}. Bevételezhető a Raktárban.`, "ch-beszerzes");
      else postSystem(`🚚 ${id} — ${lbl}.`, "ch-prod");
      emit();
      // Reklamáció-ág → automatikus szerviz-jegy (a Reklamáció világba)
      if (to === "reklamacio" && api.createTicketFromShipment) {
        const tid = api.createTicketFromShipment(id, { reason: opts.reason });
        if (tid) set((s) => ({ shipments: s.shipments.map((x) => (x.id === id ? { ...x, ticketId: tid } : x)) }));
      }
      if (window.toast) window.toast(`✓ ${id} → ${lbl}`, "success");
      return true;
    },

    setShipmentHandover(id, patch) {
      ensure();
      set((s) => ({ shipments: s.shipments.map((x) => (x.id === id ? { ...x, handover: { ...x.handover, ...patch } } : x)) }));
      emit();
    },
    addShipmentDefect(id, defect) {
      ensure();
      set((s) => ({ shipments: s.shipments.map((x) => (x.id === id ? { ...x, handover: { ...x.handover, deficiencies: [...(x.handover.deficiencies || []), { text: defect.text, sev: defect.sev || "minor" }] } } : x)) }));
      emit();
    },
    removeShipmentDefect(id, idx) {
      ensure();
      set((s) => ({ shipments: s.shipments.map((x) => (x.id === id ? { ...x, handover: { ...x.handover, deficiencies: (x.handover.deficiencies || []).filter((_, i) => i !== idx) } } : x)) }));
      emit();
    },
    generateHandoverProtocol(id) {
      ensure();
      const sh = (state.shipments || []).find((x) => x.id === id);
      if (!sh) return;
      set((s) => ({ shipments: s.shipments.map((x) => (x.id === id ? { ...x, handover: { ...x.handover, protocol: true } } : x)) }));
      postSystem(`📄 Átadási jegyzőkönyv elkészült (${id}) — ${sh.customer}.`, "ch-prod");
      emit();
      if (window.toast) window.toast("✓ Átadási jegyzőkönyv elkészült", "success");
    },

    // B2BHandshake — fuvar kiadása platform-partnernek (fuvarpartner / szerelőbrigád)
    delegateShipment(id, partnerId) {
      ensure();
      const sh = (state.shipments || []).find((x) => x.id === id);
      const partner = (state.partners || []).find((x) => x.id === partnerId);
      if (!sh || !partner) return;
      const hid = `HS-${id}`;
      const tl = (window.LOG_TYPE_META && window.LOG_TYPE_META[sh.type] || {}).label || sh.type;
      const hs = { id: hid, kind: "transport", shipmentId: id, projectName: `${sh.customer} — ${tl.toLowerCase()}`,
        epicTitle: `${tl} — ${sh.refLabel || sh.customer}`, fromCompany: "JoineryTech (belső)",
        partnerId, partnerName: partner.name, status: partner.platform ? "sent" : "external", external: !partner.platform, note: sh.note || "", ts: nowStamp() };
      const log = [...(sh.log || []), { at: nowStamp(), text: `Kiadva: ${partner.name} (${partner.platform ? "kézfogás elküldve" : "platformon kívül"})` }];
      set((s) => ({
        handshakes: [hs, ...(s.handshakes || [])],
        shipments: s.shipments.map((x) => (x.id === id ? { ...x, handshakeId: hid, delegatedTo: partner.name, delegatedExternal: !partner.platform, log } : x)),
      }));
      postSystem(partner.platform
        ? `🤝 Fuvar kiadva (${id}) → ${partner.name} (kézfogás elküldve).`
        : `🔗 Fuvar külső partnerhez rendelve (${id}): ${partner.name} (platformon kívül).`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Fuvar kiadva — ${partner.name}`, "success");
    },
    recallShipment(id) {
      ensure();
      const sh = (state.shipments || []).find((x) => x.id === id);
      if (!sh) return;
      set((s) => ({
        handshakes: (s.handshakes || []).filter((h) => h.id !== sh.handshakeId),
        shipments: s.shipments.map((x) => (x.id === id ? { ...x, handshakeId: null, delegatedTo: null, delegatedExternal: false, log: [...(x.log || []), { at: nowStamp(), text: "Kiadás visszavonva — saját fuvar" }] } : x)),
      }));
      emit();
      if (window.toast) window.toast("✓ Kiadás visszavonva", "success");
    },

    // Járművek / brigádok CRUD
    addVehicle(data) { ensure(); const id = "veh-" + Date.now().toString(36); set((s) => ({ vehicles: [...(s.vehicles || []), { id, ...data }] })); emit(); return id; },
    updateVehicle(id, patch) { ensure(); set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)) })); emit(); },
    removeVehicle(id) { ensure(); set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) })); emit(); },
    addCrew(data) { ensure(); const id = "crew-" + Date.now().toString(36); set((s) => ({ crews: [...(s.crews || []), { id, ...data }] })); emit(); return id; },
    updateCrew(id, patch) { ensure(); set((s) => ({ crews: s.crews.map((c) => (c.id === id ? { ...c, ...patch } : c)) })); emit(); },
    removeCrew(id) { ensure(); set((s) => ({ crews: s.crews.filter((c) => c.id !== id) })); emit(); },

    // ── KONTROLLING — projekt-jövedelmezőség, terv vs. tény (SZÁMÍTOTT) ────────
    // Auto-aggregálás a meglévő adatokból + kézi korrekciós tételek (ctrlAdjustments).
    ctrlConfig() { ensure(); return { ...(window.CTRL_DEFAULTS || {}), ...(state.ctrlConfig || {}) }; },
    setCtrlConfig(patch) { ensure(); set((s) => ({ ctrlConfig: { ...(s.ctrlConfig || {}), ...patch } })); emit(); },
    ctrlAdjustmentsFor(projectId) { ensure(); return (state.ctrlAdjustments || []).filter((a) => a.scope === "project" && a.refId === projectId); },
    addCtrlAdjustment(data) {
      ensure();
      const seq = (state.ctrlAdjSeq || 0) + 1;
      const id = "adj-" + String(seq).padStart(3, "0");
      const a = { id, scope: data.scope || "project", refId: data.refId, category: data.category || "anyag",
        label: (data.label || "Korrekció").trim(), plan: Number(data.plan) || 0, actual: Number(data.actual) || 0, note: (data.note || "").trim() };
      set((s) => ({ ctrlAdjustments: [...(s.ctrlAdjustments || []), a], ctrlAdjSeq: seq }));
      emit();
      if (window.toast) window.toast("✓ Korrekciós tétel hozzáadva", "success");
      return id;
    },
    updateCtrlAdjustment(id, patch) { ensure(); set((s) => ({ ctrlAdjustments: (s.ctrlAdjustments || []).map((a) => a.id === id ? { ...a, ...patch } : a) })); emit(); },
    removeCtrlAdjustment(id) { ensure(); set((s) => ({ ctrlAdjustments: (s.ctrlAdjustments || []).filter((a) => a.id !== id) })); emit(); },

    // ── HR / MUNKAERŐ-KAPACITÁS ─────────────────────────────────────────────
    // A dolgozói törzs az egy igazságforrás; a Logisztika brigádjai erre mutatnak
    // (crew.memberIds). A kapacitás SZÁMÍTOTT (HrEngine), a távollét FSM-vezérelt.
    employeeList() { ensure(); return (state.employees || []).filter((e) => e.active !== false); },
    allEmployees() { ensure(); return state.employees || []; },
    findEmployee(id) { ensure(); return (state.employees || []).find((e) => e.id === id); },
    employeeName(id) { ensure(); const e = (state.employees || []).find((x) => x.id === id); return e ? e.name : id; },
    addEmployee(data) {
      ensure();
      if (!api.hasPerm("hr.manage")) { if (window.toast) window.toast("Nincs jogosultság dolgozó felvételéhez (hr.manage).", "error"); return null; }
      const seq = (state.hrSeq || 0) + 1;
      const initials = (data.name || "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      const e = { id: "emp-" + Date.now().toString(36), name: (data.name || "Új dolgozó").trim(), initials: data.initials || initials,
        role: data.role || "", dept: data.dept || "gyartas", facilityId: data.facilityId || "fac-vac",
        payGrade: data.payGrade || "szakmunkas", weeklyHours: Number(data.weeklyHours) || 40, employment: data.employment || "full",
        phone: data.phone || "", email: data.email || "", startedAt: data.startedAt || today, active: true,
        color: data.color || "#0d9488", skills: data.skills || [],
        personal: data.personal || (data.children != null ? { children: Number(data.children) || 0 } : {}) };
      if (data.vacationBase != null) e.vacationBase = Number(data.vacationBase);
      set((s) => ({ employees: [...(s.employees || []), e], hrSeq: seq }));
      emit();
      if (window.toast) window.toast("✓ Dolgozó felvéve", "success");
      return e.id;
    },
    updateEmployee(id, patch) {
      ensure();
      if (!api.hasPerm("hr.manage")) { if (window.toast) window.toast("Nincs jogosultság (hr.manage).", "error"); return; }
      set((s) => ({ employees: (s.employees || []).map((e) => e.id === id ? { ...e, ...patch } : e) })); emit();
    },
    // személyes / HR törzsadat (születési, okmány, családi, eltartottak) — érzékeny, joghoz kötött
    setEmployeePersonal(id, patch) {
      ensure();
      if (!api.hasPerm("hr.manage")) { if (window.toast) window.toast("Nincs jogosultság személyes adat módosításához (hr.manage).", "error"); return; }
      set((s) => ({ employees: (s.employees || []).map((e) => e.id === id ? { ...e, personal: { ...(e.personal || {}), ...patch } } : e) })); emit();
    },
    setEmployeeSkill(id, skillKey, level) {
      ensure();
      set((s) => ({ employees: (s.employees || []).map((e) => {
        if (e.id !== id) return e;
        let skills = (e.skills || []).slice();
        if (level === 0) skills = skills.filter((sk) => sk.key !== skillKey);
        else if (skills.find((sk) => sk.key === skillKey)) skills = skills.map((sk) => sk.key === skillKey ? { ...sk, level } : sk);
        else skills = [...skills, { key: skillKey, level }];
        return { ...e, skills };
      }) })); emit();
    },
    removeEmployee(id) {
      ensure();
      if (!api.hasPerm("hr.manage")) { if (window.toast) window.toast("Nincs jogosultság (hr.manage).", "error"); return; }
      set((s) => ({ employees: (s.employees || []).map((e) => e.id === id ? { ...e, active: false } : e) })); emit();
      if (window.toast) window.toast("Dolgozó archiválva", "success");
    },
    // a crew tagjai dolgozó-objektumként (memberIds → employees, fallback string)
    crewMembersResolved(crew) {
      ensure();
      if (!crew) return [];
      if (crew.memberIds && crew.memberIds.length) return crew.memberIds.map((mid) => (state.employees || []).find((e) => e.id === mid)).filter(Boolean);
      return (crew.members || []).map((nm) => ({ id: null, name: nm, initials: nm.replace(/[^A-ZÁÉÍÓÖŐÚÜŰ]/g, "").slice(0, 2) }));
    },

    // ── Kapacitás (számított) ───────────────────────────────────────────────
    hrDayLoad(empId, dateStr) { ensure(); return window.HrEngine ? window.HrEngine.dayLoad(state, empId, dateStr) : null; },
    hrWeekSummary(empId, mondayStr) { ensure(); return window.HrEngine ? window.HrEngine.weekSummary(state, empId, mondayStr) : null; },
    hrRate(emp) { return window.HrEngine ? window.HrEngine.rate(emp) : 0; },
    // ── Szabadság / betegszabadság egyenleg (számított; gyermek-pótszabadsággal) ──
    hrYear() { ensure(); return String(today).slice(0, 4); },
    hrVacationBalance(empId) { ensure(); const e = (state.employees || []).find((x) => x.id === empId); return window.HrEngine ? window.HrEngine.vacationBalance(state, e, api.hrYear()) : null; },
    hrSickBalance(empId) { ensure(); const e = (state.employees || []).find((x) => x.id === empId); return window.HrEngine ? window.HrEngine.sickBalance(state, e, api.hrYear()) : null; },
    // ── Jelenlét-modul → HR tény-jelenlét + bérköltség (a mai bejegyzésekből, AttEngine) ──
    // EZ a jelenlét első tényleges fogyasztója a HR-ben (korábban zsákutca volt).
    hrAttendanceToday() {
      ensure();
      const E = window.AttEngine; const day = today;
      const byId = {}; (state.employees || []).forEach((e) => { byId[e.id] = e; });
      const todays = (state.attendance || []).filter((e) => e.date === day);
      let nowMin = null; try { const d = new Date(); nowMin = d.getHours() * 60 + d.getMinutes(); } catch (e) {}
      let hours = 0, overtime = 0, cost = 0; const ids = new Set();
      todays.forEach((e) => {
        if (!E) return;
        const h = E.hours(e, nowMin); if (h != null) hours += h;
        overtime += E.overtime(e, nowMin) || 0;
        cost += E.cost(e, byId[e.empId], nowMin) || 0;
        ids.add(e.empId);
      });
      return { count: ids.size, hours: Math.round(hours * 10) / 10, overtime: Math.round(overtime * 10) / 10, cost: Math.round(cost), entries: todays.length };
    },
    // ki van ma bent / távol
    hrPresenceToday() {
      ensure();
      const E = window.HrEngine; if (!E) return { present: [], absent: [] };
      const present = [], absent = [];
      (state.employees || []).filter((e) => e.active !== false).forEach((e) => {
        const abs = E.absenceOn(state, e.id, today);
        if (abs) absent.push({ emp: e, absence: abs }); else present.push({ emp: e });
      });
      return { present, absent };
    },
    // túlterhelt (emp,nap) halmaz a következő N munkanapra — kulcs "empId|date"
    hrOverloadSet(days = 14) {
      ensure();
      const E = window.HrEngine; if (!E) return {};
      const set = {};
      const start = E.parse(today);
      (state.employees || []).filter((e) => e.active !== false).forEach((e) => {
        for (let i = 0; i < days; i++) {
          const ds = E.fmt(new Date(start.getTime() + i * 86400000));
          const d = E.dayLoad(state, e.id, ds);
          if (d.over) set[e.id + "|" + ds] = true;
        }
      });
      return set;
    },

    // ── Hozzárendelések (feladat-beosztás) ──────────────────────────────────
    assignmentsForEmployee(empId) { ensure(); return (state.assignments || []).filter((a) => a.empId === empId); },
    addAssignment(data) {
      ensure();
      const seq = (state.asgSeq || 0) + 1;
      const a = { id: "asg-" + Date.now().toString(36), empId: data.empId, projectId: data.projectId || null,
        projectName: data.projectName || "", label: (data.label || "Beosztás").trim(),
        start: data.start, end: data.end || data.start, hoursPerDay: Number(data.hoursPerDay) || 8, source: data.source || "project" };
      set((s) => ({ assignments: [...(s.assignments || []), a], asgSeq: seq })); emit();
      if (window.toast) window.toast("✓ Beosztás rögzítve", "success");
      return a.id;
    },
    removeAssignment(id) { ensure(); set((s) => ({ assignments: (s.assignments || []).filter((a) => a.id !== id) })); emit(); },

    // ── Távollét-kérelmek (FSM) ─────────────────────────────────────────────
    absenceList() { ensure(); return state.absences || []; },
    absencesForEmployee(empId) { ensure(); return (state.absences || []).filter((a) => a.empId === empId); },
    addAbsence(data) {
      ensure();
      const seq = (state.absSeq || 0) + 1;
      const id = "ABS-2426-" + String(seq).padStart(3, "0");
      const days = window.HrEngine ? window.HrEngine.workdaysBetween(data.start, data.end) : 1;
      const a = { id, empId: data.empId, type: data.type || "szabadsag", start: data.start, end: data.end || data.start,
        status: "kert", requestedAt: today, reason: (data.reason || "").trim(), days,
        log: [{ at: nowStamp(), text: "Kérelem beadva" }] };
      set((s) => ({ absences: [a, ...(s.absences || [])], absSeq: seq })); emit();
      const emp = (state.employees || []).find((e) => e.id === data.empId);
      postSystem(`🌴 Új távollét-kérelem (${id}) — ${emp ? emp.name : ""}: ${(window.ABS_TYPE_META[a.type] || {}).label}, ${a.start}–${a.end}.`, "ch-prod");
      if (window.toast) window.toast("✓ Kérelem beadva", "success");
      return id;
    },
    setAbsenceStatus(id, to, opts = {}) {
      ensure();
      const a = (state.absences || []).find((x) => x.id === id);
      if (!a) return false;
      if (!(window.HrEngine && window.HrEngine.absCanGo(a, to))) { if (window.toast) window.toast("Nem engedélyezett státuszváltás.", "error"); return false; }
      // jóváhagyás / elutasítás joghoz kötött
      if ((to === "jovahagyva" || to === "elutasitva") && !api.hasPerm("hr.manage")) { if (window.toast) window.toast("Nincs jogosultság a döntéshez (hr.manage).", "error"); return false; }
      if (to === "elutasitva" && !(opts.reason && opts.reason.trim())) { if (window.toast) window.toast("Indoklás kötelező az elutasításhoz.", "warning"); return false; }
      const lbl = (window.ABS_STATUS[to] || {}).label || to;
      const me = api.currentAccount();
      const patch = { status: to, log: [...(a.log || []), { at: nowStamp(), text: `Státusz → ${lbl}${opts.reason ? ` (${opts.reason.trim()})` : ""}` }] };
      if (to === "jovahagyva") { patch.approvedBy = me ? me.contact.split(" · ")[0] : "Admin"; patch.approvedAt = today; }
      if (to === "elutasitva") patch.rejectReason = opts.reason.trim();
      set((s) => ({ absences: (s.absences || []).map((x) => x.id === id ? { ...x, ...patch } : x) })); emit();
      if (window.toast) window.toast(`✓ ${id} → ${lbl}`, "success");
      return true;
    },

    // ── Munkaóra-napló → Kontrolling tény (munka) ───────────────────────────
    timeLogList() { ensure(); return state.timeLogs || []; },
    timeLogsForEmployee(empId) { ensure(); return (state.timeLogs || []).filter((t) => t.empId === empId); },
    timeLogsForProject(pid) { ensure(); return (state.timeLogs || []).filter((t) => t.projectId === pid); },
    addTimeLog(data) {
      ensure();
      const seq = (state.tlSeq || 0) + 1;
      const id = "TL-2426-" + String(seq).padStart(3, "0");
      const t = { id, empId: data.empId, projectId: data.projectId || null, projectName: data.projectName || "",
        date: data.date || today, hours: Number(data.hours) || 0, note: (data.note || "").trim(), pushedToCtrl: false };
      set((s) => ({ timeLogs: [t, ...(s.timeLogs || [])], tlSeq: seq })); emit();
      if (window.toast) window.toast("✓ Munkaóra rögzítve", "success");
      return id;
    },
    removeTimeLog(id) { ensure(); set((s) => ({ timeLogs: (s.timeLogs || []).filter((t) => t.id !== id) })); emit(); },
    // a naplózott órát átküldi a Kontrollingba „munka" kategóriás tény-korrekcióként
    pushTimeLogToCtrl(id) {
      ensure();
      const t = (state.timeLogs || []).find((x) => x.id === id);
      if (!t || t.pushedToCtrl || !t.projectId) { if (window.toast) window.toast("Nem küldhető át (nincs projekt vagy már átküldve).", "warning"); return false; }
      const emp = (state.employees || []).find((e) => e.id === t.empId);
      const cost = Math.round((Number(t.hours) || 0) * api.hrRate(emp));
      const adjId = api.addCtrlAdjustment({ scope: "project", refId: t.projectId, category: "munka",
        label: `Munkaóra-napló — ${emp ? emp.name : ""} (${t.hours} ó)`, plan: 0, actual: cost, note: t.note || `${t.date} · ${t.id}` });
      set((s) => ({ timeLogs: (s.timeLogs || []).map((x) => x.id === id ? { ...x, pushedToCtrl: true, ctrlAdjId: adjId } : x) })); emit();
      if (window.toast) window.toast("✓ Átküldve a Kontrollingba", "success");
      return true;
    },

    // ── KARBANTARTÁS / ESZKÖZGAZDÁLKODÁS ────────────────────────────────────
    // Az eszköz-törzs az egy igazságforrás; a gép üzemállapota SZÁMÍTOTT a nyitott
    // munkalapokból (MaintEngine.assetStatus). A munkalap FSM-vezérelt; a belső
    // szerelő ütemezése egy `assignments` rekordot ír (HR-kapacitás bekötés).
    assetList() { ensure(); return (state.assets || []).filter((a) => !a.retired); },
    allAssets() { ensure(); return state.assets || []; },
    findAsset(id) { ensure(); return (state.assets || []).find((a) => a.id === id); },
    assetStatus(id) { ensure(); const a = (state.assets || []).find((x) => x.id === id); return window.MaintEngine ? window.MaintEngine.assetStatus(state, a) : "uzemel"; },
    assetsByStatus(status) { ensure(); return (state.assets || []).filter((a) => api.assetStatus(a.id) === status); },
    assetsUnderMaintenance() { ensure(); return (state.assets || []).filter((a) => ["karbantartas", "leallitva"].includes(api.assetStatus(a.id))); },
    addAsset(data) {
      ensure();
      if (!api.hasPerm("maintenance.manage")) { if (window.toast) window.toast("Nincs jogosultság eszköz felvételéhez (maintenance.manage).", "error"); return null; }
      const seq = (state.assetSeq || 0) + 1;
      const prefix = ({ gep: "GEP", jarmu: "JAR", szerszam: "SZ", infra: "INF", it: "IT", helyiseg: "HEL" })[data.kind] || "ESZ";
      const a = { id: "as-" + Date.now().toString(36), code: data.code || `${prefix}-${String(seq).padStart(3, "0")}`,
        name: (data.name || "Új eszköz").trim(), kind: data.kind || "gep", facilityId: data.facilityId || "fac-vac",
        location: data.location || "", vendor: data.vendor || "", model: data.model || "", serial: data.serial || "",
        purchasedAt: data.purchasedAt || "", value: Number(data.value) || 0, operatingHours: Number(data.operatingHours) || 0,
        retired: false, note: data.note || "" };
      set((s) => ({ assets: [...(s.assets || []), a], assetSeq: seq })); emit();
      if (window.toast) window.toast("✓ Eszköz felvéve", "success");
      return a.id;
    },
    updateAsset(id, patch) {
      ensure();
      if (!api.hasPerm("maintenance.manage")) { if (window.toast) window.toast("Nincs jogosultság (maintenance.manage).", "error"); return; }
      set((s) => ({ assets: (s.assets || []).map((a) => a.id === id ? { ...a, ...patch } : a) })); emit();
    },
    retireAsset(id) {
      ensure();
      if (!api.hasPerm("maintenance.manage")) { if (window.toast) window.toast("Nincs jogosultság (maintenance.manage).", "error"); return; }
      set((s) => ({ assets: (s.assets || []).map((a) => a.id === id ? { ...a, retired: true, retiredAt: today } : a) })); emit();
      if (window.toast) window.toast("Eszköz selejtezve", "success");
    },

    // ── Megelőző tervek ─────────────────────────────────────────────────────
    maintPlanList() { ensure(); return state.maintPlans || []; },
    maintPlansForAsset(assetId) { ensure(); return (state.maintPlans || []).filter((p) => p.assetId === assetId); },
    duePlans(withinDays = 7) { ensure(); return window.MaintEngine ? window.MaintEngine.duePlans(state, today, withinDays) : []; },
    addMaintPlan(data) {
      ensure();
      if (!api.hasPerm("maintenance.manage")) { if (window.toast) window.toast("Nincs jogosultság (maintenance.manage).", "error"); return null; }
      const seq = (state.planSeq || 0) + 1;
      const p = { id: "mp-" + Date.now().toString(36), assetId: data.assetId, label: (data.label || "Terv").trim(),
        kind: data.kind || "preventiv", trigger: data.trigger || "interval",
        intervalDays: data.trigger === "interval" ? (Number(data.intervalDays) || 90) : undefined,
        intervalHours: data.trigger === "hours" ? (Number(data.intervalHours) || 500) : undefined,
        lastDone: data.lastDone || today, lastDoneHours: data.trigger === "hours" ? (Number(data.lastDoneHours) || 0) : undefined,
        assigneeType: data.assigneeType || "internal", assigneeEmpId: data.assigneeEmpId || null, partnerName: data.partnerName || null,
        estHours: Number(data.estHours) || 2, active: true };
      set((s) => ({ maintPlans: [...(s.maintPlans || []), p], planSeq: seq })); emit();
      if (window.toast) window.toast("✓ Megelőző terv hozzáadva", "success");
      return p.id;
    },
    removeMaintPlan(id) { ensure(); set((s) => ({ maintPlans: (s.maintPlans || []).filter((p) => p.id !== id) })); emit(); },
    setWorkOrderProject(id, projectId) {
      ensure();
      const p = (state.projects || []).find((x) => x.id === projectId);
      set((s) => ({ workOrders: (s.workOrders || []).map((w) => w.id === id ? { ...w, projectId, projectName: p ? p.name : "" } : w) })); emit();
      if (window.toast) window.toast("✓ Projekthez kötve", "success");
    },

    // ── Munkalapok (FSM) ────────────────────────────────────────────────────
    workOrderList() { ensure(); return state.workOrders || []; },
    findWorkOrder(id) { ensure(); return (state.workOrders || []).find((w) => w.id === id); },
    workOrdersForAsset(assetId) { ensure(); return (state.workOrders || []).filter((w) => w.assetId === assetId); },
    _nextWoId() { const seq = (state.woSeq || 0) + 1; return { id: "WO-2426-" + String(seq).padStart(3, "0"), seq }; },
    // belső szerelő ütemezése → HR-kapacitás bekötés (assignments rekord, source:"maintenance")
    _syncWoAssignment(wo) {
      const aid = "asg-wo-" + wo.id;
      const active = wo.assigneeType === "internal" && wo.assigneeEmpId && wo.scheduledDate && ["utemezve", "folyamatban"].includes(wo.status);
      const asset = (state.assets || []).find((a) => a.id === wo.assetId);
      if (active) {
        const rec = { id: aid, empId: wo.assigneeEmpId, projectId: null, projectName: "Karbantartás", source: "maintenance",
          label: `Karbantartás: ${asset ? asset.name : wo.assetId}`, start: wo.scheduledDate, end: wo.scheduledDate, hoursPerDay: Number(wo.estHours) || 2 };
        set((s) => ({ assignments: [...(s.assignments || []).filter((x) => x.id !== aid), rec] }));
      } else {
        set((s) => ({ assignments: (s.assignments || []).filter((x) => x.id !== aid) }));
      }
    },
    createWorkOrder(data) {
      ensure();
      const { id } = api._nextWoId();
      const seq = (state.woSeq || 0) + 1;
      const wo = { id, assetId: data.assetId, kind: data.kind || "korrektiv", title: (data.title || "Munkalap").trim(), desc: (data.desc || "").trim(),
        status: "bejelentve", priority: data.priority || "kozepes", breakdown: !!data.breakdown, stops: data.stops != null ? !!data.stops : !!data.breakdown,
        reportedAt: today, scheduledDate: data.scheduledDate || null, estHours: Number(data.estHours) || 2,
        assigneeType: data.assigneeType || "internal", assigneeEmpId: data.assigneeEmpId || null, partnerName: data.partnerName || null,
        parts: data.parts || [], downtimeHours: 0, cost: 0, projectId: data.projectId || null, planId: data.planId || null,
        log: [{ at: nowStamp(), text: `Bejelentve (${(window.WO_TYPE[data.kind || "korrektiv"] || {}).label})` }] };
      set((s) => ({ workOrders: [wo, ...(s.workOrders || [])], woSeq: seq }));
      const asset = (state.assets || []).find((a) => a.id === wo.assetId);
      postSystem(`🔧 Új karbantartási munkalap (${id}) — ${asset ? asset.name : ""}: ${wo.title}${wo.breakdown ? " ⚠️ géptörés" : ""}.`, "ch-prod");
      emit();
      if (window.toast) window.toast("✓ Munkalap létrehozva", "success");
      return id;
    },
    createWorkOrderFromPlan(planId) {
      ensure();
      if (!api.hasPerm("maintenance.manage")) { if (window.toast) window.toast("Nincs jogosultság (maintenance.manage).", "error"); return null; }
      const p = (state.maintPlans || []).find((x) => x.id === planId);
      if (!p) return null;
      const asset = (state.assets || []).find((a) => a.id === p.assetId);
      const d = window.MaintEngine.planDue(p, asset, today);
      const id = api.createWorkOrder({ assetId: p.assetId, kind: p.kind, title: p.label, desc: `Megelőző terv (${p.trigger === "hours" ? "üzemóra" : "időköz"}) alapján.`,
        priority: d.overdue ? "magas" : "kozepes", stops: p.kind === "preventiv", scheduledDate: d.dueDate || today,
        estHours: p.estHours, assigneeType: p.assigneeType, assigneeEmpId: p.assigneeEmpId, partnerName: p.partnerName, planId: p.id });
      return id;
    },
    scheduleWorkOrder(id, patch) {
      ensure();
      if (!api.hasPerm("maintenance.manage")) { if (window.toast) window.toast("Nincs jogosultság (maintenance.manage).", "error"); return; }
      const wo = (state.workOrders || []).find((x) => x.id === id);
      if (!wo) return;
      const next = { ...wo };
      ["scheduledDate", "windowStart", "windowEnd", "assigneeType", "assigneeEmpId", "partnerName", "estHours", "priority"].forEach((k) => { if (patch[k] !== undefined) next[k] = patch[k]; });
      set((s) => ({ workOrders: s.workOrders.map((x) => (x.id === id ? next : x)) }));
      api._syncWoAssignment(next);
      emit();
      if (window.toast) window.toast("✓ Munkalap ütemezve", "success");
    },
    setWorkOrderStatus(id, to, opts = {}) {
      ensure();
      if (!api.hasPerm("maintenance.manage")) { if (window.toast) window.toast("Nincs jogosultság a státuszváltáshoz (maintenance.manage).", "error"); return false; }
      const wo = (state.workOrders || []).find((x) => x.id === id);
      if (!wo) return false;
      if (!(window.MaintEngine && window.MaintEngine.woCanGo(wo, to))) { if (window.toast) window.toast("Nem engedélyezett státuszváltás.", "error"); return false; }
      if ((to === "elutasitva" || to === "halasztva") && !(opts.reason && opts.reason.trim())) { if (window.toast) window.toast("Indoklás kötelező.", "warning"); return false; }
      const lbl = (window.WO_STATUS[to] || {}).label || to;
      const next = { ...wo, status: to, log: [...(wo.log || []), { at: nowStamp(), text: `Státusz → ${lbl}${opts.reason ? ` (${opts.reason.trim()})` : ""}` }] };
      const asset = (state.assets || []).find((a) => a.id === wo.assetId);
      let extra = {};
      if (to === "folyamatban" && wo.stops) {
        // nyiss állásidőt, ha még nincs nyitott erre a WO-ra
        const hasOpen = (state.downtime || []).some((d) => d.workOrderId === id && !d.end);
        if (!hasOpen) { const dseq = (state.dtSeq || 0) + 1; extra.downtime = [{ id: "dt-" + dseq, assetId: wo.assetId, start: today, end: null, hours: Number(wo.estHours) || 0, reason: wo.title, workOrderId: id, planned: wo.kind !== "korrektiv" }, ...(state.downtime || [])]; extra.dtSeq = dseq; }
      }
      if (to === "kesz") {
        next.completedAt = today;
        const rate = api.woRate(wo);
        if (!next.cost) next.cost = window.MaintEngine.woLaborCost(wo, rate);
        // zárd az állásidőt
        extra.downtime = (state.downtime || []).map((d) => (d.workOrderId === id && !d.end) ? { ...d, end: today } : d);
        // frissítsd a tervet (lastDone / lastDoneHours)
        if (wo.planId) extra.maintPlans = (state.maintPlans || []).map((p) => p.id === wo.planId ? { ...p, lastDone: today, lastDoneHours: p.trigger === "hours" ? ((asset && asset.operatingHours) || p.lastDoneHours) : p.lastDoneHours } : p);
      }
      set((s) => ({ workOrders: s.workOrders.map((x) => (x.id === id ? next : x)), ...extra }));
      // HR-beosztás szinkron (kész/elutasítva → leveszi)
      api._syncWoAssignment(next);
      if (window.toast) window.toast(`✓ ${id} → ${lbl}`, "success");
      emit();
      return true;
    },
    // munkalap óradíj (belső HR-óradíj vagy alapdíj; külső szerviz alapdíj)
    woRate(wo) {
      ensure();
      const M = window.MAINT_DEFAULTS || {};
      if (wo.assigneeType === "external") return M.externalRate || 9500;
      const emp = wo.assigneeEmpId ? (state.employees || []).find((e) => e.id === wo.assigneeEmpId) : null;
      return emp ? api.hrRate(emp) : (M.internalRate || 4200);
    },
    woCost(wo) { ensure(); return wo.cost || window.MaintEngine.woLaborCost(wo, api.woRate(wo)); },
    // külső szerviz/takarító partnernek kiadás (B2B kézfogás)
    delegateWorkOrder(id, partnerId) {
      ensure();
      if (!api.hasPerm("maintenance.manage")) { if (window.toast) window.toast("Nincs jogosultság (maintenance.manage).", "error"); return; }
      const wo = (state.workOrders || []).find((x) => x.id === id);
      const partner = (state.partners || []).find((x) => x.id === partnerId);
      if (!wo || !partner) return;
      const hid = "HS-WO-" + id.slice(-3);
      const asset = (state.assets || []).find((a) => a.id === wo.assetId);
      const hs = { id: hid, kind: "maintenance", workOrderId: id, projectName: asset ? asset.name : "", epicTitle: wo.title,
        fromCompany: "JoineryTech (belső)", partner: partner.name, status: "sent", external: !partner.platform, created: today };
      const next = { ...wo, assigneeType: "external", partnerName: partner.name, handshakeId: hid, delegatedTo: partner.name, log: [...(wo.log || []), { at: nowStamp(), text: `Kiadva: ${partner.name} (kézfogás)` }] };
      set((s) => ({ handshakes: [hs, ...(s.handshakes || [])], workOrders: s.workOrders.map((x) => (x.id === id ? next : x)) }));
      api._syncWoAssignment(next);  // levesz belső beosztást, ha volt
      postSystem(`🤝 Karbantartás kiadva (${id}) — ${partner.name}: ${wo.title}.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Kiadva: ${partner.name}`, "success");
    },
    recallWorkOrder(id) {
      ensure();
      const wo = (state.workOrders || []).find((x) => x.id === id);
      if (!wo) return;
      set((s) => ({ handshakes: (s.handshakes || []).filter((h) => h.id !== wo.handshakeId), workOrders: s.workOrders.map((x) => (x.id === id ? { ...x, handshakeId: null, delegatedTo: null, log: [...(x.log || []), { at: nowStamp(), text: "Kiadás visszavonva" }] } : x)) }));
      emit();
    },
    // alkatrész-igény a munkalapról → Beszerzés (Draft requisition)
    woRequestParts(id) {
      ensure();
      const wo = (state.workOrders || []).find((x) => x.id === id);
      if (!wo || !(wo.parts || []).length) { if (window.toast) window.toast("Nincs alkatrész a munkalapon.", "warning"); return; }
      const meName = (api.currentAccount && api.currentAccount()?.contact || "").split(" · ")[0] || "Karbantartó";
      const asset = (state.assets || []).find((a) => a.id === wo.assetId);
      let n = 40 + Math.floor(Math.random() * 55);
      const rows = wo.parts.map((p, i) => ({ id: "PR-2426-" + (n + i), material: p.label, matCode: p.code || "", qty: Number(p.qty) || 1, unit: p.unit || "db",
        preferredSupplier: null, requester: meName, date: today, status: "Draft", note: `Karbantartás ${wo.id} — ${asset ? asset.name : ""}`, sourceKind: "supplier" }));
      api.addRequisitions(rows);
      set((s) => ({ workOrders: s.workOrders.map((x) => (x.id === id ? { ...x, partsRequested: true, log: [...(x.log || []), { at: nowStamp(), text: `Alkatrész-igény → Beszerzés (${rows.length} tétel)` }] } : x)) }));
      postSystem(`📋 Alkatrész-igény a Beszerzéshez (${wo.id}) — ${rows.length} tétel.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ ${rows.length} alkatrész igényelve`, "success");
    },
    // projekthez kötött munkalap → Kontrolling tény-tétel (különben marad a karbantartási ktg.)
    pushWorkOrderToCtrl(id) {
      ensure();
      const wo = (state.workOrders || []).find((x) => x.id === id);
      if (!wo || wo.pushedToCtrl || !wo.projectId) { if (window.toast) window.toast("Csak projekthez kötött, még át nem küldött munkalap küldhető.", "warning"); return false; }
      const asset = (state.assets || []).find((a) => a.id === wo.assetId);
      const adjId = api.addCtrlAdjustment({ scope: "project", refId: wo.projectId, category: "rezsi",
        label: `Karbantartás — ${asset ? asset.name : ""} (${wo.id})`, plan: 0, actual: api.woCost(wo), note: wo.title });
      set((s) => ({ workOrders: s.workOrders.map((x) => (x.id === id ? { ...x, pushedToCtrl: true, ctrlAdjId: adjId } : x)) })); emit();
      if (window.toast) window.toast("✓ Átküldve a Kontrollingba", "success");
      return true;
    },

    // ── Állásidő-napló ──────────────────────────────────────────────────────
    downtimeList() { ensure(); return state.downtime || []; },
    downtimeForAsset(assetId) { ensure(); return (state.downtime || []).filter((d) => d.assetId === assetId); },
    addDowntime(data) {
      ensure();
      const seq = (state.dtSeq || 0) + 1;
      const d = { id: "dt-" + seq, assetId: data.assetId, start: data.start || today, end: data.end || null,
        hours: Number(data.hours) || 0, reason: (data.reason || "").trim(), workOrderId: data.workOrderId || null, planned: !!data.planned };
      set((s) => ({ downtime: [d, ...(s.downtime || [])], dtSeq: seq })); emit();
      if (window.toast) window.toast("✓ Állásidő rögzítve", "success");
      return d.id;
    },

    _itemPrice(id) {
      const it = (state.catalog || []).find((x) => x.id === id);
      if (!it) return 0;
      return Number(it.price) || (it.suppliers && it.suppliers[0] && Number(it.suppliers[0].price)) || 0;
    },

    controllingForProject(projectId) {
      ensure();
      const p = (state.projects || []).find((x) => x.id === projectId);
      if (!p) return null;
      const cfg = api.ctrlConfig();
      const DIRECT = window.CTRL_DIRECT_CATS || ["anyag", "munka", "bermunka", "szallitas", "beszallito"];
      const orderIds = (p.items || []).map((i) => i.orderId).filter(Boolean);
      const adj = (state.ctrlAdjustments || []).filter((a) => a.scope === "project" && a.refId === projectId);
      const adjP = (c) => adj.filter((a) => a.category === c).reduce((s, a) => s + (Number(a.plan) || 0), 0);
      const adjA = (c) => adj.filter((a) => a.category === c).reduce((s, a) => s + (Number(a.actual) || 0), 0);

      // PLAN alap — gyártás-előkészítés (MfgPrep) vagy prep-snapshot vagy szerződés-arány
      let prepMaterial = 0, prepLabor = 0, prepGrand = 0;
      try { const d = window.MfgPrep && window.MfgPrep.derive(p); if (d && d.totals) { prepMaterial = (d.totals.materialCost || 0) + (d.totals.hardwareCost || 0); prepLabor = d.totals.laborCost || 0; prepGrand = d.totals.grand || 0; } } catch (e) {}
      const contract = (p.items || []).reduce((s, i) => s + (Number(i.value) || 0), 0);
      if (!prepGrand && p.prep && p.prep.grand) { prepGrand = p.prep.grand; prepMaterial = prepGrand * 0.62; prepLabor = prepGrand * 0.30; }
      if (!prepGrand) { prepGrand = contract * (cfg.targetCostRatio || 0.6); prepMaterial = prepGrand * 0.62; prepLabor = prepGrand * 0.30; }

      // Szállítás — a kapcsolt fuvarokból (terv = összes tervezett; tény = ami legalább úton)
      const ships = (state.shipments || []).filter((s) => s.type !== "survey" && s.status !== "torolve" && (orderIds.includes(s.ref) || s.customer === p.customer));
      const shipCost = (s) => (cfg.transportBase || 0) + (Number(s.loadM3) || 0) * (cfg.transportPerM3 || 0);
      const transportPlan = ships.reduce((a, s) => a + shipCost(s), 0);
      const transportActual = ships.filter((s) => ["uton", "kiszallitva", "beszerelve", "atadva", "felveve", "beerkezett"].includes(s.status)).reduce((a, s) => a + shipCost(s), 0);

      // Bérmunka — a projekt B2B kézfogásaiból
      const hs = (state.handshakes || []).filter((h) => h.projectId === projectId);
      const hsCost = (h) => (h.payload && h.payload.fee) ? h.payload.fee : (cfg.outsourceEst || 0);
      const outsourcePlan = hs.reduce((a, h) => a + hsCost(h), 0);
      const outsourceActual = hs.filter((h) => ["accepted", "done"].includes(h.status)).reduce((a, h) => a + hsCost(h), 0);

      // Anyag tény — raktári kivét (kiadva) a projekt rendeléseire
      const wds = (state.withdrawals || []).filter((w) => w.status === "kiadva" && orderIds.includes(w.ref));
      const materialActual = wds.reduce((a, w) => a + (w.lines || []).reduce((b, l) => b + (Number(l.qty) || 0) * api._itemPrice(l.itemId), 0), 0);

      // Munkaerő tény — a GYÁRTÁSI idő-naplókból (Gyártás → Feladat-terminál
      // sessions[]). Az óradíj NEM átalány: a `ctrlLaborRate` resolver task-onként
      // oldja fel — (1) ha az assignee a HR-törzsben van: bér-kategória terhelt
      // óradíja; (2) különben a művelettípus óradíja; (3) végül átalány (cfg.laborRate).
      // Értéklánc-bekötés: idő-naplózás + HR bér-kategória → kontrolling.
      const empByName = (nm) => (state.employees || []).find((e) => e.name === nm) || null;
      let laborActual = 0;
      const laborByBasis = { grade: 0, kind: 0, flat: 0 };
      const laborBreakdown = [];
      try {
        const PE = window.ProdSchedEngine;
        const resolve = window.ctrlLaborRate;
        if (PE && typeof PE.taskActualMinutes === "function") {
          (state.prodTasks || []).filter((t) => orderIds.includes(t.order)).forEach((t) => {
            const hrs = PE.taskActualMinutes(t) / 60;
            if (hrs <= 0) return;
            const rr = resolve ? resolve(t, { cfg, empByName }) : { rate: cfg.laborRate || 0, basis: "flat", label: "Általános óradíj", who: null };
            const cost = hrs * (rr.rate || 0);
            laborActual += cost;
            laborByBasis[rr.basis] = (laborByBasis[rr.basis] || 0) + cost;
            laborBreakdown.push({ taskId: t.id, title: t.title, kind: t.kind, who: rr.who, assignee: t.assignee || null,
              basis: rr.basis, label: rr.label, hours: Math.round(hrs * 100) / 100, rate: rr.rate, cost: Math.round(cost) });
          });
        }
      } catch (e) {}
      laborActual = Math.round(laborActual);
      Object.keys(laborByBasis).forEach((k) => { laborByBasis[k] = Math.round(laborByBasis[k]); });

      // Személyenkénti aggregátum (a naplózott feladatokból) — a bérköltség
      // emberekre bontva. A nem-törzs assignee (PROD_OPERATORS, de nincs HR-ben)
      // a nevén; a hozzárendelés nélküli (kind/flat) a bázis-címkéjén csoportosul.
      const _ctrlInit = (nm) => String(nm || "").trim().split(/\s+/).map((w) => w[0] || "").slice(0, 2).join("").toUpperCase();
      let laborHoursTotal = 0;
      const _pm = {};
      laborBreakdown.forEach((x) => {
        laborHoursTotal += x.hours;
        const name = x.who || x.assignee || x.label;
        const emp = x.who ? empByName(x.who) : null;
        const o = _pm[name] = _pm[name] || { who: name, inTorzs: !!emp, initials: emp ? emp.initials : _ctrlInit(name),
          color: emp ? emp.color : "#78716c", payGrade: emp ? emp.payGrade : null, basis: x.basis, hours: 0, cost: 0, taskCount: 0 };
        o.hours += x.hours; o.cost += x.cost; o.taskCount += 1;
      });
      const laborByPerson = Object.values(_pm)
        .map((o) => ({ ...o, hours: Math.round(o.hours * 100) / 100, cost: Math.round(o.cost),
          rate: o.hours > 0 ? Math.round(o.cost / o.hours) : 0 }))
        .sort((a, b) => b.cost - a.cost);
      laborHoursTotal = Math.round(laborHoursTotal * 100) / 100;

      // Beszállítói számla tény — bejövő számlák a projekt rendeléseire
      const inInv = (state.finInvoices || []).filter((v) => v.dir === "in" && orderIds.includes(v.orderRef) && v.status !== "void");
      const supplierActual = inInv.reduce((a, v) => a + finToHuf(finGross(v), v), 0);

      // Bevétel — kimenő számlák (tényleges), fallback a szerződéses értékre
      const outInv = (state.finInvoices || []).filter((v) => v.dir === "out" && orderIds.includes(v.orderRef) && v.status !== "void");
      const invoiced = outInv.reduce((a, v) => a + finToHuf(finGross(v), v), 0);
      const revenueActual = invoiced > 0 ? invoiced : contract;

      const plan = {
        anyag: prepMaterial + adjP("anyag"),
        munka: prepLabor + adjP("munka"),
        bermunka: outsourcePlan + adjP("bermunka"),
        szallitas: transportPlan + adjP("szallitas"),
        beszallito: adjP("beszallito"),
      };
      const actual = {
        anyag: materialActual + adjA("anyag"),
        munka: laborActual + adjA("munka"),
        bermunka: outsourceActual + adjA("bermunka"),
        szallitas: transportActual + adjA("szallitas"),
        beszallito: supplierActual + adjA("beszallito"),
      };
      const planDirect = DIRECT.reduce((a, c) => a + (plan[c] || 0), 0);
      const actualDirect = DIRECT.reduce((a, c) => a + (actual[c] || 0), 0);
      plan.rezsi = Math.round(planDirect * (cfg.overheadPct || 0) / 100) + adjP("rezsi");
      actual.rezsi = Math.round(actualDirect * (cfg.overheadPct || 0) / 100) + adjA("rezsi");
      const planTotal = planDirect + plan.rezsi;
      const actualTotal = actualDirect + actual.rezsi;

      const cats = (window.CTRL_CAT_ORDER || Object.keys(plan)).map((c) => {
        const pl = plan[c] || 0, ac = actual[c] || 0, diff = ac - pl;
        return { key: c, plan: pl, actual: ac, diff, pct: pl ? diff / pl : (ac ? null : 0) };
      });

      const planMargin = contract - planTotal;
      const actualMargin = revenueActual - actualTotal;
      const planMarginPct = contract ? planMargin / contract : null;
      const actualMarginPct = revenueActual ? actualMargin / revenueActual : null;

      // VÁRHATÓ (EAC — Estimate At Completion). A tény-költség lemarad a bevétel
      // mögött (csak a már felmerült tételeket számolja), ezért a tény-fedezet a
      // projekt elején irreálisan magas. Az EAC kategóriánként a TERV és a TÉNY
      // MAXIMUMA: a még fel nem merült tételek a tervüket hordozzák (alsó korlát),
      // a realizált túllépés viszont beépül → reális, stabil fedezet végig.
      const projected = {};
      DIRECT.forEach((c) => { projected[c] = Math.max(plan[c] || 0, actual[c] || 0); });
      const projectedDirect = DIRECT.reduce((a, c) => a + (projected[c] || 0), 0);
      projected.rezsi = Math.round(projectedDirect * (cfg.overheadPct || 0) / 100) + Math.max(adjP("rezsi"), adjA("rezsi"));
      const costEAC = projectedDirect + projected.rezsi;
      const eacMargin = revenueActual - costEAC;
      const eacMarginPct = revenueActual ? eacMargin / revenueActual : null;

      // HOZZÁADOTT ÉRTÉK (value added) — a bevétel mínusz a KÜLSŐ (beszerzett)
      // input: anyag + bérmunka + beszállítói számla + szállítás. A maradék a cég
      // BELÜL teremtett értéke (saját munka + rezsi + fedezet). Produktivitás:
      // hozzáadott érték / naplózott munkaóra. Tény + EAC (várható) változat.
      const EXTERNAL_CATS = ["anyag", "bermunka", "beszallito", "szallitas"];
      const externalActual = EXTERNAL_CATS.reduce((a, c) => a + (actual[c] || 0), 0);
      const externalEAC = EXTERNAL_CATS.reduce((a, c) => a + (projected[c] || 0), 0);
      const valueAdded = revenueActual - externalActual;
      const valueAddedPct = revenueActual ? valueAdded / revenueActual : null;
      const valueAddedEAC = revenueActual - externalEAC;
      const valueAddedEACPct = revenueActual ? valueAddedEAC / revenueActual : null;
      const valueAddedPerHour = laborHoursTotal > 0 ? Math.round(valueAdded / laborHoursTotal) : null;

      // Rendelés-szintű roll-up (informatív)
      const orders = orderIds.map((oid) => {
        const o = (state.orders || []).find((x) => x.id === oid);
        const oContract = (p.items || []).filter((i) => i.orderId === oid).reduce((s, i) => s + (Number(i.value) || 0), 0);
        const oInv = (state.finInvoices || []).filter((v) => v.dir === "out" && v.orderRef === oid && v.status !== "void").reduce((a, v) => a + finToHuf(finGross(v), v), 0);
        const share = contract ? actualTotal * (oContract / contract) : 0;
        return { id: oid, customer: o ? o.customer : p.customer, status: o ? o.status : null, contract: oContract, invoiced: oInv, costShare: Math.round(share) };
      });

      return {
        project: p, contract, invoiced, revenueActual,
        plan, actual, planTotal, actualTotal, planDirect, actualDirect,
        cats, planMargin, actualMargin, planMarginPct, actualMarginPct,
        projected, costEAC, eacMargin, eacMarginPct, laborActual, laborByBasis, laborBreakdown,
        laborByPerson, laborHoursTotal,
        externalActual, valueAdded, valueAddedPct, valueAddedEAC, valueAddedEACPct, valueAddedPerHour,
        costVariance: actualTotal - planTotal, orders, adjustments: adj, cfg,
      };
    },

    controllingPortfolio() {
      ensure();
      // A gyártási alprojekt (kind:"manufacturing" / parentProjectId) UGYANAZOKAT a
      // tételeket hordozza, mint a szülő → kihagyjuk, hogy ne duplázzon bevételt/költséget.
      const list = (state.projects || []).filter((p) => p.kind !== "manufacturing" && !p.parentProjectId && (p.status !== "draft" || (p.items || []).length))
        .map((p) => api.controllingForProject(p.id)).filter(Boolean);
      const totals = list.reduce((a, r) => ({
        contract: a.contract + r.contract, revenueActual: a.revenueActual + r.revenueActual, invoiced: a.invoiced + r.invoiced,
        planTotal: a.planTotal + r.planTotal, actualTotal: a.actualTotal + r.actualTotal,
        costEAC: a.costEAC + r.costEAC,
        planMargin: a.planMargin + r.planMargin, actualMargin: a.actualMargin + r.actualMargin, eacMargin: a.eacMargin + r.eacMargin,
        valueAdded: a.valueAdded + r.valueAdded, valueAddedEAC: a.valueAddedEAC + r.valueAddedEAC,
        externalActual: a.externalActual + r.externalActual, laborHoursTotal: a.laborHoursTotal + r.laborHoursTotal,
      }), { contract: 0, revenueActual: 0, invoiced: 0, planTotal: 0, actualTotal: 0, costEAC: 0, planMargin: 0, actualMargin: 0, eacMargin: 0,
        valueAdded: 0, valueAddedEAC: 0, externalActual: 0, laborHoursTotal: 0 });
      totals.actualMarginPct = totals.revenueActual ? totals.actualMargin / totals.revenueActual : null;
      totals.planMarginPct = totals.contract ? totals.planMargin / totals.contract : null;
      totals.eacMarginPct = totals.revenueActual ? totals.eacMargin / totals.revenueActual : null;
      totals.valueAddedPct = totals.revenueActual ? totals.valueAdded / totals.revenueActual : null;
      totals.valueAddedPerHour = totals.laborHoursTotal > 0 ? Math.round(totals.valueAdded / totals.laborHoursTotal) : null;
      const ranked = list.slice().sort((a, b) => (b.actualMarginPct || 0) - (a.actualMarginPct || 0));
      return { list, totals, top: ranked[0] || null, flop: ranked[ranked.length - 1] || null };
    },

    // ── VEZETŐI BI-COCKPIT — kereszt-világ SZÁMÍTOTT aggregátor ──────────────
    // NEM tárol semmit; a meglévő világok igazságforrásait + engine-jeit olvassa.
    // A trend-idősor a EXEC_TREND_SEED demó-sorozat, az UTOLSÓ pontját az élő
    // pillanatkép-értékekre igazítjuk (a szimuláció egyetlen időpont, nincs
    // valós többhavi historikum). Minden blokk deep-linkel a forrás-világba.
    execCockpit() {
      ensure();
      const num = (n) => Number(n) || 0;

      // 1) Pénzügy / likviditás
      const fin = api.finStats();

      // 2) Projekt-jövedelmezőség (Kontrolling)
      const pf = api.controllingPortfolio();
      const slipped = pf.list.filter((r) => r.costVariance > 0).sort((a, b) => b.costVariance - a.costVariance);

      // 3) Értékesítési pipeline (CRM)
      const opps = state.opportunities || [];
      const leads = state.leads || [];
      const CE = window.CrmEngine;
      const forecast = CE ? CE.forecast(opps) : { pipeline: 0, weighted: 0, won: 0, lost: 0, openCount: 0, byStage: {} };
      const win = CE ? CE.oppWinRate(opps) : { won: 0, closed: 0, rate: 0 };
      const conv = CE ? CE.leadConversion(leads) : { conv: 0, closed: 0, rate: 0 };
      const openLeads = leads.filter((l) => CE && CE.leadIsOpen ? CE.leadIsOpen(l) : !["konvertalva", "elvetve"].includes(l.status)).length;

      // 4) Rendelésállomány (backlog) — visszaigazolt, nem leszállított rendelések
      const orderGross = (o) => num(o.total) || num(o.value) || (o.calc && num(o.calc.value)) ||
        (Array.isArray(o.lines) ? o.lines.reduce((s, l) => s + (num(l.price) || num(l.unitPrice)) * (num(l.qty) || 1), 0) : 0);
      const backlogOrders = (state.orders || []).filter((o) => ["calc", "ready", "released"].includes(o.status));
      const backlog = { value: backlogOrders.reduce((s, o) => s + orderGross(o), 0), count: backlogOrders.length };

      // 5) Gyártás-terhelés (heti, véges kapacitás)
      const prodTasks = state.prodTasks || [];
      const PE = window.ProdSchedEngine;
      const monday = window.PROD_WEEK_MONDAY;
      const util = PE ? PE.utilization(prodTasks, monday) : { load: 0, cap: 0, pct: 0 };
      const prod = {
        loadPct: util.pct, load: util.load, cap: util.cap,
        conflicts: PE ? PE.conflicts(prodTasks, monday).length : 0,
        wip: prodTasks.filter((t) => ["utemezve", "folyamatban"].includes(t.status)).length,
        queue: prodTasks.filter((t) => t.status === "varolista").length,
        blocked: prodTasks.filter((t) => t.status === "blokkolt").length,
      };

      // 6) Minőség (QA/QC) — átadás ELŐTT
      const qaList = state.qaInspections || [];
      const QE = window.QaEngine;
      const qaOpenList = qaList.filter((i) => QE && QE.isOpen(i));
      let ncrOpen = 0, ncrCritical = 0;
      qaOpenList.forEach((i) => (i.defects || []).forEach((d) => { ncrOpen++; if (d.sev === "kritikus") ncrCritical++; }));
      const pr = QE ? QE.passRate(qaList) : { pass: 0, closed: 0, rate: 0 };
      const qa = { rate: pr.rate, closed: pr.closed, open: qaOpenList.length, ncrOpen, ncrCritical };

      // 7) Munkavédelem / EHS + kockázat
      const incs = state.ehsIncidents || [];
      const EE = window.EhsEngine;
      const ehsOpen = incs.filter((i) => EE && EE.isOpen(i)).length;
      const risks = state.ehsRisks || [];
      const highRisk = risks.filter((r) => (EE ? EE.score(r) : 0) >= 10).length; // magas + kiemelt sáv
      const ehs = {
        openInc: ehsOpen,
        openCapa: EE ? EE.openCapa(incs) : 0,
        expired: EE ? EE.expiredTrainings(state.ehsTrainings || []).length : 0,
        expiring: EE ? EE.expiringTrainings(state.ehsTrainings || []).length : 0,
        highRisk,
        recordable: EE ? EE.recordableRate(incs) : { count: 0, lost: 0 },
      };

      // 8) Logisztika — élő fuvarok + ütközés
      const shipments = state.shipments || [];
      const LE = window.LogEngine;
      const liveShip = shipments.filter((s) => !["atadva", "beerkezett", "kesz", "torolve"].includes(s.status)).length;
      const log = { live: liveShip, conflicts: LE ? LE.conflicts(shipments).length : 0 };

      // 9) Beszerzés + jóváhagyások (hatáskör-limit felett)
      const poDraft = (state.pos || []).filter((p) => p.status === "draft");
      const RFE = window.RfqEngine;
      const rfqOpen = (state.rfqs || []).filter((r) => RFE && RFE.isOpen(r)).length;
      const apprPending = (state.approvals || []).filter((a) => a.status === "fuggoben");
      const proc = {
        poDraftCount: poDraft.length,
        poDraftValue: poDraft.reduce((s, p) => s + num(p.total), 0),
        rfqOpen,
        apprPending: apprPending.length,
        apprValue: apprPending.reduce((s, a) => s + num(a.amount), 0),
      };

      // 10) Reklamáció (átadás UTÁNI hurok)
      const svcOpen = (state.serviceTickets || []).filter((t) => window.ServiceEngine && window.ServiceEngine.isOpen(t)).length;

      // 11) Trend-idősor — demó historikum (a szimuláció egyetlen időpont, valós
      // többhavi sorozat nincs). Az UTOLSÓ pont az "aktuális hó" jelölést kapja;
      // az ÉLŐ pillanatkép a fenti KPI-kártyákon van (külön bázis — nem keverjük
      // a havi historikummal, hogy a görbe ne szakadjon).
      const trend = (window.EXEC_TREND_SEED || []).map((p, i, arr) => ({
        ...p,
        label: window.execMonthLabel ? window.execMonthLabel(p.ym) : p.ym,
        live: i === arr.length - 1,
      }));

      return {
        fin,
        ctrl: { totals: pf.totals, top: pf.top, flop: pf.flop, list: pf.list, slipped },
        sales: { forecast, win, conv, openLeads },
        backlog, prod, qa, ehs, log, proc,
        svc: { open: svcOpen },
        trend,
      };
    },

    // ── MINŐSÉGBIZTOSÍTÁS — bejövő / gyártásközi / végellenőrzés (átadás ELŐTT) ──
    // FSM az ellenőrzésen (QaEngine). Felelőssége az átadás előtti minőség; a
    // Reklamáció (service) az átadás UTÁNI hurok — nem keverednek.
    qaList() { ensure(); return state.qaInspections || []; },
    findQaInspection(id) { ensure(); return (state.qaInspections || []).find((x) => x.id === id); },
    qaOpen() { ensure(); return (state.qaInspections || []).filter((x) => window.QaEngine && window.QaEngine.isOpen(x)); },
    _nextQaId() { const seq = (state.qaSeq || 0) + 1; return { id: `QA-2426-${String(seq).padStart(3, "0")}`, seq }; },
    addQaInspection(data) {
      ensure();
      if (!api.hasPerm("quality.manage")) { if (window.toast) window.toast("Nincs jogosultság ellenőrzés rögzítéséhez (quality.manage).", "error"); return null; }
      const { id, seq } = api._nextQaId();
      const type = data.type || "gyartaskozi";
      const checklist = (data.checklist || (window.QA_CHECKLISTS && window.QA_CHECKLISTS[type]) || []).map((c) => (typeof c === "string" ? { label: c, ok: null } : { ...c }));
      const insp = { id, type, status: "nyitott", priority: data.priority || "kozepes",
        subject: (data.subject || "").trim(), ref: data.ref || "", refLabel: data.refLabel || "", supplier: data.supplier || "",
        inspector: data.inspector || api._crmOwner(), reportedAt: today, dueDate: data.dueDate || today,
        checklist, defects: [], note: (data.note || "").trim(),
        log: [{ at: nowStamp(), text: `Ellenőrzés létrehozva (${(window.QA_TYPE_META[type] || {}).label || type})` }] };
      set((s) => ({ qaInspections: [insp, ...(s.qaInspections || [])], qaSeq: seq }));
      postSystem(`🔍 Új minőség-ellenőrzés (${id}) — ${insp.subject}.`, "ch-prod");
      emit();
      return id;
    },
    setQaStatus(id, to, opts = {}) {
      ensure();
      if (!api.hasPerm("quality.manage")) { if (window.toast) window.toast("Nincs jogosultság (quality.manage).", "error"); return false; }
      const insp = (state.qaInspections || []).find((x) => x.id === id);
      if (!insp) return false;
      if (!(window.QaEngine && window.QaEngine.canGo(insp, to))) { if (window.toast) window.toast("Nem engedélyezett státuszváltás.", "error"); return false; }
      if (to === "selejt" && !(opts.reason && opts.reason.trim()) && !(insp.defects || []).length) { if (window.toast) window.toast("Selejtnél indok vagy hibatétel kötelező.", "warning"); return false; }
      const lbl = (window.QA_STATUS[to] || {}).label || to;
      const patch = { status: to, log: [...(insp.log || []), { at: nowStamp(), text: `Státusz → ${lbl}${opts.reason ? ` (${opts.reason.trim()})` : ""}` }] };
      if (["megfelelt", "selejt"].includes(to)) patch.closedAt = today;
      set((s) => ({ qaInspections: s.qaInspections.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      // Bejövő ellenőrzés selejt → jelzés a Beszerzésnek / beszállítónak
      if (to === "selejt" && insp.type === "bejovo") postSystem(`⚠️ Bejövő SELEJT (${id}) — ${insp.supplier || "beszállító"}: ${insp.subject}. Reklamáció a Beszerzésnek.`, "ch-prod");
      else if (to === "megfelelt" && insp.type === "vegellenorzes") postSystem(`✅ Végellenőrzés MEGFELELT (${id}) — ${insp.refLabel || insp.ref || insp.subject}: kiszállításra kész. Fuvar indítható a Minőség részletnézetéből.`, "ch-prod");
      else postSystem(`🔍 ${id} — ${lbl}.`, "ch-prod");
      emit();
      return true;
    },
    setQaCheck(id, idx, value) {
      ensure();
      set((s) => ({ qaInspections: s.qaInspections.map((x) => (x.id === id ? { ...x, checklist: (x.checklist || []).map((c, i) => (i === idx ? { ...c, ok: value } : c)) } : x)) }));
      emit();
    },
    addQaDefect(id, data) {
      ensure();
      if (!data || !data.note || !data.note.trim()) return;
      const d = { sev: data.sev || "minor", note: data.note.trim() };
      set((s) => ({ qaInspections: s.qaInspections.map((x) => (x.id === id ? { ...x, defects: [...(x.defects || []), d], log: [...(x.log || []), { at: nowStamp(), text: `Hibatétel: ${(window.QA_DEFECT_SEV[d.sev] || {}).label || d.sev} — ${d.note}` }] } : x)) }));
      emit();
    },
    removeQaDefect(id, idx) {
      ensure();
      set((s) => ({ qaInspections: s.qaInspections.map((x) => (x.id === id ? { ...x, defects: (x.defects || []).filter((_, i) => i !== idx) } : x)) }));
      emit();
    },

    // ── MUNKAVÉDELEM / EHS — üzemi munkavédelem ───────────────────────────────
    //   FSM az incidensen (EhsEngine). Bejelentés PERM-MENTES (bárki rögzíthet
    //   near-misst, mint createTicket); a státuszváltás + a kockázat-/oktatás-
    //   szerkesztés `ehs.manage` joghoz kötött. A CAPA-akciók a Feladataimban.
    ehsIncidentList() { ensure(); return state.ehsIncidents || []; },
    findEhsIncident(id) { ensure(); return (state.ehsIncidents || []).find((x) => x.id === id); },
    ehsIncidentsOpen() { ensure(); return (state.ehsIncidents || []).filter((x) => window.EhsEngine && window.EhsEngine.isOpen(x)); },
    _nextEhsIncId() { const seq = (state.ehsIncSeq || 0) + 1; return { id: `EHS-2426-${String(seq).padStart(3, "0")}`, seq }; },
    addEhsIncident(data) {
      ensure();
      const { id, seq } = api._nextEhsIncId();
      const type = data.type || "kvazi";
      const inc = {
        id, type, sev: data.sev || "konnyu", status: "bejelentve",
        subject: (data.subject || "").trim(), location: (data.location || "").trim(),
        assetId: data.assetId || null, assetLabel: (data.assetLabel || "").trim(),
        reporter: (data.reporter || api.currentWorkerName() || "").trim(), investigator: "",
        occurredAt: data.occurredAt || today, reportedAt: today, dueDate: data.dueDate || "",
        note: (data.note || "").trim(), actions: [],
        log: [{ at: nowStamp(), text: `${(window.EHS_INC_TYPE[type] || {}).label || type} bejelentve${data.reporter ? ` (${data.reporter})` : ""}` }],
      };
      set((s) => ({ ehsIncidents: [inc, ...(s.ehsIncidents || [])], ehsIncSeq: seq }));
      postSystem(`⚠️ Munkavédelmi bejelentés (${id}) — ${inc.subject}.`, "ch-prod");
      emit();
      return id;
    },
    setEhsIncidentStatus(id, to, opts = {}) {
      ensure();
      if (!api.hasPerm("ehs.manage")) { if (window.toast) window.toast("Nincs jogosultság (ehs.manage).", "error"); return false; }
      const inc = (state.ehsIncidents || []).find((x) => x.id === id);
      if (!inc) return false;
      if (!(window.EhsEngine && window.EhsEngine.canGo(inc, to))) { if (window.toast) window.toast("Nem engedélyezett státuszváltás.", "error"); return false; }
      if (to === "elutasitva" && !(opts.reason && opts.reason.trim())) { if (window.toast) window.toast("Elutasításhoz indok kötelező.", "error"); return false; }
      const lbl = (window.EHS_INC_STATUS[to] || {}).label || to;
      const patch = { status: to, log: [...(inc.log || []), { at: nowStamp(), text: `Státusz → ${lbl}${opts.reason ? ` (${opts.reason.trim()})` : ""}` }] };
      if (to === "intezkedes" && !inc.investigator) patch.investigator = api.currentWorkerName() || "";
      if (to === "lezarva") patch.closedAt = today;
      set((s) => ({ ehsIncidents: s.ehsIncidents.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      emit();
      return true;
    },
    setEhsInvestigator(id, name) {
      ensure();
      set((s) => ({ ehsIncidents: s.ehsIncidents.map((x) => (x.id === id ? { ...x, investigator: name } : x)) }));
      emit();
    },
    addEhsAction(id, data) {
      ensure();
      if (!data || !data.text || !data.text.trim()) return;
      const act = { id: "a" + Date.now().toString(36), text: data.text.trim(), owner: (data.owner || "").trim(), due: data.due || "", done: false };
      set((s) => ({ ehsIncidents: s.ehsIncidents.map((x) => (x.id === id ? { ...x, actions: [...(x.actions || []), act], log: [...(x.log || []), { at: nowStamp(), text: `Intézkedés rögzítve: ${act.text}` }] } : x)) }));
      emit();
    },
    toggleEhsAction(id, actionId) {
      ensure();
      set((s) => ({ ehsIncidents: s.ehsIncidents.map((x) => (x.id === id ? { ...x, actions: (x.actions || []).map((a) => a.id === actionId ? { ...a, done: !a.done } : a) } : x)) }));
      emit();
    },
    removeEhsAction(id, actionId) {
      ensure();
      set((s) => ({ ehsIncidents: s.ehsIncidents.map((x) => (x.id === id ? { ...x, actions: (x.actions || []).filter((a) => a.id !== actionId) } : x)) }));
      emit();
    },

    // ── EHS kockázatértékelés (SZÁMÍTOTT pont — EhsEngine) ──
    ehsRiskList() { ensure(); return state.ehsRisks || []; },
    findEhsRisk(id) { ensure(); return (state.ehsRisks || []).find((x) => x.id === id); },
    _nextEhsRiskId() { const seq = (state.ehsRiskSeq || 0) + 1; return { id: `EHS-R-${String(seq).padStart(3, "0")}`, seq }; },
    addEhsRisk(data) {
      ensure();
      if (!api.hasPerm("ehs.manage")) { if (window.toast) window.toast("Nincs jogosultság (ehs.manage).", "error"); return null; }
      const { id, seq } = api._nextEhsRiskId();
      const L = Math.max(1, Math.min(5, Number(data.likelihood) || 3));
      const S = Math.max(1, Math.min(5, Number(data.severity) || 3));
      const r = {
        id, title: (data.title || "").trim(), scope: (data.scope || "").trim(), icon: data.icon || "alert",
        assetId: data.assetId || null, assetLabel: (data.assetLabel || "").trim(), hazard: (data.hazard || "").trim(),
        likelihood: L, severity: S, owner: (data.owner || "").trim(),
        assessedAt: today, reviewDue: data.reviewDue || api._ehsPlusYear(today),
        controls: Array.isArray(data.controls) ? data.controls : [], resL: L, resS: S,
      };
      set((s) => ({ ehsRisks: [r, ...(s.ehsRisks || [])], ehsRiskSeq: seq }));
      emit();
      return id;
    },
    updateEhsRisk(id, patch) {
      ensure();
      if (!api.hasPerm("ehs.manage")) { if (window.toast) window.toast("Nincs jogosultság (ehs.manage).", "error"); return; }
      set((s) => ({ ehsRisks: (s.ehsRisks || []).map((r) => r.id === id ? { ...r, ...patch } : r) }));
      emit();
    },
    addEhsRiskControl(id, text) {
      ensure();
      if (!text || !text.trim()) return;
      set((s) => ({ ehsRisks: (s.ehsRisks || []).map((r) => r.id === id ? { ...r, controls: [...(r.controls || []), text.trim()] } : r) }));
      emit();
    },
    removeEhsRiskControl(id, idx) {
      ensure();
      set((s) => ({ ehsRisks: (s.ehsRisks || []).map((r) => r.id === id ? { ...r, controls: (r.controls || []).filter((_, i) => i !== idx) } : r) }));
      emit();
    },
    _ehsPlusYear(d) { const p = new Date(d); p.setFullYear(p.getFullYear() + 1); return p.toISOString().slice(0, 10); },
    reviewEhsRisk(id) {
      ensure();
      if (!api.hasPerm("ehs.manage")) { if (window.toast) window.toast("Nincs jogosultság (ehs.manage).", "error"); return; }
      set((s) => ({ ehsRisks: (s.ehsRisks || []).map((r) => r.id === id ? { ...r, assessedAt: today, reviewDue: api._ehsPlusYear(today) } : r) }));
      if (window.toast) window.toast("Kockázat felülvizsgálva — következő esedékesség +1 év.", "success");
      emit();
    },

    // ── EHS oktatás / kompetencia (lejárat-figyelés) ──
    ehsTrainingList() { ensure(); return state.ehsTrainings || []; },
    _nextEhsTrainId() { const seq = (state.ehsTrainSeq || 0) + 1; return { id: `EHS-T-${String(seq).padStart(3, "0")}`, seq }; },
    addEhsTraining(data) {
      ensure();
      if (!data || !data.empId || !data.kind) return null;
      const { id, seq } = api._nextEhsTrainId();
      const km = (window.EHS_TRAIN_KIND || {})[data.kind] || {};
      const t = { id, empId: data.empId, kind: data.kind, completedAt: data.completedAt || today, validMonths: data.validMonths || km.validMonths || 12 };
      set((s) => ({ ehsTrainings: [t, ...(s.ehsTrainings || [])], ehsTrainSeq: seq }));
      emit();
      return id;
    },
    renewEhsTraining(id) {
      ensure();
      set((s) => ({ ehsTrainings: (s.ehsTrainings || []).map((t) => t.id === id ? { ...t, completedAt: today } : t) }));
      if (window.toast) window.toast("Oktatás megújítva — érvényesség újraindult.", "success");
      emit();
    },
    removeEhsTraining(id) {
      ensure();
      set((s) => ({ ehsTrainings: (s.ehsTrainings || []).filter((t) => t.id !== id) }));
      emit();
    },

    // ── BESZÁLLÍTÓI PORTÁL — kétoldalú nézet a meglévő RFQ/PO entitásokra ──
    //   Nincs új entitás: a beszállító a SAJÁT szeletét látja (név szerint
    //   szűrve) és a meglévő FSM beszállítói oldali akcióit végzi (ajánlat-
    //   beadás az RFQ-ra, PO-visszaigazolás + feladás/ASN). Egy igazságforrás.
    supplierName() { ensure(); const a = api.currentAccount(); return (a && (a.supplierName || a.name)) || ""; },
    isSupplierPortal() { ensure(); const a = api.currentAccount(); return !!(a && a.portal === "supplier"); },
    supplierRfqs(name) { ensure(); const n = name || api.supplierName(); return (state.rfqs || []).filter((r) => (r.suppliers || []).some((s) => s.name === n)); },
    supplierPos(name) { ensure(); const n = name || api.supplierName(); return (state.pos || []).filter((p) => p.supplier === n && p.status !== "draft"); },
    // egy RFQ státusza ennél a beszállítónál: beadando / beadva / nyertes / elveszett / lezart
    supplierRfqState(rfq, name) {
      const n = name || api.supplierName();
      const sup = (rfq.suppliers || []).find((s) => s.name === n);
      if (!sup) return "—";
      if (rfq.status === "odaitelve") return rfq.awardedTo === n ? "nyertes" : "elveszett";
      if (rfq.status === "visszavonva") return "lezart";
      if (sup.responded) return "beadva";
      if (rfq.status === "kikuldve") return "beadando";
      return "—";
    },
    submitSupplierBid(rfqId, bidsByLine, note) {
      ensure();
      const name = api.supplierName();
      const rfq = (state.rfqs || []).find((r) => r.id === rfqId);
      if (!rfq) return false;
      if (rfq.status !== "kikuldve") { if (window.toast) window.toast("Ez az ajánlatkérés már nem fogad ajánlatot.", "error"); return false; }
      set((s) => ({ rfqs: s.rfqs.map((r) => r.id !== rfqId ? r : {
        ...r,
        suppliers: (r.suppliers || []).map((sup) => sup.name !== name ? sup : { ...sup, responded: true, respondedAt: today, note: (note || "").trim(), bids: bidsByLine || {} }),
        log: [...(r.log || []), { at: nowStamp(), text: `${name} ajánlata beérkezett (portál)` }],
      }) }));
      postSystem(`📨 ${name} ajánlatot adott — ${rfq.title} (${rfqId}).`, "ch-beszerzes");
      emit();
      return true;
    },
    acknowledgePO(poId, opts = {}) {
      ensure();
      const name = api.supplierName();
      set((s) => ({ pos: s.pos.map((p) => p.id !== poId ? p : { ...p, ackAt: today, promiseDate: opts.promiseDate || p.eta, supplierLog: [...(p.supplierLog || []), { at: nowStamp(), text: `Visszaigazolva${opts.promiseDate ? ` — vállalt szállítás: ${opts.promiseDate}` : ""}` }] }) }));
      postSystem(`✅ ${name} visszaigazolta a megrendelést: ${poId}.`, "ch-beszerzes");
      emit();
    },
    markPOShipped(poId) {
      ensure();
      const name = api.supplierName();
      set((s) => ({ pos: s.pos.map((p) => p.id !== poId ? p : { ...p, shipped: true, shippedAt: today, supplierLog: [...(p.supplierLog || []), { at: nowStamp(), text: "Feladva (ASN — szállítási értesítő)" }] }) }));
      postSystem(`🚚 ${name} feladta a szállítmányt: ${poId}.`, "ch-beszerzes");
      emit();
    },

    // ── BESZÁLLÍTÓI SZÁMLA-BENYÚJTÁS (4.12 — a befelé jövő lánc pénzügyi zárása) ──
    //   A beszállító a portálon a feladott/bevételezett megrendelésére számlát nyújt
    //   be → dir:"in" számla-PISZKOZAT a Pénzügyben (befogadásra vár). A befogadás
    //   (issueInvoice) és a kifizetés a finance.manage joghoz kötött marad. NINCS új
    //   entitás — a meglévő finInvoices FSM másik belépő-pontja. Egy igazságforrás.
    _nextSupplierInvId() {
      const max = (state.finInvoices || []).reduce((m, v) => {
        if (!/^SINV-2426-/.test(v.id || "")) return m;
        const n = parseInt(String(v.id).split("-").pop(), 10);
        return Number.isFinite(n) && n > m ? n : m;
      }, 44);
      return "SINV-2426-" + String(max + 1).padStart(3, "0");
    },
    poInvoice(poId) { ensure(); return (state.finInvoices || []).find((v) => v.dir === "in" && v.orderRef === poId && v.status !== "void") || null; },
    poInvoiceable(po) {
      if (!po || po.status === "draft") return false;
      if (!(po.shipped || po.status === "delivered")) return false;
      return !api.poInvoice(po.id);
    },
    supplierInvoices(name) {
      ensure();
      const n = name || api.supplierName();
      return (state.finInvoices || []).filter((v) => v.dir === "in" && v.party === n)
        .sort((a, b) => (b.issueDate || "").localeCompare(a.issueDate || ""));
    },
    submitSupplierInvoice(poId, data = {}) {
      ensure();
      const name = api.supplierName();
      const po = (state.pos || []).find((p) => p.id === poId);
      if (!po) { if (window.toast) window.toast("Ismeretlen megrendelés.", "error"); return null; }
      const existing = api.poInvoice(poId);
      if (existing) { if (window.toast) window.toast(`Erre a megrendelésre már nyújtottál be számlát (${existing.id}).`, "info"); return existing.id; }
      const id = api._nextSupplierInvId();
      const addDays = (d, n) => { const dt = new Date((d || today) + "T00:00:00"); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };
      const issueDate = data.issueDate || today;
      const poLines = (po.lines && po.lines.length) ? po.lines : (po.material ? [{ material: po.material, qty: po.qty, price: po.unitPrice || 0, unit: po.unit || "db" }] : []);
      const lines = (data.lines && data.lines.length)
        ? data.lines.map((l) => ({ name: l.name || l.material || "Tétel", qty: Number(l.qty) || 1, unit: l.unit || "db", unitPrice: Number(l.unitPrice != null ? l.unitPrice : l.price) || 0, vat: Number(l.vat != null ? l.vat : 27) }))
        : poLines.map((l) => ({ name: l.material || l.name || "Tétel", qty: Number(l.qty) || 1, unit: l.unit || "db", unitPrice: Number(l.price) || 0, vat: 27 }));
      const inv = {
        id, dir: "in", kind: "normal", party: name, orderRef: poId,
        extNo: (data.extNo || "").trim(), status: "draft",
        issueDate, dueDate: data.dueDate || addDays(issueDate, 30),
        currency: po.currency || "HUF", fxRate: po.fxRate,
        issuer: name, submittedVia: "supplier", submittedAt: today,
        note: (data.note || "").trim(), lines,
      };
      set((s) => ({
        finInvoices: [inv, ...s.finInvoices],
        pos: s.pos.map((p) => p.id !== poId ? p : { ...p, invoiceId: id, supplierLog: [...(p.supplierLog || []), { at: nowStamp(), text: `Számla benyújtva (${id})` }] }),
      }));
      postSystem(`🧾 ${name} számlát nyújtott be a portálon: ${id} — ${poId} (befogadásra vár a Pénzügyben).`, "ch-beszerzes");
      emit();
      if (window.toast) window.toast(`✓ Számla benyújtva — ${id}`, "success");
      return id;
    },

    // ── DOKUMENTUMTÁR — verziózott dokumentum-regiszter (egy igazságforrás) ──
    docList() { ensure(); return state.documents || []; },
    findDoc(id) { ensure(); return (state.documents || []).find((d) => d.id === id); },
    docsFor(linkType, linkId) { ensure(); return (state.documents || []).filter((d) => d.linkType === linkType && d.linkId === linkId); },
    _nextDocId() {
      const maxExisting = (state.documents || []).reduce((m, d) => {
        const n = parseInt(String(d.id || "").split("-").pop(), 10);
        return Number.isFinite(n) && n > m ? n : m;
      }, 0);
      const seq = Math.max(state.docSeq || 0, maxExisting) + 1;
      return { id: `DOC-2426-${String(seq).padStart(3, "0")}`, seq };
    },
    addDocument(data) {
      ensure();
      if (!api.hasPerm("docs.manage")) { if (window.toast) window.toast("Nincs jogosultság dokumentum rögzítéséhez (docs.manage).", "error"); return null; }
      const { id, seq } = api._nextDocId();
      const doc = { id, name: (data.name || "").trim(), type: data.type || "egyeb", version: 1, status: "piszkozat",
        linkType: data.linkType || "none", linkId: data.linkId || null, linkLabel: data.linkLabel || "",
        owner: data.owner || api._crmOwner(), updatedAt: today, fileLabel: (data.fileLabel || "").trim(), note: (data.note || "").trim(),
        history: [{ v: 1, at: today, note: "Piszkozat létrehozva", status: "piszkozat" }] };
      if (!doc.name) { if (window.toast) window.toast("A dokumentum neve kötelező.", "warning"); return null; }
      set((s) => ({ documents: [doc, ...(s.documents || [])], docSeq: seq }));
      postSystem(`📄 Új dokumentum (${id}) — ${doc.name}.`);
      emit();
      return id;
    },
    setDocStatus(id, to, opts = {}) {
      ensure();
      if (!api.hasPerm("docs.manage")) { if (window.toast) window.toast("Nincs jogosultság (docs.manage).", "error"); return false; }
      const doc = (state.documents || []).find((d) => d.id === id);
      if (!doc) return false;
      if (!(window.DocsEngine && window.DocsEngine.canGo(doc, to))) { if (window.toast) window.toast("Nem engedélyezett státuszváltás.", "error"); return false; }
      const lbl = (window.DOC_STATUS[to] || {}).label || to;
      const hist = [...(doc.history || [])];
      if (hist.length) hist[hist.length - 1] = { ...hist[hist.length - 1], status: to };
      set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, status: to, updatedAt: today, history: hist } : d)) }));
      postSystem(`📄 ${id} — ${lbl}.`);
      emit();
      return true;
    },
    newDocVersion(id, opts = {}) {
      ensure();
      if (!api.hasPerm("docs.manage")) { if (window.toast) window.toast("Nincs jogosultság (docs.manage).", "error"); return false; }
      const doc = (state.documents || []).find((d) => d.id === id);
      if (!doc) return false;
      const v = (doc.version || 1) + 1;
      const entry = { v, at: today, note: (opts.note || "Új verzió").trim(), status: "ellenorzes" };
      set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, version: v, status: "ellenorzes", updatedAt: today, history: [...(d.history || []), entry] } : d)) }));
      postSystem(`📄 ${id} — új verzió (v${v}), ellenőrzésre.`);
      emit();
      if (window.toast) window.toast(`✓ Új verzió: v${v}`, "success");
      return v;
    },
    updateDocument(id, patch) {
      ensure();
      if (!api.hasPerm("docs.manage")) { if (window.toast) window.toast("Nincs jogosultság (docs.manage).", "error"); return; }
      set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: today } : d)) }));
      emit();
    },

    // ── IDŐ & JELENLÉT — napi jelenlét (a dolgozó = HR; ide csak hivatkozunk) ──
    attList() { ensure(); return state.attendance || []; },
    attFor(empId) { ensure(); return (state.attendance || []).filter((e) => e.empId === empId); },
    attToday() { ensure(); return (state.attendance || []).filter((e) => e.date === (state.today || ATT_TODAY)); },
    _attClock() { try { return new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return "08:00"; } },
    _nextAttId() { const seq = (state.attSeq || 0) + 1; return { id: `ATT-${String(seq).padStart(4, "0")}`, seq }; },
    clockIn(empId, opts = {}) {
      ensure();
      const d = state.today || ATT_TODAY;
      const openOne = (state.attendance || []).find((e) => e.empId === empId && e.date === d && e.status === "bejelentkezve");
      if (openOne) { if (window.toast) window.toast("Már be van jelentkezve.", "info"); return openOne.id; }
      const { id, seq } = api._nextAttId();
      const e = { id, empId, date: d, type: opts.type || "munka", clockIn: api._attClock(), clockOut: null, status: "bejelentkezve", note: opts.note || "" };
      set((s) => ({ attendance: [e, ...(s.attendance || [])], attSeq: seq }));
      emit();
      if (window.toast) window.toast(`✓ Bejelentkezve: ${e.clockIn}`, "success");
      return id;
    },
    clockOut(id) {
      ensure();
      const e = (state.attendance || []).find((x) => x.id === id);
      if (!e || e.status !== "bejelentkezve") return false;
      set((s) => ({ attendance: s.attendance.map((x) => (x.id === id ? { ...x, clockOut: api._attClock(), status: "kijelentkezve" } : x)) }));
      emit();
      if (window.toast) window.toast("✓ Kijelentkezve", "success");
      return true;
    },
    addAttendance(data) {
      ensure();
      if (!api.hasPerm("attendance.manage")) { if (window.toast) window.toast("Nincs jogosultság bejegyzés rögzítéséhez (attendance.manage).", "error"); return null; }
      if (!data.empId) return null;
      const { id, seq } = api._nextAttId();
      const e = { id, empId: data.empId, date: data.date || today, type: data.type || "munka", clockIn: data.clockIn || "07:00", clockOut: data.clockOut || null, status: data.clockOut ? "kijelentkezve" : "bejelentkezve", note: (data.note || "").trim() };
      set((s) => ({ attendance: [e, ...(s.attendance || [])], attSeq: seq }));
      emit();
      return id;
    },
    setAttStatus(id, to, opts = {}) {
      ensure();
      const e = (state.attendance || []).find((x) => x.id === id);
      if (!e) return false;
      if (!(window.AttEngine && window.AttEngine.canGo(e, to))) { if (window.toast) window.toast("Nem engedélyezett státuszváltás.", "error"); return false; }
      // jóváhagyás / elutasítás joghoz kötött
      if ((to === "jovahagyva" || to === "elutasitva") && !api.hasPerm("attendance.manage")) { if (window.toast) window.toast("Nincs jogosultság a jóváhagyáshoz (attendance.manage).", "error"); return false; }
      const patch = { status: to };
      if (to === "jovahagyva") { const me = api.currentAccount(); patch.approvedBy = me ? me.contact.split(" · ")[0] : "Admin"; }
      if (to === "elutasitva") patch.rejectReason = (opts.reason || "").trim();
      set((s) => ({ attendance: s.attendance.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      emit();
      return true;
    },
    removeAttendance(id) {
      ensure();
      if (!api.hasPerm("attendance.manage")) { if (window.toast) window.toast("Nincs jogosultság (attendance.manage).", "error"); return; }
      set((s) => ({ attendance: (s.attendance || []).filter((x) => x.id !== id) }));
      emit();
    },

    // ── CRM / LEAD-PIPELINE — lead + opportunity FSM, az ajánlat-FSM ELÉ fűzve ──
    // Két entitás (leads + opportunities) saját FSM-mel; a konverzió köti össze
    // őket, a lánc vége a meglévő createQuote + új ügyfél a CUSTOMERS-be. A
    // státusz az entitáson él; az átmenet validált FSM (CrmEngine). crm.manage jog.
    leadList() { ensure(); return state.leads || []; },
    findLead(id) { ensure(); return (state.leads || []).find((l) => l.id === id); },
    leadsOpen() { ensure(); return (state.leads || []).filter((l) => window.CrmEngine && window.CrmEngine.leadIsOpen(l)); },
    oppList() { ensure(); return state.opportunities || []; },
    findOpp(id) { ensure(); return (state.opportunities || []).find((o) => o.id === id); },
    oppsOpen() { ensure(); return (state.opportunities || []).filter((o) => window.CrmEngine && window.CrmEngine.oppIsOpen(o)); },
    crmTaskList() { ensure(); return state.crmTasks || []; },
    crmTasksFor(refId) { ensure(); return (state.crmTasks || []).filter((t) => t.refId === refId); },
    _crmOwner() { const me = api.currentAccount(); return me ? me.contact.split(" · ")[0] : "—"; },

    addLead(data) {
      ensure();
      if (!api.hasPerm("crm.manage")) { if (window.toast) window.toast("Nincs jogosultság lead rögzítéséhez (crm.manage).", "error"); return null; }
      const seq = (state.leadSeq || 0) + 1;
      const id = `LEAD-2426-${String(seq).padStart(3, "0")}`;
      const owner = data.owner || api._crmOwner();
      const src = data.source || "telefon";
      const lead = { id, status: "uj", source: src, owner,
        company: (data.company || "").trim(), contact: (data.contact || "").trim(), email: (data.email || "").trim(), phone: (data.phone || "").trim(), city: (data.city || "").trim(),
        title: (data.title || "").trim(), interest: (data.interest || "").trim(), estValue: Number(data.estValue) || 0, createdAt: today, referredBy: data.referredBy || null,
        activities: [{ at: nowStamp(), kind: "megjegyzes", who: owner, text: `Lead rögzítve (${(window.CRM_SOURCE_META[src] || {}).label || src}).` }] };
      set((s) => ({ leads: [lead, ...(s.leads || [])], leadSeq: seq }));
      postSystem(`🎯 Új lead (${id}) — ${lead.title || lead.contact}, forrás: ${(window.CRM_SOURCE_META[src] || {}).label || src}.`);
      emit();
      return id;
    },
    // Webshop érdeklődés → auto-lead (mint a service auto-jegy; nincs perm-kapu)
    createLeadFromWebshop(data) {
      ensure();
      const seq = (state.leadSeq || 0) + 1;
      const id = `LEAD-2426-${String(seq).padStart(3, "0")}`;
      const lead = { id, status: "uj", source: "webshop", owner: "Szabó A.",
        company: (data.company || "").trim(), contact: (data.contact || "").trim(), email: (data.email || "").trim(), phone: (data.phone || "").trim(), city: (data.city || "").trim(),
        title: (data.title || "Webshop érdeklődés").trim(), interest: (data.interest || "").trim(), estValue: Number(data.estValue) || 0, createdAt: today, referredBy: null,
        activities: [{ at: nowStamp(), kind: "megjegyzes", who: "Rendszer", text: "Webshop érdeklődésből automatikusan létrehozva." }] };
      set((s) => ({ leads: [lead, ...(s.leads || [])], leadSeq: seq }));
      postSystem(`🎯 Új webshop-lead (${id}) — ${lead.contact || "—"}: ${lead.title}.`);
      emit();
      return id;
    },
    addLeadActivity(id, opts = {}) {
      ensure();
      const l = (state.leads || []).find((x) => x.id === id);
      if (!l || !opts.text || !opts.text.trim()) return;
      const act = { at: nowStamp(), kind: opts.kind || "megjegyzes", who: api._crmOwner(), text: opts.text.trim() };
      set((s) => ({ leads: s.leads.map((x) => (x.id === id ? { ...x, activities: [...(x.activities || []), act] } : x)) }));
      emit();
    },
    setLeadStatus(id, to, opts = {}) {
      ensure();
      if (!api.hasPerm("crm.manage")) { if (window.toast) window.toast("Nincs jogosultság a státuszváltáshoz (crm.manage).", "error"); return false; }
      const l = (state.leads || []).find((x) => x.id === id);
      if (!l) return false;
      if (to === "konvertalva") return !!api.convertLeadToOpp(id, opts); // dedikált konverzió
      if (!(window.CrmEngine && window.CrmEngine.leadCanGo(l, to))) { if (window.toast) window.toast("Nem engedélyezett státuszváltás.", "error"); return false; }
      if (to === "elvetve" && !(opts.reason && opts.reason.trim())) { if (window.toast) window.toast("Indoklás kötelező az elvetéshez.", "warning"); return false; }
      const lbl = (window.LEAD_STATUS[to] || {}).label || to;
      const act = { at: nowStamp(), kind: "megjegyzes", who: api._crmOwner(), text: `Státusz → ${lbl}${opts.reason ? ` (${opts.reason.trim()})` : ""}` };
      const patch = { status: to, activities: [...(l.activities || []), act] };
      if (to === "elvetve") patch.lostReason = opts.reason.trim();
      set((s) => ({ leads: s.leads.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      postSystem(`🎯 ${id} — ${lbl}.`);
      emit();
      return true;
    },
    // Lead → Lehetőség konverzió (a kettő közti kézfogás)
    convertLeadToOpp(id, opts = {}) {
      ensure();
      if (!api.hasPerm("crm.manage")) { if (window.toast) window.toast("Nincs jogosultság (crm.manage).", "error"); return null; }
      const l = (state.leads || []).find((x) => x.id === id);
      if (!l) return null;
      if (!["minosites", "nurturing"].includes(l.status)) { if (window.toast) window.toast("Csak minősített vagy nurturing lead konvertálható.", "warning"); return null; }
      const oseq = (state.oppSeq || 0) + 1;
      const oid = `OPP-2426-${String(oseq).padStart(3, "0")}`;
      const custName = l.company || l.contact;
      const isNew = !(state.customers || []).some((c) => c.name === custName);
      const opp = { id: oid, status: "nyitott", owner: l.owner, customer: custName, contact: l.contact, phone: l.phone, city: l.city,
        title: l.title, value: l.estValue || 0, source: l.source, fromLead: l.id, expectedClose: "", isNewCustomer: isNew, createdAt: today,
        activities: [{ at: nowStamp(), kind: "megjegyzes", who: l.owner, text: `Lehetőség létrehozva a ${l.id} minősített leadből.` }] };
      const leadAct = { at: nowStamp(), kind: "megjegyzes", who: l.owner, text: `Konvertálva → ${oid}` };
      set((s) => ({
        opportunities: [opp, ...(s.opportunities || [])], oppSeq: oseq,
        leads: s.leads.map((x) => (x.id === id ? { ...x, status: "konvertalva", oppId: oid, activities: [...(x.activities || []), leadAct] } : x)),
      }));
      postSystem(`➡️ Lead konvertálva: ${l.id} → ${oid} (${custName}, ~${(((opp.value || 0) / 1e6)).toFixed(1)} M Ft).`);
      emit();
      if (window.toast) window.toast(`✓ Lehetőség létrehozva: ${oid}`, "success");
      return oid;
    },
    addOpp(data) {
      ensure();
      if (!api.hasPerm("crm.manage")) { if (window.toast) window.toast("Nincs jogosultság lehetőség rögzítéséhez (crm.manage).", "error"); return null; }
      const seq = (state.oppSeq || 0) + 1;
      const id = `OPP-2426-${String(seq).padStart(3, "0")}`;
      const owner = data.owner || api._crmOwner();
      const custName = (data.customer || "").trim();
      const isNew = !(state.customers || []).some((c) => c.name === custName);
      const opp = { id, status: "nyitott", owner, customer: custName, contact: (data.contact || "").trim(), phone: (data.phone || "").trim(), city: (data.city || "").trim(),
        title: (data.title || "").trim(), value: Number(data.value) || 0, source: data.source || "telefon", fromLead: null, expectedClose: data.expectedClose || "", isNewCustomer: isNew, createdAt: today,
        activities: [{ at: nowStamp(), kind: "megjegyzes", who: owner, text: "Lehetőség közvetlenül rögzítve." }] };
      set((s) => ({ opportunities: [opp, ...(s.opportunities || [])], oppSeq: seq }));
      postSystem(`💼 Új lehetőség (${id}) — ${custName}: ${opp.title}.`);
      emit();
      return id;
    },
    addOppActivity(id, opts = {}) {
      ensure();
      const o = (state.opportunities || []).find((x) => x.id === id);
      if (!o || !opts.text || !opts.text.trim()) return;
      const act = { at: nowStamp(), kind: opts.kind || "megjegyzes", who: api._crmOwner(), text: opts.text.trim() };
      set((s) => ({ opportunities: s.opportunities.map((x) => (x.id === id ? { ...x, activities: [...(x.activities || []), act] } : x)) }));
      emit();
    },
    setOppStatus(id, to, opts = {}) {
      ensure();
      if (!api.hasPerm("crm.manage")) { if (window.toast) window.toast("Nincs jogosultság a státuszváltáshoz (crm.manage).", "error"); return false; }
      const o = (state.opportunities || []).find((x) => x.id === id);
      if (!o) return false;
      if (!(window.CrmEngine && window.CrmEngine.oppCanGo(o, to))) { if (window.toast) window.toast("Nem engedélyezett státuszváltás.", "error"); return false; }
      if (to === "elveszett" && !(opts.reason && opts.reason.trim())) { if (window.toast) window.toast("Indoklás kötelező a vesztéshez.", "warning"); return false; }
      if (to === "megnyert") return api.winOpp(id, opts);
      const lbl = (window.OPP_STATUS[to] || {}).label || to;
      const act = { at: nowStamp(), kind: "megjegyzes", who: api._crmOwner(), text: `Státusz → ${lbl}${opts.reason ? ` (${opts.reason.trim()})` : ""}` };
      const patch = { status: to, activities: [...(o.activities || []), act] };
      if (to === "elveszett") { patch.lostReason = opts.reason.trim(); patch.lostAt = today; }
      set((s) => ({ opportunities: s.opportunities.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      postSystem(`💼 ${id} — ${lbl}.`);
      emit();
      return true;
    },
    // Lehetőség → ajánlat: a meglévő createQuote-ot hívja (Sales világ) + linkel
    oppCreateQuote(id) {
      ensure();
      if (!api.hasPerm("quote.create")) { if (window.toast) window.toast("Nincs jogosultság ajánlat létrehozásához (quote.create).", "error"); return null; }
      const o = (state.opportunities || []).find((x) => x.id === id);
      if (!o) return null;
      if (o.quoteId) { if (window.toast) window.toast(`Már van linkelt ajánlat: ${o.quoteId}`, "info"); return o.quoteId; }
      // Vázlat-ajánlat az Értékesítésben (egy összevont tételsorral; a tételes
      // összeállítás az ItemBuilderben, a Sales világban történik) + feladat.
      const lines = [{ name: o.title || "Egyedi bútor tétel", code: o.id, unit: "tétel", qty: 1, price: o.value || 0, vat: 27 }];
      const qid = api.createQuote({ customer: o.customer, lines, owner: o.owner });
      if (!qid) return null;
      const act = { at: nowStamp(), kind: "email", who: o.owner, text: `Vázlat-ajánlat (${qid}) létrehozva az Értékesítésben — összeállításra vár.` };
      const patch = { quoteId: qid, activities: [...(o.activities || []), act] };
      // a vázlat létrehozása = összeállítás kezdete: előre lépés "osszeallitas"-ra
      const order = (window.OPP_FLOW || {}).order || [];
      const curIdx = order.indexOf(o.status), tgtIdx = order.indexOf("osszeallitas");
      if (curIdx >= 0 && tgtIdx >= 0 && curIdx < tgtIdx) patch.status = "osszeallitas";
      set((s) => ({ opportunities: s.opportunities.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      // Feladat: az ajánlatot tételesen össze kell állítani / véglegesíteni az Értékesítésben
      const due = (() => { const [y, m, d] = (today || "2026-04-28").split("-").map(Number); const dt = new Date(y, m - 1, d + 3); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; })();
      api.addCrmTask({ refType: "opp", refId: id, title: `Ajánlat összeállítása az Értékesítésben — ${qid}`, due, priority: "magas", owner: o.owner });
      postSystem(`📝 Vázlat-ajánlat (${qid}) a(z) ${id} lehetőséghez — összeállításra vár az Értékesítésben.`);
      emit();
      if (window.toast) window.toast(`✓ Vázlat-ajánlat: ${qid} · feladat létrehozva`, "success");
      return qid;
    },
    // Lehetőség → koncepció: a FŐ lánc tervezési láncszeme (CRM → Belsőépítészet).
    // A meglévő createConcept-et hívja + kétirányú link (opp.conceptRef ↔ concept.oppRef).
    // Perm-mentes (a koncepció-létrehozás is az); duplikátum-véd a conceptRef-en.
    oppCreateConcept(id) {
      ensure();
      const o = (state.opportunities || []).find((x) => x.id === id);
      if (!o) return null;
      if (o.conceptRef && (state.concepts || []).some((c) => c.id === o.conceptRef)) {
        if (window.toast) window.toast(`Már van koncepció a lehetőséghez: ${o.conceptRef}`, "info");
        return o.conceptRef;
      }
      const cid = `KON-2026-${String((state.concepts || []).length + 15).padStart(3, "0")}`;
      api.createConcept({ id: cid, name: o.title || `${o.customer} — koncepció`, customer: o.customer, oppRef: o.id });
      const act = { at: nowStamp(), kind: "megjegyzes", who: api._crmOwner(), text: `Koncepció indítva a Belsőépítészetben (${cid})` };
      set((s) => ({
        opportunities: s.opportunities.map((x) => (x.id === id ? { ...x, conceptRef: cid, activities: [act, ...(x.activities || [])] } : x)),
        concepts: s.concepts.map((c) => (c.id === cid ? { ...c, oppRef: o.id } : c)),
      }));
      postSystem(`🎨 CRM → Belsőépítészet: koncepció (${cid}) indult a(z) ${o.id} lehetőségből — ${o.customer}.`);
      emit();
      return cid;
    },
    // Megnyerés: megnyert státusz + ÚJ ügyfél a CUSTOMERS-be, ha még nincs
    winOpp(id, opts = {}) {
      ensure();
      if (!api.hasPerm("crm.manage")) { if (window.toast) window.toast("Nincs jogosultság (crm.manage).", "error"); return false; }
      const o = (state.opportunities || []).find((x) => x.id === id);
      if (!o) return false;
      const exists = (state.customers || []).some((c) => c.name === o.customer);
      const act = { at: nowStamp(), kind: "megjegyzes", who: opts.who || o.owner, text: `Megnyert${o.quoteId ? ` (ajánlat: ${o.quoteId})` : ""}.` };
      let custAdded = null;
      set((s) => {
        let customers = s.customers || [];
        if (!exists && o.customer) {
          const maxN = customers.reduce((m, c) => { const n = parseInt(String(c.id).replace(/\D/g, ""), 10); return isNaN(n) ? m : Math.max(m, n); }, 0);
          const cid = `C-${String(maxN + 1).padStart(3, "0")}`;
          custAdded = { id: cid, name: o.customer, city: o.city || "—", contact: o.contact || o.customer, email: "", phone: o.phone || "", openOrders: 0, ltv: 0, since: String((today || "2026").slice(0, 4)) };
          customers = [custAdded, ...customers];
        }
        return { customers, opportunities: s.opportunities.map((x) => (x.id === id ? { ...x, status: "megnyert", wonAt: today, activities: [...(x.activities || []), act] } : x)) };
      });
      postSystem(`🏆 Lehetőség megnyerve: ${id} — ${o.customer}${custAdded ? ` · új ügyfél felvéve (${custAdded.id})` : ""}.`);
      emit();
      if (window.toast) window.toast(`✓ Megnyert${custAdded ? " · új ügyfél felvéve" : ""}`, "success");
      return true;
    },
    // B2B kiadás partnernek (handshake, mint a többi világ)
    delegateOpp(id, partnerId) {
      ensure();
      const o = (state.opportunities || []).find((x) => x.id === id);
      const partner = (state.partners || []).find((x) => x.id === partnerId);
      if (!o || !partner) return;
      const hid = `HS-${o.id}`;
      const hs = { id: hid, kind: "crm", oppId: id, projectName: `${o.customer} — lehetőség`, epicTitle: o.title,
        fromCompany: "JoineryTech (belső)", partnerId, partnerName: partner.name, status: partner.platform ? "sent" : "external", external: !partner.platform, note: o.title || "", ts: nowStamp() };
      const act = { at: nowStamp(), kind: "megjegyzes", who: api._crmOwner(), text: `Kiadva: ${partner.name} (${partner.platform ? "kézfogás elküldve" : "platformon kívül"})` };
      set((s) => ({ handshakes: [hs, ...(s.handshakes || [])], opportunities: s.opportunities.map((x) => (x.id === id ? { ...x, handshakeId: hid, delegatedTo: partner.name, delegatedExternal: !partner.platform, activities: [...(x.activities || []), act] } : x)) }));
      postSystem(partner.platform ? `🤝 Lehetőség kiadva (${id}) → ${partner.name}.` : `🔗 Lehetőség külső partnerhez (${id}): ${partner.name}.`);
      emit();
    },
    recallOpp(id) {
      ensure();
      const o = (state.opportunities || []).find((x) => x.id === id);
      if (!o) return;
      const act = { at: nowStamp(), kind: "megjegyzes", who: api._crmOwner(), text: "Kiadás visszavonva" };
      set((s) => ({ handshakes: (s.handshakes || []).filter((h) => h.id !== o.handshakeId), opportunities: s.opportunities.map((x) => (x.id === id ? { ...x, handshakeId: null, delegatedTo: null, delegatedExternal: false, activities: [...(x.activities || []), act] } : x)) }));
      emit();
    },
    // Feladatok / emlékeztetők (határidő + SLA)
    addCrmTask(data) {
      ensure();
      const seq = (state.crmTaskSeq || 0) + 1;
      const id = `CRMT-${String(seq).padStart(3, "0")}`;
      const t = { id, refType: data.refType || "lead", refId: data.refId || null, title: (data.title || "").trim(), priority: data.priority || "kozepes", due: data.due || today, done: false, owner: data.owner || api._crmOwner() };
      if (!t.title) return null;
      set((s) => ({ crmTasks: [t, ...(s.crmTasks || [])], crmTaskSeq: seq }));
      emit();
      return id;
    },
    toggleCrmTask(id) {
      ensure();
      set((s) => ({ crmTasks: (s.crmTasks || []).map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }));
      emit();
    },
    removeCrmTask(id) {
      ensure();
      set((s) => ({ crmTasks: (s.crmTasks || []).filter((x) => x.id !== id) }));
      emit();
    },

    // ── REKLAMÁCIÓ — szerviz / garancia / hiánypótlás jegyek ───────────────────
    // A státusz a jegyen él; az átmenet validált FSM (ServiceEngine). Csatornák:
    // webshop / belső felvétel / Logisztika reklamáció-ág / átadási hiánylista.
    ticketList() { ensure(); return state.serviceTickets || []; },
    findTicket(id) { ensure(); return (state.serviceTickets || []).find((t) => t.id === id); },
    ticketsForCustomer(name) { ensure(); return (state.serviceTickets || []).filter((t) => t.customer === name); },
    ticketsOpen() { ensure(); return (state.serviceTickets || []).filter((t) => window.ServiceEngine && window.ServiceEngine.isOpen(t)); },

    _nextTicketId() {
      const seq = (state.svcSeq || 0) + 1;
      return { id: `REK-2426-${String(seq).padStart(3, "0")}`, seq };
    },
    _custInfo(name) {
      const c = (state.customers || []).find((x) => x.name === name) || {};
      return { contact: c.contact || name, phone: c.phone || "", address: c.city || c.address || "" };
    },

    createTicket(data) {
      ensure();
      const { id, seq } = api._nextTicketId();
      const ci = api._custInfo(data.customer || "");
      const prio = data.priority || "kozepes";
      const slaDays = (window.SVC_PRIORITY && window.SVC_PRIORITY[prio] || {}).slaDays || 7;
      const reportedAt = data.reportedAt || (state.today || "2026-04-28");
      const dueDate = data.dueDate || (window.ServiceEngine ? window.ServiceEngine.addMonths(reportedAt, 0) : reportedAt);
      // SLA határidő = reportedAt + slaDays (nap)
      const due = (() => { const d = new Date(reportedAt); d.setDate(d.getDate() + slaDays); return d.toISOString().slice(0, 10); })();
      const t = {
        id, type: data.type || "garancia", status: "bejelentve", priority: prio,
        customer: data.customer || "", contact: data.contact || ci.contact, phone: data.phone || ci.phone, address: data.address || ci.address,
        title: (data.title || "Bejelentés").trim(), desc: (data.desc || "").trim(),
        ref: data.ref || "", refLabel: data.refLabel || "", shipmentId: data.shipmentId || null, projectId: data.projectId || null,
        channel: data.channel || "internal", installedAt: data.installedAt || null, warrantyMonths: data.warrantyMonths || (window.SVC_WARRANTY_MONTHS || 24),
        resolution: data.resolution || null, reportedAt, dueDate: data.dueDate || due,
        log: [{ at: nowStamp(), text: `Bejelentve (${({ webshop: "webshop", internal: "belső felvétel", logistics: "Logisztika reklamáció", handover: "átadási hiánylista" })[data.channel] || data.channel || "belső"})` }],
      };
      set((s) => ({ serviceTickets: [t, ...(s.serviceTickets || [])], svcSeq: seq }));
      const tl = (window.SVC_TYPE_META && window.SVC_TYPE_META[t.type] || {}).label || t.type;
      postSystem(`🛠️ Új reklamáció (${id}) — ${tl}: ${t.customer} · ${t.title}.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Reklamáció rögzítve — ${id}`, "success");
      return id;
    },

    // Logisztika reklamáció-ág → auto-jegy (a setShipmentStatus hívja)
    createTicketFromShipment(shipmentId, opts = {}) {
      ensure();
      const sh = (state.shipments || []).find((x) => x.id === shipmentId);
      if (!sh) return null;
      // ne duplázzunk, ha már van jegy erre a fuvarra
      const exists = (state.serviceTickets || []).find((t) => t.shipmentId === shipmentId);
      if (exists) return exists.id;
      return api.createTicket({
        type: "garancia",
        customer: sh.customer, address: sh.address, contact: sh.contact, phone: sh.phone,
        title: opts.title || "Reklamáció a kiszállításból",
        desc: opts.reason || sh.note || "A helyszíni átadáskor jelzett probléma.",
        ref: sh.ref, refLabel: sh.refLabel, shipmentId,
        channel: "logistics", installedAt: sh.date || null, priority: "magas",
      });
    },

    // Átadási hiánylista-tétel → hiánypótlás jegy
    createTicketFromDefect(shipmentId, defectIdx) {
      ensure();
      const sh = (state.shipments || []).find((x) => x.id === shipmentId);
      if (!sh) return null;
      const d = ((sh.handover || {}).deficiencies || [])[defectIdx];
      if (!d) return null;
      return api.createTicket({
        type: "hianypotlas",
        customer: sh.customer, address: sh.address, contact: sh.contact, phone: sh.phone,
        title: d.text.length > 48 ? d.text.slice(0, 48) + "…" : d.text,
        desc: d.text,
        ref: sh.ref, refLabel: sh.refLabel, shipmentId,
        channel: "handover", installedAt: sh.date || null,
        priority: d.sev === "major" ? "magas" : "kozepes",
      });
    },

    setTicketStatus(id, to, opts = {}) {
      ensure();
      const t = (state.serviceTickets || []).find((x) => x.id === id);
      if (!t) return false;
      if (!(window.ServiceEngine && window.ServiceEngine.canGo(t, to))) {
        if (window.toast) window.toast("Nem engedélyezett átmenet.", "error");
        return false;
      }
      if (to === "elutasitva" && !(opts.reason && opts.reason.trim())) {
        if (window.toast) window.toast("Elutasításhoz indoklás kötelező.", "warning");
        return false;
      }
      const lbl = (window.SVC_STATUS && window.SVC_STATUS[to] || {}).label || to;
      const patch = { status: to, log: [...(t.log || []), { at: nowStamp(), text: `Státusz → ${lbl}${opts.reason ? ` (${opts.reason.trim()})` : ""}` }] };
      if (to === "lezarva" || to === "elutasitva") patch.closedAt = (state.today || "2026-04-28");
      set((s) => ({ serviceTickets: s.serviceTickets.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      postSystem(`🛠️ ${id} — ${lbl}.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ ${id} → ${lbl}`, "success");
      return true;
    },

    setTicketFields(id, patch) {
      ensure();
      set((s) => ({ serviceTickets: s.serviceTickets.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      emit();
    },

    // Megoldási mód kiválasztása + bekötés a többi világba
    setTicketResolution(id, resolution) {
      ensure();
      const t = (state.serviceTickets || []).find((x) => x.id === id);
      if (!t) return;
      const meta = (window.SVC_RESOLUTION || {})[resolution] || {};
      set((s) => ({ serviceTickets: s.serviceTickets.map((x) => (x.id === id ? { ...x, resolution, log: [...(x.log || []), { at: nowStamp(), text: `Megoldási mód: ${meta.label || resolution}` }] } : x)) }));
      emit();
      if (window.toast) window.toast(`✓ Megoldás: ${meta.label || resolution}`, "success");
    },

    // Helyszíni javítás → Logisztika fuvar (delivery, install)
    ticketCreateShipment(id) {
      ensure();
      const t = (state.serviceTickets || []).find((x) => x.id === id);
      if (!t || !api.createShipment) return;
      const shId = api.createShipment({
        type: t.resolution === "behuzas" ? "pickup" : "delivery", install: t.resolution !== "behuzas",
        customer: t.customer, address: t.address, contact: t.contact, phone: t.phone,
        ref: t.id, refLabel: `Reklamáció — ${t.title}`,
        note: `Szerviz-fuvar a ${t.id} reklamációhoz (${(window.SVC_RESOLUTION[t.resolution] || {}).label || ""}).`,
      });
      set((s) => ({ serviceTickets: s.serviceTickets.map((x) => (x.id === id ? { ...x, linkedShipmentId: shId, log: [...(x.log || []), { at: nowStamp(), text: `Szerviz-fuvar létrehozva (${shId})` }] } : x)) }));
      emit();
      if (window.toast) window.toast(`✓ Szerviz-fuvar: ${shId}`, "success");
      return shId;
    },

    // Csere-alkatrész → gyártási rendelés (draft)
    ticketCreateOrder(id) {
      ensure();
      const t = (state.serviceTickets || []).find((x) => x.id === id);
      if (!t) return;
      const oid = `JT-SZ-${String((state.orderSeq || 200) + 1).padStart(4, "0")}`;
      const order = { id: oid, customer: t.customer, title: `Csere-alkatrész — ${t.title}`, product: t.refLabel || "csere-alkatrész", qty: 1, status: "draft", created: (state.today || "2026-04-28"), value: 0, serviceTicket: t.id };
      set((s) => ({ orders: [order, ...(s.orders || [])], orderSeq: (s.orderSeq || 200) + 1,
        serviceTickets: s.serviceTickets.map((x) => (x.id === id ? { ...x, linkedOrderId: oid, log: [...(x.log || []), { at: nowStamp(), text: `Csere-gyártási rendelés létrehozva (${oid})` }] } : x)) }));
      postSystem(`🏭 Csere-alkatrész rendelés (${oid}) a ${t.id} reklamációhoz.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Csere-rendelés: ${oid}`, "success");
      return oid;
    },

    // B2B kiadás szervizpartnernek (kézfogás)
    delegateTicket(id, partnerId) {
      ensure();
      const t = (state.serviceTickets || []).find((x) => x.id === id);
      const partner = (state.partners || []).find((x) => x.id === partnerId);
      if (!t || !partner) return;
      const hid = `HS-${id}`;
      const hs = { id: hid, kind: "service", ticketId: id, projectName: `${t.customer} — reklamáció`,
        epicTitle: `${(window.SVC_TYPE_META[t.type] || {}).label || ""} — ${t.title}`, fromCompany: "JoineryTech (belső)",
        partnerId, partnerName: partner.name, status: partner.platform ? "sent" : "external", external: !partner.platform, note: t.desc || "", ts: nowStamp() };
      set((s) => ({
        handshakes: [hs, ...(s.handshakes || [])],
        serviceTickets: s.serviceTickets.map((x) => (x.id === id ? { ...x, handshakeId: hid, delegatedTo: partner.name, delegatedExternal: !partner.platform, log: [...(x.log || []), { at: nowStamp(), text: `Kiadva szervizpartnernek: ${partner.name}` }] } : x)),
      }));
      postSystem(partner.platform ? `🤝 Reklamáció kiadva (${id}) → ${partner.name}.` : `🔗 Reklamáció külső partnerhez (${id}): ${partner.name}.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Kiadva — ${partner.name}`, "success");
    },
    recallTicket(id) {
      ensure();
      const t = (state.serviceTickets || []).find((x) => x.id === id);
      if (!t) return;
      set((s) => ({
        handshakes: (s.handshakes || []).filter((h) => h.id !== t.handshakeId),
        serviceTickets: s.serviceTickets.map((x) => (x.id === id ? { ...x, handshakeId: null, delegatedTo: null, delegatedExternal: false, log: [...(x.log || []), { at: nowStamp(), text: "Kiadás visszavonva — saját szerelő" }] } : x)),
      }));
      emit();
      if (window.toast) window.toast("✓ Kiadás visszavonva", "success");
    },

    // ── Accounts / permissions (B2B · B2C · B2B2C) ─────────────────────────────
    currentAccount() { ensure(); return state.accounts.find((a) => a.id === state.currentAccountId) || state.accounts[0]; },
    hasPerm(perm) { const a = api.currentAccount(); return !!a && a.perms.includes(perm); },
    hasWorld(world) { const a = api.currentAccount(); return !!a && a.worlds.includes(world); },
    setAccount(id) {
      ensure();
      const a = state.accounts.find((x) => x.id === id);
      set((s) => ({ prevAccountId: s.currentAccountId !== id ? s.currentAccountId : s.prevAccountId, currentAccountId: id }));
      if (a && window.toast) window.toast(`Bejelentkezve: ${a.name} · ${a.role}`, "info");
    },
    toggleAccountWorld(accId, world) {
      set((s) => ({ accounts: s.accounts.map((a) => a.id === accId
        ? { ...a, worlds: a.worlds.includes(world) ? a.worlds.filter((w) => w !== world) : [...a.worlds, world] } : a) }));
    },
    toggleAccountPerm(accId, perm) {
      set((s) => ({ accounts: s.accounts.map((a) => a.id === accId
        ? { ...a, perms: a.perms.includes(perm) ? a.perms.filter((p) => p !== perm) : [...a.perms, perm] } : a) }));
    },

    // Forward / re-offer a quote down the chain (B2B2C)
    forwardQuote(quoteId, toCustomer, markupPct) {
      ensure();
      const src = state.quotes.find((q) => q.id === quoteId);
      if (!src) return;
      const via = api.currentAccount();
      const markup = Math.max(0, Number(markupPct) || 0);
      const value = Math.round(src.value * (1 + markup / 100));
      const newId = "Q-2426-0" + String(59 + state.quotes.filter((q) => q.id.startsWith("Q-2426")).length).slice(-2);
      const child = { id: newId, customer: toCustomer, date: today, expires: src.expires, value, status: "draft",
        items: src.items, owner: via.name, fromQuote: src.id, via: via.name, markupPct: markup };
      set((s) => ({ quotes: [child, ...s.quotes] }));
      postSystem(`🔁 ${via.name} továbbajánlotta a(z) ${src.id} ajánlatot → ${toCustomer} részére (${newId}, +${markup}% árrés, ${(value / 1e6).toFixed(1)} M Ft).`);
      emit();
      if (window.toast) window.toast(`✓ Továbbajánlva → ${toCustomer} (${newId})`, "success");
      return newId;
    },

    // ── Customers ───────────────────────────────────────────────────────────
    addCustomer({ name, contact, city, email, phone }) {
      ensure();
      if (!name || !name.trim()) return null;
      const nm = name.trim();
      const existing = state.customers.find((c) => c.name.toLowerCase() === nm.toLowerCase());
      if (existing) return existing.id;
      const seq = state.customers.reduce((mx, c) => {
        const n = parseInt(String(c.id).replace(/\D/g, ""), 10);
        return isNaN(n) ? mx : Math.max(mx, n);
      }, 0) + 1;
      const id = "C-" + String(seq).padStart(3, "0");
      const cust = { id, name: nm, city: (city || "").trim(), contact: (contact || "").trim(),
        email: (email || "").trim(), phone: (phone || "").trim(), openOrders: 0, ltv: 0, since: String(new Date().getFullYear()) };
      set((s) => ({ customers: [cust, ...s.customers] }));
      postSystem(`👤 Új ügyfél rögzítve: ${nm}${city ? ` (${city})` : ""}.`);
      emit();
      if (window.toast) window.toast(`✓ Ügyfél rögzítve — ${nm}`, "success");
      return id;
    },

    // ── Design → Catalog: save a designed furniture piece into the product catalog.
    //    Closes the bidirectional loop — saved designs become pickable in future
    //    quotes (page-sales maps sim.products into the quote ItemBuilder source).
    saveDesignToCatalog({ name, price, cat, blurb }) {
      ensure();
      if (!name || !name.trim()) return null;
      const seq = state.products.filter((p) => String(p.id).startsWith("P-2")).length + 201;
      const id = "P-" + seq;
      const prod = { id, name: name.trim(), cat: cat || "Egyedi tervezés", price: Math.round(price) || 0,
        lead: 21, blurb: (blurb || "").trim(), tint: "from-violet-200 to-stone-100", icon: "box", _design: true };
      set((s) => ({ products: [prod, ...s.products] }));
      postSystem(`🎨 Új tervezett bútor a katalógusban: ${prod.name} — ${(prod.price / 1e3).toFixed(0)} eFt.`);
      emit();
      if (window.toast) window.toast(`✓ Katalógusba mentve — ${prod.name}`, "success");
      return id;
    },

    // ── Catalog categories (hierarchical) + typed property schema ───────────────
    categoryFields(catId) {
      ensure();
      const byId = {}; (state.catCategories || []).forEach((c) => { byId[c.id] = c; });
      const chain = []; let cur = byId[catId];
      while (cur) { chain.unshift(cur); cur = cur.parentId ? byId[cur.parentId] : null; }
      const out = [];
      chain.forEach((c) => (c.fields || []).forEach((f) => {
        const i = out.findIndex((x) => x.key === f.key);
        if (i >= 0) out[i] = { ...f, _from: c.name }; else out.push({ ...f, _from: c.name });
      }));
      return out;
    },
    categoryPath(catId) {
      ensure();
      const byId = {}; (state.catCategories || []).forEach((c) => { byId[c.id] = c; });
      const chain = []; let cur = byId[catId];
      while (cur) { chain.unshift(cur.name); cur = cur.parentId ? byId[cur.parentId] : null; }
      return chain;
    },
    categoryChildren(parentId) { ensure(); return (state.catCategories || []).filter((c) => (c.parentId || null) === (parentId || null)); },
    addCategory({ name, parentId = null, fields = [], color }) {
      ensure(); if (!name || !name.trim()) return null;
      const id = "cat-" + Date.now().toString(36) + Math.floor(Math.random() * 1000);
      const cat = { id, name: name.trim(), parentId: parentId || null, color: color || "#78716c", fields: fields || [] };
      set((s) => ({ catCategories: [...s.catCategories, cat] }));
      postSystem(`🗂️ Új kategória: ${cat.name}.`);
      emit(); if (window.toast) window.toast(`✓ Kategória létrehozva — ${cat.name}`, "success");
      return id;
    },
    updateCategory(id, patch) {
      ensure();
      set((s) => ({ catCategories: s.catCategories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      // keep items' `cat` string in sync when a category is renamed
      if (patch.name) set((s) => ({ catalog: s.catalog.map((it) => (it.categoryId === id ? { ...it, cat: patch.name } : it)) }));
      emit(); if (window.toast) window.toast("✓ Kategória frissítve", "success");
    },
    removeCategory(id) {
      ensure();
      const cat = state.catCategories.find((c) => c.id === id); if (!cat) return;
      const parentId = cat.parentId || null;
      const parentName = parentId ? (state.catCategories.find((c) => c.id === parentId) || {}).name : "";
      set((s) => ({
        catCategories: s.catCategories.filter((c) => c.id !== id).map((c) => (c.parentId === id ? { ...c, parentId } : c)),
        catalog: s.catalog.map((it) => (it.categoryId === id ? { ...it, categoryId: parentId, cat: parentName || it.cat } : it)),
      }));
      emit(); if (window.toast) window.toast(`Kategória törölve — ${cat.name}`, "info");
    },

    // ── Catalog items (typed props + tags + shop) ───────────────────────────────
    addCatalogItem(item) {
      ensure();
      const id = "c" + Date.now().toString(36);
      const cat = state.catCategories.find((c) => c.id === item.categoryId);
      const price = Number(item.price) || 0;
      const ni = __normCatItem({
        id,
        suppliers: item.supplier ? [{ name: item.supplier, price, leadDays: 7 }] : [],
        ...item,
        cat: cat ? cat.name : (item.cat || ""),
        price,
      });
      set((s) => ({ catalog: [ni, ...s.catalog] }));
      postSystem(`🗂️ Új katalógus tétel: ${ni.name}${cat ? ` (${cat.name})` : ""}.`);
      emit(); if (window.toast) window.toast(`✓ Tétel hozzáadva — ${ni.name}`, "success");
      return id;
    },
    updateCatalogItem(id, patch) {
      ensure();
      set((s) => ({ catalog: s.catalog.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, ...patch };
        if (patch.categoryId && patch.categoryId !== it.categoryId) {
          const c = s.catCategories.find((x) => x.id === patch.categoryId); if (c) next.cat = c.name;
        }
        if (patch.price != null) next.price = Number(patch.price) || it.price;
        return next;
      }) }));
      emit(); if (window.toast) window.toast("✓ Tétel frissítve", "success");
    },
    archiveCatalogItem(id) { ensure(); set((s) => ({ catalog: s.catalog.map((it) => (it.id === id ? { ...it, active: false } : it)) })); emit(); if (window.toast) window.toast("Tétel archiválva", "info"); },
    restoreCatalogItem(id) { ensure(); set((s) => ({ catalog: s.catalog.map((it) => (it.id === id ? { ...it, active: true } : it)) })); emit(); if (window.toast) window.toast("Tétel visszaállítva", "success"); },

    // ── CIKKSZÁM-ÉLETCIKLUS (FSM a katalógus-tételen) ────────────────────────
    // draft → review → active (+ incomplete, rejected, archived). A cél: BÁRKI
    // felvehet egy piszkozatot a minimum mezőkkel és dolgozhat vele, de AJÁNLAT/
    // ELADÁS csak JÓVÁHAGYOTT (active) tételből lehet. A státusz a tételen él
    // (világ-független), a jóváhagyás `catalog.approve` joghoz kötött.
    // Engedélyezett átmenetek (tiltott = LEZÁRT gomb a UI-ban, nem rejtett):
    _catFlow: {
      draft:      ["review", "archived"],
      incomplete: ["review", "archived"],
      review:     ["active", "incomplete", "rejected"],
      rejected:   ["draft", "archived"],
      active:     ["review", "archived"],
      archived:   ["draft"],
    },
    catStatusCanGo(from, to) { return (api._catFlow[from] || []).includes(to); },
    // catalogCompleteness: a jóváhagyáshoz szükséges mezők ellenőrzése.
    // Visszaad: { checks:[{key,label,ok}], ready:bool, missing:[label] }.
    catalogCompleteness(item) {
      ensure();
      const it = typeof item === "string" ? (state.catalog || []).find((c) => c.id === item) : item;
      if (!it) return { checks: [], ready: false, missing: [] };
      const fields = api.categoryFields(it.categoryId) || [];
      // Beszállítói forrás / beszerzési ár: procCatalog-forrás árral, vagy saját suppliers ár.
      const hasProcSource = (state.procCatalog || []).some((p) => p.catalogItemId === it.id && (p.sources || []).some((sx) => sx.price != null));
      const hasSupplierPrice = (it.suppliers || []).some((sx) => Number(sx.price) > 0) || Number(it.cost) > 0;
      // Műszaki paraméterek: a kategória number/select/material mezői kitöltve.
      const techFields = fields.filter((f) => ["number", "select", "material"].includes(f.type || f.kind));
      const techOk = techFields.length === 0 || techFields.every((f) => {
        const v = (it.props || {})[f.key];
        return v !== undefined && v !== null && v !== "";
      });
      const techMissing = techFields.filter((f) => { const v = (it.props || {})[f.key]; return v === undefined || v === null || v === ""; }).map((f) => f.label);
      const checks = [
        { key: "name", label: "Megnevezés", ok: !!(it.name && it.name.trim()) },
        { key: "cat",  label: "Kategória és típus", ok: !!it.categoryId && !!it.kind },
        { key: "price", label: "Eladási ár", ok: Number(it.price) > 0 },
        { key: "source", label: "Beszállítói forrás / beszerzési ár", ok: hasProcSource || hasSupplierPrice },
        { key: "tech", label: techFields.length ? ("Műszaki paraméterek" + (techMissing.length ? ` (hiány: ${techMissing.join(", ")})` : "")) : "Műszaki paraméterek", ok: techOk },
        { key: "vis", label: "Láthatóság beállítva", ok: !!it.visibility },
      ];
      const missing = checks.filter((c) => !c.ok).map((c) => c.label);
      return { checks, ready: missing.length === 0, missing };
    },
    isCatalogSellable(item) {
      const it = typeof item === "string" ? (state.catalog || []).find((c) => c.id === item) : item;
      return !!it && it.active !== false && it.status === "active";
    },
    // sellableCatalog: a fogyasztói kapuk (ajánlat ItemBuilder, webshop, pultos
    // eladás) EZT használják a nyers `sim.catalog` helyett — csak a JÓVÁHAGYOTT
    // (active) tételek eladhatók. A draft/incomplete/review tételek belül
    // használhatók (igénylés, raktár, tervezés), de ajánlatba/eladásba nem kerülnek.
    sellableCatalog() { ensure(); return (state.catalog || []).filter((c) => c.active !== false && (c.status || "active") === "active"); },
    // addCatalogDraft: piszkozat létrehozása MINIMUM mezőkkel (név + kategória +
    // típus). Auto cikkszám, ha nincs megadva. Bárki használhatja; a tétel
    // belül használható, de nem eladható, amíg jóvá nem hagyják.
    addCatalogDraft(data = {}) {
      ensure();
      const name = (data.name || "").trim();
      const cat = state.catCategories.find((c) => c.id === data.categoryId);
      if (!name) { if (window.toast) window.toast("A megnevezés kötelező.", "error"); return null; }
      if (!data.categoryId) { if (window.toast) window.toast("A kategória kötelező.", "error"); return null; }
      if (!data.kind) { if (window.toast) window.toast("A típus kötelező.", "error"); return null; }
      const id = "c" + Date.now().toString(36);
      const seq = (state.catDraftSeq || 0) + 1;
      const code = (data.code || "").trim() || ("UJ-" + String(seq).padStart(4, "0"));
      const ni = __normCatItem({
        id, name, code, kind: data.kind,
        categoryId: data.categoryId, cat: cat ? cat.name : "",
        unit: data.unit || "db", price: Number(data.price) || 0,
        props: data.props || {}, status: "draft",
        createdBy: (api.currentAccount() && api.currentAccount().contact) || "—",
        ...(data.visibility ? { visibility: data.visibility } : {}),
        ...(data.allowedWorlds ? { allowedWorlds: data.allowedWorlds } : {}),
        ...(data.tags ? { tags: data.tags } : {}),
        ...(data.worldExt ? { worldExt: data.worldExt } : {}),
        ...(data.bom ? { bom: data.bom } : {}),
        ...(data.shop ? { shop: data.shop } : {}),
        ...(data.supplier ? { suppliers: [{ name: data.supplier, price: Number(data.price) || 0, leadDays: 7 }] } : {}),
      });
      set((s) => ({ catalog: [ni, ...s.catalog], catDraftSeq: seq }));
      postSystem(`📝 Új cikkszám-piszkozat: ${ni.name} (${code}) — jóváhagyásra vár, eladásba még nem kerülhet.`);
      emit(); if (window.toast) window.toast(`✓ Piszkozat létrehozva — ${ni.name}`, "success");
      return id;
    },
    // setCatalogStatus: validált FSM-átmenet. opts: { reason }.
    setCatalogStatus(id, to, opts = {}) {
      ensure();
      const it = (state.catalog || []).find((c) => c.id === id);
      if (!it) return false;
      const from = it.status || "active";
      if (from === to) return true;
      if (!api.catStatusCanGo(from, to)) {
        if (window.toast) window.toast("Nem engedélyezett státuszváltás.", "error");
        return false;
      }
      // Jóváhagyás: jog + teljesség kell.
      if (to === "active") {
        if (!api.hasPerm("catalog.approve")) { if (window.toast) window.toast("Nincs jogosultság a jóváhagyáshoz (catalog.approve).", "error"); return false; }
        const comp = api.catalogCompleteness(it);
        if (!comp.ready) { if (window.toast) window.toast(`Hiányzó mezők: ${comp.missing.join(", ")}`, "warning"); return false; }
      }
      if ((to === "incomplete" || to === "rejected")) {
        if (!api.hasPerm("catalog.approve")) { if (window.toast) window.toast("Nincs jogosultság a művelethez (catalog.approve).", "error"); return false; }
        if (!(opts.reason && opts.reason.trim())) { if (window.toast) window.toast("Indoklás kötelező.", "warning"); return false; }
      }
      const me = (api.currentAccount() && api.currentAccount().contact) || "—";
      set((s) => ({ catalog: s.catalog.map((c) => {
        if (c.id !== id) return c;
        const patch = { status: to };
        if (opts.reason) patch.statusReason = opts.reason.trim();
        if (to === "active") { patch.approvedBy = me; patch.approvedAt = today; patch.active = true; }
        if (to === "archived") patch.active = false;
        if (to === "draft") patch.active = true;
        return { ...c, ...patch };
      }) }));
      const LBL = { draft: "Piszkozat", incomplete: "Hiánypótlásra", review: "Jóváhagyásra beküldve", active: "JÓVÁHAGYVA", rejected: "Elutasítva", archived: "Archiválva" };
      postSystem(`🔁 Cikkszám „${it.name}" → ${LBL[to] || to}${opts.reason ? ` · ${opts.reason}` : ""}.`);
      emit();
      if (window.toast) window.toast(`✓ ${it.name} → ${LBL[to] || to}`, to === "active" ? "success" : "info");
      return true;
    },
    catalogByStatus(status) { ensure(); return (state.catalog || []).filter((c) => (c.status || "active") === status); },

    // ── Láthatóság + világi kiterjesztések ───────────────────────────────────
    // setCatalogItemVisibility: sets the visibility level and optional world list
    setCatalogItemVisibility(id, visibility, allowedWorlds) {
      ensure();
      set((s) => ({ catalog: s.catalog.map((it) => it.id !== id ? it : { ...it, visibility, allowedWorlds: allowedWorlds || [] }) }));
      if (window.toast) window.toast("✓ Láthatóság frissítve", "success");
    },
    // worldExtSet: merge patch into worldExt[worldId] for a catalog item
    worldExtSet(id, worldId, patch) {
      ensure();
      set((s) => ({ catalog: s.catalog.map((it) => it.id !== id ? it : {
        ...it,
        worldExt: { ...(it.worldExt || {}), [worldId]: { ...(it.worldExt?.[worldId] || {}), ...patch } },
      }) }));
      if (window.toast) window.toast("✓ Világi kiterjesztés mentve", "success");
    },
    // setWarehouseStock: AGGREGÁLT (legacy) szerkesztő — katalógus gyors-editor.
    // patch: { onHand?, min?, location?, reserved? }. A lot-modellbe egyszerűsítve
    // vetít: ha onHand jön, a lotokat egy general (+ opcionális foglalt) lotra építi.
    // A részletes, lot-szintű kezelés a Raktár → Készlet képernyőn él.
    setWarehouseStock(id, patch) {
      ensure();
      set((s) => mutateWarehouse(s, id, (wh) => {
        if (patch.min !== undefined) wh.min = Number(patch.min) || 0;
        if (patch.onHand !== undefined) {
          const total = Math.max(0, Number(patch.onHand) || 0);
          const reserved = patch.reserved !== undefined
            ? Math.max(0, Number(patch.reserved) || 0)
            : wh.lots.filter((l) => l.zone !== "general").reduce((a, l) => a + (Number(l.qty) || 0), 0);
          const genQty = Math.max(0, total - reserved);
          const locText = patch.location !== undefined ? patch.location : (wh.location || "");
          const lots = [{ id: "lot-" + Math.random().toString(36).slice(2, 8), qty: genQty, zone: "general", locText, locId: "", receivedAt: today }];
          if (reserved > 0) lots.push({ id: "lot-" + Math.random().toString(36).slice(2, 8), qty: reserved, zone: "shop_reserved", locText, locId: "", receivedAt: today });
          wh.lots = lots;
        } else if (patch.location !== undefined) {
          // csak hely: a general lot(ok) locText-jét frissítjük
          let touched = false;
          wh.lots = wh.lots.map((l) => (l.zone === "general" && !touched ? (touched = true, { ...l, locText: patch.location }) : l));
        }
        return wh;
      }));
      emit();
    },
    // enableWarehouseStock: BÁRMELY katalógus tételt raktározottá tesz
    enableWarehouseStock(id) {
      ensure();
      const it = state.catalog.find((x) => x.id === id);
      if (!it) return;
      const existing = it.worldExt?.warehouse;
      const wh = existing
        ? normWarehouse({ ...existing, archived: false })   // archivált → visszaállít
        : normWarehouse({ min: 0, lots: [], archived: false });
      set((s) => ({ catalog: s.catalog.map((x) => x.id !== id ? x : {
        ...x,
        worldExt: { ...(x.worldExt || {}), warehouse: wh },
      }) }));
      emit();
      if (window.toast) window.toast("✓ Raktározás bekapcsolva", "success");
    },
    // archiveWarehouseStock: SOFT törlés — az adat megmarad (audit), csak archivált
    archiveWarehouseStock(id) {
      ensure();
      const it = state.catalog.find((x) => x.id === id);
      if (!it || !it.worldExt?.warehouse) return;
      set((s) => ({ catalog: s.catalog.map((x) => x.id !== id ? x : {
        ...x,
        worldExt: { ...x.worldExt, warehouse: { ...x.worldExt.warehouse, archived: true, archivedAt: today } },
      }) }));
      emit();
      if (window.toast) window.toast("Raktártétel archiválva", "info");
    },
    // restoreWarehouseStock: archivált tétel visszaállítása aktívra
    restoreWarehouseStock(id) {
      ensure();
      const it = state.catalog.find((x) => x.id === id);
      if (!it || !it.worldExt?.warehouse) return;
      const { archived, archivedAt, ...rest } = it.worldExt.warehouse;
      set((s) => ({ catalog: s.catalog.map((x) => x.id !== id ? x : {
        ...x,
        worldExt: { ...x.worldExt, warehouse: { ...rest, archived: false } },
      }) }));
      emit();
      if (window.toast) window.toast("✓ Raktártétel visszaállítva", "success");
    },

    // ═══════════════════════════════════════════════════════════════════════
    // RAKTÁR — lot-szintű kezelés (zóna = elérhetőségi státusz), kivét-kérelmek,
    // bevételezés, raktárhely-regiszter, szint-konfiguráció.
    // ═══════════════════════════════════════════════════════════════════════

    // Lekérdezések
    warehouseItems() { ensure(); return (state.catalog || []).filter((it) => it.active !== false && it.worldExt?.warehouse && !it.worldExt.warehouse.archived); },
    whLocations() { ensure(); return state.warehouseLocations || []; },
    whLevels() { ensure(); return (state.warehouseCfg && state.warehouseCfg.levels) || { telephely: true, raktar: true, helyiseg: false, tarolo: true, rekesz: false }; },
    // whLocLabel: a hely olvasható címkéje, csak az ENGEDÉLYEZETT szintekkel
    whLocLabel(loc) {
      ensure();
      if (!loc) return "";
      const lv = this.whLevels();
      const fac = (window.FACILITIES || []).find((f) => f.id === loc.facilityId);
      const parts = [];
      if (lv.telephely && fac) parts.push((fac.name || "").split(" — ")[0] || fac.name);
      if (lv.raktar && loc.raktar) parts.push(loc.raktar);
      if (lv.helyiseg && loc.helyiseg) parts.push(loc.helyiseg);
      if (lv.tarolo && loc.tarolo) parts.push(loc.tarolo);
      if (lv.rekesz && loc.rekesz) parts.push(loc.rekesz);
      // telephely • raktar / helyiseg / tarolo / rekesz
      if (parts.length === 0) return "";
      const head = (lv.telephely && fac) ? parts.shift() + " • " : "";
      return head + parts.join(" / ");
    },
    whLocById(id) { ensure(); const loc = (state.warehouseLocations || []).find((l) => l.id === id); return loc ? { ...loc, text: this.whLocLabel(loc) } : null; },

    // whReassignLot: egy lot (rész)mennyiségének zóna-váltása.
    // Ha qty < lot.qty → lot-szétválasztás (új lot az új zónával). opts: { projectNo, projectName, ref, refLabel, who }
    whReassignLot(itemId, lotId, qty, toZone, opts = {}) {
      ensure();
      const it = state.catalog.find((x) => x.id === itemId);
      const lot = it?.worldExt?.warehouse?.lots.find((l) => l.id === lotId);
      if (!lot) return;
      const move = Math.min(Math.max(0, Number(qty) || 0), Number(lot.qty) || 0);
      if (move <= 0 || toZone === lot.zone) return;
      const meta = {};
      if (toZone === "project_locked") { meta.projectNo = opts.projectNo || lot.projectNo; meta.projectName = opts.projectName || lot.projectName; }
      if (opts.ref) { meta.ref = opts.ref; meta.refLabel = opts.refLabel; }
      const zLabel = (window.WH_ZONES?.[toZone]?.label) || toZone;
      const mv = { date: nowStamp(), type: "Zóna", src: itemId, who: opts.who || "Raktár", mat: it.name, qty: 0, unit: it.unit, note: `${(window.WH_ZONES?.[lot.zone]?.label) || lot.zone} → ${zLabel}${meta.projectNo ? " · " + meta.projectNo : ""} (${move} ${it.unit})` };
      set((s) => ({
        ...mutateWarehouse(s, itemId, (wh) => {
          if (move >= (Number(lot.qty) || 0)) {
            wh.lots = wh.lots.map((l) => l.id !== lotId ? l : { ...l, zone: toZone, ...meta, ...(toZone === "general" ? { projectNo: undefined, projectName: undefined, ref: undefined, refLabel: undefined } : {}) });
          } else {
            wh.lots = wh.lots.map((l) => l.id !== lotId ? l : { ...l, qty: (Number(l.qty) || 0) - move });
            wh.lots.push({ id: "lot-" + Math.random().toString(36).slice(2, 8), qty: move, zone: toZone, locId: lot.locId, locText: lot.locText, receivedAt: lot.receivedAt, receivedFrom: lot.receivedFrom, ...meta });
          }
          return wh;
        }),
        movements: [mv, ...s.movements],
      }));
      emit();
      if (window.toast) window.toast(`✓ ${move} ${it.unit} → ${zLabel}`, "success");
    },

    // whMoveLotLocation: lot fizikai áthelyezése másik raktárhelyre.
    whMoveLotLocation(itemId, lotId, locId, locText, who) {
      ensure();
      const it = state.catalog.find((x) => x.id === itemId);
      const lot = it?.worldExt?.warehouse?.lots.find((l) => l.id === lotId);
      if (!lot) return;
      const mv = { date: nowStamp(), type: "Mozgatás", src: itemId, who: who || "Raktár", mat: it.name, qty: 0, unit: it.unit, note: `${lot.locText || "—"} → ${locText} (${lot.qty} ${it.unit})` };
      set((s) => ({
        ...mutateWarehouse(s, itemId, (wh) => {
          wh.lots = wh.lots.map((l) => l.id !== lotId ? l : { ...l, locId, locText });
          return wh;
        }),
        movements: [mv, ...s.movements],
      }));
      emit();
      if (window.toast) window.toast("✓ Lot áthelyezve", "success");
    },

    // whAdjustLot: leltárkorrekció / selejt — egy lot mennyiségének módosítása.
    whAdjustLot(itemId, lotId, newQty, reason, who) {
      ensure();
      const it = state.catalog.find((x) => x.id === itemId);
      const lot = it?.worldExt?.warehouse?.lots.find((l) => l.id === lotId);
      if (!lot) return;
      const nq = Math.max(0, Number(newQty) || 0);
      const diff = nq - (Number(lot.qty) || 0);
      if (diff === 0) return;
      const mv = { date: nowStamp(), type: diff < 0 ? "Selejt" : "Korr.", src: itemId, who: who || "Raktár", mat: it.name, qty: diff, unit: it.unit, note: reason || "Leltárkorrekció" };
      set((s) => ({
        ...mutateWarehouse(s, itemId, (wh) => {
          wh.lots = wh.lots.map((l) => l.id !== lotId ? l : { ...l, qty: nq }).filter((l) => (Number(l.qty) || 0) > 0);
          return wh;
        }),
        movements: [mv, ...s.movements],
      }));
      emit();
      if (window.toast) window.toast(diff < 0 ? "Selejtezés rögzítve" : "Korrekció rögzítve", "info");
    },

    // ── Leltár / készlet-revízió (cycle counting) (4.8-A) ─────────────────────
    // A lot-modellre ülő leltározási folyamat. SNAPSHOT a hatókör lotjairól →
    // számlálás → eltérés → LEZÁRÁSKOR whAdjustLot könyveli a korrekciókat.
    stocktakeList() { ensure(); return state.stocktakes || []; },
    findStocktake(id) { ensure(); return (state.stocktakes || []).find((x) => x.id === id); },
    stocktakeOpen() { ensure(); return (state.stocktakes || []).filter((x) => window.StockEngine && window.StockEngine.isOpen(x)); },
    _nextStkId() { const seq = (state.stkSeq || 0) + 1; return { id: `LELT-2426-${String(seq).padStart(3, "0")}`, seq }; },
    // createStocktake: snapshot a kiválasztott hatókör lotjairól.
    //   scope: { type: "all"|"zone"|"location", zone?, locId?, label? }
    createStocktake(data) {
      ensure();
      const scope = data.scope || { type: "all" };
      const items = api.warehouseItems();
      const lines = [];
      items.forEach((it) => {
        const lots = (it.worldExt && it.worldExt.warehouse && it.worldExt.warehouse.lots) || [];
        lots.forEach((lot) => {
          if ((Number(lot.qty) || 0) <= 0) return;
          if (scope.type === "zone" && lot.zone !== scope.zone) return;
          if (scope.type === "location" && lot.locId !== scope.locId) return;
          lines.push({ itemId: it.id, code: it.code || "", name: it.name + (it.variantValues ? " · " + Object.values(it.variantValues).join(" / ") : ""), unit: it.unit || "db",
            lotId: lot.id, zone: lot.zone || "general", locText: lot.locText || "—", systemQty: Number(lot.qty) || 0, countedQty: null, counted: false });
        });
      });
      const { id, seq } = api._nextStkId();
      const me = api.currentAccount();
      let label = data.scope && data.scope.label;
      if (!label) label = scope.type === "zone" ? `${(window.WH_ZONES?.[scope.zone]?.label) || scope.zone} zóna` : scope.type === "location" ? (api.whLocById && api.whLocById(scope.locId) ? api.whLocById(scope.locId).text : "Raktárhely") : "Teljes készlet";
      const stk = { id, status: "nyitott", scope: { ...scope, label }, createdBy: me.name || "Raktár", createdAt: today, note: (data.note || "").trim(),
        lines, log: [{ at: nowStamp(), text: `Leltár-ív megnyitva (${lines.length} tétel · ${label})` }] };
      set((s) => ({ stocktakes: [stk, ...(s.stocktakes || [])], stkSeq: seq }));
      postSystem(`📋 Új leltár-ív (${id}) — ${label}, ${lines.length} tétel.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Leltár-ív létrehozva — ${id} (${lines.length} tétel)`, "success");
      return id;
    },
    setStocktakeCount(id, idx, qty) {
      ensure();
      const v = qty === "" || qty == null ? null : Math.max(0, Number(qty) || 0);
      set((s) => ({ stocktakes: s.stocktakes.map((x) => (x.id === id ? { ...x, lines: (x.lines || []).map((l, i) => (i === idx ? { ...l, countedQty: v, counted: v != null } : l)) } : x)) }));
      emit();
    },
    setStocktakeStatus(id, to, opts = {}) {
      ensure();
      const stk = (state.stocktakes || []).find((x) => x.id === id);
      if (!stk) return false;
      if (!(window.StockEngine && window.StockEngine.canGo(stk, to))) { if (window.toast) window.toast("Nem engedélyezett státuszváltás.", "error"); return false; }
      const lbl = (window.STK_STATUS[to] || {}).label || to;
      if (to === "lezarva") {
        // eltérések könyvelése a lotokra (whAdjustLot)
        let posted = 0;
        (stk.lines || []).forEach((l) => { if (l.counted && l.countedQty != null && (Number(l.countedQty) || 0) !== (Number(l.systemQty) || 0)) { api.whAdjustLot(l.itemId, l.lotId, l.countedQty, `Leltár ${id}`, stk.createdBy); posted++; } });
        set((s) => ({ stocktakes: s.stocktakes.map((x) => (x.id === id ? { ...x, status: "lezarva", closedAt: today, log: [...(x.log || []), { at: nowStamp(), text: `Lezárva — ${posted} eltérés könyvelve` }] } : x)) }));
        postSystem(`✅ Leltár ${id} lezárva — ${posted} korrekció könyvelve.`, "ch-prod");
        emit();
        if (window.toast) window.toast(`✓ ${id} lezárva — ${posted} korrekció`, "success");
        return true;
      }
      set((s) => ({ stocktakes: s.stocktakes.map((x) => (x.id === id ? { ...x, status: to, ...(to === "megszakitva" ? { closedAt: today } : {}), log: [...(x.log || []), { at: nowStamp(), text: `Státusz → ${lbl}${opts.reason ? ` (${opts.reason.trim()})` : ""}` }] } : x)) }));
      emit();
      return true;
    },

    // receiveToWarehouse: PO bevételezése a raktárba — új lot zónával + hellyel.
    // A bevételezés BIZONYLAT-vezérelt (szállítólevél / számla); a projekt-foglalás
    // NEM automatikus, mert a bizonylaton nem feltétlenül szerepel — a bevételező
    // dönti el (lock). Ha nincs projekt → szabad (general) készletre kerül.
    // Egy bizonylaton TÖBB tétel is lehet → soronként egy lot.
    // opts: { docType, docNo, who, lock, projectNo, projectName,
    //         lines:[{ itemId, qty, locId, locText }] }   (visszafelé komp.: itemId/qty/locId/locText/zone)
    receiveToWarehouse(poId, opts = {}) {
      ensure();
      const po = state.pos.find((x) => x.id === poId);
      if (!po) return;
      const docType = opts.docType || "szallitolevel";
      const docNo = (opts.docNo || "").trim();
      const docLabel = docType === "szamla" ? "Számla" : "Szállítólevél";
      const lock = opts.lock != null ? !!opts.lock : (opts.zone === "project_locked");
      const projectNo = lock ? (opts.projectNo || po.projectNo || "") : "";
      const projectName = lock ? (opts.projectName || po.projectName || "") : "";
      const zone = lock ? "project_locked" : "general";
      const raw = (opts.lines && opts.lines.length) ? opts.lines
        : [{ itemId: opts.itemId || po.itemId, qty: opts.qty != null ? opts.qty : po.qty, locId: opts.locId, locText: opts.locText }];
      const lines = raw
        .map((l) => ({ itemId: l.itemId, qty: Math.max(0, Number(l.qty) || 0), locId: l.locId || "", locText: l.locText || "" }))
        .filter((l) => l.itemId && l.qty > 0);
      if (!lines.length) { if (window.toast) window.toast("Adj meg legalább egy tételt mennyiséggel", "error"); return; }

      let catalog = state.catalog;
      const movements = [];
      const docPart = docNo ? ` · ${docLabel} ${docNo}` : "";
      lines.forEach((ln) => {
        const it = catalog.find((x) => x.id === ln.itemId);
        if (!it) return;
        if (!it.worldExt?.warehouse) {
          catalog = catalog.map((x) => x.id !== ln.itemId ? x : { ...x, worldExt: { ...(x.worldExt || {}), warehouse: { min: 0, lots: [] } } });
        }
        const lot = {
          id: "lot-" + Math.random().toString(36).slice(2, 8),
          qty: ln.qty, zone, locId: ln.locId, locText: ln.locText,
          receivedAt: today, receivedFrom: poId,
          ...(docNo ? { docType, docNo } : {}),
          ...(projectNo ? { projectNo, projectName } : {}),
        };
        catalog = mutateWarehouse({ catalog }, ln.itemId, (wh) => { wh.lots = [...wh.lots, lot]; return wh; }).catalog;
        movements.push({ date: nowStamp(), type: "Bevét", src: poId, who: opts.who || "Raktár", mat: it.name, qty: +ln.qty, unit: it.unit, note: `${po.supplier}${docPart}${projectNo ? " · " + projectNo : ""} → ${(window.WH_ZONES?.[zone]?.label) || zone}` });
      });
      set(() => ({
        catalog,
        pos: state.pos.map((x) => x.id !== poId ? x : { ...x, status: "delivered" }),
        movements: [...movements, ...state.movements],
      }));
      postSystem(`📦 ${poId} bevételezve${docNo ? ` (${docLabel} ${docNo})` : ""} — ${lines.length} tétel${projectNo ? ` · ${projectNo} zárolt` : " · szabad készlet"}.`, "ch-beszerzes");
      emit();
      if (window.toast) window.toast(`✓ Bevételezve: ${lines.length} tétel`, "success");
    },

    // receiveAdhoc: bevételezés PO NÉLKÜL, közvetlenül bizonylat (szállítólevél /
    // számla) alapján — az érkező áru nem mindig kötődik nyilvántartott PO-hoz.
    // Egy bizonylaton TÖBB tétel is lehet → soronként egy lot.
    // opts: { supplier, docType, docNo, who, lock, projectNo, projectName,
    //         lines:[{ itemId, qty, locId, locText }] }
    receiveAdhoc(opts = {}) {
      ensure();
      const docType = opts.docType || "szallitolevel";
      const docNo = (opts.docNo || "").trim();
      const docLabel = docType === "szamla" ? "Számla" : "Szállítólevél";
      const supplier = (opts.supplier || "").trim();
      const lock = opts.lock != null ? !!opts.lock : (opts.zone === "project_locked");
      const projectNo = lock ? (opts.projectNo || "") : "";
      const projectName = lock ? (opts.projectName || "") : "";
      const zone = lock ? "project_locked" : "general";
      const srcLabel = docNo ? `${docLabel} ${docNo}` : "Kézi bevét";
      const raw = (opts.lines && opts.lines.length) ? opts.lines
        : [{ itemId: opts.itemId, qty: opts.qty, locId: opts.locId, locText: opts.locText }];
      const lines = raw
        .map((l) => ({ itemId: l.itemId, qty: Math.max(0, Number(l.qty) || 0), locId: l.locId || "", locText: l.locText || "" }))
        .filter((l) => l.itemId && l.qty > 0);
      if (!lines.length) { if (window.toast) window.toast("Adj meg legalább egy tételt mennyiséggel", "error"); return; }

      let catalog = state.catalog;
      const movements = [];
      const docPart = docNo ? ` · ${docLabel} ${docNo}` : "";
      lines.forEach((ln) => {
        const it = catalog.find((x) => x.id === ln.itemId);
        if (!it) return;
        if (!it.worldExt?.warehouse) {
          catalog = catalog.map((x) => x.id !== ln.itemId ? x : { ...x, worldExt: { ...(x.worldExt || {}), warehouse: { min: 0, lots: [] } } });
        }
        const lot = {
          id: "lot-" + Math.random().toString(36).slice(2, 8),
          qty: ln.qty, zone, locId: ln.locId, locText: ln.locText,
          receivedAt: today, receivedFrom: srcLabel,
          ...(supplier ? { receivedSupplier: supplier } : {}),
          ...(docNo ? { docType, docNo } : {}),
          ...(projectNo ? { projectNo, projectName } : {}),
        };
        catalog = mutateWarehouse({ catalog }, ln.itemId, (wh) => { wh.lots = [...wh.lots, lot]; return wh; }).catalog;
        movements.push({ date: nowStamp(), type: "Bevét", src: srcLabel, who: opts.who || "Raktár", mat: it.name, qty: +ln.qty, unit: it.unit, note: `${supplier || "Kézi bevét"}${docPart}${projectNo ? " · " + projectNo : ""} → ${(window.WH_ZONES?.[zone]?.label) || zone}` });
      });
      set(() => ({ catalog, movements: [...movements, ...state.movements] }));
      postSystem(`📦 Kézi bevét${docNo ? ` (${docLabel} ${docNo})` : ""} — ${lines.length} tétel${supplier ? ` · ${supplier}` : ""}${projectNo ? ` · ${projectNo} zárolt` : " · szabad készlet"}.`, "ch-beszerzes");
      emit();
      if (window.toast) window.toast(`✓ Bevételezve: ${lines.length} tétel`, "success");
    },

    // ── Kivét-kérelmek (FSM: kért → komissiózva → kiadva | visszavonva) ────────
    createWithdrawal(data = {}) {
      ensure();
      const seq = (state.whSeq || 32) + 1;
      const id = `WD-2426-${String(seq).padStart(3, "0")}`;
      const wd = {
        id, consumer: data.consumer || "gyartas", ref: data.ref || "", refLabel: data.refLabel || "",
        status: "kert", requestedBy: data.requestedBy || "Raktár", requestedAt: nowStamp(),
        lines: (data.lines || []).map((l) => ({ ...l })), note: data.note || "",
      };
      set((s) => ({ withdrawals: [wd, ...(s.withdrawals || [])], whSeq: seq }));
      postSystem(`📤 Új kivét-kérelem ${id} — ${(window.WH_CONSUMERS?.[wd.consumer]?.label) || wd.consumer}${wd.ref ? " · " + wd.ref : ""}.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Kivét-kérelem ${id} létrehozva`, "success");
      return id;
    },
    setWithdrawalStatus(id, status, opts = {}) {
      ensure();
      const wd = (state.withdrawals || []).find((w) => w.id === id);
      if (!wd) return;
      const allowed = (window.WH_WD_FLOW?.[wd.status]?.next) || [];
      if (!allowed.includes(status)) { if (window.toast) window.toast("Tiltott állapot-átmenet", "error"); return; }

      if (status === "kiadva") {
        // Lotokból fogyasztás soronként; prioritás: a kérelem ref-jéhez foglalt lot,
        // majd a committed (nem-általános), végül az általános.
        let catalog = state.catalog;
        const movements = [];
        wd.lines.forEach((line) => {
          const item = catalog.find((x) => x.id === line.itemId);
          if (!item?.worldExt?.warehouse) return;
          let remain = Number(line.qty) || 0;
          const pr = (l) => (l.ref && l.ref === wd.ref ? 0 : l.zone === "commissioned" || l.zone === "shippable" ? 1 : l.zone !== "general" ? 2 : 3);
          catalog = mutateWarehouse({ catalog }, line.itemId, (wh) => {
            const order = [...wh.lots].sort((a, b) => pr(a) - pr(b));
            wh.lots = order.map((l) => {
              if (remain <= 0) return l;
              const take = Math.min(remain, Number(l.qty) || 0);
              remain -= take;
              return { ...l, qty: (Number(l.qty) || 0) - take };
            }).filter((l) => (Number(l.qty) || 0) > 0);
            return wh;
          }).catalog;
          movements.push({ date: nowStamp(), type: "Kivét", src: id, who: (window.WH_CONSUMERS?.[wd.consumer]?.label) || wd.consumer, mat: item.name, qty: -(Number(line.qty) || 0), unit: line.unit || item.unit, note: `${wd.refLabel || wd.ref || ""}`.trim() || (window.WH_CONSUMERS?.[wd.consumer]?.label) });
        });
        set((s) => ({
          catalog,
          movements: [...movements, ...s.movements],
          withdrawals: s.withdrawals.map((w) => w.id !== id ? w : { ...w, status: "kiadva", issuedAt: nowStamp() }),
        }));
        postSystem(`✅ ${id} kiadva — ${wd.lines.length} tétel kivételezve.`, "ch-prod");
      } else {
        set((s) => ({ withdrawals: s.withdrawals.map((w) => w.id !== id ? w : { ...w, status }) }));
        if (status === "komissiozva") postSystem(`🔧 ${id} komissiózva — kiadásra kész.`, "ch-prod");
      }
      emit();
      const lbl = (window.WH_WD_FLOW?.[status]?.label) || status;
      if (window.toast) window.toast(`Kivét-kérelem: ${lbl}`, status === "visszavonva" ? "info" : "success");
    },

    // ── Raktárhely-regiszter + szint-konfiguráció ─────────────────────────────
    addWhLocation(data = {}) {
      ensure();
      const id = "loc-" + Math.random().toString(36).slice(2, 8);
      const loc = { id, facilityId: data.facilityId || "", raktar: (data.raktar || "").trim(), helyiseg: (data.helyiseg || "").trim(), tarolo: (data.tarolo || "").trim(), rekesz: (data.rekesz || "").trim() };
      set((s) => ({ warehouseLocations: [...(s.warehouseLocations || []), loc] }));
      emit();
      if (window.toast) window.toast("✓ Raktárhely hozzáadva", "success");
      return id;
    },
    updateWhLocation(id, patch) {
      ensure();
      set((s) => ({ warehouseLocations: (s.warehouseLocations || []).map((l) => l.id !== id ? l : { ...l, ...patch }) }));
      emit();
    },
    removeWhLocation(id) {
      ensure();
      set((s) => ({ warehouseLocations: (s.warehouseLocations || []).filter((l) => l.id !== id) }));
      emit();
      if (window.toast) window.toast("Raktárhely törölve", "info");
    },
    setWhLevel(key, on) {
      ensure();
      const mandatory = (window.WH_LEVELS || []).find((l) => l.key === key)?.mandatory;
      if (mandatory && !on) { if (window.toast) window.toast("Ez a szint kötelező", "error"); return; }
      set((s) => ({ warehouseCfg: { ...(s.warehouseCfg || {}), levels: { ...((s.warehouseCfg || {}).levels || {}), [key]: !!on } } }));
      emit();
    },

    // ── Beszállítói cikk-megfeleltetés ───────────────────────────────────────
    // A külső beszállító saját cikkszáma + megnevezése ↔ saját katalógus tételünk.
    supplierMapList() { ensure(); return state.supplierMap || []; },
    // A megfeleltetések egy adott beszállítóhoz.
    supplierMapBySupplier(supplierName) {
      ensure();
      const n = (supplierName || "").trim().toLowerCase();
      return (state.supplierMap || []).filter((m) => (m.supplierName || "").trim().toLowerCase() === n);
    },
    // Egy katalógus tétel megfeleltetése egy adott beszállítónál (a beszerzés ezt
    // teszi a PO-sorra, hogy a beszállító az ő nyelvén lássa).
    supplierRefFor(catalogItemId, supplierName) {
      ensure();
      const n = (supplierName || "").trim().toLowerCase();
      return (state.supplierMap || []).find((m) => m.catalogItemId === catalogItemId && (m.supplierName || "").trim().toLowerCase() === n) || null;
    },
    // resolveSupplierItem: a bevételezéskor a szállítólevélen szereplő idegen
    // cikkszám / megnevezés → saját katalógus tétel(ek). Prioritás: sku-egyezés →
    // pontos megnevezés → részleges megnevezés. A találat 1:1, N:1 és 1:N is lehet
    // (utóbbinál a `targets` több cél-tételt ad átváltási szorzóval).
    resolveSupplierItem(supplierName, q = {}) {
      ensure();
      const sku = (q.sku || "").trim().toLowerCase();
      const label = (q.label || "").trim().toLowerCase();
      const pool = (state.supplierMap || []).filter((m) => {
        if (!supplierName) return true;
        return (m.supplierName || "").trim().toLowerCase() === (supplierName || "").trim().toLowerCase();
      });
      let hit = null;
      if (sku) hit = pool.find((m) => (m.supplierSku || "").trim().toLowerCase() === sku);
      if (!hit && label) hit = pool.find((m) => (m.supplierLabel || "").trim().toLowerCase() === label);
      if (!hit && label) hit = pool.find((m) => (m.supplierLabel || "").trim().toLowerCase().includes(label) || label.includes((m.supplierLabel || "").trim().toLowerCase()));
      // beszállító-független második kör
      if (!hit && supplierName) {
        if (sku) hit = (state.supplierMap || []).find((m) => (m.supplierSku || "").trim().toLowerCase() === sku);
      }
      return hit ? { catalogItemId: hit.catalogItemId, targets: this.supplierMapTargets(hit), via: hit } : null;
    },
    // supplierMapTargets: a megfeleltetés cél-tételei átváltási szorzóval.
    // 1:1/N:1 → egy cél (factor 1); 1:N (szétbontás) → több cél, soronkénti factor
    // = hány saját egység jön 1 beszállítói egységből.
    supplierMapTargets(m) {
      if (!m) return [];
      if (Array.isArray(m.targets) && m.targets.length) {
        return m.targets.filter((t) => t.catalogItemId).map((t) => ({ catalogItemId: t.catalogItemId, factor: Number(t.factor) > 0 ? Number(t.factor) : 1 }));
      }
      return m.catalogItemId ? [{ catalogItemId: m.catalogItemId, factor: 1 }] : [];
    },
    // supplierKits: a szett/összetett megfeleltetések (több cél-tétel) — ezekből
    // bontható ki rendeléskor a komponens-szükséglet.
    supplierKits(supplierName) {
      ensure();
      const n = (supplierName || "").trim().toLowerCase();
      return (state.supplierMap || []).filter((m) => {
        if (n && (m.supplierName || "").trim().toLowerCase() !== n) return false;
        return this.supplierMapTargets(m).length > 1;
      });
    },
    // orderKitLines: VISSZAFELÉ alkalmazott szorzó — egy szettből `kitQty` darabhoz
    // mennyi komponenst kell rendelni. Pl. Häfele konténer ×2 → zár 2, fiók 6, sín 6.
    orderKitLines(mappingId, kitQty) {
      ensure();
      const m = (state.supplierMap || []).find((x) => x.id === mappingId);
      if (!m) return [];
      const qty = Math.max(0, Number(kitQty) || 0);
      return this.supplierMapTargets(m).map((t) => {
        const c = (state.catalog || []).find((x) => x.id === t.catalogItemId);
        return { catalogItemId: t.catalogItemId, code: c ? c.code : "", name: c ? c.name : t.catalogItemId,
          unit: c ? c.unit : "db", price: c ? c.price : 0, perKit: t.factor, qty: qty * t.factor };
      });
    },

    // ── Összeállítás (multi-level BOM) a katalógus-tételen ────────────────────
    // A tétel `bom: [{ catalogItemId, qty }]` mezője a KÖZVETLEN komponensek. A
    // komponens maga is lehet összeállítás → rekurzió. A `bom` üres/hiány = atomi rész.
    itemBom(id) {
      ensure();
      const it = (state.catalog || []).find((c) => c.id === id);
      return (it && Array.isArray(it.bom)) ? it.bom.filter((b) => b && b.catalogItemId).map((b) => ({ catalogItemId: b.catalogItemId, qty: Number(b.qty) || 0 })) : [];
    },
    isAssembly(id) { ensure(); return this.itemBom(id).length > 0; },
    // explodeBom: rekurzív kibontás a LEVÉL (atomi) komponensekig, mennyiségeket
    // összegezve. Ciklus-védett. Visszaad: [{ catalogItemId, qty, code, name, unit, price }].
    explodeBom(id, qty = 1, opts = {}) {
      ensure();
      const cat = state.catalog || [];
      const find = (cid) => cat.find((c) => c.id === cid);
      const leavesOnly = opts.leaves !== false; // alapból a levelekig bont
      const out = {};
      const add = (cid, q) => { out[cid] = (out[cid] || 0) + q; };
      const walk = (cid, q, path) => {
        const it = find(cid);
        const bom = (it && Array.isArray(it.bom)) ? it.bom : [];
        if (!bom.length || path.has(cid)) { add(cid, q); return; }       // levél vagy ciklus
        if (!leavesOnly) add(cid, q);                                     // részfa csomópont is
        const np = new Set(path); np.add(cid);
        bom.forEach((b) => walk(b.catalogItemId, q * (Number(b.qty) || 0), np));
      };
      const top = this.itemBom(id);
      if (!top.length) return [{ catalogItemId: id, qty: Number(qty) || 0, ...(find(id) ? { code: find(id).code, name: find(id).name, unit: find(id).unit, price: find(id).price || 0 } : {}) }];
      top.forEach((b) => walk(b.catalogItemId, (Number(qty) || 0) * b.qty, new Set([id])));
      return Object.entries(out).map(([cid, q]) => {
        const c = find(cid);
        return { catalogItemId: cid, qty: q, code: c ? c.code : "", name: c ? c.name : cid, unit: c ? c.unit : "db", price: c ? c.price : 0 };
      });
    },
    // bomCost: a komponensekből felgörgetett anyagköltség.
    bomCost(id, qty = 1) {
      ensure();
      return this.explodeBom(id, qty).reduce((s, l) => s + (l.price || 0) * l.qty, 0);
    },
    // bomCoverage: komponensenként a SZABAD készlet vs. szükséglet (rendelni kell?).
    bomCoverage(id, qty = 1) {
      ensure();
      const cat = state.catalog || [];
      return this.explodeBom(id, qty).map((l) => {
        const it = cat.find((c) => c.id === l.catalogItemId);
        const wh = it && it.worldExt && it.worldExt.warehouse;
        const free = wh ? (wh.available != null ? wh.available : (wh.onHand || 0)) : 0;
        const short = Math.max(0, l.qty - free);
        return { ...l, free, short, covered: short <= 0 };
      });
    },
    setItemBom(id, bom) {
      ensure();
      const norm = (Array.isArray(bom) ? bom : []).filter((b) => b && b.catalogItemId).map((b) => ({ catalogItemId: b.catalogItemId, qty: Number(b.qty) > 0 ? Number(b.qty) : 1 }));
      set((s) => ({ catalog: s.catalog.map((c) => c.id !== id ? c : { ...c, bom: norm }) }));
      emit();
    },
    // buildAssembly: KÉSZTERMÉK gyártása készletre — a BOM-ot a levél-komponensekig
    // bontja, fogyasztja a szabad készletből (Kivét mozgás), és a kész összeállítást
    // lotként a raktárba veszi (Bevét mozgás). A komponens-hiányt alapból blokkolja.
    buildAssembly(id, qty, opts = {}) {
      ensure();
      const item = state.catalog.find((c) => c.id === id);
      if (!item) return { ok: false };
      const q = Math.max(0, Number(qty) || 0);
      if (q <= 0) { if (window.toast) window.toast("Adj meg darabszámot", "error"); return { ok: false }; }
      if (!this.isAssembly(id)) { if (window.toast) window.toast("Ez a tétel nem összeállítás", "error"); return { ok: false }; }
      const needs = this.explodeBom(id, q);
      // készletfedezet ellenőrzés (szabad készlet)
      const freeOf = (cid) => { const it = state.catalog.find((c) => c.id === cid); const wh = it && it.worldExt && it.worldExt.warehouse; return wh ? (wh.available != null ? wh.available : (wh.onHand || 0)) : 0; };
      const short = needs.filter((nl) => nl.qty > freeOf(nl.catalogItemId) + 1e-9);
      if (short.length && !opts.allowShort) {
        if (window.toast) window.toast(`Hiányzó komponens: ${short.map((s) => s.name).join(", ")}`, "error");
        return { ok: false, short };
      }
      let catalog = state.catalog;
      const movements = [];
      // komponensek fogyasztása — general (szabad) lotokból elsőként
      needs.forEach((nl) => {
        let remaining = nl.qty;
        catalog = mutateWarehouse({ catalog }, nl.catalogItemId, (wh) => {
          const lots = wh.lots.map((l) => ({ ...l })).sort((a, b) => (a.zone === "general" ? -1 : 1) - (b.zone === "general" ? -1 : 1));
          for (const l of lots) { if (remaining <= 1e-9) break; const take = Math.min(l.qty, remaining); l.qty -= take; remaining -= take; }
          wh.lots = lots.filter((l) => l.qty > 1e-9);
          return wh;
        }).catalog;
        const it = catalog.find((c) => c.id === nl.catalogItemId);
        movements.push({ date: nowStamp(), type: "Kivét", src: "Gyártás", who: opts.who || "Gyártás", mat: it ? it.name : nl.name, qty: -nl.qty, unit: nl.unit, note: `${item.name} × ${q} összeállítás` });
      });
      // a kész összeállítás legyen raktározott, majd lot felvétele
      if (!item.worldExt || !item.worldExt.warehouse) {
        catalog = catalog.map((c) => c.id !== id ? c : { ...c, worldExt: { ...(c.worldExt || {}), warehouse: { min: 0, lots: [] } } });
      }
      const finLot = { id: "lot-" + Math.random().toString(36).slice(2, 8), qty: q, zone: opts.zone || "general",
        locId: opts.locId || "", locText: opts.locText || "", receivedAt: today, receivedFrom: "Gyártás" };
      catalog = mutateWarehouse({ catalog }, id, (wh) => { wh.lots = [...wh.lots, finLot]; return wh; }).catalog;
      movements.push({ date: nowStamp(), type: "Bevét", src: "Gyártás", who: opts.who || "Gyártás", mat: item.name, qty: +q, unit: item.unit, note: `Összeállítás gyártva — ${q} ${item.unit} készletre` });
      set(() => ({ catalog, movements: [...movements, ...state.movements] }));
      postSystem(`🔧 ${q}× ${item.name} legyártva — komponensek fogyasztva, késztermék készletre véve.`, "ch-beszerzes");
      emit();
      if (window.toast) window.toast(`✓ ${q}× ${item.name} készletre`, "success");
      return { ok: true };
    },

    // ── Variánskezelés — egy fő-tétel alatt méret/szín/anyag változatok ──────────
    // Fő-tétel: `variantAxes:[{key,label,options[]}]`. Variáns: `variantOf` + `variantValues`.
    // A variáns ÖRÖKLI a fő-tétel tulajdonságait (props, unit, kategória, szállító),
    // és FELÜLÍRHATJA (saját props/ár). Mindegyik variánsnak SAJÁT készlete (lotjai) van.
    isVariantParent(id) { ensure(); const it = (state.catalog || []).find((c) => c.id === id); return !!(it && Array.isArray(it.variantAxes) && it.variantAxes.length); },
    itemVariants(parentId) { ensure(); return (state.catalog || []).filter((c) => c.variantOf === parentId && c.active !== false); },
    variantParentOf(id) { ensure(); const it = (state.catalog || []).find((c) => c.id === id); return it && it.variantOf ? (state.catalog || []).find((c) => c.id === it.variantOf) : null; },
    variantLabel(idOrItem) {
      ensure();
      const it = typeof idOrItem === "string" ? (state.catalog || []).find((c) => c.id === idOrItem) : idOrItem;
      if (!it) return "";
      const p = it.variantOf ? (state.catalog || []).find((c) => c.id === it.variantOf) : null;
      const axes = (p && p.variantAxes) || it.variantAxes || [];
      const vv = it.variantValues || {};
      return axes.map((ax) => vv[ax.key]).filter(Boolean).join(" · ");
    },
    // effectiveItem: a variáns ÖRÖKÖLT + FELÜLÍRT nézete (a fő-tétel props-ával egyesítve).
    effectiveItem(id) {
      ensure();
      const it = (state.catalog || []).find((c) => c.id === id);
      if (!it) return null;
      if (!it.variantOf) return it;
      const p = (state.catalog || []).find((c) => c.id === it.variantOf);
      if (!p) return it;
      return { ...p, ...it,
        props: { ...(p.props || {}), ...(it.props || {}) },
        tags: (it.tags && it.tags.length) ? it.tags : p.tags,
        bom: (Array.isArray(it.bom) && it.bom.length) ? it.bom : p.bom,
        variantValues: it.variantValues || {}, _parent: p };
    },
    variantStockSummary(parentId) {
      ensure();
      return this.itemVariants(parentId).map((v) => {
        const wh = v.worldExt && v.worldExt.warehouse;
        return { id: v.id, code: v.code, values: v.variantValues || {}, label: this.variantLabel(v), unit: v.unit, price: v.price,
          onHand: wh ? (wh.onHand || 0) : 0, free: wh ? (wh.available != null ? wh.available : (wh.onHand || 0)) : 0, min: wh ? (wh.min || 0) : 0, stocked: !!wh };
      });
    },
    setVariantAxes(parentId, axes) {
      ensure();
      const norm = (Array.isArray(axes) ? axes : []).filter((a) => a && a.key).map((a) => ({ key: String(a.key).trim(), label: (a.label || a.key).trim(), options: (a.options || []).map((o) => String(o).trim()).filter(Boolean) }));
      set((s) => ({ catalog: s.catalog.map((c) => c.id !== parentId ? c : { ...c, variantAxes: norm }) }));
      emit();
    },
    addVariant(parentId, values = {}, overrides = {}) {
      ensure();
      const p = (state.catalog || []).find((c) => c.id === parentId);
      if (!p) return null;
      const suffix = (p.variantAxes || []).map((ax) => { const v = (values[ax.key] || ""); return v.replace(/[^0-9a-zA-Zá-űÁ-Ű]+/gi, "").slice(0, 4).toUpperCase(); }).filter(Boolean).join("-");
      const id = parentId + "-" + Math.random().toString(36).slice(2, 6);
      const code = overrides.code || (p.code + (suffix ? ("-" + suffix) : ("-" + id.slice(-3))));
      const v = __normCatItem({
        id, code, name: p.name, unit: overrides.unit || p.unit, cat: p.cat, categoryId: p.categoryId,
        price: overrides.price != null ? Number(overrides.price) : p.price, supplier: p.supplier,
        visibility: p.visibility, allowedWorlds: [...(p.allowedWorlds || [])],
        variantOf: parentId, variantValues: { ...values }, props: { ...(overrides.props || {}) },
        worldExt: { warehouse: { min: 0, lots: [] } },
      });
      set((s) => ({ catalog: [v, ...s.catalog] }));
      emit();
      if (window.toast) window.toast("✓ Variáns hozzáadva", "success");
      return id;
    },
    updateVariant(id, patch = {}) {
      ensure();
      set((s) => ({ catalog: s.catalog.map((c) => c.id !== id ? c : { ...c, ...patch, ...(patch.variantValues ? { variantValues: { ...(c.variantValues || {}), ...patch.variantValues } } : {}) }) }));
      emit();
    },
    removeVariant(id) {
      ensure();
      set((s) => ({ catalog: s.catalog.filter((c) => c.id !== id) }));
      emit();
      if (window.toast) window.toast("Variáns törölve", "info");
    },
    addSupplierMap(data = {}) {
      ensure();
      const seq = (state.smSeq || 0) + 1;
      const targets = (Array.isArray(data.targets) ? data.targets : (data.catalogItemId ? [{ catalogItemId: data.catalogItemId, factor: 1 }] : []))
        .filter((t) => t && t.catalogItemId)
        .map((t) => ({ catalogItemId: t.catalogItemId, factor: Number(t.factor) > 0 ? Number(t.factor) : 1 }));
      const m = {
        id: "sm-" + seq,
        supplierName: (data.supplierName || "").trim(),
        supplierSku: (data.supplierSku || "").trim(),
        supplierLabel: (data.supplierLabel || "").trim(),
        catalogItemId: targets[0] ? targets[0].catalogItemId : "",
        ...((targets.length > 1 || (targets[0] && targets[0].factor !== 1)) ? { targets } : {}),
        ...(data.supplierUnit ? { supplierUnit: String(data.supplierUnit).trim() } : {}),
        ...(data.sheet && Number(data.sheet.w) > 0 && Number(data.sheet.l) > 0 ? { sheet: { w: Number(data.sheet.w), l: Number(data.sheet.l), variable: !!data.sheet.variable } } : {}),
        note: (data.note || "").trim(),
      };
      if (!m.supplierName || !m.catalogItemId) { if (window.toast) window.toast("Beszállító és katalógus tétel kötelező", "error"); return null; }
      set((s) => ({ supplierMap: [m, ...(s.supplierMap || [])], smSeq: seq }));
      emit();
      if (window.toast) window.toast("✓ Megfeleltetés rögzítve", "success");
      return m.id;
    },
    updateSupplierMap(id, patch = {}) {
      ensure();
      const p = { ...patch };
      let dropTargets = false;
      if (Array.isArray(patch.targets)) {
        const targets = patch.targets.filter((t) => t && t.catalogItemId).map((t) => ({ catalogItemId: t.catalogItemId, factor: Number(t.factor) > 0 ? Number(t.factor) : 1 }));
        p.catalogItemId = targets[0] ? targets[0].catalogItemId : (p.catalogItemId || "");
        if (targets.length > 1 || (targets[0] && targets[0].factor !== 1)) p.targets = targets; else { delete p.targets; dropTargets = true; }
      }
      if (patch.supplierUnit !== undefined) p.supplierUnit = String(patch.supplierUnit || "").trim();
      if (patch.sheet !== undefined) {
        p.sheet = (patch.sheet && Number(patch.sheet.w) > 0 && Number(patch.sheet.l) > 0)
          ? { w: Number(patch.sheet.w), l: Number(patch.sheet.l), variable: !!patch.sheet.variable } : null;
      }
      set((s) => ({ supplierMap: (s.supplierMap || []).map((m) => {
        if (m.id !== id) return m;
        const merged = { ...m, ...p };
        if (dropTargets) delete merged.targets;
        if (p.sheet === null) delete merged.sheet;
        return merged;
      }) }));
      emit();
    },
    removeSupplierMap(id) {
      ensure();
      set((s) => ({ supplierMap: (s.supplierMap || []).filter((m) => m.id !== id) }));
      emit();
      if (window.toast) window.toast("Megfeleltetés törölve", "info");
    },
    // learnSupplierMap: upsert — a beszerzés/raktár rögzíti vagy frissíti a
    // megfeleltetést (pl. rendeléskor vagy bevételezéskor új idegen cikknél).
    learnSupplierMap(data = {}) {
      ensure();
      const supplierName = (data.supplierName || "").trim();
      const catalogItemId = data.catalogItemId || "";
      if (!supplierName || !catalogItemId) return null;
      const sku = (data.supplierSku || "").trim();
      const label = (data.supplierLabel || "").trim();
      const existing = (state.supplierMap || []).find((m) =>
        m.catalogItemId === catalogItemId && (m.supplierName || "").trim().toLowerCase() === supplierName.toLowerCase());
      if (existing) {
        set((s) => ({ supplierMap: (s.supplierMap || []).map((m) => m.id !== existing.id ? m : {
          ...m, supplierSku: sku || m.supplierSku, supplierLabel: label || m.supplierLabel, note: data.note != null ? data.note : m.note,
        }) }));
        emit();
        return existing.id;
      }
      return this.addSupplierMap({ supplierName, supplierSku: sku, supplierLabel: label, catalogItemId, note: data.note });
    },

    // ── BESZERZÉSI KATALÓGUS (procCatalog) — NEM a globális katalógus ──────────
    // A beszerzés saját törzse: külső szállító / külső munka / belső egységtől
    // igényelhető tételek. Innen indul a beszerzési igény (Draft → Approved → PO).
    procCatalogList() { ensure(); return (state.procCatalog || []).filter((p) => p.active !== false); },
    findProcItem(id) { ensure(); return (state.procCatalog || []).find((p) => p.id === id) || null; },
    addProcItem(data = {}) {
      ensure();
      const seq = (state.procSeq || 0) + 1;
      const sources = (Array.isArray(data.sources) ? data.sources : []).map((s) => ({
        kind: s.kind || "supplier",
        name: (s.name || "").trim(),
        price: s.price === "" || s.price == null ? null : Number(s.price),
        leadDays: s.leadDays === "" || s.leadDays == null ? null : Number(s.leadDays),
        ...(s.partnerId ? { partnerId: s.partnerId } : {}),
        ...(s.unitId ? { unitId: s.unitId } : {}),
      })).filter((s) => s.name);
      const item = {
        id: "pc-" + String(seq).padStart(2, "0"),
        code: (data.code || "").trim(),
        name: (data.name || "").trim(),
        kind: data.kind || "material",
        unit: (data.unit || "db").trim(),
        cat: (data.cat || "Egyéb").trim(),
        catalogItemId: data.catalogItemId || null,
        group: !!data.group,
        ...(data.group ? { members: Array.isArray(data.members) ? data.members : [] } : {}),
        sources,
        active: true,
      };
      if (!item.name) { if (window.toast) window.toast("A megnevezés kötelező", "error"); return null; }
      set((s) => ({ procCatalog: [item, ...(s.procCatalog || [])], procSeq: seq }));
      emit();
      if (window.toast) window.toast(`✓ Beszerzési tétel rögzítve — ${item.name}`, "success");
      return item.id;
    },
    updateProcItem(id, patch = {}) {
      ensure();
      const p = { ...patch };
      if (Array.isArray(patch.sources)) {
        p.sources = patch.sources.map((s) => ({
          kind: s.kind || "supplier",
          name: (s.name || "").trim(),
          price: s.price === "" || s.price == null ? null : Number(s.price),
          leadDays: s.leadDays === "" || s.leadDays == null ? null : Number(s.leadDays),
          ...(s.partnerId ? { partnerId: s.partnerId } : {}),
          ...(s.unitId ? { unitId: s.unitId } : {}),
        })).filter((s) => s.name);
      }
      set((s) => ({ procCatalog: (s.procCatalog || []).map((m) => m.id === id ? { ...m, ...p } : m) }));
      emit();
    },
    removeProcItem(id) {
      ensure();
      set((s) => ({ procCatalog: (s.procCatalog || []).map((m) => m.id === id ? { ...m, active: false } : m) }));
      emit();
      if (window.toast) window.toast("Beszerzési tétel archiválva", "info");
    },
    // requisitionFromProc: beszerzési igény (Draft) létrehozása egy procCatalog
    // tételből + választott forrásból. Beleköt a meglévő igénylés → PO láncba.
    //   • GYŰJTŐ (group) tétel → ROBBANTÁS: minden tag egy igény-sor (multi).
    //   • internal_unit forrás → a sor megkapja az egység azonosítóját, hogy
    //     jóváhagyás után a B2B kézfogás/delegálás láncba adható legyen.
    requisitionFromProc(procId, source, qty) {
      ensure();
      const it = (state.procCatalog || []).find((p) => p.id === procId);
      if (!it) return null;
      const q = Number(qty) || 0;
      if (q <= 0) { if (window.toast) window.toast("Adj meg igényelt mennyiséget.", "warning"); return null; }
      const meName = (api.currentAccount && api.currentAccount()?.contact || "").split(" · ")[0] || "Beszerző";
      const newReqId = () => "PR-2426-" + (40 + Math.floor(Math.random() * 59));

      // ── Gyűjtő cikkszám → tagok robbantása egy multi-soros igénybe ──────────
      if (it.group) {
        const members = (it.members || []).map((m) => (typeof m === "string" ? { id: m, qty: 1 } : { id: m.id, qty: m.qty || 1 }));
        const lines = [];
        members.forEach((mm) => {
          const mi = (state.procCatalog || []).find((p) => p.id === mm.id);
          if (!mi) return;
          // forrás: ha a gyűjtő kiválasztott forrása a tagnál is elérhető, azt
          // használjuk; különben a tag legolcsóbb (vagy első) forrását.
          const memberSrcs = mi.sources || [];
          let src = source && source.name ? memberSrcs.find((s) => s.name === source.name) : null;
          if (!src) { const priced = memberSrcs.filter((s) => s.price != null); src = priced.sort((a, b) => a.price - b.price)[0] || memberSrcs[0] || {}; }
          lines.push({
            code: mi.code, material: mi.name, qty: q * mm.qty, unit: mi.unit,
            estUnit: src.price != null ? src.price : null,
            supplier: src.name || null, sourceKind: src.kind || "supplier", procId: mi.id,
            ...(src.kind === "internal_unit" ? { unitId: src.unitId || null } : {}),
          });
        });
        if (!lines.length) { if (window.toast) window.toast("A gyűjtőnek nincs feloldható tagja.", "warning"); return null; }
        const reqId = newReqId();
        api.addRequisitions([{
          id: reqId, type: "multi", fromGroup: it.name, groupCode: it.code,
          requester: meName, date: today, status: "Draft",
          note: `Gyűjtő robbantva: ${it.name} × ${q} ${it.unit} → ${lines.length} tétel`,
          lines,
        }]);
        postSystem(`📦 Gyűjtő robbantva — ${it.name} × ${q} ${it.unit}: ${lines.length} beszerzési igény-sor (${reqId}).`);
        emit();
        if (window.toast) window.toast(`✓ ${reqId} — gyűjtő robbantva (${lines.length} tétel)`, "success");
        return reqId;
      }

      // ── Egyszerű tétel ─────────────────────────────────────────────────────
      const src = source || (it.sources || [])[0] || {};
      const reqId = newReqId();
      const srcKindHu = src.kind === "work" ? "külső munka" : src.kind === "internal_unit" ? "belső egység" : "külső szállító";
      api.addRequisitions([{
        id: reqId, material: it.name, matCode: it.code, qty: q, unit: it.unit,
        preferredSupplier: src.name || null, requester: meName, date: today,
        status: "Draft", note: `Beszerzési katalógusból — ${srcKindHu}`,
        estUnit: src.price != null ? src.price : null,
        procId, sourceKind: src.kind || "supplier",
        ...(src.kind === "internal_unit" ? { unitId: src.unitId || null, unitName: src.name || null } : {}),
        ...(src.kind === "work" && src.partnerId ? { partnerId: src.partnerId } : {}),
      }]);
      postSystem(`📋 Beszerzési igény (${reqId}) — ${it.name} · ${src.name || "?"} (${q} ${it.unit}).`);
      emit();
      if (window.toast) window.toast(`✓ ${reqId} igény létrehozva — ${src.name || ""} (${q} ${it.unit})`, "success");
      return reqId;
    },

    // ── Belső egység (internal_unit) → B2B kézfogás/delegálás lánc ────────────
    // Egy JÓVÁHAGYOTT, belső egységtől igényelt tételt NEM külső PO-vá alakítunk,
    // hanem belső megrendelésként KIADUNK az egységnek — ugyanaz a kézfogás-modell
    // (handshakes[]), mint az epik-delegálásnál, csak `kind:"internal_order"`.
    // Státusz: sent → accepted → done (mellék: declined). A req → Delegated/Fulfilled.
    internalOrders() { ensure(); return (state.handshakes || []).filter((h) => h.kind === "internal_order"); },
    internalOrderForReq(reqId) { ensure(); return (state.handshakes || []).find((h) => h.kind === "internal_order" && h.reqId === reqId) || null; },
    delegateReqToInternalUnit(reqId) {
      ensure();
      const req = (state.requisitions || []).find((x) => x.id === reqId);
      if (!req) return null;
      if (req.status !== "Approved") { if (window.toast) window.toast("Csak jóváhagyott igény adható ki belső egységnek.", "warning"); return null; }
      const unitName = req.unitName || req.preferredSupplier || "Belső egység";
      const me = api.currentAccount();
      const hid = "IO-" + reqId.slice(-3) + "-" + ((state.handshakes || []).filter((h) => h.kind === "internal_order").length + 1);
      const hs = {
        id: hid, kind: "internal_order", internal: true, reqId,
        unitId: req.unitId || null, unitName,
        itemName: req.material, code: req.matCode, qty: req.qty, unit: req.unit,
        estUnit: req.estUnit || null, fromCompany: me.name || "JoineryTech",
        status: "sent", ts: nowStamp(),
      };
      set((s) => ({
        handshakes: [hs, ...(s.handshakes || [])],
        requisitions: (s.requisitions || []).map((x) => x.id === reqId ? { ...x, status: "Delegated", internalHandshakeId: hid } : x),
      }));
      postSystem(`🏭 Belső megrendelés kiadva → ${unitName}: ${req.material} (${req.qty} ${req.unit}). [${hid}]`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Kiadva belső egységnek — ${unitName}`, "success");
      return hid;
    },
    acceptInternalOrder(hsId) {
      ensure();
      const hs = (state.handshakes || []).find((x) => x.id === hsId);
      if (!hs || hs.kind !== "internal_order") return;
      set((s) => ({ handshakes: s.handshakes.map((x) => x.id === hsId ? { ...x, status: "accepted" } : x) }));
      postSystem(`🤝 ${hs.unitName} elfogadta a belső megrendelést: ${hs.itemName}.`, "ch-prod");
      emit();
      if (window.toast) window.toast("✓ Belső megrendelés elfogadva", "success");
    },
    completeInternalOrder(hsId) {
      ensure();
      const hs = (state.handshakes || []).find((x) => x.id === hsId);
      if (!hs || hs.kind !== "internal_order") return;
      set((s) => ({
        handshakes: s.handshakes.map((x) => x.id === hsId ? { ...x, status: "done" } : x),
        requisitions: (s.requisitions || []).map((x) => x.id === hs.reqId ? { ...x, status: "Fulfilled" } : x),
      }));
      postSystem(`✅ ${hs.unitName} elkészült: ${hs.itemName} — belső megrendelés teljesítve.`, "ch-prod");
      emit();
      if (window.toast) window.toast("✓ Belső megrendelés teljesítve", "success");
    },
    declineInternalOrder(hsId) {
      ensure();
      const hs = (state.handshakes || []).find((x) => x.id === hsId);
      if (!hs || hs.kind !== "internal_order") return;
      set((s) => ({
        handshakes: s.handshakes.map((x) => x.id === hsId ? { ...x, status: "declined" } : x),
        requisitions: (s.requisitions || []).map((x) => x.id === hs.reqId ? { ...x, status: "Approved", internalHandshakeId: null } : x),
      }));
      postSystem(`✋ ${hs.unitName} visszautasította a belső megrendelést: ${hs.itemName}.`, "ch-prod");
      emit();
      if (window.toast) window.toast("Belső megrendelés visszautasítva", "info");
    },

    // catalogForWorld: items visible to a given internal world
    catalogForWorld(worldId) {
      ensure();
      return (state.catalog || []).filter((it) => {
        if (it.active === false) return false;
        const v = it.visibility || "private";
        if (v === "public" || v === "protected" || v === "private") return true;
        if (v === "world-only") return (it.allowedWorlds || []).includes(worldId);
        return true;
      });
    },
    // catalogForPub: only publicly visible items (for customers / shop)
    catalogForPub() {
      ensure();
      return (state.catalog || [])
        .filter((it) => it.active !== false && it.visibility === "public")
        .map((it) => stripFieldsForWorld(it, null));
    },
    // catalogForWorldFields: items + fields visible to a given internal world
    catalogForWorldFields(worldId) {
      ensure();
      return (state.catalog || []).filter((it) => {
        if (it.active === false) return false;
        const v = it.visibility || "private";
        if (v === "public" || v === "protected" || v === "private") return true;
        if (v === "world-only") return (it.allowedWorlds || []).includes(worldId);
        return true;
      }).map((it) => stripFieldsForWorld(it, worldId));
    },
    // canSeeField: exposed for UI components that need to check field visibility
    canSeeField(item, fieldKey, worldId) { return canSeeField(item, fieldKey, worldId); },
    // setFieldVis: set field-level visibility for one or more fields
    setFieldVis(id, fieldVisPatch, fieldAllowedWorldsPatch) {
      ensure();
      set((s) => ({ catalog: s.catalog.map((it) => it.id !== id ? it : {
        ...it,
        fieldVis: { ...(it.fieldVis || {}), ...fieldVisPatch },
        fieldAllowedWorlds: { ...(it.fieldAllowedWorlds || {}), ...(fieldAllowedWorldsPatch || {}) },
      }) }));
      if (window.toast) window.toast("✓ Mezőszintű láthatóság mentve", "success");
    },

    // ── Tervezési ANYAGOK: a katalógus az EGYETLEN forrás ─────────────────
    // A spec-rendszer (stílus anyag-slot) és a sablonok anyaga is innen jön.
    // Forrás: a "Lapanyag (Tervezés)" katalógus-kategória (m²/fm, vastagsággal).
    // Új anyagot a KATALÓGUSBA kell felvenni (egy igazságforrás) — onnan
    // automatikusan választható lesz a tervezésben.
    designMaterials() {
      ensure();
      return (state.catalog || [])
        .filter((c) => c.active !== false && c.cat === "Lapanyag (Tervezés)")
        .map((c) => ({
          code: c.code, name: c.name, price: c.price,
          t: (c.props && c.props.t != null) ? c.props.t : 18,
          kind: (c.props && c.props.kind) || null,
          color: (c.props && c.props.lookupColor) || "#cbb88e",
          unit: c.unit,
        }));
    },
    // materialInfo: egy anyagkód feloldása a katalógusból (fallback a régi
    // CATALOG_LOOKUP / MATERIAL_PRICE táblákra a visszafelé-kompatibilitásért).
    materialInfo(code) {
      ensure();
      if (!code) return { code, name: "—", price: 0, t: 18, color: "#cbb88e", unit: "m²", known: false };
      const it = (state.catalog || []).find((c) => c.code === code && c.active !== false);
      if (it) return {
        code, name: it.name, price: it.price,
        t: (it.props && it.props.t != null) ? it.props.t : ((window.CATALOG_LOOKUP && window.CATALOG_LOOKUP[code] && window.CATALOG_LOOKUP[code].t) || 18),
        color: (it.props && it.props.lookupColor) || ((window.CATALOG_LOOKUP && window.CATALOG_LOOKUP[code] && window.CATALOG_LOOKUP[code].color) || "#cbb88e"),
        unit: it.unit, known: true,
      };
      const lk = window.CATALOG_LOOKUP && window.CATALOG_LOOKUP[code];
      const mp = window.MATERIAL_PRICE && window.MATERIAL_PRICE[code];
      return {
        code, name: lk ? lk.name : code, price: mp != null ? mp : 4000,
        t: lk ? lk.t : 18, color: lk ? lk.color : "#cbb88e", unit: "m²",
        known: !!(lk || mp != null),
      };
    },

    // ── Világ-specifikus katalógus pinek ─────────────────────────────────
    // Egyedi pin felvétele: { label, filterType, filterValue }
    // filterType: "tag" | "category" | "visibility" | "fieldValue"
    // filterValue: a szűrő értéke (pl. "tölgy" tag-hez, "Lapanyag (Tervezés)" cat-hoz)
    addWorldPin(worldId, pinDef) {
      ensure();
      const id = "pin-" + Date.now().toString(36);
      const pin = { id, label: pinDef.label || "Pin", filterType: pinDef.filterType || "tag", filterValue: pinDef.filterValue || "" };
      set((s) => ({
        worldCatalogPins: {
          ...(s.worldCatalogPins || {}),
          [worldId]: [...((s.worldCatalogPins || {})[worldId] || []), pin],
        },
      }));
      if (window.toast) window.toast(`✓ Pin hozzáadva: ${pin.label}`, "success");
      return id;
    },
    removeWorldPin(worldId, pinId) {
      ensure();
      set((s) => ({
        worldCatalogPins: {
          ...(s.worldCatalogPins || {}),
          [worldId]: ((s.worldCatalogPins || {})[worldId] || []).filter((p) => p.id !== pinId),
        },
      }));
    },
    reorderWorldPins(worldId, orderedIds) {
      ensure();
      const cur = ((state.worldCatalogPins || {})[worldId] || []);
      const byId = Object.fromEntries(cur.map((p) => [p.id, p]));
      set((s) => ({
        worldCatalogPins: {
          ...(s.worldCatalogPins || {}),
          [worldId]: orderedIds.map((id) => byId[id]).filter(Boolean),
        },
      }));
    },
    getWorldPins(worldId) {
      ensure();
      return ((state.worldCatalogPins || {})[worldId] || []);
    },
    addTag(label) {
      ensure(); const t = (label || "").trim(); if (!t) return;
      if (!state.catTags.includes(t)) { set((s) => ({ catTags: [...s.catTags, t] })); emit(); }
    },
    setItemShop(id, shopPatch) {
      ensure();
      const before = state.catalog.find((x) => x.id === id);
      set((s) => ({ catalog: s.catalog.map((it) => (it.id === id ? { ...it, shop: { ...(it.shop || {}), ...shopPatch } } : it)) }));
      if (before && shopPatch.enabled !== undefined) postSystem(shopPatch.enabled ? `🛒 „${before.name}” megjelölve boltképesként.` : `🛒 „${before.name}” levéve a boltból.`);
      emit();
    },
    shopCatalogItems() { ensure(); return state.catalog.filter((it) => it.active !== false && it.status === "active" && it.shop && it.shop.enabled); },
    // Unified shop offer = curated products + shop-enabled catalog items (mapped to product shape)
    shopProducts() {
      ensure();
      const tints = ["from-amber-200 to-amber-100", "from-stone-200 to-stone-100", "from-teal-100 to-stone-100", "from-orange-200 to-amber-100", "from-stone-300 to-stone-100"];
      const fromCatalog = state.catalog.filter((it) => it.active !== false && it.status === "active" && it.shop && it.shop.enabled).map((it) => {
        const cat = state.catCategories.find((c) => c.id === it.categoryId);
        let h = 0; for (const ch of String(it.id)) h = (h + ch.charCodeAt(0)) % tints.length;
        return {
          id: it.id, name: it.name, cat: cat ? cat.name : (it.cat || "Egyéb"),
          price: Number(it.shop.price) || it.price, lead: Number(it.shop.leadDays) || 14,
          blurb: it.shop.desc || "", tint: it.shop.tint || tints[h], icon: it.shop.icon || "box",
          stockMode: it.shop.stockMode || "order", _fromCatalog: true,
        };
      });
      return [...state.products, ...fromCatalog];
    },

    // ── Item-builder: assemble a quote / purchase request from catalog lines ────
    // lines: [{ name, code, unit, qty, price, vat }]
    // ── Termékkonfigurátor (CPQ) — mentett konfigurációk + FSM ──────────────────
    // A vezetett konfigurátor (page-configurator.jsx) kimenete egy mentett
    // konfiguráció (quoteConfigs[]) saját, könnyű FSM-mel (data-configurator.js).
    // A konfig újrahasználható és a meglévő láncba köt: configToQuote → createQuote,
    // configToLead → createLeadFromWebshop. A státusz a tételen él; az átmenet
    // validált (CfgEngine.canGo). Az árat a wizard a SpecEngine-nel számolja; a
    // store csak a snapshotot tárolja (egy igazságforrás a konfig-tételen).
    configList() { ensure(); return state.quoteConfigs || []; },
    findConfig(id) { ensure(); return (state.quoteConfigs || []).find((c) => c.id === id) || null; },
    // saveConfig: új konfiguráció (status: piszkozat) VAGY meglévő frissítése (data.id).
    // A wizard a teljes snapshotot adja át (vars/style/tech meta + számolt ár).
    saveConfig(data = {}) {
      ensure();
      const existing = data.id ? (state.quoteConfigs || []).find((c) => c.id === data.id) : null;
      if (existing) {
        set((s) => ({ quoteConfigs: s.quoteConfigs.map((c) => (c.id === data.id ? { ...c, ...data } : c)) }));
        emit();
        return data.id;
      }
      const seq = (state.cfgSeq || 0) + 1;
      const id = `CFG-2426-${String(seq).padStart(3, "0")}`;
      const cfg = {
        id, status: "piszkozat", audience: data.audience || "internal",
        categoryId: data.categoryId || null, catName: data.catName || "",
        tplId: data.tplId || null, tplName: data.tplName || "", thumb: data.thumb || "empty",
        vars: data.vars || {}, dims: data.dims || "",
        styleId: data.styleId || null, styleName: data.styleName || "",
        techId: data.techId || null, techName: data.techName || "",
        qty: Math.max(1, data.qty || 1), customer: data.customer || "", contact: data.contact || "",
        unitPrice: Math.round(data.unitPrice || 0), net: Math.round(data.net || 0), bandPct: data.bandPct || 10,
        estLo: Math.round(data.estLo || 0), estHi: Math.round(data.estHi || 0),
        laborHours: data.laborHours || 0, deliveryDays: data.deliveryDays || 0,
        createdBy: data.createdBy || api.currentAccount().name, createdAt: today,
        quoteRef: null, leadRef: null, note: data.note || "",
      };
      set((s) => ({ quoteConfigs: [cfg, ...(s.quoteConfigs || [])], cfgSeq: seq }));
      emit();
      return id;
    },
    setConfigStatus(id, to, opts = {}) {
      ensure();
      const c = (state.quoteConfigs || []).find((x) => x.id === id);
      if (!c) return false;
      if (!(window.CfgEngine && window.CfgEngine.canGo(c, to))) { if (window.toast) window.toast("Nem engedélyezett státuszváltás.", "error"); return false; }
      const patch = { status: to };
      if (opts.reason) patch.statusReason = opts.reason.trim();
      set((s) => ({ quoteConfigs: s.quoteConfigs.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      emit();
      return true;
    },
    removeConfig(id) {
      ensure();
      set((s) => ({ quoteConfigs: (s.quoteConfigs || []).filter((x) => x.id !== id) }));
      emit();
    },
    // configToQuote: a konfigurációból ajánlat (createQuote, egy tételsor). A konfig
    // → ajanlatban + quoteRef. quote.create joghoz kötött (mint az oppCreateQuote).
    configToQuote(id, { customer } = {}) {
      ensure();
      if (!api.hasPerm("quote.create")) { if (window.toast) window.toast("Nincs jogosultság ajánlat létrehozásához (quote.create).", "error"); return null; }
      const c = (state.quoteConfigs || []).find((x) => x.id === id);
      if (!c) return null;
      const cust = (customer || c.customer || "").trim();
      if (!cust) { if (window.toast) window.toast("Adj meg ügyfelet az ajánlathoz.", "warning"); return null; }
      const line = {
        name: `${c.tplName}${c.styleName ? " — " + c.styleName : ""}`, code: c.tplId || "TERV", unit: "db",
        qty: c.qty, price: c.unitPrice, vat: 27,
        config: { categoryId: c.categoryId, styleId: c.styleId, techId: c.techId, bandPct: c.bandPct, vars: c.vars, dims: c.dims },
      };
      const qid = api.createQuote({ customer: cust, lines: [line], owner: c.createdBy });
      if (!qid) return null;
      set((s) => ({ quoteConfigs: s.quoteConfigs.map((x) => (x.id === id ? { ...x, status: "ajanlatban", quoteRef: qid, customer: cust } : x)) }));
      emit();
      return qid;
    },
    // configToLead: webshop önkiszolgáló ajánlatkérés → auto-lead (perm-mentes,
    // mint a createLeadFromWebshop). A konfig → ajanlatban + leadRef.
    configToLead(id, data = {}) {
      ensure();
      const c = (state.quoteConfigs || []).find((x) => x.id === id);
      if (!c) return null;
      const lid = api.createLeadFromWebshop({
        contact: data.contact || c.contact, company: data.company || "", email: data.email || "", phone: data.phone || "",
        title: `Konfigurált ${c.catName.toLowerCase()} — ${c.tplName}`,
        interest: `${c.dims} · ${c.styleName} · ${c.qty} db · becsült: ${Math.round(c.estLo / 1000)}–${Math.round(c.estHi / 1000)} eFt`,
        estValue: c.net,
      });
      set((s) => ({ quoteConfigs: s.quoteConfigs.map((x) => (x.id === id ? { ...x, status: "ajanlatban", leadRef: lid, contact: data.contact || c.contact } : x)) }));
      emit();
      return lid;
    },

    // ── Térrendezés / Alaprajz (Belsőépítészet) — page-floorplan.jsx ──────────
    // state.floorplans = { [conceptId]: { rooms, zones, furn, seq } } — CSAK
    // GEOMETRIA (mm, felülnézet). LOD-elv: a tér-szint nem tárol árat/anyagot;
    // a bútor-kontúr a MŰSZAKI TERVEZÉS parametrikus skeletonjára (tplId + vars)
    // hivatkozik — ugyanaz a váz, alacsony felbontáson feloldva (befoglaló).
    // Az elem-szint adata a snapshotból/SpecEngine-ből SZÁMÍTOTT (ár, szállítási
    // idő), a furat/kötőelem-szint a műszaki tervezésé. Nincs LS-bump
    // (load-fallback: hiányzó floorplans → üres objektum).
    floorplanFor(cid) { ensure(); return (state.floorplans || {})[cid] || null; },
    ensureFloorplan(cid) {
      ensure();
      const ex = (state.floorplans || {})[cid];
      if (ex) return ex;
      const concept = (state.concepts || []).find((c) => c.id === cid);
      const rooms = [];
      let cx = 0, cy = 0, rowH = 0; const MAXW = 12000;
      (((concept || {}).rooms) || []).forEach((r, i) => {
        const aMm2 = Math.max(2, r.area || 8) * 1e6;
        const w = Math.round(Math.sqrt(aMm2 * 1.35) / 50) * 50;
        const h = Math.round((aMm2 / w) / 50) * 50;
        if (cx + w > MAXW && cx > 0) { cx = 0; cy += rowH + 200; rowH = 0; }
        rooms.push({ id: `fr-${i + 1}`, name: r.name, x: cx, y: cy, w, h, walls: {} });
        cx += w + 200; rowH = Math.max(rowH, h);
      });
      const fp = { rooms, zones: [], furn: [], seq: rooms.length };
      set((s) => ({ floorplans: { ...(s.floorplans || {}), [cid]: fp } }));
      emit();
      return fp;
    },
    _fpSet(cid, fn) {
      set((s) => {
        const fp = (s.floorplans || {})[cid];
        if (!fp) return {};
        return { floorplans: { ...s.floorplans, [cid]: fn(fp) } };
      });
      emit();
    },
    _fpAdd(cid, key, data, prefix) {
      ensure();
      let nid = null;
      api._fpSet(cid, (fp) => {
        const seq = (fp.seq || 0) + 1; nid = `${prefix}-${seq}`;
        return { ...fp, seq, [key]: [...(fp[key] || []), { id: nid, ...data }] };
      });
      return nid;
    },
    addFpRoom(cid, data = {}) { return api._fpAdd(cid, "rooms", { name: data.name || "Új helyiség", x: data.x || 0, y: data.y || 0, w: data.w || 3000, h: data.h || 3000, walls: {} }, "fr"); },
    updateFpRoom(cid, rid, patch) { ensure(); api._fpSet(cid, (fp) => ({ ...fp, rooms: fp.rooms.map((r) => (r.id === rid ? { ...r, ...patch } : r)) })); },
    removeFpRoom(cid, rid) { ensure(); api._fpSet(cid, (fp) => ({ ...fp, rooms: fp.rooms.filter((r) => r.id !== rid), zones: (fp.zones || []).filter((z) => z.roomId !== rid) })); },
    addFpZone(cid, data = {}) { return api._fpAdd(cid, "zones", { name: data.name || "Zóna", tone: data.tone || "emerald", roomId: data.roomId || null, x: data.x || 0, y: data.y || 0, w: data.w || 1500, h: data.h || 1500 }, "fz"); },
    updateFpZone(cid, zid, patch) { ensure(); api._fpSet(cid, (fp) => ({ ...fp, zones: (fp.zones || []).map((z) => (z.id === zid ? { ...z, ...patch } : z)) })); },
    removeFpZone(cid, zid) { ensure(); api._fpSet(cid, (fp) => ({ ...fp, zones: (fp.zones || []).filter((z) => z.id !== zid) })); },
    // bútor-kontúr: tplId + vars = a műszaki skeleton hivatkozása (LOD-0 feloldás)
    addFpFurn(cid, data = {}) { return api._fpAdd(cid, "furn", { label: data.label || "Bútor", tplId: data.tplId || null, vars: data.vars || null, x: data.x || 0, y: data.y || 0, w: data.w || 1200, d: data.d || 600, rot: data.rot || 0 }, "ff"); },
    updateFpFurn(cid, fid, patch) { ensure(); api._fpSet(cid, (fp) => ({ ...fp, furn: (fp.furn || []).map((f) => (f.id === fid ? { ...f, ...patch } : f)) })); },
    removeFpFurn(cid, fid) { ensure(); api._fpSet(cid, (fp) => ({ ...fp, furn: (fp.furn || []).filter((f) => f.id !== fid) })); },
    // fal → bútorsor (falnézet) link; compoId=null → leválasztás
    linkFpWall(cid, rid, side, compoId) {
      ensure();
      api._fpSet(cid, (fp) => ({ ...fp, rooms: fp.rooms.map((r) => (r.id === rid ? { ...r, walls: { ...(r.walls || {}), [side]: compoId } } : r)) }));
    },

    // ── Projekt-összeállítás (Belsőépítészet) — page-proj-assembly.jsx ────────
    // A koncepció + linkelt bútorsorok EGY projektté materializálása (§16 gerinc).
    // A nézet SZÁMÍTOTT (paAssemble); ez az akció csak a kapun átment koncepciót
    // alakítja projekt-vázlattá a meglévő createProject-en át (egy igazságforrás).
    // Duplikátum-véd: ha a koncepción már él projectRef és a projekt létezik, azt
    // adja vissza. Linkek: concept.projectRef ↔ project.conceptRef (nincs LS-bump).
    assembleProjectFromConcept(conceptId, opts = {}) {
      ensure();
      const c = (state.concepts || []).find((x) => x.id === conceptId);
      if (!c) return null;
      const ex = c.projectRef && (state.projects || []).find((p) => p.id === c.projectRef);
      if (ex) { if (window.toast) window.toast(`Már létezik projekt a koncepcióból: ${ex.id}`, "info"); return ex.id; }
      const comps = (state.compositions || []).filter((k) => (opts.compIds || []).includes(k.id));
      const items = [];
      comps.forEach((k) => (k.items || []).forEach((it) => {
        items.push({ name: `${k.room ? k.room + " — " : ""}${k.name}: ${it.tplName || it.catName || "Elem"}${it.dims ? ` (${it.dims})` : ""}`,
          value: (it.unitPrice || 0) * (it.qty || 1), compoRef: k.id, elemUid: it.uid,
          // design-átvitel a gyártás-előkészítésnek: a konfigurált sablon+méretek
          // (MfgPrep.deriveItem a picks[].vars-szal a TÉNYLEGES méretekből derivál)
          elemCategory: it.catName || null,
          config: it.tplId ? { picks: [{ tplId: it.tplId, qty: it.qty || 1, vars: it.vars || null }], styleId: it.styleId || null } : null });
      }));
      const trMap = { approved: "done", ready: "scheduled", in_progress: "scheduled" };
      const dependencies = (c.trades || []).map((t) => ({ trade: t.trade, label: t.title, party: t.party, due: t.due, status: trMap[t.status] || "pending", blocksInstall: t.trade !== "butor" }));
      const target = opts.installTarget || (() => { const d = new Date(); d.setDate(d.getDate() + 45); return d.toISOString().slice(0, 10); })();
      const pid = api.createProject({ name: c.name, customer: c.customer, installTarget: target, items, dependencies, templateId: opts.templateId || "tpl-konyha" });
      if (!pid) return null;
      set((s) => ({
        projects: s.projects.map((p) => (p.id === pid ? { ...p, conceptRef: c.id, kind: "interior" } : p)),
        concepts: s.concepts.map((x) => (x.id === conceptId ? { ...x, projectRef: pid } : x)),
      }));
      postSystem(`🏗️ Projekt-összeállítás: a(z) „${c.name}" koncepcióból projekt lett (${pid}) — ${items.length} elem, ${dependencies.length} szakág, ${comps.length} bútorsor.`);
      emit();
      return pid;
    },

    // ── Handoff-csomag (FŐ lánc: látványterv → kész projekt) ───────────────────
    // A projekt-összeállításból EGY gombbal: (1) teljes ajánlat a bútorsor-
    // elemekből + tervezési díjból, (2) dokumentum-csomag a DMS-be (a woodwork
    // dokumentum-lánc szerint: látványterv · alaprajz · gyártás-adatlap köteg),
    // (3) MUNKASZÁM a projektre (determinisztikus: MSZ-<projekt-szám>, nincs
    // LS-bump) — az elem-QR a meglévő elemUid (FpScanPanel / címke-QR kódja).
    // PERM-MENTES auto-belépő (mint a sendOrderToFinalQa); a dokumentumok itt
    // közvetlenül íródnak (a kiadásuk marad a DMS docs.manage joga alatt).
    // Duplikátum-véd: ha a projekten már él handoff, azt adja vissza.
    handoffConceptPackage(conceptId) {
      ensure();
      const c = (state.concepts || []).find((x) => x.id === conceptId);
      if (!c) return null;
      const p = c.projectRef && (state.projects || []).find((x) => x.id === c.projectRef);
      if (!p) { if (window.toast) window.toast("Előbb hozd létre a projektet a készültség-kapun át.", "warning"); return null; }
      if (p.handoff) { if (window.toast) window.toast(`Már van handoff-csomag (${p.handoff.workNo}).`, "info"); return p.handoff; }
      const workNo = "MSZ-" + p.id.replace(/^PRJ-/, "");
      // 1) teljes ajánlat: bútor-tételsorok (elem-QR kóddal) + tervezési díj
      const fee = window.conceptFee ? window.conceptFee(c) : 0;
      const lines = (p.items || []).map((it) => ({ name: it.name, code: it.elemUid || "", unit: "db", qty: 1, price: it.value || 0, vat: 27, config: it.config || null }));
      if (fee > 0) lines.push({ name: `Belsőépítészeti tervezési díj — ${c.name}`, code: c.id, unit: "díj", qty: 1, price: fee, vat: 27 });
      const qid = api.createQuote({ customer: c.customer, lines, owner: c.designer });
      // 2) dokumentum-csomag a DMS-be (egy mappa-elv: minden a projektre linkelve)
      let dseq = state.docSeq || 0;
      const mkDoc = (name, type, fileLabel, note) => {
        dseq += 1;
        return { id: `DOC-2426-${String(dseq).padStart(3, "0")}`, name, type, version: 1, status: "piszkozat",
          linkType: "project", linkId: p.id, linkLabel: `${p.id} · ${p.name}`,
          owner: c.designer || api.currentAccount().name, updatedAt: today, fileLabel, note,
          history: [{ v: 1, at: today, note: "Handoff-csomag része", status: "piszkozat" }] };
      };
      const docs = [
        mkDoc(`Látványterv — ${c.name}`, "rajz", "latvanyterv.pdf", `Handoff a(z) ${c.id} koncepcióból. Munkaszám: ${workNo}.`),
        mkDoc(`Térrendezés-alaprajz — ${c.name}`, "rajz", "alaprajz.pdf", `Helyiségek + fal-linkek a Térrendezésből (${c.id}).`),
        mkDoc(`Gyártás-adatlap köteg — ${c.name}`, "utasitas", "adatlapok.pdf", `Elemenkénti műszaki adatlap (Tervezés → Gyártás-adatlap). ${(p.items || []).length} elem, QR: elem-kód.`),
      ];
      const handoff = { at: today, workNo, quoteId: qid || null, docIds: docs.map((d) => d.id) };
      set((s) => ({
        documents: [...docs, ...(s.documents || [])], docSeq: dseq,
        projects: s.projects.map((x) => (x.id === p.id ? { ...x, workNo, handoff } : x)),
        concepts: s.concepts.map((x) => (x.id === conceptId ? { ...x, quoteRef: x.quoteRef || qid || null } : x)),
      }));
      postSystem(`📦 Handoff-csomag: ${c.name} → munkaszám ${workNo}, ajánlat ${qid || "—"}, ${docs.length} dokumentum a DMS-ben (${p.id}).`);
      emit();
      return handoff;
    },

    // ── Összeállítás / Bútorsor (falnézet) — Belsőépítészet (data-composition.js) ──
    // Egy összeállítás több konfigurált elemből áll (mini-konfig snapshot/elem).
    // Az ár + a falnézet-szín a SpecEngine-ből + a stílusból SZÁMÍTOTT — a tömeges
    // stílus-csere (updateCompoItems) automatikusan újraáraz. Kimenet: ajánlat,
    // elemenként külön tételsor (compositionToQuote → createQuote).
    compositionList() { ensure(); return state.compositions || []; },
    findComposition(id) { ensure(); return (state.compositions || []).find((c) => c.id === id) || null; },
    // egy elem snapshot árazása a SpecEngine-nel (anyag a stílusból, geometria a vars-ból)
    _compoPrice(item) {
      try {
        const cat = (state.specCategories || []).find((c) => c.id === item.categoryId);
        const style = (state.styles || []).find((x) => x.id === item.styleId);
        const tech = (state.techSpecs || []).find((x) => x.id === item.techId);
        if (!cat || !window.SpecEngine) return {};
        const r = window.SpecEngine.evaluateConfig({ category: cat, style, tech, picks: [{ tplId: item.tplId, qty: 1, vars: item.vars || {} }] });
        if (!r || !r.rows[0]) return {};
        return { unitPrice: Math.round(r.rows[0].unit), bandPct: r.bandPct, deliveryDays: r.deliveryDays };
      } catch (e) { return {}; }
    },
    addComposition(data = {}) {
      ensure();
      const seq = (state.compoSeq || 0) + 1;
      const id = `KOMP-2426-${String(seq).padStart(3, "0")}`;
      const c = { id, status: "piszkozat", name: data.name || "Új összeállítás", room: data.room || "Konyha",
        wallWidth: data.wallWidth || 3600, wallHeight: data.wallHeight || 2700, items: [],
        createdBy: api.currentAccount().name, createdAt: today, quoteRef: null, note: data.note || "" };
      set((s) => ({ compositions: [c, ...(s.compositions || [])], compoSeq: seq }));
      emit();
      return id;
    },
    updateComposition(id, patch = {}) {
      ensure();
      set((s) => ({ compositions: s.compositions.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      emit();
    },
    removeComposition(id) {
      ensure();
      set((s) => ({ compositions: (s.compositions || []).filter((c) => c.id !== id) }));
      emit();
    },
    // elem hozzáadása a sorhoz (ár-snapshot azonnal számolva)
    addCompoItem(id, item = {}) {
      ensure();
      const uid = `it-${Math.random().toString(36).slice(2, 8)}`;
      const priced = { mount: "floor", qty: 1, ...item, uid, ...api._compoPrice(item) };
      set((s) => ({ compositions: s.compositions.map((c) => (c.id === id ? { ...c, items: [...c.items, priced] } : c)) }));
      emit();
      return uid;
    },
    // ⚠️ TÖMEGES szerkesztés: a kijelölt uid-ekre alkalmazza a patch-et + ÚJRAÁRAZ.
    // patch.vars MERGE-elődik (geometria-egységesítés), styleId/techId cseréje újraszínez+áraz.
    updateCompoItems(id, uids, patch = {}) {
      ensure();
      const sel = new Set(uids || []);
      set((s) => ({ compositions: s.compositions.map((c) => {
        if (c.id !== id) return c;
        return { ...c, items: c.items.map((it) => {
          if (!sel.has(it.uid)) return it;
          const merged = { ...it, ...patch, vars: { ...(it.vars || {}), ...(patch.vars || {}) } };
          return { ...merged, ...api._compoPrice(merged) };
        }) };
      }) }));
      emit();
    },
    removeCompoItem(id, uid) {
      ensure();
      set((s) => ({ compositions: s.compositions.map((c) => (c.id === id ? { ...c, items: c.items.filter((it) => it.uid !== uid) } : c)) }));
      emit();
    },
    // drag-reorder: a húzott uid-et a beforeUid ELÉ szúrja (beforeUid null → a végére)
    reorderCompoItem(id, uid, beforeUid) {
      ensure();
      set((s) => ({ compositions: s.compositions.map((c) => {
        if (c.id !== id) return c;
        const items = [...c.items];
        const from = items.findIndex((it) => it.uid === uid);
        if (from === -1) return c;
        const [moved] = items.splice(from, 1);
        let to = beforeUid ? items.findIndex((it) => it.uid === beforeUid) : items.length;
        if (to === -1) to = items.length;
        items.splice(to, 0, moved);
        return { ...c, items };
      }) }));
      emit();
    },
    setCompositionStatus(id, to, opts = {}) {
      ensure();
      const c = (state.compositions || []).find((x) => x.id === id);
      if (!c) return false;
      if (!(window.CompoEngine && window.CompoEngine.canGo(c, to))) { if (window.toast) window.toast("Nem engedélyezett státuszváltás.", "error"); return false; }
      const patch = { status: to };
      if (opts.reason) patch.statusReason = opts.reason.trim();
      set((s) => ({ compositions: s.compositions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      emit();
      return true;
    },
    // összeállítás → ajánlat: ELEMENKÉNT külön tételsor (áttekinthető). quote.create jog.
    compositionToQuote(id, { customer, targetQuoteId } = {}) {
      ensure();
      if (!api.hasPerm("quote.create")) { if (window.toast) window.toast("Nincs jogosultság ajánlat létrehozásához (quote.create).", "error"); return null; }
      const c = (state.compositions || []).find((x) => x.id === id);
      if (!c || !c.items.length) { if (window.toast) window.toast("Üres összeállítás — adj hozzá elemet.", "warning"); return null; }
      const cust = (customer || c.customer || "").trim();
      if (!cust) { if (window.toast) window.toast("Adj meg ügyfelet az ajánlathoz.", "warning"); return null; }
      // Főtétel (a bútorsor mint csoport) + ELEMENKÉNT altagok — a főtétel a
      // gyerekek Σ-ját mutatja; a sorok forrás-zártak (csak a Belsőépítészetben
      // szerkeszthetők, az ajánlatban deep-link visz oda).
      const parentUid = api._quoteLineUid();
      const src = { world: "interior", kind: "composition", ref: c.id, label: "Belsőépítészet — Bútorsor" };
      const lines = [
        { uid: parentUid, name: `Bútorsor — ${c.name}`, code: c.id, unit: "csoport", qty: 1, price: 0, vat: 27, subMode: "osszevont", source: src },
        ...c.items.map((it) => ({
          parentUid, source: src,
          name: `${it.tplName}${it.styleName ? " — " + it.styleName : ""} (${(window.MOUNT_META[it.mount] || {}).label || ""})`,
          code: it.tplId, unit: "db", qty: it.qty || 1, price: it.unitPrice || 0, vat: 27,
          config: { categoryId: it.categoryId, styleId: it.styleId, techId: it.techId, vars: it.vars, dims: it.dims, mount: it.mount },
        })),
      ];
      const target = targetQuoteId && api.quoteEditable(targetQuoteId) ? targetQuoteId : null;
      if (target) {
        if (!api.addLinesToQuote(target, lines)) return null;
        set((s) => ({ compositions: s.compositions.map((x) => (x.id === id ? { ...x, status: "ajanlatban", quoteRef: target, customer: cust } : x)) }));
        api._autoFulfillInteriorReq(target, id);
        emit();
        return target;
      }
      const qid = api.createQuote({ customer: cust, lines, owner: c.createdBy });
      if (!qid) return null;
      set((s) => ({ compositions: s.compositions.map((x) => (x.id === id ? { ...x, status: "ajanlatban", quoteRef: qid, customer: cust } : x)) }));
      emit();
      return qid;
    },

    createQuote({ customer, lines, owner }) {
      ensure();
      if (!customer || !lines || !lines.length) return;
      const norm = lines.map((l) => api._normQuoteLine({ ...l, qty: l.qty == null ? 1 : l.qty }));
      const net = api._quoteNet(norm);
      const newId = "Q-2426-0" + String(59 + state.quotes.filter((q) => q.id.startsWith("Q-2426")).length).slice(-2);
      const itemCount = norm.reduce((n, l) => n + l.qty, 0);
      const q = { id: newId, customer, date: today, expires: "2026-06-15", value: net, status: "draft",
        items: itemCount, owner: owner || api.currentAccount().name, lines: norm };
      set((s) => ({ quotes: [q, ...s.quotes] }));
      postSystem(`📝 Új ajánlat (${newId}) összeállítva — ${customer}, ${lines.length} tétel, ${(net / 1e6).toFixed(2)} M Ft.`);
      emit();
      if (window.toast) window.toast(`✓ Ajánlat létrehozva — ${newId}`, "success");
      return newId;
    },

    // Ajánlat tételsorainak perzisztálása (CSAK draft státuszban) — a detail-nézet
    // sor-szerkesztője / ItemBuilder-e hívja. Újraszámolja a value/items mezőket,
    // így a konvertálás (igénylés → rendelés) már a tényleges tételeket viszi tovább.
    // ── Tételsor-hierarchia helperek ──
    // A sor stabil azonosítója: uid; altagja: parentUid. A főtétel (aminek van
    // gyereke) értéke = Σ gyerek (saját ára NEM számít, duplázás ellen). A
    // számozás (10/20/30 + 10.1/10.2) SZÁMÍTOTT — soha nem tárolt.
    _quoteLineUid() { return "ql-" + Math.random().toString(36).slice(2, 8); },
    _quoteNet(lines) {
      const hasKids = (uid) => uid && lines.some((x) => x.parentUid === uid);
      return lines.reduce((n, l) => (hasKids(l.uid) ? n : n + (Number(l.price) || 0) * (Number(l.qty) || 0)), 0);
    },
    _normQuoteLine(l) {
      return { uid: l.uid || api._quoteLineUid(), parentUid: l.parentUid || null, subMode: l.subMode || null,
        source: l.source || null, name: l.name || "Tétel", code: l.code, unit: l.unit || "db",
        qty: Number(l.qty) || 0, price: Number(l.price) || 0, cost: l.cost, vat: l.vat == null ? 27 : l.vat,
        design: l.design || null, config: l.config || null, custom: !!l.custom,
        priceClass: l.priceClass || null, rangePct: l.rangePct == null ? null : Number(l.rangePct) };
    },
    // ── Ár-érettség (arazas-egyedi-kutatas.md: AACE-osztály minta) ──
    //   A tétel ára nem EGY szám, hanem (ár, érettség, sáv) hármas.
    //   priceClass: fix (katalógus/sablon/RFQ) · kalkulalt (becsült, ±10%) ·
    //   iranyar (PS-irányösszeg, ±30%). Hiányzó = fix (backward compat).
    quotePriceProfile(q) {
      ensure();
      const META = window.PRICE_CLASS_META;
      const lines = (q && q.lines) || [];
      const hasKids = (uid) => uid && lines.some((x) => x.parentUid === uid);
      let min = 0, max = 0, net = 0;
      const counts = { fix: 0, kalkulalt: 0, iranyar: 0 };
      lines.forEach((l) => {
        if (hasKids(l.uid)) return;
        const cls = META[l.priceClass] ? l.priceClass : "fix";
        const band = l.rangePct != null ? Number(l.rangePct) : META[cls].band;
        const v = (Number(l.qty) || 0) * (Number(l.price) || 0);
        counts[cls]++; net += v;
        min += Math.round(v * (1 - band / 100));
        max += Math.round(v * (1 + band / 100));
      });
      return { net, min, max, counts, hasNonFix: counts.kalkulalt + counts.iranyar > 0 };
    },
    // PS-pontosítás: irányár/kalkulált tétel ára SZABÁLYOZOTT módosítással
    // változik (nem néma átírás) — bejegyzés a q.priceChanges[] naplóba, deltával.
    refineQuoteLine(quoteId, uid, { price, priceClass, note } = {}) {
      ensure();
      const q = state.quotes.find((x) => x.id === quoteId);
      if (!q || !["draft", "sent", "approved"].includes(q.status)) { if (window.toast) window.toast("Pontosítás csak draft/sent/approved ajánlaton.", "error"); return false; }
      const l = (q.lines || []).find((x) => x.uid === uid);
      if (!l) return false;
      const entry = { ts: today, uid, name: l.name, from: l.price, to: Number(price) || 0,
        fromClass: l.priceClass || "fix", toClass: priceClass || "fix", note: note || "", who: api.currentWorkerName ? api.currentWorkerName() : "" };
      const lines = q.lines.map((x) => (x.uid === uid ? { ...x, price: Number(price) || 0, priceClass: priceClass || "fix", rangePct: null } : x));
      const net = api._quoteNet(lines);
      set((s) => ({ quotes: s.quotes.map((x) => (x.id === quoteId ? { ...x, lines, value: net, priceChanges: [...(x.priceChanges || []), entry] } : x)) }));
      postSystem(`✏️ Ár-pontosítás a(z) ${quoteId} ajánlatban: „${l.name}" ${Math.round(entry.from).toLocaleString("hu-HU")} → ${Math.round(entry.to).toLocaleString("hu-HU")} Ft${note ? " — " + note : ""}.`);
      emit();
      return true;
    },
    // Számított tétel-számozás: főtételek 10, 20, 30…; altagok 10.1, 10.2…
    quoteLineNumbers(lines) {
      const map = {}; let main = 0;
      (lines || []).forEach((l) => {
        if (!l.parentUid) { main += 10; map[l.uid] = String(main); }
      });
      const kidCount = {};
      (lines || []).forEach((l) => {
        if (l.parentUid && map[l.parentUid]) {
          kidCount[l.parentUid] = (kidCount[l.parentUid] || 0) + 1;
          map[l.uid] = map[l.parentUid] + "." + kidCount[l.parentUid];
        }
      });
      return map;
    },

    updateQuoteLines(id, lines) {
      ensure();
      const q = state.quotes.find((x) => x.id === id);
      if (!q || q.status !== "draft" || !Array.isArray(lines)) return;
      const norm = lines.map((l) => api._normQuoteLine(l));
      const net = api._quoteNet(norm);
      const itemCount = norm.reduce((n, l) => n + l.qty, 0);
      set((s) => ({ quotes: s.quotes.map((x) => (x.id === id ? { ...x, lines: norm, value: net, items: itemCount } : x)) }));
      emit();
    },

    // Ajánlat szerkeszthető-e (tételt hozzáfűzni / összevonni CSAK draft-ban lehet).
    quoteEditable(id) { ensure(); const q = state.quotes.find((x) => x.id === id); return !!q && q.status === "draft"; },
    // Meglévő (draft) ajánlathoz tételsorok HOZZÁFŰZÉSE — így a belsőépítészeti díj/
    // tételek nem új ajánlatként jönnek létre, hanem a meglévőbe generálódnak.
    // Újraszámolja a value/items mezőket. Visszaad: true | false (ha nem szerkeszthető).
    addLinesToQuote(id, lines) {
      ensure();
      const q = state.quotes.find((x) => x.id === id);
      if (!q || q.status !== "draft" || !Array.isArray(lines) || !lines.length) {
        if (window.toast) window.toast("Csak vázlat (draft) állapotú ajánlathoz fűzhető tétel.", "error");
        return false;
      }
      const add = lines.map((l) => api._normQuoteLine({ ...l, qty: l.qty == null ? 1 : l.qty }));
      const merged = [...(q.lines || []).map((l) => api._normQuoteLine(l)), ...add];
      const net = api._quoteNet(merged);
      const itemCount = merged.reduce((n, l) => n + l.qty, 0);
      set((s) => ({ quotes: s.quotes.map((x) => (x.id === id ? { ...x, lines: merged, value: net, items: itemCount } : x)) }));
      postSystem(`➕ ${add.length} tétel hozzáadva a(z) ${id} ajánlathoz — új összeg ${(net / 1e6).toFixed(2)} M Ft.`);
      emit();
      if (window.toast) window.toast(`✓ ${add.length} tétel a(z) ${id} ajánlathoz adva`, "success");
      return true;
    },
    // Két ajánlat ÖSSZEVONÁSA: a forrás (sourceId) tételei a célba (targetId) kerülnek,
    // a forrás archiválódik (status "archived"). Mindkettő draft kell legyen (a forrás
    // legalább ne legyen converted/approved). A forrásra hivatkozó linkek (concept.quoteRef,
    // opp.quoteId) átállnak a célra — egy igazságforrás marad.
    mergeQuotes(targetId, sourceId) {
      ensure();
      if (targetId === sourceId) return false;
      const t = state.quotes.find((x) => x.id === targetId);
      const sc = state.quotes.find((x) => x.id === sourceId);
      if (!t || !sc) return false;
      if (t.status !== "draft") { if (window.toast) window.toast("A cél-ajánlatnak vázlat állapotúnak kell lennie.", "error"); return false; }
      if (["converted", "approved"].includes(sc.status)) { if (window.toast) window.toast("Konvertált/elfogadott ajánlat nem vonható össze.", "error"); return false; }
      const merged = [...(t.lines || []).map((l) => api._normQuoteLine(l)), ...(sc.lines || []).map((l) => api._normQuoteLine(l))];
      const net = api._quoteNet(merged);
      const itemCount = merged.reduce((n, l) => n + l.qty, 0);
      set((s) => ({
        quotes: s.quotes.map((x) => (
          x.id === targetId ? { ...x, lines: merged, value: net, items: itemCount } :
          x.id === sourceId ? { ...x, status: "archived", mergedInto: targetId } : x)),
        concepts: (s.concepts || []).map((c) => (c.quoteRef === sourceId ? { ...c, quoteRef: targetId } : c)),
        opportunities: (s.opportunities || []).map((o) => (o.quoteId === sourceId ? { ...o, quoteId: targetId } : o)),
      }));
      postSystem(`🔗 ${sourceId} összevonva ide: ${targetId} — ${(sc.lines || []).length} tétel áthelyezve, összeg ${(net / 1e6).toFixed(2)} M Ft.`);
      emit();
      if (window.toast) window.toast(`✓ ${sourceId} → ${targetId} összevonva`, "success");
      return true;
    },

    // ── Ajánlat al-ajánlatkérések (belső: belsőépítészet / műszaki tervezés; külső: RFQ) ──
    // Az ajánlat összeállítása közben KÉRÉS indítható más világok felé, hogy az
    // ajánlat pontosabb legyen. RENDELÉS az ajánlatból nem indítható — csak kérés.
    // quoteRequests[]: { id, quoteId, customer, kind: "interior"|"technical"|"rfq",
    //   note, status: kert → folyamatban → kesz (mellék: elutasitva, indokkal),
    //   resultRef (koncepció / RFQ id), imported }
    // Az rfq-kind státusza SZÁMÍTOTT a hivatkozott RFQ FSM-jéből (egy igazságforrás).
    _qrFlow: { kert: ["folyamatban", "kesz", "elutasitva"], folyamatban: ["kesz", "elutasitva"], kesz: [], elutasitva: ["kert"] },
    quoteRequestsFor(quoteId) {
      ensure();
      return (state.quoteRequests || []).filter((r) => r.quoteId === quoteId).map((r) => {
        if (r.kind === "rfq" && r.resultRef) {
          const rf = (state.rfqs || []).find((x) => x.id === r.resultRef);
          if (rf) return { ...r, status: rf.status === "odaitelve" ? "kesz" : rf.status === "visszavonva" ? "elutasitva" : "folyamatban" };
        }
        return r;
      });
    },
    // Van-e belsőépítészeti koncepció az ajánlathoz kötve? (a műszaki kérés előfeltétele)
    quoteHasConcept(quoteId) {
      ensure();
      const q = state.quotes.find((x) => x.id === quoteId);
      if (!q) return false;
      if ((state.concepts || []).some((c) => c.forQuoteId === quoteId || c.quoteRef === quoteId)) return true;
      const opp = (state.opportunities || []).find((o) => o.quoteId === quoteId);
      if (opp && opp.conceptRef) return true;
      return (q.lines || []).some((l) => l.source && (l.source.kind === "concept" || l.source.kind === "composition"));
    },
    requestQuoteSubOffer(quoteId, kind, { note } = {}) {
      ensure();
      const q = state.quotes.find((x) => x.id === quoteId);
      if (!q) return null;
      if (kind === "technical" && !api.quoteBriefReady(quoteId)) {
        if (window.toast) window.toast("A műszaki kéréshez előbb tervezési brief kell (legalább funkció + helyszín + stílus).", "error");
        return null;
      }
      const dup = (state.quoteRequests || []).find((r) => r.quoteId === quoteId && r.kind === kind && ["kert", "folyamatban"].includes(r.status));
      if (dup) { if (window.toast) window.toast(`Már van nyitott kérés (${dup.id}) — előbb az zárul.`, "warning"); return dup.id; }
      const seq = (state.qrSeq || 0) + 1;
      const id = `QR-2426-${String(seq).padStart(3, "0")}`;
      const req = { id, quoteId, customer: q.customer, kind, note: note || "", status: "kert", createdBy: api.currentAccount().name, createdAt: today, resultRef: null };
      set((s) => ({ quoteRequests: [...(s.quoteRequests || []), req], qrSeq: seq }));
      postSystem(kind === "interior"
        ? `🎨 Belsőépítészeti koncepció-kérés (${id}) a(z) ${quoteId} ajánlathoz — ${q.customer}.`
        : `📐 Műszaki tervezési kérés (${id}) a(z) ${quoteId} ajánlathoz — ${q.customer}.`);
      emit();
      if (window.toast) window.toast(`✓ Kérés elküldve — ${id}`, "success");
      return id;
    },
    setQuoteRequestStatus(id, to, { reason } = {}) {
      ensure();
      const r = (state.quoteRequests || []).find((x) => x.id === id);
      if (!r) return false;
      if (!(api._qrFlow[r.status] || []).includes(to)) { if (window.toast) window.toast(`Nem engedélyezett átmenet: ${r.status} → ${to}`, "error"); return false; }
      if (to === "elutasitva" && !(reason || "").trim()) { if (window.toast) window.toast("Az elutasításhoz indok szükséges.", "error"); return false; }
      // műszaki kérés: a teljesítés kapuja a munkalap készültsége (árazható ajánlat)
      if (to === "kesz" && r.kind === "technical") {
        const c = api.techReqCompleteness(r);
        if (!c.ready) { if (window.toast) window.toast("A műszaki munkalap hiányos: " + c.missing.map((m) => m.label).join(" · "), "error"); return false; }
      }
      set((s) => ({ quoteRequests: s.quoteRequests.map((x) => (x.id === id ? { ...x, status: to, reason: reason || x.reason } : x)) }));
      if (to === "kesz") postSystem(`✅ Ajánlat-kérés teljesítve (${id}) — ${r.quoteId}.`);
      if (to === "elutasitva") postSystem(`⛔ Ajánlat-kérés elutasítva (${id}) — ${reason}.`);
      emit();
      return true;
    },
    // ── Műszaki kérés MUNKALAP (terv-alap + bútor→sablon megfeleltetés + egyedi elemek) ──
    // A plan a kérésen él: { basis: "internal"|"external",
    //   rooms: [{id, name, desc, floorPlan, materials}],   // külső design-csomagnál kötelező
    //   items: [{id, roomId, name, qty, layout, mode: "template"|"custom",
    //            tplId, drawing2d, drawing3d, model, params, price}] }
    updateQuoteRequestPlan(id, patch) {
      ensure();
      set((s) => ({ quoteRequests: (s.quoteRequests || []).map((x) => (x.id === id ? { ...x, plan: { ...(x.plan || {}), ...patch } } : x)) }));
      emit();
    },
    // Készültség-kapu (a gyártás-adatlap mintájára) — SZÁMÍTOTT, soha ne tárold.
    // Minimum: terv-alap megvan (belső koncepció VAGY külső csomag teljes: minden
    // helyiség leírás+alaprajz+anyaghasználat+≥1 bútor); minden bútorhoz kiosztási
    // rajz; minden bútor vagy KIADOTT sablonra mutat, vagy egyediként 2D rajz +
    // árazási paraméterek; minden bútornak van ára (árazható ajánlat).
    techReqCompleteness(req) {
      ensure();
      const plan = (req && req.plan) || {};
      const basis = plan.basis || (api.quoteHasConcept(req.quoteId) ? "internal" : "external");
      const rooms = plan.rooms || [];
      const items = plan.items || [];
      const released = (tplId) => {
        if ((state.designTemplates || []).some((t) => t.id === tplId && t.status === "kiadott")) return true;
        return (window.PARAM_TEMPLATES || []).some((t) => t.id === tplId);
      };
      const roomBad = rooms.filter((r) => !(r.name || "").trim() || !(r.desc || "").trim() || !(r.floorPlan || "").trim() || !(r.materials || "").trim() || !items.some((i) => i.roomId === r.id));
      const checks = [];
      if (basis === "internal") {
        checks.push({ key: "basis", label: "Belsőépítészeti koncepció az ajánlaton", ok: api.quoteHasConcept(req.quoteId) });
      } else {
        checks.push({ key: "rooms", label: "Legalább egy helyiség a külső design-csomagban", ok: rooms.length > 0 });
        checks.push({ key: "roomdocs", label: "Minden helyiség: leírás + alaprajz + anyaghasználat + ≥1 bútor", ok: rooms.length > 0 && roomBad.length === 0 });
      }
      checks.push({ key: "items", label: "Legalább egy bútor a megfeleltetésben", ok: items.length > 0 });
      checks.push({ key: "layout", label: "Minden bútorhoz kiosztási rajz", ok: items.length > 0 && items.every((i) => (i.layout || "").trim()) });
      checks.push({ key: "map", label: "Minden bútor: kiadott sablon VAGY egyedi (2D rajz + paraméterek)", ok: items.length > 0 && items.every((i) => (i.mode === "custom" ? (i.drawing2d || "").trim() && (i.params || "").trim() : released(i.tplId))) });
      checks.push({ key: "price", label: "Minden bútornak van ára (árazható ajánlat)", ok: items.length > 0 && items.every((i) => Number(i.price) > 0) });
      const missing = checks.filter((c) => !c.ok);
      return { checks, missing, ready: missing.length === 0, basis };
    },
    // Teljesített műszaki munkalap → tételsorok az ajánlatban (főtétel + bútoronként altag, forrás-zárt).
    importTechResultToQuote(reqId) {
      ensure();
      const r = (state.quoteRequests || []).find((x) => x.id === reqId);
      if (!r || r.kind !== "technical") return false;
      if (r.status !== "kesz") { if (window.toast) window.toast("Előbb teljesíteni kell a műszaki munkalapot.", "error"); return false; }
      if (r.imported) { if (window.toast) window.toast("Már beemelve.", "warning"); return false; }
      const items = ((r.plan || {}).items || []);
      if (!items.length) return false;
      const src = { world: "design", kind: "techreq", ref: r.id, label: "Műszaki tervezés" };
      const parentUid = api._quoteLineUid();
      const rooms = (r.plan || {}).rooms || [];
      const lines = [
        { uid: parentUid, name: `Műszaki tervezés — bútorok (${r.id})`, code: r.id, unit: "csoport", qty: 1, price: 0, subMode: "reszletezett", source: src },
        ...items.map((i) => {
          const room = rooms.find((x) => x.id === i.roomId);
          return { parentUid, source: src, name: `${room ? room.name + " — " : ""}${i.name}${i.mode === "custom" ? " (egyedi)" : ""}`, code: i.mode === "custom" ? r.id : i.tplId, unit: "db", qty: Number(i.qty) || 1, price: Number(i.price) || 0,
            priceClass: i.mode === "custom" ? (i.priceClass || "iranyar") : "kalkulalt" };
        }),
      ];
      const ok = api.addLinesToQuote(r.quoteId, lines);
      if (ok) {
        set((s) => ({ quoteRequests: s.quoteRequests.map((x) => (x.id === reqId ? { ...x, imported: true } : x)) }));
        postSystem(`📐 Műszaki tervezési eredmény beemelve a(z) ${r.quoteId} ajánlatba (${items.length} bútor).`);
        emit();
      }
      return ok;
    },
    // A belsőépítész a kérésből indít koncepciót (a koncepció forQuoteId-vel linkelődik).
    startConceptFromQuoteRequest(reqId) {
      ensure();
      const r = (state.quoteRequests || []).find((x) => x.id === reqId);
      if (!r || r.kind !== "interior" || r.status !== "kert") return null;
      const q = state.quotes.find((x) => x.id === r.quoteId);
      if (!q) return null;
      const cid = `KON-2026-${String((state.concepts || []).length + 15).padStart(3, "0")}`;
      api.createConcept({ id: cid, name: `${q.customer} — ajánlat-koncepció (${q.id})`, customer: q.customer, brief: r.note || "" });
      set((s) => ({
        concepts: s.concepts.map((c) => (c.id === cid ? { ...c, forQuoteId: r.quoteId } : c)),
        quoteRequests: s.quoteRequests.map((x) => (x.id === reqId ? { ...x, status: "folyamatban", resultRef: cid } : x)),
      }));
      postSystem(`🎨 Koncepció indítva a kérésből (${reqId} → ${cid}).`);
      emit();
      return cid;
    },
    // A teljesítés automatikus: amikor a koncepció-díj / bútorsor a cél-ajánlatba íródik.
    _autoFulfillInteriorReq(quoteId, ref) {
      const r = (state.quoteRequests || []).find((x) => x.quoteId === quoteId && x.kind === "interior" && ["kert", "folyamatban"].includes(x.status));
      if (!r) return;
      set((s) => ({ quoteRequests: s.quoteRequests.map((x) => (x.id === r.id ? { ...x, status: "kesz", resultRef: x.resultRef || ref } : x)) }));
      postSystem(`✅ Belsőépítészeti ajánlat-kérés teljesítve (${r.id}) — tételek a(z) ${quoteId} ajánlatban.`);
    },
    // Külső ajánlatkérés: a meglévő RFQ-láncot használja (Beszerzés → Ajánlatkérés).
    createRfqFromQuote(quoteId, { note } = {}) {
      ensure();
      const q = state.quotes.find((x) => x.id === quoteId);
      if (!q) return null;
      const rfqId = api.addRfq({ title: `Ajánlathoz: ${q.id} — ${q.customer}`, note: note || `Külső ajánlatkérés a(z) ${q.id} ajánlat pontosításához`, lines: [], suppliers: [] });
      if (!rfqId) return null;
      const seq = (state.qrSeq || 0) + 1;
      const id = `QR-2426-${String(seq).padStart(3, "0")}`;
      set((s) => ({
        rfqs: (s.rfqs || []).map((x) => (x.id === rfqId ? { ...x, sourceQuoteId: quoteId } : x)),
        quoteRequests: [...(s.quoteRequests || []), { id, quoteId, customer: q.customer, kind: "rfq", note: note || "", status: "kert", createdBy: api.currentAccount().name, createdAt: today, resultRef: rfqId }],
        qrSeq: seq,
      }));
      postSystem(`📨 Külső ajánlatkérés (${rfqId}) indítva a(z) ${quoteId} ajánlathoz.`);
      emit();
      return rfqId;
    },
    // Odáítélt RFQ nyertes ára → tételsor az ajánlatban (forrás-zárt).
    importRfqResultToQuote(quoteId, rfqId) {
      ensure();
      const rf = (state.rfqs || []).find((x) => x.id === rfqId);
      if (!rf || rf.status !== "odaitelve" || !rf.awardedTo) { if (window.toast) window.toast("Csak odaítélt RFQ eredménye emelhető be.", "error"); return false; }
      const E = window.RfqEngine;
      const total = E && E.supplierTotal ? E.supplierTotal(rf, rf.awardedTo) : 0;
      if (!(total > 0)) { if (window.toast) window.toast("A nyertesnek nincs beárazott ajánlata.", "error"); return false; }
      const ok = api.addLinesToQuote(quoteId, [{ name: `${rf.title} — ${rf.awardedTo} (külső ajánlat)`, code: rf.id, unit: "tétel", qty: 1, price: total, source: { world: "procurement", kind: "rfq", ref: rf.id, label: "Beszerzés — RFQ" } }]);
      if (ok) {
        set((s) => ({ quoteRequests: (s.quoteRequests || []).map((x) => (x.kind === "rfq" && x.resultRef === rfqId ? { ...x, imported: true } : x)) }));
        postSystem(`📥 RFQ-eredmény beépítve a(z) ${quoteId} ajánlatba (${rf.awardedTo}, ${Math.round(total / 1000)} eFt).`);
        emit();
      }
      return ok;
    },
    // Ajánlat-készítési díj: KÜLÖN kis ajánlat megy ki ELŐRE; amíg nincs elfogadva,
    // a részletes (fő) ajánlat kiküldése ZÁRT (UI-kapu a Sales detailben).
    createFeeQuoteForQuote(quoteId, amount) {
      ensure();
      const q = state.quotes.find((x) => x.id === quoteId);
      if (!q) return null;
      if (q.feeQuoteId) {
        const f = state.quotes.find((x) => x.id === q.feeQuoteId);
        if (f && f.status !== "archived") { if (window.toast) window.toast(`Már van díj-ajánlat: ${f.id}`, "warning"); return f.id; }
      }
      if (!(Number(amount) > 0)) { if (window.toast) window.toast("Adj meg érvényes díjat.", "error"); return null; }
      const feeId = api.createQuote({ customer: q.customer, lines: [{ name: `Részletes ajánlat készítési díja — ${q.id}`, code: q.id, unit: "díj", qty: 1, price: Number(amount) }], owner: q.owner });
      if (!feeId) return null;
      set((s) => ({ quotes: s.quotes.map((x) => (x.id === quoteId ? { ...x, feeQuoteId: feeId } : x.id === feeId ? { ...x, detailFor: quoteId } : x)) }));
      postSystem(`💰 Ajánlat-készítési díj-ajánlat (${feeId}, ${Math.round(amount / 1000)} eFt) a(z) ${quoteId} részletes ajánlathoz — elfogadásáig a kiküldés zárt.`);
      emit();
      return feeId;
    },

    // ── TERVEZÉSI BRIEF (igény-információ) — data-brief.js modell ─────────────
    //   Két szint: scope:"quote" (ajánlat-szintű általános) + scope:"line"
    //   (bútoronkénti, a TERV-tételhez kötve). Eljut a tervezőkhöz, Q&A
    //   ciklusban gazdagodik, minden módosítás naplózva, projektbe átmegy.
    //   Backward-kompatibilis: minden olvasás `|| []` — nincs LS-bump.
    _nextBriefId() {
      const seq = (state.briefSeq || 0) + 1;
      return { id: `${window.BRIEF_PREFIX || "BRF"}-2426-${String(seq).padStart(3, "0")}`, seq };
    },
    _briefWho() { return (api.currentWorkerName && api.currentWorkerName()) || api.currentAccount().name || "Felhasználó"; },
    _briefLog(kind, label, extra = {}) { return { ts: nowStamp(), who: api._briefWho(), kind, label, ...extra }; },
    findBrief(id) { ensure(); return (state.briefs || []).find((b) => b.id === id) || null; },
    briefsForQuote(quoteId) { ensure(); return (state.briefs || []).filter((b) => b.quoteId === quoteId); },
    briefsForProject(projectId) { ensure(); return (state.briefs || []).filter((b) => b.projectId === projectId); },
    quoteLevelBrief(quoteId) { ensure(); return (state.briefs || []).find((b) => b.quoteId === quoteId && b.scope === "quote") || null; },
    lineBrief(quoteId, lineUid) { ensure(); return (state.briefs || []).find((b) => b.quoteId === quoteId && b.scope === "furniture" && b.lineUid === lineUid) || null; },
    briefChildren(parentBriefId) { ensure(); return (state.briefs || []).filter((b) => b.parentBriefId === parentBriefId); },
    // Meglévőt ad vissza, vagy létrehoz (a megnyitáskor hívva). A brief HIERARCHIKUS:
    //   scope ∈ quote|site|area|room|furniture, parentBriefId köti a fába, name a címke.
    ensureBrief({ scope = "quote", quoteId = null, lineUid = null, projectId = null, parentBriefId = null, name = "", title = "", site = "" } = {}) {
      ensure();
      let existing = null;
      if (scope === "furniture") existing = api.lineBrief(quoteId, lineUid);
      else if (scope === "quote" && quoteId) existing = api.quoteLevelBrief(quoteId);
      else if (projectId && scope === "quote") existing = (state.briefs || []).find((b) => b.projectId === projectId && b.scope === "quote" && !b.quoteId);
      else if (parentBriefId && name) existing = (state.briefs || []).find((b) => b.parentBriefId === parentBriefId && b.scope === scope && (b.name || "") === name);
      if (existing) return existing.id;
      const scLabel = (window.BRIEF_SCOPES[scope] || {}).label || "Brief";
      const { id, seq } = api._nextBriefId();
      const b = { id, scope, quoteId, lineUid, projectId, parentBriefId, name: name || "", site: site || "",
        title: title || (name ? `${scLabel} — ${name}` : scLabel),
        fields: { func: "", site: "", style: "", users: "", special: "", budgetMin: "", budgetMax: "", deadline: "" },
        refs: [], questions: [], history: [api._briefLog("create", `${scLabel} brief létrehozva`)],
        createdBy: api._briefWho(), createdAt: today, updatedAt: today };
      set((s) => ({ briefs: [...(s.briefs || []), b], briefSeq: seq }));
      emit();
      return id;
    },
    // Gyermek-brief hozzáadása a fába (helyszín/terület/helyiség/bútor).
    addChildBrief(parentBriefId, name) {
      ensure();
      const p = api.findBrief(parentBriefId); if (!p) return null;
      const childScope = window.briefChildScope(p.scope);
      if (!childScope) { if (window.toast) window.toast("Ezen a szinten nincs alsóbb szint.", "info"); return null; }
      return api.ensureBrief({ scope: childScope, quoteId: p.quoteId, projectId: p.projectId, parentBriefId, name: name || "" });
    },
    renameBrief(id, name) {
      ensure();
      const b = api.findBrief(id); if (!b) return false;
      const scLabel = (window.BRIEF_SCOPES[b.scope] || {}).label || "Brief";
      set((s) => ({ briefs: s.briefs.map((x) => (x.id === id ? { ...x, name, title: name ? `${scLabel} — ${name}` : scLabel } : x)) }));
      emit(); return true;
    },
    // Helyszín / végügyfél a brief-gyökéren — egy ÜGYFÉL (számla-partner, pl.
    // belsőépítész cég) több HELYSZÍNT (végügyfelet) is vihet, mind külön brief-fa.
    setBriefSite(id, site) {
      ensure();
      const b = api.findBrief(id); if (!b) return false;
      set((s) => ({ briefs: s.briefs.map((x) => (x.id === id ? { ...x, site: site || "", updatedAt: today, history: [...x.history, api._briefLog("field", `Helyszín / végügyfél: ${site || "—"}`)] } : x)) }));
      emit(); return true;
    },
    briefSite(b) { return (b && b.site) || ""; },
    // A (gyökér) brief RÖGZÍTÉSE a DOKUMENTUMTÁRBA — verziózott DMS-dokumentum (egy
    // igazságforrás: a metaadat a DMS-ben, a brief tartalma a briefs[]-ben; a doc
    // a brief-re mutat `briefId`-vel, a brief a doc-ra `docId`-vel). PERM-MENTES
    // auto-belépő (mint a webshop→lead). Idempotens: meglévőt ad vissza.
    registerBriefDoc(briefId) {
      ensure();
      const b = api.findBrief(briefId); if (!b || b.parentBriefId) return null;
      if (b.docId && api.findDoc(b.docId)) return b.docId;
      const cust = api.briefCustomer(b) || "—";
      const { id, seq } = api._nextDocId();
      const doc = { id, name: `Tervezési brief — ${cust}${b.site ? " · " + b.site : ""}`, type: "egyeb", version: 1, status: "piszkozat",
        linkType: "customer", linkId: cust, linkLabel: `${cust}${b.site ? " — " + b.site : ""}`, briefId: b.id,
        owner: api._briefWho(), updatedAt: today, fileLabel: `brief-${b.id}.pdf`,
        note: `Igény-brief (helyszín/végügyfél: ${b.site || "—"}). Funkció: ${(b.fields || {}).func || "—"}.`,
        history: [{ v: 1, at: today, note: "Brief rögzítve a dokumentumtárban", status: "piszkozat" }] };
      set((s) => ({ documents: [doc, ...(s.documents || [])], docSeq: seq,
        briefs: s.briefs.map((x) => (x.id === b.id ? { ...x, docId: id, history: [...x.history, api._briefLog("ref", `Rögzítve a dokumentumtárban (${id})`)] } : x)) }));
      postSystem(`📄 Tervezési brief rögzítve a dokumentumtárban (${id}) — ${cust}.`);
      emit();
      return id;
    },

    // ── ÜGYFÉL-NÉZET: minden egy helyen ──────────────────────────────
    ordersForCustomer(customer) { ensure(); return (state.orders || []).filter((o) => o.customer === customer); },
    quotesForCustomer(customer) { ensure(); return (state.quotes || []).filter((q) => q.customer === customer); },
    // ── ÜGYFÉL-PORTÁL projekt-betekintő (4.14) ───────────────────────────────
    //   Domén-semleges MAG + cserélhető adapterek (lásd ProjectPortalAdapters).
    //   Csak a cég által MEGOSZTHATÓ tartalom (jóváhagyott/kiadott/véglegesített).
    // A projekt megosztható látványterve: van kiválasztott változat ÉS nem piszkozat/archív.
    conceptForProject(projectId) {
      ensure();
      return (state.concepts || []).find((c) =>
        c.projectRef === projectId && c.selectedVariantId &&
        c.status !== "draft" && c.status !== "archived" && c.status !== "brief") || null;
    },
    // Gyártási fázisok a vevőnek: a HR-beosztásokból, de NÉV/óra/bér NÉLKÜL — csak a
    // fázis-címke + időszak + kész/folyamatban (a vevő a haladást látja, nem a belső erőforrást).
    customerProjectPhases(projectId) {
      ensure();
      const t = today;
      return (state.assignments || [])
        .filter((a) => a.projectId === projectId && a.source !== "maintenance")
        .map((a) => ({ id: a.id, label: a.label, start: a.start, end: a.end || a.start,
          done: (a.end || a.start) < t, active: a.start <= t && (a.end || a.start) >= t }))
        .sort((x, y) => (x.start || "").localeCompare(y.start || ""));
    },
    // A vevő üzen a cégnek/tervezőnek egy adott elemről — a kapcsolati naplóba (customerNotes) +
    // rendszerüzenet a belső csapatnak. PERM-MENTES (a saját portálján).
    customerMessage(customer, text, refLabel) {
      ensure();
      const body = String(text || "").trim(); if (!body) return false;
      const note = { id: "cn-" + Date.now().toString(36), customer, text: (refLabel ? `[${refLabel}] ` : "") + body, ts: nowStamp(), from: "portal" };
      set((s) => ({ customerNotes: [note, ...(s.customerNotes || [])] }));
      postSystem(`💬 ${customer} üzent a portálon${refLabel ? ` (${refLabel})` : ""}: „${body.slice(0, 80)}${body.length > 80 ? "…" : ""}"`, "ch-prod");
      emit();
      if (window.toast) window.toast("Üzenet elküldve — hamarosan válaszolunk.", "success");
      return true;
    },
    customerNotesFor(customer) { ensure(); return (state.customerNotes || []).filter((n) => n.customer === customer).sort((a, b) => (b.ts || "").localeCompare(a.ts || "")); },
    // ── Kapcsolati profil: hangnem, elvárások, speciális igények ──────────────
    //   Egy egyesített Business Partner modellben is ezen a (relationship) rétegen
    //   élne — ezért külön map (perm-mentes, séma-bump nélkül, kulcs = ügyfél-név).
    customerProfile(customer) { ensure(); return (state.customerProfiles || {})[customer] || {}; },
    setCustomerProfile(customer, patch) {
      ensure();
      set((s) => ({ customerProfiles: { ...(s.customerProfiles || {}), [customer]: { ...((s.customerProfiles || {})[customer] || {}), ...patch } } }));
      emit(); return true;
    },
    // ── Cég-önkép (tenant értékrendje) — az értékesítés iránymutatása ──────────
    //   Tükör-párja az ügyfél kapcsolati profiljának: a SAJÁT hangnemünk + azok az
    //   értékek/ígéretek, amiket minden ügyfélnél szem előtt kell tartani.
    companyProfile() { ensure(); return state.companyProfile || {}; },
    setCompanyProfile(patch) {
      ensure();
      set((s) => ({ companyProfile: { ...(s.companyProfile || {}), ...patch } }));
      emit(); return true;
    },

    // ── PARTNER-KAPCSOLAT NÉZET — a beszállítói/bérmunka kapcsolat belső, teljes
    //   tükre. Egy igazságforrás: ugyanaz az RFQ/PO/kézfogás lánc, mint amit a
    //   partner a saját portálján lát — PLUSZ a csak-belső réteg (költés, árrés,
    //   teljesítmény, jegyzetek, minősítés). A profil/jegyzet a customer-mintát
    //   tükrözi (perm-mentes map, kulcs = partner-NÉV, séma-bump nélkül).
    partnerByName(name) { ensure(); return (state.partners || []).find((p) => p.name === name) || null; },
    // a partnerhez tartozó PORTÁL-fiók (ha van) — a „Belépés partnerként"-hez
    accountForPartner(partner) {
      ensure();
      if (!partner) return null;
      const pid = partner.partnerId || partner.id;
      return (state.accounts || []).find((a) => a.partnerId === pid) || null;
    },
    // a partnerrel közös kézfogások (bérmunka / delegált / fuvar / crm / belső)
    partnerHandshakes(name) {
      ensure();
      const p = api.partnerByName(name);
      const pid = p ? (p.partnerId || p.id) : null;
      return (state.handshakes || []).filter((h) => (name && h.partnerName === name) || (pid && h.partnerId === pid));
    },
    // SZÁMÍTOTT kapcsolati statisztika (soha ne tárold) — a belső extra adat
    partnerStats(name) {
      ensure();
      const E = window.RfqEngine;
      const rfqs = api.supplierRfqs(name);
      const pos = api.supplierPos(name);
      const hs = api.partnerHandshakes(name);
      const participated = rfqs.filter((r) => (r.suppliers || []).some((s) => s.name === name && s.responded));
      const won = rfqs.filter((r) => r.awardedTo === name);
      const winRate = participated.length ? Math.round((won.length / participated.length) * 100) : null;
      const spend = pos.reduce((sum, p) => sum + (Number(p.total) || (p.lines || []).reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.qty) || 0), 0)), 0);
      let leadSum = 0, leadN = 0;
      rfqs.forEach((r) => { const sup = (r.suppliers || []).find((s) => s.name === name); if (sup && sup.bids) Object.values(sup.bids).forEach((b) => { if (b && b.leadDays != null) { leadSum += Number(b.leadDays) || 0; leadN++; } }); });
      const avgLead = leadN ? Math.round(leadSum / leadN) : null;
      let savings = 0;
      won.forEach((r) => { const sv = E && E.savings ? E.savings(r) : null; if (sv) savings += sv.amount; });
      const lateCount = pos.filter((p) => p.status === "running" && (p.promiseDate || p.eta) && (p.promiseDate || p.eta) < today).length;
      return {
        rfqTotal: rfqs.length, participated: participated.length, won: won.length, winRate,
        poCount: pos.length, spend, avgLead, savings, lateCount,
        hsTotal: hs.length, hsActive: hs.filter((h) => !["done", "declined"].includes(h.status)).length,
      };
    },
    // perm-mentes profil-map (minősítés, megbízhatóság, státusz) — kulcs = név
    partnerProfile(name) { ensure(); return (state.partnerProfiles || {})[name] || {}; },
    setPartnerProfile(name, patch) {
      ensure();
      set((s) => ({ partnerProfiles: { ...(s.partnerProfiles || {}), [name]: { ...((s.partnerProfiles || {})[name] || {}), ...patch } } }));
      emit(); return true;
    },
    // belső jegyzetek a partnerről (mint a customerNotes)
    partnerNotesFor(name) { ensure(); return (state.partnerNotes || []).filter((n) => n.partner === name).sort((a, b) => (b.ts || "").localeCompare(a.ts || "")); },
    addPartnerNote(name, text) {
      ensure();
      if (!String(text || "").trim()) return false;
      const note = { id: "pn-" + Math.random().toString(36).slice(2, 8), partner: name, text: text.trim(), by: api.currentAccount().name, ts: nowStamp() };
      set((s) => ({ partnerNotes: [note, ...(s.partnerNotes || [])] }));
      emit(); return note.id;
    },
    removePartnerNote(noteId) {
      ensure();
      set((s) => ({ partnerNotes: (s.partnerNotes || []).filter((n) => n.id !== noteId) }));
      emit(); return true;
    },
    // ── MÁRKA / ARCULAT (branding) — cél, vízió, hangnem, vizuális eszközök ────
    //   + szabályzat / belsős dokumentumok / minta szerződések / sablonok, amik a
    //   DOKUMENTUMTÁRBA is bekerülnek (mint a brief: registerBrandDoc).
    branding() {
      ensure();
      const b = state.branding || {};
      return { mission: "", vision: "", goal: "", accent: "", accentSecondary: "", tone: "", voice: "", logoLabel: "", colors: [], fonts: [], items: [], personas: [], ...b };
    },
    setBranding(patch) {
      ensure();
      set((s) => ({ branding: { ...api.branding(), ...patch } }));
      emit(); return true;
    },
    // Márka-dokumentum kategóriák → DMS dokumentum-típus
    _brandDocType(kind) { return { policy: "utasitas", internal: "egyeb", contract: "szerzodes", template: "egyeb" }[kind] || "egyeb"; },
    addBrandItem(kind, { title, note } = {}) {
      ensure();
      if (!String(title || "").trim()) return null;
      const KIND_LABEL = { policy: "Szabályzat", internal: "Belső dokumentum", contract: "Minta szerződés", template: "Sablon" };
      const id = "br-" + Math.random().toString(36).slice(2, 8);
      const item = { id, kind, title: title.trim(), note: (note || "").trim(), docId: null, rag: true,
        fileLabel: `${kind}-${title.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 24)}.pdf` };
      // egyből DMS-dokumentumot is létrehozunk (egy igazságforrás)
      const { id: docId, seq } = api._nextDocId();
      const doc = { id: docId, name: `${KIND_LABEL[kind] || "Márka"} — ${item.title}`, type: api._brandDocType(kind), version: 1, status: "piszkozat",
        linkType: "none", linkId: null, linkLabel: "Márka / arculat", brandItemId: id,
        owner: api._briefWho ? api._briefWho() : api.currentAccount().name, updatedAt: today, fileLabel: item.fileLabel,
        note: note || `${KIND_LABEL[kind] || "Márka"} — arculati dokumentum.`,
        history: [{ v: 1, at: today, note: "Márka-dokumentum rögzítve", status: "piszkozat" }] };
      item.docId = docId;
      set((s) => ({ branding: { ...api.branding(), items: [...api.branding().items, item] }, documents: [doc, ...(s.documents || [])], docSeq: seq }));
      postSystem(`📄 Márka-dokumentum rögzítve a dokumentumtárban (${docId}) — ${item.title}.`);
      emit();
      return id;
    },
    removeBrandItem(id) {
      ensure();
      set((s) => ({ branding: { ...api.branding(), items: api.branding().items.filter((x) => x.id !== id) } }));
      emit(); return true;
    },
    // AI tudásbázis (RAG) jelölő — mely márka-dokumentumok kerüljenek a retrieval-indexbe
    toggleBrandItemRag(id) {
      ensure();
      set((s) => ({ branding: { ...api.branding(), items: api.branding().items.map((x) => (x.id === id ? { ...x, rag: !x.rag } : x)) } }));
      emit(); return true;
    },
    // SZÁMÍTOTT: a RAG-tudásbázisba sorolt márka-dokumentumok
    brandRagDocs() { ensure(); return api.branding().items.filter((x) => x.rag); },
    // ── Céges AI rendszer-prompt (LLM context) ──
    // Strukturált szöveg- vagy objektum-blokk; LLM system prompt-ként használható.
    // format:"text" (default) → string; format:"object" → { company, mission, ..., text }
    brandContext({ format = "text" } = {}) {
      ensure();
      const b = api.branding();
      const companyName = (api.currentAccount ? api.currentAccount().company || api.currentAccount().name : null) || "JoineryTech";
      const lines = [];
      lines.push("# Ceg: " + companyName);
      if (b.mission)  lines.push("\nKuldetes: " + b.mission.trim());
      if (b.vision)   lines.push("Vizió: " + b.vision.trim());
      if (b.goal)     lines.push("Strategiai celok:\n" + b.goal.trim().split("\n").map(function(l){ return "  " + l; }).join("\n"));
      if (b.tone)     lines.push("\nKommunikacio hangneme: " + b.tone);
      if (b.voice)    lines.push("Marka-hang: " + b.voice.trim());
      const personas = b.personas || [];
      if (personas.length) {
        lines.push("\nCelkozonseg (personak):");
        personas.forEach(function(p) {
          lines.push("  * " + p.name + (p.role ? " — " + p.role : "") + (p.ageRange ? " (" + p.ageRange + " ev)" : ""));
          if (p.goals)   lines.push("    Celjai: " + p.goals);
          if (p.pains)   lines.push("    Fajdalompontjai: " + p.pains);
          if (p.channel) lines.push("    Csatorna: " + p.channel);
          if (p.quote)   lines.push("    Idezet: " + p.quote);
        });
      }
      const ragDocs = api.brandRagDocs();
      if (ragDocs.length) lines.push("\nTudásbazis (RAG): " + ragDocs.map(function(d){ return d.title; }).join(" * "));
      const text = lines.join("\n");
      if (format === "object") return { company: companyName, mission: b.mission, vision: b.vision, goal: b.goal, tone: b.tone, voice: b.voice, personas: personas, ragDocs: ragDocs.map(function(d){ return d.title; }), text: text };
      return text;
    },
    // ── Persona-k (célközönség-profilok) ──
    addPersona(data = {}) {
      ensure();
      const id = "pe-" + Math.random().toString(36).slice(2, 8);
      const p = { id, name: "", role: "", ageRange: "", goals: "", pains: "", channel: "", quote: "", ...data };
      set(() => ({ branding: { ...api.branding(), personas: [...(api.branding().personas || []), p] } }));
      emit(); return id;
    },
    updatePersona(id, patch) {
      ensure();
      set(() => ({ branding: { ...api.branding(), personas: (api.branding().personas || []).map((p) => p.id === id ? { ...p, ...patch } : p) } }));
      emit(); return true;
    },
    removePersona(id) {
      ensure();
      set(() => ({ branding: { ...api.branding(), personas: (api.branding().personas || []).filter((p) => p.id !== id) } }));
      emit(); return true;
    },

    // ── AI MUNKATERÜLET — skills / agents / memory + rendszer-prompt összefűzés ──
    //   A brandContext() ELSŐ tényleges fogyasztója: az assembleSystemPrompt a
    //   cég → projekt → agent → skill → memória rétegeket egy LLM system promptba
    //   fűzi; a Playground ezt adja a window.claude.complete-nek.
    aiSkillList() { ensure(); return state.aiSkills || []; },
    aiAgentList() { ensure(); return state.aiAgents || []; },
    aiMemoryList() { ensure(); return state.aiMemory || []; },
    findAiSkill(id) { ensure(); return (state.aiSkills || []).find((x) => x.id === id); },
    findAiAgent(id) { ensure(); return (state.aiAgents || []).find((x) => x.id === id); },
    aiProjectPrompt() { ensure(); return state.aiProjectPrompt || ""; },
    setAiProjectPrompt(text) { ensure(); set(() => ({ aiProjectPrompt: text || "" })); emit(); return true; },
    _aiGuard() {
      if (!api.hasPerm("ai.manage")) { if (window.toast) window.toast("Nincs jogosultság (ai.manage).", "error"); return false; }
      return true;
    },
    // Skill CRUD
    addAiSkill(data = {}) {
      ensure(); if (!api._aiGuard()) return null;
      const seq = (state.aiSkillSeq || 0) + 1;
      const sk = { id: "sk-" + seq + "-" + Math.random().toString(36).slice(2, 6), name: "", desc: "", inputs: [], promptTemplate: "", tint: "indigo", ...data };
      set((s) => ({ aiSkills: [...(s.aiSkills || []), sk], aiSkillSeq: seq })); emit(); return sk.id;
    },
    updateAiSkill(id, patch) { ensure(); if (!api._aiGuard()) return false; set((s) => ({ aiSkills: (s.aiSkills || []).map((x) => x.id === id ? { ...x, ...patch } : x) })); emit(); return true; },
    removeAiSkill(id) {
      ensure(); if (!api._aiGuard()) return false;
      set((s) => ({ aiSkills: (s.aiSkills || []).filter((x) => x.id !== id),
        aiAgents: (s.aiAgents || []).map((a) => ({ ...a, skills: (a.skills || []).filter((sid) => sid !== id) })) }));
      emit(); return true;
    },
    // Agent CRUD + kanban-státusz
    addAiAgent(data = {}) {
      ensure(); if (!api._aiGuard()) return null;
      const seq = (state.aiAgentSeq || 0) + 1;
      const ag = { id: "ag-" + seq + "-" + Math.random().toString(36).slice(2, 6), name: "", role: "", systemPrompt: "", stage: "definialt", skills: [], lastRun: null, ...data };
      set((s) => ({ aiAgents: [...(s.aiAgents || []), ag], aiAgentSeq: seq })); emit(); return ag.id;
    },
    updateAiAgent(id, patch) { ensure(); if (!api._aiGuard()) return false; set((s) => ({ aiAgents: (s.aiAgents || []).map((x) => x.id === id ? { ...x, ...patch } : x) })); emit(); return true; },
    removeAiAgent(id) {
      ensure(); if (!api._aiGuard()) return false;
      set((s) => ({ aiAgents: (s.aiAgents || []).filter((x) => x.id !== id), aiMemory: (s.aiMemory || []).filter((m) => m.agentId !== id) }));
      emit(); return true;
    },
    setAiAgentStage(id, stage) {
      ensure(); if (!api._aiGuard()) return false;
      if (!window.AI_AGENT_STAGES || !window.AI_AGENT_STAGES[stage]) return false;
      set((s) => ({ aiAgents: (s.aiAgents || []).map((x) => x.id === id ? { ...x, stage } : x) })); emit(); return true;
    },
    toggleAiAgentSkill(agentId, skillId) {
      ensure(); if (!api._aiGuard()) return false;
      set((s) => ({ aiAgents: (s.aiAgents || []).map((a) => {
        if (a.id !== agentId) return a;
        const has = (a.skills || []).includes(skillId);
        return { ...a, skills: has ? a.skills.filter((x) => x !== skillId) : [...(a.skills || []), skillId] };
      }) })); emit(); return true;
    },
    // Memória CRUD
    addAiMemory(data = {}) {
      ensure(); if (!api._aiGuard()) return null;
      const seq = (state.aiMemSeq || 0) + 1;
      const m = { id: "am-" + seq, agentId: "", scope: "global", key: "", value: "", at: String(today), ...data };
      set((s) => ({ aiMemory: [m, ...(s.aiMemory || [])], aiMemSeq: seq })); emit(); return m.id;
    },
    updateAiMemory(id, patch) { ensure(); if (!api._aiGuard()) return false; set((s) => ({ aiMemory: (s.aiMemory || []).map((x) => x.id === id ? { ...x, ...patch, at: String(today) } : x) })); emit(); return true; },
    removeAiMemory(id) { ensure(); if (!api._aiGuard()) return false; set((s) => ({ aiMemory: (s.aiMemory || []).filter((x) => x.id !== id) })); emit(); return true; },

    // ── A LÁNC: rendszer-prompt összefűzés (brandContext fogyasztó) ──────────
    //   opts: { agentId, skillId, scope, skillValues, includeMemory }
    //   → { text, layers:[{key,label,body}], tokens }
    assembleSystemPrompt(opts = {}) {
      ensure();
      const E = window.AiEngine;
      const agent = opts.agentId ? api.findAiAgent(opts.agentId) : null;
      const skill = opts.skillId ? api.findAiSkill(opts.skillId) : null;
      const scope = opts.scope || "global";
      const layers = [];
      // 1) Cég context — brandContext()
      const brand = api.brandContext();
      if (brand) layers.push({ key: "company", label: "Cég context — brandContext()", body: brand });
      // 2) Projekt context
      const proj = api.aiProjectPrompt();
      if (proj && proj.trim()) layers.push({ key: "project", label: "Projekt context", body: proj.trim() });
      // 3) Agent szerepkör
      if (agent && agent.systemPrompt) layers.push({ key: "agent", label: "Agent szerepkör — " + agent.name, body: agent.systemPrompt.trim() });
      // 4) Skill prompt-sablon (kitöltve, ha vannak értékek)
      if (skill && skill.promptTemplate) {
        const filled = E ? E.fillTemplate(skill.promptTemplate, opts.skillValues || {}) : skill.promptTemplate;
        layers.push({ key: "skill", label: "Aktív skill — " + skill.name, body: filled });
      }
      // 5) Memória (agent + scope; global mindig)
      if (agent && opts.includeMemory !== false && E) {
        const mems = E.agentMemory(state.aiMemory, agent.id, scope);
        if (mems.length) layers.push({ key: "memory", label: "Memória (" + scope + ")", body: mems.map((m) => "- [" + m.scope + "] " + m.key + ": " + m.value).join("\n") });
      }
      const text = layers.map((l) => "# " + l.label.toUpperCase() + "\n" + l.body).join("\n\n");
      return { text, layers, tokens: E ? E.estTokens(text) : Math.round(text.length / 4) };
    },
    // Az agent utolsó-futás bélyege (a Playground hívja sikeres LLM-válasz után)
    markAiAgentRun(id) {
      ensure();
      const stamp = nowStamp();
      set((s) => ({ aiAgents: (s.aiAgents || []).map((x) => x.id === id ? { ...x, lastRun: stamp } : x) })); emit(); return stamp;
    },

    addCustomerNote(customer, text) {
      ensure();
      if (!String(text || "").trim()) return false;
      const note = { id: "cn-" + Math.random().toString(36).slice(2, 8), customer, text: text.trim(), by: api._briefWho ? api._briefWho() : api.currentAccount().name, ts: nowStamp() };
      set((s) => ({ customerNotes: [note, ...(s.customerNotes || [])] }));
      emit(); return note.id;
    },
    removeCustomerNote(noteId) {
      ensure();
      set((s) => ({ customerNotes: (s.customerNotes || []).filter((n) => n.id !== noteId) }));
      emit(); return true;
    },
    removeBrief(id) {
      ensure();
      // rekurzív törlés a gyermekekkel együtt
      const toRemove = new Set([id]);
      let grow = true;
      while (grow) { grow = false; (state.briefs || []).forEach((b) => { if (b.parentBriefId && toRemove.has(b.parentBriefId) && !toRemove.has(b.id)) { toRemove.add(b.id); grow = true; } }); }
      set((s) => ({ briefs: (s.briefs || []).filter((b) => !toRemove.has(b.id)) }));
      emit(); return true;
    },
    updateBriefFields(id, patch, opts = {}) {
      ensure();
      const b = api.findBrief(id); if (!b) return false;
      const labels = (window.BRIEF_FIELDS || []).reduce((m, f) => { m[f.key] = f.label; return m; }, {});
      const logs = [];
      const nf = { ...b.fields };
      Object.keys(patch).forEach((k) => {
        const from = b.fields[k], to = patch[k];
        if (String(from || "") === String(to || "")) return;
        nf[k] = to;
        if (k === "budgetMin" || k === "budgetMax") logs.push(api._briefLog("budget", "Költségkeret módosítva"));
        else if (k === "deadline") logs.push(api._briefLog("deadline", "Határidő módosítva"));
        else logs.push(api._briefLog("field", `„${labels[k] || k}" módosítva`));
      });
      if (!logs.length) return false;
      // dedup budget logs (min+max együtt → egy bejegyzés)
      const seen = new Set(); const hist = logs.filter((l) => { if (l.kind !== "budget") return true; if (seen.has("b")) return false; seen.add("b"); return true; });
      set((s) => ({ briefs: s.briefs.map((x) => (x.id === id ? { ...x, fields: nf, updatedAt: today, history: [...x.history, ...hist] } : x)) }));
      // Auto-rögzítés a DOKUMENTUMTÁRBA, amint a (gyökér) brief eléri a minimumot
      // (funkció + helyszín + stílus) — így nem keletkezik DMS-zaj üres briefekből.
      if (!b.parentBriefId && !b.docId && window.BriefEngine && window.BriefEngine.minimumReady({ fields: nf })) api.registerBriefDoc(id);
      emit();
      return true;
    },
    addBriefRef(id, label) {
      ensure();
      if (!String(label || "").trim()) return false;
      set((s) => ({ briefs: (s.briefs || []).map((x) => (x.id === id ? { ...x, refs: [...(x.refs || []), label.trim()], updatedAt: today, history: [...x.history, api._briefLog("ref", `Hivatkozás hozzáadva: ${label.trim()}`)] } : x)) }));
      emit(); return true;
    },
    removeBriefRef(id, idx) {
      ensure();
      set((s) => ({ briefs: (s.briefs || []).map((x) => (x.id === id ? { ...x, refs: (x.refs || []).filter((_, i) => i !== idx), updatedAt: today, history: [...x.history, api._briefLog("ref", "Hivatkozás törölve")] } : x)) }));
      emit(); return true;
    },
    addBriefQuestion(id, text) {
      ensure();
      if (!String(text || "").trim()) return false;
      const qid = "q-" + Math.random().toString(36).slice(2, 7);
      const q = { id: qid, text: text.trim(), by: api._briefWho(), ts: nowStamp(), status: "nyitott", answers: [] };
      set((s) => ({ briefs: (s.briefs || []).map((x) => (x.id === id ? { ...x, questions: [...(x.questions || []), q], updatedAt: today, history: [...x.history, api._briefLog("q", `Kérdés: ${q.text.slice(0, 60)}`)] } : x)) }));
      postSystem(`❓ Új brief-kérdés (${id}): ${q.text.slice(0, 80)}`);
      emit(); return qid;
    },
    answerBriefQuestion(id, qid, text) {
      ensure();
      if (!String(text || "").trim()) return false;
      const who = api._briefWho();
      set((s) => ({ briefs: (s.briefs || []).map((x) => {
        if (x.id !== id) return x;
        const questions = (x.questions || []).map((q) => (q.id === qid ? { ...q, status: q.status === "nyitott" ? "megvalaszolt" : q.status, answers: [...(q.answers || []), { text: text.trim(), by: who, ts: nowStamp() }] } : q));
        return { ...x, questions, updatedAt: today, history: [...x.history, api._briefLog("a", `Válasz adva`)] };
      }) }));
      emit(); return true;
    },
    setBriefQuestionStatus(id, qid, to) {
      ensure();
      const b = api.findBrief(id); if (!b) return false;
      const q = (b.questions || []).find((x) => x.id === qid); if (!q) return false;
      if (!(window.BriefEngine && window.BriefEngine.qCanGo(q.status, to))) { if (window.toast) window.toast("Nem engedélyezett kérdés-átmenet.", "error"); return false; }
      const lbl = (window.BRIEF_Q_STATUS[to] || {}).label || to;
      set((s) => ({ briefs: s.briefs.map((x) => (x.id === id ? { ...x, questions: x.questions.map((qq) => (qq.id === qid ? { ...qq, status: to } : qq)), updatedAt: today, history: [...x.history, api._briefLog("qstatus", `Kérdés → ${lbl}`)] } : x)) }));
      emit(); return true;
    },

    // ── SITE/ÜGYFÉL-HORGONY + ÖRÖKLÉS ───────────────────────────────
    // A brief a HELY + IGÉNY tartós igazsága — a kereskedelmi dokumentum (ajánlat/
    // rendelés/projekt) csak HIVATKOZIK rá. Az ügyfél(/helyszín) a durable horgony:
    // egy ÚJ rendelés ugyanoda ÖRÖKÖLHETI a korábbi brief-fát.
    quoteBriefReady(quoteId) {
      ensure();
      const b = api.quoteLevelBrief(quoteId);
      return !!(b && window.BriefEngine && window.BriefEngine.minimumReady(b));
    },
    briefCustomer(b) {
      if (!b) return null;
      if (b.customer) return b.customer;
      if (b.quoteId) { const q = state.quotes.find((x) => x.id === b.quoteId); if (q) return q.customer; }
      if (b.projectId) { const p = (state.projects || []).find((x) => x.id === b.projectId); if (p) return p.customer; }
      return null;
    },
    // Egy ügyfél (helyszín) ÖSSZES gyökér-briefje — korábbi ajánlatokból/projektekből.
    briefsForCustomer(customer) {
      ensure();
      return (state.briefs || []).filter((b) => !b.parentBriefId && api.briefCustomer(b) === customer);
    },
    // Egy ügyfél korábbi gyökér-briefjei, a MOSTANI ajánlatét kivéve (öröklés-források).
    inheritableBriefsForQuote(quoteId) {
      ensure();
      const q = state.quotes.find((x) => x.id === quoteId); if (!q) return [];
      const mine = api.quoteLevelBrief(quoteId);
      return api.briefsForCustomer(q.customer).filter((b) => (!mine || b.id !== mine.id) && api.briefChildren(b.id).length >= 0);
    },
    // A forrás gyökér részfájának ÖRÖKLÉSE a cél-ajánlat briefébe: üres mezők feltöltése
    // + a teljes alszint-fa (helyszín/terület/helyiség/bútor/bútor elem) mély-klónja
    // a cél-gyökér alá. Élő vissza-link: minden klón `inheritedFrom`.
    inheritBriefForQuote(targetQuoteId, sourceRootId) {
      ensure();
      const src = api.findBrief(sourceRootId); if (!src) return null;
      const q = state.quotes.find((x) => x.id === targetQuoteId); if (!q) return null;
      const targetRootId = api.ensureBrief({ scope: "quote", quoteId: targetQuoteId, title: `${q.customer} — igény-brief` });
      const targetRoot = api.findBrief(targetRootId);
      const mergedFields = { ...(src.fields || {}) };
      Object.keys(targetRoot.fields || {}).forEach((k) => { if (String((targetRoot.fields || {})[k] || "").trim()) mergedFields[k] = targetRoot.fields[k]; });
      let seq = state.briefSeq || 0;
      const made = [];
      const mk = (node, parentId) => {
        seq += 1;
        const id = `${window.BRIEF_PREFIX || "BRF"}-2426-${String(seq).padStart(3, "0")}`;
        made.push({ id, scope: node.scope, quoteId: null, lineUid: null, projectId: null, parentBriefId: parentId,
          name: node.name || "", title: node.title, fields: { ...(node.fields || {}) }, refs: [...(node.refs || [])],
          questions: [], history: [api._briefLog("create", `Örökölve innen: ${node.id}`)], inheritedFrom: node.id,
          createdBy: api._briefWho(), createdAt: today, updatedAt: today });
        (state.briefs || []).filter((c) => c.parentBriefId === node.id).forEach((c) => mk(c, id));
      };
      (state.briefs || []).filter((c) => c.parentBriefId === src.id).forEach((c) => mk(c, targetRootId));
      set((s) => ({ briefs: [
        ...(s.briefs || []).map((b) => (b.id === targetRootId
          ? { ...b, fields: mergedFields, site: b.site || src.site || "", refs: [...new Set([...(b.refs || []), ...(src.refs || [])])], inheritedFrom: src.id, updatedAt: today,
              history: [...b.history, api._briefLog("handoff", `Örökölve a(z) ${src.id} helyszín-briefből`)] }
          : b)),
        ...made,
      ], briefSeq: seq }));
      postSystem(`🧬 Brief örökölve a(z) ${targetQuoteId} ajánlatra a(z) ${src.id} helyszín-briefből — ${q.customer} (${made.length} alszint).`);
      emit();
      return targetRootId;
    },

    addToCart(productId) {
      ensure();
      const p = api.shopProducts().find((x) => x.id === productId);
      if (!p) return;
      set((s) => {
        const ex = s.cart.find((c) => c.id === productId);
        const cart = ex ? s.cart.map((c) => (c.id === productId ? { ...c, qty: c.qty + 1 } : c))
                        : [...s.cart, { id: p.id, name: p.name, price: p.price, qty: 1 }];
        return { cart };
      });
      if (window.toast) window.toast(`Kosárba: ${p.name}`, "success");
    },
    setCartQty(productId, qty) {
      set((s) => ({ cart: qty <= 0 ? s.cart.filter((c) => c.id !== productId) : s.cart.map((c) => (c.id === productId ? { ...c, qty } : c)) }));
    },
    clearCart() { set(() => ({ cart: [] })); },

    placeCustomerOrder() {
      ensure();
      if (!state.cart.length) return;
      const me = api.currentAccount();
      const total = state.cart.reduce((n, c) => n + c.price * c.qty, 0);
      const itemCount = state.cart.reduce((n, c) => n + c.qty, 0);
      const orderId = "JT-2426-0" + String(184 + state.orders.length + 1).slice(-3);
      const lines = state.cart.map((c) => ({ ...c }));
      const newOrder = { id: orderId, customer: me.name, type: "custom", date: today, status: "draft",
        total, items: itemCount, source: "webshop", lines };
      set((s) => ({ orders: [newOrder, ...s.orders], cart: [] }));
      postSystem(`🛒 Új webshop rendelés (${orderId}) — ${me.name}, ${itemCount} tétel, ${(total / 1e6).toFixed(2)} M Ft.`);
      emit();
      if (window.toast) window.toast(`✓ Rendelés leadva — ${orderId}`, "success");
      return orderId;
    },

    // ── SZABÁSZAT-NESTING + MARADÉKANYAG-RAKTÁR (4.7-A) ─────────────────────
    nestJobList() { ensure(); return state.nestJobs || []; },
    findNestJob(id) { ensure(); return (state.nestJobs || []).find((j) => j.id === id) || null; },
    nestPlanList() { ensure(); return state.nestPlans || []; },
    offcutList() { ensure(); return state.offcuts || []; },
    offcutsByMaterial(code) { ensure(); return (state.offcuts || []).filter((o) => o.material === code && o.zone === "available" && (Number(o.qty) || 0) > 0); },
    // NestEngine-nek átadható offcut-jelöltek (qty>1 → több külön példány).
    offcutStockFor(code) {
      ensure();
      const out = [];
      (state.offcuts || []).filter((o) => o.material === code && o.zone === "available").forEach((o) => {
        const n = Math.max(1, Math.round(Number(o.qty) || 1));
        for (let i = 0; i < n; i++) out.push({ id: o.id + (n > 1 ? `#${i + 1}` : ""), srcId: o.id, w: o.w, h: o.h });
      });
      return out;
    },
    setNestJobMaterial(id, material) {
      ensure();
      set((s) => ({ nestJobs: s.nestJobs.map((j) => (j.id === id ? { ...j, material, status: "terv", planRef: null, quoteRef: null } : j)) }));
    },
    // Véglegesítés: a futtatott terv alapján könyvel — tábla-fogyás (movement),
    // felhasznált offcut → used, új maradék → available, terv mentése + job státusz.
    commitNesting(jobId, plan) {
      ensure();
      const j = (state.nestJobs || []).find((x) => x.id === jobId);
      if (!j || !plan || !plan.summary) return null;
      const seq = (state.nestSeq || 184) + 1;
      const planId = `NP-2426-${String(seq).padStart(3, "0")}`;
      const sum = plan.summary;
      const usedIds = new Set((sum.offcutsUsed || []).map((o) => o.srcId || o.id));
      let oseq = state.offcutSeq || 6;
      const newOffcutRecs = (sum.newOffcuts || []).map((o) => {
        oseq += 1;
        return { id: `OC-2426-${String(oseq).padStart(3, "0")}`, material: j.material, w: o.w, h: o.h, qty: 1,
          zone: "available", fromJob: jobId, createdAt: today, loc: "Vác · A-12" };
      });
      const mi = api.materialInfo(j.material);
      const mv = { date: nowStamp(), type: "Kivét", src: planId, who: "Szabászat",
        mat: `${mi.name} tábla`, qty: -sum.boards, unit: "tábla", note: `${j.customer} · ${j.title}` };
      const offMv = newOffcutRecs.length ? [{ date: nowStamp(), type: "Maradék", src: planId, who: "Szabászat",
        mat: mi.name, qty: newOffcutRecs.length, unit: "darab", note: `${newOffcutRecs.length} maradék raktárba` }] : [];
      const planRec = { id: planId, jobId, material: j.material, customer: j.customer, title: j.title,
        status: "veglegesitve", createdAt: today, boards: sum.boards, offcutSheets: sum.offcutSheets,
        yieldPct: sum.yieldPct, scrapPct: sum.scrapPct, sheetCount: (plan.sheets || []).length, partCount: sum.totalPartCount };
      set((s) => ({
        nestPlans: [planRec, ...(s.nestPlans || [])],
        nestSeq: seq, offcutSeq: oseq,
        offcuts: [...newOffcutRecs, ...(s.offcuts || []).map((o) => (usedIds.has(o.id) ? { ...o, zone: "used", usedBy: planId } : o))],
        movements: [mv, ...offMv, ...s.movements],
        nestJobs: s.nestJobs.map((x) => (x.id === jobId ? { ...x, status: "veglegesitve", planRef: planId } : x)),
      }));
      postSystem(`✂️ Szabásterv véglegesítve (${planId}) — ${j.title}: ${sum.boards} tábla, kihozatal ${(sum.yieldPct * 100).toFixed(1)}%${sum.offcutSheets ? `, ${sum.offcutSheets} maradékból` : ""}, ${newOffcutRecs.length} új maradék raktárba.`, "ch-prod");
      emit();
      if (window.toast) window.toast(`✓ Szabásterv véglegesítve — ${planId}`, "success");
      return planId;
    },
    // Kereskedői SZABÁSZAT-AJÁNLAT: a terv anyag- és vágási költségéből ajánlat (createQuote).
    nestingToQuote(jobId, plan, opts = {}) {
      ensure();
      if (!api.hasPerm("quote.create")) { if (window.toast) window.toast("Nincs jogosultság ajánlat létrehozásához.", "error"); return null; }
      const j = (state.nestJobs || []).find((x) => x.id === jobId);
      if (!j || !plan || !plan.summary) return null;
      const sum = plan.summary;
      const mi = api.materialInfo(j.material);
      const board = window.NestEngine ? window.NestEngine.boardSize(j.material) : { w: 2800, h: 2070 };
      const boardPrice = Math.round(((board.w * board.h) / 1e6) * (mi.price || 4500));
      const cutCount = (plan.sheets || []).reduce((s, sh) => s + (sh.placements || []).length, 0);
      const CUT_FEE = 220, MARGIN = 1.35;
      const lines = [
        { name: `${mi.name} — tábla`, code: j.material, unit: "tábla", qty: sum.boards, price: Math.round(boardPrice * MARGIN), vat: 27 },
        { name: "Szabászati díj (vágások)", code: "SZAB-DIJ", unit: "vágás", qty: cutCount, price: CUT_FEE, vat: 27 },
      ];
      const newId = api.createQuote({ customer: opts.customer || j.customer, lines, owner: api.currentAccount().name });
      const seq = (state.nestSeq || 184) + 1;
      const planId = `NP-2426-${String(seq).padStart(3, "0")}`;
      const planRec = { id: planId, jobId, material: j.material, customer: j.customer, title: j.title,
        status: "ajanlat", createdAt: today, boards: sum.boards, offcutSheets: sum.offcutSheets,
        yieldPct: sum.yieldPct, scrapPct: sum.scrapPct, sheetCount: (plan.sheets || []).length, partCount: sum.totalPartCount, quoteRef: newId };
      set((s) => ({ nestPlans: [planRec, ...(s.nestPlans || [])], nestSeq: seq,
        nestJobs: s.nestJobs.map((x) => (x.id === jobId ? { ...x, status: "ajanlat", planRef: planId, quoteRef: newId } : x)) }));
      postSystem(`📝 Szabászat-ajánlat (${newId}) a(z) „${j.title}" tervből — ${sum.boards} tábla + ${cutCount} vágás.`);
      emit();
      return newId;
    },
    scrapOffcut(id) { ensure(); set((s) => ({ offcuts: s.offcuts.map((o) => (o.id === id ? { ...o, zone: "scrap" } : o)) })); if (window.toast) window.toast("Maradék selejtezve", "info"); },
    restoreOffcut(id) { ensure(); set((s) => ({ offcuts: s.offcuts.map((o) => (o.id === id ? { ...o, zone: "available" } : o)) })); },
  };

  window.sim = api;

  // ── Demó bootstrap: legyen egy „Saját gyártás" alprojekt, hogy a Gyártás →
  //    Gyártási projektek fül első betöltéskor se legyen üres. Egyszer fut (flag).
  (function bootstrapMfg() {
    try {
      const st = api.getState();
      if (!st || st._mfgBootstrapped) return;
      api.set(() => ({ _mfgBootstrapped: true }));
      const parent = (st.projects || []).find((p) => p.kind !== "manufacturing" && (p.milestones || []).length > 0);
      if (parent) api.createManufacturingSubproject(parent.id);
    } catch (e) {}
  })();

  // React binding
  window.useSim = function useSim() {
    return React.useSyncExternalStore(api.subscribe, api.getState, api.getState);
  };
})();
