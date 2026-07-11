/* AUTO-GENERATED from page-floorplan-2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-floorplan-2.jsx — FpInspector: a Térrendezés jobb oldali panele
//
//   A RÉSZLETESSÉG-LÉTRA (LOD) megtestesítője — a kijelölés típusa dönti el,
//   MENNYI adat töltődik be:
//     • semmi / helyiség / zóna / kontúr → TÉR-szint: név + méret, ennyi elég
//     • bútorsor-elem (kivetített)       → ELEM-szint: kivitel + ár + száll. idő
//        (a snapshot mezőiből — NEM hívunk MfgPrep-et, nem oldunk fel furatot!)
//     • műszaki szint → NEM itt él; deep-link a Tervezés → Gyártás-adatlapra
//   Falnézet-kezelés: helyiség-oldalanként bútorsor link/létrehozás/megnyitás.
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateFp2
} = React;

// LOD-létra kijelző
function FpLodLadder({
  level
}) {
  const steps = [["ter", "Tér"], ["elem", "Elem"], ["muszaki", "Műszaki"]];
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, steps.map(([k, lbl], i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: k
  }, i > 0 && /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 10,
    className: "text-stone-300"
  }), /*#__PURE__*/React.createElement("span", {
    className: `px-1.5 h-5 inline-flex items-center rounded text-[10px] font-semibold ${k === level ? "bg-rose-100 text-rose-700" : k === "muszaki" ? "bg-stone-100 text-stone-400" : "bg-stone-100 text-stone-500"}`
  }, lbl))));
}
function FpCard({
  title,
  right,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-stone-200 bg-white overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-b border-stone-100 flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900"
  }, title), right), /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, children));
}
const fpField = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] focus:outline-none focus:border-rose-300";
function FpInspector({
  concept,
  fp,
  sel,
  setSel,
  mode,
  palette,
  palettePick,
  setPalettePick,
  compos
}) {
  // bútor-paletta mód
  if (mode === "furn") return /*#__PURE__*/React.createElement(FpPalette, {
    palette: palette,
    pick: palettePick,
    setPick: setPalettePick
  });
  if (sel && sel.type === "room") return /*#__PURE__*/React.createElement(FpRoomPanel, {
    concept: concept,
    fp: fp,
    rid: sel.id,
    setSel: setSel,
    compos: compos
  });
  if (sel && sel.type === "zone") return /*#__PURE__*/React.createElement(FpZonePanel, {
    concept: concept,
    fp: fp,
    zid: sel.id,
    setSel: setSel
  });
  if (sel && sel.type === "furn") return /*#__PURE__*/React.createElement(FpFurnPanel, {
    concept: concept,
    fp: fp,
    fid: sel.id,
    setSel: setSel
  });
  if (sel && sel.type === "citem") return /*#__PURE__*/React.createElement(FpItemPanel, {
    sel: sel,
    compos: compos
  });

  // üres állapot — az elv magyarázata + a DMS-ből hivatkozott dokumentumok
  const linked = fp.rooms.reduce((n, r) => n + Object.values(r.walls || {}).filter(Boolean).length, 0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FpCard, {
    title: "R\xE9szletess\xE9g szintenk\xE9nt",
    right: /*#__PURE__*/React.createElement(FpLodLadder, {
      level: "ter"
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5 text-[11.5px] text-stone-600 leading-snug"
  }, /*#__PURE__*/React.createElement("p", null, "A t\xE9r-szinten ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-800"
  }, "kont\xFAr + n\xE9v + m\xE9ret"), " \xE9l \u2014 a modell csak ennyit t\xF6lt be. Az \xE1rhoz/id\u0151h\xF6z elem-szint, a furathoz m\u0171szaki szint kell."), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-stone-50 border border-stone-100 p-2.5 space-y-1"
  }, [["Helyiség", fp.rooms.length], ["Zóna", (fp.zones || []).length], ["Bútor-kontúr", (fp.furn || []).length], ["Linkelt falnézet", linked]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500"
  }, k), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-900 tabular-nums"
  }, v)))), /*#__PURE__*/React.createElement("p", {
    className: "text-[10.5px] text-stone-400"
  }, "Jel\xF6lj ki egy alakzatot a v\xE1sznon, vagy v\xE1lassz m\xF3dot az eszk\xF6zt\xE1rb\xF3l. A kivet\xEDtett (r\xF3zsasz\xEDn) b\xFAtorsor-elemre kattintva az elem-szint ny\xEDlik."))), /*#__PURE__*/React.createElement(FpDocsCard, {
    concept: concept
  }));
}

