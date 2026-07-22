# WORLDS-INV-READ-API — warehouse stock, movement és KPI read model

- **Szerep:** backend
- **Prioritás:** P1
- **Státusz:** done — root önállóan újraépítette+futtatta (build 0/0, 219/219),
  mergelve spaceos-modules-inventory@cbae55f
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

- [x] Egy hívásos paginált stock-lista működik szerveroldali filterrel.
- [x] Movement read endpoint append-only adatból, stabil sorrenddel működik.
- [x] Summary nem ad hamis árat vagy készletértéket.
- [x] Pagination/input/tenant kontraktus tesztelt.
- [x] Teljes inventory suite zöld, queryk nem N+1-ek.

## Stop / eszkaláció

Ár/reorder/lots/zones adat hiányában rögzíts gapet; e task nem bővítheti a
domaint bizonyíték nélküli mezőkkel.

## Végrehajtási napló

**Domain-feltárás:** `PanelStock` (Domain/Aggregates/PanelStock.cs) csak `MaterialCatalogId`-t
tárol (nem materialType stringet), és minden `RecordInbound`/`RecordConsumption` hívás **új**
sort hoz létre (nem merge-el egy meglévővel) — tehát egy tenant egy materialType-hoz több
`PanelStock` sort is birtokolhat, aggregálni kell. `MaterialCatalog` (Domain/Aggregates/
MaterialCatalog.cs) **tenant-független megosztott referenciaadat** (RlsIsolationTests.
MaterialCatalog_HasNoTenantId_IsSharedAcrossTenants ezt már explicit bizonyítja), és **valódi,
perzisztált** `UnitCost` + `ReorderPoint` + `UnitOfMeasure` mezőkkel rendelkezik (lásd
`MaterialCatalogConfiguration.cs` `HasData` seedje: pl. MDF 18mm → UnitCost=8500,
ReorderPoint=5, UnitOfMeasure="pcs") — ez a bizonyított adatforrás `unitPrice`/`reorderMin`-hez,
nem kitalált érték. A meglévő `StockType.Offcut` ág a `PanelStock`-on **élő kód által ma már nem
töltött** legacy útvonal (a `RecordOffcutCommandHandler` a v2 `Offcut` aggregátumot hozza létre,
nem `PanelStock`-ot) — mivel a task explicit korlátozza az adatforrást PanelStock+StockMovement-re
("Az endpointok csak meglévő PanelStock és append-only StockMovement adatból számolhatnak"), az
Offcut-aggregátum/lots-zones-szerű adat szándékosan **nincs** bevonva ebbe a három endpointba.

**Meglévő HTTP-kontraktus ütközése (`GET /api/inventory/stock`):** a régi `GetStockQuery`
(Application/Queries/GetStock) egyetlen materialType-ra ad vissza egyetlen `StockLevelResponse`-t,
és **nem tenant-szűrt** — ezt hívta a portál 7-szer, materialType-onként egyszer. Ez a
query/handler/DTO **in-process kontraktus is** (`InventoryProviderAdapter.GetStockAsync` MediatR-en
keresztül hívja), tehát törlése/módosítása regressziót okozott volna más modulokban. Döntés: a
HTTP `GET /api/inventory/stock` route-ot **átkötöttem** egy új `GetStockListQuery`-re (paginált,
tenant-szűrt, materialType/q filterrel); a régi `GetStockQuery`/`StockLevelResponse` **változatlanul
megmaradt**, csak HTTP-n keresztül többé nem érhető el — az in-process
`InventoryProviderAdapter`-használat érintetlen. Ez a döntés magyarázza, miért lett módosítva a
meglévő `InventoryEndpointsTests.cs` két tesztje (`GetStock_WithValidMaterial_Returns200`,
`GetStock_ReturnsNotFound_WhenMaterialMissing`) — az új szerződés lista-alakú (ismeretlen
materialType-filter → üres lap 200-cal, nem 404, mert nincs "egyetlen erőforrás" fogalom egy
listánál).

