/* AUTO-GENERATED from page-warehouse-2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// Raktár — Bevételezés (PO → lot zóna+hely+projekt), Kivét-kérelmek (FSM),
// kivét-létrehozó dialógus, és a Beállítások → Raktárhelyek panel.
// Páros fájl a page-warehouse.jsx-hez (közös segéd-komponenseket onnan használ).
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateW2,
  useMemo: useMemoW2
} = React;

// Variáns-aware opció-címke a tétel-választókhoz: a variánst a fő-tétel nevével
// + variáns-címkével mutatjuk; a fő-tétel (variantAxes) NEM raktározható közvetlenül.
function isVariantParentItem(x) {
  return Array.isArray(x.variantAxes) && x.variantAxes.length > 0;
}
function whItemOptLabel(x) {
  if (x.variantOf) {
    const p = window.sim.variantParentOf ? window.sim.variantParentOf(x.id) : null;
    return (p ? p.name : x.name) + " · " + (window.sim.variantLabel && window.sim.variantLabel(x) || "") + " (" + x.code + ")";
  }
  return x.name + " (" + x.code + ")";
}

// ══════════════════════════════════════════════════════════════════════════
// BEVÉTELEZÉS — érkező megrendelések raktárba vétele
// ══════════════════════════════════════════════════════════════════════════
function ReceivingPage() {
  const sim = window.useSim();
  const incoming = (sim.pos || []).filter(p => p.status === "running");
  const recent = (sim.pos || []).filter(p => p.status === "delivered").slice(0, 6);
  const [recId, setRecId] = useStateW2(null);
  const [adhoc, setAdhoc] = useStateW2(false);
  const po = recId ? incoming.find(p => p.id === recId) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-end justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-[17px] font-semibold text-stone-900"
  }, "Bev\xE9telez\xE9s"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500"
  }, "\xC9rkez\u0151 \xE1ru rakt\xE1rba v\xE9tele sz\xE1ll\xEDt\xF3lev\xE9l / sz\xE1mla alapj\xE1n \u2014 z\xF3na, rakt\xE1rhely \xE9s projekt-foglal\xE1s kioszt\xE1sa.")), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: () => setAdhoc(true)
  }, "Bev\xE9telez\xE9s bizonylat alapj\xE1n")), /*#__PURE__*/React.createElement("div", {
    className: "mb-2 text-[11px] uppercase tracking-wide text-stone-500 font-medium"
  }, "\xC9rkez\u0151 sz\xE1ll\xEDtm\xE1nyok \xB7 ", incoming.length), incoming.length === 0 && /*#__PURE__*/React.createElement(Card, {
    className: "px-5 py-8 text-center text-[12.5px] text-stone-400"
  }, "Nincs PO-hoz k\xF6t\xF6tt, bev\xE9telez\xE9sre v\xE1r\xF3 sz\xE1ll\xEDtm\xE1ny. K\xF6zvetlen \xE9rkez\xE9st a ", /*#__PURE__*/React.createElement("b", {
    className: "text-stone-500"
  }, "\u201EBev\xE9telez\xE9s bizonylat alapj\xE1n\""), " gombbal r\xF6gz\xEDthetsz."), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-3"
  }, incoming.map(p => {
    const it = (sim.catalog || []).find(x => x.id === p.itemId);
    return /*#__PURE__*/React.createElement(Card, {
      key: p.id,
      className: "p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-2 mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-mono text-[11px] text-teal-700"
    }, p.id), /*#__PURE__*/React.createElement("div", {
      className: "text-[14px] font-medium text-stone-900 truncate"
    }, p.material), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-500"
    }, p.supplier)), p.projectNo ? /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-medium",
      title: "A megrendel\xE9s ehhez a projekthez k\xE9sz\xFClt \u2014 a bev\xE9telez\xE9skor meger\u0151s\xEDtend\u0151"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "info",
      size: 11
    }), p.projectNo) : /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-medium"
    }, "Szabad k\xE9szlet")), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12px] text-stone-500"
    }, "V\xE1rhat\xF3: ", /*#__PURE__*/React.createElement("b", {
      className: "text-stone-700"
    }, p.qty, " ", it ? it.unit : "db"), " \xB7 ETA ", p.eta), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "download",
      onClick: () => setRecId(p.id)
    }, "Bev\xE9telez")));
  })), recent.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-2 text-[11px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Legut\xF3bbi bev\xE9telez\xE9sek"), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, recent.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "flex items-center justify-between gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0 text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[11px] text-stone-400"
  }, p.id), /*#__PURE__*/React.createElement("span", {
    className: "flex-1 text-stone-700 truncate"
  }, p.material), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, p.qty), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 11
  }), "Bev\xE9telezve"))))), /*#__PURE__*/React.createElement(SlideOver, {
    open: !!po,
    onClose: () => setRecId(null),
    width: 520,
    title: po ? `Bevételezés — ${po.id}` : "",
    subtitle: po ? po.supplier : ""
  }, po && /*#__PURE__*/React.createElement(ReceiveForm, {
    po: po,
    onDone: () => setRecId(null)
  })), /*#__PURE__*/React.createElement(SlideOver, {
    open: adhoc,
    onClose: () => setAdhoc(false),
    width: 520,
    title: "Bev\xE9telez\xE9s bizonylat alapj\xE1n",
    subtitle: "Sz\xE1ll\xEDt\xF3lev\xE9l / sz\xE1mla \u2014 PO n\xE9lk\xFCl"
  }, adhoc && /*#__PURE__*/React.createElement(AdhocReceiveForm, {
    onDone: () => setAdhoc(false)
  })));
}

