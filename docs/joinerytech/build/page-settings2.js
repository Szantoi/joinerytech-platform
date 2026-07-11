/* AUTO-GENERATED from page-settings2.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// Settings v2 — improved panels: Roles · Partners · Catalog · StageChain
// Exported to window, overriding the originals from page-extras-2.jsx
const {
  useState: useStateSx,
  useMemo: useMemoSx
} = React;

// ── helpers shared across panels ────────────────────────────────────────────
function SxLabel({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5"
  }, children);
}
function SxInput({
  value,
  onChange,
  placeholder,
  mono,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: e => onChange(e.target.value),
    placeholder: placeholder,
    className: `w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${mono ? "font-mono" : ""} ${className}`
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. RolesPanel v2 — permission matrix + user-count + role editor SlideOver
// ══════════════════════════════════════════════════════════════════════════════
const ROLE_META = {
  admin: {
    desc: "Teljes hozzáférés minden modulhoz és beállításhoz.",
    users: ["Kovács Péter"]
  },
  manager: {
    desc: "Gyártás, értékesítés, raktár — beállítások olvasás.",
    users: ["Szabó Anna", "Tóth Kinga"]
  },
  operator: {
    desc: "Gyártás teljes, többi modul olvasás. Nincs beszerzés, beállítás.",
    users: ["Nagy János", "Kiss András", "Horváth Éva"]
  },
  viewer: {
    desc: "Csak olvasás mindenhol. Beállítás nélkül.",
    users: []
  }
};
const PERM_CFG = {
  full: {
    label: "Teljes",
    bg: "bg-teal-50",
    fg: "text-teal-700",
    border: "border-teal-200",
    icon: "check"
  },
  read: {
    label: "Olvasás",
    bg: "bg-stone-50",
    fg: "text-stone-600",
    border: "border-stone-200",
    icon: "user"
  },
  none: {
    label: "Nincs",
    bg: "bg-rose-50",
    fg: "text-rose-600",
    border: "border-rose-100",
    icon: "x"
  }
};
function RolesPanel({
  t
}) {
  const [matrix, setMatrix] = useStateSx(ROLE_MATRIX);
  const [openRole, setOpenRole] = useStateSx(null);
  const cycle = cur => cur === "full" ? "read" : cur === "read" ? "none" : "full";
  const setCell = (role, mod) => {
    if (role === "admin") return;
    setMatrix(m => ({
      ...m,
      [role]: {
        ...m[role],
        [mod]: cycle(m[role][mod])
      }
    }));
  };
  const modLabels = {
    orders: "Rendelések",
    production: "Gyártás",
    inventory: "Raktár",
    procurement: "Beszerzés",
    analytics: "Elemzés",
    settings: "Beállítások"
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-4 gap-3"
  }, ROLE_KEYS.map(role => {
    const meta = ROLE_META[role];
    const locked = role === "admin";
    return /*#__PURE__*/React.createElement("button", {
      key: role,
      onClick: () => setOpenRole(role),
      className: "text-left bg-white border border-stone-200/80 hover:border-stone-300 rounded-xl p-4 transition"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-8 h-8 rounded-lg grid place-items-center text-[11px] font-bold ${locked ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"}`
    }, t.set.role[role]?.[0]?.toUpperCase() || role[0].toUpperCase()), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-semibold text-stone-900 truncate"
    }, t.set.role[role] || role), locked && /*#__PURE__*/React.createElement("div", {
      className: "text-[9.5px] text-stone-400"
    }, "Rendszer \xB7 z\xE1rolt"))), /*#__PURE__*/React.createElement("div", {
      className: "text-[10.5px] text-stone-500 leading-snug mb-3"
    }, meta.desc), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex -space-x-1.5"
    }, meta.users.slice(0, 3).map(u => /*#__PURE__*/React.createElement("div", {
      key: u,
      className: "w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 grid place-items-center text-[9px] font-bold text-white border-2 border-white",
      title: u
    }, u.split(" ").map(w => w[0]).join("").slice(0, 2)))), /*#__PURE__*/React.createElement("span", {
      className: "text-[10.5px] text-stone-500"
    }, meta.users.length, " felhaszn\xE1l\xF3")));
  })), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-b border-stone-200/80 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "Jogosults\xE1gi m\xE1trix"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-[10.5px] text-stone-500"
  }, Object.entries(PERM_CFG).map(([k, v]) => /*#__PURE__*/React.createElement("span", {
    key: k,
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: v.icon,
    size: 11,
    className: v.fg
  }), v.label)), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 ml-2"
  }, "Kattints a cell\xE1ra"))), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-[12px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "bg-stone-50/60 border-b border-stone-100"
  }, /*#__PURE__*/React.createElement("th", {
    className: "text-left px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium w-[180px]"
  }, "Szerepk\xF6r"), PERMISSION_MODULES.map(m => /*#__PURE__*/React.createElement("th", {
    key: m,
    className: "text-center px-3 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 font-medium"
  }, modLabels[m] || m)))), /*#__PURE__*/React.createElement("tbody", null, ROLE_KEYS.map(role => {
    const locked = role === "admin";
    const meta = ROLE_META[role];
    return /*#__PURE__*/React.createElement("tr", {
      key: role,
      className: `border-b border-stone-100 last:border-0 ${locked ? "bg-stone-50/40" : "hover:bg-stone-50/30"}`
    }, /*#__PURE__*/React.createElement("td", {
      className: "px-5 py-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-medium text-stone-900"
    }, t.set.role[role] || role), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-stone-400"
    }, meta.users.length, " f\u0151")), PERMISSION_MODULES.map(mod => {
      const v = matrix[role][mod];
      const cfg = PERM_CFG[v];
      return /*#__PURE__*/React.createElement("td", {
        key: mod,
        className: "px-3 py-3 text-center"
      }, /*#__PURE__*/React.createElement("button", {
        disabled: locked,
        onClick: () => setCell(role, mod),
        className: `inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium w-[78px] transition ${cfg.bg} ${cfg.fg} ${cfg.border} ${locked ? "opacity-75 cursor-not-allowed" : "hover:brightness-95 active:scale-[.97]"}`
      }, /*#__PURE__*/React.createElement(Icon, {
        name: cfg.icon,
        size: 11
      }), cfg.label));
    }));
  }))))), /*#__PURE__*/React.createElement(SlideOver, {
    open: !!openRole,
    onClose: () => setOpenRole(null),
    title: openRole ? t.set.role[openRole] || openRole : "",
    subtitle: openRole ? ROLE_META[openRole]?.desc : "",
    width: 480,
    footer: openRole !== "admin" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setOpenRole(null)
    }, "Bez\xE1r"), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "check",
      onClick: () => {
        setOpenRole(null);
        window.toast?.("✓ Szerepkör mentve", "success");
      }
    }, "Ment\xE9s")) : /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setOpenRole(null)
    }, "Bez\xE1r")
  }, openRole && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Hozz\xE1rendelt felhaszn\xE1l\xF3k (", ROLE_META[openRole].users.length, ")"), ROLE_META[openRole].users.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] text-stone-400 italic px-1"
  }, "Nincs hozz\xE1rendelt felhaszn\xE1l\xF3") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, ROLE_META[openRole].users.map(u => /*#__PURE__*/React.createElement("div", {
    key: u,
    className: "flex items-center gap-3 px-3 py-2 rounded-lg bg-stone-50 border border-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 grid place-items-center text-[10px] font-bold text-white shrink-0"
  }, u.split(" ").map(w => w[0]).join("").slice(0, 2)), /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] text-stone-900 flex-1"
  }, u), openRole !== "admin" && /*#__PURE__*/React.createElement("button", {
    className: "text-[10.5px] text-rose-600 hover:underline"
  }, "Elt\xE1vol\xEDt")))), openRole !== "admin" && /*#__PURE__*/React.createElement("button", {
    className: "mt-2 text-[11.5px] text-teal-700 font-medium inline-flex items-center gap-1 hover:text-teal-800"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), "Felhaszn\xE1l\xF3 hozz\xE1rendel\xE9se")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Jogosults\xE1gok"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, PERMISSION_MODULES.map(mod => {
    const v = matrix[openRole][mod];
    const cfg = PERM_CFG[v];
    return /*#__PURE__*/React.createElement("div", {
      key: mod,
      className: "flex items-center justify-between px-3 py-2 rounded-lg bg-stone-50 border border-stone-100"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[12px] text-stone-800"
    }, modLabels[mod] || mod), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, ["full", "read", "none"].map(opt => /*#__PURE__*/React.createElement("button", {
      key: opt,
      disabled: openRole === "admin",
      onClick: () => setMatrix(m => ({
        ...m,
        [openRole]: {
          ...m[openRole],
          [mod]: opt
        }
      })),
      className: `h-7 px-2.5 rounded-md text-[11px] font-medium border transition ${v === opt ? `${PERM_CFG[opt].bg} ${PERM_CFG[opt].fg} ${PERM_CFG[opt].border}` : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"} ${openRole === "admin" ? "opacity-60 cursor-not-allowed" : ""}`
    }, PERM_CFG[opt].label))));
  }))))));
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. PartnersPanel v2 — suspended state + better detail
// ══════════════════════════════════════════════════════════════════════════════
const PARTNER_STATUS_CFG = {
  active: {
    label: "Aktív",
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    dot: "bg-emerald-500"
  },
  pending: {
    label: "Meghívott",
    bg: "bg-amber-50",
    fg: "text-amber-700",
    dot: "bg-amber-400"
  },
  suspended: {
    label: "Felfüggesztve",
    bg: "bg-rose-50",
    fg: "text-rose-700",
    dot: "bg-rose-500"
  }
};
const PARTNER_TYPE_TONE2 = {
  manufacturer: "bg-violet-50 text-violet-700",
  cutter: "bg-sky-50 text-sky-700",
  trader: "bg-amber-50 text-amber-700",
  supplier: "bg-teal-50 text-teal-700"
};
function PartnersPanel({
  lang = "hu"
}) {
  const sim = useSim();
  const types = PARTNER_TYPES[lang] || PARTNER_TYPES.hu;
  const typeLabel = p => window.PARTNER_TYPE_LABEL ? window.PARTNER_TYPE_LABEL[p.actorType] || p.actorType : window.actorMeta ? window.actorMeta(p.actorType).l : types[p.type] || p.actorType || "—";
  const partners = (sim.partners || []).map(p => {
    const prof = sim.partnerProfile(p.name);
    const st = sim.partnerStats(p.name);
    return {
      ...p,
      type: p.actorType,
      status: prof.status || "active",
      rating: prof.rating || 0,
      sharedOrders: st.poCount + st.hsTotal,
      contact: p.contact || "—"
    };
  });
  const [cockpitName, setCockpitName] = useStateSx(null);
  const [showInvite, setShowInvite] = useStateSx(false);
  const [filterStatus, setFilterStatus] = useStateSx("all");
  const [inviteEmail, setInviteEmail] = useStateSx("");
  const [inviteType, setInviteType] = useStateSx("supplier");
  const filtered = filterStatus === "all" ? partners : partners.filter(p => p.status === filterStatus);
  const StatusPill2 = ({
    status
  }) => {
    const c = PARTNER_STATUS_CFG[status] || PARTNER_STATUS_CFG.active;
    return /*#__PURE__*/React.createElement("span", {
      className: `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium ${c.bg} ${c.fg}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-1.5 h-1.5 rounded-full ${c.dot}`
    }), c.label);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5"
  }, [["all", "Összes"], ["active", "Aktív"], ["pending", "Meghívott"], ["suspended", "Felfüggesztve"]].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setFilterStatus(k),
    className: `px-2.5 h-7 rounded-md text-[11.5px] font-medium ${filterStatus === k ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`
  }, l, /*#__PURE__*/React.createElement("span", {
    className: `ml-1 text-[10px] tabular-nums ${filterStatus === k ? "text-white/60" : "text-stone-400"}`
  }, k === "all" ? partners.length : partners.filter(p => p.status === k).length)))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: () => setShowInvite(true)
  }, "Partner megh\xEDv\xE1sa")), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[minmax(0,1.8fr)_130px_140px_100px_100px_28px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("div", null, "Partner"), /*#__PURE__*/React.createElement("div", null, "T\xEDpus"), /*#__PURE__*/React.createElement("div", null, "Kapcsolat"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "Rendel\xE9sek"), /*#__PURE__*/React.createElement("div", null, "St\xE1tusz"), /*#__PURE__*/React.createElement("div", null)), filtered.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => setCockpitName(p.name),
    className: "w-full text-left hidden md:grid grid-cols-[minmax(0,1.8fr)_130px_140px_100px_100px_28px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center hover:bg-stone-50/60"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 truncate flex items-center gap-2"
  }, p.name, p.status === "suspended" && /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 12,
    className: "text-rose-500 shrink-0"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] font-mono text-stone-400 truncate"
  }, p.id)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: `text-[10.5px] px-2 py-0.5 rounded-full font-medium ${PARTNER_TYPE_TONE2[p.type] || "bg-stone-100 text-stone-600"}`
  }, typeLabel(p))), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-600 truncate"
  }, p.contact?.split("·")[0]?.trim() || "—"), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] tabular-nums text-right font-medium text-stone-800"
  }, p.sharedOrders), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StatusPill2, {
    status: p.status
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-stone-400"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 13
  })))), /*#__PURE__*/React.createElement("div", {
    className: "md:hidden divide-y divide-stone-100"
  }, filtered.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => setCockpitName(p.name),
    className: "w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-stone-50/60 active:bg-stone-100/60 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[13.5px] font-medium text-stone-900 truncate"
  }, p.name), p.status === "suspended" && /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 12,
    className: "text-rose-500 shrink-0"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-1"
  }, /*#__PURE__*/React.createElement(StatusPill2, {
    status: p.status
  }), /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PARTNER_TYPE_TONE2[p.type] || "bg-stone-100 text-stone-600"}`
  }, typeLabel(p)))), /*#__PURE__*/React.createElement("div", {
    className: "text-right shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-800 tabular-nums"
  }, p.sharedOrders), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "rendel\xE9s")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 15,
    className: "text-stone-300 shrink-0"
  }))))), PARTNER_INVITES.length > 0 && /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-2.5 border-b border-stone-100 text-[11px] font-semibold text-stone-600 uppercase tracking-wide bg-stone-50/40"
  }, "Kimen\u0151 megh\xEDv\xF3k (", PARTNER_INVITES.length, ")"), PARTNER_INVITES.map((inv, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-3 px-5 py-2.5 border-b border-stone-100 last:border-0 text-[12px]"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 13,
    className: "text-stone-400 shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-stone-700 flex-1"
  }, inv.email), /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] px-1.5 py-0.5 rounded font-medium ${PARTNER_TYPE_TONE2[inv.type]}`
  }, types[inv.type]), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-stone-400 text-[10.5px]"
  }, inv.sent), /*#__PURE__*/React.createElement("span", {
    className: `text-[10.5px] px-2 py-0.5 rounded-full font-medium ${inv.state === "pending" ? "bg-amber-50 text-amber-700" : "bg-stone-100 text-stone-500"}`
  }, inv.state === "pending" ? "Függő" : "Lejárt"), /*#__PURE__*/React.createElement("button", {
    className: "text-[10.5px] text-stone-400 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  }))))), cockpitName && window.PartnerCockpit && /*#__PURE__*/React.createElement(window.PartnerCockpit, {
    partnerName: cockpitName,
    onClose: () => setCockpitName(null)
  }), /*#__PURE__*/React.createElement(SlideOver, {
    open: showInvite,
    onClose: () => setShowInvite(false),
    title: "Partner megh\xEDv\xE1sa",
    subtitle: "B2B port\xE1l hozz\xE1f\xE9r\xE9s + API kulcs gener\xE1l\xE1s",
    width: 480,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setShowInvite(false)
    }, "M\xE9gse"), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "send",
      onClick: () => {
        setShowInvite(false);
        window.toast?.("✓ Meghívó elküldve", "success");
      }
    }, "Megh\xEDv\xF3 k\xFCld\xE9se"))
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "E-mail c\xEDm"), /*#__PURE__*/React.createElement(SxInput, {
    value: inviteEmail,
    onChange: setInviteEmail,
    placeholder: "b2b@partner.hu",
    mono: true
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Partner t\xEDpus"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1.5"
  }, Object.entries(types).map(([k, label]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setInviteType(k),
    className: `h-9 rounded-lg text-[12px] border transition ${inviteType === k ? "bg-teal-700 text-white border-teal-700" : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"}`
  }, label)))), /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[11.5px] text-amber-800 flex gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 14,
    className: "shrink-0 mt-0.5"
  }), "API kulcsot gener\xE1lunk a megh\xEDv\xE1skor \u2014 a kulcs csak egyszer l\xE1that\xF3."))));
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. CatalogPanel v2 — CRUD + CSV import + archive
// ══════════════════════════════════════════════════════════════════════════════
const CATALOG_ITEMS_INIT = [{
  id: "c1",
  code: "BK-018-2440",
  name: "Bükk 18mm tábla",
  unit: "tábla",
  cat: "Lemez",
  price: 18500,
  supplier: "Falco Sopron Zrt.",
  active: true
}, {
  id: "c2",
  code: "TL-022-2440",
  name: "Tölgy 22mm tábla",
  unit: "tábla",
  cat: "Lemez",
  price: 31800,
  supplier: "Egger Faipari Kft.",
  active: true
}, {
  id: "c3",
  code: "MDF-019",
  name: "MDF 19mm tábla",
  unit: "tábla",
  cat: "Lemez",
  price: 9600,
  supplier: "Kronospan HU Zrt.",
  active: true
}, {
  id: "c4",
  code: "MDF-016-W",
  name: "MDF 16mm fehér",
  unit: "tábla",
  cat: "Lemez",
  price: 8700,
  supplier: "Kronospan HU Zrt.",
  active: true
}, {
  id: "c5",
  code: "HDF-003",
  name: "HDF 3mm fehér",
  unit: "tábla",
  cat: "Lemez",
  price: 3200,
  supplier: "Egger Faipari Kft.",
  active: true
}, {
  id: "c6",
  code: "EZ-ABS-22-TL",
  "name": "ABS élzáró 22mm tölgy",
  unit: "fm",
  cat: "Élzáró",
  price: 220,
  supplier: "Rehau HU",
  active: true
}, {
  id: "c7",
  code: "VS-BL-CT",
  name: "Blum CLIP top 110°",
  unit: "db",
  cat: "Vasalat",
  price: 1240,
  supplier: "Blum Hungária",
  active: true
}, {
  id: "c8",
  code: "VS-HE-500",
  name: "Hettich fiókcsúszó 500mm",
  unit: "db",
  cat: "Vasalat",
  price: 1180,
  supplier: "Hettich Hungary",
  active: true
}, {
  id: "c9",
  code: "CS-SP-440",
  name: "Spax csavar 4×40",
  unit: "db",
  cat: "Kötszer",
  price: 12,
  supplier: "Würth HU",
  active: true
}, {
  id: "c10",
  code: "TL-040",
  name: "Tölgy 40mm tömör",
  unit: "fm",
  cat: "Tömörfa",
  price: 32400,
  supplier: "Falco Sopron Zrt.",
  active: false
}];
const CATS = ["Összes", "Lemez", "Élzáró", "Vasalat", "Kötszer", "Tömörfa"];
function CatalogPanel() {
  const [items, setItems] = useStateSx(CATALOG_ITEMS_INIT);
  const [editId, setEditId] = useStateSx(null);
  const [showNew, setShowNew] = useStateSx(false);
  const [showImport, setShowImport] = useStateSx(false);
  const [cat, setCat] = useStateSx("Összes");
  const [showArchived, setShowArchived] = useStateSx(false);
  const [q, setQ] = useStateSx("");
  const [form, setForm] = useStateSx({
    code: "",
    name: "",
    unit: "tábla",
    cat: "Lemez",
    price: "",
    supplier: ""
  });
  const setF = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const editItem = items.find(i => i.id === editId);
  const filtered = items.filter(i => {
    if (!showArchived && !i.active) return false;
    if (cat !== "Összes" && i.cat !== cat) return false;
    if (q && !i.name.toLowerCase().includes(q.toLowerCase()) && !i.code.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const doArchive = id => {
    setItems(its => its.map(i => i.id === id ? {
      ...i,
      active: false
    } : i));
    setEditId(null);
    window.toast?.("Anyag archiválva", "info");
  };
  const doRestore = id => {
    setItems(its => its.map(i => i.id === id ? {
      ...i,
      active: true
    } : i));
    window.toast?.("Anyag visszaállítva", "success");
  };
  const doSaveNew = () => {
    const id = "c" + (items.length + 1);
    setItems(its => [{
      id,
      ...form,
      price: Number(form.price) || 0,
      active: true
    }, ...its]);
    setForm({
      code: "",
      name: "",
      unit: "tábla",
      cat: "Lemez",
      price: "",
      supplier: ""
    });
    setShowNew(false);
    window.toast?.("✓ Anyag hozzáadva", "success");
  };
  const doSaveEdit = () => {
    setItems(its => its.map(i => i.id === editId ? {
      ...i,
      ...form,
      price: Number(form.price) || i.price
    } : i));
    setEditId(null);
    window.toast?.("✓ Anyag frissítve", "success");
  };
  const openEdit = item => {
    setForm({
      code: item.code,
      name: item.name,
      unit: item.unit,
      cat: item.cat,
      price: String(item.price),
      supplier: item.supplier
    });
    setEditId(item.id);
  };
  const ItemForm = ({
    onSave,
    onCancel,
    saveLabel
  }) => /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "K\xF3d"), /*#__PURE__*/React.createElement(SxInput, {
    value: form.code,
    onChange: v => setF("code", v),
    placeholder: "pl. BK-018-2440",
    mono: true
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "N\xE9v"), /*#__PURE__*/React.createElement(SxInput, {
    value: form.name,
    onChange: v => setF("name", v),
    placeholder: "pl. B\xFCkk 18mm t\xE1bla"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Kateg\xF3ria"), /*#__PURE__*/React.createElement("select", {
    value: form.cat,
    onChange: e => setF("cat", e.target.value),
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white"
  }, ["Lemez", "Élzáró", "Vasalat", "Kötszer", "Tömörfa"].map(c => /*#__PURE__*/React.createElement("option", {
    key: c
  }, c)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Egys\xE9g"), /*#__PURE__*/React.createElement("select", {
    value: form.unit,
    onChange: e => setF("unit", e.target.value),
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white"
  }, ["tábla", "db", "fm", "m²", "kg", "csomag"].map(u => /*#__PURE__*/React.createElement("option", {
    key: u
  }, u)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Egys\xE9g\xE1r (Ft)"), /*#__PURE__*/React.createElement(SxInput, {
    value: form.price,
    onChange: v => setF("price", v),
    placeholder: "9600",
    mono: true
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Sz\xE1ll\xEDt\xF3"), /*#__PURE__*/React.createElement(SxInput, {
    value: form.supplier,
    onChange: v => setF("supplier", v),
    placeholder: "Sz\xE1ll\xEDt\xF3 neve"
  }))));
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5"
  }, CATS.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => setCat(c),
    className: `px-2.5 h-7 rounded-md text-[11.5px] font-medium ${cat === c ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`
  }, c))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-3 h-8 flex-1 min-w-[150px] sm:flex-none sm:w-[220px] rounded-lg bg-white border border-stone-200 text-stone-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 13
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "K\xF3d, n\xE9v\u2026",
    className: "bg-transparent outline-none text-[11.5px] flex-1 min-w-0 placeholder:text-stone-400"
  })), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-1.5 text-[11.5px] text-stone-600 cursor-pointer ml-1"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: showArchived,
    onChange: () => setShowArchived(v => !v),
    className: "rounded"
  }), "Archiv\xE1ltak"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement(GhostBtn, {
    icon: "download",
    onClick: () => setShowImport(true)
  }, "Import CSV"), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: () => setShowNew(true)
  }, "\xDAj anyag")), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:grid grid-cols-[90px_minmax(0,1.8fr)_80px_100px_100px_minmax(0,1fr)_80px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("div", null, "K\xF3d"), /*#__PURE__*/React.createElement("div", null, "N\xE9v"), /*#__PURE__*/React.createElement("div", null, "Kat."), /*#__PURE__*/React.createElement("div", null, "Egys\xE9g"), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, "\xC1r / egys\xE9g"), /*#__PURE__*/React.createElement("div", null, "Sz\xE1ll\xEDt\xF3"), /*#__PURE__*/React.createElement("div", null)), filtered.map(item => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    className: `hidden md:grid grid-cols-[90px_minmax(0,1.8fr)_80px_100px_100px_minmax(0,1fr)_80px] gap-3 px-5 py-3 border-b border-stone-100 last:border-0 items-center ${!item.active ? "opacity-50" : "hover:bg-stone-50/60"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-mono text-stone-500 truncate"
  }, item.code), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 truncate"
  }, item.name), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium"
  }, item.cat)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-600"
  }, item.unit), /*#__PURE__*/React.createElement("div", {
    className: "text-[12px] tabular-nums text-right font-medium text-stone-800"
  }, fmtHUF(item.price)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-600 truncate"
  }, item.supplier), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 justify-end"
  }, item.active ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: () => openEdit(item),
    className: "w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 13
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => doArchive(item.id),
    className: "w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 13
  }))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => doRestore(item.id),
    className: "text-[10px] px-2 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
  }, "Vissza")))), /*#__PURE__*/React.createElement("div", {
    className: "md:hidden divide-y divide-stone-100"
  }, filtered.map(item => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    className: `px-4 py-3.5 flex items-center gap-3 ${!item.active ? "opacity-50" : ""}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[13.5px] font-medium text-stone-900 truncate"
  }, item.name), /*#__PURE__*/React.createElement("span", {
    className: "shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium"
  }, item.cat)), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-mono text-stone-500 mt-0.5 truncate"
  }, item.code, " \xB7 ", item.supplier)), /*#__PURE__*/React.createElement("div", {
    className: "text-right shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-800 tabular-nums"
  }, fmtHUF(item.price)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-stone-400"
  }, "/ ", item.unit)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 shrink-0"
  }, item.active ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: () => openEdit(item),
    className: "w-8 h-8 grid place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => doArchive(item.id),
    className: "w-8 h-8 grid place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => doRestore(item.id),
    className: "text-[10.5px] px-2 py-1.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
  }, "Vissza"))))), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-8 text-center text-[12px] text-stone-400"
  }, "Nincs tal\xE1lat")), /*#__PURE__*/React.createElement(SlideOver, {
    open: showNew,
    onClose: () => setShowNew(false),
    title: "\xDAj anyag",
    width: 500,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setShowNew(false)
    }, "M\xE9gse"), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "check",
      onClick: doSaveNew
    }, "Hozz\xE1ad\xE1s"))
  }, /*#__PURE__*/React.createElement(ItemForm, {
    onSave: doSaveNew,
    onCancel: () => setShowNew(false),
    saveLabel: "Hozz\xE1ad\xE1s"
  })), /*#__PURE__*/React.createElement(SlideOver, {
    open: !!editItem,
    onClose: () => setEditId(null),
    title: "Anyag szerkeszt\xE9se",
    subtitle: editItem?.code,
    width: 500,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => {
        doArchive(editId);
      }
    }, "Archiv\xE1l\xE1s"), /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setEditId(null)
    }, "M\xE9gse"), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "check",
      onClick: doSaveEdit
    }, "Ment\xE9s"))
  }, editItem && /*#__PURE__*/React.createElement(ItemForm, {
    onSave: doSaveEdit,
    onCancel: () => setEditId(null),
    saveLabel: "Ment\xE9s"
  })), /*#__PURE__*/React.createElement(SlideOver, {
    open: showImport,
    onClose: () => setShowImport(false),
    title: "T\xF6meges import",
    subtitle: "CSV vagy Excel f\xE1jl felt\xF6lt\xE9se",
    width: 500,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setShowImport(false)
    }, "M\xE9gse"), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "download",
      onClick: () => {
        setShowImport(false);
        window.toast?.("✓ 12 sor importálva", "success");
      }
    }, "Import\xE1l\xE1s"))
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-2 border-dashed border-stone-200 rounded-xl px-5 py-10 text-center hover:border-teal-400 hover:bg-teal-50/20 transition cursor-pointer"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "download",
    size: 28,
    className: "text-stone-300 mx-auto mb-3"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-medium text-stone-700"
  }, "H\xFAzd ide a f\xE1jlt"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-1"
  }, "vagy ", /*#__PURE__*/React.createElement("span", {
    className: "text-teal-700 font-medium underline"
  }, "tall\xF3zz")), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-2 font-mono"
  }, "CSV \xB7 XLSX \xB7 max 5 MB")), /*#__PURE__*/React.createElement(Card, {
    className: "p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 font-medium mb-2"
  }, "Elv\xE1rt fejl\xE9c-sorrend"), /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-[11px] text-teal-700 bg-teal-50/50 rounded px-3 py-2"
  }, "k\xF3d, n\xE9v, kateg\xF3ria, egys\xE9g, \xE1r_ft, sz\xE1ll\xEDt\xF3")), /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[11.5px] text-amber-800 flex gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 14,
    className: "shrink-0 mt-0.5"
  }), "Megl\xE9v\u0151 k\xF3dokhoz az adatok friss\xFClnek. \xDAj k\xF3dok hozz\xE1ad\xF3dnak. Archiv\xE1l\xE1s nem lehets\xE9ges importon kereszt\xFCl."))));
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. StageChainEditor v2 — color + SLA + role + improved chain viz
// ══════════════════════════════════════════════════════════════════════════════
const STAGE_COLORS_PALETTE = ["#0d9488", "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#f97316", "#ec4899", "#6366f1", "#ef4444", "#84cc16"];
const STAGE_ROLES_OPTIONS = ["—", "admin", "manager", "operator"];
function StageChainEditor({
  t
}) {
  const initChain = STAGES.map((s, i) => ({
    ...s,
    color: STAGE_COLORS_PALETTE[i % STAGE_COLORS_PALETTE.length],
    sla: [8, 24, 4, 2, 8, 16, 4][i] || 8,
    role: ["manager", "operator", "operator", "operator", "operator", "operator", "manager"][i] || "operator"
  }));
  const [chain, setChain] = useStateSx(initChain);
  const [drag, setDrag] = useStateSx(null);
  const [editIdx, setEditIdx] = useStateSx(null);
  const [editForm, setEditForm] = useStateSx(null);
  const move = (from, to) => {
    if (from === to) return;
    setChain(c => {
      const n = [...c];
      const [it] = n.splice(from, 1);
      n.splice(to, 0, it);
      return n;
    });
  };
  const remove = i => setChain(c => c.filter((_, idx) => idx !== i));
  const add = () => setChain(c => [...c, {
    key: `custom-${c.length}`,
    hu: "Új lépés",
    en: "New stage",
    optional: false,
    color: STAGE_COLORS_PALETTE[c.length % STAGE_COLORS_PALETTE.length],
    sla: 8,
    role: "operator"
  }]);
  const openEdit = i => {
    setEditForm({
      ...chain[i]
    });
    setEditIdx(i);
  };
  const saveEdit = () => {
    setChain(c => c.map((s, i) => i === editIdx ? {
      ...editForm
    } : s));
    setEditIdx(null);
  };
  const setEF = (k, v) => setEditForm(f => ({
    ...f,
    [k]: v
  }));
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-semibold text-stone-900"
  }, "Gy\xE1rt\xE1si folyamat l\xE1nc"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-stone-500"
  }, chain.length, " l\xE9p\xE9s \xB7 ", chain.filter(s => !s.optional).length, " k\xF6telez\u0151 \xB7 ", chain.filter(s => s.optional).length, " opcion\xE1lis")), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "plus",
    onClick: add
  }, "L\xE9p\xE9s hozz\xE1ad\xE1sa")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-1 flex-wrap pb-2 overflow-x-auto"
  }, chain.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.key,
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: `px-3 py-2 rounded-xl text-[11.5px] font-semibold text-white shadow-sm cursor-pointer hover:brightness-110 transition ${s.optional ? "opacity-60" : ""}`,
    style: {
      background: s.color
    },
    onClick: () => openEdit(i)
  }, s.hu, s.optional && /*#__PURE__*/React.createElement("span", {
    className: "text-white/60 font-normal text-[9.5px] ml-1"
  }, "\xB7 opt")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mt-1 text-[9.5px] text-stone-500 font-mono"
  }, /*#__PURE__*/React.createElement("span", null, s.sla, "h SLA"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, s.role))), i < chain.length - 1 && /*#__PURE__*/React.createElement("svg", {
    width: "24",
    height: "20",
    viewBox: "0 0 24 20",
    className: "shrink-0 mt-1"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 10h16M16 6l4 4-4 4",
    stroke: "#d6d3d1",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  })))))), /*#__PURE__*/React.createElement(Card, {
    className: "p-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-[560px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[28px_28px_1fr_80px_90px_100px_56px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wide text-stone-500 border-b border-stone-200/80 bg-stone-50/40"
  }, /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", null, "L\xE9p\xE9s neve"), /*#__PURE__*/React.createElement("div", null, "SLA (h)"), /*#__PURE__*/React.createElement("div", null, "Szerepk\xF6r"), /*#__PURE__*/React.createElement("div", null, "Opcion\xE1lis"), /*#__PURE__*/React.createElement("div", null)), chain.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.key,
    draggable: true,
    onDragStart: () => setDrag(i),
    onDragOver: e => e.preventDefault(),
    onDrop: () => {
      if (drag !== null) move(drag, i);
      setDrag(null);
    },
    onDragEnd: () => setDrag(null),
    className: `grid grid-cols-[28px_28px_1fr_80px_90px_100px_56px] gap-3 px-5 py-2.5 border-b border-stone-100 last:border-0 items-center transition ${drag === i ? "bg-teal-50/60 opacity-70" : "hover:bg-stone-50/40"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "cursor-grab text-stone-400 active:cursor-grabbing"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "5",
    r: "1.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "12",
    r: "1.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "19",
    r: "1.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "5",
    r: "1.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "12",
    r: "1.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "19",
    r: "1.5"
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => openEdit(i),
    className: "w-6 h-6 rounded-md border-2 border-white shadow-sm hover:scale-110 transition",
    style: {
      background: s.color
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[12.5px] font-medium text-stone-900 truncate"
  }, s.hu), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] font-mono text-stone-600 tabular-nums"
  }, s.sla, "h"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium"
  }, s.role)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setChain(c => c.map((x, idx) => idx === i ? {
      ...x,
      optional: !x.optional
    } : x)),
    className: `h-6 w-11 rounded-full relative transition ${s.optional ? "bg-teal-600" : "bg-stone-200"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${s.optional ? "left-[22px]" : "left-0.5"}`
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => remove(i),
    className: "w-7 h-7 grid place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 justify-end"
  }, /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: () => setChain(initChain)
  }, "Vissza\xE1ll\xEDt\xE1s"), /*#__PURE__*/React.createElement(PrimaryBtn, {
    icon: "check",
    onClick: () => window.toast?.("✓ StageChain mentve", "success")
  }, "Ment\xE9s")), /*#__PURE__*/React.createElement(SlideOver, {
    open: editIdx !== null,
    onClose: () => setEditIdx(null),
    title: "L\xE9p\xE9s szerkeszt\xE9se",
    subtitle: editForm?.hu,
    width: 440,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GhostBtn, {
      onClick: () => setEditIdx(null)
    }, "M\xE9gse"), /*#__PURE__*/React.createElement(PrimaryBtn, {
      icon: "check",
      onClick: saveEdit
    }, "Ment\xE9s"))
  }, editForm && /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "N\xE9v (HU)"), /*#__PURE__*/React.createElement(SxInput, {
    value: editForm.hu,
    onChange: v => setEF("hu", v)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "N\xE9v (EN)"), /*#__PURE__*/React.createElement(SxInput, {
    value: editForm.en,
    onChange: v => setEF("en", v)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Sz\xEDn"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 flex-wrap"
  }, STAGE_COLORS_PALETTE.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => setEF("color", c),
    className: `w-8 h-8 rounded-lg border-2 transition hover:scale-110 ${editForm.color === c ? "border-stone-900 scale-110" : "border-transparent"}`,
    style: {
      background: c
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "SLA (\xF3r\xE1ban)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editForm.sla,
    min: 1,
    onChange: e => setEF("sla", Number(e.target.value)),
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] font-mono outline-none focus:border-teal-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SxLabel, null, "Felel\u0151s szerepk\xF6r"), /*#__PURE__*/React.createElement("select", {
    value: editForm.role,
    onChange: e => setEF("role", e.target.value),
    className: "w-full h-9 px-3 rounded-lg border border-stone-200 text-[12.5px] bg-white"
  }, STAGE_ROLES_OPTIONS.map(r => /*#__PURE__*/React.createElement("option", {
    key: r
  }, r))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] text-stone-700"
  }, "Opcion\xE1lis l\xE9p\xE9s"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEF("optional", !editForm.optional),
    className: `h-6 w-11 rounded-full relative transition ${editForm.optional ? "bg-teal-600" : "bg-stone-200"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${editForm.optional ? "left-[22px]" : "left-0.5"}`
  }))), /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-stone-200 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 py-3 rounded-xl text-center text-[12px] font-semibold text-white",
    style: {
      background: editForm.color
    }
  }, editForm.hu), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-500 text-center w-24"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-mono"
  }, editForm.sla, "h SLA"), /*#__PURE__*/React.createElement("div", null, editForm.role), editForm.optional && /*#__PURE__*/React.createElement("div", {
    className: "text-amber-600"
  }, "opcion\xE1lis"))))));
}
Object.assign(window, {
  RolesPanel,
  PartnersPanel,
  CatalogPanel,
  StageChainEditor,
  SxLabel,
  SxInput
});
})();
