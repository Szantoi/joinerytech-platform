# WORLDS-INV-OFFCUT-ROUTEFIX — inventory offcut route-ütközés megszüntetése

- **Szerep:** backend
- **Prioritás:** P0
- **Státusz:** pending
- **Függőség:** `WORLDS-API-AUDIT = done`
- **Mutációs határ:** `src/spaceos-modules-inventory/` és ez a task-fájl
- **Tiltott scope:** portal, inventory domain újratervezés, VPS deploy

## Cél

`GET /api/inventory/offcuts` pontosan egy endpointot válasszon, és az élőben
megfigyelt `AmbiguousMatchException` helyett paginált, zod-kompatibilis 200 választ
adjon.

## Gyökérok és kanonikus döntés

- `InventoryEndpoints.cs` mapeli: `GET /api/inventory/offcuts?materialType=`.
- `OffcutEndpoints.cs` mapeli ugyanazt a route-ot `/` alakban, paginálva.
- Portál-szerződésnek a `GetOffcutListQuery` paginált válasza a kanonikus.
- A régi `GetOffcutsQuery` belső provider-használata megmaradhat, de nem birtokolhat
  azonos publikus HTTP route-ot.

## Megvalósítás

1. Írj endpoint-regressziós tesztet, amely a teljes route-regisztrációval hívja a
   `/api/inventory/offcuts` útvonalat és bizonyítja, hogy nincs ambiguity.
2. Tartsd meg a paginált `OffcutEndpoints.GetOffcutList` publikus route-ot.
3. A legacy HTTP mapet szüntesd meg vagy adj neki explicit, dokumentált
   kompatibilitási útvonalat; a belső `IInventoryProvider` és handler ne törjön.
4. A query-paraméterek: `status`, `materialCode`, `minVolumeM3`, `createdAfter`,
   `page`, `pageSize`. Ismeretlen/érvénytelen érték kontrollált 400 legyen.
5. A trailing slash mindkét alakja ugyanazt az endpointot érje el, redirect-loop
   nélkül.
6. Frissítsd az API/kontraktus dokumentációt csak a tényleges route alapján.

## Érintett források

- `src/SpaceOS.Modules.Inventory.Api/Endpoints/InventoryEndpoints.cs`
- `src/SpaceOS.Modules.Inventory.Api/Endpoints/OffcutEndpoints.cs`
- `tests/SpaceOS.Modules.Inventory.Tests/Api/InventoryEndpointsTests.cs`
- `tests/SpaceOS.Modules.Inventory.Tests/Api/OffcutEndpointsTests.cs`

## Tesztterv

```powershell
dotnet test src/spaceos-modules-inventory/tests/SpaceOS.Modules.Inventory.Tests/SpaceOS.Modules.Inventory.Tests.csproj --filter "FullyQualifiedName~Offcut"
dotnet test src/spaceos-modules-inventory/tests/SpaceOS.Modules.Inventory.Tests/SpaceOS.Modules.Inventory.Tests.csproj
dotnet build src/spaceos-modules-inventory/SpaceOS.Modules.Inventory.sln
```

## Elfogadási kritériumok

- [ ] `/api/inventory/offcuts` route-egyediség automatikusan tesztelt.
- [ ] Paginált lista 200; hibás filter/page 400; ismeretlen ID 404.
- [ ] Belső inventory provider regresszió nélkül működik.
- [ ] Teljes inventory suite és build zöld, új warning nincs.
- [ ] Task-doksi rögzíti a végleges route-ot és kompatibilitási döntést.

## Stop / eszkaláció

Ha külső fogyasztó bizonyíthatóan a legacy response shape-et használja, ne törj
wire-kontraktust: külön deprecált route és migrációs terv szükséges.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő._