// ── a koncepció dokumentumai — ugyanaz a DMS, hivatkozással ─────────────────
function FpDocsCard({
  concept
}) {
  const docs = concept.projectRef && window.sim.docsFor ? window.sim.docsFor("project", concept.projectRef) : [];
  if (!concept.projectRef) return null;
  return /*#__PURE__*/React.createElement(FpCard, {
    title: "Dokumentumok (Dokumentumt\xE1r)",
    right: /*#__PURE__*/React.createElement("button", {
      onClick: () => window.navigateTo && window.navigateTo("docs", "all"),
      className: "text-[10.5px] text-violet-600 hover:underline"
    }, "Megnyit\xE1s \u2192")
  }, docs.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400"
  }, "Nincs a projekthez (", concept.projectRef, ") linkelt dokumentum.") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, docs.slice(0, 5).map(d => {
    const st = (window.DOC_STATUS || {})[d.status] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: d.id,
      className: "flex items-center gap-2 text-[11.5px]"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "folder",
      size: 12,
      className: "text-violet-400 shrink-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-stone-800 font-medium truncate flex-1"
    }, d.name), /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400 font-mono text-[9.5px] shrink-0"
    }, "v", d.version), /*#__PURE__*/React.createElement("span", {
      className: `px-1.5 h-4 inline-flex items-center rounded text-[9px] font-medium shrink-0 ${st.pill || "bg-stone-100 text-stone-500"}`
    }, st.label || d.status));
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-2 leading-snug"
  }, "A metaadat + verzi\xF3 a Dokumentumt\xE1rban \xE9l \u2014 a t\xE9r csak hivatkozik. Az egyedi elem-k\xE9r\xE9s rajz-helye is ott sz\xFCletik."));
}

