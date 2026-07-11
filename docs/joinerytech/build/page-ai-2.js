/* AUTO-GENERATED from page-ai-2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-ai-2.jsx — AI MUNKATERÜLET világ (2/2): PLAYGROUND
//   A rendszer-prompt RÉTEGEINEK összefűzése (sim.assembleSystemPrompt:
//   brandContext → projekt → agent → skill → memória) + TÉNYLEGES Claude-hívás
//   (window.claude.complete). Ez a brandContext() első valódi LLM-fogyasztója.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateAi2,
  useEffect: useEffectAi2
} = React;
function AiPlayground() {
  const sim = useSim();
  const agents = sim.aiAgents || [];
  const skills = sim.aiSkills || [];

  // előugró agent (a kanban „Playgroundban futtatom" gombból)
  const preAgent = typeof window !== "undefined" && window.__aiPlaygroundAgent || (agents[0] ? agents[0].id : "");
  const [agentId, setAgentId] = useStateAi2(preAgent);
  const [skillId, setSkillId] = useStateAi2("");
  const [scope, setScope] = useStateAi2("global");
  const [skillValues, setSkillValues] = useStateAi2({});
  const [userMsg, setUserMsg] = useStateAi2("");
  const [running, setRunning] = useStateAi2(false);
  const [response, setResponse] = useStateAi2(null);
  const [error, setError] = useStateAi2(null);
  useEffectAi2(() => {
    if (typeof window !== "undefined") window.__aiPlaygroundAgent = null;
  }, []);
  const agent = agentId ? window.sim.findAiAgent(agentId) : null;
  const agentSkills = window.AiEngine ? window.AiEngine.agentSkills(agent, skills) : [];
  const skill = skillId ? window.sim.findAiSkill(skillId) : null;
  const scopes = window.AI_MEMORY_SCOPE_ORDER || [];
  const projectPrompt = sim.aiProjectPrompt || "";
  const assembled = window.sim.assembleSystemPrompt({
    agentId,
    skillId,
    scope,
    skillValues,
    includeMemory: true
  });
  const hasClaude = typeof window !== "undefined" && window.claude && typeof window.claude.complete === "function";
  const run = async () => {
    if (!hasClaude) {
      setError("A Claude-hívó (window.claude.complete) ebben a környezetben nem érhető el.");
      return;
    }
    setRunning(true);
    setResponse(null);
    setError(null);
    try {
      const sys = assembled.text;
      const task = userMsg.trim() || (skill ? "Hajtsd végre a fenti skill-feladatot." : "Mutatkozz be a fenti szerepkörben egy mondatban.");
      const prompt = sys + "\n\n# === FELADAT (user) ===\n" + task;
      const out = await window.claude.complete({
        messages: [{
          role: "user",
          content: prompt
        }]
      });
      setResponse(out || "(üres válasz)");
      if (agent) window.sim.markAiAgentRun(agent.id);
    } catch (e) {
      setError("Hiba a hívás közben: " + (e && e.message ? e.message : String(e)));
    } finally {
      setRunning(false);
    }
  };
  const layerTone = {
    company: "border-indigo-200 bg-indigo-50",
    project: "border-violet-200 bg-violet-50",
    agent: "border-blue-200 bg-blue-50",
    skill: "border-sky-200 bg-sky-50",
    memory: "border-amber-200 bg-amber-50"
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1320px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Playground"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Rendszer-prompt \xF6ssze\xE1ll\xEDt\xE1s \xE9s t\xE9nyleges Claude-h\xEDv\xE1s \u2014 a brandContext \xE9l\u0151 fogyaszt\xF3ja")), /*#__PURE__*/React.createElement("div", {
    className: `inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] font-medium ${hasClaude ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${hasClaude ? "bg-emerald-500" : "bg-amber-500"}`
  }), hasClaude ? "claude.complete elérhető" : "Claude-hívó offline")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-stone-200 rounded-xl p-4 space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-semibold"
  }, "Konfigur\xE1ci\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Agent"), /*#__PURE__*/React.createElement("select", {
    value: agentId,
    onChange: e => {
      setAgentId(e.target.value);
      setSkillId("");
    },
    className: window.aiInput
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 v\xE1lassz \u2014"), agents.map(a => /*#__PURE__*/React.createElement("option", {
    key: a.id,
    value: a.id
  }, a.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Skill (opcion\xE1lis)"), /*#__PURE__*/React.createElement("select", {
    value: skillId,
    onChange: e => {
      setSkillId(e.target.value);
      setSkillValues({});
    },
    className: window.aiInput
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 nincs \u2014"), agentSkills.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Mem\xF3ria-hat\xF3k\xF6r"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1 bg-stone-100 rounded-lg p-0.5"
  }, scopes.map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    onClick: () => setScope(s),
    className: `flex-1 px-2 h-7 rounded-md text-[11px] font-medium ${scope === s ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"}`
  }, (window.AI_MEMORY_SCOPES[s] || {}).label)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Projekt context ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300 font-mono"
  }, "aiProjectPrompt")), /*#__PURE__*/React.createElement("textarea", {
    rows: 2,
    value: projectPrompt,
    onChange: e => window.sim.setAiProjectPrompt(e.target.value),
    className: window.aiArea,
    placeholder: "pl. 120 m\xB2-es lak\xE1s, minimalista st\xEDlus, hat\xE1rid\u0151 2026-08-01. (a teljes appra \xE9rv\xE9nyes, mentve)"
  }))), skill && (skill.inputs || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-stone-200 rounded-xl p-4 space-y-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-semibold"
  }, "Skill input-v\xE1ltoz\xF3k"), (skill.inputs || []).map(inp => /*#__PURE__*/React.createElement("div", {
    key: inp
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1 font-mono"
  }, `{{${inp}}}`), /*#__PURE__*/React.createElement("input", {
    value: skillValues[inp] || "",
    onChange: e => setSkillValues(v => ({
      ...v,
      [inp]: e.target.value
    })),
    className: window.aiInput,
    placeholder: "érték: " + inp
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-stone-200 rounded-xl p-4 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-semibold"
  }, "Felhaszn\xE1l\xF3i \xFCzenet"), /*#__PURE__*/React.createElement("textarea", {
    rows: 3,
    value: userMsg,
    onChange: e => setUserMsg(e.target.value),
    className: window.aiArea,
    placeholder: "A konkr\xE9t k\xE9r\xE9s/feladat az agentnek..."
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-stone-200 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-semibold mb-2.5"
  }, "\xD6sszef\u0171z\xF6tt r\xE9tegek (", assembled.layers.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, assembled.layers.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: l.key,
    className: `rounded-lg border px-3 py-2 ${layerTone[l.key] || "border-stone-200 bg-stone-50"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-0.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-4 h-4 rounded-full bg-white/70 grid place-items-center text-[9px] font-bold text-stone-500"
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-semibold text-stone-700"
  }, l.label)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 line-clamp-2 leading-snug pl-5.5"
  }, l.body.slice(0, 140), l.body.length > 140 ? "…" : ""))), !assembled.layers.length && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "V\xE1lassz agentet a r\xE9tegek \xF6ssze\xE1ll\xEDt\xE1s\xE1hoz.")))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-900 border border-stone-700 rounded-xl overflow-hidden flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-4 py-2.5 bg-stone-800 border-b border-stone-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-emerald-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400 font-mono"
  }, "system_prompt"), /*#__PURE__*/React.createElement("span", {
    className: "ml-auto text-[10px] text-stone-500"
  }, "~", assembled.tokens, " token")), /*#__PURE__*/React.createElement("pre", {
    className: "p-4 text-[11px] leading-relaxed whitespace-pre-wrap font-mono text-emerald-300/90 overflow-auto",
    style: {
      maxHeight: 320
    }
  }, assembled.text || "# (válassz agentet)"), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-t border-stone-700 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-500"
  }, agent ? agent.name : "nincs agent", skill ? " · " + skill.name : ""), /*#__PURE__*/React.createElement("button", {
    onClick: run,
    disabled: running || !agent,
    className: `inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[12px] font-semibold ${running || !agent ? "bg-stone-700 text-stone-400 cursor-not-allowed" : "bg-indigo-500 hover:bg-indigo-400 text-white"}`
  }, running ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"
  }), "Fut\u2026") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 14
  }), "Teszt futtat\xE1s")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-stone-200 rounded-xl overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-4 py-2.5 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkle",
    size: 14,
    className: "text-indigo-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-semibold text-stone-700"
  }, "V\xE1lasz"), response && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setResponse(null);
      setError(null);
    },
    className: "ml-auto text-[11px] text-stone-400 hover:text-stone-600"
  }, "T\xF6rl\xE9s")), /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, error && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
  }, error), !error && !response && !running && /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-400 py-8 text-center"
  }, "A \u201ETeszt futtat\xE1s\" a fenti rendszer-prompttal h\xEDvja a Claude-ot.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px]"
  }, "A v\xE1lasz a c\xE9g brandContext-j\xE9t, az agent szerepk\xF6r\xE9t \xE9s a mem\xF3ri\xE1t is figyelembe veszi.")), running && /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-400 py-8 text-center inline-flex items-center justify-center gap-2 w-full"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-4 h-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"
  }), "Gener\xE1l\xE1s\u2026"), response && /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] text-stone-800 leading-relaxed whitespace-pre-wrap"
  }, response))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 flex items-start gap-1.5 px-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 13,
    className: "text-stone-300 mt-0.5 shrink-0"
  }), "A h\xEDv\xE1s a be\xE9p\xEDtett ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[10.5px]"
  }, "claude.complete"), " helperrel megy (haiku, 1024 token kimeneti korl\xE1t, felhaszn\xE1l\xF3nk\xE9nt rate-limitelt). A rendszer-prompt minden r\xE9tege a store-b\xF3l \xE9p\xFCl \u2014 nincs k\xFCl\xF6n kulcs vagy backend."))));
}
Object.assign(window, {
  AiPlayground
});
})();
