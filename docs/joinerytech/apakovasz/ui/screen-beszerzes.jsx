// ──────────────────────────────────────────────────────────────────────────
// screen-beszerzes.jsx — ALAPANYAG-RENDELÉS (MRP)
// Recept-BOM × trend-előrejelzés − készlet = rendelendő. A CORE BomEngine.mrp.
// ──────────────────────────────────────────────────────────────────────────
function Spark({ data, tone }) {
  const max = Math.max.apply(null, data.concat([1]));
  const t = window.TONES[tone || 'crust'];
  return (
    <div className="spark">
      {data.map(function (v, i) {
        const h = Math.max(8, Math.round((v / max) * 100));
        const last = i === data.length - 1;
        return <span key={i} className="spark-bar" style={{ height: h + '%', background: last ? t.dot : t.bg }}></span>;
      })}
    </div>
  );
}

function BeszerzesScreen() {
  const s = window.useSim();
  const mrp = s.mrp();
  const toOrder = mrp.filter(function (m) { return m.suggest > 0; });
  const okItems = mrp.filter(function (m) { return m.suggest === 0 && m.required > 0; });

  return (
    <div className="screen">
      <div className="hello">
        <div className="hello-k">Beszerzés · MRP</div>
        <h1>Alapanyag</h1>
        <div className="hello-sub">Holnapi terv a trendből · recept-igény − készlet</div>
      </div>

      {/* TREND → előrejelzés */}
      <SectionTitle kicker="Eladási trend (7 nap)" title="Holnapi várható gyártás" />
      <Card className="trend-card">
        {s.domain.products.map(function (p) {
          const hist = (s.state.salesHistory[p.id]) || [];
          const fc = s.forecastFor(p.id);
          return (
            <div key={p.id} className="trend-row">
              <Emoji char={p.emoji} size={18} />
              <span className="trend-name">{p.name}</span>
              <Spark data={hist} tone="crust" />
              <span className="trend-fc">{fc} db</span>
            </div>
          );
        })}
        <div className="mep-foot">A jobb oldali szám a 7-napos trendből számolt holnapi gyártási mennyiség — ez hajtja az alapanyag-igényt.</div>
      </Card>

      {/* RENDELENDŐ alapanyagok */}
      <SectionTitle kicker="MRP-javaslat" title="Rendelendő" right={<Pill tone={toOrder.length ? 'ember' : 'sage'} small>{toOrder.length} tétel</Pill>} />
      <div className="mrp-list">
        {toOrder.map(function (m) {
          const mat = s.domain.materialById(m.material);
          const pack = mat && mat.pack ? mat.pack : 0;
          const packs = pack > 0 ? Math.ceil(m.suggest / pack) : 0;
          const orderQty = pack > 0 ? packs * pack : m.suggest;
          return (
            <Card key={m.material} className="mrp-card">
              <div className="mrp-top">
                <div className="mrp-name">
                  <strong>{m.name}</strong>
                  <div className="muted-sm">igény {fmtKg(m.required, m.unit)} · készlet {fmtKg(m.stock, m.unit)}</div>
                </div>
                <Pill tone="ember" small>−{fmtKg(m.shortfall, m.unit)}</Pill>
              </div>
              <div className="mrp-bar">
                <Bar value={m.stock} max={m.required + m.reorderPoint} tone="ember" />
              </div>
              <div className="mrp-foot">
                <span className="muted-sm">
                  {pack > 0 ? 'Javaslat: ' + packs + ' csomag × ' + pack + ' ' + m.unit + ' = ' + fmtKg(orderQty, m.unit) : 'Javaslat: ' + fmtKg(m.suggest, m.unit)}
                </span>
                <Btn small kind="primary" onClick={function () { s.materialReceive(m.material, orderQty); }}>Megrendelem</Btn>
              </div>
            </Card>
          );
        })}
        {!toOrder.length ? <Card className="ok-card">Minden alapanyag fedezve a holnapi tervhez. ✓</Card> : null}
      </div>

      {/* fedezett tételek */}
      {okItems.length ? (
        <div>
          <SectionTitle kicker="Fedezve" title="Elég a készlet" />
          <Card className="ok-list">
            {okItems.map(function (m) {
              return (
                <div key={m.material} className="ok-row">
                  <span>{m.name}</span>
                  <span className="muted-sm">{fmtKg(m.after, m.unit)} marad</span>
                </div>
              );
            })}
          </Card>
        </div>
      ) : null}

      <div className="foot-note">Az MRP a recept-BOM-ból robbantja az igényt, majd kivonja a készletet — ugyanaz az aritmetika, mint a JoineryTech anyagszükséglet-számításában.</div>
    </div>
  );
}
window.BeszerzesScreen = BeszerzesScreen;
