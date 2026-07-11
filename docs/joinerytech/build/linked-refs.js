/* AUTO-GENERATED from linked-refs.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ─────────────────────────────────────────────────────────────────
// linked-refs.jsx — ÖSSZEFÜGGŐ ADAT-PANELEK + MŰVELET UTÁNI NAVIGÁCIÓS KÉRDÉS
//
//   • window.RefPanel — kapcsolódó entitás kártyája bármely felületen.
//     Mindig MUTATJA az adatot (hivatkozási szám + státusz + kulcsmezők);
//     ha a fióknak van hozzáférése a cél-világhoz → "Megnyitás" (deep-link
//     _pendingOpen + navigateTo); ha nincs → VENDÉG NÉZET (csak információ,
//     lakat-jelvénnyel, gomb nélkül).
//   • window.askNextStep({title, text, options}) — webshop-stílusú
//     "Hogyan folytatod?" lap kulcs-műveletek után (pl. jóváhagyás,
//     konvertálás). Saját React-rootban él, bárhonnan hívható.
//
//   Bővítés: új entitás-típushoz a REF_KINDS-be vegyél fel feloldót.
// ─────────────────────────────────────────────────────────────────
const {
  useEffect: useEffectLR
} = React;
const _lrHuf = n => (Number(n) || 0).toLocaleString("hu-HU") + " Ft";

// státusz-címke az ismert FSM-metákból (biztonságos fallback: nyers kód)
function _lrStatusLabel(kind, st) {
  if (!st) return null;
  try {
    if (kind === "requisition") return ((window.PR_STATUS || {}).hu || {})[st] || st;
    if (kind === "shipment") return ((window.LOG_STATUS || {})[st] || {}).label || st;
    if (kind === "ticket") return ((window.SVC_STATUS || {})[st] || {}).label || st;
    if (kind === "inspection") return ((window.QA_STATUS || {})[st] || {}).label || st;
    if (kind === "quote") return ((window.QUOTE_STATUS_MAP || {})[st] || {}).label || st;
    if (kind === "order") return {
      draft: "Vázlat",
      calc: "Számítás",
      ready: "Kiadható",
      released: "Gyártásban",
      delivered: "Kiszállítva"
    }[st] || st;
    if (kind === "invoice") return {
      draft: "Piszkozat",
      issued: "Kiállítva",
      partial: "Részben fizetve",
      paid: "Fizetve",
      void: "Sztornó"
    }[st] || st;
    if (kind === "project") return {
      draft: "Vázlat",
      active: "Aktív",
      install: "Beépítés",
      done: "Lezárt"
    }[st] || st;
    if (kind === "job") return {
      queued: "Várólista",
      running: "Folyamatban",
      done: "Kész"
    }[st] || st;
    if (kind === "concept") return ((window.CONCEPT_TONE || {})[st] || {}).label || st;
    if (kind === "composition") return ((window.COMPO_STATUS || {})[st] || {}).label || st;
  } catch (e) {}
  return st;
}

// entitás-feloldók: hol él, hová nyílik, mit mutasson
const REF_KINDS = {
  order: {
    label: "Rendelés",
    icon: "orders",
    tint: "text-teal-600",
    world: "sales",
    screen: "orders",
    pendType: "order",
    perm: "order.track",
    find: (s, id) => (s.orders || []).find(o => o.id === id),
    info: o => [o.customer, _lrHuf(o.total)]
  },
  quote: {
    label: "Ajánlat",
    icon: "send",
    tint: "text-sky-600",
    world: "sales",
    screen: "quotes",
    pendType: "quote",
    find: (s, id) => (s.quotes || []).find(o => o.id === id),
    info: o => [o.customer, _lrHuf(o.value)]
  },
  requisition: {
    label: "Igénylés",
    icon: "inbox",
    tint: "text-amber-600",
    world: "procurement",
    screen: "requisitions",
    pendType: "requisition",
    find: (s, id) => (s.requisitions || []).find(o => o.id === id),
    info: o => [o.requester, o.lines ? o.lines.length + " tétel" : o.material]
  },
  project: {
    label: "Projekt",
    icon: "ruler",
    tint: "text-violet-600",
    world: "projects",
    screen: null,
    pendType: "project",
    find: (s, id) => (s.projects || []).find(o => o.id === id),
    info: o => [o.customer, o.name]
  },
  shipment: {
    label: "Fuvar",
    icon: "truck",
    tint: "text-sky-600",
    world: "logistics",
    screen: "deliveries",
    pendType: "shipment",
    find: (s, id) => (s.shipments || []).find(o => o.id === id),
    info: o => [o.customer, o.date]
  },
  invoice: {
    label: "Számla",
    icon: "receipt",
    tint: "text-emerald-600",
    world: "finance",
    screen: "outgoing",
    pendType: "invoice",
    find: (s, id) => (s.finInvoices || []).find(o => o.id === id),
    info: o => [o.party, o.dueDate ? "esedékes: " + o.dueDate : null]
  },
  ticket: {
    label: "Reklamáció",
    icon: "shield",
    tint: "text-rose-600",
    world: "service",
    screen: "tickets",
    pendType: "ticket",
    find: (s, id) => (s.serviceTickets || []).find(o => o.id === id),
    info: o => [o.customer, o.title]
  },
  job: {
    label: "Gyártási feladat",
    icon: "factory",
    tint: "text-violet-600",
    world: "production",
    screen: "dash",
    pendType: "job",
    find: (s, id) => (s.jobs || []).find(o => o.id === id),
    info: o => [o.name || o.customer]
  },
  concept: {
    label: "Koncepció",
    icon: "layers",
    tint: "text-rose-600",
    world: "interior",
    screen: "concepts",
    find: (s, id) => (s.concepts || []).find(o => o.id === id),
    info: o => [o.customer, o.name],
    go: id => {
      window._interiorOpen = id;
      window.navigateTo && window.navigateTo("interior", "concepts");
    }
  },
  composition: {
    label: "Bútorsor",
    icon: "layers",
    tint: "text-rose-600",
    world: "interior",
    screen: "composition",
    find: (s, id) => (s.compositions || []).find(o => o.id === id),
    info: o => [o.customer || null, o.name],
    go: () => {
      window.navigateTo && window.navigateTo("interior", "composition");
    }
  }
};
function _lrHasAccess(meta) {
  try {
    const acc = window.sim.currentAccount && window.sim.currentAccount();
    if (!acc) return false;
    if (!(acc.worlds || []).includes(meta.world)) return false;
    if (meta.perm && !window.sim.hasPerm(meta.perm)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

// ── Kapcsolódó entitás kártya ────────────────────────────────────
//   <RefPanel kind="order" id="JT-2426-0196" onBeforeNav={closeFn} />
function RefPanel({
  kind,
  id,
  onBeforeNav
}) {
  const s = useSim();
  const meta = REF_KINDS[kind];
  if (!meta || !id) return null;
  const ent = meta.find(s, id);
  const can = _lrHasAccess(meta);
  const stLbl = ent && _lrStatusLabel(kind, ent.status);
  const info = ent ? (meta.info(ent) || []).filter(Boolean) : [];
  const open = () => {
    if (onBeforeNav) onBeforeNav();
    if (meta.go) {
      meta.go(id);
      return;
    }
    window._pendingOpen = {
      type: meta.pendType,
      id
    };
    window.navigateTo && window.navigateTo(meta.world, meta.screen);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: `rounded-lg border px-3 py-2 ${can ? "bg-white border-stone-200" : "bg-stone-50 border-stone-200/80"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 min-w-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: meta.icon,
    size: 13,
    className: meta.tint + " shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-500 shrink-0"
  }, meta.label), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[12px] font-medium text-stone-900 truncate"
  }, id), stLbl && /*#__PURE__*/React.createElement("span", {
    className: "shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600"
  }, stLbl), /*#__PURE__*/React.createElement("span", {
    className: "flex-1"
  }), can ? /*#__PURE__*/React.createElement("button", {
    onClick: open,
    className: "shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition"
  }, "Megnyit\xE1s ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 10,
    className: "rotate-[-90deg]"
  })) : /*#__PURE__*/React.createElement("span", {
    title: "Nincs hozz\xE1f\xE9r\xE9s a kezel\u0151-fel\xFClethez \u2014 csak inform\xE1ci\xF3",
    className: "shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-md text-[10.5px] text-stone-400 bg-white border border-stone-200"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 10
  }), " Vend\xE9g n\xE9zet")), (info.length > 0 || !ent) && /*#__PURE__*/React.createElement("div", {
    className: "mt-1 pl-[21px] text-[11px] text-stone-500 truncate"
  }, ent ? info.join(" · ") : "A hivatkozott tétel nem található."));
}

