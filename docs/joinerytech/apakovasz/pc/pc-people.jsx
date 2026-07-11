// ──────────────────────────────────────────────────────────────────────────
// pc-people.jsx — VÁLLALAT: HR + Jelenlét
// ──────────────────────────────────────────────────────────────────────────
function HrScreen() {
  const s = window.useSim();
  const emps = s.state.employees;
  const grades = s.payGrades();
  const st = s.hrStats();
  const statusTone = { aktiv: 'sage', tappenz: 'amber', szabadsag: 'slate' };
  const statusLabel = { aktiv: 'Aktív', tappenz: 'Táppénzen', szabadsag: 'Szabadságon' };

  return (
    <div className="world">
      <WorldHead kicker="Vállalat" title="HR · Dolgozók" sub="Csapat-törzs, bér-kategóriák, státusz" />
      <StatRow>
        <Stat label="Létszám" value={st.total} sub={st.active + ' aktív'} />
        <Stat label="Távollévő" value={st.absent} sub="táppénz / szabadság" tone={st.absent ? 'amber' : 'slate'} />
        <Stat label="Becsült havi bér" value={fmtFt(st.monthlyCost)} sub="terhelt, 22 munkanap" />
        <Stat label="Bér-kategóriák" value={Object.keys(grades).length} sub="szint" />
      </StatRow>

      <Panel title="Csapat" pad={false}>
        <Table cols={[{ label: 'Név' }, { label: 'Szerepkör' }, { label: 'Bér-kategória' }, { label: 'Óradíj', align: 'right' }, { label: 'Belépett' }, { label: 'Státusz', align: 'right' }]}>
          {emps.map(function (e) {
            const g = grades[e.grade];
            return (
              <tr key={e.id}>
                <td><span className="td-prod"><Avatar name={e.name} size={30} /> <span><strong>{e.name}</strong><div className="muted-sm">{e.phone}</div></span></span></td>
                <td>{e.role}</td>
                <td>{g.label}</td>
                <td className="num">{fmtFt(g.rate)}/ó</td>
                <td className="muted">{e.hired}</td>
                <td style={{ textAlign: 'right' }}><Pill tone={statusTone[e.status]} small>{statusLabel[e.status]}</Pill></td>
              </tr>
            );
          })}
        </Table>
      </Panel>
      <div className="foot-note">A dolgozói törzs a HR „egyetlen igazságforrása" — a Jelenlét, a bérköltség és a kontrolling munka-óradíja mind innen hivatkozik (név/bér-kategória szerint), nincs duplikáció.</div>
    </div>
  );
}
window.HrScreen = HrScreen;

// ── JELENLÉT ────────────────────────────────────────────────────────────────
function AttendanceScreen() {
  const s = window.useSim();
  const att = s.state.attendance;
  const stt = s.attStats();
  const attFlow = { bejelentkezve: 'sage', kijelentkezve: 'slate', jovahagyva: 'crust' };
  const attLabel = { bejelentkezve: 'Bent', kijelentkezve: 'Kijelentkezett', jovahagyva: 'Jóváhagyva' };
  const typeLabel = { munka: 'Munka', tullora: 'Túlóra', keszenlet: 'Készenlét' };

  return (
    <div className="world">
      <WorldHead kicker="Vállalat" title="Jelenlét" sub="Mai műszak — hajnali kezdés 02:00-tól" />
      <StatRow>
        <Stat label="Jelen lévő" value={stt.present} sub="bejelentkezve" tone="sage" />
        <Stat label="Ledolgozott óra" value={Math.round(stt.hours * 10) / 10 + ' ó'} sub="mai műszak" />
        <Stat label="Túlóra" value={Math.round(stt.overtime * 10) / 10 + ' ó'} tone={stt.overtime ? 'amber' : 'slate'} />
        <Stat label="Mai bérköltség" value={fmtFt(stt.cost)} sub="túlóra ×1,5" />
      </StatRow>

      <Panel title="Mai jelenléti ív" pad={false}>
        <Table cols={[{ label: 'Dolgozó' }, { label: 'Be' }, { label: 'Ki' }, { label: 'Típus' }, { label: 'Óra', align: 'right' }, { label: 'Státusz', align: 'right' }, { label: '', w: 120 }]}>
          {att.map(function (a) {
            const emp = s.empById(a.empId);
            const h = s.attHours(a);
            return (
              <tr key={a.id}>
                <td><span className="td-prod"><Avatar name={emp ? emp.name : '?'} size={28} /> {emp ? emp.name : a.empId}</span></td>
                <td className="mono">{a.in}</td>
                <td className="mono muted">{a.out || '—'}</td>
                <td>{typeLabel[a.type]}</td>
                <td className="num">{Math.round(h * 10) / 10} ó</td>
                <td style={{ textAlign: 'right' }}><Pill tone={attFlow[a.status]} small>{attLabel[a.status]}</Pill></td>
                <td>{a.status === 'bejelentkezve' ? <Btn small kind="ghost" onClick={function () { s.clockOut(a.id); }}>Kiléptetés</Btn> : null}</td>
              </tr>
            );
          })}
        </Table>
      </Panel>
      <div className="foot-note">A jelenlét tény-adatát a kontrolling is fogyasztja (mai bérköltség). A bér-kategória óradíja a HR-törzsből jön — ugyanaz a kereszt-modul minta, mint az asztalos rendszerben.</div>
    </div>
  );
}
window.AttendanceScreen = AttendanceScreen;

