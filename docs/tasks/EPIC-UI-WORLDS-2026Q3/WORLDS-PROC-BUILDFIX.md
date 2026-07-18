# WORLDS-PROC-BUILDFIX — procurement order-detail query és inbound útvonal

- **Szerep:** backend
- **Prioritás:** P0
- **Státusz:** pending
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

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő._

