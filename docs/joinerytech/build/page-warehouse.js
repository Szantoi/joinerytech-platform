/* AUTO-GENERATED from page-warehouse.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// Raktár — lot-szintű készletkezelés (zóna = elérhetőségi státusz), bevételezés,
// kivét-kérelmek, raktárhely-beállítások. A zóna NEM fizikai hely; a fizikai
// elhelyezkedés a lot `loc` mezője + a hely-regiszter. Egy igazságforrás: window.sim.
//
// Ez a fájl: közös segéd-komponensek + Készlet (lot-lista zóna-szűrővel).
// A Bevételezés / Kivét / Beállítások a page-warehouse-2.jsx-ben.
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateWH,
  useMemo: useMemoWH
} = React;

// ── Közös vizuális elemek ───────────────────────────────────────────────────
function WhZonePill({
  zone,
  size = "sm"
}) {
  const z = (window.WH_ZONES || {})[zone] || {
    label: zone,
    pill: "bg-stone-100 text-stone-600 border-stone-200",
    dot: "bg-stone-400"
  };
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 ${size === "xs" ? "text-[9.5px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"} rounded-full border font-medium ${z.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${z.dot}`
  }), z.short || z.label);
}
function WhTrendPill({
  trend
}) {
  const t = (window.WH_TREND || {})[trend] || (window.WH_TREND || {}).ok || {
    label: trend,
    pill: "bg-stone-100 text-stone-600 border-stone-200",
    dot: "bg-stone-400"
  };
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${t.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${t.dot}`
  }), t.label);
}
function WhConsumerPill({
  consumer
}) {
  const c = (window.WH_CONSUMERS || {})[consumer] || {
    label: consumer,
    pill: "bg-stone-100 text-stone-600 border-stone-200",
    icon: "box"
  };
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.pill}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: c.icon,
    size: 11
  }), c.label);
}
// Zóna-megoszlás sáv egy tételen belül (lotok mennyisége zónánként)
function WhZoneBar({
  lots
}) {
  const total = lots.reduce((a, l) => a + (Number(l.qty) || 0), 0) || 1;
  return /*#__PURE__*/React.createElement("div", {
    className: "flex h-2 w-full rounded-full overflow-hidden bg-stone-100"
  }, (window.WH_ZONE_ORDER || []).map(zk => {
    const q = lots.filter(l => l.zone === zk).reduce((a, l) => a + (Number(l.qty) || 0), 0);
    if (q <= 0) return null;
    const z = window.WH_ZONES[zk];
    return /*#__PURE__*/React.createElement("div", {
      key: zk,
      title: `${z.label}: ${q}`,
      style: {
        width: `${q / total * 100}%`,
        background: z.accent
      }
    });
  }));
}
function WhNumInput({
  value,
  onChange,
  max,
  min = 0,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    onChange: e => onChange(e.target.value),
    className: `h-9 px-2.5 rounded-lg border border-stone-200 text-[13px] tabular-nums outline-none focus:border-teal-500 bg-white ${className}`
  });
}

// Hely-választó (csak az engedélyezett szintek mezőivel) — regiszterből választ.
function WhLocationSelect({
  value,
  onChange
}) {
  const sim = window.useSim();
  const locs = sim.warehouseLocations || [];
  return /*#__PURE__*/React.createElement("select", {
    value: value || "",
    onChange: e => onChange(e.target.value),
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 rakt\xE1rhely \u2014"), locs.map(l => /*#__PURE__*/React.createElement("option", {
    key: l.id,
    value: l.id
  }, window.sim.whLocLabel(l))));
}

