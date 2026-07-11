// ──────────────────────────────────────────────────────────────────────────
// page-projects-epic.jsx — Epik (FlowEpic) részletek + FSM + B2BHandshake.
//
//   - FSM-vezérlők: a tiltott átmenet gombja LEZÁRT (disabled + tooltip), nem
//     rejtett. CLOSED_BLOCKED-hoz indoklás kötelező.
//   - Delegálás: epik kiadása platform-partnernek → kézfogás (handshakes[]).
//   - Taskök: pipálható lépések az epiken belül.
//   Konstansok a page-projects-board.jsx-ből (window.EPIC_TONE, ACTOR_META…).
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateEP } = React;

// Kanonikus FSM-műveletek — mindig MIND látszik; ami tiltott, LEZÁRT.
const EPIC_ACTIONS = [
  { to: "IN_DEV",         label: "Indítás",          icon: "production", cls: "bg-sky-600 hover:bg-sky-700" },
  { to: "IN_REVIEW",      label: "Ellenőrzésre",     icon: "send",       cls: "bg-amber-600 hover:bg-amber-700" },
  { to: "CLOSED_DONE",    label: "Kész — lezár",     icon: "check",      cls: "bg-emerald-600 hover:bg-emerald-700" },
  { to: "CLOSED_BLOCKED", label: "Blokkol",          icon: "alert",      cls: "bg-rose-600 hover:bg-rose-700" },
  { to: "BACKLOG_READY",  label: "Újranyit",         icon: "workflow",   cls: "bg-stone-700 hover:bg-stone-800" },
];
const LOCK_REASON = {
  CLOSED_DONE: "Fázis nem ugorható át — előbb ellenőrzésre kell küldeni.",
  BACKLOG_READY: "Visszalépés csak blokkoláson keresztül lehetséges.",
  _closed: "Lezárt epik nem nyílik vissza — csak új verzió hozható létre.",
  _generic: "Nem engedélyezett átmenet a jelenlegi állapotból.",
};

