// ──────────────────────────────────────────────────────────────────────────
// assembly.jsx — nested, configurable product assembly + BOM (first version).
//
//   A "termék" can be a shelf, a board, a cabinet — or a whole kitchen. The
//   composer models a TREE:
//       Tétel (assembly)  →  Szekrény (cabinet)  →  Alkatrész (part)
//                          →  Anyag / Vasalat / Megmunkálás (leaves)
//   Multiple cabinets/products can sit under one line item; an order can hold
//   several line items (Nappali, Konyha, 6 ajtó, lámpa…).
//
//   Shared CONFIG parameters (szín, korpusz anyag, front anyag, vasalat márka)
//   drive every leaf "role" — change one and the whole BOM re-resolves, within
//   what dependencies allow (soft-close only with Blum, etc.).
//
//   The BOM rolls quantities up the tree. Each material line can be sourced
//   from one of several suppliers; each machining line is in-house OR external.
//   "Igény generálása" hands the material lines to the store, which splits them
//   into one purchase order PER SUPPLIER (ties into the procurement feature).
// ──────────────────────────────────────────────────────────────────────────
const { useState: useStateAS, useMemo: useMemoAS } = React;

const asHuf = (n) => Math.round(n).toLocaleString("hu-HU") + " Ft";

// ── Config option catalogues ────────────────────────────────────────────────
const CFG_CORPUS = [
  { id: "BK-018-2440", name: "Bükk 18mm", price: 18500, suppliers: ["Falco Sopron Zrt.", "Egger Faipari Kft."] },
  { id: "TL-022-2440", name: "Tölgy 22mm", price: 31800, suppliers: ["Egger Faipari Kft.", "Falco Sopron Zrt."] },
  { id: "MDF-019", name: "MDF 19mm", price: 9600, suppliers: ["Kronospan HU Zrt."] },
];
const CFG_FRONT = [
  { id: "TL-022-FRONT", name: "Tölgy furnér front", price: 28400, suppliers: ["Egger Faipari Kft."] },
  { id: "MDF-016-W", name: "MDF lakk fehér front", price: 12600, suppliers: ["Kronospan HU Zrt."] },
  { id: "HG-ANTRA", name: "Magasfényű antracit front", price: 19800, suppliers: ["Egger Faipari Kft."] },
];
const CFG_HW = [
  { id: "blum", name: "Blum", hinge: { code: "VS-BL-CT", name: "Blum CLIP top 110°", price: 1240, supplier: "Blum Hungária" }, slide: { code: "VS-BL-TB", name: "Blum Tandembox 500", price: 4200, supplier: "Blum Hungária" }, softClose: true },
  { id: "hettich", name: "Hettich", hinge: { code: "VS-HE-SS", name: "Hettich Sensys 110°", price: 980, supplier: "Hettich Hungary" }, slide: { code: "VS-HE-500", name: "Hettich fiókcsúszó 500", price: 1180, supplier: "Hettich Hungary" }, softClose: false },
];
const CFG_COLOR = ["Natúr tölgy", "Fehér", "Antracit"];

// edge banding + screws are fixed
const FIX_EDGE = { code: "EZ-ABS-22", name: "ABS élzáró 22mm", price: 220, unit: "fm", supplier: "Rehau HU" };
const FIX_SCREW = { code: "CS-SP-440", name: "Spax csavar 4×40", price: 12, unit: "db", supplier: "Würth HU" };

