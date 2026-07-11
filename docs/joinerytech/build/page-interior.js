/* AUTO-GENERATED from page-interior.jsx — NE SZERKESZD */
(function(){
// Belsőépítészet / Koncepció világ — áttekintés + koncepciók (helyiségek,
// változatok A/B/C + verziók, moodboard, strukturált katalógus-választások),
// koncepcióból ajánlat. A szakág-tervek és az alaprajz a page-interior-2.jsx-ben.
const {
  useState: useStateI,
  useMemo: useMemoI
} = React;

// ── Katalógus-lookupok ─────────────────────────────────────────────────────
const matOf = code => (window.MATERIAL_SWATCHES || []).find(m => m.code === code);
const handleOf = code => (window.HANDLE_CATALOG_INT || []).find(h => h.code === code);
const tileOf = code => (window.TILE_CATALOG_INT || []).find(t => t.code === code);
const ralOf = ral => (window.RAL_PALETTE || []).find(r => r.ral === ral);
const conceptOf = id => (window.sim.getState().concepts || []).find(c => c.id === id);

// ── Státusz pirulák ────────────────────────────────────────────────────────
function ConceptStatusPill({
  status
}) {
  const tone = (window.CONCEPT_TONE || {})[status] || {
    bg: "bg-stone-100",
    fg: "text-stone-600",
    dot: "bg-stone-400",
    label: status
  };
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${tone.bg} ${tone.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
  }), tone.label);
}
function TradeStatusPill({
  status
}) {
  const tone = (window.TRADEPLAN_TONE || {})[status] || {
    bg: "bg-stone-100",
    fg: "text-stone-600",
    dot: "bg-stone-400",
    label: status
  };
  return /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${tone.bg} ${tone.fg}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${tone.dot}`
  }), tone.label);
}

// ── FSM státuszléptető — engedélyezett gombok + kulcs-tiltott LEZÁRT ────────
function ConceptStatusControl({
  concept
}) {
  const flow = window.CONCEPT_FLOW || {};
  const next = (flow[concept.status] || {
    next: []
  }).next;
  // a teljes lánc, hogy a tiltott (de logikus) lépést is mutathassuk lezártan
  const ORDER = ["brief", "concept", "review", "approved", "handoff"];
  const curIdx = ORDER.indexOf(concept.status);
  const forwardForbidden = ORDER.slice(curIdx + 1).filter(s => !next.includes(s));
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-1.5"
  }, next.map(s => {
    const tone = (window.CONCEPT_TONE || {})[s] || {};
    return /*#__PURE__*/React.createElement("button", {
      key: s,
      onClick: () => window.sim.setConceptStatus(concept.id, s),
      className: "h-8 px-3 rounded-lg text-[12px] font-medium bg-stone-900 text-white hover:bg-stone-700 inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 13
    }), tone.label || s);
  }), concept.status === "handoff" && /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-violet-700 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  }), "Lez\xE1rt \u2014 gy\xE1rt\xE1snak \xE1tadva"), forwardForbidden.slice(0, 1).map(s => {
    const tone = (window.CONCEPT_TONE || {})[s] || {};
    return /*#__PURE__*/React.createElement("button", {
      key: s,
      disabled: true,
      title: "F\xE1zis-ugr\xE1s nem enged\xE9lyezett \u2014 a k\xF6ztes \xE1llapotokon kell \xE1thaladni.",
      className: "h-8 px-3 rounded-lg text-[12px] font-medium bg-stone-100 text-stone-400 cursor-not-allowed inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 12
    }), tone.label || s);
  }), concept.status !== "handoff" && concept.status !== "archived" && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.setConceptStatus(concept.id, "archived"),
    className: "h-8 px-2.5 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 12
  }), "Archiv\xE1l"));
}

// ── Ajánlat-indító gomb (jogosultság-kapuzva) ──────────────────────────────
function ConceptQuoteButton({
  concept
}) {
  const canQuote = window.sim.hasPerm("quote.create");
  const ready = window.conceptQuoteReady && window.conceptQuoteReady(concept.status);
  const fee = window.conceptFeeAmount ? window.conceptFeeAmount(concept) : 0;
  if (concept.quoteRef) {
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        window._pendingOpen = {
          type: "quote",
          id: concept.quoteRef
        };
        window.navigateTo && window.navigateTo("sales", "quotes");
      },
      className: "h-9 px-3.5 rounded-lg text-[12.5px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14
    }), "D\xEDj-aj\xE1nlat: ", concept.quoteRef);
  }
  if (!canQuote) {
    return /*#__PURE__*/React.createElement("button", {
      disabled: true,
      title: "Nincs aj\xE1nlat-l\xE9trehoz\xE1si jogosults\xE1g ehhez a fi\xF3khoz.",
      className: "h-9 px-3.5 rounded-lg text-[12.5px] font-medium bg-stone-100 text-stone-400 cursor-not-allowed inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 13
    }), "D\xEDj-aj\xE1nlat (lez\xE1rt)");
  }
  const blocked = !ready || !(fee > 0);
  const why = !ready ? "Brief állapotból még nem készíthető ajánlat." : !(fee > 0) ? "Adj meg érvényes díjazást a Díjazás fülön." : "";
  // van-e már szerkeszthető (draft) ajánlat, amibe a tervezési díj beleférhet?
  // forrás: a koncepció lehetőségének (oppRef) ajánlata, VAGY bármely draft ajánlat az ügyfélhez.
  const S = window.sim.getState();
  const opp = concept.oppRef && (S.opportunities || []).find(o => o.id === concept.oppRef);
  let targetQuote = opp && opp.quoteId && window.sim.quoteEditable(opp.quoteId) ? opp.quoteId : null;
  if (!targetQuote) {
    const draft = (S.quotes || []).find(q => q.status === "draft" && q.customer === concept.customer);
    if (draft) targetQuote = draft.id;
  }
  const start = () => {
    if (targetQuote && window.askNextStep) {
      window.askNextStep({
        title: "Tervezési díj — hová kerüljön?",
        text: `Van már vázlat-ajánlat (${targetQuote}) ehhez az ügyfélhez. A díj abba is beleírható, vagy külön ajánlatként.`,
        options: [{
          label: `Hozzáadás a meglévő ajánlathoz (${targetQuote})`,
          icon: "file",
          primary: true,
          hint: "A tervezési díj a meglévő ajánlat tételei közé kerül",
          onClick: () => {
            window.sim.createQuoteFromConcept(concept.id, {
              targetQuoteId: targetQuote
            });
          }
        }, {
          label: "Külön díj-ajánlat létrehozása",
          icon: "plus",
          hint: "Önálló ajánlat csak a tervezési díjról",
          onClick: () => {
            window.sim.createQuoteFromConcept(concept.id);
          }
        }]
      });
    } else {
      window.sim.createQuoteFromConcept(concept.id);
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    disabled: blocked,
    title: why,
    onClick: start,
    className: `h-9 px-3.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 ${!blocked ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-stone-100 text-stone-400 cursor-not-allowed"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "briefcase",
    size: 14
  }), "D\xEDj-aj\xE1nlat ind\xEDt\xE1sa");
}