// ══════════════════════════════════════════════════════════════════════════
// KÉSZLET — lot-lista zóna-szűrővel
// ══════════════════════════════════════════════════════════════════════════
function WarehouseInventory() {
  const sim = window.useSim();
  const [q, setQ] = useStateWH("");
  const [zoneF, setZoneF] = useStateWH("all"); // all | <zone> | alerts
  const [openId, setOpenId] = useStateWH(null);
  const [showWd, setShowWd] = useStateWH(null); // item for quick withdrawal

  const items = useMemoWH(() => (sim.catalog || []).filter(it => it.active !== false && it.worldExt?.warehouse && !it.worldExt.warehouse.archived), [sim.catalog]);

  // Zóna-összegzők (globális, fejléchez)
  const zoneTotals = useMemoWH(() => {
    const m = {};
    (window.WH_ZONE_ORDER || []).forEach(z => m[z] = 0);
    items.forEach(it => (it.worldExt.warehouse.lots || []).forEach(l => {
      m[l.zone] = (m[l.zone] || 0) + (Number(l.qty) || 0);
    }));
    return m;
  }, [items]);
  const alertCount = items.filter(it => it.worldExt.warehouse.trend !== "ok").length;
  const freeValue = items.reduce((a, it) => a + (it.worldExt.warehouse.available || 0) * (it.price || 0), 0);
  const filtered = useMemoWH(() => {
    let list = items;
    if (zoneF === "alerts") list = list.filter(it => it.worldExt.warehouse.trend !== "ok");else if (zoneF !== "all") list = list.filter(it => (it.worldExt.warehouse.lots || []).some(l => l.zone === zoneF));
    if (q) {
      const n = q.toLowerCase();
      list = list.filter(it => it.name.toLowerCase().includes(n) || (it.code || "").toLowerCase().includes(n) || (it.worldExt.warehouse.lots || []).some(l => (l.locText || "").toLowerCase().includes(n) || (l.projectNo || "").toLowerCase().includes(n)));
    }
    return list;
  }, [items, zoneF, q]);
  const open = openId ? items.find(it => it.id === openId) : null;
  const fmtVal = v => v >= 1e6 ? (v / 1e6).toFixed(1) + "M Ft" : Math.round(v / 1000) + "e Ft";
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-end justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-[17px] font-semibold text-stone-900"
  }, "K\xE9szlet"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500"
  }, items.length, " nyilv\xE1ntartott t\xE9tel \xB7 lot- \xE9s z\xF3na-szint\u0171 kezel\xE9s")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "Szabad k\xE9szlet \xE9rt\xE9ke"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-800 tabular-nums"
  }, fmtVal(freeValue)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 overflow-x-auto pb-1 mb-3"
  }, /*#__PURE__*/React.createElement(ZoneChip, {
    active: zoneF === "all",
    onClick: () => setZoneF("all"),
    label: "Mind",
    count: items.length,
    dot: "bg-stone-800"
  }), (window.WH_ZONE_ORDER || []).map(zk => {
    const z = window.WH_ZONES[zk];
    return /*#__PURE__*/React.createElement(ZoneChip, {
      key: zk,
      active: zoneF === zk,
      onClick: () => setZoneF(zk),
      label: z.label,
      count: zoneTotals[zk] || 0,
      dotColor: z.accent
    });
  }), /*#__PURE__*/React.createElement(ZoneChip, {
    active: zoneF === "alerts",
    onClick: () => setZoneF("alerts"),
    label: "Ut\xE1nrendel\xE9s",
    count: alertCount,
    dot: "bg-rose-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "relative mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16
  })), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Keres\xE9s n\xE9v, cikksz\xE1m, hely vagy projektsz\xE1m szerint\u2026",
    className: "w-full h-10 pl-9 pr-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-teal-500 bg-white"
  })), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden lg:grid grid-cols-[minmax(0,1fr)_92px_92px_80px_160px_120px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50"
  }, /*#__PURE__*/React.createElement("div", null, "T\xE9tel"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Szabad"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Foglalt"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Min."), /*#__PURE__*/React.createElement("div", null, "Z\xF3na-megoszl\xE1s"), /*#__PURE__*/React.createElement("div", null, "\xC1llapot")), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-10 text-center text-[12.5px] text-stone-400"
  }, "Nincs tal\xE1lat."), filtered.map(it => {
    const wh = it.worldExt.warehouse;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => setOpenId(it.id),
      className: "w-full text-left border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition"
    }, /*#__PURE__*/React.createElement("div", {
      className: "hidden lg:grid grid-cols-[minmax(0,1fr)_92px_92px_80px_160px_120px] gap-3 px-5 py-3 items-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] font-medium text-stone-900 truncate"
    }, it.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 font-mono"
    }, it.code, " \xB7 ", (wh.lots || []).length, " lot")), /*#__PURE__*/React.createElement("div", {
      className: "text-right tabular-nums text-[13px] font-semibold text-stone-800"
    }, wh.available, " ", /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-stone-400 font-normal"
    }, it.unit)), /*#__PURE__*/React.createElement("div", {
      className: "text-right tabular-nums text-[12.5px] text-stone-500"
    }, wh.reserved || 0), /*#__PURE__*/React.createElement("div", {
      className: "text-right tabular-nums text-[12px] text-stone-400"
    }, wh.min), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(WhZoneBar, {
      lots: wh.lots || []
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(WhTrendPill, {
      trend: wh.trend
    }))), /*#__PURE__*/React.createElement("div", {
      className: "lg:hidden px-4 py-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2 mb-1.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[13.5px] font-medium text-stone-900 truncate"
    }, it.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 font-mono"
    }, it.code)), /*#__PURE__*/React.createElement(WhTrendPill, {
      trend: wh.trend
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3 text-[11.5px] mb-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-stone-500"
    }, "Szabad ", /*#__PURE__*/React.createElement("b", {
      className: "text-stone-800 tabular-nums"
    }, wh.available), " ", it.unit), wh.reserved > 0 && /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400"
    }, "Foglalt ", /*#__PURE__*/React.createElement("b", {
      className: "text-stone-600 tabular-nums"
    }, wh.reserved)), /*#__PURE__*/React.createElement("span", {
      className: "text-stone-300"
    }, "\xB7"), /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400"
    }, "min. ", wh.min)), /*#__PURE__*/React.createElement(WhZoneBar, {
      lots: wh.lots || []
    })));
  })), /*#__PURE__*/React.createElement(SlideOver, {
    open: !!open,
    onClose: () => setOpenId(null),
    width: 560,
    title: open ? open.name : "",
    subtitle: open ? `${open.code} · ${open.unit}` : "",
    footer: open ? /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-500"
    }, "Szabad: ", /*#__PURE__*/React.createElement("b", {
      className: "text-stone-800"
    }, open.worldExt.warehouse.available, " ", open.unit), " \xB7 \xD6sszes: ", open.worldExt.warehouse.onHand), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "external",
      onClick: () => {
        setShowWd(open);
      }
    }, "Kiv\xE9t-k\xE9relem")) : null
  }, open && /*#__PURE__*/React.createElement(ItemLotPanel, {
    item: open
  })), showWd && window.QuickWithdrawDialog && /*#__PURE__*/React.createElement(window.QuickWithdrawDialog, {
    initialItem: showWd,
    onClose: () => setShowWd(null)
  }));
}
function ZoneChip({
  active,
  onClick,
  label,
  count,
  dot,
  dotColor
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: `shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12px] font-medium transition ${active ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`
  }, dotColor ? /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full",
    style: {
      background: dotColor
    }
  }) : /*#__PURE__*/React.createElement("span", {
    className: `w-2 h-2 rounded-full ${dot || "bg-stone-300"}`
  }), label, /*#__PURE__*/React.createElement("span", {
    className: `tabular-nums text-[10.5px] ${active ? "text-white/60" : "text-stone-400"}`
  }, count));
}

