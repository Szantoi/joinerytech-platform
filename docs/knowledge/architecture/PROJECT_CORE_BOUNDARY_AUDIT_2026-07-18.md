# PROJECT_CORE_BOUNDARY_AUDIT — Program→Project→Milestone→FlowEpic→Task, StageChain, B2BHandshake ownership-audit

> **Dátum:** 2026-07-18 (Europe/Budapest)
> **Jelleg:** bizonyíték-alapú, READ-ONLY ownership-audit — nem ADR és nem release-engedély
> **Szerep:** architect (JoineryTech ROOT terminál)
> **Forrás-task:** [`docs/tasks/EPIC-PROJECT-CORE-2026Q3/archive/PROJECT-BOUNDARY-AUDIT.md`](../../tasks/EPIC-PROJECT-CORE-2026Q3/archive/PROJECT-BOUNDARY-AUDIT.md)
> **Kapcsolódó dokumentumok:**
> [`SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md`](SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md) (célarchitektúra, MODARCH-02 = ez az audit kiterjesztve),
> [`PROJECT_STATE_ASSESSMENT_2026-07-18.md`](PROJECT_STATE_ASSESSMENT_2026-07-18.md) (program-pillanatkép, P2 ajánlás)

**Vizsgált HEAD-ek:**

| Repo | Commit | Megjegyzés |
|---|---|---|
| platform (root) | munkafa `main`, lásd `git log -1` a feladat indulásakor | uncommitted EHS/hosting munka folyamatban, ezt az audit nem érinti |
| `src/spaceos-kernel` | `c1f6dd63f786ed76f8ad07d7fa228cc6f4f37c07` | detached HEAD, tiszta munkafa (`git status --short` üres) |
| `src/spaceos-modules/spaceos-modules-kontrolling` | a platform gitlinkje szerinti pin | tiszta, csak olvasott |
| `src/spaceos-modules/spaceos-modules-crm` | a platform gitlinkje szerinti pin | tiszta, csak olvasott |
| `src/joinerytech-portal` | a platform gitlinkje szerinti pin | tiszta, csak olvasott |

**Build/teszt-bizonyíték:** `dotnet test SpaceOS.Kernel.Tests/SpaceOS.Kernel.Tests.csproj --filter "FullyQualifiedName~FlowEpic|FullyQualifiedName~FlowProject|FullyQualifiedName~FlowTask|FullyQualifiedName~FlowMilestone|FullyQualifiedName~FlowProgram|FullyQualifiedName~DelegateFlowEpic" --no-restore` a `spaceos-kernel` gyökérből → **build zöld, 971/971 teszt PASS, 0 FAIL** (futásidő ~3,7 s). Ez bizonyítja, hogy a FlowEpic és FlowManagement domain/application réteg lefordul és a meglévő unit tesztek zöldek — **de nem bizonyít API-integrációt, migrációt Postgresen, sem cross-tenant viselkedést** (lásd 4. és 6. fejezet).

---

## 1. Vezetői összefoglaló

A rendszerben **három, egymástól független "projekt/munkacsomag" fogalomkészlet** létezik egyszerre, plusz egy negyedik, dokumentum-szintű (nem kódolt) modell:

1. **Kernel `FlowEpic`** (`SpaceOS.Kernel.Domain.Entities.FlowEpic`) — gazdag aggregate root, valódi FSM (`WorkflowPhase`), domain eventek, StageChain-integráció, B2BHandshake-delegáció, teljes CQRS (parancs/lekérdezés/endpoint/migráció/teszt lánc). **Ez az egyetlen ma production-felé hostolt, migrált és API-n keresztül elérhető modell.**
2. **`SpaceOS.Modules.FlowManagement`** `FlowProgram`/`FlowProject`/`FlowMilestone`/`FlowTask` — egyszerű POCO-k (nincs `AggregateRoot`, nincs domain event, nincs FSM), saját `ModulesDbContext`-tel regisztrálva a DI-ben, **de SOHA nem kap EF Core migrációt Postgresen** (csak dev SQLite `EnsureCreatedAsync`), **nincs HTTP endpoint egyikükhöz sem**. Egyetlen bekötése: egy belső `IFlowTaskLookup`/`FlowTaskLookup` a Spatial modul `SpatialTaskLinks` tenant-ellenőrzéséhez.
3. **CRM `Opportunity.DelegateToPartner` / `OpportunityDelegatedToPartnerEvent`** — egy harmadik, önálló "B2B delegáció" fogalom `B2BPartnerRef` + opak `B2BHandshakeId` mezővel, **de sehol a kódbázisban nincs hívó** (nincs command handler, nincs endpoint), és **semmi nem köti össze egy valódi Kernel `B2BHandshake`-kel** — a `b2bHandshakeId` paramétert a hívónak kellene megadnia, de nincs olyan hívó.
4. **Portál `ProjectsPage.tsx` (`ProjectsWorldPage`)** — teljesen statikus `mocks/projects.ts` adatból dolgozik (`draft/active/install/done/on_hold` állapot, `dependencies[]` szakág-lista, `items[]` tételek). Nincs hierarchia (Program/Milestone/Epic), nincs actor-nézet, nincs B2BHandshake UI. Egyetlen mezője sem vezethető le ma egy létező API-ból.

**A design-intent** (`PROJECT_MANAGEMENT_MODEL-frontend-designes-v3.md`) egy ötödik, még sehol nem kódolt hierarchiát ír le: `Program → Projekt → Mérföldkő → Almérföldkő → Epik (=FlowEpic) → Task → Subtask`, actor-alapú nézet-szétválással (6 actor típus) és kétirányú B2BHandshake UX-szel (delegáló + fogadó nézet, elfogadás/visszautasítás).

**A legfontosabb, bizonyítékkal alátámasztott felismerés:** a Kernel `FlowEpic` maga sem iparágsemleges — a `FlowEpicScope` enum (`DoorOrder`, `CuttingPlan`, `MicroAssembly`) fát- és ajtógyártás-specifikus értékeket tartalmaz **a Kernel Domain rétegben**, közvetlenül megsértve a célarchitektúra 4.1 szakaszának tiltott függőség-listáját ("A Kernel nem ismerheti a... door, cabinet... vagy faipari műveletet"). Ez jelenleg még nincs a publikus API-n keresztül kitéve (a `POST /api/facilities/{id}/flow-epics` csak `Title`-t fogad), de a domain-modellben és a teszteknyilván jelen van.

