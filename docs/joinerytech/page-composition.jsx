// ──────────────────────────────────────────────────────────────────────────
// page-composition.jsx — Összeállítás / Bútorsor (falnézet) — Belsőépítészet
//
//   Egy fal bútorsorát szerkeszti: konfigurált elemek (szekrény/ajtó/falpanel)
//   egy ELEVATION (falnézet) nézeten. Folyamatos hozzáadás a modell-palettáról,
//   drag-átrendezés, kattintás + Shift/Ctrl TÖBBES kijelölés, és a kijelöltekre
//   TÖMEGES szerkesztés (kivitel-csere + magasság/mélység egységesítés). Az ár
//   és a falnézet-szín a SpecEngine-ből + a stílusból számolódik — a bulk
//   stílus-csere automatikusan újraáraz és átszínez.
//
//   <CompositionsPage />          // Belsőépítészet → Bútorsor screen (lista)
//   <CompositionEditor id />      // fullscreen falnézet-szerkesztő
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateCo, useMemo: useMemoCo, useRef: useRefCo, useEffect: useEffectCo } = React;

const coHuf = (n) => Math.round(n).toLocaleString("hu-HU") + " Ft";
const WALL_PX = 360; // a falnézet konténer magassága px-ben

// elem geometria-helperek (a vars geometria-only; az anyag a stílusból)
function coItemW(it) { return (it.vars && it.vars.width) || 600; }
function coItemH(it) { return (it.vars && it.vars.height) || (it.mount === "wall" ? 700 : 720); }
function coItemD(it) { return (it.vars && it.vars.depth) || 560; }
// elem szín a stílus LÁTHATÓ felületéből (front, ha van; különben az első material/korpusz)
function coColor(it, styles, cats) {
  const style = (styles || []).find((x) => x.id === it.styleId);
  const cat = (cats || []).find((c) => c.id === it.categoryId);
  const matFields = ((cat && cat.styleFields) || []).filter((ff) => ff.kind === "material");
  const f = matFields.find((ff) => ff.slot === "front") || matFields[0];
  const code = (f && style && style.values) ? style.values[f.key] : null;
  return code ? window.sim.materialInfo(code).color : "#cbb88e";
}
function coDims(tpl, vars) {
  const g = (k) => vars[k];
  const out = [];
  ["width", "height", "depth"].forEach((k) => { if (g(k) != null && (tpl.vars || []).some((v) => v.key === k)) out.push(g(k)); });
  return out.length ? out.join(" × ") + " mm" : "";
}

