// ─────────────────────────────────────────────────────────────────
// page-hr.jsx — HR / MUNKAERŐ-KAPACITÁS világ (1/2)
//   Áttekintés (kapacitás KPI + mai jelenlét + figyelmeztetések + nyitott
//   kérelmek), Dolgozói lista, Kapacitás-naptár (dolgozó-soros heti rács,
//   túlterhelés piros kerettel). A dolgozó-profil SlideOver, Távollét-kezelő,
//   Készség-mátrix és a sheetek a page-hr-2.jsx-ben.
//   Store: window.sim.employees / absences / assignments / timeLogs + HrEngine.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateHR, useMemo: useMemoHR } = React;

const HR_TODAY = "2026-04-28";
const hrDOW = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];
const hrHuf = (n) => (Math.round(n || 0)).toLocaleString("hu-HU") + " Ft";
const hrHufK = (n) => Math.round((n || 0) / 1000).toLocaleString("hu-HU") + " e";

// ── Avatar ───────────────────────────────────────────────────────
function Avatar({ emp, size = 34 }) {
  if (!emp) return null;
  return (
    <span className="inline-grid place-items-center rounded-full text-white font-semibold shrink-0"
      style={{ width: size, height: size, background: emp.color || "#0d9488", fontSize: size * 0.38 }}>
      {emp.initials}
    </span>
  );
}

// ── Pill-ek ──────────────────────────────────────────────────────
function DeptPill({ dept, size = "md" }) {
  const m = (window.HR_DEPTS || {})[dept] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${m.pill || "bg-stone-100 text-stone-600 border-stone-200"}`}><Icon name={m.icon || "user"} size={size === "sm" ? 10 : 12} />{m.label || dept}</span>;
}
function PayPill({ grade }) {
  const m = (window.HR_PAY_GRADES || {})[grade] || {};
  return <span className="inline-flex items-center gap-1 rounded-full border px-2 h-6 text-[11px] font-medium bg-stone-50 text-stone-600 border-stone-200">{m.label || grade}<span className="text-stone-400">· {(m.rate || 0).toLocaleString("hu-HU")} Ft/ó</span></span>;
}
function SkillChip({ sk, size = "md" }) {
  const m = (window.HR_SKILLS || {})[sk.key] || {};
  const lv = (window.HR_SKILL_LEVELS || {})[sk.level] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${lv.pill}`}>{m.label || sk.key}<span className="opacity-60">·{lv.short}</span></span>;
}
function AbsStatusPill({ status, size = "md" }) {
  const m = (window.ABS_STATUS || {})[status] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${m.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label || status}</span>;
}
function AbsTypeBadge({ type }) {
  const m = (window.ABS_TYPE_META || {})[type] || {};
  return <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: m.accent }}><Icon name={m.icon || "calendar"} size={12} />{m.label || type}</span>;
}

// kapacitás-kihasználtság sáv (lekötött / kapacitás), túl 100% → piros túlnyúlás
function UtilBar({ util }) {
  const u = Math.max(0, util || 0);
  const fill = Math.min(100, u * 100);
  const over = u > 1;
  const tone = over ? "bg-rose-500" : u > 0.85 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
      <div className={`h-full ${tone}`} style={{ width: fill + "%" }} />
    </div>
  );
}

// ── Detail host (SlideOver) — a tartalom a page-hr-2.jsx-ben (EmployeeDetail) ──
function HrDetailHost({ openId, onClose }) {
  const sim = useSim();
  const SO = window.SlideOver;
  const emp = openId ? window.sim.findEmployee(openId) : null;
  if (!SO) return null;
  return (
    <SO open={!!emp} onClose={onClose} title={emp ? emp.name : ""} subtitle={emp ? emp.role : ""} width={620}>
      {emp && window.EmployeeDetail ? <window.EmployeeDetail emp={emp} /> : null}
    </SO>
  );
}