A **B2BHandshake jelenleg kizárólag delegáció-létrehozás**: nincs accept/reject/revoke API, nincs allowlist/partner-jóváhagyási lépés (bármely létező tenant ID delegálható), és — ami a legkritikusabb — a **guest tenant az EF Core query filter és a Postgres RLS policy szerint sem tudja lekérdezni a neki delegált epicet**, mert mindkettő kizárólag a tulajdonos (`FlowEpic.TenantId`) szerint szűr. Ez közvetlenül ellentmond a design-intent "a delegált epik mindkét cég projektjében látszik, más nézettel" elvének — **ma egyik oldalon sem látszik semmilyen actor-szűrt nézet, csak a delegáló oldal, csak azért mert ő a tulajdonos.**

---

## 2. Capability mátrix — design intent vs meglévő állapot

| Képesség (design intent) | Domain | Application | API | DB / migráció | Teszt | reuse/adapt/extend/new |
|---|---|---|---|---|---|---|
| **Program** | `FlowProgram` (FlowManagement, POCO) | nincs command/query | nincs endpoint | `ModulesDbContext`, **nincs Postgres-migráció** | `FlowProgramTests.cs` (property-szintű) | **adapt** — ha a Projects bounded context mellett dönt az ADR, ez a legközelebbi kiindulópont, de hosting/migráció/API nélkül gyakorlatilag nem létezik ma |
| **Projekt** | `FlowProject` (FlowManagement, POCO) | nincs | nincs | ua. | `FlowProjectTests.cs` (property-szintű) | **adapt** |
| **Mérföldkő / Almérföldkő** | `FlowMilestone` (FlowManagement, POCO); nincs almérföldkő-szint sehol | nincs | nincs | ua. | `FlowMilestoneTests.cs` (property-szintű) | **new** (almérföldkő), **adapt** (mérföldkő) |
| **Epik (FlowEpic)** | `SpaceOS.Kernel.Domain.Entities.FlowEpic` — teljes AggregateRoot, `WorkflowPhase` FSM (`Discovery→Delivery→ClosedDone`, tervezett `BACKLOG_READY/IN_DEV/IN_REVIEW/CLOSED_DONE/CLOSED_BLOCKED` a design-docban **nem egyezik** a kód `WorkflowPhase`-ével — lásd 5.1) | teljes CQRS: Create/UpdateTitle/StartExecution/Delegate/Close/UploadProof/Archive, mindegyikhez handler+validator+teszt | `POST/GET/PUT/DELETE /api/flow-epics/*`, `POST /api/facilities/{id}/flow-epics` | `AppDbContext`, `FlowEpics` tábla migrálva (`InitialCreate` → `Migration_0030`), Postgres RLS policy (`tenant_isolation_flow_epics`) | gazdag: `SpaceOS.Kernel.Tests/Application/*FlowEpic*`, `SpaceOS.Kernel.IntegrationTests/FlowEpics/*` | **reuse** — ez a source of truth az epik szintre |
| **Task (FlowTask)** | `SpaceOS.Modules.FlowManagement.Domain.FlowTask` — `EpicKernelId` UUID-only referenciával a Kernel `FlowEpic`-re; `ISyncable` (offline sync queue) | nincs command/query | nincs endpoint | `ModulesDbContext`, **nincs Postgres-migráció**; egyetlen élő fogyasztó: `FlowTaskLookup` (csak `TenantId` lookup a `SpatialTaskLinks`-hez) | `FlowTaskTests.cs` (property-szintű) + `OfflineSyncQueueItemTests.cs`/`OfflineQueueServiceTests.cs` (ezek valós szinkron-logikát tesztelnek) | **adapt** — a modell (UUID-only ref a FlowEpicre) jó minta, de production-migráció és API nélkül nem hostolt |
| **Subtask** | sehol nincs modellezve | — | — | — | — | **new** |
| **StageChain (tenant-config)** | `StageChainTemplate`, `StageChainStep`, `StageDefinition` — `TenantScopedAggregateRoot`, max 20 lépés, egyedi `IsDefault` | teljes CQRS: Register/Update/Deactivate StageDefinition; Create/Add/RemoveStep StageChainTemplate; `CreateStageHandoffCommandHandler` (pg advisory lock, SHA-256 payload hash, idempotencia) | `/api/stages`, `/api/stage-chains`, `/api/stage-handoffs`, `/api/flow-epics/{id}/assign-chain\|advance-stage\|skip-stage` | `Migration_0028_StageRegistry` és társai, teljes tábla-készlet | `AdvanceFlowEpicStageCommandHandlerTests`, `StageEndpointTests` | **reuse** — ez a legérettebb réteg, jó minta a többihez |
| **FlowEpic ↔ StageChain kapcsolat** | `FlowEpic.AssignChain`/`AdvanceToStage`/`SkipOptionalStage` + `IStageChainValidator` a hívó felelőssége (a domain metódus maga nem validál sorrendet) | `AdvanceFlowEpicStageCommandHandler` hívja a validátort a domain-metódus előtt | igen, lásd fent | igen | igen, célzott tesztek | **reuse** — egyértelmű, jól tesztelt kapcsolat (4. vizsgálati kérdésre teljes választ ad) |
| **B2BHandshake — delegáció** | `SpaceOS.Kernel.Domain.ValueObjects.B2BHandshake` — **nem entitás, hanem `FlowEpic`-be owned value object** (nincs önálló tábla/Id); csak `GuestTenantId` + `DelegatedOn` + Sprint C nullable mezők (`InitiatorAnchorJson`, `ResponsibleAnchorJson`, `VisibilityScope`, `ContractHash` — mind kitöltetlen, egyetlen író kód sincs rájuk) | `DelegateFlowEpicCommandHandler` — csak azt ellenőrzi, hogy a guest tenant **létezik**; nincs allowlist, nincs partner-kapcsolat-ellenőrzés | `PUT /api/flow-epics/{id}/delegate` | owned type oszlopok a `FlowEpics` táblán | `DelegateFlowEpicCommandHandlerTests` (4 eset: happy path, rossz fázis, epic nem található, guest tenant nem található) | **extend** — az alapmechanizmus jó, de a lifecycle hiányzik |
| **B2BHandshake — accept/reject/revoke** | **nincs** | **nincs** | **nincs** | **nincs** | **nincs** | **new** |
| **B2BHandshake — allowlist / partner-jogosultság** | **nincs** (bármely létező `TenantId` elfogadható delegációs célnak) | **nincs** | **nincs** | **nincs** | **nincs** | **new** |
| **Actor-szűrt nézet (guest oldal látja a rá delegált epicet)** | — | — | — | **explicit blokkolva**: EF `HasQueryFilter` és Postgres RLS is kizárólag `TenantId == owner` szerint enged olvasást (`FlowEpicConfiguration`-höz kapcsolódó `AppDbContext` filter + `init-query-rls.sql` `tenant_isolation_flow_epics` policy) | **nincs teszt** cross-tenant olvasásra | **new** — ez a design-intent egyik központi UX-eleme, ma nem létezik |
| **CRM Opportunity → B2B delegáció** | `Opportunity.DelegateToPartner(partnerId, b2bHandshakeId)` + `OpportunityDelegatedToPartnerEvent` | **nincs hívó sehol** (nincs command handler, nincs endpoint) | **nincs** | `B2BPartnerRef` oszlop van konfigurálva (`OpportunityConfiguration.cs`), de sosem íródik | **nincs** dedikált teszt | **decision_required** — vagy törlésre/deprecate-re szánt maradvány, vagy egy tervezett de meg nem valósított integrációs pont a Kernel B2BHandshake-hez; jelenleg holt kód |
| **Kontrolling projekt-projekció** | `IProjectPortfolioSource` port + `ConfiguredProjectPortfolioSource` (config-seeded, tenant-kulcsolt, production-ben szándékosan üres) | tiszta port/adapter minta | a Kontrolling saját REST kontraktusán keresztül (nem vizsgált itt tovább, nem tartozik a scope-hoz) | nincs saját projekt-tábla — ez szándékos | dokumentált szándék a kódkommentben, de nincs dedikált unit teszt a forrásfájlokban látva | **reuse mintaként** — ez pontosan a célarchitektúra "semleges port" mintája; a tényleges adat-forrás (`reuse a Kernel/FlowManagement adapterrel`) **decision_required**, mert a `ControllingProjectData` mezői (Customer, ContractValue, Invoiced, cost Lines) olyan adatot igényelnek, amit sem `FlowEpic`, sem `FlowProject` nem tárol — ezek CRM/Sales/Kontrolling saját adatai |
| **Portál Projects világ** | — | — | — | mock (`mocks/projects.ts`) | nincs kontraktusteszt | **new** API + **new** adapter a meglévő mock-mezőkhöz (lásd 7. fejezet) |

