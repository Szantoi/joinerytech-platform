// ─────────────────────────────────────────────────────────────────
// page-ai-2.jsx — AI MUNKATERÜLET világ (2/2): PLAYGROUND
//   A rendszer-prompt RÉTEGEINEK összefűzése (sim.assembleSystemPrompt:
//   brandContext → projekt → agent → skill → memória) + TÉNYLEGES Claude-hívás
//   (window.claude.complete). Ez a brandContext() első valódi LLM-fogyasztója.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateAi2, useEffect: useEffectAi2 } = React;

function AiPlayground() {
  const sim = useSim();
  const agents = sim.aiAgents || [];
  const skills = sim.aiSkills || [];

  // előugró agent (a kanban „Playgroundban futtatom" gombból)
  const preAgent = (typeof window !== "undefined" && window.__aiPlaygroundAgent) || (agents[0] ? agents[0].id : "");
  const [agentId, setAgentId] = useStateAi2(preAgent);
  const [skillId, setSkillId] = useStateAi2("");
  const [scope, setScope] = useStateAi2("global");
  const [skillValues, setSkillValues] = useStateAi2({});
  const [userMsg, setUserMsg] = useStateAi2("");
  const [running, setRunning] = useStateAi2(false);
  const [response, setResponse] = useStateAi2(null);
  const [error, setError] = useStateAi2(null);

  useEffectAi2(() => { if (typeof window !== "undefined") window.__aiPlaygroundAgent = null; }, []);

  const agent = agentId ? window.sim.findAiAgent(agentId) : null;
  const agentSkills = window.AiEngine ? window.AiEngine.agentSkills(agent, skills) : [];
  const skill = skillId ? window.sim.findAiSkill(skillId) : null;
  const scopes = window.AI_MEMORY_SCOPE_ORDER || [];
  const projectPrompt = sim.aiProjectPrompt || "";

  const assembled = window.sim.assembleSystemPrompt({ agentId, skillId, scope, skillValues, includeMemory: true });
  const hasClaude = typeof window !== "undefined" && window.claude && typeof window.claude.complete === "function";

  const run = async () => {
    if (!hasClaude) { setError("A Claude-hívó (window.claude.complete) ebben a környezetben nem érhető el."); return; }
    setRunning(true); setResponse(null); setError(null);
    try {
      const sys = assembled.text;
      const task = userMsg.trim() || (skill ? "Hajtsd végre a fenti skill-feladatot." : "Mutatkozz be a fenti szerepkörben egy mondatban.");
      const prompt = sys + "\n\n# === FELADAT (user) ===\n" + task;
      const out = await window.claude.complete({ messages: [{ role: "user", content: prompt }] });
      setResponse(out || "(üres válasz)");
      if (agent) window.sim.markAiAgentRun(agent.id);
    } catch (e) {
      setError("Hiba a hívás közben: " + (e && e.message ? e.message : String(e)));
    } finally { setRunning(false); }
  };

  const layerTone = { company: "border-indigo-200 bg-indigo-50", project: "border-violet-200 bg-violet-50", agent: "border-blue-200 bg-blue-50", skill: "border-sky-200 bg-sky-50", memory: "border-amber-200 bg-amber-50" };

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1320px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Playground</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Rendszer-prompt összeállítás és tényleges Claude-hívás — a brandContext élő fogyasztója</p>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] font-medium ${hasClaude ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${hasClaude ? "bg-emerald-500" : "bg-amber-500"}`} />{hasClaude ? "claude.complete elérhető" : "Claude-hívó offline"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BAL: konfiguráció */}
        <div className="space-y-3.5">
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3.5">
            <div className="text-[11px] uppercase tracking-wide text-stone-400 font-semibold">Konfiguráció</div>
            <div className="grid grid-cols-2 gap-2.5">
              <div><label className="text-[10.5px] text-stone-500 block mb-1">Agent</label>
                <select value={agentId} onChange={(e) => { setAgentId(e.target.value); setSkillId(""); }} className={window.aiInput}><option value="">— válassz —</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              <div><label className="text-[10.5px] text-stone-500 block mb-1">Skill (opcionális)</label>
                <select value={skillId} onChange={(e) => { setSkillId(e.target.value); setSkillValues({}); }} className={window.aiInput}><option value="">— nincs —</option>{agentSkills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            </div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Memória-hatókör</label>
              <div className="flex gap-1 bg-stone-100 rounded-lg p-0.5">{scopes.map((s) => <button key={s} onClick={() => setScope(s)} className={`flex-1 px-2 h-7 rounded-md text-[11px] font-medium ${scope === s ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"}`}>{(window.AI_MEMORY_SCOPES[s] || {}).label}</button>)}</div></div>
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Projekt context <span className="text-stone-300 font-mono">aiProjectPrompt</span></label>
              <textarea rows={2} value={projectPrompt} onChange={(e) => window.sim.setAiProjectPrompt(e.target.value)} className={window.aiArea} placeholder="pl. 120 m²-es lakás, minimalista stílus, határidő 2026-08-01. (a teljes appra érvényes, mentve)" /></div>
          </div>

          {/* Skill input-változók */}
          {skill && (skill.inputs || []).length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2.5">
              <div className="text-[11px] uppercase tracking-wide text-stone-400 font-semibold">Skill input-változók</div>
              {(skill.inputs || []).map((inp) => (
                <div key={inp}><label className="text-[10.5px] text-stone-500 block mb-1 font-mono">{`{{${inp}}}`}</label>
                  <input value={skillValues[inp] || ""} onChange={(e) => setSkillValues((v) => ({ ...v, [inp]: e.target.value }))} className={window.aiInput} placeholder={"érték: " + inp} /></div>
              ))}
            </div>
          )}

          {/* User üzenet */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-stone-400 font-semibold">Felhasználói üzenet</div>
            <textarea rows={3} value={userMsg} onChange={(e) => setUserMsg(e.target.value)} className={window.aiArea} placeholder="A konkrét kérés/feladat az agentnek..." />
          </div>

          {/* Rétegek */}
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wide text-stone-400 font-semibold mb-2.5">Összefűzött rétegek ({assembled.layers.length})</div>
            <div className="space-y-1.5">
              {assembled.layers.map((l, i) => (
                <div key={l.key} className={`rounded-lg border px-3 py-2 ${layerTone[l.key] || "border-stone-200 bg-stone-50"}`}>
                  <div className="flex items-center gap-1.5 mb-0.5"><span className="w-4 h-4 rounded-full bg-white/70 grid place-items-center text-[9px] font-bold text-stone-500">{i + 1}</span><span className="text-[11px] font-semibold text-stone-700">{l.label}</span></div>
                  <div className="text-[10.5px] text-stone-500 line-clamp-2 leading-snug pl-5.5">{l.body.slice(0, 140)}{l.body.length > 140 ? "…" : ""}</div>
                </div>
              ))}
              {!assembled.layers.length && <div className="text-[12px] text-stone-400">Válassz agentet a rétegek összeállításához.</div>}
            </div>
          </div>
        </div>

        {/* JOBB: összesített prompt + futtatás + válasz */}
        <div className="space-y-3.5">
          <div className="bg-stone-900 border border-stone-700 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 border-b border-stone-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-stone-400 font-mono">system_prompt</span>
              <span className="ml-auto text-[10px] text-stone-500">~{assembled.tokens} token</span>
            </div>
            <pre className="p-4 text-[11px] leading-relaxed whitespace-pre-wrap font-mono text-emerald-300/90 overflow-auto" style={{ maxHeight: 320 }}>{assembled.text || "# (válassz agentet)"}</pre>
            <div className="px-4 py-3 border-t border-stone-700 flex items-center justify-between">
              <span className="text-[10.5px] text-stone-500">{agent ? agent.name : "nincs agent"}{skill ? " · " + skill.name : ""}</span>
              <button onClick={run} disabled={running || !agent} className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[12px] font-semibold ${running || !agent ? "bg-stone-700 text-stone-400 cursor-not-allowed" : "bg-indigo-500 hover:bg-indigo-400 text-white"}`}>
                {running ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Fut…</> : <><Icon name="send" size={14} />Teszt futtatás</>}
              </button>
            </div>
          </div>

          {/* Válasz */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-stone-100">
              <Icon name="sparkle" size={14} className="text-indigo-500" />
              <span className="text-[12px] font-semibold text-stone-700">Válasz</span>
              {response && <button onClick={() => { setResponse(null); setError(null); }} className="ml-auto text-[11px] text-stone-400 hover:text-stone-600">Törlés</button>}
            </div>
            <div className="p-4">
              {error && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}
              {!error && !response && !running && <div className="text-[12.5px] text-stone-400 py-8 text-center">A „Teszt futtatás" a fenti rendszer-prompttal hívja a Claude-ot.<br /><span className="text-[11px]">A válasz a cég brandContext-jét, az agent szerepkörét és a memóriát is figyelembe veszi.</span></div>}
              {running && <div className="text-[12.5px] text-stone-400 py-8 text-center inline-flex items-center justify-center gap-2 w-full"><span className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />Generálás…</div>}
              {response && <div className="text-[13px] text-stone-800 leading-relaxed whitespace-pre-wrap">{response}</div>}
            </div>
          </div>

          <div className="text-[11px] text-stone-400 flex items-start gap-1.5 px-1">
            <Icon name="info" size={13} className="text-stone-300 mt-0.5 shrink-0" />
            A hívás a beépített <span className="font-mono text-[10.5px]">claude.complete</span> helperrel megy (haiku, 1024 token kimeneti korlát, felhasználónként rate-limitelt). A rendszer-prompt minden rétege a store-ból épül — nincs külön kulcs vagy backend.
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AiPlayground });
