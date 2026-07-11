// ──────────────────────────────────────────────────────────────────────────
// page-projects-board.jsx — SpaceOS projektmenedzsment HIERARCHIA board.
//
//   Mérföldkő (projekt-FÁZIS) → (almérföldkő) → Epik (FlowEpic, FSM) → Task.
//   Az epik a kulcsegység: önálló, lezárható, és DELEGÁLHATÓ másik céghez
//   (B2BHandshake). A board a meglévő szakág-függőségek MELLETT él, nem cseréli.
//
//   FSM (store-validált): BACKLOG_READY → IN_DEV → IN_REVIEW → CLOSED_DONE
//                                                  → CLOSED_BLOCKED
//   Tiltott átmenet → a gomb LEZÁRT (disabled + tooltip), nem rejtett.
//   Konstansok + board itt; epik-részletek a page-projects-epic.jsx-ben.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStatePB } = React;

// Epik státusz-megjelenítés — új státusznál EZT bővítsd, ne hardcode-olj színt.
const EPIC_TONE = {
  BACKLOG_READY:  { l: "Indítható",   bg: "bg-stone-100",   fg: "text-stone-600",   dot: "bg-stone-400",   solid: "bg-stone-400" },
  IN_DEV:         { l: "Folyamatban", bg: "bg-sky-50",      fg: "text-sky-700",     dot: "bg-sky-500",     solid: "bg-sky-500" },
  IN_REVIEW:      { l: "Ellenőrzés",  bg: "bg-amber-50",    fg: "text-amber-700",   dot: "bg-amber-500",   solid: "bg-amber-500" },
  CLOSED_DONE:    { l: "Kész",        bg: "bg-emerald-50",  fg: "text-emerald-700", dot: "bg-emerald-500", solid: "bg-emerald-500" },
  CLOSED_BLOCKED: { l: "Blokkolt",    bg: "bg-rose-50",     fg: "text-rose-700",    dot: "bg-rose-500",    solid: "bg-rose-500" },
};
const EPIC_FLOW = ["BACKLOG_READY", "IN_DEV", "IN_REVIEW", "CLOSED_DONE"]; // fő ág a stepperhez
const epicTone = (k) => EPIC_TONE[k] || EPIC_TONE.BACKLOG_READY;

// 6 actor-típus (nézet-szétválás + epik tulajdonosa)
const ACTOR_META = {
  manufacturer: { l: "Gyártó",        icon: "factory",  tint: "bg-stone-200 text-stone-700" },
  supplier:     { l: "Lapszabász",    icon: "cut",      tint: "bg-teal-100 text-teal-700" },
  installer:    { l: "Beépítő",       icon: "wrench",   tint: "bg-amber-100 text-amber-700" },
  designer:     { l: "Belsőépítész",  icon: "ruler",    tint: "bg-violet-100 text-violet-700" },
  dealer:       { l: "Viszonteladó",  icon: "briefcase",tint: "bg-sky-100 text-sky-700" },
  client:       { l: "Ügyfél",        icon: "user",     tint: "bg-emerald-100 text-emerald-700" },
};
const actorMeta = (k) => ACTOR_META[k] || ACTOR_META.manufacturer;

// B2BHandshake státusz-megjelenítés
const HS_TONE = {
  draft:    { l: "Draft — átnézendő",   bg: "bg-amber-50",   fg: "text-amber-700",   dot: "bg-amber-500" },
  sent:     { l: "Kézfogás elküldve",   bg: "bg-amber-50",   fg: "text-amber-700",   dot: "bg-amber-500" },
  accepted: { l: "Elfogadva — folyamatban", bg: "bg-sky-50", fg: "text-sky-700",     dot: "bg-sky-500" },
  done:     { l: "Visszajelezve — kész", bg: "bg-emerald-50", fg: "text-emerald-700", dot: "bg-emerald-500" },
  declined: { l: "Visszautasítva",      bg: "bg-rose-50",    fg: "text-rose-700",    dot: "bg-rose-500" },
  external: { l: "Külső hivatkozás",    bg: "bg-stone-100",  fg: "text-stone-600",   dot: "bg-stone-400" },
};
const hsTone = (h) => HS_TONE[h.status === "draft" ? "draft" : (h.external && h.status !== "done" ? "external" : h.status)] || HS_TONE.sent;

