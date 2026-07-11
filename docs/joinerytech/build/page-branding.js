/* AUTO-GENERATED from page-branding.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────────────
// page-branding.jsx — MÁRKA / ARCULAT (Beállítások → Márka)
//
//   Küldetés · vízió · stratégiai célok · hangnem · márka-hang
//   Akcentus szín · logó · márka-színek szerepkörrel · betűk
//   Célközönség / Persona-k
//   window.BrandingPanel — page-rest.jsx mountolja
// ──────────────────────────────────────────────────────────────────────────
const useStateBrand = React.useState;
function isDark(hex) {
  if (!hex || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}
const COLOR_ROLES = [{
  key: "primary",
  label: "Elsődleges",
  badge: "bg-blue-100 text-blue-700"
}, {
  key: "accent",
  label: "Akcentus",
  badge: "bg-violet-100 text-violet-700"
}, {
  key: "neutral",
  label: "Neutrális",
  badge: "bg-stone-100 text-stone-600"
}, {
  key: "support",
  label: "Támogató",
  badge: "bg-amber-100 text-amber-700"
}];
const roleMeta = key => COLOR_ROLES.find(r => r.key === key) || null;

// Persona-kártya avatar-szín (hash alapján)
const PERSONA_COLORS = ["bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700"];
function personaColor(id) {
  let h = 0;
  for (let i = 0; i < (id || "").length; i++) h = h * 31 + id.charCodeAt(i) & 0xffff;
  return PERSONA_COLORS[h % PERSONA_COLORS.length];
}

// ── Persona szerkesztő (inline) ──
function PersonaEditor({
  p,
  onSave,
  onCancel
}) {
  const [form, setForm] = useStateBrand({
    ...p
  });
  const f = k => e => setForm(prev => ({
    ...prev,
    [k]: e.target.value
  }));
  const inp = "w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-[12px] outline-none focus:border-indigo-400 bg-white";
  const ta = inp + " resize-none leading-relaxed";
  const lbl = "text-[10px] uppercase tracking-wide text-stone-500 mb-0.5 block";
  return /*#__PURE__*/React.createElement("div", {
    className: "border border-indigo-200 rounded-xl p-4 bg-indigo-50/40 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-3 gap-3"
  }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", {
    className: lbl
  }, "Persona neve"), /*#__PURE__*/React.createElement("input", {
    value: form.name,
    onChange: f("name"),
    placeholder: "pl. Bels\u0151\xE9p\xEDt\xE9sz Bernadett",
    className: inp
  })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", {
    className: lbl
  }, "Szerepk\xF6r / foglalkoz\xE1s"), /*#__PURE__*/React.createElement("input", {
    value: form.role,
    onChange: f("role"),
    placeholder: "pl. Szabadfoglalkoz\xE1s\xFA bels\u0151\xE9p\xEDt\xE9sz",
    className: inp
  })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", {
    className: lbl
  }, "Koroszt\xE1ly"), /*#__PURE__*/React.createElement("input", {
    value: form.ageRange,
    onChange: f("ageRange"),
    placeholder: "pl. 30\u201345",
    className: inp
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", {
    className: lbl
  }, "C\xE9lok / motiv\xE1ci\xF3k"), /*#__PURE__*/React.createElement("textarea", {
    value: form.goals,
    onChange: f("goals"),
    rows: 3,
    placeholder: "Mit szeretne el\xE9rni? Mi\xE9rt keres minket?",
    className: ta
  })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", {
    className: lbl
  }, "F\xE1jdalompontok / akad\xE1lyok"), /*#__PURE__*/React.createElement("textarea", {
    value: form.pains,
    onChange: f("pains"),
    rows: 3,
    placeholder: "Mi zavarja? Mi miatt hagyna el minket?",
    className: ta
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", {
    className: lbl
  }, "Prefer\xE1lt csatorna"), /*#__PURE__*/React.createElement("input", {
    value: form.channel,
    onChange: f("channel"),
    placeholder: "pl. Email, telefon, aj\xE1nl\xE1s, Instagram",
    className: inp
  })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", {
    className: lbl
  }, "Jellemz\u0151 id\xE9zet"), /*#__PURE__*/React.createElement("input", {
    value: form.quote,
    onChange: f("quote"),
    placeholder: "\"Ha egyszer megb\xEDzom benne, h\u0171s\xE9ges \xFCgyf\xE9l leszek.\"",
    className: inp
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 pt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onSave(form),
    className: "h-8 px-4 rounded-lg bg-indigo-600 text-white text-[11.5px] font-medium hover:bg-indigo-700"
  }, "Ment\xE9s"), /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    className: "h-8 px-3 rounded-lg border border-stone-200 text-[11.5px] text-stone-500 hover:border-stone-300 bg-white"
  }, "M\xE9gsem")));
}

