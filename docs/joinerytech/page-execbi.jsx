// ─────────────────────────────────────────────────────────────────
// page-execbi.jsx — VEZETŐI BI-COCKPIT ("Vezetői áttekintés")
//   A Kontrolling világ vezető-szintű, kereszt-világ kezdőképernyője.
//   SZÁMÍTOTT nézet a store `execCockpit()`-jából (egy igazságforrás marad a
//   többi modul). 4 LAP (szegmens-nav, localStorage-ban őrzött belépő):
//   Pulzus (állapot-jelző + 5 hero-KPI + riasztás-lista) · Pénzügy & fedezet
//   (likviditás + tény/EAC fedezet + top/flop + money-trend) · Kereskedelem
//   (forecast + win/konverzió + pipeline-trend) · Működés & minőség (gyártás-
//   terhelés + 6-csempés kockázat-radar). Minden kártya DEEP-LINKEL (navigateTo).
//   Jog: `controlling.exec` (hiányában lock-panel, nem rejtett).
// ─────────────────────────────────────────────────────────────────

const go = (world, screen) => window.navigateTo && window.navigateTo(world, screen || null);

// ── Lapok (szegmens-nav) ── minden vezetőnek saját belépője (localStorage) ──
const EXEC_TABS = [
  { key: "pulse",   label: "Pulzus",            icon: "chart" },
  { key: "finance", label: "Pénzügy & fedezet", icon: "receipt" },
  { key: "sales",   label: "Kereskedelem",      icon: "briefcase" },
  { key: "ops",     label: "Működés & minőség", icon: "factory" },
];
const EXEC_TAB_LS = "jt_exec_tab";

// ── Idő-ablakos trend-grafikon (terület + vonal, tiszta data-viz) ──
function TrendChart({ series, color, kind }) {
  const W = 720, H = 210, L = 52, R = 16, T = 16, B = 30;
  const innerW = W - L - R, innerH = H - T - B;
  const vals = series.map((p) => Number(p.value) || 0);
  const isPct = kind === "pct";
  const rawMax = Math.max(...vals, isPct ? 0.3 : 1);
  const max = isPct ? Math.min(1, rawMax * 1.15) : rawMax * 1.15;
  const min = 0;
  const n = series.length;
  const x = (i) => L + (n <= 1 ? 0 : innerW * (i / (n - 1)));
  const y = (v) => T + innerH * (1 - (v - min) / (max - min || 1));
  const pts = series.map((p, i) => [x(i), y(Number(p.value) || 0)]);
  const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = `M${x(0).toFixed(1)} ${(T + innerH).toFixed(1)} ` +
    pts.map((p) => "L" + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") +
    ` L${x(n - 1).toFixed(1)} ${(T + innerH).toFixed(1)} Z`;
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => min + (max - min) * f);
  const fmtY = (v) => isPct ? Math.round(v * 100) + "%" : (v >= 10 ? v.toFixed(0) : v.toFixed(1));
  const gid = "execgrad-" + (color || "x").replace("#", "");
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={L} y1={y(v)} x2={W - R} y2={y(v)} stroke="#f1f0ee" strokeWidth="1" />
          <text x={L - 8} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="#a8a29e" fontFamily="ui-sans-serif, system-ui">{fmtY(v)}</text>
        </g>
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => {
        const live = series[i].live;
        return <circle key={i} cx={p[0]} cy={p[1]} r={live ? 4 : 2.4} fill={live ? "#fff" : color} stroke={color} strokeWidth={live ? 2.4 : 0} />;
      })}
      {series.map((p, i) => (
        <text key={i} x={x(i)} y={H - 9} textAnchor="middle" fontSize="10" fill={p.live ? "#44403c" : "#a8a29e"} fontWeight={p.live ? 600 : 400} fontFamily="ui-sans-serif, system-ui">{p.label}</text>
      ))}
      {last && <text x={Math.min(last[0], W - R - 2)} y={Math.max(last[1] - 9, 14)} textAnchor="end" fontSize="10.5" fontWeight="700" fill={color} fontFamily="ui-sans-serif, system-ui">aktuális</text>}
    </svg>
  );
}

// ── Nagy pulzus-KPI kártya ──
function PulseCard({ label, value, sub, tone, icon, onClick, accent }) {
  const fg = tone === "rose" ? "text-rose-700" : tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-stone-900";
  return (
    <button onClick={onClick} className="text-left bg-white rounded-2xl border border-stone-200 p-4 hover:border-stone-300 hover:shadow-sm transition group">
      <div className="flex items-center justify-between mb-2">
        <span className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: (accent || "#475569") + "1a", color: accent || "#475569" }}><Icon name={icon} size={15} /></span>
        <Icon name="arrow-right" size={14} className="text-stone-300 group-hover:text-stone-400" />
      </div>
      <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium">{label}</div>
      <div className={`text-[24px] md:text-[26px] font-semibold leading-none mt-1.5 tabular-nums ${fg}`}>{value}</div>
      {sub && <div className="text-[10.5px] text-stone-400 mt-1.5">{sub}</div>}
    </button>
  );
}