// ── computed helpers ────────────────────────────────────────────────────────
function flattenEpics(milestone) {
  const out = [];
  (milestone.epics || []).forEach((e) => out.push(e));
  (milestone.subMilestones || []).forEach((sm) => (sm.epics || []).forEach((e) => out.push(e)));
  return out;
}
function milestoneStat(m) {
  const eps = flattenEpics(m);
  const total = eps.length;
  const done = eps.filter((e) => e.status === "CLOSED_DONE").length;
  const active = eps.some((e) => e.status === "IN_DEV" || e.status === "IN_REVIEW");
  const blocked = eps.some((e) => e.status === "CLOSED_BLOCKED");
  const state = total === 0 ? "empty" : done === total ? "done" : active ? "active" : blocked ? "blocked" : "ready";
  return { total, done, active, blocked, state, pct: total ? Math.round((done / total) * 100) : 0 };
}
const MS_STATE_TONE = {
  empty:   { dot: "bg-stone-300", ring: "ring-stone-200", text: "text-stone-400" },
  ready:   { dot: "bg-stone-400", ring: "ring-stone-200", text: "text-stone-500" },
  active:  { dot: "bg-sky-500",   ring: "ring-sky-200",   text: "text-sky-700" },
  blocked: { dot: "bg-rose-500",  ring: "ring-rose-200",  text: "text-rose-700" },
  done:    { dot: "bg-emerald-500", ring: "ring-emerald-200", text: "text-emerald-700" },
};

function projectEpicSummary(p) {
  let total = 0, done = 0, delegated = 0;
  (p.milestones || []).forEach((m) => flattenEpics(m).forEach((e) => {
    total++; if (e.status === "CLOSED_DONE") done++; if (e.delegatedTo) delegated++;
  }));
  return { total, done, delegated, pct: total ? Math.round((done / total) * 100) : 0 };
}

