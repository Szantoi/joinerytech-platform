# API kontraktus-audit — 7 modul vs. UI-terv FSM-követelmények

> **Kiadta:** backend terminál — 2026-07-14
> **Epic:** `EPIC-UI-PORTAL-2026Q3`
> **Referencia:** `docs/knowledge/architecture/UI_IMPLEMENTATION_PLAN_2026-07-14.md` (5. pont — kanonikus FSM-készletek)
> **Scope:** csak audit + kontraktus-javaslat; kód NEM módosult.

---

## 0. Legfontosabb megállapítások (TL;DR)

1. **Kettős implementációk:** CRM, DMS, HR, Kontrolling és EHS modulból is **két párhuzamos backend-fa** él a repóban (`src/<modul>` ill. `src/SpaceOS.Modules.CRM` vs. `src/spaceos-modules/spaceos-modules-*`; `src/ehs` vs. `src/spaceos-modules-ehs`). Konszolidációs döntés kell (root).
2. **Egyetlen futtatható host az EHS** (`src/ehs/src/Api/Program.cs`, Swagger-rel). Az összes többi modul class library: a minimal-API `Map*Endpoints()` extension metódusok léteznek, de **sehol nincsenek host-ba kötve**, és sehol máshol nincs `AddSwaggerGen`. A `src/spaceos-kernel` submodule üres — a modul-host hiánya platform-szintű blocker (Orval codegen-hez szervírozott OpenAPI kell).
3. **Domain-szintű FSM-őrzés mindenhol erős** (private setter + guard metódusok / allowed-transition map) — státusz sehol nem állítható szabadon. A hiány az **API-felszínen** és az **FSM-készlet eltéréseken** van.
4. **EHS-hiányterület (Fázis 2 előfeltétel):** locations, SDS/veszélyesanyag-törzs, PPE-kiadás, munkavédelmi bejárás — **semmi nem létezik** belőlük egyik EHS-fában sem. Kontraktus-javaslat a 3. pontban.

---

## 1. Modulonkénti összefoglaló tábla

