# HR-BE-HOST — HR futtatható API host + endpoint-réteg (F2-HR-FE follow-up)

- **Szerep:** backend · **Státusz:** ✅ done (2026-07-16)
- **Előfeltétel:** F2-HR-FE (a rögzített kontraktus a portal MSW-előkép:
  `src/joinerytech-portal/src/modules/hr/{services,mocks}/`), QA-BE-ENDPOINTS +
  MAINT-BE-TRANSITIONS (409-es hibakontraktus + átmenet-handler precedens),
  RISKS-5X5-BE (config-vezérelt küszöb precedens)
- **Terület:** `src/hr` — a portal fához NEM nyúltunk (csak olvasott kontraktus)

## Feladat

Az „első kör teljes lezárása": a HR volt az EGYETLEN modul **futtatható host nélkül**
(audit **G4.1**, F2-HR-FE gap-lista). A domain kész volt, de nem volt sem Program,
sem endpoint-réteg — a portal ezért MSW-first kontraktussal dolgozott.

1. **Futtatható Api host** (Program + DI + Keycloak-auth) — G4.1 zárása.
2. **Endpoint-réteg** a portal kontraktusra: employees, absences (ABSENCE_FSM), capacity, skills.
3. **timeLogs / assignments: NEM implementálva** — nincs mögöttük domain (ld. ADR-jelöltek).

## Mit / hogyan

### 0. Build-javítás (előfeltétel)
- `src/SpaceOS.Modules.HR.csproj`: a kernel-referencia a törött `../../backend/spaceos-kernel/…`
  útról a valós `../../spaceos-kernel/…` útra (az ehs/qa/maintenance javítás tükre).
  **Enélkül a modul nem fordult (64 error)** — a HR domain „kész" státusza fordítatlan kódra vonatkozott.

### 1. Hibakontraktus: 409 illegális FSM-átmenetre (QA/Maintenance precedens)
- **ÚJ** `Domain/Exceptions/InvalidStatusTransitionException.cs` (`: DomainException`).
- `Absence` aggregátum: az 5 akció státusz-guardja **a `AbsenceStatusTransitions` táblán
  keresztül** dönt (közös `GuardTransition(target, action)` — EGY igazságforrás, a portal
  ABSENCE_FSM tükre), és a dedikált kivételt dobja. A payload-validáció (kötelező indok,
  üres jóváhagyó-id) sima `DomainException` marad → 400.
- **ÚJ** `Api/Endpoints/HrEndpointResults.cs` — közös Ardalis.Result → HTTP mapping
  (NotFound→404, Conflict→409 `{error}`, Invalid→400 `{error}`, egyéb→400).

### 2. Futtatható host (ÚJ — `src/Api/`, önálló `SpaceOS.Modules.HR.Api.csproj`, Sdk.Web)
Az EHS host precedens szerint (a modul-csprojban `<Compile Remove="Api/**" />`):
- `Program.cs`: JsonStringEnumConverter (enumok stringként — EHS/QA wire-nyelv),
  Swagger, **Keycloak bearer auth** (`Jwt:Authority`/`Jwt:Audience`, a
  SpaceOS.Kernel.Api precedens) — az endpointok `RequireAuthorization`-ösek, tehát a
  hostnak valódi séma kell.
- `HrServiceCollectionExtensions.AddHrModule`: tenant-context, DbContext + RLS
  interceptor (a meglévő `AddHRInfrastructure`), **config-vezérelt kapacitás-küszöbök**,
  MediatR + FluentValidation a modul-assemblyből.
- `HttpTenantContext` (X-Tenant-Id → RLS session context), `appsettings.json`.
- **Migráció:** nem kellett — perzisztált mező nem változott (a DbContext/EF-konfigok érintetlenek).

### 3. Config-vezérelt küszöbök (QUALITY.md 3.)
- **ÚJ** `Domain/Services/HrCapacityConfiguration.cs` — `Hr:Capacity` szekció:
  `WorkdaysPerWeek` / `OverloadEpsilon` / `UtilizationWarnThreshold`
  (fallback **5 / 0,01 / 0,85** = a portal `services/hr/config.ts` tükre). Érvénytelen
  konfig **indulásnál** bukik (value object ctor dob — EHS RiskBandConfiguration precedens).
