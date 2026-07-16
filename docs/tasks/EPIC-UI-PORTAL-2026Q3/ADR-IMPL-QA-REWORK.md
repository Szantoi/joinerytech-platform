# ADR-IMPL-QA-REWORK — Az elfogadott ADR-063 (QA rework/Conditional ág) implementálása

- **Szerep:** backend · **Státusz:** ✅ done (2026-07-16)
- **Spec:** [ADR-063](../../knowledge/adr/ADR-063-qa-rework-conditional.md) — **ELFOGADVA (c): a hurok a
  Ticket-domainben, az újraellenőrzés ÚJ Inspection, az Inspection immutable marad**
- **Előzmény:** QA-BE-ENDPOINTS (1. ADR-jelölt) — a rework/Conditional ág tudatosan nem került be,
  az openapi `/conditional` fantom-útja törölve lett; ez a task hozza vissza az elfogadott alakban
- **Terület:** `src/qa` Domain/Application/Api + saját migráció — host/Program/DI/appsettings/interceptorok
  NEM (ADR-IMPL-HOSTING területe); a portal fához nem nyúltunk

## Mit / hogyan

### 1. FSM — előtte/utána

**Az InspectionStatusTransitions tábla NEM változott** (Planned → InProgress → Completed, Completed
terminális). Az ADR-063 (c) lényege pont ez: a hurok nem az Inspection FSM-jében fut.

| | Előtte | Utána |
|---|---|---|
| `InspectionResult.Conditional` | holt enum-érték, semmilyen átmenet nem állította elő | `CompleteWithConditional()` állítja elő (InProgress → Completed + Conditional) |
| Javítási hurok | nincs | a **Ticket** FSM-jében (bejelentve→kiosztva→folyamatban→megoldva + reopen — már készen volt) |
| Újraellenőrzés | nincs | **ÚJ Inspection** `ReworkOfInspectionId`-vel az eredetire; az eredeti érintetlen (audit-lánc sértetlen) |
| Portal `javitasra` | 5. státusz-érték lett volna | **származtatott nézet-állapot**: Completed + Conditional + `openTicketId` (ld. Portal-teendő) |

### 2. Domain (`src/Domain`)

- `Aggregates/Inspection.cs`:
  - **`ReworkOfInspectionId`** (nullable `InspectionId`) — az újraellenőrzés visszamutatója.
  - **`CompleteWithConditional(failureNotes, notes)`** — FSM-guard (InProgress → Completed, egyébként
    `InvalidStatusTransitionException` → 409); **min. 1 hibajegyzet kötelező** (DomainException → 400) —
    a „kisebb hibák" dokumentálása táplálja a rework-ticketet; eredmény `Conditional`, esemény:
    **ÚJ `InspectionCompletedConditionallyEvent`** (inspector/order/product/failure-típusok — a
    ticket-spawnhoz kell minden).
  - **`CreateRework(original, inspectorId, plannedAt)`** factory — guard: az eredeti **Completed +
    Conditional** legyen (különben `InvalidStatusTransitionException` → 409); a checkpoint/order/product
    scope öröklődik, az eredeti aggregátum NEM módosul. Láncolható (a rework maga is lehet Conditional).
- `Repositories/ITicketRepository.cs` + impl: **ÚJ `GetByInspectionIdAsync`** — az `openTicketId`
  derivációhoz.

### 3. Application (`src/Application`)

- **ÚJ `CompleteInspectionWithConditionalCommand(+Handler)`** → `Result<Guid>` (a spawn-olt ticket id-ja):
  - lezárja az inspectiont Conditional-lal ÉS **automatikusan Ticketet nyit** (ADR-ajánlás szerint:
    automatikus — a feltételes kimenet nyom nélkül nem veszhet el): `TicketType.Repair`, prioritás a
    parancsból (config-vezérelt, ld. Api), `ReportedBy` = az ellenőr, `InspectionId`/`OrderId`/`ProductId`
    átvéve; cím/leírás magyarul (ez felhasználói TARTALOM, nem wire-enum — az ADR-059 kérdését nem érinti),
    a leírásban a dokumentált hibák + ellenőri megjegyzés + forrás-inspection id.
  - **Sorrend-invariáns:** minden validáció (hibajegyzetek, FSM-guard, ticket-payload) fut LE bármilyen
    mentés előtt; a ticket `AddAsync` az első flush — a megosztott scoped `QADbContext` miatt ez EGY
    SaveChanges-ben, atomian viszi a lezárt inspectiont és a ticketet; az `UpdateAsync` utána defenzív
    flush (nem megosztott kontextusú repo-implementációkra).
  - Hibakontraktus a modul-precedens szerint: `InvalidStatusTransitionException → Conflict(409)`,
    `DomainException → Invalid(400)`, egyéb → `Error`.
- **ÚJ `CreateReworkInspectionCommand(+Handler)`** → `Result<InspectionId>`: eredeti betöltése (404),
  `Inspection.CreateRework` (409/400), mentés.
