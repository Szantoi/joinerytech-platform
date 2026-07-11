/* AUTO-GENERATED from page-login.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// Login / pre-auth landing page
// Marketing-feel left side + auth panel on the right.

const {
  useState: useStateL
} = React;
function LoginPage({
  onLogin,
  lang = "hu"
}) {
  const [mode, setMode] = useStateL("login"); // login | sso | forgot
  const [email, setEmail] = useStateL("anna.kovacs@joinerytech.hu");
  const [pwd, setPwd] = useStateL("••••••••••");
  const [remember, setRemember] = useStateL(true);
  const [busy, setBusy] = useStateL(false);
  const submit = e => {
    e?.preventDefault?.();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      onLogin?.({
        email
      });
    }, 700);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen flex bg-stone-50"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "hidden lg:flex flex-col w-[44%] xl:w-[48%] relative overflow-hidden bg-stone-900 text-stone-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 opacity-[0.18]",
    style: {
      backgroundImage: "repeating-linear-gradient(115deg, transparent 0 22px, rgba(255,255,255,0.07) 22px 23px)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0",
    style: {
      background: "radial-gradient(900px 600px at 80% 10%, rgba(13,148,136,0.35), transparent 60%), radial-gradient(700px 500px at 10% 90%, rgba(180,83,9,0.25), transparent 60%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative px-12 pt-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-lg bg-teal-600 grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "wrench",
    size: 18,
    className: "text-white"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-semibold tracking-tight"
  }, "joinery", /*#__PURE__*/React.createElement("span", {
    className: "text-teal-400"
  }, "/"), "tech"))), /*#__PURE__*/React.createElement("div", {
    className: "relative flex-1 flex flex-col justify-center px-12 py-12 max-w-[640px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] uppercase tracking-[0.22em] text-teal-300/80 mb-4"
  }, "B\xFAtor- \xE9s ny\xEDl\xE1sz\xE1r\xF3gy\xE1rt\xF3knak"), /*#__PURE__*/React.createElement("h1", {
    className: "text-[42px] xl:text-[48px] font-semibold leading-[1.05] tracking-tight"
  }, "Egy rendszer", /*#__PURE__*/React.createElement("br", null), "a tervez\xE9st\u0151l", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "text-teal-400"
  }, "a kisz\xE1ll\xEDt\xE1sig.")), /*#__PURE__*/React.createElement("p", {
    className: "text-[14px] text-stone-300/90 mt-5 max-w-md leading-relaxed"
  }, "Parametrikus sablonok, automatikus szab\xE1szat, \xE9l\u0151 g\xE9pterhel\xE9s \xE9s rakt\xE1rk\xE9szlet \u2014 egy helyen, magyar nyelven."), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-3 mt-10 max-w-md"
  }, [{
    v: "− 31%",
    l: "anyaghulladék"
  }, {
    v: "+ 18%",
    l: "kapacitás"
  }, {
    v: "4.6 ★",
    l: "felhasználói"
  }].map(s => /*#__PURE__*/React.createElement("div", {
    key: s.l,
    className: "border-l-2 border-teal-500/60 pl-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[20px] font-semibold tabular-nums"
  }, s.v), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-stone-400 mt-0.5"
  }, s.l))))), /*#__PURE__*/React.createElement("div", {
    className: "relative px-12 pb-10 flex items-center justify-between text-[11px] text-stone-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("span", null, "v4.2.1"), /*#__PURE__*/React.createElement("span", {
    className: "w-1 h-1 rounded-full bg-stone-600"
  }), /*#__PURE__*/React.createElement("span", null, "Magyarorsz\xE1g"), /*#__PURE__*/React.createElement("span", {
    className: "w-1 h-1 rounded-full bg-stone-600"
  }), /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-emerald-400"
  }), "Minden rendszer \xFCzemel")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("a", {
    className: "hover:text-stone-200"
  }, "Adatv\xE9delem"), /*#__PURE__*/React.createElement("a", {
    className: "hover:text-stone-200"
  }, "\xC1SZF"), /*#__PURE__*/React.createElement("a", {
    className: "hover:text-stone-200"
  }, "S\xFAg\xF3")))), /*#__PURE__*/React.createElement("main", {
    className: "flex-1 flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg:hidden flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-lg bg-teal-600 grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "wrench",
    size: 16,
    className: "text-white"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-semibold tracking-tight"
  }, "joinery", /*#__PURE__*/React.createElement("span", {
    className: "text-teal-600"
  }, "/"), "tech")), /*#__PURE__*/React.createElement("button", {
    className: "text-[11.5px] text-stone-500"
  }, "HU / EN")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex items-center justify-center px-5 py-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-[400px]"
  }, mode === "login" && /*#__PURE__*/React.createElement("form", {
    onSubmit: submit
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-7"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-[26px] font-semibold tracking-tight text-stone-900"
  }, "\xDCdv \xFAjra!"), /*#__PURE__*/React.createElement("p", {
    className: "text-[13px] text-stone-500 mt-1"
  }, "L\xE9pj be a JoineryTech port\xE1lra a folytat\xE1shoz.")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 mb-4"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onLogin?.({
      email: "anna.kovacs@joinerytech.hu"
    }),
    className: "h-10 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 inline-flex items-center justify-center gap-2 text-[12px] font-medium text-stone-700"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    fill: "#4285F4",
    d: "M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.6c-.2 1.3-1 2.4-2.2 3.1v2.6h3.6c2.1-1.9 3-4.7 3-7.5z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#34A853",
    d: "M12 22c2.9 0 5.4-1 7.2-2.6l-3.6-2.6c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-5.9-4.4H2.4v2.7C4.2 19.8 7.8 22 12 22z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#FBBC05",
    d: "M6.1 13.5c-.2-.6-.3-1.3-.3-2 0-.7.1-1.4.3-2V6.8H2.4C1.5 8.4 1 10.1 1 12s.5 3.6 1.4 5.2l3.7-2.7z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#EA4335",
    d: "M12 5.6c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.4 2.4 14.9 1.4 12 1.4 7.8 1.4 4.2 3.6 2.4 6.8l3.7 2.7c.8-2.5 3.1-3.9 5.9-3.9z"
  })), "Google"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setMode("sso"),
    className: "h-10 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 inline-flex items-center justify-center gap-2 text-[12px] font-medium text-stone-700"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield",
    size: 14
  }), "SSO / Microsoft")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 my-5 text-[10.5px] uppercase tracking-wide text-stone-400"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex-1 h-px bg-stone-200"
  }), "vagy email-lel", /*#__PURE__*/React.createElement("span", {
    className: "flex-1 h-px bg-stone-200"
  })), /*#__PURE__*/React.createElement("label", {
    className: "block mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-medium text-stone-700"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    autoComplete: "email",
    className: "mt-1 w-full h-10 px-3 rounded-lg border border-stone-200 bg-white text-[13px] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
  })), /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-medium text-stone-700"
  }, "Jelsz\xF3"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setMode("forgot"),
    className: "text-[11px] text-teal-700 hover:underline"
  }, "Elfelejtetted?")), /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: pwd,
    onChange: e => setPwd(e.target.value),
    autoComplete: "current-password",
    className: "mt-1 w-full h-10 px-3 rounded-lg border border-stone-200 bg-white text-[13px] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
  })), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 mt-3.5 text-[12px] text-stone-600 select-none cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: remember,
    onChange: e => setRemember(e.target.checked),
    className: "w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
  }), "Eml\xE9kezz r\xE1m 30 napig"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: busy,
    className: "mt-5 w-full h-11 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-60 disabled:cursor-wait text-white text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 shadow-sm shadow-teal-900/10 transition"
  }, busy ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
  }), " Bejelentkez\xE9s\u2026") : /*#__PURE__*/React.createElement(React.Fragment, null, "Bejelentkez\xE9s ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 pt-5 border-t border-stone-100 text-center text-[12px] text-stone-500"
  }, "M\xE9g nincs fi\xF3kod? ", /*#__PURE__*/React.createElement("a", {
    className: "text-teal-700 font-medium hover:underline cursor-pointer"
  }, "Regisztr\xE1ci\xF3")), /*#__PURE__*/React.createElement("div", {
    className: "mt-5 p-3 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 leading-relaxed"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Demo:"), " b\xE1rmely email + jelsz\xF3 m\u0171k\xF6dik a folytat\xE1shoz. \xDCzem (Shop Floor) bel\xE9p\xE9shez nem itt jelentkezz be \u2014 a port\xE1l Home oldal\xE1n v\xE1laszd az \u201E\xDCzem\" csemp\xE9t, ott k\xFCl\xF6n PIN-k\xF3dos bejelentkez\xE9s van.")), mode === "sso" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mb-7"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-[26px] font-semibold tracking-tight text-stone-900"
  }, "SSO bejelentkez\xE9s"), /*#__PURE__*/React.createElement("p", {
    className: "text-[13px] text-stone-500 mt-1"
  }, "Add meg a c\xE9ges domain-t \xE9s \xE1tir\xE1ny\xEDtunk az identit\xE1sszolg\xE1ltat\xF3hoz.")), /*#__PURE__*/React.createElement("label", {
    className: "block mb-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-medium text-stone-700"
  }, "C\xE9g-domain"), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 flex"
  }, /*#__PURE__*/React.createElement("input", {
    defaultValue: "ceged",
    className: "flex-1 h-10 px-3 rounded-l-lg border border-r-0 border-stone-200 bg-white text-[13px] outline-none focus:border-teal-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "h-10 px-3 inline-flex items-center bg-stone-50 border border-stone-200 rounded-r-lg text-[12.5px] text-stone-500 font-mono"
  }, ".joinerytech.hu"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => onLogin?.({
      email: "user@ceged.hu"
    }),
    className: "w-full h-11 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[13.5px] font-semibold inline-flex items-center justify-center gap-2"
  }, "Folytat\xE1s SSO-val ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMode("login"),
    className: "mt-4 w-full text-center text-[12px] text-stone-500 hover:text-stone-700"
  }, "\u2190 Vissza az emailes bejelentkez\xE9shez")), mode === "forgot" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mb-7"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-[26px] font-semibold tracking-tight text-stone-900"
  }, "Jelsz\xF3 vissza\xE1ll\xEDt\xE1sa"), /*#__PURE__*/React.createElement("p", {
    className: "text-[13px] text-stone-500 mt-1"
  }, "Add meg az email-t, k\xFCld\xFCnk egy vissza\xE1ll\xEDt\xF3 linket.")), /*#__PURE__*/React.createElement("label", {
    className: "block mb-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-medium text-stone-700"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    defaultValue: email,
    className: "mt-1 w-full h-10 px-3 rounded-lg border border-stone-200 bg-white text-[13px] outline-none focus:border-teal-500"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      window.toast?.("Visszaállító link elküldve", "success");
      setMode("login");
    },
    className: "w-full h-11 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[13.5px] font-semibold"
  }, "Link k\xFCld\xE9se"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMode("login"),
    className: "mt-4 w-full text-center text-[12px] text-stone-500 hover:text-stone-700"
  }, "\u2190 Vissza")))), /*#__PURE__*/React.createElement("footer", {
    className: "px-5 py-4 border-t border-stone-200 text-[11px] text-stone-500 flex items-center justify-between flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("div", null, "\xA9 2026 JoineryTech Kft. \xB7 Minden jog fenntartva"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("a", {
    className: "hover:text-stone-700 cursor-pointer"
  }, "S\xFAg\xF3"), /*#__PURE__*/React.createElement("a", {
    className: "hover:text-stone-700 cursor-pointer"
  }, "\xC1llapotoldal"), /*#__PURE__*/React.createElement("a", {
    className: "hover:text-stone-700 cursor-pointer"
  }, "Kapcsolat")))));
}
window.LoginPage = LoginPage;
})();
