// ──────────────────────────────────────────────────────────────────────────
// page-floorplan-2.jsx — FpInspector: a Térrendezés jobb oldali panele
//
//   A RÉSZLETESSÉG-LÉTRA (LOD) megtestesítője — a kijelölés típusa dönti el,
//   MENNYI adat töltődik be:
//     • semmi / helyiség / zóna / kontúr → TÉR-szint: név + méret, ennyi elég
//     • bútorsor-elem (kivetített)       → ELEM-szint: kivitel + ár + száll. idő
//        (a snapshot mezőiből — NEM hívunk MfgPrep-et, nem oldunk fel furatot!)
//     • műszaki szint → NEM itt él; deep-link a Tervezés → Gyártás-adatlapra
//   Falnézet-kezelés: helyiség-oldalanként bútorsor link/létrehozás/megnyitás.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateFp2 } = React;

// LOD-létra kijelző
function FpLodLadder({ level }) {
  const steps = [["ter", "Tér"], ["elem", "Elem"], ["muszaki", "Műszaki"]];
  return (
    <div className="flex items-center gap-1">
      {steps.map(([k, lbl], i) => (
        <React.Fragment key={k}>
          {i > 0 && <Icon name="chevron" size={10} className="text-stone-300" />}
          <span className={`px-1.5 h-5 inline-flex items-center rounded text-[10px] font-semibold ${k === level ? "bg-rose-100 text-rose-700" : k === "muszaki" ? "bg-stone-100 text-stone-400" : "bg-stone-100 text-stone-500"}`}>{lbl}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function FpCard({ title, right, children }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between gap-2">
        <div className="text-[12px] font-semibold text-stone-900">{title}</div>{right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
const fpField = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] focus:outline-none focus:border-rose-300";

function FpInspector({ concept, fp, sel, setSel, mode, palette, palettePick, setPalettePick, compos }) {
  // bútor-paletta mód
  if (mode === "furn") return <FpPalette palette={palette} pick={palettePick} setPick={setPalettePick} />;

  if (sel && sel.type === "room") return <FpRoomPanel concept={concept} fp={fp} rid={sel.id} setSel={setSel} compos={compos} />;
  if (sel && sel.type === "zone") return <FpZonePanel concept={concept} fp={fp} zid={sel.id} setSel={setSel} />;
  if (sel && sel.type === "furn") return <FpFurnPanel concept={concept} fp={fp} fid={sel.id} setSel={setSel} />;
  if (sel && sel.type === "citem") return <FpItemPanel sel={sel} compos={compos} />;

  // üres állapot — az elv magyarázata + a DMS-ből hivatkozott dokumentumok
  const linked = fp.rooms.reduce((n, r) => n + Object.values(r.walls || {}).filter(Boolean).length, 0);
  return (
    <>
    <FpCard title="Részletesség szintenként" right={<FpLodLadder level="ter" />}>
      <div className="space-y-2.5 text-[11.5px] text-stone-600 leading-snug">
        <p>A tér-szinten <span className="font-medium text-stone-800">kontúr + név + méret</span> él — a modell csak ennyit tölt be. Az árhoz/időhöz elem-szint, a furathoz műszaki szint kell.</p>
        <div className="rounded-lg bg-stone-50 border border-stone-100 p-2.5 space-y-1">
          {[["Helyiség", fp.rooms.length], ["Zóna", (fp.zones || []).length], ["Bútor-kontúr", (fp.furn || []).length], ["Linkelt falnézet", linked]].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between"><span className="text-stone-500">{k}</span><span className="font-semibold text-stone-900 tabular-nums">{v}</span></div>
          ))}
        </div>
        <p className="text-[10.5px] text-stone-400">Jelölj ki egy alakzatot a vásznon, vagy válassz módot az eszköztárból. A kivetített (rózsaszín) bútorsor-elemre kattintva az elem-szint nyílik.</p>
      </div>
    </FpCard>
    <FpDocsCard concept={concept} />
    </>
  );
}

// ── a koncepció dokumentumai — ugyanaz a DMS, hivatkozással ─────────────────
function FpDocsCard({ concept }) {
  const docs = (concept.projectRef && window.sim.docsFor) ? window.sim.docsFor("project", concept.projectRef) : [];
  if (!concept.projectRef) return null;
  return (
    <FpCard title="Dokumentumok (Dokumentumtár)" right={<button onClick={() => window.navigateTo && window.navigateTo("docs", "all")} className="text-[10.5px] text-violet-600 hover:underline">Megnyitás →</button>}>
      {docs.length === 0 ? (
        <div className="text-[11px] text-stone-400">Nincs a projekthez ({concept.projectRef}) linkelt dokumentum.</div>
      ) : (
        <div className="space-y-1.5">
          {docs.slice(0, 5).map((d) => {
            const st = (window.DOC_STATUS || {})[d.status] || {};
            return (
              <div key={d.id} className="flex items-center gap-2 text-[11.5px]">
                <Icon name="folder" size={12} className="text-violet-400 shrink-0" />
                <span className="text-stone-800 font-medium truncate flex-1">{d.name}</span>
                <span className="text-stone-400 font-mono text-[9.5px] shrink-0">v{d.version}</span>
                <span className={`px-1.5 h-4 inline-flex items-center rounded text-[9px] font-medium shrink-0 ${st.pill || "bg-stone-100 text-stone-500"}`}>{st.label || d.status}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="text-[10px] text-stone-400 mt-2 leading-snug">A metaadat + verzió a Dokumentumtárban él — a tér csak hivatkozik. Az egyedi elem-kérés rajz-helye is ott születik.</div>
    </FpCard>
  );
}

// ── bútor-paletta: a műszaki skeletonok + szabad kontúrok + egyedi kérés ──
function FpPalette({ palette, pick, setPick }) {
  const [reqOpen, setReqOpen] = useStateFp2(false);
  const [req, setReq] = useStateFp2({ name: "", width: 800, height: 720, depth: 560, note: "" });
  const sendReq = () => {
    if (!req.name.trim()) return;
    const id = window.sim.requestCustomTemplate(req);
    if (id) setPick({ kind: "tpl", tplId: id, label: req.name.trim(), w: Number(req.width) || 800, d: Number(req.depth) || 560, pending: true });
    setReqOpen(false); setReq({ name: "", width: 800, height: 720, depth: 560, note: "" });
  };
  return (
    <FpCard title="Bútor-kontúr paletta" right={<FpLodLadder level="ter" />}>
      <div className="text-[10.5px] text-stone-400 mb-2">Parametrikus skeletonok (Műszaki tervezés registry) — a kontúr a váz befoglalója:</div>
      <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
        {palette.tpls.map((t) => (
          <button key={t.tplId} onClick={() => setPick(t)}
            className={`w-full text-left rounded-lg border px-2.5 py-1.5 flex items-center gap-2 ${pick && pick.tplId === t.tplId ? "border-rose-300 bg-rose-50" : "border-stone-200 hover:border-stone-300"}`}>
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-[12px] font-medium text-stone-800 flex-1 truncate">{t.label}</span>
            <span className="text-[10px] font-mono text-stone-400 shrink-0">{t.w}×{t.d}</span>
          </button>
        ))}
      </div>
      <div className="text-[10.5px] text-stone-400 mt-3 mb-2">Szabad kontúr (nem gyártott):</div>
      <div className="grid grid-cols-2 gap-1.5">
        {palette.free.map((t) => (
          <button key={t.label} onClick={() => setPick(t)}
            className={`text-left rounded-lg border px-2.5 py-1.5 ${pick && !pick.tplId && pick.label === t.label ? "border-rose-300 bg-rose-50" : "border-stone-200 hover:border-stone-300"}`}>
            <div className="text-[11.5px] font-medium text-stone-800 truncate">{t.label}</div>
            <div className="text-[9.5px] font-mono text-stone-400">{t.w}×{t.d}</div>
          </button>
        ))}
      </div>
      {/* EGYEDI ELEM KÉRÉSE — kézfogás a műszaki tervezés felé */}
      <div className="mt-3 pt-3 border-t border-stone-100">
        {!reqOpen ? (
          <button onClick={() => setReqOpen(true)} className="w-full h-9 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[12px] font-medium hover:bg-amber-100">Nem találsz sablont? Egyedi elem kérése →</button>
        ) : (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-stone-800">Egyedi elem kérése a műszaki tervezéstől</div>
            <input placeholder="Elem neve (pl. Lejtős padlásszekrény)" value={req.name} onChange={(e) => setReq({ ...req, name: e.target.value })} className={fpField} />
            <div className="grid grid-cols-3 gap-1.5">
              {[["width", "Szél."], ["height", "Mag."], ["depth", "Mély."]].map(([k, lbl]) => (
                <div key={k}>
                  <label className="text-[9px] uppercase tracking-wide text-stone-400 block mb-0.5">{lbl} mm</label>
                  <input type="number" value={req[k]} onChange={(e) => setReq({ ...req, [k]: e.target.value })} className="w-full h-8 px-2 rounded-lg border border-stone-200 text-[12px]" />
                </div>
              ))}
            </div>
            <textarea placeholder="Megjegyzés a műszaki tervezőnek (kialakítás, anyag-igény…)" value={req.note} onChange={(e) => setReq({ ...req, note: e.target.value })} rows={2} className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-[12px] resize-none" />
            <div className="flex items-center gap-2">
              <button onClick={sendReq} disabled={!req.name.trim()} className="flex-1 h-9 rounded-lg bg-amber-500 text-white text-[12px] font-semibold disabled:opacity-40 hover:bg-amber-600">Kérés elküldése</button>
              <button onClick={() => setReqOpen(false)} className="h-9 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-500">Mégse</button>
            </div>
            <div className="text-[10px] text-stone-400 leading-snug">A kérés sablon-vázlatként landol a Műszaki tervezés műhelyében — a kontúr addig is elhelyezhető a téren. A vastagságot/színt a paraméterek vezérlik majd a kiadott vázban.</div>
          </div>
        )}
      </div>
    </FpCard>
  );
}
function FpRoomPanel({ concept, fp, rid, setSel, compos }) {
  const r = fp.rooms.find((x) => x.id === rid);
  if (!r) return null;
  const sideLen = (side) => (side === "N" || side === "S" ? r.w : r.h);
  return (
    <>
      <FpCard title="Helyiség" right={<FpLodLadder level="ter" />}>
        <div className="space-y-2.5">
          <input defaultValue={r.name} key={r.id} onBlur={(e) => window.sim.updateFpRoom(concept.id, rid, { name: e.target.value || r.name })} className={fpField} />
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            {[["Szélesség", r.w], ["Mélység", r.h], ["Terület", ((r.w * r.h) / 1e6).toFixed(1) + " m²"]].map(([k, v]) => (
              <div key={k}><div className="text-[9.5px] uppercase tracking-wide text-stone-400">{k}</div><div className="font-mono font-medium text-stone-800">{v}</div></div>
            ))}
          </div>
          <button onClick={() => { window.sim.removeFpRoom(concept.id, rid); setSel(null); }} className="text-[11px] text-rose-600 hover:underline">Helyiség törlése</button>
        </div>
      </FpCard>
      <FpCard title="Falnézetek (É · K · D · NY)">
        <div className="space-y-2">
          {Object.entries(window.FP_SIDES).map(([side, lbl]) => {
            const compoId = (r.walls || {})[side];
            const comp = compos.find((c) => c.id === compoId);
            return (
              <div key={side} className="rounded-lg border border-stone-200 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-stone-100 grid place-items-center text-[10px] font-bold text-stone-600 shrink-0">{lbl}</span>
                  <span className="text-[10.5px] font-mono text-stone-400 shrink-0">{(sideLen(side) / 1000).toFixed(1)} m</span>
                  {comp ? (
                    <>
                      <span className="text-[11.5px] font-medium text-stone-800 truncate flex-1">{comp.name}</span>
                      <button onClick={() => { window._compoOpen = comp.id; window.navigateTo && window.navigateTo("interior", "composition"); }} className="text-[10.5px] text-rose-600 hover:underline shrink-0">Megnyit</button>
                      <button onClick={() => window.sim.linkFpWall(concept.id, rid, side, null)} className="text-[10.5px] text-stone-400 hover:underline shrink-0">Levál.</button>
                    </>
                  ) : (
                    <FpWallLinker concept={concept} rid={rid} side={side} sideLen={sideLen(side)} room={r} compos={compos} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-[10px] text-stone-400 mt-2 leading-snug">A linkelt bútorsor elemei automatikusan kivetülnek a falra. A falnézet-szerkesztő ugyanazt a parametrikus motort használja, mint a műszaki tervezés.</div>
      </FpCard>
    </>
  );
}
function FpWallLinker({ concept, rid, side, sideLen, room, compos }) {
  const [open, setOpen] = useStateFp2(false);
  if (!open) return <button onClick={() => setOpen(true)} className="text-[10.5px] text-rose-600 hover:underline ml-auto shrink-0">+ Falnézet</button>;
  return (
    <select autoFocus className="flex-1 h-8 px-1.5 rounded-md border border-stone-200 text-[11px] min-w-0"
      onChange={(e) => {
        const v = e.target.value;
        if (v === "__new") {
          const id = window.sim.addComposition({ name: `${room.name} — ${window.FP_SIDES[side]} fal`, room: room.name, wallWidth: sideLen });
          window.sim.linkFpWall(concept.id, rid, side, id);
        } else if (v) window.sim.linkFpWall(concept.id, rid, side, v);
        setOpen(false);
      }} defaultValue="">
      <option value="" disabled>Válassz bútorsort…</option>
      <option value="__new">➕ Új falnézet ({(sideLen / 1000).toFixed(1)} m)</option>
      {compos.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
    </select>
  );
}

// ── zóna-panel ─────────────────────────────────────────────────────────────
function FpZonePanel({ concept, fp, zid, setSel }) {
  const z = (fp.zones || []).find((x) => x.id === zid);
  if (!z) return null;
  return (
    <FpCard title="Zóna" right={<FpLodLadder level="ter" />}>
      <div className="space-y-2.5">
        <input defaultValue={z.name} key={z.id} onBlur={(e) => window.sim.updateFpZone(concept.id, zid, { name: e.target.value || z.name })} className={fpField} />
        <div className="flex items-center gap-1.5">
          {Object.entries(window.FP_ZONE_TONES).map(([k, t]) => (
            <button key={k} title={t.label} onClick={() => window.sim.updateFpZone(concept.id, zid, { tone: k })}
              className={`w-7 h-7 rounded-lg border-2 ${z.tone === k ? "border-stone-800" : "border-transparent"}`} style={{ background: t.fill, outline: `2px dashed ${t.stroke}`, outlineOffset: -4 }} />
          ))}
        </div>
        <div className="text-[11px] font-mono text-stone-500">{(z.w / 1000).toFixed(1)} × {(z.h / 1000).toFixed(1)} m · {((z.w * z.h) / 1e6).toFixed(1)} m²</div>
        <button onClick={() => { window.sim.removeFpZone(concept.id, zid); setSel(null); }} className="text-[11px] text-rose-600 hover:underline">Zóna törlése</button>
      </div>
    </FpCard>
  );
}

// ── szabad kontúr panel (tér-szint: ennyi elég) ────────────────────────────
function FpFurnPanel({ concept, fp, fid, setSel }) {
  const f = (fp.furn || []).find((x) => x.id === fid);
  if (!f) return null;
  return (
    <FpCard title="Bútor-kontúr" right={<FpLodLadder level="ter" />}>
      <div className="space-y-2.5">
        <input defaultValue={f.label} key={f.id} onBlur={(e) => window.sim.updateFpFurn(concept.id, fid, { label: e.target.value || f.label })} className={fpField} />
        <div className="grid grid-cols-2 gap-2">
          {[["w", "Szélesség (mm)"], ["d", "Mélység (mm)"]].map(([k, lbl]) => (
            <div key={k}>
              <label className="text-[9.5px] uppercase tracking-wide text-stone-400 block mb-0.5">{lbl}</label>
              <input type="number" defaultValue={f[k]} key={f.id + k} onBlur={(e) => window.sim.updateFpFurn(concept.id, fid, { [k]: Math.max(200, Number(e.target.value) || f[k]) })} className={fpField} />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.sim.updateFpFurn(concept.id, fid, { rot: f.rot ? 0 : 90 })} className="h-8 px-2.5 rounded-lg border border-stone-200 text-[11.5px] text-stone-600 hover:border-stone-300">⟳ Forgatás 90°</button>
          <button onClick={() => { window.sim.removeFpFurn(concept.id, fid); setSel(null); }} className="text-[11px] text-rose-600 hover:underline">Törlés</button>
        </div>
        {f.tplId ? (
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-2.5 text-[10.5px] text-amber-800 leading-snug">
            <span className="font-semibold">Skeleton-hivatkozás:</span> {f.tplId} — ez a kontúr a műszaki váz befoglalója. Falnézetbe helyezve elem-szintté válik (ár + idő), a furat/kötés a műszaki tervezésé marad.
          </div>
        ) : (
          <div className="text-[10.5px] text-stone-400 leading-snug">Szabad kontúr — nem gyártott tárgy, csak térfoglalás. Tér-szinten ennyi adat elég.</div>
        )}
      </div>
    </FpCard>
  );
}

// ── ELEM-SZINT: kivetített bútorsor-elem — ár + szállítási idő, SEMMI több ──
function FpItemPanel({ sel, compos }) {
  const comp = compos.find((c) => c.id === sel.compoId);
  const it = comp && (comp.items || []).find((x) => x.uid === sel.uid);
  if (!it) return null;
  const w = (it.vars && it.vars.width) || 600, h2 = (it.vars && it.vars.height) || 720, d = (it.vars && it.vars.depth) || 560;
  return (
    <FpCard title="Elem (bútorsorból)" right={<FpLodLadder level="elem" />}>
      <div className="space-y-3">
        <div>
          <div className="text-[13px] font-semibold text-stone-900 leading-tight">{it.tplName}</div>
          <div className="text-[10.5px] text-stone-500 font-mono mt-0.5">{w} × {h2} × {d} mm · {it.qty} db · {comp.name}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-stone-50 border border-stone-100 p-2.5">
            <div className="text-[9.5px] uppercase tracking-wide text-stone-400">Ár</div>
            <div className="text-[15px] font-semibold text-stone-900 tabular-nums">{Math.round((it.unitPrice || 0) * (it.qty || 1)).toLocaleString("hu-HU")} Ft</div>
          </div>
          <div className="rounded-lg bg-stone-50 border border-stone-100 p-2.5">
            <div className="text-[9.5px] uppercase tracking-wide text-stone-400">Szállítás</div>
            <div className="text-[15px] font-semibold text-stone-900 tabular-nums">{it.deliveryDays ? `~${it.deliveryDays} nap` : "—"}</div>
          </div>
        </div>
        <div>
          <div className="text-[9.5px] uppercase tracking-wide text-stone-400 mb-0.5">Kivitel (fő anyagok)</div>
          <div className="text-[12px] text-stone-700">{it.styleName || "—"}</div>
        </div>
        <button onClick={() => { window._compoOpen = comp.id; window.navigateTo && window.navigateTo("interior", "composition"); }}
          className="w-full h-9 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[12px] font-medium hover:bg-rose-100">Belső kiosztás a Bútorsorban</button>
        <div className="rounded-lg bg-stone-50 border border-stone-100 p-2.5 text-[10.5px] text-stone-400 leading-snug">
          <span className="font-medium text-stone-500">Műszaki szint nincs betöltve.</span> Furatkép, kötőelem, szabásjegyzék a Tervezés → Gyártás-adatlapon él — a belsőépítésznek itt nem kell.
        </div>
      </div>
    </FpCard>
  );
}

// ── SZERELŐ NÉZET: kód-beolvasás → melyik szekrénybe megy az elem ───────────
//   A beolvasott kód az elem uid-ja (a munkaszám/QR-etikett kódja). A tér
//   zölden kiemeli a cél-szekrényt, a panel megadja: helyiség · fal · pozíció.
function FpScanPanel({ projected, fp, scanHit, setScanHit, compos }) {
  const [code, setCode] = useStateFp2("");
  const [miss, setMiss] = useStateFp2(false);
  const scan = (raw) => {
    const c = (raw || "").trim().toLowerCase();
    if (!c) return;
    const hit = projected.find((p) => p.it.uid.toLowerCase() === c || `${p.compoId}/${p.it.uid}`.toLowerCase() === c);
    setScanHit(hit ? hit.key : null);
    setMiss(!hit);
  };
  const hit = projected.find((p) => p.key === scanHit);
  return (
    <>
      <FpCard title="Szerelő — elem-beolvasás" right={<FpLodLadder level="elem" />}>
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <input value={code} onChange={(e) => { setCode(e.target.value); setMiss(false); }} onKeyDown={(e) => e.key === "Enter" && scan(code)}
              placeholder="Elem-kód (QR) beolvasása…" autoFocus className={fpField + " font-mono"} />
            <button onClick={() => scan(code)} className="h-9 px-3 rounded-lg bg-stone-900 text-white text-[12px] font-semibold shrink-0">Keres</button>
          </div>
          {miss && <div className="text-[11px] text-rose-600">Nincs ilyen kódú elem ezen a téren.</div>}
          {hit ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1.5">
              <div className="text-[13px] font-semibold text-emerald-900 leading-tight">{hit.it.tplName}</div>
              <div className="text-[11px] text-emerald-800">
                <span className="font-semibold">{hit.roomName}</span> · {window.FP_SIDES[hit.side]} fal · <span className="font-semibold">{hit.wallIdx}. elem</span> balról ({hit.wallCount}-ből)
              </div>
              <div className="text-[10.5px] text-emerald-700 font-mono">{hit.compoId} / {hit.it.uid} · {(hit.it.vars && hit.it.vars.width) || 600} mm széles</div>
              <div className="text-[10.5px] text-emerald-700">A téren zölden villog a cél-pozíció.</div>
            </div>
          ) : !miss && (
            <div className="text-[11px] text-stone-400 leading-snug">Írd be vagy olvasd be az alkatrész / elem etikettjének kódját — a tér megmutatja, melyik szekrénybe (helyiség · fal · pozíció) tartozik.</div>
          )}
          {/* demó-kódok */}
          {projected.length > 0 && (
            <div className="pt-2 border-t border-stone-100">
              <div className="text-[9.5px] uppercase tracking-wide text-stone-400 mb-1">Beolvasható kódok (demó)</div>
              <div className="flex flex-wrap gap-1">
                {projected.slice(0, 6).map((p) => (
                  <button key={p.key} onClick={() => { setCode(p.it.uid); scan(p.it.uid); }} className="px-1.5 h-5 rounded bg-stone-100 text-stone-600 font-mono text-[9.5px] hover:bg-stone-200">{p.it.uid}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </FpCard>
      <FpCard title="4D — a tér az időben">
        <div className="text-[11px] text-stone-500 leading-snug space-y-1.5">
          <p>A <span className="font-medium text-stone-700">4D készültség</span> rétegen a szín az elem helye az időben: terv → ajánlat → rendelés → gyártás → kész. A státusz <span className="font-medium text-stone-700">számított</span> — az ajánlat/rendelés/gyártási feladat láncból származik, a tér nem tárol állapotot.</p>
          <p>Ugyanez a nézet a helyszíni beépítésnél: a szerelő a beolvasott kóddal találja meg a cél-pozíciót.</p>
        </div>
      </FpCard>
    </>
  );
}

Object.assign(window, { FpInspector, FpLodLadder, FpScanPanel });
