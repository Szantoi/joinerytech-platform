// ──────────────────────────────────────────────────────────────────────────
// pc-ops.jsx — ÜZEMELTETÉS: Raktár · Minőség · Munkavédelem · Dokumentumtár · Karbantartás
// ──────────────────────────────────────────────────────────────────────────

// ── RAKTÁR (alapanyag lot/zóna) ─────────────────────────────────────────────
function WarehouseScreen() {
  const s = window.useSim();
  const mats = s.state.materials;
  const prices = s.matPrice();
  const zones = s.domain.zones;
  const low = s.invEngine.lowStock(mats);
  const totalValue = mats.reduce(function (a, m) { return a + (m.stock || 0) * (prices[m.id] || 0); }, 0);
  const byZone = {};
  mats.forEach(function (m) { (byZone[m.zone] = byZone[m.zone] || []).push(m); });

  return (
    <div className="world">
      <WorldHead kicker="Ellátás" title="Raktár · Alapanyag" sub="Készlet zónánként, min-szint, készletérték" />
      <StatRow>
        <Stat label="Tételek" value={mats.length} />
        <Stat label="Min-szint alatt" value={low.length} tone={low.length ? 'ember' : 'sage'} sub="utánrendelendő" />
        <Stat label="Készletérték" value={fmtFt(totalValue)} sub="beszerzési áron" />
        <Stat label="Zónák" value={Object.keys(byZone).length} />
      </StatRow>

      <Panel pad={false}>
        <Table cols={[{ label: 'Alapanyag' }, { label: 'Zóna' }, { label: 'Készlet', align: 'right' }, { label: 'Min-szint', align: 'right' }, { label: 'Egységár', align: 'right' }, { label: 'Érték', align: 'right' }, { label: '', w: 110 }]}>
          {mats.filter(function (m) { return m.id !== 'viz'; }).map(function (m) {
            const lowM = (m.reorderPoint || 0) > 0 && (m.stock || 0) <= m.reorderPoint;
            return (
              <tr key={m.id}>
                <td><strong>{m.name}</strong></td>
                <td className="muted">{zones[m.zone] || m.zone}</td>
                <td className="num">{fmtKg(m.stock, m.unit)}</td>
                <td className="num muted">{fmtKg(m.reorderPoint, m.unit)}</td>
                <td className="num muted">{fmtFt(prices[m.id] || 0)}</td>
                <td className="num">{fmtFt(Math.round((m.stock || 0) * (prices[m.id] || 0)))}</td>
                <td>{lowM ? <Pill tone="ember" small>utánrendelés</Pill> : <Pill tone="sage" small>ok</Pill>}</td>
              </tr>
            );
          })}
        </Table>
      </Panel>
      <div className="foot-note">Ugyanaz a lot/zóna raktár-motor, mint az asztalos lapanyag-raktárban — itt liszt-silók, hűtő, száraz raktár. A min-szint riasztás közvetlenül táplálja az MRP-t.</div>
    </div>
  );
}
window.WarehouseScreen = WarehouseScreen;

// ── MINŐSÉG (QA) ────────────────────────────────────────────────────────────
function QualityScreen() {
  const s = window.useSim();
  const insp = s.state.qaInspections;
  const flow = s.flows.qa;
  const typeLabel = { bejovo: 'Bejövő', gyartaskozi: 'Gyártásközi', vegellenorzes: 'Végellenőrzés' };
  const done = insp.filter(function (i) { return i.status === 'megfelelt' || i.status === 'selejt'; });
  const pass = done.length ? insp.filter(function (i) { return i.status === 'megfelelt'; }).length / done.length : 1;

  return (
    <div className="world">
      <WorldHead kicker="Ellátás" title="Minőség · Ellenőrzés" sub="Bejövő alapanyag · gyártásközi · végellenőrzés" />
      <StatRow>
        <Stat label="Megfelelés" value={Math.round(pass * 100) + '%'} tone={pass < 0.9 ? 'ember' : 'sage'} />
        <Stat label="Nyitott" value={insp.filter(function (i) { return i.status === 'nyitott' || i.status === 'folyamatban'; }).length} tone="amber" />
        <Stat label="Selejt" value={insp.filter(function (i) { return i.status === 'selejt'; }).length} tone="ember" />
        <Stat label="Összes ellenőrzés" value={insp.length} />
      </StatRow>

      <Panel pad={false}>
        <Table cols={[{ label: 'Ellenőrzés' }, { label: 'Típus' }, { label: 'Hivatkozás' }, { label: 'Megjegyzés' }, { label: 'Státusz' }, { label: '', w: 150 }]}>
          {insp.map(function (i) {
            const nextSt = flow.next(i.status);
            return (
              <tr key={i.id}>
                <td><strong>{i.title}</strong></td>
                <td><Pill tone="slate" small>{typeLabel[i.type]}</Pill></td>
                <td className="mono muted">{i.ref}</td>
                <td className={i.status === 'selejt' ? 'overdue' : 'muted-sm'}>{i.statusReason || i.note || '—'}</td>
                <td><StatusPill flow={flow} status={i.status} small /></td>
                <td>{nextSt ? <Btn small kind="ghost" onClick={function () { s.qaAdvance(i.id); }}>→ {flow.label(nextSt)}</Btn> : null}</td>
              </tr>
            );
          })}
        </Table>
      </Panel>
      <div className="foot-note">A „selejt" minőség-állapot a hajnali sikertelen sütéshez kötődik (b05) — az átadás ELŐTTI minőség-hurok, ugyanaz az FSM, mint az asztalos QA-ban.</div>
    </div>
  );
}
window.QualityScreen = QualityScreen;

