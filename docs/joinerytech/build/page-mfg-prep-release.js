/* AUTO-GENERATED from page-mfg-prep-release.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-mfg-prep-release.jsx — Gyártás-előkészítés: Útvonal → Dokumentum → Kiadás
//
//   A gyártás-előkészítő munkalap HÁROM ÚJ füle (a meglévő Anyag/Szabászat/
//   Vasalat/Munkaidő/Bérmunka mellé). Ez a HIÁNYZÓ LÁNC: a levezetett munkából
//   valódi MŰHELY-FELADATOKAT készít.
//     • Útvonal     — a technológiai sorrend (szabászat → élzárás → CNC →
//                     szerelés → felület) műveletekre bontva; állomás + óra +
//                     bérmunka-jelölés. (MfgPrep.routingPlan)
//     • Dokumentum  — a munkához kötött gyártási rajzok / utasítások + verzió-
//                     tudat (DocsEngine.runtimeVersion); a kiadáskor a feladatra
//                     kerülnek (docIds). Figyelmeztet, ha nincs KIADOTT rajz.
//     • Kiadás      — áttekintés + „Kiadás a műhelynek" → sim.releaseToWorkshop
//                     valódi prodTask-okat hoz létre (Műhely-terminál fogyasztja).
//
//   Scope: `mp`-prefixű nevek; a három fő komponens (PrepRouting/PrepDocs/
//   PrepRelease) window-ra exportálva, a page-mfg-prep.jsx ezekre hivatkozik.
// ──────────────────────────────────────────────────────────────────────────
const {
  useState: useStateMp
} = React;
const mpHUF = n => Math.round(n || 0).toLocaleString("hu-HU") + " Ft";
const mpHUFk = n => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : Math.round((n || 0) / 1000) + "k") + " Ft";

// állomás-akcent → lágy Tailwind (literál osztálynevek)
const MP_SOFT = {
  "#0d9488": "bg-teal-50 text-teal-700",
  "#0284c7": "bg-sky-50 text-sky-700",
  "#7c3aed": "bg-violet-50 text-violet-700",
  "#ea580c": "bg-orange-50 text-orange-700",
  "#65a30d": "bg-lime-50 text-lime-700"
};

// közös szekció-fejléc (a page-mfg-prep.jsx-belivel megegyező vizuál)
function MpHead({
  icon,
  title,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-teal-50 text-teal-600 mt-0.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 15
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold text-stone-900"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 leading-snug max-w-2xl"
  }, sub)));
}

// ════════════════════════════════════════════════════════════════════════════
//  ÚTVONAL — műveletekre bontás (technológiai sorrend)
// ════════════════════════════════════════════════════════════════════════════
function PrepRouting({
  source,
  plan,
  setPlan,
  released
}) {
  if (!plan) return null;
  const steps = plan.steps || [];
  const enabled = steps.filter(s => s.enabled && !s.outsource);
  const outsourced = steps.filter(s => s.enabled && s.outsource);
  const patchStep = (kind, patch) => setPlan(p => ({
    ...p,
    steps: p.steps.map(s => s.kind === kind ? {
      ...s,
      ...patch
    } : s)
  }));

  // ── FOLYAMAT-ELTÉRÉS NAPLÓ (§19.3 cap.5): átrendezés / alternatív gép →
  //    napló-bejegyzés, indok KÖTELEZŐ a kiadáshoz (a store is kikényszeríti) ──
  const logDeviation = what => setPlan(p => ({
    ...p,
    deviations: [...(p.deviations || []), {
      id: "dev-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      at: new Date().toTimeString().slice(0, 5),
      what,
      reason: ""
    }]
  }));
  const moveStep = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= steps.length) return;
    const a = steps[idx],
      b = steps[j];
    setPlan(p => {
      const arr = p.steps.slice();
      const t = arr[idx];
      arr[idx] = arr[j];
      arr[j] = t;
      return {
        ...p,
        steps: arr
      };
    });
    logDeviation(`Sorrend-átrendezés: ${a.kindLabel} ⇄ ${b.kindLabel}`);
  };
  const deviations = plan.deviations || [];
  const devMissing = deviations.filter(d => !(d.reason && d.reason.trim())).length;
  const totalHours = enabled.reduce((s, x) => s + (Number(x.hours) || 0), 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(MpHead, {
    icon: "route",
    title: "Technol\xF3giai \xFAtvonal \u2014 m\u0171veletekre bont\xE1s",
    sub: "A levezetett munka \xE1llom\xE1sokra bontva, technol\xF3giai sorrendben. Minden bekapcsolt \xE1llom\xE1sb\xF3l egy v\xE1r\xF3list\xE1s gy\xE1rt\xE1si feladat k\xE9sz\xFCl a kiad\xE1skor. Az \xFCzem a folyamatot a saj\xE1t m\u0171k\xF6d\xE9s\xE9re szabhatja \u2014 \xE1trendez\xE9s vagy alternat\xEDv g\xE9p = ELT\xC9R\xC9S, ami indokkal napl\xF3z\xF3dik \xE9s a feladatokra ker\xFCl."
  }), released && /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-[12px] text-stone-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 14,
    className: "mt-0.5 shrink-0 text-stone-400"
  }), /*#__PURE__*/React.createElement("div", null, "Ez a munka m\xE1r ki van adva a m\u0171helynek \u2014 az \xFAtvonal csak t\xE1j\xE9koztat\xF3. \xDAj kiad\xE1shoz l\xE1sd a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Kiad\xE1s"), " f\xFClet.")), steps.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-[12.5px] text-stone-500"
  }, "Nincs levezethet\u0151 m\u0171velet ezen a munk\xE1n. El\u0151bb gener\xE1ld a sz\xFCks\xE9gletet, vagy adj t\xE9telt a projekthez.") : /*#__PURE__*/React.createElement("div", {
    className: "relative space-y-2.5 pl-1"
  }, steps.map((st, i) => {
    const soft = MP_SOFT[st.accent] || "bg-stone-100 text-stone-600";
    const stationOpts = (window.PROD_STATIONS || []).filter(s => s.kind === st.kind);
    const on = st.enabled;
    const active = on && !st.outsource;
    return /*#__PURE__*/React.createElement("div", {
      key: st.kind,
      className: `relative bg-white rounded-xl border p-3.5 transition ${active ? "border-teal-300" : on ? "border-amber-200" : "border-stone-200 opacity-70"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "shrink-0 flex flex-col items-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-7 h-7 rounded-full grid place-items-center text-[12px] font-semibold ${active ? "bg-teal-600 text-white" : "bg-stone-200 text-stone-500"}`
    }, i + 1), i < steps.length - 1 && /*#__PURE__*/React.createElement("div", {
      className: "w-px flex-1 min-h-[14px] bg-stone-200 mt-1"
    })), /*#__PURE__*/React.createElement("div", {
      className: `shrink-0 w-9 h-9 rounded-lg grid place-items-center ${soft}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: st.icon,
      size: 17
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[14px] font-semibold text-stone-900 truncate"
    }, st.kindLabel), st.baseSeq != null && st.baseSeq !== i + 1 && /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200",
      title: "Elt\xE9r\xE9s a technol\xF3giai alap-sorrendt\u0151l"
    }, "\u21D5 ", st.baseSeq, ". \u2192 ", i + 1, "."), st.baseMachineId && st.machineId !== st.baseMachineId && /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200",
      title: "Nem az alap\xE9rtelmezett g\xE9p"
    }, "alt. g\xE9p")), /*#__PURE__*/React.createElement("div", {
      className: "shrink-0 flex items-center gap-1.5"
    }, !released && /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-0.5"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => moveStep(i, -1),
      disabled: i === 0,
      title: "Fel \u2014 sorrend-\xE1trendez\xE9s (elt\xE9r\xE9s)",
      className: "w-6 h-6 rounded-md border border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300 grid place-items-center disabled:opacity-30"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 12,
      className: "-rotate-90"
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => moveStep(i, 1),
      disabled: i === steps.length - 1,
      title: "Le \u2014 sorrend-\xE1trendez\xE9s (elt\xE9r\xE9s)",
      className: "w-6 h-6 rounded-md border border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300 grid place-items-center disabled:opacity-30"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 12,
      className: "rotate-90"
    }))), /*#__PURE__*/React.createElement("button", {
      onClick: released ? undefined : () => patchStep(st.kind, {
        enabled: !on
      }),
      disabled: released,
      className: `shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition ${on ? "bg-teal-50 text-teal-700" : "bg-stone-100 text-stone-500"} ${released ? "opacity-60" : "hover:brightness-95"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-3.5 h-3.5 rounded grid place-items-center ${on ? "bg-teal-600 text-white" : "border border-stone-300 bg-white text-transparent"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 10
    })), on ? "Bekapcsolva" : "Kihagyva"))), on && /*#__PURE__*/React.createElement("div", {
      className: "mt-2.5 grid grid-cols-2 sm:grid-cols-[1fr_120px_auto] gap-2 items-center"
    }, /*#__PURE__*/React.createElement("select", {
      value: st.machineId || "",
      disabled: released || st.outsource,
      onChange: e => {
        const v = e.target.value || null;
        patchStep(st.kind, {
          machineId: v
        });
        if (v !== st.baseMachineId) {
          const mn = (stationOpts.find(s => s.id === v) || {}).name || "—";
          logDeviation(`Alternatív gép — ${st.kindLabel}: ${mn}`);
        }
      },
      className: "h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-700 disabled:bg-stone-50 disabled:text-stone-400"
    }, stationOpts.length === 0 && /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u2014 nincs g\xE9p \u2014"), stationOpts.map(s => /*#__PURE__*/React.createElement("option", {
      key: s.id,
      value: s.id
    }, s.name))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-stone-200 bg-white"
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0.5",
      step: "0.5",
      value: st.hours,
      disabled: released,
      onChange: e => patchStep(st.kind, {
        hours: Math.max(0.5, Number(e.target.value) || 0.5)
      }),
      className: "w-full text-[12px] text-stone-800 tabular-nums outline-none bg-transparent disabled:text-stone-400"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-stone-400 shrink-0"
    }, "\xF3ra")), /*#__PURE__*/React.createElement("button", {
      onClick: released ? undefined : () => patchStep(st.kind, {
        outsource: !st.outsource
      }),
      disabled: released,
      className: `h-9 px-3 rounded-lg text-[11.5px] font-medium inline-flex items-center gap-1.5 border transition ${st.outsource ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"} ${released ? "opacity-60" : ""}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "external",
      size: 13
    }), st.outsource ? "Bérmunka" : "Házon belül")), on && st.outsource && /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5 text-[10.5px] text-amber-600"
    }, "Kimarad a m\u0171helysorb\xF3l \u2014 a m\u0171veletet partner v\xE9gzi (l\xE1sd a B\xE9rmunka f\xFClet)."))));
  })), deviations.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-amber-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 bg-amber-50/70 border-b border-amber-200/70 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-amber-800 font-semibold inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 13
  }), "Elt\xE9r\xE9s-napl\xF3 \u2014 indok k\xF6telez\u0151"), devMissing > 0 ? /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] font-medium text-amber-700"
  }, devMissing, " kit\xF6ltetlen indok") : /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] font-medium text-emerald-700 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12
  }), "minden indokolva")), /*#__PURE__*/React.createElement("div", {
    className: "divide-y divide-stone-100"
  }, deviations.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.id,
    className: "px-4 py-2.5 flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "route",
    size: 14,
    className: "mt-1 text-amber-500 shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-800"
  }, d.what, " ", /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-normal text-stone-400 font-mono"
  }, "\xB7 ", d.at)), /*#__PURE__*/React.createElement("input", {
    value: d.reason || "",
    disabled: !!released,
    onChange: e => setPlan(p => ({
      ...p,
      deviations: (p.deviations || []).map(x => x.id === d.id ? {
        ...x,
        reason: e.target.value
      } : x)
    })),
    placeholder: "Elt\xE9r\xE9s indoka (k\xF6telez\u0151 a kiad\xE1shoz)\u2026",
    className: `mt-1 w-full h-8 px-2.5 rounded-lg border text-[11.5px] bg-white outline-none disabled:bg-stone-50 ${(d.reason || "").trim() ? "border-stone-200 text-stone-700" : "border-amber-300 focus:border-amber-400"}`
  })), !released && /*#__PURE__*/React.createElement("button", {
    onClick: () => setPlan(p => ({
      ...p,
      deviations: (p.deviations || []).filter(x => x.id !== d.id)
    })),
    title: "Bejegyz\xE9s t\xF6rl\xE9se",
    className: "shrink-0 mt-0.5 text-stone-300 hover:text-rose-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between bg-teal-50/60 border border-teal-200/60 rounded-xl px-4 py-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-teal-800 font-medium"
  }, "M\u0171helynek kiadand\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4 text-[13px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums text-teal-800"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, enabled.length), " feladat"), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums text-teal-800"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, Math.round(totalHours * 10) / 10), " \xF3ra"), outsourced.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums text-amber-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, outsourced.length), " b\xE9rmunka"))));
}

// ════════════════════════════════════════════════════════════════════════════
//  DOKUMENTUM — gyártási rajzok + verzió-tudat, csatolás a kiadáshoz
// ════════════════════════════════════════════════════════════════════════════
function PrepDocs({
  source,
  plan,
  setPlan,
  released
}) {
  const sim = useSim();
  const DE = window.DocsEngine;
  const link = source.docLink || {
    type: "order",
    id: source.id
  };
  const docs = sim.docsFor ? sim.docsFor(link.type, link.id) : [];
  const rajz = docs.filter(d => d.type === "rajz");
  const others = docs.filter(d => d.type !== "rajz");
  const hasReleasedRajz = rajz.some(d => {
    const r = DE && DE.runtimeVersion(d);
    return r && r.clear;
  });
  const docIds = plan ? plan.docIds || [] : [];
  const toggleDoc = id => setPlan(p => ({
    ...p,
    docIds: (p.docIds || []).includes(id) ? p.docIds.filter(x => x !== id) : [...(p.docIds || []), id]
  }));

  // csatolható (még nem ehhez a munkához kötött) rajz/utasítás a tárból
  const attachable = (sim.docList ? sim.docList() : []).filter(d => (d.type === "rajz" || d.type === "utasitas") && !(d.linkType === link.type && d.linkId === link.id));
  const [attachId, setAttachId] = useStateMp("");
  const attach = () => {
    if (!attachId) return;
    sim.linkDocToWork(attachId, link.type, link.id, source.name);
    setAttachId("");
  };
  const DocRow = ({
    d
  }) => {
    const rt = DE ? DE.runtimeVersion(d) : {
      runVersion: d.version,
      clear: true
    };
    const meta = (window.DOC_TYPE_META || {})[d.type] || {};
    const stat = (window.DOC_STATUS || {})[d.status] || {};
    const tone = rt.blocked ? {
      bd: "border-rose-200",
      bg: "bg-rose-50",
      fg: "text-rose-700"
    } : !rt.clear ? {
      bd: "border-amber-200",
      bg: "bg-amber-50",
      fg: "text-amber-700"
    } : {
      bd: "border-stone-200",
      bg: "bg-white",
      fg: "text-emerald-700"
    };
    const checked = docIds.includes(d.id);
    return /*#__PURE__*/React.createElement("div", {
      className: `rounded-xl border p-3.5 ${tone.bd} ${tone.bg}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-3"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: released ? undefined : () => toggleDoc(d.id),
      disabled: released,
      className: `shrink-0 mt-0.5 w-5 h-5 rounded-md border grid place-items-center transition ${checked ? "bg-teal-600 border-teal-600 text-white" : "border-stone-300 bg-white text-transparent"} ${released ? "opacity-60" : ""}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13
    })), /*#__PURE__*/React.createElement("div", {
      className: "shrink-0 w-8 h-8 rounded-lg grid place-items-center",
      style: {
        background: (meta.accent || "#78716c") + "1a",
        color: meta.accent || "#78716c"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: meta.icon || "file",
      size: 15
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] font-semibold text-stone-900 leading-tight"
    }, d.name), /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1 px-1.5 h-5 rounded-full border text-[10px] font-medium ${stat.pill}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${stat.dot}`
    }), stat.label)), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] font-mono text-stone-400 mt-0.5"
    }, d.id, " \xB7 v", d.version), d.type === "rajz" && /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5 text-[11px]"
    }, rt.clear ? /*#__PURE__*/React.createElement("span", {
      className: "text-emerald-700"
    }, "A kiadott v", rt.runVersion, " ker\xFCl a feladatra \u2014 gy\xE1rthat\xF3.") : rt.blocked ? /*#__PURE__*/React.createElement("span", {
      className: "text-rose-700 font-medium"
    }, "Nincs kiadott verzi\xF3 \u2014 a m\u0171hely ne kezdje el.") : /*#__PURE__*/React.createElement("span", {
      className: "text-amber-700"
    }, "A v", d.version, " ", stat.label.toLowerCase(), " \u2014 a m\u0171hely a kiadott v", rt.runVersion, "-t futtatja.")), checked && /*#__PURE__*/React.createElement("div", {
      className: "mt-2 flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chat",
      size: 13,
      className: "shrink-0 text-teal-600"
    }), /*#__PURE__*/React.createElement("input", {
      value: (plan && plan.docNotes ? plan.docNotes[d.id] : "") || "",
      disabled: !!released,
      onChange: e => setPlan(p => ({
        ...p,
        docNotes: {
          ...(p.docNotes || {}),
          [d.id]: e.target.value
        }
      })),
      placeholder: "Annot\xE1ci\xF3 a m\u0171helynek \u2014 r\xE9szlet-megjegyz\xE9s ehhez a dokumentumhoz\u2026",
      className: "flex-1 h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-[11.5px] text-stone-700 outline-none focus:border-teal-400 disabled:bg-stone-50 disabled:text-stone-400"
    })))));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(MpHead, {
    icon: "folder",
    title: "Dokumentumok \u2014 gy\xE1rt\xE1si rajz + verzi\xF3 + annot\xE1ci\xF3",
    sub: "A munk\xE1hoz k\xF6t\xF6tt rajzok \xE9s utas\xEDt\xE1sok. A kiad\xE1skor a bepip\xE1lt dokumentumok \u2014 az el\u0151k\xE9sz\xEDt\u0151i annot\xE1ci\xF3kkal egy\xFCtt \u2014 a m\u0171hely-feladatokra ker\xFClnek; a m\u0171hely mindig a KIADOTT verzi\xF3t futtatja. A teljes verzi\xF3kezel\xE9s a Dokumentumt\xE1r vil\xE1gban."
  }), !hasReleasedRajz && /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-3 text-[12px] text-amber-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 15,
    className: "mt-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Nincs kiadott gy\xE1rt\xE1si rajz"), " ehhez a munk\xE1hoz. Kiadhat\xF3 \xEDgy is, de a m\u0171hely nem tud biztons\xE1gosan elkezdeni \u2014 el\u0151bb add ki a rajzot a Dokumentumt\xE1rban.", /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("docs", "all"),
    className: "ml-1 underline font-medium"
  }, "Dokumentumt\xE1r megnyit\xE1sa"))), rajz.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Gy\xE1rt\xE1si rajzok"), rajz.map(d => /*#__PURE__*/React.createElement(DocRow, {
    key: d.id,
    d: d
  }))), others.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Egy\xE9b dokumentum"), others.map(d => /*#__PURE__*/React.createElement(DocRow, {
    key: d.id,
    d: d
  }))), docs.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-dashed border-stone-300 bg-white px-6 py-7 text-center text-[12.5px] text-stone-500"
  }, "Nincs a munk\xE1hoz k\xF6t\xF6tt dokumentum. Csatolj egyet a t\xE1rb\xF3l, vagy hozz l\xE9tre a Dokumentumt\xE1rban."), !released && attachable.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-stone-200 p-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Csatol\xE1s a t\xE1rb\xF3l"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("select", {
    value: attachId,
    onChange: e => setAttachId(e.target.value),
    className: "flex-1 h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-700"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "V\xE1lassz dokumentumot\u2026"), attachable.map(d => /*#__PURE__*/React.createElement("option", {
    key: d.id,
    value: d.id
  }, d.name, " (", d.id, ")"))), /*#__PURE__*/React.createElement("button", {
    onClick: attach,
    disabled: !attachId,
    className: "h-9 px-3.5 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1.5 bg-stone-900 text-white hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "Csatol"))));
}

// ════════════════════════════════════════════════════════════════════════════
//  KIADÁS — áttekintés + kiadás a műhelynek (prodTask generálás)
// ════════════════════════════════════════════════════════════════════════════
function PrepRelease({
  source,
  plan,
  setPlan,
  project,
  released
}) {
  const sim = useSim();
  const DE = window.DocsEngine;
  if (!plan) return null;
  const steps = plan.steps || [];
  const enabled = steps.filter(s => s.enabled && !s.outsource);
  const outsourced = steps.filter(s => s.enabled && s.outsource);
  const totalHours = enabled.reduce((s, x) => s + (Number(x.hours) || 0), 0);
  // folyamat-eltérések — indok nélkül a kiadás LEZÁRT
  const deviations = plan.deviations || [];
  const devMissing = deviations.filter(d => !(d.reason && d.reason.trim())).length;

  // kiadott rajz?
  const link = source.docLink || {
    type: "order",
    id: source.id
  };
  const rajz = (sim.docsFor ? sim.docsFor(link.type, link.id) : []).filter(d => d.type === "rajz");
  const hasReleasedRajz = rajz.some(d => {
    const r = DE && DE.runtimeVersion(d);
    return r && r.clear;
  });
  const docCount = (plan.docIds || []).length;

  // ── már kiadva ──
  if (released) {
    const rel = released;
    const tasks = (sim.prodTasks || []).filter(t => (rel.taskIds || []).includes(t.id));
    const stat = window.PROD_STATUS || {};
    const doneN = tasks.filter(t => t.status === "kesz").length;
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, /*#__PURE__*/React.createElement(MpHead, {
      icon: "check",
      title: "Kiadva a m\u0171helynek",
      sub: "A munka \xE1t lett adva a m\u0171helynek \u2014 az al\xE1bbi feladatok \xE9lnek a M\u0171hely-termin\xE1lban \xE9s az \xDCzemvezet\u0151n\xE9l."
    }), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-2xl border border-emerald-200 p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-emerald-50 text-emerald-600"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "factory",
      size: 22
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[14px] font-semibold text-stone-900"
    }, rel.count, " gy\xE1rt\xE1si feladat kiadva"), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-500"
    }, rel.by, " \xB7 ", rel.ts, " \xB7 ", (rel.steps || []).map(s => s.kindLabel).join(" → "))), /*#__PURE__*/React.createElement("div", {
      className: "shrink-0 text-right"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[18px] font-semibold tabular-nums text-stone-900"
    }, doneN, "/", rel.count), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] uppercase tracking-wide text-stone-400"
    }, "k\xE9sz"))), /*#__PURE__*/React.createElement("div", {
      className: "mt-3 pt-3 border-t border-stone-100 space-y-1.5"
    }, tasks.map(t => {
      const s = stat[t.status] || {};
      return /*#__PURE__*/React.createElement("div", {
        key: t.id,
        className: "flex items-center gap-2 text-[12px]"
      }, /*#__PURE__*/React.createElement("span", {
        className: `inline-flex items-center gap-1.5 rounded-full border font-medium px-2 h-5 text-[10px] ${s.pill}`
      }, /*#__PURE__*/React.createElement("span", {
        className: `w-1.5 h-1.5 rounded-full ${s.dot}`
      }), s.label), /*#__PURE__*/React.createElement("span", {
        className: "text-stone-800 truncate flex-1"
      }, t.title), /*#__PURE__*/React.createElement("span", {
        className: "font-mono text-[10.5px] text-stone-400"
      }, t.id));
    })), (rel.deviations || []).length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mt-3 pt-3 border-t border-stone-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] uppercase tracking-wide text-amber-700 font-semibold mb-1.5 inline-flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "route",
      size: 12
    }), "Napl\xF3zott folyamat-elt\xE9r\xE9sek"), /*#__PURE__*/React.createElement("div", {
      className: "space-y-1"
    }, rel.deviations.map((d, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "text-[11.5px] text-stone-600"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-medium text-stone-800"
    }, d.what), " \u2014 ", d.reason))))), /*#__PURE__*/React.createElement("div", {
      className: "grid sm:grid-cols-2 gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => window.navigateTo && window.navigateTo("shopfloor"),
      className: "h-11 px-4 rounded-xl text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 bg-teal-600 text-white hover:bg-teal-700"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "wrench",
      size: 15
    }), "M\u0171hely-termin\xE1l megnyit\xE1sa"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.navigateTo && window.navigateTo("supervisor", "dispatch"),
      className: "h-11 px-4 rounded-xl text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 bg-white text-stone-700 border border-stone-200 hover:bg-stone-50"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "workflow",
      size: 15
    }), "\xDCzemvezet\u0151 \u2014 diszp\xE9cser")), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-400 text-center"
    }, "A feladatok \xFCtemez\xE9se (g\xE9p-nap) az \xDCzemvezet\u0151 diszp\xE9cser\xE9ben t\xF6rt\xE9nik."));
  }

  // ── kiadás előtt ──
  const give = () => {
    if (!enabled.length) return;
    sim.releaseToWorkshop(source, plan);
  };
  const chips = [{
    l: "Feladat",
    v: enabled.length
  }, {
    l: "Állomás",
    v: new Set(enabled.map(s => s.machineId)).size
  }, {
    l: "Munkaóra",
    v: Math.round(totalHours * 10) / 10
  }, {
    l: "Dokumentum",
    v: docCount
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(MpHead, {
    icon: "external",
    title: "Kiad\xE1s a m\u0171helynek",
    sub: "Az \xFAtvonal bekapcsolt m\u0171veleteib\u0151l v\xE1r\xF3list\xE1s gy\xE1rt\xE1si feladatok k\xE9sz\xFClnek, a kiv\xE1lasztott dokumentumokkal. A feladatokat azonnal l\xE1tja a M\u0171hely-termin\xE1l \xE9s az \xDCzemvezet\u0151."
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-2"
  }, chips.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.l,
    className: "bg-stone-50 border border-stone-200/70 rounded-lg px-2.5 py-2 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] uppercase tracking-wide text-stone-500"
  }, c.l), /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold tabular-nums text-stone-900 leading-tight"
  }, c.v)))), !hasReleasedRajz && /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-2.5 text-[12px] text-amber-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 14,
    className: "mt-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("div", null, "Nincs kiadott gy\xE1rt\xE1si rajz \u2014 kiadhat\xF3, de a m\u0171hely figyelmeztet\xE9st kap (a feladaton \u201Enincs kiadott rajz\" jelz\xE9s).")), deviations.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: `flex items-start gap-2.5 rounded-xl px-4 py-2.5 text-[12px] border ${devMissing ? "bg-amber-50 border-amber-200/70 text-amber-800" : "bg-stone-50 border-stone-200 text-stone-600"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "route",
    size: 14,
    className: "mt-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, deviations.length, " folyamat-elt\xE9r\xE9s"), " (\xE1trendez\xE9s / alternat\xEDv g\xE9p) ker\xFCl a feladatok napl\xF3j\xE1ba.", devMissing > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, " ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, devMissing, " indok hi\xE1nyzik"), " \u2014 t\xF6ltsd ki az \xDAtvonal f\xFCl elt\xE9r\xE9s-napl\xF3j\xE1ban; addig a kiad\xE1s z\xE1rolva.") : " Minden eltérés indokolva.")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-stone-200 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/50"
  }, "L\xE9trej\xF6v\u0151 feladatok"), enabled.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-6 text-center text-[12.5px] text-stone-400"
  }, "Nincs bekapcsolt m\u0171velet az \xFAtvonalon \u2014 kapcsolj be legal\xE1bb egyet.") : enabled.map((st, i) => {
    const soft = MP_SOFT[st.accent] || "bg-stone-100 text-stone-600";
    const station = window.ProdSchedEngine && window.ProdSchedEngine.stationById(st.machineId);
    return /*#__PURE__*/React.createElement("div", {
      key: st.kind,
      className: "flex items-center gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: `shrink-0 w-6 h-6 rounded-full grid place-items-center text-[11px] font-semibold bg-teal-600 text-white`
    }, i + 1), /*#__PURE__*/React.createElement("div", {
      className: `shrink-0 w-8 h-8 rounded-lg grid place-items-center ${soft}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: st.icon,
      size: 15
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900 truncate"
    }, String(source.name || "").split("—")[0].trim(), " \u2014 ", st.kindLabel), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-400"
    }, station ? station.name : "nincs gép", " \xB7 ", st.hours, " \xF3")), /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded-full bg-stone-100 text-stone-600 text-[10.5px] font-medium"
    }, "v\xE1r\xF3lista"));
  })), outsourced.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 bg-amber-50/60 border border-amber-200/50 rounded-lg px-3 py-2"
  }, "B\xE9rmunk\xE1ra jel\xF6lve (nem ker\xFCl a m\u0171helysorba): ", outsourced.map(s => s.kindLabel).join(", "), " \u2014 a B\xE9rmunka f\xFCl\xF6n add ki partnernek."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1"
  }, "Megjegyz\xE9s a m\u0171helynek"), /*#__PURE__*/React.createElement("textarea", {
    value: plan.note || "",
    onChange: e => setPlan(p => ({
      ...p,
      note: e.target.value
    })),
    rows: 2,
    placeholder: "Priorit\xE1s, hat\xE1rid\u0151, anyag-megjegyz\xE9s\u2026",
    className: "w-full px-2.5 py-2 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-700 resize-none"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: give,
    disabled: !enabled.length || devMissing > 0,
    title: devMissing > 0 ? "Folyamat-eltérésnél indok kötelező — töltsd ki az Útvonal fül eltérés-naplóját." : undefined,
    className: "w-full h-12 rounded-xl text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 bg-teal-600 text-white hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external",
    size: 16
  }), devMissing > 0 ? "Kiadás zárolva — eltérés-indok hiányzik" : `Kiadás a műhelynek — ${enabled.length} feladat`));
}
Object.assign(window, {
  PrepRouting,
  PrepDocs,
  PrepRelease
});
})();
