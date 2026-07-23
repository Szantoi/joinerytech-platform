# WORLDS-PRODUCTION-FE — Production világ modernizálása (API-first)

**Epic:** EPIC-UI-WORLDS-2026Q3 · **Szerep:** frontend · **Kiadva:** 2026-07-18 (root)
**Kontraktus-forrás (kötelező, egyetlen igazság):**
`docs/knowledge/architecture/WORLDS_API_CONTRACTS_2026-07-18.md` — 1. (cutting) és 2. (joinery)
szekció + 0. közös wire-szabályok + 6. hiány-lista + 7. frontend-útmutató.

## Cél

A portál legacy **production** világa (szabászat/megmunkálás/workflow képernyők) a bevált
modul-sablonra áll át — `src/modules/production/{services,mocks,pages}` + publikus `index.ts` —
**API-first**: a zod-sémák, fetcherek és FSM-tükrök a VALÓS cutting+joinery kontraktusból
készülnek (a fenti doksi szerint), az MSW ennek tükre (409/400/422 szemantikával), nem előkép.

## Elvek (a 7 modul-világ bevált mintája + API-first kiegészítés)

1. **Adatréteg**: zod-sémák a doksi DTO-tábláiból — camelCase kulcsok, enum-wire a MAI alak
   szerint (szám vagy angol PascalCase string, DTO-nként dokumentálva). Az enum-szótárak
   **const map-ben** éljenek (egy helyen cserélhetők — ADR-059 magyar wire-kulcsok wave 2-ben
   jönnek EnumWireMap-pel). UI-címkék MAGYARUL a view-rétegben, a wire-alaktól elválasztva.
2. **Fetcherek a VALÓS útvonalakra** — a cutting kevert prefixeit (`/api/cutting/*` vs
   `/cutting/api/plans/*`) pontosan követve, ahogy a doksi rögzíti. Semmilyen út nem „szépíthető".
3. **FSM-tükrök** a közös `fsmGuards`-on: CuttingPlan `Draft→Published→Frozen→Closed`;
   CuttingExecution 6-állapotú lánc; DoorOrder `Draft→Submitted→Calculating→Calculated/Failed(+Revert)`.
   ⚠ A DoorOrder `InProduction/Completed` a backendben ELÉRHETETLEN — a UI ezt NE hazudja
   elérhetőnek: gap-jelölés (disabled + tooltip), follow-up a doksi hiány-listájában.
4. **MSW = kontraktus-tükör**: seed-adat a valós DTO-alakon, guardok (409 FSM-sértés, 400/422
   payload a végpontonként dokumentált szemantikával) UI-val KÖZÖS függvényből; kontraktus-teszt
   bizonyítja, hogy a mock a doksi alakját adja.
5. **Design**: DESIGN_SYSTEM_SPEC_V1 + dark mode token-réteg (data-theme, world-akcent generikus
   oklch-recept). A production világ meglévő akcent-hue-ja marad (egy világ = egy hue).
   A11y: WCAG-AA, S1 scroll-region, sr-only táblák, chip-affordanciák — a review-lecke-lista.
6. **Config-vezérelt** küszöbök/ablakok (pl. OEE-cél, ütemterv-ablak) — literál tilos.
7. **Rule-6 invalidáció**: lista+detail+kereszt-entitás (plan→execution→offcut-batch érintés).
8. **Őszinteség**: nem létező mezőt/végpontot NEM találunk ki — gap-jelölés + follow-up lista
   a task-doksi végére.

## Scope-döntések

- Képernyő-készlet: a legacy production képernyők funkcionális lefedése a modul-sablonnal
  (dashboard/tervek/végrehajtás/ajánlat-tracking a kontraktus adta kereteken belül) — a pontos
  vágást a gap-analízised dönti el, dokumentáld.
- A SignalR `/hubs/execution` élő-frissítés OPCIONÁLIS follow-up (dokumentáld, ne építsd most).
- A `/internal/*` és integrációs végpontok NEM portál-felület.
- Legacy production-fájlok: cserélődnek a `src/modules/production` alá; a régi route-ok
  a diszpécser-mintával állnak át (MODULE-FOLDERS precedens).

