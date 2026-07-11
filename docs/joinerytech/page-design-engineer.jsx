// ──────────────────────────────────────────────────────────────────────────
// page-design-engineer.jsx — Tervezés → MŰSZAKI TERVEZÉS (sablon-műhely)
//
//   A §19.2 szerep ALKOTÓ felülete: konfigurálható sablonok létrehozása,
//   szerkesztése (vars + alkatrész-képletek + vasalat + constraints + gér/szög)
//   és ÉLETCIKLUS-kezelése (vazlat → ellenorzes → kiadott → archivalt).
//   Csak a KIADOTT sablon kerül a feloldó-registry-be (window.PARAM_TEMPLATES)
//   — onnan dolgozik a konfigurátor, az ajánlat-tétel és a gyártás-előkészítés.
//
//   Store: sim.designTemplates + addDesignTemplate / draftDesignTemplateFrom /
//   updateDesignTemplate / setDesignTemplateStatus (design.engineer jog).
//   Újrahasznált: window.resolveFormula, window.PartsTable, window.PartMiterEditor.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateDE } = React;

const deRF = (expr, vars) => {
  try { const v = window.resolveFormula(expr, vars); return v == null || Number.isNaN(v) ? "—" : v; }
  catch (e) { return "—"; }
};
const deHUF = (n) => Math.round(n || 0).toLocaleString("hu-HU") + " Ft";

function DeStatusPill({ status }) {
  const st = (window.TPL_STATUS || {})[status] || {};
  return <span className={`inline-flex items-center gap-1.5 px-2 h-6 rounded-full border text-[10.5px] font-medium ${st.pill || ""}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot || ""}`} />{st.label || status}</span>;
}

