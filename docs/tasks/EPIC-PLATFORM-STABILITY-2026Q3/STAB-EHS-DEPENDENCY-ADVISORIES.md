# STAB-EHS-DEPENDENCY-ADVISORIES — kritikus és magas NuGet sérülékenységek

- **Epic:** EPIC-PLATFORM-STABILITY-2026Q3
- **Szerep:** backend/security + platform
- **Prioritás:** P0 security
- **Státusz:** in_progress — S0 kész; S1/S2 root fájlzár-ACK megadva
  2026-07-22 23:05-kor, de a leállításig implementáció nem indult
- **Függőség:** a futó CAPA-review-tól fájlszinten független
- **Mutációs határ:** EHS Application/Infrastructure/Api + shared Hosting package,
  mapping query handlerek és célzott tesztek
- **Tiltott scope:** más modul dependency-frissítése, API-kontraktus-váltás,
  adatbázis-migráció, portal, deploy

## Biztonsági eredmény

A 2026-07-22-i `dotnet list package --vulnerable --include-transitive` három
külön hibát bizonyított:

| Gráf | Csomag | Verzió | Súlyosság | Útvonal |
|---|---|---:|---:|---|
| EHS Api/Infrastructure/tests | `System.Text.Encodings.Web` | 4.5.0 | **Critical** | `Microsoft.AspNetCore.Http.Abstractions 2.2.0` |
| EHS Api/Infrastructure/tests | `AutoMapper` | 14.0.0 | **High** | Application direct ref `13.0.2` → fallback |
| Hosting/Application önálló | `Microsoft.Extensions.Caching.Memory` | 8.0.0 | **High** | Hosting EF Relational 8.0.7 |

Az API tényleges gráfja a cache-ből már 8.0.1-et old fel az EHS Infrastructure
EF Core 8.0.10 miatt, de a megosztott Hosting csomag önállóan továbbra is
sérülékeny minimumot visz. Ez platform-package probléma: egy másik fogyasztó
ismét 8.0.0-ra oldhat.

Hivatalos advisoryk:

- `System.Text.Encodings.Web` RCE, CVSS 9.8; 4.5.0 érintett, 4.5.1 javított:
  https://github.com/advisories/GHSA-ghhp-997w-qr28
- AutoMapper uncontrolled recursion DoS; 15.1.1 és 16.1.1 javított:
  https://github.com/advisories/GHSA-rvv3-g6hj-g44x
- `Microsoft.Extensions.Caching.Memory` hash-flooding DoS; .NET 8 javított
  csomagverzió 8.0.1:
  https://github.com/advisories/GHSA-qj66-m88j-hmgj

## Gyökérokok

### 1. Kritikus legacy ASP.NET Core package

Az `Ehs.Infrastructure.csproj` közvetlenül hivatkozik a 2018-as
`Microsoft.AspNetCore.Http.Abstractions 2.2.0` csomagra, komment szerint
`IHttpContextAccessor` miatt. A teljes Infrastructure forráskeresésben azonban
nincs `IHttpContextAccessor` vagy `HttpContext` használat; a tenant/RLS már a
shared Hosting adapterből jön. A referencia örökölt és fölösleges.

### 2. Nem létező AutoMapper-kérés

Az Application `AutoMapper 13.0.2`-t kér, miközben a NuGet feedben a 13-as ág
utolsó kiadása 13.0.1. A resolver ezért `NU1603` mellett 14.0.0-ra lép, amely az
advisory szerint sérülékeny. Az EHS 18 query handlerben használ `IMapper`-t és
egy profile-ban 18 egyszerű domain→DTO mappinget tart fenn.

### 3. Shared Hosting minimum drift

A Hosting `Microsoft.EntityFrameworkCore.Relational 8.0.7` minimuma
`Microsoft.Extensions.Caching.Memory 8.0.0`-t hoz. Az EHS többi EF csomagja
8.0.10, a jelenlegi .NET 8 patch elérhető verziója 8.0.29. A shared package
minimumát biztonságos, egyeztetett 8.0.x patchre kell emelni.

## Kötelező végrehajtási sorrend

### S0 — kritikus útvonal eltávolítása (külön review-olható commit-szelet)

1. Töröld az `Ehs.Infrastructure.csproj` közvetlen
   `Microsoft.AspNetCore.Http.Abstractions 2.2.0` referenciáját és a stale
   kommentet.
2. Ne helyettesítsd újabb külön package-dzsel: net8 esetén az ASP.NET shared
   framework/Hosting biztosítja a szükséges absztrakciót, és a projektben nincs
   közvetlen használat.
3. Restore után a `dotnet nuget why ... System.Text.Encodings.Web` útvonalnak
   meg kell szűnnie; direct pin csak akkor engedett, ha ezt fordítási bizonyíték
   indokolja.

### S1 — Hosting cache minimum biztonságossá tétele

1. A Hosting EF Relational 8.0.7-et emeld legalább 8.0.10-re, vagy az összes
   érintett net8 EF/Npgsql kompatibilitási mátrixának ellenőrzése után egységes,
   frissebb 8.0.x patchre.
2. Ne ugorj .NET/EF 9 vagy 10 főverzióra ebben a taskban.
3. Ha a Hosting önálló gráfja továbbra is cache 8.0.0-t old fel, explicit
   `Microsoft.Extensions.Caching.Memory >= 8.0.1` biztonsági minimum-pin kell,
   indokló kommenttel. A preferált megoldás az EF patch összehangolása.
4. Hosting + mind a hét fogyasztó buildje legalább restore/compile szinten zöld;
   EHS és hosting teszt kötelező, a többi modulnál a meglévő gyors kapu elég.

