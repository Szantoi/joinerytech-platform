// ──────────────────────────────────────────────────────────────────────────
// page-proj-assembly.jsx — Belsőépítészet → PROJEKT-ÖSSZEÁLLÍTÁS
//
//   A koncepció + térrendezés + bútorsorok + műszaki adat EGY projektté fűzése
//   a §16 cím-hierarchia gerincén:
//     Projekt › Helyszín › Helyiség › Csoport (bútorsor) › Elem › Alkatrész
//
//   MINDEN SZÁMÍTOTT — a nézet nem tárol semmit, a meglévő igazságforrásokból
//   aggregál: concepts (Belsőépítészet) · floorplans (Térrendezés fal-linkek) ·
//   compositions (Bútorsor) · PARAM_TEMPLATES registry + mdTplStatus (Műszaki
//   tervezés). LOD-elv: az alkatrész-szint itt csak DARABSZÁM — a részlet a
//   Gyártás-adatlapon él (deep-link), nem töltődik be ide.
//
//   Materializálás: assembleProjectFromConcept(conceptId, {compIds}) — a
//   készültség-kapu (paCompleteness) mögött; hiánynál a gomb LEZÁRT.
//
//   <ProjAssemblyPage />          // Belsőépítészet → Projekt-összeállítás
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStatePA, useMemo: useMemoPA } = React;

const paHuf = (n) => Math.round(n || 0).toLocaleString("hu-HU") + " Ft";

// ── olcsó alkatrész-darabszám a registry-sablonból (LOD: csak szám) ─────────
function paPartCount(tplId, vars) {
  const tpl = (window.PARAM_TEMPLATES || []).find((t) => t.id === tplId);
  if (!tpl) return null;
  let n = 0;
  (tpl.parts || []).forEach((p) => {
    let q = p.qty;
    if (typeof q === "string") q = Number((vars || {})[q.replace(/[{}\s]/g, "")]);
    n += Number.isFinite(Number(q)) && Number(q) > 0 ? Number(q) : 1;
  });
  return n;
}

// ── egy bútorsor elemei + olcsó készültség (registry-státusz, ár, alkatrész-szám) ─
function paElements(comp) {
  return (comp.items || []).map((it) => {
    const tplSt = window.mdTplStatus ? window.mdTplStatus(it.tplId) : { status: null };
    const parts = paPartCount(it.tplId, it.vars);
    return {
      it, tplSt,
      parts: parts == null ? null : parts * (it.qty || 1),
      value: (it.unitPrice || 0) * (it.qty || 1),
      ready: tplSt.status === "kiadott",
    };
  });
}

// ── A GERINC ÖSSZEÁLLÍTÁSA — koncepció + tér + bútorsorok egy fában ────────
function paAssemble(c, s) {
  const fp = s.floorplanFor ? s.floorplanFor(c.id) : null;
  const comps = (s.compositionList ? s.compositionList() : []).filter((k) => k.status !== "elvetve");

  // fal-linkek a térrendezésből: compoId → { helyiség, oldal }
  const linksByComp = {};
  ((fp && fp.rooms) || []).forEach((r) =>
    Object.entries(r.walls || {}).forEach(([side, compoId]) => { if (compoId) linksByComp[compoId] = { room: r.name, side }; }));

  // helyiségek: koncepció-helyiségek + térrendezés-többlet
  const rooms = (c.rooms || []).map((r) => ({
    key: r.id, name: r.name, area: r.area, value: r.value, note: r.note,
    fpRoom: ((fp && fp.rooms) || []).find((x) => x.name === r.name) || null, groups: [],
  }));
  const seen = new Set(rooms.map((r) => r.name));
  ((fp && fp.rooms) || []).forEach((fr) => {
    if (seen.has(fr.name)) return;
    seen.add(fr.name);
    rooms.push({ key: fr.id, name: fr.name, area: Math.round((fr.w * fr.h) / 1e5) / 10, fpOnly: true, fpRoom: fr, groups: [] });
  });

  // csoportok (bútorsorok): fal-link az elsődleges, helyiség-név a másodlagos horgony
  const unassigned = [];
  comps.forEach((k) => {
    const link = linksByComp[k.id];
    const g = {
      comp: k, side: link ? link.side : null, anchored: !!link,
      elements: paElements(k),
      totals: window.CompoEngine ? window.CompoEngine.totals(k) : { net: 0, count: 0, deliveryDays: 0 },
    };
    const room = rooms.find((r) => r.name === (link ? link.room : k.room));
    if (room) room.groups.push(g); else unassigned.push(g);
  });

  const groups = rooms.flatMap((r) => r.groups);
  const elements = groups.flatMap((g) => g.elements);
  const stats = {
    roomsN: rooms.length,
    groupsN: groups.length,
    elemsN: elements.reduce((n, e) => n + (e.it.qty || 1), 0),
    partsN: elements.reduce((n, e) => n + (e.parts || 0), 0),
    furnNet: groups.reduce((n, g) => n + (g.totals.net || 0), 0),
    fee: window.conceptFee ? window.conceptFee(c) : 0,
    maxDelivery: groups.reduce((m, g) => Math.max(m, g.totals.deliveryDays || 0), 0),
    readyElems: elements.filter((e) => e.ready).length,
    totalElems: elements.length,
    roomsNoGroup: rooms.filter((r) => !r.groups.length).length,
    unanchoredN: groups.filter((g) => !g.anchored).length,
  };
  return { fp, rooms, unassigned, groups, stats, compIds: groups.map((g) => g.comp.id) };
}

