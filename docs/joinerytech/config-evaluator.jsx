// ──────────────────────────────────────────────────────────────────────────
// config-evaluator.jsx — Konfiguráció-kiértékelő (ajánlat ItemBuilder belépő)
// Folyamat: kategória → stílus + műszaki → sablonok behúzása (db) → ÁR.
// Az árat a specs-engine.js (window.SpecEngine) számolja: anyag + vasalat +
// munkadíj, majd a stílus/műszaki ×/+ módosítók és a pontossági sáv (±%).
// Az eredmény soronként az ajánlatba kerül (onAdd).
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateCE, useMemo: useMemoCE } = React;

const ceFt = (n) => Math.round(n).toLocaleString("hu-HU") + " Ft";

function PickCard({ active, accent, onClick, title, sub, children }) {
  return (
    <button onClick={onClick}
      className={`text-left p-3 rounded-xl border-2 transition w-full ${active ? `${accent.solid.replace("bg-", "border-")} ${accent.chipBg}` : "border-stone-200 bg-white hover:border-stone-300"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12.5px] font-semibold text-stone-900 truncate">{title}</div>
        {active && <span className={`w-4 h-4 rounded grid place-items-center ${accent.solid} text-white shrink-0`}><Icon name="check" size={11} /></span>}
      </div>
      {sub && <div className="text-[10.5px] text-stone-500 mt-0.5 leading-snug">{sub}</div>}
      {children}
    </button>
  );
}

function ConfigEvaluator({ onClose, onAdd, editLine = null, onSave }) {
  const s = useSim();
  const editing = !!(editLine && editLine.config);
  const cats = (s.specCategories || []);
  const [catId, setCatId] = useStateCE(editing ? editLine.config.categoryId : (cats[0] ? cats[0].id : null));
  const [styleId, setStyleId] = useStateCE(editing ? editLine.config.styleId : null);
  const [techId, setTechId] = useStateCE(editing ? editLine.config.techId : null);
  const [picks, setPicks] = useStateCE(editing ? { [editLine.code]: Math.max(1, editLine.qty || 1) } : {}); // tplId -> qty
  const didInit = React.useRef(false);

  React.useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const cat = cats.find((c) => c.id === catId) || null;
  const styles = (s.styles || []).filter((x) => x.status === "active" && x.categoryId === catId);
  const techs = (s.techSpecs || []).filter((x) => x.status === "active" && x.categoryId === catId);
  const templates = (window.PARAM_TEMPLATES || []).filter((t) => t.categoryId === catId && (!editing || t.id === editLine.code));
  const style = styles.find((x) => x.id === styleId) || null;
  const tech = techs.find((x) => x.id === techId) || null;

  // when category changes, reset picks/style/tech to that category's defaults
  // (edit mode: the first mount keeps the line's seeded style/tech/qty)
  React.useEffect(() => {
    if (editing && !didInit.current) { didInit.current = true; return; }
    setStyleId(styles[0] ? styles[0].id : null);
    setTechId(techs[0] ? techs[0].id : null);
    setPicks({});
  }, [catId]);

  const pickList = useMemoCE(() => Object.entries(picks).filter(([, q]) => q > 0).map(([tplId, qty]) => ({ tplId, qty })), [picks]);

  const evalResult = useMemoCE(() => {
    if (!cat || pickList.length === 0) return null;
    return window.SpecEngine.evaluateConfig({ category: cat, style, tech, picks: pickList });
  }, [cat, style, tech, pickList]);

  const setQty = (tplId, qty) => setPicks((p) => ({ ...p, [tplId]: Math.max(0, qty) }));

  const addToQuote = () => {
    if (!evalResult) return;
    if (editing) {
      const r = evalResult.rows[0];
      const tpl = templates.find((t) => t.id === r.tplId);
      onSave({
        name: `${tpl.name} — ${style ? style.name : "alap"}${tech ? " / " + tech.name : ""}`,
        price: Math.round(r.unit), qty: r.qty,
        config: { categoryId: catId, styleId, techId, bandPct: r.bandPct },
      });
      onClose();
      return;
    }
    evalResult.rows.forEach((r) => {
      const tpl = templates.find((t) => t.id === r.tplId);
      onAdd({
        name: `${tpl.name} — ${style ? style.name : "alap"}${tech ? " / " + tech.name : ""}`,
        code: r.tplId, unit: "db", price: Math.round(r.unit), qty: r.qty, vat: 27,
        config: { categoryId: catId, styleId, techId, bandPct: r.bandPct },
      });
    });
    if (window.toast) window.toast(`✓ ${evalResult.rows.length} konfigurált tétel az ajánlatban`, "success");
    onClose();
  };

  const violet = window.SPEC_ACCENT.violet, teal = window.SPEC_ACCENT.teal, stone = window.SPEC_ACCENT.stone;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-stone-50" role="dialog" aria-modal="true">
      <header className="shrink-0 bg-white border-b border-stone-200">
        <div className="max-w-[1180px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100"><Icon name="chevron" size={17} className="rotate-180" /></button>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-stone-900 leading-tight">{editing ? "Konfiguráció módosítása" : "Konfiguráció kiértékelése"}</div>
            <div className="text-[10.5px] text-stone-500 leading-tight">{editing ? "Stílus + műszaki csere → ár újraszámítása" : "Stílus + műszaki + sablonok → becsült ár"}</div>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 max-w-[1180px] w-full mx-auto flex flex-col lg:grid lg:grid-cols-[1fr_400px]">
        {/* Left: selectors */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-5 space-y-6">
          {/* Category */}
          <section>
            <SectionTitle n="1" title="Kategória" sub={editing ? "A tételhez kötött kategória — szerkesztéskor nem változtatható." : "Mit szeretnél árazni? Ez szűri a stílust, műszakit és a sablonokat."} />
            <div className="flex flex-wrap gap-2">
              {(editing ? cats.filter((c) => c.id === catId) : cats).map((c) => {
                const ac = window.SPEC_ACCENT[c.color] || stone;
                const on = catId === c.id;
                return (
                  <button key={c.id} onClick={() => !editing && setCatId(c.id)} disabled={editing}
                    className={`h-10 px-3.5 rounded-xl border-2 text-[12.5px] font-medium inline-flex items-center gap-2 transition ${on ? `${ac.solid} border-transparent text-white` : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"} ${editing ? "cursor-default" : ""}`}>
                    <Icon name={editing ? "lock" : (c.icon || "box")} size={15} />{c.name}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Style + Tech */}
          <section className="grid md:grid-cols-2 gap-5">
            <div>
              <SectionTitle n="2" title="Stílus" sub="A látható kivitel — az anyag innen jön." dot={violet} />
              <div className="space-y-2">
                {styles.length === 0 && <Empty text="Nincs aktív stílus ehhez a kategóriához." />}
                {styles.map((x) => (
                  <PickCard key={x.id} active={styleId === x.id} accent={violet} onClick={() => setStyleId(styleId === x.id ? null : x.id)}
                    title={x.name} sub={styleSummary(cat, x)} />
                ))}
              </div>
            </div>
            <div>
              <SectionTitle n="3" title="Műszaki" sub="Gyártási előírások, vasalat-márka, tűrés." dot={teal} />
              <div className="space-y-2">
                {techs.length === 0 && <Empty text="Nincs aktív műszaki ehhez a kategóriához." />}
                {techs.map((x) => (
                  <PickCard key={x.id} active={techId === x.id} accent={teal} onClick={() => setTechId(techId === x.id ? null : x.id)}
                    title={x.name} sub={techSummary(cat, x)} />
                ))}
              </div>
            </div>
          </section>

          {/* Templates */}
          <section>
            <SectionTitle n="4" title="Sablonok" sub={editing ? "A tételhez kötött sablon — a darabszám módosítható, a stílus + műszaki újraszámol." : "Húzd be a sablonokat, amiket értékesíteni szeretnél — a stílus + műszaki alkalmazkodik rájuk."} />
            <div className="grid sm:grid-cols-2 gap-2">
              {templates.length === 0 && <Empty text="Nincs ehhez a kategóriához rendelt sablon." />}
              {templates.map((t) => {
                const qty = picks[t.id] || 0;
                const on = qty > 0;
                return (
                  <div key={t.id} className={`p-3 rounded-xl border-2 transition ${on ? "border-stone-800 bg-white" : "border-stone-200 bg-white"}`}>
                    <div className="flex items-center gap-2.5">
                      <span className="shrink-0"><TemplateThumb kind={t.thumb} size={40} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold text-stone-900 truncate">{t.name}</div>
                        <div className="text-[10.5px] text-stone-500">{(t.hardware || []).length} vasalat · {t.laborHours}ó · {t.deliveryDays} nap</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                      <Stepper qty={qty} onChange={(v) => setQty(t.id, v)} />
                      {evalResult && on && (
                        <span className="text-[12px] font-semibold text-stone-900 tabular-nums">{ceFt((evalResult.rows.find((r) => r.tplId === t.id) || {}).unit || 0)}/db</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right: price summary */}
        <ResultPane result={evalResult} cat={cat} style={style} tech={tech} templates={templates}
          onAdd={addToQuote} label={editing ? "Újraszámolt ár mentése" : null} oldPrice={editing ? editLine.price : null} />
      </div>
    </div>
  );
}

function SectionTitle({ n, title, sub, dot }) {
  return (
    <div className="mb-2.5">
      <div className="flex items-center gap-2">
        <span className={`w-5 h-5 rounded-md grid place-items-center text-[10px] font-bold text-white ${dot ? dot.solid : "bg-stone-800"}`}>{n}</span>
        <span className="text-[13px] font-semibold text-stone-900">{title}</span>
      </div>
      {sub && <div className="text-[11px] text-stone-500 mt-0.5 ml-7 leading-snug">{sub}</div>}
    </div>
  );
}
function Empty({ text }) { return <div className="text-[11.5px] text-stone-400 italic py-2 px-1">{text}</div>; }

function Stepper({ qty, onChange }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-stone-200 overflow-hidden">
      <button onClick={() => onChange(qty - 1)} className="w-8 h-8 grid place-items-center text-stone-500 hover:bg-stone-50"><Icon name="minus" size={13} /></button>
      <span className="w-9 text-center text-[12.5px] font-semibold tabular-nums">{qty}</span>
      <button onClick={() => onChange(qty + 1)} className="w-8 h-8 grid place-items-center text-stone-500 hover:bg-stone-50"><Icon name="plus" size={13} /></button>
    </div>
  );
}

function styleSummary(cat, st) {
  const fields = (cat.styleFields || []).filter((f) => f.kind !== "material");
  return fields.map((f) => st.values && st.values[f.key]).filter(Boolean).slice(0, 3).map(String).join(" · ") || "—";
}
function techSummary(cat, ms) {
  const out = [];
  (cat.techFields || []).forEach((f) => {
    const v = ms.values && ms.values[f.key];
    if (v == null || v === "") return;
    if (f.role === "precision" && window.PRECISION_BANDS[v]) out.push(window.PRECISION_BANDS[v].label);
    else if (f.kind === "bool") { if (v) out.push(f.label); }
    else out.push(String(v));
  });
  return out.slice(0, 3).join(" · ") || "—";
}

// Price breakdown pane
function ResultPane({ result, cat, style, tech, templates, onAdd, label, oldPrice }) {
  const body = !result ? (
    <div className="flex-1 grid place-items-center px-6 text-center">
      <div>
        <div className="w-12 h-12 rounded-xl bg-stone-100 grid place-items-center mx-auto mb-3 text-stone-400"><Icon name="layers" size={22} /></div>
        <div className="text-[12.5px] text-stone-500">Válassz kategóriát, stílust és műszakit,<br />majd húzz be legalább egy sablont.</div>
      </div>
    </div>
  ) : (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {/* Estimate */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Becsült ár (nettó)</div>
        <div className="text-[30px] font-semibold tracking-tight text-stone-900 mt-1 tabular-nums leading-none">{ceFt(result.net)}</div>
        <div className="text-[11.5px] text-stone-500 mt-1.5">Sáv: {ceFt(result.low)} – {ceFt(result.high)} <span className="text-stone-400">(±{result.bandPct}%)</span></div>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-100 text-[11px] text-stone-500">
          <span className="inline-flex items-center gap-1"><Icon name="factory" size={13} className="text-stone-400" />{result.laborHours.toFixed(1)} munkaóra</span>
          <span className="inline-flex items-center gap-1"><Icon name="orders" size={13} className="text-stone-400" />{result.deliveryDays} nap szállítás</span>
        </div>
      </div>

      {/* Per-template breakdown */}
      <div className="space-y-2">
        {result.rows.map((r) => (
          <div key={r.tplId} className="rounded-xl border border-stone-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12px] font-semibold text-stone-900 truncate">{r.name} <span className="text-stone-400 font-normal">× {r.qty}</span></div>
              <div className="text-[12.5px] font-semibold tabular-nums shrink-0">{ceFt(r.lineTotal)}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2 text-[10.5px] text-stone-500">
              <Row label="Anyag" v={r.materialCost} />
              <Row label="Vasalat" v={r.hardwareCost} />
              <Row label="Munkadíj" v={r.laborCost} />
              <Row label="Stílus mód." v={r.styleAdd} signed />
              <Row label="Műszaki mód." v={r.techAdd} signed />
              <Row label="Egységár" v={r.unit} bold />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10.5px] text-stone-400 leading-snug px-1">A szorzók mindig az alapra hatnak (alap×(szorzó−1)+felár), nem kumulatívan. A pontosság (tűrés) ár-szorzóként és a becslés ±%-os sávjaként is érvényesül.</p>
    </div>
  );

  return (
    <div className="lg:border-l border-stone-200 bg-white flex flex-col min-h-0 lg:max-h-none">
      {body}
      <div className="shrink-0 border-t border-stone-200 p-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
        {result && oldPrice != null && (
          <div className="flex items-center justify-between mb-2 text-[11.5px]">
            <span className="text-stone-400">Korábbi → új</span>
            <span className="flex items-center gap-1.5">
              <span className="text-stone-400 line-through tabular-nums">{ceFt(oldPrice)}</span>
              {(() => { const d = result.net - oldPrice; return <span className={`font-semibold tabular-nums ${d > 0 ? "text-rose-600" : d < 0 ? "text-teal-600" : "text-stone-400"}`}>{d > 0 ? "+" : ""}{ceFt(d)}</span>; })()}
            </span>
          </div>
        )}
        <button onClick={onAdd} disabled={!result}
          className={`w-full h-11 rounded-xl text-[13px] font-semibold inline-flex items-center justify-center gap-2 ${result ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-stone-200 text-stone-400 cursor-not-allowed"}`}>
          <Icon name="check" size={16} />{label || (result ? `Ajánlatba (${ceFt(result.net)})` : "Ajánlatba")}
        </button>
      </div>
    </div>
  );
}
function Row({ label, v, signed, bold }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-stone-900 font-semibold col-span-2 pt-1 mt-0.5 border-t border-stone-100" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{signed && v > 0 ? "+" : ""}{ceFt(v)}</span>
    </div>
  );
}

window.ConfigEvaluator = ConfigEvaluator;
