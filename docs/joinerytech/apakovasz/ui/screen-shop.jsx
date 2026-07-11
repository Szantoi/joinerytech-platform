// ──────────────────────────────────────────────────────────────────────────
// screen-shop.jsx — BOLT napi nézet (HŐS-képernyő, bolti eladó nézőpont)
// Várható termékek a mai napra · sikertelen sütés · hiányok · szállítás ETA
// ──────────────────────────────────────────────────────────────────────────
function ShopScreen() {
  const s = window.useSim();
  const daily = s.shopDaily();
  const deliveries = s.state.deliveries;
  const orders = s.state.orders;
  const cafe = s.state.cafe;
  const orderFlow = s.flows.order;
  const delFlow = s.flows.delivery;

  // összegzett napi állapot
  const failed = daily.filter(function (d) { return d.sikertelen > 0; });
  const atRisk = daily.filter(function (d) { return d.hiany; });
  const nextDelivery = deliveries.find(function (d) { return d.status !== 'megerkezett'; });
  const pendingOrders = orders.filter(function (o) { return o.status !== 'atadva'; });

  const bannerTone = atRisk.length ? 'ember' : (failed.length ? 'amber' : 'sage');
  const bannerText = atRisk.length
    ? atRisk.length + ' terméknél hiány fenyeget — több az ígéret, mint a várható mennyiség'
    : (failed.length ? 'Egy sütés nem sikerült — pótlás szükséges lehet' : 'Minden rendben — a mai kínálat a terv szerint alakul');

  return (
    <div className="screen">
      <div className="hello">
        <div className="hello-k">Jó reggelt! · Bolt</div>
        <h1>Mai kínálat</h1>
        <div className="hello-sub">2026. június 15., hétfő · {s.day()}</div>
      </div>

      {/* össz-állapot banner */}
      <div className="banner" style={{ background: window.TONES[bannerTone].bg, color: window.TONES[bannerTone].fg }}>
        <span className="banner-dot" style={{ background: window.TONES[bannerTone].dot }}></span>
        {bannerText}
      </div>

      {/* sikertelen sütés riasztás */}
      {failed.map(function (d) {
        return (
          <Card key={d.product.id} className="alert-card">
            <div className="alert-row">
              <Emoji char={d.product.emoji} size={22} />
              <div style={{ flex: 1 }}>
                <strong>{d.product.name}</strong>
                <div className="muted-sm">Sikertelen sütés · {d.sikertelen} db kiesett</div>
              </div>
              <Pill tone="ember" small>Hiány</Pill>
            </div>
          </Card>
        );
      })}

      <SectionTitle kicker="Termékenként" title="Mit kínálunk ma" right={<span className="muted-sm">kész / szabad</span>} />
      <div className="prod-list">
        {daily.filter(function (d) { return d.terv > 0 || d.sikertelen > 0; }).map(function (d) {
          return (
            <Card key={d.product.id} className="prod-card">
              <div className="prod-top">
                <Emoji char={d.product.emoji} size={26} />
                <div className="prod-name">
                  <strong>{d.product.name}</strong>
                  <div className="muted-sm">{fmtFt(d.product.price)}</div>
                </div>
                <div className="prod-counts">
                  <div className="big-num" style={{ color: window.TONES.sage.fg }}>{d.kesz}</div>
                  <div className="muted-sm">/ {d.terv} terv</div>
                </div>
              </div>
              <Bar value={d.kesz} max={d.terv} tone={d.hiany ? 'ember' : 'sage'} />
              <div className="prod-meta">
                {d.folyamatban > 0 ? <Pill tone="crust" small>{d.folyamatban} db sül</Pill> : null}
                {d.lekotve > 0 ? <Pill tone="amber" small>{d.lekotve} db lekötve</Pill> : null}
                <Pill tone={d.szabad > 0 ? 'sage' : 'slate'} small>{d.szabad} db szabad pultra</Pill>
                {d.sikertelen > 0 ? <Pill tone="ember" small>{d.sikertelen} db kiesett</Pill> : null}
              </div>
            </Card>
          );
        })}
      </div>

      {/* következő szállítás az üzemből */}
      {nextDelivery ? (
        <div>
          <SectionTitle kicker="Üzemből érkezik" title="Következő szállítás" />
          <Card className="deliv-card">
            <div className="deliv-head">
              <div>
                <strong>{nextDelivery.round}</strong>
                <div className="muted-sm">Érkezés ~{nextDelivery.time}</div>
              </div>
              <StatusPill flow={delFlow} status={nextDelivery.status} />
            </div>
            <div className="chips">
              {nextDelivery.lines.map(function (ln, i) {
                const p = s.domain.productById(ln.productId);
                return <span key={i} className="chip"><Emoji char={p.emoji} size={14} /> {ln.count} {p.name}</span>;
              })}
            </div>
          </Card>
        </div>
      ) : null}

      {/* beérkező rendelések */}
      <SectionTitle kicker="Vevők" title="Rendelések" right={<span className="muted-sm">{pendingOrders.length} aktív</span>} />
      <div className="ord-list">
        {pendingOrders.map(function (o) {
          return (
            <Card key={o.id} className="ord-card">
              <div className="ord-head">
                <div>
                  <strong>{o.who}</strong>
                  <div className="muted-sm">{o.channel} · átvétel: {o.pickup}</div>
                </div>
                <StatusPill flow={orderFlow} status={o.status} small />
              </div>
              <div className="chips">
                {o.lines.map(function (ln, i) {
                  const p = s.domain.productById(ln.productId);
                  return <span key={i} className="chip-sm">{ln.count}× {p.name}</span>;
                })}
              </div>
              {orderFlow.next(o.status) ? (
                <Btn small full kind="ghost" onClick={function () { s.orderAdvance(o.id); }}>
                  → {orderFlow.label(orderFlow.next(o.status))}
                </Btn>
              ) : null}
            </Card>
          );
        })}
      </div>

      {/* café — reggeliztetés (előkészítve) */}
      {cafe.enabled ? (
        <div>
          <SectionTitle kicker="Reggeliztetés" title="Café" right={<Pill tone="amber" small>előkészítve</Pill>} />
          <Card className="cafe-card">
            {cafe.meals.map(function (m) {
              return (
                <div key={m.id} className="cafe-row">
                  <div>
                    <span className={m.ready ? '' : 'muted'}>{m.name}</span>
                    {m.kind === 'ebed' ? <span className="tag-soon">ebéd · hamarosan</span> : null}
                  </div>
                  <span className="muted-sm">{fmtFt(m.price)}</span>
                </div>
              );
            })}
          </Card>
        </div>
      ) : null}

      <div className="foot-note">A mai kínálat a hajnali sütés állapotából számolódik — minden szám élő.</div>
    </div>
  );
}
window.ShopScreen = ShopScreen;
