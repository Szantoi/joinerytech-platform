// ──────────────────────────────────────────────────────────────────────────
// webshop-finance.jsx — VEVŐI PORTÁL · „Kereskedelmi" (pénzügy/fizetések hub)
//
//   A vevő/végfelhasználó pénzügyi otthona a saját portálján:
//     • Áttekintő     — fizetendő · lejárt · következő esedékesség · eddig fizetve
//     • Fizetési ütemterv (mérföldkövek) — előleg / részszámla / végszámla
//     • Számláim      — számla / előleg-számla / díjbekérő, fizetés + letöltés
//
//   EGY igazságforrás: a store vevő-scoped helpereiből dolgozik
//   (customerInvoices / contractsForCustomer / customerFinanceSummary /
//   customerPayInvoice) — nincs külön adat, nincs duplikáció. A szimulált
//   fizetés a meglévő finPayments-be ír (customerPayInvoice, PERM-MENTES).
//   Exportál: window.FinanceHub.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateFH } = React;

const fhFmt = (n) => Math.round(Number(n) || 0).toLocaleString("hu-HU");
const fhMoney = (n, inv) => fhFmt(n) + (inv && inv.currency === "EUR" ? " €" : " Ft");
const fhDaysTo = (d) => {
  if (!d) return null;
  const today = window.FIN_TODAY || "2026-04-28";
  return Math.round((new Date(d + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000);
};
const fhDueLabel = (d) => {
  const n = fhDaysTo(d);
  if (n == null) return "";
  if (n < 0) return `${-n} napja lejárt`;
  if (n === 0) return "ma esedékes";
  if (n === 1) return "holnap esedékes";
  return `${n} nap múlva esedékes`;
};

// ── Letöltés-szimuláció (díjbekérő / számla) ──────────────────────────────
function fhDownloadInvoice(inv) {
  const KM = window.FIN_KIND_META || {};
  const kind = (KM[inv.kind] || { label: "Számla" }).label;
  const net = window.finNet ? window.finNet(inv) : 0;
  const vat = window.finVat ? window.finVat(inv) : 0;
  const gross = window.finGross ? window.finGross(inv) : net + vat;
  const cur = inv.currency === "EUR" ? "EUR" : "HUF";
  const rows = (inv.lines || []).map((l) =>
    `  • ${l.qty}× ${l.name} — ${fhFmt(l.qty * l.unitPrice)} ${cur} (ÁFA ${l.vat}%)`).join("\n");
  const body =
`JoineryTech Kft. — ${kind}
────────────────────────────────────────
Bizonylatszám:  ${inv.id}
Vevő:           ${inv.party}
Kiállítás:      ${inv.issueDate || "—"}
Fizetési hat.:  ${inv.dueDate || "—"}
${inv.orderRef ? "Hivatkozás:     " + inv.orderRef + "\n" : ""}────────────────────────────────────────
Tételek:
${rows || "  —"}
────────────────────────────────────────
Nettó:          ${fhFmt(net)} ${cur}
ÁFA:            ${fhFmt(vat)} ${cur}
Bruttó:         ${fhFmt(gross)} ${cur}
${inv.note ? "\nMegjegyzés: " + inv.note + "\n" : ""}
(Szimulált bizonylat — JoineryTech prototípus)`;
  try {
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${inv.id}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { /* no-op */ }
  if (window.toast) window.toast(`📄 ${inv.id} — ${kind.toLowerCase()} letöltve (szimuláció).`, "success");
}

// ── Státusz-pötty az ütemterv-mérföldkőhöz (vevő-barát) ───────────────────
function fhMilestoneState(sim, c, ms) {
  // szamlazva → a linkelt számla állapota dönt; egyébként a tárolt ütemterv-státusz
  if (ms.status === "szamlazva" && ms.invoiceId) {
    const inv = sim.finInvoiceById(ms.invoiceId);
    if (inv) {
      const eff = sim.finEffectiveStatus(inv);
      if (eff === "paid") return { label: "Kifizetve", pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
      if (eff === "overdue") return { label: "Lejárt — fizetésre vár", pill: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" };
      if (eff === "partial") return { label: "Részben fizetve", pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
      return { label: "Kiszámlázva — fizetésre vár", pill: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" };
    }
  }
  const M = (window.CTR_MS_STATUS || {})[ms.status] || { label: "Függőben", pill: "bg-stone-100 text-stone-600 border-stone-200", dot: "bg-stone-400" };
  return { label: M.label, pill: M.pill, dot: M.dot };
}

// ── Áttekintő KPI-kártya ──────────────────────────────────────────────────
function FhKpi({ label, value, sub, tone = "stone", icon }) {
  const TONE = {
    stone:   "text-stone-900",
    rose:    "text-rose-600",
    amber:   "text-amber-600",
    emerald: "text-emerald-600",
    teal:    "text-teal-700",
  };
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-3.5 md:p-4">
      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium mb-1.5">
        {icon && <Icon name={icon} size={13} className="text-stone-400" />}{label}
      </div>
      <div className={`text-[19px] md:text-[21px] font-semibold tabular-nums leading-none ${TONE[tone] || TONE.stone}`}>{value}</div>
      {sub && <div className="text-[10.5px] text-stone-400 mt-1.5 leading-tight">{sub}</div>}
    </div>
  );
}

// ── Fizetési ütemterv (egy szerződés mérföldkövei) ────────────────────────
function FhScheduleCard({ contract }) {
  const sim = useSim();
  const c = contract;
  const E = window.ContractEngine;
  const total = Number(c.totalGross) || 0;
  const msList = c.milestones || [];
  const paidAmt = msList.reduce((s, m) => {
    if (m.status === "szamlazva" && m.invoiceId) {
      const inv = sim.finInvoiceById(m.invoiceId);
      if (inv && sim.finEffectiveStatus(inv) === "paid") return s + (E ? E.msAmount(c, m) : 0);
    }
    return s;
  }, 0);
  const invoicedAmt = E ? E.invoicedAmount(c) : 0;
  const paidPct = total ? Math.round((paidAmt / total) * 100) : 0;
  const invPct = total ? Math.round((invoicedAmt / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-4 md:px-5 py-3.5 border-b border-stone-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-stone-900 truncate">{c.title || c.customer}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">{c.id} · Szerződéses érték <span className="font-semibold text-stone-700 tabular-nums">{fhFmt(total)} Ft</span></div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[12.5px] font-semibold text-emerald-600 tabular-nums">{paidPct}%</div>
          <div className="text-[10px] text-stone-400">kifizetve</div>
        </div>
      </div>

      {/* progress: kifizetve + kiszámlázva */}
      <div className="px-4 md:px-5 pt-3">
        <div className="h-2 rounded-full bg-stone-100 overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 bg-sky-300" style={{ width: `${invPct}%` }} />
          <div className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${paidPct}%` }} />
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-stone-400">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Kifizetve</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-300" />Kiszámlázva</span>
        </div>
      </div>

      {/* mérföldkövek */}
      <div className="px-4 md:px-5 py-3 space-y-1.5">
        {msList.map((ms) => {
          const st = fhMilestoneState(sim, c, ms);
          const amt = E ? E.msAmount(c, ms) : Math.round(total * (ms.pct || 0) / 100);
          return (
            <div key={ms.id} className="flex items-center gap-3 py-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-stone-800 truncate">{ms.label}</div>
                <div className="text-[10.5px] text-stone-400">{ms.pct}% · {fhFmt(amt)} Ft</div>
              </div>
              <span className={`shrink-0 inline-flex items-center px-2 h-6 rounded-full border text-[10.5px] font-medium ${st.pill}`}>{st.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Számla-kártya (fizetés + letöltés + kinyitható részletek) ─────────────
function FhInvoiceCard({ inv }) {
  const sim = useSim();
  const [open, setOpen] = useStateFH(false);
  const KM = window.FIN_KIND_META || {};
  const TONE = window.FIN_INV_TONE || {};
  const PM = window.FIN_PAY_METHOD || {};
  const kind = KM[inv.kind] || { label: "Számla", short: "Számla", tone: "bg-stone-100 text-stone-700" };
  const eff = sim.finEffectiveStatus(inv);
  const t = TONE[eff] || TONE.issued || { bg: "bg-sky-50", fg: "text-sky-700", dot: "bg-sky-500", label: "Kiállítva" };
  const gross = window.finGross ? window.finGross(inv) : 0;
  const balance = sim.finBalance(inv);
  const payments = sim.finPaymentsFor(inv.id);
  const payable = balance > 0.01 && (eff === "issued" || eff === "partial" || eff === "overdue");
  const overdue = eff === "overdue";

  const pay = () => sim.customerPayInvoice(inv.id);

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${overdue ? "border-rose-200" : "border-stone-200"}`}>
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left px-4 md:px-5 py-3.5 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-1.5 h-5 rounded text-[10px] font-semibold ${kind.tone}`}>{kind.short}</span>
            <span className="text-[13.5px] font-semibold text-stone-900">{inv.id}</span>
            <span className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10.5px] font-medium ${t.bg} ${t.fg}`}><span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{t.label}</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            Kiállítva {inv.issueDate}
            {inv.dueDate && eff !== "paid" && <span className={overdue ? "text-rose-600 font-medium" : ""}> · {fhDueLabel(inv.dueDate)}</span>}
            {eff === "paid" && <span className="text-emerald-600"> · rendezve</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[15px] font-semibold text-stone-900 tabular-nums">{fhMoney(gross, inv)}</div>
          {balance > 0.01 && balance < gross - 0.01 && <div className="text-[10.5px] text-amber-600">hátralék {fhMoney(balance, inv)}</div>}
        </div>
        <Icon name="chevron" size={16} className={`text-stone-300 shrink-0 transition ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="px-4 md:px-5 pb-3 -mt-1">
          <div className="rounded-xl bg-stone-50 border border-stone-100 divide-y divide-stone-100">
            {(inv.lines || []).map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-[12px]">
                <span className="text-stone-700 truncate">{l.qty}× {l.name} <span className="text-stone-400">· ÁFA {l.vat}%</span></span>
                <span className="font-mono tabular-nums text-stone-600 shrink-0">{fhMoney(l.qty * l.unitPrice * (1 + l.vat / 100), inv)}</span>
              </div>
            ))}
          </div>
          {payments.length > 0 && (
            <div className="mt-2.5">
              <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1">Fizetések</div>
              <div className="space-y-1">
                {payments.map((p) => {
                  const m = PM[p.method] || { label: p.method };
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                      <span className="text-stone-600 inline-flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />{p.date} · {m.label}{p.ref ? ` · ${p.ref}` : ""}</span>
                      <span className="font-mono tabular-nums text-stone-700">{fhMoney(p.amount, inv)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {inv.note && <div className="mt-2.5 text-[11px] text-stone-500 italic">{inv.note}</div>}
        </div>
      )}

      <div className="px-4 md:px-5 py-2.5 border-t border-stone-100 flex items-center gap-2">
        <button onClick={() => fhDownloadInvoice(inv)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 text-stone-600 text-[12px] font-medium hover:bg-stone-50">
          <Icon name="download" size={14} />{inv.kind === "proforma" ? "Díjbekérő letöltése" : "Letöltés"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          {eff === "paid" ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium"><Icon name="check" size={14} />Kifizetve</span>
          ) : payable ? (
            <button onClick={pay} className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-white text-[12.5px] font-semibold ${overdue ? "bg-rose-600 hover:bg-rose-700" : "bg-teal-600 hover:bg-teal-700"}`}>
              <Icon name="cpu" size={14} />Fizetés · {fhMoney(balance, inv)}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── A hub ──────────────────────────────────────────────────────────────────
function FinanceHub({ customer }) {
  const sim = useSim();
  const name = customer || (sim.accounts.find((a) => a.id === sim.currentAccountId) || {}).name;
  const summary = sim.customerFinanceSummary(name);
  const invoices = sim.customerInvoices(name).filter((i) => i.status !== "draft");
  const contracts = sim.contractsForCustomer(name);
  const openInvoices = invoices.filter((i) => { const e = sim.finEffectiveStatus(i); return e === "issued" || e === "partial" || e === "overdue"; });

  return (
    <div className="space-y-5 max-w-[760px]">
      <div>
        <h1 className="text-[20px] md:text-[24px] font-semibold text-stone-900 tracking-tight">Kereskedelmi</h1>
        <p className="text-[12.5px] text-stone-500 mt-0.5">Számlái, fizetési kötelezettségei és az ütemezett fizetések egy helyen.</p>
      </div>

      {/* Lejárt tartozás figyelmeztető */}
      {summary.overdue > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 grid place-items-center shrink-0"><Icon name="alert" size={18} /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-rose-800">Lejárt tartozása van — {fhFmt(summary.overdue)} Ft</div>
            <div className="text-[11.5px] text-rose-700/80 mt-0.5">Kérjük, rendezze mielőbb. A számlát alább a „Fizetés" gombbal egyenlítheti ki.</div>
          </div>
        </div>
      )}

      {/* Áttekintő KPI-k */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <FhKpi label="Fizetendő" value={fhFmt(summary.outstanding) + " Ft"} tone={summary.outstanding > 0 ? "stone" : "emerald"} sub={summary.outstanding > 0 ? `${openInvoices.length} nyitott számla` : "nincs nyitott tétel"} icon="receipt" />
        <FhKpi label="Lejárt tartozás" value={fhFmt(summary.overdue) + " Ft"} tone={summary.overdue > 0 ? "rose" : "emerald"} sub={summary.overdue > 0 ? "azonnal rendezendő" : "nincs lejárt tétel"} icon="alert" />
        <FhKpi label="Következő esedékesség" value={summary.nextDue ? fhMoney(summary.nextDue.balance, sim.finInvoiceById(summary.nextDue.id)) : "—"} tone={summary.nextDue ? "amber" : "stone"} sub={summary.nextDue ? `${summary.nextDue.id} · ${fhDueLabel(summary.nextDue.dueDate)}` : "nincs"} icon="calendar" />
        <FhKpi label="Eddig kifizetve" value={fhFmt(summary.paidTotal) + " Ft"} tone="teal" sub="összesen rendezve" icon="check" />
      </div>

      {/* Fizetési ütemterv */}
      {contracts.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-semibold text-stone-800">Fizetési ütemterv</h2>
            <span className="text-[11px] text-stone-400">előleg · részszámla · végszámla</span>
          </div>
          {contracts.map((c) => <FhScheduleCard key={c.id} contract={c} />)}
        </div>
      )}

      {/* Számláim */}
      <div className="space-y-2.5">
        <h2 className="text-[14px] font-semibold text-stone-800">Számláim</h2>
        {invoices.length ? (
          <div className="space-y-2.5">{invoices.map((inv) => <FhInvoiceCard key={inv.id} inv={inv} />)}</div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-stone-200">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-stone-100 grid place-items-center text-stone-400 mb-2.5"><Icon name="receipt" size={22} /></div>
            <div className="text-[14px] font-semibold text-stone-700">Még nincs számlája</div>
            <div className="text-[12px] text-stone-500 mt-1">A megrendelései számlái itt jelennek meg.</div>
          </div>
        )}
      </div>

      <div className="text-[10.5px] text-stone-400 text-center pt-1 pb-2">
        Kérdése van egy számláról? Az „Egyedi megrendelés" vagy „Bolt" fülön az adott tételnél üzenhet nekünk.
      </div>
    </div>
  );
}

Object.assign(window, { FinanceHub });
