// ──────────────────────────────────────────────────────────────────────────
// Comm Hub — unified communication surface, bound to the central store (window.sim).
//
//   • Reusable header button (<CommHubButton/>) with combined unread badge.
//   • Bottom-sheet on mobile / floating panel on desktop.
//   • Tabs: "Csapat" (team messaging) and "Asszisztens" (AI).
//   • Messages can carry an ATTACHMENT referencing a business entity
//     (order / quote / product / job / material) so the other party doesn't
//     have to go searching. Any entity elsewhere in the app can open the hub
//     pre-attached via window.sim.askAbout(entity) — the "visszakérdés" flow.
//   • System/process events are posted into the team hub by the store.
//
// All state lives in window.sim; these components are thin views over it.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateCH, useRef: useRefCH, useEffect: useEffectCH } = React;

const CHANNEL_META = {
  internal: { label: "Belső", ring: "bg-teal-100 text-teal-700", dot: "bg-teal-500", icon: "chat" },
  whatsapp: { label: "WhatsApp", ring: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", icon: "phone" },
  telegram: { label: "Telegram", ring: "bg-sky-100 text-sky-700", dot: "bg-sky-500", icon: "send" },
  messenger: { label: "Messenger", ring: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500", icon: "chat" },
  email: { label: "E-mail", ring: "bg-amber-100 text-amber-700", dot: "bg-amber-500", icon: "inbox" },
};

// entity-type → display metadata for attachments
const ENTITY_META = {
  order: { icon: "orders", label: "Rendelés", tint: "bg-sky-50 text-sky-700 border-sky-200" },
  quote: { icon: "briefcase", label: "Ajánlat", tint: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  job: { icon: "workflow", label: "Gyártás", tint: "bg-violet-50 text-violet-700 border-violet-200" },
  material: { icon: "box", label: "Anyag", tint: "bg-teal-50 text-teal-700 border-teal-200" },
  po: { icon: "box", label: "Beszerzés", tint: "bg-amber-50 text-amber-700 border-amber-200" },
  project: { icon: "briefcase", label: "Projekt", tint: "bg-stone-100 text-stone-700 border-stone-200" },
};

const AI_SUGGESTIONS = ["Mai gyártási állás", "Alacsony készletek", "Nyitott ajánlatok"];

// passthrough provider (state now lives in window.sim) — renders the hub once
function CommHubProvider({ children }) {
  return (<>{children}<CommHub /></>);
}

// ── Reusable entry button ────────────────────────────────────────────────────
function CommHubButton({ className = "", size = 18, tone = "ghost" }) {
  const s = useSim();
  const unread = s.convos.reduce((n, c) => n + (c.unread || 0), 0);
  const base = tone === "bar"
    ? "border border-stone-200 text-stone-500 hover:bg-stone-50"
    : "text-stone-600 hover:bg-stone-100";
  return (
    <button onClick={() => window.sim.openHub()} aria-label="Üzenetek"
      className={`relative w-9 h-9 grid place-items-center rounded-lg shrink-0 ${base} ${className}`}>
      <Icon name="chat" size={size} />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[9.5px] font-bold ring-2 ring-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

function ChannelBadge({ channel, withLabel = false }) {
  const m = CHANNEL_META[channel] || CHANNEL_META.internal;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${withLabel ? "px-1.5 py-0.5" : "p-1"} ${m.ring} text-[10px] font-medium`}>
      <Icon name={m.icon} size={11} />{withLabel && <span>{m.label}</span>}
    </span>
  );
}

function Avatar({ name, initials, channel, presence, system }) {
  const ini = initials || (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div className="relative shrink-0">
      <div className={`w-10 h-10 rounded-full grid place-items-center text-[12px] font-semibold ${system ? "bg-stone-800 text-white" : "bg-gradient-to-br from-stone-200 to-stone-300 text-stone-700"}`}>
        {system ? <Icon name="bolt" size={16} /> : ini}
      </div>
      {presence === "online" && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
      {channel && channel !== "internal" && (
        <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${CHANNEL_META[channel].dot} ring-2 ring-white grid place-items-center text-white`}>
          <Icon name={CHANNEL_META[channel].icon} size={8} />
        </span>
      )}
    </div>
  );
}

// ── Attachment chip (rendered in messages + composer draft) ──────────────────
function AttachmentChip({ att, onRemove, compact }) {
  const m = ENTITY_META[att.type] || ENTITY_META.project;
  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border px-2 py-1.5 ${m.tint} ${compact ? "" : "max-w-full"}`}>
      <Icon name={m.icon} size={14} />
      <div className="min-w-0">
        <div className="text-[11.5px] font-semibold leading-tight truncate">{att.label}</div>
        <div className="text-[10px] opacity-70 leading-tight truncate">{m.label}{att.sub ? " · " + att.sub : ""}</div>
      </div>
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100"><Icon name="x" size={13} /></button>
      )}
    </div>
  );
}

// ── The panel ────────────────────────────────────────────────────────────────
function CommHub() {
  const s = useSim();
  const { open, tab, view } = s.hub;
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <button aria-label="Bezárás" onClick={() => window.sim.closeHub()} className="absolute inset-0 bg-stone-900/30 backdrop-blur-[1px]" />
      <div className="absolute inset-x-0 bottom-0 md:inset-auto md:right-5 md:bottom-5 md:w-[400px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden h-[86vh] md:h-[640px] md:max-h-[82vh] animate-[chSlide_.22s_ease-out]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}>
        <div className="md:hidden pt-2 pb-1 grid place-items-center shrink-0"><span className="w-9 h-1 rounded-full bg-stone-300" /></div>
        <CommHubHeader s={s} />
        <div className="flex-1 min-h-0 flex flex-col">
          {tab === "team"
            ? (view === "channels" ? <ChannelsPanel s={s} /> : view === "thread" ? <ThreadView s={s} /> : <ConversationList s={s} />)
            : <AiAssistant s={s} />}
        </div>
      </div>
      <style>{`@keyframes chSlide{from{transform:translateY(14px);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

function CommHubHeader({ s }) {
  const { tab, view, activeId } = s.hub;
  const active = s.convos.find((c) => c.id === activeId);
  const unread = s.convos.reduce((n, c) => n + (c.unread || 0), 0);
  return (
    <div className="px-3 pt-2 pb-2.5 border-b border-stone-200/80 shrink-0">
      <div className="flex items-center gap-2">
        {tab === "team" && view !== "list" ? (
          <button onClick={() => window.sim.backToList()} className="w-8 h-8 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100">
            <Icon name="chevron" size={16} className="rotate-180" />
          </button>
        ) : (
          <div className="w-8 h-8 ml-0.5 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 grid place-items-center text-white shrink-0"><Icon name="sparkle" size={15} /></div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-stone-900 truncate">
            {tab === "ai" ? "JoineryTech AI" : view === "thread" && active ? active.name : view === "channels" ? "Csatornák" : "Üzenetek"}
          </div>
          <div className="text-[10.5px] text-stone-500 truncate">
            {tab === "ai" ? "Asszisztens"
              : view === "thread" && active ? `${CHANNEL_META[active.channel].label}${active.kind === "channel" ? " · " + active.members + " tag" : active.presence === "online" ? " · online" : ""}`
              : view === "channels" ? "Külső integrációk"
              : (unread > 0 ? `${unread} olvasatlan` : "Minden elolvasva")}
          </div>
        </div>
        {tab === "team" && view === "list" && (
          <button onClick={() => window.sim.setHubView("channels")} aria-label="Csatornák" className="w-8 h-8 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100"><Icon name="bolt" size={15} /></button>
        )}
        <button onClick={() => window.sim.closeHub()} aria-label="Bezárás" className="w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Icon name="x" size={16} /></button>
      </div>
      {view !== "thread" && (
        <div className="mt-2 flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
          {[{ k: "team", l: "Csapat" }, { k: "ai", l: "Asszisztens" }].map((it) => (
            <button key={it.k} onClick={() => window.sim.setHubTab(it.k)}
              className={`flex-1 h-8 rounded-md text-[12.5px] font-medium transition ${tab === it.k ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>{it.l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConversationList({ s }) {
  return (
    <div className="flex-1 overflow-y-auto">
      {s.convos.map((c) => {
        const last = c.messages[c.messages.length - 1];
        return (
          <button key={c.id} onClick={() => window.sim.openConvo(c.id)}
            className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-stone-50 active:bg-stone-100/70 border-b border-stone-100 last:border-0 transition">
            <Avatar name={c.name} channel={c.channel} presence={c.presence} system={c.kind === "system"} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-stone-900 truncate">{c.name}</span>
                {c.kind === "channel" && <Icon name="user" size={11} className="text-stone-400 shrink-0" />}
              </div>
              <div className="text-[11.5px] text-stone-500 truncate">
                {last ? (last.attachment ? "📎 " : "") + (last.me ? "Te: " : "") + (last.text || (last.attachment ? last.attachment.label : "")) : "Nincs üzenet"}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[10px] text-stone-400">{last ? last.ts : ""}</span>
              {c.unread > 0 && <span className="min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-teal-600 text-white text-[10px] font-bold">{c.unread}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ThreadView({ s }) {
  const c = s.convos.find((x) => x.id === s.hub.activeId);
  const [input, setInput] = useStateCH("");
  const [picker, setPicker] = useStateCH(false);
  const scrollRef = useRefCH(null);
  useEffectCH(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [c && c.messages.length]);
  if (!c) return null;
  const draft = s.hub.draft;
  const ext = c.channel !== "internal";
  const submit = () => { if (!input.trim() && !draft) return; window.sim.sendMessage(c.id, input, draft); setInput(""); };
  return (
    <>
      {ext && (
        <div className={`px-3 py-1.5 text-[10.5px] flex items-center gap-1.5 ${CHANNEL_META[c.channel].ring}`}>
          <Icon name={CHANNEL_META[c.channel].icon} size={11} />
          Az üzenetek {CHANNEL_META[c.channel].label}-on keresztül szinkronizálódnak
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-stone-50/40">
        {c.messages.map((m) => (
          m.system ? (
            <div key={m.id} className="flex justify-center">
              <div className="max-w-[90%] text-center text-[11px] text-stone-500 bg-stone-100 border border-stone-200/70 rounded-lg px-3 py-1.5">{m.text}</div>
            </div>
          ) : (
            <div key={m.id} className={`flex ${m.me ? "justify-end" : "justify-start"} gap-2`}>
              {!m.me && c.kind === "channel" && <div className="w-6 h-6 rounded-full bg-stone-200 text-stone-600 grid place-items-center text-[9px] font-semibold shrink-0 mt-auto">{m.initials}</div>}
              <div className={`max-w-[80%] flex flex-col ${m.me ? "items-end" : "items-start"}`}>
                {!m.me && c.kind === "channel" && <span className="text-[10px] text-stone-400 mb-0.5 ml-1">{m.from}</span>}
                {m.attachment && <div className="mb-1"><AttachmentChip att={m.attachment} compact /></div>}
                {m.text && (
                  <div className={`rounded-2xl px-3.5 py-2 text-[12.5px] leading-relaxed ${m.me ? "bg-teal-600 text-white rounded-br-sm" : "bg-white border border-stone-200 text-stone-800 rounded-bl-sm"}`}>{m.text}</div>
                )}
                <span className="text-[9.5px] text-stone-400 mt-0.5 mx-1">{m.ts}</span>
              </div>
            </div>
          )
        ))}
      </div>
      {draft && (
        <div className="px-2.5 pt-2 flex items-center gap-2 border-t border-stone-200 bg-white">
          <span className="text-[10px] text-stone-400 shrink-0">Csatolva:</span>
          <AttachmentChip att={draft} onRemove={() => window.sim.clearDraft()} compact />
        </div>
      )}
      <Composer value={input} onChange={setInput} onSend={submit} onAttach={() => setPicker(true)}
        placeholder={ext ? `Üzenet ${CHANNEL_META[c.channel].label}-on…` : "Írj üzenetet…"} />
      {picker && <AttachPicker s={s} onPick={(e) => { window.sim.setDraft(e); setPicker(false); }} onClose={() => setPicker(false)} />}
    </>
  );
}

// ── Attachment picker — choose a business entity to attach ───────────────────
function AttachPicker({ s, onPick, onClose }) {
  const [cat, setCat] = useStateCH("order");
  const cats = [
    { k: "order", l: "Rendelés" }, { k: "quote", l: "Ajánlat" },
    { k: "job", l: "Gyártás" }, { k: "material", l: "Anyag" },
  ];
  let items = [];
  if (cat === "order") items = s.orders.map((o) => ({ type: "order", id: o.id, label: o.id, sub: o.customer }));
  else if (cat === "quote") items = s.quotes.map((q) => ({ type: "quote", id: q.id, label: q.id, sub: q.customer }));
  else if (cat === "job") items = s.jobs.map((j) => ({ type: "job", id: j.id, label: j.id, sub: j.customer }));
  else if (cat === "material") items = s.materials.map((m) => ({ type: "material", id: m.code, label: m.name, sub: m.onHand + " " + m.unit }));
  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-white">
      <div className="px-3 py-2.5 border-b border-stone-200 flex items-center gap-2 shrink-0">
        <button onClick={onClose} className="w-8 h-8 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100"><Icon name="chevron" size={16} className="rotate-180" /></button>
        <div className="text-[13px] font-semibold text-stone-900">Csatolás üzenethez</div>
      </div>
      <div className="px-2.5 py-2 flex items-center gap-1 overflow-x-auto border-b border-stone-100 shrink-0">
        {cats.map((c) => (
          <button key={c.k} onClick={() => setCat(c.k)}
            className={`px-2.5 h-7 rounded-full text-[11.5px] font-medium whitespace-nowrap ${cat === c.k ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>{c.l}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((e) => {
          const m = ENTITY_META[e.type];
          return (
            <button key={e.id} onClick={() => onPick(e)}
              className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-stone-50 active:bg-stone-100">
              <span className={`w-8 h-8 rounded-lg grid place-items-center border ${m.tint}`}><Icon name={m.icon} size={15} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-stone-900 truncate">{e.label}</div>
                <div className="text-[10.5px] text-stone-500 truncate">{e.sub}</div>
              </div>
              <Icon name="plus" size={14} className="text-stone-400" />
            </button>
          );
        })}
        {items.length === 0 && <div className="px-3 py-8 text-center text-[12px] text-stone-400">Nincs csatolható elem.</div>}
      </div>
    </div>
  );
}

function ChannelsPanel({ s }) {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
      <p className="text-[11.5px] text-stone-500 leading-relaxed px-1">Kösd össze a külső csevegőket, hogy a helyszíni csapat és a partnerek üzenetei is itt, egy helyen érkezzenek.</p>
      {s.integrations.map((x) => {
        const m = CHANNEL_META[x.id];
        return (
          <div key={x.id} className="flex items-center gap-3 p-3 rounded-xl border border-stone-200">
            <span className={`w-9 h-9 rounded-lg grid place-items-center ${m.ring}`}><Icon name={m.icon} size={17} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-stone-900">{x.name}</div>
              <div className="text-[10.5px] text-stone-500 truncate">{x.desc}</div>
            </div>
            <button onClick={() => window.sim.toggleIntegration(x.id)}
              className={`shrink-0 px-2.5 h-8 rounded-lg text-[11.5px] font-medium transition ${x.connected ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-stone-900 text-white hover:bg-stone-800"}`}>
              {x.connected ? "Összekötve" : "Összekötés"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function AiAssistant({ s }) {
  const [input, setInput] = useStateCH("");
  const scrollRef = useRefCH(null);
  useEffectCH(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [s.aiMessages.length]);
  const submit = (text) => { const v = text != null ? text : input; window.sim.sendAi(v); setInput(""); };
  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-stone-50/40">
        {s.aiMessages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[12.5px] leading-relaxed ${m.role === "user" ? "bg-stone-900 text-white rounded-br-sm" : "bg-white border border-stone-200 text-stone-800 rounded-bl-sm"}`}>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="px-3 pt-2 flex flex-wrap gap-1.5 border-t border-stone-200">
        {AI_SUGGESTIONS.map((sg, i) => (
          <button key={i} onClick={() => submit(sg)} className="text-[10.5px] px-2 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200">{sg}</button>
        ))}
      </div>
      <Composer value={input} onChange={setInput} onSend={() => submit()} placeholder="Kérdezz valamit…" accent="dark" />
    </>
  );
}

function Composer({ value, onChange, onSend, onAttach, placeholder, accent = "teal" }) {
  return (
    <div className="p-2.5 flex items-center gap-2 border-t border-stone-200 bg-white shrink-0">
      {onAttach && (
        <button onClick={onAttach} aria-label="Csatolás" className="w-10 h-11 grid place-items-center rounded-xl text-stone-500 hover:bg-stone-100 shrink-0">
          <Icon name="plus" size={18} />
        </button>
      )}
      <input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSend(); }}
        placeholder={placeholder}
        className="flex-1 min-w-0 h-11 px-3.5 rounded-xl bg-stone-100 outline-none text-[13px] focus:bg-white focus:ring-1 focus:ring-teal-500" />
      <button onClick={onSend} aria-label="Küldés"
        className={`w-11 h-11 grid place-items-center rounded-xl text-white shrink-0 ${accent === "teal" ? "bg-teal-600 hover:bg-teal-700" : "bg-stone-900 hover:bg-stone-800"}`}>
        <Icon name="send" size={17} />
      </button>
    </div>
  );
}

// Small reusable "ask about this" button for entity detail views
function AskAboutButton({ entity, label = "Visszakérdés", className = "" }) {
  return (
    <button onClick={() => window.sim.askAbout(entity)}
      className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 text-[12px] font-medium ${className}`}>
      <Icon name="chat" size={14} />{label}
    </button>
  );
}

Object.assign(window, { CommHubProvider, CommHubButton, CommHub, AskAboutButton, ENTITY_META });
