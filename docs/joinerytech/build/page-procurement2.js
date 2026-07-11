/* AUTO-GENERATED from page-procurement2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// Procurement v2 page — PurchaseRequisition · SupplierInvoice ·
// Three-Way Match · PriceList. Role-aware (requester/approver) + SoD guards.
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateP2,
  useMemo: useMemoP2,
  useEffect: useEffectP2
} = React;

// Generic FSM status pill driven by the tone/dot maps in data-procurement2.js
function FsmPill({
  map,
  status,
  lang
}) {
  const label = (map[lang] || map.hu)[status] || status;
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${map.tone[status] || "bg-stone-100 text-stone-600"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${map.dot[status] || "bg-stone-400"}`
  }), label);
}

// Field label + value block used across detail slide-overs
function Field({
  label,
  children,
  mono
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: `text-[12.5px] text-stone-900 ${mono ? "font-mono" : ""}`
  }, children));
}
function FormLabel({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, children);
}

// SoD warning banner
function SodBanner({
  text
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 text-[11.5px] text-rose-800 flex gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 14,
    className: "shrink-0 mt-0.5"
  }), /*#__PURE__*/React.createElement("span", null, text));
}

// ── Three-Way Match helpers ─────────────────────────────────────────────────
const QTY_TOL = 0.02; // ±2%
const PRICE_TOL = 0.01; // ±1%

function matchLine(line) {
  if (line.deliveredQty == null) {
    return {
      status: "pending",
      qtyVar: 0,
      qtyPct: 0,
      priceVar: 0
    };
  }
  const qtyVar = line.invoicedQty - line.poQty;
  const qtyPct = line.poQty ? qtyVar / line.poQty : 0;
  const priceVar = line.poUnitPrice ? line.unitPrice - line.poUnitPrice : 0;
  const pricePct = line.poUnitPrice ? priceVar / line.poUnitPrice : 0;
  const qtyOk = qtyVar === 0;
  const priceOk = priceVar === 0;
  const withinTol = Math.abs(qtyPct) <= QTY_TOL && Math.abs(pricePct) <= PRICE_TOL;
  let status = "ok";
  if (!qtyOk || !priceOk) status = withinTol ? "within" : "exception";
  return {
    status,
    qtyVar,
    qtyPct,
    priceVar,
    pricePct
  };
}
const MATCH_TONE = {
  ok: {
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500"
  },
  within: {
    bg: "bg-amber-50",
    fg: "text-amber-700",
    dot: "bg-amber-500",
    bar: "bg-amber-500"
  },
  exception: {
    bg: "bg-rose-50",
    fg: "text-rose-700",
    dot: "bg-rose-500",
    bar: "bg-rose-500"
  },
  pending: {
    bg: "bg-stone-100",
    fg: "text-stone-500",
    dot: "bg-stone-400",
    bar: "bg-stone-300"
  }
};
function invoiceNet(inv) {
  return inv.lines.reduce((a, l) => a + l.invoicedQty * l.unitPrice, 0);
}
function invoiceVat(inv) {
  return inv.lines.reduce((a, l) => a + l.invoicedQty * l.unitPrice * (l.vat / 100), 0);
}
// Variance magnitude in HUF (rough EUR→HUF for threshold comparison only)
function invoiceVarianceHuf(inv) {
  const fx = inv.currency === "EUR" ? 390 : 1;
  return inv.lines.reduce((a, l) => {
    const m = matchLine(l);
    const qtyAmt = Math.abs(m.qtyVar) * l.unitPrice;
    const priceAmt = Math.abs(m.priceVar) * l.invoicedQty;
    return a + (qtyAmt + priceAmt) * fx;
  }, 0);
}

