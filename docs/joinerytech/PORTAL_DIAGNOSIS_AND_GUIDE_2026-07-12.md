# JoineryTech Portal — Diagnózis + Munkaútmutató

> Készítette: Cabinet root (friss Claude Code session), 2026-07-12
> Vizsgált artefakt: a **valódi portál** — `Szantoi/joinerytech-portal` (React 19 + Vite 8 +
> TypeScript), NEM a `docs/joinerytech/` prototípus.
> Módszer: tényleges `npm install` → `tsc -b` → `vite build` → `vitest run` + statikus elemzés.

---

## 1. Vezetői összefoglaló (a valós állapot)

A portál **NEM törött** — strukturálisan kész és fordul. A "nem sikerült teljesen"
három konkrét dologra bomlik, egyik sem blokkoló:

| Terület | Állapot | Súlyosság |
|--------|---------|-----------|
| TypeScript fordítás (`tsc -b`) | ✅ tiszta, 0 hiba | — |
| Production build (`vite build`) | ✅ átmegy | ⚠️ 1.89 MB egyetlen chunk (nincs code-splitting) |
| Teszt-egészség | ✅ **single-fork futásban 100% zöld** (1023 teszt) | — |
| Teszt CI-stabilitás | ⚠️ párhuzamos futásban **worker-OOM crash** → 20 ál-bukás | KÖZEPES (infra) |
| Függőség-telepítés | ⚠️ `npm install` **elszáll** (peer-dep), csak pnpm/`--legacy-peer-deps` | KÖZEPES |
| Backend-integráció | ❌ minden **MSW-mockon** fut, nincs valós backend-URL | ez a fő "hiány", de a backend maga is még terv |
| Prototípus-élmény lefedettség | ⚠️ ~44 oldal a ~90-ből; az FSM-governance/deep-link élmény hiányos | NAGY, de inkrementális |

**Egy mondatban:** a UI-váz és a data-réteg (react-query) kész és tesztelt, de (a)
mockokon fut valós backend helyett, (b) a prototípus gazdag élményének utolsó mérföldje
hiányzik, (c) a fejlesztői környezet két súrlódása (peer-dep + teszt-worker-OOM) lassítja a csapatot.

---

## 2. Fejlesztői környezet — 2 konkrét javítás (ezek lassítják a csapatot)

### 2.1 `npm install` elszáll — peer-dep ütközés
```
ERESOLVE: react-slider@2.0.6 peer react "^16 || ^17 || ^18"  ✗  a projekt react@19
```
**Miért baj:** aki `npm install`-t futtat (nem pnpm-et), annál a telepítés MEGÁLL — ez
tipikus "nekem nem indul el" élmény, ami órákat visz el.
**Javítás (válassz egyet):**
- (A) `react-slider` lecserélése React-19-kompatibilisre (pl. `rc-slider`, vagy natív
  `<input type=range>` + Tailwind) — végleges megoldás.
- (B) Rögzített `.npmrc` a repóban: `legacy-peer-deps=true` — azonnali, de csak elfedi.
- (C) Dokumentált **pnpm** mint kizárólagos package manager (a `pnpm-lock.yaml` már megvan) +
  a `package-lock.json` törlése, hogy ne legyen két lockfile.
> Ajánlás: (A) + (C). Két lockfile (`package-lock.json` ÉS `pnpm-lock.yaml` egyszerre) önmagában hibaforrás.

### 2.2 Teszt-worker OOM crash párhuzamos futásban
`vitest run` (alap, forks-pool, párhuzamos): **20 "bukás"** — de a hibák valójában
`Worker exited unexpectedly` / `emitUnexpectedExit`, NEM assert-hibák. **Single-fork
futásban mind az 1023 teszt ZÖLD.** Az ok a nehéz környezet-setup (`environment: 793s`,
jsdom + globális setup minden fájlnál).
**Javítás:**
- `vitest.config.ts`: `test.pool='forks'`, `poolOptions.forks.maxForks=2` (vagy `singleFork`
  CI-ben), és/vagy `test.isolate=false` ahol biztonságos.
