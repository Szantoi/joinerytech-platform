// ──────────────────────────────────────────────────────────────────────────
// screen-uzem.jsx — ÜZEM-terminál (pék nézőpont, hajnali műszak)
// "Mit kell összekészíteni" mise-en-place a recept-BOM-ból · sarzs-FSM
// ──────────────────────────────────────────────────────────────────────────
function UzemScreen() {
  const s = window.useSim();
  const batchFlow = s.flows.batch;
  const batches = s.state.batches;
  const [failFor, setFailFor] = useState(null);
  const [reason, setReason] = useState('');

  // hátralévő sarzsok (nem kész, nem sikertelen) → mise-en-place
  const pending = batches.filter(function (b) { return ['tervezett', 'bekeverve', 'kel', 'sul'].indexOf(b.status) !== -1; });
  const demands = pending.map(function (b) { return { productId: b.productId, count: b.count }; });
  const need = s.bomEngine.explode(demands); // { materialId: {qty, unit} }
  const needList = Object.keys(need).map(function (id) {
    const m = s.domain.materialById(id);
    return { id: id, name: m ? m.name : id, qty: need[id].qty, unit: need[id].unit, zone: m ? m.zone : '' };
  }).filter(function (x) { return x.id !== 'viz'; })
    .sort(function (a, b) { return b.qty - a.qty; });

  // sarzsok idő szerint
  const sorted = batches.slice().sort(function (a, b) { return (a.start || '').localeCompare(b.start || ''); });

  function doFail() {
    if (failFor && reason.trim()) {
      s.batchFail(failFor, reason.trim());
      setFailFor(null); setReason('');
    }
  }

  return (
    <div className="screen">
      <div className="hello">
        <div className="hello-k">Hajnali műszak · Üzem</div>
        <h1>Sütés</h1>
        <div className="hello-sub">{pending.length} sarzs van hátra · kezdés 02:00</div>
      </div>

      {/* MISE-EN-PLACE — mit készíts össze a recept alapján */}
      <SectionTitle kicker="Recept alapján" title="Összekészítendő" right={<span className="muted-sm">{needList.length} alapanyag</span>} />
      <Card className="mep-card">
        {needList.map(function (x) {
          return (
            <div key={x.id} className="mep-row">
              <span className="mep-check">○</span>
              <span className="mep-name">{x.name}</span>
              <span className="mep-zone">{s.domain.zones[x.zone] || x.zone}</span>
              <span className="mep-qty">{fmtKg(x.qty, x.unit)}</span>
            </div>
          );
        })}
        <div className="mep-foot">A hátralévő {pending.length} sarzs teljes alapanyag-igénye (a recept-BOM-ból robbantva).</div>
      </Card>

      {/* SARZSOK */}
      <SectionTitle kicker="Sütési tételek" title="Sarzsok" right={<span className="muted-sm">{batches.length} db</span>} />
      <div className="batch-list">
        {sorted.map(function (b) {
          const p = s.domain.productById(b.productId);
          const station = s.capacity.byId[b.oven];
          const nextSt = batchFlow.next(b.status);
          const isBaking = b.status === 'sul';
          return (
            <Card key={b.id} className="batch-card">
              <div className="batch-top">
                <div className="batch-time">{b.start}</div>
                <Emoji char={p.emoji} size={22} />
                <div className="batch-name">
                  <strong>{p.name}</strong>
                  <div className="muted-sm">{b.count} db · {station ? station.label : b.oven}</div>
                </div>
                <StatusPill flow={batchFlow} status={b.status} small />
              </div>
              {b.status === 'sikertelen' && b.statusReason ? (
                <div className="fail-reason">⚠ {b.statusReason}</div>
              ) : null}
              <div className="batch-actions">
                {nextSt && b.status !== 'sikertelen' ? (
                  <Btn small kind="primary" onClick={function () { s.batchAdvance(b.id); }}>
                    → {batchFlow.label(nextSt)}
                  </Btn>
                ) : null}
                {isBaking ? (
                  <Btn small kind="danger" onClick={function () { setFailFor(b.id); setReason(''); }}>
                    Nem sikerült
                  </Btn>
                ) : null}
                {b.status === 'sikertelen' ? (
                  <Btn small kind="ghost" onClick={function () { s.batchRestart(b.id); }}>Újrasütés</Btn>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>

      {/* sikertelen-indok lap */}
      <Sheet open={!!failFor} onClose={function () { setFailFor(null); }} title="Miért nem sikerült?">
        <p className="muted-sm" style={{ marginTop: 0 }}>A sikertelen sarzs kiesik a bolti kínálatból, és az ott dolgozók azonnal látják. Az indok kötelező.</p>
        <textarea className="ta" rows={3} value={reason} placeholder="Pl. túl sötétre sült, kemence hőfok…"
          onChange={function (e) { setReason(e.target.value); }} />
        <Btn full kind="danger" disabled={!reason.trim()} onClick={doFail}>Sikertelennek jelölöm</Btn>
      </Sheet>

      <div className="foot-note">A sarzs állapotváltása a közös FSM-motoron megy át — a „Sül → Sikertelen" a JoineryTech gyártási „blokkolt" átmenetének pontos megfelelője.</div>
    </div>
  );
}
window.UzemScreen = UzemScreen;