// ════════════════════════════════════════════════════════════════════════════
// Requisitions tab
// ════════════════════════════════════════════════════════════════════════════
function GeneratePOSheet({
  groups,
  onClose,
  onConfirm
}) {
  const totalLines = groups.reduce((s, g) => s + g.items.length, 0);
  const grand = groups.reduce((s, g) => s + g.items.reduce((a, x) => a + x.qty * x.estUnit, 0), 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[65] flex items-end md:items-center justify-center",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("button", {
    className: "absolute inset-0 bg-stone-900/40",
    onClick: onClose,
    "aria-label": "Bez\xE1r\xE1s"
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full md:w-[560px] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[88vh] animate-[chSlide_.22s_ease-out]",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom),0px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 pt-4 pb-3 border-b border-stone-200 shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14.5px] font-semibold text-stone-900"
  }, "Megrendel\xE9sek gener\xE1l\xE1sa"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-0.5"
  }, totalLines, " j\xF3v\xE1hagyott ig\xE9ny \u2192 ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-sky-700"
  }, groups.length, " k\xFCl\xF6n megrendel\xE9s"), " \xB7 sz\xE1ll\xEDt\xF3nk\xE9nt")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto px-4 py-3 space-y-3"
  }, groups.map((g, i) => {
    const sub = g.items.reduce((a, x) => a + x.qty * x.estUnit, 0);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "rounded-xl border border-stone-200 overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-3.5 py-2.5 bg-sky-50/60 border-b border-stone-100 flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 min-w-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-6 h-6 rounded-md bg-sky-600 text-white grid place-items-center text-[11px] font-bold shrink-0"
    }, i + 1), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-900 truncate"
    }, g.supplier), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-500"
    }, g.items.length, " t\xE9tel \xB7 1 megrendel\xE9s"))), /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-900 tabular-nums shrink-0"
    }, fmtHUF(sub))), /*#__PURE__*/React.createElement("div", {
      className: "divide-y divide-stone-100"
    }, g.items.map(x => /*#__PURE__*/React.createElement("div", {
      key: x.id,
      className: "px-3.5 py-2 flex items-center justify-between gap-2 text-[12px]"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-stone-700 truncate"
    }, x.material), /*#__PURE__*/React.createElement("span", {
      className: "font-mono tabular-nums text-stone-500 shrink-0"
    }, fmtNum(x.qty), " ", x.unit)))));
  })), /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-t border-stone-200 bg-stone-50/70 shrink-0 flex items-center justify-between gap-3",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom),12px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500"
  }, "\xD6sszesen ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800 tabular-nums"
  }, fmtHUF(grand))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: onClose
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: onConfirm,
    className: "h-9 px-4 rounded-lg text-[12.5px] font-medium bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14
  }), groups.length, " megrendel\xE9s l\xE9trehoz\xE1sa")))));
}
function ReqTab({
  t,
  lang,
  me,
  isApprover
}) {
  const sim = useSim();
  const rows = sim.requisitions;
  const [openId, setOpenId] = useStateP2(null);
  const [showNew, setShowNew] = useStateP2(false);
  const [builderOpen, setBuilderOpen] = useStateP2(false);
  const [genOpen, setGenOpen] = useStateP2(false);
  const [q, setQ] = useStateP2("");
  const [rejecting, setRejecting] = useStateP2(false);
  const [rejectReason, setRejectReason] = useStateP2("");
  const [expandedReqId, setExpandedReqId] = useStateP2(null);
  const [lineSuppliers, setLineSuppliers] = useStateP2({});
  const [assignOpen, setAssignOpen] = useStateP2(false);

  // Deep-link: auto-open a specific requisition on mount if signalled
  useEffectP2(() => {
    const p = window._pendingOpen;
    if (!p || p.type !== "requisition") return;
    window._pendingOpen = null;
    setOpenId(p.id);
  }, []);
  const r = t.req;
  const cur = rows.find(x => x.id === openId) || null;
  const sodBlocked = cur && isApprover && me.name === cur.requester;
  const filtered = rows.filter(x => {
    if (!q) return true;
    const ql = q.toLowerCase();
    return x.id.toLowerCase().includes(ql) || (x.material || "").toLowerCase().includes(ql) || (x.lines || []).some(l => l.material.toLowerCase().includes(ql));
  });
  const update = (id, patch) => window.sim.updateRequisition(id, patch);

  // rendelés-generálás + művelet utáni navigációs kérdés (linked-refs.jsx)
  const genOrderWithFollowUp = reqId => {
    const oid = window.sim.createOrderFromRequisition(reqId);
    if (!oid) return;
    window.askNextStep?.({
      title: `Rendelés létrejött — ${oid}`,
      options: [{
        label: "Rendelés megnyitása",
        icon: "orders",
        primary: true,
        hint: "Értékesítés → Rendelések · számítás + kiadás gyártásba",
        onClick: () => {
          window._pendingOpen = {
            type: "order",
            id: oid
          };
          window.navigateTo?.("sales", "orders");
        }
      }, {
        label: "További igények kezelése",
        icon: "inbox",
        hint: "Maradok az igénylések listáján"
      }]
    });
  };
  const doApprove = () => {
    const reqId = cur.id,
      wasOrderReq = cur.type === "order-req";
    update(cur.id, {
      status: "Approved",
      approver: me.name,
      approvedAt: "2026-05-29 10:00"
    });
    window.toast?.(`✓ ${cur.id} jóváhagyva`, "success");
    setOpenId(null);
    window.askNextStep?.({
      title: `${reqId} jóváhagyva`,
      text: wasOrderReq ? "A jóváhagyott igényből most rendelés generálható." : undefined,
      options: [...(wasOrderReq ? [{
        label: "Rendelés generálása most",
        icon: "factory",
        primary: true,
        hint: "Az igényből azonnal rendelés készül",
        onClick: () => genOrderWithFollowUp(reqId)
      }] : []), {
        label: "További igények kezelése",
        icon: "inbox",
        hint: "Maradok az igénylések listáján"
      }]
    });
  };
  const doReject = () => {
    update(cur.id, {
      status: "Rejected",
      approver: me.name,
      rejectReason: rejectReason || "—",
      approvedAt: "2026-05-29 10:00"
    });
    window.toast?.(`${cur.id} elutasítva`, "info");
    setRejecting(false);
    setRejectReason("");
    setOpenId(null);
  };
  const doToPo = () => {
    if (cur.lines && cur.lines.length > 0) {
      setAssignOpen(true);
      return;
    }
    const po = "PO-2426-" + (92 + Math.floor(Math.random() * 6));
    update(cur.id, {
      status: "ConvertedToPO",
      poRef: po
    });
    window.sim?.createPOsFromReqs([{
      supplier: cur.preferredSupplier || "Egyéb (nincs szállító)",
      lines: [{
        material: cur.material,
        matCode: cur.matCode,
        qty: cur.qty,
        unit: cur.unit,
        price: cur.estUnit,
        reqId: cur.id
      }]
    }]);
    setOpenId(null);
  };
  const doToPoMulti = () => {
    if (!cur || !cur.lines) return;
    const groups = {};
    cur.lines.forEach((l, i) => {
      const sup = lineSuppliers[cur.id + "_" + i] || l.supplier || "Egyéb (nincs szállító)";
      if (!groups[sup]) groups[sup] = [];
      groups[sup].push({
        material: l.material,
        matCode: l.code || "—",
        qty: l.qty,
        unit: l.unit,
        price: l.estUnit || 0,
        reqId: cur.id
      });
    });
    const groupArr = Object.entries(groups).map(([supplier, lines]) => ({
      supplier,
      lines
    }));
    const created = window.sim?.createPOsFromReqs(groupArr) || [];
    const poRef = created.map(c => c.poId).join(", ");
    update(cur.id, {
      status: "ConvertedToPO",
      poRef: poRef || "PO-multi"
    });
    setAssignOpen(false);
    setOpenId(null);
    window.toast?.("✓ " + groupArr.length + " megrendelés generálva", "success");
  };

  // Bulk: split all approved requisitions into one PO per supplier
  const approved = rows.filter(x => x.status === "Approved");
  const supplierGroups = (() => {
    const map = {};
    approved.forEach(x => {
      const key = x.preferredSupplier || "Egyéb (nincs szállító)";
      (map[key] = map[key] || []).push(x);
    });
    return Object.entries(map).map(([supplier, items]) => ({
      supplier,
      items
    }));
  })();
  const doGenerate = () => {
    const groups = supplierGroups.map(g => ({
      supplier: g.supplier,
      lines: g.items.map(x => ({
        material: x.material,
        matCode: x.matCode,
        qty: x.qty,
        unit: x.unit,
        price: x.estUnit,
        reqId: x.id
      }))
    }));
    const created = window.sim?.createPOsFromReqs(groups) || [];
    const refBySupplier = {};
    created.forEach(c => {
      refBySupplier[c.supplier] = c.poId;
    });
    approved.forEach(x => window.sim.updateRequisition(x.id, {
      status: "ConvertedToPO",
      poRef: refBySupplier[x.preferredSupplier || "Egyéb (nincs szállító)"]
    }));
    setGenOpen(false);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800 tabular-nums"
  }, rows.length), " ", r.count), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-3 h-8 flex-1 min-w-[150px] sm:flex-none sm:w-[260px] rounded-lg bg-white border border-stone-200 text-stone-500 sm:ml-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: r.searchPh,
    className: "bg-transparent outline-none text-[12px] flex-1 min-w-0 placeholder:text-stone-400"
  })), /*#__PURE__*/React.createElement("div", {
    className: "hidden sm:block flex-1"
  }), supplierGroups.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setGenOpen(true),
    className: "h-8 px-3 rounded-lg bg-sky-600 text-white text-[11.5px] font-medium hover:bg-sky-700 inline-flex items-center gap-1.5 shadow-sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 13
  }), "Megrendel\xE9s (", approved.length, ")"), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: () => setBuilderOpen(true)
  }, r.new)), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:flex items-center border-b border-stone-200/80 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 grid grid-cols-[120px_minmax(0,1.5fr)_100px_110px_120px_28px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500"
  }, /*#__PURE__*/React.createElement("div", null, r.cols.id), /*#__PURE__*/React.createElement("div", null, r.cols.requester), /*#__PURE__*/React.createElement("div", null, "T\xE9telek"), /*#__PURE__*/React.createElement("div", null, r.cols.date), /*#__PURE__*/React.createElement("div", null, r.cols.status), /*#__PURE__*/React.createElement("div", null)), /*#__PURE__*/React.createElement("div", {
    className: "w-10 shrink-0"
  })), filtered.map(x => {
    const sod = isApprover && me.name === x.requester && x.status === "Draft";
    const isExp = expandedReqId === x.id;
    const lineCount = x.lines ? x.lines.length : 1;
    const lineLabel = x.lines ? lineCount + " tétel" : x.material || "—";
    const typeTag = x.type === "order-req" ? /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
    }, "Rendel\xE9s ig\xE9ny") : x.type === "multi" ? /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200"
    }, lineCount, " t\xE9tel") : null;
    return /*#__PURE__*/React.createElement("div", {
      key: x.id,
      className: "border-b border-stone-100 last:border-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "hidden md:flex items-center hover:bg-stone-50/60 group"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setExpandedReqId(isExp ? null : x.id),
      className: "flex-1 grid grid-cols-[120px_minmax(0,1.5fr)_100px_110px_120px_28px] gap-3 px-5 py-3 items-center text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] font-mono text-stone-500 truncate"
    }, x.id), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 min-w-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-medium text-stone-900 truncate"
    }, x.requester), sod && /*#__PURE__*/React.createElement("span", {
      className: "text-rose-500 shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 11
    }))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, typeTag || /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] text-stone-600"
    }, lineLabel)), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-mono text-stone-500"
    }, x.date), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FsmPill, {
      map: PR_STATUS,
      status: x.status,
      lang: lang
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-stone-400 transition-transform " + (isExp ? "rotate-90" : "")
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 13
    }))), /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpenId(x.id),
      title: "Teljes n\xE9zet",
      className: "w-10 flex items-center justify-center py-3 text-stone-300 hover:text-stone-600 transition shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "external",
      size: 13
    }))), /*#__PURE__*/React.createElement("div", {
      className: "md:hidden flex items-center hover:bg-stone-50/60"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setExpandedReqId(isExp ? null : x.id),
      className: "flex-1 px-4 py-3.5 flex items-center gap-3 text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[13.5px] font-medium text-stone-900 truncate"
    }, x.requester), typeTag, sod && /*#__PURE__*/React.createElement("span", {
      className: "text-rose-500 shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 12
    }))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mt-1"
    }, /*#__PURE__*/React.createElement(FsmPill, {
      map: PR_STATUS,
      status: x.status,
      lang: lang
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-mono text-stone-500 truncate"
    }, x.id))), /*#__PURE__*/React.createElement("div", {
      className: "text-right shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-medium text-stone-900"
    }, lineLabel), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-mono text-stone-400"
    }, x.date)), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 15,
      className: "text-stone-300 shrink-0 transition-transform " + (isExp ? "rotate-90" : "")
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpenId(x.id),
      className: "px-3 py-3.5 text-stone-300 hover:text-stone-600 shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "external",
      size: 14
    }))), isExp && /*#__PURE__*/React.createElement("div", {
      className: "px-5 pb-4 pt-3 bg-stone-50/40 border-t border-stone-100"
    }, x.lines && x.lines.length > 0 ? /*#__PURE__*/React.createElement("div", {
      className: "rounded-lg border border-stone-200 overflow-hidden mb-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-[minmax(0,2fr)_80px_80px_100px] gap-2 px-3 py-2 bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500 font-medium border-b border-stone-100"
    }, /*#__PURE__*/React.createElement("div", null, "Anyag"), /*#__PURE__*/React.createElement("div", {
      className: "text-right"
    }, "Menny."), /*#__PURE__*/React.createElement("div", null, "Egys\xE9g"), /*#__PURE__*/React.createElement("div", {
      className: "text-right"
    }, "Egys\xE9g\xE1r")), x.lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "grid grid-cols-[minmax(0,2fr)_80px_80px_100px] gap-2 px-3 py-2 border-b border-stone-100 last:border-0 text-[12px]"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "font-medium text-stone-900 truncate"
    }, l.material), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] font-mono text-stone-400"
    }, l.code)), /*#__PURE__*/React.createElement("div", {
      className: "text-right font-mono text-stone-700"
    }, fmtNum(l.qty)), /*#__PURE__*/React.createElement("div", {
      className: "text-stone-500"
    }, l.unit), /*#__PURE__*/React.createElement("div", {
      className: "text-right font-mono text-stone-700"
    }, l.estUnit ? fmtHUF(l.estUnit) : "—")))) : /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] text-stone-600 mb-3"
    }, x.material, " \xB7 ", fmtNum(x.qty), " ", x.unit), x.note && /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-500 italic mb-2"
    }, x.note), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpenId(x.id),
      className: "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-stone-200 bg-white text-stone-600 text-[11px] hover:bg-stone-50"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "external",
      size: 11
    }), " Teljes n\xE9zet"))));
  }), /*#__PURE__*/React.createElement("div", {
    className: "md:hidden divide-y divide-stone-100"
  }, filtered.map(x => {
    const sod = isApprover && me.name === x.requester && x.status === "Draft";
    return /*#__PURE__*/React.createElement("button", {
      key: x.id,
      onClick: () => setOpenId(x.id),
      className: "w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-stone-50/60 active:bg-stone-100/60 transition"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[13.5px] font-medium text-stone-900 truncate"
    }, x.material), x.type === "order-req" && /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
    }, "Rendel\xE9s ig\xE9ny"), sod && /*#__PURE__*/React.createElement("span", {
      className: "text-rose-500 shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 12
    }))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mt-1"
    }, /*#__PURE__*/React.createElement(FsmPill, {
      map: PR_STATUS,
      status: x.status,
      lang: lang
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-mono text-stone-500 truncate"
    }, x.id, " \xB7 ", x.requester))), /*#__PURE__*/React.createElement("div", {
      className: "text-right shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] font-semibold text-stone-900 tabular-nums"
    }, fmtNum(x.qty), " ", /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400 text-[10px] font-normal"
    }, x.unit)), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-mono text-stone-400"
    }, x.date)), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 15,
      className: "text-stone-300 shrink-0"
    }));
  }))), /*#__PURE__*/React.createElement(SlideOver, {
    open: !!cur,
    onClose: () => {
      setOpenId(null);
      setRejecting(false);
    },
    title: cur?.id,
    subtitle: cur && (PR_STATUS[lang] || PR_STATUS.hu)[cur.status],
    width: 520,
    footer: cur && (cur.status === "Draft" ? isApprover ? rejecting ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setRejecting(false)
    }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
      onClick: doReject,
      className: "inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-rose-600 text-white text-[12.5px] font-medium hover:bg-rose-700"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 15
    }), r.reject)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      icon: "x",
      onClick: () => setRejecting(true)
    }, r.reject), /*#__PURE__*/React.createElement("button", {
      disabled: sodBlocked,
      onClick: doApprove,
      className: `inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-white text-[12.5px] font-medium ${sodBlocked ? "bg-stone-300 cursor-not-allowed" : "bg-teal-700 hover:bg-teal-800"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 15
    }), r.approve)) : /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-400 italic"
    }, "J\xF3v\xE1hagy\xE1s csak j\xF3v\xE1hagy\xF3 szerepk\xF6rrel") : cur.status === "Approved" ? cur.sourceKind === "internal_unit" ? /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "factory",
      onClick: () => window.sim.delegateReqToInternalUnit(cur.id)
    }, "Bels\u0151 egys\xE9gnek kiad\xE1sa") : cur.type === "order-req" ? /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "factory",
      onClick: () => {
        setOpenId(null);
        genOrderWithFollowUp(cur.id);
      }
    }, lang === "en" ? "Generate Order" : "Rendelés generálása") : assignOpen ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setAssignOpen(false)
    }, "Vissza"), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "check",
      onClick: doToPoMulti
    }, "Megrendel\xE9sek gener\xE1l\xE1sa")) : /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "external",
      onClick: doToPo
    }, r.toPo) : /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setOpenId(null)
    }, "Bez\xE1r"))
  }, cur && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, sodBlocked && cur.status === "Draft" && /*#__PURE__*/React.createElement(SodBanner, {
    text: t.sod
  }), (() => {
    const orderRef = cur.orderRef || (cur.fromQuote ? (sim.orders || []).find(o => o.fromQuote === cur.fromQuote)?.id : null);
    const order = orderRef ? (sim.orders || []).find(o => o.id === orderRef) : null;
    if (!order) return null;
    const lines = order.lines || [];
    const itemCount = typeof order.items === "number" ? order.items : lines.length || 1;
    const ORDER_STATUS_TONE = {
      draft: "bg-stone-100 text-stone-600",
      calc: "bg-amber-100 text-amber-700",
      ready: "bg-sky-100 text-sky-700",
      released: "bg-teal-100 text-teal-700",
      delivered: "bg-emerald-100 text-emerald-700"
    };
    const ORDER_STATUS_LABEL = {
      draft: "Vázlat",
      calc: "Kalkulált",
      ready: "Kész",
      released: "Gyártásban",
      delivered: "Teljesített"
    };
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
    }, "Kapcsol\xF3d\xF3 rendel\xE9s t\xE9telei"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setOpenId(null);
        window._pendingOpen = {
          type: "order",
          id: order.id
        };
        window.navigateTo?.("sales", "orders");
      },
      className: "inline-flex items-center gap-1 text-[11px] text-sky-700 font-medium hover:underline"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-mono"
    }, order.id), /*#__PURE__*/React.createElement("span", {
      className: `ml-1.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-medium ${ORDER_STATUS_TONE[order.status] || "bg-stone-100 text-stone-600"}`
    }, ORDER_STATUS_LABEL[order.status] || order.status), /*#__PURE__*/React.createElement(Icon, {
      name: "external",
      size: 11,
      className: "ml-0.5"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "rounded-lg border border-stone-200 overflow-hidden bg-white"
    }, lines.length > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "hidden sm:grid grid-cols-[minmax(0,2fr)_70px_70px_90px] gap-2 px-3 py-2 bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500 font-medium border-b border-stone-100"
    }, /*#__PURE__*/React.createElement("div", null, "T\xE9tel"), /*#__PURE__*/React.createElement("div", {
      className: "text-right"
    }, "Menny."), /*#__PURE__*/React.createElement("div", null, "Egys\xE9g"), /*#__PURE__*/React.createElement("div", {
      className: "text-right"
    }, "Nett\xF3")), lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "px-3 py-2.5 border-b border-stone-100 last:border-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900 truncate"
    }, l.name || l.material || "Tétel " + (i + 1)), l.code && /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] font-mono text-stone-400 truncate"
    }, l.code)), /*#__PURE__*/React.createElement("div", {
      className: "shrink-0 text-right"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] tabular-nums font-medium text-stone-900"
    }, l.qty ?? l.quantity ?? "", " ", /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400 font-normal"
    }, l.unit || "")), (l.price || l.unitPrice) && /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] tabular-nums text-stone-500"
    }, fmtHUF((l.price || l.unitPrice || 0) * (l.qty || l.quantity || 1))))))), /*#__PURE__*/React.createElement("div", {
      className: "px-3 py-2 bg-stone-50/70 border-t border-stone-100 flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-500"
    }, lines.length, " t\xE9tel \xF6sszesen"), order.total && /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] font-semibold tabular-nums text-stone-900"
    }, fmtHUF(order.total)))) : /*#__PURE__*/React.createElement("div", {
      className: "px-3 py-3 flex items-center gap-2 text-[12px] text-stone-600"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "box",
      size: 13,
      className: "text-stone-400 shrink-0"
    }), /*#__PURE__*/React.createElement("span", null, itemCount, " \xF6sszevont t\xE9tel \u2014 r\xE9szletes lista a rendel\xE9sn\xE9l."))));
  })(), cur.lines && cur.lines.length > 0 ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "T\xE9telek (", cur.lines.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[minmax(0,2fr)_70px_70px_100px] gap-2 px-3 py-2 bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500 font-medium border-b border-stone-100"
  }, /*#__PURE__*/React.createElement("div", null, "Anyag"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Menny."), /*#__PURE__*/React.createElement("div", null, "Egys\xE9g"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Egys\xE9g\xE1r")), cur.lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "grid grid-cols-[minmax(0,2fr)_70px_70px_100px] gap-2 px-3 py-2.5 border-b border-stone-100 last:border-0 items-center"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 truncate"
  }, l.material), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-mono text-stone-400"
  }, l.code)), /*#__PURE__*/React.createElement("div", {
    className: "text-right font-mono text-[12px] text-stone-700"
  }, fmtNum(l.qty)), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500"
  }, l.unit), /*#__PURE__*/React.createElement("div", {
    className: "text-right font-mono text-[12px] text-stone-700"
  }, l.estUnit ? fmtHUF(l.estUnit) : "—"))))) : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, !cur.orderRef && /*#__PURE__*/React.createElement(Field, {
    label: r.material
  }, cur.material, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] font-mono text-stone-400"
  }, cur.matCode)), !cur.orderRef && /*#__PURE__*/React.createElement(Field, {
    label: r.quantity
  }, /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, fmtNum(cur.qty)), " ", cur.unit), /*#__PURE__*/React.createElement(Field, {
    label: r.preferred
  }, cur.preferredSupplier || /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, r.noneSupplier)), /*#__PURE__*/React.createElement(Field, {
    label: r.estValue,
    mono: true
  }, fmtHUF(cur.qty * cur.estUnit)), /*#__PURE__*/React.createElement(Field, {
    label: r.cols.requester
  }, cur.requester), /*#__PURE__*/React.createElement(Field, {
    label: r.cols.date,
    mono: true
  }, cur.date)), assignOpen && cur.lines && cur.status === "Approved" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Sz\xE1ll\xEDt\xF3 hozz\xE1rendel\xE9se t\xE9telenk\xE9nt"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, cur.lines.map((l, i) => {
    const catItem = (sim.catalog || []).find(c => c.code === l.code);
    const opts = catItem?.suppliers || [];
    const key = cur.id + "_" + i;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex items-center gap-3 p-2.5 bg-white border border-stone-200 rounded-lg"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-medium text-stone-900 truncate"
    }, l.material), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500"
    }, fmtNum(l.qty), " ", l.unit)), /*#__PURE__*/React.createElement("select", {
      value: lineSuppliers[key] ?? (l.supplier || ""),
      onChange: e => setLineSuppliers(prev => ({
        ...prev,
        [key]: e.target.value
      })),
      className: "h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-teal-500 shrink-0 max-w-[180px]"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Sz\xE1ll\xEDt\xF3 v\xE1laszt\xE1sa\u2026"), l.supplier && !opts.some(s => s.name === l.supplier) && /*#__PURE__*/React.createElement("option", {
      value: l.supplier
    }, l.supplier, l.estUnit ? ` — ${fmtHUF(l.estUnit)}/${l.unit}` : ""), opts.map(s => /*#__PURE__*/React.createElement("option", {
      key: s.name,
      value: s.name
    }, s.name, " \u2014 ", fmtHUF(s.price), "/", l.unit)), /*#__PURE__*/React.createElement("option", {
      value: "Egy\xE9b"
    }, "Egy\xE9b sz\xE1ll\xEDt\xF3")));
  }))), cur.sourceKind === "internal_unit" && (() => {
    const io = (sim.handshakes || []).find(h => h.kind === "internal_order" && h.reqId === cur.id);
    const IO = window.IO_STATUS || {
      hu: {},
      tone: {},
      dot: {},
      order: ["sent", "accepted", "done"]
    };
    if (!io) {
      if (cur.status !== "Approved") return null;
      return /*#__PURE__*/React.createElement("div", {
        className: "rounded-xl border border-amber-200 bg-amber-50/50 px-3.5 py-3 flex items-start gap-2.5"
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "factory",
        size: 15,
        className: "text-amber-600 shrink-0 mt-0.5"
      }), /*#__PURE__*/React.createElement("div", {
        className: "text-[11.5px] text-amber-800 leading-relaxed"
      }, /*#__PURE__*/React.createElement("span", {
        className: "font-semibold"
      }, cur.unitName || cur.preferredSupplier), " bels\u0151 egys\xE9g \u2014 j\xF3v\xE1hagyva. Add ki ", /*#__PURE__*/React.createElement("span", {
        className: "font-medium"
      }, "bels\u0151 megrendel\xE9sk\xE9nt"), " (k\xE9zfog\xE1s-l\xE1nc), nem k\xFCls\u0151 PO-k\xE9nt."));
    }
    const ordMap = {
      sent: 0,
      accepted: 1,
      done: 2,
      declined: 1
    };
    const pos = ordMap[io.status] ?? 0;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
    }, "Bels\u0151 megrendel\xE9s \xB7 ", /*#__PURE__*/React.createElement("span", {
      className: "font-mono"
    }, io.id)), /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl border border-stone-200 overflow-hidden bg-white"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-3.5 py-3 flex items-center justify-between gap-2 border-b border-stone-100 bg-amber-50/40"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 min-w-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-7 h-7 rounded-lg bg-amber-500 text-white grid place-items-center shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "factory",
      size: 14
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-900 truncate"
    }, io.unitName), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500"
    }, "bels\u0151 egys\xE9g \xB7 ", fmtNum(io.qty), " ", io.unit))), /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium border " + ((IO.tone || {})[io.status] || "bg-stone-100 text-stone-600 border-stone-200")
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-1.5 h-1.5 rounded-full " + ((IO.dot || {})[io.status] || "bg-stone-400")
    }), (IO.hu || {})[io.status] || io.status)), /*#__PURE__*/React.createElement("div", {
      className: "px-3.5 py-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1"
    }, (IO.order || ["sent", "accepted", "done"]).map((st, i, arr) => {
      const done = i <= pos && io.status !== "declined";
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: st
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex-1 text-center py-1.5 rounded-md text-[10.5px] font-medium " + (done ? "bg-amber-100 text-amber-800" : "bg-stone-50 text-stone-400")
      }, (IO.hu || {})[st]), i < arr.length - 1 && /*#__PURE__*/React.createElement(Icon, {
        name: "chevron",
        size: 12,
        className: "text-stone-300"
      }));
    })), io.status === "declined" && /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-[11px] text-rose-600"
    }, "Az egys\xE9g visszautas\xEDtotta \u2014 az ig\xE9ny visszaker\xFClt \u201EJ\xF3v\xE1hagyva\u201D \xE1llapotba."))), io.status !== "done" && io.status !== "declined" && /*#__PURE__*/React.createElement("div", {
      className: "mt-2 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-400 mr-auto"
    }, "Egys\xE9g n\xE9zete:"), io.status === "sent" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.declineInternalOrder(io.id),
      className: "h-8 px-3 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-600 hover:bg-stone-50"
    }, "Visszautas\xEDt"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.acceptInternalOrder(io.id),
      className: "h-8 px-3.5 rounded-lg text-[11.5px] font-medium bg-amber-500 text-white hover:bg-amber-600 inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13
    }), "Elfogad")), io.status === "accepted" && /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.completeInternalOrder(io.id),
      className: "h-8 px-3.5 rounded-lg text-[11.5px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13
    }), "K\xE9sz jel\xF6l\xE9s")));
  })(), cur.note && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, r.note), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-700 bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5 leading-relaxed"
  }, cur.note)), (() => {
    const linkedQuote = cur.fromQuote ? (sim.quotes || []).find(qq => qq.id === cur.fromQuote) : null;
    const linkedProject = (sim.projects || []).find(pp => cur.fromQuote && pp.fromQuote === cur.fromQuote || cur.projectRef && pp.id === cur.projectRef) || null;
    if (!linkedQuote && !linkedProject && !cur.fromQuote) return null;
    const goQuote = () => {
      const id = cur.fromQuote;
      setOpenId(null);
      window._pendingOpen = {
        type: "quote",
        id
      };
      window.navigateTo?.("sales", "quotes");
    };
    const goProject = () => {
      const id = linkedProject.id;
      setOpenId(null);
      window._pendingOpen = {
        type: "project",
        id
      };
      window.navigateTo?.("projects");
    };
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, "Forr\xE1s"), /*#__PURE__*/React.createElement("div", {
      className: "space-y-1.5"
    }, cur.fromQuote && /*#__PURE__*/React.createElement("button", {
      onClick: goQuote,
      className: "w-full flex items-center justify-between px-3 py-2 bg-white border border-stone-200 rounded-lg hover:border-sky-300 hover:bg-sky-50/40 transition group"
    }, /*#__PURE__*/React.createElement("span", {
      className: "flex items-center gap-2 text-[12px] min-w-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "send",
      size: 13,
      className: "text-sky-600 shrink-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-stone-500"
    }, "Aj\xE1nlat"), /*#__PURE__*/React.createElement("span", {
      className: "font-mono font-medium text-stone-900 truncate"
    }, cur.fromQuote), linkedQuote && /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400 truncate hidden sm:inline"
    }, "\xB7 ", linkedQuote.customer)), /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-sky-700"
    }, "Megnyit\xE1s ", /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 11,
      className: "rotate-[-90deg]"
    }))), linkedProject && /*#__PURE__*/React.createElement("button", {
      onClick: goProject,
      className: "w-full flex items-center justify-between px-3 py-2 bg-white border border-stone-200 rounded-lg hover:border-violet-300 hover:bg-violet-50/40 transition group"
    }, /*#__PURE__*/React.createElement("span", {
      className: "flex items-center gap-2 text-[12px] min-w-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "folder",
      size: 13,
      className: "text-violet-600 shrink-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-stone-500"
    }, "Projekt"), /*#__PURE__*/React.createElement("span", {
      className: "font-medium text-stone-900 truncate"
    }, linkedProject.name)), /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-violet-700"
    }, "Megnyit\xE1s ", /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 11,
      className: "rotate-[-90deg]"
    })))));
  })(), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, "Folyamat"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, ["Draft", "Approved", cur.sourceKind === "internal_unit" ? "Delegated" : cur.type === "order-req" ? "ConvertedToOrder" : "ConvertedToPO"].map((st, i) => {
    const statusOrder = {
      Draft: 0,
      Approved: 1,
      ConvertedToPO: 2,
      ConvertedToOrder: 2,
      Delegated: 2,
      Fulfilled: 2,
      Rejected: 1
    };
    const order = statusOrder[cur.status] ?? 0;
    const rejected = cur.status === "Rejected";
    const done = i <= order && !(rejected && i >= 1);
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: st
    }, /*#__PURE__*/React.createElement("div", {
      className: `flex-1 text-center py-1.5 rounded-md text-[10.5px] font-medium ${done ? "bg-teal-50 text-teal-700" : "bg-stone-50 text-stone-400"}`
    }, (PR_STATUS[lang] || PR_STATUS.hu)[st]), i < 2 && /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 12,
      className: "text-stone-300"
    }));
  })), cur.status === "Rejected" && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-[11.5px] text-rose-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, r.rejectedReason, ":"), " ", cur.rejectReason)), cur.approver && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 font-mono"
  }, r.approvedBy, ": ", cur.approver, " \xB7 ", cur.approvedAt), cur.poRef && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px] text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 13
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, cur.poRef)), rejecting && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, r.rejectedReason), /*#__PURE__*/React.createElement("textarea", {
    value: rejectReason,
    onChange: e => setRejectReason(e.target.value),
    rows: 3,
    placeholder: r.rejectPh,
    className: "w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 resize-none"
  })))), /*#__PURE__*/React.createElement(NewReqDrawer, {
    open: showNew,
    onClose: () => setShowNew(false),
    t: t,
    me: me,
    onCreate: row => {
      window.sim.addRequisitions([row]);
      window.toast?.(`✓ ${row.id} beküldve`, "success");
    }
  }), builderOpen && /*#__PURE__*/React.createElement(ItemBuilder, {
    mode: "procurement",
    groupBy: "cat",
    catalog: sim.catalog,
    onClose: () => setBuilderOpen(false),
    onSubmit: ({
      lines
    }) => {
      window.sim.createMultiLineRequisition({
        lines,
        note: "",
        requester: me.name
      });
      setBuilderOpen(false);
    }
  }), genOpen && /*#__PURE__*/React.createElement(GeneratePOSheet, {
    groups: supplierGroups,
    onClose: () => setGenOpen(false),
    onConfirm: doGenerate
  }));
}
function NewReqDrawer({
  open,
  onClose,
  t,
  me,
  onCreate
}) {
  const r = t.req;
  const [material, setMaterial] = useStateP2("");
  const [qty, setQty] = useStateP2("");
  const [unit, setUnit] = useStateP2("tábla");
  const [supplier, setSupplier] = useStateP2("");
  const [note, setNote] = useStateP2("");
  const submit = asDraft => {
    const id = "PR-2426-" + (32 + Math.floor(Math.random() * 60));
    onCreate({
      id,
      material: material || "Új anyag",
      matCode: "—",
      qty: Number(qty) || 0,
      unit,
      preferredSupplier: supplier || null,
      requester: me.name,
      date: "2026-05-29",
      status: "Draft",
      note: note || "—",
      estUnit: 0
    });
    setMaterial("");
    setQty("");
    setSupplier("");
    setNote("");
    onClose();
  };
  const suppliers = SUPPLIERS.map(s => s.name);
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: open,
    onClose: onClose,
    title: r.new,
    subtitle: `${me.name} · ${me.roleHu}`,
    width: 520,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: onClose
    }, "M\xE9gse"), /*#__PURE__*/React.createElement(GhostBtn, {
      icon: "check",
      onClick: () => submit(true)
    }, r.saveDraft), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "send",
      onClick: () => submit(false)
    }, r.save))
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, r.material), /*#__PURE__*/React.createElement("input", {
    list: "mat-list",
    value: material,
    onChange: e => setMaterial(e.target.value),
    placeholder: "pl. T\xF6lgy 22mm t\xE1bla",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  }), /*#__PURE__*/React.createElement("datalist", {
    id: "mat-list"
  }, MATERIALS.map(m => /*#__PURE__*/React.createElement("option", {
    key: m.code,
    value: m.name
  })))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, r.quantity), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: qty,
    onChange: e => setQty(e.target.value),
    placeholder: "0",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono tabular-nums outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, r.unit), /*#__PURE__*/React.createElement("select", {
    value: unit,
    onChange: e => setUnit(e.target.value),
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white"
  }, ["tábla", "db", "fm", "m²", "szett", "csomag"].map(u => /*#__PURE__*/React.createElement("option", {
    key: u
  }, u))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, r.preferred), /*#__PURE__*/React.createElement("select", {
    value: supplier,
    onChange: e => setSupplier(e.target.value),
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, r.noneSupplier), suppliers.map(s => /*#__PURE__*/React.createElement("option", {
    key: s
  }, s)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, r.note), /*#__PURE__*/React.createElement("textarea", {
    value: note,
    onChange: e => setNote(e.target.value),
    rows: 3,
    placeholder: r.note + "…",
    className: "w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 12
  }), " Ig\xE9nyl\u0151: ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-600 font-medium"
  }, me.name))));
}

// ════════════════════════════════════════════════════════════════════════════
// Three-Way Match line table (shared by invoice detail + match tab)
// ════════════════════════════════════════════════════════════════════════════
function MatchTable({
  inv,
  t,
  lang
}) {
  const m = t.match;
  return /*#__PURE__*/React.createElement("div", {
    className: "border border-stone-200 rounded-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[minmax(0,1.4fr)_72px_72px_72px_90px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 bg-stone-50/60 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement("div", null, t.inv.colMat), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, m.poQty), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, m.deliv), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, m.inv), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, m.varPct)), inv.lines.map((l, i) => {
    const r = matchLine(l);
    const tone = MATCH_TONE[r.status];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "grid grid-cols-[minmax(0,1.4fr)_72px_72px_72px_90px] gap-2 px-3 py-2.5 border-b border-stone-100 last:border-0 items-center text-[11.5px]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-stone-900 truncate"
    }, l.material), /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-medium ${tone.bg} ${tone.fg}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1 h-1 rounded-full ${tone.dot}`
    }), r.status === "pending" ? t.inv.pending : m[r.status])), /*#__PURE__*/React.createElement("div", {
      className: "text-right font-mono tabular-nums text-stone-600"
    }, l.poQty), /*#__PURE__*/React.createElement("div", {
      className: "text-right font-mono tabular-nums text-stone-600"
    }, l.deliveredQty ?? "—"), /*#__PURE__*/React.createElement("div", {
      className: `text-right font-mono tabular-nums ${r.qtyVar !== 0 ? tone.fg + " font-semibold" : "text-stone-600"}`
    }, l.invoicedQty), /*#__PURE__*/React.createElement("div", {
      className: `text-right font-mono tabular-nums ${r.status === "exception" ? tone.fg + " font-semibold" : "text-stone-500"}`
    }, r.status === "pending" ? "—" : r.qtyPct === 0 && r.priceVar === 0 ? "0%" : r.qtyPct ? (r.qtyPct > 0 ? "+" : "") + (r.qtyPct * 100).toFixed(1) + "%" : (r.pricePct > 0 ? "+" : "") + (r.pricePct * 100).toFixed(1) + "%"));
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// Invoices tab
// ════════════════════════════════════════════════════════════════════════════
function InvTab({
  t,
  lang,
  me,
  isApprover
}) {
  const [rows, setRows] = useStateP2(SUPPLIER_INVOICES);
  const [openId, setOpenId] = useStateP2(null);
  const [showNew, setShowNew] = useStateP2(false);
  const [q, setQ] = useStateP2("");
  const [disputing, setDisputing] = useStateP2(false);
  const [disputeReason, setDisputeReason] = useStateP2("");
  const iv = t.inv;
  const cur = rows.find(x => x.id === openId) || null;
  const sodBlocked = cur && isApprover && me.name === cur.recorder;
  const varHuf = cur ? invoiceVarianceHuf(cur) : 0;
  const needsElevated = varHuf > VARIANCE_THRESHOLD_HUF;
  const filtered = rows.filter(x => !q || x.invoiceNo.toLowerCase().includes(q.toLowerCase()) || x.supplier.toLowerCase().includes(q.toLowerCase()));
  const update = (id, patch) => setRows(rs => rs.map(x => x.id === id ? {
    ...x,
    ...patch
  } : x));
  const doApprove = variance => {
    update(cur.id, {
      status: "Approved",
      approver: me.name,
      approvedAt: "2026-05-29 10:00",
      variance
    });
    window.toast?.(`✓ ${cur.id} jóváhagyva${variance ? " (eltéréssel)" : ""}`, "success");
    setOpenId(null);
  };
  const doDispute = () => {
    update(cur.id, {
      status: "Disputed",
      disputeReason: disputeReason || "—"
    });
    window.toast?.(`${cur.id} vitatva`, "warning");
    setDisputing(false);
    setDisputeReason("");
    setOpenId(null);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800 tabular-nums"
  }, rows.length), " ", iv.count), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-3 h-8 flex-1 min-w-[150px] sm:flex-none sm:w-[260px] rounded-lg bg-white border border-stone-200 text-stone-500 sm:ml-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: iv.searchPh,
    className: "bg-transparent outline-none text-[12px] flex-1 min-w-0 placeholder:text-stone-400"
  })), /*#__PURE__*/React.createElement("div", {
    className: "hidden sm:block flex-1"
  }), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: () => setShowNew(true)
  }, iv.new)), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[140px_minmax(0,1.4fr)_120px_minmax(0,1fr)_100px_120px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("div", null, iv.cols.id), /*#__PURE__*/React.createElement("div", null, iv.cols.supplier), /*#__PURE__*/React.createElement("div", null, iv.cols.po), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, iv.cols.amount), /*#__PURE__*/React.createElement("div", null, iv.cols.date), /*#__PURE__*/React.createElement("div", null, iv.cols.status)), filtered.map(x => {
    const gross = invoiceNet(x) + invoiceVat(x);
    const sod = isApprover && me.name === x.recorder && (x.status === "Exception" || x.status === "Matched");
    return /*#__PURE__*/React.createElement("button", {
      key: x.id,
      onClick: () => setOpenId(x.id),
      className: "w-full text-left hidden md:grid grid-cols-[140px_minmax(0,1.4fr)_120px_minmax(0,1fr)_100px_120px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center hover:bg-stone-50/60"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] font-mono text-stone-700 truncate"
    }, x.invoiceNo), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] font-mono text-stone-400"
    }, x.id)), /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900 truncate flex items-center gap-1.5"
    }, x.supplier, sod && /*#__PURE__*/React.createElement("span", {
      className: "text-rose-500"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 12
    }))), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-mono text-sky-700 truncate"
    }, x.poRef), /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] tabular-nums text-right font-medium text-stone-800"
    }, fmtMoney(gross, x.currency)), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-mono text-stone-500"
    }, x.date), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FsmPill, {
      map: INV_STATUS,
      status: x.status,
      lang: lang
    })));
  }), /*#__PURE__*/React.createElement("div", {
    className: "md:hidden divide-y divide-stone-100"
  }, filtered.map(x => {
    const gross = invoiceNet(x) + invoiceVat(x);
    const sod = isApprover && me.name === x.recorder && (x.status === "Exception" || x.status === "Matched");
    return /*#__PURE__*/React.createElement("button", {
      key: x.id,
      onClick: () => setOpenId(x.id),
      className: "w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-stone-50/60 active:bg-stone-100/60 transition"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[13.5px] font-medium text-stone-900 truncate"
    }, x.supplier), sod && /*#__PURE__*/React.createElement("span", {
      className: "text-rose-500 shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 12
    }))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mt-1"
    }, /*#__PURE__*/React.createElement(FsmPill, {
      map: INV_STATUS,
      status: x.status,
      lang: lang
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-mono text-stone-500 truncate"
    }, x.invoiceNo, " \xB7 ", x.poRef))), /*#__PURE__*/React.createElement("div", {
      className: "text-right shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] font-semibold text-stone-800 tabular-nums"
    }, fmtMoney(gross, x.currency)), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-mono text-stone-400"
    }, x.date)), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 15,
      className: "text-stone-300 shrink-0"
    }));
  }))), /*#__PURE__*/React.createElement(SlideOver, {
    open: !!cur,
    onClose: () => {
      setOpenId(null);
      setDisputing(false);
    },
    title: cur?.invoiceNo,
    subtitle: cur && cur.supplier + " · " + (INV_STATUS[lang] || INV_STATUS.hu)[cur.status],
    width: 560,
    footer: cur && (cur.status === "Approved" || cur.status === "Disputed" || cur.status === "Received" ? /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setOpenId(null)
    }, "Bez\xE1r") : disputing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setDisputing(false)
    }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
      onClick: doDispute,
      className: "inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-rose-600 text-white text-[12.5px] font-medium hover:bg-rose-700"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 15
    }), iv.dispute)) : cur.status === "Matched" ? /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "check",
      onClick: () => doApprove(false)
    }, iv.approve) :
    /*#__PURE__*/
    // Exception
    React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      icon: "alert",
      onClick: () => setDisputing(true)
    }, iv.dispute), /*#__PURE__*/React.createElement("button", {
      disabled: sodBlocked || needsElevated && !isApprover,
      onClick: () => doApprove(true),
      className: `inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-white text-[12.5px] font-medium ${sodBlocked || needsElevated && !isApprover ? "bg-stone-300 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-700"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 15
    }), iv.approveVariance)))
  }, cur && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, sodBlocked && (cur.status === "Exception" || cur.status === "Matched") && /*#__PURE__*/React.createElement(SodBanner, {
    text: t.sodInv
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement(Field, {
    label: iv.supplier
  }, cur.supplier), /*#__PURE__*/React.createElement(Field, {
    label: iv.poRef,
    mono: true
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sky-700"
  }, cur.poRef)), /*#__PURE__*/React.createElement(Field, {
    label: iv.cols.date,
    mono: true
  }, cur.date), /*#__PURE__*/React.createElement(Field, {
    label: iv.recordedBy
  }, cur.recorder)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, iv.lines), /*#__PURE__*/React.createElement("div", {
    className: "border border-stone-200 rounded-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[minmax(0,1.5fr)_56px_90px_50px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 bg-stone-50/60 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement("div", null, iv.colMat), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, iv.colInv), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, iv.colPrice), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, iv.colVat)), cur.lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "grid grid-cols-[minmax(0,1.5fr)_56px_90px_50px] gap-2 px-3 py-2 border-b border-stone-100 last:border-0 items-center text-[11.5px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-900 truncate"
  }, l.material), /*#__PURE__*/React.createElement("div", {
    className: "text-right font-mono tabular-nums text-stone-700"
  }, l.invoicedQty), /*#__PURE__*/React.createElement("div", {
    className: "text-right font-mono tabular-nums text-stone-700"
  }, fmtMoney(l.unitPrice, cur.currency)), /*#__PURE__*/React.createElement("div", {
    className: "text-right font-mono tabular-nums text-stone-500"
  }, l.vat, "%")))), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex flex-col items-end gap-0.5 text-[12px] pr-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-6"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, iv.net), /*#__PURE__*/React.createElement("span", {
    className: "font-mono tabular-nums w-28 text-right"
  }, fmtMoney(invoiceNet(cur), cur.currency))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-6"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, iv.vat), /*#__PURE__*/React.createElement("span", {
    className: "font-mono tabular-nums w-28 text-right"
  }, fmtMoney(invoiceVat(cur), cur.currency))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-6 font-semibold text-stone-900"
  }, /*#__PURE__*/React.createElement("span", null, iv.gross), /*#__PURE__*/React.createElement("span", {
    className: "font-mono tabular-nums w-28 text-right"
  }, fmtMoney(invoiceNet(cur) + invoiceVat(cur), cur.currency))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, iv.threeWay), /*#__PURE__*/React.createElement(MatchTable, {
    inv: cur,
    t: t,
    lang: lang
  })), cur.status === "Exception" && /*#__PURE__*/React.createElement("div", {
    className: `rounded-lg px-3 py-2.5 text-[11.5px] flex gap-2 ${needsElevated ? "bg-amber-50 border border-amber-200 text-amber-800" : "bg-stone-50 border border-stone-200 text-stone-600"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 14,
    className: "shrink-0 mt-0.5"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", null, iv.varianceTitle, ": ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono font-medium"
  }, fmtHUF(Math.round(varHuf))), " \xB7 k\xFCsz\xF6b ", fmtHUF(VARIANCE_THRESHOLD_HUF)), needsElevated && /*#__PURE__*/React.createElement("div", {
    className: "mt-0.5"
  }, iv.varianceNote))), cur.status === "Disputed" && cur.disputeReason && /*#__PURE__*/React.createElement("div", {
    className: "bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-[11.5px] text-rose-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, iv.disputeReason, ":"), " ", cur.disputeReason), cur.approver && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 font-mono"
  }, t.req.approvedBy, ": ", cur.approver, " \xB7 ", cur.approvedAt), disputing && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, iv.disputeReason), /*#__PURE__*/React.createElement("textarea", {
    value: disputeReason,
    onChange: e => setDisputeReason(e.target.value),
    rows: 3,
    placeholder: iv.disputeReason + "…",
    className: "w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 resize-none"
  })))), /*#__PURE__*/React.createElement(NewInvDrawer, {
    open: showNew,
    onClose: () => setShowNew(false),
    t: t,
    me: me,
    onCreate: row => {
      setRows(rs => [row, ...rs]);
      window.toast?.(`✓ ${row.invoiceNo} rögzítve`, "success");
    }
  }));
}
function NewInvDrawer({
  open,
  onClose,
  t,
  me,
  onCreate
}) {
  const iv = t.inv;
  const [supplier, setSupplier] = useStateP2(SUPPLIERS[0].name);
  const [poRef, setPoRef] = useStateP2("");
  const [invoiceNo, setInvoiceNo] = useStateP2("");
  const [currency, setCurrency] = useStateP2("HUF");
  const [lines, setLines] = useStateP2([{
    material: "",
    invoicedQty: "",
    unitPrice: "",
    vat: 27
  }]);
  const setLine = (i, patch) => setLines(ls => ls.map((l, j) => j === i ? {
    ...l,
    ...patch
  } : l));
  const addLine = () => setLines(ls => [...ls, {
    material: "",
    invoicedQty: "",
    unitPrice: "",
    vat: 27
  }]);
  const rmLine = i => setLines(ls => ls.length > 1 ? ls.filter((_, j) => j !== i) : ls);
  const net = lines.reduce((a, l) => a + (Number(l.invoicedQty) || 0) * (Number(l.unitPrice) || 0), 0);
  const vat = lines.reduce((a, l) => a + (Number(l.invoicedQty) || 0) * (Number(l.unitPrice) || 0) * ((Number(l.vat) || 0) / 100), 0);
  const submit = () => {
    const n = 45 + Math.floor(Math.random() * 50);
    onCreate({
      id: "SINV-2426-0" + n,
      supplier,
      poRef: poRef || "—",
      invoiceNo: invoiceNo || "INV-" + n,
      date: "2026-05-29",
      status: "Received",
      recorder: me.name,
      currency,
      lines: lines.map(l => ({
        material: l.material || "Tétel",
        poQty: Number(l.invoicedQty) || 0,
        deliveredQty: null,
        invoicedQty: Number(l.invoicedQty) || 0,
        unitPrice: Number(l.unitPrice) || 0,
        vat: Number(l.vat) || 0
      }))
    });
    setLines([{
      material: "",
      invoicedQty: "",
      unitPrice: "",
      vat: 27
    }]);
    setPoRef("");
    setInvoiceNo("");
    onClose();
  };
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: open,
    onClose: onClose,
    title: iv.new,
    subtitle: `${me.name} · ${me.roleHu}`,
    width: 620,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: onClose
    }, "M\xE9gse"), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "check",
      onClick: submit
    }, iv.save))
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, iv.supplier), /*#__PURE__*/React.createElement("select", {
    value: supplier,
    onChange: e => setSupplier(e.target.value),
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white"
  }, SUPPLIERS.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.name
  }, s.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, iv.poRef), /*#__PURE__*/React.createElement("input", {
    value: poRef,
    onChange: e => setPoRef(e.target.value),
    placeholder: "PO-2426-\u2026",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, "Sz\xE1mlasz\xE1m"), /*#__PURE__*/React.createElement("input", {
    value: invoiceNo,
    onChange: e => setInvoiceNo(e.target.value),
    placeholder: "pl. EG-2026-\u2026",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, "Deviza"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5"
  }, ["HUF", "EUR"].map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => setCurrency(c),
    className: `flex-1 h-10 rounded-lg text-[12px] border transition ${currency === c ? "bg-teal-700 text-white border-teal-700" : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"}`
  }, c))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5"
  }, /*#__PURE__*/React.createElement(FormLabel, null, iv.lines), /*#__PURE__*/React.createElement("button", {
    onClick: addLine,
    className: "text-[11px] text-teal-700 font-medium inline-flex items-center gap-1 hover:text-teal-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), iv.addLine)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "grid grid-cols-[minmax(0,1fr)_64px_84px_56px_28px] gap-1.5 items-center"
  }, /*#__PURE__*/React.createElement("input", {
    value: l.material,
    onChange: e => setLine(i, {
      material: e.target.value
    }),
    placeholder: iv.colMat,
    className: "h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-teal-500"
  }), /*#__PURE__*/React.createElement("input", {
    value: l.invoicedQty,
    onChange: e => setLine(i, {
      invoicedQty: e.target.value
    }),
    placeholder: "db",
    type: "number",
    className: "h-9 px-2 rounded-lg border border-stone-200 text-[12px] font-mono tabular-nums text-right outline-none focus:border-teal-500"
  }), /*#__PURE__*/React.createElement("input", {
    value: l.unitPrice,
    onChange: e => setLine(i, {
      unitPrice: e.target.value
    }),
    placeholder: "\xE1r",
    type: "number",
    className: "h-9 px-2 rounded-lg border border-stone-200 text-[12px] font-mono tabular-nums text-right outline-none focus:border-teal-500"
  }), /*#__PURE__*/React.createElement("select", {
    value: l.vat,
    onChange: e => setLine(i, {
      vat: e.target.value
    }),
    className: "h-9 px-1 rounded-lg border border-stone-200 text-[11.5px] bg-white"
  }, [27, 18, 5, 0].map(v => /*#__PURE__*/React.createElement("option", {
    key: v,
    value: v
  }, v, "%"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => rmLine(i),
    className: "w-7 h-9 grid place-items-center text-stone-400 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex flex-col items-end gap-0.5 text-[12px] pr-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-6"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, iv.net), /*#__PURE__*/React.createElement("span", {
    className: "font-mono tabular-nums w-28 text-right"
  }, fmtMoney(net, currency))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-6"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, iv.vat), /*#__PURE__*/React.createElement("span", {
    className: "font-mono tabular-nums w-28 text-right"
  }, fmtMoney(vat, currency))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-6 font-semibold text-stone-900"
  }, /*#__PURE__*/React.createElement("span", null, iv.gross), /*#__PURE__*/React.createElement("span", {
    className: "font-mono tabular-nums w-28 text-right"
  }, fmtMoney(net + vat, currency))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 text-[11px] text-stone-500 flex gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 13,
    className: "shrink-0 mt-0.5"
  }), /*#__PURE__*/React.createElement("span", null, "R\xF6gz\xEDt\xE9s ut\xE1n a sz\xE1mla ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, "Be\xE9rkezett"), " st\xE1tuszba ker\xFCl; a Three-Way Match a sz\xE1ll\xEDt\xE1s k\xF6nyvel\xE9se ut\xE1n automatikusan lefut."))));
}

