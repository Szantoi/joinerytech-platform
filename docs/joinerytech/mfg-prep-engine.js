// ──────────────────────────────────────────────────────────────────────────
// mfg-prep-engine.js — window.MfgPrep
//
//   A gyártás-előkészítés LEVEZETŐ MOTORJA. Egy projektből (gyártási alprojekt
//   vagy rendelésből épített pszeudo-projekt) tételenként levezeti:
//     • anyagszükségletet (lapanyag m² → táblaszám, +kihozatal),
//     • a szabászat rész-szintű vágólistáját (a sablon alkatrészeiből),
//     • a vasalat-szükségletet (db × márka-ár a katalógusból),
//     • a munkaidőt RÉSZLEGENKÉNT a termelékenységi adatok (norma) alapján.
//
//   Alap: a meglévő SPEC-rendszer. Ha a tétel hordoz konfigot (config{}), azt
//   használja; egyébként elem-kategória → spec-kategória + alap-sablon, az
//   aktív stílus/műszaki példánnyal, a tétel értékéből becsült darabszámmal.
//   Az árazás/feloldás a window.SpecEngine-en keresztül történik (egy motor).
// ──────────────────────────────────────────────────────────────────────────
(function () {
  const WASTE = 1.12;
  const clampQty = (n) => Math.max(1, Math.min(12, Math.round(n || 1)));
  const r1 = (n) => Math.round(n * 10) / 10;
  const r3 = (n) => Math.round(n * 1000) / 1000;

  // ── Segédanyagnorma (woodwork_domain.md §6): felület × fajlagos felhordás +
  //   veszteség. A ragasztó/felületkezelő g-ban; a csiszoló szemcse-lista. ──
  function auxLine(def, areaM2) {
    const loss = window.WW_AUX_LOSS != null ? window.WW_AUX_LOSS : 0.1;
    const base = areaM2 * (def.rate || 0);
    const totalG = base * (1 + loss);
    return { key: def.key, name: def.name, note: def.note, kind: def.kind, rate: def.rate,
      area: r3(areaM2), baseG: Math.round(base), totalG: Math.round(totalG), lossPct: Math.round(loss * 100) };
  }
  function computeAux(cutlist, edgeM) {
    const AUX = window.WW_AUX_DEFAULTS || {};
    const kindOf = (p) => (window.wwMaterialKind ? window.wwMaterialKind(p.code, p.matName) : "sheet");
    const sw = (cutlist || []).filter((p) => kindOf(p) === "solidwood");
    const swArea = sw.reduce((s, p) => s + (p.area || 0), 0);
    const swPanelArea = sw.filter((p) => Math.max(p.w || 0, p.h || 0) >= 500).reduce((s, p) => s + (p.area || 0), 0);
    const finishArea = swArea * 2; // tömörfa: két oldal felületkezelése
    const edgeArea = (edgeM || 0) * (window.WW_EDGE_BAND_H || 0.019);
    const glues = [];
    if (edgeArea > 0 && AUX.glueEdge) glues.push({ ...auxLine(AUX.glueEdge, edgeArea), basis: `${r1(edgeM)} fm él × ${(window.WW_EDGE_BAND_H || 0.019) * 1000} mm` });
    if (swPanelArea > 0 && AUX.gluePanel) glues.push({ ...auxLine(AUX.gluePanel, swPanelArea), basis: `${r1(swPanelArea)} m² táblásítási felület` });
    const finishes = [];
    if (finishArea > 0) {
      if (AUX.finishCoat1) finishes.push({ ...auxLine(AUX.finishCoat1, finishArea), basis: `${r1(finishArea)} m² (két oldal)` });
      if (AUX.finishCoat2) finishes.push({ ...auxLine(AUX.finishCoat2, finishArea), basis: `${r1(finishArea)} m² (két oldal)` });
    }
    const abrasive = finishArea > 0 ? (AUX.abrasive || null) : null;
    return {
      glues, finishes, abrasive,
      swArea: r1(swArea), finishArea: r1(finishArea), edgeM: r1(edgeM || 0),
      totalGlueG: Math.round(glues.reduce((s, g) => s + g.totalG, 0)),
      totalFinishG: Math.round(finishes.reduce((s, g) => s + g.totalG, 0)),
      hasSolidwood: sw.length > 0,
    };
  }

  function specData() {
    const s = window.sim;
    return {
      cat: (id) => (s.findSpecCategory ? s.findSpecCategory(id) : null),
      styles: (id) => (s.stylesFor ? s.stylesFor(id) : []).filter((x) => x.status !== "archived"),
      techs: (id) => (s.techSpecsFor ? s.techSpecsFor(id) : []).filter((x) => x.status !== "archived"),
      findSpec: (k, id) => (s.findSpec ? s.findSpec(k, id) : null),
      materials: () => { try { return (s.getState ? s.getState().materials : []) || []; } catch (e) { return []; } },
    };
  }

  function templateById(id) { return (window.PARAM_TEMPLATES || []).find((t) => t.id === id); }

  // Egy tétel levezetése
  function deriveItem(item) {
    const SE = window.SpecEngine;
    const D = specData();
    const cfg = item.config || null;
    const catId = (cfg && cfg.categoryId) || window.MFG_ELEM_TO_SPECCAT[item.elemCategory] || "cat-cabinet";
    let cat = D.cat(catId) || D.cat("cat-cabinet");
    if (!cat) return null;

    const styles = D.styles(cat.id);
    const techs = D.techs(cat.id);
    const style = (cfg && D.findSpec("style", cfg.styleId)) || styles[0] || null;
    const tech = (cfg && D.findSpec("tech", cfg.techId)) || techs[0] || null;

    // sablon-választás
    const picks = (cfg && cfg.picks) || [];
    let tplIds = picks.length ? picks.map((p) => p.tplId)
      : (window.MFG_SPECCAT_TEMPLATES[cat.id] || ["T-01"]);
    let tpl = tplIds.map(templateById).find(Boolean) || templateById("T-01");
    if (!tpl) return null;

    // KONFIGURÁLT méret/geometria (CPQ vars) → a feloldás a TÉNYLEGES méretekkel
    //   dolgozik: egy 1200-as szekrény MÁS alkatrész-/anyag-/szabás-adatot ad, mint
    //   egy 600-as. A picks vars-a elsőbbséget élvez; ha nincs, a config közvetlen
    //   vars-a (ajánlat-tétel). Picks/vars nélkül a sablon alapértékei (back-compat).
    const pick = picks.find((p) => p.tplId === tpl.id) || picks[0] || null;
    const pickVars = (pick && pick.vars) || (cfg && cfg.vars) || undefined;

    // darabszám: konfig db, vagy a tétel értékéből becsült
    let qty = 1;
    const priced = SE.priceTemplate(tpl, cat, style, tech, pickVars);
    if (picks.length) {
      qty = picks.reduce((n, p) => n + (p.qty || 1), 0);
    } else if (item.value && priced.unit > 0) {
      qty = clampQty(item.value / priced.unit);
    }

    const resolved = SE.resolveTemplate(tpl, cat, style, pickVars); // { parts:[{name,rQty,rW,rH,code,area}] }
    const hasEdge = !!(style && style.values && style.values.edge);
    const edgeFactor = hasEdge ? 0.55 : 0.3;

    // alkatrész-sorok (×darabszám)
    const parts = resolved.parts.map((p) => {
      const pQty = p.rQty * qty;
      const perimM = 2 * (p.rW + p.rH) / 1000;
      const matName = (window.CATALOG_LOOKUP[p.code] && window.CATALOG_LOOKUP[p.code].name) || p.code;
      // csatlakozás-kényszerekből igényelt megmunkálások (furat/marás) → a per-alkatrész útvonal bővül
      let jointOps = [];
      try { if (window.TplEngine && window.TplEngine.jointOps) jointOps = window.TplEngine.jointOps(tpl, p.name); } catch (e) {}
      return { name: p.name, w: p.rW, h: p.rH, qty: pQty, code: p.code, matName, area: p.area * qty, edgeM: perimM * pQty * edgeFactor,
        // gér/szög a műszaki specifikációból (resolveTemplate → partMiters + gér-csatlakozások)
        miterShort: p.miterShort || 0, miterLong: p.miterLong || 0, miterNote: p.miterNote || "", jointOps };
    });

    // vasalat (×darabszám)
    const hardware = (priced.hardware || []).map((h) => ({ ...h, qty: h.qty * qty, cost: h.cost * qty }));

    // anyag (×darabszám)
    const materials = (priced.materials || []).map((m) => ({ ...m, area: m.area * qty, cost: m.cost * qty }));

    return {
      id: item.id, name: item.name, value: item.value || 0, qty,
      catId: cat.id, catName: cat.name,
      styleId: style ? style.id : null, styleName: style ? style.name : "—",
      techId: tech ? tech.id : null, techName: tech ? tech.name : "—",
      brand: priced.brand || (tech && tech.values ? tech.values.hardwareBrand : "Vegyes") || "Vegyes",
      tplId: tpl.id, tplName: tpl.name,
      parts, hardware, materials,
      laborHours: priced.laborHours * qty,
      net: priced.unit * qty, bandPct: priced.bandPct,
    };
  }

  // Munkaidő részlegenként a mennyiségekből + termelékenységi normából
  function laborByDept(q) {
    const rows = (window.MFG_DEPARTMENTS || []).map((d) => {
      let hours = 0;
      if (d.op === "cutting") hours = q.parts * d.norm.perPart;
      else if (d.op === "edge") hours = q.edgeM * d.norm.perMeter;
      else if (d.op === "cnc") hours = q.holes * d.norm.perHole + q.parts * d.norm.perPart;
      else if (d.op === "assembly") hours = q.units * d.norm.perUnit;
      else if (d.op === "surface") hours = q.surfaceM2 * d.norm.perM2;
      else if (d.op === "qc") hours = q.units * d.norm.perUnit;
      const netCap = d.capH * d.eff;
      const days = netCap > 0 ? hours / netCap : 0;
      return { id: d.id, op: d.op, name: d.name, facility: d.facility, color: d.color, icon: d.icon,
        capH: d.capH, eff: d.eff, machines: d.machines, hours: r1(hours), days, cost: Math.round(hours * (window.LABOR_RATE || 6500)) };
    });
    const totalHours = rows.reduce((s, r) => s + r.hours, 0);
    const leadDays = Math.ceil(rows.reduce((s, r) => s + r.days, 0)); // szekvenciális becslés
    const cost = rows.reduce((s, r) => s + r.cost, 0);
    return { rows, totalHours: r1(totalHours), leadDays, cost };
  }

  function derive(project) {
    if (!project || !window.SpecEngine) return null;
    const items = (project.items || []).map(deriveItem).filter(Boolean);

    // ── anyag-aggregálás (kód szerint) ──
    const matAgg = {};
    items.forEach((it) => it.materials.forEach((m) => {
      if (!matAgg[m.code]) matAgg[m.code] = { code: m.code, name: (window.CATALOG_LOOKUP[m.code] && window.CATALOG_LOOKUP[m.code].name) || m.code, area: 0, cost: 0 };
      matAgg[m.code].area += m.area; matAgg[m.code].cost += m.cost;
    }));
    const stockMats = specData().materials();
    const sheetUsable = window.MFG_SHEET.areaM2 * window.MFG_SHEET_FILL;
    const SE = window.SpecEngine;
    // ── ANYAGTÍPUS-VEZÉRELT ANYAGNORMA (woodwork_domain.md §0/§4/§5) ──
    //   Lapanyag → m² → tábla, 10–15% szabászati hulladék.
    //   Tömörfa  → m³ (terület × vastagság) + FAFAJ-FÜGGŐ hulladékszázalék
    //              (tölgy 150%, bükk 130%…); a >100% normális (bemenő fűrészáru
    //              ≫ nettó). A fedezet egysége eltér, ezért külön kezeljük.
    const sheetWastePct = window.WW_SHEET_WASTE_PCT != null ? window.WW_SHEET_WASTE_PCT : 12;
    const materials = Object.values(matAgg).map((m) => {
      const kind = window.wwMaterialKind ? window.wwMaterialKind(m.code, m.name) : "sheet";
      const stock = stockMats.find((s) => s.code === m.code);
      const onHand = stock ? stock.onHand : null;
      const row = { code: m.code, name: m.name, kind, area: r1(m.area), cost: Math.round(m.cost) };
      if (kind === "solidwood") {
        const t = ((SE && SE.matInfo) ? SE.matInfo(m.code).t : 18) || 18;
        const ww = window.wwWoodWaste ? window.wwWoodWaste(m.name) : { species: "Keménylombos (átl.)", pct: 130 };
        const netM3 = m.area * (t / 1000);
        const grossM3 = netM3 * (1 + ww.pct / 100);
        let cover = onHand == null ? "partial" : (onHand >= grossM3 ? "ok" : onHand > 0 ? "partial" : "short");
        Object.assign(row, { thickness: t, species: ww.species, wastePct: ww.pct,
          netM3: r3(netM3), grossM3: r3(grossM3), gross: r3(grossM3), unit: "m³", qtyLabel: r3(grossM3) + " m³",
          sheets: 0, onHand, cover });
      } else {
        const grossArea = m.area * (1 + sheetWastePct / 100);
        const sheets = Math.max(1, Math.ceil(grossArea / sheetUsable));
        let cover = onHand == null ? "partial" : (onHand >= sheets ? "ok" : onHand > 0 ? "partial" : "short");
        Object.assign(row, { wastePct: sheetWastePct, gross: r1(grossArea), sheets, unit: stock ? stock.unit : "tábla",
          qtyLabel: sheets + " tábla", onHand, cover });
      }
      return row;
    }).sort((a, b) => (b.sheets - a.sheets) || ((b.grossM3 || 0) - (a.grossM3 || 0)));

    // ── vasalat-aggregálás (id szerint) ──
    const hwAgg = {};
    items.forEach((it) => it.hardware.forEach((h) => {
      const key = h.id + "·" + (it.brand || "");
      if (!hwAgg[key]) hwAgg[key] = { id: h.id, name: h.name, unit: h.unit, brand: it.brand, unitPrice: h.unitPrice, qty: 0, cost: 0 };
      hwAgg[key].qty += h.qty; hwAgg[key].cost += h.cost;
    }));
    const hardware = Object.values(hwAgg).map((h) => ({ ...h, cost: Math.round(h.cost) })).sort((a, b) => b.cost - a.cost);

    // ── vágólista (lapos, anyag + alkatrész) ──
    const cutlist = [];
    items.forEach((it) => it.parts.forEach((p) => cutlist.push({ itemName: it.name, ...p })));

    // ── mennyiségek a munkaidő-normához ──
    const totalParts = cutlist.reduce((s, p) => s + p.qty, 0);
    const edgeM = cutlist.reduce((s, p) => s + p.edgeM, 0);
    const totalHwQty = hardware.reduce((s, h) => s + h.qty, 0);
    const holes = totalHwQty * 2.5; // proxy: vasalatonként ~2-3 furat
    const units = items.reduce((s, it) => s + it.qty, 0);
    const surfaceM2 = cutlist.reduce((s, p) => s + p.area, 0);
    const labor = laborByDept({ parts: totalParts, edgeM, holes, units, surfaceM2: r1(surfaceM2) });

    // ── összegek ──
    const materialCost = materials.reduce((s, m) => s + m.cost, 0);
    const hardwareCost = hardware.reduce((s, h) => s + h.cost, 0);
    const totalSheets = materials.reduce((s, m) => s + m.sheets, 0);
    const totalVolumeM3 = r3(materials.reduce((s, m) => s + (m.grossM3 || 0), 0));

    // ── segédanyagnorma (ragasztó / felület / csiszoló) ──
    const aux = computeAux(cutlist, edgeM);

    return {
      items,
      materials, hardware, cutlist, labor, aux,
      qty: { parts: totalParts, edgeM: r1(edgeM), holes: Math.round(holes), units, surfaceM2: r1(surfaceM2), sheets: totalSheets, volumeM3: totalVolumeM3 },
      totals: {
        sheets: totalSheets, volumeM3: totalVolumeM3, area: r1(surfaceM2),
        materialCost, hardwareCost, laborCost: labor.cost,
        grand: materialCost + hardwareCost + labor.cost,
        leadDays: labor.leadDays,
      },
    };
  }

  // Bérmunka-állapot: minden (store-ban definiált) kiadható művelet-típushoz a
  // projekt megfelelő epikje + (ha van) a hozzá tartozó kézfogás.
  function outsourceStatus(project) {
    const flatten = window.flattenEpics || ((m) => m.epics || []);
    const epics = [];
    (project.milestones || []).forEach((m) => flatten(m).forEach((e) => epics.push(e)));
    let handshakes = [], ops = [];
    try { const st = window.sim.getState(); handshakes = st.handshakes || []; ops = st.outsourceOps || []; } catch (e) {}
    if (!ops.length) ops = window.MFG_OUTSOURCE_OPS || [];
    return ops.map((opDef) => {
      const re = window.mfgEpicRe(opDef.epicMatch || opDef.op);
      const epic = epics.find((e) => re.test(e.title || ""));
      const hs = epic ? handshakes.find((h) => h.projectId === project.id && ((h.epicIds || [h.epicId]).includes(epic.id))) : null;
      return { ...opDef, epic: epic || null, handshake: hs || null };
    });
  }

  // Bérmunkára szóba jövő partnerek EGY művelethez (kategória + képesség szerint)
  function partnersForOp(opDef) {
    return partnersForOps([opDef.op], opDef.makerCats || []);
  }

  // Bérmunkára szóba jövő partnerek TÖBB művelethez együtt: aki MINDET vállalja
  // (capabilities ⊇ kijelölt op-kulcsok). Kapacitás-jelölés nélküli partner kimarad.
  function partnersForOps(opKeys, makerCats) {
    let partners = [];
    try { partners = (window.sim.getState().partners || []); } catch (e) {}
    const keys = (opKeys || []).filter(Boolean);
    const able = partners.filter((p) => {
      const caps = p.capabilities || [];
      return keys.length ? keys.every((k) => caps.includes(k)) : caps.length > 0;
    });
    // rendezés: platform-tag előre, majd kevesebb extra képesség (specializáltabb) előre
    return able.slice().sort((a, b) => (b.platform - a.platform) || ((a.capabilities || []).length - (b.capabilities || []).length));
  }

  // Részletes info-csomag a kiadott művelet(ek)hez — ezt kapja meg a partner.
  function payloadFor(project, opKeys) {
    const prep = derive(project);
    if (!prep) return null;
    const keys = (opKeys || []).filter(Boolean);
    const labor = prep.labor.rows.filter((r) => keys.includes(r.op))
      .map((r) => ({ op: r.op, label: r.name, hours: r.hours, days: Math.max(1, Math.ceil(r.days)), cost: r.cost }));
    const needsCut = keys.some((k) => ["cutting", "edge", "cnc"].includes(k));
    const needsHw = keys.includes("cnc");
    const needsSurf = keys.includes("surface");
    return {
      ops: labor,
      parts: needsCut ? prep.qty.parts : 0,
      cutlistCount: needsCut ? prep.cutlist.length : 0,
      edgeM: keys.includes("cutting") || keys.includes("edge") ? prep.qty.edgeM : 0,
      sheets: needsCut ? prep.totals.sheets : 0,
      surfaceM2: needsSurf ? prep.qty.surfaceM2 : 0,
      materials: needsCut ? prep.materials.slice(0, 6).map((m) => ({ name: m.name, sheets: m.sheets })) : [],
      hardware: needsHw ? prep.hardware.slice(0, 6).map((h) => ({ name: h.name, qty: h.qty })) : [],
      totalHours: labor.reduce((s, r) => s + r.hours, 0),
      totalCost: labor.reduce((s, r) => s + r.cost, 0),
    };
  }

  // ── Útvonal / műveletekre bontás ─────────────────────────────────────────
  //   A levezetett munkaidő-részlegekből (laborByDept) készít egy technológiai
  //   ÚTVONAL-tervet: részleg-művelet → műhely-állomás (PROD_KINDS) + alapértel-
  //   mezett gép. Ez a terv lesz a „kiadás a műhelynek" alapja (prodTask/lépés).
  //   A QC nem műhely-állomás (a Minőség világ kezeli) → kimarad.
  const OP_TO_KIND = { cutting: "szabaszat", edge: "elzaras", cnc: "cnc", assembly: "szereles", surface: "feluletkezeles" };

  function defaultStationFor(kind) {
    const list = window.PROD_STATIONS || [];
    return list.find((s) => s.kind === kind) || null;
  }

  // A teljes technológiai útvonal egy projektre/rendelésre. Minden lépés:
  //   { op, kind, kindLabel, name, hours, days, machineId, machineName, icon,
  //     accent, enabled (van-e munka), outsource (bérmunkára jelölve) }
  function routingPlan(project) {
    const prep = derive(project);
    if (!prep) return [];
    const order = window.PROD_KIND_ORDER || ["szabaszat", "elzaras", "cnc", "szereles", "feluletkezeles"];
    const kinds = window.PROD_KINDS || {};
    const byKind = {};
    prep.labor.rows.forEach((r) => {
      const kind = OP_TO_KIND[r.op];
      if (!kind) return; // qc kimarad
      byKind[kind] = { op: r.op, hours: r.hours, days: Math.max(1, Math.ceil(r.days)) };
    });
    // ── ANYAG-TUDATOS: mely alkatrészek futnak át az egyes állomásokon (per-alkatrész
    //    útvonalból), és a WW_OPS állomás-mapje alapján. Így a release a VALÓS, anyagtípus
    //    szerinti állomás-halmazt kapja (pl. lap-only munkánál nincs felületkezelés). ──
    const routes = partRoutes(project);
    const stationParts = {};
    // PER-ÁLLOMÁS MŰVELETI LÉPÉSEK: az állomáson belüli WW_OPS technológiai
    // bontása (válogatás→darabolás→…→vastagolás→táblásítás a tömörfa front-endnél;
    // csak „szabás" a lapnál). Az ÚTVONAL így a VALÓS faipari műveleteket hordozza
    // → a kiadáskor a műhely-feladat lépésenként követhetővé válik. (woodwork_domain §11)
    const opStepsByStation = {};
    if (routes) {
      routes.parts.forEach((pt) => {
        const sts = new Set();
        pt.ops.forEach((opk) => { const od = (window.WW_OP_BY_KEY || {})[opk]; if (od && od.station) sts.add(od.station); });
        sts.forEach((s) => { (stationParts[s] = stationParts[s] || []).push(pt.name); });
      });
      // WW_OPS már technológiai sorrendben van → a push-sorrend a helyes művelet-sorrend
      (window.WW_OPS || []).forEach((o) => {
        if (!o.station) return;
        const usedBy = routes.parts.filter((pt) => pt.ops.includes(o.key));
        if (!usedBy.length) return;
        (opStepsByStation[o.station] = opStepsByStation[o.station] || []).push({
          key: o.key, label: o.label, short: o.short, icon: o.icon,
          front: !!o.front, merge: !!o.merge, partCount: usedBy.length,
          kinds: Array.from(new Set(usedBy.map((pt) => pt.kind))),
        });
      });
    }
    const allKinds = order.filter((k) => byKind[k] || (stationParts[k] && stationParts[k].length));
    return allKinds.map((kind, i) => {
      const meta = kinds[kind] || {};
      const st = defaultStationFor(kind);
      const row = byKind[kind] || { op: kind, hours: 0, days: 1 };
      const hours = Math.max(0.5, Math.round((row.hours || 0) * 2) / 2);
      const pl = stationParts[kind] || [];
      const opSteps = opStepsByStation[kind] || [];
      return {
        seq: i + 1, op: row.op, kind, kindLabel: meta.label || kind,
        name: meta.label || kind, hours, days: row.days || 1,
        machineId: st ? st.id : null, machineName: st ? st.name : "—",
        icon: meta.icon || "factory", accent: meta.accent || "#0d9488",
        enabled: (pl.length > 0 || (row.hours || 0) > 0), outsource: false,
        parts: pl, partCount: pl.length,
        opSteps, opStepCount: opSteps.length,
      };
    });
  }

  // ── Per-alkatrész útvonal (anyagtípus-vezérelt) — a „vonalas folyamatábra" ──
  //   A derivált alkatrészeket anyagtípus szerint osztályozza (wwMaterialKind),
  //   és mindegyikhez a saját technológiai útvonalát rendeli (wwPartOps). A LAP
  //   és a TÖMÖRFA alkatrész ELTÉRŐ műveletsoron megy át (per-alkatrész, NEM
  //   per-rendelés). Visszaad: { parts[], ops[] (használt, sorrendben), kindCounts }.
  function partRoutes(project) {
    const prep = derive(project);
    if (!prep) return null;
    const loc = window.wwParseLocation ? window.wwParseLocation(project.name) : { site: null, room: null };
    const projLabel = project.customer || (project.name || "").split(/\s[—–-]\s/).pop() || project.id;
    const parts = [];
    (prep.items || []).forEach((it) => {
      (it.parts || []).forEach((p) => {
        const kind = window.wwMaterialKind ? window.wwMaterialKind(p.code, p.matName) : "sheet";
        const ops = window.wwPartOps ? window.wwPartOps(p, kind) : ["szabas", "szereles", "kesz"];
        const ref = { project: projLabel, site: loc.site, room: loc.room,
          group: it.catName || null, element: it.name, part: p.name };
        parts.push({ name: p.name, itemName: it.name, code: p.code, matName: p.matName,
          qty: p.qty, w: p.w, h: p.h, edgeM: p.edgeM, kind, ops, ref });
      });
    });
    const allOps = window.WW_OPS || [];
    const used = allOps.filter((o) => parts.some((pt) => pt.ops.includes(o.key)));
    const kindCounts = {};
    (window.WW_KIND_ORDER || ["sheet", "solidwood"]).forEach((k) => { kindCounts[k] = 0; });
    parts.forEach((pt) => { kindCounts[pt.kind] = (kindCounts[pt.kind] || 0) + 1; });
    return { parts, ops: used, kindCounts, site: loc.site, room: loc.room, units: (prep.qty && prep.qty.units) || 0,
      kinds: Object.keys(kindCounts).filter((k) => kindCounts[k] > 0) };
  }

  // ── Kétszintű árkalkuláció (woodwork_domain.md §10) ─────────────────────────
  //   Egyszerűsített (tanuló, BRUTTÓ): anyag + (bér+rezsi) + gép.
  //   Összetett (vállalkozó, NETTÓ): anyag + bér + járulék + egyéb → közvetlen →
  //     +általános → önköltség → +nyereség → nettó ár → +áfa → bruttó.
  //   A %-ok a paraméterekből (WW_PRICE_PARAMS), felülírhatók a UI-ból.
  function priceCalc(prep, params) {
    if (!prep) return null;
    const p = Object.assign({}, window.WW_PRICE_PARAMS || {}, params || {});
    const hours = prep.labor ? prep.labor.totalHours : 0;
    const mat = (prep.totals.materialCost || 0) + (prep.totals.hardwareCost || 0);

    // (1) Egyszerűsített — bruttó
    const sBer = Math.round(hours * p.shiftRate);
    const sGep = Math.round(hours * p.machineRate * p.machineFactor);
    const simple = { anyag: Math.round(mat), ber: sBer, gep: sGep, total: Math.round(mat) + sBer + sGep, hours,
      util: p.shiftUtil, shiftRate: p.shiftRate, machineRate: p.machineRate, machineFactor: p.machineFactor };

    // (2) Összetett — nettó
    const anyag = Math.round(mat);
    const ber = Math.round(hours * p.laborRate);
    const jarulek = Math.round(ber * p.szochoPct / 100);
    const egyeb = Math.round(p.otherCost || 0);
    const kozvetlen = anyag + ber + jarulek + egyeb;
    const altalanos = Math.round(kozvetlen * p.overheadPct / 100);
    const onkoltseg = kozvetlen + altalanos;
    const nyereseg = Math.round(onkoltseg * p.profitPct / 100);
    const kalkulalt = onkoltseg + nyereseg;
    const nettoAr = Math.round(kalkulalt / 100) * 100; // kerekítés százasra
    const brutto = Math.round(nettoAr * (1 + p.vatPct / 100));
    const full = { anyag, ber, jarulek, egyeb, kozvetlen, altalanos, onkoltseg, nyereseg, kalkulalt, nettoAr, brutto,
      hours, laborRate: p.laborRate, szochoPct: p.szochoPct, overheadPct: p.overheadPct, profitPct: p.profitPct, vatPct: p.vatPct };

    return { simple, full, hours, mat: Math.round(mat), params: p };
  }

  window.MfgPrep = { derive, deriveItem, outsourceStatus, partnersForOp, partnersForOps, payloadFor, laborByDept, routingPlan, partRoutes, priceCalc, OP_TO_KIND };
})();
