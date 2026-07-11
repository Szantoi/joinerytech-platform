// Chat assistant — floating bubble + slide-in panel
const { useState: useStateC, useEffect: useEffectC, useRef: useRefC } = React;

const SUGGESTIONS = [
  "H\u00e1ny rendel\u00e9s van gy\u00e1rt\u00e1s alatt?",
  "Foglald \u00f6ssze a mai szab\u00e1szati tervet",
  "Mi az utols\u00f3 k\u00e9szletriaszt\u00e1s?",
];

const SCRIPTED = {
  default: "Sziasztok! \u00c9n vagyok a JoineryTech AI asszisztens. Seg\u00edthetek rendel\u00e9sekkel, gy\u00e1rt\u00e1ssal, k\u00e9szlettel. Mit tehetek \u00e9rted ma?",
  prod: "Most 28 rendel\u00e9s van gy\u00e1rt\u00e1s alatt. A Holzma HPP380 78%-on, a Biesse Selco 64%-on \u00fczemel. K\u00e9t v\u00e1g\u00f3terv k\u00e9sz, n\u00e9gy folyamatban.",
  plan: "Mai szab\u00e1szat: 12 v\u00e1g\u00f3terv \u00b7 84 lap. F\u0151 anyagok: B\u00fckk 18mm, T\u00f6lgy 40mm, MDF 16mm. K\u00e9t g\u00e9p akt\u00edv.",
  alert: "3 anyag van riaszt\u00e1si szinten: T\u00f6lgy 22mm (8/15), MDF 19mm (12/25), Vasalat CLIP top (4/50 \u2014 kritikus).",
};

function pickReply(msg) {
  const m = msg.toLowerCase();
  if (m.includes("gy\u00e1rt") || m.includes("rendel")) return SCRIPTED.prod;
  if (m.includes("szab\u00e1sz") || m.includes("v\u00e1g\u00f3terv") || m.includes("terv")) return SCRIPTED.plan;
  if (m.includes("riaszt") || m.includes("k\u00e9szlet")) return SCRIPTED.alert;
  return "Megn\u00e9zem... A k\u00e9rd\u00e9s alapj\u00e1n itt nincs nyilv\u00e1nval\u00f3 tal\u00e1lat. Pr\u00f3b\u00e1ld pontos\u00edtani \u2014 pl. 'rendel\u00e9sek gy\u00e1rt\u00e1s alatt' vagy 'mai szab\u00e1szati terv'.";
}

