# F2-EHS-FE — EHS modul-képernyők + adatréteg-minta (Fázis 2 első modul)

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-14) · **Fázis:** F2
- **Előfeltétel:** F2-EHS-BE (27 új endpoint, `src/ehs/docs/openapi.yaml`) · F1 primitívek (Button disabledReason, SlideOver, Tabs, DataTable, Toast, tokenek)

## Feladat

Az EHS modul (⚠️ CHANGES REQUESTED + nyitott scope) portál-oldali kiépítése az új backend-kontraktusra:
1. **Adatréteg-minta** (a többi modul számára másolható): típusos kliens + zod sémák + TanStack Query hookok + állapottartó MSW-tükör FSM-guardokkal (tiltott átmenet → 409).
2. Baleset-bejelentő **wizard bekötése** (FAB mount + locations API a hardcode-olt mock-lista helyett).
3. **Esemény-FSM UI**: validált átmenet-akciók a detail SlideOverben (tiltott átmenet = disabled + tooltip, nem rejtett) + CAPA lista, optimista frissítés, 409 → toast + állapot-újraszinkron.
4. **Új képernyők**: SDS/veszélyes anyagok, EVE/PPE-kiadás, bejárások + egységes CAPA-tábla.
5. **Dashboard KPI-k** az új területekre.

## Kivitelezés

### 1. Adatréteg (`src/services/apiClient.ts` + `src/services/ehs/` — MINTA, ld. README)
- `apiClient.ts` (ÚJ, generikus): query-string építés, JSON body, hiba→`ApiError` (status + backend `ErrorResponse.message`), zod-válaszvalidálás, `isConflict()` helper.
- `services/ehs/`: `config.ts` (API base, 30 napos lejárat-ablak), `keys.ts` (hierarchikus query-kulcs gyár), `fsm.ts` (**átmenet-táblák = a backend guardok tükre, a UI ÉS az MSW közös igazságforrása**; `canTransition`, `transitionBlockReason` magyar indoklással), `validity.ts` (SZÁMÍTOTT mezők: `computeSdsValidity` Valid/Expiring/Expired, `isPpeIssuanceExpired`), `employees.ts` (ÁTMENETI dolgozó-névtár a HR-lookup API-ig).
- Domainenként egy modul (zod séma + fetcher + hook): `locations`, `incidents` (FSM-mutáció **optimista frissítéssel**: onMutate cache-átírás → onError rollback+toast → onSettled invalidálás), `materials` (renew-sds), `ppe` (kiadás-FSM: acknowledge/return/replace), `safetyWalks` (start/complete/close/cancel + finding→CAPA), `capa` (egységes tábla + complete).
- `README.md`: a minta szabályai (séma=kontraktus, FSM-akció=dedikált végpont, tiltott akció nem rejtett, mutáció-toast a hookban, MSW-tükör) — a CRM/HR/… ezt másolja.

### 2. MSW kontraktus-tükör (`src/mocks/ehsApi/`)
- Állapottartó in-memory store (`db.ts`, `resetEhsDb()` teszt-izolációhoz) + determinisztikus, „most"-hoz relatív seed (`seed.ts`, stabil `SEED_IDS`).
- Domainenkénti handler-fájlok, összesen a 27 új endpoint + incidens-CRUD/FSM + a wizard `POST /api/ehs/events`-e (ez most már **beírja az incidenst a store-ba**, így a lista-invalidálás után megjelenik).
- FSM-guardok a `services/ehs/fsm.ts`-ből → tiltott átmenet **409** a backenddel egyező viselkedéssel; bejárás-lezárás guard (nyitott CAPA → 409); számított mezők (sdsValidity, isExpired, findingCount) a szerializálókban; az incidens `correctiveActions` listája az egységes CAPA store-ból áll össze (unified CAPA).
- Bekötve a globális `mocks/handlers.ts`-be (a régi ad-hoc events-handler kivezetve).

