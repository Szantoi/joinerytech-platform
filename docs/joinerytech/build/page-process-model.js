/* AUTO-GENERATED from page-process-model.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-process-model.jsx — Folyamat-motor: modell-konstansok, segment-factory,
// és a nested flow rekurzív mutátorai (a szerkesztő tiszta logikája).
//
//   Strukturált folyam (renderelhető függőleges sávként, mobilbarát):
//     step     — egy munkalépés (belső vagy külső átadás), részfeladatokkal
//     branch   — döntési elágazás: N címkézett út, majd visszacsatlakozik
//     parallel — fork/join: N párhuzamos sáv, majd szinkronizál
//     loop     — visszacsatolás: vissza egy korábbi step-re (rework ciklus)
//
//   Minden segment-id egyedi a folyamaton belül → id-alapú rekurzív mutátorok.
// ──────────────────────────────────────────────────────────────────────────
const PROC_PALETTE = ["#7c3aed", "#0d9488", "#0ea5e9", "#f59e0b", "#ec4899", "#6366f1", "#10b981", "#f97316"];
const PROC_ACTORS = ["manufacturer", "supplier", "installer", "designer", "dealer", "client"];
const procActor = k => (window.ACTOR_META || {
  manufacturer: {
    l: "Gyártó",
    icon: "factory",
    tint: "bg-stone-200 text-stone-700"
  },
  supplier: {
    l: "Lapszabász",
    icon: "cut",
    tint: "bg-teal-100 text-teal-700"
  },
  installer: {
    l: "Beépítő",
    icon: "wrench",
    tint: "bg-amber-100 text-amber-700"
  },
  designer: {
    l: "Belsőépítész",
    icon: "ruler",
    tint: "bg-violet-100 text-violet-700"
  },
  dealer: {
    l: "Viszonteladó",
    icon: "briefcase",
    tint: "bg-sky-100 text-sky-700"
  },
  client: {
    l: "Ügyfél",
    icon: "user",
    tint: "bg-emerald-100 text-emerald-700"
  }
})[k] || {
  l: k,
  icon: "user",
  tint: "bg-stone-100 text-stone-600"
};
const SEG_META = {
  step: {
    l: "Lépés",
    icon: "box",
    tint: "text-stone-600"
  },
  branch: {
    l: "Elágazás",
    icon: "workflow",
    tint: "text-violet-600"
  },
  parallel: {
    l: "Párhuzamos",
    icon: "layers",
    tint: "text-sky-600"
  },
  loop: {
    l: "Ciklus",
    icon: "external",
    tint: "text-amber-600"
  }
};
let _segN = 0;
const segId = p => (p || "seg") + "-" + Date.now().toString(36) + (_segN++).toString(36);
const newStep = (over = {}) => ({
  id: segId("s"),
  kind: "step",
  name: "Új lépés",
  phase: "Gyártás",
  actor: "manufacturer",
  external: false,
  partnerType: "supplier",
  sla: 8,
  subtasks: [],
  ...over
});
const newBranch = () => ({
  id: segId("b"),
  kind: "branch",
  prompt: "Döntés?",
  paths: [{
    id: segId("p"),
    label: "Igen",
    cond: "",
    flow: [newStep({
      name: "Ág A"
    })]
  }, {
    id: segId("p"),
    label: "Nem",
    cond: "",
    flow: [newStep({
      name: "Ág B"
    })]
  }]
});
const newParallel = () => ({
  id: segId("par"),
  kind: "parallel",
  lanes: [{
    id: segId("l"),
    label: "Sáv 1",
    flow: [newStep({
      name: "Párhuzamos A"
    })]
  }, {
    id: segId("l"),
    label: "Sáv 2",
    flow: [newStep({
      name: "Párhuzamos B"
    })]
  }]
});
const newLoop = targetId => ({
  id: segId("lp"),
  kind: "loop",
  label: "Visszacsatolás",
  cond: "",
  targetId: targetId || null
});

// ── recursive flow helpers (id-based) ───────────────────────────────────────
function mapFlow(flow, fn) {
  // fn(seg) → seg | null (null removes). recurses into branch paths + parallel lanes.
  const out = [];
  (flow || []).forEach(seg => {
    let s = fn(seg);
    if (s === null) return;
    if (s.kind === "branch") s = {
      ...s,
      paths: s.paths.map(p => ({
        ...p,
        flow: mapFlow(p.flow, fn)
      }))
    };else if (s.kind === "parallel") s = {
      ...s,
      lanes: s.lanes.map(l => ({
        ...l,
        flow: mapFlow(l.flow, fn)
      }))
    };
    out.push(s);
  });
  return out;
}
const updateSeg = (flow, id, patchFn) => mapFlow(flow, seg => seg.id === id ? patchFn(seg) : seg);
const removeSeg = (flow, id) => mapFlow(flow, seg => seg.id === id ? null : seg);

// insert a new segment into a container list. container = {scope:"root"} |
// {scope:"path", pathId} | {scope:"lane", laneId}. afterId optional (else append).
function insertSeg(flow, container, seg, afterId) {
  const addInto = list => {
    if (!afterId) return [...list, seg];
    const i = list.findIndex(x => x.id === afterId);
    if (i < 0) return [...list, seg];
    const n = [...list];
    n.splice(i + 1, 0, seg);
    return n;
  };
  if (container.scope === "root") return addInto(flow);
  return mapFlow(flow, s => {
    if (s.kind === "branch") return {
      ...s,
      paths: s.paths.map(p => p.id === container.pathId ? {
        ...p,
        flow: addInto(p.flow)
      } : p)
    };
    if (s.kind === "parallel") return {
      ...s,
      lanes: s.lanes.map(l => l.id === container.laneId ? {
        ...l,
        flow: addInto(l.flow)
      } : l)
    };
    return s;
  });
}
// move a segment up/down within its own list
function moveSeg(flow, id, dir) {
  const swap = list => {
    const i = list.findIndex(x => x.id === id);
    if (i < 0) return list;
    const j = i + dir;
    if (j < 0 || j >= list.length) return list;
    const n = [...list];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  };
  let touched = false;
  const recur = list => {
    if (list.some(x => x.id === id)) {
      touched = true;
      return swap(list);
    }
    return list.map(s => {
      if (s.kind === "branch") return {
        ...s,
        paths: s.paths.map(p => ({
          ...p,
          flow: recur(p.flow)
        }))
      };
      if (s.kind === "parallel") return {
        ...s,
        lanes: s.lanes.map(l => ({
          ...l,
          flow: recur(l.flow)
        }))
      };
      return s;
    });
  };
  return recur(flow);
}
// branch path / parallel lane add-remove
function addPath(flow, branchId) {
  return updateSeg(flow, branchId, b => ({
    ...b,
    paths: [...b.paths, {
      id: segId("p"),
      label: "Új ág",
      cond: "",
      flow: [newStep({
        name: "Új lépés"
      })]
    }]
  }));
}
function removePath(flow, branchId, pathId) {
  return updateSeg(flow, branchId, b => ({
    ...b,
    paths: b.paths.length > 1 ? b.paths.filter(p => p.id !== pathId) : b.paths
  }));
}
function addLane(flow, parId) {
  return updateSeg(flow, parId, pp => ({
    ...pp,
    lanes: [...pp.lanes, {
      id: segId("l"),
      label: "Új sáv",
      flow: [newStep({
        name: "Új lépés"
      })]
    }]
  }));
}
function removeLane(flow, parId, laneId) {
  return updateSeg(flow, parId, pp => ({
    ...pp,
    lanes: pp.lanes.length > 1 ? pp.lanes.filter(l => l.id !== laneId) : pp.lanes
  }));
}
// all step segments (for loop targets), flattened with order
function allSteps(flow) {
  const out = [];
  const recur = list => (list || []).forEach(s => {
    if (s.kind === "step") out.push(s);else if (s.kind === "branch") s.paths.forEach(p => recur(p.flow));else if (s.kind === "parallel") s.lanes.forEach(l => recur(l.flow));
  });
  recur(flow);
  return out;
}
Object.assign(window, {
  PROC_PALETTE,
  PROC_ACTORS,
  procActor,
  SEG_META,
  segId,
  newStep,
  newBranch,
  newParallel,
  newLoop,
  mapFlow,
  updateSeg,
  removeSeg,
  insertSeg,
  moveSeg,
  addPath,
  removePath,
  addLane,
  removeLane,
  allSteps
});
})();