---

## 3. Aggregate/ownership térkép

```text
SpaceOS Kernel (AppDbContext, migrált, hostolt, tesztelt)
├── FlowEpic (aggregate root)              ← EGYETLEN production-hostolt "epic" fogalom
│     ├── B2BHandshake (owned VO)          ← delegáció-only, nincs önálló identitás/lifecycle
│     ├── FlowEpicRequiredResource (owned) ← skill/resource igény (HR-határos, de csak string)
│     └── Scope: FlowEpicScope             ← IPARÁG-SPECIFIKUS ÉRTÉKEK A KERNELBEN (lásd 5.1)
├── StageDefinition / StageChainTemplate / StageChainStep   ← tenant-config, éles
└── StageHandoff (aggregate root)          ← immutable audit-trail, HandshakeId laza Guid-ref (nincs FK)

SpaceOS.Modules.FlowManagement (ModulesDbContext, regisztrált DI-ben, DE nincs Postgres-migráció)
├── FlowProgram  (POCO)                    ← nincs API, nincs production perzisztencia
├── FlowProject  (POCO)                    ← nincs API, nincs production perzisztencia
├── FlowMilestone (POCO)                   ← nincs API, nincs production perzisztencia
└── FlowTask (POCO, ISyncable)             ← EpicKernelId UUID-only ref a Kernel FlowEpicre;
                                              egyetlen élő fogyasztó: FlowTaskLookup (Spatial modul)

CRM modul (saját DbContext)
└── Opportunity.B2BPartnerRef + OpportunityDelegatedToPartnerEvent
      ← saját, nem hívott, nem integrált "delegáció" — 3. párhuzamos modell

Kontrolling modul (saját DbContext)
└── IProjectPortfolioSource (port) → ConfiguredProjectPortfolioSource (config-adapter)
      ← NEM tulajdonos, csak projekció; a valós forrás ma nem létezik

JoineryTech Portal (React, mock-driven)
└── ProjectsWorldPage → mocks/projects.ts
      ← 4. párhuzamos, csak UI-szintű "projekt" alak, semmilyen API-hoz nem kötve
```

**Egyértelmű ownership-állítások, amit ez az audit bizonyít:**

- A **FlowEpic** a source of truth az "epik" szintre — production-hostolt, migrált, tesztelt, RLS-védett.
- A **StageChainTemplate/StageDefinition/StageHandoff** a source of truth a tenant-konfigurálható fázis-sorrendre — ugyanolyan érett, mint a FlowEpic.
- **Program/Projekt/Mérföldkő/Almérföldkő/Task/Subtask szintre ma nincs production source of truth.** A FlowManagement modell a legközelebbi kódolt kiindulópont, de nincs hostolva.
- A **B2BHandshake teljes lifecycle-jére (invite/accept/reject/revoke, allowlist, actor-view) ma nincs source of truth sehol** — sem Kernelben, sem CRM-ben.

---

## 4. Duplikáció és konfliktuslista

| # | Konfliktus | Bizonyíték | Kockázat |
|---|---|---|---|
| D1 | **FlowEpic vs FlowManagement.FlowTask** — két, egymástól független "munkaegység" modell, mindkettő UUID-alapú, de csak az egyik hostolt | `SpaceOS.Kernel.Domain.Entities.FlowEpic` vs `SpaceOS.Modules.FlowManagement.Domain.FlowTask.EpicKernelId` (UUID-only, nincs FK) | ha valaki a FlowManagement modellre épít API-t, egy már ma is duplikált fogalmat hostol tovább |
| D2 | **FlowEpicScope iparág-specifikus értékek a Kernel Domainben** | `SpaceOS.Kernel.Domain.Enums.FlowEpicScope.cs`: `DoorOrder`, `CuttingPlan`, `MicroAssembly` — direkt ellentmond a célarchitektúra 4.1 "tiltott függőségek" listájának | ha ez az enum bővül vagy API-n keresztül kiadásra kerül, a Kernel iparág-függővé válik; már ma is jelen van a doménben és a tesztekben |
| D3 | **CRM `Opportunity.DelegateToPartner` mint 3. delegáció-modell** | `OpportunityDelegatedToPartnerEvent` + `B2BPartnerRef`, de nincs hívó, nincs Kernel-integráció | holt kód, de névben és szándékban ütközik a Kernel B2BHandshake-kel — ha valaki API-t épít rá anélkül, hogy tudná a Kernel modellt, harmadik párhuzamos delegáció-implementáció születik |
| D4 | **Portál `ProjectsPage.tsx` negyedik "projekt" alak** | `mocks/projects.ts` mezői (`dependencies[]`, `items[]`, `installTarget`, `margin`) nem felelnek meg sem a FlowEpic, sem a FlowManagement, sem a design-intent hierarchiának | ha valaki ebből indul ki API-tervezéskor, egy már a UI-ban élő, de sehol nem kanonikus alakot kódol be a kontraktusba |
| D5 | **StageHandoff.HandshakeId dangling reference** | `StageHandoff.HandshakeId` egy szabad `Guid?`, nincs FK-kényszer semmilyen Handshake-táblára (mert a B2BHandshake nem is önálló entitás/tábla) | integritás nélküli mező; jelenleg senki nem tölti ki valós B2BHandshake-azonosítóval, mert nincs ilyen azonosító |
| D6 | **`WorkflowPhase` (kód) vs epik-FSM (design-doc)** | Kód: `Discovery → Delivery → ClosedDone` (`FlowEpic.StartExecution/Close`); design-doc: `BACKLOG_READY → IN_DEV → IN_REVIEW → CLOSED_DONE/CLOSED_BLOCKED` | a design-korpusz és a kód FSM-je **nem ugyanaz a névtér** — vagy a design-doc elavult, vagy a kód implementálja csak részlegesen a tervezett FSM-et; ADR-döntés kell, melyik a kanonikus |

