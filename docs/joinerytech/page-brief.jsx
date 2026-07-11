// ──────────────────────────────────────────────────────────────────────────
// page-brief.jsx — TERVEZÉSI BRIEF UI (data-brief.js modell).
//
//   <BriefSheet briefId onClose />      — teljes szerkesztő (SlideOver): struktu-
//                                          rált igény-mezők + költségkeret + határidő
//                                          + hivatkozások + Q&A hurok + napló.
//   <BriefCard briefId compact />       — beágyazott összefoglaló kártya (koncepció /
//                                          műszaki munkalap / projekt) — készültség,
//                                          nyitott kérdések, „Megnyitás".
//   <BriefButton scope quoteId lineUid projectId title label /> — nyitó gomb, ami a
//                                          briefet létrehozza-ha-kell, majd megnyitja.
//
//   A brief eljut a tervezőkhöz, Q&A ciklusban gazdagodik, naplózva, projektbe megy.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateBR } = React;

const BR_IN = "w-full px-2.5 py-2 rounded-lg border border-stone-200 bg-white text-[12.5px] text-stone-800 outline-none focus:border-violet-400 resize-none leading-relaxed";
const brHuf = (n) => (Number(n) || 0).toLocaleString("hu-HU") + " Ft";

// Auto-commit textarea: lokális state, mentés blur-re (nem minden billentyűre).
function BrField({ value, onCommit, placeholder, rows = 2, disabled }) {
  const [v, setV] = useStateBR(value || "");
  React.useEffect(() => { setV(value || ""); }, [value]);
  return (
    <textarea value={v} disabled={disabled} rows={rows} placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if ((v || "") !== (value || "")) onCommit(v); }}
      className={BR_IN} />
  );
}

// ── Beágyazott összefoglaló kártya ─────────────────────────────────────────
function BriefCard({ briefId, title }) {
  const sim = useSim();
  const [open, setOpen] = useStateBR(false);
  const b = (sim.briefs || []).find((x) => x.id === briefId);
  if (!b) return null;
  const E = window.BriefEngine;
  const comp = E.completeness(b);
  const openQ = E.openQuestions(b).length;
  const preview = (b.fields || {}).func || (b.fields || {}).style || "Nincs kitöltve";
  return (
    <>
      <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-6 h-6 rounded-md bg-violet-600 text-white grid place-items-center shrink-0"><Icon name="chat" size={13} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-stone-900 truncate">{title || "Tervezési brief"}</div>
            <div className="text-[10px] text-stone-500 font-mono">{b.id}{b.scope === "furniture" ? " · bútor" : " · ajánlat"}{b.site ? " · " + b.site : ""}</div>
          </div>
          {openQ > 0 && <span className="shrink-0 px-1.5 h-5 grid place-items-center rounded-full bg-rose-100 text-rose-700 text-[10px] font-semibold">{openQ} nyitott kérdés</span>}
        </div>
        <div className="text-[11.5px] text-stone-600 line-clamp-2 mb-2">{preview}</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden">
            <div className="h-full bg-violet-500" style={{ width: `${comp.pct}%` }} />
          </div>
          <span className="text-[10px] text-stone-500 font-mono shrink-0">{comp.filled}/{comp.total}</span>
          <button onClick={() => setOpen(true)} className="shrink-0 h-7 px-2.5 rounded-lg bg-violet-600 text-white text-[11px] font-medium hover:bg-violet-700 inline-flex items-center gap-1">
            <Icon name="chevron" size={11} /> Megnyitás
          </button>
        </div>
      </div>
      {open && <BriefSheet briefId={briefId} onClose={() => setOpen(false)} />}
    </>
  );
}