| Modul (élő fa) | FSM-lefedettség a tervhez képest | Átmenet-validáció (szerver) | OpenAPI/Swagger | Fő hiányzó endpointok |
|---|---|---|---|---|
| **EHS** — `src/ehs/` | Jó: `Reported→Investigated→CorrectiveActionPlanned→Closed(+Reopened)` ≈ bejelentve→kivizsgalas→intezkedes→lezarva; **hiányzik az `elutasitva`** állapot | **IGEN** — aggregate guard metódusok (`Incident.cs`), teszttel fedve | **IGEN** (`Program.cs`: AddSwaggerGen + `docs/openapi.yaml`) | `POST /{id}/reopen`, `POST /{id}/witnesses`, `GET /summary`, `GET /trends` (query/command kész, route nincs); teljes locations/SDS/PPE/bejárás felület |
| **CRM** — `src/SpaceOS.Modules.CRM/` | Lead: **hiányzik a `Nurturing`** (New→Contacted→Qualified→Opportunity +Disqualified); Opportunity: **teljes egyezés** (Open→NeedsAssessment→SolutionAssembly→Proposal→Negotiation→Won/Lost, +extra Abandoned) | **IGEN** — `CanTransitionTo` switch-map mindkét aggregátumon, `Result.Invalid` illegális átmenetre | **NEM** — nincs `.csproj`/`.sln`/`Program.cs`; 1 db érvénytelen endpoint-töredék (`LeadEndpoints.cs`) | Az ÖSSZES: 22 command / 34 handler kész, HTTP-route nulla (qualify, convert, win, lose, forecast…) |
| **Kontrolling** — `src/spaceos-modules/spaceos-modules-kontrolling/` | EAC + variance + cost adjustment + overhead **teljes**; a terv szerinti projekt-címkék (`draft/active/install/done/on_hold`) a backendben **nem léteznek** (csak a portal `mocks/controlling.ts`-ben) — a terv szerint nem szigorú FSM, de forrás-endpoint kell | Részben n/a (nincs státusz-FSM); domain-validáció erős (Money/Margin VO-k, `ProjectCostCalculation`) | **NEM** — endpoints (`/api/kontrolling/...`) definiálva, host nincs | Projekt-lista + címke endpoint (`GET /api/kontrolling/projects`), host-ba kötés |
| **HR** — `src/hr/` | Absence: **szemantikailag teljes** — `Pending/Approved/Rejected/InProgress/Completed` = kert/jovahagyva/elutasitva/folyamatban/lezarva (+ Rejected→Pending reopen) | **IGEN** — kettős: aggregate guardok (`Absence.cs`) + `AbsenceStatusTransitions` dictionary (utóbbit az aggregate nem hívja — duplikált definíció) | **NEM** — nincs Api réteg, host, Swagger | Az ÖSSZES HR endpoint (absence CRUD + approve/reject/start/complete/reopen, employee, kapacitás-rács, készség-mátrix); Training/Competency/Certification entitás is hiányzik |
| **Maintenance** — `src/maintenance/` | **Teljes** — `Reported/Scheduled/InProgress/Completed/Postponed/Rejected` = mind a 6 terv-állapot; **Asset-státusz SZÁMÍTOTT** (`AssetStatusCalculationService`, nincs tárolt mező) ✔ terv-követelmény teljesül | **IGEN** — aggregate guardok (szigorúbbak, mint a `WorkOrderStatusTransitions` map; eltérés: map engedi `Reported→InProgress`, aggregate nem) | **NEM** — endpoints definiálva (`/api/maintenance/work-orders`, `/assets`), `Map*` sehol nem hívva | `POST /{id}/schedule`, `/postpone`, `/reject`, `/reopen` (csak `/start` + `/complete` van); host-ba kötés |
| **QA** — `src/qa/` | **Jelentős eltérés**: Inspection csak `Planned→InProgress→Completed`; pass/fail külön `InspectionResult` mező; **nincs `javitasra` rework-hurok, nincs `selejt` terminális** — a rework a `Ticket` aggregátumban él (Rejected→Reported loop) | **IGEN** — a legtisztább: aggregate metódusok a `InspectionStatusTransitions`/`TicketStatusTransitions` map-et hívják | **NEM** — endpoints definiálva (`/api/qa/inspections`, `/checkpoints`), host nincs | Teljes `Ticket` (NCR) API hiányzik (assign/start/resolve/reject/reopen command kész, route nulla); host-ba kötés |
| **DMS** — `src/dms/` | **Legnagyobb FSM-eltérés**: `Active/Archived/Deleted` — a terv szerinti `piszkozat→ellenorzes→kiadott→archivalt` életciklus **teljesen hiányzik**; archiválás nem hoz létre új munkapéldányt. Verziózás (`DocumentVersion`) és entitás-link (`EntityLink` + `EntityType`) VAN ✔ | Részleges — archive/delete guardok (`private set`), de nincs kiadási FSM | **NEM** — nincs Api réteg, host, Swagger; Application csak Category+Tag CRUD-ot fed, a `Document` aggregate nincs bekötve | Teljes Document API (upload, verzió, link, lifecycle-átmenetek); draft→review→published FSM |

### Párhuzamos fák (konszolidációs döntést igényel — root)

| Modul | Másodlagos fa | Állapot / eltérés |
|---|---|---|
| CRM | `src/spaceos-modules/spaceos-modules-crm/` | TELJES implementáció endpointokkal (`LeadEndpoints`, `OpportunityEndpoints`), EF migrációval — de az `OpportunityStatus` **eltér a tervtől**: `Draft/Proposal/Negotiation/Converting/Won/Lost/Abandoned` (nincs NeedsAssessment/SolutionAssembly). `LeadState`-ből itt is hiányzik a Nurturing. |
| DMS | `src/spaceos-modules/spaceos-modules-dms/` | Teljes DDD + `DmsEndpoints`, de `DocumentStatus` itt is csak `Active/Archived/Deleted`. |
| HR | `src/spaceos-modules/spaceos-modules-hr/` | Csak `Employee` aggregate, nincs Api; `AbsenceStatus` eltérő számozással. |
| Kontrolling | `src/spaceos-modules/spaceos-modules-kontrolling/` | Ez az EGYETLEN Kontrolling-backend — nem stub, hanem teljes (ld. fenti tábla). |
| EHS | `src/spaceos-modules-ehs/` | Ld. 2. pont. |