// ── Kockázat-radar csempe ──
function RadarTile({ title, icon, accent, primary, primaryLabel, level, lines, onOpen }) {
  const t = window.execAlarmTone(level);
  return (
    <button onClick={onOpen} className="text-left bg-white rounded-2xl border border-stone-200 p-3.5 hover:border-stone-300 hover:shadow-sm transition group flex flex-col">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: (accent || "#475569") + "1a", color: accent || "#475569" }}><Icon name={icon} size={15} /></span>
        <span className="text-[12.5px] font-semibold text-stone-800 truncate flex-1">{title}</span>
        <span className={`w-2 h-2 rounded-full ${t.dot}`} />
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className={`text-[22px] font-semibold leading-none tabular-nums ${t.fg}`}>{primary}</span>
        {primaryLabel && <span className="text-[10.5px] text-stone-400 mb-0.5">{primaryLabel}</span>}
      </div>
      <div className="space-y-0.5 mt-auto">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-stone-500 truncate">{l.k}</span>
            <span className={`tabular-nums font-medium shrink-0 ${l.warn ? "text-rose-600" : "text-stone-700"}`}>{l.v}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

// ── Likviditás-panel ──
function LiquidityPanel({ fin }) {
  const maxAbs = Math.max(1, fin.receivable, fin.payable);
  const Row = ({ label, total, overdue, tone, onClick }) => (
    <button onClick={onClick} className="w-full text-left group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-stone-600">{label}</span>
        <span className="text-[12.5px] font-semibold text-stone-900 tabular-nums">{window.execHuf(total)}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-stone-100 overflow-hidden flex">
        <div className={`h-full ${tone}`} style={{ width: (((total - overdue) / maxAbs) * 100) + "%" }} />
        <div className="h-full bg-rose-500" style={{ width: ((overdue / maxAbs) * 100) + "%" }} title={"Lejárt: " + window.execHuf(overdue)} />
      </div>
      {overdue > 0 && <div className="text-[10px] text-rose-600 mt-1">Ebből lejárt: {window.execHuf(overdue)}</div>}
    </button>
  );
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[12.5px] font-semibold text-stone-800">Likviditás</span>
        <button onClick={() => go("finance", "outgoing")} className="text-[11px] text-slate-600 font-medium inline-flex items-center gap-1">Pénzügy <Icon name="chevron" size={12} /></button>
      </div>
      <div className="space-y-3.5">
        <Row label="Vevő-kintlévőség" total={fin.receivable} overdue={fin.receivableOverdue} tone="bg-emerald-500" onClick={() => go("finance", "outgoing")} />
        <Row label="Szállító-tartozás" total={fin.payable} overdue={fin.payableOverdue} tone="bg-sky-500" onClick={() => go("finance", "incoming")} />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-stone-100 text-center">
        <div><div className="text-[10px] text-stone-400">Havi bevétel</div><div className="text-[12.5px] font-semibold text-emerald-700 tabular-nums">{window.execHufM(fin.cashIn)}</div></div>
        <div><div className="text-[10px] text-stone-400">Havi kiadás</div><div className="text-[12.5px] font-semibold text-stone-700 tabular-nums">{window.execHufM(fin.cashOut)}</div></div>
        <div><div className="text-[10px] text-stone-400">Nettó cash</div><div className={`text-[12.5px] font-semibold tabular-nums ${fin.net < 0 ? "text-rose-700" : "text-emerald-700"}`}>{(fin.net < 0 ? "−" : "+") + window.execHufM(Math.abs(fin.net))}</div></div>
      </div>
    </div>
  );
}

// ── Top / flop fedezet ──
function MarginMini({ r }) {
  if (!r) return <div className="text-[12px] text-stone-400">—</div>;
  const pct = r.actualMarginPct;
  const tone = window.ctrlMarginTone ? window.ctrlMarginTone(pct) : { fg: "text-stone-700", bar: "bg-stone-400" };
  const rev = Math.max(1, r.revenueActual || 0);
  const costPct = Math.max(0, Math.min(100, (r.actualTotal / rev) * 100));
  return (
    <button onClick={() => go("kontrolling", "projects")} className="w-full text-left group">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[13px] font-semibold text-stone-900 truncate">{r.project.name}</span>
        <span className={`text-[12.5px] font-semibold tabular-nums ${tone.fg}`}>{window.ctrlPct(pct)}</span>
      </div>
      <div className="text-[10.5px] text-stone-500 mb-1.5 truncate">{r.project.customer} · {window.execHuf(r.revenueActual)}</div>
      <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden flex">
        <div className="h-full bg-stone-300" style={{ width: costPct + "%" }} />
        <div className={`h-full ${tone.bar}`} style={{ width: (100 - costPct) + "%" }} />
      </div>
    </button>
  );
}

