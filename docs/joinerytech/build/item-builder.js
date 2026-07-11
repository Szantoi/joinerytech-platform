/* AUTO-GENERATED from item-builder.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// item-builder.jsx — reusable "click-to-assemble" line-item builder.
//
//   The webshop's click-to-assemble pattern, generalised into one component
//   used by two flows:
//     • Ajánlat (quote)      — source: own article-number catalogue + finished
//                              products, picked into quote lines.
//     • Beszerzés (request)  — source: partner/supplier catalogue, grouped by
//                              supplier, picked into purchase-request lines.
//
//   Both support custom one-off items and services (manual entry). Pricing is
//   shown net + VAT + gross. On submit the assembled lines are handed back via
//   onSubmit(payload) so the caller can create a quote (store) or PR rows.
//
//   <ItemBuilder mode="quote|procurement" catalog={[…]} groupBy="cat|supplier"
//     onClose onSubmit />
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateIB,
  useMemo: useMemoIB
} = React;
const IB_VAT_DEFAULT = 27;
const ibhuf = n => Math.round(n).toLocaleString("hu-HU") + " Ft";
const lineKey = (() => {
  let n = 0;
  return () => "ln-" + ++n + "-" + Date.now().toString(36);
})();
function ItemBuilder({
  mode = "quote",
  catalog = [],
  customers = [],
  onAddCustomer,
  groupBy = "cat",
  onClose,
  onSubmit,
  initialLines = null,
  initialHeader = "",
  title = null,
  subtitle = null,
  submitLabel = null,
  lockHeader = false,
  enableDiscounts = true
}) {
  const isQuote = mode === "quote";
  const [lines, setLines] = useStateIB(() => initialLines && initialLines.length ? initialLines.map(l => ({
    key: lineKey(),
    vat: IB_VAT_DEFAULT,
    ...l
  })) : []);
  const [q, setQ] = useStateIB("");
  const [group, setGroup] = useStateIB("Összes");
  const [header, setHeader] = useStateIB(initialHeader || ""); // customer (quote) / requester note (proc)
  const [listOpen, setListOpen] = useStateIB(false); // mobile summary sheet
  const [customOpen, setCustomOpen] = useStateIB(false);
  const [adHocDisc, setAdHocDisc] = useStateIB(0); // eseti kedvezmény %
  const [designOpen, setDesignOpen] = useStateIB(false);
  const [configOpen, setConfigOpen] = useStateIB(false);
  const [custPickerOpen, setCustPickerOpen] = useStateIB(false);
  const selectedCustomer = useMemoIB(() => customers.find(c => c.name === header) || null, [customers, header]);
  const groups = useMemoIB(() => {
    const key = groupBy === "supplier" ? "supplier" : "cat";
    return ["Összes", ...Array.from(new Set(catalog.map(c => c[key])))];
  }, [catalog, groupBy]);
  const filtered = useMemoIB(() => {
    const key = groupBy === "supplier" ? "supplier" : "cat";
    const needle = q.trim().toLowerCase();
    return catalog.filter(c => c.active !== false && (group === "Összes" || c[key] === group) && (!needle || c.name.toLowerCase().includes(needle) || (c.code || "").toLowerCase().includes(needle) || Object.values(c.props || {}).some(v => String(v).toLowerCase().includes(needle)) || (c.tags || []).some(t => t.toLowerCase().includes(needle))));
  }, [catalog, q, group, groupBy]);
  const addCatalog = c => {
    setLines(ls => {
      const ex = ls.find(l => l.code === c.code && !l.custom);
      if (ex) return ls.map(l => l === ex ? {
        ...l,
        qty: l.qty + 1
      } : l);
      const cost = c.cost != null ? c.cost : window.MarginUtil ? window.MarginUtil.costOf({
        price: c.price
      }) : undefined;
      return [...ls, {
        key: lineKey(),
        name: c.name,
        code: c.code,
        unit: c.unit,
        price: c.price,
        cost,
        qty: 1,
        vat: IB_VAT_DEFAULT,
        supplier: c.supplier
      }];
    });
  };
  const setQty = (key, qty) => setLines(ls => qty <= 0 ? ls.filter(l => l.key !== key) : ls.map(l => l.key === key ? {
    ...l,
    qty
  } : l));
  const setLine = (key, patch) => setLines(ls => ls.map(l => l.key === key ? {
    ...l,
    ...patch
  } : l));
  const addCustom = item => setLines(ls => [...ls, {
    key: lineKey(),
    custom: true,
    ...item
  }]);
  const net = lines.reduce((n, l) => n + l.price * l.qty, 0);
  const vat = lines.reduce((n, l) => n + l.price * l.qty * (l.vat / 100), 0);
  const gross = net + vat;
  const count = lines.reduce((n, l) => n + l.qty, 0);

  // BELSŐ fedezet (csak belső + reseller nézet) + ajánlat-szintű egységes árrés
  const showMargin = !!(window.MarginUtil && window.MarginUtil.canSee());
  const applyUniformMargin = pct => setLines(ls => ls.map(l => {
    const cost = window.MarginUtil ? window.MarginUtil.costOf(l) : l.cost;
    return {
      ...l,
      cost,
      price: window.MarginUtil.sellFromCost(cost, pct)
    };
  }));

  // KEDVEZMÉNYEK — partner-állandó (header alapján, automatikus) + eseti (kézi)
  const M = window.MarginUtil;
  const partnerDisc = enableDiscounts && isQuote && M ? M.partnerDiscountPct(header.trim(), null) : 0;
  const partner = enableDiscounts && isQuote && M ? M.partnerByName(header.trim()) : null;
  const discPct = Math.max(0, Math.min(95, (partnerDisc || 0) + (Number(adHocDisc) || 0)));
  const discFactor = 1 - discPct / 100;
  const discNet = Math.round(net * discFactor);
  const discVat = Math.round(vat * discFactor);
  const discGross = discNet + discVat;
  const canSubmit = lines.length > 0 && (!isQuote || header.trim());
  const submit = () => {
    if (!canSubmit) return;
    // kedvezmény beépítése a tételi árakba (önköltség változatlan → fedezet csökken)
    const outLines = discPct > 0 ? lines.map(l => ({
      ...l,
      price: Math.round(l.price * discFactor),
      listPrice: l.price,
      discountPct: discPct
    })) : lines;
    onSubmit({
      header: header.trim(),
      lines: outLines,
      net: discNet,
      vat: discVat,
      gross: discGross,
      discountPct: discPct,
      partnerName: partner ? partner.name : null
    });
  };

  // Lock background (body) scroll while the full-screen builder is open
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[65] flex flex-col bg-stone-50",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("header", {
    className: "shrink-0 bg-white border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1180px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100",
    "aria-label": "Bez\xE1r\xE1s"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 17,
    className: "rotate-180"
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 leading-tight"
  }, title || (isQuote ? "Új ajánlat összeállítása" : "Új beszerzési igény")), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 leading-tight"
  }, subtitle || (isQuote ? "Saját cikkszámok, termékek és egyedi tételek" : "Szállítói kínálatból, egyedi tétellel"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setListOpen(true),
    className: "md:hidden relative inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-stone-900 text-white text-[12.5px] font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "box",
    size: 15
  }), " ", count))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-h-0 max-w-[1180px] w-full mx-auto flex flex-col md:grid md:grid-cols-[1fr_380px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4"
  }, isQuote && /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "\xDCgyf\xE9l ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-500"
  }, "*")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCustPickerOpen(true),
    className: `w-full h-12 px-3 rounded-lg border text-left flex items-center gap-3 transition ${selectedCustomer ? "border-stone-300 bg-white" : "border-stone-200 bg-white hover:border-teal-400"}`
  }, selectedCustomer ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-full bg-teal-100 text-teal-700 grid place-items-center text-[12px] font-semibold shrink-0"
  }, selectedCustomer.name.slice(0, 1)), /*#__PURE__*/React.createElement("span", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block text-[13px] font-medium text-stone-900 truncate leading-tight"
  }, selectedCustomer.name), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-stone-400 truncate leading-tight"
  }, [selectedCustomer.city, selectedCustomer.contact].filter(Boolean).join(" · ") || selectedCustomer.id)), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-teal-600 font-medium shrink-0"
  }, "M\xF3dos\xEDt\xE1s")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-full bg-stone-100 text-stone-400 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    className: "flex-1 text-[13px] text-stone-400"
  }, "V\xE1lassz \xFCgyfelet a list\xE1b\xF3l\u2026"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 15,
    className: "text-stone-300 rotate-90 shrink-0"
  })))), isQuote && window.DesignItemWizard && /*#__PURE__*/React.createElement("button", {
    onClick: () => setDesignOpen(true),
    className: "w-full mb-3 p-3 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white flex items-center gap-3 text-left hover:border-violet-300 hover:shadow-sm transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-9 h-9 rounded-lg bg-violet-600 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ruler",
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block text-[12.5px] font-semibold text-stone-900"
  }, "Tervezett b\xFAtor hozz\xE1ad\xE1sa"), /*#__PURE__*/React.createElement("span", {
    className: "block text-[10.5px] text-stone-500 leading-snug"
  }, "Egyedi vagy katal\xF3gus alap\xFA tervez\xE9s \xB7 ig\xE9ny + st\xEDlus alapj\xE1n becs\xFClt \xE1r")), /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16,
    className: "text-violet-500 shrink-0"
  })), isQuote && window.ConfigEvaluator && /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfigOpen(true),
    className: "w-full mb-3 p-3 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white flex items-center gap-3 text-left hover:border-teal-300 hover:shadow-sm transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-9 h-9 rounded-lg bg-teal-600 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block text-[12.5px] font-semibold text-stone-900"
  }, "Konfigur\xE1ci\xF3 hozz\xE1ad\xE1sa"), /*#__PURE__*/React.createElement("span", {
    className: "block text-[10.5px] text-stone-500 leading-snug"
  }, "St\xEDlus + m\u0171szaki kiv\xE1laszt\xE1sa, sablonok beh\xFAz\xE1sa \xB7 \xE1rmotor \xE1ltal ki\xE9rt\xE9kelt \xE1r")), /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16,
    className: "text-teal-500 shrink-0"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-3 h-9 flex-1 rounded-lg bg-white border border-stone-200 text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Keres\xE9s n\xE9v, cikksz\xE1m, tulajdons\xE1g, c\xEDmke\u2026",
    className: "bg-transparent outline-none text-[12.5px] flex-1 min-w-0 placeholder:text-stone-400"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCustomOpen(true),
    className: "shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-300 text-stone-700 text-[12.5px] font-medium hover:bg-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), " Egyedi")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1"
  }, groups.map(g => /*#__PURE__*/React.createElement("button", {
    key: g,
    onClick: () => setGroup(g),
    className: `px-3 h-7 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 transition ${group === g ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"}`
  }, g))), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-2"
  }, filtered.map(c => {
    const inList = lines.find(l => l.code === c.code && !l.custom);
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: () => addCatalog(c),
      className: "text-left bg-white rounded-xl border border-stone-200 p-3 hover:border-teal-300 hover:shadow-sm transition flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900 truncate"
    }, c.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 font-mono truncate"
    }, c.code, " \xB7 ", groupBy === "supplier" ? c.cat : c.supplier), /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-semibold text-stone-800 tabular-nums mt-0.5"
    }, ibhuf(c.price), " ", /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-normal text-stone-400"
    }, "/ ", c.unit))), /*#__PURE__*/React.createElement("span", {
      className: `w-8 h-8 grid place-items-center rounded-lg shrink-0 ${inList ? "bg-teal-600 text-white" : "bg-stone-100 text-stone-600"}`
    }, inList ? /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] font-bold tabular-nums"
    }, inList.qty) : /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16
    })));
  }), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "col-span-full px-3 py-10 text-center text-[12.5px] text-stone-400"
  }, "Nincs tal\xE1lat."))), /*#__PURE__*/React.createElement(SummaryPane, {
    desktop: true,
    lines: lines,
    setQty: setQty,
    setLine: setLine,
    net: net,
    vat: vat,
    gross: gross,
    isQuote: isQuote,
    canSubmit: canSubmit,
    onSubmit: submit,
    submitLabel: submitLabel,
    showMargin: showMargin,
    applyUniformMargin: applyUniformMargin,
    enableDiscounts: enableDiscounts && isQuote,
    partnerDisc: partnerDisc,
    partner: partner,
    adHocDisc: adHocDisc,
    setAdHocDisc: setAdHocDisc,
    discPct: discPct,
    discNet: discNet,
    discVat: discVat,
    discGross: discGross
  })), listOpen && /*#__PURE__*/React.createElement("div", {
    className: "md:hidden fixed inset-0 z-[66]"
  }, /*#__PURE__*/React.createElement("button", {
    className: "absolute inset-0 bg-stone-900/30",
    onClick: () => setListOpen(false),
    "aria-label": "Bez\xE1r\xE1s"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl max-h-[86vh] flex flex-col animate-[chSlide_.22s_ease-out]",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom),0px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pt-2 pb-1 grid place-items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-9 h-1 rounded-full bg-stone-300"
  })), /*#__PURE__*/React.createElement(SummaryPane, {
    lines: lines,
    setQty: setQty,
    setLine: setLine,
    net: net,
    vat: vat,
    gross: gross,
    isQuote: isQuote,
    canSubmit: canSubmit,
    onSubmit: () => {
      setListOpen(false);
      submit();
    },
    onClose: () => setListOpen(false),
    submitLabel: submitLabel,
    showMargin: showMargin,
    applyUniformMargin: applyUniformMargin,
    enableDiscounts: enableDiscounts && isQuote,
    partnerDisc: partnerDisc,
    partner: partner,
    adHocDisc: adHocDisc,
    setAdHocDisc: setAdHocDisc,
    discPct: discPct,
    discNet: discNet,
    discVat: discVat,
    discGross: discGross
  }))), customOpen && /*#__PURE__*/React.createElement(CustomItemDialog, {
    onClose: () => setCustomOpen(false),
    onAdd: it => {
      addCustom(it);
      setCustomOpen(false);
    }
  }), designOpen && /*#__PURE__*/React.createElement(DesignItemWizard, {
    onClose: () => setDesignOpen(false),
    onAdd: line => addCustom(line)
  }), configOpen && window.ConfigEvaluator && /*#__PURE__*/React.createElement(ConfigEvaluator, {
    onClose: () => setConfigOpen(false),
    onAdd: line => addCustom(line)
  }), custPickerOpen && /*#__PURE__*/React.createElement(CustomerPickerDialog, {
    customers: customers,
    selectedName: header,
    onPick: name => {
      setHeader(name);
      setCustPickerOpen(false);
    },
    onAddCustomer: onAddCustomer,
    onClose: () => setCustPickerOpen(false)
  }));
}
function SummaryPane({
  desktop,
  lines,
  setQty,
  setLine,
  net,
  vat,
  gross,
  isQuote,
  canSubmit,
  onSubmit,
  onClose,
  submitLabel,
  showMargin,
  applyUniformMargin,
  enableDiscounts,
  partnerDisc,
  partner,
  adHocDisc,
  setAdHocDisc,
  discPct,
  discNet,
  discVat,
  discGross
}) {
  const M = window.MarginUtil;
  const mt = showMargin && M ? M.totals(lines) : null;
  const dFactor = 1 - (discPct || 0) / 100;
  const discSell = mt ? Math.round(mt.sell * dFactor) : 0;
  const discProfit = mt ? discSell - mt.cost : 0;
  const discMpct = mt && mt.cost > 0 ? (discSell / mt.cost - 1) * 100 : 0;
  const tone = mt ? M.tone(discMpct) : null;
  const hasDisc = enableDiscounts && discPct > 0;
  return /*#__PURE__*/React.createElement("div", {
    className: `flex flex-col min-h-0 ${desktop ? "hidden md:flex border-l border-stone-200 bg-white" : "flex-1"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-100 flex items-center justify-between shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "T\xE9telek ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-normal"
  }, "(", lines.length, ")")), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-3 space-y-2"
  }, lines.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-10 text-center text-[12.5px] text-stone-400"
  }, "Kattintson a katal\xF3gusb\xF3l, vagy adjon hozz\xE1 egyedi t\xE9telt."), lines.map(l => /*#__PURE__*/React.createElement(LineRow, {
    key: l.key,
    l: l,
    setQty: setQty,
    setLine: setLine,
    showMargin: showMargin
  }))), enableDiscounts && lines.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-t border-stone-200 bg-emerald-50/30 shrink-0 space-y-2"
  }, partner && (partnerDisc || 0) > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 text-emerald-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), "Partner-kedvezm\xE9ny \xB7 ", partner.name), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums font-semibold text-emerald-700"
  }, "\u2212", partnerDisc, "%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-600"
  }, "Eseti kedvezm\xE9ny"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center h-7 w-20 px-2 rounded-lg border border-stone-200 bg-white focus-within:border-emerald-400"
  }, /*#__PURE__*/React.createElement("input", {
    value: adHocDisc || "",
    onChange: e => setAdHocDisc(Math.max(0, Math.min(95, Number(e.target.value.replace(/[^0-9]/g, "")) || 0))),
    inputMode: "numeric",
    placeholder: "0",
    className: "w-full min-w-0 text-[12px] tabular-nums bg-transparent outline-none text-right"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 pl-1"
  }, "%")))), mt && lines.length > 0 && /*#__PURE__*/React.createElement(MarginSummary, {
    mt: mt,
    tone: tone,
    applyUniformMargin: applyUniformMargin,
    discPct: discPct,
    discSell: discSell,
    discProfit: discProfit,
    discMpct: discMpct
  }), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-t border-stone-200 bg-stone-50/70 shrink-0 space-y-1.5",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom),12px)"
    }
  }, hasDisc && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11px] text-stone-400"
  }, /*#__PURE__*/React.createElement("span", null, "List\xE1\xE1r (nett\xF3)"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums line-through"
  }, ibhuf(net))), hasDisc && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11px] text-emerald-700"
  }, /*#__PURE__*/React.createElement("span", null, "Kedvezm\xE9ny \u2212", discPct, "%"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, "\u2212", ibhuf(net - discNet))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[12px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", null, "Nett\xF3", hasDisc ? " (kedvezményes)" : ""), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, ibhuf(hasDisc ? discNet : net))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[12px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", null, "\xC1FA"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, ibhuf(hasDisc ? discVat : vat))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[15px] font-semibold text-stone-900"
  }, /*#__PURE__*/React.createElement("span", null, "Brutt\xF3"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, ibhuf(hasDisc ? discGross : gross))), /*#__PURE__*/React.createElement("button", {
    onClick: onSubmit,
    disabled: !canSubmit,
    className: "w-full h-11 mt-1.5 rounded-xl bg-teal-600 text-white text-[13.5px] font-semibold hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16
  }), " ", submitLabel || (isQuote ? "Ajánlat létrehozása" : "Igény beküldése"))));
}

// BELSŐ fedezet-összegző + ajánlat-szintű egységes árrés alkalmazása
function MarginSummary({
  mt,
  tone,
  applyUniformMargin,
  discPct,
  discSell,
  discProfit,
  discMpct
}) {
  const M = window.MarginUtil;
  const [open, setOpen] = useStateIB(false);
  const [pct, setPct] = useStateIB(() => Math.round(mt.pct) || M.defaultPct());
  const hasDisc = (discPct || 0) > 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-t border-stone-200 bg-amber-50/40 shrink-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    className: "w-full flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-amber-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 11
  }), " Bels\u0151 \u2014 fedezet", hasDisc ? " (kedvezmény után)" : ""), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10.5px] font-semibold ${tone.bg} ${tone.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
  }), M.fmtPct(discMpct)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13,
    className: `text-amber-500 transition-transform ${open ? "-rotate-90" : "rotate-90"}`
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mt-1.5 text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, "Fedezet (profit)"), /*#__PURE__*/React.createElement("span", {
    className: `tabular-nums font-semibold ${tone.fg}`
  }, M.fmtHuf(discProfit))), open && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 pt-2 border-t border-amber-100 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, "\xD6nk\xF6lts\xE9g (nett\xF3)"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums text-stone-700"
  }, M.fmtHuf(mt.cost))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, "List\xE1\xE1r / elad\xE1si (nett\xF3)"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums text-stone-700"
  }, M.fmtHuf(mt.sell))), hasDisc && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, "Kedvezm\xE9nyes elad\xE1si"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums text-stone-700"
  }, M.fmtHuf(discSell))), /*#__PURE__*/React.createElement("div", {
    className: "pt-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mb-1"
  }, "Aj\xE1nlat-szint\u0171 egys\xE9ges \xE1rr\xE9s (list\xE1\xE1r)"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center h-8 px-2 rounded-lg border border-stone-200 bg-white flex-1"
  }, /*#__PURE__*/React.createElement("input", {
    value: pct,
    onChange: e => setPct(e.target.value.replace(/[^0-9]/g, "")),
    inputMode: "numeric",
    className: "w-full min-w-0 text-[12px] tabular-nums bg-transparent outline-none text-right"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400 pl-1"
  }, "%")), /*#__PURE__*/React.createElement("button", {
    onClick: () => applyUniformMargin(Number(pct) || 0),
    className: "h-8 px-3 rounded-lg text-[11.5px] font-medium bg-amber-600 text-white hover:bg-amber-700 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bolt",
    size: 13
  }), "Alkalmaz mindenre")), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-1"
  }, "Minden t\xE9tel list\xE1\xE1ra = \xF6nk\xF6lts\xE9g \xD7 (1 + \xE1rr\xE9s). A kedvezm\xE9ny ezut\xE1n von le."))));
}

// ──────────────────────────────────────────────────────────────────────────
// LineRow — egy ajánlat/igény tétel a Tételek listában. Koppintásra lenyílik a
// részletező/szerkesztő panel (megnevezés, egységár, egység, ÁFA), és — ha van
// — a tervezett bútor / konfiguráció kapcsolódó részletei (olvasható).
// ──────────────────────────────────────────────────────────────────────────
const ibLineKind = l => l.design ? "tervezett bútor" : l.config ? "konfiguráció" : l.custom ? "egyedi" : l.code;
function LineRow({
  l,
  setQty,
  setLine,
  showMargin
}) {
  const [open, setOpen] = useStateIB(false);
  const [editor, setEditor] = useStateIB(null); // null | "design" | "config"
  const hasDetail = !!(l.design || l.config);
  const M = window.MarginUtil;
  const mp = showMargin && M ? M.marginPct(M.costOf(l), M.sellOf(l)) : null;
  const mtone = mp != null ? M.tone(mp) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: `rounded-xl border transition ${open ? "border-teal-300 ring-1 ring-teal-200 bg-white" : "border-stone-200 bg-white"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    "aria-expanded": open,
    className: "min-w-0 flex-1 flex items-start gap-2 text-left rounded-lg -m-1 p-1 hover:bg-stone-50/80 transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-medium text-stone-900 leading-tight truncate"
  }, l.name), hasDetail && /*#__PURE__*/React.createElement("span", {
    className: "shrink-0 w-1.5 h-1.5 rounded-full bg-teal-500",
    title: "R\xE9szletek el\xE9rhet\u0151k"
  })), /*#__PURE__*/React.createElement("span", {
    className: "block text-[10px] text-stone-400 font-mono mt-0.5"
  }, ibLineKind(l), " \xB7 ", ibhuf(l.price), "/", l.unit, " \xB7 \xC1FA ", l.vat, "%"), mp != null && /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 mt-1 px-1.5 h-4 rounded text-[9.5px] font-semibold ${mtone.bg} ${mtone.fg}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 9
  }), " \xE1rr\xE9s ", M.fmtPct(mp))), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14,
    className: `text-stone-300 shrink-0 mt-0.5 transition-transform ${open ? "-rotate-90" : "rotate-90"}`
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setQty(l.key, 0),
    className: "w-7 h-7 grid place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0",
    "aria-label": "T\xE9tel t\xF6rl\xE9se"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2 mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setQty(l.key, l.qty - 1),
    className: "w-7 h-7 grid place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "minus",
    size: 13
  })), /*#__PURE__*/React.createElement("input", {
    value: l.qty,
    onChange: e => setQty(l.key, Math.max(0, Number(e.target.value) || 0)),
    className: "w-11 h-7 text-center text-[12.5px] font-semibold tabular-nums border border-stone-200 rounded-lg outline-none focus:border-teal-500"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setQty(l.key, l.qty + 1),
    className: "w-7 h-7 grid place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400 ml-0.5"
  }, l.unit)), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 tabular-nums"
  }, ibhuf(l.price * l.qty)))), open && /*#__PURE__*/React.createElement(LineEditDetail, {
    l: l,
    setLine: setLine,
    onEditSpec: () => setEditor(l.design ? "design" : "config"),
    showMargin: showMargin
  }), editor === "config" && window.ConfigEvaluator && /*#__PURE__*/React.createElement(ConfigEvaluator, {
    editLine: l,
    onSave: patch => {
      setLine(l.key, patch);
      setEditor(null);
    },
    onClose: () => setEditor(null)
  }), editor === "design" && window.DesignItemWizard && /*#__PURE__*/React.createElement(DesignItemWizard, {
    initial: l,
    onAdd: built => {
      setLine(l.key, built);
      setEditor(null);
    },
    onClose: () => setEditor(null)
  }));
}
function LineEditDetail({
  l,
  setLine,
  onEditSpec,
  showMargin
}) {
  const recalcKind = l.design ? "Tervezett bútor szerkesztése" : "Specifikáció módosítása";
  const M = window.MarginUtil;
  const cost = showMargin && M ? M.costOf(l) : null;
  const mp = cost != null ? M.marginPct(cost, M.sellOf(l)) : null;
  const mtone = mp != null ? M.tone(mp) : null;
  // önköltség vagy árrés szerkesztése → a másik újraszámol
  const setCost = c => setLine(l.key, {
    cost: c
  });
  const setMargin = pct => setLine(l.key, {
    cost,
    price: M.sellFromCost(cost, pct)
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "px-2.5 pb-2.5 pt-0.5 border-t border-stone-100 mt-0.5 space-y-2.5 animate-[chSlide_.16s_ease-out]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pt-2.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10.5px] text-stone-500 mb-1"
  }, "Megnevez\xE9s"), /*#__PURE__*/React.createElement("input", {
    value: l.name,
    onChange: e => setLine(l.key, {
      name: e.target.value
    }),
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10.5px] text-stone-500 mb-1"
  }, "Egys\xE9g\xE1r (nett\xF3)"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center h-9 px-2.5 rounded-lg border border-stone-200 bg-white focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500"
  }, /*#__PURE__*/React.createElement("input", {
    value: l.price,
    onChange: e => setLine(l.key, {
      price: Math.max(0, Number(String(e.target.value).replace(/[^0-9]/g, "")) || 0)
    }),
    inputMode: "numeric",
    className: "w-full min-w-0 text-[12.5px] tabular-nums bg-transparent outline-none"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400 pl-1 shrink-0"
  }, "Ft"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10.5px] text-stone-500 mb-1"
  }, "Egys\xE9g"), /*#__PURE__*/React.createElement("input", {
    value: l.unit,
    onChange: e => setLine(l.key, {
      unit: e.target.value
    }),
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10.5px] text-stone-500 mb-1"
  }, "\xC1FA-kulcs"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, [0, 5, 18, 27].map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setLine(l.key, {
      vat: v
    }),
    className: `flex-1 h-8 rounded-lg text-[11.5px] font-medium border transition ${l.vat === v ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"}`
  }, v, "%")))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between pt-1 text-[11px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "Sor \xF6sszesen (nett\xF3)"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-700 tabular-nums"
  }, ibhuf(l.price * l.qty))), cost != null && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-amber-100 bg-amber-50/50 p-2.5 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 10
  }), " Bels\u0151 \u2014 \xF6nk\xF6lts\xE9g \xE9s \xE1rr\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10px] text-stone-500 mb-1"
  }, "\xD6nk\xF6lts\xE9g (nett\xF3)"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center h-8 px-2 rounded-lg border border-stone-200 bg-white"
  }, /*#__PURE__*/React.createElement("input", {
    value: cost,
    onChange: e => setCost(Math.max(0, Number(String(e.target.value).replace(/[^0-9]/g, "")) || 0)),
    inputMode: "numeric",
    className: "w-full min-w-0 text-[12px] tabular-nums bg-transparent outline-none"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 pl-1"
  }, "Ft"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[10px] text-stone-500 mb-1"
  }, "\xC1rr\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center h-8 px-2 rounded-lg border border-stone-200 bg-white"
  }, /*#__PURE__*/React.createElement("input", {
    value: Math.round(mp),
    onChange: e => setMargin(Number(String(e.target.value).replace(/[^0-9-]/g, "")) || 0),
    inputMode: "numeric",
    className: "w-full min-w-0 text-[12px] tabular-nums bg-transparent outline-none text-right"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 pl-1"
  }, "%")))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[11px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, "Egys\xE9gnyi fedezet"), /*#__PURE__*/React.createElement("span", {
    className: `tabular-nums font-semibold ${mtone.fg}`
  }, M.fmtHuf(M.unitProfit(l)), " ", /*#__PURE__*/React.createElement("span", {
    className: "font-normal text-stone-400"
  }, "/ ", l.unit)))), (l.design || l.config) && onEditSpec && /*#__PURE__*/React.createElement("button", {
    onClick: onEditSpec,
    className: "w-full h-9 rounded-lg border border-teal-300 bg-teal-50/60 text-teal-700 text-[12px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-teal-50 transition"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bolt",
    size: 14
  }), " ", recalcKind, " \xB7 \xE1r \xFAjrasz\xE1m\xEDt\xE1sa"), l.design && /*#__PURE__*/React.createElement(DesignMeta, {
    design: l.design
  }), l.config && /*#__PURE__*/React.createElement(ConfigMeta, {
    config: l.config
  }));
}

