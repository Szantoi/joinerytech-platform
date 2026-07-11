/* AUTO-GENERATED from page-proj-assembly.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
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
const {
  useState: useStatePA,
  useMemo: useMemoPA
} = React;
const paHuf = n => Math.round(n || 0).toLocaleString("hu-HU") + " Ft";

// ── olcsó alkatrész-darabszám a registry-sablonból (LOD: csak szám) ─────────
function paPartCount(tplId, vars) {
  const tpl = (window.PARAM_TEMPLATES || []).find(t => t.id === tplId);
  if (!tpl) return null;
  let n = 0;
  (tpl.parts || []).forEach(p => {
    let q = p.qty;
    if (typeof q === "string") q = Number((vars || {})[q.replace(/[{}\s]/g, "")]);
    n += Number.isFinite(Number(q)) && Number(q) > 0 ? Number(q) : 1;
  });
  return n;
}

// ── egy bútorsor elemei + olcsó készültség (registry-státusz, ár, alkatrész-szám) ─
function paElements(comp) {
  return (comp.items || []).map(it => {
    const tplSt = window.mdTplStatus ? window.mdTplStatus(it.tplId) : {
      status: null
    };
    const parts = paPartCount(it.tplId, it.vars);
    return {
      it,
      tplSt,
      parts: parts == null ? null : parts * (it.qty || 1),
      value: (it.unitPrice || 0) * (it.qty || 1),
      ready: tplSt.status === "kiadott"
    };
  });
}

// ── A GERINC ÖSSZEÁLLÍTÁSA — koncepció + tér + bútorsorok egy fában ────────
function paAssemble(c, s) {
  const fp = s.floorplanFor ? s.floorplanFor(c.id) : null;
  const comps = (s.compositionList ? s.compositionList() : []).filter(k => k.status !== "elvetve");

  // fal-linkek a térrendezésből: compoId → { helyiség, oldal }
  const linksByComp = {};
  (fp && fp.rooms || []).forEach(r => Object.entries(r.walls || {}).forEach(([side, compoId]) => {
    if (compoId) linksByComp[compoId] = {
      room: r.name,
      side
    };
  }));

  // helyiségek: koncepció-helyiségek + térrendezés-többlet
  const rooms = (c.rooms || []).map(r => ({
    key: r.id,
    name: r.name,
    area: r.area,
    value: r.value,
    note: r.note,
    fpRoom: (fp && fp.rooms || []).find(x => x.name === r.name) || null,
    groups: []
  }));
  const seen = new Set(rooms.map(r => r.name));
  (fp && fp.rooms || []).forEach(fr => {
    if (seen.has(fr.name)) return;
    seen.add(fr.name);
    rooms.push({
      key: fr.id,
      name: fr.name,
      area: Math.round(fr.w * fr.h / 1e5) / 10,
      fpOnly: true,
      fpRoom: fr,
      groups: []
    });
  });

  // csoportok (bútorsorok): fal-link az elsődleges, helyiség-név a másodlagos horgony
  const unassigned = [];
  comps.forEach(k => {
    const link = linksByComp[k.id];
    const g = {
      comp: k,
      side: link ? link.side : null,
      anchored: !!link,
      elements: paElements(k),
      totals: window.CompoEngine ? window.CompoEngine.totals(k) : {
        net: 0,
        count: 0,
        deliveryDays: 0
      }
    };
    const room = rooms.find(r => r.name === (link ? link.room : k.room));
    if (room) room.groups.push(g);else unassigned.push(g);
  });
  const groups = rooms.flatMap(r => r.groups);
  const elements = groups.flatMap(g => g.elements);
  const stats = {
    roomsN: rooms.length,
    groupsN: groups.length,
    elemsN: elements.reduce((n, e) => n + (e.it.qty || 1), 0),
    partsN: elements.reduce((n, e) => n + (e.parts || 0), 0),
    furnNet: groups.reduce((n, g) => n + (g.totals.net || 0), 0),
    fee: window.conceptFee ? window.conceptFee(c) : 0,
    maxDelivery: groups.reduce((m, g) => Math.max(m, g.totals.deliveryDays || 0), 0),
    readyElems: elements.filter(e => e.ready).length,
    totalElems: elements.length,
    roomsNoGroup: rooms.filter(r => !r.groups.length).length,
    unanchoredN: groups.filter(g => !g.anchored).length
  };
  return {
    fp,
    rooms,
    unassigned,
    groups,
    stats,
    compIds: groups.map(g => g.comp.id)
  };
}

// ── PROJEKT-KÉSZÜLTSÉG KAPU — blokkoló feltételek + nem blokkoló jelzések ──
function paCompleteness(c, asm) {
  const st = asm.stats;
  const checks = [{
    key: "variant",
    label: "Térváltozat kiválasztva",
    ok: !!c.selectedVariantId
  }, {
    key: "fee",
    label: "Tervezési díj meghatározva",
    ok: st.fee > 0
  }, {
    key: "status",
    label: "Koncepció ajánlat-érett (nem brief)",
    ok: !!(window.conceptQuoteReady && window.conceptQuoteReady(c.status))
  }, {
    key: "fp",
    label: "Térrendezés megkezdve",
    ok: !!(asm.fp && asm.fp.rooms && asm.fp.rooms.length)
  }, {
    key: "group",
    label: "Legalább egy bútorsor a projektben",
    ok: st.groupsN > 0
  }, {
    key: "final",
    label: "Minden bútorsor véglegesített",
    ok: st.groupsN > 0 && asm.groups.every(g => g.comp.status !== "piszkozat")
  }, {
    key: "tpl",
    label: "Minden elem sablonja kiadott",
    ok: st.totalElems > 0 && st.readyElems === st.totalElems
  }];
  const warnings = [];
  if (st.roomsNoGroup) warnings.push(`${st.roomsNoGroup} helyiséghez nincs bútorsor`);
  if (st.unanchoredN) warnings.push(`${st.unanchoredN} bútorsor nincs falhoz rögzítve a Térrendezésben`);
  if (asm.unassigned.length) warnings.push(`${asm.unassigned.length} bútorsor nem köthető helyiséghez`);
  const missing = checks.filter(x => !x.ok);
  return {
    checks,
    warnings,
    missing,
    ready: missing.length === 0
  };
}

// ═════════════════════════════════════════════════════════════════
//  BELÉPŐ — koncepció-választó
// ═════════════════════════════════════════════════════════════════
function ProjAssemblyPage() {
  const s = useSim();
  const concepts = s.concepts || [];
  const [openId, setOpenId] = useStatePA(concepts[0] ? concepts[0].id : null);
  const concept = concepts.find(c => c.id === openId) || null;
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1180px] mx-auto space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-900 to-stone-700 p-5 md:p-6 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-12 h-12 rounded-2xl bg-rose-500/90 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 24
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[17px] font-semibold tracking-tight"
  }, "Projekt-\xF6ssze\xE1ll\xEDt\xE1s \u2014 a koncepci\xF3b\xF3l k\xE9sz projekt"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-300 leading-snug mt-1 max-w-2xl"
  }, "A koncepci\xF3, a ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-300 font-medium"
  }, "t\xE9rrendez\xE9s"), ", a ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-300 font-medium"
  }, "b\xFAtorsorok"), " \xE9s a ", /*#__PURE__*/React.createElement("span", {
    className: "text-amber-300 font-medium"
  }, "m\u0171szaki tervez\xE9s"), " tud\xE1sa egy gerincre f\u0171zve: ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[11px]"
  }, "Projekt \u203A Helyis\xE9g \u203A Csoport \u203A Elem \u203A Alkatr\xE9sz"), ". Ha a k\xE9sz\xFClts\xE9g-kapu z\xF6ld, a koncepci\xF3 egy gombbal projektt\xE9 v\xE1lik.")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Koncepci\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, concepts.map(c => {
    const on = c.id === openId;
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: () => setOpenId(c.id),
      className: `text-left rounded-xl border px-3 py-2 transition ${on ? "border-rose-400 bg-rose-50/60 ring-1 ring-rose-200" : "border-stone-200 bg-white hover:border-stone-300"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-900 leading-tight"
    }, c.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 font-mono"
    }, c.id, " \xB7 ", c.customer, " \xB7 ", (c.rooms || []).length, " helyis\xE9g"));
  }), concepts.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "Nincs koncepci\xF3 \u2014 hozz l\xE9tre egyet a Koncepci\xF3k k\xE9perny\u0151n."))), concept && /*#__PURE__*/React.createElement(PaAssembly, {
    concept: concept
  }));
}

// ═════════════════════════════════════════════════════════════════
//  EGY KONCEPCIÓ ÖSSZEÁLLÍTÁSA — gerinc-fa + kapu + materializálás
// ═════════════════════════════════════════════════════════════════
function PaAssembly({
  concept: c
}) {
  const s = useSim();
  const asm = useMemoPA(() => paAssemble(c, s), [c, s]);
  const gate = useMemoPA(() => paCompleteness(c, asm), [c, asm]);
  const st = asm.stats;
  const proj = c.projectRef ? (s.projects || []).find(p => p.id === c.projectRef) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-end justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold text-stone-900 tracking-tight"
  }, c.name), window.MdCrumb && /*#__PURE__*/React.createElement(MdCrumb, {
    segs: [{
      v: c.id
    }, {
      v: c.customer
    }, {
      v: `${window.conceptArea ? window.conceptArea(c) : "—"} m²`
    }]
  })), /*#__PURE__*/React.createElement("div", {
    className: `inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11.5px] font-medium border ${gate.ready ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: gate.ready ? "check" : "alert",
    size: 13
  }), gate.ready ? "Projekt-érett" : `${gate.missing.length} hiány a kapuban`)), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-5 gap-2.5"
  }, /*#__PURE__*/React.createElement(MdStat, {
    label: "Helyis\xE9g",
    value: st.roomsN,
    sub: st.roomsNoGroup ? `${st.roomsNoGroup} bútorsor nélkül` : "mind lefedve"
  }), /*#__PURE__*/React.createElement(MdStat, {
    label: "B\xFAtorsor (csoport)",
    value: st.groupsN,
    sub: st.unanchoredN ? `${st.unanchoredN} nincs falon` : "falhoz rögzítve"
  }), /*#__PURE__*/React.createElement(MdStat, {
    label: "Elem",
    value: st.elemsN,
    sub: `${st.readyElems}/${st.totalElems} kiadott sablonnal`,
    accent: st.readyElems === st.totalElems && st.totalElems ? "text-emerald-600" : "text-amber-600"
  }), /*#__PURE__*/React.createElement(MdStat, {
    label: "Alkatr\xE9sz (becs\xFClt)",
    value: st.partsN || "—",
    sub: "r\xE9szlet: Gy\xE1rt\xE1s-adatlap"
  }), /*#__PURE__*/React.createElement(MdStat, {
    label: "B\xFAtor + d\xEDj (nett\xF3)",
    value: paHuf(st.furnNet + st.fee),
    sub: `bútor ${paHuf(st.furnNet)} · díj ${paHuf(st.fee)}${st.maxDelivery ? ` · max ${st.maxDelivery} nap` : ""}`
  })), /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-stone-200 bg-white p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 15,
    className: "text-stone-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "Projekt-k\xE9sz\xFClts\xE9g kapu")), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-x-6 gap-y-1.5"
  }, gate.checks.map(ch => /*#__PURE__*/React.createElement("div", {
    key: ch.key,
    className: "flex items-center gap-2 text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-4 h-4 rounded-full grid place-items-center shrink-0 ${ch.ok ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ch.ok ? "check" : "alert",
    size: 10
  })), /*#__PURE__*/React.createElement("span", {
    className: ch.ok ? "text-stone-600" : "text-stone-900 font-medium"
  }, ch.label)))), gate.warnings.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 space-y-0.5"
  }, gate.warnings.map((w, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "text-[11.5px] text-stone-500 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 11,
    className: "text-stone-400"
  }), w, " ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400"
  }, "(nem blokkol)")))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 flex items-center gap-2 flex-wrap"
  }, proj ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13
  }), "Projekt l\xE9trehozva: ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, proj.id)), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("projects"),
    className: "h-9 px-3.5 rounded-lg bg-stone-900 text-white text-[12px] font-medium hover:bg-stone-800 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 13
  }), "Megnyit\xE1s a Projektek vil\xE1gban")) : /*#__PURE__*/React.createElement("button", {
    disabled: !gate.ready,
    title: gate.ready ? "A koncepcióból projekt-vázlat készül a Projektek világban" : "Hiányzik: " + gate.missing.map(m => m.label).join(" · "),
    onClick: () => {
      if (gate.ready && s.assembleProjectFromConcept) s.assembleProjectFromConcept(c.id, {
        compIds: asm.compIds
      });
    },
    className: `h-9 px-4 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-1.5 ${gate.ready ? "bg-rose-600 text-white hover:bg-rose-500" : "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: gate.ready ? "layers" : "lock",
    size: 13
  }), "Projekt l\xE9trehoz\xE1sa (v\xE1zlat)"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, "A projekt a b\xFAtorsor-elemekb\u0151l + a koncepci\xF3 szak\xE1g-terveib\u0151l \xE9p\xFCl; a m\xE9rf\xF6ldk\u0151-v\xE1z a projekt-sablonb\xF3l j\xF6n."))), proj && /*#__PURE__*/React.createElement(PaHandoffPanel, {
    concept: c,
    project: proj
  }), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, asm.rooms.map(r => /*#__PURE__*/React.createElement(PaRoomCard, {
    key: r.key,
    concept: c,
    room: r
  })), asm.unassigned.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-amber-200 bg-amber-50/50 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 14,
    className: "text-amber-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "Helyis\xE9ghez nem k\xF6thet\u0151 b\xFAtorsorok"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-500"
  }, "\u2014 a b\xFAtorsor helyis\xE9ge nem szerepel a koncepci\xF3ban, vagy nincs falhoz r\xF6gz\xEDtve")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, asm.unassigned.map(g => /*#__PURE__*/React.createElement(PaGroupRow, {
    key: g.comp.id,
    group: g
  }))))));
}

// ── HANDOFF-CSOMAG panel — ajánlat + DMS-csomag + munkaszám/QR egy gombbal ────
function PaHandoffPanel({
  concept: c,
  project: p
}) {
  const s = useSim();
  const ho = p.handoff || null;
  const docs = ho ? (s.documents || []).filter(d => (ho.docIds || []).includes(d.id)) : [];
  const QR = window.LbQR || null;
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-stone-200 bg-white p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "box",
    size: 15,
    className: "text-stone-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900"
  }, "Handoff-csomag"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, "\u2014 l\xE1tv\xE1nyterv \u2192 k\xE9sz projekt: aj\xE1nlat + dokumentum-csomag + munkasz\xE1m/QR")), !ho ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => window.sim.handoffConceptPackage(c.id),
    className: "h-9 px-4 rounded-lg bg-stone-900 text-white text-[12.5px] font-medium hover:bg-stone-800 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "box",
    size: 13
  }), "Handoff-csomag \xF6ssze\xE1ll\xEDt\xE1sa"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400 max-w-md"
  }, "Teljes aj\xE1nlat (b\xFAtor + tervez\xE9si d\xEDj) \xB7 l\xE1tv\xE1nyterv + alaprajz + adatlap-k\xF6teg a Dokumentumt\xE1rba \xB7 munkasz\xE1m a projektre, QR az elemekre.")) : /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-stretch gap-2.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-900 bg-stone-900 text-white px-3 py-2 flex items-center gap-2.5"
  }, QR && /*#__PURE__*/React.createElement("span", {
    className: "bg-white rounded p-0.5"
  }, /*#__PURE__*/React.createElement(QR, {
    code: ho.workNo,
    size: 34
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] uppercase tracking-wide text-stone-400"
  }, "Munkasz\xE1m"), /*#__PURE__*/React.createElement("div", {
    className: "text-[13.5px] font-mono font-semibold"
  }, ho.workNo))), ho.quoteId && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("sales", "quotes"),
    className: "rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100/70 px-3 py-2 text-left flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 15,
    className: "text-indigo-600"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] uppercase tracking-wide text-indigo-500"
  }, "Aj\xE1nlat"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-indigo-800"
  }, ho.quoteId, " \u2192"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("docs"),
    className: "rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100/70 px-3 py-2 text-left flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "folder",
    size: 15,
    className: "text-violet-600"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[9.5px] uppercase tracking-wide text-violet-500"
  }, "Dokumentumt\xE1r"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-violet-800"
  }, docs.length, " dokumentum \u2192")))), docs.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 space-y-1"
  }, docs.map(d => {
    const tm = (window.DOC_TYPE_META || {})[d.type] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: d.id,
      className: "flex items-center gap-2 text-[11.5px]"
    }, /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center px-1.5 h-5 rounded-full border text-[10px] font-medium ${tm.pill || "bg-stone-100 text-stone-600 border-stone-200"}`
    }, tm.short || d.type), /*#__PURE__*/React.createElement("span", {
      className: "text-stone-700 font-medium"
    }, d.name), /*#__PURE__*/React.createElement("span", {
      className: "text-stone-400 font-mono text-[10.5px] ml-auto"
    }, d.id, " \xB7 v", d.version));
  })), QR && (p.items || []).length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-400 font-medium mb-1.5"
  }, "Elem-QR \u2014 a munkasz\xE1m v\xE9gigk\xEDs\xE9ri a gy\xE1rt\xE1st (\xA716 c\xEDm a c\xEDmk\xE9n)"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2 flex-wrap"
  }, (p.items || []).slice(0, 8).map(it => /*#__PURE__*/React.createElement("div", {
    key: it.elemUid || it.id,
    className: "rounded-lg border border-stone-200 bg-white p-1.5 w-[86px]"
  }, /*#__PURE__*/React.createElement(QR, {
    code: `${ho.workNo}/${it.elemUid || it.id}`,
    size: 70
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[8.5px] font-mono text-stone-500 mt-1 truncate",
    title: it.name
  }, it.elemUid || it.id))), (p.items || []).length > 8 && /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400 self-center"
  }, "+", (p.items || []).length - 8, " tov\xE1bbi")))));
}

