/* AUTO-GENERATED from page-logistics-2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-logistics-2.jsx — LOGISZTIKA világ (2/2)
//   ShipmentDetail (SlideOver tartalom: ütemezés + FSM + kiadás + átadás-átvétel),
//   DriverTerminal (mobil sofőr/szerelő terminál — mai túra), ResourcesPanel
//   (járművek + brigádok), NewShipmentSheet (új fuvar belépési pontokkal).
//   Store: window.sim.* + LogEngine.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateL2,
  useMemo: useMemoL2
} = React;

// ── Fuvar részlet (SlideOver tartalom) ───────────────────────────
function ShipmentDetail({
  sh,
  onClose
}) {
  const sim = useSim();
  const live = (sim.shipments || []).find(x => x.id === sh.id) || sh;
  const m = (window.LOG_TYPE_META || {})[live.type] || {};
  const next = window.LogEngine ? window.LogEngine.nextStates(live) : [];
  const conflict = window.sim.shipmentConflictSet()[live.id];
  const vehicles = sim.vehicles || [];
  const crews = sim.crews || [];
  const [delegOpen, setDelegOpen] = useStateL2(false);
  const [rekOpen, setRekOpen] = useStateL2(false);
  const [rekText, setRekText] = useStateL2("");
  const [defText, setDefText] = useStateL2("");
  const [defSev, setDefSev] = useStateL2("minor");
  const go = to => {
    if (to === "reklamacio") {
      setRekOpen(true);
      return;
    }
    window.sim.setShipmentStatus(live.id, to);
  };
  const sched = patch => window.sim.scheduleShipment(live.id, patch);
  const ho = live.handover || {};
  const showHandover = live.type === "delivery" && ["kiszallitva", "beszerelve", "atadva", "reklamacio"].includes(live.status);
  const partners = (sim.partners || []).filter(p => p.platform && (p.actorType === "installer" || p.actorType === "supplier" || p.actorType === "manufacturer"));
  const Field = ({
    label,
    children
  }) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, label), children);
  const inputCls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-sky-500";
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(ShipTypeBadge, {
    type: live.type
  }), /*#__PURE__*/React.createElement(LogStatusPill, {
    status: live.status
  }), live.install && live.type === "delivery" && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] px-2 h-6 inline-flex items-center rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-medium"
  }, "+ telep\xEDt\xE9s"), conflict && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[10px] px-2 h-6 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 11
  }), " er\u0151forr\xE1s-\xFCtk\xF6z\xE9s")), /*#__PURE__*/React.createElement(ShipStepper, {
    sh: live
  }), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3 space-y-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 15,
    className: "text-stone-400 mt-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-800"
  }, live.address || "—")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 14,
    className: "text-stone-400"
  }), live.contact || "—", live.phone && /*#__PURE__*/React.createElement("a", {
    href: `tel:${live.phone}`,
    className: "inline-flex items-center gap-1 text-sky-700 ml-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "phone",
    size: 13
  }), live.phone)), live.refLabel && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 14,
    className: "text-stone-400"
  }), live.refLabel, live.ref && /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[10.5px] text-stone-400"
  }, "\xB7 ", live.ref)), (live.loadM3 > 0 || live.loadKg > 0) && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "box",
    size: 14,
    className: "text-stone-400"
  }), live.loadM3 ? `${live.loadM3} m³` : "", live.loadM3 && live.loadKg ? " · " : "", live.loadKg ? `${logHuf(live.loadKg)} kg` : "")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "St\xE1tusz l\xE9ptet\xE9s"), next.length ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, next.map(to => {
    const t = window.LOG_STATUS[to] || {};
    const rek = to === "reklamacio";
    return /*#__PURE__*/React.createElement("button", {
      key: to,
      onClick: () => go(to),
      className: `inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${rek ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100" : "bg-sky-600 text-white hover:bg-sky-700"}`
    }, rek ? /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 14
    }) : /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 14
    }), t.label);
  })) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Lez\xE1rt fuvar \u2014 nincs tov\xE1bbi l\xE9p\xE9s."), rekOpen && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-rose-700 font-medium block mb-1"
  }, "Reklam\xE1ci\xF3 oka (k\xF6telez\u0151)"), /*#__PURE__*/React.createElement("textarea", {
    value: rekText,
    onChange: e => setRekText(e.target.value),
    rows: 2,
    className: "w-full px-2.5 py-2 rounded-lg border border-rose-200 text-[12.5px] bg-white outline-none focus:border-rose-400",
    placeholder: "Mi a probl\xE9ma?"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-2"
  }, /*#__PURE__*/React.createElement("button", {
    disabled: !rekText.trim(),
    onClick: () => {
      if (window.sim.setShipmentStatus(live.id, "reklamacio", {
        reason: rekText
      })) {
        setRekOpen(false);
        setRekText("");
      }
    },
    className: "h-8 px-3 rounded-lg bg-rose-600 text-white text-[12px] font-medium disabled:opacity-40"
  }, "Reklam\xE1ci\xF3 r\xF6gz\xEDt\xE9se"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setRekOpen(false);
      setRekText("");
    },
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse")))), live.type === "delivery" && live.status === "atadva" && (() => {
    const inv = (sim.finInvoices || []).find(v => v.dir === "out" && v.orderRef === (live.ref || live.id) && v.status !== "void");
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
    }, "Sz\xE1ml\xE1z\xE1s"), inv ? /*#__PURE__*/React.createElement("button", {
      onClick: () => window.navigateTo && window.navigateTo("finance", "outgoing"),
      className: "w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 flex items-center gap-2 hover:bg-emerald-100/60"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "receipt",
      size: 16,
      className: "text-emerald-600 shrink-0"
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1 text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-emerald-800"
    }, "Sz\xE1mla: ", inv.id, " (", window.FIN_STATUS && window.FIN_STATUS[inv.status] && window.FIN_STATUS[inv.status].label || inv.status, ")"), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-emerald-600/80"
    }, "Megnyit\xE1s a P\xE9nz\xFCgyben \u2192")), /*#__PURE__*/React.createElement(Icon, {
      name: "external",
      size: 14,
      className: "text-emerald-500 shrink-0"
    })) : /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.invoiceDraftFromDelivery(live.id),
      className: "w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-medium"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "receipt",
      size: 14
    }), "Sz\xE1mla-piszkozat a P\xE9nz\xFCgyben"));
  })(), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "\xDCtemez\xE9s"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "D\xE1tum"
  }, /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: live.date || "",
    onChange: e => sched({
      date: e.target.value
    }),
    className: inputCls
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1.5"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "T\xF3l"
  }, /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: live.windowStart || "",
    onChange: e => sched({
      windowStart: e.target.value
    }),
    className: inputCls
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Ig"
  }, /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: live.windowEnd || "",
    onChange: e => sched({
      windowEnd: e.target.value
    }),
    className: inputCls
  }))), !live.delegatedTo && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Field, {
    label: "J\xE1rm\u0171"
  }, /*#__PURE__*/React.createElement("select", {
    value: live.vehicleId || "",
    onChange: e => sched({
      vehicleId: e.target.value || null
    }),
    className: inputCls
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 nincs \u2014"), vehicles.map(v => /*#__PURE__*/React.createElement("option", {
    key: v.id,
    value: v.id
  }, v.name, " (", v.plate, ")")))), /*#__PURE__*/React.createElement(Field, {
    label: "Brig\xE1d"
  }, /*#__PURE__*/React.createElement("select", {
    value: live.crewId || "",
    onChange: e => sched({
      crewId: e.target.value || null
    }),
    className: inputCls
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 nincs \u2014"), crews.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name)))))), conflict && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-[11px] text-rose-600 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 12
  }), "A v\xE1lasztott j\xE1rm\u0171/brig\xE1d \xE1tfed\u0151 id\u0151ablakban m\xE1shol is be van osztva ezen a napon.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Kiad\xE1s fuvarpartnernek"), live.delegatedTo ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-violet-200 bg-violet-50/60 p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 16,
    className: "text-violet-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-violet-800"
  }, live.delegatedTo), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-violet-600/80"
  }, live.delegatedExternal ? "Platformon kívül — kézi státusz" : "Kézfogás elküldve")), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.recallShipment(live.id),
    className: "h-8 px-3 rounded-lg border border-violet-200 text-[12px] text-violet-700 bg-white hover:bg-violet-50"
  }, "Visszavon\xE1s")) : delegOpen ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-2 space-y-1.5"
  }, partners.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => {
      window.sim.delegateShipment(live.id, p.id);
      setDelegOpen(false);
    },
    className: "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-stone-50 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-7 h-7 rounded-lg bg-stone-100 grid place-items-center text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "truck",
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-800 truncate"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 truncate"
  }, p.specialty)), !p.platform && /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500"
  }, "platformon k\xEDv\xFCl"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDelegOpen(false),
    className: "w-full h-8 rounded-lg text-[12px] text-stone-500 hover:bg-stone-50"
  }, "M\xE9gse")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setDelegOpen(true),
    className: "w-full h-9 rounded-lg border border-dashed border-stone-300 text-[12.5px] font-medium text-stone-500 hover:text-violet-700 hover:border-violet-300"
  }, "+ Fuvar kiad\xE1sa k\xFCls\u0151 partnernek")), showHandover && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "\xC1tad\xE1s-\xE1tv\xE9tel"), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12.5px] text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "signature",
    size: 16,
    className: "text-stone-400"
  }), "\xDCgyf\xE9l al\xE1\xEDr\xE1sa"), ho.signedBy ? /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-emerald-700 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  }), ho.signedBy, " \xB7 ", ho.signedAt) : /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.setShipmentHandover(live.id, {
      signedBy: live.contact || "Ügyfél",
      signedAt: new Date().toISOString().slice(0, 16).replace("T", " ")
    }),
    className: "h-8 px-3 rounded-lg bg-stone-900 text-white text-[12px] font-medium"
  }, "Al\xE1\xEDr\xE1s r\xF6gz\xEDt\xE9se")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12.5px] text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "camera",
    size: 16,
    className: "text-stone-400"
  }), "Fot\xF3k ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "(", ho.photos || 0, ")")), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.setShipmentHandover(live.id, {
      photos: (ho.photos || 0) + 1
    }),
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600 hover:bg-stone-50 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "Fot\xF3")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12.5px] text-stone-700 mb-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 15,
    className: "text-stone-400"
  }), "Hi\xE1nylista / hibajegyz\xE9k"), (ho.deficiencies || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-1 mb-2"
  }, ho.deficiencies.map((d, i) => {
    const sv = (window.LOG_DEFECT_SEV || {})[d.sev] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-stone-50 border border-stone-100"
    }, /*#__PURE__*/React.createElement("span", {
      className: `text-[9.5px] px-1.5 py-0.5 rounded-full border font-medium ${sv.pill}`
    }, sv.label), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] text-stone-700 flex-1 min-w-0"
    }, d.text), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.removeShipmentDefect(live.id, i),
      className: "text-stone-300 hover:text-rose-500"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    })));
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    value: defText,
    onChange: e => setDefText(e.target.value),
    placeholder: "Hiba le\xEDr\xE1sa\u2026",
    className: "flex-1 h-8 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-sky-500"
  }), /*#__PURE__*/React.createElement("select", {
    value: defSev,
    onChange: e => setDefSev(e.target.value),
    className: "h-8 px-1.5 rounded-lg border border-stone-200 text-[11.5px] bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: "minor"
  }, "Kisebb"), /*#__PURE__*/React.createElement("option", {
    value: "major"
  }, "S\xFAlyos")), /*#__PURE__*/React.createElement("button", {
    disabled: !defText.trim(),
    onClick: () => {
      window.sim.addShipmentDefect(live.id, {
        text: defText.trim(),
        sev: defSev
      });
      setDefText("");
    },
    className: "h-8 px-2.5 rounded-lg bg-stone-900 text-white text-[12px] disabled:opacity-40"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2 pt-1 border-t border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12.5px] text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 16,
    className: "text-stone-400"
  }), "\xC1tad\xE1si jegyz\u0151k\xF6nyv"), ho.protocol ? /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-emerald-700 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  }), "Elk\xE9sz\xFClt") : /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.generateHandoverProtocol(live.id),
    className: "h-8 px-3 rounded-lg bg-sky-600 text-white text-[12px] font-medium"
  }, "Jegyz\u0151k\xF6nyv k\xE9sz\xEDt\xE9se")))), (live.log || []).length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Napl\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, live.log.slice().reverse().map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-start gap-2 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-stone-300 mt-1.5 shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-mono text-[10.5px] shrink-0"
  }, l.at), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-600"
  }, l.text))))));
}