function EpicDetail({ project, loc, onClose, canEdit }) {
  const s = useSim();
  const EPIC_TONE = window.EPIC_TONE, EPIC_FLOW = window.EPIC_FLOW, actorMeta = window.actorMeta, hsTone = window.hsTone;
  const p = project;
  // re-read live epic from store (props loc may be stale after a transition)
  const live = window.sim.findEpic(p.id, loc.epic.id) || loc;
  const e = live.epic, m = live.milestone, sub = live.sub;
  const t = EPIC_TONE[e.status] || EPIC_TONE.BACKLOG_READY;
  const am = actorMeta(e.ownerType);
  const me = window.sim.currentAccount();

  const [blocking, setBlocking] = useStateEP(false);
  const [reason, setReason] = useStateEP("");
  const [delegOpen, setDelegOpen] = useStateEP(false);
  const [newTask, setNewTask] = useStateEP("");

  const hs = e.handshakeId ? (s.handshakes || []).find((h) => h.id === e.handshakeId) : null;
  const tasks = e.tasks || [];
  const doneT = tasks.filter((x) => x.done).length;

  const doTransition = (to) => {
    if (to === "CLOSED_BLOCKED") { setBlocking(true); return; }
    window.sim.setEpicStatus(p.id, e.id, to);
  };
  const confirmBlock = () => { if (window.sim.setEpicStatus(p.id, e.id, "CLOSED_BLOCKED", { reason })) { setBlocking(false); setReason(""); } };

  return (
    <SlideOver open={true} onClose={onClose} title={e.title} width={520}
      subtitle={`${m.name}${sub ? " · " + sub.name : ""}`}
      footer={
        <div className="w-full">
          {canEdit ? (
            blocking ? (
              <div className="w-full space-y-2">
                <textarea autoFocus value={reason} onChange={(ev) => setReason(ev.target.value)} rows={2}
                  placeholder="Blokkolás indoka (kötelező) — pl. hiányzó anyag, ügyfél-egyeztetés…"
                  className="w-full px-3 py-2 rounded-lg border border-rose-200 text-[12.5px] outline-none focus:border-rose-400 resize-none" />
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => { setBlocking(false); setReason(""); }} className="h-9 px-3 rounded-lg text-[12px] text-stone-600 hover:bg-stone-100">Mégse</button>
                  <button onClick={confirmBlock} disabled={!reason.trim()}
                    className="h-9 px-3.5 rounded-lg text-[12.5px] font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5">
                    <Icon name="alert" size={14} />Blokkoltra zár
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 w-full flex-wrap">
                {EPIC_ACTIONS.map((a) => {
                  if (a.to === e.status) return null;
                  // újranyit csak blokkoltból releváns; ne mutassuk máshol zajként
                  if (a.to === "BACKLOG_READY" && e.status !== "CLOSED_BLOCKED") return null;
                  const allowed = window.sim.epicCanTransition(e.status, a.to);
                  const reasonTip = !allowed
                    ? (e.status === "CLOSED_DONE" ? LOCK_REASON._closed : (LOCK_REASON[a.to] || LOCK_REASON._generic))
                    : "";
                  return (
                    <button key={a.to} onClick={() => allowed && doTransition(a.to)} disabled={!allowed} title={reasonTip}
                      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-medium text-white transition ${allowed ? a.cls : "bg-stone-200 !text-stone-400 cursor-not-allowed"}`}>
                      <Icon name={allowed ? a.icon : "lock"} size={13} />{a.label}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="text-[11.5px] text-stone-400 inline-flex items-center gap-1.5"><Icon name="lock" size={13} />Csak megtekintés — az állapotot a gyártó / végrehajtó lépteti.</div>
          )}
        </div>
      }>
      <div className="px-5 py-5 space-y-5">
        {/* status + FSM stepper */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[12px] font-semibold ${t.bg} ${t.fg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.l}
            </span>
            <span className="text-[11.5px] text-stone-400">FlowEpic · {e.id}</span>
          </div>
          <FsmStepper status={e.status} />
          {e.status === "CLOSED_BLOCKED" && e.blockReason && (
            <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-[11.5px] text-rose-700">
              <Icon name="alert" size={14} className="mt-0.5 shrink-0" /><span><span className="font-semibold">Blokkolás oka:</span> {e.blockReason}</span>
            </div>
          )}
        </div>

        {/* owner + due */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-stone-200 p-3">
            <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Felelős</div>
            <span className={`inline-flex items-center gap-1.5 px-2 h-6 rounded-md text-[11.5px] font-medium ${am.tint}`}><Icon name={am.icon} size={12} />{am.l}</span>
            <div className="text-[12.5px] text-stone-800 mt-1.5">{e.owner || "—"}</div>
          </div>
          <div className="rounded-xl border border-stone-200 p-3">
            <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Határidő</div>
            <div className="text-[13px] font-mono text-stone-800 mt-1">{e.due || "—"}</div>
          </div>
        </div>

        {/* B2BHandshake */}
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2">Kézfogás (B2B delegálás)</div>
          {hs ? (
            <HandshakeCard hs={hs} side="from" canEdit={canEdit} />
          ) : e.delegatedTo ? (
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 text-[12px] text-teal-800 flex items-center gap-2">
              <Icon name="external" size={15} /><span>Külső partner: <span className="font-semibold">{e.delegatedTo}</span></span>
            </div>
          ) : canEdit && me.actorType === "manufacturer" ? (
            delegOpen ? (
              <PartnerPicker onPick={(pid) => { window.sim.delegateEpic(p.id, e.id, pid); setDelegOpen(false); }} onClose={() => setDelegOpen(false)} />
            ) : (
              <button onClick={() => setDelegOpen(true)} className="w-full rounded-xl border border-dashed border-stone-300 px-3 py-3 text-[12px] font-medium text-stone-500 hover:text-teal-700 hover:border-teal-300 inline-flex items-center justify-center gap-2 transition">
                <Icon name="external" size={15} />Kiadás partnernek (kézfogás)
              </button>
            )
          ) : (
            <div className="text-[11.5px] text-stone-400">Belső munka — nincs delegálva.</div>
          )}
        </div>

        {/* tasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Taskök {tasks.length > 0 && <span className="text-stone-400">· {doneT}/{tasks.length}</span>}</div>
          </div>
          <div className="rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
            {tasks.map((tk) => (
              <button key={tk.id} onClick={() => canEdit && window.sim.toggleEpicTask(p.id, e.id, tk.id)} disabled={!canEdit}
                className="w-full px-3 py-2.5 flex items-center gap-2.5 text-left hover:bg-stone-50 disabled:hover:bg-transparent">
                <span className={`w-5 h-5 rounded-md grid place-items-center shrink-0 border ${tk.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-stone-300 text-transparent"}`}><Icon name="check" size={13} /></span>
                <span className={`text-[12.5px] flex-1 ${tk.done ? "text-stone-400 line-through" : "text-stone-800"}`}>{tk.title}</span>
                {tk.assignee && <span className="text-[10.5px] text-stone-400 shrink-0">{tk.assignee}</span>}
              </button>
            ))}
            {tasks.length === 0 && <div className="px-3 py-3 text-[11.5px] text-stone-400">Nincs task.</div>}
            {canEdit && (
              <div className="px-3 py-2 flex items-center gap-2 bg-stone-50/50">
                <input value={newTask} onChange={(ev) => setNewTask(ev.target.value)} placeholder="Új task…"
                  onKeyDown={(ev) => { if (ev.key === "Enter" && newTask.trim()) { window.sim.addEpicTask(p.id, e.id, newTask); setNewTask(""); } }}
                  className="flex-1 h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none bg-white" />
                <button onClick={() => { if (newTask.trim()) { window.sim.addEpicTask(p.id, e.id, newTask); setNewTask(""); } }} className="w-8 h-8 grid place-items-center rounded-lg border border-stone-300 text-stone-600 hover:bg-white"><Icon name="plus" size={14} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </SlideOver>
  );
}

function FsmStepper({ status }) {
  const EPIC_TONE = window.EPIC_TONE, EPIC_FLOW = window.EPIC_FLOW;
  const blocked = status === "CLOSED_BLOCKED";
  const idx = EPIC_FLOW.indexOf(status);
  return (
    <div className="flex items-center">
      {EPIC_FLOW.map((st, i) => {
        const tn = EPIC_TONE[st];
        const reached = !blocked && idx >= i;
        const current = status === st;
        return (
          <React.Fragment key={st}>
            {i > 0 && <div className={`flex-1 h-0.5 ${!blocked && idx >= i ? "bg-stone-700" : "bg-stone-200"}`} />}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className={`w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ring-2 ring-white ${current ? tn.solid + " text-white" : reached ? "bg-stone-700 text-white" : "bg-stone-200 text-stone-400"}`}>
                {reached && !current ? <Icon name="check" size={12} /> : i + 1}
              </span>
              <span className={`text-[9px] font-medium ${current ? tn.fg : "text-stone-400"}`}>{tn.l}</span>
            </div>
          </React.Fragment>
        );
      })}
      {blocked && (
        <>
          <div className="flex-1 h-0.5 bg-rose-200" />
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="w-6 h-6 rounded-full grid place-items-center bg-rose-500 text-white ring-2 ring-white"><Icon name="alert" size={12} /></span>
            <span className="text-[9px] font-medium text-rose-600">Blokkolt</span>
          </div>
        </>
      )}
    </div>
  );
}

function PartnerPicker({ onPick, onClose }) {
  const s = useSim();
  const actorMeta = window.actorMeta;
  const [q, setQ] = useStateEP("");
  const partners = (s.partners || []).filter((pt) => pt.name.toLowerCase().includes(q.toLowerCase()) || pt.specialty.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="rounded-xl border border-teal-200 bg-white p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 grid place-items-center shrink-0"><Icon name="search" size={14} /></span>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Partner keresése (név, szakterület)…"
          className="flex-1 h-8 text-[12.5px] outline-none" />
        <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"><Icon name="x" size={14} /></button>
      </div>
      <div className="space-y-1 max-h-[260px] overflow-y-auto">
        {partners.map((pt) => {
          const am = actorMeta(pt.actorType);
          return (
            <button key={pt.id} onClick={() => onPick(pt.id)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-teal-50/60 text-left transition">
              <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${am.tint}`}><Icon name={am.icon} size={15} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-semibold text-stone-900 truncate">{pt.name}</span>
                  {pt.platform
                    ? <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold uppercase tracking-wide">platform</span>
                    : <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-bold uppercase tracking-wide">külső</span>}
                </div>
                <div className="text-[10.5px] text-stone-500 truncate">{pt.specialty}</div>
              </div>
              <Icon name="chevron" size={15} className="text-stone-300 shrink-0" />
            </button>
          );
        })}
        {partners.length === 0 && <div className="px-2 py-3 text-[11.5px] text-stone-400 text-center">Nincs találat.</div>}
      </div>
      <div className="text-[10px] text-stone-400 px-1 leading-relaxed">Platform-partnernél kézfogás indul (ő a saját rendszerében látja). Külső partnernél hivatkozás jön létre, kézi státusszal.</div>
    </div>
  );
}

// side: "from" = delegáló nézet, "to" = fogadó (inbox) nézet
function HandshakeCard({ hs, side = "from", canEdit }) {
  const s = useSim();
  const tn = window.hsTone(hs);
  const isDraft = hs.status === "draft";
  const [picking, setPicking] = useStateEP(false);
  const partners = (s.partners || []).filter((pt) => pt.actorType === (hs.partnerType || "supplier"));
  return (
    <div className={`rounded-xl border overflow-hidden ${isDraft ? "border-amber-200" : "border-stone-200"}`}>
      <div className={`px-3 py-2.5 flex items-center gap-2.5 border-b ${isDraft ? "bg-amber-50/60 border-amber-100" : "bg-stone-50/60 border-stone-100"}`}>
        <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${isDraft ? "bg-amber-100 text-amber-700" : "bg-teal-50 text-teal-600"}`}><Icon name="external" size={15} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-stone-900 truncate">
            {side === "from" ? (isDraft ? "Előkészített átadás" : `Kiadva → ${hs.partnerName}`) : `Megbízás ${hs.fromCompany}-tól`}
          </div>
          <div className="text-[10.5px] text-stone-500">{hs.ts}</div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${tn.bg} ${tn.fg} shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${tn.dot}`} />{tn.l}
        </span>
      </div>

      {/* draft: editable partner + note + send */}
      {isDraft && side === "from" ? (
        <div className="p-3 space-y-2.5">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Partner ({window.actorMeta(hs.partnerType || "supplier").l})</div>
            {picking ? (
              <div className="space-y-1">
                {partners.map((pt) => (
                  <button key={pt.id} onClick={() => { window.sim.updateHandshake(hs.id, { partnerId: pt.id, partnerName: pt.name }); setPicking(false); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-50/60 text-left">
                    <span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${window.actorMeta(pt.actorType).tint}`}><Icon name={window.actorMeta(pt.actorType).icon} size={13} /></span>
                    <span className="text-[12px] font-medium text-stone-800 flex-1 truncate">{pt.name}</span>
                    {pt.platform ? <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold uppercase">platform</span> : <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-bold uppercase">külső</span>}
                  </button>
                ))}
                {partners.length === 0 && <div className="text-[11px] text-stone-400 px-1 py-1">Nincs {window.actorMeta(hs.partnerType).l} partner.</div>}
              </div>
            ) : (
              <button onClick={() => canEdit && setPicking(true)} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-stone-200 hover:border-amber-300 text-left">
                <Icon name="external" size={14} className="text-stone-400 shrink-0" />
                <span className="text-[12px] font-medium text-stone-800 flex-1 truncate">{hs.partnerName || "— válassz partnert —"}</span>
                {canEdit && <Icon name="chevron" size={14} className="text-stone-300 rotate-90 shrink-0" />}
              </button>
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Megjegyzés a partnernek</div>
            <textarea value={hs.note || ""} onChange={(e) => window.sim.updateHandshake(hs.id, { note: e.target.value })} rows={2} disabled={!canEdit}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-amber-400 resize-none" />
          </div>
          {canEdit && (
            <div className="flex items-center justify-end gap-2 pt-0.5">
              <button onClick={() => window.sim.declineDelegation(hs.id)} className="h-8 px-3 rounded-lg text-[12px] font-medium text-stone-500 hover:bg-stone-100">Elvet</button>
              <button onClick={() => window.sim.sendHandshake(hs.id)} disabled={!hs.partnerId}
                className="h-8 px-3.5 rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 bg-teal-600 text-white hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400">
                <Icon name="send" size={13} />Átadás küldése
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {hs.note && <div className="px-3 py-2 text-[11.5px] text-stone-600 border-b border-stone-100">{hs.note}</div>}
          {side === "to" && (hs.status === "sent" || hs.status === "accepted") && (
            <div className="px-3 py-2.5 flex items-center gap-2 justify-end">
              {hs.status === "sent" && (
                <>
                  <button onClick={() => window.sim.declineDelegation(hs.id)} className="h-8 px-3 rounded-lg text-[12px] font-medium border border-stone-200 text-stone-600 hover:bg-stone-50">Visszautasít</button>
                  <button onClick={() => window.sim.acceptDelegation(hs.id)} className="h-8 px-3.5 rounded-lg text-[12px] font-medium bg-teal-600 text-white hover:bg-teal-700 inline-flex items-center gap-1.5"><Icon name="check" size={13} />Elfogad</button>
                </>
              )}
              {hs.status === "accepted" && (
                <button onClick={() => window.sim.completeDelegation(hs.id)} className="h-8 px-3.5 rounded-lg text-[12px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1.5"><Icon name="check" size={13} />Kész — visszajelez</button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Fogadó oldal: beérkezett megbízások (supplier / installer nézet) ─────────
function InboxBoard() {
  const s = useSim();
  const me = window.sim.currentAccount();
  const all = window.sim.incomingHandshakes();
  const fresh = all.filter((h) => h.status === "sent");
  const active = all.filter((h) => h.status === "accepted");
  const history = all.filter((h) => h.status === "done" || h.status === "declined");
  const Group = ({ label, items, hint }) => items.length === 0 ? null : (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-[11px] uppercase tracking-wide text-stone-500 font-semibold">{label}</div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-bold">{items.length}</span>
        {hint && <span className="text-[10.5px] text-stone-400">{hint}</span>}
      </div>
      <div className="grid md:grid-cols-2 gap-2.5">
        {items.map((h) => (
          <div key={h.id} className="space-y-1.5">
            <div className="text-[12px] font-semibold text-stone-800 px-0.5">{h.epicTitle}<span className="text-stone-400 font-normal"> · {h.projectName}</span></div>
            <HandshakeCard hs={h} side="to" />
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="mb-4">
        <div className="text-[18px] md:text-[20px] font-semibold text-stone-900 tracking-tight">Beérkezett megbízások</div>
        <div className="text-[12px] text-stone-500">{me.name} · {(window.ACTOR_META[me.actorType] || {}).l || me.actorType} — kézfogással kiadott epikek más cégektől</div>
      </div>
      {all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-stone-100 grid place-items-center text-stone-400 mb-3"><Icon name="inbox" size={22} /></div>
          <div className="text-[14px] font-semibold text-stone-700">Nincs beérkezett megbízás</div>
          <div className="text-[12px] text-stone-500 mt-1">Amikor egy gyártó kiad neked egy epikot, itt jelenik meg — elfogadhatod vagy visszautasíthatod.</div>
        </div>
      ) : (
        <div className="space-y-6">
          <Group label="Új — válaszra vár" items={fresh} hint="fogadd el vagy utasítsd vissza" />
          <Group label="Folyamatban" items={active} hint="ha kész, jelezd vissza ellenőrzésre" />
          <Group label="Lezárt" items={history} />
        </div>
      )}
    </div>
  );
}

Object.assign(window, { EpicDetail, FsmStepper, PartnerPicker, HandshakeCard, InboxBoard });