// ── Persona megjelenítő kártya ──
function PersonaCard({
  p,
  onEdit,
  onRemove
}) {
  const av = personaColor(p.id);
  const initials = (p.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return /*#__PURE__*/React.createElement("div", {
    className: "border border-stone-200 rounded-xl p-4 bg-white hover:border-stone-300 transition group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${av}`
  }, initials), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-800 leading-tight truncate"
  }, p.name || /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 italic"
  }, "N\xE9vtelen persona")), p.role && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 truncate"
  }, p.role), p.ageRange && /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400"
  }, p.ageRange, " \xE9v")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onEdit,
    className: "w-7 h-7 grid place-items-center rounded-lg border border-stone-200 text-stone-400 hover:text-indigo-600 hover:border-indigo-300 bg-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pencil",
    size: 12
  })), /*#__PURE__*/React.createElement("button", {
    onClick: onRemove,
    className: "w-7 h-7 grid place-items-center rounded-lg border border-stone-200 text-stone-400 hover:text-rose-600 hover:border-rose-200 bg-white"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash",
    size: 12
  })))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 text-[11.5px]"
  }, p.goals && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "shrink-0 w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center mt-0.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 9
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 text-[10px] uppercase tracking-wide block"
  }, "C\xE9lok"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-700"
  }, p.goals))), p.pains && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "shrink-0 w-4 h-4 rounded-full bg-rose-100 text-rose-500 grid place-items-center mt-0.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert-circle",
    size: 9
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 text-[10px] uppercase tracking-wide block"
  }, "F\xE1jdalompontok"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-700"
  }, p.pains))), p.channel && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "shrink-0 w-4 h-4 rounded-full bg-blue-100 text-blue-500 grid place-items-center mt-0.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 9
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-stone-400 text-[10px] uppercase tracking-wide block"
  }, "Csatorna"), /*#__PURE__*/React.createElement("span", {
    className: "text-stone-700"
  }, p.channel))), p.quote && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-600 italic leading-relaxed"
  }, p.quote)));
}

