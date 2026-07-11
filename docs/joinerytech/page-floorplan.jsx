// ──────────────────────────────────────────────────────────────────────────
// page-floorplan.jsx — Belsőépítészet → TÉRRENDEZÉS (FloorplanStudio)
//
//   Felülnézeti tér-vászon (SVG, mm): helyiségek (mozgatás/méretezés), zónák,
//   bútor-kontúrok. A bútor-paletta a MŰSZAKI TERVEZÉS parametrikus skeleton-
//   registryjéből (window.PARAM_TEMPLATES) jön — a kontúr ugyanannak a váznak
//   az ALACSONY FELBONTÁSÚ feloldása (befoglaló a geometria-paraméterekből).
//
//   LOD-elv (részletesség szintenként):
//     Tér-szint   → kontúr + név + méret (ennyi elég a pakolgatáshoz)
//     Elem-szint  → + kivitel, ár, szállítási idő (snapshot — nem MfgPrep!)
//     Műszaki     → furat/kötőelem/szabás — NEM itt él (deep-link a Tervezésbe)
//
//   A helyiség fal-oldalaihoz (É/K/D/NY) BÚTORSOR (falnézet) linkelhető —
//   a linkelt bútorsor elemei automatikusan KIVETÜLNEK a falra (számított).
//
//   <FloorplanStudio />   // Belsőépítészet → Térrendezés screen
//   Inspektor-panelek: page-floorplan-2.jsx (window.FpInspector)
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateFp, useMemo: useMemoFp, useRef: useRefFp, useEffect: useEffectFp } = React;

const FP_SNAP = 50; // mm rács
const fpSnap = (v) => Math.round(v / FP_SNAP) * FP_SNAP;
const FP_ZONE_TONES = {
  emerald: { fill: "rgba(16,185,129,.12)", stroke: "#10b981", text: "#047857", label: "Funkció" },
  sky:     { fill: "rgba(14,165,233,.12)", stroke: "#0ea5e9", text: "#0369a1", label: "Közlekedő" },
  violet:  { fill: "rgba(139,92,246,.12)", stroke: "#8b5cf6", text: "#6d28d9", label: "Tároló" },
  amber:   { fill: "rgba(245,158,11,.14)", stroke: "#f59e0b", text: "#b45309", label: "Munka" },
};
const FP_SIDES = { N: "É", E: "K", S: "D", W: "NY" };

// ── 4D (idő) réteg — a készültség SZÁMÍTOTT a meglévő FSM-láncból ──────────
//   composition.quoteRef → quote → order → prodTasks(order) — nincs tárolt
//   állapot a téren; a szín a lánc aktuális állásából származik.
const FP4D_STAGES = {
  terv:     { label: "Terv",        color: "#a8a29e" },
  ajanlat:  { label: "Ajánlatban",  color: "#0ea5e9" },
  rendeles: { label: "Megrendelve", color: "#8b5cf6" },
  gyartas:  { label: "Gyártásban",  color: "#f59e0b" },
  kesz:     { label: "Kész",        color: "#10b981" },
};
function fp4dForComp(comp, s) {
  if (!comp || !comp.quoteRef) return { stage: "terv", frac: 0 };
  const q = (s.quotes || []).find((x) => x.id === comp.quoteRef);
  if (!q) return { stage: "terv", frac: 0 };
  if (["draft", "sent", "rejected", "expired"].includes(q.status)) return { stage: "ajanlat", frac: 0 };
  const o = (s.orders || []).find((x) => x.quoteRef === q.id || x.quote === q.id || x.sourceQuote === q.id);
  if (!o) return { stage: "ajanlat", frac: 0 };
  const tasks = (s.prodTasks || []).filter((t) => t.order === o.id);
  if (!tasks.length) return { stage: "rendeles", frac: 0 };
  const done = tasks.filter((t) => t.status === "kesz").length;
  if (done === tasks.length) return { stage: "kesz", frac: 1 };
  return { stage: "gyartas", frac: done / tasks.length };
}
// elem-szintű szétosztás (demo-heurisztika): a kész hányad sorrendben színez
function fp4dStageForIndex(res, idx, n) {
  if (res.stage !== "gyartas") return res.stage;
  return idx < Math.floor(res.frac * n) ? "kesz" : "gyartas";
}

