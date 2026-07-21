# WORLDS API CONTRACTS — Production + Warehouse backend kontraktus-audit (2026-07-18)

> **Task:** WORLDS-API-AUDIT (EPIC-UI-WORLDS-2026Q3) · **Szerep:** backend · **Forrás:** lokális submodule-checkoutok
> **Cél:** a portál `src/modules/production` és `src/modules/warehouse` zod-sémái + fetcherei + FSM-tükrei
> ebből a doksiból KÉRDÉS NÉLKÜL megírhatók legyenek (API-first, Gábor-döntés 2026-07-18).

| Világ | Backend | Submodule | VPS-port | Élő állapot (2026-07-18 szúrópróba) |
|---|---|---|---|---|
| production | cutting | `src/spaceos-modules-cutting` | 5005 | ✅ fut (`/healthz` 200, védett route 401) |
| production | joinery | `src/spaceos-modules-joinery` | 5002 | ✅ fut (`/health` 200, védett route 401) |
| warehouse | inventory | `src/spaceos-modules-inventory` | 5004 | ✅ fut (`/health` 200) — ⚠ `GET /api/inventory/offcuts` **500 AmbiguousMatch** |
| warehouse | procurement | `src/spaceos-modules-procurement` | 5006 | ✅ fut (`/healthz` 200, védett route 401) |

Minden service **127.0.0.1**-re bindel a VPS-en (localhost-only), systemd unitok:
`spaceos-cutting-svc`, `spaceos-joinery`, `spaceos-inventory`, `spaceos-procurement`.

---

## 0. Közös wire-alapszabályok (MIND A 4 MODUL)

Egyik API-host sem konfigurál egyedi JSON-opciókat (`ConfigureHttpJsonOptions` / `AddJsonOptions` /
`JsonStringEnumConverter` **sehol nincs regisztrálva** a 4 modulban — repo-szintű grep). Ezért a
System.Text.Json **Web-default** érvényes:

