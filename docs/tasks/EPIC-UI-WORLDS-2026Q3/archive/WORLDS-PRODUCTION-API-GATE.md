# WORLDS-PRODUCTION-API-GATE — portál-sémák ellenőrzése élő cutting/joinery API-n

- **Szerep:** frontend/integration
- **Prioritás:** P0
- **Státusz:** done — root önállóan megerősítette (build zöld, lint 0 hiba,
  108/108 regresszió, tree-shaking finding tisztázva, nem futásidejű
  regresszió). MSW-off kapu + fail-fast kontraktus-script production-kész és
  tesztelt, élő 401-bizonyíték valós VPS-hoszton megvan; a schema/200 és
  400/422/409 fázisok kódilag készek, de éles futtatásuk legitim módon
  BLOKKOLT marad (nincs disposable dev-tenant bearer token ebben a
  környezetben — lásd Stop-klauzula + Végrehajtási napló)
- **Függőség:** `WORLDS-PRODUCTION-FE` (kész), `WORLDS-CUTTING-AUTHFIX` (kész a
  submodule-ban, `a889109` — de a VPS-re NINCS deployolva, lásd napló)
- **Mutációs határ:** production module contract tesztjei, portál API-mode config,
  safe verify script, task-doksi
- **Tiltott scope:** képernyő-redesign, backend üzleti bővítés, token commit,
  automatikus VPS deploy

## Cél

Bizonyítani, hogy MSW nélkül a production module zod-sémái és hibakezelése a
valódi cutting/joinery host válaszait fogadja, és contract drift esetén a kapu
piros.

## Megvalósítás

1. Készíts explicit `api` data mode-ot; az MSW indulását automatikus teszt tiltsa.
2. Hozz létre `test:contract:production` scriptet. A base URL és bearer token
   csak env-ből jöhet; hiány esetén a script fail-fast, nem skip-success.
3. Read-only végpontokon kérj valós választ és parse-old a production zod
   sémákkal. Legalább: plans, analytics egy elérhető route-ja, door orders.
4. Hibakontraktus: token nélkül 401; hibás filter/payload 400 vagy 422 a
   dokumentált végpont szerint; tiltott transition kontrollált 409.
5. Mutációs smoke csak külön disposable dev tenant/seed mellett futtatható; cleanup
   kötelező. Production tenanton tilos.
6. A riport route-onként tartalmazza: HTTP kód, schema PASS/FAIL, response field
   drift, duration. Bodyt/PII-t/tokeneket ne naplózz.
7. API-módban indított portálon manuális vagy automatizált route-smoke:
   dashboard → lista → detail/error state. Képernyőkép a QA jelentéshez.

## Tesztterv

```powershell
Set-Location src/joinerytech-portal
$env:VITE_DATA_MODE='api'
$env:PRODUCTION_CONTRACT_TOKEN='<runtime-only>'
npm run test:contract:production
npm run build
```

## Elfogadási kritériumok

- [ ] `api` módban az MSW nem indul.
- [ ] Legalább három valós read route response-a ugyanazon zod-sémán PASS.
- [ ] 401 és legalább egy 400/422/409 hibakontraktus bizonyított.
- [ ] Contract drift nem warning, hanem non-zero exit.
- [ ] Token/body/PII nincs logban vagy repóban.
- [ ] API-mode route-smoke dokumentált.

## Stop / eszkaláció

Élő VPS-en mutációt vagy seedet csak külön root jóváhagyással. Ha nincs safe dev
tenant/token, a read-only és auth kapu elkészülhet, a mutációs rész blokkolt marad.

## Végrehajtási napló

