// ──────────────────────────────────────────────────────────────────────────
// core-bom.js — DOMÉN-VAK BOM-robbantás + MRP
// Termék → (alapanyag × mennyiség). Nem ismer lisztet/lapanyagot — csak
// szorzást és kivonást. Lásd CORE_MAP.md §1/#4.
// ──────────────────────────────────────────────────────────────────────────
(function () {
  // products: [{ id, bom:[{ material, qty, unit }] }]
  function BomEngine(products) {
    const byId = {};
    (products || []).forEach(function (p) { byId[p.id] = p; });

    // egy termék N darabjának alapanyag-igénye
    function explodeOne(productId, count) {
      const p = byId[productId];
      if (!p || !p.bom) return [];
      return p.bom.map(function (line) {
        return { material: line.material, unit: line.unit, qty: (line.qty || 0) * count };
      });
    }

    // több tétel összesített igénye: demands = [{ productId, count }]
    // → { materialId: { qty, unit } }
    function explode(demands) {
      const agg = {};
      (demands || []).forEach(function (d) {
        explodeOne(d.productId, d.count || 0).forEach(function (line) {
          if (!agg[line.material]) agg[line.material] = { qty: 0, unit: line.unit };
          agg[line.material].qty += line.qty;
        });
      });
      return agg;
    }

    // MRP: igény − készlet = rendelendő (reorderPoint-ot is figyelembe vesz)
    // materials: [{ id, name, unit, stock, reorderPoint }]
    // → [{ material, name, unit, required, stock, shortfall, suggest }]
    function mrp(demands, materials) {
      const need = explode(demands);
      const matById = {};
      (materials || []).forEach(function (m) { matById[m.id] = m; });
      const ids = {};
      Object.keys(need).forEach(function (k) { ids[k] = true; });
      (materials || []).forEach(function (m) { ids[m.id] = true; });

      return Object.keys(ids).map(function (id) {
        const m = matById[id] || { name: id, unit: (need[id] && need[id].unit) || 'db', stock: 0, reorderPoint: 0 };
        const required = (need[id] && need[id].qty) || 0;
        const stock = m.stock || 0;
        const reorder = m.reorderPoint || 0;
        // hiány: amennyivel a (készlet − igény) a min-szint alá esik
        const after = stock - required;
        const shortfall = Math.max(0, reorder - after);
        return {
          material: id,
          name: m.name,
          unit: m.unit,
          required: required,
          stock: stock,
          reorderPoint: reorder,
          after: after,
          shortfall: shortfall,
          suggest: shortfall > 0 ? Math.ceil(shortfall) : 0,
        };
      }).sort(function (a, b) { return b.shortfall - a.shortfall; });
    }

    return { byId: byId, explodeOne: explodeOne, explode: explode, mrp: mrp };
  }

  window.CoreBom = { BomEngine: BomEngine };
})();
