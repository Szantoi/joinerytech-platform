/* AUTO-GENERATED from page-interior-2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// Belsőépítészet világ — Szakág-tervek (burkolás / festés / villany, részletes)
// + Alaprajz (behúzható alaprajz-kép + helyiség-bontás + villany-overlay).
// A megosztott komponensek/lookupok a page-interior.jsx-ből (window) jönnek.
const {
  useState: useStateI2
} = React;

// Koncepció-választó chip-sor (Szakág-tervek + Alaprajz tetején) ────────────
function ConceptPicker({
  value,
  onChange
}) {
  const concepts = (useSim().concepts || []).filter(c => c.status !== "archived");
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 overflow-x-auto pb-1"
  }, concepts.map(c => {
    const on = c.id === value;
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: () => onChange(c.id),
      className: `h-9 px-3 rounded-lg text-[12px] font-medium whitespace-nowrap border transition ${on ? "border-rose-400 bg-rose-50/70 text-stone-900" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`
    }, c.name.split(" — ")[0]);
  }));
}

// Szakág-terv státuszléptető (FSM-lite) ─────────────────────────────────────
function TradePlanStatusControl({
  concept,
  trade
}) {
  const flow = window.TRADEPLAN_FLOW || {};
  const next = flow[trade.status] || [];
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, next.map(s => {
    const tone = (window.TRADEPLAN_TONE || {})[s] || {};
    const back = ["draft", "in_progress"].includes(s) && ["in_progress", "ready"].includes(trade.status);
    return /*#__PURE__*/React.createElement("button", {
      key: s,
      onClick: () => window.sim.setConceptTradeStatus(concept.id, trade.id, s),
      className: `h-8 px-2.5 rounded-lg text-[11.5px] font-medium inline-flex items-center gap-1.5 ${back ? "border border-stone-200 text-stone-600 hover:bg-stone-50" : "bg-stone-900 text-white hover:bg-stone-700"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: back ? "chevron" : "chevron",
      size: 12,
      className: back ? "rotate-180" : ""
    }), tone.label || s);
  }), trade.status === "approved" && /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-violet-700 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), "Kivitelez\xE9sre k\xE9sz"));
}

// ── Szakág-tervek képernyő ─────────────────────────────────────────────────
function InteriorTrades() {
  const concepts = (useSim().concepts || []).filter(c => c.status !== "archived");
  const [cid, setCid] = useStateI2(() => window._interiorOpen || concepts[0] && concepts[0].id);
  const concept = (useSim().concepts || []).find(c => c.id === cid) || concepts[0];
  if (!concept) return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-6 text-stone-500 text-[13px]"
  }, "Nincs koncepci\xF3.");
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold tracking-tight text-stone-900"
  }, "Szak\xE1g-tervek"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, "Burkol\xE1s \xB7 fest\xE9s (RAL) \xB7 villany \u2014 a bels\u0151\xE9p\xEDt\xE9sz koordin\xE1lja a kivitelez\u0151 szak\xE1gakat")), /*#__PURE__*/React.createElement(ConceptPicker, {
    value: concept.id,
    onChange: setCid
  }), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, (concept.trades || []).map(t => /*#__PURE__*/React.createElement(TradePlanCard, {
    key: t.id,
    concept: concept,
    trade: t
  }))));
}
function TradePlanCard({
  concept,
  trade
}) {
  const meta = (window.INTERIOR_TRADE_META || {})[trade.trade] || {};
  const [planOpen, setPlanOpen] = useStateI2(false);
  return /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-3.5 border-b border-stone-100 flex items-start gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-10 h-10 rounded-xl bg-stone-900 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: meta.icon || "box",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13.5px] font-semibold text-stone-900"
  }, trade.title), /*#__PURE__*/React.createElement(window.TradeStatusPill, {
    status: trade.status
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mt-0.5"
  }, meta.blurb, " \xB7 ", trade.party, " \xB7 hat\xE1rid\u0151 ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, trade.due))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.sim.askAbout && window.sim.askAbout({
        type: "trade",
        id: concept.id + ":" + trade.id,
        name: `${meta.hu} — ${concept.name}`,
        label: `${meta.hu} — ${trade.party}`
      });
    },
    className: "h-8 px-2.5 rounded-lg border border-stone-200 text-[11.5px] text-stone-600 hover:bg-stone-50 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chat",
    size: 13
  }), "Felel\u0151s"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPlanOpen(o => !o),
    className: "h-8 px-2.5 rounded-lg border border-stone-200 text-[11.5px] text-stone-600 hover:bg-stone-50 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "camera",
    size: 13
  }), "Tervrajz"))), planOpen && /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-3 border-b border-stone-100 bg-stone-50/50"
  }, /*#__PURE__*/React.createElement("image-slot", {
    id: trade.planSlot,
    placeholder: `${meta.hu} tervrajz / vázlat behúzása`,
    shape: "rounded",
    radius: "12",
    class: "block w-full",
    style: {
      height: "200px"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-4"
  }, trade.trade === "burkolas" && /*#__PURE__*/React.createElement(BurkolasTable, {
    trade: trade
  }), trade.trade === "festes" && /*#__PURE__*/React.createElement(FestesList, {
    trade: trade
  }), trade.trade === "villany" && /*#__PURE__*/React.createElement(VillanyGrid, {
    trade: trade
  })), /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-3 border-t border-stone-100 bg-stone-50/40 flex items-center justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-500"
  }, "\xC1llapot l\xE9ptet\xE9se"), /*#__PURE__*/React.createElement(TradePlanStatusControl, {
    concept: concept,
    trade: trade
  })));
}

// Burkolás — burkolatkiosztás táblázat ──────────────────────────────────────
function BurkolasTable({
  trade
}) {
  const totalArea = (trade.rooms || []).reduce((n, r) => n + (r.area || 0), 0);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, (trade.rooms || []).map((r, i) => {
    const tile = window.tileOf(r.tile);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex items-center gap-3 p-2.5 rounded-lg border border-stone-100"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-10 h-10 rounded-lg border border-stone-200 shrink-0 relative overflow-hidden",
      style: {
        background: tile ? tile.color : "#ddd"
      }
    }, tile && /*#__PURE__*/React.createElement("span", {
      className: "absolute inset-0",
      style: {
        backgroundImage: `linear-gradient(${tile.grout} 1px, transparent 1px), linear-gradient(90deg, ${tile.grout} 1px, transparent 1px)`,
        backgroundSize: "8px 8px"
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900"
    }, r.room, " ", /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400 font-normal"
    }, "\xB7 ", tile ? tile.name : r.tile)), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 truncate"
    }, r.layout)), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] font-mono text-stone-600 shrink-0"
    }, r.area, " m\xB2"));
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mt-3 pt-3 border-t border-stone-100 text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, "\xD6sszes burkoland\xF3 fel\xFClet"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-900 font-mono"
  }, totalArea, " m\xB2")));
}

// Festés — RAL színlista ────────────────────────────────────────────────────
function FestesList({
  trade
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, (trade.rooms || []).map((r, i) => {
    const ral = window.ralOf(r.ral);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex items-center gap-3 p-2.5 rounded-lg border border-stone-100"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-10 h-10 rounded-lg border border-stone-200 shrink-0",
      style: {
        background: ral ? ral.color : "#ddd"
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900"
    }, r.room, " ", /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400 font-normal"
    }, "\xB7 ", r.surface)), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 truncate"
    }, r.note)), /*#__PURE__*/React.createElement("div", {
      className: "text-right shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] font-mono font-semibold text-stone-900"
    }, r.ral), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-400"
    }, ral ? ral.name : "")));
  }));
}

// Villany — kapcsoló / konnektor / lámpa pozíciók ───────────────────────────
const VILLANY_TONE = {
  "Konnektor": {
    bg: "bg-amber-50",
    fg: "text-amber-700",
    icon: "box"
  },
  "Kapcsoló": {
    bg: "bg-sky-50",
    fg: "text-sky-700",
    icon: "bolt"
  },
  "Lámpakiállás": {
    bg: "bg-violet-50",
    fg: "text-violet-700",
    icon: "sparkle"
  }
};
function VillanyGrid({
  trade
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-3"
  }, (trade.rooms || []).map((r, i) => {
    const total = (r.points || []).reduce((n, p) => n + (p.count || 0), 0);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "rounded-xl border border-stone-100 p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-900"
    }, r.room), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] font-mono text-stone-400"
    }, total, " pont")), /*#__PURE__*/React.createElement("div", {
      className: "space-y-1.5"
    }, (r.points || []).map((p, j) => {
      const tone = VILLANY_TONE[p.type] || {
        bg: "bg-stone-100",
        fg: "text-stone-600",
        icon: "box"
      };
      return /*#__PURE__*/React.createElement("div", {
        key: j,
        className: "flex items-center gap-2"
      }, /*#__PURE__*/React.createElement("span", {
        className: `w-6 h-6 rounded-md ${tone.bg} ${tone.fg} grid place-items-center shrink-0`
      }, /*#__PURE__*/React.createElement(Icon, {
        name: tone.icon,
        size: 12
      })), /*#__PURE__*/React.createElement("span", {
        className: `text-[11px] font-semibold ${tone.fg} w-7 text-center tabular-nums`
      }, p.count, "\xD7"), /*#__PURE__*/React.createElement("span", {
        className: "text-[11.5px] text-stone-800 shrink-0"
      }, p.type), /*#__PURE__*/React.createElement("span", {
        className: "text-[10.5px] text-stone-400 truncate flex-1"
      }, p.note));
    })));
  }));
}

// ── Alaprajz képernyő ──────────────────────────────────────────────────────
function InteriorFloorplan() {
  const concepts = (useSim().concepts || []).filter(c => c.status !== "archived");
  const [cid, setCid] = useStateI2(() => window._interiorOpen || concepts[0] && concepts[0].id);
  const concept = (useSim().concepts || []).find(c => c.id === cid) || concepts[0];
  if (!concept) return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-6 text-stone-500 text-[13px]"
  }, "Nincs koncepci\xF3.");
  // villany összesítés helyiségenként (overlay)
  const villany = (concept.trades || []).find(t => t.trade === "villany");
  const pointsByRoom = {};
  if (villany) (villany.rooms || []).forEach(r => {
    pointsByRoom[r.room] = (r.points || []).reduce((n, p) => n + (p.count || 0), 0);
  });
  const totalArea = (concept.rooms || []).reduce((n, r) => n + (r.area || 0), 0) || 1;
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold tracking-tight text-stone-900"
  }, "Alaprajz"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, "Beh\xFAzhat\xF3 alaprajz-k\xE9p \xE9s a helyis\xE9g-bont\xE1s \u2014 a koncepci\xF3 a teljes teret ismeri")), /*#__PURE__*/React.createElement(ConceptPicker, {
    value: concept.id,
    onChange: setCid
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-5 gap-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4 lg:col-span-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900"
  }, "Alaprajz"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400"
  }, "H\xFAzd be a tervez\u0151i alaprajzot (PDF-export k\xE9p)")), /*#__PURE__*/React.createElement("image-slot", {
    id: concept.floorplanSlot,
    placeholder: "Alaprajz beh\xFAz\xE1sa",
    shape: "rounded",
    radius: "14",
    class: "block w-full",
    style: {
      height: "340px"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-2 space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-1"
  }, "Helyis\xE9g-bont\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mb-3"
  }, "M\xE9retar\xE1nyos v\xE1zlat \xB7 villany-pontok overlay"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, (concept.rooms || []).map(r => {
    const pts = pointsByRoom[r.name] || 0;
    const basis = Math.max(28, Math.round(r.area / totalArea * 100));
    return /*#__PURE__*/React.createElement("div", {
      key: r.id,
      className: "rounded-lg border border-stone-200 bg-stone-50/70 p-2 flex flex-col justify-between",
      style: {
        flex: `1 1 ${basis}%`,
        minHeight: 64
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] font-medium text-stone-900 leading-tight"
    }, r.name), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mt-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] font-mono text-stone-500"
    }, r.area, " m\xB2"), pts > 0 && /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[10px] font-medium text-amber-700"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "bolt",
      size: 11
    }), pts)));
  }))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-2"
  }, "Jelmagyar\xE1zat"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 text-[11.5px] text-stone-600"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-5 h-5 rounded bg-amber-50 text-amber-700 grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bolt",
    size: 11
  })), "Villany-pontok sz\xE1ma (kapcsol\xF3 + konnektor + l\xE1mpa)"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-5 h-5 rounded bg-stone-100 text-stone-600 grid place-items-center font-mono text-[9px]"
  }, "m\xB2"), "Helyis\xE9g alapter\xFClete")), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, "Teljes alapter\xFClet"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-900 font-mono"
  }, totalArea, " m\xB2"))))));
}
Object.assign(window, {
  InteriorTrades,
  InteriorFloorplan
});
})();