- **Property-kulcsok: camelCase** a dróton (C# `ProjectId` → `projectId`).
- **Enum-typed DTO-mező → SZÁM** (int ordinal) a dróton. Ahol a DTO `string`-ként hordozza a
  státuszt (`.ToString()` a handlerben), ott **angol PascalCase string**.
- `Guid` → string (UUID) · `DateOnly` → `"yyyy-MM-dd"` · `DateTime`/`DateTimeOffset` → ISO-8601 ·
  `decimal` → szám · `TimeSpan` → `"hh:mm:ss"`.

> ⚠ **ADR-059 gap (wave 2 — EnumWireMap):** a wire-enum ma **mindenhol angol** (string-mezőknél
> PascalCase név, enum-mezőknél szám). Az elfogadott ADR-059 szerint a kanonikus wire-kulcs
> **magyar** lesz `EnumWireMap`-pel a backend-varraton. A lenti enum-táblák a **MAI** wire-alakot
> rögzítik; a zod-sémákat úgy érdemes írni, hogy az enum-szótár egy helyen cserélhető legyen
> (const map, ne inline literál).

**Auth-összkép (mai állapot):** mind a 4 host JwtBearer-t használ (Keycloak), a tenant a **JWT
claimből** jön (`tid` ill. `tenant_id`) — tehát ez a 4 modul **nem** a JT-modulok hibás
`X-Tenant-Id`-header mintáját követi (vö. ADR-061). Részletek: modulonkénti auth-alszekciók
(x.6) + összegzés az 5. szekcióban.

---

## 1. CUTTING — production világ (port 5005)

**Host:** `src/spaceos-modules-cutting/src/SpaceOS.Modules.Cutting.Api/Program.cs` · minimal API.
**Health:** `GET /healthz` → 200 `Healthy` (anonim). Nincs Swagger. Globális hibakezelő:
`GET /api/cutting/error` → 500 Problem. **SignalR:** `/hubs/execution` hub (auth-os;
`JoinExecution(executionId)` / `LeaveExecution`; csoportnév `{tenantId}:{executionId}`).
Rate-limit: `POST /api/public/cutting/quote-request` 50 req/óra → 429 `{error, retryAfter}`.
CORS `PublicCutting`: localhost:3000/5173 + datahaven.joinerytech.hu.

Ardalis.Result→HTTP: Ok→200/201 · Invalid→400 vagy **422** (végpontonként eltér!) ·
NotFound→404 · Conflict→409.

### 1.1 Route-térkép — portál-felület

**`/api/cutting` mag** (`Endpoints/CuttingEndpoints.cs`, ManufacturerOnly, tenant=`tid`):

| Verb | URL | Request | Válasz | Hibák |
|---|---|---|---|---|
| POST | `/api/cutting/sheets` | `SubmitSheetRequest` | 200 `{id: Guid}` | 400, 401 |
| GET | `/api/cutting/sheets/{id}/nesting` | — | 200 `NestingResultResponse` | 404 |
| GET | `/api/cutting/sheets/{id}/status` | — | 200 `ExecutionStatusResponse` | 404 |
| GET | `/api/cutting/waste` | `?from=&to=` (default: utolsó hónap) | 200 `WasteReportResponse` | 400 |
| GET | `/api/cutting/plans` | — (⚠ NINCS query-filter!) | 200 `[{id, name, date:"yyyy-MM-dd", status: string}]` | — |
| POST | `/api/cutting/plans` | `CreatePlanRequest` | 201 `{id, name, date, status:"Draft"}` | 400, 401, **409** (duplikált dátum) |
| GET | `/api/cutting/plans/{date}` | date=yyyy-MM-dd | 200 `DailyCuttingPlanResponse` | 400, 404 |

**`/api/cutting/planning` tervezés** (`CuttingPlanningEndpoints.cs`, ManufacturerOnly, tenant=`tid`):

| Verb | URL | Request | Válasz | Hibák |
|---|---|---|---|---|
| POST | `/api/cutting/planning/` | `CreateCuttingPlanRequest` | 201 `CreateCuttingPlanResponse` | 400, 401 |
| GET | `/api/cutting/planning/` | — | 200 `CuttingPlanSummaryResponse[]` | — |
| GET | `/api/cutting/planning/{planId}` | — | 200 `CuttingPlanResponse` | 404 |
| PUT | `/api/cutting/planning/{planId}` | `{status: string}` (draft/published/approved/frozen/inprogress/closed, case-insens. — ⚠ FSM-bypass, Obsolete `UpdateStatus`) | 200 `{planId, status}` | 400, 404 |
| GET | `/api/cutting/planning/{planId}/daily/{date}` | — | 200 `DailyPlanResponse` | 400, 404 |
| PUT | `/api/cutting/planning/jobs/{jobId}/complete` | `CompleteJobRequest` | 200 `{jobId, status:"Cut"}` | 400, 404, 401 |
| POST | `/api/cutting/planning/{planId}/publish` | `{profileSnapshotId: Guid}` | 200 `{planId, status:"Published"}` | 400, 404 |
| POST | `/api/cutting/planning/{planId}/freeze` | — | 200 `{planId, status:"Frozen"}` | 400, 404 |
| POST | `/api/cutting/planning/{planId}/close` | — | 200 `{planId, status:"Closed"}` | 400, 404 |
| POST | `/api/cutting/planning/{planId}/reserve-panels` | — | 200 `{planId, reservedCount}` | 400, 404, 401 |
| GET/POST | `/api/cutting/priority-profiles/` | `CreatePriorityProfileRequest` | 200 lista / 201 `{id}` | 400, 401 |
| POST | **`/cutting/api/plans/{date}/assign-batch`** ⚠ eltérő prefix! | `AssignBatchRequest` | 200 `{executionId, status}` | 400, 409, 404, 401 — **+ role: `machine_operator` v. `production_manager`** |

⚠ **Prefix-inkonzisztencia:** az assign-batch a `/cutting/api/plans/...` prefixen él (nginx-proxy
nem-stripelő feltételezés), minden más `/api/cutting/...` (stripelő feltételezés) — a kettő
egyszerre nem lehet igaz a proxy mögött. Élesítés előtt tisztázandó (follow-up).

**`/api/cutting/executions` végrehajtás** (`CuttingExecutionEndpoints.cs`, ManufacturerOnly,
tenant=`tid` VAGY `tenant_id`; Invalid→**422**):

| Verb | URL | Request | Válasz |
|---|---|---|---|
| POST | `/executions/` | `ScheduleExecutionRequest` | 201 `{id}` · 422/401/500 |
| POST | `/executions/{id}/start` | `StartExecutionRequest` | 200 · 404/422/409/401 |
| POST | `/executions/{id}/progress` | `RecordProgressRequest` | 200 · 404/422/409/401 |
| POST | `/executions/{id}/offcut` | `{materialId: Guid, widthMm, heightMm: decimal}` | 200 |
| POST | `/executions/{id}/complete` | `CompleteExecutionRequest` | 200 · 404/422/409 |
| POST | `/executions/{id}/cancel` | `{reason: int}` (CancelReason SZÁM!) | 200 |
| POST | `/executions/{id}/milestones/evaluate` | — | 200 |
| POST | `/executions/{id}/consent/withdraw` | `{workerId: Guid, scope: int}` | 200 `{withdrawalId}` |
| GET | `/executions/` · `/{id}` · `/{id}/progress` · `/{id}/milestones` · `/{id}/proof` · `/{id}/consent?workerId=` | — | 200 (DTO-k lent) · 404/401 |

**Árajánlat** (`QuoteRequestEndpoints.cs`; tenant=`tenant_id` claim, user=`sub`):

| Verb | URL | Auth | Request → Válasz |
|---|---|---|---|
| POST | `/api/public/cutting/quote-request` | **anonim** + rate-limit | `PublicQuoteRequestDto` → 201 `PublicQuoteResponseDto` · 400/ValidationProblem |
| POST | `/public/cutting/quote-request` | anonim (tenant szubdomainből!) | `CreateQuoteRequestDto` → 200 `QuoteRequestResponseDto` · 404 (ismeretlen szubdomain) |
| GET | `/public/cutting/quotes/track/{trackingToken}` | anonim | → 200 `QuoteTrackingDto` · 404 |
| POST | `/public/cutting/quotes/track/{trackingToken}/accept` | anonim | → 200 `{message}` · 400 |
| GET | `/api/cutting/quotes/?status=` | ManufacturerOnly | → 200 `QuoteRequestListItemDto[]` |
| PUT | `/api/cutting/quotes/{id}/approve` | ManufacturerOnly | `{quotedPriceAmount, quotedPriceCurrency, customerEmail}` → 200 |
| PUT | `/api/cutting/quotes/{id}/reject` | ManufacturerOnly | `{reason, customerEmail}` → 200 |

**Árazás** (`PricingRuleEndpoints.cs`) — 🔴 **NINCS auth a csoporton** (se RequireAuthorization,
se fallback-policy → gyakorlatilag anonim!):

| Verb | URL | Request → Válasz |
|---|---|---|
| POST | `/api/pricing-rules/` | `CreatePricingRuleDto` → 201 `PricingRuleDto` · 422/400 |
| GET | `/api/pricing-rules/{id}` | → 200 `PricingRuleDto` · 404 |
| PUT | `/api/pricing-rules/{id}/activate` | → 200 · 404/400 |
| POST | `/api/pricing-rules/{id}/calculate-price` | `{quantity, leadDays: int, materialId?: Guid}` → 200 `{price: decimal, breakdown: string}` |

**Analytics** (`AnalyticsEndpoints.cs`, ManufacturerOnly) — 🔴 **a `tenantId` KÖTELEZŐ
query-param, nem a tokenből jön** (hitelesítetlen tenant-állítás — ugyanaz a hibaosztály,
mint az X-Tenant-Id header, ADR-061 T1 sérül):

| Verb | URL | Query | Válasz |
|---|---|---|---|
| GET | `/api/cutting/analytics/execution-metrics` | `tenantId!, machineId?, from?, to?` (DateOnly, -30d), `skip, take≤500` | 200 `AnalyticsPagedResult<DailyExecutionMetric>` |
| GET | `/api/cutting/analytics/material-usage` | `tenantId!, materialCode?, from?, to?` | 200 `AnalyticsPagedResult<DailyMaterialUsage>` |
| GET | `/api/cutting/analytics/oee` | `tenantId!, machineId?, from?, to?` (DateTime, -7d) | 200 `AnalyticsPagedResult<MachineOEEHourly>` |
| GET | `/api/cutting/analytics/operator-metrics` | `tenantId!, from?, to?` | 200 `AnalyticsPagedResult<DailyOperatorMetric>` |
| GET | `/api/cutting/analytics/rebuild-status` | `tenantId!, jobId!` | 200 `AnalyticsRebuildJob` (⚠ status SZÁM) · 404 |
| POST | `/api/cutting/analytics/rebuild` | `tenantId!` | **202** `{jobId}` · 409 `{message, jobId}` |
| GET | `/api/cutting/analytics/dashboard-summary` | `tenantId!` | 200 `{executionMetrics, materialUsage}` (top-10) |

**Adapter-admin** (`AdapterAdminEndpoints.cs`, ManufacturerOnly, tenant=`tid`):
`POST/GET /api/cutting/adapters/config` · `POST /config/test` · `GET /health` →
`AdapterConfigDto` / `AdapterTestResultDto` / `AdapterHealthDto`; 409 optimista konkurenciára.

### 1.2 Internal / integrációs végpontok (NEM portál-felület)

| Verb | URL | Védelem | Cél |
|---|---|---|---|
| POST | `/internal/ingest-order` | `X-SpaceOS-Internal: <SPACEOS_INTERNAL_SECRET>` konstans idejű ellenőrzéssel; secret hiánya → 503 | order-ingest → cutting jobok; `IngestOrderDto`; 200 `{orderId, jobsCreated}`; ⚠ `grainDirection` itt STRING-tagnév (egyedüli string-enum-parse) |
| DELETE | `/internal/cutting-sheets/by-tenant/{tenantId}?confirm=true` | ua. + `TEST_TENANT_ALLOWLIST` | teszt-reset; 200 `{tenantId, deletedCounts:{cuttingSheets, dailyCuttingPlans}}` |

Kimenő integráció: `CuttingPlanFrozen` domain-event → `RegisterOffcutsOnPlanFrozenHandler` →
`IInventoryCuttingAdapter.RegisterOffcutsAsync` (inventory `/api/inventory/offcuts/batch`);
`ICuttingEventPublisher.PublishJobCompletedAsync` → inventory `cutting-job-completed`;
panel-foglalás: `reserve-panels` → inventory reservations (Inventory az SSoT,
`PanelReservation.InventoryReservationId`). Outbox-minta + Analytics-subscriber házon belül.

### 1.3 DTO-k (wire, camelCase)

Fő request-ek:

| DTO | Mezők |
|---|---|
| `SubmitSheetRequest` | `orderReference: string` · `lines: [{partName, materialType: string, widthMm, heightMm, thicknessMm: decimal, quantity: int, notes?: string}]` |
| `CreatePlanRequest` | `name: string` · `date: "yyyy-MM-dd"` · `batches?: [{materialType: string, thicknessMm: decimal, sheetIds: Guid[]}]` |
| `CreateCuttingPlanRequest` | `planDate: "yyyy-MM-dd"` · `planDays: int = 14` (7..90) · `strategyId: string = "maxcut-v1"` |
| `CompleteJobRequest` | `cuttingSheetId?: Guid` · `yieldPct, wasteM2: decimal` |
| `AssignBatchRequest` | `batchId, machineId, operatorId: Guid!` · `priority: int` (1..10) · `startTime: DateTime` |
| `ScheduleExecutionRequest` | `sheetId, workerId, enrollmentId: Guid` · `machineId: string` · `scheduleStart, scheduleEnd: DateTime` · `totalPanels: int>0` |
| `StartExecutionRequest` | `workerId: Guid` · `badgeHmacBase64, hmacKeyVersion: string` |
| `RecordProgressRequest` | `eventId: Guid` · `kind: int` (**ProgressEventKind SZÁM!**) · `panel?: int` · `occurredAt: DateTime` · `eventHmacBase64, hmacKeyVersion: string` |
| `CompleteExecutionRequest` | `proofLevel: int` (**ProofLevel SZÁM**) · `proofHash: string` · `signature?, blobRef?, encryptedWith?: string` |
| `PublicQuoteRequestDto` | `customerName!≤200, customerEmail!(email), customerPhone?≤50, companyName?≤200, material!≤100` · `dimensions: {length: 1..10000, width: 1..10000, thickness: 1..500}` · `quantity: 1..10000` · `edgeType!, surface!: string≤100` · `urgency: "standard"|"express"` · `notes?≤2000` · `attachments?: [{filename(.pdf/.jpg/.jpeg/.png/.dxf), data: base64≤5MB}]` |
| `CreateQuoteRequestDto` | `customerEmail!, customerName!, customerPhone?, deliveryAddress!: string` · `requestedDeliveryDate?: DateTime` · `items: [{materialType: string, widthMm, heightMm: int, quantity: int, edgingType: string, notes?}]` |
| `CreatePricingRuleDto` | `supplierId: Guid` · `productCategory: string` · `basePricePerUnit: decimal` · `quantityBreakpoints: [{minQuantity, maxQuantity: int, discountPercent: decimal}]` · `leadTimeAdjustments: [{leadDays: int, adjustmentFactor: decimal}]` · `materialSurcharges: [{materialId: Guid, surchargePercent: decimal}]` |

Fő válaszok:

| DTO | Mezők |
|---|---|
| `NestingResultResponse` | `sheetId: Guid, orderReference: string, totalParts: int` · `groups: [{materialType, thicknessMm, lines: [{partName, widthMm, heightMm, quantity}]}]` · `panelAssignments?: [{panelStockId: Guid, materialType, panelWidthMm, panelHeightMm: int, placedParts: [{partName, x, y, widthMm, heightMm: int, isRotated: bool}], wasteAreaMm2: int, utilizationPercent: decimal}]` |
| `ExecutionStatusResponse` | `sheetId: Guid, status: string, startedAt?, completedAt?: DateTime, wasteAreaCm2: decimal` |
| `WasteReportResponse` | `totalWasteAreaCm2, averageWastePerExecution: decimal, executionCount: int` (⚠ NINCS napi/gépi bontás) |
| `CuttingPlanResponse` | `id: Guid, planDate: string, planDays: int, status: string, strategyId: string` · `dailyPlans: [{id, date: string, availableCapacity, allocatedCapacity, utilizationPercent: decimal, jobs: [{id, orderId: Guid, scheduledDate: string, priority: string, estimatedTimeHours: decimal, status: string}]}]` |
| `CreateCuttingPlanResponse` | `planId` + `dailyPlans` + `scheduledJobs` + `totalYieldPercent: decimal` |
| `ExecutionDto` | `id, tenantId, sheetId: Guid, status: string, panelsCompleted, totalPanels: int, startedAt?, completedAt?` — Summary: `id, status, scheduledAt, panelsCompleted, totalPanels` |
| `ProgressEventDto` / `MilestoneDto` / `CompletionProofDto` / `WorkerConsentStatusDto` | `{eventId, kind: string, panelNumber?, occurredAt}` / `{milestoneId, kind, status: string, reachedAt?}` / `{level: string, proofHash, committedAt}` / `{workerId, isActive: bool, withdrawnAt?}` |
| `QuoteRequestListItemDto` | `id: Guid, quoteNumber, status, customerEmail, customerName: string, itemCount: int, createdAt: DateTime, quotedPrice?: {amount: decimal, currency: string}` |
| `PricingRuleDto` | `id, supplierId: Guid, productCategory: string, basePricePerUnit: decimal, status: "Draft"|"Active"|"Archived", createdAt, updatedAt, version: int` + breakpoint/adjustment/surcharge tömbök (id-vel) |
| `DailyExecutionMetric` | `id, tenantId: Guid, machineId: string, metricDate: "yyyy-MM-dd", completedCount: int, avgDurationMinutes, yieldPercent: decimal, lastUpdatedAt` |
| `DailyMaterialUsage` | `id, tenantId, materialCode: string, usageDate: DateOnly, totalAreaUsedMm2, wasteAreaMm2: decimal, offcutCount: int, lastUpdatedAt` |
| `MachineOEEHourly` | `id, tenantId, machineId: string, hourSlot: DateTime, score: {availability, performance, quality, overall: decimal}, lastUpdatedAt` (⚠ nincs `machineName`) |
| `AnalyticsPagedResult<T>` | `items: T[], totalCount, skip, take: int, hasNextPage: bool` |

### 1.4 Enumok (MAI wire — ANGOL; request-oldalon SZÁM → ADR-059 wave 2)

| Enum | Tagok (int) | Wire MA |
|---|---|---|
| `CuttingPlanStatus` | `Draft=0, Published=1, Frozen=2, Closed=3` | string a válaszban |
| `CuttingSheetStatus` | `Draft=0, Submitted=1, Completed=2` | string |
| `DailyPlanStatus` / `DaySlotStatus` | `Draft=0, Finalized=1` / `Open=0, Locked=1, Closed=2` | string |
| `ExecutionStatus` (sheet) | `Planned=0, InProgress=1, Completed=2, Failed=3` | string |
| `CuttingExecutionStatus` | `Scheduled=0, Started=1, InProgress=2, Completed=3, Cancelled=4, Failed=5` | string (`ExecutionDto.status`) |
| `ProgressEventKind` | `PanelStarted=0, PanelCompleted=1, MaterialLoaded=2, MachineEvent=3` | **request: SZÁM** · válasz: string |
| `ProofLevel` | `HashOnly=0, SignedEvidence=1, PhotoEvidence=2` | **request: SZÁM** · válasz: string |
| `CancelReason` | `OperatorCancelled=0, MaterialShortage=1, MachineFault=2, SystemCancelled=3` | **request: SZÁM** |
| `ConsentScope` | `AllExecutions=0, SpecificTenant=1, SpecificExecution=2` | **request: SZÁM** |
| `MilestoneKind` / `MilestoneStatus` | `PanelCompletion=0, TimeWindow=1, QualityCheck=2, WorkerConsent=3` / `Pending=0, Met=1, Expired=2` | string |
| `QuoteStatus` | `PendingReview=0, Quoted=1, ConvertedToOrder=2, Rejected=3` | string |
| `PricingRuleStatus` | `Draft=0, Active=1, Archived=2` | string |
| `GrainDirection` | `None=0, Vertical=1, Horizontal=2` | ingest-order: STRING-tagnév (case-insens.) |
| `RebuildJobStatus` | `Pending=0, Running=1, Completed=2, Failed=3` | **SZÁM** (`AnalyticsRebuildJob.status`) |
| `PanelReservationStatus` | `Pending=0, Confirmed=1, Released=2` | (nincs wire-DTO-n) |

⚠ A request-mezők `materialType`/`edgeType`/`edgingType`/`surface` **szabad szövegek** (string),
NEM a domain-enumok — zod-ban ne szűkítsd enumra.

### 1.5 FSM-ek

**CuttingPlan** (Result.Invalid → 400/422, nem exception):

| Művelet | Honnan | Hová | Guard |
|---|---|---|---|
| `Create` | — | `Draft` | planDays 7..90, planDate ≥ ma |
| `Publish(profileSnapshotId)` | `Draft` | `Published` | ≥1 DaySlot; snapshotId ≠ üres |
| `Freeze` | `Published` | `Frozen` | ≥1 nyitott DaySlot → **ez triggereli az inventory offcut-batch regisztrációt** |
| `Close` | `Frozen` | `Closed` | nincs nyitott DaySlot |
| `UpdateStatus` (PUT status) | bármi | bármi | ⚠ Obsolete, FSM-bypass — portálról NE használd |

**CuttingSheet:** `Draft → Submitted → Completed` (`Submit`: ≥1 sor, throw → 500-veszély).
**DailyCuttingPlan:** `Draft → Finalized`. **PanelReservation:** `Pending → Confirmed → Released`
(Release Pendingből is). **CuttingQuoteRequest:** `PendingReview → Quoted → ConvertedToOrder`
ill. `PendingReview → Rejected` (1..100 tétel).

**CuttingExecution** (Result.Invalid → 422):

| Művelet | Honnan | Hová | Guard |
|---|---|---|---|
| `Schedule` | — | `Scheduled` | totalPanels>0 |
| `Start` | `Scheduled` | `Started` | badge-HMAC érvényes |
| `RecordProgress` | `Started`/`InProgress` | `InProgress` | HMAC; idempotens `eventId`-ra; `PanelCompleted` növeli a számlálót |
| `Complete` | `InProgress` | `Completed` | `panelsCompleted == totalPanels` + proof-policy |
| `Cancel` | nem-terminál | `Cancelled` | — |
| — | — | `Failed` | ⚠ enum-tag, de NINCS átmenet a kódban |

**AnalyticsRebuildJob:** `Pending → Running → Completed` / `Fail: bármi(≠Completed) → Failed`.

### 1.6 Auth/tenant — mai állapot

- JwtBearer, `MapInboundClaims=false`, `NameClaimType=preferred_username`, audience default
  `kernel-api`; policy `ManufacturerOnly` = csak `RequireAuthenticatedUser()`.
- Tenant-forrás **végpontcsoportonként eltér**: mag+planning+adapter → `tid` · executions →
  `tid` VAGY `tenant_id` · quotes → `tenant_id` (+ user `sub`) · public quote → **szubdomain**
  (`X-Original-Host`/`Host` → `Tenants.Subdomain` SQL) · analytics → 🔴 **query-param**.
- 🔴 **Gap-ek (ADR-061 hosting-kör ide még nem ér el):** (1) pricing-rules csoport auth nélkül;
  (2) analytics `tenantId` query-param = hitelesítetlen tenant-állítás; (3) claim-név-drift
  (`tid` vs `tenant_id`) egy modulon belül; (4) `X-Tenant-Id`-t olvasó halott helper a
  QuoteRequestEndpoints-ben (nem hívott — törlendő).
- RLS: internal végpontok `set_config('app.current_tenant_id', …)`-t állítanak kézzel.
- Port: repóban nincs URL-konfig — systemd env adja az 5005-öt.

---

## 2. JOINERY — production világ (port 5002)

**Host:** `src/spaceos-modules-joinery/SpaceOS.Modules.Joinery.Api/Program.cs` · .NET 8 **minimal API**
(nem controller — az endpointok az `Api/Endpoints/*.cs` fájlokban).
**Health:** `GET /health` → 200 `{status:"healthy", service:"spaceos-joinery"}` (AllowAnonymous).
Swagger csak Developmentben.

### 2.1 Route-térkép — portál-felület

Minden üzleti csoport `RequireAuthorization("ManufacturerOnly")` = `tenant_type=Manufacturer` claim.
A handlerek emellett a `tenant_id` claimet is megkövetelik (érvénytelen/hiányzó → **401**).

**`/api/orders` csoport** (`Api/Endpoints/DoorOrderEndpoints.cs`):

| Verb | URL | Request | Válasz (200/201) | Hibák |
|---|---|---|---|---|
| POST | `/api/orders` | `CreateDoorOrderRequest` | 201 + **csupasz Guid** a body-ban, `Location` header | 400 (validációs tömb), 401 |
| POST | `/api/orders/{id}/items` | `AddDoorItemRequest` | 201 + csupasz Guid | 400, 401 |
| POST | `/api/orders/{id}/calculate` | — | 200 `CuttingListResponse` | 400, 401 |
| GET | `/api/orders` | `?page=1&pageSize=20` (1..100) | 200 `PagedList<DoorOrderDto>` | 400, 401 |
| GET | `/api/orders/{id}` | — | 200 `DoorOrderDto` | 404, 401 |
| GET | `/api/orders/{id}/cutting-list` | — | 200 `CuttingListResponse` (no-store) | 404, 401 |
| GET | `/api/orders/{id}/process-plan` | — | 200 `ProcessPlanResponse` | 404, 401 |
| GET | `/api/orders/{id}/hardware-list` | — | 200 `HardwareListResponse` | 404, 401 |
| GET | `/api/orders/{id}/material-req` | — | 200 `MaterialRequirementsResponse` | 404, 401 |
| POST | `/api/orders/{id}/submit` | — | 200 (üres) | 400, 401 |
| PUT | `/api/orders/{id}/revert` | — | 200 (üres) | 400, 401 |
| GET | `/api/orders/{id}/snapshots` | — | 200 `SnapshotSummaryDto[]` | 404, 401 |
| GET | `/api/orders/{id}/sheet` · `/hardware-list-pdf` · `/material-req-pdf` · `/manufacturing-sheet` | — | 200 `application/pdf` (bináris) | 404, 400, 401 |

**`/api/products` + work order** (`Api/Endpoints/ProductEndpoints.cs`):

| Verb | URL | Request | Válasz | Hibák |
|---|---|---|---|---|
| POST | `/api/products/configure` | `ConfigureProductRequest` | 200 `ConfigureProductResponse` | 404, 400 `[{identifier,errorMessage}]`, 401 |
| POST | `/api/work-orders` | `CreateWorkOrderRequest` | 201 `CreateWorkOrderResponse` | 400 `{error}`/tömb, 404, 401 |
| GET | `/api/work-orders/{id}/sheet.pdf` | — | 200 PDF | 404, 401 |
| PATCH | `/api/v1/work-orders/{id}/assembly-sequence` | `UpdateAssemblySequenceRequest` | 200 `UpdateAssemblySequenceResponse` | 404 `{error:"NOT_FOUND"}`, 409 `{error:"CONCURRENT_MODIFICATION", latest_timestamp}` (snake_case!), 400/422 `{error:"VALIDATION_FAILED", details:[{field,error}]}`, 401 |

**`/api/gyartasilap`** (`Api/Endpoints/GyartasilapEndpoints.cs`):

| Verb | URL | Request | Válasz | Hibák |
|---|---|---|---|---|
| POST | `/api/gyartasilap/generate` | `GenerateGyartasilapRequest` | 201 `GenerateAndStoreGyartasilapResponse` | 404, 400, 401 |
| GET | `/api/gyartasilap/{id}` | — | 200 `GetGyartasilapResponse` | 404, 400, 401 |
| PUT | `/api/gyartasilap/{id}/finalize` | — | 200 `{status:"Finalized"}` | 404, **409** (nem Draft), 400, 401 |
| GET | `/api/gyartasilap/order/{orderId}/list` | `?status=Draft|Finalized|Archived` (case-insens.) | 200 `ListGyartasilapItem[]` | 400, 401 |
| POST | `/api/gyartasilap/batch` | `GenerateBatchRequest` | 201 `GenerateBatchResponse` | 400, 401 |
| GET | `/api/gyartasilap/batch/{batchId}/status` | — | 200 `GetBatchStatusResponse` | 404, 400, 401 |
| GET | `/api/gyartasilap/batch/{batchId}/download` | — | **302 Redirect** (presigned MinIO URL) | 404, 400, 401 |

**`/api/anyaglista`** (`Api/Endpoints/AnyaglistaEndpoints.cs`):

| Verb | URL | Request | Válasz | Hibák |
|---|---|---|---|---|
| POST | `/api/anyaglista/generate` | `GenerateAnyaglistaRequest` | 201 `GenerateAnyaglistaResponse` | 404, 500, 400, 401 |
| GET | `/api/anyaglista/{orderId}` | — | 200 `GetAnyaglistaResponse` | 404, 400, 401 |

### 2.2 Internal / integrációs végpontok (NEM portál-felület)

| Verb | URL | Védelem | Cél |
|---|---|---|---|
| PUT | `/api/orders/internal/results` | ManufacturerOnly csoportban(!), body = `SaveCalculationResultCommand` | Orchestrator írja vissza a kalkuláció eredményét |
| POST | `/joinery/internal/orders/from-quote` | loopback-only + `X-SpaceOS-Internal` secret (const-time) + `X-SpaceOS-TenantId` header = body.tenantId | Sales quote → DoorOrder (`ConfirmedFromSales`), idempotens `(TenantId, SourceQuoteId)`-ra, hash-eltérés → 409 |
| DELETE | `/internal/orders/by-tenant/{tenantId}?confirm=true` | `X-SpaceOS-Internal` header + `TEST_TENANT_ALLOWLIST` env | teszt-adat reset (Orchestrator) |

Kimenő integráció: outbox-worker (5s poll, `FOR UPDATE SKIP LOCKED`) → `POST {Orchestrator:BaseUrl}/internal/abstractions/calculate`;
MinIO a PDF-eknek; `ICuttingProvider` = **stub** (nincs élő cutting-integráció!).

### 2.3 DTO-k (wire-alak, camelCase kulcsokkal)

Request-ek (`Api/Endpoints/Requests.cs`, ha nincs más jelölve):

| DTO | Mezők (wire-név: típus — megkötés) |
|---|---|
| `CreateDoorOrderRequest` | `flowEpicId: Guid!` · `projectId: string!≤30` · `projectName: string!≤200` · `clientName?/clientAddress?/clientPhone?: string` · `deliveryDate?: DateOnly` |
| `AddDoorItemRequest` | `sorszam: string!≤5` · `name?: string` · `quantity: int>0` · `doorType: string` (DoorType-tagnév, validált→400) · `openingDirection: string` (⚠ NEM validált — rossz érték **500**) · `wallOpeningWidth/doorWidth/wallOpeningHeight/doorHeight/wallOpeningThickness/doorThickness: decimal` |
| `GenerateGyartasilapRequest` | `joineryOrderId: Guid` · `cuttingPlanId?: Guid` · `labelVariant: string` (`L1`..`L4`, default `L1`) |
| `GenerateBatchRequest` | `orderId: Guid` · `gyartasilapIds: Guid[]` |
| `GenerateAnyaglistaRequest` | `orderId: Guid` |
| `ConfigureProductRequest` | `productType: string!≤50` · `dimensions: {width,height,thickness: decimal>0}` · `materials: {core!: string, veneer, edge}` · `fittings: {hinge!: string, handle, lock}` |
| `CreateWorkOrderRequest` | `configId: string` (Guid-parse) · `quantity: int 1..1000` · `deliveryDate: DateOnly` (jövőbeli) · `customerRef?≤100` · `notes?≤2000` |
| `UpdateAssemblySequenceRequest` | `operations: [{id: Guid!, sequence: int>0}]` (folytonos 1..N) · `timestamp: DateTime` |

Válaszok:

| DTO | Mezők |
|---|---|
| `DoorOrderDto` | `id, tenantId, flowEpicId: Guid` · `projectId, projectName: string` · `status: string` (**DoorOrderStatus tagnév-string**) · `itemCount: int` · `deliveryDate?: DateOnly` (⚠ ma mindig null) · `createdAt: DateTime` (⚠ ma `UtcNow`, nem perzisztált!) |
| `PagedList<T>` | `items: T[]` · `totalCount, page, pageSize: int` |
| `CuttingListResponse` | `orderId: Guid` · `items: CuttingListItem[]` · `totalItemCount: int` — item: `itemSorszam, componentName, material, componentType: string` · `thickness, width, length: decimal` · `quantity: int` |
| `ProcessPlanResponse` | `orderId` · `tasks: [{taskId, shortName: string, description?, department?: string, unitTime: "hh:mm:ss", headcount: int, parentTaskId?: string}]` |
| `HardwareListResponse` | `orderId` · `items: [{itemSorszam, componentType, name, color: string, quantity: int, note?: string}]` |
| `MaterialRequirementsResponse` | `orderId` · `requirements: [{material: string, thickness, totalM2, totalLinearMeter: decimal}]` |
| `SnapshotSummaryDto` | `id, doorItemId: Guid` · `templateName: string, templateVersion: int` · `inputWidth, inputHeight: decimal` · `contentHash: string` · `calculatedAt: DateTimeOffset` · `lineCount: int` |
| `ConfigureProductResponse` | `configId: string` · `previewUrl?: string` · `estimatedPrice: decimal` · `bomPreview: [{itemType, name, unit: string, quantity, unitPrice, totalPrice: decimal}]` |
| `CreateWorkOrderResponse` | `workOrderId, pdfUrl: string` · `bomItems: [{itemType, name, unit, supplier?: string, quantity, totalPrice: decimal, inStock, toOrder: int}]` · `totalMaterialCost, estimatedLabor, totalCost: decimal` · `scheduledStart, estimatedCompletion: DateOnly` |
| `UpdateAssemblySequenceResponse` | `updatedOperations: [{id: Guid, sequence: int, description: string, estimatedDuration: "hh:mm:ss", lastModified: DateTime}]` · `estimatedDurationChange: string` · `totalDuration: "hh:mm:ss"` |
| `GenerateAndStoreGyartasilapResponse` | `gyartasilapId: Guid` · `storageUrl?: string` · `status: int` (**GyartasilapStatus SZÁMKÉNT!**) · `labelVariant: string` · `createdAt: DateTimeOffset` |
| `GetGyartasilapResponse` | `id, joineryOrderId: Guid` · `cuttingPlanId?: Guid` · `labelVariant, version: string` · `status: int` · `storageUrl?: string` · `hasPdfContent: bool` · `createdAt, updatedAt?: DateTimeOffset` |
| `ListGyartasilapItem` | `id: Guid, labelVariant: string, status: int, storageUrl?: string, createdAt: DateTimeOffset` |
| `GenerateBatchResponse` / `GetBatchStatusResponse` | `batchId: Guid` · `status: int` (**BatchStatus SZÁMKÉNT**) · `zipStoragePath?: string` (+ `createdAt` a statusnál) |
| `GenerateAnyaglistaResponse` / `GetAnyaglistaResponse` | `anyaglistaId: Guid` · `storageUrl: string` (+ `createdAt: DateTimeOffset`) |

### 2.4 Enumok (MAI wire-alak — mind ANGOL → ADR-059 wave 2 scope)

| Enum | Wire-alak MA | Tagok |
|---|---|---|
| `DoorOrderStatus` | **string tagnév** (a DTO-ban string) | `Draft, ConfirmedFromSales, Submitted, Calculating, Calculated, CalculationFailed, InProduction, Completed, Cancelled` |
| `DoorType` | request-string (tagnév) | `Butorfront, Disztok, FAF_T, FAF_TN, FAF_TN_KetSzarny, Falcos, Falsikban, FEF_T, FEF_T_KetSzarny, FEF_TN, FEF_TN_KetSzarny, Falpanel, Sikban, Tokba, Pivot, PivotDisztokkal, TUS_Tokba, TUT_Sikba, TPL_Sikba, TPS_Tokba, KetSzarny_Sikba, KetSzarny_Tokba` |
| `OpeningDirection` | request-string (tagnév) | `Left, Right, Double, PivotLeft, PivotRight` |
| `GyartasilapStatus` | **SZÁM** a válaszban (query-filterben string!) | `Draft=0, Finalized=1, Archived=2` |
| `BatchStatus` | **SZÁM** | `Pending=0, Generating=1, Ready=2, Failed=3` |

⚠ A joinery domain-tagnevek részben MAGYAROK (`Butorfront`, `Disztok`, `Sorszam` mező…) — a
DoorType-nál a „magyar wire" félig már adott, de NEM az ADR-059 EnumWireMap-varratán keresztül.

### 2.5 FSM-ek

**DoorOrder** (`Domain/Aggregates/DoorOrder.cs`; optimista `version`, max 500 tétel):

| Művelet | Honnan | Hová | Guard/hiba |
|---|---|---|---|
| `Create` | — | `Draft` | projectId+flowEpicId kötelező |
| `CreateFromConversion` (internal) | — | `ConfirmedFromSales` | currency 3 char, totals>0, ≥1 sor |
| `AddItem` | `Draft` | `Draft` | nem-Draft → 400; ≥500 tétel → 400 |
| `Submit` | `Draft` | `Submitted` | üres tétellista → 400 |
| `MarkCalculating` | `Submitted` | `Calculating` | különben 400 |
| `MarkCalculated` | `Calculating` | `Calculated` | különben 400 |
| `MarkCalculationFailed` | `Calculating` | `CalculationFailed` | hibaüzenet ≤2000 char |
| `RevertToDraft` (PUT /revert) | `CalculationFailed` VAGY `Calculated` | `Draft` | különben 400 |

⚠ `InProduction`, `Completed`, `Cancelled`: az enumban léteznek, de **nincs átmenet hozzájuk a
kódban** — a portál FSM-tükrében ezek ma elérhetetlen állapotok (ne kínálj rájuk akciót).

**Gyartasilap:** `Create→Draft` · `Finalize: Draft→Finalized` (nem-Draft → **409**) ·
`Archive: bármi(≠Archived)→Archived` · `UpdateStorage`: Archived-on tiltott.
**GyartasilapBatch:** `Pending → Generating → Ready | Failed` (MarkReady/MarkFailed csak egyszer).
**WorkOrder / Anyaglista:** nincs státusz-FSM (WorkOrder: optimista konkurencia → 409).

### 2.6 Auth/tenant — mai állapot

- JwtBearer, `Jwt:Authority` env-ből (élesben `http://127.0.0.1:8080/realms/spaceos`, Keycloak),
  audience élesben `spaceos-orchestrator-bff` (appsettings-default: `kernel-api`).
- ⚠ Nincs `MapInboundClaims = false` (eltér a másik 3 modultól) — a default claim-mapping fut.
- Policy: `ManufacturerOnly` = `RequireClaim("tenant_type","Manufacturer")` — a 4 modul közül
  **egyedül itt jelent valamit** a policy-név.
- Tenant: **JWT `tenant_id` claim** (nem header). RLS-propagálás: `TenantSessionInterceptor` →
  `set_config('app.tenant_id', …)` minden connection-nyitáskor — ⚠ a GUC-név `app.tenant_id`,
  míg más modulok `app.current_tenant_id`-t használnak.
- 401 vs 403: érvénytelen token → 401 · nem-Manufacturer token → 403 · Manufacturer token
  `tenant_id` nélkül → 401.
- **Gap (ADR-061/062 hosting-kör ide még NEM ér el):** a hitelesítés rendben (claim-alapú
  tenant), de nincs közös hosting-csomag; a validációs hibatest végpontonként más alakú;
  a belső secret-header séma (`X-SpaceOS-Internal`) modul-lokális konvenció.

---

## 3. INVENTORY — warehouse világ (port 5004)

**Host:** `src/spaceos-modules-inventory/src/SpaceOS.Modules.Inventory.Api/Program.cs` · minimal API.
**Health:** `GET /health` → 200 `Healthy` (MapHealthChecks). Nincs Swagger.

### 3.1 Route-térkép — portál-felület

Mindkét üzleti csoport `RequireAuthorization("ManufacturerOnly")` — ez itt csak
`RequireAuthenticatedUser()` (a policy-név megtévesztő). Tenant: **JWT `tid` claim**
(hiánya írás-végpontokon → 401).

**`/api/inventory` csoport** (`Api/Endpoints/InventoryEndpoints.cs`):

| Verb | URL | Request | Query | Válasz | Hibák |
|---|---|---|---|---|---|
| GET | `/api/inventory/stock` | — | `materialType?` (default `"MDF 18mm"`) | 200 `StockLevelResponse` | 404 |
| GET | `/api/inventory/offcuts` | — | `materialType?` | ⚠ **ÉLŐBEN 500** — lásd lent | — |
| POST | `/api/inventory/movements/consumption` | `RecordConsumptionRequest` | — | 200 (üres) | 400, 401 |
| POST | `/api/inventory/movements/inbound` | `RecordInboundRequest` | — | 201 (üres) | 400, 404, 401 |
| POST | `/api/inventory/movements/offcut` | `RecordOffcutRequest` | — | 200 (üres) | 400, 401 |
| GET | `/api/inventory/trend` | — | `materialType?`, `from?`, `to?` (default: utolsó 1 hónap) | 200 `ConsumptionTrendResponse` | 400 |
| POST | `/api/inventory/reservations` | `ReserveStockRequest` | — | 201 `ReservationDto` (+Location) — idempotencia-találatkor IS 201 | 400 (ismeretlen modul / hiányzó készlet is!), 401 |
| DELETE | `/api/inventory/reservations/{correlationId}` | — | `reason?` | 200 (üres) | 404, 401 — ⚠ a path a **correlationId**, nem a reservation id |
| GET | `/api/inventory/reservations` | — | `consumerModule?`, `correlationId?`, `createdAfter?`, `createdBefore?`, `skip=0`, `take=100` (1..500) | 200 `ReservationDto[]` | 401 · minden filter üres → 200 `[]` (DoS-guard) |

**`/api/inventory/offcuts` csoport** (`Api/Endpoints/OffcutEndpoints.cs`) — offcut-életciklus:

| Verb | URL | Request | Válasz | Hibák |
|---|---|---|---|---|
| GET | `/api/inventory/offcuts/` | `?status=&materialCode=&minVolumeM3=&createdAfter=&page=1&pageSize=20` | 200 `GetOffcutListResponse` | ⚠ ütközik — lásd lent |
| GET | `/api/inventory/offcuts/stats/summary` | — | 200 `GetOffcutStatsSummaryResponse` | — |
| GET | `/api/inventory/offcuts/{offcutId}` | — | 200 `GetOffcutDetailResponse` | 404 |
| POST | `/api/inventory/offcuts/{offcutId}/reserve` | `{jobId: Guid}` | 201 `{reservationId, expiresAt}` | 404, **409** (nem Available), 400, 401 |
| POST | `/api/inventory/offcuts/{offcutId}/approve-reservation` | `{reservationId: Guid}` | 200 `{status:"Approved"}` | 404, **410** (lejárt, RFC7807), 400 |
| POST | `/api/inventory/offcuts/{offcutId}/use` | `{jobId: Guid}` | 200 `{status:"Used", usedInJobId, usedAt}` | 404, **409** (nem Reserved), 400 |

> 🔴 **ÉLŐ BUG (2026-07-18 szúrópróba):** `GET http://localhost:5004/api/inventory/offcuts` →
> **HTTP 500**, journal: `AmbiguousMatchException` — a `GetOffcuts` (InventoryEndpoints) és a
> `GetOffcutList` (OffcutEndpoints `/`) **ugyanarra az URL-re matchel**, az ASP.NET nem tud
> választani. A route MA HASZNÁLHATATLAN — a portál offcut-listája nem építhető rá, amíg a
> backend nem oldja fel (a legacy flat `OffcutResponse[]` végpont törlése a kézenfekvő fix).
> Follow-up task-jelölt: WORLDS-INV-OFFCUT-ROUTEFIX.

Megjegyzés: az `approve-reservation` és a `use` handler **nem ellenőriz tenantot** (nincs
`tid`-guard) — a `reserve` igen. Gap-jelölés az 5. szekcióban.

### 3.2 Internal / integrációs végpontok (NEM portál-felület)

| Verb | URL | Védelem | Cél |
|---|---|---|---|
| POST | `/api/inventory/offcuts/batch` | JWT + `tid` | **cutting-integráció**: offcut-regisztráció fagyasztott vágótervből; idempotens `(tenant, sourceType, sourceId)`-ra; 201 új / 200 meglévő `{batchId, offcutIds[], isNew}` |
| POST | `/api/inventory/integration/cutting-job-completed` | `X-Internal-Service` header (csak jelenlét!) | cutting job-complete esemény; 202; ⚠ v1-stub: 0 dimenziókkal jön → **ma nem hoz létre offcutot** |
| POST | `/internal/inbound` | loopback-only (Prod) + `Authorization: Bearer <SPACEOS_INTERNAL_SECRET>` + `X-SpaceOS-TenantId` = body.tenantId | procurement-szállítás → PanelStock + StockMovement; idempotens `(tenant, deliveryLineId)`; 200 `{processed}` / 422 ismeretlen materialCode |
| DELETE | `/internal/panel-stocks/by-tenant/{tenantId}?confirm=true` | `X-SpaceOS-Internal` + `TEST_TENANT_ALLOWLIST` | teszt-reset |

### 3.3 DTO-k (wire, camelCase)

Request-ek:

| DTO | Mezők |
|---|---|
| `RecordConsumptionRequest` | `materialType!: string` · `thickness: decimal` · `area: decimal>0` · `panelCount: int>0` · `reason!: string` · `occurredAt: DateTime` |
| `RecordInboundRequest` | ua., de `reference!: string` a `reason` helyett |
| `RecordOffcutRequest` | `materialType!: string` · `widthMm, heightMm: decimal>0` · `originCuttingSheetId?: Guid` |
| `ReserveStockRequest` | `correlationId: Guid` · `consumerModule: string` (allowlist: `Cutting, Joinery, Cabinet, FreeTier`) · `consumerContextJson?: string` · `createdByUserId?: Guid` · `items: [{stockItemId: Guid, materialCode: string≤20, quantity: decimal>0}]≥1` · `ttl: "hh:mm:ss"` (1h..168h!) |
| `RegisterOffcutBatchRequest` | `sourceType: string` · `sourceId: Guid` · `items: [{materialCatalogId: Guid, materialCode: string, widthMm, heightMm, thicknessMm: decimal}]` |

Válaszok:

| DTO | Mezők |
|---|---|
| `StockLevelResponse` | `materialType: string` · `fullPanelCount: int` · `widthMm, heightMm: int` · `offcutCount: int` |
| `ConsumptionTrendResponse` | `materialType: string` · `dailyData: [{date: DateTime, area: decimal}]` · `averageDailyConsumption: decimal` |
| `GetOffcutListResponse` | `offcuts: OffcutListItem[]` · `total, page, pageSize: int` — item: `id: Guid, materialCode: string, widthMm/heightMm/thicknessMm/volumeM3/weightKg: decimal, status: string` (**enum-tagnév stringként!**), `createdAt: DateTime, cuttingJobId?: Guid` |
| `GetOffcutDetailResponse` | mint a ListItem + `usedAt?: DateTime, usedInJobId?: Guid` · `reservationHistory: [{reservationId, jobId: Guid, status: string, createdAt, expiresAt: DateTime}]` |
| `GetOffcutStatsSummaryResponse` | `totalAvailableVolumeM3, totalAvailableWeightKg: decimal` · `availableByMaterial: {[materialCode]: {volumeM3, weightKg}}` · `reservedCount, usedCount, scrappedCount: int` |
| `ReservationDto` (külső NuGet: SpaceOS.Modules.Contracts 1.2.0!) | `id, tenantId, correlationId: Guid` · `consumerModule: string` · `consumerContext?: object` (nyers JSON) · `createdByUserId?: Guid` · `createdAt, expiresAt: DateTimeOffset` · `status: int` (**ReservationStatus SZÁMKÉNT!**) · `items: [{id, stockItemId: Guid, materialCode: string, quantityReserved, quantityConsumed: decimal}]` |

⚠ A lokális `SpaceOS.Modules.Inventory.Contracts` DTO-k (`OffcutDto`, `PanelStockDto`…) az
**in-process** `IInventoryProvider` szerződés részei, NEM HTTP-wire — fetchert ne építs rájuk.

### 3.4 Enumok (MAI wire-alak — mind ANGOL → ADR-059 wave 2)

| Enum | Tagok (int) | Wire MA |
|---|---|---|
| `OffcutStatus` | `Available=0, Reserved=1, Used=2, Waste=3 (legacy), Scrapped=4` | **string tagnév** az offcut-DTO-kban |
| `OffcutReservationStatus` | `Pending=0, Approved=1, Cancelled=2` | string tagnév (`reservationHistory.status`, `"Approved"`) |
| `ReservationStatus` | `Active=0, Released=1, Expired=2, Consumed=3` | **SZÁM** (`ReservationDto.status`) |
| `StockType` / `MovementType` | `FullPanel=0, Offcut=1` / `Inbound=0, Consumption=1, Offcut=2, Scrap=3` | jelenleg nincs válasz-DTO-n |

### 3.5 FSM-ek

**Offcut-életciklus (reserve → approve → use) — a HÁROM HTTP-lépés összjátéka:**

| Lépés | Endpoint | Offcut státusz | Reservation státusz |
|---|---|---|---|
| 0. Regisztráció (batch/manual) | `POST /offcuts/batch` v. `/movements/offcut` | → `Available` | — |
| 1. Reserve | `POST /offcuts/{id}/reserve` | **marad `Available`!** | új `OffcutReservation` → `Pending` (lejárat: +7 nap) |
| 2. Approve | `POST /offcuts/{id}/approve-reservation` | `Available → Reserved` | `Pending → Approved` (lejárt → 410) |
| 3. Use | `POST /offcuts/{id}/use` | `Reserved → Used` (`usedAt`, `usedInJobId`) | — |

⚠ A `use` közvetlenül `reserve` után (approve nélkül) → **409**, mert az offcut még Available.

**Offcut aggregátum** (`Domain/Aggregates/Offcut.cs`):

| Művelet | Honnan | Hová | Hiba |
|---|---|---|---|
| `Reserve` | `Available` | `Reserved` | InvalidOperation → 409 |
| `CancelReservation` | `Reserved` | `Available` | InvalidOperation |
| `MarkUsed(jobId)` | `Available` VAGY `Reserved` | `Used` | InvalidOperation → 409 |
| `Scrap` | bármi ≠ `Used` | `Scrapped` | „Cannot scrap a Used offcut" |

**Reservation (készlet-foglalás)** (`Domain/Aggregates/Reservation.cs`, xmin optimista konkurencia):
`Reserve → Active` (TTL 1-168h) · `Release: Active→Released` · `MarkExpired: Active→Expired`
(csak worker-kontextusból, I-08) · `MarkConsumed: Active→Consumed`.
`ReservationItem.RecordConsumption`: `consumed+amount ≤ reserved` (I-07).

**PanelStock:** nincs FSM — `AddQuantity`/`ConsumeQuantity` („Insufficient stock" ha túlfogyasztás;
`LowStockAlertEvent` ha qty ≤ 5). **StockMovement:** append-only.

### 3.6 Auth/tenant — mai állapot

- JwtBearer, `MapInboundClaims=false`, audience default `kernel-api`; policy `ManufacturerOnly` =
  csak `RequireAuthenticatedUser()` (⚠ nem szűr szerepre).
- Tenant: `tid` claim → 401 ha hiányzik (írásoknál); RLS-propagálás `TenantSessionInterceptor` →
  `set_config('app.current_tenant_id', …)` (⚠ a joinery `app.tenant_id`-t használ — GUC-név-drift).
- ⚠ Claim-inkonzisztencia: a HTTP-út `tid`-et olvas, a `HttpContextTenantAccessor` (in-process
  adapter) `tenant_id`-t.
- ⚠ `approve-reservation` + `use` végpontok tenant-guard nélkül futnak (auth igen, tid-check nem).
- Internal auth: 3-féle header-séma egy modulon belül (`X-SpaceOS-Internal` jelenlét /
  `X-Internal-Service` jelenlét / Bearer-secret + `X-SpaceOS-TenantId`) — ADR-061 hosting-körbe
  konszolidálandó gap.
- Port: a repóban nincs URL-konfig — a systemd unit env-je adja az 5004-et.

---

## 4. PROCUREMENT — warehouse világ (port 5006)

**Host:** `src/spaceos-modules-procurement/src/SpaceOS.Modules.Procurement.Api/Program.cs` ·
**VEGYES**: minimal API csoportok + MVC controllerek (`AddControllers`+`MapControllers`).
**Health:** `GET /healthz` → 200 `"healthy"` · `GET /health/ready` → 200 `"ready"` (DB-check).
Nincs Swagger. Result→HTTP (`Endpoints/ResultToHttp.cs`): Ok→200/201 · NotFound→404 ·
Forbidden→**403** · Invalid→**422** (ValidationErrors) · Conflict→409 · Unavailable→503 ·
egyéb→400 (Errors).

### 4.1 Route-térkép — portál-felület

**Beszállítók / PO / szállítás** (`Endpoints/ProcurementEndpoints.cs`, `/api/procurement`,
ManufacturerOnly, tenant=**csak `tid`**):

| Verb | URL | Request | Válasz | Hibák |
|---|---|---|---|---|
| POST | `/api/procurement/suppliers` | `CreateSupplierRequest` | 201 (+Location) | 400, 401 |
| GET | `/api/procurement/suppliers` | — | 200 `SupplierResponse[]` | 400, 401 |
| GET | `/api/procurement/orders` | — | 200 `PurchaseOrderListResponse[]` | 400, 401 |
| POST | `/api/procurement/orders` | `CreatePurchaseOrderRequest` | 200 `{id}` | 400, 401 |
| GET | `/api/procurement/orders/{id}` | — | 🔴 **NEM MŰKÖDIK** — a `GetOrderStatusQuery` típus **nem létezik a repóban** (csak referenciák; a checkout így nem fordul). Szándékolt alak: `{id, materialType, quantity, status, expectedDelivery}` | — |
| GET | `/api/procurement/prices?materialType=` | — | 200 `SupplierPriceResponse[]` (⚠ `unitPrice` ma placeholder 0) | 400, 401 |
| POST | `/api/procurement/deliveries` | `RecordDeliveryRequest` | 200 (üres) | 400, 401 |

**Igénylések (PR→PO lánc)** (`RequisitionEndpoints.cs`, `/api/procurement/requisitions`,
tenant=`tenant_id`→`tid`):

| Verb | URL | Request | Válasz | Hibák |
|---|---|---|---|---|
| POST | `/requisitions/` | `CreateRequisitionRequest` | 201 `{id}` | 401, 422, 400 |
| GET | `/requisitions/` · `/{id}` | — | 200 `RequisitionDto[]` / `RequisitionDto` | 401, 404 |
| POST | `/requisitions/{id}/approve` | — (actor a JWT-ből) | 200 | **403 (SoD: jóváhagyó ≠ igénylő)**, 404, 422 |
| POST | `/requisitions/{id}/reject` | `{reason: string}` | 200 | 404, 422 |
| POST | `/requisitions/{id}/convert` | `ConvertRequisitionRequest` | 200 `{purchaseOrderId}` | 404, 422 |

**Számlák (three-way match)** (`InvoiceEndpoints.cs`, `/api/procurement/invoices`):

| Verb | URL | Request | Válasz | Hibák |
|---|---|---|---|---|
| POST | `/invoices/` | `ReceiveInvoiceRequest` | 201 `{id}` | 401, 422 |
| GET | `/invoices/` · `/{id}` | — | 200 `InvoiceDto[]` / `InvoiceDto` | 401, 404 |
| POST | `/invoices/{id}/match` | — | 200 `MatchResult` (⚠ `outcome`/`lineOutcome` SZÁM!) | 403, 404, 422 |
| POST | `/invoices/{id}/approve` | — | 200 | 422 (csak Matched-ből) |
| POST | `/invoices/{id}/approve-with-variance` | — | 200 | **403 (SoD)**, 422 (csak Exception-ből) |
| POST | `/invoices/{id}/dispute` | `{reason: string≤2000}` | 200 | 422 |

**Árlisták** (`PriceListEndpoints.cs`): `/api/procurement/price-lists` — POST `/` (201 `{id}`),
POST `/{id}/activate` (200 · **409 átfedő aktív lista**), GET `/` (200 `PriceListDto[]`),
GET `/best-price?material=&qty=&currency=` (200 `PriceListEntryDto` **VAGY `null`** — ⚠ a
Contracts-alak: `entryId`, nem `id`!). + supplier-önkiszolgáló csoport:
`/api/procurement/suppliers/{supplierId}/price-list` (POST/PUT/activate/GET).

**Match-policy** (`MatchPolicyEndpoints.cs`): GET/PUT `/api/procurement/match-policy/` →
`MatchPolicyDto {tenantId, priceTolerancePct (default 0.02), quantityToleranceAbs (default 1)}`.

**Reklamáció — gyártó oldal** (`Controllers/ComplaintsController.cs`, `[Authorize]`,
`api/procurement/complaints`, tenant=`tenant_id`; ⚠ controller-válaszokban enum = SZÁM,
request-enumok = SZÁM):

| Verb | URL | Request | Válasz |
|---|---|---|---|
| POST | `/api/procurement/complaints` | `CreateComplaintRequest` | 200 `{id}` · 400 |
| GET | `/api/procurement/complaints?status=` | (`status` NÉVVEL is jó — query-binding TypeConverter!) | 200 összegző-lista (enum SZÁM) |
| GET | `/api/procurement/complaints/{id}` | — | 200 részlet (`response`/`resolution` beágyazott) · 404 |
| POST | `/{id}/submit` · `/{id}/accept-response` · `/{id}/resolve` (`ResolveComplaintRequest`) | — | 200 · 404/400 |
| DELETE | `/api/procurement/complaints/{id}` | `{reason}` (body DELETE-en!) | 200 · 404/400 |

**Reklamáció — beszállító-portál** (`SupplierComplaintsController.cs`,
`api/supplier-portal/complaints`, minden actionön kötelező `?supplierId=` query + ownership-check
→ 403): GET lista/részlet · POST `/{id}/reviewing` · POST `/{id}/respond`
(`RespondToComplaintRequest`).

**Bérmunka (subcontract)** (`SubcontractsController.cs`): POST `/api/procurement/subcontracts`
(`CreateSubcontractRequest` → 200 `{id}`) · GET `/api/procurement/suppliers/{supplierId}/subcontracts`
· POST `.../subcontracts/{id}/accept` · POST `.../subcontracts/{id}/reject` (`{reason}`).

**ASN / áru-átvétel szkennelés** (`AsnController.cs`, `api/suppliers/asn`): POST `/generate`
(`{poId, expectedDate}` → 200 `{asn, qrPayload, printableUrl}`) · POST `/receipt/scan`
(`{qrPayload, actualQuantity}` → 200 `{valid, po:{id, materialType, quantity, unitPrice, currency}, hashVerified, nextAction:"QUANTITY_CONFIRM"}`).

**Partner-KPI** (`AnalyticsController.cs`): GET `/api/analytics/partners/{id}/kpi?period=30d|90d`
→ 200 `{onTimeDelivery:{value, trend, dataCompletenessOrMissingCount}, avgLeadTime:{days, trend}, qualityRate:{...}}` (5 perc cache).

### 4.2 Internal / integrációs végpontok (NEM portál-felület)

| Verb | URL | Védelem | Cél |
|---|---|---|---|
| POST | `/internal/from-reorder-alert` | `Authorization: Bearer <SPACEOS_INTERNAL_SECRET>` (const-time; secret hiánya → 503) + `X-SpaceOS-TenantId` = body.tenantId | inventory reorder-riasztás → `PurchaseRequisition` (`Source=ReorderAlert`, SoD-bypass); 201 `{requisitionId}` / 200 duplikátum |
| DELETE | `/internal/purchase-orders/by-tenant/{tenantId}?confirm=true` | `X-SpaceOS-Internal` + `TEST_TENANT_ALLOWLIST` | teszt-reset; `{tenantId, deletedCounts:{purchaseOrders, deliveries}}` |

Kimenő integráció: **outbox-worker** (`Infrastructure/Workers/ProcurementIntegrationWorker.cs`,
2s poll, lease+`SKIP LOCKED`, 3 próba, circuit-breaker) → 🔴 **`POST http://127.0.0.1:5004/inventory/internal/inbound`** (`InventoryInboundPath` konstans, `:31-32`) — az inventory
forrása viszont **`/internal/inbound`**-ot mappel (`ProcurementReceiverEndpoints.cs:24`; a
`/inventory` prefixet a service nem ismeri) → **a szállítás→készlet szinkron célútvonala a
forrás szerint hibás.** Élő próba (2026-07-18): MINDKÉT útvonal **404** a futó 5004-en —
vagyis a futó inventory-publish a receiver-endpointot még nem is tartalmazza (régebbi a
develop-pinnél). Kettős follow-up: WORLDS-PROC-INBOUND-PATHFIX + inventory-redeploy.

### 4.3 DTO-k (wire, camelCase)

Request-ek (minimal API):

| DTO | Mezők |
|---|---|
| `CreateSupplierRequest` | `name!: string` · `email?, phone?, address?, notes?: string` |
| `CreatePurchaseOrderRequest` | `supplierId: Guid` · `materialType: string` · `quantity, unitPrice: decimal>0` · `currency: string = "HUF"` · `expectedDeliveryDate?: DateTime` |
| `RecordDeliveryRequest` | `purchaseOrderId: Guid` · `receivedQuantity: decimal>0` · `notes?: string` · `recordedBy: string = "system"` |
| `CreateRequisitionRequest` | `lines: [{materialCode!: string≤20, quantity: int>0, estimatedUnitPrice?: decimal>0, preferredSupplierId?: Guid, notes?≤500}]≥1` · `notes?≤2000` |
| `ConvertRequisitionRequest` | `supplierId: Guid, materialType: string, quantity, unitPrice: decimal, currency = "HUF", expectedDeliveryDate?: DateTime` |
| `ReceiveInvoiceRequest` | `supplierId, purchaseOrderId: Guid` · `supplierInvoiceNumber: string≤50` · `invoiceDate: "yyyy-MM-dd"` · `dueDate?: "yyyy-MM-dd"` · `currency: ^[A-Z]{3}$` · `lines: [{materialCode≤20, purchaseOrderLineId?: Guid, quantity: int>0, unitPrice: decimal>0, lineNetAmount, lineVatAmount: decimal≥0}]` — invariáns: `lineNetAmount == round(quantity*unitPrice, 4)` |
| `CreatePriceListRequest` | `supplierId: Guid, currency: ISO, validFrom: DateOnly, validTo?: DateOnly, entries: [{materialCode≤20, unitPrice: decimal>0, minQuantity: int≥1 = 1, maxQuantity?: int}]≥1` |
| `UpdateMatchPolicyRequest` | `priceTolerancePct: decimal, quantityToleranceAbs: int` |

Request-ek (controller — **enum-mezők SZÁMKÉNT**):

| DTO | Mezők |
|---|---|
| `CreateComplaintRequest` | `supplierId, deliveryId: Guid, purchaseOrderId?: Guid` · `type: int` (ComplaintType) · `subject≤200, description≤5000: string` · `affectedQuantity: decimal>0` · `claimedAmount?: decimal` · `currency = "HUF"` · `evidencePaths?: string[]` |
| `ResolveComplaintRequest` | `resolutionType: int, resolutionAction: int, resolutionValue?: decimal, resolutionValueCurrency?, resolutionNotes?: string` |
| `RespondToComplaintRequest` | `responseType: int, responseText: string, proposedAction: int, proposedValue?: decimal, proposedValueCurrency?: string` |
| `CreateSubcontractRequest` | `supplierId: Guid, workDescription≤5000, estimatedCost: decimal>0, currency = "HUF", deadline: DateTime (jövő)` |

Válaszok:

| DTO | Mezők |
|---|---|
| `PurchaseOrderListResponse` | `id: Guid, supplierName: string, totalAmount: decimal` (=qty×unitPrice), `expectedDelivery?: DateTime, status: string, createdAt: DateTime` — ⚠ nincs soronkénti qty/lines! |
| `SupplierResponse` | `id: Guid, name, email, phone, address: string, leadTimeDays: int, rating: decimal, createdAt` |
| `RequisitionDto` | `id, tenantId: Guid, requisitionNumber, source, status, requestedBy: string, approvedBy?, approvedAt?, rejectedReason?, convertedPurchaseOrderId?: Guid, notes?, createdAt` · `lines: [{id: Guid, materialCode: string, quantity: int, estimatedUnitPrice?: decimal, preferredSupplierId?: Guid, notes?}]` — státusz STRING |
| `InvoiceDto` | `id, tenantId, supplierId, purchaseOrderId: Guid, supplierInvoiceNumber: string, invoiceDate: DateOnly, dueDate?: DateOnly, currency: string, status: string, totalNetAmount, totalVatAmount, totalGrossAmount: decimal, latestMatchId?: Guid, recordedBy: string, varianceApprovedBy?, disputeReason?, createdAt` · `lines: [{id, materialCode, purchaseOrderLineId?, quantity, unitPrice, lineNetAmount, lineVatAmount, lineGrossAmount}]` |
| `MatchResult` | `purchaseOrderId: Guid` · `outcome: int` (**MatchOutcome SZÁM: Matched=0, Exception=1**) · `varianceSummary: string` · `lines: [{materialCode, orderedQuantity, receivedQuantity, billedQuantity: int, orderedUnitPrice, billedUnitPrice: decimal, quantityVariance: int, priceVariancePct: decimal, lineOutcome: int}]` |
| `PriceListDto` | `id, tenantId, supplierId: Guid, currency, validFrom, validTo?, status: string, createdAt` · `entries: [{id: Guid, materialCode, unitPrice, minQuantity, maxQuantity?}]` |
| Reklamáció-lista (anonim objektum) | `id, complaintNumber, deliveryId, supplierId, type: int, status: int, subject, description, createdAt, hasResponse: bool, isResolved: bool` — részletnél + `affectedQuantity, claimedAmount?, currency, createdBy, evidencePaths[]`, `response?: {type: int, responseText, offeredAmount?, counterProposal?, attachmentPaths[], respondedBy, respondedAt}`, `resolution?: {type: int, summary, finalAmount?, action: int, resolvedBy, resolvedAt}` |
| Subcontract-lista | `id: Guid, orderNumber: string, status: int, workDescription: string, estimatedCost: decimal, currency: string, deadline, createdAt` |

### 4.4 Enumok (MAI wire — ANGOL string az Application-DTO-kban, SZÁM a controllerekben → ADR-059 wave 2)

| Enum | Tagok (int) | Wire MA |
|---|---|---|
| `RequisitionStatus` | `Draft=0, Approved=1, ConvertedToPO=2, Rejected=3` | string (`RequisitionDto.status`) |
| `RequisitionSource` | `Manual=0, ReorderAlert=1` | string |
| `InvoiceStatus` | `Received=0, Matched=1, Exception=2, Approved=3, Disputed=4` | string |
| `MatchOutcome` | `Matched=0, Exception=1` | **SZÁM** (`MatchResult`) |
| `PriceListStatus` | `Draft=0, Active=1, Expired=2` | string |
| `PurchaseOrderStatus` | `Draft=0, Submitted=1, Confirmed=2, Shipped=3, Delivered=4, Cancelled=5` | string (`status`) |
| `ComplaintStatus` | `Draft=0, Submitted=1, SupplierReviewing=2, SupplierResponded=3, UnderReview=4, Resolved=5, Escalated=6, Withdrawn=7` | **SZÁM** válaszban · query-filterben NÉV is jó |
| `ComplaintType` | `QualityDefect=0, QuantityShortage=1, Documentation=2, DeliveryDamage=3, Other=4` | **SZÁM** (request+response) |
| `ResolutionType` / `ResolutionAction` / `ResponseType` | `Accepted=0, Rejected=1, Compromised=2, Withdrawn=3` / `CreditNote=0, Replacement=1, Refund=2, NoAction=3` / `Accept=0, Reject=1, Partial=2, ProposalCounter=3` | **SZÁM** |
| `SubcontractStatus` | `Pending=0, Accepted=1, Rejected=2, InProgress=3, Completed=4, Cancelled=5` | **SZÁM** |

### 4.5 FSM-ek

**PurchaseRequisition** (Result-alapú, Invalid→422):

| Művelet | Honnan | Hová | Guard |
|---|---|---|---|
| `Create` | — | `Draft` | ≥1 sor |
| `Approve(approver)` | `Draft` | `Approved` | **SoD:** ha `source != ReorderAlert` és approver == requestedBy → **403 Forbidden** |
| `Reject(reason)` | `Draft`/`Approved` | `Rejected` | reason ≤2000 |
| `ConvertToPurchaseOrder(poId)` | `Approved` | `ConvertedToPO` | poId ≠ üres |

**PurchaseOrder** — ⚠ érvénytelen átmenet **InvalidOperationException-t dob** (→ 500-veszély):
`Create→Draft` · `Submit: Draft→Submitted` · `Confirm: Submitted→Confirmed` ·
`MarkShipped: Confirmed→Shipped` · `RecordDelivery: Shipped→Delivered` (+ReorderAlert-event) ·
`Cancel: bármi(≠Delivered,≠Cancelled)→Cancelled`.
🔴 A `Submit/Confirm/MarkShipped` átmenetekhez **NINCS HTTP-végpont** — a portál PO-steppere
(Submitted→Approved→Shipping→Delivered) ma se státusznévben, se műveletben nem tükrözhető.

**SupplierInvoice** (three-way match):

| Művelet | Honnan | Hová | Guard |
|---|---|---|---|
| `Receive` | — | `Received` | currency ISO, ≥1 sor, SEC-P-07 sor-összeg invariáns |
| `RunMatch` | `Received` | `Matched` (outcome=Matched) / `Exception` | küszöbök: ár ±2%, mennyiség ±1 (tenant-felülírható match-policy) |
| `Approve` | `Matched` | `Approved` | — |
| `ApproveWithVariance` | `Exception` | `Approved` | **SoD:** approver ≠ recordedBy → 403 |
| `Dispute(reason)` | `Exception` | `Disputed` | reason ≤2000 |

**PriceList:** `Create→Draft` · `Update` (csak Draft) · `Activate: Draft→Active`
(átfedő aktív lista → **409**) · `Expire: Active→Expired` (nincs HTTP-végpont).

**SupplierComplaint:** `Draft →(submit)→ Submitted →(reviewing)→ SupplierReviewing →(respond)→
SupplierResponded →(accept-response)→ UnderReview →(resolve)→ Resolved` VAGY `Escalated`
(ha resolution.type=Rejected); `Withdraw`: Submitted/SupplierReviewing/UnderReview → `Withdrawn`.

**SubcontractOrder:** `Pending →(accept)→ Accepted → InProgress → Completed` ·
`Pending →(reject)→ Rejected` · `Cancel` (nem Completed/Cancelled/Rejected) — ⚠ `StartWork`,
`Complete`, `Cancel` végpont nélkül.

### 4.6 Auth/tenant — mai állapot

- JwtBearer, `MapInboundClaims=false`, audience default `kernel-api`; `ManufacturerOnly` =
  csak authenticated; controllerek: sima `[Authorize]`.
- Tenant-claim **inkonzisztens**: ProcurementEndpoints → csak `tid` · requisition/invoice/
  price-list/match-policy → `tenant_id`→`tid` fallback · controllerek → csak `tenant_id`.
  Az RLS-interceptor viszont **`tid`-re** kulcsol (`set_config('app.current_tenant_id',…)`).
  🔴 Ha a token csak `tenant_id`-t hordoz: a controller-végpontok mennek, de az RLS-GUC üres.
  **A tokennek ma mindkét claimet hordoznia kell.**
- Complaints/Subcontracts controller üres tenantnál **nem tér vissza 401-gyel** — az RLS-re
  hagyatkozik.
- SoD-szabályok (requisition approve, invoice approve-with-variance) → 403.
- Port: repóban nincs — systemd env (5006).

---

## 5. AUTH/TENANT ÖSSZKÉP + GAP-LISTA (ADR-061/062 szemszögből)

A 4 modul **egységesen JwtBearer + claim-alapú tenant** — jobb kiindulás, mint a JT-modulok
`X-Tenant-Id` headere. DE az ADR-061/062 hosting-kör (közös `SpaceOS.Modules.Hosting` csomag)
**erre a 4 modulra még nem terjed ki**, és a részletekben driftelnek:

| Kérdés | cutting | joinery | inventory | procurement |
|---|---|---|---|---|
| Auth-séma | JwtBearer | JwtBearer | JwtBearer | JwtBearer |
| `MapInboundClaims=false` | ✅ | ❌ **hiányzik** | ✅ | ✅ |
| Audience (default) | `kernel-api` | `kernel-api` (élesben env: `spaceos-orchestrator-bff`!) | `kernel-api` | `kernel-api` |
| `ManufacturerOnly` tartalma | csak authenticated | ✅ `tenant_type=Manufacturer` claim | csak authenticated | csak authenticated |
| Tenant-claim | `tid` (+`tenant_id` executions, `tenant_id` quotes) | `tenant_id` | `tid` (adapter: `tenant_id`) | `tid` ÉS `tenant_id` vegyesen |
| RLS GUC | `app.current_tenant_id` | ⚠ **`app.tenant_id`** | `app.current_tenant_id` | `app.current_tenant_id` (`tid`-ről) |
| Auth-lyuk | 🔴 pricing-rules csoport policy nélkül · 🔴 analytics tenant=query-param | — | ⚠ offcut approve/use tenant-guard nélkül | ⚠ complaints/subcontracts üres tenantnál nem 401 |
| Internal-séma | `X-SpaceOS-Internal: <secret>` (const-time, fail-closed) | loopback + secret + `X-SpaceOS-TenantId` | 3-féle (header / `X-Internal-Service` / Bearer-secret) | Bearer-secret + `X-SpaceOS-Internal` |

**Hosting-körbe (ADR-061 follow-up) emelendő:** (1) egységes tenant-claim (`tid`, kernel-minta)
+ mindkét claim átmeneti hordozása a tokenben; (2) egységes GUC-név; (3) pricing-rules +
analytics auth-fix; (4) egységes internal-secret séma; (5) `ManufacturerOnly` valódi
tartalommal (joinery-minta); (6) joinery `MapInboundClaims=false` pótlása.

---

## 6. HIÁNY-LISTA — a portál-képernyők szemszögéből

Forrás: a portál legacy production/warehouse képernyői (`src/joinerytech-portal/src/pages/...`),
amelyek MSW-mock NÉLKÜL, élő API-hívásokkal + hardcoded fallbackkel futnak (a production és
warehouse világ NEM szerepel az MSW-handlerek közt — `onUnhandledRequest: 'bypass'`).

### 6.1 Production világ (dash · cutting · machining · workflow · analytics)

| # | Portál-igény | Backend-valóság | Gap-típus |
|---|---|---|---|
| P1 | `GET /cutting/api/cutting/plans?date=` (poll a terv-generálás után) + lista-mezők: `sheets`, `util%`, `runtime`, `progress`, `orderReference`, `customerName` | a `GET /api/cutting/plans` **nem fogad query-t**, és csak `{id, name, date, status}`-t ad — a UI ma kliens-oldalon **hamisítja** a progress/runtime-ot | endpoint-bővítés |
| P2 | machining-batch lista (BatchAssignmentBoard, stage-enkénti bontás) | **NINCS endpoint** — `mockMachiningBatches` hardcode; az assign (`POST /cutting/api/plans/{date}/assign-batch`) létezik | hiányzó endpoint |
| P3 | `GET /cutting/api/cutting/analytics/waste` (napi waste-trend `{date, wastePercent, utilization}`) | nem létezik — van `/api/cutting/waste` (3 mezős összesítő, bontás nélkül) és `/analytics/material-usage` (más alak); a kódkomment is jelzi: nincs gépenkénti bontás | alak-eltérés + hiányzó aggregátum |
| P4 | OEE: `{machineId, machineName, availability, performance, quality, oeeScore}` | `/analytics/oee` → `MachineOEEHourly` (órás bontás, `score.overall`, **nincs machineName**) + 🔴 `tenantId` query-param kötelező, a portál nem küldi → 400 | alak-eltérés + auth-gap |
| P5 | workflow: flow-epic `customer/due/assignee/priority` + stage-átmenet mutáció | kernel `/api/facilities/{id}/flow-epics` nem adja ezeket (UI hamisítja); stage-váltás endpoint nincs bekötve | kernel-scope (nem e 4 modul), jelölve |
| P6 | dashboard „Aktív megrendelések" stage-badge (`InProduction` stb.) | a joinery `DoorOrderStatus.InProduction/Completed/Cancelled` **elérhetetlen állapotok** (nincs átmenet); `createdAt`/`deliveryDate` a GET-ben nem valós | FSM-hiány + DTO-fix |
| P7 | proxy-prefix konzisztencia | cutting: `/api/cutting/...` ÉS `/cutting/api/plans/...` vegyesen — nginx strip-pel vagy nem, egyszerre nem jó mindkettő | infra-tisztázás |
| P8 | gépkezelő-lista (`GET {identity}/api/users?role=machine_operator`) | identity-service (nem e 4 modul) — függőségként jelölve | külső függőség |

### 6.2 Warehouse világ (dash/inventory · procurement · movements · lots/zones)

| # | Portál-igény | Backend-valóság | Gap-típus |
|---|---|---|---|
| W1 | készlet-lista EGY hívással + `reorderMin`, `unitPrice`, összérték-aggregátum | `GET /api/inventory/stock` **materialType-onként 1 hívás** (a portál 7 hardcoded névvel iterál); min/ár/érték mezők nincsenek — a UI hamisítja | endpoint-bővítés (stock-lista + value-summary) |
| W2 | offcut-lista (Maradékok tab — ma teljesen hardcoded) | endpoint VAN (`GET /api/inventory/offcuts/` paginált), de 🔴 **élőben 500 (route-ütközés)** | bugfix (route-collision) |
| W3 | `GET /api/inventory/movements`, `/lots`, `/zones` (4 EndpointPending stub-képernyő; kész mock-séma: `mocks/warehouse.ts` WhLot/WhMovement/zóna-enum) | **egyik sincs** — mozgás csak írható (consumption/inbound/offcut), lekérdezés nincs; lot/zóna fogalom a domainben nem létezik | hiányzó endpointok (movements olcsó — StockMovement append-only tábla már van; lots/zones scope-döntés) |
| W4 | procurement V2-útvonalak: `/api/v2/requisitions`, `/api/v2/invoices`, `/api/v2/pricelists`, továbbá `/api/suppliers`, `/api/orders/{id}`, `/api/deliveries` | a backend `/api/procurement/...` prefixen él, **v2 nem létezik**; `/api/suppliers` csak ASN-controller (más funkció) | 🔴 **path-eltérés — a portál fetcher-útvonalait a 4.1 táblához kell igazítani** |
| W5 | PO-részletek sortételekkel (`PODetailDto.lines`), delivery sortétel-szinten (`lines:[{orderLineId, deliveredQty}]`) | a PO **egysoros** (materialType+quantity), lines fogalom nincs; `GET /orders/{id}` ráadásul nem fordul (hiányzó query-típus); delivery: `{purchaseOrderId, receivedQuantity}` | modell-eltérés + 🔴 build-fix |
| W6 | PO-stepper: `Submitted→Approved→Shipping→Delivered` | backend FSM: `Draft→Submitted→Confirmed→Shipped→Delivered(+Cancelled)`, és a Submit/Confirm/MarkShipped átmenetekhez **nincs HTTP-végpont** | FSM-tükör átírás + endpoint-hiány |
| W7 | supplier-részlet (`reliabilityPct`, `activeOrderCount`, `weeklyTrend[]`) | nincs ilyen endpoint; legközelebbi: `/api/analytics/partners/{id}/kpi` (más alak) | hiányzó endpoint v. FE-átalak |
| W8 | KPI-csempék (készletérték, aktív SKU, low-stock szám) | nincs aggregátum-endpoint (a portál hardcode-olja) | hiányzó aggregátum |
| W9 | requisition/invoice/pricelist műveletek | ✅ approve/reject/convert, match/approve/dispute, activate/best-price — **léteznek**, csak a path-prefix és az enum-wire igazítandó | jó hír :) |