**Tenant- és filterszűrés a repository-rétegben (2. korlát):** `IInventoryRepository` három új
metódussal bővült (`GetStockPageAsync`, `GetAllStockAggregatesAsync`, `GetMovementsPageAsync`).
A `PanelStock`↔`MaterialCatalog` join + `Where(TenantId==)` + materialType/q-szűrés egyetlen
SQL-fordítható LINQ-lekérdezés (soha nem materializálja a teljes `PanelStocks` táblát — csak a
tenant saját, már megszűrt sorai kerülnek memóriába). **Fontos korrekció menet közben:** az első
implementáció a `GroupBy` + konstruktorban futó feltételes `Sum` mintát próbálta SQL-szinten
lefordítani (`.Select(g => new StockCatalogAggregate(..., g.Sum(x => cond ? x.Quantity : 0), ...))`)
— ez **8 teszt hibájával bukott el**: az EF Core InMemory provider
`InvalidOperationException: ... could not be translated`-t dobott rá (ez a minta a `GroupBy`
utáni konstruktor-projekcióban ismert InMemory-korlát). Javítás: a join+where-szűrt sorokat flat
alakban (`ToListAsync`) kérem le, és a csoportosítást/összegzést utána, memóriában (LINQ-to-Objects)
végzem — ez már azonos módon működik InMemory és (várhatóan) Npgsql alatt is, mert nem
provider-specifikus fordítási képességre támaszkodik. A `GetMovementsPageAsync` egyszerűbb
(nincs aggregáció, csak szűrt sorlista), ott a `Where`+`OrderByDescending`+`Skip`/`Take`
végig SQL-fordítható maradt.

**Determinisztikus movement-sorrend (3. korlát):** `OrderByDescending(m => m.OccurredAt)
.ThenByDescending(m => m.Id)`. Külön teszt (`Movements_DeterministicTieBreak_ByIdDescWhenOccurredAtEquals`)
két, **azonos** `OccurredAt`-tal rendelkező movement-tel bizonyítja a tie-breaket — a repository-t
közvetlenül hívja (nem HTTP-n), mert a Guid-eket nem tudjuk előre kontrollálni, az elvárt sorrendet
a ténylegesen létrehozott ID-k összehasonlításából számítja.

**Summary — becsületes KPI-k (4. korlát):**
- `activeMaterialTypeCount` = a tenant saját `PanelStock` sorral rendelkező katalógustételeinek száma.
- `totalQuantityByUnit`: **NEM egyetlen összesített szám** — `UnitOfMeasure` szerint bucketelt
  tömb, mert a nyers mennyiség nem összegezhető értelmesen eltérő mértékegységű anyagok között
  (a task 4. korlátja explicit tiltja ezt). Ma minden seed-katalógustétel "pcs", tehát gyakorlatban
  egyetlen bucket jön ki, de a forma jövőbiztos.
- `lowStockCount`: `totalQuantity <= MaterialCatalog.ReorderPoint` — ez **valós, perzisztált mező**,
  DE **más**, mint a `PanelStock.ConsumeQuantity`-ban hardkódolt `<= 5` küszöb, ami a
  `LowStockAlertEvent`-et váltja ki. Ez a doménben már korábban is meglévő inkonzisztencia
  (két különböző "low stock" fogalom), amit ez a task **nem** javít (kívül esik a scope-on) —
  a `CONTRACTS-WORLDS-INV-READ-API.md`-ban és a query XML-kommentjében is dokumentálva.
- `totalStockValue`: `Σ(totalQuantity × UnitCost)` — ez **currency-egységben** biztonságosan
  összegezhető eltérő fizikai mértékegységű anyagok között is (a pénz az egységes közös
  mértékegység), DE a doménben **sehol nincs pénznem-kód tárolva** — ezt dokumentált gap-ként
  rögzítettem (nem kitalált adat, csak implicit "a tenant egyetlen pénzneme" feltételezés).
- `unitPrice`/`reorderMin` (stock-listán) = `MaterialCatalog.UnitCost`/`ReorderPoint` — valós
  forrás, nem fabrikált. Nincs se per-tenant ár-felülírás, se lots/zones adat a doménben, ezeket
  ezért nem is tettem bele.

