// ──────────────────────────────────────────────────────────────────────────
// page-mfg-datasheet.jsx — Belsőépítészet → GYÁRTÁS-ADATLAP
//
//   Elem-szintű műszaki adat-begyűjtés. Minden konfigurált bútorsor-elem a
//   MŰSZAKI TERVEZÉS kiadott sablonjából feloldja a TELJES gyártás-dokumentációt
//   (alkatrész- + szabásjegyzék · anyagnorma · szerelvényjegyzék · per-alkatrész
//   útvonal · munkaóra), és FELGÖRDÜL a projekt-összesítőbe. A §16 cím-hierarchia
//   (Helyiség › Bútorsor/csoport › Elem › Alkatrész) a gerinc.
//
//   Mind SZÁMÍTOTT (window.MfgPrep — soha ne tárold). A bútorsor elemeit
//   MfgPrep-derive-elhető tételekké képezi (config.picks vars-szal → a TÉNYLEGES
//   konfigurált méretekkel derivál), majd:
//     • per-elem:  MfgPrep.derive(elem-projekt)  → elem-adatlap
//     • projekt:   MfgPrep.derive(bútorsor-projekt) → összesítő
//
//   <MfgDatasheetPage />          // Belsőépítészet → Gyártás-adatlap screen
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateMD, useMemo: useMemoMD, useEffect: useEffectMD } = React;

const mdHuf = (n) => Math.round(n || 0).toLocaleString("hu-HU") + " Ft";
const mdN1 = (n) => (Math.round((n || 0) * 10) / 10).toLocaleString("hu-HU");

// ── composition elem → MfgPrep-derive-elhető tétel (a vars átmegy a feloldásba) ─
function mdMapItem(it) {
  return {
    id: it.uid, name: it.tplName || it.catName || "Elem",
    value: (it.unitPrice || 0) * (it.qty || 1), qty: it.qty || 1,
    elemCategory: it.catName,
    config: { categoryId: it.categoryId, styleId: it.styleId, techId: it.techId,
      picks: [{ tplId: it.tplId, qty: it.qty || 1, vars: it.vars || {} }] },
    _it: it,
  };
}
const mdCompoProject = (comp) => ({
  id: comp.id, name: comp.name, customer: comp.customer || comp.room || comp.name,
  room: comp.room, items: (comp.items || []).map(mdMapItem),
});
const mdElementProject = (comp, mapped) => ({
  id: comp.id + "·" + mapped.id, name: (comp.room ? comp.room + " — " : "") + mapped.name,
  customer: comp.customer || comp.room || comp.name, room: comp.room, items: [mapped],
});

// ── sablon-státusz (műhely-sablon vagy gyári bázis) ─────────────────────────
function mdTplStatus(tplId) {
  let studio = [];
  try { studio = window.sim.designTemplateList ? window.sim.designTemplateList() : ((window.sim.getState() || {}).designTemplates || []); } catch (e) {}
  const t = (studio || []).find((x) => x.id === tplId);
  if (t) return { status: t.status, version: t.version, studio: true };
  const base = (window.PARAM_TEMPLATES || []).find((x) => x.id === tplId);
  if (base) return { status: "kiadott", version: base.version || "—", studio: false, factory: true };
  return { status: null, version: null, studio: false };
}
// ── elem készültsége a feloldott prep-ből ──────────────────────────────────
function mdCompleteness(mapped, prep) {
  const tplId = mapped.config.picks[0].tplId;
  const inReg = (window.PARAM_TEMPLATES || []).some((t) => t.id === tplId);
  const di = prep && prep.items && prep.items[0];
  const checks = [
    { key: "tpl",   label: "Kiadott sablon a registryben", ok: inReg },
    { key: "parts", label: "Alkatrész-lista feloldva",      ok: !!(prep && prep.cutlist && prep.cutlist.length) },
    { key: "mat",   label: "Anyagnorma feloldva",           ok: !!(prep && prep.materials && prep.materials.length) },
    { key: "style", label: "Kivitel (stílus) rendelve",     ok: !!(di && di.styleName && di.styleName !== "—") },
    { key: "labor", label: "Munkaóra megvan",               ok: !!(prep && prep.totals && prep.totals.laborCost > 0) },
  ];
  const missing = checks.filter((c) => !c.ok);
  return { checks, missing, ready: missing.length === 0 };
}