// ──────────────────────────────────────────────────────────────────────────
// CompositionsPage — Belsőépítészet → Bútorsor screen (lista + belépő)
// ──────────────────────────────────────────────────────────────────────────
function CompositionsPage() {
  const s = useSim();
  const comps = s.compositionList ? s.compositionList() : (s.compositions || []);
  const [editId, setEditId] = useStateCo(null);
  const [filter, setFilter] = useStateCo("all");

  const counts = useMemoCo(() => {
    const c = { piszkozat: 0, veglegesitett: 0, ajanlatban: 0, elvetve: 0 };
    comps.forEach((x) => { c[x.status] = (c[x.status] || 0) + 1; });
    return c;
  }, [comps]);
  const shown = filter === "all" ? comps : comps.filter((c) => c.status === filter);

  const create = () => { const id = window.sim.addComposition({}); setEditId(id); };

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-6">
      {editId && <CompositionEditor id={editId} onClose={() => setEditId(null)} />}

      <div className="rounded-2xl border border-rose-300 bg-gradient-to-br from-rose-600 to-rose-500 p-5 md:p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <span className="w-12 h-12 rounded-2xl bg-white/15 grid place-items-center shrink-0"><Icon name="layers" size={24} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-semibold tracking-tight">Bútorsor / Összeállítás</div>
            <div className="text-[12px] text-rose-50/90 leading-snug mt-0.5 max-w-xl">Állítson össze egy teljes bútorsort egy falnézeten — szekrényt szekrény után. Jelöljön ki több elemet (Shift/Ctrl), és módosítsa a kivitelüket egyszerre. A kész sor elemenként ajánlatba kerül.</div>
          </div>
          <button onClick={create} className="self-start md:self-auto h-10 px-5 rounded-lg bg-white text-rose-700 text-[13px] font-semibold hover:bg-rose-50 inline-flex items-center gap-2 shrink-0"><Icon name="plus" size={15} />Új összeállítás</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {window.COMPO_ORDER.map((st) => {
          const tone = window.COMPO_STATUS[st];
          return (
            <button key={st} onClick={() => setFilter(filter === st ? "all" : st)}
              className={`text-left rounded-xl border bg-white p-4 transition ${filter === st ? "border-rose-300 ring-1 ring-rose-200" : "border-stone-200 hover:border-stone-300"}`}>
              <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${tone.dot}`} /><span className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">{tone.label}</span></div>
              <div className="text-[26px] font-semibold tabular-nums text-stone-900 mt-1">{counts[st] || 0}</div>
            </button>
          );
        })}
      </div>

      <div>
        <div className="text-[13px] font-semibold text-stone-900 mb-3">Összeállítások {filter !== "all" && <button onClick={() => setFilter("all")} className="ml-1.5 text-[11px] font-normal text-rose-700 hover:underline">· összes</button>}</div>
        {shown.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 p-6 text-center text-[12px] text-stone-500">Nincs összeállítás ebben a nézetben. Indíts egy újat a fenti gombbal.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {shown.map((c) => <CompoCard key={c.id} c={c} onOpen={() => setEditId(c.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function CompoCard({ c, onOpen }) {
  const s = useSim();
  const tone = window.COMPO_STATUS[c.status] || window.COMPO_STATUS.piszkozat;
  const t = window.CompoEngine.totals(c);
  const styles = s.styles || [], cats = s.specCategories || [];
  return (
    <button onClick={onOpen} className="text-left rounded-2xl border border-stone-200 bg-white p-4 hover:border-rose-300 hover:shadow-sm transition">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-stone-900 truncate">{c.name}</div>
          <div className="text-[11px] text-stone-500">{c.id} · {c.room} · {t.count} elem · fal {(c.wallWidth / 1000).toFixed(1)}×{(c.wallHeight / 1000).toFixed(1)} m</div>
        </div>
        <span className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] font-medium ${tone.bg} ${tone.fg} shrink-0`}><span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{tone.label}</span>
      </div>
      {/* mini elevation strip */}
      <div className="rounded-lg border border-stone-100 bg-stone-50/60 h-16 flex items-end gap-0.5 px-1.5 py-1 overflow-hidden">
        {c.items.length === 0 ? <span className="text-[10.5px] text-stone-400 m-auto">Üres — kattints a szerkesztéshez</span> :
          c.items.slice(0, 12).map((it) => (
            <div key={it.uid} title={it.tplName} style={{ background: coColor(it, styles, cats), height: `${Math.min(100, coItemH(it) / c.wallHeight * 100 * 2.4)}%`, flex: `0 0 ${Math.max(5, coItemW(it) / c.wallWidth * 100)}%` }}
              className={`rounded-sm border ${it.mount === "wall" ? "border-stone-300/70 self-start" : "border-stone-400/50"}`} />
          ))}
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[11px] text-stone-400">{c.quoteRef ? <span className="text-emerald-600 font-mono">→ {c.quoteRef}</span> : `${t.count} elem · ${(t.runW / 1000).toFixed(2)} fm`}</span>
        <span className="text-[14px] font-semibold text-stone-900 tabular-nums">{coHuf(t.net)}</span>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// CompositionEditor — fullscreen falnézet-szerkesztő
// ──────────────────────────────────────────────────────────────────────────
function CompositionEditor({ id, onClose }) {
  const s = useSim();
  const comp = (s.compositions || []).find((c) => c.id === id);
  const cats = s.specCategories || [];
  const styles = (s.styles || []).filter((x) => x.status === "active");
  const techs = (s.techSpecs || []).filter((x) => x.status === "active");
  const [sel, setSel] = useStateCo([]);             // kijelölt uid-ek
  const [addMount, setAddMount] = useStateCo("floor"); // a következő hozzáadott elem mount-ja
  const [paletteCat, setPaletteCat] = useStateCo(cats[0] ? cats[0].id : null);
  const [custOpen, setCustOpen] = useStateCo(false);
  const [cust, setCust] = useStateCo("");
  const [done, setDone] = useStateCo(null);
  const dragUid = useRefCo(null);

  useEffectCo(() => { const p = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = p; }; }, []);
  if (!comp) return null;

  const tone = window.COMPO_STATUS[comp.status] || window.COMPO_STATUS.piszkozat;
  const totals = window.CompoEngine.totals(comp);
  const items = comp.items || [];
  const selItems = items.filter((it) => sel.includes(it.uid));
  const editable = comp.status === "piszkozat" || comp.status === "veglegesitett";

  const toggleSelect = (uid, additive) => {
    setSel((prev) => {
      if (additive) return prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid];
      return (prev.length === 1 && prev[0] === uid) ? [] : [uid];
    });
  };

  const addModel = (tpl) => {
    const cat = cats.find((c) => c.id === tpl.categoryId);
    const st = styles.filter((x) => x.categoryId === tpl.categoryId)[0];
    const tc = techs.filter((x) => x.categoryId === tpl.categoryId)[0];
    const vars = {};
    (tpl.vars || []).forEach((v) => { if (v.kind !== "material") vars[v.key] = v.default; });
    if (addMount === "wall" && vars.height == null) vars.height = 700;
    const uid = window.sim.addCompoItem(id, {
      categoryId: tpl.categoryId, catName: cat ? cat.name : "", tplId: tpl.id, tplName: tpl.name, thumb: tpl.thumb,
      mount: addMount, qty: 1, vars, dims: coDims(tpl, vars),
      styleId: st ? st.id : null, styleName: st ? st.name : "", techId: tc ? tc.id : null, techName: tc ? tc.name : "",
    });
    setSel([uid]);
  };

  const onDrop = (targetUid) => { if (dragUid.current && dragUid.current !== targetUid) window.sim.reorderCompoItem(id, dragUid.current, targetUid); dragUid.current = null; };
  const makeQuote = () => {
    if (!cust.trim()) { setCustOpen(true); return; }
    // ha van már szerkeszthető (draft) ajánlat az ügyfélhez, ajánljuk fel a hozzáfűzést
    const S = window.sim.getState();
    const draft = (S.quotes || []).find((q) => q.status === "draft" && q.customer === cust.trim());
    if (draft && window.askNextStep) {
      window.askNextStep({
        title: "Bútorsor — hová kerüljön?",
        text: `Van már vázlat-ajánlat (${draft.id}) ehhez az ügyfélhez. A bútorsor tételei abba is beírhatók, vagy külön ajánlatként.`,
        options: [
          { label: `Hozzáadás a meglévő ajánlathoz (${draft.id})`, icon: "file", primary: true, hint: "A bútorsor elemei a meglévő ajánlat tételei közé kerülnek", onClick: () => { const q = window.sim.compositionToQuote(id, { customer: cust, targetQuoteId: draft.id }); if (q) setDone(q); } },
          { label: "Külön ajánlat létrehozása", icon: "plus", hint: "Önálló ajánlat a bútorsorról", onClick: () => { const q = window.sim.compositionToQuote(id, { customer: cust }); if (q) setDone(q); } },
        ],
      });
      return;
    }
    const qid = window.sim.compositionToQuote(id, { customer: cust });
    if (qid) setDone(qid);
  };

  const wallItems = items.filter((it) => it.mount === "wall");
  const floorItems = items.filter((it) => it.mount === "floor");
  const scaleY = WALL_PX / comp.wallHeight;
  const tooWide = totals.runW > comp.wallWidth;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-stone-50" role="dialog" aria-modal="true">
      {/* Header */}
      <header className="shrink-0 bg-white border-b border-stone-200">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100" aria-label="Bezárás"><Icon name="x" size={17} /></button>
          <span className="w-8 h-8 rounded-lg bg-rose-600 text-white grid place-items-center shrink-0"><Icon name="layers" size={16} /></span>
          <div className="min-w-0 flex-1">
            <input defaultValue={comp.name} onBlur={(e) => window.sim.updateComposition(id, { name: e.target.value.trim() || comp.name })} disabled={!editable}
              className="w-full text-[14px] font-semibold text-stone-900 leading-tight bg-transparent outline-none focus:bg-stone-50 rounded px-1 -ml-1 disabled:opacity-100" />
            <div className="text-[10.5px] text-stone-500 leading-tight px-1 -ml-1">{comp.id} · {comp.room}</div>
          </div>
          <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[10.5px] font-medium ${tone.bg} ${tone.fg}`}><span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{tone.label}</span>
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-[9.5px] uppercase tracking-wide text-stone-400 font-medium">Összesen</span>
            <span className="text-[14px] font-semibold text-stone-900 tabular-nums">{coHuf(totals.net)}</span>
          </div>
        </div>
      </header>

      {/* Body: elevation (left) + side panel (right) */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-5 grid grid-cols-12 gap-4">
          {/* Elevation canvas */}
          <div className="col-span-12 lg:col-span-8 space-y-3">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="text-[12px] font-semibold text-stone-900">Falnézet <span className="font-normal text-stone-400">· {(comp.wallWidth / 1000).toFixed(1)} × {(comp.wallHeight / 1000).toFixed(1)} m fal</span></div>
                <div className="flex items-center gap-3">
                  {items.length > 0 && <button onClick={() => setSel(sel.length === items.length ? [] : items.map((it) => it.uid))} className="text-[11px] font-medium text-rose-700 hover:underline">{sel.length === items.length ? "Kijelölés törlése" : "Mind kijelöl"}</button>}
                  <span className="text-[10.5px] text-stone-400">{totals.count} elem · {(totals.runW / 1000).toFixed(2)} fm</span>
                </div>
              </div>

              {/* the wall */}
              <div className="relative rounded-xl border border-stone-200 overflow-hidden" style={{ height: WALL_PX, background: "linear-gradient(to bottom,#f5f3f0,#efe9e2 70%,#e7ded2)" }}
                onClick={(e) => { if (e.target === e.currentTarget) setSel([]); }}>
                {/* upper (wall-mount) band */}
                <div className="absolute top-2 left-0 right-0 flex items-start gap-[2px] px-2 overflow-x-auto" style={{ minHeight: 10 }}>
                  {wallItems.map((it) => <ElevationItem key={it.uid} it={it} scaleY={scaleY} wallWidth={comp.wallWidth} selected={sel.includes(it.uid)} color={coColor(it, styles, cats)} editable={editable}
                    onSelect={(e) => { e.stopPropagation(); toggleSelect(it.uid, e.shiftKey || e.metaKey || e.ctrlKey); }}
                    onDragStart={() => { dragUid.current = it.uid; }} onDrop={(e) => { e.stopPropagation(); onDrop(it.uid); }} />)}
                </div>
                {/* floor line */}
                <div className="absolute left-0 right-0 border-t-2 border-stone-400/50" style={{ bottom: 18 }} />
                {/* lower (floor-mount) band */}
                <div className="absolute left-0 right-0 flex items-end gap-[2px] px-2 overflow-x-auto" style={{ bottom: 18 }}>
                  {floorItems.map((it) => <ElevationItem key={it.uid} it={it} scaleY={scaleY} wallWidth={comp.wallWidth} selected={sel.includes(it.uid)} color={coColor(it, styles, cats)} editable={editable}
                    onSelect={(e) => { e.stopPropagation(); toggleSelect(it.uid, e.shiftKey || e.metaKey || e.ctrlKey); }}
                    onDragStart={() => { dragUid.current = it.uid; }} onDrop={(e) => { e.stopPropagation(); onDrop(it.uid); }} />)}
                </div>
                {items.length === 0 && <div className="absolute inset-0 grid place-items-center text-[12px] text-stone-400">Adj hozzá elemeket a jobb oldali palettáról →</div>}
              </div>
              {tooWide && <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700"><Icon name="alert" size={12} />A bútorsor ({(totals.runW / 1000).toFixed(2)} fm) szélesebb a falnál ({(comp.wallWidth / 1000).toFixed(2)} m).</div>}
              <div className="mt-2 flex items-center gap-3 text-[10.5px] text-stone-400">
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-stone-400/50 bg-stone-200" />Alsó</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-stone-300/70 bg-stone-200 self-start" />Felső</span>
                <span>· kattints a kijelöléshez · Shift/Ctrl többes · húzd az átrendezéshez</span>
              </div>
            </Card>
          </div>

          {/* Right panel: bulk-edit (if selection) OR palette */}
          <div className="col-span-12 lg:col-span-4 space-y-3">
            {sel.length > 0 ? (
              <BulkPanel comp={comp} selItems={selItems} sel={sel} styles={styles} cats={cats} editable={editable} onClear={() => setSel([])} />
            ) : (
              <PalettePanel cats={cats} paletteCat={paletteCat} setPaletteCat={setPaletteCat} addMount={addMount} setAddMount={setAddMount} onAdd={addModel} editable={editable} comp={comp} onMeta={(patch) => window.sim.updateComposition(id, patch)} />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 bg-white border-t border-stone-200" style={{ paddingBottom: "max(env(safe-area-inset-bottom),0px)" }}>
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-3 flex items-center gap-3 flex-wrap">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-stone-200 text-[12.5px] font-medium text-stone-700 hover:bg-stone-50">Kész</button>
          <div className="hidden sm:flex flex-col leading-tight ml-1">
            <span className="text-[9.5px] uppercase tracking-wide text-stone-400 font-medium">Összesen ({totals.count} elem)</span>
            <span className="text-[14px] font-semibold text-stone-900 tabular-nums">{coHuf(totals.net)}</span>
          </div>
          <span className="flex-1" />
          {comp.status === "piszkozat" && <button onClick={() => window.sim.setCompositionStatus(id, "veglegesitett")} disabled={!items.length} className="h-10 px-4 rounded-lg bg-stone-800 text-white text-[12.5px] font-semibold hover:bg-stone-900 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5"><Icon name="check" size={14} />Véglegesítés</button>}
          {comp.status === "veglegesitett" && <button onClick={() => window.sim.setCompositionStatus(id, "piszkozat")} className="h-10 px-4 rounded-lg border border-stone-200 text-[12.5px] font-medium text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1.5"><Icon name="rotate" size={13} />Vissza piszkozatba</button>}
          {comp.status !== "ajanlatban" && <button onClick={makeQuote} disabled={!items.length} className="h-10 px-5 rounded-lg bg-rose-600 text-white text-[12.5px] font-semibold hover:bg-rose-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-2"><Icon name="briefcase" size={15} />Ajánlatba</button>}
          {comp.status === "ajanlatban" && comp.quoteRef && <span className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-emerald-50 text-emerald-700 text-[12px] font-medium font-mono">→ {comp.quoteRef}</span>}
        </div>
      </div>

      {/* customer prompt */}
      {custOpen && (
        <div className="fixed inset-0 z-[72] grid place-items-center bg-stone-900/40 p-4" onClick={() => setCustOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-[14px] font-semibold text-stone-900 mb-1">Ajánlat — ügyfél</div>
            <div className="text-[11.5px] text-stone-500 mb-3">{totals.count} elem külön tételsorként kerül az ajánlatba.</div>
            <input value={cust} onChange={(e) => setCust(e.target.value)} placeholder="Ügyfél neve" list="co-cust" className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-rose-400" />
            <datalist id="co-cust">{((window.sim.getState().customers) || []).map((c) => <option key={c.id} value={c.name} />)}</datalist>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setCustOpen(false)} className="h-9 px-4 rounded-lg border border-stone-200 text-[12px] font-medium text-stone-600 hover:bg-stone-50">Mégse</button>
              <button onClick={makeQuote} disabled={!cust.trim()} className="h-9 px-4 rounded-lg bg-rose-600 text-white text-[12px] font-semibold disabled:bg-stone-200 disabled:text-stone-400">Ajánlat készítése</button>
            </div>
          </div>
        </div>
      )}

      {done && (
        <div className="fixed inset-0 z-[72] grid place-items-center bg-stone-900/40 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 grid place-items-center mx-auto mb-3"><Icon name="check" size={26} /></div>
            <div className="text-[16px] font-semibold text-stone-900">Ajánlat létrehozva</div>
            <div className="text-[12px] text-stone-500 mt-1">{comp.name} — {totals.count} tétel</div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-[11.5px] font-mono">{done}</div>
            <div className="text-[11px] text-stone-400 mt-3">Az ajánlat Vázlat státuszban jött létre, az Értékesítés → Ajánlatok alatt folytatható.</div>
            <button onClick={onClose} className="mt-5 h-9 px-5 rounded-lg bg-stone-900 text-white text-[12px] font-medium hover:bg-stone-800">Bezárás</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── One element on the elevation ────────────────────────────────────────────
function ElevationItem({ it, scaleY, wallWidth, selected, color, editable, onSelect, onDragStart, onDrop }) {
  const w = coItemW(it), h = coItemH(it);
  const pxH = Math.max(16, h * scaleY);
  const widthPct = Math.max(3, (w / wallWidth) * 100);
  const drawers = (it.vars && it.vars.drawers) || 0;
  const shelves = (it.vars && it.vars.shelves) || 0;
  return (
    <div draggable={editable} onDragStart={onDragStart} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} onClick={onSelect}
      title={`${it.tplName} · ${it.dims}`}
      style={{ flex: `0 0 ${widthPct}%`, height: pxH, background: color, cursor: editable ? "pointer" : "default" }}
      className={`relative rounded-[3px] border transition ${selected ? "ring-2 ring-rose-500 ring-offset-1 border-rose-500 z-10" : "border-stone-600/30 hover:border-stone-700/50"}`}>
      {/* fronts: drawers / shelves hint */}
      {drawers > 0 && <div className="absolute inset-[3px] flex flex-col gap-[2px]">{Array.from({ length: Math.min(4, drawers) }).map((_, i) => <div key={i} className="flex-1 rounded-[1px] border border-black/10 bg-white/10" />)}</div>}
      {drawers === 0 && shelves > 0 && <div className="absolute inset-[3px] flex flex-col justify-between">{Array.from({ length: Math.min(5, shelves) }).map((_, i) => <div key={i} className="h-px bg-black/15" />)}</div>}
      {drawers === 0 && shelves === 0 && <div className="absolute inset-[3px] rounded-[1px] border border-black/10 bg-white/5" />}
      {/* selected check */}
      {selected && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white grid place-items-center z-20"><Icon name="check" size={10} /></span>}
      {/* width label on wider items */}
      {widthPct > 8 && <span className="absolute bottom-0.5 left-0 right-0 text-center text-[8.5px] font-mono text-black/45 leading-none">{w}</span>}
    </div>
  );
}

// ── Bulk-edit panel (1+ selected) ───────────────────────────────────────────
function BulkPanel({ comp, selItems, sel, styles, cats, editable, onClear }) {
  const id = comp.id;
  const [h, setH] = useStateCo("");
  const [d, setD] = useStateCo("");
  // distinct categories among selection → which styles are offerable
  const selCatIds = Array.from(new Set(selItems.map((it) => it.categoryId)));
  const offerStyles = styles.filter((x) => selCatIds.includes(x.categoryId));
  const stylesByCat = {};
  offerStyles.forEach((x) => { (stylesByCat[x.categoryId] = stylesByCat[x.categoryId] || []).push(x); });

  const applyStyle = (style) => {
    const uids = selItems.filter((it) => it.categoryId === style.categoryId).map((it) => it.uid);
    window.sim.updateCompoItems(id, uids, { styleId: style.id, styleName: style.name });
  };
  const applyDims = () => {
    const patch = {};
    if (h && Number(h) > 0) patch.height = Number(h);
    if (d && Number(d) > 0) patch.depth = Number(d);
    if (!Object.keys(patch).length) return;
    window.sim.updateCompoItems(id, sel, { vars: patch });
    setH(""); setD("");
  };
  const applyMount = (mount) => window.sim.updateCompoItems(id, sel, { mount });
  const setQty = (uid, qty) => window.sim.updateCompoItems(id, [uid], { qty: Math.max(1, qty) });
  const remove = () => { sel.forEach((uid) => window.sim.removeCompoItem(id, uid)); onClear(); };

  const bulkNet = selItems.reduce((n, it) => n + (it.unitPrice || 0) * (it.qty || 1), 0);

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12.5px] font-semibold text-stone-900">{sel.length} elem kijelölve</div>
          <button onClick={onClear} className="text-[11px] text-stone-500 hover:text-stone-800 inline-flex items-center gap-1"><Icon name="x" size={12} />Mégse</button>
        </div>
        <div className="rounded-lg bg-stone-50 p-2.5 flex items-center justify-between text-[11.5px] mb-3">
          <span className="text-stone-500">Kijelölt elemek értéke</span><span className="font-semibold text-stone-900 tabular-nums">{coHuf(bulkNet)}</span>
        </div>

        {editable && (
          <>
            {/* Kivitel csere — TÖMEGES */}
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Kivitel cseréje (egyszerre)</div>
              {offerStyles.length === 0 && <div className="text-[11px] text-stone-400 italic">Nincs választható kivitel.</div>}
              <div className="space-y-1.5">
                {Object.entries(stylesByCat).map(([catId, list]) => {
                  const cat = cats.find((c) => c.id === catId);
                  return (
                    <div key={catId}>
                      {selCatIds.length > 1 && <div className="text-[10px] text-stone-400 mb-1">{cat ? cat.name : ""}</div>}
                      <div className="flex flex-wrap gap-1.5">
                        {list.map((st) => {
                          const f = ((cat && cat.styleFields) || []).find((ff) => ff.kind === "material");
                          const code = f && st.values ? st.values[f.key] : null;
                          const col = code ? window.sim.materialInfo(code).color : "#cbb88e";
                          const allOn = selItems.filter((it) => it.categoryId === catId).every((it) => it.styleId === st.id);
                          return (
                            <button key={st.id} onClick={() => applyStyle(st)} title={st.name}
                              className={`h-9 pl-1 pr-2.5 rounded-lg border-2 inline-flex items-center gap-1.5 text-[11px] font-medium transition ${allOn ? "border-rose-500 bg-rose-50/50 text-stone-900" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`}>
                              <span className="w-6 h-6 rounded-md border border-stone-300" style={{ background: col }} />
                              <span className="truncate max-w-[120px]">{st.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Magasság / mélység egységesítés — TÖMEGES */}
            <div className="mb-3 pt-3 border-t border-stone-100">
              <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Méret egységesítése (mm)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1">Magasság</label>
                  <input value={h} onChange={(e) => setH(e.target.value)} type="number" placeholder="—" className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-rose-400" />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1">Mélység</label>
                  <input value={d} onChange={(e) => setD(e.target.value)} type="number" placeholder="—" className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-rose-400" />
                </div>
              </div>
              <button onClick={applyDims} disabled={!h && !d} className="w-full mt-2 h-9 rounded-lg bg-stone-800 text-white text-[12px] font-medium hover:bg-stone-900 disabled:bg-stone-200 disabled:text-stone-400">Egységesítés a kijelöltekre</button>
            </div>

            {/* Sor (mount) + törlés */}
            <div className="pt-3 border-t border-stone-100 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-stone-500 font-medium">Sor:</span>
              {window.MOUNT_ORDER.map((m) => (
                <button key={m} onClick={() => applyMount(m)} className="h-8 px-2.5 rounded-lg border border-stone-200 text-[11.5px] font-medium text-stone-600 hover:border-rose-300 hover:text-rose-600">{window.MOUNT_META[m].label}</button>
              ))}
              <span className="flex-1" />
              <button onClick={remove} className="h-8 px-2.5 rounded-lg border border-stone-200 text-[11.5px] font-medium text-stone-500 hover:bg-rose-50 hover:text-rose-600 inline-flex items-center gap-1"><Icon name="x" size={12} />Törlés</button>
            </div>
          </>
        )}
      </Card>

      {/* per-item rows */}
      <Card className="p-3">
        <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-2 px-1">Kijelölt elemek</div>
        <div className="space-y-1">
          {selItems.map((it) => (
            <div key={it.uid} className="flex items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-stone-50">
              <span className="w-7 h-7 rounded-md border border-stone-200 shrink-0" style={{ background: coColor(it, styles, cats) }} />
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] font-medium text-stone-900 truncate">{it.tplName}</div>
                <div className="text-[10px] text-stone-500 truncate">{(window.MOUNT_META[it.mount] || {}).label} · {it.dims} · {coHuf(it.unitPrice || 0)}</div>
              </div>
              {editable && (
                <div className="inline-flex items-center rounded-md border border-stone-200 shrink-0">
                  <button onClick={() => setQty(it.uid, (it.qty || 1) - 1)} className="w-6 h-7 grid place-items-center text-stone-500 hover:bg-stone-50"><Icon name="minus" size={11} /></button>
                  <span className="w-6 text-center text-[11px] font-semibold tabular-nums">{it.qty || 1}</span>
                  <button onClick={() => setQty(it.uid, (it.qty || 1) + 1)} className="w-6 h-7 grid place-items-center text-stone-500 hover:bg-stone-50"><Icon name="plus" size={11} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

// ── Model palette (no selection) ────────────────────────────────────────────
function PalettePanel({ cats, paletteCat, setPaletteCat, addMount, setAddMount, onAdd, editable, comp, onMeta }) {
  const templates = (window.PARAM_TEMPLATES || []).filter((t) => t.id !== "T-04" && t.categoryId === paletteCat);
  return (
    <>
      {/* wall meta */}
      <Card className="p-4">
        <div className="text-[12px] font-semibold text-stone-900 mb-3">Fal méretei</div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-[10px] text-stone-400 block mb-1">Szélesség (mm)</label>
            <input defaultValue={comp.wallWidth} type="number" disabled={!editable} onBlur={(e) => onMeta({ wallWidth: Math.max(600, Number(e.target.value) || comp.wallWidth) })} className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="text-[10px] text-stone-400 block mb-1">Magasság (mm)</label>
            <input defaultValue={comp.wallHeight} type="number" disabled={!editable} onBlur={(e) => onMeta({ wallHeight: Math.max(1000, Number(e.target.value) || comp.wallHeight) })} className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-rose-400" />
          </div>
        </div>
        <label className="text-[10px] text-stone-400 block mb-1">Helyiség</label>
        <input defaultValue={comp.room} disabled={!editable} onBlur={(e) => onMeta({ room: e.target.value.trim() || comp.room })} className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400" />
      </Card>

      {editable && (
        <Card className="p-4">
          <div className="text-[12px] font-semibold text-stone-900 mb-1">Elem hozzáadása</div>
          <div className="text-[11px] text-stone-500 mb-3">Válassz sort és kategóriát, majd kattints egy modellre — bekerül a falnézetre.</div>
          {/* mount toggle */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[10px] uppercase tracking-wide text-stone-500 font-medium">Sor:</span>
            <div className="inline-flex p-0.5 bg-stone-100 rounded-lg">
              {window.MOUNT_ORDER.map((m) => (
                <button key={m} onClick={() => setAddMount(m)} className={`px-2.5 h-7 text-[11px] rounded-md font-medium ${addMount === m ? "bg-white shadow-sm text-stone-900" : "text-stone-500"}`}>{window.MOUNT_META[m].label}</button>
              ))}
            </div>
          </div>
          {/* category filter */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {cats.map((c) => (
              <button key={c.id} onClick={() => setPaletteCat(c.id)} className={`h-7 px-2.5 rounded-lg text-[11px] font-medium border inline-flex items-center gap-1 transition ${paletteCat === c.id ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"}`}><Icon name={c.icon || "box"} size={11} />{c.name}</button>
            ))}
          </div>
          {/* model cards */}
          <div className="space-y-1.5">
            {templates.length === 0 && <div className="text-[11px] text-stone-400 italic">Nincs modell ebben a kategóriában.</div>}
            {templates.map((t) => (
              <button key={t.id} onClick={() => onAdd(t)} className="w-full text-left p-2.5 rounded-xl border border-stone-200 bg-white hover:border-rose-300 hover:bg-rose-50/30 transition flex items-center gap-2.5">
                {window.TemplateThumb ? <TemplateThumb kind={t.thumb} size={38} /> : <span className="w-9 h-9 rounded bg-stone-100" />}
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-stone-900 truncate">{t.name}</div>
                  <div className="text-[10px] text-stone-500">{(t.vars || []).filter((v) => v.kind !== "material").length} méret-paraméter</div>
                </div>
                <span className="w-7 h-7 rounded-lg bg-rose-600 text-white grid place-items-center shrink-0"><Icon name="plus" size={14} /></span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 flex items-start gap-2 text-[11px] text-stone-500">
        <Icon name="info" size={14} className="mt-0.5 shrink-0 text-rose-400" />
        <span>Kattints egy elemre a falnézeten a kijelöléshez. Shift/Ctrl-lal többet is — a kivitelük egyszerre módosítható.</span>
      </div>
    </>
  );
}

window.CompositionsPage = CompositionsPage;
window.CompositionEditor = CompositionEditor;
