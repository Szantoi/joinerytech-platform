/* AUTO-GENERATED from page-design-engineer.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-design-engineer.jsx — Tervezés → MŰSZAKI TERVEZÉS (sablon-műhely)
//
//   A §19.2 szerep ALKOTÓ felülete: konfigurálható sablonok létrehozása,
//   szerkesztése (vars + alkatrész-képletek + vasalat + constraints + gér/szög)
//   és ÉLETCIKLUS-kezelése (vazlat → ellenorzes → kiadott → archivalt).
//   Csak a KIADOTT sablon kerül a feloldó-registry-be (window.PARAM_TEMPLATES)
//   — onnan dolgozik a konfigurátor, az ajánlat-tétel és a gyártás-előkészítés.
//
//   Store: sim.designTemplates + addDesignTemplate / draftDesignTemplateFrom /
//   updateDesignTemplate / setDesignTemplateStatus (design.engineer jog).
//   Újrahasznált: window.resolveFormula, window.PartsTable, window.PartMiterEditor.
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateDE
} = React;
const deRF = (expr, vars) => {
  try {
    const v = window.resolveFormula(expr, vars);
    return v == null || Number.isNaN(v) ? "—" : v;
  } catch (e) {
    return "—";
  }
};
const deHUF = n => Math.round(n || 0).toLocaleString("hu-HU") + " Ft";
function DeStatusPill({
  status
}) {
  const st = (window.TPL_STATUS || {})[status] || {};
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 px-2 h-6 rounded-full border text-[10.5px] font-medium ${st.pill || ""}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${st.dot || ""}`
  }), st.label || status);
}
function DeSection({
  icon,
  title,
  sub,
  children,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-amber-50 text-amber-600 mt-0.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 15
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[13.5px] font-semibold text-stone-900"
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 leading-snug max-w-xl"
  }, sub))), right), children);
}
const DE_IN = "h-8 px-2 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-800 outline-none focus:border-amber-400 disabled:bg-stone-50 disabled:text-stone-400";

// ════════════════════════════════════════════════════════════════════════════
//  LISTA — sablon-műhely (store-sablonok + gyári bázis)
// ════════════════════════════════════════════════════════════════════════════
// ── Beérkezett műszaki kérések (Értékesítéstől, ajánlat-pontosításhoz) ──
function EngQuoteRequests() {
  const s = useSim();
  const [openReq, setOpenReq] = useStateDE(null);
  const reqs = (s.quoteRequests || []).filter(r => r.kind === "technical" && ["kert", "folyamatban"].includes(r.status));
  if (!reqs.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-amber-700 font-semibold flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "inbox",
    size: 12
  }), " Be\xE9rkezett m\u0171szaki k\xE9r\xE9sek (", reqs.length, ")"), reqs.map(r => {
    const st = (window.QR_STATUS || {})[r.status] || {};
    const comp = window.sim.techReqCompleteness ? window.sim.techReqCompleteness(r) : {
      ready: false,
      missing: []
    };
    return /*#__PURE__*/React.createElement("div", {
      key: r.id,
      className: "rounded-lg bg-white border border-amber-100 px-3 py-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-[10.5px] text-stone-400"
    }, r.id), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] font-medium text-stone-800"
    }, r.customer), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-500"
    }, "\xB7 aj\xE1nlat: ", /*#__PURE__*/React.createElement("span", {
      className: "font-mono"
    }, r.quoteId)), /*#__PURE__*/React.createElement("span", {
      className: `text-[10px] font-medium px-2 py-0.5 rounded-full border ${st.pill || ""}`
    }, st.label || r.status), r.status === "folyamatban" && (comp.ready ? /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
    }, "\xE1razhat\xF3") : /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200"
    }, comp.missing.length, " hi\xE1ny")), /*#__PURE__*/React.createElement("span", {
      className: "flex-1"
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpenReq(r.id),
      className: "h-7 px-2.5 rounded-md text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-700"
    }, "Munkalap"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const why = window.prompt("Elutasítás indoka:");
        if (why) window.sim.setQuoteRequestStatus(r.id, "elutasitva", {
          reason: why
        });
      },
      className: "h-7 px-2 rounded-md text-[11px] text-stone-500 hover:bg-stone-100"
    }, "Elutas\xEDt\xE1s")), r.note && /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-[11px] text-stone-500"
    }, r.note), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-[10px] text-stone-400"
    }, "A munkalapon: terv-alap (bels\u0151 koncepci\xF3 / k\xFCls\u0151 design-csomag) \xB7 b\xFAtor\u2192sablon megfeleltet\xE9s \xB7 egyedi elemek rajzzal+param\xE9terrel+\xE1rral."));
  }), openReq && window.TechReqSheet && /*#__PURE__*/React.createElement(window.TechReqSheet, {
    reqId: openReq,
    onClose: () => setOpenReq(null)
  }));
}
function EngTemplatesPage() {
  const s = useSim();
  const canEng = window.sim.hasPerm && window.sim.hasPerm("design.engineer");
  const [openId, setOpenId] = useStateDE(null);
  const studio = s.designTemplates || [];
  const base = (window.PARAM_TEMPLATES_BASE || window.PARAM_TEMPLATES || []).filter(t => !studio.some(x => x.id === t.id));
  const cats = s.specCategories || [];
  const catName = cid => {
    const c = cats.find(x => x.id === cid);
    return c ? c.name : "—";
  };
  const newTpl = () => {
    const id = window.sim.addDesignTemplate({});
    if (id) setOpenId(id);
  };
  const draftFrom = bid => {
    const id = window.sim.draftDesignTemplateFrom(bid);
    if (id) setOpenId(id);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-end justify-between gap-3 mb-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[18px] md:text-[20px] font-semibold text-stone-900 tracking-tight"
  }, "M\u0171szaki tervez\xE9s \u2014 sablon-m\u0171hely"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500 max-w-2xl"
  }, "Konfigur\xE1lhat\xF3 sablonok alkot\xE1sa: param\xE9terek, alkatr\xE9sz-k\xE9pletek, vasalat, \xE9l-kialak\xEDt\xE1s. Csak a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-emerald-700"
  }, "kiadott"), " sablon haszn\xE1lhat\xF3 aj\xE1nlatban / konfigur\xE1torban / gy\xE1rt\xE1s-el\u0151k\xE9sz\xEDt\xE9sben.")), /*#__PURE__*/React.createElement("button", {
    onClick: canEng ? newTpl : undefined,
    disabled: !canEng,
    title: canEng ? undefined : "Nincs jogosultság (design.engineer)",
    className: "shrink-0 h-9 px-3.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 bg-amber-600 text-white hover:bg-amber-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), "\xDAj sablon")), /*#__PURE__*/React.createElement(EngQuoteRequests, null), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap text-[11px] text-stone-500 mb-4"
  }, (window.TPL_STATUS_ORDER || []).map((k, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: k
  }, i > 0 && /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 11,
    className: "text-stone-300"
  }), /*#__PURE__*/React.createElement(DeStatusPill, {
    status: k
  }))), /*#__PURE__*/React.createElement("span", {
    className: "ml-1"
  }, "\u2014 a kiad\xE1s verzi\xF3t l\xE9ptet \xE9s \xE9les\xEDti a sablont")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Sablon-m\u0171hely (", studio.length, ")"), studio.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-[12.5px] text-stone-500 mb-6"
  }, "M\xE9g nincs saj\xE1t sablon \u2014 hozz l\xE9tre \xFAjat, vagy nyiss szerkeszt\u0151-v\xE1zlatot egy gy\xE1ri sablonb\xF3l.") : /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-3 mb-6"
  }, studio.map(t => {
    const c = window.TplEngine ? window.TplEngine.completeness(t) : {
      ready: true,
      missing: []
    };
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setOpenId(t.id),
      className: "text-left bg-white rounded-2xl border border-stone-200 p-4 hover:shadow-md hover:border-amber-300 transition"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[14px] font-semibold text-stone-900 leading-tight truncate"
    }, t.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 mt-0.5 truncate font-mono"
    }, t.id, " \xB7 v", t.version, " \xB7 ", catName(t.categoryId))), /*#__PURE__*/React.createElement(DeStatusPill, {
      status: t.status
    })), /*#__PURE__*/React.createElement("div", {
      className: "mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11.5px]"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-stone-500"
    }, (t.parts || []).length, " alkatr\xE9sz \xB7 ", (t.vars || []).length, " param\xE9ter"), t.status !== "kiadott" && !c.ready ? /*#__PURE__*/React.createElement("span", {
      className: "text-amber-600 font-medium"
    }, c.missing.length, " hi\xE1ny a kiad\xE1shoz") : /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400"
    }, t.updated, t.baseId ? ` · ${t.baseId} alapján` : "")));
  })), window.SkelPresetsPanel && /*#__PURE__*/React.createElement(window.SkelPresetsPanel, null), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Gy\xE1ri sablon-b\xE1zis"), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
  }, base.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    className: "flex items-center gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 truncate"
  }, t.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 font-mono"
  }, t.id, " \xB7 v", t.version, " \xB7 ", catName(t.categoryId))), /*#__PURE__*/React.createElement("span", {
    className: "shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-emerald-500"
  }), "\xE9lesben"), /*#__PURE__*/React.createElement("button", {
    onClick: canEng ? () => draftFrom(t.id) : undefined,
    disabled: !canEng,
    title: canEng ? "Szerkesztő-vázlat azonos id-n — a kiadásig a gyári verzió marad élesben" : "Nincs jogosultság (design.engineer)",
    className: "shrink-0 h-8 px-3 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-700 hover:border-amber-300 hover:text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ruler",
    size: 13
  }), "Szerkeszt\xE9s")))), openId && /*#__PURE__*/React.createElement(EngTemplateEditor, {
    id: openId,
    onClose: () => setOpenId(null)
  }));
}

