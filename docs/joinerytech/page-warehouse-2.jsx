// ──────────────────────────────────────────────────────────────────────────
// Raktár — Bevételezés (PO → lot zóna+hely+projekt), Kivét-kérelmek (FSM),
// kivét-létrehozó dialógus, és a Beállítások → Raktárhelyek panel.
// Páros fájl a page-warehouse.jsx-hez (közös segéd-komponenseket onnan használ).
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateW2, useMemo: useMemoW2 } = React;

// Variáns-aware opció-címke a tétel-választókhoz: a variánst a fő-tétel nevével
// + variáns-címkével mutatjuk; a fő-tétel (variantAxes) NEM raktározható közvetlenül.
function isVariantParentItem(x) { return Array.isArray(x.variantAxes) && x.variantAxes.length > 0; }
function whItemOptLabel(x) {
  if (x.variantOf) { const p = window.sim.variantParentOf ? window.sim.variantParentOf(x.id) : null; return (p ? p.name : x.name) + " · " + ((window.sim.variantLabel && window.sim.variantLabel(x)) || "") + " (" + x.code + ")"; }
  return x.name + " (" + x.code + ")";
}

// ══════════════════════════════════════════════════════════════════════════
// BEVÉTELEZÉS — érkező megrendelések raktárba vétele
// ══════════════════════════════════════════════════════════════════════════
function ReceivingPage() {
  const sim = window.useSim();
  const incoming = (sim.pos || []).filter((p) => p.status === "running");
  const recent = (sim.pos || []).filter((p) => p.status === "delivered").slice(0, 6);
  const [recId, setRecId] = useStateW2(null);
  const [adhoc, setAdhoc] = useStateW2(false);
  const po = recId ? incoming.find((p) => p.id === recId) : null;

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[17px] font-semibold text-stone-900">Bevételezés</h2>
          <p className="text-[12.5px] text-stone-500">Érkező áru raktárba vétele szállítólevél / számla alapján — zóna, raktárhely és projekt-foglalás kiosztása.</p>
        </div>
        <PrimaryBtn icon="plus" onClick={() => setAdhoc(true)}>Bevételezés bizonylat alapján</PrimaryBtn>
      </div>

      {/* Érkező szállítmányok */}
      <div className="mb-2 text-[11px] uppercase tracking-wide text-stone-500 font-medium">Érkező szállítmányok · {incoming.length}</div>
      {incoming.length === 0 && <Card className="px-5 py-8 text-center text-[12.5px] text-stone-400">Nincs PO-hoz kötött, bevételezésre váró szállítmány. Közvetlen érkezést a <b className="text-stone-500">„Bevételezés bizonylat alapján"</b> gombbal rögzíthetsz.</Card>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {incoming.map((p) => {
          const it = (sim.catalog || []).find((x) => x.id === p.itemId);
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-teal-700">{p.id}</div>
                  <div className="text-[14px] font-medium text-stone-900 truncate">{p.material}</div>
                  <div className="text-[11.5px] text-stone-500">{p.supplier}</div>
                </div>
                {p.projectNo
                  ? <span className="shrink-0 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-medium" title="A megrendelés ehhez a projekthez készült — a bevételezéskor megerősítendő"><Icon name="info" size={11} />{p.projectNo}</span>
                  : <span className="shrink-0 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-medium">Szabad készlet</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-[12px] text-stone-500">Várható: <b className="text-stone-700">{p.qty} {it ? it.unit : "db"}</b> · ETA {p.eta}</div>
                <PrimaryBtn icon="download" onClick={() => setRecId(p.id)}>Bevételez</PrimaryBtn>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Legutóbbi bevételezések */}
      {recent.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-stone-500 font-medium">Legutóbbi bevételezések</div>
          <Card className="p-0 overflow-hidden">
            {recent.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0 text-[12px]">
                <span className="font-mono text-[11px] text-stone-400">{p.id}</span>
                <span className="flex-1 text-stone-700 truncate">{p.material}</span>
                <span className="text-stone-400">{p.qty}</span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"><Icon name="check" size={11} />Bevételezve</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      <SlideOver open={!!po} onClose={() => setRecId(null)} width={520} title={po ? `Bevételezés — ${po.id}` : ""} subtitle={po ? po.supplier : ""}>
        {po && <ReceiveForm po={po} onDone={() => setRecId(null)} />}
      </SlideOver>

      <SlideOver open={adhoc} onClose={() => setAdhoc(false)} width={520} title="Bevételezés bizonylat alapján" subtitle="Szállítólevél / számla — PO nélkül">
        {adhoc && <AdhocReceiveForm onDone={() => setAdhoc(false)} />}
      </SlideOver>
    </div>
  );
}

// Bizonylat-szekció — közös a PO-s és az ad-hoc bevételezéshez.
function DocSection({ docType, setDocType, docNo, setDocNo, sub }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
      <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2">Bizonylat</div>
      <div className="flex gap-1.5 mb-2.5">
        {[["szallitolevel", "Szállítólevél", "file"], ["szamla", "Számla", "receipt"]].map(([k, lbl, ic]) => (
          <button key={k} onClick={() => setDocType(k)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border text-[12px] font-medium transition ${docType === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`}>
            <Icon name={ic} size={13} />{lbl}
          </button>
        ))}
      </div>
      <input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder={docType === "szamla" ? "Számla száma — pl. 2426/SZ-0184" : "Szállítólevél száma — pl. SZL-2426-0312"}
        className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500 bg-white" />
      {sub && <div className="text-[10.5px] text-stone-400 mt-1.5">{sub}</div>}
    </div>
  );
}

// Projekt-zárolás szekció — közös.
function ProjectLockSection({ lockProject, setLockProject, projectNo, setProjectNo, poProjectNo }) {
  return (
    <div className={`rounded-xl border p-3.5 transition ${lockProject ? "border-violet-300 bg-violet-50/50" : "border-stone-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-stone-900">Projekthez zárolt</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Bekapcsolva a tétel egy projektre zárolódik. Kikapcsolva <b>szabad (általános) készletre</b> kerül.</div>
        </div>
        <button onClick={() => setLockProject((v) => !v)}
          className={`shrink-0 w-11 h-6 rounded-full relative transition ${lockProject ? "bg-violet-600" : "bg-stone-300"}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${lockProject ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {poProjectNo && (
        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-stone-500">
          <Icon name="info" size={13} className="text-violet-500 shrink-0" />
          <span>A megrendelés a <span className="font-mono text-violet-700">{poProjectNo}</span> projekthez készült — de a szállítólevélen/számlán ez nem mindig szerepel, ezért erősítsd meg.</span>
        </div>
      )}

      {lockProject && (
        <div className="mt-2.5">
          <label className="text-[11px] text-stone-500 block mb-1">Projektszám</label>
          <div className="flex gap-1.5">
            <input value={projectNo} onChange={(e) => setProjectNo(e.target.value)} placeholder="PRJ-2426-012"
              className="flex-1 h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-violet-500 bg-white" />
            {poProjectNo && projectNo !== poProjectNo && (
              <button onClick={() => setProjectNo(poProjectNo)} className="h-9 px-2.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-[11px] font-medium whitespace-nowrap">PO szerint</button>
            )}
          </div>
        </div>
      )}

      {!lockProject && (
        <div className="mt-2.5 text-[10.5px] text-stone-400 flex items-center gap-1.5">
          <Icon name="inventory" size={12} />Szabad készletre kerül — később bármikor projektre zárolható a lot zóna-mozgatójával.
        </div>
      )}
    </div>
  );
}

// Több-soros tétel-szerkesztő — egy bizonylaton több tétel is lehet.
// Soronként: (opc.) beszállítói cikk → saját katalógus tétel + mennyiség + raktárhely.
// A supplierName ismeretében a beszállító idegen cikkszáma/megnevezése alapján
// automatikusan feloldja a saját tételt (supplierMap), és új cikknél felajánlja
// a megfeleltetés rögzítését.
function ReceiveLinesEditor({ lines, setLines, whItems, supplierName }) {
  const setLine = (i, patch) => setLines((ls) => ls.map((l, j) => j === i ? { ...l, ...patch } : l));
  const addLine = () => setLines((ls) => [...ls, { itemId: "", qty: "", locId: "", supRef: "" }]);
  const rmLine = (i) => setLines((ls) => ls.filter((_, j) => j !== i));

  // Idegen cikk feloldása → ha EGY cél, beállítja az itemId-t; ha több (1:N), a
  // bontást a "Bontás N tételre" gomb végzi (nem auto, hogy a qty érthető legyen).
  const resolveRef = (i, ref) => {
    setLine(i, { supRef: ref });
    const r = ref.trim();
    if (!r) return;
    const hit = window.sim.resolveSupplierItem(supplierName || "", { sku: r, label: r });
    if (hit && hit.targets && hit.targets.length === 1) setLine(i, { supRef: ref, itemId: hit.targets[0].catalogItemId });
  };
  // 1:N bontás: a sort lecseréli N sorra, qty = (sor qty vagy 1) × szorzó.
  const splitLine = (i, targets) => {
    setLines((ls) => {
      const cur = ls[i];
      const baseQty = Number(cur.qty) > 0 ? Number(cur.qty) : 1;
      const rows = targets.map((t, k) => ({
        itemId: t.catalogItemId,
        qty: String(baseQty * t.factor),
        locId: cur.locId || "",
        supRef: k === 0 ? (cur.supRef || "") : "",
      }));
      return [...ls.slice(0, i), ...rows, ...ls.slice(i + 1)];
    });
  };

  return (
    <div>
      <label className="text-[11px] text-stone-500 block mb-1.5">Tételek a bizonylaton · {lines.length}</label>
      <div className="space-y-2.5">
        {lines.map((ln, i) => {
          const it = whItems.find((x) => x.id === ln.itemId);
          // a kiválasztott tétel ismert beszállítói megnevezése ennél a szállítónál
          const mapped = it && supplierName ? window.sim.supplierRefFor(it.id, supplierName) : null;
          // mértékegység-átváltás: 1:1 megfeleltetés factor != 1 → a beszállító más egységben mér
          const mConv = mapped ? window.sim.supplierMapTargets(mapped) : null;
          const unitConv = (mConv && mConv.length === 1 && mConv[0].factor !== 1) ? { factor: mConv[0].factor, supplierUnit: mapped.supplierUnit || "egys." } : null;
          // méret-alapú átváltás (tábla): a tényleges szél×hossz adja az m²-t (rétegelt lemeznél változó)
          const sheet = mapped && mapped.sheet ? mapped.sheet : null;
          const shW = Number(ln.shW != null ? ln.shW : (sheet ? sheet.w : 0)) || 0;
          const shL = Number(ln.shL != null ? ln.shL : (sheet ? sheet.l : 0)) || 0;
          const shCnt = Number(ln.shCnt != null ? ln.shCnt : 0) || 0;
          const setSheet = (patch) => {
            const w = Number(patch.shW != null ? patch.shW : shW) || 0;
            const l = Number(patch.shL != null ? patch.shL : shL) || 0;
            const c = Number(patch.shCnt != null ? patch.shCnt : shCnt) || 0;
            setLine(i, { ...patch, qty: String(+(c * w * l / 1e6).toFixed(4)) });
          };
          const refTyped = (ln.supRef || "").trim();
          const refResolved = refTyped ? window.sim.resolveSupplierItem(supplierName || "", { sku: refTyped, label: refTyped }) : null;
          const showLearn = refTyped && ln.itemId && supplierName && !window.sim.supplierRefFor(ln.itemId, supplierName);
          return (
            <div key={i} className="rounded-xl border border-stone-200 bg-white p-2.5">
              {/* Beszállítói cikk feloldó — opcionális, ha a beszállító ismert */}
              {supplierName && (
                <div className="mb-2">
                  <label className="text-[10px] text-stone-400 block mb-1">Beszállítói cikk (cikkszám / megnevezés a bizonylatról)</label>
                  <input value={ln.supRef || ""} onChange={(e) => resolveRef(i, e.target.value)} placeholder="pl. W980 ST2 16 — feloldás a saját tételre"
                    className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-teal-500 bg-white" />
                  {refTyped && (refResolved
                    ? (refResolved.targets && refResolved.targets.length > 1
                        ? <div className="mt-1.5 rounded-lg border border-teal-200 bg-teal-50/50 p-2">
                            <div className="text-[10.5px] text-teal-700 font-medium flex items-center gap-1 mb-1"><Icon name="arrow-right" size={11} />Szettből {refResolved.targets.length} saját tételre bontható</div>
                            <div className="text-[10px] text-stone-500 mb-1.5">{refResolved.targets.map((t) => { const c = whItems.find((x) => x.id === t.catalogItemId); return `×${t.factor} ${c ? c.name : t.catalogItemId}`; }).join(" + ")}</div>
                            <button onClick={() => splitLine(i, refResolved.targets)} className="inline-flex items-center gap-1.5 text-[11px] text-teal-700 font-medium hover:text-teal-800"><Icon name="plus" size={12} />Bontás {refResolved.targets.length} tételre</button>
                          </div>
                        : <div className="text-[10.5px] text-emerald-600 mt-1 flex items-center gap-1"><Icon name="check" size={11} />Feloldva a saját tételre</div>)
                    : <div className="text-[10.5px] text-amber-600 mt-1">Nincs megfeleltetés — válaszd ki a tételt kézzel lent.</div>)}
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <select value={ln.itemId} onChange={(e) => setLine(i, { itemId: e.target.value })} className="flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-teal-500">
                  <option value="">— válassz saját tételt —</option>
                  {whItems.filter((x) => !isVariantParentItem(x)).map((x) => <option key={x.id} value={x.id}>{whItemOptLabel(x)}</option>)}
                </select>
                {lines.length > 1 && <button onClick={() => rmLine(i)} className="shrink-0 w-8 h-8 grid place-items-center rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-500"><Icon name="x" size={14} /></button>}
              </div>
              {mapped && (mapped.supplierSku || mapped.supplierLabel) && (
                <div className="text-[10.5px] text-stone-400 mb-2 flex items-center gap-1">
                  <Icon name="arrow-right" size={11} className="text-stone-300" />
                  {supplierName} szerint: <span className="font-mono text-stone-500">{mapped.supplierSku}</span>{mapped.supplierLabel ? ` · ${mapped.supplierLabel}` : ""}
                </div>
              )}
              {sheet ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-1">Tábla méret (mm){sheet.variable ? " — változó, add meg a tényleges méretet" : " — szabványos"}</label>
                    <div className="flex items-center gap-1.5">
                      <input type="number" min="0" value={ln.shW != null ? ln.shW : sheet.w} onChange={(e) => setSheet({ shW: e.target.value })} disabled={!sheet.variable}
                        className={`w-24 h-9 px-2 rounded-lg border text-[12px] text-right font-mono outline-none focus:border-teal-500 ${sheet.variable ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-100 text-stone-500"}`} />
                      <span className="text-[12px] text-stone-400">×</span>
                      <input type="number" min="0" value={ln.shL != null ? ln.shL : sheet.l} onChange={(e) => setSheet({ shL: e.target.value })} disabled={!sheet.variable}
                        className={`w-24 h-9 px-2 rounded-lg border text-[12px] text-right font-mono outline-none focus:border-teal-500 ${sheet.variable ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-100 text-stone-500"}`} />
                      <span className="text-[11px] text-stone-400">mm</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-stone-400 block mb-1">Darab ({mapped.supplierUnit || "tábla"})</label>
                      <WhNumInput value={ln.shCnt != null ? ln.shCnt : ""} onChange={(v) => setSheet({ shCnt: v })} className="w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-400 block mb-1">Raktárhely</label>
                      <WhLocationSelect value={ln.locId} onChange={(v) => setLine(i, { locId: v })} />
                    </div>
                  </div>
                  <div className="text-[11px] text-teal-600 font-medium">= {(+(Number(ln.qty) || 0).toFixed(3))} {it ? it.unit : "m²"} <span className="text-stone-400 font-normal">({shCnt} × {shW}×{shL} mm)</span></div>
                </div>
              ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1">{unitConv ? `Beszállítói menny. (${unitConv.supplierUnit})` : `Mennyiség${it ? ` (${it.unit})` : ""}`}</label>
                  {unitConv ? (
                    <div>
                      <WhNumInput value={ln.supQty != null ? ln.supQty : ""} onChange={(v) => setLine(i, { supQty: v, qty: String((Number(v) || 0) * unitConv.factor) })} className="w-full" />
                      <div className="text-[10px] text-teal-600 mt-1">= {(+(Number(ln.qty) || 0).toFixed(3))} {it.unit} <span className="text-stone-400">(×{unitConv.factor})</span></div>
                    </div>
                  ) : (
                    <WhNumInput value={ln.qty} onChange={(v) => setLine(i, { qty: v })} className="w-full" />
                  )}
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1">Raktárhely</label>
                  <WhLocationSelect value={ln.locId} onChange={(v) => setLine(i, { locId: v })} />
                </div>
              </div>
              )}
              {showLearn && (
                <button onClick={() => window.sim.learnSupplierMap({ supplierName, supplierSku: refTyped, supplierLabel: "", catalogItemId: ln.itemId })}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-teal-700 font-medium hover:text-teal-800">
                  <Icon name="plus" size={12} />Megfeleltetés mentése: „{refTyped}" → {it?.name}
                </button>
              )}
              {it && !it.worldExt?.warehouse && <div className="text-[10.5px] text-amber-600 mt-1.5">A tétel még nincs raktározva — a bevételezés bekapcsolja.</div>}
            </div>
          );
        })}
      </div>
      <button onClick={addLine} className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-teal-700 font-medium hover:text-teal-800"><Icon name="plus" size={14} />Tétel hozzáadása</button>
    </div>
  );
}

// Bevételezés-sorok payloaddá alakítása (hely-szöveg feloldással).
function buildReceiveLines(lines) {
  return lines
    .filter((l) => l.itemId && (Number(l.qty) || 0) > 0)
    .map((l) => {
      const loc = window.sim.whLocById(l.locId);
      return { itemId: l.itemId, qty: Number(l.qty) || 0, locId: l.locId || "", locText: loc ? loc.text : "" };
    });
}

// Ad-hoc bevételezés — PO nélkül, közvetlenül bizonylat alapján.
function AdhocReceiveForm({ onDone }) {
  const sim = window.useSim();
  const whItems = (sim.catalog || []).filter((x) => x.active !== false);
  const [supplier, setSupplier] = useStateW2("");
  const [docType, setDocType] = useStateW2("szallitolevel");
  const [docNo, setDocNo] = useStateW2("");
  const [lockProject, setLockProject] = useStateW2(false);
  const [projectNo, setProjectNo] = useStateW2("");
  const [lines, setLines] = useStateW2([{ itemId: "", qty: "", locId: "" }]);
  const suppliers = useMemoW2(() => Array.from(new Set((sim.pos || []).map((p) => p.supplier).filter(Boolean))), [sim.pos]);

  const payload = buildReceiveLines(lines);
  const go = () => {
    window.sim.receiveAdhoc({
      supplier, docType, docNo,
      lock: lockProject, projectNo: lockProject ? projectNo : "",
      lines: payload,
    });
    onDone();
  };
  const canSubmit = payload.length > 0 && (!lockProject || projectNo.trim());

  return (
    <div className="space-y-4">
      <DocSection docType={docType} setDocType={setDocType} docNo={docNo} setDocNo={setDocNo} />

      <div>
        <label className="text-[11px] text-stone-500 block mb-1">Szállító</label>
        <input value={supplier} onChange={(e) => setSupplier(e.target.value)} list="adhoc-suppliers" placeholder="pl. Falco Sopron Zrt."
          className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white" />
        <datalist id="adhoc-suppliers">{suppliers.map((s) => <option key={s} value={s} />)}</datalist>
      </div>

      <ReceiveLinesEditor lines={lines} setLines={setLines} whItems={whItems} supplierName={supplier} />

      <ProjectLockSection lockProject={lockProject} setLockProject={setLockProject} projectNo={projectNo} setProjectNo={setProjectNo} />

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onDone} className="h-10 px-4 rounded-lg text-[12.5px] text-stone-500 hover:bg-stone-100">Mégse</button>
        <button onClick={go} disabled={!canSubmit} className={`h-10 px-4 rounded-lg text-[12.5px] font-medium ${canSubmit ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-400"}`}>Bevételezés{payload.length > 1 ? ` (${payload.length})` : ""}</button>
      </div>
    </div>
  );
}

function ReceiveForm({ po, onDone }) {
  const sim = window.useSim();
  const whItems = (sim.catalog || []).filter((x) => x.active !== false);
  const [docType, setDocType] = useStateW2("szallitolevel");
  const [docNo, setDocNo] = useStateW2("");
  // A projekt-zárolás NEM automatikus: a bizonylaton (szállítólevél/számla) nem
  // feltétlenül szerepel a projekt. A bevételező tudatosan dönt — alapból szabad.
  const [lockProject, setLockProject] = useStateW2(false);
  const [projectNo, setProjectNo] = useStateW2(po.projectNo || "");
  // A PO tételeinek előtöltése: ha a PO több soros (procurement), kódonként a
  // katalógushoz illesztjük; egyébként egyetlen sor a PO fő tételéből.
  const [lines, setLines] = useStateW2(() => {
    if (po.lines && po.lines.length) {
      return po.lines.map((l) => {
        // 1) saját kód egyezés, 2) beszállítói megfeleltetés (idegen cikkszám/megnevezés)
        let match = whItems.find((x) => x.code && (x.code === l.matCode || x.code === l.code));
        if (!match) {
          const r = window.sim.resolveSupplierItem(po.supplier, { sku: l.supplierSku || l.matCode || l.code, label: l.supplierLabel || l.material });
          if (r) match = whItems.find((x) => x.id === r.catalogItemId);
        }
        return { itemId: match ? match.id : "", qty: String(l.qty || ""), locId: "", supRef: l.supplierSku || "" };
      });
    }
    let m0 = whItems.find((x) => x.id === po.itemId);
    if (!m0) { const r = window.sim.resolveSupplierItem(po.supplier, { label: po.material }); if (r) m0 = whItems.find((x) => x.id === r.catalogItemId); }
    return [{ itemId: m0 ? m0.id : (po.itemId || ""), qty: String(po.qty || ""), locId: "", supRef: "" }];
  });

  const payload = buildReceiveLines(lines);
  const go = () => {
    window.sim.receiveToWarehouse(po.id, {
      docType, docNo,
      lock: lockProject, projectNo: lockProject ? projectNo : "", projectName: po.projectName || "",
      lines: payload,
    });
    onDone();
  };
  const canSubmit = payload.length > 0 && (!lockProject || projectNo.trim());

  return (
    <div className="space-y-4">
      <DocSection docType={docType} setDocType={setDocType} docNo={docNo} setDocNo={setDocNo} sub={`${po.supplier} · ${po.id}`} />

      <ReceiveLinesEditor lines={lines} setLines={setLines} whItems={whItems} supplierName={po.supplier} />

      <ProjectLockSection lockProject={lockProject} setLockProject={setLockProject} projectNo={projectNo} setProjectNo={setProjectNo} poProjectNo={po.projectNo} />

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onDone} className="h-10 px-4 rounded-lg text-[12.5px] text-stone-500 hover:bg-stone-100">Mégse</button>
        <button onClick={go} disabled={!canSubmit} className={`h-10 px-4 rounded-lg text-[12.5px] font-medium ${canSubmit ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-400"}`}>Bevételezés{payload.length > 1 ? ` (${payload.length})` : ""}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// KIVÉT-KÉRELMEK (FSM: kért → komissiózva → kiadva | visszavonva)
// ══════════════════════════════════════════════════════════════════════════
function WithdrawalsPage() {
  const sim = window.useSim();
  const [statusF, setStatusF] = useStateW2("active");
  const [consF, setConsF] = useStateW2("all");
  const [openId, setOpenId] = useStateW2(null);
  const [creating, setCreating] = useStateW2(false);

  const all = sim.withdrawals || [];
  const filtered = useMemoW2(() => {
    let list = all;
    if (statusF === "active") list = list.filter((w) => w.status === "kert" || w.status === "komissiozva");
    else if (statusF !== "all") list = list.filter((w) => w.status === statusF);
    if (consF !== "all") list = list.filter((w) => w.consumer === consF);
    return list;
  }, [all, statusF, consF]);
  const open = openId ? all.find((w) => w.id === openId) : null;
  const activeCount = all.filter((w) => w.status === "kert" || w.status === "komissiozva").length;

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[17px] font-semibold text-stone-900">Kivét</h2>
          <p className="text-[12.5px] text-stone-500">Kivét-kérelmek a fogyasztóktól — kért → komissiózva → kiadva.</p>
        </div>
        <PrimaryBtn icon="plus" onClick={() => setCreating(true)}>Új kivét-kérelem</PrimaryBtn>
      </div>

      {/* Státusz-szűrő */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2">
        <FilterChip active={statusF === "active"} onClick={() => setStatusF("active")} label="Aktív" count={activeCount} />
        <FilterChip active={statusF === "all"} onClick={() => setStatusF("all")} label="Mind" count={all.length} />
        {(window.WH_WD_ORDER || []).map((sk) => (
          <FilterChip key={sk} active={statusF === sk} onClick={() => setStatusF(sk)} label={window.WH_WD_FLOW[sk].label} count={all.filter((w) => w.status === sk).length} />
        ))}
      </div>
      {/* Fogyasztó-szűrő */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3">
        <FilterChip active={consF === "all"} onClick={() => setConsF("all")} label="Minden fogyasztó" />
        {(window.WH_CONSUMER_ORDER || []).map((ck) => (
          <FilterChip key={ck} active={consF === ck} onClick={() => setConsF(ck)} label={window.WH_CONSUMERS[ck].label} icon={window.WH_CONSUMERS[ck].icon} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.length === 0 && <Card className="px-5 py-8 text-center text-[12.5px] text-stone-400 md:col-span-2">Nincs kivét-kérelem ebben a nézetben.</Card>}
        {filtered.map((w) => {
          const st = window.WH_WD_FLOW[w.status] || {};
          return (
            <button key={w.id} onClick={() => setOpenId(w.id)} className="text-left w-full bg-white border border-stone-200/80 hover:border-stone-300 transition rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-stone-400">{w.id}</div>
                  <div className="mt-1"><WhConsumerPill consumer={w.consumer} /></div>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${st.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</span>
              </div>
              {w.refLabel && <div className="text-[12.5px] text-stone-700 truncate mb-1">{w.refLabel}</div>}
              <div className="text-[11.5px] text-stone-500">{(w.lines || []).length} tétel · {(w.lines || []).reduce((a, l) => a + (Number(l.qty) || 0), 0)} egység</div>
              <div className="text-[10.5px] text-stone-400 mt-1">{w.requestedBy} · {w.requestedAt}</div>
            </button>
          );
        })}
      </div>

      <SlideOver open={!!open} onClose={() => setOpenId(null)} width={520} title={open ? open.id : ""} subtitle={open ? (window.WH_CONSUMERS[open.consumer]?.label || open.consumer) : ""}>
        {open && <WithdrawalDetail wd={open} onClose={() => setOpenId(null)} />}
      </SlideOver>

      {creating && <WithdrawCreateDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function FilterChip({ active, onClick, label, count, icon }) {
  return (
    <button onClick={onClick} className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12px] font-medium transition ${active ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`}>
      {icon && <Icon name={icon} size={12} />}{label}
      {count != null && <span className={`tabular-nums text-[10.5px] ${active ? "text-white/60" : "text-stone-400"}`}>{count}</span>}
    </button>
  );
}

function WithdrawalDetail({ wd, onClose }) {
  const sim = window.useSim();
  const live = (sim.withdrawals || []).find((w) => w.id === wd.id) || wd;
  const st = window.WH_WD_FLOW[live.status] || {};
  const nexts = st.next || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <WhConsumerPill consumer={live.consumer} />
        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${st.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</span>
        {live.ref && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono">{live.ref}</span>}
      </div>
      {live.refLabel && <div className="text-[13px] text-stone-700">{live.refLabel}</div>}

      {/* Idővonal */}
      <div className="flex items-center gap-1">
        {["kert", "komissiozva", "kiadva"].map((s, i) => {
          const reached = window.WH_WD_ORDER.indexOf(live.status) >= window.WH_WD_ORDER.indexOf(s) && live.status !== "visszavonva";
          return (
            <React.Fragment key={s}>
              {i > 0 && <div className={`h-0.5 flex-1 ${reached ? "bg-teal-500" : "bg-stone-200"}`} />}
              <div className={`text-[10px] px-2 py-1 rounded-full font-medium ${reached ? "bg-teal-50 text-teal-700" : "bg-stone-100 text-stone-400"}`}>{window.WH_WD_FLOW[s].label}</div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Tételek */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2">Tételek</div>
        <div className="space-y-1.5">
          {(live.lines || []).map((l, i) => {
            const it = (sim.catalog || []).find((x) => x.id === l.itemId);
            const free = it?.worldExt?.warehouse?.available ?? null;
            const short = free != null && free < (Number(l.qty) || 0) && live.status !== "kiadva";
            return (
              <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2 text-[12.5px]">
                <div className="min-w-0">
                  <div className="text-stone-800 truncate">{l.name}</div>
                  <div className="text-[10.5px] text-stone-400 font-mono">{l.code}{free != null && ` · szabad: ${free}`}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-stone-800 tabular-nums">{l.qty} {l.unit}</div>
                  {short && <div className="text-[9.5px] text-rose-600">fedezethiány</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {live.note && <div className="text-[12px] text-stone-500 italic">„{live.note}"</div>}

      {/* FSM gombok */}
      {nexts.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {nexts.includes("komissiozva") && <WdBtn tone="amber" onClick={() => window.sim.setWithdrawalStatus(live.id, "komissiozva")}>Komissiózás</WdBtn>}
          {nexts.includes("kiadva") && <WdBtn tone="teal" onClick={() => { window.sim.setWithdrawalStatus(live.id, "kiadva"); onClose(); }}>Kiadás (kivét)</WdBtn>}
          {nexts.includes("kert") && <WdBtn tone="stone" onClick={() => window.sim.setWithdrawalStatus(live.id, "kert")}>Vissza kértre</WdBtn>}
          {nexts.includes("visszavonva") && <WdBtn tone="rose" onClick={() => { window.sim.setWithdrawalStatus(live.id, "visszavonva"); onClose(); }}>Visszavonás</WdBtn>}
        </div>
      ) : (
        <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2.5 text-[12px] text-stone-500 flex items-center gap-2">
          <Icon name="lock" size={14} className="text-stone-400" />Lezárt kérelem — nincs további művelet.{live.issuedAt && ` Kiadva: ${live.issuedAt}.`}
        </div>
      )}
    </div>
  );
}
function WdBtn({ children, onClick, tone }) {
  const tones = { amber: "bg-amber-500 text-white", teal: "bg-teal-700 text-white", stone: "bg-white border border-stone-200 text-stone-700", rose: "bg-rose-600 text-white" };
  return <button onClick={onClick} className={`h-10 px-4 rounded-lg text-[12.5px] font-medium ${tones[tone]}`}>{children}</button>;
}

// ── Kivét-kérelem létrehozó dialógus (general + tétel-előtöltés) ─────────────
function WithdrawCreateDialog({ onClose, initialItem }) {
  const sim = window.useSim();
  const whItems = (sim.catalog || []).filter((x) => x.active !== false && x.worldExt?.warehouse && !x.worldExt.warehouse.archived);
  const [consumer, setConsumer] = useStateW2("gyartas");
  const [ref, setRef] = useStateW2("");
  const [note, setNote] = useStateW2("");
  const [lines, setLines] = useStateW2(initialItem ? [{ itemId: initialItem.id, qty: "1" }] : [{ itemId: "", qty: "1" }]);

  const setLine = (i, patch) => setLines((ls) => ls.map((l, j) => j === i ? { ...l, ...patch } : l));
  const addLine = () => setLines((ls) => [...ls, { itemId: "", qty: "1" }]);
  const rmLine = (i) => setLines((ls) => ls.filter((_, j) => j !== i));

  const valid = lines.some((l) => l.itemId && (Number(l.qty) || 0) > 0);
  const submit = () => {
    const payload = lines.filter((l) => l.itemId && (Number(l.qty) || 0) > 0).map((l) => {
      const it = whItems.find((x) => x.id === l.itemId);
      return { itemId: l.itemId, code: it?.code, name: it?.name, qty: Number(l.qty) || 0, unit: it?.unit };
    });
    window.sim.createWithdrawal({ consumer, ref, refLabel: ref, lines: payload, note, requestedBy: window.WH_CONSUMERS[consumer]?.label });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-3.5 flex items-center justify-between">
          <div className="text-[14px] font-semibold text-stone-900">Új kivét-kérelem</div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-stone-100 text-stone-500"><Icon name="x" size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] text-stone-500 block mb-1.5">Fogyasztó</label>
            <div className="flex flex-wrap gap-1.5">
              {(window.WH_CONSUMER_ORDER || []).map((ck) => {
                const c = window.WH_CONSUMERS[ck];
                return (
                  <button key={ck} onClick={() => setConsumer(ck)} className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[12px] font-medium ${consumer === ck ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`}>
                    <Icon name={c.icon} size={13} />{c.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-stone-500 block mb-1">Hivatkozás (rendelés / projekt)</label>
            <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="pl. JT-2426-0184 vagy PRJ-2426-012"
              className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white" />
          </div>
          <div>
            <label className="text-[11px] text-stone-500 block mb-1.5">Tételek</label>
            <div className="space-y-2">
              {lines.map((l, i) => {
                const it = whItems.find((x) => x.id === l.itemId);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <select value={l.itemId} onChange={(e) => setLine(i, { itemId: e.target.value })} className="flex-1 h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-teal-500">
                      <option value="">— tétel —</option>
                      {whItems.filter((x) => !isVariantParentItem(x)).map((x) => <option key={x.id} value={x.id}>{x.variantOf ? ((window.sim.variantLabel && window.sim.variantLabel(x)) || x.name) : x.name} (szabad {x.worldExt.warehouse.available})</option>)}
                    </select>
                    <WhNumInput value={l.qty} onChange={(v) => setLine(i, { qty: v })} className="w-16" />
                    <span className="text-[10.5px] text-stone-400 w-8">{it?.unit || ""}</span>
                    {lines.length > 1 && <button onClick={() => rmLine(i)} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-stone-100 text-stone-400"><Icon name="x" size={14} /></button>}
                  </div>
                );
              })}
            </div>
            <button onClick={addLine} className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-teal-700 font-medium hover:text-teal-800"><Icon name="plus" size={14} />Tétel hozzáadása</button>
          </div>
          <div>
            <label className="text-[11px] text-stone-500 block mb-1">Megjegyzés</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="opcionális"
              className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 bg-white" />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-stone-100 px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-lg text-[12.5px] text-stone-500 hover:bg-stone-100">Mégse</button>
          <button onClick={submit} disabled={!valid} className={`h-10 px-4 rounded-lg text-[12.5px] font-medium ${valid ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-400"}`}>Kérelem létrehozása</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// BEÁLLÍTÁSOK → RAKTÁRHELYEK (szintek + hely-regiszter)
// ══════════════════════════════════════════════════════════════════════════
function WarehouseLevelsPanel() {
  const sim = window.useSim();
  const levels = sim.warehouseCfg?.levels || {};
  const locs = sim.warehouseLocations || [];
  const facilities = window.FACILITIES || [];
  const [adding, setAdding] = useStateW2(false);
  const [editId, setEditId] = useStateW2(null);

  const byFac = useMemoW2(() => {
    const m = {};
    locs.forEach((l) => { (m[l.facilityId] = m[l.facilityId] || []).push(l); });
    return m;
  }, [locs]);

  return (
    <div className="max-w-[900px]">
      {/* Szintek */}
      <div className="mb-6">
        <div className="text-[13px] font-semibold text-stone-900 mb-1">Raktárhely-szintek</div>
        <p className="text-[12px] text-stone-500 mb-3">Állítsd be, mely szinteken kezeli a cég a raktárhelyeket. A <b>Raktár</b> és a <b>Tároló</b> kötelező.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {(window.WH_LEVELS || []).map((lv) => {
            const on = !!levels[lv.key];
            return (
              <div key={lv.key} className={`rounded-xl border p-3.5 transition ${on ? "border-teal-300 bg-teal-50/40" : "border-stone-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-stone-900">{lv.label}</span>
                      {lv.mandatory && <span className="inline-flex items-center gap-0.5 text-[9.5px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200"><Icon name="lock" size={9} />kötelező</span>}
                      {lv.fromFacilities && <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">Részlegekből</span>}
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">{lv.desc}</div>
                  </div>
                  <button onClick={() => window.sim.setWhLevel(lv.key, !on)} disabled={lv.mandatory}
                    className={`shrink-0 w-11 h-6 rounded-full relative transition ${on ? "bg-teal-600" : "bg-stone-300"} ${lv.mandatory ? "opacity-60 cursor-not-allowed" : ""}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hely-regiszter */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-semibold text-stone-900">Raktárhelyek</div>
            <p className="text-[12px] text-stone-500">{locs.length} hely · csak az engedélyezett szintek jelennek meg.</p>
          </div>
          <PrimaryBtn icon="plus" onClick={() => { setAdding(true); setEditId(null); }}>Új hely</PrimaryBtn>
        </div>

        {adding && <WhLocationForm levels={levels} facilities={facilities} onClose={() => setAdding(false)} />}

        <div className="space-y-4">
          {facilities.map((f) => {
            const list = byFac[f.id] || [];
            if (list.length === 0 && !levels.telephely) return null;
            return (
              <div key={f.id}>
                {levels.telephely && <div className="text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">{f.name}</div>}
                <Card className="p-0 overflow-hidden">
                  {list.length === 0 && <div className="px-4 py-3 text-[12px] text-stone-400 italic">Nincs hely ezen a telephelyen.</div>}
                  {list.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-stone-100 last:border-0">
                      {editId === l.id
                        ? <WhLocationForm inline loc={l} levels={levels} facilities={facilities} onClose={() => setEditId(null)} />
                        : (<>
                            <div className="text-[12.5px] text-stone-800 font-mono">{window.sim.whLocLabel(l)}</div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEditId(l.id)} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-stone-100 text-stone-400"><Icon name="settings" size={14} /></button>
                              <button onClick={() => window.sim.removeWhLocation(l.id)} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-500"><Icon name="x" size={14} /></button>
                            </div>
                          </>)}
                    </div>
                  ))}
                </Card>
              </div>
            );
          })}
          {/* telephely-szint kikapcsolva → lapos lista */}
          {!levels.telephely && (byFac["__none"] || locs.filter((l) => !facilities.find((f) => f.id === l.facilityId))).length > 0 && null}
        </div>
      </div>
    </div>
  );
}

function WhLocationForm({ loc, levels, facilities, onClose, inline }) {
  const [facilityId, setFacilityId] = useStateW2(loc?.facilityId || (facilities[0]?.id || ""));
  const [raktar, setRaktar] = useStateW2(loc?.raktar || "");
  const [helyiseg, setHelyiseg] = useStateW2(loc?.helyiseg || "");
  const [tarolo, setTarolo] = useStateW2(loc?.tarolo || "");
  const [rekesz, setRekesz] = useStateW2(loc?.rekesz || "");

  const valid = raktar.trim() && tarolo.trim();
  const save = () => {
    const data = { facilityId, raktar, helyiseg, tarolo, rekesz };
    if (loc) window.sim.updateWhLocation(loc.id, data);
    else window.sim.addWhLocation(data);
    onClose();
  };

  return (
    <div className={inline ? "w-full" : "rounded-xl border border-teal-200 bg-teal-50/30 p-3.5 mb-3"}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {levels.telephely && (
          <div>
            <label className="text-[10px] text-stone-500 block mb-1">Telephely</label>
            <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-teal-500">
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}
        <Fld label="Raktár *" value={raktar} onChange={setRaktar} ph="R1" />
        {levels.helyiseg && <Fld label="Helyiség" value={helyiseg} onChange={setHelyiseg} ph="Laptár" />}
        <Fld label="Tároló *" value={tarolo} onChange={setTarolo} ph="A1" />
        {levels.rekesz && <Fld label="Rekesz" value={rekesz} onChange={setRekesz} ph="3" />}
      </div>
      <div className="flex justify-end gap-1.5 mt-2.5">
        <button onClick={onClose} className="h-9 px-3 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100">Mégse</button>
        <button onClick={save} disabled={!valid} className={`h-9 px-3.5 rounded-lg text-[12px] font-medium ${valid ? "bg-teal-700 text-white" : "bg-stone-200 text-stone-400"}`}>{loc ? "Mentés" : "Hozzáadás"}</button>
      </div>
    </div>
  );
}
function Fld({ label, value, onChange, ph }) {
  return (
    <div>
      <label className="text-[10px] text-stone-500 block mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph}
        className="w-full h-9 px-2 rounded-lg border border-stone-200 text-[12px] font-mono outline-none focus:border-teal-500 bg-white" />
    </div>
  );
}

Object.assign(window, {
  ReceivingPage, WithdrawalsPage, WithdrawCreateDialog, WarehouseLevelsPanel,
  QuickWithdrawDialog: WithdrawCreateDialog,
});
