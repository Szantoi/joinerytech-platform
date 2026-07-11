/* AUTO-GENERATED from page-flow.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// Toast host + business-flow helpers
const {
  useState: useStateT,
  useEffect: useEffectT,
  useRef: useRefT,
  useCallback: useCallbackT
} = React;

// Global toast queue — exposed via window.toast(text, tone?)
const __toastListeners = new Set();
window.toast = (text, tone = "success") => {
  __toastListeners.forEach(fn => fn({
    id: Math.random().toString(36).slice(2),
    text,
    tone
  }));
};
function ToastHost() {
  const [items, setItems] = useStateT([]);
  useEffectT(() => {
    const fn = t => {
      setItems(prev => [...prev, t]);
      setTimeout(() => setItems(prev => prev.filter(x => x.id !== t.id)), 4000);
    };
    __toastListeners.add(fn);
    return () => __toastListeners.delete(fn);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
  }, items.map(t => {
    const tone = t.tone === "warn" ? "bg-amber-50 border-amber-200 text-amber-900" : t.tone === "info" ? "bg-sky-50 border-sky-200 text-sky-900" : "bg-emerald-50 border-emerald-200 text-emerald-900";
    const dot = t.tone === "warn" ? "bg-amber-500" : t.tone === "info" ? "bg-sky-500" : "bg-emerald-500";
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      className: `pointer-events-auto min-w-[280px] max-w-[420px] border rounded-lg shadow-lg px-3.5 py-2.5 flex items-start gap-2.5 ${tone}`,
      style: {
        animation: "toastIn 220ms ease-out"
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: `mt-1.5 w-1.5 h-1.5 rounded-full ${dot} shrink-0`
    }), /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] leading-snug flex-1"
    }, t.text));
  }), /*#__PURE__*/React.createElement("style", null, `@keyframes toastIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }`));
}

// Spinner used inline next to status pills
function Spinner({
  size = 11
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className: "animate-spin shrink-0"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9",
    stroke: "currentColor",
    strokeOpacity: ".2",
    strokeWidth: "3",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 0 1-9 9",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    fill: "none"
  }));
}

// ──────────────────────────────────────────────────────────────────────────
// Order flow — a calc/ready ÉLETCIKLUS most a STORE-ban perzisztál (o.calc).
//   __orderState csak a tranziens „épp számol” spinner-jelzőt tartja (in-flight),
//   ami szándékosan nem perzisztens. Az EREDMÉNY (anyaglista) a rendelésen él,
//   így frissítés után is megmarad. (#7 — korábban teljesen tranziens volt.)
// ──────────────────────────────────────────────────────────────────────────
const __orderStateListeners = new Set();
const __orderState = {}; // id -> { calc: bool }  (csak az in-flight spinner)

window.orderFlow = {
  get(id) {
    return __orderState[id];
  },
  set(id, patch) {
    __orderState[id] = {
      ...(__orderState[id] || {}),
      ...patch
    };
    __orderStateListeners.forEach(fn => fn(id));
  },
  subscribe(fn) {
    __orderStateListeners.add(fn);
    return () => __orderStateListeners.delete(fn);
  }
};

// A perzisztens rendelés-állapot (o.status) + anyaglista (o.calc) + a tranziens
// spinner összefűzve a régi flow-alakra, hogy a page-orders.jsx változatlanul
// működjön. A liveStatus az o.status-ból jön (NEM írjuk felül a calcStatus-t).
function useOrderFlow(id) {
  const [, force] = useStateT(0);
  useEffectT(() => {
    const unsubT = window.orderFlow.subscribe(uid => {
      if (uid === id) force(x => x + 1);
    });
    const unsubS = window.sim && window.sim.subscribe ? window.sim.subscribe(() => force(x => x + 1)) : () => {};
    return () => {
      unsubT();
      unsubS();
    };
  }, [id]);
  const o = window.sim && window.sim.findOrder ? window.sim.findOrder(id) : null;
  const calculating = !!(__orderState[id] && __orderState[id].calc);
  const c = o && o.calc ? o.calc : null;
  return {
    calc: calculating,
    anyagItems: c ? c.items : undefined,
    anyagValue: c ? c.value : undefined,
    plans: c ? c.plans : undefined,
    sheets: c ? c.sheets : undefined
  };
}

