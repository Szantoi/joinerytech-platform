# MAINT-BE-TRANSITIONS — Maintenance munkalap-átmenetek backend-zárása

- **Szerep:** backend · **Státusz:** ✅ done (2026-07-16) · **Fázis:** F2 follow-up
- **Előzmény:** F2-MAINTENANCE-FE „Backend-gap" listája + a portal MSW-FIRST kontraktus
  (`src/joinerytech-portal/src/services/maintenance/fsm.ts` + `src/mocks/maintenanceApi/`)
- **Precedens:** src/ehs RiskAssessmentEndpoints (409 illegális FSM-átmenetre) + QA-BE-ENDPOINTS

## Feladat

A Maintenance backend (src/maintenance) lemaradt a frontend mögött: a munkalap-FSM 6
átmenetéből csak a start/complete volt kivezetve (204-gyel), és a `WorkOrderStatusTransitions`
FSM-tábla eltért a `WorkOrder` aggregátum guardjaitól (Reported → InProgress ág).

## Elvégzett munka

### 1. FSM-tábla ↔ aggregátum összehangolás (az aggregátum az igazságforrás)

- A táblából **törölve a Reported → InProgress** él („if assigned") — a `StartWork()` mindig is
  csak Scheduled-ből futott, a portal `WORK_ORDER_FSM` az aggregátumot tükrözi.
- Az aggregátum minden átmenet-metódusa mostantól a **deklaratív táblán keresztül guardol**
  (`EnsureTransition` → `WorkOrderStatusTransitions.IsValidTransition`), így tábla és aggregátum
  nem tud többé szétcsúszni; a tábla kommentje a portal fsm.ts 1:1 tükrét dokumentálja.
- Új domain-kivétel: **`WorkOrderStateConflictException : DomainException`** — állapot-konfliktus
  (illegális átmenet, assign rossz státuszban, start felelős nélkül) → **409**; input-validáció
  marad sima `DomainException` → **400** (EHS-hibakontraktus + portal MSW tükör).

### 2. Átmenet-endpointok (PUT + friss WorkOrderDto — portal-kontraktus)

`/api/maintenance/work-orders/{id}/…` (mind: 200 friss DTO / 400 / 404 / 409):

| Endpoint | Átmenet | Payload |
|---|---|---|
| PUT `/schedule` | Reported → Scheduled | scheduledAt + estimatedHours |
| PUT `/assign` | nem FSM-átmenet (Reported/Scheduled guard) | assignmentType + assignedTo (Guid) |
| PUT `/start` | Scheduled → InProgress (felelős kötelező) | **üres** (RequiresDowntime a create-kor rögzül) |
| PUT `/complete` | InProgress → Completed (terminális) | actualHours (+ completionNote) |
| PUT `/postpone` | Scheduled/InProgress → Postponed | reason (kötelező) |
| PUT `/reject` | Reported/Scheduled → Rejected | reason (kötelező) |
| PUT `/reopen` | Postponed/Rejected → Reported (assign/ütemezés/indokok törlődnek) | **üres** |

- A meglévő start/complete **POST+204 → PUT+200 friss DTO** (a gap-lista 3. pontja szerint).
- `StartWorkOrderCommand.RequiresDowntime` **törölve** (gap-lista 4. pont): az aggregátum
  create-kor rögzíti, a `WorkOrderStartedEvent` a tárolt flaget viszi a Production-integrációnak.
- `ReopenWorkOrderCommand.Reason` törölve (a portal nem küld payloadot; az aggregátum
  `Reopen()`-je nem is használta).
- Application-réteg: közös **`WorkOrderTransitionHandlerBase`** (load → aggregátum-akció →
  persist → friss `WorkOrderDto`; Conflict/Invalid/NotFound Result-mapping, **ILogger** az EHS
  handler-mintára) + `IWorkOrderTransitionCommand`; mind a 7 handler erre épül.
- **`WorkOrderDtoMapper`**: egyetlen WorkOrder → DTO leképezés (a detail query + az 5 lista-query
  kézi mapping-duplikátumai is erre álltak át); a DTO bővült: `AssetName`, `StartedAt`,
  `CompletedAt`, `PostponementReason`, `RejectionReason` (a portal detail-nézet mezői).
- **`MaintenanceApiJsonOptions.AddMaintenanceApiJsonOptions()`**: enumok stringként a dróton
  (EHS Program.cs precedens — a maintenance modulnak nincs saját hostja, a befogadó host hívja).

### 3. Build-/infra-javítások (a zöld suite feltételei)

- **csproj-út javítva**: `../../backend/spaceos-kernel/…` → `../../spaceos-kernel/…`
  (EHS-minta; a modul korábban nem is fordult).
- **Duplikált EF-migrációkészlet rendezve**: a stale, scaffoldolt `src/Migrations/` törölve;
  a kézzel írt `Infrastructure/Persistence/Migrations` 001/002 megkapta a hiányzó
  `[DbContext]`/`[Migration]` attribútumokat (enélkül SOHA nem futottak — a stale készlet ment).
- **Owned-kollekciók `id` oszlopa** explicit mappelve (work_order_parts, asset_maintenance_plans)
  — enélkül a runtime-modell PascalCase `Id`-t várt (42703 minden owned-joinos lekérdezésen).
- **`TenantDbConnectionInterceptor` javítva**: a SET a `ConnectionOpened`-ben fut (az Opening-ben
  a kapcsolat még zárt volt → „Connection is not open"), és paraméterezett `set_config`-gal
  (nem függ a migráció által létrehozott függvénytől, nincs string-interpoláció).
- `ApiTestFixture` fordítási hibái javítva (hiányzó JWT-csomag → opaque teszt-token; rossz
  `ITenantContext` namespace); a 4 eleve futásképtelen stub-teszt (HTTP szerver nélkül / lehetetlen
  `List<object>` assert) DbContext-szintű, értelmes assertté alakítva.

## Tesztek · build

- **154/154 zöld** (`dotnet test`, korábban a tesztprojekt nem is fordult):
  - Domain: FSM-tábla (Reported→InProgress már invalid + **portal-tükör Theory** mind a 6 státuszra)
    + aggregátum (6 új kivétel-kontraktus teszt: állapot-konfliktus → `WorkOrderStateConflictException`,
    input-hiba → sima `DomainException`).
  - **ÚJ endpoint-kontraktus tesztek (19)**: TestServer + in-memory repók
    (`tests/Api/WorkOrderEndpointTestHost.cs` + `WorkOrderTransitionEndpointTests.cs`) — teljes
    happy-lánc (schedule→assign→start→complete), 409-ek (tiltott átmenet, terminális reopen,
    start felelős nélkül, assign folyamatban), 400-ak (múltbeli dátum, 0 óra, üres indok,
    ismeretlen assignmentType), 404, enum-string wire-formátum, reopen mező-törlés.
  - Integration (Testcontainers/Postgres): repository- és séma-tesztek zölden (a migrációs
    drift-javítás után).
- `dotnet build` 0 error (module + tests). OpenAPI-fájl a modulban nincs (a route-metaadatok
  — Produces 200/400/404/409 + summary — a MapTransition helperben egységesek).

## ADR-jelöltek (nem döntöttem egyedül — a legszűkebb portal-konform megoldás ment)

1. **Reported → InProgress közvetlen átmenet**: a táblából törölve (aggregátum + portal a szigorúbb).
   Ha üzletileg kell az „azonnali indítás ütemezés nélkül", az ADR-döntés + portal-módosítás.
2. **Assign-identitás**: a portal `assigneeName`-et (denormalizált név) küld, a backend Guid-ot
   (`assignedTo`) vár — név-feloldás (HR/Partner lookup) vagy DTO/parancs-bővítés ADR-döntés;
   most a backend-idióma maradt (Guid + Internal/External).
3. **Wire-nyelv**: portal kanonikus magyar enum-kulcsok (bejelentve/javitas/…) + string id-k
   (MWO-101) ↔ backend angol enum-nevek + Guid; a mapping-réteg helye (frontend adapter vs BFF)
   ADR-döntés — az enum-string alap a `JsonStringEnumConverter`-rel megvan.
4. **DTO-hiányok**: `assigneeName` és `log` (napló) a backendben nem létező adatok — a napló
   event-sourcing/audit kérdés, külön kontraktussal.

## Fájlok

**ÚJ:** `src/Domain/Exceptions/WorkOrderStateConflictException.cs`,
`src/Application/Commands/{IWorkOrderTransitionCommand,WorkOrderTransitionHandlerBase}.cs`,
`src/Application/DTOs/WorkOrderDtoMapper.cs`, `src/Api/MaintenanceApiJsonOptions.cs`,
`tests/Api/{WorkOrderEndpointTestHost,WorkOrderTransitionEndpointTests}.cs`
**MÓDOSÍTVA:** `src/Domain/FSM/WorkOrderStatusTransitions.cs`, `src/Domain/Aggregates/WorkOrder.cs`,
`src/Api/Endpoints/WorkOrderEndpoints.cs`, 7 command + 7 handler, `WorkOrderDto`, 5 query-handler
(mapperre), `Start/ReopenWorkOrderValidator`, 2 EF-konfiguráció (owned id), 2 migráció (attribútumok),
`TenantDbConnectionInterceptor`, csproj-ok, `tests/Integration/Api/{ApiTestFixture,AssetApiTests,WorkOrderApiTests}.cs`,
`tests/Domain/{WorkOrderFsmTests,WorkOrderTests}.cs`
**TÖRÖLVE:** `src/Migrations/` (stale scaffoldolt duplikátum)

## Follow-up

- **MAINT-BE-ASSETS** (gap-lista 5. pont): `GetAssetsQuery` kind/q szűrés + számított
  `status`/`openWorkOrders`/`duePlans` a lista-DTO-ban (`AssetStatusCalculationService` kiszolgáláskor).
- Állásidő-napló + munkalap-alkatrész UI + Kontrolling-push (F2-MAINTENANCE-FE 4. follow-up).
- A 3 wire-kontraktus ADR (assign-identitás, wire-nyelv, napló) döntése a roottal/frontenddel közösen.