// skeleton (sablon) → befoglaló kontúr a geometria-paraméterek alapértékeiből
function fpTplFootprint(tpl) {
  const get = (k, d) => { const v = (tpl.vars || []).find((x) => x.key === k); return (v && v.default) || d; };
  return { w: get("width", 600), d: get("depth", 560), h: get("height", 720) };
}
// kontúr-paletta: a kiadott skeletonok + pár nem-gyártott placeholder
function fpPalette() {
  const tpls = (window.PARAM_TEMPLATES || []).map((t) => {
    const fpr = fpTplFootprint(t);
    return { kind: "tpl", tplId: t.id, label: t.name, w: fpr.w, d: fpr.d };
  });
  const free = [
    { kind: "free", label: "Étkezőasztal", w: 1600, d: 900 },
    { kind: "free", label: "Kanapé", w: 2200, d: 950 },
    { kind: "free", label: "Ágy", w: 1600, d: 2000 },
    { kind: "free", label: "Hűtő", w: 600, d: 650 },
  ];
  return { tpls, free };
}
// linkelt bútorsor elemei → kivetített kontúrok egy fal mentén (SZÁMÍTOTT)
function fpProjectWall(room, side, comp) {
  if (!comp) return [];
  const out = [];
  let off = 0;
  (comp.items || []).filter((it) => it.mount !== "wall").forEach((it) => {
    const w = (it.vars && it.vars.width) || 600;
    const d = (it.vars && it.vars.depth) || 560;
    for (let q = 0; q < (it.qty || 1); q++) {
      let g;
      if (side === "N") g = { x: room.x + off, y: room.y, w, h: d };
      else if (side === "S") g = { x: room.x + off, y: room.y + room.h - d, w, h: d };
      else if (side === "W") g = { x: room.x, y: room.y + off, w: d, h: w };
      else g = { x: room.x + room.w - d, y: room.y + off, w: d, h: w };
      out.push({ ...g, it, compoId: comp.id, side, key: `${comp.id}-${it.uid}-${q}` });
      off += w;
    }
  });
  return out;
}