// Olvasható összefoglaló — tervezett bútor (DesignItemWizard)
function DesignMeta({
  design
}) {
  const n = design.needs || {},
    st = design.style || {};
  const phaseLabels = {
    needs: "Igény",
    style: "Stílus",
    layout: "Elrendezés",
    technical: "Műszaki",
    manufacturing: "Gyártás"
  };
  const rows = [];
  if (design.sourcing) rows.push(["Gyártásmód", design.sourcing === "outsourced" ? "Rendelhető (külső gyártó)" : "Saját gyártás"]);
  if (design.sourcing === "outsourced" && design.elemCategory) rows.push(["Elem-kategória", design.elemCategory]);
  rows.push(["Típus", design.category === "katalogus" ? "Katalógus alapú" : "Egyedi tervezés"]);
  if (design.baseRef && design.baseRef.name) rows.push(["Kiindulás", design.baseRef.name]);
  if (n.room) rows.push(["Helyiség", n.room]);
  if (n.w || n.h || n.d) rows.push(["Méret", `${n.w || "–"} × ${n.h || "–"} × ${n.d || "–"} mm`]);
  if (st.note) rows.push(["Stílus-jegyzet", st.note]);
  if (n.note) rows.push(["Igények", n.note]);
  const depth = (design.phasesIncluded || []).map(k => phaseLabels[k] || k);
  if (design.estLo && design.estHi) rows.push(["Becslési sáv", `${ibhuf(design.estLo)} – ${ibhuf(design.estHi)}`]);
  return /*#__PURE__*/React.createElement(MetaBlock, {
    icon: "ruler",
    accent: "violet",
    title: "Tervezett b\xFAtor r\xE9szletei",
    rows: rows,
    tags: depth.length ? {
      label: "Tervezési mélység",
      items: depth
    } : null
  });
}

