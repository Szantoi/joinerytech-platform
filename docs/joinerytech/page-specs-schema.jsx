// ──────────────────────────────────────────────────────────────────────────
// page-specs-schema.jsx — Kategória + mezőséma szerkesztő
// A kategória definiálja a Stílus és a Műszaki MEZŐSÉMÁJÁT (kötelező alap +
// tetszőleges extra propertik). Minden select/lista opció ár-SZORZÓt (×) és/vagy
// FIX felárat (+Ft) hordozhat. Anyag-slot mezők a sablon anyagát töltik ki.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateSC } = React;

const SPEC_ICON_OPTIONS = ["box", "layers", "cube", "ruler", "drop", "cpu", "wrench", "briefcase", "folder", "factory"];

const FIELD_KIND_LABEL = {
  select: "Választó", list: "Lista (több)", material: "Anyag-slot",
  number: "Szám", bool: "Igen/nem", color: "Szín", text: "Szöveg",
};

function genKey(label, idx) {
  const base = (label || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return base || ("f" + idx + Date.now().toString(36).slice(-3));
}

// One option row for select/list/material
function OptionRow({ opt, kind, onChange, onRemove }) {
  const matI = kind === "material" ? window.sim.materialInfo(opt.value) : null;
  const matName = matI && matI.known ? matI.name : null;
  const matPrice = matI && matI.known ? matI.price : null;
  return (
    <div className="flex items-center gap-1.5 py-1">
      {kind === "material" ? (
        <div className="flex-1 min-w-0 text-[11.5px] flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border border-black/10 shrink-0" style={{ background: matI ? matI.color : "#ccc" }} />
          <span className="font-medium text-stone-800 truncate">{matName || opt.value}</span>
          {matPrice != null && <span className="text-stone-400 ml-0.5 shrink-0">{matPrice.toLocaleString("hu-HU")} Ft/{(matI && matI.unit) || "m²"}</span>}
        </div>
      ) : (
        <input value={opt.value} onChange={(e) => onChange({ ...opt, value: e.target.value })}
          placeholder="Opció neve" className="flex-1 min-w-0 h-8 px-2 rounded-md border border-stone-200 text-[12px]" />
      )}
      {kind !== "material" && (
        <>
          <div className="flex items-center gap-0.5 shrink-0">
            <span className="text-[10px] text-stone-400">×</span>
            <input type="number" step="0.01" value={opt.mult ?? ""} onChange={(e) => onChange({ ...opt, mult: e.target.value === "" ? undefined : Number(e.target.value) })}
              placeholder="1.0" className="w-14 h-8 px-1.5 rounded-md border border-stone-200 text-[12px] tabular-nums" />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <span className="text-[10px] text-stone-400">+</span>
            <input type="number" step="100" value={opt.add ?? ""} onChange={(e) => onChange({ ...opt, add: e.target.value === "" ? undefined : Number(e.target.value) })}
              placeholder="0" className="w-20 h-8 px-1.5 rounded-md border border-stone-200 text-[12px] tabular-nums" />
          </div>
        </>
      )}
      <button onClick={onRemove} className="w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-500 shrink-0"><Icon name="x" size={13} /></button>
    </div>
  );
}

// One field card in the schema editor
function FieldCard({ field, idx, total, isTech, accent, onChange, onRemove, onMove }) {
  const [open, setOpen] = useStateSC(false);
  const hasOptions = field.kind === "select" || field.kind === "list" || field.kind === "material";
  const set = (patch) => onChange({ ...field, ...patch });
  const setOpt = (i, o) => set({ options: field.options.map((x, j) => j === i ? o : x) });
  const designMats = (window.sim.designMaterials && window.sim.designMaterials()) || [];
  const addOpt = () => set({ options: [...(field.options || []), field.kind === "material" ? { value: (designMats[0] && designMats[0].code) || "" } : { value: "" }] });
  const removeOpt = (i) => set({ options: field.options.filter((_, j) => j !== i) });
  const matChoices = designMats.map((m) => m.code).filter((c) => !(field.options || []).some((o) => o.value === c));

  return (
    <div className="rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center gap-2 p-2.5">
        <div className="flex flex-col">
          <button disabled={idx === 0} onClick={() => onMove(-1)} className="h-3.5 grid place-items-center text-stone-300 disabled:opacity-30 hover:text-stone-600"><Icon name="up" size={11} /></button>
          <button disabled={idx === total - 1} onClick={() => onMove(1)} className="h-3.5 grid place-items-center text-stone-300 disabled:opacity-30 hover:text-stone-600"><Icon name="down" size={11} /></button>
        </div>
        <input value={field.label} onChange={(e) => set({ label: e.target.value })} placeholder="Mező neve"
          className="flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-medium" />
        <select value={field.kind} onChange={(e) => { const k = e.target.value; set({ kind: k, options: (k === "select" || k === "list" || k === "material") ? (field.options || []) : undefined }); }}
          className="h-9 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white shrink-0">
          {window.SPEC_FIELD_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
        </select>
        <button onClick={() => set({ required: !field.required })} title="Kötelező"
          className={`h-9 px-2 rounded-lg text-[11px] font-medium shrink-0 border ${field.required ? `${accent.chipBg} ${accent.chipFg} ${accent.chipBd}` : "bg-white border-stone-200 text-stone-400"}`}>Köt.</button>
        {(hasOptions || field.kind === "bool" || isTech) && (
          <button onClick={() => setOpen((v) => !v)} className="w-9 h-9 grid place-items-center rounded-lg border border-stone-200 text-stone-500 shrink-0"><Icon name={open ? "up" : "down"} size={14} /></button>
        )}
        <button onClick={onRemove} className="w-9 h-9 grid place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-500 shrink-0"><Icon name="x" size={15} /></button>
      </div>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-stone-100 space-y-2">
          {isTech && (
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Szerep</span>
              <select value={field.role || ""} onChange={(e) => set({ role: e.target.value || undefined })}
                className="h-8 px-2 rounded-md border border-stone-200 text-[11.5px] bg-white">
                <option value="">— nincs —</option>
                <option value="precision">Pontosság (tűrés-sáv)</option>
                <option value="hardwareBrand">Vasalat-márka</option>
              </select>
              {field.role === "precision" && <span className="text-[10.5px] text-stone-400">precíz ×1.15 / standard ×1.0 / durva ×0.95</span>}
              {field.role === "hardwareBrand" && <span className="text-[10.5px] text-stone-400">a vasalat ára a katalógusból, márka szerint</span>}
            </div>
          )}
          {field.kind === "material" && (
            <div className="text-[10.5px] text-stone-500">Anyag-slot kulcs: <input value={field.slot || ""} onChange={(e) => set({ slot: e.target.value })} placeholder="pl. body" className="h-7 px-2 rounded-md border border-stone-200 text-[11px] ml-1 w-24" /> <span className="text-stone-400">— a sablon ezt a tokent tölti ({"{slot}"})</span></div>
          )}
          {hasOptions && field.role !== "precision" && field.role !== "hardwareBrand" && (
            <div>
              {field.kind !== "material" && (
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-stone-400 font-medium pb-0.5">
                  <span className="flex-1">Opció</span><span className="w-14 text-center">×szorzó</span><span className="w-20 text-center">+felár</span><span className="w-7" />
                </div>
              )}
              {(field.options || []).map((o, i) => <OptionRow key={i} opt={o} kind={field.kind} onChange={(no) => setOpt(i, no)} onRemove={() => removeOpt(i)} />)}
              {field.kind === "material" ? (
                <>
                <div className="text-[10px] text-stone-400 mt-0.5 mb-1 flex items-center gap-1"><Icon name="info" size={11} /> Az anyagok a <span className="font-medium text-stone-500">katalógusból</span> (Lapanyag) választhatók — új anyagot ott vegyél fel.</div>
                {matChoices.length > 0 ? (
                  <select value="" onChange={(e) => { if (e.target.value) set({ options: [...(field.options || []), { value: e.target.value }] }); }}
                    className="h-8 px-2 rounded-md border border-dashed border-stone-300 text-[11.5px] text-stone-600 bg-white">
                    <option value="">+ Anyag hozzáadása…</option>
                    {matChoices.map((c) => <option key={c} value={c}>{window.sim.materialInfo(c).name}</option>)}
                  </select>
                ) : (
                  <div className="text-[10.5px] text-stone-400">Minden katalógus-anyag hozzáadva.</div>
                )}
                </>
              ) : (
                <button onClick={addOpt} className="mt-1 h-8 px-2.5 rounded-md border border-dashed border-stone-300 text-[11.5px] text-stone-600 hover:bg-stone-50 inline-flex items-center gap-1"><Icon name="plus" size={12} />Opció</button>
              )}
            </div>
          )}
          {field.kind === "bool" && (
            <div className="flex items-center gap-3">
              <span className="text-[11.5px] text-stone-500">Ha bekapcsolva:</span>
              <label className="flex items-center gap-1 text-[11.5px]">× <input type="number" step="0.01" value={(field.onTrue && field.onTrue.mult) ?? ""} onChange={(e) => set({ onTrue: { ...field.onTrue, mult: e.target.value === "" ? undefined : Number(e.target.value) } })} placeholder="1.0" className="w-16 h-8 px-1.5 rounded-md border border-stone-200 tabular-nums" /></label>
              <label className="flex items-center gap-1 text-[11.5px]">+ <input type="number" step="100" value={(field.onTrue && field.onTrue.add) ?? ""} onChange={(e) => set({ onTrue: { ...field.onTrue, add: e.target.value === "" ? undefined : Number(e.target.value) } })} placeholder="0" className="w-20 h-8 px-1.5 rounded-md border border-stone-200 tabular-nums" /> Ft</label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Edits an array of fields (style or tech schema)
function FieldSchemaEditor({ fields, onChange, accent, isTech }) {
  const move = (i, dir) => {
    const j = i + dir; if (j < 0 || j >= fields.length) return;
    const next = [...fields]; const [it] = next.splice(i, 1); next.splice(j, 0, it); onChange(next);
  };
  const addField = () => onChange([...fields, { key: genKey("", fields.length), label: "", kind: "select", required: false, options: [] }]);
  return (
    <div className="space-y-2">
      {fields.length === 0 && <div className="text-[12px] text-stone-400 italic py-2">Nincs mező — adj hozzá lentebb.</div>}
      {fields.map((f, i) => (
        <FieldCard key={i} field={f} idx={i} total={fields.length} isTech={isTech} accent={accent}
          onChange={(nf) => onChange(fields.map((x, j) => j === i ? { ...nf, key: nf.key || genKey(nf.label, i) } : x))}
          onRemove={() => onChange(fields.filter((_, j) => j !== i))}
          onMove={(dir) => move(i, dir)} />
      ))}
      <button onClick={addField} className={`w-full h-10 rounded-xl border-2 border-dashed border-stone-300 text-[12.5px] font-medium text-stone-600 hover:bg-stone-50 inline-flex items-center justify-center gap-1.5`}>
        <Icon name="plus" size={15} />Új mező
      </button>
    </div>
  );
}

// Create / edit a category (identity + style schema + tech schema)
function CategorySheet({ category, onClose }) {
  const isNew = !category;
  const [name, setName] = useStateSC(category ? category.name : "");
  const [desc, setDesc] = useStateSC(category ? (category.desc || "") : "");
  const [icon, setIcon] = useStateSC(category ? category.icon : "box");
  const [color, setColor] = useStateSC(category ? category.color : "violet");
  const [styleFields, setStyleFields] = useStateSC(() => JSON.parse(JSON.stringify(category ? category.styleFields || [] : [])));
  const [techFields, setTechFields] = useStateSC(() => JSON.parse(JSON.stringify(category ? category.techFields || [] : [])));
  const [tab, setTab] = useStateSC("style");
  const accent = window.SPEC_ACCENT[color] || window.SPEC_ACCENT.violet;

  const save = () => {
    const payload = { name: name.trim() || "Névtelen kategória", desc, icon, color, styleFields, techFields };
    if (isNew) window.sim.addSpecCategory(payload);
    else { window.sim.updateSpecCategory(category.id, { name: payload.name, desc, icon, color }); window.sim.setSpecCategoryFields(category.id, "styleFields", styleFields); window.sim.setSpecCategoryFields(category.id, "techFields", techFields); }
    onClose();
  };

  return (
    <SlideOver open={true} onClose={onClose} title={isNew ? "Új kategória" : category.name}
      subtitle={isNew ? "Stílus + műszaki mezőséma definiálása" : "Kategória és mezőséma szerkesztése"} width={640}
      footer={
        <div className="flex items-center justify-between gap-3">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-stone-200 text-[12.5px] text-stone-600 hover:bg-stone-50">Mégse</button>
          <button onClick={save} className={`h-9 px-5 rounded-lg text-white text-[12.5px] font-semibold inline-flex items-center gap-2 ${accent.solid} ${accent.solidHover}`}><Icon name="check" size={14} />{isNew ? "Létrehozás" : "Mentés"}</button>
        </div>
      }>
      <div className="space-y-5">
        {/* Identity */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium block mb-1">Kategória neve</label>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="pl. Szekrény, Ajtó, Falpanel"
              className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px]" />
          </div>
          <div className="col-span-2">
            <label className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium block mb-1">Leírás</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Rövid leírás (opcionális)"
              className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px]" />
          </div>
          <div>
            <label className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium block mb-1">Ikon</label>
            <div className="flex flex-wrap gap-1">
              {SPEC_ICON_OPTIONS.map((ic) => (
                <button key={ic} onClick={() => setIcon(ic)} className={`w-9 h-9 grid place-items-center rounded-lg border ${icon === ic ? `${accent.solid} border-transparent text-white` : "bg-white border-stone-200 text-stone-500"}`}><Icon name={ic} size={16} /></button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium block mb-1">Szín</label>
            <div className="flex flex-wrap gap-1.5">
              {window.SPEC_ACCENT_KEYS.map((ck) => (
                <button key={ck} onClick={() => setColor(ck)} className={`w-9 h-9 rounded-lg grid place-items-center ${window.SPEC_ACCENT[ck].solid} ${color === ck ? "ring-2 ring-offset-2 ring-stone-400" : ""}`}>{color === ck && <Icon name="check" size={15} className="text-white" />}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Schema tabs */}
        <div>
          <div className="inline-flex p-0.5 rounded-xl bg-stone-100 gap-0.5 mb-3">
            <button onClick={() => setTab("style")} className={`h-8 px-3.5 rounded-lg text-[12px] font-medium ${tab === "style" ? "bg-violet-600 text-white" : "text-stone-600"}`}>Stílus mezők ({styleFields.length})</button>
            <button onClick={() => setTab("tech")} className={`h-8 px-3.5 rounded-lg text-[12px] font-medium ${tab === "tech" ? "bg-teal-600 text-white" : "text-stone-600"}`}>Műszaki mezők ({techFields.length})</button>
          </div>
          {tab === "style"
            ? <FieldSchemaEditor fields={styleFields} onChange={setStyleFields} accent={window.SPEC_ACCENT.violet} isTech={false} />
            : <FieldSchemaEditor fields={techFields} onChange={setTechFields} accent={window.SPEC_ACCENT.teal} isTech={true} />}
        </div>
      </div>
    </SlideOver>
  );
}

Object.assign(window, { CategorySheet, FieldSchemaEditor, SPEC_ICON_OPTIONS, FIELD_KIND_LABEL });
