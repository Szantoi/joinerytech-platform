// ──────────────────────────────────────────────────────────────────────────
// screen-sutok.jsx — SÜTŐK / kapacitás-ütemezés
// A CORE CapacityEngine sütőkre alkalmazva (bucket + napi óra + ütközés)
// ──────────────────────────────────────────────────────────────────────────
function SutokScreen() {
  const s = window.useSim();
  const day = s.day();
  const cap = s.capacity;
  const bookings = s.bookings();
  const batchFlow = s.flows.batch;

  const overall = cap.overallUtilization(bookings, day);
  const conflicts = cap.conflicts(bookings, day);

  function minToH(m) { return (Math.round((m / 60) * 10) / 10).toLocaleString('hu-HU') + ' ó'; }

  return (
    <div className="screen">
      <div className="hello">
        <div className="hello-k">Véges kapacitás · Üzem</div>
        <h1>Sütők</h1>
        <div className="hello-sub">Napi kemence-terhelés és ütemezés</div>
      </div>

      {/* össz-kihasználtság KPI */}
      <div className="kpi-row">
        <Card className="kpi">
          <div className="kpi-num">{Math.round(overall * 100)}%</div>
          <div className="kpi-lab">Átlag kihasználtság</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-num" style={{ color: conflicts.length ? window.TONES.ember.fg : window.TONES.sage.fg }}>{conflicts.length}</div>
          <div className="kpi-lab">Túlterhelt sütő</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-num">{bookings.length}</div>
          <div className="kpi-lab">Beütemezett sarzs</div>
        </Card>
      </div>

      {/* állomásonkénti terhelés */}
      <SectionTitle kicker="Állomások" title="Terhelés" />
      <div className="station-list">
        {cap.stations.map(function (st) {
          const load = cap.dayLoadMinutes(bookings, st.id, day);
          const capM = cap.capacityMinutes(st.id);
          const util = cap.utilization(bookings, st.id, day);
          const over = load > capM;
          const stBatches = bookings.filter(function (b) { return b.stationId === st.id; });
          return (
            <Card key={st.id} className="station-card">
              <div className="station-head">
                <div>
                  <strong>{st.label}</strong>
                  <div className="muted-sm">{st.dailyHours} ó/nap kapacitás{st.tepsi ? ' · ' + st.tepsi + ' tepsi' : ''}</div>
                </div>
                <div className="station-util" style={{ color: over ? window.TONES.ember.fg : window.TONES.crust.fg }}>
                  {Math.round(util * 100)}%
                </div>
              </div>
              <div className="bar bar-lg">
                <div className="bar-fill" style={{ width: Math.min(100, util * 100) + '%', background: over ? window.TONES.ember.dot : window.TONES.crust.dot }}></div>
              </div>
              <div className="station-meta">
                <span>{minToH(load)} / {minToH(capM)}</span>
                {over ? <Pill tone="ember" small>túlterhelt: +{minToH(load - capM)}</Pill>
                  : <span className="muted-sm">{minToH(capM - load)} szabad</span>}
              </div>
              {stBatches.length ? (
                <div className="timeline">
                  {stBatches.sort(function (a, b) {
                    const ba = s.state.batches.find(function (x) { return x.id === a.batchId; });
                    const bb = s.state.batches.find(function (x) { return x.id === b.batchId; });
                    return ((ba && ba.start) || '').localeCompare((bb && bb.start) || '');
                  }).map(function (bk) {
                    const b = s.state.batches.find(function (x) { return x.id === bk.batchId; });
                    const p = s.domain.productById(b.productId);
                    return (
                      <div key={bk.batchId} className="tl-item">
                        <span className="tl-time">{b.start}</span>
                        <Emoji char={p.emoji} size={15} />
                        <span className="tl-name">{p.name}</span>
                        <span className="tl-min">{p.bakeMin}'</span>
                        <StatusPill flow={batchFlow} status={b.status} small />
                      </div>
                    );
                  })}
                </div>
              ) : <div className="muted-sm" style={{ padding: '4px 0' }}>Ma nincs beütemezve.</div>}
            </Card>
          );
        })}
      </div>

      <div className="foot-note">Ugyanaz a véges-kapacitás motor hajtja, mint a JoineryTech gépütemezését — csak gép helyett sütő a „bucket". Egyetlen sor kód sem változott a motorban.</div>
    </div>
  );
}
window.SutokScreen = SutokScreen;