// ════════════════════════════════════════════════════════════════════════════
// Three-Way Match tab — aggregated reconciliation across invoices
// ════════════════════════════════════════════════════════════════════════════
function MatchTab({
  t,
  lang
}) {
  const m = t.match;
  // flatten all invoice lines with match status
  const all = SUPPLIER_INVOICES.flatMap(inv => inv.lines.map(l => ({
    inv,
    l,
    r: matchLine(l)
  })));
  const counts = {
    ok: 0,
    within: 0,
    exception: 0,
    pending: 0
  };
  all.forEach(x => counts[x.r.status]++);
  const Stat = ({
    k,
    label
  }) => {
    const tone = MATCH_TONE[k];
    return /*#__PURE__*/React.createElement(Card, {
      className: "p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-2 h-2 rounded-full ${tone.dot}`
    }), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
    }, label)), /*#__PURE__*/React.createElement("div", {
      className: `text-[26px] font-semibold tabular-nums ${tone.fg}`
    }, counts[k]), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500"
    }, "t\xE9telsor"));
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, m.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, m.sub, " \xB7 ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, m.legend))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"
  }, /*#__PURE__*/React.createElement(Stat, {
    k: "ok",
    label: m.ok
  }), /*#__PURE__*/React.createElement(Stat, {
    k: "within",
    label: m.within
  }), /*#__PURE__*/React.createElement(Stat, {
    k: "exception",
    label: m.exception
  }), /*#__PURE__*/React.createElement(Stat, {
    k: "pending",
    label: t.inv.pending
  })), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[130px_minmax(0,1.4fr)_minmax(0,1fr)_80px_80px_80px_120px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("div", null, "Sz\xE1mla"), /*#__PURE__*/React.createElement("div", null, "Sz\xE1ll\xEDt\xF3"), /*#__PURE__*/React.createElement("div", null, t.inv.colMat), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, m.poQty), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, m.deliv), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, m.inv), /*#__PURE__*/React.createElement("div", null, "Egyeztet\xE9s")), all.map(({
    inv,
    l,
    r
  }, i) => {
    const tone = MATCH_TONE[r.status];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "hidden md:grid grid-cols-[130px_minmax(0,1.4fr)_minmax(0,1fr)_80px_80px_80px_120px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-mono text-stone-500 truncate"
    }, inv.invoiceNo), /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] text-stone-700 truncate"
    }, inv.supplier), /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] text-stone-900 truncate"
    }, l.material), /*#__PURE__*/React.createElement("div", {
      className: "text-right font-mono tabular-nums text-[12px] text-stone-600"
    }, l.poQty), /*#__PURE__*/React.createElement("div", {
      className: "text-right font-mono tabular-nums text-[12px] text-stone-600"
    }, l.deliveredQty ?? "—"), /*#__PURE__*/React.createElement("div", {
      className: `text-right font-mono tabular-nums text-[12px] ${r.qtyVar !== 0 ? tone.fg + " font-semibold" : "text-stone-600"}`
    }, l.invoicedQty), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${tone.bg} ${tone.fg}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
    }), r.status === "pending" ? t.inv.pending : m[r.status])));
  }), /*#__PURE__*/React.createElement("div", {
    className: "md:hidden divide-y divide-stone-100"
  }, all.map(({
    inv,
    l,
    r
  }, i) => {
    const tone = MATCH_TONE[r.status];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "px-4 py-3.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[13px] font-medium text-stone-900 truncate"
    }, l.material), /*#__PURE__*/React.createElement("span", {
      className: `shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium ${tone.bg} ${tone.fg}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
    }), r.status === "pending" ? t.inv.pending : m[r.status])), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-mono text-stone-500 mt-0.5 truncate"
    }, inv.invoiceNo, " \xB7 ", inv.supplier), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-4 mt-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px]"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400"
    }, m.poQty, ":"), " ", /*#__PURE__*/React.createElement("span", {
      className: "font-mono tabular-nums text-stone-700"
    }, l.poQty)), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px]"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400"
    }, m.deliv, ":"), " ", /*#__PURE__*/React.createElement("span", {
      className: "font-mono tabular-nums text-stone-700"
    }, l.deliveredQty ?? "—")), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px]"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400"
    }, m.inv, ":"), " ", /*#__PURE__*/React.createElement("span", {
      className: `font-mono tabular-nums ${r.qtyVar !== 0 ? tone.fg + " font-semibold" : "text-stone-700"}`
    }, l.invoicedQty))));
  }))));
}

// ════════════════════════════════════════════════════════════════════════════
// Price Lists tab
// ════════════════════════════════════════════════════════════════════════════
function PriceTab({
  t,
  lang
}) {
  const [rows, setRows] = useStateP2(PRICE_LISTS);
  const [openId, setOpenId] = useStateP2(null);
  const p = t.price;
  const cur = rows.find(x => x.id === openId) || null;
  const update = (id, patch) => setRows(rs => rs.map(x => x.id === id ? {
    ...x,
    ...patch
  } : x));
  const doActivate = () => {
    update(cur.id, {
      status: "Active"
    });
    window.toast?.(`✓ ${cur.id} aktiválva`, "success");
    setOpenId(null);
  };
  const doExpire = () => {
    update(cur.id, {
      status: "Expired"
    });
    window.toast?.(`${cur.id} lejáratva`, "info");
    setOpenId(null);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800 tabular-nums"
  }, rows.length), " ", p.count), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus"
  }, p.new)), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
  }, rows.map(pl => {
    const tone = PL_STATUS.tone[pl.status];
    return /*#__PURE__*/React.createElement("button", {
      key: pl.id,
      onClick: () => setOpenId(pl.id),
      className: "text-left bg-white border border-stone-200/80 hover:border-stone-300 rounded-xl overflow-hidden transition"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-4 py-3 border-b border-stone-100 flex items-start justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-900 truncate"
    }, pl.supplier), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] font-mono text-stone-400"
    }, pl.id)), /*#__PURE__*/React.createElement(FsmPill, {
      map: PL_STATUS,
      status: pl.status,
      lang: lang
    })), /*#__PURE__*/React.createElement("div", {
      className: "px-4 py-3 space-y-1.5"
    }, pl.items.slice(0, 3).map((it, i) => {
      const best = BEST_PRICES[it.material];
      const isBest = pl.status === "Active" && pl.currency === "HUF" && best && best.listId === pl.id;
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        className: "flex items-center justify-between gap-2 text-[11.5px]"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-stone-600 truncate flex items-center gap-1.5"
      }, isBest && /*#__PURE__*/React.createElement("span", {
        className: "w-1.5 h-1.5 rounded-full bg-teal-500",
        title: p.bestPrice
      }), it.material), /*#__PURE__*/React.createElement("span", {
        className: `font-mono tabular-nums shrink-0 ${isBest ? "text-teal-700 font-semibold" : "text-stone-700"}`
      }, fmtMoney(it.unitPrice, pl.currency)));
    })), /*#__PURE__*/React.createElement("div", {
      className: "px-4 py-2.5 border-t border-stone-100 flex items-center justify-between text-[10.5px] text-stone-500 font-mono"
    }, /*#__PURE__*/React.createElement("span", null, pl.items.length, " ", p.itemsCount, " \xB7 ", pl.currency), /*#__PURE__*/React.createElement("span", null, p.validTo, " ", pl.validTo)));
  })), /*#__PURE__*/React.createElement(Card, {
    className: "mt-4 p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-b border-stone-200/80 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-teal-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, p.bestPrice, " \u2014 akt\xEDv \xE1rlist\xE1k alapj\xE1n")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_120px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-100 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("div", null, p.cols.material), /*#__PURE__*/React.createElement("div", null, p.supplier), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, p.cols.price)), Object.entries(BEST_PRICES).map(([mat, b]) => /*#__PURE__*/React.createElement("div", {
    key: mat,
    className: "grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_120px] gap-3 px-5 py-2.5 border-b border-stone-100 last:border-0 items-center text-[12px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-900 truncate"
  }, mat), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-600 truncate flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12,
    className: "text-teal-600"
  }), b.supplier), /*#__PURE__*/React.createElement("div", {
    className: "text-right font-mono tabular-nums text-teal-700 font-semibold"
  }, fmtMoney(b.unitPrice, "HUF"))))), /*#__PURE__*/React.createElement(SlideOver, {
    open: !!cur,
    onClose: () => setOpenId(null),
    title: cur?.supplier,
    subtitle: cur && cur.id + " · " + (PL_STATUS[lang] || PL_STATUS.hu)[cur.status],
    width: 500,
    footer: cur && (cur.status === "Draft" ? /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "check",
      onClick: doActivate
    }, p.activate) : cur.status === "Active" ? /*#__PURE__*/React.createElement(GhostBtn, {
      icon: "x",
      onClick: doExpire
    }, p.expire) : /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setOpenId(null)
    }, "Bez\xE1r"))
  }, cur && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement(Field, {
    label: p.supplier
  }, cur.supplier), /*#__PURE__*/React.createElement(Field, {
    label: "Deviza",
    mono: true
  }, cur.currency), /*#__PURE__*/React.createElement(Field, {
    label: p.validity,
    mono: true
  }, cur.validFrom, " \u2192 ", cur.validTo), /*#__PURE__*/React.createElement(Field, {
    label: "T\xE9telek"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, cur.items.length))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, p.cols.material), /*#__PURE__*/React.createElement("div", {
    className: "border border-stone-200 rounded-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[minmax(0,1.6fr)_110px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 bg-stone-50/60 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement("div", null, p.cols.material), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, p.cols.price)), cur.items.map((it, i) => {
    const best = BEST_PRICES[it.material];
    const isBest = cur.status === "Active" && cur.currency === "HUF" && best && best.listId === cur.id;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "grid grid-cols-[minmax(0,1.6fr)_110px] gap-2 px-3 py-2.5 border-b border-stone-100 last:border-0 items-center text-[11.5px]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-stone-900 truncate flex items-center gap-1.5"
    }, it.material, isBest && /*#__PURE__*/React.createElement("span", {
      className: "text-[9.5px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium"
    }, p.bestPrice)), /*#__PURE__*/React.createElement("div", {
      className: `text-right font-mono tabular-nums ${isBest ? "text-teal-700 font-semibold" : "text-stone-700"}`
    }, fmtMoney(it.unitPrice, cur.currency)));
  }))))));
}

// ════════════════════════════════════════════════════════════════════════════
// Shell — tab bar + role indicator
// ════════════════════════════════════════════════════════════════════════════
function ProcurementV2({
  lang = "hu",
  role = "approver",
  initialTab = "req"
}) {
  const t = PROC2_I18N[lang] || PROC2_I18N.hu;
  const me = PROC_USERS[role] || PROC_USERS.approver;
  const isApprover = role === "approver";
  const simV2 = useSim();
  const [tab, setTab] = useStateP2(initialTab);
  const tabs = [{
    k: "req",
    label: t.tabs.req,
    count: simV2.requisitions.filter(x => x.status === "Draft").length
  }, {
    k: "inv",
    label: t.tabs.inv,
    count: SUPPLIER_INVOICES.filter(x => x.status === "Exception").length
  }, {
    k: "match",
    label: t.tabs.match
  }, {
    k: "price",
    label: t.tabs.price
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mb-5 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-3 h-9 rounded-lg bg-white border border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-6 h-6 rounded-full grid place-items-center text-[10px] font-semibold text-white ${isApprover ? "bg-gradient-to-br from-teal-500 to-teal-700" : "bg-gradient-to-br from-stone-500 to-stone-700"}`
  }, me.initials), /*#__PURE__*/React.createElement("div", {
    className: "leading-tight"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-medium text-stone-800"
  }, me.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-500 font-mono"
  }, me.role)))), tab === "req" && /*#__PURE__*/React.createElement(ReqTab, {
    t: t,
    lang: lang,
    me: me,
    isApprover: isApprover
  }), tab === "inv" && /*#__PURE__*/React.createElement(InvTab, {
    t: t,
    lang: lang,
    me: me,
    isApprover: isApprover
  }), tab === "match" && /*#__PURE__*/React.createElement(MatchTab, {
    t: t,
    lang: lang
  }), tab === "price" && /*#__PURE__*/React.createElement(PriceTab, {
    t: t,
    lang: lang
  }));
}
window.ProcurementV2 = ProcurementV2;

