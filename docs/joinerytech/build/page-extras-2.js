/* AUTO-GENERATED from page-extras-2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// New Order drawer + extended Settings panels (Facilities, Partners, Roles) + Templates
const {
  useState: useStateE2,
  useEffect: useEffectE2
} = React;

// ──────────────────────────────────────────────────────────────────────────
// Generic right-side slide-over (matches Workflow detail)
// ──────────────────────────────────────────────────────────────────────────
function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  width = 520,
  children,
  footer
}) {
  useEffectE2(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  // Mobil: alulról jövő lap (bottom-sheet) lekerekített tetővel + fogantyú-fül;
  // desktop (≥640px): jobbról csúszó panel. Pure-CSS, resize-re reaktív.
  useEffectE2(() => {
    if (window.__soStyle) return;
    const st = document.createElement("style");
    st.textContent = ".so-panel{position:absolute;left:0;right:0;bottom:0;width:auto;max-height:92vh;border-radius:18px 18px 0 0;}" + "@media(min-width:640px){.so-panel{left:auto;top:0;bottom:auto;height:100%;max-height:none;border-radius:0;width:min(var(--so-w,520px),100vw);}}";
    document.head.appendChild(st);
    window.__soStyle = true;
  }, []);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-stone-900/30 backdrop-blur-[2px]",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("aside", {
    className: "so-panel bg-white shadow-2xl flex flex-col",
    style: {
      "--so-w": `${width}px`
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Bez\xE1r\xE1s",
    className: "sm:hidden w-full flex justify-center pt-2.5 pb-1 shrink-0 active:bg-stone-50"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block w-10 h-1.5 rounded-full bg-stone-300"
  })), /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3.5 sm:py-4 border-b border-stone-200 flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-semibold text-stone-900 truncate"
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-0.5 truncate"
  }, subtitle)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-8 h-8 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700 shrink-0"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto"
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-t border-stone-200 bg-stone-50/60 flex items-center gap-2 justify-end flex-wrap",
    style: {
      paddingBottom: "max(env(safe-area-inset-bottom), 12px)"
    }
  }, footer)));
}

// ──────────────────────────────────────────────────────────────────────────
// New Order drawer
// ──────────────────────────────────────────────────────────────────────────
function NewOrderDrawer({
  open,
  onClose,
  t
}) {
  const [customer, setCustomer] = useStateE2("");
  const [type, setType] = useStateE2("cabinet");
  const [dims, setDims] = useStateE2("");
  const [due, setDue] = useStateE2("");
  const [showAdv, setShowAdv] = useStateE2(false);
  const [material, setMaterial] = useStateE2("Bükk 18mm");
  const [edge, setEdge] = useStateE2("ABS 2mm színazonos");
  const [finish, setFinish] = useStateE2("Lakkozott");
  const [note, setNote] = useStateE2("");
  const customers = ["Bognár Bútor Kft.", "Várdai Konyhastúdió", "Kiss Lakberendezés", "Helios Faipar Zrt.", "Új ügyfél…"];
  const [showSugg, setShowSugg] = useStateE2(false);
  const matches = customer.length === 0 ? customers.slice(0, 4) : customers.filter(c => c.toLowerCase().includes(customer.toLowerCase()));
  const types = [{
    k: "door",
    label: t.orders.types.door
  }, {
    k: "cabinet",
    label: t.orders.types.cabinet
  }, {
    k: "window",
    label: t.orders.types.window
  }, {
    k: "custom",
    label: t.orders.types.custom
  }];
  return /*#__PURE__*/React.createElement(SlideOver, {
    open: open,
    onClose: onClose,
    title: t.orders.newOrder,
    subtitle: "JT-2426-0185 \xB7 v\xE1zlat",
    width: 560,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: onClose
    }, "M\xE9gse"), /*#__PURE__*/React.createElement(GhostBtn, {
      icon: "check",
      onClick: onClose
    }, "Ment\xE9s v\xE1zlatk\xE9nt"), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "sparkle",
      onClick: onClose
    }, "Ment\xE9s \xE9s sz\xE1m\xEDt\xE1s"))
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "Megrendel\u0151"), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    value: customer,
    onChange: e => {
      setCustomer(e.target.value);
      setShowSugg(true);
    },
    onFocus: () => setShowSugg(true),
    onBlur: () => setTimeout(() => setShowSugg(false), 120),
    placeholder: "Kezdj el g\xE9pelni\u2026",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14,
    className: "absolute right-3 top-3 text-stone-400"
  })), showSugg && matches.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-10 overflow-hidden"
  }, matches.map((c, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onMouseDown: () => {
      setCustomer(c);
      setShowSugg(false);
    },
    className: "block w-full text-left px-3 py-2 text-[12.5px] hover:bg-stone-50 border-b border-stone-100 last:border-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-900"
  }, c), c !== "Új ügyfél…" && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500"
  }, "akt\xEDv partner"))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "T\xEDpus"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-1.5"
  }, types.map(x => /*#__PURE__*/React.createElement("button", {
    key: x.k,
    onClick: () => setType(x.k),
    className: `h-9 rounded-lg text-[12px] border transition ${type === x.k ? "bg-teal-700 text-white border-teal-700" : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"}`
  }, x.label)))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "M\xE9retek"), /*#__PURE__*/React.createElement("input", {
    value: dims,
    onChange: e => setDims(e.target.value),
    placeholder: "pl. 600\xD7720\xD7560 mm",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "Hat\xE1rid\u0151"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: due,
    onChange: e => setDue(e.target.value),
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "border border-stone-200 rounded-xl overflow-hidden"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAdv(s => !s),
    className: "w-full px-4 py-2.5 flex items-center justify-between hover:bg-stone-50 text-left"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900"
  }, "R\xE9szletes specifik\xE1ci\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500"
  }, "Anyag, \xE9lz\xE1r\xE1s, fel\xFClet, megjegyz\xE9s, csatolm\xE1ny")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14,
    className: `text-stone-400 transition ${showAdv ? "rotate-90" : ""}`
  })), showAdv && /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 space-y-4 border-t border-stone-200 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "Anyag"), /*#__PURE__*/React.createElement("select", {
    value: material,
    onChange: e => setMaterial(e.target.value),
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white"
  }, CATALOG_MATERIALS.flatMap(m => m.thicknesses.map(th => /*#__PURE__*/React.createElement("option", {
    key: m.name + th
  }, m.name.replace(" tábla", ""), " ", th))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "\xC9lz\xE1r\xE1s"), /*#__PURE__*/React.createElement("select", {
    value: edge,
    onChange: e => setEdge(e.target.value),
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white"
  }, /*#__PURE__*/React.createElement("option", null, "ABS 2mm sz\xEDnazonos"), /*#__PURE__*/React.createElement("option", null, "ABS 1mm sz\xEDnazonos"), /*#__PURE__*/React.createElement("option", null, "PVC 2mm"), /*#__PURE__*/React.createElement("option", null, "Melamin 0.4mm"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "Fel\xFCletkezel\xE9s"), /*#__PURE__*/React.createElement("select", {
    value: finish,
    onChange: e => setFinish(e.target.value),
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white"
  }, /*#__PURE__*/React.createElement("option", null, "Lakkozott"), /*#__PURE__*/React.createElement("option", null, "Olajos laz\xFAr"), /*#__PURE__*/React.createElement("option", null, "Nyers"), /*#__PURE__*/React.createElement("option", null, "F\xF3li\xE1zott")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "Megjegyz\xE9s"), /*#__PURE__*/React.createElement("textarea", {
    value: note,
    onChange: e => setNote(e.target.value),
    rows: 3,
    placeholder: "Pl. fi\xF3kok bel\xFCl melamin feh\xE9r, h\xE1tlap CPL",
    className: "w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "Csatolm\xE1ny"), /*#__PURE__*/React.createElement("div", {
    className: "border-2 border-dashed border-stone-200 rounded-lg px-4 py-5 text-center hover:border-teal-400 hover:bg-teal-50/30 cursor-pointer transition"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "download",
    size: 18,
    className: "text-stone-400 mx-auto"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-600 mt-1"
  }, "H\xFAzd ide a f\xE1jlt vagy ", /*#__PURE__*/React.createElement("span", {
    className: "text-teal-700 font-medium"
  }, "tall\xF3zz")), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400 mt-0.5 font-mono"
  }, "DXF \xB7 DWG \xB7 PDF \xB7 3DM \xB7 max 25 MB")))))));
}

