# F2-MAINTENANCE-REVIEW — Maintenance modul designer review (Fázis 2, 5. modul)

> **Kiadta:** designer terminál — 2026-07-15
> **Epic:** `EPIC-UI-PORTAL-2026Q3` / F2-MAINTENANCE-REVIEW
> **Kontraktus:** `docs/knowledge/architecture/UI_IMPLEMENTATION_PLAN_2026-07-14.md` (Maintenance: accent cyan — 17. sor; eszköz-törzs + munkalap-FSM + ütemterv — 41. sor; FSM: `bejelentve → utemezve → folyamatban → kesz` +`halasztva`/`elutasitva`, eszköz-státusz SZÁMÍTOTT — 66. sor), `docs/knowledge/patterns/DESIGN_SYSTEM_SPEC_V1.md`, precedensek: EHS/CRM/Kontrolling/HR review-k (`docs/knowledge/qa/`)
> **Vizsgált kód:** `src/joinerytech-portal` main@`03a3b0c` (F2-MAINTENANCE-FE: `src/services/maintenance/`, `src/mocks/maintenanceApi/`, `src/pages/maintenance/`, `src/pages/MaintenancePage.tsx` + tesztek)
> **Módszer:** teljes Maintenance-diff átolvasás a terv + a négy korábbi modul-review érett szempontrendszere ellen, tesztfuttatás (Maintenance-scope-ú vitest: **6 fájl / 56 teszt — mind zöld**, bontás lent). A QA-fájlokat (párhuzamos frontend-munka) NEM érintettem, portal-fájl nem módosult.

---

## Összesített verdikt: ✅ APPROVED

Az F2-MAINTENANCE a sablon **ötödik iterációja, és sorozatban a második
fix-kör nélküli modul**: a négy korábbi review MINDEN dokumentált leckéje
beépült. Az ütemterv-rács saját `role="region"` scroll-konténerben görög
(Kontrolling S1), sr-only lista-alternatívával (M3); a szűrő-chipek
pipa+félkövér+44 px touch-céllal készültek mindkét lista-képernyőn
(Kontrolling S2); a detail-kulcsok KÜLÖN élnek és KÜLÖN invalidálódnak
(CRM S2); a due-soon küszöbök configból jönnek, a KPI-alcím a configból
SZÁMÍTOTT (Kontrolling M2) — és a **HR M1 hibaminta (hardcode-olt
küszöb-literál) NEM ismétlődött**. A `fsm.ts` a közös `services/fsmGuards`-ra
épül, két extra nevesített guarddal (assign-státuszguard + a felelős-nélküli
start guardja — mindkettő a UI és az MSW közös feltétele), a `calc.ts` KÉT
backend domain-service tükre (számított eszköz-státusz + terv-esedékesség),
és a rule-6 kereszt-invalidálás az eddigi legerősebb esete (munkalap-mutáció
→ eszköz-cache) kontraktus-tesztben is fedett. **Blokkoló hiba nincs**; egy
fontos (M1: dátum-parszolás inkonzisztencia a labels.ts-ben) és négy apró
tétel follow-upként kérve/rögzítve.