// ── Beszerzési tétel szerkesztő — felvétel / módosítás / archiválás ─────────
// A procCatalog CRUD UI-ja. Forrás-soronként kind (külső szállító / külső munka /
// belső egység) + ár + átfutás; gyűjtő esetén tag-választó. Store: add/update/removeProcItem.
function ProcItemEditor({
  itemId,
  onClose
}) {
  const {
    useState: useStatePE
  } = React;
  const sim = useSim();
  const isNew = itemId === "new";
  const existing = isNew ? null : (sim.procCatalog || []).find(p => p.id === itemId);
  const SRC = window.PROC_SOURCE_META || {};
  const SRC_ORDER = window.PROC_SOURCE_ORDER || ["supplier", "work", "internal_unit"];
  const facilities = window.FACILITIES || [];
  const partners = (sim.partners || []).filter(p => p.platform);
  const supplierNames = (window.SUPPLIERS || []).map(s => s.name);
  const catalogItems = (sim.catalog || []).filter(c => c.active !== false);
  const otherItems = (sim.procCatalog || []).filter(p => p.active !== false && !p.group && p.id !== itemId);
  const [code, setCode] = useStatePE(existing?.code || "");
  const [name, setName] = useStatePE(existing?.name || "");
  const [kind, setKind] = useStatePE(existing?.kind && existing.kind !== "group" ? existing.kind : "material");
  const [unit, setUnit] = useStatePE(existing?.unit || "db");
  const [cat, setCat] = useStatePE(existing?.cat || "Lapanyag");
  const [catalogItemId, setCatalogItemId] = useStatePE(existing?.catalogItemId || "");
  const [group, setGroup] = useStatePE(!!existing?.group);
  const [members, setMembers] = useStatePE(existing?.members ? existing.members.map(m => typeof m === "string" ? m : m.id) : []);
  const [sources, setSources] = useStatePE(existing?.sources && existing.sources.length ? existing.sources.map(s => ({
    kind: s.kind || "supplier",
    name: s.name || "",
    price: s.price ?? "",
    leadDays: s.leadDays ?? "",
    partnerId: s.partnerId || "",
    unitId: s.unitId || ""
  })) : [{
    kind: "supplier",
    name: "",
    price: "",
    leadDays: "",
    partnerId: "",
    unitId: ""
  }]);
  const cats = ["Lapanyag", "Élzáró", "Vasalat", "Külső munka", "Belső egység", "Egyéb"];
  const units = ["tábla", "db", "fm", "m²", "szett", "csomag", "óra", "klt"];
  const kinds = [["material", "Anyag"], ["hardware", "Vasalat"], ["work", "Szolgáltatás"]];
  const addSource = () => setSources(ss => [...ss, {
    kind: "supplier",
    name: "",
    price: "",
    leadDays: "",
    partnerId: "",
    unitId: ""
  }]);
  const removeSource = i => setSources(ss => ss.length > 1 ? ss.filter((_, k) => k !== i) : ss);
  const patchSource = (i, patch) => setSources(ss => ss.map((s, k) => k === i ? {
    ...s,
    ...patch
  } : s));
  const toggleMember = id => setMembers(ms => ms.includes(id) ? ms.filter(x => x !== id) : [...ms, id]);
  const canSave = name.trim() && (!group || members.length > 0);
  const save = () => {
    if (!canSave) {
      window.toast?.(group ? "A gyűjtőhöz válassz legalább egy tagot." : "A megnevezés kötelező.", "error");
      return;
    }
    const cleanSources = sources.map(s => ({
      kind: s.kind,
      name: s.name,
      price: s.price,
      leadDays: s.leadDays,
      ...(s.kind === "work" && s.partnerId ? {
        partnerId: s.partnerId
      } : {}),
      ...(s.kind === "internal_unit" && s.unitId ? {
        unitId: s.unitId
      } : {})
    })).filter(s => (s.name || "").trim());
    const payload = {
      code,
      name,
      kind: group ? "group" : kind,
      unit,
      cat,
      catalogItemId: !group && (kind === "material" || kind === "hardware") ? catalogItemId || null : null,
      group,
      members: group ? members : [],
      sources: cleanSources
    };
    if (isNew) {
      const id = sim.addProcItem(payload);
      if (id) onClose();
    } else {
      sim.updateProcItem(itemId, payload);
      window.toast?.("✓ Beszerzési tétel mentve", "success");
      onClose();
    }
  };
  const archive = () => {
    if (existing) {
      sim.removeProcItem(itemId);
      onClose();
    }
  };
  const SrcRow = ({
    s,
    i
  }) => {
    const meta = SRC[s.kind] || {};
    return /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl border border-stone-200 bg-white p-3 space-y-2.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-0.5 bg-stone-100 rounded-lg p-0.5"
    }, SRC_ORDER.map(k => {
      const m = SRC[k] || {};
      return /*#__PURE__*/React.createElement("button", {
        key: k,
        onClick: () => patchSource(i, {
          kind: k,
          name: "",
          partnerId: "",
          unitId: ""
        }),
        className: "px-2 h-7 rounded-md text-[11px] font-medium transition inline-flex items-center gap-1 " + (s.kind === k ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700")
      }, /*#__PURE__*/React.createElement("span", {
        className: "w-1.5 h-1.5 rounded-full " + (m.dot || "bg-stone-400")
      }), m.hu || k);
    })), sources.length > 1 && /*#__PURE__*/React.createElement("button", {
      onClick: () => removeSource(i),
      className: "w-7 h-7 grid place-items-center rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    }))), s.kind === "supplier" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("input", {
      list: "pe-suppliers",
      value: s.name,
      onChange: e => patchSource(i, {
        name: e.target.value
      }),
      placeholder: "Sz\xE1ll\xEDt\xF3 neve",
      className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500"
    }), /*#__PURE__*/React.createElement("datalist", {
      id: "pe-suppliers"
    }, supplierNames.map(n => /*#__PURE__*/React.createElement("option", {
      key: n,
      value: n
    })))), s.kind === "work" && /*#__PURE__*/React.createElement("select", {
      value: s.partnerId || "",
      onChange: e => {
        const p = partners.find(x => x.id === e.target.value);
        patchSource(i, {
          partnerId: e.target.value,
          name: p ? p.name : ""
        });
      },
      className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "K\xFCls\u0151 munka partner v\xE1laszt\xE1sa\u2026"), partners.map(p => /*#__PURE__*/React.createElement("option", {
      key: p.id,
      value: p.id
    }, p.name, " \u2014 ", p.specialty))), s.kind === "internal_unit" && /*#__PURE__*/React.createElement("select", {
      value: s.unitId || "",
      onChange: e => {
        const f = facilities.find(x => x.id === e.target.value);
        patchSource(i, {
          unitId: e.target.value,
          name: f ? f.name : ""
        });
      },
      className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Bels\u0151 egys\xE9g v\xE1laszt\xE1sa\u2026"), facilities.map(f => /*#__PURE__*/React.createElement("option", {
      key: f.id,
      value: f.id
    }, f.name))), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 gap-2.5"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-400 mb-1"
    }, "Egys\xE9g\xE1r (Ft) \u2014 \xFCres = aj\xE1nlatk\xE9r\xE9s"), /*#__PURE__*/React.createElement("input", {
      value: s.price,
      onChange: e => patchSource(i, {
        price: e.target.value.replace(/[^0-9]/g, "")
      }),
      inputMode: "numeric",
      placeholder: "\u2014",
      className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-400 mb-1"
    }, "\xC1tfut\xE1s (nap)"), /*#__PURE__*/React.createElement("input", {
      value: s.leadDays,
      onChange: e => patchSource(i, {
        leadDays: e.target.value.replace(/[^0-9]/g, "")
      }),
      inputMode: "numeric",
      placeholder: "\u2014",
      className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500"
    }))));
  };
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: true,
    onClose: onClose,
    title: isNew ? "Új beszerzési tétel" : "Tétel szerkesztése",
    subtitle: isNew ? "Külső szállító · külső munka · belső egység" : existing?.code || "",
    width: 560,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, !isNew && /*#__PURE__*/React.createElement("button", {
      onClick: archive,
      className: "mr-auto h-9 px-3 rounded-lg text-[12px] font-medium text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "archive",
      size: 14
    }), "Archiv\xE1l\xE1s"), /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: onClose
    }, "M\xE9gse"), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "check",
      onClick: save
    }, isNew ? "Létrehozás" : "Mentés"))
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, "Megnevez\xE9s"), /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "pl. T\xF6lgy 22mm t\xE1bla",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, "Cikksz\xE1m / k\xF3d"), /*#__PURE__*/React.createElement("input", {
    value: code,
    onChange: e => setCode(e.target.value),
    placeholder: "auto, ha \xFCres",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, "Egys\xE9g"), /*#__PURE__*/React.createElement("select", {
    value: unit,
    onChange: e => setUnit(e.target.value),
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  }, units.map(u => /*#__PURE__*/React.createElement("option", {
    key: u
  }, u))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, "Kateg\xF3ria"), /*#__PURE__*/React.createElement("select", {
    value: cat,
    onChange: e => setCat(e.target.value),
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  }, cats.map(c => /*#__PURE__*/React.createElement("option", {
    key: c
  }, c)))), !group && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, "T\xEDpus"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-0.5 bg-stone-100 rounded-lg p-0.5 h-10"
  }, kinds.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setKind(k),
    className: "flex-1 h-9 rounded-md text-[11.5px] font-medium transition " + (kind === k ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700")
  }, l))))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setGroup(g => !g),
    className: "w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border transition " + (group ? "border-stone-900 bg-stone-50" : "border-stone-200 bg-white hover:border-stone-300")
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900"
  }, "Gy\u0171jt\u0151 cikksz\xE1m"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, "Egy ig\xE9nyl\xE9si erny\u0151 t\xF6bb beszerezhet\u0151 t\xE9tel f\xF6l\xE9 \u2014 ig\xE9nyl\xE9skor a tagok robbant\xE1sa.")), /*#__PURE__*/React.createElement("span", {
    className: "w-10 h-6 rounded-full p-0.5 transition shrink-0 " + (group ? "bg-stone-900" : "bg-stone-300")
  }, /*#__PURE__*/React.createElement("span", {
    className: "block w-5 h-5 rounded-full bg-white transition-transform " + (group ? "translate-x-4" : "")
  }))), group ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, "Tagok (", members.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 divide-y divide-stone-100 max-h-[240px] overflow-y-auto"
  }, otherItems.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-4 text-[12px] text-stone-400 text-center"
  }, "Nincs felvehet\u0151 (nem-gy\u0171jt\u0151) t\xE9tel."), otherItems.map(it => {
    const on = members.includes(it.id);
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => toggleMember(it.id),
      className: "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-stone-50"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-4 h-4 rounded border grid place-items-center shrink-0 " + (on ? "bg-teal-600 border-teal-600 text-white" : "border-stone-300")
    }, on && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 11
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900 truncate"
    }, it.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] font-mono text-stone-400"
    }, it.code, " \xB7 ", it.cat)));
  }))) : kind === "material" || kind === "hardware" ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FormLabel, null, "Rakt\xE1ri t\xE9tel (opcion\xE1lis)"), /*#__PURE__*/React.createElement("select", {
    value: catalogItemId,
    onChange: e => setCatalogItemId(e.target.value),
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Nincs \u2014 standalone (nem rakt\xE1ri)"), catalogItems.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.code, " \u2014 ", c.name))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1"
  }, "Anyag/vasalat a saj\xE1t rakt\xE1ri t\xE9telre mutathat (bev\xE9telez\xE9s ide k\xF6nyvel).")) : null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement(FormLabel, null, group ? "Gyűjtő forrás (informatív)" : "Források"), /*#__PURE__*/React.createElement("button", {
    onClick: addSource,
    className: "text-[11.5px] font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), "Forr\xE1s")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, sources.map((s, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, SrcRow({
    s,
    i
  })))), group && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1.5"
  }, "Gy\u0171jt\u0151n\xE9l a t\xE9nyleges ig\xE9ny a tagok forr\xE1saib\xF3l robban \u2014 ez a sor csak t\xE1j\xE9koztat\xF3."))));
}
window.ProcItemEditor = ProcItemEditor;