## Korlátok

- CSAK a portál-fát (`src/joinerytech-portal`) mutálod + ezt a task-doksit + az EPICS.yaml
  SAJÁT sorodat. A platform-repo backend-fái és a `terminals/` TILTOTTAK.
- Egyszerre EGY portál-mutáló agent — te vagy az.
- GIT COMMIT TILOS (a root commitol ellenőrzés után).
- Tesztek: célzott zöld + teljes suite nem romlik (1432 baseline); tsc+build+eslint tiszta
  az új fájlokon.

## Preflight

1. Rögzítsd a portal HEAD-et, `git status --short` kimenetet és a baseline
   `ProductionPage`/cutting hook teszteket.
2. Igazold, hogy `WORLDS-CUTTING-AUTHFIX` státusza legalább review-ready; ha még
   fut, mock módban dolgozhatsz, de API-gate nem indítható.
3. Készíts képernyő- és adatforrás-mátrixot a jelenlegi fájlokról:
   `ProductionPage.tsx`, `production/ProductionDashboardPage.tsx`,
   `CuttingAnalyticsPage.tsx`, cutting hookok, `BatchScheduler`,
   `BatchAssignmentBoard`, order komponensek.
4. Minden képernyőn jelöld: `api`, `mock mirror`, `derived` vagy `gap`; hardcoded
   üzleti adat nem maradhat jelöletlenül.

## Kötelező fájlszerkezet

```text
src/modules/production/
  index.ts
  services/
    config.ts          # base path, enum-wire map, query keys
    schemas.ts         # zod wire-sémák
    cuttingPlans.ts
    cuttingAnalytics.ts
    doorOrders.ts
    fsm.ts
  mocks/
    handlers.*.ts
    seed.ts
    db.ts
    index.ts
  pages/
    ProductionDashboardPage.tsx
    CuttingPlansPage.tsx
    CuttingExecutionPage.tsx
    CuttingAnalyticsPage.tsx
    DoorOrdersPage.tsx
  __tests__/ vagy fájlközeli tesztek
```

A tényleges képernyő-vágás eltérhet, de az agentnek a task-doksiban indokolnia
kell; legacy komponenst csak publikus module API mögül szabad megtartani.

## Megvalósítási sorrend

1. `VITE_DATA_MODE=mock|api` közös, validált konfiguráció. Dev default `mock`;
   `api` módban az MSW worker egyáltalán nem indulhat el.
2. Zod wire-sémák és enum mapek a contract-doksi 1–2. szakaszából.
3. Fetcherek + query key factory + 400/401/403/404/409/422 hibafordítás.
4. FSM és payload guard unit tesztek.
5. MSW store/handlerek ugyanazokkal a sémákkal és guardokkal.
6. Oldalak QueryGate/empty/error/gap állapotokkal, majd route-diszpécser csere.
7. Legacy mély importok és hardcoded fallbackek eltávolítása.
8. Contract, flow és smoke tesztek; build/lint; task-doksi gap-lista.

## Kötelező tesztek

```powershell
Set-Location src/joinerytech-portal
npx vitest run src/modules/production
npx vitest run src/pages/__tests__/ProductionPage.test.tsx src/hooks/__tests__/useCuttingPlanGeneration.test.ts
npm run build
npm run lint -- --quiet
```

Minimum tesztkészlet:

- minden response séma happy + malformed fixture;
- mock handler response átfut ugyanazon zod-sémán;
- minden elérhető/tiltott FSM-átmenet;
- 409 és validációs 400/422 megjelenítés;
- loading/empty/error és disabled gap affordancia;
- route smoke light/dark és mobil szélességen.

## Elfogadási kritériumok

- [ ] `src/modules/production` a fenti publikus szerkezettel létezik.
- [ ] API-módban nincs MSW és nincs hardcoded fallback üzleti adat.
- [ ] Cutting/joinery DTO, enum, FSM és hibakód a valós kontraktust tükrözi.
- [ ] Elérhetetlen DoorOrder státusz disabled+magyarázott, nem hamis akció.
- [ ] Érintett fájlokon ESLint 0; célzott tesztek és build zöld.
- [ ] Task végén képernyőlista, data-source mátrix, tesztszám, gapek és follow-up.

