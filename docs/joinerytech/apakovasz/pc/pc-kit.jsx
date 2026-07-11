// ──────────────────────────────────────────────────────────────────────────
// pc-kit.jsx — Desktop UI-primitívek (asztali iroda nézet)
// A mobil ui-kit pilljeit/segédeit újrahasználja (window-ról), desktop layout.
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateP, useEffect: useEffectP } = React;

// világ-fejléc
function WorldHead({ kicker, title, sub, right }) {
  return (
    <div className="wh">
      <div>
        <div className="wh-k">{kicker}</div>
        <h1 className="wh-title">{title}</h1>
        {sub ? <div className="wh-sub">{sub}</div> : null}
      </div>
      {right ? <div className="wh-right">{right}</div> : null}
    </div>
  );
}

// KPI-csempe
function Stat({ label, value, sub, tone, accent }) {
  const t = tone ? window.TONES[tone] : null;
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: accent || (t ? t.fg : 'var(--crust)') }}>{value}</div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}
function StatRow({ children }) { return <div className="stat-row">{children}</div>; }

// panel (desktop kártya)
function Panel({ title, right, children, pad }) {
  return (
    <div className="panel">
      {title ? (
        <div className="panel-head">
          <h3>{title}</h3>
          {right || null}
        </div>
      ) : null}
      <div className={'panel-body' + (pad === false ? ' nopad' : '')}>{children}</div>
    </div>
  );
}

// tábla
function Table({ cols, children }) {
  return (
    <table className="dt">
      <thead><tr>{cols.map(function (c, i) { return <th key={i} style={{ textAlign: c.align || 'left', width: c.w }}>{c.label}</th>; })}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  );
}

// avatar (kezdőbetűk)
function Avatar({ name, size }) {
  const init = (name || '?').split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('');
  const sz = size || 34;
  return <div className="avatar" style={{ width: sz, height: sz, fontSize: sz * 0.4 }}>{init}</div>;
}

// haladás-mini
function Prog({ value, max, tone }) {
  const t = window.TONES[tone || 'crust'];
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return <div className="prog"><div className="prog-fill" style={{ width: pct + '%', background: t.dot }}></div></div>;
}

function StepFlow({ flow, status }) {
  if (!flow) return null;
  const order = flow.order.filter(function (s) { return !(flow.states[s] && flow.states[s].requireReason); });
  const idx = order.indexOf(status);
  return (
    <div className="stepflow">
      {order.map(function (s, i) {
        const done = i <= idx && idx >= 0;
        return (
          <React.Fragment key={s}>
            <span className={'step' + (done ? ' done' : '') + (i === idx ? ' cur' : '')}>{flow.label(s)}</span>
            {i < order.length - 1 ? <span className="step-sep">›</span> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

Object.assign(window, { useStateP, useEffectP, WorldHead, Stat, StatRow, Panel, Table, Avatar, Prog, StepFlow });
