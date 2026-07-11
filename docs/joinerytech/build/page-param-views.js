/* AUTO-GENERATED from page-param-views.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-param-views.jsx — PARAMETRIKUS 2D SVG NÉZETEK (woodwork_domain §20.4)
//
//   Elölnézet (X–Z) · Felülnézet (X–Y) · Oldalnézet (Y–Z) — a ParamGeo
//   kényszergráf-megoldó (param-geometry.js) globál elrendezéséből, React
//   state-ből deklaratívan renderelve. Interakció: alkatrészre kattintás =
//   kijelölés; a kijelölt alkatrész ÉLEI/LAPJAI kattinthatók → a hozzá
//   tartozó csatlakozás-kényszer kijelölése vagy új kényszer indítása
//   (onPickRef). Próba-paraméter csúszkák: a nézetek ÉLŐBEN követik a
//   méretváltozást (a kényszergráf újraszámol — §20.2).
//
//   Megmunkálás-réteg (§20.3): furatpontok / excenter / lamelló / horony /
//   polcfurat-sor a nézeteken + a kijelölt kapcsolat furatképe MINDKÉT
//   alkatrész saját LCS-ében (táblázat).
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStatePV,
  useMemo: useMemoPV
} = React;
const PV_VIEWS = [{
  key: "front",
  label: "Elölnézet (X–Z)",
  px: p => p[0],
  py: p => -p[2],
  depth: p => -p[1],
  axIdx: 0,
  ayIdx: 2
}, {
  key: "top",
  label: "Felülnézet (X–Y)",
  px: p => p[0],
  py: p => p[1],
  depth: p => p[2],
  axIdx: 0,
  ayIdx: 1
}, {
  key: "side",
  label: "Oldalnézet (Y–Z)",
  px: p => p[1],
  py: p => -p[2],
  depth: p => -p[0],
  axIdx: 1,
  ayIdx: 2
}];
function PvViewSvg({
  view,
  solved,
  selName,
  onSelPart,
  onPickRef,
  editable,
  showOps,
  onPickPlane,
  selPlane
}) {
  const Aff = window.ParamGeo.Aff;
  const W = 252,
    H = 196,
    PAD = 16;
  // nézet-bbox az összes alkatrész sarkaiból
  let mn = [1e9, 1e9],
    mx = [-1e9, -1e9];
  const projParts = solved.parts.filter(p => p.aabb).map(p => {
    const cs = [];
    const {
      min,
      max
    } = p.aabb;
    [[min[0], min[1], min[2]], [max[0], min[1], min[2]], [min[0], max[1], min[2]], [min[0], min[1], max[2]], [max[0], max[1], min[2]], [max[0], min[1], max[2]], [min[0], max[1], max[2]], [max[0], max[1], max[2]]].forEach(c => {
      const x = view.px(c),
        y = view.py(c);
      cs.push([x, y]);
      mn = [Math.min(mn[0], x), Math.min(mn[1], y)];
      mx = [Math.max(mx[0], x), Math.max(mx[1], y)];
    });
    const xs = cs.map(c => c[0]),
      ys = cs.map(c => c[1]);
    return {
      p,
      x0: Math.min(...xs),
      y0: Math.min(...ys),
      x1: Math.max(...xs),
      y1: Math.max(...ys),
      d: view.depth([(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2])
    };
  });
  if (!projParts.length) return null;
  const sc = Math.min((W - 2 * PAD) / Math.max(1, mx[0] - mn[0]), (H - 2 * PAD) / Math.max(1, mx[1] - mn[1]));
  const ox = (W - (mx[0] - mn[0]) * sc) / 2,
    oy = (H - (mx[1] - mn[1]) * sc) / 2;
  const X = x => ox + (x - mn[0]) * sc,
    Y = y => oy + (y - mn[1]) * sc;
  const PT = g => [X(view.px(g)), Y(view.py(g))];
  projParts.sort((a, b) => a.d - b.d); // távoli először

  // a kijelölt alkatrész ref-hotspotjai: él-sávok (ahol a normál a nézet síkjába esik)
  // + lap-hotspot középen (ha a normál a nézőre mutat)
  const sel = projParts.find(q => q.p.name === selName);
  const hotspots = [];
  if (sel && sel.p.M) {
    (window.TPL_PART_REFS || []).forEach(ref => {
      const f = window.ParamGeo.frameOf(ref.key, sel.p);
      const nG = Aff.dir(sel.p.M, f.n);
      const n2 = [view.px(nG), view.py(nG)];
      const mag = Math.hypot(n2[0], n2[1]);
      const rx0 = X(sel.x0),
        ry0 = Y(sel.y0),
        rx1 = X(sel.x1),
        ry1 = Y(sel.y1);
      if (mag > 0.5) {
        // él-sáv a megfelelő oldalon
        const horiz = Math.abs(n2[0]) > Math.abs(n2[1]);
        const t = 5;
        let r;
        if (horiz) r = n2[0] > 0 ? {
          x: rx1 - t,
          y: ry0,
          w: t,
          h: ry1 - ry0
        } : {
          x: rx0,
          y: ry0,
          w: t,
          h: ry1 - ry0
        };else r = n2[1] > 0 ? {
          x: rx0,
          y: ry1 - t,
          w: rx1 - rx0,
          h: t
        } : {
          x: rx0,
          y: ry0,
          w: rx1 - rx0,
          h: t
        };
        hotspots.push({
          ref,
          rect: r
        });
      } else if (ref.kind === "face") {
        // a nézőre (vagy tőle el) mutató lap — kör középen
        hotspots.push({
          ref,
          circle: {
            cx: (rx0 + rx1) / 2 + (ref.key === "face-b" ? 9 : -9),
            cy: (ry0 + ry1) / 2
          }
        });
      }
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-white overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-2.5 py-1 text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", null, view.label), /*#__PURE__*/React.createElement("span", {
    className: "font-mono normal-case"
  }, "M 1:", Math.max(1, Math.round(1 / sc)))), /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} ${H}`,
    className: "w-full block select-none",
    style: {
      background: "#fafaf9"
    }
  }, (solved.planes || []).map(pl => {
    if (pl.value == null || !isFinite(pl.value)) return null;
    const AX = {
      X: 0,
      Y: 1,
      Z: 2
    }[pl.axis];
    const isSel = selPlane === pl.id;
    const col = isSel ? "#d97706" : "#a8a29e";
    const pt = [0, 0, 0];
    pt[AX] = pl.value;
    if (AX === view.axIdx) {
      const x = X(view.px(pt));
      return /*#__PURE__*/React.createElement("g", {
        key: pl.id,
        style: {
          cursor: "pointer"
        },
        onClick: e => {
          e.stopPropagation();
          onPickPlane && onPickPlane(pl.id);
        }
      }, /*#__PURE__*/React.createElement("line", {
        x1: x,
        y1: 4,
        x2: x,
        y2: H - 4,
        stroke: col,
        strokeWidth: isSel ? 1.2 : 0.7,
        strokeDasharray: "6 4"
      }), /*#__PURE__*/React.createElement("line", {
        x1: x,
        y1: 0,
        x2: x,
        y2: H,
        stroke: "transparent",
        strokeWidth: "7"
      }, /*#__PURE__*/React.createElement("title", null, pl.label || pl.id, " \xB7 ", pl.axis, " = ", Math.round(pl.value))), /*#__PURE__*/React.createElement("text", {
        x: x + 2,
        y: 9,
        fontSize: "6.5",
        fontFamily: "ui-monospace, monospace",
        fill: col
      }, pl.label || pl.id));
    }
    if (AX === view.ayIdx) {
      const y = Y(view.py(pt));
      return /*#__PURE__*/React.createElement("g", {
        key: pl.id,
        style: {
          cursor: "pointer"
        },
        onClick: e => {
          e.stopPropagation();
          onPickPlane && onPickPlane(pl.id);
        }
      }, /*#__PURE__*/React.createElement("line", {
        x1: 4,
        y1: y,
        x2: W - 4,
        y2: y,
        stroke: col,
        strokeWidth: isSel ? 1.2 : 0.7,
        strokeDasharray: "6 4"
      }), /*#__PURE__*/React.createElement("line", {
        x1: 0,
        y1: y,
        x2: W,
        y2: y,
        stroke: "transparent",
        strokeWidth: "7"
      }, /*#__PURE__*/React.createElement("title", null, pl.label || pl.id, " \xB7 ", pl.axis, " = ", Math.round(pl.value))), /*#__PURE__*/React.createElement("text", {
        x: 3,
        y: y - 2.5,
        fontSize: "6.5",
        fontFamily: "ui-monospace, monospace",
        fill: col
      }, pl.label || pl.id));
    }
    return null;
  }), projParts.map(q => {
    const isSel = q.p.name === selName;
    return /*#__PURE__*/React.createElement("rect", {
      key: q.p.name,
      x: X(q.x0),
      y: Y(q.y0),
      width: Math.max(1, X(q.x1) - X(q.x0)),
      height: Math.max(1, Y(q.y1) - Y(q.y0)),
      fill: isSel ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.92)",
      stroke: isSel ? "#d97706" : q.p.floating ? "#a8a29e" : "#57534e",
      strokeWidth: isSel ? 1.6 : 1,
      strokeDasharray: q.p.floating ? "4 3" : undefined,
      style: {
        cursor: "pointer"
      },
      onClick: () => onSelPart && onSelPart(q.p.name)
    }, /*#__PURE__*/React.createElement("title", null, q.p.name, " \u2014 ", q.p.w, "\xD7", q.p.h, "\xD7", q.p.t, " mm", q.p.floating ? " (nem kötött)" : q.p.root ? " (gyökér)" : ""));
  }), showOps && solved.ops.map((o, i) => {
    if (o.type === "groove") {
      const a = PT(o.p),
        b = PT(o.p2);
      return /*#__PURE__*/React.createElement("line", {
        key: i,
        x1: a[0],
        y1: a[1],
        x2: b[0],
        y2: b[1],
        stroke: "#e11d48",
        strokeWidth: "1.4",
        strokeDasharray: "5 3",
        opacity: "0.8"
      }, /*#__PURE__*/React.createElement("title", null, o.label));
    }
    const c = PT(o.p);
    const ax2 = [view.px(o.axis), view.py(o.axis)];
    const facing = Math.hypot(ax2[0], ax2[1]) < 0.5; // tengely a nézőre mutat → kör
    if (o.type === "slot") {
      const u2 = [view.px(o.uDir), view.py(o.uDir)];
      const l = o.len * sc / 2;
      return /*#__PURE__*/React.createElement("line", {
        key: i,
        x1: c[0] - u2[0] * l,
        y1: c[1] - u2[1] * l,
        x2: c[0] + u2[0] * l,
        y2: c[1] + u2[1] * l,
        stroke: "#e11d48",
        strokeWidth: "2.4",
        strokeLinecap: "round",
        opacity: facing ? 0.85 : 0.4
      }, /*#__PURE__*/React.createElement("title", null, o.label));
    }
    const r = Math.max(1.4, o.dia * sc / 2);
    return /*#__PURE__*/React.createElement("g", {
      key: i,
      opacity: facing ? 0.95 : 0.45
    }, /*#__PURE__*/React.createElement("circle", {
      cx: c[0],
      cy: c[1],
      r: r,
      fill: o.type === "cam" ? "none" : "#e11d48",
      stroke: "#e11d48",
      strokeWidth: "1"
    }, /*#__PURE__*/React.createElement("title", null, o.label)), facing && o.type === "cam" && /*#__PURE__*/React.createElement("circle", {
      cx: c[0],
      cy: c[1],
      r: Math.max(0.8, r * 0.25),
      fill: "#e11d48"
    }));
  }), sel && sel.p.M && (() => {
    const org = PT(window.ParamGeo.Aff.ap(sel.p.M, [0, 0, 0]));
    const ax = (v, col, lbl) => {
      const d2 = [view.px(v), view.py(v)];
      if (Math.hypot(d2[0], d2[1]) < 0.4) return null;
      const e = [org[0] + d2[0] * 22, org[1] + d2[1] * 22];
      return /*#__PURE__*/React.createElement("g", {
        key: lbl
      }, /*#__PURE__*/React.createElement("line", {
        x1: org[0],
        y1: org[1],
        x2: e[0],
        y2: e[1],
        stroke: col,
        strokeWidth: "1.4"
      }), /*#__PURE__*/React.createElement("text", {
        x: e[0] + d2[0] * 6,
        y: e[1] + d2[1] * 6 + 3,
        fontSize: "8",
        fontFamily: "ui-monospace, monospace",
        fill: col,
        textAnchor: "middle"
      }, lbl));
    };
    const M = sel.p.M;
    return /*#__PURE__*/React.createElement("g", {
      opacity: "0.9"
    }, ax(window.ParamGeo.Aff.dir(M, [1, 0, 0]), "#dc2626", "X"), ax(window.ParamGeo.Aff.dir(M, [0, 1, 0]), "#16a34a", "Y"), ax(window.ParamGeo.Aff.dir(M, [0, 0, 1]), "#2563eb", "Z"));
  })(), hotspots.map((h, i) => h.rect ? /*#__PURE__*/React.createElement("rect", {
    key: i,
    x: h.rect.x,
    y: h.rect.y,
    width: h.rect.w,
    height: h.rect.h,
    rx: "2",
    fill: "rgba(217,119,6,0.35)",
    stroke: "#d97706",
    strokeWidth: "0.6",
    style: {
      cursor: editable ? "crosshair" : "pointer"
    },
    className: "pv-hot",
    onClick: e => {
      e.stopPropagation();
      onPickRef && onPickRef(selName, h.ref.key);
    }
  }, /*#__PURE__*/React.createElement("title", null, h.ref.label, " \u2014 kattints a k\xE9nyszerhez")) : /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: h.circle.cx,
    cy: h.circle.cy,
    r: "6",
    fill: "rgba(217,119,6,0.3)",
    stroke: "#d97706",
    strokeWidth: "0.8",
    style: {
      cursor: editable ? "crosshair" : "pointer"
    },
    onClick: e => {
      e.stopPropagation();
      onPickRef && onPickRef(selName, h.ref.key);
    }
  }, /*#__PURE__*/React.createElement("title", null, h.ref.label, " \u2014 kattints a k\xE9nyszerhez")))));
}
function ParamViews({
  tpl,
  editable,
  selName,
  onSelPart,
  onPickRef,
  selJointId,
  onSelJoint,
  onPickPlane,
  selPlane
}) {
  const PG = window.ParamGeo;
  const [ov, setOv] = useStatePV({});
  const [showOps, setShowOps] = useStatePV(true);
  const numVars = (tpl.vars || []).filter(v => v.kind !== "material");
  const vals = Object.fromEntries((tpl.vars || []).map(v => [v.key, ov[v.key] != null ? ov[v.key] : v.default]));
  const depKey = JSON.stringify([tpl.parts, tpl.joints, tpl.skeleton, tpl.connections, vals]);
  const solved = useMemoPV(() => {
    // SKELETON-sablon (§21): a váz-megoldó számol — síkok + binding + kötések
    if (tpl.skeleton && window.Skel) {
      try {
        return window.Skel.solve(tpl, vals);
      } catch (e) {
        return {
          parts: [],
          joints: [],
          ops: [],
          errors: [],
          planes: [],
          bbox: null,
          err: String(e)
        };
      }
    }
    const parts = (tpl.parts || []).map(p => {
      const rf = e => {
        try {
          return window.resolveFormula(e, vals);
        } catch (x) {
          return NaN;
        }
      };
      return {
        name: p.name,
        w: Number(rf(p.w)),
        h: Number(rf(p.h)),
        t: Number(rf(p.t)) || 18
      };
    }).filter(p => p.name && isFinite(p.w) && isFinite(p.h) && p.w > 0 && p.h > 0);
    try {
      return PG.solve(tpl, parts);
    } catch (e) {
      return {
        parts: [],
        joints: [],
        ops: [],
        bbox: null,
        err: String(e)
      };
    }
  }, [depKey]);
  const selJoint = (solved.joints || []).find(j => j.id === selJointId);
  const selOps = selJoint ? (solved.ops || []).filter(o => o.jointId === selJointId) : [];
  const ST = {
    ...(PG.PG_STATE || {}),
    ...((window.Skel || {}).SKEL_STATE || {})
  };
  if (!solved.parts.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] text-stone-400"
    }, "A n\xE9zetekhez sz\xE1mszer\u0171en feloldhat\xF3 alkatr\xE9sz-m\xE9retek kellenek.");
  }
  const bb = solved.bbox;
  return /*#__PURE__*/React.createElement("div", null, numVars.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-3 rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-wide text-stone-400"
  }, "Pr\xF3ba-param\xE9terek \u2014 a n\xE9zetek \xE9l\u0151ben k\xF6vetik"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, Object.keys(ov).length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setOv({}),
    className: "text-[10.5px] text-amber-700 font-medium hover:underline"
  }, "alaphelyzet"), /*#__PURE__*/React.createElement("label", {
    className: "inline-flex items-center gap-1 text-[10.5px] text-stone-500 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: showOps,
    onChange: e => setShowOps(e.target.checked),
    className: "accent-rose-600"
  }), "megmunk\xE1l\xE1sok"))), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1"
  }, numVars.map(v => /*#__PURE__*/React.createElement("label", {
    key: v.key,
    className: "flex items-center gap-2 text-[11px] text-stone-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-20 shrink-0 truncate",
    title: v.label
  }, v.label), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: v.min,
    max: v.max,
    step: v.step || 1,
    value: vals[v.key],
    onChange: e => setOv({
      ...ov,
      [v.key]: Number(e.target.value)
    }),
    className: "flex-1 accent-amber-600 h-1"
  }), /*#__PURE__*/React.createElement("span", {
    className: "w-14 text-right font-mono text-[10.5px] text-stone-700"
  }, vals[v.key], v.unit || ""))))), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-3 gap-2.5"
  }, PV_VIEWS.map(v => /*#__PURE__*/React.createElement(PvViewSvg, {
    key: v.key,
    view: v,
    solved: solved,
    selName: selName,
    onSelPart: onSelPart,
    onPickRef: onPickRef,
    editable: editable,
    showOps: showOps,
    onPickPlane: onPickPlane,
    selPlane: selPlane
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 flex items-center gap-1.5 flex-wrap text-[10.5px]"
  }, bb && /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-stone-500 mr-1"
  }, "befoglal\xF3 ", Math.round(bb.max[0] - bb.min[0]), "\xD7", Math.round(bb.max[1] - bb.min[1]), "\xD7", Math.round(bb.max[2] - bb.min[2]), " mm"), (solved.joints || []).map(j => {
    const st = ST[j.state] || {};
    const on = j.id === selJointId;
    return /*#__PURE__*/React.createElement("button", {
      key: j.id,
      onClick: () => onSelJoint && onSelJoint(on ? null : j.id),
      className: `inline-flex items-center gap-1 px-1.5 h-5 rounded-full border font-medium ${st.pill || ""} ${on ? "ring-2 ring-amber-400" : ""}`,
      title: `${j.a.part} ↔ ${j.b.part} — ${st.label || j.state}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-mono"
    }, j.id), "\xB7", st.label || j.state);
  })), selJoint && selOps.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 rounded-xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-1.5 bg-stone-50 text-[10.5px] text-stone-500"
  }, "Furatk\xE9p \u2014 ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-stone-700"
  }, selJoint.id), " \xB7 ", selJoint.a.part, " \u2194 ", selJoint.b.part, " \xB7 a koordin\xE1t\xE1k MINDK\xC9T alkatr\xE9sz saj\xE1t lok\xE1lis rendszer\xE9ben (LCS) sz\xE1m\xEDtottak"), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-stone-100"
  }, [selJoint.a.part, selJoint.b.part].map(pn => /*#__PURE__*/React.createElement("div", {
    key: pn,
    className: "px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-400 mb-1"
  }, pn, " \u2014 LCS (X\xB7Y\xB7Z mm)"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-0.5 max-h-[130px] overflow-y-auto"
  }, selOps.filter(o => o.local && o.local[pn]).map((o, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-2 text-[10.5px] font-mono text-stone-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-rose-500 shrink-0",
    style: {
      borderRadius: o.type === "slot" || o.type === "groove" ? 1 : 99
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 w-[88px] truncate font-sans"
  }, o.label), /*#__PURE__*/React.createElement("span", null, "(", o.local[pn].join(" · "), ")"))), !selOps.some(o => o.local && o.local[pn]) && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, "\u2014")))))));
}
Object.assign(window, {
  ParamViews
});
})();