// ── Áttekintés ─────────────────────────────────────────────────────────────
function InteriorDashboard({
  onScreen
}) {
  const sim = useSim();
  const concepts = sim.concepts || [];
  const inReview = concepts.filter(c => c.status === "review").length;
  const approved = concepts.filter(c => ["approved", "handoff"].includes(c.status)).length;
  const variantsTotal = concepts.reduce((n, c) => n + (c.variants || []).length, 0);
  const stats = [{
    label: "Aktív koncepció",
    value: concepts.filter(c => c.status !== "archived").length,
    sub: "összesen"
  }, {
    label: "Egyeztetés alatt",
    value: inReview,
    sub: "ügyféllel"
  }, {
    label: "Jóváhagyva",
    value: approved,
    sub: "kivitelezhető"
  }, {
    label: "Tervváltozat",
    value: variantsTotal,
    sub: "A/B kidolgozva"
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-rose-300 bg-gradient-to-br from-rose-600 to-rose-500 p-4 md:p-5 flex flex-col gap-3 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-11 h-11 rounded-xl bg-white/15 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkle",
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1 text-[14px] font-semibold"
  }, "Koncepci\xF3k")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-rose-50/90 leading-snug flex-1"
  }, "Helyis\xE9gekre bontott st\xEDlus-koncepci\xF3k \xB7 v\xE1ltozatok & verzi\xF3k \xB7 moodboard \xB7 katal\xF3gus-v\xE1laszt\xE1sok"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen("concepts"),
    className: "self-start h-9 px-4 rounded-lg bg-white text-rose-700 text-[12.5px] font-semibold hover:bg-rose-50 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14
  }), "Megnyit\xE1s")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-4 md:p-5 flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-11 h-11 rounded-xl bg-stone-900 text-white grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1 text-[14px] font-semibold text-stone-900"
  }, "Szak\xE1g-koordin\xE1ci\xF3")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 leading-snug flex-1"
  }, "Burkol\xE1s \xB7 fest\xE9s (RAL) \xB7 villany poz\xEDci\xF3k \u2014 tervek, felel\u0151s\xF6k, hat\xE1rid\u0151k egy n\xE9zetben"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen("trades"),
    className: "h-9 px-3.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium hover:bg-stone-700 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 13
  }), "Szak\xE1g-tervek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen("floorplan"),
    className: "h-9 px-3.5 rounded-lg border border-stone-200 text-stone-700 text-[12px] font-medium hover:bg-stone-50 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ruler",
    size: 13
  }), "Alaprajz")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3"
  }, stats.map(s => /*#__PURE__*/React.createElement(Card, {
    key: s.label,
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, s.label), /*#__PURE__*/React.createElement("div", {
    className: "text-[28px] font-semibold tracking-tight text-stone-900 mt-1 tabular-nums"
  }, s.value), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mt-1"
  }, s.sub)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-3"
  }, "Folyamatban l\xE9v\u0151 koncepci\xF3k"), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-3"
  }, concepts.filter(c => c.status !== "archived").map(c => /*#__PURE__*/React.createElement(ConceptCard, {
    key: c.id,
    concept: c,
    onOpen: () => {
      window._interiorOpen = c.id;
      onScreen("concepts");
    }
  })))));
}

