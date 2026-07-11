// ──────────────────────────────────────────────────────────────────────────
// screen-szallitas.jsx — SZÁLLÍTÁS (üzem→bolt) + WEBSHOP
// A CORE TransferEngine mozgásai · order-FSM két belépővel (gyártás / foglalás)
// ──────────────────────────────────────────────────────────────────────────
function SzallitasScreen() {
  const s = window.useSim();
  const delFlow = s.flows.delivery;
  const deliveries = s.state.deliveries;
  const movements = s.state.movements;
  const daily = s.shopDaily();
  const [toast, setToast] = useState(null);

  function showToast(t) { setToast(t); setTimeout(function () { setToast(null); }, 1800); }

  return (
    <div className="screen">
      <div className="hello">
        <div className="hello-k">Logisztika · Üzem → Bolt</div>
        <h1>Szállítás</h1>
        <div className="hello-sub">Napközbeni folyamatos szállítás · {deliveries.length} kör</div>
      </div>

      <SectionTitle kicker="Mai körök" title="Szállítmányok" />
      <div className="deliv-list">
        {deliveries.map(function (d) {
          const nextSt = delFlow.next(d.status);
          return (
            <Card key={d.id} className="deliv-card">
              <div className="deliv-head">
                <div>
                  <strong>{d.round}</strong>
                  <div className="muted-sm">tervezett: {d.time}</div>
                </div>
                <StatusPill flow={delFlow} status={d.status} />
              </div>
              <div className="chips">
                {d.lines.map(function (ln, i) {
                  const p = s.domain.productById(ln.productId);
                  return <span key={i} className="chip"><Emoji char={p.emoji} size={14} /> {ln.count} {p.name}</span>;
                })}
              </div>
              {nextSt ? (
                <Btn small full kind="primary" onClick={function () { s.deliveryAdvance(d.id); }}>
                  → {delFlow.label(nextSt)}
                </Btn>
              ) : <div className="muted-sm" style={{ textAlign: 'center', padding: '4px' }}>Megérkezett ✓</div>}
            </Card>
          );
        })}
      </div>

      {/* mozgás-napló */}
      {movements.length ? (
        <div>
          <SectionTitle kicker="Raktár-mozgás" title="Bolti bevét" right={<span className="muted-sm">{movements.length} tétel</span>} />
          <Card className="mov-card">
            {movements.slice().reverse().map(function (m) {
              const p = s.domain.productById(m.itemId);
              return (
                <div key={m.id} className="mov-row">
                  <span>{p ? p.name : m.itemId}</span>
                  <span className="muted-sm">{s.domain.zones[m.fromZone]} → {s.domain.zones[m.toZone]}</span>
                  <span className="mov-qty">+{m.qty}</span>
                </div>
              );
            })}
          </Card>
        </div>
      ) : null}

      {/* WEBSHOP — rendelésre VAGY készletről */}
      <SectionTitle kicker="Webshop" title="Online rendelés" />
      <Card className="shop-grid">
        {daily.filter(function (d) { return d.product.price > 0; }).map(function (d) {
          const p = d.product;
          return (
            <div key={p.id} className="shop-item">
              <div className="shop-emoji"><Emoji char={p.emoji} size={28} /></div>
              <div className="shop-name">{p.name}</div>
              <div className="shop-price">{fmtFt(p.price)}</div>
              <div className="shop-stock">
                {d.szabad > 0 ? <Pill tone="sage" small>{d.szabad} db készleten</Pill> : <Pill tone="slate" small>előrendelhető</Pill>}
              </div>
              <div className="shop-btns">
                {d.szabad > 0 ? (
                  <Btn small kind="primary" onClick={function () {
                    s.orderAdd({ who: 'Webshop vásárló', pickup: 'ma', status: 'kesz', lines: [{ productId: p.id, count: 1 }] });
                    showToast('Lefoglalva készletről: ' + p.name);
                  }}>Foglalás</Btn>
                ) : (
                  <Btn small kind="ghost" onClick={function () {
                    s.orderAdd({ who: 'Webshop vásárló', pickup: 'holnap', status: 'draft', lines: [{ productId: p.id, count: 1 }] });
                    showToast('Előrendelve holnapra: ' + p.name);
                  }}>Előrendelés</Btn>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      {toast ? <div className="toast">{toast}</div> : null}
      <div className="foot-note">A webshop ugyanazt az order-FSM-et használja, mint a telefonos és nagyker rendelés — „Foglalás" készletről, „Előrendelés" gyártásba. Egy pipeline.</div>
    </div>
  );
}
window.SzallitasScreen = SzallitasScreen;