---

## 5. Vizsgálati kérdésekre adott válaszok

### 5.1 Kérdés 1 — FlowManagement.FlowProject/FlowTask vs Kernel FlowEpic

**Különbség:** `FlowEpic` teljes DDD aggregate root (privát setterek, domain eventek, FSM-guardolt metódusok, `ISnapshotable`). `FlowManagement.FlowProject`/`FlowTask`/`FlowMilestone`/`FlowProgram` egyszerű `IFlowNode`-implementáló POCO-k — nincs domain event, nincs FSM-guard (a `FlowTask.Reopen()` egyetlen invariánst véd: csak "Completed"-ből lehet visszanyitni).

**Melyik aktív, hostolt, perzisztált?** Kizárólag a **Kernel FlowEpic**:
- `AppDbContext.FlowEpics` DbSet, EF migrációk `20260327194934_InitialCreate`-től `Migration_0030`-ig, Postgres RLS policy (`init-query-rls.sql`).
- `SpaceOS.Modules.FlowManagement.ModulesDbContext` regisztrálva van a DI-ben (`Program.cs` 292. sor), **de**:
  - Fejlesztésben csak `EnsureCreatedAsync()` fut (SQLite) — nincs migrációtörténet.
  - Productionben (`else` ág, 341-351. sor) **csak `AppDbContext.MigrateAsync()` fut — a `ModulesDbContext`-re soha nem hívódik migráció**.
  - Nincs `ModulesDbContextModelSnapshot.cs` sehol a repóban (ellenőrizve: csak `AppDbContextModelSnapshot.cs` és `HashSinkDbContextModelSnapshot.cs` létezik).
  - **Következtetés: a `FlowTasks`/`FlowProjects`/`FlowMilestones`/`FlowPrograms` táblák Postgres productionben feltehetően nem léteznek** — a `ModulesDbContext` kizárólag dev SQLite-on bizonyítottan működik.
  - Megerősítő jel: `SpaceOS.Infrastructure/Migrations/20260407140000_Migration_0019_SpatialTaskLinks.cs` egy `FK_SpatialTaskLinks_FlowTask` idegen kulcsot hoz létre a `"FlowTasks"` táblára — **de a `"FlowTasks"` táblát létrehozó `CREATE TABLE` migráció sehol nem található** a repóban. Ez vagy azt jelenti, hogy ez a migráció production Postgresen sosem futott le sikeresen, vagy a tábla kézi DDL-ből származik — egyik állítás sem igazolható a jelen forrásokból, ezért **decision_required**.

### 5.2 Kérdés 2 — Program/Project/Milestone hierarchia API-ja és tenant/RLS-készültsége

Nincs HTTP endpoint egyikükhöz sem (`grep` a teljes `spaceos-kernel`-en `flow-project`/`flow-task`/`flow-program`/`flow-milestone` route-stringre: **0 találat**). A `FlowManagement` entitásokon van `TenantId` mező, de mivel nincs migráció Postgresre és nincs RLS policy definiálva rájuk sehol (`init-query-rls.sql` csak `FlowEpics`-re és a Tool Registry táblákra vonatkozik), **a tenant-izoláció ezen a rétegen bizonyíthatatlan** — nincs mit tesztelni, mert nincs élő adatút.

### 5.3 Kérdés 3 — B2BHandshake: delegáció-VO vagy teljes lifecycle?

**Bizonyítottan csak delegáció-VO.** `B2BHandshake` (`SpaceOS.Kernel.Domain.ValueObjects.B2BHandshake`) egy `sealed record`, amit a `FlowEpic.DelegateTo(guestTenantId)` hoz létre és állít be a `Handshake` propertyre (owned type, nincs önálló Id/tábla). Nincs:
- `AcceptHandshake`/`RejectHandshake`/`RevokeHandshake` metódus a `FlowEpic`-en (ellenőrizve: teljes szövegkeresés `Accept|Reject|Revoke|Decline` mintára a Handshake kontextusban → 0 releváns találat).
- Allowlist vagy partner-kapcsolat entitás — `DelegateFlowEpicCommandHandler` kizárólag azt ellenőrzi, hogy a `guestTenantId` egy létező `Tenant`, semmi mást.
- Actor-jogosultsági réteg a delegáció felett a `WritePolicy`-n túl (ami generikus write-jogosultság, nem B2B-specifikus).

A Sprint C mezők (`InitiatorAnchorJson`, `ResponsibleAnchorJson`, `VisibilityScope`, `ContractHash`) jelen vannak a value objectben, de **egyetlen író kódot sem találtam rájuk** — ezek előkészített, de kitöltetlen bővítési pontok.

### 5.4 Kérdés 4 — StageChain tenant-config és FlowEpic FSM kapcsolata

**Egyértelmű és jól tesztelt.** `FlowEpic.AssignChain(chainTemplateId, firstStageCode)` és `AdvanceToStage(targetStageCode)` a `StageChainTemplate`/`StageDefinition` regisztrációra épül; a sorrend-validáció felelőssége explicit módon az `IStageChainValidator`-é, amit az `AdvanceFlowEpicStageCommandHandler` hív meg **a domain-metódus előtt** (a domain-metódus maga nem validál — ez dokumentált tervezési döntés, nem hiányosság). A `StageHandoff` aggregate rögzíti az egyes átmeneteket idempotens, hash-elt, advisory-lock-kal szinkronizált módon. Ez a réteg — a FlowEpickel együtt — a legérettebb, production-közeli rész a teljes vizsgált felületen.

### 5.5 Kérdés 5 — sales/order, cost, document, production, QA referenciák és UUID/port határ

