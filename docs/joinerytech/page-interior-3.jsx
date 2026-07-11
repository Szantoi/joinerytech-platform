// ──────────────────────────────────────────────────────────────────────────
// page-interior-3.jsx — Belsőépítész INFORMÁCIÓS katalógus (típusok + tételek/
// minták): beszerzési ár, beszerzési forrás, megjegyzés, LÁTHATÓSÁG (megosztás
// a világok / partnerek között). NEM kereskedelmi — nincs eladási ár / árrés /
// partner-kedvezmény. ÚJ koncepció létrehozó űrlap + a koncepción belüli
// TERVEZETT TÉTELEK (terv-lista, ÁR NÉLKÜL — a díj külön számolódik a Díjazás fülön).
//
// Store-akciók (NÉVÜTKÖZÉS-MENTES): addIntType/updateIntType/removeIntType,
// addIntProduct/updateIntProduct/removeIntProduct, addConceptItem/…, createConcept.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useI3, useMemo: useMemoI3 } = React;

const TYPE_ICONS_I3 = ["box", "layers", "drop", "sparkle", "ruler", "briefcase", "cube", "wrench"];
const TYPE_COLORS_I3 = ["#a8703a", "#8a5a2b", "#5b8a72", "#2f7d8c", "#6b7280", "#9a8c5a", "#b4574d", "#7c6aa8"];
const UNITS_I3 = ["db", "fm", "m²", "klt", "óra"];
const VIS_I3 = () => window.INT_VISIBILITY || {};

// Interior katalógus → ItemBuilder-alak (Sales beépítéshez) ─────────────────
// A katalógus információs: a beszerzési ár szolgál önköltség-alapként; eladási
// árat a Sales-felhasználó ad. A privát tételek nem kerülnek át (csak protected/public).
function intCatalogForBuilder() {
  const s = window.sim.getState();
  const typeById = Object.fromEntries((s.intCatTypes || []).map((t) => [t.id, t]));
  return (s.intCatProducts || [])
    .filter((p) => (p.visibility || "private") !== "private")
    .map((p) => ({
      id: p.id, code: p.code || p.id, name: p.name, unit: p.unit || "db",
      price: 0, cost: p.purchasePrice != null ? p.purchasePrice : undefined,
      cat: (typeById[p.typeId] || {}).name || "Belsőépítészet", supplier: p.source || "Belsőépítész katalógus",
    }));
}

