// ─────────────────────────────────────────────────────────────────
// page-docs.jsx — DOKUMENTUMTÁR világ (DMS)
//   Áttekintés (KPI + típus-bontás + ellenőrzésre váró) + Dokumentumok
//   (szűrhető lista) + részlet-SlideOver (életciklus-FSM + verziózás + előzmény)
//   + új dokumentum sheet. Store: window.sim.documents + akciók; DocsEngine.
// ─────────────────────────────────────────────────────────────────
const { useState: useStateD } = React;

function DocStatusPill({ status, size = "md" }) {
  const t = (window.DOC_STATUS || {})[status] || { label: status, pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11.5px]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls} ${t.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
}
function DocTypeBadge({ type, size = "md" }) {
  const m = (window.DOC_TYPE_META || {})[type] || {};
  const cls = size === "sm" ? "px-1.5 h-5 text-[10px]" : "px-2 h-6 text-[11px]";
  return <span className={`inline-flex items-center gap-1 rounded-md border font-medium ${cls} ${m.pill}`}><Icon name={m.icon || "file"} size={size === "sm" ? 11 : 12} />{m.short || type}</span>;
}
function DocLinkBadge({ linkType, linkLabel }) {
  const m = (window.DOC_LINK_META || {})[linkType] || {};
  if (!linkLabel) return null;
  return <span className="inline-flex items-center gap-1 text-[10.5px] text-stone-500"><Icon name={m.icon || "folder"} size={11} className="text-stone-400" />{linkLabel}</span>;
}

function DocRow({ doc, onOpen }) {
  const m = (window.DOC_TYPE_META || {})[doc.type] || {};
  return (
    <button onClick={() => onOpen(doc.id)} className="w-full text-left px-3.5 md:px-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: (m.accent || "#7c3aed") + "1a", color: m.accent || "#7c3aed" }}><Icon name={m.icon || "file"} size={18} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap"><span className="text-[13px] font-semibold text-stone-900 truncate">{doc.name}</span><span className="text-[10px] font-mono text-stone-400">v{doc.version}</span></div>
        <div className="text-[11px] text-stone-500 truncate mt-0.5">{doc.id} · {doc.fileLabel || "—"}</div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap"><DocTypeBadge type={doc.type} size="sm" /><DocLinkBadge linkType={doc.linkType} linkLabel={doc.linkLabel} /></div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1"><DocStatusPill status={doc.status} size="sm" /><Icon name="chevron" size={15} className="text-stone-300" /></div>
    </button>
  );
}

function DocsDetailHost({ openId, setOpen }) {
  const sim = useSim();
  const SO = window.SlideOver;
  if (!SO) return null;
  const doc = openId ? (sim.documents || []).find((x) => x.id === openId) : null;
  const onClose = () => setOpen(null);
  return (
    <SO open={!!doc} onClose={onClose} title={doc ? doc.name : ""} subtitle={doc ? `${doc.id} · v${doc.version}` : ""} width={560}>
      {doc && window.DocDetail ? <window.DocDetail doc={doc} onClose={onClose} /> : null}
    </SO>
  );
}

