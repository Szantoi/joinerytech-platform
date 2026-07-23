# WORLDS-INV-OFFCUT-ROUTEFIX — inventory offcut route-ütközés megszüntetése

- **Szerep:** backend
- **Prioritás:** P0
- **Státusz:** done (2026-07-21, agent-végrehajtás — root-ellenőrzésre vár)
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

- [x] `/api/inventory/offcuts` route-egyediség automatikusan tesztelt.
- [x] Paginált lista 200; hibás filter/page 400; ismeretlen ID 404.
- [x] Belső inventory provider regresszió nélkül működik.
- [x] Teljes inventory suite és build zöld, új warning nincs.
- [x] Task-doksi rögzíti a végleges route-ot és kompatibilitási döntést.

## Stop / eszkaláció

Ha külső fogyasztó bizonyíthatóan a legacy response shape-et használja, ne törj
wire-kontraktust: külön deprecált route és migrációs terv szükséges.

## Végrehajtási napló

**Gyökérok megerősítve:** `Program.cs` a `SpaceOS.Modules.Inventory.Api` projektben egymás
után hívja `app.MapInventoryEndpoints()`-t és `app.MapOffcutEndpoints()`-t. Az előbbi
`group.MapGet("/offcuts", GetOffcuts)`-ot mapelt (backing: `GetOffcutsQuery`,
`materialType` filter, lapos `OffcutResponse[]` válasz), az utóbbi
`group.MapGet("/", GetOffcutList)`-et a `/api/inventory/offcuts` group-prefixen belül
(backing: `GetOffcutListQuery`, paginált `GetOffcutListResponse`). Mindkettő pontosan a
`GET /api/inventory/offcuts` útvonalra matchelt → élő `AmbiguousMatchException`. Egyik
meglévő teszt sem fedte le ezt, mert az `InventoryEndpointsTests` és az `OffcutEndpointsTests`
mindegyike külön, minimális `WebApplication`-t épít és **csak a saját** `MapXxxEndpoints()`-jét
regisztrálja — a valódi `Program.cs`-t (mindkét mapping együtt) korábban semmilyen teszt nem
építette fel.

**Külső fogyasztó ellenőrzése (a Stop/eszkaláció-klauzula szerint kötelező lépés) —
bizonyítottan VAN ilyen:** `src/spaceos-modules-cutting/src/SpaceOS.Modules.Cutting.Infrastructure`
`ServiceCollectionExtensions.cs` regisztrál egy `"InventoryProvider.Legacy"` néven elnevezett,
típusos `HttpClient`-et `OldInventoryProvider` (`SpaceOS.Modules.Inventory.Contracts.Providers.
IInventoryProvider`) implementációként — ez az `InventoryProviderHttpAdapter`. Ennek
`GetOffcutsAsync` metódusa élesben hívja: `GET /api/inventory/offcuts?materialType=...`, és
egy **lapos JSON tömböt** vár (`OffcutApiResponse[]`: `Id, WidthMm, HeightMm, MaterialCatalogId,
OriginCuttingSheetId`) — pontosan a régi `GetOffcutsQuery`/`OffcutResponse` alakja. Ezt az
`IInventoryProvider`-t éles, aktív alkalmazáskód fogyasztja (`PanelSourceService`,
`GetNestingResultQueryHandler`, `ReservePanelsCommandHandler` — nesting/panel-forrás logika),
NEM holt kód, és a `InventoryProviderHttpAdapterTests.cs` (WireMock-alapú) külön teszteli is
ezt a szerződést. A `spaceos-modules-cutting` a mutációs határon KÍVÜL esik (nem
módosítható), tehát a régi válaszalakot a KANONIKUS route-on kell tovább kiszolgálni —
törlés a Stop-klauzula szerint tilos volt.

**Kanonikus döntés végrehajtva:** a `GET /api/inventory/offcuts` (+ `/`) route egyetlen
tulajdonosa mostantól `OffcutEndpoints.GetOffcutList`. Mivel a régi és az új szerződés
soha nem osztozik ugyanazon query-paraméteren (a régi kizárólag `materialType`-ot használ,
az új `materialCode`-ot), a `materialType` jelenléte egyértelmű, dokumentált jelzés a
handleren belül: ha `materialType` érkezik, a handler a `GetOffcutsQuery`-t hívja meg és a
régi lapos tömb-alakot adja vissza (DEPRECATED, kódkommenttel jelölve); egyébként a
paginált `GetOffcutListQuery` fut. Így **egyetlen HTTP-route mapping** birtokolja az
útvonalat (nincs route-ütközés), és a cutting-modul wire-kontraktusa nem törik.