// Számítás indítása — a STORE-ba perzisztál (o.status draft→calc→ready + o.calc);
// a 2,4 mp tranziens spinner csak az animáció. Frissítés mid-calc → a perzisztens
// „calc” állapot marad („Számítás újraindítása” gomb).
window.simulateCalc = id => {
  window.orderFlow.set(id, {
    calc: true
  });
  if (window.sim && window.sim.startOrderCalc) window.sim.startOrderCalc(id);
  window.toast(`Számítás indítva — ${id}`, "info");
  setTimeout(() => {
    const items = 12 + Math.floor(Math.random() * 18);
    const value = 320_000 + Math.floor(Math.random() * 800_000);
    const plans = 2 + Math.floor(Math.random() * 3);
    const sheets = plans * (3 + Math.floor(Math.random() * 4));
    if (window.sim && window.sim.completeOrderCalc) window.sim.completeOrderCalc(id, {
      items,
      value,
      plans,
      sheets
    });
    window.orderFlow.set(id, {
      calc: false
    });
    window.toast(`✓ ${id} számítás kész — anyaglista elérhető`, "success");
  }, 2400);
};

// A gyártásba adás perzisztenciáját a window.sim.releaseOrder(id) végzi
// (o.status = "released"); itt már csak a tranziens spinnert nullázzuk.
window.releaseToWorkflow = id => {
  window.orderFlow.set(id, {
    calc: false
  });
};

// ──────────────────────────────────────────────────────────────────────────
// Offcuts (Maradékok) data + tab content
// ──────────────────────────────────────────────────────────────────────────
const OFFCUTS = [{
  id: "OC-001",
  name: "Tölgy 22mm maradék",
  w: 400,
  h: 600,
  plan: "CP-182-A",
  state: "ok",
  created: "2026-04-26"
}, {
  id: "OC-002",
  name: "Bükk 18mm maradék",
  w: 1200,
  h: 380,
  plan: "CP-184-A",
  state: "ok",
  created: "2026-04-27"
}, {
  id: "OC-003",
  name: "MDF 19mm maradék",
  w: 280,
  h: 440,
  plan: "CP-181-B",
  state: "ok",
  created: "2026-04-25"
}, {
  id: "OC-004",
  name: "Tölgy 40mm maradék",
  w: 800,
  h: 1200,
  plan: "CP-180-A",
  state: "ok",
  created: "2026-04-22"
}, {
  id: "OC-005",
  name: "MDF 16mm maradék",
  w: 180,
  h: 220,
  plan: "CP-183-A",
  state: "tooSmall",
  created: "2026-04-26"
}, {
  id: "OC-006",
  name: "Bükk 22mm maradék",
  w: 600,
  h: 900,
  plan: "CP-179-A",
  state: "ok",
  created: "2026-04-21"
}, {
  id: "OC-007",
  name: "Tölgy 22mm maradék",
  w: 320,
  h: 280,
  plan: "CP-182-B",
  state: "damaged",
  created: "2026-04-24"
}, {
  id: "OC-008",
  name: "MDF 19mm maradék",
  w: 1400,
  h: 600,
  plan: "CP-181-A",
  state: "ok",
  created: "2026-04-23"
}];
const OFFCUT_TONE = {
  ok: {
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Felhasználható"
  },
  tooSmall: {
    bg: "bg-stone-100",
    fg: "text-stone-600",
    dot: "bg-stone-400",
    label: "Túl kicsi"
  },
  damaged: {
    bg: "bg-rose-50",
    fg: "text-rose-700",
    dot: "bg-rose-500",
    label: "Sérült"
  }
};
function OffcutsPanel() {
  const useful = OFFCUTS.filter(o => o.state === "ok");
  const totalArea = useful.reduce((a, o) => a + o.w * o.h / 1_000_000, 0);
  const totalValue = Math.round(totalArea * 18000);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-3 mb-3"
  }, [{
    label: "Felhasználható maradékok",
    value: useful.length,
    sub: "darab"
  }, {
    label: "Összes terület",
    value: totalArea.toFixed(1),
    sub: "m²"
  }, {
    label: "Becsült érték",
    value: fmtNum(totalValue) + " Ft",
    sub: "raktáron",
    tone: "text-teal-700"
  }].map((x, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, x.label), /*#__PURE__*/React.createElement("div", {
    className: `text-[24px] font-semibold mt-1 tabular-nums ${x.tone || "text-stone-900"}`
  }, x.value), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, x.sub)))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-4 gap-3"
  }, OFFCUTS.map(o => {
    const tone = OFFCUT_TONE[o.state];
    return /*#__PURE__*/React.createElement(Card, {
      key: o.id,
      className: "p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-2 mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-900 truncate"
    }, o.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] font-mono text-stone-400"
    }, o.id)), /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium ${tone.bg} ${tone.fg}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
    }), tone.label)), /*#__PURE__*/React.createElement("div", {
      className: "aspect-[4/2.4] bg-stone-100 rounded-lg mb-3 grid place-items-center relative overflow-hidden",
      style: {
        background: "repeating-linear-gradient(45deg,#f5f5f4,#f5f5f4 6px,#e7e5e4 6px,#e7e5e4 7px)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white/80 rounded px-2 py-1 text-[11px] font-mono text-stone-700"
    }, o.w, " \xD7 ", o.h, " mm")), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between text-[10.5px]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-stone-500"
    }, "Eredeti: ", /*#__PURE__*/React.createElement("button", {
      className: "font-mono text-teal-700 hover:underline"
    }, o.plan)), /*#__PURE__*/React.createElement("div", {
      className: "font-mono text-stone-400"
    }, o.created)));
  })));
}