// Bizonylat-szekció — közös a PO-s és az ad-hoc bevételezéshez.
function DocSection({
  docType,
  setDocType,
  docNo,
  setDocNo,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50/60 p-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Bizonylat"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5 mb-2.5"
  }, [["szallitolevel", "Szállítólevél", "file"], ["szamla", "Számla", "receipt"]].map(([k, lbl, ic]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setDocType(k),
    className: `flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border text-[12px] font-medium transition ${docType === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 13
  }), lbl))), /*#__PURE__*/React.createElement("input", {
    value: docNo,
    onChange: e => setDocNo(e.target.value),
    placeholder: docType === "szamla" ? "Számla száma — pl. 2426/SZ-0184" : "Szállítólevél száma — pl. SZL-2426-0312",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500 bg-white"
  }), sub && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1.5"
  }, sub));
}

// Projekt-zárolás szekció — közös.
function ProjectLockSection({
  lockProject,
  setLockProject,
  projectNo,
  setProjectNo,
  poProjectNo
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `rounded-xl border p-3.5 transition ${lockProject ? "border-violet-300 bg-violet-50/50" : "border-stone-200 bg-white"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900"
  }, "Projekthez z\xE1rolt"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mt-0.5"
  }, "Bekapcsolva a t\xE9tel egy projektre z\xE1rol\xF3dik. Kikapcsolva ", /*#__PURE__*/React.createElement("b", null, "szabad (\xE1ltal\xE1nos) k\xE9szletre"), " ker\xFCl.")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setLockProject(v => !v),
    className: `shrink-0 w-11 h-6 rounded-full relative transition ${lockProject ? "bg-violet-600" : "bg-stone-300"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${lockProject ? "left-[22px]" : "left-0.5"}`
  }))), poProjectNo && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 flex items-center gap-2 text-[11px] text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 13,
    className: "text-violet-500 shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, "A megrendel\xE9s a ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-violet-700"
  }, poProjectNo), " projekthez k\xE9sz\xFClt \u2014 de a sz\xE1ll\xEDt\xF3lev\xE9len/sz\xE1ml\xE1n ez nem mindig szerepel, ez\xE9rt er\u0151s\xEDtsd meg.")), lockProject && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-stone-500 block mb-1"
  }, "Projektsz\xE1m"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    value: projectNo,
    onChange: e => setProjectNo(e.target.value),
    placeholder: "PRJ-2426-012",
    className: "flex-1 h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-violet-500 bg-white"
  }), poProjectNo && projectNo !== poProjectNo && /*#__PURE__*/React.createElement("button", {
    onClick: () => setProjectNo(poProjectNo),
    className: "h-9 px-2.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-[11px] font-medium whitespace-nowrap"
  }, "PO szerint"))), !lockProject && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 text-[10.5px] text-stone-400 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "inventory",
    size: 12
  }), "Szabad k\xE9szletre ker\xFCl \u2014 k\xE9s\u0151bb b\xE1rmikor projektre z\xE1rolhat\xF3 a lot z\xF3na-mozgat\xF3j\xE1val."));
}

