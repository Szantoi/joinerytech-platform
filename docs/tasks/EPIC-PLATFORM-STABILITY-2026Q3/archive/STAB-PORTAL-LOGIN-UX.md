# STAB-PORTAL-LOGIN-UX — stabil, egyutas Keycloak-bejelentkezés a portálon

- **Szerep:** frontend-auth
- **Prioritás:** P0 (Gábor, 2026-07-27: „Meg kell javítani, stabilnak kell lennie.")
- **Üzleti kontextus:** a Doorstar elfogadta a pilotot és megrendeli a végleges
  portált, ahol a SAJÁT felhasználóik lépnek be; Gábor más tenanteknek is
  értékesíteni akarja → a bejelentkezés az első benyomás és üzletkritikus.
- **Státusz:** review_requested — implementáció + kapuk zöldek (2026-07-27, root),
  fresh adversarial review folyamatban
- **Mutációs határ:** `src/pages/LoginPage.tsx`, `src/auth/AuthContext.tsx`,
  `src/auth/CallbackPage.tsx` + tesztjeik. App.tsx és a warehouse-fájlok
  (Antigravity commitolatlan szelete) NEM érinthetők.

## A tünet (Gábor, 2026-07-27)

„Bejelentkezés még mindig nehézkes, kétszer kell, és nem is enged be."

## Gyökérokok (kódból bizonyítva)

1. **Díszlet-űrlap** (`LoginPage.tsx`): a prototípusból örökölt e-mail+jelszó
   mező (előre kitöltve `anna.kovacs@joinerytech.hu`-val) MINDENT eldobott, amit
   a felhasználó beírt, és 300 ms múlva a Keycloakra dobott, ahol ÚJRA be
   kellett jelentkezni → „kétszer kell". A Google/SSO-domain/elfelejtett-jelszó
   ágak is működésképtelen díszletek voltak (a „forgot" egy `alert()`-tel
   hazudott sikeres linkküldést).
2. **`prompt: 'login'`** (`AuthContext.tsx`): minden belépés KÉNYSZERÍTETT
   újra-hitelesítés volt — élő Keycloak SSO-munkamenet mellett is jelszót kért.
3. **Néma hibaelnyelés + StrictMode-verseny** (`CallbackPage.tsx`): a
   `signinRedirectCallback()` bármely hibája némán `/login`-ra dobott → „nem
   enged be", ok nélkül. React StrictMode alatt (dev) az effekt kétszer fut, a
   második kódbeváltás garantáltan elhasal, és a hibás ág VERSENYZETT a sikeres
   ággal — sikeres belépés után is visszadobhatott a loginra.

## A javítás

- **LoginPage**: egyetlen „Bejelentkezés" gomb → közvetlen Keycloak-redirect;
  hitelesítő adatot a portál SOHA nem kér be. Busy-állapot + látható,
  `role="alert"` hibaüzenet, ha a redirect el sem indul (a gomb újra aktív).
  A kamu-elemek (fake statisztikák „−31% / 4.6★", „Minden rendszer üzemel"
  státuszpont, halott Regisztráció/HU-EN/Állapotoldal linkek, demo-hint)
  kivezetve — értékesítésre szánt felületen nem állíthatunk nem mért dolgokat.
  A Shop Floor PIN-es belépés útjelzője megmaradt.
- **AuthContext**: `prompt: 'login'` törölve — élő SSO-munkamenettel jelszó
  nélkül enged vissza. + A régóta ismert `react-hooks/set-state-in-effect`
  lint-hiba rendezve: a facility-állapot a betöltéskori userhez kötve tárolódik
  (`userKey` = `profile.sub`), kulcs-egyezéses származtatással — user-váltásnál
  és kijelentkezésnél nem szivároghat át az előző bérlő üzeme (multi-tenant
  higiénia a Doorstar-értékesítés előtt).
- **CallbackPage**: `useRef`-guard — a kódbeváltás pontosan egyszer fut
  (StrictMode-biztos); hibánál előbb `getUser()`-rel ellenőrzi, hogy a user
  valójában el van-e már mentve (akkor beenged), és csak valódi hibánál mutat
  LÁTHATÓ hibaüzenetet + „Vissza a bejelentkezéshez" linket — néma
  /login-visszadobás nincs többé.

## Kapuk (root, 2026-07-27)

- Célzott vitest: **16/16 zöld** (LoginPage 3, CallbackPage 4 — köztük
  StrictMode-dupla-effekt „pontosan egyszer" guard-teszt —, RequireAuth,
  useAuth).
- `tsc -b`: 0 hiba. ESLint az 5 érintett fájlon: **0 hiba** (a pre-existing
  AuthContext-hiba is elfogyott).
- `npm run build`: zöld.
- jsdom-korlát kimondva: a valós Keycloak-oda-vissza út böngészős/e2e
  ellenőrzése env-függő (élő Keycloak kell hozzá) — a kontraktus-gate mintára
  külön futtatandó, lásd follow-up.

## Follow-upok a Doorstar-élesítéshez (KÜLÖN szeletek, nem ez a task)

1. **`apiClient` Authorization header** — dokumentált platform-gap
   (WORLDS-PRODUCTION-API-GATE, 2026-07-22): a bejelentkezett user tokenje ma
   nem jut el az API-hívásokba → a valós adatelérés e nélkül nem élesíthető.
2. **Keycloak kliens-konfig több tenantra**: redirect URI-k (localhost + éles
   domainek), a `tid`/`enabled_modules` claim-mapperek ellenőrzése minden új
   tenant-realm/kliens felvételekor; a localhost redirect URI felvételével a
   `VITE_AUTH_MODE=mock` dev-bypass kiváltható valós dev-loginra.
3. **Élő login-smoke**: Keycloak elleni bejelentkezés-visszairányítás e2e
   próba a deploy-smoke részeként (a „bennragadt régi processz" hibaosztály
   párja auth-oldalon).
4. **Friss éles deploy**: a joinerytech.hu ma a 2026-07-16-i buildet szolgálja
   ki — ez a javítás is csak deploy után látszik élesben.

## Végrehajtási napló

- 2026-07-27 root: implementáció + tesztek + kapuk a fenti tartalommal.
- 2026-07-27 fresh adversarial review (3 mutációs próba, mind KILLED; fogyasztó-
  regresszió átvizsgálva; SHA-ellenőrzött visszaállítás): a mechanizmus mindhárom
  gyökérok-javításra megerősítve. **1 P1 + 5 P2 finding — MIND javítva:**
  - **P1-1 (javítva):** a `prompt:'login'` kivételével a logout kozmetikussá vált
    volna (a Keycloak SSO-munkamenet sosem zárult le → közös gépen jelszó nélküli
    visszalépés az előző fiókba). Fix: `logout()` → `signoutRedirect()` (valódi
    Keycloak-kijelentkezés), elérhetetlen Keycloaknál `removeUser()` fallback.
  - P2-1/P2-2 (javítva): a facility-kulcs bérlő-tudatos lett (`sub:tid`), üres
    `sub`-ra a fetch nem indul és a guard nem vakuum-igaz.
  - P2-4 (javítva): a callback-hiba `console.error`-ra kerül (QUALITY logolás).
  - P2-5 (javítva): a CallbackPage-teszt hamis fejléc-kommentje cserélve +
    determinisztikus mock-defaultok beforeEach-ben (implementáció-szivárgás
    kizárva).
  - P2-6 (javítva): bfcache vissza-navigációnál beragadó busy-gomb —
    `pageshow`/`persisted` handler oldja.
  - P2-3 (tudatosan nyitva): stale-fetch verseny facility-vesztéssel — a
    hibairány biztonságos (null, nem átszivárgás), külön nem kezeljük.
- Záró kapuk a javítások után: célzott vitest 16/16, tsc 0, eslint 0, build zöld.
- Ismert korlát: a `signoutRedirect` valós Keycloak-oda-vissza útja csak élő
  környezetben mérhető (jsdom-ban elvileg sem) — a 3. follow-up (élő
  login-smoke) fedi majd.