| Terület | Verdikt |
|---|---|
| 1. FSM egy igazságforrás (`fsm.ts` + közös `fsmGuards`; UI ÉS MSW) | ✅ APPROVED |
| 2. Aggregátum-guardok: assign-státuszguard + felelős-nélküli start (UI+MSW) | ✅ APPROVED |
| 3. `calc.ts` kettős tükör (AssetStatusCalculation + PreventiveMaintenanceScheduler) | ✅ APPROVED |
| 4. Rule-6 invalidálás: `workorders` + `workorder` + `assets` + `asset` kereszt | ✅ APPROVED |
| 5. MSW kontraktus-tükör (`mocks/maintenanceApi/`): 409 FSM+aggregátum-guard, 400, 404 | ✅ APPROVED |
| 6. Képernyők vs terv (4 képernyő + 2 SlideOver, cyan akcent) | ✅ APPROVED |
| 7. S1-osztály: ütemterv-rács saját régióban + sr-only alternatíva (M3) | ✅ APPROVED |
| 8. S2-osztály: chip-affordanciák (pipa + 44 px touch-cél, 2 képernyőn) | ✅ APPROVED |
| 9. Ütemterv-rács jelmagyarázat: szín + szöveg; cella aria-label soronként | ✅ APPROVED |
| 10. Tokenek / cyan / dark / nyerspaletta-fegyelem | ✅ APPROVED |
| 11. Config-vezérelt küszöbök + **HR-M1 minta-utóellenőrzés** | ✅ APPROVED (nem ismétlődött) |
| 12. Loading/empty/error + magyar címkék (labels.ts) | ✅ APPROVED |
| 13. Tesztek | ✅ 56/56 zöld (6 fájl) |

---

## Blokkoló hibák

**Nincs.** (Másodszor egymás után a Fázis 2-ben — a sablon stabilizálódott.)

---

## Jóváhagyott területek (részletek)

### 1. FSM-integritás ✅ — az EGYETLEN átmenet-forrás igazoltan közös

`src/services/maintenance/fsm.ts` — a backend WorkOrder AGGREGÁTUM
akció-guardjainak 1:1 tükre (`bejelentve → utemezve → folyamatban → kesz`,
+`halasztva`/`elutasitva`, `reopen`-nel vissza — a terv 66. sora betűre), a
közös `services/fsmGuards`-ra építve. A tábla/aggregátum backend-eltérés
(Reported→InProgress „if assigned" a táblában, de a `StartWork()` csak
Scheduled-ből fut) a fájl-fejkommentben DOKUMENTÁLT döntés: a szigorúbb
aggregátum az irányadó (`fsm.ts:16-20`) — jó ADR-gyakorlat, follow-up a
backend terminálnak.

- **UI:** `WorkOrderDetailSlideOver.tsx:54-61` — indok-lánc: pending →
  `maintenance.manage` jogosultság → `transitionBlockReason` az FSM-táblából
  → startnál a felelős-guard; a tiltott gomb `disabledReason`-t kap
  (aria-disabled + tooltip, a Button primitívvel), SOSEM rejtett. Mind a
  7 akció-gomb (6 FSM + assign) mindig látszik.
- **MSW:** `mocks/maintenanceApi/db.ts:51-62` — ugyanaz a `canTransition`
  dönt (`guardTransition` helper), tiltott átmenet → 409 a szabálysértést
  leíró üzenettel; minden átmenet-handler ezen megy át.
- **Nevesített guardok** (isOppOpen-minta): `WORK_ORDER_OPEN_STATUSES`/
  `isWorkOrderOpen` (`fsm.ts:51-57` — a dashboard KPI, az eszköz
  nyitott-számlálója ÉS a szerver-oldali `open=true` szűrő közös feltétele),
  `canAssignWorkOrder`/`assignBlockReason` (`fsm.ts:65-80` — assign csak
  bejelentve/utemezve, UI-gomb ↔ MSW 409 `handlers.workOrders.ts:90-95`).
