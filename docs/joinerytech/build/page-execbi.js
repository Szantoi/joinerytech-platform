/* AUTO-GENERATED from page-execbi.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
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
const EXEC_TABS = [{
  key: "pulse",
  label: "Pulzus",
  icon: "chart"
}, {
  key: "finance",
  label: "Pénzügy & fedezet",
  icon: "receipt"
}, {
  key: "sales",
  label: "Kereskedelem",
  icon: "briefcase"
}, {
  key: "ops",
  label: "Működés & minőség",
  icon: "factory"
}];
const EXEC_TAB_LS = "jt_exec_tab";

// ── Idő-ablakos trend-grafikon (terület + vonal, tiszta data-viz) ──
function TrendChart({
  series,
  color,
  kind
}) {
  const W = 720,
    H = 210,
    L = 52,
    R = 16,
    T = 16,
    B = 30;
  const innerW = W - L - R,
    innerH = H - T - B;
  const vals = series.map(p => Number(p.value) || 0);
  const isPct = kind === "pct";
  const rawMax = Math.max(...vals, isPct ? 0.3 : 1);
  const max = isPct ? Math.min(1, rawMax * 1.15) : rawMax * 1.15;
  const min = 0;
  const n = series.length;
  const x = i => L + (n <= 1 ? 0 : innerW * (i / (n - 1)));
  const y = v => T + innerH * (1 - (v - min) / (max - min || 1));
  const pts = series.map((p, i) => [x(i), y(Number(p.value) || 0)]);
  const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = `M${x(0).toFixed(1)} ${(T + innerH).toFixed(1)} ` + pts.map(p => "L" + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") + ` L${x(n - 1).toFixed(1)} ${(T + innerH).toFixed(1)} Z`;
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map(f => min + (max - min) * f);
  const fmtY = v => isPct ? Math.round(v * 100) + "%" : v >= 10 ? v.toFixed(0) : v.toFixed(1);
  const gid = "execgrad-" + (color || "x").replace("#", "");
  const last = pts[pts.length - 1];
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} ${H}`,
    className: "w-full",
    style: {
      height: "auto"
    },
    preserveAspectRatio: "xMidYMid meet"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: gid,
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: color,
    stopOpacity: "0.20"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: color,
    stopOpacity: "0"
  }))), gridVals.map((v, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("line", {
    x1: L,
    y1: y(v),
    x2: W - R,
    y2: y(v),
    stroke: "#f1f0ee",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("text", {
    x: L - 8,
    y: y(v) + 3.5,
    textAnchor: "end",
    fontSize: "10",
    fill: "#a8a29e",
    fontFamily: "ui-sans-serif, system-ui"
  }, fmtY(v)))), /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: `url(#${gid})`
  }), /*#__PURE__*/React.createElement("path", {
    d: line,
    fill: "none",
    stroke: color,
    strokeWidth: "2.2",
    strokeLinejoin: "round",
    strokeLinecap: "round"
  }), pts.map((p, i) => {
    const live = series[i].live;
    return /*#__PURE__*/React.createElement("circle", {
      key: i,
      cx: p[0],
      cy: p[1],
      r: live ? 4 : 2.4,
      fill: live ? "#fff" : color,
      stroke: color,
      strokeWidth: live ? 2.4 : 0
    });
  }), series.map((p, i) => /*#__PURE__*/React.createElement("text", {
    key: i,
    x: x(i),
    y: H - 9,
    textAnchor: "middle",
    fontSize: "10",
    fill: p.live ? "#44403c" : "#a8a29e",
    fontWeight: p.live ? 600 : 400,
    fontFamily: "ui-sans-serif, system-ui"
  }, p.label)), last && /*#__PURE__*/React.createElement("text", {
    x: Math.min(last[0], W - R - 2),
    y: Math.max(last[1] - 9, 14),
    textAnchor: "end",
    fontSize: "10.5",
    fontWeight: "700",
    fill: color,
    fontFamily: "ui-sans-serif, system-ui"
  }, "aktu\xE1lis"));
}

// ── Nagy pulzus-KPI kártya ──
function PulseCard({
  label,
  value,
  sub,
  tone,
  icon,
  onClick,
  accent
}) {
  const fg = tone === "rose" ? "text-rose-700" : tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-stone-900";
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: "text-left bg-white rounded-2xl border border-stone-200 p-4 hover:border-stone-300 hover:shadow-sm transition group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg grid place-items-center",
    style: {
      background: (accent || "#475569") + "1a",
      color: accent || "#475569"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 15
  })), /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 14,
    className: "text-stone-300 group-hover:text-stone-400"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-wide text-stone-400 font-medium"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: `text-[24px] md:text-[26px] font-semibold leading-none mt-1.5 tabular-nums ${fg}`
  }, value), sub && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-1.5"
  }, sub));
}