// ── Full-screen project board ───────────────────────────────────────────────
function ProjectBoard({ projectId, onClose }) {
  const s = useSim();
  const p = s.projects.find((x) => x.id === projectId);
  const [openEpic, setOpenEpic] = useStatePB(null);
  const [focusMs, setFocusMs] = useStatePB(null);   // selected milestone id (null = all)
  const [addMsOpen, setAddMsOpen] = useStatePB(false);
  const [msName, setMsName] = useStatePB("");
  const [procPick, setProcPick] = useStatePB(false);
  const [runOpen, setRunOpen] = useStatePB(false);
  const me = window.sim.currentAccount();
  const canEdit = me.actorType === "manufacturer" || me.type === "internal";

  if (!p) return null;
  const milestones = p.milestones || [];
  const sum = projectEpicSummary(p);
  const draftCount = (s.handshakes || []).filter((h) => h.projectId === p.id && h.status === "draft").length;
  const tone = (window.PROJECT_STATUS_TONE || {})[p.status] || { l: p.status, bg: "bg-stone-100", fg: "text-stone-600", dot: "bg-stone-400" };
  const shown = focusMs ? milestones.filter((m) => m.id === focusMs) : milestones;

  const EpicDetail = window.EpicDetail;
  const openEpicLoc = openEpic ? window.sim.findEpic(p.id, openEpic) : null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-stone-50" role="dialog" aria-modal="true">
      {/* header */}
      <header className="shrink-0 bg-white border-b border-stone-200">
        <div className="max-w-[1180px] mx-auto px-3 md:px-6 h-14 flex items-center gap-2.5">
          <button onClick={onClose} className="w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100 shrink-0" aria-label="Vissza">
            <Icon name="chevron" size={18} className="rotate-180" />
          </button>
          {/* breadcrumb */}
          <nav className="flex items-center gap-1.5 min-w-0 text-[12.5px]">
            <button onClick={() => setFocusMs(null)} className="font-semibold text-stone-900 hover:text-violet-700 truncate max-w-[40vw] md:max-w-none">{p.name}</button>
            {focusMs && (() => {
              const m = milestones.find((x) => x.id === focusMs);
              return m ? <><Icon name="chevron" size={13} className="text-stone-300 shrink-0" /><span className="text-stone-500 truncate">{m.name}</span></> : null;
            })()}
          </nav>
          <span className="flex-1" />
          <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11.5px] font-medium ${tone.bg} ${tone.fg} shrink-0`}>
            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{tone.l}
          </span>
        </div>
        {/* StageChain — fázis-stepper (tenant-specifikus sorrend) */}
        <div className="border-t border-stone-100 bg-stone-50/60">
          <div className="max-w-[1180px] mx-auto px-3 md:px-6 py-2.5 overflow-x-auto">
            <div className="flex items-center gap-0 min-w-max">
              {milestones.map((m, i) => {
                const st = milestoneStat(m); const mt = MS_STATE_TONE[st.state];
                const sel = focusMs === m.id;
                return (
                  <React.Fragment key={m.id}>
                    {i > 0 && <div className="w-6 md:w-10 h-px bg-stone-200 shrink-0" />}
                    <button onClick={() => setFocusMs(sel ? null : m.id)}
                      className={`group flex items-center gap-2 pl-1 pr-2.5 h-9 rounded-full shrink-0 transition ${sel ? "bg-white ring-1 ring-violet-300 shadow-sm" : "hover:bg-white/70"}`}>
                      <span className={`relative w-7 h-7 rounded-full grid place-items-center text-white text-[11px] font-bold ring-2 ${mt.dot} ${sel ? "ring-violet-200" : "ring-white"}`}>
                        {st.state === "done" ? <Icon name="check" size={14} /> : (m.phase || i + 1)}
                      </span>
                      <span className="text-left leading-tight">
                        <span className={`block text-[12px] font-semibold ${sel ? "text-stone-900" : "text-stone-700"}`}>{m.name}</span>
                        <span className={`block text-[9.5px] font-medium ${mt.text}`}>{st.total ? `${st.done}/${st.total} epik` : "üres"}</span>
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
              {canEdit && (
                <>
                  {milestones.length > 0 && <div className="w-6 md:w-10 h-px bg-stone-200 shrink-0" />}
                  {addMsOpen ? (
                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      <input autoFocus value={msName} onChange={(e) => setMsName(e.target.value)} placeholder="Fázis neve"
                        onKeyDown={(e) => { if (e.key === "Enter" && msName.trim()) { window.sim.addMilestone(p.id, msName); setMsName(""); setAddMsOpen(false); } if (e.key === "Escape") setAddMsOpen(false); }}
                        className="h-8 px-2.5 rounded-lg border border-violet-300 text-[12px] outline-none w-32" />
                      <button onClick={() => { if (msName.trim()) { window.sim.addMilestone(p.id, msName); setMsName(""); setAddMsOpen(false); } }} className="w-8 h-8 grid place-items-center rounded-lg bg-violet-600 text-white"><Icon name="check" size={14} /></button>
                    </span>
                  ) : (
                    <button onClick={() => setAddMsOpen(true)} className="inline-flex items-center gap-1.5 pl-1 pr-2.5 h-9 rounded-full text-stone-400 hover:text-violet-700 hover:bg-white/70 shrink-0">
                      <span className="w-7 h-7 rounded-full grid place-items-center border border-dashed border-stone-300"><Icon name="plus" size={14} /></span>
                      <span className="text-[12px] font-medium">Fázis</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1180px] mx-auto px-3 md:px-6 py-4 md:py-5">
          {/* summary strip */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="text-[12px] text-stone-500">
              <span className="font-semibold text-stone-800">{sum.done}/{sum.total}</span> epik kész
            </div>
            {p.processName && (
              <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full bg-violet-50 text-violet-700 text-[11px] font-medium">
                <Icon name="workflow" size={12} /> {p.processName}
              </span>
            )}
            {draftCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium">
                <Icon name="external" size={12} /> {draftCount} előkészített átadás — átnézendő
              </span>
            )}
            {sum.delegated > 0 && draftCount === 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full bg-teal-50 text-teal-700 text-[11px] font-medium">
                <Icon name="external" size={12} /> {sum.delegated} kiadva partnernek
              </span>
            )}
            {p.processName && (
              <button onClick={() => setRunOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg bg-violet-600 text-white text-[11.5px] font-semibold hover:bg-violet-700 transition shadow-sm">
                <Icon name="production" size={13} />Folyamat futás
                {(() => { const v = window.sim.runView(p.id); if (!v) return null; if (!v.run.started) return <span className="ml-0.5 text-[9.5px] px-1.5 py-0.5 rounded-full bg-white/25">indítható</span>; return <span className="ml-0.5 text-[9.5px] px-1.5 py-0.5 rounded-full bg-white/25">{v.pct}%</span>; })()}
              </button>
            )}
            {canEdit && (
              <button onClick={() => setProcPick(true)} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg border border-stone-200 bg-white text-[11.5px] font-medium text-stone-600 hover:border-violet-300 hover:text-violet-700 transition">
                <Icon name="workflow" size={13} />{p.processName ? "Folyamat cseréje" : "Folyamat alkalmazása"}
              </button>
            )}
            <span className="flex-1" />
            <div className="flex-1 min-w-[120px] max-w-[260px] h-1.5 rounded-full bg-stone-200 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: sum.pct + "%" }} />
            </div>
          </div>

          {/* rework / loop rules from the applied process */}
          {(p.reworkRules || []).length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              {(p.reworkRules || []).map((r) => (
                <span key={r.id} title={r.cond ? `Feltétel: ${r.cond}` : ""} className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full bg-amber-50 text-amber-700 text-[10.5px] font-medium">
                  <Icon name="external" size={11} className="-scale-x-100" />{r.label}{r.target ? ` → ${r.target}` : ""}
                </span>
              ))}
            </div>
          )}

          {milestones.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-stone-100 grid place-items-center text-stone-400 mb-3"><Icon name="layers" size={22} /></div>
              <div className="text-[14px] font-semibold text-stone-700">Még nincs mérföldkő</div>
              <div className="text-[12px] text-stone-500 mt-1 max-w-sm mx-auto">Indulj egy sablonból (felépíti a fázisokat és epikeket), vagy vegyél fel egyedi fázisokat. A sablonok a Beállítások → Munkafolyamat alatt szerkeszthetők.</div>
              {canEdit && (() => {
                const tpls = (s.templates && s.templates.project) || [];
                const procs = (s.processes || []);
                return (
                  <>
                    {procs.length > 0 && (
                      <div className="mt-4">
                        <div className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-2">Folyamatból (ajánlott)</div>
                        <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto">
                          {procs.map((pc) => {
                            const fac = (window.FACILITIES || []).find((f) => f.id === pc.facilityId);
                            return (
                              <button key={pc.id} onClick={() => window.sim.applyProcessToProject(p.id, pc.id)}
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 bg-white text-[12px] font-medium text-stone-700 hover:border-violet-300 hover:text-violet-700 transition">
                                <span className="w-5 h-5 rounded-md grid place-items-center text-white shrink-0" style={{ background: pc.color || "#7c3aed" }}><Icon name="workflow" size={12} /></span>
                                <span>{pc.name}</span>
                                {fac && <span className="text-[9.5px] text-stone-400">· {fac.name.split(" —")[0]}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {tpls.length > 0 && (
                      <div className="mt-4">
                        <div className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-2">Vagy projekt sablonból</div>
                        <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
                          {tpls.map((tp) => (
                            <button key={tp.id} onClick={() => window.sim.applyProjectTemplate(p.id, tp.id)}
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 bg-white text-[12px] font-medium text-stone-700 hover:border-violet-300 hover:text-violet-700 transition">
                              <span className="w-5 h-5 rounded-md grid place-items-center text-white shrink-0" style={{ background: tp.color || "#7c3aed" }}><Icon name="layers" size={12} /></span>
                              {tp.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-4"><button onClick={() => setAddMsOpen(true)} className="h-9 px-4 rounded-lg bg-stone-100 text-stone-600 text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-stone-200"><Icon name="plus" size={14} />Üres fázis kézzel</button></div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-5">
              {shown.map((m) => <MilestoneSection key={m.id} project={p} milestone={m} canEdit={canEdit} onOpenEpic={setOpenEpic} />)}
            </div>
          )}
        </div>
      </div>

      {EpicDetail && openEpicLoc && (
        <EpicDetail project={p} loc={openEpicLoc} onClose={() => setOpenEpic(null)} canEdit={canEdit} />
      )}
      {procPick && <ProcessApplyPicker project={p} onClose={() => setProcPick(false)} />}
      {runOpen && window.ProcessRunner && <window.ProcessRunner projectId={p.id} onClose={() => setRunOpen(false)} />}
    </div>
  );
}

// choose a process to apply (replace) to this project
function ProcessApplyPicker({ project, onClose }) {
  const s = useSim();
  const procs = s.processes || [];
  const facs = window.FACILITIES || [];
  const has = (project.milestones || []).length > 0;
  const apply = (pid) => {
    if (has && !confirm("A projekt jelenlegi mérföldkövei és epikjei lecserélődnek a folyamat alapján. Folytatod?")) return;
    window.sim.applyProcessToProject(project.id, pid, { replace: true });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      <button aria-label="Bezárás" onClick={onClose} className="absolute inset-0 bg-stone-900/30 backdrop-blur-[1px]" />
      <div className="absolute inset-x-0 bottom-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-stone-200 flex flex-col max-h-[80vh]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}>
        <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-stone-900">Folyamat alkalmazása</div>
            <div className="text-[11px] text-stone-500">Legenerálja a mérföldkő → epik → task hierarchiát{has ? " (lecseréli a jelenlegit)" : ""}.</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"><Icon name="x" size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {facs.map((f) => {
            const list = procs.filter((pc) => pc.facilityId === f.id);
            if (!list.length) return null;
            return (
              <div key={f.id}>
                <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5 px-1 flex items-center gap-1.5"><Icon name="factory" size={11} />{f.name}</div>
                <div className="space-y-1.5">
                  {list.map((pc) => {
                    const st = window.sim.processStepStats(pc);
                    return (
                      <button key={pc.id} onClick={() => apply(pc.id)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-stone-200 hover:border-violet-300 hover:bg-violet-50/40 text-left transition">
                        <span className="w-9 h-9 rounded-lg grid place-items-center text-white shrink-0" style={{ background: pc.color || "#7c3aed" }}><Icon name="workflow" size={16} /></span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-semibold text-stone-900 truncate">{pc.name}</div>
                          <div className="text-[10.5px] text-stone-500">{st.phases} fázis · {st.steps} lépés{st.ext ? ` · ${st.ext} külső átadás` : ""}</div>
                        </div>
                        <Icon name="chevron" size={16} className="text-stone-300 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {procs.length === 0 && <div className="text-[12px] text-stone-400 text-center py-6">Még nincs folyamat. Hozz létre egyet a Beállítások → Munkafolyamat → Folyamatok alatt.</div>}
        </div>
      </div>
    </div>
  );
}

function MilestoneSection({ project, milestone, canEdit, onOpenEpic }) {
  const m = milestone;
  const st = milestoneStat(m);
  const mt = MS_STATE_TONE[st.state];
  const hasSub = (m.subMilestones || []).length > 0;
  return (
    <section className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-4 md:px-5 py-3 border-b border-stone-100 flex items-center gap-3">
        <span className={`w-6 h-6 rounded-full grid place-items-center text-white text-[11px] font-bold ${mt.dot}`}>
          {st.state === "done" ? <Icon name="check" size={13} /> : (m.phase || "•")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-stone-900">{m.name}</div>
          <div className={`text-[10.5px] font-medium ${mt.text}`}>{st.total ? `${st.done}/${st.total} epik kész` : "nincs epik"}</div>
        </div>
        <div className="w-20 h-1.5 rounded-full bg-stone-200 overflow-hidden shrink-0">
          <div className={`h-full rounded-full ${st.state === "done" ? "bg-emerald-500" : "bg-sky-500"}`} style={{ width: st.pct + "%" }} />
        </div>
      </div>

      <div className="p-3 md:p-4 space-y-4">
        {hasSub ? (
          (m.subMilestones || []).map((sm) => (
            <div key={sm.id}>
              <div className="flex items-center gap-2 mb-2 pl-0.5">
                <span className="w-4 h-4 rounded grid place-items-center text-stone-400"><Icon name="layers" size={13} /></span>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">{sm.name}</span>
                <span className="text-[10px] text-stone-400">almérföldkő</span>
                <span className="flex-1 h-px bg-stone-100" />
              </div>
              <EpicGrid project={project} epics={sm.epics || []} milestoneId={m.id} subId={sm.id} canEdit={canEdit} onOpenEpic={onOpenEpic} />
            </div>
          ))
        ) : (
          <EpicGrid project={project} epics={m.epics || []} milestoneId={m.id} subId={null} canEdit={canEdit} onOpenEpic={onOpenEpic} />
        )}
      </div>
    </section>
  );
}

function EpicGrid({ project, epics, milestoneId, subId, canEdit, onOpenEpic }) {
  const s = useSim();
  const [adding, setAdding] = useStatePB(false);
  const [title, setTitle] = useStatePB("");
  const epicTpls = (s.templates && s.templates.epic) || [];
  const add = () => { if (title.trim()) { const id = window.sim.addEpic(project.id, milestoneId, subId, { title }); setTitle(""); setAdding(false); if (id) onOpenEpic(id); } };
  const fromTpl = (tid) => { const id = window.sim.addEpicFromTemplate(project.id, milestoneId, subId, tid); setTitle(""); setAdding(false); if (id) onOpenEpic(id); };
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {epics.map((e) => <EpicCard key={e.id} epic={e} skipped={((project.run && project.run.skipped) || []).includes(e.processStepId)} onOpen={() => onOpenEpic(e.id)} />)}
      {canEdit && (
        adding ? (
          <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3 flex flex-col gap-2">
            <input autoFocus value={title} onChange={(ev) => setTitle(ev.target.value)} placeholder="Epik megnevezése"
              onKeyDown={(ev) => { if (ev.key === "Enter") add(); if (ev.key === "Escape") setAdding(false); }}
              className="h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none bg-white" />
            {epicTpls.length > 0 && (
              <div>
                <div className="text-[9.5px] uppercase tracking-wide text-stone-400 font-medium mb-1">Vagy sablonból</div>
                <div className="flex flex-wrap gap-1">
                  {epicTpls.map((tp) => {
                    const om = (window.ACTOR_META || {})[tp.ownerType] || { l: tp.ownerType };
                    return <button key={tp.id} onClick={() => fromTpl(tp.id)} title={`${om.l} · ${(tp.tasks || []).length} task`}
                      className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-white border border-stone-200 text-[10.5px] font-medium text-stone-600 hover:border-teal-300 hover:text-teal-700 transition">
                      <Icon name="box" size={11} />{tp.name}</button>;
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-1.5">
              <button onClick={() => setAdding(false)} className="h-7 px-2.5 rounded-lg text-[11.5px] text-stone-500 hover:bg-stone-100">Mégse</button>
              <button onClick={add} className="h-7 px-2.5 rounded-lg text-[11.5px] font-medium bg-violet-600 text-white">Hozzáad</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="rounded-xl border border-dashed border-stone-300 p-3 min-h-[92px] grid place-items-center text-stone-400 hover:text-violet-700 hover:border-violet-300 transition">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium"><Icon name="plus" size={14} />Epik</span>
          </button>
        )
      )}
      {epics.length === 0 && !canEdit && <div className="text-[12px] text-stone-400 px-1 py-2">Nincs epik.</div>}
    </div>
  );
}

function EpicCard({ epic, onOpen, skipped }) {
  const e = epic;
  const t = epicTone(e.status);
  const am = actorMeta(e.ownerType);
  const tasks = e.tasks || [];
  const doneT = tasks.filter((x) => x.done).length;
  return (
    <button onClick={onOpen} className={`text-left bg-white rounded-xl border border-stone-200 p-3 hover:shadow-md hover:border-stone-300 transition flex flex-col gap-2.5 min-h-[92px] ${skipped ? "opacity-55" : ""}`}>
      <div className="flex items-start gap-2">
        {skipped
          ? <span className="mt-0.5 shrink-0 inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-400"><Icon name="x" size={10} />Kihagyva</span>
          : <span className={`mt-0.5 shrink-0 inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10px] font-semibold ${t.bg} ${t.fg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.l}
            </span>}
        <span className={`text-[12.5px] font-semibold leading-snug flex-1 ${skipped ? "text-stone-400 line-through" : "text-stone-900"}`}>{e.title}</span>
      </div>

      {e.delegatedTo ? (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10.5px] font-medium w-fit max-w-full ${e.delegatedDraft ? "bg-amber-50 text-amber-700" : "bg-teal-50 text-teal-700"}`}>
          <Icon name="external" size={12} className="shrink-0" />
          <span className="truncate">{e.delegatedDraft ? "Draft átadás: " : "Külső partner: "}{e.delegatedTo}{e.delegatedExternal ? " · platformon kívül" : ""}</span>
        </div>
      ) : (
        <span className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[10px] font-medium w-fit ${am.tint}`}>
          <Icon name={am.icon} size={11} />{e.owner || am.l}
        </span>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 text-[10.5px] text-stone-400">
        <span className="font-mono">{e.due || ""}</span>
        {tasks.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-12 h-1 rounded-full bg-stone-200 overflow-hidden"><span className="block h-full bg-emerald-400" style={{ width: (doneT / tasks.length * 100) + "%" }} /></span>
            {doneT}/{tasks.length}
          </span>
        )}
      </div>
    </button>
  );
}

Object.assign(window, {
  ProjectBoard, ProcessApplyPicker, EPIC_TONE, EPIC_FLOW, epicTone, ACTOR_META, actorMeta, HS_TONE, hsTone,
  flattenEpics, milestoneStat, projectEpicSummary,
});