### 6.3 Follow-up task-jelöltek (prioritás-sorrendben)

1. **WORLDS-INV-OFFCUT-ROUTEFIX** (backend, S): a duplikált `GET /api/inventory/offcuts`
   feloldása — élő 500.
2. **WORLDS-PROC-BUILDFIX** (backend, S): `GetOrderStatusQuery` pótlása + a worker inbound-URL
   (`/inventory/internal/inbound` → `/internal/inbound`) javítása.
3. **WORLDS-CUTTING-AUTHFIX** (backend, S): pricing-rules policy + analytics tenant a claimből.
4. **WORLDS-INV-MOVEMENTS-API** (backend, M): `GET /api/inventory/movements` (+ stock-lista
   egy hívással + value-summary) — a 4 stub-képernyő közül a movements azonnal kiszolgálható.
5. **WORLDS-CUTTING-PLANLIST-ENRICH** (backend, M): plans-lista query-filter + sheets/util/
   progress mezők; machining-batch lista-endpoint.
6. **WORLDS-PO-FSM-ENDPOINTS** (backend, M): PO submit/confirm/ship végpontok + portál
   FSM-tükör egyeztetés.
7. Lots/zones: **scope-döntés** kell (domain-fogalom sincs) — EPIC-UI-WORLDS backlogba.

