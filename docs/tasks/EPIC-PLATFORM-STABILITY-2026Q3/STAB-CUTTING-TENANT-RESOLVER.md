# STAB-CUTTING-TENANT-RESOLVER — publikus subdomain tenantfeloldás javítása

- **Szerep:** backend/security
- **Prioritás:** P0
- **Státusz:** in_progress — implementáció kész, független review szükséges
- **Függőség:** nincs; a Cutting submodule-t jelenleg a Codex authfix-sávja foglalja
- **Mutációs határ:**
  `src/spaceos-modules-cutting/src/SpaceOS.Modules.Cutting.Infrastructure/Services/TenantResolver.cs`,
  a hozzá tartozó `TenantResolverTests.cs`, ez a task és a Cutting runbook
- **Tiltott scope:** Kernel tenant-migráció, quote domain/FSM, portal, deploy,
  más agent által módosított Cutting authfix fájlok

## Cél

A publikus quote-kérés subdomain-alapú tenantfeloldása működjön EF Core 8 alatt
SQLite tesztben és PostgreSQL-ben is. Ismeretlen tenant továbbra is fail-closed
`TenantNotFoundException` legyen, a query maradjon paraméterezett.

## Gyökérok-hipotézis

Az `Database.SqlQueryRaw<Guid>()` scalar query eredményét a komponálható EF Core
query `Value` oszlopnéven várja. A jelenlegi SQL `"Id"` néven adja vissza, ezért
a ráépített `FirstOrDefaultAsync()` `t.Value` oszlopra hivatkozik, amely nem
létezik. Ez nem pusztán fixture-hiba: ugyanaz a kompozíció fut productionben is.

## Megvalósítás

1. Rögzítsd az izolált baseline-t és a pontos SQL-hibát.
2. A scalar projection kapjon explicit `Value` aliast; a subdomain paraméter
   maradjon adatbázis-paraméter, ne string-interpoláció.
3. Ne változtasd meg a publikus endpoint szerződését vagy a Kernel egyedi
   `IX_Tenants_Subdomain` garanciáját.
4. Futtasd a resolver suite-ot, majd a teljes Cutting suite-ot.
5. Aktualizáld a Cutting tesztadósság-leltárt a valós új számokkal.

## Tesztterv

```powershell
dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --no-build --filter "FullyQualifiedName~Infrastructure.Services.TenantResolverTests"

dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --no-build

dotnet build SpaceOS.Modules.Cutting.sln --no-restore
```

## Elfogadási kritériumok

- [x] A resolver suite 10/10 zöld.
- [x] Érvényes subdomain a megfelelő tenant ID-t adja.
- [x] Ismeretlen subdomain a dokumentált kivételt és warningot adja.
- [x] A lekérdezés paraméterezett és EF Core 8-cal komponálható.
- [x] A teljes suite-ban a TenantResolver hét hibája megszűnik.
- [x] Nincs új build warning vagy taskon kívüli fájlmódosítás.

## Stop / eszkaláció

Ha a PostgreSQL provider más scalar aliast vagy eltérő Kernel táblaszerződést
igényel, ne vezess be provider-specifikus stringágakat bizonyíték nélkül; külön
integration tesztet és Kernel-contract döntést kell kérni.

## Végrehajtási napló

- **Platform HEAD:** `7ffc353`
- **Cutting HEAD:** `bf9bd4ee9161d451adb5bc861ae1555e39c5d4c1`
  (detached; az authfix külön fájlokon review-ra vár)
- **Idegen aktív sávok:** EHS, portal, Inventory, Procurement és
  MODULE-PACKAGES; egyikhez sem nyúl ez a task.
- **Izolált baseline:** 10 tesztből 3 zöld, 7 bukik
  `SQLite Error 1: 'no such column: t.Value'` hibával.
- **Kernel-szerződés:** a `Tenants.Subdomain` mezőn egyedi
  `IX_Tenants_Subdomain` index van; a resolver `LIMIT 1` viselkedése nem kerül
  áttervezésre ebben a taskban.
- **Párhuzamos integráció:** a futás közben a Cutting authfix külön review/commit
  után `a889109` HEAD-re került. A resolver egyetlen fájlos diffje már ezen a
  `main` commiton ül; az authfix forrásaihoz ez a task nem nyúlt.
- **Implementáció:** az EF scalar projection `SELECT "Id" AS "Value"` aliast
  kapott. A `{0}` adatbázis-paraméter, `LIMIT 1`, kivétel- és logkontraktus
  változatlan.

## Átadási bizonyíték

- Célzott futás: **10/10 zöld**; baseline: 3/10, tehát mind a hét reprodukált
  resolver-hiba megszűnt.
- Teljes Cutting suite: **1028/1047 zöld, 19 hiba**; előtte 1021/1047 és 26
  hiba. A fennmaradó 19 teszt más, dokumentált csoportokban van.
- Solution build: **sikeres, 0 hiba, 1 meglévő NU1902 warning** (`MailKit`
  4.9.0).
- `git diff --check`: tiszta; csak a repository CRLF-tájékoztatása jelent meg.
- A build előtt már dirty nesting `bin/obj` submodule-hoz és a párhuzamos EHS,
  portal, Inventory, Procurement munkákhoz nem nyúltam.
- Változott production fájl:
  `src/SpaceOS.Modules.Cutting.Infrastructure/Services/TenantResolver.cs`.
- **Review-kérés:** Claude/backend reviewer ellenőrizze az EF Core 8 scalar
  alias szerződést és a PostgreSQL-kompatibilitást; ezután külön Cutting commit
  és platform submodule-pin frissítés szükséges. Deploy nem történt.
