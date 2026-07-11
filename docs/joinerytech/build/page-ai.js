/* AUTO-GENERATED from page-ai.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-ai.jsx — AI MUNKATERÜLET világ (1/2)
//   Agent Kanban + Skill-ek + Memória + közös badge-ek.
//   A Playground (rendszer-prompt összeállítás + Claude-hívás) → page-ai-2.jsx.
//   Store: window.sim.aiAgents / aiSkills / aiMemory + akciók; AiEngine.
//   Minden írás ai.manage joghoz kötött (a store guardol; az UI lock-ot mutat).
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateAi
} = React;
const AI_TINTS = {
  indigo: {
    card: "bg-indigo-50 border-indigo-200",
    chip: "bg-indigo-100 text-indigo-700 border-indigo-200",
    dot: "#4f46e5"
  },
  violet: {
    card: "bg-violet-50 border-violet-200",
    chip: "bg-violet-100 text-violet-700 border-violet-200",
    dot: "#7c3aed"
  },
  rose: {
    card: "bg-rose-50 border-rose-200",
    chip: "bg-rose-100 text-rose-700 border-rose-200",
    dot: "#e11d48"
  },
  sky: {
    card: "bg-sky-50 border-sky-200",
    chip: "bg-sky-100 text-sky-700 border-sky-200",
    dot: "#0284c7"
  },
  lime: {
    card: "bg-lime-50 border-lime-200",
    chip: "bg-lime-100 text-lime-700 border-lime-200",
    dot: "#65a30d"
  },
  amber: {
    card: "bg-amber-50 border-amber-200",
    chip: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "#d97706"
  }
};
const aiTint = t => AI_TINTS[t] || AI_TINTS.indigo;
function AiStageBadge({
  stage,
  size = "md"
}) {
  const m = (window.AI_AGENT_STAGES || {})[stage] || {
    label: stage,
    tone: "bg-stone-100 text-stone-600 border-stone-200",
    dot: "#a8a29e"
  };
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${m.tone}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full",
    style: {
      background: m.dot
    }
  }), m.label);
}
function AiScopeBadge({
  scope
}) {
  const m = (window.AI_MEMORY_SCOPES || {})[scope] || {
    label: scope,
    badge: "bg-stone-100 text-stone-600"
  };
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center px-2 h-5 rounded text-[10px] font-semibold ${m.badge}`
  }, m.label);
}
function AiSkillChip({
  skill,
  onClick
}) {
  if (!skill) return null;
  const t = aiTint(skill.tint);
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    className: `inline-flex items-center px-2 h-6 rounded-full border text-[11px] font-medium ${t.chip} ${onClick ? "cursor-pointer hover:opacity-80" : ""}`
  }, skill.name);
}
const aiCanManage = () => window.sim.hasPerm("ai.manage");
function AiLockHint({
  what
}) {
  if (aiCanManage()) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[11.5px] text-stone-500 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13
  }), what || "A szerkesztéshez", " ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "ai.manage"), " jog kell.");
}

// ── input ──────────────────────────────────────────────────────────
const aiInput = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300";
const aiArea = "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12px] text-stone-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-y";

// ═══════════════════════════════════════════════════════════════════
// 1) AGENT KANBAN
// ═══════════════════════════════════════════════════════════════════
function AiAgentsBoard({
  onScreen
}) {
  const sim = useSim();
  const agents = sim.aiAgents || [];
  const skills = sim.aiSkills || [];
  const memory = sim.aiMemory || [];
  const [openId, setOpenId] = useStateAi(null);
  const [addOpen, setAddOpen] = useStateAi(false);
  const stages = window.AI_AGENT_STAGE_ORDER || ["definialt", "aktiv", "varakozik", "archivalt"];
  const byStage = st => agents.filter(a => (a.stage || "definialt") === st);
  const memCount = id => memory.filter(m => m.agentId === id).length;
  const can = aiCanManage();
  const AgentCard = ({
    a
  }) => {
    const ags = window.AiEngine ? window.AiEngine.agentSkills(a, skills) : [];
    const active = (a.stage || "definialt") === "aktiv";
    return /*#__PURE__*/React.createElement("div", {
      onClick: () => setOpenId(a.id),
      className: "bg-white rounded-xl border border-stone-200 p-3.5 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 mb-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-2 h-2 rounded-full shrink-0",
      style: {
        background: active ? "#34d399" : "#d6d3d1"
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-semibold text-stone-900 flex-1 truncate"
    }, a.name)), /*#__PURE__*/React.createElement("p", {
      className: "text-[11px] text-stone-500 leading-snug mb-2.5 line-clamp-2"
    }, a.role), ags.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1 mb-2"
    }, ags.slice(0, 3).map(s => /*#__PURE__*/React.createElement(AiSkillChip, {
      key: s.id,
      skill: s
    })), ags.length > 3 && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-stone-400 self-center"
    }, "+", ags.length - 3)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between text-[10px] text-stone-400 pt-2 border-t border-stone-100"
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "layers",
      size: 11
    }), memCount(a.id), " mem\xF3ria"), /*#__PURE__*/React.createElement("span", null, a.lastRun ? "Utolsó: " + a.lastRun : "Még nem futott")));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1280px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Agent Kanban"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "N\xE9vvel rendelkez\u0151 AI-szerepk\xF6r\xF6k \u2014 defini\xE1l\xE1st\xF3l az akt\xEDv fut\xE1sig")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 shrink-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("playground"),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-stone-200 bg-white text-stone-700 text-[12.5px] font-medium hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 15,
    className: "text-indigo-500"
  }), "Playground"), /*#__PURE__*/React.createElement("button", {
    onClick: () => can ? setAddOpen(true) : window.toast("Nincs jogosultság (ai.manage).", "error"),
    className: `inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-white text-[12.5px] font-medium ${can ? "bg-indigo-600 hover:bg-indigo-700" : "bg-stone-300 cursor-not-allowed"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: can ? "plus" : "lock",
    size: 15
  }), "\xDAj agent"))), /*#__PURE__*/React.createElement(AiPromptChainStrip, null), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 overflow-x-auto pb-2"
  }, stages.map(st => {
    const meta = (window.AI_AGENT_STAGES || {})[st] || {};
    const list = byStage(st);
    return /*#__PURE__*/React.createElement("div", {
      key: st,
      className: "min-w-[244px] max-w-[272px] flex-shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 mb-2.5 px-0.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-2.5 h-2.5 rounded-full shrink-0",
      style: {
        background: meta.dot
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] font-semibold uppercase tracking-wide text-stone-500"
    }, meta.label), /*#__PURE__*/React.createElement("span", {
      className: "ml-auto text-[10px] text-stone-400"
    }, list.length)), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col gap-2.5"
    }, list.map(a => /*#__PURE__*/React.createElement(AgentCard, {
      key: a.id,
      a: a
    })), !list.length && /*#__PURE__*/React.createElement("div", {
      className: "border-2 border-dashed border-stone-200 rounded-xl h-20 grid place-items-center text-[11px] text-stone-300"
    }, "\xDCres")));
  })), openId && /*#__PURE__*/React.createElement(AiAgentDetail, {
    agentId: openId,
    onClose: () => setOpenId(null)
  }), addOpen && /*#__PURE__*/React.createElement(AiAgentSheet, {
    onClose: () => setAddOpen(false)
  }));
}

// ── Prompt-lánc vizualizáció (a rendszer-prompt rétegei) ───────────
function AiPromptChainStrip() {
  const steps = [{
    label: "Cég context",
    sub: "brandContext()",
    live: true
  }, {
    label: "Projekt context",
    sub: "aiProjectPrompt"
  }, {
    label: "Agent szerepkör",
    sub: "agent.systemPrompt"
  }, {
    label: "Skill sablon",
    sub: "skill.promptTemplate"
  }, {
    label: "Memória",
    sub: "aiMemory (scope)"
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-stone-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-4 overflow-x-auto"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-wider text-stone-400 whitespace-nowrap shrink-0"
  }, "Prompt-l\xE1nc"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-0 flex-nowrap"
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 min-w-[108px] text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-semibold text-indigo-800 flex items-center justify-center gap-1"
  }, s.label, s.live && /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-emerald-500",
    title: "\xC9l"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] text-indigo-400 mt-0.5 font-mono"
  }, s.sub)), i < steps.length - 1 && /*#__PURE__*/React.createElement("span", {
    className: "px-2 text-stone-300 font-bold text-sm"
  }, "\u2192")))));
}

// ── Agent detail (SlideOver) ───────────────────────────────────────
function AiAgentDetail({
  agentId,
  onClose
}) {
  const sim = useSim();
  const SO = window.SlideOver;
  const a = window.sim.findAiAgent(agentId);
  const skills = sim.aiSkills || [];
  const memory = (sim.aiMemory || []).filter(m => m.agentId === agentId);
  const can = aiCanManage();
  if (!SO || !a) return null;
  const stages = window.AI_AGENT_STAGE_ORDER || [];
  const ags = window.AiEngine ? window.AiEngine.agentSkills(a, skills) : [];
  return /*#__PURE__*/React.createElement(SO, {
    open: true,
    onClose: onClose,
    width: 560,
    title: a.name,
    subtitle: a.role
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-5"
  }, /*#__PURE__*/React.createElement(AiLockHint, null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5"
  }, "Kanban-st\xE1tusz"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, stages.map(st => {
    const meta = (window.AI_AGENT_STAGES || {})[st] || {};
    const on = (a.stage || "definialt") === st;
    return /*#__PURE__*/React.createElement("button", {
      key: st,
      disabled: !can,
      onClick: () => window.sim.setAiAgentStage(a.id, st),
      className: `px-2.5 h-7 rounded-lg border text-[11.5px] font-medium transition ${on ? meta.tone + " ring-1 ring-offset-1 ring-stone-300" : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"} ${!can ? "opacity-60 cursor-not-allowed" : ""}`
    }, meta.label);
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5"
  }, "Rendszer-prompt (szerepk\xF6r)"), can ? /*#__PURE__*/React.createElement("textarea", {
    rows: 4,
    value: a.systemPrompt || "",
    onChange: e => window.sim.updateAiAgent(a.id, {
      systemPrompt: e.target.value
    }),
    className: aiArea
  }) : /*#__PURE__*/React.createElement("pre", {
    className: "text-[11.5px] text-stone-600 bg-stone-50 border border-stone-100 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed"
  }, a.systemPrompt || "—")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5"
  }, "Csatolt skill-ek"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, skills.map(s => {
    const on = (a.skills || []).includes(s.id);
    const t = aiTint(s.tint);
    return /*#__PURE__*/React.createElement("button", {
      key: s.id,
      disabled: !can,
      onClick: () => window.sim.toggleAiAgentSkill(a.id, s.id),
      className: `px-2.5 h-7 rounded-full border text-[11px] font-medium transition ${on ? t.chip : "bg-white border-stone-200 text-stone-400 hover:bg-stone-50"} ${!can ? "opacity-60 cursor-not-allowed" : ""}`
    }, on ? "✓ " : "", s.name);
  }), !skills.length && /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-400"
  }, "Nincs skill defini\xE1lva."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5"
  }, "Mem\xF3ria (", memory.length, ")"), memory.length ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, memory.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    className: "flex items-start gap-2 px-3 py-2 rounded-lg border border-stone-200"
  }, /*#__PURE__*/React.createElement(AiScopeBadge, {
    scope: m.scope
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-mono text-stone-400"
  }, m.key), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-700 leading-snug"
  }, m.value))))) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs mem\xF3ria-bejegyz\xE9s.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.__aiPlaygroundAgent = a.id;
      onClose();
      if (window.navigateTo) window.navigateTo("ai", "playground");
    },
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 15
  }), "Playgroundban futtatom"), can && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm("Biztosan törlöd az agentet?")) {
        window.sim.removeAiAgent(a.id);
        onClose();
      }
    },
    className: "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-rose-200 text-rose-600 text-[12px] font-medium hover:bg-rose-50"
  }, "T\xF6rl\xE9s"))));
}

