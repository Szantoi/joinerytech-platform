# PLANNING_CAPABILITY_AUDIT — Production Planning capability-boundary audit (PLAN-01)

- **Dátum:** 2026-07-27 · **Epic:** EPIC-PRODUCTION-PLANNING-2026Q3 · **Mérföldkő:** PL0-boundary
- **Task:** `docs/tasks/EPIC-PRODUCTION-PLANNING-2026Q3/PLAN-01-CAPABILITY-AUDIT.md`
- **Előzmény:** ezen az útvonalon már élt egy rövid, angol nyelvű same-day draft (párhuzamos
  agent-sáv terméke). Ez a dokumentum azt **felváltja és beolvasztja**: a draft minden megállapítása
  megerősítést nyert vagy pontosításra került (az egyedi javaslatai — aggregátum-névkészlet,
  PLAN-02 döntéslista — a 2.2 és 7. fejezetbe beépítve); az itteni verzió a task által megkövetelt
  fájl:sor bizonyíték-mélységet adja hozzá.
- **Módszer:** read-only kódvizsgálat (minta: ERPSEP-01 / PROJECT-BOUNDARY-AUDIT), 6 párhuzamos
  olvasó-lencse: Kernel (FlowEpic/StageChain), `spaceos-modules-production`, cutting + nesting,
  inventory, Maintenance (+ portál ütemterv-UI), Hosting + RlsFixtures. Minden állítás fájl:sor
  bizonyítékkal; a sorszámok a 2026-07-27-i working tree-re vonatkoznak.
- **Bemenetek:** Doorstar handoff (`doorstar-instance: docs/projects/doorstar-production-planning/
  PLATFORM_HANDOFF_EPIC.md` + `PLATFORM_HANDOFF_RESPONSE.md`), Doorstar input-pack
  (`.../fixtures/doorstar-planning-input-pack.v1.json` + `src/production-service/tests/
  planningInputPack.unit.test.ts` + a 4 referencia-TS a `src/production-service/src/services/planning/`
  alatt), ADR-066/067/068, `TERMEKESITES_FELDARABOLAS_DONTES_2026-07-27.md`,
  `MODULE_PACKAGES_PLAN_2026-07-27.md`, ERPSEP-01, PROJECT_CORE_BOUNDARY_AUDIT,
  `STAB-RLS-WORKER-BYPASS.md`.
- **Mutációs határ:** kizárólag ez a dokumentum. Kód, konfig, Doorstar-forrás nem változott.

---

## 0. STOP-értékelés — Kernel-módosítás kell-e? **NEM (nincs STOP)**

A task Stop-klauzulája szerint azonnali eszkaláció jár, ha a Planning értelmesen csak
FlowEpic/StageChain-bővítéssel építhető meg. **Az audit ennek az ellenkezőjét bizonyítja:**

1. **A Kernelben nulla ütemezés/kapacitás-primitív van.** Repo-szintű grep
   (`calendar|capacity|workcenter|shift|scheduling|duration|lead_time|...`) a teljes
   `src/spaceos-kernel` C#-fáján 0 valós találat (a 3 találat: komment, log-timing,
   Channel-capacity). A `FlowEpic`-en **egyetlen dátummező sincs** (se start/end/due/planned —
   `SpaceOS.Kernel.Domain/Entities/FlowEpic.cs:21-62`, a DTO is dátummentes:
   `SpaceOS.Kernel.Application/FlowEpics/Queries/FlowEpicDto.cs:13-18`), és nincs rajta
   plan-revision/verziózás-szemantika sem (az egyetlen "Version" a `StageHandoff.Version`
   handoff-sorszám, `StageHandoff.cs:27`). A StageChain tisztán sorrendi lánc
   (`SpaceOS.Infrastructure/Common/StageChainValidator.cs:18-49` — SortOrder + forward-only +
   IsOptional; nincs Duration/Calendar/Capacity property egyik Stage* entitáson sem).
2. **Ezért a Planning idő/kapacitás/revízió-dimenziója nem ütközik semmilyen Kernel-képességgel** —
   nincs mit bővíteni, és nincs mivel duplikálni. A Planning ugyanazzal a mintával építhető, mint
   amit ADR-068 a Collaborationre már kimondott (O3: önálló, Kernel-lel egyenrangú bounded context,
   a projektet kizárólag `ProjectRef(FlowEpic.Id)` opak referencián át éri el, a Kernel
   `AppDbContext`/RLS érintetlen — ADR-068 4. és 9. fejezet precedens).
3. **Egy jegyzett, nem-blokkoló Kernel-függőség van:** a szerver-oldali *entitled* állapot
   igazságforrása ADR-067 szerint a Kernel `Tenant`-mező lesz, de a `Tenant.EntitledModules`
   **ma nem létezik** (grep `Entitled` a teljes kernel-submodule-on: 0 találat; csak
   `Tenant.EnabledModules` van, `SpaceOS.Kernel.Domain/Entities/Tenant.cs:48-51`). Ez az
   ERPSEP-05/06 sáv már eldöntött (ADR-067 ACCEPTED) feladata, nem Planning-specifikus
   Kernel-igény — a Planning az 5.3 szerinti szerver-oldali gate-tel erre rá tud csatlakozni,
   amikor elkészül; addig az `enabled_modules` claim elleni fail-closed endpoint-ellenőrzés a
   köztes megoldás.

---

## 1. Meglévő képességek térképe (1. kérdés)

### 1.0 Összefoglaló tábla — hostolt / migrált / endpoint / fogyasztó

| Terület | Hostolt | Migrált | Endpoint | Ki fogyasztja |
|---|---|---|---|---|
| Kernel `FlowEpic` + StageChain | ✅ (Kernel API) | ✅ (InitialCreate…0030 + `Migration_0028_StageRegistry`) | ✅ `/api/flow-epics`, `/api/stages`, `/api/stage-chains`, `/api/stage-handoffs` (`FlowEpicEndpoints.cs:18-133`, `StageEndpoints.cs:28-285`, bekötés `Program.cs:412,423`) | Kernel-kliensek; a portál Projects world ma mock (PROJECT_CORE audit) |
| Kernel `FlowManagement` (FlowProject/Program/Milestone/Task) | ❌ prod-on soha nem inicializálódik (`Program.cs:320-327`, csak Dev `EnsureCreated`) | ❌ 0 migráció (glob `**/FlowManagement/**/Migrations/**` üres) | ❌ 0 route (grep `flow-projects|flow-tasks|...` = 0) | senki; ADR-068 5. fejezet: retire-jelölt |
| `spaceos-modules-production` (ProductionJob/WorkflowStep) | ❌ papíron van `Program.cs`, de nincs `AddAuthentication`, nincs appsettings, nincs deploy-hivatkozás | ❌ 0 EF-migráció (csak teszt-`EnsureCreated`, `ProductionTestBase.cs:45`) | 5+1 route (`ProductionController.cs:15-131`) — élesben sosem szolgál ki | **senki** (0 külső csproj-hivatkozás; a portál `production` világa NEM ezt hívja — 1.2) |
| cutting planning-context (CuttingPlan/DaySlot/stratégiák) | ✅ port 5005, systemd (`WORLDS_API_CONTRACTS_2026-07-18.md:9,14-15`) | ✅ 36 migráció | ✅ `/api/cutting/planning/*` + executions + analytics (`CuttingPlanningEndpoints.cs:24-47`) | portál production world (élő API, `modules/production/services/config.ts:21-33`) |
| inventory `Reservation` | ✅ önálló host (`Inventory.Api/Program.cs:10-65`) | ✅ (`20260418000002_AddReservations.cs`) | ✅ `/api/inventory/reservations` POST/DELETE/GET (`InventoryEndpoints.cs:53-56,216-278`) | egyetlen éles hívó: cutting (`ReservePanelsCommandHandler.cs:54`, `ContractsInventoryHttpAdapter.cs:52`) |
| Maintenance WorkOrder-ütemezés | ✅ host + bootstrap (`maintenance/host/Program.cs`, `MaintenanceModuleBootstrap.cs:17-21`), de nincs deploy (0 Dockerfile/compose) | ✅ (`20260707_001_InitialCreate.cs` + `_002_EnableRLS.cs`) | ✅ `/api/maintenance/work-orders/*` 12 route (`WorkOrderEndpoints.cs:41-91`) | portál maintenance world (MSW-mockon át; kontraktus-drift, 1.5) |
| Hosting-csomag + RlsFixtures | könyvtár (nem service) | — | — | runtime: DMS/EHS/HR/Maintenance/QA/CRM/Kontrolling (7 modul); csak-fixture: Inventory, Procurement; **nem fogyasztja: Production, Cutting, Joinery** (5. fejezet) |

