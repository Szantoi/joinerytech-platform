// Belsőépítészet világ — Szakág-tervek (burkolás / festés / villany, részletes)
// + Alaprajz (behúzható alaprajz-kép + helyiség-bontás + villany-overlay).
// A megosztott komponensek/lookupok a page-interior.jsx-ből (window) jönnek.
const { useState: useStateI2 } = React;

// Koncepció-választó chip-sor (Szakág-tervek + Alaprajz tetején) ────────────
function ConceptPicker({ value, onChange }) {
  const concepts = (useSim().concepts || []).filter((c) => c.status !== "archived");
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {concepts.map((c) => {
        const on = c.id === value;
        return (
          <button key={c.id} onClick={() => onChange(c.id)}
            className={`h-9 px-3 rounded-lg text-[12px] font-medium whitespace-nowrap border transition ${on ? "border-rose-400 bg-rose-50/70 text-stone-900" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`}>
            {c.name.split(" — ")[0]}
          </button>
        );
      })}
    </div>
  );
}

// Szakág-terv státuszléptető (FSM-lite) ─────────────────────────────────────
function TradePlanStatusControl({ concept, trade }) {
  const flow = window.TRADEPLAN_FLOW || {};
  const next = flow[trade.status] || [];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {next.map((s) => {
        const tone = (window.TRADEPLAN_TONE || {})[s] || {};
        const back = ["draft", "in_progress"].includes(s) && ["in_progress", "ready"].includes(trade.status);
        return (
          <button key={s} onClick={() => window.sim.setConceptTradeStatus(concept.id, trade.id, s)}
            className={`h-8 px-2.5 rounded-lg text-[11.5px] font-medium inline-flex items-center gap-1.5 ${back ? "border border-stone-200 text-stone-600 hover:bg-stone-50" : "bg-stone-900 text-white hover:bg-stone-700"}`}>
            <Icon name={back ? "chevron" : "chevron"} size={12} className={back ? "rotate-180" : ""} />{tone.label || s}
          </button>
        );
      })}
      {trade.status === "approved" && <span className="text-[11px] text-violet-700 inline-flex items-center gap-1"><Icon name="check" size={12} />Kivitelezésre kész</span>}
    </div>
  );
}

// ── Szakág-tervek képernyő ─────────────────────────────────────────────────
function InteriorTrades() {
  const concepts = (useSim().concepts || []).filter((c) => c.status !== "archived");
  const [cid, setCid] = useStateI2(() => (window._interiorOpen) || (concepts[0] && concepts[0].id));
  const concept = (useSim().concepts || []).find((c) => c.id === cid) || concepts[0];
  if (!concept) return <div className="px-4 md:px-7 py-6 text-stone-500 text-[13px]">Nincs koncepció.</div>;
  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-5">
      <div>
        <div className="text-[16px] font-semibold tracking-tight text-stone-900">Szakág-tervek</div>
        <div className="text-[11.5px] text-stone-500">Burkolás · festés (RAL) · villany — a belsőépítész koordinálja a kivitelező szakágakat</div>
      </div>
      <ConceptPicker value={concept.id} onChange={setCid} />
      <div className="space-y-4">
        {(concept.trades || []).map((t) => (
          <TradePlanCard key={t.id} concept={concept} trade={t} />
        ))}
      </div>
    </div>
  );
}

