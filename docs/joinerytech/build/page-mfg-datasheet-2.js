/* AUTO-GENERATED from page-mfg-datasheet-2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-mfg-datasheet-2.jsx — MdElementSheet
//
//   EGY elem teljes gyártás-adatlapja (fullscreen). A bútorsor-elemet egy
//   egy-tételes pszeudo-projektté képezi, és a MfgPrep motorral feloldja a
//   woodwork_domain.md 10-részes dokumentáció releváns részeit:
//     Áttekintés · Szabásjegyzék · Anyagnorma · Szerelvény · Útvonal · Munkaóra
//   Mind SZÁMÍTOTT (a megjelenítés a tényleges, konfigurált méretekkel).
//   Belépő: a Gyártás-adatlap elem-kártyájáról (window.MdElementSheet).
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateMD2
} = React;
const MD_KIND_LABEL = {
  sheet: "Lapanyag",
  solidwood: "Tömörfa",
  veneer: "Furnér",
  edgeband: "Élzáró"
};
const MD_KIND_TONE = {
  sheet: "bg-sky-50 text-sky-700 border-sky-200",
  solidwood: "bg-amber-50 text-amber-700 border-amber-200",
  veneer: "bg-violet-50 text-violet-700 border-violet-200",
  edgeband: "bg-stone-100 text-stone-600 border-stone-200"
};
const MD_TABS = [{
  key: "overview",
  hu: "Áttekintés",
  icon: "box"
}, {
  key: "cut",
  hu: "Szabásjegyzék",
  icon: "cut"
}, {
  key: "material",
  hu: "Anyagnorma",
  icon: "layers"
}, {
  key: "hardware",
  hu: "Szerelvény",
  icon: "bolt"
}, {
  key: "routing",
  hu: "Útvonal",
  icon: "workflow"
}, {
  key: "labor",
  hu: "Munkaóra",
  icon: "cpu"
}];
function MdElementSheet({
  comp,
  entry,
  onClose
}) {
  const [tab, setTab] = useStateMD2("overview");
  const {
    mapped,
    prep,
    comp: completeness
  } = entry;
  const it = mapped._it;
  const ep = window.mdElementProject(comp, mapped);
  const routing = (() => {
    try {
      return window.MfgPrep.routingPlan(ep);
    } catch (e) {
      return [];
    }
  })();
  const routes = (() => {
    try {
      return window.MfgPrep.partRoutes(ep);
    } catch (e) {
      return null;
    }
  })();
  const calc = (() => {
    try {
      return window.MfgPrep.priceCalc(prep);
    } catch (e) {
      return null;
    }
  })();
  const di = prep && prep.items && prep.items[0];
  React.useEffect(() => {
    const p = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = p;
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[60] flex flex-col bg-stone-50",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("header", {
    className: "shrink-0 bg-white border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1080px] mx-auto px-4 md:px-6 pt-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "shrink-0 w-9 h-9 grid place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 mt-0.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 16,
    className: "rotate-180"
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[16px] font-semibold text-stone-900 tracking-tight truncate"
  }, it.tplName), /*#__PURE__*/React.createElement(window.MdTplPill, {
    tplId: it.tplId
  }), /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10px] font-medium ${completeness.ready ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: completeness.ready ? "check" : "alert",
    size: 10
  }), completeness.ready ? "kész" : `${completeness.missing.length} hiány`)), /*#__PURE__*/React.createElement("div", {
    className: "mt-1"
  }, /*#__PURE__*/React.createElement(window.MdCrumb, {
    segs: [{
      v: comp.room
    }, {
      v: it.catName
    }, {
      v: it.tplName
    }]
  }))), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 hidden sm:flex flex-col items-end leading-tight"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] uppercase tracking-wide text-stone-400 font-medium"
  }, "\xD6nk\xF6lts\xE9g"), /*#__PURE__*/React.createElement("span", {
    className: "text-[15px] font-semibold text-stone-900 tabular-nums"
  }, window.mdHuf(prep.totals.grand)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 mt-3 overflow-x-auto"
  }, MD_TABS.map(tb => /*#__PURE__*/React.createElement("button", {
    key: tb.key,
    onClick: () => setTab(tb.key),
    className: `h-9 px-3 rounded-t-lg text-[12px] font-medium inline-flex items-center gap-1.5 border-b-2 whitespace-nowrap ${tab === tb.key ? "border-amber-500 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: tb.icon,
    size: 13
  }), tb.hu))))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1080px] mx-auto px-4 md:px-6 py-5"
  }, tab === "overview" && /*#__PURE__*/React.createElement(MdOverview, {
    comp: comp,
    it: it,
    di: di,
    prep: prep,
    completeness: completeness,
    calc: calc,
    routing: routing
  }), tab === "cut" && /*#__PURE__*/React.createElement(MdCutTab, {
    prep: prep
  }), tab === "material" && /*#__PURE__*/React.createElement(MdMaterialTab, {
    prep: prep
  }), tab === "hardware" && /*#__PURE__*/React.createElement(MdHardwareTab, {
    prep: prep,
    di: di
  }), tab === "routing" && /*#__PURE__*/React.createElement(MdRoutingTab, {
    routing: routing,
    routes: routes
  }), tab === "labor" && /*#__PURE__*/React.createElement(MdLaborTab, {
    prep: prep
  }))));
}

// ── panel-keret ────────────────────────────────────────────────────────────
function MdCard({
  title,
  icon,
  sub,
  right,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-stone-200 bg-white overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 min-w-0"
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 14,
    className: "text-amber-500 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900 truncate"
  }, title), sub && /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400 truncate"
  }, "\xB7 ", sub)), right), children);
}

// ════════════════════════════════════════════════════════════════════════════
//  ÁTTEKINTÉS
// ════════════════════════════════════════════════════════════════════════════
function MdOverview({
  comp,
  it,
  di,
  prep,
  completeness,
  calc,
  routing
}) {
  const t = prep.totals;
  const sell = (it.unitPrice || 0) * (it.qty || 1);
  const margin = sell > 0 ? Math.round((1 - t.grand / sell) * 100) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-2 space-y-4"
  }, /*#__PURE__*/React.createElement(MdCard, {
    title: "Konfigur\xE1ci\xF3",
    icon: "settings"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-x-4 gap-y-2.5 p-4"
  }, [["Kategória (csoport)", di ? di.catName : it.catName], ["Kivitel (stílus)", di ? di.styleName : it.styleName], ["Műszaki előírás", di ? di.techName : it.techName], ["Sablon", `${di ? di.tplName : it.tplName} · ${di ? di.tplId : it.tplId}`], ["Befoglaló méret", it.dims], ["Felfüggesztés", (window.MOUNT_META[it.mount] || {}).label || "—"], ["Darab", `${it.qty} db`], ["Vasalat-márka", di ? di.brand : "—"]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400"
  }, k), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-800 font-medium truncate"
  }, v || "—"))))), /*#__PURE__*/React.createElement(MdCard, {
    title: "\xD6nk\xF6lts\xE9g-bont\xE1s",
    icon: "briefcase",
    sub: "anyag + vasalat + munka"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-2"
  }, [["Anyag", t.materialCost, "layers"], ["Vasalat", t.hardwareCost, "bolt"], ["Munka", t.laborCost, "cpu"]].map(([k, v, ic]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 13,
    className: "text-stone-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-600 flex-1"
  }, k), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-medium text-stone-900 tabular-nums"
  }, window.mdHuf(v)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 pt-2 border-t border-stone-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-900 flex-1"
  }, "\xD6nk\xF6lts\xE9g (\u03A3)"), /*#__PURE__*/React.createElement("span", {
    className: "text-[14px] font-bold text-stone-900 tabular-nums"
  }, window.mdHuf(t.grand))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 flex-1"
  }, "Elad\xE1si \xE1r (konfigb\xF3l)"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-700 tabular-nums"
  }, window.mdHuf(sell)), margin != null && /*#__PURE__*/React.createElement("span", {
    className: `ml-1 px-1.5 h-5 inline-flex items-center rounded-md text-[10px] font-semibold ${margin >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`
  }, margin >= 0 ? "+" : "", margin, "% fedezet")))), calc && calc.full && /*#__PURE__*/React.createElement(MdCard, {
    title: "K\xE9tszint\u0171 \xE1rkalkul\xE1ci\xF3",
    icon: "cpu",
    sub: "woodwork \xA710 \u2014 \xF6sszetett (nett\xF3 \u2192 \xE1fa)"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 grid sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px]"
  }, [["Közvetlen költség", calc.full.kozvetlen], [`Általános (${calc.full.overheadPct}%)`, calc.full.altalanos], ["Önköltség", calc.full.onkoltseg], [`Nyereség (${calc.full.profitPct}%)`, calc.full.nyereseg], ["Nettó ár", calc.full.nettoAr], [`Bruttó (+${calc.full.vatPct}% áfa)`, calc.full.brutto]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: `flex items-center justify-between ${i >= 4 ? "font-semibold text-stone-900" : "text-stone-600"}`
  }, /*#__PURE__*/React.createElement("span", null, k), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, window.mdHuf(v))))))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(MdCard, {
    title: "K\xE9sz\xFClts\xE9g",
    icon: "check",
    sub: "kiad\xE1shoz"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-1.5"
  }, completeness.checks.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.key,
    className: "flex items-center gap-2 text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-4 h-4 rounded grid place-items-center text-white text-[10px] ${c.ok ? "bg-emerald-500" : "bg-stone-300"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: c.ok ? "check" : "minus",
    size: 10
  })), /*#__PURE__*/React.createElement("span", {
    className: c.ok ? "text-stone-600" : "text-stone-800 font-medium"
  }, c.label))), !completeness.ready && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window._engineerOpen = di ? di.tplId : it.tplId;
      window.navigateTo && window.navigateTo("design", "engineer");
    },
    className: "mt-2 w-full h-9 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[12px] font-medium hover:bg-amber-100 inline-flex items-center justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ruler",
    size: 13
  }), "Megnyit\xE1s a M\u0171szaki tervez\xE9sben"))), /*#__PURE__*/React.createElement(MdCard, {
    title: "Mennyis\xE9gek",
    icon: "box"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 grid grid-cols-2 gap-3"
  }, [["Alkatrész", prep.qty.parts], ["Lapanyag", `${t.sheets} tábla`], ["Tömörfa", `${window.mdN1(t.volumeM3)} m³`], ["Élzárás", `${window.mdN1(prep.qty.edgeM)} fm`], ["Vasalat", prep.hardware.reduce((n, h) => n + h.qty, 0)], ["Munkaóra", `${window.mdN1(prep.labor.totalHours)} ó`]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400"
  }, k), /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 tabular-nums"
  }, v)))))));
}

// ════════════════════════════════════════════════════════════════════════════
//  SZABÁSJEGYZÉK
// ════════════════════════════════════════════════════════════════════════════
function MdCutTab({
  prep
}) {
  const rows = prep.cutlist || [];
  return /*#__PURE__*/React.createElement(MdCard, {
    title: "Alkatr\xE9sz- + szab\xE1sjegyz\xE9k",
    icon: "cut",
    sub: `${rows.length} sor · ${prep.qty.parts} db`
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-[11.5px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement("th", {
    className: "text-left font-medium px-4 py-2"
  }, "Alkatr\xE9sz"), /*#__PURE__*/React.createElement("th", {
    className: "text-left font-medium px-2 py-2"
  }, "Anyag"), /*#__PURE__*/React.createElement("th", {
    className: "text-right font-medium px-2 py-2"
  }, "Db"), /*#__PURE__*/React.createElement("th", {
    className: "text-right font-medium px-2 py-2"
  }, "M\xE9ret (mm)"), /*#__PURE__*/React.createElement("th", {
    className: "text-right font-medium px-2 py-2"
  }, "Fel\xFClet"), /*#__PURE__*/React.createElement("th", {
    className: "text-right font-medium px-2 py-2"
  }, "\xC9l (fm)"), /*#__PURE__*/React.createElement("th", {
    className: "text-center font-medium px-3 py-2"
  }, "\xC9l-kial."))), /*#__PURE__*/React.createElement("tbody", null, rows.map((p, i) => {
    const gv = (p.miterShort || 0) + (p.miterLong || 0);
    return /*#__PURE__*/React.createElement("tr", {
      key: i,
      className: "border-b border-stone-50 last:border-0 hover:bg-stone-50/50"
    }, /*#__PURE__*/React.createElement("td", {
      className: "px-4 py-2 font-medium text-stone-800"
    }, p.name), /*#__PURE__*/React.createElement("td", {
      className: "px-2 py-2 text-stone-500 truncate max-w-[160px]"
    }, p.matName), /*#__PURE__*/React.createElement("td", {
      className: "px-2 py-2 text-right tabular-nums text-stone-700"
    }, p.qty), /*#__PURE__*/React.createElement("td", {
      className: "px-2 py-2 text-right tabular-nums font-mono text-stone-700"
    }, p.w, " \xD7 ", p.h), /*#__PURE__*/React.createElement("td", {
      className: "px-2 py-2 text-right tabular-nums text-stone-500"
    }, window.mdN1(p.area), " m\xB2"), /*#__PURE__*/React.createElement("td", {
      className: "px-2 py-2 text-right tabular-nums text-stone-500"
    }, window.mdN1(p.edgeM)), /*#__PURE__*/React.createElement("td", {
      className: "px-3 py-2 text-center"
    }, gv > 0 ? /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center px-1.5 h-5 rounded bg-rose-50 text-rose-600 border border-rose-200 text-[9.5px] font-semibold"
    }, "GV ", p.miterShort || 0, "R", p.miterLong || 0, "H") : /*#__PURE__*/React.createElement("span", {
      className: "text-stone-300"
    }, "\u2014")));
  }), rows.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: 7,
    className: "px-4 py-8 text-center text-[12px] text-stone-400"
  }, "Nincs feloldott alkatr\xE9sz \u2014 a sablon nincs kiadva."))))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2 bg-stone-50/60 border-t border-stone-100 text-[10.5px] text-stone-400"
  }, "A m\xE9ret a T\xC9NYLEGES konfigur\xE1lt geometri\xE1b\xF3l (CPQ vars) feloldva. GV = g\xE9rv\xE1g\xE1s/sz\xF6gbe v\xE1gott \xE9l (r\xF6vid R / hossz\xFA H)."));
}

// ════════════════════════════════════════════════════════════════════════════
//  ANYAGNORMA
// ════════════════════════════════════════════════════════════════════════════
function MdMaterialTab({
  prep
}) {
  const sheet = (prep.materials || []).filter(m => m.kind !== "solidwood");
  const wood = (prep.materials || []).filter(m => m.kind === "solidwood");
  const aux = prep.aux;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(MdCard, {
    title: "Anyagnorma \u2014 lapanyag",
    icon: "layers",
    sub: `${prep.totals.sheets} tábla`
  }, /*#__PURE__*/React.createElement(MdMatTable, {
    rows: sheet,
    kind: "sheet"
  })), wood.length > 0 && /*#__PURE__*/React.createElement(MdCard, {
    title: "Anyagnorma \u2014 t\xF6m\xF6rfa",
    icon: "layers",
    sub: `${window.mdN1(prep.totals.volumeM3)} m³ · fafaj-függő hulladék%`
  }, /*#__PURE__*/React.createElement(MdMatTable, {
    rows: wood,
    kind: "solidwood"
  })), aux && (aux.glues.length > 0 || aux.finishes.length > 0 || aux.abrasive) && /*#__PURE__*/React.createElement(MdCard, {
    title: "Seg\xE9danyagnorma",
    icon: "box",
    sub: "woodwork \xA76 \u2014 ragaszt\xF3 / fel\xFClet / csiszol\xF3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-1.5 text-[11.5px]"
  }, [...aux.glues, ...aux.finishes].map((g, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-700 flex-1 truncate"
  }, g.name), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 text-[10px] truncate hidden sm:inline"
  }, g.basis), /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-900 tabular-nums shrink-0"
  }, g.totalG, " g"))), aux.abrasive && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-700 flex-1"
  }, "Csiszol\xF3anyag"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 font-mono text-[10.5px]"
  }, (aux.abrasive.grits || []).join(" · "))))));
}
function MdMatTable({
  rows,
  kind
}) {
  const coverTone = {
    ok: "bg-emerald-50 text-emerald-700",
    partial: "bg-amber-50 text-amber-700",
    short: "bg-rose-50 text-rose-600"
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-[11.5px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement("th", {
    className: "text-left font-medium px-4 py-2"
  }, "Anyag"), /*#__PURE__*/React.createElement("th", {
    className: "text-right font-medium px-2 py-2"
  }, "Nett\xF3"), /*#__PURE__*/React.createElement("th", {
    className: "text-right font-medium px-2 py-2"
  }, "Hullad\xE9k"), /*#__PURE__*/React.createElement("th", {
    className: "text-right font-medium px-2 py-2"
  }, "Sz\xFCks\xE9glet"), /*#__PURE__*/React.createElement("th", {
    className: "text-right font-medium px-2 py-2"
  }, "K\xE9szlet"), /*#__PURE__*/React.createElement("th", {
    className: "text-right font-medium px-4 py-2"
  }, "K\xF6lts\xE9g"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((m, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    className: "border-b border-stone-50 last:border-0"
  }, /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-800"
  }, m.name), /*#__PURE__*/React.createElement("span", {
    className: `ml-1.5 inline-flex items-center px-1 h-4 rounded border text-[9px] font-medium ${MD_KIND_TONE[m.kind] || ""}`
  }, MD_KIND_LABEL[m.kind] || m.kind)), /*#__PURE__*/React.createElement("td", {
    className: "px-2 py-2 text-right tabular-nums text-stone-500"
  }, kind === "solidwood" ? `${window.mdN1(m.netM3)} m³` : `${window.mdN1(m.area)} m²`), /*#__PURE__*/React.createElement("td", {
    className: "px-2 py-2 text-right tabular-nums text-stone-500"
  }, m.wastePct, "%", kind === "solidwood" && /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, " (", m.species, ")")), /*#__PURE__*/React.createElement("td", {
    className: "px-2 py-2 text-right tabular-nums font-medium text-stone-900"
  }, m.qtyLabel), /*#__PURE__*/React.createElement("td", {
    className: "px-2 py-2 text-right"
  }, m.onHand == null ? /*#__PURE__*/React.createElement("span", {
    className: "text-stone-300"
  }, "\u2014") : /*#__PURE__*/React.createElement("span", {
    className: `px-1.5 h-5 inline-flex items-center rounded text-[10px] font-medium ${coverTone[m.cover] || ""}`
  }, m.onHand, " ", m.unit)), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-2 text-right tabular-nums text-stone-700"
  }, window.mdHuf(m.cost)))), rows.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: 6,
    className: "px-4 py-6 text-center text-[12px] text-stone-400"
  }, "Nincs ilyen anyag enn\xE9l az elemn\xE9l.")))));
}

// ════════════════════════════════════════════════════════════════════════════
//  SZERELVÉNYJEGYZÉK
// ════════════════════════════════════════════════════════════════════════════
function MdHardwareTab({
  prep,
  di
}) {
  const rows = prep.hardware || [];
  return /*#__PURE__*/React.createElement(MdCard, {
    title: "Szerelv\xE9nyjegyz\xE9k",
    icon: "bolt",
    sub: `${rows.reduce((n, h) => n + h.qty, 0)} db · márka: ${di ? di.brand : "—"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-[11.5px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement("th", {
    className: "text-left font-medium px-4 py-2"
  }, "Megnevez\xE9s"), /*#__PURE__*/React.createElement("th", {
    className: "text-left font-medium px-2 py-2"
  }, "M\xE1rka"), /*#__PURE__*/React.createElement("th", {
    className: "text-right font-medium px-2 py-2"
  }, "Db"), /*#__PURE__*/React.createElement("th", {
    className: "text-right font-medium px-2 py-2"
  }, "Egys\xE9g\xE1r"), /*#__PURE__*/React.createElement("th", {
    className: "text-right font-medium px-4 py-2"
  }, "K\xF6lts\xE9g"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((h, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    className: "border-b border-stone-50 last:border-0"
  }, /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-2 font-medium text-stone-800"
  }, h.name), /*#__PURE__*/React.createElement("td", {
    className: "px-2 py-2 text-stone-500"
  }, h.brand || "—"), /*#__PURE__*/React.createElement("td", {
    className: "px-2 py-2 text-right tabular-nums text-stone-700"
  }, h.qty, " ", h.unit), /*#__PURE__*/React.createElement("td", {
    className: "px-2 py-2 text-right tabular-nums text-stone-500"
  }, window.mdHuf(h.unitPrice)), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-2 text-right tabular-nums text-stone-700"
  }, window.mdHuf(h.cost)))), rows.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: 5,
    className: "px-4 py-8 text-center text-[12px] text-stone-400"
  }, "Nincs vasalat enn\xE9l az elemn\xE9l."))))));
}