// ── kis sablon-státusz pirula ──────────────────────────────────────────────
function MdTplPill({ tplId }) {
  const ts = mdTplStatus(tplId);
  const st = (window.TPL_STATUS || {})[ts.status] || {};
  if (!ts.status) return <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-medium"><Icon name="alert" size={10} />nincs kiadva</span>;
  return <span className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-full border text-[10px] font-medium ${st.pill || "bg-stone-100 text-stone-600 border-stone-200"}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot || "bg-stone-400"}`} />{st.label || ts.status}{ts.factory ? " · gyári" : ""} v{ts.version}</span>;
}

// ── §16 cím-hierarchia morzsa ──────────────────────────────────────────────
function MdCrumb({ segs }) {
  return (
    <div className="flex items-center gap-1 flex-wrap text-[10.5px] font-mono">
      {segs.filter((s) => s && s.v).map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Icon name="chevron" size={9} className="text-stone-300" />}
          <span className={i === segs.filter((x) => x && x.v).length - 1 ? "text-stone-800 font-semibold" : "text-stone-400"}>{s.v}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ── kis statisztika-cella ──────────────────────────────────────────────────
function MdStat({ label, value, sub, accent }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium">{label}</div>
      <div className={`text-[22px] font-semibold tracking-tight tabular-nums mt-0.5 ${accent || "text-stone-900"}`}>{value}</div>
      {sub && <div className="text-[10px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  BELÉPŐ — bútorsor-választó + összesítő
// ════════════════════════════════════════════════════════════════════════════
function MfgDatasheetPage() {
  const s = useSim();
  const comps = (s.compositionList ? s.compositionList() : (s.compositions || []));
  // deep-link fogadás (pl. Projekt-összeállítás → elem-adatlap): window._mdOpenCompo
  const [openId, setOpenId] = useStateMD(() => {
    const hint = window._mdOpenCompo; window._mdOpenCompo = null;
    return hint && comps.some((c) => c.id === hint) ? hint : (comps[0] ? comps[0].id : null);
  });
  const comp = comps.find((c) => c.id === openId) || null;

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1180px] mx-auto space-y-5">
      {/* hero */}
      <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-900 to-stone-700 p-5 md:p-6 text-white">
        <div className="flex items-start gap-4">
          <span className="w-12 h-12 rounded-2xl bg-amber-500/90 grid place-items-center shrink-0"><Icon name="ruler" size={24} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-semibold tracking-tight">Gyártás-adatlap — összeállítás a korpuszokból</div>
            <div className="text-[12px] text-stone-300 leading-snug mt-1 max-w-2xl">A <span className="text-rose-300 font-medium">belsőépítészeti bútorsor</span> átvett elemeiből a műszaki tervezés itt oldja fel a teljes gyártás-tudást — alkatrész- és szabásjegyzék, anyagnorma, szerelvény, útvonal, munkaóra —, és gördíti fel a <span className="text-amber-300 font-medium">projekt-összesítőbe</span>. Cím-gerinc: Helyiség › Bútorsor › Elem › Alkatrész.</div>
          </div>
        </div>
      </div>

      {/* bútorsor-választó */}
      <div>
        <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2">Átvett bútorsor (belsőépítészeti összeállítás)</div>
        <div className="flex items-center gap-2 flex-wrap">
          {comps.map((c) => {
            const on = c.id === openId;
            const t = window.CompoEngine ? window.CompoEngine.totals(c) : { count: 0 };
            return (
              <button key={c.id} onClick={() => setOpenId(c.id)}
                className={`text-left rounded-xl border px-3 py-2 transition ${on ? "border-amber-400 bg-amber-50/60 ring-1 ring-amber-200" : "border-stone-200 bg-white hover:border-stone-300"}`}>
                <div className="text-[12.5px] font-semibold text-stone-900 leading-tight">{c.name}</div>
                <div className="text-[10.5px] text-stone-500 font-mono">{c.id} · {c.room} · {t.count} elem</div>
              </button>
            );
          })}
          {comps.length === 0 && <div className="text-[12px] text-stone-400">Nincs bútorsor — hozz létre egyet a Bútorsor képernyőn.</div>}
        </div>
      </div>

      {comp && <MdCompoDatasheet comp={comp} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  EGY BÚTORSOR ADATLAPJA — projekt-összesítő + elem-lista
// ════════════════════════════════════════════════════════════════════════════
function MdCompoDatasheet({ comp }) {
  const [openUid, setOpenUid] = useStateMD(null);
  const proj = useMemoMD(() => mdCompoProject(comp), [comp]);
  const prep = useMemoMD(() => { try { return window.MfgPrep ? window.MfgPrep.derive(proj) : null; } catch (e) { return null; } }, [proj]);
  const routing = useMemoMD(() => { try { return window.MfgPrep ? window.MfgPrep.routingPlan(proj) : []; } catch (e) { return []; } }, [proj]);

  // per-elem feloldás (a készültség + összegző chip-ekhez)
  const perItem = useMemoMD(() => proj.items.map((m) => {
    let p = null; try { p = window.MfgPrep.derive(mdElementProject(comp, m)); } catch (e) {}
    return { mapped: m, prep: p, comp: mdCompleteness(m, p) };
  }), [proj, comp]);

  if (!prep) return <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-[12.5px] text-stone-500">A levezető motor nem elérhető, vagy az összeállítás üres.</div>;

  const readyN = perItem.filter((x) => x.comp.ready).length;
  const totalN = perItem.length;
  const t = prep.totals;
  const openItem = perItem.find((x) => x.mapped.id === openUid) || null;

  // csoportosítás kategória (= §16 „Csoport") szerint
  const groups = {};
  perItem.forEach((x) => { const g = x.mapped._it.catName || "Egyéb"; (groups[g] = groups[g] || []).push(x); });

  return (
    <div className="space-y-5">
      {openItem && window.MdElementSheet && <window.MdElementSheet comp={comp} entry={openItem} onClose={() => setOpenUid(null)} />}

      {/* fejléc + cím-gerinc */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[16px] font-semibold text-stone-900 tracking-tight">{comp.name}</div>
          <MdCrumb segs={[{ v: comp.customer || comp.id }, { v: comp.room }, { v: comp.name }]} />
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11.5px] font-medium ${readyN === totalN ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
          <Icon name={readyN === totalN ? "check" : "alert"} size={13} />{readyN}/{totalN} elem gyártásra kész
        </div>
      </div>

      {/* PROJEKT-ÖSSZESÍTŐ (felgördülés) */}
      <div>
        <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2 flex items-center gap-1.5"><Icon name="layers" size={12} className="text-amber-500" />Projekt-összesítő — minden elemből felgördítve</div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <MdStat label="Elem" value={prep.qty.units} sub={`${totalN} féle`} />
          <MdStat label="Alkatrész" value={prep.qty.parts} sub={`${prep.cutlist.length} sor`} />
          <MdStat label="Lapanyag" value={t.sheets} sub="tábla" />
          <MdStat label="Tömörfa" value={mdN1(t.volumeM3)} sub="m³" />
          <MdStat label="Vasalat" value={prep.hardware.reduce((n, h) => n + h.qty, 0)} sub={`${prep.hardware.length} féle`} />
          <MdStat label="Munkaóra" value={mdN1(prep.labor.totalHours)} sub={`~${t.leadDays} nap`} />
          <MdStat label="Önköltség" value={mdHuf(t.grand)} accent="text-stone-900" sub={`él ${mdN1(prep.qty.edgeM)} fm`} />
        </div>
      </div>

      {/* technológiai útvonal — állomás-stepper */}
      {routing.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-[11.5px] font-semibold text-stone-900 mb-3 flex items-center gap-1.5"><Icon name="workflow" size={13} className="text-teal-600" />Technológiai útvonal (anyagtípus-vezérelt)</div>
          <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
            {routing.map((r, i) => (
              <React.Fragment key={r.kind}>
                {i > 0 && <div className="self-center text-stone-300 shrink-0"><Icon name="chevron" size={13} /></div>}
                <div className="shrink-0 rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 min-w-[112px]">
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: r.accent }} /><span className="text-[11.5px] font-semibold text-stone-800">{r.kindLabel}</span></div>
                  <div className="text-[10px] text-stone-500 mt-1">{r.partCount} alkatrész · {mdN1(r.hours)} ó</div>
                  <div className="text-[9.5px] text-stone-400 font-mono truncate">{r.machineName}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* ELEM-LISTA — §16 csoport → elem */}
      <div>
        <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2">Elemek — kattints a teljes adatlapért</div>
        <div className="space-y-3">
          {Object.entries(groups).map(([g, rows]) => (
            <div key={g}>
              <div className="text-[11px] font-medium text-stone-600 mb-1.5 flex items-center gap-1.5"><Icon name="box" size={12} className="text-stone-400" />{g} <span className="text-stone-400 font-normal">· {rows.length} elem</span></div>
              <div className="grid md:grid-cols-2 gap-2.5">
                {rows.map((x) => <MdElementRow key={x.mapped.id} comp={comp} entry={x} onOpen={() => setOpenUid(x.mapped.id)} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── egy elem-kártya a listában ─────────────────────────────────────────────
function MdElementRow({ comp, entry, onOpen }) {
  const { mapped, prep, comp: c } = entry;
  const it = mapped._it;
  const di = prep && prep.items && prep.items[0];
  const t = prep ? prep.totals : null;
  return (
    <button onClick={onOpen} className="text-left rounded-2xl border border-stone-200 bg-white p-3.5 hover:border-amber-300 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-stone-900 leading-tight truncate">{it.tplName}</div>
          <div className="text-[10.5px] text-stone-500 font-mono mt-0.5">{it.dims} · {(window.MOUNT_META[it.mount] || {}).label || ""} · {it.qty} db</div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10px] font-medium ${c.ready ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
          <Icon name={c.ready ? "check" : "alert"} size={10} />{c.ready ? "kész" : `${c.missing.length} hiány`}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <MdTplPill tplId={it.tplId} />
        <span className="text-[10px] text-stone-400">·</span>
        <span className="text-[10.5px] text-stone-600 truncate">{it.styleName}</span>
      </div>
      {t && (
        <div className="mt-2.5 pt-2.5 border-t border-stone-100 flex items-center gap-1.5 flex-wrap text-[10px]">
          {[
            ["cut", `${prep.cutlist.length} alk.`],
            ["layers", `${t.sheets} tábla${t.volumeM3 > 0 ? " · " + mdN1(t.volumeM3) + " m³" : ""}`],
            ["bolt", `${prep.hardware.reduce((n, h) => n + h.qty, 0)} vasalat`],
            ["workflow", `${mdN1(prep.labor.totalHours)} ó`],
          ].map(([ic, lbl]) => (
            <span key={ic} className="inline-flex items-center gap-1 px-1.5 h-5 rounded-md bg-stone-100 text-stone-600"><Icon name={ic} size={10} />{lbl}</span>
          ))}
          <span className="flex-1" />
          <span className="text-[11px] font-semibold text-stone-900 tabular-nums">{mdHuf(t.grand)}</span>
        </div>
      )}
    </button>
  );
}

window.MfgDatasheetPage = MfgDatasheetPage;
Object.assign(window, { mdHuf, mdN1, mdMapItem, mdCompoProject, mdElementProject, mdTplStatus, mdCompleteness, MdTplPill, MdCrumb, MdStat });