// ── PROJEKT-KÉSZÜLTSÉG KAPU — blokkoló feltételek + nem blokkoló jelzések ──
function paCompleteness(c, asm) {
  const st = asm.stats;
  const checks = [
    { key: "variant", label: "Térváltozat kiválasztva",                 ok: !!c.selectedVariantId },
    { key: "fee",     label: "Tervezési díj meghatározva",              ok: st.fee > 0 },
    { key: "status",  label: "Koncepció ajánlat-érett (nem brief)",     ok: !!(window.conceptQuoteReady && window.conceptQuoteReady(c.status)) },
    { key: "fp",      label: "Térrendezés megkezdve",                   ok: !!(asm.fp && asm.fp.rooms && asm.fp.rooms.length) },
    { key: "group",   label: "Legalább egy bútorsor a projektben",      ok: st.groupsN > 0 },
    { key: "final",   label: "Minden bútorsor véglegesített",           ok: st.groupsN > 0 && asm.groups.every((g) => g.comp.status !== "piszkozat") },
    { key: "tpl",     label: "Minden elem sablonja kiadott",            ok: st.totalElems > 0 && st.readyElems === st.totalElems },
  ];
  const warnings = [];
  if (st.roomsNoGroup) warnings.push(`${st.roomsNoGroup} helyiséghez nincs bútorsor`);
  if (st.unanchoredN) warnings.push(`${st.unanchoredN} bútorsor nincs falhoz rögzítve a Térrendezésben`);
  if (asm.unassigned.length) warnings.push(`${asm.unassigned.length} bútorsor nem köthető helyiséghez`);
  const missing = checks.filter((x) => !x.ok);
  return { checks, warnings, missing, ready: missing.length === 0 };
}