// ──────────────────────────────────────────────────────────────────────────
// Settings: Facilities (Részlegek)
// ──────────────────────────────────────────────────────────────────────────
function FacilitiesPanel() {
  const [openId, setOpenId] = useStateE2(null);
  const facility = FACILITIES.find(f => f.id === openId);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-500"
  }, FACILITIES.length, " r\xE9szleg \xB7 ", FACILITIES.reduce((a, f) => a + f.machines, 0), " g\xE9p \xB7 ", FACILITIES.reduce((a, f) => a + f.workers, 0), " dolgoz\xF3"), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus"
  }, "\xDAj r\xE9szleg")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
  }, FACILITIES.map(f => /*#__PURE__*/React.createElement("button", {
    key: f.id,
    onClick: () => setOpenId(f.id),
    className: "text-left bg-white border border-stone-200/80 hover:border-stone-300 rounded-xl p-4 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 rounded-lg bg-teal-50 text-teal-700 grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "factory",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-900 truncate"
  }, f.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 truncate"
  }, f.address))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 text-[10.5px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-50 rounded-md px-2.5 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-500"
  }, "G\xE9pek"), /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold tabular-nums text-stone-900"
  }, f.machines)), /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-50 rounded-md px-2.5 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-500"
  }, "Dolgoz\xF3k"), /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold tabular-nums text-stone-900"
  }, f.workers))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-stone-100 flex items-center gap-1.5 text-[10.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 11
  }), /*#__PURE__*/React.createElement("span", {
    className: "truncate"
  }, f.contactName))))), /*#__PURE__*/React.createElement(SlideOver, {
    open: !!facility,
    onClose: () => setOpenId(null),
    title: facility?.name,
    subtitle: facility?.address,
    width: 460,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setOpenId(null)
    }, "Bez\xE1r"), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "check"
    }, "Ment\xE9s"))
  }, facility && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, [{
    l: "Cím",
    v: facility.address
  }, {
    l: "Kapcsolattartó",
    v: facility.contactName
  }, {
    l: "Telefon",
    v: facility.contactPhone
  }, {
    l: "Dolgozók",
    v: `${facility.workers} fő`
  }].map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 mb-1"
  }, f.l), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] text-stone-900"
  }, f.v)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 mb-2"
  }, "Hozz\xE1rendelt g\xE9pek (", facility.machinesList.length, ")"), facility.machinesList.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 italic"
  }, "Nincs g\xE9p \u2014 rakt\xE1ri funkci\xF3"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, facility.machinesList.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-2 px-3 py-2 rounded-md bg-stone-50 border border-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "production",
    size: 13,
    className: "text-stone-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-800"
  }, m))))))));
}

