/* AUTO-GENERATED from page-skeleton-presets.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-skeleton-presets.jsx — VÁZ-SABLON KÖNYVTÁR UI (woodwork_domain §21.5)
//
//   • SkelPresetsPanel  — könyvtár-lista a Műszaki tervezés főoldalán
//   • SkelPresetEditor  — váz-sablon szerkesztő (paraméterek + síkok) modal
//   • SkelApplyBar      — váz alkalmazása egy bútor-sablonra (a szerkesztőben):
//                         preset-választó + paraméter-leképezés (meglévő
//                         változóra VAGY új paraméterként) → applySkeletonPreset
//   Store: skeletonPresetList / addSkeletonPreset / updateSkeletonPreset /
//          removeSkeletonPreset / applySkeletonPreset. design.engineer jog.
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateSP
} = React;
const SP_IN = "h-7 px-1.5 rounded-md border border-stone-200 bg-white text-[11px] text-stone-800 outline-none focus:border-amber-400 disabled:bg-stone-50 disabled:text-stone-400";
const SP_AXIS_LBL = {
  X: "X — szélesség",
  Y: "Y — mélység",
  Z: "Z — magasság"
};

// ── Könyvtár-panel (a sablon-műhely főoldalán) ──
function SkelPresetsPanel() {
  const s = useSim();
  const canEng = window.sim.hasPerm && window.sim.hasPerm("design.engineer");
  const [editId, setEditId] = useStateSP(null);
  const presets = s.skeletonPresets || [];
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium"
  }, "V\xE1z-sablonok (", presets.length, ") \u2014 referencias\xEDk-r\xE9tegek"), /*#__PURE__*/React.createElement("button", {
    onClick: canEng ? () => {
      const id = window.sim.addSkeletonPreset({});
      if (id) setEditId(id);
    } : undefined,
    disabled: !canEng,
    title: canEng ? "Új váz-sablon — a síkokat egyszer adod meg, utána paraméterként él" : "Nincs jogosultság (design.engineer)",
    className: "h-7 px-2.5 rounded-lg text-[11px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 disabled:opacity-50 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 11
  }), "\xDAj v\xE1z-sablon")), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5"
  }, presets.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => setEditId(p.id),
    className: "text-left bg-white rounded-2xl border border-stone-200 p-3 hover:border-amber-300 hover:shadow-sm transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900 leading-tight"
  }, p.name), /*#__PURE__*/React.createElement("span", {
    className: "shrink-0 text-[9.5px] font-mono text-stone-400"
  }, p.id)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mt-1 line-clamp-2"
  }, p.desc), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center gap-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center px-1.5 h-5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-medium"
  }, (p.planes || []).length, " s\xEDk"), (p.params || []).map(pp => /*#__PURE__*/React.createElement("span", {
    key: pp.key,
    className: "inline-flex items-center px-1.5 h-5 rounded-full border border-stone-200 text-stone-500 text-[10px] font-mono"
  }, pp.key)))))), editId && /*#__PURE__*/React.createElement(SkelPresetEditor, {
    id: editId,
    onClose: () => setEditId(null)
  }));
}

