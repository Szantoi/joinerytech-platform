/* AUTO-GENERATED from page-configurator.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-configurator.jsx — Termékkonfigurátor (CPQ) — Tervezés világ
//
//   Vezetett (guided) konfigurátor a meglévő spec-rendszerre építve:
//     1 Kategória → 2 Modell (sablon) → 3 MÉRET (szabad változók — ÚJ) →
//     4 Kivitel (stílus) → 5 Műszaki → 6 Ár & lezárás
//
//   Az árat a window.SpecEngine számolja a TÉNYLEGES méretekkel (varOverrides);
//   az anyag a stílus slot-jaiból jön. A kimenet egy mentett konfiguráció
//   (sim.saveConfig) saját FSM-mel, ami a meglévő láncba köt:
//     internal/b2b → configToQuote (createQuote) · webshop → configToLead.
//
//   <ProductConfigurator audience onClose onAdd? editConfig? defaultCustomer? />
//   <ConfiguratorPage />   // a Tervezés → Konfigurátor screen (lista + belépő)
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateCfg,
  useMemo: useMemoCfg,
  useEffect: useEffectCfg,
  useRef: useRefCfg
} = React;
const cfgHuf = n => Math.round(n).toLocaleString("hu-HU") + " Ft";
const cfgHufK = n => Math.round(n / 1000).toLocaleString("hu-HU") + " eFt";
const CFG_STEPS = ["Kategória", "Modell", "Méret", "Kivitel", "Műszaki", "Ár"];

// A kategória material-slot mezőiből → { slotName: anyagkód } a kiválasztott stílusból.
// Ez köti a stílus anyagát a sablon geometria-tokenjeihez ({body}, {front} …).
function cfgSlotVars(cat, style) {
  const out = {};
  (cat && cat.styleFields || []).forEach(f => {
    if (f.kind === "material" && f.slot) out[f.slot] = style && style.values ? style.values[f.key] : undefined;
  });
  return out;
}

// ──────────────────────────────────────────────────────────────────────────
// ProductConfigurator — fullscreen guided wizard
// ──────────────────────────────────────────────────────────────────────────
function ProductConfigurator({
  audience = "internal",
  onClose,
  onAdd = null,
  editConfig = null,
  defaultCustomer = ""
}) {
  const s = useSim();
  const aud = window.CFG_AUDIENCE_META[audience] || window.CFG_AUDIENCE_META.internal;
  const cats = s.specCategories || [];
  const ed = editConfig || null;
  const [step, setStep] = useStateCfg(0);
  const [catId, setCatId] = useStateCfg(ed ? ed.categoryId : cats[0] ? cats[0].id : null);
  const [tplId, setTplId] = useStateCfg(ed ? ed.tplId : null);
  const [sizeVars, setSizeVars] = useStateCfg(ed ? {
    ...(ed.vars || {})
  } : {});
  const [styleId, setStyleId] = useStateCfg(ed ? ed.styleId : null);
  const [techId, setTechId] = useStateCfg(ed ? ed.techId : null);
  const [qty, setQty] = useStateCfg(ed ? Math.max(1, ed.qty || 1) : 1);
  const [customer, setCustomer] = useStateCfg(ed ? ed.customer || defaultCustomer : defaultCustomer);
  const [contact, setContact] = useStateCfg({
    name: ed ? ed.contact || "" : "",
    phone: "",
    email: ""
  });
  const [done, setDone] = useStateCfg(null); // { kind:"quote"|"lead"|"saved", ref, customer }
  const didInit = useRefCfg(false);
  useEffectCfg(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  const cat = cats.find(c => c.id === catId) || null;
  const styles = (s.styles || []).filter(x => x.status === "active" && x.categoryId === catId);
  const techs = (s.techSpecs || []).filter(x => x.status === "active" && x.categoryId === catId);
  const templates = (window.PARAM_TEMPLATES || []).filter(t => t.categoryId === catId);
  const tpl = templates.find(t => t.id === tplId) || null;
  const style = styles.find(x => x.id === styleId) || null;
  const tech = techs.find(x => x.id === techId) || null;

  // category change → reset downstream picks (skip on first edit mount)
  useEffectCfg(() => {
    if (ed && !didInit.current) {
      didInit.current = true;
      return;
    }
    setTplId(null);
    setSizeVars({});
    setStyleId(styles[0] ? styles[0].id : null);
    setTechId(techs[0] ? techs[0].id : null);
  }, [catId]);

  // template change → seed geometry vars from template defaults (keep material vars from style)
  useEffectCfg(() => {
    if (!tpl) return;
    if (ed && tpl.id === ed.tplId && Object.keys(sizeVars).length) return; // keep edited dims
    const init = {};
    (tpl.vars || []).forEach(v => {
      if (v.kind !== "material") init[v.key] = v.default;
    });
    setSizeVars(init);
  }, [tplId]);

  // effective vars = template defaults ← size controls ← style slot materials
  const effectiveVars = useMemoCfg(() => {
    if (!tpl) return {};
    const base = {};
    (tpl.vars || []).forEach(v => {
      base[v.key] = v.default;
    });
    return {
      ...base,
      ...sizeVars,
      ...cfgSlotVars(cat, style)
    };
  }, [tpl, sizeVars, cat, style]);

  // live constraint check
  const constraintResults = useMemoCfg(() => {
    if (!tpl || !tpl.constraints) return [];
    return tpl.constraints.map(c => {
      try {
        let str = String(c.expr).replace(/\{([a-z_]+)\.t\}/gi, (_, k) => window.sim.materialInfo(effectiveVars[k]).t).replace(/\{([a-z_]+)\}/gi, (_, k) => effectiveVars[k] ?? 0).replace(/×/g, "*");
        return {
          ...c,
          ok: !!new Function("return (" + str + ")")()
        };
      } catch {
        return {
          ...c,
          ok: false
        };
      }
    });
  }, [tpl, effectiveVars]);
  const allOk = constraintResults.every(c => c.ok);

  // price (SpecEngine, with real sizes)
  const result = useMemoCfg(() => {
    if (!cat || !tpl) return null;
    return window.SpecEngine.evaluateConfig({
      category: cat,
      style,
      tech,
      picks: [{
        tplId: tpl.id,
        qty,
        vars: effectiveVars
      }]
    });
  }, [cat, tpl, style, tech, qty, effectiveVars]);
  const row = result && result.rows[0];

  // resolved parts for preview/table
  const resolvedParts = useMemoCfg(() => {
    if (!row) return [];
    return (row.parts || []).map(p => ({
      name: p.name,
      rMat: p.code,
      rW: p.rW,
      rH: p.rH,
      rT: window.sim.materialInfo(p.code).t,
      rQty: p.rQty
    }));
  }, [row]);
  const dimsLabel = useMemoCfg(() => {
    if (!tpl) return "";
    const g = k => effectiveVars[k];
    const parts = [];
    ["width", "height", "depth"].forEach(k => {
      if (g(k) != null && (tpl.vars || []).some(v => v.key === k)) parts.push(g(k));
    });
    return parts.length ? parts.join(" × ") + " mm" : "";
  }, [tpl, effectiveVars]);

  // step gating
  const canAdvance = step === 0 ? !!catId : step === 1 ? !!tplId : step === 2 ? allOk : true;
  const last = CFG_STEPS.length - 1;

  // ── snapshot for saveConfig ───────────────────────────────────────────────
  const buildSnapshot = (overrides = {}) => ({
    audience,
    categoryId: catId,
    catName: cat ? cat.name : "",
    tplId,
    tplName: tpl ? tpl.name : "",
    thumb: tpl ? tpl.thumb : "empty",
    vars: {
      ...effectiveVars
    },
    dims: dimsLabel,
    styleId,
    styleName: style ? style.name : "",
    techId,
    techName: tech ? tech.name : "",
    qty,
    customer,
    contact: contact.name ? `${contact.name}${contact.phone ? " · " + contact.phone : ""}` : "",
    unitPrice: row ? Math.round(row.unit) : 0,
    net: result ? Math.round(result.net) : 0,
    bandPct: result ? result.bandPct : 10,
    estLo: result ? result.low : 0,
    estHi: result ? result.high : 0,
    laborHours: result ? result.laborHours : 0,
    deliveryDays: result ? result.deliveryDays : 0,
    ...overrides
  });
  const lineForQuote = () => ({
    name: `${tpl.name}${style ? " — " + style.name : ""}`,
    code: tpl.id,
    unit: "db",
    qty,
    price: Math.round(row.unit),
    vat: 27,
    config: {
      categoryId: catId,
      styleId,
      techId,
      bandPct: result.bandPct,
      vars: {
        ...effectiveVars
      },
      dims: dimsLabel
    }
  });

  // ── close actions ─────────────────────────────────────────────────────────
  const saveDraft = () => {
    const id = window.sim.saveConfig(buildSnapshot({
      id: ed ? ed.id : undefined
    }));
    if (window.toast) window.toast(`✓ Konfiguráció mentve — ${id}`, "success");
    onClose();
  };
  const addToQuote = () => {
    onAdd(lineForQuote());
    if (window.toast) window.toast("✓ Konfigurált tétel az ajánlatban", "success");
    onClose();
  };
  const makeQuote = () => {
    const id = window.sim.saveConfig(buildSnapshot({
      id: ed ? ed.id : undefined
    }));
    const qid = window.sim.configToQuote(id, {
      customer
    });
    if (qid) setDone({
      kind: "quote",
      ref: qid,
      customer
    });
  };
  const requestQuote = () => {
    const id = window.sim.saveConfig(buildSnapshot({
      id: ed ? ed.id : undefined,
      audience: "webshop"
    }));
    const lid = window.sim.configToLead(id, {
      contact: contact.name,
      phone: contact.phone,
      email: contact.email
    });
    setDone({
      kind: "lead",
      ref: lid,
      customer: contact.name
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[70] flex flex-col bg-stone-50",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("header", {
    className: "shrink-0 bg-white border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1180px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100",
    "aria-label": "Bez\xE1r\xE1s"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-lg bg-violet-600 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ruler",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 leading-tight"
  }, ed ? "Konfiguráció szerkesztése" : "Termékkonfigurátor"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 leading-tight"
  }, "Kateg\xF3ria \u2192 modell \u2192 m\xE9ret \u2192 kivitel \u2192 \xE1r")), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-violet-50 text-violet-700 text-[11px] font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: aud.icon,
    size: 12
  }), aud.label)), /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1180px] mx-auto px-4 md:px-6 pb-2.5 flex items-center gap-1 overflow-x-auto"
  }, CFG_STEPS.map((label, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => i < step && setStep(i),
    disabled: i > step,
    className: "flex items-center gap-2 shrink-0 disabled:cursor-default"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold transition ${i < step ? "bg-violet-600 text-white" : i === step ? "bg-violet-100 text-violet-700 ring-2 ring-violet-300" : "bg-stone-100 text-stone-400"}`
  }, i < step ? "✓" : i + 1), /*#__PURE__*/React.createElement("span", {
    className: `text-[12px] ${i === step ? "font-semibold text-stone-900" : i < step ? "text-stone-500" : "text-stone-400"}`
  }, label)), i < CFG_STEPS.length - 1 && /*#__PURE__*/React.createElement("div", {
    className: `w-5 sm:w-8 h-px shrink-0 ${i < step ? "bg-violet-300" : "bg-stone-200"}`
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-h-0 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1180px] mx-auto px-4 md:px-6 py-5"
  }, step === 0 && /*#__PURE__*/React.createElement(CfgStepCategory, {
    cats: cats,
    catId: catId,
    setCatId: setCatId
  }), step === 1 && /*#__PURE__*/React.createElement(CfgStepModel, {
    templates: templates,
    tplId: tplId,
    setTplId: setTplId
  }), step === 2 && /*#__PURE__*/React.createElement(CfgStepSize, {
    tpl: tpl,
    sizeVars: sizeVars,
    setSizeVars: setSizeVars,
    effectiveVars: effectiveVars,
    resolvedParts: resolvedParts,
    constraintResults: constraintResults,
    allOk: allOk
  }), step === 3 && /*#__PURE__*/React.createElement(CfgStepStyle, {
    cat: cat,
    styles: styles,
    styleId: styleId,
    setStyleId: setStyleId,
    tpl: tpl,
    effectiveVars: effectiveVars,
    resolvedParts: resolvedParts
  }), step === 4 && /*#__PURE__*/React.createElement(CfgStepTech, {
    cat: cat,
    techs: techs,
    techId: techId,
    setTechId: setTechId
  }), step === 5 && /*#__PURE__*/React.createElement(CfgStepPrice, {
    aud: aud,
    result: result,
    row: row,
    tpl: tpl,
    cat: cat,
    style: style,
    tech: tech,
    qty: qty,
    setQty: setQty,
    customer: customer,
    setCustomer: setCustomer,
    contact: contact,
    setContact: setContact,
    dimsLabel: dimsLabel,
    audience: audience
  }))), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 bg-white border-t border-stone-200",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom),0px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1180px] mx-auto px-4 md:px-6 h-16 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => step === 0 ? onClose() : setStep(step - 1),
    className: "h-10 px-4 rounded-lg border border-stone-200 text-[12.5px] font-medium text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14,
    className: "rotate-180"
  }), step === 0 ? "Mégse" : "Vissza"), step >= 2 && result && /*#__PURE__*/React.createElement("div", {
    className: "hidden sm:flex flex-col leading-tight ml-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] uppercase tracking-wide text-stone-400 font-medium"
  }, aud.showExactPrice ? "Becsült nettó" : "Becsült ársáv"), /*#__PURE__*/React.createElement("span", {
    className: "text-[14px] font-semibold text-stone-900 tabular-nums"
  }, aud.showExactPrice ? cfgHuf(result.net) : `${cfgHufK(result.low)} – ${cfgHufK(result.high)}`)), /*#__PURE__*/React.createElement("span", {
    className: "flex-1"
  }), step < last ? /*#__PURE__*/React.createElement("button", {
    onClick: () => canAdvance && setStep(step + 1),
    disabled: !canAdvance,
    className: "h-10 px-6 rounded-lg bg-violet-600 text-white text-[12.5px] font-semibold hover:bg-violet-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-2"
  }, "Tov\xE1bb ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14
  })) : /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, audience !== "webshop" && !onAdd && /*#__PURE__*/React.createElement("button", {
    onClick: saveDraft,
    className: "h-10 px-4 rounded-lg border border-stone-200 text-[12.5px] font-medium text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14
  }), "Ment\xE9s piszkozatk\xE9nt"), onAdd ? /*#__PURE__*/React.createElement("button", {
    onClick: addToQuote,
    disabled: !row,
    className: "h-10 px-5 rounded-lg bg-violet-600 text-white text-[12.5px] font-semibold hover:bg-violet-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), aud.cta) : audience === "webshop" ? /*#__PURE__*/React.createElement("button", {
    onClick: requestQuote,
    disabled: !row || !contact.name.trim(),
    className: "h-10 px-5 rounded-lg bg-violet-600 text-white text-[12.5px] font-semibold hover:bg-violet-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "briefcase",
    size: 15
  }), aud.cta) : /*#__PURE__*/React.createElement("button", {
    onClick: makeQuote,
    disabled: !row || !customer.trim(),
    className: "h-10 px-5 rounded-lg bg-violet-600 text-white text-[12.5px] font-semibold hover:bg-violet-700 disabled:bg-stone-200 disabled:text-stone-400 inline-flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "briefcase",
    size: 15
  }), "Aj\xE1nlat k\xE9sz\xEDt\xE9se")))), done && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[72] grid place-items-center bg-stone-900/40 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center animate-[chSlide_.22s_ease-out]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 grid place-items-center mx-auto mb-3"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 26
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold text-stone-900"
  }, done.kind === "lead" ? "Ajánlatkérés elküldve" : "Ajánlat létrehozva"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500 mt-1"
  }, tpl ? tpl.name : "", done.customer ? " — " + done.customer : ""), done.ref && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-[11.5px] font-mono"
  }, done.ref), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 mt-3"
  }, done.kind === "lead" ? "Kollégánk hamarosan keresi a megadott elérhetőségen." : "Az ajánlat Vázlat státuszban jött létre, az Értékesítés → Ajánlatok alatt folytatható."), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "mt-5 h-9 px-5 rounded-lg bg-stone-900 text-white text-[12px] font-medium hover:bg-stone-800"
  }, "Bez\xE1r\xE1s"))));
}