// ═════════════════════════════════════════════════════════════════
//  BELÉPŐ — koncepció-választó
// ═════════════════════════════════════════════════════════════════
function ProjAssemblyPage() {
  const s = useSim();
  const concepts = s.concepts || [];
  const [openId, setOpenId] = useStatePA(concepts[0] ? concepts[0].id : null);
  const concept = concepts.find((c) => c.id === openId) || null;

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1180px] mx-auto space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-900 to-stone-700 p-5 md:p-6 text-white">
        <div className="flex items-start gap-4">
          <span className="w-12 h-12 rounded-2xl bg-rose-500/90 grid place-items-center shrink-0"><Icon name="layers" size={24} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-semibold tracking-tight">Projekt-összeállítás — a koncepcióból kész projekt</div>
            <div className="text-[12px] text-stone-300 leading-snug mt-1 max-w-2xl">A koncepció, a <span className="text-rose-300 font-medium">térrendezés</span>, a <span className="text-rose-300 font-medium">bútorsorok</span> és a <span className="text-amber-300 font-medium">műszaki tervezés</span> tudása egy gerincre fűzve: <span className="font-mono text-[11px]">Projekt › Helyiség › Csoport › Elem › Alkatrész</span>. Ha a készültség-kapu zöld, a koncepció egy gombbal projektté válik.</div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2">Koncepció</div>
        <div className="flex items-center gap-2 flex-wrap">
          {concepts.map((c) => {
            const on = c.id === openId;
            return (
              <button key={c.id} onClick={() => setOpenId(c.id)}
                className={`text-left rounded-xl border px-3 py-2 transition ${on ? "border-rose-400 bg-rose-50/60 ring-1 ring-rose-200" : "border-stone-200 bg-white hover:border-stone-300"}`}>
                <div className="text-[12.5px] font-semibold text-stone-900 leading-tight">{c.name}</div>
                <div className="text-[10.5px] text-stone-500 font-mono">{c.id} · {c.customer} · {(c.rooms || []).length} helyiség</div>
              </button>
            );
          })}
          {concepts.length === 0 && <div className="text-[12px] text-stone-400">Nincs koncepció — hozz létre egyet a Koncepciók képernyőn.</div>}
        </div>
      </div>

      {concept && <PaAssembly concept={concept} />}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