- **Sales/order:** a `FlowEpicScope.DoorOrder` érték közvetlen bizonyíték arra, hogy a Kernel FlowEpic ma implicit módon "tud" a rendelés-fogalomról (bár csak enum-címke szinten, külső kulcs nélkül). Explicit `OrderRef`/`SubjectRef` mintájú semleges referencia **ma nem létezik a kódban** — a célarchitektúra 5.2 szakaszában javasolt forma egyelőre csak terv.
- **Cost:** a Kontrolling `IProjectPortfolioSource` egyértelműen **nem birtokolja** a projekt-hierarchiát, csak egy read-modellt vár tőle (`ProjectId`, `ProjectCode`, `Customer`, `ContractValue`, `Invoiced`, `Lines[]`) — ez explicit dokumentálva van a kódkommentben ARCHITEKTURÁLIS SEAM címkével.
- **Document, Production, QA:** ebben a kódbázisban (Kernel + FlowManagement + Kontrolling + CRM + portál Projects world) **nincs közvetlen hivatkozás** semelyik dokumentum-, gyártás- vagy minőségbiztosítási entitásra a FlowEpic/FlowManagement modellekből. Ez azt jelenti, hogy a jelenlegi UUID/port-határ **még nincs kialakítva** ezekhez a modulokhoz — az egyetlen bizonyított kereszthivatkozás a `FlowTaskLookup` (Spatial modul → FlowManagement) és a `FlowEpicRequiredResource` (skill/resource — HR-határos, de csak szabad szöveg, nincs FK HR modulra).
- Doorstar/Production-specifikus modellek (pl. `ProductionJob`/`WorkflowStep`) **nem tartoznak e feladat kötelező forrásai közé**, és a célarchitektúra-dokumentum is külön, kiterjesztett MODARCH-02 auditra utalja őket — ezt az auditot **nem terjesztettem ki** rájuk, mert a kapott feladatleírás (`PROJECT-BOUNDARY-AUDIT.md`) nem sorolja fel őket kötelező forrásként. **decision_required**, hogy ez az audit elegendő-e a Production/Doorstar döntéshez, vagy külön kört igényel (a célarchitektúra-terv szerint igen).

### 5.6 Kérdés 6 — Kontrolling `IProjectPortfolioSource` minimális projekciója és kiválthatósága

A port pontos szerződése (`ControllingProjectData`):

```
ProjectId (Guid), ProjectCode (string, business key), Name, Customer,
Status (ProjectLifecycleStatus — "nem FSM, csak címke"),
ContractValue (Money), Invoiced (Money), Lines[] (Category, Label, Plan, Actual, Note?)
```

**Kiválthatóság Kernel/FlowManagement adapterrel:** részleges. A `ProjectId`/`Name`/`Status` triviálisan leképezhető egy `FlowProject`-ből (ha az valaha hostolva lesz), de a `ProjectCode` (üzleti kulcs), `Customer`, `ContractValue`, `Invoiced` és a cost `Lines[]` **egyike sem létezik sem a `FlowProject`, sem a `FlowEpic` modellben** — ezek CRM (Customer, ContractValue az ajánlatból), Kontrolling saját (cost lines) és számlázási adatok. **Egy tiszta Kernel/FlowManagement adapter önmagában nem elégítené ki ezt a portot** — szükség lenne egy összesítő (orchestrating) rétegre, ami pontosan a célarchitektúra P2 "Projects mint orchestration bounded context" ajánlásának indoklása. A jelenlegi `ConfiguredProjectPortfolioSource` ezt a hiányt **explicit és őszintén** dokumentálja (production-ben szándékosan üres portfóliót ad), ami jó minta — nem kell/nem szabad megkerülni egy hamis adatforrással.

### 5.7 Kérdés 7 — Portál statikus Projects oldal: mit talál ki, mi tölthető valós endpointból?

A `ProjectsWorldPage` (`src/joinerytech-portal/src/pages/ProjectsPage.tsx`) **kizárólag** a `../mocks/projects` statikus tömbjéből dolgozik — nincs `fetch`, `useQuery`, service-import vagy MSW-handler-hivatkozás a fájlban. Mezőnkénti leképezés:

| Mock mező | Elérhető valós endpoint ma | Megjegyzés |
|---|---|---|
| `id`, `name`, `status` (draft/active/install/done/on_hold) | részben: `FlowEpic.Id`, `Phase` — **de más értékkészlet** (`Discovery/Delivery/ClosedDone`) | státusz-leképezés nem 1:1, ADR kell |
| `customer` | **nincs** — sem FlowEpic, sem FlowProject nem tárol ügyfél-mezőt; CRM `Opportunity`-ben van `Customer`, de nincs kötés | gap |
| `designer` | **nincs** sehol a vizsgált modellekben | gap |
| `installTarget` (dátum) | részben: `FlowMilestone.TargetDate` (ha valaha hostolva lesz) vagy `StageChainStep` sorrend | csak koncepcionálisan, ma nem elérhető |
| `margin` | **nincs** — Kontrolling `ControllingProjectData.ContractValue`/`Invoiced`-ből származtatható lenne, de az a port ma üres productionben | gap |
| `items[]` (tételek, érték) | **nincs** — sem FlowEpic, sem FlowProject nem tárol tétel-listát; ez leginkább egy Sales/Order modell dolga lenne | gap |
| `dependencies[]` (szakág-állapot, `blocksInstall`) | koncepcionálisan `StageChainStep`/`StageHandoff` (más szakágakhoz delegált epicek állapota), **de ma nincs ilyen aggregáló lekérdezés** | gap |
| `note` | **nincs** | gap |

**Következtetés:** a portál Projects világa ma **0%-ban** táplálható valós endpointból anélkül, hogy (a) az ADR eldöntené a Projects bounded context pontos tulajdonát, és (b) legalább a FlowEpic-alapú milestone/dependency-aggregáció, a Kontrolling cost-projekció és egy CRM customer-referencia együttesen elkészülne.

---

## 6. Tenant/B2B threat boundary

### 6.1 Host tenant (delegáló) nézete

- A host tenant a saját `FlowEpic`-jét a normál tenant-scope-olt `GetFlowEpicById`/`ListFlowEpics` lekérdezésekkel éri el — ezt az EF `HasQueryFilter` és a Postgres RLS is helyesen korlátozza a saját `TenantId`-ra.
- A `DelegateFlowEpicCommandHandler` **nem ellenőrzi**, hogy a hívó ténylegesen a `FlowEpic.TenantId` tulajdonosához tartozik-e a normál `WritePolicy`-n túl — ez a tenant-scope-olt middleware-re van bízva (ezt ez az audit nem tudta forrásból bizonyítani a `WritePolicy` implementációjának teljes körű vizsgálata nélkül; **decision_required**, hogy a `WritePolicy` ténylegesen tenant-scope-olt-e minden endpointra nézve).

### 6.2 Guest tenant (fogadó) nézete

