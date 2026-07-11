/* AUTO-GENERATED from page-rest.jsx */
(function(){
// Pages: Inventory, Procurement, Analytics, Settings
const {
  useState: useStateX
} = React;
function InventoryPage({
  t,
  initialTab
}) {
  const MATERIALS = sim.materials;
  const stockCount = (sim.catalog || []).filter(it => it.active !== false && it.worldExt && it.worldExt.warehouse && !it.worldExt.warehouse.archived).length;
  const [tab, setTab] = useStateX(initialTab || "materials");
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5 w-full sm:w-fit mb-4 overflow-x-auto"
  }, [{
    k: "materials",
    label: "Anyagok",
    count: stockCount
  }, {
    k: "offcuts",
    label: t.inv.offcuts,
    count: 8
  }, {
    k: "movements",
    label: t.inv.movements,
    count: 24
  }].map(x => /*#__PURE__*/React.createElement("button", {
    key: x.k,
    onClick: () => setTab(x.k),
    className: `flex-1 sm:flex-none justify-center px-3 h-8 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap ${tab === x.k ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`
  }, x.label, /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] tabular-nums ${tab === x.k ? "text-white/60" : "text-stone-400"}`
  }, x.count)))), tab === "materials" && (window.WarehouseStockTab ? /*#__PURE__*/React.createElement(WarehouseStockTab, {
    embedded: true
  }) : null), tab === "offcuts" && /*#__PURE__*/React.createElement(OffcutsPanel, null), tab === "movements" && (() => {
    const rows = [{
      date: "2026-04-27 14:32",
      type: "Kivét",
      src: "CP-184-A",
      who: "Nagy J.",
      mat: "Bükk 18mm 2440×1830",
      qty: -8,
      unit: "tábla"
    }, {
      date: "2026-04-27 09:15",
      type: "Bevét",
      src: "PO-2426-088",
      who: "Raktár",
      mat: "MDF 19mm 2440×1830",
      qty: +50,
      unit: "tábla"
    }, {
      date: "2026-04-26 16:48",
      type: "Maradék",
      src: "CP-184-A",
      who: "Nagy J.",
      mat: "Bükk 18mm 1200×380 ",
      qty: +1,
      unit: "darab"
    }, {
      date: "2026-04-26 11:02",
      type: "Kivét",
      src: "CP-182-A",
      who: "Tóth K.",
      mat: "Tölgy 40mm 2440×1830",
      qty: -22,
      unit: "tábla"
    }, {
      date: "2026-04-25 13:20",
      type: "Bevét",
      src: "PO-2426-091",
      who: "Raktár",
      mat: "Tölgy 22mm 2440×1830",
      qty: +30,
      unit: "tábla"
    }, {
      date: "2026-04-25 08:55",
      type: "Korr.",
      src: "Leltár",
      who: "Szabó A.",
      mat: "Csavar Spax 4×40",
      qty: -120,
      unit: "db"
    }];
    const typeTone = type => type === "Bevét" ? "bg-emerald-50 text-emerald-700" : type === "Kivét" ? "bg-stone-100 text-stone-700" : type === "Maradék" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700";
    return /*#__PURE__*/React.createElement(Card, {
      className: "p-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "hidden md:block"
    }, /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-[110px_140px_minmax(0,1fr)_100px_120px_120px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40"
    }, /*#__PURE__*/React.createElement("div", null, "D\xE1tum"), /*#__PURE__*/React.createElement("div", null, "T\xEDpus"), /*#__PURE__*/React.createElement("div", null, "Anyag"), /*#__PURE__*/React.createElement("div", {
      className: "text-right"
    }, "Mennyis\xE9g"), /*#__PURE__*/React.createElement("div", null, "Forr\xE1s / C\xE9l"), /*#__PURE__*/React.createElement("div", null, "Felel\u0151s")), rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "grid grid-cols-[110px_140px_minmax(0,1fr)_100px_120px_120px] gap-3 px-5 py-2.5 border-b border-stone-100 last:border-0 items-center text-[12px]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-mono text-stone-500 text-[11px]"
    }, r.date), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium ${typeTone(r.type)}`
    }, r.type)), /*#__PURE__*/React.createElement("div", {
      className: "text-stone-900 truncate"
    }, r.mat), /*#__PURE__*/React.createElement("div", {
      className: `text-right font-mono tabular-nums font-medium ${r.qty > 0 ? "text-emerald-700" : "text-stone-700"}`
    }, r.qty > 0 ? "+" : "", r.qty, " ", r.unit), /*#__PURE__*/React.createElement("div", {
      className: "font-mono text-[11px] text-teal-700"
    }, r.src), /*#__PURE__*/React.createElement("div", {
      className: "text-stone-600 text-[11.5px]"
    }, r.who)))), /*#__PURE__*/React.createElement("div", {
      className: "md:hidden divide-y divide-stone-100"
    }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "px-4 py-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium ${typeTone(r.type)}`
    }, r.type), /*#__PURE__*/React.createElement("span", {
      className: `font-mono tabular-nums text-[13px] font-semibold ${r.qty > 0 ? "text-emerald-700" : "text-stone-700"}`
    }, r.qty > 0 ? "+" : "", r.qty, " ", r.unit)), /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] text-stone-900 font-medium mt-1.5"
    }, r.mat), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-stone-500"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-mono"
    }, r.date), /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-teal-700"
    }, r.src), /*#__PURE__*/React.createElement("span", null, r.who))))));
  })());
}
function ProcurementPage({
  t
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-12 gap-3"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "lg:col-span-8 p-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-3 border-b border-stone-200/80 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, t.proc.activePO), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus"
  }, t.proc.newPO)), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[100px_minmax(0,1.4fr)_minmax(0,1fr)_60px_90px_120px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-100 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("div", {
    className: "truncate"
  }, "ID"), /*#__PURE__*/React.createElement("div", null, "Sz\xE1ll\xEDt\xF3"), /*#__PURE__*/React.createElement("div", null, "Anyag"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Db"), /*#__PURE__*/React.createElement("div", null, t.common.eta), /*#__PURE__*/React.createElement("div", null, "St\xE1tusz")), ACTIVE_PO.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "grid grid-cols-[100px_minmax(0,1.4fr)_minmax(0,1fr)_60px_90px_120px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center hover:bg-stone-50/60"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-mono text-stone-500 truncate"
  }, p.id), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 truncate"
  }, p.supplier), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-600 truncate"
  }, p.material), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] tabular-nums text-right"
  }, p.qty), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-mono text-stone-500"
  }, p.eta), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: p.status,
    label: t.status[p.status]
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "md:hidden divide-y divide-stone-100"
  }, ACTIVE_PO.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "px-4 py-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-mono text-stone-500"
  }, p.id), /*#__PURE__*/React.createElement(StatusPill, {
    status: p.status,
    label: t.status[p.status]
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 mt-1"
  }, p.supplier), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-600 mt-0.5"
  }, p.material), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4 mt-1.5 text-[11.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums font-medium text-stone-700"
  }, p.qty), " db"), /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, t.common.eta, ": ", p.eta)))))), /*#__PURE__*/React.createElement(Card, {
    className: "lg:col-span-4 p-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-5 py-3 border-b border-stone-200/80 text-[12.5px] font-semibold text-stone-900"
  }, t.proc.suppliers), SUPPLIERS.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.name,
    className: "px-4 md:px-5 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 truncate"
  }, s.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, s.city)), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-amber-600 tabular-nums"
  }, "\u2605 ", s.rating), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 tabular-nums"
  }, s.reliability, "% ", t.proc.reliability.toLowerCase()))), /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 text-[10.5px] text-stone-400 font-mono"
  }, t.proc.lastOrder, ": ", s.lastOrder))))));
}
function AnalyticsPage({
  t
}) {
  const cards = [{
    label: t.ana.waste,
    value: "7.1%",
    delta: -9,
    color: "#0d9488",
    spark: SPARKS.wasteRate
  }, {
    label: t.ana.capacity,
    value: "82%",
    delta: 7,
    color: "#0d9488",
    spark: SPARKS.capacity
  }, {
    label: t.ana.oee,
    value: "81%",
    delta: 4,
    color: "#0d9488",
    spark: SPARKS.oee
  }, {
    label: t.ana.daily,
    value: "284",
    unit: t.common.pieces,
    delta: 12,
    color: "#b45309",
    spark: [240, 252, 261, 268, 274, 279, 284]
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-4 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5"
  }, [t.common.today, t.common.week, t.common.month].map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: `px-2.5 h-7 rounded-md text-[12px] ${i === 1 ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`
  }, p))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "download"
  }, "CSV"), /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "download"
  }, "PDF")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3"
  }, cards.map(c => /*#__PURE__*/React.createElement(Card, {
    key: c.label,
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, c.label), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 flex items-baseline gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[26px] font-semibold tabular-nums text-stone-900"
  }, c.value), c.unit && /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-500"
  }, c.unit)), /*#__PURE__*/React.createElement("div", {
    className: `text-[11px] mt-0.5 inline-flex items-center gap-0.5 ${c.delta >= 0 ? "text-emerald-700" : "text-rose-700"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: c.delta >= 0 ? "up" : "down",
    size: 11
  }), Math.abs(c.delta), "%"), /*#__PURE__*/React.createElement("div", {
    className: "mt-3",
    style: {
      color: c.color
    }
  }, /*#__PURE__*/React.createElement(Sparkline, {
    data: c.spark,
    width: 220,
    height: 48,
    stroke: c.color,
    fill: c.color,
    strokeWidth: 1.8,
    responsive: true
  }))))), /*#__PURE__*/React.createElement(Card, {
    className: "p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900 mb-1"
  }, "G\xE9p-szint\u0171 hullad\xE9k ar\xE1ny (utols\xF3 30 nap)"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mb-4"
  }, "Anyag \xE9s g\xE9p kombin\xE1ci\xF3j\xE1ra lebontva"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, [{
    name: "Holzma HPP380 · Bükk 18mm",
    pct: 6.4
  }, {
    name: "Holzma HPP380 · MDF 19mm",
    pct: 5.2
  }, {
    name: "Biesse Selco · Tölgy 40mm",
    pct: 8.2
  }, {
    name: "Biesse Selco · Tölgy 22mm",
    pct: 7.8
  }, {
    name: "Holzma HPP380 · MDF 16mm",
    pct: 5.9
  }].map((row, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "grid grid-cols-[1fr_60px] gap-3 items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-mono text-stone-700 w-[120px] sm:w-[200px] md:w-[260px] shrink-0 truncate"
  }, row.name), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 h-2 bg-stone-100 rounded-full overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-teal-600",
    style: {
      width: `${row.pct * 8}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] tabular-nums text-stone-700 text-right"
  }, row.pct, "%"))))));
}
function SettingsPage({
  t,
  initialTab
}) {
  const tab = initialTab || "company";
  const setTab = () => {}; // navigation is handled by the sidebar; this is now controlled
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
  }, tab === "company" && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[640px]"
  }, [{
    label: "Cégnév",
    value: "Doorstar Hungary Zrt."
  }, {
    label: "Adószám",
    value: "12345678-2-13"
  }, {
    label: "Cím",
    value: "2600 Vác, Ipari park 14."
  }, {
    label: "Bank",
    value: "OTP · 11774012-12345678"
  }, {
    label: "Kapcsolat",
    value: "info@doorstar.hu"
  }, {
    label: "Telefon",
    value: "+36 27 123 456"
  }].map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 mb-1"
  }, f.label), /*#__PURE__*/React.createElement("input", {
    defaultValue: f.value,
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px]"
  }))))), window.sim.companyProfile && (() => {
    const prof = window.sim.companyProfile();
    const setP = patch => window.sim.setCompanyProfile(patch);
    const TONES = [["közvetlen", "Tegező / közvetlen"], ["hivatalos", "Magázó / hivatalos"], ["szakmai", "Szakmai / tömör"]];
    const chip = active => `h-7 px-2.5 rounded-lg text-[11px] font-medium border transition ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-stone-500 border-stone-200 hover:border-indigo-300"}`;
    return /*#__PURE__*/React.createElement(Card, {
      className: "p-5 max-w-[640px]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] font-semibold text-stone-800"
    }, "C\xE9g-\xF6nk\xE9p \u2014 \xE9rt\xE9krend az \xE9rt\xE9kes\xEDt\xE9snek"), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-500 mt-0.5 mb-3"
    }, "A SAJ\xC1T hangnem\xFCnk \xE9s azok az \xE9rt\xE9kek/\xEDg\xE9retek, amiket minden \xFCgyf\xE9ln\xE9l szem el\u0151tt kell tartani. Ez jelenik meg az \xE9rt\xE9kes\xEDt\u0151nek ir\xE1nymutat\xE1sk\xE9nt."), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2.5"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 mb-1"
    }, "Kommunik\xE1ci\xF3 hangneme (alap\xE9rtelmezett)"), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5"
    }, TONES.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setP({
        tone: prof.tone === k ? "" : k
      }),
      className: chip(prof.tone === k)
    }, l)))), /*#__PURE__*/React.createElement("label", {
      className: "block"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-500"
    }, "\xC9rt\xE9keink / amit \xEDg\xE9r\xFCnk"), /*#__PURE__*/React.createElement("textarea", {
      defaultValue: prof.values || "",
      onBlur: e => setP({
        values: e.target.value
      }),
      rows: 3,
      placeholder: "pl. prec\xEDz hat\xE1rid\u0151, k\xE9zm\u0171ves min\u0151s\xE9g, \u0151szinte \xE1raz\xE1s, helysz\xEDni felm\xE9r\xE9s minden projektn\xE9l\u2026",
      className: "mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400 resize-none leading-relaxed"
    })), /*#__PURE__*/React.createElement("label", {
      className: "block"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-500"
    }, "Amit ker\xFCl\xFCnk / nem v\xE1llalunk"), /*#__PURE__*/React.createElement("textarea", {
      defaultValue: prof.avoid || "",
      onBlur: e => setP({
        avoid: e.target.value
      }),
      rows: 2,
      placeholder: "pl. nem \xEDg\xE9r\xFCnk irre\xE1lis hat\xE1rid\u0151t, nem dolgozunk rajz n\xE9lk\xFCl, nem v\xE1llalunk olcs\xF3 b\xF3vli anyagot\u2026",
      className: "mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400 resize-none leading-relaxed"
    })), /*#__PURE__*/React.createElement("label", {
      className: "block"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-500"
    }, "Pozicion\xE1l\xE1s / amiben er\u0151sek vagyunk"), /*#__PURE__*/React.createElement("textarea", {
      defaultValue: prof.positioning || "",
      onBlur: e => setP({
        positioning: e.target.value
      }),
      rows: 2,
      placeholder: "pl. egyedi konyha \xE9s be\xE9p\xEDtett b\xFAtor, t\xF6m\xF6rfa megmunk\xE1l\xE1s, bels\u0151\xE9p\xEDt\xE9szekkel val\xF3 egy\xFCttm\u0171k\xF6d\xE9s\u2026",
      className: "mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400 resize-none leading-relaxed"
    }))));
  })()), tab === "catalog" && /*#__PURE__*/React.createElement(CatalogPanel, null), tab === "branding" && (window.BrandingPanel ? /*#__PURE__*/React.createElement(window.BrandingPanel, null) : null), tab === "audit" && /*#__PURE__*/React.createElement(AuditPanel, null), tab === "facilities" && /*#__PURE__*/React.createElement(FacilitiesPanel, null), tab === "partners" && /*#__PURE__*/React.createElement(PartnersPanel, {
    lang: t === I18N.en ? "en" : "hu"
  }), tab === "roles" && /*#__PURE__*/React.createElement(RolesPanel, {
    t: t
  }), tab === "authority" && (window.AuthorityPanel ? /*#__PURE__*/React.createElement(window.AuthorityPanel, null) : null), tab === "warehouse" && (window.WarehouseLevelsPanel ? /*#__PURE__*/React.createElement(window.WarehouseLevelsPanel, null) : null), tab === "suppliermap" && (window.SupplierMapPanel ? /*#__PURE__*/React.createElement(window.SupplierMapPanel, null) : null), tab === "workflow" && (window.WorkflowSettings ? /*#__PURE__*/React.createElement(window.WorkflowSettings, {
    t: t
  }) : /*#__PURE__*/React.createElement(StageChainEditor, {
    t: t
  })), tab === "integrations" && /*#__PURE__*/React.createElement(Card, {
    className: "p-8 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-medium text-stone-700"
  }, t.set.tabs[tab]), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-1"
  }, "Tartalom placeholder \u2014 ehhez a f\xFClh\xF6z design-folyamat van.")));
}
window.InventoryPage = InventoryPage;
window.ProcurementPage = ProcurementPage;
window.AnalyticsPage = AnalyticsPage;
window.SettingsPage = SettingsPage;
})();
