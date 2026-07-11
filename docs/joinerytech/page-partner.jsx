// ─────────────────────────────────────────────────────────────────
// page-partner.jsx — PARTNER-KAPCSOLAT NÉZET (belső, teljes képernyős cockpit)
//   A beszállítói/bérmunka kapcsolat BELSŐ tükre: ugyanaz az RFQ/PO/kézfogás
//   lánc, amit a partner a SAJÁT portálján lát ("Partner szemével") — PLUSZ a
//   csak-belső réteg ("Belső nézet": költés, árrés, teljesítmény, jegyzetek,
//   minősítés). Egy igazságforrás. A pill-eket a page-supplier.jsx-ből veszi.
//   Belépő: Beállítások → Partnerek → partner megnyitása. "Belépés partnerként"
//   átvált a partner valódi portál-fiókjába (ha van).
// ─────────────────────────────────────────────────────────────────
const { useState: useStateP } = React;

const partHuf = (n) => (Number(n) || 0).toLocaleString("hu-HU") + " Ft";

// Partner-típus címke (a projekt-kontextusú actorMeta „Lapszabász” helyett beszállítói)
const PARTNER_TYPE_LABEL = { supplier: "Beszállító", installer: "Beépítő", manufacturer: "Gyártó", designer: "Belsőépítész", dealer: "Viszonteladó" };
const partnerTypeLabel = (at) => PARTNER_TYPE_LABEL[at] || (window.actorMeta ? window.actorMeta(at).l : at);

// ── Csillagos minősítés ──────────────────────────────────────────
function PartnerStars({ value = 0, onSet, size = 16 }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} disabled={!onSet} onClick={() => onSet && onSet(n)} className={onSet ? "hover:scale-110 transition leading-none" : "cursor-default leading-none"} title={`${n} csillag`}>
          <span style={{ fontSize: size }} className={n <= value ? "text-amber-400" : "text-stone-200"}>★</span>
        </button>
      ))}
    </div>
  );
}

