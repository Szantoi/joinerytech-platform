# SpaceOS.Modules.Ehs — EHS (Munkavédelem / ISO 45001) modul

Clean Architecture .NET 8 modul: **Api → Application → Domain ← Infrastructure**.
Ez a JoineryTech platform kanonikus, futtatható EHS backendje (Swagger + `docs/openapi.yaml`).

## Felépítés

```
src/
  Domain/          — aggregátumok, enumok, domain eventek (FSM-őrzés ITT él)
  Application/     — CQRS: command/query + handler + FluentValidation validator
  Infrastructure/  — EF Core (PostgreSQL, "ehs" séma), repository-k, migrációk
  Api/             — minimal API endpointok, Swagger, tenant-kontextus
tests/
  *.cs                    — domain unit tesztek (FSM-ek, számított státuszok)
  Infrastructure.Tests/   — Testcontainers-alapú Postgres integrációs tesztek (Docker kell)
docs/openapi.yaml  — teljes API-kontraktus (Orval codegen forrás)
```

**Kernel-függés:** a Domain a `src/spaceos-kernel` submodule
`SpaceOS.Kernel.Domain` projektjére hivatkozik (AggregateRoot, IDomainEvent).
Klónozás után: `git submodule update --init src/spaceos-kernel`
(HTTPS URL-lel: `git config submodule.src/spaceos-kernel.url https://github.com/Szantoi/spaceos-kernel.git`).

**Konfiguráció:** minden connection string configból jön —
`ConnectionStrings:EhsDatabase` (lásd `EhsServiceCollectionExtensions`).
Tenant-izoláció: `ITenantContext` + PostgreSQL RLS interceptor.

## Entitások és FSM-ek

### Incident (meglévő)
`Reported → Investigated → CorrectiveActionPlanned → Closed → Reopened` — guard metódusok az aggregátumban.

### RiskAssessment — 5×5 kockázati mátrix *(kibővítve, RISKS-5X5-BE)*
- Pontszám: `RiskScore = Severity × Likelihood` (1-25); a sáv (`Low/Medium/High/Critical`)
  **KONFIGURÁLHATÓ határokkal** számítódik — `Ehs:RiskMatrix:Bands` szekció
  (`LowMax/MediumMax/HighMax`, default 4/9/16; hiányzó kulcsnál a domain-default él,
  érvénytelen configra induláskor hibázik).
- FSM: **`Draft (vazlat) → UnderReview (felulvizsgalat) → Approved (jovahagyva) → Archived (archivalva)`**,
  + `UnderReview → Draft` (return-to-draft). Részletek csak Draft-ban módosíthatók; illegális átmenet = 409.
- Opcionális `LocationId` (EhsLocation-referencia, tenant-en belül létezés-guard → 409).
- Intézkedés: `AddControl` + opcionális CAPA-spawn az **egységes CAPA**-mechanizmuson
  (`Source=RiskAssessment`, a control `CorrectiveActionId`-vel linkel — safety walk finding minta).
- Mátrix-összesítő: `GET /risk-assessments/risk-matrix` — mind a 25 cella darabszámmal
  (a cellaaggregáció domain-logika: `RiskMatrix.BuildCells`).

### TrainingRecord (meglévő)
Tréning-lejárat **számított** (`Valid/Expiring/Expired`).

### EhsLocation — hierarchikus telephely-törzs *(új, Fázis 2)*
- `Site → Building/Hall → Zone` fa a `ParentLocationId`-n keresztül (lapos lista + kliens-oldali fa).
- Nem FSM: törzsadat soft-deaktiválással. Guard: aktív gyerekkel rendelkező node nem deaktiválható;
  node nem lehet saját szülője; inaktív node nem módosítható.
- Ez oldja fel a portal EhsPage **mock-locations TODO**-ját.

### HazardousMaterial — SDS/veszélyesanyag-törzs *(új)*
- Életciklus: `Active → Archived` (guard: csak Active-ból).
- **SDS-érvényesség SZÁMÍTOTT** (`SdsValidity`): `Valid` (>30 nap), `Expiring` (≤30 nap), `Expired` —
  soha nincs tárolva (TrainingStatus-minta, `HazardousMaterial.CheckSdsValidity`).
- `RenewSds` = új SDS-verzió (új kiadás/lejárat + opcionális DMS-dokumentum link).

### PpeItem + PpeIssuance — EVE-kiadás *(új)*
- `PpeItem`: EVE-katalógus (kategória, szabvány pl. "EN 388", default élettartam hónapban).
- `PpeIssuance` FSM: **`Issued (kiadva) → Acknowledged (atvett) → Returned (visszavett) | Replaced (cserelve)`**
  - guardok: `Acknowledge()` csak Issued-ból; `Return()`/`Replace()` csak Acknowledged-ból;
  - `Replace()` új Issuance-t generál (Issued státuszban) és `PpeReplacedEvent`-et emittál;
  - a `lejart` állapot **számított** (`IsExpired`, `ExpiresAt` alapján), a lejárati dátum
    default a katalógus `DefaultLifetimeMonths`-ából származik.