// ── egy helyiség kártyája ──────────────────────────────────────────────────
function PaRoomCard({
  concept: c,
  room: r
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-stone-200 bg-white p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5 flex-wrap mb-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "box",
    size: 13,
    className: "text-rose-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[13.5px] font-semibold text-stone-900"
  }, r.name), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-500 font-mono"
  }, r.area || "—", " m\xB2", r.value ? ` · becsült érték ${paHuf(r.value)}` : ""), r.fpRoom ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-medium"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 10
  }), "t\xE9rrendez\xE9sben") : /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 text-[10px] font-medium"
  }, "nincs a t\xE9r-v\xE1sznon"), r.fpOnly && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400"
  }, "(csak a t\xE9rrendez\xE9sben l\xE9tezik)")), r.note && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-400 mb-2 ml-9"
  }, r.note), r.groups.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "ml-9 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-2.5 flex items-center justify-between gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-stone-500"
  }, "Nincs b\xFAtorsor ehhez a helyis\xE9ghez."), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.navigateTo && window.navigateTo("interior", "composition"),
    className: "text-[11.5px] font-medium text-rose-600 hover:text-rose-500 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 12
  }), "B\xFAtorsor \xF6ssze\xE1ll\xEDt\xE1sa")) : /*#__PURE__*/React.createElement("div", {
    className: "ml-0 md:ml-9 space-y-2"
  }, r.groups.map(g => /*#__PURE__*/React.createElement(PaGroupRow, {
    key: g.comp.id,
    group: g,
    concept: c
  }))));
}