// ── Új agent sheet ─────────────────────────────────────────────────
function AiAgentSheet({
  onClose
}) {
  const SO = window.SlideOver;
  const [name, setName] = useStateAi("");
  const [role, setRole] = useStateAi("");
  const [prompt, setPrompt] = useStateAi("");
  if (!SO) return null;
  const save = () => {
    if (!name.trim()) return;
    window.sim.addAiAgent({
      name: name.trim(),
      role: role.trim(),
      systemPrompt: prompt.trim()
    });
    onClose();
  };
  return /*#__PURE__*/React.createElement(SO, {
    open: true,
    onClose: onClose,
    width: 500,
    title: "\xDAj agent",
    subtitle: "AI-szerepk\xF6r defini\xE1l\xE1sa"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "N\xE9v"), /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value),
    className: aiInput,
    placeholder: "pl. Aj\xE1nlat-\xEDr\xF3 asszisztens"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Szerepk\xF6r (r\xF6vid le\xEDr\xE1s)"), /*#__PURE__*/React.createElement("input", {
    value: role,
    onChange: e => setRole(e.target.value),
    className: aiInput,
    placeholder: "Mit csin\xE1l ez az agent?"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Rendszer-prompt"), /*#__PURE__*/React.createElement("textarea", {
    rows: 5,
    value: prompt,
    onChange: e => setPrompt(e.target.value),
    className: aiArea,
    placeholder: "Te egy ... vagy, aki ..."
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, "A c\xE9g-context (brandContext) automatikusan a prompt el\xE9 f\u0171z\u0151dik \u2014 ide csak az agent saj\xE1t szerepk\xF6re kell."), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: save,
    disabled: !name.trim(),
    className: `h-9 px-4 rounded-lg text-white text-[12.5px] font-medium ${name.trim() ? "bg-indigo-600 hover:bg-indigo-700" : "bg-stone-300 cursor-not-allowed"}`
  }, "L\xE9trehoz\xE1s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-9 px-4 rounded-lg border border-stone-200 text-stone-600 text-[12.5px] font-medium hover:bg-stone-50"
  }, "M\xE9gse"))));
}