// ──────────────────────────────────────────────────────────────────────────
// StageChain editor (Settings tab)
// ──────────────────────────────────────────────────────────────────────────
function StageChainEditor({
  t
}) {
  const [chain, setChain] = useStateT(STAGES.map(s => ({
    ...s
  })));
  const [drag, setDrag] = useStateT(null);
  const move = (from, to) => {
    if (from === to) return;
    setChain(c => {
      const next = c.slice();
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  };
  const remove = i => setChain(c => c.filter((_, idx) => idx !== i));
  const toggleOpt = i => setChain(c => c.map((s, idx) => idx === i ? {
    ...s,
    optional: !s.optional
  } : s));
  const rename = (i, hu) => setChain(c => c.map((s, idx) => idx === i ? {
    ...s,
    hu
  } : s));
  const add = () => setChain(c => [...c, {
    key: `custom-${c.length}`,
    hu: "Új lépés",
    en: "New stage",
    optional: false
  }]);
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "StageChain konfigur\xE1ci\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, "A munkafolyamat l\xE9p\xE9seinek sorrendje \xE9s opcionalit\xE1sa. H\xFAzd a l\xE9p\xE9seket a sorrend v\xE1ltoztat\xE1s\xE1hoz.")), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: add
  }, "L\xE9p\xE9s hozz\xE1ad\xE1sa")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 flex-wrap mb-5 p-3 rounded-lg bg-stone-50 border border-stone-200/70"
  }, chain.map((s, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: s.key
  }, /*#__PURE__*/React.createElement("div", {
    className: `px-3 py-1.5 rounded-md text-[11.5px] font-medium border ${s.optional ? "bg-stone-100 text-stone-600 border-stone-200 border-dashed" : "bg-white text-stone-900 border-stone-300"}`
  }, s.hu, s.optional && /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-normal"
  }, " \xB7 opt")), i < chain.length - 1 && /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 12,
    className: "text-stone-400"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, chain.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.key,
    draggable: true,
    onDragStart: () => setDrag(i),
    onDragOver: e => e.preventDefault(),
    onDrop: () => {
      if (drag !== null) move(drag, i);
      setDrag(null);
    },
    onDragEnd: () => setDrag(null),
    className: `flex items-center gap-3 px-3 py-2 rounded-lg border transition ${drag === i ? "bg-teal-50 border-teal-300 opacity-70" : "bg-white border-stone-200 hover:border-stone-300"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "cursor-grab text-stone-400 active:cursor-grabbing"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "6",
    r: "1.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "12",
    r: "1.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "18",
    r: "1.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "6",
    r: "1.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "12",
    r: "1.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "18",
    r: "1.5"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] font-mono text-stone-400 w-6"
  }, i + 1, "."), /*#__PURE__*/React.createElement("input", {
    value: s.hu,
    onChange: e => rename(i, e.target.value),
    className: "flex-1 h-8 px-2 rounded border border-transparent hover:border-stone-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-[12.5px] bg-transparent"
  }), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-1.5 text-[11px] text-stone-600 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!s.optional,
    onChange: () => toggleOpt(i),
    className: "rounded text-teal-600 focus:ring-teal-500"
  }), "Opcion\xE1lis"), /*#__PURE__*/React.createElement("button", {
    onClick: () => remove(i),
    className: "w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 justify-end"
  }, /*#__PURE__*/React.createElement(GhostBtn, null, "Vissza\xE1ll\xEDt\xE1s"), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "check",
    onClick: () => window.toast("✓ StageChain konfiguráció mentve", "success")
  }, "Ment\xE9s")));
}
window.ToastHost = ToastHost;
window.Spinner = Spinner;
window.useOrderFlow = useOrderFlow;
window.OffcutsPanel = OffcutsPanel;
window.StageChainEditor = StageChainEditor;
})();