// ── Áttekintés ───────────────────────────────────────────────────
function HrDashboard({ onScreen }) {
  const sim = useSim();
  const [openId, setOpenId] = useStateHR(null);
  const emps = window.sim.employeeList();
  const E = window.HrEngine;
  const monday = E.mondayOf(HR_TODAY);

  const week = emps.map((e) => ({ emp: e, w: window.sim.hrWeekSummary(e.id, monday) }));
  const totals = week.reduce((a, x) => ({ cap: a.cap + x.w.capacity, load: a.load + x.w.load }), { cap: 0, load: 0 });
  const util = totals.cap > 0 ? totals.load / totals.cap : 0;

  const presence = window.sim.hrPresenceToday();
  const att = window.sim.hrAttendanceToday ? window.sim.hrAttendanceToday() : null;
  const overSet = window.sim.hrOverloadSet(14);
  const overEmps = emps.filter((e) => Object.keys(overSet).some((k) => k.startsWith(e.id + "|")));
  const openReqs = (sim.absences || []).filter((a) => a.status === "kert");
  const canManage = window.sim.hasPerm("hr.manage");

  const KPI = ({ label, value, sub, tone }) => (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">{label}</div>
      <div className={`text-[22px] font-semibold leading-none mt-1.5 ${tone === "rose" ? "text-rose-700" : tone === "emerald" ? "text-emerald-700" : "text-stone-900"}`}>{value}</div>
      {sub && <div className="text-[10.5px] text-stone-400 mt-1">{sub}</div>}
    </div>
  );

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">HR / Kapacitás</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Munkaerő-kapacitás, jelenlét és távollét — aktuális hét ({monday})</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Létszám" value={emps.length + " fő"} sub={`${presence.present.length} bent · ${presence.absent.length} távol ma`} />
        <KPI label="Heti kapacitás" value={Math.round(totals.cap) + " ó"} sub={`${emps.length} dolgozó · 5 munkanap`} />
        <KPI label="Lekötött" value={Math.round(totals.load) + " ó"} sub={`Szabad: ${Math.round(totals.cap - totals.load)} ó`} />
        <KPI label="Kihasználtság" value={Math.round(util * 100) + "%"} sub={overEmps.length ? `${overEmps.length} túlterhelt dolgozó` : "nincs túlterhelés"} tone={util > 1 ? "rose" : "emerald"} />
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-4">
        {/* mai jelenlét */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12.5px] font-semibold text-stone-800">Mai jelenlét</span>
            <span className="text-[11px] text-stone-400">{HR_TODAY}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: (presence.present.length / Math.max(1, emps.length) * 100) + "%" }} />
            </div>
            <span className="text-[11.5px] text-stone-500 tabular-nums shrink-0">{presence.present.length}/{emps.length} bent</span>
          </div>
          {presence.absent.length ? (
            <div className="space-y-1.5">
              <div className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium">Ma távol</div>
              {presence.absent.map(({ emp, absence }) => (
                <button key={emp.id} onClick={() => setOpenId(emp.id)} className="w-full flex items-center gap-2.5 text-left hover:bg-stone-50/70 rounded-lg px-1 py-1">
                  <Avatar emp={emp} size={28} />
                  <div className="min-w-0 flex-1"><div className="text-[12px] font-medium text-stone-800 truncate">{emp.name}</div><div className="text-[10.5px] text-stone-400 truncate">{emp.role}</div></div>
                  <AbsTypeBadge type={absence.type} />
                </button>
              ))}
            </div>
          ) : <div className="text-[12px] text-stone-400">Mindenki bent van ma.</div>}
          {att && (
            <div className="mt-3 pt-3 border-t border-stone-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium">Jelenlét-modul ma</span>
                <button onClick={() => window.navigateTo && window.navigateTo("attendance", "terminal")} className="text-[11px] text-orange-600 font-medium inline-flex items-center gap-1">Jelenlét <Icon name="external" size={11} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-[10px] text-stone-400">Bejelentkezve</div><div className="text-[14px] font-semibold text-stone-800">{att.count} fő</div></div>
                <div><div className="text-[10px] text-stone-400">Ledolgozott ó</div><div className="text-[14px] font-semibold text-stone-800">{att.hours}{att.overtime ? <span className="text-[10px] text-amber-600"> +{att.overtime} tú</span> : ""}</div></div>
                <div><div className="text-[10px] text-stone-400">Bérköltség</div><div className="text-[14px] font-semibold text-emerald-700">{hrHufK(att.cost)} Ft</div></div>
              </div>
              <div className="text-[9.5px] text-stone-400 mt-1.5">A jelenlét-modul be-/kijelentkezéseiből számítva (AttEngine).</div>
            </div>
          )}
        </div>

        {/* kapacitás-figyelmeztetés */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12.5px] font-semibold text-stone-800">Túlterhelés — 2 hét</span>
            <button onClick={() => onScreen && onScreen("capacity")} className="text-[11.5px] text-amber-700 font-medium inline-flex items-center gap-1">Naptár <Icon name="chevron" size={13} /></button>
          </div>
          {overEmps.length ? (
            <div className="space-y-1.5">
              {overEmps.map((e) => {
                const days = Object.keys(overSet).filter((k) => k.startsWith(e.id + "|")).map((k) => k.split("|")[1]);
                return (
                  <button key={e.id} onClick={() => setOpenId(e.id)} className="w-full flex items-center gap-2.5 text-left hover:bg-stone-50/70 rounded-lg px-1 py-1">
                    <Avatar emp={e} size={28} />
                    <div className="min-w-0 flex-1"><div className="text-[12px] font-medium text-stone-800 truncate">{e.name}</div><div className="text-[10.5px] text-stone-400 truncate">{days.length} nap túllépés</div></div>
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-rose-600"><Icon name="alert" size={12} />túlterhelt</span>
                  </button>
                );
              })}
            </div>
          ) : <div className="text-[12px] text-stone-400">Nincs túlterhelt dolgozó a következő 2 hétben.</div>}
        </div>
      </div>

      {/* nyitott távollét-kérelmek */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-stone-800">Nyitott távollét-kérelmek{openReqs.length ? ` (${openReqs.length})` : ""}</span>
          <button onClick={() => onScreen && onScreen("absence")} className="text-[11.5px] text-amber-700 font-medium inline-flex items-center gap-1">Mind <Icon name="chevron" size={13} /></button>
        </div>
        {openReqs.length ? openReqs.map((a) => {
          const emp = window.sim.findEmployee(a.empId);
          return (
            <div key={a.id} className="px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3">
              <Avatar emp={emp} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="text-[12.5px] font-semibold text-stone-900 truncate">{emp ? emp.name : ""}</span><AbsTypeBadge type={a.type} /></div>
                <div className="text-[10.5px] text-stone-400 truncate">{a.start} – {a.end} · {a.days} munkanap{a.reason ? " · " + a.reason : ""}</div>
              </div>
              {canManage ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => window.sim.setAbsenceStatus(a.id, "jovahagyva")} className="h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-[11.5px] font-medium inline-flex items-center gap-1"><Icon name="check" size={13} />Jóvá</button>
                  <button onClick={() => { const r = prompt("Elutasítás indoka:"); if (r && r.trim()) window.sim.setAbsenceStatus(a.id, "elutasitva", { reason: r }); }} className="h-8 px-2.5 rounded-lg border border-stone-200 text-stone-600 text-[11.5px] font-medium">Elutasít</button>
                </div>
              ) : <span className="inline-flex items-center gap-1 text-[10.5px] text-stone-400"><Icon name="lock" size={11} />jóváhagyó kell</span>}
            </div>
          );
        }) : <div className="px-4 py-8 text-center text-[12px] text-stone-400">Nincs nyitott kérelem.</div>}
      </div>

      <HrDetailHost openId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