// ── MUNKAVÉDELEM (EHS) ──────────────────────────────────────────────────────
function EhsScreen() {
  const s = window.useSim();
  const inc = s.state.ehsIncidents;
  const risks = s.state.ehsRisks;
  const trains = s.state.ehsTrainings;
  const flow = s.flows.ehs;
  const sevLabel = { konnyu: 'Könnyű', munkakieso: 'Munkakieső', sulyos: 'Súlyos' };
  const trainTone = { ervenyes: 'sage', hamarosan: 'amber', lejart: 'ember' };
  const trainLabel = { ervenyes: 'Érvényes', hamarosan: 'Hamarosan lejár', lejart: 'Lejárt' };
  const band = function (sc) { return sc >= 15 ? 'ember' : (sc >= 8 ? 'amber' : 'sage'); };

  return (
    <div className="world">
      <WorldHead kicker="Vállalat" title="Munkavédelem · EHS" sub="Incidensek · kockázatértékelés · oktatások (HACCP, tűzvédelem)" />
      <StatRow>
        <Stat label="Nyitott incidens" value={inc.filter(function (i) { return i.status !== 'lezarva'; }).length} tone="amber" />
        <Stat label="Kiemelt kockázat" value={risks.filter(function (r) { return r.prob * r.sev >= 15; }).length} tone="ember" />
        <Stat label="Lejárt oktatás" value={trains.filter(function (t) { return t.status === 'lejart'; }).length} tone={trains.filter(function (t) { return t.status === 'lejart'; }).length ? 'ember' : 'sage'} />
        <Stat label="Kockázat-tételek" value={risks.length} />
      </StatRow>

      <div className="cols-2">
        <Panel title="Incidensek" pad={false}>
          <Table cols={[{ label: 'Esemény' }, { label: 'Súlyosság' }, { label: 'Státusz' }, { label: '', w: 110 }]}>
            {inc.map(function (i) {
              const emp = s.empById(i.who);
              const nextSt = flow.next(i.status);
              return (
                <tr key={i.id}>
                  <td><strong>{i.title}</strong><div className="muted-sm">{i.date} · {emp ? emp.name : ''}</div></td>
                  <td><Pill tone="amber" small>{sevLabel[i.sev]}</Pill></td>
                  <td><StatusPill flow={flow} status={i.status} small /></td>
                  <td>{nextSt ? <Btn small kind="ghost" onClick={function () { s.ehsAdvance(i.id); }}>→</Btn> : null}</td>
                </tr>
              );
            })}
          </Table>
        </Panel>
        <Panel title="Oktatások" pad={false}>
          <Table cols={[{ label: 'Dolgozó' }, { label: 'Oktatás' }, { label: 'Érvényes', align: 'right' }]}>
            {trains.map(function (t) {
              const emp = s.empById(t.empId);
              return (
                <tr key={t.id}>
                  <td>{emp ? emp.name : t.empId}</td>
                  <td className="muted-sm">{t.kind}</td>
                  <td style={{ textAlign: 'right' }}><Pill tone={trainTone[t.status]} small>{trainLabel[t.status]}</Pill></td>
                </tr>
              );
            })}
          </Table>
        </Panel>
      </div>

      <Panel title="Kockázatértékelés (valószínűség × súlyosság)" pad={false}>
        <Table cols={[{ label: 'Veszélyforrás' }, { label: 'Valószínűség', align: 'center' }, { label: 'Súlyosság', align: 'center' }, { label: 'Pontszám', align: 'center' }, { label: 'Védintézkedés' }]}>
          {risks.map(function (r) {
            const sc = r.prob * r.sev;
            return (
              <tr key={r.id}>
                <td><strong>{r.title}</strong></td>
                <td style={{ textAlign: 'center' }}>{r.prob}</td>
                <td style={{ textAlign: 'center' }}>{r.sev}</td>
                <td style={{ textAlign: 'center' }}><Pill tone={band(sc)} small>{sc}</Pill></td>
                <td className="muted-sm">{r.control}</td>
              </tr>
            );
          })}
        </Table>
      </Panel>
      <div className="foot-note">Az 5×5 kockázat-mátrix és az incidens-FSM domén-független — a horgony-elv szerint az ember a HR-ből, az oktatás onnan hivatkozik. Pékség-specifikus csak a veszélyforrás-szótár (lisztpor, forró kemence).</div>
    </div>
  );
}
window.EhsScreen = EhsScreen;

