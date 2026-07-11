// ──────────────────────────────────────────────────────────────────────────
// page-mfg-prep-flow.jsx — Vonalas folyamatábra (per-alkatrész, anyagtípus-vezérelt)
//
//   A „Faipar műszaki dokumentáció" tankönyv legösszetettebb táblázata, élővé téve:
//   SOR = művelet (technológiai sorrend), OSZLOP = alkatrész. Minden alkatrész a
//   SAJÁT útvonalát járja be (pont a műveleten, függőleges vonal a pontjai közt).
//   Az ANYAGTÍPUS vezérli: a LAPANYAG rövid (szabás→élzárás→…), a TÖMÖRFA hosszú
//   (válogatás→darabolás→…→felület) útvonalat kap — ugyanabban a mátrixban
//   láthatóan elkülönülve (lap = teal, tömörfa = amber oszlopok).
//
//   Forrás-motor: MfgPrep.partRoutes(project) (tiszta számítás). Scope: mf.
// ──────────────────────────────────────────────────────────────────────────
const { useMemo: useMemoMf } = React;

const MF_ROW_H = 28;
const MF_HDR_H = 104;
const MF_COL_W = 34;
const MF_LABEL_W = 168;

function PrepFlowMatrix({ project }) {
  const routes = useMemoMf(() => (window.MfgPrep && window.MfgPrep.partRoutes ? window.MfgPrep.partRoutes(project) : null), [project]);
  if (!routes || !routes.parts.length) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-[12.5px] text-stone-500">
        Nincs levezethető alkatrész a vonalas folyamatábrához. Előbb generáld a szükségletet, vagy adj tételt a munkához.
      </div>
    );
  }

  const KINDS = window.WW_MATERIAL_KINDS || {};
  const ops = routes.ops; // használt műveletek, technológiai sorrendben
  const opIndex = Object.fromEntries(ops.map((o, i) => [o.key, i]));

  // oszlop-rendezés: anyagtípus (lap előbb), majd tétel, majd név → a lap/tömör blokk elkülönül
  const kindRank = { sheet: 0, solidwood: 1 };
  const parts = routes.parts.slice().sort((a, b) =>
    (kindRank[a.kind] - kindRank[b.kind]) || a.itemName.localeCompare(b.itemName) || a.name.localeCompare(b.name));

  // elem-csoportok (cím-hierarchia): egymás melletti azonos elem oszlopai
  const elemGroups = [];
  parts.forEach((pt, i) => {
    const el = (pt.ref && pt.ref.element) || pt.itemName || "—";
    const last = elemGroups[elemGroups.length - 1];
    if (last && last.element === el) { last.count++; last.parts.push(pt); }
    else elemGroups.push({ element: el, count: 1, startCol: i, parts: [pt] });
  });
  // identitás-váltás: merge-műveleteknél (táblásítás/összeépítés) az elem oszlopai
  // EGY egységgé olvadnak — vízszintes összekötő a csoport oszlopai felett.
  const mergeByStartCol = {};
  elemGroups.forEach((g) => {
    if (g.count < 2) return;
    const rows = [];
    ops.forEach((op, ri) => { if (op.merge && g.parts.filter((p) => p.ops.includes(op.key)).length >= 2) rows.push(ri); });
    if (rows.length) mergeByStartCol[g.startCol] = { count: g.count, rows, element: g.element };
  });
  const prodType = (window.WW_PROD_TYPES && window.wwProdType) ? window.WW_PROD_TYPES[window.wwProdType(routes.units)] : null;

  return (
    <div className="space-y-4">
      <MfHead />

      {/* anyagtípus-összegző */}
      <div className="flex flex-wrap gap-2">
        {(window.WW_KIND_ORDER || []).filter((k) => routes.kindCounts[k] > 0).map((k) => {
          const m = KINDS[k] || {};
          return (
            <div key={k} className={`rounded-xl border px-3.5 py-2.5 flex items-start gap-2.5 max-w-md ${m.soft || "bg-stone-50"}`}>
              <span className="shrink-0 w-7 h-7 rounded-lg grid place-items-center mt-0.5" style={{ background: (m.accent || "#888") + "22", color: m.accent }}><Icon name={m.icon || "box"} size={15} /></span>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold">{m.label} — <span className="tabular-nums">{routes.kindCounts[k]}</span> alkatrész</div>
                <div className="text-[10.5px] opacity-80 leading-snug">{m.note}</div>
              </div>
            </div>
          );
        })}
        {prodType && (
          <div className={`rounded-xl border px-3.5 py-2.5 flex items-start gap-2.5 max-w-md ${prodType.soft}`}>
            <span className="shrink-0 w-7 h-7 rounded-lg grid place-items-center mt-0.5" style={{ background: prodType.accent + "22", color: prodType.accent }}><Icon name={prodType.icon} size={15} /></span>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold">{prodType.label} <span className="opacity-70 font-normal">· {routes.units} egység</span></div>
              <div className="text-[10.5px] opacity-80 leading-snug">{prodType.note}</div>
            </div>
          </div>
        )}
      </div>

      {(routes.site || routes.room) && (
        <div className="flex items-center gap-1.5 text-[11.5px] text-stone-600 -mt-1">
          <Icon name="briefcase" size={13} className="text-stone-400 shrink-0" />
          <span className="font-medium">{[routes.site, routes.room].filter(Boolean).join(" · ")}</span>
          <span className="text-stone-400 truncate">— a cím helyszín/helyiség szintje; a teljes cím az oszlop tooltipjében</span>
        </div>
      )}

      {/* a mátrix */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-x-auto">
        <div className="min-w-max">
          {/* elem-csoport sáv (cím-hierarchia: csoport/elem) */}
          <div className="flex border-b border-stone-100">
            <div className="shrink-0 sticky left-0 z-20 bg-white" style={{ width: MF_LABEL_W }} />
            {elemGroups.map((g, gi) => (
              <div key={gi} className="shrink-0 px-1 pt-1.5 pb-1 text-center border-l border-stone-100 first:border-l-0" style={{ width: g.count * MF_COL_W }}>
                <span className="block text-[9.5px] font-medium text-stone-500 truncate leading-tight" title={g.element}>{g.element}</span>
              </div>
            ))}
          </div>
        <div className="inline-flex min-w-full">
          {/* művelet-címke oszlop (ragad) */}
          <div className="shrink-0 sticky left-0 z-10 bg-white border-r border-stone-200">
            <div className="flex items-end px-3 pb-1.5 text-[10px] uppercase tracking-wide text-stone-400 font-medium" style={{ height: MF_HDR_H }}>
              Művelet&nbsp;\&nbsp;Alkatrész
            </div>
            {ops.map((op) => {
              const st = (window.PROD_KINDS || {})[op.station] || {};
              return (
                <div key={op.key} className="flex items-center gap-2 px-3 border-t border-stone-100" style={{ height: MF_ROW_H }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: op.terminal ? "#a8a29e" : (st.accent || "#0d9488") }} />
                  <span className={`text-[11.5px] truncate ${op.front ? "text-amber-700" : "text-stone-700"} ${op.terminal ? "font-semibold text-stone-900" : ""}`}>{op.label}</span>
                  {op.front && <span className="ml-auto text-[8.5px] uppercase tracking-wide text-amber-500 shrink-0">tömör</span>}
                </div>
              );
            })}
          </div>

          {/* alkatrész-oszlopok */}
          {parts.map((pt, ci) => {
            const m = KINDS[pt.kind] || {};
            const idxs = pt.ops.map((k) => opIndex[k]).filter((x) => x != null).sort((a, b) => a - b);
            const first = idxs[0], last = idxs[idxs.length - 1];
            return (
              <div key={ci} className="shrink-0 border-r border-stone-50 last:border-r-0" style={{ width: MF_COL_W }} title={(window.wwPartAddr ? window.wwPartAddr(pt.ref, "full") : (pt.itemName + " · " + pt.name)) + " — " + pt.matName + " (" + m.label + ")"}>
                {/* fej — forgatott alkatrésznév + anyag-szín */}
                <div className="relative flex justify-center items-end pb-1.5" style={{ height: MF_HDR_H }}>
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full" style={{ background: m.accent }} />
                  <div className="text-[10.5px] text-stone-600 whitespace-nowrap leading-none" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", maxHeight: MF_HDR_H - 18, overflow: "hidden" }}>{pt.name}</div>
                </div>
                {/* track */}
                <div className="relative" style={{ height: ops.length * MF_ROW_H }}>
                  {/* összekötő függőleges vonal (anyag-szín) */}
                  {idxs.length > 1 && (
                    <div className="absolute left-1/2 -translate-x-1/2 rounded" style={{ top: first * MF_ROW_H + MF_ROW_H / 2, height: (last - first) * MF_ROW_H, width: 2, background: m.accent }} />
                  )}
                  {mergeByStartCol[ci] && mergeByStartCol[ci].rows.map((ri) => (
                    <div key={"mg" + ri} className="absolute h-0.5 z-10 rounded bg-stone-400" title={"Összeépítés — " + mergeByStartCol[ci].element + " egységgé"} style={{ top: ri * MF_ROW_H + MF_ROW_H / 2 - 1, left: MF_COL_W / 2, width: (mergeByStartCol[ci].count - 1) * MF_COL_W }} />
                  ))}
                  {ops.map((op, ri) => {
                    const on = pt.ops.includes(op.key);
                    return (
                      <div key={op.key} className="absolute left-0 right-0 border-t border-stone-50" style={{ top: ri * MF_ROW_H, height: MF_ROW_H }}>
                        {on && (
                          <div className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ top: MF_ROW_H / 2 - (op.terminal ? 4 : 3), width: op.terminal ? 8 : 6, height: op.terminal ? 8 : 6, background: m.accent, boxShadow: op.terminal ? `0 0 0 2px ${m.accent}33` : "none" }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* magyarázat */}
      <div className="flex items-start gap-2.5 bg-stone-50 border border-stone-200/70 rounded-xl px-4 py-3 text-[11.5px] text-stone-600">
        <Icon name="route" size={15} className="mt-0.5 shrink-0 text-stone-400" />
        <div>
          Minden oszlop egy <span className="font-medium">alkatrész</span>, a saját útvonalával — a pont jelzi, mely műveleten megy át. Az
          <span className="text-teal-700 font-medium"> lapanyag</span> a <span className="font-medium">Szabással</span> kezd (rövid lánc); a
          <span className="text-amber-700 font-medium"> tömörfa</span> a <span className="font-medium">Válogatás → Darabolás → … → Vastagolás</span> front-enddel,
          folyamatos szelektálással (hosszú lánc). Az <span className="font-medium">anyagtípus vezérli</span> az útvonalat, nem a termék.
        </div>
      </div>
    </div>
  );
}

function MfHead() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-teal-50 text-teal-600 mt-0.5"><Icon name="workflow" size={15} /></div>
      <div>
        <div className="text-[14px] font-semibold text-stone-900">Vonalas folyamatábra — per-alkatrész útvonal</div>
        <div className="text-[11.5px] text-stone-500 leading-snug max-w-2xl">Alkatrészenkénti technológiai útvonal, anyagtípus szerint. A lapanyag és a tömörfa alkatrész eltérő műveletsoron megy át; az oszlopok színe az anyagtípus (teal = lap, amber = tömörfa).</div>
      </div>
    </div>
  );
}

Object.assign(window, { PrepFlowMatrix });