// ── Assembly definitions (the tree) ─────────────────────────────────────────
// leaf roles: corpus | front | hinge | slide | edge | screw | machining
const door = (qty) => ({ id: "ajto", name: "Ajtó", kind: "part", qty, leaves: [
  { role: "front", qty: 1, unit: "lap" }, { role: "hinge", qty: 2 }, { role: "edge", qty: 4.6, unit: "fm" },
  { role: "machining", name: "Élzárás + fúrás", qty: 0.4, unit: "óra", rate: 8200 },
]});
const shelf = (qty) => ({ id: "polc", name: "Polc", kind: "part", qty, leaves: [
  { role: "corpus", qty: 0.5, unit: "lap" }, { role: "edge", qty: 2.4, unit: "fm" },
  { role: "machining", name: "Szabás", qty: 0.15, unit: "óra", rate: 7600 },
]});
const drawer = (qty) => ({ id: "fiok", name: "Fiók", kind: "part", qty, leaves: [
  { role: "front", qty: 1, unit: "lap" }, { role: "slide", qty: 1 }, { role: "corpus", qty: 0.6, unit: "lap" },
  { role: "machining", name: "Fiók szerelés", qty: 0.5, unit: "óra", rate: 7800 },
]});
const corpusBox = (qty) => ({ id: "korpusz", name: "Korpusz", kind: "part", qty, leaves: [
  { role: "corpus", qty: 1.4, unit: "lap" }, { role: "edge", qty: 8.2, unit: "fm" }, { role: "screw", qty: 24 },
  { role: "machining", name: "Korpusz CNC", qty: 0.6, unit: "óra", rate: 9500 },
]});

const ASSEMBLY_SEED = [
  { id: "T1", name: "Nappali bútor", kind: "assembly", qty: 1, children: [
    { id: "c-polcos", name: "Polcos szekrény", kind: "cabinet", qty: 2, children: [corpusBox(1), shelf(3), door(2)] },
    { id: "c-vitrin", name: "Vitrines szekrény", kind: "cabinet", qty: 1, children: [corpusBox(1), shelf(2), door(2)] },
  ]},
  { id: "T2", name: "Konyha", kind: "assembly", qty: 1, children: [
    { id: "c-also", name: "Alsó szekrénysor", kind: "cabinet", qty: 4, children: [corpusBox(1), drawer(2), door(1)] },
    { id: "c-felso", name: "Felső szekrénysor", kind: "cabinet", qty: 4, children: [corpusBox(1), door(2)] },
  ]},
  { id: "T3", name: "Beltéri ajtók (6 db)", kind: "assembly", qty: 6, children: [
    { id: "c-ajto", name: "Beltéri ajtó", kind: "cabinet", qty: 1, children: [door(1)] },
  ]},
  { id: "T4", name: "Lámpa (egyedi termék)", kind: "product", qty: 1, custom: true, price: 42000 },
];

// ── BOM resolver: flatten tree → material/hardware/machining lines ───────────
function resolveBOM(nodes, cfg, factor = 1, acc = null) {
  acc = acc || { mat: {}, mach: {} };
  const corpus = CFG_CORPUS.find((c) => c.id === cfg.corpus);
  const front = CFG_FRONT.find((c) => c.id === cfg.front);
  const hw = CFG_HW.find((h) => h.id === cfg.hw);
  nodes.forEach((n) => {
    const f = factor * (n.qty || 1);
    if (n.custom) {
      const key = "custom-" + n.id;
      acc.mat[key] = acc.mat[key] || { name: n.name, code: "EGYEDI", unit: "db", price: n.price, qty: 0, suppliers: ["Saját gyártás"], chosen: "Saját gyártás" };
      acc.mat[key].qty += f;
      return;
    }
    if (n.children) { resolveBOM(n.children, cfg, f, acc); return; }
    if (n.leaves) {
      n.leaves.forEach((l) => {
        const q = f * l.qty;
        if (l.role === "machining") {
          const key = l.name;
          acc.mach[key] = acc.mach[key] || { name: l.name, unit: l.unit, rate: l.rate, qty: 0 };
          acc.mach[key].qty += q;
          return;
        }
        let m;
        if (l.role === "corpus") m = { code: corpus.id, name: corpus.name, price: corpus.price, unit: "lap", suppliers: corpus.suppliers };
        else if (l.role === "front") m = { code: front.id, name: front.name, price: front.price, unit: "lap", suppliers: front.suppliers };
        else if (l.role === "hinge") m = { code: hw.hinge.code, name: hw.hinge.name, price: hw.hinge.price, unit: "db", suppliers: [hw.hinge.supplier] };
        else if (l.role === "slide") m = { code: hw.slide.code, name: hw.slide.name, price: hw.slide.price, unit: "db", suppliers: [hw.slide.supplier] };
        else if (l.role === "edge") m = { code: FIX_EDGE.code, name: FIX_EDGE.name, price: FIX_EDGE.price, unit: "fm", suppliers: [FIX_EDGE.supplier] };
        else if (l.role === "screw") m = { code: FIX_SCREW.code, name: FIX_SCREW.name, price: FIX_SCREW.price, unit: "db", suppliers: [FIX_SCREW.supplier] };
        if (!m) return;
        acc.mat[m.code] = acc.mat[m.code] || { ...m, qty: 0, chosen: m.suppliers[0] };
        acc.mat[m.code].qty += q;
      });
    }
  });
  return acc;
}