function ChatPanel({ open, onClose, page }) {
  const [messages, setMessages] = useStateC([
    { role: "assistant", text: SCRIPTED.default, ts: "9:14" },
  ]);
  const [input, setInput] = useStateC("");
  const [streaming, setStreaming] = useStateC(false);
  const scrollRef = useRefC(null);

  useEffectC(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  const send = (text) => {
    const t = (text ?? input).trim();
    if (!t) return;
    setInput("");
    const userMsg = { role: "user", text: t, ts: "most" };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    const reply = pickReply(t);
    let i = 0;
    const id = setInterval(() => {
      i += 4;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last.role === "assistant" && last.streaming) {
          return [...prev.slice(0, -1), { ...last, text: reply.slice(0, i) }];
        }
        return [...prev, { role: "assistant", text: reply.slice(0, i), ts: "most", streaming: true }];
      });
      if (i >= reply.length) {
        clearInterval(id);
        setStreaming(false);
        setMessages(prev => prev.map((m, idx) => idx === prev.length - 1 ? { ...m, streaming: false, text: reply, tool: t.toLowerCase().includes("rendel") ? "orders" : null } : m));
      }
    }, 24);
  };

  if (!open) return null;
  return (
    <aside className="fixed right-4 bottom-20 w-[380px] max-h-[80vh] bg-white rounded-2xl border border-stone-200 shadow-2xl z-40 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 grid place-items-center text-white">
          <Icon name="sparkle" size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold text-stone-900">JoineryTech AI</div>
          <div className="text-[10.5px] text-stone-500">Kontextus: {page} \u00b7 streaming</div>
        </div>
        <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700">
          <Icon name="x" size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/40">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[12.5px] leading-relaxed ${
              m.role === "user" ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-800"
            }`}>
              {m.text}
              {m.streaming && <span className="inline-block w-1.5 h-3.5 align-middle bg-stone-400 animate-pulse ml-0.5" />}
              {m.tool === "orders" && (
                <div className="mt-2 -mx-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-stone-100">
                  <div className="text-[10px] uppercase tracking-wide text-stone-500">Eszk\u00f6z eredm\u00e9ny</div>
                  <div className="text-[11.5px] font-medium text-stone-900 flex items-center gap-1.5 mt-0.5">
                    <Icon name="orders" size={12} /> 28 rendel\u00e9s gy\u00e1rt\u00e1s alatt <Icon name="external" size={11} className="ml-auto" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5 border-t border-stone-200">
        {SUGGESTIONS.map((s, i) => (
          <button key={i} onClick={() => send(s)}
            className="text-[10.5px] px-2 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200">
            {s}
          </button>
        ))}
      </div>
      <div className="p-3 flex items-center gap-2 border-t border-stone-200 bg-white">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="K\u00e9rdezz valamit..."
          className="flex-1 h-9 px-3 rounded-lg bg-stone-100 outline-none text-[12.5px] focus:bg-stone-50 focus:ring-1 focus:ring-teal-500" />
        <button onClick={() => send()} disabled={!input.trim()}
          className="w-9 h-9 grid place-items-center rounded-lg bg-teal-700 text-white disabled:opacity-40 hover:bg-teal-800">
          <Icon name="send" size={15} />
        </button>
      </div>
    </aside>
  );
}

function ChatBubble({ page }) {
  const [open, setOpen] = useStateC(false);
  return (
    <>
      <button onClick={() => setOpen(!open)}
        className="fixed right-4 bottom-4 w-12 h-12 rounded-full bg-stone-900 text-white grid place-items-center shadow-lg hover:bg-stone-800 z-30">
        {open ? <Icon name="x" size={18} /> : <Icon name="chat" size={18} />}
        {!open && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-400 ring-2 ring-stone-900" />}
      </button>
      <ChatPanel open={open} onClose={() => setOpen(false)} page={page} />
    </>
  );
}

// Mini Kanban strip for Dashboard
function MiniKanbanStrip({ onNav }) {
  const counts = STAGES.map(s => ({ ...s, count: FLOW_EPICS.filter(e => e.stage === s.key).length }));
  return (
    <Card className="p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[12.5px] font-semibold text-stone-900">Munkafolyamat \u00e1ttekint\u00e9s</div>
          <div className="text-[11px] text-stone-500">Doorstar StageChain \u00b7 {FLOW_EPICS.length} akt\u00edv feladat</div>
        </div>
        <button onClick={() => onNav("workflow")} className="text-[11.5px] text-teal-700 hover:text-teal-900 font-medium inline-flex items-center gap-1">
          Megnyit\u00e1s <Icon name="chevron" size={12} />
        </button>
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
      <div className="grid gap-1.5 min-w-[620px]" style={{ gridTemplateColumns: `repeat(${counts.length}, minmax(0, 1fr))` }}>
        {counts.map((s, i) => (
          <button key={s.key} onClick={() => onNav("workflow")}
            className="text-left bg-stone-50 hover:bg-teal-50/60 border border-stone-200/60 rounded-lg px-3 py-2.5 transition relative">
            <div className="flex items-center justify-between gap-1">
              <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium truncate">{s.hu}</div>
              {s.optional && <span className="text-[8.5px] text-stone-400">opt</span>}
            </div>
            <div className="text-[22px] font-semibold tabular-nums text-stone-900 mt-0.5">{s.count}</div>
            {i < counts.length - 1 && (
              <div className="absolute -right-1 top-1/2 -translate-y-1/2 text-stone-300 z-10 hidden lg:block"><Icon name="chevron" size={12} /></div>
            )}
          </button>
        ))}
      </div>
      </div>
    </Card>
  );
}

// Settings: G\u00e9ppark
function MachineParkPanel() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12.5px] text-stone-500">{WORKSTATIONS.length} g\u00e9p \u00b7 {WORKSTATIONS.filter(w => w.status === "ok").length} akt\u00edv</div>
        <PrimaryBtn icon="plus">G\u00e9p hozz\u00e1ad\u00e1sa</PrimaryBtn>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {WORKSTATIONS.map(w => {
          const tone = w.status === "ok" ? STATUS_TONES.ok : w.status === "low" ? STATUS_TONES.low : STATUS_TONES.critical;
          const label = w.status === "ok" ? "Akt\u00edv" : w.status === "low" ? "Karbantart\u00e1s" : "Le\u00e1ll\u00edtva";
          return (
            <Card key={w.name} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-stone-900 truncate">{w.name}</div>
                  <div className="text-[10.5px] text-stone-500">{w.type}</div>
                </div>
                <StatusPill status={w.status === "ok" ? "ok" : w.status === "low" ? "low" : "critical"} label={label} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${w.status === "critical" ? "bg-rose-500" : w.status === "low" ? "bg-amber-500" : "bg-teal-600"}`} style={{ width: `${w.capacity}%` }} />
                </div>
                <span className="text-[10.5px] text-stone-500 tabular-nums">{w.capacity}%</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10.5px]">
                <div>
                  <div className="text-stone-500">Utols\u00f3 karb.</div>
                  <div className="font-mono text-stone-700">{w.lastService}</div>
                </div>
                <div>
                  <div className="text-stone-500">Operator</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {w.operators.length === 0 && <span className="text-stone-400">\u2014</span>}
                    {w.operators.map(o => <Avatar key={o} id={o} size={16} />)}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 pt-3 border-t border-stone-100">
                <button className="text-[10.5px] px-2 h-7 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700">Akt\u00edv</button>
                <button className="text-[10.5px] px-2 h-7 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700">Karb.</button>
                <button className="text-[10.5px] px-2 h-7 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700">Le\u00e1ll\u00edt</button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Settings: Katal\u00f3gus
