// ──────────────────────────────────────────────────────────────────────────
// AI MUNKATERÜLET — data réteg (konstansok + seed + engine)
//
//   Az AI-réteg HÁROM szintje (CLAUDE.md "AI munkaterület"):
//     Cég  → brandContext() (app-store) — már él
//     Projekt → aiProjectPrompt (store mező)
//     Agent → systemPrompt + csatolt skill-ek + memória + kanban-státusz
//
//   A tényleges LLM-hívás a Playgroundban: window.claude.complete a
//   sim.assembleSystemPrompt(...) által összefűzött rendszer-prompttal.
//   Az összefűzés EZ a brandContext() első tényleges fogyasztója.
// ──────────────────────────────────────────────────────────────────────────
(function () {

  // ── Agent kanban-státusz (FSM-szerű, de egyszerű léptetés) ───────────────
  const AI_AGENT_STAGES = {
    definialt:  { label: "Definiált",  dot: "#a8a29e", tone: "bg-stone-100 text-stone-600 border-stone-200" },
    aktiv:      { label: "Aktív",      dot: "#34d399", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    varakozik:  { label: "Várakozik",  dot: "#fbbf24", tone: "bg-amber-50 text-amber-700 border-amber-200" },
    archivalt:  { label: "Archivált",  dot: "#d6d3d1", tone: "bg-stone-50 text-stone-400 border-stone-200" },
  };
  const AI_AGENT_STAGE_ORDER = ["definialt", "aktiv", "varakozik", "archivalt"];

  // ── Memória-hatókör ──────────────────────────────────────────────────────
  const AI_MEMORY_SCOPES = {
    global:   { label: "Globális", badge: "bg-amber-100 text-amber-800",  hint: "Minden híváshoz hozzáfűzve." },
    project:  { label: "Projekt",  badge: "bg-emerald-100 text-emerald-700", hint: "Csak projekt-hatókörű híváshoz." },
    customer: { label: "Ügyfél",   badge: "bg-blue-100 text-blue-800",    hint: "Csak ügyfél-hatókörű híváshoz." },
    order:    { label: "Rendelés", badge: "bg-pink-100 text-pink-800",     hint: "Csak rendelés-hatókörű híváshoz." },
  };
  const AI_MEMORY_SCOPE_ORDER = ["global", "project", "customer", "order"];

  // ── Skill-ek (újrahasznosítható prompt-sablonok) ─────────────────────────
  const AI_SKILLS_SEED = [
    { id: "sk-offer",   name: "Ajánlat-szövegező",  desc: "Ajánlat kísérőszövegének generálása a brief és a persona alapján, a cég hangnemében.",
      inputs: ["brief", "persona", "tone"], tint: "indigo",
      promptTemplate: "Írj rövid, személyre szabott ajánlat-kísérőszöveget. A vevő igénye: {{brief}}. A megszólított persona: {{persona}}. Tartsd a megadott hangnemet: {{tone}}. Emeld ki a tartósságot és az egyedi gyártást. Max 5 mondat." },
    { id: "sk-lead",    name: "Lead-minősítő",      desc: "Lead pontozása BANT-kritériumok szerint, javasolt következő lépéssel.",
      inputs: ["lead.name", "lead.source", "notes"], tint: "violet",
      promptTemplate: "Minősítsd a leadet BANT szerint (Budget, Authority, Need, Timing). Lead: {{lead.name}}, forrás: {{lead.source}}. Megjegyzések: {{notes}}. Adj 1–5 pontot és egy konkrét következő lépést." },
    { id: "sk-service", name: "Reklamáció-válasz",   desc: "Empatikus, hangnem-illeszkedő válasz egy service-bejelentésre.",
      inputs: ["complaint", "customerProfile"], tint: "rose",
      promptTemplate: "Fogalmazz empatikus, megoldás-orientált választ erre a reklamációra: {{complaint}}. Az ügyfél kapcsolati profilja: {{customerProfile}}. Ne ígérj konkrét határidőt, de jelezd, hogy komolyan vesszük." },
    { id: "sk-sched",   name: "Ütemezés-elemző",     desc: "Gyártási terhelés-konfliktusok tömör összefoglalása és javaslat.",
      inputs: ["prodTasks", "machines", "week"], tint: "sky",
      promptTemplate: "Foglald össze a heti gyártási terhelés ütközéseit. Feladatok: {{prodTasks}}. Gépek/kapacitás: {{machines}}. Hét: {{week}}. Adj 2–3 konkrét átütemezési javaslatot." },
    { id: "sk-qa",      name: "QA-összefoglaló",     desc: "Minőség-ellenőrzés eredményeinek vezetői összefoglalója.",
      inputs: ["inspection", "defects", "passRate"], tint: "lime",
      promptTemplate: "Készíts tömör QA-összefoglalót. Ellenőrzés: {{inspection}}. Hibajegyzék: {{defects}}. Megfelelési arány: {{passRate}}. Zárd egy kockázat-szintű minősítéssel." },
    { id: "sk-email",   name: "Email-piszkozat",     desc: "Ügyfél-kommunikációhoz email-piszkozat a cég hangneme szerint.",
      inputs: ["context", "recipient", "intent"], tint: "amber",
      promptTemplate: "Írj email-piszkozatot. Kontextus: {{context}}. Címzett: {{recipient}}. Cél: {{intent}}. Tartsd a cég hangnemét, legyen tárgysor is." },
  ];

  // ── Agent-definíciók ─────────────────────────────────────────────────────
  const AI_AGENTS_SEED = [
    { id: "ag-sales", name: "Értékesítési asszisztens", stage: "aktiv",
      role: "Ajánlatok, lead-minősítés és ügyfél-kommunikáció támogatása.",
      systemPrompt: "Te egy tapasztalt értékesítési asszisztens vagy egy asztalos/bútoripari cégnél. Segítesz ajánlatok megfogalmazásában, leadek minősítésében és az ügyfél-kommunikációban. Mindig a cég értékajánlatára (tartósság, egyedi gyártás) építesz.",
      skills: ["sk-offer", "sk-lead", "sk-email"], lastRun: "ma 09:14" },
    { id: "ag-service", name: "Reklamáció-kezelő", stage: "definialt",
      role: "Service-jegyek, garancia-válaszok, ügyfél-megbékítés.",
      systemPrompt: "Te egy empatikus ügyfélszolgálati szakember vagy. Reklamációkra válaszolsz higgadtan, a cég hangnemében, mindig megoldásra törekedve. Sosem hárítasz felelősséget az ügyfélre.",
      skills: ["sk-service"], lastRun: null },
    { id: "ag-prod", name: "Gyártás-koordinátor", stage: "definialt",
      role: "Műhely-visszajelzések, ütemezési javaslatok, QA-összefoglalók.",
      systemPrompt: "Te egy gyártás-koordinátor vagy egy bútorüzemben. Segítesz a terhelés-ütközések feloldásában és a minőségi visszajelzések összefoglalásában. Tömör, gyakorlatias javaslatokat adsz.",
      skills: ["sk-sched", "sk-qa"], lastRun: null },
  ];

  // ── Memória-bejegyzések ──────────────────────────────────────────────────
  const AI_MEMORY_SEED = [
    { id: "am-1", agentId: "ag-prod",  scope: "global",   key: "preferred_shift",    value: "Délelőtti műszak preferált az összeállításhoz.",        at: "2026-06-13" },
    { id: "am-2", agentId: "ag-prod",  scope: "project",  key: "project_priority",   value: "P-2025-0042 prioritásos — átadási határidő 06-20.",      at: "2026-06-12" },
    { id: "am-3", agentId: "ag-sales", scope: "customer", key: "communication_pref", value: "Tóth Réka e-mailen érhető el; kerülni a hívásokat.",     at: "2026-06-11" },
    { id: "am-4", agentId: "ag-sales", scope: "customer", key: "price_sensitivity",  value: "Árérzékeny — inkább a garanciát hangsúlyozni.",          at: "2026-06-10" },
    { id: "am-5", agentId: "ag-sales", scope: "global",   key: "best_offer_hook",    value: "Élethosszig tartó javítás — leghatásosabb értékajánlat.", at: "2026-06-09" },
  ];

  // ── Engine (SZÁMÍTOTT helperek — soha ne tárold) ─────────────────────────
  const AiEngine = {
    // egy agent feloldott skill-objektumai
    agentSkills(agent, allSkills) {
      if (!agent) return [];
      const byId = {}; (allSkills || []).forEach((s) => { byId[s.id] = s; });
      return (agent.skills || []).map((id) => byId[id]).filter(Boolean);
    },
    // memória egy agenthez + hatókörhöz (global mindig benne; a kért scope is)
    agentMemory(allMemory, agentId, scope) {
      return (allMemory || []).filter((m) => m.agentId === agentId && (m.scope === "global" || (scope && m.scope === scope)));
    },
    memoryByScope(allMemory, scope) {
      if (!scope || scope === "all") return allMemory || [];
      return (allMemory || []).filter((m) => m.scope === scope);
    },
    // durva token-becslés (≈ 4 karakter / token)
    estTokens(text) { return Math.max(1, Math.round((text || "").length / 4)); },
    // egy skill input-változóinak kitöltése értékekkel ({{var}} → érték)
    fillTemplate(tpl, values) {
      return (tpl || "").replace(/\{\{([^}]+)\}\}/g, (m, k) => {
        const key = k.trim();
        return (values && values[key] != null && values[key] !== "") ? values[key] : m;
      });
    },
  };

  Object.assign(window, {
    AI_AGENT_STAGES, AI_AGENT_STAGE_ORDER,
    AI_MEMORY_SCOPES, AI_MEMORY_SCOPE_ORDER,
    AI_SKILLS_SEED, AI_AGENTS_SEED, AI_MEMORY_SEED,
    AiEngine,
  });
})();