### 1.1 Kernel — FlowEpic + StageChain: mennyit fed le a plan-revízió/állapot-szemantikából?

**Keveset, és szándékosan mást.** A `FlowEpic` egy 3-fázisú (`Discovery→Delivery→ClosedDone`,
`WorkflowPhase.cs:6-16`) projekt-életciklus FSM, delegáció-jelzéssel (`DelegateTo`,
`FlowEpic.cs:145-155`) és proof-mezőkkel — **idő nélkül**. A legközelebbi "erőforrás"-fogalom a
`FlowEpicRequiredResource` (`FlowEpicRequiredResource.cs:8-47`): típus+név+darabszám, időablak és
naptár nélkül. A StageChain (`StageChainTemplate.cs:16-107`, max 20 lépés; `StageChainStep`:
SortOrder+IsOptional; `StageDefinition.ModuleEndpoint` = loopback modul-dispatch registry,
`StageDefinition.cs:27-28`) **munkafolyamat-sorrendet** modellez, nem ütemtervet. A
plan-revízió-szemantikából semmi nincs meg: nincs baseline, nincs proposal/publish, nincs
verziózott terv-pillanatkép (a `FlowEpic` snapshotja szerializációs formátum-verzió,
`FlowEpic.cs:217`).

RLS/tenant: a `FlowEpics` táblán FORCE RLS (`scripts/db/init-query-rls.sql:6-17`) + EF query
filter (`AppDbContext.cs:159-160`); a Stage*-táblák RLS-e a
`Migration_0028_StageRegistry.cs:121-146`-ban. **Ez a minta a Planning számára referencia, nem
érintendő felület.**

A `FlowManagement` POCO-kban van ugyan `StartDate/EndDate/TargetDate/DueDate`
(`FlowProject.cs:25-28`, `FlowMilestone.cs:22`, `FlowTask.cs:39`), de a réteg nem migrált, nem
hostolt, RLS-mentes (1.0 tábla), és ADR-068 (5. fejezet + 15.A/1) retire-jelöltnek minősítette —
**nem építőelem** a Planninghez.

### 1.2 Production backend (`src/spaceos-modules-production`) — ownership `decision_required` (ERPSEP-01 §139, §197)

**Nem ütemező modul, hanem egy 6-állomásos manuális gyártáskövető checklist — és jelenleg nem is
életképes kód.** Leletek:

- `ProductionJob` (`Production.Domain/ProductionJobs/ProductionJob.cs`): 3 státusz
  (`Queued/InProgress/ShippingReady`, `ProductionStatus.cs:6-22`), a státusz a lépésekből
  **derivált** (`UpdateJobStatus()`, `ProductionJob.cs:141-151`), nincs Cancelled/OnHold. Az
  **egyetlen ütemezési dátum a `Deadline`** (`:17`); nincs ScheduledStart/End, nincs prioritás,
  nincs időtartam-becslés. A `Pause()` csak a `StatusReason` stringet írja, állapotot nem vált
  (`:156-161`, a saját kommentje mondja ki). A `Reschedule()` teljes logikája: ha az új határidő
  későbbi, kitolja a `Deadline`-t (`:166-173`) — nincs propagáció, nincs kapacitás-ellenőrzés.
- `WorkflowStep` (`WorkflowStep.cs:10-16`): fix, hardkódolt 6 magyar lépés enumként
  (`WorkflowStepName.cs:6-37`, SzabaszatElőgyártás…KiszállításraMegjelölés), sorrend = enum-érték
  (`ProductionJob.cs:76-82`), egyszerre csak 1 lépés lehet InProgress (`:72-73`). **FS/SS/FF/SF,
  lag, duration, munkaerő-igény: 0 találat a modul teljes kódjában.** (Látens bug: a repository
  `.Include(j => j.Steps)` rendezés nélkül olvas vissza, `ProductionJobRepository.cs:23` — az
  index-alapú guard DB-visszaolvasás után nem garantált.)
