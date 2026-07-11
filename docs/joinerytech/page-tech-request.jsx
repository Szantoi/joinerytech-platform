// ──────────────────────────────────────────────────────────────────────────
// page-tech-request.jsx — MŰSZAKI AJÁNLAT-KÉRÉS MUNKALAP (Tervezés világ)
//
//   Az értékesítési ajánlat műszaki pontosításának strukturált űrlapja —
//   a gyártás-adatlap info-gyűjtő mintájára, készültség-kapuval:
//     1. TERV-ALAP — belső koncepció VAGY külső design-csomag (helyiségenként
//        kötelező: leírás + alaprajz + anyaghasználat + ≥1 bútor).
//     2. BÚTOR → SABLON megfeleltetés — mely KIADOTT parametrikus sablonból
//        építhető bútorsor; ami nem fedhető le: EGYEDI elem.
//     3. EGYEDI elem — 2D/3D rajz + modell feltöltés (jelkép) + minden áron
//        kívüli paraméter, ami a tervező modulban nem határozható meg + ÁR.
//   A „Teljesítve" a store-ban is kapuzott (techReqCompleteness) — amíg
//   hiányos, az ajánlat nem árazható, a gomb LEZÁRT.
//
//   <TechReqSheet reqId onClose />   — window-export, a Tervezés → Műszaki
//   tervezés „Beérkezett műszaki kérések" paneljéből nyílik.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateTR } = React;

const TR_IN = "h-8 px-2 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-800 outline-none focus:border-amber-400 w-full";
const trUid = () => "tr-" + Math.random().toString(36).slice(2, 7);

// fájl-feltöltés jelkép (prototípus: címke, mint a DMS fileLabel)
function TrFileStub({ value, onChange, placeholder }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon name="paperclip" size={12} className={value ? "text-emerald-600" : "text-stone-300"} />
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={TR_IN} />
    </div>
  );
}

function TrCheckRow({ ok, label }) {
  return (
    <div className="flex items-center gap-2 text-[11.5px]">
      <span className={`w-4 h-4 rounded-full grid place-items-center shrink-0 ${ok ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"}`}>
        <Icon name={ok ? "check" : "minus"} size={9} />
      </span>
      <span className={ok ? "text-stone-700" : "text-stone-400"}>{label}</span>
    </div>
  );
}

// Kinyitható fül — az opcionális árazási infeókat elrejti, hogy ne legyen sok
// adat egyszerre a képernyőn (mobil-első). A fül tappolható; a kitöltöttek
// száma a fülön látszik.
function TrDisclosure({ label, count = 0, children }) {
  const [open, setOpen] = useStateTR(false);
  return (
    <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2.5 h-9 text-[11.5px] font-medium text-stone-600 active:bg-stone-50">
        <Icon name={open ? "down" : "chevron"} size={12} className="text-stone-400 shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        {count > 0 && <span className="px-1.5 h-5 grid place-items-center rounded-full bg-stone-100 text-stone-500 text-[10px] font-semibold shrink-0">{count} kitöltve</span>}
      </button>
      {open && <div className="px-2.5 pb-2.5 space-y-1.5">{children}</div>}
    </div>
  );
}