// ── Váz-sablon szerkesztő (modal) ──
function SkelPresetEditor({
  id,
  onClose
}) {
  const s = useSim();
  const canEng = window.sim.hasPerm && window.sim.hasPerm("design.engineer");
  const p = (s.skeletonPresets || []).find(x => x.id === id);
  if (!p) return null;
  const upd = patch => window.sim.updateSkeletonPreset(id, patch);
  const patchParam = (i, q) => upd({
    params: p.params.map((x, idx) => idx === i ? {
      ...x,
      ...q
    } : x)
  });
  const patchPlane = (i, q) => upd({
    planes: p.planes.map((x, idx) => idx === i ? {
      ...x,
      ...q
    } : x)
  });
  // élő ellenőrzés: a default-értékekkel kiértékelt sík-pozíciók
  const dv = Object.fromEntries((p.params || []).map(q => [q.key, q.default]));
  const evalF = f => {
    try {
      const v = window.resolveFormula(f, dv);
      return isFinite(v) ? Math.round(v * 10) / 10 : "—";
    } catch (e) {
      return "—";
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[70] flex items-end sm:items-center justify-center",
    "data-screen-label": "V\xE1z-sablon szerkeszt\u0151"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-stone-900/40",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full sm:max-w-[760px] sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[88vh] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 px-4 py-3 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "workflow",
    size: 16,
    className: "text-amber-600 shrink-0"
  }), /*#__PURE__*/React.createElement("input", {
    value: p.name,
    disabled: !canEng,
    onChange: e => upd({
      name: e.target.value
    }),
    className: "flex-1 text-[14px] font-semibold text-stone-900 outline-none bg-transparent border-b border-transparent focus:border-amber-300"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-mono text-stone-400"
  }, p.id), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-stone-400 hover:text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto px-4 py-3 space-y-4"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: p.desc || "",
    disabled: !canEng,
    onChange: e => upd({
      desc: e.target.value
    }),
    rows: 2,
    placeholder: "Mire val\xF3 ez a v\xE1z? (pl. korpusz, front, sarokszekr\xE9ny)",
    className: "w-full rounded-lg border border-stone-200 px-2 py-1.5 text-[11.5px] text-stone-700 outline-none focus:border-amber-400 resize-none"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 mb-1"
  }, "Param\xE9terek \u2014 ezeket EGYSZER adod meg, az alkalmaz\xE1s ut\xE1n m\xE1r csak \xE9rt\xE9kk\xE9nt \xE9lnek"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, (p.params || []).map((q, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "grid grid-cols-[64px_1fr_70px_70px_70px_auto] gap-1.5 items-center"
  }, /*#__PURE__*/React.createElement("input", {
    value: q.key,
    disabled: !canEng,
    onChange: e => patchParam(i, {
      key: e.target.value.replace(/[^A-Za-z0-9_]/g, "")
    }),
    className: `font-mono font-semibold ${SP_IN}`
  }), /*#__PURE__*/React.createElement("input", {
    value: q.label,
    disabled: !canEng,
    onChange: e => patchParam(i, {
      label: e.target.value
    }),
    className: SP_IN
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: q.default,
    disabled: !canEng,
    title: "Alap\xE9rt\xE9k",
    onChange: e => patchParam(i, {
      default: Number(e.target.value) || 0
    }),
    className: `font-mono ${SP_IN}`
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: q.min,
    disabled: !canEng,
    title: "Min",
    onChange: e => patchParam(i, {
      min: Number(e.target.value) || 0
    }),
    className: `font-mono ${SP_IN}`
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: q.max,
    disabled: !canEng,
    title: "Max",
    onChange: e => patchParam(i, {
      max: Number(e.target.value) || 0
    }),
    className: `font-mono ${SP_IN}`
  }), canEng ? /*#__PURE__*/React.createElement("button", {
    onClick: () => upd({
      params: p.params.filter((_, idx) => idx !== i)
    }),
    className: "text-stone-300 hover:text-rose-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  })) : /*#__PURE__*/React.createElement("span", null)))), canEng && /*#__PURE__*/React.createElement("button", {
    onClick: () => upd({
      params: [...(p.params || []), {
        key: "P" + ((p.params || []).length + 1),
        label: "Új paraméter",
        unit: "mm",
        default: 100,
        min: 0,
        max: 3000
      }]
    }),
    className: "mt-1.5 h-6 px-2 rounded-md text-[10.5px] font-medium border border-stone-200 text-stone-500 hover:border-amber-300 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 10
  }), "Param\xE9ter")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 mb-1"
  }, "Referencias\xEDkok \u2014 a term\xE9szetes elnevez\xE9sekkel (zsan\xE9r-oldal, tet\u0151\u2026)"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, (p.planes || []).map((pl, i) => /*#__PURE__*/React.createElement("div", {
    key: pl.id,
    className: "grid grid-cols-2 sm:grid-cols-[88px_1fr_120px_1.1fr_56px_auto] gap-1.5 items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] font-mono text-stone-400"
  }, pl.id, pl.main ? " · fő" : ""), /*#__PURE__*/React.createElement("input", {
    value: pl.label,
    disabled: !canEng,
    onChange: e => patchPlane(i, {
      label: e.target.value
    }),
    className: SP_IN
  }), /*#__PURE__*/React.createElement("select", {
    value: pl.axis,
    disabled: !canEng,
    onChange: e => patchPlane(i, {
      axis: e.target.value
    }),
    className: SP_IN
  }, Object.entries(SP_AXIS_LBL).map(([k, l]) => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, l))), /*#__PURE__*/React.createElement("input", {
    value: pl.formula,
    disabled: !canEng,
    onChange: e => patchPlane(i, {
      formula: e.target.value
    }),
    className: `font-mono ${SP_IN}`
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-mono text-stone-500 text-right"
  }, evalF(pl.formula)), canEng && !pl.main ? /*#__PURE__*/React.createElement("button", {
    onClick: () => upd({
      planes: p.planes.filter((_, idx) => idx !== i)
    }),
    className: "text-stone-300 hover:text-rose-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  })) : /*#__PURE__*/React.createElement("span", null)))), canEng && /*#__PURE__*/React.createElement("button", {
    onClick: () => upd({
      planes: [...(p.planes || []), {
        id: "pl-" + Date.now().toString(36).slice(-4),
        label: "Új sík",
        axis: "Z",
        formula: "{H} / 2"
      }]
    }),
    className: "mt-1.5 h-6 px-2 rounded-md text-[10.5px] font-medium border border-stone-200 text-stone-500 hover:border-amber-300 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 10
  }), "S\xEDk"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-4 py-2.5 border-t border-stone-100"
  }, canEng && !p.builtin ? /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm("Váz-sablon törlése?")) {
        window.sim.removeSkeletonPreset(id);
        onClose();
      }
    },
    className: "h-8 px-3 rounded-lg text-[11.5px] font-medium text-rose-600 border border-rose-200 hover:bg-rose-50"
  }, "T\xF6rl\xE9s") : /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400"
  }, p.builtin ? "Beépített váz — a módosítás sajáttá teszi" : ""), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-8 px-3.5 rounded-lg text-[11.5px] font-semibold bg-stone-900 text-white hover:bg-stone-700"
  }, "K\xE9sz"))));
}