function TradePlanCard({ concept, trade }) {
  const meta = (window.INTERIOR_TRADE_META || {})[trade.trade] || {};
  const [planOpen, setPlanOpen] = useStateI2(false);
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-4 md:px-5 py-3.5 border-b border-stone-100 flex items-start gap-3 flex-wrap">
        <span className="w-10 h-10 rounded-xl bg-stone-900 text-white grid place-items-center shrink-0"><Icon name={meta.icon || "box"} size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[13.5px] font-semibold text-stone-900">{trade.title}</div>
            <window.TradeStatusPill status={trade.status} />
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">{meta.blurb} · {trade.party} · határidő <span className="font-mono">{trade.due}</span></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { window.sim.askAbout && window.sim.askAbout({ type: "trade", id: concept.id + ":" + trade.id, name: `${meta.hu} — ${concept.name}`, label: `${meta.hu} — ${trade.party}` }); }}
            className="h-8 px-2.5 rounded-lg border border-stone-200 text-[11.5px] text-stone-600 hover:bg-stone-50 inline-flex items-center gap-1.5"><Icon name="chat" size={13} />Felelős</button>
          <button onClick={() => setPlanOpen((o) => !o)} className="h-8 px-2.5 rounded-lg border border-stone-200 text-[11.5px] text-stone-600 hover:bg-stone-50 inline-flex items-center gap-1.5"><Icon name="camera" size={13} />Tervrajz</button>
        </div>
      </div>

      {planOpen && (
        <div className="px-4 md:px-5 py-3 border-b border-stone-100 bg-stone-50/50">
          <image-slot id={trade.planSlot} placeholder={`${meta.hu} tervrajz / vázlat behúzása`} shape="rounded" radius="12" class="block w-full" style={{ height: "200px" }}></image-slot>
        </div>
      )}

      <div className="px-4 md:px-5 py-4">
        {trade.trade === "burkolas" && <BurkolasTable trade={trade} />}
        {trade.trade === "festes" && <FestesList trade={trade} />}
        {trade.trade === "villany" && <VillanyGrid trade={trade} />}
      </div>

      <div className="px-4 md:px-5 py-3 border-t border-stone-100 bg-stone-50/40 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[11px] text-stone-500">Állapot léptetése</span>
        <TradePlanStatusControl concept={concept} trade={trade} />
      </div>
    </Card>
  );
}