function TechReqSheet({ reqId, onClose }) {
  const sim = useSim();
  const req = (sim.quoteRequests || []).find((x) => x.id === reqId);
  if (!req) return null;
  const plan = req.plan || {};
  const comp = window.sim.techReqCompleteness(req);
  const basis = plan.basis || comp.basis;
  const rooms = plan.rooms || [];
  const items = plan.items || [];
  const editable = ["kert", "folyamatban"].includes(req.status);
  const upd = (patch) => window.sim.updateQuoteRequestPlan(req.id, patch);

  // kiadott sablonok a megfeleltetéshez (műhely "kiadott" + gyári registry)
  const studio = (sim.designTemplates || []).filter((t) => t.status === "kiadott");
  const factory = (window.PARAM_TEMPLATES || []).filter((t) => !studio.some((s) => s.id === t.id));
  const tplOptions = [...studio, ...factory];

  const setRoom = (rid, patch) => upd({ rooms: rooms.map((r) => (r.id === rid ? { ...r, ...patch } : r)) });
  const setItem = (iid, patch) => upd({ items: items.map((i) => (i.id === iid ? { ...i, ...patch } : i)) });

  return (
    <SlideOver open onClose={onClose} width={680}
      title={`Műszaki munkalap — ${req.id}`}
      subtitle={`${req.customer} · ajánlat: ${req.quoteId}`}
      footer={
        <div className="flex items-center gap-2 w-full">
          <div className="text-[11px] text-stone-500 flex-1">{comp.ready ? "Minden megvan — teljesíthető." : `${comp.missing.length} hiány a teljesítéshez`}</div>
          {req.status === "kert" && (
            <button onClick={() => window.sim.setQuoteRequestStatus(req.id, "folyamatban")}
              className="h-9 px-3.5 rounded-lg text-[12.5px] font-semibold bg-amber-600 text-white hover:bg-amber-700">Folyamatba veszem</button>
          )}
          {req.status === "folyamatban" && (
            <button onClick={comp.ready ? () => { window.sim.setQuoteRequestStatus(req.id, "kesz"); onClose(); } : undefined} disabled={!comp.ready}
              title={comp.ready ? "" : "Hiányzik: " + comp.missing.map((m) => m.label).join(" · ")}
              className={`h-9 px-3.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 ${comp.ready ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-stone-100 text-stone-400 cursor-not-allowed"}`}>
              {!comp.ready && <Icon name="lock" size={12} />} Teljesítve — árazható
            </button>
          )}
          <GhostBtn onClick={onClose}>Bezárás</GhostBtn>
        </div>
      }>
      <div className="px-5 py-4 space-y-5">

        {/* ── TERVEZÉSI BRIEF (igény-információ az értékesítéstől) ── */}
        {window.BriefCard && window.sim.quoteLevelBrief && window.sim.quoteLevelBrief(req.quoteId) && (
          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-2">Tervezési brief — amit az értékesítés átadott</div>
            <window.BriefCard briefId={window.sim.quoteLevelBrief(req.quoteId).id} title="Igény-brief (átgondolandó)" />
          </div>
        )}

        {/* ── KÉSZÜLTSÉG ── */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 space-y-1.5">
          <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-1">Készültség — az árazható ajánlat minimuma</div>
          {comp.checks.map((c) => <TrCheckRow key={c.key} ok={c.ok} label={c.label} />)}
        </div>

        {/* ── 1. TERV-ALAP ── */}
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-2">1 · Terv-alap</div>
          <div className="flex items-center gap-1.5 mb-2">
            {[["internal", "Belső koncepció (Belsőépítészet)"], ["external", "Külső design-csomag"]].map(([k, lbl]) => (
              <button key={k} onClick={editable ? () => upd({ basis: k }) : undefined}
                className={`h-8 px-3 rounded-lg text-[11.5px] font-medium border ${basis === k ? "bg-amber-600 text-white border-amber-600" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`}>{lbl}</button>
            ))}
          </div>
          {basis === "internal" ? (
            window.sim.quoteHasConcept(req.quoteId)
              ? <div className="text-[11.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">Az ajánlathoz belsőépítészeti koncepció kapcsolódik — a terv-alap megvan.</div>
              : <div className="text-[11.5px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">Nincs belső koncepció az ajánlaton — kérj koncepciót a Belsőépítészettől, vagy válts külső design-csomagra.</div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] text-stone-500">Külső tervezőtől érkező csomag — helyiségenként kötelező a leírás, az alaprajz, az anyaghasználat és legalább egy bútor.</div>
              {rooms.map((r) => (
                <div key={r.id} className="rounded-lg border border-stone-200 bg-white p-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input value={r.name || ""} onChange={(e) => setRoom(r.id, { name: e.target.value })} placeholder="Helyiség neve (pl. Nappali)" disabled={!editable} className={TR_IN + " font-medium"} />
                    {editable && <button onClick={() => upd({ rooms: rooms.filter((x) => x.id !== r.id), items: items.map((i) => (i.roomId === r.id ? { ...i, roomId: null } : i)) })} className="w-7 h-7 grid place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"><Icon name="x" size={12} /></button>}
                  </div>
                  <textarea value={r.desc || ""} onChange={(e) => setRoom(r.id, { desc: e.target.value })} placeholder="Leírás — mit kell ide tervezni/gyártani" disabled={!editable} rows={2}
                    className="w-full px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-amber-400 resize-none" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <TrFileStub value={r.floorPlan} onChange={(v) => editable && setRoom(r.id, { floorPlan: v })} placeholder="Alaprajz (fájl)" />
                    <input value={r.materials || ""} onChange={(e) => setRoom(r.id, { materials: e.target.value })} placeholder="Anyaghasználat (pl. tölgy furnér + festett MDF)" disabled={!editable} className={TR_IN} />
                  </div>
                  <div className="text-[10px] text-stone-400">{items.filter((i) => i.roomId === r.id).length} bútor ebben a helyiségben</div>
                </div>
              ))}
              {editable && (
                <button onClick={() => upd({ rooms: [...rooms, { id: trUid(), name: "", desc: "", floorPlan: "", materials: "" }] })}
                  className="w-full h-8 rounded-lg border border-dashed border-stone-300 text-[11.5px] text-stone-500 hover:text-amber-700 hover:border-amber-300 inline-flex items-center justify-center gap-1.5">
                  <Icon name="plus" size={12} /> Helyiség hozzáadása
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── 2. BÚTOR → SABLON MEGFELELTETÉS ── */}
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-1">2 · Bútorok — sablon-megfeleltetés és árazás</div>
          <div className="text-[11px] text-stone-500 mb-2">Minden bútorhoz kiosztási rajz kell, és vagy egy <b>kiadott parametrikus sablon</b> (amiből bútorsor építhető), vagy <b>egyedi elem</b> teljes adatokkal.</div>
          <div className="space-y-2">
            {items.map((i) => {
              const custom = i.mode === "custom";
              return (
                <div key={i.id} className="rounded-lg border border-stone-200 bg-white p-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input value={i.name || ""} onChange={(e) => setItem(i.id, { name: e.target.value })} placeholder="Bútor megnevezése" disabled={!editable} className={TR_IN + " font-medium"} />
                    {basis === "external" && (
                      <select value={i.roomId || ""} onChange={(e) => setItem(i.id, { roomId: e.target.value || null })} disabled={!editable}
                        className="h-8 px-2 rounded-lg border border-stone-200 bg-white text-[11.5px] text-stone-700 outline-none shrink-0 max-w-[140px]">
                        <option value="">— helyiség —</option>
                        {rooms.map((r) => <option key={r.id} value={r.id}>{r.name || r.id}</option>)}
                      </select>
                    )}
                    {editable && <button onClick={() => upd({ items: items.filter((x) => x.id !== i.id) })} className="w-7 h-7 grid place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"><Icon name="x" size={12} /></button>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <TrFileStub value={i.layout} onChange={(v) => editable && setItem(i.id, { layout: v })} placeholder="Kiosztási rajz (fájl)" />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-stone-500 shrink-0">db:</span>
                      <input type="number" min="1" value={i.qty || 1} onChange={(e) => setItem(i.id, { qty: e.target.value })} disabled={!editable} className={TR_IN + " w-16 text-right font-mono"} />
                      <span className="text-[11px] text-stone-500 shrink-0">ár/db:</span>
                      <input type="number" value={i.price || ""} onChange={(e) => setItem(i.id, { price: e.target.value })} placeholder="Ft" disabled={!editable} className={TR_IN + " flex-1 min-w-[80px] text-right font-mono"} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[["template", "Parametrikus sablonból"], ["custom", "Egyedi elem"]].map(([k, lbl]) => (
                      <button key={k} onClick={editable ? () => setItem(i.id, { mode: k }) : undefined}
                        className={`h-7 px-2.5 rounded-md text-[11px] font-medium border ${(i.mode || "template") === k ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-500 border-stone-200"}`}>{lbl}</button>
                    ))}
                    {!custom && (
                      <select value={i.tplId || ""} onChange={(e) => setItem(i.id, { tplId: e.target.value })} disabled={!editable}
                        className="h-7 px-2 rounded-md border border-stone-200 bg-white text-[11.5px] text-stone-700 outline-none flex-1 min-w-0">
                        <option value="">— kiadott sablon —</option>
                        {tplOptions.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.id})</option>)}
                      </select>
                    )}
                  </div>
                  {custom && (() => {
                    const optFilled = [i.drawing3d, i.model, i.estMaterial, i.estHours, i.estExternal, i.analog, i.risks].filter((v) => String(v || "").trim()).length;
                    return (
                    <div className="rounded-lg bg-amber-50/60 border border-amber-200 p-2 space-y-2">
                      {/* KÖTELEZŐ minimum — ez kell az árazható ajánlathoz */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold">Egyedi elem — kötelező</span>
                        <span className="text-[9.5px] text-amber-600">2D rajz + paraméterek + ár</span>
                      </div>
                      <TrFileStub value={i.drawing2d} onChange={(v) => editable && setItem(i.id, { drawing2d: v })} placeholder="2D rajz (kötelező)" />
                      <textarea value={i.params || ""} onChange={(e) => setItem(i.id, { params: e.target.value })} placeholder="Árazási paraméterek (kötelező) — anyag, vasalat, felület, méretek, különleges megmunkálás…" disabled={!editable} rows={2}
                        className="w-full px-2 py-1.5 rounded-lg border border-amber-200 bg-white text-[12px] outline-none focus:border-amber-400 resize-none" />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-stone-500 shrink-0">Ár-érettség:</span>
                        {window.PRICE_CLASS_ORDER.map((k) => {
                          const m = window.PRICE_CLASS_META[k];
                          const on = (i.priceClass || "iranyar") === k;
                          return (
                            <button key={k} onClick={editable ? () => setItem(i.id, { priceClass: k }) : undefined} title={m.hint}
                              className={`h-7 px-2 rounded-md text-[10.5px] font-medium border ${on ? `bg-${m.tone}-600 text-white border-${m.tone}-600` : "bg-white text-stone-500 border-stone-200"}`}>
                              {m.label}{m.band ? ` ±${m.band}%` : ""}
                            </button>
                          );
                        })}
                      </div>
                      {/* OPCIONÁLIS info-gyűjtés — fül mögé rejtve, hogy ne legyen sok adat egyszerre */}
                      <TrDisclosure label="Több infó az árazáshoz (opcionális)" count={optFilled}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          <TrFileStub value={i.drawing3d} onChange={(v) => editable && setItem(i.id, { drawing3d: v })} placeholder="3D rajz" />
                          <TrFileStub value={i.model} onChange={(v) => editable && setItem(i.id, { model: v })} placeholder="Modell-fájl" />
                          <input type="number" value={i.estMaterial || ""} onChange={(e) => setItem(i.id, { estMaterial: e.target.value })} placeholder="Becsült anyagköltség (Ft)" disabled={!editable} className={TR_IN + " text-right font-mono"} />
                          <input type="number" value={i.estHours || ""} onChange={(e) => setItem(i.id, { estHours: e.target.value })} placeholder="Becsült munkaóra (h)" disabled={!editable} className={TR_IN + " text-right font-mono"} />
                          <input type="number" value={i.estExternal || ""} onChange={(e) => setItem(i.id, { estExternal: e.target.value })} placeholder="Külső munka (Ft)" disabled={!editable} className={TR_IN + " text-right font-mono"} />
                          <input value={i.analog || ""} onChange={(e) => setItem(i.id, { analog: e.target.value })} placeholder="Hasonló korábbi munka" disabled={!editable} className={TR_IN} />
                        </div>
                        <input value={i.risks || ""} onChange={(e) => setItem(i.id, { risks: e.target.value })} placeholder="Kockázatok / bizonytalanságok" disabled={!editable} className={TR_IN} />
                        {(() => {
                          const P = window.WW_PRICE_PARAMS || {};
                          const mat = Number(i.estMaterial) || 0, h = Number(i.estHours) || 0, ext = Number(i.estExternal) || 0;
                          if (!(mat || h)) return <div className="text-[10px] text-stone-400">Anyagköltség / munkaóra megadásával javasolt árat számolok — de a becslés kézzel is beírható.</div>;
                          const sugg = Math.round((mat + h * (P.shiftRate || 4500) + ext) * (1 + (P.overheadPct || 20) / 100) * (1 + (P.profitPct || 15) / 100));
                          return (
                            <div className="flex items-center gap-2 text-[11px] text-stone-600 flex-wrap">
                              <span>Kalkuláció-segéd: <b className="font-mono">{sugg.toLocaleString("hu-HU")} Ft/db</b></span>
                              {editable && <button onClick={() => setItem(i.id, { price: sugg, priceClass: "kalkulalt" })} className="h-6 px-2 rounded-md bg-sky-600 text-white text-[10.5px] font-medium hover:bg-sky-700 shrink-0">Átveszem</button>}
                            </div>
                          );
                        })()}
                      </TrDisclosure>
                    </div>
                    );
                  })()}
                </div>
              );
            })}
            {editable && (
              <button onClick={() => upd({ items: [...items, { id: trUid(), roomId: rooms[0] ? rooms[0].id : null, name: "", qty: 1, layout: "", mode: "template", tplId: "", price: "" }] })}
                className="w-full h-8 rounded-lg border border-dashed border-stone-300 text-[11.5px] text-stone-500 hover:text-amber-700 hover:border-amber-300 inline-flex items-center justify-center gap-1.5">
                <Icon name="plus" size={12} /> Bútor hozzáadása
              </button>
            )}
          </div>
        </div>

        {req.note && <div className="text-[11px] text-stone-500 border-t border-stone-100 pt-3">Kérés megjegyzése: {req.note}</div>}
      </div>
    </SlideOver>
  );
}

Object.assign(window, { TechReqSheet });