### S2 — AutoMapper eltávolítása, nem major-upgrade

A választott megoldás az EHS-ből való eltávolítás. Ennek oka, hogy a major
upgrade egyszerre hozna API/licenc/működési döntést, miközben az EHS mappingek
egyszerű, auditálható DTO-projekciók. Kompatibilitási alias vagy sérülékeny
verzió pinelése tilos.

1. Hozz létre egy explicit, statikus `EhsDtoMapper`-t az Application/Mappings
   alatt, típusos `ToDto` / `ToListItemDto` metódusokkal.
2. Fedd le a jelenlegi profile összes párját: incident + investigation/actions/
   witnesses; risk + controls; training; location; hazardous material;
   PPE item/issuance; safety walk + findings/count; unified CAPA.
3. A 18 query handlerből vedd ki az `IMapper` konstruktorfüggőséget, és használd
   az explicit mappinget. Lista esetén ne rejtett reflection/projection fusson.
4. Töröld az `EhsMappingProfile`-t, az `AddAutoMapper` DI-regisztrációt és az
   Application AutoMapper package-referenciáját.
5. A kiszámított mezők (`SdsValidity`, `IsExpired`, `FindingCount`), a nested
   kollekciók és a nullable időbélyegek változatlan DTO-eredményét golden/shape
   teszt rögzítse.

## Biztonsági és regressziós kapuk

Minden restore friss lock/assets állapotból történjen; `--no-restore` csak az
első sikeres restore után használható.

```powershell
dotnet restore src/ehs/src/Api/SpaceOS.Modules.Ehs.Api.csproj
dotnet build src/ehs/src/Api/SpaceOS.Modules.Ehs.Api.csproj --no-restore
dotnet test src/ehs/tests/SpaceOS.Modules.Ehs.Domain.Tests.csproj --no-restore
dotnet test src/ehs/tests/Infrastructure.Tests/SpaceOS.Modules.Ehs.Infrastructure.Tests.csproj --no-restore

dotnet restore src/spaceos-modules-hosting/src/SpaceOS.Modules.Hosting/SpaceOS.Modules.Hosting.csproj
dotnet build src/spaceos-modules-hosting/src/SpaceOS.Modules.Hosting/SpaceOS.Modules.Hosting.csproj --no-restore
dotnet test src/spaceos-modules-hosting/tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj --no-restore

dotnet list src/ehs/src/Api/SpaceOS.Modules.Ehs.Api.csproj package --vulnerable --include-transitive --no-restore
dotnet list src/ehs/src/Application/SpaceOS.Modules.Ehs.Application.csproj package --vulnerable --include-transitive --no-restore
dotnet list src/spaceos-modules-hosting/src/SpaceOS.Modules.Hosting/SpaceOS.Modules.Hosting.csproj package --vulnerable --include-transitive --no-restore
```

Elvárt eredmény: mindhárom vulnerability-lista üres; nincs `NU1603`, `NU1903`
vagy downgrade warning; API outputban nincs `AutoMapper.dll` és nincs 2.2-es
ASP.NET Core package asset.

## Végrehajtási napló

### 2026-07-22 — S0 kritikus útvonal lezárva

- Törölve az Infrastructure közvetlen, nem használt
  `Microsoft.AspNetCore.Http.Abstractions 2.2.0` referenciája.
- Friss restore után az EHS API teljes lánca 0 hibával épült.
- `dotnet nuget why ... System.Text.Encodings.Web`: **nincs dependency**.
- Az EHS API `--vulnerable --include-transitive` listájából a kritikus
  `System.Text.Encodings.Web 4.5.0` finding eltűnt; csak a külön S2-ben kezelt
  magas AutoMapper finding maradt.
- Diff-check tiszta. API-kontraktus, runtime kód és adatbázis nem változott.

**Root review — S0 (2026-07-22): APPROVED.** Önállóan újraépítettem az EHS
API-t (`dotnet build --no-restore`) — 0 hiba, csak a bejelentett, pre-existing
AutoMapper NU1603/NU1903 warning maradt. A `.csproj` diffje megerősíti, hogy
kizárólag a fel nem használt `Microsoft.AspNetCore.Http.Abstractions 2.2.0`
sor tűnt el, viselkedésváltozás nélkül. S1/S2 továbbra is külön fájlzárra vár.

## Elfogadási kritériumok

- [x] A kritikus `System.Text.Encodings.Web 4.5.0` útvonal megszűnt.
- [ ] A Hosting önálló gráfja legalább cache 8.0.1-et old fel.
- [ ] AutoMapper package, DI és reflection mapping nincs az EHS-ben.
- [ ] Mind a 18 query handler explicit, típusos mappinget használ.
- [ ] Nested és számított DTO-mezők viselkedési azonossága tesztelt.
- [ ] EHS API/domain/infra és Hosting build/teszt zöld.
- [ ] Három célgráf `--vulnerable` kimenete üres.
- [ ] Független security review APPROVED.

## Stop / eszkaláció

- Ha az ASP.NET 2.2 package törlése compile-hibát ad, ne pineld automatikusan a
  kritikus transitive csomagot: előbb azonosítsd a valós fogyasztót.
- Shared Hosting package-verzió módosítása előtt federation/fájlzár kötelező,
  mert hét modul fogyasztja.
- AutoMapper major-upgrade csak külön licenc- és kompatibilitási döntéssel;
  e task alapértelmezett útja az eltávolítás.
- Deploy külön Root jóváhagyás és tiszta vulnerability-scan után.

## Rollback

Az S0, S1 és S2 külön review-olható, de egy release-kapu részei. Egy szelet
rollbackje után a vulnerability-scan újrafut; sérülékeny gráffal release tilos.
