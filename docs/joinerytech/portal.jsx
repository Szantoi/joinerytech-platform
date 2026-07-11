// ──────────────────────────────────────────────────────────────────────────
// portal.jsx — permission-driven multi-actor layer (B2B · B2C · B2B2C).
//
//   • Accounts live in window.sim (internal staff, B2B partner, reseller, B2C).
//   • Each account activates a set of WORLDS (windows it needs) and holds a set
//     of PERMISSIONS that gate actions (create/convert/release/forward…).
//   • <ProfileSwitcher/> — reusable header control to switch the active account
//     and (for admins) configure each account's worlds + permissions, so a
//     company can tailor the portal to its own workflow.
//   • <ForwardQuoteSheet/> — re-offer a received quote to your own customer
//     with a markup, creating a linked child quote down the chain (B2B2C).
//
// All state is in window.sim; these are thin, reusable views over it.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStatePT } = React;

const WORLD_LABELS = {
  production: "Gyártás", sales: "Értékesítés", design: "Tervezés",
  procurement: "Beszerzés", finance: "Pénzügy",
  warehouse: "Raktár", shopfloor: "Üzem", settings: "Beállítások",
};
const PERM_CATALOG = [
  { key: "quote.create", label: "Ajánlat létrehozása" },
  { key: "quote.convert", label: "Konvertálás rendeléssé" },
  { key: "order.release", label: "Gyártásba adás" },
  { key: "order.track", label: "Rendeléskövetés" },
  { key: "forward", label: "Továbbajánlás (B2B2C)" },
  { key: "catalog.approve", label: "Cikkszám jóváhagyása" },
  { key: "design.engineer", label: "Műszaki tervezés (sablon-kiadás)" },
  { key: "finance.manage", label: "Pénzügy kezelése" },
  { key: "hr.manage", label: "HR / távollét kezelése" },
  { key: "maintenance.manage", label: "Karbantartás kezelése" },
  { key: "crm.manage", label: "CRM / pipeline kezelése" },
  { key: "rfq.manage", label: "Ajánlatkérés odaítélése" },
  { key: "auth.approve", label: "Hatáskör-jóváhagyás (limit felett)" },
  { key: "quality.manage", label: "Minőségellenőrzés kezelése" },
  { key: "ehs.manage", label: "Munkavédelem kezelése" },
  { key: "controlling.exec", label: "Vezetői áttekintés (BI-cockpit)" },
  { key: "docs.manage", label: "Dokumentumtár kezelése" },
  { key: "attendance.manage", label: "Jelenlét jóváhagyása" },
  { key: "settings.manage", label: "Hozzáférés kezelése" },
  { key: "supplier.portal", label: "Beszállítói portál (külső)" },
];
const ACCOUNT_TYPE_TONE = {
  internal: "bg-stone-800 text-white",
  b2b: "bg-sky-100 text-sky-700",
  reseller: "bg-violet-100 text-violet-700",
  partner: "bg-teal-100 text-teal-700",
  b2c: "bg-emerald-100 text-emerald-700",
};
const ACCOUNT_TYPE_LABEL = { internal: "Belső", b2b: "B2B", reseller: "Belsőépítész", partner: "Partner", b2c: "B2C" };

function acctInitials(name) {
  return (name || "?").replace(/\(.*?\)/g, "").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// ── Reusable header control ──────────────────────────────────────────────────
function ProfileSwitcher({ tone = "ghost" }) {
  const s = useSim();
  const [open, setOpen] = useStatePT(false);
  const me = s.accounts.find((a) => a.id === s.currentAccountId) || s.accounts[0];
  const base = tone === "bar" ? "border border-stone-200 hover:bg-stone-50" : "hover:bg-stone-100";
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Profil"
        className={`flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg shrink-0 ${base}`}>
        <span className={`w-7 h-7 rounded-full grid place-items-center text-[11px] font-semibold ${ACCOUNT_TYPE_TONE[me.type]}`}>{acctInitials(me.name)}</span>
        <span className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-[11.5px] font-semibold text-stone-900 max-w-[140px] truncate">{me.name}</span>
          <span className="text-[9.5px] text-stone-500">{me.role}</span>
        </span>
        <Icon name="chevron" size={13} className="text-stone-400 rotate-90" />
      </button>
      {open && <ProfileSheet s={s} me={me} onClose={() => setOpen(false)} />}
    </>
  );
}

