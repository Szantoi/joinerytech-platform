// ─────────────────────────────────────────────────────────────────
// page-ai.jsx — AI MUNKATERÜLET világ (1/2)
//   Agent Kanban + Skill-ek + Memória + közös badge-ek.
//   A Playground (rendszer-prompt összeállítás + Claude-hívás) → page-ai-2.jsx.
//   Store: window.sim.aiAgents / aiSkills / aiMemory + akciók; AiEngine.
//   Minden írás ai.manage joghoz kötött (a store guardol; az UI lock-ot mutat).
// ─────────────────────────────────────────────────────────────────
const { useState: useStateAi } = React;

const AI_TINTS = {
  indigo: { card: "bg-indigo-50 border-indigo-200", chip: "bg-indigo-100 text-indigo-700 border-indigo-200", dot: "#4f46e5" },
  violet: { card: "bg-violet-50 border-violet-200", chip: "bg-violet-100 text-violet-700 border-violet-200", dot: "#7c3aed" },
  rose:   { card: "bg-rose-50 border-rose-200",     chip: "bg-rose-100 text-rose-700 border-rose-200",       dot: "#e11d48" },
  sky:    { card: "bg-sky-50 border-sky-200",       chip: "bg-sky-100 text-sky-700 border-sky-200",          dot: "#0284c7" },
  lime:   { card: "bg-lime-50 border-lime-200",     chip: "bg-lime-100 text-lime-700 border-lime-200",       dot: "#65a30d" },
  amber:  { card: "bg-amber-50 border-amber-200",   chip: "bg-amber-100 text-amber-700 border-amber-200",    dot: "#d97706" },
};
const aiTint = (t) => AI_TINTS[t] || AI_TINTS.indigo;

function AiStageBadge({ stage, size = "md" }) {
  const m = (window.AI_AGENT_STAGES || {})[stage] || { label: stage, tone: "bg-stone-100 text-stone-600 border-stone-200", dot: "#a8a29e" };
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${m.tone}`}><span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />{m.label}</span>;
}
function AiScopeBadge({ scope }) {
  const m = (window.AI_MEMORY_SCOPES || {})[scope] || { label: scope, badge: "bg-stone-100 text-stone-600" };
  return <span className={`inline-flex items-center px-2 h-5 rounded text-[10px] font-semibold ${m.badge}`}>{m.label}</span>;
}
function AiSkillChip({ skill, onClick }) {
  if (!skill) return null;
  const t = aiTint(skill.tint);
  return <span onClick={onClick} className={`inline-flex items-center px-2 h-6 rounded-full border text-[11px] font-medium ${t.chip} ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}>{skill.name}</span>;
}
const aiCanManage = () => window.sim.hasPerm("ai.manage");

function AiLockHint({ what }) {
  if (aiCanManage()) return null;
  return <div className="mb-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[11.5px] text-stone-500 inline-flex items-center gap-1.5"><Icon name="lock" size={13} />{what || "A szerkesztéshez"} <span className="font-medium">ai.manage</span> jog kell.</div>;
}

// ── input ──────────────────────────────────────────────────────────
const aiInput = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300";
const aiArea = "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12px] text-stone-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-y";