// ── Dolgozói lista ───────────────────────────────────────────────
function HrPeople() {
  const sim = useSim();
  const [openId, setOpenId] = useStateHR(null);
  const [dept, setDept] = useStateHR("all");
  const [q, setQ] = useStateHR("");
  const [addOpen, setAddOpen] = useStateHR(false);
  const E = window.HrEngine;
  const monday = E.mondayOf(HR_TODAY);
  const emps = window.sim.employeeList()
    .filter((e) => dept === "all" || e.dept === dept)
    .filter((e) => !q.trim() || (e.name + " " + e.role).toLowerCase().includes(q.toLowerCase()));
  const DEPTS = window.HR_DEPT_ORDER || [];
  const canManage = window.sim.hasPerm("hr.manage");

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Dolgozók</h1>
        {canManage && <button onClick={() => setAddOpen(true)} className="h-9 px-3 rounded-lg bg-amber-600 text-white text-[12.5px] font-medium inline-flex items-center gap-1.5"><Icon name="plus" size={15} />Új dolgozó</button>}
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"><Icon name="search" size={15} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés név / szerep…" className="w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-amber-500" />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          <button onClick={() => setDept("all")} className={`h-8 px-2.5 rounded-lg text-[11.5px] font-medium shrink-0 border ${dept === "all" ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200"}`}>Összes</button>
          {DEPTS.map((d) => { const m = window.HR_DEPTS[d]; return (
            <button key={d} onClick={() => setDept(d)} className={`h-8 px-2.5 rounded-lg text-[11.5px] font-medium shrink-0 border ${dept === d ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200"}`}>{m.label}</button>
          ); })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {emps.map((e) => {
          const w = window.sim.hrWeekSummary(e.id, monday);
          return (
            <button key={e.id} onClick={() => setOpenId(e.id)} className="w-full text-left px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3">
              <Avatar emp={e} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="text-[13px] font-semibold text-stone-900 truncate">{e.name}</span>{e.employment === "part" && <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 shrink-0">részmunka</span>}</div>
                <div className="text-[11px] text-stone-500 truncate">{e.role}</div>
                <div className="hidden sm:flex items-center gap-1.5 mt-1.5">{(e.skills || []).slice(0, 3).map((sk) => <SkillChip key={sk.key} sk={sk} size="sm" />)}</div>
              </div>
              <div className="shrink-0 w-[130px] hidden md:block">
                <div className="flex items-center justify-between mb-1"><span className="text-[10px] text-stone-400">heti terhelés</span><span className="text-[10.5px] tabular-nums text-stone-600">{Math.round(w.load)}/{Math.round(w.capacity)} ó</span></div>
                <UtilBar util={w.util} />
              </div>
              <DeptPill dept={e.dept} size="sm" />
              <Icon name="chevron" size={15} className="text-stone-300 shrink-0" />
            </button>
          );
        })}
        {!emps.length && <div className="px-4 py-10 text-center text-[12px] text-stone-400">Nincs találat.</div>}
      </div>

      <HrDetailHost openId={openId} onClose={() => setOpenId(null)} />
      {addOpen && window.NewEmployeeSheet && <window.NewEmployeeSheet onClose={() => setAddOpen(false)} />}
    </div>
  );
}

// ── Kapacitás-naptár — dolgozó-soros heti rács (túlterhelés piros kerettel) ──
function HrCapacity() {
  const sim = useSim();
  const [openId, setOpenId] = useStateHR(null);
  const E = window.HrEngine;
  const emps = window.sim.employeeList();

  // 14 nap a mai naptól
  const start = E.parse(HR_TODAY);
  const days = [];
  for (let i = 0; i < 14; i++) days.push(new Date(start.getTime() + i * 86400000));

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">
      <div className="mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Kapacitás-naptár</h1>
        <p className="text-[12.5px] text-stone-500 mt-0.5">2 hét · dolgozónkénti napi terhelés · a túlterhelt (kapacitás feletti) napok piros kerettel</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[940px]">
            {/* fejléc — napok */}
            <div className="grid border-b border-stone-100 bg-stone-50/60" style={{ gridTemplateColumns: "180px repeat(14, 1fr)" }}>
              <div className="px-3 py-2 text-[10px] uppercase tracking-wide text-stone-400 font-medium">Dolgozó</div>
              {days.map((d, i) => {
                const isToday = E.fmt(d) === HR_TODAY;
                const wknd = !E.isWorkday(d);
                return <div key={i} className={`px-1 py-2 text-center border-l border-stone-100 ${isToday ? "bg-amber-50" : wknd ? "bg-stone-50" : ""}`}>
                  <div className="text-[9px] text-stone-400">{hrDOW[d.getDay()]}</div>
                  <div className={`text-[10px] font-mono ${isToday ? "text-amber-700 font-semibold" : "text-stone-500"}`}>{d.getMonth() + 1}.{d.getDate()}</div>
                </div>;
              })}
            </div>
            {/* sorok */}
            {emps.map((e) => (
              <div key={e.id} className="grid border-b border-stone-100 last:border-0" style={{ gridTemplateColumns: "180px repeat(14, 1fr)" }}>
                <button onClick={() => setOpenId(e.id)} className="px-3 py-2 min-w-0 text-left hover:bg-stone-50/70 flex items-center gap-2">
                  <Avatar emp={e} size={26} />
                  <div className="min-w-0"><div className="text-[11.5px] font-semibold text-stone-800 truncate">{e.name}</div><div className="text-[9.5px] text-stone-400 truncate">{Math.round(E.dayCapacity(e))} ó/nap</div></div>
                </button>
                {days.map((d, i) => {
                  const ds = E.fmt(d);
                  const load = window.sim.hrDayLoad(e.id, ds);
                  const wknd = !E.isWorkday(d);
                  return (
                    <div key={i} className={`border-l border-stone-100 p-0.5 min-h-[40px] grid place-items-center ${wknd ? "bg-stone-50/60" : ""}`}>
                      {load.absence ? (
                        <span className="w-full h-full rounded grid place-items-center text-[8.5px] font-medium" style={{ background: (window.ABS_TYPE_META[load.absence.type] || {}).accent + "1a", color: (window.ABS_TYPE_META[load.absence.type] || {}).accent }} title={(window.ABS_TYPE_META[load.absence.type] || {}).label}>táv</span>
                      ) : (!wknd && load.capacity > 0) ? (
                        <button onClick={() => setOpenId(e.id)} className={`w-full rounded px-1 py-1 grid place-items-center ${load.over ? "ring-1 ring-rose-400 bg-rose-50" : load.load === 0 ? "bg-stone-50" : load.load / load.capacity > 0.85 ? "bg-amber-50" : "bg-emerald-50"}`} title={`${load.load} / ${load.capacity} ó`}>
                          <span className={`text-[10px] font-semibold tabular-nums ${load.over ? "text-rose-600" : load.load === 0 ? "text-stone-300" : load.load / load.capacity > 0.85 ? "text-amber-700" : "text-emerald-700"}`}>{load.load || "·"}</span>
                        </button>
                      ) : <span className="text-[9px] text-stone-300">—</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap mt-3 text-[11px] text-stone-500">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200" />szabad kapacitás</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />közel tele (&gt;85%)</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-50 ring-1 ring-rose-400" />túlterhelt</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: "#0d948822" }} />távollét</span>
        <span className="text-stone-400">A szám = aznap lekötött óra (projekt-beosztás + fuvar-beosztás).</span>
      </div>

      <HrDetailHost openId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

Object.assign(window, {
  Avatar, DeptPill, PayPill, SkillChip, AbsStatusPill, AbsTypeBadge, UtilBar, HrDetailHost,
  HrDashboard, HrPeople, HrCapacity,
  HR_TODAY, hrDOW, hrHuf, hrHufK,
});