### 3. Wizard bekötése (task 2)
- `IncidentReportFAB` mount az EHS világba (`EhsPage`), `onSuccess` prop: siker-toast + esemény-lista invalidálás.
- `StepDetails`: hardcode-olt mock-helyszínlista → `useEhsLocations({activeOnly:true})` (betöltés-állapot a selectben, hiba → error-toast); `StepReview` ugyanabból a cache-ből oldja fel a helyszín-nevet.

### 4. Esemény-FSM UI (task 3)
- `pages/ehs/IncidentDetailSlideOver.tsx` + `IncidentTransitionPanel.tsx`: mind a 4 akció-gomb látható (Kivizsgálás indítása / Intézkedés rögzítése / Lezárás / Újranyitás); tiltott átmenet → `Button disabledReason` (aria-disabled + tooltip); engedélyezett akció → inline mini-űrlap (kivizsgáló, intézkedés+felelős+határidő, lezárási megjegyzés, újranyitás indoka); FSM-stepper (új `components/ui/FsmStepper.tsx` primitív) + CAPA-lista.
- Megjegyzés: a terv `elutasitva` ága a backend-kontraktusban NEM létezik (helyette `Reopened` van) — a UI a valós kontraktust követi; az eltérés eszkalálandó a root felé.

### 5. Új képernyők (task 4) — worlds-config: dash / incidents / risks / **sds / ppe / walks**
- **SDS** (`SdsScreen` + `SdsDetailSlideOver`): DataTable (tábla↔kártya kettős render), SDS-érvényesség StatusPill **számított tónussal** (Valid=success / Expiring=warn / Expired=danger), GHS-chipek, „SDS megújítása" akció (archivált anyagon disabledReason).
- **EVE/PPE** (`PpeScreen` + `PpeIssueForm`): Kiadások + Katalógus fül (Tabs), dolgozó-szűrő, kiadás-FSM gombok (Átvétel/Visszavétel/Csere) guard-indoklással, lejárt kiadás danger-jelvény, új kiadás űrlap (lejárat elhagyható → defaultLifetimeMonths).
- **Bejárások** (`WalksScreen` + `WalkDetailSlideOver` + `CapaBoard`): lista + ütemezés-űrlap; detail FSM-stepperrel (ütemezett→folyamatban→intézkedés→lezárt, +elmaradt mellékág), megállapítás-rögzítés csak Folyamatban (CAPA-generálással: felelős+határidő), lezárás-guard 409 → toast; **egységes CAPA-tábla fül** (esemény+bejárás+kockázat források együtt, késésben-kiemelés, Teljesítés akció). A régi `actions` képernyő-útvonal a CAPA-fülre képződik le (visszafelé kompatibilis).
- `EhsPage.tsx` vékony diszpécserré refaktorálva; a régi képernyők a `pages/ehs/` alá bontva (`RisksScreen` egyelőre statikus mockon — a backend 5×5 mátrix-migráció külön task).

### 6. Dashboard (task 5)
- `pages/ehs/EhsDashboard.tsx`: 6 KPI a query hookokból — Esemény (API totalCount), **Lejáró SDS**, **Nyitott CAPA**, **Lejáró EVE**, **Esedékes bejárás**, Magas kockázat; KPI-kártyák kattinthatók (képernyő-navigáció); „Legutóbbi események" az API-ból, detail SlideOverrel.

### 7. Tokenek
- `theme/fsmTones.ts`: +2 FSM-készlet (`ehsPpeKiadas`, `ehsBejaras`) kanonikus magyar kulcsokkal + backend enum-aliasok (`Issued→kiadva`, `Scheduled→utemezett`, ill. az incidens PascalCase kulcsai); `Reopened` → extra `warn` tónus.

## Eredmény

- Az EHS az **első modul HTTP-s, típusos, FSM-guardos adatréteggel** — a minta dokumentált, a többi modul másolhatja.
- A gap-analízis EHS-hiányai lezárva: wizard bekötve ✅, locations-TODO kiváltva ✅, SDS ✅, EVE/PPE ✅, bejárás→CAPA ✅, egységes CAPA ✅, FSM-akciók a UI-ban ✅ (tiltott átmenet látható+indokolt), dashboard-KPI-k ✅.
- Build zöld, bundle: az EHS a saját lazy chunkjában (EhsPage ~155 kB raw / ~47 kB gzip — zod-dal együtt).