// ════════════════════════════════════════════════════════════════════════════
//  ÚTVONAL — állomás-stepper + per-alkatrész folyamatábra
// ════════════════════════════════════════════════════════════════════════════
function MdRoutingTab({
  routing,
  routes
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(MdCard, {
    title: "Technol\xF3giai \xFAtvonal \u2014 \xE1llom\xE1sok",
    icon: "workflow",
    sub: `${routing.length} állomás`
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 flex items-stretch gap-1.5 overflow-x-auto"
  }, routing.map((r, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: r.kind
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    className: "self-center text-stone-300 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  })), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 min-w-[120px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full",
    style: {
      background: r.accent
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] font-semibold text-stone-800"
  }, r.kindLabel)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-500 mt-1"
  }, r.partCount, " alkatr\xE9sz \xB7 ", window.mdN1(r.hours), " \xF3"), /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] text-stone-400 font-mono truncate"
  }, r.machineName), r.opStepCount > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 flex flex-wrap gap-1"
  }, r.opSteps.slice(0, 6).map(o => /*#__PURE__*/React.createElement("span", {
    key: o.key,
    title: o.label,
    className: `px-1 h-4 inline-flex items-center rounded text-[8.5px] font-medium ${o.front ? "bg-amber-100 text-amber-700" : o.merge ? "bg-violet-100 text-violet-700" : "bg-stone-200 text-stone-600"}`
  }, o.short || o.label)))))), routing.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs \xFAtvonal \u2014 a sablon nincs kiadva."))), routes && routes.parts && routes.parts.length > 0 && /*#__PURE__*/React.createElement(MdCard, {
    title: "Per-alkatr\xE9sz folyamat\xE1bra (vonalas)",
    icon: "cut",
    sub: "woodwork \xA711 \u2014 anyagt\xEDpus-vez\xE9relt \xFAtvonal alkatr\xE9szenk\xE9nt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 min-w-[480px]"
  }, routes.parts.map((pt, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-[150px] shrink-0 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-medium text-stone-800 truncate"
  }, pt.name), /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center px-1 h-4 rounded border text-[9px] font-medium ${MD_KIND_TONE[pt.kind] || ""}`
  }, MD_KIND_LABEL[pt.kind] || pt.kind)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 flex-wrap flex-1"
  }, pt.ops.map((opk, j) => {
    const od = (window.WW_OP_BY_KEY || {})[opk] || {
      short: opk,
      label: opk
    };
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: j
    }, j > 0 && /*#__PURE__*/React.createElement("span", {
      className: "text-stone-300 text-[9px]"
    }, "\u203A"), /*#__PURE__*/React.createElement("span", {
      title: od.label,
      className: `px-1.5 h-5 inline-flex items-center rounded text-[9.5px] font-medium ${od.front ? "bg-amber-50 text-amber-700 border border-amber-200" : od.merge ? "bg-violet-50 text-violet-700 border border-violet-200" : "bg-stone-100 text-stone-600"}`
    }, od.short || od.label));
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2 bg-stone-50/60 border-t border-stone-100 text-[10.5px] text-stone-400 flex items-center gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded bg-amber-200"
  }), "t\xF6m\xF6rfa front-end"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded bg-violet-200"
  }), "\xF6sszevezet\xE9s / identit\xE1s-v\xE1lt\xE1s"), /*#__PURE__*/React.createElement("span", null, "\xB7 a lap \xE9s a t\xF6m\xF6rfa elt\xE9r\u0151 m\u0171veletsoron megy \xE1t"))));
}

// ════════════════════════════════════════════════════════════════════════════
//  MUNKAÓRA
// ════════════════════════════════════════════════════════════════════════════
function MdLaborTab({
  prep
}) {
  const rows = (prep.labor && prep.labor.rows || []).filter(r => r.hours > 0);
  const total = prep.labor || {
    totalHours: 0,
    leadDays: 0,
    cost: 0
  };
  const maxH = Math.max(1, ...rows.map(r => r.hours));
  return /*#__PURE__*/React.createElement(MdCard, {
    title: "Munkaid\u0151 \u2014 r\xE9szlegenk\xE9nt",
    icon: "cpu",
    sub: `${window.mdN1(total.totalHours)} óra · ~${total.leadDays} nap · ${window.mdHuf(total.cost)}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-2.5"
  }, rows.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.id,
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-full shrink-0",
    style: {
      background: r.color
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-[120px] shrink-0 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-800 truncate"
  }, r.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] text-stone-400 truncate"
  }, (r.machines || []).slice(0, 1).join(", "))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 h-2.5 rounded-full bg-stone-100 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full rounded-full",
    style: {
      width: `${r.hours / maxH * 100}%`,
      background: r.color
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] tabular-nums text-stone-700 w-14 text-right shrink-0"
  }, window.mdN1(r.hours), " \xF3"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] tabular-nums text-stone-400 w-20 text-right shrink-0 hidden sm:inline"
  }, window.mdHuf(r.cost)))), rows.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 text-center py-6"
  }, "Nincs munka\xF3ra-adat."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 pt-2.5 border-t border-stone-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-semibold text-stone-900 flex-1"
  }, "\xD6sszesen"), /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-bold text-stone-900 tabular-nums"
  }, window.mdN1(total.totalHours), " \xF3"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-500 tabular-nums w-20 text-right hidden sm:inline"
  }, window.mdHuf(total.cost)))));
}
window.MdElementSheet = MdElementSheet;
})();
