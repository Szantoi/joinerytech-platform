// Settings v2 — improved panels: Roles · Partners · Catalog · StageChain
// Exported to window, overriding the originals from page-extras-2.jsx
const { useState: useStateSx, useMemo: useMemoSx } = React;

// ── helpers shared across panels ────────────────────────────────────────────
function SxLabel({ children }) {
  return <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">{children}</div>;
}
function SxInput({ value, onChange, placeholder, mono, className = "" }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${mono ? "font-mono" : ""} ${className}`} />
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. RolesPanel v2 — permission matrix + user-count + role editor SlideOver
// ══════════════════════════════════════════════════════════════════════════════
const ROLE_META = {
  admin:    { desc: "Teljes hozzáférés minden modulhoz és beállításhoz.", users: ["Kovács Péter"] },
  manager:  { desc: "Gyártás, értékesítés, raktár — beállítások olvasás.", users: ["Szabó Anna", "Tóth Kinga"] },
  operator: { desc: "Gyártás teljes, többi modul olvasás. Nincs beszerzés, beállítás.", users: ["Nagy János", "Kiss András", "Horváth Éva"] },
  viewer:   { desc: "Csak olvasás mindenhol. Beállítás nélkül.", users: [] },
};

const PERM_CFG = {
  full: { label: "Teljes", bg: "bg-teal-50",   fg: "text-teal-700",  border: "border-teal-200", icon: "check" },
  read: { label: "Olvasás", bg: "bg-stone-50",  fg: "text-stone-600", border: "border-stone-200", icon: "user" },
  none: { label: "Nincs",   bg: "bg-rose-50",   fg: "text-rose-600",  border: "border-rose-100",  icon: "x" },
};

function RolesPanel({ t }) {
  const [matrix, setMatrix] = useStateSx(ROLE_MATRIX);
  const [openRole, setOpenRole] = useStateSx(null);

  const cycle = cur => cur === "full" ? "read" : cur === "read" ? "none" : "full";
  const setCell = (role, mod) => {
    if (role === "admin") return;
    setMatrix(m => ({ ...m, [role]: { ...m[role], [mod]: cycle(m[role][mod]) } }));
  };

  const modLabels = { orders: "Rendelések", production: "Gyártás", inventory: "Raktár", procurement: "Beszerzés", analytics: "Elemzés", settings: "Beállítások" };

  return (
    <div className="space-y-4">
      {/* Role summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ROLE_KEYS.map(role => {
          const meta = ROLE_META[role];
          const locked = role === "admin";
          return (
            <button key={role} onClick={() => setOpenRole(role)}
              className="text-left bg-white border border-stone-200/80 hover:border-stone-300 rounded-xl p-4 transition">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg grid place-items-center text-[11px] font-bold ${locked ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"}`}>
                  {t.set.role[role]?.[0]?.toUpperCase() || role[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-stone-900 truncate">{t.set.role[role] || role}</div>
                  {locked && <div className="text-[9.5px] text-stone-400">Rendszer · zárolt</div>}
                </div>
              </div>
              <div className="text-[10.5px] text-stone-500 leading-snug mb-3">{meta.desc}</div>
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {meta.users.slice(0, 3).map(u => (
                    <div key={u} className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 grid place-items-center text-[9px] font-bold text-white border-2 border-white" title={u}>
                      {u.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                  ))}
                </div>
                <span className="text-[10.5px] text-stone-500">{meta.users.length} felhasználó</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Permission matrix */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-200/80 flex items-center justify-between">
          <div className="text-[12.5px] font-semibold text-stone-900">Jogosultsági mátrix</div>
          <div className="flex items-center gap-3 text-[10.5px] text-stone-500">
            {Object.entries(PERM_CFG).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1"><Icon name={v.icon} size={11} className={v.fg} />{v.label}</span>
            ))}
            <span className="text-stone-400 ml-2">Kattints a cellára</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-stone-50/60 border-b border-stone-100">
                <th className="text-left px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium w-[180px]">Szerepkör</th>
                {PERMISSION_MODULES.map(m => (
                  <th key={m} className="text-center px-3 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">{modLabels[m] || m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLE_KEYS.map(role => {
                const locked = role === "admin";
                const meta = ROLE_META[role];
                return (
                  <tr key={role} className={`border-b border-stone-100 last:border-0 ${locked ? "bg-stone-50/40" : "hover:bg-stone-50/30"}`}>
                    <td className="px-5 py-3">
                      <div className="text-[12.5px] font-medium text-stone-900">{t.set.role[role] || role}</div>
                      <div className="text-[10px] text-stone-400">{meta.users.length} fő</div>
                    </td>
                    {PERMISSION_MODULES.map(mod => {
                      const v = matrix[role][mod];
                      const cfg = PERM_CFG[v];
                      return (
                        <td key={mod} className="px-3 py-3 text-center">
                          <button disabled={locked} onClick={() => setCell(role, mod)}
                            className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium w-[78px] transition ${cfg.bg} ${cfg.fg} ${cfg.border} ${locked ? "opacity-75 cursor-not-allowed" : "hover:brightness-95 active:scale-[.97]"}`}>
                            <Icon name={cfg.icon} size={11} />{cfg.label}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role detail SlideOver */}
      <SlideOver open={!!openRole} onClose={() => setOpenRole(null)}
        title={openRole ? (t.set.role[openRole] || openRole) : ""}
        subtitle={openRole ? ROLE_META[openRole]?.desc : ""}
        width={480}
        footer={
          openRole !== "admin"
            ? <><GhostBtn onClick={() => setOpenRole(null)}>Bezár</GhostBtn><PrimaryBtn icon="check" onClick={() => { setOpenRole(null); window.toast?.("✓ Szerepkör mentve", "success"); }}>Mentés</PrimaryBtn></>
            : <GhostBtn onClick={() => setOpenRole(null)}>Bezár</GhostBtn>
        }
      >
        {openRole && (
          <div className="px-5 py-4 space-y-5">
            <div>
              <SxLabel>Hozzárendelt felhasználók ({ROLE_META[openRole].users.length})</SxLabel>
              {ROLE_META[openRole].users.length === 0
                ? <div className="text-[12px] text-stone-400 italic px-1">Nincs hozzárendelt felhasználó</div>
                : (
                  <div className="space-y-1.5">
                    {ROLE_META[openRole].users.map(u => (
                      <div key={u} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-stone-50 border border-stone-100">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 grid place-items-center text-[10px] font-bold text-white shrink-0">
                          {u.split(" ").map(w => w[0]).join("").slice(0, 2)}
                        </div>
                        <span className="text-[12.5px] text-stone-900 flex-1">{u}</span>
                        {openRole !== "admin" && <button className="text-[10.5px] text-rose-600 hover:underline">Eltávolít</button>}
                      </div>
                    ))}
                  </div>
                )
              }
              {openRole !== "admin" && (
                <button className="mt-2 text-[11.5px] text-teal-700 font-medium inline-flex items-center gap-1 hover:text-teal-800">
                  <Icon name="plus" size={12} />Felhasználó hozzárendelése
                </button>
              )}
            </div>
            <div>
              <SxLabel>Jogosultságok</SxLabel>
              <div className="space-y-1.5">
                {PERMISSION_MODULES.map(mod => {
                  const v = matrix[openRole][mod];
                  const cfg = PERM_CFG[v];
                  return (
                    <div key={mod} className="flex items-center justify-between px-3 py-2 rounded-lg bg-stone-50 border border-stone-100">
                      <span className="text-[12px] text-stone-800">{modLabels[mod] || mod}</span>
                      <div className="flex items-center gap-1.5">
                        {["full","read","none"].map(opt => (
                          <button key={opt} disabled={openRole === "admin"} onClick={() => setMatrix(m => ({ ...m, [openRole]: { ...m[openRole], [mod]: opt } }))}
                            className={`h-7 px-2.5 rounded-md text-[11px] font-medium border transition ${v === opt ? `${PERM_CFG[opt].bg} ${PERM_CFG[opt].fg} ${PERM_CFG[opt].border}` : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"} ${openRole === "admin" ? "opacity-60 cursor-not-allowed" : ""}`}>
                            {PERM_CFG[opt].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. PartnersPanel v2 — suspended state + better detail
// ══════════════════════════════════════════════════════════════════════════════
const PARTNER_STATUS_CFG = {
  active:    { label: "Aktív",       bg: "bg-emerald-50", fg: "text-emerald-700", dot: "bg-emerald-500" },
  pending:   { label: "Meghívott",   bg: "bg-amber-50",   fg: "text-amber-700",   dot: "bg-amber-400"  },
  suspended: { label: "Felfüggesztve",bg: "bg-rose-50",   fg: "text-rose-700",    dot: "bg-rose-500"   },
};
const PARTNER_TYPE_TONE2 = {
  manufacturer: "bg-violet-50 text-violet-700",
  cutter:       "bg-sky-50 text-sky-700",
  trader:       "bg-amber-50 text-amber-700",
  supplier:     "bg-teal-50 text-teal-700",
};

function PartnersPanel({ lang = "hu" }) {
  const sim = useSim();
  const types = PARTNER_TYPES[lang] || PARTNER_TYPES.hu;
  const typeLabel = (p) => (window.PARTNER_TYPE_LABEL ? (window.PARTNER_TYPE_LABEL[p.actorType] || p.actorType) : (window.actorMeta ? window.actorMeta(p.actorType).l : (types[p.type] || p.actorType || "—")));
  const partners = (sim.partners || []).map(p => {
    const prof = sim.partnerProfile(p.name);
    const st = sim.partnerStats(p.name);
    return { ...p, type: p.actorType, status: prof.status || "active", rating: prof.rating || 0,
      sharedOrders: st.poCount + st.hsTotal, contact: p.contact || "—" };
  });

  const [cockpitName, setCockpitName] = useStateSx(null);
  const [showInvite, setShowInvite] = useStateSx(false);
  const [filterStatus, setFilterStatus] = useStateSx("all");
  const [inviteEmail, setInviteEmail] = useStateSx("");
  const [inviteType, setInviteType] = useStateSx("supplier");

  const filtered = filterStatus === "all" ? partners : partners.filter(p => p.status === filterStatus);


  const StatusPill2 = ({ status }) => {
    const c = PARTNER_STATUS_CFG[status] || PARTNER_STATUS_CFG.active;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium ${c.bg} ${c.fg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5">
          {[["all", "Összes"], ["active", "Aktív"], ["pending", "Meghívott"], ["suspended", "Felfüggesztve"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilterStatus(k)}
              className={`px-2.5 h-7 rounded-md text-[11.5px] font-medium ${filterStatus === k ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>{l}
              <span className={`ml-1 text-[10px] tabular-nums ${filterStatus === k ? "text-white/60" : "text-stone-400"}`}>
                {k === "all" ? partners.length : partners.filter(p => p.status === k).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <PrimaryBtn icon="plus" onClick={() => setShowInvite(true)}>Partner meghívása</PrimaryBtn>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="hidden md:grid grid-cols-[minmax(0,1.8fr)_130px_140px_100px_100px_28px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40">
          <div>Partner</div><div>Típus</div><div>Kapcsolat</div><div className="text-right">Rendelések</div><div>Státusz</div><div></div>
        </div>
        {filtered.map(p => (
          <button key={p.id} onClick={() => setCockpitName(p.name)}
            className="w-full text-left hidden md:grid grid-cols-[minmax(0,1.8fr)_130px_140px_100px_100px_28px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center hover:bg-stone-50/60">
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium text-stone-900 truncate flex items-center gap-2">
                {p.name}
                {p.status === "suspended" && <Icon name="alert" size={12} className="text-rose-500 shrink-0" />}
              </div>
              <div className="text-[10.5px] font-mono text-stone-400 truncate">{p.id}</div>
            </div>
            <div><span className={`text-[10.5px] px-2 py-0.5 rounded-full font-medium ${PARTNER_TYPE_TONE2[p.type] || "bg-stone-100 text-stone-600"}`}>{typeLabel(p)}</span></div>
            <div className="text-[11.5px] text-stone-600 truncate">{p.contact?.split("·")[0]?.trim() || "—"}</div>
            <div className="text-[12px] tabular-nums text-right font-medium text-stone-800">{p.sharedOrders}</div>
            <div><StatusPill2 status={p.status} /></div>
            <div className="text-stone-400"><Icon name="chevron" size={13} /></div>
          </button>
        ))}
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-stone-100">
          {filtered.map(p => (
            <button key={p.id} onClick={() => setCockpitName(p.name)}
              className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-stone-50/60 active:bg-stone-100/60 transition">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-medium text-stone-900 truncate">{p.name}</span>
                  {p.status === "suspended" && <Icon name="alert" size={12} className="text-rose-500 shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusPill2 status={p.status} />
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PARTNER_TYPE_TONE2[p.type] || "bg-stone-100 text-stone-600"}`}>{typeLabel(p)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[13px] font-semibold text-stone-800 tabular-nums">{p.sharedOrders}</div>
                <div className="text-[10px] text-stone-400">rendelés</div>
              </div>
              <Icon name="chevron" size={15} className="text-stone-300 shrink-0" />
            </button>
          ))}
        </div>
      </Card>

      {/* Invitations */}
      {PARTNER_INVITES.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-2.5 border-b border-stone-100 text-[11px] font-semibold text-stone-600 uppercase tracking-wide bg-stone-50/40">
            Kimenő meghívók ({PARTNER_INVITES.length})
          </div>
          {PARTNER_INVITES.map((inv, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-2.5 border-b border-stone-100 last:border-0 text-[12px]">
              <Icon name="send" size={13} className="text-stone-400 shrink-0" />
              <span className="font-mono text-stone-700 flex-1">{inv.email}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PARTNER_TYPE_TONE2[inv.type]}`}>{types[inv.type]}</span>
              <span className="font-mono text-stone-400 text-[10.5px]">{inv.sent}</span>
              <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-medium ${inv.state === "pending" ? "bg-amber-50 text-amber-700" : "bg-stone-100 text-stone-500"}`}>{inv.state === "pending" ? "Függő" : "Lejárt"}</span>
              <button className="text-[10.5px] text-stone-400 hover:text-rose-600"><Icon name="x" size={13} /></button>
            </div>
          ))}
        </Card>
      )}

      {/* Partner-kapcsolat cockpit (teljes képernyős) */}
      {cockpitName && window.PartnerCockpit && <window.PartnerCockpit partnerName={cockpitName} onClose={() => setCockpitName(null)} />}

      {/* Invite SlideOver */}
      <SlideOver open={showInvite} onClose={() => setShowInvite(false)}
        title="Partner meghívása" subtitle="B2B portál hozzáférés + API kulcs generálás" width={480}
        footer={<><GhostBtn onClick={() => setShowInvite(false)}>Mégse</GhostBtn><PrimaryBtn icon="send" onClick={() => { setShowInvite(false); window.toast?.("✓ Meghívó elküldve", "success"); }}>Meghívó küldése</PrimaryBtn></>}>
        <div className="px-5 py-4 space-y-4">
          <div><SxLabel>E-mail cím</SxLabel><SxInput value={inviteEmail} onChange={setInviteEmail} placeholder="b2b@partner.hu" mono /></div>
          <div>
            <SxLabel>Partner típus</SxLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(types).map(([k, label]) => (
                <button key={k} onClick={() => setInviteType(k)}
                  className={`h-9 rounded-lg text-[12px] border transition ${inviteType === k ? "bg-teal-700 text-white border-teal-700" : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[11.5px] text-amber-800 flex gap-2">
            <Icon name="alert" size={14} className="shrink-0 mt-0.5" />
            API kulcsot generálunk a meghíváskor — a kulcs csak egyszer látható.
          </div>
        </div>
      </SlideOver>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. CatalogPanel v2 — CRUD + CSV import + archive
// ══════════════════════════════════════════════════════════════════════════════
const CATALOG_ITEMS_INIT = [
  { id: "c1",  code: "BK-018-2440", name: "Bükk 18mm tábla",      unit: "tábla", cat: "Lemez",   price: 18500, supplier: "Falco Sopron Zrt.",  active: true  },
  { id: "c2",  code: "TL-022-2440", name: "Tölgy 22mm tábla",     unit: "tábla", cat: "Lemez",   price: 31800, supplier: "Egger Faipari Kft.", active: true  },
  { id: "c3",  code: "MDF-019",     name: "MDF 19mm tábla",       unit: "tábla", cat: "Lemez",   price: 9600,  supplier: "Kronospan HU Zrt.", active: true  },
  { id: "c4",  code: "MDF-016-W",   name: "MDF 16mm fehér",       unit: "tábla", cat: "Lemez",   price: 8700,  supplier: "Kronospan HU Zrt.", active: true  },
  { id: "c5",  code: "HDF-003",     name: "HDF 3mm fehér",        unit: "tábla", cat: "Lemez",   price: 3200,  supplier: "Egger Faipari Kft.", active: true  },
  { id: "c6",  code: "EZ-ABS-22-TL","name": "ABS élzáró 22mm tölgy", unit: "fm",  cat: "Élzáró",  price: 220,   supplier: "Rehau HU",          active: true  },
  { id: "c7",  code: "VS-BL-CT",   name: "Blum CLIP top 110°",   unit: "db",    cat: "Vasalat",  price: 1240,  supplier: "Blum Hungária",     active: true  },
  { id: "c8",  code: "VS-HE-500",  name: "Hettich fiókcsúszó 500mm",unit:"db",  cat: "Vasalat",  price: 1180,  supplier: "Hettich Hungary",   active: true  },
  { id: "c9",  code: "CS-SP-440",  name: "Spax csavar 4×40",     unit: "db",    cat: "Kötszer",  price: 12,    supplier: "Würth HU",          active: true  },
  { id: "c10", code: "TL-040",     name: "Tölgy 40mm tömör",     unit: "fm",    cat: "Tömörfa",  price: 32400, supplier: "Falco Sopron Zrt.", active: false },
];

const CATS = ["Összes", "Lemez", "Élzáró", "Vasalat", "Kötszer", "Tömörfa"];

function CatalogPanel() {
  const [items, setItems] = useStateSx(CATALOG_ITEMS_INIT);
  const [editId, setEditId] = useStateSx(null);
  const [showNew, setShowNew] = useStateSx(false);
  const [showImport, setShowImport] = useStateSx(false);
  const [cat, setCat] = useStateSx("Összes");
  const [showArchived, setShowArchived] = useStateSx(false);
  const [q, setQ] = useStateSx("");

  const [form, setForm] = useStateSx({ code: "", name: "", unit: "tábla", cat: "Lemez", price: "", supplier: "" });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const editItem = items.find(i => i.id === editId);
  const filtered = items.filter(i => {
    if (!showArchived && !i.active) return false;
    if (cat !== "Összes" && i.cat !== cat) return false;
    if (q && !i.name.toLowerCase().includes(q.toLowerCase()) && !i.code.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const doArchive = (id) => { setItems(its => its.map(i => i.id === id ? { ...i, active: false } : i)); setEditId(null); window.toast?.("Anyag archiválva", "info"); };
  const doRestore = (id) => { setItems(its => its.map(i => i.id === id ? { ...i, active: true } : i)); window.toast?.("Anyag visszaállítva", "success"); };
  const doSaveNew = () => {
    const id = "c" + (items.length + 1);
    setItems(its => [{ id, ...form, price: Number(form.price) || 0, active: true }, ...its]);
    setForm({ code: "", name: "", unit: "tábla", cat: "Lemez", price: "", supplier: "" });
    setShowNew(false);
    window.toast?.("✓ Anyag hozzáadva", "success");
  };
  const doSaveEdit = () => {
    setItems(its => its.map(i => i.id === editId ? { ...i, ...form, price: Number(form.price) || i.price } : i));
    setEditId(null);
    window.toast?.("✓ Anyag frissítve", "success");
  };

  const openEdit = (item) => {
    setForm({ code: item.code, name: item.name, unit: item.unit, cat: item.cat, price: String(item.price), supplier: item.supplier });
    setEditId(item.id);
  };

  const ItemForm = ({ onSave, onCancel, saveLabel }) => (
    <div className="px-5 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><SxLabel>Kód</SxLabel><SxInput value={form.code} onChange={v => setF("code", v)} placeholder="pl. BK-018-2440" mono /></div>
        <div><SxLabel>Név</SxLabel><SxInput value={form.name} onChange={v => setF("name", v)} placeholder="pl. Bükk 18mm tábla" /></div>
        <div>
          <SxLabel>Kategória</SxLabel>
          <select value={form.cat} onChange={e => setF("cat", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white">
            {["Lemez","Élzáró","Vasalat","Kötszer","Tömörfa"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <SxLabel>Egység</SxLabel>
          <select value={form.unit} onChange={e => setF("unit", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white">
            {["tábla","db","fm","m²","kg","csomag"].map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div><SxLabel>Egységár (Ft)</SxLabel><SxInput value={form.price} onChange={v => setF("price", v)} placeholder="9600" mono /></div>
        <div><SxLabel>Szállító</SxLabel><SxInput value={form.supplier} onChange={v => setF("supplier", v)} placeholder="Szállító neve" /></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5">
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-2.5 h-7 rounded-md text-[11.5px] font-medium ${cat === c ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>{c}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 h-8 flex-1 min-w-[150px] sm:flex-none sm:w-[220px] rounded-lg bg-white border border-stone-200 text-stone-500">
          <Icon name="search" size={13} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Kód, név…" className="bg-transparent outline-none text-[11.5px] flex-1 min-w-0 placeholder:text-stone-400" />
        </div>
        <label className="flex items-center gap-1.5 text-[11.5px] text-stone-600 cursor-pointer ml-1">
          <input type="checkbox" checked={showArchived} onChange={() => setShowArchived(v => !v)} className="rounded" />
          Archiváltak
        </label>
        <div className="flex-1" />
        <GhostBtn icon="download" onClick={() => setShowImport(true)}>Import CSV</GhostBtn>
        <PrimaryBtn icon="plus" onClick={() => setShowNew(true)}>Új anyag</PrimaryBtn>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="hidden md:grid grid-cols-[90px_minmax(0,1.8fr)_80px_100px_100px_minmax(0,1fr)_80px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40">
          <div>Kód</div><div>Név</div><div>Kat.</div><div>Egység</div><div className="text-right">Ár / egység</div><div>Szállító</div><div></div>
        </div>
        {filtered.map(item => (
          <div key={item.id} className={`hidden md:grid grid-cols-[90px_minmax(0,1.8fr)_80px_100px_100px_minmax(0,1fr)_80px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center ${!item.active ? "opacity-50" : "hover:bg-stone-50/60"}`}>
            <div className="text-[11px] font-mono text-stone-500 truncate">{item.code}</div>
            <div className="text-[12.5px] font-medium text-stone-900 truncate">{item.name}</div>
            <div><span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium">{item.cat}</span></div>
            <div className="text-[11.5px] text-stone-600">{item.unit}</div>
            <div className="text-[12px] tabular-nums text-right font-medium text-stone-800">{fmtHUF(item.price)}</div>
            <div className="text-[11.5px] text-stone-600 truncate">{item.supplier}</div>
            <div className="flex items-center gap-1 justify-end">
              {item.active
                ? <><button onClick={() => openEdit(item)} className="w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Icon name="settings" size={13} /></button>
                    <button onClick={() => doArchive(item.id)} className="w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="x" size={13} /></button></>
                : <button onClick={() => doRestore(item.id)} className="text-[10px] px-2 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200">Vissza</button>
              }
            </div>
          </div>
        ))}
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-stone-100">
          {filtered.map(item => (
            <div key={item.id} className={`px-4 py-3.5 flex items-center gap-3 ${!item.active ? "opacity-50" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-medium text-stone-900 truncate">{item.name}</span>
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium">{item.cat}</span>
                </div>
                <div className="text-[11px] font-mono text-stone-500 mt-0.5 truncate">{item.code} · {item.supplier}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[13px] font-semibold text-stone-800 tabular-nums">{fmtHUF(item.price)}</div>
                <div className="text-[10px] text-stone-400">/ {item.unit}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.active
                  ? <><button onClick={() => openEdit(item)} className="w-8 h-8 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Icon name="settings" size={14} /></button>
                      <button onClick={() => doArchive(item.id)} className="w-8 h-8 grid place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="x" size={14} /></button></>
                  : <button onClick={() => doRestore(item.id)} className="text-[10.5px] px-2 py-1.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200">Vissza</button>
                }
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="px-5 py-8 text-center text-[12px] text-stone-400">Nincs találat</div>}
      </Card>

      {/* New item SlideOver */}
      <SlideOver open={showNew} onClose={() => setShowNew(false)} title="Új anyag" width={500}
        footer={<><GhostBtn onClick={() => setShowNew(false)}>Mégse</GhostBtn><PrimaryBtn icon="check" onClick={doSaveNew}>Hozzáadás</PrimaryBtn></>}>
        <ItemForm onSave={doSaveNew} onCancel={() => setShowNew(false)} saveLabel="Hozzáadás" />
      </SlideOver>

      {/* Edit SlideOver */}
      <SlideOver open={!!editItem} onClose={() => setEditId(null)} title="Anyag szerkesztése" subtitle={editItem?.code} width={500}
        footer={<><GhostBtn onClick={() => { doArchive(editId); }}>Archiválás</GhostBtn><GhostBtn onClick={() => setEditId(null)}>Mégse</GhostBtn><PrimaryBtn icon="check" onClick={doSaveEdit}>Mentés</PrimaryBtn></>}>
        {editItem && <ItemForm onSave={doSaveEdit} onCancel={() => setEditId(null)} saveLabel="Mentés" />}
      </SlideOver>

      {/* Import SlideOver */}
      <SlideOver open={showImport} onClose={() => setShowImport(false)} title="Tömeges import" subtitle="CSV vagy Excel fájl feltöltése" width={500}
        footer={<><GhostBtn onClick={() => setShowImport(false)}>Mégse</GhostBtn><PrimaryBtn icon="download" onClick={() => { setShowImport(false); window.toast?.("✓ 12 sor importálva", "success"); }}>Importálás</PrimaryBtn></>}>
        <div className="px-5 py-4 space-y-4">
          <div className="border-2 border-dashed border-stone-200 rounded-xl px-5 py-10 text-center hover:border-teal-400 hover:bg-teal-50/20 transition cursor-pointer">
            <Icon name="download" size={28} className="text-stone-300 mx-auto mb-3" />
            <div className="text-[13px] font-medium text-stone-700">Húzd ide a fájlt</div>
            <div className="text-[11.5px] text-stone-500 mt-1">vagy <span className="text-teal-700 font-medium underline">tallózz</span></div>
            <div className="text-[10.5px] text-stone-400 mt-2 font-mono">CSV · XLSX · max 5 MB</div>
          </div>
          <Card className="p-3">
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2">Elvárt fejléc-sorrend</div>
            <div className="font-mono text-[11px] text-teal-700 bg-teal-50/50 rounded px-3 py-2">kód, név, kategória, egység, ár_ft, szállító</div>
          </Card>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[11.5px] text-amber-800 flex gap-2">
            <Icon name="alert" size={14} className="shrink-0 mt-0.5" />
            Meglévő kódokhoz az adatok frissülnek. Új kódok hozzáadódnak. Archiválás nem lehetséges importon keresztül.
          </div>
        </div>
      </SlideOver>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. StageChainEditor v2 — color + SLA + role + improved chain viz
// ══════════════════════════════════════════════════════════════════════════════
const STAGE_COLORS_PALETTE = [
  "#0d9488","#0ea5e9","#8b5cf6","#f59e0b","#10b981","#f97316","#ec4899","#6366f1","#ef4444","#84cc16",
];
const STAGE_ROLES_OPTIONS = ["—", "admin", "manager", "operator"];

function StageChainEditor({ t }) {
  const initChain = STAGES.map((s, i) => ({
    ...s,
    color: STAGE_COLORS_PALETTE[i % STAGE_COLORS_PALETTE.length],
    sla: [8, 24, 4, 2, 8, 16, 4][i] || 8,
    role: ["manager","operator","operator","operator","operator","operator","manager"][i] || "operator",
  }));
  const [chain, setChain] = useStateSx(initChain);
  const [drag, setDrag] = useStateSx(null);
  const [editIdx, setEditIdx] = useStateSx(null);
  const [editForm, setEditForm] = useStateSx(null);

  const move = (from, to) => {
    if (from === to) return;
    setChain(c => { const n = [...c]; const [it] = n.splice(from, 1); n.splice(to, 0, it); return n; });
  };
  const remove = (i) => setChain(c => c.filter((_, idx) => idx !== i));
  const add = () => setChain(c => [...c, { key: `custom-${c.length}`, hu: "Új lépés", en: "New stage", optional: false, color: STAGE_COLORS_PALETTE[c.length % STAGE_COLORS_PALETTE.length], sla: 8, role: "operator" }]);
  const openEdit = (i) => { setEditForm({ ...chain[i] }); setEditIdx(i); };
  const saveEdit = () => { setChain(c => c.map((s, i) => i === editIdx ? { ...editForm } : s)); setEditIdx(null); };
  const setEF = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      {/* Flow visualization */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[12.5px] font-semibold text-stone-900">Gyártási folyamat lánc</div>
            <div className="text-[11px] text-stone-500">{chain.length} lépés · {chain.filter(s => !s.optional).length} kötelező · {chain.filter(s => s.optional).length} opcionális</div>
          </div>
          <PrimaryBtn icon="plus" onClick={add}>Lépés hozzáadása</PrimaryBtn>
        </div>

        {/* Visual chain */}
        <div className="flex items-start gap-1 flex-wrap pb-2 overflow-x-auto">
          {chain.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              <div className="flex flex-col items-center">
                <div className={`px-3 py-2 rounded-xl text-[11.5px] font-semibold text-white shadow-sm cursor-pointer hover:brightness-110 transition ${s.optional ? "opacity-60" : ""}`}
                  style={{ background: s.color }} onClick={() => openEdit(i)}>
                  {s.hu}
                  {s.optional && <span className="text-white/60 font-normal text-[9.5px] ml-1">· opt</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[9.5px] text-stone-500 font-mono">
                  <span>{s.sla}h SLA</span>
                  <span>·</span>
                  <span>{s.role}</span>
                </div>
              </div>
              {i < chain.length - 1 && (
                <svg width="24" height="20" viewBox="0 0 24 20" className="shrink-0 mt-1">
                  <path d="M4 10h16M16 6l4 4-4 4" stroke="#d6d3d1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Editable list */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
        <div className="min-w-[560px]">
        <div className="grid grid-cols-[28px_28px_1fr_80px_90px_100px_56px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40">
          <div></div><div></div><div>Lépés neve</div><div>SLA (h)</div><div>Szerepkör</div><div>Opcionális</div><div></div>
        </div>
        {chain.map((s, i) => (
          <div key={s.key} draggable
            onDragStart={() => setDrag(i)} onDragOver={e => e.preventDefault()}
            onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }} onDragEnd={() => setDrag(null)}
            className={`grid grid-cols-[28px_28px_1fr_80px_90px_100px_56px] gap-3 px-5 py-2.5 border-b border-stone-100 last:border-0 items-center transition ${drag === i ? "bg-teal-50/60 opacity-70" : "hover:bg-stone-50/40"}`}>
            {/* drag handle */}
            <div className="cursor-grab text-stone-400 active:cursor-grabbing">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
            </div>
            {/* color swatch */}
            <button onClick={() => openEdit(i)} className="w-6 h-6 rounded-md border-2 border-white shadow-sm hover:scale-110 transition" style={{ background: s.color }} />
            {/* name */}
            <div className="text-[12.5px] font-medium text-stone-900 truncate">{s.hu}</div>
            {/* SLA */}
            <div className="text-[11.5px] font-mono text-stone-600 tabular-nums">{s.sla}h</div>
            {/* role */}
            <div><span className="text-[10.5px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">{s.role}</span></div>
            {/* optional toggle */}
            <div>
              <button onClick={() => setChain(c => c.map((x, idx) => idx === i ? { ...x, optional: !x.optional } : x))}
                className={`h-6 w-11 rounded-full relative transition ${s.optional ? "bg-teal-600" : "bg-stone-200"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${s.optional ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
            {/* delete */}
            <button onClick={() => remove(i)} className="w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-600">
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
        </div>
        </div>
      </Card>

      <div className="flex items-center gap-2 justify-end">
        <GhostBtn onClick={() => setChain(initChain)}>Visszaállítás</GhostBtn>
        <PrimaryBtn icon="check" onClick={() => window.toast?.("✓ StageChain mentve", "success")}>Mentés</PrimaryBtn>
      </div>

      {/* Stage edit SlideOver */}
      <SlideOver open={editIdx !== null} onClose={() => setEditIdx(null)}
        title="Lépés szerkesztése" subtitle={editForm?.hu} width={440}
        footer={<><GhostBtn onClick={() => setEditIdx(null)}>Mégse</GhostBtn><PrimaryBtn icon="check" onClick={saveEdit}>Mentés</PrimaryBtn></>}>
        {editForm && (
          <div className="px-5 py-4 space-y-4">
            <div><SxLabel>Név (HU)</SxLabel><SxInput value={editForm.hu} onChange={v => setEF("hu", v)} /></div>
            <div><SxLabel>Név (EN)</SxLabel><SxInput value={editForm.en} onChange={v => setEF("en", v)} /></div>
            <div>
              <SxLabel>Szín</SxLabel>
              <div className="flex gap-2 flex-wrap">
                {STAGE_COLORS_PALETTE.map(c => (
                  <button key={c} onClick={() => setEF("color", c)}
                    className={`w-8 h-8 rounded-lg border-2 transition hover:scale-110 ${editForm.color === c ? "border-stone-900 scale-110" : "border-transparent"}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <SxLabel>SLA (órában)</SxLabel>
                <input type="number" value={editForm.sla} min={1} onChange={e => setEF("sla", Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500" />
              </div>
              <div>
                <SxLabel>Felelős szerepkör</SxLabel>
                <select value={editForm.role} onChange={e => setEF("role", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white">
                  {STAGE_ROLES_OPTIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200">
              <span className="text-[12.5px] text-stone-700">Opcionális lépés</span>
              <button onClick={() => setEF("optional", !editForm.optional)}
                className={`h-6 w-11 rounded-full relative transition ${editForm.optional ? "bg-teal-600" : "bg-stone-200"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${editForm.optional ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
            <div className="pt-3 border-t border-stone-200 flex items-center gap-2">
              <div className="flex-1 py-3 rounded-xl text-center text-[12px] font-semibold text-white" style={{ background: editForm.color }}>{editForm.hu}</div>
              <div className="text-[10.5px] text-stone-500 text-center w-24">
                <div className="font-mono">{editForm.sla}h SLA</div>
                <div>{editForm.role}</div>
                {editForm.optional && <div className="text-amber-600">opcionális</div>}
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}

Object.assign(window, { RolesPanel, PartnersPanel, CatalogPanel, StageChainEditor, SxLabel, SxInput });
