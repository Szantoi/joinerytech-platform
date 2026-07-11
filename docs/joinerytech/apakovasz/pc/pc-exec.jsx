// ──────────────────────────────────────────────────────────────────────────
// pc-exec.jsx — VEZÉRLÉS: Vezetői áttekintés (exec cockpit) + Kontrolling
// Kereszt-világ aggregátor — minden szám a forrás-modul motorjából.
// ──────────────────────────────────────────────────────────────────────────
function ExecScreen({ go }) {
  const s = window.useSim();
  const c = s.execCockpit();

  const banner = c.overdueCount > 0 || c.expiredTrain > 0 || c.failedBatches > 0;
  const bannerItems = [];
  if (c.failedBatches > 0) bannerItems.push(c.failedBatches + ' sikertelen sütés');
  if (c.overdueCount > 0) bannerItems.push(c.overdueCount + ' lejárt kintlévőség');
  if (c.expiredTrain > 0) bannerItems.push(c.expiredTrain + ' lejárt oktatás');
  if (c.openEhs > 0) bannerItems.push(c.openEhs + ' nyitott munkavédelmi ügy');

  return (
    <div className="world">
      <WorldHead kicker="Vezérlés" title="Vezetői áttekintés"
        sub="2026. június 15. · minden mutató a forrás-modulból számítva" />

      {banner ? (
        <div className="exec-banner">
          <span className="exec-banner-dot"></span>
          <strong>Mai figyelmeztetések:</strong>&nbsp;{bannerItems.join(' · ')}
        </div>
      ) : (
        <div className="exec-banner ok"><span className="exec-banner-dot"></span>Minden mutató a terv szerint.</div>
      )}

      <StatRow>
        <Stat label="Mai árbevétel (kész)" value={fmtFt(c.revenue)} sub={c.orders + ' aktív rendelés'} />
        <Stat label="Átlag fedezet" value={Math.round(c.avgMargin * 100) + '%'} sub="termék-portfólió" tone="sage" />
        <Stat label="Sütő-kihasználtság" value={Math.round(c.utilization * 100) + '%'} sub="mai kapacitás" tone="crust" />
        <Stat label="Kintlévőség" value={fmtFt(c.receivable)} sub={c.overdueCount + ' lejárt'} tone={c.overdueCount ? 'ember' : 'slate'} />
      </StatRow>
      <StatRow>
        <Stat label="Jelen lévő dolgozó" value={c.present + ' / ' + c.headcount} sub="mai műszak" />
        <Stat label="Mai bérköltség" value={fmtFt(c.laborCost)} sub="jelenlétből" />
        <Stat label="Minőség megfelelés" value={Math.round(c.qaPass * 100) + '%'} sub={c.qaOpen + ' nyitott ellenőrzés'} tone={c.qaPass < 0.9 ? 'ember' : 'sage'} />
        <Stat label="Pipeline (CRM)" value={fmtFt(c.leadValue)} sub="nyitott lehetőség" tone="amber" />
      </StatRow>

      <div className="cols-2">
        <Panel title="Riasztások" right={<span className="muted-sm">forrás-modulba ugrik</span>}>
          <div className="alert-list">
            {c.failedBatches > 0 ? <AlertRow tone="ember" t="Sikertelen sütés a hajnali műszakban" s="Minőség / Üzem" onClick={function () { go('quality'); }} /> : null}
            {c.overdueCount > 0 ? <AlertRow tone="ember" t={c.overdueCount + ' lejárt kintlévőség · ' + fmtFt(c.overdue)} s="Pénzügy" onClick={function () { go('finance'); }} /> : null}
            {c.expiredTrain > 0 ? <AlertRow tone="amber" t={c.expiredTrain + ' lejárt munkavédelmi oktatás'} s="Munkavédelem" onClick={function () { go('ehs'); }} /> : null}
            {c.openEhs > 0 ? <AlertRow tone="amber" t={c.openEhs + ' nyitott munkavédelmi ügy'} s="Munkavédelem" onClick={function () { go('ehs'); }} /> : null}
            {c.qaOpen > 0 ? <AlertRow tone="slate" t={c.qaOpen + ' folyamatban lévő minőség-ellenőrzés'} s="Minőség" onClick={function () { go('quality'); }} /> : null}
          </div>
        </Panel>
        <Panel title="Gyors belépők">
          <div className="quick-grid">
            {[['Bolt napi nézet', 'bolt', '🛒'], ['Üzem-terminál', 'uzem', '🔥'], ['Sütők', 'sutok', '⏱️'], ['Beszerzés (MRP)', 'beszerzes', '📦'], ['HR', 'hr', '👥'], ['Pénzügy', 'finance', '💰']].map(function (q) {
              return <button key={q[1]} className="quick" onClick={function () { go(q[1]); }}><span className="quick-ico">{q[2]}</span>{q[0]}</button>;
            })}
          </div>
        </Panel>
      </div>

      <div className="foot-note">Ugyanaz a kereszt-világ aggregátor-minta, mint a JoineryTech „Vezetői áttekintés"-é — egyetlen igazságforrás minden modulban, ide csak deep-linkel.</div>
    </div>
  );
}
function AlertRow({ tone, t, s, onClick }) {
  const tn = window.TONES[tone];
  return (
    <button className="alert-line" onClick={onClick}>
      <span className="alert-bar" style={{ background: tn.dot }}></span>
      <span className="alert-t">{t}</span>
      <span className="alert-s">{s} ›</span>
    </button>
  );
}
window.ExecScreen = ExecScreen;

