# QA-BE-ENDPOINTS — QA backend endpoint-gapek zárása (F2-QA-FE follow-up)

- **Szerep:** backend · **Státusz:** ✅ done (2026-07-16)
- **Előfeltétel:** F2-QA-FE (a rögzített kontraktus a portal MSW-előkép: `src/joinerytech-portal/src/services/qa/` + `src/mocks/qaApi/`), RISKS-5X5-BE (409-es hibakontraktus-precedens: `src/ehs` RiskAssessmentEndpoints)
- **Terület:** `src/qa` — a portal fához NEM nyúltunk (csak olvasott kontraktus)

## Feladat

A VPS-csapat jelezte: a QA backend elmaradásban van a frontendhez képest. Az
F2-QA-FE dokumentált backend-gap listájának zárása:

1. **Ticket REST endpointok** — a Command/Query réteg kész volt, a REST réteg hiányzott.
2. **Inspection átmenet-endpointok 204 → friss DTO** (optimista frissítés kontraktus).
3. **Criteria a DTO-ban** — checklist-szempontok denormalizálva az InspectionDto-ba.
4. **GetQAMetrics endpoint** — a kész GetQAMetricsQuery kivezetése.
5. **rework/Conditional ág:** NEM implementáltuk — ADR-jelölt (ld. lent).

## Mit / hogyan

### 0. Build-javítás (előfeltétel)
- `src/SpaceOS.Modules.QA.csproj`: a kernel-referencia törött `../../backend/spaceos-kernel/…`
  útról a valós `../../spaceos-kernel/…` útra (az src/ehs Domain.csproj javításának tükre).
  Enélkül a modul nem fordult (52 error).