// ── Koncepció kártya ───────────────────────────────────────────────────────
function ConceptCard({
  concept,
  onOpen
}) {
  const v = (concept.variants || []).find(x => x.id === concept.selectedVariantId) || (concept.variants || [])[0];
  return /*#__PURE__*/React.createElement("button", {
    onClick: onOpen,
    className: "text-left rounded-2xl border border-stone-200 bg-white hover:border-rose-300 hover:shadow-sm transition overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-2 shrink-0",
    style: {
      background: `linear-gradient(${(v && v.palette || ["#c9a878"]).join(",")})`
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13.5px] font-semibold text-stone-900 truncate"
  }, concept.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mt-0.5"
  }, concept.customer, " \xB7 ", concept.area, " m\xB2 \xB7 ", (concept.rooms || []).length, " helyis\xE9g")), /*#__PURE__*/React.createElement(ConceptStatusPill, {
    status: concept.status
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex -space-x-1"
  }, (v && v.palette || []).slice(0, 4).map((col, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "w-5 h-5 rounded-full border-2 border-white",
    style: {
      background: col
    }
  }))), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-500 truncate"
  }, v ? `${v.label} · v${v.version}` : "—"), /*#__PURE__*/React.createElement("span", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] font-mono text-stone-400"
  }, (concept.variants || []).length, " v\xE1ltozat")))));
}

// ── Beérkezett ajánlat-kérések (Értékesítéstől) — koncepció-kérés fogadó ──
function InteriorQuoteRequests({
  onOpen
}) {
  const sim = useSim();
  const reqs = (sim.quoteRequests || []).filter(r => r.kind === "interior" && ["kert", "folyamatban"].includes(r.status));
  if (!reqs.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-rose-600 font-semibold flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "inbox",
    size: 12
  }), " Be\xE9rkezett aj\xE1nlat-k\xE9r\xE9sek (", reqs.length, ")"), reqs.map(r => {
    const st = (window.QR_STATUS || {})[r.status] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: r.id,
      className: "rounded-lg bg-white border border-rose-100 px-3 py-2"
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
    }, st.label || r.status), /*#__PURE__*/React.createElement("span", {
      className: "flex-1"
    }), r.status === "kert" ? /*#__PURE__*/React.createElement(React.Fragment, null, (() => {
      const briefOk = window.sim.quoteBriefReady ? window.sim.quoteBriefReady(r.quoteId) : false;
      return /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          const cid = window.sim.startConceptFromQuoteRequest(r.id);
          if (cid && onOpen) onOpen(cid);
        },
        disabled: !briefOk,
        title: !briefOk ? "A kapcsolódó ajánlaton nincs kész tervezési brief (funkció + helyszín + stílus szükséges) — az Értékesítésben töltsd ki előbb" : "Koncepció indítása",
        className: `h-7 px-2.5 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 ${!briefOk ? "bg-stone-100 text-stone-400 cursor-not-allowed" : "bg-rose-600 text-white hover:bg-rose-700"}`
      }, !briefOk && /*#__PURE__*/React.createElement(Icon, {
        name: "lock",
        size: 10
      }), "Koncepci\xF3 ind\xEDt\xE1sa");
    })(), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const why = window.prompt("Elutasítás indoka:");
        if (why) window.sim.setQuoteRequestStatus(r.id, "elutasitva", {
          reason: why
        });
      },
      className: "h-7 px-2 rounded-md text-[11px] text-stone-500 hover:bg-stone-100"
    }, "Elutas\xEDt\xE1s")) : /*#__PURE__*/React.createElement("button", {
      onClick: () => onOpen && onOpen(r.resultRef),
      className: "h-7 px-2.5 rounded-md text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100"
    }, r.resultRef, " \u2192")), r.note && /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-[11px] text-stone-500"
    }, r.note), r.status === "folyamatban" && /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-[10px] text-stone-400"
    }, "A k\xE9r\xE9s automatikusan teljes\xFCl, amikor a koncepci\xF3 d\xEDja / b\xFAtorsora a(z) ", r.quoteId, " aj\xE1nlatba ker\xFCl."));
  }));
}

// ── Koncepciók — lista ↔ részletek ─────────────────────────────────────────
function InteriorConcepts() {
  const sim = useSim();
  const concepts = sim.concepts || [];
  const [openId, setOpenId] = useStateI(() => window._interiorOpen || null);
  const [creating, setCreating] = useStateI(false);
  React.useEffect(() => {
    if (window._interiorOpen) {
      setOpenId(window._interiorOpen);
      window._interiorOpen = null;
    }
  });
  const concept = concepts.find(c => c.id === openId);
  if (concept) return /*#__PURE__*/React.createElement(ConceptDetail, {
    concept: concept,
    onBack: () => setOpenId(null)
  });
  const active = concepts.filter(c => c.status !== "archived");
  const archived = concepts.filter(c => c.status === "archived");
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold tracking-tight text-stone-900"
  }, "Koncepci\xF3k"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, "Projektenk\xE9nti st\xEDlus-koncepci\xF3k \u2014 helyis\xE9gek, v\xE1ltozatok, szak\xE1g-tervek")), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: () => setCreating(true)
  }, "\xDAj koncepci\xF3")), /*#__PURE__*/React.createElement(InteriorQuoteRequests, {
    onOpen: setOpenId
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-3"
  }, active.map(c => /*#__PURE__*/React.createElement(ConceptCard, {
    key: c.id,
    concept: c,
    onOpen: () => setOpenId(c.id)
  }))), archived.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-2 mt-4"
  }, "Archiv\xE1lt"), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-3 opacity-70"
  }, archived.map(c => /*#__PURE__*/React.createElement(ConceptCard, {
    key: c.id,
    concept: c,
    onOpen: () => setOpenId(c.id)
  })))), /*#__PURE__*/React.createElement(SlideOver, {
    open: creating,
    onClose: () => setCreating(false),
    title: "\xDAj koncepci\xF3",
    subtitle: "Brief, helyis\xE9gek \u2014 a t\xF6bbit a r\xE9szletekn\xE9l dolgozod ki",
    width: 520
  }, creating && window.ConceptCreateForm && /*#__PURE__*/React.createElement(window.ConceptCreateForm, {
    onCreated: id => {
      setCreating(false);
      setOpenId(id);
    },
    onClose: () => setCreating(false)
  })));
}