- A `CapacityCalculationService` ezekkel számol (napi kapacitás = heti óra / WorkdaysPerWeek,
  túlterhelés = lekötés > kapacitás + ε); a warn-küszöb a kapacitás-lekérdezés
  **ILogger-warnja** (mely dolgozók vannak a „magas terhelés" sáv felett).

### 4. Endpointok (11 route, mind `RequireAuthorization` + X-Tenant-Id)

**`Api/Endpoints/EmployeeEndpoints.cs`** (portal `handlers.employees.ts` tükör):
- `GET /api/hr/employees` — **szerver-oldali** szűrők: `dept` / `q` / `skill` (+`active`),
  névsorban. Új `IEmployeeRepository.ListAsync` (SQL-ben szűr, `ILike` a q-ra) — korábban a
  GetEmployeesQuery **üres listát adott** részleg-szűrő nélkül (repo-hiány workaround volt).
- `GET /api/hr/employees/{id}` — EmployeeDto / 404.
- `PUT /api/hr/employees/{id}/skills` — készség-mátrix mutáció, **200 + friss EmployeeDto**.

**`Api/Endpoints/AbsenceEndpoints.cs`** (portal `handlers.absences.ts` tükör):
- `GET /api/hr/absences` — `status` / `empId` szűrők (új `IAbsenceRepository.ListAsync`),
  `GET /api/hr/absences/{id}` — 404-gyel.
- `POST /api/hr/absences` — kérelem (FSM-belépő: Pending), **201 + teljes AbsenceDto** + Location.
- `PUT /{id}/approve|reject|start|complete|reopen` — **dedikált endpoint akciónként**
  (nincs generikus PATCH), mind **200 + friss AbsenceDto** (a portal optimista frissítése
  ezt várja, nem 204). Tiltott átmenet → **409**, indok nélküli reject → **400**, ismeretlen id → **404**.

**`Api/Endpoints/CapacityEndpoints.cs`** (portal `handlers.capacity.ts` tükör):
- `GET /api/hr/capacity?week=` — **szerver-számított** heti rács; a `week` kötelező,
  YYYY-MM-DD (rossz alak → 400) és **hétfő** kell legyen (nem hétfő → 400, a mock guard tükre).
  A hétfő-szabály a query-handlerben él (domain-szabály), nem a parse-rétegben.

### 5. Application-réteg rendbetétel (az endpointok mögött)
- **ÚJ** `Application/Commands/AbsenceTransitionHandlerBase.cs` — közös átmenet-pipeline
  (betöltés → aggregátum-akció → perzisztálás → **friss DTO** + logolás; 404/409/400
  mapping), a Maintenance `WorkOrderTransitionHandlerBase` mintájára. Az 5 handler már
  csak a saját aggregátum-akcióját nevezi meg.
- **Hiányzó commandok pótolva:** `StartAbsenceCommand` + `CompleteAbsenceCommand`
  (a domainben megvolt a metódus, a command/handler hiányzott — a FSM-lánc közepe nem
  volt kivezethető). Approve/Reject/Reopen `Result` → **`Result<AbsenceDto>`**.
- **DTO-k valóság-igazítása:** az `EmployeeDto`/`AbsenceDto` tele volt placeholder-hazugsággal
  (`DepartmentId: Guid.Empty`, `HireDate: DateTime.UtcNow`, `CreatedAt: DateTime.UtcNow`
  „NOTE: Domain doesn't have…" kommentekkel). Az API nem szolgálhat ki kitalált mezőket:
  a két DTO most az aggregátum hű projekciója (Department enum, PayGrade{Name,HourlyRate},
  Skills, WorkDays, Rejected*), a nem létező mezők **kimaradtak** (nem lettek kitalálva).
- **ÚJ** `Application/DTOs/HrDtoMapper.cs` — egy mapping-hely (lista/detail/átmenet nem drifthet szét).
- `GetAbsencesQueryHandler`: a dolgozó-nevek **egy** lookup-lekérdezésből (nincs N+1).

## Hogyan ellenőrizve

- `dotnet build` (modul + host + tesztek): **zöld, 0 warning**.
- Tesztek: **133/133 zöld** (baseline **80** → **+53 új**: 30 endpoint + 23 domain),
  `--filter FullyQualifiedName!~Integration`:
  - `tests/Api/` (**30 új**, TestServer + mockolt IMediator, **Docker nélkül**):
    `AbsenceEndpointsTests` (16): lista/szűrő-átadás, string-enum body, 404,
    201+Location, **200 + friss DTO minden átmenetre**, 409 guard-üzenettel,
    400 indok nélküli rejectre; `EmployeeEndpointsTests` (9): dept/q/skill szűrő-átadás,
    érvénytelen szűrő → 400, string-enum (`"Production"`, `"CNCProgramming"`), skills-mutáció;
    `CapacityEndpointsTests` (5): rács-válasz, hiányzó/rossz/nem-hétfő week → 400.
  - `tests/Domain/AbsenceTransitionGuardTests.cs` (9): a tiltott élek
    InvalidStatusTransitionException-t (409), a payload-hibák sima DomainException-t (400)
    dobnak; terminális Completed; teljes lánc; reopen indok-törléssel.
  - `tests/Domain/WeekCapacityGridTests.cs` (14): rács-alak, 8/4 órás napi kapacitás,
    blokkoló (Approved/InProgress/Completed) vs. nem-blokkoló (Pending/Rejected) távollét,
    több napos távollét, idegen dolgozó távolléte, 0-kapacitású hét (nincs 0-osztás),
    config-vezérelt WorkdaysPerWeek, fail-fast konfig, portal-config tükör.
  - 2 meglévő teszt üzenet-assertje igazítva (a guard-üzenet most felsorolja az
    engedélyezett cél-állapotokat).
- **Host-smoke:** `dotnet run` → `/swagger/v1/swagger.json` **200**, mind a **11 route**
  megjelenik, `GET /api/hr/employees` token nélkül **401** (az auth valóban be van kötve).
- **openapi.yaml:** a HR modulban **nincs** (ehs/qa-nak van) — szinkronizálni nem volt mit;
  a Swagger-generátor a hostból adja a sémát. Statikus openapi.yaml felvétele follow-up.
- **Pre-existing:** a `tests/Integration` készlet (Testcontainers → Docker) érintetlen; a
  `tests/Integration/Api/EmployeeApiTests.cs` eleve **nem működőképes** (az ApiTestFixture
  HttpClientje nem futó szerverre mutat, TestServer nélkül — a QA-nál dokumentált
  ugyanezen minta-hiba). Nem regresszió; az új `tests/Api` készlet ezt a réteget
  Docker-mentesen, valósan fedi. Külön javító-task jelölt (HR-INTEGRATION-FIX).

## ADR-jelöltek / follow-up

1. **⚠️ ADR: wire-nyelv + enum-készlet ütközés (a legfontosabb).** A bevált gyakorlatot
   követtük (JsonStringEnumConverter → **angol PascalCase**: `"Pending"`, `"Production"`),
   de a portal MSW magyar kulcsokkal dolgozik (`kert`, `gyartas`) — ez a MAINT-BE-TRANSITIONS
   nyitott wire-nyelv ADR-je, itt **súlyosabb**: nemcsak a nyelv, hanem az **enum-készlet is más**:
   - `Department`: backend `Production/Logistics/Sales/Administration/IT/Maintenance` ↔
     portal `gyartas/szereles/logisztika/tervezes/ertekesites/iroda` (**nem bijektív**).
   - `SkillKey`: backend 8 ipari készség (`CNCProgramming`, `Welding`…) ↔ portal 10 faipari
     (`szabas`, `elzaras`, `cnc`…) — **más taxonómia**.
   - `SkillLevel`: backend 4 fokozat (Beginner..Expert) ↔ portal **3 szint** (1/2/3).
   - `PayGrade`: backend szabad szöveg + órabér ↔ portal 5 fix sáv (`seged`..`vezeto`).
   **A portal fetcher-átállása ezért NEM lehet puszta MSW-lekapcsolás** — döntés kell:
   backend enum-készlet igazítása a faipari taxonómiához VAGY kétirányú mapping-réteg.
   Root/designer ADR; a domaint szándékosan nem írtuk át.
2. **timeLogs (`/timelogs`, `/timelogs/push`) — NEM implementálva:** nincs `TimeLog`
   aggregátum, repository, tábla a HR domainben; a Kontrolling-átadás (óra × órabér →
   Labor tényköltség) sincs. A taskban is „ne találd ki" tétel. Külön mini-task
   (backend+frontend), a portal `timeLogs.ts` stub a kontraktus-előkép.
3. **assignments (`/assignments`) — NEM implementálva:** nincs `Assignment` aggregátum. Ezért
   a **kapacitás-rács `assigned` értéke mindig 0** (a rács alakja már a végleges, a bekötés
   additív lesz), és a `CapacityCalculationService` régi metódusaiban maradtak az
   `IEnumerable<object> assignments` placeholder-paraméterek. A beosztás forrás-modulja
   (Projektek/Production) tisztázandó — lehet, hogy nem is HR-aggregátum, hanem kereszt-modul olvasás.
4. **`hr.manage` jogosultság:** a host authentikálja a hívót (Keycloak bearer), de
   **nincs permission-gate** — a jóváhagyó/elutasító user-id a payloadban utazik
   (`approvedBy`/`rejectedBy`), mert nincs platform-szintű claim→permission modell.
   A portal `permissions.ts` UI-stubja ennek a párja. Auth-bekötési follow-up.
5. **Absence audit-trail + requestedAt:** a portal `absence.log[]`-ot és `requestedAt`-et
   vár; az aggregátum domain-eseményeket emit, de **nem perzisztál naplót**, és nincs
   CreatedAt. A lista-rendezés emiatt `StartDate desc` (a `requestedAt desc` közelítése).
   Napló-tábla + CreatedAt = külön kör (migrációval).
6. **Employee hiányzó mezők:** `phone`, `startedAt` (HireDate), `employment`
   (az `EmploymentType` enum LÉTEZIK, de az aggregátumon nincs mező!), `color` — a portal
   mind a négyet mutatja. Aggregátum-bővítés + migráció, külön task.
7. **Legacy query-készlet:** a `GetEmployeesBySkillQuery` / `GetEmployeeAbsencesQuery` /
   `GetPendingAbsencesQuery` / `GetEmployee|DepartmentCapacityQuery` az új szűrős
   query-kkel átfed, és a régi placeholder-es `EmployeeListDto`/`AbsenceListDto`-t
   használják (nincsenek kivezetve endpointra). Takarítás/összevonás külön kör.
8. **HR openapi.yaml:** a modulnak nincs statikus openapi.yaml-ja (ehs/qa-nak van) —
   felvétele a Swagger-sémából, az 1. pont ADR-döntése UTÁN érdemes.
9. **HR-INTEGRATION-FIX:** a Testcontainers-es `tests/Integration/Api` készlet életre
   keltése (valódi TestServer-host a modul-endpointokkal) — a QA-INTEGRATION-FIX párja.

## Fájlok

**ÚJ** — host: `src/Api/{Program.cs,HrServiceCollectionExtensions.cs,HttpTenantContext.cs,appsettings.json,SpaceOS.Modules.HR.Api.csproj}` ·
endpointok: `src/Api/Endpoints/{EmployeeEndpoints,AbsenceEndpoints,CapacityEndpoints,HrEndpointResults}.cs` ·
domain: `src/Domain/Exceptions/InvalidStatusTransitionException.cs`, `src/Domain/Services/HrCapacityConfiguration.cs` ·
application: `src/Application/Commands/{AbsenceTransitionCommands,AbsenceTransitionHandlerBase,AbsenceTransitionHandlers}.cs`,
`src/Application/DTOs/{HrDtoMapper,WeekCapacityDto}.cs`,
`src/Application/Queries/{GetAbsencesQuery(.Handler),GetWeekCapacityQuery(.Handler)}.cs` ·
tesztek: `tests/Api/{HrEndpointTestHost,EmployeeEndpointsTests,AbsenceEndpointsTests,CapacityEndpointsTests}.cs`,
`tests/Domain/{AbsenceTransitionGuardTests,WeekCapacityGridTests}.cs`

**MÓDOSÍTVA:** `src/SpaceOS.Modules.HR.csproj` (kernel-út + Api-kizárás + FrameworkReference) ·
`src/Domain/Aggregates/Absence.cs` (FSM-guard a táblán át + dedikált kivétel) ·
`src/Domain/Services/{CapacityCalculationService,ICapacityCalculationService,CapacityHelpers}.cs` (heti rács + config) ·
`src/Domain/Repositories/{IEmployeeRepository,IAbsenceRepository}.cs` (+ListAsync/GetOverlappingAsync) ·
`src/Infrastructure/Persistence/Repositories/{EmployeeRepository,AbsenceRepository}.cs` ·
`src/Application/DTOs/{EmployeeDto,AbsenceDto}.cs` (placeholder-mentesítés) ·
`src/Application/Queries/{GetEmployeesQuery(.Handler),GetEmployeeQueryHandler,GetAbsenceQueryHandler}.cs` ·
`tests/SpaceOS.Modules.HR.Tests.csproj` (+FrameworkReference, +TestHost, +Api ref) ·
`tests/Domain/AbsenceTests.cs` (2 üzenet-assert)

**TÖRÖLVE (kiváltva):** `src/Application/Commands/{Approve,Reject,Reopen}AbsenceCommand(.Handler).cs`
(→ AbsenceTransition* fájlok)

**VÁLTOZATLAN:** a portal fa (csak olvasott kontraktus) · HRDbContext + EF-konfigok +
migrációk (nem változott perzisztált mező)
