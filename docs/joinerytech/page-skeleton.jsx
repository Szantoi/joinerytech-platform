// ──────────────────────────────────────────────────────────────────────────
// page-skeleton.jsx — SKELETON (VÁZ) SZERKESZTŐK (woodwork_domain §21)
//
//   A sablon-szerkesztő (EngTemplateEditor) váz-szekciói:
//     • SkelPlanes      — képletes referenciasíkok (fő + belső síkok)
//     • SkelConnections — KÖTÉS-objektumok a síkokon (technológia kötelező)
//     • SkelBinding     — a kiválasztott alkatrész 6 határoló kényszere
//     • SkelErrors      — „kényszerezetlen érintkezés” validáció
//   Motor: window.Skel (skeleton-engine.js). A szülő adja: tpl, editable,
//   upd(patch), solved (Skel.solve), selPart, selConn/onSelConn.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateSK } = React;

const SK_IN = "h-7 px-1.5 rounded-md border border-stone-200 bg-white text-[11px] text-stone-800 outline-none focus:border-amber-400 disabled:bg-stone-50 disabled:text-stone-400";
const SK_AXIS = { X: "X — szélesség", Y: "Y — mélység", Z: "Z — magasság" };

// ── Síkok ──
function SkelPlanes({ tpl, editable, upd, solved, selPlane, onSelPlane }) {
  const planes = ((tpl.skeleton || {}).planes) || [];
  const vals = Object.fromEntries((solved.planes || []).map((p) => [p.id, p.value]));
  const patch = (i, p) => upd({ skeleton: { ...tpl.skeleton, planes: planes.map((x, idx) => (idx === i ? { ...x, ...p } : x)) } });
  const del = (i) => upd({ skeleton: { ...tpl.skeleton, planes: planes.filter((_, idx) => idx !== i) } });
  const add = () => {
    const id = "pl-" + Date.now().toString(36).slice(-4);
    upd({ skeleton: { ...tpl.skeleton, planes: [...planes, { id, label: "Új sík", axis: "Z", formula: "{height} / 2" }] } });
    onSelPlane && onSelPlane(id);
  };
  return (
    <div>
      <div className="hidden sm:grid grid-cols-[1fr_120px_1.2fr_70px_auto] gap-1.5 px-1 text-[9.5px] uppercase tracking-wide text-stone-400 mb-1">
        <span>Sík</span><span>Tengely</span><span>Képlet</span><span>Érték</span><span></span>
      </div>
      <div className="space-y-1">
        {planes.map((p, i) => (
          <div key={p.id} onClick={() => onSelPlane && onSelPlane(p.id)}
            className={`grid grid-cols-2 sm:grid-cols-[1fr_120px_1.2fr_70px_auto] gap-1.5 items-center rounded-lg border p-1.5 cursor-pointer ${selPlane === p.id ? "border-amber-300 bg-amber-50/40" : "border-stone-100"}`}>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="shrink-0 text-[9px] font-mono text-stone-400">{p.id}</span>
              <input value={p.label || ""} disabled={!editable} onChange={(e) => patch(i, { label: e.target.value })} className={`w-full ${SK_IN}`} />
            </div>
            <select value={p.axis} disabled={!editable || !!p.main} onChange={(e) => patch(i, { axis: e.target.value })} className={SK_IN}>
              {Object.entries(SK_AXIS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input value={p.formula} disabled={!editable} onChange={(e) => patch(i, { formula: e.target.value })} className={`font-mono ${SK_IN}`} />
            <span className="text-[10.5px] font-mono text-stone-600">{vals[p.id] != null && isFinite(vals[p.id]) ? Math.round(vals[p.id] * 10) / 10 : "—"}</span>
            {editable && !p.main
              ? <button onClick={(e) => { e.stopPropagation(); del(i); }} className="text-stone-300 hover:text-rose-500 justify-self-end"><Icon name="x" size={13} /></button>
              : <span className="text-[8.5px] uppercase text-stone-300 justify-self-end">{p.main ? "fő" : ""}</span>}
          </div>
        ))}
      </div>
      {editable && <button onClick={add} className="mt-2 h-7 px-2.5 rounded-lg text-[11px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 inline-flex items-center gap-1"><Icon name="plus" size={11} />Belső sík</button>}
    </div>
  );
}

// ── Kötés-objektumok a síkokon ──
function SkelConnections({ tpl, editable, upd, solved, selConn, onSelConn }) {
  const T = window.Skel.SKEL_CONN_TYPES, ORD = window.Skel.SKEL_CONN_ORDER, ST = window.Skel.SKEL_STATE;
  const conns = tpl.connections || [];
  const planes = ((tpl.skeleton || {}).planes) || [];
  const partNames = (tpl.parts || []).map((p) => p.name);
  const states = Object.fromEntries((solved.joints || []).map((j) => [j.id, j.state]));
  const patch = (i, p) => upd({ connections: conns.map((x, idx) => (idx === i ? { ...x, ...p } : x)) });
  const del = (i) => upd({ connections: conns.filter((_, idx) => idx !== i) });
  const add = () => {
    const id = "c-" + Date.now().toString(36).slice(-4);
    upd({ connections: [...conns, { id, type: "koldokcsap", a: partNames[0] || "", b: partNames[1] || "", plane: (planes[0] || {}).id, side: "+", offset: 0, note: "" }] });
    onSelConn && onSelConn(id);
  };
  return (
    <div className="space-y-1.5">
      {conns.map((c, i) => {
        const ct = T[c.type] || {};
        const st = ST[states[c.id]] || ST.hianyos;
        const sel = selConn === c.id;
        return (
          <div key={c.id} onClick={() => onSelConn && onSelConn(c.id)}
            className={`rounded-xl border p-2 cursor-pointer ${sel ? "ring-2 ring-amber-400 border-amber-200" : "border-stone-100"} bg-stone-50/40`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9.5px] font-mono text-stone-400">{c.id}</span>
                <span className={`inline-flex items-center px-1.5 h-5 rounded-full border text-[10px] font-medium ${ct.pill || ""}`}>{ct.label || c.type}</span>
                <span className={`inline-flex items-center px-1.5 h-5 rounded-full border text-[10px] font-medium ${st.pill}`}>{st.label}</span>
              </div>
              {editable && <button onClick={(e) => { e.stopPropagation(); del(i); }} className="text-stone-300 hover:text-rose-500"><Icon name="x" size={13} /></button>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-[1.2fr_1fr_1fr] gap-1.5">
              <label className="block"><span className="text-[9px] uppercase tracking-wide text-stone-400">Kötés-típus (kötelező)</span>
                <select value={c.type} disabled={!editable} onChange={(e) => patch(i, { type: e.target.value })} className={`w-full mt-0.5 ${SK_IN}`}>
                  {ORD.map((k) => <option key={k} value={k}>{T[k].label}</option>)}
                </select></label>
              <label className="block"><span className="text-[9px] uppercase tracking-wide text-stone-400">„A” elem</span>
                <select value={c.a} disabled={!editable} onChange={(e) => patch(i, { a: e.target.value })} className={`w-full mt-0.5 ${SK_IN}`}>
                  {partNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select></label>
              <label className="block"><span className="text-[9px] uppercase tracking-wide text-stone-400">„B” elem</span>
                <select value={c.b} disabled={!editable} onChange={(e) => patch(i, { b: e.target.value })} className={`w-full mt-0.5 ${SK_IN}`}>
                  {partNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select></label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-[1fr_92px_76px_1fr] gap-1.5 mt-1.5 items-end">
              <label className="block"><span className="text-[9px] uppercase tracking-wide text-stone-400">Csatlakozási sík</span>
                <select value={c.plane || ""} disabled={!editable} onChange={(e) => patch(i, { plane: e.target.value })} className={`w-full mt-0.5 ${SK_IN}`}>
                  {planes.map((p) => <option key={p.id} value={p.id}>{p.label || p.id}</option>)}
                </select></label>
              <label className="block" title="Egy sík KÉTFÉLEKÉPPEN tud csatlakozni — a normál iránya dönti el, melyik oldala fogad.">
                <span className="text-[9px] uppercase tracking-wide text-stone-400">Normál</span>
                <div className="mt-0.5 grid grid-cols-2 rounded-md border border-stone-200 overflow-hidden h-7">
                  {["+", "-"].map((s) => (
                    <button key={s} disabled={!editable} onClick={(e) => { e.stopPropagation(); patch(i, { side: s }); }}
                      className={`text-[11px] font-mono font-semibold ${c.side === s ? "bg-amber-500 text-white" : "bg-white text-stone-500"}`}>{s}n</button>
                  ))}
                </div>
              </label>
              <label className="block"><span className="text-[9px] uppercase tracking-wide text-stone-400">{c.type === "polcfurat" ? "Sor-besorolás" : "Eltolás"} (mm)</span>
                <input type="number" value={c.offset || 0} disabled={!editable} onChange={(e) => patch(i, { offset: Number(e.target.value) || 0 })} className={`w-full mt-0.5 ${SK_IN}`} /></label>
              <input value={c.note || ""} disabled={!editable} placeholder="Megjegyzés…" onChange={(e) => patch(i, { note: e.target.value })} className={`${SK_IN} w-full`} />
            </div>
          </div>
        );
      })}
      {!conns.length && <div className="text-[12px] text-stone-400">Nincs kötés — kapcsolat csak kötés-típussal (technológiával) létezhet.</div>}
      {editable && <button onClick={add} className="h-7 px-2.5 rounded-lg text-[11px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 inline-flex items-center gap-1"><Icon name="plus" size={11} />Új kötés</button>}
    </div>
  );
}

// ── A kiválasztott alkatrész 6 határoló kényszere ──
function SkelBinding({ tpl, editable, upd, partIdx, solved }) {
  const part = (tpl.parts || [])[partIdx];
  if (!part) return null;
  const planes = ((tpl.skeleton || {}).planes) || [];
  const b = part.binding || {};
  const sp = (solved.parts || []).find((p) => p.name === part.name);
  const patchAx = (ax, side, p) => {
    const nb = { ...b, [ax]: { ...(b[ax] || { min: {}, max: {} }), [side]: { ...((b[ax] || {})[side] || {}), ...p } } };
    upd({ parts: tpl.parts.map((x, idx) => (idx === partIdx ? { ...x, binding: nb } : x)) });
  };
  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-1.5 text-[10.5px] text-stone-500">
        <span className="font-medium text-stone-700">{part.name}</span>
        {sp && <span className="font-mono">→ {Math.round(sp.w)}×{Math.round(sp.h)}×{Math.round(sp.t)} mm</span>}
        {sp && <span className="text-stone-400">vastagság-tengely: <span className="font-mono text-stone-600">{sp.tAxis}</span></span>}
        {!part.binding && <span className="text-rose-600 font-medium">nincs kényszerezve</span>}
      </div>
      <div className="space-y-1">
        {["X", "Y", "Z"].map((ax) => (
          <div key={ax} className={`grid grid-cols-[26px_1fr_64px_1fr_64px] gap-1.5 items-center rounded-lg border p-1.5 ${sp && sp.tAxis === ax ? "border-amber-200 bg-amber-50/30" : "border-stone-100"}`}>
            <span className="text-[10px] font-mono font-semibold text-stone-500" title={SK_AXIS[ax]}>{ax}{sp && sp.tAxis === ax ? "ᵗ" : ""}</span>
            {["min", "max"].map((side) => {
              const c = (b[ax] || {})[side] || {};
              return (
                <React.Fragment key={side}>
                  <select value={c.plane || ""} disabled={!editable} onChange={(e) => patchAx(ax, side, { plane: e.target.value })} className={SK_IN}>
                    <option value="">{side === "min" ? "min sík…" : "max sík…"}</option>
                    {planes.filter((p) => p.axis === ax).map((p) => <option key={p.id} value={p.id}>{p.label || p.id}</option>)}
                  </select>
                  <input value={c.off == null ? "" : c.off} disabled={!editable} placeholder="offset"
                    onChange={(e) => patchAx(ax, side, { off: e.target.value })} className={`font-mono ${SK_IN}`} />
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-1 text-[10px] text-stone-400">min/max sík + offset tengelyenként — a méret és a pozíció ebből SZÁRMAZIK (a w/h/t képletek automatikusan íródnak). Azonos sík min+max = vastagság-kényszer.</div>
    </div>
  );
}

// ── Validáció: kényszerezetlen érintkezés ──
function SkelErrors({ solved, editable, onFix }) {
  const errs = solved.errors || [];
  if (!errs.length) return (
    <div className="flex items-center gap-2 text-[12px] text-emerald-700"><span className="w-4 h-4 rounded-full bg-emerald-500 text-white grid place-items-center"><Icon name="check" size={10} /></span>Minden érintkezés kötéssel deklarált — a modell teljesen kényszerezett.</div>
  );
  return (
    <div className="space-y-1.5">
      {errs.map((e, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5">
          <Icon name="alert" size={13} className="text-rose-500 shrink-0" />
          <div className="flex-1 text-[11.5px] text-rose-800"><span className="font-medium">{e.a} ↔ {e.b}</span> — {e.msg}</div>
          {editable && onFix && <button onClick={() => onFix(e)} className="shrink-0 h-7 px-2 rounded-md text-[10.5px] font-semibold bg-rose-600 text-white hover:bg-rose-700">Kötés létrehozása</button>}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { SkelPlanes, SkelConnections, SkelBinding, SkelErrors });