### 1. Hibakontraktus: 409 illegális FSM-átmenetre (EHS-precedens)
- **ÚJ** `Domain/Exceptions/InvalidStatusTransitionException.cs` (`: DomainException`) —
  az aggregátumok FSM-guardjai (Inspection: Start/CompleteWithPass/CompleteWithFail;
  Ticket: Assign/Start/Resolve/Reject/Reopen + EscalatePriority mindkét guardja) ezt dobják.
  A payload-validáció (pl. „min. 1 intézkedés/hibajegyzet", kötelező indok) sima
  DomainException marad.
- A 10 érintett command-handler catch-lánca: `InvalidStatusTransitionException →
  Result.Conflict` (→ HTTP 409), `DomainException → Result.Invalid` (→ HTTP 400),
  egyéb → `Result.Error` (változatlan).
- **ÚJ** `Api/Endpoints/QaEndpointResults.cs` — közös Ardalis.Result → HTTP mapping
  (NotFound→404, Conflict→409 `{error}`, Invalid→400 `{error}`, egyéb→400).
- A meglévő domain-tesztek zöldek maradtak (FluentAssertions `Throw<DomainException>`
  a leszármazottat is elfogadja).

### 2. TicketEndpoints (ÚJ — `Api/Endpoints/TicketEndpoints.cs`, 9 route)
A portal MSW-kontraktus (`handlers.tickets.ts`) tükre, a meglévő QA endpoint-minta
szerint (`/api/qa/tickets` group, RequireAuthorization, X-Tenant-Id header,
string-enum + TryParse → 400):
- `POST ""` → CreateTicketCommand, **201 + teljes TicketDto** (Location headerrel)
- `GET ""` → **ÚJ GetTicketsQuery** (status/priority/inspectionId/open/q szűrők,
  legfrissebb bejelentés elöl, teljes TicketDto-lista — az MSW-lista tükre;
  az open-guard a Domain `TicketStatusTransitions.IsOpen` (Reported/Assigned/InProgress,
  a portal TICKET_OPEN_STATUSES tükre); az open/q + rendezés PURE, unit-tesztelhető
  `ApplyInMemoryFilters` lépésben)
- `GET /{id}` → TicketDto / 404
- `PUT /{id}/assign|start|resolve|reject|reopen` → FSM-átmenetek (TICKET_FSM:
  bejelentve→kiosztva→folyamatban→megoldva + elutasitva, reopen-nel), **200 + friss TicketDto**
- `PUT /{id}/escalate` → EscalatePriority (státusz- és rang-guardolt, nem FSM) —
  terminálison / nem-magasabb rangra 409, érvénytelen prioritás 400
- Logolás: ILoggerFactory (sikeres átmenet Information, elutasított Warning) —
  a modul endpoint-rétegében, mert a QA handler-réteg historikusan logger-mentes.
- Duplikáció-mentesítés: **ÚJ** `Application/DTOs/TicketDtoMapper.cs` — a
  GetTicketQueryHandler és a GetTicketsQueryHandler közös Ticket→TicketDto mappere.

### 3. Inspection átmenetek: 204 → 200 friss InspectionDto
- `POST /{id}/start`, `/complete/pass`, `/complete/fail`: siker után GetInspectionQuery
  → **200 + friss InspectionDto** (Maintenance-precedens, optimista frissítés kontraktus);
  hibák a közös mappingen (404/409/400). Produces-metaadatok frissítve.

### 4. Criteria az InspectionDto-ban
- `InspectionDto` + `Criteria: InspectionCriteriaDto[]` mező; a GetInspectionQueryHandler
  a (már betöltött) checkpoint szempontjaiból denormalizálja — a portal detail-checklist
  külön checkpoint-fetch nélkül működik (MSW-kontraktus: `inspection.criteria`).

### 5. GET /api/qa/metrics (ÚJ — `Api/Endpoints/QAMetricsEndpoints.cs`)
- A kész GetQAMetricsQuery kivezetése: `?from&to` opcionális; ha hiányzik, az ablak
  **config-vezérelt**: `QA:Metrics:DefaultWindowDays` (fallback **42 nap = 6 hét** —
  a portal `TREND_WINDOW_WEEKS` tükre, QUALITY.md 3.: küszöb sosem literál).
  `from > to` → 400. Válasz: QAMetricsDto (a portal `calcQaMetrics` tükrének kontraktusa).

### 6. openapi.yaml szinkron
- Ticket-átmenetek POST→**PUT** (MSW-kontraktus), lista-szűrők + sima tömb-válasz
  (lapozott helyett), request-sémák a valós DTO-kra (CreateTicket/Assign/Resolve/
  Reject/Escalate + ResolutionActionInput).
- Inspection: `/complete`→`/complete/pass`, `/fail`→`/complete/fail` (a valós útvonalak),
  start body nélkül; **`/conditional` út + séma TÖRÖLVE** (nincs a backendben — ADR-jelölt).
- InspectionDto (criteria-val), TicketDto, FailureNoteDto, ResolutionActionDto a valós
  alakra; InspectionResult enum + `Pending`; ÚJ `GET /api/qa/metrics` + QAMetricsDto séma.
- YAML-validitás ellenőrizve.

## Hogyan ellenőrizve

- `dotnet build` (modul + tesztek): **zöld, 0 warning**.
- Tesztek: **151/151 zöld** (baseline 103 + **48 új**), `--filter FullyQualifiedName!~Integration`:
  - `tests/Api/TicketEndpointsTests.cs` (18): route-készlet, 201+body+Location,
    409 guard-üzenettel, 400 payload/enum, 404, szűrő-átadás a query-be, friss DTO válasz.
  - `tests/Api/InspectionEndpointsTests.cs` (6): 204 helyett 200 + friss DTO
    (criteria-val), 409 illegális átmenet, 400 hibajegyzet nélkül.
  - `tests/Api/QAMetricsEndpointsTests.cs` (4): 200 + DTO, explicit from/to átadás,
    config-vezérelt default ablak, from>to → 400.
  - `tests/Api/QaEndpointTestHost.cs`: TestServer + mockolt IMediator + test-auth
    (DB nélküli, gyors REST-réteg kontraktus-teszt; JsonStringEnumConverter a
    prod-host tükreként — EHS Program.cs precedens).
  - `tests/Domain/FSM/InvalidStatusTransitionExceptionTests.cs` (7): mindkét aggregátum
    FSM-guardjai + eszkaláció-guardok a dedikált kivételt dobják.
  - `tests/Unit/Commands/TransitionResultMappingTests.cs` (9): handler-szintű
    Conflict/Invalid mapping (mock repository).
  - `tests/Unit/Queries/GetTicketsQueryFilterTests.cs` (4): open-guard, kis/nagybetű-
    független keresés, ReportedAt-desc rendezés.
- **Pre-existing:** a `tests/Integration` készlet (26 teszt) már a task ELŐTT is bukott —
  hiányzó xUnit `CollectionDefinition` a "QA API Tests" collectionhöz, ÉS az
  ApiTestFixture HttpClient-je nem futó szerverre mutat (http://localhost, TestServer
  nélkül) — nem regresszió, külön javító-task jelölt (QA-INTEGRATION-FIX).

## ADR-jelöltek / follow-up

1. **ADR: rework/Conditional ág** — a design-spec `qaEllenorzes.javitasra` (rework-hurok)
   ága és a backend `InspectionResult.Conditional` értéke NEM átvezethető: az Inspection
   aggregátumban nincs rework-átmenet (Completed terminális, immutable audit-trail) és
   nincs `CompleteWithConditional()`. Szándékosan NEM implementáltuk (a kliens-FSM a
   szigorúbb backendet tükrözi — Maintenance-lecke); a döntés (backend-bővítés VAGY
   spec-szűkítés) root/designer ADR. Az openapi `/conditional` fantom-útját töröltük,
   az `InspectionResult.Conditional` enum-érték a domainben maradt (nem törő).
2. **Assign kontraktus-eltérés:** a portal MSW `assigneeName` stringet küld, a backend
   `AssigneeId` Guid-ot vár (nincs user-lookup a modulban) — auth/HR-integrációkor
   rendezendő (a portal fetcher-átállásakor mapping kell).
3. **`GET /api/qa/inspections` lista-hack:** a meglévő ListInspections a
   GetFailedInspectionsQuery-t használja 10 éves ablakkal — a portal lista-szűrős
   (status/open/q) Inspection-lista query külön follow-up (a taskban nem szerepelt).
4. **openapi maradék drift:** a nem implementált aspirációs utak (tickets/overdue,
   resolution-actions, metrics/pareto|summary|ticket-root-causes, inspections/pending|failed
   régi alakja) még a fájlban — teljes reconcile külön kör.
5. **QA-INTEGRATION-FIX:** a Testcontainers-es integrációs készlet életre keltése
   (CollectionDefinition + valódi TestServer-host a modul-endpointokkal).

## Fájlok

**ÚJ:** `src/Domain/Exceptions/InvalidStatusTransitionException.cs` ·
`src/Application/Queries/GetTicketsQuery(.Handler).cs` ·
`src/Application/DTOs/TicketDtoMapper.cs` ·
`src/Api/Endpoints/TicketEndpoints.cs` · `src/Api/Endpoints/QAMetricsEndpoints.cs` ·
`src/Api/Endpoints/QaEndpointResults.cs` ·
tesztek: `tests/Api/{QaEndpointTestHost,TicketEndpointsTests,InspectionEndpointsTests,QAMetricsEndpointsTests}.cs`,
`tests/Domain/FSM/InvalidStatusTransitionExceptionTests.cs`,
`tests/Unit/Commands/TransitionResultMappingTests.cs`,
`tests/Unit/Queries/GetTicketsQueryFilterTests.cs`

**MÓDOSÍTVA:** `src/SpaceOS.Modules.QA.csproj` (kernel-út) ·
`src/Domain/Aggregates/{Inspection,Ticket}.cs` (FSM-guard kivétel) ·
`src/Domain/FSM/TicketStatusTransitions.cs` (+IsOpen) ·
`src/Application/DTOs/InspectionDto.cs` (+Criteria) ·
`src/Application/Queries/Get{Inspection,Ticket}QueryHandler.cs` ·
10 command-handler (catch-lánc) · `src/Api/Endpoints/InspectionEndpoints.cs` ·
`tests/SpaceOS.Modules.QA.Tests.csproj` (+FrameworkReference) · `docs/openapi.yaml`