// Több-soros tétel-szerkesztő — egy bizonylaton több tétel is lehet.
// Soronként: (opc.) beszállítói cikk → saját katalógus tétel + mennyiség + raktárhely.
// A supplierName ismeretében a beszállító idegen cikkszáma/megnevezése alapján
// automatikusan feloldja a saját tételt (supplierMap), és új cikknél felajánlja
// a megfeleltetés rögzítését.
function ReceiveLinesEditor({
  lines,
  setLines,
  whItems,
  supplierName
}) {
  const setLine = (i, patch) => setLines(ls => ls.map((l, j) => j === i ? {
    ...l,
    ...patch
  } : l));
  const addLine = () => setLines(ls => [...ls, {
    itemId: "",
    qty: "",
    locId: "",
    supRef: ""
  }]);
  const rmLine = i => setLines(ls => ls.filter((_, j) => j !== i));

  // Idegen cikk feloldása → ha EGY cél, beállítja az itemId-t; ha több (1:N), a
  // bontást a "Bontás N tételre" gomb végzi (nem auto, hogy a qty érthető legyen).
  const resolveRef = (i, ref) => {
    setLine(i, {
      supRef: ref
    });
    const r = ref.trim();
    if (!r) return;
    const hit = window.sim.resolveSupplierItem(supplierName || "", {
      sku: r,
      label: r
    });
    if (hit && hit.targets && hit.targets.length === 1) setLine(i, {
      supRef: ref,
      itemId: hit.targets[0].catalogItemId
    });
  };
  // 1:N bontás: a sort lecseréli N sorra, qty = (sor qty vagy 1) × szorzó.
  const splitLine = (i, targets) => {
    setLines(ls => {
      const cur = ls[i];
      const baseQty = Number(cur.qty) > 0 ? Number(cur.qty) : 1;
      const rows = targets.map((t, k) => ({
        itemId: t.catalogItemId,
        qty: String(baseQty * t.factor),
        locId: cur.locId || "",
        supRef: k === 0 ? cur.supRef || "" : ""
      }));
      return [...ls.slice(0, i), ...rows, ...ls.slice(i + 1)];
    });
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-stone-500 block mb-1.5"
  }, "T\xE9telek a bizonylaton \xB7 ", lines.length), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, lines.map((ln, i) => {
    const it = whItems.find(x => x.id === ln.itemId);
    // a kiválasztott tétel ismert beszállítói megnevezése ennél a szállítónál
    const mapped = it && supplierName ? window.sim.supplierRefFor(it.id, supplierName) : null;
    // mértékegység-átváltás: 1:1 megfeleltetés factor != 1 → a beszállító más egységben mér
    const mConv = mapped ? window.sim.supplierMapTargets(mapped) : null;
    const unitConv = mConv && mConv.length === 1 && mConv[0].factor !== 1 ? {
      factor: mConv[0].factor,
      supplierUnit: mapped.supplierUnit || "egys."
    } : null;
    // méret-alapú átváltás (tábla): a tényleges szél×hossz adja az m²-t (rétegelt lemeznél változó)
    const sheet = mapped && mapped.sheet ? mapped.sheet : null;
    const shW = Number(ln.shW != null ? ln.shW : sheet ? sheet.w : 0) || 0;
    const shL = Number(ln.shL != null ? ln.shL : sheet ? sheet.l : 0) || 0;
    const shCnt = Number(ln.shCnt != null ? ln.shCnt : 0) || 0;
    const setSheet = patch => {
      const w = Number(patch.shW != null ? patch.shW : shW) || 0;
      const l = Number(patch.shL != null ? patch.shL : shL) || 0;
      const c = Number(patch.shCnt != null ? patch.shCnt : shCnt) || 0;
      setLine(i, {
        ...patch,
        qty: String(+(c * w * l / 1e6).toFixed(4))
      });
    };
    const refTyped = (ln.supRef || "").trim();
    const refResolved = refTyped ? window.sim.resolveSupplierItem(supplierName || "", {
      sku: refTyped,
      label: refTyped
    }) : null;
    const showLearn = refTyped && ln.itemId && supplierName && !window.sim.supplierRefFor(ln.itemId, supplierName);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "rounded-xl border border-stone-200 bg-white p-2.5"
    }, supplierName && /*#__PURE__*/React.createElement("div", {
      className: "mb-2"
    }, /*#__PURE__*/React.createElement("label", {
      className: "text-[10px] text-stone-400 block mb-1"
    }, "Besz\xE1ll\xEDt\xF3i cikk (cikksz\xE1m / megnevez\xE9s a bizonylatr\xF3l)"), /*#__PURE__*/React.createElement("input", {
      value: ln.supRef || "",
      onChange: e => resolveRef(i, e.target.value),
      placeholder: "pl. W980 ST2 16 \u2014 felold\xE1s a saj\xE1t t\xE9telre",
      className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-teal-500 bg-white"
    }), refTyped && (refResolved ? refResolved.targets && refResolved.targets.length > 1 ? /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5 rounded-lg border border-teal-200 bg-teal-50/50 p-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-teal-700 font-medium flex items-center gap-1 mb-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 11
    }), "Szettb\u0151l ", refResolved.targets.length, " saj\xE1t t\xE9telre bonthat\xF3"), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-500 mb-1.5"
    }, refResolved.targets.map(t => {
      const c = whItems.find(x => x.id === t.catalogItemId);
      return `×${t.factor} ${c ? c.name : t.catalogItemId}`;
    }).join(" + ")), /*#__PURE__*/React.createElement("button", {
      onClick: () => splitLine(i, refResolved.targets),
      className: "inline-flex items-center gap-1.5 text-[11px] text-teal-700 font-medium hover:text-teal-800"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 12
    }), "Bont\xE1s ", refResolved.targets.length, " t\xE9telre")) : /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-emerald-600 mt-1 flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 11
    }), "Feloldva a saj\xE1t t\xE9telre") : /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-amber-600 mt-1"
    }, "Nincs megfeleltet\xE9s \u2014 v\xE1laszd ki a t\xE9telt k\xE9zzel lent."))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-2"
    }, /*#__PURE__*/React.createElement("select", {
      value: ln.itemId,
      onChange: e => setLine(i, {
        itemId: e.target.value
      }),
      className: "flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-teal-500"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u2014 v\xE1lassz saj\xE1t t\xE9telt \u2014"), whItems.filter(x => !isVariantParentItem(x)).map(x => /*#__PURE__*/React.createElement("option", {
      key: x.id,
      value: x.id
    }, whItemOptLabel(x)))), lines.length > 1 && /*#__PURE__*/React.createElement("button", {
      onClick: () => rmLine(i),
      className: "shrink-0 w-8 h-8 grid place-items-center rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-500"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    }))), mapped && (mapped.supplierSku || mapped.supplierLabel) && /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 mb-2 flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 11,
      className: "text-stone-300"
    }), supplierName, " szerint: ", /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-stone-500"
    }, mapped.supplierSku), mapped.supplierLabel ? ` · ${mapped.supplierLabel}` : ""), sheet ? /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "text-[10px] text-stone-400 block mb-1"
    }, "T\xE1bla m\xE9ret (mm)", sheet.variable ? " — változó, add meg a tényleges méretet" : " — szabványos"), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      value: ln.shW != null ? ln.shW : sheet.w,
      onChange: e => setSheet({
        shW: e.target.value
      }),
      disabled: !sheet.variable,
      className: `w-24 h-9 px-2 rounded-lg border text-[12px] text-right font-mono outline-none focus:border-teal-500 ${sheet.variable ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-100 text-stone-500"}`
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] text-stone-400"
    }, "\xD7"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      value: ln.shL != null ? ln.shL : sheet.l,
      onChange: e => setSheet({
        shL: e.target.value
      }),
      disabled: !sheet.variable,
      className: `w-24 h-9 px-2 rounded-lg border text-[12px] text-right font-mono outline-none focus:border-teal-500 ${sheet.variable ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-100 text-stone-500"}`
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-400"
    }, "mm"))), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 gap-2"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "text-[10px] text-stone-400 block mb-1"
    }, "Darab (", mapped.supplierUnit || "tábla", ")"), /*#__PURE__*/React.createElement(WhNumInput, {
      value: ln.shCnt != null ? ln.shCnt : "",
      onChange: v => setSheet({
        shCnt: v
      }),
      className: "w-full"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "text-[10px] text-stone-400 block mb-1"
    }, "Rakt\xE1rhely"), /*#__PURE__*/React.createElement(WhLocationSelect, {
      value: ln.locId,
      onChange: v => setLine(i, {
        locId: v
      })
    }))), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-teal-600 font-medium"
    }, "= ", +(Number(ln.qty) || 0).toFixed(3), " ", it ? it.unit : "m²", " ", /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400 font-normal"
    }, "(", shCnt, " \xD7 ", shW, "\xD7", shL, " mm)"))) : /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 gap-2"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "text-[10px] text-stone-400 block mb-1"
    }, unitConv ? `Beszállítói menny. (${unitConv.supplierUnit})` : `Mennyiség${it ? ` (${it.unit})` : ""}`), unitConv ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(WhNumInput, {
      value: ln.supQty != null ? ln.supQty : "",
      onChange: v => setLine(i, {
        supQty: v,
        qty: String((Number(v) || 0) * unitConv.factor)
      }),
      className: "w-full"
    }), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-teal-600 mt-1"
    }, "= ", +(Number(ln.qty) || 0).toFixed(3), " ", it.unit, " ", /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400"
    }, "(\xD7", unitConv.factor, ")"))) : /*#__PURE__*/React.createElement(WhNumInput, {
      value: ln.qty,
      onChange: v => setLine(i, {
        qty: v
      }),
      className: "w-full"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "text-[10px] text-stone-400 block mb-1"
    }, "Rakt\xE1rhely"), /*#__PURE__*/React.createElement(WhLocationSelect, {
      value: ln.locId,
      onChange: v => setLine(i, {
        locId: v
      })
    }))), showLearn && /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.learnSupplierMap({
        supplierName,
        supplierSku: refTyped,
        supplierLabel: "",
        catalogItemId: ln.itemId
      }),
      className: "mt-2 inline-flex items-center gap-1.5 text-[11px] text-teal-700 font-medium hover:text-teal-800"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 12
    }), "Megfeleltet\xE9s ment\xE9se: \u201E", refTyped, "\" \u2192 ", it?.name), it && !it.worldExt?.warehouse && /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-amber-600 mt-1.5"
    }, "A t\xE9tel m\xE9g nincs rakt\xE1rozva \u2014 a bev\xE9telez\xE9s bekapcsolja."));
  })), /*#__PURE__*/React.createElement("button", {
    onClick: addLine,
    className: "mt-2 inline-flex items-center gap-1.5 text-[12px] text-teal-700 font-medium hover:text-teal-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), "T\xE9tel hozz\xE1ad\xE1sa"));
}

// Bevételezés-sorok payloaddá alakítása (hely-szöveg feloldással).
function buildReceiveLines(lines) {
  return lines.filter(l => l.itemId && (Number(l.qty) || 0) > 0).map(l => {
    const loc = window.sim.whLocById(l.locId);
    return {
      itemId: l.itemId,
      qty: Number(l.qty) || 0,
      locId: l.locId || "",
      locText: loc ? loc.text : ""
    };
  });
}

// Ad-hoc bevételezés — PO nélkül, közvetlenül bizonylat alapján.
function AdhocReceiveForm({
  onDone
}) {
  const sim = window.useSim();
  const whItems = (sim.catalog || []).filter(x => x.active !== false);
  const [supplier, setSupplier] = useStateW2("");
  const [docType, setDocType] = useStateW2("szallitolevel");
  const [docNo, setDocNo] = useStateW2("");
  const [lockProject, setLockProject] = useStateW2(false);
  const [projectNo, setProjectNo] = useStateW2("");
  const [lines, setLines] = useStateW2([{
    itemId: "",
    qty: "",
    locId: ""
  }]);
  const suppliers = useMemoW2(() => Array.from(new Set((sim.pos || []).map(p => p.supplier).filter(Boolean))), [sim.pos]);
  const payload = buildReceiveLines(lines);
  const go = () => {
    window.sim.receiveAdhoc({
      supplier,
      docType,
      docNo,
      lock: lockProject,
      projectNo: lockProject ? projectNo : "",
      lines: payload
    });
    onDone();
  };
  const canSubmit = payload.length > 0 && (!lockProject || projectNo.trim());
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(DocSection, {
    docType: docType,
    setDocType: setDocType,
    docNo: docNo,
    setDocNo: setDocNo
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-stone-500 block mb-1"
  }, "Sz\xE1ll\xEDt\xF3"), /*#__PURE__*/React.createElement("input", {
    value: supplier,
    onChange: e => setSupplier(e.target.value),
    list: "adhoc-suppliers",
    placeholder: "pl. Falco Sopron Zrt.",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white"
  }), /*#__PURE__*/React.createElement("datalist", {
    id: "adhoc-suppliers"
  }, suppliers.map(s => /*#__PURE__*/React.createElement("option", {
    key: s,
    value: s
  })))), /*#__PURE__*/React.createElement(ReceiveLinesEditor, {
    lines: lines,
    setLines: setLines,
    whItems: whItems,
    supplierName: supplier
  }), /*#__PURE__*/React.createElement(ProjectLockSection, {
    lockProject: lockProject,
    setLockProject: setLockProject,
    projectNo: projectNo,
    setProjectNo: setProjectNo
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2 pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onDone,
    className: "h-10 px-4 rounded-lg text-[12.5px] text-stone-500 hover:bg-stone-100"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: go,
    disabled: !canSubmit,
    className: `h-10 px-4 rounded-lg text-[12.5px] font-medium ${canSubmit ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-400"}`
  }, "Bev\xE9telez\xE9s", payload.length > 1 ? ` (${payload.length})` : "")));
}
function ReceiveForm({
  po,
  onDone
}) {
  const sim = window.useSim();
  const whItems = (sim.catalog || []).filter(x => x.active !== false);
  const [docType, setDocType] = useStateW2("szallitolevel");
  const [docNo, setDocNo] = useStateW2("");
  // A projekt-zárolás NEM automatikus: a bizonylaton (szállítólevél/számla) nem
  // feltétlenül szerepel a projekt. A bevételező tudatosan dönt — alapból szabad.
  const [lockProject, setLockProject] = useStateW2(false);
  const [projectNo, setProjectNo] = useStateW2(po.projectNo || "");
  // A PO tételeinek előtöltése: ha a PO több soros (procurement), kódonként a
  // katalógushoz illesztjük; egyébként egyetlen sor a PO fő tételéből.
  const [lines, setLines] = useStateW2(() => {
    if (po.lines && po.lines.length) {
      return po.lines.map(l => {
        // 1) saját kód egyezés, 2) beszállítói megfeleltetés (idegen cikkszám/megnevezés)
        let match = whItems.find(x => x.code && (x.code === l.matCode || x.code === l.code));
        if (!match) {
          const r = window.sim.resolveSupplierItem(po.supplier, {
            sku: l.supplierSku || l.matCode || l.code,
            label: l.supplierLabel || l.material
          });
          if (r) match = whItems.find(x => x.id === r.catalogItemId);
        }
        return {
          itemId: match ? match.id : "",
          qty: String(l.qty || ""),
          locId: "",
          supRef: l.supplierSku || ""
        };
      });
    }
    let m0 = whItems.find(x => x.id === po.itemId);
    if (!m0) {
      const r = window.sim.resolveSupplierItem(po.supplier, {
        label: po.material
      });
      if (r) m0 = whItems.find(x => x.id === r.catalogItemId);
    }
    return [{
      itemId: m0 ? m0.id : po.itemId || "",
      qty: String(po.qty || ""),
      locId: "",
      supRef: ""
    }];
  });
  const payload = buildReceiveLines(lines);
  const go = () => {
    window.sim.receiveToWarehouse(po.id, {
      docType,
      docNo,
      lock: lockProject,
      projectNo: lockProject ? projectNo : "",
      projectName: po.projectName || "",
      lines: payload
    });
    onDone();
  };
  const canSubmit = payload.length > 0 && (!lockProject || projectNo.trim());
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(DocSection, {
    docType: docType,
    setDocType: setDocType,
    docNo: docNo,
    setDocNo: setDocNo,
    sub: `${po.supplier} · ${po.id}`
  }), /*#__PURE__*/React.createElement(ReceiveLinesEditor, {
    lines: lines,
    setLines: setLines,
    whItems: whItems,
    supplierName: po.supplier
  }), /*#__PURE__*/React.createElement(ProjectLockSection, {
    lockProject: lockProject,
    setLockProject: setLockProject,
    projectNo: projectNo,
    setProjectNo: setProjectNo,
    poProjectNo: po.projectNo
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2 pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onDone,
    className: "h-10 px-4 rounded-lg text-[12.5px] text-stone-500 hover:bg-stone-100"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: go,
    disabled: !canSubmit,
    className: `h-10 px-4 rounded-lg text-[12.5px] font-medium ${canSubmit ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-400"}`
  }, "Bev\xE9telez\xE9s", payload.length > 1 ? ` (${payload.length})` : "")));
}