function CatalogPanel() {
  const [tab, setTab] = useStateC("materials");
  const tabs = [
    { k: "materials", label: "Anyagok" },
    { k: "templates", label: "Sablonok" },
    { k: "edges",     label: "\u00c9lz\u00e1r\u00f3k" },
    { k: "hardware",  label: "Vasalatok" },
  ];
  return (
    <div>
      <div className="flex items-center gap-1 mb-3 bg-white border border-stone-200 rounded-lg p-0.5 w-fit">
        {tabs.map(x => (
          <button key={x.k} onClick={() => setTab(x.k)}
            className={`px-3 h-7 rounded-md text-[12px] font-medium ${tab === x.k ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>{x.label}</button>
        ))}
      </div>
      {tab === "materials" && (
        <Card className="p-0">
          <div className="grid grid-cols-[1fr_180px_140px_120px_120px_100px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-100 bg-stone-50/40">
            <div>N\u00e9v</div><div>Vastags\u00e1gok</div><div>M\u00e9ret</div><div className="text-right">\u00c1r / t\u00e1bla</div><div>Sz\u00e1ll\u00edt\u00f3</div><div>Akt\u00edv</div>
          </div>
          {CATALOG_MATERIALS.map(m => (
            <div key={m.name} className="grid grid-cols-[1fr_180px_140px_120px_120px_100px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center hover:bg-stone-50/60">
              <div className="text-[12.5px] font-medium text-stone-900">{m.name}</div>
              <div className="flex gap-1 flex-wrap">{m.thicknesses.map(t => <span key={t} className="text-[10.5px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded font-mono">{t}</span>)}</div>
              <div className="text-[11.5px] font-mono text-stone-600">{m.sizes}</div>
              <div className="text-[12px] text-right tabular-nums">{fmtHUF(m.price)}</div>
              <div className="text-[12px] text-stone-700">{m.supplier}</div>
              <div><span className="inline-block w-8 h-4 bg-teal-600 rounded-full relative"><span className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" /></span></div>
            </div>
          ))}
        </Card>
      )}
      {tab === "templates" && <TemplatesPanel />}
      {tab === "edges" && (
        <Card className="p-8 text-center text-[12px] text-stone-500">
          \u00c9lz\u00e1r\u00f3 katal\u00f3gus (ABS, PVC, melamin) \u2014 placeholder
        </Card>
      )}
      {tab === "hardware" && (
        <Card className="p-8 text-center text-[12px] text-stone-500">
          Vasalat katal\u00f3gus (Blum, Hettich) \u2014 placeholder
        </Card>
      )}
    </div>
  );
}

// Settings: Audit log
function AuditPanel() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12.5px] text-stone-500">{AUDIT_LOG.length} esem\u00e9ny \u00b7 hash chain folyamatos</div>
        <div className="flex items-center gap-2">
          <GhostBtn icon="check">L\u00e1nc ellen\u0151rz\u00e9se</GhostBtn>
          <GhostBtn icon="download">CSV</GhostBtn>
        </div>
      </div>
      <Card className="p-0">
        <div className="hidden md:grid grid-cols-[160px_140px_180px_1fr_120px_60px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-100 bg-stone-50/40">
          <div>Id\u0151</div><div>Felhaszn\u00e1l\u00f3</div><div>Esem\u00e9ny</div><div>C\u00e9l</div><div>Hash</div><div className="text-right">OK</div>
        </div>
        {AUDIT_LOG.map((a, i) => (
          <div key={i} className="hidden md:grid grid-cols-[160px_140px_180px_1fr_120px_60px] gap-3 px-5 py-2.5 border-b border-stone-100 last:border-0 items-center hover:bg-stone-50/60">
            <div className="text-[11.5px] font-mono text-stone-600">{a.ts}</div>
            <div className="text-[11.5px] text-stone-700">{a.actor}</div>
            <div className="text-[11.5px] font-mono text-stone-700">{a.event}</div>
            <div className="text-[11.5px] font-mono text-stone-500">{a.target}</div>
            <div className="text-[11px] font-mono text-teal-700">{a.hash}</div>
            <div className="text-right text-emerald-600"><Icon name="check" size={14} className="inline" /></div>
          </div>
        ))}
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-stone-100">
          {AUDIT_LOG.map((a, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-mono font-medium text-stone-800 truncate">{a.event}</span>
                <span className="text-emerald-600 shrink-0"><Icon name="check" size={14} className="inline" /></span>
              </div>
              <div className="text-[11.5px] font-mono text-stone-500 mt-0.5 truncate">{a.target}</div>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-stone-500">
                <span>{a.actor}</span>
                <span className="font-mono">{a.ts}</span>
                <span className="font-mono text-teal-700">{a.hash}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

window.ChatBubble = ChatBubble;
window.MiniKanbanStrip = MiniKanbanStrip;
window.MachineParkPanel = MachineParkPanel;
window.CatalogPanel = CatalogPanel;
window.AuditPanel = AuditPanel;