// ── Művelet utáni navigációs kérdés ("Hogyan folytatod?") ────────
//   window.askNextStep({ title, text, options: [{label, icon, hint, primary, onClick}] })
//   Az utolsó opció jellemzően a "maradok" — onClick nélkül csak bezár.
let _nsHost = null;
function _nsRender(el) {
  if (!_nsHost) {
    const div = document.createElement("div");
    document.body.appendChild(div);
    _nsHost = ReactDOM.createRoot(div);
  }
  _nsHost.render(el);
}
function NextStepSheet({
  title,
  text,
  options,
  onClose
}) {
  useEffectLR(() => {
    const h = e => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[90] flex items-end md:items-center justify-center",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": "Bez\xE1r\xE1s",
    onClick: onClose,
    className: "absolute inset-0 bg-stone-900/35 backdrop-blur-[1px]"
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full md:max-w-[420px] rounded-t-2xl md:rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-[nsSlide_.2s_ease-out]",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom), 0px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "md:hidden pt-2 grid place-items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-9 h-1 rounded-full bg-stone-300"
  })), /*#__PURE__*/React.createElement("div", {
    className: "px-5 pt-4 pb-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14.5px] font-semibold text-stone-900"
  }, title), text && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500 mt-1 leading-snug"
  }, text)), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-2"
  }, (options || []).map((o, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => {
      onClose();
      if (o.onClick) setTimeout(o.onClick, 30);
    },
    className: `w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition ${o.primary ? "bg-stone-900 border-stone-900 text-white hover:bg-stone-800" : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"}`
  }, o.icon && /*#__PURE__*/React.createElement(Icon, {
    name: o.icon,
    size: 17,
    className: o.primary ? "text-white/90" : "text-stone-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block text-[13px] font-medium leading-tight"
  }, o.label), o.hint && /*#__PURE__*/React.createElement("span", {
    className: `block text-[10.5px] mt-0.5 ${o.primary ? "text-white/60" : "text-stone-400"}`
  }, o.hint)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13,
    className: (o.primary ? "text-white/60" : "text-stone-300") + " rotate-[-90deg] shrink-0"
  })))), /*#__PURE__*/React.createElement("style", null, `@keyframes nsSlide{from{transform:translateY(16px);opacity:.5}to{transform:translateY(0);opacity:1}}`)));
}
window.askNextStep = function askNextStep(opts) {
  const close = () => _nsRender(null);
  _nsRender(/*#__PURE__*/React.createElement(NextStepSheet, {
    title: opts.title || "Hogyan folytatod?",
    text: opts.text,
    options: opts.options || [],
    onClose: close
  }));
};
Object.assign(window, {
  RefPanel,
  NextStepSheet,
  REF_KINDS
});

// ── Ajánlat al-ajánlatkérés FSM-meta (quoteRequests) ──
window.QR_STATUS = {
  kert: {
    label: "Kért",
    pill: "bg-sky-50 text-sky-700 border-sky-200"
  },
  folyamatban: {
    label: "Folyamatban",
    pill: "bg-amber-50 text-amber-700 border-amber-200"
  },
  kesz: {
    label: "Teljesítve",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  elutasitva: {
    label: "Elutasítva",
    pill: "bg-rose-50 text-rose-600 border-rose-200"
  }
};
window.QR_KIND_META = {
  interior: {
    label: "Belsőépítészet — koncepció",
    icon: "layers",
    tint: "text-rose-600"
  },
  technical: {
    label: "Műszaki tervezés",
    icon: "ruler",
    tint: "text-amber-600"
  },
  rfq: {
    label: "Külső ajánlatkérés (RFQ)",
    icon: "send",
    tint: "text-sky-600"
  }
};
})();