//  EGY KONCEPCIÓ ÖSSZEÁLLÍTÁSA — gerinc-fa + kapu + materializálás
// ═════════════════════════════════════════════════════════════════
function PaAssembly({ concept: c }) {
  const s = useSim();
  const asm = useMemoPA(() => paAssemble(c, s), [c, s]);
  const gate = useMemoPA(() => paCompleteness(c, asm), [c, asm]);
  const st = asm.stats;
  const proj = c.projectRef ? (s.projects || []).find((p) => p.id === c.projectRef) : null;

  return (
    <div className="space-y-5">
      {/* fejléc + cím-gerinc */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[16px] font-semibold text-stone-900 tracking-tight">{c.name}</div>
          {window.MdCrumb && <MdCrumb segs={[{ v: c.id }, { v: c.customer }, { v: `${window.conceptArea ? window.conceptArea(c) : "—"} m²` }]} />}
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11.5px] font-medium border ${gate.ready ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
          <Icon name={gate.ready ? "check" : "alert"} size={13} />{gate.ready ? "Projekt-érett" : `${gate.missing.length} hiány a kapuban`}
        </div>
      </div>

      {/* felgördülő összesítő */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <MdStat label="Helyiség" value={st.roomsN} sub={st.roomsNoGroup ? `${st.roomsNoGroup} bútorsor nélkül` : "mind lefedve"} />
        <MdStat label="Bútorsor (csoport)" value={st.groupsN} sub={st.unanchoredN ? `${st.unanchoredN} nincs falon` : "falhoz rögzítve"} />
        <MdStat label="Elem" value={st.elemsN} sub={`${st.readyElems}/${st.totalElems} kiadott sablonnal`} accent={st.readyElems === st.totalElems && st.totalElems ? "text-emerald-600" : "text-amber-600"} />
        <MdStat label="Alkatrész (becsült)" value={st.partsN || "—"} sub="részlet: Gyártás-adatlap" />
        <MdStat label="Bútor + díj (nettó)" value={paHuf(st.furnNet + st.fee)} sub={`bútor ${paHuf(st.furnNet)} · díj ${paHuf(st.fee)}${st.maxDelivery ? ` · max ${st.maxDelivery} nap` : ""}`} />
      </div>

      {/* KÉSZÜLTSÉG-KAPU + materializálás */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="check" size={15} className="text-stone-500" />
          <div className="text-[13px] font-semibold text-stone-900">Projekt-készültség kapu</div>
        </div>
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-1.5">
          {gate.checks.map((ch) => (
            <div key={ch.key} className="flex items-center gap-2 text-[12px]">
              <span className={`w-4 h-4 rounded-full grid place-items-center shrink-0 ${ch.ok ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                <Icon name={ch.ok ? "check" : "alert"} size={10} />
              </span>
              <span className={ch.ok ? "text-stone-600" : "text-stone-900 font-medium"}>{ch.label}</span>
            </div>
          ))}
        </div>
        {gate.warnings.length > 0 && (
          <div className="mt-3 rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 space-y-0.5">
            {gate.warnings.map((w, i) => <div key={i} className="text-[11.5px] text-stone-500 flex items-center gap-1.5"><Icon name="alert" size={11} className="text-stone-400" />{w} <span className="text-stone-400">(nem blokkol)</span></div>)}
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {proj ? (
            <React.Fragment>
              <span className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-medium"><Icon name="check" size={13} />Projekt létrehozva: <span className="font-mono">{proj.id}</span></span>
              <button onClick={() => window.navigateTo && window.navigateTo("projects")}
                className="h-9 px-3.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium hover:bg-stone-800 inline-flex items-center gap-1.5">
                <Icon name="layers" size={13} />Megnyitás a Projektek világban
              </button>
            </React.Fragment>
          ) : (
            <button disabled={!gate.ready}
              title={gate.ready ? "A koncepcióból projekt-vázlat készül a Projektek világban" : "Hiányzik: " + gate.missing.map((m) => m.label).join(" · ")}
              onClick={() => { if (gate.ready && s.assembleProjectFromConcept) s.assembleProjectFromConcept(c.id, { compIds: asm.compIds }); }}
              className={`h-9 px-4 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-1.5 ${gate.ready ? "bg-rose-600 text-white hover:bg-rose-500" : "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"}`}>
              <Icon name={gate.ready ? "layers" : "lock"} size={13} />Projekt létrehozása (vázlat)
            </button>
          )}
          <span className="text-[11px] text-stone-400">A projekt a bútorsor-elemekből + a koncepció szakág-terveiből épül; a mérföldkő-váz a projekt-sablonból jön.</span>
        </div>
      </div>

      {/* HANDOFF-CSOMAG — látványterv → kész projekt (ajánlat + dok-csomag + munkaszám/QR) */}
      {proj && <PaHandoffPanel concept={c} project={proj} />}

      {/* A GERINC — helyiség › csoport › elem */}
      <div className="space-y-3">
        {asm.rooms.map((r) => <PaRoomCard key={r.key} concept={c} room={r} />)}
        {asm.unassigned.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="alert" size={14} className="text-amber-500" />
              <div className="text-[12.5px] font-semibold text-stone-900">Helyiséghez nem köthető bútorsorok</div>
              <span className="text-[11px] text-stone-500">— a bútorsor helyisége nem szerepel a koncepcióban, vagy nincs falhoz rögzítve</span>
            </div>
            <div className="space-y-2">{asm.unassigned.map((g) => <PaGroupRow key={g.comp.id} group={g} />)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── HANDOFF-CSOMAG panel — ajánlat + DMS-csomag + munkaszám/QR egy gombbal ────
function PaHandoffPanel({ concept: c, project: p }) {
  const s = useSim();
  const ho = p.handoff || null;
  const docs = ho ? (s.documents || []).filter((d) => (ho.docIds || []).includes(d.id)) : [];
  const QR = window.LbQR || null;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="box" size={15} className="text-stone-500" />
        <div className="text-[13px] font-semibold text-stone-900">Handoff-csomag</div>
        <span className="text-[11px] text-stone-400">— látványterv → kész projekt: ajánlat + dokumentum-csomag + munkaszám/QR</span>
      </div>
      {!ho ? (
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => window.sim.handoffConceptPackage(c.id)}
            className="h-9 px-4 rounded-lg bg-stone-900 text-white text-[12.5px] font-medium hover:bg-stone-800 inline-flex items-center gap-1.5">
            <Icon name="box" size={13} />Handoff-csomag összeállítása
          </button>
          <span className="text-[11px] text-stone-400 max-w-md">Teljes ajánlat (bútor + tervezési díj) · látványterv + alaprajz + adatlap-köteg a Dokumentumtárba · munkaszám a projektre, QR az elemekre.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-stretch gap-2.5 flex-wrap">
            <div className="rounded-xl border border-stone-900 bg-stone-900 text-white px-3 py-2 flex items-center gap-2.5">
              {QR && <span className="bg-white rounded p-0.5"><QR code={ho.workNo} size={34} /></span>}
              <div>
                <div className="text-[9.5px] uppercase tracking-wide text-stone-400">Munkaszám</div>
                <div className="text-[13.5px] font-mono font-semibold">{ho.workNo}</div>
              </div>
            </div>
            {ho.quoteId && (
              <button onClick={() => window.navigateTo && window.navigateTo("sales", "quotes")} className="rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100/70 px-3 py-2 text-left flex items-center gap-2">
                <Icon name="file" size={15} className="text-indigo-600" />
                <div>
                  <div className="text-[9.5px] uppercase tracking-wide text-indigo-500">Ajánlat</div>
                  <div className="text-[12.5px] font-medium text-indigo-800">{ho.quoteId} →</div>
                </div>
              </button>
            )}
            <button onClick={() => window.navigateTo && window.navigateTo("docs")} className="rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100/70 px-3 py-2 text-left flex items-center gap-2">
              <Icon name="folder" size={15} className="text-violet-600" />
              <div>
                <div className="text-[9.5px] uppercase tracking-wide text-violet-500">Dokumentumtár</div>
                <div className="text-[12.5px] font-medium text-violet-800">{docs.length} dokumentum →</div>
              </div>
            </button>
          </div>
          {docs.length > 0 && (
            <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 space-y-1">
              {docs.map((d) => {
                const tm = (window.DOC_TYPE_META || {})[d.type] || {};
                return (
                  <div key={d.id} className="flex items-center gap-2 text-[11.5px]">
                    <span className={`inline-flex items-center px-1.5 h-5 rounded-full border text-[10px] font-medium ${tm.pill || "bg-stone-100 text-stone-600 border-stone-200"}`}>{tm.short || d.type}</span>
                    <span className="text-stone-700 font-medium">{d.name}</span>
                    <span className="text-stone-400 font-mono text-[10.5px] ml-auto">{d.id} · v{d.version}</span>
                  </div>
                );
              })}
            </div>
          )}
          {QR && (p.items || []).length > 0 && (
            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">Elem-QR — a munkaszám végigkíséri a gyártást (§16 cím a címkén)</div>
              <div className="flex items-start gap-2 flex-wrap">
                {(p.items || []).slice(0, 8).map((it) => (
                  <div key={it.elemUid || it.id} className="rounded-lg border border-stone-200 bg-white p-1.5 w-[86px]">
                    <QR code={`${ho.workNo}/${it.elemUid || it.id}`} size={70} />
                    <div className="text-[8.5px] font-mono text-stone-500 mt-1 truncate" title={it.name}>{it.elemUid || it.id}</div>
                  </div>
                ))}
                {(p.items || []).length > 8 && <span className="text-[11px] text-stone-400 self-center">+{(p.items || []).length - 8} további</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── egy helyiség kártyája ──────────────────────────────────────────────────
function PaRoomCard({ concept: c, room: r }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
        <span className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 grid place-items-center shrink-0"><Icon name="box" size={13} className="text-rose-500" /></span>
        <div className="text-[13.5px] font-semibold text-stone-900">{r.name}</div>
        <span className="text-[11px] text-stone-500 font-mono">{r.area || "—"} m²{r.value ? ` · becsült érték ${paHuf(r.value)}` : ""}</span>
        {r.fpRoom
          ? <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-medium"><Icon name="check" size={10} />térrendezésben</span>
          : <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 text-[10px] font-medium">nincs a tér-vásznon</span>}
        {r.fpOnly && <span className="text-[10px] text-stone-400">(csak a térrendezésben létezik)</span>}
      </div>
      {r.note && <div className="text-[11.5px] text-stone-400 mb-2 ml-9">{r.note}</div>}
      {r.groups.length === 0 ? (
        <div className="ml-9 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-2.5 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11.5px] text-stone-500">Nincs bútorsor ehhez a helyiséghez.</span>
          <button onClick={() => window.navigateTo && window.navigateTo("interior", "composition")} className="text-[11.5px] font-medium text-rose-600 hover:text-rose-500 inline-flex items-center gap-1">
            <Icon name="layers" size={12} />Bútorsor összeállítása
          </button>
        </div>
      ) : (
        <div className="ml-0 md:ml-9 space-y-2">{r.groups.map((g) => <PaGroupRow key={g.comp.id} group={g} concept={c} />)}</div>
      )}
    </div>
  );
}

// ── egy csoport (bútorsor) sora + elem-lista ───────────────────────────────
function PaGroupRow({ group: g }) {
  const [open, setOpen] = useStatePA(true);
  const k = g.comp;
  const cst = (window.COMPO_STATUS || {})[k.status] || {};
  const sides = window.FP_SIDES || {};
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/50 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full text-left px-3 py-2.5 flex items-center gap-2 flex-wrap hover:bg-stone-50">
        <Icon name="chevron" size={12} className={`text-stone-400 transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="text-[12.5px] font-semibold text-stone-900">{k.name}</span>
        <span className="text-[10.5px] text-stone-400 font-mono">{k.id}</span>
        <span className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10px] font-medium ${cst.bg || "bg-stone-100"} ${cst.fg || "text-stone-600"}`}><span className={`w-1.5 h-1.5 rounded-full ${cst.dot || "bg-stone-400"}`} />{cst.label || k.status}</span>
        {g.anchored
          ? <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-medium">fal: {sides[g.side] || g.side}</span>
          : <span onClick={(e) => { e.stopPropagation(); window.navigateTo && window.navigateTo("interior", "floorplan"); }}
              className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-medium cursor-pointer hover:bg-amber-100">nincs falhoz rögzítve → Térrendezés</span>}
        <span className="ml-auto text-[11.5px] text-stone-600 font-medium tabular-nums">{g.totals.count} elem · {paHuf(g.totals.net)}</span>
      </button>
      {open && (
        <div className="border-t border-stone-200 divide-y divide-stone-100 bg-white">
          {g.elements.map((e) => <PaElementRow key={e.it.uid} entry={e} compId={k.id} />)}
        </div>
      )}
    </div>
  );
}

// ── egy elem sora — olcsó műszaki tükör + deep-link az adatlapra ───────────
function PaElementRow({ entry: e, compId }) {
  const it = e.it;
  return (
    <div className="px-3 py-2 flex items-center gap-2.5 flex-wrap">
      <span className="w-6 h-6 rounded-md bg-stone-100 grid place-items-center shrink-0"><Icon name={it.thumb || "box"} size={12} className="text-stone-500" /></span>
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-stone-900 leading-tight">{(it.qty || 1) > 1 ? `${it.qty} × ` : ""}{it.tplName || it.catName}</div>
        <div className="text-[10.5px] text-stone-400 font-mono">{it.dims}{it.styleName ? ` · ${it.styleName}` : ""}</div>
      </div>
      <div className="ml-auto flex items-center gap-2 flex-wrap">
        {window.MdTplPill && <MdTplPill tplId={it.tplId} />}
        <span className="text-[10.5px] text-stone-500 tabular-nums">{e.parts != null ? `${e.parts} alkatrész` : "alkatrész: —"}</span>
        <span className="text-[11.5px] font-medium text-stone-800 tabular-nums">{paHuf(e.value)}</span>
        <button title="Teljes műszaki adatlap a Tervezés világban"
          onClick={() => { window._mdOpenCompo = compId; window.navigateTo && window.navigateTo("design", "datasheet"); }}
          className="w-7 h-7 rounded-lg border border-stone-200 grid place-items-center text-stone-400 hover:text-amber-600 hover:border-amber-300">
          <Icon name="ruler" size={13} />
        </button>
      </div>
    </div>
  );
}

window.ProjAssemblyPage = ProjAssemblyPage;
Object.assign(window, { paAssemble, paCompleteness, paElements, paPartCount, PaAssembly, PaRoomCard, PaGroupRow, PaElementRow, PaHandoffPanel });