// ── Kockázat-radar csempe ──
function RadarTile({
  title,
  icon,
  accent,
  primary,
  primaryLabel,
  level,
  lines,
  onOpen
}) {
  const t = window.execAlarmTone(level);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onOpen,
    className: "text-left bg-white rounded-2xl border border-stone-200 p-3.5 hover:border-stone-300 hover:shadow-sm transition group flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-7 h-7 rounded-lg grid place-items-center shrink-0",
    style: {
      background: (accent || "#475569") + "1a",
      color: accent || "#475569"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 15
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800 truncate flex-1"
  }, title), /*#__PURE__*/React.createElement("span", {
    className: `w-2 h-2 rounded-full ${t.dot}`
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: `text-[22px] font-semibold leading-none tabular-nums ${t.fg}`
  }, primary), primaryLabel && /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400 mb-0.5"
  }, primaryLabel)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-0.5 mt-auto"
  }, lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center justify-between gap-2 text-[11px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-500 truncate"
  }, l.k), /*#__PURE__*/React.createElement("span", {
    className: `tabular-nums font-medium shrink-0 ${l.warn ? "text-rose-600" : "text-stone-700"}`
  }, l.v)))));
}

// ── Likviditás-panel ──
function LiquidityPanel({
  fin
}) {
  const maxAbs = Math.max(1, fin.receivable, fin.payable);
  const Row = ({
    label,
    total,
    overdue,
    tone,
    onClick
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: "w-full text-left group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-600"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-900 tabular-nums"
  }, window.execHuf(total))), /*#__PURE__*/React.createElement("div", {
    className: "h-2.5 w-full rounded-full bg-stone-100 overflow-hidden flex"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full ${tone}`,
    style: {
      width: (total - overdue) / maxAbs * 100 + "%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-rose-500",
    style: {
      width: overdue / maxAbs * 100 + "%"
    },
    title: "Lejárt: " + window.execHuf(overdue)
  })), overdue > 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-rose-600 mt-1"
  }, "Ebb\u0151l lej\xE1rt: ", window.execHuf(overdue)));
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Likvidit\xE1s"), /*#__PURE__*/React.createElement("button", {
    onClick: () => go("finance", "outgoing"),
    className: "text-[11px] text-slate-600 font-medium inline-flex items-center gap-1"
  }, "P\xE9nz\xFCgy ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 12
  }))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3.5"
  }, /*#__PURE__*/React.createElement(Row, {
    label: "Vev\u0151-kintl\xE9v\u0151s\xE9g",
    total: fin.receivable,
    overdue: fin.receivableOverdue,
    tone: "bg-emerald-500",
    onClick: () => go("finance", "outgoing")
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Sz\xE1ll\xEDt\xF3-tartoz\xE1s",
    total: fin.payable,
    overdue: fin.payableOverdue,
    tone: "bg-sky-500",
    onClick: () => go("finance", "incoming")
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-stone-100 text-center"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Havi bev\xE9tel"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-emerald-700 tabular-nums"
  }, window.execHufM(fin.cashIn))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Havi kiad\xE1s"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-700 tabular-nums"
  }, window.execHufM(fin.cashOut))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "Nett\xF3 cash"), /*#__PURE__*/React.createElement("div", {
    className: `text-[12.5px] font-semibold tabular-nums ${fin.net < 0 ? "text-rose-700" : "text-emerald-700"}`
  }, (fin.net < 0 ? "−" : "+") + window.execHufM(Math.abs(fin.net))))));
}

// ── Top / flop fedezet ──
function MarginMini({
  r
}) {
  if (!r) return /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400"
  }, "\u2014");
  const pct = r.actualMarginPct;
  const tone = window.ctrlMarginTone ? window.ctrlMarginTone(pct) : {
    fg: "text-stone-700",
    bar: "bg-stone-400"
  };
  const rev = Math.max(1, r.revenueActual || 0);
  const costPct = Math.max(0, Math.min(100, r.actualTotal / rev * 100));
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => go("kontrolling", "projects"),
    className: "w-full text-left group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2 mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, r.project.name), /*#__PURE__*/React.createElement("span", {
    className: `text-[12.5px] font-semibold tabular-nums ${tone.fg}`
  }, window.ctrlPct(pct))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 mb-1.5 truncate"
  }, r.project.customer, " \xB7 ", window.execHuf(r.revenueActual)), /*#__PURE__*/React.createElement("div", {
    className: "h-2 w-full rounded-full bg-stone-100 overflow-hidden flex"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-stone-300",
    style: {
      width: costPct + "%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: `h-full ${tone.bar}`,
    style: {
      width: 100 - costPct + "%"
    }
  })));
}

// ── FŐ KÉPERNYŐ ──

// ── Önálló trend-panel (saját ablak + metrika állapot, laponként szűrt) ──
function TrendPanel({
  trend,
  metricKeys,
  defaultMetric,
  note
}) {
  const [win, setWin] = React.useState(12);
  const [metric, setMetric] = React.useState(defaultMetric || metricKeys[0]);
  const MET = window.EXEC_TREND_METRICS[metric];
  const series = trend.slice(-win).map(p => ({
    label: p.label,
    value: MET.kind === "pct" ? p.margin : p[MET.key],
    live: p.live
  }));
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4 md:p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Alakul\xE1s ", /*#__PURE__*/React.createElement("span", {
    className: "font-normal text-stone-400"
  }, "\xB7 ", MET.sub)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, note || `${win} havi alakulás (demó historikum) — az élő pillanatkép a fenti KPI-kártyákon`)), /*#__PURE__*/React.createElement("div", {
    className: "flex rounded-lg border border-stone-200 overflow-hidden"
  }, window.EXEC_WINDOWS.map(w => /*#__PURE__*/React.createElement("button", {
    key: w.key,
    onClick: () => setWin(w.key),
    className: `h-8 px-2.5 text-[11.5px] font-medium ${win === w.key ? "bg-slate-700 text-white" : "bg-white text-stone-500 hover:bg-stone-50"}`
  }, w.label)))), metricKeys.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5 mb-3"
  }, metricKeys.map(k => {
    const m = window.EXEC_TREND_METRICS[k];
    const on = metric === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setMetric(k),
      className: `inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11.5px] font-medium transition ${on ? "border-transparent text-white" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"}`,
      style: on ? {
        background: m.color
      } : null
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-2 h-2 rounded-full",
      style: {
        background: on ? "rgba(255,255,255,.85)" : m.color
      }
    }), m.label);
  })), /*#__PURE__*/React.createElement(TrendChart, {
    series: series,
    color: MET.color,
    kind: MET.kind
  }));
}

