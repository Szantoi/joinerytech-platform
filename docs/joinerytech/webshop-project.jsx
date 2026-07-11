// ──────────────────────────────────────────────────────────────────────────
// webshop-project.jsx — VEVŐI PORTÁL · projekt-betekintő (MODULÁRIS MAG)
//
//   A vevő gazdag betekintést kap a saját projektjébe, FÜLEKKEL:
//     MAG (domén-semleges):  Áttekintés · Brief · Ajánlatok · Rendelések · Dokumentumok
//     ADAPTEREK (domén-specifikus, cserélhető):  Belsőépítészet / Gyártás / …
//
//   ⭐ ÉSZAKI CSILLAG: a domén-specifikus füleket NEM ez a fájl tudja — egy
//   REGISTRY-be regisztrálják magukat (window.registerProjectAdapter). A MAG
//   teljesen domén-semleges; egy pékség-adapter ugyanígy regisztrálna pl. egy
//   „Receptúra / sarzs" fület — kódváltás nélkül.
//
//   EGY igazságforrás: minden a store vevő-scoped helpereiből
//   (projectsForCustomer / briefsForCustomer / quotesForCustomer /
//   ordersForCustomer / docsFor / conceptForProject / customerProjectPhases).
//   Csak MEGOSZTHATÓ tartalom (kiküldött ajánlat · elfogadott brief · kiadott
//   dokumentum · véglegesített látványterv). Interakció: letöltés-szimuláció,
//   üzenet a cégnek, ajánlat elfogadása.  Exportál: window.ProjectDetail.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStatePP } = React;

// ── Adapter-registry (a verticalizálhatóság magja) ────────────────────────
window.ProjectPortalAdapters = window.ProjectPortalAdapters || [];
window.registerProjectAdapter = function (def) {
  if (!def || !def.id) return;
  const i = window.ProjectPortalAdapters.findIndex((a) => a.id === def.id);
  if (i >= 0) window.ProjectPortalAdapters[i] = def; else window.ProjectPortalAdapters.push(def);
};

