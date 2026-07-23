# WORLDS-PROC-BUILDFIX — procurement order-detail query és inbound útvonal

- **Szerep:** backend
- **Prioritás:** P0
- **Státusz:** done
- **Függőség:** `WORLDS-API-AUDIT = done`
- **Mutációs határ:** `src/spaceos-modules-procurement/` és ez a task-fájl
- **Tiltott scope:** PO több-sortételes redesign, portal, deploy

## Cél

A procurement solution tisztán forduljon; `GET /api/procurement/orders/{id}`
valós query-handlerből adjon order detailt, és a háttér-worker a tényleges
inventory internal inbound route-ot konfigurációból használja.

## Ismert hibák

- Az endpoint és tesztek `GetOrderStatusQuery` típust várnak, de a production
  source-ban nincs teljes query/handler.
- `ProcurementIntegrationWorker.InventoryInboundPath` jelenleg
  `/inventory/internal/inbound`, míg az inventory source route-ja
  `/internal/inbound`.
- A futó inventory publish még régebbi; deploy nem ennek a tasknak a része.

## Megvalósítás

1. Először rögzítsd a tiszta build pontos hibáját.
2. Implementáld a read-only order queryt az application rétegben repository
   porton át. Ne olvass DbContextet közvetlenül az endpointból.
3. A response a jelenlegi egysoros PurchaseOrder valós mezőit adja; `lines[]`
   mezőt ne találj ki.
4. Ismeretlen ID → 404; hibás Guid → 400; tenant izoláció a meglévő accessor
   szerint.
5. Az inbound base URL/path legyen validált options-konfiguráció, production
   default ne tartalmazzon localhostot. A path alapértéke a source-ban élő
   `/internal/inbound` legyen.
6. Worker tesztelje a pontos request URI-t és a retry/idempotencia viselkedést.
7. Frissítsd az OpenAPI/README-t a tényleges alakra.

## Érintett források

- `src/SpaceOS.Modules.Procurement.Api/Endpoints/ProcurementEndpoints.cs`
- új/meglevő application query mappa
- `src/SpaceOS.Modules.Procurement.Infrastructure/Workers/ProcurementIntegrationWorker.cs`
- kapcsolódó options/DI/appsettings
- `tests/.../Api/ProcurementEndpointsTests.cs`
- worker/application tesztek

## Tesztterv

```powershell
dotnet build src/spaceos-modules-procurement/SpaceOS.Modules.Procurement.sln
dotnet test src/spaceos-modules-procurement/tests/SpaceOS.Modules.Procurement.Tests/SpaceOS.Modules.Procurement.Tests.csproj --filter "FullyQualifiedName~OrderStatus|FullyQualifiedName~IntegrationWorker"
dotnet test src/spaceos-modules-procurement/tests/SpaceOS.Modules.Procurement.Tests/SpaceOS.Modules.Procurement.Tests.csproj
```

## Elfogadási kritériumok

- [ ] Tiszta solution build 0 error, 0 új warning.
- [ ] Order detail 200/400/404 kontraktus tesztelt.
- [ ] DTO csak valós domainadatot tartalmaz.
- [ ] Worker URI konfigurációból jön és `/internal/inbound`-ra mutat.
- [ ] Worker hiba esetén nem könyvel kétszer és strukturáltan logol.
- [ ] Teljes procurement suite zöld.

## Stop / eszkaláció

A több-sortételes PO modell W5 külön domain-döntés. E taskban tilos `lines[]`-t
adapterben vagy placeholderből előállítani.

## Végrehajtási napló

**1. Tiszta build reprodukálva.** `dotnet build src/spaceos-modules-procurement/SpaceOS.Modules.Procurement.sln`
két hibát adott sorban:
- `ProcurementProviderAdapter.cs(6,55): CS0234` — `GetOrderStatus` namespace nem létezik
  (a `GetOrderStatusQuery` típust az endpoint + adapter + tesztek is várták, de sosem
  volt implementálva az application rétegben).
