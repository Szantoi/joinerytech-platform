// ──────────────────────────────────────────────────────────────────────────
// page-outsource-settings.jsx — Beállítások → Munkafolyamat → Bérmunka
//
//   A bérmunkára kiadható MŰVELET-TÍPUSOK kezelése (sim.outsourceOps). A
//   típusok hajtják a Gyártás-előkészítés „Bérmunka" fülét: melyik művelet
//   adható ki, melyik folyamat-epiket keresi (epicMatch), és mely partner-
//   kategóriákra szűr alapból. A típushoz tartozó `op`-kulcs köti a részleg
//   termelékenységi adatához (innen jön a részletes munkaidő-info a csomagba).
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateOS } = React;

function OutsourceSettings() {
  const s = useSim();
  const ops = s.outsourceOps || [];
  const [editId, setEditId] = useStateOS(null);

  const create = () => {
    const id = window.sim.addOutsourceOp({ label: "Új bérmunka típus", icon: "external", op: "custom", epicMatch: "", makerCats: [], desc: "" });
    setEditId(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[12.5px] font-semibold text-stone-900">Bérmunka típusok</div>
          <div className="text-[11px] text-stone-500 max-w-lg">Kiadható folyamat-elemek (pl. teljes szabászat, élzárás, festés, CNC). A Gyártás-előkészítésben ezek közül választható — akár több együtt, egy partnernek. Az <span className="font-medium">op-kulcs</span> köti a részleg termelékenységi adatához.</div>
        </div>
        <PrimaryBtn icon="plus" onClick={create}>Új típus</PrimaryBtn>
      </div>

      <div className="space-y-2.5">
        {ops.map((op) => <OutsourceOpRow key={op.id} op={op} editing={editId === op.id} onEdit={() => setEditId(editId === op.id ? null : op.id)} />)}
        {ops.length === 0 && (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-[12.5px] text-stone-500">
            Még nincs bérmunka típus. Hozz létre egyet az „Új típus" gombbal.
          </div>
        )}
      </div>
    </div>
  );
}

function OutsourceOpRow({ op, editing, onEdit }) {
  const s = useSim();
  const deps = window.MFG_DEPARTMENTS || [];
  const partners = React.useMemo(() => (window.MfgPrep ? window.MfgPrep.partnersForOps([op.op], op.makerCats) : []), [op, s]);
  const dep = deps.find((d) => d.op === op.op);

  const setF = (patch) => window.sim.updateOutsourceOp(op.id, patch);
  const toggleCat = (c) => {
    const has = (op.makerCats || []).includes(c);
    setF({ makerCats: has ? op.makerCats.filter((x) => x !== c) : [...(op.makerCats || []), c] });
  };

  return (
    <div className={`bg-white rounded-xl border transition ${editing ? "border-teal-300 shadow-sm" : "border-stone-200/80"}`}>
      {/* header row */}
      <button onClick={onEdit} className="w-full flex items-center gap-3 p-3.5 text-left">
        <div className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-stone-100 text-stone-600"><Icon name={op.icon || "external"} size={16} /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-stone-900 truncate">{op.label}</div>
          <div className="text-[11px] text-stone-500 truncate">{op.desc || "—"}</div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 h-6 rounded-full bg-stone-100 text-stone-600 text-[10.5px] font-medium">{partners.length} partner</span>
          <Icon name={editing ? "up" : "down"} size={15} className="text-stone-400" />
        </div>
      </button>

      {editing && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-stone-100 space-y-3">
          {/* label + icon */}
          <div className="grid sm:grid-cols-[1fr_auto] gap-3">
            <Field label="Megnevezés">
              <input value={op.label} onChange={(e) => setF({ label: e.target.value })}
                className="w-full h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-[12.5px] text-stone-800" />
            </Field>
            <Field label="Ikon">
              <div className="flex items-center gap-1">
                {(window.MFG_OP_ICONS || []).map((ic) => (
                  <button key={ic} onClick={() => setF({ icon: ic })}
                    className={`w-9 h-9 rounded-lg grid place-items-center border transition ${op.icon === ic ? "border-teal-400 bg-teal-50 text-teal-700" : "border-stone-200 text-stone-500 hover:bg-stone-50"}`}>
                    <Icon name={ic} size={15} />
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* op-key + epicMatch */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Részleg / op-kulcs" hint="A munkaidő-norma forrása.">
              <select value={op.op} onChange={(e) => setF({ op: e.target.value })}
                className="w-full h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-[12.5px] text-stone-800">
                {deps.map((d) => <option key={d.op} value={d.op}>{d.name} ({d.op})</option>)}
                <option value="custom">Egyéb (custom)</option>
              </select>
            </Field>
            <Field label="Epik-keresőszó" hint="A folyamat-epik címére illeszt (| = vagy).">
              <input value={op.epicMatch || ""} onChange={(e) => setF({ epicMatch: e.target.value })} placeholder="pl. szab|vágás"
                className="w-full h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-[12.5px] text-stone-800 font-mono" />
            </Field>
          </div>

          {/* desc */}
          <Field label="Leírás">
            <textarea value={op.desc || ""} onChange={(e) => setF({ desc: e.target.value })} rows={2}
              className="w-full px-2.5 py-2 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-700 resize-none" />
          </Field>

          {/* maker categories */}
          <Field label="Partner-kategóriák" hint="Alap szűrő a kiadásnál.">
            <div className="flex flex-wrap gap-1.5">
              {(window.MAKER_CATEGORIES || []).map((c) => {
                const on = (op.makerCats || []).includes(c);
                return (
                  <button key={c} onClick={() => toggleCat(c)}
                    className={`px-2.5 h-7 rounded-full text-[11px] font-medium border transition ${on ? "border-teal-400 bg-teal-50 text-teal-700" : "border-stone-200 text-stone-500 hover:bg-stone-50"}`}>
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* eligible partners + delete */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="text-[11px] text-stone-500 min-w-0 truncate">
              {dep ? <>Norma: <span className="text-stone-700 font-medium">{dep.name}</span> · </> : null}
              Vállalja: {partners.length ? partners.map((p) => p.name).join(", ") : "— (állíts be partner-képességet)"}
            </div>
            <button onClick={() => window.sim.removeOutsourceOp(op.id)}
              className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-rose-200 text-rose-600 text-[12px] font-medium hover:bg-rose-50">
              <Icon name="x" size={13} />Törlés
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">{label}</span>
        {hint && <span className="text-[10px] text-stone-400">· {hint}</span>}
      </div>
      {children}
    </label>
  );
}

Object.assign(window, { OutsourceSettings });