// ── Beszerzési katalógus — NEM a globális katalógus! ───────────────────────
// A beszerzés saját törzse: minden, amit külső szállítótól, külső munkából
// (festés/szobrászat/CNC), vagy elszeparált belső egységtől (lakatos üzem)
// kell megigényelni. Forrás-típusonként összehasonlít + igényt indít.
function CatalogPage({
  lang = "hu"
}) {
  const {
    useState: useStateCat
  } = React;
  const sim = useSim();
  const [q, setQ] = useStateCat("");
  const [filterCat, setFilterCat] = useStateCat("Összes");
  const [filterKind, setFilterKind] = useStateCat(null); // source.kind szűrő
  const [openId, setOpenId] = useStateCat(null);
  const [reqQty, setReqQty] = useStateCat(10);
  const [editId, setEditId] = useStateCat(null);
  const SRC = window.PROC_SOURCE_META || {};
  const SRC_ORDER = window.PROC_SOURCE_ORDER || ["supplier", "work", "internal_unit"];
  const items = (sim.procCatalog || []).filter(c => c.active !== false);
  const cats = ["Összes", ...Array.from(new Set(items.map(c => c.cat)))];
  const itemKinds = c => Array.from(new Set((c.sources || []).map(s => s.kind)));
  const filtered = items.filter(c => {
    if (filterCat !== "Összes" && c.cat !== filterCat) return false;
    if (filterKind && !itemKinds(c).includes(filterKind)) return false;
    if (!q) return true;
    const ql = q.toLowerCase();
    const inSrc = (c.sources || []).some(s => (s.name || "").toLowerCase().includes(ql));
    return c.name.toLowerCase().includes(ql) || (c.code || "").toLowerCase().includes(ql) || (c.cat || "").toLowerCase().includes(ql) || inSrc;
  });
  const toggleRow = c => {
    const wasOpen = openId === c.id;
    setOpenId(wasOpen ? null : c.id);
    if (!wasOpen) setReqQty(10);
  };
  const createReq = (c, s) => {
    const id = sim.requisitionFromProc(c.id, s, Number(reqQty) || 0);
    if (id) setOpenId(null);
  };
  // legolcsóbb forrás ára egy soron (null-okat kihagyva)
  const minPrice = c => {
    const ps = (c.sources || []).map(s => s.price).filter(p => p != null);
    return ps.length ? Math.min(...ps) : null;
  };
  const KindChip = ({
    kind
  }) => {
    const m = SRC[kind] || {};
    return /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded-full border font-medium " + (m.chip || "bg-stone-100 text-stone-600 border-stone-200")
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-1.5 h-1.5 rounded-full " + (m.dot || "bg-stone-400")
    }), m.hu || kind);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-end justify-between gap-3 mb-1"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[18px] font-semibold text-stone-900 tracking-tight"
  }, "Beszerz\xE9si katal\xF3gus"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500"
  }, "K\xFCls\u0151 sz\xE1ll\xEDt\xF3 \xB7 k\xFCls\u0151 munka \xB7 bels\u0151 egys\xE9g \u2014 minden, amit megig\xE9nyel\xFCnk")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditId("new"),
    className: "shrink-0 h-9 px-3.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium hover:bg-stone-800 inline-flex items-center gap-1.5 shadow-sm"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), "\xDAj t\xE9tel")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 mb-4 flex items-start gap-1.5 max-w-[640px]"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 12,
    className: "mt-0.5 shrink-0"
  }), " Ez nem a c\xE9g term\xE9k-katal\xF3gusa. Itt csak a beszerezhet\u0151 t\xE9telek vannak \u2014 forr\xE1sonk\xE9nt \xE1r- \xE9s \xE1tfut\xE1s-\xF6sszehasonl\xEDt\xE1ssal, k\xF6zvetlen ig\xE9ny-ind\xEDt\xE1ssal."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white border border-stone-200 text-stone-500 w-full sm:w-[240px]"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Keres\xE9s t\xE9tel, k\xF3d, forr\xE1s\u2026",
    className: "bg-transparent outline-none text-[12px] flex-1 placeholder:text-stone-400"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-0.5 bg-white border border-stone-200 rounded-lg p-0.5 overflow-x-auto"
  }, cats.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => setFilterCat(c),
    className: "px-2.5 h-7 rounded-md text-[11.5px] font-medium transition whitespace-nowrap " + (filterCat === c ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100")
  }, c)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap mb-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mr-0.5"
  }, "Forr\xE1s"), SRC_ORDER.map(k => {
    const m = SRC[k] || {};
    const on = filterKind === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setFilterKind(on ? null : k),
      className: "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-medium border transition " + (on ? "bg-stone-900 border-stone-900 text-white" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300")
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-1.5 h-1.5 rounded-full " + (m.dot || "bg-stone-400")
    }), m.hu || k);
  }), filterKind && /*#__PURE__*/React.createElement("button", {
    onClick: () => setFilterKind(null),
    className: "text-[11px] text-stone-400 hover:text-stone-600 underline ml-1"
  }, "t\xF6rl\xE9s")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-stone-200 rounded-xl overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[120px_minmax(0,2fr)_90px_70px_90px_minmax(0,1.4fr)] gap-3 px-5 py-2.5 text-[10px] uppercase tracking-wide text-stone-500 font-medium bg-stone-50/60 border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("div", null, "K\xF3d"), /*#__PURE__*/React.createElement("div", null, "Megnevez\xE9s"), /*#__PURE__*/React.createElement("div", null, "Kateg\xF3ria"), /*#__PURE__*/React.createElement("div", null, "Egys\xE9g"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Legjobb \xE1r"), /*#__PURE__*/React.createElement("div", null, "Forr\xE1sok")), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-10 text-center text-[12.5px] text-stone-400"
  }, "Nincs tal\xE1lat a sz\u0171r\u0151kre."), filtered.map(c => {
    const mp = minPrice(c);
    const kinds = itemKinds(c);
    return /*#__PURE__*/React.createElement("div", {
      key: c.id,
      className: "border-b border-stone-100 last:border-0"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => toggleRow(c),
      className: "w-full text-left hidden md:grid grid-cols-[120px_minmax(0,2fr)_90px_70px_90px_minmax(0,1.4fr)] gap-3 px-5 py-3 items-center hover:bg-stone-50/60"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-mono text-stone-500 truncate"
    }, c.code), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12.5px] font-medium text-stone-900 truncate"
    }, c.name), c.group && /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] px-1.5 py-0.5 rounded-full bg-stone-900 text-white font-medium shrink-0"
    }, "Gy\u0171jt\u0151"))), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-500"
    }, c.cat), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-500"
    }, c.unit), /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-mono text-stone-700 text-right"
    }, mp != null ? fmtHUF(mp) : "ajánlatkérés"), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 flex-wrap"
    }, kinds.map(k => /*#__PURE__*/React.createElement(KindChip, {
      key: k,
      kind: k
    })), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-stone-400 ml-0.5"
    }, "\xB7 ", (c.sources || []).length, " forr\xE1s"))), openId === c.id && (() => {
      const srcs = c.sources || [];
      const priced = srcs.map(s => s.price).filter(p => p != null);
      const best = priced.length ? Math.min(...priced) : null;
      const leads = srcs.map(s => s.leadDays).filter(p => p != null);
      const fastest = leads.length ? Math.min(...leads) : null;
      const qtyVal = Number(reqQty) || 0;
      return /*#__PURE__*/React.createElement("div", {
        className: "px-4 md:px-5 pb-4 pt-3 bg-stone-50/40 border-t border-stone-100"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between gap-3 mb-2.5 flex-wrap"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
      }, "Forr\xE1sok \xB7 \xE1r- \xE9s \xE1tfut\xE1s-\xF6sszehasonl\xEDt\xE1s"), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-2"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-[11px] text-stone-500"
      }, "Ig\xE9nyelt mennyis\xE9g"), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-0.5 bg-white border border-stone-200 rounded-lg p-0.5"
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setReqQty(q => Math.max(0, (Number(q) || 0) - 5)),
        className: "w-9 h-9 sm:w-7 sm:h-7 rounded-md grid place-items-center text-stone-600 hover:bg-stone-100 text-[16px] leading-none"
      }, "\u2212"), /*#__PURE__*/React.createElement("input", {
        value: qtyVal,
        onChange: e => setReqQty(e.target.value.replace(/[^0-9]/g, "")),
        inputMode: "numeric",
        className: "w-12 text-center bg-transparent outline-none text-[12.5px] font-mono font-semibold text-stone-900"
      }), /*#__PURE__*/React.createElement("button", {
        onClick: () => setReqQty(q => (Number(q) || 0) + 5),
        className: "w-9 h-9 sm:w-7 sm:h-7 rounded-md grid place-items-center text-stone-600 hover:bg-stone-100 text-[16px] leading-none"
      }, "+")), /*#__PURE__*/React.createElement("span", {
        className: "text-[11.5px] text-stone-500"
      }, c.unit))), c.group && (() => {
        const mems = (c.members || []).map(m => typeof m === "string" ? m : m.id).map(id => (sim.procCatalog || []).find(p => p.id === id)).filter(Boolean);
        return /*#__PURE__*/React.createElement("div", {
          className: "mb-2.5 rounded-lg border border-stone-200 bg-white px-3 py-2.5"
        }, /*#__PURE__*/React.createElement("div", {
          className: "text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-1.5"
        }, "Gy\u0171jt\u0151 tagjai (", mems.length, ") \u2014 ig\xE9nyl\xE9skor robbantva"), /*#__PURE__*/React.createElement("div", {
          className: "flex flex-wrap gap-1.5"
        }, mems.map(m => /*#__PURE__*/React.createElement("span", {
          key: m.id,
          className: "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200"
        }, m.name)), mems.length === 0 && /*#__PURE__*/React.createElement("span", {
          className: "text-[11px] text-stone-400"
        }, "Nincs tag megadva.")));
      })(), /*#__PURE__*/React.createElement("div", {
        className: "rounded-lg border border-stone-200 overflow-hidden bg-white"
      }, /*#__PURE__*/React.createElement("div", {
        className: "hidden sm:grid grid-cols-[minmax(0,2fr)_130px_100px_90px_minmax(0,1fr)_108px] gap-2 px-4 py-2 bg-stone-50/70 text-[10px] uppercase tracking-wide text-stone-500 font-medium border-b border-stone-100"
      }, /*#__PURE__*/React.createElement("div", null, "Forr\xE1s"), /*#__PURE__*/React.createElement("div", {
        className: "text-right"
      }, "Egys\xE9g\xE1r"), /*#__PURE__*/React.createElement("div", {
        className: "text-right"
      }, "Elt\xE9r\xE9s"), /*#__PURE__*/React.createElement("div", {
        className: "text-right"
      }, "\xC1tfut\xE1s"), /*#__PURE__*/React.createElement("div", {
        className: "text-right"
      }, "Sor\xF6sszeg"), /*#__PURE__*/React.createElement("div", null)), srcs.map((s, i) => {
        const hasPrice = s.price != null;
        const isBest = hasPrice && best != null && s.price === best;
        const isFastest = s.leadDays != null && fastest != null && s.leadDays === fastest && srcs.length > 1;
        const delta = hasPrice && best != null ? s.price - best : null;
        return /*#__PURE__*/React.createElement("div", {
          key: i,
          className: "px-4 py-3 border-b border-stone-100 last:border-0 " + (isBest ? "bg-emerald-50/40" : "")
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex flex-col gap-2.5 sm:grid sm:grid-cols-[minmax(0,2fr)_130px_100px_90px_minmax(0,1fr)_108px] sm:gap-2 sm:items-center"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-1.5 flex-wrap"
        }, /*#__PURE__*/React.createElement(KindChip, {
          kind: s.kind
        }), /*#__PURE__*/React.createElement("span", {
          className: "text-[12.5px] font-medium text-stone-900"
        }, s.name), isBest && /*#__PURE__*/React.createElement("span", {
          className: "text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium shrink-0"
        }, "Legjobb \xE1r"), isFastest && !isBest && /*#__PURE__*/React.createElement("span", {
          className: "text-[9px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium shrink-0"
        }, "Leggyorsabb")), /*#__PURE__*/React.createElement("div", {
          className: "flex items-center justify-between sm:block sm:text-right"
        }, /*#__PURE__*/React.createElement("span", {
          className: "sm:hidden text-[10.5px] uppercase tracking-wide text-stone-400"
        }, "Egys\xE9g\xE1r"), /*#__PURE__*/React.createElement("span", {
          className: "font-mono text-[12px] font-semibold text-stone-900"
        }, hasPrice ? fmtHUF(s.price) : "ajánlatkérés")), /*#__PURE__*/React.createElement("div", {
          className: "flex items-center justify-between sm:block sm:text-right"
        }, /*#__PURE__*/React.createElement("span", {
          className: "sm:hidden text-[10.5px] uppercase tracking-wide text-stone-400"
        }, "Elt\xE9r\xE9s a legjobbt\xF3l"), /*#__PURE__*/React.createElement("span", {
          className: "font-mono text-[11.5px] " + (delta === 0 ? "text-emerald-600 font-medium" : "text-stone-500")
        }, delta == null ? "—" : delta === 0 ? "—" : "+" + fmtHUF(delta))), /*#__PURE__*/React.createElement("div", {
          className: "flex items-center justify-between sm:block sm:text-right"
        }, /*#__PURE__*/React.createElement("span", {
          className: "sm:hidden text-[10.5px] uppercase tracking-wide text-stone-400"
        }, "\xC1tfut\xE1s"), /*#__PURE__*/React.createElement("span", {
          className: "font-mono text-[11.5px] text-stone-600"
        }, s.leadDays != null ? s.leadDays + " nap" : "—")), /*#__PURE__*/React.createElement("div", {
          className: "flex items-center justify-between sm:block sm:text-right"
        }, /*#__PURE__*/React.createElement("span", {
          className: "sm:hidden text-[10.5px] uppercase tracking-wide text-stone-400"
        }, "Sor\xF6sszeg (", qtyVal, " ", c.unit, ")"), /*#__PURE__*/React.createElement("span", {
          className: "font-mono text-[12px] text-stone-700"
        }, qtyVal > 0 && hasPrice ? fmtHUF(qtyVal * s.price) : "—")), /*#__PURE__*/React.createElement("button", {
          onClick: () => createReq(c, s),
          className: "h-11 sm:h-8 px-3 rounded-lg text-[11.5px] font-medium inline-flex items-center justify-center gap-1.5 transition w-full sm:w-auto " + (isBest ? "bg-teal-600 text-white hover:bg-teal-700" : "border border-stone-200 text-stone-700 hover:bg-stone-50")
        }, /*#__PURE__*/React.createElement(Icon, {
          name: "plus",
          size: 12
        }), "Ig\xE9ny")));
      })), /*#__PURE__*/React.createElement("div", {
        className: "mt-2 flex items-center justify-between gap-3 flex-wrap"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-[11px] text-stone-400 flex items-start gap-1.5 min-w-[200px] flex-1"
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "box",
        size: 12,
        className: "mt-0.5 shrink-0"
      }), " Az \u201EIg\xE9ny\u201D gomb v\xE1zlat beszerz\xE9si ig\xE9nyt hoz l\xE9tre a kiv\xE1lasztott forr\xE1ssal ", c.group ? "— a gyűjtő tagjait szétrobbantva" : "— a Beszerzés → Igénylések közé kerül", ", onnan j\xF3v\xE1hagy\xE1s ut\xE1n megrendel\xE9ss\xE9 alak\xEDthat\xF3."), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-1.5 shrink-0"
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setEditId(c.id),
        className: "h-8 px-3 rounded-lg border border-stone-200 bg-white text-stone-700 text-[11.5px] font-medium hover:bg-stone-50 inline-flex items-center gap-1.5"
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "settings",
        size: 13
      }), "Szerkeszt\xE9s"), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          if (window.confirm(`Archiválod: ${c.name}?`)) sim.removeProcItem(c.id);
        },
        className: "h-8 px-3 rounded-lg border border-stone-200 bg-white text-stone-500 text-[11.5px] font-medium hover:text-rose-600 hover:border-rose-200 inline-flex items-center gap-1.5"
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "archive",
        size: 13
      }), "Archiv\xE1l\xE1s"))));
    })(), /*#__PURE__*/React.createElement("button", {
      onClick: () => toggleRow(c),
      className: "md:hidden w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-stone-50/60"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[13.5px] font-medium text-stone-900 truncate"
    }, c.name), c.group && /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] px-1.5 py-0.5 rounded-full bg-stone-900 text-white font-medium shrink-0"
    }, "Gy\u0171jt\u0151")), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-mono text-stone-400 mt-0.5 mb-1.5"
    }, c.code, " \xB7 ", c.cat), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 flex-wrap"
    }, kinds.map(k => /*#__PURE__*/React.createElement(KindChip, {
      key: k,
      kind: k
    })))), /*#__PURE__*/React.createElement("div", {
      className: "text-right shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-semibold text-stone-900 font-mono"
    }, mp != null ? fmtHUF(mp) : "—"), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400"
    }, (c.sources || []).length, " forr\xE1s"))));
  })), editId && /*#__PURE__*/React.createElement(ProcItemEditor, {
    itemId: editId,
    onClose: () => setEditId(null)
  }));
}
window.CatalogPage = CatalogPage;
})();
