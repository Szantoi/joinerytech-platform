// Page: Production — with nesting visualization
const { useState: useStateP } = React;

function NestingSVG({ plan, onPart, hover, parts }) {
  const sheet = NESTING.sheet;
  const SCALE = 0.18; // mm → px
  const W = sheet.w * SCALE;
  const H = sheet.h * SCALE;
  const usedParts = parts || NESTING.parts;
  // alternating fills using teal palette
  const fills = ["#ccfbf1", "#99f6e4", "#5eead4", "#14b8a6"];
  return (
    <svg viewBox={`0 0 ${W + 24} ${H + 36}`} style={{ width: "100%", height: "auto" }} className="block">
      {/* sheet bg with grain pattern */}
      <defs>
        <pattern id="grain" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#fafaf9" />
          <path d="M0 3 Q3 1.5 6 3" stroke="#e7e5e4" strokeWidth=".5" fill="none" />
        </pattern>
      </defs>
      <g transform="translate(12,12)">
        <rect x="0" y="0" width={W} height={H} fill="url(#grain)" stroke="#a8a29e" strokeWidth="1" />
        {/* dimensions */}
        <text x={W / 2} y={H + 16} textAnchor="middle" fontSize="9" fill="#78716c" fontFamily="ui-monospace,monospace">{sheet.w} × {sheet.h} mm</text>
        {usedParts.map((p, i) => {
          const x = p.x * SCALE;
          const y = p.y * SCALE;
          const w = p.w * SCALE;
          const h = p.h * SCALE;
          const fill = fills[i % fills.length];
          const isHover = hover === p.id;
          return (
            <g key={p.id} onMouseEnter={() => onPart(p.id)} onMouseLeave={() => onPart(null)} style={{ cursor: "pointer" }}>
              <rect x={x} y={y} width={w} height={h} fill={fill} fillOpacity={isHover ? 1 : 0.85}
                    stroke={isHover ? "#0f766e" : "#0d9488"} strokeWidth={isHover ? 1.5 : 0.75} />
              <text x={x + w / 2} y={y + h / 2 - 2} textAnchor="middle" fontSize="8.5" fill="#134e4a" fontWeight="600">{p.label}</text>
              <text x={x + w / 2} y={y + h / 2 + 9} textAnchor="middle" fontSize="7.5" fill="#0f766e" fontFamily="ui-monospace,monospace">{p.w}×{p.h}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function ProductionPage({ t, initialTab }) {
  const [tab, setTab] = useStateP(initialTab || "cutting");
  const [selectedPlan, setSelectedPlan] = useStateP(CUTTING_PLANS[0].id);
  const [hoverPart, setHoverPart] = useStateP(null);
  const [sheetIdx, setSheetIdx] = useStateP(0);

  const plan = CUTTING_PLANS.find(p => p.id === selectedPlan);
  // Build per-sheet parts: sheet 0 is the canonical NESTING.parts; rest from NESTING_SHEETS
  const sheetCount = Math.max(plan.sheets, 1);
  const getSheet = (i) => {
    if (i === 0) return { parts: NESTING.parts, util: plan.util };
    const ext = NESTING_SHEETS[i] || NESTING_SHEETS[(i % (NESTING_SHEETS.length - 1)) + 1];
    return ext;
  };
  const curSheet = getSheet(sheetIdx);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">
      {tab === "cutting" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <Card className="lg:col-span-4 p-0">
            <div className="px-4 py-3 border-b border-stone-200/80 flex items-center justify-between">
              <div className="text-[12.5px] font-semibold text-stone-900">{t.prod.cuttingPlans}</div>
              <span className="text-[10.5px] text-stone-500 tabular-nums">{CUTTING_PLANS.length}</span>
            </div>
            <div className="max-h-[640px] overflow-auto">
              {CUTTING_PLANS.map(p => {
                const active = p.id === selectedPlan;
                // Per-plan run state: deterministic but feels live
                const seed = p.id.charCodeAt(p.id.length - 1);
                const progress = p.status === "running" ? 30 + (seed * 7) % 55 : p.status === "done" ? 100 : 0;
                const runtimeMin = p.status === "running" ? 12 + (seed * 3) % 35 : p.status === "done" ? 38 + (seed * 2) % 22 : 0;
                const proof = p.status === "done";
                return (
                  <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                    className={`w-full text-left px-4 py-3 border-b border-stone-100 last:border-0 ${active ? "bg-teal-50/60" : "hover:bg-stone-50"}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11.5px] font-mono text-stone-700">{p.id}</span>
                      <span className="inline-flex items-center gap-1.5">
                        {proof && (
                          <span title="Bizonylat csatolva" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                            <Icon name="check" size={9} />proof
                          </span>
                        )}
                        <StatusPill status={p.status} label={t.status[p.status]} />
                      </span>
                    </div>
                    <div className="text-[12.5px] font-medium text-stone-900">{p.material}</div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-stone-500">
                      <span className="font-mono">{p.sheets} {t.prod.sheet}</span>
                      <span>·</span>
                      <span>{t.prod.utilization} {p.util}%</span>
                      {p.status === "running" && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-teal-700">{runtimeMin} perc futás</span>
                        </>
                      )}
                    </div>
                    {p.status === "running" && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-600 rounded-full transition-all"
                               style={{ width: `${progress}%`, boxShadow: "0 0 6px rgba(13,148,136,.4)" }} />
                        </div>
                        <span className="text-[10px] tabular-nums font-mono text-teal-700 w-9 text-right">{progress}%</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="lg:col-span-8 p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">{t.prod.nesting}</div>
                <div className="text-[15px] font-semibold text-stone-900 mt-0.5">{plan.id} · {plan.material}</div>
                <div className="text-[11.5px] text-stone-500 mt-0.5 font-mono">{plan.order} · {plan.machine} · {plan.operator}</div>
              </div>
              <div className="flex items-center gap-2">
                <GhostBtn icon="settings">Beállítások</GhostBtn>
                <PrimaryBtn icon="external">Megnyit CNC-n</PrimaryBtn>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {[
                { label: t.prod.utilization, value: `${curSheet.util}%`, tone: "text-teal-700" },
                { label: t.prod.waste, value: `${(100 - curSheet.util).toFixed(0)}%`, tone: "text-amber-700" },
                { label: t.prod.parts, value: curSheet.parts.length, tone: "text-stone-900" },
                { label: t.prod.sheet, value: `${sheetIdx + 1} / ${sheetCount}`, tone: "text-stone-900" },
              ].map((x, i) => (
                <div key={i} className="bg-stone-50 border border-stone-200/70 rounded-lg p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wide text-stone-500">{x.label}</div>
                  <div className={`text-[16px] font-semibold tabular-nums ${x.tone}`}>{x.value}</div>
                </div>
              ))}
            </div>

            <div className="bg-stone-50/40 rounded-lg border border-stone-200/70 p-3">
              <NestingSVG plan={plan} onPart={setHoverPart} hover={hoverPart} parts={curSheet.parts} />
            </div>

            {sheetCount > 1 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button onClick={() => setSheetIdx(Math.max(0, sheetIdx - 1))}
                  disabled={sheetIdx === 0}
                  className="w-7 h-7 grid place-items-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-30">
                  <Icon name="chevron" size={14} className="rotate-180" />
                </button>
                <div className="flex items-center gap-1 flex-wrap">
                  {Array.from({ length: sheetCount }, (_, i) => i).map(i => {
                    const active = i === sheetIdx;
                    const s = getSheet(i);
                    return (
                      <button key={i} onClick={() => setSheetIdx(i)}
                        title={`Tábla ${i + 1} · ${s.util}% kihasználás`}
                        className={`relative w-12 h-9 rounded-md border-2 transition overflow-hidden bg-stone-50 ${active ? "border-teal-600" : "border-stone-200 hover:border-stone-300"}`}>
                        <span className="absolute inset-0 grid place-items-center text-[10px] font-mono text-stone-600">{i + 1}</span>
                        <span className={`absolute bottom-0 left-0 h-0.5 ${active ? "bg-teal-600" : "bg-stone-300"}`} style={{ width: `${s.util}%` }} />
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setSheetIdx(Math.min(sheetCount - 1, sheetIdx + 1))}
                  disabled={sheetIdx >= sheetCount - 1}
                  className="w-7 h-7 grid place-items-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-30">
                  <Icon name="chevron" size={14} />
                </button>
                <div className="text-[10.5px] text-stone-500 font-mono ml-2">Tábla {sheetIdx + 1} / {sheetCount} · {curSheet.util}% kihasználás</div>
              </div>
            )}

            <div className="mt-3 flex items-center gap-3 text-[10.5px] text-stone-500 flex-wrap">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-teal-300" />{t.prod.parts}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: "url(#grain)", border: "1px solid #a8a29e" }} />Tábla</span>
              <span className="ml-auto font-mono">Vágási rés: 4 mm · Forgás: 90°</span>
            </div>
          </Card>
        </div>
      )}

      {tab === "machining" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { title: t.prod.edgebanding, count: 14, items: [
              { name: "CP-184-A · Bükk", op: "Nagy J.", state: "running" },
              { name: "CP-183-A · MDF", op: "Tóth K.", state: "done" },
              { name: "CP-182-A · Tölgy", op: "Kiss A.", state: "planned" },
            ]},
            { title: t.prod.cnc, count: 8, items: [
              { name: "CP-184-A · furatok", op: "Holzma CNC", state: "running" },
              { name: "CP-180-A · marás", op: "Biesse Rover", state: "done" },
              { name: "CP-182-B · csaplyuk", op: "Holzma CNC", state: "planned" },
            ]},
            { title: t.prod.qc, count: 5, items: [
              { name: "JT-2426-0180", op: "Szabó A.", state: "running" },
              { name: "JT-2426-0179", op: "Szabó A.", state: "planned" },
              { name: "JT-2426-0177", op: "Horváth É.", state: "done" },
            ]},
          ].map((col, i) => (
            <Card key={i} className="p-0">
              <div className="px-4 py-3 border-b border-stone-200/80 flex items-center justify-between">
                <div className="text-[12.5px] font-semibold text-stone-900">{col.title}</div>
                <span className="text-[10.5px] text-stone-500 tabular-nums">{col.count}</span>
              </div>
              <div className="p-2 space-y-1.5">
                {col.items.map((it, j) => (
                  <div key={j} className="bg-stone-50/60 border border-stone-200/70 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="text-[12px] font-mono text-stone-700">{it.name}</div>
                      <StatusPill status={it.state} label={t.status[it.state]} />
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] text-stone-500">
                      <Icon name="user" size={11} />
                      <span>{it.op}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

window.ProductionPage = ProductionPage;