- A `test-setup.ts` könnyítése (a globális MSW-server + jsdom per-fájl setup a fő memória-zabáló).
> Ez azonnal megszünteti a "néha piros a CI" élményt — a tesztek maguk egészségesek.

---

## 3. Architektúra-valóság: minden MSW-mockon fut

- A data-réteg **react-query** (`useQuery`/`useMutation`) + **MSW** (`mocks/browser.ts`,
  `mocks/handlers.ts`) — 24 domén-mock (crm, sales, warehouse, controlling, ehs, hr, docs,
  interior, mfgprep, projects, quality, service, trade, masterdata, ...).
- **Nincs valós backend base URL** (`VITE_API_*` nem található) → az app soha nem beszél
  igazi szerverrel. Ez összhangban van a `BACKEND_FRONTEND_INTEGRATION_READINESS` doksival:
  a .NET backend nagyrészt még **terv** ("Implementation Pending").
- **A jó hír:** mivel react-query-hookokon megy (nem közvetlen fetch-eken), a valós backend
  bekötése többnyire **egy base-URL + a handlerek kikapcsolása** lesz, nem újraírás. A hookok
  már a helyes query-kulcs/DTO-mintát követik.

**Következmény a csapatnak:** a "backend-integráció" NEM a frontend újraírása, hanem:
1. `VITE_API_URL` bevezetése + egy vékony `apiClient` (a react-query `queryFn`-ekben).
2. MSW **fokozatos** kikapcsolása modulonként (feature-flag: `VITE_USE_MOCKS`).
3. DTO-kontraktus egyeztetése a .NET oldallal (OpenAPI) — ez a valódi hiányzó közös artefakt.

---

## 4. Modul-szintű státusz + következő lépés (moduláris munka)

Jelölés: **API-kész** = react-query-hook megvan, MSW-mockon zöld, backend-URL-re köthető ·
**Pending-TODO** = "when backend ready" jelölés a hookban · **Prototípus-rés** = a design
gazdagabb, mint a portál.

| Modul | Portál-oldal | Hook-állapot | Prototípus-rés | Következő lépés |
|-------|--------------|--------------|----------------|-----------------|
| **CRM** | CrmPage | API-kész | lead→lehetőség pipeline mélység | RefPanel deep-linkek a lehetőség↔ajánlat közt |
| **Sales/Ajánlat** | SalesPage, SalesDetail | `useSalesDetail` (pending-todo) | ItemBuilder sellable-kapu | `isCatalogSellable` kapu bekötése |
| **Katalógus/Törzsadat** | MasterdataPage | `useCatalogVersion` (3 query) API-kész | státusz-FSM governance (`setCatalogStatus`) | a `_catFlow` FSM + completeness-gate portolása |
| **Warehouse/Inventory** | InventoryPage, warehouse/ | `useMaterialCatalog` | lot/zóna/mozgás (Lots/Zone/Movement — "endpoint pending" a commitban) | a 3 pending endpoint bekötése |
| **Production/Műhely** | ProductionPage, ShopFloor, Supervisor | `useBatchAssignment`, `useLiveAssembly`, `useMachineQueue` | prodterminal, prodsched | **FSM transition API** (`BatchAssignmentBoard` 2 TODO) |
| **Gyártás-előkészítés** | MfgPrepPage, BOMPreview | — | mfg-datasheet, mfg-prep-flow/release ("kiadás a műhelynek") | a release-lánc (kiadás) portolása |
| **Szabászat/Nesting** | CuttingAnalytics | `useCuttingNesting`, `useCuttingPlanGeneration/Polling` API-kész | nesting-vizualizáció (TOP-2 részben kész) | maradékanyag-raktár lánc |
| **Konfigurátor** | ProductConfiguratorWizard | `configuratorStore` + mocks | skeleton/skeleton-presets (parametrikus) | **CAD-integráció**: a CabinetBilder Skeleton-motor bekötése |
| **HR/Jelenlét** | HrPage, AttendancePage | mock | — | API-kész, csak backend-URL |
| **EHS** | EhsPage | `IncidentReportFAB`, `StepDetails` (mock locations TODO) | — | locations-endpoint + toast |
| **Kontrolling/BI** | ControllingPage, ExecBiPage | `useKPICalculator` (számított) | EAC/óradíj-mélység | — |
| **Beszerzés** | ProcurementPage | `useRfqFilters` | rfq, procurement2, suppliermap | RFQ→PO→bevét lánc + suppliermap |
| **Termékek (mutáció)** | — | `useProductMutations` (**3 pending-todo**) | — | a 3 API-call bekötése (ma optimistic-mock) |
| **Projektek** | ProjectsPage | mock | projects-board, projects-epic, manufacturing-projects | board/epic nézetek portolása |
| **Dokumentumtár** | DocsPage | mock | — | API-kész |
| **Logisztika/Service** | LogisticsPage, ServicePage | mock | service-2 | — |