- **Bizonyítottan nem létezik.** Sem az EF `HasQueryFilter` (`AppDbContext.cs` 159-160. sor: `fe.TenantId == CurrentTenantGuid`), sem a Postgres RLS policy (`init-query-rls.sql`: `"TenantId" = current_setting(...)`), sem egyetlen query handler (`GetFlowEpicByIdQueryHandler`, `ListFlowEpicsQueryHandler`, `GetFlowEpicsByFacilityQueryHandler`) nem enged olvasási hozzáférést a `Handshake.GuestTenantId` alapján.
- **Ez azt jelenti, hogy a jelenlegi rendszerben egy delegált epicet a fogadó tenant technikailag nem tud lekérdezni a platformon keresztül**, még akkor sem, ha ismeri az epic ID-t — a query filter kizárja.
- Nincs "beérkező delegációk" lista/inbox nézet egyik oldalon sem.

### 6.3 Allowlist és actor-jogosultság

- **Nincs allowlist.** Bármely, a `Tenant` táblában létező tenant ID érvényes delegációs célként (`_tenantRepository.GetByIdAsync(guestTenantId)` — kizárólag létezést ellenőriz, nem üzleti kapcsolatot).
- **Nincs actor-típus modell** a Kernelben (a design-doc 6 actor típusa — Manufacturer/Supplier/Dealer/Installer/Designer/Client — sehol nincs kódolva).
- **Nincs proof-láthatósági szabály a guest oldalon** — a `ProofUrl`/`ProofHash` a `FlowEpic`-en van, amit a guest szintén nem érhet el olvasásra a fenti RLS-korlát miatt, tehát az "elvégezte, visszajelzi: DONE" UX-folyamat (design-doc) technikailag nem megvalósítható a mai adatmodellel.

### 6.4 Cross-tenant delegation path — szekvenciadiagram (jelenlegi, bizonyított viselkedés)

```text
Host tenant admin                Kernel API                    Postgres (RLS)
      │                               │                               │
      │  PUT /api/flow-epics/{id}/delegate                            │
      │  { guestTenantId }            │                               │
      ├──────────────────────────────►│                               │
      │                               │ DelegateFlowEpicCommandHandler│
      │                               │  • epic := GetByIdAsync(id)   │
      │                               │  • guestTenant := TenantRepo  │
      │                               │      .GetByIdAsync(guestId)   │
      │                               │      (csak létezést ellenőriz)│
      │                               │  • epic.DelegateTo(guestId)   │
      │                               │      (csak Discovery fázisban)│
      │                               │  • SaveChanges                │
      │                               ├──────────────────────────────►│
      │                               │  UPDATE "FlowEpics" SET       │
      │                               │  Handshake_GuestTenantId=...  │
      │                               │  WHERE TenantId = host (RLS)  │
      │  200 OK                       │◄──────────────────────────────┤
      │◄──────────────────────────────┤                               │
      │                               │                               │

Guest tenant admin (a partner)   Kernel API                    Postgres (RLS)
      │                               │                               │
      │  GET /api/flow-epics/{id}     │                               │
      ├──────────────────────────────►│                               │
      │                               │ GetFlowEpicByIdQueryHandler   │
      │                               ├──────────────────────────────►│
      │                               │ SELECT * FROM "FlowEpics"     │
      │                               │ WHERE TenantId = guest (RLS)  │
      │                               │  → 0 sor (a sor TenantId=host)│
      │  404 Not Found                │◄──────────────────────────────┤
      │◄──────────────────────────────┤                               │
      │  (a design-intent szerint     │                               │
      │   itt "Beérkezett megbízás"   │                               │
      │   nézetet kellene kapnia)     │                               │
```

**Ez a diagram a jelenlegi kód alapján bizonyított, nem feltételezett** viselkedés — a guest tenant 404-et kap, mert az RLS/query filter a tulajdonos tenantra szűkít, és nincs második, a `Handshake.GuestTenantId`-ra épülő ág egyik lekérdezésben sem.

### 6.5 Happy path szekvenciadiagram (host-only, jelenleg működő rész)

```text
Host tenant                     Kernel API
    │  POST /api/facilities/{fid}/flow-epics {title}
    ├───────────────────────────►│  CreateFlowEpicCommand(title, facilityId, tenantId)
    │  201 Created {id}          │
    │◄───────────────────────────┤
    │  PUT /{id}/start            │  StartFlowEpicExecutionCommand → Phase=Delivery
    ├───────────────────────────►│
    │  POST /{id}/proof (bytes)   │  UploadFlowEpicProofCommand → proofUrl+hash
    ├───────────────────────────►│
    │  PUT /{id}/close {url,hash} │  CloseFlowEpicCommand → Phase=ClosedDone
    ├───────────────────────────►│
    │  200 OK                     │
```

Ez a láncolat bizonyítottan hostolt, tesztelt (`CreateFlowEpicCommandHandlerTests`, `StartFlowEpicExecutionCommandHandlerTests`, `UploadFlowEpicProofCommandHandlerTests`, `CloseFlowEpicCommandHandlerTests`) és RLS-védett a saját tenant kontextusában.

---

## 7. Event/port térkép

```text
FlowEpic domain events (Kernel, hostolt, MediatR notification handlerekkel):
  FlowEpicCreatedEvent          → FlowEpicCreatedEventHandler
  FlowEpicExecutionStartedEvent → FlowEpicExecutionStartedEventHandler
  FlowEpicDelegatedEvent        → FlowEpicDelegatedEventHandler (csak logol — nincs
                                   értesítés a guest tenant felé, nincs outbox-integráció
                                   látható itt)
  FlowEpicClosedEvent           → FlowEpicClosedEventHandler
  FlowEpicTitleUpdatedEvent     → FlowEpicTitleUpdatedEventHandler
  FlowEpicArchivedEvent         → (nincs dedikált handler-fájl a talált listában — decision_required,
                                   hogy ez szándékos-e)
  FlowEpicStageAdvancedEvent / FlowEpicStageSkippedEvent → StageRegistry oldalon dolgozott fel
  StageHandoffCreatedEvent      → StageRegistry infrastruktúra

CRM domain event, NEM integrált:
  OpportunityDelegatedToPartnerEvent → nincs handler, nincs publisher hívó út (holt esemény)

Kontrolling port (nem esemény, hanem lekérdezési port):
  IProjectPortfolioSource → ConfiguredProjectPortfolioSource (config-adapter, tudatosan üres
  productionben) — ez a célarchitektúra 5.3 "explicit application port és adapter" mintájának
  tiszta, követendő példája.

FlowManagement — nincs semmilyen kimenő esemény vagy port a modulból kifelé, az egyetlen
befelé irányuló kapcsolat a FlowTaskLookup (Infrastructure réteg → ModulesDbContext,
csak olvasás, csak TenantId).
```