---

## 7. ÉLŐ SZÚRÓPRÓBÁK (VPS, 2026-07-18)

`ssh joinerytech-vps 'curl -s http://localhost:<port><route>'` — mind a 4 service fut
(127.0.0.1-bind, systemd: `spaceos-cutting-svc/-joinery/-inventory/-procurement`):

| Port | Route | Eredmény | Értelmezés |
|---|---|---|---|
| 5005 | `/healthz` | 200 `Healthy` | cutting él |
| 5005 | `/api/cutting/plans` · `/api/cutting/waste` | **401** | JWT-gate élesben aktív ✅ |
| 5005 | `/health` | 404 | healthz az útvonal, nem health |
| 5002 | `/health` | 200 `{"status":"healthy","service":"spaceos-joinery"}` | joinery él |
| 5002 | `/api/orders/` | **401** | auth aktív ✅ |
| 5004 | `/health` | 200 `Healthy` | inventory él |
| 5004 | `/api/inventory/stock` · `/api/inventory/offcuts/stats/summary` | **401** | auth aktív ✅ |
| 5004 | `/api/inventory/offcuts` | 🔴 **500** — journal: `AmbiguousMatchException` (`GetOffcuts` vs `GetOffcutList`) | élő route-ütközés, fix kell |
| 5006 | `/healthz` | 200 `"healthy"` | procurement él |
| 5006 | `/api/procurement/orders` · `/api/procurement/suppliers` | **401** | auth aktív ✅ |
| 5004 | `POST /internal/inbound` · `POST /inventory/internal/inbound` | **404 mindkettő** | a futó publish RÉGEBBI a lokális develop-pinnél (a procurement-receiver route hiányzik belőle); a forrásban ráadásul path-eltérés is van (4.2) |
| 5004 | `POST /api/inventory/offcuts/batch` (auth nélkül) | 401 | a route létezik a futó buildben ✅ |
| 5004 | `DELETE /internal/panel-stocks/by-tenant/{id}?confirm=true` (header nélkül) | 403 | internal-guard aktív ✅ |