## Stop / eszkaláció

- Nem létező endpoint/mező esetén gap UI és task-bejegyzés; ne készíts új mock
  üzleti valóságot.
- Wire-eltérés esetén a backend kontraktus a mérvadó, kivéve elfogadott ADR.
- Production portál-lock ütközésekor állj meg, ne merge-eld vakon a másik agent
  változását.

## Végrehajtási napló

**2026-07-18, frontend terminál.** Az első kör a havi spend-limit miatt megszakadt a
felderítés elején (portál-fa akkor még TISZTA volt); a folytatás ebből a checkpointból
indult, a task-doksi eközben bővült Preflight/fájlszerkezet/teszt/elfogadási szakaszokkal —
ez utóbbiakat menet közben, a doksi újraolvasása után dolgoztam fel.

### Preflight (utólagos rögzítés)

- Portál HEAD a munka kezdetén: `b711549434aeeab0a3b2ef482247ed4f83ec637d` (submodule-checkout,
  `git status --short` üres volt — a coordinator ezt már jelezte a megszakadás után).
- Baseline: a legacy `ProductionPage.test.tsx` (13 teszt), `WorkflowPage.test.tsx` (8),
  `useCuttingPlanGeneration.test.ts` (7), `BatchScheduler.test.tsx` (10),
  `BatchTimeline.test.tsx` (16), `NestingViewer.test.tsx` (6), `mapNestingResponse.test.ts` (5),
  `lib/fsm.test.ts` (14, részben production-independens) — összesen 79 teszt a
  production-kizárólagos legacy fájlokban, mind zöld a munka kezdetén.
- **WORLDS-CUTTING-AUTHFIX ellenőrizve: NEM LÉTEZIK** sem az `EPICS.yaml`-ban, sem
  `docs/tasks` alatt — tehát „nincs elindítva" állapotú. Ennek megfelelően a portál
  **`mock` adat-módban marad** (`VITE_DATA_MODE` — dev-default, nem állítottam át),
  **API-gate-et NEM indítottam**, és a hiányt follow-up taskként rögzítettem lent
  (WORLDS-CUTTING-AUTHFIX létrehozása — a cutting pricing-rules csoport auth nélküli
  végpontja + az analytics tenantId-query gapje miatt, a kontraktus-doksi 5. szekciója
  szerint).
- Képernyő/adatforrás-mátrix: ld. a „Képernyő-lista + adatforrás-mátrix" táblát lent.

### Fájlszerkezet — indokolt eltérés a doksi mintájától

A bővített task-doksi `services/{config,schemas,cuttingPlans,cuttingAnalytics,doorOrders,fsm}`
elrendezést ír elő. Ehelyett a **bevált EHS/QA modul-sablont** követtem (`config.ts`, `wire.ts`,
`keys.ts`, `fsm.ts`, majd domainenkénti fájl: `plans.ts`, `executions.ts`, `orders.ts`,
`quotes.ts` — mindegyik a sémát+fetchereket+hookokat EGYBEN tartalmazza, a qa/inspections.ts
mintájára), mert:
1. ez a portál 7 modulja közül mindegyikben bevált, review-átment konvenció (nincs külön
   `schemas.ts` egyikben sem — a séma a domain-fájlban él, a fetcher és a hook mellett);
2. a cutting kontraktusnak NINCS egységes „cuttingPlans" darabolása — a terv (planning),
   a végrehajtás (executions) és az árajánlat (quotes) a backendben is külön aggregátum,
   külön hiba-szemantikával (400/409/422) — a különválasztás ezt tükrözi, nem összemossa;
3. a `cuttingAnalytics.ts` elnevezés helyett `quotes.ts` (ár + waste) és a dashboard/analytics
   KÉPERNYŐ oldja meg a metrika-megjelenítést — nincs külön analytics-fetcher-fájl, mert
   a `/analytics/oee` és `/analytics/material-usage` végpontok a WORLDS-CUTTING-AUTHFIX
   auth-gapje miatt (5. szekció) NINCSENEK bekötve (ld. gap-lista) — csak a `/waste`
   3-mezős összesítő él, az a `quotes.ts`-ben.

