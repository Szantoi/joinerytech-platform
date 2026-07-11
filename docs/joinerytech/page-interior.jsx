// Belsőépítészet / Koncepció világ — áttekintés + koncepciók (helyiségek,
// változatok A/B/C + verziók, moodboard, strukturált katalógus-választások),
// koncepcióból ajánlat. A szakág-tervek és az alaprajz a page-interior-2.jsx-ben.
const { useState: useStateI, useMemo: useMemoI } = React;

// ── Katalógus-lookupok ─────────────────────────────────────────────────────
const matOf    = (code) => (window.MATERIAL_SWATCHES || []).find((m) => m.code === code);
const handleOf = (code) => (window.HANDLE_CATALOG_INT || []).find((h) => h.code === code);
const tileOf   = (code) => (window.TILE_CATALOG_INT || []).find((t) => t.code === code);
const ralOf    = (ral)  => (window.RAL_PALETTE || []).find((r) => r.ral === ral);
const conceptOf = (id)  => (window.sim.getState().concepts || []).find((c) => c.id === id);

// ── Státusz pirulák ────────────────────────────────────────────────────────
function ConceptStatusPill({ status }) {
  const tone = (window.CONCEPT_TONE || {})[status] || { bg: "bg-stone-100", fg: "text-stone-600", dot: "bg-stone-400", label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${tone.bg} ${tone.fg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{tone.label}
    </span>
  );
}
function TradeStatusPill({ status }) {
  const tone = (window.TRADEPLAN_TONE || {})[status] || { bg: "bg-stone-100", fg: "text-stone-600", dot: "bg-stone-400", label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${tone.bg} ${tone.fg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{tone.label}
    </span>
  );
}

// ── FSM státuszléptető — engedélyezett gombok + kulcs-tiltott LEZÁRT ────────
function ConceptStatusControl({ concept }) {
  const flow = window.CONCEPT_FLOW || {};
  const next = (flow[concept.status] || { next: [] }).next;
  // a teljes lánc, hogy a tiltott (de logikus) lépést is mutathassuk lezártan
  const ORDER = ["brief", "concept", "review", "approved", "handoff"];
  const curIdx = ORDER.indexOf(concept.status);
  const forwardForbidden = ORDER.slice(curIdx + 1).filter((s) => !next.includes(s));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {next.map((s) => {
        const tone = (window.CONCEPT_TONE || {})[s] || {};
        return (
          <button key={s} onClick={() => window.sim.setConceptStatus(concept.id, s)}
            className="h-8 px-3 rounded-lg text-[12px] font-medium bg-stone-900 text-white hover:bg-stone-700 inline-flex items-center gap-1.5">
            <Icon name="chevron" size={13} />{tone.label || s}
          </button>
        );
      })}
      {concept.status === "handoff" && (
        <span className="text-[11.5px] text-violet-700 inline-flex items-center gap-1.5"><Icon name="check" size={13} />Lezárt — gyártásnak átadva</span>
      )}
      {forwardForbidden.slice(0, 1).map((s) => {
        const tone = (window.CONCEPT_TONE || {})[s] || {};
        return (
          <button key={s} disabled title="Fázis-ugrás nem engedélyezett — a köztes állapotokon kell áthaladni."
            className="h-8 px-3 rounded-lg text-[12px] font-medium bg-stone-100 text-stone-400 cursor-not-allowed inline-flex items-center gap-1.5">
            <Icon name="lock" size={12} />{tone.label || s}
          </button>
        );
      })}
      {concept.status !== "handoff" && concept.status !== "archived" && (
        <button onClick={() => window.sim.setConceptStatus(concept.id, "archived")}
          className="h-8 px-2.5 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100 inline-flex items-center gap-1.5">
          <Icon name="x" size={12} />Archivál
        </button>
      )}
    </div>
  );
}

// ── Ajánlat-indító gomb (jogosultság-kapuzva) ──────────────────────────────
function ConceptQuoteButton({ concept }) {
  const canQuote = window.sim.hasPerm("quote.create");
  const ready = window.conceptQuoteReady && window.conceptQuoteReady(concept.status);
  const fee = window.conceptFeeAmount ? window.conceptFeeAmount(concept) : 0;
  if (concept.quoteRef) {
    return (
      <button onClick={() => { window._pendingOpen = { type: "quote", id: concept.quoteRef }; window.navigateTo && window.navigateTo("sales", "quotes"); }}
        className="h-9 px-3.5 rounded-lg text-[12.5px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 inline-flex items-center gap-1.5">
        <Icon name="check" size={14} />Díj-ajánlat: {concept.quoteRef}
      </button>
    );
  }
  if (!canQuote) {
    return (
      <button disabled title="Nincs ajánlat-létrehozási jogosultság ehhez a fiókhoz."
        className="h-9 px-3.5 rounded-lg text-[12.5px] font-medium bg-stone-100 text-stone-400 cursor-not-allowed inline-flex items-center gap-1.5">
        <Icon name="lock" size={13} />Díj-ajánlat (lezárt)
      </button>
    );
  }
  const blocked = !ready || !(fee > 0);
  const why = !ready ? "Brief állapotból még nem készíthető ajánlat." : !(fee > 0) ? "Adj meg érvényes díjazást a Díjazás fülön." : "";
  // van-e már szerkeszthető (draft) ajánlat, amibe a tervezési díj beleférhet?
  // forrás: a koncepció lehetőségének (oppRef) ajánlata, VAGY bármely draft ajánlat az ügyfélhez.
  const S = window.sim.getState();
  const opp = concept.oppRef && (S.opportunities || []).find((o) => o.id === concept.oppRef);
  let targetQuote = opp && opp.quoteId && window.sim.quoteEditable(opp.quoteId) ? opp.quoteId : null;
  if (!targetQuote) {
    const draft = (S.quotes || []).find((q) => q.status === "draft" && q.customer === concept.customer);
    if (draft) targetQuote = draft.id;
  }
  const start = () => {
    if (targetQuote && window.askNextStep) {
      window.askNextStep({
        title: "Tervezési díj — hová kerüljön?",
        text: `Van már vázlat-ajánlat (${targetQuote}) ehhez az ügyfélhez. A díj abba is beleírható, vagy külön ajánlatként.`,
        options: [
          { label: `Hozzáadás a meglévő ajánlathoz (${targetQuote})`, icon: "file", primary: true, hint: "A tervezési díj a meglévő ajánlat tételei közé kerül", onClick: () => { window.sim.createQuoteFromConcept(concept.id, { targetQuoteId: targetQuote }); } },
          { label: "Külön díj-ajánlat létrehozása", icon: "plus", hint: "Önálló ajánlat csak a tervezési díjról", onClick: () => { window.sim.createQuoteFromConcept(concept.id); } },
        ],
      });
    } else {
      window.sim.createQuoteFromConcept(concept.id);
    }
  };
  return (
    <button disabled={blocked} title={why}
      onClick={start}
      className={`h-9 px-3.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 ${!blocked ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-stone-100 text-stone-400 cursor-not-allowed"}`}>
      <Icon name="briefcase" size={14} />Díj-ajánlat indítása
    </button>
  );
}

// ── Áttekintés ─────────────────────────────────────────────────────────────
function InteriorDashboard({ onScreen }) {
  const sim = useSim();
  const concepts = sim.concepts || [];
  const inReview = concepts.filter((c) => c.status === "review").length;
  const approved = concepts.filter((c) => ["approved", "handoff"].includes(c.status)).length;
  const variantsTotal = concepts.reduce((n, c) => n + (c.variants || []).length, 0);
  const stats = [
    { label: "Aktív koncepció", value: concepts.filter((c) => c.status !== "archived").length, sub: "összesen" },
    { label: "Egyeztetés alatt", value: inReview, sub: "ügyféllel" },
    { label: "Jóváhagyva", value: approved, sub: "kivitelezhető" },
    { label: "Tervváltozat", value: variantsTotal, sub: "A/B kidolgozva" },
  ];
  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-6">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-rose-300 bg-gradient-to-br from-rose-600 to-rose-500 p-4 md:p-5 flex flex-col gap-3 text-white">
          <div className="flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-xl bg-white/15 grid place-items-center shrink-0"><Icon name="sparkle" size={22} /></span>
            <div className="min-w-0 flex-1 text-[14px] font-semibold">Koncepciók</div>
          </div>
          <div className="text-[11.5px] text-rose-50/90 leading-snug flex-1">Helyiségekre bontott stílus-koncepciók · változatok &amp; verziók · moodboard · katalógus-választások</div>
          <button onClick={() => onScreen("concepts")}
            className="self-start h-9 px-4 rounded-lg bg-white text-rose-700 text-[12.5px] font-semibold hover:bg-rose-50 inline-flex items-center gap-1.5">
            <Icon name="chevron" size={14} />Megnyitás
          </button>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-4 md:p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-xl bg-stone-900 text-white grid place-items-center shrink-0"><Icon name="layers" size={20} /></span>
            <div className="min-w-0 flex-1 text-[14px] font-semibold text-stone-900">Szakág-koordináció</div>
          </div>
          <div className="text-[11.5px] text-stone-500 leading-snug flex-1">Burkolás · festés (RAL) · villany pozíciók — tervek, felelősök, határidők egy nézetben</div>
          <div className="flex gap-2">
            <button onClick={() => onScreen("trades")} className="h-9 px-3.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium hover:bg-stone-700 inline-flex items-center gap-1.5"><Icon name="layers" size={13} />Szakág-tervek</button>
            <button onClick={() => onScreen("floorplan")} className="h-9 px-3.5 rounded-lg border border-stone-200 text-stone-700 text-[12px] font-medium hover:bg-stone-50 inline-flex items-center gap-1.5"><Icon name="ruler" size={13} />Alaprajz</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">{s.label}</div>
            <div className="text-[28px] font-semibold tracking-tight text-stone-900 mt-1 tabular-nums">{s.value}</div>
            <div className="text-[10.5px] text-stone-500 mt-1">{s.sub}</div>
          </Card>
        ))}
      </div>

      <div>
        <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-3">Folyamatban lévő koncepciók</div>
        <div className="grid md:grid-cols-2 gap-3">
          {concepts.filter((c) => c.status !== "archived").map((c) => (
            <ConceptCard key={c.id} concept={c} onOpen={() => { window._interiorOpen = c.id; onScreen("concepts"); }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Koncepció kártya ───────────────────────────────────────────────────────
function ConceptCard({ concept, onOpen }) {
  const v = (concept.variants || []).find((x) => x.id === concept.selectedVariantId) || (concept.variants || [])[0];
  return (
    <button onClick={onOpen} className="text-left rounded-2xl border border-stone-200 bg-white hover:border-rose-300 hover:shadow-sm transition overflow-hidden">
      <div className="flex">
        <div className="w-2 shrink-0" style={{ background: `linear-gradient(${(v && v.palette || ["#c9a878"]).join(",")})` }} />
        <div className="flex-1 min-w-0 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-stone-900 truncate">{concept.name}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">{concept.customer} · {concept.area} m² · {(concept.rooms || []).length} helyiség</div>
            </div>
            <ConceptStatusPill status={concept.status} />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex -space-x-1">
              {(v && v.palette || []).slice(0, 4).map((col, i) => (
                <span key={i} className="w-5 h-5 rounded-full border-2 border-white" style={{ background: col }} />
              ))}
            </div>
            <span className="text-[11px] text-stone-500 truncate">{v ? `${v.label} · v${v.version}` : "—"}</span>
            <span className="flex-1" />
            <span className="text-[10.5px] font-mono text-stone-400">{(concept.variants || []).length} változat</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Beérkezett ajánlat-kérések (Értékesítéstől) — koncepció-kérés fogadó ──
function InteriorQuoteRequests({ onOpen }) {
  const sim = useSim();
  const reqs = (sim.quoteRequests || []).filter((r) => r.kind === "interior" && ["kert", "folyamatban"].includes(r.status));
  if (!reqs.length) return null;
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-2">
      <div className="text-[10.5px] uppercase tracking-wide text-rose-600 font-semibold flex items-center gap-1.5">
        <Icon name="inbox" size={12} /> Beérkezett ajánlat-kérések ({reqs.length})
      </div>
      {reqs.map((r) => {
        const st = (window.QR_STATUS || {})[r.status] || {};
        return (
          <div key={r.id} className="rounded-lg bg-white border border-rose-100 px-3 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10.5px] text-stone-400">{r.id}</span>
              <span className="text-[12px] font-medium text-stone-800">{r.customer}</span>
              <span className="text-[11px] text-stone-500">· ajánlat: <span className="font-mono">{r.quoteId}</span></span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${st.pill || ""}`}>{st.label || r.status}</span>
              <span className="flex-1" />
              {r.status === "kert" ? (
                <>
                  {(() => {
                    const briefOk = window.sim.quoteBriefReady ? window.sim.quoteBriefReady(r.quoteId) : false;
                    return (
                      <button
                        onClick={() => { const cid = window.sim.startConceptFromQuoteRequest(r.id); if (cid && onOpen) onOpen(cid); }}
                        disabled={!briefOk}
                        title={!briefOk ? "A kapcsolódó ajánlaton nincs kész tervezési brief (funkció + helyszín + stílus szükséges) — az Értékesítésben töltsd ki előbb" : "Koncepció indítása"}
                        className={`h-7 px-2.5 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 ${!briefOk ? "bg-stone-100 text-stone-400 cursor-not-allowed" : "bg-rose-600 text-white hover:bg-rose-700"}`}>
                        {!briefOk && <Icon name="lock" size={10} />}Koncepció indítása
                      </button>
                    );
                  })()}
                  <button onClick={() => { const why = window.prompt("Elutasítás indoka:"); if (why) window.sim.setQuoteRequestStatus(r.id, "elutasitva", { reason: why }); }}
                    className="h-7 px-2 rounded-md text-[11px] text-stone-500 hover:bg-stone-100">Elutasítás</button>
                </>
              ) : (
                <button onClick={() => onOpen && onOpen(r.resultRef)}
                  className="h-7 px-2.5 rounded-md text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100">{r.resultRef} →</button>
              )}
            </div>
            {r.note && <div className="mt-1 text-[11px] text-stone-500">{r.note}</div>}
            {r.status === "folyamatban" && <div className="mt-1 text-[10px] text-stone-400">A kérés automatikusan teljesül, amikor a koncepció díja / bútorsora a(z) {r.quoteId} ajánlatba kerül.</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Koncepciók — lista ↔ részletek ─────────────────────────────────────────
function InteriorConcepts() {
  const sim = useSim();
  const concepts = sim.concepts || [];
  const [openId, setOpenId] = useStateI(() => window._interiorOpen || null);
  const [creating, setCreating] = useStateI(false);
  React.useEffect(() => { if (window._interiorOpen) { setOpenId(window._interiorOpen); window._interiorOpen = null; } });
  const concept = concepts.find((c) => c.id === openId);

  if (concept) return <ConceptDetail concept={concept} onBack={() => setOpenId(null)} />;

  const active = concepts.filter((c) => c.status !== "archived");
  const archived = concepts.filter((c) => c.status === "archived");
  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[16px] font-semibold tracking-tight text-stone-900">Koncepciók</div>
          <div className="text-[11.5px] text-stone-500">Projektenkénti stílus-koncepciók — helyiségek, változatok, szakág-tervek</div>
        </div>
        <PrimaryBtn icon="plus" onClick={() => setCreating(true)}>Új koncepció</PrimaryBtn>
      </div>
      <InteriorQuoteRequests onOpen={setOpenId} />
      <div className="grid md:grid-cols-2 gap-3">
        {active.map((c) => <ConceptCard key={c.id} concept={c} onOpen={() => setOpenId(c.id)} />)}
      </div>
      {archived.length > 0 && (
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-2 mt-4">Archivált</div>
          <div className="grid md:grid-cols-2 gap-3 opacity-70">
            {archived.map((c) => <ConceptCard key={c.id} concept={c} onOpen={() => setOpenId(c.id)} />)}
          </div>
        </div>
      )}
      <SlideOver open={creating} onClose={() => setCreating(false)} title="Új koncepció" subtitle="Brief, helyiségek — a többit a részleteknél dolgozod ki" width={520}>
        {creating && window.ConceptCreateForm && <window.ConceptCreateForm onCreated={(id) => { setCreating(false); setOpenId(id); }} onClose={() => setCreating(false)} />}
      </SlideOver>
    </div>
  );
}

// ── Koncepció részletek ────────────────────────────────────────────────────
const DETAIL_TABS = [
  { key: "rooms",    hu: "Helyiségek",       icon: "ruler" },
  { key: "variants", hu: "Változatok",       icon: "sparkle" },
  { key: "items",    hu: "Tervezett tételek", icon: "box" },
  { key: "fee",      hu: "Díjazás",          icon: "briefcase" },
  { key: "trades",   hu: "Szakág-tervek",    icon: "layers" },
];
function ConceptDetail({ concept, onBack }) {
  const [tab, setTab] = useStateI("variants");
  const proj = (window.sim.getState().projects || []).find((p) => p.id === concept.projectRef);
  return (
    <div className="pb-10">
      {/* fejléc */}
      <div className="px-4 md:px-7 pt-4 md:pt-5 pb-3 border-b border-stone-200 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="text-[12px] text-stone-500 hover:text-stone-900 inline-flex items-center gap-1 mb-2"><Icon name="chevron" size={13} className="rotate-180" />Koncepciók</button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[18px] md:text-[20px] font-semibold tracking-tight text-stone-900">{concept.name}</h1>
              <ConceptStatusPill status={concept.status} />
            </div>
            <div className="text-[11.5px] text-stone-500 mt-1">
              {concept.customer} · {concept.designer} · {concept.area} m²
              {proj && <> · <button onClick={() => { window._pendingOpen = { type: "project", id: proj.id }; window.navigateTo && window.navigateTo("projects"); }} className="text-rose-700 hover:underline">{proj.id}</button></>}
            </div>
          </div>
          <div className="flex items-center gap-2"><ConceptQuoteButton concept={concept} /></div>
        </div>
        <div className="mt-3"><ConceptStatusControl concept={concept} /></div>
        {/* fülek */}
        <div className="flex items-center gap-1 mt-3 -mb-3 overflow-x-auto">
          {DETAIL_TABS.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={`h-9 px-3 rounded-t-lg text-[12.5px] font-medium inline-flex items-center gap-1.5 border-b-2 whitespace-nowrap ${tab === tb.key ? "border-rose-600 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800"}`}>
              <Icon name={tb.icon} size={14} />{tb.hu}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-7 py-5">
        {window.BriefCard && concept.forQuoteId && window.sim.quoteLevelBrief && window.sim.quoteLevelBrief(concept.forQuoteId) && (
          <div className="mb-4">
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-semibold mb-2">Tervezési brief — amit az értékesítés átadott</div>
            <window.BriefCard briefId={window.sim.quoteLevelBrief(concept.forQuoteId).id} title="Igény-brief (átgondolandó)" />
          </div>
        )}
        {tab === "rooms" && <RoomsTab concept={concept} />}
        {tab === "variants" && <VariantsTab concept={concept} />}
        {tab === "items" && window.ConceptQuoteTab && <window.ConceptQuoteTab concept={concept} />}
        {tab === "fee" && <FeeTab concept={concept} />}
        {tab === "trades" && <TradesSummaryTab concept={concept} />}
      </div>
    </div>
  );
}

// ── Helyiségek + brief ─────────────────────────────────────────────────────
function RoomsTab({ concept }) {
  const sim = useSim();
  const live = (sim.concepts || []).find((c) => c.id === concept.id) || concept;
  const rooms = live.rooms || [];
  const area = window.conceptArea ? window.conceptArea(live) : rooms.reduce((n, r) => n + (Number(r.area) || 0), 0);
  const value = window.conceptProjectValue ? window.conceptProjectValue(live) : rooms.reduce((n, r) => n + (Number(r.value) || 0), 0);
  const [editId, setEditId] = useStateI(null);
  const addRoom = () => { const id = window.sim.addConceptRoom(live.id, { name: "Új helyiség", area: 0, value: 0 }); setEditId(id); };
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="p-4 lg:col-span-1">
        <div className="text-[12px] font-semibold text-stone-900 mb-2">Brief — igényfelmérés</div>
        <p className="text-[12px] text-stone-600 leading-relaxed">{live.brief}</p>
        <div className="mt-3 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-[11.5px]">
          <div><div className="text-stone-400">Alapterület</div><div className="font-semibold text-stone-900">{area} m²</div></div>
          <div><div className="text-stone-400">Becsült érték</div><div className="font-semibold text-stone-900 tabular-nums">{fmtHUF(value)}</div></div>
        </div>
        <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-[10.5px] text-stone-500 mt-3">A helyiségenkénti <span className="font-medium text-stone-700">becsült kivitelezési érték</span> az érték-arányos tervezési díj alapja (Díjazás fül).</div>
      </Card>
      <Card className="p-0 lg:col-span-2 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <div className="text-[12px] font-semibold text-stone-900">Helyiségek <span className="text-stone-400 font-normal">· {rooms.length} db · {area} m²</span></div>
          <PrimaryBtn icon="plus" onClick={addRoom}>Helyiség</PrimaryBtn>
        </div>
        {rooms.length > 0 && (
          <div className="hidden md:grid grid-cols-[28px_minmax(0,1.6fr)_92px_minmax(0,1.2fr)_44px] gap-3 px-4 py-2 text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
            <div></div><div>Helyiség</div><div className="text-right">m²</div><div className="text-right">Becsült érték</div><div></div>
          </div>
        )}
        {rooms.map((r, i) => <RoomRow key={r.id} conceptId={live.id} room={r} idx={i} open={editId === r.id} onToggle={() => setEditId(editId === r.id ? null : r.id)} />)}
        {rooms.length === 0 && <div className="px-5 py-10 text-center text-[12px] text-stone-400">Még nincs helyiség. A „Helyiség" gombbal vehetsz fel újat.</div>}
        {rooms.length > 0 && (
          <div className="px-4 py-2.5 border-t border-stone-200 bg-stone-50/50 flex items-center justify-between text-[12px]">
            <span className="text-stone-500 font-medium">Összes becsült érték</span>
            <span className="font-semibold text-stone-900 tabular-nums">{fmtHUF(value)}</span>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Egy helyiség-sor (inline szerkesztő: név / m² / becsült érték / megjegyzés) ─
function RoomRow({ conceptId, room, idx, open, onToggle }) {
  const r = room;
  const upd = (patch) => window.sim.updateConceptRoom(conceptId, r.id, patch);
  return (
    <div className="border-b border-stone-50 last:border-0">
      <div className="hidden md:grid grid-cols-[28px_minmax(0,1.6fr)_92px_minmax(0,1.2fr)_44px] gap-3 px-4 py-2.5 items-center">
        <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 grid place-items-center text-[11px] font-semibold shrink-0">{idx + 1}</span>
        <input value={r.name} onChange={(e) => upd({ name: e.target.value })} className="h-8 px-2 rounded-lg border border-transparent hover:border-stone-200 focus:border-rose-400 text-[12.5px] font-medium text-stone-900 outline-none bg-transparent" />
        <input value={r.area} onChange={(e) => upd({ area: e.target.value.replace(/[^0-9.]/g, "") })} inputMode="decimal" className="h-8 px-2 rounded-lg border border-stone-200 text-[11.5px] tabular-nums text-right outline-none focus:border-rose-400" />
        <div className="flex items-center h-8 px-2 rounded-lg border border-stone-200 focus-within:border-rose-400">
          <span className="text-[10px] text-stone-400 pr-1">Ft</span>
          <input value={r.value || ""} onChange={(e) => upd({ value: e.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" placeholder="0" className="w-full min-w-0 text-[11.5px] tabular-nums text-right bg-transparent outline-none" />
        </div>
        <div className="flex justify-end"><button onClick={() => { if (confirm("Törlöd ezt a helyiséget?")) window.sim.removeConceptRoom(conceptId, r.id); }} className="w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="x" size={14} /></button></div>
      </div>
      <div className="hidden md:block px-4 pb-2 -mt-1">
        <input value={r.note || ""} onChange={(e) => upd({ note: e.target.value })} placeholder="Megjegyzés…" className="w-full text-[10.5px] text-stone-500 bg-transparent outline-none placeholder:text-stone-300" />
      </div>
      <div className="md:hidden px-4 py-3">
        <button onClick={onToggle} className="w-full flex items-center gap-3 text-left">
          <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 grid place-items-center text-[11px] font-semibold shrink-0">{idx + 1}</span>
          <div className="flex-1 min-w-0"><div className="text-[12.5px] font-medium text-stone-900">{r.name}</div><div className="text-[10.5px] text-stone-400">{r.area} m² · {fmtHUF(r.value || 0)}</div></div>
          <Icon name="chevron" size={15} className={`text-stone-300 shrink-0 transition ${open ? "rotate-90" : ""}`} />
        </button>
        {open && (
          <div className="mt-3 space-y-2">
            <input value={r.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Név" className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-rose-400" />
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center h-9 px-3 rounded-lg border border-stone-200 focus-within:border-rose-400"><input value={r.area} onChange={(e) => upd({ area: e.target.value.replace(/[^0-9.]/g, "") })} inputMode="decimal" className="w-full min-w-0 text-[12.5px] tabular-nums text-right bg-transparent outline-none" /><span className="text-[11px] text-stone-400 pl-1">m²</span></div>
              <div className="flex items-center h-9 px-3 rounded-lg border border-stone-200 focus-within:border-rose-400"><span className="text-[10px] text-stone-400 pr-1">Ft</span><input value={r.value || ""} onChange={(e) => upd({ value: e.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" placeholder="0" className="w-full min-w-0 text-[12.5px] tabular-nums text-right bg-transparent outline-none" /></div>
            </div>
            <input value={r.note || ""} onChange={(e) => upd({ note: e.target.value })} placeholder="Megjegyzés…" className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[11.5px] outline-none focus:border-rose-400" />
            <button onClick={() => { if (confirm("Törlöd ezt a helyiséget?")) window.sim.removeConceptRoom(conceptId, r.id); }} className="text-[11.5px] text-rose-600 inline-flex items-center gap-1"><Icon name="x" size={13} />Helyiség törlése</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DÍJAZÁS — m² / óradíj / érték-arányos / fix átalány (nincs kereskedelem) ───
function FeeTab({ concept }) {
  const sim = useSim();
  const live = (sim.concepts || []).find((c) => c.id === concept.id) || concept;
  const fee = live.fee || (window.FEE_DEFAULT ? { ...window.FEE_DEFAULT } : { method: "m2" });
  const method = fee.method || "m2";
  const methods = window.FEE_METHODS || {};
  const order = window.FEE_METHOD_ORDER || ["m2", "hourly", "value", "flat"];
  const area = window.conceptArea ? window.conceptArea(live) : 0;
  const projValue = window.conceptProjectValue ? window.conceptProjectValue(live) : 0;
  const amount = window.conceptFeeAmount ? window.conceptFeeAmount(live) : 0;
  const basis = window.conceptFeeBasis ? window.conceptFeeBasis(live) : "";
  const setFee = (patch) => window.sim.setConceptFee(live.id, patch);

  const Num = ({ label, suffix, value, onChange, placeholder }) => (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1">{label}</div>
      <div className="flex items-center h-10 px-3 rounded-lg border border-stone-200 bg-white focus-within:border-rose-400">
        <input value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder={placeholder}
          className="w-full min-w-0 text-[13px] tabular-nums bg-transparent outline-none" />
        {suffix && <span className="text-[11px] text-stone-400 pl-1.5 shrink-0">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2">Díjazás módja</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {order.map((mk) => {
              const m = methods[mk] || {};
              const on = method === mk;
              return (
                <button key={mk} onClick={() => setFee({ method: mk })}
                  className={`rounded-xl border p-3 text-left transition ${on ? "border-rose-400 bg-rose-50/60 shadow-sm" : "border-stone-200 bg-white hover:border-stone-300"}`}>
                  <span className={`w-8 h-8 rounded-lg grid place-items-center mb-2 ${on ? "bg-rose-600 text-white" : "bg-stone-100 text-stone-500"}`}><Icon name={m.icon || "box"} size={16} /></span>
                  <div className="text-[12.5px] font-semibold text-stone-900">{m.hu}</div>
                  <div className="text-[10px] text-stone-500 leading-snug mt-0.5">{m.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        <Card className="p-4">
          <div className="text-[12px] font-semibold text-stone-900 mb-3">Paraméterek</div>
          {method === "m2" && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1">Alapterület</div>
                <div className="h-10 px-3 rounded-lg border border-stone-200 bg-stone-50 flex items-center text-[13px] tabular-nums text-stone-700">{area} m² <span className="text-[10px] text-stone-400 ml-1.5">(helyiségekből)</span></div>
              </div>
              <Num label="Díjtétel" suffix="Ft / m²" value={fee.m2Rate || ""} onChange={(v) => setFee({ m2Rate: v })} placeholder="12000" />
            </div>
          )}
          {method === "hourly" && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Num label="Becsült órák" suffix="óra" value={fee.hours || ""} onChange={(v) => setFee({ hours: v })} placeholder="40" />
              <Num label="Óradíj" suffix="Ft / óra" value={fee.hourlyRate || ""} onChange={(v) => setFee({ hourlyRate: v })} placeholder="9000" />
            </div>
          )}
          {method === "value" && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1">Projektérték (helyiségek)</div>
                <div className="h-10 px-3 rounded-lg border border-stone-200 bg-stone-50 flex items-center text-[13px] tabular-nums text-stone-700">{fmtHUF(projValue)}</div>
              </div>
              <Num label="Díj-arány" suffix="%" value={fee.valuePct || ""} onChange={(v) => setFee({ valuePct: v })} placeholder="12" />
              <div className="sm:col-span-2 text-[10.5px] text-stone-400">A projektérték a helyiségenkénti becsült kivitelezési értékek összege — a Helyiségek fülön szerkeszthető.</div>
            </div>
          )}
          {method === "flat" && (
            <div className="max-w-xs">
              <Num label="Fix tervezési díj" suffix="Ft" value={fee.flatAmount || ""} onChange={(v) => setFee({ flatAmount: v })} placeholder="600000" />
            </div>
          )}
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="p-4 lg:sticky lg:top-24">
          <div className="text-[12px] font-semibold text-stone-900 mb-3">Tervezési díj</div>
          <div className="text-[28px] font-semibold tracking-tight text-stone-900 tabular-nums leading-none">{fmtHUF(amount)}</div>
          <div className="text-[11px] text-stone-500 mt-1.5">{(methods[method] || {}).hu} · {basis}</div>
          <div className="text-[10.5px] text-stone-400 mt-0.5">+ 27% ÁFA az ajánlatban</div>
          <div className="mt-4 pt-4 border-t border-stone-100">
            <div className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-2">Díj-ajánlat az Értékesítésben</div>
            <ConceptQuoteButton concept={live} />
            <div className="text-[10.5px] text-stone-400 mt-2 leading-snug">{live.quoteRef
              ? "A díj-ajánlat létrejött az Értékesítésben — ott véglegesíthető."
              : "A kiszámolt tervezési díj egy tételsorral kerül át az Értékesítésbe."}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Változatok (A/B/C) + verziók + moodboard + választások ─────────────────
function VariantsTab({ concept }) {
  const variants = concept.variants || [];
  const [activeId, setActiveId] = useStateI(concept.selectedVariantId || (variants[0] && variants[0].id));
  const v = variants.find((x) => x.id === activeId) || variants[0];
  return (
    <div className="space-y-4">
      {/* változat-választó fülek */}
      <div className="flex items-center gap-2 flex-wrap">
        {variants.map((vr) => {
          const on = vr.id === activeId;
          return (
            <button key={vr.id} onClick={() => setActiveId(vr.id)}
              className={`group relative pl-2.5 pr-3 h-10 rounded-xl border text-left inline-flex items-center gap-2.5 transition ${on ? "border-rose-400 bg-rose-50/60" : "border-stone-200 bg-white hover:border-stone-300"}`}>
              <span className="flex -space-x-1">{(vr.palette || []).slice(0, 3).map((c, i) => <span key={i} className="w-4 h-4 rounded-full border border-white" style={{ background: c }} />)}</span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-stone-900 leading-tight">{vr.label}</span>
                <span className="block text-[10px] text-stone-500 leading-tight">v{vr.version}{vr.selected ? " · kiválasztott" : ""}</span>
              </span>
              {vr.selected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
            </button>
          );
        })}
        <button onClick={() => { const id = window.sim.addConceptVariant(concept.id); if (id) setActiveId(id); }}
          className="h-10 px-3 rounded-xl border border-dashed border-stone-300 text-stone-500 hover:border-rose-300 hover:text-rose-600 text-[12px] font-medium inline-flex items-center gap-1.5">
          <Icon name="plus" size={14} />Új változat
        </button>
      </div>

      {v && <VariantEditor concept={concept} variant={v} />}
    </div>
  );
}

function VariantEditor({ concept, variant }) {
  const v = variant;
  return (
    <div className="grid lg:grid-cols-5 gap-4">
      {/* bal: moodboard */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-semibold text-stone-900">Moodboard</div>
            <span className="text-[10.5px] text-stone-400">Húzd be a látványterveket / referenciákat</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {Array.from({ length: v.moodSlots || 4 }).map((_, i) => (
              <image-slot key={i} id={`mood-${concept.id}-${v.id}-${i}`} placeholder={i === 0 ? "Fő látvány" : `Referencia ${i + 1}`}
                shape="rounded" radius="12" class="block w-full" style={{ aspectRatio: i === 0 ? "1 / 1" : "1 / 1" }}></image-slot>
            ))}
          </div>
        </Card>
        {/* paletta */}
        <Card className="p-4">
          <div className="text-[12px] font-semibold text-stone-900 mb-2.5">Színpaletta</div>
          <div className="flex items-stretch gap-2">
            {(v.palette || []).map((c, i) => (
              <div key={i} className="flex-1">
                <div className="h-14 rounded-lg border border-stone-200/70" style={{ background: c }} />
                <div className="text-[9.5px] font-mono text-stone-400 mt-1 text-center uppercase">{c}</div>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-stone-600 leading-relaxed mt-3">{v.summary || "—"}</p>
        </Card>
      </div>

      {/* jobb: strukturált választások + verzió */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-semibold text-stone-900">Strukturált választások</div>
            <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">Katalógusból</span>
          </div>
          <div className="space-y-3.5">
            <SwatchPicker label="Korpusz anyag" options={window.MATERIAL_SWATCHES} value={v.bodyMat} colorKey="color" labelKey="name"
              onPick={(o) => window.sim.setConceptVariantField(concept.id, v.id, "bodyMat", o.code)} />
            <SwatchPicker label="Front anyag" options={window.MATERIAL_SWATCHES} value={v.frontMat} colorKey="color" labelKey="name"
              onPick={(o) => window.sim.setConceptVariantField(concept.id, v.id, "frontMat", o.code)} />
            <HandlePicker concept={concept} variant={v} />
            <SwatchPicker label="Burkolat" options={window.TILE_CATALOG_INT} value={v.tile} colorKey="color" labelKey="name"
              onPick={(o) => window.sim.setConceptVariantField(concept.id, v.id, "tile", o.code)} />
            <RalPicker concept={concept} variant={v} />
          </div>
        </Card>

        {/* verziók */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[12px] font-semibold text-stone-900">Verziók</div>
            <span className="text-[11px] font-mono text-stone-400">v{v.version}</span>
          </div>
          <div className="space-y-1.5 mb-3">
            {(v.history || []).slice().reverse().map((h) => (
              <div key={h.v} className="flex items-start gap-2 text-[11.5px]">
                <span className="w-6 h-6 rounded-md bg-stone-100 text-stone-600 grid place-items-center text-[10px] font-semibold font-mono shrink-0">v{h.v}</span>
                <div className="flex-1 min-w-0"><div className="text-stone-700 leading-snug">{h.note}</div><div className="text-[10px] text-stone-400 font-mono">{h.date}</div></div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.sim.bumpConceptVariantVersion(concept.id, v.id)}
              className="flex-1 h-9 rounded-lg border border-stone-200 text-[12px] font-medium text-stone-700 hover:bg-stone-50 inline-flex items-center justify-center gap-1.5"><Icon name="plus" size={13} />Új verzió</button>
            {!v.selected && (
              <button onClick={() => window.sim.selectConceptVariant(concept.id, v.id)}
                className="flex-1 h-9 rounded-lg bg-rose-600 text-white text-[12px] font-semibold hover:bg-rose-700 inline-flex items-center justify-center gap-1.5"><Icon name="check" size={13} />Ezt választom</button>
            )}
            {v.selected && <span className="flex-1 h-9 rounded-lg bg-emerald-50 text-emerald-700 text-[12px] font-medium inline-flex items-center justify-center gap-1.5"><Icon name="check" size={13} />Kiválasztott változat</span>}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Általános swatch-választó (vízszintesen görgethető) ─────────────────────
function SwatchPicker({ label, options, value, onPick, colorKey, labelKey }) {
  const opts = options || [];
  const sel = opts.find((o) => o.code === value);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">{label}</div>
        <div className="text-[11px] text-stone-700 truncate max-w-[150px]">{sel ? sel[labelKey] : "—"}</div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
        {opts.map((o) => {
          const on = o.code === value;
          return (
            <button key={o.code} title={o[labelKey]} onClick={() => onPick(o)}
              className={`relative w-9 h-9 rounded-lg border-2 shrink-0 transition ${on ? "border-rose-600 shadow-sm" : "border-transparent hover:border-stone-300"}`}
              style={{ background: o[colorKey] }}>
              {on && <span className="absolute inset-0 grid place-items-center"><Icon name="check" size={13} className="text-white drop-shadow" /></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HandlePicker({ concept, variant }) {
  const opts = window.HANDLE_CATALOG_INT || [];
  const sel = handleOf(variant.handle);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Fogantyú</div>
        <div className="text-[11px] text-stone-700 truncate max-w-[150px]">{sel ? `${sel.brand} · ${fmtHUF(sel.price)}` : "—"}</div>
      </div>
      <div className="space-y-1">
        {opts.map((o) => {
          const on = o.code === variant.handle;
          return (
            <button key={o.code} onClick={() => window.sim.setConceptVariantField(concept.id, variant.id, "handle", o.code)}
              className={`w-full flex items-center gap-2.5 px-2 h-9 rounded-lg border text-left transition ${on ? "border-rose-400 bg-rose-50/50" : "border-stone-200 hover:border-stone-300"}`}>
              <span className="w-5 h-5 rounded-md border border-stone-200 shrink-0" style={{ background: o.swatch }} />
              <span className="flex-1 min-w-0 text-[11.5px] text-stone-800 truncate">{o.name}</span>
              {on && <Icon name="check" size={13} className="text-rose-600 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RalPicker({ concept, variant }) {
  const opts = window.RAL_PALETTE || [];
  const sel = ralOf(variant.paint);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Festés (RAL)</div>
        <div className="text-[11px] text-stone-700 truncate max-w-[150px]">{sel ? `${sel.ral} · ${sel.name}` : "—"}</div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
        {opts.map((o) => {
          const on = o.ral === variant.paint;
          return (
            <button key={o.ral} title={`${o.ral} — ${o.name}`} onClick={() => window.sim.setConceptVariantField(concept.id, variant.id, "paint", o.ral)}
              className={`relative w-9 h-9 rounded-lg border-2 shrink-0 transition ${on ? "border-rose-600 shadow-sm" : "border-stone-200 hover:border-stone-300"}`}
              style={{ background: o.color }}>
              {on && <span className="absolute inset-0 grid place-items-center"><Icon name="check" size={13} className="drop-shadow" style={{ color: o.color === "#f1f0ea" || o.color === "#f4f6f6" ? "#44403c" : "#fff" }} /></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Szakág-tervek összefoglaló (a koncepción belül) ────────────────────────
function TradesSummaryTab({ concept }) {
  const trades = concept.trades || [];
  return (
    <div className="space-y-3">
      <div className="text-[11.5px] text-stone-500">A részletes szakág-tervek (burkolatkiosztás, RAL színek, villany pozíciók) a <span className="font-medium text-stone-700">Szakág-tervek</span> képernyőn szerkeszthetők. Itt a koncepcióhoz tartozó tervek állapota látszik.</div>
      <div className="grid md:grid-cols-3 gap-3">
        {trades.map((t) => {
          const meta = (window.INTERIOR_TRADE_META || {})[t.trade] || {};
          return (
            <Card key={t.id} className="p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-8 h-8 rounded-lg bg-stone-900 text-white grid place-items-center shrink-0"><Icon name={meta.icon || "box"} size={15} /></span>
                <div className="min-w-0 flex-1"><div className="text-[12.5px] font-semibold text-stone-900 truncate">{meta.hu || t.trade}</div><div className="text-[10.5px] text-stone-500 truncate">{t.party}</div></div>
              </div>
              <div className="flex items-center justify-between">
                <TradeStatusPill status={t.status} />
                <span className="text-[10.5px] font-mono text-stone-400">{t.due}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, {
  InteriorDashboard, InteriorConcepts, ConceptStatusPill, TradeStatusPill, ConceptQuoteButton,
  matOf, handleOf, tileOf, ralOf, conceptOf,
});
