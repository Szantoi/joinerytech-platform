// ──────────────────────────────────────────────────────────────────────────
// SZABÁSZAT — anyagoptimalizálás (nesting) + maradékanyag-raktár (4.7-A)
// Gyártás → Szabászat. A NestEngine (data-nesting.js) tiszta motorjára épül.
//
// Felelősség: kiadott gyártási tétel (nestJob) alkatrész-listáját TÁBLÁKRA
// optimalizálja, 2D elrendezést rajzol (rotáció + kerf), kiszámolja a
// kihozatalt és a tábla-szükségletet, ELŐSZÖR a meglévő maradékból (offcut)
// keres helyet, majd VÉGLEGESÍTÉSKOR könyvel (tábla-fogyás + maradék raktárba).
// Kereskedői belépésnél SZABÁSZAT-AJÁNLAT is generálható (nestingToQuote).
//
// Scope: minden helyi név `nz`-prefixű; Icon/Card/StatusPill/PrimaryBtn/
// GhostBtn/useSim közvetlenül (megosztott globális scope).
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateNz, useMemo: useMemoNz, useEffect: useEffectNz } = React;

const nzHuf = (n) => Math.round(Number(n) || 0).toLocaleString("hu-HU") + " Ft";
const nzPct = (x) => (x == null ? "—" : (x * 100).toFixed(1) + "%");
const nzM2 = (mm2) => (mm2 / 1e6).toFixed(2);

// Alkatrész-típusonkénti teal paletta (partIdx szerint).
const NZ_FILLS = ["#ccfbf1", "#99f6e4", "#5eead4", "#2dd4bf", "#14b8a6", "#0d9488", "#a7f3d0", "#6ee7b7"];
const NZ_STROKE = "#0f766e";
const nzFill = (i) => NZ_FILLS[i % NZ_FILLS.length];

// ──────────────────────────────────────────────────────────────────────────
// 2D elrendezés-rajz egy táblára (SVG). A szabad téglalapokat osztályozza:
// ≥ OFFCUT_MIN mindkét oldalon → maradék (amber, szaggatott), különben selejt.
// ──────────────────────────────────────────────────────────────────────────
function NzSheet({ sheet, hover, onHover }) {
  const PAD = 14;
  const MIN = (window.NestEngine ? window.NestEngine.OFFCUT_MIN : 200);
  const vbW = sheet.w + PAD * 2;
  const vbH = sheet.h + PAD * 2 + 90;
  const isOffcut = sheet.source === "offcut";
  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} style={{ width: "100%", height: "auto" }} className="block select-none">
      <defs>
        <pattern id="nzGrain" width="46" height="46" patternUnits="userSpaceOnUse">
          <rect width="46" height="46" fill={isOffcut ? "#fffbeb" : "#fafaf9"} />
          <path d="M0 23 Q23 12 46 23" stroke={isOffcut ? "#fde68a" : "#e7e5e4"} strokeWidth="2.5" fill="none" />
        </pattern>
        <pattern id="nzScrap" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="22" height="22" fill="#fff" />
          <line x1="0" y1="0" x2="0" y2="22" stroke="#e7e5e4" strokeWidth="6" />
        </pattern>
      </defs>
      <g transform={`translate(${PAD},${PAD})`}>
        {/* tábla háttér */}
        <rect x="0" y="0" width={sheet.w} height={sheet.h} fill="url(#nzGrain)"
              stroke={isOffcut ? "#d97706" : "#a8a29e"} strokeWidth={isOffcut ? 10 : 6} />
        {/* szabad téglalapok: maradék vs selejt */}
        {(sheet.free || []).map((f, i) => {
          const keep = f.w >= MIN && f.h >= MIN;
          if (keep) {
            return (
              <g key={"f" + i}>
                <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="#fef3c7" fillOpacity="0.7"
                      stroke="#d97706" strokeWidth="5" strokeDasharray="22 14" />
                {f.w > 360 && f.h > 200 && (
                  <text x={f.x + f.w / 2} y={f.y + f.h / 2} textAnchor="middle" dominantBaseline="middle"
                        fontSize="58" fill="#b45309" fontFamily="ui-monospace,monospace" fontWeight="600">
                    maradék {Math.round(f.w)}×{Math.round(f.h)}
                  </text>
                )}
              </g>
            );
          }
          return <rect key={"f" + i} x={f.x} y={f.y} width={f.w} height={f.h} fill="url(#nzScrap)" />;
        })}
        {/* alkatrészek */}
        {(sheet.placements || []).map((p, i) => {
          const isHover = hover === i;
          return (
            <g key={i} onMouseEnter={() => onHover(i)} onMouseLeave={() => onHover(null)} style={{ cursor: "pointer" }}>
              <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={nzFill(p.partIdx)} fillOpacity={isHover ? 1 : 0.92}
                    stroke={isHover ? "#0b4f47" : NZ_STROKE} strokeWidth={isHover ? 11 : 5} />
              {p.w > 200 && p.h > 120 && (
                <>
                  <text x={p.x + p.w / 2} y={p.y + p.h / 2 - 22} textAnchor="middle" dominantBaseline="middle"
                        fontSize="58" fill="#134e4a" fontWeight="700">{p.name}</text>
                  <text x={p.x + p.w / 2} y={p.y + p.h / 2 + 40} textAnchor="middle" dominantBaseline="middle"
                        fontSize="50" fill="#0f766e" fontFamily="ui-monospace,monospace">
                    {Math.round(p.w)}×{Math.round(p.h)}{p.rot ? " ⟲" : ""}
                  </text>
                </>
              )}
            </g>
          );
        })}
        {/* méret-felirat */}
        <text x={sheet.w / 2} y={sheet.h + 56} textAnchor="middle" fontSize="56" fill="#78716c" fontFamily="ui-monospace,monospace">
          {sheet.w} × {sheet.h} mm{isOffcut ? "  ·  MARADÉKBÓL" : ""}
        </text>
      </g>
    </svg>
  );
}