// ── bútor-paletta: a műszaki skeletonok + szabad kontúrok + egyedi kérés ──
function FpPalette({
  palette,
  pick,
  setPick
}) {
  const [reqOpen, setReqOpen] = useStateFp2(false);
  const [req, setReq] = useStateFp2({
    name: "",
    width: 800,
    height: 720,
    depth: 560,
    note: ""
  });
  const sendReq = () => {
    if (!req.name.trim()) return;
    const id = window.sim.requestCustomTemplate(req);
    if (id) setPick({
      kind: "tpl",
      tplId: id,
      label: req.name.trim(),
      w: Number(req.width) || 800,
      d: Number(req.depth) || 560,
      pending: true
    });
    setReqOpen(false);
    setReq({
      name: "",
      width: 800,
      height: 720,
      depth: 560,
      note: ""
    });
  };
  return /*#__PURE__*/React.createElement(FpCard, {
    title: "B\xFAtor-kont\xFAr paletta",
    right: /*#__PURE__*/React.createElement(FpLodLadder, {
      level: "ter"
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mb-2"
  }, "Parametrikus skeletonok (M\u0171szaki tervez\xE9s registry) \u2014 a kont\xFAr a v\xE1z befoglal\xF3ja:"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 max-h-[260px] overflow-y-auto pr-1"
  }, palette.tpls.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.tplId,
    onClick: () => setPick(t),
    className: `w-full text-left rounded-lg border px-2.5 py-1.5 flex items-center gap-2 ${pick && pick.tplId === t.tplId ? "border-rose-300 bg-rose-50" : "border-stone-200 hover:border-stone-300"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-amber-500 shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-medium text-stone-800 flex-1 truncate"
  }, t.label), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-mono text-stone-400 shrink-0"
  }, t.w, "\xD7", t.d)))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-3 mb-2"
  }, "Szabad kont\xFAr (nem gy\xE1rtott):"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1.5"
  }, palette.free.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.label,
    onClick: () => setPick(t),
    className: `text-left rounded-lg border px-2.5 py-1.5 ${pick && !pick.tplId && pick.label === t.label ? "border-rose-300 bg-rose-50" : "border-stone-200 hover:border-stone-300"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-medium text-stone-800 truncate"
  }, t.label), /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] font-mono text-stone-400"
  }, t.w, "\xD7", t.d)))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-stone-100"
  }, !reqOpen ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setReqOpen(true),
    className: "w-full h-9 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[12px] font-medium hover:bg-amber-100"
  }, "Nem tal\xE1lsz sablont? Egyedi elem k\xE9r\xE9se \u2192") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-semibold text-stone-800"
  }, "Egyedi elem k\xE9r\xE9se a m\u0171szaki tervez\xE9st\u0151l"), /*#__PURE__*/React.createElement("input", {
    placeholder: "Elem neve (pl. Lejt\u0151s padl\xE1sszekr\xE9ny)",
    value: req.name,
    onChange: e => setReq({
      ...req,
      name: e.target.value
    }),
    className: fpField
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-1.5"
  }, [["width", "Szél."], ["height", "Mag."], ["depth", "Mély."]].map(([k, lbl]) => /*#__PURE__*/React.createElement("div", {
    key: k
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[9px] uppercase tracking-wide text-stone-400 block mb-0.5"
  }, lbl, " mm"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: req[k],
    onChange: e => setReq({
      ...req,
      [k]: e.target.value
    }),
    className: "w-full h-8 px-2 rounded-lg border border-stone-200 text-[12px]"
  })))), /*#__PURE__*/React.createElement("textarea", {
    placeholder: "Megjegyz\xE9s a m\u0171szaki tervez\u0151nek (kialak\xEDt\xE1s, anyag-ig\xE9ny\u2026)",
    value: req.note,
    onChange: e => setReq({
      ...req,
      note: e.target.value
    }),
    rows: 2,
    className: "w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-[12px] resize-none"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: sendReq,
    disabled: !req.name.trim(),
    className: "flex-1 h-9 rounded-lg bg-amber-500 text-white text-[12px] font-semibold disabled:opacity-40 hover:bg-amber-600"
  }, "K\xE9r\xE9s elk\xFCld\xE9se"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setReqOpen(false),
    className: "h-9 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-500"
  }, "M\xE9gse")), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 leading-snug"
  }, "A k\xE9r\xE9s sablon-v\xE1zlatk\xE9nt landol a M\u0171szaki tervez\xE9s m\u0171hely\xE9ben \u2014 a kont\xFAr addig is elhelyezhet\u0151 a t\xE9ren. A vastags\xE1got/sz\xEDnt a param\xE9terek vez\xE9rlik majd a kiadott v\xE1zban."))));
}
function FpRoomPanel({
  concept,
  fp,
  rid,
  setSel,
  compos
}) {
  const r = fp.rooms.find(x => x.id === rid);
  if (!r) return null;
  const sideLen = side => side === "N" || side === "S" ? r.w : r.h;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FpCard, {
    title: "Helyis\xE9g",
    right: /*#__PURE__*/React.createElement(FpLodLadder, {
      level: "ter"
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, /*#__PURE__*/React.createElement("input", {
    defaultValue: r.name,
    key: r.id,
    onBlur: e => window.sim.updateFpRoom(concept.id, rid, {
      name: e.target.value || r.name
    }),
    className: fpField
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2 text-[11px]"
  }, [["Szélesség", r.w], ["Mélység", r.h], ["Terület", (r.w * r.h / 1e6).toFixed(1) + " m²"]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] uppercase tracking-wide text-stone-400"
  }, k), /*#__PURE__*/React.createElement("div", {
    className: "font-mono font-medium text-stone-800"
  }, v)))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.sim.removeFpRoom(concept.id, rid);
      setSel(null);
    },
    className: "text-[11px] text-rose-600 hover:underline"
  }, "Helyis\xE9g t\xF6rl\xE9se"))), /*#__PURE__*/React.createElement(FpCard, {
    title: "Faln\xE9zetek (\xC9 \xB7 K \xB7 D \xB7 NY)"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, Object.entries(window.FP_SIDES).map(([side, lbl]) => {
    const compoId = (r.walls || {})[side];
    const comp = compos.find(c => c.id === compoId);
    return /*#__PURE__*/React.createElement("div", {
      key: side,
      className: "rounded-lg border border-stone-200 p-2.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-6 h-6 rounded-md bg-stone-100 grid place-items-center text-[10px] font-bold text-stone-600 shrink-0"
    }, lbl), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] font-mono text-stone-400 shrink-0"
    }, (sideLen(side) / 1000).toFixed(1), " m"), comp ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "text-[11.5px] font-medium text-stone-800 truncate flex-1"
    }, comp.name), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        window._compoOpen = comp.id;
        window.navigateTo && window.navigateTo("interior", "composition");
      },
      className: "text-[10.5px] text-rose-600 hover:underline shrink-0"
    }, "Megnyit"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.linkFpWall(concept.id, rid, side, null),
      className: "text-[10.5px] text-stone-400 hover:underline shrink-0"
    }, "Lev\xE1l.")) : /*#__PURE__*/React.createElement(FpWallLinker, {
      concept: concept,
      rid: rid,
      side: side,
      sideLen: sideLen(side),
      room: r,
      compos: compos
    })));
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-2 leading-snug"
  }, "A linkelt b\xFAtorsor elemei automatikusan kivet\xFClnek a falra. A faln\xE9zet-szerkeszt\u0151 ugyanazt a parametrikus motort haszn\xE1lja, mint a m\u0171szaki tervez\xE9s.")));
}
function FpWallLinker({
  concept,
  rid,
  side,
  sideLen,
  room,
  compos
}) {
  const [open, setOpen] = useStateFp2(false);
  if (!open) return /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(true),
    className: "text-[10.5px] text-rose-600 hover:underline ml-auto shrink-0"
  }, "+ Faln\xE9zet");
  return /*#__PURE__*/React.createElement("select", {
    autoFocus: true,
    className: "flex-1 h-8 px-1.5 rounded-md border border-stone-200 text-[11px] min-w-0",
    onChange: e => {
      const v = e.target.value;
      if (v === "__new") {
        const id = window.sim.addComposition({
          name: `${room.name} — ${window.FP_SIDES[side]} fal`,
          room: room.name,
          wallWidth: sideLen
        });
        window.sim.linkFpWall(concept.id, rid, side, id);
      } else if (v) window.sim.linkFpWall(concept.id, rid, side, v);
      setOpen(false);
    },
    defaultValue: ""
  }, /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, "V\xE1lassz b\xFAtorsort\u2026"), /*#__PURE__*/React.createElement("option", {
    value: "__new"
  }, "\u2795 \xDAj faln\xE9zet (", (sideLen / 1000).toFixed(1), " m)"), compos.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name, " (", c.id, ")")));
}