// ──────────────────────────────────────────────────────────────────────────
// Settings: Partners
// ──────────────────────────────────────────────────────────────────────────
const PARTNER_TYPE_TONE = {
  manufacturer: "bg-violet-50 text-violet-700",
  cutter: "bg-sky-50 text-sky-700",
  trader: "bg-amber-50 text-amber-700",
  supplier: "bg-teal-50 text-teal-700"
};
function PartnersPanel({
  lang = "hu"
}) {
  const [openId, setOpenId] = useStateE2(null);
  const [showInvite, setShowInvite] = useStateE2(false);
  const partner = PARTNERS.find(p => p.id === openId);
  const types = PARTNER_TYPES[lang] || PARTNER_TYPES.hu;
  const active = PARTNERS.filter(p => p.status === "active");
  const pending = PARTNERS.filter(p => p.status === "pending");
  return /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-3 gap-3"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "lg:col-span-2 p-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-b border-stone-200/80 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "Akt\xEDv partnerek ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-normal tabular-nums"
  }, "(", active.length, ")")), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: () => setShowInvite(true)
  }, "Partner megh\xEDv\xE1sa")), active.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => setOpenId(p.id),
    className: "w-full text-left px-5 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 grid grid-cols-[1fr_120px_120px_100px_24px] gap-3 items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 truncate"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 font-mono"
  }, p.contact)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: `text-[10.5px] px-2 py-0.5 rounded-full font-medium ${PARTNER_TYPE_TONE[p.type]}`
  }, types[p.type])), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StatusPill, {
    status: "ok",
    label: "Akt\xEDv"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-mono text-stone-500 text-right"
  }, p.joined), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-400"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14
  }))))), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 self-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-b border-stone-200/80 text-[12.5px] font-semibold text-stone-900"
  }, "Megh\xEDv\xE1sok ", /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 font-normal tabular-nums"
  }, "(", PARTNER_INVITES.length + pending.length, ")")), pending.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "px-5 py-3 border-b border-stone-100 last:border-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-medium text-stone-900"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] px-1.5 py-0.5 rounded font-medium ${PARTNER_TYPE_TONE[p.type]}`
  }, types[p.type]), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-500 font-mono"
  }, p.joined), /*#__PURE__*/React.createElement(StatusPill, {
    status: "calc",
    label: "F\xFCgg\u0151"
  })))), PARTNER_INVITES.map((inv, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "px-5 py-3 border-b border-stone-100 last:border-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] font-mono text-stone-700 truncate"
  }, inv.email), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] px-1.5 py-0.5 rounded font-medium ${PARTNER_TYPE_TONE[inv.type]}`
  }, types[inv.type]), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-500 font-mono"
  }, inv.sent), inv.state === "pending" ? /*#__PURE__*/React.createElement(StatusPill, {
    status: "calc",
    label: "F\xFCgg\u0151"
  }) : /*#__PURE__*/React.createElement(StatusPill, {
    status: "critical",
    label: "Lej\xE1rt"
  }))))), /*#__PURE__*/React.createElement(SlideOver, {
    open: showInvite,
    onClose: () => setShowInvite(false),
    title: "Partner megh\xEDv\xE1sa",
    subtitle: "B2B handshake \u2014 API kulcs \xE9s szerepk\xF6r",
    width: 480,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setShowInvite(false)
    }, "M\xE9gse"), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "send",
      onClick: () => setShowInvite(false)
    }, "Megh\xEDv\xF3 k\xFCld\xE9se"))
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "E-mail c\xEDm"), /*#__PURE__*/React.createElement("input", {
    placeholder: "b2b@partner.hu",
    className: "w-full h-10 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "Partner t\xEDpus"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1.5"
  }, Object.entries(types).map(([k, label]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: `h-9 rounded-lg text-[12px] border bg-white text-stone-700 border-stone-200 hover:border-stone-300`
  }, label)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "\xDCzenet (opcion\xE1lis)"), /*#__PURE__*/React.createElement("textarea", {
    rows: 4,
    placeholder: "Csatlakozz B2B partnerk\xE9nt a JoineryTech port\xE1lhoz\u2026",
    className: "w-full px-3 py-2 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[11.5px] text-amber-800 flex gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 14,
    className: "shrink-0 mt-0.5"
  }), /*#__PURE__*/React.createElement("span", null, "A partner API kulcsot gener\xE1lunk a megh\xEDv\xE1skor. A kulcs csak egyszer l\xE1that\xF3 l\xE9trehoz\xE1s ut\xE1n.")))), /*#__PURE__*/React.createElement(SlideOver, {
    open: !!partner,
    onClose: () => setOpenId(null),
    title: partner?.name,
    subtitle: partner && types[partner.type] + " · csatlakozott " + partner.joined,
    width: 500,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      icon: "x"
    }, "Letilt\xE1s"), /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setOpenId(null)
    }, "Bez\xE1r"))
  }, partner && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-50 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500"
  }, "K\xF6z\xF6s rendel\xE9sek"), /*#__PURE__*/React.createElement("div", {
    className: "text-[20px] font-semibold tabular-nums text-stone-900"
  }, partner.sharedOrders)), /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-50 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500"
  }, "T\xEDpus"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 mt-0.5"
  }, types[partner.type])), /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-50 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500"
  }, "St\xE1tusz"), /*#__PURE__*/React.createElement("div", {
    className: "mt-1"
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: "ok",
    label: "Akt\xEDv"
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "API kulcs"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-3 h-10 rounded-lg bg-stone-900 text-stone-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 13,
    className: "text-teal-300"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-mono flex-1 truncate"
  }, partner.apiKey || "—"), /*#__PURE__*/React.createElement("button", {
    className: "text-[10.5px] px-2 py-1 rounded bg-white/10 hover:bg-white/20"
  }, "M\xE1sol"), /*#__PURE__*/React.createElement("button", {
    className: "text-[10.5px] px-2 py-1 rounded bg-white/10 hover:bg-white/20"
  }, "Forgat"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "Deleg\xE1lt feladatok"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, partner.delegated.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 italic"
  }, "Nincs deleg\xE1lt feladat"), partner.delegated.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-2 px-3 py-2 rounded-md bg-teal-50/50 border border-teal-100"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13,
    className: "text-teal-700"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-800"
  }, d))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, "Legut\xF3bbi k\xF6z\xF6s rendel\xE9sek"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, ORDERS.slice(0, 3).map(o => /*#__PURE__*/React.createElement("div", {
    key: o.id,
    className: "flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-stone-50 border border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-mono text-stone-600"
  }, o.id), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-900 truncate"
  }, o.customer)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13,
    className: "text-stone-400"
  }))))))));
}