// ── Step 0 — Kategória ──────────────────────────────────────────────────────
function CfgStepCategory({
  cats,
  catId,
  setCatId
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(CfgStepHead, {
    n: 1,
    title: "Mit szeretne konfigur\xE1lni?",
    sub: "A kateg\xF3ria hat\xE1rozza meg a v\xE1laszthat\xF3 modelleket, kivitelt \xE9s m\u0171szaki el\u0151\xEDr\xE1sokat."
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
  }, cats.map(c => {
    const ac = window.SPEC_ACCENT[c.color] || window.SPEC_ACCENT.violet;
    const on = catId === c.id;
    const tplCount = (window.PARAM_TEMPLATES || []).filter(t => t.categoryId === c.id).length;
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: () => setCatId(c.id),
      className: `text-left p-4 rounded-2xl border-2 transition ${on ? `${ac.solid.replace("bg-", "border-")} ${ac.chipBg}` : "border-stone-200 bg-white hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-11 h-11 rounded-xl grid place-items-center ${on ? `${ac.solid} text-white` : `${ac.iconBg} ${ac.iconFg}`}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: c.icon || "box",
      size: 21
    })), on && /*#__PURE__*/React.createElement("span", {
      className: `w-5 h-5 rounded-full grid place-items-center ${ac.solid} text-white`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 12
    }))), /*#__PURE__*/React.createElement("div", {
      className: "text-[14px] font-semibold text-stone-900 mt-3"
    }, c.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 mt-0.5 leading-snug line-clamp-2"
    }, c.desc), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 mt-2 font-mono"
    }, tplCount, " modell"));
  })));
}

// ── Step 1 — Modell (sablon) ────────────────────────────────────────────────
function CfgStepModel({
  templates,
  tplId,
  setTplId
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(CfgStepHead, {
    n: 2,
    title: "V\xE1lasszon modellt",
    sub: "A modell adja a geometri\xE1t \xE9s a sz\xFCks\xE9ges vasalatokat. A m\xE9reteket a k\xF6vetkez\u0151 l\xE9p\xE9sben szabja testre."
  }), templates.length === 0 && /*#__PURE__*/React.createElement(CfgEmpty, {
    text: "Ehhez a kateg\xF3ri\xE1hoz nincs konfigur\xE1lhat\xF3 modell."
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 gap-3"
  }, templates.map(t => {
    const on = tplId === t.id;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setTplId(t.id),
      className: `text-left p-4 rounded-2xl border-2 transition ${on ? "border-violet-500 bg-violet-50/50 shadow-sm shadow-violet-100" : "border-stone-200 bg-white hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "mb-3 flex items-center justify-between"
    }, window.TemplateThumb ? /*#__PURE__*/React.createElement(TemplateThumb, {
      kind: t.thumb,
      size: 68
    }) : /*#__PURE__*/React.createElement("span", {
      className: "w-16 h-16 rounded-md bg-stone-100"
    }), on && /*#__PURE__*/React.createElement("span", {
      className: "w-5 h-5 rounded-full grid place-items-center bg-violet-600 text-white"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 12
    }))), /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] font-semibold text-stone-900"
    }, t.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 mt-0.5"
    }, t.type, " \xB7 ", (t.vars || []).filter(v => v.kind !== "material").length, " m\xE9ret-param\xE9ter"), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 mt-1.5 leading-snug line-clamp-2"
    }, t.note));
  })));
}