// ═══════════════════════════════════════════════════════════════════
// 1) AGENT KANBAN
// ═══════════════════════════════════════════════════════════════════
function AiAgentsBoard({ onScreen }) {
  const sim = useSim();
  const agents = sim.aiAgents || [];
  const skills = sim.aiSkills || [];
  const memory = sim.aiMemory || [];
  const [openId, setOpenId] = useStateAi(null);
  const [addOpen, setAddOpen] = useStateAi(false);
  const stages = window.AI_AGENT_STAGE_ORDER || ["definialt", "aktiv", "varakozik", "archivalt"];
  const byStage = (st) => agents.filter((a) => (a.stage || "definialt") === st);
  const memCount = (id) => memory.filter((m) => m.agentId === id).length;
  const can = aiCanManage();

  const AgentCard = ({ a }) => {
    const ags = window.AiEngine ? window.AiEngine.agentSkills(a, skills) : [];
    const active = (a.stage || "definialt") === "aktiv";
    return (
      <div onClick={() => setOpenId(a.id)} className="bg-white rounded-xl border border-stone-200 p-3.5 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: active ? "#34d399" : "#d6d3d1" }} />
          <span className="text-[12.5px] font-semibold text-stone-900 flex-1 truncate">{a.name}</span>
        </div>
        <p className="text-[11px] text-stone-500 leading-snug mb-2.5 line-clamp-2">{a.role}</p>
        {ags.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{ags.slice(0, 3).map((s) => <AiSkillChip key={s.id} skill={s} />)}{ags.length > 3 && <span className="text-[10px] text-stone-400 self-center">+{ags.length - 3}</span>}</div>}
        <div className="flex items-center justify-between text-[10px] text-stone-400 pt-2 border-t border-stone-100">
          <span className="inline-flex items-center gap-1"><Icon name="layers" size={11} />{memCount(a.id)} memória</span>
          <span>{a.lastRun ? "Utolsó: " + a.lastRun : "Még nem futott"}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Agent Kanban</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Névvel rendelkező AI-szerepkörök — definiálástól az aktív futásig</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onScreen && onScreen("playground")} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-stone-200 bg-white text-stone-700 text-[12.5px] font-medium hover:bg-stone-50"><Icon name="send" size={15} className="text-indigo-500" />Playground</button>
          <button onClick={() => can ? setAddOpen(true) : window.toast("Nincs jogosultság (ai.manage).", "error")} className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-white text-[12.5px] font-medium ${can ? "bg-indigo-600 hover:bg-indigo-700" : "bg-stone-300 cursor-not-allowed"}`}><Icon name={can ? "plus" : "lock"} size={15} />Új agent</button>
        </div>
      </div>

      {/* Prompt-lánc sáv */}
      <AiPromptChainStrip />

      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((st) => {
          const meta = (window.AI_AGENT_STAGES || {})[st] || {};
          const list = byStage(st);
          return (
            <div key={st} className="min-w-[244px] max-w-[272px] flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.dot }} />
                <span className="text-[10.5px] font-semibold uppercase tracking-wide text-stone-500">{meta.label}</span>
                <span className="ml-auto text-[10px] text-stone-400">{list.length}</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {list.map((a) => <AgentCard key={a.id} a={a} />)}
                {!list.length && <div className="border-2 border-dashed border-stone-200 rounded-xl h-20 grid place-items-center text-[11px] text-stone-300">Üres</div>}
              </div>
            </div>
          );
        })}
      </div>

      {openId && <AiAgentDetail agentId={openId} onClose={() => setOpenId(null)} />}
      {addOpen && <AiAgentSheet onClose={() => setAddOpen(false)} />}
    </div>
  );
}

// ── Prompt-lánc vizualizáció (a rendszer-prompt rétegei) ───────────
function AiPromptChainStrip() {
  const steps = [
    { label: "Cég context", sub: "brandContext()", live: true },
    { label: "Projekt context", sub: "aiProjectPrompt" },
    { label: "Agent szerepkör", sub: "agent.systemPrompt" },
    { label: "Skill sablon", sub: "skill.promptTemplate" },
    { label: "Memória", sub: "aiMemory (scope)" },
  ];
  return (
    <div className="bg-white border border-stone-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-4 overflow-x-auto">
      <span className="text-[10px] uppercase tracking-wider text-stone-400 whitespace-nowrap shrink-0">Prompt-lánc</span>
      <div className="flex items-center gap-0 flex-nowrap">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center">
            <div className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 min-w-[108px] text-center">
              <div className="text-[11px] font-semibold text-indigo-800 flex items-center justify-center gap-1">{s.label}{s.live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Él" />}</div>
              <div className="text-[9.5px] text-indigo-400 mt-0.5 font-mono">{s.sub}</div>
            </div>
            {i < steps.length - 1 && <span className="px-2 text-stone-300 font-bold text-sm">→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Agent detail (SlideOver) ───────────────────────────────────────
function AiAgentDetail({ agentId, onClose }) {
  const sim = useSim();
  const SO = window.SlideOver;
  const a = window.sim.findAiAgent(agentId);
  const skills = sim.aiSkills || [];
  const memory = (sim.aiMemory || []).filter((m) => m.agentId === agentId);
  const can = aiCanManage();
  if (!SO || !a) return null;
  const stages = window.AI_AGENT_STAGE_ORDER || [];
  const ags = window.AiEngine ? window.AiEngine.agentSkills(a, skills) : [];

  return (
    <SO open onClose={onClose} width={560} title={a.name} subtitle={a.role}>
      <div className="px-5 py-4 space-y-5">
        <AiLockHint />
        {/* Kanban-státusz léptető */}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Kanban-státusz</div>
          <div className="flex flex-wrap gap-1.5">
            {stages.map((st) => {
              const meta = (window.AI_AGENT_STAGES || {})[st] || {};
              const on = (a.stage || "definialt") === st;
              return <button key={st} disabled={!can} onClick={() => window.sim.setAiAgentStage(a.id, st)} className={`px-2.5 h-7 rounded-lg border text-[11.5px] font-medium transition ${on ? meta.tone + " ring-1 ring-offset-1 ring-stone-300" : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"} ${!can ? "opacity-60 cursor-not-allowed" : ""}`}>{meta.label}</button>;
            })}
          </div>
        </div>
        {/* Rendszer-prompt */}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Rendszer-prompt (szerepkör)</div>
          {can
            ? <textarea rows={4} value={a.systemPrompt || ""} onChange={(e) => window.sim.updateAiAgent(a.id, { systemPrompt: e.target.value })} className={aiArea} />
            : <pre className="text-[11.5px] text-stone-600 bg-stone-50 border border-stone-100 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed">{a.systemPrompt || "—"}</pre>}
        </div>
        {/* Skill-ek */}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Csatolt skill-ek</div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => {
              const on = (a.skills || []).includes(s.id);
              const t = aiTint(s.tint);
              return <button key={s.id} disabled={!can} onClick={() => window.sim.toggleAiAgentSkill(a.id, s.id)} className={`px-2.5 h-7 rounded-full border text-[11px] font-medium transition ${on ? t.chip : "bg-white border-stone-200 text-stone-400 hover:bg-stone-50"} ${!can ? "opacity-60 cursor-not-allowed" : ""}`}>{on ? "✓ " : ""}{s.name}</button>;
            })}
            {!skills.length && <span className="text-[11.5px] text-stone-400">Nincs skill definiálva.</span>}
          </div>
        </div>
        {/* Memória */}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Memória ({memory.length})</div>
          {memory.length ? <div className="space-y-1.5">{memory.map((m) => (
            <div key={m.id} className="flex items-start gap-2 px-3 py-2 rounded-lg border border-stone-200">
              <AiScopeBadge scope={m.scope} />
              <div className="min-w-0 flex-1"><div className="text-[11px] font-mono text-stone-400">{m.key}</div><div className="text-[12px] text-stone-700 leading-snug">{m.value}</div></div>
            </div>
          ))}</div> : <div className="text-[12px] text-stone-400">Nincs memória-bejegyzés.</div>}
        </div>
        {/* Futtatás + törlés */}
        <div className="flex items-center gap-2 pt-1">
          <button onClick={() => { window.__aiPlaygroundAgent = a.id; onClose(); if (window.navigateTo) window.navigateTo("ai", "playground"); }} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-medium"><Icon name="send" size={15} />Playgroundban futtatom</button>
          {can && <button onClick={() => { if (confirm("Biztosan törlöd az agentet?")) { window.sim.removeAiAgent(a.id); onClose(); } }} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-rose-200 text-rose-600 text-[12px] font-medium hover:bg-rose-50">Törlés</button>}
        </div>
      </div>
    </SO>
  );
}