// ──────────────────────────────────────────────────────────────────────────
// Settings: Roles permission matrix
// ──────────────────────────────────────────────────────────────────────────
const PERM_LABEL = {
  full: {
    label: "Teljes",
    icon: "check",
    tone: "bg-teal-50 text-teal-700 border-teal-200"
  },
  read: {
    label: "Olvasás",
    icon: "user",
    tone: "bg-stone-50 text-stone-600 border-stone-200"
  },
  none: {
    label: "Nincs",
    icon: "x",
    tone: "bg-rose-50/50 text-rose-600 border-rose-100"
  }
};
function RolesPanel({
  t
}) {
  const [matrix, setMatrix] = useStateE2(ROLE_MATRIX);
  const cycle = cur => cur === "full" ? "read" : cur === "read" ? "none" : "full";
  const set = (role, mod) => {
    if (role === "admin") return; // locked
    setMatrix(m => ({
      ...m,
      [role]: {
        ...m[role],
        [mod]: cycle(m[role][mod])
      }
    }));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-b border-stone-200/80 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "Jogosults\xE1gi m\xE1trix"), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus"
  }, "\xDAj szerepk\xF6r")), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-[12px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "bg-stone-50/60 border-b border-stone-100 text-[10.5px] uppercase tracking-wide text-stone-500"
  }, /*#__PURE__*/React.createElement("th", {
    className: "text-left px-5 py-2.5 font-medium w-[160px]"
  }, "Szerepk\xF6r"), PERMISSION_MODULES.map(m => /*#__PURE__*/React.createElement("th", {
    key: m,
    className: "text-left px-3 py-2.5 font-medium"
  }, t.nav[m])))), /*#__PURE__*/React.createElement("tbody", null, ROLE_KEYS.map(role => {
    const locked = role === "admin";
    return /*#__PURE__*/React.createElement("tr", {
      key: role,
      className: `border-b border-stone-100 last:border-0 ${locked ? "bg-stone-50/40" : ""}`
    }, /*#__PURE__*/React.createElement("td", {
      className: "px-5 py-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-7 h-7 rounded-md grid place-items-center text-[10px] font-semibold ${locked ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"}`
    }, role[0].toUpperCase()), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900"
    }, t.set.role[role]), locked && /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-400"
    }, "Rendszer \xB7 nem szerkeszthet\u0151")))), PERMISSION_MODULES.map(mod => {
      const v = matrix[role][mod];
      const p = PERM_LABEL[v];
      return /*#__PURE__*/React.createElement("td", {
        key: mod,
        className: "px-3 py-3"
      }, /*#__PURE__*/React.createElement("button", {
        disabled: locked,
        onClick: () => set(role, mod),
        className: `inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium ${p.tone} ${locked ? "opacity-80 cursor-not-allowed" : "hover:brightness-95"}`
      }, /*#__PURE__*/React.createElement(Icon, {
        name: p.icon,
        size: 11
      }), p.label));
    }));
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500 flex items-center gap-3 px-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 11,
    className: "text-teal-700"
  }), " Teljes hozz\xE1f\xE9r\xE9s"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 11,
    className: "text-stone-500"
  }), " Csak olvas\xE1s"), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 11,
    className: "text-rose-600"
  }), " Nincs hozz\xE1f\xE9r\xE9s"), /*#__PURE__*/React.createElement("span", {
    className: "ml-auto text-stone-400"
  }, "Kattints a cell\xE1ra a v\xE1ltoztat\xE1shoz")));
}

// ──────────────────────────────────────────────────────────────────────────
// Templates panel (Catalog → Sablonok)
// ──────────────────────────────────────────────────────────────────────────
const TPL_TYPE = {
  hu: {
    door: "Ajtó",
    cabinet: "Szekrény",
    window: "Ablak"
  },
  en: {
    door: "Door",
    cabinet: "Cabinet",
    window: "Window"
  }
};
const TPL_TYPE_TONE = {
  door: "bg-amber-50 text-amber-700",
  cabinet: "bg-teal-50 text-teal-700",
  window: "bg-sky-50 text-sky-700"
};
function TemplatePreviewSVG({
  type
}) {
  // simple iconographic preview
  const common = {
    width: "100%",
    height: "100%",
    viewBox: "0 0 120 90",
    preserveAspectRatio: "xMidYMid meet"
  };
  if (type === "door") return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
    x: "40",
    y: "10",
    width: "40",
    height: "70",
    rx: "2",
    fill: "#f5f5f4",
    stroke: "#a8a29e"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "46",
    y: "16",
    width: "28",
    height: "28",
    rx: "1",
    fill: "#fff",
    stroke: "#a8a29e",
    strokeWidth: ".5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "46",
    y: "48",
    width: "28",
    height: "28",
    rx: "1",
    fill: "#fff",
    stroke: "#a8a29e",
    strokeWidth: ".5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "71",
    cy: "45",
    r: "1.5",
    fill: "#0d9488"
  }));
  if (type === "window") return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
    x: "22",
    y: "20",
    width: "76",
    height: "50",
    rx: "1",
    fill: "#e0f2fe",
    stroke: "#0369a1"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "60",
    y1: "20",
    x2: "60",
    y2: "70",
    stroke: "#0369a1"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "22",
    y1: "45",
    x2: "98",
    y2: "45",
    stroke: "#0369a1"
  }));
  return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("rect", {
    x: "20",
    y: "15",
    width: "80",
    height: "60",
    rx: "1.5",
    fill: "#f5f5f4",
    stroke: "#a8a29e"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "24",
    y: "19",
    width: "36",
    height: "52",
    fill: "#fff",
    stroke: "#a8a29e",
    strokeWidth: ".5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "62",
    y: "19",
    width: "34",
    height: "25",
    fill: "#fff",
    stroke: "#a8a29e",
    strokeWidth: ".5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "62",
    y: "46",
    width: "34",
    height: "25",
    fill: "#fff",
    stroke: "#a8a29e",
    strokeWidth: ".5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "42",
    cy: "45",
    r: "1.2",
    fill: "#0d9488"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "92",
    cy: "32",
    r: "1.2",
    fill: "#0d9488"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "92",
    cy: "58",
    r: "1.2",
    fill: "#0d9488"
  }));
}
function TemplatesPanel({
  lang = "hu"
}) {
  const [openId, setOpenId] = useStateE2(null);
  const tpl = TEMPLATES.find(t => t.id === openId);
  const labels = TPL_TYPE[lang] || TPL_TYPE.hu;
  const own = TEMPLATES.filter(t => !t.community);
  const community = TEMPLATES.filter(t => t.community);
  const Card2 = ({
    t
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpenId(t.id),
    className: "text-left bg-white border border-stone-200/80 hover:border-stone-300 rounded-xl overflow-hidden transition group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aspect-[4/2.6] bg-stone-50 border-b border-stone-100 grid place-items-center p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full"
  }, /*#__PURE__*/React.createElement(TemplatePreviewSVG, {
    type: t.type
  }))), /*#__PURE__*/React.createElement("div", {
    className: "p-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900 truncate flex-1"
  }, t.name), /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${TPL_TYPE_TONE[t.type]}`
  }, labels[t.type])), /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 flex items-center gap-2.5 text-[10.5px] text-stone-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, t.paramCount, " param"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "text-amber-600"
  }, "\u2605 ", t.rating), t.community && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, t.downloads, " \u2193")))));
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "Saj\xE1t parametrikus sablonok"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500"
  }, "Cabinet 0.3 specifik\xE1ci\xF3 \xB7 CNC deriv\xE1l\xE1s t\xE1mogatva")), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus"
  }, "\xDAj sablon")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
  }, own.map(t => /*#__PURE__*/React.createElement(Card2, {
    key: t.id,
    t: t
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900 inline-flex items-center gap-2"
  }, "Community katal\xF3gus ", /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700"
  }, "b\xE9ta")), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500"
  }, "Megosztott sablonok m\xE1s JoineryTech felhaszn\xE1l\xF3kt\xF3l")), /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "external"
  }, "Tall\xF3z\xE1s")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
  }, community.map(t => /*#__PURE__*/React.createElement(Card2, {
    key: t.id,
    t: t
  })))), /*#__PURE__*/React.createElement(SlideOver, {
    open: !!tpl,
    onClose: () => setOpenId(null),
    title: tpl?.name,
    subtitle: tpl && labels[tpl.type] + " · " + tpl.paramCount + " paraméter",
    width: 500,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setOpenId(null)
    }, "Bez\xE1r"), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "sparkle"
    }, "P\xE9ld\xE1nyos\xEDt\xE1s"))
  }, tpl && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aspect-[4/2.4] bg-stone-50 border border-stone-200 rounded-lg p-6 grid place-items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full max-w-[280px]"
  }, /*#__PURE__*/React.createElement(TemplatePreviewSVG, {
    type: tpl.type
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Param\xE9terek"), tpl.params ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, tpl.params.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "grid grid-cols-[1fr_120px_60px] gap-2 items-center px-3 py-1.5 rounded-md bg-stone-50 border border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-800"
  }, p.name), /*#__PURE__*/React.createElement("input", {
    defaultValue: p.val,
    className: "h-7 px-2 rounded border border-stone-200 text-[11.5px] font-mono bg-white"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 font-mono"
  }, p.unit)))) : /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 italic"
  }, "Param\xE9terek a p\xE9ld\xE1nyos\xEDt\xE1s sor\xE1n v\xE1lnak el\xE9rhet\u0151v\xE9")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "CNC deriv\xE1l\xE1s el\u0151n\xE9zet"), /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-900 rounded-lg p-3 text-[10.5px] font-mono text-teal-300 leading-relaxed"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-stone-400"
  }, "// Gener\xE1lt G-k\xF3d kivonat"), /*#__PURE__*/React.createElement("div", null, "G21 G90 G94 ; mm, abs, mm/min"), /*#__PURE__*/React.createElement("div", null, "T1 M6 ; D=8mm f\xFAr\xF3"), /*#__PURE__*/React.createElement("div", null, "G0 X32 Y96 Z5"), /*#__PURE__*/React.createElement("div", null, "G1 Z-13 F600"), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-400"
  }, "; ... +84 sor"))))));
}
window.NewOrderDrawer = NewOrderDrawer;
window.FacilitiesPanel = FacilitiesPanel;
window.PartnersPanel = PartnersPanel;
window.RolesPanel = RolesPanel;
window.TemplatesPanel = TemplatesPanel;
window.SlideOver = SlideOver;
})();
