// ──────────────────────────────────────────────────────────────────────────
// domain-bakery.js — BAKERY ADAPTER · akciók + store-példányosítás
//
//   Itt találkozik a CORE (FSM / kapacitás / BOM / inventory / store) a pékség
//   seeddel. Az akciók a CORE-motorokat hívják az `api`-n keresztül; egyetlen
//   domén-elágazás sincs a magban. A végén: window.bakery = createStore(...).
// ──────────────────────────────────────────────────────────────────────────
(function () {
  const B = window.BAKERY;
  const batchFSM = window.makeFSM(B.BATCH_FLOW);
  const orderFSM = window.makeFSM(B.ORDER_FLOW);
  const moveFSM  = window.makeFSM(B.MOVE_FLOW);

  // ── statikus feloldók (config, nem state) ─────────────────────────────────
  const product    = (id) => B.PRODUCTS.find((p) => p.id === id) || null;
  const recipe     = (id) => B.RECIPES[id] || null;
  const ingredient = (id) => B.INGREDIENTS[id] || (product(id) ? { name: product(id).name, unit: "db", group: "kesztermek" } : { name: id, unit: "" });
  const resource   = (id) => B.RESOURCES.find((r) => r.id === id) || null;
  const location   = (id) => B.LOCATIONS.find((l) => l.id === id) || null;

  // ── transfer-segéd (üzem→bolt mozgás kézbesítésekor) ──────────────────────
  function moveLots(s, from, to, lines) {
    (lines || []).forEach((ln) => {
      let remaining = ln.qty;
      // csökkentés a forrás kész-termék lotjaiból (clamp)
      s.lots.filter((l) => l.itemId === ln.productId && l.location === from).forEach((l) => {
        const take = Math.min(l.qty, remaining); l.qty -= take; remaining -= take;
      });
      s.lots = s.lots.filter((l) => l.qty > 1e-9 || l.location !== from || l.itemId !== ln.productId);
      // jóváírás a célon
      const dest = s.lots.find((l) => l.itemId === ln.productId && l.location === to && l.expiry === s.today);
      if (dest) dest.qty += ln.qty;
      else s.lots.push({ id: "LOT-" + (s.seq.lot++), itemId: ln.productId, qty: ln.qty, location: to, expiry: s.today });
    });
  }

  // ── ACTIONS — (state, api, ...args) ───────────────────────────────────────
  const actions = {
    // sarzs státusz-átmenet (FSM-validált). kesz → kész-termék lot az üzemben.
    setBatchStatus(s, api, id, to, extra) {
      const b = s.batches.find((x) => x.id === id); if (!b) return false;
      if (!batchFSM.canGo(b.status, to)) return false;
      b.status = to;
      if (extra && extra.reason) b.failReason = extra.reason;
      if (to === "sutes") b.bakingSince = (extra && extra.at) || "most";
      if (to === "kesz") {
        b.bakedAt = (extra && extra.at) || "most";
        // kész termék az üzem-készletbe
        const dest = s.lots.find((l) => l.itemId === b.productId && l.location === "uzem" && l.expiry === s.today);
        if (dest) dest.qty += b.qty;
        else s.lots.push({ id: "LOT-" + (s.seq.lot++), itemId: b.productId, qty: b.qty, location: "uzem", expiry: s.today });
      }
      return true;
    },
    failBatch(s, api, id, reason) { return actions.setBatchStatus(s, api, id, "sikertelen", { reason }); },
    // pótlás: sikertelen → új tervezett sarzs (ugyanaz a termék/menny.)
    replanBatch(s, api, id) {
      const b = s.batches.find((x) => x.id === id); if (!b || b.status !== "sikertelen") return false;
      b.status = "torolt";
      s.batches.push({ id: "B-" + String(s.seq.batch++).padStart(3, "0"), productId: b.productId, recipeId: b.recipeId,
        qty: b.qty, load: b.load, resourceId: b.resourceId, buckets: b.buckets, op: "sutes", status: "tervezett",
        note: "pótlás: " + id, replacedFrom: id });
      return true;
    },
    // sarzs ütemezése sütőre + óra-sávra
    scheduleBatch(s, api, id, resourceId, bucket) {
      const b = s.batches.find((x) => x.id === id); if (!b) return false;
      b.resourceId = resourceId; b.buckets = [bucket];
      if (b.status === "tervezett") b.status = "tervezett";
      return true;
    },

    // rendelés státusz
    setOrderStatus(s, api, id, to) {
      const o = s.orders.find((x) => x.id === id); if (!o || !orderFSM.canGo(o.status, to)) return false;
      o.status = to; return true;
    },
    // új rendelés (webshop / pult). mode szerint rendelésre vagy foglalással.
    createOrder(s, api, data) {
      const id = "O-" + (s.seq.order++);
      s.orders.push({ id, customer: data.customer || "Webshop vendég", channel: data.channel || "webshop",
        date: s.today, pickup: data.pickup || "", status: "uj", note: data.note || "", lines: data.lines || [] });
      // készletről foglalás: a stock-módú tételekre foglalás a boltban
      (data.lines || []).forEach((ln) => {
        const p = product(ln.productId);
        if (p && (p.mode === "stock")) actions.reserveStock(s, api, ln.productId, "bolt", ln.qty, id);
      });
      return id;
    },
    reserveStock(s, api, productId, loc, qty, ref) {
      s.reservations.push({ id: "RES-" + (s.seq.res++), itemId: productId, location: loc || "bolt", qty, ref: ref || "" });
      return true;
    },
    releaseReservation(s, api, resId) { s.reservations = s.reservations.filter((r) => r.id !== resId); return true; },

    // szállítmány státusz; kézbesítéskor a lotok átkerülnek üzem→bolt
    setMovementStatus(s, api, id, to) {
      const m = s.movements.find((x) => x.id === id); if (!m || !moveFSM.canGo(m.status, to)) return false;
      m.status = to;
      if (to === "kezbesitve") moveLots(s, m.from, m.to, m.lines);
      return true;
    },
    createMovement(s, api, data) {
      const id = "MV-" + (s.seq.move++);
      s.movements.push({ id, from: data.from || "uzem", to: data.to || "bolt", departAt: data.departAt || "",
        status: "tervezett", note: data.note || "", lines: data.lines || [] });
      return id;
    },

    // café tétel ki/be (ebéd indítása)
    toggleCafe(s, api, id) {
      const c = s.cafe.find((x) => x.id === id); if (c) c.active = !c.active; return true;
    },
  };

  // ── store-példány ─────────────────────────────────────────────────────────
  const store = window.createStore({
    lsKey: "apakovasz_sim_v1",
    version: 1,
    seed: { today: B.TODAY, ...JSON.parse(JSON.stringify(B.SEED)) },
    engines: { CapacityEngine: window.CapacityEngine, BomEngine: window.BomEngine, InventoryEngine: window.InventoryEngine,
      batchFSM, orderFSM, moveFSM },
    actions,
  });

  // ── SELEKTOROK (read-only, számított — soha ne tárold) ─────────────────────
  Object.assign(store, {
    product, recipe, ingredient, resource, location,
    cfg: B,

    // mai aktív sarzsok (nem törölt)
    batchesToday() { return store.batches.filter((b) => b.status !== "torolt"); },

    // BOLT — várható + jelenlegi készlet termékenként
    //   expected = ami ma elkészül (kész/sül/kel/tervezett sarzsok), jelen = bolt készlet
    shopBoard() {
      return B.PRODUCTS.filter((p) => p.channels.includes("bolt")).map((p) => {
        const batches = store.batchesToday().filter((b) => b.productId === p.id);
        const planned = batches.filter((b) => b.status !== "sikertelen").reduce((s2, b) => s2 + b.qty, 0);
        const failed  = batches.filter((b) => b.status === "sikertelen").reduce((s2, b) => s2 + b.qty, 0);
        const ready   = batches.filter((b) => b.status === "kesz").reduce((s2, b) => s2 + b.qty, 0);
        const onShelf = window.InventoryEngine.onHand(store.lots, p.id, "bolt");
        const reserved = window.InventoryEngine.reserved(store.reservations, p.id, "bolt");
        const inTransit = store.movements.filter((m) => m.status !== "kezbesitve")
          .reduce((s2, m) => s2 + (m.lines.find((l) => l.productId === p.id)?.qty || 0), 0);
        return { product: p, planned, failed, ready, onShelf, reserved, available: onShelf - reserved, inTransit,
          shortfall: failed > 0 && (onShelf + inTransit) < failed };
      });
    },

    // ÜZEM-TERMINÁL — mise-en-place: mit kell összekészíteni a következő sarzsokhoz
    prepList() {
      const upcoming = store.batchesToday().filter((b) => ["tervezett", "bekeverve"].includes(b.status));
      const agg = {};
      upcoming.forEach((b) => {
        const r = recipe(b.recipeId); if (!r) return;
        window.BomEngine.explode(r, b.qty).forEach((l) => {
          const e = agg[l.itemId] || (agg[l.itemId] = { itemId: l.itemId, qty: 0, unit: l.unit });
          e.qty += l.qty;
        });
      });
      return Object.values(agg).map((e) => ({ ...e, name: ingredient(e.itemId).name,
        onHand: window.InventoryEngine.onHand(store.lots, e.itemId, "uzem") })).sort((a, b) => b.qty - a.qty);
    },

    // ÜTEMEZÉS — sütők × óra-sávok terhelés + ütközés
    scheduleGrid() {
      const active = (t) => !["kesz", "sikertelen", "torolt"].includes(t.status);
      return B.RESOURCES.map((r) => ({
        resource: r,
        slots: B.BAKE_SLOTS.map((sl) => ({
          slot: sl,
          load: window.CapacityEngine.bucketLoad(store.batches, r.id, sl),
          cap: r.capacity,
          over: window.CapacityEngine.isOverloaded(store.batches, r, sl),
          batches: store.batches.filter((b) => b.resourceId === r.id && (b.buckets || []).includes(sl) && b.status !== "torolt"),
        })),
      }));
    },
    conflictsToday() { return window.CapacityEngine.conflicts(store.batches, B.RESOURCES, B.BAKE_SLOTS); },
    utilizationToday() { return window.CapacityEngine.utilization(store.batches, B.RESOURCES, B.BAKE_SLOTS); },

    // MRP — mai igény (rendelések + trend) → alapanyag-szükséglet vs. készlet
    demandToday() {
      const demand = {};
      // rendelések
      store.orders.filter((o) => !["atadva", "elutasitva"].includes(o.status)).forEach((o) => {
        o.lines.forEach((ln) => {
          const p = product(ln.productId); if (!p) return;
          demand[p.recipeId] = (demand[p.recipeId] || 0) + ln.qty;
        });
      });
      // trend-előrejelzés (a rendeléseken felüli várható eladás)
      Object.entries(store.trend).forEach(([pid, avg]) => {
        const p = product(pid); if (!p) return;
        demand[p.recipeId] = (demand[p.recipeId] || 0) + avg;
      });
      return Object.entries(demand).map(([recipeId, units]) => ({ recipeId, units }));
    },
    mrpToday() {
      const stock = (itemId) => window.InventoryEngine.onHand(store.lots, itemId, "uzem");
      return window.BomEngine.mrp(B.RECIPES, store.demandToday(), stock)
        .map((r) => ({ ...r, name: ingredient(r.itemId).name, supplier: (B.INGREDIENTS[r.itemId] || {}).supplier || "—" }));
    },

    expiringSoon(days) { return window.InventoryEngine.expiringSoon(store.lots, days || 2)
      .map((l) => ({ ...l, name: ingredient(l.itemId).name, days: window.InventoryEngine.daysToExpiry(l) })); },
  });

  window.bakery = store;
})();