---

## 2. EHS mélymerülés

### 2.1 Melyik az élő EHS?

**Verdikt: `src/ehs/` az élő platform-modul.** Indoklás:

- Namespace `SpaceOS.Modules.Ehs.*`, kernel-referenciával (`SpaceOS.Kernel.Domain.Primitives` — AggregateRoot/domain-event minta), EF Core migrációval (`20260708140947_InitialEhsSchema`), futtatható `Program.cs` host Swagger-rel, és dokumentált `docs/openapi.yaml`.
- Az Incident FSM-je pontosan a terv 5. pontjának EHS-FSM-jét implementálja (CAPA-val).
- A `src/spaceos-modules-ehs/` **más célú, korábbi bounded context**: offline-first mobil esemény-befogadó (event sourcing `EhsEvent` append-only táblával, S3 presigned-URL fotófeltöltés, JWT) — a `docs/knowledge/patterns/OFFLINE_FIRST_WIZARD_PATTERN.md`-hez tartozó vonal. Route-ütközés: mindkettő `/api/ehs/*` prefixet használ (`/api/ehs/events`, `/api/ehs/risk-assessments` ↔ `src/ehs` ugyanígy). **Nem dobható el** (a mobil incidens-bejelentés értékes), de a Fázis 2 portál-kontraktus a `src/ehs`-re épüljön; az event-ingest API-t külön prefix alá (`/api/ehs/mobile/events`) vagy adapterként a `src/ehs` mögé kell terelni.
- ⚠️ Build-blocker: a `src/ehs/src/Domain/SpaceOS.Modules.Ehs.Domain.csproj` kernel-referenciája (`../../../backend/spaceos-kernel/...`) **ebben a repóban nem oldódik fel** (`backend/` nincs, `src/spaceos-kernel` üres/inicializálatlan submodule).

### 2.2 Meglévő EHS-felület (`src/ehs`)

- **Incident** (`/api/ehs/incidents`): create, get, list, `start-investigation`, `add-findings`, `add-corrective-action`, `close`. FSM-guardok az aggregátumban, domain-tesztekkel.
- **RiskAssessment** (`/api/ehs/risk-assessments`): create, get, list, `risk-matrix`, `add-control`. `RiskStatus: Active/Archived`.
- **TrainingRecord** (`/api/ehs/training-records`): create, get, `expiring`. `TrainingStatus: Valid/Expiring/Expired` (számított).
- **Drift a `docs/openapi.yaml` és a kód között:** a yaml `investigate`/`corrective-actions`/`reopen`/`witnesses`/`summary`/`trends`/`archive`/`renew` route-okat dokumentál, amelyekből több NINCS mappelve a kódban (a `ReopenIncidentCommand`, `AddWitnessCommand`, `GetIncidentSummaryQuery`, `GetIncidentTrendsQuery` kész, csak route hiányzik), és a mappelt route-nevek is eltérnek (`start-investigation` vs. `investigate`).
- **Terv-eltérés:** az `IncidentStatus`-ból hiányzik az `elutasitva` (Rejected) — a terv `bejelentve → kivizsgalas → intezkedes → lezarva (+elutasitva)` készletet ír elő. Javaslat: `Rejected = 6` + `Incident.Reject(reason)` guard (csak `Reported`-ból) + `POST /{id}/reject`.
- **Location ma szabad szöveg** az Incidenten (`string Location`) — a portal `mocks/ehs.ts` is így mockolja ("Vác — főüzem / A csarnok"). Ez a locations-endpoint mock-TODO gyökere.

### 2.3 Hiányzó területek — KONTRAKTUS-JAVASLAT

