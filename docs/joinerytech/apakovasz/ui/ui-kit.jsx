// ──────────────────────────────────────────────────────────────────────────
// ui-kit.jsx — Megosztott UI-primitívek (márka-tónusokkal festve)
// A CORE store-ból olvas; a BRAND színekkel fest. Lásd CORE_MAP.md §0.
// ──────────────────────────────────────────────────────────────────────────
const { useState, useEffect } = React;
const B = window.BRAND;

// tónus → {bg, fg, dot} a státusz-pillekhez (márka-paletta)
const TONES = {
  slate: { bg: '#EEE6D8', fg: '#6B5D4F', dot: '#9C8B77' },
  amber: { bg: '#F7E6CC', fg: '#9A5B1E', dot: '#C97B3C' },
  crust: { bg: '#EBD9C6', fg: '#7A3E1F', dot: '#8A4B2B' },
  sage:  { bg: '#E2E7D2', fg: '#4E5A36', dot: '#6E7A52' },
  ember: { bg: '#F5D9CF', fg: '#9A3A23', dot: '#B5462F' },
};

function fmtNum(n) {
  if (n == null) return '—';
  return Math.round(n).toLocaleString('hu-HU');
}
function fmtKg(n, unit) {
  const v = Math.round((n || 0) * 100) / 100;
  return v.toLocaleString('hu-HU') + ' ' + (unit || '');
}
function fmtFt(n) { return fmtNum(n) + ' Ft'; }

// Státusz-pill egy FSM-állapothoz
function Pill({ tone, children, small }) {
  const t = TONES[tone] || TONES.slate;
  return (
    <span className="pill" style={{
      background: t.bg, color: t.fg,
      fontSize: small ? '11px' : '12.5px', padding: small ? '2px 8px' : '3px 10px',
    }}>
      <span className="pill-dot" style={{ background: t.dot }}></span>
      {children}
    </span>
  );
}

// FSM-állapot pill (a flow definícióból veszi a címkét + tónust)
function StatusPill({ flow, status, small }) {
  if (!flow) return null;
  return <Pill tone={flow.tone(status)} small={small}>{flow.label(status)}</Pill>;
}

function Card({ children, className, style, onClick }) {
  return (
    <div className={'card ' + (className || '')} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

function SectionTitle({ kicker, title, right }) {
  return (
    <div className="sec-title">
      <div>
        {kicker ? <div className="kicker">{kicker}</div> : null}
        <h2>{title}</h2>
      </div>
      {right || null}
    </div>
  );
}

// vízszintes haladás-sáv (kész / terv)
function Bar({ value, max, tone }) {
  const t = TONES[tone || 'sage'];
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="bar"><div className="bar-fill" style={{ width: pct + '%', background: t.dot }}></div></div>
  );
}

function Btn({ children, onClick, kind, disabled, full, small }) {
  return (
    <button
      className={'btn ' + (kind || 'ghost') + (full ? ' full' : '') + (small ? ' small' : '')}
      onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// alulról felcsúszó lap (modal)
function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={function (e) { e.stopPropagation(); }}>
        <div className="sheet-grip"></div>
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="sheet-x" onClick={onClose}>✕</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

function Emoji({ char, size }) {
  return <span style={{ fontSize: (size || 22) + 'px', lineHeight: 1, fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}>{char}</span>;
}

Object.assign(window, {
  useState, useEffect, TONES, fmtNum, fmtKg, fmtFt,
  Pill, StatusPill, Card, SectionTitle, Bar, Btn, Sheet, Emoji,
});
