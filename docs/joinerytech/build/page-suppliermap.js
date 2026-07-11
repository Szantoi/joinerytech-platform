/* AUTO-GENERATED from page-suppliermap.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// Beszállítói cikk-megfeleltetés — a külső beszállító SAJÁT cikkszáma +
// megnevezése ↔ a MI katalógus tételünk.
//   • Beállítások → Beszállítói cikkek: a teljes megfeleltetési tábla (CRUD).
//   • A beszerzés a rendeléskor rögzíti (learnSupplierMap), a raktár a
//     bevételezéskor ebből oldja fel az idegen megnevezést (resolveSupplierItem).
// Store: supplierMap[], add/update/remove/learnSupplierMap, resolveSupplierItem,
//        supplierRefFor, supplierMapBySupplier.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateSM,
  useMemo: useMemoSM
} = React;

// Katalógus tétel rövid címkéje.
function smCatLabel(it) {
  return it ? `${it.name} · ${it.code}` : "— ismeretlen tétel —";
}

// ════════════════════════════════════════════════════════════════
// BEÁLLÍTÁSOK → BESZÁLLÍTÓI CIKKEK (megfeleltetési tábla)
// ════════════════════════════════════════════════════════════════
function SupplierMapPanel() {
  const sim = window.useSim();
  const maps = sim.supplierMap || [];
  const catalog = (sim.catalog || []).filter(x => x.active !== false);
  const catById = useMemoSM(() => Object.fromEntries(catalog.map(c => [c.id, c])), [catalog]);
  const suppliers = useMemoSM(() => {
    const fromMap = maps.map(m => m.supplierName);
    const fromCat = catalog.flatMap(c => (c.suppliers || []).map(s => s.name)).concat(catalog.map(c => c.supplier));
    return Array.from(new Set([...fromMap, ...fromCat].filter(Boolean))).sort((a, b) => a.localeCompare(b, "hu"));
  }, [maps, catalog]);
  const [q, setQ] = useStateSM("");
  const [supFilter, setSupFilter] = useStateSM("");
  const [adding, setAdding] = useStateSM(false);
  const [editId, setEditId] = useStateSM(null);
  const filtered = useMemoSM(() => {
    const needle = q.trim().toLowerCase();
    return maps.filter(m => {
      if (supFilter && m.supplierName !== supFilter) return false;
      if (!needle) return true;
      const cat = catById[m.catalogItemId];
      return [m.supplierSku, m.supplierLabel, m.supplierName, cat?.name, cat?.code].filter(Boolean).some(s => s.toLowerCase().includes(needle));
    });
  }, [maps, q, supFilter, catById]);
  const grouped = useMemoSM(() => {
    const g = {};
    filtered.forEach(m => {
      (g[m.supplierName] = g[m.supplierName] || []).push(m);
    });
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0], "hu"));
  }, [filtered]);

  // Hány katalógus tételhez nincs még megfeleltetés egyetlen beszállítónál sem?
  const unmappedCount = useMemoSM(() => {
    const mapped = new Set(maps.map(m => m.catalogItemId));
    return catalog.filter(c => c.worldExt?.warehouse && !mapped.has(c.id)).length;
  }, [maps, catalog]);
  return /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1100px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 mb-1"
  }, "Besz\xE1ll\xEDt\xF3i cikk-megfeleltet\xE9s"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-stone-500 max-w-[680px]"
  }, "A k\xFCls\u0151 besz\xE1ll\xEDt\xF3 ", /*#__PURE__*/React.createElement("b", null, "saj\xE1t cikksz\xE1ma \xE9s megnevez\xE9se"), " ritk\xE1n egyezik a mi\xE9nkkel. Itt r\xF6gz\xEDted, melyik idegen t\xE9tel melyik ", /*#__PURE__*/React.createElement("b", null, "saj\xE1t katal\xF3gus t\xE9tel\xFCnknek"), " felel meg \u2014 \xEDgy a beszerz\xE9s a rendel\xE9st a besz\xE1ll\xEDt\xF3 nyelv\xE9n adja fel, a rakt\xE1r pedig a sz\xE1ll\xEDt\xF3lev\xE9len/sz\xE1ml\xE1n szerepl\u0151 idegen megnevez\xE9st automatikusan a saj\xE1t t\xE9tel\xFCnkre oldja fel a bev\xE9telez\xE9skor.")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative flex-1 min-w-[180px]"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14,
    className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Keres\xE9s cikksz\xE1mra, megnevez\xE9sre\u2026",
    className: "w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white"
  })), /*#__PURE__*/React.createElement("select", {
    value: supFilter,
    onChange: e => setSupFilter(e.target.value),
    className: "h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Minden besz\xE1ll\xEDt\xF3"), suppliers.map(s => /*#__PURE__*/React.createElement("option", {
    key: s,
    value: s
  }, s))), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: () => {
      setAdding(true);
      setEditId(null);
    }
  }, "\xDAj megfeleltet\xE9s")), unmappedCount > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-3 flex items-center gap-2 text-[11.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 14,
    className: "shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, unmappedCount), " rakt\xE1rozott katal\xF3gus t\xE9telhez nincs m\xE9g besz\xE1ll\xEDt\xF3i megfeleltet\xE9s \u2014 ezeket a bev\xE9telez\xE9skor k\xE9zzel kell p\xE1ros\xEDtani.")), adding && /*#__PURE__*/React.createElement(SupplierMapForm, {
    catalog: catalog,
    suppliers: suppliers,
    onClose: () => setAdding(false)
  }), /*#__PURE__*/React.createElement(SupplierOrderKit, null), grouped.length === 0 && !adding && /*#__PURE__*/React.createElement(Card, {
    className: "px-5 py-10 text-center text-[12.5px] text-stone-400"
  }, "Nincs tal\xE1lat. Vegy\xE9l fel egy megfeleltet\xE9st a fenti gombbal."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, grouped.map(([supplier, rows]) => /*#__PURE__*/React.createElement("div", {
    key: supplier
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium"
  }, supplier), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, rows.length, " t\xE9tel")), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[1.2fr_1.6fr_24px_1.6fr_72px] gap-3 px-4 py-2 bg-stone-50/70 border-b border-stone-100 text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, /*#__PURE__*/React.createElement("div", null, "Besz\xE1ll\xEDt\xF3 cikksz\xE1ma"), /*#__PURE__*/React.createElement("div", null, "Besz\xE1ll\xEDt\xF3 megnevez\xE9se"), /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", null, "Saj\xE1t katal\xF3gus t\xE9tel"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "M\u0171velet")), rows.map(m => editId === m.id ? /*#__PURE__*/React.createElement("div", {
    key: m.id,
    className: "px-4 py-3 border-b border-stone-100 last:border-0"
  }, /*#__PURE__*/React.createElement(SupplierMapForm, {
    inline: true,
    map: m,
    catalog: catalog,
    suppliers: suppliers,
    onClose: () => setEditId(null)
  })) : /*#__PURE__*/React.createElement(SupplierMapRow, {
    key: m.id,
    m: m,
    catById: catById,
    onEdit: () => setEditId(m.id),
    onRemove: () => window.sim.removeSupplierMap(m.id)
  })))))));
}

