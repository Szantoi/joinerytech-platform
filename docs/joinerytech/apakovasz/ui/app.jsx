// ──────────────────────────────────────────────────────────────────────────
// app.jsx — Gyökér: mobil shell, alsó nav, architektúra-info lap
// ──────────────────────────────────────────────────────────────────────────
window.useSim = window.CoreStore.makeUseStore(window.bakery, React);

const NAV = [
  { id: 'bolt',      label: 'Bolt',     icon: '🛒', screen: 'ShopScreen' },
  { id: 'uzem',      label: 'Üzem',     icon: '🔥', screen: 'UzemScreen' },
  { id: 'sutok',     label: 'Sütők',    icon: '⏱️', screen: 'SutokScreen' },
  { id: 'beszerzes', label: 'Beszerzés', icon: '📦', screen: 'BeszerzesScreen' },
  { id: 'szallitas', label: 'Szállítás', icon: '🚐', screen: 'SzallitasScreen' },
];

function ArchSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Mire épül ez a demó?">
      <p className="muted-sm" style={{ marginTop: 0 }}>
        Az Apakovász pékség ugyanazon a <strong>domén-független magon</strong> fut, mint a JoineryTech
        asztalos-rendszer. Három réteg — csak a felső kettő cserélődött:
      </p>
      <div className="arch">
        <div className="arch-layer brand">
          <div className="arch-tag">MÁRKA</div>
          <div className="arch-body"><strong>Apakovász</strong> — meleg kovász-tónusok, hangnem, persona</div>
        </div>
        <div className="arch-layer domain">
          <div className="arch-tag">DOMÉN-ADAPTER</div>
          <div className="arch-body"><strong>Pékség</strong> — sütők, műveletek, termékek, receptek, FSM-ek</div>
        </div>
        <div className="arch-layer core">
          <div className="arch-tag">MAG (változatlan)</div>
          <div className="arch-body">FSM-motor · véges kapacitás · BOM/MRP · raktár · rendelés-pipeline · store</div>
        </div>
      </div>
      <ul className="arch-list">
        <li><strong>Sütők ütemezése</strong> = ugyanaz a véges-kapacitás motor, mint a gépeknél</li>
        <li><strong>„Sütés nem sikerült"</strong> = a gyártási „blokkolt" FSM-átmenet</li>
        <li><strong>Alapanyag-rendelés</strong> = a recept-BOM MRP-je, trend-előrejelzéssel</li>
        <li><strong>Üzem→bolt szállítás</strong> = a telephely-mozgás motor</li>
      </ul>
      <p className="muted-sm">A <code>core/</code> fájlokban egyetlen pékség-szó sincs — ez a bizonyíték a verticalizálhatóságra.</p>
    </Sheet>
  );
}

function App() {
  const [tab, setTab] = useState(localStorage.getItem('apakovasz_tab') || 'bolt');
  const [arch, setArch] = useState(false);
  function go(id) { setTab(id); localStorage.setItem('apakovasz_tab', id); }

  const active = NAV.find(function (n) { return n.id === tab; }) || NAV[0];
  const Screen = window[active.screen];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brandmark">
          <div className="logo">A</div>
          <div>
            <div className="brand-name">Apakovász</div>
            <div className="brand-sub">Bittó Tamás e.v.</div>
          </div>
        </div>
        <button className="info-btn" onClick={function () { setArch(true); }}>ⓘ&nbsp;Mag</button>
      </header>

      <main className="content">
        {Screen ? <Screen /> : null}
      </main>

      <nav className="tabbar">
        {NAV.map(function (n) {
          return (
            <button key={n.id} className={'tab' + (n.id === tab ? ' active' : '')} onClick={function () { go(n.id); }}>
              <span className="tab-ico">{n.icon}</span>
              <span className="tab-lab">{n.label}</span>
            </button>
          );
        })}
      </nav>

      <ArchSheet open={arch} onClose={function () { setArch(false); }} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