## Fájlok

**ÚJ** — adatréteg: `src/services/apiClient.ts`, `src/services/ehs/{README.md,index.ts,config.ts,keys.ts,fsm.ts,validity.ts,employees.ts,locations.ts,incidents.ts,materials.ts,ppe.ts,safetyWalks.ts,capa.ts}`
**ÚJ** — MSW: `src/mocks/ehsApi/{index.ts,seed.ts,db.ts,handlers.locations.ts,handlers.incidents.ts,handlers.materials.ts,handlers.ppe.ts,handlers.walks.ts}`
**ÚJ** — UI: `src/components/ui/FsmStepper.tsx`, `src/pages/ehs/{labels.ts,QueryGate.tsx,formFields.tsx,EhsDashboard.tsx,IncidentsScreen.tsx,IncidentDetailSlideOver.tsx,IncidentTransitionPanel.tsx,RisksScreen.tsx,SdsScreen.tsx,SdsDetailSlideOver.tsx,PpeScreen.tsx,PpeIssueForm.tsx,WalksScreen.tsx,WalkDetailSlideOver.tsx,CapaBoard.tsx}`
**MÓDOSÍTVA:** `src/pages/EhsPage.tsx` (391→~50 sor diszpécser), `src/components/EHS/{StepDetails,StepReview,IncidentReportFAB}.tsx`, `src/mocks/{handlers.ts,worlds.ts}`, `src/theme/fsmTones.ts`, `src/components/ui/index.ts`
**TESZT:** `src/services/ehs/__tests__/{incidentFsm,sdsValidity,ppeWalkFsm}.test.ts`, `src/pages/ehs/__tests__/{IncidentDetailSlideOver.test.tsx,ehsScreens.smoke.test.tsx,ehsTestUtils.tsx}`, frissítve: `src/pages/__tests__/EhsPage.test.tsx`, `src/components/EHS/__tests__/IncidentReportWizard.test.tsx`, `src/theme/__tests__/statusTones.test.ts`

## Tesztek

- **Új/frissített EHS-tesztek: 64/64 zöld** (8 fájl):
  - adatréteg (msw/node + `resetEhsDb`): incidens-FSM teljes legális lánc + 409 guard + 404 + unified-CAPA; SDS validitás-számítás határértékekkel + validity-szűrő + `/expiring` + renew-sds flip + tone-térkép; EVE-FSM (átvétel/visszavétel/csere + terminális 409 + számított isExpired); bejárás-FSM teljes út (finding→CAPA→complete→close-guard 409→CAPA kész→close) + megállapítás-guard + cancel-guard.
  - UI: átmenet-gomb logika (engedélyezett vs. aria-disabled + tooltip-indok, lenyelt kattintás, átmenet utáni gomb-állapotváltás); smoke render mind az 5 képernyőre; EhsPage route-teszt (FAB mount, új képernyők, legacy `actions`→CAPA); wizard locations-API teszt.
- **Teljes suite:** `npx vitest run` → **1157 passed / 19 failed** — a 19 hiba a dokumentált, F2-EHS-től független pre-existing készlet (BOMPreviewCard ×6, configurator ×4, catalogFilterPersistence ×5, ProcurementPage ×5... összesen a korábbról ismert 19).
- **Build:** `npm run build` ✅ (tsc -b + vite) · **ESLint:** módosított fájlok tiszták (a handlers.ts két örökölt `any`-je is javítva).

## Nyitott kérdések / follow-up

1. **`elutasitva` ág**: a terv-FSM-ben szerepel, a backend-kontraktusban nincs (helyette `Closed→Reopened`) — root-döntés kell (backend bővítés vagy terv-módosítás).
2. A bejelentő wizard szövegei még angolok (pre-existing) — HU-lokalizáció külön mini-task.
3. `RisksScreen` statikus mockon — a backend 5×5 risk-assessment API-ra kötés külön task.
4. Dolgozó-névtár (`services/ehs/employees.ts`) ÁTMENETI — HR-lookup API bekötésekor kiváltandó.
