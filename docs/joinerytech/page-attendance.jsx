// ─────────────────────────────────────────────────────────────────
// page-attendance.jsx — IDŐ & JELENLÉT világ (Time & Attendance)
//   Áttekintés (KPI: jelen lévők / óra / túlóra / bérköltség + jóváhagyásra
//   várók) + Terminál (be-/kijelentkezés, tablet-first) + Jelenléti ív
//   (dolgozónként, jóváhagyás-FSM). A DOLGOZÓ = HR (sim.employees), ide csak
//   hivatkozunk. Store: window.sim.attendance + akciók; AttEngine.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateA } = React;

const ATT_NOW_MIN = 14 * 60 + 30; // demó „most" (14:30) a folyamatban lévő órák becsléséhez
const attEmpById = (sim, id) => (sim.employees || []).find((e) => e.id === id) || { name: id, initials: "?", color: "#78716c", payGrade: "szakmunkas" };
const attFt = (n) => { n = Math.round(Number(n) || 0); return n.toLocaleString("hu-HU") + " Ft"; };

function AttAvatar({ emp, size = 34 }) {
  return <div className="rounded-full grid place-items-center text-white font-semibold shrink-0" style={{ width: size, height: size, background: emp.color || "#78716c", fontSize: size * 0.36 }}>{emp.initials || "?"}</div>;
}
function AttStatusPill({ status, size = "md" }) {
  const t = (window.ATT_STATUS || {})[status] || { label: status, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}
function AttTypeBadge({ type, size = "sm" }) {
  const m = (window.ATT_TYPE_META || {})[type] || {};
  if (type === "munka") return null;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-md border font-medium ${cls} ${m.pill}`}><Icon name={m.icon || "clock"} size={11} />{m.short || type}</span>;
}
const attHoursLabel = (h) => h == null ? "—" : `${h.toFixed(1).replace(".", ",")} ó`;

// ── Áttekintés ───────────────────────────────────────────────────
function AttendanceDashboard({ onScreen }) {
  const sim = useSim();
  const E = window.AttEngine;
  const today = sim.today || window.ATT_TODAY;
  const todays = (sim.attendance || []).filter((e) => e.date === today);
  const [openEmp, setOpenEmp] = useStateA(null);
  const [otOpen, setOtOpen] = useStateA(false);
  const sum = E ? E.summary(todays, (id) => attEmpById(sim, id), { nowMin: ATT_NOW_MIN }) : { present: 0, hours: 0, overtime: 0, cost: 0 };
  const pending = (sim.attendance || []).filter((e) => e.status === "kijelentkezve");
  const present = todays.filter((e) => e.status === "bejelentkezve");

  const KPI = ({ label, value, sub, tone = "stone", icon }) => (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-center justify-between"><div className={`w-8 h-8 rounded-lg grid place-items-center bg-${tone}-50 text-${tone}-600`}><Icon name={icon} size={16} /></div><div className="text-[22px] font-semibold text-stone-900 leading-none">{value}</div></div>
      <div className="text-[12px] font-medium text-stone-700 mt-2.5">{label}</div>{sub && <div className="text-[10.5px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div><h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Idő & jelenlét</h1><p className="text-[12.5px] text-stone-500 mt-0.5">Napi jelenlét és bérköltség — {today}</p></div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setOtOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-stone-200 bg-white text-stone-700 text-[12.5px] font-medium hover:bg-stone-50"><Icon name="bolt" size={15} className="text-amber-500" />Túlóra elrendelése</button>
          <button onClick={() => onScreen && onScreen("terminal")} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[12.5px] font-medium"><Icon name="clock" size={15} />Terminál</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="Jelen van" value={sum.present} sub={`${todays.length} mai bejegyzés`} tone="orange" icon="user" />
        <KPI label="Ledolgozott óra ma" value={attHoursLabel(sum.hours)} sub="nettó (folyamatban becsült)" tone="sky" icon="clock" />
        <KPI label="Túlóra ma" value={attHoursLabel(sum.overtime)} sub="8 óra felett" tone="amber" icon="bolt" />
        <KPI label="Bérköltség ma" value={attFt(sum.cost)} sub="jelenlét alapján" tone="emerald" icon="receipt" />
      </div>

      {pending.length > 0 && (
        <button onClick={() => onScreen && onScreen("timesheet")} className="w-full mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3 text-left hover:bg-amber-100/60">
          <Icon name="clock" size={18} className="text-amber-600 shrink-0" /><div className="min-w-0 flex-1"><div className="text-[12.5px] font-semibold text-amber-800">{pending.length} bejegyzés jóváhagyásra vár</div><div className="text-[11px] text-amber-700/80 truncate">Jelenléti ív → jóváhagyás</div></div><Icon name="chevron" size={15} className="text-amber-400" />
        </button>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"><span className="text-[12.5px] font-semibold text-stone-800">Jelenleg bent ({present.length})</span><button onClick={() => onScreen && onScreen("terminal")} className="text-[11.5px] text-orange-600 font-medium inline-flex items-center gap-1">Terminál <Icon name="chevron" size={13} /></button></div>
        {present.length ? present.map((e) => { const emp = attEmpById(sim, e.empId); const h = E ? E.hours(e, ATT_NOW_MIN) : null; return (
          <div key={e.id} className="px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3">
            <AttAvatar emp={emp} />
            <div className="min-w-0 flex-1"><div className="text-[13px] font-semibold text-stone-900 truncate">{emp.name}</div><div className="text-[11px] text-stone-500 truncate">{emp.role || ""}{e.note ? ` · ${e.note}` : ""}</div></div>
            <div className="shrink-0 flex flex-col items-end gap-0.5"><div className="text-[12px] font-medium text-stone-700">{e.clockIn} → <span className="text-orange-600">most</span></div><div className="text-[10.5px] text-stone-400">{attHoursLabel(h)}<AttTypeBadge type={e.type} /></div></div>
          </div>
        ); }) : <div className="px-4 py-10 text-center text-[12.5px] text-stone-400">Jelenleg senki nincs bejelentkezve.</div>}
      </div>
      {otOpen && <OvertimeSheet onClose={() => setOtOpen(false)} />}
    </div>
  );
}

// ── Túlóra elrendelése (limit felett jóváhagyás-köteles — 4.8-B2) ──────────
function OvertimeSheet({ onClose }) {
  const sim = useSim();
  const emps = (sim.employees || []).filter((e) => e.active !== false);
  const [empId, setEmpId] = useStateA(emps[0] ? emps[0].id : "");
  const [hours, setHours] = useStateA(2);
  const [date, setDate] = useStateA(sim.today || window.ATT_TODAY);
  const [reason, setReason] = useStateA("");
  const limit = (sim.authConfig || {}).overtimeHours;
  const overLimit = limit != null && (Number(hours) || 0) > limit;
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-orange-500";
  const submit = () => { if (!empId) return; window.sim.orderOvertime({ empId, hours: Number(hours) || 0, date, reason }); onClose(); };
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[440px] md:rounded-2xl rounded-t-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between"><div className="text-[14px] font-semibold text-stone-900">Túlóra elrendelése</div><button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button></div>
        <div className="px-4 py-4 space-y-3.5">
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Dolgozó</label><select value={empId} onChange={(e) => setEmpId(e.target.value)} className={cls}>{emps.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.role || ""}</option>)}</select></div>
          <div className="flex items-center gap-2">
            <div className="flex-1"><label className="text-[10.5px] text-stone-500 block mb-1">Dátum</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cls} /></div>
            <div className="w-28"><label className="text-[10.5px] text-stone-500 block mb-1">Túlóra (ó)</label><input type="number" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} className={cls} /></div>
          </div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Indok</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Pl. sürgős határidős rendelés…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-orange-500" /></div>
          {overLimit
            ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11.5px] text-amber-800 flex items-center gap-2"><Icon name="alert" size={15} className="shrink-0" />A {hours} ó túlóra a {limit} ó-s limit felett van — <span className="font-medium">jóváhagyásra kerül</span> (Feladataim).</div>
            : <div className="text-[11px] text-stone-400">A {limit} ó-s napi túlóra-limit felett jóváhagyás szükséges (Beállítások → Hatáskörök).</div>}
          <button disabled={!empId} onClick={submit} className="w-full h-10 rounded-xl bg-orange-600 text-white text-[13px] font-semibold disabled:opacity-40">{overLimit ? "Jóváhagyásra küldés" : "Túlóra elrendelése"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Terminál (be-/kijelentkezés) ─────────────────────────────────
function AttendanceTerminal() {
  const sim = useSim();
  const E = window.AttEngine;
  const today = sim.today || window.ATT_TODAY;
  const emps = (sim.employees || []).filter((e) => e.active !== false);
  const todays = (sim.attendance || []).filter((e) => e.date === today);
  const openFor = (empId) => todays.find((e) => e.empId === empId && e.status === "bejelentkezve");
  const lastFor = (empId) => todays.find((e) => e.empId === empId);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900 mb-1">Terminál</h1>
      <p className="text-[12.5px] text-stone-500 mb-4">Koppints a kártyára a be- vagy kijelentkezéshez — {today}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {emps.map((emp) => {
          const open = openFor(emp.id), last = lastFor(emp.id);
          const inNow = !!open;
          const h = open && E ? E.hours(open, ATT_NOW_MIN) : null;
          return (
            <div key={emp.id} className={`rounded-2xl border p-3.5 flex flex-col ${inNow ? "border-orange-300 bg-orange-50/40" : "border-stone-200 bg-white"}`}>
              <div className="flex items-center gap-2.5 mb-3"><AttAvatar emp={emp} size={40} /><div className="min-w-0"><div className="text-[13px] font-semibold text-stone-900 truncate">{emp.name}</div><div className="text-[10.5px] text-stone-500 truncate">{emp.role || ""}</div></div></div>
              <div className="flex-1 mb-3">
                {inNow ? <div className="text-[11.5px] text-stone-600">Bejelentkezve: <span className="font-semibold text-stone-900">{open.clockIn}</span> · {attHoursLabel(h)}</div>
                  : last ? <div className="text-[11.5px] text-stone-400">Ma: {last.clockIn}–{last.clockOut || "?"} · <AttStatusPill status={last.status} size="sm" /></div>
                  : <div className="text-[11.5px] text-stone-400">Ma még nem dolgozott.</div>}
              </div>
              {inNow
                ? <button onClick={() => window.sim.clockOut(open.id)} className="w-full h-10 rounded-xl bg-stone-800 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-stone-900"><Icon name="logout" size={15} />Kijelentkezés</button>
                : <button onClick={() => window.sim.clockIn(emp.id)} className="w-full h-10 rounded-xl bg-orange-600 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-orange-700"><Icon name="clock" size={15} />Bejelentkezés</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Jelenléti ív (jóváhagyás-FSM) ────────────────────────────────
function AttendanceTimesheet() {
  const sim = useSim();
  const E = window.AttEngine;
  const canApprove = window.sim.hasPerm && window.sim.hasPerm("attendance.manage");
  const [empF, setEmpF] = useStateA("all");
  const emps = (sim.employees || []).filter((e) => e.active !== false);
  let entries = (sim.attendance || []).slice();
  if (empF !== "all") entries = entries.filter((e) => e.empId === empF);
  // csoportosítás dátum szerint (csökkenő)
  const dates = Array.from(new Set(entries.map((e) => e.date))).sort((a, b) => b.localeCompare(a));

  const Row = ({ e }) => {
    const emp = attEmpById(sim, e.empId);
    const h = E ? E.hours(e, ATT_NOW_MIN) : null;
    const ot = E ? E.overtime(e, ATT_NOW_MIN) : 0;
    const cost = E ? E.cost(e, emp, ATT_NOW_MIN) : 0;
    const pending = e.status === "kijelentkezve";
    return (
      <div className="px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3">
        <AttAvatar emp={emp} size={30} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap"><span className="text-[12.5px] font-semibold text-stone-900 truncate">{emp.name}</span><AttTypeBadge type={e.type} /></div>
          <div className="text-[11px] text-stone-500 truncate mt-0.5">{e.clockIn}–{e.clockOut || (e.status === "bejelentkezve" ? "most" : "?")} · {attHoursLabel(h)}{ot > 0 ? ` · +${ot.toFixed(1).replace(".", ",")}ó túlóra` : ""} · {attFt(cost)}{e.note ? ` · ${e.note}` : ""}</div>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {pending && canApprove ? (
            <>
              <button onClick={() => window.sim.setAttStatus(e.id, "jovahagyva")} className="h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-[11.5px] font-medium inline-flex items-center gap-1"><Icon name="check" size={13} />Jóváhagy</button>
              <button onClick={() => window.sim.setAttStatus(e.id, "elutasitva", { reason: "Pontosítás szükséges" })} className="h-8 px-2 rounded-lg border border-stone-200 text-stone-500 text-[11.5px] font-medium hover:bg-stone-50"><Icon name="x" size={13} /></button>
            </>
          ) : <AttStatusPill status={e.status} size="sm" />}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Jelenléti ív</h1>
        <select value={empF} onChange={(e) => setEmpF(e.target.value)} className="h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-orange-500 max-w-[180px]"><option value="all">Minden dolgozó</option>{emps.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
      </div>
      {!canApprove && <div className="mb-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[11.5px] text-stone-500 inline-flex items-center gap-1.5"><Icon name="lock" size={13} />A jóváhagyáshoz <span className="font-medium">attendance.manage</span> jog kell.</div>}
      {dates.map((d) => {
        const dayEntries = entries.filter((e) => e.date === d);
        const sum = E ? E.summary(dayEntries, (id) => attEmpById(sim, id), { nowMin: ATT_NOW_MIN }) : { hours: 0, cost: 0 };
        return (
          <div key={d} className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-3">
            <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"><span className="text-[12.5px] font-semibold text-stone-800 inline-flex items-center gap-1.5"><Icon name="calendar" size={14} className="text-stone-400" />{d}</span><span className="text-[11px] text-stone-500">{attHoursLabel(sum.hours)} · {attFt(sum.cost)}</span></div>
            {dayEntries.map((e) => <Row key={e.id} e={e} />)}
          </div>
        );
      })}
      {!dates.length && <div className="bg-white rounded-2xl border border-stone-200 px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs bejegyzés.</div>}
    </div>
  );
}

Object.assign(window, { AttAvatar, AttStatusPill, AttTypeBadge, AttendanceDashboard, AttendanceTerminal, AttendanceTimesheet, OvertimeSheet });