Következtetés: a futó VPS-állapot NAGYRÉSZT konzisztens a forrással (auth-gate mindenhol, ahol
a kód szerint kell); két élő anomália: (1) az inventory offcut-route-ütközés (500), (2) a futó
inventory-publish elmarad a develop-pintől (procurement-receiver hiányzik) — redeploy-jelölt.

---

## 8. ÚTMUTATÓ A FRONTEND-AGENTNEK (zod + fetcher + FSM-tükör)

1. **Zod-sémák:** minden kulcs camelCase; enum-mezőknél NÉZD MEG a fenti táblákban, hogy az
   adott DTO-ban string-tagnév vagy szám a wire-alak — a kettő modulon belül is keveredik.
   Az enum-szótárakat egy helyre szervezd (const map modulonként), mert az ADR-059 wave 2
   (EnumWireMap, magyar kulcsok) CSERÉLNI fogja őket.
2. **Fetcherek:** a base-path-eket a 4.1/3.1/2.1/1.1 táblákból vedd (⚠ a mai portál-kód
   `/api/v2/*` és `/api/suppliers` útvonalai HIBÁSAK — W4); minden hívás `Authorization: Bearer`
   + a token hordozza a `tid` ÉS `tenant_id` claimet (5. szekció).
3. **Hibakezelés:** 400 (`errors: string[]`) ÉS 422 (`validationErrors`) is előfordul
   validációra — modulonként eltér; 409 = FSM/konkurencia-konfliktus; 410 = lejárt
   offcut-foglalás; 429 = public-quote rate-limit.
4. **FSM-tükrök:** az 1.5/2.5/3.5/4.5 átmenet-táblákból generálhatók; a portál csak olyan
   akciógombot mutasson, amihez van átmenet ÉS HTTP-végpont (⚠ PO Submit/Confirm/Ship,
   Subcontract StartWork/Complete, DoorOrder InProduction/Completed: NINCS végpont).
5. **Dátumok:** `DateOnly` = `"yyyy-MM-dd"` string; TimeSpan = `"hh:mm:ss"`; minden más ISO-8601.
6. **Ne építs** a lokális `*.Contracts` DTO-kra (in-process provider-szerződések) — csak a
   fenti wire-DTO-kra.

---

_Audit: WORLDS-API-AUDIT · backend terminál · 2026-07-18 · forrás: lokális submodule-checkoutok
(develop-pinek) + élő VPS-szúrópróba. A doksi a MAI állapotot rögzíti; az ADR-059 wave 2
(EnumWireMap) és az ADR-061/062 hosting-kör kiterjesztése ezt felül fogja írni._
