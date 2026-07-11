// ─────────────────────────────────────────────────────────────────
// page-finance.jsx — PÉNZÜGY világ (1/2)
//   Helperek + státusz-pill + Számla-részletező (SlideOver) + Új számla / Kifizetés
//   sheet-ek + Kimenő számlák lista. A Bejövő/Áttekintő/Kifizetések a page-finance-2.jsx-ben.
//   Store: window.sim.finInvoices / finPayments + akciók (createInvoiceFromOrder,
//   issueInvoice, voidInvoice, addPayment, finBalance, finEffectiveStatus, finStats).
// ─────────────────────────────────────────────────────────────────
const { useState: useStateF, useMemo: useMemoF, useEffect: useEffectF } = React;

// Pénz-formázás (fmtMoney a data-procurement2.js-ből)
function finFmt(n, currency) { return fmtMoney(Math.round((Number(n) || 0) * (currency === "EUR" ? 100 : 1)) / (currency === "EUR" ? 100 : 1), currency); }

// Számított, megjelenítendő státusz-pötty (a „lejárt" felülírja a nyitott állapotot)
function FinStatusPill({ inv, size = "md" }) {
  const st = window.sim.finEffectiveStatus(inv);
  const t = FIN_INV_TONE[st] || FIN_INV_TONE.draft;
  const cls = size === "sm" ? "px-1.5 h-5 text-[10.5px]" : "px-2 h-6 text-[11.5px]";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${cls} ${t.bg} ${t.fg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}
    </span>
  );
}

function FinKindBadge({ kind }) {
  const m = FIN_KIND_META[kind] || FIN_KIND_META.normal;
  return <span className={`inline-flex items-center px-1.5 h-5 rounded text-[10px] font-medium ${m.tone}`}>{m.short}</span>;
}

