// ══════════════════════════════════════════════════════════════════════════════
// catalog-manager.jsx — Beállítások → Katalógus
//
//   Store-backed (window.sim) catalog manager. Replaces the old local-state
//   CatalogPanel. Two views:
//     • Tételek    — list / create / edit catalog items. Each item inherits its
//                    category's TYPED property fields (text / number+unit /
//                    select / bool / date / color), carries tags, and can be
//                    flagged for the shop (with webshop fields).
//     • Kategóriák — hierarchical category tree; each category defines typed
//                    fields that flow down to child categories and items.
//
//   Loaded AFTER page-settings2.jsx so this window.CatalogPanel wins.
// ══════════════════════════════════════════════════════════════════════════════
const { useState: useCM, useMemo: useMemoCM, useEffect: useEffectCM } = React;

const CM_FIELD_TYPES = [
  { t: "text",   label: "Szöveg" },
  { t: "number", label: "Szám + mértékegység" },
  { t: "select", label: "Választó (legördülő)" },
  { t: "bool",   label: "Igen / Nem" },
  { t: "date",   label: "Dátum" },
  { t: "color",  label: "Szín" },
];
const CM_TYPE_LABEL = Object.fromEntries(CM_FIELD_TYPES.map((x) => [x.t, x.label]));
const CM_COLORS = ["#a8703a", "#8a5a2b", "#5b8a72", "#2f7d8c", "#6b7280", "#9a8c5a", "#b4574d", "#7c6aa8"];
const CM_TINTS = [
  { v: "from-amber-200 to-amber-100", label: "Borostyán" },
  { v: "from-stone-200 to-stone-100", label: "Kő" },
  { v: "from-teal-100 to-stone-100", label: "Türkiz" },
  { v: "from-orange-200 to-amber-100", label: "Narancs" },
  { v: "from-stone-300 to-stone-100", label: "Grafit" },
];

// ── Láthatóság (4 szint) ───────────────────────────────────────────────────
const CM_VISIBILITY = [
  { v: "public",     label: "Nyilvános",         sub: "Vevők és B2B partnerek látják",  dot: "bg-emerald-500", fg: "text-emerald-700", bg: "bg-emerald-50 border-emerald-300" },
  { v: "protected",  label: "Védett",             sub: "Engedélyezett partnerek látják", dot: "bg-amber-500",   fg: "text-amber-700",   bg: "bg-amber-50 border-amber-300" },
  { v: "private",    label: "Privát",             sub: "Csak saját cégen belül",         dot: "bg-stone-500",   fg: "text-stone-700",   bg: "bg-stone-100 border-stone-300" },
  { v: "world-only", label: "Világ-korlátozott",  sub: "Csak megadott világok",          dot: "bg-sky-500",     fg: "text-sky-700",     bg: "bg-sky-50 border-sky-300" },
];
const CM_VIS_MAP = Object.fromEntries(CM_VISIBILITY.map((x) => [x.v, x]));

// ── Cikkszám-típus (kötelező a piszkozathoz) ──────────────────────────────
const CM_KINDS = [
  { v: "material", label: "Anyag" },
  { v: "hardware", label: "Vasalat" },
  { v: "service",  label: "Szolgáltatás" },
  { v: "product",  label: "Késztermék" },
];
// ── Cikkszám-életciklus státusz (megjelenítés) ────────────────────────────
const CM_STATUS = {
  draft:      { label: "Piszkozat",        dot: "bg-stone-400",   fg: "text-stone-600",   bg: "bg-stone-100 border-stone-300" },
  incomplete: { label: "Hiányos",          dot: "bg-amber-500",   fg: "text-amber-700",   bg: "bg-amber-50 border-amber-300" },
  review:     { label: "Jóváhagyásra vár", dot: "bg-sky-500",     fg: "text-sky-700",     bg: "bg-sky-50 border-sky-300" },
  active:     { label: "Aktív",            dot: "bg-emerald-500", fg: "text-emerald-700", bg: "bg-emerald-50 border-emerald-300" },
  rejected:   { label: "Elutasítva",       dot: "bg-red-500",     fg: "text-red-700",     bg: "bg-red-50 border-red-300" },
  archived:   { label: "Archivált",        dot: "bg-stone-400",   fg: "text-stone-500",   bg: "bg-stone-100 border-stone-300" },
};
function CMStatusBadge({ status, size = "sm" }) {
  const m = CM_STATUS[status || "active"] || CM_STATUS.active;
  const pad = size === "lg" ? "px-2.5 py-1 text-[11.5px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${pad} ${m.bg} ${m.fg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
    </span>
  );
}
window.CM_STATUS = CM_STATUS;
window.CMStatusBadge = CMStatusBadge;
const CM_WORLDS = [
  { id: "production",  label: "Gyártás" },
  { id: "sales",       label: "Értékesítés" },
  { id: "procurement", label: "Beszerzés" },
  { id: "design",      label: "Tervezés" },
  { id: "interior",    label: "Belsőépítészet" },
  { id: "projects",    label: "Projektek" },
  { id: "warehouse",   label: "Raktár" },
  { id: "shopfloor",   label: "Üzem" },
  { id: "shop",        label: "Kereskedelem" },
  { id: "trade",       label: "Trade" },
];
const CM_WORLD_MAP = Object.fromEntries(CM_WORLDS.map((w) => [w.id, w]));