// ── Koncepció részletek ────────────────────────────────────────────────────
const DETAIL_TABS = [{
  key: "rooms",
  hu: "Helyiségek",
  icon: "ruler"
}, {
  key: "variants",
  hu: "Változatok",
  icon: "sparkle"
}, {
  key: "items",
  hu: "Tervezett tételek",
  icon: "box"
}, {
  key: "fee",
  hu: "Díjazás",
  icon: "briefcase"
}, {
  key: "trades",
  hu: "Szakág-tervek",
  icon: "layers"
}];
function ConceptDetail({
  concept,
  onBack
}) {
  const [tab, setTab] = useStateI("variants");
  const proj = (window.sim.getState().projects || []).find(p => p.id === concept.projectRef);
  return /*#__PURE__*/React.createElement("div", {
    className: "pb-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 pt-4 md:pt-5 pb-3 border-b border-stone-200 bg-white sticky top-0 z-10"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    className: "text-[12px] text-stone-500 hover:text-stone-900 inline-flex items-center gap-1 mb-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13,
    className: "rotate-180"
  }), "Koncepci\xF3k"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-[18px] md:text-[20px] font-semibold tracking-tight text-stone-900"
  }, concept.name), /*#__PURE__*/React.createElement(ConceptStatusPill, {
    status: concept.status
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-1"
  }, concept.customer, " \xB7 ", concept.designer, " \xB7 ", concept.area, " m\xB2", proj && /*#__PURE__*/React.createElement(React.Fragment, null, " \xB7 ", /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window._pendingOpen = {
        type: "project",
        id: proj.id
      };
      window.navigateTo && window.navigateTo("projects");
    },
    className: "text-rose-700 hover:underline"
  }, proj.id)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(ConceptQuoteButton, {
    concept: concept
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement(ConceptStatusControl, {
    concept: concept
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 mt-3 -mb-3 overflow-x-auto"
  }, DETAIL_TABS.map(tb => /*#__PURE__*/React.createElement("button", {
    key: tb.key,
    onClick: () => setTab(tb.key),
    className: `h-9 px-3 rounded-t-lg text-[12.5px] font-medium inline-flex items-center gap-1.5 border-b-2 whitespace-nowrap ${tab === tb.key ? "border-rose-600 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: tb.icon,
    size: 14
  }), tb.hu)))), /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5"
  }, window.BriefCard && concept.forQuoteId && window.sim.quoteLevelBrief && window.sim.quoteLevelBrief(concept.forQuoteId) && /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-2"
  }, "Tervez\xE9si brief \u2014 amit az \xE9rt\xE9kes\xEDt\xE9s \xE1tadott"), /*#__PURE__*/React.createElement(window.BriefCard, {
    briefId: window.sim.quoteLevelBrief(concept.forQuoteId).id,
    title: "Ig\xE9ny-brief (\xE1tgondoland\xF3)"
  })), tab === "rooms" && /*#__PURE__*/React.createElement(RoomsTab, {
    concept: concept
  }), tab === "variants" && /*#__PURE__*/React.createElement(VariantsTab, {
    concept: concept
  }), tab === "items" && window.ConceptQuoteTab && /*#__PURE__*/React.createElement(window.ConceptQuoteTab, {
    concept: concept
  }), tab === "fee" && /*#__PURE__*/React.createElement(FeeTab, {
    concept: concept
  }), tab === "trades" && /*#__PURE__*/React.createElement(TradesSummaryTab, {
    concept: concept
  })));
}

// ── Helyiségek + brief ─────────────────────────────────────────────────────
function RoomsTab({
  concept
}) {
  const sim = useSim();
  const live = (sim.concepts || []).find(c => c.id === concept.id) || concept;
  const rooms = live.rooms || [];
  const area = window.conceptArea ? window.conceptArea(live) : rooms.reduce((n, r) => n + (Number(r.area) || 0), 0);
  const value = window.conceptProjectValue ? window.conceptProjectValue(live) : rooms.reduce((n, r) => n + (Number(r.value) || 0), 0);
  const [editId, setEditId] = useStateI(null);
  const addRoom = () => {
    const id = window.sim.addConceptRoom(live.id, {
      name: "Új helyiség",
      area: 0,
      value: 0
    });
    setEditId(id);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4 lg:col-span-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-2"
  }, "Brief \u2014 ig\xE9nyfelm\xE9r\xE9s"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-stone-600 leading-relaxed"
  }, live.brief), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-400"
  }, "Alapter\xFClet"), /*#__PURE__*/React.createElement("div", {
    className: "font-semibold text-stone-900"
  }, area, " m\xB2")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-400"
  }, "Becs\xFClt \xE9rt\xE9k"), /*#__PURE__*/React.createElement("div", {
    className: "font-semibold text-stone-900 tabular-nums"
  }, fmtHUF(value)))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-[10.5px] text-stone-500 mt-3"
  }, "A helyis\xE9genk\xE9nti ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, "becs\xFClt kivitelez\xE9si \xE9rt\xE9k"), " az \xE9rt\xE9k-ar\xE1nyos tervez\xE9si d\xEDj alapja (D\xEDjaz\xE1s f\xFCl).")), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 lg:col-span-2 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900"
  }, "Helyis\xE9gek ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-normal"
  }, "\xB7 ", rooms.length, " db \xB7 ", area, " m\xB2")), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: addRoom
  }, "Helyis\xE9g")), rooms.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[28px_minmax(0,1.6fr)_92px_minmax(0,1.2fr)_44px] gap-3 px-4 py-2 text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", null, "Helyis\xE9g"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "m\xB2"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Becs\xFClt \xE9rt\xE9k"), /*#__PURE__*/React.createElement("div", null)), rooms.map((r, i) => /*#__PURE__*/React.createElement(RoomRow, {
    key: r.id,
    conceptId: live.id,
    room: r,
    idx: i,
    open: editId === r.id,
    onToggle: () => setEditId(editId === r.id ? null : r.id)
  })), rooms.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-10 text-center text-[12px] text-stone-400"
  }, "M\xE9g nincs helyis\xE9g. A \u201EHelyis\xE9g\" gombbal vehetsz fel \xFAjat."), rooms.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2.5 border-t border-stone-200 bg-stone-50/50 flex items-center justify-between text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 font-medium"
  }, "\xD6sszes becs\xFClt \xE9rt\xE9k"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-stone-900 tabular-nums"
  }, fmtHUF(value)))));
}

// ── Egy helyiség-sor (inline szerkesztő: név / m² / becsült érték / megjegyzés) ─
function RoomRow({
  conceptId,
  room,
  idx,
  open,
  onToggle
}) {
  const r = room;
  const upd = patch => window.sim.updateConceptRoom(conceptId, r.id, patch);
  return /*#__PURE__*/React.createElement("div", {
    className: "border-b border-stone-50 last:border-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[28px_minmax(0,1.6fr)_92px_minmax(0,1.2fr)_44px] gap-3 px-4 py-2.5 items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg bg-rose-50 text-rose-700 grid place-items-center text-[11px] font-semibold shrink-0"
  }, idx + 1), /*#__PURE__*/React.createElement("input", {
    value: r.name,
    onChange: e => upd({
      name: e.target.value
    }),
    className: "h-8 px-2 rounded-lg border border-transparent hover:border-stone-200 focus:border-rose-400 text-[12.5px] font-medium text-stone-900 outline-none bg-transparent"
  }), /*#__PURE__*/React.createElement("input", {
    value: r.area,
    onChange: e => upd({
      area: e.target.value.replace(/[^0-9.]/g, "")
    }),
    inputMode: "decimal",
    className: "h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] tabular-nums text-right outline-none focus:border-rose-400"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center h-8 px-2 rounded-lg border border-stone-200 focus-within:border-rose-400"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 pr-1"
  }, "Ft"), /*#__PURE__*/React.createElement("input", {
    value: r.value || "",
    onChange: e => upd({
      value: e.target.value.replace(/[^0-9]/g, "")
    }),
    inputMode: "numeric",
    placeholder: "0",
    className: "w-full min-w-0 text-[11.5px] tabular-nums text-right bg-transparent outline-none"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm("Törlöd ezt a helyiséget?")) window.sim.removeConceptRoom(conceptId, r.id);
    },
    className: "w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })))), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:block px-4 pb-2 -mt-1"
  }, /*#__PURE__*/React.createElement("input", {
    value: r.note || "",
    onChange: e => upd({
      note: e.target.value
    }),
    placeholder: "Megjegyz\xE9s\u2026",
    className: "w-full text-[10.5px] text-stone-500 bg-transparent outline-none placeholder:text-stone-300"
  })), /*#__PURE__*/React.createElement("div", {
    className: "md:hidden px-4 py-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onToggle,
    className: "w-full flex items-center gap-3 text-left"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg bg-rose-50 text-rose-700 grid place-items-center text-[11px] font-semibold shrink-0"
  }, idx + 1), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900"
  }, r.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, r.area, " m\xB2 \xB7 ", fmtHUF(r.value || 0))), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 15,
    className: `text-stone-300 shrink-0 transition ${open ? "rotate-90" : ""}`
  })), open && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: r.name,
    onChange: e => upd({
      name: e.target.value
    }),
    placeholder: "N\xE9v",
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400"
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center h-9 px-3 rounded-lg border border-stone-200 focus-within:border-rose-400"
  }, /*#__PURE__*/React.createElement("input", {
    value: r.area,
    onChange: e => upd({
      area: e.target.value.replace(/[^0-9.]/g, "")
    }),
    inputMode: "decimal",
    className: "w-full min-w-0 text-[12.5px] tabular-nums text-right bg-transparent outline-none"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400 pl-1"
  }, "m\xB2")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center h-9 px-3 rounded-lg border border-stone-200 focus-within:border-rose-400"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 pr-1"
  }, "Ft"), /*#__PURE__*/React.createElement("input", {
    value: r.value || "",
    onChange: e => upd({
      value: e.target.value.replace(/[^0-9]/g, "")
    }),
    inputMode: "numeric",
    placeholder: "0",
    className: "w-full min-w-0 text-[12.5px] tabular-nums text-right bg-transparent outline-none"
  }))), /*#__PURE__*/React.createElement("input", {
    value: r.note || "",
    onChange: e => upd({
      note: e.target.value
    }),
    placeholder: "Megjegyz\xE9s\u2026",
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[11.5px] outline-none focus:border-rose-400"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm("Törlöd ezt a helyiséget?")) window.sim.removeConceptRoom(conceptId, r.id);
    },
    className: "text-[11.5px] text-rose-600 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  }), "Helyis\xE9g t\xF6rl\xE9se"))));
}

// ── DÍJAZÁS — m² / óradíj / érték-arányos / fix átalány (nincs kereskedelem) ───
function FeeTab({
  concept
}) {
  const sim = useSim();
  const live = (sim.concepts || []).find(c => c.id === concept.id) || concept;
  const fee = live.fee || (window.FEE_DEFAULT ? {
    ...window.FEE_DEFAULT
  } : {
    method: "m2"
  });
  const method = fee.method || "m2";
  const methods = window.FEE_METHODS || {};
  const order = window.FEE_METHOD_ORDER || ["m2", "hourly", "value", "flat"];
  const area = window.conceptArea ? window.conceptArea(live) : 0;
  const projValue = window.conceptProjectValue ? window.conceptProjectValue(live) : 0;
  const amount = window.conceptFeeAmount ? window.conceptFeeAmount(live) : 0;
  const basis = window.conceptFeeBasis ? window.conceptFeeBasis(live) : "";
  const setFee = patch => window.sim.setConceptFee(live.id, patch);
  const Num = ({
    label,
    suffix,
    value,
    onChange,
    placeholder
  }) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center h-10 px-3 rounded-lg border border-stone-200 bg-white focus-within:border-rose-400"
  }, /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: e => onChange(e.target.value.replace(/[^0-9.]/g, "")),
    inputMode: "decimal",
    placeholder: placeholder,
    className: "w-full min-w-0 text-[13px] tabular-nums bg-transparent outline-none"
  }), suffix && /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400 pl-1.5 shrink-0"
  }, suffix)));
  return /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-2 space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "D\xEDjaz\xE1s m\xF3dja"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-2"
  }, order.map(mk => {
    const m = methods[mk] || {};
    const on = method === mk;
    return /*#__PURE__*/React.createElement("button", {
      key: mk,
      onClick: () => setFee({
        method: mk
      }),
      className: `rounded-xl border p-3 text-left transition ${on ? "border-rose-400 bg-rose-50/60 shadow-sm" : "border-stone-200 bg-white hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-8 h-8 rounded-lg grid place-items-center mb-2 ${on ? "bg-rose-600 text-white" : "bg-stone-100 text-stone-500"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.icon || "box",
      size: 16
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-900"
    }, m.hu), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-500 leading-snug mt-0.5"
    }, m.sub));
  }))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-3"
  }, "Param\xE9terek"), method === "m2" && /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1"
  }, "Alapter\xFClet"), /*#__PURE__*/React.createElement("div", {
    className: "h-10 px-3 rounded-lg border border-stone-200 bg-stone-50 flex items-center text-[13px] tabular-nums text-stone-700"
  }, area, " m\xB2 ", /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 ml-1.5"
  }, "(helyis\xE9gekb\u0151l)"))), /*#__PURE__*/React.createElement(Num, {
    label: "D\xEDjt\xE9tel",
    suffix: "Ft / m\xB2",
    value: fee.m2Rate || "",
    onChange: v => setFee({
      m2Rate: v
    }),
    placeholder: "12000"
  })), method === "hourly" && /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement(Num, {
    label: "Becs\xFClt \xF3r\xE1k",
    suffix: "\xF3ra",
    value: fee.hours || "",
    onChange: v => setFee({
      hours: v
    }),
    placeholder: "40"
  }), /*#__PURE__*/React.createElement(Num, {
    label: "\xD3rad\xEDj",
    suffix: "Ft / \xF3ra",
    value: fee.hourlyRate || "",
    onChange: v => setFee({
      hourlyRate: v
    }),
    placeholder: "9000"
  })), method === "value" && /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1"
  }, "Projekt\xE9rt\xE9k (helyis\xE9gek)"), /*#__PURE__*/React.createElement("div", {
    className: "h-10 px-3 rounded-lg border border-stone-200 bg-stone-50 flex items-center text-[13px] tabular-nums text-stone-700"
  }, fmtHUF(projValue))), /*#__PURE__*/React.createElement(Num, {
    label: "D\xEDj-ar\xE1ny",
    suffix: "%",
    value: fee.valuePct || "",
    onChange: v => setFee({
      valuePct: v
    }),
    placeholder: "12"
  }), /*#__PURE__*/React.createElement("div", {
    className: "sm:col-span-2 text-[10.5px] text-stone-400"
  }, "A projekt\xE9rt\xE9k a helyis\xE9genk\xE9nti becs\xFClt kivitelez\xE9si \xE9rt\xE9kek \xF6sszege \u2014 a Helyis\xE9gek f\xFCl\xF6n szerkeszthet\u0151.")), method === "flat" && /*#__PURE__*/React.createElement("div", {
    className: "max-w-xs"
  }, /*#__PURE__*/React.createElement(Num, {
    label: "Fix tervez\xE9si d\xEDj",
    suffix: "Ft",
    value: fee.flatAmount || "",
    onChange: v => setFee({
      flatAmount: v
    }),
    placeholder: "600000"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-1"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4 lg:sticky lg:top-24"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-3"
  }, "Tervez\xE9si d\xEDj"), /*#__PURE__*/React.createElement("div", {
    className: "text-[28px] font-semibold tracking-tight text-stone-900 tabular-nums leading-none"
  }, fmtHUF(amount)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 mt-1.5"
  }, (methods[method] || {}).hu, " \xB7 ", basis), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-0.5"
  }, "+ 27% \xC1FA az aj\xE1nlatban"), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-2"
  }, "D\xEDj-aj\xE1nlat az \xC9rt\xE9kes\xEDt\xE9sben"), /*#__PURE__*/React.createElement(ConceptQuoteButton, {
    concept: live
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-2 leading-snug"
  }, live.quoteRef ? "A díj-ajánlat létrejött az Értékesítésben — ott véglegesíthető." : "A kiszámolt tervezési díj egy tételsorral kerül át az Értékesítésbe.")))));
}