- **Tenant-vak:** a `Production.Domain`/`Infrastructure` alatt egyetlen `TenantId` sincs (a 3
  találat teszt-fixture az eseményen); nincs auth-bekötés (a `Program.cs` nem hív
  `AddAuthentication`-t, így az `[Authorize]` futásidőben kivételt adna), nincs RLS, nincs
  migráció, nincs appsettings. (Az ERP_CORE_DOMAIN_CONTRACT lencse-1 verdiktje ugyanez: "még
  TenantId sincs".)
- **Ma vélhetően nem is fordul:** az `AssetDowntimeEventHandler.cs:2` a
  `SpaceOS.Modules.Contracts.Maintenance.Events` névteret importálja, de a jelenleg pinnelt
  `spaceos-modules-contracts`-ban **nincs Maintenance mappa és 0 `AssetDowntime` találat**
  (a 2026-07-11-i bin-artefakt még tartalmazta — a kontraktus azóta kikerült a pin alól).
  A handler ráadásul sosincs bekötve (nincs `AddMediatR` a `Program.cs`-ben), csak tesztek
  példányosítják kézzel (`Maintenance_AssetDowntime_ImpactsProduction.cs:46,88,116`).
- **Fogyasztó nulla.** A portál `production` világa a cutting (5005) + joinery service-eket hívja
  (`modules/production/services/config.ts:20-34`; 0 találat `/api/production/...`-ra a portálban;
  `EPICS.yaml:156` megerősíti). A relatív `ProjectReference` a contracts-ra
  (`Production.Application.csproj:14`) az ADR-066 3.6 anti-mintája.
- Ami átvehető belőle: a 6-lépéses faipari folyamat-taxonómia mint **domain-tudás** (iparági
  réteg!), a lépés-TÉNY időbélyegek mintája (StartedAt/CompletedAt — terv-vs-tény varianciához
  külön tényként fogyasztandó, nem felülírandó becsléssel) és az EF owned-collection
  perzisztencia-minta (`ProductionJobConfiguration.cs:39-66`). Ütemezési építőelem: **nulla**.

### 1.3 Cutting — a platform legérettebb (de egy-erőforrású, naptár nélküli) tervező-magja

A cutting modulban él ma az egyetlen valódi "terv" aggregátum-család:

- `CuttingPlan` (`Domain/Aggregates/CuttingPlan.cs`): többnapos terv, `PlanDate`+`PlanDays` (7-90,
  `:31-33`), **FSM: `Draft→Published→Frozen→Closed`** (`Publish` `:65-78`, `Freeze` `:81-92`,
  `Close` `:95-105`) — ez a legközelebbi meglévő minta a Doorstar proposal/publish igényéhez.
  (⚠ FSM-bypass: `[Obsolete] UpdateStatus()` `:57-62`, és a PUT-endpoint ezt hívja.)
- `DaySlot` (`Domain/Entities/DaySlot.cs`): **napi kapacitás-vödör** — `CapacityHours` (default 8h
  hardcode paraméter, `:27`), `UsedCapacityHours`, `UtilizationPercent` (`:22`), `AddJob`
  kapacitás-ellenőrzéssel (`:63-76`), FSM `Open→Locked→Closed` (`:44-60`).
- Pluggable stratégiák (`Application/Strategies/IPlanningStrategyFactory.cs:20-27`: `maxcut-v1`,
  `fifo`, `priority`, `custom`) — de az allokáció mindben azonos **first-fit** a napi vödrökre
  (pl. `PriorityStrategy.cs:39`), nem finite-capacity scheduler.
- `ICapacityModel` absztrakció (`Domain/Interfaces/ICapacityModel.cs:6-18`) + egyetlen
  implementáció, `AreaCapacityModel` (`:12-41`) — **2.5 m²/óra hardcode**, duplikálva a
  rendelés-beemelés becslésében is (`IngestOrderCommandHandler.cs:42-45`); a terv-létrehozás ma
  **fiktív seed-jobokkal** tölt (`CreateCuttingPlanCommandHandler.cs:118`, `7.28m // 91% of 8h`).
- `CuttingExecution` (Execution context, 7-állapotú FSM, `CuttingExecution.cs:53-282`) +
  `BatchAssignment` (batch→gép+operátor+időablak, idempotens `(BatchId,PlanDate)`-en,
  `BatchAssignment.cs:9-66`) + `ScheduleWindow` VO — de a **`ScheduleWindow` fix `StartTime+8h`**
  (`AssignBatchCommandHandler.cs:64-66`) és **átfedés-detektálás nincs** (`ScheduleWindow.cs:20`
  csak `End > Start`-ot validál). `MachineId` típus-drift: string vs Guid a két context között
  (`CuttingExecution.cs:26` vs `BatchAssignment.cs:15`).
- Analytics: **tényidő-mérés van** (`DailyExecutionMetric.AvgDurationMinutes` `:25`,
  `OEEScore.cs:11`), de **nincs visszacsatolás** a becslésbe (0 ilyen kód).
- **Ami nincs a cuttingban:** gép/erőforrás-törzsadat (a `CuttingDbContext.cs:22-71`
  DbSet-listában nincs Machine tábla), műszak/naptár/munkaidő (grep `shift|calendar` = 0
  domain-találat), work center, gép-queue (a portál `useMachineQueue.ts:16` és
  `useWorkstations.ts:15` **fantom endpointokat** hív — `shopfloor|workstation` a cutting
  backendben 0 találat, a hook hardcode mockra esik vissza), setup-idő, async ütemező-job.
- Auth: saját mix (kézi JWT + `ManufacturerOnly` = `RequireClaim("tenant_type","Manufacturer")`,
  `Program.cs:79-81`; tenant-forrás végpont-csoportonként eltér — `WORLDS_API_CONTRACTS:272-279`);
  **nem** a Hosting-csomagot használja.
- `spaceos-nesting-algorithms`: önálló repo, tiszta net8.0 könyvtár (nem service), 3 geometriai
  nesting-stratégia; az egyetlen idő-adata a `NestingResult.ComputationTime` = **algoritmus
  CPU-idő, nem gyártási időtartam** — ütemezés-releváns képessége nincs.

### 1.4 Inventory `Reservation` — a kért "reservations" NEM ez

A Doorstar handoff "reservations"-t kér a Planning modultól. A meglévő Inventory `Reservation`
**készlet-mennyiséget foglal, nem erőforrás-időt**:

- A foglalás egysége `StockItemId + MaterialCode + QuantityReserved/Consumed` (decimal)
  (`ReservationItem.cs:19-28`; DB: `numeric(18,4)`, `20260418000002_AddReservations.cs:42-43`);
  a rendelkezésre állás a `v_stock_availability` view mennyiség-levonása (`:112-128`).
  **`TimeSlot|Capacity|MachineId|ResourceId|StartTime|EndTime` grep: 0 találat** a modulban.
- Nincs jövőbeli időablak: `CreatedAt = UtcNow` + TTL 1-168h (`Reservation.cs:14-15,78-79`) —
  soft-lock lejárattal, nem ütemterv-foglalás.
- Ami viszont **mintaként kiváló** a Planning saját resource-time reservation aggregátumához:
  állapotgép (`Active→Released|Expired|Consumed`, `ReservationStatus.cs:6-9`), idempotencia
  (partial unique index + race-kezelés, `:56-58`, `ReserveStockCommandHandler.cs:116-133`),
  TTL-cleanup worker SECURITY DEFINER függvénnyel (`ReservationCleanupWorker.cs:96`), RLS +
  trigger + `tid`-claim tenant-minta (`:93-106`, `InventoryEndpoints.cs:280-284`), és a
  `consumerModule` allowlist (`HardcodedModuleRegistry.cs:9-15`: `Cutting/Joinery/Cabinet/
  FreeTier`; enforcement: `ReserveStockCommandHandler.cs:47-51`). ⚠ **"Planning" nincs az
  allowlistben** — ha a Planning anyagot akar foglalni, a registry bővítése kell (különben 400).

### 1.5 Maintenance ütemterv-rács — nap-felbontású naptár-nézet, kapacitás nélkül

- Backend: a `WorkOrder`-en `ScheduledAt` (egyetlen időpont) + `EstimatedHours` skalár
  (`WorkOrder.cs:35-36`), `Schedule()` FSM-átmenet jövő-idő guarddal (`:122-141`),
  technikus/partner hozzárendelés (`:146-187`, endpoint `WorkOrderEndpoints.cs:75-76`).
  `MaintenancePlan` VO (`MaintenancePlan.cs:11-20`) + `PreventiveMaintenanceSchedulerService`
  (`:19-55`) — csak **boolean `IsDue`** számítás; nincs recurring munkalap-generálás, nincs
  Schedule/Calendar aggregátum, nincs kapacitás-fogalom (grep `capacity|shift|availability` = 0
  domain-találat; az 5 komment-találat mind a **Production kapacitásszámítását** említi jövőbeli
  fogyasztóként — `GetInProgressWithDowntimeQuery.cs:9`, `IWorkOrderRepository.cs:30-31`).
- Frontend: `modules/maintenance/pages/ScheduleScreen.tsx` — **eszköz×nap CSS-grid** 14 napos
  ablakkal (`SCHEDULE_WINDOW_DAYS`, `services/config.ts:22`), munkalap-gombok időtartam-sáv
  nélkül; a11y-érett. Élő API-t ír (`/api/maintenance/work-orders`), de MSW-mockból fut, és a
  zod-séma ↔ backend-DTO drift él (`scheduledAt/assigneeName` vs `ScheduledStart/AssignedTo`,
  `services/workOrders.ts:40-65` vs `WorkOrderDto.cs:20,23`).
- Planning-releváns portál-készlet ezen felül: `components/scheduling/TimelineRow.tsx:14-23` — az
  egyetlen valódi Gantt-sáv logika (gép×24h, `left/width` százalék), drag&drop hozzárendeléssel
  (`SchedulingPage.tsx:58-102`, élő cutting-API); és a production-világ service-rétege már ma
  hordoz `availableCapacity/allocatedCapacity/utilizationPercent` mezőket **UI nélkül**
  (`modules/production/services/plans.ts:42-44`). Gantt-könyvtár a portálban nincs (0 találat).

### 1.6 Világ ≠ modul — a Planning felület kompozíciós térképe (kötelező keret, 1. pont)

A kötelező keret szerint a Planning **világ**, nem maga a modul. A mai analógia kódban: a portál
`production` világkulcsa a `joinerytech.cutting`+`joinerytech.joinery` kompozíciója, a `warehouse`
a `joinerytech.inventory`+`joinerytech.procurement`-é (ADR-067 1. döntés + migrációs tábla;
`MODULE_PACKAGES_PLAN` 2.3: `@joinerytech/world-*` = kompozíciós csomag, nem katalógus-tétel).
Ugyanez a vágás a Planningre:

- **világ (kompozíció, nem ModuleId):** egy jövőbeli `planning` világ-kulcs a portál
  composition-rétegében (world→module térkép configból, ERPSEP-FE-WORLD-GATING minta) — a
  scheduler-UI, overload-nézet, naptár-szerkesztő képernyők ide tartoznak; újrahasznosítható
  UI-előzmények: `TimelineRow`/`SchedulingPage` (1.5), Maintenance `ScheduleScreen` rács-minta.
- **modul(ok) mögötte:** a 2. fejezet szerinti `spaceos.planning` mag + iparági/instance rétegek.
  A világ 1..n ModuleId-t komponál; a signed katalógusba csak ModuleId-k kerülnek (ADR-067).

---

## 2. Ownership + namespace — opciók indoklással (2. kérdés; döntés: PLAN-02 ADR / Gábor)

### 2.1 A rétegvágás (kötelező keret, 2. pont): mi a mag, mi az iparági, mi az instance-réteg

| Réteg | Namespace | Tartalom (a 6 követelmény + input-pack alapján) | Indoklás |
|---|---|---|---|
| **Mag** | `spaceos.planning` | erőforrás-naptárak (heti műszak + szünetek + zárás/karbantartás/túlóra-kivételek — pontosan a `calendarDraft` alak: weekday/start/end/breaks + integer/fractional capacity-policy); finite-capacity scheduler; FS/SS/FF/SF függőség + lag + partial release + fix-dátum override + extra napok; elapsed duration ↔ labour demand szétválasztás; plan-revíziók + proposal/shadow/publish; erőforrás-idő foglalás; overload/calendar-slots OpenAPI; audit-események; **verziózott standard-import MECHANIZMUS** nyílt kulcs-érték qualifier-ekkel | Mindez iparág-független: a fixture `qualifiers` mezője már ma nyílt objektum (input-pack `operationStandardSamples[].qualifiers`), a `standardImportPreflight.ts:10-13` `SourceQualifier{key,value}` alakja is generikus. Az ADR-067 regex (`spaceos.*` = iparág-agnosztikus) csak akkor tartható, ha a magban egyetlen faipari szó sincs — a Doorstar-oldali keret ezt kifejezetten megköveteli. |
| **Iparági** | `joinerytech.planning-standards` (vagy meglévő `joinerytech.*` modulok bővítése) | a faipari művelet-taxonómia és standard-katalógus TARTALMA (pl. `Fóliázás/Préselés/Tok kapocs`, workflowGroup `Boritás/Ajtólap/Tok` — input-pack minták; a `spaceos-modules-production` 6-lépéses `WorkflowStepName` taxonómiája mint örökség); cutting/joinery-integrációs adapterek (pl. cutting-terv ↔ planning-naptár) | Az ADR-067 szótár-szabálya: magyar faipari szókincs = `joinerytech.*`. A standard-SOROK iparági adatok, a standard-SÉMA magbeli. |
| **Instance** | `doorstar.planning-import` (reserved, ADR-067 instance-namespace minta) | Doorstar Excel-import adapter (`Egység_idő.xlsx` / `Folyamatok.xlsm` mapping, `sourceTaskKey` `GyV-*` kulcsok, `sourceLookupTable/Column/Value` qualifier-szótár, sha256-provenance); a naptár-jóváhagyási workflow Doorstar-oldala; a legacy-képlet kompatibilitási vektorok karbantartása | Az input-pack `sourceProvenance` és a `sourceLookup*` qualifier-ek egyetlen ügyfél Excel-struktúrájához kötöttek — nem portolhatók, pontosan az ADR-067 `<instance>.*` definíciója. A Doorstar-oldali referencia-kód (`legacyPlanningBaseline.ts` fejléce) maga is kimondja: *"The SpaceOS C# Production Planning module will own tenant policy, calendars and capacity reservations"* — a baseline a Doorstar-adapteré marad. |

**A product/component/finish minősítők határa:** a *mechanizmus* (qualifier-kulcskészlet egy
standard-verzión) magbeli; a *szótár* (mely kulcsok léteznek: pl. ajtólap-szám, tokmag) iparági
vagy instance-szintű. A mai input-pack qualifier-ei (`sourceLookupTable` stb.) forrás-lookup
metaadatok, tehát instance-rétegűek — a PLAN-02-nek kell kimondania, hogy a domainbeli
product/component/finish minősítő-kulcsok a `joinerytech.*` rétegben normalizálódnak-e.

### 2.2 Ownership-opciók a mögöttes modulra

- **O-A — új, önálló `spaceos.planning` modul** (sibling a Kernel + 7 ERP-modul mellett; javasolt
  fizikai hely `src/spaceos-modules-planning`, saját host, saját `planning` Postgres-séma, saját
  OpenAPI; a Collaboration ADR-068 O3 precedensének megismétlése). Jelölt aggregátum-készlet (a
  korábbi draft javaslatát átvéve, a PLAN-02 pontosítja): PlanningRun/PlanRevision,
  OperationPlan, DependencyEdge, ResourceCalendar + CalendarException, CapacityReservation
  (névre ld. 4.4), OperationStandard + StandardRevision, append-only audit.
  *Mellette:* (i) a Kernelben nincs mit bővíteni (0. fejezet); (ii) a cutting planning-contextje
  iparág-terhelt namespace-ben és saját auth-mixben él (1.3), általánosítása a
  `joinerytech.cutting` modult tenné a mag tulajdonosává — a kért vágás fordítottja; (iii) a
  `spaceos-modules-production` technikailag alkalmatlan alap (1.2); (iv) a Hosting-minta +
  RlsFixtures készen áll az azonnali felvételre (5. fejezet). *Ellene:* még egy modul-host az
  üzemeltetési térképen.
- **O-B — a cutting planning-contextjének kiemelése és általánosítása** maggá. *Mellette:* a
  CuttingPlan/DaySlot/stratégia-réteg valódi, migrált, tesztelt kód. *Ellene:* (i) a kód
  egy-erőforrású, nap-vödrös, naptár/műszak/gép-törzsadat nélküli (1.3) — a 6 követelményből
  négyhez így is zöldmezős munka kell; (ii) a cutting a `joinerytech.*` rétegben van (ADR-067
  migrációs tábla: `cutting → joinerytech.cutting`), a kiemelés namespace-műtétet és a futó
  5005-ös service refaktorát jelentené egy élő, éppen hardening alatt álló modulban
  (STAB-CUTTING-SECURITY-HARDENING folyamatban); (iii) auth-mintája nem a közös Hosting.
- **O-C — a `spaceos-modules-production` bővítése.** *Ellene minden:* tenant-vak, nem fordul, nem
  hostolt, nem fogyasztott (1.2); ownershipje amúgy is `decision_required` (ERPSEP-01), és az
  ADR-067 a `joinerytech.production` namespace-t adta neki — egy iparági azonosítójú csontvázból
  iparágsemleges magot csinálni kettős ellentmondás. Nem javasolt még tranzitív alapnak sem.

Az audit **nem dönt** — de a bizonyítékok az O-A felé mutatnak; az O-B értéke abban marad meg,
hogy a cutting később a mag **fogyasztójává** válhat (4.3), az O-C-ből pedig a lépés-taxonómia
menthető az iparági rétegbe.

### 2.3 Fogyasztási felület (kötelező keret, 4. pont)

A Doorstar a termékmagot nem másolja: a gate-deliverable a **publikált kontraktus** — az ADR-067
rezsimben aláírt manifest (`docs/knowledge/contracts/spaceos-module-v1.schema.json` séma szerint,
`id: spaceos.planning`), Planning OpenAPI 3.1, tenant/RLS proof és pontos verzió/hash a GitHub
Packages-en (registry-döntés: ADR-067 / Gábor 2026-07-21). Jegyzett előfeltétel-kockázat: a
GitHub Packages scope=org egyezés (`MODULE_PACKAGES_PLAN` 2.5 — `spaceos` org kell a
publikáláshoz; ERPSEP-08 előfeltétel). A Doorstar-oldali fogyasztás kizárólag e publikáció után
indul (DSPLAN-02), forrás-másolás nélkül — a handoff "Gate" szakasza szerint.

---

## 3. Gap-lista a 6 Doorstar-követelmény + a konkrét input-pack vektorok ellen (3. kérdés)

Méret-skála (relatív): **S** = napok, jól körülhatárolt; **M** = 1-2 hetes fókuszált sáv;
**L** = több-hetes, több-aggregátumos; **XL** = L + több modult érintő integráció.

### 3.1 A hat követelmény

| # | Doorstar-követelmény | Meglévő építőelem (fájl:sor) | Zöldmezős rész | Méret |
|---|---|---|---|---|
| R1 | Verziózott standard-import product/component/finish minősítőkkel | Szerver-oldalon **semmi**. Referencia-szemantika a Doorstar-oldalon: `standardImportPreflight.ts:15-49` (candidate-alak + 9 karantén-ok, `duplicate_source_identity`-vel). Távoli rokon: cutting `PriorityProfile` string-ID konfigurációk (`PriorityProfile.cs:17-19`) — nem verziózott. | Standard-aggregate + revision-lánc + import-API + karantén-workflow + qualifier-modell | **M-L** |
| R2 | Elapsed duration és labour demand szétválasztva | Sehol a platformon: a cutting `EstimatedTimeHours` egyetlen skalár (`CuttingJob.cs:13`), Maintenance `EstimatedHours` skalár (`WorkOrder.cs:36`); munkaerő-igény fogalom 0 találat mindenhol. A képlet triviális és a referencia adott (`legacyPlanningBaseline.ts:54-93`: `duration=volume×unitMinutes`, `labour=duration×workforce`, `days=ceil(duration/workingMinutesPerDay)+extraDays`; hiányos input → 0 + `eligibleForAutomaticPlanning:false` + `missingFields`). | A számítási mag kicsi; a perzisztencia + standardokból táplálás az R1-gyel közös | **S** (kalkuláció) / **M** (R1-gyel együtt) |
| R3 | FS/SS/FF/SF + partial release + fix-dátum override + extra napok | **0 platform-kód.** A Production lineáris enum-lánc (`ProductionJob.cs:76-82`), a StageChain SortOrder-lánc (`StageChainValidator.cs:18-49`) — egyik sem függőség-típusos. Referencia-szemantika kész: `dependencyBaseline.ts:65-85` (precedencia: fixed override > partial release > FS/SS start-ág; fixed finish > FF/SF finish-ág, forrás-attribúcióval) + gráf-validálás `validateDependencyGraph` (`:88-129`, 10 hibakód + topologikus rendezés). | Függőség-él modell + bound-feloldás (S a normalizált perc-idővonalon) + **naptár-tudatos** propagáció és ütemezés (ez a nagyobbik fele — a referencia explicit külsőre hagyja: *"resolves these bounds through working calendars and finite capacity"*) | **M** (bound-szemantika) → **L** (naptár-tudatos schedulerrel együtt) |
| R4 | Proposal / shadow-összehasonlítás / explicit publikáció | Részleges minta: `CuttingPlan` `Draft→Published→Frozen→Closed` FSM (`CuttingPlan.cs:65-105`) + publish-kori snapshot (`PlanNestingSnapshot.cs:7-43`, `PublishCuttingPlanCommandHandler.cs:102-110`). **Nincs**: plan-revision lánc, shadow-futtatás, két terv diff-je, revision-hash. Rokon minta más domainből: ADR-068 §8 immutable terms-revision + hash elve. | Plan-revision aggregate + shadow-számítás (aktív terv érintetlenül) + diff read-model + publish-szemantika | **M-L** |
| R5 | Overload + calendar slots OpenAPI-n | Erőforrás-naptár **sehol nincs** (Kernel: 0 találat; cutting: `shift|calendar` 0 domain-találat; Maintenance: nincs Calendar aggregátum). Legközelebbi előzmények: `DaySlot` nap-vödör + `UtilizationPercent` (`DaySlot.cs:22`), portál `plans.ts:42-44` kapacitás-mezők (mock), fantom gép-queue endpointok (`useMachineQueue.ts:16`) mint bizonyított UI-igény. A naptár-alak referencia: `calendarConfigPreflight.ts:2-19` (weekday-műszakok + szünetek + capacity-policy + 11 karantén-ok). | Resource + ResourceCalendar aggregate-ek (műszak/szünet/kivétel), slot-generálás, overload-számítás, OpenAPI read-endpointok | **L** |
| R6 | Legacy-képlet mint kompatibilitási teszt-baseline | A Doorstar-oldalon **kész és futó**: input-pack v1 (sha256-provenance-szel) + vitest (`planningInputPack.unit.test.ts:35-66` — 3 legacy-vektor, 6 függőség-vektor, 3 standard-minta, naptár-preflight). Platform-oldalon: 0. | Ugyanennek a JSON-packnak a beolvasása C# tesztből + a mag kalkulátorának vektor-ekvivalencia asszertje CI-kapuként (hash-pinnelt fixture) | **S** |

### 3.2 A konkrét vektorok — melyik meglévő platform-képesség tudná MA kiszámolni őket?

**Rövid válasz: egyik sem.** Tételesen:

| Vektor (input-pack) | Mit követel | Legközelebbi mai platform-képesség | Verdikt |
|---|---|---|---|
| `legacy-volume-workforce` (20×15p, 2 fő → 300' elapsed / 600' labour / 1 nap) | elapsed≠labour szétválasztás + munkanap-kerekítés | cutting `IngestOrderCommandHandler.cs:42-45` — terület/2.5 m²ph becslés: más képlet, workforce-dimenzió nélkül | ❌ nincs kiszámító |
| `legacy-extra-day` (32×30p, 1 fő, +1 extra nap → 960'/960'/3 nap) | `ceil(960/480)+1` extra-nap szemantika | sehol nincs extra-nap/allowance fogalom (grep 0) | ❌ |
| `legacy-missing-standard` (null unitMinutes/workforce → 0/0/2 nap, `eligibleForAutomaticPlanning:false`, `missingFields`) | hiányos-standard fail-safe + karantén-jelzés | a cutting jobnál az `EstimatedTimeHours>0` kötelező (`CuttingJob.cs:32`) — elutasít, nem karanténoz; nincs missingFields-szemantika | ❌ |
| `fs-positive-lag` / `ss-positive-lag` (100-140 elődhöz +5 lag → 145 ill. 105 earliestStart) | FS/SS él + lag | nincs függőség-típus a platformon (R3) — a Production lépés-guardja (`ProductionJob.cs:76-82`) csak "előző enum-lépés Done" FS-t tud, lag és perc-idővonal nélkül | ❌ |
| `ff-positive-lag` / `sf-positive-lag` (→ earliestFinish 145 ill. 105) | finish-oldali kényszer | finish-kényszer fogalom sehol | ❌ |
| `partial-release-precedes-fs` (releaseMinute 150 legyőzi az FS 200-at, `startSource:"partial_release"`) | részleges átadás elsőbbsége + forrás-attribúció | a `partialReleaseThreshold` csak az input-packban létezik; a cutting `CuttingBatch` anyag-csoport, nem release-küszöb; source-attribúció sehol | ❌ |
| `fixed-bounds-override-derived-bounds` (fixedStart 120 / fixedFinish 280 mindent felülír, `fixed_override`) | kézi fix-dátum override precedencia | Maintenance `Schedule()` fix időpontot tud (`WorkOrder.cs:122-141`), de függőség-feloldás nélkül — nincs mit felülírnia | ❌ |
| `operationStandardSamples` (Fóliázás 340s/2fő SS; Préselés 537s/3fő SS + lookup-qualifier; Tok kapocs 125s/1fő FS) | standard-sor: unitSeconds + workforce + előd + dep-típus + qualifier | nincs standard-katalógus entitás a platformon (R1); a `WorkflowStepName` enum (Production) fix 6 lépés, idő/létszám/qualifier nélkül | ❌ |
| `calendarDraft` (CNC, capacity 1 integer, hétfő 06:00-14:30 + 10:00-10:20 szünet; jóváhagyás-köteles) | erőforrás-naptár műszakkal+szünettel + capacity-policy + revízió | nincs Resource/Calendar aggregate sehol (R5); a `DaySlot.CapacityHours` napi óraszám műszak/szünet-struktúra nélkül | ❌ |

Következmény: a mag kalkulációs+függőség+naptár rétege **teljes egészében új kód** — a platform
hozzáadott értéke nem meglévő számítási képesség, hanem a kész tenant/RLS/hosting/kontraktus-rezsim
(5. fejezet) és a bevált FSM/snapshot/idempotencia-minták (CuttingPlan, Inventory Reservation).

---

## 4. Ütközés-térkép — Planning vs meglévő aggregátumok (4. kérdés; opciók a PLAN-02-nek)

### 4.1 Planning vs `ProductionJob`/`WorkflowStep` (a fő ütközés)

Fogalmi átfedés: a ProductionJob `Deadline`+`Reschedule()`+lépés-lánc ugyanazt a teret célozza,
amit a Planning ütemezett műveletei fednének. A tények (1.2): a modul nem fordul, tenant-vak, nem
hostolt, fogyasztója nincs — **blast radius gyakorlatilag nulla**. Opciók a PLAN-02-nek:

- **P-A (retire + taxonómia-mentés):** a `spaceos-modules-production` formális retire; a
  6-lépéses `WorkflowStepName` taxonómia az iparági standard-katalógus (2.1) magja lesz; a
  Planning saját ütemezett-művelet aggregátumot épít. A gyártás-KÖVETÉS (checklist, fotó-proof)
  igénye külön termék-kérdésként Gáborhoz — a Planning nem execution-tracker.
- **P-B (kettéválasztás):** Planning = tervezés (új modul); a ProductionJob megmarad/újraépül
  **execution-tracking** modulként, amely a Planning publikált tervét `WorkItemRef`-fel
  fogyasztja (ADR-066 2. típus), a lépés-TÉNY időbélyegeket (StartedAt/CompletedAt) pedig a
  Planning varianciaszámítása külön tényként olvassa, sosem írja felül. Így a "terv vs tény"
  határ tiszta — de a mai kódból ehhez is újraírás kell (tenant+auth+migráció nulla).
- **P-C (bővítés):** elvetésre javasolt — 1.2 + 2.2/O-C indokok.

Megjegyzés: az ADR-067 a `production` legacy-ID-t `joinerytech.production`-ra képezte le
"ownership `decision_required`" jelöléssel — a PLAN-02-ben a Planning-döntéssel EGYÜTT zárandó,
hogy a `joinerytech.production` ModuleId él-e tovább (P-B) vagy retire (P-A).

### 4.2 Planning vs Kernel `FlowEpic`/`StageChain`

**Nincs strukturális ütközés** (0. fejezet): a Kernel idő-dimenzió nélküli. A helyes kapcsolat a
már eldöntött referencia-rezsim:

- Projekt-horgony: `ProjectRef(projectId=FlowEpic.Id)` — ADR-066 5. fejezet 7. sor, ELDÖNTVE; a
  Planning a projektet opak ID-ként hordozza, a feloldás a Kernel API-n át, tenant-ellenőrzéssel.
- Rendelés-horgony: `OrderRef` — a CRM/erp-core tulajdona (ADR-066 9.2 döntés, ERPSEP-04 építi);
  a Planning nem duplikál rendelés-fogalmat (a handoff-válasz ezt már vállalta).
- StageChain: a host tenant belső workflow-lánca marad; ha a Planning előrehaladást akar mutatni
  a FlowEpic-en, az **egyirányú projekció** (ADR-068 §11 mintája), nem a két állapotgép
  összeolvasztása. A `StageDefinition.ModuleEndpoint` loopback-dispatch (5000-5099) opcionálisan a
  Planning host felé is mutathat — ez konfiguráció, nem Kernel-kódmódosítás. A Planning a
  StageChainből sorrendet/route-ot fogyaszthat referencia-adatként, de időtartamot/kapacitást
  nem vezethet le belőle (ott nincs is — 0. fejezet).

### 4.3 Planning vs cutting planning-context

Valódi átfedés (CuttingPlan/DaySlot/stratégiák ↔ mag-scheduler). Opciók:

- **C-A (hosszú táv):** a cutting a `spaceos.planning` naptár/slot-képességének fogyasztójává
  válik adapteren át (a DaySlot-vödröket a mag erőforrás-naptára váltaná ki); a nesting
  (geometria) a cuttingban marad — az a valóban iparági rész.
- **C-B (rövid táv, javasolt kiindulás):** párhuzamos futás érintés nélkül — a cutting
  egy-erőforrású belső tervezője marad, a Planning az általános magot építi; integrációs pont
  később, kontraktuson át. Indok: a cutting élő, hardening alatt álló service (1.3), a Planning
  sávja nem nyúlhat bele.
- Mindkét opcióban tiltott: a cutting general-purpose tervezővé hizlalása (2.2/O-B ellenérvek).

### 4.4 Planning vs Inventory `Reservation` (név-ütközés!)

A "reservation" szó két különböző fogalmat fed: anyag-mennyiség soft-lock (Inventory, marad ott)
vs **erőforrás-idő foglalás** (Planning, új aggregate — 1.4 bizonyítja, hogy az Inventory-é nem
alkalmas). PLAN-02-javaslat: a Planning kontraktusban explicit `CapacityReservation` (vagy
`ResourceReservation`) név, hogy kontraktus-szinten se mosódjon össze; ha a Planning anyagot is
foglalna, azt az Inventory API-n át teszi (allowlist-bővítés: `HardcodedModuleRegistry.cs:9-15` +
a DB-driven registry-re váltás megfontolása, ahogy a kód doc-commentje maga is jelzi `:4-5`).

### 4.5 Planning vs Maintenance

Nem ütközés, hanem jövőbeli bemenet: a Maintenance leállásai kapacitás-blokkoló események — a
kódban már előkészített fogyasztási pont van (`GetInProgressWithDowntimeQuery.cs:9` kommentje a
"Production capacity calculation"-t nevezi meg). Az `AssetDowntimeEvent` lánc ma félig sincs
vezetékelve (producer nincs — ADR-066 3.5; a kontraktus-típus eltűnt a pin alól — 1.2); a
Planning naptár-kivétel (karbantartás-ablak) fogalma ezt kontraktus-szinten tudja majd fogadni,
de az MVP-nek nem előfeltétele.

---

## 5. RLS/tenant-minta és a "tenant/RLS proof" gate-deliverable terve (5. kérdés)

### 5.1 Melyik hosting-mintát követi a Planning modul

Az ADR-061/062 rezsim kódban élő alakja a `src/spaceos-modules-hosting` csomag; a **legfejlettebb
felvételi minta a Maintenance bootstrap-alapú hostja** — ezt másolja a PLAN-03:

- Auth: `AddSpaceOsModuleAuth` (`Auth/SpaceOsModuleAuthExtensions.cs:34` — fail-fast konfig,
  `MapInboundClaims=false` `:101`, realm-role mapping `:142-171`, ProblemDetails 401/403).
- Tenancy: `AddSpaceOsModuleTenancy` + `UseSpaceOsModuleTenancy`
  (`Tenancy/SpaceOsModuleTenancyExtensions.cs:24,43`); tenant-feloldás claim-prioritással
  (`tid` → `spaceos_tenants` → legacy `tenant_id`, `TenantResolver.cs:82-112`), header csak
  selection, sosem identity (`:71-75`; hamisított header → 403,
  `TenantResolutionMiddleware.cs:64-71`).
- GUC: `SpaceOsTenantSessionInterceptor` (`Persistence/SpaceOsTenantSessionInterceptor.cs:42` —
  paraméterezett `SELECT set_config(@key,@value,false)` `:153`, fail-loud `:116-122`, pool-reset
  `:83-102`); kulcs: `app.current_tenant_id` (`TenancyDefaults.cs:48`).
- RLS-migráció: `RlsMigrationSql.EnableTenantRls/EnableChildTenantRls`
  (`Persistence/RlsMigrationSql.cs:61-69, 82-102` — ENABLE + **FORCE** + fail-closed
  `NULLIF(...)::uuid` predikátum `:27-28`); modul-oldali példa:
  `src/qa/src/Infrastructure/Persistence/Migrations/20260718050000_EnableTenantRls.cs`.
- Host-váz: `maintenance/host/Program.cs:13-56` + `ISpaceOsModuleBootstrap`
  (`Modules/ISpaceOsModuleBootstrap.cs:11-21`) + `MapModuleHealth`. A Planning `ModuleDescriptor`
  moduleId-ja: `spaceos.planning`.
- Második védelmi réteg: EF `HasQueryFilter` minden aggregátum-gyökéren (hosting README
  `:52-53` minta).

### 5.2 A "tenant/RLS proof" gate-deliverable terve

A megosztott fixture kész és több modulon bizonyított minta — a Planning proofja ennek mechanikus
kiterjesztése:

1. **Fixture:** `SpaceOS.Modules.Hosting.RlsFixtures` — `NonSuperuserRlsFixture`
   (`tests/SpaceOS.Modules.Hosting.RlsFixtures/NonSuperuserRlsFixture.cs`): Postgres 16
   Testcontainer, superuser CSAK DDL-re (`:46-61`), `NOSUPERUSER NOBYPASSRLS` app-role
   (`:99-102`), raw-SQL katalógus-assertek (`pg_roles.rolbypassrls` `:129`,
   `pg_class.relforcerowsecurity` `:151-156`), GUC-tükör (`:174-178`). A `RlsSql.cs:5-12`
   szándékosan NEM EF-en át assertál — a Postgres saját kikényszerítését méri.
2. **Teszt-osztály a Planning modulban** a QA minta szerint
   (`src/qa/tests/Integration/RlsNonSuperuserIsolationTests.cs:15-175`, 4 fact): (a) app-role
   nem superuser/bypass; (b) FORCE RLS a `planning` séma MINDEN dokumentált tábláján (naptárak,
   standards+revisions, plans+revisions, operations, dependencies, reservations, audit/outbox);
   (c) root-aggregate A/B/üres-GUC izoláció + pool-újrahasználat szivárgás-teszt; (d) gyerek-tábla
   EXISTS-policy (pl. plan_operations → plan tenantja szerint).
3. **Worker-szabály:** ha a Planningnek háttér-workere lesz (pl. shadow-számítás,
   slot-újragenerálás), a STAB-RLS-WORKER-BYPASS döntött mintája kötelező: a futó worker-szerep
   `NOBYPASSRLS`, a bizonyítottan keresztbérlős részművelet szűk `SECURITY DEFINER` függvényben,
   NOLOGIN routine-owner tulajdonában, rögzített `search_path`-tal (a task Codex-mementója + az
   Inventory `cleanup_expired_reservations` élő példa, `ReservationCleanupWorker.cs:96`).
4. **Gate-artefakt:** a proof-teszt zöld kimenete + a katalógus-assert eredmények a publikációs
   csomag része (manifest + OpenAPI + verzió/hash mellett), a handoff "Gate" szakasza szerint.

### 5.3 Szerver-oldali entitled/enabled — mi kell hozzá (kötelező keret, 3. pont)

A JWT `enabled_modules` **UI-hint** — és az audit bizonyítja, hogy ma a szerver-oldalon SEMMI nem
ellenőrzi:

- A hosting-csomag a claim-parse-nál **eldobja** az entitlement-adatot: a privát
  `TenantClaimEntry` rekord csak `TenantId`-t olvas (`Tenancy/TenantResolver.cs:47`), az
  `ITenantContext` csak `HasTenant`+`TenantId` (`ITenantContext.cs`); a Kernel `TenantClaimDto`
  `enabled_modules` mezője (`SpaceOS.Kernel.Application/DTOs/TenantClaimDto.cs:20-22`) a
  modul-hostokba be sem jut.
- Grep `enabled_modules|EnabledModules|entitled|IsModuleEnabled` az összes modul-hoston: 0 gate.
  A portál-oldalon is csak parse van, route-gate nincs (`AuthContext.tsx:42-45`,
  `RequireAuth.tsx:5,15` — az ERPSEP-FE-WORLD-GATING zárja majd a UX-felét; a task-doksi maga is
  kimondja: a gating terméknézet-szűrés, a kikényszerítés a szerver-oldalé).
- A Kernel-oldali igazságforrás fele hiányzik: `Tenant.EntitledModules` nem létezik (0. fejezet);
  az `EnabledModules` DB-CHECK-je ráadásul a 9 ökoszisztéma-modul-ID-ra korlátoz
  (`Migration_0029_EcosystemActorTypes.cs:44-45`) — a 7 ERP-modul és a leendő `spaceos.planning`
  **nem is írható bele** ma a Kernel-oszlopba (az ADR-067 alias/kanonikus-ID migrációja rendezi).

**Ami a Planning szerver-oldali entitled/enabled ellenőrzéséhez kell** (bemenet a PLAN-02/03-nak
és az ERPSEP-05/06 sávnak):

1. Hosting-bővítés: a `TenantClaimEntry` olvassa be az `enabled_modules`-t, az `ITenantContext`
   (vagy egy új `IModuleEntitlementContext`) tegye elérhetővé; endpoint-filter/named-policy a
   modul saját ModuleId-jára, **fail-closed** (hiányzó claim → 403).
2. Hitelesített forrás a claim mögé: Kernel `Tenant.EntitledModules ⊇ EnabledModules` mező +
   admin-API (ADR-067 3. döntés, entitlement=Kernel-mező — Gábor 2026-07-27) + Keycloak-mapper;
   hosszabb távon az ERPSEP-06 Instance Context API a claim-frissesség ellen (stale-entitlement
   threat, ADR-067 threat-model utolsó sora).
3. ⚠ **Előfeltétel-bug:** a hosting `TenantClaimEntry` camelCase-ben deszerializál
   `[JsonPropertyName("tenant_id")]` nélkül (`TenantResolver.cs:44,47,127`), miközben a valódi
   Keycloak-claim snake_case (`TenantClaimDto.cs:13`) — csak-`spaceos_tenants` tokennel a
   modul-host 0 tenantot old fel → 403. Mielőtt a Planning (vagy bármely modul) a
   `spaceos_tenants` claimre entitled-gate-et épít, ezt javítani/verifikálni kell. (Jegyzett
   javítás-jelölt, nem e task hatásköre.)

---

## 6. A 4 Doorstar-bemenet státusza (elfogadási kritérium)

A response-doksi "Amit a Doorstartól kérünk" szakasza ellen, az input-pack v1 + kompatibilitási
teszt alapján:

| # | Kért bemenet | Státusz | Részletek |
|---|---|---|---|
| 1 | Legacy-képlet futtatható teszt-baseline (elapsed+labour külön, szélsőséges esetekkel) | ✅ **MEGÉRKEZETT** | 3 legacy-vektor (normál, extra-nap, hiányzó-standard) + 6 függőség-vektor (FS/SS/FF/SF + partial release + fixed override) az input-packban; futtatható vitest (`planningInputPack.unit.test.ts:35-66`) a 4 referencia-TS ellen; forrás-provenance sha256-tal. A kért szélsőségek (extra nap, fix dátum, részleges release) mind lefedettek. |
| 2 | Verziózott standard-minták product/component/finish minősítőkkel (2-3 példa + EGY verzióváltás-példa) | ⚠ **RÉSZBEN** | 3 anonimizált minta megjött (Fóliázás/Préselés/Tok kapocs, unitSeconds+workforce+dep-típus+threshold). Hiányzik: (a) a **verzióváltás-példa** (minden minta egyetlen revízió; `sourceRevision` csak a calendarDraftban szerepel); (b) a qualifier-ek ma forrás-lookup metaadatok (`sourceLookupTable/Column/Value`), nem normalizált product/component/finish minősítők — a domain-szintű minősítő-szótár tisztázása a Doorstar-reviewerrel közös feladat (2.1 vége). |
| 3 | Naptár/műszak-példák (üzemi naptár + túlterhelés-eset az overload-nézethez) | ⚠ **RÉSZBEN** | `calendarDraft` megjött (CNC, integer capacity-policy, 1 műszak szünettel) — de státusza `needs_doorstar_approval`, a `requiredConfirmation` lista (munkanapok, összes műszak/szünet, kapacitások, zárások/karbantartás/túlóra-kivételek) nyitott, és **túlterhelés-példa nincs** a packban. |
| 4 | Nevesített kontakt a kontraktus-draftok review-jára | ❌ **HIÁNYZIK** | `contractReviewer.status = "pending_doorstar_nomination"` (input-pack utolsó sora). |

Kiegészítő jegyzetek a packról: (i) a `purpose` mező explicit kimondja, hogy fixture, nem
import-parancs és nem jóváhagyott naptár — az audit is így kezelte; (ii) `timezone:
Europe/Budapest` + a `dependencyBaseline.ts:60-63` komment a DST/naptár-konverziót a C#
service-re hárítja — a PLAN-02 domain-kontraktusban a timezone/DST-kezelés explicit döntési pont;
(iii) a pack a Doorstar-repóban él — a platform-oldali kompatibilitási CI-kapuhoz (R6) a fájl
hash-pinnelt átvétele/publikálása kell, forrás-másolás nélkül (kontraktus-artefaktként).

---

## 7. Összefoglalás — a PLAN-02 ADR asztalára

1. **Nincs Kernel-STOP** (0. fejezet): a Planning önálló modulként építhető, a Collaboration
   (ADR-068 O3) precedens mintájára; Kernel-kapcsolat kizárólag `ProjectRef`-en és opcionális
   StageChain-projekción át.
2. **A számítási/naptár/függőség-mag zöldmezős** (3.2: a 13 input-pack vektorból ma NULLÁT tud
   kiszámolni bármely platform-képesség) — a platform hozadéka a kész hosting/RLS/proof/
   kontraktus-rezsim és a bevált FSM/snapshot/idempotencia-minták (CuttingPlan, Inventory
   Reservation).
3. **Namespace-vágás javaslat** (2.1): mag = `spaceos.planning` (naptár, scheduler, függőség,
   revízió, foglalás, standard-import-mechanizmus); iparági = faipari taxonómia/standard-tartalom
   (`joinerytech.*`); instance = Doorstar Excel-adapter + legacy-baseline (`doorstar.*`).
   Ownership-opciók: O-A (új `src/spaceos-modules-planning` modul — a bizonyítékok erre mutatnak)
   / O-B (cutting-általánosítás) / O-C (production-bővítés — technikailag alkalmatlan).
   Döntés: Gábor / PLAN-02.
4. **Ütközések rendezve opciókkal** (4. fejezet): ProductionJob → P-A retire+taxonómia-mentés
   vagy P-B tervezés/követés kettéválasztás (`WorkItemRef` + tény-időbélyegek külön fogyasztása);
   cutting → rövid távon érintetlen, hosszú távon fogyasztó; Inventory → név-szétválasztás
   (`CapacityReservation`) + allowlist-bővítés, ha kell; Maintenance → jövőbeli naptár-kivétel
   bemenet, nem MVP-előfeltétel.
5. **Gate-deliverable út tiszta** (5. fejezet): Hosting-minta + RlsFixtures proof másolható; a
   szerver-oldali entitled/enabled gate viszont platform-szinten hiányzik (a hosting
   `TenantClaimEntry` eldobja a claimet; `EntitledModules` nem létezik; + snake_case latens bug) —
   ez az ERPSEP-05/06 sávval közös előfeltétel, a Planning fail-closed endpoint-gate-je addig az
   `enabled_modules` claim ellen épül.
6. **PLAN-02-n eldöntendő** (a korábbi draft listáját megerősítve és kibővítve): (a) ownership +
   séma (O-A/O-B/O-C); (b) a Planning OpenAPI erőforrás-készlete + manifest/verzió/hash rezsim;
   (c) tipizált referenciák (ProjectRef/OrderRef/WorkItemRef + saját CapacityReservation) a
   kereszt-modul táblahozzáférés helyett; (d) split-work / kapacitás-verseny / fix-dátum
   konfliktus-policy; (e) RLS-modell + proof-suite jóváhagyása; (f) world→module kompozíció és
   a generált-kliens kompatibilitási kapu; (g) timezone/DST-kezelés; (h) a `joinerytech.production`
   ModuleId sorsa (P-A/P-B).
7. **Doorstar-bemenetek:** 1 kész, 2 részleges (verzióváltás-példa + overload-példa +
   naptár-jóváhagyás hiányzik), 1 hiányzik (nevesített reviewer) — visszajelzés-lista a Doorstar
   felé a 6. fejezet szerint.

---

## Végrehajtási napló

- 2026-07-27, root-terminál audit-agent: a task-doksi + kötelező bemenetek feldolgozása után 6
  párhuzamos read-only kód-lencse futott (Kernel, spaceos-modules-production, cutting+nesting,
  inventory, maintenance+portál-UI, hosting+RlsFixtures); az eredmények fájl:sor szinten ebbe a
  dokumentumba konszolidálva. Az útvonalon talált korábbi same-day draft (angol, rövid) tartalmilag
  beolvasztva és felváltva (ld. fejléc). Kód, konfig és Doorstar-forrás nem módosult; az egyetlen
  írott fájl ez az audit-doksi. A task-fájl státusz-átállítása és naplóbejegyzése a root terminál
  dolga (e task mutációs határán kívül tartva a task-fájlt is).
