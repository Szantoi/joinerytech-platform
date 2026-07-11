/* AUTO-GENERATED from page-process-panel.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-process-panel.jsx — Beállítások → Munkafolyamat → Folyamatok.
//   Kirendeltség-választó + az adott telephely saját folyamatai. Megnyitja a
//   függőleges folyam-sáv szerkesztőt (window.ProcessEditor).
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStatePP
} = React;
function ProcessesPanel() {
  const s = useSim();
  const facilities = window.FACILITIES || [];
  const [facId, setFacId] = useStatePP(facilities[0] ? facilities[0].id : null);
  const [editId, setEditId] = useStatePP(null);
  const list = (s.processes || []).filter(p => p.facilityId === facId);
  const create = () => {
    const id = window.sim.addProcess(facId, {});
    setEditId(id);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "Folyamatok"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 max-w-md"
  }, "Kirendelts\xE9genk\xE9nt saj\xE1t munkafolyamatok. L\xE9p\xE9sek, el\xE1gaz\xE1sok, p\xE1rhuzamos \xE1gak, ciklusok \xE9s bels\u0151\u2194k\xFCls\u0151 \xE1tad\xE1sok. Egy folyamat r\xE1h\xFAzva a projektre legener\xE1lja a m\xE9rf\xF6ldk\u0151 \u2192 epik \u2192 task hierarchi\xE1t.")), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: create
  }, "\xDAj folyamat")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 overflow-x-auto pb-1"
  }, facilities.map(f => {
    const cnt = (s.processes || []).filter(p => p.facilityId === f.id).length;
    const sel = facId === f.id;
    return /*#__PURE__*/React.createElement("button", {
      key: f.id,
      onClick: () => setFacId(f.id),
      className: `inline-flex items-center gap-2 h-9 px-3 rounded-lg text-[12px] font-medium shrink-0 border transition ${sel ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "factory",
      size: 14,
      className: sel ? "text-teal-300" : "text-stone-400"
    }), /*#__PURE__*/React.createElement("span", {
      className: "max-w-[180px] truncate"
    }, f.name), /*#__PURE__*/React.createElement("span", {
      className: `text-[10px] px-1.5 py-0.5 rounded-full font-bold ${sel ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"}`
    }, cnt));
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
  }, list.map(proc => {
    const st = window.sim.processStepStats(proc);
    return /*#__PURE__*/React.createElement("div", {
      key: proc.id,
      className: "group bg-white border border-stone-200/80 hover:border-stone-300 hover:shadow-sm rounded-xl p-4 transition flex flex-col gap-3"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditId(proc.id),
      className: "text-left flex items-start gap-2.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-9 h-9 rounded-lg grid place-items-center text-white shrink-0",
      style: {
        background: proc.color || "#7c3aed"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "workflow",
      size: 17
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] font-semibold text-stone-900 leading-tight"
    }, proc.name), proc.desc && /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-500 mt-0.5 leading-snug line-clamp-2"
    }, proc.desc))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 flex-wrap"
    }, /*#__PURE__*/React.createElement(Chip, {
      icon: "layers",
      tone: "stone"
    }, st.phases, " f\xE1zis"), /*#__PURE__*/React.createElement(Chip, {
      icon: "box",
      tone: "stone"
    }, st.steps, " l\xE9p\xE9s"), st.branches > 0 && /*#__PURE__*/React.createElement(Chip, {
      icon: "workflow",
      tone: "violet"
    }, st.branches, " el\xE1gaz\xE1s"), st.parallels > 0 && /*#__PURE__*/React.createElement(Chip, {
      icon: "layers",
      tone: "sky"
    }, st.parallels, " p\xE1rhuzam"), st.loops > 0 && /*#__PURE__*/React.createElement(Chip, {
      icon: "external",
      tone: "amber"
    }, st.loops, " ciklus"), st.ext > 0 && /*#__PURE__*/React.createElement(Chip, {
      icon: "external",
      tone: "teal"
    }, st.ext, " k\xFCls\u0151 \xE1tad\xE1s")), /*#__PURE__*/React.createElement("div", {
      className: "mt-auto flex items-center gap-1 pt-1 border-t border-stone-100"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditId(proc.id),
      className: "flex-1 h-8 rounded-lg text-[12px] font-medium text-stone-700 hover:bg-stone-100 inline-flex items-center justify-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "ruler",
      size: 13
    }), "Szerkeszt\xE9s"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.sim.duplicateProcess(proc.id),
      title: "Duplik\xE1l\xE1s",
      className: "w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "box",
      size: 14
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        if (confirm("Biztosan törlöd ezt a folyamatot?")) window.sim.removeProcess(proc.id);
      },
      title: "T\xF6rl\xE9s",
      className: "w-8 h-8 grid place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    }))));
  }), /*#__PURE__*/React.createElement("button", {
    onClick: create,
    className: "rounded-xl border border-dashed border-stone-300 p-4 min-h-[150px] grid place-items-center text-stone-400 hover:text-teal-700 hover:border-teal-300 transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex flex-col items-center gap-1.5 text-[12px] font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 18
  }), "\xDCres folyamat"))), editId && window.ProcessEditor && /*#__PURE__*/React.createElement(window.ProcessEditor, {
    processId: editId,
    onClose: () => setEditId(null)
  }));
}
function Chip({
  icon,
  tone,
  children
}) {
  const tones = {
    stone: "bg-stone-100 text-stone-600",
    violet: "bg-violet-100 text-violet-700",
    sky: "bg-sky-100 text-sky-700",
    amber: "bg-amber-100 text-amber-700",
    teal: "bg-teal-100 text-teal-700"
  };
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[10px] font-medium ${tones[tone] || tones.stone}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 11
  }), children);
}
Object.assign(window, {
  ProcessesPanel
});
})();