function FinMethodBadge({ method }) {
  const m = FIN_PAY_METHOD[method] || FIN_PAY_METHOD.bank;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10.5px] font-medium ${m.tone}`}>
      <Icon name={m.icon} size={11} />{m.label}
    </span>
  );
}

function FinLabel({ children }) {
  return <div className="text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">{children}</div>;
}
function FinField({ label, children, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-0.5">{label}</div>
      <div className={`text-[13px] text-stone-800 ${mono ? "font-mono" : ""}`}>{children}</div>
    </div>
  );
}

// ÁFA-bontás összesítő (kulcsonként csoportosítva) + nettó/ÁFA/bruttó
function FinVatSummary({ inv }) {
  const groups = {};
  (inv.lines || []).forEach((l) => {
    const net = (Number(l.qty) || 0) * (Number(l.unitPrice) || 0);
    const key = Number(l.vat) || 0;
    if (!groups[key]) groups[key] = { net: 0, vat: 0 };
    groups[key].net += net;
    groups[key].vat += net * (key / 100);
  });
  const net = finNet(inv), vat = finVat(inv), gross = finGross(inv);
  const noVat = FIN_KIND_META[inv.kind] && FIN_KIND_META[inv.kind].vatBooked === false;
  return (
    <div className="rounded-lg border border-stone-200 overflow-hidden">
      <div className="px-3 py-2 bg-stone-50/70 border-b border-stone-100 text-[10px] uppercase tracking-wide text-stone-500 font-medium flex items-center justify-between">
        <span>ÁFA-bontás</span>{noVat && <span className="text-teal-600 normal-case tracking-normal font-medium">Díjbekérő — nem ÁFA-bizonylat</span>}
      </div>
      <div className="divide-y divide-stone-100">
        {Object.keys(groups).sort((a, b) => b - a).map((k) => (
          <div key={k} className="grid grid-cols-3 gap-2 px-3 py-1.5 text-[11.5px] tabular-nums">
            <span className="text-stone-500">{k}% kulcs</span>
            <span className="text-right text-stone-600">{finFmt(groups[k].net, inv.currency)}</span>
            <span className="text-right text-stone-700">+{finFmt(groups[k].vat, inv.currency)} ÁFA</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 bg-stone-50/40 border-t border-stone-100 space-y-1">
        <div className="flex items-center justify-between text-[12px] text-stone-600"><span>Nettó</span><span className="tabular-nums">{finFmt(net, inv.currency)}</span></div>
        <div className="flex items-center justify-between text-[12px] text-stone-600"><span>ÁFA</span><span className="tabular-nums">{finFmt(vat, inv.currency)}</span></div>
        <div className="flex items-center justify-between text-[14px] font-semibold text-stone-900"><span>Bruttó</span><span className="tabular-nums">{finFmt(gross, inv.currency)}</span></div>
      </div>
    </div>
  );
}

// ── Számla-részletező (kimenő + bejövő közös) ─────────────────────────────────
function InvoiceDetailBody({ inv }) {
  const sim = useSim();
  const live = sim.finInvoices.find((x) => x.id === inv.id) || inv;
  const canManage = window.sim.hasPerm("finance.manage");
  const payments = (sim.finPayments || []).filter((p) => p.invoiceId === live.id);
  const paid = payments.reduce((a, p) => a + p.amount, 0);
  const gross = finGross(live);
  const balance = window.sim.finBalance(live);
  const overdue = window.sim.finIsOverdue(live);
  const isOut = live.dir === "out";

  const [mode, setMode] = useStateF(null); // "pay" | "void"
  const [amount, setAmount] = useStateF("");
  const [method, setMethod] = useStateF("bank");
  const [payDate, setPayDate] = useStateF(FIN_TODAY);
  const [payRef, setPayRef] = useStateF("");
  const [reason, setReason] = useStateF("");

  useEffectF(() => { setMode(null); setAmount(""); setMethod("bank"); setPayRef(""); setReason(""); }, [live.id]);

  const startPay = () => { setAmount(String(Math.round(balance))); setMode("pay"); };
  const doPay = () => {
    const id = window.sim.addPayment(live.id, { amount: Number(amount), method, date: payDate, ref: payRef });
    if (id) { setMode(null); window.toast && window.toast("Kifizetés rögzítve.", "success"); }
  };
  const doVoid = () => { if (window.sim.voidInvoice(live.id, reason)) { setMode(null); window.toast && window.toast("Számla sztornózva.", "info"); } };
  const doIssue = () => { if (window.sim.issueInvoice(live.id)) window.toast && window.toast(isOut ? "Számla kiállítva." : "Számla befogadva.", "success"); };
  const sendReminder = () => {
    window.sim.postSystem && window.sim.postSystem(`🔔 Fizetési emlékeztető küldve: ${live.id} — ${live.party} (hátralék ${finFmt(balance, live.currency)}).`, "ch-prod");
    window.toast && window.toast("Emlékeztető elküldve.", "success");
  };

  const poFound = !isOut && (sim.pos || []).some((p) => p.id === live.orderRef);

  return (
    <div className="px-5 py-4 space-y-4">
      {/* fej */}
      <div className="flex items-start gap-2 flex-wrap">
        <FinStatusPill inv={live} />
        <FinKindBadge kind={live.kind} />
        {live.currency === "EUR" && <span className="inline-flex items-center px-1.5 h-5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700">EUR · {live.fxRate || 390} Ft</span>}
      </div>

      {overdue && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 flex items-start gap-2 text-[11.5px] text-rose-700">
          <Icon name="alert" size={14} className="mt-px shrink-0" />
          <span>{isOut ? "Lejárt kintlévőség" : "Lejárt fizetendő"} — esedékesség: <span className="font-medium">{live.dueDate}</span>. Hátralék: <span className="font-semibold">{finFmt(balance, live.currency)}</span>.</span>
        </div>
      )}
      {live.status === "void" && live.voidReason && (
        <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-[11.5px] text-stone-500">
          <span className="font-medium text-stone-600">Sztornó indok:</span> {live.voidReason}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FinField label={isOut ? "Vevő" : "Szállító"}>{live.party}</FinField>
        <FinField label={isOut ? "Rendelés" : "Megrendelés (PO)"} mono>
          <span className="text-sky-700">{live.orderRef || "—"}</span>
        </FinField>
        <FinField label="Kiállítás" mono>{live.issueDate}</FinField>
        <FinField label="Fizetési határidő" mono>{live.dueDate || "—"}</FinField>
        {live.extNo && <FinField label="Szállítói számlaszám" mono>{live.extNo}</FinField>}
        <FinField label="Kiállító">{live.issuer || "—"}</FinField>
      </div>

      {/* Beszállító nyújtotta be a portálon */}
      {!isOut && live.submittedVia === "supplier" && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 flex items-center gap-2 text-[11.5px] text-teal-700">
          <Icon name="storefront" size={14} className="shrink-0" />
          <span>A beszállító nyújtotta be a portálon{live.submittedAt ? ` (${live.submittedAt})` : ""} — ellenőrizd, majd <span className="font-medium">fogadd be</span>.</span>
        </div>
      )}

      {/* Minimális egyeztetés bejövő számlánál — „rendeltek-e ilyet" */}
      {!isOut && (
        <div className={`rounded-lg border px-3 py-2 flex items-center gap-2 text-[11.5px] ${poFound ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
          <Icon name={poFound ? "check" : "alert"} size={14} className="shrink-0" />
          {poFound
            ? <span>A számla kapcsolódó megrendelése (<span className="font-mono">{live.orderRef}</span>) megtalálható a Beszerzésben.</span>
            : <span>Nincs egyező nyitott megrendelés (<span className="font-mono">{live.orderRef || "—"}</span>) — ellenőrizd, valóban rendeltünk-e ilyet.</span>}
        </div>
      )}

      {/* Tételek */}
      <div>
        <FinLabel>Tételek</FinLabel>
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1.6fr)_46px_84px_40px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wide text-stone-500 bg-stone-50/60 border-b border-stone-100">
            <div>Megnevezés</div><div className="text-right">Db</div><div className="text-right">Egységár</div><div className="text-right">ÁFA</div>
          </div>
          {(live.lines || []).map((l, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1.6fr)_46px_84px_40px] gap-2 px-3 py-2 border-b border-stone-100 last:border-0 items-center text-[11.5px]">
              <div className="text-stone-700 truncate">{l.name}</div>
              <div className="text-right tabular-nums text-stone-600">{l.qty} {l.unit}</div>
              <div className="text-right tabular-nums text-stone-600">{finFmt(l.unitPrice, live.currency)}</div>
              <div className="text-right tabular-nums text-stone-400">{l.vat}%</div>
            </div>
          ))}
        </div>
      </div>

      <FinVatSummary inv={live} />

      {/* Kifizetések + hátralék */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <FinLabel>Kifizetések {payments.length ? `(${payments.length})` : ""}</FinLabel>
          <div className="text-[11px] text-stone-500">Fizetve: <span className="font-semibold text-stone-700 tabular-nums">{finFmt(paid, live.currency)}</span></div>
        </div>
        {payments.length === 0 ? (
          <div className="text-[11.5px] text-stone-400 px-3 py-2 rounded-lg bg-stone-50 border border-dashed border-stone-200">Még nincs rögzített pénzmozgás.</div>
        ) : (
          <div className="space-y-1.5">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-50/70 border border-stone-100">
                <FinMethodBadge method={p.method} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] text-stone-700 font-mono">{p.date}{p.ref ? ` · ${p.ref}` : ""}</div>
                  {p.note && <div className="text-[10.5px] text-stone-400 truncate">{p.note}</div>}
                </div>
                <div className="text-[12.5px] font-semibold tabular-nums text-stone-800">{finFmt(p.amount, live.currency)}</div>
              </div>
            ))}
          </div>
        )}
        {balance > 0.01 && live.status !== "void" && live.status !== "draft" && (
          <div className={`mt-2 flex items-center justify-between px-3 py-2 rounded-lg ${overdue ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
            <span className="text-[12px] font-medium">Hátralék</span>
            <span className="text-[14px] font-bold tabular-nums">{finFmt(balance, live.currency)}</span>
          </div>
        )}
      </div>

      {/* Művelet-űrlapok */}
      {canManage && mode === "pay" && (
        <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-3">
          <div className="text-[12px] font-semibold text-stone-800">{isOut ? "Befizetés rögzítése" : "Kifizetés rögzítése"}</div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wide text-stone-400 font-medium">Összeg ({live.currency})</span>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="mt-0.5 w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] tabular-nums outline-none focus:border-emerald-500" />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wide text-stone-400 font-medium">Dátum</span>
              <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)}
                className="mt-0.5 w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-emerald-500" />
            </label>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wide text-stone-400 font-medium">Fizetési mód</span>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {Object.keys(FIN_PAY_METHOD).map((k) => (
                <button key={k} onClick={() => setMethod(k)}
                  className={`h-8 rounded-lg text-[11px] font-medium transition ${method === k ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>{FIN_PAY_METHOD[k].label}</button>
              ))}
            </div>
          </div>
          <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Bizonylat / tranzakció azonosító (opc.)"
            className="w-full h-9 px-2.5 rounded-lg border border-stone-200 text-[12px] font-mono outline-none focus:border-emerald-500" />
          <div className="flex justify-end gap-2">
            <GhostBtn onClick={() => setMode(null)}>Mégse</GhostBtn>
            <button onClick={doPay} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-emerald-600 text-white text-[12.5px] font-medium hover:bg-emerald-700">
              <Icon name="check" size={15} />Rögzítés</button>
          </div>
        </div>
      )}
      {canManage && mode === "void" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-3">
          <div className="text-[12px] font-semibold text-rose-700">Számla sztornózása</div>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Sztornó indoka (kötelező)…"
            className="w-full px-2.5 py-2 rounded-lg border border-rose-200 text-[12px] outline-none focus:border-rose-400 resize-none bg-white" />
          <div className="flex justify-end gap-2">
            <GhostBtn onClick={() => setMode(null)}>Mégse</GhostBtn>
            <button onClick={doVoid} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-rose-600 text-white text-[12.5px] font-medium hover:bg-rose-700">
              <Icon name="x" size={15} />Sztornó</button>
          </div>
        </div>
      )}

      {/* Akció-gombok (ha nincs nyitott űrlap) */}
      {!mode && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {!canManage ? (
            <div className="text-[11.5px] text-stone-400 inline-flex items-center gap-1.5"><Icon name="lock" size={13} />A pénzügyi műveletekhez „finance.manage" jog kell.</div>
          ) : live.status === "draft" ? (
            <>
              <button onClick={doIssue} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-emerald-700 text-white text-[12.5px] font-medium hover:bg-emerald-800">
                <Icon name="send" size={15} />{isOut ? "Kiállítás" : "Befogadás"}</button>
              <GhostBtn icon="x" onClick={() => setMode("void")}>Sztornó</GhostBtn>
            </>
          ) : (live.status === "issued" || live.status === "partial") ? (
            <>
              <button onClick={startPay} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-emerald-700 text-white text-[12.5px] font-medium hover:bg-emerald-800">
                <Icon name="receipt" size={15} />{isOut ? "Befizetés rögzítése" : "Kifizetés rögzítése"}</button>
              {overdue && isOut && <GhostBtn icon="bell" onClick={sendReminder}>Emlékeztető</GhostBtn>}
              <GhostBtn icon="x" onClick={() => setMode("void")}>Sztornó</GhostBtn>
            </>
          ) : (
            <div className="text-[11.5px] text-stone-400 inline-flex items-center gap-1.5"><Icon name="check" size={13} />Lezárt számla — nincs további művelet.</div>
          )}
        </div>
      )}
    </div>
  );
}

