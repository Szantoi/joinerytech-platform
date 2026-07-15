# F2-MAINTENANCE-FE — Maintenance modul-képernyők + adatréteg (Fázis 2, 5. modul)

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-15) · **Fázis:** F2
- **Előfeltétel:** F2-HR-FE (érett adatréteg-sablon, 4. iteráció), F2-EHS/CRM-FE (`services/fsmGuards`), F2-KONTROLLING-FE (calc-tükör minta, S1/S2 review-leckék), F1 primitívek
- **Akcent:** cyan (worlds-config `maintenance` + `[data-world]` tokenek)

## Feladat

A Maintenance modul portál-oldali kiépítése a bevált adatréteg-mintára:
1. **Adatréteg** (`src/services/maintenance/`): zod + TanStack Query + a munkalap szigorú FSM-je a közös `services/fsmGuards`-szal; SZÁMÍTOTT eszköz-státusz + terv-esedékesség calc-tükörrel.
2. **Képernyők:** Áttekintés (KPI-k), Eszközök (lista + részlet-SlideOver), Munkalapok (FSM-akciókkal), Ütemterv (naptár-rács).
3. **Tesztek** + teljes suite + build + lint.

### ⚠️ Backend-gap (follow-up a backend terminálnak)

- **FSM-tábla ↔ aggregátum eltérés:** a `WorkOrderStatusTransitions` engedi a Reported → InProgress ugrást („if assigned"), de a `WorkOrder.StartWork()` KIZÁRÓLAG Scheduled-ből fut. A kliens-FSM az **aggregátumot tükrözi** (szigorúbb); a backend tábla/aggregátum összehangolása follow-up.
- **Hiányzó munkalap-végpontok:** a Schedule/Assign/Postpone/Reject/Reopen **command-ok léteznek**, de a `WorkOrderEndpoints` csak a start/complete-et vezeti ki — az öt hiányzó végpont MSW-FIRST előkép (`PUT /work-orders/:id/{schedule|assign|postpone|reject|reopen}`).
- **204 → frissített DTO:** a backend átmenet-végpontjai 204-et adnak; a UI-kontraktus (optimista frissítés + detail-cache írás) a **frissített WorkOrderDto** visszaadását várja — a backend válasz-formátum igazítandó.
- **`StartWorkOrderCommand.RequiresDowntime` inkonzisztencia:** a payloadban kér RequiresDowntime-ot, miközben az aggregátum létrehozáskor rögzíti — a kliens a create-kori értéket használja, a start payload üres.
- **Asset lista-szűrés:** a `GetAssetsQuery` Kind/Status paraméterei az endpointban null-ra fixáltak; az MSW-kontraktus `kind`/`q` query-szűrést definiál (+ a válaszban SZÁMÍTOTT `status`/`openWorkOrders`/`duePlans` mezőket — a `AssetStatusCalculationService` kiszolgálás-kori futtatása backend-oldalon is szükséges lesz).
- **`maintenance.manage` jogosultság UI-STUB** (`permissions.ts`): auth-bekötéskor csak a `useMaintenancePermissions` belseje cserélendő.
- **Scope-on kívül maradt (prototípus-képernyők):** állásidő-napló (Downtime a backendben csak value object, nincs végpontja), munkalap-alkatrészek UI (AddPart/RemovePart), munkalap-költség → Kontrolling push — külön task, backend-kontraktussal együtt.

## Kivitelezés

### 1. Adatréteg (`src/services/maintenance/` — ld. `services/maintenance/README.md`)
- `fsm.ts`: **WORK_ORDER_FSM** — az EGYETLEN átmenet-forrás UI és MSW alá (közös `services/fsmGuards`): `bejelentve → utemezve → folyamatban → kesz` (+halasztva/elutasitva, reopen-nel vissza) = a backend aggregátum-akciók 1:1 tükre. Nevesített guardok: `WORK_ORDER_OPEN_STATUSES`/`isWorkOrderOpen` (KPI + eszköz-számláló), `canAssignWorkOrder`/`assignBlockReason` (Assign csak bejelentve/utemezve), `startAssignmentBlockReason` (a start felelős nélkül tiltott — `StartWork()` tükör, UI + MSW közös).
- `calc.ts`: KÉT backend domain-service tükre — `calcAssetStatus` (`AssetStatusCalculationService`: az eszköz-státusz SZÁMÍTOTT, sosem tárolt: selejtezve/geptores/karbantartas/uzemel) és `isPlanDue`/`planDueInfo` (`PreventiveMaintenanceSchedulerService`: idokoz + uzemora trigger). **Ugyanezt futtatja a UI és az MSW** — a kliens sosem számol saját eszköz-státuszt, a válasz `status` mezője jelenik meg.
- `assets.ts` / `workOrders.ts`: zod-sémák + fetcherek + hookok; a munkalap-átmenet **optimista** (detail-cache azonnal, 409-nél rollback + hiba-toast); külön `assign` fetcher/hook (státusz-guardolt, nem FSM-átmenet) + `createWorkOrder` (ReportWorkOrderCommand-tükör).
- **Rule-6 invalidálás** (`workOrders.ts useInvalidateWorkOrders`): `workorders` lista-prefix + `workorder` **szinguláris detail-prefix** (külön él!) + **`assets` + `asset` kereszt-invalidálás** — az eszköz-státusz a munkalapokból derivált (leállásos munka indítása/lezárása átbillenti), a nyitott-számláló is munkalap-függő.
- `keys.ts`: hierarchikus kulcs-gyár (`maintenanceKeys.all` alatt), a detail-kulcs csapda dokumentálva.
- `permissions.ts` + `config.ts` (API base, esedékesség-küszöbök: `PLAN_DUE_SOON_DAYS`/`_HOURS`, ütemterv-ablak: `SCHEDULE_WINDOW_DAYS` — QUALITY.md 3., M2-lecke: a KPI-alcím a configból számítva).

### 2. MSW kontraktus-tükör (`src/mocks/maintenanceApi/`)
- Állapottartó store (`db.ts`, `resetMaintenanceDb()`), közös `guardTransition` → tiltott FSM-átmenet **409**; start felelős nélkül **409** (aggregátum-guard); hiányzó indok/óraszám/dátum **400**; ismeretlen id **404**.
- `seed.ts`: 6 eszköz (a régi statikus mock faipari gépnevei újrahasznosítva) — a számított státusz mind a 4 ága előáll (üzemel / géptörés / karbantartás / selejtezve) + idokoz-terv dueSoon, uzemora-terv due; 8 munkalap — státuszonként legalább egy + a felelős-nélküli ütemezett (start-guard esete); dátumok a „mához" képest relatív eltolással (`seedDay`), stabil `MNT_SEED_IDS`.
- Az asset-válaszok `status`/`openWorkOrders`/`duePlans` mezői kiszolgáláskor számítódnak a `services/maintenance/calc`-cal (egy igazságforrás); `reopen` a backend `Reopen()`-tükreként törli a hozzárendelést/ütemezést/indokokat.

### 3. Képernyők (`src/pages/maintenance/`; `MaintenancePage.tsx` 330 soros statikus oldal → 34 soros diszpécser; worlds-config: `tickets` fül → **workorders** „Munkalapok", badge frissítve)
- **Áttekintés** (`MaintenanceDashboard`): 4 KPI (eszközök/üzemel, leállás, esedékes megelőző — alcím a config-küszöbökből, nyitott munkalap/kritikus) + esedékes tervek listája (esedékesség-badge: szín+szöveg), nem üzemelő eszközök, nyitott munkalapok prioritás-sorrendben — minden érték a hookokból.
- **Eszközök** (`AssetsScreen` + `AssetDetailSlideOver`): DataTable kettős render, SZERVER-oldali kategória-chipek (S2-minta: pipa + font-semibold + 44 px touch-cél) + kereső (q); számított státusz-pill, nyitott/esedékes oszlop; detail: törzsadatok, megelőző tervek esedékesség-badge-ekkel, munkalap-előzmény (sor → munkalap-SlideOver).
- **Munkalapok** (`WorkOrdersScreen` + `WorkOrderDetailSlideOver`): DataTable státusz-chipekkel (a „Nyitott" a nevesített open-guard szerver-oldali tükre); detail: **FsmStepper** (bejelentve → ütemezve → folyamatban → kész; halasztva/elutasítva mellékállapotként), átmenet-gombsor — a tiltott akció `disabledReason`-nel (aria-disabled + tooltip, SOSEM rejtett), indok-lánc: folyamatban → `maintenance.manage` → FSM-guard → felelős-guard (start); űrlapos akciók: ütemezés (dátum+becsült óra), hozzárendelés (belső/külső + név), lezárás (tényleges óra), halasztás/elutasítás (kötelező indok); napló.
- **Ütemterv** (`ScheduleScreen`): eszköz-soros naptár-rács a következő 14 napra (config), ütemezett + folyamatban lévő munkalapok az ütemezett napjukon (típus-tónusú cella-chip, soronkénti aria-label), ma/hétvége kiemelés; a rács **saját görgethető régió** (`role="region"` + `aria-label` + `tabIndex` — S1-lecke), jelmagyarázat (szín+szöveg) + **sr-only lista-alternatíva** (M3-lecke); cella → munkalap-SlideOver.

## Eredmény

- A Maintenance az **ötödik modul** a típusos adatréteg-mintán — a HR-sablon mindkét ága itt is él: szigorú FSM (közös `fsmGuards` + két extra nevesített guard) ÉS calc-tükör (itt: számított eszköz-státusz + terv-esedékesség), plusz az eddigi legerősebb kereszt-invalidálási eset (munkalap-mutáció → eszköz-cache).
- Gap-analízis Maintenance-hiányai lezárva: adatréteg ✅ (statikus import → MSW+Query), munkalap-FSM akciók ✅ (mind a 6 átmenet + assign kattintható, guardolt), ütemterv-rács ✅ (statikus lista → API-vezérelt naptár), eszköz-részletek tervekkel ✅.
- Build zöld; a Maintenance lazy chunk 37,93 kB raw / 9,11 kB gzip.

## Fájlok

**ÚJ** — adatréteg: `src/services/maintenance/{config,keys,fsm,calc,permissions,assets,workOrders,index}.ts` + `README.md`
**ÚJ** — MSW: `src/mocks/maintenanceApi/{seed,db,handlers.assets,handlers.workOrders,index}.ts`
**ÚJ** — képernyők: `src/pages/maintenance/{labels.ts,MaintenanceDashboard,AssetsScreen,AssetDetailSlideOver,WorkOrdersScreen,WorkOrderDetailSlideOver,ScheduleScreen}.tsx`
**MÓDOSÍTVA:** `src/pages/MaintenancePage.tsx` (330→34 sor diszpécser), `src/mocks/handlers.ts` (+maintenanceApiHandlers, csak bővítés), `src/mocks/worlds.ts` (maintenance képernyők: tickets→workorders, sub+badge frissítés)
**TESZT:** ÚJ `src/services/maintenance/__tests__/{workOrderFsm,calc,maintenanceApi}.test.ts`, `src/pages/maintenance/__tests__/{maintenanceTestUtils.tsx,maintenanceScreens.smoke.test.tsx,workOrderFlow.test.tsx}`; ÚJRAÍRVA `src/pages/__tests__/MaintenancePage.test.tsx` (statikus-mock helyett MSW + route-diszpécser)
**VÁLTOZATLAN:** `src/mocks/maintenance.ts` (a statusTones-teszt alias-forrása — csak a régi oldal importja szűnt meg) · HR/CRM/EHS/Kontrolling fájlok (zároltak — csak import irányban használva)

## Tesztek

- **Maintenance-scope: 56/56 zöld** (6 fájl):
  - `workOrderFsm.test.ts` (9): fő út + postpone/reject/reopen mellékágak + terminális kesz + **aggregátum-tükör** (start bejelentve-ből tiltott) + blockReason-szöveg + nevesített guardok (open/assignable/start-felelős).
  - `calc.test.ts` (13): dátum-helperek (hónap-határ, előjeles diff, config-ablak), számított eszköz-státusz mind a 4 ága (+ vegyes leállás: javítás nyer; másik eszköz munkája nem számít), terv-esedékesség (soha-nem-végzett azonnal, pontos küszöb-napok/órák, dueSoon a config-küszöbökkel).
  - `maintenanceApi.test.ts` (17, msw/node + `resetMaintenanceDb`): eszköz-lista számított státusszal + kind/q szűrők + 404 + duePlans/openWorkOrders számítás; munkalap-szűrők (status/type/assetId/open) + create (400 üres címre); FSM-lánc (schedule→assign→start→complete), 409 guardok (tiltott átmenet, terminális, **start felelős nélkül**, assign folyamatban), 400-ak (dátum/óra/indok), reopen mező-törléssel; **rule-6 a kontraktusban** (leállásos javítás lezárása → az eszköz uzemel-re áll vissza; leállásos munka indítása → karbantartas).
  - UI (17): smoke mind a 4 képernyőre + eszköz-detail (KPI-k, szerver-szűrők, S2-chipek, S1-régió, sr-only rács-alternatíva, esedékesség-badge); **FSM-folyam** (tiltott gomb aria-disabled + tooltip + elnyelt kattintás; start → gombok átbillennek + store + lista-pill frissül; start-guard felelős-hozzárendeléssel feloldva; complete óraszám-kényszerrel + lista-frissülés; halasztás kötelező indokkal; `maintenance.manage` letiltva → jogosultsági indok); MaintenancePage route-teszt (6 eset, SlideOver-nyitással).
- **Teljes suite:** `npx vitest run` → **1315 passed / 19 failed (1334)** — a 19 bukás a dokumentált, Maintenance-től független pre-existing készlet (BOMPreviewCard, configurator/wizard, catalogFilterPersistence, ProcurementPage, WorkOrderSummary); Maintenance-fájl nincs köztük, új bukás nincs (a baseline ~20-ból a flaky configurator-eset ezúttal nem bukott).
- **Build:** `npm run build` ✅ · **tsc -b** tiszta · **ESLint** az érintett fájlokra tiszta.

## Nyitott kérdések / follow-up

1. **Backend munkalap-végpontok (G-Maintenance):** az öt hiányzó átmenet-endpoint + a 204 → frissített DTO váltás + a StartWorkOrderCommand RequiresDowntime-inkonzisztencia rendezése; a `mocks/maintenanceApi` route-készlet + `services/maintenance` zod-sémák a rögzítendő kontraktus-előkép.
2. **FSM-tábla ↔ aggregátum összehangolás** a backendben (Reported→InProgress ág törlése vagy az aggregátum lazítása — ADR-döntés).
3. **Asset lista-szűrés + számított mezők** backend-oldalon (kind/q query + státusz/nyitott/esedékes a lista-DTO-ban).
4. **Állásidő-napló + munkalap-alkatrészek + Kontrolling-push** (prototípus-képernyők) — külön task backend-kontraktussal (a WO `parts` + `Downtime` VO már létezik a domainben).
5. **`maintenance.manage` claim-forrás:** auth-bekötés (a `useMaintenancePermissions` belseje).
6. **Közös date-utils kiemelés:** a `services/hr/calc.ts` és `services/maintenance/calc.ts` azonos dátum-helperei → `services/dateUtils.ts` (a fsmGuards-kiemelés mintájára; a HR-fájlok zároltsága miatt most nem történt meg).
7. **`QueryGate` promótálás** `components/ui`-ba — immár 5 modul importálja az EHS-ből.
