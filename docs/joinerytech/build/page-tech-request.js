/* AUTO-GENERATED from page-tech-request.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-tech-request.jsx — MŰSZAKI AJÁNLAT-KÉRÉS MUNKALAP (Tervezés világ)
//
//   Az értékesítési ajánlat műszaki pontosításának strukturált űrlapja —
//   a gyártás-adatlap info-gyűjtő mintájára, készültség-kapuval:
//     1. TERV-ALAP — belső koncepció VAGY külső design-csomag (helyiségenként
//        kötelező: leírás + alaprajz + anyaghasználat + ≥1 bútor).
//     2. BÚTOR → SABLON megfeleltetés — mely KIADOTT parametrikus sablonból
//        építhető bútorsor; ami nem fedhető le: EGYEDI elem.
//     3. EGYEDI elem — 2D/3D rajz + modell feltöltés (jelkép) + minden áron
//        kívüli paraméter, ami a tervező modulban nem határozható meg + ÁR.
//   A „Teljesítve" a store-ban is kapuzott (techReqCompleteness) — amíg
//   hiányos, az ajánlat nem árazható, a gomb LEZÁRT.
//
//   <TechReqSheet reqId onClose />   — window-export, a Tervezés → Műszaki
//   tervezés „Beérkezett műszaki kérések" paneljéből nyílik.
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateTR
} = React;
const TR_IN = "h-8 px-2 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-800 outline-none focus:border-amber-400 w-full";
const trUid = () => "tr-" + Math.random().toString(36).slice(2, 7);

// fájl-feltöltés jelkép (prototípus: címke, mint a DMS fileLabel)
function TrFileStub({
  value,
  onChange,
  placeholder
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "paperclip",
    size: 12,
    className: value ? "text-emerald-600" : "text-stone-300"
  }), /*#__PURE__*/React.createElement("input", {
    value: value || "",
    onChange: e => onChange(e.target.value),
    placeholder: placeholder,
    className: TR_IN
  }));
}
function TrCheckRow({
  ok,
  label
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-4 h-4 rounded-full grid place-items-center shrink-0 ${ok ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ok ? "check" : "minus",
    size: 9
  })), /*#__PURE__*/React.createElement("span", {
    className: ok ? "text-stone-700" : "text-stone-400"
  }, label));
}