// ══════════════════════════════════════════════════════════════════════════
// KIVÉT-KÉRELMEK (FSM: kért → komissiózva → kiadva | visszavonva)
// ══════════════════════════════════════════════════════════════════════════
function WithdrawalsPage() {
  const sim = window.useSim();
  const [statusF, setStatusF] = useStateW2("active");
  const [consF, setConsF] = useStateW2("all");
  const [openId, setOpenId] = useStateW2(null);
  const [creating, setCreating] = useStateW2(false);
  const all = sim.withdrawals || [];
  const filtered = useMemoW2(() => {
    let list = all;
    if (statusF === "active") list = list.filter(w => w.status === "kert" || w.status === "komissiozva");else if (statusF !== "all") list = list.filter(w => w.status === statusF);
    if (consF !== "all") list = list.filter(w => w.consumer === consF);
    return list;
  }, [all, statusF, consF]);
  const open = openId ? all.find(w => w.id === openId) : null;
  const activeCount = all.filter(w => w.status === "kert" || w.status === "komissiozva").length;
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-end justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-[17px] font-semibold text-stone-900"
  }, "Kiv\xE9t"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500"
  }, "Kiv\xE9t-k\xE9relmek a fogyaszt\xF3kt\xF3l \u2014 k\xE9rt \u2192 komissi\xF3zva \u2192 kiadva.")), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: () => setCreating(true)
  }, "\xDAj kiv\xE9t-k\xE9relem")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 overflow-x-auto pb-1 mb-2"
  }, /*#__PURE__*/React.createElement(FilterChip, {
    active: statusF === "active",
    onClick: () => setStatusF("active"),
    label: "Akt\xEDv",
    count: activeCount
  }), /*#__PURE__*/React.createElement(FilterChip, {
    active: statusF === "all",
    onClick: () => setStatusF("all"),
    label: "Mind",
    count: all.length
  }), (window.WH_WD_ORDER || []).map(sk => /*#__PURE__*/React.createElement(FilterChip, {
    key: sk,
    active: statusF === sk,
    onClick: () => setStatusF(sk),
    label: window.WH_WD_FLOW[sk].label,
    count: all.filter(w => w.status === sk).length
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 overflow-x-auto pb-1 mb-3"
  }, /*#__PURE__*/React.createElement(FilterChip, {
    active: consF === "all",
    onClick: () => setConsF("all"),
    label: "Minden fogyaszt\xF3"
  }), (window.WH_CONSUMER_ORDER || []).map(ck => /*#__PURE__*/React.createElement(FilterChip, {
    key: ck,
    active: consF === ck,
    onClick: () => setConsF(ck),
    label: window.WH_CONSUMERS[ck].label,
    icon: window.WH_CONSUMERS[ck].icon
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-3"
  }, filtered.length === 0 && /*#__PURE__*/React.createElement(Card, {
    className: "px-5 py-8 text-center text-[12.5px] text-stone-400 md:col-span-2"
  }, "Nincs kiv\xE9t-k\xE9relem ebben a n\xE9zetben."), filtered.map(w => {
    const st = window.WH_WD_FLOW[w.status] || {};
    return /*#__PURE__*/React.createElement("button", {
      key: w.id,
      onClick: () => setOpenId(w.id),
      className: "text-left w-full bg-white border border-stone-200/80 hover:border-stone-300 transition rounded-xl p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-2 mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-mono text-[11px] text-stone-400"
    }, w.id), /*#__PURE__*/React.createElement("div", {
      className: "mt-1"
    }, /*#__PURE__*/React.createElement(WhConsumerPill, {
      consumer: w.consumer
    }))), /*#__PURE__*/React.createElement("span", {
      className: `shrink-0 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${st.pill}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${st.dot}`
    }), st.label)), w.refLabel && /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] text-stone-700 truncate mb-1"
    }, w.refLabel), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-500"
    }, (w.lines || []).length, " t\xE9tel \xB7 ", (w.lines || []).reduce((a, l) => a + (Number(l.qty) || 0), 0), " egys\xE9g"), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 mt-1"
    }, w.requestedBy, " \xB7 ", w.requestedAt));
  })), /*#__PURE__*/React.createElement(SlideOver, {
    open: !!open,
    onClose: () => setOpenId(null),
    width: 520,
    title: open ? open.id : "",
    subtitle: open ? window.WH_CONSUMERS[open.consumer]?.label || open.consumer : ""
  }, open && /*#__PURE__*/React.createElement(WithdrawalDetail, {
    wd: open,
    onClose: () => setOpenId(null)
  })), creating && /*#__PURE__*/React.createElement(WithdrawCreateDialog, {
    onClose: () => setCreating(false)
  }));
}
function FilterChip({
  active,
  onClick,
  label,
  count,
  icon
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: `shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12px] font-medium transition ${active ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 12
  }), label, count != null && /*#__PURE__*/React.createElement("span", {
    className: `tabular-nums text-[10.5px] ${active ? "text-white/60" : "text-stone-400"}`
  }, count));
}
function WithdrawalDetail({
  wd,
  onClose
}) {
  const sim = window.useSim();
  const live = (sim.withdrawals || []).find(w => w.id === wd.id) || wd;
  const st = window.WH_WD_FLOW[live.status] || {};
  const nexts = st.next || [];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement(WhConsumerPill, {
    consumer: live.consumer
  }), /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${st.pill}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${st.dot}`
  }), st.label), live.ref && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono"
  }, live.ref)), live.refLabel && /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] text-stone-700"
  }, live.refLabel), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, ["kert", "komissiozva", "kiadva"].map((s, i) => {
    const reached = window.WH_WD_ORDER.indexOf(live.status) >= window.WH_WD_ORDER.indexOf(s) && live.status !== "visszavonva";
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: s
    }, i > 0 && /*#__PURE__*/React.createElement("div", {
      className: `h-0.5 flex-1 ${reached ? "bg-teal-500" : "bg-stone-200"}`
    }), /*#__PURE__*/React.createElement("div", {
      className: `text-[10px] px-2 py-1 rounded-full font-medium ${reached ? "bg-teal-50 text-teal-700" : "bg-stone-100 text-stone-400"}`
    }, window.WH_WD_FLOW[s].label));
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "T\xE9telek"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, (live.lines || []).map((l, i) => {
    const it = (sim.catalog || []).find(x => x.id === l.itemId);
    const free = it?.worldExt?.warehouse?.available ?? null;
    const short = free != null && free < (Number(l.qty) || 0) && live.status !== "kiadva";
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2 text-[12.5px]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-stone-800 truncate"
    }, l.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400 font-mono"
    }, l.code, free != null && ` · szabad: ${free}`)), /*#__PURE__*/React.createElement("div", {
      className: "text-right shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-semibold text-stone-800 tabular-nums"
    }, l.qty, " ", l.unit), short && /*#__PURE__*/React.createElement("div", {
      className: "text-[9.5px] text-rose-600"
    }, "fedezethi\xE1ny")));
  }))), live.note && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-500 italic"
  }, "\u201E", live.note, "\""), nexts.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 pt-1"
  }, nexts.includes("komissiozva") && /*#__PURE__*/React.createElement(WdBtn, {
    tone: "amber",
    onClick: () => window.sim.setWithdrawalStatus(live.id, "komissiozva")
  }, "Komissi\xF3z\xE1s"), nexts.includes("kiadva") && /*#__PURE__*/React.createElement(WdBtn, {
    tone: "teal",
    onClick: () => {
      window.sim.setWithdrawalStatus(live.id, "kiadva");
      onClose();
    }
  }, "Kiad\xE1s (kiv\xE9t)"), nexts.includes("kert") && /*#__PURE__*/React.createElement(WdBtn, {
    tone: "stone",
    onClick: () => window.sim.setWithdrawalStatus(live.id, "kert")
  }, "Vissza k\xE9rtre"), nexts.includes("visszavonva") && /*#__PURE__*/React.createElement(WdBtn, {
    tone: "rose",
    onClick: () => {
      window.sim.setWithdrawalStatus(live.id, "visszavonva");
      onClose();
    }
  }, "Visszavon\xE1s")) : /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-stone-50 border border-stone-200 px-3 py-2.5 text-[12px] text-stone-500 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 14,
    className: "text-stone-400"
  }), "Lez\xE1rt k\xE9relem \u2014 nincs tov\xE1bbi m\u0171velet.", live.issuedAt && ` Kiadva: ${live.issuedAt}.`));
}
function WdBtn({
  children,
  onClick,
  tone
}) {
  const tones = {
    amber: "bg-amber-500 text-white",
    teal: "bg-teal-700 text-white",
    stone: "bg-white border border-stone-200 text-stone-700",
    rose: "bg-rose-600 text-white"
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: `h-10 px-4 rounded-lg text-[12.5px] font-medium ${tones[tone]}`
  }, children);
}

