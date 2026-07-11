// ──────────────────────────────────────────────────────────────────────────
// margin-util.js — BELSŐ árrés / fedezet réteg (csak belső + reseller nézet).
//
//   Modell (a felhasználó döntése szerint):
//     • Katalógus-tétel: ÖNKÖLTSÉG (cost) + ELADÁSI ár (price/sell) — két mező.
//     • Markup a költségen: eladási = önköltség × (1 + árrés% / 100).
//     • Alapértelmezett árrés: settings.marginPct (alap 30%), tételenként
//       felülírható, és ajánlat-szinten egységesen újraárazható.
//     • Láthatóság: CSAK belső — a b2c (ügyfél) sosem látja. A webshop/ügyfél
//       nézet kizárólag a végárat mutatja.
//
//   Ahol egy tételnek nincs explicit `cost`-ja (régi/gyártási katalógus), az
//   önköltséget az alapértelmezett árrésből visszaszámoljuk, hogy a fedezet
//   mindenhol értelmezhető legyen — amíg valódi önköltséget nem adnak meg.
// ──────────────────────────────────────────────────────────────────────────
(function () {
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };

  const MarginUtil = {
    // alapértelmezett árrés % (store-ból, felülírható Tweaks-ben)
    defaultPct() {
      try { const s = window.sim && window.sim.getState && window.sim.getState(); return (s && s.settings && s.settings.marginPct != null) ? num(s.settings.marginPct) : 30; }
      catch (e) { return 30; }
    },
    // egy tétel önköltsége (explicit, vagy az árrésből visszaszámolt)
    costOf(line) {
      if (line == null) return 0;
      if (line.cost != null && line.cost !== "") return num(line.cost);
      const sell = num(line.price != null ? line.price : line.unitPrice);
      return Math.round(sell / (1 + this.defaultPct() / 100));
    },
    sellOf(line) { return num(line.price != null ? line.price : line.unitPrice); },
    // eladási ár az önköltségből + árrés%
    sellFromCost(cost, pct) { return Math.round(num(cost) * (1 + num(pct) / 100)); },
    // árrés% az önköltség és eladási árból
    marginPct(cost, sell) { cost = num(cost); sell = num(sell); return cost > 0 ? (sell / cost - 1) * 100 : 0; },
    // egységnyi fedezet (profit)
    unitProfit(line) { return this.sellOf(line) - this.costOf(line); },

    // ── típus-margin (UNIVERZÁLIS, mindenkinek): a típus saját árrése, vagy az alap ──
    typeMarginPct(typeId) {
      try {
        const s = window.sim && window.sim.getState && window.sim.getState();
        const t = (s && s.intCatTypes || []).find((x) => x.id === typeId);
        return (t && t.marginPct != null) ? num(t.marginPct) : this.defaultPct();
      } catch (e) { return this.defaultPct(); }
    },
    // ── partner-állandó kedvezmény (típusonkénti felülírás → partner alap → 0) ──
    partnerByName(name) {
      if (!name) return null;
      try {
        const s = window.sim && window.sim.getState && window.sim.getState();
        return (s && s.partnerPricing || []).find((p) => p.name === name) || null;
      } catch (e) { return null; }
    },
    partnerDiscountPct(partner, typeId) {
      const p = (typeof partner === "string") ? this.partnerByName(partner) : partner;
      if (!p) return 0;
      if (typeId && p.byType && p.byType[typeId] != null) return num(p.byType[typeId]);
      return num(p.defaultDiscount);
    },

    // ── összegzés tétel-listára ──
    totals(lines) {
      let cost = 0, sell = 0;
      (lines || []).forEach((l) => {
        const qty = num(l.qty != null ? l.qty : l.quantity);
        cost += this.costOf(l) * qty;
        sell += this.sellOf(l) * qty;
      });
      const profit = sell - cost;
      return { cost, sell, profit, pct: cost > 0 ? (sell / cost - 1) * 100 : 0 };
    },

    // ── láthatóság: csak belső + reseller; a b2c (ügyfél) SOHA ──
    canSee() {
      try { const a = window.sim && window.sim.currentAccount && window.sim.currentAccount(); return !!a && a.type !== "b2c"; }
      catch (e) { return false; }
    },

    // formázók
    fmtPct(p) { return (Math.round(num(p) * 10) / 10).toLocaleString("hu-HU") + "%"; },
    fmtHuf(n) { return Math.round(num(n)).toLocaleString("hu-HU") + " Ft"; },
    // árrés-szín (egészséges fedezet → zöld, alacsony → borostyán, veszteség → rózsa)
    tone(pct) {
      pct = num(pct);
      if (pct < 0) return { fg: "text-rose-700", bg: "bg-rose-50", dot: "bg-rose-500", ring: "ring-rose-200" };
      if (pct < 15) return { fg: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500", ring: "ring-amber-200" };
      return { fg: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500", ring: "ring-emerald-200" };
    },
  };

  window.MarginUtil = MarginUtil;
})();