// ── DOKUMENTUMTÁR (DMS) ─────────────────────────────────────────────────────
function DocsScreen() {
  const s = window.useSim();
  const docs = s.state.documents;
  const flow = s.flows.doc;
  const typeLabel = { recept: 'Receptúra', utasitas: 'Utasítás', tanusitvany: 'Tanúsítvány', szerzodes: 'Szerződés', egyeb: 'Egyéb' };

  return (
    <div className="world">
      <WorldHead kicker="Vállalat" title="Dokumentumtár" sub="Verziózott receptek, HACCP-terv, szerződések — egyetlen otthon" />
      <StatRow>
        <Stat label="Dokumentum" value={docs.length} />
        <Stat label="Kiadott" value={docs.filter(function (d) { return d.status === 'kiadott'; }).length} tone="sage" />
        <Stat label="Ellenőrzés alatt" value={docs.filter(function (d) { return d.status === 'ellenorzes'; }).length} tone="amber" />
        <Stat label="Receptúra" value={docs.filter(function (d) { return d.type === 'recept'; }).length} />
      </StatRow>

      <Panel pad={false}>
        <Table cols={[{ label: 'Dokumentum' }, { label: 'Típus' }, { label: 'Kapcsolat' }, { label: 'Verzió', align: 'center' }, { label: 'Státusz' }, { label: '', w: 160 }]}>
          {docs.map(function (d) {
            const nextSt = flow.next(d.status);
            const prod = d.link && d.link !== 'none' ? s.domain.productById(d.link) : null;
            return (
              <tr key={d.id}>
                <td><strong>{d.title}</strong></td>
                <td><Pill tone="slate" small>{typeLabel[d.type]}</Pill></td>
                <td className="muted-sm">{prod ? <span><Emoji char={prod.emoji} size={14} /> {prod.name}</span> : '—'}</td>
                <td style={{ textAlign: 'center' }} className="mono">v{d.version}</td>
                <td><StatusPill flow={flow} status={d.status} small /></td>
                <td>{nextSt ? <Btn small kind="ghost" onClick={function () { s.docAdvance(d.id); }}>→ {flow.label(nextSt)}</Btn> : null}</td>
              </tr>
            );
          })}
        </Table>
      </Panel>
      <div className="foot-note">A receptúrák verziózott dokumentumként élnek — ugyanaz a DMS-motor, mint az asztalos rajzoknál. A „recept" típus a domén-adapter hozzáadása, a verzió-FSM közös.</div>
    </div>
  );
}
window.DocsScreen = DocsScreen;

// ── KARBANTARTÁS ────────────────────────────────────────────────────────────
function MaintScreen() {
  const s = window.useSim();
  const items = s.state.maintenance;
  const flow = s.flows.maint;

  return (
    <div className="world">
      <WorldHead kicker="Ellátás" title="Karbantartás" sub="Sütők, dagasztó, hűtő — tervezett és folyamatban lévő szerviz" />
      <StatRow>
        <Stat label="Tervezett" value={items.filter(function (m) { return m.status === 'tervezett'; }).length} />
        <Stat label="Folyamatban" value={items.filter(function (m) { return m.status === 'folyamatban'; }).length} tone="amber" />
        <Stat label="Kész (héten)" value={items.filter(function (m) { return m.status === 'kesz'; }).length} tone="sage" />
        <Stat label="Eszköz" value={items.length} />
      </StatRow>
      <Panel pad={false}>
        <Table cols={[{ label: 'Eszköz' }, { label: 'Feladat' }, { label: 'Határidő' }, { label: 'Folyamat', w: 240 }, { label: '', w: 150 }]}>
          {items.map(function (m) {
            const nextSt = flow.next(m.status);
            return (
              <tr key={m.id}>
                <td><strong>{m.asset}</strong></td>
                <td className="muted-sm">{m.task}</td>
                <td className="muted">{m.due}</td>
                <td><StepFlow flow={flow} status={m.status} /></td>
                <td>{nextSt ? <Btn small kind="ghost" onClick={function () { s.maintAdvance(m.id); }}>→ {flow.label(nextSt)}</Btn> : <span className="muted-sm">kész ✓</span>}</td>
              </tr>
            );
          })}
        </Table>
      </Panel>
    </div>
  );
}
window.MaintScreen = MaintScreen;
