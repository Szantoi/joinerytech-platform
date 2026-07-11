// New Order drawer + extended Settings panels (Facilities, Partners, Roles) + Templates
const { useState: useStateE2, useEffect: useEffectE2 } = React;

// ──────────────────────────────────────────────────────────────────────────
// Generic right-side slide-over (matches Workflow detail)
// ──────────────────────────────────────────────────────────────────────────
function SlideOver({ open, onClose, title, subtitle, width = 520, children, footer }) {
  useEffectE2(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  // Mobil: alulról jövő lap (bottom-sheet) lekerekített tetővel + fogantyú-fül;
  // desktop (≥640px): jobbról csúszó panel. Pure-CSS, resize-re reaktív.
  useEffectE2(() => {
    if (window.__soStyle) return;
    const st = document.createElement("style");
    st.textContent =
      ".so-panel{position:absolute;left:0;right:0;bottom:0;width:auto;max-height:92vh;border-radius:18px 18px 0 0;}" +
      "@media(min-width:640px){.so-panel{left:auto;top:0;bottom:auto;height:100%;max-height:none;border-radius:0;width:min(var(--so-w,520px),100vw);}}";
    document.head.appendChild(st);
    window.__soStyle = true;
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="so-panel bg-white shadow-2xl flex flex-col" style={{ "--so-w": `${width}px` }}>
        <button onClick={onClose} aria-label="Bezárás" className="sm:hidden w-full flex justify-center pt-2.5 pb-1 shrink-0 active:bg-stone-50">
          <span className="block w-10 h-1.5 rounded-full bg-stone-300" />
        </button>
        <div className="px-5 py-3.5 sm:py-4 border-b border-stone-200 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-stone-900 truncate">{title}</div>
            {subtitle && <div className="text-[11.5px] text-stone-500 mt-0.5 truncate">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700 shrink-0">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center gap-2 justify-end flex-wrap" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>{footer}</div>}
      </aside>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// New Order drawer
// ──────────────────────────────────────────────────────────────────────────
function NewOrderDrawer({ open, onClose, t }) {
  const [customer, setCustomer] = useStateE2("");
  const [type, setType] = useStateE2("cabinet");
  const [dims, setDims] = useStateE2("");
  const [due, setDue] = useStateE2("");
  const [showAdv, setShowAdv] = useStateE2(false);
  const [material, setMaterial] = useStateE2("Bükk 18mm");
  const [edge, setEdge] = useStateE2("ABS 2mm színazonos");
  const [finish, setFinish] = useStateE2("Lakkozott");
  const [note, setNote] = useStateE2("");

  const customers = ["Bognár Bútor Kft.", "Várdai Konyhastúdió", "Kiss Lakberendezés", "Helios Faipar Zrt.", "Új ügyfél…"];
  const [showSugg, setShowSugg] = useStateE2(false);
  const matches = customer.length === 0 ? customers.slice(0, 4)
    : customers.filter(c => c.toLowerCase().includes(customer.toLowerCase()));

  const types = [
    { k: "door",    label: t.orders.types.door },
    { k: "cabinet", label: t.orders.types.cabinet },
    { k: "window",  label: t.orders.types.window },
    { k: "custom",  label: t.orders.types.custom },
  ];

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={t.orders.newOrder}
      subtitle="JT-2426-0185 · vázlat"
      width={560}
      footer={
        <>
          <GhostBtn onClick={onClose}>Mégse</GhostBtn>
          <GhostBtn icon="check" onClick={onClose}>Mentés vázlatként</GhostBtn>
          <PrimaryBtn icon="sparkle" onClick={onClose}>Mentés és számítás</PrimaryBtn>
        </>
      }
    >
      <div className="px-5 py-4 space-y-5">
        {/* Customer autocomplete */}
        <div className="relative">
          <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Megrendelő</div>
          <div className="relative">
            <input
              value={customer}
              onChange={(e) => { setCustomer(e.target.value); setShowSugg(true); }}
              onFocus={() => setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 120)}
              placeholder="Kezdj el gépelni…"
              className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
            />
            <Icon name="search" size={14} className="absolute right-3 top-3 text-stone-400" />
          </div>
          {showSugg && matches.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-10 overflow-hidden">
              {matches.map((c, i) => (
                <button key={i}
                  onMouseDown={() => { setCustomer(c); setShowSugg(false); }}
                  className="block w-full text-left px-3 py-2 text-[12.5px] hover:bg-stone-50 border-b border-stone-100 last:border-0">
                  <div className="text-stone-900">{c}</div>
                  {c !== "Új ügyfél…" && <div className="text-[10.5px] text-stone-500">aktív partner</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type */}
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Típus</div>
          <div className="grid grid-cols-4 gap-1.5">
            {types.map(x => (
              <button key={x.k} onClick={() => setType(x.k)}
                className={`h-9 rounded-lg text-[12px] border transition ${type === x.k ? "bg-teal-700 text-white border-teal-700" : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"}`}>
                {x.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dimensions + due */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Méretek</div>
            <input value={dims} onChange={(e) => setDims(e.target.value)}
              placeholder="pl. 600×720×560 mm"
              className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none" />
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Határidő</div>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none" />
          </div>
        </div>

        {/* Advanced expander */}
        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <button onClick={() => setShowAdv(s => !s)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-stone-50 text-left">
            <div>
              <div className="text-[12.5px] font-medium text-stone-900">Részletes specifikáció</div>
              <div className="text-[10.5px] text-stone-500">Anyag, élzárás, felület, megjegyzés, csatolmány</div>
            </div>
            <Icon name="chevron" size={14} className={`text-stone-400 transition ${showAdv ? "rotate-90" : ""}`} />
          </button>
          {showAdv && (
            <div className="px-4 py-4 space-y-4 border-t border-stone-200 bg-stone-50/40">
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Anyag</div>
                <select value={material} onChange={(e) => setMaterial(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white">
                  {CATALOG_MATERIALS.flatMap(m => m.thicknesses.map(th => <option key={m.name + th}>{m.name.replace(" tábla", "")} {th}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Élzárás</div>
                  <select value={edge} onChange={(e) => setEdge(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white">
                    <option>ABS 2mm színazonos</option>
                    <option>ABS 1mm színazonos</option>
                    <option>PVC 2mm</option>
                    <option>Melamin 0.4mm</option>
                  </select>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Felületkezelés</div>
                  <select value={finish} onChange={(e) => setFinish(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white">
                    <option>Lakkozott</option>
                    <option>Olajos lazúr</option>
                    <option>Nyers</option>
                    <option>Fóliázott</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Megjegyzés</div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                  placeholder="Pl. fiókok belül melamin fehér, hátlap CPL"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none" />
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Csatolmány</div>
                <div className="border-2 border-dashed border-stone-200 rounded-lg px-4 py-5 text-center hover:border-teal-400 hover:bg-teal-50/30 cursor-pointer transition">
                  <Icon name="download" size={18} className="text-stone-400 mx-auto" />
                  <div className="text-[11.5px] text-stone-600 mt-1">Húzd ide a fájlt vagy <span className="text-teal-700 font-medium">tallózz</span></div>
                  <div className="text-[10px] text-stone-400 mt-0.5 font-mono">DXF · DWG · PDF · 3DM · max 25 MB</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SlideOver>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Settings: Facilities (Részlegek)
// ──────────────────────────────────────────────────────────────────────────
function FacilitiesPanel() {
  const [openId, setOpenId] = useStateE2(null);
  const facility = FACILITIES.find(f => f.id === openId);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12.5px] text-stone-500">{FACILITIES.length} részleg · {FACILITIES.reduce((a, f) => a + f.machines, 0)} gép · {FACILITIES.reduce((a, f) => a + f.workers, 0)} dolgozó</div>
        <PrimaryBtn icon="plus">Új részleg</PrimaryBtn>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {FACILITIES.map(f => (
          <button key={f.id} onClick={() => setOpenId(f.id)}
            className="text-left bg-white border border-stone-200/80 hover:border-stone-300 rounded-xl p-4 transition">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 grid place-items-center">
                <Icon name="factory" size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-stone-900 truncate">{f.name}</div>
                <div className="text-[11px] text-stone-500 truncate">{f.address}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
              <div className="bg-stone-50 rounded-md px-2.5 py-2">
                <div className="text-stone-500">Gépek</div>
                <div className="text-[16px] font-semibold tabular-nums text-stone-900">{f.machines}</div>
              </div>
              <div className="bg-stone-50 rounded-md px-2.5 py-2">
                <div className="text-stone-500">Dolgozók</div>
                <div className="text-[16px] font-semibold tabular-nums text-stone-900">{f.workers}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-1.5 text-[10.5px] text-stone-500">
              <Icon name="user" size={11} />
              <span className="truncate">{f.contactName}</span>
            </div>
          </button>
        ))}
      </div>

      <SlideOver
        open={!!facility} onClose={() => setOpenId(null)}
        title={facility?.name} subtitle={facility?.address} width={460}
        footer={<><GhostBtn onClick={() => setOpenId(null)}>Bezár</GhostBtn><PrimaryBtn icon="check">Mentés</PrimaryBtn></>}
      >
        {facility && (
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: "Cím", v: facility.address },
                { l: "Kapcsolattartó", v: facility.contactName },
                { l: "Telefon", v: facility.contactPhone },
                { l: "Dolgozók", v: `${facility.workers} fő` },
              ].map((f, i) => (
                <div key={i}>
                  <div className="text-[10.5px] uppercase tracking-wide text-stone-500 mb-1">{f.l}</div>
                  <div className="text-[12.5px] text-stone-900">{f.v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-stone-500 mb-2">Hozzárendelt gépek ({facility.machinesList.length})</div>
              {facility.machinesList.length === 0 && <div className="text-[12px] text-stone-400 italic">Nincs gép — raktári funkció</div>}
              <div className="space-y-1">
                {facility.machinesList.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-md bg-stone-50 border border-stone-100">
                    <Icon name="production" size={13} className="text-stone-500" />
                    <span className="text-[12px] text-stone-800">{m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Settings: Partners
// ──────────────────────────────────────────────────────────────────────────
const PARTNER_TYPE_TONE = {
  manufacturer: "bg-violet-50 text-violet-700",
  cutter:       "bg-sky-50 text-sky-700",
  trader:       "bg-amber-50 text-amber-700",
  supplier:     "bg-teal-50 text-teal-700",
};

function PartnersPanel({ lang = "hu" }) {
  const [openId, setOpenId] = useStateE2(null);
  const [showInvite, setShowInvite] = useStateE2(false);
  const partner = PARTNERS.find(p => p.id === openId);
  const types = PARTNER_TYPES[lang] || PARTNER_TYPES.hu;

  const active = PARTNERS.filter(p => p.status === "active");
  const pending = PARTNERS.filter(p => p.status === "pending");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Active partners */}
      <Card className="lg:col-span-2 p-0">
        <div className="px-5 py-3 border-b border-stone-200/80 flex items-center justify-between">
          <div className="text-[12.5px] font-semibold text-stone-900">Aktív partnerek <span className="text-stone-400 font-normal tabular-nums">({active.length})</span></div>
          <PrimaryBtn icon="plus" onClick={() => setShowInvite(true)}>Partner meghívása</PrimaryBtn>
        </div>
        {active.map(p => (
          <button key={p.id} onClick={() => setOpenId(p.id)}
            className="w-full text-left px-5 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 grid grid-cols-[1fr_120px_120px_100px_24px] gap-3 items-center">
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium text-stone-900 truncate">{p.name}</div>
              <div className="text-[10.5px] text-stone-500 font-mono">{p.contact}</div>
            </div>
            <div><span className={`text-[10.5px] px-2 py-0.5 rounded-full font-medium ${PARTNER_TYPE_TONE[p.type]}`}>{types[p.type]}</span></div>
            <div><StatusPill status="ok" label="Aktív" /></div>
            <div className="text-[11px] font-mono text-stone-500 text-right">{p.joined}</div>
            <div className="text-stone-400"><Icon name="chevron" size={14} /></div>
          </button>
        ))}
      </Card>

      {/* Invitations */}
      <Card className="p-0 self-start">
        <div className="px-5 py-3 border-b border-stone-200/80 text-[12.5px] font-semibold text-stone-900">
          Meghívások <span className="text-stone-400 font-normal tabular-nums">({PARTNER_INVITES.length + pending.length})</span>
        </div>
        {pending.map(p => (
          <div key={p.id} className="px-5 py-3 border-b border-stone-100 last:border-0">
            <div className="text-[12px] font-medium text-stone-900">{p.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PARTNER_TYPE_TONE[p.type]}`}>{types[p.type]}</span>
              <span className="text-[10.5px] text-stone-500 font-mono">{p.joined}</span>
              <StatusPill status="calc" label="Függő" />
            </div>
          </div>
        ))}
        {PARTNER_INVITES.map((inv, i) => (
          <div key={i} className="px-5 py-3 border-b border-stone-100 last:border-0">
            <div className="text-[12px] font-mono text-stone-700 truncate">{inv.email}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PARTNER_TYPE_TONE[inv.type]}`}>{types[inv.type]}</span>
              <span className="text-[10.5px] text-stone-500 font-mono">{inv.sent}</span>
              {inv.state === "pending" ? <StatusPill status="calc" label="Függő" /> : <StatusPill status="critical" label="Lejárt" />}
            </div>
          </div>
        ))}
      </Card>

      {/* Invite drawer */}
      <SlideOver open={showInvite} onClose={() => setShowInvite(false)}
        title="Partner meghívása" subtitle="B2B handshake — API kulcs és szerepkör" width={480}
        footer={<><GhostBtn onClick={() => setShowInvite(false)}>Mégse</GhostBtn><PrimaryBtn icon="send" onClick={() => setShowInvite(false)}>Meghívó küldése</PrimaryBtn></>}
      >
        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">E-mail cím</div>
            <input placeholder="b2b@partner.hu" className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Partner típus</div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(types).map(([k, label]) => (
                <button key={k} className={`h-9 rounded-lg text-[12px] border bg-white text-stone-700 border-stone-200 hover:border-stone-300`}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Üzenet (opcionális)</div>
            <textarea rows={4} placeholder="Csatlakozz B2B partnerként a JoineryTech portálhoz…"
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none" />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[11.5px] text-amber-800 flex gap-2">
            <Icon name="alert" size={14} className="shrink-0 mt-0.5" />
            <span>A partner API kulcsot generálunk a meghíváskor. A kulcs csak egyszer látható létrehozás után.</span>
          </div>
        </div>
      </SlideOver>

      {/* Partner detail */}
      <SlideOver open={!!partner} onClose={() => setOpenId(null)}
        title={partner?.name} subtitle={partner && types[partner.type] + " · csatlakozott " + partner.joined}
        width={500}
        footer={<><GhostBtn icon="x">Letiltás</GhostBtn><GhostBtn onClick={() => setOpenId(null)}>Bezár</GhostBtn></>}
      >
        {partner && (
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-[10.5px] uppercase tracking-wide text-stone-500">Közös rendelések</div>
                <div className="text-[20px] font-semibold tabular-nums text-stone-900">{partner.sharedOrders}</div>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-[10.5px] uppercase tracking-wide text-stone-500">Típus</div>
                <div className="text-[12.5px] font-medium text-stone-900 mt-0.5">{types[partner.type]}</div>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-[10.5px] uppercase tracking-wide text-stone-500">Státusz</div>
                <div className="mt-1"><StatusPill status="ok" label="Aktív" /></div>
              </div>
            </div>

            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">API kulcs</div>
              <div className="flex items-center gap-2 px-3 h-10 rounded-lg bg-stone-900 text-stone-100">
                <Icon name="settings" size={13} className="text-teal-300" />
                <span className="text-[12px] font-mono flex-1 truncate">{partner.apiKey || "—"}</span>
                <button className="text-[10.5px] px-2 py-1 rounded bg-white/10 hover:bg-white/20">Másol</button>
                <button className="text-[10.5px] px-2 py-1 rounded bg-white/10 hover:bg-white/20">Forgat</button>
              </div>
            </div>

            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Delegált feladatok</div>
              <div className="space-y-1">
                {partner.delegated.length === 0 && <div className="text-[12px] text-stone-400 italic">Nincs delegált feladat</div>}
                {partner.delegated.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-md bg-teal-50/50 border border-teal-100">
                    <Icon name="check" size={13} className="text-teal-700" />
                    <span className="text-[12px] text-stone-800">{d}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Legutóbbi közös rendelések</div>
              <div className="space-y-1">
                {ORDERS.slice(0, 3).map(o => (
                  <div key={o.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-stone-50 border border-stone-100">
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-mono text-stone-600">{o.id}</div>
                      <div className="text-[12px] text-stone-900 truncate">{o.customer}</div>
                    </div>
                    <Icon name="chevron" size={13} className="text-stone-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Settings: Roles permission matrix
// ──────────────────────────────────────────────────────────────────────────
const PERM_LABEL = {
  full: { label: "Teljes", icon: "check", tone: "bg-teal-50 text-teal-700 border-teal-200" },
  read: { label: "Olvasás", icon: "user", tone: "bg-stone-50 text-stone-600 border-stone-200" },
  none: { label: "Nincs", icon: "x", tone: "bg-rose-50/50 text-rose-600 border-rose-100" },
};

function RolesPanel({ t }) {
  const [matrix, setMatrix] = useStateE2(ROLE_MATRIX);
  const cycle = (cur) => cur === "full" ? "read" : cur === "read" ? "none" : "full";
  const set = (role, mod) => {
    if (role === "admin") return; // locked
    setMatrix(m => ({ ...m, [role]: { ...m[role], [mod]: cycle(m[role][mod]) } }));
  };

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-200/80 flex items-center justify-between">
          <div className="text-[12.5px] font-semibold text-stone-900">Jogosultsági mátrix</div>
          <PrimaryBtn icon="plus">Új szerepkör</PrimaryBtn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-stone-50/60 border-b border-stone-100 text-[10.5px] uppercase tracking-wide text-stone-500">
                <th className="text-left px-5 py-2.5 font-medium w-[160px]">Szerepkör</th>
                {PERMISSION_MODULES.map(m => (
                  <th key={m} className="text-left px-3 py-2.5 font-medium">{t.nav[m]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLE_KEYS.map(role => {
                const locked = role === "admin";
                return (
                  <tr key={role} className={`border-b border-stone-100 last:border-0 ${locked ? "bg-stone-50/40" : ""}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-md grid place-items-center text-[10px] font-semibold ${locked ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"}`}>
                          {role[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[12.5px] font-medium text-stone-900">{t.set.role[role]}</div>
                          {locked && <div className="text-[10px] text-stone-400">Rendszer · nem szerkeszthető</div>}
                        </div>
                      </div>
                    </td>
                    {PERMISSION_MODULES.map(mod => {
                      const v = matrix[role][mod];
                      const p = PERM_LABEL[v];
                      return (
                        <td key={mod} className="px-3 py-3">
                          <button
                            disabled={locked}
                            onClick={() => set(role, mod)}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium ${p.tone} ${locked ? "opacity-80 cursor-not-allowed" : "hover:brightness-95"}`}
                          >
                            <Icon name={p.icon} size={11} />
                            {p.label}
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
      <div className="text-[11px] text-stone-500 flex items-center gap-3 px-1">
        <span className="inline-flex items-center gap-1.5"><Icon name="check" size={11} className="text-teal-700" /> Teljes hozzáférés</span>
        <span className="inline-flex items-center gap-1.5"><Icon name="user" size={11} className="text-stone-500" /> Csak olvasás</span>
        <span className="inline-flex items-center gap-1.5"><Icon name="x" size={11} className="text-rose-600" /> Nincs hozzáférés</span>
        <span className="ml-auto text-stone-400">Kattints a cellára a változtatáshoz</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Templates panel (Catalog → Sablonok)
// ──────────────────────────────────────────────────────────────────────────
const TPL_TYPE = { hu: { door: "Ajtó", cabinet: "Szekrény", window: "Ablak" }, en: { door: "Door", cabinet: "Cabinet", window: "Window" } };
const TPL_TYPE_TONE = { door: "bg-amber-50 text-amber-700", cabinet: "bg-teal-50 text-teal-700", window: "bg-sky-50 text-sky-700" };

function TemplatePreviewSVG({ type }) {
  // simple iconographic preview
  const common = { width: "100%", height: "100%", viewBox: "0 0 120 90", preserveAspectRatio: "xMidYMid meet" };
  if (type === "door") return (
    <svg {...common}><rect x="40" y="10" width="40" height="70" rx="2" fill="#f5f5f4" stroke="#a8a29e"/><rect x="46" y="16" width="28" height="28" rx="1" fill="#fff" stroke="#a8a29e" strokeWidth=".5"/><rect x="46" y="48" width="28" height="28" rx="1" fill="#fff" stroke="#a8a29e" strokeWidth=".5"/><circle cx="71" cy="45" r="1.5" fill="#0d9488"/></svg>
  );
  if (type === "window") return (
    <svg {...common}><rect x="22" y="20" width="76" height="50" rx="1" fill="#e0f2fe" stroke="#0369a1"/><line x1="60" y1="20" x2="60" y2="70" stroke="#0369a1"/><line x1="22" y1="45" x2="98" y2="45" stroke="#0369a1"/></svg>
  );
  return (
    <svg {...common}><rect x="20" y="15" width="80" height="60" rx="1.5" fill="#f5f5f4" stroke="#a8a29e"/><rect x="24" y="19" width="36" height="52" fill="#fff" stroke="#a8a29e" strokeWidth=".5"/><rect x="62" y="19" width="34" height="25" fill="#fff" stroke="#a8a29e" strokeWidth=".5"/><rect x="62" y="46" width="34" height="25" fill="#fff" stroke="#a8a29e" strokeWidth=".5"/><circle cx="42" cy="45" r="1.2" fill="#0d9488"/><circle cx="92" cy="32" r="1.2" fill="#0d9488"/><circle cx="92" cy="58" r="1.2" fill="#0d9488"/></svg>
  );
}

function TemplatesPanel({ lang = "hu" }) {
  const [openId, setOpenId] = useStateE2(null);
  const tpl = TEMPLATES.find(t => t.id === openId);
  const labels = TPL_TYPE[lang] || TPL_TYPE.hu;
  const own = TEMPLATES.filter(t => !t.community);
  const community = TEMPLATES.filter(t => t.community);

  const Card2 = ({ t }) => (
    <button onClick={() => setOpenId(t.id)}
      className="text-left bg-white border border-stone-200/80 hover:border-stone-300 rounded-xl overflow-hidden transition group">
      <div className="aspect-[4/2.6] bg-stone-50 border-b border-stone-100 grid place-items-center p-3">
        <div className="w-full h-full"><TemplatePreviewSVG type={t.type} /></div>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[12.5px] font-semibold text-stone-900 truncate flex-1">{t.name}</div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${TPL_TYPE_TONE[t.type]}`}>{labels[t.type]}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2.5 text-[10.5px] text-stone-500">
          <span className="font-mono">{t.paramCount} param</span>
          <span>·</span>
          <span className="text-amber-600">★ {t.rating}</span>
          {t.community && <><span>·</span><span className="font-mono">{t.downloads} ↓</span></>}
        </div>
      </div>
    </button>
  );

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[12.5px] font-semibold text-stone-900">Saját parametrikus sablonok</div>
            <div className="text-[10.5px] text-stone-500">Cabinet 0.3 specifikáció · CNC deriválás támogatva</div>
          </div>
          <PrimaryBtn icon="plus">Új sablon</PrimaryBtn>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {own.map(t => <Card2 key={t.id} t={t} />)}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[12.5px] font-semibold text-stone-900 inline-flex items-center gap-2">Community katalógus <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700">béta</span></div>
            <div className="text-[10.5px] text-stone-500">Megosztott sablonok más JoineryTech felhasználóktól</div>
          </div>
          <GhostBtn icon="external">Tallózás</GhostBtn>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {community.map(t => <Card2 key={t.id} t={t} />)}
        </div>
      </div>

      <SlideOver open={!!tpl} onClose={() => setOpenId(null)}
        title={tpl?.name} subtitle={tpl && labels[tpl.type] + " · " + tpl.paramCount + " paraméter"} width={500}
        footer={<><GhostBtn onClick={() => setOpenId(null)}>Bezár</GhostBtn><PrimaryBtn icon="sparkle">Példányosítás</PrimaryBtn></>}
      >
        {tpl && (
          <div className="px-5 py-4 space-y-4">
            <div className="aspect-[4/2.4] bg-stone-50 border border-stone-200 rounded-lg p-6 grid place-items-center">
              <div className="w-full h-full max-w-[280px]"><TemplatePreviewSVG type={tpl.type} /></div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2">Paraméterek</div>
              {tpl.params ? (
                <div className="space-y-1">
                  {tpl.params.map((p, i) => (
                    <div key={i} className="grid grid-cols-[1fr_120px_60px] gap-2 items-center px-3 py-1.5 rounded-md bg-stone-50 border border-stone-100">
                      <div className="text-[12px] text-stone-800">{p.name}</div>
                      <input defaultValue={p.val} className="h-7 px-2 rounded border border-stone-200 text-[11.5px] font-mono bg-white" />
                      <div className="text-[10.5px] text-stone-500 font-mono">{p.unit}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-stone-400 italic">Paraméterek a példányosítás során válnak elérhetővé</div>
              )}
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2">CNC deriválás előnézet</div>
              <div className="bg-stone-900 rounded-lg p-3 text-[10.5px] font-mono text-teal-300 leading-relaxed">
                <div className="text-stone-400">// Generált G-kód kivonat</div>
                <div>G21 G90 G94 ; mm, abs, mm/min</div>
                <div>T1 M6 ; D=8mm fúró</div>
                <div>G0 X32 Y96 Z5</div>
                <div>G1 Z-13 F600</div>
                <div className="text-stone-400">; ... +84 sor</div>
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}

window.NewOrderDrawer = NewOrderDrawer;
window.FacilitiesPanel = FacilitiesPanel;
window.PartnersPanel = PartnersPanel;
window.RolesPanel = RolesPanel;
window.TemplatesPanel = TemplatesPanel;
window.SlideOver = SlideOver;
