// Sales Phase 2 — SlideOver detail components
// QuoteDetailSlideOver  · CreateQuoteSlideOver  · CustomerDetailSlideOver
// All three reuse the SlideOver primitive from page-extras-2 and the
// section-label / key-value / inline-edit patterns from UsersPanel.

const { useState: useStateSD, useEffect: useEffectSD, useMemo: useMemoSD, useRef: useRefSD } = React;

// ─────────────────────────────────────────────────────────────────────────
// Shared atoms — section label + key/value row + small inline spinner
// ─────────────────────────────────────────────────────────────────────────
const SECTION_LABEL = "text-[10.5px] font-semibold text-stone-500 uppercase tracking-[0.06em]";

function KVRow({ label, children, mono = false }) {
  return (
    <div className="grid grid-cols-[112px_1fr] items-baseline gap-3 text-[12px] py-1">
      <dt className="text-stone-500">{label}</dt>
      <dd className={`text-stone-900 ${mono ? "font-mono" : ""}`}>{children}</dd>
    </div>
  );
}

function MiniSpinner({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.2"/>
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function StatusBadge({ status, map = QUOTE_STATUS_MAP }) {
  const t = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${t.bg} ${t.fg} ring-1 ring-inset ${t.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {t.label}
    </span>
  );
}

// HUF currency cell helper (compact, monospace)
const huf = (n) => n.toLocaleString("hu-HU") + " Ft";

// ─────────────────────────────────────────────────────────────────────────
// 1.1  QuoteDetailSlideOver
// ─────────────────────────────────────────────────────────────────────────
function QuoteDetailSlideOver({ quote, onClose, onOpenCustomer }) {
  // Local working copy — so FSM transitions / edits feel live in the prototype.
  const [status, setStatus] = useStateSD(quote ? quote.status : "draft");
  const quoteLines = (qt) => {
    if (!qt) return [];
    if (qt.lines && qt.lines.length) return qt.lines.map((l, i) => ({ id: l.uid || ("L" + i), uid: l.uid || ("L" + i), parentUid: l.parentUid || null, subMode: l.subMode || null, source: l.source || null, description: l.name, quantity: l.qty, unitPrice: l.price, cost: l.cost, code: l.code, unit: l.unit, vat: l.vat, design: l.design, config: l.config, custom: l.custom, priceClass: l.priceClass || null, rangePct: l.rangePct == null ? null : l.rangePct }));
    if (QUOTE_LINES[qt.id]) return QUOTE_LINES[qt.id].map(l => ({ ...l }));
    return [];
  };
  const [lines, setLines] = useStateSD(() => quoteLines(quote));
  const [pendingAction, setPendingAction] = useStateSD(null); // "send" | "reject" | "convert" | null
  const [converting, setConverting] = useStateSD(false);
  // inline-edit per-line state
  const [editLineId, setEditLineId] = useStateSD(null);
  const [draftEdit, setDraftEdit] = useStateSD({ quantity: 0, unitPrice: 0 });
  // add-line form
  const [newLine, setNewLine] = useStateSD({ description: "", quantity: 1, unitPrice: 0 });
  // ár-pontosítás (PS-minta): irányár/kalkulált tétel szabályozott módosítása
  const [refineId, setRefineId] = useStateSD(null);
  const [refineDraft, setRefineDraft] = useStateSD({ price: 0, priceClass: "fix", note: "" });
  const [psAck, setPsAck] = useStateSD(false);
  // full builder editor (same UI as new quote) for draft quotes
  const [editorOpen, setEditorOpen] = useStateSD(false);
  // send / reject form fields
  const [validUntil, setValidUntil] = useStateSD(quote ? quote.expires : "");
  const [rejectReason, setRejectReason] = useStateSD("");
  // permission gating (B2B / B2C / B2B2C) + forward sheet
  const sim = useSim();
  const canConvert  = window.sim.hasPerm("quote.convert");
  const canForward  = window.sim.hasPerm("forward");
  const canTrackOrder   = window.sim.hasPerm("order.track");
  const canViewProjects = (window.sim.currentAccount()?.worlds || []).includes("projects");

  // Reactively derive related order + project + requisition created from this quote
  const convertedOrder   = (sim.orders   || []).find(o => o.fromQuote === (quote && quote.id));
  const convertedProject = (sim.projects || []).find(p => p.fromQuote === (quote && quote.id));
  const convertedReq     = (sim.requisitions || []).find(r => r.fromQuote === (quote && quote.id) && r.type === "order-req");

  // Navigation helpers — set deep-link signal, close SlideOver, jump to world
  const onOpenOrder = () => {
    if (convertedOrder) window._pendingOpen = { type: "order", id: convertedOrder.id };
    onClose();
    window.navigateTo?.("procurement", "orders");
  };
  const onOpenProject = () => {
    if (convertedProject) window._pendingOpen = { type: "project", id: convertedProject.id };
    onClose();
    window.navigateTo?.("projects");
  };
  const [forwardOpen, setForwardOpen] = useStateSD(false);
  const [genProject, setGenProject] = useStateSD(() => { const a = window.sim.currentAccount(); return !!a && (a.type === "reseller" || a.type === "internal"); });

  // reset when quote changes
  useEffectSD(() => {
    if (!quote) return;
    setStatus(quote.status);
    setLines(quoteLines(quote));
    setPendingAction(null);
    setEditLineId(null);
    setRefineId(null);
    setPsAck(false);
    setNewLine({ description: "", quantity: 1, unitPrice: 0 });
    setValidUntil(quote.expires);
    setRejectReason("");
  }, [quote && quote.id]);

  const subtotal = useMemoSD(() => {
    const hasKids = (uid) => lines.some((x) => x.parentUid === uid);
    return lines.reduce((s, l) => (hasKids(l.id) ? s : s + l.quantity * l.unitPrice), 0);
  }, [lines]);
  const vat = Math.round(subtotal * VAT_RATE);
  const total = subtotal + vat;
  // nem-fix tételek (irányár/kalkulált) — PS-kapu a konvertáláshoz
  const psCount = lines.filter((l) => !lines.some((x) => x.parentUid === l.id) && l.priceClass && l.priceClass !== "fix").length;

  if (!quote) return null;

  const isDraft = status === "draft";
  const isReadonly = status === "converted" || status === "archived" || status === "conversionPending";

  // Per-line actions — minden írás a store-ba is perzisztál (updateQuoteLines, csak draft)
  const persistLines = (ls) => {
    window.sim?.updateQuoteLines?.(quote.id, ls.map((l) => ({
      uid: l.uid || l.id, parentUid: l.parentUid || null, subMode: l.subMode || null, source: l.source || null,
      name: l.description, code: l.code, unit: l.unit || "db",
      qty: Number(l.quantity) || 0, price: Number(l.unitPrice) || 0, cost: l.cost,
      vat: l.vat, design: l.design, config: l.config, custom: l.custom,
      priceClass: l.priceClass || null, rangePct: l.rangePct == null ? null : l.rangePct,
    })));
  };
  const startEdit = (l) => {
    if (!isDraft) return;
    setEditLineId(l.id);
    setDraftEdit({ quantity: l.quantity, unitPrice: l.unitPrice });
  };
  const saveEdit = (id) => {
    const next = lines.map(l => l.id === id ? { ...l, quantity: Number(draftEdit.quantity) || 0, unitPrice: Number(draftEdit.unitPrice) || 0 } : l);
    setLines(next);
    persistLines(next);
    setEditLineId(null);
    window.toast?.("✓ Sor frissítve", "success");
  };
  const removeLine = (id) => {
    // főtétel törlésekor az altagok főtétellé lépnek elő (nincs adatvesztés)
    const next = lines.filter(l => l.id !== id).map(l => (l.parentUid === id ? { ...l, parentUid: null } : l));
    setLines(next);
    persistLines(next);
    window.toast?.("Sor törölve", "info");
  };
  const addLine = () => {
    if (!newLine.description.trim() || !newLine.quantity || !newLine.unitPrice) return;
    const next = [...lines, { id: "L" + (Date.now() % 100000), ...newLine, quantity: Number(newLine.quantity), unitPrice: Number(newLine.unitPrice) }];
    setLines(next);
    persistLines(next);
    setNewLine({ description: "", quantity: 1, unitPrice: 0 });
    window.toast?.("✓ Tétel hozzáadva", "success");
  };

  // ── Tétel-hierarchia: altagok, sorrend, számozás (számított), forrás-zár ──
  const kidsOf = (uid) => lines.filter((x) => x.parentUid === uid);
  const isParentLine = (l) => kidsOf(l.id).length > 0;
  const parentSum = (uid) => kidsOf(uid).reduce((s, k) => s + k.quantity * k.unitPrice, 0);
  // megjelenítési sorrend: főtételek a tömb sorrendjében, mindegyik után az altagjai
  const displayLines = (() => {
    const out = [];
    lines.filter((l) => !l.parentUid).forEach((p) => { out.push(p); kidsOf(p.id).forEach((k) => out.push(k)); });
    lines.forEach((l) => { if (l.parentUid && !lines.some((x) => x.id === l.parentUid)) out.push(l); }); // árvák
    return out;
  })();
  const lineNos = window.sim.quoteLineNumbers ? window.sim.quoteLineNumbers(displayLines.map((l) => ({ uid: l.id, parentUid: l.parentUid }))) : {};
  const setAndPersist = (next) => { setLines(next); persistLines(next); };
  const moveLine = (l, dir) => {
    if (!l.parentUid) {
      // főtétel: blokk-mozgatás (önmaga + altagjai együtt)
      const mains = lines.filter((x) => !x.parentUid);
      const mi = mains.findIndex((x) => x.id === l.id);
      const ti = mi + dir;
      if (ti < 0 || ti >= mains.length) return;
      const newMains = [...mains];
      [newMains[mi], newMains[ti]] = [newMains[ti], newMains[mi]];
      const next = newMains.flatMap((m) => [m, ...kidsOf(m.id)]);
      lines.forEach((x) => { if (!next.includes(x)) next.push(x); });
      setAndPersist(next);
    } else {
      const arr = [...lines];
      const sibs = arr.filter((x) => x.parentUid === l.parentUid);
      const si = sibs.findIndex((x) => x.id === l.id);
      const ti = si + dir;
      if (ti < 0 || ti >= sibs.length) return;
      const a = arr.indexOf(sibs[si]), b = arr.indexOf(sibs[ti]);
      [arr[a], arr[b]] = [arr[b], arr[a]];
      setAndPersist(arr);
    }
  };
  const indentLine = (l) => {
    // altaggá: az őt megelőző főtétel alá kerül
    if (l.parentUid || isParentLine(l)) return;
    const mains = lines.filter((x) => !x.parentUid);
    const mi = mains.findIndex((x) => x.id === l.id);
    if (mi <= 0) return;
    setAndPersist(lines.map((x) => (x.id === l.id ? { ...x, parentUid: mains[mi - 1].id } : x)));
  };
  const outdentLine = (l) => {
    if (!l.parentUid) return;
    setAndPersist(lines.map((x) => (x.id === l.id ? { ...x, parentUid: null } : x)));
  };
  const toggleSubMode = (l) => setAndPersist(lines.map((x) => (x.id === l.id ? { ...x, subMode: (x.subMode || "reszletezett") === "osszevont" ? "reszletezett" : "osszevont" } : x)));
  // forrás-zárt sor (pl. belsőépítészet): szerkesztés CSAK a forrás-világban — deep-link oda
  const openSource = (src) => {
    if (!src) return;
    onClose();
    if (src.kind === "concept") { window._interiorOpen = src.ref; window.navigateTo?.("interior", "concepts"); }
    else if (src.kind === "composition") { window.navigateTo?.("interior", "composition"); }
    else if (src.kind === "rfq") { window.navigateTo?.("procurement", "rfq"); }
    else if (src.kind === "techreq") { window.navigateTo?.("design", "engineer"); }
    else window.navigateTo?.(src.world || "interior");
  };

  // FSM transitions
  const doSend = () => {
    setStatus("sent");
    setPendingAction(null);
    window.sim?.setQuoteStatus(quote.id, "sent");
    window.toast?.("✓ Ajánlat kiküldve — érvényesség: " + validUntil, "success");
  };
  const doAccept = () => {
    setStatus("approved");
    window.sim?.setQuoteStatus(quote.id, "approved");
    window.toast?.("✓ Ajánlat elfogadva", "success");
  };
  const doReject = () => {
    setStatus("rejected");
    setPendingAction(null);
    window.sim?.setQuoteStatus(quote.id, "rejected");
    window.toast?.("Ajánlat elutasítva" + (rejectReason ? " — " + rejectReason : ""), "info");
  };
  const doArchive = () => {
    setStatus("archived");
    window.sim?.setQuoteStatus(quote.id, "archived");
    window.toast?.("Ajánlat archiválva", "info");
  };
  const doConvert = () => {
    setConverting(true);
    setStatus("conversionPending");
    setTimeout(() => {
      // New flow: quote → igénylés (not order directly)
      const reqId = window.sim?.createRequisitionFromQuote(quote.id);
      window.sim?.setQuoteStatus(quote.id, "converted");
      if (genProject) window.sim?.createProjectFromQuote(quote.id, null);
      setStatus("converted");
      setConverting(false);
      window.toast?.(reqId ? `✓ Igénylés létrejött — ${reqId} · jóváhagyás után rendelés generálható` : "✓ Ajánlat igénylésbe konvertálva", "success");
      // művelet utáni navigációs kérdés (linked-refs.jsx)
      if (reqId && window.askNextStep) window.askNextStep({
        title: `Igénylés létrejött — ${reqId}`,
        text: "Jóváhagyás után generálható belőle rendelés a Beszerzésben.",
        options: [
          { label: "Ugrás az igénylésre", icon: "inbox", primary: true, hint: "Beszerzés → Igénylések · jóváhagyás", onClick: () => { window._pendingOpen = { type: "requisition", id: reqId }; window.navigateTo?.("procurement", "requisitions"); } },
          { label: "Maradok az ajánlatnál", icon: "send" },
        ],
      });
    }, 1600);
  };

  const subtitle = (
    <span className="inline-flex items-center gap-1.5">
      <button onClick={() => onOpenCustomer && onOpenCustomer(quote)} className="hover:text-indigo-700 hover:underline">{quote.customer}</button>
    </span>
  );

  return (
    <SlideOver open={true} onClose={onClose} title={quote.id} subtitle={subtitle} width={680}
      footer={<GhostBtn onClick={onClose}>Bezárás</GhostBtn>}>
      <div className="px-5 py-4 space-y-6">

        {/* ── HEADER SUMMARY ── */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="text-[13px] text-stone-600">Ajánlat összefoglaló</div>
            <StatusBadge status={status} />
          </div>
          <dl className="grid grid-cols-2 gap-x-6">
            <KVRow label="Ügyfél">
              <button onClick={() => onOpenCustomer && onOpenCustomer(quote)} className="font-medium text-stone-900 hover:text-indigo-700 hover:underline">{quote.customer}</button>
            </KVRow>
            <KVRow label="Felelős">{quote.owner}</KVRow>
            <KVRow label="Létrehozva" mono>{quote.date}</KVRow>
            <KVRow label="Lejár"      mono>{validUntil || "—"}</KVRow>
          </dl>
        </div>

        {/* ── LINES ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className={SECTION_LABEL}>Tételek <span className="text-stone-400 normal-case tracking-normal font-normal ml-1">({lines.length})</span></div>
            {isDraft && (
              <div className="flex items-center gap-3">
                <button onClick={() => document.getElementById("qd-newline-input")?.focus()}
                  className="text-[11px] text-stone-500 hover:text-stone-700 font-medium inline-flex items-center gap-1">
                  <Icon name="plus" size={11} /> Gyors tétel
                </button>
                <button onClick={() => setEditorOpen(true)}
                  className="text-[11px] text-indigo-700 hover:text-indigo-900 font-medium inline-flex items-center gap-1">
                  <Icon name="settings" size={11} /> Szerkesztés (mint új ajánlat)
                </button>
              </div>
            )}
          </div>

          <div className="border border-stone-200 rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-stone-50/70 text-left">
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wide text-stone-500 font-semibold w-10 text-right">#</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 font-semibold">Megnevezés</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 font-semibold w-14 text-right">Db</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 font-semibold w-28 text-right">Egységár</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 font-semibold w-32 text-right">Összeg</th>
                  {isDraft && <th className="w-28"></th>}
                </tr>
              </thead>
              <tbody>
                {displayLines.map(l => {
                  const editing = editLineId === l.id;
                  const child = !!l.parentUid;
                  const parentLine = child ? lines.find(x => x.id === l.parentUid) : null;
                  const parent = isParentLine(l);
                  const locked = !!l.source;
                  const rolled = child && parentLine && (parentLine.subMode || "reszletezett") === "osszevont";
                  const editable = isDraft && !locked && !parent;
                  const tinyBtn = "w-5 h-5 grid place-items-center rounded text-[11px] leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-700";
                  return (
                    <tr key={l.id} className={`border-t border-stone-100 ${parent ? "bg-stone-50/60" : "hover:bg-stone-50/40"}`}>
                      <td className="px-2 py-2 text-right font-mono text-[10.5px] text-stone-400 whitespace-nowrap align-top">{lineNos[l.id] || ""}</td>
                      <td className={`px-3 py-2 text-stone-900 ${child ? "pl-6" : ""}`}>
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          {child && <span className="text-stone-300 shrink-0">└</span>}
                          <span className={`${parent ? "font-semibold" : ""} ${rolled ? "text-stone-500" : ""}`}>{l.description}</span>
                          {l.source && (
                            <button onClick={() => openSource(l.source)} title={`${l.source.label} — ez a sor csak ott szerkeszthető. Megnyitás →`}
                              className="shrink-0 inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[9.5px] font-medium hover:bg-rose-100">
                              <Icon name="lock" size={9} />{l.source.label}
                            </button>
                          )}
                          {!parent && (() => {
                            const META = window.PRICE_CLASS_META || {};
                            const cls = META[l.priceClass] ? l.priceClass : "fix";
                            if (cls === "fix") return null;
                            const m = META[cls];
                            const canRefine = ["draft", "sent", "approved"].includes(status);
                            return (
                              <button onClick={canRefine ? () => { setRefineId(refineId === l.id ? null : l.id); setRefineDraft({ price: l.unitPrice, priceClass: "fix", note: "" }); } : undefined}
                                title={m.hint + (canRefine ? " Kattints a pontosításhoz." : "")}
                                className={`shrink-0 inline-flex items-center gap-1 px-1.5 h-5 rounded-full border text-[9.5px] font-medium bg-${m.tone}-50 text-${m.tone}-700 border-${m.tone}-200 ${canRefine ? `hover:bg-${m.tone}-100` : ""}`}>
                                {m.label} ±{l.rangePct != null ? l.rangePct : m.band}%
                              </button>
                            );
                          })()}
                          {parent && (
                            <button onClick={() => isDraft && toggleSubMode(l)} title="Altagok megjelenítése: összevont (csak a főtétel összege) / részletezett (altag-árakkal)"
                              className={`shrink-0 px-1.5 h-5 rounded-full border text-[9.5px] font-medium ${(l.subMode || "reszletezett") === "osszevont" ? "bg-stone-100 text-stone-600 border-stone-200" : "bg-indigo-50 text-indigo-600 border-indigo-200"} ${isDraft ? "" : "pointer-events-none opacity-70"}`}>
                              {(l.subMode || "reszletezett") === "osszevont" ? "Összevont" : "Részletezett"}
                            </button>
                          )}
                        </div>
                      </td>
                      {editing ? (
                        <>
                          <td className="px-1 py-1.5">
                            <input type="number" value={draftEdit.quantity}
                              onChange={(e) => setDraftEdit(d => ({ ...d, quantity: e.target.value }))}
                              className="w-12 h-7 px-1.5 text-[12px] text-right border border-indigo-300 rounded font-mono outline-none focus:ring-2 focus:ring-indigo-200" />
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="number" value={draftEdit.unitPrice}
                              onChange={(e) => setDraftEdit(d => ({ ...d, unitPrice: e.target.value }))}
                              className="w-24 h-7 px-1.5 text-[12px] text-right border border-indigo-300 rounded font-mono outline-none focus:ring-2 focus:ring-indigo-200" />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <div className="inline-flex gap-1">
                              <button onClick={() => setEditLineId(null)} className="h-7 px-2 rounded text-[11px] text-stone-600 hover:bg-stone-100">Mégse</button>
                              <button onClick={() => saveEdit(l.id)} className="h-7 px-2 rounded text-[11px] bg-indigo-600 text-white hover:bg-indigo-700">Mentés</button>
                            </div>
                          </td>
                          <td></td>
                        </>
                      ) : (
                        <>
                          <td onClick={() => editable && startEdit(l)} className={`px-3 py-2 text-right font-mono ${rolled || parent ? "text-stone-300" : "text-stone-700"} ${editable ? "cursor-pointer hover:bg-indigo-50/40" : ""}`}>{parent ? "—" : rolled ? "·" : l.quantity}</td>
                          <td onClick={() => editable && startEdit(l)} className={`px-3 py-2 text-right font-mono ${rolled || parent ? "text-stone-300" : "text-stone-700"} ${editable ? "cursor-pointer hover:bg-indigo-50/40" : ""}`}>{parent ? "—" : rolled ? "·" : l.unitPrice.toLocaleString("hu-HU")}</td>
                          <td className={`px-3 py-2 text-right font-mono font-medium ${rolled ? "text-stone-300" : "text-stone-900"}`}>{parent ? huf(parentSum(l.id)) : rolled ? "·" : huf(l.quantity * l.unitPrice)}</td>
                          {isDraft && (
                            <td className="px-1.5 py-2">
                              <div className="flex items-center justify-end gap-0.5">
                                <button onClick={() => moveLine(l, -1)} title="Mozgatás fel" className={tinyBtn}>↑</button>
                                <button onClick={() => moveLine(l, +1)} title="Mozgatás le" className={tinyBtn}>↓</button>
                                {!child && !parent && !locked && <button onClick={() => indentLine(l)} title="Altétellé — az előző főtétel alá" className={tinyBtn}>↳</button>}
                                {child && !locked && <button onClick={() => outdentLine(l)} title="Főtétellé emelés" className={tinyBtn}>↰</button>}
                                {!locked && (
                                  <button onClick={() => removeLine(l.id)} title="Sor törlése"
                                    className="w-5 h-5 grid place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600">
                                    <Icon name="x" size={11} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })}
                {lines.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-[11.5px] text-stone-400">Nincs tétel — adj hozzá egyet alább.</td></tr>
                )}
                {isDraft && (
                  <tr className="border-t border-stone-100 bg-stone-50/40">
                    <td></td>
                    <td className="px-3 py-2">
                      <input id="qd-newline-input" value={newLine.description}
                        onChange={(e) => setNewLine(n => ({ ...n, description: e.target.value }))}
                        placeholder="Új tétel megnevezése…"
                        className="w-full h-7 px-2 text-[12px] border border-stone-200 rounded bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" />
                    </td>
                    <td className="px-1 py-1.5">
                      <input type="number" value={newLine.quantity} onChange={(e) => setNewLine(n => ({ ...n, quantity: e.target.value }))}
                        className="w-12 h-7 px-1.5 text-[12px] text-right font-mono border border-stone-200 rounded bg-white outline-none focus:border-indigo-400" />
                    </td>
                    <td className="px-1 py-1.5">
                      <input type="number" value={newLine.unitPrice} onChange={(e) => setNewLine(n => ({ ...n, unitPrice: e.target.value }))}
                        placeholder="0"
                        className="w-24 h-7 px-1.5 text-[12px] text-right font-mono border border-stone-200 rounded bg-white outline-none focus:border-indigo-400" />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button onClick={addLine}
                        disabled={!newLine.description.trim() || !newLine.unitPrice}
                        className="h-7 px-2.5 rounded text-[11px] font-medium bg-stone-900 text-white hover:bg-stone-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1">
                        <Icon name="plus" size={11} /> Hozzáad
                      </button>
                    </td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ár-pontosítás panel (PS-minta: nem néma átírás, naplózott módosítás) */}
          {refineId && (() => {
            const l = lines.find((x) => x.id === refineId);
            if (!l) return null;
            const delta = ((Number(refineDraft.price) || 0) - l.unitPrice) * l.quantity;
            const doRefine = () => {
              if (!window.sim.refineQuoteLine(quote.id, l.uid, refineDraft)) return;
              setLines(lines.map((x) => (x.id === l.id ? { ...x, unitPrice: Number(refineDraft.price) || 0, priceClass: refineDraft.priceClass, rangePct: null } : x)));
              setRefineId(null);
              window.toast?.("✓ Ár pontosítva — módosításként naplózva", "success");
            };
            return (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                <div className="text-[11.5px] font-medium text-stone-800">Ár-pontosítás — {l.description}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="number" value={refineDraft.price} onChange={(e) => setRefineDraft((d) => ({ ...d, price: e.target.value }))}
                    className="h-8 w-32 px-2 rounded-lg border border-stone-300 bg-white text-right font-mono text-[12px] outline-none focus:border-amber-400" />
                  {["fix", "kalkulalt"].map((k) => {
                    const m = window.PRICE_CLASS_META[k];
                    return (
                      <button key={k} onClick={() => setRefineDraft((d) => ({ ...d, priceClass: k }))} title={m.hint}
                        className={`h-7 px-2 rounded-md text-[10.5px] font-medium border ${refineDraft.priceClass === k ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-500 border-stone-200"}`}>{m.label}</button>
                    );
                  })}
                  <input value={refineDraft.note} onChange={(e) => setRefineDraft((d) => ({ ...d, note: e.target.value }))} placeholder="Indok (pl. műszaki terv pontosította)"
                    className="flex-1 min-w-[160px] h-8 px-2 rounded-lg border border-stone-300 bg-white text-[12px] outline-none focus:border-amber-400" />
                  <button onClick={doRefine} className="h-8 px-3 rounded-lg bg-amber-600 text-white text-[11.5px] font-semibold hover:bg-amber-700">Pontosítás</button>
                  <button onClick={() => setRefineId(null)} className="h-8 px-2.5 rounded-lg text-[11.5px] text-stone-500 hover:bg-stone-100">Mégse</button>
                </div>
                <div className="text-[10.5px] text-stone-500">Delta a végösszegben: <span className={`font-mono ${delta >= 0 ? "text-rose-600" : "text-emerald-600"}`}>{delta >= 0 ? "+" : ""}{huf(Math.round(delta))}</span> · a bejegyzés a módosítás-naplóba kerül.</div>
              </div>
            );
          })()}

          {/* totals */}
          <div className="flex justify-end mt-3">
            <dl className="text-right space-y-0.5 text-[12px] min-w-[220px]">
              {psCount > 0 && (() => {
                const META = window.PRICE_CLASS_META || {};
                const hasKids = (uid) => lines.some((x) => x.parentUid === uid);
                let min = 0, max = 0;
                lines.forEach((l) => {
                  if (hasKids(l.id)) return;
                  const cls = META[l.priceClass] ? l.priceClass : "fix";
                  const band = l.rangePct != null ? l.rangePct : (META[cls] || {}).band || 0;
                  const v = l.quantity * l.unitPrice;
                  min += v * (1 - band / 100); max += v * (1 + band / 100);
                });
                return (
                  <div className="flex justify-between gap-6" title={`${psCount} tétel irányár/kalkulált szinten — a sáv a deklarált érettségből számolt`}>
                    <dt className="text-amber-700">Várható sáv (nettó)</dt>
                    <dd className="font-mono text-amber-700">{huf(Math.round(min))} – {huf(Math.round(max))}</dd>
                  </div>
                );
              })()}
              <div className="flex justify-between gap-6"><dt className="text-stone-500">Nettó</dt><dd className="font-mono text-stone-800">{huf(subtotal)}</dd></div>
              <div className="flex justify-between gap-6"><dt className="text-stone-500">ÁFA 27%</dt><dd className="font-mono text-stone-800">{huf(vat)}</dd></div>
              <div className="flex justify-between gap-6 border-t border-stone-200 mt-1.5 pt-1.5">
                <dt className="font-semibold text-stone-900 text-[13px]">Bruttó</dt>
                <dd className="font-mono font-semibold text-stone-900 text-[13px]">{huf(total)}</dd>
              </div>
            </dl>
          </div>

          {/* Ár-pontosítások módosítás-naplója (PS-minta: delta-kijelzéssel) */}
          {(quote.priceChanges || []).length > 0 && (
            <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50/60 p-3">
              <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-1.5">Ár-pontosítások — módosítás-napló</div>
              <div className="space-y-0.5">
                {quote.priceChanges.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px] text-stone-600 min-w-0">
                    <span className="text-stone-400 font-mono shrink-0">{c.ts}</span>
                    <span className="truncate">{c.name}</span>
                    <span className="font-mono shrink-0">{Math.round(c.from).toLocaleString("hu-HU")} → {Math.round(c.to).toLocaleString("hu-HU")} Ft</span>
                    <span className={`font-mono shrink-0 ${c.to - c.from >= 0 ? "text-rose-600" : "text-emerald-600"}`}>({c.to - c.from >= 0 ? "+" : ""}{Math.round(c.to - c.from).toLocaleString("hu-HU")})</span>
                    {c.note && <span className="text-stone-400 truncate">— {c.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BELSŐ fedezet — csak belső + reseller nézet */}
          {window.MarginUtil && window.MarginUtil.canSee() && lines.length > 0 && (() => {
            const M = window.MarginUtil;
            const mt = M.totals(lines.map((l) => ({ price: l.unitPrice, cost: l.cost, qty: l.quantity })));
            const tn = M.tone(mt.pct);
            return (
              <div className="flex justify-end mt-2">
                <div className={`min-w-[220px] rounded-lg border ${tn.ring} ring-1 ${tn.bg} px-3 py-2`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"><Icon name="lock" size={10} /> Belső — fedezet</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10.5px] font-semibold bg-white ${tn.fg}`}><span className={`w-1.5 h-1.5 rounded-full ${tn.dot}`} />{M.fmtPct(mt.pct)}</span>
                  </div>
                  <div className="flex justify-between gap-6 text-[11.5px]"><span className="text-stone-500">Önköltség</span><span className="font-mono text-stone-700">{M.fmtHuf(mt.cost)}</span></div>
                  <div className="flex justify-between gap-6 text-[11.5px]"><span className="text-stone-500">Fedezet (profit)</span><span className={`font-mono font-semibold ${tn.fg}`}>{M.fmtHuf(mt.profit)}</span></div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── KAPCSOLÓDÓ — BELSŐÉPÍTÉSZET (vissza-link a forráshoz) ── */}
        {(() => {
          const conceptIds = new Set();
          const compoIds = new Set();
          (sim.concepts || []).forEach((c) => { if (c.quoteRef === quote.id) conceptIds.add(c.id); });
          const oppForQuote = (sim.opportunities || []).find((o) => o.quoteId === quote.id);
          if (oppForQuote && oppForQuote.conceptRef) conceptIds.add(oppForQuote.conceptRef);
          (sim.compositions || []).forEach((c) => { if (c.quoteRef === quote.id) compoIds.add(c.id); });
          lines.forEach((l) => {
            if (l.source && l.source.kind === "concept") conceptIds.add(l.source.ref);
            if (l.source && l.source.kind === "composition") compoIds.add(l.source.ref);
          });
          if (!conceptIds.size && !compoIds.size) return null;
          return (
            <div>
              <div className={SECTION_LABEL + " mb-2"}>Kapcsolódó — Belsőépítészet</div>
              <div className="space-y-1.5">
                {[...conceptIds].map((id) => window.RefPanel ? <window.RefPanel key={id} kind="concept" id={id} onBeforeNav={onClose} /> : null)}
                {[...compoIds].map((id) => window.RefPanel ? <window.RefPanel key={id} kind="composition" id={id} onBeforeNav={onClose} /> : null)}
              </div>
            </div>
          );
        })()}

        {/* ── AJÁNLATKÉRÉSEK (belső / külső) + ajánlat-díj ── */}
        <QuoteSubRequests quote={quote} onClose={onClose} />

        {/* ── ÖSSZEVONÁS (draft) ── */}
        <QuoteMergePanel quote={quote} />

        {/* ── ACTIONS ── */}
        <QuoteActions
          sendLocked={(() => { const f = quote.feeQuoteId ? (sim.quotes || []).find((x) => x.id === quote.feeQuoteId) : null; return !!(f && f.status !== "archived" && !["approved", "converted"].includes(f.status)); })()}
          status={status} isDraft={isDraft} converting={converting}
          pendingAction={pendingAction} setPendingAction={setPendingAction}
          validUntil={validUntil} setValidUntil={setValidUntil}
          rejectReason={rejectReason} setRejectReason={setRejectReason}
          doSend={doSend} doAccept={doAccept} doReject={doReject}
          doArchive={doArchive} doConvert={doConvert}
          canConvert={canConvert} canForward={canForward} onForward={() => setForwardOpen(true)}
          psCount={psCount} psAck={psAck} setPsAck={setPsAck}
          genProject={genProject} setGenProject={setGenProject}
          convertedOrderId={convertedOrder?.id}
          convertedProjectId={convertedProject?.id}
          convertedReqId={convertedReq?.id}
          canTrackOrder={canTrackOrder}
          canViewProjects={canViewProjects}
          onOpenOrder={onOpenOrder}
          onOpenProject={onOpenProject}
        />

      </div>
      {forwardOpen && <ForwardQuoteSheet quote={quote} onClose={() => setForwardOpen(false)} />}
      {editorOpen && window.ItemBuilder && (
        <ItemBuilder mode="quote" groupBy="cat"
          title={"Ajánlat szerkesztése — " + quote.id}
          subtitle="Katalógus, termékek, tervezett bútor, konfiguráció és egyedi tételek"
          submitLabel="Tételek mentése"
          enableDiscounts={false}
          initialHeader={quote.customer || ""}
          initialLines={lines.map((l) => ({
            name: l.description, code: l.code || "EGYEDI", unit: l.unit || "db",
            price: l.unitPrice, cost: l.cost, qty: l.quantity, vat: l.vat || VAT_RATE * 100, custom: l.custom != null ? l.custom : !l.code,
            design: l.design, config: l.config,
          }))}
          catalog={[...sim.sellableCatalog(), ...sim.products.map((p) => ({ id: p.id, code: p.id, name: p.name, unit: "db", price: p.price, cat: p.cat, supplier: "Saját termék" })), ...(window.intCatalogForBuilder ? window.intCatalogForBuilder() : [])]}
          customers={sim.customers}
          onAddCustomer={(c) => window.sim.addCustomer(c)}
          onClose={() => setEditorOpen(false)}
          onSubmit={({ lines: bl }) => {
            const next = bl.map((l, i) => ({
              id: "L" + i + "-" + (Date.now() % 100000), description: l.name,
              quantity: l.qty, unitPrice: l.price, cost: l.cost, code: l.custom ? undefined : l.code, unit: l.unit, vat: l.vat,
              design: l.design, config: l.config, custom: l.custom,
            }));
            setLines(next);
            persistLines(next);
            setEditorOpen(false);
            window.toast?.("✓ Tételek frissítve", "success");
          }} />
      )}
    </SlideOver>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Quote actions — FSM-driven button row + inline forms (Send / Reject)
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// Ajánlatkérések — az ajánlat pontosításához BELSŐ (belsőépítészet /
// műszaki tervezés) vagy KÜLSŐ (RFQ) kérés indítható. Rendelés az
// ajánlatból NEM indítható. + Ajánlat-készítési díj: külön kis ajánlat
// megy ki előre; elfogadásáig a részletes ajánlat kiküldése zárt.
// ─────────────────────────────────────────────────────────────────
function QuoteSubRequests({ quote, onClose }) {
  const sim = useSim();
  const [feeOpen, setFeeOpen] = useStateSD(false);
  const [feeAmt, setFeeAmt] = useStateSD("");
  const isDraft = quote.status === "draft";
  const reqs = window.sim.quoteRequestsFor ? window.sim.quoteRequestsFor(quote.id) : [];
  const hasConcept = window.sim.quoteHasConcept ? window.sim.quoteHasConcept(quote.id) : false;
  const briefReady = window.sim.quoteBriefReady ? window.sim.quoteBriefReady(quote.id) : false;
  const feeQ = quote.feeQuoteId ? (sim.quotes || []).find((x) => x.id === quote.feeQuoteId) : null;
  if (!isDraft && !reqs.length && !feeQ && !quote.detailFor) return null;
  const openReq = (kind) => !!reqs.find((r) => r.kind === kind && ["kert", "folyamatban"].includes(r.status));
  const reqBtn = "h-8 px-2.5 rounded-lg border text-[11.5px] font-medium inline-flex items-center gap-1.5 transition";
  const ask = (kind) => {
    if (kind === "rfq") {
      const rfqId = window.sim.createRfqFromQuote(quote.id, {});
      if (rfqId && window.askNextStep) window.askNextStep({
        title: `Külső ajánlatkérés indítva — ${rfqId}`,
        text: "A tételek és beszállítók a Beszerzés → Ajánlatkérés képernyőn adhatók meg; az odaítélt eredmény innen beemelhető tételként.",
        options: [
          { label: "Ugrás az RFQ-ra", icon: "send", primary: true, onClick: () => { onClose(); window.navigateTo?.("procurement", "rfq"); } },
          { label: "Maradok az ajánlatnál", icon: "file" },
        ],
      });
    } else window.sim.requestQuoteSubOffer(quote.id, kind, {});
  };
  return (
    <div>
      <div className={SECTION_LABEL + " mb-2"}>Tervezési brief — igény-információ a tervezőknek</div>
      {window.BriefButton && (() => {
        const briefId = window.sim.ensureBrief({ scope: "quote", quoteId: quote.id, title: `${quote.customer} — igény-brief` });
        const inheritable = window.sim.inheritableBriefsForQuote ? window.sim.inheritableBriefsForQuote(quote.id) : [];
        return (
        <div className="mb-3">
          <window.BriefCard briefId={briefId} title={`${quote.customer} — tervezési brief`} />
          {isDraft && inheritable.length > 0 && (
            <div className="mt-1.5 rounded-lg border border-violet-200 bg-violet-50/50 px-2.5 py-2">
              <div className="text-[10.5px] text-violet-700 font-medium mb-1">Korábbi helyszín-brief ehhez az ügyfélhez — öröklés (egy ügyfélnek több helyszíne/végügyfele lehet, válaszd a megfelelőt):</div>
              <div className="flex flex-wrap gap-1.5">
                {inheritable.map((b) => (
                  <button key={b.id} onClick={() => { window.sim.inheritBriefForQuote(quote.id, b.id); window.toast?.("✓ Brief örökölve", "success"); }}
                    title={`Forrás: ${b.id}`}
                    className="h-7 px-2.5 rounded-lg border border-violet-200 bg-white text-[11px] font-medium text-violet-700 hover:bg-violet-100 inline-flex items-center gap-1">
                    <Icon name="storefront" size={11} /> {b.site || b.title || b.id} öröklése
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="text-[10.5px] text-stone-400 mt-1">Helyszín / terület / helyiség / bútor / bútor elem szinteken bővíthető — megnyíláskor a fa-szerkezet bejárható. A műszaki tervezés-kérés ettől a brieftől függ (funkció + helyszín + stílus). A nyitott kérdések a Feladataim-ban; az adatok a projektbe is átmennek.</div>
        </div>
        );
      })()}
      <div className={SECTION_LABEL + " mb-2"}>Ajánlatkérések — az ajánlat pontosításához</div>
      <div className="space-y-2">
        {quote.detailFor && window.RefPanel && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-[11.5px] text-emerald-800">
            Ez a(z) <span className="font-mono font-medium">{quote.detailFor}</span> részletes ajánlat <b>készítési díj-ajánlata</b> — elfogadása után készül a részletes ajánlat.
          </div>
        )}
        {isDraft && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => ask("interior")} disabled={!briefReady || openReq("interior")}
              title={!briefReady ? "Előbb töltsd ki a tervezési briefet (funkció + helyszín + stílus) — nélküle a belsőépítész nem tudja, mit tervezzen" : openReq("interior") ? "Már van nyitott belsőépítészeti kérés" : "Koncepció-kérés a Belsőépítészettől"}
              className={`${reqBtn} ${!briefReady || openReq("interior") ? "bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed" : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"}`}>
              <Icon name="layers" size={12} /> Belsőépítészeti koncepció {!briefReady && <Icon name="lock" size={10} />}
            </button>
            <button onClick={() => ask("technical")} disabled={!briefReady || openReq("technical")}
              title={!briefReady ? "Előbb töltsd ki a tervezési briefet (funkció + helyszín + stílus) — az teszi pontossá a műszaki tervezést" : openReq("technical") ? "Már van nyitott műszaki kérés" : "Műszaki megoldás / bútor-kérés a Tervezéstől"}
              className={`${reqBtn} ${!briefReady || openReq("technical") ? "bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed" : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"}`}>
              <Icon name="ruler" size={12} /> Műszaki tervezés {!briefReady && <Icon name="lock" size={10} />}
            </button>
            <button onClick={() => ask("rfq")}
              title="Külső ajánlatkérés beszállítóktól (RFQ a Beszerzésben)"
              className={`${reqBtn} bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100`}>
              <Icon name="send" size={12} /> Külső (RFQ)
            </button>
          </div>
        )}
        {reqs.map((r) => {
          const km = (window.QR_KIND_META || {})[r.kind] || {};
          const st = (window.QR_STATUS || {})[r.status] || { label: r.status, pill: "bg-stone-100 text-stone-600 border-stone-200" };
          const rf = r.kind === "rfq" && r.resultRef ? (sim.rfqs || []).find((x) => x.id === r.resultRef) : null;
          const canImport = rf && rf.status === "odaitelve" && rf.awardedTo && !r.imported;
          return (
            <div key={r.id} className="rounded-lg border border-stone-200 bg-white px-3 py-2">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <Icon name={km.icon || "send"} size={13} className={(km.tint || "text-stone-500") + " shrink-0"} />
                <span className="text-[12px] font-medium text-stone-800">{km.label || r.kind}</span>
                <span className="font-mono text-[10.5px] text-stone-400">{r.id}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${st.pill}`}>{st.label}</span>
                <span className="flex-1" />
                {r.kind === "rfq" && r.resultRef && (
                  <button onClick={() => { onClose(); window.navigateTo?.("procurement", "rfq"); }}
                    className="shrink-0 text-[10.5px] font-medium text-sky-700 hover:underline">{r.resultRef} →</button>
                )}
              </div>
              {r.kind === "interior" && r.resultRef && window.RefPanel && <div className="mt-1.5"><window.RefPanel kind="concept" id={r.resultRef} onBeforeNav={onClose} /></div>}
              {r.kind === "technical" && r.status === "kesz" && !r.imported && isDraft && (
                <button onClick={() => window.sim.importTechResultToQuote(r.id)}
                  className="mt-1.5 w-full h-8 rounded-lg bg-amber-600 text-white text-[11.5px] font-medium hover:bg-amber-700 inline-flex items-center justify-center gap-1.5">
                  <Icon name="plus" size={12} /> Műszaki bútor-tételek beemelése ({(((r.plan || {}).items) || []).length} bútor)
                </button>
              )}
              {r.kind === "technical" && r.imported && <div className="mt-1 text-[10.5px] text-emerald-700">Tételek beemelve az ajánlatba.</div>}
              {canImport && isDraft && (
                <button onClick={() => window.sim.importRfqResultToQuote(quote.id, r.resultRef)}
                  className="mt-1.5 w-full h-8 rounded-lg bg-sky-600 text-white text-[11.5px] font-medium hover:bg-sky-700 inline-flex items-center justify-center gap-1.5">
                  <Icon name="plus" size={12} /> Nyertes ár beemelése tételként ({rf.awardedTo})
                </button>
              )}
              {r.status === "elutasitva" && r.reason && <div className="mt-1 text-[10.5px] text-rose-600">Indok: {r.reason}</div>}
            </div>
          );
        })}
        {/* ajánlat-készítési díj */}
        {!quote.detailFor && (feeQ ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2">
            <div className="text-[11px] text-emerald-800 mb-1">Ajánlat-készítési díj — {["approved", "converted"].includes(feeQ.status) ? "elfogadva, a részletes ajánlat kiküldhető" : "elfogadására vár (a kiküldés addig zárt)"}</div>
            {window.RefPanel && <window.RefPanel kind="quote" id={feeQ.id} onBeforeNav={onClose} />}
          </div>
        ) : isDraft && (feeOpen ? (
          <div className="rounded-lg border border-stone-200 bg-stone-50/60 px-3 py-2 flex items-center gap-2">
            <span className="text-[11.5px] text-stone-600 shrink-0">Díj (Ft):</span>
            <input type="number" value={feeAmt} onChange={(e) => setFeeAmt(e.target.value)} placeholder="pl. 150000"
              className="w-28 h-7 px-2 text-[12px] text-right font-mono border border-stone-300 rounded bg-white outline-none focus:border-emerald-400" />
            <button onClick={() => { if (window.sim.createFeeQuoteForQuote(quote.id, Number(feeAmt))) setFeeOpen(false); }}
              disabled={!(Number(feeAmt) > 0)}
              className="h-7 px-2.5 rounded text-[11px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-stone-300">Díj-ajánlat ki</button>
            <button onClick={() => setFeeOpen(false)} className="h-7 px-2 rounded text-[11px] text-stone-500 hover:bg-stone-100">Mégse</button>
          </div>
        ) : (
          <button onClick={() => setFeeOpen(true)}
            className="w-full h-8 rounded-lg border border-dashed border-stone-300 text-[11.5px] text-stone-500 hover:text-emerald-700 hover:border-emerald-300 inline-flex items-center justify-center gap-1.5">
            <Icon name="plus" size={12} /> Ajánlat-készítési díj kérése (külön kis ajánlat előre)
          </button>
        )))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Összevonás — draft ajánlat ÖSSZEVONÁSA azonos ügyfél másik vázlatával.
// Így a több forrásból (koncepció-díj, bútorsor, konfigurátor) keletkezett
// külön ajánlatok egy dokumentummá fűzhetők — vagy maradhatnak külön.
// ─────────────────────────────────────────────────────────────────
function QuoteMergePanel({ quote }) {
  const sim = useSim();
  const [open, setOpen] = useStateSD(false);
  if (!quote || quote.status !== "draft") return null;
  const siblings = (sim.quotes || []).filter((q) => q.status === "draft" && q.customer === quote.customer && q.id !== quote.id);
  if (!siblings.length) return null;
  return (
    <div>
      <div className={SECTION_LABEL + " mb-2"}>Összevonás</div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="w-full h-9 rounded-lg border border-dashed border-stone-300 text-[12.5px] font-medium text-stone-500 hover:text-indigo-700 hover:border-indigo-300 inline-flex items-center justify-center gap-1.5">
          <Icon name="layers" size={14} />Másik vázlat-ajánlat összevonása ide ({siblings.length})
        </button>
      ) : (
        <div className="rounded-xl border border-stone-200 p-2 space-y-1.5 bg-stone-50/50">
          <div className="text-[11px] text-stone-500 px-1 mb-0.5">Melyik vázlatot olvasszuk ebbe ({quote.id})? A forrás archiválódik, tételei ide kerülnek.</div>
          {siblings.map((s) => (
            <button key={s.id} onClick={() => { window.sim.mergeQuotes(quote.id, s.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white border border-stone-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left">
              <Icon name="file" size={14} className="text-stone-400 shrink-0" />
              <span className="font-mono text-[12px] font-medium text-stone-800">{s.id}</span>
              <span className="text-[11px] text-stone-500 flex-1 truncate">· {(s.lines || []).length} tétel · {huf(s.value || 0)}</span>
              <Icon name="plus" size={13} className="text-indigo-500 shrink-0" />
            </button>
          ))}
          <button onClick={() => setOpen(false)} className="w-full h-8 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100">Mégse</button>
        </div>
      )}
    </div>
  );
}

function QuoteActions({ status, isDraft, converting, pendingAction, setPendingAction,
                        sendLocked = false,
                        validUntil, setValidUntil, rejectReason, setRejectReason,
                        doSend, doAccept, doReject, doArchive, doConvert,
                        canConvert = true, canForward = false, onForward,
                        psCount = 0, psAck = false, setPsAck,
                        genProject, setGenProject,
                        convertedOrderId, convertedProjectId, convertedReqId,
                        canTrackOrder = false, canViewProjects = false,
                        onOpenOrder, onOpenProject }) {

  // Terminal states
  if (status === "archived") {
    return (
      <div>
        <div className={SECTION_LABEL + " mb-2"}>Akciók</div>
        <div className="text-[11.5px] text-stone-500 italic px-3 py-2.5 bg-stone-50 rounded-lg border border-stone-100">
          Ez az ajánlat archiválva van — további művelet nem szükséges.
        </div>
      </div>
    );
  }

  if (status === "converted") {
    return (
      <div>
        <div className={SECTION_LABEL + " mb-2"}>Akciók</div>
        <div className="space-y-2">
          <div className="text-[11.5px] text-teal-800 px-3 py-2.5 bg-teal-50 rounded-lg border border-teal-100 flex items-center gap-2">
            <Icon name="check" size={13} />
            Ajánlat konvertálva — igénylés létrejött, jóváhagyás után rendelés generálható.
          </div>
          {(convertedReqId || convertedOrderId || convertedProjectId) && (
            <div className="space-y-1.5">
              {convertedReqId && (
                <div className="flex items-center justify-between px-3 py-2 bg-white border border-stone-200 rounded-lg">
                  <div className="flex items-center gap-2 text-[12px]">
                    <Icon name="orders" size={13} className="text-amber-600 shrink-0" />
                    <span className="text-stone-500 shrink-0">Igénylés</span>
                    <span className="font-mono font-medium text-stone-900">{convertedReqId}</span>
                  </div>
                  <button onClick={() => { window._pendingOpen = { type: "requisition", id: convertedReqId }; window.navigateTo?.("procurement", "requisitions"); }}
                    className="shrink-0 ml-2 inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition">
                    Megnyitás <Icon name="chevron" size={10} className="rotate-[-90deg]" />
                  </button>
                </div>
              )}
              {convertedOrderId && (
                <div className="flex items-center justify-between px-3 py-2 bg-white border border-stone-200 rounded-lg">
                  <div className="flex items-center gap-2 text-[12px]">
                    <Icon name="factory" size={13} className="text-teal-600 shrink-0" />
                    <span className="text-stone-500">Rendelés</span>
                    <span className="font-mono font-medium text-stone-900">{convertedOrderId}</span>
                  </div>
                  {canTrackOrder ? (
                    <button onClick={onOpenOrder}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition shrink-0">
                      Megnyitás <Icon name="chevron" size={10} className="rotate-[-90deg]" />
                    </button>
                  ) : (
                    <span title="Rendeléskövetési jogosultság szükséges"
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] text-stone-400 bg-stone-100 border border-stone-200 cursor-not-allowed shrink-0">
                      <Icon name="lock" size={10} /> Nincs jog
                    </span>
                  )}
                </div>
              )}
              {convertedProjectId && (
                <div className="flex items-center justify-between px-3 py-2 bg-white border border-stone-200 rounded-lg">
                  <div className="flex items-center gap-2 text-[12px]">
                    <Icon name="folder" size={13} className="text-violet-600 shrink-0" />
                    <span className="text-stone-500">Projekt</span>
                    <span className="font-mono font-medium text-stone-900">{convertedProjectId}</span>
                  </div>
                  {canViewProjects ? (
                    <button onClick={onOpenProject}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition shrink-0">
                      Megnyitás <Icon name="chevron" size={10} className="rotate-[-90deg]" />
                    </button>
                  ) : (
                    <span title="Projektek megtekintéséhez jogosultság szükséges"
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] text-stone-400 bg-stone-100 border border-stone-200 cursor-not-allowed shrink-0">
                      <Icon name="lock" size={10} /> Nincs jog
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  if (status === "conversionPending") {
    return (
      <div>
        <div className={SECTION_LABEL + " mb-2"}>Akciók</div>
        <div className="text-[11.5px] text-teal-700 px-3 py-2.5 bg-teal-50 rounded-lg border border-teal-100 inline-flex items-center gap-2">
          <MiniSpinner size={12} />
          Gyártásba konvertálás folyamatban — visszajelzésre várunk a Production modultól…
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={SECTION_LABEL + " mb-2"}>Akciók</div>

      {/* SEND inline form */}
      {pendingAction === "send" && (
        <div className="border border-stone-200 rounded-lg p-3 bg-stone-50/60 mb-2">
          <div className="text-[11.5px] font-medium text-stone-700 mb-2">Ajánlat kiküldése</div>
          <label className="block text-[11px] text-stone-500 mb-1">Érvényesség <span className="text-rose-500">*</span></label>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
            className="h-8 px-2.5 text-[12px] border border-stone-300 rounded-md bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" />
          <div className="flex items-center justify-end gap-2 mt-3">
            <button onClick={() => setPendingAction(null)} className="h-8 px-3 rounded-md text-[11.5px] text-stone-600 hover:bg-stone-100">Mégse</button>
            <button onClick={doSend} disabled={!validUntil}
              className="h-8 px-3 rounded-md text-[11.5px] font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:bg-stone-300 inline-flex items-center gap-1.5">
              <Icon name="send" size={12} /> Küldés
            </button>
          </div>
        </div>
      )}

      {/* REJECT inline form */}
      {pendingAction === "reject" && (
        <div className="border border-stone-200 rounded-lg p-3 bg-stone-50/60 mb-2">
          <div className="text-[11.5px] font-medium text-stone-700 mb-2">Ajánlat elutasítása</div>
          <label className="block text-[11px] text-stone-500 mb-1">Indoklás <span className="text-stone-400">(opcionális)</span></label>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2}
            placeholder="Pl. ár, határidő, váltás más beszállítóra…"
            className="w-full px-2.5 py-1.5 text-[12px] border border-stone-300 rounded-md bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 resize-none" />
          <div className="flex items-center justify-end gap-2 mt-3">
            <button onClick={() => setPendingAction(null)} className="h-8 px-3 rounded-md text-[11.5px] text-stone-600 hover:bg-stone-100">Mégse</button>
            <button onClick={doReject}
              className="h-8 px-3 rounded-md text-[11.5px] font-medium bg-rose-600 text-white hover:bg-rose-700">
              Elutasítás
            </button>
          </div>
        </div>
      )}

      {/* Button row — only shown when no inline form is open */}
      {!pendingAction && (
        <div className="flex flex-wrap items-center gap-2">
          {status === "draft" && (
            <>
              {sendLocked ? (
                <span title="A díj-ajánlat elfogadására vár — addig a részletes ajánlat nem küldhető ki"
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed">
                  <Icon name="lock" size={12} /> Kiküldés — díj-ajánlatra vár
                </span>
              ) : (
                <ActionBtn tone="primary"  icon="send" onClick={() => setPendingAction("send")}>Kiküldés</ActionBtn>
              )}
              <ActionBtn tone="ghost"            onClick={doArchive}>Archiválás</ActionBtn>
            </>
          )}
          {status === "sent" && (
            <>
              <ActionBtn tone="success" icon="check" onClick={doAccept}>Elfogadás</ActionBtn>
              <ActionBtn tone="danger"  icon="x"     onClick={() => setPendingAction("reject")}>Elutasítás</ActionBtn>
              {canForward && <ActionBtn tone="ghost" icon="send" onClick={onForward}>Tovább ajánlás</ActionBtn>}
              <ActionBtn tone="ghost"               onClick={doArchive}>Archiválás</ActionBtn>
            </>
          )}
          {status === "approved" && (
            <>
              {canConvert ? (
                <div className="w-full space-y-2.5">
                  <label className="flex items-center gap-2 text-[12px] text-stone-700 cursor-pointer select-none">
                    <button type="button" onClick={() => setGenProject && setGenProject(!genProject)} aria-pressed={!!genProject}
                      className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 ${genProject ? "bg-violet-600" : "bg-stone-300"}`}>
                      <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${genProject ? "translate-x-4" : ""}`} />
                    </button>
                    Projekt is létrejöjjön a koordinációhoz (szakág-függőségekkel)
                  </label>
                  {psCount > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11.5px] text-amber-800 space-y-1.5">
                      <div>⚠ {psCount} tétel irányár/kalkulált szinten — a konvertálás <b>PS-záradékkal</b> megy: a tétel pontosítása később módosításként számolódik el, a végösszeg fel-le mozoghat.</div>
                      <label className="flex items-center gap-2 cursor-pointer select-none text-stone-700">
                        <input type="checkbox" checked={!!psAck} onChange={(e) => setPsAck && setPsAck(e.target.checked)} className="accent-amber-600" />
                        Elfogadom — irányösszeg-tételekkel konvertálok
                      </label>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {psCount > 0 && !psAck ? (
                      <span title="Előbb fogadd el a PS-záradékot — vagy pontosítsd fixre az irányár-tételeket"
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed">
                        <Icon name="lock" size={12} /> Igénylés létrehozása
                      </span>
                    ) : (
                    <ActionBtn tone="convert" icon="orders" onClick={doConvert} loading={converting}>
                      {converting ? "Igénylés létrehozása…" : "Igénylés létrehozása"}
                    </ActionBtn>
                    )}
                    {canForward && <ActionBtn tone="ghost" icon="send" onClick={onForward}>Tovább ajánlás</ActionBtn>}
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-[11.5px] text-amber-800 px-3 py-2.5 bg-amber-50 rounded-lg border border-amber-100 inline-flex items-center gap-2">
                    <Icon name="lock" size={13} /> Konvertáláshoz jogosultság szükséges — jóváhagyásra a cégnél vár.
                  </div>
                  {canForward && <ActionBtn tone="ghost" icon="send" onClick={onForward}>Tovább ajánlás</ActionBtn>}
                </>
              )}
            </>
          )}
          {status === "rejected" && (
            <ActionBtn tone="ghost" onClick={doArchive}>Archiválás</ActionBtn>
          )}
          {status === "expired" && (
            <ActionBtn tone="ghost" onClick={doArchive}>Archiválás</ActionBtn>
          )}
        </div>
      )}
    </div>
  );
}

// Action button — small palette matching the rest of the app
function ActionBtn({ tone = "ghost", icon, onClick, children, loading }) {
  const tones = {
    primary: "bg-sky-600 text-white hover:bg-sky-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    danger:  "bg-white border border-rose-200 text-rose-700 hover:bg-rose-50",
    convert: "bg-teal-600 text-white hover:bg-teal-700",
    ghost:   "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50",
  };
  return (
    <button onClick={onClick} disabled={loading}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11.5px] font-medium transition disabled:opacity-70 ${tones[tone]}`}>
      {loading ? <MiniSpinner size={12} /> : (icon && <Icon name={icon} size={12} />)}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 1.2  CreateQuoteSlideOver
// ─────────────────────────────────────────────────────────────────────────
function CreateQuoteSlideOver({ open, onClose, preselectCustomer, onCreated }) {
  const [customer, setCustomer] = useStateSD(null);   // {id, name, city}
  const [search, setSearch] = useStateSD("");
  const [showSugg, setShowSugg] = useStateSD(false);
  const [validUntil, setValidUntil] = useStateSD("");
  const [notes, setNotes] = useStateSD("");
  const [errors, setErrors] = useStateSD({});
  const [submitting, setSubmitting] = useStateSD(false);

  useEffectSD(() => {
    if (!open) return;
    if (preselectCustomer) {
      setCustomer(preselectCustomer);
      setSearch(preselectCustomer.name);
    } else {
      setCustomer(null); setSearch("");
    }
    setValidUntil(""); setNotes(""); setErrors({}); setSubmitting(false);
  }, [open, preselectCustomer && preselectCustomer.id]);

  const matches = useMemoSD(() => {
    const q = search.trim().toLowerCase();
    const base = (CUSTOMERS || []);
    const list = q.length === 0 ? base : base.filter(c => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q));
    return list.slice(0, 6);
  }, [search]);

  // tomorrow as minimum
  const tomorrow = useMemoSD(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const submit = () => {
    const e = {};
    if (!customer) e.customer = "Válassz ügyfelet";
    if (!validUntil) e.validUntil = "Add meg az érvényességi dátumot";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    setTimeout(() => {
      // mock — synthesize an id and hand back
      const newQuote = {
        id: "Q-2426-0" + (59 + Math.floor(Math.random() * 9)),
        customer: customer.name, customerId: customer.id,
        date: new Date().toISOString().slice(0, 10),
        expires: validUntil,
        value: 0, items: 0,
        status: "draft", owner: "Kovács P.",
        notes,
      };
      window.toast?.("✓ Ajánlat létrehozva — " + newQuote.id, "success");
      onCreated && onCreated(newQuote);
      onClose();
    }, 500);
  };

  return (
    <SlideOver open={open} onClose={onClose}
      title="Új ajánlat"
      subtitle="Az ajánlat vázlatként jön létre, majd szerkeszthető."
      width={500}
      footer={
        <>
          <GhostBtn onClick={onClose}>Mégse</GhostBtn>
          <button onClick={submit} disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-indigo-600 text-white text-[12.5px] font-medium hover:bg-indigo-700 disabled:bg-indigo-300">
            {submitting && <MiniSpinner size={12} />}
            Ajánlat létrehozása →
          </button>
        </>
      }>
      <div className="px-5 py-4 space-y-5">

        {/* Customer typeahead */}
        <div className="relative">
          <label className="block text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-1.5">
            Ügyfél <span className="text-rose-500 normal-case">*</span>
          </label>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCustomer(null); setShowSugg(true); }}
              onFocus={() => setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 140)}
              placeholder="Keress név vagy város szerint…"
              className={`w-full h-10 pl-3 pr-9 rounded-lg border text-[12.5px] outline-none focus:ring-1 ${
                errors.customer ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                                : "border-stone-200 focus:border-indigo-400 focus:ring-indigo-200"}`} />
            <Icon name="search" size={14} className="absolute right-3 top-3 text-stone-400" />
          </div>
          {errors.customer && <div className="text-[11px] text-rose-600 mt-1">{errors.customer}</div>}

          {showSugg && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-xl z-10 overflow-hidden max-h-[280px] overflow-y-auto">
              {matches.length === 0 ? (
                <button className="w-full text-left px-3 py-2.5 text-[12px] text-indigo-700 hover:bg-indigo-50 inline-flex items-center gap-1.5">
                  <Icon name="plus" size={12} /> Új ügyfél létrehozása →
                </button>
              ) : matches.map(c => {
                const ext = CUSTOMER_EXTRA[c.id] || { type: "active" };
                const t = CUSTOMER_TYPE_MAP[ext.type];
                return (
                  <button key={c.id}
                    onMouseDown={() => { setCustomer(c); setSearch(c.name); setShowSugg(false); setErrors(er => ({ ...er, customer: undefined })); }}
                    className="block w-full text-left px-3 py-2.5 text-[12px] hover:bg-stone-50 border-b border-stone-100 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${t.gradFrom} ${t.gradTo} grid place-items-center text-[10px] font-semibold text-white shrink-0`}>
                        {c.name.split(" ").slice(0, 2).map(s => s[0]).join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-stone-900 font-medium truncate">{c.name}</div>
                        <div className="text-[10.5px] text-stone-500">{c.city} · {t.label}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Validity date */}
        <div>
          <label className="block text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-1.5">
            Érvényesség <span className="text-rose-500 normal-case">*</span>
          </label>
          <input type="date" value={validUntil} min={tomorrow}
            onChange={(e) => { setValidUntil(e.target.value); setErrors(er => ({ ...er, validUntil: undefined })); }}
            className={`h-10 px-3 rounded-lg border text-[12.5px] outline-none focus:ring-1 ${
              errors.validUntil ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                                : "border-stone-200 focus:border-indigo-400 focus:ring-indigo-200"}`} />
          {errors.validUntil ? <div className="text-[11px] text-rose-600 mt-1">{errors.validUntil}</div>
                              : <div className="text-[10.5px] text-stone-400 mt-1">Min. holnap. Az ügyfél eddig fogadhatja el az ajánlatot.</div>}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-1.5">Megjegyzés</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Belső megjegyzés (nem látja az ügyfél)"
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 resize-none" />
        </div>

        <div className="text-[10.5px] text-stone-400 leading-relaxed border-t border-stone-100 pt-3">
          A létrehozás után a tételek hozzáadása az ajánlat részletes nézetében történik.
          Az ajánlat <span className="font-medium text-stone-600">Vázlat</span> státuszban indul; csak kiküldés után válik az ügyfél által láthatóvá.
        </div>
      </div>
    </SlideOver>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 2.1  CustomerDetailSlideOver
// ─────────────────────────────────────────────────────────────────────────
function CustomerDetailSlideOver({ customer, onClose, onOpenQuote, onCreateQuote }) {
  const sim = useSim();
  const ext = customer ? (CUSTOMER_EXTRA[customer.id] || { type: "active", billing: null, shipping: null }) : null;
  const [type, setType] = useStateSD(ext ? ext.type : "active");
  const [noteDraft, setNoteDraft] = useStateSD("");
  const [contactEditing, setContactEditing] = useStateSD(false);
  const [contactDraft, setContactDraft] = useStateSD({ contact: "", email: "", phone: "" });
  const [contact, setContact] = useStateSD({ contact: "", email: "", phone: "" });
  const [openBilling, setOpenBilling] = useStateSD(false);
  const [openShipping, setOpenShipping] = useStateSD(false);
  const [confirm, setConfirm] = useStateSD(null); // "promote" | "deactivate" | null

  useEffectSD(() => {
    if (!customer) return;
    const newExt = CUSTOMER_EXTRA[customer.id] || { type: "active" };
    setType(newExt.type);
    setContact({ contact: customer.contact, email: customer.email, phone: customer.phone });
    setContactEditing(false);
    setOpenBilling(false); setOpenShipping(false);
    setConfirm(null);
  }, [customer && customer.id]);

  if (!customer || !ext) return null;

  const typeTone = CUSTOMER_TYPE_MAP[type];
  const initials = customer.name.split(" ").slice(0, 2).map(s => s[0]).join("");

  const openQuotes = ((sim.quotes) || QUOTES || [])
    .filter(q => q.customer === customer.name)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const custOrders = window.sim.ordersForCustomer ? window.sim.ordersForCustomer(customer.name) : [];
  const custNotes = window.sim.customerNotesFor ? window.sim.customerNotesFor(customer.name) : [];

  const beginEditContact = () => { setContactDraft(contact); setContactEditing(true); };
  const saveContact = () => {
    setContact(contactDraft);
    setContactEditing(false);
    window.toast?.("✓ Kapcsolattartó frissítve", "success");
  };

  const doPromote = () => {
    setType("active"); setConfirm(null);
    window.toast?.("✓ Ügyfél aktiválva — " + customer.name, "success");
  };
  const doDeactivate = () => {
    setType("inactive"); setConfirm(null);
    window.toast?.("Ügyfél deaktiválva — " + customer.name, "info");
  };

  return (
    <SlideOver open={true} onClose={onClose}
      title={customer.name}
      subtitle={`${customer.city} · ${typeTone.label}`}
      width={520}
      footer={<GhostBtn onClick={onClose}>Bezárás</GhostBtn>}>
      <div className="px-5 py-4 space-y-6">

        {/* Header card with avatar */}
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${typeTone.gradFrom} ${typeTone.gradTo} grid place-items-center text-[16px] font-semibold text-white shrink-0`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-stone-900 truncate">{customer.name}</div>
            <div className="text-[11.5px] text-stone-500 mt-0.5">{customer.city} · {customer.since} óta</div>
            <div className="flex items-center gap-1.5 mt-2">
              <StatusBadge status={type} map={CUSTOMER_TYPE_MAP} />
              <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10.5px] font-medium bg-stone-100 text-stone-700">
                {customer.openOrders} nyitott
              </span>
              <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10.5px] font-medium bg-stone-100 text-stone-700 font-mono">
                LTV {(customer.ltv / 1_000_000).toFixed(1)}M
              </span>
            </div>
          </div>
        </div>

        {/* Kapcsolattartó */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className={SECTION_LABEL}>Kapcsolattartó</div>
            {!contactEditing ? (
              <button onClick={beginEditContact} className="text-[11px] text-indigo-700 hover:text-indigo-900 font-medium">Szerkesztés</button>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={() => setContactEditing(false)} className="h-7 px-2 rounded text-[11px] text-stone-600 hover:bg-stone-100">Mégse</button>
                <button onClick={saveContact} className="h-7 px-2.5 rounded text-[11px] bg-indigo-600 text-white hover:bg-indigo-700">Mentés</button>
              </div>
            )}
          </div>
          {!contactEditing ? (
            <dl className="border border-stone-100 rounded-lg divide-y divide-stone-100 bg-white">
              <KVRowBlock label="Név">{contact.contact}</KVRowBlock>
              <KVRowBlock label="E-mail" mono>{contact.email}</KVRowBlock>
              <KVRowBlock label="Telefon" mono>{contact.phone}</KVRowBlock>
            </dl>
          ) : (
            <div className="border border-stone-200 rounded-lg p-3 space-y-2 bg-stone-50/40">
              <LabeledInput label="Név" value={contactDraft.contact} onChange={(v) => setContactDraft(d => ({ ...d, contact: v }))} />
              <LabeledInput label="E-mail" value={contactDraft.email} onChange={(v) => setContactDraft(d => ({ ...d, email: v }))} mono />
              <LabeledInput label="Telefon" value={contactDraft.phone} onChange={(v) => setContactDraft(d => ({ ...d, phone: v }))} mono />
            </div>
          )}
        </div>

        {/* Címek — collapsible */}
        <div>
          <div className={SECTION_LABEL + " mb-2"}>Címek</div>
          <div className="space-y-1.5">
            <AddressBlock
              title="Számlázási cím" open={openBilling} onToggle={() => setOpenBilling(v => !v)}
              addr={ext.billing}
            />
            <AddressBlock
              title="Szállítási cím" open={openShipping} onToggle={() => setOpenShipping(v => !v)}
              addr={ext.shipping} fallback="Megegyezik a számlázási címmel"
            />
          </div>
        </div>

        {/* Ajánlatok */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className={SECTION_LABEL}>Ajánlatok <span className="text-stone-400 normal-case tracking-normal font-normal">({openQuotes.length})</span></div>
            <button onClick={() => onCreateQuote && onCreateQuote(customer)} className="text-[11px] text-indigo-700 hover:text-indigo-900 font-medium inline-flex items-center gap-1">
              <Icon name="plus" size={11} /> Új ajánlat
            </button>
          </div>
          {openQuotes.length === 0 ? (
            <div className="text-[11.5px] text-stone-500 px-3 py-3 border border-dashed border-stone-200 rounded-lg">
              Még nincs ajánlat —{" "}
              <button onClick={() => onCreateQuote && onCreateQuote(customer)} className="text-indigo-700 font-medium hover:underline">Új ajánlat →</button>
            </div>
          ) : (
            <div className="border border-stone-100 rounded-lg overflow-hidden">
              {openQuotes.map(q => (
                <button key={q.id} onClick={() => onOpenQuote && onOpenQuote(q)}
                  className="w-full grid grid-cols-[100px_1fr_110px_18px] gap-2 items-center px-3 py-2 text-left text-[12px] border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition">
                  <div className="font-mono text-stone-700">{q.id}</div>
                  <div><StatusBadge status={q.status} /></div>
                  <div className="font-mono text-stone-900 text-right font-medium">{(q.value/1_000_000).toFixed(2)}M Ft</div>
                  <Icon name="chevron" size={12} className="text-stone-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tervezési briefek — helyszínek / végügyfelek szerint */}
        {window.BriefCard && window.sim.briefsForCustomer && (() => {
          const roots = window.sim.briefsForCustomer(customer.name);
          return (
            <div>
              <div className={SECTION_LABEL + " mb-2"}>Tervezési briefek <span className="text-stone-400 normal-case tracking-normal font-normal">(helyszín / végügyfél szerint)</span></div>
              {roots.length === 0 ? (
                <div className="text-[11.5px] text-stone-500 px-3 py-3 border border-dashed border-stone-200 rounded-lg">
                  Ehhez az ügyfélhez még nincs brief. A brief az ajánlat-detailben jön létre — egy ügyfélnek több helyszíne / végügyfele is lehet, mind külön brief.
                </div>
              ) : (
                <div className="space-y-2">
                  {roots.map((b) => (
                    <window.BriefCard key={b.id} briefId={b.id} title={b.site || b.title || "Tervezési brief"} />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Rendelések */}
        <div>
          <div className={SECTION_LABEL + " mb-2"}>Rendelések <span className="text-stone-400 normal-case tracking-normal font-normal">({custOrders.length})</span></div>
          {custOrders.length === 0 ? (
            <div className="text-[11.5px] text-stone-500 px-3 py-3 border border-dashed border-stone-200 rounded-lg">Még nincs rendelés ehhez az ügyfélhez.</div>
          ) : (
            <div className="border border-stone-100 rounded-lg overflow-hidden">
              {custOrders.map(o => (
                <button key={o.id} onClick={() => { onClose && onClose(); window.navigateTo?.("orders"); }}
                  className="w-full grid grid-cols-[110px_1fr_110px_18px] gap-2 items-center px-3 py-2 text-left text-[12px] border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition">
                  <div className="font-mono text-stone-700">{o.id}</div>
                  <div className="text-stone-600 truncate">{({ draft: "Vázlat", calc: "Kalkulált", ready: "Kész", released: "Gyártásban", delivered: "Teljesített" })[o.status] || o.status}</div>
                  <div className="font-mono text-stone-900 text-right font-medium">{((o.total || 0) / 1_000_000).toFixed(2)}M Ft</div>
                  <Icon name="chevron" size={12} className="text-stone-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Kapcsolati profil — hangnem, elvárások, speciális igények */}
        {(() => {
          const prof = window.sim.customerProfile ? window.sim.customerProfile(customer.name) : {};
          const setP = (patch) => window.sim.setCustomerProfile(customer.name, patch);
          const TONES = [["közvetlen", "Tegező / közvetlen"], ["hivatalos", "Magázó / hivatalos"], ["szakmai", "Szakmai / tömör"]];
          const CHANS = [["email", "E-mail"], ["telefon", "Telefon"], ["szemelyes", "Személyes"]];
          const chip = (active) => `h-7 px-2.5 rounded-lg text-[11px] font-medium border transition ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-stone-500 border-stone-200 hover:border-indigo-300"}`;
          return (
            <div>
              <div className={SECTION_LABEL + " mb-2"}>Kapcsolati profil</div>
              {(() => {
                const cp = window.sim.companyProfile ? window.sim.companyProfile() : {};
                const bits = [cp.values, cp.positioning, cp.avoid].filter((x) => String(x || "").trim());
                if (!bits.length) return null;
                return (
                  <div className="mb-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-indigo-700 font-semibold mb-0.5">Cég-önkép — tartsd szem előtt</div>
                    {cp.values && <div className="text-[11px] text-stone-600"><span className="text-stone-400">Értékeink:</span> {cp.values}</div>}
                    {cp.positioning && <div className="text-[11px] text-stone-600"><span className="text-stone-400">Erősségünk:</span> {cp.positioning}</div>}
                    {cp.avoid && <div className="text-[11px] text-stone-600"><span className="text-stone-400">Kerüljük:</span> {cp.avoid}</div>}
                  </div>
                );
              })()}
              {(() => {
                const co = window.sim.companyProfile ? window.sim.companyProfile() : {};
                if (!(co.values || co.positioning || co.avoid || co.tone)) return null;
                return (
                  <div className="mb-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-indigo-600 font-semibold mb-0.5">Tartsd szem előtt — cég-értékrend</div>
                    {co.values && <div className="text-[11.5px] text-stone-700 leading-snug"><span className="text-stone-400">Értékeink:</span> {co.values}</div>}
                    {co.positioning && <div className="text-[11.5px] text-stone-700 leading-snug mt-0.5"><span className="text-stone-400">Erősségünk:</span> {co.positioning}</div>}
                    {co.avoid && <div className="text-[11.5px] text-stone-700 leading-snug mt-0.5"><span className="text-stone-400">Kerüljük:</span> {co.avoid}</div>}
                  </div>
                );
              })()}
              <div className="rounded-lg border border-stone-200 bg-stone-50/40 p-3 space-y-2.5">
                <div>
                  <div className="text-[10.5px] text-stone-500 mb-1">Kommunikáció hangneme</div>
                  <div className="flex flex-wrap gap-1.5">
                    {TONES.map(([k, l]) => <button key={k} onClick={() => setP({ tone: prof.tone === k ? "" : k })} className={chip(prof.tone === k)}>{l}</button>)}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-stone-500 mb-1">Preferált csatorna</div>
                  <div className="flex flex-wrap gap-1.5">
                    {CHANS.map(([k, l]) => <button key={k} onClick={() => setP({ channel: prof.channel === k ? "" : k })} className={chip(prof.channel === k)}>{l}</button>)}
                  </div>
                </div>
                <label className="block">
                  <span className="text-[10.5px] text-stone-500">Elvárások</span>
                  <textarea defaultValue={prof.expectations || ""} onBlur={(e) => setP({ expectations: e.target.value })} rows={2}
                    placeholder="pl. gyors visszajelzés, részletes árbontás, heti státusz-riport…"
                    className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400 resize-none leading-relaxed" />
                </label>
                <label className="block">
                  <span className="text-[10.5px] text-stone-500">Speciális igények</span>
                  <textarea defaultValue={prof.specialNeeds || ""} onBlur={(e) => setP({ specialNeeds: e.target.value })} rows={2}
                    placeholder="pl. akadálymentes helyszín, csak délelőtti egyeztetés, allergia/anyagkizárás, NDA…"
                    className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400 resize-none leading-relaxed" />
                </label>
              </div>
            </div>
          );
        })()}

        {/* Megjegyzések */}
        <div>
          <div className={SECTION_LABEL + " mb-2"}>Megjegyzések <span className="text-stone-400 normal-case tracking-normal font-normal">({custNotes.length})</span></div>
          <div className="flex items-start gap-1.5 mb-2">
            <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={2} placeholder="Megjegyzés az ügyfélhez — pl. telefonon egyeztetett részlet, preferencia, emlékeztető…"
              className="flex-1 px-2.5 py-2 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400 resize-none leading-relaxed" />
            <button onClick={() => { if (noteDraft.trim()) { window.sim.addCustomerNote(customer.name, noteDraft); setNoteDraft(""); window.toast?.("✓ Megjegyzés rögzítve", "success"); } }}
              className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-[11.5px] font-medium hover:bg-indigo-700 shrink-0 inline-flex items-center gap-1"><Icon name="plus" size={12} /> Hozzáad</button>
          </div>
          {custNotes.length === 0 ? (
            <div className="text-[11.5px] text-stone-400">Még nincs megjegyzés.</div>
          ) : (
            <div className="space-y-1.5">
              {custNotes.map(n => (
                <div key={n.id} className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-stone-100 bg-stone-50/50">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-stone-800 leading-snug whitespace-pre-wrap">{n.text}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5">{n.by} · {n.ts}</div>
                  </div>
                  <button onClick={() => window.sim.removeCustomerNote(n.id)} className="w-6 h-6 grid place-items-center rounded text-stone-300 hover:bg-rose-50 hover:text-rose-600 shrink-0"><Icon name="x" size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Akciók — FSM */}
        <div>
          <div className={SECTION_LABEL + " mb-2"}>Akciók</div>
          {confirm === "promote" && (
            <ConfirmRow tone="primary" message="Biztos? Az ügyfél aktívba kerül."
              onCancel={() => setConfirm(null)} onConfirm={doPromote} confirmLabel="Aktiválás" />
          )}
          {confirm === "deactivate" && (
            <ConfirmRow tone="danger" message="Biztos? Az ügyfél inaktívba kerül."
              onCancel={() => setConfirm(null)} onConfirm={doDeactivate} confirmLabel="Deaktiválás" />
          )}
          {!confirm && (
            <div className="flex items-center gap-2">
              {type === "lead" && (
                <button onClick={() => setConfirm("promote")}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11.5px] font-medium bg-indigo-600 text-white hover:bg-indigo-700">
                  <Icon name="check" size={12} /> Promóció → Aktív ügyfél
                </button>
              )}
              {type === "active" && (
                <button onClick={() => setConfirm("deactivate")}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11.5px] font-medium bg-white border border-rose-200 text-rose-700 hover:bg-rose-50">
                  Deaktiválás
                </button>
              )}
              {type === "inactive" && (
                <div className="text-[11.5px] text-stone-500 italic">Inaktív ügyfél — nincs elérhető művelet.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </SlideOver>
  );
}

function KVRowBlock({ label, children, mono = false }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-2 px-3 py-2 text-[12px]">
      <dt className="text-stone-500">{label}</dt>
      <dd className={`text-stone-900 truncate ${mono ? "font-mono" : ""}`}>{children}</dd>
    </div>
  );
}

function LabeledInput({ label, value, onChange, mono }) {
  return (
    <label className="block">
      <span className="block text-[10.5px] text-stone-500 mb-0.5">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className={`w-full h-8 px-2.5 rounded-md border border-stone-200 text-[12px] bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 ${mono ? "font-mono" : ""}`} />
    </label>
  );
}

function AddressBlock({ title, addr, open, onToggle, fallback }) {
  const fmt = (a) => a ? `${a.zip} ${a.city}, ${a.street}` : null;
  const text = fmt(addr) || fallback || "—";
  return (
    <div className="border border-stone-100 rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-stone-50/60">
        <Icon name="chevron" size={11} className={`text-stone-400 transition ${open ? "rotate-90" : ""}`} />
        <div className="text-[11px] font-semibold text-stone-700 uppercase tracking-wide">{title}</div>
        <div className="flex-1 text-[12px] text-stone-600 truncate text-right pl-2">{text}</div>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-stone-100 bg-stone-50/40">
          {addr ? (
            <dl className="text-[12px] grid grid-cols-[96px_1fr] gap-y-1">
              <dt className="text-stone-500">Ország</dt><dd className="text-stone-900">{addr.country === "HU" ? "Magyarország" : addr.country}</dd>
              <dt className="text-stone-500">Irányítószám</dt><dd className="text-stone-900 font-mono">{addr.zip}</dd>
              <dt className="text-stone-500">Város</dt><dd className="text-stone-900">{addr.city}</dd>
              <dt className="text-stone-500">Utca, hsz.</dt><dd className="text-stone-900">{addr.street}</dd>
            </dl>
          ) : (
            <div className="text-[11.5px] text-stone-500 italic py-1">{fallback}</div>
          )}
          <div className="flex justify-end mt-2">
            <button className="h-7 px-2.5 rounded-md text-[11px] text-indigo-700 hover:bg-indigo-50 font-medium">Szerkesztés</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmRow({ message, tone, onCancel, onConfirm, confirmLabel }) {
  return (
    <div className="border border-stone-200 rounded-lg p-3 bg-stone-50/60 flex items-center gap-3">
      <div className="flex-1 text-[11.5px] text-stone-700">{message}</div>
      <button onClick={onCancel} className="h-7 px-2.5 rounded-md text-[11px] text-stone-600 hover:bg-stone-100">Mégse</button>
      <button onClick={onConfirm}
        className={`h-7 px-3 rounded-md text-[11px] font-medium text-white ${tone === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>
        {confirmLabel}
      </button>
    </div>
  );
}

Object.assign(window, {
  QuoteDetailSlideOver, CreateQuoteSlideOver, CustomerDetailSlideOver,
  StatusBadge, SECTION_LABEL,
});