// ── Változatok (A/B/C) + verziók + moodboard + választások ─────────────────
function VariantsTab({
  concept
}) {
  const variants = concept.variants || [];
  const [activeId, setActiveId] = useStateI(concept.selectedVariantId || variants[0] && variants[0].id);
  const v = variants.find(x => x.id === activeId) || variants[0];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, variants.map(vr => {
    const on = vr.id === activeId;
    return /*#__PURE__*/React.createElement("button", {
      key: vr.id,
      onClick: () => setActiveId(vr.id),
      className: `group relative pl-2.5 pr-3 h-10 rounded-xl border text-left inline-flex items-center gap-2.5 transition ${on ? "border-rose-400 bg-rose-50/60" : "border-stone-200 bg-white hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "flex -space-x-1"
    }, (vr.palette || []).slice(0, 3).map((c, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "w-4 h-4 rounded-full border border-white",
      style: {
        background: c
      }
    }))), /*#__PURE__*/React.createElement("span", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block text-[12px] font-semibold text-stone-900 leading-tight"
    }, vr.label), /*#__PURE__*/React.createElement("span", {
      className: "block text-[10px] text-stone-500 leading-tight"
    }, "v", vr.version, vr.selected ? " · kiválasztott" : "")), vr.selected && /*#__PURE__*/React.createElement("span", {
      className: "w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
    }));
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const id = window.sim.addConceptVariant(concept.id);
      if (id) setActiveId(id);
    },
    className: "h-10 px-3 rounded-xl border border-dashed border-stone-300 text-stone-500 hover:border-rose-300 hover:text-rose-600 text-[12px] font-medium inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), "\xDAj v\xE1ltozat")), v && /*#__PURE__*/React.createElement(VariantEditor, {
    concept: concept,
    variant: v
  }));
}
function VariantEditor({
  concept,
  variant
}) {
  const v = variant;
  return /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-5 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-3 space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900"
  }, "Moodboard"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400"
  }, "H\xFAzd be a l\xE1tv\xE1nyterveket / referenci\xE1kat")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-3 gap-2.5"
  }, Array.from({
    length: v.moodSlots || 4
  }).map((_, i) => /*#__PURE__*/React.createElement("image-slot", {
    key: i,
    id: `mood-${concept.id}-${v.id}-${i}`,
    placeholder: i === 0 ? "Fő látvány" : `Referencia ${i + 1}`,
    shape: "rounded",
    radius: "12",
    class: "block w-full",
    style: {
      aspectRatio: i === 0 ? "1 / 1" : "1 / 1"
    }
  })))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900 mb-2.5"
  }, "Sz\xEDnpaletta"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-stretch gap-2"
  }, (v.palette || []).map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-14 rounded-lg border border-stone-200/70",
    style: {
      background: c
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] font-mono text-stone-400 mt-1 text-center uppercase"
  }, c)))), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-stone-600 leading-relaxed mt-3"
  }, v.summary || "—"))), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-2 space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900"
  }, "Struktur\xE1lt v\xE1laszt\xE1sok"), /*#__PURE__*/React.createElement("span", {
    className: "text-[9.5px] font-medium px-1.5 py-0.5 rounded bg-stone-100 text-stone-500"
  }, "Katal\xF3gusb\xF3l")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3.5"
  }, /*#__PURE__*/React.createElement(SwatchPicker, {
    label: "Korpusz anyag",
    options: window.MATERIAL_SWATCHES,
    value: v.bodyMat,
    colorKey: "color",
    labelKey: "name",
    onPick: o => window.sim.setConceptVariantField(concept.id, v.id, "bodyMat", o.code)
  }), /*#__PURE__*/React.createElement(SwatchPicker, {
    label: "Front anyag",
    options: window.MATERIAL_SWATCHES,
    value: v.frontMat,
    colorKey: "color",
    labelKey: "name",
    onPick: o => window.sim.setConceptVariantField(concept.id, v.id, "frontMat", o.code)
  }), /*#__PURE__*/React.createElement(HandlePicker, {
    concept: concept,
    variant: v
  }), /*#__PURE__*/React.createElement(SwatchPicker, {
    label: "Burkolat",
    options: window.TILE_CATALOG_INT,
    value: v.tile,
    colorKey: "color",
    labelKey: "name",
    onPick: o => window.sim.setConceptVariantField(concept.id, v.id, "tile", o.code)
  }), /*#__PURE__*/React.createElement(RalPicker, {
    concept: concept,
    variant: v
  }))), /*#__PURE__*/React.createElement(Card, {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-semibold text-stone-900"
  }, "Verzi\xF3k"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-mono text-stone-400"
  }, "v", v.version)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mb-3"
  }, (v.history || []).slice().reverse().map(h => /*#__PURE__*/React.createElement("div", {
    key: h.v,
    className: "flex items-start gap-2 text-[11.5px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-6 h-6 rounded-md bg-stone-100 text-stone-600 grid place-items-center text-[10px] font-semibold font-mono shrink-0"
  }, "v", h.v), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-700 leading-snug"
  }, h.note), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 font-mono"
  }, h.date))))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.bumpConceptVariantVersion(concept.id, v.id),
    className: "flex-1 h-9 rounded-lg border border-stone-200 text-[12px] font-medium text-stone-700 hover:bg-stone-50 inline-flex items-center justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), "\xDAj verzi\xF3"), !v.selected && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.selectConceptVariant(concept.id, v.id),
    className: "flex-1 h-9 rounded-lg bg-rose-600 text-white text-[12px] font-semibold hover:bg-rose-700 inline-flex items-center justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  }), "Ezt v\xE1lasztom"), v.selected && /*#__PURE__*/React.createElement("span", {
    className: "flex-1 h-9 rounded-lg bg-emerald-50 text-emerald-700 text-[12px] font-medium inline-flex items-center justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  }), "Kiv\xE1lasztott v\xE1ltozat")))));
}

// ── Általános swatch-választó (vízszintesen görgethető) ─────────────────────
function SwatchPicker({
  label,
  options,
  value,
  onPick,
  colorKey,
  labelKey
}) {
  const opts = options || [];
  const sel = opts.find(o => o.code === value);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-700 truncate max-w-[150px]"
  }, sel ? sel[labelKey] : "—")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5"
  }, opts.map(o => {
    const on = o.code === value;
    return /*#__PURE__*/React.createElement("button", {
      key: o.code,
      title: o[labelKey],
      onClick: () => onPick(o),
      className: `relative w-9 h-9 rounded-lg border-2 shrink-0 transition ${on ? "border-rose-600 shadow-sm" : "border-transparent hover:border-stone-300"}`,
      style: {
        background: o[colorKey]
      }
    }, on && /*#__PURE__*/React.createElement("span", {
      className: "absolute inset-0 grid place-items-center"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13,
      className: "text-white drop-shadow"
    })));
  })));
}
function HandlePicker({
  concept,
  variant
}) {
  const opts = window.HANDLE_CATALOG_INT || [];
  const sel = handleOf(variant.handle);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Foganty\xFA"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-700 truncate max-w-[150px]"
  }, sel ? `${sel.brand} · ${fmtHUF(sel.price)}` : "—")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, opts.map(o => {
    const on = o.code === variant.handle;
    return /*#__PURE__*/React.createElement("button", {
      key: o.code,
      onClick: () => window.sim.setConceptVariantField(concept.id, variant.id, "handle", o.code),
      className: `w-full flex items-center gap-2.5 px-2 h-9 rounded-lg border text-left transition ${on ? "border-rose-400 bg-rose-50/50" : "border-stone-200 hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-5 h-5 rounded-md border border-stone-200 shrink-0",
      style: {
        background: o.swatch
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "flex-1 min-w-0 text-[11.5px] text-stone-800 truncate"
    }, o.name), on && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13,
      className: "text-rose-600 shrink-0"
    }));
  })));
}
function RalPicker({
  concept,
  variant
}) {
  const opts = window.RAL_PALETTE || [];
  const sel = ralOf(variant.paint);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, "Fest\xE9s (RAL)"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-700 truncate max-w-[150px]"
  }, sel ? `${sel.ral} · ${sel.name}` : "—")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5"
  }, opts.map(o => {
    const on = o.ral === variant.paint;
    return /*#__PURE__*/React.createElement("button", {
      key: o.ral,
      title: `${o.ral} — ${o.name}`,
      onClick: () => window.sim.setConceptVariantField(concept.id, variant.id, "paint", o.ral),
      className: `relative w-9 h-9 rounded-lg border-2 shrink-0 transition ${on ? "border-rose-600 shadow-sm" : "border-stone-200 hover:border-stone-300"}`,
      style: {
        background: o.color
      }
    }, on && /*#__PURE__*/React.createElement("span", {
      className: "absolute inset-0 grid place-items-center"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13,
      className: "drop-shadow",
      style: {
        color: o.color === "#f1f0ea" || o.color === "#f4f6f6" ? "#44403c" : "#fff"
      }
    })));
  })));
}