Stílus-konvenció (a meglévő incident-mintát követi): aggregate + `private set` státusz + guard metódusok + domain event; minimal API `MapGroup("/api/ehs/...")` + `WithOpenApi()`; tenant a `ITenantContext`-ből; számított státuszok a `TrainingStatus`-mintára.

#### A) Locations (telephely/zóna törzs) — nem FSM, törzsadat

```
EhsLocation (aggregate)
  LocationId: Guid
  TenantId: Guid
  Code: string                 // pl. "VAC-A"
  Name: string                 // "Vác — főüzem / A csarnok"
  ParentLocationId: Guid?      // hierarchia: Site → Building/Hall → Zone
  Kind: LocationKind           // enum: Site=1, Building=2, Hall=3, Zone=4, Outdoor=5
  IsActive: bool
  CreatedAt: DateTimeOffset
```

| Endpoint | Leírás |
|---|---|
| `GET  /api/ehs/locations?activeOnly=&kind=` | lapos lista + `parentLocationId`-ból kliens-oldali fa |
| `GET  /api/ehs/locations/{id}` | részlet |
| `POST /api/ehs/locations` | létrehozás |
| `PUT  /api/ehs/locations/{id}` | átnevezés/áthelyezés |
| `POST /api/ehs/locations/{id}/deactivate` | soft-inaktiválás (törlés helyett; guard: aktív gyerek nem lehet) |

Kapcsolódó migráció: `Incident.Location: string` → `LocationId: Guid` + opcionális `LocationDetail: string` (átmenetileg mindkettő; a create-endpoint mindkét alakot fogadja).

#### B) SDS / veszélyesanyag-törzs

```
HazardousMaterial (aggregate)
  MaterialId: Guid
  TenantId: Guid
  Name: string
  Supplier: string
  CasNumber: string?
  GhsHazardClasses: List<string>     // GHS piktogram-kódok, pl. "GHS02"
  StorageLocationId: Guid            // → EhsLocation
  QuantityOnSite: decimal + Unit: string
  SdsDocumentId: Guid?               // → DMS dokumentum-link (EntityType bővítés!)
  SdsIssuedAt / SdsExpiresAt: DateTimeOffset
  Status: MaterialStatus             // enum: Active=1, Archived=2 (RiskStatus-minta)
  SdsValidity: SdsValidity           // SZÁMÍTOTT: Valid / Expiring (≤30 nap) / Expired (TrainingStatus-minta)
```

FSM: törzs-életciklus `Active → Archived` (guard: `Archive()` csak Active-ból); az SDS-érvényesség számított, nem tárolt.

| Endpoint | Leírás |
|---|---|
| `POST /api/ehs/hazardous-materials` | felvétel |
| `GET  /api/ehs/hazardous-materials?status=&locationId=&validity=` | lista/szűrés |
| `GET  /api/ehs/hazardous-materials/{id}` | részlet |
| `PUT  /api/ehs/hazardous-materials/{id}` | törzsadat-módosítás |
| `POST /api/ehs/hazardous-materials/{id}/renew-sds` | új SDS-verzió (SdsDocumentId + új lejárat; `RenewTrainingRecord`-minta) |
| `POST /api/ehs/hazardous-materials/{id}/archive` | kivezetés |
| `GET  /api/ehs/hazardous-materials/expiring` | lejáró SDS-ek (dashboard) |

#### C) PPE-kiadás (EVE) dolgozónként

```
PpeItem (törzs)                          PpeIssuance (aggregate, FSM)
  PpeItemId: Guid                          IssuanceId: Guid
  TenantId: Guid                           TenantId: Guid
  Name: string                             EmployeeId: Guid        // → HR Employee
  Category: PpeCategory                    PpeItemId: Guid
    // Head=1, Eye=2, Hearing=3,           IssuedAt / IssuedBy
    // Respiratory=4, Hand=5, Foot=6,      Quantity: int
    // Body=7, Fall=8                      ExpiresAt: DateTimeOffset?  // DefaultLifetimeMonths-ból
  StandardRef: string   // pl. "EN 388"    Status: PpeIssuanceStatus
  DefaultLifetimeMonths: int?              AcknowledgedAt / ReturnedAt: DateTimeOffset?
  IsActive: bool
```