// ── Kézfogás-sor (bérmunka / delegált / fuvar) ───────────────────
const HS_KIND_LABEL = { crm: "CRM-lehetőség", transport: "Fuvar / kiszállítás", service: "Reklamáció", internal_order: "Belső megrendelés" };
function PartnerHsRow({ hs }) {
  const tone = (window.hsTone && window.hsTone(hs.status)) || { label: hs.status, pill: "bg-stone-100 text-stone-600" };
  const kindLbl = HS_KIND_LABEL[hs.kind] || "Bérmunka / gyártás";
  return (
    <div className="px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-amber-50 text-amber-600"><Icon name="link" size={17} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-stone-900 truncate">{hs.epicTitle || hs.projectName || hs.id}</div>
        <div className="text-[11px] text-stone-500 truncate mt-0.5">{kindLbl}{hs.projectName ? ` · ${hs.projectName}` : ""}</div>
      </div>
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 h-6 text-[11px] font-medium ${tone.pill || "bg-stone-100 text-stone-600 border-stone-200"}`}>{tone.label || hs.status}</span>
    </div>
  );
}

// ── Partner-szűrt RFQ sor (belső nézőpont, névre szűrve) ─────────
function PartnerRfqRow({ rfq, partnerName, internal }) {
  const sim = useSim();
  const E = window.RfqEngine;
  const st = sim.supplierRfqState(rfq, partnerName);
  const sup = (rfq.suppliers || []).find((s) => s.name === partnerName);
  const myTotal = E && sup ? E.supplierTotal(rfq, partnerName) : null;
  return (
    <div className="w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-teal-50 text-teal-600"><Icon name="send" size={17} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-stone-900 truncate">{rfq.title}</div>
        <div className="text-[11px] text-stone-500 truncate mt-0.5">{rfq.id} · {(rfq.lines || []).length} tétel{internal && myTotal && myTotal.total > 0 ? ` · ajánlatuk ${partHuf(myTotal.total)}` : ` · határidő ${rfq.dueDate}`}</div>
      </div>
      {window.SupRfqPill ? <window.SupRfqPill state={st} size="sm" /> : null}
    </div>
  );
}

// ── Partner-szűrt PO sor (névre szűrve) ──────────────────────────
function PartnerPoRow({ po, internal }) {
  const total = po.total || (po.lines || []).reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);
  const lines = po.lines || (po.material ? [{ material: po.material, qty: po.qty }] : []);
  return (
    <div className="px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-stone-100 text-stone-500"><Icon name="receipt" size={17} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-stone-900 truncate">{po.id}{internal && total > 0 ? ` · ${partHuf(total)}` : ""}</div>
        <div className="text-[11px] text-stone-500 truncate mt-0.5">{lines.map((l) => `${l.material} ×${l.qty}`).join(" · ") || po.material} · szállítás {po.promiseDate || po.eta}</div>
      </div>
      {window.PoStatusPill ? <window.PoStatusPill po={po} size="sm" /> : null}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// PartnerCockpit — teljes képernyős kapcsolati nézet
// ═════════════════════════════════════════════════════════════════
function PartnerCockpit({ partnerName, onClose }) {
  const sim = useSim();
  const [view, setView] = useStateP("internal"); // internal | guest
  const [noteText, setNoteText] = useStateP("");

  const partner = sim.partnerByName(partnerName);
  const am = window.actorMeta ? window.actorMeta(partner ? partner.actorType : "supplier") : { l: "Partner", icon: "handshake", tint: "bg-teal-100 text-teal-700" };
  const stats = sim.partnerStats(partnerName);
  const profile = sim.partnerProfile(partnerName);
  const notes = sim.partnerNotesFor(partnerName);
  const rfqs = sim.supplierRfqs(partnerName);
  const pos = sim.supplierPos(partnerName);
  const handshakes = sim.partnerHandshakes(partnerName);
  const acct = sim.accountForPartner(partner);
  const isSupplierType = !partner || partner.actorType === "supplier" || rfqs.length > 0 || pos.length > 0;
  const internal = view === "internal";

  const enterAsPartner = () => {
    if (!acct) { window.toast && window.toast("Ennek a partnernek nincs portál-hozzáférése.", "info"); return; }
    window.sim.setAccount(acct.id);
  };

  const KPI = ({ label, value, sub, tone = "stone", icon }) => (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-lg grid place-items-center bg-${tone}-50 text-${tone}-600`}><Icon name={icon} size={16} /></div>
        <div className="text-[20px] font-semibold text-stone-900 leading-none tabular-nums">{value}</div>
      </div>
      <div className="text-[12px] font-medium text-stone-700 mt-2.5">{label}</div>
      {sub && <div className="text-[10.5px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] bg-stone-50 overflow-y-auto" data-screen-label="Partner-kapcsolat">
      {/* Fejléc */}
      <header className="sticky top-0 z-10 bg-white border-b border-stone-200">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 shrink-0"><Icon name="chevron" size={16} className="rotate-180" /></button>
          <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${am.tint}`}><Icon name={am.icon} size={18} /></span>
          <div className="min-w-0 leading-tight flex-1">
            <div className="text-[14px] font-semibold text-stone-900 truncate flex items-center gap-2">{partnerName}
              {partner && (partner.platform ? <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold uppercase">platform</span> : <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-bold uppercase">külső</span>)}
            </div>
            <div className="text-[10.5px] text-stone-400 truncate">{partnerTypeLabel(partner ? partner.actorType : "supplier")}{partner && partner.specialty ? ` · ${partner.specialty}` : ""}</div>
          </div>
          <button onClick={enterAsPartner} disabled={!acct} className="h-9 px-3.5 rounded-lg bg-teal-600 text-white text-[12.5px] font-medium hover:bg-teal-700 inline-flex items-center gap-1.5 shrink-0 disabled:opacity-40" title={acct ? "Belépés a partner portál-nézetébe" : "Nincs portál-hozzáférés"}><Icon name="logout" size={14} />Belépés partnerként</button>
        </div>
        {/* Nézet-váltó */}
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 pb-2.5 flex items-center gap-2">
          <div className="inline-flex items-center gap-0.5 bg-stone-100 rounded-lg p-0.5">
            {[["internal", "Belső nézet", "search"], ["guest", "Partner szemével", "user"]].map(([k, lbl, ic]) => (
              <button key={k} onClick={() => setView(k)} className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-medium ${view === k ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}><Icon name={ic} size={13} />{lbl}</button>
            ))}
          </div>
          {!internal && <span className="text-[11px] text-stone-400 inline-flex items-center gap-1.5"><Icon name="info" size={13} />Ezt látja {partnerName} a saját portálján.</span>}
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-4 md:px-6 py-5 md:py-6 space-y-5">
        {/* Vendég-sáv */}
        {!internal && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 flex items-center gap-3">
            <Icon name="user" size={18} className="text-teal-600 shrink-0" />
            <div className="text-[12px] text-teal-800">A <b>Partner szemével</b> nézet a partner saját portáljának tükre — a belső adatok (ár, árrés, jegyzet, minősítés) itt rejtve maradnak. A teljes kép a <button onClick={() => setView("internal")} className="font-semibold underline">Belső nézetben</button>.</div>
          </div>
        )}

        {/* Belső KPI-k */}
        {internal && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Kapcsolati teljesítmény <span className="text-stone-300 normal-case">· csak belső</span></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="Velük költött" value={partHuf(stats.spend)} sub={`${stats.poCount} megrendelés`} tone="teal" icon="receipt" />
              <KPI label="Nyerési arány" value={stats.winRate != null ? stats.winRate + "%" : "—"} sub={`${stats.won}/${stats.participated} tender`} tone="emerald" icon="check" />
              <KPI label="Átlag átfutás" value={stats.avgLead != null ? stats.avgLead + " nap" : "—"} sub="ajánlataik alapján" tone="sky" icon="clock" />
              <KPI label="Megtakarítás" value={partHuf(stats.savings)} sub={stats.lateCount ? `${stats.lateCount} késés` : "verseny haszna"} tone={stats.lateCount ? "rose" : "amber"} icon="up" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Ajánlatkérések */}
          {isSupplierType && (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-stone-800">Ajánlatkérések</span>
                <span className="text-[11px] text-stone-400">{rfqs.length}</span>
              </div>
              {rfqs.length ? rfqs.map((r) => <PartnerRfqRow key={r.id} rfq={r} partnerName={partnerName} internal={internal} />)
                : <div className="px-4 py-8 text-center text-[12px] text-stone-400">Nincs ajánlatkérés.</div>}
            </div>
          )}

          {/* Megrendelések */}
          {isSupplierType && (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-stone-800">Megrendelések</span>
                <span className="text-[11px] text-stone-400">{pos.length}</span>
              </div>
              {pos.length ? pos.map((p) => <PartnerPoRow key={p.id} po={p} internal={internal} />)
                : <div className="px-4 py-8 text-center text-[12px] text-stone-400">Nincs megrendelés.</div>}
            </div>
          )}

          {/* Kézfogások / bérmunka */}
          {handshakes.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-stone-800">Bérmunka / kézfogások</span>
                <span className="text-[11px] text-stone-400">{handshakes.length}</span>
              </div>
              {handshakes.map((h) => <PartnerHsRow key={h.id} hs={h} />)}
            </div>
          )}

          {/* Belső: minősítés + jegyzetek */}
          {internal && (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-stone-800">Megbízhatóság & jegyzetek <span className="text-stone-300 font-normal">· csak belső</span></span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-stone-600">Minősítés</span>
                  <PartnerStars value={profile.rating || 0} onSet={(n) => window.sim.setPartnerProfile(partnerName, { rating: n })} />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {["kiváló", "megbízható", "átlagos", "kockázatos"].map((r) => (
                    <button key={r} onClick={() => window.sim.setPartnerProfile(partnerName, { reliability: r })} className={`px-2.5 h-7 rounded-full text-[11px] font-medium border ${profile.reliability === r ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"}`}>{r}</button>
                  ))}
                </div>
                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-2">
                    <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Belső jegyzet a partnerről…" className="flex-1 h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500" onKeyDown={(e) => { if (e.key === "Enter" && noteText.trim()) { window.sim.addPartnerNote(partnerName, noteText); setNoteText(""); } }} />
                    <button disabled={!noteText.trim()} onClick={() => { window.sim.addPartnerNote(partnerName, noteText); setNoteText(""); }} className="h-9 px-3 rounded-lg bg-stone-900 text-white text-[12px] font-medium disabled:opacity-40 shrink-0">Hozzáad</button>
                  </div>
                  <div className="space-y-1.5">
                    {notes.length ? notes.map((n) => (
                      <div key={n.id} className="rounded-lg border border-stone-200 px-3 py-2 group">
                        <div className="text-[12px] text-stone-700">{n.text}</div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-400">
                          <span>{n.by}</span><span>·</span><span>{n.ts}</span>
                          <button onClick={() => window.sim.removePartnerNote(n.id)} className="ml-auto text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Icon name="x" size={12} /></button>
                        </div>
                      </div>
                    )) : <div className="text-[11.5px] text-stone-400 px-1">Még nincs jegyzet.</div>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* üres állapot, ha semmi adat */}
        {!isSupplierType && handshakes.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 px-4 py-12 text-center text-[12.5px] text-stone-400">Ezzel a partnerrel még nincs közös ajánlatkérés, megrendelés vagy bérmunka.</div>
        )}
      </main>
    </div>
  );
}

Object.assign(window, {
  PartnerCockpit, PartnerStars, PartnerHsRow, PartnerRfqRow, PartnerPoRow, PARTNER_TYPE_LABEL,
});