// ── Step 2 — Méret (a sablon szabad változói) — ÚJ KÉPESSÉG ─────────────────
function CfgStepSize({
  tpl,
  sizeVars,
  setSizeVars,
  effectiveVars,
  resolvedParts,
  constraintResults,
  allOk
}) {
  if (!tpl) return /*#__PURE__*/React.createElement(CfgEmpty, {
    text: "El\u0151bb v\xE1lasszon modellt."
  });
  const geomVars = (tpl.vars || []).filter(v => v.kind !== "material");
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(CfgStepHead, {
    n: 3,
    title: "M\xE9retek \xE9s kialak\xEDt\xE1s",
    sub: "\xC1ll\xEDtsa be a m\xE9reteket \u2014 az \xE1r \xE9s az anyagig\xE9ny \xE9l\u0151ben k\xF6veti a v\xE1ltoztat\xE1st."
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-12 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-12 lg:col-span-7 space-y-3"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-4"
  }, "Szabad m\xE9retek"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-5"
  }, geomVars.map(v => window.FreeVarControl ? /*#__PURE__*/React.createElement(FreeVarControl, {
    key: v.key,
    v: v,
    value: sizeVars[v.key] ?? v.default,
    onChange: val => setSizeVars(p => ({
      ...p,
      [v.key]: val
    }))
  }) : null)), tpl.constraints && tpl.constraints.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: `mt-4 p-3 rounded-lg text-[11.5px] ${allOk ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 font-semibold mb-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: allOk ? "check" : "alert",
    size: 12
  }), allOk ? "Méret-megkötések rendben" : "Méret-megkötés sérül"), constraintResults.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `text-[10.5px] ${c.ok ? "opacity-70" : "font-semibold"}`
  }, c.ok ? "✓" : "✗", " ", c.rule))))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-12 lg:col-span-5 space-y-3"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-3"
  }, "\xC9l\u0151 el\u0151n\xE9zet"), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-stone-50 to-violet-50/20 rounded-xl border border-stone-100 py-4 flex items-center justify-center"
  }, window.ParametricSVG ? /*#__PURE__*/React.createElement(ParametricSVG, {
    tpl: tpl,
    vars: effectiveVars,
    resolvedParts: resolvedParts
  }) : null), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 text-[10.5px] text-stone-400 font-mono text-center"
  }, resolvedParts.length, " alkatr\xE9sz")))));
}

// ── Step 3 — Kivitel (stílus) ───────────────────────────────────────────────
function CfgStepStyle({
  cat,
  styles,
  styleId,
  setStyleId,
  tpl,
  effectiveVars,
  resolvedParts
}) {
  const violet = window.SPEC_ACCENT.violet;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(CfgStepHead, {
    n: 4,
    title: "Kivitel kiv\xE1laszt\xE1sa",
    sub: "A kivitel adja a l\xE1that\xF3 megjelen\xE9st \xE9s az anyagokat \u2014 az \xE1r ehhez igazodik."
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-12 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-12 lg:col-span-7 space-y-2"
  }, styles.length === 0 && /*#__PURE__*/React.createElement(CfgEmpty, {
    text: "Ehhez a kateg\xF3ri\xE1hoz nincs akt\xEDv kivitel (st\xEDlus). A Specifik\xE1ci\xF3k k\xE9perny\u0151n vehet\u0151 fel."
  }), styles.map(x => {
    const on = styleId === x.id;
    return /*#__PURE__*/React.createElement("button", {
      key: x.id,
      onClick: () => setStyleId(x.id),
      className: `w-full text-left p-3.5 rounded-xl border-2 transition flex items-center gap-3 ${on ? "border-violet-500 bg-violet-50/50" : "border-stone-200 bg-white hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "flex items-center gap-1 shrink-0"
    }, cfgStyleSwatches(cat, x).map((col, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "w-7 h-7 rounded-md border border-stone-200",
      style: {
        background: col
      }
    }))), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] font-semibold text-stone-900 truncate"
    }, x.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 truncate"
    }, cfgStyleSummary(cat, x))), on && /*#__PURE__*/React.createElement("span", {
      className: "w-5 h-5 rounded-full grid place-items-center bg-violet-600 text-white shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 12
    })));
  })), /*#__PURE__*/React.createElement("div", {
    className: "col-span-12 lg:col-span-5"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4 lg:sticky lg:top-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-3"
  }, "El\u0151n\xE9zet"), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-stone-50 to-violet-50/20 rounded-xl border border-stone-100 py-4 flex items-center justify-center"
  }, window.ParametricSVG && tpl ? /*#__PURE__*/React.createElement(ParametricSVG, {
    tpl: tpl,
    vars: effectiveVars,
    resolvedParts: resolvedParts
  }) : null)))));
}

