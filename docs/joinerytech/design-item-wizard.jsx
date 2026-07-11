// ──────────────────────────────────────────────────────────────────────────
// design-item-wizard.jsx — "Tervezett bútor" intake for the quote builder.
//
//   Connects the Tervezés (Design) world into the Sales / quote flow. A quote
//   line can be an EGYEDI (one-off, from scratch) or KATALÓGUS (started from a
//   parametric template / finished product) designed furniture piece.
//
//   The Designes folyamat (design process) is the spine:
//       Igényfelmérés → Stílustervezés → Elrendezés → Műszaki → Gyártás
//   For a QUOTE only Igény + Stílus are required (rough estimate). Elrendezés,
//   Műszaki ("ha bizonytalan / határeset") and Gyártás ("ha saját gyártás" →
//   anyag / vasalat / megmunkálás) are OPTIONAL depth toggles that narrow the
//   price-estimate confidence band.
//
//   Bidirectional catalog: catalog items seed a design; finished designs can be
//   saved back to the catalog (window.sim.saveDesignToCatalog).
//
//   <DesignItemWizard onClose onAdd={(line) => …} />            // context="quote"
//   <DesignItemWizard context="design" onClose />                 // start design → quote
//   line = { name, code:"TERV", unit:"db", price, qty, vat, custom:true, design:{…} }
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateDW, useMemo: useMemoDW } = React;

const dwHuf = (n) => Math.round(n).toLocaleString("hu-HU") + " Ft";
const dwClamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const dwRound = (n, step) => Math.round(n / step) * step;

// Finished-surface price proxy (Ft / m²) — drives the rough estimate
const DW_MAT_RATE = {
  "EG-3303-18": 22000, "EG-1133-18": 24000, "EG-3327-18": 26000, "MDF-019": 16000,
  "EG-3327-19": 38000, "EG-3303-19": 34000, "TL-040": 72000, "BK-040": 58000,
  "HDF-003": 6000, "MDF-006": 9000,
};

const DW_ROOMS = ["Konyha", "Nappali", "Háló", "Fürdő", "Gardrób", "Előszoba", "Iroda", "Egyéb"];
const DW_STYLES = [
  { k: "modern",   l: "Modern",     mult: 1.0,  note: "Síkfront, rejtett fogantyú" },
  { k: "skandi",   l: "Skandináv",  mult: 1.05, note: "Világos tónus, fa hangsúly" },
  { k: "minimal",  l: "Minimal",    mult: 1.1,  note: "Letisztult, fogantyú nélkül" },
  { k: "loft",     l: "Loft / ipari", mult: 1.12, note: "Fém + fa kombináció" },
  { k: "rusztikus",l: "Rusztikus",  mult: 1.2,  note: "Tömör fa, látszó erezet" },
  { k: "klasszikus",l: "Klasszikus", mult: 1.35, note: "Marással, profilozott front" },
];

// material lists from the design catalog
const DW_ALL_MATS = () => Object.entries(window.CATALOG_LOOKUP || {}).map(([code, m]) => ({ code, ...m }));
const DW_CORPUS = () => DW_ALL_MATS().filter((m) => m.kind === "korpusz" || m.kind === "tömör");
const DW_FRONT  = () => DW_ALL_MATS().filter((m) => m.kind === "front" || m.kind === "tömör");
const dwMatName = (code) => (window.CATALOG_LOOKUP || {})[code]?.name || code;
const dwMatColor = (code) => (window.CATALOG_LOOKUP || {})[code]?.color || "#cbb88e";

const DW_STEPS = ["Típus", "Igény", "Stílus", "Mélység", "Ár"];

// Gyártásmód — a tervezhető bútornál EZ dönti el, hogy házon belül gyártjuk
// (saját gyártás → gyártási alprojekt + műhely-folyamat), vagy külső gyártótól
// rendeljük (rendelhető egyedi → beszerzési igény / megrendelés).
const DW_SOURCING = [
  { k: "own",        l: "Saját gyártás",            icon: "factory",  desc: "Házon belül gyártjuk. Megrendeléskor gyártási alprojekt és műhely-folyamat indítható." },
  { k: "outsourced", l: "Rendelhető (külső gyártó)", icon: "box",      desc: "Külső gyártótól rendeljük. Megrendeléskor beszerzési igény / megrendelés készül." },
];

// The full design process — two locked (required for a quote) + three optional
const DW_PHASES = [
  { k: "needs",  l: "Igényfelmérés",   icon: "user",   locked: true,  desc: "Funkció, méret, elvárások rögzítése." },
  { k: "style",  l: "Stílustervezés",  icon: "drop",   locked: true,  desc: "Stílusirány és felhasználható anyagok." },
  { k: "layout", l: "Elrendezés",      icon: "layers", fee: 0,     desc: "Modulok, belső kiosztás, funkciók pontosítása." },
  { k: "technical", l: "Műszaki tervezés", icon: "ruler", fee: 0,  desc: "Akkor kell, ha bizonytalan megoldás vagy határeset — a műszaki feltételek tisztázása." },
  { k: "manufacturing", l: "Gyártástervezés", icon: "cpu", fee: 0, desc: "Akkor kell, ha saját gyártás — anyag, vasalat és megmunkálás meghatározása." },
];

