// ──────────────────────────────────────────────────────────────────────────
// pc-commerce.jsx — KERESKEDELEM: CRM + Rendelések (nagyker/webshop)
// ──────────────────────────────────────────────────────────────────────────
function CrmScreen() {
  const s = window.useSim();
  const leads = s.state.leads;
  const flow = s.flows.lead;
  const sourceLabel = { telefon: 'Telefon', ajanlas: 'Ajánlás', email: 'E-mail', kiallitas: 'Kiállítás', weboldal: 'Weboldal', webshop: 'Webshop' };
  const open = leads.filter(function (l) { return l.status !== 'elvetve' && l.status !== 'konvertalva'; });
  const pipeline = open.reduce(function (a, l) { return a + (l.value || 0); }, 0);
  const won = leads.filter(function (l) { return l.status === 'konvertalva'; }).length;

  // kanban oszlopok
  const stages = ['uj', 'kapcsolat', 'minosites', 'konvertalva'];

  return (
    <div className="world">
      <WorldHead kicker="Kereskedelem" title="CRM · Lehetőségek" sub="Nagyker / HORECA érdeklődők a megkereséstől az ajánlatig" />
      <StatRow>
        <Stat label="Nyitott pipeline" value={fmtFt(pipeline)} sub={open.length + ' lehetőség'} tone="amber" />
        <Stat label="Megnyert" value={won} sub="konvertálva" tone="sage" />
        <Stat label="Új lead" value={leads.filter(function (l) { return l.status === 'uj'; }).length} />
        <Stat label="Konverzió" value={Math.round((won / leads.length) * 100) + '%'} />
      </StatRow>

      <div className="kanban">
        {stages.map(function (stg) {
          const items = leads.filter(function (l) { return l.status === stg; });
          return (
            <div key={stg} className="kan-col">
              <div className="kan-head"><StatusPill flow={flow} status={stg} small /><span className="kan-count">{items.length}</span></div>
              {items.map(function (l) {
                const nextSt = flow.next(l.status);
                return (
                  <div key={l.id} className="kan-card">
                    <strong>{l.name}</strong>
                    <div className="muted-sm">{l.contact} · {sourceLabel[l.source]}</div>
                    <div className="kan-note">{l.note}</div>
                    <div className="kan-foot">
                      <span className="kan-val">{fmtFt(l.value)}</span>
                      {nextSt && nextSt !== 'elvetve' ? <Btn small kind="ghost" onClick={function () { s.leadAdvance(l.id); }}>→</Btn> : null}
                    </div>
                  </div>
                );
              })}
              {!items.length ? <div className="kan-empty">—</div> : null}
            </div>
          );
        })}
      </div>
      <div className="foot-note">A lead-FSM (Új → Kapcsolat → Minősítés → Megnyert) ugyanaz a kereskedelmi tölcsér-minta, mint az asztalos CRM-ben — itt nagyker/HORECA vevőkre.</div>
    </div>
  );
}
window.CrmScreen = CrmScreen;

// ── RENDELÉSEK (nagyker + webshop, az order-FSM desktop nézete) ─────────────
function OrdersScreen() {
  const s = window.useSim();
  const orders = s.state.orders;
  const flow = s.flows.order;
  const chanLabel = { telefon: 'Telefon', nagyker: 'Nagyker', webshop: 'Webshop' };

  return (
    <div className="world">
      <WorldHead kicker="Kereskedelem" title="Rendelések" sub="Előrendelés és nagyker — a közös rendelés-pipeline" />
      <StatRow>
        <Stat label="Aktív rendelés" value={orders.filter(function (o) { return o.status !== 'atadva'; }).length} />
        <Stat label="Gyártásban" value={orders.filter(function (o) { return o.status === 'gyartasban'; }).length} tone="crust" />
        <Stat label="Készen áll" value={orders.filter(function (o) { return o.status === 'kesz'; }).length} tone="sage" />
        <Stat label="Webshop" value={orders.filter(function (o) { return o.channel === 'webshop'; }).length} tone="amber" />
      </StatRow>

      <Panel pad={false}>
        <Table cols={[{ label: 'Vevő' }, { label: 'Csatorna' }, { label: 'Tételek' }, { label: 'Átvétel' }, { label: 'Folyamat', w: 280 }, { label: '', w: 150 }]}>
          {orders.map(function (o) {
            const nextSt = flow.next(o.status);
            return (
              <tr key={o.id}>
                <td><strong>{o.who}</strong></td>
                <td><Pill tone="slate" small>{chanLabel[o.channel] || o.channel}</Pill></td>
                <td className="muted-sm">{o.lines.map(function (ln) { const p = s.domain.productById(ln.productId); return ln.count + '× ' + (p ? p.name : ln.productId); }).join(', ')}</td>
                <td className="muted">{o.pickup}</td>
                <td><StepFlow flow={flow} status={o.status} /></td>
                <td>{nextSt ? <Btn small kind="primary" onClick={function () { s.orderAdvance(o.id); }}>→ {flow.label(nextSt)}</Btn> : <span className="muted-sm">átadva ✓</span>}</td>
              </tr>
            );
          })}
        </Table>
      </Panel>
    </div>
  );
}
window.OrdersScreen = OrdersScreen;
