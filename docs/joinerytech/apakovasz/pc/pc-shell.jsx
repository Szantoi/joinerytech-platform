// ──────────────────────────────────────────────────────────────────────────
// pc-shell.jsx — DESKTOP IRODA shell: oldalsáv + topbar + router
// Operatív (üzemi) modulok = a meglévő MOBIL komponensek beágyazva (tablet-oszlop).
// Vezetési/vállalati modulok = teljes szélességű desktop nézetek.
// ──────────────────────────────────────────────────────────────────────────
window.useSim = window.CoreStore.makeUseStore(window.bakery, React);

const GROUPS = [
  { name: 'Vezérlés', items: [
    { id: 'exec', label: 'Vezetői áttekintés', icon: '◆' },
    { id: 'controlling', label: 'Kontrolling', icon: '▤' },
  ]},
  { name: 'Bolt & Gyártás', items: [
    { id: 'bolt', label: 'Bolt napi nézet', icon: '🛒', op: true },
    { id: 'uzem', label: 'Üzem-terminál', icon: '🔥', op: true },
    { id: 'sutok', label: 'Sütők · kapacitás', icon: '⏱️', op: true },
    { id: 'quality', label: 'Minőség', icon: '✔' },
  ]},
  { name: 'Kereskedelem', items: [
    { id: 'crm', label: 'CRM · Lehetőségek', icon: '◎' },
    { id: 'orders', label: 'Rendelések', icon: '▦' },
  ]},
  { name: 'Ellátás', items: [
    { id: 'beszerzes', label: 'Beszerzés · MRP', icon: '📦', op: true },
    { id: 'warehouse', label: 'Raktár', icon: '▥' },
    { id: 'szallitas', label: 'Szállítás · Webshop', icon: '🚐', op: true },
    { id: 'maint', label: 'Karbantartás', icon: '⚙' },
  ]},
  { name: 'Vállalat', items: [
    { id: 'hr', label: 'HR · Dolgozók', icon: '👥' },
    { id: 'attendance', label: 'Jelenlét', icon: '◷' },
    { id: 'finance', label: 'Pénzügy', icon: '💰' },
    { id: 'ehs', label: 'Munkavédelem', icon: '⚠' },
    { id: 'docs', label: 'Dokumentumtár', icon: '🗂' },
  ]},
];

const SCREENS = {
  exec: 'ExecScreen', controlling: 'ControllingScreen',
  bolt: 'ShopScreen', uzem: 'UzemScreen', sutok: 'SutokScreen', quality: 'QualityScreen',
  crm: 'CrmScreen', orders: 'OrdersScreen',
  beszerzes: 'BeszerzesScreen', warehouse: 'WarehouseScreen', szallitas: 'SzallitasScreen', maint: 'MaintScreen',
  hr: 'HrScreen', attendance: 'AttendanceScreen', finance: 'FinanceScreen', ehs: 'EhsScreen', docs: 'DocsScreen',
};
const OP_IDS = {};
GROUPS.forEach(function (g) { g.items.forEach(function (it) { if (it.op) OP_IDS[it.id] = true; }); });

function flatItem(id) {
  for (var i = 0; i < GROUPS.length; i++) { var f = GROUPS[i].items.find(function (x) { return x.id === id; }); if (f) return f; }
  return null;
}

function PcApp() {
  const s = window.useSim();
  const [tab, setTab] = useStateP(localStorage.getItem('apakovasz_pc_tab') || 'exec');
  function go(id) { setTab(id); localStorage.setItem('apakovasz_pc_tab', id); }

  const item = flatItem(tab) || GROUPS[0].items[0];
  const Comp = window[SCREENS[tab]];
  const isOp = !!OP_IDS[tab];

  // exec aggregátor a topbarhoz
  const c = s.execCockpit();

  return (
    <div className="pc">
      {/* OLDALSÁV */}
      <aside className="side">
        <div className="side-brand">
          <div className="logo">A</div>
          <div>
            <div className="brand-name">Apakovász</div>
            <div className="brand-sub">Iroda · Bittó Tamás e.v.</div>
          </div>
        </div>
        <nav className="side-nav">
          {GROUPS.map(function (g) {
            return (
              <div key={g.name} className="nav-group">
                <div className="nav-group-name">{g.name}</div>
                {g.items.map(function (it) {
                  return (
                    <button key={it.id} className={'nav-item' + (it.id === tab ? ' active' : '')} onClick={function () { go(it.id); }}>
                      <span className="nav-ico">{it.icon}</span>
                      <span className="nav-lab">{it.label}</span>
                      {it.op ? <span className="nav-op" title="Üzemi / mobil nézet">üzem</span> : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="side-foot">
          <div className="core-badge">
            <strong>Domén-független MAG</strong>
            <span>Ugyanaz a motor, mint az asztalos rendszerben — pékség-adapterrel.</span>
          </div>
        </div>
      </aside>

      {/* FŐ TARTALOM */}
      <div className="main-col">
        <header className="pc-top">
          <div className="pc-top-title">{item.label}</div>
          <div className="pc-top-kpis">
            <span className="tk"><b>{fmtFt(c.revenue)}</b> mai bevétel</span>
            <span className="tk"><b>{Math.round(c.utilization * 100)}%</b> sütő</span>
            <span className={'tk' + (c.overdueCount ? ' warn' : '')}><b>{c.overdueCount}</b> lejárt számla</span>
            <span className="tk"><b>{c.present}/{c.headcount}</b> jelen</span>
          </div>
          <div className="pc-top-user"><Avatar name="Bittó Tamás" size={32} /></div>
        </header>

        <main className={'pc-content' + (isOp ? ' op' : '')}>
          {isOp ? (
            <div className="opwrap">
              <div className="opframe">
                <div className="opframe-bar"><span className="opframe-dot"></span><span className="opframe-dot"></span><span className="opframe-dot"></span><span className="opframe-label">Üzemi nézet — tablet / telefon</span></div>
                <div className="opframe-screen">{Comp ? <Comp /> : null}</div>
              </div>
              <div className="opnote">
                <h4>Üzemi modul</h4>
                <p>Ez a képernyő a <strong>hajnali műszak</strong> érintőképernyős nézete — pontosan ugyanaz a komponens, amit a pékek a telefonon/tableten használnak.</p>
                <p className="muted-sm">Az irodai vezetés a bal oldali menüből éri el az összes többi modult — HR, Pénzügy, Kontrolling, Minőség, Munkavédelem.</p>
              </div>
            </div>
          ) : (Comp ? <Comp go={go} /> : <div className="world"><WorldHead title="Hamarosan" /></div>)}
        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<PcApp />);
