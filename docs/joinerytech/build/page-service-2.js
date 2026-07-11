/* AUTO-GENERATED from page-service-2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// page-service-2.jsx — REKLAMÁCIÓ világ (2/2)
//   TicketDetail (SlideOver: garancia/SLA + FSM + megoldási mód + bekötés a
//   Logisztikába/gyártásba + B2B kiadás + napló), NewTicketSheet (belső felvétel
//   csatorna-/forrás-választással). Store: window.sim.* + ServiceEngine.
// ─────────────────────────────────────────────────────────────────
const {
  useState: useStateS2
} = React;
function TicketDetail({
  t,
  onClose
}) {
  const sim = useSim();
  const live = (sim.serviceTickets || []).find(x => x.id === t.id) || t;
  const E = window.ServiceEngine;
  const next = E ? E.nextStates(live) : [];
  const w = E ? E.warranty(live) : {
    known: false
  };
  const sla = E ? E.sla(live) : {
    active: false
  };
  const m = (window.SVC_TYPE_META || {})[live.type] || {};
  const [rejOpen, setRejOpen] = useStateS2(false);
  const [rejText, setRejText] = useStateS2("");
  const [delegOpen, setDelegOpen] = useStateS2(false);
  const partners = (sim.partners || []).filter(p => p.platform);
  const resMeta = live.resolution ? (window.SVC_RESOLUTION || {})[live.resolution] : null;
  const go = to => {
    if (to === "elutasitva") {
      setRejOpen(true);
      return;
    }
    window.sim.setTicketStatus(live.id, to);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(window.SvcTypeBadge, {
    type: live.type
  }), /*#__PURE__*/React.createElement(window.SvcStatusPill, {
    status: live.status
  }), /*#__PURE__*/React.createElement(window.SvcPriorityPill, {
    priority: live.priority
  }), /*#__PURE__*/React.createElement(window.WarrantyBadge, {
    ticket: live
  }), /*#__PURE__*/React.createElement(window.SlaBadge, {
    ticket: live
  })), /*#__PURE__*/React.createElement(window.SvcStepper, {
    ticket: live
  }), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3 space-y-1.5"
  }, live.desc && /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-700"
  }, live.desc), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2 text-[12px] text-stone-600 pt-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 14,
    className: "text-stone-400 mt-0.5 shrink-0"
  }), live.address || "—"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 14,
    className: "text-stone-400"
  }), live.contact || live.customer, live.phone && /*#__PURE__*/React.createElement("a", {
    href: `tel:${live.phone}`,
    className: "inline-flex items-center gap-1 text-rose-700 ml-1"
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
  }, "\xB7 ", live.ref)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-[11px] text-stone-400 pt-1"
  }, /*#__PURE__*/React.createElement("span", null, "Csatorna: ", window.CHANNEL_LABEL[live.channel] || live.channel), /*#__PURE__*/React.createElement("span", null, "Bejelentve: ", live.reportedAt))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mb-0.5"
  }, "Garancia"), w.known ? /*#__PURE__*/React.createElement("div", {
    className: `text-[12.5px] font-medium ${w.within ? "text-emerald-700" : "text-stone-500"}`
  }, w.within ? `Lejár: ${w.expiry}` : `Lejárt: ${w.expiry}`, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 font-normal"
  }, w.within ? `${w.daysLeft} nap van hátra` : `${Math.abs(w.daysLeft)} napja lejárt`)) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "nincs adat")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mb-0.5"
  }, "SLA hat\xE1rid\u0151"), sla.active ? /*#__PURE__*/React.createElement("div", {
    className: `text-[12.5px] font-medium ${sla.overdue ? "text-rose-700" : "text-stone-700"}`
  }, live.dueDate, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 font-normal"
  }, sla.overdue ? `${Math.abs(sla.daysLeft)} napja lejárt` : `${sla.daysLeft} nap van hátra`)) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "lez\xE1rt"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "St\xE1tusz l\xE9ptet\xE9s"), next.length ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, next.map(to => {
    const st = window.SVC_STATUS[to] || {};
    const rej = to === "elutasitva";
    return /*#__PURE__*/React.createElement("button", {
      key: to,
      onClick: () => go(to),
      className: `inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${rej ? "bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200" : "bg-rose-600 text-white hover:bg-rose-700"}`
    }, rej ? /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    }) : /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 14
    }), st.label);
  })) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, live.status === "lezarva" ? "Lezárt jegy." : "Elutasított jegy — újranyitható.", live.status === "elutasitva" && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.setTicketStatus(live.id, "bejelentve"),
    className: "ml-2 text-rose-600 font-medium"
  }, "\xDAjranyit\xE1s")), rejOpen && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-stone-600 font-medium block mb-1"
  }, "Elutas\xEDt\xE1s oka (k\xF6telez\u0151)"), /*#__PURE__*/React.createElement("textarea", {
    value: rejText,
    onChange: e => setRejText(e.target.value),
    rows: 2,
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-stone-400",
    placeholder: "Pl. garanci\xE1n k\xEDv\xFCli, nem rendeltet\xE9sszer\u0171 haszn\xE1lat\u2026"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-2"
  }, /*#__PURE__*/React.createElement("button", {
    disabled: !rejText.trim(),
    onClick: () => {
      if (window.sim.setTicketStatus(live.id, "elutasitva", {
        reason: rejText
      })) {
        setRejOpen(false);
        setRejText("");
      }
    },
    className: "h-8 px-3 rounded-lg bg-stone-700 text-white text-[12px] font-medium disabled:opacity-40"
  }, "Elutas\xEDt\xE1s"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setRejOpen(false);
      setRejText("");
    },
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600"
  }, "M\xE9gse")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Megold\xE1si m\xF3d"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, window.SVC_RESOLUTION_ORDER.map(k => {
    const r = window.SVC_RESOLUTION[k];
    const on = live.resolution === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => window.sim.setTicketResolution(live.id, k),
      className: `flex items-start gap-2 p-2.5 rounded-xl border text-left ${on ? "border-rose-400 bg-rose-50" : "border-stone-200 bg-white hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: r.icon,
      size: 16,
      className: on ? "text-rose-600 mt-0.5" : "text-stone-400 mt-0.5"
    }), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: `text-[12px] font-medium ${on ? "text-rose-800" : "text-stone-700"}`
    }, r.label), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-400 leading-tight mt-0.5"
    }, r.hint)));
  })), resMeta && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center gap-2 flex-wrap"
  }, (live.resolution === "helyszini" || live.resolution === "behuzas") && (live.linkedShipmentId ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 text-[11.5px] px-2.5 h-8 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "truck",
    size: 13
  }), "Fuvar: ", live.linkedShipmentId) : /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.ticketCreateShipment(live.id),
    className: "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-sky-600 text-white text-[12px] font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "truck",
    size: 13
  }), "Szerviz-fuvar l\xE9trehoz\xE1sa")), live.resolution === "csere" && (live.linkedOrderId ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 text-[11.5px] px-2.5 h-8 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "factory",
    size: 13
  }), "Rendel\xE9s: ", live.linkedOrderId) : /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.ticketCreateOrder(live.id),
    className: "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-violet-600 text-white text-[12px] font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "factory",
    size: 13
  }), "Csere-rendel\xE9s l\xE9trehoz\xE1sa")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "Kiad\xE1s szervizpartnernek"), live.delegatedTo ? /*#__PURE__*/React.createElement("div", {
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
  }, live.delegatedExternal ? "Platformon kívül" : "Kézfogás elküldve")), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.recallTicket(live.id),
    className: "h-8 px-3 rounded-lg border border-violet-200 text-[12px] text-violet-700 bg-white hover:bg-violet-50"
  }, "Visszavon\xE1s")) : delegOpen ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 p-2 space-y-1.5"
  }, partners.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => {
      window.sim.delegateTicket(live.id, p.id);
      setDelegOpen(false);
    },
    className: "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-stone-50 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-7 h-7 rounded-lg bg-stone-100 grid place-items-center text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "wrench",
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-800 truncate"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 truncate"
  }, p.specialty)))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDelegOpen(false),
    className: "w-full h-8 rounded-lg text-[12px] text-stone-500 hover:bg-stone-50"
  }, "M\xE9gse")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setDelegOpen(true),
    className: "w-full h-9 rounded-lg border border-dashed border-stone-300 text-[12.5px] font-medium text-stone-500 hover:text-violet-700 hover:border-violet-300"
  }, "+ Jegy kiad\xE1sa partnernek")), (live.log || []).length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
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

// ── Új bejelentés (belső felvétel) ───────────────────────────────
function NewTicketSheet({
  onClose,
  onCreated
}) {
  const sim = useSim();
  const [type, setType] = useStateS2("garancia");
  const [priority, setPriority] = useStateS2("kozepes");
  const [customer, setCustomer] = useStateS2("");
  const [title, setTitle] = useStateS2("");
  const [desc, setDesc] = useStateS2("");
  const [source, setSource] = useStateS2("");
  const customers = (sim.customers || []).map(c => c.name);
  // forrás-jelöltek: a vevő átadott fuvarjai / projektjei / rendelései
  const cust = customer.trim();
  const ships = (sim.shipments || []).filter(s => s.customer === cust && s.type === "delivery");
  const projs = (sim.projects || []).filter(p => p.customer === cust);
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-500";
  const create = () => {
    if (!cust || !title.trim()) return;
    let ref = "",
      refLabel = "",
      shipmentId = null,
      projectId = null,
      installedAt = null;
    if (source.startsWith("sh:")) {
      const s = ships.find(x => x.id === source.slice(3));
      if (s) {
        ref = s.ref;
        refLabel = s.refLabel;
        shipmentId = s.id;
        installedAt = s.date;
      }
    } else if (source.startsWith("pr:")) {
      const p = projs.find(x => x.id === source.slice(3));
      if (p) {
        ref = p.id;
        refLabel = p.name;
        projectId = p.id;
        installedAt = p.installTarget;
      }
    }
    const id = window.sim.createTicket({
      type,
      priority,
      customer: cust,
      title,
      desc,
      channel: "internal",
      ref,
      refLabel,
      shipmentId,
      projectId,
      installedAt
    });
    if (id && onCreated) onCreated(id);
  };
  const TypeBtn = ({
    k
  }) => {
    const m = window.SVC_TYPE_META[k];
    const on = type === k;
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => setType(k),
      className: `flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border ${on ? "border-rose-500 bg-rose-50" : "border-stone-200 bg-white"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 18,
      className: on ? "text-rose-700" : "text-stone-400"
    }), /*#__PURE__*/React.createElement("span", {
      className: `text-[11px] font-medium text-center leading-tight ${on ? "text-rose-800" : "text-stone-600"}`
    }, m.short));
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
  }, "\xDAj bejelent\xE9s"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, window.SVC_TYPE_ORDER.map(k => /*#__PURE__*/React.createElement(TypeBtn, {
    key: k,
    k: k
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "\xDCgyf\xE9l"), /*#__PURE__*/React.createElement("input", {
    list: "svc-cust-list",
    value: customer,
    onChange: e => {
      setCustomer(e.target.value);
      setSource("");
    },
    placeholder: "\xDCgyf\xE9l neve",
    className: cls
  }), /*#__PURE__*/React.createElement("datalist", {
    id: "svc-cust-list"
  }, customers.map(c => /*#__PURE__*/React.createElement("option", {
    key: c,
    value: c
  })))), cust && (ships.length > 0 || projs.length > 0) && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Kapcsol\xF3d\xF3 munka (opcion\xE1lis \u2014 garancia-d\xE1tumhoz)"), /*#__PURE__*/React.createElement("select", {
    value: source,
    onChange: e => setSource(e.target.value),
    className: cls
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 nincs \u2014"), ships.length > 0 && /*#__PURE__*/React.createElement("optgroup", {
    label: "Kisz\xE1ll\xEDt\xE1sok"
  }, ships.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: "sh:" + s.id
  }, s.id, " \xB7 ", s.refLabel || s.date))), projs.length > 0 && /*#__PURE__*/React.createElement("optgroup", {
    label: "Projektek"
  }, projs.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: "pr:" + p.id
  }, p.name))))), /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "Mi a probl\xE9ma? (r\xF6vid c\xEDm)",
    className: cls
  }), /*#__PURE__*/React.createElement("textarea", {
    value: desc,
    onChange: e => setDesc(e.target.value),
    rows: 3,
    placeholder: "R\xE9szletes le\xEDr\xE1s\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-rose-500"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Priorit\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, window.SVC_PRIORITY_ORDER.slice().reverse().map(k => {
    const p = window.SVC_PRIORITY[k];
    const on = priority === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setPriority(k),
      className: `flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg text-[11.5px] font-medium border ${on ? p.pill : "bg-white text-stone-500 border-stone-200"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${p.dot}`
    }), p.label);
  }))), /*#__PURE__*/React.createElement("button", {
    disabled: !cust || !title.trim(),
    onClick: create,
    className: "w-full h-10 rounded-xl bg-rose-600 text-white text-[13px] font-semibold disabled:opacity-40"
  }, "Bejelent\xE9s r\xF6gz\xEDt\xE9se"))));
}
Object.assign(window, {
  TicketDetail,
  NewTicketSheet
});
})();