function CMVisBadge({ v }) {
  const cfg = CM_VIS_MAP[v] || CM_VIS_MAP.private;
  return (
    <span className={`inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.fg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Mezőszintű láthatóság — drag-drop bucket UI ──────────────────────────
const CM_FIELD_DEFS = [
  { key: "price",     label: "Ár",              icon: "•" },
  { key: "supplier",  label: "Szállító",        icon: "•" },
  { key: "props",     label: "Tulajdonságok",   icon: "•" },
  { key: "suppliers", label: "Szállítói lista", icon: "•" },
];

const CM_BUCKETS = [
  { id: null,        label: "Nincs korlátozás", sub: "Tétel szintje érvényes", dotCls: "bg-stone-300",   ringCls: "ring-stone-200",  bg: "bg-stone-50",   border: "border-stone-200" },
  { id: "public",    label: "Nyilvános",         sub: "Vevők is látják",        dotCls: "bg-emerald-500", ringCls: "ring-emerald-200", bg: "bg-emerald-50", border: "border-emerald-200" },
  { id: "protected", label: "Védett",            sub: "Enged. partnerek",       dotCls: "bg-amber-400",   ringCls: "ring-amber-200",  bg: "bg-amber-50",   border: "border-amber-200" },
  { id: "private",   label: "Privát",            sub: "Csak belső",             dotCls: "bg-stone-500",   ringCls: "ring-stone-300",  bg: "bg-stone-100",  border: "border-stone-300" },
  { id: "world-only",label: "Világ-korl.",       sub: "Megadott világok",       dotCls: "bg-sky-500",     ringCls: "ring-sky-200",    bg: "bg-sky-50",     border: "border-sky-200" },
];

function CMFieldVisBuckets({ fieldVis, fieldAllowedWorlds, onSetVis, onToggleWorld }) {
  const [dragging, setDragging] = useCM(null);
  const [dragOver, setDragOver] = useCM(null);

  const getBucket = (key) => fieldVis[key] !== undefined ? fieldVis[key] : null;

  // Which bucket has world-only fields?
  const worldOnlyFields = CM_FIELD_DEFS.filter((f) => getBucket(f.key) === "world-only");

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold mb-1.5">Mezőszintű láthatóság</div>
      <div className="text-[11px] text-stone-400 mb-3">Húzd a mezőket a kívánt láthatósági szintbe. Ha egy világ nem fér hozzá, a mező nem jelenik meg a listájában.</div>

      {/* Bucket columns */}
      <div className="grid grid-cols-5 gap-1.5">
        {CM_BUCKETS.map((bucket) => {
          const inBucket = CM_FIELD_DEFS.filter((f) => getBucket(f.key) === bucket.id);
          const isOver = dragOver === String(bucket.id);
          return (
            <div key={String(bucket.id)}
              onDragOver={(e) => { e.preventDefault(); setDragOver(String(bucket.id)); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => { e.preventDefault(); if (dragging) onSetVis(dragging, bucket.id); setDragging(null); setDragOver(null); }}
              className={`rounded-xl border-2 border-dashed min-h-[90px] p-2 flex flex-col gap-1.5 transition-all ${isOver ? "scale-[1.02] " + bucket.border + " " + bucket.bg : "border-stone-200 bg-stone-50/40"}`}>
              {/* Bucket header */}
              <div className="flex items-center gap-1.5 pb-1 border-b border-stone-100">
                <span className={`w-2 h-2 rounded-full shrink-0 ${bucket.dotCls}`} />
                <span className="text-[10px] font-semibold text-stone-600 leading-tight">{bucket.label}</span>
              </div>
              {/* Field chips */}
              {inBucket.map((f) => (
                <div key={f.key}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragging(f.key); }}
                  onDragEnd={() => { setDragging(null); setDragOver(null); }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border shadow-sm cursor-grab active:cursor-grabbing text-[11px] font-medium text-stone-700 select-none transition-opacity ${dragging === f.key ? "opacity-40" : "hover:border-stone-300"} ${bucket.border}`}>
                  <span className="text-stone-300 text-[10px]">⠿</span>
                  {f.label}
                </div>
              ))}
              {inBucket.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-[9.5px] text-stone-300">—</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* World selector — csak ha van world-only mező */}
      {worldOnlyFields.length > 0 && (
        <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/40 px-4 py-3">
          <div className="text-[10.5px] font-semibold text-sky-700 mb-2">Világ-korlátozott mezők — engedélyezett világok:</div>
          {worldOnlyFields.map((f) => (
            <div key={f.key} className="mb-2.5 last:mb-0">
              <div className="text-[10.5px] text-sky-600 font-medium mb-1.5">{f.label}:</div>
              <div className="flex flex-wrap gap-1.5">
                {CM_WORLDS.map((w) => {
                  const on = ((fieldAllowedWorlds || {})[f.key] || []).includes(w.id);
                  return (
                    <button key={w.id} onClick={() => onToggleWorld(f.key, w.id)}
                      className={`px-2.5 h-6 rounded-full text-[10.5px] font-medium border transition ${on ? "bg-sky-600 border-sky-600 text-white" : "bg-white border-sky-200 text-sky-700 hover:border-sky-400"}`}>
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── World-extension accordion (per world) ─────────────────────────────────
function CMWorldExtSection({ worldExt, onChange }) {
  const [open, setOpen] = useCM(null);
  const entries = Object.entries(worldExt || {});
  if (entries.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold mb-2">Világi kiterjesztések</div>
      <div className="space-y-1.5">
        {entries.map(([worldId, data]) => {
          const wl = CM_WORLD_MAP[worldId];
          const isOpen = open === worldId;
          return (
            <div key={worldId} className="rounded-xl border border-stone-200 overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : worldId)}
                className="w-full px-4 py-2.5 flex items-center gap-2.5 bg-stone-50/60 hover:bg-stone-50 text-left">
                <span className="flex-1 text-[12px] font-medium text-stone-800">{wl ? wl.label : worldId}</span>
                <span className="text-[10.5px] text-stone-400">{Object.keys(data || {}).length} mező</span>
                <Icon name={isOpen ? "chevron-up" : "chevron"} size={13} className="text-stone-400" />
              </button>
              {isOpen && (
                <div className="px-4 py-3 border-t border-stone-100 space-y-2.5">
                  <CMWorldExtEditor worldId={worldId} data={data} onChange={(d) => onChange(worldId, d)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CMWorldExtEditor({ worldId, data, onChange }) {
  // Specialized editor for known world schemas; falls back to generic key-value
  if (worldId === "warehouse") {
    // Raktáradat szerkesztő
    const wh = data || {};
    const trend = wh.onHand != null && wh.min != null
      ? (wh.onHand <= 0 ? "critical" : wh.onHand < wh.min ? (wh.onHand < wh.min / 2 ? "critical" : "low") : "ok")
      : null;
    const trendLabel = { ok: "Rendben", low: "Alacsony", critical: "Kritikus" };
    const trendCls   = { ok: "text-teal-700 bg-teal-50", low: "text-amber-700 bg-amber-50", critical: "text-rose-700 bg-rose-50" };
    return (
      <div className="space-y-3">
        {trend && (
          <div className={`inline-flex items-center gap-1.5 text-[10.5px] px-2.5 py-1 rounded-full font-medium ${trendCls[trend]}`}>
            <span className={`w-2 h-2 rounded-full ${trend === "ok" ? "bg-teal-500" : trend === "low" ? "bg-amber-500" : "bg-rose-500"}`} />
            Készlet állapot: {trendLabel[trend]}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {[
            { k: "onHand",   label: "Készleten",    type: "number", placeholder: "0" },
            { k: "min",      label: "Min. szint",   type: "number", placeholder: "0" },
            { k: "reserved", label: "Foglalt",      type: "number", placeholder: "0" },
          ].map((f) => (
            <div key={f.k} className="grid grid-cols-[90px_1fr] gap-2 items-center col-span-1">
              <span className="text-[11.5px] text-stone-500">{f.label}</span>
              <input type={f.type} value={wh[f.k] ?? ""} placeholder={f.placeholder} min={0}
                onChange={(e) => onChange({ ...wh, [f.k]: Number(e.target.value) || 0 })}
                className="h-8 px-2 rounded-lg border border-stone-200 text-[12px] tabular-nums outline-none focus:border-teal-500" />
            </div>
          ))}
          <div className="grid grid-cols-[90px_1fr] gap-2 items-center col-span-2">
            <span className="text-[11.5px] text-stone-500">Pozíció</span>
            <input value={wh.location ?? ""} placeholder="pl. R3-A2"
              onChange={(e) => onChange({ ...wh, location: e.target.value })}
              className="h-8 px-2 rounded-lg border border-stone-200 text-[12px] font-mono outline-none focus:border-teal-500" />
          </div>
        </div>
      </div>
    );
  }
  if (worldId === "design" && data && data.brands) {
    // Hardware brand prices
    const brands = ["Blum", "Hettich", "GTV", "Vegyes"];
    return (
      <div>
        <div className="text-[10.5px] text-stone-500 mb-2">Márkaárak (Ft / egység)</div>
        <div className="grid grid-cols-2 gap-2">
          {brands.map((b) => (
            <div key={b} className="flex items-center gap-2">
              <span className="text-[11.5px] text-stone-600 w-16 shrink-0">{b}</span>
              <input type="number" value={(data.brands || {})[b] || ""} min={0}
                onChange={(e) => onChange({ ...data, brands: { ...(data.brands || {}), [b]: Number(e.target.value) || 0 } })}
                className="flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[12px] tabular-nums outline-none focus:border-teal-500" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (worldId === "interior" && data) {
    // Interior product fields
    const fields = [
      { k: "typeId", label: "Típus-id", readOnly: true },
      { k: "desc",   label: "Leírás" },
      { k: "source", label: "Forrás" },
      { k: "notes",  label: "Megjegyzés" },
    ];
    return (
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.k} className="grid grid-cols-[90px_1fr] gap-2 items-center">
            <span className="text-[11.5px] text-stone-500">{f.label}</span>
            {f.readOnly
              ? <span className="text-[11.5px] font-mono text-stone-400">{data[f.k] || "—"}</span>
              : <input value={data[f.k] || ""} onChange={(e) => onChange({ ...data, [f.k]: e.target.value })}
                  className="h-8 px-2 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-teal-500" />}
          </div>
        ))}
        <div className="grid grid-cols-[90px_1fr] gap-2 items-center">
          <span className="text-[11.5px] text-stone-500">Szín</span>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-lg border border-stone-200 shrink-0" style={{ background: data.color || "#c9a878" }} />
            <input type="color" value={data.color || "#c9a878"} onChange={(e) => onChange({ ...data, color: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
            <span className="text-[10.5px] text-stone-400">{data.color || "#c9a878"}</span>
          </div>
        </div>
      </div>
    );
  }
  // Generic: JSON textarea
  const [raw, setRaw] = useCM(() => JSON.stringify(data || {}, null, 2));
  const tryParse = () => { try { onChange(JSON.parse(raw)); } catch {} };
  return (
    <div>
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} onBlur={tryParse} rows={5}
        className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[11px] font-mono outline-none focus:border-teal-500 resize-none" />
      <div className="text-[10px] text-stone-400 mt-1">Szerkesztés után kattints máshová a mentéshez.</div>
    </div>
  );
}

function cmFlattenCats(cats, parentId = null, depth = 0, out = []) {
  cats.filter((c) => (c.parentId || null) === parentId).forEach((c) => {
    out.push({ ...c, depth });
    cmFlattenCats(cats, c.id, depth + 1, out);
  });
  return out;
}
function cmDescendantIds(cats, id) {
  const out = [id];
  const walk = (pid) => cats.filter((c) => c.parentId === pid).forEach((c) => { out.push(c.id); walk(c.id); });
  walk(id);
  return out;
}

// ── Typed field control ─────────────────────────────────────────────────────
function CMFieldControl({ field, value, onChange }) {
  if (field.type === "number") {
    return (
      <div className="flex items-center gap-2">
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))} inputMode="decimal" placeholder="0"
          className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] tabular-nums outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        {field.unit && <span className="text-[12px] text-stone-500 shrink-0">{field.unit}</span>}
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500">
        <option value="">— válassz —</option>
        {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.type === "bool") {
    const on = value === true || value === "true";
    return (
      <button onClick={() => onChange(!on)}
        className={`relative w-12 h-7 rounded-full transition ${on ? "bg-teal-600" : "bg-stone-300"}`}>
        <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
      </button>
    );
  }
  if (field.type === "date") {
    return (
      <input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500" />
    );
  }
  if (field.type === "color") {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {CM_COLORS.map((c) => (
          <button key={c} onClick={() => onChange(c)} title={c}
            className={`w-7 h-7 rounded-lg border-2 transition ${value === c ? "border-stone-900 scale-110" : "border-white shadow-sm"}`}
            style={{ background: c }} />
        ))}
        <label className="w-7 h-7 rounded-lg border border-dashed border-stone-300 grid place-items-center cursor-pointer text-stone-400 hover:border-teal-400 relative overflow-hidden">
          <Icon name="plus" size={13} />
          <input type="color" value={value || "#888888"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
      </div>
    );
  }
  // text
  return (
    <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="…"
      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
  );
}

// ── Tag picker (select existing + add new) ────────────────────────────────────
function CMTagPicker({ pool, selected, onChange }) {
  const [draft, setDraft] = useCM("");
  const toggle = (t) => onChange(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t]);
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    window.sim.addTag(t);
    if (!selected.includes(t)) onChange([...selected, t]);
    setDraft("");
  };
  const allTags = Array.from(new Set([...(pool || []), ...selected]));
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {allTags.map((t) => {
          const on = selected.includes(t);
          return (
            <button key={t} onClick={() => toggle(t)}
              className={`px-2.5 h-7 rounded-full text-[11.5px] font-medium border transition ${on ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"}`}>
              {t}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Új címke…" className="flex-1 h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500" />
        <button onClick={add} disabled={!draft.trim()}
          className="h-9 px-3 rounded-lg border border-stone-300 text-stone-700 text-[12px] font-medium hover:bg-stone-50 disabled:opacity-40 inline-flex items-center gap-1.5">
          <Icon name="plus" size={13} /> Hozzáad
        </button>
      </div>
    </div>
  );
}

// ── Category select (indented tree) ───────────────────────────────────────────
function CMCategorySelect({ cats, value, onChange, excludeIds = [], allowEmpty, emptyLabel = "— nincs (gyökér) —" }) {
  const flat = cmFlattenCats(cats);
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value || null)}
      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500">
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {flat.filter((c) => !excludeIds.includes(c.id)).map((c) => (
        <option key={c.id} value={c.id}>{"\u00A0\u00A0".repeat(c.depth) + (c.depth ? "└ " : "") + c.name}</option>
      ))}
    </select>
  );
}

// ── Variáns-szekció (öröklés + felülírás, variánsonkénti készlet) ──────────────
function CMVariantSection({ item }) {
  const sim = window.useSim();
  const isNew = !item.id;
  const live = isNew ? null : (sim.catalog || []).find((c) => c.id === item.id);
  const asVariant = live && live.variantOf;

  // helyi tengely-szerkesztő (commit gombbal, hogy ne ugorjon a fókusz)
  const [axes, setAxes] = useCM(() => (live && live.variantAxes ? JSON.parse(JSON.stringify(live.variantAxes)) : []));
  const [nv, setNv] = useCM({});

  if (isNew) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold mb-2">Variánsok</div>
        <div className="text-[11.5px] text-stone-400 bg-stone-50 rounded-lg px-3 py-2.5">Mentsd el előbb a tételt — utána vehetsz fel <b>méret / szín / anyag</b> variánsokat saját készlettel.</div>
      </div>
    );
  }

  if (asVariant) {
    const parent = (sim.catalog || []).find((c) => c.id === live.variantOf);
    return (
      <div>
        <div className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold mb-2">Variáns</div>
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3">
          <div className="text-[12.5px] text-stone-900">Ez a(z) <b>{parent ? parent.name : "—"}</b> variánsa: <b>{sim.variantLabel(live)}</b></div>
          <div className="text-[10.5px] text-stone-500 mt-1">A tulajdonságok a fő-tételtől <b>öröklődnek</b>; a saját ár és készlet felülírható. A készletet a Raktár kezeli.</div>
          {parent && <button onClick={() => window.navigateTo && window.navigateTo("settings", "catalog")} className="mt-2 text-[11px] text-violet-700 font-medium hover:text-violet-800 inline-flex items-center gap-1"><Icon name="arrow-right" size={12} />Fő-tétel: {parent.code}</button>}
        </div>
      </div>
    );
  }

  const variants = sim.itemVariants(item.id);
  const summary = sim.variantStockSummary(item.id);
  const setAxis = (i, patch) => setAxes((a) => a.map((x, j) => j === i ? { ...x, ...patch } : x));
  const addAxis = () => setAxes((a) => [...a, { key: "tul" + (a.length + 1), label: "", options: [] }]);
  const rmAxis = (i) => setAxes((a) => a.filter((_, j) => j !== i));
  const commitAxes = () => sim.setVariantAxes(item.id, axes.map((a) => ({ key: (a.key || a.label || "tul").trim(), label: (a.label || a.key || "").trim(), options: a.options })));
  const liveAxes = (live && live.variantAxes) || [];
  const canAdd = liveAxes.length > 0 && liveAxes.every((ax) => (nv[ax.key] || "").trim());
  const doAdd = () => {
    const values = {}; liveAxes.forEach((ax) => { values[ax.key] = nv[ax.key]; });
    sim.addVariant(item.id, values, nv.__price ? { price: nv.__price } : {});
    setNv((s) => { const c = { ...s }; liveAxes.forEach((ax) => delete c[ax.key]); delete c.__price; return c; });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold">Variánsok {variants.length > 0 && <span className="text-violet-500">· {variants.length}</span>}</div>
      </div>

      {/* Tengelyek (változó tulajdonságok) */}
      <div className="rounded-xl border border-stone-200 p-2.5 mb-2">
        <div className="text-[11px] text-stone-500 mb-1.5">Változó tulajdonságok (tengelyek) — pl. Hossz, Szín, Anyag. Az opciókat vesszővel válaszd el.</div>
        <div className="space-y-1.5">
          {axes.map((ax, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input value={ax.label} onChange={(e) => setAxis(i, { label: e.target.value, key: ax.key || e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="Tengely (pl. Hossz)"
                className="w-28 h-8 px-2 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-teal-500 bg-white" />
              <input value={(ax.options || []).join(", ")} onChange={(e) => setAxis(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="350 mm, 450 mm, 550 mm"
                className="flex-1 min-w-0 h-8 px-2 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-teal-500 bg-white" />
              <button onClick={() => rmAxis(i)} className="shrink-0 w-7 h-7 grid place-items-center rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-500"><Icon name="x" size={12} /></button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button onClick={addAxis} className="text-[11px] text-teal-700 font-medium hover:text-teal-800 inline-flex items-center gap-1"><Icon name="plus" size={12} />Tengely</button>
          <button onClick={commitAxes} className="text-[11px] text-white bg-teal-700 hover:bg-teal-800 rounded-lg px-2.5 h-7 font-medium">Tengelyek mentése</button>
        </div>
      </div>

      {/* Variáns-lista (mátrix, saját készlettel) */}
      {liveAxes.length > 0 && (
        <>
          {summary.length > 0 && (
            <div className="rounded-xl border border-stone-200 overflow-hidden mb-2">
              <div className="grid grid-cols-[1.4fr_1fr_auto_28px] gap-2 px-3 py-1.5 bg-stone-50/70 text-[10px] uppercase tracking-wide text-stone-400 font-medium">
                <div>Variáns</div><div>Cikkszám</div><div className="text-right">Készlet</div><div></div>
              </div>
              {summary.map((v) => (
                <div key={v.id} className="grid grid-cols-[1.4fr_1fr_auto_28px] gap-2 px-3 py-2 border-t border-stone-100 items-center">
                  <div className="text-[12px] text-stone-900 font-medium truncate">{v.label || "—"}</div>
                  <div className="font-mono text-[11px] text-stone-500 truncate">{v.code}</div>
                  <div className="text-right text-[12px] font-mono whitespace-nowrap"><span className={v.free <= v.min ? "text-rose-600 font-semibold" : "text-stone-800"}>{(+v.free.toFixed(2))}</span> <span className="text-stone-400 text-[10px]">{v.unit}</span></div>
                  <button onClick={() => sim.removeVariant(v.id)} className="w-7 h-7 grid place-items-center rounded-lg hover:bg-rose-50 text-stone-300 hover:text-rose-500"><Icon name="x" size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Új variáns */}
          <div className="rounded-xl border border-dashed border-stone-300 p-2.5">
            <div className="text-[11px] text-stone-500 mb-1.5">Új variáns — a fő-tétel tulajdonságait örökli; az ár felülírható.</div>
            <div className="flex flex-wrap items-end gap-1.5">
              {liveAxes.map((ax) => (
                <div key={ax.key}>
                  <label className="text-[9.5px] text-stone-400 block mb-0.5">{ax.label || ax.key}</label>
                  <select value={nv[ax.key] || ""} onChange={(e) => setNv((s) => ({ ...s, [ax.key]: e.target.value }))} className="h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-teal-500">
                    <option value="">—</option>
                    {(ax.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="text-[9.5px] text-stone-400 block mb-0.5">Ár (opc.)</label>
                <input type="number" value={nv.__price || ""} onChange={(e) => setNv((s) => ({ ...s, __price: e.target.value }))} placeholder={String(live.price || 0)}
                  className="w-20 h-8 px-2 rounded-lg border border-stone-200 text-[12px] text-right font-mono outline-none focus:border-teal-500 bg-white" />
              </div>
              <button onClick={doAdd} disabled={!canAdd} className={`h-8 px-3 rounded-lg text-[11.5px] font-medium ${canAdd ? "bg-violet-600 text-white hover:bg-violet-700" : "bg-stone-200 text-stone-400"}`}>Hozzáad</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Státusz / életciklus szekció a tétel-szerkesztőben ────────────────────
function CMStatusSection({ item, isNew, draftOk }) {
  const sim = window.useSim();
  if (isNew) {
    return (
      <div className="rounded-xl border border-sky-200 bg-sky-50/50 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <CMStatusBadge status="draft" size="lg" />
          <span className="text-[12px] text-stone-600">Új cikkszám <b>piszkozatként</b> jön létre</span>
        </div>
        <div className="text-[11px] text-stone-500 mt-1.5">Minimum: <b>megnevezés + kategória + típus</b>. Ezzel már lehet dolgozni (igénylés, raktár), de <b>ajánlatba / eladásba csak jóváhagyás után</b> kerülhet. {!draftOk && <span className="text-amber-600 font-medium">Tölts ki minden kötelező mezőt.</span>}</div>
      </div>
    );
  }
  const live = (sim.catalog || []).find((c) => c.id === item.id) || item;
  const status = live.status || "active";
  const comp = sim.catalogCompleteness(live);
  const canApprove = sim.hasPerm("catalog.approve");
  const flow = sim._catFlow[status] || [];
  const reasonGo = (to) => { const r = window.prompt(to === "rejected" ? "Elutasítás indoka:" : "Mi hiányzik / mit kell pótolni?"); if (r && r.trim()) sim.setCatalogStatus(item.id, to, { reason: r.trim() }); };

  const TRANS = {
    review:     { label: status === "incomplete" ? "Újraküldés jóváhagyásra" : "Beküldés jóváhagyásra", cls: "bg-sky-600 text-white hover:bg-sky-700", go: () => sim.setCatalogStatus(item.id, "review") },
    active:     { label: "Jóváhagyás", cls: "bg-emerald-600 text-white hover:bg-emerald-700", go: () => sim.setCatalogStatus(item.id, "active") },
    incomplete: { label: "Hiánypótlásra vissza", cls: "border border-amber-300 text-amber-700 hover:bg-amber-50", go: () => reasonGo("incomplete") },
    rejected:   { label: "Elutasítás", cls: "border border-red-300 text-red-700 hover:bg-red-50", go: () => reasonGo("rejected") },
    draft:      { label: status === "archived" ? "Visszaállítás piszkozatként" : "Vissza piszkozatba", cls: "border border-stone-200 text-stone-600 hover:bg-stone-50", go: () => sim.setCatalogStatus(item.id, "draft") },
    archived:   { label: "Archiválás", cls: "border border-stone-200 text-stone-500 hover:bg-stone-50", go: () => sim.setCatalogStatus(item.id, "archived") },
  };
  // Az átmenetek sorrendje (a fő művelet előre)
  const order = ["review", "active", "incomplete", "rejected", "draft", "archived"];
  const shown = order.filter((t) => flow.includes(t));

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <CMStatusBadge status={status} size="lg" />
          {live.approvedBy && status === "active" && <span className="text-[10.5px] text-stone-400">Jóváhagyta: {live.approvedBy}</span>}
        </div>
        {!comp.ready && status !== "active" && <span className="text-[10.5px] text-amber-600 font-medium">{comp.missing.length} hiányzó mező</span>}
      </div>
      {live.statusReason && (status === "incomplete" || status === "rejected") && (
        <div className="text-[11px] text-stone-600 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 mb-2"><b>Indok:</b> {live.statusReason}</div>
      )}
      {/* Completeness checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 mb-2.5">
        {comp.checks.map((c) => (
          <div key={c.key} className="flex items-center gap-1.5 text-[11px]">
            <span className={`w-4 h-4 rounded-full grid place-items-center shrink-0 ${c.ok ? "bg-emerald-100 text-emerald-600" : "bg-stone-200 text-stone-400"}`}>
              <Icon name={c.ok ? "check" : "x"} size={10} />
            </span>
            <span className={c.ok ? "text-stone-500" : "text-stone-700 font-medium"}>{c.label}</span>
          </div>
        ))}
      </div>
      {/* FSM action buttons */}
      <div className="flex flex-wrap gap-1.5">
        {shown.map((to) => {
          const tr = TRANS[to];
          const isApprove = to === "active";
          const disabled = isApprove && (!canApprove || !comp.ready);
          const tip = isApprove ? (!canApprove ? "Nincs jogosultság (catalog.approve)" : (!comp.ready ? `Hiányzó: ${comp.missing.join(", ")}` : "")) : "";
          return (
            <button key={to} onClick={tr.go} disabled={disabled} title={tip}
              className={`h-8 px-3 rounded-lg text-[11.5px] font-medium transition ${disabled ? "bg-stone-100 text-stone-300 cursor-not-allowed" : tr.cls}`}>
              {tr.label}
            </button>
          );
        })}
        {/* Lezárt (nem rejtett) jóváhagyás, ha még review előtt vagyunk */}
        {(status === "draft" || status === "incomplete") && (
          <button disabled title="Előbb jóváhagyásra kell beküldeni (fázis-ugrás tilos)"
            className="h-8 px-3 rounded-lg text-[11.5px] font-medium bg-stone-100 text-stone-300 cursor-not-allowed inline-flex items-center gap-1">
            <Icon name="lock" size={11} />Jóváhagyás
          </button>
        )}
      </div>
    </div>
  );
}

// ── Item editor (SlideOver body) ──────────────────────────────────────────────
function CMItemEditor({ item, cats, tags, onSaved, onClose }) {
  const isNew = !item.id;
  const [form, setForm] = useCM(() => ({
    code: item.code || "",
    name: item.name || "",
    kind: item.kind || "material",
    categoryId: item.categoryId || (cats[0] && cats[0].id) || null,
    unit: item.unit || "db",
    price: item.price != null ? String(item.price) : "",
    supplier: item.supplier || "",
    props: { ...(item.props || {}) },
    tags: [...(item.tags || [])],
    bom: [...(item.bom || [])],
    visibility: item.visibility || "private",
    allowedWorlds: [...(item.allowedWorlds || [])],
    worldExt: JSON.parse(JSON.stringify(item.worldExt || {})),
    fieldVis: JSON.parse(JSON.stringify(item.fieldVis || {})),
    fieldAllowedWorlds: JSON.parse(JSON.stringify(item.fieldAllowedWorlds || {})),
    shop: { enabled: false, price: "", priceGross: "", desc: "", leadDays: "14", stockMode: "order", tint: CM_TINTS[0].v, ...(item.shop || {}) },
  }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setProp = (key, v) => setForm((f) => ({ ...f, props: { ...f.props, [key]: v } }));
  const setBomLine = (i, patch) => setForm((f) => ({ ...f, bom: (f.bom || []).map((b, j) => j === i ? { ...b, ...patch } : b) }));
  const addBomLine = () => setForm((f) => ({ ...f, bom: [...(f.bom || []), { catalogItemId: "", qty: 1 }] }));
  const rmBomLine = (i) => setForm((f) => ({ ...f, bom: (f.bom || []).filter((_, j) => j !== i) }));
  const setShop = (k, v) => setForm((f) => ({ ...f, shop: { ...f.shop, [k]: v } }));
  const setWorldExt = (worldId, data) => setForm((f) => ({ ...f, worldExt: { ...f.worldExt, [worldId]: data } }));
  const toggleWorld = (wid) => set("allowedWorlds", form.allowedWorlds.includes(wid) ? form.allowedWorlds.filter((x) => x !== wid) : [...form.allowedWorlds, wid]);
  const setFieldVis = (fieldKey, vis) => setForm((f) => ({ ...f, fieldVis: { ...f.fieldVis, [fieldKey]: vis } }));
  const setFieldWorlds = (fieldKey, worlds) => setForm((f) => ({ ...f, fieldAllowedWorlds: { ...f.fieldAllowedWorlds, [fieldKey]: worlds } }));
  const toggleFieldWorld = (fieldKey, wid) => {
    const cur = (form.fieldAllowedWorlds[fieldKey] || []);
    setFieldWorlds(fieldKey, cur.includes(wid) ? cur.filter((x) => x !== wid) : [...cur, wid]);
  };

  const fields = useMemoCM(() => window.sim.categoryFields(form.categoryId), [form.categoryId]);
  const path = useMemoCM(() => window.sim.categoryPath(form.categoryId), [form.categoryId]);
  const bomItems = useMemoCM(() => (window.sim.getState().catalog || []).filter((c) => c.active !== false && c.id !== item.id), [item.id]);
  const bomById = useMemoCM(() => Object.fromEntries(bomItems.map((c) => [c.id, c])), [bomItems]);
  // Piszkozathoz a MINIMUM kötelező: megnevezés + kategória + típus. (A teljes
  // mezőkészletet a jóváhagyás kapuzza, nem a mentés.)
  const draftOk = form.name.trim() && form.categoryId && form.kind;
  const ok = isNew ? draftOk : (form.name.trim() && form.categoryId);

  const save = () => {
    if (!ok) return;
    const payload = {
      code: form.code.trim(), name: form.name.trim(), kind: form.kind, categoryId: form.categoryId,
      unit: form.unit, price: Number(form.price) || 0, supplier: form.supplier.trim(),
      props: form.props, tags: form.tags,
      bom: (form.bom || []).filter((b) => b && b.catalogItemId).map((b) => ({ catalogItemId: b.catalogItemId, qty: Number(b.qty) > 0 ? Number(b.qty) : 1 })),
      visibility: form.visibility || "private",
      allowedWorlds: form.allowedWorlds || [],
      worldExt: form.worldExt || {},
      fieldVis: form.fieldVis || {},
      fieldAllowedWorlds: form.fieldAllowedWorlds || {},
      shop: {
        enabled: !!form.shop.enabled,
        price: Number(form.shop.price) || Number(form.price) || 0,
        priceGross: Number(form.shop.priceGross) || Math.round((Number(form.shop.price) || Number(form.price) || 0) * 1.27),
        desc: (form.shop.desc || "").trim(),
        leadDays: Number(form.shop.leadDays) || 14,
        stockMode: form.shop.stockMode || "order",
        tint: form.shop.tint || CM_TINTS[0].v,
      },
    };
    // Új tétel → mindig PISZKOZAT (eladásba csak jóváhagyás után kerülhet).
    if (isNew) window.sim.addCatalogDraft(payload);
    else window.sim.updateCatalogItem(item.id, payload);
    onSaved();
  };

  return (
    <>
      <div className="px-5 py-4 space-y-5">
        {/* Státusz / életciklus */}
        <CMStatusSection item={item} isNew={isNew} draftOk={draftOk} />

        {/* Base fields */}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold mb-2">Alapadatok</div>
          <div className="grid grid-cols-2 gap-3">
            <div><SxLabel>Kód</SxLabel><SxInput value={form.code} onChange={(v) => set("code", v)} placeholder={isNew ? "auto, ha üres" : "pl. BK-018-2440"} mono /></div>
            <div><SxLabel>Név</SxLabel><SxInput value={form.name} onChange={(v) => set("name", v)} placeholder="pl. Bükk 18mm tábla" /></div>
            <div className="col-span-2">
              <SxLabel>Típus</SxLabel>
              <div className="flex flex-wrap gap-1.5">
                {CM_KINDS.map((k) => (
                  <button key={k.v} onClick={() => set("kind", k.v)}
                    className={`px-3 h-8 rounded-lg text-[12px] font-medium border transition ${form.kind === k.v ? "bg-stone-900 border-stone-900 text-white" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"}`}>
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <SxLabel>Kategória</SxLabel>
              <CMCategorySelect cats={cats} value={form.categoryId} onChange={(v) => set("categoryId", v)} />
              {path.length > 0 && <div className="text-[10.5px] text-stone-400 mt-1">{path.join(" › ")}</div>}
            </div>
            <div>
              <SxLabel>Egység</SxLabel>
              <select value={form.unit} onChange={(e) => set("unit", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white">
                {["tábla", "db", "fm", "m²", "kg", "csomag", "óra"].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div><SxLabel>Egységár (Ft)</SxLabel><SxInput value={form.price} onChange={(v) => set("price", v.replace(/[^0-9]/g, ""))} placeholder="9600" mono /></div>
            <div className="col-span-2"><SxLabel>Szállító</SxLabel><SxInput value={form.supplier} onChange={(v) => set("supplier", v)} placeholder="Szállító neve" /></div>
          </div>
        </div>

        {/* Láthatóság */}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold mb-2">Láthatóság</div>
          <div className="grid grid-cols-2 gap-2">
            {CM_VISIBILITY.map((cfg) => (
              <button key={cfg.v} onClick={() => set("visibility", cfg.v)}
                className={`rounded-xl border-2 px-3 py-2.5 text-left transition ${form.visibility === cfg.v ? "border-teal-600 bg-teal-50/40" : "border-stone-200 hover:border-stone-300 bg-white"}`}>
                <div className={`flex items-center gap-1.5 text-[12px] font-semibold ${form.visibility === cfg.v ? "text-teal-800" : cfg.fg}`}>
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}
                </div>
                <div className="text-[10.5px] text-stone-500 mt-0.5">{cfg.sub}</div>
              </button>
            ))}
          </div>
          {form.visibility === "world-only" && (
            <div className="mt-2.5">
              <div className="text-[10.5px] text-stone-500 mb-1.5">Engedélyezett világok:</div>
              <div className="flex flex-wrap gap-1.5">
                {CM_WORLDS.map((w) => {
                  const on = (form.allowedWorlds || []).includes(w.id);
                  return (
                    <button key={w.id} onClick={() => toggleWorld(w.id)}
                      className={`px-2.5 h-7 rounded-full text-[11.5px] font-medium border transition ${on ? "bg-sky-600 border-sky-600 text-white" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"}`}>
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Typed category properties */}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold mb-2">
            Tulajdonságok {fields.length > 0 && <span className="text-stone-300">· a kategória sémája szerint</span>}
          </div>
          {fields.length === 0 ? (
            <div className="text-[12px] text-stone-400 bg-stone-50 rounded-lg px-3 py-3">
              Ennek a kategóriának nincs definiált mezője. Adj hozzá mezőket a <span className="font-medium text-stone-500">Kategóriák</span> nézetben.
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key} className="grid grid-cols-[130px_1fr] gap-3 items-center">
                  <div className="text-[12px] text-stone-600">
                    {f.label}
                    <span className="block text-[9.5px] text-stone-300 uppercase tracking-wide">{CM_TYPE_LABEL[f.type]}</span>
                  </div>
                  <CMFieldControl field={f} value={form.props[f.key]} onChange={(v) => setProp(f.key, v)} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold mb-2">Címkék</div>
          <CMTagPicker pool={tags} selected={form.tags} onChange={(v) => set("tags", v)} />
        </div>

        {/* Összeállítás (multi-level BOM) — a tétel komponensekből áll */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold">
              Összeállítás (BOM) {(form.bom || []).length > 0 && <span className="text-teal-500">· {(form.bom || []).length} komponens</span>}
            </div>
            <button onClick={addBomLine} className="inline-flex items-center gap-1 text-[11px] text-teal-700 font-medium hover:text-teal-800"><Icon name="plus" size={13} />Komponens</button>
          </div>
          {(form.bom || []).length === 0 ? (
            <div className="text-[11.5px] text-stone-400 bg-stone-50 rounded-lg px-3 py-2.5">Atomi tétel (nincs összeállítás). Komponensekkel ez a tétel <b>összeállítássá</b> válik — pl. egy szekrény = lap + sín + pánt + láb. A beszerzés a komponensekre bontva rendel.</div>
          ) : (
            <div className="space-y-1.5">
              {(form.bom || []).map((b, i) => {
                const c = bomById[b.catalogItemId];
                const isAssy = c && Array.isArray(c.bom) && c.bom.length > 0;
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <select value={b.catalogItemId} onChange={(e) => setBomLine(i, { catalogItemId: e.target.value })} className="flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-teal-500">
                      <option value="">— válassz komponenst —</option>
                      {bomItems.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.code}){Array.isArray(x.bom) && x.bom.length ? " ⊞" : ""}</option>)}
                    </select>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] text-stone-400">×</span>
                      <input type="number" min="0" step="any" value={b.qty} onChange={(e) => setBomLine(i, { qty: e.target.value })}
                        className="w-16 h-9 px-2 rounded-lg border border-stone-200 text-[12px] text-right font-mono outline-none focus:border-teal-500 bg-white" />
                      <span className="text-[10.5px] text-stone-400 w-7">{c ? c.unit : ""}</span>
                    </div>
                    <button onClick={() => rmBomLine(i)} className="shrink-0 w-8 h-8 grid place-items-center rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-500"><Icon name="x" size={13} /></button>
                  </div>
                );
              })}
              <div className="text-[10.5px] text-stone-400 pt-0.5">A „⊞" jelű komponens maga is összeállítás — a beszerzés rekurzívan a levél-tételekig bontja. Rendelés/fedezet: Beszerzés → Beszállítói cikkek → „Összeállítás / szett rendelés".</div>
            </div>
          )}
        </div>

        {/* Variánsok — egy fő-tétel alatt méret/szín/anyag változatok, külön készlettel */}
        <CMVariantSection item={item} />

        {/* Mezőszintű láthatóság — drag-drop bucket UI */}
        <CMFieldVisBuckets
          fieldVis={form.fieldVis}
          fieldAllowedWorlds={form.fieldAllowedWorlds}
          onSetVis={setFieldVis}
          onToggleWorld={toggleFieldWorld}
        />

        {/* World extensions */}
        {Object.keys(form.worldExt || {}).length > 0 && (
          <CMWorldExtSection worldExt={form.worldExt} onChange={setWorldExt} />
        )}

        {/* Raktározás bekapcsolása — BÁRMELY tételnél, láthatóságtól függetlenül */}
        {!form.worldExt?.warehouse && (
          <div className="rounded-xl border border-dashed border-teal-300 bg-teal-50/50 p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 grid place-items-center shrink-0">
              <Icon name="box" size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium text-stone-800">Raktározás kikapcsolva</div>
              <div className="text-[10.5px] text-stone-500">Kapcsold be, hogy ez a tétel készletként nyilvántartott legyen a Raktár világban.</div>
            </div>
            <button
              onClick={() => setWorldExt("warehouse", { onHand: 0, min: 0, location: "", reserved: 0, trend: "critical", archived: false })}
              className="shrink-0 h-7 px-3 rounded-lg bg-teal-600 text-white text-[11.5px] font-medium hover:bg-teal-700 transition inline-flex items-center gap-1">
              <Icon name="plus" size={12} /> Raktározás
            </button>
          </div>
        )}

        {/* Shop toggle + fields */}
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          <button onClick={() => setShop("enabled", !form.shop.enabled)}
            className="w-full px-4 py-3 flex items-center gap-3 bg-stone-50/60 hover:bg-stone-50">
            <span className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 grid place-items-center shrink-0"><Icon name="box" size={16} /></span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[12.5px] font-medium text-stone-900">Megjelenítés a boltban</span>
              <span className="block text-[10.5px] text-stone-500">A tétel kiválasztható a webshopban, kiegészítő mezőkkel.</span>
            </span>
            <span className={`relative w-12 h-7 rounded-full transition shrink-0 ${form.shop.enabled ? "bg-teal-600" : "bg-stone-300"}`}>
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${form.shop.enabled ? "translate-x-5" : ""}`} />
            </span>
          </button>
          {form.shop.enabled && (
            <div className="px-4 py-4 space-y-3 border-t border-stone-200">
              <div className="grid grid-cols-2 gap-3">
                <div><SxLabel>Bolti ár — nettó (Ft)</SxLabel><SxInput value={form.shop.price} onChange={(v) => setShop("price", v.replace(/[^0-9]/g, ""))} placeholder={form.price || "0"} mono /></div>
                <div><SxLabel>Bolti ár — bruttó (Ft)</SxLabel><SxInput value={form.shop.priceGross} onChange={(v) => setShop("priceGross", v.replace(/[^0-9]/g, ""))} placeholder="auto (×1,27)" mono /></div>
              </div>
              <div>
                <SxLabel>Termékleírás</SxLabel>
                <textarea value={form.shop.desc} onChange={(e) => setShop("desc", e.target.value)} rows={2} placeholder="Rövid, vásárlóknak szóló leírás…"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><SxLabel>Szállítási idő (nap)</SxLabel><SxInput value={String(form.shop.leadDays)} onChange={(v) => setShop("leadDays", v.replace(/[^0-9]/g, ""))} placeholder="14" mono /></div>
                <div>
                  <SxLabel>Elérhetőség</SxLabel>
                  <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5 h-9">
                    {[{ k: "stock", l: "Készleten" }, { k: "order", l: "Rendelésre" }].map((o) => (
                      <button key={o.k} onClick={() => setShop("stockMode", o.k)}
                        className={`flex-1 h-8 rounded-md text-[11.5px] font-medium ${form.shop.stockMode === o.k ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>{o.l}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <SxLabel>Kép-placeholder (háttér)</SxLabel>
                <div className="flex items-center gap-2 flex-wrap">
                  {CM_TINTS.map((t) => (
                    <button key={t.v} onClick={() => setShop("tint", t.v)} title={t.label}
                      className={`w-12 h-9 rounded-lg bg-gradient-to-br ${t.v} border-2 transition ${form.shop.tint === t.v ? "border-stone-900" : "border-white shadow-sm"}`} />
                  ))}
                </div>
                <div className="text-[10.5px] text-stone-400 mt-1.5">A vásárló saját képet húzhat rá a boltban; ez a háttér addig látszik.</div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center gap-2" style={{ paddingBottom: "max(env(safe-area-inset-bottom),12px)" }}>
        {!isNew && <GhostBtn onClick={() => { window.sim.archiveCatalogItem(item.id); onSaved(); }}>Archiválás</GhostBtn>}
        <div className="flex-1" />
        <GhostBtn onClick={onClose}>Mégse</GhostBtn>
        <button onClick={save} disabled={!ok}
          className="h-9 px-4 rounded-lg text-[12.5px] font-medium bg-teal-700 text-white hover:bg-teal-800 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5">
          <Icon name="check" size={14} /> {isNew ? "Hozzáadás" : "Mentés"}
        </button>
      </div>
    </>
  );
}

// ── Category editor (SlideOver body) ──────────────────────────────────────────
function CMCategoryEditor({ cat, cats, onSaved, onClose }) {
  const isNew = !cat.id;
  const [form, setForm] = useCM(() => ({
    name: cat.name || "",
    parentId: cat.parentId || null,
    color: cat.color || CM_COLORS[0],
    fields: (cat.fields || []).map((f) => ({ ...f })),
  }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const excludeIds = isNew ? [] : cmDescendantIds(cats, cat.id);

  const addField = () => setForm((f) => ({ ...f, fields: [...f.fields, { key: "mezo" + (f.fields.length + 1), label: "Új mező", type: "text" }] }));
  const updField = (i, patch) => setForm((f) => ({ ...f, fields: f.fields.map((x, idx) => (idx === i ? { ...x, ...patch } : x)) }));
  const delField = (i) => setForm((f) => ({ ...f, fields: f.fields.filter((_, idx) => idx !== i) }));

  const inherited = useMemoCM(() => {
    if (!form.parentId) return [];
    return window.sim.categoryFields(form.parentId);
  }, [form.parentId]);

  const ok = form.name.trim();
  const save = () => {
    if (!ok) return;
    const clean = form.fields
      .filter((f) => f.label.trim())
      .map((f) => {
        const key = (f.key || f.label).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || ("f" + Math.random().toString(36).slice(2, 6));
        const out = { key, label: f.label.trim(), type: f.type };
        if (f.type === "number" && f.unit) out.unit = f.unit.trim();
        if (f.type === "select") out.options = (f.options || (typeof f.optionsText === "string" ? f.optionsText.split(",") : [])).map((o) => String(o).trim()).filter(Boolean);
        return out;
      });
    const payload = { name: form.name.trim(), parentId: form.parentId || null, color: form.color, fields: clean };
    if (isNew) window.sim.addCategory(payload);
    else window.sim.updateCategory(cat.id, payload);
    onSaved();
  };

  return (
    <>
      <div className="px-5 py-4 space-y-5">
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <div><SxLabel>Kategória neve</SxLabel><SxInput value={form.name} onChange={(v) => set("name", v)} placeholder="pl. Bútorlap" /></div>
          <div>
            <SxLabel>Szín</SxLabel>
            <div className="flex items-center gap-1.5">
              {CM_COLORS.slice(0, 4).map((c) => (
                <button key={c} onClick={() => set("color", c)}
                  className={`w-8 h-8 rounded-lg border-2 ${form.color === c ? "border-stone-900 scale-110" : "border-white shadow-sm"}`} style={{ background: c }} />
              ))}
              <label className="w-8 h-8 rounded-lg border border-dashed border-stone-300 grid place-items-center cursor-pointer text-stone-400 relative overflow-hidden">
                <Icon name="plus" size={12} />
                <input type="color" value={form.color} onChange={(e) => set("color", e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </label>
            </div>
          </div>
        </div>
        <div>
          <SxLabel>Szülő kategória</SxLabel>
          <CMCategorySelect cats={cats} value={form.parentId} onChange={(v) => set("parentId", v)} excludeIds={excludeIds} allowEmpty />
        </div>

        {inherited.length > 0 && (
          <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold mb-1.5">Örökölt mezők (szülőtől)</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {inherited.map((f) => (
                <span key={f.key} className="text-[10.5px] px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-500">
                  {f.label} <span className="text-stone-300">· {CM_TYPE_LABEL[f.type]}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold">Saját mezők ({form.fields.length})</div>
            <button onClick={addField} className="text-[11.5px] text-teal-700 font-medium inline-flex items-center gap-1 hover:underline"><Icon name="plus" size={12} /> Mező</button>
          </div>
          <div className="space-y-2.5">
            {form.fields.map((f, i) => (
              <div key={i} className="rounded-xl border border-stone-200 p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input value={f.label} onChange={(e) => updField(i, { label: e.target.value })} placeholder="Mező neve"
                    className="flex-1 h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500" />
                  <button onClick={() => delField(i)} className="w-9 h-9 grid place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"><Icon name="x" size={15} /></button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={f.type} onChange={(e) => updField(i, { type: e.target.value })}
                    className="h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-teal-500">
                    {CM_FIELD_TYPES.map((x) => <option key={x.t} value={x.t}>{x.label}</option>)}
                  </select>
                  {f.type === "number" && (
                    <input value={f.unit || ""} onChange={(e) => updField(i, { unit: e.target.value })} placeholder="mértékegység (mm…)"
                      className="h-9 px-3 rounded-lg border border-stone-200 text-[12px] w-40 outline-none focus:border-teal-500" />
                  )}
                  {f.type === "select" && (
                    <input value={f.optionsText != null ? f.optionsText : (f.options || []).join(", ")} onChange={(e) => updField(i, { optionsText: e.target.value })}
                      placeholder="értékek vesszővel: ABS, PVC, Akril"
                      className="flex-1 min-w-[180px] h-9 px-3 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-teal-500" />
                  )}
                </div>
              </div>
            ))}
            {form.fields.length === 0 && <div className="text-[12px] text-stone-400 bg-stone-50 rounded-lg px-3 py-3">Nincs saját mező. A „Mező" gombbal adhatsz hozzá típusos tulajdonságokat.</div>}
          </div>
        </div>
      </div>
      <div className="px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center gap-2" style={{ paddingBottom: "max(env(safe-area-inset-bottom),12px)" }}>
        {!isNew && <GhostBtn onClick={() => { if (confirm("Biztosan törlöd ezt a kategóriát? Az alkategóriák és tételek a szülőhöz kerülnek.")) { window.sim.removeCategory(cat.id); onSaved(); } }}>Törlés</GhostBtn>}
        <div className="flex-1" />
        <GhostBtn onClick={onClose}>Mégse</GhostBtn>
        <button onClick={save} disabled={!ok}
          className="h-9 px-4 rounded-lg text-[12.5px] font-medium bg-teal-700 text-white hover:bg-teal-800 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5">
          <Icon name="check" size={14} /> {isNew ? "Létrehozás" : "Mentés"}
        </button>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main panel
// ══════════════════════════════════════════════════════════════════════════════
function CatalogPanel() {
  const sim = useSim();
  const cats = sim.catCategories || [];
  const tags = sim.catTags || [];
  const catalog = sim.catalog || [];

  const [view, setView] = useCM("items");
  const [q, setQ] = useCM("");
  const [filterCat, setFilterCat] = useCM("all");
  const [filterTag, setFilterTag] = useCM(null);
  const [filterVis, setFilterVis] = useCM("all");
  const [shopOnly, setShopOnly] = useCM(false);
  const [showArchived, setShowArchived] = useCM(false);
  const [editItem, setEditItem] = useCM(null);   // item object, {} for new, or null
  const [editCat, setEditCat] = useCM(null);     // category object, {} for new, or null
  const [expanded, setExpanded] = useCM(() => ({}));  // parentId -> true ha kinyitva
  const toggleExpand = (pid) => setExpanded((m) => ({ ...m, [pid]: !m[pid] }));

  const catById = useMemoCM(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);
  const flatCats = useMemoCM(() => cmFlattenCats(cats), [cats]);
  const itemCountByCat = useMemoCM(() => {
    const m = {};
    catalog.forEach((it) => { if (it.categoryId) m[it.categoryId] = (m[it.categoryId] || 0) + 1; });
    return m;
  }, [catalog]);
  // Tags actually in use across items (for the filter row)
  const usedTags = useMemoCM(() => {
    const s = new Set();
    catalog.forEach((it) => (it.tags || []).forEach((t) => s.add(t)));
    return Array.from(s);
  }, [catalog]);

  const filtered = catalog.filter((it) => {
    if (!showArchived && it.active === false) return false;
    if (filterCat !== "all" && it.categoryId !== filterCat) return false;
    if (filterTag && !(it.tags || []).includes(filterTag)) return false;
    if (filterVis !== "all" && (it.visibility || "private") !== filterVis) return false;
    if (shopOnly && !(it.shop && it.shop.enabled)) return false;
    if (q) {
      const n = q.toLowerCase();
      const inProps = Object.values(it.props || {}).some((v) => String(v).toLowerCase().includes(n));
      const inTags = (it.tags || []).some((t) => t.toLowerCase().includes(n));
      if (!it.name.toLowerCase().includes(n) && !(it.code || "").toLowerCase().includes(n) && !inProps && !inTags) return false;
    }
    return true;
  });

  // Variáns-csoportosítás: a variáns-gyermekek NEM önálló top-level sorok,
  // hanem a fő-tétel alatt, összecsukhatóan jelennek meg.
  const childrenByParent = useMemoCM(() => {
    const m = {};
    catalog.forEach((c) => { if (c.variantOf) { (m[c.variantOf] = m[c.variantOf] || []).push(c); } });
    return m;
  }, [catalog]);
  // Top-level sorok: a filtered-ből kihagyjuk a variáns-gyermekeket, de ha egy
  // gyermek átment a szűrőn, a fő-tételét felszínre hozzuk.
  const topLevel = (() => {
    const out = [], seen = new Set();
    filtered.forEach((item) => {
      if (item.variantOf) {
        const p = catalog.find((c) => c.id === item.variantOf);
        if (p && !seen.has(p.id)) { seen.add(p.id); out.push(p); }
      } else if (!seen.has(item.id)) { seen.add(item.id); out.push(item); }
    });
    return out;
  })();
  const visibleChildren = (pid) => (childrenByParent[pid] || []).filter((c) => showArchived || c.active !== false);

  return (
    <div className="space-y-3">
      {/* View switch */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5">
          {[{ k: "items", l: "Tételek", n: catalog.filter((i) => i.active !== false).length }, { k: "cats", l: "Kategóriák", n: cats.length }].map((x) => (
            <button key={x.k} onClick={() => setView(x.k)}
              className={`px-3 h-8 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5 ${view === x.k ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
              {x.l}<span className={`text-[10px] tabular-nums px-1.5 rounded-full ${view === x.k ? "bg-white/20" : "bg-stone-100 text-stone-500"}`}>{x.n}</span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {view === "items"
          ? <PrimaryBtn icon="plus" onClick={() => setEditItem({})}>Új tétel</PrimaryBtn>
          : <PrimaryBtn icon="plus" onClick={() => setEditCat({})}>Új kategória</PrimaryBtn>}
      </div>

      {view === "items" ? (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5 overflow-x-auto max-w-full">
              <button onClick={() => setFilterCat("all")}
                className={`px-2.5 h-7 rounded-md text-[11.5px] font-medium whitespace-nowrap ${filterCat === "all" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>Összes</button>
              {flatCats.map((c) => (
                <button key={c.id} onClick={() => setFilterCat(c.id)}
                  className={`px-2.5 h-7 rounded-md text-[11.5px] font-medium whitespace-nowrap inline-flex items-center gap-1.5 ${filterCat === c.id ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                  {c.depth > 0 && <span className="text-stone-300">└</span>}{c.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 h-8 flex-1 min-w-[150px] sm:flex-none sm:w-[220px] rounded-lg bg-white border border-stone-200 text-stone-500">
              <Icon name="search" size={13} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kód, név, tulajdonság, címke…" className="bg-transparent outline-none text-[11.5px] flex-1 min-w-0 placeholder:text-stone-400" />
            </div>
            <button onClick={() => setShopOnly((v) => !v)}
              className={`h-8 px-2.5 rounded-lg text-[11.5px] font-medium border inline-flex items-center gap-1.5 ${shopOnly ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"}`}>
              <Icon name="box" size={12} /> Csak boltképes
            </button>
            {/* Láthatóság szűrő */}
            <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5">
              <button onClick={() => setFilterVis("all")}
                className={`px-2 h-7 rounded-md text-[11px] font-medium ${filterVis === "all" ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-100"}`}>Mind</button>
              {CM_VISIBILITY.map((cfg) => (
                <button key={cfg.v} onClick={() => setFilterVis(filterVis === cfg.v ? "all" : cfg.v)} title={cfg.label}
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition ${filterVis === cfg.v ? cfg.bg + " border" : "hover:bg-stone-100"}`}>
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-[11.5px] text-stone-600 cursor-pointer ml-1">
              <input type="checkbox" checked={showArchived} onChange={() => setShowArchived((v) => !v)} className="rounded" />
              Archiváltak
            </label>
          </div>

          {/* Tag filter row */}
          {usedTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mr-0.5">Címke</span>
              {usedTags.map((t) => (
                <button key={t} onClick={() => setFilterTag(filterTag === t ? null : t)}
                  className={`px-2.5 h-7 rounded-full text-[11px] font-medium border transition ${filterTag === t ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"}`}>
                  {t}
                </button>
              ))}
              {filterTag && <button onClick={() => setFilterTag(null)} className="text-[11px] text-stone-400 hover:text-stone-600 underline ml-1">törlés</button>}
            </div>
          )}

          <Card className="p-0 overflow-hidden">
            {/* Desktop header */}
              <div className="hidden md:grid grid-cols-[90px_minmax(0,1.7fr)_minmax(0,1fr)_100px_80px_minmax(0,1fr)_72px_64px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40">
              <div>Kód</div><div>Név</div><div>Kategória</div><div className="text-right">Ár</div><div>Láthat.</div><div>Címkék</div><div className="text-center">Bolt</div><div></div>
            </div>
            {topLevel.map((item) => {
              const cat = catById[item.categoryId];
              const kids = visibleChildren(item.id);
              const isParent = sim.isVariantParent ? sim.isVariantParent(item.id) : (item.variantAxes && item.variantAxes.length);
              const open = !!expanded[item.id];
              const stockSum = (isParent && kids.length) ? kids.reduce((a, c) => { const wh = c.worldExt && c.worldExt.warehouse; return a + (wh ? (wh.available != null ? wh.available : (wh.onHand || 0)) : 0); }, 0) : null;
              return (
                <React.Fragment key={item.id}>
                <div
                  className={`hidden md:grid grid-cols-[90px_minmax(0,1.7fr)_minmax(0,1fr)_100px_80px_minmax(0,1fr)_72px_64px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center ${item.active === false ? "opacity-50" : "hover:bg-stone-50/60"} ${isParent && kids.length ? "bg-violet-50/20" : ""}`}>
                  <div className="text-[11px] font-mono text-stone-500 truncate flex items-center gap-1.5">
                    {isParent && kids.length > 0 && (
                      <button onClick={() => toggleExpand(item.id)} className="shrink-0 w-4 h-4 grid place-items-center rounded text-stone-400 hover:text-violet-600 hover:bg-violet-100/60" title={open ? "Összecsuk" : "Kinyit"}>
                        <Icon name="chevron" size={13} className={open ? "rotate-90" : ""} />
                      </button>
                    )}
                    <span className="truncate">{item.code}</span>
                  </div>
                  <div className="text-[12.5px] font-medium text-stone-900 truncate flex items-center gap-2">
                    <span className="truncate">{item.name}</span>
                    {(item.status && item.status !== "active") && <CMStatusBadge status={item.status} />}
                    {isParent && kids.length > 0 && <span className="shrink-0 text-[9.5px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">{kids.length} variáns</span>}
                  </div>
                  <div>
                    {cat
                      ? <span className="inline-flex items-center gap-1.5 text-[10.5px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium"><span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />{cat.name}</span>
                      : <span className="text-[10.5px] text-stone-300">—</span>}
                  </div>
                  <div className="text-[12px] tabular-nums text-right font-medium text-stone-800">{isParent && kids.length ? <span className="text-stone-400 font-normal text-[11px]">Σ {(+stockSum.toFixed(1))}</span> : fmtHUF(item.price)}</div>
                  <div><CMVisBadge v={item.visibility || "private"} /></div>
                  <div className="flex items-center gap-1 flex-wrap min-w-0">
                    {(item.tags || []).slice(0, 2).map((t) => <span key={t} className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700">{t}</span>)}
                    {(item.tags || []).length > 2 && <span className="text-[9.5px] text-stone-400">+{item.tags.length - 2}</span>}
                  </div>
                  <div className="text-center">
                    {item.shop && item.shop.enabled
                      ? <span className="inline-grid place-items-center w-6 h-6 rounded-full bg-teal-100 text-teal-700"><Icon name="check" size={12} /></span>
                      : <span className="text-stone-300">—</span>}
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    {item.active === false
                      ? <button onClick={() => window.sim.restoreCatalogItem(item.id)} className="text-[10px] px-2 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200">Vissza</button>
                      : <button onClick={() => setEditItem(item)} className="w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Icon name="settings" size={13} /></button>}
                  </div>
                </div>
                {/* Variáns-gyermekek (kinyitva) */}
                {isParent && open && kids.map((c) => {
                  const wh = c.worldExt && c.worldExt.warehouse;
                  const free = wh ? (wh.available != null ? wh.available : (wh.onHand || 0)) : 0;
                  const low = wh && free <= (wh.min || 0);
                  return (
                    <div key={c.id}
                      className={`hidden md:grid grid-cols-[90px_minmax(0,1.7fr)_minmax(0,1fr)_100px_80px_minmax(0,1fr)_72px_64px] gap-3 pl-5 pr-5 py-2 border-b border-stone-100 last:border-0 items-center bg-violet-50/10 hover:bg-violet-50/30 ${c.active === false ? "opacity-50" : ""}`}>
                      <div className="text-[10.5px] font-mono text-stone-400 truncate flex items-center gap-1.5"><span className="text-violet-300 pl-2">└</span><span className="truncate">{c.code}</span></div>
                      <div className="text-[12px] text-stone-700 truncate flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                        <span className="truncate">{sim.variantLabel(c) || c.name}</span>
                      </div>
                      <div className="text-[10.5px] text-stone-400">variáns</div>
                      <div className="text-[12px] tabular-nums text-right font-medium text-stone-800">{fmtHUF(c.price)}</div>
                      <div className="text-[11px] tabular-nums text-right"><span className={low ? "text-rose-600 font-semibold" : "text-stone-500"}>{(+free.toFixed(2))}</span> <span className="text-stone-300 text-[9.5px]">{c.unit}</span></div>
                      <div></div>
                      <div></div>
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setEditItem(c)} className="w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Icon name="settings" size={13} /></button>
                      </div>
                    </div>
                  );
                })}
                </React.Fragment>
              );
            })}
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-stone-100">
              {topLevel.map((item) => {
                const cat = catById[item.categoryId];
                const kids = visibleChildren(item.id);
                const isParent = sim.isVariantParent ? sim.isVariantParent(item.id) : (item.variantAxes && item.variantAxes.length);
                const open = !!expanded[item.id];
                return (
                  <React.Fragment key={item.id}>
                  <div className={`flex items-center ${item.active === false ? "opacity-50" : ""}`}>
                    {isParent && kids.length > 0 && (
                      <button onClick={() => toggleExpand(item.id)} className="shrink-0 self-stretch w-9 grid place-items-center text-stone-400 active:bg-stone-100" title={open ? "Összecsuk" : "Kinyit"}>
                        <Icon name="chevron" size={16} className={open ? "rotate-90" : ""} />
                      </button>
                    )}
                    <button onClick={() => item.active === false ? window.sim.restoreCatalogItem(item.id) : setEditItem(item)}
                      className={`min-w-0 flex-1 text-left ${isParent && kids.length ? "pr-4 py-3.5" : "px-4 py-3.5"} ${isParent && kids.length ? "" : ""} flex items-center gap-3 active:bg-stone-50`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13.5px] font-medium text-stone-900 truncate">{item.name}</span>
                          {(item.status && item.status !== "active") && <CMStatusBadge status={item.status} />}
                          {isParent && kids.length > 0 && <span className="shrink-0 text-[9.5px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">{kids.length} variáns</span>}
                          {cat && <span className="shrink-0 inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium"><span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />{cat.name}</span>}
                          {item.shop && item.shop.enabled && <span className="shrink-0 text-[9.5px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">Bolt</span>}
                        </div>
                        <div className="text-[11px] font-mono text-stone-500 mt-0.5 truncate">{item.code}{(item.tags || []).length ? " · " + item.tags.join(", ") : ""}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-semibold text-stone-800 tabular-nums">{isParent && kids.length ? <span className="text-violet-500 text-[11px]">{kids.length} db</span> : fmtHUF(item.price)}</div>
                        <div className="text-[10px] text-stone-400">/ {item.unit}</div>
                      </div>
                      <Icon name="chevron" size={15} className="text-stone-300 shrink-0" />
                    </button>
                  </div>
                  {isParent && open && kids.map((c) => {
                    const wh = c.worldExt && c.worldExt.warehouse;
                    const free = wh ? (wh.available != null ? wh.available : (wh.onHand || 0)) : 0;
                    const low = wh && free <= (wh.min || 0);
                    return (
                      <button key={c.id} onClick={() => setEditItem(c)} className="w-full text-left pl-10 pr-4 py-3 flex items-center gap-3 bg-violet-50/20 active:bg-violet-50/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] text-stone-800 truncate">{sim.variantLabel(c) || c.name}</div>
                          <div className="text-[10.5px] font-mono text-stone-400 mt-0.5 truncate">{c.code}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[12px] font-semibold tabular-nums"><span className={low ? "text-rose-600" : "text-stone-700"}>{(+free.toFixed(2))}</span> <span className="text-stone-400 text-[10px] font-normal">{c.unit}</span></div>
                          <div className="text-[10px] text-stone-400 tabular-nums">{fmtHUF(c.price)}</div>
                        </div>
                      </button>
                    );
                  })}
                  </React.Fragment>
                );
              })}
            </div>
            {topLevel.length === 0 && <div className="px-5 py-10 text-center text-[12px] text-stone-400">Nincs találat. Hozz létre egy tételt az „Új tétel" gombbal.</div>}
          </Card>
        </>
      ) : (
        // ── Categories tree ──
        <Card className="p-0 overflow-hidden">
          {flatCats.map((c) => (
            <button key={c.id} onClick={() => setEditCat(cats.find((x) => x.id === c.id))}
              className="w-full text-left px-4 md:px-5 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3 hover:bg-stone-50/60">
              <span style={{ marginLeft: c.depth * 20 }} className="flex items-center gap-2 min-w-0 flex-1">
                {c.depth > 0 && <span className="text-stone-300 text-[13px]">└</span>}
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                <span className="text-[13px] font-medium text-stone-900 truncate">{c.name}</span>
              </span>
              <span className="text-[10.5px] text-stone-400 shrink-0">{(c.fields || []).length} mező</span>
              <span className="text-[10.5px] text-stone-400 shrink-0 tabular-nums">{itemCountByCat[c.id] || 0} tétel</span>
              <Icon name="settings" size={13} className="text-stone-300 shrink-0" />
            </button>
          ))}
          {flatCats.length === 0 && <div className="px-5 py-10 text-center text-[12px] text-stone-400">Még nincs kategória. Hozz létre egyet az „Új kategória" gombbal.</div>}
        </Card>
      )}

      {/* Item editor */}
      <SlideOver open={!!editItem} onClose={() => setEditItem(null)}
        title={editItem && editItem.id ? "Tétel szerkesztése" : "Új katalógus tétel"} subtitle={editItem && editItem.code} width={520}>
        {editItem && <CMItemEditor key={editItem.id || "new"} item={editItem} cats={cats} tags={tags} onSaved={() => setEditItem(null)} onClose={() => setEditItem(null)} />}
      </SlideOver>

      {/* Category editor */}
      <SlideOver open={!!editCat} onClose={() => setEditCat(null)}
        title={editCat && editCat.id ? "Kategória szerkesztése" : "Új kategória"} width={520}>
        {editCat && <CMCategoryEditor key={editCat.id || "new"} cat={editCat} cats={cats} onSaved={() => setEditCat(null)} onClose={() => setEditCat(null)} />}
      </SlideOver>
    </div>
  );
}

window.CatalogPanel = CatalogPanel;