// ── zóna-panel ─────────────────────────────────────────────────────────────
function FpZonePanel({
  concept,
  fp,
  zid,
  setSel
}) {
  const z = (fp.zones || []).find(x => x.id === zid);
  if (!z) return null;
  return /*#__PURE__*/React.createElement(FpCard, {
    title: "Z\xF3na",
    right: /*#__PURE__*/React.createElement(FpLodLadder, {
      level: "ter"
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, /*#__PURE__*/React.createElement("input", {
    defaultValue: z.name,
    key: z.id,
    onBlur: e => window.sim.updateFpZone(concept.id, zid, {
      name: e.target.value || z.name
    }),
    className: fpField
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, Object.entries(window.FP_ZONE_TONES).map(([k, t]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    title: t.label,
    onClick: () => window.sim.updateFpZone(concept.id, zid, {
      tone: k
    }),
    className: `w-7 h-7 rounded-lg border-2 ${z.tone === k ? "border-stone-800" : "border-transparent"}`,
    style: {
      background: t.fill,
      outline: `2px dashed ${t.stroke}`,
      outlineOffset: -4
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-mono text-stone-500"
  }, (z.w / 1000).toFixed(1), " \xD7 ", (z.h / 1000).toFixed(1), " m \xB7 ", (z.w * z.h / 1e6).toFixed(1), " m\xB2"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.sim.removeFpZone(concept.id, zid);
      setSel(null);
    },
    className: "text-[11px] text-rose-600 hover:underline"
  }, "Z\xF3na t\xF6rl\xE9se")));
}

// ── szabad kontúr panel (tér-szint: ennyi elég) ────────────────────────────
function FpFurnPanel({
  concept,
  fp,
  fid,
  setSel
}) {
  const f = (fp.furn || []).find(x => x.id === fid);
  if (!f) return null;
  return /*#__PURE__*/React.createElement(FpCard, {
    title: "B\xFAtor-kont\xFAr",
    right: /*#__PURE__*/React.createElement(FpLodLadder, {
      level: "ter"
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, /*#__PURE__*/React.createElement("input", {
    defaultValue: f.label,
    key: f.id,
    onBlur: e => window.sim.updateFpFurn(concept.id, fid, {
      label: e.target.value || f.label
    }),
    className: fpField
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, [["w", "Szélesség (mm)"], ["d", "Mélység (mm)"]].map(([k, lbl]) => /*#__PURE__*/React.createElement("div", {
    key: k
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[9.5px] uppercase tracking-wide text-stone-400 block mb-0.5"
  }, lbl), /*#__PURE__*/React.createElement("input", {
    type: "number",
    defaultValue: f[k],
    key: f.id + k,
    onBlur: e => window.sim.updateFpFurn(concept.id, fid, {
      [k]: Math.max(200, Number(e.target.value) || f[k])
    }),
    className: fpField
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.updateFpFurn(concept.id, fid, {
      rot: f.rot ? 0 : 90
    }),
    className: "h-8 px-2.5 rounded-lg border border-stone-200 text-[11.5px] text-stone-600 hover:border-stone-300"
  }, "\u27F3 Forgat\xE1s 90\xB0"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.sim.removeFpFurn(concept.id, fid);
      setSel(null);
    },
    className: "text-[11px] text-rose-600 hover:underline"
  }, "T\xF6rl\xE9s")), f.tplId ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-amber-50 border border-amber-100 p-2.5 text-[10.5px] text-amber-800 leading-snug"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Skeleton-hivatkoz\xE1s:"), " ", f.tplId, " \u2014 ez a kont\xFAr a m\u0171szaki v\xE1z befoglal\xF3ja. Faln\xE9zetbe helyezve elem-szintt\xE9 v\xE1lik (\xE1r + id\u0151), a furat/k\xF6t\xE9s a m\u0171szaki tervez\xE9s\xE9 marad.") : /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 leading-snug"
  }, "Szabad kont\xFAr \u2014 nem gy\xE1rtott t\xE1rgy, csak t\xE9rfoglal\xE1s. T\xE9r-szinten ennyi adat el\xE9g.")));
}

// ── ELEM-SZINT: kivetített bútorsor-elem — ár + szállítási idő, SEMMI több ──
function FpItemPanel({
  sel,
  compos
}) {
  const comp = compos.find(c => c.id === sel.compoId);
  const it = comp && (comp.items || []).find(x => x.uid === sel.uid);
  if (!it) return null;
  const w = it.vars && it.vars.width || 600,
    h2 = it.vars && it.vars.height || 720,
    d = it.vars && it.vars.depth || 560;
  return /*#__PURE__*/React.createElement(FpCard, {
    title: "Elem (b\xFAtorsorb\xF3l)",
    right: /*#__PURE__*/React.createElement(FpLodLadder, {
      level: "elem"
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 leading-tight"
  }, it.tplName), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 font-mono mt-0.5"
  }, w, " \xD7 ", h2, " \xD7 ", d, " mm \xB7 ", it.qty, " db \xB7 ", comp.name)), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-stone-50 border border-stone-100 p-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] uppercase tracking-wide text-stone-400"
  }, "\xC1r"), /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 tabular-nums"
  }, Math.round((it.unitPrice || 0) * (it.qty || 1)).toLocaleString("hu-HU"), " Ft")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-stone-50 border border-stone-100 p-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] uppercase tracking-wide text-stone-400"
  }, "Sz\xE1ll\xEDt\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 tabular-nums"
  }, it.deliveryDays ? `~${it.deliveryDays} nap` : "—"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] uppercase tracking-wide text-stone-400 mb-0.5"
  }, "Kivitel (f\u0151 anyagok)"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-700"
  }, it.styleName || "—")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window._compoOpen = comp.id;
      window.navigateTo && window.navigateTo("interior", "composition");
    },
    className: "w-full h-9 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[12px] font-medium hover:bg-rose-100"
  }, "Bels\u0151 kioszt\xE1s a B\xFAtorsorban"), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-stone-50 border border-stone-100 p-2.5 text-[10.5px] text-stone-400 leading-snug"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-500"
  }, "M\u0171szaki szint nincs bet\xF6ltve."), " Furatk\xE9p, k\xF6t\u0151elem, szab\xE1sjegyz\xE9k a Tervez\xE9s \u2192 Gy\xE1rt\xE1s-adatlapon \xE9l \u2014 a bels\u0151\xE9p\xEDt\xE9sznek itt nem kell.")));
}