// ── egy csoport (bútorsor) sora + elem-lista ───────────────────────────────
function PaGroupRow({
  group: g
}) {
  const [open, setOpen] = useStatePA(true);
  const k = g.comp;
  const cst = (window.COMPO_STATUS || {})[k.status] || {};
  const sides = window.FP_SIDES || {};
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-stone-200 bg-stone-50/50 overflow-hidden"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(!open),
    className: "w-full text-left px-3 py-2.5 flex items-center gap-2 flex-wrap hover:bg-stone-50"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 12,
    className: `text-stone-400 transition-transform ${open ? "rotate-90" : ""}`
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, k.name), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400 font-mono"
  }, k.id), /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10px] font-medium ${cst.bg || "bg-stone-100"} ${cst.fg || "text-stone-600"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-1.5 h-1.5 rounded-full ${cst.dot || "bg-stone-400"}`
  }), cst.label || k.status), g.anchored ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-medium"
  }, "fal: ", sides[g.side] || g.side) : /*#__PURE__*/React.createElement("span", {
    onClick: e => {
      e.stopPropagation();
      window.navigateTo && window.navigateTo("interior", "floorplan");
    },
    className: "inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-medium cursor-pointer hover:bg-amber-100"
  }, "nincs falhoz r\xF6gz\xEDtve \u2192 T\xE9rrendez\xE9s"), /*#__PURE__*/React.createElement("span", {
    className: "ml-auto text-[11.5px] text-stone-600 font-medium tabular-nums"
  }, g.totals.count, " elem \xB7 ", paHuf(g.totals.net))), open && /*#__PURE__*/React.createElement("div", {
    className: "border-t border-stone-200 divide-y divide-stone-100 bg-white"
  }, g.elements.map(e => /*#__PURE__*/React.createElement(PaElementRow, {
    key: e.it.uid,
    entry: e,
    compId: k.id
  }))));
}

// ── egy elem sora — olcsó műszaki tükör + deep-link az adatlapra ───────────
function PaElementRow({
  entry: e,
  compId
}) {
  const it = e.it;
  return /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 flex items-center gap-2.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-6 h-6 rounded-md bg-stone-100 grid place-items-center shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: it.thumb || "box",
    size: 12,
    className: "text-stone-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-900 leading-tight"
  }, (it.qty || 1) > 1 ? `${it.qty} × ` : "", it.tplName || it.catName), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 font-mono"
  }, it.dims, it.styleName ? ` · ${it.styleName}` : "")), /*#__PURE__*/React.createElement("div", {
    className: "ml-auto flex items-center gap-2 flex-wrap"
  }, window.MdTplPill && /*#__PURE__*/React.createElement(MdTplPill, {
    tplId: it.tplId
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-500 tabular-nums"
  }, e.parts != null ? `${e.parts} alkatrész` : "alkatrész: —"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] font-medium text-stone-800 tabular-nums"
  }, paHuf(e.value)), /*#__PURE__*/React.createElement("button", {
    title: "Teljes m\u0171szaki adatlap a Tervez\xE9s vil\xE1gban",
    onClick: () => {
      window._mdOpenCompo = compId;
      window.navigateTo && window.navigateTo("design", "datasheet");
    },
    className: "w-7 h-7 rounded-lg border border-stone-200 grid place-items-center text-stone-400 hover:text-amber-600 hover:border-amber-300"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ruler",
    size: 13
  }))));
}
window.ProjAssemblyPage = ProjAssemblyPage;
Object.assign(window, {
  paAssemble,
  paCompleteness,
  paElements,
  paPartCount,
  PaAssembly,
  PaRoomCard,
  PaGroupRow,
  PaElementRow,
  PaHandoffPanel
});
})();
