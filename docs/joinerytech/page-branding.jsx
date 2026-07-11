// ──────────────────────────────────────────────────────────────────────────
// page-branding.jsx — MÁRKA / ARCULAT (Beállítások → Márka)
//
//   Küldetés · vízió · stratégiai célok · hangnem · márka-hang
//   Akcentus szín · logó · márka-színek szerepkörrel · betűk
//   Célközönség / Persona-k
//   window.BrandingPanel — page-rest.jsx mountolja
// ──────────────────────────────────────────────────────────────────────────
const useStateBrand = React.useState;

function isDark(hex) {
  if (!hex || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

const COLOR_ROLES = [
  { key: "primary", label: "Elsődleges", badge: "bg-blue-100 text-blue-700" },
  { key: "accent",  label: "Akcentus",   badge: "bg-violet-100 text-violet-700" },
  { key: "neutral", label: "Neutrális",  badge: "bg-stone-100 text-stone-600" },
  { key: "support", label: "Támogató",   badge: "bg-amber-100 text-amber-700" },
];
const roleMeta = (key) => COLOR_ROLES.find((r) => r.key === key) || null;

// Persona-kártya avatar-szín (hash alapján)
const PERSONA_COLORS = [
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
];
function personaColor(id) {
  let h = 0; for (let i = 0; i < (id || "").length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return PERSONA_COLORS[h % PERSONA_COLORS.length];
}

// ── Persona szerkesztő (inline) ──
function PersonaEditor({ p, onSave, onCancel }) {
  const [form, setForm] = useStateBrand({ ...p });
  const f = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));
  const inp = "w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-indigo-400 bg-white";
  const ta  = inp + " resize-none leading-relaxed";
  const lbl = "text-[10px] uppercase tracking-wide text-stone-500 mb-0.5 block";
  return (
    <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50/40 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label>
          <span className={lbl}>Persona neve</span>
          <input value={form.name} onChange={f("name")} placeholder="pl. Belsőépítész Bernadett" className={inp} />
        </label>
        <label>
          <span className={lbl}>Szerepkör / foglalkozás</span>
          <input value={form.role} onChange={f("role")} placeholder="pl. Szabadfoglalkozású belsőépítész" className={inp} />
        </label>
        <label>
          <span className={lbl}>Korosztály</span>
          <input value={form.ageRange} onChange={f("ageRange")} placeholder="pl. 30–45" className={inp} />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label>
          <span className={lbl}>Célok / motivációk</span>
          <textarea value={form.goals} onChange={f("goals")} rows={3}
            placeholder="Mit szeretne elérni? Miért keres minket?" className={ta} />
        </label>
        <label>
          <span className={lbl}>Fájdalompontok / akadályok</span>
          <textarea value={form.pains} onChange={f("pains")} rows={3}
            placeholder="Mi zavarja? Mi miatt hagyna el minket?" className={ta} />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label>
          <span className={lbl}>Preferált csatorna</span>
          <input value={form.channel} onChange={f("channel")} placeholder="pl. Email, telefon, ajánlás, Instagram" className={inp} />
        </label>
        <label>
          <span className={lbl}>Jellemző idézet</span>
          <input value={form.quote} onChange={f("quote")} placeholder='"Ha egyszer megbízom benne, hűséges ügyfél leszek."' className={inp} />
        </label>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => onSave(form)}
          className="h-8 px-4 rounded-lg bg-indigo-600 text-white text-[11.5px] font-medium hover:bg-indigo-700">
          Mentés
        </button>
        <button onClick={onCancel}
          className="h-8 px-3 rounded-lg border border-stone-200 text-[11.5px] text-stone-500 hover:border-stone-300 bg-white">
          Mégsem
        </button>
      </div>
    </div>
  );
}