**`InventoryEndpoints.cs`:** a `group.MapGet("/offcuts", GetOffcuts)` sor és a hozzá tartozó
privát `GetOffcuts` metódus törölve (dokumentált kódkommenttel a helyén). A `GetOffcutsQuery`/
`GetOffcutsQueryHandler` (Application-réteg) **megmaradt** — az `InventoryProviderAdapter`
(in-process `IInventoryProvider` implementáció) továbbra is MediatR-en keresztül hívja,
regresszió nélkül.

**Validáció (item 4 — kontrollált 400):** a kanonikus ágon explicit ellenőrzés került be:
ismeretlen `status` (nem parse-olható `OffcutStatus`-ra) → 400 névsorolt hibaüzenettel;
`page < 1` → 400; `pageSize` a `[1,100]` tartományon kívül → 400 (a repository úgyis 100-ra
clampel, most már a határon kívüli érték explicit hiba, nem csendes clamp); `minVolumeM3 < 0`
→ 400. A nem szám query-értékek (`page=abc` stb.) az ASP.NET Core minimal API natív
paraméter-kötési hibakezelése miatt már eleve 400-at adnak — ezt regressziós teszt is
lefedi.

**Trailing slash (item 5):** mindkét alak (`/api/inventory/offcuts` és
`/api/inventory/offcuts/`) ugyanarra az endpointra fut (a `MapGroup("/api/inventory/offcuts")`
+ `MapGet("/")` kombináció ASP.NET Core-ban egyetlen route-mintát eredményez) — mindkettő
200-at ad, redirect nélkül; ezt a `OffcutRouteRegistrationTests` explicit, `AllowAutoRedirect:
false` kliens-beállítással teszteli.