// ── Szakág-tervek összefoglaló (a koncepción belül) ────────────────────────
function TradesSummaryTab({
  concept
}) {
  const trades = concept.trades || [];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500"
  }, "A r\xE9szletes szak\xE1g-tervek (burkolatkioszt\xE1s, RAL sz\xEDnek, villany poz\xEDci\xF3k) a ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-stone-700"
  }, "Szak\xE1g-tervek"), " k\xE9perny\u0151n szerkeszthet\u0151k. Itt a koncepci\xF3hoz tartoz\xF3 tervek \xE1llapota l\xE1tszik."), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-3 gap-3"
  }, trades.map(t => {
    const meta = (window.INTERIOR_TRADE_META || {})[t.trade] || {};
    return /*#__PURE__*/React.createElement(Card, {
      key: t.id,
      className: "p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2.5 mb-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-8 h-8 rounded-lg bg-stone-900 text-white grid place-items-center shrink-0"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: meta.icon || "box",
      size: 15
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-900 truncate"
    }, meta.hu || t.trade), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 truncate"
    }, t.party))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement(TradeStatusPill, {
      status: t.status
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] font-mono text-stone-400"
    }, t.due)));
  })));
}
Object.assign(window, {
  InteriorDashboard,
  InteriorConcepts,
  ConceptStatusPill,
  TradeStatusPill,
  ConceptQuoteButton,
  matOf,
  handleOf,
  tileOf,
  ralOf,
  conceptOf
});
})();