// ── Persona megjelenítő kártya ──
function PersonaCard({ p, onEdit, onRemove }) {
  const av = personaColor(p.id);
  const initials = (p.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="border border-stone-200 rounded-xl p-4 bg-white hover:border-stone-300 transition group">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${av}`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-stone-800 leading-tight truncate">{p.name || <span className="text-stone-400 italic">Névtelen persona</span>}</div>
          {p.role && <div className="text-[11.5px] text-stone-500 truncate">{p.role}</div>}
          {p.ageRange && <div className="text-[10.5px] text-stone-400">{p.ageRange} év</div>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
          <button onClick={onEdit}
            className="w-7 h-7 grid place-items-center rounded-lg border border-stone-200 text-stone-400 hover:text-indigo-600 hover:border-indigo-300 bg-white">
            <Icon name="pencil" size={12} />
          </button>
          <button onClick={onRemove}
            className="w-7 h-7 grid place-items-center rounded-lg border border-stone-200 text-stone-400 hover:text-rose-600 hover:border-rose-200 bg-white">
            <Icon name="trash" size={12} />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-[11.5px]">
        {p.goals && (
          <div className="flex gap-2">
            <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center mt-0.5">
              <Icon name="check" size={9} />
            </span>
            <div><span className="text-stone-400 text-[10px] uppercase tracking-wide block">Célok</span>
              <span className="text-stone-700">{p.goals}</span></div>
          </div>
        )}
        {p.pains && (
          <div className="flex gap-2">
            <span className="shrink-0 w-4 h-4 rounded-full bg-rose-100 text-rose-500 grid place-items-center mt-0.5">
              <Icon name="alert-circle" size={9} />
            </span>
            <div><span className="text-stone-400 text-[10px] uppercase tracking-wide block">Fájdalompontok</span>
              <span className="text-stone-700">{p.pains}</span></div>
          </div>
        )}
        {p.channel && (
          <div className="flex gap-2">
            <span className="shrink-0 w-4 h-4 rounded-full bg-blue-100 text-blue-500 grid place-items-center mt-0.5">
              <Icon name="message-circle" size={9} />
            </span>
            <div><span className="text-stone-400 text-[10px] uppercase tracking-wide block">Csatorna</span>
              <span className="text-stone-700">{p.channel}</span></div>
          </div>
        )}
        {p.quote && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-600 italic leading-relaxed">
            {p.quote}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Fő panel ──
function BrandingPanel() {
  const sim = useSim();
  const b = window.sim.branding ? window.sim.branding() : {
    mission: "", vision: "", goal: "", accent: "", accentSecondary: "",
    tone: "", voice: "", logoLabel: "", colors: [], fonts: [], items: [], personas: []
  };
  const setB = (patch) => window.sim.setBranding(patch);

  const TONES = [
    ["közvetlen", "Tegező / közvetlen"],
    ["hivatalos",  "Magázó / hivatalos"],
    ["szakmai",    "Szakmai / tömör"],
    ["barati",     "Baráti / meleg"],
  ];

  const ta  = "mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400 resize-none leading-relaxed";
  const inp = "h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400";
  const chip = (active) =>
    `h-7 px-2.5 rounded-lg text-[11px] font-medium border transition ${
      active ? "bg-indigo-600 text-white border-indigo-600"
             : "bg-white text-stone-500 border-stone-200 hover:border-indigo-300"}`;
  const Card = window.Card || (({ className, children }) =>
    <div className={"bg-white border border-stone-200 rounded-xl " + (className || "")}>{children}</div>);
  const SectionTitle = ({ icon, title, sub }) => (
    <div className="mb-4">
      <div className="text-[13px] font-semibold text-stone-800 flex items-center gap-1.5">
        {icon && <Icon name={icon} size={14} className="text-stone-400" />} {title}
      </div>
      {sub && <div className="text-[11.5px] text-stone-500 mt-0.5">{sub}</div>}
    </div>
  );

  // ── Márka-színek state ──
  const [newColor,     setNewColor]     = useStateBrand("#2A6FDB");
  const [newColorLbl,  setNewColorLbl]  = useStateBrand("");
  const [newColorRole, setNewColorRole] = useStateBrand("primary");
  const addColor = () => {
    setB({ colors: [...(b.colors || []), { hex: newColor, label: newColorLbl.trim() || newColor, role: newColorRole }] });
    setNewColorLbl(""); setNewColorRole("primary");
  };
  const removeColor = (i) => setB({ colors: (b.colors || []).filter((_, idx) => idx !== i) });
  const setColorRole = (i, role) => setB({ colors: (b.colors || []).map((c, idx) => idx === i ? { ...c, role } : c) });

  // ── Betűk state ──
  const [newFont,     setNewFont]     = useStateBrand("");
  const [newFontRole, setNewFontRole] = useStateBrand("");
  const addFont = () => {
    if (!newFont.trim()) return;
    setB({ fonts: [...(b.fonts || []), { name: newFont.trim(), role: newFontRole.trim() || "Szöveg" }] });
    setNewFont(""); setNewFontRole("");
  };
  const removeFont = (i) => setB({ fonts: (b.fonts || []).filter((_, idx) => idx !== i) });

  // ── Persona state ──
  const [editingId,  setEditingId]  = useStateBrand(null); // null | "new" | id
  const [newPersona, setNewPersona] = useStateBrand(false);
  const personas = b.personas || [];

  const handleSavePersona = (form) => {
    if (editingId === "new") {
      window.sim.addPersona(form);
    } else {
      window.sim.updatePersona(editingId, form);
    }
    setEditingId(null); setNewPersona(false);
  };

  return (
    <div className="space-y-4 max-w-[860px]">

      {/* ── 1. Stratégia & identitás ── */}
      <Card className="p-5">
        <SectionTitle icon="compass" title="Stratégia & identitás"
          sub="A cég küldetése, víziója és stratégiai céljai — az AI-kommunikáció alapja." />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <label className="block">
            <span className="text-[10.5px] uppercase tracking-wide text-stone-500 mb-0.5 block">Küldetés</span>
            <textarea defaultValue={b.mission || ""} onBlur={(e) => setB({ mission: e.target.value })} rows={3}
              placeholder="Miért létezünk?" className={ta} />
          </label>
          <label className="block">
            <span className="text-[10.5px] uppercase tracking-wide text-stone-500 mb-0.5 block">Vízió</span>
            <textarea defaultValue={b.vision || ""} onBlur={(e) => setB({ vision: e.target.value })} rows={3}
              placeholder="Hová tartunk 5 éven belül?" className={ta} />
          </label>
          <label className="block">
            <span className="text-[10.5px] uppercase tracking-wide text-stone-500 mb-0.5 block">Stratégiai célok</span>
            <textarea defaultValue={b.goal || ""} onBlur={(e) => setB({ goal: e.target.value })} rows={3}
              placeholder={"▸ 30% export 3 éven belül\n▸ ISO 9001\n▸ webshop-forgalom ×2"} className={ta} />
          </label>
        </div>
        <div className="mt-1">
          <div className="text-[10.5px] uppercase tracking-wide text-stone-500 mb-1.5">Kommunikáció hangneme</div>
          <div className="flex flex-wrap gap-1.5">
            {TONES.map(([k, l]) =>
              <button key={k} onClick={() => setB({ tone: b.tone === k ? "" : k })} className={chip(b.tone === k)}>{l}</button>
            )}
          </div>
        </div>
        <label className="block mt-3">
          <span className="text-[10.5px] uppercase tracking-wide text-stone-500">Márka-hang / üzenet</span>
          <textarea defaultValue={b.voice || ""} onBlur={(e) => setB({ voice: e.target.value })} rows={2}
            placeholder="Hogyan szólalunk meg? pl. szakértő, de közvetlen; kerüljük a marketing-szöveget…" className={ta} />
        </label>
      </Card>

      {/* ── 2. Vizuális eszközök ── */}
      <Card className="p-5">
        <SectionTitle icon="palette" title="Vizuális eszközök"
          sub="Logó, akcentus szín, márka-színek szerepkörrel, betűtípusok." />

        {/* Logó */}
        <div className="mb-5">
          <div className="text-[10.5px] uppercase tracking-wide text-stone-500 mb-1.5">Logó</div>
          {b.logoLabel ? (
            <div className="flex items-center gap-2 px-3 h-10 rounded-lg border border-stone-200 bg-stone-50/60 w-fit">
              <Icon name="image" size={14} className="text-stone-400" />
              <span className="text-[12px] text-stone-700 font-mono">{b.logoLabel}</span>
              <button onClick={() => setB({ logoLabel: "" })}
                className="w-7 h-7 grid place-items-center rounded-md text-stone-300 hover:bg-rose-50 hover:text-rose-600 ml-1">
                <Icon name="x" size={12} />
              </button>
            </div>
          ) : (
            <button onClick={() => { const v = prompt("Logó-fájl neve:", "ceglogo.svg"); if (v) setB({ logoLabel: v }); }}
              className="flex items-center gap-2 px-3 h-10 w-60 rounded-lg border border-dashed border-stone-300 text-[12px] text-stone-500 hover:border-indigo-300 hover:text-indigo-600">
              <Icon name="plus" size={13} /> Logó megadása
            </button>
          )}
        </div>

        {/* Akcentus szín */}
        <div className="mb-5">
          <div className="text-[10.5px] uppercase tracking-wide text-stone-500 mb-2 flex items-center gap-1.5">
            <Icon name="zap" size={11} className="text-violet-500" /> Akcentus szín
            <span className="text-[10px] text-stone-400 normal-case tracking-normal">(elsődleges UI-szín — gombok, linkek, kiemelések)</span>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { key: "accent", label: "Elsődleges", default: "#2A6FDB" },
              { key: "accentSecondary", label: "Másodlagos", default: "#7C3AED" },
            ].map(({ key, label, default: def }) => (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-[10px] text-stone-400 uppercase tracking-wide">{label}</span>
                <div className="flex items-center gap-2">
                  <input type="color" value={b[key] || def} onChange={(e) => setB({ [key]: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-stone-200 cursor-pointer p-0.5 bg-white" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-mono text-stone-600">{b[key] || def}</span>
                    <span className="inline-flex px-2 h-5 rounded text-[10px] font-medium items-center"
                      style={{ background: b[key] || def, color: isDark(b[key] || def) ? "#fff" : "#1c1917" }}>
                      {label}
                    </span>
                  </div>
                  {b[key] && (
                    <button onClick={() => setB({ [key]: "" })}
                      className="w-5 h-5 grid place-items-center rounded text-stone-300 hover:text-rose-500">
                      <Icon name="x" size={10} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {(b.accent || b.accentSecondary) && (
              <div className="flex flex-col gap-1 justify-end">
                <span className="text-[10px] text-stone-400 uppercase tracking-wide">Előnézet</span>
                <div className="flex gap-1 items-center h-10">
                  {[b.accent, b.accentSecondary].filter(Boolean).map((hex, i) => (
                    <div key={i} className="w-10 h-10 rounded-lg border border-stone-200 shadow-sm" style={{ background: hex }} />
                  ))}
                  {(b.colors || []).filter((c) => c.role === "neutral").slice(0, 1).map((c, i) => (
                    <div key={i} className="w-10 h-10 rounded-lg border border-stone-200" style={{ background: c.hex }} />
                  ))}
                  <div className="w-10 h-10 rounded-lg border border-stone-200 bg-white" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Márka-színek */}
        <div className="mb-5">
          <div className="text-[10.5px] uppercase tracking-wide text-stone-500 mb-2">Márka-színek</div>
          {(b.colors || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {(b.colors || []).map((c, i) => {
                const rm = roleMeta(c.role);
                return (
                  <div key={i} className="group flex items-center gap-2 pl-1.5 pr-1 h-9 rounded-lg border border-stone-200 bg-white">
                    <span className="w-6 h-6 rounded-md border border-stone-200 shrink-0" style={{ background: c.hex }} />
                    <span className="text-[11.5px] text-stone-700 font-medium">{c.label}</span>
                    {rm && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${rm.badge}`}>{rm.label}</span>}
                    <select value={c.role || ""} onChange={(e) => setColorRole(i, e.target.value)}
                      className="h-6 px-1 rounded border border-stone-200 text-[10px] text-stone-500 bg-white outline-none cursor-pointer hover:border-indigo-300">
                      <option value="">— szerep —</option>
                      {COLOR_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                    <button onClick={() => removeColor(i)}
                      className="w-5 h-5 grid place-items-center rounded text-stone-300 hover:text-rose-600">
                      <Icon name="x" size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {(b.colors || []).length === 0 && <p className="text-[11px] text-stone-400 mb-2">Még nincs márka-szín.</p>}
          <div className="flex items-center gap-1.5 flex-wrap">
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
              className="w-9 h-9 rounded-lg border border-stone-200 bg-white cursor-pointer p-0.5 shrink-0" />
            <input value={newColorLbl} onChange={(e) => setNewColorLbl(e.target.value)}
              placeholder="szín neve" onKeyDown={(e) => e.key === "Enter" && addColor()}
              className={`flex-1 min-w-[100px] ${inp}`} />
            <select value={newColorRole} onChange={(e) => setNewColorRole(e.target.value)}
              className={`w-32 ${inp} cursor-pointer`}>
              {COLOR_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <button onClick={addColor}
              className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-[11.5px] font-medium hover:bg-indigo-700 shrink-0 inline-flex items-center gap-1">
              <Icon name="plus" size={12} /> Szín
            </button>
          </div>
        </div>

        {/* Betűk */}
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-stone-500 mb-1.5">Betűtípusok</div>
          <div className="space-y-1.5 mb-2">
            {(b.fonts || []).map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-3 h-9 rounded-lg border border-stone-200 bg-white">
                <span className="text-[12px] font-medium text-stone-800 flex-1">{f.name}</span>
                <span className="text-[10.5px] text-stone-400 px-2 py-0.5 rounded bg-stone-50 border border-stone-200">{f.role}</span>
                <button onClick={() => removeFont(i)}
                  className="w-6 h-6 grid place-items-center rounded text-stone-300 hover:text-rose-600">
                  <Icon name="x" size={11} />
                </button>
              </div>
            ))}
            {(b.fonts || []).length === 0 && <span className="text-[11px] text-stone-400">Még nincs betűtípus.</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <input value={newFont} onChange={(e) => setNewFont(e.target.value)}
              placeholder="betűtípus neve" onKeyDown={(e) => e.key === "Enter" && addFont()}
              className={`flex-1 ${inp}`} />
            <input value={newFontRole} onChange={(e) => setNewFontRole(e.target.value)}
              placeholder="szerep (Címsor / Szöveg)" className={`w-36 ${inp}`} />
            <button onClick={addFont}
              className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-[11.5px] font-medium hover:bg-indigo-700 shrink-0 inline-flex items-center gap-1">
              <Icon name="plus" size={12} /> Betű
            </button>
          </div>
        </div>
      </Card>

      {/* ── 3. Célközönség / Persona-k ── */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-1">
          <SectionTitle icon="users" title="Célközönség — Persona-k"
            sub="Kiknek dolgozunk? Egy-egy persona leírja az ideális ügyfelet: céljait, fájdalompontjait, csatornáját." />
          {!newPersona && editingId === null && (
            <button onClick={() => setEditingId("new")}
              className="shrink-0 h-8 px-3 rounded-lg bg-indigo-600 text-white text-[11.5px] font-medium hover:bg-indigo-700 inline-flex items-center gap-1 mt-0.5">
              <Icon name="plus" size={12} /> Új persona
            </button>
          )}
        </div>

        {editingId === "new" && (
          <div className="mb-4">
            <PersonaEditor
              p={{ name: "", role: "", ageRange: "", goals: "", pains: "", channel: "", quote: "" }}
              onSave={handleSavePersona}
              onCancel={() => setEditingId(null)} />
          </div>
        )}

        {personas.length === 0 && editingId !== "new" && (
          <div className="text-center py-10 text-stone-400">
            <Icon name="users" size={28} className="mx-auto mb-2 text-stone-300" />
            <div className="text-[13px] font-medium text-stone-500 mb-1">Még nincs persona definiálva</div>
            <div className="text-[11.5px]">Adj hozzá legalább 1–3 persona-t, hogy a csapat tudja, kiket céloz a kommunikáció.</div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {personas.map((p) =>
            editingId === p.id ? (
              <div key={p.id} className="sm:col-span-2">
                <PersonaEditor p={p} onSave={handleSavePersona} onCancel={() => setEditingId(null)} />
              </div>
            ) : (
              <PersonaCard key={p.id} p={p}
                onEdit={() => setEditingId(p.id)}
                onRemove={() => { if (confirm(`Törlöd a "${p.name}" persona-t?`)) window.sim.removePersona(p.id); }} />
            )
          )}
        </div>
      </Card>
    </div>
  );
}

window.BrandingPanel = BrandingPanel;