// ════════════════════════════════════════════════════════════════════════════
//  SZERKESZTŐ — teljes képernyős munkalap
// ════════════════════════════════════════════════════════════════════════════
function EngTemplateEditor({
  id,
  onClose
}) {
  const s = useSim();
  const live = (s.designTemplates || []).find(t => t.id === id);
  const canEng = window.sim.hasPerm && window.sim.hasPerm("design.engineer");
  const [selPart, setSelPart] = useStateDE(0);
  const [selJoint, setSelJoint] = useStateDE(null);
  const [selPlane, setSelPlane] = useStateDE(null);
  if (!live) return null;
  const editable = canEng && ["vazlat", "ellenorzes"].includes(live.status);
  const upd = patch => window.sim.updateDesignTemplate(id, patch);
  const cats = s.specCategories || [];
  const mats = window.sim.designMaterials ? window.sim.designMaterials() : [];
  const E = window.TplEngine;
  const comp = E ? E.completeness(live) : {
    checks: [],
    ready: true,
    missing: []
  };
  const tokens = E ? E.tokens(live) : [];

  // feloldás a defaultokkal (élő előnézet)
  const dvars = Object.fromEntries((live.vars || []).map(v => [v.key, v.default]));
  const resolved = (live.parts || []).map(p => ({
    ...p,
    rMat: deRF(p.mat, dvars),
    rW: deRF(p.w, dvars),
    rH: deRF(p.h, dvars),
    rT: deRF(p.t, dvars),
    rQty: deRF(p.qty, dvars)
  }));
  const matCost = resolved.reduce((sum, r) => {
    const w = Number(r.rW),
      h = Number(r.rH),
      q = Number(r.rQty);
    if (!w || !h || !q) return sum;
    const info = window.sim.materialInfo ? window.sim.materialInfo(r.rMat) : {
      price: 4000
    };
    return sum + w * h / 1e6 * q * 1.12 * (info.price || 4000);
  }, 0);

  // parametrikus geometria — joint/kötés-állapotok az alap-paraméterekkel
  //   (§21 skeleton-sablonnál a váz-megoldó, különben a §20 part→part megoldó)
  const isSkel = !!live.skeleton;
  let geoStates = {};
  let skSolved = null;
  try {
    if (isSkel && window.Skel) {
      skSolved = window.Skel.solve(live, dvars);
      (skSolved.joints || []).forEach(j => {
        geoStates[j.id] = j.state;
      });
    } else if (window.ParamGeo) {
      const gp = resolved.map(r => ({
        name: r.name,
        w: Number(r.rW),
        h: Number(r.rH),
        t: Number(r.rT) || 18
      }));
      (window.ParamGeo.solve(live, gp).joints || []).forEach(j => {
        geoStates[j.id] = j.state;
      });
    }
  } catch (e) {}

  // SVG-nézetbeli él/lap-kattintás → kényszer/kötés kijelölése vagy új indítása
  const pickRef = (partName, refKey) => {
    const idx = (live.parts || []).findIndex(p => p.name === partName);
    if (idx >= 0) setSelPart(idx);
    if (isSkel) {
      const hit = (live.connections || []).find(c => c.a === partName || c.b === partName);
      if (hit) setSelJoint(hit.id);
      return;
    }
    const hit = (live.joints || []).find(j => j.a.part === partName && j.a.ref === refKey || j.b.part === partName && j.b.ref === refKey);
    if (hit) {
      setSelJoint(hit.id);
      return;
    }
    if (!editable) return;
    const other = (live.parts || []).map(p => p.name).find(n => n !== partName) || partName;
    const nid = "j-" + Date.now().toString(36).slice(-4);
    upd({
      joints: [...(live.joints || []), {
        id: nid,
        a: {
          part: partName,
          ref: refKey
        },
        b: {
          part: other,
          ref: "face-a"
        },
        ger: false,
        machining: "koldokcsap",
        offset: 0,
        offsetV: 0,
        flip: false,
        note: ""
      }]
    });
    setSelJoint(nid);
    if (window.toast) window.toast("Új kapcsolat a nézetből — állítsd be a másik oldalt.", "info");
  };

  // validációs hiba → kötés létrehozása (a technológia-választás kötelező marad)
  const fixErr = err => {
    const id = "c-" + Date.now().toString(36).slice(-4);
    const planes = (live.skeleton || {}).planes || [];
    upd({
      connections: [...(live.connections || []), {
        id,
        type: "koldokcsap",
        a: err.a,
        b: err.b,
        plane: (planes[0] || {}).id,
        side: "+",
        offset: 0,
        note: ""
      }]
    });
    setSelJoint(id);
  };

  // munkaóra-javaslat a folyamat-normákból (MFG_DEPARTMENTS) — kiindulás;
  // a pontos értéket a tesztgyártás / Utókalkuláció (tény-órák) adja.
  const suggestLabor = () => {
    const partsN = resolved.reduce((n, r) => n + (Number(r.rQty) || 0), 0);
    const edgeM = resolved.reduce((n, r) => n + 2 * ((Number(r.rW) || 0) + (Number(r.rH) || 0)) / 1000 * (Number(r.rQty) || 0) * 0.45, 0);
    const holes = (live.hardware || []).reduce((n, h) => n + (Number(h.qty) || 0), 0) * 2.5;
    const surf = resolved.reduce((n, r) => n + (Number(r.rW) || 0) * (Number(r.rH) || 0) / 1e6 * (Number(r.rQty) || 0), 0);
    let hours = 0;
    (window.MFG_DEPARTMENTS || []).forEach(d => {
      if (d.op === "cutting") hours += partsN * d.norm.perPart;else if (d.op === "edge") hours += edgeM * d.norm.perMeter;else if (d.op === "cnc") hours += holes * d.norm.perHole + partsN * d.norm.perPart;else if (d.op === "assembly") hours += 1 * d.norm.perUnit;else if (d.op === "surface") hours += surf * d.norm.perM2;
    });
    const v = Math.max(0.5, Math.round(hours * 2) / 2);
    upd({
      laborHours: v
    });
    if (window.toast) window.toast(`Javaslat a folyamat-normákból: ${v} óra`, "info");
  };

  // tömb-mutátorok
  const patchVar = (i, p) => upd({
    vars: live.vars.map((v, idx) => idx === i ? {
      ...v,
      ...p
    } : v)
  });
  const delVar = i => upd({
    vars: live.vars.filter((_, idx) => idx !== i)
  });
  const addVar = () => upd({
    vars: [...(live.vars || []), {
      key: "param" + ((live.vars || []).length + 1),
      label: "Új paraméter",
      unit: "mm",
      min: 0,
      max: 1000,
      step: 10,
      default: 100,
      kind: "raster"
    }]
  });
  const patchPart = (i, p) => upd({
    parts: live.parts.map((x, idx) => idx === i ? {
      ...x,
      ...p
    } : x)
  });
  const delPart = i => upd({
    parts: live.parts.filter((_, idx) => idx !== i)
  });
  const addPart = () => upd({
    parts: [...(live.parts || []), {
      name: "Új alkatrész",
      qty: 1,
      mat: "{body}",
      w: "{width}",
      h: "{height}",
      t: "{body.t}"
    }]
  });
  const patchHw = (i, p) => upd({
    hardware: live.hardware.map((x, idx) => idx === i ? {
      ...x,
      ...p
    } : x)
  });
  const delHw = i => upd({
    hardware: live.hardware.filter((_, idx) => idx !== i)
  });
  const addHw = () => {
    const first = Object.keys(window.HARDWARE_CATALOG || {})[0];
    upd({
      hardware: [...(live.hardware || []), {
        id: first,
        qty: 1
      }]
    });
  };
  const patchCon = (i, p) => upd({
    constraints: live.constraints.map((x, idx) => idx === i ? {
      ...x,
      ...p
    } : x)
  });
  const delCon = i => upd({
    constraints: live.constraints.filter((_, idx) => idx !== i)
  });
  const addCon = () => upd({
    constraints: [...(live.constraints || []), {
      rule: "Új szabály",
      expr: "{width} >= 200"
    }]
  });

  // ── csatlakozás-kényszerek (Inventor-minta) ──
  const partNames = (live.parts || []).map(p => p.name);
  const patchJoint = (i, p) => upd({
    joints: live.joints.map((x, idx) => idx === i ? {
      ...x,
      ...p
    } : x)
  });
  const patchJointSide = (i, side, p) => upd({
    joints: live.joints.map((x, idx) => idx === i ? {
      ...x,
      [side]: {
        ...x[side],
        ...p
      }
    } : x)
  });
  const delJoint = i => upd({
    joints: live.joints.filter((_, idx) => idx !== i)
  });
  const addJoint = () => upd({
    joints: [...(live.joints || []), {
      id: "j-" + Date.now().toString(36).slice(-4),
      a: {
        part: partNames[0] || "",
        ref: "edge-top"
      },
      b: {
        part: partNames[1] || partNames[0] || "",
        ref: "face-a"
      },
      ger: false,
      machining: "koldokcsap",
      offset: 0,
      note: ""
    }]
  });
  const conOk = c => {
    try {
      let str = String(c.expr || "").replace(/\{([a-z_0-9]+)\.t\}/gi, (_, k) => (window.sim.materialInfo(dvars[k]) || {}).t || 18).replace(/\{([a-z_0-9]+)\}/gi, (_, k) => dvars[k] ?? 0).replace(/×/g, "*");
      return !!new Function("return (" + str + ")")();
    } catch (e) {
      return false;
    }
  };

  // FSM-akciók
  const go = to => {
    let reason;
    if (to === "vazlat" && live.status === "ellenorzes") {
      reason = prompt("Visszaküldés indoka:");
      if (!reason) return;
    }
    if (to === "archivalt") {
      if (!confirm("Sablon archiválása? (A registry-ből kikerül; gyári id-nél a gyári verzió él tovább.)")) return;
    }
    window.sim.setDesignTemplateStatus(id, to, {
      reason
    });
  };
  const fsmBtn = {
    ellenorzes: {
      label: "Beküldés ellenőrzésre",
      cls: "bg-amber-500 text-white hover:bg-amber-600",
      icon: "check"
    },
    kiadott: {
      label: "Kiadás (verzió-léptetés)",
      cls: "bg-emerald-600 text-white hover:bg-emerald-700",
      icon: "check"
    },
    vazlat: {
      label: live.status === "archivalt" ? "Újranyitás vázlatként" : "Visszaküldés vázlatba",
      cls: "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50",
      icon: "rotate"
    },
    archivalt: {
      label: "Archiválás",
      cls: "bg-white text-stone-500 border border-stone-200 hover:bg-stone-50",
      icon: "x"
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 bg-stone-50 flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 bg-white border-b border-stone-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-6 py-3 flex items-start gap-3 max-w-[1180px] mx-auto w-full"
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
  }, /*#__PURE__*/React.createElement("input", {
    value: live.name,
    disabled: !editable,
    onChange: e => upd({
      name: e.target.value
    }),
    className: "text-[16px] font-semibold text-stone-900 bg-transparent outline-none border-b border-transparent focus:border-amber-300 min-w-0 disabled:text-stone-700",
    style: {
      width: "min(420px, 60vw)"
    }
  }), /*#__PURE__*/React.createElement(DeStatusPill, {
    status: live.status
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] font-mono text-stone-400"
  }, live.id, " \xB7 v", live.version)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mt-0.5"
  }, live.baseId ? `A(z) ${live.baseId} alapján · ` : "", live.createdBy, " \xB7 friss\xEDtve ", live.updated, !editable && live.status === "kiadott" ? " · KIADOTT — szerkesztéshez nyiss revíziót (Ellenőrzés)" : "")), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 flex items-center gap-2 flex-wrap justify-end"
  }, (E ? E.nextStates(live) : []).map(to => {
    const b = fsmBtn[to];
    if (!b) return null;
    const lockRelease = to === "kiadott" && !comp.ready;
    return /*#__PURE__*/React.createElement("button", {
      key: to,
      onClick: lockRelease || !canEng ? undefined : () => go(to),
      disabled: lockRelease || !canEng,
      title: !canEng ? "Nincs jogosultság (design.engineer)" : lockRelease ? "Kiadáshoz hiányzik: " + comp.missing.join(" · ") : undefined,
      className: `h-9 px-3 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1.5 ${b.cls} disabled:opacity-50 disabled:cursor-not-allowed`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: b.icon,
      size: 13
    }), b.label);
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-auto",
    style: {
      paddingBottom: "env(safe-area-inset-bottom)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-6 py-4 max-w-[1180px] mx-auto w-full grid lg:grid-cols-[1fr_340px] gap-4 items-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 min-w-0"
  }, /*#__PURE__*/React.createElement(DeSection, {
    icon: "ruler",
    title: "Alapadatok",
    sub: "Megnevez\xE9s, kateg\xF3ria (a st\xEDlus/m\u0171szaki s\xE9m\xE1k kapcsa), t\xEDpus \xE9s megjegyz\xE9s."
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-wide text-stone-400"
  }, "Spec-kateg\xF3ria"), /*#__PURE__*/React.createElement("select", {
    value: live.categoryId || "",
    disabled: !editable,
    onChange: e => upd({
      categoryId: e.target.value
    }),
    className: `w-full mt-0.5 ${DE_IN}`
  }, cats.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name)))), /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-wide text-stone-400"
  }, "T\xEDpus"), /*#__PURE__*/React.createElement("input", {
    value: live.type || "",
    disabled: !editable,
    onChange: e => upd({
      type: e.target.value
    }),
    className: `w-full mt-0.5 ${DE_IN}`
  })), /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-wide text-stone-400"
  }, "Sz\xE1ll\xEDt\xE1si nap"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    value: live.deliveryDays || 7,
    disabled: !editable,
    onChange: e => upd({
      deliveryDays: Math.max(1, Number(e.target.value) || 7)
    }),
    className: `w-full mt-0.5 ${DE_IN}`
  }))), /*#__PURE__*/React.createElement("label", {
    className: "block mt-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-wide text-stone-400"
  }, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("input", {
    value: live.note || "",
    disabled: !editable,
    onChange: e => upd({
      note: e.target.value
    }),
    className: `w-full mt-0.5 ${DE_IN}`,
    placeholder: "R\xF6vid le\xEDr\xE1s a sablonr\xF3l\u2026"
  }))), /*#__PURE__*/React.createElement(DeSection, {
    icon: "settings",
    title: "Param\xE9terek (v\xE1ltoz\xF3k)",
    sub: "A konfigur\xE1torban \xE1ll\xEDthat\xF3 szabad v\xE1ltoz\xF3k. A material-t\xEDpus anyag-slotot ad ({key} \xE9s {key.t} token).",
    right: editable && /*#__PURE__*/React.createElement("button", {
      onClick: addVar,
      className: "h-8 px-2.5 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 12
    }), "\xDAj")
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, (live.vars || []).map((v, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "rounded-xl border border-stone-100 bg-stone-50/50 p-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-[110px_1fr_110px_auto] gap-2 items-center"
  }, /*#__PURE__*/React.createElement("input", {
    value: v.key,
    disabled: !editable,
    onChange: e => patchVar(i, {
      key: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase()
    }),
    className: `font-mono ${DE_IN}`,
    title: "Token-kulcs"
  }), /*#__PURE__*/React.createElement("input", {
    value: v.label,
    disabled: !editable,
    onChange: e => patchVar(i, {
      label: e.target.value
    }),
    className: DE_IN
  }), /*#__PURE__*/React.createElement("select", {
    value: v.kind,
    disabled: !editable,
    onChange: e => patchVar(i, {
      kind: e.target.value
    }),
    className: DE_IN
  }, /*#__PURE__*/React.createElement("option", {
    value: "raster"
  }, "raszter"), /*#__PURE__*/React.createElement("option", {
    value: "analog"
  }, "anal\xF3g"), /*#__PURE__*/React.createElement("option", {
    value: "material"
  }, "anyag")), editable && /*#__PURE__*/React.createElement("button", {
    onClick: () => delVar(i),
    className: "text-stone-300 hover:text-rose-500 justify-self-end"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))), v.kind === "material" ? /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center gap-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 mr-1"
  }, "V\xE1laszthat\xF3 anyagok:"), mats.map(m => {
    const on = (v.options || []).includes(m.code);
    return /*#__PURE__*/React.createElement("button", {
      key: m.code,
      disabled: !editable,
      onClick: () => {
        const opts = on ? (v.options || []).filter(x => x !== m.code) : [...(v.options || []), m.code];
        patchVar(i, {
          options: opts,
          default: opts.includes(v.default) ? v.default : opts[0]
        });
      },
      className: `px-2 h-6 rounded-full text-[10.5px] font-medium border transition ${on ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-white border-stone-200 text-stone-500"} disabled:opacity-60`
    }, m.name || m.code, v.default === m.code ? " ✓" : "");
  })) : /*#__PURE__*/React.createElement("div", {
    className: "mt-2 grid grid-cols-4 gap-2"
  }, [["min", "Min"], ["max", "Max"], ["step", "Lépés"], ["default", "Alap"]].map(([k, l]) => /*#__PURE__*/React.createElement("label", {
    key: k,
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] text-stone-400"
  }, l, v.unit ? ` (${v.unit})` : ""), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: v[k],
    disabled: !editable,
    onChange: e => patchVar(i, {
      [k]: Number(e.target.value)
    }),
    className: `w-full ${DE_IN}`
  })))))), !(live.vars || []).length && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs param\xE9ter \u2014 adj hozz\xE1 legal\xE1bb egyet."))), /*#__PURE__*/React.createElement(DeSection, {
    icon: "cut",
    title: "Alkatr\xE9sz-sorok (k\xE9pletekkel)",
    sub: "M\xE9ret-k\xE9pletek a tokenekkel; az anyag {slot}-token vagy konkr\xE9t k\xF3d. A sorra kattintva \xE9l-kialak\xEDt\xE1s (g\xE9r/sz\xF6g) adhat\xF3.",
    right: editable && /*#__PURE__*/React.createElement("button", {
      onClick: addPart,
      className: "h-8 px-2.5 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 12
    }), "\xDAj")
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 flex-wrap mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 mr-1"
  }, "Tokenek:"), tokens.map(tk => /*#__PURE__*/React.createElement("span", {
    key: tk,
    className: "px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] font-mono"
  }, tk))), /*#__PURE__*/React.createElement("div", {
    className: "hidden sm:grid grid-cols-[1.3fr_70px_1fr_1fr_70px_60px_auto] gap-1.5 px-1 text-[9.5px] uppercase tracking-wide text-stone-400"
  }, /*#__PURE__*/React.createElement("span", null, "Alkatr\xE9sz"), /*#__PURE__*/React.createElement("span", null, "Db"), /*#__PURE__*/React.createElement("span", null, "Sz\xE9less\xE9g"), /*#__PURE__*/React.createElement("span", null, "Magass\xE1g"), /*#__PURE__*/React.createElement("span", null, "Vast."), /*#__PURE__*/React.createElement("span", null, "Felold."), /*#__PURE__*/React.createElement("span", null)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mt-1"
  }, (live.parts || []).map((p, i) => {
    const r = resolved[i] || {};
    const sel = selPart === i;
    const manualGv = window.sim.partMiter ? window.sim.partMiter(live.id, p.name) : null;
    let jGv = {
      short: 0,
      long: 0
    };
    try {
      if (window.TplEngine && window.TplEngine.jointMiters) jGv = window.TplEngine.jointMiters(live, p.name, Number(r.rW) || 0, Number(r.rH) || 0);
    } catch (e) {}
    const gvN = Math.min(2, (manualGv ? manualGv.short || 0 : 0) + jGv.short) + Math.min(2, (manualGv ? manualGv.long || 0 : 0) + jGv.long);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: `rounded-xl border p-2 ${sel ? "border-amber-300 bg-amber-50/30" : "border-stone-100"}`,
      onClick: () => setSelPart(i)
    }, /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 sm:grid-cols-[1.3fr_70px_1fr_1fr_70px_60px_auto] gap-1.5 items-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 min-w-0"
    }, /*#__PURE__*/React.createElement("input", {
      value: p.name,
      disabled: !editable,
      onChange: e => patchPart(i, {
        name: e.target.value
      }),
      className: `w-full ${DE_IN}`
    }), gvN > 0 && /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 text-[8.5px] font-semibold px-1 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200"
    }, "GV")), /*#__PURE__*/React.createElement("input", {
      value: p.qty,
      disabled: !editable,
      onChange: e => patchPart(i, {
        qty: e.target.value
      }),
      className: `font-mono ${DE_IN}`
    }), /*#__PURE__*/React.createElement("input", {
      value: p.w,
      disabled: !editable || isSkel,
      title: isSkel ? "A vázból származtatott (binding)" : undefined,
      onChange: e => patchPart(i, {
        w: e.target.value
      }),
      className: `font-mono ${DE_IN}`
    }), /*#__PURE__*/React.createElement("input", {
      value: p.h,
      disabled: !editable || isSkel,
      title: isSkel ? "A vázból származtatott (binding)" : undefined,
      onChange: e => patchPart(i, {
        h: e.target.value
      }),
      className: `font-mono ${DE_IN}`
    }), /*#__PURE__*/React.createElement("input", {
      value: p.t,
      disabled: !editable || isSkel,
      title: isSkel ? "A vázból származtatott (binding)" : undefined,
      onChange: e => patchPart(i, {
        t: e.target.value
      }),
      className: `font-mono ${DE_IN}`
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-mono text-stone-500 whitespace-nowrap"
    }, r.rW, "\xD7", r.rH), editable ? /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        delPart(i);
      },
      className: "text-stone-300 hover:text-rose-500 justify-self-end"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    })) : /*#__PURE__*/React.createElement("span", null)), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[9.5px] text-stone-400"
    }, "Anyag:"), /*#__PURE__*/React.createElement("input", {
      value: p.mat,
      disabled: !editable,
      onChange: e => patchPart(i, {
        mat: e.target.value
      }),
      className: `font-mono flex-1 ${DE_IN}`,
      style: {
        height: 26
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[9.5px] text-stone-400 font-mono"
    }, "\u2192 ", r.rMat)));
  }), !(live.parts || []).length && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "M\xE9g nincs alkatr\xE9sz \u2014 a kiad\xE1shoz legal\xE1bb egy kell.")), live.parts && live.parts[selPart] && window.PartMiterEditor && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 rounded-xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-1.5 bg-stone-50 text-[10.5px] text-stone-500"
  }, "\xC9l-kialak\xEDt\xE1s \u2014 ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, live.parts[selPart].name)), /*#__PURE__*/React.createElement(window.PartMiterEditor, {
    tplId: live.id,
    partName: live.parts[selPart].name
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement(DeSection, {
    icon: "bolt",
    title: "Vasalat",
    sub: "A vasalat-katal\xF3gusb\xF3l; az \xE1r\xE1t a m\u0171szaki spec m\xE1rk\xE1ja adja.",
    right: editable && /*#__PURE__*/React.createElement("button", {
      onClick: addHw,
      className: "h-8 px-2.5 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 12
    }), "\xDAj")
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, (live.hardware || []).map((h, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("select", {
    value: h.id,
    disabled: !editable,
    onChange: e => patchHw(i, {
      id: e.target.value
    }),
    className: `flex-1 ${DE_IN}`
  }, Object.entries(window.HARDWARE_CATALOG || {}).map(([k, d]) => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, d.name))), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    value: h.qty,
    disabled: !editable,
    onChange: e => patchHw(i, {
      qty: Math.max(1, Number(e.target.value) || 1)
    }),
    className: `w-16 ${DE_IN}`
  }), editable && /*#__PURE__*/React.createElement("button", {
    onClick: () => delHw(i),
    className: "text-stone-300 hover:text-rose-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })))), !(live.hardware || []).length && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs vasalat-t\xE9tel."))), /*#__PURE__*/React.createElement(DeSection, {
    icon: "alert",
    title: "Constraint-szab\xE1lyok",
    sub: "M\xE9ret-\xE9rv\xE9nyess\xE9g a konfigur\xE1torban (token-kifejez\xE9sek).",
    right: editable && /*#__PURE__*/React.createElement("button", {
      onClick: addCon,
      className: "h-8 px-2.5 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 12
    }), "\xDAj")
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, (live.constraints || []).map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "rounded-lg border border-stone-100 p-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: `shrink-0 text-[10px] font-semibold ${conOk(c) ? "text-emerald-600" : "text-rose-600"}`
  }, conOk(c) ? "✓" : "✗"), /*#__PURE__*/React.createElement("input", {
    value: c.rule,
    disabled: !editable,
    onChange: e => patchCon(i, {
      rule: e.target.value
    }),
    className: `flex-1 ${DE_IN}`
  }), editable && /*#__PURE__*/React.createElement("button", {
    onClick: () => delCon(i),
    className: "text-stone-300 hover:text-rose-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))), /*#__PURE__*/React.createElement("input", {
    value: c.expr,
    disabled: !editable,
    onChange: e => patchCon(i, {
      expr: e.target.value
    }),
    className: `w-full mt-1 font-mono ${DE_IN}`,
    style: {
      height: 26
    }
  }))), !(live.constraints || []).length && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs szab\xE1ly.")))), window.ParamViews && /*#__PURE__*/React.createElement(DeSection, {
    icon: "box",
    title: isSkel ? "Parametrikus nézetek — váz (skeleton) + kötések" : "Parametrikus nézetek — kényszergráf (LCS + 4×4 mátrix)",
    sub: isSkel ? "A referenciasíkokból és a 6 határoló kényszerből számított elrendezés — a szaggatott vonalak a síkok (kattinthatók), a piros jelölések a kötésekből generált megmunkálások. Alkatrészre kattintva a kényszerei szerkeszthetők." : "A csatlakozás-kényszerekből számított elrendezés — minden alkatrész lokális koordináta-rendszerrel (LCS), a pozíciók affin transzformációs mátrixokkal származtatva. Kattints egy alkatrészre, majd az él-/lap-sávjaira a kényszerhez; a megmunkálások (piros) a kapcsolatokon definiáltak."
  }, /*#__PURE__*/React.createElement(window.ParamViews, {
    tpl: live,
    editable: editable,
    selName: (live.parts && live.parts[selPart] || {}).name,
    onSelPart: n => {
      const i = (live.parts || []).findIndex(p => p.name === n);
      if (i >= 0) setSelPart(i);
    },
    onPickRef: pickRef,
    selJointId: selJoint,
    onSelJoint: setSelJoint,
    onPickPlane: setSelPlane,
    selPlane: selPlane
  })), isSkel && window.SkelPlanes && skSolved && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DeSection, {
    icon: "workflow",
    title: "V\xE1z \u2014 referencias\xEDkok",
    sub: "A geometria gerince: f\u0151 s\xEDkok (befoglal\xF3) + k\xE9pletes bels\u0151 s\xEDkok (polc, oszt\xF3, n\xFAt). Ha a s\xEDk elmozdul, minden r\xE1k\xF6t\xF6tt alkatr\xE9sz \xE9s k\xF6t\xE9s k\xF6veti."
  }, window.SkelApplyBar && /*#__PURE__*/React.createElement(window.SkelApplyBar, {
    tpl: live,
    editable: editable
  }), /*#__PURE__*/React.createElement(window.SkelPlanes, {
    tpl: live,
    editable: editable,
    upd: upd,
    solved: skSolved,
    selPlane: selPlane,
    onSelPlane: setSelPlane
  }), editable && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (window.sim.addSkeletonPreset({
        fromTplId: live.id
      })) {}
    },
    title: "A s\xEDk-r\xE9teg ment\xE9se \xFAjrahaszn\xE1lhat\xF3 v\xE1z-sablonk\xE9nt (a k\xE9pletekben hivatkozott v\xE1ltoz\xF3kb\xF3l lesznek a param\xE9terei)",
    className: "mt-2 h-7 px-2.5 rounded-lg text-[11px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 11
  }), "Ment\xE9s v\xE1z-sablonk\xE9nt")), /*#__PURE__*/React.createElement(DeSection, {
    icon: "link",
    title: "K\xF6t\xE9sek a s\xEDkokon \u2014 a technol\xF3gia hordoz\xF3i",
    sub: "A val\xF3s\xE1gban a k\xF6t\xE9s tartja \xF6ssze a b\xFAtort \u2014 kapcsolat csak k\xF6t\xE9s-t\xEDpussal l\xE9tezhet (vasalat VAGY anyagban kialak\xEDtott: csapoz\xE1s / g\xE9r / ragaszt\xE1s). A furatk\xE9p \xE9s az \xFAtvonal-megmunk\xE1l\xE1s ebb\u0151l sz\xE1rmazik. A norm\xE1l-ir\xE1ny d\xF6nti el, a s\xEDk melyik oldala fogad."
  }, /*#__PURE__*/React.createElement(window.SkelConnections, {
    tpl: live,
    editable: editable,
    upd: upd,
    solved: skSolved,
    selConn: selJoint,
    onSelConn: setSelJoint
  })), /*#__PURE__*/React.createElement(DeSection, {
    icon: "settings",
    title: "K\xE9nyszerez\xE9s \u2014 6 hat\xE1rol\xF3 k\xE9nyszer (kiv\xE1lasztott alkatr\xE9sz)",
    sub: "Tengelyenk\xE9nt min/max s\xEDk + offset \u2014 a m\xE9ret \xE9s a poz\xEDci\xF3 SZ\xC1RMAZIK, a w/h/t k\xE9pletek automatikusan \xEDr\xF3dnak. V\xE1lassz alkatr\xE9szt fent a sorra vagy a n\xE9zetben kattintva."
  }, /*#__PURE__*/React.createElement(window.SkelBinding, {
    tpl: live,
    editable: editable,
    upd: upd,
    partIdx: selPart,
    solved: skSolved
  })), /*#__PURE__*/React.createElement(DeSection, {
    icon: "alert",
    title: "Teljes k\xE9nyszerezetts\xE9g \u2014 valid\xE1ci\xF3",
    sub: "K\xE9t \xE9rintkez\u0151 lap deklar\xE1lt k\xF6t\xE9s n\xE9lk\xFCl = hiba; a t\xE9rfogati \xE1tfed\xE9s (\xFCtk\xF6z\xE9s) mindig az. A kiad\xE1s e felt\xE9tel n\xE9lk\xFCl LEZ\xC1RT."
  }, /*#__PURE__*/React.createElement(window.SkelErrors, {
    solved: skSolved,
    editable: editable,
    onFix: fixErr
  }))), !isSkel && window.SkelApplyBar && editable && /*#__PURE__*/React.createElement(DeSection, {
    icon: "workflow",
    title: "V\xE1z (skeleton) \u2014 m\xE9g nincs",
    sub: "Ez a sablon m\xE9g a r\xE9gi, alkatr\xE9sz\u2192alkatr\xE9sz k\xE9nyszerez\xE9st haszn\xE1lja. V\xE1z-sablon alkalmaz\xE1s\xE1val \xE1t\xE1ll\xEDthat\xF3 a referencias\xEDk-modellre \u2014 ut\xE1na az alkatr\xE9szeket a s\xEDkokhoz k\xE9nyszerezheted."
  }, /*#__PURE__*/React.createElement(window.SkelApplyBar, {
    tpl: live,
    editable: editable
  })), !isSkel && /*#__PURE__*/React.createElement(DeSection, {
    icon: "link",
    title: "Csatlakoz\xE1sok \u2014 k\xE9nyszerek (\xE9l/lap)",
    sub: "Melyik alkatr\xE9sz melyik LAPJA/\xC9LE csatlakozik a m\xE1sikhoz, milyen megmunk\xE1l\xE1ssal \xE9s eltol\xE1ssal. A lap-alkatr\xE9sznek 2 lapja (A/B) + 4 \xE9le van. A kapcsolat-t\xEDpus (\xC9l\u2013\xC9l / \xC9l\u2013Lap / Lap\u2013Lap) a k\xE9t hivatkoz\xE1sb\xF3l sz\xE1rmazik; a g\xE9r az \xE9l\u2013\xE9l vari\xE1nsa \u2192 auto-GV a szab\xE1sjegyz\xE9kben, a megmunk\xE1l\xE1s pedig a per-alkatr\xE9sz \xFAtvonalat (furat/mar\xE1s) b\u0151v\xEDti.",
    right: editable && /*#__PURE__*/React.createElement("button", {
      onClick: addJoint,
      disabled: partNames.length < 1,
      className: "h-8 px-2.5 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 inline-flex items-center gap-1 disabled:opacity-40"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 12
    }), "\xDAj kapcsolat")
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, (live.joints || []).map((j, i) => {
    const kind = window.TplEngine ? window.TplEngine.jointKind(j) : "el-lap";
    const km = (window.TPL_JOINT_KINDS || {})[kind] || {};
    const valid = window.TplEngine ? window.TplEngine.jointValid(live, j) : true;
    const refA = (window.TPL_REF_BY_KEY || {})[j.a.ref] || {};
    const canGer = kind === "el-el";
    const mach = (window.TPL_MACHINING || {})[j.machining] || {};
    const gst = geoStates[j.id];
    const gstMeta = (window.ParamGeo && window.ParamGeo.PG_STATE || {})[gst] || null;
    const selJ = selJoint === j.id;
    const sideSel = side => /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-[1fr_92px] gap-1.5"
    }, /*#__PURE__*/React.createElement("select", {
      value: j[side].part,
      disabled: !editable,
      onChange: e => patchJointSide(i, side, {
        part: e.target.value
      }),
      className: DE_IN
    }, partNames.map(n => /*#__PURE__*/React.createElement("option", {
      key: n,
      value: n
    }, n))), /*#__PURE__*/React.createElement("select", {
      value: j[side].ref,
      disabled: !editable,
      onChange: e => patchJointSide(i, side, {
        ref: e.target.value
      }),
      className: DE_IN
    }, (window.TPL_PART_REFS || []).map(r => /*#__PURE__*/React.createElement("option", {
      key: r.key,
      value: r.key
    }, r.short))));
    return /*#__PURE__*/React.createElement("div", {
      key: j.id || i,
      onClick: () => setSelJoint(j.id),
      className: `rounded-xl border p-2.5 ${valid ? "border-stone-150 bg-stone-50/40" : "border-rose-200 bg-rose-50/40"} ${selJ ? "ring-2 ring-amber-400" : ""}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2 mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-mono text-stone-400"
    }, j.id), /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center px-2 h-5 rounded-full border text-[10px] font-medium ${km.pill || ""}`
    }, km.label || kind), j.ger && /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center px-1.5 h-5 rounded-full border text-[10px] font-semibold bg-rose-50 text-rose-600 border-rose-200"
    }, "G\xE9r \u2192 GV"), gstMeta && /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center px-1.5 h-5 rounded-full border text-[10px] font-medium ${gstMeta.pill}`,
      title: "A k\xE9nyszergr\xE1f-megold\xF3 \xE1llapota (parametrikus n\xE9zetek)"
    }, gstMeta.label), !valid && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-rose-600 font-medium"
    }, "hi\xE1nyos")), editable && /*#__PURE__*/React.createElement("button", {
      onClick: () => delJoint(i),
      className: "text-stone-300 hover:text-rose-500"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    }))), /*#__PURE__*/React.createElement("div", {
      className: "grid sm:grid-cols-[1fr_auto_1fr] gap-2 items-center"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[9.5px] uppercase tracking-wide text-stone-400 mb-0.5"
    }, "\u201EA\u201D elem \xB7 lap/\xE9l"), sideSel("a")), /*#__PURE__*/React.createElement("div", {
      className: "hidden sm:grid place-items-center text-stone-300"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "link",
      size: 15
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[9.5px] uppercase tracking-wide text-stone-400 mb-0.5"
    }, "\u201EB\u201D elem \xB7 lap/\xE9l"), sideSel("b"))), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 sm:grid-cols-[1.4fr_76px_76px_auto_auto] gap-2 items-end mt-2"
    }, /*#__PURE__*/React.createElement("label", {
      className: "block"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[9.5px] uppercase tracking-wide text-stone-400"
    }, "Megmunk\xE1l\xE1s"), /*#__PURE__*/React.createElement("select", {
      value: j.machining,
      disabled: !editable,
      onChange: e => patchJoint(i, {
        machining: e.target.value
      }),
      className: `w-full mt-0.5 ${DE_IN}`
    }, (window.TPL_MACHINING_ORDER || []).map(k => /*#__PURE__*/React.createElement("option", {
      key: k,
      value: k
    }, (window.TPL_MACHINING[k] || {}).label || k)))), /*#__PURE__*/React.createElement("label", {
      className: "block"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[9.5px] uppercase tracking-wide text-stone-400"
    }, "Eltol. u (mm)"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: j.offset || 0,
      disabled: !editable,
      onChange: e => patchJoint(i, {
        offset: Number(e.target.value) || 0
      }),
      className: `w-full mt-0.5 ${DE_IN}`
    })), /*#__PURE__*/React.createElement("label", {
      className: "block"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[9.5px] uppercase tracking-wide text-stone-400"
    }, "Eltol. v (mm)"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: j.offsetV || 0,
      disabled: !editable,
      onChange: e => patchJoint(i, {
        offsetV: Number(e.target.value) || 0
      }),
      className: `w-full mt-0.5 ${DE_IN}`
    })), /*#__PURE__*/React.createElement("label", {
      className: `inline-flex items-center gap-1.5 h-8 px-2 rounded-lg border text-[11px] font-medium cursor-pointer ${j.ger ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-white border-stone-200 text-stone-500"} ${canGer && editable ? "" : "opacity-50 cursor-not-allowed"}`,
      title: canGer ? "Gérbe vágva (él–él, 45°) — auto-GV" : "Gér csak él–él kapcsolatnál"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      className: "sr-only",
      checked: !!j.ger,
      disabled: !canGer || !editable,
      onChange: e => patchJoint(i, {
        ger: e.target.checked
      })
    }), /*#__PURE__*/React.createElement("span", {
      className: `w-3.5 h-3.5 rounded grid place-items-center ${j.ger ? "bg-rose-500 text-white" : "border border-stone-300"}`
    }, j.ger && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 9
    })), "G\xE9r"), /*#__PURE__*/React.createElement("label", {
      className: `inline-flex items-center gap-1.5 h-8 px-2 rounded-lg border text-[11px] font-medium cursor-pointer ${j.flip ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-stone-200 text-stone-500"} ${editable ? "" : "opacity-50 cursor-not-allowed"}`,
      title: "T\xFCkr\xF6z\xE9s (180\xB0 a kapcsolat v-tengelye k\xF6r\xFCl) \u2014 a sarok m\xE1sik ny\xEDl\xE1si ir\xE1nya"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      className: "sr-only",
      checked: !!j.flip,
      disabled: !editable,
      onChange: e => patchJoint(i, {
        flip: e.target.checked
      })
    }), /*#__PURE__*/React.createElement("span", {
      className: `w-3.5 h-3.5 rounded grid place-items-center ${j.flip ? "bg-amber-500 text-white" : "border border-stone-300"}`
    }, j.flip && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 9
    })), "T\xFCk\xF6r")), (mach.note || j.note) && /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5 flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-stone-400 shrink-0"
    }, mach.note), /*#__PURE__*/React.createElement("input", {
      value: j.note || "",
      disabled: !editable,
      onChange: e => patchJoint(i, {
        note: e.target.value
      }),
      placeholder: "Megjegyz\xE9s\u2026",
      className: `flex-1 ${DE_IN}`,
      style: {
        height: 26
      }
    })));
  }), !(live.joints || []).length && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs csatlakoz\xE1s \u2014 add meg, melyik alkatr\xE9sz \xE9le/lapja hogyan k\xF6t\u0151dik a t\xF6bbihez."))), /*#__PURE__*/React.createElement(DeSection, {
    icon: "box",
    title: "Feloldott alkatr\xE9szlista (alap-param\xE9terekkel)",
    sub: `Becsült anyagköltség: ${deHUF(matCost)} (alap-méretekkel, 12% ráhagyással)`
  }, window.PartsTable && /*#__PURE__*/React.createElement(window.PartsTable, {
    resolvedParts: resolved,
    tplId: live.id
  }))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(DeSection, {
    icon: "check",
    title: "Kiad\xE1s-teljess\xE9g",
    sub: "A \u201EKiad\xE1s\u201D gomb e felt\xE9telek n\xE9lk\xFCl LEZ\xC1RT."
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, comp.checks.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.key,
    className: "flex items-center gap-2 text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-4 h-4 rounded grid place-items-center text-white text-[10px] ${c.ok ? "bg-emerald-500" : "bg-stone-300"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: c.ok ? "check" : "minus",
    size: 10
  })), /*#__PURE__*/React.createElement("span", {
    className: c.ok ? "text-stone-600" : "text-stone-800 font-medium"
  }, c.label))))), /*#__PURE__*/React.createElement(DeSection, {
    icon: "workflow",
    title: "Tervezett munka\xF3ra",
    sub: "Kiindul\xE1s a folyamat-norm\xE1kb\xF3l gener\xE1lhat\xF3; a PONTOS \xE9rt\xE9ket a tesztgy\xE1rt\xE1s t\xE9ny-\xF3r\xE1i adj\xE1k (Kontrolling \u2192 Ut\xF3kalkul\xE1ci\xF3)."
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    step: "0.5",
    value: live.laborHours,
    disabled: !editable,
    onChange: e => upd({
      laborHours: Math.max(0, Number(e.target.value) || 0)
    }),
    className: `w-24 ${DE_IN}`
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-500"
  }, "\xF3ra / egys\xE9g")), /*#__PURE__*/React.createElement("button", {
    onClick: editable ? suggestLabor : undefined,
    disabled: !editable,
    className: "mt-2 w-full h-9 rounded-lg text-[12px] font-medium border border-stone-200 text-stone-700 hover:border-amber-300 inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cpu",
    size: 13
  }), "Javaslat a folyamat-norm\xE1kb\xF3l")), /*#__PURE__*/React.createElement(DeSection, {
    icon: "folder",
    title: "El\u0151zm\xE9ny"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 max-h-[300px] overflow-y-auto"
  }, (live.history || []).slice().reverse().map((h, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "text-[11.5px] text-stone-600 flex items-start gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 11,
    className: "mt-0.5 text-stone-300 shrink-0"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, h.text), /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] font-mono text-stone-400"
  }, h.at))))))))));
}
Object.assign(window, {
  EngTemplatesPage,
  EngTemplateEditor
});
})();