// ── Fő panel ──
function BrandingPanel() {
  const sim = useSim();
  const b = window.sim.branding ? window.sim.branding() : {
    mission: "",
    vision: "",
    goal: "",
    accent: "",
    accentSecondary: "",
    tone: "",
    voice: "",
    logoLabel: "",
    colors: [],
    fonts: [],
    items: [],
    personas: []
  };
  const setB = patch => window.sim.setBranding(patch);
  const TONES = [["közvetlen", "Tegező / közvetlen"], ["hivatalos", "Magázó / hivatalos"], ["szakmai", "Szakmai / tömör"], ["barati", "Baráti / meleg"]];
  const ta = "mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400 resize-none leading-relaxed";
  const inp = "h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-[12px] outline-none focus:border-indigo-400";
  const chip = active => `h-7 px-2.5 rounded-lg text-[11px] font-medium border transition ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-stone-500 border-stone-200 hover:border-indigo-300"}`;
  const Card = window.Card || (({
    className,
    children
  }) => /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-stone-200 rounded-xl " + (className || "")
  }, children));
  const SectionTitle = ({
    icon,
    title,
    sub
  }) => /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-semibold text-stone-800 flex items-center gap-1.5"
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 14,
    className: "text-stone-400"
  }), " ", title), sub && /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-stone-500 mt-0.5"
  }, sub));

  // ── Márka-színek state ──
  const [newColor, setNewColor] = useStateBrand("#2A6FDB");
  const [newColorLbl, setNewColorLbl] = useStateBrand("");
  const [newColorRole, setNewColorRole] = useStateBrand("primary");
  const addColor = () => {
    setB({
      colors: [...(b.colors || []), {
        hex: newColor,
        label: newColorLbl.trim() || newColor,
        role: newColorRole
      }]
    });
    setNewColorLbl("");
    setNewColorRole("primary");
  };
  const removeColor = i => setB({
    colors: (b.colors || []).filter((_, idx) => idx !== i)
  });
  const setColorRole = (i, role) => setB({
    colors: (b.colors || []).map((c, idx) => idx === i ? {
      ...c,
      role
    } : c)
  });

  // ── Betűk state ──
  const [newFont, setNewFont] = useStateBrand("");
  const [newFontRole, setNewFontRole] = useStateBrand("");
  const addFont = () => {
    if (!newFont.trim()) return;
    setB({
      fonts: [...(b.fonts || []), {
        name: newFont.trim(),
        role: newFontRole.trim() || "Szöveg"
      }]
    });
    setNewFont("");
    setNewFontRole("");
  };
  const removeFont = i => setB({
    fonts: (b.fonts || []).filter((_, idx) => idx !== i)
  });

  // ── Persona state ──
  const [editingId, setEditingId] = useStateBrand(null); // null | "new" | id
  const [newPersona, setNewPersona] = useStateBrand(false);
  const personas = b.personas || [];
  const handleSavePersona = form => {
    if (editingId === "new") {
      window.sim.addPersona(form);
    } else {
      window.sim.updatePersona(editingId, form);
    }
    setEditingId(null);
    setNewPersona(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 max-w-[860px]"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "p-5"
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "compass",
    title: "Strat\xE9gia & identit\xE1s",
    sub: "A c\xE9g k\xFCldet\xE9se, v\xEDzi\xF3ja \xE9s strat\xE9giai c\xE9ljai \u2014 az AI-kommunik\xE1ci\xF3 alapja."
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 mb-0.5 block"
  }, "K\xFCldet\xE9s"), /*#__PURE__*/React.createElement("textarea", {
    defaultValue: b.mission || "",
    onBlur: e => setB({
      mission: e.target.value
    }),
    rows: 3,
    placeholder: "Mi\xE9rt l\xE9tez\xFCnk?",
    className: ta
  })), /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 mb-0.5 block"
  }, "V\xEDzi\xF3"), /*#__PURE__*/React.createElement("textarea", {
    defaultValue: b.vision || "",
    onBlur: e => setB({
      vision: e.target.value
    }),
    rows: 3,
    placeholder: "Hov\xE1 tartunk 5 \xE9ven bel\xFCl?",
    className: ta
  })), /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 mb-0.5 block"
  }, "Strat\xE9giai c\xE9lok"), /*#__PURE__*/React.createElement("textarea", {
    defaultValue: b.goal || "",
    onBlur: e => setB({
      goal: e.target.value
    }),
    rows: 3,
    placeholder: "▸ 30% export 3 éven belül\n▸ ISO 9001\n▸ webshop-forgalom ×2",
    className: ta
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 mb-1.5"
  }, "Kommunik\xE1ci\xF3 hangneme"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, TONES.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setB({
      tone: b.tone === k ? "" : k
    }),
    className: chip(b.tone === k)
  }, l)))), /*#__PURE__*/React.createElement("label", {
    className: "block mt-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500"
  }, "M\xE1rka-hang / \xFCzenet"), /*#__PURE__*/React.createElement("textarea", {
    defaultValue: b.voice || "",
    onBlur: e => setB({
      voice: e.target.value
    }),
    rows: 2,
    placeholder: "Hogyan sz\xF3lalunk meg? pl. szak\xE9rt\u0151, de k\xF6zvetlen; ker\xFClj\xFCk a marketing-sz\xF6veget\u2026",
    className: ta
  }))), /*#__PURE__*/React.createElement(Card, {
    className: "p-5"
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "palette",
    title: "Vizu\xE1lis eszk\xF6z\xF6k",
    sub: "Log\xF3, akcentus sz\xEDn, m\xE1rka-sz\xEDnek szerepk\xF6rrel, bet\u0171t\xEDpusok."
  }), /*#__PURE__*/React.createElement("div", {
    className: "mb-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 mb-1.5"
  }, "Log\xF3"), b.logoLabel ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-3 h-10 rounded-lg border border-stone-200 bg-stone-50/60 w-fit"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "image",
    size: 14,
    className: "text-stone-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] text-stone-700 font-mono"
  }, b.logoLabel), /*#__PURE__*/React.createElement("button", {
    onClick: () => setB({
      logoLabel: ""
    }),
    className: "w-7 h-7 grid place-items-center rounded-md text-stone-300 hover:bg-rose-50 hover:text-rose-600 ml-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 12
  }))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const v = prompt("Logó-fájl neve:", "ceglogo.svg");
      if (v) setB({
        logoLabel: v
      });
    },
    className: "flex items-center gap-2 px-3 h-10 w-60 rounded-lg border border-dashed border-stone-300 text-[12px] text-stone-500 hover:border-indigo-300 hover:text-indigo-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), " Log\xF3 megad\xE1sa")), /*#__PURE__*/React.createElement("div", {
    className: "mb-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 mb-2 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "zap",
    size: 11,
    className: "text-violet-500"
  }), " Akcentus sz\xEDn", /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 normal-case tracking-normal"
  }, "(els\u0151dleges UI-sz\xEDn \u2014 gombok, linkek, kiemel\xE9sek)")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-4"
  }, [{
    key: "accent",
    label: "Elsődleges",
    default: "#2A6FDB"
  }, {
    key: "accentSecondary",
    label: "Másodlagos",
    default: "#7C3AED"
  }].map(({
    key,
    label,
    default: def
  }) => /*#__PURE__*/React.createElement("div", {
    key: key,
    className: "flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 uppercase tracking-wide"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "color",
    value: b[key] || def,
    onChange: e => setB({
      [key]: e.target.value
    }),
    className: "w-10 h-10 rounded-lg border border-stone-200 cursor-pointer p-0.5 bg-white"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-0.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-mono text-stone-600"
  }, b[key] || def), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex px-2 h-5 rounded text-[10px] font-medium items-center",
    style: {
      background: b[key] || def,
      color: isDark(b[key] || def) ? "#fff" : "#1c1917"
    }
  }, label)), b[key] && /*#__PURE__*/React.createElement("button", {
    onClick: () => setB({
      [key]: ""
    }),
    className: "w-5 h-5 grid place-items-center rounded text-stone-300 hover:text-rose-500"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 10
  }))))), (b.accent || b.accentSecondary) && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1 justify-end"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-stone-400 uppercase tracking-wide"
  }, "El\u0151n\xE9zet"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1 items-center h-10"
  }, [b.accent, b.accentSecondary].filter(Boolean).map((hex, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "w-10 h-10 rounded-lg border border-stone-200 shadow-sm",
    style: {
      background: hex
    }
  })), (b.colors || []).filter(c => c.role === "neutral").slice(0, 1).map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "w-10 h-10 rounded-lg border border-stone-200",
    style: {
      background: c.hex
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 rounded-lg border border-stone-200 bg-white"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "mb-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 mb-2"
  }, "M\xE1rka-sz\xEDnek"), (b.colors || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 mb-3"
  }, (b.colors || []).map((c, i) => {
    const rm = roleMeta(c.role);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "group flex items-center gap-2 pl-1.5 pr-1 h-9 rounded-lg border border-stone-200 bg-white"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-6 h-6 rounded-md border border-stone-200 shrink-0",
      style: {
        background: c.hex
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[11.5px] text-stone-700 font-medium"
    }, c.label), rm && /*#__PURE__*/React.createElement("span", {
      className: `text-[10px] px-1.5 py-0.5 rounded font-medium ${rm.badge}`
    }, rm.label), /*#__PURE__*/React.createElement("select", {
      value: c.role || "",
      onChange: e => setColorRole(i, e.target.value),
      className: "h-6 px-1 rounded border border-stone-200 text-[10px] text-stone-500 bg-white outline-none cursor-pointer hover:border-indigo-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u2014 szerep \u2014"), COLOR_ROLES.map(r => /*#__PURE__*/React.createElement("option", {
      key: r.key,
      value: r.key
    }, r.label))), /*#__PURE__*/React.createElement("button", {
      onClick: () => removeColor(i),
      className: "w-5 h-5 grid place-items-center rounded text-stone-300 hover:text-rose-600"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 10
    })));
  })), (b.colors || []).length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-stone-400 mb-2"
  }, "M\xE9g nincs m\xE1rka-sz\xEDn."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("input", {
    type: "color",
    value: newColor,
    onChange: e => setNewColor(e.target.value),
    className: "w-9 h-9 rounded-lg border border-stone-200 bg-white cursor-pointer p-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("input", {
    value: newColorLbl,
    onChange: e => setNewColorLbl(e.target.value),
    placeholder: "sz\xEDn neve",
    onKeyDown: e => e.key === "Enter" && addColor(),
    className: `flex-1 min-w-[100px] ${inp}`
  }), /*#__PURE__*/React.createElement("select", {
    value: newColorRole,
    onChange: e => setNewColorRole(e.target.value),
    className: `w-32 ${inp} cursor-pointer`
  }, COLOR_ROLES.map(r => /*#__PURE__*/React.createElement("option", {
    key: r.key,
    value: r.key
  }, r.label))), /*#__PURE__*/React.createElement("button", {
    onClick: addColor,
    className: "h-9 px-3 rounded-lg bg-indigo-600 text-white text-[11.5px] font-medium hover:bg-indigo-700 shrink-0 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), " Sz\xEDn"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] uppercase tracking-wide text-stone-500 mb-1.5"
  }, "Bet\u0171t\xEDpusok"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mb-2"
  }, (b.fonts || []).map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex items-center gap-2 px-3 h-9 rounded-lg border border-stone-200 bg-white"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12px] font-medium text-stone-800 flex-1"
  }, f.name), /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-stone-400 px-2 py-0.5 rounded bg-stone-50 border border-stone-200"
  }, f.role), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeFont(i),
    className: "w-6 h-6 grid place-items-center rounded text-stone-300 hover:text-rose-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 11
  })))), (b.fonts || []).length === 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-stone-400"
  }, "M\xE9g nincs bet\u0171t\xEDpus.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    value: newFont,
    onChange: e => setNewFont(e.target.value),
    placeholder: "bet\u0171t\xEDpus neve",
    onKeyDown: e => e.key === "Enter" && addFont(),
    className: `flex-1 ${inp}`
  }), /*#__PURE__*/React.createElement("input", {
    value: newFontRole,
    onChange: e => setNewFontRole(e.target.value),
    placeholder: "szerep (C\xEDmsor / Sz\xF6veg)",
    className: `w-36 ${inp}`
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addFont,
    className: "h-9 px-3 rounded-lg bg-indigo-600 text-white text-[11.5px] font-medium hover:bg-indigo-700 shrink-0 inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), " Bet\u0171")))), /*#__PURE__*/React.createElement(Card, {
    className: "p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between mb-1"
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "users",
    title: "C\xE9lk\xF6z\xF6ns\xE9g \u2014 Persona-k",
    sub: "Kiknek dolgozunk? Egy-egy persona le\xEDrja az ide\xE1lis \xFCgyfelet: c\xE9ljait, f\xE1jdalompontjait, csatorn\xE1j\xE1t."
  }), !newPersona && editingId === null && /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditingId("new"),
    className: "shrink-0 h-8 px-3 rounded-lg bg-indigo-600 text-white text-[11.5px] font-medium hover:bg-indigo-700 inline-flex items-center gap-1 mt-0.5"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), " \xDAj persona")), editingId === "new" && /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement(PersonaEditor, {
    p: {
      name: "",
      role: "",
      ageRange: "",
      goals: "",
      pains: "",
      channel: "",
      quote: ""
    },
    onSave: handleSavePersona,
    onCancel: () => setEditingId(null)
  })), personas.length === 0 && editingId !== "new" && /*#__PURE__*/React.createElement("div", {
    className: "text-center py-10 text-stone-400"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "users",
    size: 28,
    className: "mx-auto mb-2 text-stone-300"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-medium text-stone-500 mb-1"
  }, "M\xE9g nincs persona defini\xE1lva"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px]"
  }, "Adj hozz\xE1 legal\xE1bb 1\u20133 persona-t, hogy a csapat tudja, kiket c\xE9loz a kommunik\xE1ci\xF3.")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, personas.map(p => editingId === p.id ? /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "sm:col-span-2"
  }, /*#__PURE__*/React.createElement(PersonaEditor, {
    p: p,
    onSave: handleSavePersona,
    onCancel: () => setEditingId(null)
  })) : /*#__PURE__*/React.createElement(PersonaCard, {
    key: p.id,
    p: p,
    onEdit: () => setEditingId(p.id),
    onRemove: () => {
      if (confirm(`Törlöd a "${p.name}" persona-t?`)) window.sim.removePersona(p.id);
    }
  })))));
}
window.BrandingPanel = BrandingPanel;
})();