function dwTplDims(t) {
  const g = (k) => { const v = (t.vars || []).find((x) => x.key === k); return v ? v.default : null; };
  return { w: g("width") || 800, h: g("height") || 1800, d: g("depth") || 400 };
}

// ──────────────────────────────────────────────────────────────────────────
function DesignItemWizard({ context = "quote", onClose, onAdd, initial = null }) {
  const isDesign = context === "design";
  const editMode = !!(initial && initial.design);
  const _d = editMode ? initial.design : null;
  const [step, setStep] = useStateDW(0);
  const [category, setCategory] = useStateDW(_d ? (_d.category || "egyedi") : "egyedi");      // egyedi | katalogus
  const [sourcing, setSourcing] = useStateDW(_d ? (_d.sourcing || "own") : "own");          // own | outsourced
  const [elemCategory, setElemCategory] = useStateDW(_d ? (_d.elemCategory || (window.MAKER_CATEGORIES || [])[0] || "") : ((window.MAKER_CATEGORIES || [])[0] || "")); // gyártható elem-kategória (outsourced)
  const [baseRef, setBaseRef] = useStateDW(_d ? (_d.baseRef || null) : null);            // { id, name, kind:"tpl"|"prod", price?, dims? }
  const [needs, setNeeds] = useStateDW(_d ? { room: "Konyha", w: 800, h: 1800, d: 400, qty: 1, note: "", ...(_d.needs || {}) } : { room: "Konyha", w: 800, h: 1800, d: 400, qty: 1, note: "" });
  const [style, setStyle] = useStateDW(_d ? { dir: "modern", corpus: "EG-3303-18", front: "EG-3327-19", note: "", ...(_d.style || {}) } : { dir: "modern", corpus: "EG-3303-18", front: "EG-3327-19", note: "" });
  const [phases, setPhases] = useStateDW(_d ? { layout: false, technical: false, manufacturing: false, ...(_d.phases || {}) } : { layout: false, technical: false, manufacturing: false });
  const [name, setName] = useStateDW(editMode && initial.name ? initial.name : "");
  const [priceOverride, setPriceOverride] = useStateDW(null);
  const [vat, setVat] = useStateDW(editMode && initial.vat != null ? initial.vat : 27);
  const [saveCat, setSaveCat] = useStateDW(false);
  const [pickerOpen, setPickerOpen] = useStateDW(false);
  const [doneQuote, setDoneQuote] = useStateDW(null);

  const templates = window.PARAM_TEMPLATES || [];
  const products = (window.sim && window.sim.getState().products) || [];

  // lock body scroll
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── estimate ──────────────────────────────────────────────────────────────
  const est = useMemoDW(() => {
    const { w, h, d } = needs;
    const frontM2 = (w * h) / 1e6;
    const corpusM2 = (2 * (w * d) + 2 * (h * d) + (w * h)) / 1e6;
    const frontRate = DW_MAT_RATE[style.front] || 36000;
    const corpusRate = DW_MAT_RATE[style.corpus] || 22000;
    const mat = frontM2 * frontRate + corpusM2 * corpusRate;
    const hwLabor = mat * 0.85;                       // vasalat + munkadíj
    const dirMult = (DW_STYLES.find((s) => s.k === style.dir) || {}).mult || 1;
    let unit = (mat + hwLabor) * dirMult;
    // blend toward a catalog anchor price when starting from a finished product
    if (category === "katalogus" && baseRef && baseRef.price) unit = unit * 0.55 + baseRef.price * 0.45;
    unit = dwRound(Math.max(unit, 18000), 1000);
    // confidence band — narrows as deeper phases are planned
    let band = 0.25;
    if (phases.layout) band -= 0.08;
    if (phases.technical) band -= 0.07;
    if (phases.manufacturing) band -= 0.07;
    band = dwClamp(band, 0.03, 0.25);
    return { unit, band, frontM2, corpusM2 };
  }, [needs, style, phases, category, baseRef]);

  const unitPrice = priceOverride != null ? priceOverride : est.unit;
  const qty = needs.qty;
  const net = unitPrice * qty;
  const lo = Math.round(unitPrice * (1 - est.band) / 1000) * 1000;
  const hi = Math.round(unitPrice * (1 + est.band) / 1000) * 1000;

  const derivedName = useMemoDW(() => {
    if (name.trim()) return name.trim();
    const matWord = dwMatName(style.corpus).split(" ")[0];
    const base = baseRef ? baseRef.name : `${needs.room} bútor`;
    return category === "katalogus" ? base : `${matWord} ${needs.room.toLowerCase()}bútor`;
  }, [name, style, needs, baseRef, category]);

  const phasesIncluded = ["needs", "style", ...Object.keys(phases).filter((k) => phases[k])];

  const pickBase = (ref) => {
    setBaseRef(ref);
    if (ref.dims) setNeeds((n) => ({ ...n, ...ref.dims }));
  };

  const canNext = step === 0 ? (category === "egyedi" || !!baseRef) : true;

  const buildLine = () => ({
    name: derivedName, code: "TERV", unit: "db", price: unitPrice, qty, vat, custom: true,
    design: {
      category, sourcing, elemCategory: sourcing === "outsourced" ? elemCategory : null, baseRef: baseRef ? { id: baseRef.id, name: baseRef.name, kind: baseRef.kind } : null,
      needs: { ...needs }, style: { ...style }, phases: { ...phases },
      phasesIncluded, band: est.band, estLo: lo, estHi: hi,
    },
  });

  const maybeSaveCatalog = () => {
    if (saveCat && window.sim && window.sim.saveDesignToCatalog) {
      window.sim.saveDesignToCatalog({ name: derivedName, price: unitPrice, cat: needs.room, blurb: style.note || DW_STYLES.find((s) => s.k === style.dir)?.l });
    }
  };

  // context="quote": hand the line back to the ItemBuilder
  const submit = () => {
    maybeSaveCatalog();
    onAdd(buildLine());
    onClose();
  };

  // context="design": create a brand-new quote from this design for the picked customer
  const createQuoteFor = (customerName) => {
    maybeSaveCatalog();
    const id = window.sim && window.sim.createQuote({ customer: customerName, lines: [buildLine()] });
    setPickerOpen(false);
    setDoneQuote({ id, customer: customerName });
  };

  return (
    <div className="fixed inset-0 z-[68] flex flex-col bg-stone-50" role="dialog" aria-modal="true">
      {/* Header */}
      <header className="shrink-0 bg-white border-b border-stone-200">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100" aria-label="Bezárás">
            <Icon name="x" size={17} />
          </button>
          <span className="w-8 h-8 rounded-lg bg-violet-600 text-white grid place-items-center shrink-0"><Icon name="ruler" size={16} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-stone-900 leading-tight">{editMode ? "Tervezett bútor módosítása" : isDesign ? "Tervezés indítása" : "Tervezett bútor"}</div>
            <div className="text-[10.5px] text-stone-500 leading-tight">{editMode ? "Specifikáció módosítása · az ár újraszámolódik" : isDesign ? "Új tervezés → ajánlat · igény és stílus alapján becsült ár" : "Tervezés → ajánlat · igény és stílus alapján becsült ár"}</div>
          </div>
          <div className="hidden sm:block text-[11px] text-stone-400 font-mono">{step + 1}/{DW_STEPS.length}</div>
        </div>
      </header>

      {/* Stepper */}
      <div className="shrink-0 bg-white border-b border-stone-100">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-2.5 flex items-center gap-1 overflow-x-auto">
          {DW_STEPS.map((label, i) => (
            <React.Fragment key={i}>
              <button onClick={() => i < step && setStep(i)} disabled={i > step}
                className="flex items-center gap-2 shrink-0 disabled:cursor-default">
                <span className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold transition ${
                  i < step ? "bg-violet-600 text-white" : i === step ? "bg-violet-100 text-violet-700 ring-2 ring-violet-300" : "bg-stone-100 text-stone-400"}`}>
                  {i < step ? "✓" : i + 1}</span>
                <span className={`text-[12px] ${i === step ? "font-semibold text-stone-900" : i < step ? "text-stone-500" : "text-stone-400"}`}>{label}</span>
              </button>
              {i < DW_STEPS.length - 1 && <div className={`w-6 sm:w-10 h-px shrink-0 ${i < step ? "bg-violet-300" : "bg-stone-200"}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-5">
          {step === 0 && (
            <StepType category={category} setCategory={setCategory} sourcing={sourcing} setSourcing={setSourcing} elemCategory={elemCategory} setElemCategory={setElemCategory} baseRef={baseRef} pickBase={pickBase}
              templates={templates} products={products} />
          )}
          {step === 1 && <StepNeeds needs={needs} setNeeds={setNeeds} />}
          {step === 2 && <StepStyle style={style} setStyle={setStyle} />}
          {step === 3 && <StepDepth phases={phases} setPhases={setPhases} needs={needs} style={style} est={est} />}
          {step === 4 && (
            <StepPrice derivedName={derivedName} name={name} setName={setName}
              unitPrice={unitPrice} setPriceOverride={setPriceOverride} estUnit={est.unit}
              qty={qty} setNeeds={setNeeds} vat={vat} setVat={setVat} net={net} lo={lo} hi={hi} band={est.band}
              category={category} baseRef={baseRef} needs={needs} style={style} phases={phases} sourcing={sourcing} elemCategory={elemCategory}
              saveCat={saveCat} setSaveCat={setSaveCat} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 bg-white border-t border-stone-200" style={{ paddingBottom: "max(env(safe-area-inset-bottom),0px)" }}>
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 h-16 flex items-center gap-3">
          <button onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            className="h-10 px-4 rounded-lg border border-stone-200 text-[12.5px] font-medium text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1.5">
            <Icon name="chevron" size={14} className="rotate-180" />{step === 0 ? "Mégse" : "Vissza"}
          </button>
          {/* live mini-estimate */}
          {step >= 2 && (
            <div className="hidden sm:flex flex-col leading-tight ml-1">
              <span className="text-[9.5px] uppercase tracking-wide text-stone-400 font-medium">Becsült nettó</span>
              <span className="text-[14px] font-semibold text-stone-900 tabular-nums">{dwHuf(net)} <span className="text-[10px] font-normal text-stone-400">±{Math.round(est.band * 100)}%</span></span>
            </div>
          )}
          <span className="flex-1" />
          {step < DW_STEPS.length - 1 ? (
            <button onClick={() => canNext && setStep(step + 1)} disabled={!canNext}
              className="h-10 px-6 rounded-lg bg-violet-600 text-white text-[12.5px] font-semibold hover:bg-violet-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-2">
              Tovább <Icon name="chevron" size={14} />
            </button>
          ) : (
            <button onClick={isDesign ? () => setPickerOpen(true) : submit}
              className="h-10 px-5 rounded-lg bg-violet-600 text-white text-[12.5px] font-semibold hover:bg-violet-700 inline-flex items-center gap-2">
              {isDesign ? <><Icon name="briefcase" size={15} /> Ajánlat készítése</> : editMode ? <><Icon name="check" size={15} /> Módosítás mentése</> : <><Icon name="plus" size={15} /> Hozzáadás az ajánlathoz</>}
            </button>
          )}
        </div>
      </div>

      {/* context="design": customer picker → create quote */}
      {pickerOpen && window.CustomerPickerDialog && (
        <CustomerPickerDialog
          customers={(window.sim && window.sim.getState().customers) || []}
          onPick={(name) => createQuoteFor(name)}
          onAddCustomer={(c) => window.sim && window.sim.addCustomer(c)}
          onClose={() => setPickerOpen(false)} />
      )}

      {/* context="design": success state */}
      {doneQuote && (
        <div className="fixed inset-0 z-[72] grid place-items-center bg-stone-900/40 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center animate-[chSlide_.22s_ease-out]">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 grid place-items-center mx-auto mb-3"><Icon name="check" size={26} /></div>
            <div className="text-[16px] font-semibold text-stone-900">Ajánlat létrehozva</div>
            <div className="text-[12px] text-stone-500 mt-1">{derivedName} — {doneQuote.customer}</div>
            {doneQuote.id && <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-[11.5px] font-mono">{doneQuote.id}</div>}
            <div className="text-[11px] text-stone-400 mt-3">Az ajánlat a Vázlat státuszban jött létre, az Értékesítés → Ajánlatok alatt folytatható.</div>
            <div className="flex justify-center gap-2 mt-5">
              <button onClick={onClose} className="h-9 px-4 rounded-lg bg-stone-900 text-white text-[12px] font-medium hover:bg-stone-800">Bezárás</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 0 — Típus ──────────────────────────────────────────────────────────
function StepType({ category, setCategory, sourcing, setSourcing, elemCategory, setElemCategory, baseRef, pickBase, templates, products }) {
  const cats = [
    { k: "egyedi", l: "Egyedi tervezés", icon: "sparkle", desc: "Teljesen egyedi bútor vagy összeállítás, nulláról — szabad méret, anyag és funkció." },
    { k: "katalogus", l: "Katalógus bútor", icon: "box", desc: "Meglévő sablon vagy katalógus-termék testreszabása kiindulásként." },
  ];
  return (
    <div className="space-y-5">
      {/* Gyártásmód — saját gyártás vs. rendelhető egyedi */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] uppercase tracking-wide text-stone-500 font-medium">Gyártásmód</span>
          <span className="text-[10.5px] text-stone-400">— házon belül gyártjuk, vagy külső gyártótól rendeljük</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {DW_SOURCING.map((c) => {
            const active = sourcing === c.k;
            return (
              <button key={c.k} onClick={() => setSourcing(c.k)}
                className={`text-left p-4 rounded-2xl border-2 transition ${active ? "border-teal-500 bg-teal-50/50 shadow-sm shadow-teal-100" : "border-stone-200 bg-white hover:border-stone-300"}`}>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${active ? "bg-teal-600 text-white" : "bg-stone-100 text-stone-500"}`}><Icon name={c.icon} size={18} /></span>
                  <div className="text-[13.5px] font-semibold text-stone-900">{c.l}</div>
                  {active && <Icon name="check" size={16} className="text-teal-600 ml-auto" />}
                </div>
                <div className="text-[11.5px] text-stone-500 leading-snug">{c.desc}</div>
              </button>
            );
          })}
        </div>
        {/* rendelhető egyedi → gyártható elem-kategória (a beszerzés ez alapján szűri a külső gyártókat) */}
        {sourcing === "outsourced" && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon name="box" size={13} className="text-amber-600" />
              <span className="text-[11.5px] font-semibold text-stone-800">Gyártható elem-kategória</span>
            </div>
            <p className="text-[10.5px] text-stone-500 mb-2 leading-snug">A beszerzés ez alapján listázza a külső gyártókat, akik ezt a kategóriát vállalják.</p>
            <div className="flex flex-wrap gap-1.5">
              {(window.MAKER_CATEGORIES || []).map((c) => {
                const active = elemCategory === c;
                return (
                  <button key={c} onClick={() => setElemCategory(c)}
                    className={`h-8 px-3 rounded-lg text-[12px] font-medium border transition ${active ? "bg-amber-600 border-amber-600 text-white" : "bg-white border-stone-200 text-stone-600 hover:border-amber-300"}`}>{c}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-stone-100" />

      <p className="text-[12.5px] text-stone-500 max-w-2xl">Az ajánlathoz az <span className="font-medium text-stone-700">igényt</span> és a <span className="font-medium text-stone-700">stílust</span> kell ismerni a becsléshez — a részletes tervezés később, a Tervezés modulban folytatható.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {cats.map((c) => {
          const active = category === c.k;
          return (
            <button key={c.k} onClick={() => setCategory(c.k)}
              className={`text-left p-4 rounded-2xl border-2 transition ${active ? "border-violet-500 bg-violet-50/50 shadow-sm shadow-violet-100" : "border-stone-200 bg-white hover:border-stone-300"}`}>
              <span className={`w-10 h-10 rounded-xl grid place-items-center mb-3 ${active ? "bg-violet-600 text-white" : "bg-stone-100 text-stone-500"}`}><Icon name={c.icon} size={20} /></span>
              <div className="text-[13.5px] font-semibold text-stone-900">{c.l}</div>
              <div className="text-[11.5px] text-stone-500 mt-1 leading-snug">{c.desc}</div>
            </button>
          );
        })}
      </div>

      {category === "katalogus" && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2">Kiindulási alap</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {templates.filter((t) => t.id !== "T-04").map((t) => {
              const active = baseRef && baseRef.id === t.id;
              return (
                <button key={t.id} onClick={() => pickBase({ id: t.id, name: t.name, kind: "tpl", dims: dwTplDims(t) })}
                  className={`text-left p-3 rounded-xl border-2 transition flex items-center gap-3 ${active ? "border-violet-500 bg-violet-50/50" : "border-stone-200 bg-white hover:border-stone-300"}`}>
                  {window.TemplateThumb ? <TemplateThumb kind={t.thumb} size={40} /> : <span className="w-10 h-10 rounded-md bg-stone-100" />}
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-stone-900 truncate">{t.name}</div>
                    <div className="text-[10px] text-stone-400">Sablon · {t.type}</div>
                  </div>
                </button>
              );
            })}
            {products.map((p) => {
              const active = baseRef && baseRef.id === p.id;
              return (
                <button key={p.id} onClick={() => pickBase({ id: p.id, name: p.name, kind: "prod", price: p.price })}
                  className={`text-left p-3 rounded-xl border-2 transition flex items-center gap-3 ${active ? "border-violet-500 bg-violet-50/50" : "border-stone-200 bg-white hover:border-stone-300"}`}>
                  <span className={`w-10 h-10 rounded-md bg-gradient-to-br ${p.tint || "from-stone-200 to-stone-100"} grid place-items-center shrink-0`}><Icon name={p.icon || "box"} size={17} className="text-stone-500" /></span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-stone-900 truncate">{p.name}</div>
                    <div className="text-[10px] text-stone-400 font-mono">{dwHuf(p.price)} · katalógus</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-100/70 text-stone-600">
        <Icon name="external" size={15} className="mt-0.5 shrink-0 text-violet-500" />
        <p className="text-[11.5px] leading-snug">Kétirányú katalógus: a katalógus elemei kiindulásként használhatók, a kész tervezett bútor pedig visszamenthető a katalógusba (utolsó lépés).</p>
      </div>
    </div>
  );
}

// ── Step 1 — Igényfelmérés ──────────────────────────────────────────────────
function StepNeeds({ needs, setNeeds }) {
  const set = (patch) => setNeeds((n) => ({ ...n, ...patch }));
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="text-[12px] font-semibold text-stone-900 mb-2.5">Helyiség / funkció</div>
          <div className="flex flex-wrap gap-1.5">
            {DW_ROOMS.map((r) => (
              <button key={r} onClick={() => set({ room: r })}
                className={`h-8 px-3 rounded-lg text-[12px] font-medium border transition ${needs.room === r ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"}`}>{r}</button>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] font-semibold text-stone-900 mb-2.5">Méretek <span className="font-normal text-stone-400">(mm)</span></div>
          <div className="grid grid-cols-3 gap-3">
            {[{ k: "w", l: "Szélesség", min: 200, max: 4000 }, { k: "h", l: "Magasság", min: 200, max: 3000 }, { k: "d", l: "Mélység", min: 150, max: 900 }].map((dim) => (
              <div key={dim.k}>
                <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">{dim.l}</div>
                <input type="number" value={needs[dim.k]} min={dim.min} max={dim.max}
                  onChange={(e) => set({ [dim.k]: dwClamp(Number(e.target.value) || 0, 0, dim.max) })}
                  className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[14px] font-semibold font-mono tabular-nums outline-none focus:border-violet-400" />
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10.5px] text-stone-400 font-mono">Térfogat ≈ {((needs.w * needs.h * needs.d) / 1e9).toFixed(2)} m³</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-semibold text-stone-900">Darabszám</div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => set({ qty: Math.max(1, needs.qty - 1) })} className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 grid place-items-center"><Icon name="minus" size={15} /></button>
              <input type="number" value={needs.qty} min={1} onChange={(e) => set({ qty: Math.max(1, Number(e.target.value) || 1) })}
                className="w-14 h-9 text-center rounded-lg border border-stone-200 text-[14px] font-semibold font-mono outline-none focus:border-violet-400" />
              <button onClick={() => set({ qty: needs.qty + 1 })} className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 grid place-items-center"><Icon name="plus" size={15} /></button>
            </div>
          </div>
        </Card>
      </div>
      <Card className="p-4">
        <div className="text-[12px] font-semibold text-stone-900 mb-1">Igények, elvárások</div>
        <div className="text-[11px] text-stone-500 mb-2.5">Mit kell tudnia a bútornak? Tárolás, funkciók, kényelmi és helyszíni igények.</div>
        <textarea value={needs.note} onChange={(e) => set({ note: e.target.value })} rows={8}
          placeholder="pl. Beépített mosogató alá, alsó sor fiókokkal, sarokmegoldás a kürtő miatt, beépített hűtőnek hely…"
          className="w-full px-3 py-2.5 rounded-lg border border-stone-200 text-[12.5px] leading-relaxed outline-none focus:border-violet-400 resize-none" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["Moodboard", "Helyszínfotó", "Vázlat"].map((lab) => (
            <div key={lab} className="aspect-[4/3] rounded-lg border border-dashed border-stone-300 grid place-items-center text-center"
              style={{ background: "repeating-linear-gradient(45deg,#fafaf9,#fafaf9 6px,#f5f5f4 6px,#f5f5f4 12px)" }}>
              <span className="text-[9.5px] font-mono text-stone-400 px-1">{lab}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Step 2 — Stílustervezés ─────────────────────────────────────────────────
function StepStyle({ style, setStyle }) {
  const set = (patch) => setStyle((s) => ({ ...s, ...patch }));
  const MatRow = ({ label, list, value, onPick }) => (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {list.map((m) => {
          const active = value === m.code;
          return (
            <button key={m.code} onClick={() => onPick(m.code)} title={m.name}
              className={`relative w-10 h-10 rounded-lg border-2 transition ${active ? "border-violet-600 shadow-sm shadow-violet-200" : "border-transparent hover:border-stone-300"}`}
              style={{ background: m.color }}>
              {active && <span className="absolute inset-0 grid place-items-center"><Icon name="check" size={14} className="text-white drop-shadow" /></span>}
            </button>
          );
        })}
      </div>
      <div className="text-[10.5px] text-stone-500 mt-1 truncate">{dwMatName(value)}</div>
    </div>
  );
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-4 space-y-4">
        <div>
          <div className="text-[12px] font-semibold text-stone-900 mb-2.5">Stílusirány</div>
          <div className="grid grid-cols-2 gap-2">
            {DW_STYLES.map((s) => {
              const active = style.dir === s.k;
              return (
                <button key={s.k} onClick={() => set({ dir: s.k })}
                  className={`text-left p-3 rounded-xl border-2 transition ${active ? "border-violet-500 bg-violet-50/50" : "border-stone-200 bg-white hover:border-stone-300"}`}>
                  <div className="text-[12.5px] font-semibold text-stone-900">{s.l}</div>
                  <div className="text-[10.5px] text-stone-500 mt-0.5 leading-snug">{s.note}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MatRow label="Korpusz / alapanyag" list={DW_CORPUS()} value={style.corpus} onPick={(c) => set({ corpus: c })} />
          <MatRow label="Front anyag" list={DW_FRONT()} value={style.front} onPick={(c) => set({ front: c })} />
        </div>
      </Card>
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-start gap-2.5">
            <Icon name="drop" size={16} className="mt-0.5 shrink-0 text-violet-500" />
            <p className="text-[11.5px] text-stone-600 leading-snug">A stílus és az elrendezés adja a <span className="font-medium text-stone-800">funkciót</span> és a <span className="font-medium text-stone-800">felhasználható anyagokat</span> — ez elég egy ajánlat-szintű becsléshez.</p>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
            <div className="flex items-center gap-2 text-[12px]"><span className="w-3.5 h-3.5 rounded-sm border border-stone-200" style={{ background: dwMatColor(style.corpus) }} /><span className="text-stone-500">Korpusz:</span><span className="font-medium text-stone-800 truncate">{dwMatName(style.corpus)}</span></div>
            <div className="flex items-center gap-2 text-[12px]"><span className="w-3.5 h-3.5 rounded-sm border border-stone-200" style={{ background: dwMatColor(style.front) }} /><span className="text-stone-500">Front:</span><span className="font-medium text-stone-800 truncate">{dwMatName(style.front)}</span></div>
            <div className="flex items-center gap-2 text-[12px]"><Icon name="sparkle" size={13} className="text-violet-500" /><span className="text-stone-500">Irány:</span><span className="font-medium text-stone-800">{DW_STYLES.find((s) => s.k === style.dir)?.l}</span></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] font-semibold text-stone-900 mb-1">Stílus-jegyzet</div>
          <textarea value={style.note} onChange={(e) => set({ note: e.target.value })} rows={4}
            placeholder="pl. matt felület, fa fogantyú, antracit lábazat, LED világítás a felső sorban…"
            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 text-[12.5px] leading-relaxed outline-none focus:border-violet-400 resize-none" />
        </Card>
      </div>
    </div>
  );
}

// ── Step 3 — Tervezési mélység ──────────────────────────────────────────────
function StepDepth({ phases, setPhases, needs, style, est }) {
  const toggle = (k) => setPhases((p) => ({ ...p, [k]: !p[k] }));
  // rough manufacturing-needs preview (gyártástervezés output)
  const hours = ((needs.w * needs.h) / 1e6) * 1.4 + needs.qty * 0.6;
  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <div className="space-y-3">
        <p className="text-[12.5px] text-stone-500 max-w-2xl">A teljes folyamatra nincs szükség egy ajánlathoz. Minél több fázist tervezel meg, annál pontosabb a becslés.</p>
        {/* Phase rail */}
        <Card className="p-4">
          <div className="flex flex-col gap-2">
            {DW_PHASES.map((ph, i) => {
              const on = ph.locked || phases[ph.k];
              return (
                <div key={ph.k} className={`flex items-start gap-3 p-3 rounded-xl border transition ${on ? "border-violet-200 bg-violet-50/40" : "border-stone-200 bg-white"}`}>
                  <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${on ? "bg-violet-600 text-white" : "bg-stone-100 text-stone-400"}`}><Icon name={ph.icon} size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-semibold text-stone-900">{i + 1}. {ph.l}</span>
                      {ph.locked && <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">kötelező</span>}
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">{ph.desc}</div>
                  </div>
                  {ph.locked ? (
                    <span className="shrink-0 mt-0.5"><Icon name="check" size={16} className="text-violet-600" /></span>
                  ) : (
                    <button onClick={() => toggle(ph.k)} role="switch" aria-checked={on}
                      className={`shrink-0 mt-0.5 w-10 h-6 rounded-full transition relative ${on ? "bg-violet-600" : "bg-stone-200"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${on ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Gyártástervezés output preview */}
        {phases.manufacturing && (
          <Card className="p-4 border-violet-200">
            <div className="flex items-center gap-2 mb-2.5">
              <Icon name="cpu" size={15} className="text-violet-600" />
              <div className="text-[12px] font-semibold text-stone-900">Gyártási szükségletek <span className="font-normal text-stone-400">(becslés)</span></div>
            </div>
            <div className="grid sm:grid-cols-3 gap-2.5 text-[11.5px]">
              <div className="p-2.5 rounded-lg bg-stone-50">
                <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1">Anyag</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-stone-200" style={{ background: dwMatColor(style.corpus) }} /><span className="text-stone-700 truncate">{dwMatName(style.corpus)}</span></div>
                <div className="flex items-center gap-1.5 mt-1"><span className="w-3 h-3 rounded-sm border border-stone-200" style={{ background: dwMatColor(style.front) }} /><span className="text-stone-700 truncate">{dwMatName(style.front)}</span></div>
                <div className="text-[10px] text-stone-400 font-mono mt-1">≈ {(est.corpusM2 + est.frontM2).toFixed(1)} m²</div>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-50">
                <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1">Vasalat</div>
                <div className="text-stone-700">Pántok, fiókcsúszók</div>
                <div className="text-stone-700">Élzáró, csavar</div>
                <div className="text-[10px] text-stone-400 mt-1">Blum / Hettich</div>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-50">
                <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1">Megmunkálás</div>
                <div className="text-stone-700">Szabás, élzárás, CNC</div>
                <div className="text-[10px] text-stone-400 font-mono mt-1">≈ {hours.toFixed(1)} óra</div>
              </div>
            </div>
            <div className="text-[10.5px] text-stone-400 mt-2.5">A részletes anyaglista (BOM) a Tervezés → Termék-összeállítás modulban véglegesíthető.</div>
          </Card>
        )}
      </div>

      {/* Confidence */}
      <div>
        <Card className="p-4 lg:sticky lg:top-2">
          <div className="text-[12px] font-semibold text-stone-900 mb-3">Becslés pontossága</div>
          <div className="text-[30px] font-semibold text-violet-700 tabular-nums leading-none">±{Math.round(est.band * 100)}%</div>
          <div className="text-[10.5px] text-stone-500 mt-1">a becsült egységárhoz képest</div>
          <div className="mt-3 h-2 rounded-full bg-stone-100 overflow-hidden">
            <div className="h-full bg-violet-500 transition-all" style={{ width: `${dwClamp((0.25 - est.band) / 0.22 * 100, 6, 100)}%` }} />
          </div>
          <div className="flex justify-between text-[9.5px] text-stone-400 mt-1"><span>durva</span><span>pontos</span></div>
          <div className="mt-4 pt-3 border-t border-stone-100 space-y-1.5 text-[11px]">
            {DW_PHASES.map((ph) => {
              const on = ph.locked || phases[ph.k];
              return (
                <div key={ph.k} className="flex items-center gap-2">
                  <Icon name={on ? "check" : "x"} size={12} className={on ? "text-violet-600" : "text-stone-300"} />
                  <span className={on ? "text-stone-700" : "text-stone-400"}>{ph.l}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Step 4 — Ár & összegzés ─────────────────────────────────────────────────
function StepPrice({ derivedName, name, setName, unitPrice, setPriceOverride, estUnit, qty, setNeeds, vat, setVat, net, lo, hi, band, category, baseRef, needs, style, phases, sourcing, elemCategory, saveCat, setSaveCat }) {
  const vatAmt = net * (vat / 100);
  const srcMeta = (DW_SOURCING.find((x) => x.k === sourcing) || DW_SOURCING[0]);
  const incl = ["Igényfelmérés", "Stílustervezés", ...(phases.layout ? ["Elrendezés"] : []), ...(phases.technical ? ["Műszaki"] : []), ...(phases.manufacturing ? ["Gyártás"] : [])];
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="text-[12px] font-semibold text-stone-900 mb-1.5">Tétel megnevezése</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={derivedName}
            className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-violet-400" />
          <div className="text-[10.5px] text-stone-400 mt-1.5">Megjelenik: <span className="font-medium text-stone-600">{derivedName}</span></div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[12px] font-semibold text-stone-900">Becsült egységár</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">±{Math.round(band * 100)}% sáv</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={unitPrice} step={1000} onChange={(e) => setPriceOverride(Math.max(0, Number(e.target.value) || 0))}
              className="flex-1 h-12 px-3 rounded-lg border border-stone-200 text-[18px] font-semibold font-mono tabular-nums outline-none focus:border-violet-400" />
            <span className="text-[12px] text-stone-400">Ft / db</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px]">
            <span className="text-stone-500 font-mono">Sáv: {dwHuf(lo)} – {dwHuf(hi)}</span>
            {unitPrice !== estUnit && (
              <button onClick={() => setPriceOverride(null)} className="text-violet-700 font-medium hover:underline">Vissza a becslésre</button>
            )}
          </div>
          {/* band bar */}
          <div className="mt-2 h-2 rounded-full bg-stone-100 relative overflow-hidden">
            <div className="absolute inset-y-0 bg-violet-200" style={{ left: "10%", right: "10%" }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-violet-600" style={{ left: "calc(50% - 4px)" }} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Darabszám</div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setNeeds((n) => ({ ...n, qty: Math.max(1, n.qty - 1) }))} className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 grid place-items-center"><Icon name="minus" size={14} /></button>
                <span className="flex-1 h-9 grid place-items-center rounded-lg border border-stone-200 text-[14px] font-semibold font-mono">{qty}</span>
                <button onClick={() => setNeeds((n) => ({ ...n, qty: n.qty + 1 }))} className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 grid place-items-center"><Icon name="plus" size={14} /></button>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">ÁFA-kulcs</div>
              <div className="flex items-center gap-1.5">
                {[0, 5, 18, 27].map((v) => (
                  <button key={v} onClick={() => setVat(v)} className={`flex-1 h-9 rounded-lg text-[11.5px] font-medium border ${vat === v ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-stone-200 text-stone-600"}`}>{v}%</button>
                ))}
              </div>
            </div>
          </div>
        </Card>
        <button onClick={() => setSaveCat(!saveCat)} role="switch" aria-checked={saveCat}
          className={`w-full p-3.5 rounded-xl border-2 text-left flex items-center gap-3 transition ${saveCat ? "border-violet-500 bg-violet-50/50" : "border-stone-200 bg-white hover:border-stone-300"}`}>
          <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${saveCat ? "bg-violet-600 text-white" : "bg-stone-100 text-stone-400"}`}><Icon name="box" size={17} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-semibold text-stone-900">Mentés a katalógusba</span>
            <span className="block text-[11px] text-stone-500 leading-snug">A tervezett bútor felkerül a termékkatalógusba, és a jövőben kiindulásként választható.</span>
          </span>
          <span className={`shrink-0 w-10 h-6 rounded-full transition relative ${saveCat ? "bg-violet-600" : "bg-stone-200"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${saveCat ? "left-[18px]" : "left-0.5"}`} />
          </span>
        </button>
      </div>

      {/* Summary */}
      <Card className="p-0 overflow-hidden h-fit">
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/60">
          <div className="text-[13px] font-semibold text-stone-900">{derivedName}</div>
          <div className="text-[10.5px] text-stone-500 mt-0.5">{category === "katalogus" ? `Katalógus alapú${baseRef ? " · " + baseRef.name : ""}` : "Egyedi tervezés"}</div>
          <span className={`mt-1.5 inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${sourcing === "own" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"}`}>
            <Icon name={srcMeta.icon} size={11} />{srcMeta.l}
          </span>
        </div>
        <div className="p-4 space-y-2.5 text-[12px]">
          <Row k="Gyártásmód" v={srcMeta.l} />
          {sourcing === "outsourced" && elemCategory && <Row k="Elem-kategória" v={elemCategory} />}
          <Row k="Helyiség" v={needs.room} />
          <Row k="Méret" v={`${needs.w} × ${needs.h} × ${needs.d} mm`} mono />
          <Row k="Korpusz" v={dwMatName(style.corpus)} />
          <Row k="Front" v={dwMatName(style.front)} />
          <Row k="Stílus" v={DW_STYLES.find((s) => s.k === style.dir)?.l} />
          <div className="pt-1">
            <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Tervezett fázisok</div>
            <div className="flex flex-wrap gap-1.5">
              {incl.map((p) => <span key={p} className="px-2 h-6 inline-flex items-center rounded-full bg-violet-50 text-violet-700 text-[10.5px] font-medium border border-violet-100">{p}</span>)}
            </div>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-stone-200 bg-stone-50/70 space-y-1.5">
          <div className="flex items-center justify-between text-[11.5px] text-stone-500"><span>Egységár × {qty}</span><span className="tabular-nums">{dwHuf(net)}</span></div>
          <div className="flex items-center justify-between text-[11.5px] text-stone-500"><span>ÁFA ({vat}%)</span><span className="tabular-nums">{dwHuf(vatAmt)}</span></div>
          <div className="flex items-center justify-between text-[15px] font-semibold text-stone-900"><span>Bruttó</span><span className="tabular-nums">{dwHuf(net + vatAmt)}</span></div>
          <div className="text-[10px] text-stone-400 pt-0.5">Becsült érték — ±{Math.round(band * 100)}% pontosság a tervezettség alapján.</div>
        </div>
      </Card>
    </div>
  );
}

function Row({ k, v, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-stone-500 shrink-0">{k}</span>
      <span className={`font-medium text-stone-900 text-right truncate ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

Object.assign(window, { DesignItemWizard });