**Teljesen hiányzó design-oldalak** (a portálban nincs): `process-editor/model/run/panel`
(folyamat-modellezés — az FSM-élmény magja), `floorplan` (látványterv), `stocktake`,
`templates`, `labels`, `partner`, `outsource-settings`, `tech-request`.

---

## 5. A prototípus→portál átültetés — a hiányzó "élmény-réteg"

A prototípus `CLAUDE.md`-je szerint a portál lelke három közös minta, ami a valódi
portálban még nincs egységesen jelen:
1. **`RefPanel`** — kapcsolódó entitás kártyája: joggal „Megnyitás" deep-link, jog nélkül
   „vendég nézet". MINDEN modul-közi hivatkozásnál ezt kéne használni.
2. **`askNextStep`** — művelet utáni „Hogyan folytatod?" navigáció (webshop-stílus) —
   minden lánc-továbblépő művelet után.
3. **Státusz-FSM governance** — „soha ne találj ki státuszt", az átmenet mindig a store-akción
   át (a portálon: a react-query mutation + a backend FSM). A `BatchAssignmentBoard`
   „Call FSM transition API when available" TODO-i pont ezt jelzik.

**Javaslat:** ezt a három primitívet **egyszer** kell megépíteni a portálban (megosztott
komponens + hook), aztán modulonként bekötni — ez adja vissza a prototípus élményét
mérnöki, tesztelhető formában.

---

## 6. Prioritált roadmap (amivel a csapat holnap indulhat)

**P0 — környezet (fél nap, azonnali produktivitás):**
- [ ] `react-slider` csere React-19-re + egy lockfile (pnpm) → `npm install` mindenkinél megy.
- [ ] `vitest.config.ts` fork-limit + könnyebb setup → zöld, stabil CI.

**P1 — a backend-kötés előkészítése (a valódi hiányzó közös artefakt):**
- [ ] `VITE_API_URL` + vékony `apiClient` a react-query `queryFn`-ekbe.
- [ ] `VITE_USE_MOCKS` feature-flag → MSW modulonként kikapcsolható.
- [ ] **OpenAPI-kontraktus** egyeztetése a .NET csapattal (ez a Backend-Frontend rés #1 tétele).

**P2 — az élmény-réteg (a prototípus lelke, mérnöki formában):**
- [ ] `RefPanel` + `askNextStep` + egy közös **FSM-transition hook** megépítése + tesztje.
- [ ] Modulonként bekötés — kezdd a Katalógus/Törzsadat governance-szal (ez a "governance-otthon").

**P3 — code-splitting (a 1.89 MB → cél <1 MB):**
- [ ] Route-alapú `lazy()` + `Suspense` a nagy oldalakra (DesignPage 962 sor, SupplierPortal 1241 sor).

**P4 — hiányzó modulok** (design-alapján, értéklánc-sorrendben): mfg-prep-release (kiadás a
műhelynek) → process-model → skeleton/CAD-integráció → projects-board.

---

## 7. Módszertani megjegyzés (miért volt ez gyors)

A diagnózis tényleges build/test-futtatásból készült, nem feltételezésből: `tsc`/`vite`/`vitest`
outputból + statikus jel-elemzésből (TODO-térkép, hook↔query arány, mock-domének). Ez a
"nem építünk olyat, amit nem igazolunk" elv a diagnózisra alkalmazva — a csapat minden
állítást ellenőrizni tud a fenti parancsokkal.
