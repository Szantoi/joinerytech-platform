/* AUTO-GENERATED from page-mfg-datasheet.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-mfg-datasheet.jsx — Belsőépítészet → GYÁRTÁS-ADATLAP
//
//   Elem-szintű műszaki adat-begyűjtés. Minden konfigurált bútorsor-elem a
//   MŰSZAKI TERVEZÉS kiadott sablonjából feloldja a TELJES gyártás-dokumentációt
//   (alkatrész- + szabásjegyzék · anyagnorma · szerelvényjegyzék · per-alkatrész
//   útvonal · munkaóra), és FELGÖRDÜL a projekt-összesítőbe. A §16 cím-hierarchia
//   (Helyiség › Bútorsor/csoport › Elem › Alkatrész) a gerinc.
//
//   Mind SZÁMÍTOTT (window.MfgPrep — soha ne tárold). A bútorsor elemeit
//   MfgPrep-derive-elhető tételekké képezi (config.picks vars-szal → a TÉNYLEGES
//   konfigurált méretekkel derivál), majd:
//     • per-elem:  MfgPrep.derive(elem-projekt)  → elem-adatlap
//     • projekt:   MfgPrep.derive(bútorsor-projekt) → összesítő
//
//   <MfgDatasheetPage />          // Belsőépítészet → Gyártás-adatlap screen
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateMD,
  useMemo: useMemoMD,
  useEffect: useEffectMD
} = React;
const mdHuf = n => Math.round(n || 0).toLocaleString("hu-HU") + " Ft";
const mdN1 = n => (Math.round((n || 0) * 10) / 10).toLocaleString("hu-HU");

// ── composition elem → MfgPrep-derive-elhető tétel (a vars átmegy a feloldásba) ─
function mdMapItem(it) {
  return {
    id: it.uid,
    name: it.tplName || it.catName || "Elem",
    value: (it.unitPrice || 0) * (it.qty || 1),
    qty: it.qty || 1,
    elemCategory: it.catName,
    config: {
      categoryId: it.categoryId,
      styleId: it.styleId,
      techId: it.techId,
      picks: [{
        tplId: it.tplId,
        qty: it.qty || 1,
        vars: it.vars || {}
      }]
    },
    _it: it
  };
}
const mdCompoProject = comp => ({
  id: comp.id,
  name: comp.name,
  customer: comp.customer || comp.room || comp.name,
  room: comp.room,
  items: (comp.items || []).map(mdMapItem)
});
const mdElementProject = (comp, mapped) => ({
  id: comp.id + "·" + mapped.id,
  name: (comp.room ? comp.room + " — " : "") + mapped.name,
  customer: comp.customer || comp.room || comp.name,
  room: comp.room,
  items: [mapped]
});

// ── sablon-státusz (műhely-sablon vagy gyári bázis) ─────────────────────────
function mdTplStatus(tplId) {
  let studio = [];
  try {
    studio = window.sim.designTemplateList ? window.sim.designTemplateList() : (window.sim.getState() || {}).designTemplates || [];
  } catch (e) {}
  const t = (studio || []).find(x => x.id === tplId);
  if (t) return {
    status: t.status,
    version: t.version,
    studio: true
  };
  const base = (window.PARAM_TEMPLATES || []).find(x => x.id === tplId);
  if (base) return {
    status: "kiadott",
    version: base.version || "—",
    studio: false,
    factory: true
  };
  return {
    status: null,
    version: null,
    studio: false
  };
}
// ── elem készültsége a feloldott prep-ből ──────────────────────────────────
function mdCompleteness(mapped, prep) {
  const tplId = mapped.config.picks[0].tplId;
  const inReg = (window.PARAM_TEMPLATES || []).some(t => t.id === tplId);
  const di = prep && prep.items && prep.items[0];
  const checks = [{
    key: "tpl",
    label: "Kiadott sablon a registryben",
    ok: inReg
  }, {
    key: "parts",
    label: "Alkatrész-lista feloldva",
    ok: !!(prep && prep.cutlist && prep.cutlist.length)
  }, {
    key: "mat",
    label: "Anyagnorma feloldva",
    ok: !!(prep && prep.materials && prep.materials.length)
  }, {
    key: "style",
    label: "Kivitel (stílus) rendelve",
    ok: !!(di && di.styleName && di.styleName !== "—")
  }, {
    key: "labor",
    label: "Munkaóra megvan",
    ok: !!(prep && prep.totals && prep.totals.laborCost > 0)
  }];
  const missing = checks.filter(c => !c.ok);
  return {
    checks,
    missing,
    ready: missing.length === 0
  };
}

// ── kis sablon-státusz pirula ──────────────────────────────────────────────
function MdTplPill({
  tplId
}) {
  const ts = mdTplStatus(tplId);
  const st = (window.TPL_STATUS || {})[ts.status] || {};
  if (!ts.status) return /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 10
  }), "nincs kiadva");
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 px-1.5 h-5 rounded-full border text-[10px] font-medium ${st.pill || "bg-stone-100 text-stone-600 border-stone-200"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${st.dot || "bg-stone-400"}`
  }), st.label || ts.status, ts.factory ? " · gyári" : "", " v", ts.version);
}

// ── §16 cím-hierarchia morzsa ──────────────────────────────────────────────
function MdCrumb({
  segs
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 flex-wrap text-[10.5px] font-mono"
  }, segs.filter(s => s && s.v).map((s, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 9,
    className: "text-stone-300"
  }), /*#__PURE__*/React.createElement("span", {
    className: i === segs.filter(x => x && x.v).length - 1 ? "text-stone-800 font-semibold" : "text-stone-400"
  }, s.v))));
}