// Láthatóság-pirula (privát / védett / publikus)
function VisPill({ v, size = "sm" }) {
  const meta = VIS_I3()[v || "private"] || VIS_I3().private || {};
  const pad = size === "xs" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${pad} ${meta.bg} ${meta.fg}`}>
      <Icon name={meta.icon || "lock"} size={size === "xs" ? 10 : 12} />{meta.hu}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BELSŐÉPÍTÉSZ KATALÓGUS — típusok + termékek/minták
// ════════════════════════════════════════════════════════════════════════════
function InteriorCatalog() {
  return <WorldCatalog worldId="interior" />;
}
// ── Típus szerkesztő ───────────────────────────────────────────────────────
// ── InteriorTypesPanel — standalone tab content (exportálva WorldCatalog tabs-hoz)
function InteriorTypesPanel() {
  const sim = useSim();
  const types = sim.intCatTypes || [];
  const products = sim.intCatProducts || [];
  const [editType, setEditType] = useI3(null);
  const countByType = useMemoI3(() => {
    const m = {}; products.forEach((p) => { m[p.typeId] = (m[p.typeId] || 0) + 1; }); return m;
  }, [products]);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[16px] font-semibold tracking-tight text-stone-900">Katalógus-típusok</div>
          <div className="text-[11.5px] text-stone-500">Belsőépítészeti kategóriák (Konyhabútor, Gardrób stb.) — a tételek ezekbe sorolódnak.</div>
        </div>
        <div className="flex items-center gap-2">
          <PrimaryBtn icon="plus" onClick={() => setEditType({})}>Új típus</PrimaryBtn>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {types.map((t) => (
          <button key={t.id} onClick={() => setEditType(t)} className="text-left rounded-2xl border border-stone-200 bg-white p-4 hover:border-rose-300 hover:shadow-sm transition">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0 text-white" style={{ background: t.color }}><Icon name={t.icon} size={19} /></span>
              <div className="min-w-0 flex-1"><div className="text-[13px] font-semibold text-stone-900 truncate">{t.name}</div><div className="text-[10.5px] text-stone-400">alapegység: {t.unit}</div></div>
              <Icon name="settings" size={14} className="text-stone-300" />
            </div>
            <div className="text-[11.5px] text-stone-500 leading-snug">{t.blurb || "—"}</div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[10.5px] text-stone-400">{countByType[t.id] || 0} tétel</span>
              <span className="text-[10.5px] text-stone-400">egység: {t.unit}</span>
            </div>
          </button>
        ))}
        {types.length === 0 && <div className="col-span-full px-5 py-10 text-center text-[12px] text-stone-400 bg-white rounded-2xl border border-stone-200">Még nincs típus. Hozz létre egyet az „Új típus" gombbal.</div>}
      </div>
      <SlideOver open={!!editType} onClose={() => setEditType(null)} title={editType && editType.id ? "Típus szerkesztése" : "Új típus"} width={480}>
        {editType && <IntTypeEditor key={editType.id || "new"} type={editType} onSaved={() => setEditType(null)} onClose={() => setEditType(null)} />}
      </SlideOver>
    </div>
  );
}

// ── Típus szerkesztő ───────────────────────────────────────────────────────
function IntTypeEditor({ type, onSaved, onClose }) {
  const isNew = !type.id;
  const [form, setForm] = useI3(() => ({ name: type.name || "", unit: type.unit || "db", color: type.color || TYPE_COLORS_I3[0], icon: type.icon || "box", blurb: type.blurb || "" }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const ok = form.name.trim();
  const save = () => {
    if (!ok) return;
    const payload = { ...form };
    if (isNew) window.sim.addIntType(payload); else window.sim.updateIntType(type.id, payload);
    onSaved();
  };
  return (
    <>
      <div className="px-5 py-4 space-y-5">
        <div><SxLabel>Típus neve</SxLabel><SxInput value={form.name} onChange={(v) => set("name", v)} placeholder="pl. Konyhabútor" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <SxLabel>Alapegység</SxLabel>
            <select value={form.unit} onChange={(e) => set("unit", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-400">
              {UNITS_I3.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <SxLabel>Szín</SxLabel>
            <div className="flex items-center gap-1.5 flex-wrap">
              {TYPE_COLORS_I3.map((c) => <button key={c} onClick={() => set("color", c)} className={`w-7 h-7 rounded-lg border-2 transition ${form.color === c ? "border-stone-900 scale-110" : "border-white shadow-sm"}`} style={{ background: c }} />)}
            </div>
          </div>
        </div>
        <div>
          <SxLabel>Ikon</SxLabel>
          <div className="flex items-center gap-1.5 flex-wrap">
            {TYPE_ICONS_I3.map((ic) => (
              <button key={ic} onClick={() => set("icon", ic)} className={`w-9 h-9 rounded-lg border grid place-items-center transition ${form.icon === ic ? "border-rose-500 bg-rose-50 text-rose-700" : "border-stone-200 text-stone-500 hover:border-stone-300"}`}><Icon name={ic} size={16} /></button>
            ))}
          </div>
        </div>
        <div><SxLabel>Leírás</SxLabel><textarea value={form.blurb} onChange={(e) => set("blurb", e.target.value)} rows={2} placeholder="Rövid leírás…" className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400 resize-none" /></div>
      </div>
      <div className="px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center gap-2" style={{ paddingBottom: "max(env(safe-area-inset-bottom),12px)" }}>
        {!isNew && <GhostBtn onClick={() => { if (confirm("Biztosan törlöd ezt a típust?")) { window.sim.removeIntType(type.id); onSaved(); } }}>Törlés</GhostBtn>}
        <div className="flex-1" />
        <GhostBtn onClick={onClose}>Mégse</GhostBtn>
        <button onClick={save} disabled={!ok} className="h-9 px-4 rounded-lg text-[12.5px] font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5"><Icon name="check" size={14} />{isNew ? "Létrehozás" : "Mentés"}</button>
      </div>
    </>
  );
}

// ── Termék / minta szerkesztő ──────────────────────────────────────────────
function IntProductEditor({ product, types, onSaved, onClose }) {
  const isNew = !product.id;
  const t0 = types.find((t) => t.id === product.typeId) || types[0];
  const [form, setForm] = useI3(() => ({
    typeId: product.typeId || (t0 && t0.id) || null, code: product.code || "", name: product.name || "",
    desc: product.desc || "", unit: product.unit || (t0 && t0.unit) || "db",
    purchasePrice: product.purchasePrice != null ? String(product.purchasePrice) : "",
    source: product.source || "", notes: product.notes || "", visibility: product.visibility || "private",
    color: product.color || "#c9a878", tags: [...(product.tags || [])],
  }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const ok = form.name.trim();
  const save = () => {
    if (!ok) return;
    const payload = { ...form, purchasePrice: Number(form.purchasePrice) || 0 };
    if (isNew) window.sim.addIntProduct(payload); else window.sim.updateIntProduct(product.id, payload);
    onSaved();
  };
  const [tagDraft, setTagDraft] = useI3("");
  const addTag = () => { const t = tagDraft.trim(); if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]); setTagDraft(""); };
  const sampleId = product.sampleSlot || ("ipsmpl-new-" + (product.id || "tmp"));
  return (
    <>
      <div className="px-5 py-4 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <SxLabel>Típus</SxLabel>
            <select value={form.typeId || ""} onChange={(e) => { const tid = e.target.value; set("typeId", tid); const tt = types.find((x) => x.id === tid); if (tt && !form.unit) set("unit", tt.unit); }}
              className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-400">
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div><SxLabel>Kód</SxLabel><SxInput value={form.code} onChange={(v) => set("code", v)} placeholder="pl. KO-AL-T60" mono /></div>
          <div>
            <SxLabel>Egység</SxLabel>
            <select value={form.unit} onChange={(e) => set("unit", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-400">
              {UNITS_I3.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="col-span-2"><SxLabel>Név</SxLabel><SxInput value={form.name} onChange={(v) => set("name", v)} placeholder="pl. Alsószekrény tölgy front 60" /></div>
          <div className="col-span-2"><SxLabel>Leírás</SxLabel><textarea value={form.desc} onChange={(e) => set("desc", e.target.value)} rows={2} placeholder="Anyag, felület, vasalat…" className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400 resize-none" /></div>
          <div><SxLabel>Beszerzési ár (Ft / {form.unit})</SxLabel><SxInput value={form.purchasePrice} onChange={(v) => set("purchasePrice", v.replace(/[^0-9]/g, ""))} placeholder="pl. 9800" mono /></div>
          <div className="col-span-1"><SxLabel>Beszerzési forrás</SxLabel><SxInput value={form.source} onChange={(v) => set("source", v)} placeholder="pl. Egger / Forest" /></div>
          <div className="col-span-2"><SxLabel>Megjegyzés</SxLabel><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Beszerzési megjegyzés, rakt., minőség, alternatíva…" className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400 resize-none" /></div>
          <div className="col-span-2">
            <SxLabel>Láthatóság — megosztás</SxLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {(window.INT_VIS_ORDER || []).map((vk) => {
                const m = (window.INT_VISIBILITY || {})[vk] || {};
                const on = form.visibility === vk;
                return (
                  <button key={vk} type="button" onClick={() => set("visibility", vk)}
                    className={`rounded-xl border p-2.5 text-left transition ${on ? "border-rose-400 bg-rose-50/60" : "border-stone-200 hover:border-stone-300"}`}>
                    <div className="flex items-center gap-1.5"><Icon name={m.icon || "lock"} size={13} className={on ? "text-rose-600" : "text-stone-500"} /><span className="text-[12px] font-semibold text-stone-900">{m.hu}</span></div>
                    <div className="text-[10px] text-stone-500 leading-snug mt-1">{m.blurb}</div>
                  </button>
                );
              })}
            </div>
            <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-[10.5px] text-stone-500 mt-2">A <span className="font-medium text-stone-700">publikus</span> tétel közös törzsadat — minden világ látja (pl. Egger Halifax tölgy). A <span className="font-medium text-stone-700">védett</span> tételt a partnerek is látják, de a beszerzési ár nélkül. A <span className="font-medium text-stone-700">privát</span> csak a saját cégé.</div>
          </div>
          <div>
            <SxLabel>Minta színe</SxLabel>
            <div className="flex items-center gap-1.5">
              {(window.MATERIAL_SWATCHES || []).slice(0, 6).map((m) => <button key={m.code} onClick={() => set("color", m.color)} title={m.name} className={`w-7 h-7 rounded-lg border-2 ${form.color === m.color ? "border-stone-900 scale-110" : "border-white shadow-sm"}`} style={{ background: m.color }} />)}
              <label className="w-7 h-7 rounded-lg border border-dashed border-stone-300 grid place-items-center cursor-pointer text-stone-400 relative overflow-hidden"><Icon name="plus" size={12} /><input type="color" value={form.color} onChange={(e) => set("color", e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" /></label>
            </div>
          </div>
        </div>

        {/* minta kép */}
        <div>
          <SxLabel>Minta / referenciakép</SxLabel>
          <image-slot id={sampleId} placeholder="Húzd be a minta képét" shape="rounded" radius="12" class="block w-full" style={{ aspectRatio: "16 / 9" }}></image-slot>
        </div>

        {/* címkék */}
        <div>
          <SxLabel>Címkék</SxLabel>
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {form.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 px-2 h-7 rounded-full text-[11.5px] font-medium bg-rose-50 text-rose-700">
                {t}<button onClick={() => set("tags", form.tags.filter((x) => x !== t))} className="text-rose-400 hover:text-rose-700"><Icon name="x" size={11} /></button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Új címke…" className="flex-1 h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400" />
            <button onClick={addTag} disabled={!tagDraft.trim()} className="h-9 px-3 rounded-lg border border-stone-300 text-stone-700 text-[12px] font-medium hover:bg-stone-50 disabled:opacity-40 inline-flex items-center gap-1.5"><Icon name="plus" size={13} />Hozzáad</button>
          </div>
        </div>
      </div>
      <div className="px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center gap-2" style={{ paddingBottom: "max(env(safe-area-inset-bottom),12px)" }}>
        {!isNew && <GhostBtn onClick={() => { if (confirm("Biztosan törlöd ezt a terméket?")) { window.sim.removeIntProduct(product.id); onSaved(); } }}>Törlés</GhostBtn>}
        <div className="flex-1" />
        <GhostBtn onClick={onClose}>Mégse</GhostBtn>
        <button onClick={save} disabled={!ok} className="h-9 px-4 rounded-lg text-[12.5px] font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5"><Icon name="check" size={14} />{isNew ? "Hozzáadás" : "Mentés"}</button>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ÚJ KONCEPCIÓ — létrehozó űrlap (SlideOver body)
// ════════════════════════════════════════════════════════════════════════════
function ConceptCreateForm({ onCreated, onClose }) {
  const sim = useSim();
  const projects = sim.projects || [];
  const [form, setForm] = useI3({ name: "", customer: "", area: "", projectRef: "", brief: "" });
  const [rooms, setRooms] = useI3([{ name: "", area: "" }]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setRoom = (i, k, v) => setRooms((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRoom = () => setRooms((rs) => [...rs, { name: "", area: "" }]);
  const delRoom = (i) => setRooms((rs) => rs.filter((_, idx) => idx !== i));
  const ok = form.name.trim() && form.customer.trim();
  const save = () => {
    if (!ok) return;
    const cleanRooms = rooms.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), area: Number(r.area) || 0, note: "" }));
    const id = window.sim.createConcept({ ...form, projectRef: form.projectRef || null, rooms: cleanRooms });
    onCreated && onCreated(id);
  };
  return (
    <>
      <div className="px-5 py-4 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><SxLabel>Koncepció neve</SxLabel><SxInput value={form.name} onChange={(v) => set("name", v)} placeholder="pl. Petőfi u. 12. — Skandináv otthon" /></div>
          <div><SxLabel>Ügyfél</SxLabel><SxInput value={form.customer} onChange={(v) => set("customer", v)} placeholder="Megrendelő neve" /></div>
          <div><SxLabel>Alapterület (m²)</SxLabel><SxInput value={form.area} onChange={(v) => set("area", v.replace(/[^0-9]/g, ""))} placeholder="auto a helyiségekből" mono /></div>
          <div className="col-span-2">
            <SxLabel>Kapcsolódó projekt (opcionális)</SxLabel>
            <select value={form.projectRef} onChange={(e) => set("projectRef", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-400">
              <option value="">— nincs —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}
            </select>
          </div>
          <div className="col-span-2"><SxLabel>Brief — igényfelmérés</SxLabel><textarea value={form.brief} onChange={(e) => set("brief", e.target.value)} rows={3} placeholder="Stílus, hangulat, igények, korlátok…" className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400 resize-none" /></div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <SxLabel>Helyiségek</SxLabel>
            <button onClick={addRoom} className="text-[11.5px] text-rose-700 font-medium inline-flex items-center gap-1 hover:underline"><Icon name="plus" size={12} />Helyiség</button>
          </div>
          <div className="space-y-2">
            {rooms.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={r.name} onChange={(e) => setRoom(i, "name", e.target.value)} placeholder="pl. Konyha" className="flex-1 h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400" />
                <div className="flex items-center gap-1 w-24 shrink-0">
                  <input value={r.area} onChange={(e) => setRoom(i, "area", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="m²" inputMode="decimal" className="w-full h-9 px-2 rounded-lg border border-stone-200 text-[12.5px] tabular-nums text-right outline-none focus:border-rose-400" />
                  <span className="text-[11px] text-stone-400">m²</span>
                </div>
                <button onClick={() => delRoom(i)} className="w-9 h-9 grid place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"><Icon name="x" size={15} /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-rose-50/60 border border-rose-100 px-3 py-2.5 text-[11.5px] text-stone-600">A koncepció <span className="font-medium">brief</span> állapotban jön létre, egy „A — Alap irány" változattal. A változatokat, moodboardot és a tételes ajánlatot a részleteknél dolgozhatod ki.</div>
      </div>
      <div className="px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center gap-2" style={{ paddingBottom: "max(env(safe-area-inset-bottom),12px)" }}>
        <div className="flex-1" />
        <GhostBtn onClick={onClose}>Mégse</GhostBtn>
        <button onClick={save} disabled={!ok} className="h-9 px-4 rounded-lg text-[12.5px] font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5"><Icon name="check" size={14} />Koncepció létrehozása</button>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TERVEZETT TÉTELEK — a belsőépítész helyiségenként tervezi a tételeket a
// katalógusból. TERV-LISTA, ÁR NÉLKÜL — a tervezési díj külön, a „Díjazás" fülön
// számolódik (m² / óradíj / érték-% / fix). A díj-ajánlat onnan indul.
// ════════════════════════════════════════════════════════════════════════════
function ConceptQuoteTab({ concept }) {
  const sim = useSim();
  const live = (sim.concepts || []).find((c) => c.id === concept.id) || concept;
  const items = live.items || [];
  const [picker, setPicker] = useI3(false);
  const rooms = (live.rooms || []).map((r) => r.name);
  const grouped = useMemoI3(() => {
    const map = {};
    items.forEach((it) => { const k = it.room || "— besorolás nélkül —"; (map[k] = map[k] || []).push(it); });
    return map;
  }, [items]);

  return (
    <div className="space-y-3 max-w-3xl">
      <div className="rounded-lg bg-stone-50 border border-stone-200 px-3.5 py-2.5 text-[11.5px] text-stone-600 flex items-start gap-2">
        <Icon name="box" size={14} className="text-rose-600 mt-0.5 shrink-0" />
        <span>A belsőépítész itt <span className="font-medium text-stone-800">tervezi meg a bútorokat / tételeket</span> helyiségenként, a katalógusból. Ez <span className="font-medium text-stone-800">terv-lista, ár nélkül</span> — a tervezési díjat a <span className="font-medium text-stone-800">Díjazás</span> fülön határozod meg.</span>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <div className="text-[12px] font-semibold text-stone-900">Tervezett tételek <span className="text-stone-400 font-normal">· {items.length} db</span></div>
          <PrimaryBtn icon="plus" onClick={() => setPicker(true)}>Tétel hozzáadása</PrimaryBtn>
        </div>
        {Object.keys(grouped).map((room) => (
          <div key={room}>
            <div className="px-4 py-1.5 bg-stone-50/70 border-b border-stone-100 text-[10px] uppercase tracking-wide text-stone-500 font-medium flex items-center gap-1.5">
              <Icon name="ruler" size={11} />{room}<span className="text-stone-300">· {grouped[room].length}</span>
            </div>
            {grouped[room].map((it) => <QuoteLineRow key={it.id} conceptId={live.id} item={it} rooms={rooms} />)}
          </div>
        ))}
        {items.length === 0 && <div className="px-5 py-10 text-center text-[12px] text-stone-400">Még nincs tétel. A „Tétel hozzáadása" gombbal válassz a katalógusból, vagy adj egyedi sort.</div>}
      </Card>
      <div className="text-[11px] text-stone-400 px-1">A terv-lista a kivitelezés tartalmát rögzíti. A díjazás és a díj-ajánlat a <span className="font-medium text-stone-600">Díjazás</span> fülön készül.</div>

      <ProductPickerSheet open={picker} onClose={() => setPicker(false)} concept={live} rooms={rooms} />
    </div>
  );
}

// ── Egy terv-sor (szerkeszthető: helyiség, mennyiség, törlés — ÁR NÉLKÜL) ───
function QuoteLineRow({ conceptId, item, rooms }) {
  const it = item;
  return (
    <div className="px-4 py-3 border-b border-stone-50 last:border-0">
      {/* desktop grid */}
      <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_120px_44px] gap-3 items-center">
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-stone-900 truncate">{it.name}</div>
          {it.note && <div className="text-[10.5px] text-stone-400 truncate">{it.note}</div>}
        </div>
        <select value={it.room || ""} onChange={(e) => window.sim.updateConceptItem(conceptId, it.id, { room: e.target.value })} className="h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-rose-400">
          <option value="">— helyiség —</option>
          {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex items-center gap-1 justify-end">
          <input value={it.qty} onChange={(e) => window.sim.updateConceptItem(conceptId, it.id, { qty: e.target.value.replace(/[^0-9.]/g, "") })} inputMode="decimal" className="w-16 h-8 px-1.5 rounded-lg border border-stone-200 text-[11.5px] tabular-nums text-right outline-none focus:border-rose-400" />
          <span className="text-[10.5px] text-stone-400 w-7">{it.unit}</span>
        </div>
        <div className="flex justify-end"><button onClick={() => window.sim.removeConceptItem(conceptId, it.id)} className="w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="x" size={14} /></button></div>
      </div>
      {/* mobile */}
      <div className="md:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1"><div className="text-[13px] font-medium text-stone-900">{it.name}</div>{it.note && <div className="text-[10.5px] text-stone-400">{it.note}</div>}</div>
          <button onClick={() => window.sim.removeConceptItem(conceptId, it.id)} className="w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"><Icon name="x" size={14} /></button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <select value={it.room || ""} onChange={(e) => window.sim.updateConceptItem(conceptId, it.id, { room: e.target.value })} className="flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-rose-400">
            <option value="">— helyiség —</option>
            {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <input value={it.qty} onChange={(e) => window.sim.updateConceptItem(conceptId, it.id, { qty: e.target.value.replace(/[^0-9.]/g, "") })} inputMode="decimal" className="w-16 h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] tabular-nums text-right outline-none focus:border-rose-400" />
            <span className="text-[10.5px] text-stone-400">{it.unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Termékválasztó (katalógusból) + egyedi sor ─────────────────────────────
function ProductPickerSheet({ open, onClose, concept, rooms }) {
  const sim = useSim();
  const types = sim.intCatTypes || [];
  const products = sim.intCatProducts || [];
  const [q, setQ] = useI3("");
  const [custom, setCustom] = useI3(null); // null | {name,unit,price}
  const typeById = Object.fromEntries(types.map((t) => [t.id, t]));
  const defRoom = rooms[0] || "";

  const add = (p) => { window.sim.addConceptItem(concept.id, { productId: p.id, name: p.name, room: defRoom, unit: p.unit, qty: 1, note: "" }); };
  const filtered = products.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.code || "").toLowerCase().includes(q.toLowerCase()));
  const byType = types.map((t) => ({ t, list: filtered.filter((p) => p.typeId === t.id) })).filter((g) => g.list.length);

  const saveCustom = () => {
    if (!custom.name.trim()) return;
    window.sim.addConceptItem(concept.id, { productId: null, name: custom.name.trim(), room: defRoom, unit: custom.unit || "db", qty: Number(custom.qty) || 1, note: "egyedi" });
    setCustom(null);
  };

  return (
    <SlideOver open={open} onClose={onClose} title="Tétel hozzáadása" subtitle="Katalógusból vagy egyedi terv-sor" width={520}>
      <div className="px-5 py-4 space-y-4">
        <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-stone-50 border border-stone-200 text-stone-500">
          <Icon name="search" size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tétel keresése…" className="bg-transparent outline-none text-[12.5px] flex-1 min-w-0" />
        </div>

        {/* egyedi sor belépő */}
        {custom === null ? (
          <button onClick={() => setCustom({ name: "", unit: "db", qty: "1" })} className="w-full flex items-center gap-3 px-3 h-11 rounded-xl border border-dashed border-stone-300 text-stone-600 hover:border-rose-300 hover:text-rose-600">
            <span className="w-8 h-8 rounded-lg bg-stone-100 grid place-items-center shrink-0"><Icon name="plus" size={16} /></span>
            <span className="text-[12.5px] font-medium">Egyedi tétel (nem katalógusból)</span>
          </button>
        ) : (
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-2.5">
            <input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="Tétel megnevezése" className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400" />
            <div className="grid grid-cols-2 gap-2">
              <input value={custom.qty} onChange={(e) => setCustom({ ...custom, qty: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="menny." inputMode="decimal" className="h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] tabular-nums outline-none focus:border-rose-400" />
              <select value={custom.unit} onChange={(e) => setCustom({ ...custom, unit: e.target.value })} className="h-9 px-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-400">{UNITS_I3.map((u) => <option key={u}>{u}</option>)}</select>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <GhostBtn onClick={() => setCustom(null)}>Mégse</GhostBtn>
              <button onClick={saveCustom} disabled={!custom.name.trim()} className="h-9 px-3.5 rounded-lg text-[12px] font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5"><Icon name="plus" size={13} />Hozzáad</button>
            </div>
          </div>
        )}

        {/* katalógus csoportosítva */}
        {byType.map(({ t, list }) => (
          <div key={t.id}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
              <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">{t.name}</div>
            </div>
            <div className="space-y-1.5">
              {list.map((p) => (
                <button key={p.id} onClick={() => add(p)} className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl border border-stone-200 hover:border-rose-300 hover:bg-rose-50/40 text-left transition">
                  <span className="w-9 h-9 rounded-lg border border-stone-200 shrink-0" style={{ background: p.color }} />
                  <div className="min-w-0 flex-1"><div className="text-[12.5px] font-medium text-stone-900 truncate">{p.name}</div><div className="text-[10.5px] text-stone-400 truncate">{p.code} · {p.desc}</div></div>
                  <span className="text-[10px] text-stone-400 shrink-0">/ {p.unit}</span>
                  <span className="w-7 h-7 rounded-lg bg-rose-600 text-white grid place-items-center shrink-0"><Icon name="plus" size={15} /></span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {byType.length === 0 && <div className="px-3 py-8 text-center text-[12px] text-stone-400">Nincs találat a katalógusban.</div>}
      </div>
    </SlideOver>
  );
}

// ── Díjazás összegző (a koncepció-fejléchez) ───────────────────────────────
function conceptFeeLine(concept) {
  const amt = window.conceptFeeAmount ? window.conceptFeeAmount(concept) : 0;
  const label = window.feeMethodLabel ? window.feeMethodLabel((concept.fee || {}).method) : "—";
  return { amt, label };
}

Object.assign(window, {
  InteriorCatalog, InteriorTypesPanel, ConceptCreateForm, ConceptQuoteTab, ProductPickerSheet,
  intCatalogForBuilder, VisPill, conceptFeeLine,
});