// ── KPI kártya ───────────────────────────────────────────────────────────
function NzKpi({ label, value, tone, sub }) {
  return (
    <div className="bg-stone-50 border border-stone-200/70 rounded-lg px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-stone-500">{label}</div>
      <div className={`text-[19px] font-semibold tabular-nums leading-tight ${tone || "text-stone-900"}`}>{value}</div>
      {sub && <div className="text-[10px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Fő komponens — Szabászat-optimalizáló
// ──────────────────────────────────────────────────────────────────────────
function CuttingOptimizer() {
  const sim = useSim();
  const E = window.NestEngine;
  const jobs = sim.nestJobList ? sim.nestJobList() : [];
  const [jobId, setJobId] = useStateNz(jobs[0] ? jobs[0].id : null);
  const job = jobs.find((j) => j.id === jobId) || jobs[0] || null;
  const [sheetIdx, setSheetIdx] = useStateNz(0);
  const [hover, setHover] = useStateNz(null);
  const [showList, setShowList] = useStateNz(false);
  const [computing, setComputing] = useStateNz(false);
  const [runToken, setRunToken] = useStateNz(0);
  const [showLabels, setShowLabels] = useStateNz(false);

  const canQuote = sim.hasPerm && sim.hasPerm("quote.create");

  // anyag-választó: Lapanyag (Tervezés) panel-anyagok (m²)
  const materials = (sim.designMaterials ? sim.designMaterials() : []).filter((m) => m.unit === "m²" || (E && E.boardSize && window.NEST_BOARD_SIZE[m.code]));

  // élő terv-számítás (futtatás-token + job + anyag + offcut-készlet)
  const plan = useMemoNz(() => {
    if (!job || !E) return null;
    const board = E.boardSize(job.material);
    const offcuts = sim.offcutStockFor ? sim.offcutStockFor(job.material) : [];
    return E.run({ parts: job.parts, board, kerf: E.KERF, offcuts });
    // eslint-disable-next-line
  }, [job && job.id, job && job.material, runToken, (sim.offcuts || []).length]);

  useEffectNz(() => { setSheetIdx(0); setHover(null); }, [job && job.id, job && job.material, runToken]);

  if (!job) {
    return <div className="px-4 md:px-7 py-10 max-w-[1400px] mx-auto text-center text-stone-500 text-[13px]">Nincs szabászati tétel.</div>;
  }

  const mi = sim.materialInfo(job.material);
  const board = E.boardSize(job.material);
  const sum = plan ? plan.summary : null;
  const boardM2 = (board.w * board.h) / 1e6;
  const boardCost = sum ? Math.round(sum.boards * boardM2 * (mi.price || 0)) : 0;
  const sheets = plan ? plan.sheets : [];
  const cur = sheets[Math.min(sheetIdx, sheets.length - 1)] || null;
  const statusMeta = (window.NEST_STATUS || {})[job.status] || window.NEST_STATUS.terv;

  const runOptim = () => {
    setComputing(true);
    setTimeout(() => { setRunToken((t) => t + 1); setComputing(false); }, 380);
  };
  const commit = () => { if (plan) sim.commitNesting(job.id, plan); };
  const makeQuote = () => { if (plan) sim.nestingToQuote(job.id, plan); };

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">
      {/* fejléc */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-teal-700 font-medium">Szabászat · anyagoptimalizálás</div>
          <h1 className="text-[20px] font-semibold text-stone-900 leading-tight mt-0.5">Nesting &amp; maradékanyag-raktár</h1>
          <p className="text-[12px] text-stone-500 mt-0.5">2D guillotine-nesting rotációval és {E.KERF} mm vágási réssel. A maradék ({E.OFFCUT_MIN}+ mm) visszakerül a raktárba és újrahasznosul.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* bal: tétel-lista */}
        <Card className="lg:col-span-3 p-0 self-start">
          <div className="px-4 py-3 border-b border-stone-200/80 flex items-center justify-between">
            <div className="text-[12.5px] font-semibold text-stone-900">Szabászati tételek</div>
            <span className="text-[10.5px] text-stone-500 tabular-nums">{jobs.length}</span>
          </div>
          <div className="max-h-[560px] overflow-auto">
            {jobs.map((j) => {
              const active = j.id === jobId;
              const sm = (window.NEST_STATUS || {})[j.status] || window.NEST_STATUS.terv;
              return (
                <button key={j.id} onClick={() => setJobId(j.id)}
                  className={`w-full text-left px-4 py-3 border-b border-stone-100 last:border-0 ${active ? "bg-teal-50/60" : "hover:bg-stone-50"}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-mono text-stone-600">{j.id}</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-medium border ${sm.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />{sm.label}
                    </span>
                  </div>
                  <div className="text-[12.5px] font-medium text-stone-900 leading-tight">{j.title}</div>
                  <div className="text-[10.5px] text-stone-500 mt-1">{j.customer}</div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-400 font-mono">
                    <span>{j.material}</span><span>·</span>
                    <span>{j.parts.reduce((s, p) => s + p.qty, 0)} db</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* fő: terv */}
        <div className="lg:col-span-9 space-y-3">
          {/* tétel-fejléc + anyag + futtatás */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono text-stone-500">{job.id}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusMeta.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />{statusMeta.label}
                  </span>
                  {job.planRef && <span className="text-[10px] font-mono text-teal-700">→ {job.planRef}</span>}
                  {job.quoteRef && <span className="text-[10px] font-mono text-indigo-600">→ {job.quoteRef}</span>}
                </div>
                <div className="text-[15px] font-semibold text-stone-900 mt-1">{job.title}</div>
                <div className="text-[11.5px] text-stone-500 mt-0.5 font-mono">{job.customer} · {job.order}</div>
                <div className="text-[11px] text-stone-400 mt-1">{job.note}</div>
              </div>
              <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                <label className="text-[10px] uppercase tracking-wide text-stone-500">Tábla-anyag</label>
                <select value={job.material} onChange={(e) => sim.setNestJobMaterial(job.id, e.target.value)}
                  className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-[12.5px] text-stone-800 min-w-[220px]">
                  {materials.map((m) => <option key={m.code} value={m.code}>{m.name} ({m.code})</option>)}
                  {!materials.find((m) => m.code === job.material) && <option value={job.material}>{job.material}</option>}
                </select>
                <div className="text-[10.5px] text-stone-400 font-mono">Tábla {board.w}×{board.h} · {nzHuf(Math.round(boardM2 * (mi.price || 0)))}/tábla</div>
                <button onClick={runOptim} disabled={computing}
                  className="inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg bg-teal-700 text-white text-[12.5px] font-medium hover:bg-teal-800 active:scale-[.99] transition shadow-sm disabled:opacity-60">
                  <Icon name={computing ? "settings" : "cut"} size={15} className={computing ? "animate-spin" : ""} />
                  {computing ? "Optimalizálás…" : "Optimalizálás futtatása"}
                </button>
              </div>
            </div>
          </Card>

          {/* eredmény-összegzés */}
          {sum && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[12.5px] font-semibold text-stone-900">Eredmény-összegzés</div>
                <button onClick={() => setShowList((v) => !v)} className="text-[11px] text-teal-700 hover:underline inline-flex items-center gap-1">
                  <Icon name="layers" size={12} />{showList ? "Vágási lista elrejtése" : "Vágási lista"}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                <NzKpi label="Tábla-szükséglet" value={sum.boards} tone="text-stone-900" sub={`${sum.totalPartCount} alkatrész`} />
                <NzKpi label="Maradékból" value={sum.offcutSheets} tone="text-amber-700" sub="újrahasznosított" />
                <NzKpi label="Kihozatal" value={nzPct(sum.yieldPct)} tone="text-teal-700" sub="anyag-kihasználás" />
                <NzKpi label="Selejt" value={nzPct(sum.scrapPct)} tone="text-rose-600" sub={`${nzM2(sum.scrapArea)} m²`} />
                <NzKpi label="Új maradék" value={sum.newOffcuts.length} tone="text-amber-700" sub={`${nzM2(sum.newOffcutArea)} m² raktárba`} />
                <NzKpi label="Becsült anyag" value={nzHuf(boardCost)} tone="text-stone-900" sub={`${sum.boards} × tábla`} />
              </div>
              {sum.unplaced && plan.unplaced.length > 0 && (
                <div className="mt-2 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  ⚠️ {plan.unplaced.length} alkatrész nem fér rá a táblára (túl nagy) — ellenőrizd a méreteket.
                </div>
              )}

              {/* vágási lista */}
              {showList && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-200">
                        <th className="py-1.5 pr-3">Alkatrész</th>
                        <th className="py-1.5 px-2 text-right">Méret (mm)</th>
                        <th className="py-1.5 px-2 text-right">Db</th>
                        <th className="py-1.5 px-2 text-right">m²/db</th>
                        <th className="py-1.5 px-2 text-center">Forgatható</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.parts.map((p, i) => (
                        <tr key={i} className="border-b border-stone-100 last:border-0">
                          <td className="py-1.5 pr-3">
                            <span className="inline-flex items-center gap-2">
                              <span className="w-3 h-3 rounded-sm" style={{ background: nzFill(i), border: `1.5px solid ${NZ_STROKE}` }} />
                              <span className="text-stone-800">{p.name}</span>
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-stone-700">{p.w} × {p.h}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-stone-700">{p.qty}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-stone-500">{((p.w * p.h) / 1e6).toFixed(3)}</td>
                          <td className="py-1.5 px-2 text-center">
                            {p.rotatable !== false
                              ? <span className="text-teal-600">⟲ igen</span>
                              : <span className="text-stone-400">— szálirány</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* 2D elrendezés */}
          {cur && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <div className="text-[12.5px] font-semibold text-stone-900">2D elrendezés</div>
                <div className="flex items-center gap-3 text-[10.5px] text-stone-500 flex-wrap">
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-teal-300 border border-teal-700" />Alkatrész</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border-2 border-dashed border-amber-500 bg-amber-100" />Maradék</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: "repeating-linear-gradient(45deg,#fff,#fff 2px,#e7e5e4 2px,#e7e5e4 4px)" }} />Selejt</span>
                </div>
              </div>
              <div className={`rounded-lg border p-3 ${cur.source === "offcut" ? "border-amber-200 bg-amber-50/30" : "border-stone-200/70 bg-stone-50/40"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono text-stone-500">
                    Tábla {sheetIdx + 1} / {sheets.length}
                    {cur.source === "offcut" ? <span className="text-amber-700"> · maradékból ({cur.srcId})</span> : ""}
                  </span>
                  <span className="text-[11px] font-mono text-teal-700">{nzPct(cur.yield)} kihasználás</span>
                </div>
                <NzSheet sheet={cur} hover={hover} onHover={setHover} />
              </div>
              {sheets.length > 1 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button onClick={() => setSheetIdx(Math.max(0, sheetIdx - 1))} disabled={sheetIdx === 0}
                    className="w-7 h-7 grid place-items-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-30">
                    <Icon name="chevron" size={14} className="rotate-180" />
                  </button>
                  <div className="flex items-center gap-1 flex-wrap">
                    {sheets.map((s, i) => {
                      const active = i === sheetIdx;
                      const oc = s.source === "offcut";
                      return (
                        <button key={i} onClick={() => setSheetIdx(i)} title={`Tábla ${i + 1} · ${nzPct(s.yield)}${oc ? " · maradékból" : ""}`}
                          className={`relative w-12 h-9 rounded-md border-2 overflow-hidden ${active ? (oc ? "border-amber-500" : "border-teal-600") : "border-stone-200 hover:border-stone-300"} ${oc ? "bg-amber-50" : "bg-stone-50"}`}>
                          <span className="absolute inset-0 grid place-items-center text-[10px] font-mono text-stone-600">{i + 1}{oc ? "↻" : ""}</span>
                          <span className={`absolute bottom-0 left-0 h-0.5 ${oc ? "bg-amber-500" : "bg-teal-600"}`} style={{ width: `${Math.round(s.yield * 100)}%` }} />
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setSheetIdx(Math.min(sheets.length - 1, sheetIdx + 1))} disabled={sheetIdx >= sheets.length - 1}
                    className="w-7 h-7 grid place-items-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-30">
                    <Icon name="chevron" size={14} />
                  </button>
                </div>
              )}
            </Card>
          )}

          {/* akciók */}
          {sum && (
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-[11.5px] text-stone-500">
                  {job.status === "veglegesitve"
                    ? <span className="text-teal-700">✓ A terv véglegesítve — {sum.boards} tábla lefoglalva, maradék raktárba könyvelve.</span>
                    : <>Véglegesítéskor a rendszer lefoglalja a táblákat és a {sum.newOffcuts.length} maradékot a raktárba könyveli{sum.offcutSheets ? `, valamint ${sum.offcutSheets} felhasznált maradékot kivezet` : ""}.</>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <GhostBtn icon="qr" onClick={() => setShowLabels(true)}>Címkék &amp; rakatok</GhostBtn>
                  {canQuote && (
                    <GhostBtn icon="briefcase" onClick={makeQuote}>Szabászat-ajánlat</GhostBtn>
                  )}
                  <button onClick={commit} disabled={job.status === "veglegesitve"}
                    className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-teal-700 text-white text-[12.5px] font-medium hover:bg-teal-800 active:scale-[.99] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <Icon name="check" size={15} />{job.status === "veglegesitve" ? "Véglegesítve" : "Véglegesítés"}
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* maradékanyag-raktár */}
      <div className="mt-4">
        <OffcutWarehouse activeMaterial={job.material} />
      </div>

      {showLabels && plan && window.LabelSheet && (
        <window.LabelSheet plan={plan} job={job} onClose={() => setShowLabels(false)} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Maradékanyag-raktár — offcut-lotok anyag + zóna szerint
// ──────────────────────────────────────────────────────────────────────────
function OffcutWarehouse({ activeMaterial, standalone }) {
  const sim = useSim();
  const offcuts = sim.offcutList ? sim.offcutList() : [];
  const Z = window.OFFCUT_ZONES || {};
  const [zoneFilter, setZoneFilter] = useStateNz("all");

  // anyagonként csoportosítva
  const byMat = {};
  offcuts.forEach((o) => { (byMat[o.material] = byMat[o.material] || []).push(o); });
  const mats = Object.keys(byMat).sort((a, b) => (a === activeMaterial ? -1 : b === activeMaterial ? 1 : a.localeCompare(b)));

  const zoneCounts = {};
  (window.OFFCUT_ZONE_ORDER || []).forEach((z) => { zoneCounts[z] = offcuts.filter((o) => o.zone === z).reduce((s, o) => s + (Number(o.qty) || 0), 0); });
  const availArea = offcuts.filter((o) => o.zone === "available").reduce((s, o) => s + o.w * o.h * (Number(o.qty) || 0), 0);

  const visible = (list) => zoneFilter === "all" ? list : list.filter((o) => o.zone === zoneFilter);

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="box" size={15} className="text-amber-600" />
            <span className="text-[13px] font-semibold text-stone-900">Maradékanyag-raktár</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">Szabad maradék: <b className="text-amber-700">{zoneCounts.available || 0} db</b> · {nzM2(availArea)} m² · a nesting automatikusan ezt használja először.</div>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button onClick={() => setZoneFilter("all")} className={`px-2.5 h-7 rounded-md text-[11px] font-medium border ${zoneFilter === "all" ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`}>Mind</button>
          {(window.OFFCUT_ZONE_ORDER || []).map((z) => {
            const m = Z[z]; if (!m) return null;
            return (
              <button key={z} onClick={() => setZoneFilter(z)}
                className={`px-2.5 h-7 rounded-md text-[11px] font-medium border inline-flex items-center gap-1.5 ${zoneFilter === z ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}<span className="tabular-nums opacity-70">{zoneCounts[z] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {mats.length === 0 && <div className="text-[12px] text-stone-400 py-6 text-center">Nincs maradékanyag a raktárban.</div>}

      <div className="space-y-3">
        {mats.map((code) => {
          const list = visible(byMat[code]);
          if (!list.length) return null;
          const mi = sim.materialInfo(code);
          const isActive = code === activeMaterial;
          return (
            <div key={code} className={`rounded-lg border ${isActive ? "border-amber-200 bg-amber-50/30" : "border-stone-200/70"}`}>
              <div className="px-3 py-2 flex items-center justify-between border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded border border-black/10" style={{ background: mi.color }} />
                  <span className="text-[12px] font-semibold text-stone-800">{mi.name}</span>
                  <span className="text-[10px] font-mono text-stone-400">{code}</span>
                  {isActive && <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">aktuális</span>}
                </div>
                <span className="text-[10.5px] text-stone-400 tabular-nums">{list.reduce((s, o) => s + (Number(o.qty) || 0), 0)} db</span>
              </div>
              <div className="p-2 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                {list.map((o) => {
                  const m = Z[o.zone] || Z.available;
                  return (
                    <div key={o.id} className="bg-white border border-stone-200/70 rounded-lg p-2.5">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-mono text-stone-500">{o.id}</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${m.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.short}
                        </span>
                      </div>
                      <div className="text-[14px] font-semibold text-stone-900 font-mono tabular-nums">{o.w}×{o.h}<span className="text-[10px] text-stone-400 font-normal"> mm</span></div>
                      <div className="text-[10px] text-stone-400 mt-0.5 flex items-center justify-between">
                        <span>{((o.w * o.h) / 1e6).toFixed(2)} m²{(o.qty || 1) > 1 ? ` · ${o.qty}×` : ""}</span>
                        <span className="font-mono">{o.loc}</span>
                      </div>
                      <div className="text-[9.5px] text-stone-300 mt-0.5 font-mono">{o.fromJob} · {o.createdAt}</div>
                      {o.zone === "available" && (
                        <button onClick={() => sim.scrapOffcut(o.id)} className="mt-1.5 text-[10px] text-rose-500 hover:text-rose-700 hover:underline">Selejtezés</button>
                      )}
                      {o.zone === "scrap" && (
                        <button onClick={() => sim.restoreOffcut(o.id)} className="mt-1.5 text-[10px] text-stone-400 hover:text-amber-600 hover:underline">Visszaállítás</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

window.CuttingOptimizer = CuttingOptimizer;
window.OffcutWarehouse = OffcutWarehouse;