// ── Sofőr / szerelő terminál — mobil-első mai túra ───────────────
function DriverTerminal() {
  const sim = useSim();
  const [openId, setOpenId] = useStateL2(null);
  const [vehF, setVehF] = useStateL2("all");
  const vehicles = sim.vehicles || [];
  const isLive = s => !["atadva", "beerkezett", "kesz", "torolve"].includes(s.status);
  let tour = (sim.shipments || []).filter(s => s.date === window.LOG_TODAY && isLive(s) && !s.delegatedTo);
  if (vehF !== "all") tour = tour.filter(s => s.vehicleId === vehF);
  tour = tour.slice().sort((a, b) => (a.windowStart || "").localeCompare(b.windowStart || ""));
  return /*#__PURE__*/React.createElement("div", {
    className: "max-w-[560px] mx-auto px-4 py-5 pb-24"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] font-semibold tracking-tight text-stone-900"
  }, "Mai t\xFAra"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, window.LOG_TODAY, " \xB7 ", tour.length, " meg\xE1ll\xF3")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-3 overflow-x-auto pb-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setVehF("all"),
    className: `shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${vehF === "all" ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200"}`
  }, "Mind"), vehicles.map(v => /*#__PURE__*/React.createElement("button", {
    key: v.id,
    onClick: () => setVehF(v.id),
    className: `shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${vehF === v.id ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200"}`
  }, v.name))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, tour.length ? tour.map((s, idx) => {
    const m = (window.LOG_TYPE_META || {})[s.type] || {};
    const next = window.LogEngine ? window.LogEngine.nextStates(s).filter(x => x !== "reklamacio" && x !== "torolve" && x !== "tervezett") : [];
    const primary = next[0];
    const pl = primary ? (window.LOG_STATUS[primary] || {}).label : null;
    return /*#__PURE__*/React.createElement("div", {
      key: s.id,
      className: "rounded-2xl border border-stone-200 bg-white overflow-hidden"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpenId(s.id),
      className: "w-full text-left p-4 flex items-start gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-8 h-8 rounded-full bg-stone-900 text-white grid place-items-center text-[13px] font-semibold shrink-0"
    }, idx + 1), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, /*#__PURE__*/React.createElement(ShipTypeBadge, {
      type: s.type,
      size: "sm"
    }), /*#__PURE__*/React.createElement(LogStatusPill, {
      status: s.status,
      size: "sm"
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[15px] font-semibold text-stone-900 mt-1.5"
    }, s.customer), /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] text-stone-500 flex items-center gap-1 mt-0.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "pin",
      size: 13
    }), s.address || "—"), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-400 flex items-center gap-2 mt-1"
    }, s.windowStart && /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "clock",
      size: 12
    }), s.windowStart, "\u2013", s.windowEnd), s.phone && /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "phone",
      size: 12
    }), s.phone)))), /*#__PURE__*/React.createElement("div", {
      className: "flex border-t border-stone-100"
    }, s.phone && /*#__PURE__*/React.createElement("a", {
      href: `tel:${s.phone}`,
      className: "flex-1 h-12 grid place-items-center text-[12.5px] font-medium text-stone-600 hover:bg-stone-50 border-r border-stone-100"
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "phone",
      size: 15
    }), "H\xEDv\xE1s")), primary ? /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.setShipmentStatus(s.id, primary),
      className: "flex-1 h-12 grid place-items-center text-[12.5px] font-semibold text-white bg-sky-600 hover:bg-sky-700"
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1.5"
    }, pl, /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 15
    }))) : /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpenId(s.id),
      className: "flex-1 h-12 grid place-items-center text-[12.5px] font-medium text-stone-600 hover:bg-stone-50"
    }, "R\xE9szletek")));
  }) : /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-dashed border-stone-200 px-4 py-12 text-center text-[13px] text-stone-400"
  }, "Ma nincs t\xF6bb meg\xE1ll\xF3. \uD83C\uDF89")), window.ShipDetailHost && /*#__PURE__*/React.createElement(window.ShipDetailHost, {
    openId: openId,
    onClose: () => setOpenId(null)
  }));
}

