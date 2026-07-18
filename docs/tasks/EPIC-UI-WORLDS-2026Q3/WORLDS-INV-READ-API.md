# WORLDS-INV-READ-API — warehouse stock, movement és KPI read model

- **Szerep:** backend
- **Prioritás:** P1
- **Státusz:** pending
- **Függőség:** `WORLDS-INV-OFFCUT-ROUTEFIX`
- **Mutációs határ:** `src/spaceos-modules-inventory/` és ez a task-fájl
- **Tiltott scope:** lots/zones domain, árképzés forrás nélküli kitalálása,
  portal

## Cél

A warehouse portál egyetlen paginált készletlistából, lekérdezhető
mozgásnaplóból és őszinte KPI summaryból tudjon dolgozni hét hardcoded
materialType hívás helyett.

## Kontraktus

Új vagy bővített read-only végpontok:

- `GET /api/inventory/stock?materialType=&q=&page=&pageSize=`
- `GET /api/inventory/movements?materialType=&type=&from=&to=&page=&pageSize=`
- `GET /api/inventory/summary`

Az endpointok csak meglévő `PanelStock` és append-only `StockMovement` adatból
számolhatnak. `unitPrice`, `stockValue`, `reorderMin` csak bizonyított adatforrás
esetén kerülhet response-ba; különben nullable/hiány és dokumentált gap.

## Megvalósítás

1. DTO és query contract tesztből indulj: camelCase, enum-wire a 3.4 szekció
   szerint, stabil pagination metadata.
2. Repository/specification rétegben végezd a tenant- és filterszűrést; ne
   materializáld memóriába a teljes táblát.
3. Movement sort determinisztikusan `occurredAt desc, id desc`.
4. Summary minimum: aktív materialType/SKU count, total quantity értelmezett
   mértékegységgel, low-stock csak létező threshold esetén. Eltérő egységeket ne
   összegezz értelmetlenül.
5. Date range és pageSize config/validation: hibás input 400, túl nagy pageSize
   korlátozva vagy 400 a dokumentált policy szerint.
6. Tenant A/B integration teszt kötelező.
7. OpenAPI és kontraktusdoksi frissítendő.

## Tesztterv

```powershell
dotnet test src/spaceos-modules-inventory/tests/SpaceOS.Modules.Inventory.Tests/SpaceOS.Modules.Inventory.Tests.csproj --filter "FullyQualifiedName~Stock|FullyQualifiedName~Movement|FullyQualifiedName~Summary"
dotnet test src/spaceos-modules-inventory/tests/SpaceOS.Modules.Inventory.Tests/SpaceOS.Modules.Inventory.Tests.csproj
dotnet build src/spaceos-modules-inventory/SpaceOS.Modules.Inventory.sln
```

## Elfogadási kritériumok

- [ ] Egy hívásos paginált stock-lista működik szerveroldali filterrel.
- [ ] Movement read endpoint append-only adatból, stabil sorrenddel működik.
- [ ] Summary nem ad hamis árat vagy készletértéket.
- [ ] Pagination/input/tenant kontraktus tesztelt.
- [ ] Teljes inventory suite zöld, queryk nem N+1-ek.

## Stop / eszkaláció

Ár/reorder/lots/zones adat hiányában rögzíts gapet; e task nem bővítheti a
domaint bizonyíték nélküli mezőkkel.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő._

