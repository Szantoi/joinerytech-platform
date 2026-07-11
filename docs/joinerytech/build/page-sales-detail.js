/* AUTO-GENERATED from page-sales-detail.jsx — NE SZERKESZD */
(function(){
// Sales Phase 2 — SlideOver detail components
// QuoteDetailSlideOver  · CreateQuoteSlideOver  · CustomerDetailSlideOver
// All three reuse the SlideOver primitive from page-extras-2 and the
// section-label / key-value / inline-edit patterns from UsersPanel.

const {
  useState: useStateSD,
  useEffect: useEffectSD,
  useMemo: useMemoSD,
  useRef: useRefSD
} = React;

// ─────────────────────────────────────────────────────────────────────────
// Shared atoms — section label + key/value row + small inline spinner
// ─────────────────────────────────────────────────────────────────────────
const SECTION_LABEL = "text-[10.5px] font-semibold text-stone-500 uppercase tracking-[0.06em]";
function KVRow({
  label,
  children,
  mono = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[112px_1fr] items-baseline gap-3 text-[12px] py-1"
  }, /*#__PURE__*/React.createElement("dt", {
    className: "text-stone-500"
  }, label), /*#__PURE__*/React.createElement("dd", {
    className: `text-stone-900 ${mono ? "font-mono" : ""}`
  }, children));
}
function MiniSpinner({
  size = 12
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className: "animate-spin"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    opacity: "0.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 0 0-9-9",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }));
}
function StatusBadge({
  status,
  map = QUOTE_STATUS_MAP
}) {
  const t = map[status] || map.draft;
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10.5px] font-medium ${t.bg} ${t.fg} ring-1 ring-inset ${t.ring}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.dot}`
  }), t.label);
}

// HUF currency cell helper (compact, monospace)
const huf = n => n.toLocaleString("hu-HU") + " Ft";

// ─────────────────────────────────────────────────────────────────────────
// 1.1  QuoteDetailSlideOver
// ─────────────────────────────────────────────────────────────────────────
function QuoteDetailSlideOver({
  quote,
  onClose,
  onOpenCustomer
}) {
  // Local working copy — so FSM transitions / edits feel live in the prototype.
  const [status, setStatus] = useStateSD(quote ? quote.status : "draft");
  const quoteLines = qt => {
    if (!qt) return [];
    if (qt.lines && qt.lines.length) return qt.lines.map((l, i) => ({
      id: l.uid || "L" + i,
      uid: l.uid || "L" + i,
      parentUid: l.parentUid || null,
      subMode: l.subMode || null,
      source: l.source || null,
      description: l.name,
      quantity: l.qty,
      unitPrice: l.price,
      cost: l.cost,
      code: l.code,
      unit: l.unit,
      vat: l.vat,
      design: l.design,
      config: l.config,
      custom: l.custom,
      priceClass: l.priceClass || null,
      rangePct: l.rangePct == null ? null : l.rangePct
    }));
    if (QUOTE_LINES[qt.id]) return QUOTE_LINES[qt.id].map(l => ({
      ...l
    }));
    return [];
  };
  const [lines, setLines] = useStateSD(() => quoteLines(quote));
  const [pendingAction, setPendingAction] = useStateSD(null); // "send" | "reject" | "convert" | null
  const [converting, setConverting] = useStateSD(false);
  // inline-edit per-line state
  const [editLineId, setEditLineId] = useStateSD(null);
  const [draftEdit, setDraftEdit] = useStateSD({
    quantity: 0,
    unitPrice: 0
  });
  // add-line form
  const [newLine, setNewLine] = useStateSD({
    description: "",
    quantity: 1,
    unitPrice: 0
  });
  // ár-pontosítás (PS-minta): irányár/kalkulált tétel szabályozott módosítása
  const [refineId, setRefineId] = useStateSD(null);
  const [refineDraft, setRefineDraft] = useStateSD({
    price: 0,
    priceClass: "fix",
    note: ""
  });
  const [psAck, setPsAck] = useStateSD(false);
  // full builder editor (same UI as new quote) for draft quotes
  const [editorOpen, setEditorOpen] = useStateSD(false);
  // send / reject form fields
  const [validUntil, setValidUntil] = useStateSD(quote ? quote.expires : "");
  const [rejectReason, setRejectReason] = useStateSD("");
  // permission gating (B2B / B2C / B2B2C) + forward sheet
  const sim = useSim();
  const canConvert = window.sim.hasPerm("quote.convert");
  const canForward = window.sim.hasPerm("forward");
  const canTrackOrder = window.sim.hasPerm("order.track");
  const canViewProjects = (window.sim.currentAccount()?.worlds || []).includes("projects");

  // Reactively derive related order + project + requisition created from this quote
  const convertedOrder = (sim.orders || []).find(o => o.fromQuote === (quote && quote.id));
  const convertedProject = (sim.projects || []).find(p => p.fromQuote === (quote && quote.id));
  const convertedReq = (sim.requisitions || []).find(r => r.fromQuote === (quote && quote.id) && r.type === "order-req");

  // Navigation helpers — set deep-link signal, close SlideOver, jump to world
  const onOpenOrder = () => {
    if (convertedOrder) window._pendingOpen = {
      type: "order",
      id: convertedOrder.id
    };
    onClose();
    window.navigateTo?.("procurement", "orders");
  };
  const onOpenProject = () => {
    if (convertedProject) window._pendingOpen = {
      type: "project",
      id: convertedProject.id
    };
    onClose();
    window.navigateTo?.("projects");
  };
  const [forwardOpen, setForwardOpen] = useStateSD(false);
  const [genProject, setGenProject] = useStateSD(() => {
    const a = window.sim.currentAccount();
    return !!a && (a.type === "reseller" || a.type === "internal");
  });

  // reset when quote changes
  useEffectSD(() => {
    if (!quote) return;
    setStatus(quote.status);
    setLines(quoteLines(quote));
    setPendingAction(null);
    setEditLineId(null);
    setRefineId(null);
    setPsAck(false);
    setNewLine({
      description: "",
      quantity: 1,
      unitPrice: 0
    });
    setValidUntil(quote.expires);
    setRejectReason("");
  }, [quote && quote.id]);
  const subtotal = useMemoSD(() => {
    const hasKids = uid => lines.some(x => x.parentUid === uid);
    return lines.reduce((s, l) => hasKids(l.id) ? s : s + l.quantity * l.unitPrice, 0);
  }, [lines]);
  const vat = Math.round(subtotal * VAT_RATE);
  const total = subtotal + vat;
  // nem-fix tételek (irányár/kalkulált) — PS-kapu a konvertáláshoz
  const psCount = lines.filter(l => !lines.some(x => x.parentUid === l.id) && l.priceClass && l.priceClass !== "fix").length;
  if (!quote) return null;
  const isDraft = status === "draft";
  const isReadonly = status === "converted" || status === "archived" || status === "conversionPending";

  // Per-line actions — minden írás a store-ba is perzisztál (updateQuoteLines, csak draft)
  const persistLines = ls => {
    window.sim?.updateQuoteLines?.(quote.id, ls.map(l => ({
      uid: l.uid || l.id,
      parentUid: l.parentUid || null,
      subMode: l.subMode || null,
      source: l.source || null,
      name: l.description,
      code: l.code,
      unit: l.unit || "db",
      qty: Number(l.quantity) || 0,
      price: Number(l.unitPrice) || 0,
      cost: l.cost,
      vat: l.vat,
      design: l.design,
      config: l.config,
      custom: l.custom,
      priceClass: l.priceClass || null,
      rangePct: l.rangePct == null ? null : l.rangePct
    })));
  };
  const startEdit = l => {
    if (!isDraft) return;
    setEditLineId(l.id);
    setDraftEdit({
      quantity: l.quantity,
      unitPrice: l.unitPrice
    });
  };
  const saveEdit = id => {
    const next = lines.map(l => l.id === id ? {
      ...l,
      quantity: Number(draftEdit.quantity) || 0,
      unitPrice: Number(draftEdit.unitPrice) || 0
    } : l);
    setLines(next);
    persistLines(next);
    setEditLineId(null);
    window.toast?.("✓ Sor frissítve", "success");
  };
  const removeLine = id => {
    // főtétel törlésekor az altagok főtétellé lépnek elő (nincs adatvesztés)
    const next = lines.filter(l => l.id !== id).map(l => l.parentUid === id ? {
      ...l,
      parentUid: null
    } : l);
    setLines(next);
    persistLines(next);
    window.toast?.("Sor törölve", "info");
  };
  const addLine = () => {
    if (!newLine.description.trim() || !newLine.quantity || !newLine.unitPrice) return;
    const next = [...lines, {
      id: "L" + Date.now() % 100000,
      ...newLine,
      quantity: Number(newLine.quantity),
      unitPrice: Number(newLine.unitPrice)
    }];
    setLines(next);
    persistLines(next);
    setNewLine({
      description: "",
      quantity: 1,
      unitPrice: 0
    });
    window.toast?.("✓ Tétel hozzáadva", "success");
  };

  // ── Tétel-hierarchia: altagok, sorrend, számozás (számított), forrás-zár ──
  const kidsOf = uid => lines.filter(x => x.parentUid === uid);
  const isParentLine = l => kidsOf(l.id).length > 0;
  const parentSum = uid => kidsOf(uid).reduce((s, k) => s + k.quantity * k.unitPrice, 0);
  // megjelenítési sorrend: főtételek a tömb sorrendjében, mindegyik után az altagjai
  const displayLines = (() => {
    const out = [];
    lines.filter(l => !l.parentUid).forEach(p => {
      out.push(p);
      kidsOf(p.id).forEach(k => out.push(k));
    });
    lines.forEach(l => {
      if (l.parentUid && !lines.some(x => x.id === l.parentUid)) out.push(l);
    }); // árvák
    return out;
  })();
  const lineNos = window.sim.quoteLineNumbers ? window.sim.quoteLineNumbers(displayLines.map(l => ({
    uid: l.id,
    parentUid: l.parentUid
  }))) : {};
  const setAndPersist = next => {
    setLines(next);
    persistLines(next);
  };
  const moveLine = (l, dir) => {
    if (!l.parentUid) {
      // főtétel: blokk-mozgatás (önmaga + altagjai együtt)
      const mains = lines.filter(x => !x.parentUid);
      const mi = mains.findIndex(x => x.id === l.id);
      const ti = mi + dir;
      if (ti < 0 || ti >= mains.length) return;
      const newMains = [...mains];
      [newMains[mi], newMains[ti]] = [newMains[ti], newMains[mi]];
      const next = newMains.flatMap(m => [m, ...kidsOf(m.id)]);
      lines.forEach(x => {
        if (!next.includes(x)) next.push(x);
      });
      setAndPersist(next);
    } else {
      const arr = [...lines];
      const sibs = arr.filter(x => x.parentUid === l.parentUid);
      const si = sibs.findIndex(x => x.id === l.id);
      const ti = si + dir;
      if (ti < 0 || ti >= sibs.length) return;
      const a = arr.indexOf(sibs[si]),
        b = arr.indexOf(sibs[ti]);
      [arr[a], arr[b]] = [arr[b], arr[a]];
      setAndPersist(arr);
    }
  };
  const indentLine = l => {
    // altaggá: az őt megelőző főtétel alá kerül
    if (l.parentUid || isParentLine(l)) return;
    const mains = lines.filter(x => !x.parentUid);
    const mi = mains.findIndex(x => x.id === l.id);
    if (mi <= 0) return;
    setAndPersist(lines.map(x => x.id === l.id ? {
      ...x,
      parentUid: mains[mi - 1].id
    } : x));
  };
  const outdentLine = l => {
    if (!l.parentUid) return;
    setAndPersist(lines.map(x => x.id === l.id ? {
      ...x,
      parentUid: null
    } : x));
  };
  const toggleSubMode = l => setAndPersist(lines.map(x => x.id === l.id ? {
    ...x,
    subMode: (x.subMode || "reszletezett") === "osszevont" ? "reszletezett" : "osszevont"
  } : x));
  // forrás-zárt sor (pl. belsőépítészet): szerkesztés CSAK a forrás-világban — deep-link oda
  const openSource = src => {
    if (!src) return;
    onClose();
    if (src.kind === "concept") {
      window._interiorOpen = src.ref;
      window.navigateTo?.("interior", "concepts");
    } else if (src.kind === "composition") {
      window.navigateTo?.("interior", "composition");
    } else if (src.kind === "rfq") {
      window.navigateTo?.("procurement", "rfq");
    } else if (src.kind === "techreq") {
      window.navigateTo?.("design", "engineer");
    } else window.navigateTo?.(src.world || "interior");
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
        options: [{
          label: "Ugrás az igénylésre",
          icon: "inbox",
          primary: true,
          hint: "Beszerzés → Igénylések · jóváhagyás",
          onClick: () => {
            window._pendingOpen = {
              type: "requisition",
              id: reqId
            };
            window.navigateTo?.("procurement", "requisitions");
          }
        }, {
          label: "Maradok az ajánlatnál",
          icon: "send"
        }]
      });
    }, 1600);
  };
  const subtitle = /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpenCustomer && onOpenCustomer(quote),
    className: "hover:text-indigo-700 hover:underline"
  }, quote.customer));
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: true,
    onClose: onClose,
    title: quote.id,
    subtitle: subtitle,
    width: 680,
    footer: /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: onClose
    }, "Bez\xE1r\xE1s")
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] text-stone-600"
  }, "Aj\xE1nlat \xF6sszefoglal\xF3"), /*#__PURE__*/React.createElement(StatusBadge, {
    status: status
  })), /*#__PURE__*/React.createElement("dl", {
    className: "grid grid-cols-2 gap-x-6"
  }, /*#__PURE__*/React.createElement(KVRow, {
    label: "\xDCgyf\xE9l"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpenCustomer && onOpenCustomer(quote),
    className: "font-medium text-stone-900 hover:text-indigo-700 hover:underline"
  }, quote.customer)), /*#__PURE__*/React.createElement(KVRow, {
    label: "Felel\u0151s"
  }, quote.owner), /*#__PURE__*/React.createElement(KVRow, {
    label: "L\xE9trehozva",
    mono: true
  }, quote.date), /*#__PURE__*/React.createElement(KVRow, {
    label: "Lej\xE1r",
    mono: true
  }, validUntil || "—"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: SECTION_LABEL
  }, "T\xE9telek ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 normal-case tracking-normal font-normal ml-1"
  }, "(", lines.length, ")")), isDraft && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => document.getElementById("qd-newline-input")?.focus(),
    className: "text-[11px] text-stone-500 hover:text-stone-700 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 11
  }), " Gyors t\xE9tel"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditorOpen(true),
    className: "text-[11px] text-indigo-700 hover:text-indigo-900 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 11
  }), " Szerkeszt\xE9s (mint \xFAj aj\xE1nlat)"))), /*#__PURE__*/React.createElement("div", {
    className: "border border-stone-200 rounded-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-[12px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "bg-stone-50/70 text-left"
  }, /*#__PURE__*/React.createElement("th", {
    className: "px-2 py-2 text-[10px] uppercase tracking-wide text-stone-500 font-semibold w-10 text-right"
  }, "#"), /*#__PURE__*/React.createElement("th", {
    className: "px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 font-semibold"
  }, "Megnevez\xE9s"), /*#__PURE__*/React.createElement("th", {
    className: "px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 font-semibold w-14 text-right"
  }, "Db"), /*#__PURE__*/React.createElement("th", {
    className: "px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 font-semibold w-28 text-right"
  }, "Egys\xE9g\xE1r"), /*#__PURE__*/React.createElement("th", {
    className: "px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 font-semibold w-32 text-right"
  }, "\xD6sszeg"), isDraft && /*#__PURE__*/React.createElement("th", {
    className: "w-28"
  }))), /*#__PURE__*/React.createElement("tbody", null, displayLines.map(l => {
    const editing = editLineId === l.id;
    const child = !!l.parentUid;
    const parentLine = child ? lines.find(x => x.id === l.parentUid) : null;
    const parent = isParentLine(l);
    const locked = !!l.source;
    const rolled = child && parentLine && (parentLine.subMode || "reszletezett") === "osszevont";
    const editable = isDraft && !locked && !parent;
    const tinyBtn = "w-5 h-5 grid place-items-center rounded text-[11px] leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-700";
    return /*#__PURE__*/React.createElement("tr", {
      key: l.id,
      className: `border-t border-stone-100 ${parent ? "bg-stone-50/60" : "hover:bg-stone-50/40"}`
    }, /*#__PURE__*/React.createElement("td", {
      className: "px-2 py-2 text-right font-mono text-[10.5px] text-stone-400 whitespace-nowrap align-top"
    }, lineNos[l.id] || ""), /*#__PURE__*/React.createElement("td", {
      className: `px-3 py-2 text-stone-900 ${child ? "pl-6" : ""}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 min-w-0 flex-wrap"
    }, child && /*#__PURE__*/React.createElement("span", {
      className: "text-stone-300 shrink-0"
    }, "\u2514"), /*#__PURE__*/React.createElement("span", {
      className: `${parent ? "font-semibold" : ""} ${rolled ? "text-stone-500" : ""}`
    }, l.description), l.source && /*#__PURE__*/React.createElement("button", {
      onClick: () => openSource(l.source),
      title: `${l.source.label} — ez a sor csak ott szerkeszthető. Megnyitás →`,
      className: "shrink-0 inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[9.5px] font-medium hover:bg-rose-100"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 9
    }), l.source.label), !parent && (() => {
      const META = window.PRICE_CLASS_META || {};
      const cls = META[l.priceClass] ? l.priceClass : "fix";
      if (cls === "fix") return null;
      const m = META[cls];
      const canRefine = ["draft", "sent", "approved"].includes(status);
      return /*#__PURE__*/React.createElement("button", {
        onClick: canRefine ? () => {
          setRefineId(refineId === l.id ? null : l.id);
          setRefineDraft({
            price: l.unitPrice,
            priceClass: "fix",
            note: ""
          });
        } : undefined,
        title: m.hint + (canRefine ? " Kattints a pontosításhoz." : ""),
        className: `shrink-0 inline-flex items-center gap-1 px-1.5 h-5 rounded-full border text-[9.5px] font-medium bg-${m.tone}-50 text-${m.tone}-700 border-${m.tone}-200 ${canRefine ? `hover:bg-${m.tone}-100` : ""}`
      }, m.label, " \xB1", l.rangePct != null ? l.rangePct : m.band, "%");
    })(), parent && /*#__PURE__*/React.createElement("button", {
      onClick: () => isDraft && toggleSubMode(l),
      title: "Altagok megjelen\xEDt\xE9se: \xF6sszevont (csak a f\u0151t\xE9tel \xF6sszege) / r\xE9szletezett (altag-\xE1rakkal)",
      className: `shrink-0 px-1.5 h-5 rounded-full border text-[9.5px] font-medium ${(l.subMode || "reszletezett") === "osszevont" ? "bg-stone-100 text-stone-600 border-stone-200" : "bg-indigo-50 text-indigo-600 border-indigo-200"} ${isDraft ? "" : "pointer-events-none opacity-70"}`
    }, (l.subMode || "reszletezett") === "osszevont" ? "Összevont" : "Részletezett"))), editing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("td", {
      className: "px-1 py-1.5"
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: draftEdit.quantity,
      onChange: e => setDraftEdit(d => ({
        ...d,
        quantity: e.target.value
      })),
      className: "w-12 h-7 px-1.5 text-[12px] text-right border border-indigo-300 rounded font-mono outline-none focus:ring-2 focus:ring-indigo-200"
    })), /*#__PURE__*/React.createElement("td", {
      className: "px-1 py-1.5"
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: draftEdit.unitPrice,
      onChange: e => setDraftEdit(d => ({
        ...d,
        unitPrice: e.target.value
      })),
      className: "w-24 h-7 px-1.5 text-[12px] text-right border border-indigo-300 rounded font-mono outline-none focus:ring-2 focus:ring-indigo-200"
    })), /*#__PURE__*/React.createElement("td", {
      className: "px-3 py-1.5 text-right"
    }, /*#__PURE__*/React.createElement("div", {
      className: "inline-flex gap-1"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditLineId(null),
      className: "h-7 px-2 rounded text-[11px] text-stone-600 hover:bg-stone-100"
    }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
      onClick: () => saveEdit(l.id),
      className: "h-7 px-2 rounded text-[11px] bg-indigo-600 text-white hover:bg-indigo-700"
    }, "Ment\xE9s"))), /*#__PURE__*/React.createElement("td", null)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("td", {
      onClick: () => editable && startEdit(l),
      className: `px-3 py-2 text-right font-mono ${rolled || parent ? "text-stone-300" : "text-stone-700"} ${editable ? "cursor-pointer hover:bg-indigo-50/40" : ""}`
    }, parent ? "—" : rolled ? "·" : l.quantity), /*#__PURE__*/React.createElement("td", {
      onClick: () => editable && startEdit(l),
      className: `px-3 py-2 text-right font-mono ${rolled || parent ? "text-stone-300" : "text-stone-700"} ${editable ? "cursor-pointer hover:bg-indigo-50/40" : ""}`
    }, parent ? "—" : rolled ? "·" : l.unitPrice.toLocaleString("hu-HU")), /*#__PURE__*/React.createElement("td", {
      className: `px-3 py-2 text-right font-mono font-medium ${rolled ? "text-stone-300" : "text-stone-900"}`
    }, parent ? huf(parentSum(l.id)) : rolled ? "·" : huf(l.quantity * l.unitPrice)), isDraft && /*#__PURE__*/React.createElement("td", {
      className: "px-1.5 py-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-end gap-0.5"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => moveLine(l, -1),
      title: "Mozgat\xE1s fel",
      className: tinyBtn
    }, "\u2191"), /*#__PURE__*/React.createElement("button", {
      onClick: () => moveLine(l, +1),
      title: "Mozgat\xE1s le",
      className: tinyBtn
    }, "\u2193"), !child && !parent && !locked && /*#__PURE__*/React.createElement("button", {
      onClick: () => indentLine(l),
      title: "Alt\xE9tell\xE9 \u2014 az el\u0151z\u0151 f\u0151t\xE9tel al\xE1",
      className: tinyBtn
    }, "\u21B3"), child && !locked && /*#__PURE__*/React.createElement("button", {
      onClick: () => outdentLine(l),
      title: "F\u0151t\xE9tell\xE9 emel\xE9s",
      className: tinyBtn
    }, "\u21B0"), !locked && /*#__PURE__*/React.createElement("button", {
      onClick: () => removeLine(l.id),
      title: "Sor t\xF6rl\xE9se",
      className: "w-5 h-5 grid place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 11
    }))))));
  }), lines.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: 6,
    className: "px-3 py-6 text-center text-[11.5px] text-stone-400"
  }, "Nincs t\xE9tel \u2014 adj hozz\xE1 egyet al\xE1bb.")), isDraft && /*#__PURE__*/React.createElement("tr", {
    className: "border-t border-stone-100 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("td", null), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-2"
  }, /*#__PURE__*/React.createElement("input", {
    id: "qd-newline-input",
    value: newLine.description,
    onChange: e => setNewLine(n => ({
      ...n,
      description: e.target.value
    })),
    placeholder: "\xDAj t\xE9tel megnevez\xE9se\u2026",
    className: "w-full h-7 px-2 text-[12px] border border-stone-200 rounded bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
  })), /*#__PURE__*/React.createElement("td", {
    className: "px-1 py-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: newLine.quantity,
    onChange: e => setNewLine(n => ({
      ...n,
      quantity: e.target.value
    })),
    className: "w-12 h-7 px-1.5 text-[12px] text-right font-mono border border-stone-200 rounded bg-white outline-none focus:border-indigo-400"
  })), /*#__PURE__*/React.createElement("td", {
    className: "px-1 py-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: newLine.unitPrice,
    onChange: e => setNewLine(n => ({
      ...n,
      unitPrice: e.target.value
    })),
    placeholder: "0",
    className: "w-24 h-7 px-1.5 text-[12px] text-right font-mono border border-stone-200 rounded bg-white outline-none focus:border-indigo-400"
  })), /*#__PURE__*/React.createElement("td", {
    className: "px-3 py-1.5 text-right"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: addLine,
    disabled: !newLine.description.trim() || !newLine.unitPrice,
    className: "h-7 px-2.5 rounded text-[11px] font-medium bg-stone-900 text-white hover:bg-stone-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 11
  }), " Hozz\xE1ad")), /*#__PURE__*/React.createElement("td", null))))), refineId && (() => {
    const l = lines.find(x => x.id === refineId);
    if (!l) return null;
    const delta = ((Number(refineDraft.price) || 0) - l.unitPrice) * l.quantity;
    const doRefine = () => {
      if (!window.sim.refineQuoteLine(quote.id, l.uid, refineDraft)) return;
      setLines(lines.map(x => x.id === l.id ? {
        ...x,
        unitPrice: Number(refineDraft.price) || 0,
        priceClass: refineDraft.priceClass,
        rangePct: null
      } : x));
      setRefineId(null);
      window.toast?.("✓ Ár pontosítva — módosításként naplózva", "success");
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "mt-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] font-medium text-stone-800"
    }, "\xC1r-pontos\xEDt\xE1s \u2014 ", l.description), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center gap-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: refineDraft.price,
      onChange: e => setRefineDraft(d => ({
        ...d,
        price: e.target.value
      })),
      className: "h-8 w-32 px-2 rounded-lg border border-stone-300 bg-white text-right font-mono text-[12px] outline-none focus:border-amber-400"
    }), ["fix", "kalkulalt"].map(k => {
      const m = window.PRICE_CLASS_META[k];
      return /*#__PURE__*/React.createElement("button", {
        key: k,
        onClick: () => setRefineDraft(d => ({
          ...d,
          priceClass: k
        })),
        title: m.hint,
        className: `h-7 px-2 rounded-md text-[10.5px] font-medium border ${refineDraft.priceClass === k ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-500 border-stone-200"}`
      }, m.label);
    }), /*#__PURE__*/React.createElement("input", {
      value: refineDraft.note,
      onChange: e => setRefineDraft(d => ({
        ...d,
        note: e.target.value
      })),
      placeholder: "Indok (pl. m\u0171szaki terv pontos\xEDtotta)",
      className: "flex-1 min-w-[160px] h-8 px-2 rounded-lg border border-stone-300 bg-white text-[12px] outline-none focus:border-amber-400"
    }), /*#__PURE__*/React.createElement("button", {
      onClick: doRefine,
      className: "h-8 px-3 rounded-lg bg-amber-600 text-white text-[11.5px] font-semibold hover:bg-amber-700"
    }, "Pontos\xEDt\xE1s"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setRefineId(null),
      className: "h-8 px-2.5 rounded-lg text-[11.5px] text-stone-500 hover:bg-stone-100"
    }, "M\xE9gse")), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500"
    }, "Delta a v\xE9g\xF6sszegben: ", /*#__PURE__*/React.createElement("span", {
      className: `font-mono ${delta >= 0 ? "text-rose-600" : "text-emerald-600"}`
    }, delta >= 0 ? "+" : "", huf(Math.round(delta))), " \xB7 a bejegyz\xE9s a m\xF3dos\xEDt\xE1s-napl\xF3ba ker\xFCl."));
  })(), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end mt-3"
  }, /*#__PURE__*/React.createElement("dl", {
    className: "text-right space-y-0.5 text-[12px] min-w-[220px]"
  }, psCount > 0 && (() => {
    const META = window.PRICE_CLASS_META || {};
    const hasKids = uid => lines.some(x => x.parentUid === uid);
    let min = 0,
      max = 0;
    lines.forEach(l => {
      if (hasKids(l.id)) return;
      const cls = META[l.priceClass] ? l.priceClass : "fix";
      const band = l.rangePct != null ? l.rangePct : (META[cls] || {}).band || 0;
      const v = l.quantity * l.unitPrice;
      min += v * (1 - band / 100);
      max += v * (1 + band / 100);
    });
    return /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between gap-6",
      title: `${psCount} tétel irányár/kalkulált szinten — a sáv a deklarált érettségből számolt`
    }, /*#__PURE__*/React.createElement("dt", {
      className: "text-amber-700"
    }, "V\xE1rhat\xF3 s\xE1v (nett\xF3)"), /*#__PURE__*/React.createElement("dd", {
      className: "font-mono text-amber-700"
    }, huf(Math.round(min)), " \u2013 ", huf(Math.round(max))));
  })(), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between gap-6"
  }, /*#__PURE__*/React.createElement("dt", {
    className: "text-stone-500"
  }, "Nett\xF3"), /*#__PURE__*/React.createElement("dd", {
    className: "font-mono text-stone-800"
  }, huf(subtotal))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between gap-6"
  }, /*#__PURE__*/React.createElement("dt", {
    className: "text-stone-500"
  }, "\xC1FA 27%"), /*#__PURE__*/React.createElement("dd", {
    className: "font-mono text-stone-800"
  }, huf(vat))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between gap-6 border-t border-stone-200 mt-1.5 pt-1.5"
  }, /*#__PURE__*/React.createElement("dt", {
    className: "font-semibold text-stone-900 text-[13px]"
  }, "Brutt\xF3"), /*#__PURE__*/React.createElement("dd", {
    className: "font-mono font-semibold text-stone-900 text-[13px]"
  }, huf(total))))), (quote.priceChanges || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 rounded-lg border border-stone-200 bg-stone-50/60 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-1.5"
  }, "\xC1r-pontos\xEDt\xE1sok \u2014 m\xF3dos\xEDt\xE1s-napl\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-0.5"
  }, quote.priceChanges.map((c, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "flex items-center gap-2 text-[11px] text-stone-600 min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-mono shrink-0"
  }, c.ts), /*#__PURE__*/React.createElement("span", {
    className: "truncate"
  }, c.name), /*#__PURE__*/React.createElement("span", {
    className: "font-mono shrink-0"
  }, Math.round(c.from).toLocaleString("hu-HU"), " \u2192 ", Math.round(c.to).toLocaleString("hu-HU"), " Ft"), /*#__PURE__*/React.createElement("span", {
    className: `font-mono shrink-0 ${c.to - c.from >= 0 ? "text-rose-600" : "text-emerald-600"}`
  }, "(", c.to - c.from >= 0 ? "+" : "", Math.round(c.to - c.from).toLocaleString("hu-HU"), ")"), c.note && /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 truncate"
  }, "\u2014 ", c.note))))), window.MarginUtil && window.MarginUtil.canSee() && lines.length > 0 && (() => {
    const M = window.MarginUtil;
    const mt = M.totals(lines.map(l => ({
      price: l.unitPrice,
      cost: l.cost,
      qty: l.quantity
    })));
    const tn = M.tone(mt.pct);
    return /*#__PURE__*/React.createElement("div", {
      className: "flex justify-end mt-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: `min-w-[220px] rounded-lg border ${tn.ring} ring-1 ${tn.bg} px-3 py-2`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 10
    }), " Bels\u0151 \u2014 fedezet"), /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10.5px] font-semibold bg-white ${tn.fg}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${tn.dot}`
    }), M.fmtPct(mt.pct))), /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between gap-6 text-[11.5px]"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-stone-500"
    }, "\xD6nk\xF6lts\xE9g"), /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-stone-700"
    }, M.fmtHuf(mt.cost))), /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between gap-6 text-[11.5px]"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-stone-500"
    }, "Fedezet (profit)"), /*#__PURE__*/React.createElement("span", {
      className: `font-mono font-semibold ${tn.fg}`
    }, M.fmtHuf(mt.profit)))));
  })()), (() => {
    const conceptIds = new Set();
    const compoIds = new Set();
    (sim.concepts || []).forEach(c => {
      if (c.quoteRef === quote.id) conceptIds.add(c.id);
    });
    const oppForQuote = (sim.opportunities || []).find(o => o.quoteId === quote.id);
    if (oppForQuote && oppForQuote.conceptRef) conceptIds.add(oppForQuote.conceptRef);
    (sim.compositions || []).forEach(c => {
      if (c.quoteRef === quote.id) compoIds.add(c.id);
    });
    lines.forEach(l => {
      if (l.source && l.source.kind === "concept") conceptIds.add(l.source.ref);
      if (l.source && l.source.kind === "composition") compoIds.add(l.source.ref);
    });
    if (!conceptIds.size && !compoIds.size) return null;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: SECTION_LABEL + " mb-2"
    }, "Kapcsol\xF3d\xF3 \u2014 Bels\u0151\xE9p\xEDt\xE9szet"), /*#__PURE__*/React.createElement("div", {
      className: "space-y-1.5"
    }, [...conceptIds].map(id => window.RefPanel ? /*#__PURE__*/React.createElement(window.RefPanel, {
      key: id,
      kind: "concept",
      id: id,
      onBeforeNav: onClose
    }) : null), [...compoIds].map(id => window.RefPanel ? /*#__PURE__*/React.createElement(window.RefPanel, {
      key: id,
      kind: "composition",
      id: id,
      onBeforeNav: onClose
    }) : null)));
  })(), /*#__PURE__*/React.createElement(QuoteSubRequests, {
    quote: quote,
    onClose: onClose
  }), /*#__PURE__*/React.createElement(QuoteMergePanel, {
    quote: quote
  }), /*#__PURE__*/React.createElement(QuoteActions, {
    sendLocked: (() => {
      const f = quote.feeQuoteId ? (sim.quotes || []).find(x => x.id === quote.feeQuoteId) : null;
      return !!(f && f.status !== "archived" && !["approved", "converted"].includes(f.status));
    })(),
    status: status,
    isDraft: isDraft,
    converting: converting,
    pendingAction: pendingAction,
    setPendingAction: setPendingAction,
    validUntil: validUntil,
    setValidUntil: setValidUntil,
    rejectReason: rejectReason,
    setRejectReason: setRejectReason,
    doSend: doSend,
    doAccept: doAccept,
    doReject: doReject,
    doArchive: doArchive,
    doConvert: doConvert,
    canConvert: canConvert,
    canForward: canForward,
    onForward: () => setForwardOpen(true),
    psCount: psCount,
    psAck: psAck,
    setPsAck: setPsAck,
    genProject: genProject,
    setGenProject: setGenProject,
    convertedOrderId: convertedOrder?.id,
    convertedProjectId: convertedProject?.id,
    convertedReqId: convertedReq?.id,
    canTrackOrder: canTrackOrder,
    canViewProjects: canViewProjects,
    onOpenOrder: onOpenOrder,
    onOpenProject: onOpenProject
  })), forwardOpen && /*#__PURE__*/React.createElement(ForwardQuoteSheet, {
    quote: quote,
    onClose: () => setForwardOpen(false)
  }), editorOpen && window.ItemBuilder && /*#__PURE__*/React.createElement(ItemBuilder, {
    mode: "quote",
    groupBy: "cat",
    title: "Ajánlat szerkesztése — " + quote.id,
    subtitle: "Katal\xF3gus, term\xE9kek, tervezett b\xFAtor, konfigur\xE1ci\xF3 \xE9s egyedi t\xE9telek",
    submitLabel: "T\xE9telek ment\xE9se",
    enableDiscounts: false,
    initialHeader: quote.customer || "",
    initialLines: lines.map(l => ({
      name: l.description,
      code: l.code || "EGYEDI",
      unit: l.unit || "db",
      price: l.unitPrice,
      cost: l.cost,
      qty: l.quantity,
      vat: l.vat || VAT_RATE * 100,
      custom: l.custom != null ? l.custom : !l.code,
      design: l.design,
      config: l.config
    })),
    catalog: [...sim.sellableCatalog(), ...sim.products.map(p => ({
      id: p.id,
      code: p.id,
      name: p.name,
      unit: "db",
      price: p.price,
      cat: p.cat,
      supplier: "Saját termék"
    })), ...(window.intCatalogForBuilder ? window.intCatalogForBuilder() : [])],
    customers: sim.customers,
    onAddCustomer: c => window.sim.addCustomer(c),
    onClose: () => setEditorOpen(false),
    onSubmit: ({
      lines: bl
    }) => {
      const next = bl.map((l, i) => ({
        id: "L" + i + "-" + Date.now() % 100000,
        description: l.name,
        quantity: l.qty,
        unitPrice: l.price,
        cost: l.cost,
        code: l.custom ? undefined : l.code,
        unit: l.unit,
        vat: l.vat,
        design: l.design,
        config: l.config,
        custom: l.custom
      }));
      setLines(next);
      persistLines(next);
      setEditorOpen(false);
      window.toast?.("✓ Tételek frissítve", "success");
    }
  }));
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
function QuoteSubRequests({
  quote,
  onClose
}) {
  const sim = useSim();
  const [feeOpen, setFeeOpen] = useStateSD(false);
  const [feeAmt, setFeeAmt] = useStateSD("");
  const isDraft = quote.status === "draft";
  const reqs = window.sim.quoteRequestsFor ? window.sim.quoteRequestsFor(quote.id) : [];
  const hasConcept = window.sim.quoteHasConcept ? window.sim.quoteHasConcept(quote.id) : false;
  const briefReady = window.sim.quoteBriefReady ? window.sim.quoteBriefReady(quote.id) : false;
  const feeQ = quote.feeQuoteId ? (sim.quotes || []).find(x => x.id === quote.feeQuoteId) : null;
  if (!isDraft && !reqs.length && !feeQ && !quote.detailFor) return null;
  const openReq = kind => !!reqs.find(r => r.kind === kind && ["kert", "folyamatban"].includes(r.status));
  const reqBtn = "h-8 px-2.5 rounded-lg border text-[11.5px] font-medium inline-flex items-center gap-1.5 transition";
  const ask = kind => {
    if (kind === "rfq") {
      const rfqId = window.sim.createRfqFromQuote(quote.id, {});
      if (rfqId && window.askNextStep) window.askNextStep({
        title: `Külső ajánlatkérés indítva — ${rfqId}`,
        text: "A tételek és beszállítók a Beszerzés → Ajánlatkérés képernyőn adhatók meg; az odaítélt eredmény innen beemelhető tételként.",
        options: [{
          label: "Ugrás az RFQ-ra",
          icon: "send",
          primary: true,
          onClick: () => {
            onClose();
            window.navigateTo?.("procurement", "rfq");
          }
        }, {
          label: "Maradok az ajánlatnál",
          icon: "file"
        }]
      });
    } else window.sim.requestQuoteSubOffer(quote.id, kind, {});
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: SECTION_LABEL + " mb-2"
  }, "Tervez\xE9si brief \u2014 ig\xE9ny-inform\xE1ci\xF3 a tervez\u0151knek"), window.BriefButton && (() => {
    const briefId = window.sim.ensureBrief({
      scope: "quote",
      quoteId: quote.id,
      title: `${quote.customer} — igény-brief`
    });
    const inheritable = window.sim.inheritableBriefsForQuote ? window.sim.inheritableBriefsForQuote(quote.id) : [];
    return /*#__PURE__*/React.createElement("div", {
      className: "mb-3"
    }, /*#__PURE__*/React.createElement(window.BriefCard, {
      briefId: briefId,
      title: `${quote.customer} — tervezési brief`
    }), isDraft && inheritable.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5 rounded-lg border border-violet-200 bg-violet-50/50 px-2.5 py-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-violet-700 font-medium mb-1"
    }, "Kor\xE1bbi helysz\xEDn-brief ehhez az \xFCgyf\xE9lhez \u2014 \xF6r\xF6kl\xE9s (egy \xFCgyf\xE9lnek t\xF6bb helysz\xEDne/v\xE9g\xFCgyfele lehet, v\xE1laszd a megfelel\u0151t):"), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5"
    }, inheritable.map(b => /*#__PURE__*/React.createElement("button", {
      key: b.id,
      onClick: () => {
        window.sim.inheritBriefForQuote(quote.id, b.id);
        window.toast?.("✓ Brief örökölve", "success");
      },
      title: `Forrás: ${b.id}`,
      className: "h-7 px-2.5 rounded-lg border border-violet-200 bg-white text-[11px] font-medium text-violet-700 hover:bg-violet-100 inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "storefront",
      size: 11
    }), " ", b.site || b.title || b.id, " \xF6r\xF6kl\xE9se")))), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 mt-1"
    }, "Helysz\xEDn / ter\xFClet / helyis\xE9g / b\xFAtor / b\xFAtor elem szinteken b\u0151v\xEDthet\u0151 \u2014 megny\xEDl\xE1skor a fa-szerkezet bej\xE1rhat\xF3. A m\u0171szaki tervez\xE9s-k\xE9r\xE9s ett\u0151l a brieft\u0151l f\xFCgg (funkci\xF3 + helysz\xEDn + st\xEDlus). A nyitott k\xE9rd\xE9sek a Feladataim-ban; az adatok a projektbe is \xE1tmennek."));
  })(), /*#__PURE__*/React.createElement("div", {
    className: SECTION_LABEL + " mb-2"
  }, "Aj\xE1nlatk\xE9r\xE9sek \u2014 az aj\xE1nlat pontos\xEDt\xE1s\xE1hoz"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, quote.detailFor && window.RefPanel && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-[11.5px] text-emerald-800"
  }, "Ez a(z) ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono font-medium"
  }, quote.detailFor), " r\xE9szletes aj\xE1nlat ", /*#__PURE__*/React.createElement("b", null, "k\xE9sz\xEDt\xE9si d\xEDj-aj\xE1nlata"), " \u2014 elfogad\xE1sa ut\xE1n k\xE9sz\xFCl a r\xE9szletes aj\xE1nlat."), isDraft && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => ask("interior"),
    disabled: !briefReady || openReq("interior"),
    title: !briefReady ? "Előbb töltsd ki a tervezési briefet (funkció + helyszín + stílus) — nélküle a belsőépítész nem tudja, mit tervezzen" : openReq("interior") ? "Már van nyitott belsőépítészeti kérés" : "Koncepció-kérés a Belsőépítészettől",
    className: `${reqBtn} ${!briefReady || openReq("interior") ? "bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed" : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 12
  }), " Bels\u0151\xE9p\xEDt\xE9szeti koncepci\xF3 ", !briefReady && /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 10
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => ask("technical"),
    disabled: !briefReady || openReq("technical"),
    title: !briefReady ? "Előbb töltsd ki a tervezési briefet (funkció + helyszín + stílus) — az teszi pontossá a műszaki tervezést" : openReq("technical") ? "Már van nyitott műszaki kérés" : "Műszaki megoldás / bútor-kérés a Tervezéstől",
    className: `${reqBtn} ${!briefReady || openReq("technical") ? "bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed" : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ruler",
    size: 12
  }), " M\u0171szaki tervez\xE9s ", !briefReady && /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 10
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => ask("rfq"),
    title: "K\xFCls\u0151 aj\xE1nlatk\xE9r\xE9s besz\xE1ll\xEDt\xF3kt\xF3l (RFQ a Beszerz\xE9sben)",
    className: `${reqBtn} bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 12
  }), " K\xFCls\u0151 (RFQ)")), reqs.map(r => {
    const km = (window.QR_KIND_META || {})[r.kind] || {};
    const st = (window.QR_STATUS || {})[r.status] || {
      label: r.status,
      pill: "bg-stone-100 text-stone-600 border-stone-200"
    };
    const rf = r.kind === "rfq" && r.resultRef ? (sim.rfqs || []).find(x => x.id === r.resultRef) : null;
    const canImport = rf && rf.status === "odaitelve" && rf.awardedTo && !r.imported;
    return /*#__PURE__*/React.createElement("div", {
      key: r.id,
      className: "rounded-lg border border-stone-200 bg-white px-3 py-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 min-w-0 flex-wrap"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: km.icon || "send",
      size: 13,
      className: (km.tint || "text-stone-500") + " shrink-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] font-medium text-stone-800"
    }, km.label || r.kind), /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-[10.5px] text-stone-400"
    }, r.id), /*#__PURE__*/React.createElement("span", {
      className: `text-[10px] font-medium px-2 py-0.5 rounded-full border ${st.pill}`
    }, st.label), /*#__PURE__*/React.createElement("span", {
      className: "flex-1"
    }), r.kind === "rfq" && r.resultRef && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        onClose();
        window.navigateTo?.("procurement", "rfq");
      },
      className: "shrink-0 text-[10.5px] font-medium text-sky-700 hover:underline"
    }, r.resultRef, " \u2192")), r.kind === "interior" && r.resultRef && window.RefPanel && /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5"
    }, /*#__PURE__*/React.createElement(window.RefPanel, {
      kind: "concept",
      id: r.resultRef,
      onBeforeNav: onClose
    })), r.kind === "technical" && r.status === "kesz" && !r.imported && isDraft && /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.importTechResultToQuote(r.id),
      className: "mt-1.5 w-full h-8 rounded-lg bg-amber-600 text-white text-[11.5px] font-medium hover:bg-amber-700 inline-flex items-center justify-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 12
    }), " M\u0171szaki b\xFAtor-t\xE9telek beemel\xE9se (", ((r.plan || {}).items || []).length, " b\xFAtor)"), r.kind === "technical" && r.imported && /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-[10.5px] text-emerald-700"
    }, "T\xE9telek beemelve az aj\xE1nlatba."), canImport && isDraft && /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.importRfqResultToQuote(quote.id, r.resultRef),
      className: "mt-1.5 w-full h-8 rounded-lg bg-sky-600 text-white text-[11.5px] font-medium hover:bg-sky-700 inline-flex items-center justify-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 12
    }), " Nyertes \xE1r beemel\xE9se t\xE9telk\xE9nt (", rf.awardedTo, ")"), r.status === "elutasitva" && r.reason && /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-[10.5px] text-rose-600"
    }, "Indok: ", r.reason));
  }), !quote.detailFor && (feeQ ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-emerald-800 mb-1"
  }, "Aj\xE1nlat-k\xE9sz\xEDt\xE9si d\xEDj \u2014 ", ["approved", "converted"].includes(feeQ.status) ? "elfogadva, a részletes ajánlat kiküldhető" : "elfogadására vár (a kiküldés addig zárt)"), window.RefPanel && /*#__PURE__*/React.createElement(window.RefPanel, {
    kind: "quote",
    id: feeQ.id,
    onBeforeNav: onClose
  })) : isDraft && (feeOpen ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 bg-stone-50/60 px-3 py-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-600 shrink-0"
  }, "D\xEDj (Ft):"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: feeAmt,
    onChange: e => setFeeAmt(e.target.value),
    placeholder: "pl. 150000",
    className: "w-28 h-7 px-2 text-[12px] text-right font-mono border border-stone-300 rounded bg-white outline-none focus:border-emerald-400"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (window.sim.createFeeQuoteForQuote(quote.id, Number(feeAmt))) setFeeOpen(false);
    },
    disabled: !(Number(feeAmt) > 0),
    className: "h-7 px-2.5 rounded text-[11px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-stone-300"
  }, "D\xEDj-aj\xE1nlat ki"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setFeeOpen(false),
    className: "h-7 px-2 rounded text-[11px] text-stone-500 hover:bg-stone-100"
  }, "M\xE9gse")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setFeeOpen(true),
    className: "w-full h-8 rounded-lg border border-dashed border-stone-300 text-[11.5px] text-stone-500 hover:text-emerald-700 hover:border-emerald-300 inline-flex items-center justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), " Aj\xE1nlat-k\xE9sz\xEDt\xE9si d\xEDj k\xE9r\xE9se (k\xFCl\xF6n kis aj\xE1nlat el\u0151re)")))));
}

