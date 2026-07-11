// ──────────────────────────────────────────────────────────────────────────
// bakery-store.js — A store ÖSSZESZERELÉSE
// CORE motorok (FSM, kapacitás, BOM, raktár) + DOMAIN adat + seed.
// A szelektorok (shopDaily, mrp, schedule…) a CORE motorokból számolnak.
// ──────────────────────────────────────────────────────────────────────────
(function () {
  const D = window.DOMAIN;
  const cap = window.CoreCapacity.CapacityEngine(D.stations);
  const bom = window.CoreBom.BomEngine(D.products);
  const inv = window.CoreInventory.InventoryEngine();

  const TODAY = '2026-06-15';

  // ── SEED: egy reális kovászos-nap (hajnali sütés ~02:00-tól) ───────────────
  function seed() {
    const base = {
      day: TODAY,
      // SARZSOK (sütési tételek) — reggel ~6:00 állapot: van kész, sül, terv, és egy sikertelen
      batches: [
        { id: 'b01', productId: 'cipo',      count: 16, oven: 'kemence-ko', start: '02:00', status: 'kesz' },
        { id: 'b02', productId: 'rozs',      count: 14, oven: 'kemence-ko', start: '02:50', status: 'kesz' },
        { id: 'b03', productId: 'croissant', count: 30, oven: 'kemence-lk', start: '02:30', status: 'kesz' },
        { id: 'b04', productId: 'turos',     count: 24, oven: 'kemence-lk', start: '03:40', status: 'kesz' },
        { id: 'b05', productId: 'kakaos',    count: 28, oven: 'kemence-lk', start: '03:10', status: 'sikertelen', statusReason: 'Túl sötétre sült – a kemence hőfoka elszállt' },
        { id: 'b06', productId: 'magvas',    count: 14, oven: 'kemence-ko', start: '03:40', status: 'sul' },
        { id: 'b07', productId: 'zsemle',    count: 40, oven: 'kemence-lk', start: '04:10', status: 'sul' },
        { id: 'b08', productId: 'cipo',      count: 16, oven: 'kemence-ko', start: '04:30', status: 'kel' },
        { id: 'b09', productId: 'bagett',    count: 24, oven: 'kemence-ko', start: '05:20', status: 'bekeverve' },
        { id: 'b10', productId: 'croissant', count: 30, oven: 'kemence-lk', start: '05:00', status: 'tervezett' },
        { id: 'b11', productId: 'kakaos',    count: 28, oven: 'kemence-lk', start: '05:40', status: 'tervezett' },
      ],
      // RENDELÉSEK (előrendelés + nagyker + webshop)
      orders: [
        { id: 'o01', who: 'Kovácsné',        channel: 'telefon', status: 'visszaigazolva', pickup: '07:30', lines: [{ productId: 'cipo', count: 2 }, { productId: 'magvas', count: 1 }] },
        { id: 'o02', who: 'Belváros Bisztró', channel: 'nagyker', status: 'gyartasban',     pickup: '08:00', lines: [{ productId: 'bagett', count: 10 }, { productId: 'cipo', count: 6 }] },
        { id: 'o03', who: 'Tóth Péter',       channel: 'webshop', status: 'kesz',           pickup: '09:00', lines: [{ productId: 'kakaos', count: 3 }] },
        { id: 'o04', who: 'Nagy Anna',        channel: 'webshop', status: 'draft',          pickup: 'holnap', lines: [{ productId: 'rozs', count: 1 }, { productId: 'croissant', count: 4 }] },
      ],
      // SZÁLLÍTMÁNYOK (üzem → bolt), napközben több kör
      deliveries: [
        { id: 'd1', round: '1. kör', time: '06:00', status: 'megerkezett', lines: [{ productId: 'cipo', count: 12 }, { productId: 'croissant', count: 24 }, { productId: 'turos', count: 18 }] },
        { id: 'd2', round: '2. kör', time: '09:30', status: 'uton',         lines: [{ productId: 'rozs', count: 10 }, { productId: 'zsemle', count: 30 }] },
        { id: 'd3', round: '3. kör (ebéd)', time: '12:00', status: 'osszekeszites', lines: [{ productId: 'magvas', count: 10 }, { productId: 'bagett', count: 16 }] },
      ],
      // ALAPANYAG-KÉSZLET (raktár)
      materials: JSON.parse(JSON.stringify(D.materials)),
      movements: [],
      // ELADÁSI TREND (utolsó 7 nap eladott db/termék) — az MRP-előrejelzés alapja
      salesHistory: {
        cipo:      [38, 42, 40, 45, 52, 61, 44],
        rozs:      [22, 25, 20, 24, 28, 34, 26],
        magvas:    [18, 20, 19, 22, 24, 30, 21],
        bagett:    [40, 44, 38, 46, 50, 58, 42],
        croissant: [48, 52, 50, 55, 60, 72, 54],
        kakaos:    [40, 44, 42, 46, 50, 62, 45],
        turos:     [28, 30, 26, 32, 34, 40, 29],
        zsemle:    [55, 60, 52, 58, 64, 70, 50],
      },
      // CAFÉ (reggeliztetés — előkészítve, ebéd később)
      cafe: {
        enabled: true,
        meals: [
          { id: 'm1', name: 'Kovászos pirítós, vajjal', price: 890, kind: 'reggeli', ready: true },
          { id: 'm2', name: 'Reggeli tál (péksüti + lekvár + vaj)', price: 1690, kind: 'reggeli', ready: true },
          { id: 'm3', name: 'Filteres kávé', price: 590, kind: 'ital', ready: true },
          { id: 'm4', name: 'Meleg szendvics (ebéd)', price: 1490, kind: 'ebed', ready: false },
          { id: 'm5', name: 'Napi leves (ebéd)', price: 1190, kind: 'ebed', ready: false },
        ],
      },
    };
    // a kereszt-metsző MAG-modulok seedje hozzáfűzve (HR, pénzügy, stb.)
    return Object.assign(base, window.BAKERY_OPS ? window.BAKERY_OPS.seed() : {});
  }

  // ── AKCIÓK (mind a CORE FSM-eken keresztül) ────────────────────────────────
  function buildActions(store) {
    function find(coll, id) { return store.state[coll].find(function (x) { return x.id === id; }); }

    const ownActions = {
      // SARZS előre-léptetés (a következő engedélyezett állapotba)
      batchAdvance: function (id) {
        const b = find('batches', id);
        if (!b) return { ok: false };
        const to = D.flows.batch.next(b.status);
        if (!to) return { ok: false, error: 'Nincs következő állapot' };
        return D.flows.batch.apply(b, to, {});
      },
      // SARZS sikertelen ("a sütés nem sikerült") — indok kötelező
      batchFail: function (id, reason) {
        const b = find('batches', id);
        if (!b) return { ok: false };
        return D.flows.batch.apply(b, 'sikertelen', { reason: reason });
      },
      // SARZS újrasütés
      batchRestart: function (id) {
        const b = find('batches', id);
        if (!b) return { ok: false };
        return D.flows.batch.apply(b, 'tervezett', {});
      },
      // ÚJ sarzs (üzem-terminálból)
      batchAdd: function (productId, count) {
        const p = D.productById(productId);
        store.state.batches.push({
          id: 'b' + Date.now(), productId: productId, count: count || (p ? p.batchSize : 1),
          oven: p ? p.oven : 'kemence-ko', start: '—', status: 'tervezett',
        });
        return { ok: true };
      },
      // RENDELÉS léptetés
      orderAdvance: function (id) {
        const o = find('orders', id);
        if (!o) return { ok: false };
        const to = D.flows.order.next(o.status);
        if (!to) return { ok: false };
        return D.flows.order.apply(o, to, {});
      },
      // WEBSHOP rendelés (rendelésre VAGY készletről)
      orderAdd: function (data) {
        store.state.orders.push(Object.assign({
          id: 'o' + Date.now(), status: 'draft', channel: 'webshop',
        }, data));
        return { ok: true };
      },
      // SZÁLLÍTMÁNY léptetés + üzem→bolt mozgás rögzítése megérkezéskor
      deliveryAdvance: function (id) {
        const d = find('deliveries', id);
        if (!d) return { ok: false };
        const to = D.flows.delivery.next(d.status);
        if (!to) return { ok: false };
        const r = D.flows.delivery.apply(d, to, {});
        if (r.ok && to === 'megerkezett') {
          (d.lines || []).forEach(function (ln) {
            store.state.movements.push(inv.makeMovement(ln.productId, 'uzem', 'bolt', ln.count, d.round));
          });
        }
        return r;
      },
      // ALAPANYAG-rendelés jóváhagyása (MRP → készlet)
      materialReceive: function (materialId, qty) {
        const m = find('materials', materialId);
        if (m) m.stock = (m.stock || 0) + qty;
        return { ok: true };
      },
      cafeToggleMeal: function (id) {
        const m = (store.state.cafe.meals || []).find(function (x) { return x.id === id; });
        if (m) m.ready = !m.ready;
        return { ok: true };
      },
    };
    return Object.assign(ownActions, window.BAKERY_OPS ? window.BAKERY_OPS.buildActions(store) : {});
  }

  // ── SZELEKTOROK (számított — a CORE motorokból, soha nem tárolt) ───────────
  const selectors = {
    today: function () { return TODAY; },
    day: function () { return TODAY; },
    // kapacitás-bookingok a sarzsokból
    bookings: function (st) {
      return (st.batches || [])
        .filter(function (b) { return b.status !== 'sikertelen'; })
        .map(function (b) {
          const p = D.productById(b.productId);
          return { stationId: b.oven, minutes: p ? p.bakeMin : 30, day: TODAY, label: p ? p.name : b.productId, batchId: b.id };
        });
    },
    // Bolt napi nézet: termékenként terv / kész / sikertelen / lekötve / szabad
    shopDaily: function (st) {
      return D.products.map(function (p) {
        const bs = (st.batches || []).filter(function (b) { return b.productId === p.id; });
        const terv = bs.filter(function (b) { return b.status !== 'sikertelen'; }).reduce(function (s, b) { return s + b.count; }, 0);
        const kesz = bs.filter(function (b) { return b.status === 'kesz'; }).reduce(function (s, b) { return s + b.count; }, 0);
        const sikertelen = bs.filter(function (b) { return b.status === 'sikertelen'; }).reduce(function (s, b) { return s + b.count; }, 0);
        const folyamatban = bs.filter(function (b) { return ['bekeverve', 'kel', 'sul'].indexOf(b.status) !== -1; }).reduce(function (s, b) { return s + b.count; }, 0);
        // lekötve: aktív rendelésekben szereplő mennyiség
        const lekotve = (st.orders || [])
          .filter(function (o) { return o.status !== 'atadva'; })
          .reduce(function (sum, o) {
            const ln = (o.lines || []).find(function (l) { return l.productId === p.id; });
            return sum + (ln ? ln.count : 0);
          }, 0);
        const szabad = Math.max(0, kesz - lekotve);
        const hiany = lekotve > (kesz + folyamatban); // ígért > várható → kockázat
        return {
          product: p, terv: terv, kesz: kesz, folyamatban: folyamatban,
          sikertelen: sikertelen, lekotve: lekotve, szabad: szabad, hiany: hiany,
        };
      });
    },
    // 7-napos trend → következő nap előrejelzés (egyszerű súlyozott átlag)
    forecastFor: function (st, productId) {
      const h = (st.salesHistory && st.salesHistory[productId]) || [];
      if (!h.length) return 0;
      // utolsó 3 nap nagyobb súllyal
      const n = h.length;
      const recent = h.slice(Math.max(0, n - 3));
      const avg = recent.reduce(function (a, b) { return a + b; }, 0) / recent.length;
      return Math.round(avg);
    },
    // MRP: a következő nap előrejelzett gyártása → alapanyag-szükséglet − készlet
    mrp: function (st) {
      const demands = D.products.map(function (p) {
        return { productId: p.id, count: selectors.forecastFor(st, p.id) };
      });
      return bom.mrp(demands, st.materials);
    },
    capacity: cap,
    bomEngine: bom,
    invEngine: inv,
  };

  // ── A STORE PÉLDÁNY ────────────────────────────────────────────────────────
  const store = window.CoreStore.makeStore({
    key: 'apakovasz_v2',
    version: 2,
    seed: seed,
    buildActions: buildActions,
  });
  // szelektorok rácsatolása
  Object.keys(selectors).forEach(function (k) {
    store[k] = (typeof selectors[k] === 'function')
      ? function () { return selectors[k].apply(null, [store.state].concat([].slice.call(arguments))); }
      : selectors[k];
  });
  // a kereszt-metsző MAG-modulok szelektorai (HR, pénzügy, kontrolling, exec…)
  if (window.BAKERY_OPS) {
    const opsSel = window.BAKERY_OPS.selectors;
    Object.keys(opsSel).forEach(function (k) {
      store[k] = (typeof opsSel[k] === 'function')
        ? function () { return opsSel[k].apply(null, [store.state].concat([].slice.call(arguments))); }
        : opsSel[k];
    });
  }
  // a domén-FSM-ek elérése a UI-nak
  store.flows = Object.assign({}, D.flows, window.OPS_FLOWS || {});
  store.domain = D;

  window.bakery = store;
})();