// ── PÉNZÜGY ─────────────────────────────────────────────────────────────────
function FinanceScreen() {
  const s = window.useSim();
  const inv = s.state.finInvoices;
  const fin = s.finStats();
  const flow = s.flows.invoice;
  const [tab, setTab] = useStateP('out');
  const today = new Date('2026-06-15');
  const list = inv.filter(function (i) { return i.dir === tab; });

  return (
    <div className="world">
      <WorldHead kicker="Vállalat" title="Pénzügy" sub="Kimenő és bejövő számlák, kintlévőség, lejárat" />
      <StatRow>
        <Stat label="Kintlévőség" value={fmtFt(fin.receivable)} sub="kiállított, nyitott" tone="crust" />
        <Stat label="Ebből lejárt" value={fmtFt(fin.overdue)} sub={fin.overdueCount + ' számla'} tone={fin.overdueCount ? 'ember' : 'slate'} />
        <Stat label="Szállítói tartozás" value={fmtFt(fin.payable)} sub="bejövő, nyitott" tone="amber" />
        <Stat label="Befolyt (out)" value={fmtFt(fin.paidIn)} sub="kifizetve" tone="sage" />
      </StatRow>

      <div className="seg">
        <button className={'seg-btn' + (tab === 'out' ? ' on' : '')} onClick={function () { setTab('out'); }}>Kimenő számlák</button>
        <button className={'seg-btn' + (tab === 'in' ? ' on' : '')} onClick={function () { setTab('in'); }}>Bejövő számlák</button>
      </div>

      <Panel pad={false}>
        <Table cols={[{ label: 'Partner' }, { label: 'Számlaszám' }, { label: 'Nettó', align: 'right' }, { label: 'Bruttó', align: 'right' }, { label: 'Fizetési hat.' }, { label: 'Státusz' }, { label: '', w: 150 }]}>
          {list.map(function (i) {
            const overdue = i.status === 'kiallitva' && new Date(i.due) < today;
            const nextSt = flow.next(i.status);
            return (
              <tr key={i.id}>
                <td><strong>{i.partner}</strong></td>
                <td className="mono muted">{i.no}</td>
                <td className="num muted">{fmtFt(i.net)}</td>
                <td className="num">{fmtFt(Math.round(fin.gross(i)))}</td>
                <td className={overdue ? 'overdue' : 'muted'}>{i.due}{overdue ? ' · lejárt' : ''}</td>
                <td><StatusPill flow={flow} status={i.status} small /></td>
                <td>{nextSt ? <Btn small kind={i.dir === 'in' ? 'ghost' : 'primary'} onClick={function () { s.invoiceAdvance(i.id); }}>{i.dir === 'in' && i.status === 'piszkozat' ? 'Befogadás' : '→ ' + flow.label(nextSt)}</Btn> : null}</td>
              </tr>
            );
          })}
        </Table>
      </Panel>
      <div className="foot-note">A számla-FSM (Piszkozat → Kiállítva → Kifizetve) ugyanaz a közös státusz-motor; bejövőnél a „Kiállítás" felirat „Befogadás" — adapter-szintű címke, nem új logika.</div>
    </div>
  );
}
window.FinanceScreen = FinanceScreen;