- **ÚJ validátorok:** `CompleteInspectionWithConditionalValidator` (a Fail-validátor tükre + prioritás-enum),
  `CreateReworkInspectionValidator`.
- `DTOs/InspectionDto.cs`: **+`ReworkOfInspectionId`**, **+`OpenTicketId`** (defaultolt paraméterek —
  minden meglévő hívóhely változatlanul fordul).
- `GetInspectionQueryHandler`: +`ITicketRepository` függőség; `OpenTicketId` = a legfrissebb NYITOTT
  (a Domain `TicketStatusTransitions.IsOpen` guardja — a portal `TICKET_OPEN_STATUSES` tükre) kapcsolt
  ticket; `ReworkOfInspectionId` mappelve. Minden átmenet-endpoint válasza automatikusan hordozza.

### 4. Api (`src/Api/Endpoints/InspectionEndpoints.cs`)

- **ÚJ `POST /api/qa/inspections/{id}/complete/conditional`** — body a fail tükre
  (`failureNotes[] + notes`); siker: **200 + friss InspectionDto** (openTicketId-vel), a log a spawn-olt
  ticket id-t is viszi; 404/409/400 a közös `QaEndpointResults` mappingen; ismeretlen failureType → 400
  mediator-hívás nélkül.
- **ÚJ `POST /api/qa/inspections/{id}/rework`** — body `{inspectorId, plannedAt}`; siker: **201 + a
  friss InspectionDto az ÚJ inspectionről** + Location header; 404 (eredeti nincs), 409 (nem
  Completed+Conditional), 400 (múltbeli plannedAt).
- **Config-vezérelt** rework-ticket prioritás: `QA:Rework:TicketPriority` (fallback **Medium** — a
  feltételes megfelelés definíció szerint kishibás kimenet, nem eszkaláció); érvénytelen config-érték
  **fail-fast** `InvalidOperationException` (némán rossz prioritás minden reworköt félreirányítana).
- A fail/conditional közös failureNote-parse kiemelve (`TryParseFailureNotes`) — a fail-endpoint
  duplikációja megszűnt.

### 5. Perzisztencia + migráció

- `InspectionEntityTypeConfiguration`: `rework_of_inspection_id` (uuid, null) + index, a CheckpointId-vel
  azonos strong-id konverzióval.
- **ÚJ migráció:** `20260716100000_AddInspectionReworkReference` (+Designer `[Migration]` attribútummal —
  a DMS-BE-HOST-ban dokumentált akna elkerülve) + snapshot frissítve. **Adat nincs → kockázatmentes**
  (ADR hatás-elemzés szerint).

### 6. openapi.yaml szinkron

- A QA-BE-ENDPOINTS-ban törölt `/conditional` út **más alakban tér vissza** (az ADR-063 hatás-szakasza
  szerint): `POST .../complete/conditional` (ConditionalInspectionCommand = FailInspectionCommand-alak,
  minItems: 1) + **ÚJ** `POST .../{id}/rework` (CreateReworkInspectionCommand).
- `InspectionDto` séma: +`reworkOfInspectionId`, +`openTicketId` (derivációs megjegyzéssel).
- YAML-validitás ellenőrizve (python yaml.safe_load).

## Hogyan ellenőrizve

- `dotnet build` (modul): **0 warning, 0 error**; tesztprojekt: a baseline-nal azonos 6 pre-existing
  warning (NU1902 ×2 + xUnit ×4 az Integration készletben), új warning nincs.
- Tesztek: **184/184 zöld** (baseline 151 + **33 új**, `FullyQualifiedName!~Integration`):
  - `tests/Domain/Aggregates/InspectionReworkTests.cs` (10): Conditional átmenet-készlet (InProgress-ből
    OK + esemény-payload; Planned/Completed-ből 409-kivétel; üres hibajegyzet 400-kivétel, állapot
    érintetlen) + CreateRework guard-készlet (Conditional-ból OK + scope-öröklés + az eredeti immutable;
    Pass/Fail/InProgress-ből kivétel; múltbeli plannedAt; kétszintű rework-lánc).
  - `tests/Unit/Commands/CompleteInspectionWithConditionalCommandHandlerTests.cs` (6): rework-ticket spawn
    (Repair típus, parancs-prioritás, inspector=reporter, inspection/order/product link, cím a checkpoint
    nevével, leírás a hibákkal + forrás-id), fallback-cím checkpoint nélkül, 404, 409 mentés nélkül,
    400 mentés nélkül, repo-hiba → Error.
  - `tests/Unit/Commands/CreateReworkInspectionCommandHandlerTests.cs` (4): rework-referencia + öröklés,
    404, 409 (Pass-ból), 400 (múltbeli plannedAt).
  - `tests/Api/InspectionReworkEndpointsTests.cs` (12): conditional 200 + friss DTO (Conditional +
    openTicketId), default→Medium és configolt→High prioritás a parancsban, fail-fast érvénytelen configra,
    409/400/404, ismeretlen failureType 400 dispatch nélkül; rework 201 + Location + reworkOfInspectionId,
    409/404/400.
  - `GetInspectionQueryHandlerTests` (+1): nyitott vs. megoldott kapcsolt ticket → csak a nyitott kerül az
    `OpenTicketId`-ba (a meglévő 4 teszt az új konstruktor-függőséggel frissítve, assertek bővítve).
