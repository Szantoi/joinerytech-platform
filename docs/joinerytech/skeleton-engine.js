// ──────────────────────────────────────────────────────────────────────────
// skeleton-engine.js — SKELETON (VÁZSZERKEZET) MOTOR (woodwork_domain §21)
//
//   Háromrétegű, teljesen kényszerezett modell:
//     1. VÁZ (síkok)        → GEOMETRIA: képletes referenciasíkok (GCS:
//                              X=szélesség, Y=mélység, Z=magasság)
//     2. KÖTÉS-objektum     → TECHNOLÓGIA: a síkon él (oldal/normál-iránnyal),
//                              kapcsolat csak kötés-típussal létezhet
//     3. ALKATRÉSZ          → 6 határoló kényszerrel (min/max sík + offset
//                              tengelyenként) a síkokhoz méretezve
//
//   A méret SZÁRMAZTATOTT (sík−sík−offset), a pozíció-mátrix a kényszerekből
//   áll elő — körkörös hivatkozás kizárt, a kiértékelés lineáris (§21.2).
//   Validáció: két érintkező lap deklarált kötés nélkül = HIBA (§21.3).
//
//   VISSZAFELÉ-KOMPATIBILITÁS (kulcs!): a motor a vázból SZÁRMAZTATJA
//     • a part-sorok w/h/t KÉPLETEIT (synthSizes) — a teljes meglévő lánc
//       (SpecEngine.resolveTemplate → MfgPrep.deriveItem → szabásjegyzék)
//       változatlanul a képletekből dolgozik;
//     • a legacy `joints[]` tükröt (deriveJoints) — jointMiters (auto-GV)
//       és jointOps (per-alkatrész útvonal) tovább él.
//   Szinkron: app-store `updateDesignTemplate` → Skel.syncDerived(tpl).
// ──────────────────────────────────────────────────────────────────────────
(function () {
  const AXES = ["X", "Y", "Z"];
  const AXIS_I = { X: 0, Y: 1, Z: 2 };
  const rf = (expr, vals) => {
    if (expr == null || expr === "") return 0;
    try { const v = window.resolveFormula(expr, vals); return typeof v === "number" && isFinite(v) ? v : NaN; }
    catch (e) { return NaN; }
  };

  // Kötés-típusok — a TECHNOLÓGIA kötelező választása (vasalat VAGY anyagban
  // kialakított kötés: csapozás / gér / ragasztás). ops → legacy machining.
  const SKEL_CONN_TYPES = {
    koldokcsap: { label: "Tipli-sor (köldökcsap Ø8)", machining: "koldokcsap", dia: 8,  pill: "bg-amber-50 text-amber-700 border-amber-200" },
    excenter:   { label: "Excenter + csap",            machining: "excenter",   dia: 15, pill: "bg-amber-50 text-amber-700 border-amber-200" },
    csavar:     { label: "Csavarozás (confirmat)",      machining: "csavar",     dia: 4,  pill: "bg-amber-50 text-amber-700 border-amber-200" },
    polcfurat:  { label: "Polcfurat-sor (32 mm)",       machining: "polcfurat",  dia: 5,  pill: "bg-sky-50 text-sky-700 border-sky-200" },
    csapozas:   { label: "Csapozás (anyagban)",         machining: "csapozas",   dia: 0,  pill: "bg-teal-50 text-teal-700 border-teal-200" },
    ger:        { label: "Gérbe vágás (45°, párban)",   machining: "ragasztas",  dia: 0,  ger: true, pill: "bg-rose-50 text-rose-600 border-rose-200" },
    ragasztas:  { label: "Ragasztás",                   machining: "ragasztas",  dia: 0,  pill: "bg-stone-100 text-stone-600 border-stone-200" },
  };
  const SKEL_CONN_ORDER = ["koldokcsap", "excenter", "csavar", "polcfurat", "csapozas", "ger", "ragasztas"];
  const SKEL_STATE = {
    kotve:     { label: "kötve",             pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    nokontakt: { label: "nincs érintkezés",  pill: "bg-rose-50 text-rose-700 border-rose-200" },
    hianyos:   { label: "hiányos",           pill: "bg-stone-100 text-stone-500 border-stone-200" },
  };

  // ── 1. Síkok kiértékelése ──
  function evalPlanes(tpl, vals) {
    const out = {};
    (((tpl.skeleton || {}).planes) || []).forEach((p) => { out[p.id] = rf(p.formula, vals); });
    return out;
  }

  // ── 2. Alkatrész a 6 kényszerből: extent / méret / orientáció / M ──
  //   Konvenció: vastagság-tengely = ahol min és max UGYANARRA a síkra köt;
  //   a maradék kettőből a GCS-sorrendben (X<Y<Z) első = LCS X (w), a másik =
  //   LCS Y (h). Az orientáció 90°-os forgatás; páratlan permutációnál a
  //   vastagság-irány fordul (det=+1 marad — Lap A a pozitívabb oldalon).
  function solvePart(part, planeVals, vals) {
    const b = part.binding;
    if (!b) return null;
    const ext = {}; let tAxis = null;
    for (const ax of AXES) {
      const c = b[ax];
      if (!c || !c.min || !c.max || planeVals[c.min.plane] == null || planeVals[c.max.plane] == null) return null;
      const lo = planeVals[c.min.plane] + rf(c.min.off, vals);
      const hi = planeVals[c.max.plane] + rf(c.max.off, vals);
      if (!isFinite(lo) || !isFinite(hi)) return null;
      ext[ax] = { lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
      if (c.min.plane === c.max.plane) tAxis = ax;
    }
    if (!tAxis) tAxis = AXES.reduce((m, ax) => (ext[ax].hi - ext[ax].lo < ext[m].hi - ext[m].lo ? ax : m), "X");
    const others = AXES.filter((a) => a !== tAxis);
    const wAxis = others[0], hAxis = others[1];
    const size = (ax) => ext[ax].hi - ext[ax].lo;
    // permutáció-paritás: (wAxis,hAxis,tAxis) ← (X,Y,Z)
    const perm = [AXIS_I[wAxis], AXIS_I[hAxis], AXIS_I[tAxis]];
    const even = (perm[0] + 1) % 3 === perm[1] % 3 ? ((perm[1] + 1) % 3 === perm[2] % 3) : false;
    const parity = even ? 1 : -1; // ciklikus = páros (det +1)
    const tDir = parity; // páratlannál a vastagság-irány fordul
    const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    r[AXIS_I[wAxis]][0] = 1; r[AXIS_I[hAxis]][1] = 1; r[AXIS_I[tAxis]][2] = tDir;
    const t = [0, 0, 0];
    t[AXIS_I[wAxis]] = ext[wAxis].lo; t[AXIS_I[hAxis]] = ext[hAxis].lo;
    t[AXIS_I[tAxis]] = tDir > 0 ? ext[tAxis].lo : ext[tAxis].hi;
    return {
      name: part.name, w: size(wAxis), h: size(hAxis), t: size(tAxis),
      M: { r, t }, wAxis, hAxis, tAxis, tDir,
      aabb: { min: AXES.map((a) => ext[a].lo), max: AXES.map((a) => ext[a].hi) },
    };
  }

  // ── 3. Érintkezés-detektálás (a validáció alapja) ──
  //   • FELÜLET-kontakt: pontosan egy tengelyen ~0 átfedés, a másik kettőn érdemi
  //   • SAROK-kontakt (él–él, gér/csapozás területe): két tengelyen kicsi
  //     (≤ anyagvastagság) TÉRFOGATI átfedés, egy tengelyen érdemi — a 45°-os
  //     gérnél a két lap a sarok-dobozon osztozik
  //   • minden más átfedés = ÜTKÖZÉS (mindig hiba)
  function contactOf(pa, pb) {
    const ov = [];
    for (let i = 0; i < 3; i++) {
      const lo = Math.max(pa.aabb.min[i], pb.aabb.min[i]), hi = Math.min(pa.aabb.max[i], pb.aabb.max[i]);
      ov.push({ lo, hi, d: hi - lo });
    }
    if (ov.some((o) => o.d < -0.6)) return null; // nincs érintkezés
    const tMax = Math.max(pa.t || 0, pb.t || 0) + 0.6;
    const zero = [0, 1, 2].filter((i) => Math.abs(ov[i].d) < 0.6);
    const small = [0, 1, 2].filter((i) => ov[i].d >= 0.6 && ov[i].d <= tMax);
    const big = [0, 1, 2].filter((i) => ov[i].d > tMax);
    if (zero.length === 1) {
      const g = zero[0];
      const others = [0, 1, 2].filter((i) => i !== g);
      if (ov[others[0]].d < 5 || ov[others[1]].d < 5) return null;
      return { kind: "face", g, at: (ov[g].lo + ov[g].hi) / 2, rect: others.map((i) => ov[i]), axes: others };
    }
    if (zero.length === 0 && small.length === 2 && big.length === 1) {
      return { kind: "corner", smallAxes: small, bigAxis: big[0], ov };
    }
    if (zero.length === 0 && small.length + big.length === 3) return { kind: "collision", ov };
    return null;
  }

  // ── 4. Megmunkálás-generálás a kötésből (32 mm-raszter, §20.3 minta) ──
  function connOps(conn, ct, pa, pb, contact, Aff) {
    const ops = [];
    if (!contact || contact.kind !== "face" || !ct || !ct.dia) return ops;
    const g = contact.g;
    // hossz-tengely = a kontakt-téglalap hosszabb oldala
    const li = contact.rect[0].d >= contact.rect[1].d ? 0 : 1;
    const uAx = contact.axes[li], vAx = contact.axes[1 - li];
    const L = contact.rect[li].d, u0 = contact.rect[li].lo;
    const vMid = (contact.rect[1 - li].lo + contact.rect[1 - li].hi) / 2;
    const axis = [0, 0, 0]; axis[g] = 1;
    const uDir = [0, 0, 0]; uDir[uAx] = 1;
    const P = (u, v) => { const p = [0, 0, 0]; p[g] = contact.at; p[uAx] = u; p[vAx] = v == null ? vMid : v; return p; };
    const push = (o) => ops.push({ jointId: conn.id, axis, uDir, ...o });
    const positions = () => {
      if (L < 140) return [u0 + L / 2];
      const n = Math.max(2, Math.min(6, Math.round((L - 128) / 256) + 1));
      const out = [];
      for (let i = 0; i < n; i++) out.push(u0 + Math.round((64 + (L - 128) * (i / (n - 1))) / 32) * 32);
      return out;
    };
    const k = conn.type;
    if (k === "koldokcsap") positions().forEach((u) => push({ type: "hole", p: P(u), dia: 8, label: "tipli Ø8" }));
    else if (k === "csavar") positions().forEach((u) => push({ type: "hole", p: P(u), dia: 4, label: "csavar Ø4" }));
    else if (k === "excenter") positions().forEach((u) => {
      push({ type: "hole", p: P(u), dia: 8, label: "vonócsap Ø8" });
      // excenter-ház a fogadó elem testében, a kontakttól 34 mm-re
      const pc = P(u); pc[g] += (pa.aabb.min[g] < contact.at - 1 ? -34 : 34);
      push({ type: "cam", p: pc, dia: 15, label: "excenter-ház Ø15 (34 mm)" });
    });
    else if (k === "polcfurat") {
      const inset = Math.max(20, Number(conn.offset) || 37);
      [u0 + inset, u0 + L - inset].forEach((u) => {
        for (let q = -2; q <= 2; q++) { const p = P(u); p[vAx] += q * 32; push({ type: "pin", p, dia: 5, label: "polcfurat Ø5 (32 mm raszter)" }); }
      });
    }
    // lokális (LCS) koordináták MINDKÉT alkatrészben (§20.3)
    ops.forEach((o) => {
      o.local = {};
      [pa, pb].forEach((pt) => { if (pt && pt.M) o.local[pt.name] = Aff.ap(Aff.inv(pt.M), o.p).map((x) => Math.round(x * 10) / 10); });
    });
    return ops;
  }

  // ── 5. A teljes megoldó ──
  function solve(tpl, vals) {
    if (!window.ParamGeo) return { parts: [], joints: [], ops: [], errors: [], planes: [], bbox: null };
    const Aff = window.ParamGeo.Aff;
    const planeVals = evalPlanes(tpl, vals);
    const planes = (((tpl.skeleton || {}).planes) || []).map((p) => ({ ...p, value: planeVals[p.id] }));
    const parts = [];
    (tpl.parts || []).forEach((p) => {
      const s = solvePart(p, planeVals, vals);
      if (s) parts.push(s);
    });
    const byName = Object.fromEntries(parts.map((p) => [p.name, p]));
    // kötések kiértékelése
    const joints = []; const ops = []; const covered = new Set();
    (tpl.connections || []).forEach((c) => {
      const ct = SKEL_CONN_TYPES[c.type];
      const pa = byName[c.a], pb = byName[c.b];
      let state = "hianyos", contact = null;
      if (pa && pb && ct) {
        contact = contactOf(pa, pb);
        const ok = contact && contact.kind !== "collision";
        state = ok ? "kotve" : "nokontakt";
        if (ok) { covered.add([c.a, c.b].sort().join("|")); ops.push(...connOps(c, ct, pa, pb, contact, Aff)); }
      }
      joints.push({ id: c.id, state, kind: c.type, a: { part: c.a }, b: { part: c.b }, ger: !!(ct && ct.ger), planeId: c.plane });
    });
    // VALIDÁCIÓ: kényszerezetlen érintkezés + ütközés
    const errors = [];
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const ct2 = contactOf(parts[i], parts[j]);
      if (!ct2) continue;
      const key = [parts[i].name, parts[j].name].sort().join("|");
      if (ct2.kind === "collision") errors.push({ a: parts[i].name, b: parts[j].name, kind: "collision", msg: "Ütközés — a két alkatrész térfogatban átfed (ellenőrizd a kényszereket)." });
      else if (!covered.has(key)) errors.push({ a: parts[i].name, b: parts[j].name, kind: "unbound", msg: "Kényszerezetlen érintkezés — válassz kötés-típust (vasalat / csapozás / gér / ragasztás)." });
    }
    let bbox = null;
    parts.forEach((p) => {
      if (!bbox) bbox = { min: p.aabb.min.slice(), max: p.aabb.max.slice() };
      else for (let i = 0; i < 3; i++) { bbox.min[i] = Math.min(bbox.min[i], p.aabb.min[i]); bbox.max[i] = Math.max(bbox.max[i], p.aabb.max[i]); }
    });
    return { parts, joints, ops, errors, planes, bbox, skeleton: true };
  }

  // ── 6. SZÁRMAZTATÁS: w/h/t képletek a binding-ből (a meglévő lánc nyelvén) ──
  function synthAxisFormula(c, planesById, vals) {
    const f = (pid) => { const p = planesById[pid]; return p ? String(p.formula) : "0"; };
    const term = (side) => {
      const base = f(side.plane);
      const off = side.off == null || side.off === "" || side.off === 0 ? null : String(side.off);
      if (!off) return base;
      if (base === "0") return off;
      return `${base} + ${off}`;
    };
    const hiT = term(c.max), loT = term(c.min);
    let out;
    if (loT === "0") out = hiT;
    else out = `(${hiT}) - (${loT})`;
    // kozmetika: "a + -b" → "a - b"
    return out.replace(/\+\s*-/g, "- ");
  }
  function synthSizes(tpl) {
    const planesById = Object.fromEntries((((tpl.skeleton || {}).planes) || []).map((p) => [p.id, p]));
    return (tpl.parts || []).map((p) => {
      if (!p.binding) return p;
      // tengely-szerepek a default-értékekkel megoldva (stabil konvenció)
      const dv = {}; (tpl.vars || []).forEach((v) => { dv[v.key] = v.default; });
      const s = solvePart(p, evalPlanes(tpl, dv), dv);
      if (!s) return p;
      const tC = p.binding[s.tAxis];
      const tF = tC.max.off && String(tC.max.off) !== "0" ? String(tC.max.off) : (tC.min.off ? String(tC.min.off).replace(/^-/, "") : "{body.t}");
      return { ...p, w: synthAxisFormula(p.binding[s.wAxis], planesById), h: synthAxisFormula(p.binding[s.hAxis], planesById), t: tF };
    });
  }

  // ── 7. SZÁRMAZTATÁS: legacy joints[] tükör (jointMiters/jointOps tovább él) ──
  function refAt(part, contact) {
    const gi = { X: 0, Y: 1, Z: 2 };
    if (contact.kind === "corner") {
      // él–él sarok: az érintett ÉL = a NEM-vastagság kicsi tengely, min/max szerint
      const ax = contact.smallAxes.find((a) => a !== gi[part.tAxis]);
      if (ax == null) return part.tDir > 0 ? "face-a" : "face-b";
      const atMax = Math.abs(part.aabb.max[ax] - contact.ov[ax].hi) < 0.8;
      if (ax === gi[part.wAxis]) return atMax ? "edge-right" : "edge-left";
      return atMax ? "edge-top" : "edge-bottom";
    }
    const g = contact.g, at = contact.at;
    if (g === gi[part.tAxis]) {
      const atMax = Math.abs(part.aabb.max[g] - at) < 0.6;
      const faceAOnMax = part.tDir > 0;
      return (atMax === faceAOnMax) ? "face-a" : "face-b";
    }
    if (g === gi[part.wAxis]) return Math.abs(part.aabb.min[g] - at) < 0.6 ? "edge-left" : "edge-right";
    return Math.abs(part.aabb.min[g] - at) < 0.6 ? "edge-bottom" : "edge-top";
  }
  function deriveJoints(tpl) {
    const dv = {}; (tpl.vars || []).forEach((v) => { dv[v.key] = v.default; });
    const planeVals = evalPlanes(tpl, dv);
    const byName = {};
    (tpl.parts || []).forEach((p) => { const s = solvePart(p, planeVals, dv); if (s) byName[p.name] = s; });
    const out = [];
    (tpl.connections || []).forEach((c) => {
      const ct = SKEL_CONN_TYPES[c.type]; const pa = byName[c.a], pb = byName[c.b];
      if (!ct || !pa || !pb) return;
      const contact = contactOf(pa, pb);
      if (!contact || contact.kind === "collision") return;
      out.push({ id: c.id, derived: true,
        a: { part: c.a, ref: refAt(pa, contact) }, b: { part: c.b, ref: refAt(pb, contact) },
        ger: !!ct.ger, machining: ct.machining, offset: Number(c.offset) || 0, note: c.note || "" });
    });
    return out;
  }

  // ── 8. Teljes szinkron (store-hívás: updateDesignTemplate / fallback) ──
  //   GUARD: kötés (connections) nélküli sablonon a kézi joints[] megmarad —
  //   a származtatott tükör csak akkor ír, ha van miből származtatni.
  function syncDerived(tpl) {
    if (!tpl || !tpl.skeleton) return tpl;
    try {
      tpl.parts = synthSizes(tpl);
      if ((tpl.connections || []).length || (tpl.joints || []).some((j) => j.derived)) tpl.joints = deriveJoints(tpl);
    } catch (e) {}
    return tpl;
  }

  window.Skel = { evalPlanes, solvePart, solve, contactOf, synthSizes, deriveJoints, syncDerived, SKEL_CONN_TYPES, SKEL_CONN_ORDER, SKEL_STATE };
})();