// Olvasható összefoglaló — konfiguráció (config-evaluator / SpecEngine)
function ConfigMeta({
  config
}) {
  const s = window.sim && window.sim.getState ? window.sim.getState() : {};
  const cat = (s.specCategories || []).find(c => c.id === config.categoryId);
  const style = (s.styles || []).find(x => x.id === config.styleId);
  const tech = (s.techSpecs || []).find(x => x.id === config.techId);
  const rows = [];
  if (cat) rows.push(["Kategória", cat.name]);
  rows.push(["Stílus", style ? style.name : "alap"]);
  if (tech) rows.push(["Műszaki", tech.name]);
  if (config.bandPct != null) rows.push(["Pontossági sáv", `±${config.bandPct}%`]);
  return /*#__PURE__*/React.createElement(MetaBlock, {
    icon: "layers",
    accent: "teal",
    title: "Konfigur\xE1ci\xF3 r\xE9szletei",
    rows: rows
  });
}
function MetaBlock({
  icon,
  accent,
  title,
  rows,
  tags
}) {
  const tone = accent === "violet" ? {
    bg: "bg-violet-50/60",
    bd: "border-violet-100",
    ic: "text-violet-500",
    tg: "bg-violet-100 text-violet-700"
  } : {
    bg: "bg-teal-50/60",
    bd: "border-teal-100",
    ic: "text-teal-600",
    tg: "bg-teal-100 text-teal-700"
  };
  return /*#__PURE__*/React.createElement("div", {
    className: `rounded-lg border ${tone.bd} ${tone.bg} p-2.5 space-y-1.5`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 13,
    className: tone.ic
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] font-semibold uppercase tracking-wide text-stone-500"
  }, title)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, rows.map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-start justify-between gap-3 text-[11px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 shrink-0"
  }, k), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-700 text-right leading-snug"
  }, v)))), tags && tags.items.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "pt-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mb-1"
  }, tags.label), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, tags.items.map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: `px-1.5 py-0.5 rounded text-[10px] font-medium ${tone.tg}`
  }, t)))));
}
function CustomItemDialog({
  onClose,
  onAdd
}) {
  const [name, setName] = useStateIB("");
  const [price, setPrice] = useStateIB("");
  const [qty, setQty] = useStateIB(1);
  const [unit, setUnit] = useStateIB("db");
  const [vat, setVat] = useStateIB(IB_VAT_DEFAULT);
  const [isService, setIsService] = useStateIB(false);
  const ok = name.trim() && Number(price) > 0;
  const submit = () => {
    if (!ok) return;
    onAdd({
      name: name.trim() + (isService ? " (szolgáltatás)" : ""),
      code: isService ? "SZOLG" : "EGYEDI",
      unit,
      price: Number(price),
      qty: Math.max(1, Number(qty) || 1),
      vat: Number(vat)
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[70] flex items-end md:items-center justify-center"
  }, /*#__PURE__*/React.createElement("button", {
    className: "absolute inset-0 bg-stone-900/40",
    onClick: onClose,
    "aria-label": "Bez\xE1r\xE1s"
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full md:w-[420px] rounded-t-2xl md:rounded-2xl shadow-2xl animate-[chSlide_.22s_ease-out]",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom),0px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 pt-4 pb-3 border-b border-stone-200 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "Egyedi t\xE9tel / szolg\xE1ltat\xE1s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-stone-100 rounded-lg p-0.5"
  }, [{
    k: false,
    l: "Termék / tétel"
  }, {
    k: true,
    l: "Szolgáltatás"
  }].map(it => /*#__PURE__*/React.createElement("button", {
    key: String(it.k),
    onClick: () => {
      setIsService(it.k);
      setUnit(it.k ? "óra" : "db");
    },
    className: `flex-1 h-8 rounded-md text-[12.5px] font-medium ${isService === it.k ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`
  }, it.l))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "Megnevez\xE9s ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-500"
  }, "*")), /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: isService ? "pl. Helyszíni felmérés" : "pl. Egyedi méretű polc",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "\xC1r (nett\xF3) ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-500"
  }, "*")), /*#__PURE__*/React.createElement("input", {
    value: price,
    onChange: e => setPrice(e.target.value.replace(/[^0-9]/g, "")),
    inputMode: "numeric",
    placeholder: "0",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] tabular-nums outline-none focus:border-teal-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "Mennyis\xE9g"), /*#__PURE__*/React.createElement("input", {
    value: qty,
    onChange: e => setQty(e.target.value.replace(/[^0-9]/g, "")),
    inputMode: "numeric",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] tabular-nums outline-none focus:border-teal-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "Egys\xE9g"), /*#__PURE__*/React.createElement("input", {
    value: unit,
    onChange: e => setUnit(e.target.value),
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "\xC1FA-kulcs: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800"
  }, vat, "%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, [0, 5, 18, 27].map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setVat(v),
    className: `flex-1 h-8 rounded-lg text-[12px] font-medium border ${vat === v ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-stone-200 text-stone-600"}`
  }, v, "%"))))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center justify-end gap-2",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom),12px)"
    }
  }, /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: onClose
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: submit,
    disabled: !ok,
    className: "h-9 px-4 rounded-lg text-[12.5px] font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), " Hozz\xE1ad\xE1s"))));
}
Object.assign(window, {
  ItemBuilder,
  CustomerPickerDialog
});