- Kiadás mindig `EmployeeId`-hoz kötött (HR-integráció).

### SafetyWalk — munkavédelmi bejárás *(új)*
- FSM: **`Scheduled (utemezett) → InProgress (folyamatban) → ActionRequired (intezkedes) → Closed (lezart)`**, + `Cancelled (elmaradt)` Scheduled-ból.
- Findings csak `InProgress`-ben rögzíthetők; `Complete()` automatikusan `Closed`-ba visz,
  ha nincs intézkedést igénylő megállapítás.
- `Close()` guard: minden kapcsolt CAPA lezárt (a handler a CAPA-repositoryból ellenőrzi
  és paraméterként adja át a domain guardnak).

### CorrectiveAction — EGYSÉGES CAPA *(refaktorált)*
- Az Incident-hez tartozó owned entity **közös CAPA-fogalommá lépett elő**:
  `Source: CapaSource { Incident, SafetyWalk, RiskAssessment }` + `SourceId` + `TenantId`.
- Egy táblában (`ehs.corrective_actions`) él minden CAPA → a portal **egyetlen CAPA-boardot** kap.
- Incident-oldali viselkedés változatlan (`Incident.AddCorrectiveAction` → `Source=Incident`);
  a safety walk finding CAPA-t a `POST /safety-walks/{id}/findings` opcionális CAPA-mezői hozzák létre.
- Migráció (`EhsPhase2LocationsSdsPpeSafetyWalks`) **adatmegőrző**: rename + backfill,
  nem drop/create.

## Endpoint-felület (Fázis 2 kiegészítés)

| Terület | Route-ok |
|---|---|
| Locations | `GET/POST /api/ehs/locations`, `GET/PUT /{id}`, `POST /{id}/deactivate` |
| SDS-törzs | `GET/POST /api/ehs/hazardous-materials`, `GET /expiring`, `GET/PUT /{id}`, `POST /{id}/renew-sds`, `POST /{id}/archive` |
| EVE-katalógus | `GET/POST /api/ehs/ppe-items`, `GET/PUT /{id}`, `POST /{id}/deactivate` |
| EVE-kiadás | `GET/POST /api/ehs/ppe-issuances`, `GET /expiring`, `GET /by-employee/{employeeId}`, `GET /{id}`, `POST /{id}/acknowledge`, `POST /{id}/return`, `POST /{id}/replace` |
| Bejárás | `GET/POST /api/ehs/safety-walks`, `GET /{id}`, `POST /{id}/start`, `POST /{id}/findings`, `POST /{id}/complete`, `POST /{id}/close`, `POST /{id}/cancel` |
| Egységes CAPA | `GET /api/ehs/corrective-actions`, `POST /{id}/complete` |
| Kockázatok (5×5) | `GET/POST /api/ehs/risk-assessments`, `GET /risk-matrix`, `GET/PUT /{id}`, `POST /{id}/submit-for-review`, `POST /{id}/approve`, `POST /{id}/return-to-draft`, `POST /{id}/archive`, `POST /{id}/add-control` |

**Hibakontraktus az új endpointokon:**
- `404` — az erőforrás nem található (handler `KeyNotFoundException`)
- `409 Conflict` — illegális FSM-átmenet / domain guard sértés (`InvalidOperationException`, a hibaüzenettel)
- `400` — validációs hiba (`ArgumentException` / FluentValidation)

A teljes kontraktus: `docs/openapi.yaml` (49 path). A futó Swagger UI a `src/Api` hosztból jön
(`dotnet run --project src/Api`). Az enumok a dróton **stringként** utaznak
(`JsonStringEnumConverter` a Programban — az openapi.yaml string-enumjaival összhangban).

## Build, teszt, migráció

```bash
# build (kernel submodule inicializálás után)
dotnet build src/Api/SpaceOS.Modules.Ehs.Api.csproj

# domain unit tesztek (FSM-ek + számított státuszok) — nem igényel DB-t
dotnet test tests/SpaceOS.Modules.Ehs.Domain.Tests.csproj

# integrációs tesztek — futó Docker kell (Testcontainers, postgres:16-alpine)
dotnet test tests/Infrastructure.Tests/SpaceOS.Modules.Ehs.Infrastructure.Tests.csproj

# migráció alkalmazása
dotnet ef database update --project src/Infrastructure
```

Migrációk: `20260708140947_InitialEhsSchema`, `20260714184914_EhsPhase2LocationsSdsPpeSafetyWalks`
(utóbbi kézzel igazított, adatmegőrző CAPA-promócióval — lásd a fájl kommentjeit),
`20260715204959_RiskAssessment5x5Fsm` (location_id + FSM-időbélyegek + CAPA-link;
kézi, adatmegőrző státusz-remap: `Active` → `Approved`, reverzibilis Down).