- Az első hiba javítása után előjött egy **második, a taskban nem említett**, de ugyanabba
  a kategóriába tartozó tiszta-build hiba: `ComplaintsController.cs(7,56): CS0234` —
  `WithdrawComplaint` namespace/parancs sem létezett, pedig a controller már hívta
  (`WithdrawComplaintCommand`, `Withdraw` HTTP DELETE végpont). Mivel ez ugyanúgy
  blokkolta a "0 error" elfogadási kritériumot és a `src/spaceos-modules-procurement/`
  határon belül van, minimálisan pótoltam (a domain aggregate `SupplierComplaint.Withdraw()`
  metódusa már készen állt, csak a CQRS command+handler hiányzott — az
  `AcceptComplaintResponseCommand`/Handler mintáját követve).

**2. Order-detail query.** `GetOrderStatusQuery(TenantId, OrderId)` +
`GetOrderStatusQueryHandler` az Application rétegben, `IProcurementRepository`
porton át (`GetPurchaseOrderByIdAsync`) — nincs közvetlen DbContext-elérés az
endpointból. Response (`OrderStatusResponse`) csak a jelenlegi egysoros `PurchaseOrder`
valós mezőit adja (Id, TenantId, SupplierId, MaterialType, Quantity, UnitPrice,
Currency, Status, ExpectedDelivery, CreatedAt) — **nincs `lines[]`**.

**3. Endpoint.** `GET /api/procurement/orders/{id}`: route `{id:guid}` →
`{id}` + manuális `Guid.TryParse`, mert az ASP.NET Core `:guid` route-constraint
a hibás formátumú ID-t simán nem-matchelt route-ként (== sima 404) kezelte volna,
megkülönböztethetetlenül az "ismeretlen ID" esettől. Most: hibás Guid → **400**,
ismeretlen/másik tenant ID → **404** (`ResultToHttp.Map`, NotFound ág — nincs
cross-tenant existence-leak), auth hiány → 401. Tenant izoláció a modulban máshol is
használt claim-alapú `GetTenantId(ctx)` mintával (ua. mint `GetOrders`/`InvoiceEndpoints`).
`ProcurementProviderAdapter.GetOrderStatusAsync` is frissítve: a korábbi `Guid.Empty`
placeholder TenantId/SupplierId helyett a query valós eredményét adja tovább.

**4. Worker inbound-route fix.** `ProcurementIntegrationWorker`: a hardcode-olt
`InventoryBaseUrl = "http://127.0.0.1:5004"` + `InventoryInboundPath =
"/inventory/internal/inbound"` konstansok törölve. Helyettük `ProcurementIntegrationOptions`
(`IOptions<T>`, `[Required]` mindkét mezőn, `InventoryInboundPath` default
`/internal/inbound` — ez a valós Inventory-oldali route, ellenőrizve
`SpaceOS.Modules.Inventory.Api/Endpoints/ProcurementReceiverEndpoints.cs`-ben:
`app.MapPost("/internal/inbound", ...)`). `InventoryBaseUrl`-nek **nincs beégetett
default** — kötelező konfigból jönnie (appsettings override / env var
`ProcurementIntegration__InventoryBaseUrl` / user-secrets), így a shipped/production
default garantáltan nem localhost; hiányzó konfig esetén `ValidateOnStart()` miatt a
host induláskor fail-fast elszáll, nem néma hibás route-ra fut. DI: `AddProcurementInfrastructure`
mostantól `IConfiguration`-t is kap (`Program.cs` hívás frissítve), és
`AddOptions<ProcurementIntegrationOptions>().Bind(...).ValidateDataAnnotations().ValidateOnStart()`
regisztrálja. `appsettings.json`: új `ProcurementIntegration` szekció (`InventoryBaseUrl: ""`,
`InventoryInboundPath: "/internal/inbound"`).

**5. Tesztek.**
- `ProcurementEndpointsTests.cs`: a 2 meglévő `GetOrderStatus` teszt frissítve az új
  (TenantId, OrderId) query-aláírásra és a bővebb `OrderStatusResponse`-ra; + 2 új teszt:
  `GetOrderStatus_InvalidGuid_Returns400`, `GetOrderStatus_WithoutAuth_Returns401`.
- Új `Handlers/OrderStatusHandlerTests.cs`: valós `ProcurementRepository` + InMemory EF —
  létező rendelés a saját tenantban (real fields), ismeretlen ID → NotFound, más
  tenant alá tartozó ID → NotFound (tenant-izoláció).