// Kinyitható fül — az opcionális árazási infeókat elrejti, hogy ne legyen sok
// adat egyszerre a képernyőn (mobil-első). A fül tappolható; a kitöltöttek
// száma a fülön látszik.
function TrDisclosure({
  label,
  count = 0,
  children
}) {
  const [open, setOpen] = useStateTR(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-stone-200 bg-white overflow-hidden"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    className: "w-full flex items-center gap-2 px-2.5 h-9 text-[11.5px] font-medium text-stone-600 active:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: open ? "down" : "chevron",
    size: 12,
    className: "text-stone-400 shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "flex-1 text-left"
  }, label), count > 0 && /*#__PURE__*/React.createElement("span", {
    className: "px-1.5 h-5 grid place-items-center rounded-full bg-stone-100 text-stone-500 text-[10px] font-semibold shrink-0"
  }, count, " kit\xF6ltve")), open && /*#__PURE__*/React.createElement("div", {
    className: "px-2.5 pb-2.5 space-y-1.5"
  }, children));
}
function TechReqSheet({
  reqId,
  onClose
}) {
  const sim = useSim();
  const req = (sim.quoteRequests || []).find(x => x.id === reqId);
  if (!req) return null;
  const plan = req.plan || {};
  const comp = window.sim.techReqCompleteness(req);
  const basis = plan.basis || comp.basis;
  const rooms = plan.rooms || [];
  const items = plan.items || [];
  const editable = ["kert", "folyamatban"].includes(req.status);
  const upd = patch => window.sim.updateQuoteRequestPlan(req.id, patch);

  // kiadott sablonok a megfeleltetéshez (műhely "kiadott" + gyári registry)
  const studio = (sim.designTemplates || []).filter(t => t.status === "kiadott");
  const factory = (window.PARAM_TEMPLATES || []).filter(t => !studio.some(s => s.id === t.id));
  const tplOptions = [...studio, ...factory];
  const setRoom = (rid, patch) => upd({
    rooms: rooms.map(r => r.id === rid ? {
      ...r,
      ...patch
    } : r)
  });
  const setItem = (iid, patch) => upd({
    items: items.map(i => i.id === iid ? {
      ...i,
      ...patch
    } : i)
  });
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: true,
    onClose: onClose,
    width: 680,
    title: `Műszaki munkalap — ${req.id}`,
    subtitle: `${req.customer} · ajánlat: ${req.quoteId}`,
    footer: /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 w-full"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 flex-1"
    }, comp.ready ? "Minden megvan — teljesíthető." : `${comp.missing.length} hiány a teljesítéshez`), req.status === "kert" && /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.setQuoteRequestStatus(req.id, "folyamatban"),
      className: "h-9 px-3.5 rounded-lg text-[12.5px] font-semibold bg-amber-600 text-white hover:bg-amber-700"
    }, "Folyamatba veszem"), req.status === "folyamatban" && /*#__PURE__*/React.createElement("button", {
      onClick: comp.ready ? () => {
        window.sim.setQuoteRequestStatus(req.id, "kesz");
        onClose();
      } : undefined,
      disabled: !comp.ready,
      title: comp.ready ? "" : "Hiányzik: " + comp.missing.map(m => m.label).join(" · "),
      className: `h-9 px-3.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 ${comp.ready ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-stone-100 text-stone-400 cursor-not-allowed"}`
    }, !comp.ready && /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 12
    }), " Teljes\xEDtve \u2014 \xE1razhat\xF3"), /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: onClose
    }, "Bez\xE1r\xE1s"))
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-5"
  }, window.BriefCard && window.sim.quoteLevelBrief && window.sim.quoteLevelBrief(req.quoteId) && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-2"
  }, "Tervez\xE9si brief \u2014 amit az \xE9rt\xE9kes\xEDt\xE9s \xE1tadott"), /*#__PURE__*/React.createElement(window.BriefCard, {
    briefId: window.sim.quoteLevelBrief(req.quoteId).id,
    title: "Ig\xE9ny-brief (\xE1tgondoland\xF3)"
  })), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50/60 p-3 space-y-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-1"
  }, "K\xE9sz\xFClts\xE9g \u2014 az \xE1razhat\xF3 aj\xE1nlat minimuma"), comp.checks.map(c => /*#__PURE__*/React.createElement(TrCheckRow, {
    key: c.key,
    ok: c.ok,
    label: c.label
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-2"
  }, "1 \xB7 Terv-alap"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-2"
  }, [["internal", "Belső koncepció (Belsőépítészet)"], ["external", "Külső design-csomag"]].map(([k, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: editable ? () => upd({
      basis: k
    }) : undefined,
    className: `h-8 px-3 rounded-lg text-[11.5px] font-medium border ${basis === k ? "bg-amber-600 text-white border-amber-600" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`
  }, lbl))), basis === "internal" ? window.sim.quoteHasConcept(req.quoteId) ? /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
  }, "Az aj\xE1nlathoz bels\u0151\xE9p\xEDt\xE9szeti koncepci\xF3 kapcsol\xF3dik \u2014 a terv-alap megvan.") : /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
  }, "Nincs bels\u0151 koncepci\xF3 az aj\xE1nlaton \u2014 k\xE9rj koncepci\xF3t a Bels\u0151\xE9p\xEDt\xE9szett\u0151l, vagy v\xE1lts k\xFCls\u0151 design-csomagra.") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, "K\xFCls\u0151 tervez\u0151t\u0151l \xE9rkez\u0151 csomag \u2014 helyis\xE9genk\xE9nt k\xF6telez\u0151 a le\xEDr\xE1s, az alaprajz, az anyaghaszn\xE1lat \xE9s legal\xE1bb egy b\xFAtor."), rooms.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.id,
    className: "rounded-lg border border-stone-200 bg-white p-2.5 space-y-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: r.name || "",
    onChange: e => setRoom(r.id, {
      name: e.target.value
    }),
    placeholder: "Helyis\xE9g neve (pl. Nappali)",
    disabled: !editable,
    className: TR_IN + " font-medium"
  }), editable && /*#__PURE__*/React.createElement("button", {
    onClick: () => upd({
      rooms: rooms.filter(x => x.id !== r.id),
      items: items.map(i => i.roomId === r.id ? {
        ...i,
        roomId: null
      } : i)
    }),
    className: "w-7 h-7 grid place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 12
  }))), /*#__PURE__*/React.createElement("textarea", {
    value: r.desc || "",
    onChange: e => setRoom(r.id, {
      desc: e.target.value
    }),
    placeholder: "Le\xEDr\xE1s \u2014 mit kell ide tervezni/gy\xE1rtani",
    disabled: !editable,
    rows: 2,
    className: "w-full px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-amber-400 resize-none"
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-1.5"
  }, /*#__PURE__*/React.createElement(TrFileStub, {
    value: r.floorPlan,
    onChange: v => editable && setRoom(r.id, {
      floorPlan: v
    }),
    placeholder: "Alaprajz (f\xE1jl)"
  }), /*#__PURE__*/React.createElement("input", {
    value: r.materials || "",
    onChange: e => setRoom(r.id, {
      materials: e.target.value
    }),
    placeholder: "Anyaghaszn\xE1lat (pl. t\xF6lgy furn\xE9r + festett MDF)",
    disabled: !editable,
    className: TR_IN
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, items.filter(i => i.roomId === r.id).length, " b\xFAtor ebben a helyis\xE9gben"))), editable && /*#__PURE__*/React.createElement("button", {
    onClick: () => upd({
      rooms: [...rooms, {
        id: trUid(),
        name: "",
        desc: "",
        floorPlan: "",
        materials: ""
      }]
    }),
    className: "w-full h-8 rounded-lg border border-dashed border-stone-300 text-[11.5px] text-stone-500 hover:text-amber-700 hover:border-amber-300 inline-flex items-center justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), " Helyis\xE9g hozz\xE1ad\xE1sa"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-1"
  }, "2 \xB7 B\xFAtorok \u2014 sablon-megfeleltet\xE9s \xE9s \xE1raz\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mb-2"
  }, "Minden b\xFAtorhoz kioszt\xE1si rajz kell, \xE9s vagy egy ", /*#__PURE__*/React.createElement("b", null, "kiadott parametrikus sablon"), " (amib\u0151l b\xFAtorsor \xE9p\xEDthet\u0151), vagy ", /*#__PURE__*/React.createElement("b", null, "egyedi elem"), " teljes adatokkal."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, items.map(i => {
    const custom = i.mode === "custom";
    return /*#__PURE__*/React.createElement("div", {
      key: i.id,
      className: "rounded-lg border border-stone-200 bg-white p-2.5 space-y-1.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("input", {
      value: i.name || "",
      onChange: e => setItem(i.id, {
        name: e.target.value
      }),
      placeholder: "B\xFAtor megnevez\xE9se",
      disabled: !editable,
      className: TR_IN + " font-medium"
    }), basis === "external" && /*#__PURE__*/React.createElement("select", {
      value: i.roomId || "",
      onChange: e => setItem(i.id, {
        roomId: e.target.value || null
      }),
      disabled: !editable,
      className: "h-8 px-2 rounded-lg border border-stone-200 bg-white text-[11.5px] text-stone-700 outline-none shrink-0 max-w-[140px]"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u2014 helyis\xE9g \u2014"), rooms.map(r => /*#__PURE__*/React.createElement("option", {
      key: r.id,
      value: r.id
    }, r.name || r.id))), editable && /*#__PURE__*/React.createElement("button", {
      onClick: () => upd({
        items: items.filter(x => x.id !== i.id)
      }),
      className: "w-7 h-7 grid place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 12
    }))), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 sm:grid-cols-2 gap-1.5"
    }, /*#__PURE__*/React.createElement(TrFileStub, {
      value: i.layout,
      onChange: v => editable && setItem(i.id, {
        layout: v
      }),
      placeholder: "Kioszt\xE1si rajz (f\xE1jl)"
    }), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-500 shrink-0"
    }, "db:"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      value: i.qty || 1,
      onChange: e => setItem(i.id, {
        qty: e.target.value
      }),
      disabled: !editable,
      className: TR_IN + " w-16 text-right font-mono"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-500 shrink-0"
    }, "\xE1r/db:"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: i.price || "",
      onChange: e => setItem(i.id, {
        price: e.target.value
      }),
      placeholder: "Ft",
      disabled: !editable,
      className: TR_IN + " flex-1 min-w-[80px] text-right font-mono"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, [["template", "Parametrikus sablonból"], ["custom", "Egyedi elem"]].map(([k, lbl]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: editable ? () => setItem(i.id, {
        mode: k
      }) : undefined,
      className: `h-7 px-2.5 rounded-md text-[11px] font-medium border ${(i.mode || "template") === k ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-500 border-stone-200"}`
    }, lbl)), !custom && /*#__PURE__*/React.createElement("select", {
      value: i.tplId || "",
      onChange: e => setItem(i.id, {
        tplId: e.target.value
      }),
      disabled: !editable,
      className: "h-7 px-2 rounded-md border border-stone-200 bg-white text-[11.5px] text-stone-700 outline-none flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u2014 kiadott sablon \u2014"), tplOptions.map(t => /*#__PURE__*/React.createElement("option", {
      key: t.id,
      value: t.id
    }, t.name, " (", t.id, ")")))), custom && (() => {
      const optFilled = [i.drawing3d, i.model, i.estMaterial, i.estHours, i.estExternal, i.analog, i.risks].filter(v => String(v || "").trim()).length;
      return /*#__PURE__*/React.createElement("div", {
        className: "rounded-lg bg-amber-50/60 border border-amber-200 p-2 space-y-2"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between gap-2"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] uppercase tracking-wide text-amber-700 font-semibold"
      }, "Egyedi elem \u2014 k\xF6telez\u0151"), /*#__PURE__*/React.createElement("span", {
        className: "text-[9.5px] text-amber-600"
      }, "2D rajz + param\xE9terek + \xE1r")), /*#__PURE__*/React.createElement(TrFileStub, {
        value: i.drawing2d,
        onChange: v => editable && setItem(i.id, {
          drawing2d: v
        }),
        placeholder: "2D rajz (k\xF6telez\u0151)"
      }), /*#__PURE__*/React.createElement("textarea", {
        value: i.params || "",
        onChange: e => setItem(i.id, {
          params: e.target.value
        }),
        placeholder: "\xC1raz\xE1si param\xE9terek (k\xF6telez\u0151) \u2014 anyag, vasalat, fel\xFClet, m\xE9retek, k\xFCl\xF6nleges megmunk\xE1l\xE1s\u2026",
        disabled: !editable,
        rows: 2,
        className: "w-full px-2 py-1.5 rounded-lg border border-amber-200 bg-white text-[12px] outline-none focus:border-amber-400 resize-none"
      }), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-1.5 flex-wrap"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] text-stone-500 shrink-0"
      }, "\xC1r-\xE9retts\xE9g:"), window.PRICE_CLASS_ORDER.map(k => {
        const m = window.PRICE_CLASS_META[k];
        const on = (i.priceClass || "iranyar") === k;
        return /*#__PURE__*/React.createElement("button", {
          key: k,
          onClick: editable ? () => setItem(i.id, {
            priceClass: k
          }) : undefined,
          title: m.hint,
          className: `h-7 px-2 rounded-md text-[10.5px] font-medium border ${on ? `bg-${m.tone}-600 text-white border-${m.tone}-600` : "bg-white text-stone-500 border-stone-200"}`
        }, m.label, m.band ? ` ±${m.band}%` : "");
      })), /*#__PURE__*/React.createElement(TrDisclosure, {
        label: "T\xF6bb inf\xF3 az \xE1raz\xE1shoz (opcion\xE1lis)",
        count: optFilled
      }, /*#__PURE__*/React.createElement("div", {
        className: "grid grid-cols-1 sm:grid-cols-2 gap-1.5"
      }, /*#__PURE__*/React.createElement(TrFileStub, {
        value: i.drawing3d,
        onChange: v => editable && setItem(i.id, {
          drawing3d: v
        }),
        placeholder: "3D rajz"
      }), /*#__PURE__*/React.createElement(TrFileStub, {
        value: i.model,
        onChange: v => editable && setItem(i.id, {
          model: v
        }),
        placeholder: "Modell-f\xE1jl"
      }), /*#__PURE__*/React.createElement("input", {
        type: "number",
        value: i.estMaterial || "",
        onChange: e => setItem(i.id, {
          estMaterial: e.target.value
        }),
        placeholder: "Becs\xFClt anyagk\xF6lts\xE9g (Ft)",
        disabled: !editable,
        className: TR_IN + " text-right font-mono"
      }), /*#__PURE__*/React.createElement("input", {
        type: "number",
        value: i.estHours || "",
        onChange: e => setItem(i.id, {
          estHours: e.target.value
        }),
        placeholder: "Becs\xFClt munka\xF3ra (h)",
        disabled: !editable,
        className: TR_IN + " text-right font-mono"
      }), /*#__PURE__*/React.createElement("input", {
        type: "number",
        value: i.estExternal || "",
        onChange: e => setItem(i.id, {
          estExternal: e.target.value
        }),
        placeholder: "K\xFCls\u0151 munka (Ft)",
        disabled: !editable,
        className: TR_IN + " text-right font-mono"
      }), /*#__PURE__*/React.createElement("input", {
        value: i.analog || "",
        onChange: e => setItem(i.id, {
          analog: e.target.value
        }),
        placeholder: "Hasonl\xF3 kor\xE1bbi munka",
        disabled: !editable,
        className: TR_IN
      })), /*#__PURE__*/React.createElement("input", {
        value: i.risks || "",
        onChange: e => setItem(i.id, {
          risks: e.target.value
        }),
        placeholder: "Kock\xE1zatok / bizonytalans\xE1gok",
        disabled: !editable,
        className: TR_IN
      }), (() => {
        const P = window.WW_PRICE_PARAMS || {};
        const mat = Number(i.estMaterial) || 0,
          h = Number(i.estHours) || 0,
          ext = Number(i.estExternal) || 0;
        if (!(mat || h)) return /*#__PURE__*/React.createElement("div", {
          className: "text-[10px] text-stone-400"
        }, "Anyagk\xF6lts\xE9g / munka\xF3ra megad\xE1s\xE1val javasolt \xE1rat sz\xE1molok \u2014 de a becsl\xE9s k\xE9zzel is be\xEDrhat\xF3.");
        const sugg = Math.round((mat + h * (P.shiftRate || 4500) + ext) * (1 + (P.overheadPct || 20) / 100) * (1 + (P.profitPct || 15) / 100));
        return /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-2 text-[11px] text-stone-600 flex-wrap"
        }, /*#__PURE__*/React.createElement("span", null, "Kalkul\xE1ci\xF3-seg\xE9d: ", /*#__PURE__*/React.createElement("b", {
          className: "font-mono"
        }, sugg.toLocaleString("hu-HU"), " Ft/db")), editable && /*#__PURE__*/React.createElement("button", {
          onClick: () => setItem(i.id, {
            price: sugg,
            priceClass: "kalkulalt"
          }),
          className: "h-6 px-2 rounded-md bg-sky-600 text-white text-[10.5px] font-medium hover:bg-sky-700 shrink-0"
        }, "\xC1tveszem"));
      })()));
    })());
  }), editable && /*#__PURE__*/React.createElement("button", {
    onClick: () => upd({
      items: [...items, {
        id: trUid(),
        roomId: rooms[0] ? rooms[0].id : null,
        name: "",
        qty: 1,
        layout: "",
        mode: "template",
        tplId: "",
        price: ""
      }]
    }),
    className: "w-full h-8 rounded-lg border border-dashed border-stone-300 text-[11.5px] text-stone-500 hover:text-amber-700 hover:border-amber-300 inline-flex items-center justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), " B\xFAtor hozz\xE1ad\xE1sa"))), req.note && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 border-t border-stone-100 pt-3"
  }, "K\xE9r\xE9s megjegyz\xE9se: ", req.note)));
}
Object.assign(window, {
  TechReqSheet
});
})();
