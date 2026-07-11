/* AUTO-GENERATED from page-outsource-settings.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-outsource-settings.jsx — Beállítások → Munkafolyamat → Bérmunka
//
//   A bérmunkára kiadható MŰVELET-TÍPUSOK kezelése (sim.outsourceOps). A
//   típusok hajtják a Gyártás-előkészítés „Bérmunka" fülét: melyik művelet
//   adható ki, melyik folyamat-epiket keresi (epicMatch), és mely partner-
//   kategóriákra szűr alapból. A típushoz tartozó `op`-kulcs köti a részleg
//   termelékenységi adatához (innen jön a részletes munkaidő-info a csomagba).
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateOS
} = React;
function OutsourceSettings() {
  const s = useSim();
  const ops = s.outsourceOps || [];
  const [editId, setEditId] = useStateOS(null);
  const create = () => {
    const id = window.sim.addOutsourceOp({
      label: "Új bérmunka típus",
      icon: "external",
      op: "custom",
      epicMatch: "",
      makerCats: [],
      desc: ""
    });
    setEditId(id);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "B\xE9rmunka t\xEDpusok"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 max-w-lg"
  }, "Kiadhat\xF3 folyamat-elemek (pl. teljes szab\xE1szat, \xE9lz\xE1r\xE1s, fest\xE9s, CNC). A Gy\xE1rt\xE1s-el\u0151k\xE9sz\xEDt\xE9sben ezek k\xF6z\xFCl v\xE1laszthat\xF3 \u2014 ak\xE1r t\xF6bb egy\xFCtt, egy partnernek. Az ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "op-kulcs"), " k\xF6ti a r\xE9szleg termel\xE9kenys\xE9gi adat\xE1hoz.")), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: create
  }, "\xDAj t\xEDpus")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, ops.map(op => /*#__PURE__*/React.createElement(OutsourceOpRow, {
    key: op.id,
    op: op,
    editing: editId === op.id,
    onEdit: () => setEditId(editId === op.id ? null : op.id)
  })), ops.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-[12.5px] text-stone-500"
  }, "M\xE9g nincs b\xE9rmunka t\xEDpus. Hozz l\xE9tre egyet az \u201E\xDAj t\xEDpus\" gombbal.")));
}
function OutsourceOpRow({
  op,
  editing,
  onEdit
}) {
  const s = useSim();
  const deps = window.MFG_DEPARTMENTS || [];
  const partners = React.useMemo(() => window.MfgPrep ? window.MfgPrep.partnersForOps([op.op], op.makerCats) : [], [op, s]);
  const dep = deps.find(d => d.op === op.op);
  const setF = patch => window.sim.updateOutsourceOp(op.id, patch);
  const toggleCat = c => {
    const has = (op.makerCats || []).includes(c);
    setF({
      makerCats: has ? op.makerCats.filter(x => x !== c) : [...(op.makerCats || []), c]
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: `bg-white rounded-xl border transition ${editing ? "border-teal-300 shadow-sm" : "border-stone-200/80"}`
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onEdit,
    className: "w-full flex items-center gap-3 p-3.5 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-stone-100 text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: op.icon || "external",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13.5px] font-semibold text-stone-900 truncate"
  }, op.label), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate"
  }, op.desc || "—")), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline-flex items-center gap-1.5 px-2 h-6 rounded-full bg-stone-100 text-stone-600 text-[10.5px] font-medium"
  }, partners.length, " partner"), /*#__PURE__*/React.createElement(Icon, {
    name: editing ? "up" : "down",
    size: 15,
    className: "text-stone-400"
  }))), editing && /*#__PURE__*/React.createElement("div", {
    className: "px-3.5 pb-3.5 pt-1 border-t border-stone-100 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-[1fr_auto] gap-3"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Megnevez\xE9s"
  }, /*#__PURE__*/React.createElement("input", {
    value: op.label,
    onChange: e => setF({
      label: e.target.value
    }),
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-[12.5px] text-stone-800"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Ikon"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, (window.MFG_OP_ICONS || []).map(ic => /*#__PURE__*/React.createElement("button", {
    key: ic,
    onClick: () => setF({
      icon: ic
    }),
    className: `w-9 h-9 rounded-lg grid place-items-center border transition ${op.icon === ic ? "border-teal-400 bg-teal-50 text-teal-700" : "border-stone-200 text-stone-500 hover:bg-stone-50"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 15
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "R\xE9szleg / op-kulcs",
    hint: "A munkaid\u0151-norma forr\xE1sa."
  }, /*#__PURE__*/React.createElement("select", {
    value: op.op,
    onChange: e => setF({
      op: e.target.value
    }),
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-[12.5px] text-stone-800"
  }, deps.map(d => /*#__PURE__*/React.createElement("option", {
    key: d.op,
    value: d.op
  }, d.name, " (", d.op, ")")), /*#__PURE__*/React.createElement("option", {
    value: "custom"
  }, "Egy\xE9b (custom)"))), /*#__PURE__*/React.createElement(Field, {
    label: "Epik-keres\u0151sz\xF3",
    hint: "A folyamat-epik c\xEDm\xE9re illeszt (| = vagy)."
  }, /*#__PURE__*/React.createElement("input", {
    value: op.epicMatch || "",
    onChange: e => setF({
      epicMatch: e.target.value
    }),
    placeholder: "pl. szab|v\xE1g\xE1s",
    className: "w-full h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-[12.5px] text-stone-800 font-mono"
  }))), /*#__PURE__*/React.createElement(Field, {
    label: "Le\xEDr\xE1s"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: op.desc || "",
    onChange: e => setF({
      desc: e.target.value
    }),
    rows: 2,
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-700 resize-none"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Partner-kateg\xF3ri\xE1k",
    hint: "Alap sz\u0171r\u0151 a kiad\xE1sn\xE1l."
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, (window.MAKER_CATEGORIES || []).map(c => {
    const on = (op.makerCats || []).includes(c);
    return /*#__PURE__*/React.createElement("button", {
      key: c,
      onClick: () => toggleCat(c),
      className: `px-2.5 h-7 rounded-full text-[11px] font-medium border transition ${on ? "border-teal-400 bg-teal-50 text-teal-700" : "border-stone-200 text-stone-500 hover:bg-stone-50"}`
    }, c);
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2 pt-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 min-w-0 truncate"
  }, dep ? /*#__PURE__*/React.createElement(React.Fragment, null, "Norma: ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-700 font-medium"
  }, dep.name), " \xB7 ") : null, "V\xE1llalja: ", partners.length ? partners.map(p => p.name).join(", ") : "— (állíts be partner-képességet)"), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.removeOutsourceOp(op.id),
    className: "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-rose-200 text-rose-600 text-[12px] font-medium hover:bg-rose-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  }), "T\xF6rl\xE9s"))));
}
function Field({
  label,
  hint,
  children
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, label), hint && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400"
  }, "\xB7 ", hint)), children);
}
Object.assign(window, {
  OutsourceSettings
});
})();
