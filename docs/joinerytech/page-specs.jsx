// ──────────────────────────────────────────────────────────────────────────
// page-specs.jsx — Specifikációk (Tervezés világ)
// Moduláris: Kategóriák (bővíthető mezősémák) · Stílusok · Műszaki.
// Egy kategória definiálja a stílus/műszaki mezőit; a példányok ezeket töltik ki
// (opciónként ×szorzó / +felár). Az ármotor (specs-engine.js) ezekből számol.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateS, useMemo: useMemoS } = React;

function specAccentOf(cat) { return (cat && window.SPEC_ACCENT[cat.color]) || window.SPEC_ACCENT.stone; }

// Compact, human-readable value for a field+value
function fieldValueLabel(field, val) {
  if (field.kind === "bool") return val ? "Igen" : "Nem";
  if (field.kind === "material") return (window.sim.materialInfo(val).name) || val || "—";
  if (field.kind === "list") return Array.isArray(val) && val.length ? val.join(", ") : "—";
  if (field.role === "precision" && window.PRECISION_BANDS[val]) return window.PRECISION_BANDS[val].label;
  if (field.options) { const o = field.options.find((x) => x.value === val); if (o && o.label) return o.label; }
  return (val === undefined || val === "") ? "—" : String(val);
}

// ──────────────────────────────────────────────────────────────────────────
// Field control inside the instance editor
// ──────────────────────────────────────────────────────────────────────────
function InstanceField({ field, value, onChange, accent }) {
  const hint = (o) => {
    const bits = [];
    if (o.mult && o.mult !== 1) bits.push("×" + o.mult);
    if (o.add) bits.push("+" + o.add.toLocaleString("hu-HU"));
    return bits.length ? " " + bits.join(" ") : "";
  };

  if (field.kind === "bool") {
    const on = !!value;
    return (
      <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-stone-100 bg-stone-50/50">
        <span className="text-[12.5px] text-stone-800">{field.label}{field.required && <span className="text-rose-400 ml-0.5">*</span>}</span>
        <button onClick={() => onChange(!on)} className={`w-11 h-6 rounded-full transition relative shrink-0 ${on ? accent.solid : "bg-stone-300"}`}>
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>
    );
  }
  if (field.kind === "text" || field.kind === "number") {
    return (
      <div>
        <Label field={field} />
        <input type={field.kind === "number" ? "number" : "text"} value={value ?? ""} onChange={(e) => onChange(field.kind === "number" ? Number(e.target.value) : e.target.value)}
          className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px]" />
      </div>
    );
  }
  if (field.kind === "color") {
    return (
      <div>
        <Label field={field} />
        <input type="color" value={value || "#dcc4a3"} onChange={(e) => onChange(e.target.value)} className="h-9 w-16 rounded-lg border border-stone-200 bg-white" />
      </div>
    );
  }
  // material
  if (field.kind === "material") {
    return (
      <div>
        <Label field={field} extra={field.slot ? `slot: ${field.slot}` : null} />
        <div className="flex flex-wrap gap-1.5">
          {(field.options || []).map((o) => {
            const m = window.sim.materialInfo(o.value); const on = value === o.value;
            return (
              <button key={o.value} onClick={() => onChange(on ? "" : o.value)}
                className={`flex items-center gap-1.5 h-9 pl-1.5 pr-2.5 rounded-lg text-[11.5px] font-medium border transition ${on ? `${accent.solid} border-transparent text-white` : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"}`}>
                <span className="w-5 h-5 rounded border border-black/10 shrink-0" style={{ background: m.color }} />
                {m.name}
                {m.known && m.price != null && <span className={`text-[10px] ${on ? "opacity-80" : "text-stone-400"}`}>{(m.price / 1000).toFixed(1)}k/{m.unit || "m²"}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  // select / list
  const isList = field.kind === "list";
  const arr = isList ? (Array.isArray(value) ? value : []) : null;
  const pick = (v) => {
    if (isList) onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    else onChange(value === v ? "" : v);
  };
  return (
    <div>
      <Label field={field} extra={isList ? "több is választható" : null} />
      <div className="flex flex-wrap gap-1.5">
        {(field.options || []).map((o) => {
          const on = isList ? arr.includes(o.value) : value === o.value;
          const lbl = o.label || (field.role === "precision" && window.PRECISION_BANDS[o.value] ? window.PRECISION_BANDS[o.value].label : o.value);
          return (
            <button key={o.value} onClick={() => pick(o.value)}
              className={`h-9 px-2.5 rounded-lg text-[11.5px] font-medium border transition ${on ? `${accent.solid} border-transparent text-white` : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"}`}>
              {lbl}<span className={`text-[10px] ${on ? "opacity-80" : "text-stone-400"}`}>{hint(o)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
function Label({ field, extra }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">{field.label}{field.required && <span className="text-rose-400 ml-0.5">*</span>}</span>
      {extra && <span className="text-[10px] text-stone-400">· {extra}</span>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Instance editor (style or tech) — renders the category schema
// ──────────────────────────────────────────────────────────────────────────
function InstanceEditor({ kind, instance, category, onClose }) {
  const isNew = !instance;
  const fields = kind === "tech" ? (category.techFields || []) : (category.styleFields || []);
  const accent = kind === "tech" ? window.SPEC_ACCENT.teal : window.SPEC_ACCENT.violet;
  const [name, setName] = useStateS(instance ? instance.name : "");
  const [note, setNote] = useStateS(instance ? (instance.note || "") : "");
  const [values, setValues] = useStateS(() => ({ ...(instance ? instance.values : {}) }));
  const setVal = (k, v) => setValues((p) => ({ ...p, [k]: v }));

  const save = () => {
    const payload = { categoryId: category.id, name: name.trim() || "Névtelen", note, values };
    if (isNew) window.sim.addSpecInstance(kind, payload);
    else window.sim.updateSpecInstance(kind, instance.id, payload);
    onClose();
  };

  return (
    <SlideOver open={true} onClose={onClose}
      title={isNew ? `Új ${kind === "tech" ? "műszaki" : "stílus"} — ${category.name}` : instance.name}
      subtitle={`${category.name} · ${kind === "tech" ? "műszaki paraméterek" : "stílus / kivitel"}`} width={560}
      footer={
        <div className="flex items-center justify-between gap-3">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-stone-200 text-[12.5px] text-stone-600 hover:bg-stone-50">Mégse</button>
          <button onClick={save} className={`h-9 px-5 rounded-lg text-white text-[12.5px] font-semibold inline-flex items-center gap-2 ${accent.solid} ${accent.solidHover}`}><Icon name="check" size={14} />{isNew ? "Létrehozás" : "Mentés"}</button>
        </div>
      }>
      <div className="space-y-5">
        <div>
          <label className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium block mb-1">Megnevezés</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder={kind === "tech" ? "pl. Standard gyártási előírás" : "pl. Skandi tölgy — matt"}
            className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px]" />
        </div>
        <div className="space-y-3">
          {fields.length === 0 && <div className="text-[12px] text-stone-400 italic">Ennek a kategóriának nincs {kind === "tech" ? "műszaki" : "stílus"} mezője. Vedd fel a Kategóriák fülön.</div>}
          {fields.map((f) => <InstanceField key={f.key} field={f} value={values[f.key]} onChange={(v) => setVal(f.key, v)} accent={accent} />)}
        </div>
        <div>
          <label className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium block mb-1">Megjegyzés</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Belső jegyzet (opcionális)…"
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] resize-none" />
        </div>
      </div>
    </SlideOver>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Instance card
// ──────────────────────────────────────────────────────────────────────────
function InstanceCard({ kind, inst, category, onEdit }) {
  const accent = kind === "tech" ? window.SPEC_ACCENT.teal : window.SPEC_ACCENT.violet;
  const tone = window.SPEC_STATUS_TONE[inst.status];
  const fields = kind === "tech" ? (category.techFields || []) : (category.styleFields || []);
  const pairs = fields.map((f) => ({ label: f.label, value: fieldValueLabel(f, inst.values ? inst.values[f.key] : undefined) }))
    .filter((p) => p.value && p.value !== "—" && p.value !== "Nem");

  return (
    <div className={`rounded-2xl border bg-white p-4 flex flex-col gap-3 ${inst.status === "archived" ? "border-stone-200 opacity-75" : accent.softBd}`}>
      <div className="flex items-start gap-3">
        <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${accent.iconBg} ${accent.iconFg}`}><Icon name={kind === "tech" ? "cpu" : "drop"} size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[9.5px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${specAccentOf(category).chipBg} ${specAccentOf(category).chipFg}`}>{category.name}</span>
            <span className={`inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded ${tone.bg} ${tone.fg}`}><span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{tone.label}</span>
          </div>
          <div className="text-[14px] font-semibold text-stone-900 mt-1 leading-tight truncate">{inst.name}</div>
          <div className="text-[10.5px] text-stone-400 font-mono mt-0.5">{inst.id}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pairs.length === 0 && <span className="text-[11px] text-stone-400 italic">Nincs kitöltött érték</span>}
        {pairs.slice(0, 6).map((p, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-[10.5px] bg-stone-50 border border-stone-200 rounded-md px-1.5 py-0.5 text-stone-600">
            <span className="text-stone-400">{p.label}:</span><span className="font-medium text-stone-800">{p.value}</span>
          </span>
        ))}
        {pairs.length > 6 && <span className="text-[10.5px] text-stone-400 px-1 py-0.5">+{pairs.length - 6}</span>}
      </div>
      <div className="flex items-center gap-2 mt-auto pt-1">
        <button onClick={() => onEdit(inst)} className={`h-8 px-3 rounded-lg text-white text-[11.5px] font-medium inline-flex items-center gap-1.5 ${accent.solid} ${accent.solidHover}`}><Icon name="settings" size={12} />Szerkesztés</button>
        <button onClick={() => window.sim.duplicateSpecInstance(kind, inst.id)} title="Duplikálás" className="h-8 w-8 grid place-items-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50"><Icon name="layers" size={13} /></button>
        {inst.status === "active"
          ? <button onClick={() => window.sim.setSpecInstanceStatus(kind, inst.id, "archived")} title="Archiválás" className="h-8 w-8 grid place-items-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 ml-auto"><Icon name="folder" size={13} /></button>
          : <button onClick={() => window.sim.setSpecInstanceStatus(kind, inst.id, "active")} className="h-8 px-3 rounded-lg border border-emerald-200 text-emerald-700 text-[11.5px] font-medium hover:bg-emerald-50 inline-flex items-center gap-1.5 ml-auto"><Icon name="check" size={12} />Aktiválás</button>}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Category card
// ──────────────────────────────────────────────────────────────────────────
function CategoryCard({ cat, counts, onEdit, onDelete }) {
  const accent = specAccentOf(cat);
  return (
    <div className={`rounded-2xl border bg-white p-4 flex flex-col gap-3 ${accent.softBd}`}>
      <div className="flex items-start gap-3">
        <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${accent.iconBg} ${accent.iconFg}`}><Icon name={cat.icon || "box"} size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-[15px] font-semibold text-stone-900 truncate">{cat.name}</div>
            {cat.builtin && <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">beépített</span>}
          </div>
          {cat.desc && <div className="text-[11.5px] text-stone-500 leading-snug mt-0.5">{cat.desc}</div>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10.5px] font-medium px-2 py-0.5 rounded bg-violet-50 text-violet-700">{(cat.styleFields || []).length} stílus mező</span>
        <span className="text-[10.5px] font-medium px-2 py-0.5 rounded bg-teal-50 text-teal-700">{(cat.techFields || []).length} műszaki mező</span>
        <span className="text-[10.5px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-600">{counts.style} stílus · {counts.tech} műszaki</span>
      </div>
      <div className="flex items-center gap-2 mt-auto pt-1">
        <button onClick={() => onEdit(cat)} className={`h-8 px-3 rounded-lg text-white text-[11.5px] font-medium inline-flex items-center gap-1.5 ${accent.solid} ${accent.solidHover}`}><Icon name="settings" size={12} />Séma szerkesztése</button>
        {!cat.builtin && <button onClick={() => onDelete(cat)} title="Törlés" className="h-8 w-8 grid place-items-center rounded-lg border border-stone-200 text-stone-400 hover:bg-rose-50 hover:text-rose-500 ml-auto"><Icon name="x" size={14} /></button>}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────
function SpecsPage({ onScreen }) {
  const s = useSim();
  const cats = s.specCategories || [];
  const styles = s.styles || [];
  const techSpecs = s.techSpecs || [];

  const [tab, setTab] = useStateS("categories"); // categories | styles | tech
  const [catFilter, setCatFilter] = useStateS("all");
  const [showArchived, setShowArchived] = useStateS(false);
  const [catSheet, setCatSheet] = useStateS(null);   // { cat } | { isNew:true }
  const [instEditor, setInstEditor] = useStateS(null); // { kind, instance?, category }

  const catById = (id) => cats.find((c) => c.id === id);
  const collection = tab === "tech" ? techSpecs : styles;
  const kind = tab === "tech" ? "tech" : "style";

  const filtered = useMemoS(() => collection.filter((x) => {
    if (catFilter !== "all" && x.categoryId !== catFilter) return false;
    if (!showArchived && x.status === "archived") return false;
    return catById(x.categoryId); // skip orphans
  }), [collection, catFilter, showArchived, cats]);

  const tabs = [
    { key: "categories", label: "Kategóriák", icon: "folder", count: cats.length },
    { key: "styles", label: "Stílusok", icon: "drop", count: styles.filter((x) => x.status === "active").length },
    { key: "tech", label: "Műszaki", icon: "cpu", count: techSpecs.filter((x) => x.status === "active").length },
  ];

  const archivedCount = collection.filter((x) => x.status === "archived" && (catFilter === "all" || x.categoryId === catFilter)).length;

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-5">
      {catSheet && <CategorySheet category={catSheet.cat} onClose={() => setCatSheet(null)} />}
      {instEditor && <InstanceEditor kind={instEditor.kind} instance={instEditor.instance} category={instEditor.category} onClose={() => setInstEditor(null)} />}

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[19px] md:text-[21px] font-semibold text-stone-900">Specifikációk</h1>
        <p className="text-[12.5px] text-stone-500 max-w-3xl leading-snug">
          Moduláris, bővíthető rendszer. A <span className="font-medium text-stone-700">Kategória</span> (pl. Szekrény, Ajtó) saját mezősémát ad a <span className="font-medium text-violet-700">Stílushoz</span> és a <span className="font-medium text-teal-700">Műszakihoz</span>, opciónként ár-szorzóval. Az ajánlatban ezekből + a behúzott sablonokból számol árat az ármotor.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex p-0.5 rounded-xl bg-stone-100 gap-0.5">
          {tabs.map((t) => {
            const active = tab === t.key;
            const ac = t.key === "styles" ? window.SPEC_ACCENT.violet : t.key === "tech" ? window.SPEC_ACCENT.teal : null;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`h-9 px-3.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-1.5 transition ${active ? (ac ? ac.tabActive : "bg-stone-800 text-white") : "text-stone-600 hover:text-stone-900"}`}>
                <Icon name={t.icon} size={14} />{t.label}<span className={`text-[10px] tabular-nums ${active ? "opacity-80" : "text-stone-400"}`}>{t.count}</span>
              </button>
            );
          })}
        </div>

        {tab !== "categories" && (
          <>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="h-9 px-3 rounded-lg border border-stone-200 text-[12px] bg-white">
              <option value="all">Minden kategória</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 cursor-pointer select-none">
              <button onClick={() => setShowArchived((v) => !v)} className={`w-9 h-5 rounded-full transition relative ${showArchived ? "bg-stone-600" : "bg-stone-300"}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${showArchived ? "left-[18px]" : "left-0.5"}`} />
              </button>Archiváltak ({archivedCount})
            </label>
          </>
        )}

        <div className="ml-auto">
          {tab === "categories" ? (
            <button onClick={() => setCatSheet({ cat: null })} className="h-9 px-3.5 rounded-lg bg-stone-800 text-white text-[12px] font-medium hover:bg-stone-900 inline-flex items-center gap-1.5"><Icon name="plus" size={13} />Új kategória</button>
          ) : (
            <NewInstanceButton kind={kind} cats={cats} catFilter={catFilter} onCreate={(category) => setInstEditor({ kind, category })} />
          )}
        </div>
      </div>

      {/* Body */}
      {tab === "categories" ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {cats.map((c) => (
            <CategoryCard key={c.id} cat={c} onEdit={(x) => setCatSheet({ cat: x })}
              counts={{ style: styles.filter((x) => x.categoryId === c.id).length, tech: techSpecs.filter((x) => x.categoryId === c.id).length }}
              onDelete={(x) => window.sim.removeSpecCategory(x.id)} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center">
          <div className="text-[13px] text-stone-500">Nincs megjeleníthető elem.</div>
          <div className="text-[11.5px] text-stone-400 mt-1">Hozz létre egyet a jobb felső gombbal.</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((inst) => (
            <InstanceCard key={inst.id} kind={kind} inst={inst} category={catById(inst.categoryId)} onEdit={(x) => setInstEditor({ kind, instance: x, category: catById(inst.categoryId) })} />
          ))}
        </div>
      )}
    </div>
  );
}

// "Új stílus/műszaki" — pick category if needed
function NewInstanceButton({ kind, cats, catFilter, onCreate }) {
  const [open, setOpen] = useStateS(false);
  const accent = kind === "tech" ? window.SPEC_ACCENT.teal : window.SPEC_ACCENT.violet;
  const label = kind === "tech" ? "Új műszaki" : "Új stílus";
  const fixed = catFilter !== "all" ? cats.find((c) => c.id === catFilter) : null;
  if (cats.length === 0) return <span className="text-[11.5px] text-stone-400">Előbb hozz létre kategóriát</span>;
  if (fixed) return <button onClick={() => onCreate(fixed)} className={`h-9 px-3.5 rounded-lg text-white text-[12px] font-medium inline-flex items-center gap-1.5 ${accent.solid} ${accent.solidHover}`}><Icon name="plus" size={13} />{label}</button>;
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className={`h-9 px-3.5 rounded-lg text-white text-[12px] font-medium inline-flex items-center gap-1.5 ${accent.solid} ${accent.solidHover}`}><Icon name="plus" size={13} />{label}<Icon name="down" size={12} /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 w-52 bg-white rounded-xl border border-stone-200 shadow-lg p-1">
            <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-stone-400 font-medium">Kategória</div>
            {cats.map((c) => (
              <button key={c.id} onClick={() => { setOpen(false); onCreate(c); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] text-stone-700 hover:bg-stone-50 text-left">
                <Icon name={c.icon || "box"} size={14} className="text-stone-400" />{c.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

window.SpecsPage = SpecsPage;