// ── Új agent sheet ─────────────────────────────────────────────────
function AiAgentSheet({ onClose }) {
  const SO = window.SlideOver;
  const [name, setName] = useStateAi("");
  const [role, setRole] = useStateAi("");
  const [prompt, setPrompt] = useStateAi("");
  if (!SO) return null;
  const save = () => { if (!name.trim()) return; window.sim.addAiAgent({ name: name.trim(), role: role.trim(), systemPrompt: prompt.trim() }); onClose(); };
  return (
    <SO open onClose={onClose} width={500} title="Új agent" subtitle="AI-szerepkör definiálása">
      <div className="px-5 py-4 space-y-3.5">
        <div><label className="text-[10.5px] text-stone-500 block mb-1">Név</label><input value={name} onChange={(e) => setName(e.target.value)} className={aiInput} placeholder="pl. Ajánlat-író asszisztens" /></div>
        <div><label className="text-[10.5px] text-stone-500 block mb-1">Szerepkör (rövid leírás)</label><input value={role} onChange={(e) => setRole(e.target.value)} className={aiInput} placeholder="Mit csinál ez az agent?" /></div>
        <div><label className="text-[10.5px] text-stone-500 block mb-1">Rendszer-prompt</label><textarea rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} className={aiArea} placeholder="Te egy ... vagy, aki ..." /></div>
        <div className="text-[10.5px] text-stone-400">A cég-context (brandContext) automatikusan a prompt elé fűződik — ide csak az agent saját szerepköre kell.</div>
        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={!name.trim()} className={`h-9 px-4 rounded-lg text-white text-[12.5px] font-medium ${name.trim() ? "bg-indigo-600 hover:bg-indigo-700" : "bg-stone-300 cursor-not-allowed"}`}>Létrehozás</button>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-stone-200 text-stone-600 text-[12.5px] font-medium hover:bg-stone-50">Mégse</button>
        </div>
      </div>
    </SO>
  );
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
  const agentsUsing = (sid) => agents.filter((a) => (a.skills || []).includes(sid));

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Skill-ek</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Újrahasznosítható prompt-sablonok — agent-ek csatolják és hívják őket</p>
        </div>
        <button onClick={() => can ? setEditId("new") : window.toast("Nincs jogosultság (ai.manage).", "error")} className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-white text-[12.5px] font-medium shrink-0 ${can ? "bg-indigo-600 hover:bg-indigo-700" : "bg-stone-300 cursor-not-allowed"}`}><Icon name={can ? "plus" : "lock"} size={15} />Új skill</button>
      </div>
      <AiLockHint />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {skills.map((sk) => {
          const t = aiTint(sk.tint);
          const using = agentsUsing(sk.id);
          return (
            <div key={sk.id} className={`rounded-xl border p-4 ${t.card}`}>
              <div className="flex items-start justify-between mb-1.5">
                <div className="text-[13.5px] font-semibold text-stone-900">{sk.name}</div>
                {using.length > 0 && <span className="text-[10px] text-stone-500 shrink-0 mt-0.5">{using.length} agent</span>}
              </div>
              <p className="text-[11.5px] text-stone-600 leading-snug mb-3 min-h-[2.4em]">{sk.desc}</p>
              <div className="mb-2">
                <div className="text-[9.5px] uppercase tracking-wide text-stone-400 mb-1">Input változók</div>
                <div className="flex flex-wrap gap-1">{(sk.inputs || []).map((i) => <span key={i} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/80 border border-stone-200 text-stone-600">{`{{${i}}}`}</span>)}{!(sk.inputs || []).length && <span className="text-[11px] text-stone-400">—</span>}</div>
              </div>
              {using.length > 0 && <div className="mb-1"><div className="text-[9.5px] uppercase tracking-wide text-stone-400 mb-1">Csatolt agent-ek</div><div className="flex flex-wrap gap-1">{using.map((a) => <span key={a.id} className="inline-flex px-2 h-5 rounded-full bg-white/80 border border-stone-200 text-[10px] font-medium text-stone-600 items-center">{a.name}</span>)}</div></div>}
              <div className="flex gap-1.5 mt-3 pt-3 border-t border-black/5">
                <button onClick={() => can ? setEditId(sk.id) : null} disabled={!can} className={`h-7 px-2.5 rounded-lg bg-white border border-stone-200 text-[11px] text-stone-600 font-medium ${can ? "hover:bg-stone-50" : "opacity-50 cursor-not-allowed"}`}>Szerkesztés</button>
              </div>
            </div>
          );
        })}
        {/* Új skill placeholder */}
        {can && <button onClick={() => setEditId("new")} className="rounded-xl border-2 border-dashed border-stone-200 p-4 flex flex-col items-center justify-center gap-2 min-h-[160px] hover:border-indigo-300 transition text-stone-400 hover:text-indigo-500"><Icon name="plus" size={24} /><span className="text-[11.5px] font-medium">Új skill hozzáadása</span></button>}
      </div>
      {editId && <AiSkillSheet skillId={editId === "new" ? null : editId} onClose={() => setEditId(null)} />}
    </div>
  );
}

function AiSkillSheet({ skillId, onClose }) {
  const SO = window.SlideOver;
  const existing = skillId ? window.sim.findAiSkill(skillId) : null;
  const [name, setName] = useStateAi(existing ? existing.name : "");
  const [desc, setDesc] = useStateAi(existing ? existing.desc : "");
  const [inputs, setInputs] = useStateAi(existing ? (existing.inputs || []).join(", ") : "");
  const [tpl, setTpl] = useStateAi(existing ? existing.promptTemplate : "");
  const [tint, setTint] = useStateAi(existing ? (existing.tint || "indigo") : "indigo");
  if (!SO) return null;
  const save = () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), desc: desc.trim(), inputs: inputs.split(",").map((s) => s.trim()).filter(Boolean), promptTemplate: tpl, tint };
    if (existing) window.sim.updateAiSkill(existing.id, data); else window.sim.addAiSkill(data);
    onClose();
  };
  return (
    <SO open onClose={onClose} width={520} title={existing ? "Skill szerkesztése" : "Új skill"} subtitle="Újrahasznosítható prompt-sablon">
      <div className="px-5 py-4 space-y-3.5">
        <div><label className="text-[10.5px] text-stone-500 block mb-1">Név</label><input value={name} onChange={(e) => setName(e.target.value)} className={aiInput} /></div>
        <div><label className="text-[10.5px] text-stone-500 block mb-1">Leírás</label><input value={desc} onChange={(e) => setDesc(e.target.value)} className={aiInput} /></div>
        <div><label className="text-[10.5px] text-stone-500 block mb-1">Input változók (vesszővel)</label><input value={inputs} onChange={(e) => setInputs(e.target.value)} className={aiInput} placeholder="brief, persona, tone" /></div>
        <div><label className="text-[10.5px] text-stone-500 block mb-1">Prompt-sablon</label><textarea rows={5} value={tpl} onChange={(e) => setTpl(e.target.value)} className={aiArea} placeholder="Használj {{változó}} jelölést..." /><div className="text-[10px] text-stone-400 mt-1">A <span className="font-mono">{`{{változó}}`}</span> jelöléseket a Playground tölti ki tényleges értékekkel.</div></div>
        <div><label className="text-[10.5px] text-stone-500 block mb-1">Szín</label><div className="flex gap-1.5">{Object.keys(AI_TINTS).map((k) => <button key={k} onClick={() => setTint(k)} className={`w-7 h-7 rounded-lg border-2 ${tint === k ? "border-stone-800" : "border-transparent"}`} style={{ background: aiTint(k).dot }} />)}</div></div>
        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={!name.trim()} className={`h-9 px-4 rounded-lg text-white text-[12.5px] font-medium ${name.trim() ? "bg-indigo-600 hover:bg-indigo-700" : "bg-stone-300 cursor-not-allowed"}`}>{existing ? "Mentés" : "Létrehozás"}</button>
          {existing && <button onClick={() => { if (confirm("Biztosan törlöd a skillt?")) { window.sim.removeAiSkill(existing.id); onClose(); } }} className="h-9 px-3 rounded-lg border border-rose-200 text-rose-600 text-[12px] font-medium hover:bg-rose-50">Törlés</button>}
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-stone-200 text-stone-600 text-[12.5px] font-medium hover:bg-stone-50 ml-auto">Mégse</button>
        </div>
      </div>
    </SO>
  );
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
  const agentName = (id) => (agents.find((a) => a.id === id) || {}).name || "—";
  const scopes = window.AI_MEMORY_SCOPE_ORDER || [];
  const rows = scope === "all" ? memory : memory.filter((m) => m.scope === scope);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Memória</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Tartós feljegyzések agent-enként és hatókörönként — LLM-hívásba fűzve</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-stone-100 rounded-lg p-0.5">
            {["all", ...scopes].map((s) => <button key={s} onClick={() => setScope(s)} className={`px-2.5 h-7 rounded-md text-[11.5px] font-medium ${scope === s ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"}`}>{s === "all" ? "Összes" : (window.AI_MEMORY_SCOPES[s] || {}).label}</button>)}
          </div>
          <button onClick={() => can ? setAddOpen(true) : window.toast("Nincs jogosultság (ai.manage).", "error")} className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-white text-[12.5px] font-medium ${can ? "bg-indigo-600 hover:bg-indigo-700" : "bg-stone-300 cursor-not-allowed"}`}><Icon name={can ? "plus" : "lock"} size={15} />Új</button>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wide text-stone-400 font-semibold w-[100px]">Hatókör</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wide text-stone-400 font-semibold w-[150px]">Agent</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wide text-stone-400 font-semibold w-[150px]">Kulcs</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wide text-stone-400 font-semibold">Érték</th>
              <th className="px-4 py-2.5 w-[80px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-stone-100 hover:bg-stone-50/60 group">
                <td className="px-4 py-2.5"><AiScopeBadge scope={m.scope} /></td>
                <td className="px-4 py-2.5 text-stone-600">{agentName(m.agentId)}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-stone-400">{m.key}</td>
                <td className="px-4 py-2.5 text-stone-800 leading-snug">{m.value}</td>
                <td className="px-4 py-2.5 text-right"><span className="text-[10px] text-stone-300 group-hover:hidden">{m.at}</span>{can && <button onClick={() => { if (confirm("Törlöd a bejegyzést?")) window.sim.removeAiMemory(m.id); }} className="hidden group-hover:inline text-[11px] text-rose-500 hover:text-rose-600 font-medium">Törlés</button>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs memória-bejegyzés ebben a hatókörben.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11.5px] text-stone-500 flex items-start gap-1.5 px-1">
        <Icon name="info" size={14} className="text-indigo-400 mt-0.5 shrink-0" />
        A memória-bejegyzések automatikusan bekerülnek az agent rendszer-promptjába a megfelelő hatókörű híváskor. A <span className="font-mono text-[10.5px]">global</span> minden hívásba; a <span className="font-mono text-[10.5px]">customer</span> csak ügyfél-hatókörűbe.
      </p>
      {addOpen && <AiMemorySheet onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function AiMemorySheet({ onClose }) {
  const sim = useSim();
  const SO = window.SlideOver;
  const agents = sim.aiAgents || [];
  const [agentId, setAgentId] = useStateAi(agents[0] ? agents[0].id : "");
  const [scope, setScope] = useStateAi("global");
  const [key, setKey] = useStateAi("");
  const [value, setValue] = useStateAi("");
  if (!SO) return null;
  const scopes = window.AI_MEMORY_SCOPE_ORDER || [];
  const save = () => { if (!key.trim() || !value.trim() || !agentId) return; window.sim.addAiMemory({ agentId, scope, key: key.trim(), value: value.trim() }); onClose(); };
  return (
    <SO open onClose={onClose} width={480} title="Új memória-bejegyzés" subtitle="Tartós feljegyzés egy agenthez">
      <div className="px-5 py-4 space-y-3.5">
        <div><label className="text-[10.5px] text-stone-500 block mb-1">Agent</label><select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={aiInput}>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        <div><label className="text-[10.5px] text-stone-500 block mb-1">Hatókör</label><select value={scope} onChange={(e) => setScope(e.target.value)} className={aiInput}>{scopes.map((s) => <option key={s} value={s}>{(window.AI_MEMORY_SCOPES[s] || {}).label}</option>)}</select><div className="text-[10px] text-stone-400 mt-1">{(window.AI_MEMORY_SCOPES[scope] || {}).hint}</div></div>
        <div><label className="text-[10.5px] text-stone-500 block mb-1">Kulcs</label><input value={key} onChange={(e) => setKey(e.target.value)} className={aiInput} placeholder="pl. communication_pref" /></div>
        <div><label className="text-[10.5px] text-stone-500 block mb-1">Érték</label><textarea rows={3} value={value} onChange={(e) => setValue(e.target.value)} className={aiArea} /></div>
        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={!key.trim() || !value.trim()} className={`h-9 px-4 rounded-lg text-white text-[12.5px] font-medium ${key.trim() && value.trim() ? "bg-indigo-600 hover:bg-indigo-700" : "bg-stone-300 cursor-not-allowed"}`}>Hozzáadás</button>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-stone-200 text-stone-600 text-[12.5px] font-medium hover:bg-stone-50">Mégse</button>
        </div>
      </div>
    </SO>
  );
}

Object.assign(window, {
  AI_TINTS, aiTint, aiInput, aiArea, aiCanManage, AiLockHint,
  AiStageBadge, AiScopeBadge, AiSkillChip, AiPromptChainStrip,
  AiAgentsBoard, AiAgentDetail, AiAgentSheet,
  AiSkills, AiSkillSheet, AiMemory, AiMemorySheet,
});