**Pagination/validáció policy (5. korlát — döntés + dokumentálva):** `pageSize` a `[1,100]`
tartományon kívül → **400** (nem csendes clamp), `page < 1` → 400 — ez pontosan ugyanaz a policy,
amit a `WORLDS-INV-OFFCUT-ROUTEFIX` már bevezetett a `GET /api/inventory/offcuts`-hoz
(`OffcutEndpoints.GetOffcutList`), így a teljes modulnak **egy** lapozási szerződése van, nem kettő
versengő. `from`/`to` dátumokat explicit `string?` paraméterként veszem át (nem `DateTime?`-ként),
mert a minimal API natív kötése egy hibás dátumstringet nullable `DateTime?`-nál **csendben
null-ra** old fel (nem 400-ra) — ez sértette volna az "hibás input → 400" elvárást. Explicit
`DateTime.TryParse` + 400 hibaüzenet pótolja ezt; `from > to` → szintén 400.

**Tenant A/B integrációs teszt (6. korlát — kötelező):** új fájl —
`tests/SpaceOS.Modules.Inventory.Tests/Api/StockMovementSummaryEndpointsTests.cs` +
`TenantHeaderAuthHandler.cs` (teszt-only auth handler, ami egy `X-Test-Tenant` fejlécből olvassa
a `tid` claimet — ellentétben a meglévő `TestAuthHandler`-rel, ami híváskor véletlenszerű tenantot
generál, itt egyetlen teszt-process két, egymástól függetlenül vezérelt tenant nevében tud
hitelesíteni). Ez **valódi** MediatR-handlereket + **valódi** EF Core repository-t (InMemory
provider) + **valódi** HTTP-routingot futtat — csak maga a JWT-validáció van kicserélve. Lefedi:
mindhárom endpoint tenant-izolációját (A nem látja B adatait és fordítva), materialType
space-normalizálást, `q` szabadszavas keresést, a determinisztikus movement-sorrendet, és a
valós `unitPrice`/`reorderMin` forrást.

**Kontraktusdoksi (7. korlát):** mivel a `docs/knowledge/architecture/
WORLDS_API_CONTRACTS_2026-07-18.md` a platform-gyökérben van, **kívül esik** ennek a feladatnak a
mutációs határán (`src/spaceos-modules-inventory/` + ez a task-fájl) — ezért **nem módosítottam**
azt (ugyanaz a döntés, mint amit a `WORLDS-INV-OFFCUT-ROUTEFIX` is meghozott ugyanerre a fájlra).
Helyette a modulon belül hoztam létre egy kontraktus-dokumentumot:
`src/spaceos-modules-inventory/docs/CONTRACTS-WORLDS-INV-READ-API.md` (a modulnak nincs Swagger/
OpenAPI-generálása — minimal API, nincs `AddSwaggerGen` — ez a markdown a legközelebbi
kontraktus-artefaktum).
⚠️ **Follow-up a root/conductor felé:** a `WORLDS_API_CONTRACTS_2026-07-18.md` §3.1/§3.3 még a
régi, egy-materialType-os `GET /api/inventory/stock` szerződést dokumentálja — ezt egy külön,
kis doksi-frissítő feladatban kell szinkronizálni az itt leírt új szerződéssel.

**Nem tiltott scope-ba lógó döntés, dokumentálva:** a stock-lista **csak** azokat a
katalógustételeket listázza, amelyekhez a tenantnak van legalább egy `PanelStock` sora (nem az
összes megosztott katalógustételt) — ez a "stock lista", nem "katalógus-böngésző" értelmezés
tudatos döntés, hogy a válasz a tenant tényleges készletét tükrözze.

## Átadási bizonyíték

**Build:**
```
dotnet build src/spaceos-modules-inventory/SpaceOS.Modules.Inventory.sln
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

**Teszt — "before" (a változtatások előtt, `git stash`-elt alapállapot-mérés):**
```
dotnet test src/spaceos-modules-inventory/tests/SpaceOS.Modules.Inventory.Tests/SpaceOS.Modules.Inventory.Tests.csproj
Passed! - Failed: 0, Passed: 198, Skipped: 0, Total: 198
```

**Teszt — "after" (a feladat kódja után), a task doc saját tesztterve szerint futtatva:**
```
dotnet test src/spaceos-modules-inventory/tests/SpaceOS.Modules.Inventory.Tests/SpaceOS.Modules.Inventory.Tests.csproj --filter "FullyQualifiedName~Stock|FullyQualifiedName~Movement|FullyQualifiedName~Summary"
Passed! - Failed: 0, Passed: 59, Skipped: 0, Total: 59