- **A review-szempont magja — a felelős-nélküli start guardja UI-ban is
  indokolt:** `startAssignmentBlockReason` (`fsm.ts:87-89`) a UI
  disabledReason-lánc tagja (`WorkOrderDetailSlideOver.tsx:58`) ÉS az MSW
  start-handler 409-e (`handlers.workOrders.ts:142-143`) — SZÓ SZERINT
  ugyanaz a függvény adja az üzenetet mindkét oldalon. UI-tesztelt
  (workOrderFlow: „felelős-guard tooltip" + feloldás hozzárendeléssel) ✔

### 2. Adatréteg-minta konformancia ✅

- Zod-lefedettség teljes (státusz/típus/prioritás/assignment enum-tükrök,
  `workOrders.ts:19-33`); kulcs-gyár hierarchikus, a detail-kulcsok
  (`asset`, `workorder`) NEM a lista-prefix alatt — a fejkomment explicit
  figyelmeztet a CRM S2-leckére (`keys.ts:6-8`) ✔
- **Optimista átmenet helyesen:** onMutate a detail cache-t a célállapotra
  billenti, hibánál rollback + a szerver guard-üzenete toastban, onSuccess a
  friss DTO-t cache-eli, onSettled mindig invalidál (a szerver az
  igazságforrás) — `workOrders.ts:204-227` ✔
- FSM-akció = dedikált végpont (nincs generikus PATCH, EHS README 2. szabály,
  `workOrders.ts:127-138`); az assign KÜLÖN fetcher/hook, kommentben
  megkülönböztetve („státusz-guardolt, de NEM FSM-átmenet") ✔
- Típusos akció-payload térkép (`WorkOrderTransitionPayloads`,
  `workOrders.ts:69-80`) — a Command-tükrök típusszinten kikényszerítettek ✔
- `maintenance.manage` UI-STUB dokumentált bekötési ponttal
  (`permissions.ts` — auth-nál csak a hook belseje cserélendő); a
  jogosultság-hiány is disabledReason, nem rejtett gomb — TESZTELT
  (workOrderFlow: „maintenance.manage nélkül… nem rejtett") ✔
- Backend-gapek (5 hiányzó végpont, 204→DTO, RequiresDowntime, lista-szűrés)
  a task-fájlban ÉS a config/fsm kommentjeiben dokumentáltak ✔

### 3. `calc.ts` kettős tükör ✅ — a HR/Kontrolling-minta legerősebb esete

- `calcAssetStatus` (`calc.ts:75-89`): selejtezve → geptores (folyamatban
  lévő leállásos JAVÍTÁS) → karbantartas (egyéb leállásos) → uzemel — a
  backend `AssetStatusCalculationService` ág-sorrendje; a vegyes eset
  (javítás nyer) és a „másik eszköz munkája nem számít" él tesztelt ✔
- `isPlanDue`/`planDueInfo` (`calc.ts:102-141`): idokoz- ÉS uzemora-trigger,
  soha-nem-végzett terv azonnal esedékes; a dueSoon-küszöbök KIZÁRÓLAG
  configból (`PLAN_DUE_SOON_DAYS`/`_HOURS`, `config.ts:16-19`) ✔
- **A kliens sosem számol saját eszköz-státuszt:** az MSW asset-válaszai
  kiszolgáláskor futtatják ugyanezt a calc-ot (`handlers.assets.ts:19-34` —
  `status`, `openWorkOrders`, `duePlans` mind számított), a kliens a válasz
  `status` mezőjét jeleníti meg; a seed NEM tartalmaz status mezőt
  (`seed.ts:12-13`) ✔
- A seed dátumai a mához képest relatív eltolással (`seedDay`), stabil
  `MNT_SEED_IDS`-szel — a számított státusz mind a 4 ága ÉS a start-guard
  esete (MWO-108: ütemezett, felelős nélkül) determinisztikusan előáll ✔

### 4. Rule-6 kereszt-invalidálás ✅ — a review-kérdés magja rendben

`workOrders.ts:173-181` (`useInvalidateWorkOrders`): a munkalap-mutáció a
`workorders` lista-prefixet, a `workorder` DETAIL-prefixet (külön él!) ÉS az
`assets` + `asset` prefixeket invalidálja — az eszköz-státusz a munkalapokból
DERIVÁLT (leállásos munka indítása/lezárása átbillenti), és a nyitott-számláló
is munkalap-függő. Mindhárom mutáció-hook (transition, assign, create) ezt a
közös invalidátort használja. A keresztkötés a KONTRAKTUS-tesztben fedett
(`maintenanceApi.test.ts:217-234`: leállásos javítás lezárása → az eszköz
`geptores`→`uzemel`; leállásos munka indítása → `uzemel`→`karbantartas`), és
a UI-folyam teszt a lista-pill frissülését is asszertálja ✔

### 5. MSW kontraktus-tükör ✅

- Állapottartó store + `resetMaintenanceDb()` (`db.ts`), az eszköz-törzs a
  régi statikus mock faipari gépneveiből (seed-minta) ✔
- Backend-invariánsok: tiltott FSM-átmenet → **409** (közös guard), start
  felelős nélkül → **409** (aggregátum-guard, ld. 1. pont), assign rossz
  státuszban → **409**, hiányzó dátum/óraszám/indok → **400**, ismeretlen
  id → **404**; a reopen a backend `Reopen()`-tükreként törli a
  hozzárendelést/ütemezést/indokokat (`handlers.workOrders.ts:209-224`) ✔
- Szerver-oldali szűrők: kind/q (eszközök — név+kód+gyártó+modell),
  status/type/assetId/open (munkalapok); rendezettség dokumentált
  kommentekkel (kód ill. legfrissebb bejelentés elöl) ✔

### 6. Képernyők vs terv ✅ (mind a 4 + 2 SlideOver)

- **Worlds-config:** dash / assets / workorders / schedule
  (`mocks/worlds.ts:183-194`), `accent: 'cyan'` — a terv 17. sora szerint;
  a `MaintenancePage` 35 soros vékony diszpécser route-tesztekkel ✔.
  A világ-kártya badge („5 nyitott") a seeddel EGYEZIK (5 nyitott státuszú
  munkalap: 1 bejelentve + 2 utemezve + 2 folyamatban) — a Kontrolling N2
  hiba nem ismétlődött ✔
- **Áttekintés:** 4 KPI kizárólag hookokból (eszközök/üzemel, leállás,
  esedékes megelőző — alcím a configból számítva, nyitott/kritikus);
  esedékes tervek listája szín+szöveg badge-ekkel (`planDueLabel`), nem
  üzemelő eszközök státusz-pillekkel, nyitott munkalapok prioritás-sorrendben
  (a sorrend nevesített `WO_PRIORITY_ORDER`), képernyő-linkek ✔
- **Eszközök:** DataTable kettős render, SZERVER-oldali kategória-chipek +
  kereső (aria-label a mezőn), számított státusz-pill, nyitott/esedékes
  oszlop szöveggel (nem csak szám-badge) ✔
- **Munkalapok:** DataTable + státusz-chipek (a „Nyitott" a nevesített
  open-guard szerver-oldali tükre: `open=true`); leállás-jelző ikon
  aria-label+title párossal; sor-cím → detail SlideOver ✔
- **Munkalap-detail:** FsmStepper a fő úton (halasztva/elutasitva
  `sideLabel`-lel), 7 akció-gomb indok-lánccal, űrlapos akciók (ütemezés:
  dátum+óra; hozzárendelés: típus+név; lezárás: tényleges óra; halasztás/
  elutasítás: KÖTELEZŐ indok — kliens-oldali disabledReason ↔ MSW 400
  párban), halasztás/elutasítás indoka megjelenítve, napló ✔
- **Ütemterv:** ld. 7. és 9. pont ✔

### 7–8. A korábbi review-k hibaosztályai — mind megelőzve ✅

- **S1-osztály (görgethető rács):** az ütemterv-rács
  (`ScheduleScreen.tsx:62-67`) SAJÁT `overflow-x-auto` + `role="region"` +
  `aria-label` + `tabIndex={0}` + fókusz-ring konténerben él (Kontrolling
  S1-recept, kommentben hivatkozva); **plusz sr-only lista-alternatíva**
  (`ScheduleScreen.tsx:145-153` — dátum+cím+eszköz+típus+státusz+felelős
  szövegként; a Kontrolling M3-lecke általánosítása). A többi lista a
  DataTable primitívet használja. TESZTELT (smoke: „saját görgethető régió
  (S1-minta) + sr-only alternatíva") ✔
- **S2-osztály (chipek):** mindkét chip-soron (Eszközök kategória
  `AssetsScreen.tsx:115-137`, Munkalapok státusz
  `WorkOrdersScreen.tsx:109-130`) az aktív chip pipa-ikon (`aria-hidden`) +
  `font-semibold` nem-szín jelzést kap, a pill körül `before:-inset-y-2`
  pszeudó adja a 44 px-es touch-célt, `aria-pressed` + `role="group"` —
  a Kontrolling S2-fix mintája, kommentben hivatkozva ✔

### 9. Ütemterv-rács: nem csak szín hordozza az információt ✅

- Minden cella-chip LÁTHATÓ szöveget hordoz (típus-címke félkövéren + a
  munkalap címe, `ScheduleScreen.tsx:118-120`), és soronkénti aria-label-t
  (`cím — eszköz, dátum, státusz`, `:115`) ✔
- Jelmagyarázat szín + SZÖVEG párokkal (`ScheduleScreen.tsx:132-142`, a
  minták `aria-hidden` dekorációk) ✔; a mai nap oszlopa szín + félkövér
  world-tónusú fejléc-szöveg párossal emelt ki, a hétvége a nap-rövidítés
  szövegével (Szo/V) is azonosítható ✔
- Üres ablak: értelmes magyar üres-állapot a config-ablak kiírásával ✔

### 10. Tokenek / cyan / dark / a11y ✅

- **Cyan akcent tokenből:** `[data-world="maintenance"]` light+dark
  változó-készlet (`index.css:132-143`; dark `--world-fg` = cyan-950 — a
  chip-kontraszt rendben); a képernyők KIZÁRÓLAG `world-*` tokent használnak
  (bg-world, world-ring, world-soft, world-soft-fg) — nyers cyan-osztály
  akcent-célra SEHOL ✔
- **Nyerspaletta-fegyelem:** a `pages/maintenance` fa nyers paletta-osztálya
  összesen 3, MIND szemantikus jelzőszín ÉS dark-páros: KPI-riasztás
  (`MaintenanceDashboard.tsx:97` rose-600/rose-400), esedékes-terv kiemelés
  (`AssetsScreen.tsx:78` amber-700/amber-400), leállás-ikon
  (`WorkOrdersScreen.tsx:90` rose-600/rose-400) ✔
- SlideOver (F1 primitív) helyes használat mindkét detailben; loading
  skeleton `aria-busy`, hiba `role="alert"`, QueryGate minden képernyőn
  Újra-gombbal; üres állapotok magyar szöveggel ✔
- Magyar címkék központi `labels.ts`-ben (státusz/akció/típus/prioritás/
  kategória/hozzárendelés/trigger + formázók); a pill-tónusok a
  `theme/fsmTones.ts` `maintenanceMunkalap` térképéből ✔

### 11. Config-küszöbök + HR-M1 utóellenőrzés ✅ — a minta NEM ismétlődött

- Minden „állítható" érték a `config.ts`-ben (`PLAN_DUE_SOON_DAYS=7`,
  `PLAN_DUE_SOON_HOURS=50`, `SCHEDULE_WINDOW_DAYS=14`); a dashboard
  „Esedékes megelőző" KPI-alcíme a configból SZÁMÍTOTT sablon-string
  (`labels.ts:62-63` `PLAN_DUE_SOON_LABEL` — a Kontrolling M2-lecke
  explicit kommenttel) ✔
- **A HR-review M1 mintája (hardcode-olt küszöb-literál a dashboardon) a
  MaintenanceDashboard-ban NEM fordul elő:** a KPI-riasztó tónusok
  adat-feltételekből derülnek (leállás > 0, `info.due`, kritikus > 0 —
  `MaintenanceDashboard.tsx:50-76`), számliterál-küszöb nincs; a due-soon
  döntés mindenhol a config-vezérelt `planDueInfo`-n megy át ✔
- *Megjegyzés:* maga a HR-fix (`HrDashboard.tsx:212` `pct > 85`) még
  VÁLTOZATLAN — a `HR-M1-THRESHOLD` backlog-tétel nyitva marad, a következő
  HR-t érintő fix-körrel esedékes (most újra ellenőrizve: a literál még ott van).

---

## Kért javítások (nem blokkoló) és megjegyzések

- **M1 — labels.ts: dátum-parszolás inkonzisztencia (UTC vs helyi idő)**
  (`src/pages/maintenance/labels.ts:106,142-144,148-151`): a `formatDate`,
  `formatGridDay` és `isWeekend` a `new Date(iso)` konstruktorral parszolja
  a date-only ISO-kulcsokat — ez UTC-éjfélként értelmezi őket, miközben a
  modul saját doktrínája a HELYI idejű parszolás (`calc.ts:22` „helyi idő,
  YYYY-MM-DD kulcsok" + `parseDay` pont ezért létezik). UTC-től nyugatra eső
  zónában a rács nap-fejlécei és a hétvége-satírozás egy nappal elcsúsznának.
  Magyar deploynál (UTC+1/+2) nem hibázik, ezért NEM blokkoló — de a modul
  belső következetlensége, és a `parseDay` importjával fillérekből javítható.
  **Fix:** `formatGridDay`/`isWeekend`/`formatDate` a `calc.ts` `parseDay`-én
  keresztül (3 sor). Kérve a következő Maintenance-t érintő fix-körrel; a
  soron következő modul-review-ban ellenőrzöm. (A közös
  `services/dateUtils.ts` kiemelés — FE task 6. follow-up — jó alkalom rá.)
- **N1 — `QueryGate` továbbra is az EHS-ből importált** — immár az 5. modul
  importálja (`pages/ehs/QueryGate`); a `components/ui`-ba promótálás a
  CRM N5 / Kontrolling N6 / HR N1 közös mini-taskja, a FE task 7.
  follow-upja is rögzíti. Tracked backlog — a következő modul (QA) előtt
  érdemes lezárni, ne legyen 6. importőr.
- **N2 — Átmenet-űrlapok kézi inputokkal** (`WorkOrderDetailSlideOver.tsx:32-33`
  közös `inputCls` + 4 űrlap): címkézettek (`htmlFor`), fókusz-ringesek,
  működnek — de nem az EHS `formFields` primitívjeit használják (a HR N2
  konzisztencia-nit megismétlődése); a kötelező-jelölő `*` `aria-hidden`,
  `aria-required` nélkül. A submit-gomb disabledReason-je kompenzál — nit.
- **N3 — MSW reopen nem törli az `estimatedHours`-t**
  (`handlers.workOrders.ts:215-221`): a reopen a hozzárendelést, ütemezett
  dátumot és indokokat törli, de a schedule-kor rögzített becsült óraszám
  megmarad — az újranyitott (bejelentve) munkalapon árva becslés. Mock-hűségi
  apróság; a backend `Reopen()` viselkedésével együtt tisztázandó (backend
  follow-up részeként).
- **N4 — Az ütemterv-cellán a státusz (ütemezve vs folyamatban) vizuálisan
  nem különbözik** (`ScheduleScreen.tsx:109-121`): a cella-chip tónusa a
  TÍPUSÉ (jelmagyarázat is típusokra van), a státuszt az aria-label, az
  sr-only lista és a SlideOver hordozza. A terv csak típus-tónust kér, ezért
  nit — megfontolható a folyamatban lévő chip forma-jelzése (pl. ring), a
  9,5 px-es chip-szöveg pedig a rács-sűrűség miatt elfogadott, de ne
  csökkenjen tovább.

---

## Tesztek

Maintenance-scope-ú futtatás (`npx vitest run src/pages/maintenance
src/services/maintenance src/pages/__tests__/MaintenancePage.test.tsx`):
**6 fájl / 56 teszt — mind zöld** (egyezik az F2-MAINTENANCE-FE
task-jelentés 56/56-ával). Bontás:

| Fájl | Teszt | Fókusz |
|---|---|---|
| `services/maintenance/__tests__/workOrderFsm.test.ts` | 9 | átmenet-tábla + mellékágak, terminális kesz, aggregátum-tükör (start bejelentve-ből tiltott), blockReason, nevesített guardok |
| `services/maintenance/__tests__/calc.test.ts` | 13 | dátum-helperek, számított eszköz-státusz mind a 4 ága + vegyes/idegen-eszköz élek, terv-esedékesség config-küszöbökkel |
| `services/maintenance/__tests__/maintenanceApi.test.ts` | 17 | MSW-kontraktus: számított mezők, szűrők, FSM-lánc, 409/400/404 (+ start felelős nélkül), reopen mező-törlés, RULE-6 keresztkötés |
| `pages/maintenance/__tests__/maintenanceScreens.smoke.test.tsx` | 5 | 4 képernyő + eszköz-detail; S1 régió + sr-only alternatíva, S2 chipek, KPI-k, esedékesség-badge |
| `pages/maintenance/__tests__/workOrderFlow.test.tsx` | 6 | tiltott gombok aria-disabled+tooltip+elnyelt kattintás, start-guard feloldása assignnal, complete óraszám-kényszerrel, halasztás kötelező indokkal, manage-tiltás |
| `pages/__tests__/MaintenancePage.test.tsx` | 6 | route-diszpécser + SlideOver-nyitás |

A lefedés a precedens-szerinti (calc tiszta függvények + MSW-kontraktus +
UI-folyamok), a jogosultsági tiltott ág UI-tesztje a HR-ben bevezetett
mintát folytatja, és — először a sorozatban — az **FSM-en túli
aggregátum-guard** (felelős-nélküli start) mindhárom rétegben (fsm-teszt,
MSW 409, UI-tooltip) asszertált.

---

## Findings összefoglalva

| # | Fájl | Mi | Súly |
|---|---|---|---|
| M1 | `src/pages/maintenance/labels.ts:106,142-144,148-151` | `new Date(iso)` UTC-parse a modul saját `parseDay` (helyi idő) helperje helyett — rács-fejléc/hétvége latens TZ-hibája | kérve, nem blokkoló |
| N1 | `pages/ehs/QueryGate` importok | QueryGate promótálás `components/ui`-ba (CRM N5 / Kontrolling N6 / HR N1 közös tétel, immár 5 importőr) | tracked backlog |
| N2 | `WorkOrderDetailSlideOver.tsx:32-33` + űrlapok | Inputok a közös formFields primitívekkel (HR N2 ismétlődés); `aria-required` hiánya | opcionális |
| N3 | `mocks/maintenanceApi/handlers.workOrders.ts:215-221` | Reopen nem törli az `estimatedHours`-t — backend `Reopen()`-nel együtt tisztázandó | megjegyzés |
| N4 | `ScheduleScreen.tsx:109-121` | Rács-cellán a státusz csak aria/sr-only szinten különbözik; 9,5 px chip-szöveg alsó határ | megjegyzés |

**Döntés: ✅ APPROVED.** Blokkoló hiba nincs — a Maintenance a második
egymást követő modul, amely fix-kör nélkül megy át; a négy korábbi review
leckéi (S1/S2, M2/M3, CRM S2, rule-6, FSM-egy-igazságforrás) bizonyítottan
sablonná értek, és a HR M1 hibaminta sem ismétlődött. Az M1 pár-soros fix a
közös `dateUtils` kiemeléssel együtt; N1–N4 tracked backlog. A `maintenance`
felkerül a `modules_done` listára; a következő modul (QA) review-jában a
QueryGate-promótálást, a HR-M1-THRESHOLD zárását és az M1-et is ellenőrzöm.

---

_Designer terminál — JoineryTech sziget. F2-MAINTENANCE review lezárva: ✅ APPROVED._