// ── kis statisztika-cella ──────────────────────────────────────────────────
function MdStat({
  label,
  value,
  sub,
  accent
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-white p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-500 font-medium"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: `text-[22px] font-semibold tracking-tight tabular-nums mt-0.5 ${accent || "text-stone-900"}`
  }, value), sub && /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-0.5"
  }, sub));
}

// ════════════════════════════════════════════════════════════════════════════
//  BELÉPŐ — bútorsor-választó + összesítő
// ════════════════════════════════════════════════════════════════════════════
function MfgDatasheetPage() {
  const s = useSim();
  const comps = s.compositionList ? s.compositionList() : s.compositions || [];
  // deep-link fogadás (pl. Projekt-összeállítás → elem-adatlap): window._mdOpenCompo
  const [openId, setOpenId] = useStateMD(() => {
    const hint = window._mdOpenCompo;
    window._mdOpenCompo = null;
    return hint && comps.some(c => c.id === hint) ? hint : comps[0] ? comps[0].id : null;
  });
  const comp = comps.find(c => c.id === openId) || null;
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1180px] mx-auto space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-900 to-stone-700 p-5 md:p-6 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-12 h-12 rounded-2xl bg-amber-500/90 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ruler",
    size: 24
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[17px] font-semibold tracking-tight"
  }, "Gy\xE1rt\xE1s-adatlap \u2014 \xF6ssze\xE1ll\xEDt\xE1s a korpuszokb\xF3l"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-300 leading-snug mt-1 max-w-2xl"
  }, "A ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-300 font-medium"
  }, "bels\u0151\xE9p\xEDt\xE9szeti b\xFAtorsor"), " \xE1tvett elemeib\u0151l a m\u0171szaki tervez\xE9s itt oldja fel a teljes gy\xE1rt\xE1s-tud\xE1st \u2014 alkatr\xE9sz- \xE9s szab\xE1sjegyz\xE9k, anyagnorma, szerelv\xE9ny, \xFAtvonal, munka\xF3ra \u2014, \xE9s g\xF6rd\xEDti fel a ", /*#__PURE__*/React.createElement("span", {
    className: "text-amber-300 font-medium"
  }, "projekt-\xF6sszes\xEDt\u0151be"), ". C\xEDm-gerinc: Helyis\xE9g \u203A B\xFAtorsor \u203A Elem \u203A Alkatr\xE9sz.")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "\xC1tvett b\xFAtorsor (bels\u0151\xE9p\xEDt\xE9szeti \xF6ssze\xE1ll\xEDt\xE1s)"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, comps.map(c => {
    const on = c.id === openId;
    const t = window.CompoEngine ? window.CompoEngine.totals(c) : {
      count: 0
    };
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: () => setOpenId(c.id),
      className: `text-left rounded-xl border px-3 py-2 transition ${on ? "border-amber-400 bg-amber-50/60 ring-1 ring-amber-200" : "border-stone-200 bg-white hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-900 leading-tight"
    }, c.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 font-mono"
    }, c.id, " \xB7 ", c.room, " \xB7 ", t.count, " elem"));
  }), comps.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs b\xFAtorsor \u2014 hozz l\xE9tre egyet a B\xFAtorsor k\xE9perny\u0151n."))), comp && /*#__PURE__*/React.createElement(MdCompoDatasheet, {
    comp: comp
  }));
}

// ════════════════════════════════════════════════════════════════════════════
//  EGY BÚTORSOR ADATLAPJA — projekt-összesítő + elem-lista
// ════════════════════════════════════════════════════════════════════════════
function MdCompoDatasheet({
  comp
}) {
  const [openUid, setOpenUid] = useStateMD(null);
  const proj = useMemoMD(() => mdCompoProject(comp), [comp]);
  const prep = useMemoMD(() => {
    try {
      return window.MfgPrep ? window.MfgPrep.derive(proj) : null;
    } catch (e) {
      return null;
    }
  }, [proj]);
  const routing = useMemoMD(() => {
    try {
      return window.MfgPrep ? window.MfgPrep.routingPlan(proj) : [];
    } catch (e) {
      return [];
    }
  }, [proj]);

  // per-elem feloldás (a készültség + összegző chip-ekhez)
  const perItem = useMemoMD(() => proj.items.map(m => {
    let p = null;
    try {
      p = window.MfgPrep.derive(mdElementProject(comp, m));
    } catch (e) {}
    return {
      mapped: m,
      prep: p,
      comp: mdCompleteness(m, p)
    };
  }), [proj, comp]);
  if (!prep) return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-[12.5px] text-stone-500"
  }, "A levezet\u0151 motor nem el\xE9rhet\u0151, vagy az \xF6ssze\xE1ll\xEDt\xE1s \xFCres.");
  const readyN = perItem.filter(x => x.comp.ready).length;
  const totalN = perItem.length;
  const t = prep.totals;
  const openItem = perItem.find(x => x.mapped.id === openUid) || null;

  // csoportosítás kategória (= §16 „Csoport") szerint
  const groups = {};
  perItem.forEach(x => {
    const g = x.mapped._it.catName || "Egyéb";
    (groups[g] = groups[g] || []).push(x);
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, openItem && window.MdElementSheet && /*#__PURE__*/React.createElement(window.MdElementSheet, {
    comp: comp,
    entry: openItem,
    onClose: () => setOpenUid(null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold text-stone-900 tracking-tight"
  }, comp.name), /*#__PURE__*/React.createElement(MdCrumb, {
    segs: [{
      v: comp.customer || comp.id
    }, {
      v: comp.room
    }, {
      v: comp.name
    }]
  })), /*#__PURE__*/React.createElement("div", {
    className: `inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11.5px] font-medium ${readyN === totalN ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: readyN === totalN ? "check" : "alert",
    size: 13
  }), readyN, "/", totalN, " elem gy\xE1rt\xE1sra k\xE9sz")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 12,
    className: "text-amber-500"
  }), "Projekt-\xF6sszes\xEDt\u0151 \u2014 minden elemb\u0151l felg\xF6rd\xEDtve"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5"
  }, /*#__PURE__*/React.createElement(MdStat, {
    label: "Elem",
    value: prep.qty.units,
    sub: `${totalN} féle`
  }), /*#__PURE__*/React.createElement(MdStat, {
    label: "Alkatr\xE9sz",
    value: prep.qty.parts,
    sub: `${prep.cutlist.length} sor`
  }), /*#__PURE__*/React.createElement(MdStat, {
    label: "Lapanyag",
    value: t.sheets,
    sub: "t\xE1bla"
  }), /*#__PURE__*/React.createElement(MdStat, {
    label: "T\xF6m\xF6rfa",
    value: mdN1(t.volumeM3),
    sub: "m\xB3"
  }), /*#__PURE__*/React.createElement(MdStat, {
    label: "Vasalat",
    value: prep.hardware.reduce((n, h) => n + h.qty, 0),
    sub: `${prep.hardware.length} féle`
  }), /*#__PURE__*/React.createElement(MdStat, {
    label: "Munka\xF3ra",
    value: mdN1(prep.labor.totalHours),
    sub: `~${t.leadDays} nap`
  }), /*#__PURE__*/React.createElement(MdStat, {
    label: "\xD6nk\xF6lts\xE9g",
    value: mdHuf(t.grand),
    accent: "text-stone-900",
    sub: `él ${mdN1(prep.qty.edgeM)} fm`
  }))), routing.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-stone-200 bg-white p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-semibold text-stone-900 mb-3 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "workflow",
    size: 13,
    className: "text-teal-600"
  }), "Technol\xF3giai \xFAtvonal (anyagt\xEDpus-vez\xE9relt)"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-stretch gap-1.5 overflow-x-auto pb-1"
  }, routing.map((r, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: r.kind
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    className: "self-center text-stone-300 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  })), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 min-w-[112px]"
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
  }, r.partCount, " alkatr\xE9sz \xB7 ", mdN1(r.hours), " \xF3"), /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] text-stone-400 font-mono truncate"
  }, r.machineName)))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Elemek \u2014 kattints a teljes adatlap\xE9rt"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, Object.entries(groups).map(([g, rows]) => /*#__PURE__*/React.createElement("div", {
    key: g
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-medium text-stone-600 mb-1.5 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "box",
    size: 12,
    className: "text-stone-400"
  }), g, " ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-normal"
  }, "\xB7 ", rows.length, " elem")), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-2.5"
  }, rows.map(x => /*#__PURE__*/React.createElement(MdElementRow, {
    key: x.mapped.id,
    comp: comp,
    entry: x,
    onOpen: () => setOpenUid(x.mapped.id)
  }))))))));
}