// ── SZERELŐ NÉZET: kód-beolvasás → melyik szekrénybe megy az elem ───────────
//   A beolvasott kód az elem uid-ja (a munkaszám/QR-etikett kódja). A tér
//   zölden kiemeli a cél-szekrényt, a panel megadja: helyiség · fal · pozíció.
function FpScanPanel({
  projected,
  fp,
  scanHit,
  setScanHit,
  compos
}) {
  const [code, setCode] = useStateFp2("");
  const [miss, setMiss] = useStateFp2(false);
  const scan = raw => {
    const c = (raw || "").trim().toLowerCase();
    if (!c) return;
    const hit = projected.find(p => p.it.uid.toLowerCase() === c || `${p.compoId}/${p.it.uid}`.toLowerCase() === c);
    setScanHit(hit ? hit.key : null);
    setMiss(!hit);
  };
  const hit = projected.find(p => p.key === scanHit);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FpCard, {
    title: "Szerel\u0151 \u2014 elem-beolvas\xE1s",
    right: /*#__PURE__*/React.createElement(FpLodLadder, {
      level: "elem"
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    value: code,
    onChange: e => {
      setCode(e.target.value);
      setMiss(false);
    },
    onKeyDown: e => e.key === "Enter" && scan(code),
    placeholder: "Elem-k\xF3d (QR) beolvas\xE1sa\u2026",
    autoFocus: true,
    className: fpField + " font-mono"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => scan(code),
    className: "h-9 px-3 rounded-lg bg-stone-900 text-white text-[12px] font-semibold shrink-0"
  }, "Keres")), miss && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-rose-600"
  }, "Nincs ilyen k\xF3d\xFA elem ezen a t\xE9ren."), hit ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-emerald-900 leading-tight"
  }, hit.it.tplName), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-emerald-800"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, hit.roomName), " \xB7 ", window.FP_SIDES[hit.side], " fal \xB7 ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, hit.wallIdx, ". elem"), " balr\xF3l (", hit.wallCount, "-b\u0151l)"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-emerald-700 font-mono"
  }, hit.compoId, " / ", hit.it.uid, " \xB7 ", hit.it.vars && hit.it.vars.width || 600, " mm sz\xE9les"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-emerald-700"
  }, "A t\xE9ren z\xF6lden villog a c\xE9l-poz\xEDci\xF3.")) : !miss && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-400 leading-snug"
  }, "\xCDrd be vagy olvasd be az alkatr\xE9sz / elem etikettj\xE9nek k\xF3dj\xE1t \u2014 a t\xE9r megmutatja, melyik szekr\xE9nybe (helyis\xE9g \xB7 fal \xB7 poz\xEDci\xF3) tartozik."), projected.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "pt-2 border-t border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] uppercase tracking-wide text-stone-400 mb-1"
  }, "Beolvashat\xF3 k\xF3dok (dem\xF3)"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, projected.slice(0, 6).map(p => /*#__PURE__*/React.createElement("button", {
    key: p.key,
    onClick: () => {
      setCode(p.it.uid);
      scan(p.it.uid);
    },
    className: "px-1.5 h-5 rounded bg-stone-100 text-stone-600 font-mono text-[9.5px] hover:bg-stone-200"
  }, p.it.uid)))))), /*#__PURE__*/React.createElement(FpCard, {
    title: "4D \u2014 a t\xE9r az id\u0151ben"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 leading-snug space-y-1.5"
  }, /*#__PURE__*/React.createElement("p", null, "A ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, "4D k\xE9sz\xFClts\xE9g"), " r\xE9tegen a sz\xEDn az elem helye az id\u0151ben: terv \u2192 aj\xE1nlat \u2192 rendel\xE9s \u2192 gy\xE1rt\xE1s \u2192 k\xE9sz. A st\xE1tusz ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, "sz\xE1m\xEDtott"), " \u2014 az aj\xE1nlat/rendel\xE9s/gy\xE1rt\xE1si feladat l\xE1ncb\xF3l sz\xE1rmazik, a t\xE9r nem t\xE1rol \xE1llapotot."), /*#__PURE__*/React.createElement("p", null, "Ugyanez a n\xE9zet a helysz\xEDni be\xE9p\xEDt\xE9sn\xE9l: a szerel\u0151 a beolvasott k\xF3ddal tal\xE1lja meg a c\xE9l-poz\xEDci\xF3t."))));
}
Object.assign(window, {
  FpInspector,
  FpLodLadder,
  FpScanPanel
});
})();