FSM `PpeIssuanceStatus` (magyar terv-nevek ↔ enum):
`kiadva(Issued=1) → atvett(Acknowledged=2) → visszavett(Returned=3) | cserelve(Replaced=4)`; a `lejart` állapot SZÁMÍTOTT (`ExpiresAt` alapján, TrainingStatus-minta). Guardok: `Acknowledge()` csak Issued-ból; `Return()`/`Replace()` csak Acknowledged-ból; `Replace()` új Issuance-t hoz létre és domain eventet emittál.

| Endpoint | Leírás |
|---|---|
| `POST/GET/PUT /api/ehs/ppe-items[...]` + `POST /{id}/deactivate` | EVE-törzs CRUD |
| `POST /api/ehs/ppe-issuances` | kiadás rögzítése |
| `GET  /api/ehs/ppe-issuances?employeeId=&status=&expiring=` | lista |
| `POST /api/ehs/ppe-issuances/{id}/acknowledge` | dolgozói átvétel |
| `POST /api/ehs/ppe-issuances/{id}/return` | visszavétel |
| `POST /api/ehs/ppe-issuances/{id}/replace` | csere (új kiadást generál) |
| `GET  /api/ehs/ppe-issuances/by-employee/{employeeId}` | dolgozói EVE-lap (portal nézet) |
| `GET  /api/ehs/ppe-issuances/expiring` | lejáró tételek (dashboard) |

#### D) Munkavédelmi bejárás (safety walk) → CAPA

```
SafetyWalk (aggregate, FSM)                SafetyWalkFinding (child entity)
  SafetyWalkId: Guid                         FindingId: Guid
  TenantId: Guid                             Description: string
  LocationId: Guid          // → EhsLocation Severity: Severity        // meglévő enum újrahasznosítva
  ScheduledDate: DateTimeOffset              PhotoS3Key: string?       // mobil-vonal integráció
  ConductedBy: Guid                          RequiresAction: bool
  Participants: List<Guid>                   CorrectiveActionId: Guid? // → CAPA
  Status: SafetyWalkStatus                   LinkedRiskAssessmentId: Guid?
  CompletedAt / ClosedAt: DateTimeOffset?
```

FSM `SafetyWalkStatus` (incident-FSM stílus):
`utemezett(Scheduled=1) → folyamatban(InProgress=2) → intezkedes(ActionRequired=3) → lezart(Closed=4)` + `elmaradt(Cancelled=5)`.
Guardok: `Start()` csak Scheduled-ból; `AddFinding()` csak InProgress-ben; `Complete()` InProgress→ActionRequired ha van `RequiresAction` finding, különben közvetlen Closed; `Close()` csak ha minden kapcsolt CorrectiveAction lezárt; `Cancel()` csak Scheduled-ból.
**CAPA-egységesítés:** a meglévő `CorrectiveAction` (IncidentAggregate) emelendő közös CAPA-fogalommá `Source: CapaSource { Incident=1, SafetyWalk=2, RiskAssessment=3 }` mezővel — így a portal egyetlen CAPA-boardot kap.

| Endpoint | Leírás |
|---|---|
| `POST /api/ehs/safety-walks` | ütemezés |
| `GET  /api/ehs/safety-walks?locationId=&status=` | lista |
| `GET  /api/ehs/safety-walks/{id}` | részlet (findings-szel) |
| `POST /api/ehs/safety-walks/{id}/start` | Scheduled→InProgress |
| `POST /api/ehs/safety-walks/{id}/findings` | megállapítás rögzítése (+ opcionális CAPA-generálás) |
| `POST /api/ehs/safety-walks/{id}/complete` | InProgress→ActionRequired/Closed |
| `POST /api/ehs/safety-walks/{id}/close` | ActionRequired→Closed (guard: minden CAPA kész) |
| `POST /api/ehs/safety-walks/{id}/cancel` | Scheduled→Cancelled |
| `GET  /api/ehs/corrective-actions?status=&assignedTo=&source=` | egységes CAPA-lista |
| `POST /api/ehs/corrective-actions/{id}/complete` | CAPA lezárás |