function DeSection({ icon, title, sub, children, right }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2.5">
          <div className="shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-amber-50 text-amber-600 mt-0.5"><Icon name={icon} size={15} /></div>
          <div>
            <div className="text-[13.5px] font-semibold text-stone-900">{title}</div>
            {sub && <div className="text-[11px] text-stone-500 leading-snug max-w-xl">{sub}</div>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

const DE_IN = "h-8 px-2 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-800 outline-none focus:border-amber-400 disabled:bg-stone-50 disabled:text-stone-400";

// ════════════════════════════════════════════════════════════════════════════
//  LISTA — sablon-műhely (store-sablonok + gyári bázis)
// ════════════════════════════════════════════════════════════════════════════
// ── Beérkezett műszaki kérések (Értékesítéstől, ajánlat-pontosításhoz) ──
function EngQuoteRequests() {
  const s = useSim();
  const [openReq, setOpenReq] = useStateDE(null);
  const reqs = (s.quoteRequests || []).filter((r) => r.kind === "technical" && ["kert", "folyamatban"].includes(r.status));
  if (!reqs.length) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2 mb-4">
      <div className="text-[10.5px] uppercase tracking-wide text-amber-700 font-semibold flex items-center gap-1.5">
        <Icon name="inbox" size={12} /> Beérkezett műszaki kérések ({reqs.length})
      </div>
      {reqs.map((r) => {
        const st = (window.QR_STATUS || {})[r.status] || {};
        const comp = window.sim.techReqCompleteness ? window.sim.techReqCompleteness(r) : { ready: false, missing: [] };
        return (
          <div key={r.id} className="rounded-lg bg-white border border-amber-100 px-3 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10.5px] text-stone-400">{r.id}</span>
              <span className="text-[12px] font-medium text-stone-800">{r.customer}</span>
              <span className="text-[11px] text-stone-500">· ajánlat: <span className="font-mono">{r.quoteId}</span></span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${st.pill || ""}`}>{st.label || r.status}</span>
              {r.status === "folyamatban" && (
                comp.ready
                  ? <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">árazható</span>
                  : <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200">{comp.missing.length} hiány</span>
              )}
              <span className="flex-1" />
              <button onClick={() => setOpenReq(r.id)}
                className="h-7 px-2.5 rounded-md text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-700">Munkalap</button>
              <button onClick={() => { const why = window.prompt("Elutasítás indoka:"); if (why) window.sim.setQuoteRequestStatus(r.id, "elutasitva", { reason: why }); }}
                className="h-7 px-2 rounded-md text-[11px] text-stone-500 hover:bg-stone-100">Elutasítás</button>
            </div>
            {r.note && <div className="mt-1 text-[11px] text-stone-500">{r.note}</div>}
            <div className="mt-1 text-[10px] text-stone-400">A munkalapon: terv-alap (belső koncepció / külső design-csomag) · bútor→sablon megfeleltetés · egyedi elemek rajzzal+paraméterrel+árral.</div>
          </div>
        );
      })}
      {openReq && window.TechReqSheet && <window.TechReqSheet reqId={openReq} onClose={() => setOpenReq(null)} />}
    </div>
  );
}

function EngTemplatesPage() {
  const s = useSim();
  const canEng = window.sim.hasPerm && window.sim.hasPerm("design.engineer");
  const [openId, setOpenId] = useStateDE(null);
  const studio = s.designTemplates || [];
  const base = (window.PARAM_TEMPLATES_BASE || window.PARAM_TEMPLATES || []).filter((t) => !studio.some((x) => x.id === t.id));
  const cats = s.specCategories || [];
  const catName = (cid) => { const c = cats.find((x) => x.id === cid); return c ? c.name : "—"; };

  const newTpl = () => { const id = window.sim.addDesignTemplate({}); if (id) setOpenId(id); };
  const draftFrom = (bid) => { const id = window.sim.draftDesignTemplateFrom(bid); if (id) setOpenId(id); };

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="flex items-end justify-between gap-3 mb-2 flex-wrap">
        <div>
          <div className="text-[18px] md:text-[20px] font-semibold text-stone-900 tracking-tight">Műszaki tervezés — sablon-műhely</div>
          <div className="text-[12px] text-stone-500 max-w-2xl">Konfigurálható sablonok alkotása: paraméterek, alkatrész-képletek, vasalat, él-kialakítás. Csak a <span className="font-medium text-emerald-700">kiadott</span> sablon használható ajánlatban / konfigurátorban / gyártás-előkészítésben.</div>
        </div>
        <button onClick={canEng ? newTpl : undefined} disabled={!canEng}
          title={canEng ? undefined : "Nincs jogosultság (design.engineer)"}
          className="shrink-0 h-9 px-3.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 bg-amber-600 text-white hover:bg-amber-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed">
          <Icon name="plus" size={14} />Új sablon
        </button>
      </div>

      <EngQuoteRequests />

      {/* életciklus-magyarázó */}
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-stone-500 mb-4">
        {(window.TPL_STATUS_ORDER || []).map((k, i) => (
          <React.Fragment key={k}>
            {i > 0 && <Icon name="chevron" size={11} className="text-stone-300" />}
            <DeStatusPill status={k} />
          </React.Fragment>
        ))}
        <span className="ml-1">— a kiadás verziót léptet és élesíti a sablont</span>
      </div>

      {/* műhely-sablonok */}
      <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2">Sablon-műhely ({studio.length})</div>
      {studio.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-[12.5px] text-stone-500 mb-6">Még nincs saját sablon — hozz létre újat, vagy nyiss szerkesztő-vázlatot egy gyári sablonból.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          {studio.map((t) => {
            const c = window.TplEngine ? window.TplEngine.completeness(t) : { ready: true, missing: [] };
            return (
              <button key={t.id} onClick={() => setOpenId(t.id)}
                className="text-left bg-white rounded-2xl border border-stone-200 p-4 hover:shadow-md hover:border-amber-300 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-stone-900 leading-tight truncate">{t.name}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5 truncate font-mono">{t.id} · v{t.version} · {catName(t.categoryId)}</div>
                  </div>
                  <DeStatusPill status={t.status} />
                </div>
                <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11.5px]">
                  <span className="text-stone-500">{(t.parts || []).length} alkatrész · {(t.vars || []).length} paraméter</span>
                  {t.status !== "kiadott" && !c.ready
                    ? <span className="text-amber-600 font-medium">{c.missing.length} hiány a kiadáshoz</span>
                    : <span className="text-stone-400">{t.updated}{t.baseId ? ` · ${t.baseId} alapján` : ""}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* váz-sablon könyvtár (§21.5) — referenciasík-rétegek önálló sablonként */}
      {window.SkelPresetsPanel && <window.SkelPresetsPanel />}

      {/* gyári bázis */}
      <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2">Gyári sablon-bázis</div>
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {base.map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0">
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-medium text-stone-900 truncate">{t.name}</div>
              <div className="text-[10.5px] text-stone-400 font-mono">{t.id} · v{t.version} · {catName(t.categoryId)}</div>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />élesben</span>
            <button onClick={canEng ? () => draftFrom(t.id) : undefined} disabled={!canEng}
              title={canEng ? "Szerkesztő-vázlat azonos id-n — a kiadásig a gyári verzió marad élesben" : "Nincs jogosultság (design.engineer)"}
              className="shrink-0 h-8 px-3 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-700 hover:border-amber-300 hover:text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
              <Icon name="ruler" size={13} />Szerkesztés
            </button>
          </div>
        ))}
      </div>

      {openId && <EngTemplateEditor id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SZERKESZTŐ — teljes képernyős munkalap
// ════════════════════════════════════════════════════════════════════════════
function EngTemplateEditor({ id, onClose }) {
  const s = useSim();
  const live = (s.designTemplates || []).find((t) => t.id === id);
  const canEng = window.sim.hasPerm && window.sim.hasPerm("design.engineer");
  const [selPart, setSelPart] = useStateDE(0);
  const [selJoint, setSelJoint] = useStateDE(null);
  const [selPlane, setSelPlane] = useStateDE(null);
  if (!live) return null;
  const editable = canEng && ["vazlat", "ellenorzes"].includes(live.status);
  const upd = (patch) => window.sim.updateDesignTemplate(id, patch);
  const cats = s.specCategories || [];
  const mats = (window.sim.designMaterials ? window.sim.designMaterials() : []);
  const E = window.TplEngine;
  const comp = E ? E.completeness(live) : { checks: [], ready: true, missing: [] };
  const tokens = E ? E.tokens(live) : [];

  // feloldás a defaultokkal (élő előnézet)
  const dvars = Object.fromEntries((live.vars || []).map((v) => [v.key, v.default]));
  const resolved = (live.parts || []).map((p) => ({
    ...p, rMat: deRF(p.mat, dvars), rW: deRF(p.w, dvars), rH: deRF(p.h, dvars),
    rT: deRF(p.t, dvars), rQty: deRF(p.qty, dvars),
  }));
  const matCost = resolved.reduce((sum, r) => {
    const w = Number(r.rW), h = Number(r.rH), q = Number(r.rQty);
    if (!w || !h || !q) return sum;
    const info = window.sim.materialInfo ? window.sim.materialInfo(r.rMat) : { price: 4000 };
    return sum + (w * h / 1e6) * q * 1.12 * (info.price || 4000);
  }, 0);

  // parametrikus geometria — joint/kötés-állapotok az alap-paraméterekkel
  //   (§21 skeleton-sablonnál a váz-megoldó, különben a §20 part→part megoldó)
  const isSkel = !!live.skeleton;
  let geoStates = {}; let skSolved = null;
  try {
    if (isSkel && window.Skel) {
      skSolved = window.Skel.solve(live, dvars);
      (skSolved.joints || []).forEach((j) => { geoStates[j.id] = j.state; });
    } else if (window.ParamGeo) {
      const gp = resolved.map((r) => ({ name: r.name, w: Number(r.rW), h: Number(r.rH), t: Number(r.rT) || 18 }));
      (window.ParamGeo.solve(live, gp).joints || []).forEach((j) => { geoStates[j.id] = j.state; });
    }
  } catch (e) {}

  // SVG-nézetbeli él/lap-kattintás → kényszer/kötés kijelölése vagy új indítása
  const pickRef = (partName, refKey) => {
    const idx = (live.parts || []).findIndex((p) => p.name === partName);
    if (idx >= 0) setSelPart(idx);
    if (isSkel) {
      const hit = (live.connections || []).find((c) => c.a === partName || c.b === partName);
      if (hit) setSelJoint(hit.id);
      return;
    }
    const hit = (live.joints || []).find((j) => (j.a.part === partName && j.a.ref === refKey) || (j.b.part === partName && j.b.ref === refKey));
    if (hit) { setSelJoint(hit.id); return; }
    if (!editable) return;
    const other = (live.parts || []).map((p) => p.name).find((n) => n !== partName) || partName;
    const nid = "j-" + Date.now().toString(36).slice(-4);
    upd({ joints: [...(live.joints || []), { id: nid, a: { part: partName, ref: refKey }, b: { part: other, ref: "face-a" }, ger: false, machining: "koldokcsap", offset: 0, offsetV: 0, flip: false, note: "" }] });
    setSelJoint(nid);
    if (window.toast) window.toast("Új kapcsolat a nézetből — állítsd be a másik oldalt.", "info");
  };

  // validációs hiba → kötés létrehozása (a technológia-választás kötelező marad)
  const fixErr = (err) => {
    const id = "c-" + Date.now().toString(36).slice(-4);
    const planes = ((live.skeleton || {}).planes) || [];
    upd({ connections: [...(live.connections || []), { id, type: "koldokcsap", a: err.a, b: err.b, plane: (planes[0] || {}).id, side: "+", offset: 0, note: "" }] });
    setSelJoint(id);
  };

  // munkaóra-javaslat a folyamat-normákból (MFG_DEPARTMENTS) — kiindulás;
  // a pontos értéket a tesztgyártás / Utókalkuláció (tény-órák) adja.
  const suggestLabor = () => {
    const partsN = resolved.reduce((n, r) => n + (Number(r.rQty) || 0), 0);
    const edgeM = resolved.reduce((n, r) => n + 2 * ((Number(r.rW) || 0) + (Number(r.rH) || 0)) / 1000 * (Number(r.rQty) || 0) * 0.45, 0);
    const holes = (live.hardware || []).reduce((n, h) => n + (Number(h.qty) || 0), 0) * 2.5;
    const surf = resolved.reduce((n, r) => n + ((Number(r.rW) || 0) * (Number(r.rH) || 0) / 1e6) * (Number(r.rQty) || 0), 0);
    let hours = 0;
    (window.MFG_DEPARTMENTS || []).forEach((d) => {
      if (d.op === "cutting") hours += partsN * d.norm.perPart;
      else if (d.op === "edge") hours += edgeM * d.norm.perMeter;
      else if (d.op === "cnc") hours += holes * d.norm.perHole + partsN * d.norm.perPart;
      else if (d.op === "assembly") hours += 1 * d.norm.perUnit;
      else if (d.op === "surface") hours += surf * d.norm.perM2;
    });
    const v = Math.max(0.5, Math.round(hours * 2) / 2);
    upd({ laborHours: v });
    if (window.toast) window.toast(`Javaslat a folyamat-normákból: ${v} óra`, "info");
  };

  // tömb-mutátorok
  const patchVar = (i, p) => upd({ vars: live.vars.map((v, idx) => (idx === i ? { ...v, ...p } : v)) });
  const delVar = (i) => upd({ vars: live.vars.filter((_, idx) => idx !== i) });
  const addVar = () => upd({ vars: [...(live.vars || []), { key: "param" + ((live.vars || []).length + 1), label: "Új paraméter", unit: "mm", min: 0, max: 1000, step: 10, default: 100, kind: "raster" }] });
  const patchPart = (i, p) => upd({ parts: live.parts.map((x, idx) => (idx === i ? { ...x, ...p } : x)) });
  const delPart = (i) => upd({ parts: live.parts.filter((_, idx) => idx !== i) });
  const addPart = () => upd({ parts: [...(live.parts || []), { name: "Új alkatrész", qty: 1, mat: "{body}", w: "{width}", h: "{height}", t: "{body.t}" }] });
  const patchHw = (i, p) => upd({ hardware: live.hardware.map((x, idx) => (idx === i ? { ...x, ...p } : x)) });
  const delHw = (i) => upd({ hardware: live.hardware.filter((_, idx) => idx !== i) });
  const addHw = () => { const first = Object.keys(window.HARDWARE_CATALOG || {})[0]; upd({ hardware: [...(live.hardware || []), { id: first, qty: 1 }] }); };
  const patchCon = (i, p) => upd({ constraints: live.constraints.map((x, idx) => (idx === i ? { ...x, ...p } : x)) });
  const delCon = (i) => upd({ constraints: live.constraints.filter((_, idx) => idx !== i) });
  const addCon = () => upd({ constraints: [...(live.constraints || []), { rule: "Új szabály", expr: "{width} >= 200" }] });

  // ── csatlakozás-kényszerek (Inventor-minta) ──
  const partNames = (live.parts || []).map((p) => p.name);
  const patchJoint = (i, p) => upd({ joints: live.joints.map((x, idx) => (idx === i ? { ...x, ...p } : x)) });
  const patchJointSide = (i, side, p) => upd({ joints: live.joints.map((x, idx) => (idx === i ? { ...x, [side]: { ...x[side], ...p } } : x)) });
  const delJoint = (i) => upd({ joints: live.joints.filter((_, idx) => idx !== i) });
  const addJoint = () => upd({ joints: [...(live.joints || []), {
    id: "j-" + Date.now().toString(36).slice(-4),
    a: { part: partNames[0] || "", ref: "edge-top" }, b: { part: partNames[1] || partNames[0] || "", ref: "face-a" },
    ger: false, machining: "koldokcsap", offset: 0, note: "" } ] });

  const conOk = (c) => {
    try {
      let str = String(c.expr || "").replace(/\{([a-z_0-9]+)\.t\}/gi, (_, k) => (window.sim.materialInfo(dvars[k]) || {}).t || 18)
        .replace(/\{([a-z_0-9]+)\}/gi, (_, k) => dvars[k] ?? 0).replace(/×/g, "*");
      return !!(new Function("return (" + str + ")")());
    } catch (e) { return false; }
  };

  // FSM-akciók
  const go = (to) => {
    let reason;
    if (to === "vazlat" && live.status === "ellenorzes") { reason = prompt("Visszaküldés indoka:"); if (!reason) return; }
    if (to === "archivalt") { if (!confirm("Sablon archiválása? (A registry-ből kikerül; gyári id-nél a gyári verzió él tovább.)")) return; }
    window.sim.setDesignTemplateStatus(id, to, { reason });
  };
  const fsmBtn = {
    ellenorzes: { label: "Beküldés ellenőrzésre", cls: "bg-amber-500 text-white hover:bg-amber-600", icon: "check" },
    kiadott:    { label: "Kiadás (verzió-léptetés)", cls: "bg-emerald-600 text-white hover:bg-emerald-700", icon: "check" },
    vazlat:     { label: live.status === "archivalt" ? "Újranyitás vázlatként" : "Visszaküldés vázlatba", cls: "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50", icon: "rotate" },
    archivalt:  { label: "Archiválás", cls: "bg-white text-stone-500 border border-stone-200 hover:bg-stone-50", icon: "x" },
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-50 flex flex-col">
      {/* fejléc */}
      <div className="shrink-0 bg-white border-b border-stone-200">
        <div className="px-4 md:px-6 py-3 flex items-start gap-3 max-w-[1180px] mx-auto w-full">
          <button onClick={onClose} className="shrink-0 w-9 h-9 grid place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 mt-0.5"><Icon name="chevron" size={16} className="rotate-180" /></button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <input value={live.name} disabled={!editable} onChange={(e) => upd({ name: e.target.value })}
                className="text-[16px] font-semibold text-stone-900 bg-transparent outline-none border-b border-transparent focus:border-amber-300 min-w-0 disabled:text-stone-700" style={{ width: "min(420px, 60vw)" }} />
              <DeStatusPill status={live.status} />
              <span className="text-[10.5px] font-mono text-stone-400">{live.id} · v{live.version}</span>
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">{live.baseId ? `A(z) ${live.baseId} alapján · ` : ""}{live.createdBy} · frissítve {live.updated}{!editable && live.status === "kiadott" ? " · KIADOTT — szerkesztéshez nyiss revíziót (Ellenőrzés)" : ""}</div>
          </div>
          <div className="shrink-0 flex items-center gap-2 flex-wrap justify-end">
            {(E ? E.nextStates(live) : []).map((to) => {
              const b = fsmBtn[to]; if (!b) return null;
              const lockRelease = to === "kiadott" && !comp.ready;
              return (
                <button key={to} onClick={lockRelease || !canEng ? undefined : () => go(to)} disabled={lockRelease || !canEng}
                  title={!canEng ? "Nincs jogosultság (design.engineer)" : lockRelease ? "Kiadáshoz hiányzik: " + comp.missing.join(" · ") : undefined}
                  className={`h-9 px-3 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1.5 ${b.cls} disabled:opacity-50 disabled:cursor-not-allowed`}>
                  <Icon name={b.icon} size={13} />{b.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="px-4 md:px-6 py-4 max-w-[1180px] mx-auto w-full grid lg:grid-cols-[1fr_340px] gap-4 items-start">
          {/* bal oszlop */}
          <div className="space-y-4 min-w-0">
            {/* meta */}
            <DeSection icon="ruler" title="Alapadatok" sub="Megnevezés, kategória (a stílus/műszaki sémák kapcsa), típus és megjegyzés.">
              <div className="grid sm:grid-cols-3 gap-2">
                <label className="block"><span className="text-[10px] uppercase tracking-wide text-stone-400">Spec-kategória</span>
                  <select value={live.categoryId || ""} disabled={!editable} onChange={(e) => upd({ categoryId: e.target.value })} className={`w-full mt-0.5 ${DE_IN}`}>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></label>
                <label className="block"><span className="text-[10px] uppercase tracking-wide text-stone-400">Típus</span>
                  <input value={live.type || ""} disabled={!editable} onChange={(e) => upd({ type: e.target.value })} className={`w-full mt-0.5 ${DE_IN}`} /></label>
                <label className="block"><span className="text-[10px] uppercase tracking-wide text-stone-400">Szállítási nap</span>
                  <input type="number" min="1" value={live.deliveryDays || 7} disabled={!editable} onChange={(e) => upd({ deliveryDays: Math.max(1, Number(e.target.value) || 7) })} className={`w-full mt-0.5 ${DE_IN}`} /></label>
              </div>
              <label className="block mt-2"><span className="text-[10px] uppercase tracking-wide text-stone-400">Megjegyzés</span>
                <input value={live.note || ""} disabled={!editable} onChange={(e) => upd({ note: e.target.value })} className={`w-full mt-0.5 ${DE_IN}`} placeholder="Rövid leírás a sablonról…" /></label>
            </DeSection>

            {/* paraméterek */}
            <DeSection icon="settings" title="Paraméterek (változók)" sub="A konfigurátorban állítható szabad változók. A material-típus anyag-slotot ad ({key} és {key.t} token)."
              right={editable && <button onClick={addVar} className="h-8 px-2.5 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 inline-flex items-center gap-1"><Icon name="plus" size={12} />Új</button>}>
              <div className="space-y-2">
                {(live.vars || []).map((v, i) => (
                  <div key={i} className="rounded-xl border border-stone-100 bg-stone-50/50 p-2.5">
                    <div className="grid grid-cols-2 sm:grid-cols-[110px_1fr_110px_auto] gap-2 items-center">
                      <input value={v.key} disabled={!editable} onChange={(e) => patchVar(i, { key: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase() })} className={`font-mono ${DE_IN}`} title="Token-kulcs" />
                      <input value={v.label} disabled={!editable} onChange={(e) => patchVar(i, { label: e.target.value })} className={DE_IN} />
                      <select value={v.kind} disabled={!editable} onChange={(e) => patchVar(i, { kind: e.target.value })} className={DE_IN}>
                        <option value="raster">raszter</option><option value="analog">analóg</option><option value="material">anyag</option>
                      </select>
                      {editable && <button onClick={() => delVar(i)} className="text-stone-300 hover:text-rose-500 justify-self-end"><Icon name="x" size={14} /></button>}
                    </div>
                    {v.kind === "material" ? (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-stone-400 mr-1">Választható anyagok:</span>
                        {mats.map((m) => {
                          const on = (v.options || []).includes(m.code);
                          return (
                            <button key={m.code} disabled={!editable}
                              onClick={() => {
                                const opts = on ? (v.options || []).filter((x) => x !== m.code) : [...(v.options || []), m.code];
                                patchVar(i, { options: opts, default: opts.includes(v.default) ? v.default : opts[0] });
                              }}
                              className={`px-2 h-6 rounded-full text-[10.5px] font-medium border transition ${on ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-white border-stone-200 text-stone-500"} disabled:opacity-60`}>
                              {m.name || m.code}{v.default === m.code ? " ✓" : ""}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        {[["min", "Min"], ["max", "Max"], ["step", "Lépés"], ["default", "Alap"]].map(([k, l]) => (
                          <label key={k} className="block"><span className="text-[9.5px] text-stone-400">{l}{v.unit ? ` (${v.unit})` : ""}</span>
                            <input type="number" value={v[k]} disabled={!editable} onChange={(e) => patchVar(i, { [k]: Number(e.target.value) })} className={`w-full ${DE_IN}`} /></label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {!(live.vars || []).length && <div className="text-[12px] text-stone-400">Nincs paraméter — adj hozzá legalább egyet.</div>}
              </div>
            </DeSection>

            {/* alkatrészek */}
            <DeSection icon="cut" title="Alkatrész-sorok (képletekkel)" sub="Méret-képletek a tokenekkel; az anyag {slot}-token vagy konkrét kód. A sorra kattintva él-kialakítás (gér/szög) adható."
              right={editable && <button onClick={addPart} className="h-8 px-2.5 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 inline-flex items-center gap-1"><Icon name="plus" size={12} />Új</button>}>
              <div className="flex items-center gap-1 flex-wrap mb-2">
                <span className="text-[10px] text-stone-400 mr-1">Tokenek:</span>
                {tokens.map((tk) => <span key={tk} className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] font-mono">{tk}</span>)}
              </div>
              <div className="hidden sm:grid grid-cols-[1.3fr_70px_1fr_1fr_70px_60px_auto] gap-1.5 px-1 text-[9.5px] uppercase tracking-wide text-stone-400">
                <span>Alkatrész</span><span>Db</span><span>Szélesség</span><span>Magasság</span><span>Vast.</span><span>Felold.</span><span></span>
              </div>
              <div className="space-y-1.5 mt-1">
                {(live.parts || []).map((p, i) => {
                  const r = resolved[i] || {};
                  const sel = selPart === i;
                  const manualGv = window.sim.partMiter ? window.sim.partMiter(live.id, p.name) : null;
                  let jGv = { short: 0, long: 0 };
                  try { if (window.TplEngine && window.TplEngine.jointMiters) jGv = window.TplEngine.jointMiters(live, p.name, Number(r.rW) || 0, Number(r.rH) || 0); } catch (e) {}
                  const gvN = Math.min(2, (manualGv ? manualGv.short || 0 : 0) + jGv.short) + Math.min(2, (manualGv ? manualGv.long || 0 : 0) + jGv.long);
                  return (
                    <div key={i} className={`rounded-xl border p-2 ${sel ? "border-amber-300 bg-amber-50/30" : "border-stone-100"}`} onClick={() => setSelPart(i)}>
                      <div className="grid grid-cols-2 sm:grid-cols-[1.3fr_70px_1fr_1fr_70px_60px_auto] gap-1.5 items-center">
                        <div className="flex items-center gap-1 min-w-0">
                          <input value={p.name} disabled={!editable} onChange={(e) => patchPart(i, { name: e.target.value })} className={`w-full ${DE_IN}`} />
                          {gvN > 0 && <span className="shrink-0 text-[8.5px] font-semibold px-1 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">GV</span>}
                        </div>
                        <input value={p.qty} disabled={!editable} onChange={(e) => patchPart(i, { qty: e.target.value })} className={`font-mono ${DE_IN}`} />
                        <input value={p.w} disabled={!editable || isSkel} title={isSkel ? "A vázból származtatott (binding)" : undefined} onChange={(e) => patchPart(i, { w: e.target.value })} className={`font-mono ${DE_IN}`} />
                        <input value={p.h} disabled={!editable || isSkel} title={isSkel ? "A vázból származtatott (binding)" : undefined} onChange={(e) => patchPart(i, { h: e.target.value })} className={`font-mono ${DE_IN}`} />
                        <input value={p.t} disabled={!editable || isSkel} title={isSkel ? "A vázból származtatott (binding)" : undefined} onChange={(e) => patchPart(i, { t: e.target.value })} className={`font-mono ${DE_IN}`} />
                        <span className="text-[10px] font-mono text-stone-500 whitespace-nowrap">{r.rW}×{r.rH}</span>
                        {editable ? <button onClick={(e) => { e.stopPropagation(); delPart(i); }} className="text-stone-300 hover:text-rose-500 justify-self-end"><Icon name="x" size={14} /></button> : <span />}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[9.5px] text-stone-400">Anyag:</span>
                        <input value={p.mat} disabled={!editable} onChange={(e) => patchPart(i, { mat: e.target.value })} className={`font-mono flex-1 ${DE_IN}`} style={{ height: 26 }} />
                        <span className="text-[9.5px] text-stone-400 font-mono">→ {r.rMat}</span>
                      </div>
                    </div>
                  );
                })}
                {!(live.parts || []).length && <div className="text-[12px] text-stone-400">Még nincs alkatrész — a kiadáshoz legalább egy kell.</div>}
              </div>
              {/* gér/szög a kiválasztott alkatrészre — a meglévő spec-szerkesztő */}
              {live.parts && live.parts[selPart] && window.PartMiterEditor && (
                <div className="mt-3 rounded-xl border border-stone-200 overflow-hidden">
                  <div className="px-3 py-1.5 bg-stone-50 text-[10.5px] text-stone-500">Él-kialakítás — <span className="font-medium text-stone-700">{live.parts[selPart].name}</span></div>
                  <window.PartMiterEditor tplId={live.id} partName={live.parts[selPart].name} />
                </div>
              )}
            </DeSection>

            {/* vasalat + constraints */}
            <div className="grid md:grid-cols-2 gap-4">
              <DeSection icon="bolt" title="Vasalat" sub="A vasalat-katalógusból; az árát a műszaki spec márkája adja."
                right={editable && <button onClick={addHw} className="h-8 px-2.5 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 inline-flex items-center gap-1"><Icon name="plus" size={12} />Új</button>}>
                <div className="space-y-1.5">
                  {(live.hardware || []).map((h, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <select value={h.id} disabled={!editable} onChange={(e) => patchHw(i, { id: e.target.value })} className={`flex-1 ${DE_IN}`}>
                        {Object.entries(window.HARDWARE_CATALOG || {}).map(([k, d]) => <option key={k} value={k}>{d.name}</option>)}
                      </select>
                      <input type="number" min="1" value={h.qty} disabled={!editable} onChange={(e) => patchHw(i, { qty: Math.max(1, Number(e.target.value) || 1) })} className={`w-16 ${DE_IN}`} />
                      {editable && <button onClick={() => delHw(i)} className="text-stone-300 hover:text-rose-500"><Icon name="x" size={14} /></button>}
                    </div>
                  ))}
                  {!(live.hardware || []).length && <div className="text-[12px] text-stone-400">Nincs vasalat-tétel.</div>}
                </div>
              </DeSection>
              <DeSection icon="alert" title="Constraint-szabályok" sub="Méret-érvényesség a konfigurátorban (token-kifejezések)."
                right={editable && <button onClick={addCon} className="h-8 px-2.5 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 inline-flex items-center gap-1"><Icon name="plus" size={12} />Új</button>}>
                <div className="space-y-1.5">
                  {(live.constraints || []).map((c, i) => (
                    <div key={i} className="rounded-lg border border-stone-100 p-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`shrink-0 text-[10px] font-semibold ${conOk(c) ? "text-emerald-600" : "text-rose-600"}`}>{conOk(c) ? "✓" : "✗"}</span>
                        <input value={c.rule} disabled={!editable} onChange={(e) => patchCon(i, { rule: e.target.value })} className={`flex-1 ${DE_IN}`} />
                        {editable && <button onClick={() => delCon(i)} className="text-stone-300 hover:text-rose-500"><Icon name="x" size={14} /></button>}
                      </div>
                      <input value={c.expr} disabled={!editable} onChange={(e) => patchCon(i, { expr: e.target.value })} className={`w-full mt-1 font-mono ${DE_IN}`} style={{ height: 26 }} />
                    </div>
                  ))}
                  {!(live.constraints || []).length && <div className="text-[12px] text-stone-400">Nincs szabály.</div>}
                </div>
              </DeSection>
            </div>

            {/* parametrikus nézetek — kényszergráf / váz (§20–§21) */}
            {window.ParamViews && (
              <DeSection icon="box" title={isSkel ? "Parametrikus nézetek — váz (skeleton) + kötések" : "Parametrikus nézetek — kényszergráf (LCS + 4×4 mátrix)"}
                sub={isSkel
                  ? "A referenciasíkokból és a 6 határoló kényszerből számított elrendezés — a szaggatott vonalak a síkok (kattinthatók), a piros jelölések a kötésekből generált megmunkálások. Alkatrészre kattintva a kényszerei szerkeszthetők."
                  : "A csatlakozás-kényszerekből számított elrendezés — minden alkatrész lokális koordináta-rendszerrel (LCS), a pozíciók affin transzformációs mátrixokkal származtatva. Kattints egy alkatrészre, majd az él-/lap-sávjaira a kényszerhez; a megmunkálások (piros) a kapcsolatokon definiáltak."}>
                <window.ParamViews tpl={live} editable={editable}
                  selName={(live.parts && live.parts[selPart] || {}).name}
                  onSelPart={(n) => { const i = (live.parts || []).findIndex((p) => p.name === n); if (i >= 0) setSelPart(i); }}
                  onPickRef={pickRef} selJointId={selJoint} onSelJoint={setSelJoint}
                  onPickPlane={setSelPlane} selPlane={selPlane} />
              </DeSection>
            )}

            {/* §21 SKELETON: váz + kötések + binding + teljes kényszerezettség */}
            {isSkel && window.SkelPlanes && skSolved && (
              <React.Fragment>
                <DeSection icon="workflow" title="Váz — referenciasíkok"
                  sub="A geometria gerince: fő síkok (befoglaló) + képletes belső síkok (polc, osztó, nút). Ha a sík elmozdul, minden rákötött alkatrész és kötés követi.">
                  {window.SkelApplyBar && <window.SkelApplyBar tpl={live} editable={editable} />}
                  <window.SkelPlanes tpl={live} editable={editable} upd={upd} solved={skSolved} selPlane={selPlane} onSelPlane={setSelPlane} />
                  {editable && (
                    <button onClick={() => { if (window.sim.addSkeletonPreset({ fromTplId: live.id })) {} }}
                      title="A sík-réteg mentése újrahasználható váz-sablonként (a képletekben hivatkozott változókból lesznek a paraméterei)"
                      className="mt-2 h-7 px-2.5 rounded-lg text-[11px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 inline-flex items-center gap-1">
                      <Icon name="plus" size={11} />Mentés váz-sablonként
                    </button>
                  )}
                </DeSection>
                <DeSection icon="link" title="Kötések a síkokon — a technológia hordozói"
                  sub="A valóságban a kötés tartja össze a bútort — kapcsolat csak kötés-típussal létezhet (vasalat VAGY anyagban kialakított: csapozás / gér / ragasztás). A furatkép és az útvonal-megmunkálás ebből származik. A normál-irány dönti el, a sík melyik oldala fogad.">
                  <window.SkelConnections tpl={live} editable={editable} upd={upd} solved={skSolved} selConn={selJoint} onSelConn={setSelJoint} />
                </DeSection>
                <DeSection icon="settings" title="Kényszerezés — 6 határoló kényszer (kiválasztott alkatrész)"
                  sub="Tengelyenként min/max sík + offset — a méret és a pozíció SZÁRMAZIK, a w/h/t képletek automatikusan íródnak. Válassz alkatrészt fent a sorra vagy a nézetben kattintva.">
                  <window.SkelBinding tpl={live} editable={editable} upd={upd} partIdx={selPart} solved={skSolved} />
                </DeSection>
                <DeSection icon="alert" title="Teljes kényszerezettség — validáció"
                  sub="Két érintkező lap deklarált kötés nélkül = hiba; a térfogati átfedés (ütközés) mindig az. A kiadás e feltétel nélkül LEZÁRT.">
                  <window.SkelErrors solved={skSolved} editable={editable} onFix={fixErr} />
                </DeSection>
              </React.Fragment>
            )}

            {/* csatlakozás-kényszerek (Inventor-minta) — csak NEM-skeleton sablonnál */}
            {!isSkel && window.SkelApplyBar && editable && (
              <DeSection icon="workflow" title="Váz (skeleton) — még nincs"
                sub="Ez a sablon még a régi, alkatrész→alkatrész kényszerezést használja. Váz-sablon alkalmazásával átállítható a referenciasík-modellre — utána az alkatrészeket a síkokhoz kényszerezheted.">
                <window.SkelApplyBar tpl={live} editable={editable} />
              </DeSection>
            )}
            {!isSkel && (
            <DeSection icon="link" title="Csatlakozások — kényszerek (él/lap)"
              sub="Melyik alkatrész melyik LAPJA/ÉLE csatlakozik a másikhoz, milyen megmunkálással és eltolással. A lap-alkatrésznek 2 lapja (A/B) + 4 éle van. A kapcsolat-típus (Él–Él / Él–Lap / Lap–Lap) a két hivatkozásból származik; a gér az él–él variánsa → auto-GV a szabásjegyzékben, a megmunkálás pedig a per-alkatrész útvonalat (furat/marás) bővíti."
              right={editable && <button onClick={addJoint} disabled={partNames.length < 1} className="h-8 px-2.5 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-600 hover:border-amber-300 inline-flex items-center gap-1 disabled:opacity-40"><Icon name="plus" size={12} />Új kapcsolat</button>}>
              <div className="space-y-2">
                {(live.joints || []).map((j, i) => {
                  const kind = window.TplEngine ? window.TplEngine.jointKind(j) : "el-lap";
                  const km = (window.TPL_JOINT_KINDS || {})[kind] || {};
                  const valid = window.TplEngine ? window.TplEngine.jointValid(live, j) : true;
                  const refA = (window.TPL_REF_BY_KEY || {})[j.a.ref] || {};
                  const canGer = kind === "el-el";
                  const mach = (window.TPL_MACHINING || {})[j.machining] || {};
                  const gst = geoStates[j.id];
                  const gstMeta = (window.ParamGeo && window.ParamGeo.PG_STATE || {})[gst] || null;
                  const selJ = selJoint === j.id;
                  const sideSel = (side) => (
                    <div className="grid grid-cols-[1fr_92px] gap-1.5">
                      <select value={j[side].part} disabled={!editable} onChange={(e) => patchJointSide(i, side, { part: e.target.value })} className={DE_IN}>
                        {partNames.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <select value={j[side].ref} disabled={!editable} onChange={(e) => patchJointSide(i, side, { ref: e.target.value })} className={DE_IN}>
                        {(window.TPL_PART_REFS || []).map((r) => <option key={r.key} value={r.key}>{r.short}</option>)}
                      </select>
                    </div>
                  );
                  return (
                    <div key={j.id || i} onClick={() => setSelJoint(j.id)} className={`rounded-xl border p-2.5 ${valid ? "border-stone-150 bg-stone-50/40" : "border-rose-200 bg-rose-50/40"} ${selJ ? "ring-2 ring-amber-400" : ""}`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-stone-400">{j.id}</span>
                          <span className={`inline-flex items-center px-2 h-5 rounded-full border text-[10px] font-medium ${km.pill || ""}`}>{km.label || kind}</span>
                          {j.ger && <span className="inline-flex items-center px-1.5 h-5 rounded-full border text-[10px] font-semibold bg-rose-50 text-rose-600 border-rose-200">Gér → GV</span>}
                          {gstMeta && <span className={`inline-flex items-center px-1.5 h-5 rounded-full border text-[10px] font-medium ${gstMeta.pill}`} title="A kényszergráf-megoldó állapota (parametrikus nézetek)">{gstMeta.label}</span>}
                          {!valid && <span className="text-[10px] text-rose-600 font-medium">hiányos</span>}
                        </div>
                        {editable && <button onClick={() => delJoint(i)} className="text-stone-300 hover:text-rose-500"><Icon name="x" size={14} /></button>}
                      </div>
                      <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
                        <div><div className="text-[9.5px] uppercase tracking-wide text-stone-400 mb-0.5">„A” elem · lap/él</div>{sideSel("a")}</div>
                        <div className="hidden sm:grid place-items-center text-stone-300"><Icon name="link" size={15} /></div>
                        <div><div className="text-[9.5px] uppercase tracking-wide text-stone-400 mb-0.5">„B” elem · lap/él</div>{sideSel("b")}</div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-[1.4fr_76px_76px_auto_auto] gap-2 items-end mt-2">
                        <label className="block"><span className="text-[9.5px] uppercase tracking-wide text-stone-400">Megmunkálás</span>
                          <select value={j.machining} disabled={!editable} onChange={(e) => patchJoint(i, { machining: e.target.value })} className={`w-full mt-0.5 ${DE_IN}`}>
                            {(window.TPL_MACHINING_ORDER || []).map((k) => <option key={k} value={k}>{(window.TPL_MACHINING[k] || {}).label || k}</option>)}
                          </select></label>
                        <label className="block"><span className="text-[9.5px] uppercase tracking-wide text-stone-400">Eltol. u (mm)</span>
                          <input type="number" value={j.offset || 0} disabled={!editable} onChange={(e) => patchJoint(i, { offset: Number(e.target.value) || 0 })} className={`w-full mt-0.5 ${DE_IN}`} /></label>
                        <label className="block"><span className="text-[9.5px] uppercase tracking-wide text-stone-400">Eltol. v (mm)</span>
                          <input type="number" value={j.offsetV || 0} disabled={!editable} onChange={(e) => patchJoint(i, { offsetV: Number(e.target.value) || 0 })} className={`w-full mt-0.5 ${DE_IN}`} /></label>
                        <label className={`inline-flex items-center gap-1.5 h-8 px-2 rounded-lg border text-[11px] font-medium cursor-pointer ${j.ger ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-white border-stone-200 text-stone-500"} ${canGer && editable ? "" : "opacity-50 cursor-not-allowed"}`} title={canGer ? "Gérbe vágva (él–él, 45°) — auto-GV" : "Gér csak él–él kapcsolatnál"}>
                          <input type="checkbox" className="sr-only" checked={!!j.ger} disabled={!canGer || !editable} onChange={(e) => patchJoint(i, { ger: e.target.checked })} />
                          <span className={`w-3.5 h-3.5 rounded grid place-items-center ${j.ger ? "bg-rose-500 text-white" : "border border-stone-300"}`}>{j.ger && <Icon name="check" size={9} />}</span>Gér
                        </label>
                        <label className={`inline-flex items-center gap-1.5 h-8 px-2 rounded-lg border text-[11px] font-medium cursor-pointer ${j.flip ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-stone-200 text-stone-500"} ${editable ? "" : "opacity-50 cursor-not-allowed"}`} title="Tükrözés (180° a kapcsolat v-tengelye körül) — a sarok másik nyílási iránya">
                          <input type="checkbox" className="sr-only" checked={!!j.flip} disabled={!editable} onChange={(e) => patchJoint(i, { flip: e.target.checked })} />
                          <span className={`w-3.5 h-3.5 rounded grid place-items-center ${j.flip ? "bg-amber-500 text-white" : "border border-stone-300"}`}>{j.flip && <Icon name="check" size={9} />}</span>Tükör
                        </label>
                      </div>
                      {(mach.note || j.note) && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="text-[10px] text-stone-400 shrink-0">{mach.note}</span>
                          <input value={j.note || ""} disabled={!editable} onChange={(e) => patchJoint(i, { note: e.target.value })} placeholder="Megjegyzés…" className={`flex-1 ${DE_IN}`} style={{ height: 26 }} />
                        </div>
                      )}
                    </div>
                  );
                })}
                {!(live.joints || []).length && <div className="text-[12px] text-stone-400">Nincs csatlakozás — add meg, melyik alkatrész éle/lapja hogyan kötődik a többihez.</div>}
              </div>
            </DeSection>
            )}

            {/* élő előnézet */}
            <DeSection icon="box" title="Feloldott alkatrészlista (alap-paraméterekkel)" sub={`Becsült anyagköltség: ${deHUF(matCost)} (alap-méretekkel, 12% ráhagyással)`}>
              {window.PartsTable && <window.PartsTable resolvedParts={resolved} tplId={live.id} />}
            </DeSection>
          </div>

          {/* jobb oszlop */}
          <div className="space-y-4">
            {/* kiadás-teljesség */}
            <DeSection icon="check" title="Kiadás-teljesség" sub="A „Kiadás” gomb e feltételek nélkül LEZÁRT.">
              <div className="space-y-1">
                {comp.checks.map((c) => (
                  <div key={c.key} className="flex items-center gap-2 text-[12px]">
                    <span className={`w-4 h-4 rounded grid place-items-center text-white text-[10px] ${c.ok ? "bg-emerald-500" : "bg-stone-300"}`}><Icon name={c.ok ? "check" : "minus"} size={10} /></span>
                    <span className={c.ok ? "text-stone-600" : "text-stone-800 font-medium"}>{c.label}</span>
                  </div>
                ))}
              </div>
            </DeSection>

            {/* munkaóra */}
            <DeSection icon="workflow" title="Tervezett munkaóra" sub="Kiindulás a folyamat-normákból generálható; a PONTOS értéket a tesztgyártás tény-órái adják (Kontrolling → Utókalkuláció).">
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="0.5" value={live.laborHours} disabled={!editable}
                  onChange={(e) => upd({ laborHours: Math.max(0, Number(e.target.value) || 0) })} className={`w-24 ${DE_IN}`} />
                <span className="text-[11.5px] text-stone-500">óra / egység</span>
              </div>
              <button onClick={editable ? suggestLabor : undefined} disabled={!editable}
                className="mt-2 w-full h-9 rounded-lg text-[12px] font-medium border border-stone-200 text-stone-700 hover:border-amber-300 inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                <Icon name="cpu" size={13} />Javaslat a folyamat-normákból
              </button>
            </DeSection>

            {/* előzmény */}
            <DeSection icon="folder" title="Előzmény">
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {(live.history || []).slice().reverse().map((h, i) => (
                  <div key={i} className="text-[11.5px] text-stone-600 flex items-start gap-1.5">
                    <Icon name="chevron" size={11} className="mt-0.5 text-stone-300 shrink-0" />
                    <div><span>{h.text}</span><div className="text-[9.5px] font-mono text-stone-400">{h.at}</div></div>
                  </div>
                ))}
              </div>
            </DeSection>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EngTemplatesPage, EngTemplateEditor });