// ── Tétel lot-panel (a SlideOver tartalma) ──────────────────────────────────
function ItemLotPanel({
  item
}) {
  const sim = window.useSim();
  const live = sim.catalog.find(x => x.id === item.id) || item;
  const wh = live.worldExt.warehouse;
  const lots = (wh.lots || []).slice().sort((a, b) => window.WH_ZONE_ORDER.indexOf(a.zone) - window.WH_ZONE_ORDER.indexOf(b.zone));
  const [minEdit, setMinEdit] = useStateWH(false);
  const [minVal, setMinVal] = useStateWH(String(wh.min));
  const [actLot, setActLot] = useStateWH(null); // lotId being acted on
  const [mode, setMode] = useStateWH(null); // reassign | move | adjust

  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Szabad",
    value: `${wh.available}`,
    sub: item.unit,
    tone: "teal"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Foglalt",
    value: `${wh.reserved || 0}`,
    sub: item.unit,
    tone: "stone"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "\xD6sszes",
    value: `${wh.onHand}`,
    sub: item.unit,
    tone: "stone"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-600"
  }, "\xDAjrarendel\xE9si szint (min. szabad k\xE9szlet)"), minEdit ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(WhNumInput, {
    value: minVal,
    onChange: setMinVal,
    className: "w-20"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.sim.setWarehouseStock(item.id, {
        min: Number(minVal) || 0
      });
      setMinEdit(false);
    },
    className: "h-9 px-2.5 rounded-lg bg-teal-700 text-white text-[12px] font-medium"
  }, "Ment\xE9s")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMinVal(String(wh.min));
      setMinEdit(true);
    },
    className: "inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-stone-800 tabular-nums hover:text-teal-700"
  }, wh.min, " ", item.unit, " ", /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 13
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium"
  }, "K\xE9szlet-t\xE9telek (lot) \xB7 ", lots.length)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, lots.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 italic px-1 py-4 text-center"
  }, "Nincs k\xE9szlet-t\xE9tel. V\xE9telezz be a Bev\xE9telez\xE9s k\xE9perny\u0151n."), lots.map(lot => {
    const isAct = actLot === lot.id;
    return /*#__PURE__*/React.createElement("div", {
      key: lot.id,
      className: "rounded-xl border border-stone-200 bg-white overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3 px-3 py-2.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "shrink-0 text-center min-w-[52px]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[15px] font-semibold text-stone-900 tabular-nums leading-none"
    }, lot.qty), /*#__PURE__*/React.createElement("div", {
      className: "text-[9.5px] text-stone-400 mt-0.5"
    }, item.unit)), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 flex-wrap mb-1"
    }, /*#__PURE__*/React.createElement(WhZonePill, {
      zone: lot.zone
    }), lot.projectNo && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-mono"
    }, lot.projectNo), lot.ref && !lot.projectNo && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono"
    }, lot.ref)), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "inventory",
      size: 11,
      className: "text-stone-400"
    }), lot.locText || "— nincs hely —"), lot.docNo && /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: lot.docType === "szamla" ? "receipt" : "file",
      size: 11,
      className: "text-stone-300"
    }), lot.docType === "szamla" ? "Számla" : "Szállítólevél", " ", lot.docNo), (lot.projectName || lot.refLabel) && /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 truncate"
    }, lot.projectName || lot.refLabel)), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setActLot(isAct ? null : lot.id);
        setMode(isAct ? null : "menu");
      },
      className: "shrink-0 w-9 h-9 grid place-items-center rounded-lg hover:bg-stone-100 text-stone-500"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: isAct ? "up" : "down",
      size: 16
    }))), isAct && /*#__PURE__*/React.createElement("div", {
      className: "border-t border-stone-100 bg-stone-50/50 px-3 py-2.5"
    }, mode === "menu" && /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5"
    }, /*#__PURE__*/React.createElement(LotActBtn, {
      icon: "external",
      label: "Z\xF3na mozgat\xE1s",
      onClick: () => setMode("reassign")
    }), /*#__PURE__*/React.createElement(LotActBtn, {
      icon: "inventory",
      label: "\xC1thelyez\xE9s",
      onClick: () => setMode("move")
    }), /*#__PURE__*/React.createElement(LotActBtn, {
      icon: "alert",
      label: "Korrekci\xF3 / selejt",
      onClick: () => setMode("adjust")
    })), mode === "reassign" && /*#__PURE__*/React.createElement(LotReassign, {
      item: item,
      lot: lot,
      onDone: () => {
        setActLot(null);
        setMode(null);
      }
    }), mode === "move" && /*#__PURE__*/React.createElement(LotMove, {
      item: item,
      lot: lot,
      onDone: () => {
        setActLot(null);
        setMode(null);
      }
    }), mode === "adjust" && /*#__PURE__*/React.createElement(LotAdjust, {
      item: item,
      lot: lot,
      onDone: () => {
        setActLot(null);
        setMode(null);
      }
    })));
  }))));
}
function Stat({
  label,
  value,
  sub,
  tone = "stone"
}) {
  const tones = {
    teal: "text-teal-700",
    stone: "text-stone-800"
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 mb-0.5"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: `text-[18px] font-semibold tabular-nums ${tones[tone]}`
  }, value, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 font-normal ml-0.5"
  }, sub)));
}
function LotActBtn({
  icon,
  label,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-stone-200 text-[12px] font-medium text-stone-700 hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 14
  }), label);
}