// ── egy elem-kártya a listában ─────────────────────────────────────────────
function MdElementRow({
  comp,
  entry,
  onOpen
}) {
  const {
    mapped,
    prep,
    comp: c
  } = entry;
  const it = mapped._it;
  const di = prep && prep.items && prep.items[0];
  const t = prep ? prep.totals : null;
  return /*#__PURE__*/React.createElement("button", {
    onClick: onOpen,
    className: "text-left rounded-2xl border border-stone-200 bg-white p-3.5 hover:border-amber-300 hover:shadow-sm transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 leading-tight truncate"
  }, it.tplName), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 font-mono mt-0.5"
  }, it.dims, " \xB7 ", (window.MOUNT_META[it.mount] || {}).label || "", " \xB7 ", it.qty, " db")), /*#__PURE__*/React.createElement("span", {
    className: `shrink-0 inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10px] font-medium ${c.ready ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: c.ready ? "check" : "alert",
    size: 10
  }), c.ready ? "kész" : `${c.missing.length} hiány`)), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center gap-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement(MdTplPill, {
    tplId: it.tplId
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-600 truncate"
  }, it.styleName)), t && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 pt-2.5 border-t border-stone-100 flex items-center gap-1.5 flex-wrap text-[10px]"
  }, [["cut", `${prep.cutlist.length} alk.`], ["layers", `${t.sheets} tábla${t.volumeM3 > 0 ? " · " + mdN1(t.volumeM3) + " m³" : ""}`], ["bolt", `${prep.hardware.reduce((n, h) => n + h.qty, 0)} vasalat`], ["workflow", `${mdN1(prep.labor.totalHours)} ó`]].map(([ic, lbl]) => /*#__PURE__*/React.createElement("span", {
    key: ic,
    className: "inline-flex items-center gap-1 px-1.5 h-5 rounded-md bg-stone-100 text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 10
  }), lbl)), /*#__PURE__*/React.createElement("span", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-semibold text-stone-900 tabular-nums"
  }, mdHuf(t.grand))));
}
window.MfgDatasheetPage = MfgDatasheetPage;
Object.assign(window, {
  mdHuf,
  mdN1,
  mdMapItem,
  mdCompoProject,
  mdElementProject,
  mdTplStatus,
  mdCompleteness,
  MdTplPill,
  MdCrumb,
  MdStat
});
})();