// ═══════════════════════════════════════════════════════════════════
// 2) SKILL-EK
// ═══════════════════════════════════════════════════════════════════
function AiSkills() {
  const sim = useSim();
  const skills = sim.aiSkills || [];
  const agents = sim.aiAgents || [];
  const [editId, setEditId] = useStateAi(null); // id | "new" | null
  const can = aiCanManage();
  const agentsUsing = sid => agents.filter(a => (a.skills || []).includes(sid));
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1280px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Skill-ek"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "\xDAjrahasznos\xEDthat\xF3 prompt-sablonok \u2014 agent-ek csatolj\xE1k \xE9s h\xEDvj\xE1k \u0151ket")), /*#__PURE__*/React.createElement("button", {
    onClick: () => can ? setEditId("new") : window.toast("Nincs jogosultság (ai.manage).", "error"),
    className: `inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-white text-[12.5px] font-medium shrink-0 ${can ? "bg-indigo-600 hover:bg-indigo-700" : "bg-stone-300 cursor-not-allowed"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: can ? "plus" : "lock",
    size: 15
  }), "\xDAj skill")), /*#__PURE__*/React.createElement(AiLockHint, null), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
  }, skills.map(sk => {
    const t = aiTint(sk.tint);
    const using = agentsUsing(sk.id);
    return /*#__PURE__*/React.createElement("div", {
      key: sk.id,
      className: `rounded-xl border p-4 ${t.card}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between mb-1.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[13.5px] font-semibold text-stone-900"
    }, sk.name), using.length > 0 && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-stone-500 shrink-0 mt-0.5"
    }, using.length, " agent")), /*#__PURE__*/React.createElement("p", {
      className: "text-[11.5px] text-stone-600 leading-snug mb-3 min-h-[2.4em]"
    }, sk.desc), /*#__PURE__*/React.createElement("div", {
      className: "mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[9.5px] uppercase tracking-wide text-stone-400 mb-1"
    }, "Input v\xE1ltoz\xF3k"), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1"
    }, (sk.inputs || []).map(i => /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/80 border border-stone-200 text-stone-600"
    }, `{{${i}}}`)), !(sk.inputs || []).length && /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-400"
    }, "\u2014"))), using.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mb-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[9.5px] uppercase tracking-wide text-stone-400 mb-1"
    }, "Csatolt agent-ek"), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1"
    }, using.map(a => /*#__PURE__*/React.createElement("span", {
      key: a.id,
      className: "inline-flex px-2 h-5 rounded-full bg-white/80 border border-stone-200 text-[10px] font-medium text-stone-600 items-center"
    }, a.name)))), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-1.5 mt-3 pt-3 border-t border-black/5"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => can ? setEditId(sk.id) : null,
      disabled: !can,
      className: `h-7 px-2.5 rounded-lg bg-white border border-stone-200 text-[11px] text-stone-600 font-medium ${can ? "hover:bg-stone-50" : "opacity-50 cursor-not-allowed"}`
    }, "Szerkeszt\xE9s")));
  }), can && /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditId("new"),
    className: "rounded-xl border-2 border-dashed border-stone-200 p-4 flex flex-col items-center justify-center gap-2 min-h-[160px] hover:border-indigo-300 transition text-stone-400 hover:text-indigo-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 24
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] font-medium"
  }, "\xDAj skill hozz\xE1ad\xE1sa"))), editId && /*#__PURE__*/React.createElement(AiSkillSheet, {
    skillId: editId === "new" ? null : editId,
    onClose: () => setEditId(null)
  }));
}
function AiSkillSheet({
  skillId,
  onClose
}) {
  const SO = window.SlideOver;
  const existing = skillId ? window.sim.findAiSkill(skillId) : null;
  const [name, setName] = useStateAi(existing ? existing.name : "");
  const [desc, setDesc] = useStateAi(existing ? existing.desc : "");
  const [inputs, setInputs] = useStateAi(existing ? (existing.inputs || []).join(", ") : "");
  const [tpl, setTpl] = useStateAi(existing ? existing.promptTemplate : "");
  const [tint, setTint] = useStateAi(existing ? existing.tint || "indigo" : "indigo");
  if (!SO) return null;
  const save = () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      desc: desc.trim(),
      inputs: inputs.split(",").map(s => s.trim()).filter(Boolean),
      promptTemplate: tpl,
      tint
    };
    if (existing) window.sim.updateAiSkill(existing.id, data);else window.sim.addAiSkill(data);
    onClose();
  };
  return /*#__PURE__*/React.createElement(SO, {
    open: true,
    onClose: onClose,
    width: 520,
    title: existing ? "Skill szerkesztése" : "Új skill",
    subtitle: "\xDAjrahasznos\xEDthat\xF3 prompt-sablon"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "N\xE9v"), /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value),
    className: aiInput
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Le\xEDr\xE1s"), /*#__PURE__*/React.createElement("input", {
    value: desc,
    onChange: e => setDesc(e.target.value),
    className: aiInput
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Input v\xE1ltoz\xF3k (vessz\u0151vel)"), /*#__PURE__*/React.createElement("input", {
    value: inputs,
    onChange: e => setInputs(e.target.value),
    className: aiInput,
    placeholder: "brief, persona, tone"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Prompt-sablon"), /*#__PURE__*/React.createElement("textarea", {
    rows: 5,
    value: tpl,
    onChange: e => setTpl(e.target.value),
    className: aiArea,
    placeholder: "Haszn\xE1lj {{v\xE1ltoz\xF3}} jel\xF6l\xE9st..."
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-1"
  }, "A ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, `{{változó}}`), " jel\xF6l\xE9seket a Playground t\xF6lti ki t\xE9nyleges \xE9rt\xE9kekkel.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Sz\xEDn"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5"
  }, Object.keys(AI_TINTS).map(k => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setTint(k),
    className: `w-7 h-7 rounded-lg border-2 ${tint === k ? "border-stone-800" : "border-transparent"}`,
    style: {
      background: aiTint(k).dot
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: save,
    disabled: !name.trim(),
    className: `h-9 px-4 rounded-lg text-white text-[12.5px] font-medium ${name.trim() ? "bg-indigo-600 hover:bg-indigo-700" : "bg-stone-300 cursor-not-allowed"}`
  }, existing ? "Mentés" : "Létrehozás"), existing && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm("Biztosan törlöd a skillt?")) {
        window.sim.removeAiSkill(existing.id);
        onClose();
      }
    },
    className: "h-9 px-3 rounded-lg border border-rose-200 text-rose-600 text-[12px] font-medium hover:bg-rose-50"
  }, "T\xF6rl\xE9s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-9 px-4 rounded-lg border border-stone-200 text-stone-600 text-[12.5px] font-medium hover:bg-stone-50 ml-auto"
  }, "M\xE9gse"))));
}