**Regressziós teszt (item 1, elfogadási kritérium #1):** új fájl —
`tests/SpaceOS.Modules.Inventory.Tests/Api/OffcutRouteRegistrationTests.cs`. Ez a VALÓDI
`Program`-ot építi fel (`InventoryWebFactory : WebApplicationFactory<Program>`, amit
`sealed`-ből unsealed-re alakítottam, hogy egy `AuthenticatedInventoryWebFactory` alosztály
JWT helyett determinisztikus teszt-authot regisztrálhasson) — tehát pontosan az a
route-kompozíció fut, ami élesben az `AmbiguousMatchException`-t dobta. A teszt:
(a) `EndpointDataSource`-ok bejárásával bizonyítja, hogy pontosan EGY GET-endpoint tartozik
a `/api/inventory/offcuts` route-mintához; (b) valódi HTTP-hívással igazolja mindkét
trailing-slash alak 200-as válaszát; (c) a legacy `materialType`-ágat és a paginált ágat is
lefedi (alak-ellenőrzéssel: tömb vs. objektum); (d) az összes 400-forgatókönyvet; (e) egy
ismeretlen offcut-ID 404-et ad valós (üres, in-memory) DB-vel. In-memory EF Core-t használ —
**nincs Testcontainers/Docker-függés** ebben a fájlban.

**Meglévő tesztek karbantartása:** `InventoryEndpointsTests.GetOffcuts_Returns200` törölve
(elavult volt — a route már nem az `InventoryEndpoints`-ben él; az izolált app-builder emiatt
404-et adott volna). Az `OffcutEndpointsTests.cs`-be 5 új teszt került (legacy `materialType`
ág + 4 validációs 400-teszt) az izolált `OffcutEndpoints`-only app-builder mellett is.

**Dokumentáció (item 6/7):** a route-tulajdonlás és a kompatibilitási döntés a kódban
(`OffcutEndpoints.cs` XML/inline kommentek `GetOffcutList` felett és `InventoryEndpoints.cs`
a törölt mapping helyén) és ebben a task-fájlban van rögzítve — ez a mutációs határon belüli
egyetlen dokumentum, amit ez a task módosíthat.
⚠️ **Follow-up a root/conductor felé:** a `docs/knowledge/architecture/WORLDS_API_CONTRACTS_2026-07-18.md`
(439., 448–464., 812., 852. sorok) még a régi, 500-as/ütköző állapotot dokumentálja
("ÉLŐ BUG", "🔴 500 AmbiguousMatch") — ez a fájl a mutációs határon KÍVÜL esik, én nem
módosíthattam; szükséges egy külön (kis) doksi-frissítés, ami rögzíti: a route fixálva,
kanonikus route = paginált `GetOffcutListResponse`, `materialType` = deprecated
kompatibilitási ág, migrációs terv = a `spaceos-modules-cutting` `InventoryProviderHttpAdapter`
átállítása `materialCode`+lapozásra egy külön (cutting-modult érintő) task keretében.

## Átadási bizonyíték

**Build ("before" és "after" is zöld, 0 warning):**
```
dotnet build src/spaceos-modules-inventory/SpaceOS.Modules.Inventory.sln
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

**Teszt — "before" (a változtatások előtt, alapállapot-mérés):**
```
dotnet test src/spaceos-modules-inventory/tests/SpaceOS.Modules.Inventory.Tests/SpaceOS.Modules.Inventory.Tests.csproj --filter "FullyQualifiedName~Offcut"
Passed! - Failed: 0, Passed: 64, Skipped: 0, Total: 64

dotnet test src/spaceos-modules-inventory/tests/SpaceOS.Modules.Inventory.Tests/SpaceOS.Modules.Inventory.Tests.csproj
Passed! - Failed: 0, Passed: 180, Skipped: 0, Total: 180
```

**Teszt — "after" (a fix + az új regressziós tesztek után):**
```
dotnet test src/spaceos-modules-inventory/tests/SpaceOS.Modules.Inventory.Tests/SpaceOS.Modules.Inventory.Tests.csproj --filter "FullyQualifiedName~Offcut"
Passed! - Failed: 0, Passed: 82, Skipped: 0, Total: 82

dotnet test src/spaceos-modules-inventory/tests/SpaceOS.Modules.Inventory.Tests/SpaceOS.Modules.Inventory.Tests.csproj
Passed! - Failed: 0, Passed: 198, Skipped: 0, Total: 198
```
(198 = 180 előtti − 1 elavult teszt törölve (`InventoryEndpointsTests.GetOffcuts_Returns200`,
a route-elköltözés miatt) + 5 új teszt az `OffcutEndpointsTests.cs`-ben + 14 új teszt az új
`OffcutRouteRegistrationTests.cs`-ben.)

**Elfogadási kritériumok — ellenőrizve:**
- [x] `/api/inventory/offcuts` route-egyediség automatikusan tesztelt —
      `OffcutRouteRegistrationTests.RouteTable_HasExactlyOneGetEndpoint_ForApiInventoryOffcuts`
      (a valódi `Program`-ból épített `EndpointDataSource`-on).
- [x] Paginált lista 200; hibás filter/page 400; ismeretlen ID 404 — lásd
      `OffcutRouteRegistrationTests` és `OffcutEndpointsTests` új esetei.
- [x] Belső inventory provider regresszió nélkül működik — `GetOffcutsQuery`/
      `GetOffcutsQueryHandler` érintetlen, `InventoryProviderAdapter` (in-process) MediatR-hívása
      változatlan; a HTTP-wire kompatibilitás (cutting-modul) is megőrizve a
      `materialType`-ág révén.
- [x] Teljes inventory suite és build zöld, új warning nincs — lásd fent (198/198, 0 warning).
- [x] Task-doksi rögzíti a végleges route-ot és kompatibilitási döntést — lásd
      Végrehajtási napló.

**Módosított/létrehozott fájlok** (`src/spaceos-modules-inventory/` alatt):
- `src/SpaceOS.Modules.Inventory.Api/Endpoints/InventoryEndpoints.cs` (módosítva)
- `src/SpaceOS.Modules.Inventory.Api/Endpoints/OffcutEndpoints.cs` (módosítva)
- `tests/SpaceOS.Modules.Inventory.Tests/Api/InventoryEndpointsTests.cs` (módosítva)
- `tests/SpaceOS.Modules.Inventory.Tests/Api/InventoryWebFactory.cs` (módosítva — `sealed` eltávolítva)
- `tests/SpaceOS.Modules.Inventory.Tests/Api/OffcutEndpointsTests.cs` (módosítva)
- `tests/SpaceOS.Modules.Inventory.Tests/Api/OffcutRouteRegistrationTests.cs` (új)