**Következtetés:** a `FlowEpicDelegatedEvent` a jelenlegi egyetlen pont, ahol egy tényleges cross-tenant értesítési/port mechanizmus kiépülhetne (pl. outbox → guest tenant inbox), de ma **csak naplóz**. Ez a legkonkrétabb, azonnal megvalósítható extension point a B2BHandshake lifecycle bővítéséhez.

---

## 8. Reuse / adapt / extend / new döntési táblázat (összefoglaló)

| Képesség | Döntés | Indoklás |
|---|---|---|
| FlowEpic (epik-szint, FSM, proof) | **reuse** | production-hostolt, migrált, tesztelt, RLS-védett |
| StageChainTemplate/StageDefinition/StageHandoff | **reuse** | ugyanolyan érett, jó minta a többi kiterjesztéshez |
| FlowManagement.FlowProgram/FlowProject/FlowMilestone | **adapt** | jó domain-váz, de hosting/migráció/API hiányzik — ADR-nek kell eldöntenie, hogy ez legyen-e a Projects bounded context kiindulópontja, vagy új modul induljon |
| FlowManagement.FlowTask | **adapt** | az `EpicKernelId` UUID-only minta jó precedens portokhoz, de önmagában nem elég egy Task-API-hoz |
| B2BHandshake — delegáció alapmechanizmus | **extend** | a `DelegateTo`/`FlowEpicDelegatedEvent` jó alap, de lifecycle (accept/reject/revoke), allowlist és actor-view hiányzik |
| B2BHandshake — actor-szűrt kétirányú láthatóság | **new** | ma szerkezetileg lehetetlen a jelenlegi query filter/RLS mellett — új query-ág és valószínűleg új read-model kell |
| CRM Opportunity delegáció | **decision_required** | vagy törlés/deprecate, vagy tudatos integrációs terv a Kernel B2BHandshake-hez — ma egyik sem történt meg |
| Kontrolling IProjectPortfolioSource | **reuse mintaként**, a mögötte lévő adatforrás **new/decision_required** | a port jó, de a valós adatforrás (Projects bounded context) még nem létezik |
| Portál Projects világ | **new** (API) + **adapt** (UI-komponensek, ha a mezőkészlet igazodik) | a mai mock-mezők nagy része (customer, items, margin) más modulok felelőssége, nem csak API-bekötés kérdése |
| FlowEpicScope (iparág-specifikus enum a Kernelben) | **decision_required / relocate** | a célarchitektúra szerint ez nem maradhat a Kernel Domainben; JoineryTech industry pack vagy Production modul tulajdona kellene legyen |

---

## 9. Konkrét gap-lista (fájl- és endpoint-hivatkozásokkal)

1. **`ModulesDbContext` nincs migrálva Postgresen** — `src/spaceos-kernel/SpaceOS.Kernel.Api/Program.cs:341-351` (a production ág csak `AppDbContext.MigrateAsync()`-et hív). Nincs `ModulesDbContextModelSnapshot.cs`.
2. **Dangling FK-feltételezés** — `src/spaceos-kernel/SpaceOS.Infrastructure/Migrations/20260407140000_Migration_0019_SpatialTaskLinks.cs:41-42` `"FlowTasks"` táblára hivatkozik, amit semmilyen migráció nem hoz létre.
3. **Nincs endpoint FlowProgram/FlowProject/FlowMilestone/FlowTask-hoz** — teljes szövegkeresés `flow-project`/`flow-task`/`flow-program`/`flow-milestone` route-stringre a `spaceos-kernel`-ben: 0 találat.
4. **B2BHandshake accept/reject/revoke hiányzik** — `src/spaceos-kernel/SpaceOS.Kernel.Domain/Entities/FlowEpic.cs` egyetlen metódusa sincs erre (`DelegateTo` az egyetlen).
5. **Guest tenant nem tudja lekérdezni a delegált epicet** — `src/spaceos-kernel/SpaceOS.Infrastructure/Data/AppDbContext.cs:159-160` (`HasQueryFilter`) és `src/spaceos-kernel/scripts/db/init-query-rls.sql:9-14` (`tenant_isolation_flow_epics` policy), egyik sem tartalmaz `Handshake.GuestTenantId` ágat.
6. **Nincs allowlist a delegációhoz** — `src/spaceos-kernel/SpaceOS.Kernel.Application/FlowEpics/Commands/DelegateFlowEpic/DelegateFlowEpicCommandHandler.cs:58-61` csak létezést ellenőriz.
7. **`FlowEpicScope` iparág-specifikus értékek a Kernel Domainben** — `src/spaceos-kernel/SpaceOS.Kernel.Domain/Enums/FlowEpicScope.cs:8-15` (`DoorOrder`, `CuttingPlan`, `MicroAssembly`).
8. **CRM delegáció holt kód, nincs hívó** — `src/spaceos-modules/spaceos-modules-crm/src/Domain/Aggregates/Opportunity.cs:253-262` (`DelegateToPartner`), nincs command handler / endpoint egész a CRM modulban.
9. **Portál Projects világ 100%-ban mock** — `src/joinerytech-portal/src/pages/ProjectsPage.tsx` egyetlen sora sem hív API-t; `mocks/projects.ts` mezői közül `customer`, `designer`, `items[]`, `margin`, `note` egyikének sincs backend-megfelelője semelyik vizsgált modellben.
10. **`WorkflowPhase` (kód) és a design-doc FSM-je eltér** — `PROJECT_MANAGEMENT_MODEL-frontend-designes-v3.md` 96-116. sor vs `FlowEpic.Phase` tényleges értékei (`Discovery/Delivery/ClosedDone`) — nincs `BACKLOG_READY`/`IN_REVIEW`/`CLOSED_BLOCKED` a kódban.
11. **`FlowEpicArchivedEvent`-nek nem található dedikált handler** a `SpaceOS.Kernel.Application/FlowEpics/Events/` mappában a többi eseményhez képest — decision_required, hogy ez szándékos-e.

---

## 10. Architekturális opciók és ajánlás

### Opció P1 — Projektek mint önálló CRUD-modul (a FlowManagement modul kiadása API-val)

A meglévő `FlowProgram`/`FlowProject`/`FlowMilestone`/`FlowTask` POCO-khoz migráció, API és tesztek hozzáadása. **Gyors, de**: elveszíti a design-intent B2B/actor-nézet előnyét, és a Kontrolling-port (5.6) mutatja, hogy egy tiszta CRUD-modul önmagában nem elég a valódi "projekt" fogalomhoz (customer, contract value, cost lines nélküle). **Nem ajánlott** önmagában — legfeljebb belső perzisztencia-rétegként hasznos.