// ── Step 4 — Műszaki ────────────────────────────────────────────────────────
function CfgStepTech({
  cat,
  techs,
  techId,
  setTechId
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(CfgStepHead, {
    n: 5,
    title: "M\u0171szaki el\u0151\xEDr\xE1s",
    sub: "Vasalat-m\xE1rka, lapvastags\xE1g, t\u0171r\xE9s \u2014 ezek a gy\xE1rt\xE1si min\u0151s\xE9get \xE9s az \xE1rat is befoly\xE1solj\xE1k."
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-2.5"
  }, techs.length === 0 && /*#__PURE__*/React.createElement(CfgEmpty, {
    text: "Ehhez a kateg\xF3ri\xE1hoz nincs akt\xEDv m\u0171szaki el\u0151\xEDr\xE1s."
  }), techs.map(x => {
    const on = techId === x.id;
    return /*#__PURE__*/React.createElement("button", {
      key: x.id,
      onClick: () => setTechId(x.id),
      className: `text-left p-4 rounded-xl border-2 transition ${on ? "border-teal-500 bg-teal-50/50" : "border-stone-200 bg-white hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-9 h-9 rounded-lg grid place-items-center ${on ? "bg-teal-600 text-white" : "bg-stone-100 text-stone-500"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "cpu",
      size: 17
    })), on && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 16,
      className: "text-teal-600"
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] font-semibold text-stone-900 mt-2.5"
    }, x.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 mt-0.5 leading-snug"
    }, cfgTechSummary(cat, x)));
  })));
}

// ── Step 5 — Ár & lezárás ───────────────────────────────────────────────────
function CfgStepPrice({
  aud,
  result,
  row,
  tpl,
  cat,
  style,
  tech,
  qty,
  setQty,
  customer,
  setCustomer,
  contact,
  setContact,
  dimsLabel,
  audience
}) {
  if (!result || !row) return /*#__PURE__*/React.createElement(CfgEmpty, {
    text: "Hi\xE1nyos konfigur\xE1ci\xF3 \u2014 l\xE9pjen vissza \xE9s v\xE1lasszon modellt."
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(CfgStepHead, {
    n: 6,
    title: "\xC1r \xE9s \xF6sszegz\xE9s",
    sub: window.CFG_BAND_NOTE[audience] || ""
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-12 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-12 lg:col-span-7 space-y-3"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mb-3"
  }, window.TemplateThumb ? /*#__PURE__*/React.createElement(TemplateThumb, {
    kind: tpl.thumb,
    size: 48
  }) : null, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 truncate"
  }, tpl.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate"
  }, cat ? cat.name : "", style ? " · " + style.name : "", dimsLabel ? " · " + dimsLabel : ""))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px] border-t border-stone-100 pt-3"
  }, /*#__PURE__*/React.createElement(CfgRow, {
    k: "Kivitel",
    v: style ? style.name : "—"
  }), /*#__PURE__*/React.createElement(CfgRow, {
    k: "M\u0171szaki",
    v: tech ? tech.name : "—"
  }), /*#__PURE__*/React.createElement(CfgRow, {
    k: "Anyag",
    v: cfgHuf(row.materialCost)
  }), /*#__PURE__*/React.createElement(CfgRow, {
    k: "Vasalat",
    v: cfgHuf(row.hardwareCost)
  }), /*#__PURE__*/React.createElement(CfgRow, {
    k: "Munkad\xEDj",
    v: cfgHuf(row.laborCost)
  }), /*#__PURE__*/React.createElement(CfgRow, {
    k: "Sz\xE1ll\xEDt\xE1s",
    v: `${result.deliveryDays} nap`
  }))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900"
  }, "Darabsz\xE1m"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setQty(Math.max(1, qty - 1)),
    className: "w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "minus",
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    className: "w-12 h-9 grid place-items-center rounded-lg border border-stone-200 text-[14px] font-semibold font-mono"
  }, qty), /*#__PURE__*/React.createElement("button", {
    onClick: () => setQty(qty + 1),
    className: "w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }))))), audience === "webshop" ? /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-1"
  }, "El\xE9rhet\u0151s\xE9g"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mb-3"
  }, "Koll\xE9g\xE1nk ezen keresi \xD6nt a pontos aj\xE1nlattal."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, /*#__PURE__*/React.createElement("input", {
    value: contact.name,
    onChange: e => setContact(c => ({
      ...c,
      name: e.target.value
    })),
    placeholder: "N\xE9v *",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-violet-400"
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, /*#__PURE__*/React.createElement("input", {
    value: contact.phone,
    onChange: e => setContact(c => ({
      ...c,
      phone: e.target.value
    })),
    placeholder: "Telefon",
    className: "h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-violet-400"
  }), /*#__PURE__*/React.createElement("input", {
    value: contact.email,
    onChange: e => setContact(c => ({
      ...c,
      email: e.target.value
    })),
    placeholder: "E-mail",
    className: "h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-violet-400"
  })))) : /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-1"
  }, audience === "b2b" ? "Partner / ügyfél" : "Ügyfél"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mb-3"
  }, "Az aj\xE1nlat erre az \xFCgyf\xE9lre j\xF6n l\xE9tre (\xC9rt\xE9kes\xEDt\xE9s \u2192 Aj\xE1nlatok, V\xE1zlat)."), /*#__PURE__*/React.createElement("input", {
    value: customer,
    onChange: e => setCustomer(e.target.value),
    placeholder: "\xDCgyf\xE9l neve",
    list: "cfg-customer-list",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[13px] outline-none focus:border-violet-400"
  }), /*#__PURE__*/React.createElement("datalist", {
    id: "cfg-customer-list"
  }, (window.sim.getState().customers || []).map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.name
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-12 lg:col-span-5"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-5 lg:sticky lg:top-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, aud.showExactPrice ? "Becsült ár (nettó)" : "Becsült ársáv (nettó)"), aud.showExactPrice ? /*#__PURE__*/React.createElement("div", {
    className: "text-[30px] font-semibold tracking-tight text-stone-900 mt-1 tabular-nums leading-none"
  }, cfgHuf(result.net)) : /*#__PURE__*/React.createElement("div", {
    className: "text-[24px] font-semibold tracking-tight text-stone-900 mt-1 tabular-nums leading-tight"
  }, cfgHuf(result.low), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, " \u2013 "), cfgHuf(result.high)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-1.5"
  }, aud.showExactPrice ? /*#__PURE__*/React.createElement(React.Fragment, null, "S\xE1v: ", cfgHuf(result.low), " \u2013 ", cfgHuf(result.high), " ") : /*#__PURE__*/React.createElement(React.Fragment, null, "Egys\xE9g\xE1r: ", cfgHuf(row.unit), "/db "), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "(\xB1", result.bandPct, "%)")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mt-3 pt-3 border-t border-stone-100 text-[11px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "factory",
    size: 13,
    className: "text-stone-400"
  }), result.laborHours.toFixed(1), " munka\xF3ra"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "orders",
    size: 13,
    className: "text-stone-400"
  }), result.deliveryDays, " nap")), aud.showExactPrice && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-stone-100 grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement(CfgRow, {
    k: "Egys\xE9g\xE1r",
    v: cfgHuf(row.unit)
  }), /*#__PURE__*/React.createElement(CfgRow, {
    k: "Darab",
    v: `× ${qty}`
  }), /*#__PURE__*/React.createElement(CfgRow, {
    k: "St\xEDlus m\xF3d.",
    v: (row.styleAdd > 0 ? "+" : "") + cfgHuf(row.styleAdd)
  }), /*#__PURE__*/React.createElement(CfgRow, {
    k: "M\u0171szaki m\xF3d.",
    v: (row.techAdd > 0 ? "+" : "") + cfgHuf(row.techAdd)
  }))))));
}

// ── Shared small bits ───────────────────────────────────────────────────────
function CfgStepHead({
  n,
  title,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold tracking-tight text-stone-900"
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500 mt-0.5 leading-snug max-w-2xl"
  }, sub));
}
function CfgEmpty({
  text
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-dashed border-stone-300 bg-stone-50/50 p-5 text-center text-[12px] text-stone-500"
  }, text);
}
function CfgRow({
  k,
  v
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, k), /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-800 tabular-nums truncate"
  }, v));
}
function cfgStyleSummary(cat, st) {
  const fields = (cat && cat.styleFields || []).filter(f => f.kind !== "material");
  return fields.map(f => st.values && st.values[f.key]).filter(Boolean).slice(0, 3).map(String).join(" · ") || "—";
}
function cfgStyleSwatches(cat, st) {
  const out = [];
  (cat && cat.styleFields || []).forEach(f => {
    if (f.kind === "material" && st.values && st.values[f.key]) out.push(window.sim.materialInfo(st.values[f.key]).color);
  });
  return out.slice(0, 3);
}
function cfgTechSummary(cat, ms) {
  const out = [];
  (cat && cat.techFields || []).forEach(f => {
    const v = ms.values && ms.values[f.key];
    if (v == null || v === "") return;
    if (f.role === "precision" && window.PRECISION_BANDS[v]) out.push(window.PRECISION_BANDS[v].label);else if (f.kind === "bool") {
      if (v) out.push(f.label);
    } else out.push(String(v));
  });
  return out.slice(0, 3).join(" · ") || "—";
}

// ──────────────────────────────────────────────────────────────────────────
// ConfiguratorPage — Tervezés → Konfigurátor screen (lista + belépő)
// ──────────────────────────────────────────────────────────────────────────
function ConfiguratorPage() {
  const s = useSim();
  const configs = s.configList ? s.configList() : s.quoteConfigs || [];
  const [wizard, setWizard] = useStateCfg(null); // { audience, editConfig }
  const [filter, setFilter] = useStateCfg("all");
  const counts = useMemoCfg(() => {
    const c = {
      piszkozat: 0,
      veglegesitett: 0,
      ajanlatban: 0,
      elvetve: 0
    };
    configs.forEach(x => {
      c[x.status] = (c[x.status] || 0) + 1;
    });
    return c;
  }, [configs]);
  const shown = filter === "all" ? configs : configs.filter(c => c.status === filter);
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 space-y-6"
  }, wizard && /*#__PURE__*/React.createElement(ProductConfigurator, {
    audience: wizard.audience,
    editConfig: wizard.editConfig,
    onClose: () => setWizard(null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-violet-300 bg-gradient-to-br from-violet-600 to-violet-500 p-5 md:p-6 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col md:flex-row md:items-center gap-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-12 h-12 rounded-2xl bg-white/15 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ruler",
    size: 24
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[17px] font-semibold tracking-tight"
  }, "Term\xE9kkonfigur\xE1tor"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-violet-50/90 leading-snug mt-0.5 max-w-xl"
  }, "Vezetett konfigur\xE1ci\xF3: kateg\xF3ria \u2192 modell \u2192 m\xE9ret \u2192 kivitel \u2192 \xE1r. A k\xE9sz konfigur\xE1ci\xF3 aj\xE1nlatt\xE1 alak\xEDthat\xF3, vagy \xFCgyf\xE9l-aj\xE1nlatk\xE9r\xE9sk\xE9nt tov\xE1bb\xEDthat\xF3.")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setWizard({
      audience: "internal"
    }),
    className: "self-start md:self-auto h-10 px-5 rounded-lg bg-white text-violet-700 text-[13px] font-semibold hover:bg-violet-50 inline-flex items-center gap-2 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), "\xDAj konfigur\xE1ci\xF3"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3"
  }, window.CFG_ORDER.map(st => {
    const tone = window.CFG_STATUS[st];
    return /*#__PURE__*/React.createElement("button", {
      key: st,
      onClick: () => setFilter(filter === st ? "all" : st),
      className: `text-left rounded-xl border bg-white p-4 transition ${filter === st ? "border-violet-300 ring-1 ring-violet-200" : "border-stone-200 hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-2 h-2 rounded-full ${tone.dot}`
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
    }, tone.label)), /*#__PURE__*/React.createElement("div", {
      className: "text-[26px] font-semibold tabular-nums text-stone-900 mt-1"
    }, counts[st] || 0));
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "Mentett konfigur\xE1ci\xF3k ", filter !== "all" && /*#__PURE__*/React.createElement("button", {
    onClick: () => setFilter("all"),
    className: "ml-1.5 text-[11px] font-normal text-violet-700 hover:underline"
  }, "\xB7 \xF6sszes"))), shown.length === 0 ? /*#__PURE__*/React.createElement(CfgEmpty, {
    text: "Nincs mentett konfigur\xE1ci\xF3 ebben a n\xE9zetben. Ind\xEDts egy \xFAjat a fenti gombbal."
  }) : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, shown.map(c => /*#__PURE__*/React.createElement(ConfigRow, {
    key: c.id,
    cfg: c,
    onEdit: () => setWizard({
      audience: c.audience || "internal",
      editConfig: c
    })
  })))));
}