// ── "Minden rendben?" össz-állapot jelző ──
function StatusBanner({
  worst,
  critCount,
  warnCount
}) {
  const map = {
    crit: {
      bg: "bg-rose-50",
      bd: "border-rose-200",
      fg: "text-rose-700",
      dot: "bg-rose-500",
      icon: "alert",
      title: "Figyelmet igényel",
      sub: `${critCount} kritikus${warnCount ? ` · ${warnCount} figyelendő` : ""} tétel az értékláncban`
    },
    warn: {
      bg: "bg-amber-50",
      bd: "border-amber-200",
      fg: "text-amber-700",
      dot: "bg-amber-500",
      icon: "alert",
      title: "Néhány tétel figyelést kér",
      sub: `${warnCount} figyelendő tétel — kritikus nincs`
    },
    ok: {
      bg: "bg-emerald-50",
      bd: "border-emerald-200",
      fg: "text-emerald-700",
      dot: "bg-emerald-500",
      icon: "check",
      title: "Minden a tervek szerint",
      sub: "Nincs kritikus vagy figyelendő tétel a kereszt-világ pulzusban"
    }
  };
  const s = map[worst] || map.ok;
  return /*#__PURE__*/React.createElement("div", {
    className: `flex items-center gap-3.5 rounded-2xl border ${s.bd} ${s.bg} px-4 py-3.5 mb-4`
  }, /*#__PURE__*/React.createElement("span", {
    className: "relative grid place-items-center w-9 h-9 rounded-xl bg-white/70 shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: `absolute inline-flex w-2.5 h-2.5 rounded-full ${s.dot} ${worst !== "ok" ? "animate-ping opacity-60" : ""}`,
    style: {
      top: 6,
      right: 6
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: s.fg
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: `text-[14px] font-semibold ${s.fg}`
  }, s.title), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 truncate"
  }, s.sub)));
}

// ── Mai teendők / kiemelt riasztások lista ──
function AlertList({
  alerts
}) {
  if (!alerts.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-2xl border border-stone-200 p-6 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center mx-auto mb-2"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 20
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[13px] font-medium text-stone-700"
    }, "Nincs kiemelt teend\u0151"), /*#__PURE__*/React.createElement("div", {
      className: "text-[11.5px] text-stone-400 mt-0.5"
    }, "Az \xE9rt\xE9kl\xE1nc minden jelz\u0151je a norm\xE1l s\xE1vban van."));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 overflow-hidden divide-y divide-stone-100"
  }, alerts.map((a, i) => {
    const t = window.execAlarmTone(a.level);
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: a.onClick,
      className: "w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition group"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-8 h-8 rounded-lg grid place-items-center shrink-0",
      style: {
        background: (a.accent || "#475569") + "1a",
        color: a.accent || "#475569"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: a.icon,
      size: 15
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-800 truncate"
    }, a.title), a.detail && /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-stone-400 truncate"
    }, a.detail)), /*#__PURE__*/React.createElement("span", {
      className: `text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${a.level === "crit" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"}`
    }, a.level === "crit" ? "kritikus" : "figyelni"), /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 14,
      className: "text-stone-300 group-hover:text-stone-400 shrink-0"
    }));
  }));
}

// ── Szegmens-nav (lap-választó) ──
function TabNav({
  tab,
  setTab
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1 p-1 rounded-xl bg-stone-100 border border-stone-200 mb-5 w-fit"
  }, EXEC_TABS.map(t => {
    const on = tab === t.key;
    return /*#__PURE__*/React.createElement("button", {
      key: t.key,
      onClick: () => setTab(t.key),
      className: `inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium transition ${on ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`
    }, /*#__PURE__*/React.createElement(Icon, {
      name: t.icon,
      size: 14,
      className: on ? "text-slate-600" : "text-stone-400"
    }), t.label);
  }));
}

