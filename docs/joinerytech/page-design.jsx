// Tervezés (Design) world — parametric template editor + materials generator + catalog
// Redesigned 2026-05-29: live SVG preview, improved wizard UX, visual material pickers

const { useState: useStateD, useMemo: useMemoD, useEffect: useEffectD } = React;

// ──────────────────────────────────────────────────────────────────────────
// Formula resolver
// ──────────────────────────────────────────────────────────────────────────
function resolveFormula(expr, ctx) {
  if (typeof expr === "number") return expr;
  if (expr == null) return 0;
  if (typeof expr === "string" && !/[{}]/.test(expr) && !/[+\-*×/]/.test(expr) && !/^\d/.test(expr.trim())) return expr;
  let s = String(expr);
  s = s.replace(/\{([a-z_]+)\.t\}/gi, (_, k) => { const v = ctx[k]; return v ? window.sim.materialInfo(v).t : 18; });
  s = s.replace(/\{([a-z_]+)\}/gi, (_, k) => ctx[k] ?? 0);
  s = s.replace(/×/g, "*");
  try { const fn = new Function("return (" + s + ")"); const v = fn(); return typeof v === "number" && isFinite(v) ? Math.round(v) : v; } catch { return s; }
}
function materialLabel(code) { return window.sim.materialInfo(code).name; }
function materialColor(code) { return window.sim.materialInfo(code).color; }
function matThick(code) { return window.sim.materialInfo(code).t; }

// Estimated cost: rough sheet-based calculation (1 sheet = 2440×1830mm)
const SHEET_AREA = 2440 * 1830;
function estimateCost(resolvedParts) {
  const byMat = {};
  resolvedParts.forEach(p => {
    const area = (Math.abs(p.rW || 0) * Math.abs(p.rH || 0)) * (p.rQty || 1);
    byMat[p.rMat] = (byMat[p.rMat] || 0) + area;
  });
  let total = 0;
  Object.entries(byMat).forEach(([code, area]) => {
    const mat = MATERIALS.find(m => m.code === code);
    const pricePerSheet = mat?.price || CATALOG_LOOKUP[code]?.t ? (CATALOG_LOOKUP[code].t > 10 ? 18500 : 9200) : 12000;
    const sheets = Math.ceil(area / (SHEET_AREA * 0.75)); // ~75% sheet utilization
    total += sheets * pricePerSheet;
  });
  return total;
}

// ──────────────────────────────────────────────────────────────────────────
// Parametric SVG preview — live front-view cabinet sketch
// ──────────────────────────────────────────────────────────────────────────
function ParametricSVG({ tpl, vars, resolvedParts }) {
  const W = 220, H = 260;
  const PAD = 20;
  const usableW = W - 2 * PAD, usableH = H - 2 * PAD;

  const rawW = vars.width || 800;
  const rawH = vars.height || 1800;
  const scaleX = usableW / rawW;
  const scaleY = usableH / rawH;
  const scale = Math.min(scaleX, scaleY);
  const sw = rawW * scale;
  const sh = rawH * scale;
  const ox = PAD + (usableW - sw) / 2;
  const oy = PAD + (usableH - sh) / 2;

  const bodyColor = materialColor(vars.body) || "#ecdfc8";
  const stroke = "#8a7e72";
  const thin = "#b5a99a";

  const lines = [];

  if (tpl.thumb === "cabinet") {
    const shelves = vars.shelves || 2;
    const t = matThick(vars.body);
    const tPx = t * scale;
    // top + bottom shelf lines
    const innerH = sh - 2 * tPx;
    for (let i = 1; i <= shelves; i++) {
      const y = oy + tPx + (innerH / (shelves + 1)) * i;
      lines.push(<line key={i} x1={ox + tPx} y1={y} x2={ox + sw - tPx} y2={y} stroke={thin} strokeWidth="1.2" strokeDasharray="3 2" />);
    }
    // handle marks
    lines.push(<circle key="h1" cx={ox + sw * 0.5} cy={oy + sh * 0.35} r="2" fill={stroke} />);
    lines.push(<circle key="h2" cx={ox + sw * 0.5} cy={oy + sh * 0.65} r="2" fill={stroke} />);
  }

  if (tpl.thumb === "drawer") {
    const drawers = vars.drawers || 3;
    const t = matThick(vars.body);
    const tPx = t * scale;
    const innerH = sh - tPx;
    const dh = innerH / drawers;
    for (let i = 0; i < drawers; i++) {
      const dy = oy + tPx + i * dh;
      const gap = 3;
      lines.push(<rect key={"dr" + i} x={ox + tPx + gap} y={dy + gap} width={sw - 2 * tPx - gap * 2} height={dh - gap * 2} rx="1.5" fill="white" fillOpacity=".7" stroke={thin} strokeWidth="1" />);
      lines.push(<circle key={"dh" + i} cx={ox + sw / 2} cy={dy + dh / 2} r="2.5" fill={stroke} />);
    }
  }

  if (tpl.thumb === "door") {
    const panels = 2;
    const pad = 8 * scale;
    const ph = (sh - 2 * pad * 2) / panels;
    for (let i = 0; i < panels; i++) {
      const py = oy + pad * 2 + i * (ph + pad);
      lines.push(<rect key={"p" + i} x={ox + pad * 2} y={py} width={sw - pad * 4} height={ph} rx="2" fill="white" fillOpacity=".6" stroke={thin} strokeWidth="1" />);
    }
    lines.push(<circle key="kn" cx={ox + sw * 0.78} cy={oy + sh * 0.42} r="3" fill={stroke} />);
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block mx-auto">
      {/* shadow */}
      <rect x={ox + 4} y={oy + 4} width={sw} height={sh} rx="2" fill="rgba(0,0,0,.07)" />
      {/* body */}
      <rect x={ox} y={oy} width={sw} height={sh} rx="2" fill={bodyColor} stroke={stroke} strokeWidth="1.6" />
      {lines}
      {/* dimension labels */}
      <g className="font-mono" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9 }} fill={stroke}>
        {/* width arrow */}
        <line x1={ox} y1={oy + sh + 14} x2={ox + sw} y2={oy + sh + 14} stroke={stroke} strokeWidth="1" />
        <line x1={ox} y1={oy + sh + 10} x2={ox} y2={oy + sh + 18} stroke={stroke} strokeWidth="1" />
        <line x1={ox + sw} y1={oy + sh + 10} x2={ox + sw} y2={oy + sh + 18} stroke={stroke} strokeWidth="1" />
        <text x={ox + sw / 2} y={oy + sh + 25} textAnchor="middle">{vars.width || "—"}</text>
        {/* height arrow */}
        <line x1={ox - 14} y1={oy} x2={ox - 14} y2={oy + sh} stroke={stroke} strokeWidth="1" />
        <line x1={ox - 18} y1={oy} x2={ox - 10} y2={oy} stroke={stroke} strokeWidth="1" />
        <line x1={ox - 18} y1={oy + sh} x2={ox - 10} y2={oy + sh} stroke={stroke} strokeWidth="1" />
        <text x={ox - 6} y={oy + sh / 2 + 3} textAnchor="middle" transform={`rotate(-90 ${ox - 6} ${oy + sh / 2 + 3})`}>{vars.height || "—"}</text>
      </g>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Improved FreeVarControl