// Zóna-mozgatás (rész vagy egész lot → másik zóna)
function LotReassign({
  item,
  lot,
  onDone
}) {
  const targets = (window.WH_ZONE_MOVES || {})[lot.zone] || [];
  const [toZone, setToZone] = useStateWH(targets[0] || "general");
  const [qty, setQty] = useStateWH(String(lot.qty));
  const [projectNo, setProjectNo] = useStateWH("");
  const [ref, setRef] = useStateWH("");
  const needProject = toZone === "project_locked";
  const needRef = toZone === "shop_reserved" || toZone === "commissioned" || toZone === "shippable";
  const go = () => {
    window.sim.whReassignLot(item.id, lot.id, Number(qty) || 0, toZone, {
      projectNo,
      ref,
      refLabel: ref
    });
    onDone();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "C\xE9l z\xF3na"), /*#__PURE__*/React.createElement("select", {
    value: toZone,
    onChange: e => setToZone(e.target.value),
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500"
  }, targets.map(z => /*#__PURE__*/React.createElement("option", {
    key: z,
    value: z
  }, window.WH_ZONES[z].label)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Mennyis\xE9g (max ", lot.qty, ")"), /*#__PURE__*/React.createElement(WhNumInput, {
    value: qty,
    onChange: setQty,
    max: lot.qty,
    className: "w-full"
  }))), needProject && /*#__PURE__*/React.createElement("input", {
    value: projectNo,
    onChange: e => setProjectNo(e.target.value),
    placeholder: "Projektsz\xE1m (pl. PRJ-2426-012)",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500 bg-white"
  }), needRef && /*#__PURE__*/React.createElement("input", {
    value: ref,
    onChange: e => setRef(e.target.value),
    placeholder: "Rendel\xE9s / hivatkoz\xE1s (opcion\xE1lis)",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-1.5 pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onDone,
    className: "h-9 px-3 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: go,
    className: "h-9 px-3.5 rounded-lg bg-teal-700 text-white text-[12px] font-medium"
  }, "Mozgat")));
}
function LotMove({
  item,
  lot,
  onDone
}) {
  const [locId, setLocId] = useStateWH(lot.locId || "");
  const go = () => {
    const loc = window.sim.whLocById(locId);
    window.sim.whMoveLotLocation(item.id, lot.id, locId, loc ? loc.text : "");
    onDone();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block"
  }, "\xDAj rakt\xE1rhely"), /*#__PURE__*/React.createElement(WhLocationSelect, {
    value: locId,
    onChange: setLocId
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-1.5 pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onDone,
    className: "h-9 px-3 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: go,
    disabled: !locId,
    className: `h-9 px-3.5 rounded-lg text-[12px] font-medium ${locId ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-400"}`
  }, "\xC1thelyez")));
}
function LotAdjust({
  item,
  lot,
  onDone
}) {
  const [qty, setQty] = useStateWH(String(lot.qty));
  const [reason, setReason] = useStateWH("");
  const go = () => {
    window.sim.whAdjustLot(item.id, lot.id, Number(qty) || 0, reason || "Leltárkorrekció");
    onDone();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "\xDAj mennyis\xE9g"), /*#__PURE__*/React.createElement(WhNumInput, {
    value: qty,
    onChange: setQty,
    className: "w-full"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10.5px] text-stone-500 block mb-1"
  }, "Indok"), /*#__PURE__*/React.createElement("input", {
    value: reason,
    onChange: e => setReason(e.target.value),
    placeholder: "T\xF6r\xE9s / lelt\xE1rhi\xE1ny\u2026",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-1.5 pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onDone,
    className: "h-9 px-3 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: go,
    className: "h-9 px-3.5 rounded-lg bg-rose-600 text-white text-[12px] font-medium"
  }, "R\xF6gz\xEDt")));
}
Object.assign(window, {
  WhZonePill,
  WhTrendPill,
  WhConsumerPill,
  WhZoneBar,
  WhNumInput,
  WhLocationSelect,
  WarehouseInventory
});
})();
