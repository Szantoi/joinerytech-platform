// ─────────────────────────────────────────────────────────────────
// page-hr-2.jsx — HR / MUNKAERŐ-KAPACITÁS világ (2/2)
//   EmployeeDetail (profil SlideOver: kapacitás + készségek + beosztások +
//   távollétek + munkaóra-napló → Kontrolling), Távollét-kezelő (FSM),
//   Készség-mátrix, és a sheetek (új dolgozó / új távollét).
// ─────────────────────────────────────────────────────────────────
const { useState: useStateH2 } = React;

const h2cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-amber-500";
const h2facName = (id) => ((window.FACILITIES || []).find((f) => f.id === id) || {}).name || "—";

// ── Dolgozó-profil (SlideOver tartalom) ──────────────────────────
function EmployeeDetail({ emp }) {
  const sim = useSim();
  const E = window.HrEngine;
  const monday = E.mondayOf(window.HR_TODAY);
  const w = window.sim.hrWeekSummary(emp.id, monday);
  const canManage = window.sim.hasPerm("hr.manage");
  const [tab, setTab] = useStateH2("kapacitas");

  const asgs = window.sim.assignmentsForEmployee(emp.id);
  const abss = window.sim.absencesForEmployee(emp.id);
  const logs = window.sim.timeLogsForEmployee(emp.id);
  const crews = (sim.crews || []).filter((c) => (c.memberIds || []).includes(emp.id));

  const TABS = [["kapacitas", "Kapacitás"], ["szabadsag", "Szabadság"], ["szemelyes", "Személyes"], ["keszsegek", "Készségek"], ["naplo", "Munkaóra"]];

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      {/* fej */}
      <div className="flex items-center gap-3">
        <window.Avatar emp={emp} size={48} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-stone-900">{emp.name}</div>
          <div className="text-[12px] text-stone-500">{emp.role}</div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap"><window.DeptPill dept={emp.dept} size="sm" />{emp.employment === "part" && <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200">részmunka</span>}</div>
        </div>
      </div>

      {/* adatok */}
      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <div className="rounded-lg border border-stone-200 px-3 py-2"><div className="text-[10px] text-stone-400">Telephely</div><div className="text-stone-800 font-medium truncate">{h2facName(emp.facilityId)}</div></div>
        <div className="rounded-lg border border-stone-200 px-3 py-2"><div className="text-[10px] text-stone-400">Bér-kategória</div><div className="text-stone-800 font-medium">{(window.HR_PAY_GRADES[emp.payGrade] || {}).label} · {window.sim.hrRate(emp).toLocaleString("hu-HU")} Ft/ó</div></div>
        <div className="rounded-lg border border-stone-200 px-3 py-2"><div className="text-[10px] text-stone-400">Heti óra</div><div className="text-stone-800 font-medium">{emp.weeklyHours} ó ({E.dayCapacity(emp)} ó/nap)</div></div>
        <div className="rounded-lg border border-stone-200 px-3 py-2"><div className="text-[10px] text-stone-400">Belépés</div><div className="text-stone-800 font-medium">{emp.startedAt}</div></div>
        {(emp.personal && (emp.personal.children != null || emp.personal.maritalStatus)) && <div className="rounded-lg border border-stone-200 px-3 py-2 col-span-2"><div className="text-[10px] text-stone-400">Családi</div><div className="text-stone-800 font-medium">{(window.HR_MARITAL[emp.personal.maritalStatus] || {}).label || "—"}{emp.personal.children != null ? ` · ${emp.personal.children} gyermek` : ""}</div></div>}
        <div className="rounded-lg border border-stone-200 px-3 py-2 col-span-2"><div className="text-[10px] text-stone-400">Elérhetőség</div><div className="text-stone-700 truncate">{emp.phone} · {emp.email}</div></div>
        {crews.length > 0 && <div className="rounded-lg border border-sky-200 bg-sky-50/50 px-3 py-2 col-span-2"><div className="text-[10px] text-sky-600">Logisztika brigád</div><div className="text-sky-800 font-medium">{crews.map((c) => c.name).join(", ")}</div></div>}
      </div>

      {/* tabok */}
      <div className="flex items-center gap-1 border-b border-stone-100">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-[12px] font-medium border-b-2 -mb-px ${tab === k ? "border-amber-500 text-amber-700" : "border-transparent text-stone-500"}`}>{l}</button>)}
      </div>

      {tab === "kapacitas" && (
        <div className="space-y-4">
          {/* heti kapacitás */}
          <div className="rounded-xl border border-stone-200 p-3.5">
            <div className="flex items-center justify-between mb-2"><span className="text-[12px] font-semibold text-stone-800">Aktuális hét</span><span className="text-[11px] tabular-nums text-stone-500">{Math.round(w.load)} / {Math.round(w.capacity)} ó · {Math.round(w.util * 100)}%</span></div>
            <window.UtilBar util={w.util} />
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div><div className="text-[10px] text-stone-400">Szabad</div><div className="text-[13px] font-semibold text-emerald-700">{Math.round(w.free)} ó</div></div>
              <div><div className="text-[10px] text-stone-400">Túllépett nap</div><div className={`text-[13px] font-semibold ${w.overDays ? "text-rose-600" : "text-stone-700"}`}>{w.overDays}</div></div>
              <div><div className="text-[10px] text-stone-400">Távollét-nap</div><div className="text-[13px] font-semibold text-stone-700">{w.absDays}</div></div>
            </div>
          </div>

          {/* beosztások */}
          <div>
            <div className="flex items-center justify-between mb-2"><span className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Feladat-beosztások</span></div>
            <AddAssignmentForm empId={emp.id} />
            {asgs.length ? <div className="space-y-1.5 mt-2">{asgs.map((a) => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200">
                <span className="w-7 h-7 rounded-md grid place-items-center shrink-0 bg-amber-50 text-amber-700"><Icon name="briefcase" size={13} /></span>
                <div className="min-w-0 flex-1"><div className="text-[12px] font-medium text-stone-800 truncate">{a.label}</div><div className="text-[10.5px] text-stone-400 truncate">{a.projectName || "—"} · {a.start}–{a.end} · {a.hoursPerDay} ó/nap</div></div>
                <button onClick={() => window.sim.removeAssignment(a.id)} className="text-stone-300 hover:text-rose-500 shrink-0"><Icon name="x" size={14} /></button>
              </div>
            ))}</div> : <div className="text-[12px] text-stone-400 mt-2">Nincs aktív beosztás.</div>}
          </div>

          {/* távollétek */}
          <div>
            <span className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Távollétek</span>
            {abss.length ? <div className="space-y-1.5 mt-2">{abss.map((a) => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200">
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><window.AbsTypeBadge type={a.type} /></div><div className="text-[10.5px] text-stone-400">{a.start}–{a.end} · {a.days} nap</div></div>
                <window.AbsStatusPill status={a.status} size="sm" />
              </div>
            ))}</div> : <div className="text-[12px] text-stone-400 mt-2">Nincs rögzített távollét.</div>}
          </div>
        </div>
      )}

      {tab === "keszsegek" && (
        <div>
          <div className="text-[11px] text-stone-400 mb-2">{canManage ? "Koppints egy szintre a szerkesztéshez (0 = törlés)." : "Csak megtekintés — szerkesztéshez HR-jog kell."}</div>
          <div className="space-y-1.5">
            {(window.HR_SKILL_ORDER || []).map((sk) => {
              const cur = (emp.skills || []).find((x) => x.key === sk);
              const meta = window.HR_SKILLS[sk];
              return (
                <div key={sk} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200">
                  <span className="w-7 h-7 rounded-md grid place-items-center shrink-0 bg-stone-100 text-stone-500"><Icon name={meta.icon} size={13} /></span>
                  <span className="text-[12px] font-medium text-stone-700 flex-1 truncate">{meta.label}</span>
                  {canManage ? (
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3].map((lv) => (
                        <button key={lv} onClick={() => window.sim.setEmployeeSkill(emp.id, sk, lv)}
                          className={`w-7 h-7 rounded-md text-[11px] font-semibold border ${(cur ? cur.level : 0) === lv ? "bg-amber-600 text-white border-amber-600" : "bg-white text-stone-400 border-stone-200"}`}>{lv === 0 ? "–" : lv}</button>
                      ))}
                    </div>
                  ) : cur ? <window.SkillChip sk={cur} size="sm" /> : <span className="text-[11px] text-stone-300">nincs</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "naplo" && (
        <div>
          <div className="flex items-center justify-between mb-2"><span className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Munkaóra-napló</span></div>
          <AddTimeLogForm empId={emp.id} />
          {logs.length ? <div className="space-y-1.5 mt-2">{logs.map((t) => {
            const cost = Math.round((t.hours || 0) * window.sim.hrRate(emp));
            return (
              <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200">
                <span className="w-7 h-7 rounded-md grid place-items-center shrink-0 bg-indigo-50 text-indigo-600"><Icon name="clock" size={13} /></span>
                <div className="min-w-0 flex-1"><div className="text-[12px] font-medium text-stone-800 truncate">{t.hours} ó · {t.projectName || "nincs projekt"}</div><div className="text-[10.5px] text-stone-400 truncate">{t.date}{t.note ? " · " + t.note : ""} · {window.hrHuf(cost)}</div></div>
                {t.pushedToCtrl ? <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium shrink-0"><Icon name="check" size={12} />Kontroll.</span>
                  : t.projectId ? <button onClick={() => window.sim.pushTimeLogToCtrl(t.id)} className="h-7 px-2 rounded-lg bg-slate-700 text-white text-[10.5px] font-medium shrink-0">→ Kontrolling</button>
                  : <span className="text-[10px] text-stone-300 shrink-0">nincs projekt</span>}
                <button onClick={() => window.sim.removeTimeLog(t.id)} className="text-stone-300 hover:text-rose-500 shrink-0"><Icon name="x" size={14} /></button>
              </div>
            );
          })}</div> : <div className="text-[12px] text-stone-400 mt-2">Nincs naplózott óra.</div>}
          <div className="text-[10px] text-stone-400 mt-2">A „→ Kontrolling" gomb a naplózott órát (óra × óradíj) „munka" kategóriás tény-korrekcióként küldi a projekt utókalkulációjába.</div>
        </div>
      )}

      {tab === "szabadsag" && <EmpLeaveTab emp={emp} />}
      {tab === "szemelyes" && <EmpPersonalTab emp={emp} />}

      {canManage && <div className="pt-1"><button onClick={() => { if (confirm("Biztosan archiválod a dolgozót?")) window.sim.removeEmployee(emp.id); }} className="text-[11.5px] text-rose-500 font-medium inline-flex items-center gap-1"><Icon name="archive" size={13} />Dolgozó archiválása</button></div>}
    </div>
  );
}

// ── Beosztás-hozzáadó (inline) ───────────────────────────────────
function AddAssignmentForm({ empId }) {
  const sim = useSim();
  const [open, setOpen] = useStateH2(false);
  const [projectId, setProjectId] = useStateH2("");
  const [label, setLabel] = useStateH2("");
  const [start, setStart] = useStateH2(window.HR_TODAY);
  const [end, setEnd] = useStateH2(window.HR_TODAY);
  const [hours, setHours] = useStateH2("8");
  const projects = (sim.projects || []).filter((p) => p.status !== "draft");
  const save = () => {
    if (!label.trim()) return;
    const p = projects.find((x) => x.id === projectId);
    window.sim.addAssignment({ empId, projectId: projectId || null, projectName: p ? p.name : "", label, start, end, hoursPerDay: Number(hours) || 8 });
    setOpen(false); setLabel("");
  };
  if (!open) return <button onClick={() => setOpen(true)} className="text-[11.5px] text-amber-700 font-medium inline-flex items-center gap-1"><Icon name="plus" size={13} />Beosztás</button>;
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 space-y-2">
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Feladat megnevezése" className={h2cls} />
      <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={h2cls}><option value="">— projekt nélkül —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <div className="grid grid-cols-3 gap-2">
        <div><label className="text-[9.5px] text-stone-400">Kezdés</label><input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={h2cls} /></div>
        <div><label className="text-[9.5px] text-stone-400">Vége</label><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={h2cls} /></div>
        <div><label className="text-[9.5px] text-stone-400">Ó/nap</label><input type="number" value={hours} onChange={(e) => setHours(e.target.value)} className={h2cls} /></div>
      </div>
      <div className="flex items-center gap-2"><button onClick={save} className="h-8 px-3 rounded-lg bg-amber-600 text-white text-[12px] font-medium">Hozzáad</button><button onClick={() => setOpen(false)} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button></div>
    </div>
  );
}

// ── Munkaóra-napló hozzáadó (inline) ─────────────────────────────
function AddTimeLogForm({ empId }) {
  const sim = useSim();
  const [open, setOpen] = useStateH2(false);
  const [projectId, setProjectId] = useStateH2("");
  const [date, setDate] = useStateH2(window.HR_TODAY);
  const [hours, setHours] = useStateH2("8");
  const [note, setNote] = useStateH2("");
  const projects = (sim.projects || []).filter((p) => p.status !== "draft");
  const save = () => {
    if (!Number(hours)) return;
    const p = projects.find((x) => x.id === projectId);
    window.sim.addTimeLog({ empId, projectId: projectId || null, projectName: p ? p.name : "", date, hours: Number(hours), note });
    setOpen(false); setNote("");
  };
  if (!open) return <button onClick={() => setOpen(true)} className="text-[11.5px] text-amber-700 font-medium inline-flex items-center gap-1"><Icon name="plus" size={13} />Óra rögzítése</button>;
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 space-y-2">
      <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={h2cls}><option value="">— projekt nélkül (nem küldhető Kontrollingba) —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="text-[9.5px] text-stone-400">Dátum</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={h2cls} /></div>
        <div><label className="text-[9.5px] text-stone-400">Óra</label><input type="number" value={hours} onChange={(e) => setHours(e.target.value)} className={h2cls} /></div>
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Megjegyzés" className={h2cls} />
      <div className="flex items-center gap-2"><button onClick={save} className="h-8 px-3 rounded-lg bg-amber-600 text-white text-[12px] font-medium">Rögzít</button><button onClick={() => setOpen(false)} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button></div>
    </div>
  );
}

// ── Távollét-kezelő (FSM) ────────────────────────────────────────
function HrAbsence() {
  const sim = useSim();
  const [filter, setFilter] = useStateH2("all");
  const [addOpen, setAddOpen] = useStateH2(false);
  const canManage = window.sim.hasPerm("hr.manage");
  const all = (sim.absences || []);
  const list = all.filter((a) => filter === "all" || a.status === filter)
    .slice().sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""));
  const FILTERS = [["all", "Összes"], ["kert", "Kért"], ["jovahagyva", "Jóváhagyva"], ["folyamatban", "Folyamatban"], ["lezarva", "Lezárva"]];

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Távollét</h1>
        <button onClick={() => setAddOpen(true)} className="h-9 px-3 rounded-lg bg-amber-600 text-white text-[12.5px] font-medium inline-flex items-center gap-1.5"><Icon name="plus" size={15} />Új kérelem</button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto mb-3">
        {FILTERS.map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`h-8 px-3 rounded-lg text-[11.5px] font-medium shrink-0 border ${filter === k ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200"}`}>{l}</button>)}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {list.length ? list.map((a) => {
          const emp = window.sim.findEmployee(a.empId);
          const nexts = window.HrEngine.absNext(a);
          return (
            <div key={a.id} className="px-4 py-3 border-b border-stone-100 last:border-0">
              <div className="flex items-center gap-3">
                <window.Avatar emp={emp} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="text-[12.5px] font-semibold text-stone-900 truncate">{emp ? emp.name : ""}</span><span className="text-[10px] font-mono text-stone-400">{a.id}</span></div>
                  <div className="flex items-center gap-2 text-[10.5px] text-stone-400 truncate"><window.AbsTypeBadge type={a.type} /><span>· {a.start}–{a.end} · {a.days} munkanap</span></div>
                </div>
                <window.AbsStatusPill status={a.status} size="sm" />
              </div>
              {a.reason && <div className="text-[11px] text-stone-500 mt-1.5 pl-[46px]">„{a.reason}"</div>}
              {a.rejectReason && <div className="text-[11px] text-rose-600 mt-1 pl-[46px]">Elutasítva: {a.rejectReason}</div>}
              {nexts.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 pl-[46px] flex-wrap">
                  {nexts.map((to) => {
                    const m = window.ABS_STATUS[to];
                    const needPerm = (to === "jovahagyva" || to === "elutasitva") && !canManage;
                    const onClick = () => {
                      if (to === "elutasitva") { const r = prompt("Elutasítás indoka:"); if (r && r.trim()) window.sim.setAbsenceStatus(a.id, to, { reason: r }); }
                      else window.sim.setAbsenceStatus(a.id, to);
                    };
                    return <button key={to} disabled={needPerm} onClick={onClick} title={needPerm ? "HR-jog szükséges (hr.manage)" : ""}
                      className={`h-7 px-2.5 rounded-lg text-[11px] font-medium border inline-flex items-center gap-1 ${needPerm ? "bg-stone-50 text-stone-300 border-stone-200 cursor-not-allowed" : to === "elutasitva" ? "bg-white text-rose-600 border-rose-200" : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"}`}>
                      {needPerm && <Icon name="lock" size={11} />}→ {m.label}</button>;
                  })}
                </div>
              )}
            </div>
          );
        }) : <div className="px-4 py-10 text-center text-[12px] text-stone-400">Nincs kérelem ebben a nézetben.</div>}
      </div>

      {addOpen && <NewAbsenceSheet onClose={() => setAddOpen(false)} />}
    </div>
  );
}