// ── Kivét-kérelem létrehozó dialógus (general + tétel-előtöltés) ─────────────
function WithdrawCreateDialog({
  onClose,
  initialItem
}) {
  const sim = window.useSim();
  const whItems = (sim.catalog || []).filter(x => x.active !== false && x.worldExt?.warehouse && !x.worldExt.warehouse.archived);
  const [consumer, setConsumer] = useStateW2("gyartas");
  const [ref, setRef] = useStateW2("");
  const [note, setNote] = useStateW2("");
  const [lines, setLines] = useStateW2(initialItem ? [{
    itemId: initialItem.id,
    qty: "1"
  }] : [{
    itemId: "",
    qty: "1"
  }]);
  const setLine = (i, patch) => setLines(ls => ls.map((l, j) => j === i ? {
    ...l,
    ...patch
  } : l));
  const addLine = () => setLines(ls => [...ls, {
    itemId: "",
    qty: "1"
  }]);
  const rmLine = i => setLines(ls => ls.filter((_, j) => j !== i));
  const valid = lines.some(l => l.itemId && (Number(l.qty) || 0) > 0);
  const submit = () => {
    const payload = lines.filter(l => l.itemId && (Number(l.qty) || 0) > 0).map(l => {
      const it = whItems.find(x => x.id === l.itemId);
      return {
        itemId: l.itemId,
        code: it?.code,
        name: it?.name,
        qty: Number(l.qty) || 0,
        unit: it?.unit
      };
    });
    window.sim.createWithdrawal({
      consumer,
      ref,
      refLabel: ref,
      lines: payload,
      note,
      requestedBy: window.WH_CONSUMERS[consumer]?.label
    });
    onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[60] flex items-end md:items-center justify-center",
    style: {
      paddingBottom: "env(safe-area-inset-bottom)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-black/30",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b border-stone-100 px-5 py-3.5 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, "\xDAj kiv\xE9t-k\xE9relem"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-8 h-8 grid place-items-center rounded-lg hover:bg-stone-100 text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "p-5 space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-stone-500 block mb-1.5"
  }, "Fogyaszt\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, (window.WH_CONSUMER_ORDER || []).map(ck => {
    const c = window.WH_CONSUMERS[ck];
    return /*#__PURE__*/React.createElement("button", {
      key: ck,
      onClick: () => setConsumer(ck),
      className: `inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[12px] font-medium ${consumer === ck ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: c.icon,
      size: 13
    }), c.label);
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-stone-500 block mb-1"
  }, "Hivatkoz\xE1s (rendel\xE9s / projekt)"), /*#__PURE__*/React.createElement("input", {
    value: ref,
    onChange: e => setRef(e.target.value),
    placeholder: "pl. JT-2426-0184 vagy PRJ-2426-012",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-stone-500 block mb-1.5"
  }, "T\xE9telek"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, lines.map((l, i) => {
    const it = whItems.find(x => x.id === l.itemId);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("select", {
      value: l.itemId,
      onChange: e => setLine(i, {
        itemId: e.target.value
      }),
      className: "flex-1 h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-teal-500"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u2014 t\xE9tel \u2014"), whItems.filter(x => !isVariantParentItem(x)).map(x => /*#__PURE__*/React.createElement("option", {
      key: x.id,
      value: x.id
    }, x.variantOf ? window.sim.variantLabel && window.sim.variantLabel(x) || x.name : x.name, " (szabad ", x.worldExt.warehouse.available, ")"))), /*#__PURE__*/React.createElement(WhNumInput, {
      value: l.qty,
      onChange: v => setLine(i, {
        qty: v
      }),
      className: "w-16"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-400 w-8"
    }, it?.unit || ""), lines.length > 1 && /*#__PURE__*/React.createElement("button", {
      onClick: () => rmLine(i),
      className: "w-8 h-8 grid place-items-center rounded-lg hover:bg-stone-100 text-stone-400"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    })));
  })), /*#__PURE__*/React.createElement("button", {
    onClick: addLine,
    className: "mt-2 inline-flex items-center gap-1.5 text-[12px] text-teal-700 font-medium hover:text-teal-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), "T\xE9tel hozz\xE1ad\xE1sa")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-stone-500 block mb-1"
  }, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("input", {
    value: note,
    onChange: e => setNote(e.target.value),
    placeholder: "opcion\xE1lis",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "sticky bottom-0 bg-white border-t border-stone-100 px-5 py-3 flex justify-end gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-10 px-4 rounded-lg text-[12.5px] text-stone-500 hover:bg-stone-100"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: submit,
    disabled: !valid,
    className: `h-10 px-4 rounded-lg text-[12.5px] font-medium ${valid ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-400"}`
  }, "K\xE9relem l\xE9trehoz\xE1sa"))));
}