// Burkolás — burkolatkiosztás táblázat ──────────────────────────────────────
function BurkolasTable({ trade }) {
  const totalArea = (trade.rooms || []).reduce((n, r) => n + (r.area || 0), 0);
  return (
    <div>
      <div className="space-y-2">
        {(trade.rooms || []).map((r, i) => {
          const tile = window.tileOf(r.tile);
          return (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-stone-100">
              <span className="w-10 h-10 rounded-lg border border-stone-200 shrink-0 relative overflow-hidden" style={{ background: tile ? tile.color : "#ddd" }}>
                {tile && <span className="absolute inset-0" style={{ backgroundImage: `linear-gradient(${tile.grout} 1px, transparent 1px), linear-gradient(90deg, ${tile.grout} 1px, transparent 1px)`, backgroundSize: "8px 8px" }} />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium text-stone-900">{r.room} <span className="text-stone-400 font-normal">· {tile ? tile.name : r.tile}</span></div>
                <div className="text-[11px] text-stone-500 truncate">{r.layout}</div>
              </div>
              <span className="text-[12px] font-mono text-stone-600 shrink-0">{r.area} m²</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100 text-[12px]">
        <span className="text-stone-500">Összes burkolandó felület</span>
        <span className="font-semibold text-stone-900 font-mono">{totalArea} m²</span>
      </div>
    </div>
  );
}

// Festés — RAL színlista ────────────────────────────────────────────────────
function FestesList({ trade }) {
  return (
    <div className="space-y-2">
      {(trade.rooms || []).map((r, i) => {
        const ral = window.ralOf(r.ral);
        return (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-stone-100">
            <span className="w-10 h-10 rounded-lg border border-stone-200 shrink-0" style={{ background: ral ? ral.color : "#ddd" }} />
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-medium text-stone-900">{r.room} <span className="text-stone-400 font-normal">· {r.surface}</span></div>
              <div className="text-[11px] text-stone-500 truncate">{r.note}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[12px] font-mono font-semibold text-stone-900">{r.ral}</div>
              <div className="text-[10px] text-stone-400">{ral ? ral.name : ""}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Villany — kapcsoló / konnektor / lámpa pozíciók ───────────────────────────
const VILLANY_TONE = {
  "Konnektor":   { bg: "bg-amber-50",   fg: "text-amber-700",   icon: "box" },
  "Kapcsoló":    { bg: "bg-sky-50",     fg: "text-sky-700",     icon: "bolt" },
  "Lámpakiállás":{ bg: "bg-violet-50",  fg: "text-violet-700",  icon: "sparkle" },
};
function VillanyGrid({ trade }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {(trade.rooms || []).map((r, i) => {
        const total = (r.points || []).reduce((n, p) => n + (p.count || 0), 0);
        return (
          <div key={i} className="rounded-xl border border-stone-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12.5px] font-semibold text-stone-900">{r.room}</div>
              <span className="text-[10.5px] font-mono text-stone-400">{total} pont</span>
            </div>
            <div className="space-y-1.5">
              {(r.points || []).map((p, j) => {
                const tone = VILLANY_TONE[p.type] || { bg: "bg-stone-100", fg: "text-stone-600", icon: "box" };
                return (
                  <div key={j} className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-md ${tone.bg} ${tone.fg} grid place-items-center shrink-0`}><Icon name={tone.icon} size={12} /></span>
                    <span className={`text-[11px] font-semibold ${tone.fg} w-7 text-center tabular-nums`}>{p.count}×</span>
                    <span className="text-[11.5px] text-stone-800 shrink-0">{p.type}</span>
                    <span className="text-[10.5px] text-stone-400 truncate flex-1">{p.note}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Alaprajz képernyő ──────────────────────────────────────────────────────
function InteriorFloorplan() {
  const concepts = (useSim().concepts || []).filter((c) => c.status !== "archived");
  const [cid, setCid] = useStateI2(() => (window._interiorOpen) || (concepts[0] && concepts[0].id));
  const concept = (useSim().concepts || []).find((c) => c.id === cid) || concepts[0];
  if (!concept) return <div className="px-4 md:px-7 py-6 text-stone-500 text-[13px]">Nincs koncepció.</div>;
  // villany összesítés helyiségenként (overlay)
  const villany = (concept.trades || []).find((t) => t.trade === "villany");
  const pointsByRoom = {};
  if (villany) (villany.rooms || []).forEach((r) => { pointsByRoom[r.room] = (r.points || []).reduce((n, p) => n + (p.count || 0), 0); });
  const totalArea = (concept.rooms || []).reduce((n, r) => n + (r.area || 0), 0) || 1;

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-5">
      <div>
        <div className="text-[16px] font-semibold tracking-tight text-stone-900">Alaprajz</div>
        <div className="text-[11.5px] text-stone-500">Behúzható alaprajz-kép és a helyiség-bontás — a koncepció a teljes teret ismeri</div>
      </div>
      <ConceptPicker value={concept.id} onChange={setCid} />

      <div className="grid lg:grid-cols-5 gap-4">
        {/* behúzható alaprajz */}
        <Card className="p-4 lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-semibold text-stone-900">Alaprajz</div>
            <span className="text-[10.5px] text-stone-400">Húzd be a tervezői alaprajzot (PDF-export kép)</span>
          </div>
          <image-slot id={concept.floorplanSlot} placeholder="Alaprajz behúzása" shape="rounded" radius="14" class="block w-full" style={{ height: "340px" }}></image-slot>
        </Card>

        {/* helyiség-bontás absztrakció + villany overlay */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <div className="text-[12px] font-semibold text-stone-900 mb-1">Helyiség-bontás</div>
            <div className="text-[10.5px] text-stone-400 mb-3">Méretarányos vázlat · villany-pontok overlay</div>
            <div className="flex flex-wrap gap-1.5">
              {(concept.rooms || []).map((r) => {
                const pts = pointsByRoom[r.name] || 0;
                const basis = Math.max(28, Math.round((r.area / totalArea) * 100));
                return (
                  <div key={r.id} className="rounded-lg border border-stone-200 bg-stone-50/70 p-2 flex flex-col justify-between" style={{ flex: `1 1 ${basis}%`, minHeight: 64 }}>
                    <div className="text-[11.5px] font-medium text-stone-900 leading-tight">{r.name}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10.5px] font-mono text-stone-500">{r.area} m²</span>
                      {pts > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700"><Icon name="bolt" size={11} />{pts}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-[12px] font-semibold text-stone-900 mb-2">Jelmagyarázat</div>
            <div className="space-y-1.5 text-[11.5px] text-stone-600">
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-amber-50 text-amber-700 grid place-items-center"><Icon name="bolt" size={11} /></span>Villany-pontok száma (kapcsoló + konnektor + lámpa)</div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-stone-100 text-stone-600 grid place-items-center font-mono text-[9px]">m²</span>Helyiség alapterülete</div>
            </div>
            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[12px]">
              <span className="text-stone-500">Teljes alapterület</span>
              <span className="font-semibold text-stone-900 font-mono">{totalArea} m²</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { InteriorTrades, InteriorFloorplan });
