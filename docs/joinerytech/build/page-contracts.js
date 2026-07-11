/* AUTO-GENERATED from page-contracts.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-contracts.jsx — SZERZŐDÉSEK / ÜTEMEZETT SZÁMLÁZÁS (4.8-B3)
//   Pénzügy → Szerződések: a szerződéses érték fizetési mérföldkövekre bontva
//   (előleg / részszámla / végszámla). Mérföldkőnként „Számláz" → kimenő
//   számla-PISZKOZAT a Pénzügyben. Híd: Projektek ↔ Pénzügy.
//   Store: window.sim.contracts + billMilestone; ContractEngine (összegek).
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateCt
} = React;
const _cthuf = n => Math.round(Number(n) || 0).toLocaleString("hu-HU") + " Ft";
function CtMsStatusPill({
  status
}) {
  const t = (window.CTR_MS_STATUS || {})[status] || {
    label: status,
    pill: "bg-stone-100 text-stone-600 border-stone-200",
    dot: "bg-stone-400"
  };
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 rounded-full border font-medium px-2 h-6 text-[11px] ${t.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.dot}`
  }), t.label);
}
function ContractCard({
  c
}) {
  const E = window.ContractEngine;
  const invPct = E ? E.invoicedPct(c) : 0;
  const invAmt = E ? E.invoicedAmount(c) : 0;
  const canBill = window.sim.hasPerm && window.sim.hasPerm("finance.manage");
  const pctSum = E ? E.pctSum(c.milestones) : 100;
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 truncate"
  }, c.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mt-0.5"
  }, c.id, " \xB7 ", c.customer, c.projectRef ? ` · ${c.projectRef}` : "", c.orderRef ? ` · ${c.orderRef}` : "")), /*#__PURE__*/React.createElement("div", {
    className: "text-right shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Szerz\u0151d\xE9ses \xE9rt\xE9k"), /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, _cthuf(c.totalGross)))), /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-2 rounded-full bg-stone-100 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full rounded-full bg-emerald-500",
    style: {
      width: `${Math.min(100, invPct)}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mt-1 text-[10.5px] text-stone-400"
  }, /*#__PURE__*/React.createElement("span", null, "Lesz\xE1ml\xE1zva: ", invPct, "% \xB7 ", _cthuf(invAmt)), /*#__PURE__*/React.createElement("span", null, "H\xE1tral\xE9v\u0151: ", _cthuf((c.totalGross || 0) - invAmt))))), /*#__PURE__*/React.createElement("div", {
    className: "divide-y divide-stone-100"
  }, (c.milestones || []).map(ms => {
    const amt = E ? E.msAmount(c, ms) : 0;
    const billed = ms.status === "szamlazva";
    const trig = (window.CTR_TRIGGER || {})[ms.trigger] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: ms.id,
      className: "px-4 py-3 flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-stone-100 text-stone-500 text-[12px] font-bold"
    }, ms.pct, "%"), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-800 truncate"
    }, ms.label), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400"
    }, _cthuf(amt), " \xB7 ", trig.label || ms.trigger, ms.phase ? `: ${ms.phase}` : "")), /*#__PURE__*/React.createElement(CtMsStatusPill, {
      status: ms.status
    }), /*#__PURE__*/React.createElement("div", {
      className: "shrink-0 w-[112px] text-right"
    }, billed ? /*#__PURE__*/React.createElement("button", {
      onClick: () => window.navigateTo && window.navigateTo("finance", "outgoing"),
      className: "inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium font-mono hover:underline"
    }, ms.invoiceId, /*#__PURE__*/React.createElement(Icon, {
      name: "external",
      size: 11
    })) : canBill ? /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.billMilestone(c.id, ms.id),
      className: "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11.5px] font-medium"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "receipt",
      size: 13
    }), "Sz\xE1ml\xE1z") : /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-amber-700"
    }, "finance.manage")));
  })), pctSum !== 100 && /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2 bg-amber-50 border-t border-amber-100 text-[10.5px] text-amber-700 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 12
  }), "A m\xE9rf\xF6ldk\xF6vek \xF6sszege ", pctSum, "% (nem 100%)."));
}
function NewContractSheet({
  onClose,
  onCreated
}) {
  const sim = useSim();
  const orders = (sim.orders || []).filter(o => !(sim.contracts || []).some(c => c.orderRef === o.id));
  const PHASES = ["Ajánlat", "Felmérés", "Gyártás", "Beépítés", "Átadás"];
  const [orderId, setOrderId] = useStateCt("");
  const [customer, setCustomer] = useStateCt("");
  const [title, setTitle] = useStateCt("");
  const [total, setTotal] = useStateCt("");
  const [ms, setMs] = useStateCt((window.CTR_DEFAULT_SCHEDULE || []).map(m => ({
    ...m
  })));
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-emerald-500";
  const pickOrder = id => {
    setOrderId(id);
    const o = orders.find(x => x.id === id);
    if (o) {
      setCustomer(o.customer);
      setTitle(`${o.customer} — ${o.id}`);
      setTotal(o.total || "");
    }
  };
  const setRow = (i, patch) => setMs(ms.map((m, j) => j === i ? {
    ...m,
    ...patch
  } : m));
  const addRow = () => setMs([...ms, {
    label: "Részszámla",
    trigger: "manual",
    pct: 0,
    kind: "normal"
  }]);
  const delRow = i => setMs(ms.filter((_, j) => j !== i));
  const pctSum = ms.reduce((s, m) => s + (Number(m.pct) || 0), 0);
  const valid = customer.trim() && (Number(total) || 0) > 0 && ms.length > 0 && pctSum === 100;
  const create = () => {
    const id = window.sim.addContract({
      orderId: orderId || null,
      customer,
      title: title || customer,
      totalGross: Number(total) || 0,
      projectRef: (orders.find(o => o.id === orderId) || {}).projectId || null,
      milestones: ms
    });
    if (id && onCreated) onCreated(id);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[60] flex items-end md:items-center justify-center",
    role: "dialog"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-stone-900/40",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full md:max-w-[600px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "\xDAj szerz\u0151d\xE9s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-3.5"
  }, orders.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Rendel\xE9sb\u0151l (el\u0151t\xF6lt\xE9s) \u2014 opcion\xE1lis"), /*#__PURE__*/React.createElement("select", {
    value: orderId,
    onChange: e => pickOrder(e.target.value),
    className: cls
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 k\xE9zi megad\xE1s \u2014"), orders.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.id,
    value: o.id
  }, o.id, " \xB7 ", o.customer, " \xB7 ", (o.total || 0).toLocaleString("hu-HU"), " Ft")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "\xDCgyf\xE9l *"), /*#__PURE__*/React.createElement("input", {
    value: customer,
    onChange: e => setCustomer(e.target.value),
    className: cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Szerz\u0151d\xE9ses \xE9rt\xE9k (brutt\xF3) *"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: total,
    onChange: e => setTotal(e.target.value),
    className: cls
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Megnevez\xE9s"), /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "Pl. Konyhab\xFAtor \u2014 16 fi\xF3kos",
    className: cls
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] font-semibold text-stone-700"
  }, "Sz\xE1ml\xE1z\xE1si \xFCtemterv (m\xE9rf\xF6ldk\xF6vek)"), /*#__PURE__*/React.createElement("span", {
    className: `text-[11px] font-medium ${pctSum === 100 ? "text-emerald-600" : "text-rose-600"}`
  }, "\u03A3 ", pctSum, "%")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, ms.map((m, i) => {
    const amt = (Number(total) || 0) * (Number(m.pct) || 0) / 100;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "rounded-xl border border-stone-200 p-2.5 space-y-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("input", {
      value: m.label,
      onChange: e => setRow(i, {
        label: e.target.value
      }),
      placeholder: "Megnevez\xE9s",
      className: "flex-1 h-8 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-emerald-500"
    }), /*#__PURE__*/React.createElement("div", {
      className: "relative w-[68px]"
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: m.pct,
      onChange: e => setRow(i, {
        pct: e.target.value
      }),
      className: "w-full h-8 pl-2 pr-5 rounded-lg border border-stone-200 text-[12px] text-right bg-white outline-none focus:border-emerald-500"
    }), /*#__PURE__*/React.createElement("span", {
      className: "absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400"
    }, "%")), /*#__PURE__*/React.createElement("button", {
      onClick: () => delRow(i),
      className: "w-8 h-8 grid place-items-center rounded-lg border border-stone-200 text-stone-400 hover:text-rose-500 shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 13
    }))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("select", {
      value: m.kind,
      onChange: e => setRow(i, {
        kind: e.target.value
      }),
      className: "h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-emerald-500"
    }, /*#__PURE__*/React.createElement("option", {
      value: "advance"
    }, "El\u0151leg"), /*#__PURE__*/React.createElement("option", {
      value: "normal"
    }, "R\xE9sz/v\xE9gsz\xE1mla")), /*#__PURE__*/React.createElement("select", {
      value: m.trigger,
      onChange: e => setRow(i, {
        trigger: e.target.value
      }),
      className: "h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-emerald-500"
    }, /*#__PURE__*/React.createElement("option", {
      value: "manual"
    }, "K\xE9zi kiv\xE1lt\xE1s"), /*#__PURE__*/React.createElement("option", {
      value: "phase"
    }, "Projekt-f\xE1zis"), /*#__PURE__*/React.createElement("option", {
      value: "date"
    }, "D\xE1tum")), m.trigger === "phase" && /*#__PURE__*/React.createElement("select", {
      value: m.phase || "Gyártás",
      onChange: e => setRow(i, {
        phase: e.target.value
      }),
      className: "h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] bg-white outline-none focus:border-emerald-500"
    }, PHASES.map(p => /*#__PURE__*/React.createElement("option", {
      key: p,
      value: p
    }, p))), /*#__PURE__*/React.createElement("span", {
      className: "ml-auto text-[11px] text-stone-500"
    }, _cthuf(amt))));
  })), /*#__PURE__*/React.createElement("button", {
    onClick: addRow,
    className: "mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-stone-200 text-stone-600 text-[12px] font-medium hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "M\xE9rf\xF6ldk\u0151 hozz\xE1ad\xE1sa"), pctSum !== 100 && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-rose-600 mt-1.5"
  }, "A m\xE9rf\xF6ldk\xF6vek \xF6sszeg\xE9nek 100%-nak kell lennie (most ", pctSum, "%).")), /*#__PURE__*/React.createElement("button", {
    disabled: !valid,
    onClick: create,
    className: "w-full h-10 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold disabled:opacity-40"
  }, "Szerz\u0151d\xE9s l\xE9trehoz\xE1sa"))));
}
function FinanceContracts() {
  const sim = useSim();
  const contracts = sim.contracts || [];
  const [newOpen, setNewOpen] = useStateCt(false);
  const E = window.ContractEngine;
  const totalValue = contracts.reduce((s, c) => s + (c.totalGross || 0), 0);
  const invoiced = contracts.reduce((s, c) => s + (E ? E.invoicedAmount(c) : 0), 0);
  const dueCount = contracts.reduce((s, c) => s + (c.milestones || []).filter(m => m.status === "esedekes").length, 0);
  const KPI = ({
    label,
    value,
    sub,
    tone,
    icon
  }) => /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-8 h-8 rounded-lg grid place-items-center bg-${tone}-50 text-${tone}-600`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[18px] font-semibold text-stone-900 leading-none"
  }, value)), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-700 mt-2.5"
  }, label), sub && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-0.5"
  }, sub));
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3 mb-1"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Szerz\u0151d\xE9sek"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "\xDCtemezett sz\xE1ml\xE1z\xE1s \u2014 fizet\xE9si m\xE9rf\xF6ldk\xF6vek a projekt-f\xE1zisokhoz")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-medium shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "\xDAj szerz\u0151d\xE9s")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 my-4"
  }, /*#__PURE__*/React.createElement(KPI, {
    label: "Szerz\u0151d\xE9ses \xE9rt\xE9k",
    value: _cthuf(totalValue),
    sub: `${contracts.length} szerződés`,
    tone: "emerald",
    icon: "receipt"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Lesz\xE1ml\xE1zva",
    value: _cthuf(invoiced),
    sub: totalValue ? `${Math.round(invoiced / totalValue * 100)}%` : "—",
    tone: "teal",
    icon: "check"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "Esed\xE9kes m\xE9rf\xF6ldk\u0151",
    value: dueCount,
    sub: "sz\xE1ml\xE1z\xE1sra v\xE1r",
    tone: "amber",
    icon: "clock"
  }), /*#__PURE__*/React.createElement(KPI, {
    label: "H\xE1tral\xE9v\u0151",
    value: _cthuf(totalValue - invoiced),
    sub: "nyitott \xE9rt\xE9k",
    tone: "stone",
    icon: "orders"
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, contracts.length ? contracts.map(c => /*#__PURE__*/React.createElement(ContractCard, {
    key: c.id,
    c: c
  })) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 px-4 py-12 text-center text-[12.5px] text-stone-400"
  }, "Nincs szerz\u0151d\xE9s. Hozz l\xE9tre egyet rendel\xE9sb\u0151l.")), newOpen && /*#__PURE__*/React.createElement(NewContractSheet, {
    onClose: () => setNewOpen(false),
    onCreated: () => setNewOpen(false)
  }));
}
Object.assign(window, {
  CtMsStatusPill,
  ContractCard,
  NewContractSheet,
  FinanceContracts
});
})();