// ─────────────────────────────────────────────────────────────────
// Összevonás — draft ajánlat ÖSSZEVONÁSA azonos ügyfél másik vázlatával.
// Így a több forrásból (koncepció-díj, bútorsor, konfigurátor) keletkezett
// külön ajánlatok egy dokumentummá fűzhetők — vagy maradhatnak külön.
// ─────────────────────────────────────────────────────────────────
function QuoteMergePanel({
  quote
}) {
  const sim = useSim();
  const [open, setOpen] = useStateSD(false);
  if (!quote || quote.status !== "draft") return null;
  const siblings = (sim.quotes || []).filter(q => q.status === "draft" && q.customer === quote.customer && q.id !== quote.id);
  if (!siblings.length) return null;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: SECTION_LABEL + " mb-2"
  }, "\xD6sszevon\xE1s"), !open ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(true),
    className: "w-full h-9 rounded-lg border border-dashed border-stone-300 text-[12.5px] font-medium text-stone-500 hover:text-indigo-700 hover:border-indigo-300 inline-flex items-center justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 14
  }), "M\xE1sik v\xE1zlat-aj\xE1nlat \xF6sszevon\xE1sa ide (", siblings.length, ")") : /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-2 space-y-1.5 bg-stone-50/50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 px-1 mb-0.5"
  }, "Melyik v\xE1zlatot olvasszuk ebbe (", quote.id, ")? A forr\xE1s archiv\xE1l\xF3dik, t\xE9telei ide ker\xFClnek."), siblings.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.id,
    onClick: () => {
      window.sim.mergeQuotes(quote.id, s.id);
      setOpen(false);
    },
    className: "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white border border-stone-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 14,
    className: "text-stone-400 shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[12px] font-medium text-stone-800"
  }, s.id), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-500 flex-1 truncate"
  }, "\xB7 ", (s.lines || []).length, " t\xE9tel \xB7 ", huf(s.value || 0)), /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13,
    className: "text-indigo-500 shrink-0"
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(false),
    className: "w-full h-8 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100"
  }, "M\xE9gse")));
}
function QuoteActions({
  status,
  isDraft,
  converting,
  pendingAction,
  setPendingAction,
  sendLocked = false,
  validUntil,
  setValidUntil,
  rejectReason,
  setRejectReason,
  doSend,
  doAccept,
  doReject,
  doArchive,
  doConvert,
  canConvert = true,
  canForward = false,
  onForward,
  psCount = 0,
  psAck = false,
  setPsAck,
  genProject,
  setGenProject,
  convertedOrderId,
  convertedProjectId,
  convertedReqId,
  canTrackOrder = false,
  canViewProjects = false,
  onOpenOrder,
  onOpenProject
}) {
  // Terminal states
  if (status === "archived") {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: SECTION_LABEL + " mb-2"
    }, "Akci\xF3k"), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-500 italic px-3 py-2.5 bg-stone-50 rounded-lg border border-stone-100"
    }, "Ez az aj\xE1nlat archiv\xE1lva van \u2014 tov\xE1bbi m\u0171velet nem sz\xFCks\xE9ges."));
  }
  if (status === "converted") {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: SECTION_LABEL + " mb-2"
    }, "Akci\xF3k"), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-teal-800 px-3 py-2.5 bg-teal-50 rounded-lg border border-teal-100 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13
    }), "Aj\xE1nlat konvert\xE1lva \u2014 ig\xE9nyl\xE9s l\xE9trej\xF6tt, j\xF3v\xE1hagy\xE1s ut\xE1n rendel\xE9s gener\xE1lhat\xF3."), (convertedReqId || convertedOrderId || convertedProjectId) && /*#__PURE__*/React.createElement("div", {
      className: "space-y-1.5"
    }, convertedReqId && /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between px-3 py-2 bg-white border border-stone-200 rounded-lg"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 text-[12px]"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "orders",
      size: 13,
      className: "text-amber-600 shrink-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-stone-500 shrink-0"
    }, "Ig\xE9nyl\xE9s"), /*#__PURE__*/React.createElement("span", {
      className: "font-mono font-medium text-stone-900"
    }, convertedReqId)), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        window._pendingOpen = {
          type: "requisition",
          id: convertedReqId
        };
        window.navigateTo?.("procurement", "requisitions");
      },
      className: "shrink-0 ml-2 inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
    }, "Megnyit\xE1s ", /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 10,
      className: "rotate-[-90deg]"
    }))), convertedOrderId && /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between px-3 py-2 bg-white border border-stone-200 rounded-lg"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 text-[12px]"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "factory",
      size: 13,
      className: "text-teal-600 shrink-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-stone-500"
    }, "Rendel\xE9s"), /*#__PURE__*/React.createElement("span", {
      className: "font-mono font-medium text-stone-900"
    }, convertedOrderId)), canTrackOrder ? /*#__PURE__*/React.createElement("button", {
      onClick: onOpenOrder,
      className: "inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition shrink-0"
    }, "Megnyit\xE1s ", /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 10,
      className: "rotate-[-90deg]"
    })) : /*#__PURE__*/React.createElement("span", {
      title: "Rendel\xE9sk\xF6vet\xE9si jogosults\xE1g sz\xFCks\xE9ges",
      className: "inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] text-stone-400 bg-stone-100 border border-stone-200 cursor-not-allowed shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 10
    }), " Nincs jog")), convertedProjectId && /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between px-3 py-2 bg-white border border-stone-200 rounded-lg"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 text-[12px]"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "folder",
      size: 13,
      className: "text-violet-600 shrink-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-stone-500"
    }, "Projekt"), /*#__PURE__*/React.createElement("span", {
      className: "font-mono font-medium text-stone-900"
    }, convertedProjectId)), canViewProjects ? /*#__PURE__*/React.createElement("button", {
      onClick: onOpenProject,
      className: "inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition shrink-0"
    }, "Megnyit\xE1s ", /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 10,
      className: "rotate-[-90deg]"
    })) : /*#__PURE__*/React.createElement("span", {
      title: "Projektek megtekint\xE9s\xE9hez jogosults\xE1g sz\xFCks\xE9ges",
      className: "inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] text-stone-400 bg-stone-100 border border-stone-200 cursor-not-allowed shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 10
    }), " Nincs jog")))));
  }
  if (status === "conversionPending") {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: SECTION_LABEL + " mb-2"
    }, "Akci\xF3k"), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-teal-700 px-3 py-2.5 bg-teal-50 rounded-lg border border-teal-100 inline-flex items-center gap-2"
    }, /*#__PURE__*/React.createElement(MiniSpinner, {
      size: 12
    }), "Gy\xE1rt\xE1sba konvert\xE1l\xE1s folyamatban \u2014 visszajelz\xE9sre v\xE1runk a Production modult\xF3l\u2026"));
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: SECTION_LABEL + " mb-2"
  }, "Akci\xF3k"), pendingAction === "send" && /*#__PURE__*/React.createElement("div", {
    className: "border border-stone-200 rounded-lg p-3 bg-stone-50/60 mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-medium text-stone-700 mb-2"
  }, "Aj\xE1nlat kik\xFCld\xE9se"), /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "\xC9rv\xE9nyess\xE9g ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-500"
  }, "*")), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: validUntil,
    onChange: e => setValidUntil(e.target.value),
    className: "h-8 px-2.5 text-[12px] border border-stone-300 rounded-md bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-2 mt-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPendingAction(null),
    className: "h-8 px-3 rounded-md text-[11.5px] text-stone-600 hover:bg-stone-100"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: doSend,
    disabled: !validUntil,
    className: "h-8 px-3 rounded-md text-[11.5px] font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:bg-stone-300 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 12
  }), " K\xFCld\xE9s"))), pendingAction === "reject" && /*#__PURE__*/React.createElement("div", {
    className: "border border-stone-200 rounded-lg p-3 bg-stone-50/60 mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-medium text-stone-700 mb-2"
  }, "Aj\xE1nlat elutas\xEDt\xE1sa"), /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "Indokl\xE1s ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "(opcion\xE1lis)")), /*#__PURE__*/React.createElement("textarea", {
    value: rejectReason,
    onChange: e => setRejectReason(e.target.value),
    rows: 2,
    placeholder: "Pl. \xE1r, hat\xE1rid\u0151, v\xE1lt\xE1s m\xE1s besz\xE1ll\xEDt\xF3ra\u2026",
    className: "w-full px-2.5 py-1.5 text-[12px] border border-stone-300 rounded-md bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 resize-none"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-2 mt-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPendingAction(null),
    className: "h-8 px-3 rounded-md text-[11.5px] text-stone-600 hover:bg-stone-100"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: doReject,
    className: "h-8 px-3 rounded-md text-[11.5px] font-medium bg-rose-600 text-white hover:bg-rose-700"
  }, "Elutas\xEDt\xE1s"))), !pendingAction && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, status === "draft" && /*#__PURE__*/React.createElement(React.Fragment, null, sendLocked ? /*#__PURE__*/React.createElement("span", {
    title: "A d\xEDj-aj\xE1nlat elfogad\xE1s\xE1ra v\xE1r \u2014 addig a r\xE9szletes aj\xE1nlat nem k\xFCldhet\u0151 ki",
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 12
  }), " Kik\xFCld\xE9s \u2014 d\xEDj-aj\xE1nlatra v\xE1r") : /*#__PURE__*/React.createElement(ActionBtn, {
    tone: "primary",
    icon: "send",
    onClick: () => setPendingAction("send")
  }, "Kik\xFCld\xE9s"), /*#__PURE__*/React.createElement(ActionBtn, {
    tone: "ghost",
    onClick: doArchive
  }, "Archiv\xE1l\xE1s")), status === "sent" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ActionBtn, {
    tone: "success",
    icon: "check",
    onClick: doAccept
  }, "Elfogad\xE1s"), /*#__PURE__*/React.createElement(ActionBtn, {
    tone: "danger",
    icon: "x",
    onClick: () => setPendingAction("reject")
  }, "Elutas\xEDt\xE1s"), canForward && /*#__PURE__*/React.createElement(ActionBtn, {
    tone: "ghost",
    icon: "send",
    onClick: onForward
  }, "Tov\xE1bb aj\xE1nl\xE1s"), /*#__PURE__*/React.createElement(ActionBtn, {
    tone: "ghost",
    onClick: doArchive
  }, "Archiv\xE1l\xE1s")), status === "approved" && /*#__PURE__*/React.createElement(React.Fragment, null, canConvert ? /*#__PURE__*/React.createElement("div", {
    className: "w-full space-y-2.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 text-[12px] text-stone-700 cursor-pointer select-none"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setGenProject && setGenProject(!genProject),
    "aria-pressed": !!genProject,
    className: `w-9 h-5 rounded-full p-0.5 transition shrink-0 ${genProject ? "bg-violet-600" : "bg-stone-300"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `block w-4 h-4 rounded-full bg-white transition-transform ${genProject ? "translate-x-4" : ""}`
  })), "Projekt is l\xE9trej\xF6jj\xF6n a koordin\xE1ci\xF3hoz (szak\xE1g-f\xFCgg\u0151s\xE9gekkel)"), psCount > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11.5px] text-amber-800 space-y-1.5"
  }, /*#__PURE__*/React.createElement("div", null, "\u26A0 ", psCount, " t\xE9tel ir\xE1ny\xE1r/kalkul\xE1lt szinten \u2014 a konvert\xE1l\xE1s ", /*#__PURE__*/React.createElement("b", null, "PS-z\xE1rad\xE9kkal"), " megy: a t\xE9tel pontos\xEDt\xE1sa k\xE9s\u0151bb m\xF3dos\xEDt\xE1sk\xE9nt sz\xE1mol\xF3dik el, a v\xE9g\xF6sszeg fel-le mozoghat."), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer select-none text-stone-700"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!psAck,
    onChange: e => setPsAck && setPsAck(e.target.checked),
    className: "accent-amber-600"
  }), "Elfogadom \u2014 ir\xE1ny\xF6sszeg-t\xE9telekkel konvert\xE1lok")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, psCount > 0 && !psAck ? /*#__PURE__*/React.createElement("span", {
    title: "El\u0151bb fogadd el a PS-z\xE1rad\xE9kot \u2014 vagy pontos\xEDtsd fixre az ir\xE1ny\xE1r-t\xE9teleket",
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 12
  }), " Ig\xE9nyl\xE9s l\xE9trehoz\xE1sa") : /*#__PURE__*/React.createElement(ActionBtn, {
    tone: "convert",
    icon: "orders",
    onClick: doConvert,
    loading: converting
  }, converting ? "Igénylés létrehozása…" : "Igénylés létrehozása"), canForward && /*#__PURE__*/React.createElement(ActionBtn, {
    tone: "ghost",
    icon: "send",
    onClick: onForward
  }, "Tov\xE1bb aj\xE1nl\xE1s"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-amber-800 px-3 py-2.5 bg-amber-50 rounded-lg border border-amber-100 inline-flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13
  }), " Konvert\xE1l\xE1shoz jogosults\xE1g sz\xFCks\xE9ges \u2014 j\xF3v\xE1hagy\xE1sra a c\xE9gn\xE9l v\xE1r."), canForward && /*#__PURE__*/React.createElement(ActionBtn, {
    tone: "ghost",
    icon: "send",
    onClick: onForward
  }, "Tov\xE1bb aj\xE1nl\xE1s"))), status === "rejected" && /*#__PURE__*/React.createElement(ActionBtn, {
    tone: "ghost",
    onClick: doArchive
  }, "Archiv\xE1l\xE1s"), status === "expired" && /*#__PURE__*/React.createElement(ActionBtn, {
    tone: "ghost",
    onClick: doArchive
  }, "Archiv\xE1l\xE1s")));
}

// Action button — small palette matching the rest of the app
function ActionBtn({
  tone = "ghost",
  icon,
  onClick,
  children,
  loading
}) {
  const tones = {
    primary: "bg-sky-600 text-white hover:bg-sky-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    danger: "bg-white border border-rose-200 text-rose-700 hover:bg-rose-50",
    convert: "bg-teal-600 text-white hover:bg-teal-700",
    ghost: "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    disabled: loading,
    className: `inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11.5px] font-medium transition disabled:opacity-70 ${tones[tone]}`
  }, loading ? /*#__PURE__*/React.createElement(MiniSpinner, {
    size: 12
  }) : icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 12
  }), children);
}

// ─────────────────────────────────────────────────────────────────────────
// 1.2  CreateQuoteSlideOver
// ─────────────────────────────────────────────────────────────────────────
function CreateQuoteSlideOver({
  open,
  onClose,
  preselectCustomer,
  onCreated
}) {
  const [customer, setCustomer] = useStateSD(null); // {id, name, city}
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
      setCustomer(null);
      setSearch("");
    }
    setValidUntil("");
    setNotes("");
    setErrors({});
    setSubmitting(false);
  }, [open, preselectCustomer && preselectCustomer.id]);
  const matches = useMemoSD(() => {
    const q = search.trim().toLowerCase();
    const base = CUSTOMERS || [];
    const list = q.length === 0 ? base : base.filter(c => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q));
    return list.slice(0, 6);
  }, [search]);

  // tomorrow as minimum
  const tomorrow = useMemoSD(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
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
        customer: customer.name,
        customerId: customer.id,
        date: new Date().toISOString().slice(0, 10),
        expires: validUntil,
        value: 0,
        items: 0,
        status: "draft",
        owner: "Kovács P.",
        notes
      };
      window.toast?.("✓ Ajánlat létrehozva — " + newQuote.id, "success");
      onCreated && onCreated(newQuote);
      onClose();
    }, 500);
  };
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: open,
    onClose: onClose,
    title: "\xDAj aj\xE1nlat",
    subtitle: "Az aj\xE1nlat v\xE1zlatk\xE9nt j\xF6n l\xE9tre, majd szerkeszthet\u0151.",
    width: 500,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: onClose
    }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
      onClick: submit,
      disabled: submitting,
      className: "inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-indigo-600 text-white text-[12.5px] font-medium hover:bg-indigo-700 disabled:bg-indigo-300"
    }, submitting && /*#__PURE__*/React.createElement(MiniSpinner, {
      size: 12
    }), "Aj\xE1nlat l\xE9trehoz\xE1sa \u2192"))
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-1.5"
  }, "\xDCgyf\xE9l ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-500 normal-case"
  }, "*")), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    value: search,
    onChange: e => {
      setSearch(e.target.value);
      setCustomer(null);
      setShowSugg(true);
    },
    onFocus: () => setShowSugg(true),
    onBlur: () => setTimeout(() => setShowSugg(false), 140),
    placeholder: "Keress n\xE9v vagy v\xE1ros szerint\u2026",
    className: `w-full h-10 pl-3 pr-9 rounded-lg border text-[12.5px] outline-none focus:ring-1 ${errors.customer ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : "border-stone-200 focus:border-indigo-400 focus:ring-indigo-200"}`
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14,
    className: "absolute right-3 top-3 text-stone-400"
  })), errors.customer && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-rose-600 mt-1"
  }, errors.customer), showSugg && /*#__PURE__*/React.createElement("div", {
    className: "absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-xl z-10 overflow-hidden max-h-[280px] overflow-y-auto"
  }, matches.length === 0 ? /*#__PURE__*/React.createElement("button", {
    className: "w-full text-left px-3 py-2.5 text-[12px] text-indigo-700 hover:bg-indigo-50 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), " \xDAj \xFCgyf\xE9l l\xE9trehoz\xE1sa \u2192") : matches.map(c => {
    const ext = CUSTOMER_EXTRA[c.id] || {
      type: "active"
    };
    const t = CUSTOMER_TYPE_MAP[ext.type];
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onMouseDown: () => {
        setCustomer(c);
        setSearch(c.name);
        setShowSugg(false);
        setErrors(er => ({
          ...er,
          customer: undefined
        }));
      },
      className: "block w-full text-left px-3 py-2.5 text-[12px] hover:bg-stone-50 border-b border-stone-100 last:border-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-7 h-7 rounded-full bg-gradient-to-br ${t.gradFrom} ${t.gradTo} grid place-items-center text-[10px] font-semibold text-white shrink-0`
    }, c.name.split(" ").slice(0, 2).map(s => s[0]).join("")), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-stone-900 font-medium truncate"
    }, c.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500"
    }, c.city, " \xB7 ", t.label))));
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-1.5"
  }, "\xC9rv\xE9nyess\xE9g ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-500 normal-case"
  }, "*")), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: validUntil,
    min: tomorrow,
    onChange: e => {
      setValidUntil(e.target.value);
      setErrors(er => ({
        ...er,
        validUntil: undefined
      }));
    },
    className: `h-10 px-3 rounded-lg border text-[12.5px] outline-none focus:ring-1 ${errors.validUntil ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : "border-stone-200 focus:border-indigo-400 focus:ring-indigo-200"}`
  }), errors.validUntil ? /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-rose-600 mt-1"
  }, errors.validUntil) : /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1"
  }, "Min. holnap. Az \xFCgyf\xE9l eddig fogadhatja el az aj\xE1nlatot.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-1.5"
  }, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("textarea", {
    value: notes,
    onChange: e => setNotes(e.target.value),
    rows: 3,
    placeholder: "Bels\u0151 megjegyz\xE9s (nem l\xE1tja az \xFCgyf\xE9l)",
    className: "w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 resize-none"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 leading-relaxed border-t border-stone-100 pt-3"
  }, "A l\xE9trehoz\xE1s ut\xE1n a t\xE9telek hozz\xE1ad\xE1sa az aj\xE1nlat r\xE9szletes n\xE9zet\xE9ben t\xF6rt\xE9nik. Az aj\xE1nlat ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-600"
  }, "V\xE1zlat"), " st\xE1tuszban indul; csak kik\xFCld\xE9s ut\xE1n v\xE1lik az \xFCgyf\xE9l \xE1ltal l\xE1that\xF3v\xE1.")));
}

