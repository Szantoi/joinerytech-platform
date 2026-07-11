// ──────────────────────────────────────────────────────────────────────────
// param-geometry.js — PARAMETRIKUS GEOMETRIA-MOTOR (woodwork_domain §20)
//
//   A sablon csatlakozás-kényszereiből (joints[], data-tplstudio.js) VALÓDI
//   3D elrendezést számol: minden alkatrész lokális koordináta-rendszert
//   (LCS, §20.1) kap, a kapcsolatok 4×4 (itt 3×4 affin) homogén transzformációs
//   mátrixokon át oldódnak meg (§20.2: M_glob,B = M_glob,A × T_kapcs), a
//   megmunkálások (furat/kivágás) a KAPCSOLATON definiáltak és mindkét
//   alkatrész SAJÁT LCS-ében számítódnak ki (§20.3, 32 mm-es rendszer).
//
//   LCS-konvenció (§20.1): X = hosszúság (a sablon-alkatrész `w` mérete),
//   Y = szélesség (`h`), Z = vastagság (`t`, Z ≥ 0). Lap A = Z=t (szín),
//   Lap B = Z=0. A TPL_PART_REFS él-kulcsai erre képeződnek le.
//
//   Tiszta számítás — nincs store-mutáció. Fogyasztó: page-param-views.jsx
//   (2D parametrikus SVG nézetek) + a sablon-szerkesztő joint-státusz chipjei.
// ──────────────────────────────────────────────────────────────────────────
(function () {
  // ── Mini affin-mátrix lib (3×3 forgatás + eltolás = a 4×4 felső 3 sora) ──
  const Aff = {
    I: () => ({ r: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], t: [0, 0, 0] }),
    // oszlopokból (a frame u/n/v tengelyei) + origó
    mk(cols, o) {
      return { r: [[cols[0][0], cols[1][0], cols[2][0]], [cols[0][1], cols[1][1], cols[2][1]], [cols[0][2], cols[1][2], cols[2][2]]], t: [o[0], o[1], o[2]] };
    },
    trans: (x, y, z) => ({ r: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], t: [x, y, z] }),
    mul(P, Q) {
      const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], t = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i][j] += P.r[i][k] * Q.r[k][j];
        t[i] = P.r[i][0] * Q.t[0] + P.r[i][1] * Q.t[1] + P.r[i][2] * Q.t[2] + P.t[i];
      }
      return { r, t };
    },
    inv(M) { // ortonormált forgatás: R⁻¹ = Rᵀ
      const r = [[M.r[0][0], M.r[1][0], M.r[2][0]], [M.r[0][1], M.r[1][1], M.r[2][1]], [M.r[0][2], M.r[1][2], M.r[2][2]]];
      const t = [0, 0, 0];
      for (let i = 0; i < 3; i++) t[i] = -(r[i][0] * M.t[0] + r[i][1] * M.t[1] + r[i][2] * M.t[2]);
      return { r, t };
    },
    ap(M, p) {
      return [
        M.r[0][0] * p[0] + M.r[0][1] * p[1] + M.r[0][2] * p[2] + M.t[0],
        M.r[1][0] * p[0] + M.r[1][1] * p[1] + M.r[1][2] * p[2] + M.t[1],
        M.r[2][0] * p[0] + M.r[2][1] * p[1] + M.r[2][2] * p[2] + M.t[2]];
    },
    dir(M, v) { // csak forgatás (irányvektor)
      return [
        M.r[0][0] * v[0] + M.r[0][1] * v[1] + M.r[0][2] * v[2],
        M.r[1][0] * v[0] + M.r[1][1] * v[1] + M.r[1][2] * v[2],
        M.r[2][0] * v[0] + M.r[2][1] * v[1] + M.r[2][2] * v[2]];
    },
  };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

  // ── Topológiai keretek (§20.1): origó a sarokban, (u, n, v) jobbsodrású ──
  //   u = az elem fő iránya · n = kifelé mutató normál · v = u × n.
  //   vIn = merre van a test az origótól a v-tengelyen (+1 / −1).
  const PG_REFS = {
    "edge-top":    (d) => ({ o: [0, d.h, 0],   u: [1, 0, 0],  n: [0, 1, 0],   v: [0, 0, 1],  uLen: d.w, vIn: 1,  kind: "edge" }),
    "edge-bottom": (d) => ({ o: [0, 0, 0],     u: [1, 0, 0],  n: [0, -1, 0],  v: [0, 0, -1], uLen: d.w, vIn: -1, kind: "edge" }),
    "edge-left":   (d) => ({ o: [0, 0, 0],     u: [0, 1, 0],  n: [-1, 0, 0],  v: [0, 0, 1],  uLen: d.h, vIn: 1,  kind: "edge" }),
    "edge-right":  (d) => ({ o: [d.w, 0, 0],   u: [0, 1, 0],  n: [1, 0, 0],   v: [0, 0, -1], uLen: d.h, vIn: -1, kind: "edge" }),
    "face-a":      (d) => ({ o: [0, 0, d.t],   u: [1, 0, 0],  n: [0, 0, 1],   v: [0, -1, 0], uLen: d.w, vIn: -1, kind: "face" }),
    "face-b":      (d) => ({ o: [0, 0, 0],     u: [1, 0, 0],  n: [0, 0, -1],  v: [0, 1, 0],  uLen: d.w, vIn: 1,  kind: "face" }),
  };
  const frameOf = (refKey, d) => {
    const f = (PG_REFS[refKey] || PG_REFS["face-a"])(d);
    return { ...f, M: Aff.mk([f.u, f.n, f.v], f.o) };
  };

  // ── Kanonikus illesztő-forgatások (a-frame bázisban a b-frame tengelyei) ──
  //   ROT_FACE (él–lap, lap–lap): u_b=u_a, n_b=−n_a, v_b=−v_a (180° az u körül).
  //   ROT_ELEL (él–él sarok):     u_b=u_a, n_b=−v_a, v_b=n_a.
  const ROT_FACE = { r: [[1, 0, 0], [0, -1, 0], [0, 0, -1]], t: [0, 0, 0] };
  const ROT_ELEL = { r: [[1, 0, 0], [0, 0, 1], [0, -1, 0]], t: [0, 0, 0] };
  const ROT_FLIP = { r: [[-1, 0, 0], [0, -1, 0], [0, 0, 1]], t: [0, 0, 0] }; // 180° a v körül

  // T_kapcs a joint a→b irányában: M_a · F_a · T = M_b · F_b
  //   offset  = az "a" elem eltolása +u irányban · offsetV = +v irányban
  //   (a Δ a b-frame pozíciója az a-frame-ben → az "a" elem mozgatásához NEGATÍV)
  //   flip = 180° tükrözés a v körül (a kontakt-szakasz felezőpontjára centrálva).
  //   polcfurat: az offset a FURATSOR besorolása — a polc maga középre ül (u-n).
  function jointT(j, kind, fa, fb, da, db) {
    const isShelf = j.machining === "polcfurat";
    const offU = isShelf ? (fb.uLen - fa.uLen) / 2 : (Number(j.offset) || 0);
    const offV = Number(j.offsetV) || 0;
    let T;
    const rotWithFlip = (ROT) => {
      if (!j.flip) return ROT;
      const L = Math.min(fa.uLen, fb.uLen) || 0;
      return Aff.mul(Aff.mul(Aff.mul(Aff.trans(L / 2, 0, 0), ROT_FLIP), Aff.trans(-L / 2, 0, 0)), ROT);
    };
    if (kind === "el-el") T = Aff.mul(Aff.trans(-offU, -db.t, da.t - offV), rotWithFlip(ROT_ELEL));
    else if (kind === "lap-lap") T = Aff.mul(Aff.trans(-offU, 0, -offV), rotWithFlip(ROT_FACE));
    else { // el-lap — kanonikus irány: ÉL → LAP; ha az "a" oldal a lap, invertálunk
      const aIsFace = fa.kind === "face";
      const base = Aff.mul(Aff.trans(-offU, 0, -offV), rotWithFlip(ROT_FACE));
      T = aIsFace ? Aff.inv(base) : base;
    }
    return T;
  }

  // ── Megmunkálás-generálás (§20.3) — pozíciók a kapcsolat u-tengelye mentén ──
  function machiningOps(j, kind, Ca, fa, fb, da, db, partA, partB) {
    const ops = [];
    const L = Math.min(fa.uLen, fb.uLen) || 0;
    const nG = Aff.dir(Ca, [0, 1, 0]); // a-frame normál globálban
    const uG = Aff.dir(Ca, [1, 0, 0]);
    const mid = fa.vIn * da.t / 2; // az él vastagság-közepe a v-n
    const P = (x, v) => Aff.ap(Ca, [x, 0, v == null ? mid : v]);
    // pozíciók: 32-es raszterhez igazítva, a végektől 64 mm-re
    const positions = () => {
      if (L < 140) return [L / 2];
      const n = Math.max(2, Math.min(6, Math.round((L - 128) / 256) + 1));
      const out = [];
      for (let i = 0; i < n; i++) out.push(Math.round((64 + (L - 128) * (n === 1 ? 0.5 : i / (n - 1))) / 32) * 32);
      return out;
    };
    const push = (o) => ops.push({ jointId: j.id, axis: nG, uDir: uG, ...o });
    const m = j.machining;
    if (m === "koldokcsap") positions().forEach((x) => push({ type: "hole", p: P(x), dia: 8, label: "tipli Ø8" }));
    else if (m === "csavar") positions().forEach((x) => push({ type: "hole", p: P(x), dia: 4, label: "csavar Ø4" }));
    else if (m === "excenter") positions().forEach((x) => {
      const pp = P(x);
      push({ type: "hole", p: pp, dia: 8, label: "vonócsap Ø8" });
      push({ type: "cam", p: [pp[0] - nG[0] * 34, pp[1] - nG[1] * 34, pp[2] - nG[2] * 34], dia: 15, label: "excenter-ház Ø15 (34 mm)" });
    });
    else if (m === "lamello" || m === "domino") positions().forEach((x) => push({ type: "slot", p: P(x), len: m === "lamello" ? 56 : 40, dia: 8, label: m === "lamello" ? "lamelló-marás" : "dominó-marás" }));
    else if (m === "horony") push({ type: "groove", p: P(0), p2: P(L), dia: db.t || 8, label: "horony / aljazás" });
    else if (m === "polcfurat") {
      const inset = Math.max(20, Number(j.offset) || 37);
      [inset, L - inset].forEach((x) => { for (let k = -2; k <= 2; k++) push({ type: "pin", p: P(x, k * 32), dia: 5, label: "polcfurat Ø5 (32 mm raszter)" }); });
    }
    // lokális (LCS) koordináták MINDKÉT alkatrészben — a §20.3 lényege
    ops.forEach((o) => {
      o.local = {};
      [partA, partB].forEach((pt) => { if (pt && pt.M) o.local[pt.name] = Aff.ap(Aff.inv(pt.M), o.p).map((x) => Math.round(x * 10) / 10); });
    });
    return ops;
  }

  // ── Joint-állapot kiértékelés ──
  const PG_STATE = {
    megoldott:  { label: "megoldva",      pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    pontos:     { label: "illeszkedik",   pill: "bg-sky-50 text-sky-700 border-sky-200" },
    felfekszik: { label: "felfekszik",    pill: "bg-amber-50 text-amber-700 border-amber-200" },
    elter:      { label: "nem illeszkedik", pill: "bg-rose-50 text-rose-700 border-rose-200" },
    nyitott:    { label: "nem megoldott", pill: "bg-stone-100 text-stone-500 border-stone-200" },
  };

  // ── A megoldó (§20.2): gyökér-elhelyezés + BFS a kényszergráfon ──
  //   parts: [{name, w, h, t}] számszerűen feloldva. A gyökér az első alkatrész,
  //   "álló oldallap" orientációban (X_lcs→mélység Y, Y_lcs→magasság Z, Z_lcs→X).
  function solve(tpl, partsIn, opts = {}) {
    const dims = {};
    (partsIn || []).forEach((p) => {
      const w = Number(p.w), h = Number(p.h), t = Number(p.t) || 18;
      if (p.name && isFinite(w) && isFinite(h) && w > 0 && h > 0 && !(p.name in dims)) dims[p.name] = { w, h, t };
    });
    const names = Object.keys(dims);
    if (!names.length) return { parts: [], joints: [], ops: [], bbox: null };

    const E = window.TplEngine;
    const joints = (tpl.joints || []).filter((j) => j && j.a && j.b && dims[j.a.part] && dims[j.b.part] &&
      PG_REFS[j.a.ref] && PG_REFS[j.b.ref] && j.a.part !== j.b.part);

    const M = {}; // partName → globál affin
    const rootName = opts.root && dims[opts.root] ? opts.root : names[0];
    // gyökér: álló oldallap (X→(0,1,0), Y→(0,0,1), Z→(1,0,0))
    M[rootName] = { r: [[0, 0, 1], [1, 0, 0], [0, 1, 0]], t: [0, 0, 0] };

    const solvedBy = {};
    let progress = true;
    while (progress) {
      progress = false;
      joints.forEach((j) => {
        const aP = !!M[j.a.part], bP = !!M[j.b.part];
        if (aP === bP) return;
        const kind = E ? E.jointKind(j) : "el-lap";
        const da = dims[j.a.part], db = dims[j.b.part];
        const fa = frameOf(j.a.ref, da), fb = frameOf(j.b.ref, db);
        const T = jointT(j, kind, fa, fb, da, db);
        if (aP) { M[j.b.part] = Aff.mul(Aff.mul(Aff.mul(M[j.a.part], fa.M), T), Aff.inv(fb.M)); solvedBy[j.b.part] = j.id; }
        else { M[j.a.part] = Aff.mul(Aff.mul(Aff.mul(M[j.b.part], fb.M), Aff.inv(T)), Aff.inv(fa.M)); solvedBy[j.a.part] = j.id; }
        progress = true;
      });
    }

    // alkatrész-rekordok + globál AABB
    const mkPart = (name) => {
      const d = dims[name], Mp = M[name];
      let aabb = null;
      if (Mp) {
        const mins = [1e9, 1e9, 1e9], maxs = [-1e9, -1e9, -1e9];
        [[0, 0, 0], [d.w, 0, 0], [0, d.h, 0], [0, 0, d.t], [d.w, d.h, 0], [d.w, 0, d.t], [0, d.h, d.t], [d.w, d.h, d.t]].forEach((c) => {
          const g = Aff.ap(Mp, c);
          for (let i = 0; i < 3; i++) { mins[i] = Math.min(mins[i], g[i]); maxs[i] = Math.max(maxs[i], g[i]); }
        });
        aabb = { min: mins, max: maxs };
      }
      return { name, ...d, M: Mp || null, aabb, floating: !Mp, root: name === rootName };
    };
    let parts = names.map(mkPart);

    // nem kötött alkatrészek: a befoglaló mellé, fektetve (szaggatott jelölés a nézetben)
    let bx = [0, 0, 0], BX = [1, 1, 1];
    parts.filter((p) => p.aabb).forEach((p) => { for (let i = 0; i < 3; i++) { bx[i] = Math.min(bx[i], p.aabb.min[i]); BX[i] = Math.max(BX[i], p.aabb.max[i]); } });
    let fx = BX[0] + 120;
    parts = parts.map((p) => {
      if (!p.floating) return p;
      const Mp = { r: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], t: [fx, 0, 0] };
      fx += p.w + 80;
      const q = { ...p, M: Mp };
      q.aabb = { min: Aff.ap(Mp, [0, 0, 0]).map((v, i) => Math.min(v, Aff.ap(Mp, [p.w, p.h, p.t])[i])), max: Aff.ap(Mp, [0, 0, 0]).map((v, i) => Math.max(v, Aff.ap(Mp, [p.w, p.h, p.t])[i])) };
      return q;
    });
    const byName = Object.fromEntries(parts.map((p) => [p.name, p]));

    // joint-állapotok + megmunkálások
    const jointOut = [];
    const ops = [];
    joints.forEach((j) => {
      const kind = E ? E.jointKind(j) : "el-lap";
      const pa = byName[j.a.part], pb = byName[j.b.part];
      let state = "nyitott";
      if (pa.M && pb.M && !pa.floating && !pb.floating) {
        const da = dims[j.a.part], db = dims[j.b.part];
        const fa = frameOf(j.a.ref, da), fb = frameOf(j.b.ref, db);
        const T = jointT(j, kind, fa, fb, da, db);
        const expB = Aff.mul(Aff.mul(Aff.mul(pa.M, fa.M), T), Aff.inv(fb.M));
        let rd = 0, td = 0;
        for (let i = 0; i < 3; i++) { td += Math.abs(expB.t[i] - pb.M.t[i]); for (let k = 0; k < 3; k++) rd += Math.abs(expB.r[i][k] - pb.M.r[i][k]); }
        if (rd < 0.01 && td < 0.5) state = solvedBy[j.b.part] === j.id || solvedBy[j.a.part] === j.id ? "megoldott" : "pontos";
        else {
          // felfekvés-teszt: a normálok anti-párhuzamosak és a síkok egybeesnek
          const Ca = Aff.mul(pa.M, fa.M), Cb = Aff.mul(pb.M, fb.M);
          const na = Aff.dir(Ca, [0, 1, 0]), nb = Aff.dir(Cb, [0, 1, 0]);
          const pd = Math.abs(dot(sub(Cb.t, Ca.t), na));
          state = (kind !== "el-el" && dot(na, nb) < -0.9 && pd < 1) ? "felfekszik" : "elter";
        }
        // megmunkálások az "a" oldal tényleges kerete mentén
        if (state !== "elter") ops.push(...machiningOps(j, kind, Ca2(pa, fa), fa, fb, da, db, pa, pb));
        function Ca2(p, f) { return Aff.mul(p.M, f.M); }
      }
      jointOut.push({ id: j.id, kind, state, machining: j.machining, a: j.a, b: j.b, ger: !!j.ger });
    });

    // teljes befoglaló
    let bbox = null;
    parts.forEach((p) => {
      if (!p.aabb) return;
      if (!bbox) bbox = { min: p.aabb.min.slice(), max: p.aabb.max.slice() };
      else for (let i = 0; i < 3; i++) { bbox.min[i] = Math.min(bbox.min[i], p.aabb.min[i]); bbox.max[i] = Math.max(bbox.max[i], p.aabb.max[i]); }
    });
    return { parts, joints: jointOut, ops, bbox, root: rootName };
  }

  window.ParamGeo = { solve, frameOf, PG_REFS, PG_STATE, Aff };
})();