// ── Erőforrások — járművek + brigádok ────────────────────────────
function ResourcesPanel() {
  const sim = useSim();
  const vehicles = sim.vehicles || [];
  const crews = sim.crews || [];
  const facilities = window.FACILITIES || [];
  const facName = id => (facilities.find(f => f.id === id) || {}).name || "—";
  const [addVeh, setAddVeh] = useStateL2(false);
  const [addCrew, setAddCrew] = useStateL2(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900 mb-4"
  }, "Er\u0151forr\xE1sok"), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "truck",
    size: 15
  }), "J\xE1rm\u0171vek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAddVeh(v => !v),
    className: "text-[11.5px] text-sky-700 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "\xDAj")), addVeh && /*#__PURE__*/React.createElement(VehicleForm, {
    onClose: () => setAddVeh(false)
  }), vehicles.map(v => /*#__PURE__*/React.createElement("div", {
    key: v.id,
    className: "px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg bg-sky-50 text-sky-600 grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "truck",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, v.name, " ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[11px] text-stone-400"
  }, v.plate)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, v.type, " \xB7 ", v.capacityM3, " m\xB3 \xB7 ", logHuf(v.capacityKg), " kg \xB7 ", facName(v.facilityId))), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.removeVehicle(v.id),
    className: "text-stone-300 hover:text-rose-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 15
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 15
  }), "Brig\xE1dok"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAddCrew(v => !v),
    className: "text-[11.5px] text-sky-700 font-medium inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "\xDAj")), addCrew && /*#__PURE__*/React.createElement(CrewForm, {
    onClose: () => setAddCrew(false)
  }), crews.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    className: "px-4 py-3 border-b border-stone-100 last:border-0 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg bg-teal-50 text-teal-600 grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, c.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, (c.members || []).join(", ")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 mt-1"
  }, (c.skills || []).map(sk => {
    const m = (window.CREW_SKILLS || {})[sk] || {};
    return /*#__PURE__*/React.createElement("span", {
      key: sk,
      className: "inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon || "wrench",
      size: 9
    }), m.label || sk);
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.removeCrew(c.id),
    className: "text-stone-300 hover:text-rose-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 15
  })))))));
}
function VehicleForm({
  onClose
}) {
  const [name, setName] = useStateL2("");
  const [plate, setPlate] = useStateL2("");
  const [type, setType] = useStateL2("Furgon");
  const [m3, setM3] = useStateL2("12");
  const [kg, setKg] = useStateL2("1200");
  const facilities = window.FACILITIES || [];
  const [fac, setFac] = useStateL2(facilities[0] ? facilities[0].id : "");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-sky-500";
  const save = () => {
    if (!name.trim()) return;
    window.sim.addVehicle({
      name: name.trim(),
      plate: plate.trim(),
      type,
      capacityM3: Number(m3) || 0,
      capacityKg: Number(kg) || 0,
      facilityId: fac
    });
    onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-100 bg-stone-50/60 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "Megnevez\xE9s",
    className: cls
  }), /*#__PURE__*/React.createElement("input", {
    value: plate,
    onChange: e => setPlate(e.target.value),
    placeholder: "Rendsz\xE1m",
    className: cls
  }), /*#__PURE__*/React.createElement("input", {
    value: type,
    onChange: e => setType(e.target.value),
    placeholder: "T\xEDpus",
    className: cls
  }), /*#__PURE__*/React.createElement("select", {
    value: fac,
    onChange: e => setFac(e.target.value),
    className: cls
  }, facilities.map(f => /*#__PURE__*/React.createElement("option", {
    key: f.id,
    value: f.id
  }, f.name))), /*#__PURE__*/React.createElement("input", {
    value: m3,
    onChange: e => setM3(e.target.value),
    placeholder: "m\xB3",
    type: "number",
    className: cls
  }), /*#__PURE__*/React.createElement("input", {
    value: kg,
    onChange: e => setKg(e.target.value),
    placeholder: "kg",
    type: "number",
    className: cls
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: save,
    className: "h-8 px-3 rounded-lg bg-sky-600 text-white text-[12px] font-medium"
  }, "Hozz\xE1ad\xE1s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse")));
}
function CrewForm({
  onClose
}) {
  const [name, setName] = useStateL2("");
  const [members, setMembers] = useStateL2("");
  const [skills, setSkills] = useStateL2(["szallit", "szerel"]);
  const facilities = window.FACILITIES || [];
  const [fac, setFac] = useStateL2(facilities[0] ? facilities[0].id : "");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-sky-500";
  const toggleSkill = k => setSkills(xs => xs.includes(k) ? xs.filter(s => s !== k) : [...xs, k]);
  const save = () => {
    if (!name.trim()) return;
    window.sim.addCrew({
      name: name.trim(),
      members: members.split(",").map(s => s.trim()).filter(Boolean),
      skills,
      facilityId: fac
    });
    onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-100 bg-stone-50/60 space-y-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "Brig\xE1d neve",
    className: cls
  }), /*#__PURE__*/React.createElement("input", {
    value: members,
    onChange: e => setMembers(e.target.value),
    placeholder: "Tagok (vessz\u0151vel)",
    className: cls
  }), /*#__PURE__*/React.createElement("select", {
    value: fac,
    onChange: e => setFac(e.target.value),
    className: cls
  }, facilities.map(f => /*#__PURE__*/React.createElement("option", {
    key: f.id,
    value: f.id
  }, f.name))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, Object.keys(window.CREW_SKILLS || {}).map(k => {
    const m = window.CREW_SKILLS[k];
    const on = skills.includes(k);
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => toggleSkill(k),
      className: `inline-flex items-center gap-1 px-2 h-7 rounded-full text-[11px] font-medium border ${on ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-white text-stone-500 border-stone-200"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 11
    }), m.label);
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: save,
    className: "h-8 px-3 rounded-lg bg-sky-600 text-white text-[12px] font-medium"
  }, "Hozz\xE1ad\xE1s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse")));
}

// ── Új fuvar sheet (belépési pontokkal) ──────────────────────────
function NewShipmentSheet({
  onClose,
  onCreated,
  defaultType
}) {
  const sim = useSim();
  const [type, setType] = useStateL2(defaultType || "delivery");
  const [install, setInstall] = useStateL2(true);
  const [source, setSource] = useStateL2(""); // ref id of order/project/po, or "manual"
  const [customer, setCustomer] = useStateL2("");
  const [address, setAddress] = useStateL2("");
  const [date, setDate] = useStateL2("");
  const [note, setNote] = useStateL2("");

  // belépési pont jelöltek
  const orders = (sim.orders || []).filter(o => ["ready", "released", "calc", "delivered"].includes(o.status) && !(sim.shipments || []).some(s => s.ref === o.id));
  const projects = (sim.projects || []).filter(p => ["active", "install"].includes(p.status));
  const pos = (sim.pos || []).filter(p => p.status === "running" && !(sim.shipments || []).some(s => s.ref === p.id));
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-sky-500";
  const create = () => {
    let id;
    if (type === "delivery" && source && source.startsWith("ord:")) id = window.sim.createDeliveryFromOrder(source.slice(4), {
      install
    });else if (type === "delivery" && source && source.startsWith("prj:")) id = window.sim.createDeliveryFromProject(source.slice(4));else if (type === "pickup" && source && source.startsWith("po:")) id = window.sim.createPickupFromPO(source.slice(3));else id = window.sim.createShipment({
      type,
      install,
      customer: customer.trim(),
      address: address.trim(),
      note: note.trim()
    });
    if (id && date) window.sim.scheduleShipment(id, {
      date
    });
    if (id && onCreated) onCreated(id);
  };
  const canSave = type === "delivery" && source.startsWith("ord:") || type === "delivery" && source.startsWith("prj:") || type === "pickup" && source.startsWith("po:") || customer.trim();
  const TypeBtn = ({
    k
  }) => {
    const m = window.LOG_TYPE_META[k];
    const on = type === k;
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setType(k);
        setSource("");
      },
      className: `flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border ${on ? "border-sky-500 bg-sky-50" : "border-stone-200 bg-white"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 18,
      className: on ? "text-sky-700" : "text-stone-400"
    }), /*#__PURE__*/React.createElement("span", {
      className: `text-[11.5px] font-medium ${on ? "text-sky-800" : "text-stone-600"}`
    }, m.label));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[60] flex items-end md:items-center justify-center",
    role: "dialog"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-stone-900/40",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full md:max-w-[520px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "\xDAj fuvar"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, (window.LOG_TYPE_ORDER || []).map(k => /*#__PURE__*/React.createElement(TypeBtn, {
    key: k,
    k: k
  }))), type === "delivery" && /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 text-[12.5px] text-stone-700"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: install,
    onChange: e => setInstall(e.target.checked)
  }), "Helysz\xEDni telep\xEDt\xE9s / beszerel\xE9s is"), type === "delivery" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Forr\xE1s \u2014 k\xE9sz rendel\xE9s vagy projekt"), /*#__PURE__*/React.createElement("select", {
    value: source,
    onChange: e => setSource(e.target.value),
    className: cls
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 k\xE9zi (\xFAj \xFCgyf\xE9l) \u2014"), /*#__PURE__*/React.createElement("optgroup", {
    label: "Rendel\xE9sek (gy\xE1rt\xE1sra k\xE9sz)"
  }, orders.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.id,
    value: "ord:" + o.id
  }, o.id, " \xB7 ", o.customer))), /*#__PURE__*/React.createElement("optgroup", {
    label: "Projektek (be\xE9p\xEDt\xE9s)"
  }, projects.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: "prj:" + p.id
  }, p.name, " \xB7 ", p.customer))))), type === "pickup" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Forr\xE1s \u2014 fut\xF3 beszerz\xE9si megrendel\xE9s"), /*#__PURE__*/React.createElement("select", {
    value: source,
    onChange: e => setSource(e.target.value),
    className: cls
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 k\xE9zi (\xFAj besz\xE1ll\xEDt\xF3) \u2014"), pos.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: "po:" + p.id
  }, p.id, " \xB7 ", p.supplier, " \xB7 ", p.material)))), !source && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: customer,
    onChange: e => setCustomer(e.target.value),
    placeholder: type === "pickup" ? "Beszállító neve" : "Ügyfél neve",
    className: cls
  }), /*#__PURE__*/React.createElement("input", {
    value: address,
    onChange: e => setAddress(e.target.value),
    placeholder: "C\xEDm",
    className: cls
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Tervezett d\xE1tum (opcion\xE1lis)"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: date,
    onChange: e => setDate(e.target.value),
    className: cls
  })), /*#__PURE__*/React.createElement("textarea", {
    value: note,
    onChange: e => setNote(e.target.value),
    rows: 2,
    placeholder: "Megjegyz\xE9s (pl. lift, daru, parkol\xE1s)\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-sky-500"
  })), /*#__PURE__*/React.createElement("button", {
    disabled: !canSave,
    onClick: create,
    className: "w-full h-10 rounded-xl bg-sky-600 text-white text-[13px] font-semibold disabled:opacity-40"
  }, "Fuvar l\xE9trehoz\xE1sa"))));
}
Object.assign(window, {
  ShipmentDetail,
  DriverTerminal,
  ResourcesPanel,
  VehicleForm,
  CrewForm,
  NewShipmentSheet
});
})();