- `Workers/ProcurementWorkerTests.cs` → átnevezve `ProcurementIntegrationWorkerTests.cs`
  (a taskterv `--filter "...~IntegrationWorker"` mintája korábban egyetlen worker
  tesztet sem talált volna el — az osztály neve nem tartalmazta az "IntegrationWorker"
  substringet). `BuildWorker` helper kiegészítve `IOptions<ProcurementIntegrationOptions>`
  paraméterrel; + 2 új teszt: `Worker_ShouldPostToConfiguredInventoryInboundUri` (pontos
  request URI ellenőrzése — `http://inventory-test.internal:8080/internal/inbound`, és
  hogy NEM tartalmazza a régi `/inventory/internal/inbound`-ot),
  `Worker_ShouldTrimTrailingSlashOnBaseUrl_WhenBuildingRequestUri`. A meglévő
  retry/idempotencia/duplikáció-tesztek (transient 503 retry, permanent 422 no-retry,
  duplicate 200 → Completed, tenant-mismatch abort, lease-reclaim nem duplázza az
  AttemptCount-ot) változatlanul lefutnak és zöldek.
- **Flaky teszt felfedve és javítva**: a teljes suite futtatásakor 2 különböző futáson
  2 különböző `InternalReceiverTests` teszt bukott 401-gyel (`SPACEOS_INTERNAL_SECRET`
  env var race — `InternalReceiverTests` és a worker-teszt osztály is ugyanazt a
  process-szintű env vart állítja/törli ctor/Dispose-ban, xUnit pedig alapból
  párhuzamosan futtatja a különböző teszt-osztályokat). Ez a hiba nem az én
  kódváltoztatásomtól ered (mindkét osztály már korábban is ezt a mintát használta),
  de a suite-nak zöldnek kell lennie, ezért hozzáadtam egy `xunit.runner.json`-t
  (`parallelizeAssembly: false`, `parallelizeTestCollections: false`), ami
  determinisztikusan megszünteti a race-t.

**Mutációs határ betartva:** kizárólag `src/spaceos-modules-procurement/` alatt
történt módosítás + ez a task-fájl. Az `EPICS.yaml`, `.codex/`, `AGENTS.md` érintetlen.

## Átadási bizonyíték

**Tiszta build (bin/obj törölve, majd újra `dotnet build`):**
```
dotnet build src/spaceos-modules-procurement/SpaceOS.Modules.Procurement.sln
→ Build succeeded.
    0 Warning(s)
    0 Error(s)
```

**Célzott teszt-szűrő (a taskterv szerinti pontos parancs):**
```
dotnet test src/spaceos-modules-procurement/tests/SpaceOS.Modules.Procurement.Tests/SpaceOS.Modules.Procurement.Tests.csproj \
  --filter "FullyQualifiedName~OrderStatus|FullyQualifiedName~IntegrationWorker"
→ Passed! - Failed: 0, Passed: 19, Skipped: 0, Total: 19
```

**Teljes procurement suite:**
```
dotnet test src/spaceos-modules-procurement/tests/SpaceOS.Modules.Procurement.Tests/SpaceOS.Modules.Procurement.Tests.csproj
→ Passed! - Failed: 0, Passed: 162, Skipped: 0, Total: 162
```
(kétszer lefuttatva egymás után, mindkétszer zöld — a korábbi env-var race
megszűnt a `xunit.runner.json` bevezetése után.)

**Elfogadási kritériumok:**
- [x] Tiszta solution build 0 error, 0 új warning.
- [x] Order detail 200/400/404 kontraktus tesztelt (`GetOrderStatus_Returns200`,
      `GetOrderStatus_InvalidGuid_Returns400`, `GetOrderStatus_NotFound_Returns404`,
      `GetOrderStatus_WithoutAuth_Returns401`).
- [x] DTO csak valós domainadatot tartalmaz (`OrderStatusResponse` ↔ `PurchaseOrder`
      aggregate mezői 1:1, nincs `lines[]`).
- [x] Worker URI konfigurációból jön és `/internal/inbound`-ra mutat
      (`Worker_ShouldPostToConfiguredInventoryInboundUri`).
- [x] Worker hiba esetén nem könyvel kétszer (`Worker_AttemptCount_ShouldNotDoubleCountOnReclaim`,
      `Worker_WhenDuplicate200_ShouldMarkCompleted`) és strukturáltan logol (meglévő
      `_logger.LogError/LogWarning/LogCritical` named-placeholder hívások, SEC-P-11
      scrub változatlan).
- [x] Teljes procurement suite zöld (162/162).