// ── FŐ KÉPERNYŐ ──

// ── Önálló trend-panel (saját ablak + metrika állapot, laponként szűrt) ──
function TrendPanel({ trend, metricKeys, defaultMetric, note }) {
  const [win, setWin] = React.useState(12);
  const [metric, setMetric] = React.useState(defaultMetric || metricKeys[0]);
  const MET = window.EXEC_TREND_METRICS[metric];
  const series = trend.slice(-win).map((p) => ({ label: p.label, value: MET.kind === "pct" ? p.margin : p[MET.key], live: p.live }));
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-[12.5px] font-semibold text-stone-800">Alakulás <span className="font-normal text-stone-400">· {MET.sub}</span></div>
          <div className="text-[10.5px] text-stone-400">{note || `${win} havi alakulás (demó historikum) — az élő pillanatkép a fenti KPI-kártyákon`}</div>
        </div>
        <div className="flex rounded-lg border border-stone-200 overflow-hidden">
          {window.EXEC_WINDOWS.map((w) => (
            <button key={w.key} onClick={() => setWin(w.key)} className={`h-8 px-2.5 text-[11.5px] font-medium ${win === w.key ? "bg-slate-700 text-white" : "bg-white text-stone-500 hover:bg-stone-50"}`}>{w.label}</button>
          ))}
        </div>
      </div>
      {metricKeys.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {metricKeys.map((k) => {
            const m = window.EXEC_TREND_METRICS[k];
            const on = metric === k;
            return (
              <button key={k} onClick={() => setMetric(k)} className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11.5px] font-medium transition ${on ? "border-transparent text-white" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"}`} style={on ? { background: m.color } : null}>
                <span className="w-2 h-2 rounded-full" style={{ background: on ? "rgba(255,255,255,.85)" : m.color }} />{m.label}
              </button>
            );
          })}
        </div>
      )}
      <TrendChart series={series} color={MET.color} kind={MET.kind} />
    </div>
  );
}

// ── "Minden rendben?" össz-állapot jelző ──
function StatusBanner({ worst, critCount, warnCount }) {
  const map = {
    crit: { bg: "bg-rose-50", bd: "border-rose-200", fg: "text-rose-700", dot: "bg-rose-500", icon: "alert", title: "Figyelmet igényel", sub: `${critCount} kritikus${warnCount ? ` · ${warnCount} figyelendő` : ""} tétel az értékláncban` },
    warn: { bg: "bg-amber-50", bd: "border-amber-200", fg: "text-amber-700", dot: "bg-amber-500", icon: "alert", title: "Néhány tétel figyelést kér", sub: `${warnCount} figyelendő tétel — kritikus nincs` },
    ok:   { bg: "bg-emerald-50", bd: "border-emerald-200", fg: "text-emerald-700", dot: "bg-emerald-500", icon: "check", title: "Minden a tervek szerint", sub: "Nincs kritikus vagy figyelendő tétel a kereszt-világ pulzusban" },
  };
  const s = map[worst] || map.ok;
  return (
    <div className={`flex items-center gap-3.5 rounded-2xl border ${s.bd} ${s.bg} px-4 py-3.5 mb-4`}>
      <span className="relative grid place-items-center w-9 h-9 rounded-xl bg-white/70 shrink-0">
        <span className={`absolute inline-flex w-2.5 h-2.5 rounded-full ${s.dot} ${worst !== "ok" ? "animate-ping opacity-60" : ""}`} style={{ top: 6, right: 6 }} />
        <span className={s.fg}><Icon name={s.icon} size={18} /></span>
      </span>
      <div className="min-w-0">
        <div className={`text-[14px] font-semibold ${s.fg}`}>{s.title}</div>
        <div className="text-[11.5px] text-stone-500 truncate">{s.sub}</div>
      </div>
    </div>
  );
}

