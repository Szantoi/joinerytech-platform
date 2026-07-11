// ═════════════════════════════════════════════════════════════════
// page-masterdata.jsx — Törzsadat világ → Jóváhagyások
//
//   A cikkszám-életciklus governance-felülete. A katalógus-tételek
//   státusza (draft → review → active …) a tételen él; itt a JÓVÁHAGYÓ
//   látja a beküldött (review) tételeket, a hiánylistát, és léptet.
//   A jóváhagyás `catalog.approve` joghoz kötött (lezárt jelzés jog híján).
// ═════════════════════════════════════════════════════════════════
const { useState: useMD } = React;

const MD_KIND_LABEL = { material: "Anyag", hardware: "Vasalat", service: "Szolgáltatás", product: "Késztermék" };

function CatalogApprovals() {
  window.useSim();           // reaktív feliratkozás a store-ra (re-render státuszváltáskor)
  const sim = window.sim;    // store-API — a useSim()/getState CSAK adatot ad, metódust NEM
  const [tab, setTab] = useMD("review");
  const canApprove = sim.hasPerm("catalog.approve");

  const counts = {
    review: sim.catalogByStatus("review").length,
    draft: sim.catalogByStatus("draft").length,
    incomplete: sim.catalogByStatus("incomplete").length,
    rejected: sim.catalogByStatus("rejected").length,
  };
  const TABS = [
    { k: "review", label: "Jóváhagyásra vár", n: counts.review },
    { k: "draft", label: "Piszkozatok", n: counts.draft },
    { k: "incomplete", label: "Hiányos", n: counts.incomplete },
    { k: "rejected", label: "Elutasítva", n: counts.rejected },
  ];
  const items = sim.catalogByStatus(tab);

  const reasonGo = (id, to) => { const r = window.prompt(to === "rejected" ? "Elutasítás indoka:" : "Mi hiányzik / mit kell pótolni?"); if (r && r.trim()) sim.setCatalogStatus(id, to, { reason: r.trim() }); };
  const openMaster = () => window.navigateTo && window.navigateTo("masterdata", "catalog");

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="flex items-end justify-between gap-3 mb-1 flex-wrap">
        <div>
          <div className="text-[18px] font-semibold text-stone-900 tracking-tight">Jóváhagyások</div>
          <div className="text-[12px] text-stone-500">Cikkszám-életciklus — beküldött tételek és hiánypótlás</div>
        </div>
        <button onClick={openMaster} className="h-9 px-3.5 rounded-lg border border-stone-200 bg-white text-[12px] font-medium text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1.5">
          <Icon name="layers" size={14} />Cikkszámok megnyitása
        </button>
      </div>
      {!canApprove && (
        <div className="mt-3 mb-1 flex items-center gap-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Icon name="lock" size={14} /> Nincs jóváhagyási jogosultságod (<span className="font-mono">catalog.approve</span>) — csak megtekintheted a sort.
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5 mt-4 mb-4 overflow-x-auto w-fit max-w-full">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-3 h-8 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition ${tab === t.k ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
            {t.label}
            {t.n > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.k ? "bg-white/20 text-white" : "bg-stone-200 text-stone-600"}`}>{t.n}</span>}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl px-5 py-12 text-center text-[13px] text-stone-400">
          Nincs tétel ebben az állapotban.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((it) => {
            const comp = sim.catalogCompleteness(it);
            return (
              <div key={it.id} className="bg-white border border-stone-200 rounded-xl px-4 md:px-5 py-3.5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-stone-900">{it.name}</span>
                      <CMStatusBadge status={it.status} />
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">{MD_KIND_LABEL[it.kind] || it.kind || "—"}</span>
                    </div>
                    <div className="text-[11px] font-mono text-stone-400 mt-0.5">{it.code} · {it.cat || "—"}{it.createdBy ? ` · ${it.createdBy}` : ""}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-semibold text-stone-800 tabular-nums">{Number(it.price) > 0 ? fmtHUF(it.price) : <span className="text-stone-300">nincs ár</span>}</div>
                    {it.statusReason && (it.status === "incomplete" || it.status === "rejected") && <div className="text-[10.5px] text-amber-600 max-w-[220px]">{it.statusReason}</div>}
                  </div>
                </div>

                {/* Completeness */}
                {!comp.ready && (
                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                    {comp.checks.filter((c) => !c.ok).map((c) => (
                      <span key={c.key} className="inline-flex items-center gap-1 text-[11px] text-stone-600">
                        <span className="w-3.5 h-3.5 rounded-full bg-stone-200 text-stone-400 grid place-items-center"><Icon name="x" size={9} /></span>{c.label}
                      </span>
                    ))}
                  </div>
                )}
                {comp.ready && it.status === "review" && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                    <Icon name="check" size={13} /> Minden kötelező mező kész — jóváhagyható
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {it.status === "review" && (
                    <>
                      <button onClick={() => sim.setCatalogStatus(it.id, "active")} disabled={!canApprove || !comp.ready}
                        title={!canApprove ? "Nincs jogosultság (catalog.approve)" : (!comp.ready ? `Hiányzó: ${comp.missing.join(", ")}` : "")}
                        className={`h-8 px-3 rounded-lg text-[11.5px] font-medium transition ${(!canApprove || !comp.ready) ? "bg-stone-100 text-stone-300 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                        Jóváhagyás
                      </button>
                      <button onClick={() => reasonGo(it.id, "incomplete")} disabled={!canApprove}
                        className={`h-8 px-3 rounded-lg text-[11.5px] font-medium transition ${!canApprove ? "bg-stone-100 text-stone-300 cursor-not-allowed" : "border border-amber-300 text-amber-700 hover:bg-amber-50"}`}>
                        Hiánypótlásra
                      </button>
                      <button onClick={() => reasonGo(it.id, "rejected")} disabled={!canApprove}
                        className={`h-8 px-3 rounded-lg text-[11.5px] font-medium transition ${!canApprove ? "bg-stone-100 text-stone-300 cursor-not-allowed" : "border border-red-300 text-red-700 hover:bg-red-50"}`}>
                        Elutasítás
                      </button>
                    </>
                  )}
                  {(it.status === "draft" || it.status === "incomplete") && (
                    <button onClick={() => sim.setCatalogStatus(it.id, "review")}
                      className="h-8 px-3 rounded-lg text-[11.5px] font-medium bg-sky-600 text-white hover:bg-sky-700">
                      Beküldés jóváhagyásra
                    </button>
                  )}
                  {it.status === "rejected" && (
                    <button onClick={() => sim.setCatalogStatus(it.id, "draft")}
                      className="h-8 px-3 rounded-lg text-[11.5px] font-medium border border-stone-200 text-stone-600 hover:bg-stone-50">
                      Vissza piszkozatba
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.CatalogApprovals = CatalogApprovals;