// ── Váz alkalmazása bútor-sablonra (a sablon-szerkesztő Váz szekciójában) ──
function SkelApplyBar({
  tpl,
  editable
}) {
  const s = useSim();
  const [presetId, setPresetId] = useStateSP("");
  const [map, setMap] = useStateSP({});
  const presets = s.skeletonPresets || [];
  const preset = presets.find(p => p.id === presetId);
  const vars = (tpl.vars || []).filter(v => v.kind !== "material");
  // alap-leképezés javaslat: kulcs- vagy címke-egyezés (W→width, Magasság→height…)
  const guess = pp => {
    const hit = vars.find(v => v.key.toLowerCase() === pp.key.toLowerCase()) || vars.find(v => (v.label || "").toLowerCase().startsWith((pp.label || "").toLowerCase().slice(0, 4))) || vars.find(v => ({
      w: "width",
      h: "height",
      d: "depth",
      t: "thickness"
    })[pp.key.toLowerCase()] === v.key);
    return hit ? hit.key : "__new";
  };
  const apply = () => {
    const m = {};
    (preset.params || []).forEach(pp => {
      const sel = map[pp.key] != null ? map[pp.key] : guess(pp);
      m[pp.key] = sel === "__new" ? pp.key : sel;
    });
    if (window.sim.applySkeletonPreset(tpl.id, presetId, m)) {
      setPresetId("");
      setMap({});
    }
  };
  if (!editable || !presets.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-2.5 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-medium text-amber-800"
  }, "V\xE1z alkalmaz\xE1sa sablonb\xF3l:"), /*#__PURE__*/React.createElement("select", {
    value: presetId,
    onChange: e => {
      setPresetId(e.target.value);
      setMap({});
    },
    className: SP_IN
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "v\xE1lassz v\xE1zat\u2026"), presets.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name))), preset && /*#__PURE__*/React.createElement("button", {
    onClick: apply,
    className: "h-7 px-3 rounded-lg text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-700"
  }, "Alkalmaz"), tpl.skeleton && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-amber-700"
  }, "\u2014 a megl\xE9v\u0151 s\xEDkokat lecser\xE9li (a k\xF6t\xE9sek/k\xE9nyszerek s\xEDk-azonos\xEDt\xF3 szerint \xE9lnek tov\xE1bb)")), preset && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5"
  }, (preset.params || []).map(pp => {
    const sel = map[pp.key] != null ? map[pp.key] : guess(pp);
    return /*#__PURE__*/React.createElement("label", {
      key: pp.key,
      className: "flex items-center gap-1.5 text-[10.5px] text-stone-600"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-24 shrink-0 truncate"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-mono font-semibold"
    }, pp.key), " \xB7 ", pp.label), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 10,
      className: "text-stone-400 shrink-0"
    }), /*#__PURE__*/React.createElement("select", {
      value: sel,
      onChange: e => setMap({
        ...map,
        [pp.key]: e.target.value
      }),
      className: `flex-1 ${SP_IN}`
    }, /*#__PURE__*/React.createElement("option", {
      value: "__new"
    }, "+ \xFAj param\xE9ter (", pp.key, ")"), vars.map(v => /*#__PURE__*/React.createElement("option", {
      key: v.key,
      value: v.key
    }, v.label, " (", v.key, ")"))));
  })));
}
Object.assign(window, {
  SkelPresetsPanel,
  SkelPresetEditor,
  SkelApplyBar
});
})();
