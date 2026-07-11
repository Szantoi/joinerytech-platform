// ──────────────────────────────────────────────────────────────────────────
// bakery-ops.js — KERESZT-METSZŐ MAG-MODULOK pékség-adattal
// HR · Jelenlét · Pénzügy · CRM · Minőség · Munkavédelem · Dokumentumtár ·
// Karbantartás · Kontrolling. Mind a közös CoreFSM.makeFSM-re épül — ugyanaz
// a státusz-motor, mint az asztalos rendszerben. Csak az ADAT pékség.
// A bakery-store.js MERGE-eli a seed/actions/selectors hármast.
// ──────────────────────────────────────────────────────────────────────────
(function () {
  const makeFSM = window.CoreFSM.makeFSM;
  const D = window.DOMAIN;

  // ── Bér-kategóriák (HR) — terhelt óradíj Ft/ó ──────────────────────────────
  const PAY_GRADES = {
    tanulo:   { label: 'Tanuló',          rate: 2600 },
    betanitott:{ label: 'Betanított',     rate: 3400 },
    szakpek:  { label: 'Szakképzett pék', rate: 4400 },
    cukrasz:  { label: 'Cukrász',         rate: 4200 },
    elado:    { label: 'Bolti eladó',     rate: 3200 },
    sofor:    { label: 'Sofőr',           rate: 3300 },
    vezeto:   { label: 'Vezető',          rate: 6200 },
  };

  // ── Alapanyag beszerzési ár (Ft/egység) — a kontrollinghoz + MRP-értékhez ──
  const MAT_PRICE = {
    'liszt-bl55': 320, 'liszt-tk': 480, 'liszt-rozs': 420, 'viz': 0.4, 'so': 250,
    'kovasz': 0, 'magkeverek': 1900, 'vaj': 2600, 'tej': 380, 'cukor': 360,
    'tojas': 75, 'kakao': 4200, 'turo': 1900, 'eleszto': 1400,
  };
  const LABOR_RATE = 4500; // terhelt műhely-óradíj Ft/ó a fedezet-számításhoz

  // ── FSM-ek (mind a közös makeFSM-ből) ──────────────────────────────────────
  const FLOWS = {
    // Számla
    invoice: makeFSM({
      order: ['piszkozat', 'kiallitva', 'kifizetve'],
      states: {
        piszkozat: { label: 'Piszkozat',  tone: 'slate' },
        kiallitva: { label: 'Kiállítva',  tone: 'amber' },
        kifizetve: { label: 'Kifizetve',  tone: 'sage', terminal: true },
      },
      transitions: { piszkozat: ['kiallitva'], kiallitva: ['kifizetve'], kifizetve: [] },
    }),
    // Minőség-ellenőrzés
    qa: makeFSM({
      order: ['nyitott', 'folyamatban', 'megfelelt', 'javitasra', 'selejt'],
      states: {
        nyitott:    { label: 'Nyitott',     tone: 'slate' },
        folyamatban:{ label: 'Folyamatban', tone: 'amber' },
        megfelelt:  { label: 'Megfelelt',   tone: 'sage', terminal: true },
        javitasra:  { label: 'Javításra',   tone: 'amber' },
        selejt:     { label: 'Selejt',      tone: 'ember', terminal: true, requireReason: true },
      },
      transitions: {
        nyitott: ['folyamatban'], folyamatban: ['megfelelt', 'javitasra', 'selejt'],
        javitasra: ['folyamatban'], megfelelt: [], selejt: [],
      },
    }),
    // EHS incidens
    ehs: makeFSM({
      order: ['bejelentve', 'kivizsgalas', 'intezkedes', 'lezarva'],
      states: {
        bejelentve:  { label: 'Bejelentve',  tone: 'ember' },
        kivizsgalas: { label: 'Kivizsgálás', tone: 'amber' },
        intezkedes:  { label: 'Intézkedés',  tone: 'crust' },
        lezarva:     { label: 'Lezárva',     tone: 'sage', terminal: true },
      },
      transitions: {
        bejelentve: ['kivizsgalas'], kivizsgalas: ['intezkedes'],
        intezkedes: ['lezarva'], lezarva: [],
      },
    }),
    // CRM lead
    lead: makeFSM({
      order: ['uj', 'kapcsolat', 'minosites', 'konvertalva', 'elvetve'],
      states: {
        uj:          { label: 'Új',          tone: 'slate' },
        kapcsolat:   { label: 'Kapcsolat',   tone: 'amber' },
        minosites:   { label: 'Minősítés',   tone: 'crust' },
        konvertalva: { label: 'Megnyert',    tone: 'sage', terminal: true },
        elvetve:     { label: 'Elvetve',     tone: 'ember', terminal: true, requireReason: true },
      },
      transitions: {
        uj: ['kapcsolat', 'elvetve'], kapcsolat: ['minosites', 'elvetve'],
        minosites: ['konvertalva', 'elvetve'], konvertalva: [], elvetve: [],
      },
    }),
    // Dokumentum (DMS)
    doc: makeFSM({
      order: ['piszkozat', 'ellenorzes', 'kiadott', 'archivalt'],
      states: {
        piszkozat:  { label: 'Piszkozat',  tone: 'slate' },
        ellenorzes: { label: 'Ellenőrzés', tone: 'amber' },
        kiadott:    { label: 'Kiadott',    tone: 'sage' },
        archivalt:  { label: 'Archivált',  tone: 'slate', terminal: true },
      },
      transitions: {
        piszkozat: ['ellenorzes'], ellenorzes: ['kiadott', 'piszkozat'],
        kiadott: ['ellenorzes', 'archivalt'], archivalt: [],
      },
    }),
    // Karbantartás
    maint: makeFSM({
      order: ['tervezett', 'folyamatban', 'kesz'],
      states: {
        tervezett:   { label: 'Tervezett',   tone: 'slate' },
        folyamatban: { label: 'Folyamatban', tone: 'amber' },
        kesz:        { label: 'Kész',        tone: 'sage', terminal: true },
      },
      transitions: { tervezett: ['folyamatban'], folyamatban: ['kesz'], kesz: [] },
    }),
  };

  // ── SEED (egy reális Apakovász-nap, 2026-06-15) ────────────────────────────
  function seed() {
    return {
      // HR — dolgozói törzs
      employees: [
        { id: 'e1', name: 'Bittó Tamás',     grade: 'vezeto',   role: 'Tulajdonos · vezető pék', hired: '2014-03', status: 'aktiv',    phone: '+36 30 111 2233' },
        { id: 'e2', name: 'Kovács Gábor',    grade: 'szakpek',  role: 'Szakképzett pék',          hired: '2017-09', status: 'aktiv',    phone: '+36 30 222 3344' },
        { id: 'e3', name: 'Szabó Réka',      grade: 'szakpek',  role: 'Szakképzett pék',          hired: '2019-01', status: 'aktiv',    phone: '+36 30 333 4455' },
        { id: 'e4', name: 'Nagy Anna',       grade: 'betanitott', role: 'Betanított pék (hajnal)', hired: '2021-06', status: 'aktiv',  phone: '+36 30 444 5566' },
        { id: 'e5', name: 'Varga Júlia',     grade: 'cukrasz',  role: 'Cukrász · péksütemény',    hired: '2020-04', status: 'aktiv',    phone: '+36 30 555 6677' },
        { id: 'e6', name: 'Horváth Eszter',  grade: 'elado',    role: 'Bolti eladó',              hired: '2022-02', status: 'aktiv',    phone: '+36 30 666 7788' },
        { id: 'e7', name: 'Tóth Kinga',      grade: 'elado',    role: 'Bolti eladó',              hired: '2023-08', status: 'tappenz', phone: '+36 30 777 8899' },
        { id: 'e8', name: 'Kiss Bence',      grade: 'sofor',    role: 'Sofőr · logisztika',       hired: '2022-11', status: 'aktiv',    phone: '+36 30 888 9900' },
      ],
      // Jelenlét — mai műszak (hajnali kezdés)
      attendance: [
        { id: 'a1', empId: 'e1', in: '02:00', out: null,   type: 'munka',   status: 'bejelentkezve' },
        { id: 'a2', empId: 'e2', in: '02:00', out: null,   type: 'munka',   status: 'bejelentkezve' },
        { id: 'a3', empId: 'e3', in: '02:30', out: null,   type: 'munka',   status: 'bejelentkezve' },
        { id: 'a4', empId: 'e4', in: '02:30', out: null,   type: 'tullora', status: 'bejelentkezve' },
        { id: 'a5', empId: 'e5', in: '03:30', out: null,   type: 'munka',   status: 'bejelentkezve' },
        { id: 'a6', empId: 'e6', in: '05:30', out: null,   type: 'munka',   status: 'bejelentkezve' },
        { id: 'a8', empId: 'e8', in: '05:00', out: null,   type: 'munka',   status: 'bejelentkezve' },
      ],
      // Pénzügy — számlák (ki + be)
      finInvoices: [
        { id: 'inv1', dir: 'out', partner: 'Belváros Bisztró',  no: 'AP-2026-184', net: 18400, vat: 0.18, status: 'kiallitva', issue: '2026-06-12', due: '2026-06-26' },
        { id: 'inv2', dir: 'out', partner: 'Grund Kávézó',      no: 'AP-2026-185', net: 12600, vat: 0.18, status: 'kifizetve', issue: '2026-06-10', due: '2026-06-24' },
        { id: 'inv3', dir: 'out', partner: 'Hotel Aria',        no: 'AP-2026-180', net: 44800, vat: 0.18, status: 'kiallitva', issue: '2026-05-28', due: '2026-06-11' }, // lejárt
        { id: 'inv4', dir: 'out', partner: 'Tóth Péter (webshop)', no: 'AP-2026-186', net: 1560, vat: 0.18, status: 'kifizetve', issue: '2026-06-14', due: '2026-06-14' },
        { id: 'inv5', dir: 'in',  partner: 'Pannon Malom Kft',  no: 'BE-44021',   net: 96000, vat: 0.27, status: 'kiallitva', issue: '2026-06-09', due: '2026-06-23' },
        { id: 'inv6', dir: 'in',  partner: 'Friss Tej Zrt',     no: 'BE-7782',    net: 14200, vat: 0.27, status: 'piszkozat', issue: '2026-06-14', due: '2026-06-28' },
        { id: 'inv7', dir: 'in',  partner: 'Délvaj Kft',        no: 'BE-3310',    net: 28600, vat: 0.27, status: 'kifizetve', issue: '2026-06-02', due: '2026-06-16' },
      ],
      // CRM — leadek (új nagyker/HORECA érdeklődők)
      leads: [
        { id: 'l1', name: 'Kézműves Kávézó', contact: 'Béres Tamás',  source: 'ajanlas',  status: 'minosites', note: 'Napi 30 cipó + bagett, törzsbeszállító keres', value: 180000 },
        { id: 'l2', name: 'Irodaház büfé',   contact: 'Pál Nóra',     source: 'weboldal', status: 'kapcsolat', note: 'Reggeli péksüti-szállítás, hétköznap', value: 240000 },
        { id: 'l3', name: 'Bio Élelmiszer',  contact: 'Kun Géza',     source: 'kiallitas', status: 'uj',       note: 'Kovászos kenyér polcra, viszonteladás', value: 320000 },
        { id: 'l4', name: 'Panzió Napsugár', contact: 'Vég Andrea',   source: 'telefon',  status: 'konvertalva', note: 'Megnyert · heti reggeli-csomag', value: 150000 },
      ],
      // Minőség — ellenőrzések (bejövő/gyártásközi/végellenőrzés)
      qaInspections: [
        { id: 'q1', type: 'bejovo',         title: 'BL55 liszt bevét (Pannon Malom)', ref: 'BE-44021', status: 'megfelelt',  note: 'Nedvesség, sikértartalom rendben' },
        { id: 'q2', type: 'gyartaskozi',    title: 'Kovászos cipó — bélzet, héj',     ref: 'b01',      status: 'megfelelt',  note: '' },
        { id: 'q3', type: 'vegellenorzes',  title: 'Kakaós csiga — végellenőrzés',    ref: 'b05',      status: 'selejt',     statusReason: 'Túl sötétre sült, keserű — 28 db selejt' },
        { id: 'q4', type: 'gyartaskozi',    title: 'Magvas — kelesztés ellenőrzés',   ref: 'b06',      status: 'folyamatban', note: '' },
        { id: 'q5', type: 'bejovo',         title: 'Sütővaj bevét (Délvaj)',          ref: 'BE-3310',  status: 'nyitott',    note: '' },
      ],
      // Munkavédelem — incidensek, kockázatok, oktatások
      ehsIncidents: [
        { id: 'i1', title: 'Égési kvázibaleset a kőkemencénél', type: 'kvazi',   sev: 'konnyu', status: 'kivizsgalas', date: '2026-06-13', who: 'e4' },
        { id: 'i2', title: 'Csúszós padló a mosogatónál',       type: 'kornyezeti', sev: 'konnyu', status: 'intezkedes', date: '2026-06-11', who: 'e6' },
      ],
      ehsRisks: [
        { id: 'r1', title: 'Forró kemence-felület', prob: 3, sev: 4, control: 'Hőálló kesztyű, jelölés' },
        { id: 'r2', title: 'Lisztpor (belélegzés/robbanás)', prob: 2, sev: 5, control: 'Elszívás, zárt silók' },
        { id: 'r3', title: 'Dagasztógép forgó rész', prob: 2, sev: 4, control: 'Védőburkolat, oktatás' },
        { id: 'r4', title: 'Csúszós padló', prob: 3, sev: 2, control: 'Csúszásgátló, takarítási rend' },
      ],
      ehsTrainings: [
        { id: 't1', empId: 'e1', kind: 'HACCP / élelmiszerbiztonság', due: '2026-09-01', status: 'ervenyes' },
        { id: 't2', empId: 'e2', kind: 'HACCP / élelmiszerbiztonság', due: '2026-07-02', status: 'hamarosan' },
        { id: 't3', empId: 'e4', kind: 'Tűzvédelem', due: '2026-05-20', status: 'lejart' },
        { id: 't4', empId: 'e6', kind: 'Elsősegély', due: '2026-11-10', status: 'ervenyes' },
      ],
      // Dokumentumtár — verziózott receptek + szabályzatok
      documents: [
        { id: 'doc1', title: 'Kovászos cipó — receptúra', type: 'recept',     link: 'cipo', version: 4, status: 'kiadott' },
        { id: 'doc2', title: 'Rozsos kovászos — receptúra', type: 'recept',   link: 'rozs', version: 2, status: 'kiadott' },
        { id: 'doc3', title: 'HACCP terv 2026',           type: 'utasitas',   link: 'none', version: 3, status: 'kiadott' },
        { id: 'doc4', title: 'Allergén-tájékoztató',      type: 'tanusitvany', link: 'none', version: 1, status: 'ellenorzes' },
        { id: 'doc5', title: 'Bérleti szerződés — üzlet',  type: 'szerzodes',  link: 'none', version: 1, status: 'kiadott' },
        { id: 'doc6', title: 'Új magvas — recept tervezet', type: 'recept',   link: 'magvas', version: 1, status: 'piszkozat' },
      ],
      // Karbantartás — eszközök szervize
      maintenance: [
        { id: 'mt1', asset: 'Kőkemence',        task: 'Éves bélés-ellenőrzés', status: 'tervezett',   due: '2026-06-22' },
        { id: 'mt2', asset: 'Dagasztógép',      task: 'Csapágy + szíj csere',  status: 'folyamatban', due: '2026-06-15' },
        { id: 'mt3', asset: 'Hűtőkamra',        task: 'Hőfok-kalibráció',      status: 'kesz',        due: '2026-06-08' },
        { id: 'mt4', asset: 'Légkeveréses sütő', task: 'Ventilátor tisztítás',  status: 'tervezett',   due: '2026-06-30' },
      ],
    };
  }

  // ── AKCIÓK ─────────────────────────────────────────────────────────────────
  function buildActions(store) {
    function find(coll, id) { return (store.state[coll] || []).find(function (x) { return x.id === id; }); }
    function advance(coll, flowKey, id) {
      const e = find(coll, id); if (!e) return { ok: false };
      const to = FLOWS[flowKey].next(e.status); if (!to) return { ok: false };
      return FLOWS[flowKey].apply(e, to, {});
    }
    return {
      invoiceAdvance: function (id) { return advance('finInvoices', 'invoice', id); },
      qaAdvance: function (id) { return advance('qaInspections', 'qa', id); },
      qaSet: function (id, to, reason) { const e = find('qaInspections', id); return e ? FLOWS.qa.apply(e, to, { reason: reason }) : { ok: false }; },
      ehsAdvance: function (id) { return advance('ehsIncidents', 'ehs', id); },
      leadAdvance: function (id) { return advance('leads', 'lead', id); },
      docAdvance: function (id) { return advance('documents', 'doc', id); },
      maintAdvance: function (id) { return advance('maintenance', 'maint', id); },
      clockOut: function (id) {
        const a = find('attendance', id);
        if (a) { a.out = '14:00'; a.status = 'kijelentkezve'; }
        return { ok: true };
      },
    };
  }

  // ── SZELEKTOROK (számított — soha nem tárolt) ──────────────────────────────
  function attHours(a) {
    if (!a.in || !a.out) {
      // még bent: a "most" 06:00-ként modellezve a hajnali műszakhoz
      const now = 6 * 60;
      const t = parseInt(a.in.split(':')[0]) * 60 + parseInt(a.in.split(':')[1]);
      return Math.max(0, (now - t) / 60);
    }
    const t1 = parseInt(a.in.split(':')[0]) * 60 + parseInt(a.in.split(':')[1]);
    const t2 = parseInt(a.out.split(':')[0]) * 60 + parseInt(a.out.split(':')[1]);
    let h = (t2 - t1) / 60;
    if (h > 6) h -= 0.5; // ebéd
    return Math.max(0, h);
  }

  const selectors = {
    payGrades: function () { return PAY_GRADES; },
    matPrice: function () { return MAT_PRICE; },
    empById: function (st, id) { return (st.employees || []).find(function (e) { return e.id === id; }); },

    // HR összegzés
    hrStats: function (st) {
      const emps = st.employees || [];
      return {
        total: emps.length,
        active: emps.filter(function (e) { return e.status === 'aktiv'; }).length,
        absent: emps.filter(function (e) { return e.status !== 'aktiv'; }).length,
        monthlyCost: emps.reduce(function (s, e) {
          const g = PAY_GRADES[e.grade]; return s + (g ? g.rate * 8 * 22 : 0);
        }, 0),
      };
    },
    // Jelenlét összegzés
    attStats: function (st) {
      const att = st.attendance || [];
      const present = att.filter(function (a) { return a.status === 'bejelentkezve'; }).length;
      let hours = 0, ot = 0, cost = 0;
      att.forEach(function (a) {
        const emp = (st.employees || []).find(function (e) { return e.id === a.empId; });
        const g = emp && PAY_GRADES[emp.grade];
        const h = attHours(a);
        hours += h;
        const o = a.type === 'tullora' ? h : Math.max(0, h - 8);
        ot += o;
        cost += g ? (h * g.rate + o * g.rate * 0.5) : 0;
      });
      return { present: present, hours: hours, overtime: ot, cost: cost };
    },
    attHours: function (st, a) { return attHours(a); },

    // Pénzügy összegzés
    finStats: function (st) {
      const inv = st.finInvoices || [];
      function gross(i) { return i.net * (1 + i.vat); }
      const today = new Date('2026-06-15');
      const receivable = inv.filter(function (i) { return i.dir === 'out' && i.status === 'kiallitva'; });
      const payable = inv.filter(function (i) { return i.dir === 'in' && i.status === 'kiallitva'; });
      const overdue = receivable.filter(function (i) { return new Date(i.due) < today; });
      return {
        receivable: receivable.reduce(function (s, i) { return s + gross(i); }, 0),
        payable: payable.reduce(function (s, i) { return s + gross(i); }, 0),
        overdue: overdue.reduce(function (s, i) { return s + gross(i); }, 0),
        overdueCount: overdue.length,
        paidIn: inv.filter(function (i) { return i.dir === 'out' && i.status === 'kifizetve'; }).reduce(function (s, i) { return s + gross(i); }, 0),
        gross: gross,
      };
    },

    // Kontrolling — termékenkénti fedezet
    controllingProducts: function (st) {
      return D.products.map(function (p) {
        const matCost = (p.bom || []).reduce(function (s, ln) {
          return s + (MAT_PRICE[ln.material] || 0) * ln.qty;
        }, 0);
        // munka/db: a sarzs-szintű előkészítés (dagasztás/formázás) amortizálva + sütés-felügyelet
        const laborMin = (40 + p.bakeMin * 0.4) / p.batchSize;
        const laborCost = (laborMin / 60) * LABOR_RATE;
        const cost = matCost + laborCost;
        const margin = p.price - cost;
        return {
          product: p, matCost: matCost, laborCost: laborCost, cost: cost,
          margin: margin, marginPct: p.price > 0 ? margin / p.price : 0,
        };
      }).sort(function (a, b) { return b.marginPct - a.marginPct; });
    },

    // Vezetői cockpit — kereszt-világ aggregátor
    execCockpit: function (st) {
      const daily = window.bakery.shopDaily();
      const fin = selectors.finStats(st);
      const att = selectors.attStats(st);
      const ctrl = selectors.controllingProducts(st);
      const avgMargin = ctrl.length ? ctrl.reduce(function (s, c) { return s + c.marginPct; }, 0) / ctrl.length : 0;
      const cap = window.bakery.capacity;
      const util = cap.overallUtilization(window.bakery.bookings(), window.bakery.day());
      const qa = st.qaInspections || [];
      const qaDone = qa.filter(function (q) { return q.status === 'megfelelt' || q.status === 'selejt'; });
      const qaPass = qaDone.length ? qa.filter(function (q) { return q.status === 'megfelelt'; }).length / qaDone.length : 1;
      const openEhs = (st.ehsIncidents || []).filter(function (i) { return i.status !== 'lezarva'; }).length;
      const expiredTrain = (st.ehsTrainings || []).filter(function (t) { return t.status === 'lejart'; }).length;
      const orders = st.orders || [];
      const revenue = daily.reduce(function (s, d) { return s + d.kesz * d.product.price; }, 0);
      const failed = daily.filter(function (d) { return d.sikertelen > 0; }).length;
      return {
        revenue: revenue,
        orders: orders.filter(function (o) { return o.status !== 'atadva'; }).length,
        receivable: fin.receivable, overdue: fin.overdue, overdueCount: fin.overdueCount,
        present: att.present, headcount: (st.employees || []).length,
        laborCost: att.cost,
        utilization: util, avgMargin: avgMargin,
        qaPass: qaPass, qaOpen: qa.filter(function (q) { return q.status === 'nyitott' || q.status === 'folyamatban'; }).length,
        openEhs: openEhs, expiredTrain: expiredTrain,
        failedBatches: failed,
        leadValue: (st.leads || []).filter(function (l) { return l.status !== 'elvetve' && l.status !== 'konvertalva'; }).reduce(function (s, l) { return s + (l.value || 0); }, 0),
      };
    },
  };

  window.OPS_FLOWS = FLOWS;
  window.BAKERY_OPS = { seed: seed, buildActions: buildActions, selectors: selectors };
})();