dotnet test src/spaceos-modules-inventory/tests/SpaceOS.Modules.Inventory.Tests/SpaceOS.Modules.Inventory.Tests.csproj
Passed! - Failed: 0, Passed: 219, Skipped: 0, Total: 219

dotnet build src/spaceos-modules-inventory/SpaceOS.Modules.Inventory.sln
Build succeeded. 0 Warning(s), 0 Error(s)
```
(219 = 198 előtti − 2 elavult, a régi `/stock`-kontraktusra épülő teszt eltávolítva
(`GetStock_WithValidMaterial_Returns200`, `GetStock_ReturnsNotFound_WhenMaterialMissing`) + új
tesztek két fájlban: `InventoryEndpointsTests.cs` mostantól 16 `[Fact]`-et tartalmaz — a 3 új
endpoint mocked-mediator 200/400 validációs lefedettsége —, és egy vadonatúj fájl,
`StockMovementSummaryEndpointsTests.cs`, 13 `[Fact]`-tel — a valódi, DB-alapú tenant A/B
integrációs bizonyíték mindhárom endpointra. A mérvadó szám a ténylegesen lefutott, zöld
219/219, lásd fent.)

**Elfogadási kritériumok — ellenőrizve:**
- [x] Egy hívásos paginált stock-lista működik szerveroldali filterrel — `GET /api/inventory/stock`
      (`GetStockListQuery`/`GetStockListQueryHandler`, `Stock_TenantA_SeesOnlyOwnCatalogsAndCorrectTotals`,
      `Stock_MaterialTypeFilter_NormalizesSpaces`, `Stock_FreeTextQuery_MatchesDescription`).
- [x] Movement read endpoint append-only adatból, stabil sorrenddel működik —
      `GET /api/inventory/movements` (`occurredAt desc, id desc`,
      `Movements_DeterministicTieBreak_ByIdDescWhenOccurredAtEquals`).
- [x] Summary nem ad hamis árat vagy készletértéket — `unitPrice`/`reorderMin`/`totalStockValue`
      mind `MaterialCatalog.UnitCost`/`ReorderPoint`-ból származik, dokumentált gap a
      pénznem-kód hiányára; `totalQuantityByUnit` nem összegez eltérő mértékegységeket.
- [x] Pagination/input/tenant kontraktus tesztelt — 8 db 400-teszt (page/pageSize/type/dátum) +
      teljes tenant A/B izolációs szvit mindhárom endpointra.
- [x] Teljes inventory suite zöld (219/219), queryk nem N+1-ek — stock: 1 SQL join-lekérdezés +
      (summary esetén) semmi extra; movements: 2 lekérdezés (count + page) + 1 kis
      katalógus-lookup név-feloldáshoz (nem soronkénti).

**Módosított/létrehozott fájlok** (`src/spaceos-modules-inventory/` alatt):
- `src/SpaceOS.Modules.Inventory.Domain/Interfaces/IInventoryRepository.cs` (módosítva)
- `src/SpaceOS.Modules.Inventory.Domain/ReadModels/StockCatalogAggregate.cs` (új)
- `src/SpaceOS.Modules.Inventory.Infrastructure/Repositories/InventoryRepository.cs` (módosítva)
- `src/SpaceOS.Modules.Inventory.Application/Queries/GetStockList/*.cs` (új)
- `src/SpaceOS.Modules.Inventory.Application/Queries/GetMovementList/*.cs` (új)
- `src/SpaceOS.Modules.Inventory.Application/Queries/GetInventorySummary/*.cs` (új)
- `src/SpaceOS.Modules.Inventory.Api/Endpoints/InventoryEndpoints.cs` (módosítva — `/stock`
  átkötve, `/movements` + `/summary` új)
- `tests/SpaceOS.Modules.Inventory.Tests/Api/InventoryEndpointsTests.cs` (módosítva)
- `tests/SpaceOS.Modules.Inventory.Tests/Api/StockMovementSummaryEndpointsTests.cs` (új)
- `tests/SpaceOS.Modules.Inventory.Tests/Api/TenantHeaderAuthHandler.cs` (új)
- `docs/CONTRACTS-WORLDS-INV-READ-API.md` (új)