// ═══════════════════════════════════════════════════════════════════
// 3) MEMÓRIA
// ═══════════════════════════════════════════════════════════════════
function AiMemory() {
  const sim = useSim();
  const memory = sim.aiMemory || [];
  const agents = sim.aiAgents || [];
  const [scope, setScope] = useStateAi("all");
  const [addOpen, setAddOpen] = useStateAi(false);
  const can = aiCanManage();
  const agentName = id => (agents.find(a => a.id === id) || {}).name || "—";
  const scopes = window.AI_MEMORY_SCOPE_ORDER || [];
  const rows = scope === "all" ? memory : memory.filter(m => m.scope === scope);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-4 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Mem\xF3ria"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Tart\xF3s feljegyz\xE9sek agent-enk\xE9nt \xE9s hat\xF3k\xF6r\xF6nk\xE9nt \u2014 LLM-h\xEDv\xE1sba f\u0171zve")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1 bg-stone-100 rounded-lg p-0.5"
  }, ["all", ...scopes].map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    onClick: () => setScope(s),
    className: `px-2.5 h-7 rounded-md text-[11.5px] font-medium ${scope === s ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"}`
  }, s === "all" ? "Összes" : (window.AI_MEMORY_SCOPES[s] || {}).label))), /*#__PURE__*/React.createElement("button", {
    onClick: () => can ? setAddOpen(true) : window.toast("Nincs jogosultság (ai.manage).", "error"),
    className: `inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-white text-[12.5px] font-medium ${can ? "bg-indigo-600 hover:bg-indigo-700" : "bg-stone-300 cursor-not-allowed"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: can ? "plus" : "lock",
    size: 15
  }), "\xDAj"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-stone-200 rounded-xl overflow-hidden"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-[12px]"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-stone-50 border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "text-left px-4 py-2.5 text-[10px] uppercase tracking-wide text-stone-400 font-semibold w-[100px]"
  }, "Hat\xF3k\xF6r"), /*#__PURE__*/React.createElement("th", {
    className: "text-left px-4 py-2.5 text-[10px] uppercase tracking-wide text-stone-400 font-semibold w-[150px]"
  }, "Agent"), /*#__PURE__*/React.createElement("th", {
    className: "text-left px-4 py-2.5 text-[10px] uppercase tracking-wide text-stone-400 font-semibold w-[150px]"
  }, "Kulcs"), /*#__PURE__*/React.createElement("th", {
    className: "text-left px-4 py-2.5 text-[10px] uppercase tracking-wide text-stone-400 font-semibold"
  }, "\xC9rt\xE9k"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-2.5 w-[80px]"
  }))), /*#__PURE__*/React.createElement("tbody", null, rows.map(m => /*#__PURE__*/React.createElement("tr", {
    key: m.id,
    className: "border-b border-stone-100 hover:bg-stone-50/60 group"
  }, /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-2.5"
  }, /*#__PURE__*/React.createElement(AiScopeBadge, {
    scope: m.scope
  })), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-2.5 text-stone-600"
  }, agentName(m.agentId)), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-2.5 font-mono text-[11px] text-stone-400"
  }, m.key), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-2.5 text-stone-800 leading-snug"
  }, m.value), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-2.5 text-right"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-300 group-hover:hidden"
  }, m.at), can && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm("Törlöd a bejegyzést?")) window.sim.removeAiMemory(m.id);
    },
    className: "hidden group-hover:inline text-[11px] text-rose-500 hover:text-rose-600 font-medium"
  }, "T\xF6rl\xE9s")))), !rows.length && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: 5,
    className: "px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs mem\xF3ria-bejegyz\xE9s ebben a hat\xF3k\xF6rben."))))), /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-[11.5px] text-stone-500 flex items-start gap-1.5 px-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 14,
    className: "text-indigo-400 mt-0.5 shrink-0"
  }), "A mem\xF3ria-bejegyz\xE9sek automatikusan beker\xFClnek az agent rendszer-promptj\xE1ba a megfelel\u0151 hat\xF3k\xF6r\u0171 h\xEDv\xE1skor. A ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[10.5px]"
  }, "global"), " minden h\xEDv\xE1sba; a ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[10.5px]"
  }, "customer"), " csak \xFCgyf\xE9l-hat\xF3k\xF6r\u0171be."), addOpen && /*#__PURE__*/React.createElement(AiMemorySheet, {
    onClose: () => setAddOpen(false)
  }));
}
function AiMemorySheet({
  onClose
}) {
  const sim = useSim();
  const SO = window.SlideOver;
  const agents = sim.aiAgents || [];
  const [agentId, setAgentId] = useStateAi(agents[0] ? agents[0].id : "");
  const [scope, setScope] = useStateAi("global");
  const [key, setKey] = useStateAi("");
  const [value, setValue] = useStateAi("");
  if (!SO) return null;
  const scopes = window.AI_MEMORY_SCOPE_ORDER || [];
  const save = () => {
    if (!key.trim() || !value.trim() || !agentId) return;
    window.sim.addAiMemory({
      agentId,
      scope,
      key: key.trim(),
      value: value.trim()
    });
    onClose();
  };
  return /*#__PURE__*/React.createElement(SO, {
    open: true,
    onClose: onClose,
    width: 480,
    title: "\xDAj mem\xF3ria-bejegyz\xE9s",
    subtitle: "Tart\xF3s feljegyz\xE9s egy agenthez"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Agent"), /*#__PURE__*/React.createElement("select", {
    value: agentId,
    onChange: e => setAgentId(e.target.value),
    className: aiInput
  }, agents.map(a => /*#__PURE__*/React.createElement("option", {
    key: a.id,
    value: a.id
  }, a.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Hat\xF3k\xF6r"), /*#__PURE__*/React.createElement("select", {
    value: scope,
    onChange: e => setScope(e.target.value),
    className: aiInput
  }, scopes.map(s => /*#__PURE__*/React.createElement("option", {
    key: s,
    value: s
  }, (window.AI_MEMORY_SCOPES[s] || {}).label))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-1"
  }, (window.AI_MEMORY_SCOPES[scope] || {}).hint)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Kulcs"), /*#__PURE__*/React.createElement("input", {
    value: key,
    onChange: e => setKey(e.target.value),
    className: aiInput,
    placeholder: "pl. communication_pref"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "\xC9rt\xE9k"), /*#__PURE__*/React.createElement("textarea", {
    rows: 3,
    value: value,
    onChange: e => setValue(e.target.value),
    className: aiArea
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: save,
    disabled: !key.trim() || !value.trim(),
    className: `h-9 px-4 rounded-lg text-white text-[12.5px] font-medium ${key.trim() && value.trim() ? "bg-indigo-600 hover:bg-indigo-700" : "bg-stone-300 cursor-not-allowed"}`
  }, "Hozz\xE1ad\xE1s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-9 px-4 rounded-lg border border-stone-200 text-stone-600 text-[12.5px] font-medium hover:bg-stone-50"
  }, "M\xE9gse"))));
}
Object.assign(window, {
  AI_TINTS,
  aiTint,
  aiInput,
  aiArea,
  aiCanManage,
  AiLockHint,
  AiStageBadge,
  AiScopeBadge,
  AiSkillChip,
  AiPromptChainStrip,
  AiAgentsBoard,
  AiAgentDetail,
  AiAgentSheet,
  AiSkills,
  AiSkillSheet,
  AiMemory,
  AiMemorySheet
});
})();