---

## 3. Gap-lista — a frontend Fázis 2 sorrend szerint (mi mit blokkol)

### 0. Platform-szintű (minden modult blokkol)
- **G0.1** Nincs modul-host: a kernel/orchestrator hiányzik a repóból (`src/spaceos-kernel` üres submodule), a `Map*Endpoints()` hívások sehol nem futnak → nincs szervírozott OpenAPI → **Orval codegen blokkolva** minden modulra. Első lépés: közös `WebApplication` host (vagy kernel-submodule init) Swagger-rel, amely az összes modul endpoint-extension-jét mappeli.
- **G0.2** Kettős implementációk (CRM×2+töredék, DMS×2, HR×2, EHS×2) — root-döntés kell a kanonikus fáról, különben a kontraktus kettéágazik.

### 1. EHS (Fázis 2 #1 — backend-előfeltétel a frontendhez)
- **G1.1** Locations-kontraktus (2.3/A) — a portal EhsPage mock-locations TODO-jának közvetlen feloldása. **Blokkoló.**
- **G1.2** SDS/veszélyesanyag-törzs (2.3/B) — nyitott scope a tervben. **Blokkoló.**
- **G1.3** PPE-kiadás (2.3/C). **Blokkoló.**
- **G1.4** Safety-walk + egységes CAPA (2.3/D). **Blokkoló.**
- **G1.5** `IncidentStatus`-ba `Rejected` (elutasitva) + `POST /{id}/reject` — terv-konformitás.
- **G1.6** Hiányzó route-ok a kész command/query-khez: `reopen`, `witnesses`, `summary`, `trends`; `docs/openapi.yaml` ↔ kód route-drift rendezése.
- **G1.7** Kernel-csproj hivatkozás javítása (`../../../backend/spaceos-kernel` nem oldódik fel) — enélkül a `src/ehs` nem buildel ebben a repóban.
- **G1.8** `src/spaceos-modules-ehs` route-ütközés (`/api/ehs/*`) feloldása (külön prefix vagy adapter).

### 2. CRM
- **G2.1** Kanonikus fa kijelölése: `SpaceOS.Modules.CRM` FSM-je terv-konform, de nem buildelhető (nincs csproj/host); `spaceos-modules-crm` futóképesebb, de az `OpportunityStatus`-a eltér a tervtől (nincs `NeedsAssessment`/`SolutionAssembly`).
- **G2.2** `Nurturing` állapot hiányzik a Lead FSM-ből **mindkét** fában — enum + guard + `POST /{id}/nurture` endpoint kell.
- **G2.3** Transition-endpointok hiánya (`qualify`, `convert`, `send-proposal`, `win`, `lose` …) — a kanban-UI ezek nélkül nem tud validált átmenetet hívni.

### 3. Kontrolling
- **G3.1** Projekt-címke forrás-endpoint (`GET /api/kontrolling/projects` státusszal: `draft/active/install/done/on_hold`) — ma csak a portal-mockban létezik; a backend a projektet külső entitásként kezeli (`IIntegrationDataProvider`). Döntés: melyik modul a projekt-státusz gazdája.
- **G3.2** Host-ba kötés + Swagger (a `/api/kontrolling/*` felület egyébként kész: EAC, variance, cost-adjustments, overhead-config).

### 4. HR
- **G4.1** NINCS API-réteg — a legnagyobb egymodulos gap: absence CRUD + `approve/reject/start/complete/reopen` transition-endpointok kellenek (a domain + FSM + teszt kész és terv-konform).
- **G4.2** Kapacitás-rács endpoint (`CapacityCalculationService` létezik, route nincs) és készség-mátrix (`Skill/SkillKey/SkillLevel` alap megvan).
- **G4.3** Training/Competency/Certification entitások hiányoznak (CLAUDE.md szerinti HR-scope) — az EHS `TrainingRecord` részben átfed, gazda-döntés kell.
- **G4.4** `AbsenceStatusTransitions` map ↔ aggregate guard duplikáció egyesítése (QA-minta: aggregate hívja a map-et).