// ══════════════════════════════════════════════════════════════════════════
// BEÁLLÍTÁSOK → RAKTÁRHELYEK (szintek + hely-regiszter)
// ══════════════════════════════════════════════════════════════════════════
function WarehouseLevelsPanel() {
  const sim = window.useSim();
  const levels = sim.warehouseCfg?.levels || {};
  const locs = sim.warehouseLocations || [];
  const facilities = window.FACILITIES || [];
  const [adding, setAdding] = useStateW2(false);
  const [editId, setEditId] = useStateW2(null);
  const byFac = useMemoW2(() => {
    const m = {};
    locs.forEach(l => {
      (m[l.facilityId] = m[l.facilityId] || []).push(l);
    });
    return m;
  }, [locs]);
  return /*#__PURE__*/React.createElement("div", {
    className: "max-w-[900px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 mb-1"
  }, "Rakt\xE1rhely-szintek"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-stone-500 mb-3"
  }, "\xC1ll\xEDtsd be, mely szinteken kezeli a c\xE9g a rakt\xE1rhelyeket. A ", /*#__PURE__*/React.createElement("b", null, "Rakt\xE1r"), " \xE9s a ", /*#__PURE__*/React.createElement("b", null, "T\xE1rol\xF3"), " k\xF6telez\u0151."), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5"
  }, (window.WH_LEVELS || []).map(lv => {
    const on = !!levels[lv.key];
    return /*#__PURE__*/React.createElement("div", {
      key: lv.key,
      className: `rounded-xl border p-3.5 transition ${on ? "border-teal-300 bg-teal-50/40" : "border-stone-200 bg-white"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[13px] font-medium text-stone-900"
    }, lv.label), lv.mandatory && /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-0.5 text-[9.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 9
    }), "k\xF6telez\u0151"), lv.fromFacilities && /*#__PURE__*/React.createElement("span", {
      className: "text-[9.5px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200"
    }, "R\xE9szlegekb\u0151l")), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 mt-0.5"
    }, lv.desc)), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.setWhLevel(lv.key, !on),
      disabled: lv.mandatory,
      className: `shrink-0 w-11 h-6 rounded-full relative transition ${on ? "bg-teal-600" : "bg-stone-300"} ${lv.mandatory ? "opacity-60 cursor-not-allowed" : ""}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`
    }))));
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "Rakt\xE1rhelyek"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-stone-500"
  }, locs.length, " hely \xB7 csak az enged\xE9lyezett szintek jelennek meg.")), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: () => {
      setAdding(true);
      setEditId(null);
    }
  }, "\xDAj hely")), adding && /*#__PURE__*/React.createElement(WhLocationForm, {
    levels: levels,
    facilities: facilities,
    onClose: () => setAdding(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, facilities.map(f => {
    const list = byFac[f.id] || [];
    if (list.length === 0 && !levels.telephely) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: f.id
    }, levels.telephely && /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
    }, f.name), /*#__PURE__*/React.createElement(Card, {
      className: "p-0 overflow-hidden"
    }, list.length === 0 && /*#__PURE__*/React.createElement("div", {
      className: "px-4 py-3 text-[12px] text-stone-400 italic"
    }, "Nincs hely ezen a telephelyen."), list.map(l => /*#__PURE__*/React.createElement("div", {
      key: l.id,
      className: "flex items-center justify-between gap-2 px-4 py-2.5 border-b border-stone-100 last:border-0"
    }, editId === l.id ? /*#__PURE__*/React.createElement(WhLocationForm, {
      inline: true,
      loc: l,
      levels: levels,
      facilities: facilities,
      onClose: () => setEditId(null)
    }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] text-stone-800 font-mono"
    }, window.sim.whLocLabel(l)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditId(l.id),
      className: "w-8 h-8 grid place-items-center rounded-lg hover:bg-stone-100 text-stone-400"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "settings",
      size: 14
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.removeWhLocation(l.id),
      className: "w-8 h-8 grid place-items-center rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-500"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    }))))))));
  }), !levels.telephely && (byFac["__none"] || locs.filter(l => !facilities.find(f => f.id === l.facilityId))).length > 0 && null)));
}
function WhLocationForm({
  loc,
  levels,
  facilities,
  onClose,
  inline
}) {
  const [facilityId, setFacilityId] = useStateW2(loc?.facilityId || facilities[0]?.id || "");
  const [raktar, setRaktar] = useStateW2(loc?.raktar || "");
  const [helyiseg, setHelyiseg] = useStateW2(loc?.helyiseg || "");
  const [tarolo, setTarolo] = useStateW2(loc?.tarolo || "");
  const [rekesz, setRekesz] = useStateW2(loc?.rekesz || "");
  const valid = raktar.trim() && tarolo.trim();
  const save = () => {
    const data = {
      facilityId,
      raktar,
      helyiseg,
      tarolo,
      rekesz
    };
    if (loc) window.sim.updateWhLocation(loc.id, data);else window.sim.addWhLocation(data);
    onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? "w-full" : "rounded-xl border border-teal-200 bg-teal-50/30 p-3.5 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 gap-2"
  }, levels.telephely && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500 block mb-1"
  }, "Telephely"), /*#__PURE__*/React.createElement("select", {
    value: facilityId,
    onChange: e => setFacilityId(e.target.value),
    className: "w-full h-9 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-teal-500"
  }, facilities.map(f => /*#__PURE__*/React.createElement("option", {
    key: f.id,
    value: f.id
  }, f.name)))), /*#__PURE__*/React.createElement(Fld, {
    label: "Rakt\xE1r *",
    value: raktar,
    onChange: setRaktar,
    ph: "R1"
  }), levels.helyiseg && /*#__PURE__*/React.createElement(Fld, {
    label: "Helyis\xE9g",
    value: helyiseg,
    onChange: setHelyiseg,
    ph: "Lapt\xE1r"
  }), /*#__PURE__*/React.createElement(Fld, {
    label: "T\xE1rol\xF3 *",
    value: tarolo,
    onChange: setTarolo,
    ph: "A1"
  }), levels.rekesz && /*#__PURE__*/React.createElement(Fld, {
    label: "Rekesz",
    value: rekesz,
    onChange: setRekesz,
    ph: "3"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-1.5 mt-2.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "h-9 px-3 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100"
  }, "M\xE9gse"), /*#__PURE__*/React.createElement("button", {
    onClick: save,
    disabled: !valid,
    className: `h-9 px-3.5 rounded-lg text-[12px] font-medium ${valid ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-400"}`
  }, loc ? "Mentés" : "Hozzáadás")));
}
function Fld({
  label,
  value,
  onChange,
  ph
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-stone-500 block mb-1"
  }, label), /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: e => onChange(e.target.value),
    placeholder: ph,
    className: "w-full h-9 px-2 rounded-lg border border-stone-200 text-[12px] font-mono outline-none focus:border-teal-500 bg-white"
  }));
}
Object.assign(window, {
  ReceivingPage,
  WithdrawalsPage,
  WithdrawCreateDialog,
  WarehouseLevelsPanel,
  QuickWithdrawDialog: WithdrawCreateDialog
});
})();