// ── Készség-mátrix ───────────────────────────────────────────────
function HrSkills() {
  const sim = useSim();
  const [openId, setOpenId] = useStateH2(null);
  const emps = window.sim.employeeList();
  const SKILLS = window.HR_SKILL_ORDER || [];

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1300px] mx-auto">
      <div className="mb-3">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Készség-mátrix</h1>
        <p className="text-[12.5px] text-stone-500 mt-0.5">Ki mihez ért és milyen szinten — a beosztáshoz és a brigád-összeállításhoz</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <div className="grid border-b border-stone-100 bg-stone-50/60" style={{ gridTemplateColumns: "180px repeat(" + SKILLS.length + ", 1fr)" }}>
              <div className="px-3 py-2 text-[10px] uppercase tracking-wide text-stone-400 font-medium">Dolgozó</div>
              {SKILLS.map((sk) => <div key={sk} className="px-1 py-2 text-center border-l border-stone-100 text-[9.5px] text-stone-500 font-medium leading-tight">{window.HR_SKILLS[sk].label}</div>)}
            </div>
            {emps.map((e) => (
              <div key={e.id} className="grid border-b border-stone-100 last:border-0" style={{ gridTemplateColumns: "180px repeat(" + SKILLS.length + ", 1fr)" }}>
                <button onClick={() => setOpenId(e.id)} className="px-3 py-2 min-w-0 text-left hover:bg-stone-50/70 flex items-center gap-2">
                  <window.Avatar emp={e} size={26} />
                  <div className="min-w-0"><div className="text-[11.5px] font-semibold text-stone-800 truncate">{e.name}</div><div className="text-[9.5px] text-stone-400 truncate">{e.role}</div></div>
                </button>
                {SKILLS.map((sk) => {
                  const cur = (e.skills || []).find((x) => x.key === sk);
                  const lv = cur ? window.HR_SKILL_LEVELS[cur.level] : null;
                  return (
                    <div key={sk} className="border-l border-stone-100 grid place-items-center py-2">
                      {cur ? <span className={`w-6 h-6 rounded-md grid place-items-center text-[10.5px] font-semibold border ${lv.pill}`} title={lv.label}>{cur.level}</span> : <span className="text-[10px] text-stone-200">·</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap mt-3 text-[11px] text-stone-500">
        {[1, 2, 3].map((l) => { const m = window.HR_SKILL_LEVELS[l]; return <span key={l} className="inline-flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-sm ${m.dot}`} />{l} — {m.label}</span>; })}
      </div>

      <window.HrDetailHost openId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

// ── Sheet: új dolgozó ────────────────────────────────────────────
function NewEmployeeSheet({ onClose }) {
  const sim = useSim();
  const [name, setName] = useStateH2("");
  const [role, setRole] = useStateH2("");
  const [dept, setDept] = useStateH2("gyartas");
  const [facilityId, setFac] = useStateH2((window.FACILITIES || [])[0]?.id || "fac-vac");
  const [payGrade, setPay] = useStateH2("szakmunkas");
  const [weeklyHours, setWH] = useStateH2("40");
  const [phone, setPhone] = useStateH2("");
  const [email, setEmail] = useStateH2("");
  const [children, setChildren] = useStateH2("0");
  const [birthDate, setBirthDate] = useStateH2("");
  const save = () => {
    if (!name.trim()) return;
    window.sim.addEmployee({ name, role, dept, facilityId, payGrade, weeklyHours: Number(weeklyHours) || 40, employment: Number(weeklyHours) < 40 ? "part" : "full", phone, email, children: Number(children) || 0, personal: { children: Number(children) || 0, birthDate } });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[480px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between">
          <div className="text-[14px] font-semibold text-stone-900">Új dolgozó</div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button>
        </div>
        <div className="px-4 py-4 space-y-2.5">
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Név</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Teljes név" className={h2cls} /></div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Munkakör</label><input value={role} onChange={(e) => setRole(e.target.value)} placeholder="pl. Szabász operátor" className={h2cls} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Részleg</label><select value={dept} onChange={(e) => setDept(e.target.value)} className={h2cls}>{(window.HR_DEPT_ORDER || []).map((d) => <option key={d} value={d}>{window.HR_DEPTS[d].label}</option>)}</select></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Telephely</label><select value={facilityId} onChange={(e) => setFac(e.target.value)} className={h2cls}>{(window.FACILITIES || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Bér-kategória</label><select value={payGrade} onChange={(e) => setPay(e.target.value)} className={h2cls}>{(window.HR_PAY_ORDER || []).map((g) => <option key={g} value={g}>{window.HR_PAY_GRADES[g].label}</option>)}</select></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Heti óra</label><input type="number" value={weeklyHours} onChange={(e) => setWH(e.target.value)} className={h2cls} /></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Telefon</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className={h2cls} /></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">E-mail</label><input value={email} onChange={(e) => setEmail(e.target.value)} className={h2cls} /></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Gyermekek száma</label><input type="number" min="0" value={children} onChange={(e) => setChildren(e.target.value)} className={h2cls} /></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Születési dátum</label><input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={h2cls} /></div>
          </div>
          <button onClick={save} disabled={!name.trim()} className={`w-full h-10 rounded-xl text-white text-[13px] font-medium mt-1 ${name.trim() ? "bg-amber-600" : "bg-stone-300"}`}>Dolgozó felvétele</button>
        </div>
      </div>
    </div>
  );
}

// ── Sheet: új távollét-kérelem ───────────────────────────────────
function NewAbsenceSheet({ onClose, defaultEmpId }) {
  const sim = useSim();
  const [empId, setEmpId] = useStateH2(defaultEmpId || (window.sim.employeeList()[0]?.id || ""));
  const [type, setType] = useStateH2("szabadsag");
  const [start, setStart] = useStateH2("");
  const [end, setEnd] = useStateH2("");
  const [reason, setReason] = useStateH2("");
  const emps = window.sim.employeeList();
  const days = start ? window.HrEngine.workdaysBetween(start, end || start) : 0;
  const save = () => {
    if (!empId || !start) return;
    window.sim.addAbsence({ empId, type, start, end: end || start, reason });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[460px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between">
          <div className="text-[14px] font-semibold text-stone-900">Új távollét-kérelem</div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button>
        </div>
        <div className="px-4 py-4 space-y-2.5">
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Dolgozó</label><select value={empId} onChange={(e) => setEmpId(e.target.value)} className={h2cls}>{emps.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">Típus</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(window.ABS_TYPE_ORDER || []).map((k) => { const m = window.ABS_TYPE_META[k]; const on = type === k; return (
                <button key={k} onClick={() => setType(k)} className={`flex items-center gap-1.5 py-2 px-2.5 rounded-lg border text-[11.5px] font-medium ${on ? "border-amber-500 bg-amber-50 text-amber-800" : "border-stone-200 bg-white text-stone-600"}`}><Icon name={m.icon} size={14} />{m.label}</button>
              ); })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Kezdés</label><input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={h2cls} /></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Vége</label><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={h2cls} /></div>
          </div>
          {start && <div className="text-[11px] text-stone-500">{days} munkanap</div>}
          {empId && (type === "szabadsag" || type === "betegseg") && (() => {
            const bal = type === "szabadsag" ? window.sim.hrVacationBalance(empId) : window.sim.hrSickBalance(empId);
            if (!bal) return null;
            const over = days > bal.remaining;
            return <div className={`text-[11px] ${over ? "text-rose-600 font-medium" : "text-stone-500"}`}>{type === "szabadsag" ? "Szabadság" : "Betegszab."}-egyenleg: {bal.remaining} nap maradt{over ? ` — a kérelem (${days} nap) túllépi a keretet!` : ""}</div>;
          })()}
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Indok (opcionális)</label><input value={reason} onChange={(e) => setReason(e.target.value)} className={h2cls} /></div>
          <button onClick={save} disabled={!empId || !start} className={`w-full h-10 rounded-xl text-white text-[13px] font-medium mt-1 ${empId && start ? "bg-amber-600" : "bg-stone-300"}`}>Kérelem beadása</button>
        </div>
      </div>
    </div>
  );
}

// ── Profil: Személyes / HR törzsadat fül ─────────────────────────
function H2Field({ label, wide, children }) {
  return <div className={wide ? "col-span-2" : ""}><label className="text-[9.5px] text-stone-400 block mb-0.5">{label}</label>{children}</div>;
}
function H2ReadVal({ v }) {
  return <div className="h-9 px-2.5 rounded-lg border border-stone-100 bg-stone-50/60 text-[12.5px] text-stone-700 flex items-center truncate">{v || <span className="text-stone-300">—</span>}</div>;
}
function EmpPersonalTab({ emp }) {
  const sim = useSim();
  const canManage = window.sim.hasPerm("hr.manage");
  const p = emp.personal || {};
  const setP = (patch) => window.sim.setEmployeePersonal(emp.id, patch);
  const GROUPS = window.HR_PERSONAL_GROUPS || [];
  const FIELDS = window.HR_PERSONAL_FIELDS || [];
  const MARITAL = window.HR_MARITAL || {};
  const kids = Number(p.children) || 0;
  return (
    <div className="space-y-4">
      {!canManage && <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Érzékeny HR-adatok — szerkesztéshez HR-jog (hr.manage) kell. Most csak megtekintés.</div>}
      {/* Családi adatok */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Családi adatok</div>
        <div className="grid grid-cols-2 gap-2">
          <H2Field label="Családi állapot">
            {canManage
              ? <select value={p.maritalStatus || ""} onChange={(e) => setP({ maritalStatus: e.target.value })} className={h2cls}><option value="">—</option>{(window.HR_MARITAL_ORDER || []).map((k) => <option key={k} value={k}>{MARITAL[k].label}</option>)}</select>
              : <H2ReadVal v={p.maritalStatus ? (MARITAL[p.maritalStatus] || {}).label : null} />}
          </H2Field>
          <H2Field label="Gyermekek száma">
            {canManage
              ? <input type="number" min="0" value={p.children != null ? p.children : ""} onChange={(e) => setP({ children: e.target.value === "" ? null : (Number(e.target.value) || 0) })} className={h2cls} />
              : <H2ReadVal v={p.children != null ? p.children + " fő" : null} />}
          </H2Field>
        </div>
        {kids > 0 && <div className="text-[10.5px] text-teal-700 mt-1.5 inline-flex items-center gap-1"><Icon name="calendar" size={12} />+{window.HrEngine.childVacationDays(kids)} munkanap gyermek-pótszabadság (Mt. §118) — a Szabadság fülön beszámítva.</div>}
      </div>
      {GROUPS.map((g) => (
        <div key={g.key}>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">{g.label}</div>
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.filter((f) => f.group === g.key).map((f) => (
              <H2Field key={f.key} label={f.label} wide={f.wide}>
                {canManage
                  ? <input type={f.type === "date" ? "date" : f.type === "tel" ? "tel" : "text"} value={p[f.key] || ""} onChange={(e) => setP({ [f.key]: e.target.value })} className={h2cls} />
                  : <H2ReadVal v={p[f.key]} />}
              </H2Field>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Profil: Szabadság & betegszabadság fül ───────────────────────
function EmpLeaveTab({ emp }) {
  const sim = useSim();
  const [addOpen, setAddOpen] = useStateH2(false);
  const vac = window.sim.hrVacationBalance(emp.id) || { remaining: 0, entitlement: 0, used: 0, base: 0, childExtra: 0 };
  const sick = window.sim.hrSickBalance(emp.id) || { remaining: 0, annual: 0, used: 0 };
  const abss = window.sim.absencesForEmployee(emp.id);
  const year = window.sim.hrYear ? window.sim.hrYear() : "";
  const Bar = ({ used, total, tone }) => { const pct = total > 0 ? Math.min(100, used / total * 100) : 0; return <div className="h-2 rounded-full bg-stone-100 overflow-hidden"><div className={`h-full ${tone}`} style={{ width: pct + "%" }} /></div>; };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-stone-200 p-3.5">
          <div className="flex items-center gap-1.5 mb-2"><Icon name="calendar" size={14} className="text-teal-600" /><span className="text-[12px] font-semibold text-stone-800">Szabadság {year}</span></div>
          <div className="flex items-end gap-1 mb-1"><span className="text-[22px] font-semibold text-stone-900 leading-none">{vac.remaining}</span><span className="text-[11px] text-stone-400 mb-0.5">/ {vac.entitlement} nap maradt</span></div>
          <Bar used={vac.used} total={vac.entitlement} tone="bg-teal-500" />
          <div className="text-[10.5px] text-stone-400 mt-1.5">{vac.used} nap kivéve · alap {vac.base}{vac.childExtra ? ` + ${vac.childExtra} gyermek-pótszab.` : ""}</div>
        </div>
        <div className="rounded-xl border border-stone-200 p-3.5">
          <div className="flex items-center gap-1.5 mb-2"><Icon name="shield" size={14} className="text-rose-600" /><span className="text-[12px] font-semibold text-stone-800">Betegszab. {year}</span></div>
          <div className="flex items-end gap-1 mb-1"><span className="text-[22px] font-semibold text-stone-900 leading-none">{sick.remaining}</span><span className="text-[11px] text-stone-400 mb-0.5">/ {sick.annual} nap maradt</span></div>
          <Bar used={sick.used} total={sick.annual} tone="bg-rose-400" />
          <div className="text-[10.5px] text-stone-400 mt-1.5">{sick.used} nap igénybe véve (Mt. évi {sick.annual})</div>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2"><span className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">Távollétek</span><button onClick={() => setAddOpen(true)} className="text-[11.5px] text-amber-700 font-medium inline-flex items-center gap-1"><Icon name="plus" size={13} />Új kérelem</button></div>
        {abss.length ? <div className="space-y-1.5">{abss.map((a) => (
          <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200">
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><window.AbsTypeBadge type={a.type} /></div><div className="text-[10.5px] text-stone-400">{a.start}–{a.end} · {a.days} nap</div></div>
            <window.AbsStatusPill status={a.status} size="sm" />
          </div>
        ))}</div> : <div className="text-[12px] text-stone-400">Nincs rögzített távollét.</div>}
      </div>
      {addOpen && window.NewAbsenceSheet && <window.NewAbsenceSheet onClose={() => setAddOpen(false)} defaultEmpId={emp.id} />}
    </div>
  );
}

Object.assign(window, {
  EmployeeDetail, AddAssignmentForm, AddTimeLogForm,
  HrAbsence, HrSkills, NewEmployeeSheet, NewAbsenceSheet,
});