// Szett-rendelés — a szorzó VISSZAFELÉ: „kell N konténer → mennyi komponenst rendeljek?"
// A többszörös cél-tételű (kit) megfeleltetésekből bontja ki a komponens-szükségletet,
// és Draft beszerzési igényeket hoz létre, amik a normál beszerzési láncba kerülnek.
function SupplierOrderKit() {
  const sim = window.useSim();
  const kits = sim.supplierKits ? sim.supplierKits() : [];
  const assemblies = (sim.catalog || []).filter(c => c.active !== false && Array.isArray(c.bom) && c.bom.length > 0);
  const options = [...assemblies.map(a => ({
    type: "assembly",
    id: a.id,
    label: `${a.name} (${a.code})`,
    group: "Katalógus-összeállítás"
  })), ...kits.map(k => ({
    type: "kit",
    id: k.id,
    label: `${k.supplierName} — ${k.supplierLabel}`,
    group: "Beszállítói szett"
  }))];
  const [open, setOpen] = useStateSM(false);
  const [selKey, setSelKey] = useStateSM(options[0] ? options[0].type + ":" + options[0].id : "");
  const [qty, setQty] = useStateSM("1");
  const [onlyShort, setOnlyShort] = useStateSM(true);
  if (!options.length) return null;
  const sel = options.find(o => o.type + ":" + o.id === selKey) || options[0];
  const n = Math.max(0, Number(qty) || 0);
  const rawLines = sel.type === "kit" ? window.sim.orderKitLines(sel.id, n) : window.sim.explodeBom(sel.id, n);
  const freeOf = cid => {
    const it = (sim.catalog || []).find(c => c.id === cid);
    const wh = it && it.worldExt && it.worldExt.warehouse;
    return wh ? wh.available != null ? wh.available : wh.onHand || 0 : 0;
  };
  const lines = rawLines.map(l => {
    const free = freeOf(l.catalogItemId);
    return {
      ...l,
      perUnit: n > 0 ? l.qty / n : 0,
      free,
      short: Math.max(0, l.qty - free)
    };
  });
  const totalCost = lines.reduce((s, l) => s + (l.price || 0) * l.qty, 0);
  const shortCount = lines.filter(l => l.short > 0).length;
  const supLabel = sel.type === "kit" ? (kits.find(k => k.id === sel.id) || {}).supplierName : "komponensenkénti szállító";
  const supplierFor = cid => {
    if (sel.type === "kit") return (kits.find(k => k.id === sel.id) || {}).supplierName || "Egyéb (nincs szállító)";
    const it = (sim.catalog || []).find(c => c.id === cid);
    return it && it.supplier || it && it.suppliers && it.suppliers[0] && it.suppliers[0].name || "Egyéb (nincs szállító)";
  };
  const createReqs = () => {
    const src = lines.map(l => ({
      ...l,
      orderQty: onlyShort ? l.short : l.qty
    })).filter(l => l.orderQty > 0);
    if (!src.length) {
      if (window.toast) window.toast("Nincs rendelendő mennyiség", "info");
      return;
    }
    const rows = src.map((l, i) => ({
      id: "PR-2426-B" + Date.now().toString().slice(-5) + i,
      material: l.name,
      matCode: l.code,
      qty: l.orderQty,
      unit: l.unit,
      preferredSupplier: supplierFor(l.catalogItemId),
      requester: "Beszerző",
      date: "2026-06-07",
      status: "Draft",
      note: `${sel.label} × ${n}${onlyShort ? " (hiánypótlás)" : ""}`,
      estUnit: l.price || 0
    }));
    window.sim.addRequisitions(rows);
    if (window.toast) window.toast(`✓ ${rows.length} igény létrehozva (Draft) — lásd Igénylések`, "success");
  };
  return /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden mb-4 border-teal-200"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(v => !v),
    className: "w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-teal-50/40"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-lg bg-teal-50 grid place-items-center text-teal-600 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "procurement",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "\xD6ssze\xE1ll\xEDt\xE1s / szett rendel\xE9s \u2014 komponens-sz\xFCks\xE9glet"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, "\u201EKell N szekr\xE9ny / szerelv\xE9ny-szett \u2192 mennyi komponenst rendeljek?\" \u2014 a BOM/szorz\xF3 visszafel\xE9, k\xE9szletfedezettel.")), /*#__PURE__*/React.createElement(Icon, {
    name: open ? "up" : "down",
    size: 16,
    className: "text-stone-400 shrink-0"
  })), open && /*#__PURE__*/React.createElement("div", {
    className: "px-4 pb-4 pt-1 border-t border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-end gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-[200px]"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500 block mb-1"
  }, "\xD6ssze\xE1ll\xEDt\xE1s / szett"), /*#__PURE__*/React.createElement("select", {
    value: selKey,
    onChange: e => setSelKey(e.target.value),
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  }, ["Katalógus-összeállítás", "Beszállítói szett"].map(grp => {
    const og = options.filter(o => o.group === grp);
    if (!og.length) return null;
    return /*#__PURE__*/React.createElement("optgroup", {
      key: grp,
      label: grp
    }, og.map(o => /*#__PURE__*/React.createElement("option", {
      key: o.type + ":" + o.id,
      value: o.type + ":" + o.id
    }, o.label)));
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500 block mb-1"
  }, "Darab"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setQty(String(Math.max(0, n - 1))),
    className: "w-9 h-9 rounded-lg border border-stone-200 grid place-items-center text-stone-500 hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "minus",
    size: 14
  })), /*#__PURE__*/React.createElement("input", {
    value: qty,
    onChange: e => setQty(e.target.value.replace(/[^0-9]/g, "")),
    className: "w-14 h-9 text-center rounded-lg border border-stone-200 text-[13px] font-mono outline-none focus:border-teal-500"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setQty(String(n + 1)),
    className: "w-9 h-9 rounded-lg border border-stone-200 grid place-items-center text-stone-500 hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[1.6fr_auto_auto_auto] gap-3 px-3 py-2 bg-stone-50/70 text-[10px] uppercase tracking-wide text-stone-400 font-medium"
  }, /*#__PURE__*/React.createElement("div", null, "Komponens"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "1 egys\xE9gben"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Sz\xFCks\xE9glet"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Szabad / hi\xE1ny")), lines.map(l => /*#__PURE__*/React.createElement("div", {
    key: l.catalogItemId,
    className: "grid grid-cols-[1.6fr_auto_auto_auto] gap-3 px-3 py-2.5 border-t border-stone-100 items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-900 font-medium truncate"
  }, l.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] font-mono text-stone-400"
  }, l.code)), /*#__PURE__*/React.createElement("div", {
    className: "text-right text-[11.5px] text-stone-500 font-mono whitespace-nowrap"
  }, "\xD7", +l.perUnit.toFixed(3), " ", l.unit), /*#__PURE__*/React.createElement("div", {
    className: "text-right text-[13px] text-stone-900 font-mono font-semibold whitespace-nowrap"
  }, +l.qty.toFixed(3), " ", l.unit), /*#__PURE__*/React.createElement("div", {
    className: "text-right whitespace-nowrap"
  }, l.short > 0 ? /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] font-medium text-rose-600"
  }, +l.free.toFixed(2), " \xB7 \u2212", +l.short.toFixed(2)) : /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] font-medium text-emerald-600"
  }, +l.free.toFixed(2), " \u2713"))))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2 mt-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "inline-flex items-center gap-2 text-[11.5px] text-stone-600 select-none cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: onlyShort,
    onChange: e => setOnlyShort(e.target.checked),
    className: "accent-teal-600 w-3.5 h-3.5"
  }), "Csak a hi\xE1nyt rendeljem (", shortCount, " t\xE9tel)"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, sel.type === "assembly" && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.buildAssembly(sel.id, n),
    disabled: n <= 0 || shortCount > 0,
    title: shortCount > 0 ? "Előbb pótold a hiányzó komponenseket" : "Komponensek fogyasztása + késztermék készletre",
    className: `h-9 px-3.5 rounded-lg text-[12px] font-medium border ${n > 0 && shortCount === 0 ? "border-stone-300 text-stone-700 hover:bg-stone-50" : "border-stone-200 text-stone-300"}`
  }, "Gy\xE1rt\xE1s k\xE9szletre"), /*#__PURE__*/React.createElement("button", {
    onClick: createReqs,
    disabled: n <= 0,
    className: `h-9 px-3.5 rounded-lg text-[12px] font-medium ${n > 0 ? "bg-teal-700 text-white hover:bg-teal-800" : "bg-stone-200 text-stone-400"}`
  }, "Ig\xE9nyek l\xE9trehoz\xE1sa"))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1.5"
  }, n, " \xD7 ", /*#__PURE__*/React.createElement("b", null, sel.label), " \xB7 becs\xFClt anyag\xE9rt\xE9k ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-stone-600"
  }, totalCost.toLocaleString("hu-HU"), " Ft"), " \xB7 sz\xE1ll\xEDt\xF3: ", supLabel, ".", sel.type === "assembly" ? " A Gyártás készletre gomb a komponensek fogyasztásával készterméket vesz a raktárba." : " A komponensek Draft igényként jönnek létre, szállítónkénti PO-bontással.")));
}
function SupplierMapRow({
  m,
  catById,
  onEdit,
  onRemove
}) {
  const targets = window.sim.supplierMapTargets(m);
  const multi = targets.length > 1;
  return /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-[1.2fr_1.6fr_24px_1.6fr_72px] gap-1 md:gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0 md:items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-[12px] text-stone-800"
  }, m.supplierSku || /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300"
  }, "\u2014"), m.supplierUnit && /*#__PURE__*/React.createElement("span", {
    className: "ml-1.5 font-sans text-[10px] text-stone-400"
  }, "/ ", m.supplierUnit)), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-700"
  }, m.supplierLabel || /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300"
  }, "\u2014"), m.note && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, m.note)), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid place-items-center text-stone-300"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px]"
  }, multi ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-0.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-teal-600 font-medium"
  }, targets.length, " t\xE9telre bontva"), targets.map((t, i) => {
    const c = catById[t.catalogItemId];
    const cl = c ? c.variantOf ? ((catById[c.variantOf] || {}).name || c.name) + " · " + (window.sim.variantLabel(c) || "") : c.name : null;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] font-mono text-stone-400 w-8 text-right"
    }, "\xD7", t.factor), c ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "text-stone-900 font-medium"
    }, cl), /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-[10.5px] text-stone-400"
    }, c.code)) : /*#__PURE__*/React.createElement("span", {
      className: "text-rose-500"
    }, "t\xF6r\xF6lt"));
  })) : (() => {
    const c = catById[targets[0]?.catalogItemId];
    const f = targets[0] ? targets[0].factor : 1;
    const cl = c ? c.variantOf ? ((catById[c.variantOf] || {}).name || c.name) + " · " + (window.sim.variantLabel(c) || "") : c.name : null;
    return c ? /*#__PURE__*/React.createElement("span", {
      className: "inline-flex flex-wrap items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-stone-900 font-medium"
    }, cl), /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-[10.5px] text-stone-400"
    }, c.code), f !== 1 && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 font-mono"
    }, "1 ", m.supplierUnit || "egys.", " = \xD7", f, " ", c.unit)) : /*#__PURE__*/React.createElement("span", {
      className: "text-rose-500"
    }, "t\xF6r\xF6lt t\xE9tel");
  })()), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 md:justify-end mt-1 md:mt-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onEdit,
    className: "w-8 h-8 grid place-items-center rounded-lg hover:bg-stone-100 text-stone-400",
    title: "Szerkeszt\xE9s"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    onClick: onRemove,
    className: "w-8 h-8 grid place-items-center rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-500",
    title: "T\xF6rl\xE9s"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))));
}
function SupplierMapForm({
  map,
  catalog,
  suppliers,
  onClose,
  inline
}) {
  const [supplierName, setSupplierName] = useStateSM(map?.supplierName || suppliers[0] || "");
  const [supplierSku, setSupplierSku] = useStateSM(map?.supplierSku || "");
  const [supplierLabel, setSupplierLabel] = useStateSM(map?.supplierLabel || "");
  const [supplierUnit, setSupplierUnit] = useStateSM(map?.supplierUnit || "");
  const [sheetOn, setSheetOn] = useStateSM(!!map?.sheet);
  const [sheetW, setSheetW] = useStateSM(map?.sheet?.w ? String(map.sheet.w) : "");
  const [sheetL, setSheetL] = useStateSM(map?.sheet?.l ? String(map.sheet.l) : "");
  const [sheetVar, setSheetVar] = useStateSM(!!map?.sheet?.variable);
  const [note, setNote] = useStateSM(map?.note || "");
  // cél-tételek: 1:1 / N:1 → egy cél (a szorzó lehet mértékegység-átváltás);
  // 1:N (szétbontás) → több cél szorzóval
  const initTargets = map ? window.sim.supplierMapTargets(map) : [];
  const [targets, setTargets] = useStateSM(initTargets.length ? initTargets : [{
    catalogItemId: "",
    factor: 1
  }]);
  const split = targets.length > 1;
  const items = useMemoSM(() => catalog.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", "hu")), [catalog]);
  const itemById = useMemoSM(() => Object.fromEntries(items.map(c => [c.id, c])), [items]);
  // Variáns-aware célválasztó: a variáns-fő-tétel NEM választható közvetlenül (a
  // készlet a variánson van), helyette a variánsok jelennek meg a fő-tétel alá
  // csoportosítva, variáns-címkével (pl. „Blum Antaro · 450 mm · barna").
  const pickGroups = useMemoSM(() => {
    const groups = [];
    const byKey = {};
    const push = (gkey, opt) => {
      if (!byKey[gkey]) {
        byKey[gkey] = {
          key: gkey,
          opts: []
        };
        groups.push(byKey[gkey]);
      }
      byKey[gkey].opts.push(opt);
    };
    items.forEach(c => {
      const isParent = Array.isArray(c.variantAxes) && c.variantAxes.length;
      if (isParent) return; // absztrakt fő-tétel kihagyva
      if (c.variantOf) {
        const p = itemById[c.variantOf] || catById[c.variantOf];
        const pname = p ? p.name : c.name;
        push("◆ " + pname, {
          id: c.id,
          label: (window.sim.variantLabel(c) || c.name) + " · " + c.code
        });
      } else {
        push(c.cat || "Tételek", {
          id: c.id,
          label: c.name + " (" + c.code + ")"
        });
      }
    });
    return groups;
  }, [items, itemById, catById]);
  const catItemLabel = c => !c ? "" : c.variantOf ? ((itemById[c.variantOf] || catById[c.variantOf] || {}).name || c.name) + " · " + (window.sim.variantLabel(c) || "") : c.name;
  const setT = (i, patch) => setTargets(ts => ts.map((t, j) => j === i ? {
    ...t,
    ...patch
  } : t));
  const addT = () => setTargets(ts => [...ts, {
    catalogItemId: "",
    factor: 1
  }]);
  const rmT = i => setTargets(ts => ts.length > 1 ? ts.filter((_, j) => j !== i) : ts);
  const validTargets = targets.filter(t => t.catalogItemId);
  const valid = supplierName.trim() && validTargets.length > 0 && (supplierSku.trim() || supplierLabel.trim());
  const supUnitLabel = supplierUnit.trim() || "beszállítói egység";
  const sheetFactor = Number(sheetW) > 0 && Number(sheetL) > 0 ? Number(sheetW) * Number(sheetL) / 1e6 : 0;
  const sheetActive = sheetOn && !split;
  const save = () => {
    const eff = validTargets.map(t => ({
      catalogItemId: t.catalogItemId,
      factor: Number(t.factor) > 0 ? Number(t.factor) : 1
    }));
    if (sheetActive && eff[0] && sheetFactor > 0) eff[0].factor = +sheetFactor.toFixed(4);
    const data = {
      supplierName,
      supplierSku,
      supplierLabel,
      supplierUnit: sheetActive && !supplierUnit.trim() ? "tábla" : supplierUnit,
      sheet: sheetActive && sheetFactor > 0 ? {
        w: Number(sheetW),
        l: Number(sheetL),
        variable: sheetVar
      } : null,
      note,
      targets: eff
    };
    if (map) window.sim.updateSupplierMap(map.id, data);else window.sim.addSupplierMap(data);
    onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? "w-full" : "rounded-xl border border-teal-200 bg-teal-50/30 p-3.5 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-2.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500 block mb-1"
  }, "Besz\xE1ll\xEDt\xF3 *"), /*#__PURE__*/React.createElement("input", {
    value: supplierName,
    onChange: e => setSupplierName(e.target.value),
    list: "sm-suppliers",
    placeholder: "pl. Egger Faipari Kft.",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white"
  }), /*#__PURE__*/React.createElement("datalist", {
    id: "sm-suppliers"
  }, suppliers.map(s => /*#__PURE__*/React.createElement("option", {
    key: s,
    value: s
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500 block mb-1"
  }, "Besz\xE1ll\xEDt\xF3 cikksz\xE1ma"), /*#__PURE__*/React.createElement("input", {
    value: supplierSku,
    onChange: e => setSupplierSku(e.target.value),
    placeholder: "pl. W980 ST2 16",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500 bg-white"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500 block mb-1"
  }, "Besz\xE1ll\xEDt\xF3 m\xE9rt\xE9kegys\xE9ge"), /*#__PURE__*/React.createElement("input", {
    value: supplierUnit,
    onChange: e => setSupplierUnit(e.target.value),
    list: "sm-units",
    placeholder: "pl. t\xE1bla, tekercs, doboz, p\xE1r",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white"
  }), /*#__PURE__*/React.createElement("datalist", {
    id: "sm-units"
  }, ["tábla", "tekercs", "doboz", "pár", "csomag", "raklap", "szett", "db", "m²", "fm"].map(u => /*#__PURE__*/React.createElement("option", {
    key: u,
    value: u
  })))), /*#__PURE__*/React.createElement("div", {
    className: "md:col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500 block mb-1"
  }, "Besz\xE1ll\xEDt\xF3 megnevez\xE9se"), /*#__PURE__*/React.createElement("input", {
    value: supplierLabel,
    onChange: e => setSupplierLabel(e.target.value),
    placeholder: "ahogy a sz\xE1ll\xEDt\xF3lev\xE9len szerepel",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500"
  }, "Saj\xE1t katal\xF3gus t\xE9tel", split ? "ek (szétbontás)" : "", " + \xE1tv\xE1lt\xE1s *"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-teal-600"
  }, "\xD7szorz\xF3 = h\xE1ny saj\xE1t egys\xE9g j\xF6n 1 ", supUnitLabel, "-b\u0151l")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, targets.map((t, i) => {
    const c = itemById[t.catalogItemId];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("select", {
      value: t.catalogItemId,
      onChange: e => setT(i, {
        catalogItemId: e.target.value
      }),
      className: "flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u2014 v\xE1lassz t\xE9telt \u2014"), pickGroups.map(g => /*#__PURE__*/React.createElement("optgroup", {
      key: g.key,
      label: g.key
    }, g.opts.map(o => /*#__PURE__*/React.createElement("option", {
      key: o.id,
      value: o.id
    }, o.label))))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 shrink-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-400"
    }, "\xD7"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      step: "any",
      value: t.factor,
      onChange: e => setT(i, {
        factor: e.target.value
      }),
      className: "w-16 h-9 px-2 rounded-lg border border-stone-200 text-[12px] text-right font-mono outline-none focus:border-teal-500 bg-white",
      disabled: sheetActive
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-400 w-7"
    }, c ? c.unit : "")), targets.length > 1 && /*#__PURE__*/React.createElement("button", {
      onClick: () => rmT(i),
      className: "shrink-0 w-8 h-8 grid place-items-center rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-500"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 13
    })));
  })), /*#__PURE__*/React.createElement("button", {
    onClick: addT,
    className: "mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-teal-700 font-medium hover:text-teal-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), split ? "További cél-tétel" : "Szétbontás több tételre"), split ? /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1"
  }, "Pl. 1 szettb\u0151l 1 fi\xF3kcs\xFAsz\xF3 (\xD71) + 2 csuk\xF3p\xE1nt (\xD72). A bev\xE9telez\xE9sn\xE9l a sor automatikusan felbonthat\xF3.") : itemById[targets[0]?.catalogItemId] && Number(targets[0]?.factor) !== 1 ? /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-teal-600 mt-1"
  }, "M\xE9rt\xE9kegys\xE9g-\xE1tv\xE1lt\xE1s: ", /*#__PURE__*/React.createElement("b", null, "1 ", supUnitLabel, " = ", +Number(targets[0].factor) || 0, " ", itemById[targets[0].catalogItemId].unit), ". Bev\xE9telez\xE9skor a besz\xE1ll\xEDt\xF3i mennyis\xE9get ennyivel szorozza.") : /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1"
  }, "Ha a besz\xE1ll\xEDt\xF3 m\xE1s egys\xE9gben tartja nyilv\xE1n (pl. ", /*#__PURE__*/React.createElement("b", null, "t\xE1bla"), "), mint mi (pl. ", /*#__PURE__*/React.createElement("b", null, "m\xB2"), "), \xE1ll\xEDtsd a \xD7szorz\xF3t az \xE1tv\xE1lt\xE1sra (1 t\xE1bla = 5,796 m\xB2)."), !split && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 rounded-lg border border-stone-200 bg-stone-50/50 p-2.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 text-[11.5px] text-stone-700 font-medium cursor-pointer select-none"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: sheetOn,
    onChange: e => setSheetOn(e.target.checked),
    className: "accent-teal-600 w-3.5 h-3.5"
  }), "M\xE9ret-alap\xFA \xE1tv\xE1lt\xE1s (t\xE1bla \u2192 m\xB2)"), sheetOn && /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    value: sheetW,
    onChange: e => setSheetW(e.target.value),
    placeholder: "Sz\xE9less\xE9g",
    className: "w-24 h-9 px-2 rounded-lg border border-stone-200 text-[12px] text-right font-mono outline-none focus:border-teal-500 bg-white"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-400"
  }, "\xD7"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    value: sheetL,
    onChange: e => setSheetL(e.target.value),
    placeholder: "Hossz",
    className: "w-24 h-9 px-2 rounded-lg border border-stone-200 text-[12px] text-right font-mono outline-none focus:border-teal-500 bg-white"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, "mm")), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-teal-600 mt-1.5"
  }, "1 t\xE1bla = ", /*#__PURE__*/React.createElement("b", null, sheetFactor ? +sheetFactor.toFixed(4) : 0, " m\xB2"), sheetFactor ? /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, " (", sheetW, "\xD7", sheetL, " mm)") : null), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 text-[11px] text-stone-600 mt-2 cursor-pointer select-none"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: sheetVar,
    onChange: e => setSheetVar(e.target.checked),
    className: "accent-amber-600 w-3.5 h-3.5"
  }), "V\xE1ltoz\xF3 m\xE9ret (pl. r\xE9tegelt lemez) \u2014 bev\xE9telez\xE9skor a t\xE9nyleges sz\xE9l\xD7hossz sz\xE1m\xEDt")))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500 block mb-1"
  }, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("input", {
    value: note,
    onChange: e => setNote(e.target.value),
    placeholder: "opcion\xE1lis",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-2"
  }, "Adj meg legal\xE1bb cikksz\xE1mot vagy megnevez\xE9st \u2014 ezekb\u0151l oldja fel a bev\xE9telez\xE9s az idegen t\xE9telt. T\xF6bb saj\xE1t sor ugyanarra a besz\xE1ll\xEDt\xF3i cikkre = sz\xE9tbont\xE1s; t\xF6bb besz\xE1ll\xEDt\xF3i cikk ugyanarra a saj\xE1t t\xE9telre = \xF6sszevon\xE1s (vegy\xE9l fel t\xF6bb sort)."), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-1.5 mt-2.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-9 px-3 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: save,
    disabled: !valid,
    className: `h-9 px-3.5 rounded-lg text-[12px] font-medium ${valid ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-400"}`
  }, map ? "Mentés" : "Hozzáadás")));
}
Object.assign(window, {
  SupplierMapPanel
});
})();
