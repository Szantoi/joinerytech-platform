// ──────────────────────────────────────────────────────────────────────────
// specs-engine.js — Kiértékelő ármotor (window.SpecEngine)
//
// Egy KONFIGURÁCIÓ = kategória + Stílus + Műszaki + behúzott sablonok (+ db).
// Árazás sablononként:
//   alap   = anyag (terület × ár) + vasalat (db × katalógus-ár a műszaki
//            márkája szerint) + munkadíj (óra × óradíj)
//   stílus = Σ kiválasztott opció: alap×(szorzó−1) + felár        (ADDITÍV az alapra)
//   műszaki= pontossági sáv: alap×(sáv−1) + egyéb ×/+ módosítók
//   összeg = alap + stílus + műszaki
// A szorzók MINDIG az alapra hatnak, nem kumulatívan → nincs elszálló növekedés.
// ──────────────────────────────────────────────────────────────────────────
(function () {
  const WASTE = 1.12;     // anyag-kihozatali ráhagyás
  const fmtFt = (n) => Math.round(n).toLocaleString("hu-HU") + " Ft";

  // Anyag-feloldás a KATALÓGUSBÓL (egy igazságforrás); fallback a régi táblákra.
  function matInfo(code) {
    try { if (window.sim && window.sim.materialInfo) return window.sim.materialInfo(code); } catch (e) {}
    const lk = window.CATALOG_LOOKUP && window.CATALOG_LOOKUP[code];
    const mp = window.MATERIAL_PRICE && window.MATERIAL_PRICE[code];
    return { code, name: lk ? lk.name : code, price: mp != null ? mp : 4000, t: lk ? lk.t : 18, color: lk ? lk.color : "#cbb88e", known: !!(lk || mp != null) };
  }

  // {slot.t} → a stílus anyagának vastagsága; {var} → geometria-érték
  function resolveDim(expr, vars, matThick) {
    if (typeof expr === "number") return expr;
    if (expr == null) return 0;
    let s = String(expr);
    s = s.replace(/\{([a-z_]+)\.t\}/gi, (_, k) => matThick[k] ?? 18);
    s = s.replace(/\{([a-z_]+)\}/gi, (_, k) => vars[k] ?? 0);
    s = s.replace(/×/g, "*");
    try { const v = new Function("return (" + s + ")")(); return (typeof v === "number" && isFinite(v)) ? v : 0; }
    catch { return 0; }
  }

  // A kategória anyag-mezői: slot → a stílusban kiválasztott anyagkód
  function slotMaterials(cat, style) {
    const map = {};
    (cat.styleFields || []).forEach((f) => {
      if (f.kind === "material" && f.slot) map[f.slot] = (style && style.values) ? style.values[f.key] : undefined;
    });
    return map;
  }

  // Egy sablon geometriai feloldása + anyagmennyiség slotonként.
  // varOverrides: a vezetett konfigurátor (CPQ) méret/geometria-felülbírásai
  // ({ width: 900, shelves: 3, ... }). Ha nincs, a sablon default értékei.
  function resolveTemplate(tpl, cat, style, varOverrides) {
    const ov = varOverrides || {};
    const vars = {};
    (tpl.vars || []).forEach((v) => { if (v.kind !== "material") vars[v.key] = (ov[v.key] != null ? ov[v.key] : v.default); });
    const slots = slotMaterials(cat, style);
    // anyag-vastagság tokenenként ({body.t} stb.) — a slot anyagából
    const matThick = {};
    Object.entries(slots).forEach(([slot, code]) => {
      matThick[slot] = matInfo(code).t;
    });
    const parts = (tpl.parts || []).map((p) => {
      const rQty = Math.max(0, Math.round(resolveDim(p.qty, vars, matThick) || 1));
      const rW = Math.abs(resolveDim(p.w, vars, matThick));
      const rH = Math.abs(resolveDim(p.h, vars, matThick));
      // anyagkód: {slot} → stílus anyag; literál kód → maga; ismeretlen → első slot
      let code = null;
      const m = /^\{(\w+)\}$/.exec(String(p.mat || ""));
      if (m) code = slots[m[1]] || null;
      else if (matInfo(p.mat).known) code = p.mat;
      if (!code) code = Object.values(slots).find(Boolean) || "EG-3303-18";
      const area = (rW * rH) / 1e6 * rQty; // m²
      // gér/szög él-jelölés: kézi spec (sim.partMiters) + a sablon GÉR-csatlakozásaiból
      // SZÁRMAZTATOTT élek (TplEngine.jointMiters) — a szabásjegyzék ebből GV-jelöl (§18.3/§19)
      let mit = null;
      try { if (window.sim && window.sim.partMiter) mit = window.sim.partMiter(tpl.id, p.name); } catch (e) {}
      let jm = { short: 0, long: 0 };
      try { if (window.TplEngine && window.TplEngine.jointMiters) jm = window.TplEngine.jointMiters(tpl, p.name, rW, rH); } catch (e) {}
      const mShort = Math.min(2, (mit ? mit.short || 0 : 0) + jm.short);
      const mLong = Math.min(2, (mit ? mit.long || 0 : 0) + jm.long);
      return { name: p.name, rQty, rW: Math.round(rW), rH: Math.round(rH), code, area,
        miterShort: mShort, miterLong: mLong,
        miterNote: [(mit && mit.note) || "", (jm.short + jm.long) > 0 ? "gér-csatlakozásból" : ""].filter(Boolean).join(" · ") };
    });
    return { vars, parts };
  }

  function styleFieldsOf(cat) { return (cat && cat.styleFields) || []; }
  function techFieldsOf(cat) { return (cat && cat.techFields) || []; }

  // Egy mező + érték → { mult, add } összegzéshez
  function optionEffect(field, val) {
    let mult = 0, add = 0; // mult itt a (szorzó−1) összege
    if (field.kind === "bool") {
      if (val && field.onTrue) { mult += (field.onTrue.mult || 1) - 1; add += field.onTrue.add || 0; }
      return { mult, add };
    }
    const apply = (v) => {
      const opt = (field.options || []).find((o) => o.value === v);
      if (opt) { mult += (opt.mult || 1) - 1; add += opt.add || 0; }
    };
    if (field.kind === "list") (Array.isArray(val) ? val : []).forEach(apply);
    else apply(val);
    return { mult, add };
  }

  // Egyetlen sablon ára a stílus + műszaki kontextusban (+ opc. méret-felülbírás)
  function priceTemplate(tpl, cat, style, tech, varOverrides) {
    const { parts, vars } = resolveTemplate(tpl, cat, style, varOverrides);

    // anyag
    let materialCost = 0;
    const matAgg = {};
    parts.forEach((p) => {
      const price = matInfo(p.code).price || 4000;
      const c = p.area * WASTE * price;
      materialCost += c;
      if (!matAgg[p.code]) matAgg[p.code] = { code: p.code, area: 0, cost: 0 };
      matAgg[p.code].area += p.area; matAgg[p.code].cost += c;
    });

    // vasalat-márka a műszakiból
    const brandField = techFieldsOf(cat).find((f) => f.role === "hardwareBrand");
    const brand = (brandField && tech && tech.values && tech.values[brandField.key]) || "Vegyes";
    let hardwareCost = 0;
    const hwLines = (tpl.hardware || []).map((hw) => {
      const def = window.HARDWARE_CATALOG[hw.id];
      const unitPrice = def ? (def.brands[brand] ?? def.brands.Vegyes) : 0;
      const cost = unitPrice * (hw.qty || 0);
      hardwareCost += cost;
      return { id: hw.id, name: def ? def.name : hw.id, qty: hw.qty, unit: def ? def.unit : "db", unitPrice, cost };
    });

    // munkadíj
    const laborHours = tpl.laborHours || 0;
    const laborCost = laborHours * window.LABOR_RATE;

    const base = materialCost + hardwareCost + laborCost;

    // stílus módosítók (additív az alapra)
    let styleMult = 0, styleAddFix = 0;
    styleFieldsOf(cat).forEach((f) => {
      if (f.kind === "material" || f.kind === "color" || f.kind === "text" || f.kind === "number") return;
      const e = optionEffect(f, style && style.values ? style.values[f.key] : undefined);
      styleMult += e.mult; styleAddFix += e.add;
    });
    const styleAdd = base * styleMult + styleAddFix;

    // műszaki módosítók + pontossági sáv
    let techMult = 0, techAddFix = 0, bandPct = 10;
    techFieldsOf(cat).forEach((f) => {
      if (f.role === "hardwareBrand") return; // ára a vasalat-árban van
      if (f.role === "precision") {
        const band = window.PRECISION_BANDS[tech && tech.values ? tech.values[f.key] : "standard"] || window.PRECISION_BANDS.standard;
        techMult += band.mult - 1; bandPct = band.band; return;
      }
      const e = optionEffect(f, tech && tech.values ? tech.values[f.key] : undefined);
      techMult += e.mult; techAddFix += e.add;
    });
    const techAdd = base * techMult + techAddFix;

    const unit = base + styleAdd + techAdd;
    return {
      tplId: tpl.id, name: tpl.name, thumb: tpl.thumb,
      materialCost, hardwareCost, laborCost, base, styleAdd, techAdd, unit,
      laborHours, deliveryDays: tpl.deliveryDays || 0,
      materials: Object.values(matAgg), hardware: hwLines, bandPct,
      vars, parts,
    };
  }

  // Teljes konfiguráció kiértékelése
  // picks: [{ tplId, qty, vars? }] — a vars a méret/geometria-felülbírás (CPQ)
  function evaluateConfig({ category, style, tech, picks }) {
    const cat = category;
    const rows = (picks || []).map((pk) => {
      const tpl = (window.PARAM_TEMPLATES || []).find((t) => t.id === pk.tplId);
      if (!tpl) return null;
      const r = priceTemplate(tpl, cat, style, tech, pk.vars);
      const qty = Math.max(1, pk.qty || 1);
      return { ...r, qty, lineTotal: r.unit * qty };
    }).filter(Boolean);

    const net = rows.reduce((s, r) => s + r.lineTotal, 0);
    const bandPct = rows.length ? Math.max(...rows.map((r) => r.bandPct)) : 10;
    const laborHours = rows.reduce((s, r) => s + r.laborHours * r.qty, 0);
    const deliveryDays = rows.length ? Math.max(...rows.map((r) => r.deliveryDays)) : 0;
    return {
      rows, net,
      low: Math.round(net * (1 - bandPct / 100)),
      high: Math.round(net * (1 + bandPct / 100)),
      bandPct, laborHours, deliveryDays,
    };
  }

  window.SpecEngine = { evaluateConfig, priceTemplate, resolveTemplate, slotMaterials, matInfo, fmtFt };
})();