function FloorplanStudio() {
  const s = useSim();
  const concepts = (s.concepts || []).filter((c) => c.status !== "archived");
  const [cid, setCid] = useStateFp(() => (window._interiorOpen) || (concepts[0] && concepts[0].id));
  const concept = (s.concepts || []).find((c) => c.id === cid) || concepts[0];
  const fp = concept ? s.floorplanFor(concept.id) : null;
  useEffectFp(() => { if (concept && !fp) window.sim.ensureFloorplan(concept.id); }, [concept && concept.id, !!fp]);

  const [mode, setMode] = useStateFp("select"); // select | room | zone | furn
  const [layer, setLayer] = useStateFp("terv"); // terv | 4d | szerelo
  const [scanHit, setScanHit] = useStateFp(null); // kivetített elem key (szerelő nézet)
  const [palettePick, setPalettePick] = useStateFp(null);
  const [sel, setSel] = useStateFp(null); // {type:'room'|'zone'|'furn'|'citem', id|key, ...}
  const svgRef = useRefFp(null);
  const drag = useRefFp(null);
  const [, force] = useStateFp(0);

  if (!concept) return <div className="px-4 md:px-7 py-6 text-stone-500 text-[13px]">Nincs koncepció.</div>;
  if (!fp) return <div className="px-4 md:px-7 py-6 text-stone-400 text-[12px]">Tér előkészítése…</div>;

  const compos = s.compositionList ? s.compositionList() : [];
  const compoById = (id) => compos.find((c) => c.id === id) || null;

  // kivetített falnézet-elemek (számított) + 4D státusz
  const projected = [];
  fp.rooms.forEach((r) => Object.entries(r.walls || {}).forEach(([side, compoId]) => {
    if (!compoId) return;
    const comp = compoById(compoId);
    const res = fp4dForComp(comp, s);
    const items = fpProjectWall(r, side, comp);
    items.forEach((p, i) => projected.push({ ...p, roomId: r.id, roomName: r.name, stage: fp4dStageForIndex(res, i, items.length), wallIdx: i + 1, wallCount: items.length }));
  }));

  // viewBox a tartalomra illesztve
  const allRects = [...fp.rooms, ...(fp.furn || []).map((f) => ({ x: f.x, y: f.y, w: f.rot ? f.d : f.w, h: f.rot ? f.w : f.d }))];
  const maxX = Math.max(8000, ...allRects.map((r) => r.x + r.w)) + 600;
  const maxY = Math.max(5000, ...allRects.map((r) => r.y + r.h)) + 600;
  const minX = Math.min(0, ...allRects.map((r) => r.x)) - 600;
  const minY = Math.min(0, ...allRects.map((r) => r.y)) - 600;

  const toMm = (e) => {
    const svg = svgRef.current; if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: fpSnap(p.x), y: fpSnap(p.y) };
  };

  // vászon-kattintás: mód szerinti hozzáadás
  const onCanvasClick = (e) => {
    const p = toMm(e);
    if (mode === "room") {
      const id = window.sim.addFpRoom(concept.id, { x: p.x, y: p.y });
      setSel({ type: "room", id }); setMode("select");
    } else if (mode === "zone") {
      const host = fp.rooms.find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
      const id = window.sim.addFpZone(concept.id, { x: p.x, y: p.y, roomId: host ? host.id : null });
      setSel({ type: "zone", id }); setMode("select");
    } else if (mode === "furn" && palettePick) {
      const id = window.sim.addFpFurn(concept.id, { label: palettePick.label, tplId: palettePick.tplId || null, w: palettePick.w, d: palettePick.d, x: p.x, y: p.y });
      setSel({ type: "furn", id });
    } else setSel(null);
  };

  // drag (lokális preview, commit pointerup-on)
  const startDrag = (e, kind, obj, resize) => {
    e.stopPropagation();
    const p = toMm(e);
    drag.current = { kind, id: obj.id, resize: !!resize, ox: p.x - obj.x, oy: p.y - obj.y, sw: obj.w, sh: obj.h || obj.d, live: { ...obj } };
    setSel({ type: kind, id: obj.id });
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const p = toMm(e); const d = drag.current;
    if (d.resize) { d.live.w = Math.max(400, p.x - d.live.x); const hk = d.kind === "furn" ? "d" : "h"; d.live[hk] = Math.max(400, p.y - d.live.y); }
    else { d.live.x = p.x - d.ox; d.live.y = p.y - d.oy; }
    force((n) => n + 1);
  };
  const endDrag = () => {
    const d = drag.current; if (!d) return;
    drag.current = null;
    const patch = d.kind === "furn" ? { x: d.live.x, y: d.live.y, w: d.live.w, d: d.live.d } : { x: d.live.x, y: d.live.y, w: d.live.w, h: d.live.h };
    if (d.kind === "room") window.sim.updateFpRoom(concept.id, d.id, patch);
    if (d.kind === "zone") window.sim.updateFpZone(concept.id, d.id, patch);
    if (d.kind === "furn") window.sim.updateFpFurn(concept.id, d.id, patch);
  };
  const liveOf = (kind, obj) => (drag.current && drag.current.kind === kind && drag.current.id === obj.id ? drag.current.live : obj);

  const palette = fpPalette();

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[16px] font-semibold tracking-tight text-stone-900">Térrendezés</div>
          <div className="text-[11.5px] text-stone-500 max-w-xl">Helyiségek, zónák, bútor-kontúrok — a kontúr a műszaki tervezés parametrikus vázának alacsony felbontású feloldása. Minden szint csak annyit tölt be, amennyi kell.</div>
        </div>
        {/* koncepció-választó */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {concepts.map((c) => (
            <button key={c.id} onClick={() => { setCid(c.id); setSel(null); }}
              className={`h-8 px-2.5 rounded-lg border text-[11.5px] font-medium ${c.id === concept.id ? "border-rose-300 bg-rose-50 text-rose-700" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`}>{c.name}</button>
          ))}
        </div>
      </div>

      {/* eszköztár + réteg-váltó */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {[["select", "Kijelölés"], ["room", "+ Helyiség"], ["zone", "+ Zóna"], ["furn", "+ Bútor-kontúr"]].map(([k, lbl]) => (
          <button key={k} onClick={() => { setMode(k); if (k !== "furn") setPalettePick(null); }}
            className={`h-9 px-3 rounded-lg border text-[12px] font-medium ${mode === k ? "border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-200" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`}>{lbl}</button>
        ))}
        <span className="flex-1" />
        <div className="flex items-center rounded-lg border border-stone-200 bg-white overflow-hidden">
          {[["terv", "Terv"], ["4d", "4D készültség"], ["szerelo", "Szerelő"]].map(([k, lbl]) => (
            <button key={k} onClick={() => { setLayer(k); setScanHit(null); }}
              className={`h-9 px-3 text-[12px] font-medium ${layer === k ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"}`}>{lbl}</button>
          ))}
        </div>
      </div>
      <div className="text-[10.5px] text-stone-400 -mt-2">{layer === "4d" ? "4D: a szín az elem helye az IDŐBEN — az ajánlat → rendelés → gyártási feladat láncból számítva, nem tárolt." : layer === "szerelo" ? "Szerelő nézet: olvasd be (írd be) az elem kódját a jobb oldali panelen — a tér megmutatja, melyik szekrénybe megy." : mode === "room" ? "Kattints a vászonra — 3×3 m helyiség kerül oda." : mode === "zone" ? "Kattints egy helyiségbe — zóna kerül oda." : mode === "furn" ? (palettePick ? `Kattints a vászonra: ${palettePick.label}` : "Válassz modellt a jobb oldali palettáról.") : "Kattints / húzd az alakzatokat. Sarok-fogantyú = méretezés."}</div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* VÁSZON */}
        <div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white overflow-hidden">
          <svg ref={svgRef} viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="w-full block touch-none select-none" style={{ height: 540, cursor: mode === "select" ? "default" : "crosshair" }}
            onClick={onCanvasClick} onPointerMove={onMove} onPointerUp={endDrag} onPointerLeave={endDrag}>
            {/* rács */}
            <defs><pattern id="fpgrid" width="500" height="500" patternUnits="userSpaceOnUse"><path d="M 500 0 L 0 0 0 500" fill="none" stroke="#e7e5e4" strokeWidth="6" /></pattern></defs>
            <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="url(#fpgrid)" />

            {/* helyiségek */}
            {fp.rooms.map((r0) => {
              const r = liveOf("room", r0);
              const isSel = sel && sel.type === "room" && sel.id === r0.id;
              return (
                <g key={r0.id}>
                  <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={isSel ? "rgba(244,63,94,.05)" : "#fafaf9"} stroke={isSel ? "#f43f5e" : "#57534e"} strokeWidth={isSel ? 50 : 70}
                    style={{ cursor: "move" }} onPointerDown={(e) => mode === "select" && startDrag(e, "room", r0)} onClick={(e) => e.stopPropagation()} />
                  <text x={r.x + 140} y={r.y + 320} fontSize="220" fontWeight="600" fill="#44403c">{r.name}</text>
                  <text x={r.x + 140} y={r.y + 560} fontSize="170" fill="#a8a29e" fontFamily="monospace">{((r.w * r.h) / 1e6).toFixed(1)} m²</text>
                  {/* falnézet-jelölők */}
                  {Object.entries(r0.walls || {}).filter(([, v]) => v).map(([side]) => {
                    const t = 90;
                    const seg = side === "N" ? { x: r.x, y: r.y - t, w: r.w, h: t } : side === "S" ? { x: r.x, y: r.y + r.h, w: r.w, h: t } : side === "W" ? { x: r.x - t, y: r.y, w: t, h: r.h } : { x: r.x + r.w, y: r.y, w: t, h: r.h };
                    return <rect key={side} x={seg.x} y={seg.y} width={seg.w} height={seg.h} fill="#f43f5e" opacity="0.75" rx="40" />;
                  })}
                  {isSel && <rect x={r.x + r.w - 200} y={r.y + r.h - 200} width="400" height="400" fill="#f43f5e" rx="80" style={{ cursor: "nwse-resize" }} onPointerDown={(e) => startDrag(e, "room", r0, true)} />}
                </g>
              );
            })}

            {/* zónák */}
            {(fp.zones || []).map((z0) => {
              const z = liveOf("zone", z0);
              const tone = FP_ZONE_TONES[z0.tone] || FP_ZONE_TONES.emerald;
              const isSel = sel && sel.type === "zone" && sel.id === z0.id;
              return (
                <g key={z0.id}>
                  <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={tone.fill} stroke={tone.stroke} strokeWidth={isSel ? 40 : 20} strokeDasharray="140 90" rx="60"
                    style={{ cursor: "move" }} onPointerDown={(e) => mode === "select" && startDrag(e, "zone", z0)} onClick={(e) => e.stopPropagation()} />
                  <text x={z.x + 110} y={z.y + 260} fontSize="160" fontWeight="600" fill={tone.text}>{z0.name}</text>
                  {isSel && <rect x={z.x + z.w - 180} y={z.y + z.h - 180} width="360" height="360" fill={tone.stroke} rx="80" style={{ cursor: "nwse-resize" }} onPointerDown={(e) => startDrag(e, "zone", z0, true)} />}
                </g>
              );
            })}

            {/* kivetített bútorsor-elemek (számított; szín a réteg szerint) */}
            {projected.map((p) => {
              const isSel = sel && sel.type === "citem" && sel.key === p.key;
              const isHit = layer === "szerelo" && scanHit === p.key;
              const dim = layer === "szerelo" && scanHit && !isHit;
              const stg = FP4D_STAGES[p.stage] || FP4D_STAGES.terv;
              const fill = layer === "4d" ? stg.color + (isSel ? "55" : "33") : isHit ? "rgba(16,185,129,.4)" : isSel ? "rgba(244,63,94,.25)" : "rgba(244,63,94,.12)";
              const stroke = layer === "4d" ? stg.color : isHit ? "#10b981" : "#f43f5e";
              return (
                <g key={p.key} opacity={dim ? 0.25 : 1} onClick={(e) => { e.stopPropagation(); setSel({ type: "citem", key: p.key, compoId: p.compoId, uid: p.it.uid, roomId: p.roomId, side: p.side }); }} style={{ cursor: "pointer" }}>
                  <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={fill} stroke={stroke} strokeWidth={isSel || isHit ? 48 : 24} rx="40" />
                  {isHit && <rect x={p.x - 110} y={p.y - 110} width={p.w + 220} height={p.h + 220} fill="none" stroke="#10b981" strokeWidth="30" strokeDasharray="160 110" rx="70">
                    <animate attributeName="stroke-dashoffset" from="0" to="270" dur="1.2s" repeatCount="indefinite" /></rect>}
                  <text x={p.x + p.w / 2} y={p.y + p.h / 2 + 55} fontSize="150" textAnchor="middle" fill={layer === "4d" ? "#44403c" : "#9f1239"}>{p.it.tplName ? p.it.tplName.slice(0, 14) : ""}</text>
                </g>
              );
            })}

            {/* szabad bútor-kontúrok (skeleton-hivatkozással) */}
            {(fp.furn || []).map((f0) => {
              const f = liveOf("furn", f0);
              const w = f0.rot ? f.d : f.w, h = f0.rot ? f.w : f.d;
              const isSel = sel && sel.type === "furn" && sel.id === f0.id;
              return (
                <g key={f0.id}>
                  <rect x={f.x} y={f.y} width={w} height={h} fill={isSel ? "rgba(120,113,108,.16)" : "rgba(120,113,108,.08)"} stroke="#78716c" strokeWidth={isSel ? 40 : 24} strokeDasharray={f0.tplId ? "" : "120 80"} rx="50"
                    style={{ cursor: "move" }} onPointerDown={(e) => mode === "select" && startDrag(e, "furn", f0)} onClick={(e) => e.stopPropagation()} />
                  <text x={f.x + w / 2} y={f.y + h / 2 + 55} fontSize="150" textAnchor="middle" fill="#57534e">{f0.label.slice(0, 16)}</text>
                  {f0.tplId && <circle cx={f.x + 130} cy={f.y + 130} r="70" fill="#f59e0b" />}
                </g>
              );
            })}
          </svg>
          <div className="px-4 py-2 border-t border-stone-100 bg-stone-50/60 flex items-center gap-3 flex-wrap text-[10.5px] text-stone-400">
            {layer === "4d" ? (
              <>
                <span className="font-medium text-stone-500">4D készültség:</span>
                {Object.values(FP4D_STAGES).map((st) => (
                  <span key={st.label} className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: st.color }} />{st.label}</span>
                ))}
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm border-2 border-stone-500 bg-stone-50" />helyiség</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-dashed border-emerald-500 bg-emerald-50" />zóna</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-stone-500 bg-stone-100" />kontúr <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> = skeleton</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-rose-500 bg-rose-50" />bútorsor-kivetítés</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-rose-500/75" />linkelt falnézet</span>
              </>
            )}
          </div>
        </div>

        {/* INSPEKTOR (LOD) */}
        <div className="space-y-4">
          {layer === "szerelo" && window.FpScanPanel ? (
            <window.FpScanPanel projected={projected} fp={fp} scanHit={scanHit} setScanHit={setScanHit} compos={compos} />
          ) : window.FpInspector ? (
            <window.FpInspector concept={concept} fp={fp} sel={sel} setSel={setSel} mode={mode} palette={palette} palettePick={palettePick} setPalettePick={setPalettePick} compos={compos} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

window.FloorplanStudio = FloorplanStudio;
Object.assign(window, { fpPalette, fpTplFootprint, fpProjectWall, FP_ZONE_TONES, FP_SIDES, FP4D_STAGES, fp4dForComp });