### Opció P2 — Projektek mint orchestration/reference bounded context (a `PROJECT_STATE_ASSESSMENT` és a célarchitektúra ajánlása)

Saját tulajdon: Program/Projekt/Mérföldkő/Almérföldkő hierarchia, StageChain-konfiguráció (**reuse** a meglévő Kernel StageChain-t), FlowEpic FSM (**reuse** a meglévő Kernel FlowEpicet), B2BHandshake teljes lifecycle és actor-szűrt hozzáférési projekció (**extend/new**, lásd 8-9. fejezet). Nem saját tulajdon: ajánlat/rendelés (CRM), költség (Kontrolling — marad port), raktár, gyártási technológia, dokumentumverzió, chat. **Ez az audit bizonyítékai alapján a legjobban alátámasztott irány**: a meglévő FlowEpic/StageChain réteg éppen erre az ownership-vonalra épült, és a Kontrolling `IProjectPortfolioSource` már ma is ezt a határt feltételezi.

### Opció P3 — A Kernel FlowManagement/FlowEpic közvetlen kiterjesztése iparág-specifikus mezőkkel

Elutasítandó ebben a formában: a `FlowEpicScope` már ma is mutatja a kockázatot (D2 pont) — a Kernel iparág-függővé válna. **Csak akkor elfogadható, ha az ADR előbb megoldja a `FlowEpicScope`-jellegű mezők kivonását** egy JoineryTech industry pack rétegbe, és a Kernel kizárólag semleges `Scope`/`SubjectRef`-mintákat tart meg.

**Ajánlás:** **Opció P2**, két előfeltétellel:
1. Az ADR-nek explicit döntenie kell a `FlowEpicScope` iparág-specifikus értékeinek sorsáról (relokáció vagy generikus `string`/taxonómia-referencia-csere) **mielőtt** bármilyen új Projects-funkció ráépül a FlowEpicre.
2. A B2BHandshake kétirányú láthatósága (6.2-6.4) új query-ág és valószínűleg egy dedikált "incoming handshakes" read-model nélkül nem oldható meg a jelenlegi RLS-modellen belül — ezt ADR-szinten kell explicit tervezni, nem csak alkalmazás-kódban javítani.

---

## 11. Az ADR eldöntendő kérdései

1. A Projects bounded context Opció P2 szerint induljon-e, és ha igen, a Kernel FlowEpic/StageChain rétegre épüljön-e közvetlenül, vagy egy külön JoineryTech-szintű modul hívja portokon keresztül?
2. Mi legyen a `FlowEpicScope` (`DoorOrder`/`CuttingPlan`/`MicroAssembly`) sorsa — kivonás a Kernelből egy industry pack rétegbe, generikus stringre cserélés, vagy tudatos kivétel a rétegszabály alól (ha igen, miért)?
3. A B2BHandshake MVP-je mi legyen: csak meghívás+elfogadás+státusz, vagy már actor-szűrt task/proof-kezelés is (a design-doc "mindkét cég látja, más nézettel" elve szerint)? Ehhez a jelenlegi RLS/query-filter modellt is módosítani kell — ez explicit ADR-döntést igényel, mert biztonsági kérdés.
4. A `FlowManagement.FlowProject/FlowTask` modell megmaradjon-e belső perzisztencia-rétegként (migrálva Postgresre), vagy törlésre kerüljön egy tiszta újratervezés javára?
5. A CRM `Opportunity.DelegateToPartner`/`OpportunityDelegatedToPartnerEvent` törlésre kerüljön-e (holt kód), vagy legyen ez a tervezett integrációs pont a Kernel B2BHandshake felé — és ha igen, hogyan kapcsolódik a `b2bHandshakeId` paraméter egy valódi Kernel-azonosítóhoz, amikor a B2BHandshake ma nem önálló entitás?
6. A `WorkflowPhase` kód-FSM és a design-doc FSM-je közül melyik a kanonikus — vagy szükséges egy explicit leképezési réteg a kettő között?
7. A Kontrolling `IProjectPortfolioSource` végleges adatforrása a leendő Projects bounded context lesz-e, vagy marad egy szélesebb, több modult összegző orchestrator felelőssége?
8. A portál Projects világ mock-mezői közül melyek válnak valódi domain-mezővé (pl. `margin`, `items[]`), és melyek maradnak tisztán UI-derivált/prezentációs adatok?

---

## 12. Elfogadási kritériumok — önellenőrzés

- [x] Mindkét meglévő projektmodell (FlowManagement és Kernel FlowEpic) és a B2B réteg feltérképezve, forrás-hivatkozásokkal.
- [x] Nincs új moduljavaslat a meglévő képességek (FlowEpic, StageChain, IProjectPortfolioSource) vizsgálata nélkül — mindegyik explicit szerepel a capability mátrixban.
- [x] Ownership és source-of-truth minden fő entitásra egyértelmű (2-3. fejezet); ahol nem volt bizonyítható, `decision_required` jelölés került (5.1, 5.5, D3, D6, 11. fejezet).
- [x] Threat boundary lefedi a host/guest tenantot, az allowlistet és az actor-view-t (6. fejezet), bizonyított szekvenciadiagrammal.
- [x] Az ADR szerzője e dokumentumból további kódaudit nélkül döntést készíthet — a 11. fejezet nyolc konkrét, fájlhivatkozásokkal alátámasztott kérdést sorol fel.

---

## 13. Memento

- A Kernel FlowEpic + StageChain réteg a legérettebb, production-hostolt, jól tesztelt alap — erre kell építeni, nem mellette újat.
- A FlowManagement modul (`FlowProgram/FlowProject/FlowMilestone/FlowTask`) regisztrálva van a DI-ben, de bizonyítottan nincs Postgres-migrációja és nincs API-ja — gyakorlatilag inaktív kód, nem "készen álló, csak be nem kötött" réteg.
- A B2BHandshake ma kizárólag egyirányú delegáció-jelzés; a design-intent kétirányú, actor-szűrt láthatósága a jelenlegi RLS/query-filter modell mellett **szerkezetileg lehetetlen** módosítás nélkül — ez a legfontosabb biztonsági/architekturális döntési pont.
- A Kernel Domain már ma tartalmaz iparág-specifikus szivárgást (`FlowEpicScope`), ami a célarchitektúra explicit tiltólistáját sérti — ezt a következő FlowEpic-bővítés előtt tisztázni kell.
- A CRM `Opportunity` delegáció holt kód — sem törölve, sem integrálva nincs, ADR-döntést igényel.
- A Kontrolling `IProjectPortfolioSource` a legjobb meglévő minta a "semleges port, tudatosan üres, amíg a valós integráció el nem készül" elvre — ezt érdemes követni, amikor a Projects bounded context portjait tervezik.