// ──────────────────────────────────────────────────────────────────────────
// CustomerPickerDialog — pick an existing customer (searchable) OR add a new
// one inline via a full form. New customers are persisted through the store
// (onAddCustomer) so they are properly recorded everywhere, not just here.
// ──────────────────────────────────────────────────────────────────────────
function CustomerPickerDialog({
  customers = [],
  selectedName,
  onPick,
  onAddCustomer,
  onClose,
  initialMode = "list"
}) {
  const [mode, setMode] = useStateIB(initialMode); // list | new
  const [query, setQuery] = useStateIB("");
  const filtered = useMemoIB(() => {
    const n = query.trim().toLowerCase();
    if (!n) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(n) || (c.city || "").toLowerCase().includes(n) || (c.contact || "").toLowerCase().includes(n));
  }, [customers, query]);

  // new-customer form
  const [f, setF] = useStateIB({
    name: "",
    contact: "",
    city: "",
    email: "",
    phone: ""
  });
  const setField = k => e => setF(p => ({
    ...p,
    [k]: e.target.value
  }));
  const okNew = f.name.trim().length > 0;
  const saveNew = () => {
    if (!okNew) return;
    if (onAddCustomer) onAddCustomer({
      ...f
    });
    onPick(f.name.trim());
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[70] flex items-end md:items-center justify-center"
  }, /*#__PURE__*/React.createElement("button", {
    className: "absolute inset-0 bg-stone-900/40",
    onClick: onClose,
    "aria-label": "Bez\xE1r\xE1s"
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full md:w-[460px] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col h-[90vh] md:h-auto md:max-h-[88vh] animate-[chSlide_.22s_ease-out]",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom),0px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 pt-4 pb-3 border-b border-stone-200 flex items-center gap-2"
  }, mode === "new" && /*#__PURE__*/React.createElement("button", {
    onClick: () => setMode("list"),
    className: "w-8 h-8 -ml-1.5 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 16,
    className: "rotate-180"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 flex-1"
  }, mode === "new" ? "Új ügyfél felvétele" : "Ügyfél kiválasztása"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), mode === "list" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "px-5 pt-3 pb-2 shrink-0 space-y-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setF(p => ({
        ...p,
        name: query.trim()
      }));
      setMode("new");
    },
    className: "w-full h-11 rounded-xl border border-dashed border-teal-300 text-teal-700 text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:bg-teal-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), " \xDAj \xFCgyf\xE9l felv\xE9tele"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-3 h-10 rounded-lg bg-stone-50 border border-stone-200 text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 15
  }), /*#__PURE__*/React.createElement("input", {
    value: query,
    onChange: e => setQuery(e.target.value),
    placeholder: "Keres\xE9s n\xE9v, v\xE1ros, kapcsolattart\xF3\u2026",
    className: "bg-transparent outline-none text-[13px] flex-1 min-w-0 placeholder:text-stone-400 text-stone-800"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto px-3 pb-3"
  }, filtered.map(c => {
    const sel = c.name === selectedName;
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: () => onPick(c.name),
      className: `w-full text-left px-2.5 py-2.5 rounded-xl flex items-center gap-3 transition ${sel ? "bg-teal-50" : "hover:bg-stone-50"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-9 h-9 rounded-full bg-teal-100 text-teal-700 grid place-items-center text-[13px] font-semibold shrink-0"
    }, c.name.slice(0, 1)), /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block text-[13px] font-medium text-stone-900 truncate leading-tight"
    }, c.name), /*#__PURE__*/React.createElement("span", {
      className: "block text-[11px] text-stone-400 truncate leading-tight"
    }, [c.city, c.contact].filter(Boolean).join(" · ") || c.id)), sel && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 16,
      className: "text-teal-600 shrink-0"
    }));
  }), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-8 text-center text-[12.5px] text-stone-400"
  }, "Nincs tal\xE1lat erre: \u201E", query, "\u201D."))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto px-5 py-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "C\xE9gn\xE9v / n\xE9v ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-500"
  }, "*")), /*#__PURE__*/React.createElement("input", {
    autoFocus: true,
    value: f.name,
    onChange: setField("name"),
    placeholder: "pl. Kov\xE1cs Lakberendez\xE9s Kft.",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "Kapcsolattart\xF3"), /*#__PURE__*/React.createElement("input", {
    value: f.contact,
    onChange: setField("contact"),
    placeholder: "pl. Kov\xE1cs Anna",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "V\xE1ros"), /*#__PURE__*/React.createElement("input", {
    value: f.city,
    onChange: setField("city"),
    placeholder: "pl. Budapest",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "E-mail"), /*#__PURE__*/React.createElement("input", {
    value: f.email,
    onChange: setField("email"),
    inputMode: "email",
    placeholder: "pl. info@kovacslak.hu",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] text-stone-500 mb-1"
  }, "Telefon"), /*#__PURE__*/React.createElement("input", {
    value: f.phone,
    onChange: setField("phone"),
    inputMode: "tel",
    placeholder: "pl. +36 1 234 5678",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center justify-end gap-2 shrink-0",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom),12px)"
    }
  }, /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: () => setMode("list")
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: saveNew,
    disabled: !okNew,
    className: "h-9 px-4 rounded-lg text-[12.5px] font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14
  }), " R\xF6gz\xEDt\xE9s \xE9s kiv\xE1laszt\xE1s")))));
}
})();