// ── Composer ────────────────────────────────────────────────────────────────
function AssemblyComposer({ onClose }) {
  const [cfg, setCfg] = useStateAS({ color: "Natúr tölgy", corpus: "BK-018-2440", front: "TL-022-FRONT", hw: "blum", softClose: true });
  const [expanded, setExpanded] = useStateAS({ T1: true });
  const [tab, setTab] = useStateAS("tree"); // mobile: tree | bom
  const [chosenSup, setChosenSup] = useStateAS({}); // code -> supplier
  const [machMode, setMachMode] = useStateAS({});    // machining name -> in|ext

  const hw = CFG_HW.find((h) => h.id === cfg.hw);
  const setCfgK = (patch) => setCfg((c) => {
    const next = { ...c, ...patch };
    if (patch.hw) { const nhw = CFG_HW.find((h) => h.id === patch.hw); if (!nhw.softClose) next.softClose = false; }
    return next;
  });

  const bom = useMemoAS(() => resolveBOM(ASSEMBLY_SEED, cfg), [cfg]);
  const matLines = Object.entries(bom.mat).map(([code, m]) => ({ code, ...m, chosen: chosenSup[code] || m.chosen }));
  const machLines = Object.entries(bom.mach).map(([name, m]) => ({ ...m, mode: machMode[name] || "in" }));

  const matTotal = matLines.reduce((s, l) => s + l.price * l.qty, 0);
  const machTotal = machLines.reduce((s, l) => s + l.rate * l.qty, 0);
  const grand = matTotal + machTotal;

  // group purchasable material lines by supplier (excludes in-house custom)
  const purchasable = matLines.filter((l) => l.chosen !== "Saját gyártás");
  const supplierCount = new Set(purchasable.map((l) => l.chosen)).size;

  const genRequirements = () => {
    const groups = {};
    purchasable.forEach((l) => { (groups[l.chosen] = groups[l.chosen] || []).push(l); });
    const payload = Object.entries(groups).map(([supplier, lines]) => ({ supplier,
      lines: lines.map((l) => ({ material: l.name, matCode: l.code, qty: Math.ceil(l.qty), unit: l.unit, price: l.price, reqId: "BOM" })) }));
    window.sim?.createPOsFromReqs(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-stone-50" role="dialog" aria-modal="true">
      <header className="shrink-0 bg-white border-b border-stone-200">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 -ml-1 grid place-items-center rounded-lg text-stone-500 hover:bg-stone-100" aria-label="Bezárás"><Icon name="chevron" size={17} className="rotate-180" /></button>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-stone-900 leading-tight">Termék-összeállítás</div>
            <div className="text-[10.5px] text-stone-500 leading-tight">Beágyazott szerkezet · közös konfiguráció · BOM</div>
          </div>
          <div className="md:hidden flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
            {[{ k: "tree", l: "Szerkezet" }, { k: "bom", l: "BOM" }].map((it) => (
              <button key={it.k} onClick={() => setTab(it.k)} className={`px-2.5 h-7 rounded-md text-[11.5px] font-medium ${tab === it.k ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>{it.l}</button>
            ))}
          </div>
        </div>
        {/* Config bar */}
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 pb-2.5 flex items-center gap-2 overflow-x-auto">
          <CfgSelect label="Szín" value={cfg.color} options={CFG_COLOR.map((c) => ({ v: c, l: c }))} onChange={(v) => setCfgK({ color: v })} />
          <CfgSelect label="Korpusz" value={cfg.corpus} options={CFG_CORPUS.map((c) => ({ v: c.id, l: c.name }))} onChange={(v) => setCfgK({ corpus: v })} />
          <CfgSelect label="Front" value={cfg.front} options={CFG_FRONT.map((c) => ({ v: c.id, l: c.name }))} onChange={(v) => setCfgK({ front: v })} />
          <CfgSelect label="Vasalat" value={cfg.hw} options={CFG_HW.map((c) => ({ v: c.id, l: c.name }))} onChange={(v) => setCfgK({ hw: v })} />
          <button onClick={() => hw.softClose && setCfgK({ softClose: !cfg.softClose })} disabled={!hw.softClose}
            className={`shrink-0 h-8 px-2.5 rounded-lg text-[11.5px] font-medium border whitespace-nowrap ${!hw.softClose ? "border-stone-200 text-stone-300 cursor-not-allowed" : cfg.softClose ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-stone-200 text-stone-600"}`}
            title={hw.softClose ? "" : "Csak Blum vasalattal"}>
            Soft-close{!hw.softClose ? " (csak Blum)" : ""}
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 max-w-[1200px] w-full mx-auto md:grid md:grid-cols-[1fr_420px]">
        {/* Tree */}
        <div className={`min-h-0 overflow-y-auto px-4 md:px-6 py-4 ${tab === "tree" ? "" : "hidden md:block"}`}>
          <div className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2">Összeállítás · 4 tétel</div>
          <div className="space-y-1.5">
            {ASSEMBLY_SEED.map((n) => <TreeNode key={n.id} node={n} depth={0} expanded={expanded} setExpanded={setExpanded} cfg={cfg} />)}
          </div>
        </div>
        {/* BOM */}
        <div className={`min-h-0 md:border-l border-stone-200 bg-white flex flex-col ${tab === "bom" ? "" : "hidden md:flex"}`}>
          <div className="px-4 py-2.5 border-b border-stone-100 shrink-0 flex items-center justify-between">
            <div className="text-[13px] font-semibold text-stone-900">Anyaglista (BOM)</div>
            <span className="text-[10.5px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full font-medium">{supplierCount} szállító</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium px-1">Anyagok & vasalat</div>
            {matLines.map((l) => (
              <div key={l.code} className="rounded-lg border border-stone-200 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-stone-900 truncate">{l.name}</div>
                    <div className="text-[10px] font-mono text-stone-400">{l.code} · {Math.ceil(l.qty)} {l.unit}</div>
                  </div>
                  <div className="text-[12px] font-semibold text-stone-900 tabular-nums shrink-0">{asHuf(l.price * l.qty)}</div>
                </div>
                {l.suppliers && l.suppliers.length > 1 ? (
                  <div className="mt-2 flex items-center gap-1 flex-wrap">
                    {l.suppliers.map((sp) => (
                      <button key={sp} onClick={() => setChosenSup((m) => ({ ...m, [l.code]: sp }))}
                        className={`px-2 h-6 rounded-md text-[10.5px] font-medium border ${l.chosen === sp ? "bg-stone-900 border-stone-900 text-white" : "bg-white border-stone-200 text-stone-600"}`}>{sp}</button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1.5 text-[10.5px] text-stone-400">{l.chosen}</div>
                )}
              </div>
            ))}
            <div className="text-[10px] uppercase tracking-wide text-stone-400 font-medium px-1 pt-2">Megmunkálás</div>
            {machLines.map((l) => (
              <div key={l.name} className="rounded-lg border border-stone-200 p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-stone-900 truncate">{l.name}</div>
                  <div className="text-[10px] text-stone-400">{l.qty.toFixed(1)} óra · {asHuf(l.rate)}/óra</div>
                </div>
                <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5 shrink-0">
                  {[{ k: "in", l: "Saját" }, { k: "ext", l: "Külső" }].map((it) => (
                    <button key={it.k} onClick={() => setMachMode((m) => ({ ...m, [l.name]: it.k }))}
                      className={`px-2 h-6 rounded-md text-[10.5px] font-medium ${l.mode === it.k ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>{it.l}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-stone-200 bg-stone-50/70 shrink-0 space-y-1.5" style={{ paddingBottom: "max(env(safe-area-inset-bottom),12px)" }}>
            <div className="flex items-center justify-between text-[12px] text-stone-500"><span>Anyag & vasalat</span><span className="tabular-nums">{asHuf(matTotal)}</span></div>
            <div className="flex items-center justify-between text-[12px] text-stone-500"><span>Megmunkálás</span><span className="tabular-nums">{asHuf(machTotal)}</span></div>
            <div className="flex items-center justify-between text-[15px] font-semibold text-stone-900"><span>Összesen</span><span className="tabular-nums">{asHuf(grand)}</span></div>
            <button onClick={genRequirements}
              className="w-full h-11 mt-1.5 rounded-xl bg-sky-600 text-white text-[13px] font-semibold hover:bg-sky-700 inline-flex items-center justify-center gap-2">
              <Icon name="external" size={16} /> Beszerzési igény ({supplierCount} szállító → {supplierCount} megrendelés)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CfgSelect({ label, value, options, onChange }) {
  return (
    <label className="shrink-0 inline-flex items-center gap-1.5 h-8 pl-2.5 pr-1 rounded-lg bg-white border border-stone-200">
      <span className="text-[10px] uppercase tracking-wide text-stone-400 font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-[11.5px] font-medium text-stone-800 outline-none pr-1">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

const NODE_TONE = {
  assembly: { tint: "bg-violet-50 text-violet-700 border-violet-200", icon: "box" },
  cabinet: { tint: "bg-sky-50 text-sky-700 border-sky-200", icon: "inventory" },
  part: { tint: "bg-teal-50 text-teal-700 border-teal-200", icon: "orders" },
  product: { tint: "bg-amber-50 text-amber-700 border-amber-200", icon: "box" },
};
function TreeNode({ node, depth, expanded, setExpanded, cfg }) {
  const tone = NODE_TONE[node.kind] || NODE_TONE.part;
  const hasChildren = node.children && node.children.length;
  const isOpen = expanded[node.id];
  const corpus = CFG_CORPUS.find((c) => c.id === cfg.corpus);
  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg hover:bg-white px-2 py-1.5" style={{ marginLeft: depth * 16 }}>
        {hasChildren || node.leaves ? (
          <button onClick={() => setExpanded((e) => ({ ...e, [node.id]: !e[node.id] }))} className="w-5 h-5 grid place-items-center rounded text-stone-400 hover:bg-stone-100 shrink-0">
            <Icon name="chevron" size={13} className={isOpen ? "rotate-90" : ""} />
          </button>
        ) : <span className="w-5 shrink-0" />}
        <span className={`w-6 h-6 rounded-md grid place-items-center border shrink-0 ${tone.tint}`}><Icon name={tone.icon} size={13} /></span>
        <span className="text-[12.5px] font-medium text-stone-900 truncate flex-1">{node.name}</span>
        {node.qty > 1 && <span className="text-[10.5px] text-stone-400 shrink-0">×{node.qty}</span>}
        <span className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${tone.tint}`}>{({ assembly: "Összeállítás", cabinet: "Szekrény", part: "Alkatrész", product: "Termék" })[node.kind]}</span>
      </div>
      {isOpen && hasChildren && (
        <div className="mt-1 space-y-1.5">
          {node.children.map((c) => <TreeNode key={c.id} node={c} depth={depth + 1} expanded={expanded} setExpanded={setExpanded} cfg={cfg} />)}
        </div>
      )}
      {isOpen && node.leaves && (
        <div className="mt-1 space-y-0.5" style={{ marginLeft: (depth + 1) * 16 + 28 }}>
          {node.leaves.map((l, i) => {
            const label = l.role === "corpus" ? corpus.name
              : l.role === "front" ? "Front anyag" : l.role === "hinge" ? "Pánt" : l.role === "slide" ? "Fiókcsúszó"
              : l.role === "edge" ? "Élzáró" : l.role === "screw" ? "Csavar" : l.name;
            const isMach = l.role === "machining";
            return (
              <div key={i} className="flex items-center gap-2 text-[11px] text-stone-500 py-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isMach ? "bg-orange-400" : "bg-stone-300"}`} />
                <span className="truncate">{label}</span>
                <span className="text-stone-300">·</span>
                <span className="font-mono">{l.qty} {l.unit || "db"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { AssemblyComposer });