// ── Közös segédek ──────────────────────────────────────────────────────────
const ppFmt = (n) => Math.round(Number(n) || 0).toLocaleString("hu-HU");
function ppDownload(label, body) {
  try {
    const blob = new Blob([body || `${label}\n\n(Szimulált dokumentum — JoineryTech prototípus)`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = label.replace(/[^\w.-]+/g, "_") + ".txt";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { /* no-op */ }
  if (window.toast) window.toast(`📄 ${label} — letöltve (szimuláció).`, "success");
}

// Üzenet a cégnek/tervezőnek egy adott elemről
function PpMessage({ customer, refLabel, compact }) {
  const [open, setOpen] = useStatePP(false);
  const [text, setText] = useStatePP("");
  const send = () => { if (window.sim.customerMessage(customer, text, refLabel)) { setText(""); setOpen(false); } };
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={`inline-flex items-center gap-1.5 ${compact ? "h-8 px-2.5 text-[11.5px]" : "h-9 px-3 text-[12px]"} rounded-lg border border-stone-200 text-stone-600 font-medium hover:bg-stone-50`}>
        <Icon name="chat" size={13} />Kérdésem van
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} autoFocus
        placeholder={refLabel ? `Üzenet erről: ${refLabel}…` : "Írja meg kérdését a tervezőnek…"}
        className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-teal-500 resize-none" />
      <div className="flex items-center justify-end gap-2 mt-2">
        <button onClick={() => setOpen(false)} className="h-8 px-3 rounded-lg text-[12px] text-stone-500 hover:bg-stone-100">Mégse</button>
        <button onClick={send} disabled={!text.trim()} className="h-8 px-3.5 rounded-lg bg-teal-600 text-white text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5"><Icon name="send" size={13} />Küldés</button>
      </div>
    </div>
  );
}

// Szekció-keret
function PpSection({ title, sub, right, children }) {
  return (
    <section className="space-y-3">
      {(title || right) && (
        <div className="flex items-end justify-between gap-3">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-stone-800">{title}</h2>}
            {sub && <p className="text-[11.5px] text-stone-500 mt-0.5">{sub}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

// ── Ajánlat-pill (vevő-barát) ──────────────────────────────────────────────
const PP_QUOTE_TONE = {
  sent:      { label: "Elfogadásra vár", pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  approved:  { label: "Elfogadva",       pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  converted: { label: "Megrendelve",     pill: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
};
function PpQuotePill({ status }) {
  const t = PP_QUOTE_TONE[status] || PP_QUOTE_TONE.sent;
  return <span className={`inline-flex items-center gap-1.5 px-2 h-6 rounded-full border text-[11px] font-medium ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}

// ══ MAG fül: Áttekintés ════════════════════════════════════════════════════
function PpOverview({ ctx }) {
  const p = ctx.project;
  const ms = p.customerMilestones || [];
  const doneN = ms.filter((m) => m.done).length;
  const stats = [
    { label: "Brief", value: ctx.briefs.length, icon: "file" },
    { label: "Ajánlat", value: ctx.quotes.length, icon: "receipt" },
    { label: "Rendelés", value: ctx.orders.length, icon: "box" },
    { label: "Dokumentum", value: ctx.docs.length, icon: "folder" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-stone-200 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium mb-1.5"><Icon name={s.icon} size={13} className="text-stone-400" />{s.label}</div>
            <div className="text-[20px] font-semibold text-stone-900 tabular-nums leading-none">{s.value}</div>
          </div>
        ))}
      </div>

      {ms.length > 0 && (
        <PpSection title="Hol tartunk?" sub={`${doneN} / ${ms.length} mérföldkő kész`}>
          <div className="bg-white rounded-2xl border border-stone-200 p-4 md:p-5">
            <div className="space-y-0">
              {ms.map((m, i) => {
                const last = i === ms.length - 1;
                return (
                  <div key={m.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-6 h-6 rounded-full grid place-items-center ${m.done ? "bg-teal-600 text-white" : "bg-white border-2 border-stone-200"}`}>
                        {m.done ? <Icon name="check" size={13} /> : <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />}
                      </div>
                      {!last && <div className="w-0.5 flex-1 min-h-[18px]" style={{ background: m.done ? "#99f6e4" : "#e7e5e4" }} />}
                    </div>
                    <div className="min-w-0 flex-1 pb-3">
                      <div className={`text-[13px] leading-tight ${m.done ? "font-medium text-stone-800" : "text-stone-500"}`}>{m.label}</div>
                      {m.done && m.doneAt && <div className="text-[10.5px] text-stone-400 mt-0.5">{m.doneAt}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </PpSection>
      )}

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
        <div className="text-[12px] text-stone-500">Kérdése van a projektről? Írjon a tervezőjének.</div>
        <PpMessage customer={ctx.customer} refLabel={p.name} compact />
      </div>
    </div>
  );
}

// ══ MAG fül: Brief ═════════════════════════════════════════════════════════
function PpBriefs({ ctx }) {
  const FIELDS = window.BRIEF_FIELDS || [];
  return (
    <div className="space-y-4">
      {ctx.briefs.map((b) => {
        const f = b.fields || {};
        const filled = FIELDS.filter((fd) => String(f[fd.key] || "").trim());
        return (
          <div key={b.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-4 md:px-5 py-3.5 border-b border-stone-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-stone-900 truncate">{b.title || b.name || "Tervezési brief"}</div>
                {b.site && <div className="text-[11px] text-stone-500 mt-0.5">{b.site}</div>}
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-medium shrink-0"><Icon name="check" size={12} />Elfogadott</span>
            </div>
            <div className="px-4 md:px-5 py-3 grid sm:grid-cols-2 gap-x-5 gap-y-2.5">
              {filled.map((fd) => (
                <div key={fd.key}>
                  <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium">{fd.label}</div>
                  <div className="text-[12.5px] text-stone-700 mt-0.5 leading-snug">{f[fd.key]}</div>
                </div>
              ))}
            </div>
            <div className="px-4 md:px-5 py-2.5 border-t border-stone-100 flex items-center justify-end gap-2">
              <PpMessage customer={ctx.customer} refLabel={b.title || "Brief"} compact />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══ MAG fül: Ajánlatok ═════════════════════════════════════════════════════
function PpQuotes({ ctx }) {
  const accept = (id) => window.sim.customerAcceptQuote(id);
  return (
    <div className="space-y-3">
      {ctx.quotes.map((q) => (
        <div key={q.id} className="bg-white rounded-2xl border border-stone-200 px-4 md:px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13.5px] font-semibold text-stone-900">{q.id}</span>
                <PpQuotePill status={q.status} />
              </div>
              <div className="text-[11px] text-stone-500 mt-1">Kelt {q.date}{q.expires ? ` · érvényes ${q.expires}-ig` : ""}{q.items ? ` · ${q.items} tétel` : ""}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[15px] font-semibold text-stone-900 tabular-nums">{ppFmt(q.value)} Ft</div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-stone-100">
            <button onClick={() => ppDownload(`Ajanlat_${q.id}`, `JoineryTech — Árajánlat\n\nAjánlatszám: ${q.id}\nÜgyfél: ${q.customer}\nÉrték: ${ppFmt(q.value)} Ft\nÉrvényes: ${q.expires || "—"}`)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 text-stone-600 text-[12px] font-medium hover:bg-stone-50"><Icon name="download" size={14} />Letöltés</button>
            <PpMessage customer={ctx.customer} refLabel={`Ajánlat ${q.id}`} compact />
            {q.status === "sent" && (
              <button onClick={() => accept(q.id)} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-semibold"><Icon name="check" size={14} />Elfogadom</button>
            )}
            {q.status === "approved" && q.customerAcceptedAt && (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium"><Icon name="check" size={14} />Elfogadva {q.customerAcceptedAt}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══ MAG fül: Rendelések ════════════════════════════════════════════════════
const PP_ORDER_STEP = { draft: "Beérkezett", calc: "Visszaigazolva", ready: "Gyártásra kész", released: "Gyártás alatt", delivered: "Kész / átadva" };
function PpOrders({ ctx }) {
  return (
    <div className="space-y-3">
      {ctx.orders.map((o) => {
        const step = PP_ORDER_STEP[o.status] || "Folyamatban";
        const lines = o.lines || [];
        return (
          <div key={o.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-4 md:px-5 py-3.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-stone-900">{o.id}</div>
                <div className="text-[11px] text-stone-500 mt-0.5">Rögzítve {o.date}{o.items ? ` · ${o.items} tétel` : ""}</div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11.5px] font-medium shrink-0">{step}</span>
            </div>
            {lines.length > 0 && (
              <div className="px-4 md:px-5 pb-3">
                <div className="rounded-xl bg-stone-50 border border-stone-100 divide-y divide-stone-100">
                  {lines.map((l, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-[12px]">
                      <span className="text-stone-700 truncate">{l.name}{l.qty ? ` · ${l.qty} ${l.unit || "db"}` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══ MAG fül: Dokumentumok ══════════════════════════════════════════════════
function PpDocs({ ctx }) {
  const TM = window.DOC_TYPE_META || {};
  return (
    <div className="space-y-2.5">
      {ctx.docs.map((d) => {
        const tm = TM[d.type] || { label: d.type };
        return (
          <div key={d.id} className="bg-white rounded-2xl border border-stone-200 px-4 md:px-5 py-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 grid place-items-center shrink-0"><Icon name="file" size={18} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-stone-900 truncate">{d.name}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">{tm.label} · v{d.version} · frissítve {d.updatedAt}</div>
            </div>
            <button onClick={() => ppDownload(d.fileLabel || d.name, `JoineryTech — ${tm.label}\n\n${d.name}\nVerzió: v${d.version}\n${d.note || ""}`)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 text-stone-600 text-[12px] font-medium hover:bg-stone-50 shrink-0"><Icon name="download" size={14} />Letöltés</button>
          </div>
        );
      })}
    </div>
  );
}

// ══ A projekt-detail shell (MAG fülek + adapter-fülek) ══════════════════════
function ProjectDetail({ projectId, customer, onBack }) {
  const sim = useSim();
  const project = (sim.projects || []).find((p) => p.id === projectId);
  const [tab, setTab] = useStatePP("overview");
  if (!project) return null;

  // ── ctx — minden adapter EZT kapja (domén-semleges adat-csomag) ──
  const orders = sim.ordersForCustomer(customer).filter((o) => o.projectId === projectId);
  const briefs = sim.briefsForCustomer(customer).filter((b) => b.projectId === projectId && (!window.BriefEngine || window.BriefEngine.minimumReady(b)));
  const quotes = sim.quotesForCustomer(customer).filter((q) => q.projectRef === projectId && ["sent", "approved", "converted"].includes(q.status));
  const docSet = [];
  (sim.docsFor("project", projectId) || []).forEach((d) => docSet.push(d));
  orders.forEach((o) => (sim.docsFor("order", o.id) || []).forEach((d) => docSet.push(d)));
  const docs = docSet.filter((d) => d.status === "kiadott");
  const concept = sim.conceptForProject(projectId);
  const phases = sim.customerProjectPhases(projectId);

  const ctx = { project, customer, orders, briefs, quotes, docs, concept, phases,
    helpers: { download: ppDownload } };

  // ── fülek: MAG (csak ahol van tartalom) + adapterek (applies) ──
  const adapters = (window.ProjectPortalAdapters || []).filter((a) => { try { return a.applies(ctx); } catch (e) { return false; } });
  const tabs = [
    { id: "overview", label: "Áttekintés", icon: "dashboard" },
    briefs.length && { id: "briefs", label: "Brief", icon: "file" },
    quotes.length && { id: "quotes", label: "Ajánlatok", icon: "receipt" },
    orders.length && { id: "orders", label: "Rendelések", icon: "box" },
    docs.length && { id: "docs", label: "Dokumentumok", icon: "folder" },
    ...adapters.map((a) => ({ id: a.id, label: a.label, icon: a.icon || "layers", _adapter: a })),
  ].filter(Boolean);
  const active = tabs.find((t) => t.id === tab) || tabs[0];

  const STEP = { draft: "Beérkezett", active: "Folyamatban", delivered: "Átadva", done: "Lezárva" };

  return (
    <div className="max-w-[860px]">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[12.5px] text-stone-500 hover:text-stone-800 mb-3">
        <Icon name="chevron" size={14} className="rotate-180" />Vissza az Egyedi megrendeléshez
      </button>

      <div className="mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-[20px] md:text-[24px] font-semibold text-stone-900 tracking-tight">{project.name}</h1>
          <span className="inline-flex items-center px-2 h-6 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium">{STEP[project.status] || project.status}</span>
        </div>
        <p className="text-[12.5px] text-stone-500 mt-1">
          {project.designer ? `Tervező: ${project.designer}` : ""}
          {project.installTarget ? `${project.designer ? " · " : ""}Tervezett átadás: ${project.installTarget}` : ""}
        </p>
      </div>

      {/* fül-nav */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-stone-200 mb-5 -mx-1 px-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 h-10 text-[13px] font-medium border-b-2 transition whitespace-nowrap shrink-0 ${active.id === t.id ? "border-teal-600 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800"}`}>
            <Icon name={t.icon} size={14} className={active.id === t.id ? "text-teal-600" : "text-stone-400"} />{t.label}
          </button>
        ))}
      </div>

      {/* fül-tartalom */}
      {active.id === "overview" ? <PpOverview ctx={ctx} />
        : active.id === "briefs" ? <PpBriefs ctx={ctx} />
        : active.id === "quotes" ? <PpQuotes ctx={ctx} />
        : active.id === "orders" ? <PpOrders ctx={ctx} />
        : active.id === "docs" ? <PpDocs ctx={ctx} />
        : active._adapter ? active._adapter.render(ctx)
        : null}
    </div>
  );
}

Object.assign(window, { ProjectDetail, ppDownload, PpSection, PpMessage });
