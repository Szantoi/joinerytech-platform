// ──────────────────────────────────────────────────────────────────────────
// webshop.jsx — simplified, webshop-style customer portal (B2C).
//
//   A furniture customer needs no more than a webshop:
//     • Bolt        — browse the company's catalogue, add to cart, order.
//     • Rendeléseim — a SIMPLE per-order view: status indicator + order
//                     summary + a "message / contact" button (Comm Hub).
//
//   Orders placed here drop straight into the shared pipeline (window.sim.orders)
//   so internal staff see them; the customer sees a simplified status only.
//   Used as the full experience for B2C accounts and as the 'shop' world
//   (portfolio webshop) for companies browsing the catalogue.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateWS } = React;

const CUSTOMER_STEPS = ["Beérkezett", "Visszaigazolva", "Gyártás alatt", "Kész"];
const STATUS_TO_STEP = { draft: 0, calc: 1, ready: 3, released: 2, delivered: 3 };
const customerStep = (status) => (STATUS_TO_STEP[status] != null ? STATUS_TO_STEP[status] : 0);
const wshuf = (n) => n.toLocaleString("hu-HU") + " Ft";

function WebshopPortal({ onExit, exitLabel }) {
  const s = useSim();
  const [tab, setTab] = useStateWS("shop");
  const [cartOpen, setCartOpen] = useStateWS(false);
  const me = s.accounts.find((a) => a.id === s.currentAccountId) || s.accounts[0];
  const cartCount = s.cart.reduce((n, c) => n + c.qty, 0);
  const myOrders = s.orders.filter((o) => o.customer === me.name);
  const myShopOrders = myOrders.filter((o) => o.source === "webshop");
  const myCustomOrders = myOrders.filter((o) => o.source !== "webshop");
  const myProjects = s.projects.filter((p) => p.customer === me.name && p.kind !== "manufacturing");
  const myTickets = (s.serviceTickets || []).filter((t) => t.customer === me.name);
  const openInv = s.customerInvoices(me.name).filter((i) => { const e = s.finEffectiveStatus(i); return e === "issued" || e === "partial" || e === "overdue"; });
  const finSummary = s.customerFinanceSummary(me.name);
  const egyediCount = myProjects.length + myCustomOrders.length;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-stone-200">
        <div className="max-w-[1080px] mx-auto px-4 md:px-6 h-14 flex items-center gap-2.5">
          {onExit && (
            exitLabel ? (
              <button onClick={onExit} className="inline-flex items-center gap-1.5 h-9 -ml-1 pl-1.5 pr-2.5 rounded-lg text-stone-600 hover:bg-stone-100 shrink-0" aria-label={exitLabel}>
                <Icon name="chevron" size={16} className="rotate-180" />
                <span className="text-[12px] font-medium hidden sm:inline">{exitLabel}</span>
              </button>
            ) : (
              <button onClick={onExit} className="w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100" aria-label="Vissza">
                <Icon name="chevron" size={17} className="rotate-180" />
              </button>
            )
          )}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 grid place-items-center text-white font-bold text-[14px] tracking-tighter shrink-0">jt</div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-stone-900 leading-tight truncate">JoineryTech</div>
            <div className="text-[10.5px] text-stone-500 leading-tight truncate hidden sm:block">Ügyfélportál</div>
          </div>
          <CommHubButton tone="bar" size={16} />
          <button onClick={() => setCartOpen(true)} aria-label="Kosár"
            className="relative w-9 h-9 grid place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 shrink-0">
            <Icon name="box" size={16} />
            {cartCount > 0 && <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 grid place-items-center rounded-full bg-teal-600 text-white text-[10px] font-bold ring-2 ring-white">{cartCount}</span>}
          </button>
          <ProfileSwitcher tone="bar" />
        </div>
        <div className="max-w-[1080px] mx-auto px-4 md:px-6 flex items-center gap-1 overflow-x-auto">
          {[{ k: "shop", l: "Bolt" },
            { k: "egyedi", l: "Egyedi megrendelés", badge: egyediCount },
            { k: "kereskedelmi", l: "Kereskedelmi", badge: openInv.length, overdue: finSummary.overdue > 0 },
            { k: "service", l: "Reklamáció", badge: myTickets.length }].map((it) => (
            <button key={it.k} onClick={() => setTab(it.k)}
              className={`relative px-3 h-10 text-[13px] font-medium border-b-2 transition whitespace-nowrap shrink-0 ${tab === it.k ? "border-teal-600 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800"}`}>
              {it.l}
              {it.badge > 0 && <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${it.overdue ? "bg-rose-100 text-rose-700" : "bg-stone-100 text-stone-600"}`}>{it.badge}</span>}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-[1080px] w-full mx-auto px-4 md:px-6 py-5 md:py-7">
        {tab === "shop" ? <ShopGrid s={s} orders={myShopOrders} onEgyedi={() => setTab("egyedi")} />
          : tab === "egyedi" ? <EgyediHome s={s} customer={me.name} projects={myProjects} orders={myCustomOrders} />
          : tab === "kereskedelmi" ? (window.FinanceHub ? <window.FinanceHub customer={me.name} /> : null)
          : tab === "service" ? <MyService tickets={myTickets} customer={me.name} />
          : <ShopGrid s={s} orders={myShopOrders} onEgyedi={() => setTab("egyedi")} />}
      </main>

      {cartOpen && <CartSheet s={s} onClose={() => setCartOpen(false)} onPlaced={() => { setCartOpen(false); setTab("orders"); }} />}
    </div>
  );
}

// ── Bolt ──────────────────────────────────────────────────────────────────
function ShopGrid({ s, orders = [], onEgyedi }) {
  const products = window.sim.shopProducts();
  const cats = ["Mind", ...Array.from(new Set(products.map((p) => p.cat)))];
  const [cat, setCat] = useStateWS("Mind");
  const list = cat === "Mind" ? products : products.filter((p) => p.cat === cat);
  return (
    <>
      <div className="mb-5">
        <h1 className="text-[20px] md:text-[24px] font-semibold text-stone-900 tracking-tight">Kínálatunk</h1>
        <p className="text-[13px] text-stone-500 mt-0.5">Válogasson késztermékeinkből, és adja le rendelését pár kattintással.</p>
      </div>
      <button onClick={onEgyedi} className="w-full text-left mb-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3.5 md:p-4 flex items-center gap-3 hover:border-blue-300 transition">
        <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-700 grid place-items-center shrink-0"><Icon name="sparkle" size={20} /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-stone-900">Egyedi elképzelése van?</div>
          <div className="text-[11.5px] text-stone-500 leading-snug mt-0.5">Állítsa össze saját bútorát a konfigurátorban, vagy kérjen személyre szabott ajánlatot — az <span className="text-blue-700 font-medium">Egyedi megrendelés</span> fülön.</div>
        </div>
        <Icon name="arrow-right" size={17} className="text-blue-500 shrink-0" />
      </button>
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-3 h-8 rounded-full text-[12.5px] font-medium whitespace-nowrap shrink-0 transition ${cat === c ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"}`}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {list.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col hover:shadow-md transition group">
            <div className={`aspect-[4/3] bg-gradient-to-br ${p.tint} grid place-items-center relative`}>
              <Icon name={p.icon} size={44} className="text-stone-500/40" />
              <image-slot id={`shop-${p.id}`} placeholder={p.name} class="absolute inset-0 w-full h-full" style={{ display: "block" }}></image-slot>
            </div>
            <div className="p-3 md:p-4 flex flex-col flex-1">
              <div className="text-[10px] uppercase tracking-wide text-teal-700 font-semibold">{p.cat}</div>
              <div className="text-[14px] font-semibold text-stone-900 leading-tight mt-0.5">{p.name}</div>
              <div className="text-[11.5px] text-stone-500 leading-snug mt-1 flex-1">{p.blurb}</div>
              <div className="flex items-center justify-between gap-2 mt-3">
                <div>
                  <div className="text-[15px] font-semibold text-stone-900 tabular-nums">{wshuf(p.price)}</div>
                  <div className="text-[10px] text-stone-400">~{p.lead} nap gyártás</div>
                </div>
                <button onClick={() => window.sim.addToCart(p.id)} aria-label="Kosárba"
                  className="w-10 h-10 grid place-items-center rounded-xl bg-teal-600 text-white hover:bg-teal-700 active:scale-95 transition shrink-0">
                  <Icon name="plus" size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {orders.length > 0 && (
        <div className="mt-8">
          <h2 className="text-[15px] font-semibold text-stone-800 mb-3">Bolti rendeléseim</h2>
          <div className="space-y-3 max-w-[680px]">{orders.map((o) => <OrderCard key={o.id} o={o} />)}</div>
        </div>
      )}
    </>
  );
}

// ── Egyedi megrendelés ──────────────────────────────────────
// Konfigurátor + ajánlatkérés + a futó egyedi munkáim (a cég által kurált,
// ügyfél-látható mérföldkő-haladással) + egyedi rendeléseim.
function EgyediHome({ s, customer, projects = [], orders = [] }) {
  const [inqOpen, setInqOpen] = useStateWS(false);
  const [cfgOpen, setCfgOpen] = useStateWS(false);
  const [openProject, setOpenProject] = useStateWS(null);
  const hasWork = projects.length > 0 || orders.length > 0;

  if (openProject && window.ProjectDetail) {
    return <window.ProjectDetail projectId={openProject} customer={customer} onBack={() => setOpenProject(null)} />;
  }
  return (
    <div className="max-w-[760px]">
      <div className="mb-4">
        <h1 className="text-[20px] md:text-[24px] font-semibold text-stone-900 tracking-tight">Egyedi megrendelés</h1>
        <p className="text-[12.5px] text-stone-500 mt-0.5">Állítsa össze saját bútorát, kérjen ajánlatot, és kövesse a gyártás haladását.</p>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 md:p-5 grid sm:grid-cols-2 gap-3 mb-6">
        <button onClick={() => setCfgOpen(true)} className="flex items-center gap-3 rounded-xl bg-white border border-violet-200 p-3.5 text-left hover:border-violet-300 transition">
          <div className="w-11 h-11 rounded-xl bg-violet-600/10 text-violet-700 grid place-items-center shrink-0"><Icon name="ruler" size={21} /></div>
          <div className="min-w-0"><div className="text-[13.5px] font-semibold text-stone-900">Összeállítom</div><div className="text-[11px] text-stone-500 leading-snug mt-0.5">Méret, kivitel és becsült ár azonnal.</div></div>
        </button>
        <button onClick={() => setInqOpen(true)} className="flex items-center gap-3 rounded-xl bg-white border border-blue-200 p-3.5 text-left hover:border-blue-300 transition">
          <div className="w-11 h-11 rounded-xl bg-blue-600/10 text-blue-700 grid place-items-center shrink-0"><Icon name="send" size={20} /></div>
          <div className="min-w-0"><div className="text-[13.5px] font-semibold text-stone-900">Ajánlatkérés</div><div className="text-[11px] text-stone-500 leading-snug mt-0.5">Személyre szabott árajánlat kérése.</div></div>
        </button>
      </div>

      {hasWork ? (
        <div className="space-y-4">
          <h2 className="text-[15px] font-semibold text-stone-800">Folyamatban lévő munkáim</h2>
          {projects.map((p) => <CustomerProjectCard key={p.id} p={p} onOpen={() => setOpenProject(p.id)} />)}
          {orders.map((o) => <OrderCard key={o.id} o={o} />)}
        </div>
      ) : (
        <div className="text-center py-14 bg-white rounded-2xl border border-stone-200">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-stone-100 grid place-items-center text-stone-400 mb-3"><Icon name="briefcase" size={26} /></div>
          <div className="text-[15px] font-semibold text-stone-700">Még nincs egyedi munkája</div>
          <div className="text-[12.5px] text-stone-500 mt-1">Indítson egyet a konfigurátorral vagy ajánlatkéréssel.</div>
        </div>
      )}

      {inqOpen && <WebshopInquiry s={s} onClose={() => setInqOpen(false)} />}
      {cfgOpen && window.ProductConfigurator && <ProductConfigurator audience="webshop" onClose={() => setCfgOpen(false)} />}
    </div>
  );
}

// ── Egyedi ajánlatkérés → auto-lead a CRM-be (createLeadFromWebshop) ──
function WebshopInquiry({ s, onClose }) {
  const me = (s.accounts || []).find((a) => a.id === s.currentAccountId) || {};
  const isCompany = me.type && me.type !== "b2c";
  const [contact, setContact] = useStateWS(isCompany ? "" : (me.name || ""));
  const [company, setCompany] = useStateWS(isCompany ? (me.name || "") : "");
  const [email, setEmail] = useStateWS("");
  const [phone, setPhone] = useStateWS("");
  const [title, setTitle] = useStateWS("");
  const [interest, setInterest] = useStateWS("");
  const [sent, setSent] = useStateWS(false);
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-blue-500";

  const submit = () => {
    if (!contact.trim() || !title.trim()) return;
    window.sim.createLeadFromWebshop({ contact, company, email, phone, title, interest });
    setSent(true);
    if (window.toast) window.toast("Köszönjük! Hamarosan keressük a megadott elérhetőségen.", "success");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog" aria-modal="true">
      <button aria-label="Bezárás" onClick={onClose} className="absolute inset-0 bg-stone-900/40" />
      <div className="relative bg-white w-full md:max-w-[480px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between">
          <div className="text-[14px] font-semibold text-stone-900">Egyedi ajánlatkérés</div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button>
        </div>
        {sent ? (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center mx-auto mb-3"><Icon name="check" size={26} /></div>
            <div className="text-[15px] font-semibold text-stone-900">Köszönjük a megkeresést!</div>
            <div className="text-[12.5px] text-stone-500 mt-1 max-w-[320px] mx-auto">Igényét rögzítettük. Értékesítő kollégánk hamarosan felveszi Önnel a kapcsolatot.</div>
            <button onClick={onClose} className="mt-5 h-9 px-4 rounded-lg bg-stone-900 text-white text-[12.5px] font-medium">Bezárás</button>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div><label className="text-[10.5px] text-stone-500 block mb-1">Név *</label><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Az Ön neve" className={cls} /></div>
              <div><label className="text-[10.5px] text-stone-500 block mb-1">Cég (opcionális)</label><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Cégnév" className={cls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div><label className="text-[10.5px] text-stone-500 block mb-1">Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@…" className={cls} /></div>
              <div><label className="text-[10.5px] text-stone-500 block mb-1">Telefon</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+36…" className={cls} /></div>
            </div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Mire van szüksége? *</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pl. Egyedi konyhabútor" className={cls} /></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Részletek</label><textarea value={interest} onChange={(e) => setInterest(e.target.value)} rows={3} placeholder="Méretek, anyagok, határidő…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-blue-500" /></div>
            <button disabled={!contact.trim() || !title.trim()} onClick={submit} className="w-full h-10 rounded-xl bg-blue-600 text-white text-[13px] font-semibold disabled:opacity-40">Ajánlatkérés elküldése</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Kosár / checkout ────────────────────────────────────────────────────────
function CartSheet({ s, onClose, onPlaced }) {
  const total = s.cart.reduce((n, c) => n + c.price * c.qty, 0);
  const place = () => { const id = window.sim.placeCustomerOrder(); if (id) onPlaced(); };
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <button aria-label="Bezárás" onClick={onClose} className="absolute inset-0 bg-stone-900/30 backdrop-blur-[1px]" />
      <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:w-[420px] bg-white rounded-t-2xl md:rounded-none shadow-2xl border-t md:border-l border-stone-200 flex flex-col max-h-[88vh] md:max-h-none animate-[chSlide_.22s_ease-out]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}>
        <div className="md:hidden pt-2 pb-1 grid place-items-center shrink-0"><span className="w-9 h-1 rounded-full bg-stone-300" /></div>
        <div className="px-4 pt-3 pb-3 border-b border-stone-200 flex items-center justify-between">
          <div className="text-[14px] font-semibold text-stone-900">Kosár</div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"><Icon name="x" size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {s.cart.length === 0 && <div className="px-3 py-12 text-center text-[13px] text-stone-400">A kosár üres.</div>}
          {s.cart.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-stone-200">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-stone-900 truncate">{c.name}</div>
                <div className="text-[12px] text-stone-500 tabular-nums">{wshuf(c.price)}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => window.sim.setCartQty(c.id, c.qty - 1)} className="w-8 h-8 grid place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"><Icon name="minus" size={14} /></button>
                <span className="w-6 text-center text-[13px] font-semibold tabular-nums">{c.qty}</span>
                <button onClick={() => window.sim.setCartQty(c.id, c.qty + 1)} className="w-8 h-8 grid place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"><Icon name="plus" size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-stone-200 bg-stone-50/60 space-y-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-stone-500">Összesen</span>
            <span className="text-[17px] font-semibold text-stone-900 tabular-nums">{wshuf(total)}</span>
          </div>
          <button onClick={place} disabled={s.cart.length === 0}
            className="w-full h-11 rounded-xl bg-teal-600 text-white text-[13.5px] font-semibold hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center justify-center gap-2">
            <Icon name="check" size={16} /> Rendelés leadása
          </button>
          <div className="text-[10.5px] text-stone-400 text-center leading-relaxed">A rendelés leadása után a gyártás visszaigazolja, és itt követheti az állapotát.</div>
        </div>
      </div>
    </div>
  );
}

// ── Rendeléseim — simple status + summary + contact ─────────────────────────
function MyOrders({ orders }) {
  if (!orders.length) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-stone-100 grid place-items-center text-stone-400 mb-3"><Icon name="box" size={26} /></div>
        <div className="text-[15px] font-semibold text-stone-700">Még nincs rendelése</div>
        <div className="text-[12.5px] text-stone-500 mt-1">A Bolt fülön válogathat a termékekből.</div>
      </div>
    );
  }
  return (
    <div className="space-y-3 max-w-[680px]">
      <h1 className="text-[20px] md:text-[24px] font-semibold text-stone-900 tracking-tight mb-1">Rendeléseim</h1>
      {orders.map((o) => <OrderCard key={o.id} o={o} />)}
    </div>
  );
}

function MyService({ tickets, customer }) {
  const sim = useSim();
  const [formOpen, setFormOpen] = useStateWS(false);
  const steps = window.SVC_CUSTOMER_STEPS || ["Bejelentve", "Vizsgálat alatt", "Javítás folyamatban", "Megoldva"];

  return (
    <div className="space-y-3 max-w-[680px]">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-[20px] md:text-[24px] font-semibold text-stone-900 tracking-tight">Reklamáció</h1>
        <button onClick={() => setFormOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Új bejelentés</button>
      </div>
      <p className="text-[12.5px] text-stone-500 -mt-1 mb-2">Hibás termék, beépítés vagy beállítási kérés? Jelezze itt, és kövesse a megoldás állapotát.</p>

      {tickets.length ? tickets.map((t) => {
        const cstep = window.ServiceEngine ? window.ServiceEngine.customerStep(t.status) : 0;
        const m = (window.SVC_TYPE_META || {})[t.type] || {};
        const rejected = t.status === "elutasitva";
        return (
          <div key={t.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-4 md:px-5 py-3.5 border-b border-stone-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: (m.accent || "#dc2626") + "1a", color: m.accent || "#dc2626" }}><Icon name={m.icon || "shield"} size={18} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-stone-900">{t.title}</div>
                <div className="text-[11.5px] text-stone-500">{t.id} · {m.label} · bejelentve {t.reportedAt}</div>
              </div>
            </div>
            <div className="px-4 md:px-5 py-4">
              {rejected ? (
                <div className="text-[12.5px] text-stone-600 bg-stone-50 rounded-lg px-3 py-2.5 border border-stone-200">A bejelentést kivizsgáltuk — a hiba garancián kívüli. Részletekért kollégánk felveszi Önnel a kapcsolatot.</div>
              ) : (
                <div className="flex items-center">
                  {steps.map((label, i) => {
                    const reached = i <= cstep;
                    return (
                      <React.Fragment key={label}>
                        <div className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 72 }}>
                          <div className={`w-7 h-7 rounded-full grid place-items-center text-[12px] font-bold ${reached ? "bg-teal-600 text-white" : "bg-stone-100 text-stone-400"}`}>{reached && i < cstep ? <Icon name="check" size={13} /> : i + 1}</div>
                          <div className={`text-[9px] text-center leading-tight ${reached ? "text-stone-700 font-medium" : "text-stone-400"}`}>{label}</div>
                        </div>
                        {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded-full -mt-4 ${i < cstep ? "bg-teal-600" : "bg-stone-200"}`} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      }) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-stone-100 grid place-items-center text-stone-400 mb-3"><Icon name="shield" size={26} /></div>
          <div className="text-[15px] font-semibold text-stone-700">Nincs aktív bejelentése</div>
          <div className="text-[12.5px] text-stone-500 mt-1">Probléma esetén az „Új bejelentés" gombbal jelezheti.</div>
        </div>
      )}

      {formOpen && <CustomerTicketForm customer={customer} onClose={() => setFormOpen(false)} />}
    </div>
  );
}

function CustomerTicketForm({ customer, onClose }) {
  const sim = useSim();
  const [type, setType] = useStateWS("garancia");
  const [title, setTitle] = useStateWS("");
  const [desc, setDesc] = useStateWS("");
  const [source, setSource] = useStateWS("");
  const ships = (sim.shipments || []).filter((s) => s.customer === customer && s.type === "delivery");
  const projs = (sim.projects || []).filter((p) => p.customer === customer);
  const cls = "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] bg-white outline-none focus:border-teal-500";

  const submit = () => {
    if (!title.trim()) return;
    let ref = "", refLabel = "", shipmentId = null, projectId = null, installedAt = null;
    if (source.startsWith("sh:")) { const s = ships.find((x) => x.id === source.slice(3)); if (s) { ref = s.ref; refLabel = s.refLabel; shipmentId = s.id; installedAt = s.date; } }
    else if (source.startsWith("pr:")) { const p = projs.find((x) => x.id === source.slice(3)); if (p) { ref = p.id; refLabel = p.name; projectId = p.id; installedAt = p.installTarget; } }
    window.sim.createTicket({ type, priority: "kozepes", customer, title, desc, channel: "webshop", ref, refLabel, shipmentId, projectId, installedAt });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[480px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between">
          <div className="text-[14px] font-semibold text-stone-900">Új bejelentés</div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button>
        </div>
        <div className="px-4 py-4 space-y-3.5">
          <div className="flex items-center gap-2">
            {(window.SVC_TYPE_ORDER || []).map((k) => { const m = window.SVC_TYPE_META[k]; const on = type === k; return (
              <button key={k} onClick={() => setType(k)} className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border ${on ? "border-teal-500 bg-teal-50" : "border-stone-200 bg-white"}`}>
                <Icon name={m.icon} size={18} className={on ? "text-teal-700" : "text-stone-400"} /><span className={`text-[11px] font-medium text-center leading-tight ${on ? "text-teal-800" : "text-stone-600"}`}>{m.short}</span>
              </button>
            ); })}
          </div>
          {(ships.length > 0 || projs.length > 0) && (
            <div>
              <label className="text-[11px] text-stone-500 block mb-1">Melyik termékről van szó?</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={cls}>
                <option value="">— válasszon (opcionális) —</option>
                {ships.length > 0 && <optgroup label="Kiszállítások">{ships.map((s) => <option key={s.id} value={"sh:" + s.id}>{s.refLabel || s.id}</option>)}</optgroup>}
                {projs.length > 0 && <optgroup label="Projektek">{projs.map((p) => <option key={p.id} value={"pr:" + p.id}>{p.name}</option>)}</optgroup>}
              </select>
            </div>
          )}
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mi a probléma? (rövid cím)" className={cls} />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Részletezze a problémát…" className="w-full px-3 py-2.5 rounded-lg border border-stone-200 text-[13px] bg-white outline-none focus:border-teal-500" />
          <button disabled={!title.trim()} onClick={submit} className="w-full h-11 rounded-xl bg-teal-600 text-white text-[13.5px] font-semibold disabled:opacity-40">Bejelentés elküldése</button>
        </div>
      </div>
    </div>
  );
}

function DeliveryTrack({ orderId }) {
  const sim = useSim();
  const sh = (sim.shipments || []).find((s) => s.ref === orderId && s.type === "delivery");
  if (!sh) return null;
  const steps = window.LOG_CUSTOMER_STEPS || ["Ütemezve", "Úton", "Kiszállítva", "Átadva"];
  const cstep = window.LogEngine ? window.LogEngine.customerStep(sh.status) : 0;
  return (
    <div className="px-4 md:px-5 pb-3">
      <div className="rounded-xl border border-sky-200 bg-sky-50/60 px-3.5 py-3">
        <div className="flex items-center gap-2 mb-2.5">
          <Icon name="truck" size={15} className="text-sky-600" />
          <span className="text-[12px] font-semibold text-sky-800">Kiszállítás</span>
          {sh.date && <span className="text-[11px] text-sky-600/80 ml-auto">{sh.date}{sh.windowStart ? ` · ${sh.windowStart}–${sh.windowEnd}` : ""}</span>}
        </div>
        <div className="flex items-center">
          {steps.map((label, i) => {
            const reached = i <= cstep;
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 64 }}>
                  <div className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold ${reached ? "bg-sky-600 text-white" : "bg-white text-stone-300 border border-stone-200"}`}>
                    {reached && i < cstep ? <Icon name="check" size={12} /> : i + 1}
                  </div>
                  <div className={`text-[9px] text-center leading-tight ${reached ? "text-sky-800 font-medium" : "text-stone-400"}`}>{label}</div>
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded-full -mt-4 ${i < cstep ? "bg-sky-500" : "bg-stone-200"}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OrderCard({ o }) {
  const step = customerStep(o.status);
  const done = step >= CUSTOMER_STEPS.length - 1;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-4 md:px-5 py-3.5 flex items-center justify-between gap-3 border-b border-stone-100">
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-stone-900">{o.id}</div>
          <div className="text-[11px] text-stone-500">Leadva: {o.date}{o.source === "webshop" ? " · Bolt" : ""}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[15px] font-semibold text-stone-900 tabular-nums">{wshuf(o.total)}</div>
          <div className="text-[11px] text-stone-500">{o.items} tétel</div>
        </div>
      </div>

      {/* Status timeline */}
      <div className="px-4 md:px-5 py-4">
        <div className="flex items-center">
          {CUSTOMER_STEPS.map((label, i) => {
            const reached = i <= step;
            const isCurrent = i === step && !done;
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 64 }}>
                  <div className={`w-7 h-7 rounded-full grid place-items-center text-[12px] font-bold transition ${reached ? "bg-teal-600 text-white" : "bg-stone-100 text-stone-400"} ${isCurrent ? "ring-4 ring-teal-100" : ""}`}>
                    {reached && i < step ? <Icon name="check" size={14} /> : i + 1}
                  </div>
                  <div className={`text-[9.5px] text-center leading-tight ${reached ? "text-stone-700 font-medium" : "text-stone-400"}`}>{label}</div>
                </div>
                {i < CUSTOMER_STEPS.length - 1 && <div className={`flex-1 h-0.5 rounded-full -mt-4 ${i < step ? "bg-teal-600" : "bg-stone-200"}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <DeliveryTrack orderId={o.id} />

      {/* Summary lines */}
      {o.lines && o.lines.length > 0 && (
        <div className="px-4 md:px-5 pb-2">
          <div className="rounded-xl bg-stone-50 border border-stone-100 divide-y divide-stone-100">
            {o.lines.map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-[12px]">
                <span className="text-stone-700 truncate">{l.qty}× {l.name}</span>
                <span className="font-mono tabular-nums text-stone-600 shrink-0">{wshuf(l.price * l.qty)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 md:px-5 py-3 border-t border-stone-100 flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-stone-500">Kérdése van a rendelésről?</span>
        <button onClick={() => window.sim.askAbout({ type: "order", id: o.id, label: o.id, sub: "Rendelésem" }, "dm-szabo")}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-stone-900 text-white text-[12.5px] font-medium hover:bg-stone-800">
          <Icon name="chat" size={14} /> Üzenet a cégnek
        </button>
      </div>
    </div>
  );
}

// ── Projektem — egyszerűsített ügyfél-nézet (D2: belsőépítészt megbízó) ──────
// Ügyfél-barát státusz térkép (a belső projekt-státuszból)
const PROJ_CUST_STEP = { draft: 0, active: 1, install: 2, done: 3, on_hold: 1 };
const PROJ_CUST_STEPS = ["Tervezés", "Készül", "Beépítésre kész", "Kész"];
const TRADE_LABEL = { viz: "Víz", aram: "Áram", szellozes: "Szellőzés", gepeszet: "Gépészet", butor: "Bútor beépítés" };

function MyProjects({ projects }) {
  if (!projects.length) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-stone-100 grid place-items-center text-stone-400 mb-3"><Icon name="briefcase" size={26} /></div>
        <div className="text-[15px] font-semibold text-stone-700">Nincs aktív projektje</div>
        <div className="text-[12.5px] text-stone-500 mt-1">A tervezője által indított projektek itt jelennek meg.</div>
      </div>
    );
  }
  return (
    <div className="space-y-4 max-w-[680px]">
      <h1 className="text-[20px] md:text-[24px] font-semibold text-stone-900 tracking-tight mb-1">Projektem</h1>
      {projects.map((p) => <CustomerProjectCard key={p.id} p={p} />)}
    </div>
  );
}

function CustomerProjectCard({ p, onOpen }) {
  const step = PROJ_CUST_STEP[p.status] != null ? PROJ_CUST_STEP[p.status] : 1;
  // ügyfél-barát szakág állapot: kész vs. hátravan (belső részletek nélkül)
  const blocking = p.dependencies.filter((d) => d.blocksInstall);
  const doneCount = blocking.filter((d) => d.status === "done").length;
  const waiting = blocking.filter((d) => d.status !== "done");
  const ready = waiting.length === 0;
  const total = p.items.reduce((n, i) => n + i.value, 0);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <button onClick={onOpen} className="w-full text-left px-4 md:px-5 py-3.5 border-b border-stone-100 flex items-center gap-3 hover:bg-stone-50/60 transition">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-stone-900">{p.name}</div>
          <div className="text-[11.5px] text-stone-500 mt-0.5">Tervező: {p.designer} · Tervezett átadás: <span className="font-mono">{p.installTarget}</span></div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11.5px] text-teal-700 font-medium shrink-0">Részletek<Icon name="chevron" size={14} /></span>
      </button>

      {/* simple status timeline */}
      <div className="px-4 md:px-5 py-4">
        <div className="flex items-center">
          {PROJ_CUST_STEPS.map((label, i) => {
            const reached = i <= step;
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 70 }}>
                  <div className={`w-7 h-7 rounded-full grid place-items-center text-[12px] font-bold ${reached ? "bg-teal-600 text-white" : "bg-stone-100 text-stone-400"} ${i === step ? "ring-4 ring-teal-100" : ""}`}>
                    {i < step ? <Icon name="check" size={14} /> : i + 1}
                  </div>
                  <div className={`text-[9.5px] text-center leading-tight ${reached ? "text-stone-700 font-medium" : "text-stone-400"}`}>{label}</div>
                </div>
                {i < PROJ_CUST_STEPS.length - 1 && <div className={`flex-1 h-0.5 rounded-full -mt-4 ${i < step ? "bg-teal-600" : "bg-stone-200"}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* cég által kurált, ügyfél-látható haladás (customerMilestones) */}
      {Array.isArray(p.customerMilestones) && p.customerMilestones.length > 0 && (
        <div className="px-4 md:px-5 pb-3">
          <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-2">Hol tartunk?</div>
          <div className="space-y-2.5">
            {p.customerMilestones.map((m, i) => {
              const last = i === p.customerMilestones.length - 1;
              return (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-6 h-6 rounded-full grid place-items-center ${m.done ? "bg-teal-600 text-white" : "bg-white border-2 border-stone-200 text-stone-300"}`}>
                      {m.done ? <Icon name="check" size={13} /> : <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />}
                    </div>
                    {!last && <div className={`w-0.5 flex-1 min-h-[14px] mt-0.5 ${m.done ? "bg-teal-200" : "bg-stone-150"}`} style={{ background: m.done ? undefined : "#e7e5e4" }} />}
                  </div>
                  <div className="min-w-0 flex-1 pb-0.5">
                    <div className={`text-[12.5px] leading-tight ${m.done ? "font-medium text-stone-800" : "text-stone-500"}`}>{m.label}</div>
                    {m.done && m.doneAt && <div className="text-[10.5px] text-stone-400 mt-0.5">{m.doneAt}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* readiness summary — friendly, no internal jargon */}
      <div className="px-4 md:px-5 pb-3">
        <div className={`rounded-xl px-3.5 py-3 border ${ready ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/50"}`}>
          {ready ? (
            <div className="flex items-center gap-2 text-[12.5px] font-medium text-emerald-800"><Icon name="check" size={15} /> Minden előkészület kész — a bútor beépíthető.</div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-[12.5px] font-medium text-amber-800"><Icon name="wrench" size={15} /> Előkészületek folyamatban ({doneCount}/{blocking.length} kész)</div>
              <div className="mt-1.5 text-[11.5px] text-stone-600">Még erre várunk: {waiting.map((d) => TRADE_LABEL[d.trade]).join(", ")}.</div>
            </>
          )}
        </div>
      </div>

      {/* what's included */}
      <div className="px-4 md:px-5 pb-2">
        <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">A projekt tartalma</div>
        <div className="rounded-xl bg-stone-50 border border-stone-100 divide-y divide-stone-100">
          {p.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[12px]">
              <span className="text-stone-700 truncate">{it.name}</span>
              <span className="font-mono tabular-nums text-stone-500 shrink-0">{wshuf(it.value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-5 py-3 border-t border-stone-100 flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-stone-500">Brief, tervrajzok, látványterv, anyagok…</span>
        <button onClick={onOpen}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-stone-900 text-white text-[12.5px] font-medium hover:bg-stone-800">
          Projekt részletei<Icon name="arrow-right" size={14} />
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { WebshopPortal });