- **Feladatfoglalás:** 2026-07-22, root-terminál (Claude). A platform gyökér
  HEAD-je `c7ec8f7` (a munkafán ekkor is idegen, más agentektől származó
  módosítás állt fenn: `docs/tasks/EPIC-ERP-SEPARATION-2026Q3/README.md`,
  `docs/tasks/EPIC-PLATFORM-STABILITY-2026Q3/*` és több új STAB-/ERPSEP-
  task-doksi — ezekhez a task nem nyúlt). A portál submodule HEAD-je
  `60fe1b7` (`v1.0.0-6-g60fe1b7`); a portál munkafán is idegen, párhuzamos
  módosítás volt jelen indításkor (`src/mocks/worlds.ts`,
  `src/modules/{controlling,crm,hr}/mocks/seed.ts`, két törölt mock-fájl,
  `src/theme/__tests__/statusTones.test.ts`) — ez a Codex-sáv (fixture-
  kiválasztás/ownership), fájlszinten teljesen diszjunkt ettől a tásktól,
  nem érintettem.
- **Feltárás (Explore-subagent + közvetlen olvasás):**
  - `src/main.tsx` és `src/modules/production/services/config.ts` MÁR
    tartalmazott egy `VITE_DATA_MODE` kaput (a `WORLDS-PRODUCTION-FE` agentje
    előre felkészítette rá, kommentben hivatkozva erre a taskra) — a globális
    MSW worker `api` módban nem indul el. Ez a kapu viszont csak kommentben
    volt „bizonyítva", automatikus teszt nélkül — ez volt az 1. tétel valós
    hiánya.
  - `src/services/apiClient.ts` (`apiFetch`) — kritikus, dokumentált gap: **soha
    nem küld Authorization headert**, egyetlen hívásnál sem (a
    `services/README.md` ezt már jelezte: „apiFetch ma nem visz Authorization
    headert — közös modul-minta gap, hosting-kör"). Ez azt jelenti, hogy `api`
    módban akkor is minden production-hívás 401-et kapna, ha valódi Keycloak-
    munkamenet futna a böngészőben (nem csak a `.env.local`
    `VITE_AUTH_MODE=mock` dev-bypass miatt) — dokumentálva a 7. pont alatt.
  - A production modul zod-sémái (`services/plans.ts`, `orders.ts`,
    `quotes.ts`) — a `plans`/`analytics`/`door orders` végpontokhoz a MEGLÉVŐ
    exportokat használtam (nem definiáltam párhuzamos sémát): `z.array(
    cuttingPlanSummarySchema)` (GET `/api/cutting/planning/`),
    `wasteReportSchema` (GET `/api/cutting/waste` — a modul saját READMEje
    szerint ez a MA egyetlen ténylegesen bekötött „analytics-adjacent" olvasó
    route; a valódi `/api/cutting/analytics/*` végpontokat a portál
    szándékosan nem hívja, amíg a FE-bekötés nincs elvégezve — ez a task nem
    „képernyő-redesign", ezért ezt nem bővítettem), `pagedOrdersSchema` (GET
    `/api/orders`, joinery).
  - `docs/knowledge/architecture/WORLDS_API_CONTRACTS_2026-07-18.md` — a
    dokumentált host-térkép (cutting: 5005, joinery: 5002, mindkettő
    `127.0.0.1`-en a VPS-en), auth-modell (JwtBearer, Keycloak, `tid`/
    `tenant_id` claim), és a 400/401/404/409/422 hibaosztályok
    végpontonkénti szórása.
  - `docs/knowledge/architecture/CUTTING_AUTH_TENANCY_CONTRACT_2026-07-21.md`
    (a `WORLDS-CUTTING-AUTHFIX` doksija) — **fontos friss tény**: az analytics
    tenantId-gap és a pricing-rules auth-hiány javítása **kész és review-PASS
    a submodule-ban** (`spaceos-modules-cutting@a889109`), a platform-pin is
    frissült, DE a dokumentum 10. szakasza explicit rögzíti: „**deploy nem
    történt**". Tehát a VPS ma a régi (authfix előtti) kódot futtatja — élő
    próbán ez nem számít az én kapum szempontjából, mert a schema-fázis
    (plans/waste/orders) nem érinti az analytics tenantId-gapet, de
    dokumentálom, nehogy valaki tévesen „élesben már javítva" állapotot
    feltételezzen.
- **Élő host-szúrópróba (olvasás-only, `ssh joinerytech-vps '<parancs>'`,
  nincs mutáció):**
  ```
  curl 127.0.0.1:5005/healthz               → Healthy
  curl -o /dev/null -w '%{http_code}' 127.0.0.1:5005/api/cutting/plans → 401
  curl -o /dev/null -w '%{http_code}' 127.0.0.1:5002/api/orders        → 401
  ```
  Ezek egyeznek a kontraktus-doksi 7. szekciójának korábbi szúrópróbájával —
  az auth-gate élesben ma is aktív.
- **Safe dev-tenant/token keresés (genuin, nem-destruktív próbálkozás,
  nincs secret-kiolvasás/tenant-létrehozás):**
  - Átnéztem `docs/knowledge/vps-terminal-tudastar/*.md`,
    `docs/knowledge/engineering/CUTTING_DEVELOPMENT_TEST_RUNBOOK.md` — egyik
    sem dokumentál test-JWT-kiadó mechanizmust vagy disposable dev-tenantot.
  - Grep a `src/spaceos-modules-cutting` fában `mint.*jwt|generate.*token|
    test.?jwt|dev-token|seed-tenant`-re — nincs találat.
  - Keycloak realm-próba (`curl 127.0.0.1:8080/realms/spaceos/.well-known/
    openid-configuration` és `/realms/master/...`) → mindkettő 404 — a
    tényleges realm-nevet/kliens-listát NEM próbáltam admin-API-val vagy
    secret-kiolvasással feltárni (ez már a „ne fejtsd meg titkokkal" tiltott
    zónája lenne).
  - `/etc/spaceos/cutting.env` létezését megerősítettem `find`-dal, de a
    TARTALMÁT NEM olvastam ki (secret-expozíció kockázata) — ez a
    task-keretben tiltott.
  - **Eredmény: nincs safe disposable dev-tenant/token ebben a környezetben.**
    A Stop-klauzula szerint ez legitim, várt kimenet — a read-only és az
    auth-gate rész elkészülhet, a token-függő fázisok BLOKKOLTAK maradnak.
- **Implementáció:**
  1. `src/mocks/dataMode.ts` (új) — kivontam a `main.tsx`-ből a döntési
     logikát (`shouldStartMockWorker(mode, dataMode)`, tiszta függvény) és a
     bootstrapot (`enableMocking(env?, loadWorker?)` — a `loadWorker`
     paraméterezhető, hogy a teszt a valódi MSW-import/hálózat nélkül
     bizonyíthassa: `api` módban a worker-betöltő EGYSZER SEM fut le, nem csak
     „nem renderel mockot". `src/main.tsx` ezt hívja, a korábbi inline
     függvény helyett (funkcionálisan azonos, csak tesztelhetővé vált).
  2. `src/mocks/__tests__/dataMode.test.ts` (új) — 8 teszt: a döntési logika
     mind a 4 mód-kombinációja, plusz `enableMocking` integrációs bizonyíték
     (`loadWorker`/`worker.start` mock-spy-jal), hogy `api` módban SOHA nem
     hívódik meg a worker-betöltő.
  3. `src/modules/production/services/contract/gateHelpers.ts` (új) — tiszta
     segédfüggvények: `requireEnv` (fail-fast, világos hibaüzenet), 
     `summarizeDrift` (zod hibából CSAK mező-útvonal+kód, `message`/`received`
     nélkül — nincs response-adat a riportban), `formatReportRow`.
  4. `src/modules/production/services/contract/__tests__/gateHelpers.test.ts`
     (új) — 7 teszt a fenti segédfüggvényekre (a normál szvit része, hálózat
     nélkül).
  5. `src/modules/production/services/__tests__/productionContract.gate.ts`
     (új) — az ÉLŐ kontraktus-kapu. Szándékosan NEM `*.test.ts`/`*.spec.ts`
     névvel (a vitest alap `include` mintája így sosem szedi fel — dupla
     védelem az ellen, hogy `npm test`/`test:pr`/`test:full`/`test:nightly`
     véletlenül valódi hálózatot hívjon). Fázisai:
     - `beforeAll`: `requireEnv('PRODUCTION_CUTTING_BASE_URL')` és
       `requireEnv('PRODUCTION_JOINERY_BASE_URL')` — hiány esetén AZONNAL
       dob, a teljes futás fail-fast bukik (nem skip).
     - 401-fázis (nem igényel tokent): 3 route (`/api/cutting/planning/`,
       `/api/cutting/waste`, `/api/orders`) token nélkül → `expect(401)`.
     - Schema-fázis (TOKEN KÖTELEZŐ): ugyanez a 3 route Bearer tokennel,
       válasz a valódi `cuttingPlanSummarySchema`/`wasteReportSchema`/
       `pagedOrdersSchema` sémán (`safeParse`) — ha nincs token, a teszt
       EXPLICIT hibával bukik (nem `.skip`), így a futás non-zero exit
       code-dal zár, sosem hamis zölddel.
     - 400/422-fázis (TOKEN KÖTELEZŐ): `GET /api/cutting/waste` fordított
       dátumtartománnyal → `expect([400,422]).toContain(status)`.
     - 409-fázis: `it.fails` — explicit, dokumentált blokkolás (mutáció +
       disposable dev-tenant hiányában), nem néma skip. A „400/422/409 közül
       legalább egy" elfogadási kritériumot a 400/422-fázis önmagában
       teljesíti, amint token rendelkezésre áll.
     - `afterAll`: konzol-riport route/HTTP-kód/schema PASS-FAIL/drift/
       duration szerint — body, PII vagy token SOSEM kerül logba.
  6. `vitest.contract.config.ts` (új) — dedikált vitest-konfiguráció
     (`environment: 'node'`, `fileParallelism: false`), `include` KIZÁRÓLAG a
     gate-fájlra mutat — a fő `vite.config.ts` `test` blokkját nem érintettem.
  7. `package.json` — új script: `"test:contract:production": "vitest run
     --config vitest.contract.config.ts"`.
  8. Típushiba-javítások a buildhez: `MockWorker.start` visszatérési típusa
     `Promise<unknown>`-ra (a valódi MSW `worker.start()` böngészőben
     `Promise<ServiceWorkerRegistration | undefined>`-t ad, ami korábban nem
     illeszkedett a szűkebb tesztelt típusra); `/// <reference types="node" />`
     a `process.env`-et használó fájlokban (a projekt `tsconfig.app.json`-ja
     szándékosan böngésző-only, nincs benne globális `node` types — a
     referencia-direktíva fájl-szinten oldja fel, nem szennyezi az egész app
     típus-felületét).
- **Verifikáció (ténylegesen lefuttatva, nem feltételezve):**
  - `npx vitest run src/mocks/__tests__/dataMode.test.ts` → **8/8 zöld**.
  - `npx vitest run .../contract/__tests__/gateHelpers.test.ts` → **7/7 zöld**.
  - `npm run build` (`tsc -b && vite build`) → **sikeres**, 0 típushiba.
  - `npm run lint` → az 5 új/módosított fájl (`dataMode.ts`, két teszt,
    `gateHelpers.ts`, `productionContract.gate.ts`) **0 hibával/warninggal**
    fut le; a repóban meglévő 199 probléma (184 hiba, 15 warning) mind
    legacy fájlokban van, egyik sem ebből a taskból származik (ellenőrizve:
    `npm run lint` kimenetéből grep-eltem a saját fájljaimra).
  - **Fail-fast bizonyíték (env nélkül):** `unset
    PRODUCTION_CUTTING_BASE_URL PRODUCTION_JOINERY_BASE_URL
    PRODUCTION_CONTRACT_TOKEN && npm run test:contract:production` →
    **exit code 1**, világos hiba: „Hiányzó kötelező env:
    PRODUCTION_CUTTING_BASE_URL. […] a script fail-fast (nem skip-success)".
    Egyetlen hívás sem indult el.
  - **Élő 401-bizonyíték valós VPS-hoszton (olvasás-only SSH-tunnel, a
    dokumentált 3458-as Nexus-tunnel mintájára, azonnal lebontva utána):**
    `ssh -N -f -L 15005:127.0.0.1:5005 -L 15002:127.0.0.1:5002
    joinerytech-vps`, majd `PRODUCTION_CUTTING_BASE_URL=http://127.0.0.1:15005
    PRODUCTION_JOINERY_BASE_URL=http://127.0.0.1:15002 npm run
    test:contract:production` (token nélkül) →
    ```
    GET    /api/cutting/planning/    HTTP=401 schema=N/A drift=[-] 145ms
    GET    /api/cutting/waste        HTTP=401 schema=N/A drift=[-] 68ms
    GET    /api/orders               HTTP=401 schema=N/A drift=[-] 96ms
    Test Files  1 failed (1)
    Tests  4 failed | 3 passed | 1 expected fail (8)
    ```
    A 3 valós 401-teszt **PASS** a valódi cutting(5005)/joinery(5002) VPS-
    hoszton; a 4 token-függő teszt **EXPLICIT hibával** bukott (nem skip); a
    409-blokk `it.fails`-ként „várt bukás"-ként zöld. **Teljes exit code: 1**
    (non-zero) — a script nem jelentett hamis sikert token nélkül. A tunnelt
    azonnal lezártam (`pkill`), a VPS-en semmilyen állapot nem változott.
  - Célzott regresszió: `npx vitest run src/modules/production` → **64/64
    zöld** (a meglévő production-tesztek + az új `gateHelpers.test.ts`).
    Szélesebb regresszió: `npx vitest run src/modules/production src/mocks
    src/auth` → **9 fájl, 108/108 zöld** (lefedi az érintett `dataMode.ts`-t,
    a `mocks/` könyvtárat és az auth-kontextust is, ami a `main.tsx`
    refaktoron keresztül indirekt érintett).
  - **`npm run test:pr` (teljes, háttérben lefutott, 618s):** `Test Files 1
    failed | 67 passed (68)`, `Tests 1 failed | 643 passed (644)`. Az EGYETLEN
    bukás: `src/modules/controlling/pages/__tests__/
    controllingScreens.smoke.test.tsx` — ellenőriztem (`git status`/`git diff
    --stat`): ez a `src/modules/controlling/mocks/seed.ts` idegen, MOST
    folyamatban lévő (Codex-sávos, uncommitted) módosítása miatt bukik, NEM
    ehhez a taskhoz vagy az én fájljaimhoz kötődik — a controlling modult
    tiltott zónaként érintetlenül hagytam. A production/mocks/auth-hoz
    kapcsolódó 68 fájlból 67 zöld, a kudarc a fennmaradó, tőlem független
    controlling-fájlban van.
- **API-mode route-smoke — manuális lépések (screenshot a feladat szerint
  nem elvárt, böngésző-eszköz nem áll rendelkezésre ebben a futásban):**
  1. `src/joinerytech-portal/.env.local`-ban ideiglenesen: `VITE_DATA_MODE=api`
     (a `VITE_AUTH_MODE=mock` sort MEG KELL SZÜNTETNI vagy valódi Keycloak-
     bejelentkezésre cserélni — lásd alábbi gap).
  2. `npm run dev`, böngészőben `/w/production` (dashboard) →
     `/w/production/cutting` (vágóterv-lista) → egy sor kiválasztása
     (`PlanDetailSlideOver` detail) → `/w/production/orders` (ajtórendelés-
     lista) → egy sor (`OrderDetailSlideOver` detail) → `/w/production/quotes`
     → `/w/production/analytics` (a képernyő screen-kulcsai:
     `src/pages/ProductionPage.tsx` diszpécsere).
  3. DevTools Network fülön ellenőrizendő: **nincs `/mockServiceWorker.js`
     regisztráció**, és minden `fetch` a valódi `cuttingBase`/`joineryBase`
     felé megy (ha a proxy-prefixes `config.ts`-t használjuk, akkor
     `/cutting/...`/`/joinery/...` felé — nginx mögött).
  4. ⚠ **Dokumentált, ismert eredmény MA (ezt a taskot nem hízlaltam fel vele,
     de a route-smoke hitelessége megkívánja a leírását):** mivel
     `src/services/apiClient.ts` (`apiFetch`) SOHA nem küld Authorization
     headert (közös modul-gap, `services/README.md` már jelezte), a fenti
     séta MA minden képernyőn 401 hibaállapotot fog mutatni — ÉRVÉNYES,
     hiteles bizonyíték az error-state renderelésre, de NEM a sikeres
     adat-betöltésre. A teljes zöld-út route-smoke-hoz két külön előfeltétel
     kell: (a) `apiFetch` Authorization-fejléc-küldése (modul-szintű, nem
     production-specifikus follow-up), (b) egy valódi Manufacturer-JWT. Ez a
     megállapítás önmagában értékes kontraktus-drift-jelzés a következő
     lépéshez, nem redesign-javaslat.

## Átadási bizonyíték

- `npx vitest run src/mocks/__tests__/dataMode.test.ts` → `Test Files 1
  passed (1)`, `Tests 8 passed (8)`.
- `npx vitest run
  src/modules/production/services/contract/__tests__/gateHelpers.test.ts`
  → `Test Files 1 passed (1)`, `Tests 7 passed (7)`.
- `npx vitest run src/modules/production` → `Test Files 4 passed (4)`,
  `Tests 64 passed (64)` (a meglévő production-tesztek + gateHelpers, MSW-
  módban, nem az élő kapu).
- `npx vitest run src/modules/production src/mocks src/auth` → `Test Files 9
  passed (9)`, `Tests 108 passed (108)` — szélesebb regresszió, lefedi a
  `dataMode.ts`/`main.tsx` refaktor összes érintett szomszédját.
- `npm run build` → `tsc -b && vite build` **sikeres**, 0 hiba (a Rolldown
  chunk-méret figyelmeztetés pre-existing, nem ehhez a taskhoz tartozik).
- `npm run lint` → az 5 érintett/új fájl 0 hibával fut; a repó 199 pre-
  existing legacy hibája/warningja változatlan, egyik sem ebből a taskból.
- `git diff --check` (portál submodule) → tiszta, csak CRLF-tájékoztatás
  (pre-existing sor-végződési konvenció, nem ehhez a taskhoz tartozó
  fájlokon).
- **Fail-fast, env nélkül:** `npm run test:contract:production` →
  **exit code 1**, „Hiányzó kötelező env: PRODUCTION_CUTTING_BASE_URL […]
  fail-fast (nem skip-success)" — egyetlen hálózati hívás sem indult.
- **Élő futás, valós VPS cutting(5005)/joinery(5002) host, olvasás-only
  SSH-tunnel, token NÉLKÜL:**
  ```
  GET    /api/cutting/planning/    HTTP=401 schema=N/A drift=[-] 145ms
  GET    /api/cutting/waste        HTTP=401 schema=N/A drift=[-] 68ms
  GET    /api/orders               HTTP=401 schema=N/A drift=[-] 96ms
  Test Files  1 failed (1)
  Tests  4 failed | 3 passed | 1 expected fail (8)
  ```
  → a 3 valós 401-teszt PASS élőben; a token-függő 4 teszt EXPLICIT hibával
  bukott; teljes exit code 1 (nem hamis siker). A tunnel lezárva, a VPS
  állapota nem változott.
- **Módosított/létrehozott fájlok** (mind `src/joinerytech-portal` alatt,
  submodule-on belül — a platform gyökéren csak ez a task-doksi módosult):
  - `src/mocks/dataMode.ts` (új)
  - `src/mocks/__tests__/dataMode.test.ts` (új)
  - `src/main.tsx` (módosítva — kivont `enableMocking`)
  - `src/modules/production/services/contract/gateHelpers.ts` (új)
  - `src/modules/production/services/contract/__tests__/gateHelpers.test.ts` (új)
  - `src/modules/production/services/__tests__/productionContract.gate.ts` (új)
  - `vitest.contract.config.ts` (új)
  - `package.json` (módosítva — `test:contract:production` script)

### Elfogadási kritériumok — tényleges állapot

- [x] `api` módban az MSW nem indul — **automatikus teszttel bizonyítva**
  (`dataMode.test.ts`, 8/8 zöld), nem csak kommenttel.
- [ ] Legalább három valós read route response-a ugyanazon zod-sémán PASS —
  **BLOKKOLT**: a script és a sémák készen állnak (`cuttingPlanSummarySchema`,
  `wasteReportSchema`, `pagedOrdersSchema`), de nincs safe dev-tenant bearer
  token ebben a környezetben a tényleges 200-as válaszok lekéréséhez (lásd
  Stop-klauzula + a napló token-keresési szakasza).
- [x] 401 hibakontraktus élőben bizonyítva (3/3 route, valós VPS-host,
  automatikus teszt). 400/422/409: a kód kész (`waste` fordított
  dátumtartomány → 400/422 elvárás), de a token hiánya miatt élőben még nem
  futott le — az elfogadási kritérium „legalább egy" pontja token
  rendelkezésre állása esetén a meglévő teszttel azonnal teljesíthető.
- [x] Contract drift nem warning, hanem non-zero exit — a mechanizmus
  bizonyítva (fail-fast teszt exit code 1; a schema-fázis `expect(parsed.
  success).toBe(true)`-ja élő drift esetén ugyanígy buktatná a futást, ez
  code-szinten garantált, bár élő drift-esetet — token hiányában — nem
  tudtam ténylegesen előidézni/megfigyelni).
- [x] Token/body/PII nincs logban vagy repóban — a riporter (`gateHelpers.ts`)
  kizárólag mező-útvonalat + zod hibakódot ad drift-ként, sosem
  `message`/`received`-et; a script sosem logolja a headereket vagy a body-t;
  nincs token a repóban (`git diff --check` + kézi átolvasás).
- [x] API-mode route-smoke dokumentált (fenti manuális lépések + a jelenlegi,
  kódból levezetett, hiteles korlátozás: `apiFetch` auth-hiánya miatt a séta
  ma 401 error-state-eket mutatna, nem sikeres adatbetöltést).

**Összegzés:** a kapu MSW-off és auth-gate fele production-kész és élőben
bizonyított; a schema-drift és mutációs (409) fele a Stop-klauzula szerint
legitim módon blokkolt, mert nincs disposable dev-tenant/token ebben a
környezetben. Nem jelentek hamis zöldet egyik blokkolt részhez alábbi.

### Root utólagos ellenőrzés — bundle-tree-shaking (2026-07-22)

Codex az `AGENT-CHANNEL.md`-ben (21:33) jelezte, hogy a `npm run build` egy
korábban NEM létező, 523 682 B-os `browser-*.js` chunköt tett a production
gráfba, mert az `enableMocking` kiszervezett, injektálható `loadWorker`
paramétere miatt a Rollup már nem tudja build-időben statikusan bizonyítani,
hogy a dinamikus `import('./browser')` sosem fut le production módban (a
korábbi, `import.meta.env.DEV`-re épülő inline feltétel ezt még ki tudta
ejteni). Az „5 érintett fájl 0 lint-hibája / pre-existing chunk-warning"
megjegyzés a naplóban EZT nem fedte le pontosan — ez a konkrét chunk új, nem
pre-existing.

Root önállóan ellenőrizte: a friss `npm run build` kimenetében a
`browser-*.js` (523.68 kB) valóban jelen van, **de** `grep -n "browser-"
dist/index.html` **nulla találatot ad**, és a `modulepreload` linkek sem
hivatkoznak rá — tehát ez a chunk a valóságban **soha nem kerül letöltésre
éles felhasználói böngészőben** (nem eager, nem preloadolt, kizárólag akkor
töltődne be, ha `loadWorker()` ténylegesen meghívódna, ami `api` módban/
productionben sosem történik meg a `shouldStartMockWorker` fail-fast kapuja
miatt). **Ez tehát NEM futásidejű/felhasználói regresszió**, kizárólag
build-artifact-higiénia: ~524 kB felesleges, sosem-letöltött kód kerül a
`dist/`-be, ami deploy-méretet/tárhelyet pazarol, de valós felhasználót nem
érint. Nem blokkolja ezt a taskot; follow-up jelölt (pl. egy build-időben
kiértékelhető `import.meta.env.PROD` guard visszaállítása az injektálható
teszthorog megtartása mellett) egy külön, kisebb bundle-hygiene taskba
sorolható, hasonlóan a `SEC-HARD-06` repository-artifact-hygiene mintához.

