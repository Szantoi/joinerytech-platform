// ─────────────────────────────────────────────────────────────────
// Beszállítói cikk-megfeleltetés — a külső beszállító SAJÁT cikkszáma +
// megnevezése ↔ a MI katalógus tételünk.
//   • Beállítások → Beszállítói cikkek: a teljes megfeleltetési tábla (CRUD).
//   • A beszerzés a rendeléskor rögzíti (learnSupplierMap), a raktár a
//     bevételezéskor ebből oldja fel az idegen megnevezést (resolveSupplierItem).
// Store: supplierMap[], add/update/remove/learnSupplierMap, resolveSupplierItem,
//        supplierRefFor, supplierMapBySupplier.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateSM, useMemo: useMemoSM } = React;

// Katalógus tétel rövid címkéje.
function smCatLabel(it) { return it ? `${it.name} · ${it.code}` : "— ismeretlen tétel —"; }

// ════════════════════════════════════════════════════════════════
// BEÁLLÍTÁSOK → BESZÁLLÍTÓI CIKKEK (megfeleltetési tábla)
// ════════════════════════════════════════════════════════════════
function SupplierMapPanel() {
  const sim = window.useSim();
  const maps = sim.supplierMap || [];
  const catalog = (sim.catalog || []).filter((x) => x.active !== false);
  const catById = useMemoSM(() => Object.fromEntries(catalog.map((c) => [c.id, c])), [catalog]);
  const suppliers = useMemoSM(() => {
    const fromMap = maps.map((m) => m.supplierName);
    const fromCat = catalog.flatMap((c) => (c.suppliers || []).map((s) => s.name)).concat(catalog.map((c) => c.supplier));
    return Array.from(new Set([...fromMap, ...fromCat].filter(Boolean))).sort((a, b) => a.localeCompare(b, "hu"));
  }, [maps, catalog]);

  const [q, setQ] = useStateSM("");
  const [supFilter, setSupFilter] = useStateSM("");
  const [adding, setAdding] = useStateSM(false);
  const [editId, setEditId] = useStateSM(null);

  const filtered = useMemoSM(() => {
    const needle = q.trim().toLowerCase();
    return maps.filter((m) => {
      if (supFilter && m.supplierName !== supFilter) return false;
      if (!needle) return true;
      const cat = catById[m.catalogItemId];
      return [m.supplierSku, m.supplierLabel, m.supplierName, cat?.name, cat?.code]
        .filter(Boolean).some((s) => s.toLowerCase().includes(needle));
    });
  }, [maps, q, supFilter, catById]);

  const grouped = useMemoSM(() => {
    const g = {};
    filtered.forEach((m) => { (g[m.supplierName] = g[m.supplierName] || []).push(m); });
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0], "hu"));
  }, [filtered]);

  // Hány katalógus tételhez nincs még megfeleltetés egyetlen beszállítónál sem?
  const unmappedCount = useMemoSM(() => {
    const mapped = new Set(maps.map((m) => m.catalogItemId));
    return catalog.filter((c) => c.worldExt?.warehouse && !mapped.has(c.id)).length;
  }, [maps, catalog]);

  return (
    <div className="max-w-[1100px]">
      <div className="mb-5">
        <div className="text-[13px] font-semibold text-stone-900 mb-1">Beszállítói cikk-megfeleltetés</div>
        <p className="text-[12px] text-stone-500 max-w-[680px]">
          A külső beszállító <b>saját cikkszáma és megnevezése</b> ritkán egyezik a miénkkel. Itt rögzíted, melyik
          idegen tétel melyik <b>saját katalógus tételünknek</b> felel meg — így a beszerzés a rendelést a beszállító
          nyelvén adja fel, a raktár pedig a szállítólevélen/számlán szereplő idegen megnevezést automatikusan a
          saját tételünkre oldja fel a bevételezéskor.
        </p>
      </div>

      {/* Eszközsor */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés cikkszámra, megnevezésre…"
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white" />
        </div>
        <select value={supFilter} onChange={(e) => setSupFilter(e.target.value)} className="h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500">
          <option value="">Minden beszállító</option>
          {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <PrimaryBtn icon="plus" onClick={() => { setAdding(true); setEditId(null); }}>Új megfeleltetés</PrimaryBtn>
      </div>

      {unmappedCount > 0 && (
        <div className="mb-3 flex items-center gap-2 text-[11.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Icon name="alert" size={14} className="shrink-0" />
          <span><b>{unmappedCount}</b> raktározott katalógus tételhez nincs még beszállítói megfeleltetés — ezeket a bevételezéskor kézzel kell párosítani.</span>
        </div>
      )}

      {adding && <SupplierMapForm catalog={catalog} suppliers={suppliers} onClose={() => setAdding(false)} />}

      <SupplierOrderKit />

      {grouped.length === 0 && !adding && (
        <Card className="px-5 py-10 text-center text-[12.5px] text-stone-400">Nincs találat. Vegyél fel egy megfeleltetést a fenti gombbal.</Card>
      )}

      <div className="space-y-5">
        {grouped.map(([supplier, rows]) => (
          <div key={supplier}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium">{supplier}</div>
              <div className="text-[10.5px] text-stone-400">{rows.length} tétel</div>
            </div>
            <Card className="p-0 overflow-hidden">
              {/* fejléc — csak asztali */}
              <div className="hidden md:grid grid-cols-[1.2fr_1.6fr_24px_1.6fr_72px] gap-3 px-4 py-2 bg-stone-50/70 border-b border-stone-100 text-[10px] uppercase tracking-wide text-stone-400 font-medium">
                <div>Beszállító cikkszáma</div>
                <div>Beszállító megnevezése</div>
                <div></div>
                <div>Saját katalógus tétel</div>
                <div className="text-right">Művelet</div>
              </div>
              {rows.map((m) => (
                editId === m.id
                  ? <div key={m.id} className="px-4 py-3 border-b border-stone-100 last:border-0">
                      <SupplierMapForm inline map={m} catalog={catalog} suppliers={suppliers} onClose={() => setEditId(null)} />
                    </div>
                  : <SupplierMapRow key={m.id} m={m} catById={catById} onEdit={() => setEditId(m.id)} onRemove={() => window.sim.removeSupplierMap(m.id)} />
              ))}
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

// Szett-rendelés — a szorzó VISSZAFELÉ: „kell N konténer → mennyi komponenst rendeljek?"
// A többszörös cél-tételű (kit) megfeleltetésekből bontja ki a komponens-szükségletet,
// és Draft beszerzési igényeket hoz létre, amik a normál beszerzési láncba kerülnek.
function SupplierOrderKit() {
  const sim = window.useSim();
  const kits = sim.supplierKits ? sim.supplierKits() : [];
  const assemblies = (sim.catalog || []).filter((c) => c.active !== false && Array.isArray(c.bom) && c.bom.length > 0);
  const options = [
    ...assemblies.map((a) => ({ type: "assembly", id: a.id, label: `${a.name} (${a.code})`, group: "Katalógus-összeállítás" })),
    ...kits.map((k) => ({ type: "kit", id: k.id, label: `${k.supplierName} — ${k.supplierLabel}`, group: "Beszállítói szett" })),
  ];
  const [open, setOpen] = useStateSM(false);
  const [selKey, setSelKey] = useStateSM(options[0] ? options[0].type + ":" + options[0].id : "");
  const [qty, setQty] = useStateSM("1");
  const [onlyShort, setOnlyShort] = useStateSM(true);
  if (!options.length) return null;

  const sel = options.find((o) => o.type + ":" + o.id === selKey) || options[0];
  const n = Math.max(0, Number(qty) || 0);
  const rawLines = sel.type === "kit" ? window.sim.orderKitLines(sel.id, n) : window.sim.explodeBom(sel.id, n);
  const freeOf = (cid) => { const it = (sim.catalog || []).find((c) => c.id === cid); const wh = it && it.worldExt && it.worldExt.warehouse; return wh ? (wh.available != null ? wh.available : (wh.onHand || 0)) : 0; };
  const lines = rawLines.map((l) => { const free = freeOf(l.catalogItemId); return { ...l, perUnit: n > 0 ? l.qty / n : 0, free, short: Math.max(0, l.qty - free) }; });
  const totalCost = lines.reduce((s, l) => s + (l.price || 0) * l.qty, 0);
  const shortCount = lines.filter((l) => l.short > 0).length;
  const supLabel = sel.type === "kit" ? ((kits.find((k) => k.id === sel.id) || {}).supplierName) : "komponensenkénti szállító";

  const supplierFor = (cid) => {
    if (sel.type === "kit") return (kits.find((k) => k.id === sel.id) || {}).supplierName || "Egyéb (nincs szállító)";
    const it = (sim.catalog || []).find((c) => c.id === cid);
    return (it && it.supplier) || (it && it.suppliers && it.suppliers[0] && it.suppliers[0].name) || "Egyéb (nincs szállító)";
  };
  const createReqs = () => {
    const src = lines.map((l) => ({ ...l, orderQty: onlyShort ? l.short : l.qty })).filter((l) => l.orderQty > 0);
    if (!src.length) { if (window.toast) window.toast("Nincs rendelendő mennyiség", "info"); return; }
    const rows = src.map((l, i) => ({
      id: "PR-2426-B" + Date.now().toString().slice(-5) + i,
      material: l.name, matCode: l.code, qty: l.orderQty, unit: l.unit,
      preferredSupplier: supplierFor(l.catalogItemId), requester: "Beszerző", date: "2026-06-07",
      status: "Draft", note: `${sel.label} × ${n}${onlyShort ? " (hiánypótlás)" : ""}`, estUnit: l.price || 0,
    }));
    window.sim.addRequisitions(rows);
    if (window.toast) window.toast(`✓ ${rows.length} igény létrehozva (Draft) — lásd Igénylések`, "success");
  };

  return (
    <Card className="p-0 overflow-hidden mb-4 border-teal-200">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-teal-50/40">
        <div className="w-8 h-8 rounded-lg bg-teal-50 grid place-items-center text-teal-600 shrink-0"><Icon name="procurement" size={16} /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-stone-900">Összeállítás / szett rendelés — komponens-szükséglet</div>
          <div className="text-[11px] text-stone-500">„Kell N szekrény / szerelvény-szett → mennyi komponenst rendeljek?" — a BOM/szorzó visszafelé, készletfedezettel.</div>
        </div>
        <Icon name={open ? "up" : "down"} size={16} className="text-stone-400 shrink-0" />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-stone-100">
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] text-stone-500 block mb-1">Összeállítás / szett</label>
              <select value={selKey} onChange={(e) => setSelKey(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500">
                {["Katalógus-összeállítás", "Beszállítói szett"].map((grp) => {
                  const og = options.filter((o) => o.group === grp);
                  if (!og.length) return null;
                  return <optgroup key={grp} label={grp}>{og.map((o) => <option key={o.type + ":" + o.id} value={o.type + ":" + o.id}>{o.label}</option>)}</optgroup>;
                })}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-stone-500 block mb-1">Darab</label>
              <div className="flex items-center gap-1">
                <button onClick={() => setQty(String(Math.max(0, n - 1)))} className="w-9 h-9 rounded-lg border border-stone-200 grid place-items-center text-stone-500 hover:bg-stone-50"><Icon name="minus" size={14} /></button>
                <input value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))} className="w-14 h-9 text-center rounded-lg border border-stone-200 text-[13px] font-mono outline-none focus:border-teal-500" />
                <button onClick={() => setQty(String(n + 1))} className="w-9 h-9 rounded-lg border border-stone-200 grid place-items-center text-stone-500 hover:bg-stone-50"><Icon name="plus" size={14} /></button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 overflow-hidden">
            <div className="grid grid-cols-[1.6fr_auto_auto_auto] gap-3 px-3 py-2 bg-stone-50/70 text-[10px] uppercase tracking-wide text-stone-400 font-medium">
              <div>Komponens</div>
              <div className="text-right">1 egységben</div>
              <div className="text-right">Szükséglet</div>
              <div className="text-right">Szabad / hiány</div>
            </div>
            {lines.map((l) => (
              <div key={l.catalogItemId} className="grid grid-cols-[1.6fr_auto_auto_auto] gap-3 px-3 py-2.5 border-t border-stone-100 items-center">
                <div className="min-w-0">
                  <div className="text-[12.5px] text-stone-900 font-medium truncate">{l.name}</div>
                  <div className="text-[10.5px] font-mono text-stone-400">{l.code}</div>
                </div>
                <div className="text-right text-[11.5px] text-stone-500 font-mono whitespace-nowrap">×{(+l.perUnit.toFixed(3))} {l.unit}</div>
                <div className="text-right text-[13px] text-stone-900 font-mono font-semibold whitespace-nowrap">{(+l.qty.toFixed(3))} {l.unit}</div>
                <div className="text-right whitespace-nowrap">
                  {l.short > 0
                    ? <span className="text-[11.5px] font-medium text-rose-600">{(+l.free.toFixed(2))} · −{(+l.short.toFixed(2))}</span>
                    : <span className="text-[11.5px] font-medium text-emerald-600">{(+l.free.toFixed(2))} ✓</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
            <label className="inline-flex items-center gap-2 text-[11.5px] text-stone-600 select-none cursor-pointer">
              <input type="checkbox" checked={onlyShort} onChange={(e) => setOnlyShort(e.target.checked)} className="accent-teal-600 w-3.5 h-3.5" />
              Csak a hiányt rendeljem ({shortCount} tétel)
            </label>
            <div className="flex items-center gap-2">
              {sel.type === "assembly" && (
                <button onClick={() => window.sim.buildAssembly(sel.id, n)} disabled={n <= 0 || shortCount > 0}
                  title={shortCount > 0 ? "Előbb pótold a hiányzó komponenseket" : "Komponensek fogyasztása + késztermék készletre"}
                  className={`h-9 px-3.5 rounded-lg text-[12px] font-medium border ${n > 0 && shortCount === 0 ? "border-stone-300 text-stone-700 hover:bg-stone-50" : "border-stone-200 text-stone-300"}`}>Gyártás készletre</button>
              )}
              <button onClick={createReqs} disabled={n <= 0} className={`h-9 px-3.5 rounded-lg text-[12px] font-medium ${n > 0 ? "bg-teal-700 text-white hover:bg-teal-800" : "bg-stone-200 text-stone-400"}`}>Igények létrehozása</button>
            </div>
          </div>
          <div className="text-[10.5px] text-stone-400 mt-1.5">{n} × <b>{sel.label}</b> · becsült anyagérték <span className="font-mono text-stone-600">{totalCost.toLocaleString("hu-HU")} Ft</span> · szállító: {supLabel}.{sel.type === "assembly" ? " A Gyártás készletre gomb a komponensek fogyasztásával készterméket vesz a raktárba." : " A komponensek Draft igényként jönnek létre, szállítónkénti PO-bontással."}</div>
        </div>
      )}
    </Card>
  );
}

function SupplierMapRow({ m, catById, onEdit, onRemove }) {
  const targets = window.sim.supplierMapTargets(m);
  const multi = targets.length > 1;
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1.6fr_24px_1.6fr_72px] gap-1 md:gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0 md:items-center">
      <div className="font-mono text-[12px] text-stone-800">
        {m.supplierSku || <span className="text-stone-300">—</span>}
        {m.supplierUnit && <span className="ml-1.5 font-sans text-[10px] text-stone-400">/ {m.supplierUnit}</span>}
      </div>
      <div className="text-[12.5px] text-stone-700">
        {m.supplierLabel || <span className="text-stone-300">—</span>}
        {m.note && <div className="text-[10.5px] text-stone-400">{m.note}</div>}
      </div>
      <div className="hidden md:grid place-items-center text-stone-300"><Icon name="arrow-right" size={14} /></div>
      <div className="text-[12.5px]">
        {multi
          ? <div className="space-y-0.5">
              <div className="text-[10px] uppercase tracking-wide text-teal-600 font-medium">{targets.length} tételre bontva</div>
              {targets.map((t, i) => {
                const c = catById[t.catalogItemId];
                const cl = c ? (c.variantOf ? ((catById[c.variantOf] || {}).name || c.name) + " · " + (window.sim.variantLabel(c) || "") : c.name) : null;
                return <div key={i} className="flex items-center gap-1.5">
                  <span className="text-[10.5px] font-mono text-stone-400 w-8 text-right">×{t.factor}</span>
                  {c ? <><span className="text-stone-900 font-medium">{cl}</span><span className="font-mono text-[10.5px] text-stone-400">{c.code}</span></> : <span className="text-rose-500">törölt</span>}
                </div>;
              })}
            </div>
          : (() => { const c = catById[targets[0]?.catalogItemId]; const f = targets[0] ? targets[0].factor : 1;
              const cl = c ? (c.variantOf ? ((catById[c.variantOf] || {}).name || c.name) + " · " + (window.sim.variantLabel(c) || "") : c.name) : null;
              return c
                ? <span className="inline-flex flex-wrap items-center gap-1.5"><span className="text-stone-900 font-medium">{cl}</span><span className="font-mono text-[10.5px] text-stone-400">{c.code}</span>{f !== 1 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 font-mono">1 {m.supplierUnit || "egys."} = ×{f} {c.unit}</span>}</span>
                : <span className="text-rose-500">törölt tétel</span>; })()}
      </div>
      <div className="flex items-center gap-1 md:justify-end mt-1 md:mt-0">
        <button onClick={onEdit} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-stone-100 text-stone-400" title="Szerkesztés"><Icon name="settings" size={14} /></button>
        <button onClick={onRemove} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-500" title="Törlés"><Icon name="x" size={14} /></button>
      </div>
    </div>
  );
}

function SupplierMapForm({ map, catalog, suppliers, onClose, inline }) {
  const [supplierName, setSupplierName] = useStateSM(map?.supplierName || (suppliers[0] || ""));
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
  const [targets, setTargets] = useStateSM(initTargets.length ? initTargets : [{ catalogItemId: "", factor: 1 }]);
  const split = targets.length > 1;

  const items = useMemoSM(() => catalog.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", "hu")), [catalog]);
  const itemById = useMemoSM(() => Object.fromEntries(items.map((c) => [c.id, c])), [items]);
  // Variáns-aware célválasztó: a variáns-fő-tétel NEM választható közvetlenül (a
  // készlet a variánson van), helyette a variánsok jelennek meg a fő-tétel alá
  // csoportosítva, variáns-címkével (pl. „Blum Antaro · 450 mm · barna").
  const pickGroups = useMemoSM(() => {
    const groups = []; const byKey = {};
    const push = (gkey, opt) => { if (!byKey[gkey]) { byKey[gkey] = { key: gkey, opts: [] }; groups.push(byKey[gkey]); } byKey[gkey].opts.push(opt); };
    items.forEach((c) => {
      const isParent = Array.isArray(c.variantAxes) && c.variantAxes.length;
      if (isParent) return; // absztrakt fő-tétel kihagyva
      if (c.variantOf) {
        const p = itemById[c.variantOf] || catById[c.variantOf];
        const pname = p ? p.name : c.name;
        push("◆ " + pname, { id: c.id, label: (window.sim.variantLabel(c) || c.name) + " · " + c.code });
      } else {
        push(c.cat || "Tételek", { id: c.id, label: c.name + " (" + c.code + ")" });
      }
    });
    return groups;
  }, [items, itemById, catById]);
  const catItemLabel = (c) => !c ? "" : (c.variantOf ? ((itemById[c.variantOf] || catById[c.variantOf] || {}).name || c.name) + " · " + (window.sim.variantLabel(c) || "") : c.name);
  const setT = (i, patch) => setTargets((ts) => ts.map((t, j) => j === i ? { ...t, ...patch } : t));
  const addT = () => setTargets((ts) => [...ts, { catalogItemId: "", factor: 1 }]);
  const rmT = (i) => setTargets((ts) => ts.length > 1 ? ts.filter((_, j) => j !== i) : ts);

  const validTargets = targets.filter((t) => t.catalogItemId);
  const valid = supplierName.trim() && validTargets.length > 0 && (supplierSku.trim() || supplierLabel.trim());
  const supUnitLabel = supplierUnit.trim() || "beszállítói egység";
  const sheetFactor = (Number(sheetW) > 0 && Number(sheetL) > 0) ? (Number(sheetW) * Number(sheetL) / 1e6) : 0;
  const sheetActive = sheetOn && !split;

  const save = () => {
    const eff = validTargets.map((t) => ({ catalogItemId: t.catalogItemId, factor: Number(t.factor) > 0 ? Number(t.factor) : 1 }));
    if (sheetActive && eff[0] && sheetFactor > 0) eff[0].factor = +sheetFactor.toFixed(4);
    const data = { supplierName, supplierSku, supplierLabel,
      supplierUnit: sheetActive && !supplierUnit.trim() ? "tábla" : supplierUnit,
      sheet: (sheetActive && sheetFactor > 0) ? { w: Number(sheetW), l: Number(sheetL), variable: sheetVar } : null,
      note, targets: eff };
    if (map) window.sim.updateSupplierMap(map.id, data);
    else window.sim.addSupplierMap(data);
    onClose();
  };

  return (
    <div className={inline ? "w-full" : "rounded-xl border border-teal-200 bg-teal-50/30 p-3.5 mb-3"}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div>
          <label className="text-[10px] text-stone-500 block mb-1">Beszállító *</label>
          <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} list="sm-suppliers" placeholder="pl. Egger Faipari Kft."
            className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white" />
          <datalist id="sm-suppliers">{suppliers.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div>
          <label className="text-[10px] text-stone-500 block mb-1">Beszállító cikkszáma</label>
          <input value={supplierSku} onChange={(e) => setSupplierSku(e.target.value)} placeholder="pl. W980 ST2 16"
            className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500 bg-white" />
        </div>
        <div>
          <label className="text-[10px] text-stone-500 block mb-1">Beszállító mértékegysége</label>
          <input value={supplierUnit} onChange={(e) => setSupplierUnit(e.target.value)} list="sm-units" placeholder="pl. tábla, tekercs, doboz, pár"
            className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white" />
          <datalist id="sm-units">{["tábla", "tekercs", "doboz", "pár", "csomag", "raklap", "szett", "db", "m²", "fm"].map((u) => <option key={u} value={u} />)}</datalist>
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] text-stone-500 block mb-1">Beszállító megnevezése</label>
          <input value={supplierLabel} onChange={(e) => setSupplierLabel(e.target.value)} placeholder="ahogy a szállítólevélen szerepel"
            className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white" />
        </div>
      </div>

      {/* Cél-tétel(ek) + átváltás — 1:1/N:1 → egy cél (a szorzó lehet mértékegység-
          átváltás, pl. 1 tábla = 5,796 m²); 1:N → több cél szorzóval. */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] text-stone-500">Saját katalógus tétel{split ? "ek (szétbontás)" : ""} + átváltás *</label>
          <span className="text-[10px] text-teal-600">×szorzó = hány saját egység jön 1 {supUnitLabel}-ből</span>
        </div>
        <div className="space-y-1.5">
          {targets.map((t, i) => {
            const c = itemById[t.catalogItemId];
            return (
              <div key={i} className="flex items-center gap-1.5">
                <select value={t.catalogItemId} onChange={(e) => setT(i, { catalogItemId: e.target.value })} className="flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500">
                  <option value="">— válassz tételt —</option>
                  {pickGroups.map((g) => <optgroup key={g.key} label={g.key}>{g.opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</optgroup>)}
                </select>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] text-stone-400">×</span>
                  <input type="number" min="0" step="any" value={t.factor} onChange={(e) => setT(i, { factor: e.target.value })}
                    className="w-16 h-9 px-2 rounded-lg border border-stone-200 text-[12px] text-right font-mono outline-none focus:border-teal-500 bg-white" disabled={sheetActive} />
                  <span className="text-[10.5px] text-stone-400 w-7">{c ? c.unit : ""}</span>
                </div>
                {targets.length > 1 && <button onClick={() => rmT(i)} className="shrink-0 w-8 h-8 grid place-items-center rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-500"><Icon name="x" size={13} /></button>}
              </div>
            );
          })}
        </div>
        <button onClick={addT} className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-teal-700 font-medium hover:text-teal-800">
          <Icon name="plus" size={13} />{split ? "További cél-tétel" : "Szétbontás több tételre"}
        </button>
        {split
          ? <div className="text-[10.5px] text-stone-400 mt-1">Pl. 1 szettből 1 fiókcsúszó (×1) + 2 csukópánt (×2). A bevételezésnél a sor automatikusan felbontható.</div>
          : (itemById[targets[0]?.catalogItemId] && Number(targets[0]?.factor) !== 1)
            ? <div className="text-[10.5px] text-teal-600 mt-1">Mértékegység-átváltás: <b>1 {supUnitLabel} = {(+Number(targets[0].factor) || 0)} {itemById[targets[0].catalogItemId].unit}</b>. Bevételezéskor a beszállítói mennyiséget ennyivel szorozza.</div>
            : <div className="text-[10.5px] text-stone-400 mt-1">Ha a beszállító más egységben tartja nyilván (pl. <b>tábla</b>), mint mi (pl. <b>m²</b>), állítsd a ×szorzót az átváltásra (1 tábla = 5,796 m²).</div>}

        {/* Méret-alapú átváltás (tábla → m²) — a tábla mérete nem mindig szabványos */}
        {!split && (
          <div className="mt-2.5 rounded-lg border border-stone-200 bg-stone-50/50 p-2.5">
            <label className="flex items-center gap-2 text-[11.5px] text-stone-700 font-medium cursor-pointer select-none">
              <input type="checkbox" checked={sheetOn} onChange={(e) => setSheetOn(e.target.checked)} className="accent-teal-600 w-3.5 h-3.5" />
              Méret-alapú átváltás (tábla → m²)
            </label>
            {sheetOn && (
              <div className="mt-2">
                <div className="flex items-center gap-1.5">
                  <input type="number" min="0" value={sheetW} onChange={(e) => setSheetW(e.target.value)} placeholder="Szélesség"
                    className="w-24 h-9 px-2 rounded-lg border border-stone-200 text-[12px] text-right font-mono outline-none focus:border-teal-500 bg-white" />
                  <span className="text-[12px] text-stone-400">×</span>
                  <input type="number" min="0" value={sheetL} onChange={(e) => setSheetL(e.target.value)} placeholder="Hossz"
                    className="w-24 h-9 px-2 rounded-lg border border-stone-200 text-[12px] text-right font-mono outline-none focus:border-teal-500 bg-white" />
                  <span className="text-[11px] text-stone-400">mm</span>
                </div>
                <div className="text-[10.5px] text-teal-600 mt-1.5">1 tábla = <b>{sheetFactor ? +sheetFactor.toFixed(4) : 0} m²</b>{sheetFactor ? <span className="text-stone-400"> ({sheetW}×{sheetL} mm)</span> : null}</div>
                <label className="flex items-center gap-2 text-[11px] text-stone-600 mt-2 cursor-pointer select-none">
                  <input type="checkbox" checked={sheetVar} onChange={(e) => setSheetVar(e.target.checked)} className="accent-amber-600 w-3.5 h-3.5" />
                  Változó méret (pl. rétegelt lemez) — bevételezéskor a tényleges szél×hossz számít
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3">
        <label className="text-[10px] text-stone-500 block mb-1">Megjegyzés</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="opcionális"
          className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white" />
      </div>

      <div className="text-[10.5px] text-stone-400 mt-2">Adj meg legalább cikkszámot vagy megnevezést — ezekből oldja fel a bevételezés az idegen tételt. Több saját sor ugyanarra a beszállítói cikkre = szétbontás; több beszállítói cikk ugyanarra a saját tételre = összevonás (vegyél fel több sort).</div>
      <div className="flex justify-end gap-1.5 mt-2.5">
        <button onClick={onClose} className="h-9 px-3 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100">Mégse</button>
        <button onClick={save} disabled={!valid} className={`h-9 px-3.5 rounded-lg text-[12px] font-medium ${valid ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-400"}`}>{map ? "Mentés" : "Hozzáadás"}</button>
      </div>
    </div>
  );
}

Object.assign(window, { SupplierMapPanel });