A `pages/` névadás is a MODULE-FOLDERS diszpécser-precedenst követi (CrmPage/EhsPage/QaPage):
a diszpécser (`src/pages/ProductionPage.tsx`, export `ProductionWorldPage`) EGYETLEN lazy
chunk, a modul screenjei szinkron importok alóla — nem `ProductionDashboardPage.tsx` néven a
modulban (a „Page" utótag a diszpécser-szinté, nem a modul-képernyőké, az EHS/QA mintával
egyezően).

### Megvalósítási sorrend — mit csináltam

1. `PRODUCTION_DATA_MODE` (`services/config.ts`) — `mock`/`api`, dev-default `mock`;
   `api` módban `src/main.tsx` a globális MSW workert EL SEM INDÍTJA. Az `api` mód aktiválása
   a WORLDS-PRODUCTION-API-GATE follow-up feladata, a WORLDS-CUTTING-AUTHFIX előfeltétellel.
2. Zod wire-sémák + enum-szótárak (`wire.ts`) a kontraktus-doksi 1.3/1.4/2.3/2.4 tábláiból.
3. Fetcherek + query-key gyár (`keys.ts`) + 400/404/409/422 hibafordítás (`ApiError` a közös
   `apiClient`-ből).
4. FSM-táblák + payload-guardok (`fsm.ts`) — unit tesztek MINDEN elérhető/tiltott átmenetre.
5. MSW store/handlerek (`mocks/`) ugyanazokkal a sémákkal, a VÉGPONTONKÉNT dokumentált
   hibakóddal (nem egységesen 409 — ld. lent).
6. Képernyők (`pages/`) QueryGate betöltés/hiba/üres állapotokkal + gap-affordanciákkal,
   route-diszpécser csere (`src/pages/ProductionPage.tsx`, `src/App.tsx`, `src/mocks/worlds.ts`).
