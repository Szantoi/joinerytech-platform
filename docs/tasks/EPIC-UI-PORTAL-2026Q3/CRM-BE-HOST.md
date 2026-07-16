# CRM-BE-HOST — CRM futtatható API host + endpoint-réteg (F2-CRM-FE follow-up)

- **Szerep:** backend · **Státusz:** ✅ done (2026-07-16)
- **Előfeltétel:** F2-CRM-FE (a rögzített kontraktus a portal MSW-előkép:
  `src/joinerytech-portal/src/modules/crm/services/` + `mocks/`),
  QA-BE-ENDPOINTS (409-hibakontraktus + endpoint-teszt precedens),
  MAINT-BE-TRANSITIONS (PUT + friss DTO precedens), RISKS-5X5-BE (EHS Program/DI)
- **Terület:** `src/SpaceOS.Modules.CRM` — a portal fához NEM nyúltunk (csak olvasott kontraktus)

## Feladat

Az F2-CRM-FE dokumentált backend-gapjeinek zárása: futtatható host (audit blocker
**G0.1**) + endpoint-réteg + a **Lead-FSM hiányzó `nurturing` ága**.

## ⚠️ Kiindulási állapot: a modul SOHA nem fordult le

A `HANDLER_IMPLEMENTATION_COMPLETE.md` „✅ production-ready" státusza **fordítatlan
kódra** vonatkozott (a doksi maga is „NuGet timeout" build-blockert említ). A valóság:

- **Nulla `.csproj`** a modulban — se forrás-, se tesztprojekt. A ~120 `.cs` fájl
  soha nem ment át fordítón.
- **A repository-interfészek nem léteztek** ott, ahol a query-handlerek keresték:
  `ILeadRepository` / `IOpportunityRepository` a `CreateLeadHandler.cs` ill.
  `ConvertToOpportunityHandler.cs` **alján** volt deklarálva, miközben 8 handler a
  nem létező `SpaceOS.Modules.CRM.Domain.Repositories` névteret importálta.
- **A query-handlerek nem létező domain-tagokra hivatkoztak**: `lead.ContactName`,
  `lead.AssignedToUserId`, `*.AssignedToUserName/CreatedByName/UpdatedByName`,
  `Domain.Entities.Task`/`.Activity` (ilyen névtér nincs), `opportunity.QuoteRef/OrderRef`.
- **Az Opportunity aggregátumból hiányzott** a `LogActivity` / `CreateTask` /
  `CompleteTask` (a handlerek hívták), a Leadből a `Delete` (a `DeleteLeadHandler` hívta).
- **`Money` privát ktor** `new Money(...)`-val hívva; **`DeleteLeadCommand`**
  `IRequest<Result<Unit>>` vs. handler `Result`.
- **`Lead.Api/Endpoints/LeadEndpoints.cs`**: osztály és névtér nélküli **kódtöredék**
  (`GetTenantId() // TODO`), **`tests/.../CreateLeadTests.cs`**: `Procurement`
  névterű scaffold-csonk `WebApplicationFactory<Program>`-mal (Program sem volt).
- **`Commands/CreateLead/`**: `SpaceOS.Modules.Procurement` névterű scaffold-triász
  (`NotImplementedException`), ütköző `CreateLeadCommand`-dal.

Emiatt a task a tervezett „host ráhúzása" helyett **a modul lefordíthatóvá tétele +
host + endpointok** lett. A domain ÜZLETI logikája (FSM-ek, VO-k, események) valós
és jó minőségű volt — azt megtartottuk, nem írtuk újra.

## Mit / hogyan

### 0. Projektstruktúra (ÚJ — 4 csproj + 1 teszt, EHS réteg-projekt precedens)

`src/Lead.{Domain,Application,Infrastructure,Api}` + `tests/Lead.Tests`, net8.0,
`Nullable`+`ImplicitUsings`. A CRM-nek **nem volt** törött `backend/spaceos-kernel`
útja (nincs kernel-referenciája — saját `TenantScopedEntity`/`DomainEvent` bázisa
van), így a qa/maintenance/hr csproj-javítás itt nem volt értelmezhető.

- `DomainEvent : INotification` (**MediatR.Contracts**) — a handlerek
  `IPublisher.Publish(object)`-szel publikálják, ami nem-INotification payloadra
  **futásidőben dobott** volna. Latens hiba, teszt nélkül sosem derül ki.
- **`Task` → `CrmTask` átnevezés** (Lead/Opportunity gyerek-entitás): a
  `System.Threading.Tasks.Task`-kal ütközött (`CS0104` minden `async` repo-szignatúrán)
  — ez tartotta bent a repo-interfészeket a handler-fájlokban. A portal is
  `CrmTask`-nak hívja (`services/tasks.ts`) — a névválasztás a kontraktust követi.
- **Törölve:** `Commands/CreateLead/` (Procurement-scaffold), `tests/Api/CreateLeadTests.cs`
  (Procurement-névtér, fordíthatatlan).

### 1. Lead FSM: a `nurturing` ág pótlása (a task magja)

- **ÚJ** `Domain/FSM/LeadStatusTransitions.cs` — a portal `LEAD_FSM` tükre, EGY
  igazságforrás (QA `TicketStatusTransitions` precedens); az aggregátum ezen át guardol:

  | akció | from | to | wire (hu) |
  |---|---|---|---|
  | contact | New | Contacted | uj → kapcsolat |
  | qualify | Contacted | Qualified | kapcsolat → minosites |
  | **nurture** | **Qualified** | **Nurturing** | **minosites → nurturing** |
  | convert | Qualified, **Nurturing** | Opportunity | minosites\|nurturing → konvertalva |
  | discard | New, Contacted, **Qualified**, **Nurturing** | Disqualified | bármely nyitott → elvetve |

- `LeadStatus.Nurturing = 5` (**hozzáfűzve**, nem beszúrva — a perzisztált ordinálok
  stabilak maradnak) + `Lead.Nurture()` + `LeadNurturingStartedEvent`.
- **Mellékesen javított FSM-hibák** (a portal-tükrözés hozta felszínre):
  - `Qualified → Disqualified` **hiányzott** a táblából, noha a `Disqualify()`
    doc-comment-je („Valid from New, Contacted, or Qualified") és a portal
    `discard` szabálya is engedi.
  - `ConvertToOpportunity` `Status != Qualified` helyett táblán guardol (nurturing-ból is).

### 2. Opportunity FSM: a `lose` ág kiszélesítése

- **ÚJ** `Domain/FSM/OpportunityStatusTransitions.cs` (portal `OPP_FSM` tükör).
  A domain **csak Proposal/Negotiation-ból** engedett veszteni, a portal **bármely
  nyitott fázisból** — a tábla most az utóbbit követi (`Lost`/`Abandoned` bármely
  nyitottból, a fő lánc egyébként lépésenkénti).
- **ÚJ** `Domain/FSM/OpportunityStageProbability.cs` — fázis→valószínűség tábla; az
  aggregátum ezt alkalmazza minden fő-lánc átmenetnél (nincs több literál a
  metódusokban, QUALITY.md 3.). **A számokat a portalhoz igazítottuk**:
  a domain 50/75/90 volt a `osszeallitas`/`ajanlat`/`targyalas` fázisokra, a portal
  `OPP_STAGE_PROBABILITY` szerint **40/55/80** a helyes (10/25 és 100/0 egyezett).

### 3. Hibakontraktus: FSM-sértés → 409 (EHS/QA-precedens)

A CRM domain `Ardalis.Result`-idiómát használ (nem kivételeket, mint a QA), ezért a
QA `InvalidStatusTransitionException` helyett a **Result-státusz** hordozza a
megkülönböztetést — ugyanaz a szerződés, a modul saját nyelvén:

- FSM-sértés → `Result.Conflict` → **409** (`TransitionConflict()` mindkét aggregátumban)
- payload-guard (kötelező indok, üres OpportunityId) → `Result.Invalid` → **400**
- ismeretlen id → `Result.NotFound` → **404**
- **ÚJ** `Api/Endpoints/CrmEndpointResults.cs` — közös mapping; a válasz-alak a portal
  MSW guardjának tükre: `{ error, message }` (`mocks/db.ts` jsonError).

### 4. Endpoint-réteg (ÚJ — 21 route, 3 fájl)

`Api/Endpoints/{LeadEndpoints,OpportunityEndpoints,CrmTaskEndpoints}.cs` — a portal
fetcherek + MSW-handlerek útvonal-készletének tükre; `RequireAuthorization`,
`X-Tenant-Id` header, string-enum + `TryParse` → 400 (QA endpoint-minta).
**Minden átmenet PUT + 200 + friss DTO** (nem 204 — a portál optimista frissítése a
válasz-testből rekonciliál).

- **leads** (9): `POST ""` (201+DTO+Location) · `GET ""` (`status`/`q` szűrő) ·
  `GET /{id}` · `PUT /{id}/{contact,qualify,**nurture**,discard}` ·
  `POST /{id}/convert` (201 + `{lead, opportunityId}`) · `POST /{id}/activities`
- **opportunities** (9): `GET ""` (`status`/`open` szűrő — az `open`-guard a domain
  `OpportunityStatusTransitions.IsOpen`, nem duplikált literál-lista) · `GET /{id}` ·
  `PUT /{id}/{start-discovery,start-proposal,send-quote,negotiate,win,lose}` ·
  `POST /{id}/activities`
- **kereszt-entitás** (3): `GET /api/crm/tasks` (`done` szűrő, határidő-rendezés,
  **számított SLA**) · `POST /api/crm/tasks/{id}/complete` (**csak task-id alapján** —
  a szülő aggregátumot a handler oldja fel) · `GET /api/crm/activities/recent` (`limit`) ·
  `GET /api/crm/forecast` (súlyozott pipeline)

Logolás `ILoggerFactory`-val a bevált mintára (sikeres átmenet Information,
elutasított Warning).

### 5. Hiányzó Application-darabok (ÚJ)

- `NurtureLeadCommand` + `NurtureLeadHandler`.
- **Kereszt-entitás query-k** (`Queries/CrmCrossEntityQueries.cs` + 3 handler): a
  task/activity a Lead ÉS az Opportunity gyerek-entitása, a portal viszont **egy lapos
  listaként** mutatja (Feladatok képernyő, „Legutóbbi tevékenységek") — `GetCrmTasksQuery`,
  `GetRecentActivitiesQuery`, `CompleteCrmTaskCommand`.
- **`DTOs/CrmDtoMapper.cs`** (QA `TicketDtoMapper` precedens): a ~20 handler mindegyike
  saját privát `MapToResponse`/`MapToDto` másolatot hordozott (több nem létező
  property-vel) — mind ide delegál. Ezzel a duplikált **`LeadResponse`/`OpportunityResponse`
  osztályok is megszűntek** (a `LeadDto`/`OpportunityDto`-val azonos alak) — a commandok
  is `Result<LeadDto>`-t adnak.
- **DTO-dátumok `DateTime` → `DateTimeOffset`** (a domain végig DateTimeOffset — 152
  fordítási hiba forrása volt a néma csonkolás).

### 6. Config-vezérelt küszöbök (`CrmOptions`, `Crm:*` szekció)

A portal `config.ts`/`fsm.ts` a tükör, minden értéknek van defaultja (QUALITY.md 3.):

- `Crm:Tasks:SlaSoonDays` (**2** = portal `TASK_SLA_SOON_DAYS`)
- `Crm:Activities:RecentLimit` (**8** = portal `RECENT_ACTIVITY_LIMIT`)
- `Crm:Forecast:StageProbability:<Stage>` (**10/25/40/55/80/100/0** = portal
  `OPP_STAGE_PROBABILITY`; defaultja a domain policy-tábla)

**ÚJ** `Domain/Policies/TaskSlaPolicy.cs` — az SLA **SZÁMÍTOTT**, sosem tárolt mező
(portal `sla.ts` tükör, EHS `validity.ts` minta): a határidő **napja még nem késés**
(nap végéig számol), teljesített feladat sosem sért SLA-t. `TimeProvider`-rel
injektált óra → tesztelhető.

### 7. Infrastructure (ÚJ) + migráció

`CrmDbContext` (séma: `crm`) + owned VO-k (`ContactInfo`, `Money` ×2) + owned
kollekciók (activities/tasks külön táblába) + `Lead/OpportunityRepository`
(minden olvasás tenant-szűrt) + `AddCrmModule` composition root (EHS precedens) +
`CrmDbContextFactory` (design-time, QA precedens).
**Migráció:** `20260716180438_InitialCreate` — 6 tábla, 8 index (tenant+status,
tenant+assignee, tenant+lead).

### 8. Host (ÚJ — `Program.cs`, a G0.1 blocker zárása)

`WebApplication` + `AddCrmApiJsonOptions` (**JsonStringEnumConverter** — EHS
precedens, enumok stringként) + `AddCrmModule` + auth + Swagger + a 3 endpoint-mapper.
`appsettings.json`: `ConnectionStrings:CrmDatabase` + a teljes `Crm:*` szekció.

## Hogyan ellenőrizve

- **`dotnet build`** (mind az 5 projekt): **zöld, 0 warning**.
- **Tesztek: 101/101 zöld** (baseline: **0 — a tesztprojekt nem létezett/nem fordult**),
  Docker nélkül futtathatóan:
  - `tests/Api/CrmEndpointTestHost.cs` — TestServer + mockolt `IMediator` + test-auth,
    a prod-host JSON-tükre (QA `QaEndpointTestHost` precedens).
  - `tests/Api/LeadEndpointsTests.cs` (16): route-készlet, **nurture 200+friss DTO**,
    nurture-command paraméter-átadás, **409 guard-üzenettel**, discard-indok 400
    (mediátor-hívás nélkül), convert 201 `{lead, opportunityId}`, invalid source/status → 400, 404.
  - `tests/Api/OpportunityEndpointsTests.cs` (12): mind az 5 fő-lánc szegmens PUT+200,
    fázis-ugrás 409, lose-indok 400, win opcionális orderId/finalValue, `open` szűrő,
    **`/quote` route → 404** (tudatosan nem implementált, ld. ADR-jelölt #2).
  - `tests/Api/CrmTaskEndpointsTests.cs` (11): SLA/refType enum-stringként, `done`
    szűrő-átadás, complete 200/404, `limit` átadás + config-default, forecast DTO.
  - `tests/Domain/{LeadFsmTests,OpportunityFsmTests}.cs` (35): teljes legális lánc
    nurturingon át, **minden tiltott átmenet → Conflict** (+ az aggregátum változatlan),
    discard minden nyitott állapotból, lose minden nyitott fázisból, win csak
    tárgyalásból, portal-tükör tábla-Theory-k, fázis-valószínűségek.
  - `tests/Domain/TaskSlaPolicyTests.cs` (9): overdue/soon/ok határértékek, nap-vége
    szabály, teljesített feladat, **config-vezérelt ablak**.
  - `tests/Unit/CrossEntityQueryHandlerTests.cs` (14) + `InMemoryCrmRepositories.cs`:
    valódi aggregátumokon (in-memory repo, DB nélkül) — kereszt-entitás merge +
    rendezés, SLA-számítás, tenant-szigetelés, complete-by-id mindkét szülőre,
    forecast súlyozás + **config-override**.
- **Host-smoke:** `dotnet run` → `Application started`, a swagger.json **mind a 21
  route-ot** kiadja (köztük `PUT /api/crm/leads/{id}/nurture`). **G0.1 zárva: van
  futtatható host ÉS OpenAPI.**
- **openapi.yaml szinkron:** a CRM-nek nincs kézzel karbantartott `docs/openapi.yaml`
  szekciója (a QA-val ellentétben) — a Swashbuckle-generált dokumentum az igazságforrás.

## ADR-jelöltek / follow-up

1. **⚠️ ADR: wire-nyelv + mező-alak ütközés (a fetcher-átállás blokkolója).**
   A backend a domain (angol) enum-neveit adja stringként (`"Nurturing"`,
   `"Negotiation"`) — a qa/maintenance/hr precedens szerint; a portal zod-sémái
   **magyar kulcsokat** várnak (`'nurturing'`, `'targyalas'`). Ez a MAINT-BE-TRANSITIONS
   és HR-BE-HOST azonos ADR-jelöltje — **egységes, platform-szintű döntés kell**
   (backend magyarosítás VAGY portal-oldali mapping-réteg VAGY OpenAPI enum-térkép).
   Az F2-CRM-FE ezt „a magyar↔angol enum-térkép rögzítése a leendő OpenAPI-ban"
   néven a backend follow-upjába utalta — a térkép a `LeadStatusTransitions` /
   `OpportunityStatusTransitions` doc-commentjeiben rögzítve, de **kódszintű
   konverzió tudatosan NINCS** (nem nyitottunk új irányt).
   Ugyanez a mező-alakra: a portal `Lead` lapos `owner/company/contact/city/title/
   interest/estValue` + `id: "LEAD-2426-001"` stringazonosító; a backend `Guid` id +
   `ContactInfo` VO + `Money`. A `city`/`interest`/`referredBy` **nem létezik** a
   domainben — nem találtuk ki.
2. **ADR: `POST /opportunities/{id}/quote` (oppCreateQuote handoff) — NEM implementálva.**
   Ajánlat-csonk generálása a Sales/Quote modulba nyúlik át; a CRM domainben nincs
   quote-létrehozás (csak `QuoteId` hivatkozás). A `send-quote` és a `win` végpont
   ezért **opcionális** `quoteId`/`orderId` mezőt fogad (a portal csak `note`-ot küld) —
   a valódi kötés a Sales-integrációkor rendezendő. Ugyanez a `convert`: a
   `customerId`-t a hívó adja (nincs ügyfél-címtár a modulban).
3. **Fázis-valószínűség kettős forrás:** az aggregátum a domain policy-táblát
   alkalmazza a `Probability` mezőre, a **forecast** viszont a config-táblából súlyoz
   (a defaultok azonosak). Teljes egységesítés (policy-service injektálás az
   aggregátumba) külön kör.
4. **`Abandoned` fázis nincs a portal OPP_FSM-jében** — backend-only terminális
   állapot maradt (bármely nyitottból elérhető, endpoint nélkül). Kivezetés vagy
   UI-support: termék-döntés.
5. **Nincs user-/ügyfél-címtár a modulban:** a DTO-k `Guid`-ot adnak ott, ahol a
   portal nevet mutat (`owner`, `refTitle` részben) — a `*Name` mezőket **kivettük a
   DTO-kból** ahelyett, hogy hazug placeholdert adtunk volna (HR-BE-HOST azonos
   döntése). Auth/HR-integrációkor rendezendő.
6. **`GetLeadsQuery` lapozása:** a `PaginatedResponse` megvan, de az endpoint a
   `Data` tömböt adja vissza (a portal sima tömböt vár). Lapozás kivezetése a wire-re
   külön kör (QA-nál azonos döntés).
7. **Pre-existing:** `HANDLER_IMPLEMENTATION_COMPLETE.md` „✅ production-ready"
   állítása félrevezető — a doksi frissítése/visszavonása javasolt (a valós állapot
   most ez a task-doksi).

## Fájlok

**ÚJ — projektek:** `src/Lead.Domain/SpaceOS.Modules.CRM.Domain.csproj` ·
`src/Lead.Application/SpaceOS.Modules.CRM.Application.csproj` ·
`src/Lead.Infrastructure/SpaceOS.Modules.CRM.Infrastructure.csproj` ·
`src/Lead.Api/SpaceOS.Modules.CRM.Api.csproj` ·
`tests/Lead.Tests/SpaceOS.Modules.CRM.Tests.csproj`

**ÚJ — domain:** `Domain/FSM/{LeadStatusTransitions,OpportunityStatusTransitions,OpportunityStageProbability}.cs` ·
`Domain/Policies/TaskSlaPolicy.cs` · `Domain/Enums/TaskSla.cs` (+`CrmRefType`) ·
`Domain/Repositories/{ILeadRepository,IOpportunityRepository}.cs`

**ÚJ — application:** `CrmOptions.cs` · `DTOs/CrmDtoMapper.cs` ·
`Queries/CrmCrossEntityQueries.cs` ·
`Handlers/{NurtureLeadHandler,GetCrmTasksQueryHandler,GetRecentActivitiesQueryHandler,CompleteCrmTaskHandler}.cs`

**ÚJ — infrastructure:** `Persistence/{CrmDbContext,CrmDbContextFactory}.cs` ·
`Persistence/Configurations/{Lead,Opportunity}EntityTypeConfiguration.cs` ·
`Persistence/Repositories/{Lead,Opportunity}Repository.cs` ·
`Persistence/Migrations/20260716180438_InitialCreate.cs` · `DependencyInjection.cs`

**ÚJ — api:** `Program.cs` · `appsettings.json` · `CrmApiJsonOptions.cs` ·
`Endpoints/{CrmEndpointResults,OpportunityEndpoints,CrmTaskEndpoints}.cs`

**ÚJ — tesztek:** `tests/Api/{CrmEndpointTestHost,LeadEndpointsTests,OpportunityEndpointsTests,CrmTaskEndpointsTests}.cs` ·
`tests/Domain/{LeadFsmTests,OpportunityFsmTests,TaskSlaPolicyTests}.cs` ·
`tests/Unit/{InMemoryCrmRepositories,CrossEntityQueryHandlerTests}.cs`

**ÚJRAÍRVA:** `src/Lead.Api/Endpoints/LeadEndpoints.cs` (kódtöredék → 9 route)

**MÓDOSÍTVA:** `Domain/Aggregates/Lead.cs` (Nurture, Delete, tábla-guard, Conflict,
CrmTask) · `Domain/Aggregates/Opportunity.cs` (LogActivity/CreateTask/CompleteTask,
tábla-guard, Conflict, policy-tábla) · `Domain/Enums/LeadStatus.cs` (+Nurturing) ·
`Domain/Events/{Lead,Opportunity}Events.cs` (+4 esemény) ·
`Domain/Common/TenantScopedEntity.cs` (`DomainEvent : INotification`) ·
`Application/ApplicationExtensions.cs` (CrmOptions + TimeProvider) ·
`Application/Commands/{Lead,Opportunity}Commands.cs` (Nurture/CompleteCrmTask,
Response-osztályok törölve) · `Application/Queries/CrmQueries.cs` (SearchText,
DateTimeOffset, `*Name` mezők kivezetve) · ~30 handler (közös mapper, valós
domain-tagok, repo-névtér)

**TÖRÖLVE:** `src/Lead.Application/Commands/CreateLead/` (Procurement-scaffold) ·
`tests/Lead.Tests/Api/CreateLeadTests.cs` (Procurement-névtér)