// ── A saved-config list row with FSM actions ───────────────────────────────
function ConfigRow({
  cfg,
  onEdit
}) {
  const tone = window.CFG_STATUS[cfg.status] || window.CFG_STATUS.piszkozat;
  const aud = window.CFG_AUDIENCE_META[cfg.audience] || window.CFG_AUDIENCE_META.internal;
  const [custOpen, setCustOpen] = useStateCfg(false);
  const [cust, setCust] = useStateCfg(cfg.customer || "");
  const go = (to, reason) => window.sim.setConfigStatus(cfg.id, to, {
    reason
  });
  const toQuote = () => {
    if (!cust.trim()) {
      setCustOpen(true);
      return;
    }
    window.sim.configToQuote(cfg.id, {
      customer: cust
    });
    setCustOpen(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-white p-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, window.TemplateThumb ? /*#__PURE__*/React.createElement(TemplateThumb, {
    kind: cfg.thumb,
    size: 44
  }) : /*#__PURE__*/React.createElement("span", {
    className: "w-11 h-11 rounded-md bg-stone-100"
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, cfg.tplName), /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] font-medium ${tone.bg} ${tone.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
  }), tone.label), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: aud.icon,
    size: 10
  }), aud.label)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mt-0.5 truncate"
  }, cfg.id, " \xB7 ", cfg.styleName || "—", cfg.dims ? " · " + cfg.dims : "", " \xB7 ", cfg.qty, " db", cfg.customer ? " · " + cfg.customer : ""), (cfg.quoteRef || cfg.leadRef) && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-emerald-600 mt-0.5 font-mono"
  }, cfg.quoteRef ? "→ " + cfg.quoteRef : "→ " + cfg.leadRef)), /*#__PURE__*/React.createElement("div", {
    className: "text-right shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900 tabular-nums"
  }, cfgHuf(cfg.net)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "becs\xFClt nett\xF3"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap mt-2.5 pt-2.5 border-t border-stone-100"
  }, cfg.status !== "ajanlatban" && /*#__PURE__*/React.createElement("button", {
    onClick: onEdit,
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[11.5px] font-medium text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 12
  }), "Szerkeszt\xE9s"), cfg.status === "piszkozat" && /*#__PURE__*/React.createElement("button", {
    onClick: () => go("veglegesitett"),
    className: "h-8 px-3 rounded-lg bg-violet-600 text-white text-[11.5px] font-medium hover:bg-violet-700 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), "V\xE9gleges\xEDt\xE9s"), cfg.status === "veglegesitett" && /*#__PURE__*/React.createElement("button", {
    onClick: toQuote,
    className: "h-8 px-3 rounded-lg bg-emerald-600 text-white text-[11.5px] font-medium hover:bg-emerald-700 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "briefcase",
    size: 12
  }), "Aj\xE1nlatba"), (cfg.status === "piszkozat" || cfg.status === "veglegesitett") && /*#__PURE__*/React.createElement("button", {
    onClick: () => go("elvetve"),
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[11.5px] font-medium text-stone-500 hover:bg-rose-50 hover:text-rose-600 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 12
  }), "Elvet\xE9s"), cfg.status === "elvetve" && /*#__PURE__*/React.createElement("button", {
    onClick: () => go("piszkozat"),
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[11.5px] font-medium text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "rotate",
    size: 12
  }), "\xDAjranyit\xE1s"), /*#__PURE__*/React.createElement("span", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm("Biztosan törli ezt a konfigurációt?")) window.sim.removeConfig(cfg.id);
    },
    className: "h-8 w-8 grid place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  }))), custOpen && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 p-3 rounded-lg bg-stone-50 border border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-medium text-stone-700 mb-1.5"
  }, "Add meg az \xFCgyfelet az aj\xE1nlathoz"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: cust,
    onChange: e => setCust(e.target.value),
    placeholder: "\xDCgyf\xE9l neve",
    list: "cfg-row-cust",
    className: "flex-1 h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-violet-400"
  }), /*#__PURE__*/React.createElement("datalist", {
    id: "cfg-row-cust"
  }, (window.sim.getState().customers || []).map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.name
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: toQuote,
    disabled: !cust.trim(),
    className: "h-9 px-3 rounded-lg bg-emerald-600 text-white text-[12px] font-medium disabled:bg-stone-200 disabled:text-stone-400"
  }, "Aj\xE1nlat"))));
}
window.ProductConfigurator = ProductConfigurator;
window.ConfiguratorPage = ConfiguratorPage;
})();