// ─────────────────────────────────────────────────────────────────────────
// 2.1  CustomerDetailSlideOver
// ─────────────────────────────────────────────────────────────────────────
function CustomerDetailSlideOver({
  customer,
  onClose,
  onOpenQuote,
  onCreateQuote
}) {
  const sim = useSim();
  const ext = customer ? CUSTOMER_EXTRA[customer.id] || {
    type: "active",
    billing: null,
    shipping: null
  } : null;
  const [type, setType] = useStateSD(ext ? ext.type : "active");
  const [noteDraft, setNoteDraft] = useStateSD("");
  const [contactEditing, setContactEditing] = useStateSD(false);
  const [contactDraft, setContactDraft] = useStateSD({
    contact: "",
    email: "",
    phone: ""
  });
  const [contact, setContact] = useStateSD({
    contact: "",
    email: "",
    phone: ""
  });
  const [openBilling, setOpenBilling] = useStateSD(false);
  const [openShipping, setOpenShipping] = useStateSD(false);
  const [confirm, setConfirm] = useStateSD(null); // "promote" | "deactivate" | null

  useEffectSD(() => {
    if (!customer) return;
    const newExt = CUSTOMER_EXTRA[customer.id] || {
      type: "active"
    };
    setType(newExt.type);
    setContact({
      contact: customer.contact,
      email: customer.email,
      phone: customer.phone
    });
    setContactEditing(false);
    setOpenBilling(false);
    setOpenShipping(false);
    setConfirm(null);
  }, [customer && customer.id]);
  if (!customer || !ext) return null;
  const typeTone = CUSTOMER_TYPE_MAP[type];
  const initials = customer.name.split(" ").slice(0, 2).map(s => s[0]).join("");
  const openQuotes = (sim.quotes || QUOTES || []).filter(q => q.customer === customer.name).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const custOrders = window.sim.ordersForCustomer ? window.sim.ordersForCustomer(customer.name) : [];
  const custNotes = window.sim.customerNotesFor ? window.sim.customerNotesFor(customer.name) : [];
  const beginEditContact = () => {
    setContactDraft(contact);
    setContactEditing(true);
  };
  const saveContact = () => {
    setContact(contactDraft);
    setContactEditing(false);
    window.toast?.("✓ Kapcsolattartó frissítve", "success");
  };
  const doPromote = () => {
    setType("active");
    setConfirm(null);
    window.toast?.("✓ Ügyfél aktiválva — " + customer.name, "success");
  };
  const doDeactivate = () => {
    setType("inactive");
    setConfirm(null);
    window.toast?.("Ügyfél deaktiválva — " + customer.name, "info");
  };
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: true,
    onClose: onClose,
    title: customer.name,
    subtitle: `${customer.city} · ${typeTone.label}`,
    width: 520,
    footer: /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: onClose
    }, "Bez\xE1r\xE1s")
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-14 h-14 rounded-full bg-gradient-to-br ${typeTone.gradFrom} ${typeTone.gradTo} grid place-items-center text-[16px] font-semibold text-white shrink-0`
  }, initials), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 truncate"
  }, customer.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-0.5"
  }, customer.city, " \xB7 ", customer.since, " \xF3ta"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-2"
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    status: type,
    map: CUSTOMER_TYPE_MAP
  }), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10.5px] font-medium bg-stone-100 text-stone-700"
  }, customer.openOrders, " nyitott"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10.5px] font-medium bg-stone-100 text-stone-700 font-mono"
  }, "LTV ", (customer.ltv / 1_000_000).toFixed(1), "M")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: SECTION_LABEL
  }, "Kapcsolattart\xF3"), !contactEditing ? /*#__PURE__*/React.createElement("button", {
    onClick: beginEditContact,
    className: "text-[11px] text-indigo-700 hover:text-indigo-900 font-medium"
  }, "Szerkeszt\xE9s") : /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setContactEditing(false),
    className: "h-7 px-2 rounded text-[11px] text-stone-600 hover:bg-stone-100"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: saveContact,
    className: "h-7 px-2.5 rounded text-[11px] bg-indigo-600 text-white hover:bg-indigo-700"
  }, "Ment\xE9s"))), !contactEditing ? /*#__PURE__*/React.createElement("dl", {
    className: "border border-stone-100 rounded-lg divide-y divide-stone-100 bg-white"
  }, /*#__PURE__*/React.createElement(KVRowBlock, {
    label: "N\xE9v"
  }, contact.contact), /*#__PURE__*/React.createElement(KVRowBlock, {
    label: "E-mail",
    mono: true
  }, contact.email), /*#__PURE__*/React.createElement(KVRowBlock, {
    label: "Telefon",
    mono: true
  }, contact.phone)) : /*#__PURE__*/React.createElement("div", {
    className: "border border-stone-200 rounded-lg p-3 space-y-2 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement(LabeledInput, {
    label: "N\xE9v",
    value: contactDraft.contact,
    onChange: v => setContactDraft(d => ({
      ...d,
      contact: v
    }))
  }), /*#__PURE__*/React.createElement(LabeledInput, {
    label: "E-mail",
    value: contactDraft.email,
    onChange: v => setContactDraft(d => ({
      ...d,
      email: v
    })),
    mono: true
  }), /*#__PURE__*/React.createElement(LabeledInput, {
    label: "Telefon",
    value: contactDraft.phone,
    onChange: v => setContactDraft(d => ({
      ...d,
      phone: v
    })),
    mono: true
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: SECTION_LABEL + " mb-2"
  }, "C\xEDmek"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, /*#__PURE__*/React.createElement(AddressBlock, {
    title: "Sz\xE1ml\xE1z\xE1si c\xEDm",
    open: openBilling,
    onToggle: () => setOpenBilling(v => !v),
    addr: ext.billing
  }), /*#__PURE__*/React.createElement(AddressBlock, {
    title: "Sz\xE1ll\xEDt\xE1si c\xEDm",
    open: openShipping,
    onToggle: () => setOpenShipping(v => !v),
    addr: ext.shipping,
    fallback: "Megegyezik a sz\xE1ml\xE1z\xE1si c\xEDmmel"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: SECTION_LABEL
  }, "Aj\xE1nlatok ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 normal-case tracking-normal font-normal"
  }, "(", openQuotes.length, ")")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onCreateQuote && onCreateQuote(customer),
    className: "text-[11px] text-indigo-700 hover:text-indigo-900 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 11
  }), " \xDAj aj\xE1nlat")), openQuotes.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 px-3 py-3 border border-dashed border-stone-200 rounded-lg"
  }, "M\xE9g nincs aj\xE1nlat \u2014", " ", /*#__PURE__*/React.createElement("button", {
    onClick: () => onCreateQuote && onCreateQuote(customer),
    className: "text-indigo-700 font-medium hover:underline"
  }, "\xDAj aj\xE1nlat \u2192")) : /*#__PURE__*/React.createElement("div", {
    className: "border border-stone-100 rounded-lg overflow-hidden"
  }, openQuotes.map(q => /*#__PURE__*/React.createElement("button", {
    key: q.id,
    onClick: () => onOpenQuote && onOpenQuote(q),
    className: "w-full grid grid-cols-[100px_1fr_110px_18px] gap-2 items-center px-3 py-2 text-left text-[12px] border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-stone-700"
  }, q.id), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StatusBadge, {
    status: q.status
  })), /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-stone-900 text-right font-medium"
  }, (q.value / 1_000_000).toFixed(2), "M Ft"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 12,
    className: "text-stone-400"
  }))))), window.BriefCard && window.sim.briefsForCustomer && (() => {
    const roots = window.sim.briefsForCustomer(customer.name);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: SECTION_LABEL + " mb-2"
    }, "Tervez\xE9si briefek ", /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400 normal-case tracking-normal font-normal"
    }, "(helysz\xEDn / v\xE9g\xFCgyf\xE9l szerint)")), roots.length === 0 ? /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-500 px-3 py-3 border border-dashed border-stone-200 rounded-lg"
    }, "Ehhez az \xFCgyf\xE9lhez m\xE9g nincs brief. A brief az aj\xE1nlat-detailben j\xF6n l\xE9tre \u2014 egy \xFCgyf\xE9lnek t\xF6bb helysz\xEDne / v\xE9g\xFCgyfele is lehet, mind k\xFCl\xF6n brief.") : /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, roots.map(b => /*#__PURE__*/React.createElement(window.BriefCard, {
      key: b.id,
      briefId: b.id,
      title: b.site || b.title || "Tervezési brief"
    }))));
  })(), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: SECTION_LABEL + " mb-2"
  }, "Rendel\xE9sek ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 normal-case tracking-normal font-normal"
  }, "(", custOrders.length, ")")), custOrders.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 px-3 py-3 border border-dashed border-stone-200 rounded-lg"
  }, "M\xE9g nincs rendel\xE9s ehhez az \xFCgyf\xE9lhez.") : /*#__PURE__*/React.createElement("div", {
    className: "border border-stone-100 rounded-lg overflow-hidden"
  }, custOrders.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.id,
    onClick: () => {
      onClose && onClose();
      window.navigateTo?.("orders");
    },
    className: "w-full grid grid-cols-[110px_1fr_110px_18px] gap-2 items-center px-3 py-2 text-left text-[12px] border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-stone-700"
  }, o.id), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-600 truncate"
  }, {
    draft: "Vázlat",
    calc: "Kalkulált",
    ready: "Kész",
    released: "Gyártásban",
    delivered: "Teljesített"
  }[o.status] || o.status), /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-stone-900 text-right font-medium"
  }, ((o.total || 0) / 1_000_000).toFixed(2), "M Ft"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 12,
    className: "text-stone-400"
  }))))), (() => {
    const prof = window.sim.customerProfile ? window.sim.customerProfile(customer.name) : {};
    const setP = patch => window.sim.setCustomerProfile(customer.name, patch);
    const TONES = [["közvetlen", "Tegező / közvetlen"], ["hivatalos", "Magázó / hivatalos"], ["szakmai", "Szakmai / tömör"]];
    const CHANS = [["email", "E-mail"], ["telefon", "Telefon"], ["szemelyes", "Személyes"]];
    const chip = active => `h-7 px-2.5 rounded-lg text-[11px] font-medium border transition ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-stone-500 border-stone-200 hover:border-indigo-300"}`;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: SECTION_LABEL + " mb-2"
    }, "Kapcsolati profil"), (() => {
      const cp = window.sim.companyProfile ? window.sim.companyProfile() : {};
      const bits = [cp.values, cp.positioning, cp.avoid].filter(x => String(x || "").trim());
      if (!bits.length) return null;
      return /*#__PURE__*/React.createElement("div", {
        className: "mb-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] uppercase tracking-wide text-indigo-700 font-semibold mb-0.5"
      }, "C\xE9g-\xF6nk\xE9p \u2014 tartsd szem el\u0151tt"), cp.values && /*#__PURE__*/React.createElement("div", {
        className: "text-[11px] text-stone-600"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-stone-400"
      }, "\xC9rt\xE9keink:"), " ", cp.values), cp.positioning && /*#__PURE__*/React.createElement("div", {
        className: "text-[11px] text-stone-600"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-stone-400"
      }, "Er\u0151ss\xE9g\xFCnk:"), " ", cp.positioning), cp.avoid && /*#__PURE__*/React.createElement("div", {
        className: "text-[11px] text-stone-600"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-stone-400"
      }, "Ker\xFClj\xFCk:"), " ", cp.avoid));
    })(), (() => {
      const co = window.sim.companyProfile ? window.sim.companyProfile() : {};
      if (!(co.values || co.positioning || co.avoid || co.tone)) return null;
      return /*#__PURE__*/React.createElement("div", {
        className: "mb-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] uppercase tracking-wide text-indigo-600 font-semibold mb-0.5"
      }, "Tartsd szem el\u0151tt \u2014 c\xE9g-\xE9rt\xE9krend"), co.values && /*#__PURE__*/React.createElement("div", {
        className: "text-[11.5px] text-stone-700 leading-snug"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-stone-400"
      }, "\xC9rt\xE9keink:"), " ", co.values), co.positioning && /*#__PURE__*/React.createElement("div", {
        className: "text-[11.5px] text-stone-700 leading-snug mt-0.5"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-stone-400"
      }, "Er\u0151ss\xE9g\xFCnk:"), " ", co.positioning), co.avoid && /*#__PURE__*/React.createElement("div", {
        className: "text-[11.5px] text-stone-700 leading-snug mt-0.5"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-stone-400"
      }, "Ker\xFClj\xFCk:"), " ", co.avoid));
    })(), /*#__PURE__*/React.createElement("div", {
      className: "rounded-lg border border-stone-200 bg-stone-50/40 p-3 space-y-2.5"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 mb-1"
    }, "Kommunik\xE1ci\xF3 hangneme"), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5"
    }, TONES.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setP({
        tone: prof.tone === k ? "" : k
      }),
      className: chip(prof.tone === k)
    }, l)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 mb-1"
    }, "Prefer\xE1lt csatorna"), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5"
    }, CHANS.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setP({
        channel: prof.channel === k ? "" : k
      }),
      className: chip(prof.channel === k)
    }, l)))), /*#__PURE__*/React.createElement("label", {
      className: "block"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-500"
    }, "Elv\xE1r\xE1sok"), /*#__PURE__*/React.createElement("textarea", {
      defaultValue: prof.expectations || "",
      onBlur: e => setP({
        expectations: e.target.value
      }),
      rows: 2,
      placeholder: "pl. gyors visszajelz\xE9s, r\xE9szletes \xE1rbont\xE1s, heti st\xE1tusz-riport\u2026",
      className: "mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400 resize-none leading-relaxed"
    })), /*#__PURE__*/React.createElement("label", {
      className: "block"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-500"
    }, "Speci\xE1lis ig\xE9nyek"), /*#__PURE__*/React.createElement("textarea", {
      defaultValue: prof.specialNeeds || "",
      onBlur: e => setP({
        specialNeeds: e.target.value
      }),
      rows: 2,
      placeholder: "pl. akad\xE1lymentes helysz\xEDn, csak d\xE9lel\u0151tti egyeztet\xE9s, allergia/anyagkiz\xE1r\xE1s, NDA\u2026",
      className: "mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400 resize-none leading-relaxed"
    }))));
  })(), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: SECTION_LABEL + " mb-2"
  }, "Megjegyz\xE9sek ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 normal-case tracking-normal font-normal"
  }, "(", custNotes.length, ")")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-1.5 mb-2"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: noteDraft,
    onChange: e => setNoteDraft(e.target.value),
    rows: 2,
    placeholder: "Megjegyz\xE9s az \xFCgyf\xE9lhez \u2014 pl. telefonon egyeztetett r\xE9szlet, preferencia, eml\xE9keztet\u0151\u2026",
    className: "flex-1 px-2.5 py-2 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400 resize-none leading-relaxed"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (noteDraft.trim()) {
        window.sim.addCustomerNote(customer.name, noteDraft);
        setNoteDraft("");
        window.toast?.("✓ Megjegyzés rögzítve", "success");
      }
    },
    className: "h-9 px-3 rounded-lg bg-indigo-600 text-white text-[11.5px] font-medium hover:bg-indigo-700 shrink-0 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), " Hozz\xE1ad")), custNotes.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-400"
  }, "M\xE9g nincs megjegyz\xE9s.") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, custNotes.map(n => /*#__PURE__*/React.createElement("div", {
    key: n.id,
    className: "flex items-start gap-2 px-2.5 py-2 rounded-lg border border-stone-100 bg-stone-50/50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-800 leading-snug whitespace-pre-wrap"
  }, n.text), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-0.5"
  }, n.by, " \xB7 ", n.ts)), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.removeCustomerNote(n.id),
    className: "w-6 h-6 grid place-items-center rounded text-stone-300 hover:bg-rose-50 hover:text-rose-600 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 12
  })))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: SECTION_LABEL + " mb-2"
  }, "Akci\xF3k"), confirm === "promote" && /*#__PURE__*/React.createElement(ConfirmRow, {
    tone: "primary",
    message: "Biztos? Az \xFCgyf\xE9l akt\xEDvba ker\xFCl.",
    onCancel: () => setConfirm(null),
    onConfirm: doPromote,
    confirmLabel: "Aktiv\xE1l\xE1s"
  }), confirm === "deactivate" && /*#__PURE__*/React.createElement(ConfirmRow, {
    tone: "danger",
    message: "Biztos? Az \xFCgyf\xE9l inakt\xEDvba ker\xFCl.",
    onCancel: () => setConfirm(null),
    onConfirm: doDeactivate,
    confirmLabel: "Deaktiv\xE1l\xE1s"
  }), !confirm && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, type === "lead" && /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirm("promote"),
    className: "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11.5px] font-medium bg-indigo-600 text-white hover:bg-indigo-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), " Prom\xF3ci\xF3 \u2192 Akt\xEDv \xFCgyf\xE9l"), type === "active" && /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirm("deactivate"),
    className: "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11.5px] font-medium bg-white border border-rose-200 text-rose-700 hover:bg-rose-50"
  }, "Deaktiv\xE1l\xE1s"), type === "inactive" && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 italic"
  }, "Inakt\xEDv \xFCgyf\xE9l \u2014 nincs el\xE9rhet\u0151 m\u0171velet.")))));
}
function KVRowBlock({
  label,
  children,
  mono = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[96px_1fr] gap-2 px-3 py-2 text-[12px]"
  }, /*#__PURE__*/React.createElement("dt", {
    className: "text-stone-500"
  }, label), /*#__PURE__*/React.createElement("dd", {
    className: `text-stone-900 truncate ${mono ? "font-mono" : ""}`
  }, children));
}
function LabeledInput({
  label,
  value,
  onChange,
  mono
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block text-[10.5px] text-stone-500 mb-0.5"
  }, label), /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: e => onChange(e.target.value),
    className: `w-full h-8 px-2.5 rounded-md border border-stone-200 text-[12px] bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 ${mono ? "font-mono" : ""}`
  }));
}
function AddressBlock({
  title,
  addr,
  open,
  onToggle,
  fallback
}) {
  const fmt = a => a ? `${a.zip} ${a.city}, ${a.street}` : null;
  const text = fmt(addr) || fallback || "—";
  return /*#__PURE__*/React.createElement("div", {
    className: "border border-stone-100 rounded-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onToggle,
    className: "w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-stone-50/60"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 11,
    className: `text-stone-400 transition ${open ? "rotate-90" : ""}`
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-semibold text-stone-700 uppercase tracking-wide"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 text-[12px] text-stone-600 truncate text-right pl-2"
  }, text)), open && /*#__PURE__*/React.createElement("div", {
    className: "px-3 pb-3 pt-1 border-t border-stone-100 bg-stone-50/40"
  }, addr ? /*#__PURE__*/React.createElement("dl", {
    className: "text-[12px] grid grid-cols-[96px_1fr] gap-y-1"
  }, /*#__PURE__*/React.createElement("dt", {
    className: "text-stone-500"
  }, "Orsz\xE1g"), /*#__PURE__*/React.createElement("dd", {
    className: "text-stone-900"
  }, addr.country === "HU" ? "Magyarország" : addr.country), /*#__PURE__*/React.createElement("dt", {
    className: "text-stone-500"
  }, "Ir\xE1ny\xEDt\xF3sz\xE1m"), /*#__PURE__*/React.createElement("dd", {
    className: "text-stone-900 font-mono"
  }, addr.zip), /*#__PURE__*/React.createElement("dt", {
    className: "text-stone-500"
  }, "V\xE1ros"), /*#__PURE__*/React.createElement("dd", {
    className: "text-stone-900"
  }, addr.city), /*#__PURE__*/React.createElement("dt", {
    className: "text-stone-500"
  }, "Utca, hsz."), /*#__PURE__*/React.createElement("dd", {
    className: "text-stone-900"
  }, addr.street)) : /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 italic py-1"
  }, fallback), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end mt-2"
  }, /*#__PURE__*/React.createElement("button", {
    className: "h-7 px-2.5 rounded-md text-[11px] text-indigo-700 hover:bg-indigo-50 font-medium"
  }, "Szerkeszt\xE9s"))));
}
function ConfirmRow({
  message,
  tone,
  onCancel,
  onConfirm,
  confirmLabel
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "border border-stone-200 rounded-lg p-3 bg-stone-50/60 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 text-[11.5px] text-stone-700"
  }, message), /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    className: "h-7 px-2.5 rounded-md text-[11px] text-stone-600 hover:bg-stone-100"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: onConfirm,
    className: `h-7 px-3 rounded-md text-[11px] font-medium text-white ${tone === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"}`
  }, confirmLabel));
}
Object.assign(window, {
  QuoteDetailSlideOver,
  CreateQuoteSlideOver,
  CustomerDetailSlideOver,
  StatusBadge,
  SECTION_LABEL
});
})();