// ──────────────────────────────────────────────────────────────────────────
function FreeVarControl({ v, value, onChange, compact = false }) {
  if (v.kind === "material") {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">{v.label}</div>
        <div className="flex gap-1.5 flex-wrap">
          {v.options.map(o => {
            const active = value === o;
            return (
              <button key={o} onClick={() => onChange(o)} title={window.sim.materialInfo(o).name}
                className={`relative w-9 h-9 rounded-lg border-2 transition ${active ? "border-amber-600 shadow-sm shadow-amber-200" : "border-transparent hover:border-stone-300"}`}
                style={{ background: materialColor(o) }}>
                {active && <span className="absolute inset-0 grid place-items-center"><Icon name="check" size={13} className="text-white drop-shadow" /></span>}
              </button>
            );
          })}
        </div>
        <div className="text-[10px] text-stone-500 mt-1 truncate">{materialLabel(value)}</div>
      </div>
    );
  }

  if (v.kind === "raster") {
    const steps = [];
    for (let s = v.min; s <= v.max; s += v.step) steps.push(s);
    // if steps > 8, fall back to slider
    if (steps.length <= 8) {
      return (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium">{v.label}</div>
            <span className="text-[11px] font-semibold text-stone-900 font-mono tabular-nums">{value}<span className="text-[9px] font-normal text-stone-500 ml-0.5">{v.unit}</span></span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {steps.map(s => (
              <button key={s} onClick={() => onChange(s)}
                className={`h-7 px-2 rounded-md text-[11px] font-mono transition ${value === s ? "bg-amber-600 text-white font-semibold" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>{s}</button>
            ))}
          </div>
        </div>
      );
    }
  }

  // analog / large raster → slider with stepper buttons
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium">{v.label}</div>
        <div className="flex items-center gap-1">
          <button onClick={() => onChange(Math.max(v.min, value - v.step))}
            className="w-6 h-6 rounded bg-stone-100 text-stone-700 hover:bg-stone-200 grid place-items-center text-[13px] font-semibold leading-none">−</button>
          <span className="text-[12px] font-semibold font-mono tabular-nums text-stone-900 w-14 text-center">{value}<span className="text-[9.5px] font-normal text-stone-500 ml-0.5">{v.unit}</span></span>
          <button onClick={() => onChange(Math.min(v.max, value + v.step))}
            className="w-6 h-6 rounded bg-stone-100 text-stone-700 hover:bg-stone-200 grid place-items-center text-[13px] font-semibold leading-none">+</button>
        </div>
      </div>
      <input type="range" min={v.min} max={v.max} step={v.step} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-amber-600" style={{ height: 4 }} />
      <div className="flex justify-between text-[9.5px] text-stone-400 font-mono mt-0.5"><span>{v.min}</span><span>{v.max}</span></div>
    </div>
  );
}

// Parts mini-table (reused in wizard step 2 and editor)
// tplId (opc.): gér/szög él-jelölés (GV) chip a műszaki specifikációból (sim.partMiters)
function PartsTable({ resolvedParts, tplId }) {
  const gvOf = (name, r) => {
    if (!tplId) return null;
    let manual = null;
    try { manual = window.sim && window.sim.partMiter ? window.sim.partMiter(tplId, name) : null; } catch (e) {}
    let jm = { short: 0, long: 0 };
    try {
      const tpl = (window.sim && window.sim.findDesignTemplate && window.sim.findDesignTemplate(tplId)) ||
        (window.PARAM_TEMPLATES || []).find((t) => t.id === tplId);
      if (tpl && window.TplEngine && window.TplEngine.jointMiters && r)
        jm = window.TplEngine.jointMiters(tpl, name, Number(r.rW) || 0, Number(r.rH) || 0);
    } catch (e) {}
    const short = Math.min(2, (manual ? manual.short || 0 : 0) + jm.short);
    const long = Math.min(2, (manual ? manual.long || 0 : 0) + jm.long);
    if (!short && !long) return null;
    return { short, long, note: (manual && manual.note) || "" };
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11.5px]">
        <thead>
          <tr className="border-b border-stone-100 bg-stone-50/60">
            {["#", "Alkatrész", "Anyag", "Méret (mm)", "Db"].map(h => (
              <th key={h} className="px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 font-medium text-left last:text-right">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resolvedParts.map((r, i) => {
            const gv = gvOf(r.name, r);
            return (
            <tr key={i} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50">
              <td className="px-3 py-2 text-stone-400 font-mono">{i + 1}</td>
              <td className="px-3 py-2 font-medium text-stone-900">
                {r.name}
                {gv && ((gv.short || 0) + (gv.long || 0) > 0) && (
                  <span title={"Gérelt/szögbe vágott él — műszaki specifikáció/csatlakozás" + (gv.note ? ": " + gv.note : "")}
                    className="ml-1.5 inline-flex align-middle text-[9px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">GV {gv.short || 0}R{gv.long || 0}H</span>
                )}
              </td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm border border-stone-200 shrink-0" style={{ background: materialColor(r.rMat) }} />
                  <span className="text-stone-700 truncate max-w-[140px]">{materialLabel(r.rMat)}</span>
                </span>
              </td>
              <td className="px-3 py-2 font-mono text-stone-700 whitespace-nowrap">{r.rW} × {r.rH} × {r.rT}</td>
              <td className="px-3 py-2 text-right font-semibold text-stone-900">{r.rQty}</td>
            </tr>
          ); })}
        </tbody>
      </table>
    </div>
  );
}

// ── Gér/szög él-jelölés a MŰSZAKI SPECIFIKÁCIÓBAN (woodwork_domain §18.3/§19) ──
//   A gér/szög DÖNTÉS ITT, a műszaki tervezésben születik (part.miterShort/Long);
//   a gyártás-előkészítés csak az üzemi ráhagyás mm-ét állítja. A szabásjegyzék
//   (Előkészítés → Szabászat) automatikusan GV-jelöli az itt megjelölt alkatrészt.
function PartMiterEditor({ tplId, partName }) {
  const pmSim = useSim();
  const cur = (window.sim.partMiter && window.sim.partMiter(tplId, partName)) || { short: 0, long: 0, note: "" };
  const setV = (patch) => window.sim.setPartMiter(tplId, partName, { ...cur, ...patch });
  const active = (cur.short || 0) + (cur.long || 0) > 0;
  const row = (label, k) => (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-stone-600">{label}</span>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map(n => (
          <button key={n} onClick={() => setV({ [k]: n })}
            className={`w-7 h-7 rounded-md text-[11.5px] font-mono font-semibold transition ${(cur[k] || 0) === n ? "bg-rose-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>{n}</button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="border-t border-stone-200 p-3 bg-stone-50/70">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">Él-kialakítás — gér / szögbe vágott él</div>
        {active && <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">GV {cur.short || 0}R{cur.long || 0}H</span>}
      </div>
      <div className="space-y-1.5">
        {row("Gérelt RÖVID él (db)", "short")}
        {row("Gérelt HOSSZÚ él (db)", "long")}
      </div>
      {active && (
        <input value={cur.note || ""} onChange={(e) => setV({ note: e.target.value })} placeholder="Megjegyzés (pl. pár: felső lap / fogás-él)…"
          className="mt-2 w-full h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-[11.5px] text-stone-700 outline-none focus:border-rose-300" />
      )}
      <div className="mt-2 text-[10px] text-stone-400 leading-snug">Műszaki DÖNTÉS: a gér párosított sarok-kötés — pár nélkül szögbe vágott él (pl. fogás-él). A szabásjegyzék automatikusan GV-jelöli; az üzemi ráhagyás mm-ét a Gyártás-előkészítés állítja.</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Template thumbnail (kept for card use)
// ──────────────────────────────────────────────────────────────────────────
function TemplateThumb({ kind, size = 64 }) {
  const s = size;
  const stroke = "#a8a29e", fill = "#fef3c7";
  if (kind === "cabinet") return (
    <svg width={s} height={s} viewBox="0 0 64 64" className="rounded-md bg-amber-50/50">
      <rect x="10" y="8" width="44" height="48" rx="2" fill={fill} stroke={stroke} strokeWidth="1.4"/>
      <line x1="10" y1="22" x2="54" y2="22" stroke={stroke} strokeWidth="1.4"/>
      <line x1="10" y1="36" x2="54" y2="36" stroke={stroke} strokeWidth="1.4"/>
      <line x1="10" y1="50" x2="54" y2="50" stroke={stroke} strokeWidth="1.4"/>
    </svg>
  );
  if (kind === "drawer") return (
    <svg width={s} height={s} viewBox="0 0 64 64" className="rounded-md bg-amber-50/50">
      <rect x="10" y="10" width="44" height="44" rx="2" fill={fill} stroke={stroke} strokeWidth="1.4"/>
      <rect x="14" y="14" width="36" height="11" fill="#fff" stroke={stroke} strokeWidth="1.2"/>
      <rect x="14" y="27" width="36" height="11" fill="#fff" stroke={stroke} strokeWidth="1.2"/>
      <rect x="14" y="40" width="36" height="11" fill="#fff" stroke={stroke} strokeWidth="1.2"/>
      <circle cx="32" cy="19" r="1.2" fill={stroke}/><circle cx="32" cy="32" r="1.2" fill={stroke}/><circle cx="32" cy="45" r="1.2" fill={stroke}/>
    </svg>
  );
  if (kind === "door") return (
    <svg width={s} height={s} viewBox="0 0 64 64" className="rounded-md bg-amber-50/50">
      <rect x="20" y="6" width="24" height="52" rx="1" fill={fill} stroke={stroke} strokeWidth="1.4"/>
      <rect x="24" y="12" width="16" height="20" fill="#fff" stroke={stroke} strokeWidth="1"/>
      <rect x="24" y="36" width="16" height="16" fill="#fff" stroke={stroke} strokeWidth="1"/>
      <circle cx="40" cy="32" r="1.2" fill={stroke}/>
    </svg>
  );
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" className="rounded-md bg-stone-100">
      <rect x="14" y="14" width="36" height="36" rx="2" fill="none" stroke={stroke} strokeWidth="1.4" strokeDasharray="3 3"/>
      <line x1="14" y1="14" x2="50" y2="50" stroke={stroke} strokeWidth="1" strokeDasharray="2 2"/>
      <line x1="50" y1="14" x2="14" y2="50" stroke={stroke} strokeWidth="1" strokeDasharray="2 2"/>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Design Dashboard
// ──────────────────────────────────────────────────────────────────────────
function DesignDashboard({ onScreen }) {
  const sds = useSim();
  const dsStyles = sds.styles || [];
  const dsTech = sds.techSpecs || [];
  const [composerOpen, setComposerOpen] = useStateD(false);
  const [wizardOpen, setWizardOpen] = useStateD(false);
  const stats = [
    { label: "Aktív sablonok",       value: 24, delta: "+3 e hónapban" },
    { label: "Generált anyaglisták", value: 142, delta: "+18 e héten" },
    { label: "Aktív projektek",      value: 2,   delta: "Doorstar, Bognár" },
    { label: "Sablon átlag rating",  value: "4.6 ★", delta: "76 értékelés" },
  ];
  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-6">
      {composerOpen && <AssemblyComposer onClose={() => setComposerOpen(false)} />}
      {wizardOpen && window.DesignItemWizard && <DesignItemWizard context="design" onClose={() => setWizardOpen(false)} />}
      <div className="grid md:grid-cols-2 gap-3">
        {/* Start a design → quote */}
        <div className="rounded-2xl border border-violet-300 bg-gradient-to-br from-violet-600 to-violet-500 p-4 md:p-5 flex flex-col gap-3 text-white">
          <div className="flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-xl bg-white/15 grid place-items-center shrink-0"><Icon name="ruler" size={22} /></span>
            <div className="min-w-0 flex-1 text-[14px] font-semibold">Tervezés indítása</div>
          </div>
          <div className="text-[11.5px] text-violet-50/90 leading-snug flex-1">Igényfelmérés → stílus → (műszaki / gyártás) · ajánlat készítése egy lépésben</div>
          <button onClick={() => setWizardOpen(true)}
            className="self-start h-9 px-4 rounded-lg bg-white text-violet-700 text-[12.5px] font-semibold hover:bg-violet-50 inline-flex items-center gap-1.5">
            <Icon name="plus" size={14} />Új tervezés
          </button>
        </div>
        {/* Product assembly / BOM */}
        <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 md:p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-xl bg-violet-600 text-white grid place-items-center shrink-0"><Icon name="box" size={22} /></span>
            <div className="min-w-0 flex-1 text-[14px] font-semibold text-stone-900">Termék-összeállítás (BOM)</div>
          </div>
          <div className="text-[11.5px] text-stone-500 leading-snug flex-1">Beágyazott szerkezet · közös konfiguráció (szín, anyag, vasalat) · anyagigény több szállítóról</div>
          <button onClick={() => setComposerOpen(true)}
            className="self-start h-9 px-4 rounded-lg bg-violet-600 text-white text-[12.5px] font-medium hover:bg-violet-700 inline-flex items-center gap-1.5">
            <Icon name="plus" size={14} />Összeállítás
          </button>
        </div>
      </div>

      {/* Specifikációk — újra-felhasználható kivitel / műszaki adathalmaz */}
      <button onClick={() => onScreen("specs")}
        className="w-full text-left rounded-2xl border border-stone-200 bg-white p-4 flex items-center gap-4 hover:border-stone-300 hover:bg-stone-50/40 transition">
        <span className="w-11 h-11 rounded-xl bg-stone-900 text-white grid place-items-center shrink-0"><Icon name="layers" size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-stone-900">Specifikációk</div>
          <div className="text-[11.5px] text-stone-500 leading-snug">Stílus / kivitel és műszaki paraméterek — egy adathalmaz több sablonra is alkalmazva</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium px-2 py-1 rounded-lg bg-violet-50 text-violet-700">{dsStyles.filter(x => x.status === "active").length} stílus</span>
          <span className="text-[11px] font-medium px-2 py-1 rounded-lg bg-teal-50 text-teal-700">{dsTech.filter(x => x.status === "active").length} műszaki</span>
          <Icon name="chevron" size={16} className="text-stone-400" />
        </div>
      </button>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <Card key={s.label} className="p-4">
            <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium">{s.label}</div>
            <div className="text-[28px] font-semibold tracking-tight text-stone-900 mt-1">{s.value}</div>
            <div className="text-[10.5px] text-stone-500 mt-1">{s.delta}</div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[14px] font-semibold text-stone-900">Népszerű sablonok</div>
              <div className="text-[11px] text-stone-500">A leggyakrabban használt parametrikus sablonok</div>
            </div>
            <button onClick={() => onScreen("editor")} className="text-[11.5px] text-amber-700 font-medium hover:underline">Megnyitás →</button>
          </div>
          <div className="space-y-2">
            {PARAM_TEMPLATES.slice(0, 3).map(t => {
              const kiv = dsStyles.filter(x => x.status === "active" && x.categoryId === t.categoryId).length;
              const mus = dsTech.filter(x => x.status === "active" && x.categoryId === t.categoryId).length;
              return (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-stone-100 hover:border-stone-200 hover:bg-stone-50/40 cursor-pointer" onClick={() => onScreen("generate")}>
                <TemplateThumb kind={t.thumb} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-stone-900">{t.name}</div>
                  <div className="text-[11px] text-stone-500">{t.type} · v{t.version} · {t.author}</div>
                  {(kiv > 0 || mus > 0) && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {kiv > 0 && <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-700">{kiv} kivitel</span>}
                      {mus > 0 && <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded bg-teal-50 text-teal-700">{mus} műszaki</span>}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] font-semibold text-amber-700">{t.uses}</div>
                  <div className="text-[10px] text-stone-500">felhasználás</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] font-semibold text-stone-900">{t.rating} ★</div>
                  <div className="text-[10px] text-stone-500">értékelés</div>
                </div>
              </div>
            );})}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[14px] font-semibold text-stone-900 mb-1">Aktív projektek</div>
          <div className="text-[11px] text-stone-500 mb-3">Tervezés alatt</div>
          <div className="space-y-2">
            {[
              { name: "Doorstar — 12 ajtó", sub: "Belső ajtó · Tölgy · 7/12 kész", pct: 58 },
              { name: "Bognár — Konyhabútor", sub: "14 alsó + 8 felső szekrény · 22/22 kész", pct: 100 },
            ].map(p => (
              <div key={p.name} className="p-3 rounded-lg border border-stone-100">
                <div className="text-[12.5px] font-medium text-stone-900">{p.name}</div>
                <div className="text-[10.5px] text-stone-500 mt-0.5">{p.sub}</div>
                <div className="h-1 rounded-full bg-stone-100 mt-2 overflow-hidden">
                  <div className={`h-full rounded-full ${p.pct === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: p.pct + "%" }} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => onScreen("generate")} className="w-full mt-3 h-9 rounded-lg bg-amber-600 text-white text-[12px] font-medium hover:bg-amber-700 flex items-center justify-center gap-1.5">
            <Icon name="bolt" size={14} />Anyaglista generálás
          </button>
        </Card>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Applied specifications strip — shows the template's category + the styles /
// műszaki specs available for it (new modular model: category-linked).
// ──────────────────────────────────────────────────────────────────────────
function AppliedSpecsStrip({ templateId, styles, techSpecs, categories }) {
  const tpl = (window.PARAM_TEMPLATES || []).find(t => t.id === templateId);
  const catId = tpl && tpl.categoryId;
  const cat = (categories || []).find(c => c.id === catId);
  const st = (styles || []).filter(x => x.status === "active" && x.categoryId === catId);
  const ms = (techSpecs || []).filter(x => x.status === "active" && x.categoryId === catId);
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium shrink-0">Alkalmazható specifikáció</span>
      {!cat && <span className="text-[11.5px] text-stone-400 italic">Nincs kategóriához kötve (egyedi sablon).</span>}
      {cat && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-stone-200 text-stone-700"><Icon name={cat.icon || "box"} size={11} />{cat.name}</span>
      )}
      {cat && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-50 text-violet-700"><Icon name="drop" size={11} />Stílus</span>
          {st.length === 0 && <span className="text-[11px] text-stone-400 italic">nincs</span>}
          {st.map(x => <span key={x.id} className="text-[11px] font-medium px-2 py-0.5 rounded-md border bg-white border-violet-200 text-stone-700">{x.name}</span>)}
        </div>
      )}
      {cat && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-teal-50 text-teal-700"><Icon name="cpu" size={11} />Műszaki</span>
          {ms.length === 0 && <span className="text-[11px] text-stone-400 italic">nincs</span>}
          {ms.map(x => <span key={x.id} className="text-[11px] font-medium px-2 py-0.5 rounded-md border bg-white border-teal-200 text-stone-700">{x.name}</span>)}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Template Editor
// ──────────────────────────────────────────────────────────────────────────
function TemplateEditor() {
  const teSim = useSim();
  const [tplId, setTplId] = useStateD(PARAM_TEMPLATES[0].id);
  const tpl = PARAM_TEMPLATES.find(t => t.id === tplId);
  const [mode, setMode] = useStateD("simple");
  const [selectedPart, setSelectedPart] = useStateD(0);
  const [vars, setVars] = useStateD(() => Object.fromEntries(tpl.vars.map(v => [v.key, v.default])));

  useEffectD(() => { setVars(Object.fromEntries(tpl.vars.map(v => [v.key, v.default]))); setSelectedPart(0); }, [tplId]);

  const resolvedParts = useMemoD(() => tpl.parts.map(p => ({
    ...p, rMat: resolveFormula(p.mat, vars), rW: resolveFormula(p.w, vars),
    rH: resolveFormula(p.h, vars), rT: resolveFormula(p.t, vars), rQty: resolveFormula(p.qty, vars),
  })), [tpl, vars]);

  const constraintResults = useMemoD(() => tpl.constraints.map(c => {
    try {
      let s = c.expr.replace(/\{([a-z_]+)\.t\}/gi, (_, k) => window.sim.materialInfo(vars[k]).t)
                    .replace(/\{([a-z_]+)\}/gi, (_, k) => vars[k] ?? 0).replace(/×/g, "*");
      const ok = new Function("return (" + s + ")")();
      return { ...c, ok: !!ok };
    } catch { return { ...c, ok: false }; }
  }), [tpl, vars]);

  const allOk = constraintResults.every(c => c.ok);
  const est = useMemoD(() => estimateCost(resolvedParts), [resolvedParts]);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 space-y-4">
      {/* top bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium shrink-0">Sablon</div>
        {PARAM_TEMPLATES.map(t => (
          <button key={t.id} onClick={() => setTplId(t.id)}
            className={`px-3 h-8 rounded-lg text-[11.5px] font-medium border transition ${tplId === t.id ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"}`}>{t.name}</button>
        ))}
        <span className="flex-1" />
        <div className="inline-flex p-0.5 bg-stone-100 rounded-lg">
          <button onClick={() => setMode("simple")} className={`px-2.5 h-7 text-[11px] rounded-md ${mode === "simple" ? "bg-white shadow-sm font-medium text-stone-900" : "text-stone-600"}`}>Egyszerű</button>
          <button onClick={() => setMode("advanced")} className={`px-2.5 h-7 text-[11px] rounded-md ${mode === "advanced" ? "bg-white shadow-sm font-medium text-stone-900" : "text-stone-600"}`}>Haladó <span className="text-amber-600">fx</span></button>
        </div>
      </div>

      {/* Applied specifications for the selected template */}
      <AppliedSpecsStrip templateId={tplId} styles={teSim.styles || []} techSpecs={teSim.techSpecs || []} categories={teSim.specCategories || []} />

      <div className="grid grid-cols-12 gap-4">
        {/* Left: vars + constraints */}
        <div className="col-span-12 lg:col-span-5 space-y-3">
          <Card className="p-4">
            <div className="text-[12px] font-semibold text-stone-900 mb-3">Szabad változók</div>
            <div className="grid grid-cols-2 gap-4">
              {tpl.vars.map(v => (
                <FreeVarControl key={v.key} v={v} value={vars[v.key]} onChange={val => setVars(p => ({ ...p, [v.key]: val }))} />
              ))}
            </div>
            {tpl.constraints.length > 0 && (
              <div className={`mt-4 p-3 rounded-lg text-[11.5px] ${allOk ? "bg-emerald-50/60 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                <div className="flex items-center gap-1.5 mb-1 font-semibold">
                  <Icon name={allOk ? "check" : "alert"} size={13} />
                  {allOk ? "Minden megkötés rendben" : "Megkötés sérül"}
                </div>
                {constraintResults.map((c, i) => (
                  <div key={i} className={`text-[10.5px] ${c.ok ? "opacity-70" : "font-medium"}`}>
                    {c.ok ? "✓" : "✗"} {c.rule}
                    {mode === "advanced" && <span className="ml-2 font-mono opacity-60">{c.expr}</span>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Becsült anyagköltség */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-semibold text-stone-900">Becsült anyagköltség</div>
              <span className="text-[10px] text-stone-400 font-mono">~75% lapkihasználás</span>
            </div>
            <div className="text-[22px] font-semibold text-amber-700 tabular-nums">{fmtHUF(est)}</div>
            <div className="text-[10.5px] text-stone-500 mt-0.5">Alapanyag becslés · {resolvedParts.length} alkatrész</div>
          </Card>
        </div>

        {/* Center: live SVG preview */}
        <div className="col-span-12 lg:col-span-3">
          <Card className="p-4 h-full flex flex-col">
            <div className="text-[12px] font-semibold text-stone-900 mb-3">Előnézet</div>
            <div className="flex-1 bg-gradient-to-br from-stone-50 to-amber-50/20 rounded-xl border border-stone-100 flex items-center justify-center py-4">
              <ParametricSVG tpl={tpl} vars={vars} resolvedParts={resolvedParts} />
            </div>
            <div className="mt-3 space-y-1 text-[11px]">
              <div className="flex justify-between text-stone-500"><span>Típus</span><span className="font-medium text-stone-900">{tpl.type}</span></div>
              <div className="flex justify-between text-stone-500"><span>Verzió</span><span className="font-medium font-mono text-stone-900">v{tpl.version}</span></div>
              <div className="flex justify-between text-stone-500"><span>Szerző</span><span className="font-medium text-stone-900">{tpl.author}</span></div>
            </div>
          </Card>
        </div>

        {/* Right: parts tree */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="p-0 overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <div className="text-[12px] font-semibold text-stone-900">Alkatrészek</div>
              <button className="text-[11px] text-stone-500 hover:text-stone-900 inline-flex items-center gap-1"><Icon name="plus" size={11} />Új</button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[380px]">
              {tpl.parts.map((p, i) => {
                const r = resolvedParts[i];
                const active = selectedPart === i;
                return (
                  <button key={i} onClick={() => setSelectedPart(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-stone-50 last:border-0 text-left transition ${active ? "bg-amber-50/60" : "hover:bg-stone-50/50"}`}>
                    <span className={`w-1 h-7 rounded-full shrink-0 ${active ? "bg-amber-600" : "bg-transparent"}`} />
                    <div className="w-3 h-3 rounded-sm border border-stone-200 shrink-0" style={{ background: materialColor(r.rMat) }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11.5px] font-medium text-stone-900 truncate">{p.name}</div>
                      <div className="text-[10px] text-stone-500 font-mono">{r.rW}×{r.rH}×{r.rT}mm</div>
                    </div>
                    {(() => { const mm = window.sim && window.sim.partMiter ? window.sim.partMiter(tpl.id, p.name) : null;
                      return mm && ((mm.short || 0) + (mm.long || 0) > 0)
                        ? <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">GV {mm.short || 0}R{mm.long || 0}H</span>
                        : null; })()}
                    <div className="text-[11.5px] font-semibold text-stone-900 shrink-0">{r.rQty}<span className="text-stone-400 font-normal text-[9.5px]"> db</span></div>
                  </button>
                );
              })}
            </div>
            {tpl.parts[selectedPart] && <PartMiterEditor tplId={tpl.id} partName={tpl.parts[selectedPart].name} />}
            {mode === "advanced" && tpl.parts[selectedPart] && (
              <div className="border-t border-stone-200 p-3 bg-stone-900 rounded-b-xl">
                <div className="font-mono text-[10.5px] text-emerald-300 leading-relaxed">
                  <div className="text-stone-400">// {tpl.parts[selectedPart].name}</div>
                  <div>MATERIAL = {resolvedParts[selectedPart].rMat}</div>
                  <div>DIM = {resolvedParts[selectedPart].rW} × {resolvedParts[selectedPart].rH} × {resolvedParts[selectedPart].rT}</div>
                  <div>QTY = {resolvedParts[selectedPart].rQty}</div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* generated list */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[13px] font-semibold text-stone-900">Generált alkatrészlista</div>
            <div className="text-[11px] text-stone-500">{resolvedParts.length} alkatrész · aktuális paraméterekkel</div>
          </div>
          <button onClick={() => window.toast?.("Anyaglista mentve", "success")}
            className="h-8 px-3 rounded-lg bg-amber-600 text-white text-[11.5px] font-medium hover:bg-amber-700 inline-flex items-center gap-1.5">
            <Icon name="bolt" size={12} />Anyaglista mentése
          </button>
        </div>
        <PartsTable resolvedParts={resolvedParts} tplId={tpl.id} />
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Materials Generator — redesigned wizard
// ──────────────────────────────────────────────────────────────────────────
const WIZARD_STEPS = ["Sablon", "Paraméterek", "Áttekintés", "Kész"];

function MaterialsGenerator() {
  const [step, setStep] = useStateD(0);
  const [tplId, setTplId] = useStateD(PARAM_TEMPLATES[0].id);
  const tpl = PARAM_TEMPLATES.find(t => t.id === tplId);
  const [vars, setVars] = useStateD(() => Object.fromEntries(tpl.vars.map(v => [v.key, v.default])));
  const [qty, setQty] = useStateD(1);
  const [orderRef, setOrderRef] = useStateD("JT-2426-0184");
  const [extras, setExtras] = useStateD([]);
  const [cpId] = useStateD(() => Math.random().toString(36).slice(2, 6).toUpperCase());

  useEffectD(() => { setVars(Object.fromEntries(tpl.vars.map(v => [v.key, v.default]))); }, [tplId]);

  const resolved = useMemoD(() => tpl.parts.map(p => ({
    name: p.name, rMat: resolveFormula(p.mat, vars),
    rW: resolveFormula(p.w, vars), rH: resolveFormula(p.h, vars),
    rT: resolveFormula(p.t, vars), rQty: resolveFormula(p.qty, vars) * qty,
  })), [tpl, vars, qty]);

  const allParts = [...resolved, ...extras];
  const est = useMemoD(() => estimateCost(resolved), [resolved]);

  // unique materials
  const matSummary = useMemoD(() => {
    const m = {};
    resolved.forEach(p => { m[p.rMat] = (m[p.rMat] || 0) + p.rQty; });
    return Object.entries(m).map(([code, total]) => ({ code, total }));
  }, [resolved]);

  const constraintResults = useMemoD(() => tpl.constraints.map(c => {
    try {
      let s = c.expr.replace(/\{([a-z_]+)\.t\}/gi, (_, k) => window.sim.materialInfo(vars[k]).t)
                    .replace(/\{([a-z_]+)\}/gi, (_, k) => vars[k] ?? 0).replace(/×/g, "*");
      return { ...c, ok: !!new Function("return (" + s + ")")() };
    } catch { return { ...c, ok: false }; }
  }), [tpl, vars]);
  const allOk = constraintResults.every(c => c.ok);

  return (
    <div className="px-4 md:px-7 py-5 md:py-6">
      {/* Stepper */}
      <div className="flex items-center gap-1 mb-7">
        {WIZARD_STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full grid place-items-center text-[11.5px] font-bold transition ${
                i < step ? "bg-emerald-600 text-white" : i === step ? "bg-amber-600 text-white shadow shadow-amber-200" : "bg-stone-100 text-stone-500"
              }`}>{i < step ? "✓" : i + 1}</div>
              <span className={`text-[12.5px] transition ${i === step ? "font-semibold text-stone-900" : i < step ? "text-stone-500" : "text-stone-400"}`}>{label}</span>
            </div>
            {i < WIZARD_STEPS.length - 1 && <div className={`flex-1 h-px mx-1 transition ${i < step ? "bg-emerald-300" : "bg-stone-200"}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 0: Template selection ── */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PARAM_TEMPLATES.filter(t => t.id !== "T-04").map(t => (
              <button key={t.id} onClick={() => setTplId(t.id)}
                className={`text-left p-4 rounded-2xl border-2 transition ${tplId === t.id ? "border-amber-500 bg-amber-50/60 shadow-sm shadow-amber-100" : "border-stone-200 bg-white hover:border-stone-300"}`}>
                <div className="mb-3"><TemplateThumb kind={t.thumb} size={72} /></div>
                <div className="text-[13px] font-semibold text-stone-900">{t.name}</div>
                <div className="text-[10.5px] text-stone-500 mt-0.5">{t.type} · v{t.version} · {t.author}</div>
                <div className="flex items-center gap-3 mt-2 text-[10.5px] text-stone-500">
                  <span className="font-mono">{t.uses} ×</span>
                  <span>{t.rating} ★</span>
                  <span className="text-stone-400">{t.vars.length} változó</span>
                </div>
                <div className="mt-2 text-[10.5px] text-stone-500 leading-snug line-clamp-2">{t.note}</div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={() => setStep(1)} className="h-9 px-6 bg-amber-600 text-white text-[12.5px] font-semibold rounded-lg hover:bg-amber-700 inline-flex items-center gap-2">Tovább <Icon name="chevron" size={14} /></button>
          </div>
        </div>
      )}

      {/* ── Step 1: Parameters — split layout ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Left — controls */}
            <div className="col-span-12 lg:col-span-6 space-y-4">
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[13px] font-semibold text-stone-900">{tpl.name}</div>
                    <div className="text-[11px] text-stone-500">{tpl.vars.length} szabad változó</div>
                  </div>
                  <button onClick={() => setStep(0)} className="text-[11px] text-stone-500 hover:text-stone-800 inline-flex items-center gap-1"><Icon name="chevron" size={12} className="rotate-180" />Más sablon</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {tpl.vars.map(v => (
                    <FreeVarControl key={v.key} v={v} value={vars[v.key]} onChange={val => setVars(p => ({ ...p, [v.key]: val }))} />
                  ))}
                </div>
                {/* Constraints inline */}
                {tpl.constraints.length > 0 && (
                  <div className={`mt-4 p-3 rounded-lg text-[11.5px] ${allOk ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                    <div className="flex items-center gap-1.5 font-semibold mb-1">
                      <Icon name={allOk ? "check" : "alert"} size={12} />
                      {allOk ? "Megkötések rendben" : "Megkötés sérül"}
                    </div>
                    {constraintResults.map((c, i) => (
                      <div key={i} className={`text-[10.5px] ${c.ok ? "opacity-70" : "font-semibold"}`}>{c.ok ? "✓" : "✗"} {c.rule}</div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <div className="text-[12px] font-semibold text-stone-900 mb-3">Rendelés hozzárendelés</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Rendelés</div>
                    <select value={orderRef} onChange={e => setOrderRef(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-stone-200 text-[12px] bg-white">
                      <option>JT-2426-0184 — Bognár Bútor Kft.</option>
                      <option>JT-2426-0182 — Doorstar Hungary Zrt.</option>
                      <option>JT-2426-0180 — Hegyi Lakberendezés</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Darabszám</div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold grid place-items-center text-[15px]">−</button>
                      <input type="number" value={qty} min={1} onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                        className="flex-1 h-9 text-center rounded-lg border border-stone-200 text-[13px] font-semibold font-mono outline-none focus:border-amber-400" />
                      <button onClick={() => setQty(q => q + 1)} className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold grid place-items-center text-[15px]">+</button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right — live preview + summary */}
            <div className="col-span-12 lg:col-span-6 space-y-3">
              <Card className="p-4">
                <div className="text-[12px] font-semibold text-stone-900 mb-3">Élő előnézet</div>
                <div className="bg-gradient-to-br from-stone-50 to-amber-50/20 rounded-xl border border-stone-100 py-4 flex items-center justify-center">
                  <ParametricSVG tpl={tpl} vars={vars} resolvedParts={resolved} />
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-[12px] font-semibold text-stone-900 mb-3">Összesítő</div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: "Alkatrész", value: resolved.reduce((a, p) => a + p.rQty, 0), sub: "db összesen" },
                    { label: "Anyagféle", value: matSummary.length, sub: "különböző" },
                    { label: "Darabszám", value: qty, sub: "db szekrény" },
                  ].map(s => (
                    <div key={s.label} className="bg-stone-50 rounded-lg p-2.5 text-center">
                      <div className="text-[18px] font-semibold tabular-nums text-stone-900">{s.value}</div>
                      <div className="text-[9.5px] text-stone-500 uppercase tracking-wide">{s.sub}</div>
                    </div>
                  ))}
                </div>
                {/* Material breakdown */}
                <div className="space-y-1.5 mb-3">
                  {matSummary.map(m => (
                    <div key={m.code} className="flex items-center gap-2 text-[11.5px]">
                      <span className="w-3 h-3 rounded-sm border border-stone-200 shrink-0" style={{ background: materialColor(m.code) }} />
                      <span className="flex-1 text-stone-700 truncate">{materialLabel(m.code)}</span>
                      <span className="font-mono text-stone-600 shrink-0">{m.total} db</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-stone-100 pt-3 flex items-baseline justify-between">
                  <div className="text-[11px] text-stone-500">Becsült anyagköltség</div>
                  <div className="text-[18px] font-semibold text-amber-700 tabular-nums">{fmtHUF(est * qty)}</div>
                </div>
              </Card>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(0)} className="h-9 px-4 border border-stone-200 text-[12px] rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Icon name="chevron" size={13} className="rotate-180" />Vissza</button>
            <button onClick={() => setStep(2)} disabled={!allOk}
              className={`h-9 px-6 text-[12.5px] font-semibold rounded-lg inline-flex items-center gap-2 ${allOk ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-stone-200 text-stone-400 cursor-not-allowed"}`}>
              Áttekintés <Icon name="chevron" size={14} /></button>
          </div>
        </div>
      )}

      {/* ── Step 2: Review ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-8">
              <Card className="p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-semibold text-stone-900">{tpl.name}</div>
                    <div className="text-[11px] text-stone-500">{allParts.length} alkatrész · {qty} db · {orderRef.split(" — ")[0]}</div>
                  </div>
                  <button onClick={() => setExtras(p => [...p, { name: "Egyedi alkatrész " + (p.length + 1), rMat: "EG-3303-18", rW: 400, rH: 400, rT: 18, rQty: 1 }])}
                    className="h-8 px-3 rounded-lg border border-stone-200 text-[11.5px] font-medium text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1.5">
                    <Icon name="plus" size={12} />Egyedi hozzáadása
                  </button>
                </div>
                <PartsTable resolvedParts={allParts} tplId={tpl.id} />
              </Card>
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-3">
              <Card className="p-4">
                <div className="bg-gradient-to-br from-stone-50 to-amber-50/20 rounded-xl border border-stone-100 py-4 flex items-center justify-center mb-3">
                  <ParametricSVG tpl={tpl} vars={vars} resolvedParts={resolved} />
                </div>
                <div className="text-[11.5px] text-stone-600 leading-relaxed">{tpl.note}</div>
              </Card>
              <Card className="p-4 space-y-2">
                <div className="text-[12px] font-semibold text-stone-900 mb-2">Összefoglalás</div>
                {[
                  { label: "Rendelés", value: orderRef.split(" — ")[0], mono: true },
                  { label: "Sablon", value: tpl.name },
                  { label: "Darabszám", value: qty + " db", mono: true },
                  { label: "Alkatrész összesen", value: allParts.length + " db", mono: true },
                ].map(r => (
                  <div key={r.label} className="flex items-baseline justify-between text-[11.5px]">
                    <span className="text-stone-500">{r.label}</span>
                    <span className={`font-medium text-stone-900 ${r.mono ? "font-mono" : ""}`}>{r.value}</span>
                  </div>
                ))}
                <div className="border-t border-stone-100 pt-2 flex items-baseline justify-between">
                  <span className="text-[11.5px] text-stone-500">Becsült anyagköltség</span>
                  <span className="text-[15px] font-semibold text-amber-700 tabular-nums">{fmtHUF(est * qty)}</span>
                </div>
              </Card>
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="h-9 px-4 border border-stone-200 text-[12px] rounded-lg hover:bg-stone-50 inline-flex items-center gap-1.5"><Icon name="chevron" size={13} className="rotate-180" />Paraméterek</button>
            <button onClick={() => { setStep(3); window.toast?.("Szabászlistába küldve · CP-" + cpId, "success"); }}
              className="h-9 px-6 bg-emerald-600 text-white text-[12.5px] font-semibold rounded-lg hover:bg-emerald-700 inline-flex items-center gap-2"><Icon name="bolt" size={14} />Szabászlistába küldés</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 3 && (
        <Card className="p-10">
          <div className="max-w-sm mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 grid place-items-center mx-auto mb-4">
              <Icon name="check" size={28} />
            </div>
            <div className="text-[20px] font-semibold tracking-tight text-stone-900">Szabászlistába küldve</div>
            <div className="text-[12.5px] text-stone-500 mt-1">{allParts.length} alkatrész · {qty} db · {orderRef.split(" — ")[0]}</div>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-[11.5px] font-mono">
              Cutting Plan: CP-{cpId}
            </div>
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => { setStep(0); setExtras([]); }} className="h-9 px-4 border border-stone-200 text-[12px] rounded-lg hover:bg-stone-50">Új generálás</button>
              <button className="h-9 px-4 bg-stone-900 text-white text-[12px] rounded-lg hover:bg-stone-800 inline-flex items-center gap-1.5"><Icon name="external" size={13} />Gyártás → Szabászat</button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Design Catalog
// ──────────────────────────────────────────────────────────────────────────
function DesignCatalog() {
  return <WorldCatalog worldId="design" />;
}
window.DesignDashboard = DesignDashboard;
window.TemplateThumb = TemplateThumb;
window.TemplateEditor = TemplateEditor;
window.MaterialsGenerator = MaterialsGenerator;
window.DesignCatalog = DesignCatalog;
// Újrahasznált a Termékkonfigurátorban (page-configurator.jsx, külön Babel scope)
window.ParametricSVG = ParametricSVG;
window.FreeVarControl = FreeVarControl;
window.resolveFormula = resolveFormula;
window.PartsTable = PartsTable;
window.PartMiterEditor = PartMiterEditor;
