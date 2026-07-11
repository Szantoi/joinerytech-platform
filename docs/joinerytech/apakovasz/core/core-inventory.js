// ──────────────────────────────────────────────────────────────────────────
// core-inventory.js — DOMÉN-VAK raktár (lot/zóna/mozgás/foglalás)
// Nem ismer lisztet/lapanyagot — csak tételeket, zónákat és átmozgatást.
// Lásd CORE_MAP.md §1/#5 és #7 (telephely-mozgás).
// ──────────────────────────────────────────────────────────────────────────
(function () {
  // items: [{ id, name, unit, zone, stock }]
  function InventoryEngine() {
    function stockIn(items, id) {
      const m = (items || []).find(function (x) { return x.id === id; });
      return m ? (m.stock || 0) : 0;
    }
    // zónánkénti összesítés egy tételre (ha több zónában van — itt egy zóna/tétel a modell)
    function byZone(items, zone) {
      return (items || []).filter(function (x) { return x.zone === zone; });
    }
    // mozgás: from-zónából to-zónába N egység. Visszaad egy mozgás-rekordot.
    // a tényleges készlet-állítást a store végzi (ez tiszta leíró).
    function makeMovement(itemId, fromZone, toZone, qty, label) {
      return {
        id: 'mov-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        itemId: itemId, fromZone: fromZone, toZone: toZone, qty: qty,
        label: label || '', at: Date.now(),
      };
    }
    // alacsony-készlet riasztás
    function lowStock(items) {
      return (items || []).filter(function (x) {
        return (x.reorderPoint || 0) > 0 && (x.stock || 0) <= (x.reorderPoint || 0);
      });
    }
    return { stockIn: stockIn, byZone: byZone, makeMovement: makeMovement, lowStock: lowStock };
  }

  window.CoreInventory = { InventoryEngine: InventoryEngine };
})();