// ── KONTROLLING — termékenkénti fedezet ────────────────────────────────────
function ControllingScreen() {
  const s = window.useSim();
  const rows = s.controllingProducts();
  const best = rows[0], worst = rows[rows.length - 1];
  const avg = rows.reduce(function (a, c) { return a + c.marginPct; }, 0) / rows.length;

  return (
    <div className="world">
      <WorldHead kicker="Vezérlés" title="Kontrolling"
        sub="Termékenkénti fedezet — eladási ár vs. alapanyag + munka (utókalkuláció)" />
      <StatRow>
        <Stat label="Átlag fedezet" value={Math.round(avg * 100) + '%'} tone="sage" />
        <Stat label="Legjövedelmezőbb" value={best.product.name} sub={Math.round(best.marginPct * 100) + '% fedezet'} tone="sage" />
        <Stat label="Legalacsonyabb fedezet" value={worst.product.name} sub={Math.round(worst.marginPct * 100) + '%'} tone="ember" />
        <Stat label="Munka-óradíj (terhelt)" value={fmtFt(4500)} sub="fedezet-bázis" />
      </StatRow>

      <Panel title="Fedezet termékenként" pad={false}>
        <Table cols={[{ label: 'Termék' }, { label: 'Eladási ár', align: 'right' }, { label: 'Alapanyag', align: 'right' }, { label: 'Munka', align: 'right' }, { label: 'Önköltség', align: 'right' }, { label: 'Fedezet', align: 'right' }, { label: '', w: 130 }]}>
          {rows.map(function (r) {
            const tone = r.marginPct >= 0.55 ? 'sage' : (r.marginPct >= 0.4 ? 'amber' : 'ember');
            return (
              <tr key={r.product.id}>
                <td><span className="td-prod"><Emoji char={r.product.emoji} size={18} /> {r.product.name}</span></td>
                <td className="num">{fmtFt(r.product.price)}</td>
                <td className="num muted">{fmtFt(r.matCost)}</td>
                <td className="num muted">{fmtFt(r.laborCost)}</td>
                <td className="num">{fmtFt(r.cost)}</td>
                <td className="num"><strong style={{ color: window.TONES[tone].fg }}>{fmtFt(r.margin)}</strong></td>
                <td><div className="margin-cell"><Prog value={r.marginPct * 100} max={100} tone={tone} /><span className="margin-pct">{Math.round(r.marginPct * 100)}%</span></div></td>
              </tr>
            );
          })}
        </Table>
      </Panel>
      <div className="foot-note">Az alapanyag-költség a recept-BOM × beszerzési ár szorzata (ugyanaz a BOM, amiből az MRP dolgozik). A munka a sütési idő terhelt óradíjon.</div>
    </div>
  );
}
window.ControllingScreen = ControllingScreen;