// ── FŐ KÉPERNYŐ ──
function ExecCockpit({
  onScreen
}) {
  const sim = useSim();
  const hasExec = sim.hasPerm("controlling.exec");
  const c = window.sim.execCockpit();
  const [tab, setTabRaw] = React.useState(() => {
    try {
      return localStorage.getItem(EXEC_TAB_LS) || "pulse";
    } catch (e) {
      return "pulse";
    }
  });
  const setTab = k => {
    setTabRaw(k);
    try {
      localStorage.setItem(EXEC_TAB_LS, k);
    } catch (e) {}
  };
  const [cfgOpen, setCfgOpen] = React.useState(false);
  if (!hasExec) {
    return /*#__PURE__*/React.createElement("div", {
      className: "px-4 md:px-7 py-16 max-w-[640px] mx-auto text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-12 h-12 rounded-2xl bg-stone-100 grid place-items-center mx-auto mb-3 text-stone-400"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 22
    })), /*#__PURE__*/React.createElement("h1", {
      className: "text-[18px] font-semibold text-stone-800 mb-1"
    }, "Vezet\u0151i \xE1ttekint\xE9s"), /*#__PURE__*/React.createElement("p", {
      className: "text-[13px] text-stone-500"
    }, "Ehhez a kereszt-vil\xE1g vezet\u0151i cockpithoz ", /*#__PURE__*/React.createElement("span", {
      className: "font-mono text-[12px] bg-stone-100 px-1.5 py-0.5 rounded"
    }, "controlling.exec"), " jogosults\xE1g sz\xFCks\xE9ges. K\xE9rd az adminisztr\xE1tort\xF3l a Be\xE1ll\xEDt\xE1sok \u2192 Port\xE1l / Jogosults\xE1gok alatt."));
  }
  const T = c.ctrl.totals;
  const fc = c.sales.forecast;
  const ncrLevel = c.qa.ncrCritical > 0 ? "crit" : c.qa.ncrOpen > 0 ? "warn" : "ok";
  const ehsLevel = c.ehs.openInc > 0 || c.ehs.expired > 0 || c.ehs.highRisk > 0 ? c.ehs.expired > 0 || c.ehs.recordable.lost > 0 ? "crit" : "warn" : "ok";
  const logLevel = c.log.conflicts > 0 ? "crit" : c.log.live > 0 ? "warn" : "ok";
  const svcLevel = c.svc.open > 2 ? "crit" : c.svc.open > 0 ? "warn" : "ok";
  const apprLevel = c.proc.apprPending > 0 ? "warn" : "ok";
  const procLevel = c.proc.poDraftCount > 0 || c.proc.rfqOpen > 0 ? "warn" : "ok";

  // ── Kiemelt riasztások (Pulzus → teendők-lista). Csak crit/warn jelek. ──
  const alerts = [];
  if (c.prod.conflicts > 0) alerts.push({
    level: "crit",
    icon: "factory",
    accent: "#0d9488",
    title: `${c.prod.conflicts} kapacitás-ütközés a gyártásban`,
    detail: `Terhelés ${window.execPct(c.prod.loadPct)} · ${Math.round(c.prod.load)}/${Math.round(c.prod.cap)} óra`,
    onClick: () => go("supervisor", "schedule")
  });else if (c.prod.loadPct > 0.98) alerts.push({
    level: "warn",
    icon: "factory",
    accent: "#0d9488",
    title: "Gyártás közel teljes kapacitáson",
    detail: `Terhelés ${window.execPct(c.prod.loadPct)}`,
    onClick: () => go("supervisor", "schedule")
  });
  if (c.fin.receivableOverdue > 0) alerts.push({
    level: "warn",
    icon: "receipt",
    accent: "#059669",
    title: `Lejárt vevő-kintlévőség: ${window.execMoneyShort(c.fin.receivableOverdue)}`,
    onClick: () => go("finance", "outgoing")
  });
  if (c.fin.payableOverdue > 0) alerts.push({
    level: "warn",
    icon: "receipt",
    accent: "#0284c7",
    title: `Lejárt szállító-tartozás: ${window.execMoneyShort(c.fin.payableOverdue)}`,
    onClick: () => go("finance", "incoming")
  });
  if (c.qa.ncrCritical > 0) alerts.push({
    level: "crit",
    icon: "check",
    accent: "#65a30d",
    title: `${c.qa.ncrCritical} kritikus minőségi hiba (NCR)`,
    detail: `Megfelelés: ${window.ctrlPct(c.qa.rate)}`,
    onClick: () => go("quality", "inspections")
  });else if (c.qa.ncrOpen > 0) alerts.push({
    level: "warn",
    icon: "check",
    accent: "#65a30d",
    title: `${c.qa.ncrOpen} nyitott NCR a minőségben`,
    onClick: () => go("quality", "inspections")
  });
  if (c.ehs.openInc > 0) alerts.push({
    level: c.ehs.recordable.lost > 0 ? "crit" : "warn",
    icon: "shield",
    accent: "#e11d48",
    title: `${c.ehs.openInc} nyitott munkavédelmi eset`,
    onClick: () => go("ehs", "incidents")
  });
  if (c.ehs.expired > 0) alerts.push({
    level: "crit",
    icon: "shield",
    accent: "#e11d48",
    title: `${c.ehs.expired} lejárt munkavédelmi oktatás`,
    onClick: () => go("ehs", "training")
  });
  if (c.ehs.openCapa > 0) alerts.push({
    level: "warn",
    icon: "shield",
    accent: "#e11d48",
    title: `${c.ehs.openCapa} nyitott CAPA-intézkedés`,
    onClick: () => go("ehs", "incidents")
  });
  if (c.ehs.highRisk > 0) alerts.push({
    level: "warn",
    icon: "shield",
    accent: "#e11d48",
    title: `${c.ehs.highRisk} magas kockázat (score ≥ 10)`,
    onClick: () => go("ehs", "risks")
  });
  if (c.log.conflicts > 0) alerts.push({
    level: "crit",
    icon: "truck",
    accent: "#0284c7",
    title: `${c.log.conflicts} fuvar-ütközés a logisztikában`,
    onClick: () => go("logistics", "schedule")
  });
  if (c.svc.open > 0) alerts.push({
    level: c.svc.open > 2 ? "crit" : "warn",
    icon: "wrench",
    accent: "#dc2626",
    title: `${c.svc.open} nyitott reklamáció`,
    detail: "átadás utáni hurok",
    onClick: () => go("service", "tickets")
  });
  if (c.proc.apprPending > 0) alerts.push({
    level: "warn",
    icon: "signature",
    accent: "#7c3aed",
    title: `${c.proc.apprPending} jóváhagyás limit felett`,
    detail: `Függő érték: ${window.execMoneyShort(c.proc.apprValue)}`,
    onClick: () => go("tasks")
  });
  if (c.ctrl.slipped.length > 0) alerts.push({
    level: "warn",
    icon: "analytics",
    accent: "#4f46e5",
    title: `${c.ctrl.slipped.length} projekt költség-túllépésben`,
    onClick: () => go("kontrolling", "variance")
  });
  const order = {
    crit: 0,
    warn: 1
  };
  alerts.sort((a, b) => order[a.level] - order[b.level]);
  const critCount = alerts.filter(a => a.level === "crit").length;
  const warnCount = alerts.filter(a => a.level === "warn").length;
  const worst = critCount > 0 ? "crit" : warnCount > 0 ? "warn" : "ok";
  const heroKpis = /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-5 gap-3"
  }, /*#__PURE__*/React.createElement(PulseCard, {
    label: "S\xFAlyozott pipeline",
    value: window.execMoneyShort(fc.weighted),
    sub: `${fc.openCount} nyitott · ${window.execMoneyShort(fc.pipeline)} bruttó`,
    icon: "briefcase",
    accent: "#2563eb",
    onClick: () => go("crm", "forecast")
  }), /*#__PURE__*/React.createElement(PulseCard, {
    label: "Rendel\xE9s\xE1llom\xE1ny",
    value: window.execMoneyShort(c.backlog.value),
    sub: `${c.backlog.count} visszaigazolt rendelés`,
    icon: "orders",
    accent: "#0284c7",
    onClick: () => go("production", "dash")
  }), /*#__PURE__*/React.createElement(PulseCard, {
    label: "Gy\xE1rt\xE1s-terhel\xE9s",
    value: window.execPct(c.prod.loadPct),
    sub: `${Math.round(c.prod.load)}/${Math.round(c.prod.cap)} óra · ${c.prod.conflicts} ütközés`,
    icon: "factory",
    accent: "#0d9488",
    tone: c.prod.loadPct > 0.98 ? "rose" : c.prod.loadPct < 0.7 ? "amber" : "slate",
    onClick: () => go("supervisor", "schedule")
  }), /*#__PURE__*/React.createElement(PulseCard, {
    label: "Kintl\xE9v\u0151s\xE9g",
    value: window.execMoneyShort(c.fin.receivable),
    sub: c.fin.receivableOverdue > 0 ? `Lejárt: ${window.execMoneyShort(c.fin.receivableOverdue)}` : "nincs lejárt tétel",
    icon: "receipt",
    accent: "#059669",
    tone: c.fin.receivableOverdue > 0 ? "rose" : "slate",
    onClick: () => go("finance", "outgoing")
  }), /*#__PURE__*/React.createElement(PulseCard, {
    label: "V\xE1rhat\xF3 fedezet",
    value: window.ctrlPct(T.eacMarginPct),
    sub: `Tény eddig: ${window.ctrlPct(T.actualMarginPct)} · EAC ${window.execHuf(T.eacMargin)}`,
    icon: "analytics",
    accent: "#4f46e5",
    tone: (T.eacMarginPct || 0) < 0.15 ? "rose" : (T.eacMarginPct || 0) < 0.30 ? "amber" : "emerald",
    onClick: () => go("kontrolling", "dash")
  }));
  const tabMeta = EXEC_TABS.find(t => t.key === tab) || EXEC_TABS[0];
  return /*#__PURE__*/React.createElement("div", {
    className: "px-4 md:px-7 py-5 md:py-6 max-w-[1240px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-[20px] md:text-[24px] font-semibold tracking-tight text-stone-900"
  }, "Vezet\u0151i \xE1ttekint\xE9s"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-stone-500 mt-0.5"
  }, "Az \xE9rt\xE9kl\xE1nc pulzusa n\xE9zetenk\xE9nt \u2014 v\xE1lts perspekt\xEDv\xE1t a lapokkal. Minden k\xE1rtya a forr\xE1s-vil\xE1gba visz.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 shrink-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCfgOpen(true),
    className: "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-600 font-medium hover:border-stone-300 hover:text-stone-800",
    title: "\xD3rad\xEDj-be\xE1ll\xEDt\xE1sok"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 14,
    className: "text-stone-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden md:inline"
  }, "\xD3rad\xEDjak")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onScreen && onScreen("dash"),
    className: "hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 bg-white text-[12px] text-stone-600 font-medium hover:border-stone-300"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chart",
    size: 14
  }), "Portf\xF3li\xF3"))), /*#__PURE__*/React.createElement(TabNav, {
    tab: tab,
    setTab: setTab
  }), window.CtrlSettingsSheet && /*#__PURE__*/React.createElement(window.CtrlSettingsSheet, {
    open: cfgOpen,
    onClose: () => setCfgOpen(false)
  }), tab === "pulse" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StatusBanner, {
    worst: worst,
    critCount: critCount,
    warnCount: warnCount
  }), heroKpis, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mt-5 mb-2.5"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-[14px] font-semibold text-stone-800"
  }, "Mai teend\u0151k"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, alerts.length ? `${alerts.length} kiemelt tétel` : "mire kell ma figyelni")), /*#__PURE__*/React.createElement(AlertList, {
    alerts: alerts
  })), tab === "finance" && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-4 gap-3"
  }, /*#__PURE__*/React.createElement(PulseCard, {
    label: "V\xE1rhat\xF3 fedezet",
    value: window.ctrlPct(T.eacMarginPct),
    sub: `EAC ${window.execHuf(T.eacMargin)}`,
    icon: "analytics",
    accent: "#4f46e5",
    tone: (T.eacMarginPct || 0) < 0.15 ? "rose" : (T.eacMarginPct || 0) < 0.30 ? "amber" : "emerald",
    onClick: () => go("kontrolling", "dash")
  }), /*#__PURE__*/React.createElement(PulseCard, {
    label: "T\xE9ny fedezet",
    value: window.ctrlPct(T.actualMarginPct),
    sub: `Eddig realizált · ${window.execHuf(T.actualMargin)}`,
    icon: "chart",
    accent: "#0d9488",
    tone: (T.actualMarginPct || 0) < 0.15 ? "rose" : "emerald",
    onClick: () => go("kontrolling", "dash")
  }), /*#__PURE__*/React.createElement(PulseCard, {
    label: "Kintl\xE9v\u0151s\xE9g",
    value: window.execMoneyShort(c.fin.receivable),
    sub: c.fin.receivableOverdue > 0 ? `Lejárt: ${window.execMoneyShort(c.fin.receivableOverdue)}` : "nincs lejárt tétel",
    icon: "receipt",
    accent: "#059669",
    tone: c.fin.receivableOverdue > 0 ? "rose" : "slate",
    onClick: () => go("finance", "outgoing")
  }), /*#__PURE__*/React.createElement(PulseCard, {
    label: "Sz\xE1ll\xEDt\xF3-tartoz\xE1s",
    value: window.execMoneyShort(c.fin.payable),
    sub: c.fin.payableOverdue > 0 ? `Lejárt: ${window.execMoneyShort(c.fin.payableOverdue)}` : "nincs lejárt tétel",
    icon: "receipt",
    accent: "#0284c7",
    tone: c.fin.payableOverdue > 0 ? "rose" : "slate",
    onClick: () => go("finance", "incoming")
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-[1.15fr_1fr] gap-3"
  }, /*#__PURE__*/React.createElement(LiquidityPanel, {
    fin: c.fin
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Projekt-fedezet \u2014 sz\xE9ls\u0151 \xE9rt\xE9kek"), /*#__PURE__*/React.createElement("button", {
    onClick: () => go("kontrolling", "projects"),
    className: "text-[11px] text-slate-600 font-medium inline-flex items-center gap-1"
  }, "Mind ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 12
  }))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3.5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-emerald-600 font-medium mb-1.5"
  }, "Legjobb"), /*#__PURE__*/React.createElement(MarginMini, {
    r: c.ctrl.top
  })), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-stone-100 pt-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-rose-600 font-medium mb-1.5"
  }, "Leggyeng\xE9bb"), /*#__PURE__*/React.createElement(MarginMini, {
    r: c.ctrl.flop
  }))), c.ctrl.slipped.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-3.5 pt-3 border-t border-stone-100 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-500"
  }, c.ctrl.slipped.length, " projekt k\xF6lts\xE9g-t\xFAll\xE9p\xE9sben"), /*#__PURE__*/React.createElement("button", {
    onClick: () => go("kontrolling", "variance"),
    className: "text-[11px] text-rose-600 font-medium inline-flex items-center gap-1"
  }, "Elt\xE9r\xE9s-elemz\xE9s ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 12
  }))))), /*#__PURE__*/React.createElement(TrendPanel, {
    trend: c.trend,
    metricKeys: ["revenue", "margin", "backlog"],
    defaultMetric: "revenue"
  })), tab === "sales" && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-5 gap-3"
  }, /*#__PURE__*/React.createElement(PulseCard, {
    label: "S\xFAlyozott pipeline",
    value: window.execMoneyShort(fc.weighted),
    sub: `${fc.openCount} nyitott lehetőség`,
    icon: "briefcase",
    accent: "#2563eb",
    onClick: () => go("crm", "forecast")
  }), /*#__PURE__*/React.createElement(PulseCard, {
    label: "Pipeline brutt\xF3",
    value: window.execMoneyShort(fc.pipeline),
    sub: "nem s\xFAlyozott \xE9rt\xE9k",
    icon: "chart",
    accent: "#7c3aed",
    onClick: () => go("crm", "pipeline")
  }), /*#__PURE__*/React.createElement(PulseCard, {
    label: "Megnyer\xE9si r\xE1ta",
    value: window.execPct(c.sales.win.rate),
    sub: `${c.sales.win.won}/${c.sales.win.closed} lezárt`,
    icon: "check",
    accent: "#0d9488",
    tone: (c.sales.win.rate || 0) < 0.3 ? "amber" : "emerald",
    onClick: () => go("crm", "opps")
  }), /*#__PURE__*/React.createElement(PulseCard, {
    label: "Lead-konverzi\xF3",
    value: window.execPct(c.sales.conv.rate),
    sub: `${c.sales.openLeads} nyitott lead`,
    icon: "briefcase",
    accent: "#2563eb",
    onClick: () => go("crm", "leads")
  }), /*#__PURE__*/React.createElement(PulseCard, {
    label: "Rendel\xE9s\xE1llom\xE1ny",
    value: window.execMoneyShort(c.backlog.value),
    sub: `${c.backlog.count} visszaigazolt`,
    icon: "orders",
    accent: "#0284c7",
    onClick: () => go("production", "dash")
  })), fc.byStage && Object.keys(fc.byStage).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl border border-stone-200 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-stone-800"
  }, "Pipeline f\xE1zisonk\xE9nt"), /*#__PURE__*/React.createElement("button", {
    onClick: () => go("crm", "pipeline"),
    className: "text-[11px] text-slate-600 font-medium inline-flex items-center gap-1"
  }, "Kanban ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 12
  }))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, Object.entries(fc.byStage).map(([k, v]) => {
    const val = v && typeof v === "object" ? v.value || v.weighted || v.sum || 0 : Number(v) || 0;
    const cnt = v && typeof v === "object" ? v.count || v.n || null : null;
    const maxV = Math.max(1, ...Object.values(fc.byStage).map(x => x && typeof x === "object" ? x.value || x.weighted || x.sum || 0 : Number(x) || 0));
    const label = window.OPP_STATUS && window.OPP_STATUS[k] && window.OPP_STATUS[k].label || k;
    return /*#__PURE__*/React.createElement("div", {
      key: k
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-1 text-[11.5px]"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-stone-600"
    }, label, cnt != null ? ` · ${cnt}` : ""), /*#__PURE__*/React.createElement("span", {
      className: "font-semibold text-stone-800 tabular-nums"
    }, window.execMoneyShort(val))), /*#__PURE__*/React.createElement("div", {
      className: "h-2 w-full rounded-full bg-stone-100 overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-full rounded-full bg-violet-500",
      style: {
        width: val / maxV * 100 + "%"
      }
    })));
  }))), /*#__PURE__*/React.createElement(TrendPanel, {
    trend: c.trend,
    metricKeys: ["pipeline", "backlog"],
    defaultMetric: "pipeline",
    note: "Pipeline-alakul\xE1s (dem\xF3 historikum) \u2014 az \xE9l\u0151 pillanatk\xE9p a fenti KPI-k\xE1rty\xE1kon"
  })), tab === "ops" && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-4 gap-3"
  }, /*#__PURE__*/React.createElement(PulseCard, {
    label: "Gy\xE1rt\xE1s-terhel\xE9s",
    value: window.execPct(c.prod.loadPct),
    sub: `${Math.round(c.prod.load)}/${Math.round(c.prod.cap)} óra (heti)`,
    icon: "factory",
    accent: "#0d9488",
    tone: c.prod.loadPct > 0.98 ? "rose" : c.prod.loadPct < 0.7 ? "amber" : "slate",
    onClick: () => go("supervisor", "schedule")
  }), /*#__PURE__*/React.createElement(PulseCard, {
    label: "Kapacit\xE1s-\xFCtk\xF6z\xE9s",
    value: c.prod.conflicts,
    sub: c.prod.conflicts > 0 ? "túlterhelt stáció" : "nincs ütközés",
    icon: "factory",
    accent: "#0d9488",
    tone: c.prod.conflicts > 0 ? "rose" : "emerald",
    onClick: () => go("supervisor", "schedule")
  }), /*#__PURE__*/React.createElement(PulseCard, {
    label: "Min\u0151s\xE9g \u2014 megfelel\xE9s",
    value: window.ctrlPct(c.qa.rate),
    sub: `${c.qa.ncrOpen} nyitott NCR`,
    icon: "check",
    accent: "#65a30d",
    tone: c.qa.ncrCritical > 0 ? "rose" : c.qa.ncrOpen > 0 ? "amber" : "emerald",
    onClick: () => go("quality", "inspections")
  }), /*#__PURE__*/React.createElement(PulseCard, {
    label: "\xC9l\u0151 fuvar",
    value: c.log.live,
    sub: c.log.conflicts > 0 ? `${c.log.conflicts} ütközés` : "nincs ütközés",
    icon: "truck",
    accent: "#0284c7",
    tone: c.log.conflicts > 0 ? "rose" : "slate",
    onClick: () => go("logistics", "schedule")
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-0.5"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-[14px] font-semibold text-stone-800"
  }, "Kock\xE1zat-radar"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, "mire kell ma figyelni")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3"
  }, /*#__PURE__*/React.createElement(RadarTile, {
    title: "Min\u0151s\xE9g",
    icon: "check",
    accent: "#65a30d",
    level: ncrLevel,
    primary: window.ctrlPct ? window.ctrlPct(c.qa.rate) : Math.round(c.qa.rate * 100) + "%",
    primaryLabel: "megfelel\xE9s",
    lines: [{
      k: "Nyitott ellenőrzés",
      v: c.qa.open
    }, {
      k: "Nyitott NCR",
      v: c.qa.ncrOpen,
      warn: c.qa.ncrOpen > 0
    }, {
      k: "Kritikus hiba",
      v: c.qa.ncrCritical,
      warn: c.qa.ncrCritical > 0
    }],
    onOpen: () => go("quality", "inspections")
  }), /*#__PURE__*/React.createElement(RadarTile, {
    title: "Munkav\xE9delem",
    icon: "shield",
    accent: "#e11d48",
    level: ehsLevel,
    primary: c.ehs.openInc,
    primaryLabel: "nyitott eset",
    lines: [{
      k: "Nyitott CAPA",
      v: c.ehs.openCapa,
      warn: c.ehs.openCapa > 0
    }, {
      k: "Lejárt oktatás",
      v: c.ehs.expired,
      warn: c.ehs.expired > 0
    }, {
      k: "Magas kockázat",
      v: c.ehs.highRisk,
      warn: c.ehs.highRisk > 0
    }],
    onOpen: () => go("ehs", "incidents")
  }), /*#__PURE__*/React.createElement(RadarTile, {
    title: "Logisztika",
    icon: "truck",
    accent: "#0284c7",
    level: logLevel,
    primary: c.log.live,
    primaryLabel: "\xE9l\u0151 fuvar",
    lines: [{
      k: "Fuvar-ütközés",
      v: c.log.conflicts,
      warn: c.log.conflicts > 0
    }, {
      k: "Úton / tervezett",
      v: c.log.live
    }],
    onOpen: () => go("logistics", "schedule")
  }), /*#__PURE__*/React.createElement(RadarTile, {
    title: "Reklam\xE1ci\xF3",
    icon: "wrench",
    accent: "#dc2626",
    level: svcLevel,
    primary: c.svc.open,
    primaryLabel: "nyitott jegy",
    lines: [{
      k: "Átadás utáni hurok",
      v: c.svc.open,
      warn: c.svc.open > 0
    }],
    onOpen: () => go("service", "tickets")
  }), /*#__PURE__*/React.createElement(RadarTile, {
    title: "J\xF3v\xE1hagy\xE1sok",
    icon: "signature",
    accent: "#7c3aed",
    level: apprLevel,
    primary: c.proc.apprPending,
    primaryLabel: "limit felett",
    lines: [{
      k: "Függő érték",
      v: window.execMoneyShort(c.proc.apprValue),
      warn: c.proc.apprPending > 0
    }],
    onOpen: () => go("tasks")
  }), /*#__PURE__*/React.createElement(RadarTile, {
    title: "Beszerz\xE9s",
    icon: "procurement",
    accent: "#d97706",
    level: procLevel,
    primary: c.proc.poDraftCount,
    primaryLabel: "PO-v\xE1zlat",
    lines: [{
      k: "Vázlat-érték",
      v: window.execMoneyShort(c.proc.poDraftValue)
    }, {
      k: "Nyitott RFQ",
      v: c.proc.rfqOpen,
      warn: c.proc.rfqOpen > 0
    }],
    onOpen: () => go("procurement", "rfq")
  }))), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-5 leading-relaxed"
  }, "Minden sz\xE1m \xE9l\u0151, a forr\xE1s-vil\xE1gok igazs\xE1gforr\xE1saib\xF3l sz\xE1m\xEDtva (CRM-forecast \xB7 rendel\xE9s-\xE1llom\xE1ny \xB7 gy\xE1rt\xE1s-\xFCtemez\xE9s v\xE9ges kapacit\xE1s \xB7 P\xE9nz\xFCgy-sz\xE1ml\xE1k \xB7 Kontrolling ut\xF3kalkul\xE1ci\xF3 \xB7 Min\u0151s\xE9g \xB7 EHS \xB7 Logisztika \xB7 Reklam\xE1ci\xF3 \xB7 hat\xE1sk\xF6r-j\xF3v\xE1hagy\xE1s). A trend historikuma dem\xF3-id\u0151sor, az utols\xF3 pont az \xE9l\u0151 pillanatk\xE9p."));
}
Object.assign(window, {
  ExecCockpit,
  TrendChart,
  TrendPanel,
  PulseCard,
  RadarTile,
  LiquidityPanel,
  MarginMini,
  StatusBanner,
  AlertList,
  TabNav
});
})();