// Számla SlideOver — bárhonnan használható (kimenő + bejövő)
function InvoiceSlideOver({ inv, onClose }) {
  return (
    <SlideOver open={!!inv} onClose={onClose}
      title={inv ? inv.id : ""}
      subtitle={inv ? `${(FIN_KIND_META[inv.kind] || {}).label} · ${inv.party}` : ""}
      width={560}>
      {inv && <InvoiceDetailBody inv={inv} />}
    </SlideOver>
  );
}

// ── Új (kimenő) számla rendelésből ────────────────────────────────────────────
function NewInvoiceSheet({ open, onClose, onCreated }) {
  const sim = useSim();
  const [orderId, setOrderId] = useStateF("");
  const [kind, setKind] = useStateF("normal");
  const [pct, setPct] = useStateF(30);

  useEffectF(() => { if (open) { setOrderId(""); setKind("normal"); setPct(30); } }, [open]);

  const orders = (sim.orders || []).filter((o) => o.status !== "draft");
  const create = () => {
    if (!orderId) { window.toast && window.toast("Válassz rendelést.", "warning"); return; }
    const id = window.sim.createInvoiceFromOrder(orderId, { kind, advancePct: pct });
    if (id) { onClose(); onCreated && onCreated(id); }
  };
  const sel = orders.find((o) => o.id === orderId);

  return (
    <SlideOver open={open} onClose={onClose} title="Új kimenő számla" subtitle="Rendelésből — piszkozatként jön létre" width={480}>
      <div className="px-5 py-4 space-y-4">
        <div>
          <FinLabel>Számla fajtája</FinLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {[["normal", "Számla"], ["advance", "Előleg"], ["proforma", "Díjbekérő"]].map(([k, lbl]) => (
              <button key={k} onClick={() => setKind(k)}
                className={`h-9 rounded-lg text-[11.5px] font-medium transition ${kind === k ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>{lbl}</button>
            ))}
          </div>
          <div className="text-[10.5px] text-stone-400 mt-1.5">
            {kind === "advance" ? "Előleg-számla: a rendelés értékének egy része, gyártás előtt." : kind === "proforma" ? "Díjbekérő: fizetési felszólítás, nem ÁFA-bizonylat." : "Sima (vég)számla a teljes rendelésről."}
          </div>
        </div>

        <div>
          <FinLabel>Rendelés</FinLabel>
          <select value={orderId} onChange={(e) => setOrderId(e.target.value)}
            className="w-full h-10 px-2.5 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-emerald-500 bg-white">
            <option value="">— Válassz rendelést —</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>{o.id} · {o.customer} · {finFmt(o.total, "HUF")}</option>
            ))}
          </select>
        </div>

        {kind === "advance" && (
          <div>
            <FinLabel>Előleg mértéke: {pct}%</FinLabel>
            <input type="range" min={10} max={90} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="w-full accent-emerald-600" />
            {sel && <div className="text-[11px] text-stone-500 mt-1">≈ {finFmt(Math.round((sel.total || 0) * (pct / 100)), "HUF")} bruttó előleg</div>}
          </div>
        )}

        {sel && (
          <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2.5 space-y-1">
            <div className="flex justify-between text-[12px]"><span className="text-stone-500">Vevő</span><span className="text-stone-800 font-medium">{sel.customer}</span></div>
            <div className="flex justify-between text-[12px]"><span className="text-stone-500">Rendelés értéke</span><span className="text-stone-800 tabular-nums">{finFmt(sel.total, "HUF")}</span></div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <GhostBtn onClick={onClose}>Mégse</GhostBtn>
          <button onClick={create} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-emerald-700 text-white text-[12.5px] font-medium hover:bg-emerald-800">
            <Icon name="plus" size={15} />Piszkozat létrehozása</button>
        </div>
      </div>
    </SlideOver>
  );
}

// Egy számla-sor a listában (kimenő + bejövő közös)
function FinInvoiceRow({ inv, onOpen }) {
  const gross = finGross(inv);
  const balance = window.sim.finBalance(inv);
  const overdue = window.sim.finIsOverdue(inv);
  return (
    <button onClick={() => onOpen(inv)}
      className="w-full flex items-center gap-3 px-3 md:px-4 py-3 hover:bg-stone-50 text-left border-b border-stone-100 last:border-0 transition">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-stone-900 truncate">{inv.party}</span>
          <FinKindBadge kind={inv.kind} />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] font-mono text-stone-500 truncate">{inv.id}{inv.orderRef ? ` · ${inv.orderRef}` : ""}</span>
        </div>
      </div>
      <div className="hidden sm:flex flex-col items-end shrink-0">
        <FinStatusPill inv={inv} size="sm" />
        {balance > 0.01 && (inv.status === "issued" || inv.status === "partial") && (
          <span className={`text-[10px] mt-1 tabular-nums ${overdue ? "text-rose-500" : "text-stone-400"}`}>hátralék {finFmt(balance, inv.currency)}</span>
        )}
      </div>
      <div className="text-right shrink-0 w-[96px]">
        <div className="text-[13px] font-semibold text-stone-800 tabular-nums">{finFmt(gross, inv.currency)}</div>
        <div className="text-[10.5px] font-mono text-stone-400">{inv.dueDate || inv.issueDate}</div>
      </div>
      <Icon name="chevron" size={15} className="text-stone-300 shrink-0" />
    </button>
  );
}

// ── Kimenő számlák lista ──────────────────────────────────────────────────────
const FIN_OUT_FILTERS = [
  { key: "all", label: "Mind" },
  { key: "open", label: "Nyitott" },
  { key: "overdue", label: "Lejárt" },
  { key: "draft", label: "Piszkozat" },
  { key: "paid", label: "Fizetve" },
];

function FinanceOutgoing() {
  const sim = useSim();
  const canManage = window.sim.hasPerm("finance.manage");
  const [openInv, setOpenInv] = useStateF(null);
  const [showNew, setShowNew] = useStateF(false);
  const [q, setQ] = useStateF("");
  const [filter, setFilter] = useStateF("all");

  const all = (sim.finInvoices || []).filter((i) => i.dir === "out");
  const rows = all.filter((i) => {
    const eff = window.sim.finEffectiveStatus(i);
    if (filter === "open" && !(eff === "issued" || eff === "partial" || eff === "overdue")) return false;
    if (filter === "overdue" && eff !== "overdue") return false;
    if (filter === "draft" && i.status !== "draft") return false;
    if (filter === "paid" && i.status !== "paid") return false;
    if (q && !(`${i.id} ${i.party} ${i.orderRef || ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const liveOpen = openInv ? (sim.finInvoices.find((x) => x.id === openInv.id) || null) : null;
  const counts = {
    receivable: all.filter((i) => i.status === "issued" || i.status === "partial").reduce((a, i) => a + finToHuf(window.sim.finBalance(i), i), 0),
    overdue: all.filter((i) => window.sim.finIsOverdue(i)).length,
    drafts: all.filter((i) => i.status === "draft").length,
  };

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1100px] mx-auto">
      {/* summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <FinMiniStat label="Kintlévőség" value={finFmt(counts.receivable, "HUF")} tone="amber" icon="receipt" />
        <FinMiniStat label="Lejárt számla" value={`${counts.overdue} db`} tone={counts.overdue ? "rose" : "stone"} icon="alert" />
        <FinMiniStat label="Piszkozat" value={`${counts.drafts} db`} tone="stone" icon="file" />
      </div>

      <Card>
        <div className="px-3 md:px-4 py-3 border-b border-stone-100 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {FIN_OUT_FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`h-7 px-2.5 rounded-full text-[11.5px] font-medium transition ${filter === f.key ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>{f.label}</button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="relative">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés: vevő, számlaszám…"
              className="h-8 w-48 pl-8 pr-3 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-emerald-400 bg-stone-50/40" />
            <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          </div>
          {canManage && (
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-emerald-700 text-white text-[12px] font-medium hover:bg-emerald-800">
              <Icon name="plus" size={14} />Új számla</button>
          )}
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-[12.5px] text-stone-400">Nincs a szűrésnek megfelelő számla.</div>
        ) : (
          <div>{rows.map((inv) => <FinInvoiceRow key={inv.id} inv={inv} onOpen={setOpenInv} />)}</div>
        )}
      </Card>

      <InvoiceSlideOver inv={liveOpen} onClose={() => setOpenInv(null)} />
      <NewInvoiceSheet open={showNew} onClose={() => setShowNew(false)} onCreated={(id) => setOpenInv({ id })} />
    </div>
  );
}

// Kis statisztika-kártya (lista tetejére)
function FinMiniStat({ label, value, tone = "stone", icon }) {
  const tones = {
    amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700", sky: "bg-sky-50 text-sky-700", stone: "bg-stone-100 text-stone-600",
  };
  return (
    <div className="bg-white border border-stone-200/80 rounded-xl px-3.5 py-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${tones[tone]}`}><Icon name={icon} size={17} /></div>
      <div className="min-w-0">
        <div className="text-[10.5px] uppercase tracking-wide text-stone-400 font-medium">{label}</div>
        <div className="text-[16px] font-semibold text-stone-900 tabular-nums leading-tight truncate">{value}</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  finFmt, FinStatusPill, FinKindBadge, FinMethodBadge, FinLabel, FinField, FinVatSummary,
  InvoiceDetailBody, InvoiceSlideOver, NewInvoiceSheet, FinInvoiceRow, FinanceOutgoing, FinMiniStat,
});