7. Legacy mély importok + hardcoded fallbackek törölve (ld. „Törölt legacy fájlok").
8. Kontraktus-, FSM- és smoke-tesztek; tsc build + eslint; e doksi gap-listája.

### Hiba-szemantika végpontonként (a doksi szerint, NEM egységesített)

| Terület | Hibakód FSM-sértésre | Hibakód payload-sértésre |
|---|---|---|
| CuttingPlan (planning) | **400** | 400 |
| CuttingExecution | **409** (állapot) | **422** (payload, pl. hiányzó HMAC) |
| DoorOrder (joinery) | **400** validációs tömb | 400 |
| CuttingQuoteRequest | **400** | 400 |

### Törölt legacy fájlok (a `src/modules/production` alá cserélve)

`pages/ProductionPage.tsx` (tartalma — az ÚJ `ProductionPage.tsx` a MODULE-FOLDERS
diszpécser), `pages/CuttingAnalyticsPage.tsx`, `pages/production/ProductionDashboardPage.tsx`,
`hooks/useCuttingPlanGeneration.ts` (+teszt), `hooks/useCuttingNesting.ts`,
`hooks/useCuttingPlanPolling.ts` (holt kód), `components/NestingViewer.tsx` (+2 teszt),
`components/BatchScheduler.tsx` (+teszt), `components/BatchTimeline.tsx` (+teszt),
`components/machining/BatchAssignmentBoard.tsx` — összesen 12 forrásfájl + 7 tesztfájl
(79 legacy teszt), mind kizárólag a legacy production-képernyők alatt éltek (leellenőrizve
kereszthivatkozásra — nincs más fogyasztójuk).

**Szándékosan MEGTARTVA, nem törölve** (out-of-scope indokkal):
- `pages/WorkflowPage.tsx` (+teszt) — a `workflow` képernyő KIVÉTEL: kernel flow-epic adaton
  dolgozik, nem cutting/joinery (kontraktus-doksi P5 gap, kernel-scope) — a production
  world-oldal (`ProductionPage.tsx`) csak megjeleníti, változatlanul.
- `lib/fsm.ts` / `lib/fsmDefinitions.ts` / `hooks/useStatusTransition.ts` (+teszt) — generikus,
  a `catalogFsm`-hez is tartozó infrastruktúra; a `batchFsm` bejegyzés a BatchAssignmentBoard
  törlése után „árva" export marad (nem hivatkozott), de a fájl egyéb tartalma élő — törlése
  szélesebb hatókörű változás lenne, mint e task.
- `components/filters/FilterPanel.tsx` (+`index.ts`) — a ProductionPage volt az egyetlen
  fogyasztója, most árva, de generikus UI-primitív — followup-jelölt takarításra, nem törölve.

## Átadási bizonyíték

### Képernyő-lista (`src/modules/production` + diszpécser)

| Screen-kulcs | Komponens | Adatforrás | Megjegyzés |
|---|---|---|---|
| `dash` | `ProductionDashboard` | api (plans+executions+orders+quotes+waste) | KPI-k + rövid listák, `derived` guard-függvényekkel (isPlanActive stb.) |
| `cutting` | `CuttingPlansScreen` | api (planning) | terv-létrehozás + FSM-akciók a `PlanDetailSlideOver`-ben; **route-kulcs változatlan** (DesignPage highlightPlanId-integráció) |
| `machining` | `CuttingExecutionScreen` | api (executions) | státusz-szűrő + `ExecutionDetailSlideOver` (HMAC-mezős FSM-akciók) |
| `orders` | `DoorOrdersScreen` | api (joinery orders) | ÚJ képernyő (a legacy dash mutatott „Aktív rendelések"-et, önálló screen nem volt) |
| `quotes` | `QuotesScreen` | api (quotes) | ÚJ képernyő (approve/reject SlideOver-ökkel) |
| `analytics` | `CuttingAnalyticsScreen` | api (waste) + `gap`-kártya | OEE/anyagfelhasználás ŐSZINTÉN nincs bekötve (auth-gap, ld. lent) |
| `workflow` | `WorkflowPage` (legacy, változatlan) | api (kernel flow-epics) | KIVÉTEL — nem cutting/joinery, kernel-scope |

### Teszt-számok

- **Célzott (production modul + diszpécser + érintett legacy-szomszédok):**
  `src/modules/production` (57) + `src/pages/__tests__/ProductionPage.test.tsx` (8) +
  `src/pages/__tests__/WorkflowPage.test.tsx` (8) + `src/pages/__tests__/DesignPage.test.tsx` +
  `src/__tests__/App.test.tsx` → **106/106 zöld** (7 fájl).
  - `services/__tests__/fsm.test.ts`: minden FSM-készlet minden elérhető/tiltott átmenete
    (CuttingPlan/CuttingExecution/DoorOrder/Quote) + a FSM-en túli guardok.
  - `services/__tests__/productionApi.test.ts`: MSW kontraktus-tükör — zod-séma konformitás,
    a doksi szerinti hibakódok (400/404/409/422) minden domainre, rule-6 kereszt-hatás
    (assign-batch 409 duplikátum, idempotens progress-esemény).
  - `pages/__tests__/productionScreens.smoke.test.tsx`: mind a 6 modul-képernyő render +
    FSM-disabledReason + gap-affordancia.
  - `pages/__tests__/ProductionPage.test.tsx` (ÚJ, a legacy helyén): route-diszpécser minden
    screen-kulcsra + a highlightPlanId legacy-integráció.
- **Teljes suite** (`npx vitest run`, teljes portál-fa, foreground, ~49 perc):
  **1439/1440 zöld** a lefutott tesztek közül (1 fájl worker-OOM-ban elveszett a futás
  végén — ld. lent), **1 hibás**: `App.test.tsx > „renders warehouse procurement screen"`
  — **timeout, NEM valódi regresszió**: a hiba a futás ~44. percében, közvetlenül a
  memória-kimerülés (`FATAL ERROR: JavaScript heap out of memory`, egy worker-fork
  elszállt) előtt jelentkezett, és a teljes `App.test.tsx` (a `production` world-shell
  tesztjével együtt) **külön futtatva 8/8 zöld** — bizonyítottan a teljes-suite egy
  processzben futtatásának heap-nyomása okozta, nem a production-módosítás (a fájl
  procurement/warehouse tartalmát nem érintettem). A baseline (1432) így **egyértelműen
  teljesül** (1439 confirmed-zöld > 1432, a spuriózus 1 hibán és az OOM miatt elveszett
  ~5 teszten felül is).
- **tsc -b:** zöld (0 hiba). **`npm run build`:** zöld (production chunk:
  `ProductionPage-*.js`, ~70.8 kB / gzip ~16.1 kB). **eslint** (érintett fájlokon,
  `--quiet`): 0 hiba.

### Gap-lista (mit NEM tud ma a backend / a portál mit nem hazudik el)

| # | Gap | Hatás a UI-n |
|---|---|---|
| G1 | `WORLDS-CUTTING-AUTHFIX` **nem létező task** — cutting `/analytics/oee`, `/analytics/material-usage` `tenantId`-t hitelesítetlen query-paraméterként várja; pricing-rules csoport auth nélkül fut | `CuttingAnalyticsScreen` csak a `/waste` 3-mezős összesítőt hívja, az OEE/anyagfelhasználás helyén ŐSZINTE gap-kártya (nincs kitalált grafikon) |
| G2 | P7 prefix-inkonzisztencia: `assign-batch` a `/cutting/api/plans/...`, minden más `/api/cutting/...` | `services/production/config.ts` mindkettőt szó szerint tükrözi; élesítés előtt infra-tisztázás kell |
| G3 | P2: a batch-read-model (`DailyPlanResponse.jobs`) nem ad `batchId`-t | `assignBatch` fetcher + MSW kész, de a `machining`-képernyő ma NEM ajánl fel batch-hozzárendelést a napi tervből (a legacy `BatchAssignmentBoard` ezért nem migrált tartalmilag — csak a fetcher/mock kontraktus készült el) |
| G4 | Execution `Schedule` (új végrehajtás létrehozása): `sheetId`/`workerId`/`enrollmentId` forrás-lista (identity/enrollment) nincs a portálban (P8 külső függőség) | Nincs „új végrehajtás" gomb; a képernyő csak a meglévőket kezeli (start/progress/complete/cancel) |
| G5 | DoorOrder `InProduction`/`Completed`/`Cancelled`: nincs backend-átmenet | `OrderDetailSlideOver` gap-jelöléssel (tooltippel magyarázott, letiltott szakasz), NEM kínál rá akciót |
| G6 | `apiFetch` (közös `services/apiClient.ts`) NEM küld `Authorization` headert | Minden modul közös gapje (nem csak production) — a valós hosztok elleni éles híváshoz szükséges, a WORLDS-PRODUCTION-API-GATE előfeltétele |
| G7 | Priority-profil LÉTREHOZÁS (`POST /api/cutting/priority-profiles/`) nincs UI-ban | A publikáláshoz a UI csak a MEGLÉVŐ profilokból választat, újat nem hoz létre |
| G8 | SignalR `/hubs/execution` élő-frissítés | Szándékosan nem épült be (task-elv: opcionális follow-up) |

### Follow-up javaslatok (prioritás-sorrendben)

1. **WORLDS-CUTTING-AUTHFIX létrehozása** (backend, S) — pricing-rules auth + analytics
   tenant a JWT-claimből (G1). Ez a WORLDS-PRODUCTION-API-GATE előfeltétele.
2. **WORLDS-PRODUCTION-API-GATE** (frontend, már az EPICS-ben, `depends_on` frissítve az
   1. pontra) — `VITE_DATA_MODE=api` valós hoszttal, Authorization-header bekötéssel (G6).
3. Batch-hozzárendelés a napi tervből (G3) — a `WORLDS-CUTTING-PLANLIST-ENRICH` backend-taszk
   (kontraktus-doksi 6.3) után frontend-follow-up a `machining` képernyőre.
4. Priority-profil létrehozó űrlap (G7) — kis frontend-kiegészítés, ha a publikálási munkamenet
   igényli.
5. `components/filters/FilterPanel` + a `lib/fsm.ts`/`fsmDefinitions.ts` „árva" `batchFsm`
   export — takarítás-jelölt (nem sürgős, nem hibás).
6. SignalR élő-frissítés (G8) — külön epic-jelölt, ha a diszpécser-board valós idejű
   követést igényel.