// ── Nyitó gomb (létrehozza-ha-kell + megnyitja) ─────────────────────────────
function BriefButton({ scope = "quote", quoteId = null, lineUid = null, projectId = null, title = "", label, tone = "violet", compact }) {
  const [briefId, setBriefId] = useStateBR(null);
  const sim = useSim();
  const existing = scope === "furniture" ? sim.lineBrief && sim.lineBrief(quoteId, lineUid)
    : scope === "quote" && quoteId ? sim.quoteLevelBrief && sim.quoteLevelBrief(quoteId) : null;
  const E = window.BriefEngine;
  const openQ = existing ? E.openQuestions(existing).length : 0;
  const comp = existing ? E.completeness(existing) : null;
  const openIt = () => setBriefId(window.sim.ensureBrief({ scope, quoteId, lineUid, projectId, title }));
  return (
    <>
      <button onClick={openIt}
        className={`inline-flex items-center gap-1.5 rounded-lg border text-[11.5px] font-medium transition ${compact ? "h-7 px-2" : "h-8 px-2.5"} ${existing ? `bg-${tone}-50 text-${tone}-700 border-${tone}-200 hover:bg-${tone}-100` : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`}>
        <Icon name="chat" size={12} /> {label || "Tervezési brief"}
        {existing && comp && <span className="text-[9.5px] font-mono opacity-70">{comp.filled}/{comp.total}</span>}
        {openQ > 0 && <span className="px-1 h-4 grid place-items-center rounded-full bg-rose-500 text-white text-[9px] font-bold">{openQ}</span>}
      </button>
      {briefId && <BriefSheet briefId={briefId} onClose={() => setBriefId(null)} />}
    </>
  );
}

