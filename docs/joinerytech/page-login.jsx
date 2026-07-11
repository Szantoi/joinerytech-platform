// Login / pre-auth landing page
// Marketing-feel left side + auth panel on the right.

const { useState: useStateL } = React;

function LoginPage({ onLogin, lang = "hu" }) {
  const [mode, setMode] = useStateL("login"); // login | sso | forgot
  const [email, setEmail] = useStateL("anna.kovacs@joinerytech.hu");
  const [pwd, setPwd] = useStateL("••••••••••");
  const [remember, setRemember] = useStateL(true);
  const [busy, setBusy] = useStateL(false);

  const submit = (e) => {
    e?.preventDefault?.();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      onLogin?.({ email });
    }, 700);
  };

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* LEFT — brand storyboard panel */}
      <aside className="hidden lg:flex flex-col w-[44%] xl:w-[48%] relative overflow-hidden bg-stone-900 text-stone-100">
        <div className="absolute inset-0 opacity-[0.18]"
          style={{ backgroundImage: "repeating-linear-gradient(115deg, transparent 0 22px, rgba(255,255,255,0.07) 22px 23px)" }} />
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(900px 600px at 80% 10%, rgba(13,148,136,0.35), transparent 60%), radial-gradient(700px 500px at 10% 90%, rgba(180,83,9,0.25), transparent 60%)" }} />

        <div className="relative px-12 pt-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-600 grid place-items-center">
              <Icon name="wrench" size={18} className="text-white" />
            </div>
            <div className="text-[16px] font-semibold tracking-tight">joinery<span className="text-teal-400">/</span>tech</div>
          </div>
        </div>

        <div className="relative flex-1 flex flex-col justify-center px-12 py-12 max-w-[640px]">
          <div className="text-[11px] uppercase tracking-[0.22em] text-teal-300/80 mb-4">Bútor- és nyílászárógyártóknak</div>
          <h1 className="text-[42px] xl:text-[48px] font-semibold leading-[1.05] tracking-tight">
            Egy rendszer<br />
            a tervezéstől<br />
            <span className="text-teal-400">a kiszállításig.</span>
          </h1>
          <p className="text-[14px] text-stone-300/90 mt-5 max-w-md leading-relaxed">
            Parametrikus sablonok, automatikus szabászat, élő gépterhelés és raktárkészlet — egy helyen, magyar nyelven.
          </p>

          {/* tiny stats bar */}
          <div className="grid grid-cols-3 gap-3 mt-10 max-w-md">
            {[
              { v: "− 31%", l: "anyaghulladék" },
              { v: "+ 18%", l: "kapacitás" },
              { v: "4.6 ★", l: "felhasználói" },
            ].map(s => (
              <div key={s.l} className="border-l-2 border-teal-500/60 pl-3">
                <div className="text-[20px] font-semibold tabular-nums">{s.v}</div>
                <div className="text-[10.5px] text-stone-400 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative px-12 pb-10 flex items-center justify-between text-[11px] text-stone-400">
          <div className="flex items-center gap-4">
            <span>v4.2.1</span>
            <span className="w-1 h-1 rounded-full bg-stone-600" />
            <span>Magyarország</span>
            <span className="w-1 h-1 rounded-full bg-stone-600" />
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Minden rendszer üzemel
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a className="hover:text-stone-200">Adatvédelem</a>
            <a className="hover:text-stone-200">ÁSZF</a>
            <a className="hover:text-stone-200">Súgó</a>
          </div>
        </div>
      </aside>

      {/* RIGHT — auth */}
      <main className="flex-1 flex flex-col">
        {/* mobile brand */}
        <div className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 grid place-items-center">
              <Icon name="wrench" size={16} className="text-white" />
            </div>
            <div className="text-[14px] font-semibold tracking-tight">joinery<span className="text-teal-600">/</span>tech</div>
          </div>
          <button className="text-[11.5px] text-stone-500">HU / EN</button>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-[400px]">
            {mode === "login" && (
              <form onSubmit={submit}>
                <div className="mb-7">
                  <h2 className="text-[26px] font-semibold tracking-tight text-stone-900">Üdv újra!</h2>
                  <p className="text-[13px] text-stone-500 mt-1">Lépj be a JoineryTech portálra a folytatáshoz.</p>
                </div>

                {/* SSO row */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button type="button" onClick={() => onLogin?.({ email: "anna.kovacs@joinerytech.hu" })}
                    className="h-10 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 inline-flex items-center justify-center gap-2 text-[12px] font-medium text-stone-700">
                    <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.6c-.2 1.3-1 2.4-2.2 3.1v2.6h3.6c2.1-1.9 3-4.7 3-7.5z"/><path fill="#34A853" d="M12 22c2.9 0 5.4-1 7.2-2.6l-3.6-2.6c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-5.9-4.4H2.4v2.7C4.2 19.8 7.8 22 12 22z"/><path fill="#FBBC05" d="M6.1 13.5c-.2-.6-.3-1.3-.3-2 0-.7.1-1.4.3-2V6.8H2.4C1.5 8.4 1 10.1 1 12s.5 3.6 1.4 5.2l3.7-2.7z"/><path fill="#EA4335" d="M12 5.6c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.4 2.4 14.9 1.4 12 1.4 7.8 1.4 4.2 3.6 2.4 6.8l3.7 2.7c.8-2.5 3.1-3.9 5.9-3.9z"/></svg>
                    Google
                  </button>
                  <button type="button" onClick={() => setMode("sso")}
                    className="h-10 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 inline-flex items-center justify-center gap-2 text-[12px] font-medium text-stone-700">
                    <Icon name="shield" size={14} />SSO / Microsoft
                  </button>
                </div>

                <div className="flex items-center gap-3 my-5 text-[10.5px] uppercase tracking-wide text-stone-400">
                  <span className="flex-1 h-px bg-stone-200" />
                  vagy email-lel
                  <span className="flex-1 h-px bg-stone-200" />
                </div>

                {/* Email */}
                <label className="block mb-3">
                  <span className="text-[11px] font-medium text-stone-700">Email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-stone-200 bg-white text-[13px] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
                </label>

                {/* Password */}
                <label className="block">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-stone-700">Jelszó</span>
                    <button type="button" onClick={() => setMode("forgot")} className="text-[11px] text-teal-700 hover:underline">Elfelejtetted?</button>
                  </div>
                  <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="current-password"
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-stone-200 bg-white text-[13px] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
                </label>

                <label className="flex items-center gap-2 mt-3.5 text-[12px] text-stone-600 select-none cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500" />
                  Emlékezz rám 30 napig
                </label>

                <button type="submit" disabled={busy}
                  className="mt-5 w-full h-11 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-60 disabled:cursor-wait text-white text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 shadow-sm shadow-teal-900/10 transition">
                  {busy ? (
                    <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Bejelentkezés…</>
                  ) : (
                    <>Bejelentkezés <Icon name="chevron" size={14} /></>
                  )}
                </button>

                <div className="mt-6 pt-5 border-t border-stone-100 text-center text-[12px] text-stone-500">
                  Még nincs fiókod? <a className="text-teal-700 font-medium hover:underline cursor-pointer">Regisztráció</a>
                </div>

                {/* Demo creds hint */}
                <div className="mt-5 p-3 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 leading-relaxed">
                  <span className="font-semibold">Demo:</span> bármely email + jelszó működik a folytatáshoz. Üzem (Shop Floor) belépéshez nem itt jelentkezz be — a portál Home oldalán válaszd az „Üzem" csempét, ott külön PIN-kódos bejelentkezés van.
                </div>
              </form>
            )}

            {mode === "sso" && (
              <div>
                <div className="mb-7">
                  <h2 className="text-[26px] font-semibold tracking-tight text-stone-900">SSO bejelentkezés</h2>
                  <p className="text-[13px] text-stone-500 mt-1">Add meg a céges domain-t és átirányítunk az identitásszolgáltatóhoz.</p>
                </div>
                <label className="block mb-4">
                  <span className="text-[11px] font-medium text-stone-700">Cég-domain</span>
                  <div className="mt-1 flex">
                    <input defaultValue="ceged" className="flex-1 h-10 px-3 rounded-l-lg border border-r-0 border-stone-200 bg-white text-[13px] outline-none focus:border-teal-500" />
                    <span className="h-10 px-3 inline-flex items-center bg-stone-50 border border-stone-200 rounded-r-lg text-[12.5px] text-stone-500 font-mono">.joinerytech.hu</span>
                  </div>
                </label>
                <button onClick={() => onLogin?.({ email: "user@ceged.hu" })}
                  className="w-full h-11 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[13.5px] font-semibold inline-flex items-center justify-center gap-2">
                  Folytatás SSO-val <Icon name="chevron" size={14} />
                </button>
                <button onClick={() => setMode("login")} className="mt-4 w-full text-center text-[12px] text-stone-500 hover:text-stone-700">← Vissza az emailes bejelentkezéshez</button>
              </div>
            )}

            {mode === "forgot" && (
              <div>
                <div className="mb-7">
                  <h2 className="text-[26px] font-semibold tracking-tight text-stone-900">Jelszó visszaállítása</h2>
                  <p className="text-[13px] text-stone-500 mt-1">Add meg az email-t, küldünk egy visszaállító linket.</p>
                </div>
                <label className="block mb-4">
                  <span className="text-[11px] font-medium text-stone-700">Email</span>
                  <input type="email" defaultValue={email} className="mt-1 w-full h-10 px-3 rounded-lg border border-stone-200 bg-white text-[13px] outline-none focus:border-teal-500" />
                </label>
                <button onClick={() => { window.toast?.("Visszaállító link elküldve", "success"); setMode("login"); }}
                  className="w-full h-11 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[13.5px] font-semibold">
                  Link küldése
                </button>
                <button onClick={() => setMode("login")} className="mt-4 w-full text-center text-[12px] text-stone-500 hover:text-stone-700">← Vissza</button>
              </div>
            )}
          </div>
        </div>

        <footer className="px-5 py-4 border-t border-stone-200 text-[11px] text-stone-500 flex items-center justify-between flex-wrap gap-2">
          <div>© 2026 JoineryTech Kft. · Minden jog fenntartva</div>
          <div className="flex items-center gap-4">
            <a className="hover:text-stone-700 cursor-pointer">Súgó</a>
            <a className="hover:text-stone-700 cursor-pointer">Állapotoldal</a>
            <a className="hover:text-stone-700 cursor-pointer">Kapcsolat</a>
          </div>
        </footer>
      </main>
    </div>
  );
}

window.LoginPage = LoginPage;
