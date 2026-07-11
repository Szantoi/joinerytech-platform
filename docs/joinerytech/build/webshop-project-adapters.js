/* AUTO-GENERATED from webshop-project-adapters.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// webshop-project-adapters.jsx — VEVŐI PORTÁL · projekt-betekintő ADAPTEREK
//
//   ⭐ ÉSZAKI CSILLAG — domén-specifikus fülek, amik a MAG-registrybe
//   regisztrálják magukat (window.registerProjectAdapter). A MAG
//   (webshop-project.jsx) ezekről semmit nem tud — egy pékség-adapter
//   ugyanígy regisztrálna egy „Receptúra / sarzs" fület, kódváltás nélkül.
//
//     • interior  — BELSŐÉPÍTÉSZET (látványterv · helyiségek · szakág-tervek)
//     • woodwork  — FAIPARI GYÁRTÁS (anyaghasználat · vasalat · gyártási ütem)
//
//   Mindkettő a ctx-ből dolgozik (project/concept/phases/…), csak MEGOSZTHATÓ,
//   ár NÉLKÜLI tartalmat mutat. Letöltés + üzenet a közös MAG-segédekkel.
// ──────────────────────────────────────────────────────────────────────────
(function () {
  const matOf = code => (window.MATERIAL_SWATCHES || []).find(m => m.code === code);
  const handleOf = code => (window.HANDLE_CATALOG_INT || []).find(h => h.code === code);
  const tileOf = code => (window.TILE_CATALOG_INT || []).find(t => t.code === code);
  const Section = props => window.PpSection ? window.PpSection(props) : null;

  // Anyag feloldása olvasható névre (swatch + típus), ár NÉLKÜL.
  function resolveMat(code) {
    const m = matOf(code);
    if (m) return {
      name: m.name,
      kind: m.kind,
      color: m.color
    };
    if (window.sim.materialInfo) {
      const i = window.sim.materialInfo(code);
      return {
        name: i.name || code,
        kind: i.kind || "",
        color: i.color || "#e7e5e4"
      };
    }
    return {
      name: code,
      kind: "",
      color: "#e7e5e4"
    };
  }

  // ════ Belsőépítészet adapter ════════════════════════════════════════════
  function InteriorPanel(ctx) {
    const c = ctx.concept;
    const v = (c.variants || []).find(x => x.id === c.selectedVariantId) || (c.variants || [])[0];
    if (!v) return null;
    const rooms = c.rooms || [];
    const TRADE = window.INTERIOR_TRADE_META || {};
    const trades = (c.trades || []).filter(t => t.status !== "draft");
    return React.createElement("div", {
      className: "space-y-6"
    },
    // Látványterv
    React.createElement(Section, {
      title: "Látványterv",
      sub: "A tervezője által véglegesített irány",
      key: "lt"
    }, React.createElement("div", {
      className: "bg-white rounded-2xl border border-stone-200 overflow-hidden"
    }, React.createElement("div", {
      className: "h-28 flex",
      "aria-hidden": "true"
    }, (v.palette || []).map((col, i) => React.createElement("div", {
      key: i,
      className: "flex-1",
      style: {
        background: col
      }
    }))), React.createElement("div", {
      className: "p-4 md:p-5"
    }, React.createElement("div", {
      className: "text-[14px] font-semibold text-stone-900"
    }, v.label), v.summary && React.createElement("p", {
      className: "text-[12.5px] text-stone-600 mt-1 leading-snug"
    }, v.summary), React.createElement("div", {
      className: "flex items-center gap-2 mt-3 pt-3 border-t border-stone-100"
    }, React.createElement("button", {
      className: "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 text-stone-600 text-[12px] font-medium hover:bg-stone-50",
      onClick: () => window.ppDownload(`Latvanyterv_${c.id}_${v.label}`, `JoineryTech — Látványterv\n\n${c.name}\nVáltozat: ${v.label}\n${v.summary || ""}`)
    }, React.createElement(Icon, {
      name: "download",
      size: 14
    }), "Látványterv letöltése"), React.createElement("div", {
      className: "ml-auto"
    }, React.createElement(window.PpMessage, {
      customer: ctx.customer,
      refLabel: `Látványterv — ${v.label}`,
      compact: true
    })))))),
    // Helyiségek
    rooms.length > 0 && React.createElement(Section, {
      title: "Helyiségek",
      sub: `${rooms.length} helyiség · összesen ${c.area || rooms.reduce((s, r) => s + (r.area || 0), 0)} m²`,
      key: "rm"
    }, React.createElement("div", {
      className: "bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100"
    }, rooms.map(r => React.createElement("div", {
      key: r.id,
      className: "px-4 md:px-5 py-3 flex items-start gap-3"
    }, React.createElement("div", {
      className: "w-9 h-9 rounded-lg bg-teal-50 text-teal-600 grid place-items-center shrink-0"
    }, React.createElement(Icon, {
      name: "pin",
      size: 16
    })), React.createElement("div", {
      className: "min-w-0 flex-1"
    }, React.createElement("div", {
      className: "text-[13px] font-medium text-stone-800"
    }, r.name, React.createElement("span", {
      className: "text-stone-400 font-normal"
    }, r.area ? ` · ${r.area} m²` : "")), r.note && React.createElement("div", {
      className: "text-[11.5px] text-stone-500 mt-0.5"
    }, r.note)))))),
    // Szakág-tervek
    trades.length > 0 && React.createElement(Section, {
      title: "Szakág-tervek",
      sub: "Burkolás · festés · villanyszerelés",
      key: "tr"
    }, React.createElement("div", {
      className: "space-y-2.5"
    }, trades.map(t => {
      const meta = TRADE[t.trade] || {
        hu: t.trade
      };
      return React.createElement("div", {
        key: t.id,
        className: "bg-white rounded-2xl border border-stone-200 px-4 md:px-5 py-3.5 flex items-center gap-3"
      }, React.createElement("div", {
        className: "w-9 h-9 rounded-lg bg-stone-100 text-stone-500 grid place-items-center shrink-0"
      }, React.createElement(Icon, {
        name: meta.icon || "layers",
        size: 16
      })), React.createElement("div", {
        className: "min-w-0 flex-1"
      }, React.createElement("div", {
        className: "text-[13px] font-medium text-stone-800 truncate"
      }, t.title || meta.hu), React.createElement("div", {
        className: "text-[11px] text-stone-500 mt-0.5"
      }, meta.hu, t.party ? ` · ${t.party}` : "")), React.createElement("span", {
        className: "inline-flex items-center px-2 h-6 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-medium shrink-0"
      }, t.status === "in_progress" ? "Folyamatban" : "Kész"));
    }))));
  }
  window.registerProjectAdapter({
    id: "interior",
    label: "Belsőépítészet",
    icon: "sparkle",
    accent: "blue",
    applies: ctx => !!ctx.concept,
    render: ctx => React.createElement(InteriorPanel, ctx)
  });

  // ════ Faipari gyártás adapter ═════════════════════════════════════════════
  function WoodworkPanel(ctx) {
    const c = ctx.concept;
    const v = c ? (c.variants || []).find(x => x.id === c.selectedVariantId) || (c.variants || [])[0] : null;
    const phases = ctx.phases || [];

    // Anyaghasználat (korpusz + front) — a véglegesített változatból, ár nélkül
    const materials = [];
    if (v) {
      if (v.bodyMat) materials.push({
        role: "Korpusz",
        ...resolveMat(v.bodyMat)
      });
      if (v.frontMat) materials.push({
        role: "Front",
        ...resolveMat(v.frontMat)
      });
    }
    // Vasalat — fogantyú a változatból
    const hardware = [];
    if (v && v.handle) {
      const h = handleOf(v.handle);
      if (h) hardware.push({
        role: "Fogantyú",
        name: h.name,
        brand: h.brand,
        finish: h.finish,
        color: h.swatch
      });
    }
    return React.createElement("div", {
      className: "space-y-6"
    },
    // Anyaghasználat
    materials.length > 0 && React.createElement(Section, {
      title: "Anyaghasználat",
      sub: "A bútor kiviteli anyagai",
      key: "mat"
    }, React.createElement("div", {
      className: "grid sm:grid-cols-2 gap-3"
    }, materials.map((m, i) => React.createElement("div", {
      key: i,
      className: "bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3"
    }, React.createElement("div", {
      className: "w-12 h-12 rounded-xl border border-stone-200 shrink-0",
      style: {
        background: m.color
      }
    }), React.createElement("div", {
      className: "min-w-0"
    }, React.createElement("div", {
      className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium"
    }, m.role), React.createElement("div", {
      className: "text-[13px] font-semibold text-stone-800 leading-tight mt-0.5 truncate"
    }, m.name), m.kind && React.createElement("div", {
      className: "text-[11px] text-stone-500 mt-0.5"
    }, m.kind)))))),
    // Vasalat
    hardware.length > 0 && React.createElement(Section, {
      title: "Vasalat",
      sub: "Fogantyúk és funkciós vasalat",
      key: "hw"
    }, React.createElement("div", {
      className: "bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100"
    }, hardware.map((h, i) => React.createElement("div", {
      key: i,
      className: "px-4 md:px-5 py-3 flex items-center gap-3"
    }, React.createElement("div", {
      className: "w-10 h-10 rounded-lg border border-stone-200 shrink-0",
      style: {
        background: h.color || "#e7e5e4"
      }
    }), React.createElement("div", {
      className: "min-w-0 flex-1"
    }, React.createElement("div", {
      className: "text-[10px] uppercase tracking-wide text-stone-400 font-medium"
    }, h.role), React.createElement("div", {
      className: "text-[13px] font-semibold text-stone-800 leading-tight mt-0.5"
    }, h.name), React.createElement("div", {
      className: "text-[11px] text-stone-500 mt-0.5"
    }, [h.brand, h.finish].filter(Boolean).join(" · "))))))),
    // Gyártási ütemezés (HR-fázisok, név/óra nélkül)
    phases.length > 0 && React.createElement(Section, {
      title: "Gyártási ütemezés",
      sub: "A munka fázisai a műhelyben",
      key: "ph"
    }, React.createElement("div", {
      className: "bg-white rounded-2xl border border-stone-200 p-4 md:p-5"
    }, React.createElement("div", {
      className: "space-y-0"
    }, phases.map((ph, i) => {
      const last = i === phases.length - 1;
      const tone = ph.done ? "bg-teal-600 text-white" : ph.active ? "bg-amber-500 text-white" : "bg-white border-2 border-stone-200";
      return React.createElement("div", {
        key: ph.id,
        className: "flex items-start gap-3"
      }, React.createElement("div", {
        className: "flex flex-col items-center shrink-0"
      }, React.createElement("div", {
        className: `w-6 h-6 rounded-full grid place-items-center ${tone}`
      }, ph.done ? React.createElement(Icon, {
        name: "check",
        size: 13
      }) : React.createElement("span", {
        className: `w-1.5 h-1.5 rounded-full ${ph.active ? "bg-white" : "bg-stone-300"}`
      })), !last && React.createElement("div", {
        className: "w-0.5 flex-1 min-h-[18px]",
        style: {
          background: ph.done ? "#99f6e4" : "#e7e5e4"
        }
      })), React.createElement("div", {
        className: "min-w-0 flex-1 pb-3"
      }, React.createElement("div", {
        className: `text-[13px] leading-tight ${ph.done ? "text-stone-700" : ph.active ? "font-medium text-stone-900" : "text-stone-500"}`
      }, ph.label), React.createElement("div", {
        className: "text-[10.5px] text-stone-400 mt-0.5"
      }, ph.start === ph.end ? ph.start : `${ph.start} – ${ph.end}`, ph.active ? " · folyamatban" : ph.done ? " · kész" : " · tervezett")));
    })))), materials.length || hardware.length ? React.createElement("div", {
      className: "flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3"
    }, React.createElement("div", {
      className: "text-[12px] text-stone-500"
    }, "Kérdése van a kivitelről vagy az anyagokról?"), React.createElement(window.PpMessage, {
      customer: ctx.customer,
      refLabel: "Gyártás / anyagok",
      compact: true
    })) : null);
  }
  window.registerProjectAdapter({
    id: "woodwork",
    label: "Gyártás",
    icon: "factory",
    accent: "teal",
    applies: ctx => !!(ctx.concept || ctx.phases && ctx.phases.length),
    render: ctx => React.createElement(WoodworkPanel, ctx)
  });
})();
})();