- A meglévő 151 teszt érintetlenül zöld; a 26 Integration-teszt a task ELŐTT is bukott
  (QA-INTEGRATION-FIX jelölt, nem regresszió).

## Portal-teendő (KÖVETKEZŐ HULLÁM — ADR-059-cel együtt, designer-újrakörrel)

A backend-kontraktus úgy készült, hogy a `javitasra` **egyetlen fetch-ből** levezethető legyen:

1. **`fsm.ts` / `inspections.ts`:** a `javitasra` NEM 5. státusz-érték, hanem derivált:
   `status === Completed && result === Conditional && openTicketId != null`. A zod-sémába:
   `result` (Pending/Pass/Fail/Conditional), `reworkOfInspectionId?`, `openTicketId?`.
2. **„Selejtezés" mellé „Feltételes megfelelés" akció** a folyamatban lévő átvizsgáláson →
   `POST /complete/conditional` (hibajegyzet-guard UGYANAZ, mint a fail-nél: `failNotesBlockReason`).
3. **„Újraellenőrzés" akció** a javitasra-derivált állapotú átvizsgáláson → `POST /{id}/rework`
   (201 → navigáció az új inspectionre); a lánc megjeleníthető a `reworkOfInspectionId`-ből.
4. A `javitasra` → `nyitott` „átmenet" a UI-ban valójában az ÚJ inspection megjelenése — a régi kártya
   Completed+Conditional marad (audit). A hibajegy-világ változatlan (a rework-ticket normál ticket).
5. MSW-handlerek + derivációs teszt; **designer-review kötelező** (APPROVED világ nyílik újra).
6. Lista-nézet derivációja: a `GET /api/qa/inspections` lista-hack (QA-BE-ENDPOINTS 3. follow-up)
   rendezésekor az `openTicketId`-t a lista-DTO-ba is fel kell venni, vagy a portal a ticket-listából
   joinol (`GET /api/qa/tickets?inspectionId=`).

## Nyitott pontok / follow-up

- **Tickets-tábla migráció HIÁNYZIK (pre-existing):** a `QADbContextModelSnapshot`-ban nincs Ticket-entitás
  és az InitialCreate sem hozza létre a `qa.tickets`/`qa.ticket_resolution_actions` táblákat, miközben a
  Ticket-endpointok (QA-BE-ENDPOINTS óta) és most az auto-ticket is írnák. Szándékosan NEM itt pótoltuk
  (párhuzamos ADR-IMPL-HOSTING ütközés-kockázat + nem e task scope-ja) — **a QA host élesítése előtt
  kötelező pótolni** (QA-INTEGRATION-FIX / hosting follow-up).
- **ADR-063 nyitott jelölői:** az auto-ticket „igen" irányt az ajánlás szerint implementáltuk (a döntés
  „az ajánlás szerint" szólt); a designer-jóváhagyás jelölő (javitasra → derivált) a portal-hullám kapuja.
- Az ADR-064 (assign-identitás) a rework-ticket `AssignedTo`-ját ugyanúgy érinti, mint minden ticketét.

## Fájlok

**ÚJ:** `src/Domain/Events/InspectionCompletedConditionallyEvent.cs` ·
`src/Application/Commands/CompleteInspectionWithConditionalCommand(+Handler).cs` ·
`src/Application/Commands/CreateReworkInspectionCommand(+Handler).cs` ·
`src/Application/Validators/{CompleteInspectionWithConditional,CreateReworkInspection}Validator.cs` ·
`src/Infrastructure/Persistence/Migrations/20260716100000_AddInspectionReworkReference(.Designer).cs` ·
tesztek: `tests/Domain/Aggregates/InspectionReworkTests.cs`,
`tests/Unit/Commands/{CompleteInspectionWithConditional,CreateReworkInspection}CommandHandlerTests.cs`,
`tests/Api/InspectionReworkEndpointsTests.cs`

**MÓDOSÍTVA:** `src/Domain/Aggregates/Inspection.cs` · `src/Domain/Repositories/ITicketRepository.cs` ·
`src/Infrastructure/Persistence/Repositories/TicketRepository.cs` ·
`src/Infrastructure/Persistence/Configurations/InspectionEntityTypeConfiguration.cs` ·
`src/Infrastructure/Persistence/Migrations/QADbContextModelSnapshot.cs` ·
`src/Application/DTOs/InspectionDto.cs` · `src/Application/Queries/GetInspectionQueryHandler.cs` ·
`src/Api/Endpoints/InspectionEndpoints.cs` · `tests/Unit/Queries/GetInspectionQueryHandlerTests.cs` ·
`docs/openapi.yaml`