// ── Áttekintés ───────────────────────────────────────────────────
function DocsDashboard({ onScreen }) {
  const sim = useSim();
  const list = sim.documents || [];
  const [openId, setOpenId] = useStateD(null);
  const [newOpen, setNewOpen] = useStateD(false);
  const E = window.DocsEngine;
  const st = E ? E.stats(list) : { total: 0, kiadott: 0, ellenorzes: 0, piszkozat: 0 };
  const review = list.filter((d) => d.status === "ellenorzes");

  const byType = {};
  list.forEach((d) => { byType[d.type] = (byType[d.type] || 0) + 1; });
  const typeRows = (window.DOC_TYPE_ORDER || []).map((k) => [k, byType[k] || 0]).filter(([, n]) => n > 0);
  const typeMax = Math.max(1, ...typeRows.map(([, n]) => n));

  const KPI = ({ label, value, sub, tone = "stone", icon }) => (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-center justify-between"><div className={`w-8 h-8 rounded-lg grid place-items-center bg-${tone}-50 text-${tone}-600`}><Icon name={icon} size={16} /></div><div className="text-[22px] font-semibold text-stone-900 leading-none">{value}</div></div>
      <div className="text-[12px] font-medium text-stone-700 mt-2.5">{label}</div>{sub && <div className="text-[10.5px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div><h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Dokumentumtár</h1><p className="text-[12.5px] text-stone-500 mt-0.5">Verziózott rajzok, szerződések, tanúsítványok — {window.DOC_TODAY}</p></div>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Új dokumentum</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="Összes dokumentum" value={st.total} sub="a regiszterben" tone="violet" icon="folder" />
        <KPI label="Kiadott (érvényes)" value={st.kiadott} sub="hatályos verzió" tone="emerald" icon="check" />
        <KPI label="Ellenőrzésre vár" value={st.ellenorzes} sub="jóváhagyásra" tone="amber" icon="clock" />
        <KPI label="Piszkozat" value={st.piszkozat} sub="munkapéldány" tone="stone" icon="file" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between"><span className="text-[12.5px] font-semibold text-stone-800">Ellenőrzésre váró dokumentumok</span><button onClick={() => onScreen && onScreen("all")} className="text-[11.5px] text-violet-600 font-medium inline-flex items-center gap-1">Mind <Icon name="chevron" size={13} /></button></div>
          {review.length ? review.map((d) => <DocRow key={d.id} doc={d} onOpen={setOpenId} />) : <div className="px-4 py-10 text-center text-[12.5px] text-stone-400">Nincs ellenőrzésre váró dokumentum.</div>}
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="text-[12.5px] font-semibold text-stone-800 mb-3">Típus szerint</div>
          <div className="space-y-2.5">
            {typeRows.map(([k, n]) => { const m = window.DOC_TYPE_META[k] || {}; return (
              <div key={k} className="flex items-center gap-2"><Icon name={m.icon || "file"} size={14} className="text-stone-400 shrink-0" /><span className="text-[11.5px] text-stone-600 w-[92px] shrink-0 truncate">{m.short}</span><div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(n / typeMax) * 100}%`, background: m.accent || "#7c3aed" }} /></div><span className="text-[11px] text-stone-500 w-4 text-right">{n}</span></div>
            ); })}
          </div>
        </div>
      </div>

      <DocsDetailHost openId={openId} setOpen={setOpenId} />
      {newOpen && window.NewDocSheet && <window.NewDocSheet onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />}
    </div>
  );
}

// ── Dokumentumok (lista) ─────────────────────────────────────────
function DocsAll() {
  const sim = useSim();
  const [openId, setOpenId] = useStateD(null);
  const [newOpen, setNewOpen] = useStateD(false);
  const [typeF, setTypeF] = useStateD("all");
  const [statusF, setStatusF] = useStateD("all");
  const [q, setQ] = useStateD("");
  const list = (sim.documents || []).filter((d) =>
    (typeF === "all" || d.type === typeF)
    && (statusF === "all" || d.status === statusF)
    && (!q.trim() || (d.name + " " + d.id + " " + (d.linkLabel || "") + " " + (d.fileLabel || "")).toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3"><h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Dokumentumok</h1><button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[12.5px] font-medium shrink-0"><Icon name="plus" size={15} />Új dokumentum</button></div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]"><Icon name="search" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés…" className="w-full h-9 pl-8 pr-3 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-violet-500" /></div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] bg-white outline-none focus:border-violet-500"><option value="all">Minden státusz</option>{Object.keys(window.DOC_STATUS || {}).map((k) => <option key={k} value={k}>{window.DOC_STATUS[k].label}</option>)}</select>
      </div>
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
        {[["all", "Mind"], ...window.DOC_TYPE_ORDER.map((k) => [k, window.DOC_TYPE_META[k].short])].map(([k, lbl]) => (
          <button key={k} onClick={() => setTypeF(k)} className={`shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border ${typeF === k ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"}`}>{lbl}</button>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">{list.length ? list.map((d) => <DocRow key={d.id} doc={d} onOpen={setOpenId} />) : <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs találat.</div>}</div>
      <DocsDetailHost openId={openId} setOpen={setOpenId} />
      {newOpen && window.NewDocSheet && <window.NewDocSheet onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />}
    </div>
  );
}

// ── Részlet (FSM + verziózás) ────────────────────────────────────
function DocDetail({ doc, onClose }) {
  const sim = useSim();
  const live = (sim.documents || []).find((x) => x.id === doc.id) || doc;
  const E = window.DocsEngine;
  const next = E ? E.nextStates(live) : [];
  const m = (window.DOC_TYPE_META || {})[live.type] || {};
  const lm = (window.DOC_LINK_META || {})[live.linkType] || {};
  const [verOpen, setVerOpen] = useStateD(false);
  const [verNote, setVerNote] = useStateD("");

  return (
    <div className="px-4 md:px-5 py-4 space-y-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="flex items-center gap-2 flex-wrap"><window.DocTypeBadge type={live.type} /><window.DocStatusPill status={live.status} /><span className="text-[11px] font-mono text-stone-500">v{live.version}</span></div>

      <div className="rounded-xl border border-stone-200 p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-[12.5px] text-stone-700"><Icon name="file" size={15} className="text-stone-400 shrink-0" /><span className="font-mono text-[11.5px]">{live.fileLabel || "—"}</span></div>
        {live.note && <div className="text-[12px] text-stone-600">{live.note}</div>}
        <div className="flex items-center gap-2 text-[12px] text-stone-600 pt-1"><Icon name={lm.icon || "folder"} size={14} className="text-stone-400" />{lm.label || "Általános"}{live.linkLabel && <span className="text-stone-700">· {live.linkLabel}</span>}</div>
        <div className="flex items-center gap-3 text-[11px] text-stone-400 pt-1"><span className="inline-flex items-center gap-1"><Icon name="user" size={12} />{live.owner}</span><span>Frissítve: {live.updatedAt}</span></div>
      </div>

      {/* FSM léptetés */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Életciklus</div>
        {next.length ? (
          <div className="flex items-center gap-2 flex-wrap">
            {next.map((to) => { const sst = window.DOC_STATUS[to] || {}; const arch = to === "archivalt"; return <button key={to} onClick={() => window.sim.setDocStatus(live.id, to)} className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium ${arch ? "bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200" : "bg-violet-600 text-white hover:bg-violet-700"}`}><Icon name={arch ? "archive" : "arrow-right"} size={14} />{sst.label}</button>; })}
          </div>
        ) : <div className="text-[12px] text-stone-400">Nincs elérhető átmenet.</div>}
      </div>

      {/* verziózás */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Verziózás</div>
        {verOpen ? (
          <div className="rounded-xl border border-stone-200 p-2.5 space-y-2">
            <input value={verNote} onChange={(e) => setVerNote(e.target.value)} placeholder="Mi változott? (verzió-megjegyzés)" className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-violet-500" />
            <div className="flex items-center gap-2"><button onClick={() => { window.sim.newDocVersion(live.id, { note: verNote }); setVerOpen(false); setVerNote(""); }} className="h-8 px-3 rounded-lg bg-violet-600 text-white text-[12px] font-medium">Új verzió (v{(live.version || 1) + 1})</button><button onClick={() => { setVerOpen(false); setVerNote(""); }} className="h-8 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-600">Mégse</button></div>
          </div>
        ) : (
          <button onClick={() => setVerOpen(true)} className="w-full h-9 rounded-lg border border-dashed border-stone-300 text-[12.5px] font-medium text-stone-500 hover:text-violet-700 hover:border-violet-300">+ Új verzió létrehozása (ellenőrzésre)</button>
        )}
      </div>

      {/* verzió-előzmény */}
      {(live.history || []).length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Verzió-előzmény</div>
          <div className="space-y-1.5">
            {live.history.slice().reverse().map((h, i) => { const ss = window.DOC_STATUS[h.status] || {}; return (
              <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-stone-200">
                <span className="text-[11px] font-mono font-semibold text-violet-700 w-7 shrink-0">v{h.v}</span>
                <div className="min-w-0 flex-1"><div className="text-[12px] text-stone-700 truncate">{h.note}</div><div className="text-[10px] text-stone-400">{h.at}</div></div>
                <span className={`inline-flex items-center gap-1 rounded-full border font-medium px-1.5 h-5 text-[10px] shrink-0 ${ss.pill}`}>{ss.label}</span>
              </div>
            ); })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Új dokumentum sheet ──────────────────────────────────────────
function NewDocSheet({ onClose, onCreated }) {
  const sim = useSim();
  const [type, setType] = useStateD("rajz");
  const [name, setName] = useStateD("");
  const [fileLabel, setFileLabel] = useStateD("");
  const [linkType, setLinkType] = useStateD("none");
  const [linkLabel, setLinkLabel] = useStateD("");
  const [note, setNote] = useStateD("");
  const cls = "w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-violet-500";
  const create = () => { if (!name.trim()) return; const id = window.sim.addDocument({ type, name, fileLabel, linkType, linkLabel: linkType === "none" ? "" : linkLabel, note }); if (id && onCreated) onCreated(id); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[500px] md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between"><div className="text-[14px] font-semibold text-stone-900">Új dokumentum</div><button onClick={onClose} className="text-stone-400 hover:text-stone-700"><Icon name="x" size={18} /></button></div>
        <div className="px-4 py-4 space-y-3.5">
          <div>
            <label className="text-[10.5px] text-stone-500 block mb-1">Típus</label>
            <div className="grid grid-cols-3 gap-1.5">{window.DOC_TYPE_ORDER.map((k) => { const m = window.DOC_TYPE_META[k]; const on = type === k; return <button key={k} onClick={() => setType(k)} className={`inline-flex items-center gap-1.5 h-8 px-2 rounded-lg text-[11px] font-medium border ${on ? "border-violet-500 bg-violet-50 text-violet-800" : "border-stone-200 bg-white text-stone-600"}`}><Icon name={m.icon} size={13} className={on ? "text-violet-600" : "text-stone-400"} />{m.short}</button>; })}</div>
          </div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Megnevezés *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dokumentum neve" className={cls} /></div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Fájlnév</label><input value={fileLabel} onChange={(e) => setFileLabel(e.target.value)} placeholder="pl. rajz-v1.pdf" className={cls} /></div>
          <div className="grid grid-cols-2 gap-2.5">
            <div><label className="text-[10.5px] text-stone-500 block mb-1">Kapcsolat</label><select value={linkType} onChange={(e) => setLinkType(e.target.value)} className={cls + " px-2"}>{window.DOC_LINK_ORDER.map((k) => <option key={k} value={k}>{window.DOC_LINK_META[k].label}</option>)}</select></div>
            {linkType !== "none" && <div><label className="text-[10.5px] text-stone-500 block mb-1">Kapcsolt elem</label><input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Projekt / ügyfél / cikkszám" className={cls} /></div>}
          </div>
          <div><label className="text-[10.5px] text-stone-500 block mb-1">Megjegyzés</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Leírás…" className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-[12.5px] bg-white outline-none focus:border-violet-500" /></div>
          <button disabled={!name.trim()} onClick={create} className="w-full h-10 rounded-xl bg-violet-600 text-white text-[13px] font-semibold disabled:opacity-40">Dokumentum létrehozása</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DocStatusPill, DocTypeBadge, DocLinkBadge, DocRow, DocsDetailHost, DocsDashboard, DocsAll, DocDetail, NewDocSheet });