function ProfileSheet({ s, me, onClose }) {
  const [configId, setConfigId] = useStatePT(null);
  const canManage = me.perms.includes("settings.manage");
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <button aria-label="Bezárás" onClick={onClose} className="absolute inset-0 bg-stone-900/30 backdrop-blur-[1px]" />
      <div className="absolute inset-x-0 bottom-0 md:inset-auto md:right-5 md:top-16 md:w-[380px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden max-h-[86vh] md:max-h-[80vh] animate-[chSlide_.22s_ease-out]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}>
        <div className="md:hidden pt-2 pb-1 grid place-items-center shrink-0"><span className="w-9 h-1 rounded-full bg-stone-300" /></div>
        <div className="px-4 pt-2.5 pb-3 border-b border-stone-200 flex items-center justify-between">
          <div className="text-[13px] font-semibold text-stone-900">Profil váltása</div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"><Icon name="x" size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {s.accounts.map((a) => {
            const active = a.id === s.currentAccountId;
            return (
              <div key={a.id} className={`border-b border-stone-100 ${active ? "bg-teal-50/40" : ""}`}>
                <div className="px-4 py-3 flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-full grid place-items-center text-[12px] font-semibold ${ACCOUNT_TYPE_TONE[a.type]}`}>{acctInitials(a.name)}</span>
                  <button onClick={() => { window.sim.setAccount(a.id); onClose(); }} className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-stone-900 truncate">{a.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${ACCOUNT_TYPE_TONE[a.type]}`}>{ACCOUNT_TYPE_LABEL[a.type]}</span>
                    </div>
                    <div className="text-[10.5px] text-stone-500 truncate">{a.role} · {a.contact}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5 truncate">{a.worlds.map((w) => WORLD_LABELS[w]).join(" · ")}</div>
                  </button>
                  {active && <span className="text-teal-600 shrink-0"><Icon name="check" size={16} /></span>}
                  {canManage && (
                    <button onClick={() => setConfigId(configId === a.id ? null : a.id)} aria-label="Hozzáférés"
                      className={`w-8 h-8 grid place-items-center rounded-lg shrink-0 ${configId === a.id ? "bg-stone-200 text-stone-700" : "text-stone-400 hover:bg-stone-100"}`}>
                      <Icon name="settings" size={15} />
                    </button>
                  )}
                </div>
                {canManage && configId === a.id && <AccessConfig acc={a} />}
              </div>
            );
          })}
        </div>
        <div className="px-4 py-2.5 border-t border-stone-200 bg-stone-50/60 text-[10.5px] text-stone-500 leading-relaxed">
          A cég a saját ügymenetéhez igazíthatja a portált: aktiválja a szükséges ablakokat és jogosultságokat fiókonként.
        </div>
      </div>
      <style>{`@keyframes chSlide{from{transform:translateY(14px);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

function AccessConfig({ acc }) {
  return (
    <div className="px-4 pb-3.5 pt-1 bg-stone-50/60 space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Aktivált ablakok</div>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(WORLD_LABELS).map((w) => {
            const on = acc.worlds.includes(w);
            return (
              <button key={w} onClick={() => window.sim.toggleAccountWorld(acc.id, w)}
                className={`px-2 h-7 rounded-full text-[11px] font-medium border transition ${on ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-stone-200 text-stone-500"}`}>
                {WORLD_LABELS[w]}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Jogosultságok</div>
        <div className="space-y-1">
          {PERM_CATALOG.map((p) => {
            const on = acc.perms.includes(p.key);
            return (
              <label key={p.key} className="flex items-center justify-between gap-2 py-1 cursor-pointer">
                <span className="text-[11.5px] text-stone-700">{p.label}</span>
                <button onClick={() => window.sim.toggleAccountPerm(acc.id, p.key)} aria-pressed={on}
                  className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 ${on ? "bg-teal-600" : "bg-stone-300"}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${on ? "translate-x-4" : ""}`} />
                </button>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Forward / re-offer a quote (B2B2C) ───────────────────────────────────────
function ForwardQuoteSheet({ quote, onClose }) {
  const [customer, setCustomer] = useStatePT("");
  const [markup, setMarkup] = useStatePT(15);
  if (!quote) return null;
  const base = quote.value;
  const out = Math.round(base * (1 + (Number(markup) || 0) / 100));
  const submit = () => { if (!customer.trim()) return; window.sim.forwardQuote(quote.id, customer.trim(), markup); onClose(); };
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      <button aria-label="Bezárás" onClick={onClose} className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px]" />
      <div className="absolute inset-x-0 bottom-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-[chSlide_.22s_ease-out]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}>
        <div className="px-5 pt-4 pb-3 border-b border-stone-200">
          <div className="text-[14px] font-semibold text-stone-900">Ajánlat továbbajánlása</div>
          <div className="text-[11.5px] text-stone-500 mt-0.5">{quote.id} · {quote.customer} → saját ügyfél</div>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[11px] text-stone-500 mb-1">Ügyfél (címzett) <span className="text-rose-500">*</span></label>
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="pl. Kis Lakásstúdió Kft."
              className="w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-[11px] text-stone-500 mb-1">Árrés: <span className="font-semibold text-stone-800 tabular-nums">{markup}%</span></label>
            <input type="range" min="0" max="40" step="1" value={markup} onChange={(e) => setMarkup(Number(e.target.value))} className="w-full accent-teal-600" />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-stone-500">Beszerzési ár</div>
              <div className="text-[13px] font-mono text-stone-600 tabular-nums">{base.toLocaleString("hu-HU")} Ft</div>
            </div>
            <Icon name="chevron" size={16} className="text-stone-300" />
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-teal-600">Új ajánlati ár</div>
              <div className="text-[15px] font-mono font-semibold text-stone-900 tabular-nums">{out.toLocaleString("hu-HU")} Ft</div>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center justify-end gap-2"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
          <GhostBtn onClick={onClose}>Mégse</GhostBtn>
          <button onClick={submit} disabled={!customer.trim()}
            className="h-9 px-4 rounded-lg text-[12.5px] font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5">
            <Icon name="send" size={13} /> Továbbajánlás
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProfileSwitcher, ForwardQuoteSheet, WORLD_LABELS });