// ── Teljes szerkesztő ───────────────────────────────────────────────────────
function BriefSheet({ briefId, onClose }) {
  const sim = useSim();
  const [curId, setCurId] = useStateBR(briefId);
  React.useEffect(() => { setCurId(briefId); }, [briefId]);
  const [tab, setTab] = useStateBR("brief"); // brief | qa | log
  const [newQ, setNewQ] = useStateBR("");
  const [newRef, setNewRef] = useStateBR("");
  const [newChild, setNewChild] = useStateBR("");
  const [answerFor, setAnswerFor] = useStateBR(null);
  const [answerText, setAnswerText] = useStateBR("");
  const b = (sim.briefs || []).find((x) => x.id === curId);
  if (!b) return null;
  const E = window.BriefEngine;
  const F = window.BRIEF_FIELDS || [];
  const QS = window.BRIEF_Q_STATUS || {};
  const SC = window.BRIEF_SCOPES || {};
  const comp = E.completeness(b);
  const setF = (patch) => window.sim.updateBriefFields(b.id, patch);
  const scMeta = SC[b.scope] || {};
  const childScope = window.briefChildScope(b.scope);
  const childMeta = childScope ? SC[childScope] : null;
  const children = (sim.briefs || []).filter((x) => x.parentBriefId === b.id);
  const chain = [];
  { let cur = b; const guard = new Set(); while (cur && !guard.has(cur.id)) { chain.unshift(cur); guard.add(cur.id); cur = cur.parentBriefId ? (sim.briefs || []).find((x) => x.id === cur.parentBriefId) : null; } }
  const ctx = [b.quoteId, b.projectId].filter(Boolean).join(" · ");

  return (
    <window.SlideOver open onClose={onClose} width={640}
      title={b.title || "Tervezési brief"}
      subtitle={`${b.id} · ${scMeta.label || "Brief"}${ctx ? " · " + ctx : ""}`}
      footer={
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 text-[11px] text-stone-500">
            {comp.ready ? <span className="text-emerald-700">Tervezés-indításra kész (funkció + helyszín + stílus megvan).</span>
              : <span>A tervezés-indítás minimuma: funkció + helyszín + stílus.</span>}
          </div>
          <GhostBtn onClick={onClose}>Bezárás</GhostBtn>
        </div>
      }>
      {chain.length > 1 && (
        <div className="px-5 pt-3 flex items-center gap-1 flex-wrap text-[11px]">
          {chain.map((n, i) => (
            <React.Fragment key={n.id}>
              {i > 0 && <Icon name="chevron" size={10} className="text-stone-300" />}
              <button onClick={() => setCurId(n.id)} disabled={n.id === b.id}
                className={`inline-flex items-center gap-1 px-1.5 h-6 rounded-md ${n.id === b.id ? "bg-violet-100 text-violet-700 font-semibold" : "text-stone-500 hover:bg-stone-100"}`}>
                <Icon name={(SC[n.scope] || {}).icon || "box"} size={10} />{n.name || (SC[n.scope] || {}).label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
      {/* fej — készültség + nyitott kérdések */}
      <div className="px-5 pt-3">
        {!b.parentBriefId && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-1"><Icon name="storefront" size={12} className="text-violet-500" /><span className="text-[11.5px] font-semibold text-stone-800">Helyszín / végügyfél</span></div>
            <BrField value={b.site} onCommit={(v) => window.sim.setBriefSite(b.id, v)} placeholder="pl. Kovács Anna — Petőfi u. 12. (egy ügyfélnek több helyszíne / végügyfele is lehet)" rows={1} />
            <div className="mt-1.5 flex items-center gap-2 text-[10.5px]">
              {b.docId ? (
                <button onClick={() => { onClose(); window._docOpen = b.docId; window.navigateTo?.("docs", "all"); }}
                  className="inline-flex items-center gap-1 text-violet-700 hover:underline">
                  <Icon name="folder" size={11} /> Dokumentumtárban rögzítve: <span className="font-mono">{b.docId}</span>
                </button>
              ) : (
                <button onClick={() => { const d = window.sim.registerBriefDoc(b.id); if (d) window.toast?.("✓ Rögzítve a dokumentumtárban — " + d, "success"); }}
                  className="inline-flex items-center gap-1 text-stone-500 hover:text-violet-700">
                  <Icon name="folder" size={11} /> Rögzítés a dokumentumtárban
                </button>
              )}
            </div>
          </div>
        )}
        <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold">Készültség</span>
              <span className="text-[11px] font-mono text-stone-600">{comp.pct}% · {comp.filled}/{comp.total} mező</span>
            </div>
            <div className="h-2 rounded-full bg-stone-200 overflow-hidden"><div className="h-full bg-violet-500 transition-all" style={{ width: `${comp.pct}%` }} /></div>
          </div>
          <div className="text-center shrink-0">
            <div className={`text-[18px] font-semibold tabular-nums ${E.openQuestions(b).length ? "text-rose-600" : "text-stone-400"}`}>{E.openQuestions(b).length}</div>
            <div className="text-[9.5px] text-stone-500">nyitott kérdés</div>
          </div>
        </div>
        {/* fülek */}
        <div className="flex items-center gap-1 mt-3">
          {[["brief", "Igény-brief"], ["qa", `Kérdések (${E.questionCount(b)})`], ["log", "Napló"]].map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`h-8 px-3 rounded-lg text-[12px] font-medium ${tab === k ? "bg-violet-600 text-white" : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"}`}>{lbl}</button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {tab === "brief" && (
          <>
            {F.map((f) => (
              <div key={f.key}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon name={f.icon} size={12} className="text-violet-500" />
                  <span className="text-[11.5px] font-semibold text-stone-800">{f.label}</span>
                </div>
                <BrField value={(b.fields || {})[f.key]} onCommit={(v) => setF({ [f.key]: v })} placeholder={f.ph} rows={2} />
              </div>
            ))}
            {/* költségkeret + határidő */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1"><Icon name="receipt" size={12} className="text-violet-500" /><span className="text-[11.5px] font-semibold text-stone-800">Költségkeret</span></div>
                <div className="flex items-center gap-1.5">
                  <BrNum value={(b.fields || {}).budgetMin} onCommit={(v) => setF({ budgetMin: v })} placeholder="-tól (Ft)" />
                  <span className="text-stone-400 text-[12px]">–</span>
                  <BrNum value={(b.fields || {}).budgetMax} onCommit={(v) => setF({ budgetMax: v })} placeholder="-ig (Ft)" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1"><Icon name="bell" size={12} className="text-violet-500" /><span className="text-[11.5px] font-semibold text-stone-800">Határidő / ütemezés</span></div>
                <BrField value={(b.fields || {}).deadline} onCommit={(v) => setF({ deadline: v })} placeholder="pl. beköltözés 2026 ősz, felmérés májusban…" rows={1} />
              </div>
            </div>
            {/* hivatkozások */}
            <div>
              <div className="flex items-center gap-1.5 mb-1"><Icon name="paperclip" size={12} className="text-violet-500" /><span className="text-[11.5px] font-semibold text-stone-800">Hivatkozott képek / rajzok / moodboard</span></div>
              <div className="space-y-1.5">
                {(b.refs || []).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 h-9 rounded-lg border border-stone-200 bg-white">
                    <Icon name="paperclip" size={12} className="text-emerald-600 shrink-0" />
                    <span className="flex-1 text-[12px] text-stone-700 truncate">{r}</span>
                    <button onClick={() => window.sim.removeBriefRef(b.id, i)} className="w-6 h-6 grid place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"><Icon name="x" size={12} /></button>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <input value={newRef} onChange={(e) => setNewRef(e.target.value)} placeholder="Fájl / link megnevezése (pl. ügyfél_alaprajz.pdf)"
                    onKeyDown={(e) => { if (e.key === "Enter" && newRef.trim()) { window.sim.addBriefRef(b.id, newRef); setNewRef(""); } }}
                    className="flex-1 h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-violet-400" />
                  <button onClick={() => { if (newRef.trim()) { window.sim.addBriefRef(b.id, newRef); setNewRef(""); } }}
                    className="h-9 px-3 rounded-lg bg-stone-800 text-white text-[11.5px] font-medium hover:bg-stone-700 shrink-0 inline-flex items-center gap-1"><Icon name="plus" size={12} /> Hozzáad</button>
                </div>
              </div>
            </div>
            {childMeta && (
              <div>
                <div className="flex items-center gap-1.5 mb-1"><Icon name={childMeta.icon} size={12} className="text-violet-500" /><span className="text-[11.5px] font-semibold text-stone-800">Alsóbb szintek — {childMeta.label}</span></div>
                <div className="space-y-1.5">
                  {children.map((ch) => {
                    const cc = E.completeness(ch); const oq = E.openQuestions(ch).length; const cm = SC[ch.scope] || {};
                    return (
                      <div key={ch.id} className="flex items-center gap-2 px-2.5 h-10 rounded-lg border border-stone-200 bg-white">
                        <Icon name={cm.icon || "box"} size={13} className="text-violet-500 shrink-0" />
                        <button onClick={() => setCurId(ch.id)} className="flex-1 min-w-0 text-left">
                          <div className="text-[12px] text-stone-800 truncate">{ch.name || cm.label}</div>
                          <div className="text-[9.5px] text-stone-400 font-mono">{ch.id} · {cc.filled}/{cc.total} mező</div>
                        </button>
                        {oq > 0 && <span className="shrink-0 px-1 h-4 grid place-items-center rounded-full bg-rose-500 text-white text-[9px] font-bold">{oq}</span>}
                        <button onClick={() => setCurId(ch.id)} className="shrink-0 w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100"><Icon name="chevron" size={12} /></button>
                        <button onClick={() => { if (confirm(`Törlöd: ${ch.name || cm.label}? (al-szintekkel együtt)`)) window.sim.removeBrief(ch.id); }}
                          className="shrink-0 w-7 h-7 grid place-items-center rounded-md text-stone-300 hover:bg-rose-50 hover:text-rose-600"><Icon name="x" size={12} /></button>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-1.5">
                    <input value={newChild} onChange={(e) => setNewChild(e.target.value)} placeholder={`új ${childMeta.label.toLowerCase()} megnevezése…`}
                      onKeyDown={(e) => { if (e.key === "Enter" && newChild.trim()) { const id = window.sim.addChildBrief(b.id, newChild.trim()); setNewChild(""); if (id) setCurId(id); } }}
                      className="flex-1 h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-violet-400" />
                    <button onClick={() => { if (newChild.trim()) { const id = window.sim.addChildBrief(b.id, newChild.trim()); setNewChild(""); if (id) setCurId(id); } }}
                      className="h-9 px-3 rounded-lg bg-violet-600 text-white text-[11.5px] font-medium hover:bg-violet-700 shrink-0 inline-flex items-center gap-1"><Icon name="plus" size={12} /> {childMeta.label}</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "qa" && (
          <>
            <div className="text-[11px] text-stone-500">Bárki kérdezhet és válaszolhat (értékesítés ↔ belsőépítész ↔ műszaki). A nyitott kérdések a Feladataim-ban is megjelennek.</div>
            {/* új kérdés */}
            <div className="flex items-start gap-1.5">
              <textarea value={newQ} onChange={(e) => setNewQ(e.target.value)} rows={2} placeholder="Új kérdés a tervezéshez — pl. a sarokmegoldás húzós vagy forgó tálcával?" className={BR_IN} />
              <button onClick={() => { if (newQ.trim()) { window.sim.addBriefQuestion(b.id, newQ); setNewQ(""); } }}
                className="h-9 px-3 rounded-lg bg-violet-600 text-white text-[11.5px] font-medium hover:bg-violet-700 shrink-0 inline-flex items-center gap-1"><Icon name="send" size={12} /> Kérdez</button>
            </div>
            {/* kérdés-lista */}
            <div className="space-y-2">
              {((b.questions || []).slice().reverse()).map((q) => {
                const st = QS[q.status] || {};
                return (
                  <div key={q.id} className="rounded-xl border border-stone-200 bg-white p-3">
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 shrink-0 px-1.5 h-5 grid place-items-center rounded-full text-[9.5px] font-semibold border ${st.pill}`}>{st.label}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] text-stone-800 leading-snug">{q.text}</div>
                        <div className="text-[10px] text-stone-400 mt-0.5">{q.by} · {q.ts}</div>
                      </div>
                    </div>
                    {(q.answers || []).length > 0 && (
                      <div className="mt-2 pl-2 border-l-2 border-violet-200 space-y-1.5">
                        {q.answers.map((a, i) => (
                          <div key={i} className="text-[11.5px] text-stone-600"><span className="text-stone-800">{a.text}</span><span className="text-stone-400 text-[10px]"> — {a.by} · {a.ts}</span></div>
                        ))}
                      </div>
                    )}
                    {answerFor === q.id ? (
                      <div className="mt-2 flex items-start gap-1.5">
                        <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} rows={2} placeholder="Válasz…" className={BR_IN} autoFocus />
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => { if (answerText.trim()) { window.sim.answerBriefQuestion(b.id, q.id, answerText); setAnswerText(""); setAnswerFor(null); } }}
                            className="h-8 px-2.5 rounded-lg bg-violet-600 text-white text-[11px] font-medium hover:bg-violet-700">Küld</button>
                          <button onClick={() => { setAnswerFor(null); setAnswerText(""); }} className="h-8 px-2.5 rounded-lg text-[11px] text-stone-500 hover:bg-stone-100">Mégse</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => { setAnswerFor(q.id); setAnswerText(""); }} className="h-7 px-2.5 rounded-lg border border-stone-200 text-[11px] font-medium text-stone-600 hover:bg-stone-50 inline-flex items-center gap-1"><Icon name="send" size={11} /> Válasz</button>
                        {(window.BRIEF_Q_FLOW[q.status] || []).map((to) => (
                          <button key={to} onClick={() => window.sim.setBriefQuestionStatus(b.id, q.id, to)}
                            className="h-7 px-2.5 rounded-lg border border-stone-200 text-[11px] font-medium text-stone-600 hover:bg-stone-50">→ {(QS[to] || {}).label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {!(b.questions || []).length && <div className="text-[11.5px] text-stone-400 text-center py-4">Még nincs kérdés. A tervezők és az értékesítés itt tisztázhatják a nyitott pontokat.</div>}
            </div>
          </>
        )}

        {tab === "log" && (
          <div className="space-y-1.5">
            {(b.history || []).slice().reverse().map((h, i) => {
              const m = (window.BRIEF_LOG_META || {})[h.kind] || { icon: "info" };
              return (
                <div key={i} className="flex items-start gap-2 text-[11.5px]">
                  <span className="w-5 h-5 rounded-md bg-stone-100 text-stone-500 grid place-items-center shrink-0 mt-0.5"><Icon name={m.icon} size={11} /></span>
                  <div className="min-w-0 flex-1">
                    <span className="text-stone-700">{h.label}</span>
                    {h.snapshot && <span className="text-stone-400"> — snapshot: {h.snapshot.openQ} nyitott kérdés, {(h.snapshot.refs || []).length} hivatkozás</span>}
                    <div className="text-[10px] text-stone-400">{h.who} · {h.ts}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </window.SlideOver>
  );
}

function BrNum({ value, onCommit, placeholder }) {
  const [v, setV] = useStateBR(value || "");
  React.useEffect(() => { setV(value || ""); }, [value]);
  return (
    <input type="number" value={v} placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (String(v || "") !== String(value || "")) onCommit(v); }}
      className="flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-right font-mono text-[12px] outline-none focus:border-violet-400" />
  );
}

Object.assign(window, { BriefSheet, BriefCard, BriefButton });