### 5. Maintenance
- **G5.1** Hiányzó transition-endpointok: `schedule`, `postpone`, `reject`, `reopen` (csak `start`/`complete` van) — a munkalap-FSM UI enélkül csonka.
- **G5.2** FSM-map ↔ aggregate eltérés (`Reported→InProgress` a mapben engedett, a `StartWork()` tiltja) — egységesítés + a hibás `"Planned → InProgress"` endpoint-summary javítása.
- **G5.3** Host-ba kötés (endpoints készek, sehol nem mappelve).

### 6. QA
- **G6.1** Inspection FSM ↔ terv eltérés: nincs `javitasra` rework-hurok és `selejt` terminális. Döntés kell: (a) enum-bővítés (`Rework`, `Scrapped`) VAGY (b) a portal a `Status×Result` kombinációt képezi le és a rework a Ticket-FSM-en fut (a backend ma ezt támogatja). Javasolt: (b) rövid táv + ADR.
- **G6.2** `Ticket` (NCR) aggregátumnak NINCS endpointja (assign/start/resolve/reject/reopen command kész) — az NCR-képernyő blokkolva.
- **G6.3** Host-ba kötés.

### 7. DMS
- **G7.1** Dokumentum-életciklus FSM hiányzik: `Active/Archived/Deleted` helyett/mellett `Draft→Review→Published→Archived` kell, archiváláskor új munkapéldány-ág. Ez a terv-FSM-ek közül a legnagyobb domain-munka.
- **G7.2** A `Document` aggregate nincs bekötve az Application/API rétegbe (csak Category+Tag CRUD van) — teljes Document API kell (upload, verziók, entitás-linkek: a domain-alap — `DocumentVersion`, `EntityLink` — kész).
- **G7.3** Host-ba kötés + Swagger.

---

## 4. Melléklet — kulcsfájlok

| Modul | FSM/enum | Guard | API |
|---|---|---|---|
| EHS | `src/ehs/src/Domain/Enums/IncidentStatus.cs` | `src/ehs/src/Domain/Aggregates/IncidentAggregate/Incident.cs` | `src/ehs/src/Api/Endpoints/*.cs`, `src/ehs/docs/openapi.yaml` |
| CRM | `src/SpaceOS.Modules.CRM/src/Lead.Domain/Enums/{LeadStatus,OpportunityStatus}.cs` | `Lead.cs` / `Opportunity.cs` `CanTransitionTo` | `src/Lead.Api/Endpoints/LeadEndpoints.cs` (töredék) |
| Kontrolling | `src/spaceos-modules/spaceos-modules-kontrolling/src/Domain/Enums/*.cs` | `Domain/Aggregates/ProjectCostCalculation.cs` | `src/Api/Endpoints/KontrollingEndpoints.cs` |
| HR | `src/hr/src/Domain/Enums/AbsenceStatus.cs`, `Domain/FSM/AbsenceStatusTransitions.cs` | `Domain/Aggregates/Absence.cs` | — (nincs) |
| Maintenance | `src/maintenance/src/Domain/Enums/{WorkOrderStatus,AssetStatus}.cs`, `Domain/FSM/WorkOrderStatusTransitions.cs` | `Domain/Aggregates/WorkOrder.cs`, `Domain/Services/AssetStatusCalculationService.cs` | `src/Api/Endpoints/{WorkOrder,Asset}Endpoints.cs` |
| QA | `src/qa/src/Domain/Enums/{InspectionStatus,InspectionResult,TicketStatus}.cs`, `Domain/FSM/*.cs` | `Domain/Aggregates/{Inspection,Ticket}.cs` | `src/Api/Endpoints/{Inspection,QACheckpoint}Endpoints.cs` |
| DMS | `src/dms/src/Domain/Enums/DocumentStatus.cs` | `Domain/Aggregates/Document/Document.cs` | — (nincs) |

---

_Backend terminál — JoineryTech sziget. Kérdés/eszkaláció: Nexus mailbox → conductor/root._