// ── Mai teendők / kiemelt riasztások lista ──
function AlertList({ alerts }) {
  if (!alerts.length) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center mx-auto mb-2"><Icon name="check" size={20} /></div>
        <div className="text-[13px] font-medium text-stone-700">Nincs kiemelt teendő</div>
        <div className="text-[11.5px] text-stone-400 mt-0.5">Az értéklánc minden jelzője a normál sávban van.</div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden divide-y divide-stone-100">
      {alerts.map((a, i) => {
        const t = window.execAlarmTone(a.level);
        return (
          <button key={i} onClick={a.onClick} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition group">
            <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: (a.accent || "#475569") + "1a", color: a.accent || "#475569" }}><Icon name={a.icon} size={15} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-medium text-stone-800 truncate">{a.title}</div>
              {a.detail && <div className="text-[11px] text-stone-400 truncate">{a.detail}</div>}
            </div>
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${a.level === "crit" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"}`}>{a.level === "crit" ? "kritikus" : "figyelni"}</span>
            <Icon name="arrow-right" size={14} className="text-stone-300 group-hover:text-stone-400 shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

// ── Szegmens-nav (lap-választó) ──
function TabNav({ tab, setTab }) {
  return (
    <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-stone-100 border border-stone-200 mb-5 w-fit">
      {EXEC_TABS.map((t) => {
        const on = tab === t.key;
        return (
          <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium transition ${on ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>
            <Icon name={t.icon} size={14} className={on ? "text-slate-600" : "text-stone-400"} />{t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── FŐ KÉPERNYŐ ──
function ExecCockpit({ onScreen }) {
  const sim = useSim();
  const hasExec = sim.hasPerm("controlling.exec");
  const c = window.sim.execCockpit();
  const [tab, setTabRaw] = React.useState(() => {
    try { return localStorage.getItem(EXEC_TAB_LS) || "pulse"; } catch (e) { return "pulse"; }
  });
  const setTab = (k) => { setTabRaw(k); try { localStorage.setItem(EXEC_TAB_LS, k); } catch (e) {} };
  const [cfgOpen, setCfgOpen] = React.useState(false);

  if (!hasExec) {
    return (
      <div className="px-4 md:px-7 py-16 max-w-[640px] mx-auto text-center">
        <div className="w-12 h-12 rounded-2xl bg-stone-100 grid place-items-center mx-auto mb-3 text-stone-400"><Icon name="lock" size={22} /></div>
        <h1 className="text-[18px] font-semibold text-stone-800 mb-1">Vezetői áttekintés</h1>
        <p className="text-[13px] text-stone-500">Ehhez a kereszt-világ vezetői cockpithoz <span className="font-mono text-[12px] bg-stone-100 px-1.5 py-0.5 rounded">controlling.exec</span> jogosultság szükséges. Kérd az adminisztrátortól a Beállítások → Portál / Jogosultságok alatt.</p>
      </div>
    );
  }

  const T = c.ctrl.totals;
  const fc = c.sales.forecast;
  const ncrLevel = c.qa.ncrCritical > 0 ? "crit" : c.qa.ncrOpen > 0 ? "warn" : "ok";
  const ehsLevel = (c.ehs.openInc > 0 || c.ehs.expired > 0 || c.ehs.highRisk > 0) ? (c.ehs.expired > 0 || c.ehs.recordable.lost > 0 ? "crit" : "warn") : "ok";
  const logLevel = c.log.conflicts > 0 ? "crit" : c.log.live > 0 ? "warn" : "ok";
  const svcLevel = c.svc.open > 2 ? "crit" : c.svc.open > 0 ? "warn" : "ok";
  const apprLevel = c.proc.apprPending > 0 ? "warn" : "ok";
  const procLevel = c.proc.poDraftCount > 0 || c.proc.rfqOpen > 0 ? "warn" : "ok";

  // ── Kiemelt riasztások (Pulzus → teendők-lista). Csak crit/warn jelek. ──
  const alerts = [];
  if (c.prod.conflicts > 0) alerts.push({ level: "crit", icon: "factory", accent: "#0d9488", title: `${c.prod.conflicts} kapacitás-ütközés a gyártásban`, detail: `Terhelés ${window.execPct(c.prod.loadPct)} · ${Math.round(c.prod.load)}/${Math.round(c.prod.cap)} óra`, onClick: () => go("supervisor", "schedule") });
  else if (c.prod.loadPct > 0.98) alerts.push({ level: "warn", icon: "factory", accent: "#0d9488", title: "Gyártás közel teljes kapacitáson", detail: `Terhelés ${window.execPct(c.prod.loadPct)}`, onClick: () => go("supervisor", "schedule") });
  if (c.fin.receivableOverdue > 0) alerts.push({ level: "warn", icon: "receipt", accent: "#059669", title: `Lejárt vevő-kintlévőség: ${window.execMoneyShort(c.fin.receivableOverdue)}`, onClick: () => go("finance", "outgoing") });
  if (c.fin.payableOverdue > 0) alerts.push({ level: "warn", icon: "receipt", accent: "#0284c7", title: `Lejárt szállító-tartozás: ${window.execMoneyShort(c.fin.payableOverdue)}`, onClick: () => go("finance", "incoming") });
  if (c.qa.ncrCritical > 0) alerts.push({ level: "crit", icon: "check", accent: "#65a30d", title: `${c.qa.ncrCritical} kritikus minőségi hiba (NCR)`, detail: `Megfelelés: ${window.ctrlPct(c.qa.rate)}`, onClick: () => go("quality", "inspections") });
  else if (c.qa.ncrOpen > 0) alerts.push({ level: "warn", icon: "check", accent: "#65a30d", title: `${c.qa.ncrOpen} nyitott NCR a minőségben`, onClick: () => go("quality", "inspections") });
  if (c.ehs.openInc > 0) alerts.push({ level: c.ehs.recordable.lost > 0 ? "crit" : "warn", icon: "shield", accent: "#e11d48", title: `${c.ehs.openInc} nyitott munkavédelmi eset`, onClick: () => go("ehs", "incidents") });
  if (c.ehs.expired > 0) alerts.push({ level: "crit", icon: "shield", accent: "#e11d48", title: `${c.ehs.expired} lejárt munkavédelmi oktatás`, onClick: () => go("ehs", "training") });
  if (c.ehs.openCapa > 0) alerts.push({ level: "warn", icon: "shield", accent: "#e11d48", title: `${c.ehs.openCapa} nyitott CAPA-intézkedés`, onClick: () => go("ehs", "incidents") });
  if (c.ehs.highRisk > 0) alerts.push({ level: "warn", icon: "shield", accent: "#e11d48", title: `${c.ehs.highRisk} magas kockázat (score ≥ 10)`, onClick: () => go("ehs", "risks") });
  if (c.log.conflicts > 0) alerts.push({ level: "crit", icon: "truck", accent: "#0284c7", title: `${c.log.conflicts} fuvar-ütközés a logisztikában`, onClick: () => go("logistics", "schedule") });
  if (c.svc.open > 0) alerts.push({ level: c.svc.open > 2 ? "crit" : "warn", icon: "wrench", accent: "#dc2626", title: `${c.svc.open} nyitott reklamáció`, detail: "átadás utáni hurok", onClick: () => go("service", "tickets") });
  if (c.proc.apprPending > 0) alerts.push({ level: "warn", icon: "signature", accent: "#7c3aed", title: `${c.proc.apprPending} jóváhagyás limit felett`, detail: `Függő érték: ${window.execMoneyShort(c.proc.apprValue)}`, onClick: () => go("tasks") });
  if (c.ctrl.slipped.length > 0) alerts.push({ level: "warn", icon: "analytics", accent: "#4f46e5", title: `${c.ctrl.slipped.length} projekt költség-túllépésben`, onClick: () => go("kontrolling", "variance") });
  const order = { crit: 0, warn: 1 };
  alerts.sort((a, b) => order[a.level] - order[b.level]);
  const critCount = alerts.filter((a) => a.level === "crit").length;
  const warnCount = alerts.filter((a) => a.level === "warn").length;
  const worst = critCount > 0 ? "crit" : warnCount > 0 ? "warn" : "ok";

  const heroKpis = (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <PulseCard label="Súlyozott pipeline" value={window.execMoneyShort(fc.weighted)} sub={`${fc.openCount} nyitott · ${window.execMoneyShort(fc.pipeline)} bruttó`} icon="briefcase" accent="#2563eb" onClick={() => go("crm", "forecast")} />
      <PulseCard label="Rendelésállomány" value={window.execMoneyShort(c.backlog.value)} sub={`${c.backlog.count} visszaigazolt rendelés`} icon="orders" accent="#0284c7" onClick={() => go("production", "dash")} />
      <PulseCard label="Gyártás-terhelés" value={window.execPct(c.prod.loadPct)} sub={`${Math.round(c.prod.load)}/${Math.round(c.prod.cap)} óra · ${c.prod.conflicts} ütközés`} icon="factory" accent="#0d9488" tone={c.prod.loadPct > 0.98 ? "rose" : c.prod.loadPct < 0.7 ? "amber" : "slate"} onClick={() => go("supervisor", "schedule")} />
      <PulseCard label="Kintlévőség" value={window.execMoneyShort(c.fin.receivable)} sub={c.fin.receivableOverdue > 0 ? `Lejárt: ${window.execMoneyShort(c.fin.receivableOverdue)}` : "nincs lejárt tétel"} icon="receipt" accent="#059669" tone={c.fin.receivableOverdue > 0 ? "rose" : "slate"} onClick={() => go("finance", "outgoing")} />
      <PulseCard label="Várható fedezet" value={window.ctrlPct(T.eacMarginPct)} sub={`Tény eddig: ${window.ctrlPct(T.actualMarginPct)} · EAC ${window.execHuf(T.eacMargin)}`} icon="analytics" accent="#4f46e5" tone={(T.eacMarginPct || 0) < 0.15 ? "rose" : (T.eacMarginPct || 0) < 0.30 ? "amber" : "emerald"} onClick={() => go("kontrolling", "dash")} />
    </div>
  );

  const tabMeta = EXEC_TABS.find((t) => t.key === tab) || EXEC_TABS[0];

  return (
    <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1240px] mx-auto">
      {/* fejléc */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900">Vezetői áttekintés</h1>
          <p className="text-[12.5px] text-stone-500 mt-0.5">Az értéklánc pulzusa nézetenként — válts perspektívát a lapokkal. Minden kártya a forrás-világba visz.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setCfgOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-600 font-medium hover:border-stone-300 hover:text-stone-800" title="Óradíj-beállítások"><Icon name="settings" size={14} className="text-stone-400" /><span className="hidden md:inline">Óradíjak</span></button>
          <button onClick={() => onScreen && onScreen("dash")} className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-600 font-medium hover:border-stone-300"><Icon name="chart" size={14} />Portfólió</button>
        </div>
      </div>

      <TabNav tab={tab} setTab={setTab} />
      {window.CtrlSettingsSheet && <window.CtrlSettingsSheet open={cfgOpen} onClose={() => setCfgOpen(false)} />}

      {/* ── PULZUS — glance: állapot + 5 hero-KPI + riasztások ── */}
      {tab === "pulse" && (
        <div>
          <StatusBanner worst={worst} critCount={critCount} warnCount={warnCount} />
          {heroKpis}
          <div className="flex items-center justify-between mt-5 mb-2.5">
            <h2 className="text-[14px] font-semibold text-stone-800">Mai teendők</h2>
            <span className="text-[11px] text-stone-400">{alerts.length ? `${alerts.length} kiemelt tétel` : "mire kell ma figyelni"}</span>
          </div>
          <AlertList alerts={alerts} />
        </div>
      )}

      {/* ── PÉNZÜGY & FEDEZET ── */}
      {tab === "finance" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <PulseCard label="Várható fedezet" value={window.ctrlPct(T.eacMarginPct)} sub={`EAC ${window.execHuf(T.eacMargin)}`} icon="analytics" accent="#4f46e5" tone={(T.eacMarginPct || 0) < 0.15 ? "rose" : (T.eacMarginPct || 0) < 0.30 ? "amber" : "emerald"} onClick={() => go("kontrolling", "dash")} />
            <PulseCard label="Tény fedezet" value={window.ctrlPct(T.actualMarginPct)} sub={`Eddig realizált · ${window.execHuf(T.actualMargin)}`} icon="chart" accent="#0d9488" tone={(T.actualMarginPct || 0) < 0.15 ? "rose" : "emerald"} onClick={() => go("kontrolling", "dash")} />
            <PulseCard label="Kintlévőség" value={window.execMoneyShort(c.fin.receivable)} sub={c.fin.receivableOverdue > 0 ? `Lejárt: ${window.execMoneyShort(c.fin.receivableOverdue)}` : "nincs lejárt tétel"} icon="receipt" accent="#059669" tone={c.fin.receivableOverdue > 0 ? "rose" : "slate"} onClick={() => go("finance", "outgoing")} />
            <PulseCard label="Szállító-tartozás" value={window.execMoneyShort(c.fin.payable)} sub={c.fin.payableOverdue > 0 ? `Lejárt: ${window.execMoneyShort(c.fin.payableOverdue)}` : "nincs lejárt tétel"} icon="receipt" accent="#0284c7" tone={c.fin.payableOverdue > 0 ? "rose" : "slate"} onClick={() => go("finance", "incoming")} />
          </div>
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-3">
            <LiquidityPanel fin={c.fin} />
            <div className="bg-white rounded-2xl border border-stone-200 p-4">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[12.5px] font-semibold text-stone-800">Projekt-fedezet — szélső értékek</span>
                <button onClick={() => go("kontrolling", "projects")} className="text-[11px] text-slate-600 font-medium inline-flex items-center gap-1">Mind <Icon name="chevron" size={12} /></button>
              </div>
              <div className="space-y-3.5">
                <div><div className="text-[10px] uppercase tracking-wide text-emerald-600 font-medium mb-1.5">Legjobb</div><MarginMini r={c.ctrl.top} /></div>
                <div className="border-t border-stone-100 pt-3.5"><div className="text-[10px] uppercase tracking-wide text-rose-600 font-medium mb-1.5">Leggyengébb</div><MarginMini r={c.ctrl.flop} /></div>
              </div>
              {c.ctrl.slipped.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[11px] text-stone-500">{c.ctrl.slipped.length} projekt költség-túllépésben</span>
                  <button onClick={() => go("kontrolling", "variance")} className="text-[11px] text-rose-600 font-medium inline-flex items-center gap-1">Eltérés-elemzés <Icon name="arrow-right" size={12} /></button>
                </div>
              )}
            </div>
          </div>
          <TrendPanel trend={c.trend} metricKeys={["revenue", "margin", "backlog"]} defaultMetric="revenue" />
        </div>
      )}

      {/* ── KERESKEDELEM ── */}
      {tab === "sales" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <PulseCard label="Súlyozott pipeline" value={window.execMoneyShort(fc.weighted)} sub={`${fc.openCount} nyitott lehetőség`} icon="briefcase" accent="#2563eb" onClick={() => go("crm", "forecast")} />
            <PulseCard label="Pipeline bruttó" value={window.execMoneyShort(fc.pipeline)} sub="nem súlyozott érték" icon="chart" accent="#7c3aed" onClick={() => go("crm", "pipeline")} />
            <PulseCard label="Megnyerési ráta" value={window.execPct(c.sales.win.rate)} sub={`${c.sales.win.won}/${c.sales.win.closed} lezárt`} icon="check" accent="#0d9488" tone={(c.sales.win.rate || 0) < 0.3 ? "amber" : "emerald"} onClick={() => go("crm", "opps")} />
            <PulseCard label="Lead-konverzió" value={window.execPct(c.sales.conv.rate)} sub={`${c.sales.openLeads} nyitott lead`} icon="briefcase" accent="#2563eb" onClick={() => go("crm", "leads")} />
            <PulseCard label="Rendelésállomány" value={window.execMoneyShort(c.backlog.value)} sub={`${c.backlog.count} visszaigazolt`} icon="orders" accent="#0284c7" onClick={() => go("production", "dash")} />
          </div>
          {fc.byStage && Object.keys(fc.byStage).length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-4">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[12.5px] font-semibold text-stone-800">Pipeline fázisonként</span>
                <button onClick={() => go("crm", "pipeline")} className="text-[11px] text-slate-600 font-medium inline-flex items-center gap-1">Kanban <Icon name="chevron" size={12} /></button>
              </div>
              <div className="space-y-2.5">
                {Object.entries(fc.byStage).map(([k, v]) => {
                  const val = (v && typeof v === "object") ? (v.value || v.weighted || v.sum || 0) : Number(v) || 0;
                  const cnt = (v && typeof v === "object") ? (v.count || v.n || null) : null;
                  const maxV = Math.max(1, ...Object.values(fc.byStage).map((x) => (x && typeof x === "object") ? (x.value || x.weighted || x.sum || 0) : Number(x) || 0));
                  const label = (window.OPP_STATUS && window.OPP_STATUS[k] && window.OPP_STATUS[k].label) || k;
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between mb-1 text-[11.5px]">
                        <span className="text-stone-600">{label}{cnt != null ? ` · ${cnt}` : ""}</span>
                        <span className="font-semibold text-stone-800 tabular-nums">{window.execMoneyShort(val)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden"><div className="h-full rounded-full bg-violet-500" style={{ width: ((val / maxV) * 100) + "%" }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <TrendPanel trend={c.trend} metricKeys={["pipeline", "backlog"]} defaultMetric="pipeline" note="Pipeline-alakulás (demó historikum) — az élő pillanatkép a fenti KPI-kártyákon" />
        </div>
      )}

      {/* ── MŰKÖDÉS & MINŐSÉG ── */}
      {tab === "ops" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <PulseCard label="Gyártás-terhelés" value={window.execPct(c.prod.loadPct)} sub={`${Math.round(c.prod.load)}/${Math.round(c.prod.cap)} óra (heti)`} icon="factory" accent="#0d9488" tone={c.prod.loadPct > 0.98 ? "rose" : c.prod.loadPct < 0.7 ? "amber" : "slate"} onClick={() => go("supervisor", "schedule")} />
            <PulseCard label="Kapacitás-ütközés" value={c.prod.conflicts} sub={c.prod.conflicts > 0 ? "túlterhelt stáció" : "nincs ütközés"} icon="factory" accent="#0d9488" tone={c.prod.conflicts > 0 ? "rose" : "emerald"} onClick={() => go("supervisor", "schedule")} />
            <PulseCard label="Minőség — megfelelés" value={window.ctrlPct(c.qa.rate)} sub={`${c.qa.ncrOpen} nyitott NCR`} icon="check" accent="#65a30d" tone={c.qa.ncrCritical > 0 ? "rose" : c.qa.ncrOpen > 0 ? "amber" : "emerald"} onClick={() => go("quality", "inspections")} />
            <PulseCard label="Élő fuvar" value={c.log.live} sub={c.log.conflicts > 0 ? `${c.log.conflicts} ütközés` : "nincs ütközés"} icon="truck" accent="#0284c7" tone={c.log.conflicts > 0 ? "rose" : "slate"} onClick={() => go("logistics", "schedule")} />
          </div>
          <div className="flex items-center justify-between mb-0.5">
            <h2 className="text-[14px] font-semibold text-stone-800">Kockázat-radar</h2>
            <span className="text-[11px] text-stone-400">mire kell ma figyelni</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <RadarTile title="Minőség" icon="check" accent="#65a30d" level={ncrLevel}
              primary={window.ctrlPct ? window.ctrlPct(c.qa.rate) : Math.round(c.qa.rate * 100) + "%"} primaryLabel="megfelelés"
              lines={[{ k: "Nyitott ellenőrzés", v: c.qa.open }, { k: "Nyitott NCR", v: c.qa.ncrOpen, warn: c.qa.ncrOpen > 0 }, { k: "Kritikus hiba", v: c.qa.ncrCritical, warn: c.qa.ncrCritical > 0 }]}
              onOpen={() => go("quality", "inspections")} />
            <RadarTile title="Munkavédelem" icon="shield" accent="#e11d48" level={ehsLevel}
              primary={c.ehs.openInc} primaryLabel="nyitott eset"
              lines={[{ k: "Nyitott CAPA", v: c.ehs.openCapa, warn: c.ehs.openCapa > 0 }, { k: "Lejárt oktatás", v: c.ehs.expired, warn: c.ehs.expired > 0 }, { k: "Magas kockázat", v: c.ehs.highRisk, warn: c.ehs.highRisk > 0 }]}
              onOpen={() => go("ehs", "incidents")} />
            <RadarTile title="Logisztika" icon="truck" accent="#0284c7" level={logLevel}
              primary={c.log.live} primaryLabel="élő fuvar"
              lines={[{ k: "Fuvar-ütközés", v: c.log.conflicts, warn: c.log.conflicts > 0 }, { k: "Úton / tervezett", v: c.log.live }]}
              onOpen={() => go("logistics", "schedule")} />
            <RadarTile title="Reklamáció" icon="wrench" accent="#dc2626" level={svcLevel}
              primary={c.svc.open} primaryLabel="nyitott jegy"
              lines={[{ k: "Átadás utáni hurok", v: c.svc.open, warn: c.svc.open > 0 }]}
              onOpen={() => go("service", "tickets")} />
            <RadarTile title="Jóváhagyások" icon="signature" accent="#7c3aed" level={apprLevel}
              primary={c.proc.apprPending} primaryLabel="limit felett"
              lines={[{ k: "Függő érték", v: window.execMoneyShort(c.proc.apprValue), warn: c.proc.apprPending > 0 }]}
              onOpen={() => go("tasks")} />
            <RadarTile title="Beszerzés" icon="procurement" accent="#d97706" level={procLevel}
              primary={c.proc.poDraftCount} primaryLabel="PO-vázlat"
              lines={[{ k: "Vázlat-érték", v: window.execMoneyShort(c.proc.poDraftValue) }, { k: "Nyitott RFQ", v: c.proc.rfqOpen, warn: c.proc.rfqOpen > 0 }]}
              onOpen={() => go("procurement", "rfq")} />
          </div>
        </div>
      )}

      <div className="text-[10.5px] text-stone-400 mt-5 leading-relaxed">
        Minden szám élő, a forrás-világok igazságforrásaiból számítva (CRM-forecast · rendelés-állomány · gyártás-ütemezés véges kapacitás · Pénzügy-számlák · Kontrolling utókalkuláció · Minőség · EHS · Logisztika · Reklamáció · hatáskör-jóváhagyás). A trend historikuma demó-idősor, az utolsó pont az élő pillanatkép.
      </div>
    </div>
  );
}

Object.assign(window, { ExecCockpit, TrendChart, TrendPanel, PulseCard, RadarTile, LiquidityPanel, MarginMini, StatusBanner, AlertList, TabNav });
